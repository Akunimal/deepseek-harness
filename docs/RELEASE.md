# Release and packaging

This repository is the public Akunimal/free-code-deepseek-harness fork of
deepseek-ai/deepseek-harness. Product code lives outside the
vendor/deepseek-harness subtree where possible; upstream changes are replayed
through the ordered patch stack.

## Current baseline

The published 0.6.0 release is a Windows x64 audit baseline:

- 0.6.0 Windows NSIS installer;
- 0.6.0 Windows portable executable.

The historical 0.6.0 gate proved clean installation, shortcut launch,
directory-picker bridge, basic packaged boot, OCR payload and real MCP calls
using the available/bootstrap environment. It did not prove that RTK is
packaged, that MCP servers are offline-complete, that Spanish is present, that
short-lived helper windows never appear, that Git is resolvable inside DSH, or
that truncated provider streams cannot become empty success. Do not describe
the published artifact as fully self-contained.

0.4.3 is the last operational recovery reference because it opens. It is not a
compatibility guarantee and is not the source of truth for current code. The
0.7.0 gate does not require an upgrade from 0.4.3; it requires clean install,
open, project selection and relaunch.

The corrective execution contract is
[docs/ROADMAP-0.7.0.md](ROADMAP-0.7.0.md), with status in
[docs/STATE-0.7.0.md](STATE-0.7.0.md). The full read-only findings are in
[docs/AUDIT-0.6.0-TEST-PLAN.md](AUDIT-0.6.0-TEST-PLAN.md).

## Local Windows build

Run from PowerShell on Windows x64:

~~~
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
~~~

These commands are local and do not use GitHub Actions. The 0.7.0 release gate
must additionally run the offline dependency, RTK, Git/sandbox, Spanish,
adversarial stream and event-level Win32 window tests described in the
roadmap. Required resources must fail the gate when missing; they may not be
silently skipped because a developer machine lacks a fixture.

The expected 0.6.0 Windows artifacts are:

~~~
apps/shell/release/FreeCode-DeepSeek-Harness-0.6.0-win-x64-setup.exe
apps/shell/release/FreeCode-DeepSeek-Harness-0.6.0-win-x64-portable.exe
apps/shell/release/FreeCode-DeepSeek-Harness-0.6.0-win-x64-setup.exe.blockmap
apps/shell/release/win-unpacked/FreeCode DeepSeek Harness.exe
~~~

The 0.7.0 artifact names must be generated from the package version and
verified after packaging; do not copy a 0.6.0 name into a new release.

## Runtime dependency policy

The 0.6.0 installer contains Electron, the Harness runtime, the OpenCode
worker, native picker/runtime files and Tesseract. It does not contain RTK and
its managed Serena/free-search rows can use external/bootstrap uvx. That is an
open 0.7.0 defect, not an acceptable final policy.

For 0.7.0, the installed closure must enumerate version, architecture,
source, license, hash and relative path for RTK, uv/uvx or its replacement,
Serena, free-search, Tesseract, workers and native helpers. An installed first
run must work with an empty external PATH and blocked network. A config
reference to a per-user uvx path or git+https download is not a bundled
dependency.

## Windows-only publication

No Linux or macOS artifact is an official release asset. Contributors may
build on a native host, but a Linux binary generated from Windows/WSL is not
evidence of Linux usability and must not be advertised without real Linux
testing. Do not mix Windows and WSL node_modules; reinstall dependencies for
the active operating system.

The repository has no release workflow. Pushes do not build or publish
installers. Publication is a manual action after the local gate, review of
checksums, clean NSIS/portable install and state-ledger lock.

## Updater and runtime updates

The application updater is not a substitute for a release gate. It must keep
the Send-shaped downward-arrow control, check at startup and on its scheduled
interval, show tray/native progress during download/install and preserve the
user data contract. 0.7.0 does not require an upgrade from 0.4.3.

The source-only upstream update path is:

~~~
freeze evidence
  -> update/fetch vendor/deepseek-harness
  -> pnpm apply:upstream-patches
  -> verify manifest and replay
  -> test/typecheck/build/package
~~~

See [docs/UPSTREAM-PATCHING.md](UPSTREAM-PATCHING.md) and
[docs/RELEASE-POLICY.md](RELEASE-POLICY.md).

## Version history and release links

Older documents under docs/RELEASE-NOTES-v*.md describe historical releases
and are intentionally not rewritten as current instructions. The published
baseline is tracked at
[GitHub release 0.6.0](https://github.com/Akunimal/free-code-deepseek-harness/releases/tag/0.6.0).

The next release must not be tagged or published until every critical row in
STATE-0.7.0.md is LOCKED and the final Windows artifacts pass the complete
offline clean-install smoke.

For the Spanish guide, see [RELEASE.es.md](RELEASE.es.md).
