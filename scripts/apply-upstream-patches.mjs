import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const patchDir = join(root, 'patches', 'upstream');
const vendorPrefix = 'vendor/deepseek-harness/';

function runGit(args) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
}

function patchTargetsVendorOnly(contents, patchPath) {
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^(?:---|\+\+\+) (?:a|b)\/(.+?)(?:\t.*)?$/);
    if (match === null || match[1] === '/dev/null') continue;
    if (!match[1].startsWith(vendorPrefix)) {
      throw new Error(`upstream patch escapes vendor prefix: ${relative(root, patchPath)} -> ${match[1]}`);
    }
  }
}

if (!existsSync(patchDir)) throw new Error(`missing upstream patch directory: ${relative(root, patchDir)}`);
const patches = readdirSync(patchDir)
  .filter(name => name.endsWith('.patch'))
  .sort()
  .map(name => join(patchDir, name));
if (patches.length === 0) throw new Error('no upstream patches found');

const patchedPaths = new Set();

for (const patchPath of patches) {
  const contents = readFileSync(patchPath, 'utf8');
  patchTargetsVendorOnly(contents, patchPath);
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^(?:---|\+\+\+) (?:a|b)\/(.+?)(?:\t.*)?$/);
    if (match !== null && match[1] !== '/dev/null') patchedPaths.add(match[1]);
  }
  const display = relative(root, patchPath);
  const check = runGit(['apply', '--check', '--whitespace=nowarn', patchPath]);
  if (check.status === 0) {
    const apply = runGit(['apply', '--whitespace=nowarn', patchPath]);
    if (apply.status !== 0) {
      throw new Error(`failed to apply ${display}:\n${apply.stderr || apply.stdout}`);
    }
    console.log(`apply-upstream-patches: applied ${display}`);
    continue;
  }

  const reverse = runGit(['apply', '--check', '--reverse', '--whitespace=nowarn', patchPath]);
  if (reverse.status === 0) {
    console.log(`apply-upstream-patches: already applied ${display}`);
    continue;
  }

  throw new Error(
    `upstream patch does not apply cleanly: ${display}\n` +
    `${check.stderr || check.stdout}\n` +
    'Refresh the patch against the new upstream snapshot before building.',
  );
}

// Checking the whole 2k-commit upstream subtree is needlessly expensive on
// WSL over a Windows-mounted checkout. The stack already enumerates its exact
// touched paths above, so keep the same invariant while making the check
// bounded and deterministic.
const whitespace = runGit(['diff', '--check', '--', ...patchedPaths]);
if (whitespace.status !== 0) {
  throw new Error(`patched upstream tree has whitespace errors:\n${whitespace.stdout || whitespace.stderr}`);
}

console.log(`apply-upstream-patches: ${patches.length} modular patch set(s) ready`);
