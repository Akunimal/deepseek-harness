/** Stable environment contract shared by the Electron shell and Harness child. */

export interface DialogBridgeEnv {
  endpoint: string
  fileOpenEndpoint: string
  token: string
}

/**
 * Build the shell-owned environment passed to the bundled Harness.
 * Keeping this pure makes the bridge plumbing test exercise the production
 * contract instead of duplicating the object literal in a test.
 */
export function buildHarnessExtraEnv(dialogBridge: DialogBridgeEnv | null): Record<string, string> {
  return {
    DSH_CLIENT_TITLE: 'FreeCode',
    ...(dialogBridge ? {
      FREECODE_DIALOG_BRIDGE_ENDPOINT: dialogBridge.endpoint,
      FREECODE_FILE_OPEN_ENDPOINT: dialogBridge.fileOpenEndpoint,
      FREECODE_DIALOG_BRIDGE_TOKEN: dialogBridge.token,
    } : {}),
  }
}
