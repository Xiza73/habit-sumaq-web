# TWA Deployment — PWA → APK / AAB

> **Status:** OPERACIONAL — _instrucciones para empaquetar la PWA como app
> nativa Android cuando se necesite (Play Store o testing interno)._

## Por qué TWA y no React Native / Flutter

TL;DR de la decisión arquitectural (discutida en sesión de diseño):

- Tenemos un PWA funcional con manifest correcto + maskable icons
  (ver [release v0.1.1](https://github.com/Xiza73/habit-sumaq-web/releases/tag/v0.1.1)).
- TWA (Trusted Web Activity) wrappea la PWA en un APK nativo Android.
- **Reuso 100% del código actual** — no hay codebase paralela.
- Ideal para: presencia en Play Store, push notifications nativas, perceived
  legitimacy ("descargá nuestra app").

**Cuándo migrar a RN / Flutter**: solo si la PWA + TWA no alcanza para
features específicos (widgets, biometría profunda, Apple Watch). Hoy no es
el caso.

---

## Dos paths según necesidad

Hay **dos caminos** para empaquetar la PWA. Elegí según el caso de uso:

| Path | Caso de uso | Costo | Tiempo | Tooling local |
| ---- | ----------- | ----- | ------ | -------------- |
| **A — APK para compartir** | Alpha / friends & family / testing privado | $0 | ~10 min | Solo navegador |
| **B — Play Store** | Lanzamiento público con presencia en store | $25 USD one-time | 1-2 días | Java + Android SDK + Bubblewrap |

> Si dudás cuál usar: arrancá con A. Es revertible — el APK que genera Path A
> también sirve para subir a Play Store después si te gusta cómo se ve.

---

## Path A — APK para compartir (PWABuilder)

Para cuando solo querés un `.apk` que mandás por WhatsApp/Telegram/email a
tus amigos para que prueben la app. **Sin Play Store, sin instalar nada
local, sin cuenta de developer.**

### Pre-requisitos

- [ ] La PWA está deployada en HTTPS y accesible públicamente (ej.
      `https://habitsumaq.com`). Vercel te da esto gratis.
- [ ] El `manifest.json` apunta a íconos maskable correctos (ya está,
      [v0.1.1](https://github.com/Xiza73/habit-sumaq-web/releases/tag/v0.1.1)).
- [ ] **Backup mental:** vas a recibir un `signing-key.keystore` —
      guardalo en un lugar seguro (1Password, Drive privado). Lo necesitás
      para todas las versiones futuras del APK.

### Pasos

1. Ir a https://www.pwabuilder.com
2. Pegar la URL del PWA: `https://habitsumaq.com`
3. PWABuilder analiza el manifest + service worker → muestra score y
   warnings. Score >= 80 es suficiente para Path A.
4. Click "**Package For Stores**" → tab "**Android**"
5. Click "**Generate Package**". Configurar:
   | Campo            | Valor                       |
   | ---------------- | --------------------------- |
   | Package ID       | `com.habitsumaq.app`        |
   | App name         | `Habit Sumaq`               |
   | Launcher name    | `Sumaq`                     |
   | App version      | `1`                         |
   | Version name     | `0.1.2` (matchea el release) |
   | Display mode     | `standalone`                |
   | Status bar color | `#16a34a` (theme color)     |
   | Signing key      | **"Generate new"**          |

   > ⚠️ **`Package ID` no se puede cambiar después.** Una vez que un user
   > instala el APK con ese ID, futuros APKs deben usar el mismo ID o
   > se instalan como apps separadas.

6. Download → ZIP con:
   - **`app-release-signed.apk`** ← lo que vas a compartir
   - `app-release-bundle.aab` ← guardar para futuro Play Store
   - `assetlinks.json` ← para Path B futuro (deployar a `.well-known/`)
   - **`signing-key.keystore`** ← **GUARDAR EN LUGAR SEGURO**
   - `signing-key-info.txt` ← password + alias del keystore (también guardar)

7. Compartir el `.apk` por WhatsApp / Telegram / email.

### Cómo lo instalan tus amigos (instrucciones para mandar con el APK)

1. Recibir el archivo `.apk` (WhatsApp, email, lo que sea).
2. En Android: Settings → Security → "Install unknown apps" →
   habilitar para WhatsApp/Telegram/Files (lo que usen).
3. Tap el APK → "Install".
4. **Heads up:** la primera vez que abre la app, podría aparecer una
   barra de URL de Chrome arriba (porque no configuramos Digital Asset
   Links — eso es Path B). Para alpha está bien, se siente "casi nativo"
   pero con esa pista de que es web.

### Lo que **funciona** vía Path A

- ✅ Login con Google
- ✅ Service worker / cache offline
- ✅ Push notifications (Web Push)
- ✅ Manifest icons / splash screen
- ✅ Standalone mode (sin chrome del navegador, salvo lo del Asset Links)

### Lo que **NO funciona** vía Path A (necesitás Path B)

- ❌ Distribución masiva (no podés subir a Play Store)
- ❌ Auto-updates (cada nueva versión = nuevo APK + reenvío manual)
- ❌ Verified TWA (la barra de URL aparece la primera vez si no se setea
  Asset Links + verificación)
- ❌ Search en Play Store (los amigos te encuentran solo por link)

### Updates en Path A

Para distribuir una nueva versión:

1. Volver a PWABuilder → mismo flujo
2. **IMPORTANTE: subir el mismo `signing-key.keystore`** del primer
   build (en lugar de "Generate new"). Si generás uno nuevo, los
   amigos no pueden actualizar — tienen que desinstalar + reinstalar.
3. Bumpear `App version` (ej. `2`) y `Version name` (ej. `0.1.3`).
4. Generate → mandar el nuevo APK.

---

## Path B — Play Store publication (Bubblewrap)

> Esta sección es la guía completa de publicación a Play Store. Solo
> hace falta cuando ya validaste el producto con Path A y querés
> presencia oficial en la store. Trigger sugerido:
> [Fase 3 del growth roadmap](growth-roadmap.md#-fase-3--monetización-3-4-semanas-recién-con-100-mau).

### Pre-requisitos (Path B)

#### Pre-flight checklist (validar antes de buildear)

La PWA tiene que cumplir TODOS estos requisitos para que TWA funcione bien:

- [ ] HTTPS en producción (Vercel da esto gratis)
- [ ] `manifest.json` con: `name`, `short_name`, `start_url`,
  `display: standalone`, `theme_color`, `background_color`, `icons`
  (incluyendo maskable de 512×512)
- [ ] Service worker registrado y activo
- [ ] Página principal carga sin JavaScript errors
- [ ] Lighthouse PWA score > 90 (verificar en Chrome DevTools → Lighthouse →
  PWA audit)
- [ ] Digital Asset Links configurado (ver paso 5 abajo)

#### Cuentas y herramientas

- **Cuenta Google Play Console**: $25 USD one-time
  (https://play.google.com/console)
- **Java JDK 17+** instalado (`java -version`)
- **Node.js 18+** (ya lo tenemos)
- **Bubblewrap CLI**: `npm install -g @bubblewrap/cli`

---

### Proceso paso a paso (Path B)

### 1. Instalar Bubblewrap

```bash
npm install -g @bubblewrap/cli
bubblewrap doctor   # verifica Java + Android SDK
```

Si `doctor` se queja, seguir las instrucciones para instalar Android SDK.
Bubblewrap puede descargarlo automáticamente con el primer `bubblewrap init`.

### 2. Inicializar el proyecto TWA

Desde un directorio fuera de `habit-sumaq-web` (recomendado:
`~/twa-projects/habit-sumaq-twa/`):

```bash
mkdir -p ~/twa-projects/habit-sumaq-twa
cd ~/twa-projects/habit-sumaq-twa
bubblewrap init --manifest=https://habitsumaq.com/manifest.json
```

Bubblewrap te va a preguntar (los valores recomendados están en negrita):

| Prompt                   | Respuesta                                                     |
| ------------------------ | ------------------------------------------------------------- |
| Application name         | **Habit Sumaq**                                               |
| Short name               | **Sumaq**                                                     |
| Application ID (package) | **`com.habitsumaq.app`**                                      |
| Start URL                | **`/accounts`**                                               |
| Display mode             | **`standalone`**                                              |
| Status bar color         | **`#16a34a`** (theme color)                                   |
| Splash screen color      | **`#ffffff`** (background color)                              |
| Icon URL                 | `https://habitsumaq.com/icons/icon-512.png`                   |
| Maskable icon URL        | `https://habitsumaq.com/icons/icon-512-maskable.png`          |
| Signing key              | Generar nueva (Bubblewrap te guía paso a paso)                |

### 3. Configurar el signing key

Bubblewrap genera un keystore en `android.keystore`. **GUARDAR ESTO EN UN
LUGAR SEGURO** — sin él **NO PODÉS actualizar la app**.

```bash
# Backup del keystore en lugar seguro (1Password, gestión de secretos, etc.)
cp android.keystore ~/safe-storage/habit-sumaq-keystore.jks
```

Anotar también la password del keystore (no se puede recuperar si se pierde).

> ⚠️ Si perdés el keystore, **tenés que crear una app nueva en Play Store**
> con package name diferente, y pedirle a todos los usuarios que la
> reinstalen. Es un infierno. **No lo pierdas.**

### 4. Build del APK / AAB

```bash
# Para testing local (APK directo, instalable en device)
bubblewrap build --skipPwaValidation

# Para Play Store (AAB recomendado)
bubblewrap build --skipPwaValidation --androidAppBundle
```

Output:

- `app-release-signed.apk` → para sideload directo en device
- `app-release-bundle.aab` → para Play Store upload

### 5. Configurar Digital Asset Links

Para que el APK NO muestre la barra de URL de Chrome (verdadera experiencia
"app"), tenés que probar que el dominio te pertenece:

1. Bubblewrap genera el SHA-256 fingerprint del keystore. Copiarlo de la
   salida de `bubblewrap fingerprint`.
2. Crear el archivo `public/.well-known/assetlinks.json` en el repo
   `habit-sumaq-web`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.habitsumaq.app",
      "sha256_cert_fingerprints": ["AA:BB:CC:..."]
    }
  }
]
```

3. Deployar (push a master). Verificar que
   `https://habitsumaq.com/.well-known/assetlinks.json` responde con el JSON.

4. Validar con la herramienta oficial:
   https://developers.google.com/digital-asset-links/tools/generator

### 6. Testing local del APK

```bash
# Conectar el device Android con USB debugging activo
adb install app-release-signed.apk
```

Verificar:

- [ ] La app abre sin la barra de URL
- [ ] Splash screen muestra el logo
- [ ] Login con Google funciona
- [ ] Service worker / cache funcionan offline
- [ ] Push notifications llegan (si están implementadas)
- [ ] Maskable icon se ve correctamente en el launcher (squircle, círculo,
      teardrop según device)

### 7. Subir a Play Store

1. Crear nueva app en https://play.google.com/console
2. Application name: "Habit Sumaq"
3. Default language: Spanish (Latin America)
4. Category: Finance / Productivity (la que mejor aplique)
5. Subir el `.aab` en "Production track"
6. Completar el listing:
   - Screenshots (5 mínimo, en español)
   - Feature graphic (1024×500)
   - Short description (80 chars)
   - Full description (4,000 chars)
   - Privacy policy URL (**obligatorio**)
7. Content rating questionnaire
8. Pricing & availability (gratis, países de LATAM + España)
9. Submit for review (típicamente 1-7 días)

---

### Updates (Path B — publicar nueva versión)

Para subir una nueva versión:

1. Actualizar `versionCode` y `versionName` en el `twa-manifest.json` de
   Bubblewrap.
2. Buildear de nuevo con el **MISMO keystore**:

   ```bash
   bubblewrap build --androidAppBundle
   ```

3. Subir el nuevo `.aab` a Play Console como nueva release.

> **IMPORTANTE**: el `versionCode` debe ser estrictamente mayor que el
> anterior (1, 2, 3, ...). El `versionName` es legible humano (1.0.0,
> 1.0.1, ...).

---

### Troubleshooting común (Path B)

| Problema                                | Solución                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| "Lighthouse PWA score too low"          | Correr Lighthouse audit y fixear los warnings antes de buildear. Usar `--skipPwaValidation` solo para debugging.               |
| "Digital Asset Links not verified"      | Esperar 24h después de deployar `assetlinks.json`. Validar con la tool oficial. Ver paso 5.                                    |
| "Bubblewrap install fails on Windows"   | Usar WSL2 o pasar a Mac/Linux. Las herramientas Android son temperamentales en Windows nativo.                                 |
| "Stuck en Play review por días"         | Verificar que la privacy policy URL responde correctamente. Es la causa más común de hold ups.                                 |
| "App muestra barra de URL en runtime"   | Asset Links no está bien configurado. Re-verificar el SHA-256 fingerprint matchea el keystore actual.                          |
| "Crash al abrir la app"                 | Ver logs con `adb logcat`. Suele ser permisos faltantes o un service worker que falla.                                         |

---

## iOS PWA (cuando llegue el momento)

Apple no soporta TWA. Las opciones para iOS son:

1. **PWA "Add to Home Screen"** (lo que hay hoy): el usuario lo agrega
   manualmente desde Safari. Funciona razonablemente bien desde iOS 16.4+.
2. **Capacitor**: wrappea la PWA en una app iOS nativa. Requiere Apple
   Developer account ($99/año), Mac con Xcode, y proceso de review más
   estricto.
3. **React Native** (descartado por costo de oportunidad — ver discusión en
   sesión de diseño).

**Recomendación corto plazo**: polish del PWA install flow en iOS (banner
"Agregá a pantalla de inicio" para usuarios de Safari). Capacitor cuando
hayamos validado revenue en Android.

---

## Costos comparados

| Item                                  | Path A (PWABuilder) | Path B (Play Store)         |
| ------------------------------------- | ------------------- | --------------------------- |
| Tooling local                         | $0 (browser)        | $0 (Bubblewrap es local)    |
| Cuenta de developer                   | —                   | Play Store: $25 USD one-time |
| Apple Developer (futuro iOS)          | —                   | $99 USD/año                 |
| Hosting de `assetlinks.json` (HTTPS)  | —                   | $0 (Vercel sirve el static) |
| Tiempo total                          | ~10 min             | 1-2 días                    |

---

### Cuándo ejecutar Path B

**Mínimos para que valga la pena el upgrade A → B:**

- [ ] La PWA pasa Lighthouse PWA audit con score > 90
- [ ] Tenés privacy policy publicada y accesible (obligatoria para Play)
- [ ] Decidiste el `package_name` final (no se puede cambiar después —
      idealmente el mismo que usaste en Path A)
- [ ] Tenés screenshots y feature graphic listos para el listing

**Trigger sugeridos:**

- **Lanzamiento público**: cuando arrancás Fase 3 del growth roadmap
  (junto con el lanzamiento de paywall + Founder program). Es el
  momento de máxima atención mediática.

---

## Referencias

- [Bubblewrap docs](https://github.com/GoogleChromeLabs/bubblewrap)
- [TWA overview (Chrome dev docs)](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Digital Asset Links generator](https://developers.google.com/digital-asset-links/tools/generator)
- [Play Console help](https://support.google.com/googleplay/android-developer)
- [PWABuilder (alternativa GUI a Bubblewrap)](https://www.pwabuilder.com/)
