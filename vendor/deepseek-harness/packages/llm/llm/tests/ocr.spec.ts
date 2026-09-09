import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  OCR_MAX_OUTPUT_BYTES,
  clearOcrCache,
  extractTextFromImage,
  setOcrRunnerForTests,
} from '../src/index.ts'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-ocr-'))
  clearOcrCache()
})

afterEach(async () => {
  clearOcrCache()
  await rm(dir, { recursive: true, force: true })
})

async function imagePath(): Promise<string> {
  const path = join(dir, 'sample.png')
  await writeFile(path, Buffer.from('fixture image bytes'))
  return path
}

describe('OCR bridge contract', () => {
  it('passes bounded argv to the runner, trims text, and caches by image/binary/options', async () => {
    const image = await imagePath()
    const calls: Array<{ binary: string; args: readonly string[] }> = []
    const restore = setOcrRunnerForTests(async (binary, args) => {
      calls.push({ binary, args })
      return '  detected text\n'
    })
    try {
      const first = await extractTextFromImage(image, { binaryPath: process.execPath, language: 'eng', psm: 6 })
      const second = await extractTextFromImage(image, { binaryPath: process.execPath, language: 'eng', psm: 6 })
      expect(first).toBe('detected text')
      expect(second).toBe('detected text')
      expect(calls).toHaveLength(1)
      expect(calls[0]).toEqual({
        binary: process.execPath,
        args: [image, 'stdout', '--psm', '6', '-l', 'eng'],
      })
    } finally {
      restore()
    }
  })

  it('rejects unsafe paths, missing binaries, languages, modes, limits, and empty output', async () => {
    const image = await imagePath()
    const restore = setOcrRunnerForTests(async () => '')
    try {
      await expect(extractTextFromImage('relative.png', { binaryPath: process.execPath })).rejects.toThrow('absolute')
      await expect(extractTextFromImage(image, { binaryPath: join(dir, 'missing.exe') })).rejects.toThrow('executable is missing')
      await expect(extractTextFromImage(image, { binaryPath: process.execPath, language: 'en' })).rejects.toThrow('language')
      await expect(extractTextFromImage(image, { binaryPath: process.execPath, psm: 14 })).rejects.toThrow('page segmentation')
      await expect(extractTextFromImage(image, { binaryPath: process.execPath, maxOutputBytes: OCR_MAX_OUTPUT_BYTES + 1 })).rejects.toThrow('output limit')
      await expect(extractTextFromImage(image, { binaryPath: process.execPath, timeoutMs: 0 })).rejects.toThrow('timeout')
      await expect(extractTextFromImage(image, { binaryPath: process.execPath })).rejects.toThrow('returned no text')
    } finally {
      restore()
    }
  })

  it('does not cache oversized or failed output and preserves timeout/cancellation diagnostics', async () => {
    const image = await imagePath()
    let mode: 'oversized' | 'timeout' | 'ok' = 'oversized'
    const restore = setOcrRunnerForTests(async (_binary, _args, options) => {
      if (mode === 'oversized') return 'x'.repeat(options.maxOutputBytes + 1)
      if (mode === 'timeout') throw new Error(`OCR timed out after ${options.timeoutMs}ms`)
      return 'ok'
    })
    try {
      await expect(extractTextFromImage(image, { binaryPath: process.execPath, maxOutputBytes: 16 })).rejects.toThrow('exceeds')
      mode = 'timeout'
      await expect(extractTextFromImage(image, { binaryPath: process.execPath, timeoutMs: 20 })).rejects.toThrow('timed out')
      mode = 'ok'
      await expect(extractTextFromImage(image, { binaryPath: process.execPath })).resolves.toBe('ok')
    } finally {
      restore()
    }
  })
})
