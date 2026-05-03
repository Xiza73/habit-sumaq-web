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

## Pre-requisitos

### Pre-flight checklist (validar antes de buildear)

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

### Cuentas y herramientas

- **Cuenta Google Play Console**: $25 USD one-time
  (https://play.google.com/console)
- **Java JDK 17+** instalado (`java -version`)
- **Node.js 18+** (ya lo tenemos)
- **Bubblewrap CLI**: `npm install -g @bubblewrap/cli`

---

## Proceso paso a paso

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

## Updates (publicar nueva versión)

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

## Troubleshooting común

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

## Costos

| Item                                | Costo                       |
| ----------------------------------- | --------------------------- |
| Play Store fee (one-time, lifetime) | $25 USD                     |
| Apple Developer (anual, futuro)     | $99 USD/año                 |
| Build infra                         | $0 (Bubblewrap es local)    |
| Hosting de assetlinks.json          | $0 (Vercel sirve el static) |

---

## Cuándo ejecutar

**Mínimos para que valga la pena hacerlo:**

- [ ] La PWA pasa Lighthouse PWA audit con score > 90
- [ ] Tenés privacy policy publicada y accesible
- [ ] Decidiste el `package_name` final (no se puede cambiar después)
- [ ] Tenés screenshots y feature graphic listos para el listing

**Trigger sugeridos:**

- **Test interno**: cuando querés repartir un APK a beta testers (sin
  publicar). Saltea el paso 7.
- **Lanzamiento público**: cuando arrancás Fase 3 del growth roadmap (junto
  con el lanzamiento de paywall + Founder program). Es el momento de
  máxima atención mediática.

---

## Referencias

- [Bubblewrap docs](https://github.com/GoogleChromeLabs/bubblewrap)
- [TWA overview (Chrome dev docs)](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Digital Asset Links generator](https://developers.google.com/digital-asset-links/tools/generator)
- [Play Console help](https://support.google.com/googleplay/android-developer)
- [PWABuilder (alternativa GUI a Bubblewrap)](https://www.pwabuilder.com/)
