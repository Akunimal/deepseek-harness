# FreeCode DeepSeek Harness v0.5.0

## English

### Windows-only anti-regression release

0.5.0 publishes only Windows x64 NSIS and portable artifacts. Linux and macOS
are contributor-only manual build targets; no Linux/macOS binary is built or
uploaded for this release. The release gate requires a clean install and launch
and deliberately does not require upgrading an existing 0.4.3 installation.
`0.4.3` remains the last known-good recovery reference because it opens, but it
is not the source of truth for the current fixes.

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

- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-setup.exe` — 344,946,566 bytes —
  SHA-256 `1b6a18744114c6ba8361ee1d4a706a1b97c7725fa35e552ea7284595f4081f06`
- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-portable.exe` — 344,784,077 bytes —
  SHA-256 `01b9c7a9556728e4d6281c332201332482952f85d57973542892424d40f7faa5`
- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-setup.exe.blockmap` — 354,684 bytes —
  SHA-256 `a2e839771de8563efb8f61b8e0fb21492fa0b63f0dd5484d309cd8b1ac7f5190`
- `deepseek-harness-runtime-0.1.3-alpha.1-win32-x64.tar.gz` — 217,711,087
  bytes — SHA-256
  `1b8d719bb8b63e7f68ac9f32853033ef72c9dcb13d9de0cb24689249f6428179`
- matching `latest.yml` and `.sha256` files

The release is compiled and published manually from Windows. No GitHub Actions
workflow is used.

---

## Español

### Release anti-regresiones solo Windows

0.5.0 publica únicamente instalador NSIS y portable para Windows x64. Linux y
macOS quedan como targets manuales de contribuidores; no se compila ni sube
ningún binario de esos sistemas para esta release. El gate exige instalación y
apertura limpia y deliberadamente no exige actualizar una instalación existente
desde 0.4.3. `0.4.3` sigue siendo la referencia de recuperación conocida porque
abre bien, pero no es la fuente de verdad de los fixes actuales.

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

- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-setup.exe` — 344.946.566 bytes
- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-portable.exe` — 344.784.077 bytes
- `FreeCode-DeepSeek-Harness-0.5.0-win-x64-setup.exe.blockmap` — 354.684 bytes
- `deepseek-harness-runtime-0.1.3-alpha.1-win32-x64.tar.gz` — 217.711.087 bytes
- `latest.yml` y archivos `.sha256` correspondientes

La release se compila y publica manualmente desde Windows. No se usa ningún
workflow de GitHub Actions.

Graphify fue refrescado con un mapa estructural reproducible de `apps/shell`:
433 nodos, 749 aristas y 20 comunidades; no se afirmó extracción semántica
con LLM por falta de una API key de Graphify.
