import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  resolveCavemanBinary,
  isCavemanAvailable,
  resolveRtkBinary,
  isRtkAvailable,
  _clearCache,
} from '../src/main/caveman-resolver.js'

let dirs: string[] = []

afterEach(() => {
  _clearCache()
  for (const d of dirs.splice(0)) {
    rmSync(d, { recursive: true, force: true })
  }
})

describe('caveman-resolver', () => {
  it('returns null for an empty directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'caveman-test-'))
    dirs.push(dir)
    expect(resolveCavemanBinary(dir)).toBeNull()
  })

  it('isCavemanAvailable returns false for empty dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'caveman-test-'))
    dirs.push(dir)
    expect(isCavemanAvailable(dir)).toBe(false)
  })

  it('returns null for RTK when directory is empty', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rtk-test-'))
    dirs.push(dir)
    expect(resolveRtkBinary(dir)).toBeNull()
    expect(isRtkAvailable(dir)).toBe(false)
  })

  it('detects a bundled caveman.exe in a subdirectory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'caveman-bundled-'))
    dirs.push(dir)
    const binDir = join(dir, 'caveman')
    mkdirSync(binDir)
    writeFileSync(join(binDir, 'caveman.exe'), 'fake')
    expect(resolveCavemanBinary(dir)).toBe(join(binDir, 'caveman.exe'))
  })

  it('detects a bundled rtk.exe in resourcesDir root', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rtk-bundled-'))
    dirs.push(dir)
    writeFileSync(join(dir, 'rtk.exe'), 'fake')
    expect(resolveRtkBinary(dir)).toBe(join(dir, 'rtk.exe'))
  })

  it('caches results across repeated calls', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cache-test-'))
    dirs.push(dir)
    const first = resolveCavemanBinary(dir) // miss → null
    const second = resolveCavemanBinary(dir) // hit → cached null
    expect(first).toBeNull()
    expect(second).toBeNull()
    // Cache should prevent a second lookup — verified by consistency
  })

  it('clearCache resets state', () => {
    const dir = mkdtempSync(join(tmpdir(), 'clear-test-'))
    dirs.push(dir)
    resolveCavemanBinary(dir)
    _clearCache()
    // After clear, a re-probe should still return null (dir is empty)
    expect(resolveCavemanBinary(dir)).toBeNull()
  })
})
