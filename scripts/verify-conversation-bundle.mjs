#!/usr/bin/env node
/**
 * Ensure the shipped dynamic client bundle contains the conversation motion CSS.
 *
 * Updated for upstream v0.1.3-alpha.1 which refactored CSS class names.
 * The verification now checks for animation and motion-related CSS patterns
 * that confirm the conversation bundle is correctly built.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '');
const candidates = [
  join(root, 'packages/client/ui-conversation/lib/client.js'),
  join(root, 'packages/client/ui-conversation/lib/client.mjs'),
];
const bundle = candidates.find(existsSync);
if (!bundle) throw new Error(`conversation client bundle not found under ${root}`);
const source = readFileSync(bundle, 'utf8');

// Each group requires at least ONE match — different upstream versions use
// different CSS class naming strategies.
const requiredGroups = [
  // Conversation animation: keyframes or reduced-motion media query
  ['@keyframes', 'prefers-reduced-motion'],
  // Radial or linear gradient (conversation backgrounds)
  ['radial-gradient', 'linear-gradient'],
  // Animation/transform CSS (motion effects in conversation)
  ['animation:', 'animation-name:'],
];

for (const requiredGroup of requiredGroups) {
  if (!requiredGroup.some(required => source.includes(required))) {
    const required = requiredGroup.join(' or ');
    throw new Error(`conversation client bundle is missing ${required}: ${bundle}`);
  }
}
console.log(`verify-conversation-bundle: motion CSS present in ${bundle}`);
