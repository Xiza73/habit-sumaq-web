# Desktop Deployment — Tauri v2 shell

> **Status:** OPERACIONAL — _la app de escritorio y su pipeline de instaladores._

## Qué es

Un shell de escritorio nativo (Tauri v2) que envuelve la PWA. Su único valor
propio frente al navegador es el **auto-inicio con el sistema** (launch on login),
expuesto como el toggle "Iniciar con el equipo" en Config.

## Arquitectura — shell a URL remota

La app **no empaqueta el frontend**: la ventana de Tauri carga la URL de
producción ya desplegada en Vercel.

- `build.devUrl` → `http://localhost:3000` (usado por `tauri dev`).
- `build.frontendDist` → `https://habit-sumaq-web.vercel.app` (usado por `tauri build`).

**Por qué remota y no export estático:** la app es 100% online (auth + toda la
data vienen del backend), y el i18n resuelve el locale desde una cookie en el
render server (`src/i18n/request.ts`), lo cual es incompatible con
`output: 'export'`. El shell remoto elimina ese problema por completo y hace que
la app de escritorio **se auto-actualice** con cada deploy web — no hay que
recompilar el desktop por cambios de contenido, solo por cambios del shell nativo.

### Cómo funciona el autostart desde un origen remoto

`tauri-plugin-autostart` corre en Rust; el JS (`@tauri-apps/plugin-autostart`)
lo invoca vía IPC. Para que el sitio remoto (Vercel) pueda usar ese IPC, la
capability lo habilita explícitamente:

```jsonc
// src-tauri/capabilities/default.json
"remote": { "urls": ["https://habit-sumaq-web.vercel.app"] },
"permissions": ["core:default", "autostart:allow-enable", "autostart:allow-disable", "autostart:allow-is-enabled"]
```

El plugin está gateado a desktop en `src-tauri/src/lib.rs` (`#[cfg(desktop)]`,
`MacosLauncher::LaunchAgent`). La sección de Config solo se renderiza cuando
`isTauri()` es verdadero (`AutostartSection.tsx`), así que los usuarios web/PWA
nunca ven un toggle muerto.

## Desarrollo local

```bash
. "$HOME/.cargo/env"   # o reiniciá la terminal (rustup agrega cargo al PATH)
pnpm tauri:dev         # levanta next dev (:3000) + la ventana de escritorio
```

Requiere el backend corriendo (`:3010`) y estar logueado para llegar a Config.

## Sacar un release de escritorio (instaladores)

Los instaladores de Windows **no se pueden compilar desde macOS**, así que el
empaquetado corre en CI (`.github/workflows/desktop-release.yml`) sobre runners
reales de Windows y macOS.

```bash
# Desde la raíz de habit-sumaq-web, con el shell ya en la versión deseada:
git tag -a desktop-v0.3.0 -m "Desktop v0.3.0"
git push origin desktop-v0.3.0
```

Esto dispara el workflow, que:

1. Compila en `windows-latest` y `macos-latest`.
2. Genera los instaladores:
   - **Windows:** `.exe` (NSIS) + `.msi` (WiX)
   - **macOS:** `.dmg` universal (Apple Silicon + Intel)
3. Crea un **GitHub Release en borrador** con los instaladores adjuntos, para
   revisar antes de publicar.

> El tag `desktop-v*` es independiente del flujo de release web (`master` →
> Vercel). Un release de escritorio no toca el deploy web ni viceversa.

## Follow-ups conocidos

- **Firma de código:** los instaladores salen sin firmar → Windows SmartScreen
  y macOS Gatekeeper advierten en la primera apertura. Firmar requiere cert de
  Apple ($99/año) y de Windows (OV/EV). Se configura vía secrets del workflow +
  `bundle.macOS.signingIdentity` / `bundle.windows.certificateThumbprint`.
- **Auto-updater:** Tauri tiene `plugin-updater` para actualizar el shell nativo
  sin reinstalar. Hoy no hace falta (el contenido se actualiza solo por ser
  remoto); solo aplica si cambiamos el shell seguido.
