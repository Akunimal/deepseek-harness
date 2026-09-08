# FreeCode DeepSeek Harness — MCP servers

FreeCode bundles the MCP client bridge and its versioned catalog. On first
application boot the catalog is materialized in the Harness user home and all
three entries are enabled:

```text
<Electron userData>/dsh-home/mcp/servers.json
<Electron userData>/dsh-home/cordis.patch.yml
```

The portable build uses its `data/dsh-home` directory. A source checkout uses
the configured `DSH_HOME` (normally `~/.dsh` when the upstream CLI supplies the
default).

## Enable or disable a server

Edit `mcp/servers.json` and change only the `enabled` boolean. The app keeps
the catalog definitions product-owned, writes the JSON atomically, and
regenerates only the block between:

```text
# BEGIN FREECODE MANAGED MCP
# END FREECODE MANAGED MCP
```

in `cordis.patch.yml`. Any unrelated user patch rows remain intact. Restart
FreeCode after changing the file so the Harness reloads the patch.

Example:

```json
{
  "version": 1,
  "servers": [
    { "id": "serena", "enabled": true },
    { "id": "lsp-typescript", "enabled": false },
    { "id": "lsp-python", "enabled": true }
  ]
}
```

For a repository checkout, the deterministic setup helper is:

```sh
pnpm setup:mcp --all
```

It merges the same managed block and preserves unrelated user configuration.
The helper writes files with restrictive permissions where the platform
supports them, uses argument arrays rather than shell interpolation, and
fails closed for a selected server whose prerequisite cannot be installed.

## Included catalog

| ID | Server process | Purpose | Default |
|---|---|---|---|
| `serena` | `uvx` → official `oraios/serena` | Semantic retrieval and structural editing. | Enabled |
| `lsp-typescript` | `mcp-language-server` + `typescript-language-server` | TypeScript/JavaScript definitions, references, rename, and diagnostics. | Enabled |
| `lsp-python` | `mcp-language-server` + `pyright-langserver` | Python definitions, references, rename, and diagnostics. | Enabled |

The client bridge, catalog, enable/disable location, and managed patch are
preinstalled and active. The external server executables are not silently
downloaded into the desktop installer: they have platform-specific runtimes
and their own dependency chains. This is why the app can boot safely with the
entries enabled while a missing executable remains an explicit, recoverable
diagnostic instead of corrupting the main install.

## Prerequisites for the external processes

- Serena: `uv`/`uvx`; see the [official uv documentation](https://docs.astral.sh/uv/).
- LSP bridge: Go and the official
  [`isaacphi/mcp-language-server`](https://github.com/isaacphi/mcp-language-server)
  project.
- TypeScript LSP: `npm install --global typescript typescript-language-server`.
- Python LSP: `npm install --global pyright`.

Serena's client guidance and `uvx` invocation are documented by the
[official Serena client documentation](https://oraios.github.io/serena/02-usage/030_clients.html).

The old `@anthropic-ai/serena-mcp` and `@isaacphi/mcp-language-server` npm
package assumptions are intentionally not used by v0.5.0; they were invalid
as an installation strategy.
