#!/usr/bin/env node
/**
 * verify-doc-stale-claims.mjs — Phase 0 stale-claim gate for 0.7.0.
 *
 * Fails if any current-language doc (README.md, README.es.md, RELEASE.md,
 * RELEASE.es.md) makes a claim that is no longer true for the 0.6.0 baseline
 * or the in-progress 0.7.0 build:
 *
 *   1. Claims an absent executable is bundled (RTK, uvx, Gemini, etc.)
 *   2. Claims the polling window probe proves zero visible windows
 *   3. Claims an old version (pre-0.6.0) is the current release without an
 *      explicit historical label
 *   4. Claims 0.6.0 is "fully self-contained"
 *   5. Claims "RTK.*optional" in a way that implies it is packaged
 *
 * Historical release notes (docs/RELEASE-NOTES-v*.md) are excluded — they
 * are intentionally preserved as-is.
 *
 * Usage:
 *   node scripts/verify-doc-stale-claims.mjs [--repo-root <path>]
 *
 * Exit 0 = clean, Exit 1 = stale claim found.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CURRENT_VERSION = '0.6.0';
const NEXT_VERSION = '0.7.0';

/** Files to scan (relative to repo root). */
const TARGET_FILES = [
  'README.md',
  'README.es.md',
  'docs/RELEASE.md',
  'docs/RELEASE.es.md',
];

/**
 * Regex patterns that indicate a stale claim.
 * Each entry: { pattern, description, allowIfHistorical: bool }
 *
 * `allowIfHistorical` — if true, the match is allowed when preceded by
 * words like "historical", "past", "was", "previous", "before" on the same
 * line, indicating the doc is referencing an older state intentionally.
 */
const STALE_PATTERNS = [
  {
    id: 'fully-self-contained',
    pattern: /fully self-contained/gi,
    description:
      '0.6.0 must NOT be described as fully self-contained (RTK absent, MCP bootstrap external)',
  },
  {
    id: 'absent-executable-bundled',
    pattern:
      /(?:RTK|rtk)\s+(?:is\s+)?(?:included|bundled|packaged|present\s+in\s+(?:the\s+)?(?:payload|installer|release))/gi,
    description: 'RTK is NOT in the 0.6.0 payload — do not claim it is bundled',
  },
  {
    id: 'uvx-bundled',
    pattern:
      /(?:uvx|uv\/uvx)\s+(?:is\s+)?(?:included|bundled|packaged|part\s+of\s+the\s+(?:closure|payload|installer))/gi,
    description:
      'uvx/uv is NOT bundled in 0.6.0 — MCP servers still bootstrap externally',
  },
  {
    id: 'polling-proves-zero-windows',
    pattern:
      /(?:polling|probe|snapshot)\s+(?:confirms?|proves?|shows?|demonstrates?)\s+(?:zero|no|0)\s+(?:visible\s+)?(?:helper\s+)?windows/gi,
    description:
      'Polling probe can miss transient flashes — only the event-level 0.7.0 trace can prove zero windows',
  },
  {
    id: 'zero-windows-claimed',
    pattern:
      /(?:there\s+(?:are|is)\s+)?zero\s+(?:visible\s+)?(?:helper\s+)?(?:win32\s+)?windows\s+(?:during|in|on)/gi,
    description:
      'Do not claim zero visible windows without event-level evidence (0.7.0 Phase 3)',
  },
  {
    id: 'old-version-current',
    pattern:
      /(?:v?0\.[0-3]\.[0-9]+)\s+is\s+(?:the\s+)?(?:current|latest|most\s+recent)\s+(?:version|release)/gi,
    description:
      'Old version (pre-0.6.0) must not be labeled as current without "historical" or "recovery reference"',
  },
  {
    id: 'gemini-present',
    pattern:
      /Gemini(?:2API)?\s+(?:is\s+)?(?:included|bundled|available|active|present)/gi,
    description:
      'Gemini2API was removed from 0.6.0 runtime — do not claim it is present',
  },
  {
    id: 'independent-lsp-present',
    pattern:
      /(?:independent|separate)\s+(?:LSP|language\s+server)\s+(?:is\s+)?(?:included|bundled|available|active)/gi,
    description:
      'Independent LSP entries were removed; Serena is the semantic MCP surface',
  },
  {
    id: 'window-probe-sufficient',
    pattern:
      /(?:the\s+)?(?:window|win32|conhost)\s+probe\s+(?:is\s+)?(?:sufficient|complete|adequate|enough)/gi,
    description:
      'Window polling probe is NOT sufficient — event-level trace needed (0.7.0 Phase 3)',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let repoRoot = resolve(process.cwd());
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo-root' && args[i + 1]) {
      repoRoot = resolve(args[++i]);
    }
  }
  return { repoRoot };
}

/**
 * Check if a line has a historical-context word near the start of the line.
 */
function hasHistoricalContext(line) {
  const lower = line.toLowerCase();
  return /\b(?:historical|past|was|previous|before|earlier|legacy|former|old|superseded)\b/.test(
    lower
  );
}

/**
 * Check if the match is negated in context.
 * Looks for negation words before the match within the same sentence.
 */
function isNegated(content, matchIndex) {
  // Look back up to 500 chars or 2 sentence-starts for negation
  // (handles multi-line sentences in markdown)
  const lookback = content.slice(Math.max(0, matchIndex - 500), matchIndex).toLowerCase();

  return /\b(?:not|never|no\s+longer|must\s+not|cannot|can't|don't|doesn't|didn't|won't|wouldn't|shouldn't|isn't|aren't|wasn't|weren't|neither|without|lack(?:ing|s)?|did\s+not)\b/.test(
    lookback
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const { repoRoot } = parseArgs();

const failures = [];
const warnings = [];

for (const relFile of TARGET_FILES) {
  const absPath = join(repoRoot, relFile);
  if (!existsSync(absPath)) {
    warnings.push(`File not found (skipped): ${relFile}`);
    continue;
  }

  const content = readFileSync(absPath, 'utf-8');
  const lines = content.split('\n');

  for (const { id, pattern, description } of STALE_PATTERNS) {
    // Reset regex lastIndex for each file
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Find which line this match is on
      const beforeMatch = content.slice(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      const line = lines[lineNum - 1] || '';

      // Allow if the line has explicit historical context or is negated
      if (hasHistoricalContext(line) || isNegated(content, match.index)) {
        continue;
      }

      failures.push({
        file: relFile,
        line: lineNum,
        rule: id,
        description,
        matched: match[0].trim(),
        context: line.trim(),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`\n=== verify-doc-stale-claims ===`);
console.log(`Scanned: ${TARGET_FILES.length} files`);
console.log(`Patterns: ${STALE_PATTERNS.length} rules\n`);

if (warnings.length > 0) {
  console.log('Warnings:');
  for (const w of warnings) {
    console.log(`  ⚠ ${w}`);
  }
  console.log('');
}

if (failures.length === 0) {
  console.log('✅ No stale claims found.\n');
  process.exit(0);
}

console.log(`❌ Found ${failures.length} stale claim(s):\n`);
for (const f of failures) {
  console.log(`  Rule:    ${f.rule}`);
  console.log(`  File:    ${f.file}:${f.line}`);
  console.log(`  Matched: "${f.matched}"`);
  console.log(`  Context: ${f.context}`);
  console.log(`  Why:     ${f.description}`);
  console.log('');
}

process.exit(1);
