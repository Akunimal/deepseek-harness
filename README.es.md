# FreeCode DeepSeek Harness

> Vibecoding en Windows con modelos OpenCode Free: abrí un proyecto, describí lo que querés construir y empezá.

[Read this in English](README.md)

![FreeCode con x-preview-f seleccionado](docs/assets/capeng.jpg)

## ¿Qué es FreeCode?

FreeCode es la aplicación de escritorio del DeepSeek Harness con un puente
OpenCode ya configurado. Su pool gratuito predeterminado usa modelos de
OpenCode Free. Te da un espacio local para programar con chat, archivos,
herramientas, sesiones y un navegador Chromium embebido con sesiones
persistentes.

No necesitás instalar Node, pnpm, Git, Python, OpenCode ni un servicio de
workers separado para usar la release de Windows.

## Empezá en tres pasos

1. Descargá el instalador de Windows o la AppImage de Linux desde la [última release](https://github.com/Akunimal/free-code-deepseek-harness/releases/latest).
2. Instalá FreeCode, abrilo y elegí la carpeta de tu proyecto.
3. Contale al modelo en lenguaje natural qué querés construir.

La release también incluye un `.exe` portable si no querés instalar. Para uso
diario conviene el instalador; el portable sirve para llevar la aplicación a
otra carpeta o máquina. En Linux, descargá la `.AppImage`, dale permisos de
ejecución (`chmod +x`) y ejecutala.

## Qué incluye

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
- Compresión opcional de contexto Caveman (deshabilitada por defecto) en la configuración del Shell, debajo de RTK. Comprime la salida de comandos para ahorrar tokens cuando el binario de Caveman está instalado por separado.
- Provider opcional `Gemini Web (local)` basado en el puente MIT
  [`gemini-web2api`](https://github.com/Sophomoresty/gemini-web2api). Se
  muestra en el selector debajo de los providers existentes y usa Python 3
  cuando está disponible; el puente arranca automáticamente y escucha en
  `127.0.0.1:8081`.

## Algunos límites prácticos

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

## Provider Gemini Web

El selector agrupa los modelos por provider y muestra `Gemini Web (local)` debajo
de los providers existentes. El catálogo se actualiza desde `/v1/models`; si el
puente está offline, la lista estática sigue visible.

## Actualización

FreeCode busca actualizaciones automáticamente. Cuando encuentra una, usá la
flecha de descarga junto a Configuración. Las releases se compilan y suben
manualmente, sin workflow de release de GitHub Actions, para no consumir la cuota
gratuita de CI. El checklist y las notas bilingües están en
[docs/RELEASE-POLICY.md](docs/RELEASE-POLICY.md).

## v0.5.0: actualización anti-regresiones y hardening

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

### Configuración de MCP embebidos

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

### Configuración de RTK y Caveman

Ambos optimizadores son features modulares del Shell. Abrí Configuración →
Plugins/Configuration → tarjeta Shell: RTK y Caveman tienen toggles separados,
por lo que no hace falta una tab nueva. RTK queda activado por defecto cuando
ya existe su ejecutable; Caveman queda desactivado por defecto y requiere su
ejecutable instalado aparte. Si falta una herramienta, no cambia nada. Sólo
se consideran comandos simples y seguros; pipes, redirecciones, sustituciones,
comillas, backslashes y otra sintaxis de shell quedan sin transformar o son
rechazados por la frontera de seguridad. FreeCode nunca descarga RTK ni
Caveman.

### Upstream siempre actualizable

`vendor/deepseek-harness` se conserva como subtree upstream. Las features del
producto viven como overlay ordenado y revisable en `patches/upstream/`:

```text
fetch/pull de upstream
  → pnpm apply:upstream-patches
  → pnpm prepare:upstream
  → tests, typecheck, verificación de bundles y packaging
```

Los patches actuales restauran el bridge Win32, el browser tool embebido, las
features RTK/Caveman, el branding FreeCode y la resolución portable
cross-platform del build `tsdown` del cliente upstream. El aplicador es idempotente,
ordenado, limitado al subtree vendor y fail-closed ante aplicación parcial o
ambigua. No conviertas cambios de producto en ediciones permanentes dentro de
vendor: actualizá el patch, su contrato y ejecutá el gate completo. Ver
[docs/UPSTREAM-PATCHING.md](docs/UPSTREAM-PATCHING.md).

### Build local reproducible y verificación

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
desktop Electron, verifica hashes y cierre del runtime, valida el payload de
la AppImage leyendo el SquashFS desde WSL, y corre los smokes de instalación
limpia y upgrade desde `v0.4.3`. El builder deja el instalador NSIS y el
portable de Windows en `apps/shell/release/`.

Linux se compila localmente con WSL usando dependencias nativas de Linux:

```powershell
wsl.exe -d Ubuntu -- bash -lc "cd /mnt/i/DeepSeek-Harness/free-code-deepseek-harness && CI=true pnpm install --frozen-lockfile && pnpm build:desktop"
```

El build Linux deja la AppImage y el runtime correspondiente en
`apps/shell/release/`. Los assets esperados son instalador NSIS de Windows,
portable de Windows y AppImage Linux x86_64. Sólo se publica después de que
los gates locales pasen y los assets sean inspeccionados. El gate Linux también
se puede ejecutar directamente desde WSL:

```bash
pnpm verify:linux-appimage apps/shell/release/FreeCode-DeepSeek-Harness-0.5.0-linux-x86_64.AppImage
```

Lee las entradas reales del SquashFS (manifest, worker Linux, icono del tray,
bridge del selector de carpetas, versión de la app y hashes de
`latest-linux.yml`). Es intencional: el atajo `--appimage-extract` de WSL puede
mostrar algunas entradas hard-linkeadas como archivos de cero bytes aunque los
datos reales de la AppImage sean correctos.

El set local de assets v0.5.0 pasó los smokes y quedó preparado en
`release-assets-v0.5.0/`: NSIS (307.394.516 bytes,
`c3e231ea1d5cbdfc85b211ca4363df968d2d1eb8a49a7a856666b9e648274cd0`),
portable (307.232.024 bytes,
`923e3d30cf32ca3f998f2e8e5bf209ad1e994bb2390d240528bef2cf546e8d1a`) y
AppImage Linux (450.080.401 bytes,
`5878cb8529743524980a40b04848887dbe43c565f69398bad01a08c7e7a0d7ab`). Los
archives de runtime Harness de Win32 (208.855.139 bytes,
`3f85e4dd31e04afdff2697b50545dbd3543aeaf498bc7290d43b654a03e3f1b2`) y Linux
(443.434.519 bytes,
`6a50a5db9d482869329626ffa5f1e047e7ea61df7f7865d054f09f02c74bb403`), el
blockmap y la metadata `latest*.yml` con sus checksums también están allí; el
manifiesto completo y los resultados están en
[release-notes-v0.5.0.md](release-notes-v0.5.0.md).

El packager de WSL también detecta links viejos de `node_modules` creados en
Windows/WSL antes del build web y acepta la entrada hoisted de Vite generada
por cualquiera de las dos plataformas. En Linux/WSL reemplaza los directorios
generados exactos del runtime con `rm` nativo; en Windows usa el borrado Node
con reintentos. Así un rebuild cross-platform no reutiliza silenciosamente un
link Vite roto ni queda bloqueado reemplazando el runtime anterior.
El checkout puede compartirse, pero `vendor/deepseek-harness/node_modules` se
debe instalar para un solo OS a la vez: los junctions/módulos nativos de
Windows y los symlinks/módulos nativos de WSL no son intercambiables. Al
cambiar de entorno hay que reinstalar las dependencias generadas para el OS
activo; ahora el paso de links informa explícitamente ese límite en vez de
dejar escapar un `EACCES` crudo.

### Mapa del proyecto con Graphify

El mapa del proyecto se actualizó con Graphify `0.9.53` después de los cambios
de v0.5.0. El grafo estructural acotado a `apps/shell` contiene 433 nodos,
749 aristas y 20 comunidades detectadas, sin ciclos de imports en el grafo
revisado. No se afirmó una extracción semántica/LLM completa porque esta
workstation no tiene una API key de Graphify; el grafo estructural es la base
local reproducible y queda en `graphify-out/` para inspección. Reejecutá
`graphify extract apps/shell --code-only --no-viz --no-cluster --out .` (y
opcionalmente `graphify cluster .`) cuando cambie el árbol fuente.

## Para contribuir

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

## Proyecto

Este es el fork público [Akunimal/free-code-deepseek-harness](https://github.com/Akunimal/free-code-deepseek-harness)
de [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).
La rama de producto es `main` y la referencia upstream está en
`vendor/deepseek-harness`.

MIT — ver [LICENSE](LICENSE) y [NOTICE](NOTICE).

## Proyectos relacionados

FreeCode integra y se apoya en estos proyectos de código abierto:

- [OpenCode2API](https://github.com/jasonxu114514/opencode2api) — puente local compatible con OpenCode y pool de workers usado por la ruta de modelos gratuitos.
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — harness upstream de agentes y runtime web basado en plugins.
- [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) — compresor opcional de salidas CLI que puede reducir lo que llega al contexto del modelo.
- [Caveman](https://github.com/JuliusBrussee/caveman) — herramienta externa opcional de compresión de contexto expuesta en la tarjeta Shell de Configuración, deshabilitada por defecto y nunca incluida ni instalada por FreeCode.

FreeCode no incluye, descarga ni instala RTK. Cuando el toggle de RTK está
habilitado y el ejecutable `rtk` ya está disponible, FreeCode envuelve sólo
comandos CLI simples elegibles; deja sin cambios los pipes, redirecciones,
sustituciones y demás sintaxis de shell. Si RTK no está instalado, se ejecuta
el comando original.
