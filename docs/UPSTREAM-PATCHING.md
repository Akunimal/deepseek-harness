# Upstream sync and FreeCode patches

FreeCode keeps `vendor/deepseek-harness` as an upstream subtree and keeps
product-owned changes in the ordered patch stack under `patches/upstream/`.
The stack is intentionally small and fail-closed: a future upstream change
that invalidates a patch stops the sync/build until the patch is reviewed and
refreshed.

## Required order

```text
fetch upstream
  → git subtree pull --prefix=vendor/deepseek-harness
  → pnpm apply:upstream-patches
  → pnpm prepare:upstream
  → tests, typecheck, bundle freshness, package
```

Use `scripts/sync-upstream.sh` or `scripts/update-upstream-local.mjs`; both
apply the stack automatically after the subtree pull. `pnpm test`,
`pnpm test:contract`, `pnpm build`, and `pnpm package:runtime` also apply it,
so a clean checkout is reproducible after the patch step.

## Windows and WSL dependency boundary

The source tree is shared, but `vendor/deepseek-harness/node_modules` is not a
portable source artifact. Windows needs junctions and Windows native modules;
WSL needs Linux symlinks and Linux native modules. Do not run `pnpm install` in
both environments against the same dependency directory without reinstalling
for the active OS. The workspace-link step now fails with an explicit
cross-platform diagnostic instead of surfacing a raw `EACCES` from `lstat`.

When switching OS, remove only the generated vendor dependency tree (or its
`node_modules/@deepseek-ai` link scope) from the OS that created it, then run
the matching frozen install before applying patches and building. Product
source, the upstream subtree, patch files, and user data are never removed by
this recovery step.

## Patch ownership

- `010-freecode-dialog-bridge.patch` restores the Electron dialog bridge
  contract for the Win32 directory picker and its regression tests.
- `020-freecode-browser-tool.patch` restores the embedded browser tool bridge
  used by the FreeCode desktop shell.
- `030-freecode-shell-optimizers.patch` restores RTK and Caveman settings and
  wrappers, including their UI controls and safety tests.
- `040-freecode-branding.patch` keeps the product identity as FreeCode while
  retaining upstream's local-build version badge structure.

Only files under `vendor/deepseek-harness/` may be changed by this stack. The
apply script accepts an already-applied stack, rejects partial/ambiguous
application, and runs `git diff --check` over the result.

Do not edit the vendored files as the long-term source of a product feature.
Update the corresponding patch, rerun the complete verification gates, and
keep the upstream subtree itself free of FreeCode-only commits whenever the
feature can be expressed as an overlay.
