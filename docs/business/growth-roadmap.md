# Growth roadmap — Habit Sumaq

> **Status:** ACTIVO — _este es el plan vivo. Actualizar cuando cambian
> prioridades._

## Norte estratégico

- **Corto plazo**: cubrir costos (~$25/mes) → necesitamos ~10 usuarios pagos
  → asumiendo 5-8% de conversión free→premium, eso son **100-200 MAU**.
- **Mediano plazo**: percibir ganancias → 500-1000 MAU.
- **Largo plazo**: feature parity con apps líderes en LATAM (bank sync via
  Belvo, cuentas compartidas, mobile native si la PWA no alcanza).

## Estado actual (snapshot)

| Métrica         | Hoy         | Meta Fase 1 | Meta Fase 2 | Meta Fase 3 |
| --------------- | ----------- | ----------- | ----------- | ----------- |
| MAU             | ~2          | 30-50       | 100-200     | 200-300     |
| D7 retention    | (sin medir) | >25%        | >30%        | >35%        |
| Activation rate | (sin medir) | >50%        | >60%        | >65%        |
| MRR             | $0          | $0          | $0          | ~$50        |

---

## Fases

### 🚀 Fase 1 — Foundation para crecer (2-3 semanas)

**Objetivo:** instrumentar el producto para medir y reducir fricción de
onboarding para que más usuarios se enganchen.

**Trabajo:**

- [x] Doc `docs/business/pricing.md` con tiering mapeado
- [x] Doc `docs/business/growth-roadmap.md` (este doc)
- [x] Doc `docs/business/coach-ia-feature.md` con la spec del feature insignia
- [x] Doc `docs/business/twa-deployment.md` con el proceso PWA → APK
- [x] **Posthog setup** + 5 eventos críticos (`login_completed`,
      `transaction_created`, `habit_logged`, `report_viewed`, identify/reset)
- [ ] Onboarding mejorado: tutorial post-login + datos demo opcionales
- [x] **Templates de hábitos / categorías** por arquetipo (Estudiante,
      Freelancer, Pareja) — shipped en [PR #59](https://github.com/Xiza73/habit-sumaq-web/pull/59)
- [x] **Shareable streak cards** — botón en HabitDetail (≥ 7 días) +
      modal automático en milestones grandes (mes, 100, 365). SVG → PNG
      con frases motivacionales rotativas en 8 tiers
- [ ] Web Push notifications básicas (recordatorios de hábito, registro de
      gasto)

**Métrica de éxito:** D7 retention >25%, activation rate >60% (signups con
≥1 transacción + ≥1 hábito en la primera semana).

#### Backlog técnico Fase 1+ (triaged)

Items que surgieron mientras laburábamos Fase 1. Priorizados por
**impacto / esfuerzo**, no por orden de aparición. Se agendan dentro de Fase 1
salvo el que diga lo contrario.

| Prio | Item                                              | Tipo    | Esfuerzo         | Notas                                                                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------- | ------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 ✅ | **Crear categoría inline en TransactionForm**     | Feature | ~3-4h            | Frontend-only. Shipped en PR #60. El `Select` de categoría tiene un botón "+ Crear nueva" que abre el `CategoryForm` modal y auto-selecciona la nueva categoría.                                                                                                                 |
| 2 ✅ | **Habit counter UX** (investigar)                 | Polish  | 30min            | Investigated. El feature de contador (`+`/`-` botones con progress) **ya existe y funciona**. Lo que el user pedía era un **cronómetro** (modo basado en tiempo), que es un feature distinto — spec'd en [habit-timer-feature.md](habit-timer-feature.md), agendado para Fase 2. |
| 3 ✅ | **Persistencia de secciones colapsadas en Tasks** | Bug     | ~5h (back+front) | Shipped. Column `isCollapsed` en `sections` (migration `AddIsCollapsedToSections1741000021000`) + endpoint PATCH + frontend con optimistic.                                                                                                                                      |
| 4 ✅ | **Date format unificado en forms**                | Bug     | ~6-10h           | Shipped. Existe `src/presentation/components/ui/DatePicker.tsx`; el único `type="date"` que queda en el repo es el que ese componente envuelve. Respeta `userSettings.dateFormat`.                                                                                               |
| 5 🟡 | **APK del PWA**                                   | Ops     | 1-2h             | Path A (PWABuilder) ejecutado, APK generado y compartido con friends & family. Path B (Play Store) pendiente. Ver [twa-deployment.md](twa-deployment.md).                                                                                                                        |
| 6 ✅ | **Quitar URL bar del TWA** (`assetlinks.json`)    | Ops     | ~1h              | Shipped. `public/.well-known/assetlinks.json` en el repo, servido por Vercel.                                                                                                                                                                                                    |

#### Backlog Sept 2026 (triaged, orden aprobado)

Ronda de feedback de uso real. Triage hecho contra el código — tres items
resultaron distintos a la hipótesis inicial, ver la columna "Diagnóstico".

**Tanda 1 — quick wins.** Todo chico, alto ratio. Independientes entre sí.

| #   | Item                                                | Repo    | Diagnóstico                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F3  | Título de alerta de chore overdue dice "Toca hoy"   | web     | **NO es tema de estados ni copy-paste: es una decisión deliberada que hay que revisar.** `CHORE_OVERDUE` y `CHORE_DUE_TODAY` son alert types separados y el backend emite el correcto. El título en presente lo eligió el [PR #136](https://github.com/Xiza73/habit-sumaq-web/pull/136) (`feat/alerts/present-tense-overdue-copy`) para que el popover no se leyera como lista de fracasos, y está fijado por tests en `AlertItem.test.tsx`. Lo que #136 no cubrió es que el **subtitle contradice al title** en la misma tarjeta ("Toca hoy" arriba, "3 días atrasada" abajo). ✅ Resuelto con "Pendiente: {name}" en [PR #153](https://github.com/Xiza73/habit-sumaq-web/pull/153) — ver abajo. |
| F5  | Card de Chores crece con nombres largos             | web     | El nombre empuja la etiqueta de categoría abajo y el chip de estado más abajo. Layout puro.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| F8  | Default de `favoriteKeys` apunta a módulos borrados | backend | Default = `['accounts','transactions','habits','quick-tasks']`; `accounts` y `transactions` murieron en v1.0.0. El frontend filtra las keys muertas pero `length` sigue en 4 → pega contra `MAX_FAVORITES` → no puede agregar, y como no se renderizan tampoco puede quitarlas. **Soft-lock para todo usuario nuevo.** Mantener el fix MÍNIMO: F2 lo va a extender.                                                                                                                                                                                                                                                                                                                               |
| F4a | App desktop abre múltiples instancias               | web     | **No es bug ni hace falta shippear nada: ya está publicado.** `86c4d2a feat(desktop): keep a single instance` es ancestro de `v0.13.0`, cuyo release está publicado desde 2026-08-21 con los 4 instaladores adjuntos. `git log v0.13.0..dev -- src-tauri` da **0 commits**, así que ese instalador es el build desktop más nuevo posible. El usuario corre el instalador `desktop-v0.6.0` de julio. ✅ Se resuelve instalando `v0.13.0` — cortar `desktop-v0.7.0` habría publicado el mismo código Rust con un número de versión MENOR. Ver abajo.                                                                                                                                                |

**Tanda 2 — bugs de lógica.**

| #   | Item                                          | Repo | Diagnóstico                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | --------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F6  | Modal de racha sale al marcar días anteriores | web  | `HabitList` loguea la fecha de su date picker, así que rellenar un día olvidado empujaba `currentStreak` sobre un milestone y disparaba la celebración. ✅ Resuelto con un guard `data.date !== getTodayLocaleDate()` en `useLogHabit`, colocado **después** del refetch para que el día rellenado igual llegue a la cache — shipped en [PR #155](https://github.com/Xiza73/habit-sumaq-web/pull/155). Nota: se había anticipado que F6 produciría el helper de "período" que F7 necesita, y **no fue así** — F6 solo necesita "¿es hoy?". F7 tiene que construir ese helper igual. |
| F4b | No aparece "abrir al iniciar máquina"         | web  | Falla en **runtime**, no por código faltante: capabilities `autostart:allow-*` presentes en el tag, `AutostartSection` montada en `settings/page.tsx`. `useAutostart` cae a `'unsupported'` y esconde la sección si `isTauri()` da false o si el plugin tira error. ✅ **Era el mismo build viejo que F4a, no un bug.** Instalando `v0.13.0` el toggle aparece y funciona. Cero código.                                                                                                                                                                                             |

##### Cómo funciona realmente el release desktop

Vale dejarlo escrito porque se asumió mal una vez y casi cuesta un release
duplicado. `.github/workflows/desktop-release.yml`:

- Dispara con tags **`v*`** (release de web) **y** `desktop-v*`. O sea: **cada
  release de web ya adjunta instaladores**. No existe "cortar un release desktop
  aparte" salvo que se toque `src-tauri`.
- **Sincroniza la versión desde el tag** y reescribe `tauri.conf.json` en CI. El
  valor commiteado en ese archivo solo rige en runs de `workflow_dispatch`, así
  que verlo desactualizado NO significa que los instaladores lo estén.
- **`releaseDraft: true`** → el GitHub Release se crea como **borrador** con los
  instaladores adjuntos, para revisar antes de publicar.

> **Antes de cortar cualquier release, verificar si ya está publicado:**
> `gh release view <tag> --json assets,isDraft,publishedAt` y
> `git merge-base --is-ancestor <commit> <tag>`. Dos comandos que contestan si
> hace falta trabajo o no.

**Tanda 3 — features con diseño.**

| #   | Item                                       | Repo                   | Alcance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Color por valor en la vista de tabla       | web                    | ✅ Shipped en [PR #156](https://github.com/Xiza73/habit-sumaq-web/pull/156). **Mucho más chico de lo que parecía.** Auditados los 5 módulos con tabla: solo `habit` y `category` tienen campo `color`; `chore`, `monthly-service` y `debt-loan` NO lo tienen, y su único color es el de estado, que las tablas ya llevaban. Categories ya mostraba el suyo (ícono teñido + columna Color). **El hueco entero era `HabitsTable`**, cuya celda de nombre era `<span>{habit.name}</span>` pelado. Resuelto espejando la celda de `CategoriesTable`.                                                                                                                                                                                                                                                              |
| F2  | Habilitar/deshabilitar módulos en Settings | web + backend (mínimo) | ✅ Shipped en tres PRs: [backend#94](https://github.com/Xiza73/habit-sumaq-backend/pull/94) (columna `disabledModules`), [web#157](https://github.com/Xiza73/habit-sumaq-web/pull/157) (toggles + navegación) y [web#158](https://github.com/Xiza73/habit-sumaq-web/pull/158) (reportes + alertas). Las 11 entradas del registry son apagables. Se sostiene **un invariante** en vez de casos especiales por superficie: `favoriteKeys` nunca nombra un módulo apagado — `ModulesSection` lo quita en el mismo PATCH que lo apaga, y los pickers no lo ofrecen de vuelta. El filtro de alertas vive en el `select` de la query, no en el popover, para que el badge de la campana no pueda contar lo que la lista va a esconder. Ver validación abajo.                                                        |
| F7  | Shields de racha en Habits                 | web + backend          | Ver spec abajo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| F9  | Deduplicar `STATUS_CLASSES` de chores      | web                    | Surgió revisando F1. El mismo `Record<ChoreStatus, string>` está copiado literal en `ChoreCard.tsx:38` y `ChoresTable.tsx:34`. Hoy coinciden; el día que alguien cambie un color en uno y no en el otro, card y tabla discrepan sin que nada se ponga en rojo. **El patrón de la casa ya existe**: `monthly-services` tiene su `MONTHLY_SERVICE_STATUS_CLASSES` en `src/lib/monthly-service-status.ts:61` e importa desde ambas vistas, y `src/lib/chore-status.ts` ya existe (ya exporta el tipo `ChoreStatus`). Al mover, **preservar los comentarios de diseño** de la copia de `ChoreCard` — explican por qué `today` lleva el color fuerte no alarmante y `horizon` va deliberadamente apagado. No es un bug hoy: es la misma clase de problema que causó F1, color que vive en un lado y no en el otro. |

##### F3 — decisión tomada

Convivían **tres** filosofías de copy para alertas vencidas:

| Alert type                          | Título           | Postura                                                                    |
| ----------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| `service-past-due-day`              | "Pasó la fecha"  | Evita "hoy" a propósito — hay un test que afirma que la palabra NO aparece |
| `service-due-today` (sin due day)   | "Vence este mes" | Evita "hoy" a propósito                                                    |
| `chore-overdue` / `service-overdue` | "Toca hoy"       | Afirmaba "hoy" (PR #136)                                                   |

El PR #136 razonó que un ítem atrasado sigue siendo algo para hacer HOY, y que
liderar con "Atrasada" convertía el popover en una lista de fracasos. El
razonamiento se sostiene — pero cubrió la coherencia entre **títulos**, no la
que hay entre **título y subtítulo**. En la misma tarjeta se leía "Toca hoy"
arriba y "3 días atrasada" abajo, y eso es lo que el usuario reportó.

**Resuelto con "Pendiente: {name}"** (`Pending` / `Pendente`) para
`chore-overdue` y `service-overdue` — shipped en
[PR #153](https://github.com/Xiza73/habit-sumaq-web/pull/153). Sigue siendo un
llamado a la acción, así que conserva la intención de #136, pero no afirma una
fecha que el subtítulo después contradice. Las tres filosofías quedan alineadas
en una: **un ítem vencido nunca dice "hoy"**.

Se descartaron: volver al pasado ("Atrasada: {name}"), que revertía #136 sin
más; y ablandar el subtítulo, que dejaba la incoherencia de fondo intacta.

Los tests de `AlertItem.test.tsx` que fijaban "Toca hoy" ahora fijan
"Pendiente" **y además afirman que "hoy" no aparece**, igual que el de
`service-past-due-day`. La contradicción no puede volver sin ponerse en rojo.

##### F2 — validación del alcance backend

La pregunta era si hace falta tocar backend. Medido contra el código:

| Superficie                          | ¿Backend?            | Por qué                                                                                                                                                                                                                                            |
| ----------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistir qué módulos están activos | **Sí — una columna** | `user_settings` tiene solo columnas tipadas, no hay blob JSON. Agregar `disabledModules text[]` + migración + campo en el DTO.                                                                                                                     |
| Ocultar en navegación               | No                   | `nav-registry.ts` filtra.                                                                                                                                                                                                                          |
| Reportes                            | No                   | `finances-dashboard` y `routines-dashboard` devuelven secciones nombradas (`pendingDebts`, `topExpenseCategories`, …). El frontend no renderiza la sección del módulo apagado. El backend sigue computando — desperdicio inofensivo, cero trabajo. |
| Alertas                             | No                   | `AlertType` está tipado por módulo (`SERVICE_*`, `CHORE_*`, `BUDGET_*`, …). Un filtro en el hook de alertas alcanza.                                                                                                                               |

**Veredicto: backend sí, pero exactamente una columna.** Podría evitarse con
`localStorage`, pero la app corre en web + PWA + desktop: apagar un módulo en
la laptop y encontrarlo vivo en el teléfono es peor que la migración. Además
hay precedente — `favoriteKeys` y `monthlyServicesGroupBy` ya viven ahí.

> **Trampa a cubrir en F2:** un favorito que apunta a un módulo deshabilitado.
> El filtro actual (`isFavoriteKey`) solo descarta keys _desconocidas_; la de un
> módulo apagado es _conocida pero inactiva_. Sin extender ese filtro, F2
> reintroduce exactamente el soft-lock de F8.

##### F7 — spec de shields

Mecánica decidida:

- **Aplicación manual.** El usuario ve que perdió la racha y decide gastar el
  escudo. Menos mágico que el consumo automático y evita quemarlo en un hábito
  que no le importa.
- **Stock máximo: 2.**
- **Se gana 1 por mes calendario**, condicionado a tener al menos un hábito con
  racha ≥ 20 días. La condición se evalúa durante todo el mes: si el día 1 no
  llega a 20, tiene el resto del mes para lograrlo y ganarlo.
- **Ventana de rescate: el período siguiente completo.** Pasado, la racha se
  pierde definitivamente.

**La ventana se expresa en períodos, no en días.** `HabitFrequency` es
`DAILY | WEEKLY`, y `StatsCalculator` ya cuenta la racha en esa misma unidad:
`calculateDaily` camina día por día, `calculateWeekly` agrupa por **semana ISO**
y camina semana por semana. La regla del escudo hereda esa unidad en vez de
inventar una propia:

| Frecuencia | Período    | Ventana de rescate           |
| ---------- | ---------- | ---------------------------- |
| `DAILY`    | Día        | Todo el día siguiente        |
| `WEEKLY`   | Semana ISO | Toda la semana ISO siguiente |

Una sola regla — "el escudo rescata el último período perdido y vive durante
todo el período siguiente" — en vez de dos casos especiales que hay que
mantener sincronizados. Si algún día aparece una frecuencia nueva, la regla ya
la cubre.

> **Reusar, no reimplementar:** la ventana debe derivarse del mismo helper de
> límites de período que use `StatsCalculator` (`toWeekKey` / `toWeekStart`).
> Dos definiciones de "semana" en el mismo dominio es un bug esperando su turno.

##### F7 — el mecanismo (hallazgo que define el diseño)

**La racha no está almacenada en ningún lado.** No hay columna de streak ni en
`habits` ni en `habit_logs`: `StatsCalculator` la deriva en cada lectura,
caminando hacia atrás sobre las fechas completadas hasta encontrar un hueco.

Por eso "rescatar una racha" no puede ser `streak = N` — no hay dónde ponerlo.
Tiene que significar **que el cálculo trate el período perdido como cumplido**,
y eso deja dos caminos:

| Camino                                           | Problema                                                                                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escribir un log sintético en el día perdido      | **Corrompe la historia.** El completion rate lo cuenta como hecho, el calendario muestra un día que no se hizo, el longest streak se infla. Se compra una racha con una mentira en los datos. |
| Tabla aparte de rescates que el cálculo consulta | Los logs quedan intactos. **Este.**                                                                                                                                                           |

> **Consecuencia:** la auditoría por hábito **no es una política elegible, es el
> mecanismo**. `habit_streak_rescues` con único en `(habitId, period)` tiene que
> existir para que el feature funcione, y de paso hace imposible rescatar dos
> veces el mismo período.

##### F7 — decisiones cerradas

| Pregunta                                        | Decisión      | Por qué                                                                                                                       |
| ----------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Escudo ganado con el stock lleno (2)            | **Se pierde** | El tope es lo que le da valor al escudo. Acumulando, en seis meses hay ocho y la mecánica pierde toda tensión.                |
| ¿El período rescatado cuenta para la **racha**? | **Sí**        | Es exactamente lo que el escudo existe para proteger.                                                                         |
| ¿Para el **longest streak**?                    | **Sí**        | Es la misma racha que se está salvando.                                                                                       |
| ¿Para el **completion rate**?                   | **NO**        | La racha es motivación; el completion rate es honestidad. Si el escudo infla los dos, no queda ninguna métrica que no mienta. |

**Cuándo se gana el escudo:** al **registrar** un hábito (`POST` de log), no al
leer. Un `GET` que otorga escudos es un efecto secundario escondido en una
lectura, y además la única forma de que una racha llegue a 20 días es
registrando — que es justo donde el cálculo ya corre.

### 📈 Fase 2 — Killer feature + crecimiento (6-8 semanas)

**Objetivo:** tener UN feature que justifique pagar y que sea narrativa
única.

**Trabajo:**

- [ ] **Coach personal con IA** (ver [coach-ia-feature.md](coach-ia-feature.md))
- [x] **Hábitos modo cronómetro** (ver [habit-timer-feature.md](habit-timer-feature.md)) —
      shipped en [PR #113](https://github.com/Xiza73/habit-sumaq-web/pull/113)
      (`feat/habits/focus-timer`). Queda pendiente explotarlo como narrativa de TikTok.
- [ ] Vinculación Hábitos ↔ Finanzas (alimenta al Coach)
- [ ] Presupuestos por categoría con alertas (ya en backlog técnico)
- [ ] Export / import (free, generoso) — ver [pricing.md → Trust signals](pricing.md#trust-signals-qué-no-es-premium)
- [ ] TikTok content consistente (paralelo, ongoing)

**Métrica de éxito:** 100-200 MAU, retention D7 >30%.

### 💰 Fase 3 — Monetización (3-4 semanas, recién con 100+ MAU)

**Objetivo:** cubrir costos.

**Trabajo:**

- [ ] Stripe integration + webhook handlers
- [ ] `@RequirePremium()` decorator en backend
- [ ] `<PremiumGate>` + paywalls contextuales en frontend (NUNCA al login)
- [ ] Founder Lifetime program: pantalla de claim, conteo público
- [ ] Pricing page pública (`/upgrade`)
- [ ] Comunicación de lanzamiento: email a current users + post anunciando
      founder enrollment

**Métrica de éxito:** ~10 conversiones a $5/mes = $50 MRR (cubre costos +
margen para reinvertir en growth).

### 🏦 Fase 4 — Escalado (cuando lleguemos a 500-1000 MAU)

**Objetivo:** ganancias estables, feature parity con líderes.

**Backlog (por priorizar cuando llegue el momento):**

- Bank sync via Belvo (huge — requiere SAS legal en LATAM, KYC, ~3 meses)
- Cuentas compartidas (couple/family finance)
- Mobile native real (Expo + RN) si la PWA no alcanza
- Integraciones (Notion, Google Calendar, Apple Health para hábitos)
- Cupones / promos / referrals

---

## Stack de analytics

### Posthog (cloud free tier)

- Free hasta **1M events/mes** — más que suficiente para 200 MAU
- Funnels, retention, session replay out of the box
- TypeScript-first SDK
- GDPR-friendly

**Comportamiento por ambiente:**

- **Producción** (`NODE_ENV=production`) → init automático si hay `NEXT_PUBLIC_POSTHOG_KEY` seteada
- **Desarrollo** (`pnpm dev`) → **NO** init por default. Eventos quedan no-op silencioso. Esto evita polución del dashboard de prod con eventos de testing + ruido en la consola.
- **Override dev**: poner `NEXT_PUBLIC_POSTHOG_ENABLE_IN_DEV=true` en `.env.local` cuando quieras validar eventos end-to-end desde dev. Después borralo para no contaminar.

### Eventos a trackear

```ts
// Auth & onboarding
posthog.capture('signup_completed', { method: 'google' });
posthog.capture('login_completed', { method: 'google' });
posthog.capture('onboarding_step', {
  step: 'welcome' | 'first-account' | 'first-habit' | 'done',
});
posthog.capture('template_applied', { template: 'student' | 'freelancer' | 'couple' });

// Activación (primer uso real de cada módulo)
posthog.capture('first_account_created');
posthog.capture('first_transaction_created');
posthog.capture('first_habit_created');
posthog.capture('first_habit_logged');
posthog.capture('first_budget_created');

// Engagement recurrente
posthog.capture('transaction_created', {
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'DEBT' | 'LOAN',
});
posthog.capture('habit_logged');
posthog.capture('task_completed');
posthog.capture('chore_completed');
posthog.capture('report_viewed', { type: 'finances' | 'routines' });
posthog.capture('streak_card_shared', { habit_id: '...', days: 30 });

// Monetización (Fase 3)
posthog.capture('paywall_seen', {
  feature: 'reports' | 'multi-currency' | 'coach-ia' | '...',
});
posthog.capture('upgrade_started', { plan: 'monthly' | 'annual' | 'lifetime' });
posthog.capture('upgrade_completed', { plan: '...' });
posthog.capture('founder_claimed');
posthog.capture('subscription_canceled', { reason: '...' });
```

### KPIs a vigilar semanalmente

| KPI                      | Meta        | Cómo se calcula                                            |
| ------------------------ | ----------- | ---------------------------------------------------------- |
| **D1 retention**         | >40%        | % de signups que vuelven al día siguiente                  |
| **D7 retention**         | >25%        | % que vuelven al día 7                                     |
| **D30 retention**        | >15%        | % que vuelven al día 30                                    |
| **Activation rate**      | >60%        | % de signups con ≥1 transacción + ≥1 hábito en semana 1    |
| **WAU/MAU stickiness**   | >0.3        | Frecuencia de uso semanal                                  |
| **MRR** (Fase 3+)        | $50 inicial | Revenue mensual recurrente                                 |
| **Conversión free→paid** | >5%         | % de free users que upgradean dentro de 30 días post-trial |
| **Churn mensual**        | <5%         | % de subscribers que cancelan cada mes                     |

> Con <50 MAU estos números son **ruido estadístico**. La meta de Fase 1 es
> establecer la baseline para cuando crezcamos.

---

## Estrategia de contenido (TikTok / Reels / Shorts)

### Plan inicial (vos solo + IA)

- **Producción**: el creator genera los videos con asistencia de IA (guion +
  edición). Empieza posteando, escala según funcionó.
- **Frecuencia**: 3 videos/semana mínimo (consistencia > perfección).
- **Plataformas**: TikTok primero, mismo contenido cross-posteado en
  Instagram Reels y YouTube Shorts.

### Reglas que funcionan en finanzas/productividad LATAM

1. **Hooks de dolor real, no features**:
   - ❌ "Mirá las nuevas tablas de Habit Sumaq"
   - ✅ "Cómo dejé de perder $200/mes en gastos hormiga"
   - ✅ "Mi pareja y yo registramos cada compra desde hace 6 meses, esto descubrimos"

2. **Antes/después visual**: caos del Excel vs pantalla de Habit Sumaq, en
   side-by-side de 5 segundos.

3. **15-30 segundos MAX**. Si no captás en los primeros 3 seg, perdiste.

4. **Engagement > vanity**: comentar en videos de creators del nicho
   ("Aprendamos Finanzas", "Sebastián De La Croix Finanzas", etc.) tiene
   mejor ROI que postear más videos propios.

### Templates de video iniciales (10 ideas)

1. "Pagué $X de servicios este mes, así los registro en 30 segundos"
2. "30 días registrando todo: descubrí que..."
3. "El hábito que me hizo ahorrar más sin querer"
4. "Cómo divido los gastos con mi pareja"
5. "El error que cometía con mis presupuestos (y cómo lo arreglé)"
6. "Mi rutina de revisión semanal de finanzas (3 minutos)"
7. "¿Sabés cuánto gastás en delivery? Yo no, hasta que hice esto"
8. "POV: tu app de finanzas también te muestra tus hábitos"
9. "El día que aprendí a separar gastos hormiga de gastos fijos"
10. "Por qué dejé de usar Excel para mis finanzas"

### Shareable streak cards (Fase 1)

Feature técnico que potencia el loop viral:

- Botón "Compartir mi racha" en cada hábito con racha ≥ 7 días
- Genera imagen 1080×1920 con: nombre del hábito, días seguidos, badge
  visual, branding sutil de Habit Sumaq
- Compartir directo a Instagram Stories / WhatsApp / X / Threads

> **Por qué importa**: cada vez que un usuario postea su racha, sus amigos
> preguntan "¿qué app es?" → tráfico orgánico de calidad.

---

## Costos operativos actuales

| Item             | Costo mensual | Provider                                |
| ---------------- | ------------- | --------------------------------------- |
| Hosting frontend | $0            | Vercel free tier (alcanza para 200 MAU) |
| Hosting backend  | $10-20        | Railway (NestJS + Postgres)             |
| Dominio          | $1.25         | $15/año amortizado                      |
| Posthog          | $0            | Free tier hasta 1M events/mes           |
| **Total**        | **~$15-25**   |                                         |

| Item                     | Costo único | Notas                                       |
| ------------------------ | ----------- | ------------------------------------------- |
| Play Store fee           | $25         | Una vez en la vida (cuando publiquemos APK) |
| Apple Developer (futuro) | $99/año     | Solo si publicamos en App Store             |

---

## Próximos pasos inmediatos

1. ✅ Doc de pricing y growth-roadmap
2. ✅ Setup de Posthog + primeros eventos críticos
3. ✅ Templates de hábitos / categorías por arquetipo (PR #59)
4. ✅ Shareable streak cards
5. ⏭️ **Tanda 1 del backlog Sept 2026** (F3, F5, F8, F4a) — ver arriba
6. ⏭️ Onboarding mejorado: tutorial post-login + datos demo opcionales
7. ⏭️ Web Push notifications básicas
8. ⏭️ Empezar a postear contenido en TikTok
