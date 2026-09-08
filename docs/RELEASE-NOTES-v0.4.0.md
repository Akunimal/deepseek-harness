# FreeCode DeepSeek Harness v0.4.0

## English

**Updater Fix + Caveman evaluation**

### Fixed

- **Application updater**: explicit download control prevents double-download races, and a tray notification appears during the update process.
- **Update indicator button** aligned with the Send button visual system, replacing the standalone circular control.
- **Gemini Web2API models** use the `Bearer freecode-local` auth header and include bounded retry/timeout settings.

### Changed

- Spanish locale support was verified and documented.
- Caveman was documented as an opt-in roadmap candidate; it was not bundled or enabled by this release.
- Added `docs/GEMINI-WEB2API-IMPROVEMENTS.md` with streaming and tool-calling proposals for the Gemini Web2API bridge.

## Español

**Corrección del actualizador + evaluación de Caveman**

### Corregido

- **Actualizador de la aplicación**: el control explícito de descarga evita carreras de doble descarga y muestra un aviso en la bandeja durante la actualización.
- **Indicador de actualización** alineado con el sistema visual del botón Enviar, en reemplazo del control circular independiente.
- **Modelos Gemini Web2API**: usan el header `Bearer freecode-local` e incluyen límites de reintentos y timeout.

### Cambiado

- Se verificó y documentó el locale español.
- Caveman quedó documentado como candidato opt-in del roadmap; esta release no lo incluye ni lo habilita.
- Se agregó `docs/GEMINI-WEB2API-IMPROVEMENTS.md` con propuestas de streaming y tool calling para el puente Gemini Web2API.
