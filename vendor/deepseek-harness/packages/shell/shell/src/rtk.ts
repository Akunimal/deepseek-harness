import { spawnSync } from 'node:child_process'

/** Commands whose plain output is safe for RTK to summarize. */
const RTK_COMMANDS = new Set([
  'bun', 'cargo', 'docker', 'gh', 'git', 'go', 'kubectl', 'npm', 'npx',
  'pnpm', 'pytest', 'rg', 'ruff', 'rustc', 'vitest', 'yarn',
])

// Do not hand shell syntax to a second command wrapper. This also keeps the
// wrapper from changing the meaning of pipelines, redirects, substitutions,
// quoting, or multi-line commands.
const SHELL_META = /[|&;<>`$(){}'"\\\r\n]/

/** Whether a command is a plain invocation that RTK may summarize. */
export function canUseRtk(command: string): boolean {
  const trimmed = command.trim()
  if (!trimmed || SHELL_META.test(trimmed)) return false
  const executable = trimmed.split(/\s+/, 1)[0]
  return executable !== undefined && RTK_COMMANDS.has(executable)
}

/** Add the RTK prefix only when the caller enabled it and the command is safe. */
export function wrapWithRtk(command: string, available: boolean): string {
  return available && canUseRtk(command) ? `rtk ${command}` : command
}

/** RTK is an optional user-installed accelerator. Detection is best effort. */
export function resolveRtk(): boolean {
  try {
    return spawnSync('rtk', ['--version'], {
      timeout: 2_000,
      stdio: 'ignore',
      windowsHide: true,
    }).status === 0
  } catch {
    return false
  }
}
