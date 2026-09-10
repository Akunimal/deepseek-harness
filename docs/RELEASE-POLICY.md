# Release policy

Releases are performed manually from a maintainer workstation.

The published release target is Windows x64 only: NSIS setup, portable
executable, and the matching Windows Harness runtime archive. Linux and macOS
builds remain optional source artifacts; they may be generated locally but
require testing on their real operating system and are not required, uploaded, or
claimed by the Windows release checklist.

This repository intentionally has no GitHub Actions release workflow. Do not
add an automatic `push`, tag, or release workflow: FreeCode releases must not
consume the repository's free GitHub Actions quota.

Manual release checklist:

1. On Windows, run `pnpm release:gate` and require exit code 0. This gate runs
   the contract/unit checks, Windows ACL checks, rebuilds the desktop artifact,
   verifies vendored bundle freshness and runtime closure, performs real
   Serena/free-search initialize/tools/list/tool calls, and exercises the
   isolated fresh-install smoke. An upgrade from `v0.4.3` is deliberately not
   a 0.6.0 gate. A skipped, observational, or manually bypassed check is not a
   release result.
2. Review the generated Windows installers, portable executable, runtime
   archive, checksums, and update metadata locally.
3. Create or update the GitHub release and upload the artifacts manually.
4. Write the description from `docs/RELEASE-NOTES-TEMPLATE.md` with both the
   `English` and `Español` sections, keeping facts aligned.
5. Record the version, commit, assets, and verification result in the release
   notes.

RTK documentation must keep the integration boundary explicit: it is an
optional, user-installed output compressor, not a bundled release dependency.
Before publishing, confirm that the package still runs when `rtk` is absent and
that the release notes state this in both language sections.
