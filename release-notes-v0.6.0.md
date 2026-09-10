# FreeCode DeepSeek Harness v0.6.0

## English

### Windows-only anti-regression release

0.6.0 officially publishes only Windows x64 NSIS and portable artifacts. Linux
and macOS remain contributor-only manual targets. Linux binaries may have been
generated locally during development, but they were not tested on a real Linux
system by the maintainer and require Linux testing before being considered
usable. No Linux/macOS binary is uploaded as an official 0.6.0 release asset.
The release gate requires a clean install and launch
and deliberately does not require upgrading an existing 0.4.3 installation.
`0.4.3` remains the last known-good recovery reference because it opens, but it
is not the source of truth for the current fixes.

### Known regression

The Spanish language option is not exposed in the 0.6.0 desktop selector. An
upstream vendor synchronization replaced the product's `zh`/`en`/`es` locale
catalog with upstream's `zh`/`en` catalog, and the existing tests did not guard
the required Spanish contract. This is documented as a release regression and
will be restored in a follow-up release; it is not an installer or Windows
packaging failure.

### Known packaging gap

The published 0.6.0 artifact does not bundle RTK; it still relies on an
optional user-installed executable. The managed MCP servers also rely on the
external/bootstrap `uvx` path and are not an offline dependency closure. The
next corrective release must bundle and verify RTK and every declared runtime
dependency before it is treated as self-contained.

### User-visible changes

- Removed Gemini2API completely: no Gemini process, provider, selector model,
  fallback or packaged resource remains. Existing unrelated providers and
  historical sessions are preserved during migration.
- Serena and free-search are bundled as managed MCP integrations, enabled by
  default and independently toggleable in Settings → Plugins → MCP. Readiness
  is real (`initialize → tools/list → schema validation → registration`),
  Serena activates the selected project explicitly, and search does not open a
  browser unless the user asks to view a result.
- Added live MCP state, errors and registered-tool counts in the MCP settings
  tab and tray. MCP, uvx, workers and OCR helpers are launched headlessly.
  Serena's own dashboard tray icon remains controlled by Serena's user config:
  use `web_dashboard_interface: app` or `tray_manager` when that icon is
  desired; FreeCode does not replace Serena's tray with its own summary.
- Caveman is on by default in the shell schema and configurable; RTK remains an
  optional user-installed executable and is never bundled, downloaded or
  falsely reported as active.
- Added bounded Tesseract OCR fallback for direct image attachments and
  `read_image` when the selected model has no vision support. Vision models
  keep the original image, and OCR failures are explicit.
- About uses the packaged Electron version. The update control matches Send
  with a downward arrow, checks at startup and every six hours, and reports
  download/install progress in the tray and native notifications.
- Hardened supervisor/worker generations, process-tree shutdown and spawn
  failures so stale exits cannot create duplicate dsh processes or visible
  helper windows.

### Upstream maintenance

The upstream subtree remains updateable. Product behavior is represented by an
ordered, idempotent, fail-closed patch stack under `patches/upstream/`; the
supported order is upstream update → apply patches → prepare → test/typecheck →
build/package.

### Verification

`pnpm release:gate` passed locally with exit code 0. It covered workspace tests,
contract tests, typechecks, Windows ACL paths, fresh vendor bundles, runtime
closure, Electron ABI 133 native rebuild, real Serena/free-search MCP
initialize/tools/list/tool calls, provider tool registration, a fresh NSIS
install, shortcut working directories, headless startup, descendant-window
enumeration, uninstall and cleanup.

Assets built locally and ready for the manual Windows release upload:

- `FreeCode-DeepSeek-Harness-0.6.0-win-x64-setup.exe` — 344,947,704 bytes —
  SHA-256 `b1007cc1e3acc2d8a992d1196aff0787f2823e12bc8676d9b08ef7a2acc6758a`
- `FreeCode-DeepSeek-Harness-0.6.0-win-x64-portable.exe` — 344,785,217 bytes —
  SHA-256 `a1bc784b0c729a39c81f9bddb6525a4b86e6917c935a07d9e76541234429c98a`
- `FreeCode-DeepSeek-Harness-0.6.0-win-x64-setup.exe.blockmap` — 354,566 bytes —
  SHA-256 `10bc1ad1c407360cdd2c9146e0bbfe06d90b56a1b5d720d00024e54c40ae1d1a`
- `deepseek-harness-runtime-0.1.3-alpha.1-win32-x64.tar.gz` — 217,725,115
  bytes — SHA-256
  `1e324799bd7d8cdcb2a2feda2d580b246f4d62f891321fbd70864a566fbd232b`
- matching `latest.yml` and `.sha256` files

The release is compiled and published manually from Windows. No GitHub Actions
workflow is used.

---

## Español

### Release anti-regresiones solo Windows

0.6.0 publica oficialmente únicamente instalador NSIS y portable para Windows
x64. Linux y macOS quedan como targets manuales de contribuidores. Durante el
desarrollo pudieron generarse binarios Linux localmente, pero no fueron
probados en un sistema Linux real porque el mantenedor usa Windows; necesitan
testing en Linux antes de considerarse utilizables. No se sube ningún binario
Linux/macOS como asset oficial de la release 0.6.0. El gate exige instalación y
apertura limpia y deliberadamente no exige actualizar una instalación existente
desde 0.4.3. `0.4.3` sigue siendo la referencia de recuperación conocida porque
abre bien, pero no es la fuente de verdad de los fixes actuales.

### Regresión conocida

La opción de idioma español no aparece en el selector de escritorio de 0.6.0.
Una sincronización del vendor con upstream reemplazó el catálogo propio
`zh`/`en`/`es` por el catálogo upstream `zh`/`en`, y los tests existentes no
protegían el contrato obligatorio de español. Queda documentado como una
regresión de esta release y se restaurará en una release posterior; no es un
fallo del instalador ni del packaging de Windows.

### Faltante conocido de empaquetado

El artefacto publicado de 0.6.0 no incluye RTK; todavía depende de un
ejecutable opcional instalado por el usuario. Los MCP administrados también
dependen de la ruta externa o bootstrap de `uvx` y no forman una clausura de
dependencias offline. La próxima release correctiva debe incluir y verificar
RTK y cada dependencia runtime declarada antes de considerarse autocontenida.

### Cambios visibles

- Gemini2API fue eliminado por completo: no quedan proceso Gemini, provider,
  modelo del selector, fallback ni recurso empaquetado. La migración conserva
  providers ajenos y sesiones históricas.
- Serena y free-search vienen como MCP administrados, preinstalados, activos
  por defecto y alternables en Configuración → Plugins → MCP. La readiness es
  real (`initialize → tools/list → validación de schemas → registro`), Serena
  activa explícitamente el proyecto elegido y buscar no abre el navegador salvo
  que el usuario pida ver un resultado.
- La tab MCP y la tray muestran estado, errores y cantidad de tools registradas.
  MCP, uvx, workers y OCR se ejecutan headless.
  El icono de tray propio de Serena sigue dependiendo de su configuración global:
  usá `web_dashboard_interface: app` o `tray_manager`; FreeCode no reemplaza
  esa tray por su resumen.
- Caveman queda activado por defecto en el schema del shell y es configurable;
  RTK sigue siendo un ejecutable opcional instalado por el usuario, nunca
  incluido, descargado ni mostrado como activo sin existir.
- Se agregó fallback OCR acotado con Tesseract para adjuntos directos y
  `read_image` cuando el modelo no tiene visión. Los modelos con visión
  conservan la imagen y los fallos de OCR son explícitos.
- About usa la versión del Electron empaquetado. El control de actualizar es
  igual a Enviar con flecha hacia abajo, chequea al iniciar y cada seis horas,
  y avisa descarga/instalación mediante tray y notificación nativa.
- Se endurecieron generaciones de supervisor/workers, cierre del árbol de
  procesos y errores de spawn para impedir dsh duplicados y ventanas visibles.

### Mantenimiento upstream

El subtree upstream queda actualizable. El comportamiento propio está en un
stack ordenado, idempotente y fail-closed bajo `patches/upstream/`; el orden es
actualizar upstream → aplicar patches → preparar → test/typecheck →
build/package.

### Verificación

`pnpm release:gate` pasó localmente con código 0. Cubrió tests, contratos,
typechecks, ACL de Windows, bundles frescos, cierre del runtime, rebuild nativo
ABI 133 de Electron, initialize/tools/list/tool calls reales de Serena y
free-search, registro de tools en el provider, instalación NSIS limpia,
working directory de accesos directos, arranque headless, enumeración de
ventanas descendientes, desinstalación y limpieza.

Artefactos compilados localmente y listos para la carga manual de Windows:

- `FreeCode-DeepSeek-Harness-0.6.0-win-x64-setup.exe` — 344.947.704 bytes
- `FreeCode-DeepSeek-Harness-0.6.0-win-x64-portable.exe` — 344.785.217 bytes
- `FreeCode-DeepSeek-Harness-0.6.0-win-x64-setup.exe.blockmap` — 354.566 bytes
- `deepseek-harness-runtime-0.1.3-alpha.1-win32-x64.tar.gz` — 217.725.115 bytes
- `latest.yml` y archivos `.sha256` correspondientes

La release se compila y publica manualmente desde Windows. No se usa ningún
workflow de GitHub Actions.

Graphify fue refrescado con un mapa estructural reproducible de `apps/shell`:
433 nodos, 749 aristas y 20 comunidades; no se afirmó extracción semántica
con LLM por falta de una API key de Graphify.
