import { execFileSync, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

// The vendored upstream tree is intentionally not a second Git repository.
// Its stale worktree pointer can exist after a WSL/Windows checkout switch,
// while upstream's client metadata helper still calls `git rev-parse HEAD`
// inside the vendor directory. Build from the authoritative outer checkout and
// pass that immutable source revision explicitly; this keeps local builds
// deterministic without mutating the vendor's Git metadata.
const root = resolve(import.meta.dirname, '..')
const vendor = resolve(root, 'vendor', 'deepseek-harness')
const inherited = process.env.DSH_CLIENT_COMMIT_HASH
const commit = inherited ?? execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
}).trim()

if (!/^[0-9a-f]{7,40}$/iu.test(commit)) {
  throw new Error(`build-vendor-local: invalid DSH_CLIENT_COMMIT_HASH ${JSON.stringify(commit)}`)
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const result = spawnSync(pnpm, ['--dir', vendor, 'build'], {
  cwd: root,
  env: { ...process.env, DSH_CLIENT_COMMIT_HASH: commit },
  // Windows exposes pnpm through a .cmd shim in many developer installs.
  // This is a trusted build command, not an application child process; use
  // the platform shim only here so the shipped runtime remains shell:false.
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
