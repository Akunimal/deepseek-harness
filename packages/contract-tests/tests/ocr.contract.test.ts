/**
 * OCR contract tests — Phase 7.
 *
 * Verifies OCR behavior through the public API:
 *   1. Missing binary → graceful error
 *   2. Empty OCR output → error
 *   3. Successful extraction with mock runner
 *   4. Caching by image hash
 *   5. Does not cache failed output
 *   6. Trims whitespace from output
 *   7. Timeout enforcement
 *   8. Constants: size limits, timeout, cache entries
 *
 * Uses the upstream product-level OCR module with injectable runner.
 * Private functions (validateImagePath, resolveLanguage, resolvePsm)
 * are tested indirectly through extractTextFromImage.
 */

import { describe, expect, it, beforeAll, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const VENDOR = join(import.meta.dirname, '../../..', 'vendor/deepseek-harness');

let extractTextFromImage, setOcrRunnerForTests, clearOcrCache;
let OCR_MAX_IMAGE_BYTES, OCR_MAX_OUTPUT_BYTES, OCR_TIMEOUT_MS, OCR_MAX_CACHE_ENTRIES;

beforeAll(async () => {
  const ocrMod = await import(join(VENDOR, 'packages/llm/llm/src/ocr.ts'));
  extractTextFromImage = ocrMod.extractTextFromImage;
  setOcrRunnerForTests = ocrMod.setOcrRunnerForTests;
  clearOcrCache = ocrMod.clearOcrCache;
  OCR_MAX_IMAGE_BYTES = ocrMod.OCR_MAX_IMAGE_BYTES;
  OCR_MAX_OUTPUT_BYTES = ocrMod.OCR_MAX_OUTPUT_BYTES;
  OCR_TIMEOUT_MS = ocrMod.OCR_TIMEOUT_MS;
  OCR_MAX_CACHE_ENTRIES = ocrMod.OCR_MAX_CACHE_ENTRIES;
});

let tmpDir;
beforeEach(() => {
  clearOcrCache?.();
  tmpDir = mkdtempSync(join(tmpdir(), 'ocr-contract-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeDummyImage(name = 'test.png', content = 'fake-image-data') {
  const p = join(tmpDir, name);
  writeFileSync(p, content, 'utf8');
  return p;
}

describe('OCR contract — constants', () => {
  it('max image bytes is 25MB', () => {
    expect(OCR_MAX_IMAGE_BYTES).toBe(25 * 1024 * 1024);
  });

  it('max output bytes is 256KB', () => {
    expect(OCR_MAX_OUTPUT_BYTES).toBe(256 * 1024);
  });

  it('default timeout is 30 seconds', () => {
    expect(OCR_TIMEOUT_MS).toBe(30_000);
  });

  it('max cache entries is 64', () => {
    expect(OCR_MAX_CACHE_ENTRIES).toBe(64);
  });
});

describe('OCR contract — extraction with mock runner', () => {
  it('calls runner with correct CLI args and returns text', async () => {
    const calls = [];
    setOcrRunnerForTests(async (binary, args, _opts) => {
      calls.push({ binary, args });
      return 'extracted text';
    });

    const img = makeDummyImage();
    const result = await extractTextFromImage(img, { language: 'eng', psm: 6 });

    expect(result).toBe('extracted text');
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toContain('stdout');
    expect(calls[0].args).toContain('--psm');
    expect(calls[0].args).toContain('6');
    expect(calls[0].args).toContain('-l');
    expect(calls[0].args).toContain('eng');
  });

  it('caches results by image hash', async () => {
    let callCount = 0;
    setOcrRunnerForTests(async () => {
      callCount++;
      return 'cached text';
    });

    const img = makeDummyImage();
    await extractTextFromImage(img);
    await extractTextFromImage(img);

    expect(callCount).toBe(1);
  });

  it('does not cache failed output', async () => {
    let callCount = 0;
    setOcrRunnerForTests(async () => {
      callCount++;
      throw new Error('OCR failed');
    });

    const img = makeDummyImage();
    try { await extractTextFromImage(img); } catch {}
    try { await extractTextFromImage(img); } catch {}

    expect(callCount).toBe(2);
  });

  it('trims whitespace from output', async () => {
    setOcrRunnerForTests(async () => {
      return '  extracted text  \n';
    });

    const img = makeDummyImage();
    const result = await extractTextFromImage(img);
    expect(result).toBe('extracted text');
  });

  it('rejects empty OCR output', async () => {
    setOcrRunnerForTests(async () => {
      return '';
    });

    const img = makeDummyImage();
    await expect(extractTextFromImage(img)).rejects.toThrow();
  });

  it('propagates runner errors', async () => {
    setOcrRunnerForTests(async () => {
      throw new Error('tesseract not found');
    });

    const img = makeDummyImage();
    await expect(extractTextFromImage(img)).rejects.toThrow('tesseract not found');
  });
});

describe('OCR contract — image validation (via extractTextFromImage)', () => {
  it('rejects non-existent image path', async () => {
    setOcrRunnerForTests(async () => 'ok');
    await expect(extractTextFromImage(join(tmpDir, 'nonexistent.png'))).rejects.toThrow();
  });

  it('rejects oversized image', async () => {
    setOcrRunnerForTests(async () => 'ok');
    const bigImg = makeDummyImage('big.png', 'x'.repeat(OCR_MAX_IMAGE_BYTES + 1));
    await expect(extractTextFromImage(bigImg)).rejects.toThrow();
  });
});
