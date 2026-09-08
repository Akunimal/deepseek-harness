# FreeCode DeepSeek Harness v0.5.0

## English

### Anti-regression release

The failed candidate was traced to an upstream sync that removed the Electron
dialog bridge from the Win32 `directory-picker-native` source while the bundle
freshness check still accepted a bridge-free artifact. v0.5.0 restores the
authenticated bridge and makes the source markers, compiled bundle, hashes,
preflight, installer layout, and isolated `v0.4.3` upgrade smoke agree on the
same contract. A broken or truncated runtime now blocks packaging and points
the user to the last known-good `v0.4.3`.

### Main changes

- **Updater:** About reads the packaged Electron version; checks run at startup
  and every six hours. The update control is the same 34px circular primary
  button as Send, with the arrow pointing down. The tray tooltip/menu and a
  native notification report `Downloading update…` and then `Installing
  update…`. The installer is launched only after an explicit successful
  `downloadUpdate()` and `quitAndInstall(true)`.
- **Embedded MCP configuration:** Serena, TypeScript LSP, and Python LSP have
  preinstalled client/config entries enabled by default, with independent
  `enabled` switches in `<Electron userData>/dsh-home/mcp/servers.json`.
  External executables are intentionally explicit prerequisites (`uvx`, Go,
  and language servers); FreeCode does not silently download them.
- **Caveman and RTK:** Both are modular toggles in the Shell settings card.
  RTK defaults on only when already installed; Caveman defaults off and is
  never downloaded by FreeCode. Unsafe shell syntax is excluded.
- **Upstream maintenance:** Product changes are replayable patches under
  `patches/upstream/`, applied after an upstream subtree update in a stable,
  idempotent, fail-closed order.
- **Hardening:** allowlisted child-process environments, validated IPC,
  bounded OCR/request payloads, atomic settings/config writes, lifecycle
  mutexes, safe installer upgrade cleanup, repaired NSIS shortcuts with a
  correct `Start in` directory, and runtime closure verification. The smokes
  inspect the real Start Menu/Desktop `.lnk` files and remove only temporary
  links proven to point at the exact test directory.

### Upgrade

Update from `v0.4.3` using the Windows installer or portable build. Settings
and data remain in `%APPDATA%` for installed builds and the portable `data`
directory for portable builds. Linux users can use the AppImage; the first
launch may take time while the bundled runtime initializes.

---

## Español

### Release anti-regresiones

El candidato fallido se rastreó hasta un sync con upstream que eliminó el
bridge Electron del `directory-picker-native` de Win32 mientras el verificador
de bundles todavía aceptaba un artefacto sin bridge. v0.5.0 restaura el bridge
autenticado y hace que los markers de fuente, bundle compilado, hashes,
preflight, layout del instalador y smoke aislado de upgrade desde `v0.4.3`
compartan el mismo contrato. Un runtime roto o truncado bloquea el packaging y
indica `v0.4.3` como última versión buena conocida.

### Cambios principales

- **Updater:** Acerca de lee la versión real del Electron empaquetado; comprueba
  al iniciar y cada seis horas. El control de actualizar es el mismo botón
  circular primario de 34 px que Enviar, con la flecha hacia abajo. El tooltip y
  menú del tray, más una notificación nativa, informan `Descargando
  actualización…` y luego `Instalando actualización…`. El instalador sólo se
  lanza después de un `downloadUpdate()` explícito exitoso y
  `quitAndInstall(true)`.
- **Configuración MCP embebida:** Serena, LSP TypeScript y LSP Python tienen
  entradas de cliente/config preinstaladas y activas por defecto, con toggles
  independientes `enabled` en `<userData de Electron>/dsh-home/mcp/servers.json`.
  Los ejecutables externos son prerequisites explícitos (`uvx`, Go y language
  servers); FreeCode no los descarga silenciosamente.
- **Caveman y RTK:** Ambos son toggles modulares en la tarjeta Shell de
  Configuración. RTK se activa por defecto sólo si ya está instalado; Caveman
  queda desactivado y FreeCode nunca lo descarga. Se excluye sintaxis insegura.
- **Mantenimiento de upstream:** Las features del producto son patches
  reaplicables en `patches/upstream/`, después de actualizar el subtree, en un
  orden estable, idempotente y fail-closed.
- **Hardening:** ambientes de procesos allowlisteados, IPC validado, límites
  para OCR/requests, escrituras atómicas, mutexes de ciclo de vida, limpieza
  segura del upgrade del instalador, accesos directos NSIS reparados con
  `Iniciar en` correcto y verificación del cierre del runtime. Los smokes leen
  los `.lnk` reales y eliminan sólo links temporales del directorio exacto de
  prueba.

### Actualización

Actualizá desde `v0.4.3` usando el instalador de Windows o la versión portable.
Los ajustes y datos permanecen en `%APPDATA%` en builds instalados y en el
directorio portable `data` en el portable. En Linux se puede usar la AppImage;
el primer arranque puede tardar mientras inicializa el runtime incluido.

---

**Assets built and smoke-verified locally:**

- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-setup.exe` — 307,394,516 bytes — SHA-256 `c3e231ea1d5cbdfc85b211ca4363df968d2d1eb8a49a7a856666b9e648274cd0`
- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-setup.exe.blockmap` — 315,342 bytes — SHA-256 `495742d2ba2d53ff675b4da2fdae1fa62b0307e4549caf41ae3ba139bfe42b7c`
- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-portable.exe` — 307,232,024 bytes — SHA-256 `923e3d30cf32ca3f998f2e8e5bf209ad1e994bb2390d240528bef2cf546e8d1a`
- `FreeCode-DeepSeek-Harness-0.5.0-linux-x86_64.AppImage` — 450,080,401 bytes — SHA-256 `5878cb8529743524980a40b04848887dbe43c565f69398bad01a08c7e7a0d7ab`
- `deepseek-harness-runtime-0.1.3-alpha.1-win32-x64.tar.gz` — 208,855,139 bytes — SHA-256 `3f85e4dd31e04afdff2697b50545dbd3543aeaf498bc7290d43b654a03e3f1b2`
- `deepseek-harness-runtime-0.1.3-alpha.1-linux-x64.tar.gz` — 443,434,519 bytes — SHA-256 `6a50a5db9d482869329626ffa5f1e047e7ea61df7f7865d054f09f02c74bb403`
- `latest.yml` — 395 bytes — SHA-256 `8ff9e87b75aecc6a8f59e6a3228e9c71038e4732b30dd893f9a322d82be8ac4f`
- `latest-linux.yml` — 428 bytes — SHA-256 `178af63fdc1c0642922f2192d1e9ec25b9023689cbd799617d3a72a6a71c7348`

The Windows gate passed a clean NSIS install and an isolated `v0.4.3` to
`v0.5.0` upgrade. The Linux AppImage passed ELF, direct SquashFS entry,
desktop/app version, runtime-manifest, metadata hash, worker, tray, and
directory-picker bridge marker smokes. The final asset set is staged in
`release-assets-v0.5.0/` for the manual release upload.

Graphify `0.9.53` was refreshed against `apps/shell` with a reproducible
structural graph (433 nodes, 749 edges, 20 communities). Semantic LLM
extraction was not claimed because no Graphify API key was available.

**Source:** [`v0.4.3..v0.5.0`](https://github.com/Akunimal/free-code-deepseek-harness/compare/v0.4.3...v0.5.0)

The release is built and published manually after the local release gate; no
GitHub Actions release workflow is used.
