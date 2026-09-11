/**
 * mcp-readiness.ts — MCP readiness contract tracker.
 *
 * Records every MCP call with structured metadata, tracks tool registration
 * per server, and provides aggregate stats for the Settings → Plugins → MCP
 * status pane. All string fields are bounded to 1024 chars to prevent
 * unbounded growth from malformed server responses.
 */

// ── Constants ────────────────────────────────────────────────────────
const MAX_STRING_LENGTH = 1024
const RING_BUFFER_MAX = 500

// ── Types ────────────────────────────────────────────────────────────

export type McpCallStatus = 'success' | 'failed' | 'timeout' | 'cancelled'

export interface McpCallRecord {
  requestId: string
  serverId: string
  toolName: string | null
  attempt: number
  status: McpCallStatus
  startTime: number
  durationMs: number
  error?: string
}

// ── Helpers ──────────────────────────────────────────────────────────

function trimString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) return value
  return value.slice(0, MAX_STRING_LENGTH)
}

function trimCallRecord(record: McpCallRecord): McpCallRecord {
  return {
    requestId: trimString(record.requestId),
    serverId: trimString(record.serverId),
    toolName: record.toolName != null ? trimString(record.toolName) : null,
    attempt: record.attempt,
    status: record.status,
    startTime: record.startTime,
    durationMs: record.durationMs,
    error: record.error != null ? trimString(record.error) : undefined,
  }
}

// ── Class ────────────────────────────────────────────────────────────

export class McpReadinessTracker {
  private calls: McpCallRecord[] = []
  private toolRosters: Map<string, string[]> = new Map()

  /** Record a call in the ring buffer (max 500). */
  recordCall(record: McpCallRecord): void {
    this.calls.push(trimCallRecord(record))
    if (this.calls.length > RING_BUFFER_MAX) {
      this.calls.shift()
    }
  }

  /** Get all recorded calls, optionally filtered by serverId. */
  getCalls(serverId?: string): McpCallRecord[] {
    if (serverId == null) return [...this.calls]
    return this.calls.filter(c => c.serverId === serverId)
  }

  /** Get the most recent call for a given server, or null if none. */
  getLastCall(serverId: string): McpCallRecord | null {
    for (let i = this.calls.length - 1; i >= 0; i--) {
      const call = this.calls[i]
      if (call && call.serverId === serverId) return call
    }
    return null
  }

  /** Register a tool name for a server. Duplicates are ignored. */
  registerTool(serverId: string, toolName: string): void {
    const trimmedServer = trimString(serverId)
    const trimmedTool = trimString(toolName)
    const roster = this.toolRosters.get(trimmedServer) ?? []
    if (!roster.includes(trimmedTool)) {
      roster.push(trimmedTool)
      this.toolRosters.set(trimmedServer, roster)
    }
  }

  /** Check whether a tool is registered for a server. */
  isToolRegistered(serverId: string, toolName: string): boolean {
    const roster = this.toolRosters.get(trimString(serverId))
    if (!roster) return false
    return roster.includes(trimString(toolName))
  }

  /** Get all registered tools for a server (readonly snapshot). */
  getToolRoster(serverId: string): readonly string[] {
    return this.toolRosters.get(trimString(serverId)) ?? []
  }

  /** Clear all calls and tool roster for a server (on reconnect). */
  resetServer(serverId: string): void {
    const trimmed = trimString(serverId)
    this.calls = this.calls.filter(c => c.serverId !== trimmed)
    this.toolRosters.delete(trimmed)
  }

  /** Aggregate call stats for a server. */
  getCallStats(serverId: string): {
    total: number
    success: number
    failed: number
    avgDurationMs: number
  } {
    const filtered = this.calls.filter(c => c.serverId === serverId)
    const total = filtered.length
    if (total === 0) {
      return { total: 0, success: 0, failed: 0, avgDurationMs: 0 }
    }
    const success = filtered.filter(c => c.status === 'success').length
    const failed = filtered.filter(
      c => c.status === 'failed' || c.status === 'timeout' || c.status === 'cancelled',
    ).length
    const totalDuration = filtered.reduce((sum, c) => sum + c.durationMs, 0)
    return {
      total,
      success,
      failed,
      avgDurationMs: Math.round(totalDuration / total),
    }
  }
}
