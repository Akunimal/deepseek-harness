# Phase 2 Evidence — Runtime Dependency Manifest & Audit

Date: 2026-09-10
Commit: HEAD (a6e5caf7cf base + Phase 2 files)
Phase: 2 — Close the Windows runtime dependency bundle (audit/design step)

## What was done

### 1. Runtime dependency manifest created

**File:** `apps/shell/resources/runtime-deps.json`

Schema version 1 with 8 declared dependencies:

| ID | Name | Version | Arch | Path | Required | Network |
|---|---|---|---|---|---|---|
| opencode2api | opencode2api | 0.1.3-alpha.1 | win-x64 | opencode2api/opencode2api-win-x64.exe | ✅ | ❌ |
| dsh-cli | dsh CLI | 0.1.3-alpha.1 | any | dsh/apps/cli/lib/bin.js | ✅ | ❌ |
| tesseract | Tesseract OCR | 5.4.0.20240606 | win-x64 | tesseract/tesseract.exe | ❌ | ❌ |
| serena | Serena MCP | PLACEHOLDER | any | PLACEHOLDER | ❌ | ✅ |
| free-search | free-search MCP | PLACEHOLDER | any | PLACEHOLDER | ❌ | ✅ |
| uv-managed | uv (managed) | 0.12.10 | win-x64 | PLACEHOLDER | ❌ | ✅ |
| rtk | RTK | PLACEHOLDER | win-x64 | PLACEHOLDER | ❌ | ❌ |
| caveman | Caveman | PLACEHOLDER | win-x64 | PLACEHOLDER | ❌ | ❌ |

PLACEHOLDER paths = not yet vendored into payload (Phase 2 lock step).

### 2. JSON Schema created

**File:** `apps/shell/resources/runtime-deps.schema.json`

Validates the manifest: required fields (id, name, version, arch, source, license, sha256, path, launch, network, required), launch type enum (exec/node/uvx), arch enum.

### 3. Verification scripts created

**`scripts/verify-runtime-dependencies.mjs`**
- Checks manifest validity, payload dir existence, per-dep path existence, SHA-256 hashes, network flags for required deps, no git+https:// or pip install in config files
- Current result: 14/19 PASS, 5 FAIL (PLACEHOLDER paths for serena, free-search, uv, rtk, caveman)

**`scripts/verify-offline-mcp.mjs`**
- Checks mcp-home.ts for uvx commands and git+https:// URLs
- Checks uvx-bootstrap.ts for network download behavior
- Checks runtime-deps.json for network-flagged required deps
- Checks payload config for uvx/git references
- Checks serena-headless-launcher.py exists
- Current result: 5/8 PASS, 3 FAIL (uvx commands in mcp-home.ts, git+https:// URLs, uvx launch type)

### 4. Offline MCP design documented

**File:** `docs/OFFLINE-MCP-DESIGN.md`

Three options evaluated:
- Option A: Vendored uv/Python with locked cache
- Option B: Self-contained Windows server executables
- Option C: Hybrid — vendored uv + offline cache (RECOMMENDED)

Option C chosen: vendor uv binary at build time, pre-cache MCP server packages, launch with `--offline` flag at runtime.

### 5. Audit findings

**Payload status:**

| Component | Status | Issue |
|---|---|---|
| opencode2api-win-x64.exe | ✅ In payload | — |
| dsh CLI (Node.js) | ✅ In payload | — |
| Tesseract + DLLs | ✅ In payload | — |
| uv/uvx | ❌ Runtime download | releases.astral.sh |
| Serena MCP | ❌ Runtime download | uvx --from git+https://... |
| free-search MCP | ❌ Runtime download | uvx free-search-mcp |
| RTK | ⚠️ PATH only | resolveRtk() spawns 'rtk --version', default ON |
| Caveman | ⚠️ PATH only | resolveCaveman() spawns 'caveman', default ON |

**Key gaps for Phase 2 lock:**
1. No vendored uv binary in payload
2. No MCP server cache (Serena, free-search)
3. RTK not in payload (default ON in shell settings)
4. Caveman not in payload (default ON in shell settings)
5. mcp-home.ts uses `uvx` as command with `git+https://` args

## Commands run

```bash
# Verify runtime dependencies
node scripts/verify-runtime-dependencies.mjs
# Output: 14/19 checks passed, PLACEHOLDER PATHS: serena, free-search, uv-managed, rtk, caveman
# Exit: 1

# Verify offline MCP
node scripts/verify-offline-mcp.mjs
# Output: 5/8 checks passed
# FAIL: mcp-home-no-uvx-command, mcp-home-no-git-url, no-uvx-launch-type
# Exit: 1
```

## Next steps (Phase 2 lock)

1. Vendor uv binary into `resources/freecode/uv/`
2. Create MCP server cache with locked packages
3. Update mcp-home.ts to use vendored uv with `--offline`
4. Update uvx-bootstrap.ts for offline mode
5. Resolve RTK/Caveman packaging decision
6. Re-run verify scripts with `--block-network`
7. Compute SHA-256 hashes for all vendored binaries
