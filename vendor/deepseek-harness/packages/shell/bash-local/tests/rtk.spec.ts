import { describe, expect, it } from 'vitest'
import { canUseRtk, wrapWithRtk } from '../../shell/src/rtk.ts'

describe('optional RTK command wrapper', () => {
  it('wraps supported plain commands only when RTK is available', () => {
    expect(canUseRtk('git status')).toBe(true)
    expect(wrapWithRtk('git status', true)).toBe('rtk git status')
    expect(wrapWithRtk('git status', false)).toBe('git status')
  })

  it('leaves compound or quoted shell commands unchanged', () => {
    for (const command of ['git status | rg modified', 'git status && git diff', 'echo $HOME', 'git status > out.txt', 'git "status"']) {
      expect(canUseRtk(command)).toBe(false)
      expect(wrapWithRtk(command, true)).toBe(command)
    }
  })

  it('does not wrap unknown commands', () => {
    expect(canUseRtk('python script.py')).toBe(false)
    expect(wrapWithRtk('python script.py', true)).toBe('python script.py')
  })
})
