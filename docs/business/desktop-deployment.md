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

1. Sincroniza la versión del `tauri.conf.json` con el tag (para que el
   instalador diga la versión correcta).
2. Compila en `windows-latest` y `macos-latest`.
3. Genera los instaladores:
   - **Windows:** `.exe` (NSIS) + `.msi` (WiX)
   - **macOS:** `.dmg` universal (Apple Silicon + Intel)
4. Crea un **GitHub Release en borrador** con los instaladores adjuntos, para
   revisar antes de publicar.

### Instaladores en cada release web (versiones alineadas)

El workflow **también dispara con tags `v*`** (los del release web/app). Así,
al cortar un release web, los instaladores se generan solos con **la misma
versión**, y web + desktop quedan alineados.

> **Importante para el release web:** como el workflow crea el GitHub Release
> (borrador con los instaladores), el flujo web ya **no** debe hacer
> `gh release create` manual para ese tag — chocaría. El proceso pasa a ser:
> `merge dev → master`, `push master` (deploy Vercel), `push tag vX.Y.Z` → el
> workflow compila los instaladores y arma el release borrador para publicar.

El tag `desktop-v*` sigue disponible para un rebuild **solo de escritorio**
(cambios del shell nativo / íconos) entre releases web.

## Ventanas flotantes (picture-in-picture)

Varios módulos se pueden abrir en una **ventana propia, siempre al frente**, que
flota sobre el navegador, el editor o lo que sea. Es desktop y nada más: un
navegador no puede poner nada encima de otras aplicaciones, así que el botón
no se renderiza ahí (`canUsePip()` → `isTauri()`).

Dos formas, y la maquinaria no distingue entre ellas — solo cambia si se pasa
un `id`:

| Forma | Módulos | Ruta |
| --- | --- | --- |
| Una ventana por ítem | `habits`, `chores`, `tasks` | `/pip/<módulo>/<id>` |
| Una ventana con la lista | `priorities`, `reminders` | `/pip/<módulo>` |

La etiqueta de ventana (`pip-<módulo>[-<id>]`) es lo que hace que un segundo
click **enfoque** la ventana existente en vez de abrir una duplicada. Y tiene que
empezar con `pip-` sí o sí: la capability concede permisos a `pip-*` y a nada más.

Cada ventana renderiza **el mismo componente** que la lista — el de hábitos usa
`HabitCard` con el botón de abrir cambiado por uno de cerrar. No se hace un
segundo componente parecido: dos copias divergen la primera vez que se toca
cualquiera de las dos.

### Lo que hay que saber antes de tocarlo

**1. Una capability aplica solo a las etiquetas de ventana que lista.** Por eso
existe `capabilities/pip.json` con `"windows": ["pip-*"]`. Sin ese archivo una
ventana creada en runtime nace **sin permisos**, ni siquiera para cerrarse a sí
misma. Y `default.json` necesita `core:webview:allow-create-webview-window`
porque la creación la inicia la ventana principal.

**2. Cada ventana es un webview aparte** — otro contexto JS, otro store de
Zustand, otro caché de TanStack Query. Dos consecuencias:

- La sesión se re-establece sola porque el access token viaja en **cookie** del
  mismo origen. Si algún día el token vuelve a memoria, el popup deja de
  autenticarse.
- Actuar desde el popup invalida solo SU caché. Sin sincronización, la lista de
  atrás sigue mostrando el estado viejo — dos versiones de la misma fila en
  pantalla al mismo tiempo. Lo resuelve el evento `pip:changed` de Tauri:
  `notifyPipChanged()` emite tras cada mutación y `usePipWindowSync(keys)`
  escucha e invalida las queries que esa ventana muestra. La ventana principal
  lo monta vía `<PipWindowSync />` en el layout del dashboard.

  **El evento es UNO SOLO y no lleva payload**, a propósito. Eventos por módulo
  ahorrarían algún refetch en una ventana cuyos datos no cambiaron, y lo
  comprarían con una clase entera de bugs de "nadie emitió para el módulo X".
  Con un puñado de ventanas abiertas como mucho, ese refetch es gratis y el bug
  es imposible.

**3. Los permisos de Tauri viajan en el INSTALADOR, no en el deploy.** El shell
carga `https://habit-sumaq-web.vercel.app`, así que el código web llega a todos
con el deploy de Vercel, pero `capabilities/` y el Rust solo llegan a quien
instale una versión nueva. Un usuario con el instalador viejo va a ver el botón
y la creación de ventana le va a fallar.

Por eso `openHabitPip()` devuelve `false` en vez de tirar, y la UI muestra
_"Actualiza la app de escritorio"_. **Este feature necesita un release de
escritorio** (tag `v*` o `desktop-v*`) para funcionar de verdad.
## Logs de la app instalada

Desde v0.12.1 el build de **release** escribe logs a archivo. Antes solo lo hacía el build de
debug, así que un reporte de bug del escritorio no tenía ninguna evidencia detrás y solo se
podía responder con teorías.

| SO | Ruta |
| -- | ---- |
| Windows | `%APPDATA%\com.habitsumaq.app\logs\habit-sumaq.log` |
| macOS | `~/Library/Logs/com.habitsumaq.app/habit-sumaq.log` |
| Linux | `~/.local/share/com.habitsumaq.app/logs/habit-sumaq.log` |

Rota a 1 MB y conserva un archivo (`KeepOne`) — es diagnóstico, no auditoría.

### Cómo leer un problema de doble instancia

Cada arranque escribe una línea con versión y **pid**. El handoff de single-instance escribe
otra cuando un segundo proceso le cede el paso al que ya corre.

```
habit-sumaq starting — version 0.12.1, pid 12345
single-instance: a second launch handed off to this instance
```

- **Una sola línea de `starting`** y después líneas de handoff → el single instance funciona.
- **Dos líneas de `starting` con pids distintos** y ninguna de handoff → el lock no se está
  compartiendo. Ahí sí hay bug, y el log lo prueba en vez de inferirlo de una captura.

Causa habitual del segundo caso: una versión **anterior a v0.11.0** todavía instalada. Esos
builds no traen el plugin, así que no reclaman el lock y conviven con el nuevo sin enterarse.
Revisar *Aplicaciones instaladas* y desinstalar lo viejo antes de concluir que el plugin falla.

## Follow-ups conocidos

- **Firma de código:** los instaladores salen sin firmar → Windows SmartScreen
  y macOS Gatekeeper advierten en la primera apertura. Firmar requiere cert de
  Apple ($99/año) y de Windows (OV/EV). Se configura vía secrets del workflow +
  `bundle.macOS.signingIdentity` / `bundle.windows.certificateThumbprint`.
- **Auto-updater:** Tauri tiene `plugin-updater` para actualizar el shell nativo
  sin reinstalar. Hoy no hace falta (el contenido se actualiza solo por ser
  remoto); solo aplica si cambiamos el shell seguido.
