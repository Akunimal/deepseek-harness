# FreeCode 0.6.0 state ledger

Last updated: 2026-09-10, after a read-only audit of the published candidate.

This is the persistent evidence ledger for the Windows-only 0.6.0
anti-regression release. `0.4.3` is the last operational reference because it
opens successfully. It is not the source of truth for this worktree and does
not certify that the current code is complete; it may lack fixes implemented
here.

The 2026-09-09 `pnpm release:gate` result is retained as historical evidence,
but it is not a sufficient release certification. The audit found gaps that the
old gate did not exercise: the Spanish locale contract, packaged RTK, offline
MCP dependency closure, event-level window creation, Git resolution inside DSH,
and incomplete provider streams. The published 0.6.0 artifact is therefore an
audit baseline, not a fully self-contained or regression-free candidate.

## State vocabulary

- `BROKEN` — a failure is reproduced and still open.
- `UNVERIFIED` — there is not enough runtime or packaged evidence yet.
- `VERIFIED` — the focused contract or runtime check passes.
- `LOCKED` — verified and frozen; change only after reproducing a new
  regression.
- `OUT_OF_SCOPE` — intentionally excluded from the Windows 0.6.0 release.

## Audit correction

No component may remain `LOCKED` solely because the previous gate was green.
The detailed evidence and replacement gates are in
[`AUDIT-0.6.0-TEST-PLAN.md`](AUDIT-0.6.0-TEST-PLAN.md). A steady-state process
snapshot is not proof that a one-second window never appeared, and a
successful MCP call using downloaded `uvx` is not proof that the installer
contains its dependencies.

## Final ledger

Every entry records the symptom or scope, evidence, affected files, validating
test, latest verification and the reason that could unlock a locked result.

### Reference, version and recovery

**0.4.3 startup — `VERIFIED` (reference only)**

- Symptom/scope: 0.4.3 opens and is the recovery reference; it is not a
  compatibility or completeness guarantee for 0.6.0.
- Evidence: the release plan and recovery copy consistently identify 0.4.3 as
  the last stable operational version.
- Affected files: `apps/shell/src/main/i18n.ts`, `docs/ROADMAP-0.6.0.md`,
  `README.md`, `README.es.md`.
- Test: recovery-copy assertions in the shell/contract suites.
- Last verification: `pnpm release:gate`, 2026-09-09.
- Unlock reason: none for the reference; a new 0.4.3 observation would not
  change the 0.6.0 source of truth.

**About/version — `VERIFIED`**

- Symptom/scope: About and manifests must report the candidate version, while
  incomplete-install errors must recommend v0.4.3.
- Evidence: root and shell packages are `0.6.0`; About uses
  `app.getVersion()`; runtime manifest and release contracts agree.
- Affected files: `package.json`, `apps/shell/package.json`,
  `apps/shell/src/main/index.ts`, `packages/contract-tests/tests/release.contract.test.ts`.
- Test: release contract, preflight tests and packaged runtime-manifest gate.
- Last verification: `pnpm release:gate`, 2026-09-09.
- Unlock reason: add a new packaged About regression test only if the visible
  About value is observed to diverge from `app.getVersion()`.

**Spanish locale — `BROKEN`**

- Symptom: the 0.6.0 desktop selector does not expose Spanish.
- Evidence: the current vendor locale catalog declares only `zh` and `en`;
  the upstream synchronization removed the product's `es` exposure and the
  existing tests accepted the reduced list.
- Affected files: `vendor/deepseek-harness/packages/client/locale/`, locale
  selector/settings tests, and the ordered upstream patch stack.
- Test needed: source, selector, persistence, native menu/tray/preload and
  packaged-bundle assertions, followed by an upstream refresh/reapply test.
- Last verification: read-only source audit, 2026-09-10.
- Unlock reason: restore Spanish as a modular patch and pass the full locale
  contract; then it may become `LOCKED`.

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

**Supervisor and duplicate-window race — `BROKEN`**

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
- Last verification: user reproduced transient windows; a 2026-09-10 process
  snapshot showed one steady Electron and one dsh root but also `conhost.exe`
  descendants under workers and `uvx`. The existing probe does not capture
  creation events.
- Unlock reason: a new duplicate PID, visible child window or stale-generation
  reproduction.

**Headless child policy — `BROKEN`**

- Symptom: MCP, Python, uvx, Tesseract or worker helpers could flash consoles.
- Evidence: direct seams request hidden children, but MCP's SDK spawn, `uv`
  descendants and the ConPTY terminal are separate creation paths. A steady
  visible-window probe cannot prove that no transient console was created.
- Affected files: supervisor/pool, MCP transport, OCR helper, uvx bootstrap,
  headless diagnostics patch and installed-runtime verifier.
- Test needed: one Win32 launch seam, event-level window trace, process-tree
  attribution and 50-cycle/fault-injection stress.
- Last verification: read-only process/log audit, 2026-09-10.
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

**Serena MCP — `VERIFIED`**

- Symptom: the process existed but Serena was not exposed to the model and
  project activation was absent or unsafe.
- Evidence: managed catalog entry is enabled; project paths are canonicalized
  and `activate_project` is serialized with the first call; the actual server
  currently comes through external/bootstrap `uvx`, so payload closure is not
  proven;
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

**free-search MCP — `VERIFIED`**

- Symptom: search was not directly available to the model or opened a browser
  unexpectedly.
- Evidence: managed `free-search-mcp` is enabled through external/bootstrap
  uvx; search is HTTP-first and browser opening remains an explicit user action.
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

**Tool-call contract — `BROKEN`**

- Symptom: tool calls failed opaquely, retried incorrectly or became blank
  successful responses.
- Evidence: MCP calls carry the intended metadata, but a real worker log shows
  HTTP 200 with `done_seen=false`, `empty_reply=true` and no tool call. The
  provider streaming contract is not covered by the old gate.
- Affected files: MCP connection/tools/catalog/types and contract tests.
- Test needed: adversarial streaming fixtures, tool-call continuation,
  classified failures and bounded retry assertions.
- Last verification: worker log audit, 2026-09-10.
- Unlock reason: a reproduced misclassification, unbounded retry or missing
  tool roster.

**Git resolution inside DSH — `UNVERIFIED/BROKEN`**

- Symptom: a DSH conversation reported that sandbox restrictions prevented
  direct `git` execution because it was not found on `PATH`.
- Evidence: local Git works outside the app, but `app.log` does not record the
  resolved executable, cwd, sandbox mode or error class for that call.
- Affected files: shell executable resolution, subprocess environment,
  sandbox runner diagnostics and the packaged runtime contract.
- Test needed: real `git --version`, repository status, PATH-empty and
  sandbox-denied cases with separate error classifications.
- Last verification: session/log audit, 2026-09-10.
- Unlock reason: reproduce all cases in the installed runtime and make the
  selected dependency policy explicit.

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

**RTK — `BROKEN`**

- Symptom/scope: RTK is required to be packaged and available by default.
- Evidence: installed `resources/freecode` has no `rtk.exe`; `resolveRtk()` only
  probes the user's PATH. The published release notes previously described it
  as optional.
- Affected files: shell optimizer patch 030, runtime packager/manifest,
  settings, release docs and installer tests.
- Test needed: payload hash/license/architecture, `rtk --version` from an
  empty user PATH, command wrapping and installed portable/NSIS smoke.
- Last verification: installed payload audit, 2026-09-10.
- Unlock reason: bundle RTK and every declared runtime dependency, then pass
  the offline closure gate.

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

**uvx/MCP dependency closure — `BROKEN`**

- Symptom: MCP startup still depends on user PATH, network download or a
  per-user uvx cache, contrary to the all-included runtime requirement.
- Evidence: installed config points at `C:\Users\inti_\.local\bin\uvx.exe` and
  Serena is fetched from GitHub through uvx. The bootstrap verifies its own
  archive but does not make MCP servers an offline closure.
- Affected files: `apps/shell/src/main/uvx-bootstrap.ts`, shell env/runtime,
  bootstrap tests and packaging manifest.
- Test needed: manifest enumeration, no external path, network-blocked Serena
  and free-search initialize/tools/list/call smoke.
- Last verification: installed config/process audit, 2026-09-10.
- Unlock reason: an unverified download, visible helper or missing-MCP startup.

### Upstream and release scope

**Upstream-first modular patch stack — `UNVERIFIED`**

- Symptom/scope: product edits had to remain replayable over future upstream
  updates.
- Evidence: vendor changes are represented by an ordered stack, but the
  upstream sync removed the Spanish product contract without a failing patch or
  test. A new locale/packaging patch must be added and replayed after sync.
- Affected files: `patches/upstream/`, `scripts/apply-upstream-patches.mjs`,
  `docs/UPSTREAM-PATCHING.md`.
- Test needed: update upstream, apply all patches twice, require locale and
  runtime-closure contracts, then build/package.
- Last verification: Spanish regression audit, 2026-09-10.
- Unlock reason: a future upstream change that invalidates a patch.

**Linux/macOS artifacts — `OUT_OF_SCOPE`**

- Symptom/scope: prior release work spent time compiling non-Windows targets.
- Evidence: 0.6.0 scripts fail closed for non-Windows targets; the release
  gate publishes only Windows x64 NSIS/portable artifacts. Old 0.4.x files in
  the local release directory are historical leftovers and are not 0.6.0
  assets.
- Affected files: runtime/package scripts, builder config, release docs.
- Test: Windows-only release gate and builder artifact inspection.
- Last verification: 2026-09-09.
- Unlock reason: a separate future cross-platform release decision.

## Historical gate evidence

`pnpm release:gate` passed with exit code 0 on 2026-09-09, but this is now
classified as a partial structural/runtime baseline rather than final release
evidence. It ran:

- workspace tests: adapter 20/20, shell 98/98;
- contract tests: 23 passed and 12 intentional non-Windows/out-of-scope
  skips;
- workspace typechecks and Windows ACL tests: 14/14;
- upstream build, fresh vendor bundle hashes, runtime closure and native
  Electron ABI rebuild (`fs-ext`, Electron 35.7.5 / ABI 133);
- direct and packaged Serena/free-search initialize/tools/list/schema/tool
  calls, including provider tool registration, using the available/bootstrap
  uvx path;
- NSIS build, fresh silent install, required bridge/runtime files, populated
  directories, installed headless boot, descendant-window probe, two shortcut
  targets with working directory, silent uninstall and cleanup. It did not
  prove packaged RTK, offline MCP closure, Spanish locale, event-level window
  absence or Git resolution inside DSH.

Final Windows artifacts are under `apps/shell/release/`:

- `FreeCode-DeepSeek-Harness-0.6.0-win-x64-setup.exe`
- `FreeCode-DeepSeek-Harness-0.6.0-win-x64-portable.exe`
- `FreeCode-DeepSeek-Harness-0.6.0-win-x64-setup.exe.blockmap`
- the matching Windows runtime archive and `.sha256` checksum.

Linux/macOS are outside the official 0.6.0 evidence. Local Linux artifacts may
exist from previous or development builds, but they were not tested on a real
Linux host by the Windows maintainer and require separate Linux testing. None
were uploaded. No GitHub Actions workflow was used. The published `0.6.0` tag
and release are retained as the audit baseline; a corrective build must use the
next approved version after the replacement gates pass. Do not treat the old
0.4.3 binaries or the previously deleted 0.6.0 candidate as release evidence.
