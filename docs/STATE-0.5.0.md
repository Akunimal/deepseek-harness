# FreeCode 0.5.0 state ledger

Last updated: 2026-09-09, after `pnpm release:gate` exited 0.

This is the persistent evidence ledger for the Windows-only 0.5.0
anti-regression release. `0.4.3` is the last operational reference because it
opens successfully. It is not the source of truth for this worktree and does
not certify that the current code is complete; it may lack fixes implemented
here.

## State vocabulary

- `BROKEN` — a failure is reproduced and still open.
- `UNVERIFIED` — there is not enough runtime or packaged evidence yet.
- `VERIFIED` — the focused contract or runtime check passes.
- `LOCKED` — verified and frozen; change only after reproducing a new
  regression.
- `OUT_OF_SCOPE` — intentionally excluded from the Windows 0.5.0 release.

## Final ledger

Every entry records the symptom or scope, evidence, affected files, validating
test, latest verification and the reason that could unlock a locked result.

### Reference, version and recovery

**0.4.3 startup — `VERIFIED` (reference only)**

- Symptom/scope: 0.4.3 opens and is the recovery reference; it is not a
  compatibility or completeness guarantee for 0.5.0.
- Evidence: the release plan and recovery copy consistently identify 0.4.3 as
  the last stable operational version.
- Affected files: `apps/shell/src/main/i18n.ts`, `docs/ROADMAP-0.5.0.md`,
  `README.md`, `README.es.md`.
- Test: recovery-copy assertions in the shell/contract suites.
- Last verification: `pnpm release:gate`, 2026-09-09.
- Unlock reason: none for the reference; a new 0.4.3 observation would not
  change the 0.5.0 source of truth.

**About/version — `VERIFIED`**

- Symptom/scope: About and manifests must report the candidate version, while
  incomplete-install errors must recommend v0.4.3.
- Evidence: root and shell packages are `0.5.0`; About uses
  `app.getVersion()`; runtime manifest and release contracts agree.
- Affected files: `package.json`, `apps/shell/package.json`,
  `apps/shell/src/main/index.ts`, `packages/contract-tests/tests/release.contract.test.ts`.
- Test: release contract, preflight tests and packaged runtime-manifest gate.
- Last verification: `pnpm release:gate`, 2026-09-09.
- Unlock reason: add a new packaged About regression test only if the visible
  About value is observed to diverge from `app.getVersion()`.

### Removed or frozen runtime behavior

**Gemini2API — `LOCKED` (removed)**

- Symptom: Gemini2API returned empty responses and introduced a separate
  Python process/provider/model path.
- Evidence: no active supervisor, startup hook, refresher, provider,
  selector model or packaged Gemini resource remains. Only the managed exact
  `gemini-web` row is migrated; unrelated providers and historical sessions
  are preserved.
- Affected files: `apps/shell/src/main/provider-seeder.ts`,
  `apps/shell/src/main/model-refresher.ts`, deleted Gemini supervisor/config
  and tests, `scripts/package-runtime.sh`, `apps/shell/electron-builder.yml`.
- Test: seeder/refresher/provider-selector tests, runtime closure and package
  inspection; the final payload reports `NO_GEMINI_PAYLOAD`.
- Last verification: full release gate, 2026-09-09.
- Unlock reason: only a newly reproduced active Gemini process/provider/model
  reference may reopen this decision.

**Supervisor and duplicate-window race — `LOCKED`**

- Symptom: stale `exit` events and pending respawns opened repeated dsh or
  Electron-related windows; failed boots could multiply children.
- Evidence: per-process generations, one pending spawn, restart invalidation,
  stale-event rejection, asynchronous spawn-error handling, process-tree
  waiting and bounded retries are active. Direct children use `shell:false`
  and `windowsHide:true`.
- Affected files: `apps/shell/src/main/harness-supervisor.ts`,
  `packages/opencode-adapter/src/pool.ts`, `apps/shell/src/main/index.ts`.
- Test: restart/exit race, stop with pending respawn, five failed boots,
  process-tree termination, real descendant-window enumeration and 50
  start/restart/stop cycles.
- Last verification: shell suite (17 files/98 tests) plus installed-runtime
  window probe in `pnpm release:gate`, 2026-09-09.
- Unlock reason: a new duplicate PID, visible child window or stale-generation
  reproduction.

**Headless child policy — `LOCKED`**

- Symptom: MCP, Python, uvx, Tesseract or worker helpers could flash consoles.
- Evidence: all implementation process seams are hidden and do not use
  `cmd.exe`, `start` or an intermediate terminal; visible descendant windows
  are rejected by a Win32 probe.
- Affected files: supervisor/pool, MCP transport, OCR helper, uvx bootstrap,
  headless diagnostics patch and installed-runtime verifier.
- Test: 50-cycle supervisor gate and clean installed-app descendant-window
  probe.
- Last verification: `pnpm release:gate`, 2026-09-09.
- Unlock reason: any visible helper window observed in a Windows smoke.

### Installer, MCP and tool contracts

**Installer/runtime layout — `LOCKED`**

- Symptom: the previous installer could leave a shortcut pointing at an
  incomplete runtime, including a `directory-picker-native` bundle without
  the Electron dialog bridge.
- Evidence: final NSIS installs into a fresh temporary directory; all required
  files and populated runtime directories exist, the native picker bridge is
  present, the installed dsh/Electron runtime reaches readiness, shortcuts
  point to the executable with the temporary install as working directory,
  and silent uninstall/cleanup succeeds.
- Affected files: `apps/shell/src/main/dialog-bridge.ts`, patch 010,
  `scripts/package-runtime.sh`, `scripts/verify-nsis-install-layout.mjs`,
  `scripts/verify-installed-runtime.mjs`, `scripts/verify-nsis-shortcuts.mjs`.
- Test: `pnpm --filter @freecode/shell package` followed by the fresh NSIS
  install smoke inside `pnpm release:gate`; output included 4 required files,
  2 populated directories, installed runtime boot/headless success and 2
  shortcut targets.
- Last verification: 2026-09-09.
- Unlock reason: reproduce an incomplete install, broken bridge, wrong
  shortcut working directory or installed startup failure.

**Serena MCP — `LOCKED`**

- Symptom: the process existed but Serena was not exposed to the model and
  project activation was absent or unsafe.
- Evidence: managed catalog entry is preinstalled/enabled; project paths are
  canonicalized and `activate_project` is serialized with the first call;
  readiness is emitted only after initialize, tools/list, schema validation
  and registration; tray/UI receives live state.
- Affected files: `apps/shell/src/main/mcp-home.ts`, runtime/supervisor status
  plumbing, `vendor/deepseek-harness/packages/mcp/mcp-client/src/connection.ts`,
  patches 060, 070, 085, 090, 100 and 130.
- Test: real external Serena initialize/tools/list/tools/call returned 24
  tools; packaged dsh smoke activated a temporary project and the provider
  request contained `mcp__serena__` tools.
- Last verification: `pnpm test:mcp:real` during the final release gate,
  2026-09-09.
- Unlock reason: a real project activation, tool-list or provider-roster
  regression.

**free-search MCP — `LOCKED`**

- Symptom: search was not directly available to the model or opened a browser
  unexpectedly.
- Evidence: managed `free-search-mcp` is preinstalled/enabled through uvx;
  search is HTTP-first and browser opening remains an explicit user action.
- Affected files: MCP catalog/config, runtime env, patches 070/085/090/100/130,
  `scripts/mcp-real-smoke.mjs`.
- Test: real initialize/tools/list/tools/call returned 11 tools; packaged dsh
  provider request contained `mcp__free-search__` tools.
- Last verification: `pnpm test:mcp:real` in the final release gate,
  2026-09-09.
- Unlock reason: a real tool-list/call failure or an unexpected browser spawn.

**MCP settings/status tab and tray — `VERIFIED`**

- Symptom: users could not see or toggle managed MCPs, and readiness was
  confused with mere configuration.
- Evidence: Settings → Plugins → MCP exposes toggles, config path, live state,
  errors and registered tool count; tray status is fed by the bounded status
  channel and failed states create visible notices.
- Affected files: `McpSettingsTab.tsx`, settings client/index/locales/CSS,
  shell IPC/preload/shared types, `apps/shell/src/main/mcp-home.ts` and tray
  notification code.
- Test: MCP UI/settings tests, config tests and packaged status smoke.
- Last verification: `pnpm release:gate`, 2026-09-09.
- Unlock reason: a new UI persistence, toggle, tray or live-status failure.

**Independent LSP servers — `OUT_OF_SCOPE`**

- Symptom/scope: separate LSP rows were redundant with the requested Serena
  semantic surface.
- Evidence: no independent LSP rows are emitted by the managed catalog; the
  upstream LSP packages may remain as upstream closure files but are not
  exposed as FreeCode-managed MCPs.
- Affected files: managed MCP catalog and standard preset patch.
- Test: MCP config contract and packaged tool-roster smoke.
- Last verification: 2026-09-09.
- Unlock reason: only an explicit product decision to expose a separate LSP.

**Tool-call contract — `LOCKED`**

- Symptom: tool calls failed opaquely, retried incorrectly or became blank
  successful responses.
- Evidence: every call carries request id/server/tool/attempt/status/duration;
  errors are classified, retries are bounded, side effects are not blindly
  repeated, and empty/invalid responses are explicit failures.
- Affected files: MCP connection/tools/catalog/types and contract tests.
- Test: 105 focused MCP tests, provider/selector tests, real MCP calls and
  packaged provider-roster smoke in the final gate.
- Last verification: 2026-09-09.
- Unlock reason: a reproduced misclassification, unbounded retry or missing
  tool roster.

### OCR, shell controls and policy

**OCR fallback — `VERIFIED`**

- Symptom: text-only models rejected images instead of receiving useful OCR.
- Evidence: direct image attachments and `read_image` route through bounded
  Tesseract; vision models retain the image; absent/corrupt/empty/timeout/
  oversized cases are explicit errors; Tesseract is included in the Windows
  payload and `pytesseract` is not a runtime dependency.
- Affected files: `vendor/deepseek-harness/packages/llm/llm/src/ocr.ts`,
  content/index/read-image, shell IPC/OCR helper, patch 120 and
  `scripts/package-tesseract.mjs`.
- Test: OCR/content/read-image tests, payload/closure checks and final package
  verification of `resources/freecode/tesseract`.
- Last verification: 2026-09-09.
- Unlock reason: a packaged text-only image failure or an OCR boundary breach.

**Caveman — `VERIFIED`**

- Symptom: Caveman was missing from visible configuration or not active by
  default.
- Evidence: shell schema defaults it on, settings expose it, the wrapper is
  injected once, and missing executable is an explicit no-op.
- Affected files: shell optimizer patch 030, settings schema/UI and tests.
- Test: shell settings/wrapper/persistence tests in the full suite.
- Last verification: 2026-09-09.
- Unlock reason: a new default, toggle or duplicate-injection regression.

**RTK — `VERIFIED`**

- Symptom/scope: RTK must not be displayed as active when it is not installed.
- Evidence: detection is explicit, optional and user-managed; FreeCode does
  not bundle, download or install it.
- Affected files: shell optimizer patch 030, README files and settings tests.
- Test: settings/detection tests and full release gate.
- Last verification: 2026-09-09.
- Unlock reason: a false-active state or silent installation.

**Sandbox — `VERIFIED`**

- Symptom: the sandbox appeared overly aggressive, while widening it would be
  an unsafe workaround.
- Evidence: upstream policy is preserved; Workspace Write remains default and
  permission failures stay distinct from tool/MCP errors.
- Affected files: permission/sandbox integration and Windows ACL contract
  tests; no automatic widening patch was added.
- Test: Windows ACL failure-path and runner tests, 14 passed in the release
  gate.
- Last verification: 2026-09-09.
- Unlock reason: a reproducible incorrect allow/deny decision with a minimal
  fixture.

**Updater/tray notices — `VERIFIED`**

- Symptom/scope: the update control had a previous visual/behavioral issue and
  downloads must not be silent.
- Evidence: the control matches Send with a downward arrow; checks run at
  startup and every six hours; tray/native notices report download and install
  phases. Upgrade from 0.4.3 is intentionally not a release gate.
- Affected files: `apps/shell/src/main/harness-updater.ts`, `index.ts`,
  `i18n.ts`, renderer update control and updater tests.
- Test: updater tests, release contracts and startup portion of the installed
  smoke.
- Last verification: 2026-09-09.
- Unlock reason: only a newly reproduced update-check, button or tray failure;
  do not refactor the updater speculatively.

**uvx bootstrap — `LOCKED`**

- Symptom: MCP startup could open windows or fail when the user did not have
  uvx installed.
- Evidence: the bootstrap reuses a user uvx or downloads the pinned official
  archive silently, verifies HTTPS/SHA-256, does not mutate PATH and has no
  console window.
- Affected files: `apps/shell/src/main/uvx-bootstrap.ts`, shell env/runtime,
  bootstrap tests and packaging manifest.
- Test: bootstrap tests, packaged real MCP smoke and clean install runtime
  boot.
- Last verification: 2026-09-09.
- Unlock reason: an unverified download, visible helper or missing-MCP startup.

### Upstream and release scope

**Upstream-first modular patch stack — `LOCKED`**

- Symptom/scope: product edits had to remain replayable over future upstream
  updates.
- Evidence: vendor changes are represented by the ordered, idempotent,
  fail-closed stack `010` through `130`; the applier reports 14 patches ready
  and reverse-checks them. The source update order is upstream fetch/subtree,
  apply patches, prepare, test, typecheck, build and package.
- Affected files: `patches/upstream/`, `scripts/apply-upstream-patches.mjs`,
  `docs/UPSTREAM-PATCHING.md`.
- Test: repeated `pnpm apply:upstream-patches` and full `pnpm release:gate`.
- Last verification: 2026-09-09.
- Unlock reason: a future upstream change that invalidates a patch.

**Linux/macOS artifacts — `OUT_OF_SCOPE`**

- Symptom/scope: prior release work spent time compiling non-Windows targets.
- Evidence: 0.5.0 scripts fail closed for non-Windows targets; the release
  gate publishes only Windows x64 NSIS/portable artifacts. Old 0.4.x files in
  the local release directory are historical leftovers and are not 0.5.0
  assets.
- Affected files: runtime/package scripts, builder config, release docs.
- Test: Windows-only release gate and builder artifact inspection.
- Last verification: 2026-09-09.
- Unlock reason: a separate future cross-platform release decision.

## Final gate evidence

`pnpm release:gate` passed with exit code 0 on 2026-09-09. It ran:

- workspace tests: adapter 20/20, shell 98/98;
- contract tests: 23 passed and 12 intentional non-Windows/out-of-scope
  skips;
- workspace typechecks and Windows ACL tests: 14/14;
- upstream build, fresh vendor bundle hashes, runtime closure and native
  Electron ABI rebuild (`fs-ext`, Electron 35.7.5 / ABI 133);
- direct and packaged Serena/free-search initialize/tools/list/schema/tool
  calls, including provider tool registration;
- NSIS build, fresh silent install, required bridge/runtime files, populated
  directories, installed headless boot, descendant-window probe, two shortcut
  targets with working directory, silent uninstall and cleanup.

Final Windows artifacts are under `apps/shell/release/`:

- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-setup.exe`
- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-portable.exe`
- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-setup.exe.blockmap`
- the matching Windows runtime archive and `.sha256` checksum.

Linux/macOS are outside the official 0.5.0 evidence. Local Linux artifacts may
exist from previous or development builds, but they were not tested on a real
Linux host by the Windows maintainer and require separate Linux testing. None
were uploaded. No GitHub Actions workflow was used. A tag/release is permitted only from the reviewed final
commit containing this ledger update; do not treat the old 0.4.3 binaries or
the previously deleted 0.5.0 candidate as release evidence.
