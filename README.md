# FreeCode DeepSeek Harness

Windows-first coding with OpenCode Free models: choose a project, describe the
work, and let the local Harness coordinate files, tools, MCP servers and model
calls.

[Leer en español](README.es.md)

## English

## 0.6.0 scope

0.6.0 is a Windows x64 anti-regression release. It publishes only:

- an NSIS installer;
- a portable Windows executable.

Linux and macOS are contributor-only manual targets. Linux binaries may have
been generated locally during development, but they were not tested on a real
Linux machine by the maintainer and require Linux testing before being treated
as usable. No Linux/macOS artifact is uploaded as an official 0.6.0 release
asset. Builds are local and do not use GitHub Actions workflows.

`0.4.3` is the last known-good operational reference because it opens. It is
not the source of truth and may not contain the fixes in this worktree. The
0.6.0 gate requires a clean install and launch; it does not require upgrading
an existing 0.4.3 installation.

The candidate that previously failed installation was not released. The
installer failure recovery text names `0.4.3` as the last stable version, and
the final tag/release is created only after every local gate is green. See the
[state ledger](docs/STATE-0.6.0.md) and [roadmap](docs/ROADMAP-0.6.0.md).

## What is included

- OpenCode Free model routing through the local OpenCode-compatible pool.
- The upstream DeepSeek Harness web UI, sessions, workspaces, permissions and
  file tools.
- A single Electron shell and a single `dsh` child generation.
- Serena and free-search as managed MCP integrations, preinstalled in the
  catalog and enabled by default.
- A visible MCP settings tab with toggles, connection state, registered tool
  count, errors and the generated config path.
- Caveman configuration in the Shell settings card, enabled by default in the
  shell schema; it is a no-op when its optional executable is absent.
- RTK as a separate optional setting; it is detected explicitly and never
  claimed to be in use when the executable is missing.
- RTK is not bundled, downloaded, or installed by FreeCode; it remains an
  optional user-managed executable.
- Bundled Windows Tesseract OCR for text-only image workflows.
- A persistent embedded browser only when the user explicitly opens it.
- About/version from the packaged app version, an update button shaped like
  Send with a downward arrow, and tray notifications during downloads/install.

Gemini2API was removed from the 0.6.0 runtime. There is no Gemini process,
provider, selector model, resource payload or fallback route to configure.
Independent LSP MCP entries were also removed; Serena is the semantic MCP
surface.

## Install and first run

1. Download the Windows setup or portable artifact from the eventual release.
2. Install or unpack it and launch the real shortcut/executable.
3. Select a project directory in the picker.
4. Ask the model to inspect or change the project.

The installer includes the Electron runtime, upstream Harness runtime,
OpenCode worker binary, native dependencies and Tesseract. If an incomplete
install is detected, the diagnostic points to the app log and recommends the
official `v0.4.3` installer as the last stable recovery reference.

The Windows bootstrap silently reuses a user-installed `uvx.exe`, or downloads
the pinned official uv ZIP into a per-user tools directory after HTTPS and
SHA-256 verification. It does not modify `PATH`, require administrator rights
or open a console. A failed bootstrap leaves the main app recoverable and
surfaces the MCP problem in the tab/log.

## MCP: Serena and free-search

On first boot FreeCode atomically creates:

```text
<userData>/dsh-home/mcp/servers.json
<userData>/dsh-home/cordis.patch.yml
```

Both managed entries are enabled by default. Open Settings → Plugins → MCP to
toggle them or open the exact JSON file. Only the marked FreeCode block in the
Cordis patch is regenerated; unrelated user rows are preserved. A toggle
updates the child environment and restarts only the Harness child, never a
second Electron instance.

Readiness is real, not just configuration:

```text
spawn → initialize → tools/list → schema validation → tool registration
```

The tab and tray expose the resulting state. A failed connection creates one
native notice per failure state and remains visible in the app log. No MCP
implementation child uses `cmd.exe`, `start`, a terminal or a visible window.

Serena deliberately starts without `--project-from-cwd`: the Harness child cwd
is private `dsh-home`, not the selected project, so automatic discovery cannot
scan an entire drive. Before the first Serena call for a session project, the
bridge canonicalizes the workspace path and calls `activate_project`; the
activation and the requested call are serialized. Switching projects performs
one new activation after the previous call completes. Activation errors are
returned to the model and shown as degraded/failed MCP state.

free-search uses `free-search-mcp` through `uvx` and is the default HTTP-first
research route. It does not open a browser to search. The embedded browser is
used only when the user asks to view a result.

Details are in [docs/mcp-servers.md](docs/mcp-servers.md).

## Tool-call contract

Each MCP tool call records a bounded machine-readable record with:
`requestId`, server, raw tool name, attempt, status and duration. The status is
one of:

```text
success
failed-local
failed-mcp
failed-provider
failed-timeout
failed-permission
failed-invalid-response
```

Empty, legacy and malformed results are explicit invalid-response failures, not
successful blank answers. Retries are bounded and are not performed blindly
for side-effecting tools. Arguments, image bytes and OCR contents are omitted
from logs.

## OCR behavior

Vision-capable models keep the original image. Text-only models receive OCR
text in both supported paths:

1. a direct image attachment in the user message;
2. the `read_image` tool.

Tesseract is bundled for Windows; `pytesseract` is not a runtime dependency.
The helper validates absolute paths, limits image/output sizes, restricts
language/PSM arguments, enforces a timeout and caches by image hash. Missing
binary, corrupt image, timeout, empty result and excessive output are explicit
errors; FreeCode never substitutes `[image omitted...]` silently.

## Shell, Caveman, RTK and sandbox

Settings → Plugins → plugin configuration → Shell exposes independent RTK and
Caveman toggles. Their schema defaults are on. The executable probes are
cached; if a binary is not installed, the corresponding feature is an explicit
no-op. Neither tool is downloaded or silently installed by FreeCode. Only safe,
plain commands are eligible for wrapping; pipes, redirects, substitutions and
other compound syntax are preserved.

Workspace Write remains the default permission mode. Sandbox decisions remain
the upstream contract: FreeCode does not widen permissions automatically and
distinguishes permission failures from tool/MCP failures.

## Updater and versioning

About reads `app.getVersion()`, so the packaged 0.6.0 binary must say 0.6.0.
The app checks for updates at startup and every six hours. The update control
is the same circular primary button as Send, with the arrow pointing down.
When downloading, the tray tooltip/menu and a native notification say so; the
install/restart phase is also visible. The 0.6.0 gate checks that this path does
not break startup, but does not require an upgrade from 0.4.3.

## Root cause of the previous regressions

The install crash came from a packaged `directory-picker-native` bundle that
was missing the Electron dialog bridge. A later launch also exposed lifecycle
issues: stale supervisor exit events could schedule another spawn while an
explicit restart was already creating a replacement. Tool failures were hard
to diagnose because readiness and successful registration were conflated, and
text-only image paths had no OCR fallback.

The 0.6.0 hardening addresses these independently:

- preflight and runtime-manifest checks reject an incomplete native bridge;
- supervisor and pool generations reject stale events and await process-tree
  exit;
- real Windows descendant/window tests look for duplicate PIDs and consoles;
- MCP readiness waits for initialize/tools/list/schema registration;
- tool calls have classified, bounded contracts and visible failure state;
- OCR is packaged and tested for both text-only paths;
- clean-install payload/bridge, headless boot, descendant-window, shortcut
  working-directory and uninstall smoke tests; a separate packaged MCP smoke
  exercises project activation, real MCP tools and provider registration.

## Upstream-first development

The upstream subtree is intentionally kept updateable. The supported order is:

```text
update/fetch vendor/deepseek-harness upstream
  → pnpm apply:upstream-patches
  → pnpm prepare:upstream
  → tests, typecheck, build and packaging
```

Product changes must become small sorted patches in `patches/upstream/`, with a
focused contract test. The patch applier is idempotent, vendor-scoped and
fail-closed. Do not leave an unrepresented feature as a permanent direct edit
inside `vendor/deepseek-harness`. See [docs/UPSTREAM-PATCHING.md](docs/UPSTREAM-PATCHING.md).

## Windows local release gate

Run from PowerShell on the maintainer Windows machine:

```powershell
pnpm install --frozen-lockfile
pnpm apply:upstream-patches
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

The gate builds only Windows x64 NSIS/portable outputs, verifies the runtime
manifest/native bridge/Tesseract, enumerates process trees/windows, and runs a
clean installation smoke. It does not run an upgrade smoke from 0.4.3. No tag
or GitHub release is created until all commands and the clean install pass.

Expected artifacts are under `apps/shell/release/`.

## Manual contributor builds for other operating systems

Linux and macOS are not release targets for 0.6.0. A contributor may work on a
native host with its own Node, pnpm, Git, Electron build tools and native
dependencies:

```bash
pnpm install --frozen-lockfile
pnpm apply:upstream-patches
pnpm build:vendor
pnpm test
pnpm typecheck
```

Do not use those builds as release evidence, do not upload them, and do not
expect the Windows-only `package:runtime`/release gate to accept a non-Windows
target. Reinstall dependencies when switching between Windows and WSL so
native modules and workspace links are not mixed.

## Project and license

FreeCode is the [Akunimal/free-code-deepseek-harness](https://github.com/Akunimal/free-code-deepseek-harness)
fork of [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).

MIT — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

Related projects: [OpenCode2API](https://github.com/jasonxu114514/opencode2api),
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness),
[RTK](https://github.com/rtk-ai/rtk),
[Caveman](https://github.com/JuliusBrussee/caveman),
[Serena](https://github.com/oraios/serena) and
[free-search-mcp](https://github.com/sweetcornna/free-search-mcp).

## Español

La guía completa en español está en [README.es.md](README.es.md). FreeCode
usa modelos OpenCode Free y mantiene el mismo inventario de upstream,
hardening y release local en ambos idiomas.

## Documentation index

- [Upstream feature inventory](docs/UPSTREAM-FEATURES.md)
- [0.6.0 state ledger](docs/STATE-0.6.0.md)
- [0.6.0 roadmap](docs/ROADMAP-0.6.0.md)
- [Historical roadmap](docs/ROADMAP.md)
- [Known issues](docs/KNOWN-ISSUES.md)
