# Phase 04 Evidence — Lifecycle Serialization

Date: 2026-09-10
Commit: 64c6bbc66e
Windows: 11 x64

## Scope
Lifecycle manager: startup lock, child watchdog, health probe, SIGTERM shutdown, package.json singleton.

## Files
- apps/shell/src/main/lifecycle-manager.ts (382 lines)
- apps/shell/tests/lifecycle-manager.test.ts (195 lines, 27 tests)

## Tests
```
npx vitest run apps/shell/tests/lifecycle-manager.test.ts
→ 27/27 PASS
```

## Commit
```
64c6bbc66e build(0.7.0): phases 4+5 — lifecycle serialization, git resolver, sandbox diagnostics
```
