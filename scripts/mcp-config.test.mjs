import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultMcpConfig,
  MANAGED_PATCH_BEGIN,
  MANAGED_PATCH_END,
  mergeManagedPatch,
  mergeMcpConfig,
  renderMcpPatch,
  validateMcpConfig,
} from './mcp-config.mjs';

test('MCP defaults are installed and enabled, with unique runtime rows', () => {
  const config = defaultMcpConfig();
  validateMcpConfig(config);
  assert.equal(config.servers.length, 2);
  assert.deepEqual(config.servers.map((server) => server.id), [
    'serena', 'free-search',
  ]);
  assert.ok(config.servers.every((server) => server.enabled === true));
  assert.equal(new Set(config.servers.map((server) => server.serverName)).size, 2);
  const patch = renderMcpPatch(config);
  assert.equal((patch.match(/name: "@deepseek-ai\/dsh-mcp-client"/g) ?? []).length, 2);
  assert.equal((patch.match(new RegExp(MANAGED_PATCH_BEGIN, 'g')) ?? []).length, 1);
  assert.equal((patch.match(new RegExp(MANAGED_PATCH_END, 'g')) ?? []).length, 1);
  assert.equal((patch.match(/^  name:/gm) ?? []).length, 2);
  assert.equal(patch.includes('mcp-client:\n    config:'), false);
  assert.equal(patch.includes('@anthropic-ai/serena-mcp'), false);
  assert.equal(patch.includes('@isaacphi/mcp-language-server'), false);
  assert.equal(patch.includes('git+https://github.com/oraios/serena'), true);
  assert.equal(patch.includes('"--context", "claude-code"'), true);
  assert.match(patch, /id: "freecode-mcp-serena"[\s\S]*projectActivation:[\s\S]*toolName: "activate_project"[\s\S]*pathArgument: "project"/);
  assert.equal(patch.includes('--project-from-cwd'), false);
  assert.equal(patch.includes('mcp-language-server'), false);
});

test('managed patch replacement preserves unrelated user overlays', () => {
  const generated = renderMcpPatch(defaultMcpConfig());
  const existing = '- id: "user-overlay"\n  disabled: false\n';
  const once = mergeManagedPatch(existing, generated);
  const twice = mergeManagedPatch(once, generated);
  assert.match(twice, /user-overlay/);
  assert.equal((twice.match(new RegExp(MANAGED_PATCH_BEGIN, 'g')) ?? []).length, 1);
  assert.equal(twice, once);
});

test('MCP enable flags are the only mutable part of managed definitions', () => {
  const config = mergeMcpConfig({ servers: [{ id: 'serena', enabled: false }] });
  assert.equal(config.servers.find((server) => server.id === 'serena').enabled, false);
  assert.equal(config.servers.find((server) => server.id === 'free-search').enabled, true);
  assert.match(renderMcpPatch(config), /id: "freecode-mcp-serena"[\s\S]*disabled: true/);
  assert.match(renderMcpPatch(config), /id: "freecode-mcp-free-search"[\s\S]*disabled: false/);
});
