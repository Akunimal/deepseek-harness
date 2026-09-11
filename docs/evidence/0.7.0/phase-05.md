# Phase 05 Evidence — Git Resolver + Sandbox Diagnostics

Date: 2026-09-10
Commit: 64c6bbc66e
Windows: 11 x64

## Scope
Deterministic Git resolution, structured error classification, sandbox diagnostics.

## Files
- apps/shell/src/git/git-resolver.ts (396 lines after bug fixes)
- apps/shell/src/sandbox/sandbox-diagnostics.ts (195 lines)
- apps/shell/tests/git-resolver.test.ts (10 tests)
- apps/shell/tests/sandbox-diagnostics.test.ts (8 tests, created in bug audit)

## Bug fixes applied (2026-09-10)
1. Removed `as never` type-safety hole in resolveGitPath error throw
2. Removed dead code `ENV_CACHE_KEY` constant

## Tests
```
npx vitest run apps/shell/tests/git-resolver.test.ts
→ 10/10 PASS

npx vitest run apps/shell/tests/sandbox-diagnostics.test.ts
→ 8/8 PASS

node scripts/verify-offline-mcp.mjs
→ 12/12 PASS
```

## Error classes verified
- executable-not-found: resolveGitPath throws on empty PATH
- not-a-repository: validateGit in temp dir
- sandbox-denied: permission denied stderr
- network-denied: could not resolve host
- timeout: timed out stderr
- git-failed: generic fallback

## Commit
```
64c6bbc66e build(0.7.0): phases 4+5 — lifecycle serialization, git resolver, sandbox diagnostics
```
