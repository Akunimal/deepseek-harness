/**
 * OCR module — wraps the bundled Tesseract CLI for the renderer-facing
 * diagnostic bridge. The upstream model path uses the same executable via
 * FREECODE_TESSERACT_PATH. A PATH-installed binary remains a development
 * fallback, but a release package must carry its own payload.
 */

import { launchHidden } from './freecode-launcher.js'
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024;
const MAX_STDERR_BYTES = 8 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 30_000;
const LANG_RE = /^[a-z]{3}(?:\+[a-z]{3})*$/u;
const MAX_PSM = 13;

export interface OcrResult {
  text: string;
  confidence: number;
  language: string;
  durationMs: number;
}

export interface OcrOptions {
  /** Tesseract language code (default: 'eng'). Use 'spa' for Spanish, etc. */
  lang?: string;
  /** Page segmentation mode (default: 3 = fully automatic). */
  psm?: number;
  /** Timeout in milliseconds (default: 30000). */
  timeoutMs?: number;
}

let cachedBinaryPath: string | null | undefined;

/** Detect and cache the tesseract binary path. Returns null if not found. */
function resolveTesseractBinary(): string | null {
  if (cachedBinaryPath !== undefined) return cachedBinaryPath;

  // Check common install locations
  const candidates = process.platform === 'win32'
    ? [
        process.env['FREECODE_TESSERACT_PATH'] ?? '',
        join(process.resourcesPath ?? '', 'freecode', 'tesseract', 'tesseract.exe'),
        join(process.env['LOCALAPPDATA'] ?? '', 'Programs', 'Tesseract-OCR', 'tesseract.exe'),
        join(process.env['PROGRAMFILES'] ?? '', 'Tesseract-OCR', 'tesseract.exe'),
        join(process.env['PROGRAMFILES(X86)'] ?? '', 'Tesseract-OCR', 'tesseract.exe'),
        'tesseract', // hope it's in PATH
      ]
    : ['/usr/bin/tesseract', '/usr/local/bin/tesseract', 'tesseract'];

  for (const candidate of candidates) {
    if (candidate === 'tesseract' || existsSync(candidate)) {
      cachedBinaryPath = candidate;
      return candidate;
    }
  }
  cachedBinaryPath = null;
  return null;
}

/** Check if Tesseract is available on this system. */
export function isOcrAvailable(): boolean {
  return resolveTesseractBinary() !== null;
}

/**
 * Extract text from an image file or buffer.
 * @param input - File path or image Buffer
 * @param options - OCR configuration
 * @returns Extracted text and metadata
 */
export async function extractText(
  input: string | Buffer,
  options: OcrOptions = {},
): Promise<OcrResult> {
  const binary = resolveTesseractBinary();
  if (!binary) {
    throw new Error(
      'Tesseract OCR is not installed. Install it with:\n' +
      '  Windows: winget install UB-Mannheim.TesseractOCR\n' +
      '  macOS:   brew install tesseract\n' +
      '  Linux:   apt install tesseract-ocr',
    );
  }

  const lang = options.lang ?? 'eng';
  const psm = options.psm ?? 3;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!LANG_RE.test(lang)) throw new Error('Invalid OCR language; use three-letter Tesseract codes separated by +');
  if (!Number.isInteger(psm) || psm < 0 || psm > MAX_PSM) throw new Error('Invalid OCR page segmentation mode');
  if (!Number.isInteger(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error(`Invalid OCR timeout; expected ${MIN_TIMEOUT_MS}-${MAX_TIMEOUT_MS}ms`);
  }

  // Write input to a temp file if it's a Buffer
  const isBuffer = Buffer.isBuffer(input);
  if (isBuffer && input.byteLength === 0) throw new Error('OCR input is empty');
  if (isBuffer && input.byteLength > MAX_INPUT_BYTES) throw new Error('OCR input exceeds the 25MB limit');
  if (!isBuffer && (!input || !input.startsWith('/') && !/^[A-Za-z]:[\\/]/u.test(input))) {
    throw new Error('OCR file path must be absolute');
  }
  const tmpFile = isBuffer
    ? join(tmpdir(), `ocr-${randomBytes(8).toString('hex')}.png`)
    : input;

  if (isBuffer) {
    await writeFile(tmpFile, input);
  }

  const startTime = Date.now();
  try {
    const text = await new Promise<string>((resolve, reject) => {
      const { proc } = launchHidden({
        executable: binary,
        args: [
          tmpFile,
          'stdout',
          '--psm', String(psm),
          '-l', lang,
        ],
        stdio: ['ignore', 'pipe', 'pipe'],
        requestId: 'ocr-tesseract',
        closeReason: 'ocr-complete',
      });

      let stdoutBytes = 0;
      let stderrBytes = 0;
      let stdout = '';
      let stderr = '';
      let settled = false;
      const fail = (error: Error): void => {
        if (settled) return;
        settled = true;
        proc.kill('SIGKILL');
        reject(error);
      };
      proc.stdout?.on('data', (chunk: Buffer) => {
        stdoutBytes += chunk.byteLength;
        if (stdoutBytes > MAX_OUTPUT_BYTES) {
          fail(new Error('Tesseract OCR output exceeds the 256KB limit'));
          return;
        }
        stdout += chunk.toString();
      });
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderrBytes += chunk.byteLength;
        if (stderrBytes <= MAX_STDERR_BYTES) stderr += chunk.toString();
      });

      const timer = setTimeout(() => {
        fail(new Error(`Tesseract OCR timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        if (code === 0) {
          const result = stdout.trim();
          if (!result) reject(new Error('Tesseract OCR returned no text'));
          else resolve(result);
        } else {
          reject(new Error(`Tesseract exited with code ${code}: ${stderr.trim()}`));
        }
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        reject(err);
      });
    });

    return {
      text,
      confidence: -1, // Tesseract CLI doesn't expose confidence directly
      language: lang,
      durationMs: Date.now() - startTime,
    };
  } finally {
    if (isBuffer) {
      await unlink(tmpFile).catch(() => {});
    }
  }
}
