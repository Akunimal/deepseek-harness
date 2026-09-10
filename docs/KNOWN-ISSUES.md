# Known issues / Problemas conocidos

Última revisión / Last reviewed: 2026-09-10
Baseline revisada / Reviewed baseline: `v0.6.0`

## Estado actual / Current status

El checkout publicado de `0.6.0` tiene issues abiertos de release: la opción
español no aparece en el selector, RTK no está empaquetado, los MCP dependen de
`uvx` externo/bootstrap, el test de ventanas no captura flashes transitorios y
Git no tiene diagnóstico suficiente dentro del sandbox. La alerta degradada del
primer arranque quedó corregida en `v0.2.2`, pero eso no cierra estos contratos.

The published `0.6.0` checkout has open release issues: Spanish is missing from
the selector, RTK is not bundled, MCPs depend on external/bootstrap `uvx`, the
window test does not capture transient flashes, and Git lacks sufficient
sandbox diagnostics. The first-start degraded-catalog alert was fixed in
`v0.2.2`, but it does not close these contracts.

## Limitaciones operativas / Operational limitations

### KI-001 — Free Pool availability is external / La disponibilidad del Free Pool es externa

The OpenCode Free route depends on the local bridge, available workers, provider/session limits, and network conditions. A pool can temporarily report zero workers, retry, or lose a stream even when the API key is valid. FreeCode retries bounded failures and reports the pool state, but it cannot remove upstream, IP, quota, or network limits.

La ruta OpenCode Free depende del puente local, los workers disponibles, los límites de proveedor/sesión y la red. El pool puede informar temporalmente cero workers, reintentar o perder un stream aunque la API key sea válida. FreeCode reintenta fallos acotados e informa el estado del pool, pero no puede eliminar límites upstream, de IP, cuota o red.

### KI-002 — Windows artifacts are large / Los artefactos Windows son grandes

The portable and setup artifacts include a local runtime and can require several minutes and substantial disk space on first installation or extraction. This is an operational cost of the current packaging, not evidence that the application is hung. The release notes should continue to state the expected size and first-run behavior.

Los artefactos portable y setup incluyen un runtime local y pueden requerir varios minutos y bastante espacio en disco durante la primera instalación o extracción. Es un costo operativo del empaquetado actual, no una evidencia de que la aplicación se haya colgado. Las notas de release deben seguir informando el tamaño esperado y el comportamiento del primer arranque.

### KI-003 — RTK is not bundled yet / RTK todavía no está empaquetado

RTK is not bundled in the published `0.6.0` artifact. The code still probes
the user PATH, so the release is not self-contained. The corrective plan must
ship RTK with version/hash/license metadata and verify it offline. Caveman's
current optional behavior remains separate and must not be used as evidence that
RTK is packaged.

RTK no está incluido en el artefacto publicado de `0.6.0`: el código todavía
consulta el PATH del usuario y por eso el release no es autocontenido. El plan
correctivo debe incluir RTK con metadata de versión/hash/licencia y verificarlo
offline. El comportamiento opcional actual de Caveman es separado y no prueba
que RTK esté empaquetado.

### KI-004 — External MCP processes need prerequisites / Los procesos MCP externos requieren prerequisites

The MCP client bridge, catalog, configuration file, and managed patch are
shipped and enabled on first boot, but the published artifact still bootstraps
`uvx.exe` in the user profile and fetches server packages externally. This is
not an offline dependency closure. Serena owns semantic code navigation; no
separate LSP bridge is shipped. See [`mcp-servers.md`](mcp-servers.md).

El bridge cliente MCP, el catálogo, el archivo de configuración y el patch
administrado vienen incluidos y activados en el primer arranque, pero el
artefacto publicado todavía instala/bootstrappea `uvx.exe` en el perfil del
usuario y descarga los paquetes de servidores. No es una clausura offline.
Serena gestiona la navegación semántica; no se distribuye un bridge LSP
separado. Ver [`mcp-servers.md`](mcp-servers.md).

### KI-005 — Provider/model desynchronization can look like an invalid API key / El desajuste proveedor-modelo puede parecer una API key inválida

On 2026-08-26, a long session first received a `503 Endpoint is unavailable` from the upstream and, on subsequent retries, `401 Model x-preview-f(-free) is not supported`. The UI rendered the latter as `API key is invalid` because it maps the generic `AUTH` code to that message. Context pruning/compaction was present, but there was no evidence of a hard token or context ceiling.

Changing provider may recover the request only when the selected model is supported and healthy on that provider; changing the provider alone is not sufficient. The next version should refresh the catalog and automatically select a healthy compatible model, then try the next configured provider/model when available, while preserving the actual upstream diagnostic in the UI.

El 2026-08-26, una sesión extensa recibió primero `503 Endpoint is unavailable` del upstream y, en los reintentos posteriores, `401 Model x-preview-f(-free) is not supported`. La interfaz mostró `API key is invalid` porque traduce el código genérico `AUTH` a ese mensaje. Hubo pruning/compaction por el tamaño de la conversación, pero no evidencia de haber alcanzado un techo duro de tokens o contexto.

Cambiar de proveedor puede recuperar la solicitud sólo si el modelo seleccionado es compatible y está saludable en ese proveedor; cambiar el proveedor por sí solo no alcanza. La próxima versión debería refrescar el catálogo y seleccionar automáticamente un modelo compatible saludable, y luego probar el siguiente proveedor/modelo configurado si existe, conservando en la interfaz el diagnóstico real del upstream.

## Issues resueltos / Resolved historical issues

These entries are kept here so an old report is easy to classify:

- The Spanish language option was intended to be restored, but is missing from
  the published 0.6.0 catalog and remains an open regression.
- Tool calls request headless execution, but transient descendant-window
  creation remains unproven and is under audit.
- The FreeCode animated working background is present.
- Pool shutdown errors are handled as state/diagnostic information rather than an API-key failure.
- The primary README, Spanish README, and release descriptions have bilingual coverage.
- The embedded Chromium address bar and panel layout were corrected in `v0.2.2`; Enter/Go, bare-host HTTPS navigation, and text reflow are covered by the release implementation.

Estas entradas quedan para clasificar rápidamente reportes antiguos:

- La opción de español debía estar restaurada, pero falta en el catálogo
  publicado de 0.6.0 y sigue siendo una regresión abierta.
- Los tool calls solicitan ejecución headless, pero la creación transitoria de
  ventanas descendientes sigue sin estar probada y está bajo auditoría.
- Está presente el fondo animado de trabajo de FreeCode.
- Los errores de apagado del pool se tratan como estado/diagnóstico y no como fallo de API key.
- El README principal, el README en español y las descripciones de release tienen cobertura bilingüe.
- La barra de direcciones y el layout del Chromium embebido se corrigieron en `v0.2.2`; Enter/Ir, navegación HTTPS de hosts simples y reflow del texto quedan cubiertos por la implementación del release.

## Cómo reportar un problema nuevo / How to report a new issue

Include the FreeCode version, Windows architecture, selected language, model/pool, whether RTK is enabled, the approximate time, and the relevant session-log excerpt with secrets removed. For stream failures, include whether the failure recovered automatically and whether the same request works after switching model or pool.

Incluí la versión de FreeCode, arquitectura de Windows, idioma elegido, modelo/pool, si RTK está habilitado, hora aproximada y el fragmento relevante del log de sesión sin secretos. Para fallos de stream, indicá si se recuperó automáticamente y si la misma solicitud funciona después de cambiar de modelo o pool.
