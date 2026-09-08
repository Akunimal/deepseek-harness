import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ensureEmbeddedMcpConfig,
  MCP_MANAGED_PATCH_BEGIN,
  MCP_MANAGED_PATCH_END,
} from '../src/main/mcp-home.js'

const homes: string[] = []
afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

describe('embedded MCP catalog', () => {
  it('materializes all servers enabled with an explicit toggle file and managed patch', () => {
    const home = mkdtempSync(join(tmpdir(), 'freecode-mcp-home-'))
    homes.push(home)
    const state = ensureEmbeddedMcpConfig(home)
    const config = JSON.parse(readFileSync(state.configPath, 'utf8')) as { servers: Array<{ id: string, enabled: boolean }> }
    const patch = readFileSync(state.patchPath, 'utf8')

    expect(state.enabled).toEqual(['serena', 'lsp-typescript', 'lsp-python'])
    expect(config.servers).toHaveLength(3)
    expect(config.servers.every((server) => server.enabled)).toBe(true)
    expect(patch.match(new RegExp(MCP_MANAGED_PATCH_BEGIN, 'g'))).toHaveLength(1)
    expect(patch.match(new RegExp(MCP_MANAGED_PATCH_END, 'g'))).toHaveLength(1)
    expect(patch.match(/name: "@deepseek-ai\/dsh-mcp-client"/g)).toHaveLength(3)
  })

  it('preserves user overlay rows and applies a user toggle on the next boot', () => {
    const home = mkdtempSync(join(tmpdir(), 'freecode-mcp-home-'))
    homes.push(home)
    const first = ensureEmbeddedMcpConfig(home)
    writeFileSync(first.patchPath, `${readFileSync(first.patchPath, 'utf8')}\n- id: user-overlay\n  disabled: false\n`)
    const config = JSON.parse(readFileSync(first.configPath, 'utf8')) as { servers: Array<{ id: string, enabled: boolean }> }
    config.servers.find((server) => server.id === 'serena')!.enabled = false
    writeFileSync(first.configPath, `${JSON.stringify(config, null, 2)}\n`)

    const second = ensureEmbeddedMcpConfig(home)
    const patch = readFileSync(second.patchPath, 'utf8')
    expect(patch).toContain('user-overlay')
    expect(patch).toContain('id: "freecode-mcp-serena"')
    expect(patch).toMatch(/id: "freecode-mcp-serena"[\s\S]*?disabled: true/)
    expect(patch.match(new RegExp(MCP_MANAGED_PATCH_BEGIN, 'g'))).toHaveLength(1)
  })
})
