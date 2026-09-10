/**
 * caveman-resolver.ts — Packaged binary resolution for RTK and Caveman.
 *
 * Checks bundled paths under resourcesDir first, then falls back to PATH
 * lookup via launchHiddenSync with windowsHide:true. Results are cached
 * to avoid repeated filesystem probes.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { launchHiddenSync } from './freecode-launcher.js'

// ── Cache ────────────────────────────────────────────────────────────

const resolutionCache: Map<string, string | null> = new Map()

// ── Caveman ──────────────────────────────────────────────────────────

const CAVEMAN_BUNDLED_NAMES = ['caveman.exe', 'caveman']

/**
 * Resolve the Caveman binary path. Checks bundled paths under
 * resourcesDir first, then falls back to PATH.
 * Returns null if no executable is found.
 */
export function resolveCavemanBinary(resourcesDir: string): string | null {
  const cacheKey = `caveman:${resourcesDir}`
  if (resolutionCache.has(cacheKey)) return resolutionCache.get(cacheKey)!

  // Check bundled paths first
  for (const name of CAVEMAN_BUNDLED_NAMES) {
    const candidate = join(resourcesDir, 'caveman', name)
    if (existsSync(candidate)) {
      resolutionCache.set(cacheKey, candidate)
      return candidate
    }
  }

  // Check resourcesDir root
  for (const name of CAVEMAN_BUNDLED_NAMES) {
    const candidate = join(resourcesDir, name)
    if (existsSync(candidate)) {
      resolutionCache.set(cacheKey, candidate)
      return candidate
    }
  }

  // PATH fallback via where.exe (Windows) or which (non-Windows)
  const lookupCmd = process.platform === 'win32' ? 'where' : 'which'
  try {
    const result = launchHiddenSync({
      executable: lookupCmd,
      args: ['caveman'],
      timeout: 5_000,
    })
    if (result.status === 0 && result.stdout) {
      const firstLine = result.stdout.toString().trim().split('\n')[0]?.trim()
      if (firstLine && existsSync(firstLine)) {
        resolutionCache.set(cacheKey, firstLine)
        return firstLine
      }
    }
  } catch {
    // Lookup failed — continue to return null
  }

  resolutionCache.set(cacheKey, null)
  return null
}

/**
 * Check whether Caveman is available (bundled or on PATH).
 */
export function isCavemanAvailable(resourcesDir: string): boolean {
  return resolveCavemanBinary(resourcesDir) !== null
}

// ── RTK ──────────────────────────────────────────────────────────────

const RTK_BUNDLED_NAMES = ['rtk.exe', 'rtk']

/**
 * Resolve the RTK binary path. Checks bundled paths under
 * resourcesDir first, then falls back to PATH.
 * Returns null if no executable is found.
 */
export function resolveRtkBinary(resourcesDir: string): string | null {
  const cacheKey = `rtk:${resourcesDir}`
  if (resolutionCache.has(cacheKey)) return resolutionCache.get(cacheKey)!

  // Check bundled paths first
  for (const name of RTK_BUNDLED_NAMES) {
    const candidate = join(resourcesDir, 'rtk', name)
    if (existsSync(candidate)) {
      resolutionCache.set(cacheKey, candidate)
      return candidate
    }
  }

  // Check resourcesDir root
  for (const name of RTK_BUNDLED_NAMES) {
    const candidate = join(resourcesDir, name)
    if (existsSync(candidate)) {
      resolutionCache.set(cacheKey, candidate)
      return candidate
    }
  }

  // PATH fallback via where.exe (Windows) or which (non-Windows)
  const lookupCmd = process.platform === 'win32' ? 'where' : 'which'
  try {
    const result = launchHiddenSync({
      executable: lookupCmd,
      args: ['rtk'],
      timeout: 5_000,
    })
    if (result.status === 0 && result.stdout) {
      const firstLine = result.stdout.toString().trim().split('\n')[0]?.trim()
      if (firstLine && existsSync(firstLine)) {
        resolutionCache.set(cacheKey, firstLine)
        return firstLine
      }
    }
  } catch {
    // Lookup failed — continue to return null
  }

  resolutionCache.set(cacheKey, null)
  return null
}

/**
 * Check whether RTK is available (bundled or on PATH).
 */
export function isRtkAvailable(resourcesDir: string): boolean {
  return resolveRtkBinary(resourcesDir) !== null
}

// ── Cache management ─────────────────────────────────────────────────

/**
 * Clear the resolution cache. Useful for tests.
 */
export function _clearCache(): void {
  resolutionCache.clear()
}
