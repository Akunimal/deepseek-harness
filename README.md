# FreeCode DeepSeek Harness

> Vibe coding on Windows with OpenCode Free models — open a project, describe what you want to build, and start.

[Leer en español](README.es.md)

![FreeCode with x-preview-f selected](docs/assets/capeng.jpg)

## English

## What is FreeCode?

FreeCode is the DeepSeek Harness desktop app with an OpenCode bridge already
configured. Its default free model pool comes from OpenCode Free. It gives you
a local coding workspace with chat, files, tools, sessions, and a persistent
embedded Chromium browser.

You do not need to install Node, pnpm, Git, OpenCode, or a separate worker
service to use the default Windows release. The optional Gemini Web provider
uses Python 3; FreeCode starts the bundled `gemini-web2api` bridge
automatically when Python is available.

## Start in three steps

1. Download the Windows installer or Linux AppImage from the [latest release](https://github.com/Akunimal/free-code-deepseek-harness/releases/latest).
2. Install FreeCode, open it, and choose your project folder.
3. Tell the model what you want to build in plain language.

The release also includes a Windows portable `.exe` if you do not want an
installer. The installer is the better choice for everyday use; the portable
build is useful when you want to carry the app with you. On Linux, download
the `.AppImage`, make it executable (`chmod +x`), and run it.

## What you get

- OpenCode Free models ready to use, including `x-preview-f` when it is available.
- A persistent Chromium browser for research and browser-based computer use.
- Headless tool calling for normal coding work; only the project selector needs
  to open a visible chooser when required.
- Sessions, workspaces, file tools, permissions, plans, questions, and the
  complete upstream Harness web experience.
- English, Spanish, and Chinese in the app, including native menus and tray.
- CSS conversation backgrounds with reduced-motion support.
- Automatic update checks with a small download-arrow indicator beside Settings when an update is ready.
- Automatic context compaction at 75% of the active model window, including when switching to a smaller-context model.
- Optional RTK output compression when an `rtk` executable is already installed; FreeCode never installs it automatically.
- Optional Caveman context compression (disabled by default) in Shell settings, below RTK. Compresses command output for token savings when the Caveman binary is installed separately.
- Optional `Gemini Web (local)` provider backed by the MIT-licensed
  [`gemini-web2api`](https://github.com/Sophomoresty/gemini-web2api) bridge.
  It listens on `127.0.0.1:8081` and does not replace the default OpenCode
  Free route. Real Gemini Pro routing requires the corresponding Gemini
  account cookie; without it, the upstream bridge falls back to Flash.

## A few practical limits

The OpenCode Free route is shared and can be limited by upstream IP/session
rate limits. That means a response can take a while or temporarily fail.
FreeCode keeps the last known-good model selection, gives slow `x-preview-f`
probes extra time, and retries transient network failures. More workers improve
concurrency; they do not create more quota.

The upstream provider endpoint can also become temporarily unavailable and
return `503`, even when the API key is valid. A subsequent model/provider
mismatch may be displayed as `API key is invalid`; switching to a provider with
a supported, healthy model can recover the request, but changing provider alone
is not a guarantee.

### Gemini Web provider

FreeCode seeds a `Gemini Web (local)` provider at
`http://127.0.0.1:8081/v1` and keeps its model catalog in sync. If Python 3 is
installed, the app starts the vendored bridge automatically. If not, install
Python and `httpx`, or run the bridge separately on that port; the normal
OpenCode Free provider keeps working either way.

The bridge configuration is created at the app's user-data directory under
`gemini-web2api/config.json`. You can set `FREECODE_GEMINI_WEB2API_PORT` or
`FREECODE_GEMINI_WEB2API_PYTHON` before launching FreeCode. The upstream bridge
supports anonymous Flash access, optional cookies for Pro routing, native web
search, tool calling, and OpenAI-compatible Chat Completions.

## Updating

FreeCode checks automatically. When an update is found, click the download arrow
beside Settings. Releases are built and uploaded manually, with no GitHub Actions
release workflow, so the repository does not spend its free CI quota. The release checklist and bilingual notes are in
[docs/RELEASE-POLICY.md](docs/RELEASE-POLICY.md).

### v0.5.0 anti-regression and release hardening

The failed `v0.5.0` installer candidate was traced to an upstream sync that
removed the Electron dialog bridge from the Win32 `directory-picker-native`
source while the bundle freshness check still accepted a bridge-free bundle.
That combination made the Windows project picker crash after installation.
The candidate was not treated as a release: the recovery baseline is the last
known-good `v0.4.3`.

The fix is now enforced at several independent boundaries:

- The Win32 picker uses the authenticated Electron dialog bridge and keeps a
  native fallback only for development/runtime situations where the bridge is
  unavailable.
- The preflight and vendored-bundle verifier require the bridge endpoint,
  token, request header, and fetch contract in the compiled bundle. A stale or
  bridge-free bundle fails before packaging; `--write` cannot bless an invalid
  bundle.
- The installer layout smoke checks the populated `dsh/apps/cli`, `packages`,
  `node_modules`, native modules, and bridge files. The upgrade smoke installs
  the candidate over an isolated copy of `v0.4.3`, removes stale payload files,
  and preserves user data.
- The NSIS smoke reads the real Start Menu and Desktop `.lnk` files. Both must
  target the installed executable and set `WorkingDirectory`/`Start in` to the
  install directory; exact temporary links are removed after the smoke so
  validation cannot leave dead shortcuts on the developer desktop.
- The error dialog says `v0.4.3` as the last stable recovery release in
  English, Spanish, and Chinese. About displays the actual packaged Electron
  version through `app.getVersion()`, so a `v0.5.0` binary cannot describe
  itself as an older release.
- Supervisor environment variables are allowlisted, IPC inputs are validated,
  OCR and request bodies are bounded, model/settings writes are atomic,
  lifecycle operations are serialized, and update installation refuses to run
  unless an explicit download completed successfully.
- The update button is the same 34px circular primary button used by Send,
  with the arrow pointing down. It checks immediately at startup and every
  six hours, and clicking it performs a fresh check before showing the
  release/runtime choice. While downloading, the tray tooltip and tray menu
  say `Downloading update…` (with a native notification); after the download,
  they say `Installing update…` until the restart. A confirmed application
  update is downloaded explicitly and then handed to `quitAndInstall(true)`;
  it is not reported as ready merely because a stale pending file exists.

#### Embedded MCP configuration

The MCP client bridge and catalog are shipped with FreeCode. On first boot the
app materializes three entries, all enabled by default, under the per-user
Harness home:

```text
<Electron userData>/dsh-home/mcp/servers.json
<Electron userData>/dsh-home/cordis.patch.yml
```

For a portable build, `<Electron userData>` is the portable `data` directory.
Change the `enabled` boolean for `serena`, `lsp-typescript`, or `lsp-python` in
`servers.json`; the app atomically regenerates only its marked block in
`cordis.patch.yml` and preserves unrelated user rows. The repository helper is
`pnpm setup:mcp --all`.

The client/configuration is preinstalled and active. The external server
executables are intentionally not downloaded silently into a release: Serena
uses `uvx`, while the LSP bridge uses Go plus the selected TypeScript/Python
language server. The setup command reports missing prerequisites and disables
only the affected entry instead of hiding a partial installation. Details are
in [docs/mcp-servers.md](docs/mcp-servers.md).

#### RTK and Caveman configuration

Both optimizers are modular shell features. Open the upstream Settings →
Plugins/Configuration → Shell card: RTK and Caveman have independent toggles
there, so a separate tab is unnecessary. RTK is enabled by default when its
already-installed executable is available; Caveman is disabled by default and
requires a separately installed executable. Missing tools are no-ops. Only
safe, plain commands are eligible; pipes, redirects, substitutions, quotes,
backslashes, and other shell syntax are left unchanged or rejected by the
safety boundary. RTK and Caveman are never downloaded by FreeCode.

#### Keeping upstream updateable

`vendor/deepseek-harness` is kept as the upstream subtree. Product behavior is
an ordered, reviewable overlay in `patches/upstream/`:

```text
upstream fetch/subtree pull
  → pnpm apply:upstream-patches
  → pnpm prepare:upstream
  → tests, typecheck, bundle verification, packaging
```

The current patches restore the Win32 dialog bridge, the embedded browser
tool, the RTK/Caveman shell features, FreeCode branding, and portable
cross-platform resolution for the upstream `tsdown` client build. The patch applier
is idempotent, sorted, limited to the vendor subtree, and fail-closed on a
partial or ambiguous application. Do not make a product fix directly in the
vendor directory: update its patch, refresh the relevant contract test, and
run the full gate. See [docs/UPSTREAM-PATCHING.md](docs/UPSTREAM-PATCHING.md).

#### Reproducible local build and verification

The release is built on a maintainer workstation; no GitHub Actions workflow
is required or used. On Windows, the complete gate is:

```powershell
pnpm install --frozen-lockfile
pnpm test:mcp
pnpm test
pnpm test:contract
pnpm typecheck
pnpm release:gate
```

`release:gate` reapplies the upstream patches, rebuilds the vendor runtime,
builds the Electron desktop app, verifies bundle hashes and runtime closure,
checks the Linux AppImage payload through WSL's SquashFS reader, and runs the
fresh-install plus `v0.4.3` upgrade smokes. The desktop builder produces the
NSIS installer and Windows portable executable in `apps/shell/release/`.

Linux is built locally through WSL, with Linux native dependencies selected by
the runtime packager rather than copied from Windows:

```powershell
wsl.exe -d Ubuntu -- bash -lc "cd /mnt/i/DeepSeek-Harness/free-code-deepseek-harness && CI=true pnpm install --frozen-lockfile && pnpm build:desktop"
```

The Linux build writes the AppImage and the matching Harness runtime artifact
to `apps/shell/release/`. The expected desktop assets are the Windows NSIS
installer, Windows portable executable, and Linux x86_64 AppImage. A release
is published only after the local gates pass and the assets are inspected.
The Linux artifact gate is also runnable directly from WSL:

```bash
pnpm verify:linux-appimage apps/shell/release/FreeCode-DeepSeek-Harness-0.5.0-linux-x86_64.AppImage
```

It reads the actual SquashFS entries (manifest, Linux worker, tray icon,
directory-picker bridge, app version, and `latest-linux.yml` hashes). This is
intentional: WSL's convenience `--appimage-extract` path can display selected
hard-linked entries as zero-byte files even when the AppImage data is valid.

The v0.5.0 local asset set was smoke-verified and staged in
`release-assets-v0.5.0/`: NSIS (307,394,516 bytes,
`c3e231ea1d5cbdfc85b211ca4363df968d2d1eb8a49a7a856666b9e648274cd0`),
portable (307,232,024 bytes,
`923e3d30cf32ca3f998f2e8e5bf209ad1e994bb2390d240528bef2cf546e8d1a`), and
Linux AppImage (450,080,401 bytes,
`5878cb8529743524980a40b04848887dbe43c565f69398bad01a08c7e7a0d7ab`). The
matching Win32 runtime (208,855,139 bytes,
`3f85e4dd31e04afdff2697b50545dbd3543aeaf498bc7290d43b654a03e3f1b2`) and
Linux runtime (443,434,519 bytes,
`6a50a5db9d482869329626ffa5f1e047e7ea61df7f7865d054f09f02c74bb403`),
blockmap, and `latest*.yml` metadata are staged there with their checksums;
see
[release-notes-v0.5.0.md](release-notes-v0.5.0.md) for the complete manifest
and smoke results.

The WSL packager also detects stale Windows/WSL `node_modules` links before the
web build and accepts the hoisted Vite entry produced by either platform. On
Linux/WSL, generated runtime replacement uses native `rm` for the exact
generated directories; on Windows it uses Node's retrying filesystem removal.
This keeps a cross-platform rebuild from silently reusing a broken Vite link or
stalling while replacing the previous runtime.
The source checkout may be shared, but `vendor/deepseek-harness/node_modules`
must be installed for one OS at a time: Windows junctions/native modules and
WSL symlinks/native modules are not interchangeable. When switching, reinstall
the generated vendor dependencies for the active OS; the link step now reports
this boundary explicitly instead of leaking a raw `EACCES`.

#### Graphify project map

The project map was refreshed with Graphify `0.9.53` after the v0.5.0 changes.
The scoped structural graph for `apps/shell` contains 433 nodes, 749 edges,
and 20 detected communities, with no import-cycle finding in the checked
graph. A full semantic/LLM extraction was not claimed because this workstation
has no Graphify LLM API key; the structural graph is the reproducible local
baseline and lives in `graphify-out/` for inspection. Re-run it with
`graphify extract apps/shell --code-only --no-viz --no-cluster --out .` (and
optionally `graphify cluster .`) when the source tree changes.

## For contributors

```bash
pnpm install
pnpm build:vendor
pnpm build
pnpm test
pnpm test:contract
pnpm build:desktop
```

More detail is available in [the architecture guide](docs/ARCHITECTURE.md),
[the feature inventory](docs/UPSTREAM-FEATURES.md),
[the release guide](docs/RELEASE.md), and
[the UI notes](docs/UI.md).

## Project

This is the public [Akunimal/free-code-deepseek-harness](https://github.com/Akunimal/free-code-deepseek-harness)
fork of [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).
The product branch is `main`; the upstream reference lives in
`vendor/deepseek-harness`.

MIT — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Español

> Vibecoding en Windows con modelos OpenCode Free: abrí un proyecto, describí lo que querés construir y empezá.

FreeCode es la aplicación de escritorio del DeepSeek Harness con un puente
OpenCode ya configurado. Su pool gratuito predeterminado usa modelos de
OpenCode Free. Te da un espacio local para programar con chat, archivos,
herramientas, sesiones y un navegador Chromium embebido con sesiones
persistentes.

No necesitás instalar Node, pnpm, Git, OpenCode ni un servicio separado de
workers para usar la release predeterminada de Windows. El provider opcional
Gemini Web usa Python 3 cuando lo seleccionás; FreeCode arranca el puente
`gemini-web2api` incluido cuando Python está disponible.

### Empezá en tres pasos

1. Descargá el instalador de Windows o la AppImage de Linux desde la [última release](https://github.com/Akunimal/free-code-deepseek-harness/releases/latest).
2. Instalá FreeCode, abrilo y elegí la carpeta de tu proyecto.
3. Contale al modelo en lenguaje natural qué querés construir.

La release también incluye un `.exe` portable si no querés instalar. Para uso
diario conviene el instalador; el portable sirve para llevar la aplicación a
otra carpeta o máquina. En Linux, descargá la `.AppImage`, dale permisos de
ejecución (`chmod +x`) y ejecutala.

### Qué incluye

- Modelos OpenCode Free listos para usar, incluido `x-preview-f` cuando está disponible.
- Navegador Chromium persistente para investigar y usar computer use desde el
  navegador.
- Tool calling headless para el trabajo normal; sólo el selector de proyecto
  abre un selector visible cuando hace falta.
- Sesiones, workspaces, herramientas de archivos, permisos, planes, preguntas
  y toda la experiencia web upstream del Harness.
- Inglés, español y chino en la aplicación, incluidos los menús nativos y la
  bandeja.
- Fondos CSS animados con soporte para reducir el movimiento.
- Comprobación automática de actualizaciones, con una flecha de descarga junto a Configuración cuando hay una nueva versión.
- Compactado automático al 75% del contexto del modelo activo, también al cambiar a un modelo con menor contexto.
- Compresión opcional de salidas con RTK si ya tenés el ejecutable `rtk`; FreeCode nunca lo instala automáticamente.
- Provider opcional `Gemini Web (local)` basado en el puente MIT
  [`gemini-web2api`](https://github.com/Sophomoresty/gemini-web2api). Escucha
  en `127.0.0.1:8081` y no reemplaza la ruta predeterminada OpenCode Free. El
  ruteo real a Gemini Pro requiere la cookie correspondiente de Gemini; sin
  ella, el puente upstream vuelve a Flash.

### Algunos límites prácticos

La ruta OpenCode Free es compartida y puede tener límites upstream por
IP/sesión. Una respuesta puede tardar o fallar temporalmente. FreeCode conserva
la última selección válida, da más tiempo a las probes lentas de `x-preview-f` y
reintenta fallos de red transitorios. Más workers mejoran la concurrencia, pero
no crean más cuota.

El endpoint del proveedor upstream también puede quedar temporalmente fuera de
servicio y devolver `503`, incluso cuando la API key es válida. Un desajuste
posterior entre proveedor y modelo puede mostrarse como `API key is invalid`;
cambiar a un proveedor con un modelo compatible y saludable puede recuperar la
solicitud, pero cambiar de proveedor por sí solo no lo garantiza.

### Provider Gemini Web

FreeCode siembra el provider `Gemini Web (local)` en
`http://127.0.0.1:8081/v1` y mantiene actualizado su catálogo de modelos. Si
tenés Python 3 instalado, la app arranca automáticamente el puente vendorizado.
Si no, instalá Python y `httpx`, o ejecutá el puente por separado en ese puerto;
el provider normal OpenCode Free sigue funcionando igual.

La configuración del puente se crea en el directorio de datos de la app, dentro
de `gemini-web2api/config.json`. Podés definir
`FREECODE_GEMINI_WEB2API_PORT` o `FREECODE_GEMINI_WEB2API_PYTHON` antes de abrir
FreeCode. El puente upstream soporta acceso Flash anónimo, cookies opcionales
para Pro, búsqueda web nativa, tool calling y Chat Completions compatible con
OpenAI.

### Actualización

FreeCode busca actualizaciones automáticamente. Cuando encuentra una, usá la
flecha de descarga junto a Configuración. Las releases se compilan y suben
manualmente, sin workflow de release de GitHub Actions, para no consumir la cuota
gratuita de CI. El checklist y las notas bilingües están en
[docs/RELEASE-POLICY.md](docs/RELEASE-POLICY.md).

### v0.5.0: actualización anti-regresiones y hardening

El instalador candidato `v0.5.0` que falló se rastreó hasta un sync con
upstream que eliminó el bridge Electron del `directory-picker-native` de
Win32, mientras el verificador de bundles todavía aceptaba un bundle sin ese
bridge. Esa combinación hacía que el selector de proyectos se rompiera
después de instalar. El candidato no se consideró release: la base de
recuperación es la última versión buena conocida, `v0.4.3`.

La corrección quedó protegida en varias fronteras independientes:

- El picker Win32 usa el bridge Electron autenticado y conserva un fallback
  nativo sólo para situaciones de desarrollo/runtime sin bridge.
- El preflight y el verificador de bundles exigen en el bundle compilado el
  endpoint, token, header y contrato `fetch` del bridge. Un bundle viejo o sin
  bridge falla antes de empaquetar; `--write` no puede aprobar uno inválido.
- El smoke del instalador exige `dsh/apps/cli`, `packages`, `node_modules`,
  módulos nativos y archivos del bridge poblados. El smoke de upgrade instala
  el candidato sobre una copia aislada de `v0.4.3`, elimina restos del payload
  viejo y conserva los datos del usuario.
- El smoke NSIS también lee los `.lnk` reales del menú Inicio y del Escritorio.
  Ambos deben apuntar al ejecutable instalado y tener `WorkingDirectory`/“Iniciar
  en” igual al directorio de instalación; los links temporales exactos se
  eliminan al terminar para no dejar accesos muertos en el escritorio.
- El diálogo de instalación incompleta menciona `v0.4.3` como última estable
  en español, inglés y chino. Acerca de usa `app.getVersion()`, por lo que un
  binario `v0.5.0` muestra su versión real y no una versión histórica.
- Las variables de entorno de supervisores están allowlisteadas, los payloads
  IPC están validados, OCR y requests tienen límites, las escrituras de
  settings son atómicas, el ciclo de vida usa mutexes y el updater se niega a
  instalar si no terminó un download explícito.
- El botón de actualización es exactamente el mismo botón circular primario de
  34 px que Enviar, con la flecha apuntando hacia abajo. Comprueba al iniciar
  y cada seis horas. Al hacer clic vuelve a comprobar, muestra la opción de
  release/runtime y, mientras descarga, el tooltip y el menú del tray indican
  `Descargando actualización…` (además de una notificación nativa); después
  indican `Instalando actualización…` hasta reiniciar. Para una actualización
  de la app, descarga explícitamente antes de llamar a `quitAndInstall(true)`.

#### Configuración de MCP embebidos

El bridge cliente y el catálogo MCP vienen dentro de FreeCode. En el primer
arranque la app materializa tres entradas, todas activadas por defecto, en el
home del Harness del usuario:

```text
<userData de Electron>/dsh-home/mcp/servers.json
<userData de Electron>/dsh-home/cordis.patch.yml
```

En el portable, `<userData de Electron>` es el directorio `data` junto al
ejecutable. Cambiá el booleano `enabled` de `serena`, `lsp-typescript` o
`lsp-python` en `servers.json`; la app regenera atómicamente sólo su bloque
marcado en `cordis.patch.yml` y conserva las filas propias del usuario. El
helper del checkout es `pnpm setup:mcp --all`.

La configuración y el bridge cliente están preinstalados y activos. Los
ejecutables de los servidores externos no se descargan silenciosamente dentro
del release: Serena usa `uvx`, y el bridge LSP usa Go más el servidor de
lenguaje TypeScript/Python elegido. El setup informa prerequisites faltantes y
desactiva sólo la entrada afectada. Ver [docs/mcp-servers.md](docs/mcp-servers.md).

#### Configuración de RTK y Caveman

Ambos optimizadores son features modulares del Shell. Abrí Configuración →
Plugins/Configuration → tarjeta Shell: RTK y Caveman tienen toggles separados,
por lo que no hace falta una tab nueva. RTK queda activado por defecto cuando
ya existe su ejecutable; Caveman queda desactivado por defecto y requiere su
ejecutable instalado aparte. Si falta una herramienta, no cambia nada. Sólo
se consideran comandos simples y seguros; pipes, redirecciones, sustituciones,
comillas, backslashes y otra sintaxis de shell quedan sin transformar o son
rechazados por la frontera de seguridad. FreeCode nunca descarga RTK ni
Caveman.

#### Upstream siempre actualizable

`vendor/deepseek-harness` se conserva como subtree upstream. Las features del
producto viven como overlay ordenado y revisable en `patches/upstream/`:

```text
fetch/pull de upstream
  → pnpm apply:upstream-patches
  → pnpm prepare:upstream
  → tests, typecheck, verificación de bundles y packaging
```

Los patches actuales restauran el bridge Win32, el browser tool embebido, las
features RTK/Caveman y el branding FreeCode. El aplicador es idempotente,
ordenado, limitado al subtree vendor y fail-closed ante aplicación parcial o
ambigua. No conviertas cambios de producto en ediciones permanentes dentro de
vendor: actualizá el patch, su contrato y ejecutá el gate completo. Ver
[docs/UPSTREAM-PATCHING.md](docs/UPSTREAM-PATCHING.md).

#### Build local reproducible y verificación

El release se compila desde una workstation del mantenedor, sin workflow de
GitHub Actions. En Windows, el gate completo es:

```powershell
pnpm install --frozen-lockfile
pnpm test:mcp
pnpm test
pnpm test:contract
pnpm typecheck
pnpm release:gate
```

`release:gate` reaplica los patches, recompila el runtime vendor, compila el
desktop Electron, verifica hashes y cierre del runtime, y corre los smokes de
instalación limpia y upgrade desde `v0.4.3`. El builder deja el instalador
NSIS y el portable de Windows en `apps/shell/release/`.

Linux se compila localmente con WSL usando dependencias nativas de Linux:

```powershell
wsl.exe -d Ubuntu -- bash -lc "cd /mnt/i/DeepSeek-Harness/free-code-deepseek-harness && CI=true pnpm install --frozen-lockfile && pnpm build:desktop"
```

El build Linux deja la AppImage y el runtime correspondiente en
`apps/shell/release/`. Los assets esperados son instalador NSIS de Windows,
portable de Windows y AppImage Linux x86_64. Sólo se publica después de que
los gates locales pasen y los assets sean inspeccionados.

### Para contribuir

```bash
pnpm install
pnpm build:vendor
pnpm build
pnpm test
pnpm test:contract
pnpm build:desktop
```

Más detalle en [la guía de arquitectura](docs/ARCHITECTURE.md),
[el inventario de funciones](docs/UPSTREAM-FEATURES.md),
[la guía de releases](docs/RELEASE.es.md) y
[las notas de UI](docs/UI.md), el [roadmap](docs/ROADMAP.md) y los
[problemas conocidos](docs/KNOWN-ISSUES.md).

### Proyecto

Este es el fork público [Akunimal/free-code-deepseek-harness](https://github.com/Akunimal/free-code-deepseek-harness)
de [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).
La rama de producto es `main` y la referencia upstream está en
`vendor/deepseek-harness`.

MIT — ver [LICENSE](LICENSE) y [NOTICE](NOTICE).

## Related projects / Proyectos relacionados

FreeCode integrates and builds on these open-source projects:

- [OpenCode2API](https://github.com/jasonxu114514/opencode2api) — local OpenCode-compatible bridge and worker pool used by the free-model route. / Puente local compatible con OpenCode y pool de workers usado por la ruta de modelos gratuitos.
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — upstream agent harness and plugin-based web runtime. / Harness de agentes upstream y runtime web basado en plugins.
- [gemini-web2api](https://github.com/Sophomoresty/gemini-web2api) — optional MIT-licensed OpenAI-compatible bridge for Gemini Web. / Puente opcional MIT compatible con OpenAI para Gemini Web.
- [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) — optional CLI output compressor that can reduce model-facing shell output. / Compresor opcional de salidas CLI que puede reducir lo que llega al contexto del modelo.
- [Caveman](https://github.com/JuliusBrussee/caveman) — optional external context-compression tool exposed through the Shell settings card, disabled by default and never bundled or installed by FreeCode. / Herramienta externa opcional de compresión de contexto expuesta en la tarjeta Shell de Configuración, deshabilitada por defecto y nunca incluida ni instalada por FreeCode.

RTK is not bundled, downloaded, or installed by FreeCode. When the RTK toggle is enabled and an `rtk` executable is already available, FreeCode wraps only eligible plain CLI commands; pipelines, redirects, substitutions, and other shell syntax are left unchanged. If RTK is missing, execution falls back to the original command.
