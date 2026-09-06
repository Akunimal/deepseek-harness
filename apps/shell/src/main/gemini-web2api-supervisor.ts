import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { resolveGeminiWeb2ApiDir } from './resource-paths.js';
import {
  DEFAULT_GEMINI_WEB2API_PORT,
  GEMINI_WEB_FALLBACK_MODELS,
  GEMINI_WEB_PROVIDER,
} from './local-provider-config.js';

export { DEFAULT_GEMINI_WEB2API_PORT, GEMINI_WEB_FALLBACK_MODELS, GEMINI_WEB_PROVIDER } from './local-provider-config.js';

export type GeminiWeb2ApiStatus = 'stopped' | 'starting' | 'ready' | 'unavailable';

export interface GeminiWeb2ApiSupervisorConfig {
  resourcesDir: string;
  userDataDir: string;
  port?: number;
  pythonPath?: string;
  startupTimeoutMs?: number;
  healthTimeoutMs?: number;
  log?: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
}

export interface GeminiWeb2ApiStartResult {
  available: boolean;
  managed: boolean;
  baseUrl: string;
  reason?: string;
}

interface PythonCommand {
  executable: string;
  args: string[];
}

const DEFAULT_STARTUP_TIMEOUT_MS = 15_000;
const DEFAULT_HEALTH_TIMEOUT_MS = 500;
const POLL_INTERVAL_MS = 200;

/**
 * Owns the optional Python process without making it a hard dependency of
 * FreeCode. The app can still use its normal provider when Python is absent;
 * the Gemini route simply remains unavailable until the user installs Python
 * or runs gemini-web2api separately on the configured port.
 */
export class GeminiWeb2ApiSupervisor {
  private readonly cfg: Required<Pick<GeminiWeb2ApiSupervisorConfig, 'resourcesDir' | 'userDataDir'>>
    & GeminiWeb2ApiSupervisorConfig;
  private proc: ChildProcess | null = null;
  private status: GeminiWeb2ApiStatus = 'stopped';
  private managed = false;
  private stopping = false;
  private reason: string | undefined;
  private lifecycleLock: Promise<void> = Promise.resolve();

  constructor(config: GeminiWeb2ApiSupervisorConfig) {
    this.cfg = { ...config };
  }

  get statusValue(): GeminiWeb2ApiStatus {
    return this.status;
  }

  get isManaged(): boolean {
    return this.managed;
  }

  get baseUrl(): string {
    return `http://127.0.0.1:${this.port()}`;
  }

  get lastReason(): string | undefined {
    return this.reason;
  }

  async start(): Promise<GeminiWeb2ApiStartResult> {
    if (this.status === 'ready') return this.result();
    let result!: GeminiWeb2ApiStartResult;
    await this.withLock(async () => {
      if (this.status === 'ready') { result = this.result(); return; }
      this.stopping = false;
      this.reason = undefined;

      // Reuse a service the user already launched.
      if (await this.isHealthy()) {
        this.status = 'ready';
        this.managed = false;
        result = this.result();
        return;
      }

      const sourceDir = resolveGeminiWeb2ApiDir(this.cfg.resourcesDir);
      if (!existsSync(resolve(sourceDir, 'gemini_web2api', '__main__.py'))) {
        result = this.unavailable('gemini-web2api source is not present in the packaged resources');
        return;
      }

      const python = resolvePythonCommand(this.cfg.pythonPath);
      if (!python) {
        result = this.unavailable('Python 3 was not found; install Python or run gemini-web2api separately');
        return;
      }

      const dataDir = join(this.cfg.userDataDir, 'gemini-web2api');
      let configPath: string;
      try {
        configPath = ensureConfig(dataDir, this.port());
      } catch (error) {
        result = this.unavailable('gemini-web2api config.json is invalid; fix or remove it', error);
        return;
      }
      this.status = 'starting';
      this.managed = true;

      // Whitelist only safe env vars — don't leak Electron/Node internals to Python child.
      const SAFE_PYTHON_ENV = [
        'PATH', 'HOME', 'USER', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'TEMP', 'TMP', 'TMPDIR',
        'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PROGRAMFILES', 'LOCALAPPDATA', 'APPDATA',
      ] as const;
      const safeEnv: NodeJS.ProcessEnv = {};
      for (const key of SAFE_PYTHON_ENV) {
        const val = process.env[key];
        if (val !== undefined) safeEnv[key] = val;
      }
      const env: NodeJS.ProcessEnv = {
        ...safeEnv,
        PYTHONUNBUFFERED: '1',
      };
      const args = [
        ...python.args,
        '-m',
        'gemini_web2api',
        '--config',
        configPath,
      ];
      let proc: ChildProcess;
      try {
        proc = spawn(python.executable, args, {
          cwd: sourceDir,
          env,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (error) {
        result = this.unavailable('could not start Python for gemini-web2api', error);
        return;
      }
      this.proc = proc;
      this.attachOutput(proc);
      proc.once('error', (error) => {
        this.cfg.log?.('warn', 'gemini-web2api process error', { error: String(error) });
      });
      proc.once('exit', (code, signal) => {
        if (this.stopping) return;
        this.cfg.log?.('warn', 'gemini-web2api exited', { code, signal });
        this.proc = null;
        this.managed = false;
        this.status = 'unavailable';
        this.reason = `gemini-web2api exited before or during use (code=${String(code)}, signal=${String(signal)})`;
      });

      const ready = await this.waitForHealth(this.cfg.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS);
      if (!ready) {
        const reason = 'gemini-web2api did not become ready before the startup timeout';
        this.cfg.log?.('warn', reason);
        await this.stopInternal();
        result = this.unavailable(reason);
        return;
      }
      this.status = 'ready';
      result = this.result();
    });
    return result;
  }

  async stop(): Promise<void> {
    await this.withLock(async () => { await this.stopInternal(); });
  }

  private async stopInternal(): Promise<void> {
    this.stopping = true;
    const proc = this.proc;
    this.proc = null;
    this.managed = false;
    this.status = 'stopped';
    if (proc && proc.exitCode === null) {
      killTree(proc.pid ?? -1);
      await sleep(250);
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.lifecycleLock;
    let release: () => void;
    this.lifecycleLock = new Promise<void>((r) => { release = r; });
    await prev;
    try {
      return await fn();
    } finally {
      release!();
    }
  }

  private result(): GeminiWeb2ApiStartResult {
    return {
      available: this.status === 'ready',
      managed: this.managed,
      baseUrl: this.baseUrl,
      ...(this.reason ? { reason: this.reason } : {}),
    };
  }

  private unavailable(reason: string, error?: unknown): GeminiWeb2ApiStartResult {
    this.status = 'unavailable';
    this.managed = false;
    this.reason = reason;
    this.cfg.log?.('warn', reason, error ? { error: String(error) } : undefined);
    return this.result();
  }

  private async waitForHealth(timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + Math.max(0, timeoutMs);
    while (Date.now() < deadline) {
      if (await this.isHealthy()) return true;
      if (this.proc && this.proc.exitCode !== null) return false;
      await sleep(POLL_INTERVAL_MS);
    }
    return this.isHealthy();
  }

  private async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        signal: AbortSignal.timeout(this.cfg.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS),
      });
      if (!response.ok) return false;
      const body = (await response.json()) as { status?: unknown };
      return body.status === 'ok';
    } catch {
      return false;
    }
  }

  private attachOutput(proc: ChildProcess): void {
    proc.stdout?.on('data', (chunk: Buffer) => {
      this.cfg.log?.('info', `gemini-web2api: ${chunk.toString().trimEnd()}`);
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      this.cfg.log?.('debug', `gemini-web2api stderr: ${chunk.toString().trimEnd()}`);
    });
  }

  private port(): number {
    const configured = this.cfg.port ?? DEFAULT_GEMINI_WEB2API_PORT;
    return Number.isInteger(configured) && configured > 0 && configured <= 65_535
      ? configured
      : DEFAULT_GEMINI_WEB2API_PORT;
  }
}

export function resolvePythonCommand(explicit?: string): PythonCommand | null {
  const candidates: PythonCommand[] = explicit
    ? [{ executable: explicit, args: [] }]
    : process.platform === 'win32'
      ? [
        { executable: 'python', args: [] },
        { executable: 'python3', args: [] },
        { executable: 'py', args: ['-3'] },
      ]
      : [
        { executable: 'python3', args: [] },
        { executable: 'python', args: [] },
      ];

  for (const candidate of candidates) {
    try {
      const result = spawnSync(candidate.executable, [...candidate.args, '--version'], {
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (result.status === 0) return candidate;
    } catch {
      // Try the next interpreter candidate.
    }
  }
  return null;
}

export function ensureConfig(dataDir: string, port: number): string {
  mkdirSync(dataDir, { recursive: true });
  const configPath = join(dataDir, 'config.json');
  const defaults: Record<string, unknown> = {
    port,
    host: '127.0.0.1',
    retry_attempts: 3,
    retry_delay_sec: 2,
    request_timeout_sec: 180,
    gemini_bl: 'boq_assistant-bard-web-server_20260716.08_p0',
    auth_user: null,
    xsrf_token: null,
    default_model: 'gemini-3.7-flash',
    api_keys: ['freecode-local'],
    cookie_file: null,
    proxy: null,
    log_requests: true,
    temporary_chats: false,
  };

  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify(defaults, null, 2) + '\n', 'utf8');
  } else {
    try {
      const existing = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
      let patched = false;
      // Ensure api_keys always contains 'freecode-local' for Bearer auth
      if (!Array.isArray(existing.api_keys) || !existing.api_keys.includes('freecode-local')) {
        existing.api_keys = ['freecode-local'];
        patched = true;
      }
      // Ensure default_model is set
      if (!existing.default_model) {
        existing.default_model = defaults.default_model;
        patched = true;
      }
      if (patched) {
        writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
      }
    } catch {
      // Corrupt config — rewrite from scratch.
      writeFileSync(configPath, JSON.stringify(defaults, null, 2) + '\n', 'utf8');
    }
  }
  return configPath;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function killTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/T', '/F', '/PID', String(pid)], { windowsHide: true, stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
      setTimeout(() => {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // Already stopped.
        }
      }, 5_000).unref();
    }
  } catch {
    // Best effort during app shutdown.
  }
}
