import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Versioned product-managed MCP catalog written into the app's DSH_HOME. */
export const EMBEDDED_MCP_CONFIG_VERSION = 1
export const MCP_MANAGED_PATCH_BEGIN = '# BEGIN FREECODE MANAGED MCP'
export const MCP_MANAGED_PATCH_END = '# END FREECODE MANAGED MCP'

const PROCESS_CWD = '$process.cwd'

const BASE_SERVER_DEFINITIONS = [
  {
    id: 'serena',
    serverName: 'serena',
    transport: 'stdio',
    command: 'uvx',
    // Do not pass --project-from-cwd here. The Electron harness cwd is DSH_HOME,
    // not the user's workspace; Serena would walk up to a drive root and scan
    // the entire disk before it can register its MCP tools. The MCP bridge
    // activates the selected session workspace before each Serena call.
    args: ['--from', 'git+https://github.com/oraios/serena', 'serena', 'start-mcp-server', '--context', 'claude-code'],
    cwd: PROCESS_CWD,
    projectActivation: { toolName: 'activate_project', pathArgument: 'project' },
  },
  {
    id: 'free-search',
    serverName: 'free-search',
    transport: 'stdio',
    command: 'uvx',
    args: ['free-search-mcp'],
    cwd: PROCESS_CWD,
  },
] as const

export const SERVER_DEFINITIONS = BASE_SERVER_DEFINITIONS

export interface EmbeddedMcpOptions {
  /** Absolute uvx path selected by the Windows bootstrap, when available. */
  uvxCommand?: string
  /** Packaged Serena launcher that prevents SolidLSP's Windows shell hop. */
  serenaLauncherPath?: string
}

interface ManagedMcpServer {
  id: string
  serverName: string
  transport: 'stdio'
  command: string
  args: readonly string[]
  cwd: string
  projectActivation?: { toolName: string, pathArgument: string }
}

interface EmbeddedMcpConfig {
  version: number
  servers: Array<ManagedMcpServer & { enabled: boolean }>
}

export interface EmbeddedMcpState {
  configPath: string
  patchPath: string
  enabled: string[]
  servers: Array<ManagedMcpServer & { enabled: boolean }>
}

function definitions(options: EmbeddedMcpOptions = {}): typeof BASE_SERVER_DEFINITIONS {
  return BASE_SERVER_DEFINITIONS.map((server) => {
    if (server.id === 'serena' && options.serenaLauncherPath !== undefined) {
      return {
        ...server,
        command: options.uvxCommand ?? server.command,
        args: [
          '--from',
          'git+https://github.com/oraios/serena',
          'python',
          options.serenaLauncherPath,
          'start-mcp-server',
          '--context',
          'claude-code',
        ],
      }
    }
    return server.command === 'uvx' && options.uvxCommand !== undefined
      ? { ...server, command: options.uvxCommand }
      : server
  }) as unknown as typeof BASE_SERVER_DEFINITIONS
}

function defaultConfig(options: EmbeddedMcpOptions = {}): EmbeddedMcpConfig {
  return {
    version: EMBEDDED_MCP_CONFIG_VERSION,
    servers: definitions(options).map((server) => ({ ...server, enabled: true })),
  }
}

function persistedUvxCommand(raw: { servers?: unknown }): string | undefined {
  if (!Array.isArray(raw.servers)) return undefined
  const candidate = raw.servers.find((server) => (
    typeof server === 'object' && server !== null
    && (server as { id?: unknown }).id === 'serena'
    && typeof (server as { command?: unknown }).command === 'string'
  )) as { command?: string } | undefined
  const command = candidate?.command
  if (command === 'uvx') return undefined
  if (typeof command !== 'string' || !command.toLowerCase().endsWith('uvx.exe')) return undefined
  return existsSync(command) ? command : undefined
}

function readConfig(path: string, options: EmbeddedMcpOptions = {}): EmbeddedMcpConfig {
  if (!existsSync(path)) return defaultConfig(options)
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as {
      version?: unknown
      servers?: unknown
    }
    const resolvedOptions = options.uvxCommand === undefined
      ? { uvxCommand: persistedUvxCommand(raw) }
      : options
    const flags = new Map(
      Array.isArray(raw.servers)
        ? raw.servers
          .filter((server): server is { id: string, enabled: boolean } => (
            typeof server === 'object' && server !== null
            && typeof (server as { id?: unknown }).id === 'string'
            && typeof (server as { enabled?: unknown }).enabled === 'boolean'
          ))
          .map((server) => [server.id, server.enabled] as const)
        : [],
    )
    return {
      version: EMBEDDED_MCP_CONFIG_VERSION,
      servers: definitions(resolvedOptions).map((server) => ({
        ...server,
        enabled: flags.get(server.id) ?? true,
      })),
    }
  } catch {
    // Preserve a malformed file before recovering to the safe, enabled catalog.
    const backup = `${path}.invalid-${Date.now()}`
    try { renameSync(path, backup) } catch { /* startup must remain available */ }
    return defaultConfig(options)
  }
}

function yamlValue(value: string): string {
  return value === PROCESS_CWD ? '!!js process.cwd()' : JSON.stringify(value)
}

function renderManagedPatch(config: EmbeddedMcpConfig): string {
  const lines = [
    MCP_MANAGED_PATCH_BEGIN,
    '# Generated by FreeCode. Edit mcp/servers.json to toggle entries.',
    '# The MCP client bridge is bundled; external server executables are optional prerequisites.',
  ]
  for (const server of config.servers) {
    lines.push(
      `- id: ${JSON.stringify(`freecode-mcp-${server.id}`)}`,
      '  name: "@deepseek-ai/dsh-mcp-client"',
      // Electron's web runtime mounts these rows from the Standard agent
      // preset. Keep the host rows disabled there so the same serverName is
      // never registered twice; non-Electron dsh profiles still use this
      // managed host overlay.
      `  disabled: ${server.enabled ? "!!js process.env.FREECODE_WEB_MODE === '1'" : 'true'}`,
      '  config:',
      `    transport: ${JSON.stringify(server.transport)}`,
      `    serverName: ${JSON.stringify(server.serverName)}`,
      `    command: ${JSON.stringify(server.command)}`,
      `    args: [${server.args.map(yamlValue).join(', ')}]`,
      `    cwd: ${yamlValue(server.cwd)}`,
      ...(server.projectActivation === undefined ? [] : [
        '    projectActivation:',
        `      toolName: ${JSON.stringify(server.projectActivation.toolName)}`,
        `      pathArgument: ${JSON.stringify(server.projectActivation.pathArgument)}`,
      ]),
      '    failOnStartupError: false',
      '    reconnect:',
      '      enabled: true',
      '      initialDelayMs: 500',
      '      maxDelayMs: 30000',
      '      maxAttempts: 10',
    )
  }
  lines.push(MCP_MANAGED_PATCH_END)
  return `${lines.join('\n')}\n`
}

/** Environment consumed by the product overlay in the Standard agent preset. */
export function embeddedMcpEnvironment(state: EmbeddedMcpState): Record<string, string> {
  const env: Record<string, string> = { FREECODE_WEB_MODE: '1' }
  for (const server of state.servers) {
    const key = `FREECODE_MCP_${server.id.replaceAll('-', '_').toUpperCase()}_ENABLED`
    env[key] = String(server.enabled)
  }
  return env
}

function mergeManagedPatch(existing: string, generated: string): string {
  const block = new RegExp(`${MCP_MANAGED_PATCH_BEGIN}[\\s\\S]*?${MCP_MANAGED_PATCH_END}\\r?\\n?`, 'm')
  const normalized = generated.endsWith('\n') ? generated : `${generated}\n`
  if (block.test(existing)) return existing.replace(block, normalized)
  const prefix = existing.trimEnd()
  return prefix.length === 0 ? normalized : `${prefix}\n\n${normalized}`
}

function writeAtomic(path: string, contents: string): void {
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`
  writeFileSync(temporary, contents, { encoding: 'utf8', mode: 0o600 })
  renameSync(temporary, path)
}

/**
 * Materialize the bundled MCP catalog on first boot and refresh only the
 * FreeCode-managed overlay on later boots. User patch rows remain untouched.
 */
export function ensureEmbeddedMcpConfig(homeDir: string, options: EmbeddedMcpOptions = {}): EmbeddedMcpState {
  const configDir = join(homeDir, 'mcp')
  const configPath = join(configDir, 'servers.json')
  const patchPath = join(homeDir, 'cordis.patch.yml')
  mkdirSync(configDir, { recursive: true })
  const config = readConfig(configPath, options)
  writeAtomic(configPath, `${JSON.stringify(config, null, 2)}\n`)
  const existingPatch = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
  writeAtomic(patchPath, mergeManagedPatch(existingPatch, renderManagedPatch(config)))
  return {
    configPath,
    patchPath,
    enabled: config.servers.filter((server) => server.enabled).map((server) => server.id),
    servers: config.servers.map((server) => ({ ...server, args: [...server.args] })),
  }
}

/** Toggle one product-managed server and refresh only the managed patch block. */
export function setEmbeddedMcpEnabled(homeDir: string, id: string, enabled: boolean, options: EmbeddedMcpOptions = {}): EmbeddedMcpState {
  const state = ensureEmbeddedMcpConfig(homeDir, options)
  const configPath = state.configPath
  const config = readConfig(configPath, options)
  const server = config.servers.find((candidate) => candidate.id === id)
  if (server === undefined) throw new Error(`unknown embedded MCP server: ${id}`)
  server.enabled = enabled
  writeAtomic(configPath, `${JSON.stringify(config, null, 2)}\n`)
  const existingPatch = existsSync(state.patchPath) ? readFileSync(state.patchPath, 'utf8') : ''
  writeAtomic(state.patchPath, mergeManagedPatch(existingPatch, renderManagedPatch(config)))
  return {
    configPath,
    patchPath: state.patchPath,
    enabled: config.servers.filter((candidate) => candidate.enabled).map((candidate) => candidate.id),
    servers: config.servers.map((candidate) => ({ ...candidate, args: [...candidate.args] })),
  }
}
