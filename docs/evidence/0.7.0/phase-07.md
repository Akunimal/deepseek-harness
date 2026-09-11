# Phase 07 Evidence — Provider Streams, Tool-Call Continuation and OCR Boundaries

Date: 2026-09-11
Windows: 11 x64

## Scope
Harden provider stream handling, verify tool-call continuation, and validate OCR boundaries.

## Files created

| File | Purpose |
|---|---|
| `scripts/verify-stream-contract.mjs` | 20-check verification script for stream/OCR/retry invariants |
| `packages/contract-tests/tests/stream.contract.test.ts` | 10 tests: SSE parser + translate behavior |
| `packages/contract-tests/tests/ocr.contract.test.ts` | 12 tests: OCR extraction, caching, validation, constants |

## Verification results

```
node scripts/verify-stream-contract.mjs
→ 20/20 PASS
```

## Test results

```
npx vitest run packages/contract-tests/tests/stream.contract.test.ts
→ 10/10 PASS

npx vitest run packages/contract-tests/tests/ocr.contract.test.ts
→ 12/12 PASS

npx vitest run apps/shell/tests/lifecycle-manager.test.ts apps/shell/tests/git-resolver.test.ts apps/shell/tests/sandbox-diagnostics.test.ts apps/shell/tests/mcp-readiness.test.ts apps/shell/tests/caveman-resolver.test.ts apps/shell/tests/mcp-home.test.ts
→ 61/61 PASS (phases 4-6 regression check)
```

## Stream contract checks (20)

| # | Check | Status |
|---|-------|--------|
| 1 | sse-parser-throws-on-truncation | PASS |
| 2 | translate-empty-response-maps-to-error | PASS |
| 3 | translate-tool-calls-mapping | PASS |
| 4 | pi-ai-stream-handles-exhaustion | PASS |
| 5 | pi-ai-stream-handles-error-event | PASS |
| 6 | ocr-absolute-path-only | PASS |
| 7 | ocr-size-limits | PASS |
| 8 | ocr-timeout-enforced | PASS |
| 9 | ocr-language-allowlist | PASS |
| 10 | ocr-psm-range-check | PASS |
| 11 | ocr-no-shell-execution | PASS |
| 12 | ocr-hash-cache-exists | PASS |
| 13 | retry-policy-bounded | PASS |
| 14 | retry-covers-empty-response | PASS |
| 15 | error-class-has-code | PASS |
| 16 | lb-retry-bounded | PASS |
| 17 | lb-post-commit-no-retry | PASS |
| 18 | ocr-ipc-no-binary-path | PASS |
| 19 | stream-contract-tests-exist | PASS |
| 20 | ocr-contract-tests-exist | PASS |

## Stream contract test coverage

| Test | What it verifies |
|------|------------------|
| SSE: yields data + [DONE] | parseSse correctly yields payloads and sentinel |
| SSE: throws on truncation | Missing [DONE] → error with message |
| SSE: throws on empty stream | Empty stream → error |
| SSE: multi-line data fields | Multiple events parsed correctly |
| translate: normal text stream | block-start, text-delta, block-end, finish |
| translate: tool_calls mapping | finish_reason=tool_calls → {kind: "tool-calls"} |
| translate: empty response → error | stop + no blocks → EMPTY_RESPONSE error |
| translate: malformed JSON | Invalid payload → error |
| translate: reasoning + text | Interleaving opens two block types |
| translate: usage tracking | Usage chunk extracted from finish |

## OCR contract test coverage

| Test | What it verifies |
|------|------------------|
| constants: max image 25MB | OCR_MAX_IMAGE_BYTES correct |
| constants: max output 256KB | OCR_MAX_OUTPUT_BYTES correct |
| constants: timeout 30s | OCR_TIMEOUT_MS correct |
| constants: cache 64 entries | OCR_MAX_CACHE_ENTRIES correct |
| extraction: correct CLI args | Runner receives [image, stdout, --psm, -l] |
| extraction: caching | Second call with same image hits cache |
| extraction: no cache on failure | Failed extraction not cached |
| extraction: trims whitespace | Output trimmed before return |
| extraction: rejects empty output | Empty OCR → error |
| extraction: propagates errors | Runner error propagated to caller |
| validation: rejects non-existent | Missing image → error |
| validation: rejects oversized | >25MB image → error |

## Exit code

0 (success)
