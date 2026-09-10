# FreeCode DeepSeek Harness — managed MCP servers

FreeCode ships the MCP client bridge and a versioned product catalog. On first
boot it materializes two entries, enabled by default:

```text
<Electron userData>/dsh-home/mcp/servers.json
<Electron userData>/dsh-home/cordis.patch.yml
```

The portable build uses `data/dsh-home`. The generated patch contains only the
marked FreeCode block; user-owned rows survive upgrades and toggles.

## Included catalog

| ID | Server process | Purpose | Default |
|---|---|---|---|
| `serena` | `uvx` → official `oraios/serena` | Semantic retrieval and structural editing. | Enabled |
| `free-search` | `uvx free-search-mcp` | HTTP-first search/fetch for agent research without opening a browser. | Enabled |

Independent LSP MCP rows are intentionally not included. Serena provides the
semantic project tools and avoids two competing language-server surfaces.
Gemini2API and Gemini selector models are not part of 0.6.0.

## Configuration and status

Open Settings → Plugins → MCP. The tab shows each toggle, command, live state,
registered tool count, the latest bounded error and the exact config path. The
tray reports how many enabled servers are ready. A server is not called ready
when its process merely exists; readiness requires:

```text
spawn → initialize → tools/list → schema validation → tool registration
```

The setting change writes JSON atomically, refreshes the child environment and
restarts only the Harness child. The Electron shell, pool and user data remain
alive. Manual edits should change only `enabled`; restart FreeCode after a
manual edit.

Example:

```json
{
  "version": 1,
  "servers": [
    { "id": "serena", "enabled": true },
    { "id": "free-search", "enabled": true }
  ]
}
```

The deterministic checkout helper is:

```powershell
pnpm setup:mcp --all
```

It uses argument arrays, restrictive file permissions where supported and
fails closed for a selected server whose prerequisite cannot be installed.

## Serena project lifecycle

The Electron Harness child starts Serena without `--project-from-cwd`. Its cwd
is the private `dsh-home`, so automatic discovery would walk toward a drive
root and scan unrelated files. When the model calls a Serena tool, the bridge
reads the session workspace, canonicalizes it (absolute/real path where
available), calls `activate_project`, and then calls the requested tool in one
serialized queue. A second project activates only after the prior operation is
finished. Activation failures are visible to both model and user.

This preserves project-on-demand behavior without spawning a second Serena or
opening a terminal window. The process stays under the one `dsh` child tree,
uses `shell:false`/`windowsHide:true`, and reconnects with bounded attempts.

## free-search and uvx

`free-search` is the no-browser research route. Its default HTTP engines do
not need a browser or a Gemini key. A browser is opened only when the user
explicitly asks to view a result.

On Windows FreeCode first reuses a user-installed `uvx.exe`. If absent, the
shell silently downloads the pinned official uv ZIP over HTTPS, verifies its
SHA-256 and extracts `uvx.exe` into a per-user tools directory. It does not
mutate `PATH`, require administrator rights or open a console. Failure is
recoverable: the application still boots, and the MCP tab/log reports the
missing prerequisite.

The uv bootstrap is a product dependency for MCP startup; Serena and
free-search remain separately toggleable. It is not a reason to install a
second FreeCode application instance.

## Tool-call contract

Every bridged call records a bounded machine-readable record containing
`requestId`, server, raw tool, attempt, status and duration. Status values are:

```text
success
failed-local
failed-mcp
failed-provider
failed-timeout
failed-permission
failed-invalid-response
```

Empty/legacy/malformed responses are explicit invalid-response failures. A
retry is allowed only for a transient error and is bounded; side-effecting
tools are not blindly repeated. Arguments, image bytes and sensitive OCR text
are not placed in the log.
