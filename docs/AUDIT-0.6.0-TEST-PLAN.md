# Auditoría punta a punta y plan de pruebas definitivo para 0.6.0

Última actualización: 2026-09-10

Este documento corrige la interpretación del `release:gate` anterior. La
release 0.6.0 publicada es una línea base de investigación, no evidencia
suficiente para afirmar que el producto está cerrado. No se modificó código de
producto en esta auditoría: se inspeccionaron fuentes, tests, payload instalado,
procesos y logs, y se actualizó la descripción de la release para que no oculte
las regresiones conocidas.

## Resultado ejecutivo

La causa de que los tests anteriores no alcanzaran es que validaban la forma
del código y algunos snapshots estables, pero no la frontera real del producto
empaquetado:

1. El catálogo español desapareció durante la sincronización del subtree. Los
   tests se adaptaron al catálogo upstream reducido (`zh`/`en`) y por eso no
   detectaron que FreeCode debía conservar `es`.
2. RTK no está empaquetado. El código lo busca en el `PATH` del usuario y el
   instalador actual no contiene `rtk.exe`.
3. Serena y free-search todavía se resuelven mediante `uvx` externo o
   descargado por usuario. El smoke real demuestra que las tools funcionan,
   pero no demuestra una clausura offline del instalador.
4. La política `windowsHide: true` existe en varios puntos, pero no es un
   contrato único de creación Win32. El SDK MCP posee su propio spawn, `uv` y
   los servidores Python crean descendientes propios, y el terminal persistente
   usa `node-pty/ConPTY`.
5. El detector de ventanas solo observa handles visibles cada 75 ms después de
   que el proceso ya arrancó. No registra eventos de creación ni prueba cada
   descendiente en el instante de creación; puede perder un destello de menos
   de un segundo.
6. Git funciona en el checkout local, pero una conversación guardada de DSH
   informó que el sandbox no encontraba `git` en `PATH`. Los logs de
   aplicación no conservaron la resolución del ejecutable ni la clasificación
   de ese fallo. El problema de Git está, por tanto, abierto en la frontera
   `PATH`/sandbox/diagnóstico, no demostrado como un fallo del binario Git del
   host.
7. Existe un fallo real de stream en los logs: respuesta HTTP 200, sin evento
   `done`, sin texto ni tool call y `empty_reply=true`. El gate MCP de
   `tools/list` no cubre ese contrato de proveedor.

## Evidencia revisada

| Área | Estado actual | Evidencia | Qué faltó al gate anterior |
|---|---|---|---|
| Español | `BROKEN` | `LOCALE_IDS` y `locales/index.ts` solo exportan `zh` y `en`; el commit de sync upstream eliminó la exposición local de `es` | No había aserción de `es` en fuente, selector, persistencia y bundle empaquetado |
| RTK | `BROKEN` respecto del requisito de 0.6.0 | El runtime instalado no contiene `rtk*`; `resolveRtk()` ejecuta solo `spawnSync('rtk')` | El test validaba “no mostrar activo si falta”, no “el release contiene y ejecuta RTK” |
| MCP runtime | `BROKEN` respecto de clausura | `servers.json` usa `C:\Users\inti_\.local\bin\uvx.exe`; los args descargan Serena desde GitHub | `mcp-real-smoke` permite PATH/descarga y red |
| Ventanas | `BROKEN` | El árbol instalado contiene `conhost.exe` bajo workers y `uvx`; el snapshot estable no mostró un segundo Electron, pero no descarta flashes | Solo se revisaban handles visibles con polling tardío |
| Git | `UNVERIFIED/BROKEN` | DSH respondió “sandbox ... no está en el PATH”; no hay diagnóstico de resolución en `app.log` | No existe contrato empaquetado de `git --version`, `git status` y permiso sandbox |
| Tool calls/stream | `BROKEN` | `stream_result` registró `empty_reply=true`, `done_seen=false`, `tool_call_count=0` | Se validaba MCP, no el protocolo de streaming adversarial |
| Instalador | `VERIFIED` solo para layout/arranque observado | La instalación limpia abrió y el picker no quedó vacío en esta línea base | No se comprobaba clausura de dependencias ni primer arranque offline |
| Gemini2API | `LOCKED-REMOVED` | No aparece en el payload Windows actual ni en el config activo | Mantener una prueba de ausencia para evitar reaparición |
| Linux/macOS | `OUT_OF_SCOPE` | No son target oficial de 0.6.0 | Requieren testing real independiente antes de considerarlos utilizables |

El checkout local tiene un artefacto histórico
`apps/shell/release/linux-unpacked` que todavía contiene restos de Gemini.
No se lo debe usar como evidencia del payload Windows; el gate debe fallar si
una carpeta de release final conserva artefactos retirados.

## 1. Contrato de clausura del runtime

Antes de volver a compilar, el runtime debe poder ejecutarse con un `PATH`
vacío o controlado y sin red para descargar componentes administrados.

### Payload obligatorio

El manifiesto debe enumerar versión, arquitectura, origen, licencia y SHA-256
de cada elemento ejecutable o necesario:

- Node/Electron runtime usado por DSH.
- `rtk.exe`, con una ruta absoluta dentro de `resources/freecode`.
- `uv.exe`/`uvx.exe`, si se conserva la arquitectura Python actual.
- Serena y free-search, incluyendo runtime Python, wheels/cache o binarios
  congelados que sus servidores necesiten.
- `opencode2api` Windows x64.
- Tesseract, `tessdata` y DLLs.
- cualquier helper de picker, sandbox, OCR o actualización.

No alcanza con incluir el launcher: un `uvx --from git+https://...` que baja
el servidor en el primer uso sigue siendo una dependencia externa. Hay que
elegir una de estas implementaciones y documentarla en el manifiesto:

1. servidores MCP congelados como ejecutables Windows autocontenidos; o
2. runtime Python/uv y paquetes bloqueados dentro de `resources/freecode`,
   instalados en build y ejecutados offline por ruta absoluta.

La segunda opción debe incluir todos los artefactos que el servidor importa,
no solo el nombre del paquete en `servers.json`.

### RTK

El comportamiento final debe ser:

- `resolveRtk()` recibe la ruta del runtime empaquetado, no depende solo del
  `PATH` del usuario;
- el toggle activo significa “el binario incluido pasó `rtk --version`”, no
  “había un ejecutable casual en PATH”;
- `wrapWithRtk()` conserva la protección contra shell metacharacters y no
  envuelve comandos no idempotentes sin contrato;
- el build verifica arquitectura, versión, licencia, hash y ejecución;
- el smoke instalado ejecuta RTK desde un entorno sin el `PATH` del usuario;
- si el binario está ausente o corrupto, el instalador/gate falla explícitamente.

El `rtk.exe` que hoy existe en `C:\Users\inti_\bin` sirve como evidencia de
desarrollo, nunca como evidencia de que el release lo incluye.

### Gate de clausura

Debe fallar si el runtime instalado referencia:

- `%USERPROFILE%\\.local\\bin\\uvx.exe`;
- un `rtk` resuelto solo por PATH;
- `git+https://`, `pip install`, `uv tool install` o descargas de MCP
  durante el smoke offline;
- servidores o DLLs fuera de `resources/freecode` sin una dependencia externa
  declarada y testeada.

El gate debe correr dos veces: con red disponible para diagnóstico y con red
bloqueada para probar que el producto administrado ya está completo.

## 2. Solución definitiva para las ventanas

### Diagnóstico de causa raíz

El supervisor de DSH ya tiene generaciones, lock, cancelación de respawns y
`taskkill /T`. Esa corrección evita duplicar el runtime, pero no controla todos
los procesos que crean ventanas. Hoy hay al menos cuatro seams:

1. `HarnessSupervisor` crea DSH.
2. El pool crea `opencode2api` workers.
3. `StdioClientTransport` del SDK MCP crea `uvx`; luego `uv` crea Python y el
   servidor crea procesos secundarios.
4. `node-pty` crea terminales persistentes mediante ConPTY.

El patch de Serena solo reemplaza el launcher de language servers internos de
Serena. No cubre el `uvx` padre ni free-search. Por eso agregar otro
`windowsHide` al supervisor no es una solución total.

### Diseño requerido

Crear un único seam de lanzamiento Windows administrado por FreeCode y hacer
que todas las rutas anteriores lo usen:

- argv solamente; `shell:false` obligatorio;
- `CREATE_NO_WINDOW`, `STARTF_USESHOWWINDOW/SW_HIDE` y entorno explícito en la
  llamada Win32;
- Job Object por servicio para conocer y cerrar todo el árbol;
- registro de `requestId`, generación, PID raíz, descendientes y motivo de
  cierre;
- ninguna ruta puede llamar directamente a `cmd.exe`, `start`, PowerShell
  interactivo o `StdioClientTransport` sin pasar por el seam;
- para MCP, parchear de forma modular el transporte SDK o cambiar los MCP
  empaquetados a loopback HTTP/IPC administrado, de modo que FreeCode controle
  el proceso servidor y no el SDK sin instrumentación;
- ConPTY solo para una terminal que el usuario pidió ver. MCP, OCR, RTK,
  workers, Git diagnóstico y language servers jamás deben usar un PTY.

La implementación debe registrar también el motivo de cualquier ventana
permitida. La ventana principal de Electron y el picker explícito son las
únicas excepciones de producto.

### Instrumentación que falta

El nuevo test no debe buscar solo `MainWindowHandle` cada 75 ms. Debe:

1. tomar un snapshot de procesos cada 5–10 ms durante arranque, tool call,
   restart y cierre;
2. enumerar ventanas Win32 con `EnumWindows`,
   `GetWindowThreadProcessId`, `IsWindowVisible` y título/clase;
3. atribuir cada ventana a la raíz FreeCode mediante el árbol de padres;
4. registrar creación y desaparición, no solo estado final;
5. fallar ante cualquier `conhost.exe`, `cmd.exe`, PowerShell o helper visible
   descendiente que no sea una ventana solicitada explícitamente;
6. conservar un trace JSON para reproducir la ruta exacta que lo creó.

No se debe contar como fallo un `conhost` de otra aplicación. La atribución
obligatoria es `root PID → parent PID → child PID → window handle`.

### Stress gate

- 50 ciclos `start → ready → tool call → restart → stop`.
- 20 ciclos con muerte forzada de DSH durante `exit` y respawn.
- 20 ciclos con fallo de `uvx`/MCP y reconexión.
- 20 ciclos de cierre mientras hay tool call, OCR, RTK y terminal pendiente.
- Un solo Electron principal y un solo DSH activo por sesión.
- Cero ventanas visibles transitorias y cero procesos huérfanos.
- Cero `conhost`/`cmd`/PowerShell descendientes salvo una acción explícita
  del usuario.

Si el trace no puede probarlo, el estado es `UNVERIFIED`, no `LOCKED`.

## 3. Reparación de Git y sandbox

El arreglo debe distinguir tres causas que hoy se mezclan:

1. `git.exe` no está instalado.
2. Git existe pero el proceso DSH no recibe la ruta correcta.
3. Git está disponible pero el sandbox ACL bloquea el cwd o el archivo.

### Contrato de resolución

Al iniciar la capacidad shell, FreeCode debe resolver y registrar una ruta
absoluta para Git usando el mismo entorno real del tool call. Debe probar:

- `git --version`;
- `git -C <proyecto> rev-parse --show-toplevel`;
- `git -C <proyecto> status --porcelain`;
- una lectura de `git diff --check` sin mutar el proyecto.

El diagnóstico debe incluir `requestId`, cwd canonicalizado, ruta resuelta,
versión, modo sandbox y código de error, sin incluir tokens ni contenido
privado. El modelo y la UI deben distinguir `executable-not-found`,
`sandbox-denied`, `not-a-repository`, `git-failed` y `timeout`.

La ruta puede ser el Git del sistema si está correctamente instalado. Si el
producto promete runtime completamente autocontenido, se debe evaluar un Git
portable incluido y licenciado; no se debe ocultar una dependencia del host
detrás de “sandbox”. La decisión debe quedar en el manifiesto y en las release
notes.

### Tests Git/sandbox

- Git disponible en PATH.
- Git disponible solo en una ruta conocida de Windows.
- PATH vacío con diagnóstico explícito.
- repositorio válido, carpeta no Git y repositorio corrupto.
- `workspace-write` permite lectura/status y escritura dentro del workspace.
- escritura/lectura fuera del workspace se deniega con estado sandbox, no
  `git-failed`.
- `danger-full-access` no se anuncia como solución automática ni amplía la
  política por su cuenta.
- proceso real empaquetado, no solo fixture unitario.

## 4. Tool calls, providers y respuestas vacías

El caso observado en `app.log` debe convertirse en fixture de contrato:

```text
HTTP 200 → chunks parciales → sin [DONE] → texto vacío
→ done_seen=false → empty_reply=true
```

La máquina de estados debe separar:

- respuesta vacía válida cuando el último evento contiene una tool call;
- respuesta vacía inválida sin tool call ni contenido;
- `finish_reason=tool_calls` que exige continuar el loop;
- `finish_reason=stop` con texto vacío, que es fallo visible;
- error de red recuperable;
- respuesta HTTP exitosa pero protocolo incompleto;
- timeout y cancelación del usuario.

Cada tool call conserva `requestId`, servidor, herramienta, intento, estado,
duración y error clasificado. Los reintentos son acotados y nunca se aplican
automáticamente a efectos secundarios no idempotentes. El test debe comprobar
que el modelo recibe el error clasificable y que la UI no muestra un éxito
vacío.

## 5. Contrato de idioma y upstream

El fix de español debe ser un patch modular propio, aplicado después del sync
upstream, no una edición manual escondida en el vendor:

- `LOCALE_IDS` incluye `zh`, `en`, `es`;
- `locales/index.ts` exporta un diccionario español real;
- metadata, selector, settings store, menú nativo, tray y preload comparten la
  misma lista;
- se prueba persistencia y fallback;
- el bundle empaquetado contiene `es` y no solo la fuente;
- `pnpm update:upstream-local` y una segunda aplicación idempotente conservan
  el patch;
- si upstream cambia el seam, el applier falla cerrado.

Debe agregarse un contrato que falle si el upstream refresh vuelve a reducir el
catálogo sin un cambio de producto deliberado.

## 6. Matriz de pruebas por fase

### Fase A — inventario reproducible

- guardar `git status`, commit, tag, hashes del release y manifest;
- comprobar que `.serena` siga siendo estado del usuario y no se borre;
- separar `release/win-unpacked` de artefactos Linux históricos;
- ejecutar tests existentes sin modificar producto y guardar salida;
- rotar o filtrar logs por sesión, versión y boot ID para no mezclar 0.2–0.6.

### Fase B — upstream y contratos estáticos

- fetch upstream sin perder cambios locales;
- aplicar patches ordenados y repetibles;
- `git diff --check` y validación de rutas vendor-only;
- contratos de versión, About, español, Gemini ausente, LSP ausente,
  Windows-only y README/release bilingües;
- contrato de manifiesto completo, hashes y licencias.

### Fase C — runtime offline

- construir closure Windows x64 limpia;
- prohibir red durante primer arranque del fixture empaquetado;
- inicializar Serena/free-search y ejecutar una tool real;
- ejecutar RTK desde su ruta incluida;
- ejecutar OCR desde Tesseract incluido;
- ejecutar Git con el contrato de resolución elegido;
- comprobar que no se toca `%USERPROFILE%\\.local\\bin` ni se baja nada.

### Fase D — procesos y ventanas

- stress del supervisor y workers;
- MCP/uv/Python/OCR/RTK/Git sin consola;
- trazado Win32 de eventos y árbol completo;
- fallo de arranque, restart, stop, cierre abrupto y reconexión;
- cero flashes, huérfanos o Electron duplicado.

### Fase E — UI y persistencia

- selector español y persistencia;
- About/versión;
- modelo que no soporta effort no muestra effort;
- configuración file access;
- Caveman/RTK y tab MCP;
- Serena activa al seleccionar proyecto y su configuración de tray;
- sandbox con errores diferenciados;
- updater visual, chequeo al inicio/seis horas y aviso de tray, sin incluirlo
  en el gate de upgrade desde 0.4.3.

### Fase F — instalación limpia

- NSIS en directorio nuevo;
- acceso directo con working directory válido;
- runtime y manifest completos;
- abrir, picker, proyecto, Serena, una tool, RTK, OCR, Git;
- cerrar, relanzar, desinstalar y limpiar;
- portable con el mismo smoke;
- red bloqueada en el segundo arranque.

## 7. Gates de publicación

No se marca `LOCKED` por un test estructural. Cada gate necesita evidencia
empaquetada y un trace cuando corresponda:

```text
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

El `release:gate` nuevo debe incluir explícitamente:

- catálogo español;
- manifest de clausura completa;
- RTK empaquetado y ejecutable;
- MCP offline sin `uvx` externo;
- Git resolution/sandbox contract;
- respuesta vacía/protocolo incompleto;
- monitor de ventanas por eventos y no solo polling tardío;
- 50 ciclos y fault injection;
- instalación NSIS y portable.

Solo después de todos los gates se puede compilar/publicar una nueva release.
La actual 0.6.0 debe permanecer identificada como baseline con regresión de
español y runtime no autocontenido para RTK/MCP.

## Orden de implementación

1. Preservar evidencia y corregir documentación de estado.
2. Diseñar y empaquetar la clausura runtime: RTK, uv/servidores MCP y hashes.
3. Crear el seam Win32 único y migrar supervisor, workers, MCP, OCR y Git.
4. Reparar resolución/diagnóstico Git y probar sandbox sin relajar permisos.
5. Reparar contrato de streaming/tool calls y agregar fixtures reales.
6. Restaurar español como patch upstream modular y bloquearlo con contratos.
7. Ejecutar UI, instalación limpia, offline y stress de ventanas.
8. Marcar componentes `LOCKED` solo con evidencia; recién luego preparar el
   siguiente tag/release Windows.

Este orden evita que un binario “verde” por tener herramientas descargadas en
la máquina del desarrollador vuelva a ocultar la dependencia que el usuario
final no tiene.
