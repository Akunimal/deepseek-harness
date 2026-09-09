/** FreeCode product-managed MCP catalog settings. */

import { useEffect, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './PluginsSettingsSection.module.css'

type McpRuntimeState = 'disabled' | 'starting' | 'ready' | 'degraded' | 'failed'

interface McpServer {
  id: string
  serverName: string
  transport: 'stdio' | 'streamable-http'
  command: string
  args: string[]
  cwd: string
  enabled: boolean
  runtime?: {
    serverId: string
    state: McpRuntimeState
    toolCount: number
    error?: string
  }
}

interface McpState {
  configPath: string
  servers: McpServer[]
}

interface FreeCodeBridge {
  mcp: {
    getState(): Promise<McpState>
    setEnabled(id: string, enabled: boolean): Promise<McpState>
    openConfig(): Promise<void>
    onStatus(cb: (status: NonNullable<McpServer['runtime']>) => void): () => void
  }
}

function freeCodeBridge(): FreeCodeBridge | undefined {
  return (globalThis as typeof globalThis & { freecode?: FreeCodeBridge }).freecode
}

function serverLabel(id: string): string {
  if (id === 'serena') return 'Serena'
  if (id === 'free-search') return 'Free web search'
  return id
}

export type McpSettingsTabProps = PropsRuntime<'settings.plugins.tab'> & PropsLocale<'settings.plugins'>

function runtimeLabel(t: McpSettingsTabProps['t'], state: McpRuntimeState): string {
  switch (state) {
    case 'ready': return t('mcpStatusReady')
    case 'degraded': return t('mcpStatusDegraded')
    case 'failed': return t('mcpStatusFailed')
    case 'disabled': return t('mcpStatusDisabled')
    default: return t('mcpStatusStarting')
  }
}

export function McpSettingsTab({ t }: McpSettingsTabProps) {
  const [state, setState] = useState<McpState>()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState(false)

  const load = () => {
    const mcp = freeCodeBridge()?.mcp
    if (mcp === undefined) {
      setLoading(false)
      setError(true)
      return
    }
    setLoading(true)
    void mcp.getState().then((next) => {
      setState(next)
      setError(false)
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    const mcp = freeCodeBridge()?.mcp
    if (mcp === undefined) return undefined
    return mcp.onStatus((status) => {
      setState((current) => current === undefined ? current : {
        ...current,
        servers: current.servers.map((server) => server.id === status.serverId
          ? { ...server, runtime: status }
          : server),
      })
    })
  }, [])

  const toggle = (server: McpServer) => {
    const mcp = freeCodeBridge()?.mcp
    if (mcp === undefined) return
    setBusy(server.id)
    void mcp.setEnabled(server.id, !server.enabled).then(setState).catch(() => setError(true)).finally(() => setBusy(undefined))
  }

  return (
    <div className={css.mcpPanel}>
      <div>
        <h3 className={css.mcpHeading}>{t('mcpTitle')}</h3>
        <p className={css.mcpDescription}>{t('mcpDescription')}</p>
      </div>
      {loading ? <p className={css.empty}>{t('mcpLoading')}</p> : error ? (
        <div className={css.mcpError}>
          <p>{t('mcpUnavailable')}</p>
          <button type="button" onClick={load}>{t('mcpRetry')}</button>
        </div>
      ) : (
        <>
          <ul className={css.mcpRows}>
            {(state?.servers ?? []).map((server) => (
              <li className={css.mcpRow} key={server.id}>
                <div className={css.mcpMeta}>
                  <strong>{serverLabel(server.id)}</strong>
                  <span>{server.enabled ? t('mcpEnabled') : t('mcpDisabled')}</span>
                  {server.runtime !== undefined ? (
                    <span>
                      {runtimeLabel(t, server.runtime.state)} · {server.runtime.toolCount} {t('mcpTools')}
                    </span>
                  ) : null}
                  {server.runtime?.error !== undefined ? <small>{server.runtime.error}</small> : null}
                  <code>{server.command} {server.args.join(' ')}</code>
                </div>
                <button
                  type="button"
                  className={css.mcpToggle}
                  aria-pressed={server.enabled}
                  disabled={busy !== undefined}
                  onClick={() => toggle(server)}
                >
                  {server.enabled ? t('mcpDisable') : t('mcpEnable')}
                </button>
              </li>
            ))}
          </ul>
          <div className={css.mcpActions}>
            <button type="button" onClick={() => void freeCodeBridge()?.mcp.openConfig()}>{t('mcpOpenConfig')}</button>
            <button type="button" onClick={load}>{t('mcpRefresh')}</button>
          </div>
          {state?.configPath !== undefined ? <code className={css.mcpPath}>{state.configPath}</code> : null}
        </>
      )}
    </div>
  )
}
