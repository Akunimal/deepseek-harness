# FreeCode DeepSeek Harness

Programación en Windows con modelos OpenCode Free: elegí un proyecto,
describí el trabajo y dejá que el Harness coordine archivos, herramientas,
servidores MCP y llamadas al modelo.

[Read this in English](README.md)

## Español

## Estado actual: baseline 0.6.0 y roadmap correctivo 0.7.0

0.6.0 es una baseline anti-regresiones publicada para Windows x64. Publica
únicamente:

- un instalador NSIS;
- un ejecutable portable de Windows.

Linux y macOS son targets manuales para contribuidores. Durante el desarrollo
pudieron generarse binarios Linux localmente, pero no fueron probados en un
Linux real por el mantenedor, que usa Windows; requieren testing en Linux antes
de considerarse utilizables. No se sube ningún binario Linux/macOS como asset
oficial de 0.6.0. Las compilaciones son locales y no usan workflows de GitHub
Actions. El roadmap de 0.7.0 sigue siendo Windows-only para la release.

`0.4.3` es la última referencia operativa conocida porque abre bien. No es la
fuente de verdad y puede no contener los fixes de este worktree. El gate de
instalación de 0.6.0 no exige actualizar una instalación existente desde
0.4.3.

La auditoría de 0.6.0 dejó abiertos: el español falta del catálogo de desktop,
RTK no está en el payload instalado, los MCP administrados todavía dependen de
`uvx` externo/bootstrap, el probe de ventanas puede perder flashes
transitorios, Git no tiene un contrato completo de diagnóstico PATH/sandbox y
se capturó un stream truncado que terminó vacío. La release publicada 0.6.0 no
debe describirse como completamente autocontenida. El trabajo correctivo está
en el [roadmap de 0.7.0](docs/ROADMAP-0.7.0.md) y su estado en el [ledger de
0.7.0](docs/STATE-0.7.0.md).

## Qué incluye

- Ruteo de modelos OpenCode Free mediante el pool local compatible con OpenCode.
- La UI upstream de DeepSeek Harness, sesiones, workspaces, permisos y
  herramientas de archivos.
- Una sola shell Electron y una sola generación del proceso `dsh` como objetivo
  de runtime.
- Serena y free-search como entradas MCP administradas, activadas por defecto
  en el catálogo de 0.6.0. Sus servidores de 0.6.0 todavía dependen de `uvx`
  externo/bootstrap; el cierre offline de dependencias es un gate explícito de
  0.7.0.
- Una tab Configuración → Plugins → MCP con toggles, estado de conexión,
  cantidad de herramientas registradas, errores y ruta de configuración.
- Configuración de Caveman en la tarjeta Shell, activada por defecto en el
  schema del shell; si falta el ejecutable queda como no-op explícito.
- Toggles separados para RTK y Caveman. RTK no está en el payload publicado de
  0.6.0; empaquetar todo lo declarado es un gate de 0.7.0.
- Tesseract incluido en Windows para los flujos de imágenes de modelos
  text-only.
- Navegador embebido solamente cuando el usuario lo abre explícitamente.
- Versión real en About, botón de actualizar igual a Enviar con flecha hacia
  abajo y avisos de tray durante descarga/instalación.

Gemini2API fue eliminado del runtime de 0.6.0. No queda proceso, provider,
modelo del selector, recurso empaquetado ni fallback Gemini para configurar.
También se eliminaron las entradas LSP independientes: Serena es la superficie
semántica MCP.

## Instalación y primer uso

1. Descargá el setup o portable de Windows de la release.
2. Instalalo o descomprimilo y abrí el acceso directo/ejecutable real.
3. Elegí la carpeta de tu proyecto en el picker.
4. Pedile al modelo que inspeccione o modifique el proyecto.

El instalador de 0.6.0 incluye Electron, el runtime upstream del Harness, el
binario del pool OpenCode, dependencias nativas y Tesseract. Todavía no es un
cierre offline completo: RTK falta y los MCP administrados pueden hacer
bootstrap de `uvx`. Si detecta una instalación incompleta, muestra el log y
recomienda el instalador oficial `v0.4.3` como última referencia estable para
recuperarse.

El bootstrap de Windows reutiliza silenciosamente un `uvx.exe` ya instalado o
descarga el ZIP oficial fijado de uv en una carpeta de herramientas por usuario,
verificando HTTPS y SHA-256. No modifica `PATH`, no requiere administrador y no
abre una consola. Ese comportamiento es una deuda de cierre de 0.7.0: la
release corregida debe funcionar con red bloqueada y sin dependencias externas.

## MCP: Serena y free-search

En el primer arranque FreeCode crea atómicamente:

```text
<userData>/dsh-home/mcp/servers.json
<userData>/dsh-home/cordis.patch.yml
```

Las dos entradas administradas quedan activadas por defecto. Abrí
Configuración → Plugins → MCP para alternarlas o abrir el JSON exacto. Sólo se
regenera el bloque marcado de FreeCode en el patch de Cordis; las filas propias
del usuario se conservan. Un toggle actualiza el entorno del hijo y reinicia
únicamente el Harness, nunca una segunda instancia de Electron.

El contrato de readiness objetivo es:

```text
spawn → initialize → tools/list → validación de schemas → registro de tools
```

La tab y la tray deben mostrar el estado resultante. La auditoría de 0.6.0
confirmó configuración y arranque de procesos, pero no demostró que no exista
ningún flash transitorio de Win32: el probe por polling puede perder una
consola que vive menos de un intervalo. Cualquier afirmación de headless queda
abierta hasta que pase el trace por eventos de ventanas de 0.7.0. Ningún hijo
MCP debe usar `cmd.exe`, `start`, una terminal ni una ventana visible.

Serena arranca deliberadamente sin `--project-from-cwd`: el cwd del hijo es el
`dsh-home` privado, no el proyecto elegido, para evitar escanear todo el disco.
Antes de la primera herramienta Serena de un proyecto, el bridge canoniza la
ruta y llama `activate_project`; la activación y la llamada pedida se
serializan. Al cambiar de proyecto se hace una activación nueva cuando termina
la operación anterior. Los errores de activación vuelven al modelo y aparecen
como estado MCP degradado/fallido.

free-search usa `free-search-mcp` mediante `uvx` y es la ruta HTTP-first para
investigar. No abre el navegador para buscar. El navegador embebido sólo se
abre si el usuario pide ver un resultado.

Más detalle en [docs/mcp-servers.md](docs/mcp-servers.md).

## Contrato de tool calls y streams

El contrato objetivo de cada tool call MCP registra un evento acotado con
`requestId`, servidor, nombre raw, intento, estado y duración. Los estados son:

```text
success
failed-local
failed-mcp
failed-provider
failed-timeout
failed-permission
failed-invalid-response
```

Resultados vacíos, legacy o malformados deben ser fallos explícitos, no
respuestas vacías exitosas. Los reintentos deben ser acotados y no se deben
repetir a ciegas las herramientas con efectos secundarios. Los logs no deben
contener argumentos, bytes de imágenes ni texto OCR. En la auditoría de 0.6.0
se capturó un stream truncado con cero texto y sin marcador de finalización; por
eso esta garantía es un gate de implementación de 0.7.0, no una afirmación de
que todos los caminos actuales ya están arreglados.

## OCR

Los modelos con visión conservan la imagen. Los modelos text-only reciben texto
OCR en los dos caminos soportados:

1. adjunto directo de imagen en el mensaje;
2. herramienta `read_image`.

Tesseract viene incluido para Windows; `pytesseract` no es requisito runtime.
El helper valida rutas absolutas, limita tamaño de imagen/salida, restringe
idioma/PSM, aplica timeout y cachea por hash. Binario ausente, imagen corrupta,
timeout, resultado vacío o salida excesiva son errores explícitos; nunca se
reemplaza silenciosamente por `[image omitted...]`.

## Shell, Caveman, RTK y sandbox

Configuración → Plugins → configuración de plugins → Shell muestra toggles
independientes para RTK y Caveman. Los defaults del schema están activados. Si
falta el binario, la feature correspondiente no opera y no se presenta como
activa. En 0.6.0 RTK no está empaquetado, así que el setting no satisface el
requisito de que todo lo declarado esté incluido. 0.7.0 debe empaquetar RTK y
todos los helpers declarados, verificar hashes/licencias y demostrar operación
con un `PATH` externo vacío. Sólo se envuelven comandos simples y seguros;
pipes, redirecciones, sustituciones y sintaxis compuesta se conservan.

Workspace Write continúa siendo el permiso predeterminado. La política de
sandbox sigue siendo upstream: FreeCode no amplía permisos automáticamente y
distingue un fallo de permisos de uno de herramienta/MCP.

## Updater y versión

About usa `app.getVersion()`, por lo que el binario empaquetado debe decir
0.6.0. La app chequea updates al iniciar y cada seis horas. El control de
actualizar es exactamente el botón circular primario de Enviar, con la flecha
apuntando hacia abajo. Al descargar, tooltip/menú de tray y notificación nativa
lo informan; la instalación/reinicio también es visible. El gate no exige
actualización desde 0.4.3: sólo debe conservar el arranque limpio y no ocultar
un fallo.

## Causa de las regresiones anteriores y gates abiertos de 0.7.0

El crash de instalación provenía de un bundle de `directory-picker-native` sin
el bridge Electron del diálogo. Después, eventos `exit` viejos del supervisor
podían programar otro spawn mientras un restart explícito ya creaba el
reemplazo. Además, readiness y registro de tools se confundían, un stream real
terminó truncado y vacío, RTK quedó fuera del payload, y los tests de ventanas
no observaban el evento de creación.

La baseline 0.6.0 contiene mitigaciones parciales, pero 0.7.0 debe cerrar
explícitamente:

- bridge nativo del picker presente en cada bundle empaquetado;
- generaciones del supervisor y del pool probadas contra carreras, con espera
  del árbol completo;
- trace por eventos Win32 que prohíba flashes de consola, `conhost`, `cmd`,
  PowerShell o ventanas de workers;
- readiness MCP real con `initialize`, `tools/list`, schemas y una llamada real,
  incluso con dependencias offline;
- contratos de stream/provider que no conviertan truncamiento o respuesta vacía
  en éxito;
- RTK, uv/uvx, Serena, free-search y cada helper declarado incluidos o
  eliminados del contrato del producto;
- resolver determinista de Git y diagnóstico in-app de PATH/sandbox;
- locale español, gating de capabilities, picker, shortcut y clean install con
  pruebas específicas.

El plan ejecutable está en [docs/ROADMAP-0.7.0.md](docs/ROADMAP-0.7.0.md), su
ledger en [docs/STATE-0.7.0.md](docs/STATE-0.7.0.md) y la auditoría de sólo
lectura en [docs/AUDIT-0.6.0-TEST-PLAN.md](docs/AUDIT-0.6.0-TEST-PLAN.md).

## Desarrollo upstream-first

El subtree upstream se mantiene actualizable. El orden correcto es:

```text
congelar evidencia → actualizar/fetchear vendor/deepseek-harness
  → pnpm apply:upstream-patches
  → verificar commit upstream + manifest de patches
  → tests, typecheck, build, cierre de runtime y packaging
```

Cada cambio de producto debe ser un patch pequeño y ordenado en
`patches/upstream/`, o una implementación modular en la shell, con contrato
focalizado y prueba de replay/idempotencia. El aplicador es idempotente,
limitado a vendor y fail-closed. No dejes una feature permanente como edición
directa de `vendor/deepseek-harness`. Ver
[docs/UPSTREAM-PATCHING.md](docs/UPSTREAM-PATCHING.md).

## Gate local de Windows: baseline 0.6.0 y requisito 0.7.0

Ejecutá desde PowerShell en la workstation mantenedora:

```powershell
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
```

Este era el conjunto histórico de 0.6.0. No alcanzó para detectar la regresión
de español, RTK ausente, cierre externo de MCP, flashes transitorios, Git ni
streams truncados. El gate de 0.7.0 agrega las pruebas offline de dependencias,
trace Win32 por eventos, contrato Git, fixtures adversariales de provider/tool,
locale y capabilities detalladas en el roadmap. Sigue sin exigir upgrade desde
0.4.3: sólo instalación limpia y apertura correcta.

No se crea tag ni release 0.7.0 hasta que cada fase tenga evidencia, su commit
haya sido pusheado y el smoke final de instalación Windows pase.

Los artefactos quedan en `apps/shell/release/`.

## Builds manuales de otros sistemas

Linux y macOS no son targets de release de 0.7.0. Un contribuidor puede
trabajar en un host nativo con Node, pnpm, Git, herramientas de build de Electron
y dependencias nativas del sistema:

```bash
pnpm install --frozen-lockfile
pnpm apply:upstream-patches
pnpm build:vendor
pnpm test
pnpm typecheck
```

No uses esos builds como evidencia de release, no los subas y no esperes que el
`package:runtime`/release gate Windows-only acepte un target no Windows. Al
cambiar entre Windows y WSL reinstalá dependencias para no mezclar módulos
nativos ni links de workspace. Cualquier binario Linux existente necesita
testing real en Linux antes de anunciarse como usable.

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

The complete English guide is [README.md](README.md). FreeCode mantiene el
mismo inventario upstream, registro de hardening y procedimiento de release
local en ambos idiomas.

## Índice de documentación

- [Inventario de features upstream](docs/UPSTREAM-FEATURES.md)
- [Estado de 0.6.0](docs/STATE-0.6.0.md)
- [Roadmap de 0.6.0](docs/ROADMAP-0.6.0.md)
- [Auditoría y plan de tests de 0.6.0](docs/AUDIT-0.6.0-TEST-PLAN.md)
- [Estado de 0.7.0](docs/STATE-0.7.0.md)
- [Roadmap agresivo de 0.7.0](docs/ROADMAP-0.7.0.md)
- [Release y packaging de Windows](docs/RELEASE.es.md)
- [Roadmap histórico](docs/ROADMAP.md)
- [Problemas conocidos](docs/KNOWN-ISSUES.md)
