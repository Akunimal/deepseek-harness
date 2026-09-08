import { describe, expect, it } from 'vitest'
import { canUseCaveman, wrapWithCaveman } from '../../shell/src/caveman.ts'

describe('optional Caveman command wrapper', () => {
  it('wraps supported plain commands only when Caveman is available', () => {
    expect(canUseCaveman('git status')).toBe(true)
    expect(wrapWithCaveman('git status', true)).toBe('caveman compress --stdin "git status"')
    expect(wrapWithCaveman('ls -la', true)).toBe('caveman compress --stdin "ls -la"')
  })

  it('rejects unsupported and compound commands', () => {
    for (const command of [
      'echo hello', 'pwd', 'cat file | grep foo', 'echo hello && ls',
      'git status > out.txt', 'git status "$HOME"', 'git status\necho unsafe',
    ]) {
      expect(canUseCaveman(command)).toBe(false)
      expect(wrapWithCaveman(command, true)).toBe(command)
    }
  })

  it('does not wrap when Caveman is not available', () => {
    expect(wrapWithCaveman('git status', false)).toBe('git status')
  })
})
