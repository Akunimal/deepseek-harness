/**
 * OCR module — wraps the system Tesseract CLI for text extraction from images.
 *
 * Requirements: `tesseract` must be in PATH (installed via
 *   `winget install UB-Mannheim.TesseractOCR` on Windows,
 *   `brew install tesseract` on macOS, or
 *   `apt install tesseract-ocr` on Linux).
 *
 * The module exposes a single `extractText()` function used by the IPC bridge.
 * It does NOT bundle Tesseract binaries to avoid the 50+ MB weight penalty;
 * if Tesseract is missing the function returns a clear error.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

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
  const timeoutMs = options.timeoutMs ?? 30_000;

  // Write input to a temp file if it's a Buffer
  const isBuffer = Buffer.isBuffer(input);
  const tmpFile = isBuffer
    ? join(tmpdir(), `ocr-${randomBytes(8).toString('hex')}.png`)
    : input;

  if (isBuffer) {
    await writeFile(tmpFile, input);
  }

  const startTime = Date.now();
  try {
    const text = await new Promise<string>((resolve, reject) => {
      const proc = spawn(binary, [
        tmpFile,
        'stdout',
        '--psm', String(psm),
        '-l', lang,
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`Tesseract OCR timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Tesseract exited with code ${code}: ${stderr.trim()}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
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
