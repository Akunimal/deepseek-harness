# Phase 0 evidence — 2026-09-10

## Commit under test
- SHA: `45423872af` (HEAD, main)
- Message: `docs: align release docs and define 0.7.0 remediation`
- Branch: main

## Tests run

### 1. MCP config contract
```bash
node --test scripts/mcp-config.test.mjs
```
- Exit: 0
- Result: 3/3 pass (defaults installed, patch preserves overlays, enable flags mutable only)

### 2. Stale-claim check
```bash
node scripts/verify-doc-stale-claims.mjs
```
- Exit: 0
- Scanned: README.md, README.es.md, docs/RELEASE.md, docs/RELEASE.es.md
- Patterns: 9 rules (fully-self-contained, absent-executable-bundled, uvx-bundled, polling-proves-zero-windows, zero-windows-claimed, old-version-current, gemini-present, independent-lsp-present, window-probe-sufficient)
- Result: ✅ No stale claims found

### 3. Whitespace / diff check
```bash
git diff --check
```
- Exit: 0
- Result: clean

### 4. Regex inspection for stale version references
```bash
rg -n "v0\.2\.2|fully self-contained|RTK.*optional|0\.6\.0.*LOCKED" README.md README.es.md docs/RELEASE.md docs/RELEASE.es.md
```
- Matches found:
  - `README.md:34` — "must not be described as fully self-contained" (negated, correct)
  - `docs/RELEASE.md:21` — "Do not describe the published artifact as fully self-contained" (negated, correct)
- Both are prohibitions, not positive claims. No historical v0.2.2 or RTK-optional claims in current docs.

## Documentation alignment check

| Claim | README.md | README.es.md | RELEASE.md | RELEASE.es.md |
|-------|-----------|--------------|------------|---------------|
| 0.6.0 is baseline Windows x64 | ✅ | ✅ | ✅ | ✅ |
| 0.4.3 is recovery reference only | ✅ | ✅ | ✅ | ✅ |
| Linux/macOS untested manual | ✅ | ✅ | ✅ | ✅ |
| RTK not in 0.6.0 payload | ✅ | ✅ | ✅ | ✅ |
| MCP bootstrap external | ✅ | ✅ | ✅ | ✅ |
| Spanish/windows/Git/stream open | ✅ | ✅ | ✅ | ✅ |
| Upstream-first + ordered patches | ✅ | ✅ | ✅ | ✅ |
| 0.7.0 roadmap/state links | ✅ | ✅ | ✅ | ✅ |
| No v0.2.2 as current | ✅ | ✅ | ✅ | ✅ |
| Not fully self-contained | ✅ | ✅ | ✅ | ✅ |

## Evidence files
- `docs/evidence/0.7.0/phase-00/` — this file
- `scripts/verify-doc-stale-claims.mjs` — new stale-claim gate script

## Conclusion
Phase 0 lock criteria met: both README files and both release guides agree on
the same 0.6.0 baseline, 0.4.3 recovery reference, open gates, 0.7.0 links,
and contain no contradictory current claims. The stale-claim check script is
created and passes. `git diff --check` is clean.
