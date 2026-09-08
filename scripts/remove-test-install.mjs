#!/usr/bin/env node

import { existsSync, rmSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

/**
 * Remove an installer smoke directory after NSIS has uninstalled it.
 *
 * Windows can keep the uninstaller, updater, or an antivirus scan handle open
 * for a short period after the process reports success. A single recursive
 * rmSync therefore makes an otherwise passing smoke test flaky. Retry the
 * exact temporary directory, and still fail if it remains after the bounded
 * cleanup window.
 */
export async function removeTestInstall(installDir, {
  attempts = 60,
  delayMs = 1_000,
  label = 'installer smoke directory',
  beforeAttempt,
} = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { beforeAttempt?.(); } catch { /* cleanup must still retry the exact path */ }
    try {
      rmSync(installDir, { recursive: true, force: true });
      if (!existsSync(installDir)) return;
    } catch (error) {
      lastError = error;
    }
    if (attempt + 1 < attempts) await delay(delayMs);
  }

  const reason = lastError?.message ?? 'directory still exists after retries';
  throw new Error(`${label} could not be removed after ${attempts} attempts: ${reason}`);
}
