#!/usr/bin/env node
/**
 * Copy the already-verified runtime stage into desktop resources.
 *
 * The hoisted install leaves a pnpm virtual store under node_modules/.pnpm.
 * Runtime resolution uses the materialized package directories at the root,
 * so shipping that store only increases copy time and payload surface. Keep
 * this copy fail-closed: callers must remove the exact generated destination
 * before invoking it.
 */
import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve(process.argv[2] ?? '');
const destination = path.resolve(process.argv[3] ?? '');
if (!source || !destination || !fs.existsSync(path.join(source, 'package.json'))) {
  throw new Error(`copy-runtime-stage: invalid source stage: ${source}`);
}
if (fs.existsSync(destination)) {
  throw new Error(`copy-runtime-stage: destination already exists; remove only the generated destination first: ${destination}`);
}

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.cpSync(source, destination, {
  recursive: true,
  filter(candidate) {
    const relative = path.relative(source, candidate);
    if (relative === '') return true;
    const parts = relative.split(path.sep);
    return !(parts[0] === 'node_modules' && (parts[1] === '.pnpm' || parts[1] === '.modules.yaml'));
  },
});

console.log(`copy-runtime-stage: copied verified stage to ${destination} without node_modules/.pnpm`);
