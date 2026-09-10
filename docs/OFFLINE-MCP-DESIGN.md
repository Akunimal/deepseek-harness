# Offline MCP Design

Last updated: 2026-09-10

## Problem

The current MCP server definitions use `uvx` as the command and download
packages at runtime via `git+https://` URLs. This violates the Phase 2
requirement that an installed application must work with network access
blocked.

### Current state (BROKEN for offline)

```
mcp-home.ts → BASE_SERVER_DEFINITIONS:
  serena:     command: 'uvx', args: ['--from', 'git+https://github.com/oraios/serena', ...]
  free-search: command: 'uvx', args: ['free-search-mcp']

uvx-bootstrap.ts → Downloads uv from releases.astral.sh on first launch
```

Both servers require:
1. `uvx` binary (downloaded on first MCP launch if not on PATH)
2. Network access to download Python packages
3. `git+https://` for Serena specifically

## Design options

### Option A: Vendored uv/Python with locked cache

**How it works:**
1. At build time, install `uv` into a vendored directory under
   `resources/freecode/uv/` with a pinned version (currently 0.12.10)
2. At build time, run `uv tool install` for each MCP server with
   `--python` pinned, creating a frozen virtualenv in the vendor cache
3. At runtime, the MCP config uses absolute paths to the vendored
   executables instead of `uvx`

**Pros:**
- Minimal code changes (only mcp-home.ts definitions change)
- Python packages are pre-resolved and cached offline
- uv itself is vendored, no bootstrap download needed

**Cons:**
- Large payload (uv binary ~20MB + Python packages ~50-100MB)
- Must re-vendor when upstream MCP servers update
- Windows-specific (no cross-platform from Linux build)

### Option B: Self-contained Windows server executables

**How it works:**
1. Build each MCP server as a standalone Windows executable using
   PyInstaller, Nuitka, or similar
2. Package the `.exe` files directly in `resources/freecode/`
3. MCP config uses the `.exe` path directly

**Pros:**
- Smallest payload (single binary per server)
- No Python/uv dependency at runtime
- Clean launch contract

**Cons:**
- Requires build infrastructure for each server
- May not work with all Python packages (C extensions, data files)
- Serena uses LSP protocol which may be hard to bundle

### Option C: Hybrid — vendored uv + offline cache (RECOMMENDED)

**How it works:**
1. Vendor `uv` binary at `resources/freecode/uv/uv.exe`
2. At build time, create a `.pythonlibs` cache directory with
   pre-downloaded wheels for each MCP server
3. At runtime, set `UV_CACHE_DIR` and `UV_TOOL_DIR` to absolute
   paths under the payload, blocking network with `--offline` flag
4. MCP config launches via absolute path to vendored uv with
   `--offline` and pre-resolved cache

**Implementation:**

```typescript
// mcp-home.ts — offline MCP definitions
const BASE_SERVER_DEFINITIONS = [
  {
    id: 'serena',
    serverName: 'serena',
    transport: 'stdio',
    command: join(PAYLOAD_DIR, 'uv', 'uv.exe'),
    args: [
      '--offline',
      '--cache-dir', join(PAYLOAD_DIR, '.uv-cache'),
      'tool', 'run',
      '--from', 'serena',  // resolved from local cache, not git+https
      'serena', 'start-mcp-server', '--context', 'claude-code',
    ],
    cwd: PROCESS_CWD,
  },
  // ...
]
```

**Pros:**
- uv is vendored, no download needed
- Packages are pre-cached, no network needed
- `--offline` flag explicitly rejects any network attempt
- Single build step to vendor everything

**Cons:**
- Cache directory can be large (~50-100MB)
- Must rebuild cache when MCP servers update

## Recommended approach: Option C

### Build-time vendor script

```bash
#!/bin/bash
# scripts/vendor-mcp-deps.sh

VENDOR_DIR="apps/shell/resources/freecode"
UV_VERSION="0.12.10"

# 1. Download uv binary
curl -L "https://releases.astral.sh/github/uv/releases/download/${UV_VERSION}/uv-x86_64-pc-windows-msvc.zip" -o uv.zip
unzip uv.zip -d "${VENDOR_DIR}/uv/"
rm uv.zip

# 2. Install MCP servers into vendor cache
UV_CACHE_DIR="${VENDOR_DIR}/.uv-cache" UV_TOOL_DIR="${VENDOR_DIR}/.uv-tools" \
  uv tool install --from "git+https://github.com/oraios/serena" serena
UV_CACHE_DIR="${VENDOR_DIR}/.uv-cache" UV_TOOL_DIR="${VENDOR_DIR}/.uv-tools" \
  uv tool install free-search-mcp

# 3. Verify offline
UV_CACHE_DIR="${VENDOR_DIR}/.uv-cache" uv tool run --offline serena --version
```

### Runtime resolution

The `ensureEmbeddedMcpConfig` function must:
1. Use absolute path to vendored `uv.exe` instead of `uvx`
2. Set `UV_CACHE_DIR` and `UV_TOOL_DIR` to payload-relative paths
3. Pass `--offline` flag to reject network access
4. Fall back to PATH-resolved `uvx` only in development mode

### Verification

`verify-offline-mcp.mjs` will check:
- No `uvx` as command in mcp-home.ts
- No `git+https://` in server args
- `uv --offline` flag present in launch args
- Vendored uv binary exists in payload
- Cache directory exists and is non-empty
- No network access at runtime

## Status

- [x] Audit completed (Phase 2 audit task)
- [x] Design document written
- [ ] Vendor uv binary into payload
- [ ] Create MCP server cache
- [ ] Update mcp-home.ts definitions
- [ ] Update uvx-bootstrap.ts for offline mode
- [ ] Run verify-offline-mcp.mjs with --block-network
- [ ] Update STATE-0.7.0.md
