import { spawnSync } from 'node:child_process'

/** Commands whose plain output is safe for Caveman to summarize. */
const CAVEMAN_COMMANDS = new Set([
  'cat', 'head', 'tail', 'grep', 'rg', 'find', 'ls', 'dir',
  'git', 'pnpm', 'npm', 'yarn', 'node', 'python', 'pip',
])

// Caveman receives the command as a quoted argument. Reject syntax that could
// be reinterpreted by the host shell or break that argument boundary.
const SHELL_META = /[|&;<>`$(){}'"\\\r\n]/

/** Check whether the optional caveman executable is available on PATH. */
export function resolveCaveman(): boolean {
  try {
    return spawnSync('caveman', ['--version'], {
      timeout: 2_000,
      stdio: 'ignore',
      windowsHide: true,
    }).status === 0
  } catch {
    return false
  }
}

/** Whether a command is a safe, plain invocation eligible for compression. */
export function canUseCaveman(command: string): boolean {
  const trimmed = command.trim()
  if (!trimmed || SHELL_META.test(trimmed)) return false
  const executable = trimmed.split(/\s+/, 1)[0]?.split('/').pop()?.split('\\').pop()
  return executable !== undefined && CAVEMAN_COMMANDS.has(executable)
}

/** Add the Caveman wrapper only when the caller enabled it and the command is safe. */
export function wrapWithCaveman(command: string, available: boolean): string {
  return available && canUseCaveman(command) ? `caveman compress --stdin "${command}"` : command
}
