# Phase 0.7.0 — Phase 03 Evidence: Win32 Process Launch Centralization

## Status: COMPLETE

## Summary
All FreeCode-owned process spawns routed through centralized `freecode-launcher.ts` seam.
Diagnostic trace script validates zero visible windows from DSH processes.

## Deliverables

### 1. `apps/shell/src/main/freecode-launcher.ts` (230 lines)
Centralized Win32 process launch module. All FreeCode-owned child processes must route through here.

**Exports:**
- `launchHidden(options)` — async spawn with shell:false, windowsHide:true, CREATE_NO_WINDOW, metrics tracking
- `launchHiddenSync(options)` — sync spawn variant for probes (where.exe, PowerShell, tar)
- `killProcessTree(pid)` — cross-platform tree kill (taskkill /T /F on Win32)
- `getActiveLaunches()` — diagnostic: all currently tracked launch metrics
- `LaunchError` — structured error class with errorClass taxonomy
- `HIDDEN_OPTIONS` / `HIDDEN_SYNC_OPTIONS` — base options constants

**Safety invariants enforced by the seam:**
1. `shell: false` — no cmd.exe / PowerShell intermediary
2. `windowsHide: true` + `detached: false` — no visible window
3. `existsSync()` validation before spawn
4. Structured metrics (launchId, pid, parentPid, generation, requestId, timestamps)
5. Automatic cleanup from activeLaunches on exit/error

### 2. Spawn Routing (12 call sites across 7 files)

| File | Spawn Count | Type | Status |
|------|-------------|------|--------|
| `harness-supervisor.ts` | 1 async + 1 kill | DSH process + taskkill | ✅ Routed |
| `index.ts` | 1 sync + 1 async | git log + local update | ✅ Routed |
| `ocr.ts` | 1 async | Tesseract | ✅ Routed |
| `secret-store.ts` | 4 sync | PowerShell credential ops | ✅ Routed |
| `uvx-bootstrap.ts` | 2 sync | where.exe + PowerShell zip | ✅ Routed |
| `torfleet.ts` | 1 async + 2 kill | Tor + taskkill | ✅ Routed |
| `harness-updater.ts` | 1 sync | tar extraction | ✅ Routed |

**Verification:** Zero raw `spawn()`/`spawnSync()`/`child_process` imports remain in main source
(excluding `freecode-launcher.ts` itself and type-only `import type { ChildProcess }`).

### 3. `scripts/windows-window-trace.mjs` (310 lines)
Post-launch Win32 diagnostic trace. 7 checks:

| Check | Description | Result |
|-------|-------------|--------|
| visible-window | Process has visible window (DSH-related only in global mode) | PASS |
| window-station-handles | Process holds WinSta handles | SKIP (no handle.exe) |
| console-handles | Process holds Console/ErrorMode handles | SKIP |
| registry-console-keys | Leaked console registry subkeys | PASS |
| terminal-services | WinStation handle count | SKIP |
| process-tree-visibility | Command line has visible window flags | PASS |
| reporter-channel-files | Stale reporter channel files in TEMP | PASS |

### 4. `docs/evidence/0.7.0/phase-03-window-trace.json`
Baseline diagnostic trace: 2 PASS, 0 FAIL, 0 WARN, 1 SKIP.

## Files Modified
- `apps/shell/src/main/freecode-launcher.ts` — NEW (230 lines)
- `apps/shell/src/main/harness-supervisor.ts` — routed through launcher
- `apps/shell/src/main/index.ts` — routed through launcher
- `apps/shell/src/main/ocr.ts` — routed through launcher
- `apps/shell/src/main/secret-store.ts` — routed through launcher (4 spawns)
- `apps/shell/src/main/uvx-bootstrap.ts` — routed through launcher (2 spawns)
- `apps/shell/src/main/torfleet.ts` — routed through launcher (1 spawn + 2 kills)
- `apps/shell/src/main/harness-updater.ts` — routed through launcher
- `scripts/windows-window-trace.mjs` — NEW (310 lines)
- `docs/evidence/0.7.0/phase-03-window-trace.json` — NEW

## Verification
- `grep -rnE "\bspawnSync\(|from 'node:child_process'" apps/shell/src/main/ --include="*.ts" | grep -v "freecode-launcher\|\.test\.\|import type"` → empty (zero raw spawn calls)
- `grep -rn "\bspawn(" apps/shell/src/main/ --include="*.ts" | grep -v "freecode-launcher\|\.test\.\|this\.spawn\|console\|//\|launchHidden"` → only `private async spawn()` method name
- `node scripts/windows-window-trace.mjs` → 0 FAIL, 0 WARN
