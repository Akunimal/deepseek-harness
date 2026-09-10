#!/usr/bin/env node

/**
 * windows-window-trace.mjs — Post-launch Win32 diagnostic trace.
 *
 * Usage:
 *   node scripts/windows-window-trace.mjs [--pid <PID>] [--output <path>]
 *
 * When called with --pid, inspects the given process tree.
 * When called without --pid, captures a global snapshot of the current user's
 * session and looks for visible windows, leaked handles, and stale state.
 *
 * Returns: JSON report to stdout (machine-readable) or exits 0 with PASS/FAIL.
 * Exit codes: 0 = all checks pass, 1 = at least one failure, 2 = bad arguments.
 */

import { execSync, spawnSync } from 'node:child_process'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

// ── Args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const pid = getArg('--pid')
const targetPid = pid ? Number(pid) : null
const outputPath = getArg('--output')

function getArg(flag) {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null
}

// ── Helpers ──────────────────────────────────────────────────────────
const HIDDEN = { windowsHide: true, shell: false, encoding: 'utf8' }

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { ...HIDDEN, ...opts, timeout: 15_000 }).toString().trim()
  } catch {
    return null
  }
}

function runJson(cmd) {
  const out = run(cmd)
  if (!out) return null
  try { return JSON.parse(out) } catch { return null }
}

// ── Check 1: Visible windows in current session ──────────────────────
function checkVisibleWindows(targetPid) {
  const results = []
  // PowerShell: enumerate windows for target PID(s)
  const script = targetPid
    ? `Get-Process -Id ${targetPid} -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,MainWindowTitle,MainWindowHandle | ConvertTo-Json -Compress`
    : `Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' } | Select-Object Id,ProcessName,MainWindowTitle,MainWindowHandle | ConvertTo-Json -Compress`

  const raw = run(`powershell.exe -NoProfile -Command "${script.replace(/"/g, '\\"')}"`)
  if (!raw) return results

  let procs
  try {
    procs = JSON.parse(raw)
    if (!Array.isArray(procs)) procs = [procs]
  } catch {
    return results
  }

  // In global mode, only flag DSH-related processes (not all windows)
  const DSH_PROCESS_NAMES = /node|opencode|dsh|tesseract|tor|uvx|uv\.exe|free-search|serena|python.*mcp/i

  for (const p of procs) {
    if (p.MainWindowHandle && p.MainWindowHandle !== '0' && p.MainWindowTitle) {
      const isDsh = targetPid ? true : DSH_PROCESS_NAMES.test(p.ProcessName)
      if (isDsh) {
        results.push({
          check: 'visible-window',
          status: 'FAIL',
          pid: p.Id,
          processName: p.ProcessName,
          windowTitle: p.MainWindowTitle,
          handle: p.MainWindowHandle,
          message: `Process ${p.ProcessName} (PID ${p.Id}) has visible window: "${p.MainWindowTitle}"`,
        })
      }
    }
  }
  return results
}

// ── Check 2: Window station handles ──────────────────────────────────
function checkWindowStationHandles(targetPid) {
  const results = []
  if (!targetPid) return results

  // Use handle.exe if available (Sysinternals), otherwise skip
  const handlePath = run('where handle.exe')
  if (!handlePath) {
    results.push({
      check: 'window-station-handles',
      status: 'SKIP',
      message: 'handle.exe not in PATH — install Sysinternals to enable this check',
    })
    return results
  }

  const output = run(`handle.exe -p ${targetPid} -a`)
  if (!output) return results

  const windowStationLines = output.split('\n').filter(l =>
    /WinSta|WinStation|Interactive\s*Window/i.test(l)
  )

  if (windowStationLines.length > 0) {
    results.push({
      check: 'window-station-handles',
      status: 'FAIL',
      pid: targetPid,
      count: windowStationLines.length,
      message: `PID ${targetPid} holds ${windowStationLines.length} window station handle(s)`,
      details: windowStationLines.slice(0, 5),
    })
  } else {
    results.push({
      check: 'window-station-handles',
      status: 'PASS',
      pid: targetPid,
      message: `PID ${targetPid} holds no window station handles`,
    })
  }
  return results
}

// ── Check 3: leaked console handles ──────────────────────────────────
function checkConsoleHandles(targetPid) {
  const results = []
  if (!targetPid) return results

  const output = run(`handle.exe -p ${targetPid} -a`)
  if (!output) return results

  const consoleLines = output.split('\n').filter(l =>
    /\\Console\\|\\Windows\\ErrorMode/i.test(l)
  )

  if (consoleLines.length > 0) {
    results.push({
      check: 'console-handles',
      status: 'WARN',
      pid: targetPid,
      count: consoleLines.length,
      message: `PID ${targetPid} holds ${consoleLines.length} console handle(s)`,
      details: consoleLines.slice(0, 5),
    })
  } else {
    results.push({
      check: 'console-handles',
      status: 'PASS',
      pid: targetPid,
      message: `PID ${targetPid} holds no console handles`,
    })
  }
  return results
}

// ── Check 4: Registry leaked console key ─────────────────────────────
function checkRegistryConsoleKey() {
  const results = []
  // Check for stale console registry entries from DSH-related processes
  const output = run('reg query "HKCU\\Console" /s')
  if (!output) return results

  // Count subkeys (each is a console window that was created)
  const subkeys = output.split('\n').filter(l => l.includes('HKCU\\Console\\'))
  if (subkeys.length > 20) {
    results.push({
      check: 'registry-console-keys',
      status: 'WARN',
      count: subkeys.length,
      message: `${subkeys.length} console registry subkeys — possible leak from untracked processes`,
    })
  } else {
    results.push({
      check: 'registry-console-keys',
      status: 'PASS',
      count: subkeys.length,
      message: `${subkeys.length} console registry subkeys (normal)`,
    })
  }
  return results
}

// ── Check 5: Terminal services session handles ───────────────────────
function checkTerminalServices() {
  const results = []
  const output = run('handle.exe WinStation')
  if (!output) {
    results.push({
      check: 'terminal-services',
      status: 'SKIP',
      message: 'handle.exe not available',
    })
    return results
  }

  const matches = output.split('\n').filter(l => /WinStation/i.test(l))
  // Look for our own session
  const sessionId = run('echo %SESSIONNAME%') ?? 'Console'
  const consoleMatches = matches.filter(l => sessionId.includes('Console') || /Console/i.test(l))

  if (consoleMatches.length > 10) {
    results.push({
      check: 'terminal-services',
      status: 'WARN',
      count: consoleMatches.length,
      message: `${consoleMatches.length} WinStation handles on ${sessionId}`,
    })
  } else {
    results.push({
      check: 'terminal-services',
      status: 'PASS',
      count: consoleMatches.length,
      message: `${consoleMatches.length} WinStation handles on ${sessionId} (normal)`,
    })
  }
  return results
}

// ── Check 6: Process tree visibility ─────────────────────────────────
function checkProcessTreeVisibility(targetPid) {
  const results = []
  if (!targetPid) return results

  // Check if process has a visible window via wmic
  const output = run(`wmic process where ProcessId=${targetPid} get Name,CommandLine /format:csv`)
  if (!output) return results

  const lines = output.split('\n').filter(l => l.trim())
  if (lines.length > 1) {
    const procInfo = lines[1]
    const hasWindow = /--window|--visible|--show|--console/i.test(procInfo)
    if (hasWindow) {
      results.push({
        check: 'process-tree-visibility',
        status: 'FAIL',
        pid: targetPid,
        message: `Process ${targetPid} appears to request a visible window`,
        details: procInfo.substring(0, 200),
      })
    } else {
      results.push({
        check: 'process-tree-visibility',
        status: 'PASS',
        pid: targetPid,
        message: `Process ${targetPid} has no visible window flags`,
      })
    }
  }
  return results
}

// ── Check 7: Stale reporter channel files ────────────────────────────
function checkReporterChannelFiles() {
  const results = []
  const tempDir = process.env.TEMP || process.env.TMP || 'C:\\Temp'
  const pattern = join(tempDir, 'reporter_channel_*')
  const listing = run(`dir "${pattern}" /b 2>nul`)
  if (listing) {
    const files = listing.split('\n').filter(l => l.trim())
    if (files.length > 0) {
      results.push({
        check: 'reporter-channel-files',
        status: 'WARN',
        count: files.length,
        message: `${files.length} stale reporter channel file(s) in TEMP`,
        details: files.slice(0, 5),
      })
    }
  }
  if (results.length === 0) {
    results.push({
      check: 'reporter-channel-files',
      status: 'PASS',
      message: 'No stale reporter channel files in TEMP',
    })
  }
  return results
}

// ── Main ─────────────────────────────────────────────────────────────
console.error(`[window-trace] Running Win32 window diagnostic${targetPid ? ` for PID ${targetPid}` : ' (global snapshot)'}...`)

const allChecks = [
  ...checkVisibleWindows(targetPid),
  ...checkWindowStationHandles(targetPid),
  ...checkConsoleHandles(targetPid),
  ...checkRegistryConsoleKey(),
  ...checkTerminalServices(),
  ...checkProcessTreeVisibility(targetPid),
  ...checkReporterChannelFiles(),
]

const passed = allChecks.filter(c => c.status === 'PASS').length
const failed = allChecks.filter(c => c.status === 'FAIL').length
const warned = allChecks.filter(c => c.status === 'WARN').length
const skipped = allChecks.filter(c => c.status === 'SKIP').length

const report = {
  timestamp: new Date().toISOString(),
  targetPid: targetPid ?? 'global',
  summary: { total: allChecks.length, passed, failed, warned, skipped },
  checks: allChecks,
}

const json = JSON.stringify(report, null, 2)

if (outputPath) {
  writeFileSync(outputPath, json)
  console.error(`[window-trace] Report written to ${outputPath}`)
} else {
  process.stdout.write(json + '\n')
}

// Summary
console.error(`\n[window-trace] Results: ${passed} PASS, ${failed} FAIL, ${warned} WARN, ${skipped} SKIP`)
if (failed > 0) {
  console.error('[window-trace] ✗ FAIL — visible windows or leaked handles detected')
  process.exit(1)
} else if (warned > 0) {
  console.error('[window-trace] ⚠ WARN — non-critical issues detected')
  process.exit(0)
} else {
  console.error('[window-trace] ✓ ALL PASS')
  process.exit(0)
}
