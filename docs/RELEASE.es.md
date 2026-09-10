# Release y packaging

Este repositorio es el fork público Akunimal/free-code-deepseek-harness de
deepseek-ai/deepseek-harness. El código de producto vive fuera del subtree
vendor/deepseek-harness cuando es posible; los cambios de upstream se
reproducen mediante el stack ordenado de patches.

## Baseline actual

La release publicada 0.6.0 es una baseline auditada para Windows x64:

- instalador NSIS de Windows 0.6.0;
- ejecutable portable de Windows 0.6.0.

El gate histórico de 0.6.0 comprobó instalación limpia, acceso directo,
bridge del directory picker, arranque empaquetado básico, payload OCR y
llamadas MCP reales usando el entorno disponible/bootstrap. No comprobó que
RTK estuviera empaquetado, que los MCP fueran offline-completos, que estuviera
el español, que nunca aparecieran ventanas helper de corta duración, que Git
se resolviera dentro de DSH ni que un stream truncado no terminara como éxito
vacío. No describas el artefacto publicado como completamente autocontenido.

0.4.3 es la última referencia operativa porque abre bien. No es una garantía
de compatibilidad ni la fuente de verdad del código actual. El gate de 0.7.0
no exige actualizar desde 0.4.3; exige instalar limpio, abrir, seleccionar un
proyecto y relanzar.

El contrato correctivo está en el
[roadmap de 0.7.0](ROADMAP-0.7.0.md), con estado en el
[ledger de 0.7.0](STATE-0.7.0.md). Los hallazgos completos de sólo lectura
están en [AUDIT-0.6.0-TEST-PLAN.md](AUDIT-0.6.0-TEST-PLAN.md).

## Build local de Windows

Ejecutá desde PowerShell en Windows x64:

~~~
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
~~~

Estos comandos son locales y no usan GitHub Actions. El gate de 0.7.0 debe
agregar las pruebas de dependencias offline, RTK, Git/sandbox, español,
streams adversariales y ventanas Win32 por eventos descritas en el roadmap.
Los recursos obligatorios deben hacer fallar el gate cuando faltan; no se
pueden saltear silenciosamente porque la máquina del desarrollador no tiene
un fixture.

Los artefactos Windows esperados de 0.6.0 son:

~~~
apps/shell/release/FreeCode-DeepSeek-Harness-0.6.0-win-x64-setup.exe
apps/shell/release/FreeCode-DeepSeek-Harness-0.6.0-win-x64-portable.exe
apps/shell/release/FreeCode-DeepSeek-Harness-0.6.0-win-x64-setup.exe.blockmap
apps/shell/release/win-unpacked/FreeCode DeepSeek Harness.exe
~~~

Los nombres de 0.7.0 deben salir de la versión del package y verificarse
después del packaging; no copies el nombre 0.6.0 en una release nueva.

## Política de dependencias runtime

El instalador 0.6.0 contiene Electron, el runtime del Harness, el worker de
OpenCode, archivos nativos del picker/runtime y Tesseract. No contiene RTK y
sus filas administradas de Serena/free-search pueden usar uvx
externo/bootstrap. Es un defecto abierto de 0.7.0, no una política final
aceptable.

Para 0.7.0, el cierre instalado debe enumerar versión, arquitectura, origen,
licencia, hash y ruta relativa de RTK, uv/uvx o su reemplazo, Serena,
free-search, Tesseract, workers y helpers nativos. El primer arranque
instalado debe funcionar con PATH externo vacío y red bloqueada. Una referencia
a uvx del perfil del usuario o a una descarga git+https no es una dependencia
empaquetada.

## Publicación sólo Windows

Ningún artefacto Linux o macOS es asset oficial. Los contribuidores pueden
compilar en un host nativo, pero un binario Linux generado desde Windows/WSL no
es evidencia de usabilidad Linux y no debe anunciarse sin testing real en
Linux. No mezcles node_modules de Windows y WSL; reinstalá dependencias para el
sistema operativo activo.

El repositorio no tiene workflow de release. Los pushes no compilan ni
publican instaladores. La publicación es manual, después del gate local, la
revisión de checksums, la instalación limpia NSIS/portable y el lock del
ledger.

## Updater y actualizaciones del runtime

El updater de la aplicación no reemplaza al gate de release. Debe conservar el
control con forma de Enviar y flecha hacia abajo, chequear al iniciar y en su
intervalo programado, mostrar progreso en tray/notificación durante descarga e
instalación y respetar los datos del usuario. 0.7.0 no exige actualizar desde
0.4.3.

El camino de actualización de upstream, sólo para el checkout fuente, es:

~~~
congelar evidencia
  -> actualizar/fetchear vendor/deepseek-harness
  -> pnpm apply:upstream-patches
  -> verificar manifest y replay
  -> test/typecheck/build/package
~~~

Ver [docs/UPSTREAM-PATCHING.md](UPSTREAM-PATCHING.md) y
[docs/RELEASE-POLICY.md](RELEASE-POLICY.md).

## Historial y enlaces de release

Los documentos viejos bajo docs/RELEASE-NOTES-v*.md describen releases
históricas y deliberadamente no se reescriben como instrucciones actuales. La
baseline publicada se sigue en
[GitHub release 0.6.0](https://github.com/Akunimal/free-code-deepseek-harness/releases/tag/0.6.0).

La próxima release no debe recibir tag ni publicarse hasta que todas las filas
críticas de STATE-0.7.0.md estén LOCKED y los artefactos Windows pasen el smoke
offline completo de instalación limpia.

For the English guide, see [RELEASE.md](RELEASE.md).
