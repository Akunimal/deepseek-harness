#!/usr/bin/env node
/**
 * Verify the shortcuts created by the real NSIS installer.
 *
 * NSIS stores the current $OUTDIR as a shortcut's "Start in" directory. A
 * shortcut can therefore exist, point at a real executable, and still fail to
 * launch correctly when an upgrade leaves that field empty. Read the actual
 * .lnk files through WScript.Shell instead of treating their existence as a
 * sufficient installer contract.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHORTCUT_NAME = 'FreeCode DeepSeek Harness';

function normalizeWindowsPath(value) {
  return String(value ?? '').replaceAll('/', '\\').replace(/[\\]+$/, '').toLowerCase();
}

function inspectShortcuts(installDir) {
  const script = `
$ErrorActionPreference = 'Stop'
$appData = [Environment]::GetFolderPath('ApplicationData')
$commonAppData = [Environment]::GetFolderPath('CommonApplicationData')
$desktop = [Environment]::GetFolderPath('Desktop')
$startMenuRoots = @(
  (Join-Path $appData 'Microsoft\\Windows\\Start Menu\\Programs'),
  (Join-Path $commonAppData 'Microsoft\\Windows\\Start Menu\\Programs')
)
$startMenuLinks = @(
  foreach ($root in $startMenuRoots) {
    if (Test-Path -LiteralPath $root) {
      Get-ChildItem -LiteralPath $root -Filter '${SHORTCUT_NAME}.lnk' -File -Recurse -ErrorAction SilentlyContinue
    }
  }
)
$startMenuPaths = @($startMenuLinks | ForEach-Object { $_.FullName })
$desktopLink = Join-Path $desktop '${SHORTCUT_NAME}.lnk'
$shell = New-Object -ComObject WScript.Shell
$paths = @($startMenuPaths + $desktopLink | Where-Object { $_ } | Select-Object -Unique)
$result = @(
  if ($startMenuPaths.Count -eq 0) {
    [PSCustomObject]@{
      kind = 'start-menu'
      path = ($startMenuRoots -join '; ')
      present = $false
      targetPath = ''
      workingDirectory = ''
      error = 'missing'
    }
  }
  foreach ($path in $paths) {
    $kind = if ($path -eq $desktopLink) { 'desktop' } else { 'start-menu' }
  if (-not (Test-Path -LiteralPath $path)) {
    [PSCustomObject]@{ kind = $kind; path = $path; present = $false; targetPath = ''; workingDirectory = ''; error = 'missing' }
    continue
  }
  try {
    $shortcut = $shell.CreateShortcut($path)
    [PSCustomObject]@{
      kind = $kind
      path = $path
      present = $true
      targetPath = [string]$shortcut.TargetPath
      workingDirectory = [string]$shortcut.WorkingDirectory
      error = ''
    }
  } catch {
    [PSCustomObject]@{ kind = $kind; path = $path; present = $false; targetPath = ''; workingDirectory = ''; error = $_.Exception.Message }
  }
}
)
$result | ConvertTo-Json -Compress
`;
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const result = spawnSync('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encoded,
  ], {
    windowsHide: true,
    encoding: 'utf8',
    env: { ...process.env, FREECODE_VERIFY_INSTALL_DIR: installDir },
  });
  if (result.error) throw new Error(`PowerShell shortcut probe failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`PowerShell shortcut probe exited ${result.status}: ${(result.stderr || result.stdout).trim()}`);
  }
  try {
    const parsed = JSON.parse(result.stdout.trim());
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    throw new Error(`PowerShell shortcut probe returned invalid JSON: ${error.message}; output=${result.stdout.trim()}`);
  }
}

export function verifyInstalledShortcuts({ installDir, label = 'installed shortcuts' }) {
  if (process.platform !== 'win32') return;

  const absoluteInstallDir = resolve(installDir);
  const appExecutable = readdirSync(absoluteInstallDir).find(
    (name) => name.toLowerCase().endsWith('.exe') && !/^uninstall/i.test(name),
  );
  if (!appExecutable) throw new Error(`${label}: packaged application executable is missing from ${absoluteInstallDir}`);

  const expectedTarget = normalizeWindowsPath(join(absoluteInstallDir, appExecutable));
  const expectedWorkingDirectory = normalizeWindowsPath(absoluteInstallDir);
  const shortcuts = inspectShortcuts(absoluteInstallDir);
  const failures = [];

  const startMenuShortcuts = shortcuts.filter((shortcut) => shortcut.kind === 'start-menu');
  if (!startMenuShortcuts.some((shortcut) => shortcut.present)) {
    failures.push('Start Menu: no shortcut named FreeCode DeepSeek Harness.lnk was found in the user or common Programs folder');
  }

  for (const shortcut of shortcuts) {
    if (!shortcut.present) {
      if (shortcut.kind === 'start-menu') continue;
      failures.push(`${shortcut.path}: missing (${shortcut.error || 'unreadable'})`);
      continue;
    }
    if (normalizeWindowsPath(shortcut.targetPath) !== expectedTarget) {
      failures.push(`${shortcut.path}: target=${shortcut.targetPath || '<empty>'}, expected=${join(absoluteInstallDir, appExecutable)}`);
    }
    if (normalizeWindowsPath(shortcut.workingDirectory) !== expectedWorkingDirectory) {
      failures.push(`${shortcut.path}: working directory=${shortcut.workingDirectory || '<empty>'}, expected=${absoluteInstallDir}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`${label}: shortcut contract failed:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  }
  console.log(`verify-nsis-shortcuts: ${shortcuts.length} shortcuts target ${appExecutable} with working directory ${absoluteInstallDir}.`);
}

/**
 * Remove only shortcuts proven to belong to an exact temporary smoke install.
 * This prevents the release gate from leaving dead Desktop links behind when
 * an older NSIS uninstaller honored KeepShortcuts or failed after extraction.
 */
export function cleanupInstalledShortcuts({ installDir }) {
  if (process.platform !== 'win32') return;

  const expectedInstallDir = normalizeWindowsPath(resolve(installDir));
  const removed = [];
  for (const shortcut of inspectShortcuts(installDir)) {
    if (!shortcut.present) continue;
    const target = normalizeWindowsPath(shortcut.targetPath);
    const workingDirectory = normalizeWindowsPath(shortcut.workingDirectory);
    const belongsToInstall = target === expectedInstallDir
      || target.startsWith(`${expectedInstallDir}\\`)
      || workingDirectory === expectedInstallDir;
    if (!belongsToInstall) continue;
    unlinkSync(shortcut.path);
    removed.push(shortcut.path);
  }
  if (removed.length > 0) console.log(`verify-nsis-shortcuts: removed ${removed.length} temporary shortcut(s).`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const installDir = process.argv[2];
  if (!installDir || !existsSync(installDir)) {
    console.error('verify-nsis-shortcuts: usage: node scripts/verify-nsis-shortcuts.mjs <install-dir>');
    process.exit(2);
  }
  try {
    verifyInstalledShortcuts({ installDir });
  } catch (error) {
    console.error(`verify-nsis-shortcuts: ${error.message}`);
    process.exit(1);
  }
}
