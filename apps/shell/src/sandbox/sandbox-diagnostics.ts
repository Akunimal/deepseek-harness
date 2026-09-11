/**
 * sandbox-diagnostics.ts — Diagnose sandbox, Git, and network restrictions.
 *
 * This module provides structured diagnostics for:
 *   - Whether Git is available and where
 *   - Whether the network can be reached
 *   - Whether the sandbox is in Workspace Write or danger-full-access mode
 *   - Actionable suggestions for the user/UI
 */

import { resolveGitPath, type GitResolveResult, GitError } from '../git/git-resolver.js'

// ── Types ──────────────────────────────────────────────────────────

export type SandboxMode = 'workspace-write' | 'danger-full-access' | 'unknown'

export interface GitAvailability {
  available: boolean
  resolve?: GitResolveResult
  error?: string
}

export interface NetworkAvailability {
  reachable: boolean
  durationMs: number
  error?: string
}

export interface SandboxDiagnostic {
  git: GitAvailability
  network: NetworkAvailability
  sandboxMode: SandboxMode
  suggestions: string[]
}

// ── Git availability check ─────────────────────────────────────────

/**
 * Check if Git is available on the system.
 */
export function checkGitAvailable(options: {
  packagedResourcesDir?: string
  pathOverride?: string
} = {}): GitAvailability {
  try {
    const resolve = resolveGitPath(options)
    return { available: true, resolve }
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Check if Git is reachable from within a sandboxed environment
 * (empty PATH, no system binary access). This verifies that either
 * a packaged Git is available or the sandbox is not restricting access.
 */
export function checkGitInSandbox(options: {
  packagedResourcesDir?: string
} = {}): GitAvailability {
  try {
    const resolve = resolveGitPath({ ...options, pathOverride: '' }) // empty PATH
    return { available: true, resolve }
  } catch {
    return {
      available: false,
      error: 'Git not available with empty PATH (expected in sandbox)',
    }
  }
}

// ── Sandbox mode detection ─────────────────────────────────────────

/**
 * Detect the current sandbox mode based on environment indicators.
 */
export function getSandboxMode(): SandboxMode {
  // Electron's sandbox flag
  if (process.argv.includes('--sandbox')) return 'workspace-write'

  // FreeCode's own sandbox policy
  const sandboxEnv = process.env.FREECODE_SANDBOX_MODE
  if (sandboxEnv === 'danger-full-access') return 'danger-full-access'
  if (sandboxEnv === 'workspace-write') return 'workspace-write'

  // Default: workspace-write (safe default)
  return 'workspace-write'
}

/**
 * Get the reason for the current sandbox mode.
 */
export function getSandboxReason(): string {
  const mode = getSandboxMode()
  switch (mode) {
    case 'workspace-write':
      return 'Default policy: writes are restricted to the workspace directory.'
    case 'danger-full-access':
      return 'Full access mode: all filesystem operations are allowed (user opted in).'
    case 'unknown':
      return 'Sandbox mode could not be determined.'
  }
}

// ── Actionable suggestions ─────────────────────────────────────────

/**
 * Get actionable suggestions for the user based on sandbox diagnostics.
 */
export function getSandboxSuggestions(options: {
  gitAvailable?: boolean
  networkReachable?: boolean
  sandboxMode?: SandboxMode
} = {}): string[] {
  const suggestions: string[] = []
  const mode = options.sandboxMode ?? getSandboxMode()

  if (options.gitAvailable === false) {
    suggestions.push(
      'Install Git from https://git-scm.com/download/win and ensure it is in your PATH.',
      'Or place git.exe in the FreeCode resources directory for bundled use.',
    )
  }

  if (options.networkReachable === false) {
    suggestions.push(
      'Check your network connection and firewall settings.',
      'Some features require internet access for initial setup.',
    )
  }

  if (mode === 'workspace-write') {
    suggestions.push(
      'The app is in Workspace Write mode: file operations are restricted to the project directory.',
      'To access files outside the workspace, change the sandbox mode in Settings → Security.',
    )
  }

  if (suggestions.length === 0) {
    suggestions.push('All checks passed. No action required.')
  }

  return suggestions
}

// ── Full diagnostic ────────────────────────────────────────────────

/**
 * Run a comprehensive sandbox diagnostic.
 */
export async function runSandboxDiagnostic(options: {
  packagedResourcesDir?: string
  pathOverride?: string
  workspaceDir?: string
} = {}): Promise<SandboxDiagnostic> {
  const git = checkGitAvailable(options)
  const sandboxMode = getSandboxMode()

  // Check network (lightweight TCP probe — no external HTTP dependency)
  let network: NetworkAvailability
  try {
    const { Socket } = await import('node:net')
    const start = Date.now()
    const reachable = await new Promise<boolean>((resolve) => {
      const sock = new Socket()
      sock.setTimeout(3_000)
      sock.once('connect', () => { sock.destroy(); resolve(true) })
      sock.once('timeout', () => { sock.destroy(); resolve(false) })
      sock.once('error', () => { sock.destroy(); resolve(false) })
      sock.connect(53, '8.8.8.8')
    })
    network = {
      reachable,
      durationMs: Date.now() - start,
      error: reachable ? undefined : 'TCP probe to 8.8.8.8:53 failed',
    }
  } catch (err) {
    network = {
      reachable: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const suggestions = getSandboxSuggestions({
    gitAvailable: git.available,
    networkReachable: network.reachable,
    sandboxMode,
  })

  return { git, network, sandboxMode, suggestions }
}
