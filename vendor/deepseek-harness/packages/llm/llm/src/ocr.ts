/**
 * Bounded, product-managed OCR fallback for text-only model routes.
 *
 * This module deliberately talks to the Tesseract executable through a tiny
 * argv-only bridge. It does not import pytesseract, does not invoke a shell,
 * never logs image contents, and keeps a small content-addressed memory cache.
 * The desktop shell supplies FREECODE_TESSERACT_PATH/TESSDATA_PREFIX for the
 * packaged Windows payload; a PATH-installed `tesseract` remains a useful
 * development fallback.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { spawn } from 'node:child_process'

export const OCR_MAX_IMAGE_BYTES = 25 * 1024 * 1024
export const OCR_MAX_OUTPUT_BYTES = 256 * 1024
export const OCR_TIMEOUT_MS = 30_000
export const OCR_MAX_CACHE_ENTRIES = 64

const LANGUAGE_PATTERN = /^[a-z]{3}(?:\+[a-z]{3})?$/u
const DEFAULT_LANGUAGE = 'eng'
const DEFAULT_PSM = 3

export interface OcrImageOptions {
  language?: string
  psm?: number
  timeoutMs?: number
  maxOutputBytes?: number
  /** Test/deployment override; production normally receives the env value. */
  binaryPath?: string
  signal?: AbortSignal
}

export interface OcrRunnerOptions {
  maxOutputBytes: number
  timeoutMs: number
  signal?: AbortSignal
}

/** Injectable process boundary used by package tests and embedded runtimes. */
export type OcrRunner = (
  binary: string,
  args: readonly string[],
  options: OcrRunnerOptions,
) => Promise<string>

const cache = new Map<string, string>()

function resolveBinary(override?: string): string {
  const configured = override ?? process.env.FREECODE_TESSERACT_PATH
  if (configured !== undefined && configured.trim().length > 0) {
    const path = configured.trim()
    if (isAbsolute(path) && !existsSync(path)) throw new Error(`OCR executable is missing: ${path}`)
    return path
  }
  return process.platform === 'win32' ? 'tesseract.exe' : 'tesseract'
}

function resolveLanguage(language: string | undefined): string {
  const value = language ?? process.env.FREECODE_OCR_LANGUAGE ?? DEFAULT_LANGUAGE
  if (!LANGUAGE_PATTERN.test(value)) {
    throw new Error('OCR language must use a bounded code such as eng, spa, or eng+spa')
  }
  return value
}

function resolvePsm(psm: number | undefined): number {
  const value = psm ?? DEFAULT_PSM
  if (!Number.isInteger(value) || value < 0 || value > 13) {
    throw new Error('OCR page segmentation mode must be an integer from 0 through 13')
  }
  return value
}

function validateImagePath(imagePath: string): { size: number; digest: string } {
  if (!isAbsolute(imagePath)) throw new Error('OCR requires an absolute normalized image path')
  let stat: ReturnType<typeof statSync>
  try {
    stat = statSync(imagePath)
  } catch {
    throw new Error('OCR image is not readable')
  }
  if (!stat.isFile()) throw new Error('OCR image is not a regular file')
  if (stat.size <= 0) throw new Error('OCR image is empty')
  if (stat.size > OCR_MAX_IMAGE_BYTES) {
    throw new Error(`OCR image exceeds the ${OCR_MAX_IMAGE_BYTES} byte safety limit`)
  }
  const digest = createHash('sha256').update(readFileSync(imagePath)).digest('hex')
  return { size: stat.size, digest }
}

function cacheGet(key: string): string | undefined {
  const value = cache.get(key)
  if (value === undefined) return undefined
  cache.delete(key)
  cache.set(key, value)
  return value
}

function cachePut(key: string, value: string): void {
  cache.delete(key)
  cache.set(key, value)
  while (cache.size > OCR_MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

/** Clear the process-local cache between tests or after an explicit setting change. */
export function clearOcrCache(): void {
  cache.clear()
}

async function spawnOcrProcess(
  binary: string,
  args: readonly string[],
  options: OcrRunnerOptions,
): Promise<string> {
  const { maxOutputBytes, timeoutMs, signal } = options
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, [...args], {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...process.env.FREECODE_TESSDATA_PREFIX === undefined ? {} : {
        env: { ...process.env, TESSDATA_PREFIX: process.env.FREECODE_TESSDATA_PREFIX },
      },
    })
    let output = Buffer.alloc(0)
    let stderr = Buffer.alloc(0)
    let settled = false
    let timedOut = false
    const abort = (): void => {
      child.kill()
      finish(new Error('OCR canceled before image extraction'))
    }
    const finish = (error?: Error): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (error !== undefined) reject(error)
      else {
        const value = output.toString('utf8').trim()
        if (value.length === 0) reject(new Error('OCR returned no text'))
        else resolve(value)
      }
    }
    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
      finish(new Error(`OCR timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    timer.unref()
    signal?.addEventListener('abort', abort, { once: true })
    child.stdout?.on('data', (chunk: Buffer) => {
      if (settled) return
      output = Buffer.concat([output, chunk])
      if (output.length > maxOutputBytes) {
        child.kill()
        finish(new Error(`OCR output exceeds the ${maxOutputBytes} byte safety limit`))
      }
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < 4_096) stderr = Buffer.concat([stderr, chunk]).subarray(-4_096)
    })
    child.once('error', (error) => finish(new Error(`OCR process could not start: ${error.message}`)))
    child.once('close', (code) => {
      if (settled) return
      if (timedOut) return
      if (code !== 0) {
        const detail = stderr.toString('utf8').trim().slice(0, 1_024)
        finish(new Error(`OCR exited with code ${String(code)}${detail ? `: ${detail}` : ''}`))
        return
      }
      finish()
    })
  })
}

let ocrRunner: OcrRunner = spawnOcrProcess

/**
 * Replace the executable boundary for an isolated package test and return a
 * restore callback. Application code must use the packaged executable.
 */
export function setOcrRunnerForTests(runner: OcrRunner | undefined): () => void {
  const previous = ocrRunner
  ocrRunner = runner ?? spawnOcrProcess
  return () => { ocrRunner = previous }
}

/** Run Tesseract for one already-resolved image and return bounded plain text. */
export async function extractTextFromImage(
  imagePath: string,
  options: OcrImageOptions = {},
): Promise<string> {
  if (options.signal?.aborted === true) throw new Error('OCR canceled before image extraction')
  const language = resolveLanguage(options.language)
  const psm = resolvePsm(options.psm)
  const maxOutputBytes = options.maxOutputBytes ?? OCR_MAX_OUTPUT_BYTES
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes <= 0 || maxOutputBytes > OCR_MAX_OUTPUT_BYTES) {
    throw new Error(`OCR output limit must be an integer from 1 through ${OCR_MAX_OUTPUT_BYTES}`)
  }
  const binary = resolveBinary(options.binaryPath)
  const timeoutMs = options.timeoutMs ?? OCR_TIMEOUT_MS
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > OCR_TIMEOUT_MS) {
    throw new Error(`OCR timeout must be an integer from 1 through ${OCR_TIMEOUT_MS}`)
  }
  const { digest } = validateImagePath(imagePath)
  const key = `${binary}:${digest}:${language}:${psm}:${maxOutputBytes}`
  const cached = cacheGet(key)
  if (cached !== undefined) return cached

  const text = await ocrRunner(
    binary,
    [imagePath, 'stdout', '--psm', String(psm), '-l', language],
    { maxOutputBytes, timeoutMs, ...options.signal === undefined ? {} : { signal: options.signal } },
  )
  const normalized = text.trim()
  if (normalized.length === 0) throw new Error('OCR returned no text')
  if (Buffer.byteLength(normalized, 'utf8') > maxOutputBytes) {
    throw new Error(`OCR output exceeds the ${maxOutputBytes} byte safety limit`)
  }

  cachePut(key, normalized)
  return normalized
}
