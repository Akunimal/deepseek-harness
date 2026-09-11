# Phase 04 Evidence — Lifecycle Serialization

Date: 2026-09-10
Commit: 64c6bbc66e
Windows: 11 x64

## Scope
Lifecycle manager: startup lock, generation tracking, health probe, graceful staged shutdown, package.json singleton, beginStartup guard.

## Files
- apps/shell/src/main/lifecycle-manager.ts (388 lines after bug fixes)
- apps/shell/tests/lifecycle-manager.test.ts (195 lines, 19 tests)

## Tests
```
npx vitest run apps/shell/tests/lifecycle-manager.test.ts
→ 19/19 PASS
```

## Bug fixes applied (2026-09-10)
1. Fixed timer leak in `gracefulShutdown`: `shutdownTimeout()` timers are now cleared via `clearShutdownTimer()` when the race settles, preventing unhandled rejections
2. Added guard in `beginStartup()`: returns false when state is 'stopping' or 'stopped', preventing race between shutdown and startup

## Commit
```
64c6bbc66e build(0.7.0): phases 4+5 — lifecycle serialization, git resolver, sandbox diagnostics
```
