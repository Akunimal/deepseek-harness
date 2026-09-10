# Phase 1 evidence — 2026-09-10

## Commit under test
- SHA: 30172eec9d (pre-phase-1 baseline)
- Branch: main (direct, no codex/ branch)

## Windows environment
- OS: Windows 11
- Node: v24.12.0
- pnpm: available via pnpm.cmd

## Commands and results

### 1. apply-upstream-patches.mjs (run 1)
```
node scripts/apply-upstream-patches.mjs
```
- Exit: 0
- Result: 15 patches declared, 0 applied (all already applied), 0 failed
- Spanish locale patch (140) was already applied from prior direct edits

### 2. apply-upstream-patches.mjs (run 2 — idempotency)
```
node scripts/apply-upstream-patches.mjs
```
- Exit: 0
- Result: 15 patches declared, 0 applied, 15 already applied, 0 failed
- Idempotency confirmed

### 3. verify-upstream-patch-stack.mjs
```
node scripts/verify-upstream-patch-stack.mjs
```
- Exit: 0
- All checks PASS:
  - manifestValid: true
  - orderMonotonic: true
  - vendorOnly: true
  - noUnknownFiles: true
  - noMissingFiles: true
  - idempotent: true
  - replayClean: true
  - whitespaceClean: true
- 15 patches, 61 paths touched, upstream v0.1.3-alpha.1

### 4. Shell tests (i18n)
```
pnpm -r --filter "./apps/shell" test
```
- Exit: 1 (pre-existing updater.test.ts tar failure, unrelated)
- i18n.test.ts: 3/3 PASS
- All other shell tests: PASS

### 5. MCP config test
```
node --test scripts/mcp-config.test.mjs
```
- Exit: 0, 3/3 PASS

### 6. git diff --check
- Exit: 0, clean

## New files created
- `patches/upstream/upstream-patches.json` — machine-readable manifest
- `patches/upstream/140-freecode-spanish-locale.patch` — Spanish locale patch
- `scripts/verify-upstream-patch-stack.mjs` — verification script

## Modified files
- `scripts/apply-upstream-patches.mjs` — rewritten with manifest validation
- `docs/UPSTREAM-PATCHING.md` — documented manifest and Spanish patch

## Known issues
- `updater.test.ts` has a pre-existing `tar` exit code 2 failure on Windows
  (unrelated to Phase 1 changes)
- The Spanish locale patch adds es to the web client upstream; the shell-side
  i18n was already complete
