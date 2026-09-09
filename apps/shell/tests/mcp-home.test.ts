import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ensureEmbeddedMcpConfig,
  embeddedMcpEnvironment,
  setEmbeddedMcpEnabled,
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
    const config = JSON.parse(readFileSync(state.configPath, 'utf8')) as {
      servers: Array<{ id: string, enabled: boolean, args?: string[], serverName?: string }>
    }
    const patch = readFileSync(state.patchPath, 'utf8')

    expect(state.enabled).toEqual(['serena', 'free-search'])
    expect(config.servers.map((server) => server.id)).toEqual([
      'serena',
      'free-search',
    ])
    expect(config.servers).toHaveLength(2)
    expect(config.servers.every((server) => server.enabled)).toBe(true)
    expect(config.servers.find((server) => server.id === 'serena')?.args).toEqual([
      '--from',
      'git+https://github.com/oraios/serena',
      'serena',
      'start-mcp-server',
      '--context',
      'claude-code',
    ])
    expect(config.servers.find((server) => server.id === 'serena')).toMatchObject({
      projectActivation: { toolName: 'activate_project', pathArgument: 'project' },
    })
    expect(patch).toMatch(/id: "freecode-mcp-serena"[\s\S]*?projectActivation:[\s\S]*?toolName: "activate_project"[\s\S]*?pathArgument: "project"/)
    expect(new Set(config.servers.map((server) => server.serverName)).size).toBe(2)
    expect(patch.match(new RegExp(MCP_MANAGED_PATCH_BEGIN, 'g'))).toHaveLength(1)
    expect(patch.match(new RegExp(MCP_MANAGED_PATCH_END, 'g'))).toHaveLength(1)
    expect(patch.match(/name: "@deepseek-ai\/dsh-mcp-client"/g)).toHaveLength(2)
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
    expect(patch).toMatch(/id: "freecode-mcp-serena"[\s\S]*?disabled: !!js process\.env\.FREECODE_WEB_MODE === '1'/)
    expect(patch.match(new RegExp(MCP_MANAGED_PATCH_BEGIN, 'g'))).toHaveLength(1)
  })

  it('projects persisted toggles into the Standard preset environment', () => {
    const home = mkdtempSync(join(tmpdir(), 'freecode-mcp-home-'))
    homes.push(home)
    const state = setEmbeddedMcpEnabled(home, 'serena', false)
    expect(embeddedMcpEnvironment(state)).toMatchObject({
      FREECODE_WEB_MODE: '1',
      FREECODE_MCP_SERENA_ENABLED: 'false',
      FREECODE_MCP_FREE_SEARCH_ENABLED: 'true',
    })
  })

  it('keeps the bootstrapped absolute uvx path when a toggle is changed', () => {
    const home = mkdtempSync(join(tmpdir(), 'freecode-mcp-home-'))
    homes.push(home)
    const uvxPath = join(home, 'uvx.exe')
    writeFileSync(uvxPath, 'MZ managed uvx')

    const first = ensureEmbeddedMcpConfig(home, { uvxCommand: uvxPath })
    const firstConfig = JSON.parse(readFileSync(first.configPath, 'utf8')) as { servers: Array<{ id: string, command: string }> }
    expect(firstConfig.servers.find((server) => server.id === 'free-search')?.command).toBe(uvxPath)

    const second = setEmbeddedMcpEnabled(home, 'free-search', false)
    const secondConfig = JSON.parse(readFileSync(second.configPath, 'utf8')) as { servers: Array<{ id: string, command: string, enabled: boolean }> }
    const search = secondConfig.servers.find((server) => server.id === 'free-search')!
    expect(search.command).toBe(uvxPath)
    expect(search.enabled).toBe(false)
  })
})
