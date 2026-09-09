import fs from 'node:fs';
import path from 'node:path';

const stage = path.resolve(process.argv[2] ?? '');
if (!stage || !fs.existsSync(path.join(stage, 'package.json'))) {
  throw new Error(`runtime stage not found: ${stage}`);
}

const packageDirs = [];
const roots = ['apps', 'packages', 'native', 'vendor'].map((name) => path.join(stage, name));

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === 'package.json') {
      try {
        const manifest = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (typeof manifest.name === 'string' && manifest.name.startsWith('@deepseek-ai/')) {
          packageDirs.push({ dir: path.dirname(full), name: manifest.name });
        }
      } catch {
        // Non-package JSON files are not part of the workspace graph.
      }
    }
  }
}

for (const root of roots) walk(root);

const rootModules = path.join(stage, 'node_modules');
fs.mkdirSync(rootModules, { recursive: true });
for (const { dir, name } of packageDirs) {
  const [scope, packageName] = name.split('/');
  const destination = path.join(rootModules, scope, packageName);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(dir, destination, {
    recursive: true,
    filter(source) {
      const relative = path.relative(dir, source);
      return relative === '' || !relative.split(path.sep).includes('node_modules');
    },
  });
}

// The stage is installed with pnpm's hoisted linker. All runtime dependencies,
// including native optional packages, therefore live in stage/node_modules and
// are checked by package-runtime.sh after this step. Workspace package
// node_modules entries are only pnpm links/shims; recursively searching them for
// native binaries made Windows packaging spend unbounded time walking junctions
// and generated the same class of unreliable "built but not runnable" artifact
// this script is meant to prevent.
let removedNestedNodeModules = 0;
function removeNestedNodeModules(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' && dir !== stage) {
      const nmPath = path.join(dir, entry.name);
      fs.rmSync(nmPath, { recursive: true, force: true });
      removedNestedNodeModules += 1;
      continue;
    }
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      removeNestedNodeModules(path.join(dir, entry.name));
    }
  }
}

for (const root of roots) removeNestedNodeModules(root);

// pnpm's command shims are useful in a checkout but are not needed by the
// runtime entrypoint. Remove only the locations that can exist in this
// materialized layout. Walking the entire hoisted dependency tree here is
// needlessly expensive on Windows and can traverse thousands of package files.
const binDirectories = new Set([
  path.join(stage, 'node_modules', '.bin'),
  ...packageDirs.map(({ dir }) => path.join(dir, '.bin')),
]);
let removedBinDirectories = 0;
for (const binDirectory of binDirectories) {
  if (fs.existsSync(binDirectory)) {
    fs.rmSync(binDirectory, { recursive: true, force: true });
    removedBinDirectories += 1;
  }
}

console.log(`materialize-runtime: copied ${packageDirs.length} workspace packages into ${rootModules}; removed ${removedNestedNodeModules} nested node_modules directories and ${removedBinDirectories} .bin directories`);
