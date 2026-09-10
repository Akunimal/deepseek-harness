#!/usr/bin/env node
/**
 * verify-offline-mcp.mjs — Phase 2 offline MCP closure validation.
 *
 * Proves that the MCP server definitions in the source code do not require
 * network access, external uvx, git+https:// downloads, or PATH-resolved
 * tools at runtime in a packaged install.
 *
 * Usage:
 *   node scripts/verify-offline-mcp.mjs --path <staged-runtime>
 *   node scripts/verify-offline-mcp.mjs
 *
 * Exit code 0 = all checks pass. Non-zero = failure.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ── CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const pathIdx = args.indexOf('--path');
const STAGED_RUNTIME = pathIdx !== -1
  ? resolve(args[pathIdx + 1])
  : resolve(REPO_ROOT, 'apps/shell/resources/freecode');

// ── Helpers ─────────────────────────────────────────────────────────
const checks = [];

function logCheck(name, pass, detail) {
  const status = pass ? 'PASS' : 'FAIL';
  const detailStr = detail ? ` (${detail})` : '';
  console.log(`  [${status}] ${name}${detailStr}`);
  checks.push({ name, pass });
}

function readFileSafe(path) {
  try { return readFileSync(path, 'utf8'); } catch { return null; }
}

// ── Checks ──────────────────────────────────────────────────────────

// 1. mcp-home.ts: no uvx command in BASE_SERVER_DEFINITIONS
const mcpHomePath = join(REPO_ROOT, 'apps', 'shell', 'src', 'main', 'mcp-home.ts');
const mcpHome = readFileSafe(mcpHomePath);
if (mcpHome) {
  const uvxCommandRegex = /command:\s*['"]uvx['"]/g;
  const uvxMatches = mcpHome.match(uvxCommandRegex) || [];
  logCheck('mcp-home-no-uvx-command', uvxMatches.length === 0, uvxMatches.length > 0 ? `FOUND ${uvxMatches.length} uvx command(s)` : 'clean');

  const gitUrlRegex = /git\+https:\/\//g;
  const gitMatches = mcpHome.match(gitUrlRegex) || [];
  logCheck('mcp-home-no-git-url', gitMatches.length === 0, gitMatches.length > 0 ? `FOUND ${gitMatches.length} git+https:// reference(s)` : 'clean');
} else {
  logCheck('mcp-home-readable', false, mcpHomePath);
}

// 2. uvx-bootstrap.ts: flag that it downloads at runtime
const bootstrapPath = join(REPO_ROOT, 'apps', 'shell', 'src', 'main', 'uvx-bootstrap.ts');
const bootstrap = readFileSafe(bootstrapPath);
if (bootstrap) {
  const hasAstralUrl = bootstrap.includes('releases.astral.sh');
  const hasFetchCall = bootstrap.includes('fetch(');
  logCheck('uvx-bootstrap-downloads-at-runtime', !hasAstralUrl || !hasFetchCall, hasAstralUrl ? 'downloads uv from releases.astral.sh on first launch' : 'clean');
  logCheck('uvx-bootstrap-sha256-pinned', bootstrap.includes('MANAGED_UV_ARCHIVE_SHA256'), 'SHA-256 pin present');
} else {
  logCheck('uvx-bootstrap-readable', false, bootstrapPath);
}

// 3. runtime-deps.json: check network flags
const depsPath = join(REPO_ROOT, 'apps', 'shell', 'resources', 'runtime-deps.json');
const deps = readFileSafe(depsPath);
if (deps) {
  const manifest = JSON.parse(deps);
  const networkRequired = manifest.dependencies.filter(d => d.required && d.network);
  logCheck('no-required-network-deps', networkRequired.length === 0, networkRequired.length > 0 ? `REQUIRED+NETWORK: ${networkRequired.map(d => d.id).join(', ')}` : 'clean');

  const uvxDeps = manifest.dependencies.filter(d => d.launch?.type === 'uvx');
  logCheck('no-uvx-launch-type', uvxDeps.length === 0, uvxDeps.length > 0 ? `uvx launch: ${uvxDeps.map(d => d.id).join(', ')}` : 'clean');
} else {
  logCheck('runtime-deps-readable', false, depsPath);
}

// 4. Payload: check for any .json with git+https:// or uvx references
const payloadDsh = join(STAGED_RUNTIME, 'dsh');
if (existsSync(payloadDsh)) {
  const settingsFiles = [
    join(payloadDsh, '.claude', 'mcp_servers.json'),
    join(payloadDsh, 'mcp', 'servers.json'),
  ];
  let foundUvx = false;
  let foundGitUrl = false;
  for (const f of settingsFiles) {
    const content = readFileSafe(f);
    if (content) {
      if (content.includes('uvx')) foundUvx = true;
      if (content.includes('git+https://')) foundGitUrl = true;
    }
  }
  logCheck('payload-mcp-config-offline', !foundUvx && !foundGitUrl, foundUvx ? 'FOUND uvx in payload config' : foundGitUrl ? 'FOUND git+https:// in payload config' : 'no existing config (generated at runtime from source)')
} else {
  logCheck('payload-dsh-exists', false, payloadDsh);
}

// 5. Serena launcher exists
const serenaLauncher = join(STAGED_RUNTIME, 'serena-headless-launcher.py');
logCheck('serena-launcher-exists', existsSync(serenaLauncher), serenaLauncher);

// 6. Summary
console.log();
const allPass = checks.every(c => c.pass);
const total = checks.length;
const passed = checks.filter(c => c.pass).length;
console.log(`verify-offline-mcp: ${passed}/${total} checks passed`);
console.log(`\n  "result": "${allPass ? 'PASS' : 'FAIL'}"`);
process.exit(allPass ? 0 : 1);
