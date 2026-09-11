import { describe, it, expect } from 'vitest'
import {
  checkGitAvailable,
  checkGitInSandbox,
  getSandboxMode,
  getSandboxReason,
  getSandboxSuggestions,
  type SandboxMode,
} from '../src/sandbox/sandbox-diagnostics.js'

describe('sandbox-diagnostics', () => {
  describe('checkGitAvailable', () => {
    it('returns available when git is on PATH', () => {
      const result = checkGitAvailable()
      expect(result.available).toBe(true)
      expect(result.resolve).toBeDefined()
      expect(result.resolve?.version).toMatch(/^git version/)
    })

    it('returns unavailable with empty pathOverride', () => {
      const result = checkGitAvailable({ pathOverride: '' })
      expect(result.available).toBe(false)
    })
  })

  describe('checkGitInSandbox', () => {
    it('simulates empty PATH and checks packaged git only', () => {
      // On a dev machine without packaged git, the resolver falls back to
      // common absolute paths (C:\Program Files\Git\cmd\git.exe) which is
      // system-absolute, not packaged. The key assertion is that it does NOT
      // resolve via PATH (system-path source).
      const result = checkGitInSandbox()
      expect(typeof result.available).toBe('boolean')
      if (result.resolve) {
        // Should NOT be system-path (PATH lookup was empty)
        expect(result.resolve.source).not.toBe('system-path')
      }
    })
  })

  describe('getSandboxMode', () => {
    it('returns a valid SandboxMode', () => {
      const mode = getSandboxMode()
      const validModes: SandboxMode[] = ['workspace-write', 'danger-full-access', 'unknown']
      expect(validModes).toContain(mode)
    })
  })

  describe('getSandboxReason', () => {
    it('returns a non-empty string', () => {
      const reason = getSandboxReason()
      expect(typeof reason).toBe('string')
      expect(reason.length).toBeGreaterThan(0)
    })
  })

  describe('getSandboxSuggestions', () => {
    it('returns suggestions when git is unavailable', () => {
      const suggestions = getSandboxSuggestions({ gitAvailable: false })
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.includes('Git'))).toBe(true)
    })

    it('returns suggestions when network is unreachable', () => {
      const suggestions = getSandboxSuggestions({ networkReachable: false })
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.includes('network'))).toBe(true)
    })

    it('returns workspace-write suggestion in that mode', () => {
      const suggestions = getSandboxSuggestions({ sandboxMode: 'workspace-write' })
      expect(suggestions.some(s => s.includes('Workspace Write'))).toBe(true)
    })

    it('returns "no action required" when all checks pass', () => {
      const suggestions = getSandboxSuggestions({
        gitAvailable: true,
        networkReachable: true,
        sandboxMode: 'danger-full-access',
      })
      expect(suggestions).toContain('All checks passed. No action required.')
    })
  })
})
