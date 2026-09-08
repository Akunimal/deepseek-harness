import fs from 'node:fs';
import path from 'node:path';

// The upstream loader imports enabled plugins by package name at runtime. In a
// normal pnpm isolated install those workspace packages are linked only from
// their declaring app, while the loader resolves them from its own ancestor
// chain. Keep the checkout runnable without copying the full portable stage by
// adding junctions/dir symlinks for the upstream @deepseek-ai workspace names.

const root = path.resolve(import.meta.dirname, '..');
const vendor = path.join(root, 'vendor', 'deepseek-harness');
const packageDirs = new Map();
const roots = ['apps', 'packages', 'native', 'vendor'].map((name) => path.join(vendor, name));

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile() || entry.name !== 'package.json') continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (typeof manifest.name === 'string' && manifest.name.startsWith('@deepseek-ai/')) {
        packageDirs.set(manifest.name, path.dirname(full));
      }
    } catch {
      // Ignore non-package JSON and leave the install to report real errors.
    }
  }
}

for (const rootDir of roots) walk(rootDir);

const scopeDir = path.join(vendor, 'node_modules', '@deepseek-ai');
fs.mkdirSync(scopeDir, { recursive: true });

function removePreviousLink(destination) {
  try {
    const stat = fs.lstatSync(destination, { throwIfNoEntry: false });
    if (stat) fs.rmSync(destination, { recursive: true, force: true });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 'EACCES' || code === 'EPERM') {
      throw new Error([
        `Cannot replace upstream workspace link: ${destination}`,
        'vendor/deepseek-harness/node_modules was created by another OS',
        'and is not safely shareable between Windows and WSL.',
        'Remove only that generated node_modules link scope from the same OS,',
        'then rerun the command.',
      ].join(' '));
    }
    throw error;
  }
}

for (const [name, packageDir] of packageDirs) {
  const packageName = name.slice('@deepseek-ai/'.length);
  const destination = path.join(scopeDir, packageName);
  removePreviousLink(destination);
  fs.symlinkSync(packageDir, destination, process.platform === 'win32' ? 'junction' : 'dir');
}

console.log(`link-upstream-workspace-packages: linked ${packageDirs.size} packages`);
