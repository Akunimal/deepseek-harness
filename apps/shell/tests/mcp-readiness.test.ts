import { describe, expect, it, beforeEach } from 'vitest'
import {
  McpReadinessTracker,
  type McpCallRecord,
} from '../src/main/mcp-readiness.js'

function makeCall(overrides: Partial<McpCallRecord> = {}): McpCallRecord {
  return {
    requestId: 'req-1',
    serverId: 'serena',
    toolName: 'find_symbol',
    attempt: 1,
    status: 'success',
    startTime: Date.now(),
    durationMs: 42,
    ...overrides,
  }
}

describe('McpReadinessTracker', () => {
  let tracker: McpReadinessTracker

  beforeEach(() => {
    tracker = new McpReadinessTracker()
  })

  it('records and retrieves a single call', () => {
    const record = makeCall()
    tracker.recordCall(record)
    const calls = tracker.getCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0]!.requestId).toBe('req-1')
    expect(calls[0]!.status).toBe('success')
  })

  it('filters calls by serverId', () => {
    tracker.recordCall(makeCall({ serverId: 'serena' }))
    tracker.recordCall(makeCall({ requestId: 'req-2', serverId: 'free-search' }))
    tracker.recordCall(makeCall({ requestId: 'req-3', serverId: 'serena' }))

    const serenaCalls = tracker.getCalls('serena')
    expect(serenaCalls).toHaveLength(2)
    expect(serenaCalls.every(c => c.serverId === 'serena')).toBe(true)

    const freeSearchCalls = tracker.getCalls('free-search')
    expect(freeSearchCalls).toHaveLength(1)
  })

  it('returns last call for a server', () => {
    tracker.recordCall(makeCall({ requestId: 'req-1', startTime: 100 }))
    tracker.recordCall(makeCall({ requestId: 'req-2', startTime: 200 }))

    const last = tracker.getLastCall('serena')
    expect(last).not.toBeNull()
    expect(last!.requestId).toBe('req-2')

    expect(tracker.getLastCall('nonexistent')).toBeNull()
  })

  it('registers and queries tool roster', () => {
    tracker.registerTool('serena', 'find_symbol')
    tracker.registerTool('serena', 'read_file')
    tracker.registerTool('free-search', 'web_search')

    expect(tracker.isToolRegistered('serena', 'find_symbol')).toBe(true)
    expect(tracker.isToolRegistered('serena', 'read_file')).toBe(true)
    expect(tracker.isToolRegistered('serena', 'web_search')).toBe(false)
    expect(tracker.isToolRegistered('free-search', 'web_search')).toBe(true)

    const roster = tracker.getToolRoster('serena')
    expect(roster).toEqual(['find_symbol', 'read_file'])
  })

  it('deduplicates tool registrations', () => {
    tracker.registerTool('serena', 'find_symbol')
    tracker.registerTool('serena', 'find_symbol')
    expect(tracker.getToolRoster('serena')).toEqual(['find_symbol'])
  })

  it('resets server clears calls and roster', () => {
    tracker.recordCall(makeCall({ serverId: 'serena' }))
    tracker.recordCall(makeCall({ requestId: 'req-2', serverId: 'free-search' }))
    tracker.registerTool('serena', 'find_symbol')

    tracker.resetServer('serena')

    expect(tracker.getCalls('serena')).toHaveLength(0)
    expect(tracker.getCalls('free-search')).toHaveLength(1)
    expect(tracker.isToolRegistered('serena', 'find_symbol')).toBe(false)
  })

  it('computes correct call stats', () => {
    tracker.recordCall(makeCall({ status: 'success', durationMs: 100 }))
    tracker.recordCall(makeCall({ requestId: 'req-2', status: 'success', durationMs: 200 }))
    tracker.recordCall(makeCall({ requestId: 'req-3', status: 'failed', durationMs: 50 }))
    tracker.recordCall(makeCall({ requestId: 'req-4', status: 'timeout', durationMs: 5000 }))

    const stats = tracker.getCallStats('serena')
    expect(stats.total).toBe(4)
    expect(stats.success).toBe(2)
    expect(stats.failed).toBe(2) // failed + timeout
    expect(stats.avgDurationMs).toBe(Math.round((100 + 200 + 50 + 5000) / 4))
  })

  it('returns zero stats for unknown server', () => {
    const stats = tracker.getCallStats('nonexistent')
    expect(stats).toEqual({ total: 0, success: 0, failed: 0, avgDurationMs: 0 })
  })

  it('caps ring buffer at 500 entries', () => {
    for (let i = 0; i < 600; i++) {
      tracker.recordCall(makeCall({ requestId: `req-${i}`, startTime: i }))
    }
    const calls = tracker.getCalls()
    expect(calls).toHaveLength(500)
    // First recorded should be dropped; oldest remaining is req-100
    expect(calls[0]!.requestId).toBe('req-100')
  })

  it('truncates long strings to 1024 chars', () => {
    const longString = 'x'.repeat(2000)
    const record = makeCall({ requestId: longString, error: longString })
    tracker.recordCall(record)

    const calls = tracker.getCalls()
    expect(calls[0]!.requestId.length).toBe(1024)
    expect(calls[0]!.error!.length).toBe(1024)
  })

  it('preserves null toolName correctly', () => {
    tracker.recordCall(makeCall({ toolName: null }))
    const calls = tracker.getCalls()
    expect(calls[0]!.toolName).toBeNull()
  })
})
