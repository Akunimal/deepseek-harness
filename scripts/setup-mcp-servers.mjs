#!/usr/bin/env node
/**
 * Install and activate FreeCode's supported MCP servers.
 *
 * The user-controlled enable/disable switch is DSH_HOME/mcp/servers.json.
 * The generated DSH_HOME/cordis.patch.yml is the actual runtime overlay and
 * is regenerated atomically after every setup run. All child commands use
 * argv arrays; no shell interpolation is used for package installation.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  MCP_SERVER_DEFINITIONS,
  defaultMcpConfig,
  mergeManagedPatch,
  mergeMcpConfig,
  renderMcpPatch,
  validateMcpConfig,
} from './mcp-config.mjs';

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const MCP_CONFIG_DIR = join(DSH_HOME, 'mcp');
const MCP_CONFIG = join(MCP_CONFIG_DIR, 'servers.json');
const CORDIS_PATCH = join(DSH_HOME, 'cordis.patch.yml');

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function readExistingConfig() {
  if (!existsSync(MCP_CONFIG)) return defaultMcpConfig();
  try {
    return mergeMcpConfig(JSON.parse(readFileSync(MCP_CONFIG, 'utf8')));
  } catch (error) {
    throw new Error(`cannot read ${MCP_CONFIG}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeAtomic(path, contents) {
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, contents, { encoding: 'utf8', mode: 0o600 });
  renameSync(tmp, path);
}

function writeConfig(config) {
  mkdirSync(MCP_CONFIG_DIR, { recursive: true });
  writeAtomic(MCP_CONFIG, `${JSON.stringify(config, null, 2)}\n`);
  const existingPatch = existsSync(CORDIS_PATCH) ? readFileSync(CORDIS_PATCH, 'utf8') : '';
  writeAtomic(CORDIS_PATCH, mergeManagedPatch(existingPatch, renderMcpPatch(config)));
}

function install(server) {
  const command = server.install.command;
  const args = server.install.args;
  console.log(`  Installing ${server.id}: ${command} ${args.join(' ')}`);
  try {
    execFileSync(command, args, {
      cwd: DSH_HOME,
      stdio: 'inherit',
      timeout: 300_000,
      windowsHide: true,
    });
    return true;
  } catch (error) {
    console.error(`  Failed to install ${server.id}: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`  Prerequisite: ${server.install.prerequisite}`);
    return false;
  }
}

function installLspDependencies() {
  try {
    execFileSync(npmCommand(), ['install', '--global', '--no-audit', '--no-fund', 'typescript', 'typescript-language-server', 'pyright'], {
      cwd: DSH_HOME,
      stdio: 'inherit',
      timeout: 300_000,
      windowsHide: true,
    });
    return true;
  } catch (error) {
    console.error(`  Failed to install LSP language-server dependencies: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function selectedIds(args) {
  if (args.includes('--all') || args.length === 0) return new Set(MCP_SERVER_DEFINITIONS.map((server) => server.id));
  const selected = new Set();
  if (args.includes('--serena')) selected.add('serena');
  if (args.includes('--lsp')) {
    selected.add('lsp-typescript');
    selected.add('lsp-python');
  }
  if (selected.size === 0) throw new Error('use --all, --serena, or --lsp');
  return selected;
}

function main() {
  const args = process.argv.slice(2);
  const selected = selectedIds(args);
  const config = readExistingConfig();
  const results = new Map();

  if (selected.has('serena')) results.set('serena', install(MCP_SERVER_DEFINITIONS.find((server) => server.id === 'serena')));
  if (selected.has('lsp-typescript') || selected.has('lsp-python')) {
    const dependenciesOk = installLspDependencies();
    results.set('lsp-typescript', dependenciesOk && install(MCP_SERVER_DEFINITIONS.find((server) => server.id === 'lsp-typescript')));
    results.set('lsp-python', dependenciesOk && install(MCP_SERVER_DEFINITIONS.find((server) => server.id === 'lsp-python')));
  }

  for (const server of config.servers) {
    if (selected.has(server.id)) server.enabled = results.get(server.id) === true;
  }
  validateMcpConfig(config);
  writeConfig(config);
  console.log(`\nMCP config: ${MCP_CONFIG}`);
  console.log(`DSH patch:  ${CORDIS_PATCH}`);
  console.log('Enabled servers:', config.servers.filter((server) => server.enabled).map((server) => server.id).join(', ') || '(none)');
  if ([...results.values()].some((ok) => !ok)) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
