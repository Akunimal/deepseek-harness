# Phase 06 — Evidence

**Date:** 2026-09-10
**Commit under test:** ab325ca5457ec1b1c5016db85ca22eb89c9ef8a4
**Branch:** main

## Scope

Harden MCP readiness contracts, RTK/Caveman packaged resolution, and tool call classification.

## Files created

| File | Purpose |
|---|---|
| `apps/shell/src/main/mcp-readiness.ts` | MCP readiness contract tracker — ring buffer, tool roster, call stats |
| `apps/shell/src/main/caveman-resolver.ts` | Packaged binary resolution for RTK and Caveman with caching |
| `apps/shell/tests/mcp-readiness.test.ts` | 11 tests for McpReadinessTracker |
| `apps/shell/tests/caveman-resolver.test.ts` | 7 tests for caveman-resolver |

## Files modified

| File | Change |
|---|---|
| `scripts/verify-offline-mcp.mjs` | Added CHECK 6–9 (mcp-readiness exports, caveman-resolver exports, no LSP entries, PATH-only notes) |
| `docs/STATE-0.7.0.md` | Phase 6 row: PLANNED → VERIFIED |

## Test results

```
npx vitest run apps/shell/tests/mcp-readiness.test.ts apps/shell/tests/caveman-resolver.test.ts apps/shell/tests/mcp-home.test.ts
```

- apps/shell/tests/mcp-home.test.ts: 5 tests passed
- apps/shell/tests/mcp-readiness.test.ts: 11 tests passed
- apps/shell/tests/caveman-resolver.test.ts: 7 tests passed
- **Total: 23 passed, 0 failed**

## Verification results

```
node scripts/verify-offline-mcp.mjs
```

- 12/12 checks passed
- Exit code: 0
- All new checks (mcp-readiness-exports, caveman-resolver-exports, mcp-home-no-lsp-entries, runtime-deps-path-only-notes) PASS

## Exit code

0 (success)
