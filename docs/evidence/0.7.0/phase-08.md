# Phase 08 Evidence — Spanish Locale and Desktop Capability Contracts

Date: 2026-09-11
Windows: 11 x64

## Scope
Restore Spanish desktop locale, lock desktop capability contracts, version bump to 0.7.0.

## Files created

| File | Purpose |
|---|---|
| `scripts/verify-locale-contract.mjs` | 16-check verification script for locale/capability invariants |
| `packages/contract-tests/tests/locale.contract.test.ts` | 15 tests: Spanish patch, shell i18n, About/version, reasoning, UI |

## Files modified

| File | Change |
|---|---|
| `apps/shell/package.json` | Version bumped from 0.6.0 to 0.7.0 |
| `package.json` | Version bumped from 0.6.0 to 0.7.0 |
| `patches/upstream/upstream-patches.json` | Patch 140 contractTests updated with locale.contract.test.ts |

## Verification results

```
node scripts/verify-locale-contract.mjs
→ 16/16 PASS
```

## Test results

```
npx vitest run packages/contract-tests/tests/locale.contract.test.ts
→ 15/15 PASS
```

## Locale contract checks (16)

| # | Check | Status |
|---|-------|--------|
| 1 | spanish-locale-file-exists | PASS |
| 2 | locale-ids-includes-es | PASS |
| 3 | spanish-metadata-registered | PASS |
| 4 | shell-i18n-three-locales | PASS |
| 5 | shell-i18n-es-strings | PASS |
| 6 | patch-140-registered | PASS |
| 7 | about-uses-get-version | PASS |
| 8 | version-is-070 | PASS |
| 9 | reasoning-hides-non-supporting | PASS |
| 10 | update-button-exists | PASS |
| 11 | dialog-bridge-exists | PASS |
| 12 | mcp-settings-tab-exists | PASS |
| 13 | caveman-settings-card-exists | PASS |
| 14 | preload-exposes-locale-set | PASS |
| 15 | ipc-validates-locale | PASS |
| 16 | locale-contract-tests-exist | PASS |

## Locale contract test coverage (15)

| Test | What it verifies |
|------|------------------|
| Spanish patch: es.ts exists | Vendor locale file present |
| Spanish patch: typed dictionary | CommonKey type exported |
| Spanish patch: LOCALE_IDS | zh, en, es all present |
| Spanish patch: metadata | es: { label: 'Español' } registered |
| Shell i18n: three locales | zh, en, es in type |
| Shell i18n: Spanish strings | ≥10 es: entries |
| Shell i18n: locale type | Type restricts to zh\|en\|es |
| About: getVersion | app.getVersion() used |
| Version: 0.7.0 | package.json version correct |
| Reasoning: hides non-supporting | supportsReasoningEffort: false |
| Reasoning: DeepSeek vocabulary | off/low/high/max present |
| UI: update button | renderUpdateIndicatorHtml + rotate(180) |
| UI: dialog bridge | dialog-bridge.ts exists |
| UI: MCP tab | McpSettingsTab.tsx exists |
| UI: Caveman card | BashCard.tsx exists |

## Exit code

0 (success)
