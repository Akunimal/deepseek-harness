# FreeCode DeepSeek Harness

Programación en Windows con modelos OpenCode Free: elegí un proyecto,
describí el trabajo y dejá que el Harness coordine archivos, herramientas,
servidores MCP y llamadas al modelo.

[Read this in English](README.md)

## Español

## Alcance de 0.5.0

0.5.0 es una release anti-regresiones para Windows x64. Publica únicamente:

- un instalador NSIS;
- un ejecutable portable de Windows.

Linux y macOS quedan como targets manuales para contribuidores. Durante el
desarrollo pudieron generarse binarios Linux localmente, pero no fueron
probados en un Linux real porque el mantenedor usa Windows; necesitan testing
en Linux antes de considerarse utilizables. No se sube ningún binario
Linux/macOS como asset oficial de la release 0.5.0. Las compilaciones son
locales y no usan workflows de GitHub Actions.

\`0.4.3\` es la última referencia operativa conocida porque abre bien. No es la
fuente de verdad y puede no contener los fixes de este worktree. El gate de
0.5.0 exige instalación limpia y apertura correcta; no exige actualizar una
instalación existente desde 0.4.3.

El candidato que falló al instalar no se publicó. El texto de recuperación de
instalación incompleta menciona \`0.4.3\` como última estable, y el tag/release
final se crea recién cuando todos los gates locales están verdes. Ver el
[estado](docs/STATE-0.5.0.md) y el [roadmap](docs/ROADMAP-0.5.0.md).

## Qué incluye

- Ruteo de modelos OpenCode Free mediante el pool local compatible con OpenCode.
- La UI upstream de DeepSeek Harness, sesiones, workspaces, permisos y
  herramientas de archivos.
- Una sola shell Electron y una sola generación del proceso \`dsh\`.
- Serena y free-search como integraciones MCP administradas, preinstaladas en
  el catálogo y activadas por defecto.
- Una tab Configuración → Plugins → MCP con toggles, estado de conexión,
  cantidad de herramientas registradas, errores y ruta de configuración.
- Configuración de Caveman en la tarjeta Shell, activada por defecto en el
  schema del shell; si falta el ejecutable queda como no-op explícito.
- RTK como opción separada; se detecta explícitamente y no se muestra como
  usado si no existe el ejecutable.
- FreeCode no incluye, descarga ni instala RTK; sigue siendo un ejecutable
  opcional administrado por el usuario.
- Tesseract incluido en Windows para los flujos de imágenes de modelos text-only.
- Navegador embebido persistente solamente cuando el usuario lo abre.
- Versión real en About, botón de actualizar igual a Enviar con flecha hacia
  abajo y avisos de tray durante descarga/instalación.

Gemini2API fue eliminado del runtime de 0.5.0. No queda proceso, provider,
modelo del selector, recurso empaquetado ni fallback Gemini para configurar.
También se eliminaron las entradas LSP independientes: Serena es la superficie
semántica MCP.

## Instalación y primer uso

1. Descargá el setup o portable de Windows de la release final.
2. Instalalo o descomprimilo y abrí el acceso directo/ejecutable real.
3. Elegí la carpeta de tu proyecto en el picker.
4. Pedile al modelo que inspeccione o modifique el proyecto.

El instalador incluye Electron, el runtime upstream del Harness, el binario del
pool OpenCode, dependencias nativas y Tesseract. Si detecta una instalación
incompleta, muestra el log y recomienda el instalador oficial \`v0.4.3\` como
última referencia estable para recuperarse.

El bootstrap de Windows reutiliza silenciosamente un \`uvx.exe\` ya instalado o
descarga el ZIP oficial fijado de uv en una carpeta de herramientas por usuario,
verificando HTTPS y SHA-256. No modifica \`PATH\`, no requiere administrador y no
abre una consola. Si falla, la app principal igual arranca y el problema MCP se
ve en la tab y el log.

## MCP: Serena y free-search

En el primer arranque FreeCode crea atómicamente:

\`\`\`text
<userData>/dsh-home/mcp/servers.json
<userData>/dsh-home/cordis.patch.yml
\`\`\`

Las dos entradas administradas quedan activadas por defecto. Abrí
Configuración → Plugins → MCP para alternarlas o abrir el JSON exacto. Sólo se
regenera el bloque marcado de FreeCode en el patch de Cordis; las filas propias
del usuario se conservan. Un toggle actualiza el entorno del hijo y reinicia
únicamente el Harness, nunca una segunda instancia de Electron.

La readiness es real, no solo configuración:

\`\`\`text
spawn → initialize → tools/list → validación de schemas → registro de tools
\`\`\`

La tab y la tray muestran el estado resultante. Un fallo de conexión genera un
aviso nativo por estado de fallo y queda en el log. Ningún proceso interno MCP
usa \`cmd.exe\`, \`start\`, una terminal ni una ventana visible.

Serena arranca deliberadamente sin \`--project-from-cwd\`: el cwd del hijo es el
\`dsh-home\` privado, no el proyecto elegido, para evitar escanear todo el disco.
Antes de la primera herramienta Serena de un proyecto, el bridge canoniza la
ruta y llama \`activate_project\`; la activación y la llamada pedida se
serializan. Al cambiar de proyecto se hace una activación nueva cuando termina
la operación anterior. Los errores de activación vuelven al modelo y aparecen
como estado MCP degradado/fallido.

free-search usa \`free-search-mcp\` mediante \`uvx\` y es la ruta HTTP-first para
investigar. No abre el navegador para buscar. El navegador embebido solo se
abre si el usuario pide ver un resultado.

Más detalle en [docs/mcp-servers.md](docs/mcp-servers.md).

## Contrato de tool calls

Cada tool call MCP registra un evento acotado con \`requestId\`, servidor, nombre
raw, intento, estado y duración. Los estados son:

\`\`\`text
success
failed-local
failed-mcp
failed-provider
failed-timeout
failed-permission
failed-invalid-response
\`\`\`

Resultados vacíos, legacy o malformados son fallos explícitos, no respuestas
vacías exitosas. Los reintentos son acotados y no se repiten a ciegas las
herramientas con efectos secundarios. Los logs no contienen argumentos, bytes
de imágenes ni texto OCR.

## OCR

Los modelos con visión conservan la imagen. Los modelos text-only reciben texto
OCR en los dos caminos soportados:

1. adjunto directo de imagen en el mensaje;
2. herramienta \`read_image\`.

Tesseract viene incluido para Windows; \`pytesseract\` no es requisito runtime.
El helper valida rutas absolutas, limita tamaño de imagen/salida, restringe
idioma/PSM, aplica timeout y cachea por hash. Binario ausente, imagen corrupta,
timeout, resultado vacío o salida excesiva son errores explícitos; nunca se
reemplaza silenciosamente por \`[image omitted...]\`.

## Shell, Caveman, RTK y sandbox

Configuración → Plugins → configuración de plugins → Shell muestra toggles
independientes para RTK y Caveman. Los defaults del schema están activados. Si
falta el binario, la feature correspondiente no-opera y no se presenta como
activa. FreeCode no descarga ni instala silenciosamente ninguna de las dos.
Sólo se envuelven comandos simples y seguros; pipes, redirecciones,
sustituciones y sintaxis compuesta se conservan.

Workspace Write continúa siendo el permiso predeterminado. La política de
sandbox sigue siendo upstream: FreeCode no amplía permisos automáticamente y
distingue un fallo de permisos de uno de herramienta/MCP.

## Updater y versión

About usa \`app.getVersion()\`, por lo que el binario empaquetado debe decir
0.5.0. La app chequea updates al iniciar y cada seis horas. El control de
actualizar es exactamente el botón circular primario de Enviar, con la flecha
apuntando hacia abajo. Al descargar, tooltip/menú de tray y notificación nativa
lo informan; la instalación/reinicio también es visible. El gate solo comprueba
que esto no rompa el arranque: no exige actualización desde 0.4.3.

## Causa de las regresiones anteriores

El crash de instalación provenía de un bundle de \`directory-picker-native\` sin
el bridge Electron del diálogo. El verificador aceptaba ese bundle incompleto.
Después, eventos \`exit\` viejos del supervisor podían programar otro spawn
mientras un restart explícito ya creaba el reemplazo. Además, readiness y
registro de tools se confundían y los modelos text-only no tenían fallback OCR.

El hardening de 0.5.0 cubre esas causas por separado:

- preflight y runtime manifest rechazan un bridge nativo incompleto;
- supervisor y pool usan generaciones, rechazan eventos viejos y esperan el
  cierre del árbol de procesos;
- tests reales de Windows enumeran PIDs descendientes y ventanas de consola;
- MCP espera initialize/tools/list/schema/registro antes de decir ready;
- tool calls tienen contrato, estados clasificados y fallos visibles;
- OCR está empaquetado y probado en ambos caminos text-only;
- smoke de instalación limpia verifica payload/bridge, arranque headless,
  ventanas descendientes, accesos directos, working directory y desinstalación;
  un smoke MCP empaquetado separado ejercita activación de proyecto, tools
  reales y registro de herramientas en el proveedor.

## Desarrollo upstream-first

El subtree upstream se mantiene actualizable. El orden correcto es:

\`\`\`text
actualizar/fetchear vendor/deepseek-harness desde upstream
  → pnpm apply:upstream-patches
  → pnpm prepare:upstream
  → tests, typecheck, build y packaging
\`\`\`

Cada cambio de producto debe ser un patch pequeño y ordenado en
\`patches/upstream/\`, con su contrato focalizado. El aplicador es idempotente,
limitado a vendor y fail-closed. No dejes una feature permanente como edición
directa de \`vendor/deepseek-harness\`. Ver
[docs/UPSTREAM-PATCHING.md](docs/UPSTREAM-PATCHING.md).

## Gate local de Windows

Ejecutá desde PowerShell en la workstation mantenedora:

\`\`\`powershell
pnpm install --frozen-lockfile
pnpm apply:upstream-patches
pnpm test
pnpm test:contract
pnpm typecheck
pnpm build:vendor
pnpm build:shell
pnpm package:runtime
pnpm --filter @freecode/shell package
pnpm --filter @freecode/shell smoke:nsis
pnpm release:gate
\`\`\`

El gate compila únicamente NSIS/portable Windows x64, verifica manifest,
bridge nativo y Tesseract, enumera procesos/ventanas y hace un smoke de
instalación limpia. No ejecuta upgrade smoke desde 0.4.3. No se crea tag ni
release GitHub hasta que todos los comandos y la instalación limpia pasen.

Los artefactos quedan en \`apps/shell/release/\`.

## Builds manuales de otros sistemas

Linux y macOS no son targets de release de 0.5.0. Un contribuidor puede
trabajar en un host nativo con Node, pnpm, Git, herramientas de build de Electron
y dependencias nativas del sistema:

\`\`\`bash
pnpm install --frozen-lockfile
pnpm apply:upstream-patches
pnpm build:vendor
pnpm test
pnpm typecheck
\`\`\`

No uses esos builds como evidencia de release, no los subas y no esperes que el
\`package:runtime\`/release gate Windows-only acepte un target no Windows. Al
cambiar entre Windows y WSL reinstalá dependencias para no mezclar módulos
nativos ni links de workspace.

## Proyecto y licencia

FreeCode es el fork [Akunimal/free-code-deepseek-harness](https://github.com/Akunimal/free-code-deepseek-harness)
de [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).

MIT — ver [LICENSE](LICENSE) y [NOTICE](NOTICE).

Proyectos relacionados: [OpenCode2API](https://github.com/jasonxu114514/opencode2api),
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness),
[RTK](https://github.com/rtk-ai/rtk),
[Caveman](https://github.com/JuliusBrussee/caveman),
[Serena](https://github.com/oraios/serena) y
[free-search-mcp](https://github.com/sweetcornna/free-search-mcp).

## English

The complete English guide is [README.md](README.md). FreeCode uses OpenCode
Free models and keeps the same upstream inventory, hardening record and local
release procedure in both languages.

## Índice de documentación

- [Inventario de features upstream](docs/UPSTREAM-FEATURES.md)
- [Estado de 0.5.0](docs/STATE-0.5.0.md)
- [Roadmap de 0.5.0](docs/ROADMAP-0.5.0.md)
- [Roadmap histórico](docs/ROADMAP.md)
- [Problemas conocidos](docs/KNOWN-ISSUES.md)
