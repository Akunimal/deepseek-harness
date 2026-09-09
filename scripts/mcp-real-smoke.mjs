#!/usr/bin/env node
/**
 * Black-box MCP gate for the Windows release.
 *
 * This deliberately talks to the actual bundled MCP SDK and the actual
 * external server commands. Unit tests cover the bridge's registry contract;
 * this gate proves that a packaged runtime can initialize both managed
 * servers, discover schemas, and execute one read-only tool call without a
 * browser or visible console.
 */

import { createRequire } from 'node:module'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

if (process.platform !== 'win32') {
  throw new Error('mcp-real-smoke: Windows-only release gate')
}

const root = resolve(import.meta.dirname, '..')
const runtimeRoot = resolve(process.argv[2] ?? join(root, 'apps', 'shell', 'resources', 'freecode', 'dsh'))
const cliEntry = join(runtimeRoot, 'apps', 'cli', 'lib', 'bin.js')
if (!existsSync(cliEntry)) throw new Error(`mcp-real-smoke: runtime CLI missing: ${cliEntry}`)

// The packaged dsh runtime contains native modules compiled for Electron's
// Node ABI, not for the developer machine's standalone Node ABI.  Launching
// it with process.execPath would make this smoke test report a false product
// failure (for example, fs-ext ABI 133 vs system Node ABI 137).  Use the same
// Electron executable that the packaged shell uses in ELECTRON_RUN_AS_NODE
// mode so this check exercises the real runtime boundary.
const electronCandidates = [
  join(root, 'apps', 'shell', 'node_modules', 'electron', 'dist', 'electron.exe'),
  join(root, 'apps', 'shell', 'release', 'win-unpacked', 'FreeCode DeepSeek Harness.exe'),
]
const dshNodePath = electronCandidates.find((candidate) => existsSync(candidate))
if (dshNodePath === undefined) {
  throw new Error(`mcp-real-smoke: Electron runtime missing; checked ${electronCandidates.join(', ')}`)
}

const runtimeRequire = createRequire(cliEntry)
const { Client } = runtimeRequire('@modelcontextprotocol/sdk/client/index.js')
const { StdioClientTransport } = runtimeRequire('@modelcontextprotocol/sdk/client/stdio.js')

const bootstrapUrl = pathToFileURL(resolve(root, 'apps', 'shell', 'dist', 'src', 'main', 'uvx-bootstrap.js')).href
const { ensureUvxCommand } = await import(bootstrapUrl)

const scratch = join(tmpdir(), `freecode-mcp-real-${process.pid}-${Date.now()}`)
const project = join(scratch, 'project')
mkdirSync(project, { recursive: true })
writeFileSync(join(project, 'README.md'), '# FreeCode MCP smoke project\n', 'utf8')

function timeout(promise, ms, label) {
  let timer
  const expiry = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    timer.unref()
  })
  return Promise.race([promise, expiry]).finally(() => clearTimeout(timer))
}

function nonEmptyResult(result, label) {
  if (!result || result.isError === true) throw new Error(`${label} returned an MCP error`)
  const content = Array.isArray(result.content) ? result.content : []
  const structured = result.structuredContent
  if (content.length === 0 && (structured === undefined || structured === null)) {
    throw new Error(`${label} returned an empty result`)
  }
  return result
}

async function probeServer({ id, args, call }) {
  const client = new Client({ name: 'freecode-release-smoke', version: '0.5.0' })
  const transport = new StdioClientTransport({
    command: uvxCommand,
    args,
    cwd: project,
    env: {
      ...process.env,
      UV_NO_PROGRESS: '1',
      UV_NO_COLOR: '1',
      NO_COLOR: '1',
    },
    stderr: 'pipe',
  })
  let stderr = ''
  transport.stderr?.on('data', (chunk) => {
    stderr = `${stderr}${String(chunk)}`.slice(-2_048)
  })
  try {
    await timeout(client.connect(transport), 180_000, `${id} initialize`)
    const listed = await timeout(client.listTools(), 60_000, `${id} tools/list`)
    if (!Array.isArray(listed.tools) || listed.tools.length === 0) {
      throw new Error(`${id} tools/list returned no tools`)
    }
    for (const tool of listed.tools) {
      if (typeof tool.name !== 'string' || !tool.name || typeof tool.inputSchema !== 'object' || tool.inputSchema === null) {
        throw new Error(`${id} tools/list returned an invalid schema`)
      }
    }
    const result = await timeout(call(client, listed.tools), 60_000, `${id} tools/call`)
    nonEmptyResult(result, `${id} tools/call`)
    console.log(`mcp-real-smoke: ${id} ready; ${listed.tools.length} tool(s); call succeeded`)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const tail = stderr.trim()
    throw new Error(`mcp-real-smoke: ${id} failed: ${detail}${tail ? `\n${tail}` : ''}`)
  } finally {
    try { await timeout(client.close(), 10_000, `${id} close`) } catch { /* process cleanup below */ }
  }
}

async function probeHarnessIntegration() {
  const home = join(scratch, 'dsh-home')
  const mcpHomeUrl = pathToFileURL(resolve(root, 'apps', 'shell', 'dist', 'src', 'main', 'mcp-home.js')).href
  const { ensureEmbeddedMcpConfig } = await import(mcpHomeUrl)
  ensureEmbeddedMcpConfig(home, { uvxCommand })

  // A local OpenAI-compatible endpoint lets this black-box check observe the
  // exact tool roster that dsh sends to a model, without credentials or a
  // network model call. This catches the historical failure mode where MCP
  // child processes existed but their tools never reached the agent scope.
  const providerRequests = []
  const provider = createServer((request, response) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => {
      try {
        const parsed = JSON.parse(body)
        // Wait for the actual chat-completions request, not merely MCP
        // readiness.  The web API accepts session/prompt asynchronously, so
        // MCP can report ready before the queued turn reaches the provider.
        if (Array.isArray(parsed.messages)) providerRequests.push(parsed)
        response.writeHead(200, { 'content-type': 'text/event-stream' })
        response.end([
          'data: {"choices":[{"delta":{"role":"assistant","content":null}}]}',
          'data: {"choices":[{"delta":{"content":"MCP smoke response"}}]}',
          'data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1}}',
          'data: [DONE]',
          '',
        ].join('\n\n'))
      } catch (error) {
        response.writeHead(400, { 'content-type': 'text/plain' })
        response.end(error instanceof Error ? error.message : String(error))
      }
    })
  })
  await new Promise((resolve, reject) => {
    provider.once('error', reject)
    provider.listen(0, '127.0.0.1', resolve)
  })
  const address = provider.address()
  if (address === null || typeof address === 'string') throw new Error('mcp-real-smoke: provider did not bind a TCP port')

  const child = spawn(dshNodePath, [
    cliEntry,
    'web',
    '--port', '0',
    '--host', '127.0.0.1',
    '--no-open',
  ], {
    cwd: project,
    env: {
      ...process.env,
      DSH_HOME: home,
      FREECODE_WEB_MODE: '1',
      FREECODE_MCP_SERENA_ENABLED: 'true',
      FREECODE_MCP_FREE_SEARCH_ENABLED: 'true',
      FREECODE_MCP_STATUS_STREAM: 'stderr',
      FREECODE_UVX_COMMAND: uvxCommand,
      DEEPSEEK_API_KEY: 'freecode-mcp-smoke-key',
      DEEPSEEK_BASE_URL: `http://127.0.0.1:${String(address.port)}`,
      ELECTRON_RUN_AS_NODE: '1',
      UV_NO_PROGRESS: '1',
      UV_NO_COLOR: '1',
      NO_COLOR: '1',
    },
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  const append = (chunk) => { output = `${output}${String(chunk)}`.slice(-12_000) }
  child.stdout?.on('data', append)
  child.stderr?.on('data', append)
  try {
    await timeout(new Promise((resolve, reject) => {
      const poll = setInterval(() => {
        if (/dsh web: http:\/\/[^\s]+/.test(output)) {
          clearInterval(poll)
          resolve()
        }
      }, 100)
      poll.unref()
      child.once('error', reject)
      child.once('close', (code) => {
        clearInterval(poll)
        reject(new Error(`dsh exited before web readiness (code ${String(code)})`))
      })
    }), 90_000, 'dsh web readiness')

    const readyMatch = /dsh web: (http:\/\/[^\s]+)/.exec(output)
    if (readyMatch?.[1] === undefined) throw new Error('dsh web did not print an authenticated URL')
    const auth = await timeout(fetch(readyMatch[1], { redirect: 'manual' }), 30_000, 'dsh web authentication')
    const cookie = auth.headers.get('set-cookie')?.split(';', 1)[0]
    if (auth.status !== 303 || cookie === undefined) {
      throw new Error(`dsh web authentication failed with HTTP ${String(auth.status)}`)
    }
    const origin = new URL(readyMatch[1]).origin
    const createSession = await timeout(fetch(`${origin}/api/session/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: `mcp-real-smoke-session-${process.pid}`,
        method: 'session/create',
        payload: { args: { request: {} } },
      }),
    }), 60_000, 'dsh session/create')
    if (!createSession.ok) {
      throw new Error(`dsh session/create failed over HTTP ${String(createSession.status)}`)
    }
    const sessionBody = await createSession.json()
    if (sessionBody?.result?.ok !== true || typeof sessionBody.result.value?.sessionId !== 'string') {
      throw new Error(`dsh session/create returned an invalid response: ${JSON.stringify(sessionBody)}`)
    }
    const sessionId = sessionBody.result.value.sessionId
    const prompt = await timeout(fetch(`${origin}/api/session/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: `mcp-real-smoke-prompt-${process.pid}`,
        method: 'session/prompt',
        payload: {
          args: {
            request: {
              requestId: `mcp-real-smoke-request-${process.pid}`,
              sessionId,
              mode: 'queue',
              content: [{ type: 'text', text: 'Return one short MCP smoke response.' }],
            },
          },
        },
      }),
    }), 60_000, 'dsh session/prompt')
    if (!prompt.ok) throw new Error(`dsh session/prompt failed over HTTP ${String(prompt.status)}`)
    const promptBody = await prompt.json()
    if (promptBody?.result?.ok !== true) {
      throw new Error(`dsh session/prompt returned an error: ${JSON.stringify(promptBody)}`)
    }

    await timeout(new Promise((resolve, reject) => {
      const required = [
        'freecode-mcp-status {"serverId":"serena","state":"ready"',
        'freecode-mcp-status {"serverId":"free-search","state":"ready"',
        'dsh web: http://127.0.0.1:',
      ]
      const poll = setInterval(() => {
        if (required.every((marker) => output.includes(marker))) {
          clearInterval(poll)
          resolve()
        }
      }, 100)
      poll.unref()
      child.once('error', reject)
      child.once('close', (code) => {
        clearInterval(poll)
        reject(new Error(`dsh exited before MCP readiness (code ${String(code)})`))
      })
    }), 180_000, 'dsh MCP integration')
    await timeout(new Promise((resolve, reject) => {
      const poll = setInterval(() => {
        if (providerRequests.length > 0) {
          clearInterval(poll)
          resolve()
        }
      }, 100)
      poll.unref()
      child.once('error', reject)
      child.once('close', (code) => {
        clearInterval(poll)
        reject(new Error(`dsh exited before the provider request (code ${String(code)})`))
      })
    }), 180_000, 'dsh provider request')
    const toolNames = providerRequests.flatMap((request) => (
      Array.isArray(request.tools) ? request.tools : []
    )).map((tool) => tool?.function?.name).filter((name) => typeof name === 'string')
    if (!toolNames.some((name) => name.startsWith('mcp__serena__'))) {
      throw new Error(`dsh model request did not include Serena tools: ${JSON.stringify(toolNames)}`)
    }
    if (!toolNames.some((name) => name.startsWith('mcp__free-search__'))) {
      throw new Error(`dsh model request did not include free-search tools: ${JSON.stringify(toolNames)}`)
    }
    console.log('mcp-real-smoke: packaged dsh registered Serena and free-search tools')
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`mcp-real-smoke: dsh integration failed: ${detail}\n${output}`)
  } finally {
    if (child.pid !== undefined) {
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        shell: false,
        stdio: 'ignore',
      })
    }
    await new Promise((resolve) => provider.close(() => resolve()))
  }
}

const uvxCommand = await ensureUvxCommand({
  userDataDir: join(scratch, 'bootstrap'),
  env: process.env,
  log: (level, message, meta) => console.log(`mcp-real-smoke: uvx ${level}: ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`),
})
if (uvxCommand === undefined) throw new Error('mcp-real-smoke: uvx could not be resolved or bootstrapped')

try {
  await probeServer({
    id: 'serena',
    args: ['--from', 'git+https://github.com/oraios/serena', 'serena', 'start-mcp-server', '--context', 'claude-code'],
    call: async (client, tools) => {
      const activation = tools.find((tool) => tool.name === 'activate_project')
      if (activation === undefined) throw new Error('activate_project is not exposed')
      return client.callTool({ name: activation.name, arguments: { project } })
    },
  })
  await probeServer({
    id: 'free-search',
    args: ['free-search-mcp'],
    call: async (client, tools) => {
      const engines = tools.find((tool) => tool.name === 'engines')
      if (engines !== undefined) return client.callTool({ name: engines.name, arguments: {} })
      const search = tools.find((tool) => tool.name === 'search')
      if (search === undefined) throw new Error('engines/search is not exposed')
      const properties = search.inputSchema?.properties ?? {}
      const key = Object.hasOwn(properties, 'query') ? 'query'
        : Object.hasOwn(properties, 'q') ? 'q'
          : Object.hasOwn(properties, 'search_query') ? 'search_query' : 'query'
      return client.callTool({ name: search.name, arguments: { [key]: 'FreeCode MCP smoke' } })
    },
  })
  await probeHarnessIntegration()
} finally {
  try { rmSync(scratch, { recursive: true, force: true }) } catch { /* best effort */ }
}
