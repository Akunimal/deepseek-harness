# FreeCode 0.5.0 definitive roadmap

Last updated: 2026-09-09

This is the execution order for the Windows-only anti-regression release. The
ledger in [`STATE-0.5.0.md`](STATE-0.5.0.md) is the evidence source. A part is
not called complete because its code exists: it must pass its gate and then be
marked `LOCKED` so later cleanup does not reopen verified behavior.

## Closed decisions

- Publish Windows x64 NSIS and portable artifacts only.
- Do not require an upgrade from `0.4.3`; require a clean install and launch.
- Treat `0.4.3` as an operational reference, not as the source of truth.
- Remove Gemini2API first and keep only the managed migration that removes its
  exact route while preserving unrelated providers and historical sessions.
- Keep the installer frozen unless a clean smoke reproduces a packaging failure.
- Do not create a tag or release before every local gate passes.
- Keep upstream in `vendor/deepseek-harness`; apply product behavior as ordered,
  modular patches from `patches/upstream/`.

## State contract

Allowed states are `BROKEN`, `UNVERIFIED`, `VERIFIED`, `LOCKED` and
`OUT_OF_SCOPE`. Every item in the ledger records symptom, evidence, affected
files, validating test, latest verification and the reason that could unlock a
locked item.

## Phase 0 — inventory and baseline

- Preserve the dirty worktree; do not use reset/checkout to erase user work.
- Classify existing changes as trusted, unverified or clearly defective.
- Record the `0.4.3` reference and run existing tests before product edits.
- Do not repair the installer or updater merely because they are present.

Gate: baseline commands and evidence are recorded in `STATE-0.5.0.md`.

## Phase 1 — remove Gemini2API first

Remove the Python supervisor, startup hooks, payload, provider route,
selector/models, fallback/refresher behavior, Gemini tests and current
documentation. Keep the migration narrow: delete only the managed
`gemini-web` entry, fall back to the stable DeepSeek selection if necessary,
preserve other providers and retain historical sessions.

Gate:

- no active Gemini process, provider, model or selector entry;
- no Gemini resource is packaged;
- application startup and provider/selector tests pass;
- log noise does not increase.

On the gate, mark `Gemini2API` `LOCKED` as removed.

## Phase 2 — process lifecycle and invisible children

The supervisor and worker pool use process generations, one pending spawn,
cancelled respawn timers, stale-event rejection, full-tree termination and a
real exit barrier. No fixed sleep is synchronization. Direct children use
`windowsHide:true` and `shell:false`; no `cmd.exe`, `start` or terminal bridge
is allowed for implementation processes.

Tests cover restart/exit races, stop with a pending respawn, five failed boots,
tree termination, one active `dsh` PID and real Win32 descendant window
enumeration. The supervisor gate is 50 start/restart/stop cycles with zero
duplicate processes and zero console windows. Lock only after that gate and a
packaged smoke.

## Phase 3 — MCP and real tool-call contracts

Serena and free-search are managed, preinstalled and enabled by default. Their
toggle/configuration lives in `dsh-home/mcp/servers.json` and the generated
managed block in `cordis.patch.yml`; unrelated user rows are preserved.
Independent LSP servers are out of scope because Serena owns the semantic
surface.

The Settings → Plugins → MCP tab shows enabled state, live connection state,
registered tool count, errors and the config path. A tray summary reports the
number of enabled MCP servers that completed readiness. A failed server emits a
visible notification without opening a console window.

MCP readiness is only logged after:

```text
spawn → initialize → tools/list → schema validation → tool registration
```

Serena receives the canonicalized session workspace immediately before the
first call for that project and serializes activation with dependent calls.
This prevents drive-root scanning while still switching safely between
projects. The MCP bridge never opens a browser for search; a browser opens only
when the user explicitly asks to view a result.

Every tool call records `requestId`, server, raw tool, attempt, status and
duration. Statuses are `success`, `failed-local`, `failed-mcp`,
`failed-provider`, `failed-timeout`, `failed-permission` and
`failed-invalid-response`. Retries are bounded and are not performed blindly
for side-effecting calls. An empty response is a classified failure, not a
successful blank answer. RTK remains optional and is not reported as used when
its executable is absent. Caveman is configurable and defaults on in the shell
schema; absence of its executable is an explicit no-op.

Gate: a real local MCP fixture and the packaged Serena/free-search smoke both
complete initialization, schema registration and at least one tool call.

## Phase 4 — bounded OCR fallback

FreeCode owns a direct Tesseract helper and bundles it in the Windows runtime.
`pytesseract` is not a runtime requirement. Vision models keep the original
image. Text-only models receive bounded OCR text for direct attachments and for
`read_image`. Missing binaries, corrupt images, timeout, empty output and
excessive output are explicit errors; images and OCR contents are not logged.

Gate: available/absent binary, timeout, corrupt/empty/oversized output, direct
attachment, `read_image`, vision route and text-only route tests.

## Phase 5 — conditional UI and configuration repairs

Verify in isolation: About/version, model selector, reasoning effort, config
file access, Caveman/RTK, sandbox, updater and tray. Hide unsupported effort
controls. Keep Workspace Write as default. Do not widen sandbox policy. Keep
the update button visually identical to Send with a downward arrow and keep
tray download/install notices. The update checker runs at startup and every six
hours; this release does not make `0.4.3` upgrade a gate.

Only a reproduced current failure is allowed to change a verified component.

## Phase 6 — installer and runtime

Do a clean Windows install using the existing installer. Launch from the real
shortcut and verify its working directory, app opening, picker bridge, project
selection, Serena, a real tool, close and relaunch. Verify the packaged native
ABI, runtime manifest, managed uvx bootstrap and bundled Tesseract. If this
passes, lock packaging. If it fails, investigate only the observed cause:
`fs-ext` ABI, directory-picker bridge, manifest/resources or uvx bootstrap.

## Phase 7 — invisible-state test gates

The final suite must include black-box process/window enumeration, complete
process trees, real MCP initialize/tools/list/tool execution, provider errors,
empty responses, sandbox permissions, OCR from the packaged runtime, persisted
configuration, shortcut working directory and clean installation. Critical
tests may not silently skip a resource that the Windows installer is required
to include.

Required Windows commands:

```powershell
pnpm test
pnpm test:contract
pnpm typecheck
pnpm build:vendor
pnpm build:shell
pnpm package:runtime
pnpm --filter @freecode/shell package
pnpm --filter @freecode/shell smoke:nsis
pnpm release:gate
```

No Linux/macOS build or AppImage verification is part of 0.5.0.

## Phase 8 — documentation, lock and release

Update this roadmap, the state ledger, the main English README and the Spanish
README after each material gate. Document Windows-only release scope, manual
other-OS contributor builds, upstream → patches order, MCP/Serena/free-search,
Caveman/RTK, OCR, updater, troubleshooting and the known limitations of
`0.4.3`.

Only after all gates are green:

1. mark verified components `LOCKED`;
2. compile NSIS and portable Windows artifacts;
3. run the clean-install smoke on the final files;
4. create tag `0.5.0`;
5. create the release and upload only Windows binaries.

## Implementation closeout

The implementation gates are now green on 2026-09-09:

- `pnpm release:gate` exited 0 on the final 0.5.0 candidate;
- the real MCP gate returned 24 Serena tools and 11 free-search tools, then
  observed both packaged tool namespaces in the provider request;
- the runtime was rebuilt for Electron 35.7.5 / Node ABI 133, including the
  Windows `fs-ext` native module and bundled Tesseract;
- the final NSIS setup and portable executable were generated, and a fresh
  silent NSIS installation passed payload, bridge, headless boot, visible
  descendant-window, shortcut working-directory, uninstall and cleanup checks.

The clean-install gate deliberately does not perform an upgrade from 0.4.3.
The picker bridge is validated in the installed payload and bridge contracts;
Serena project activation and real tool execution are additionally validated
against the packaged dsh runtime by `scripts/mcp-real-smoke.mjs`. This keeps
the release gate deterministic while preserving the exact regression coverage
that matters for the previous installer failure.
