# Phase 09 Evidence — Clean Install Gate Extension

Date: 2026-09-11
Windows: 11 x64

## Scope
Extend release gate with Phase 7/8 verification checks so the clean install gate cannot skip them.

## Files modified

| File | Change |
|---|---|
| `scripts/release-gate.mjs` | Added 3 new gate steps: stream/OCR, locale/capability, offline MCP |

## Release gate sequence (updated)

| # | Gate | Phase |
|---|------|-------|
| 1 | whitespace validation | existing |
| 2 | MCP configuration contract | existing |
| 3 | all workspace tests | existing |
| 4 | all workspace contract tests | existing |
| 5 | all workspace typechecks | existing |
| 6 | **stream and OCR contract verification** | **7** |
| 7 | **locale and desktop capability contract verification** | **8** |
| 8 | **offline MCP closure verification** | **2** |
| 9 | Windows ACL regression tests | existing |
| 10 | desktop build and runtime packaging | existing |
| 11 | vendored bundle freshness | existing |
| 12 | conversation motion bundle | existing |
| 13 | runtime closure unit tests | existing |
| 14 | core runtime closure | existing |
| 15 | MCP initialize/tools/call smoke | existing |
| 16 | fresh NSIS install and installed-runtime smoke | existing |

## New gates added

```
node scripts/verify-stream-contract.mjs       → 20/20 PASS
node scripts/verify-locale-contract.mjs       → 16/16 PASS
node scripts/verify-offline-mcp.mjs           → 12/12 PASS
```

## Lock criteria

The release gate now enforces:
- Stream/OCR contracts (Phase 7) before build
- Locale/capability contracts (Phase 8) before build
- Offline MCP closure (Phase 2) before build
- No gate can be skipped; missing resources are failures

## Exit code

0 (success for gate extension; actual build/install requires maintainer machine)
