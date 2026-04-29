# Plan de Implementación

Desarrollo progresivo por fases. Cada fase produce un incremento funcional y testeado.

---

## Fase 0 — Fundación (Scaffolding) ✅

**Objetivo:** Configurar la base del proyecto antes de cualquier feature.

| #    | Tarea                                        | Detalle                                                                                                                                         |
| ---- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1  | Reestructurar a `src/`                       | Mover `app/` dentro de `src/`, actualizar `tsconfig.json` paths                                                                                 |
| 0.2  | Crear estructura de carpetas                 | `core/`, `infrastructure/`, `presentation/`, `lib/`, `i18n/`                                                                                    |
| 0.3  | Configurar Tailwind CSS 4 con tokens de tema | Variables CSS semánticas, modo claro/oscuro                                                                                                     |
| 0.4  | Instalar dependencias core                   | `zustand`, `@tanstack/react-query`, `react-hook-form`, `zod`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `next-intl` |
| 0.5  | Configurar `http-client.ts`                  | Wrapper de fetch con base URL, interceptors, refresh de tokens                                                                                  |
| 0.6  | Configurar TanStack Query provider           | `QueryProvider.tsx` con defaults                                                                                                                |
| 0.7  | Configurar ThemeProvider                     | Soporte light/dark/system                                                                                                                       |
| 0.8  | Configurar i18n                              | `next-intl` con archivos base de mensajes (es, en, pt)                                                                                          |
| 0.9  | Crear componentes UI base                    | `Button`, `Input`, `Card`, `Modal`, `Select`, `LoadingSpinner`, `EmptyState`, `Toast`                                                           |
| 0.10 | Configurar ESLint + import order             | Reglas de import, no unused vars, etc.                                                                                                          |
| 0.11 | Configurar Vitest                            | Setup con React Testing Library, aliases de path                                                                                                |
| 0.12 | Configurar variables de entorno              | `.env.local`, `env.ts` tipado                                                                                                                   |

**Entregable:** Proyecto limpio con arquitectura lista, UI kit base funcional, y un componente de ejemplo renderizando.

---

## Fase 1 — Autenticación ✅

**Objetivo:** Login con Google OAuth, manejo de sesión, guards de rutas.

| #    | Tarea                               | Detalle                                                                       |
| ---- | ----------------------------------- | ----------------------------------------------------------------------------- |
| 1.1  | Crear `auth.store.ts`               | Zustand store para access token en memoria                                    |
| 1.2  | Crear `auth.api.ts`                 | Funciones: `initiateGoogleLogin()`, `refreshToken()`, `logout()`, `getMe()`   |
| 1.3  | Crear `http-client.ts` interceptors | Auto-attach del token, auto-refresh en 401, redirect a login si refresh falla |
| 1.4  | Crear page `/login`                 | Botón "Iniciar sesión con Google", layout público                             |
| 1.5  | Crear page `/auth/callback`         | Captura `accessToken` de query param, guarda en store, redirige a dashboard   |
| 1.6  | Crear `AuthProvider`                | Verifica sesión al cargar, redirige si no autenticado                         |
| 1.7  | Crear layout `(dashboard)`          | Auth guard, sidebar skeleton, header con avatar                               |
| 1.8  | Crear layout `(auth)`               | Layout público sin sidebar                                                    |
| 1.9  | Implementar logout                  | Llamar API, limpiar store, redirigir a login                                  |
| 1.10 | Tests                               | Auth flow, guards, refresh token                                              |

**Entregable:** Usuario puede loguearse con Google, ver su dashboard vacío, y hacer logout.

---

## Fase 2 — Settings de Usuario ✅

**Objetivo:** El usuario puede configurar sus preferencias (idioma, tema, moneda, formato de fecha).

| #   | Tarea                                | Detalle                                                          |
| --- | ------------------------------------ | ---------------------------------------------------------------- |
| 2.1 | Crear `user-settings.api.ts`         | `getSettings()`, `updateSettings()`                              |
| 2.2 | Crear `use-user-settings.ts` hook    | Query + mutation para settings                                   |
| 2.3 | Crear `UserSettings` entity y schema | Tipos + validación Zod                                           |
| 2.4 | Crear page `/settings`               | Formulario con selects para cada preferencia                     |
| 2.5 | Integrar tema con settings           | Sincronizar ThemeProvider con la preferencia guardada en backend |
| 2.6 | Integrar i18n con settings           | Cambiar idioma dinámicamente según preferencia                   |
| 2.7 | Integrar dateFormat                  | Usar la preferencia para formatear fechas en toda la app         |
| 2.8 | Tests                                | Formulario, persistencia, cambio de tema/idioma                  |

**Entregable:** Settings funcionales que persisten en backend y aplican inmediatamente en la UI.

---

## Fase 3 — Módulo de Cuentas (MVP Core) ✅

**Objetivo:** CRUD completo de cuentas financieras.

| #    | Tarea                            | Detalle                                                      |
| ---- | -------------------------------- | ------------------------------------------------------------ |
| 3.1  | Crear `Account` entity + enums   | Tipos, `AccountType`, `Currency`                             |
| 3.2  | Crear schemas Zod                | `createAccountSchema`, `updateAccountSchema`                 |
| 3.3  | Crear `accounts.api.ts`          | Todas las operaciones CRUD + archive                         |
| 3.4  | Crear `use-accounts.ts` hook     | Queries y mutations con query keys                           |
| 3.5  | Crear `AccountCard` component    | Card con nombre, tipo, ícono, color, balance                 |
| 3.6  | Crear `AccountList` component    | Grid de cards, toggle archivar/mostrar archivadas            |
| 3.7  | Crear page `/accounts`           | Lista con botón "Nueva cuenta", filtros                      |
| 3.8  | Crear `AccountForm` component    | Formulario de creación/edición con validación                |
| 3.9  | Implementar crear cuenta         | Modal con formulario, selección de tipo/moneda/color/ícono   |
| 3.10 | Implementar editar cuenta        | Modal pre-populated, campos no editables deshabilitados      |
| 3.11 | Implementar archivar/desarchivar | Toggle con confirmación                                      |
| 3.12 | Implementar eliminar cuenta      | Confirmación, manejo de error ACC_003 si tiene transacciones |
| 3.13 | Crear `AccountDetail` page       | Detalle de cuenta con resumen de balance                     |
| 3.14 | Componente sidebar/nav           | Navegación entre módulos                                     |
| 3.15 | Tests                            | Unit tests de componentes, integration tests de formularios  |

**Entregable:** Módulo de cuentas completo con CRUD, validaciones y manejo de errores.

---

## Fase 4 — Módulo de Categorías ✅

**Objetivo:** CRUD de categorías de ingreso/gasto.

| #   | Tarea                                        | Detalle                                       |
| --- | -------------------------------------------- | --------------------------------------------- |
| 4.1 | Crear `Category` entity + enums + schemas    | Tipos y validación                            |
| 4.2 | Crear `categories.api.ts` + hooks            | API client y TanStack Query hooks             |
| 4.3 | Crear page `/categories`                     | Lista con tabs INCOME/EXPENSE                 |
| 4.4 | Crear `CategoryForm`                         | Creación/edición con selección de color/ícono |
| 4.5 | Implementar protección de categorías default | No editar tipo, no eliminar defaults          |
| 4.6 | Tests                                        | CRUD flow, edge cases                         |

**Entregable:** Categorías funcionales, listas para asociarse a transacciones.

---

## Fase 5 — Módulo de Transacciones ✅

**Objetivo:** CRUD completo de transacciones con todos los tipos.

| #    | Tarea                                        | Detalle                                                    |
| ---- | -------------------------------------------- | ---------------------------------------------------------- |
| 5.1  | Crear `Transaction` entity + enums + schemas | Todos los tipos y estados                                  |
| 5.2  | Crear `transactions.api.ts` + hooks          | Incluye settle endpoint                                    |
| 5.3  | Crear page `/transactions`                   | Lista con filtros (cuenta, categoría, tipo, fecha, estado) |
| 5.4  | Crear `TransactionForm`                      | Formulario dinámico según tipo                             |
| 5.5  | Implementar INCOME/EXPENSE                   | Formulario básico                                          |
| 5.6  | Implementar TRANSFER                         | Selector de cuenta destino, validación de moneda           |
| 5.7  | Implementar DEBT/LOAN                        | Campo reference obligatorio, estado PENDING                |
| 5.8  | Implementar liquidación (settle)             | Formulario de liquidación parcial/total                    |
| 5.9  | Implementar edición                          | Restricciones según status                                 |
| 5.10 | Implementar eliminación                      | Confirmación con aviso de cascada para DEBT/LOAN           |
| 5.11 | Actualizar `AccountDetail`                   | Listar transacciones de la cuenta                          |
| 5.12 | Tests                                        | Todos los tipos, settle flow, cascadas                     |

**Entregable:** Transacciones completas con todos los tipos, liquidaciones y cascadas.

---

## Fase 6 — Pulido y UX ✅

**Objetivo:** Refinar la experiencia general.

| #    | Tarea                      | Detalle                                             |
| ---- | -------------------------- | --------------------------------------------------- |
| 6.1  | Responsive completo        | Revisar todas las vistas en mobile, tablet, desktop |
| 6.2  | Loading states             | Skeletons y spinners consistentes                   |
| 6.3  | Error boundaries           | Manejo global + por sección                         |
| 6.4  | Empty states               | Ilustraciones y CTAs para módulos vacíos            |
| 6.5  | Toasts y notificaciones    | Feedback de acciones exitosas/fallidas              |
| 6.6  | Keyboard shortcuts         | Acciones rápidas para power users                   |
| 6.7  | Optimistic updates         | Actualizar UI antes de confirmación del backend     |
| 6.8  | Animaciones                | Transiciones suaves entre vistas y estados          |
| 6.9  | Tests e2e                  | Playwright: flujos críticos end-to-end              |
| 6.10 | Auditoría de accesibilidad | axe-core, contraste, navegación por teclado         |

**Entregable:** Aplicación pulida, accesible y lista para producción.

---

## Fase 7 — Módulo de Hábitos (Habit Tracker) ✅

**Objetivo:** Seguimiento de hábitos diarios/semanales con check-in, streaks y estadísticas.

> **Pre-requisito (7.0):** Reestructurar la navegación para soportar múltiples módulos (Finanzas + Hábitos) antes de implementar las vistas del módulo.

| #    | Tarea                                  | Detalle                                                         |
| ---- | -------------------------------------- | --------------------------------------------------------------- |
| 7.1  | Crear `Habit` entity + enums + schemas | Tipos, `HabitFrequency`, schemas Zod de creación/edición/log    |
| 7.2  | Crear `habits.api.ts` + hooks          | API client (CRUD + log + daily) y TanStack Query hooks          |
| 7.3  | Crear page `/habits`                   | Vista diaria con check-in: lista de hábitos + botón de marcar   |
| 7.4  | Crear `HabitCard` component            | Card con nombre, ícono, color, progreso (count/target), streak  |
| 7.5  | Crear `HabitForm` component            | Formulario de creación/edición con frequency, targetCount, etc. |
| 7.6  | Implementar check-in diario           | Tap para incrementar count, upsert log del día                  |
| 7.7  | Implementar vista de detalle          | Page `/habits/:id` con stats, historial de logs, calendario     |
| 7.8  | Implementar archivar/desarchivar       | Toggle con confirmación                                         |
| 7.9  | Implementar eliminar hábito            | Confirmación con aviso de eliminación de logs                   |
| 7.10 | Crear componente de streak/progress    | Visual de racha actual y tasa de completitud                    |
| 7.11 | Integrar en sidebar/nav                | Agregar "Hábitos" a la navegación principal                     |
| 7.12 | Tests                                  | Unit tests de componentes, integration tests de check-in flow   |

**Entregable:** Módulo de hábitos completo con check-in diario, streaks, historial y estadísticas.

---

## Fase 8 — Timezone en user-settings ✅

**Objetivo:** Guardar la IANA timezone del usuario como pre-requisito para features que razonan en "días del usuario" (cleanup diario, rangos calendario-alineados en reportes).

| #   | Tarea                                         | Detalle                                                                             |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| 8.1 | Añadir `timezone` al backend (user-settings)  | Columna `varchar(64)` con default `'UTC'` + validador `@IsIanaTimezone`             |
| 8.2 | Exponer `timezone` en la API response         | `PATCH/GET /users/settings` incluyen el nuevo campo                                 |
| 8.3 | Crear lista curada de timezones en front      | 22 IANA zones agrupadas en 5 regiones (América, Europa, Asia, Oceanía, UTC)         |
| 8.4 | Integrar selector en `/settings`              | `<optgroup>` nativos con i18n por locale. Fallback dinámico si la zona no está    |
| 8.5 | Auto-detect en primer login                   | Hook `useAutoDetectTimezone` en `DashboardShell` — PATCH silencioso si stored='UTC' |

**Entregable:** Todo usuario tiene una timezone correcta guardada, el resto del sistema puede confiar en `user.timezone`.

---

## Fase 9 — Quick Tasks (Diarias) ✅

**Objetivo:** Lista TODO diaria simple con cards, DnD, markdown y auto-cleanup al día siguiente.

| #   | Tarea                                          | Detalle                                                                  |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| 9.1 | Módulo backend `quick-tasks`                   | Entity (hard delete explícito), endpoints CRUD + reorder                 |
| 9.2 | Lazy cleanup timezone-aware                    | `GET /quick-tasks` borra `completed + completedAt < startOfTodayInTZ`    |
| 9.3 | Entity + schemas + api.ts + hooks en web       | Optimistic updates para toggle completed y reorder                       |
| 9.4 | Componentes `QuickTaskItem`, `QuickTaskForm`   | Card con drag handle, expand markdown, edit/delete                       |
| 9.5 | Markdown renderer + editor con preview toggle  | `react-markdown` + `remark-gfm`. Sin HTML raw por default                |
| 9.6 | DnD con `@dnd-kit`                             | Sortable solo sobre pendientes. Completadas no se reordenan              |
| 9.7 | Restructure del sidebar con sección "Rutinas"  | Agrupa Hábitos + Diarias. Nav mobile incluye Diarias                     |
| 9.8 | i18n en es / en / pt                           | Labels, estados y mensajes del flow completo                             |
| 9.9 | Tests unit de los 4 componentes + hook         | RTL + mocks de hooks                                                     |

**Entregable:** Pantalla `/quick-tasks` funcional, responsive, con DnD, markdown y persistencia con auto-cleanup.

---

## Fase 10 — Reportes (Dashboards agregados) ✅

**Objetivo:** Dashboards por módulo (Finanzas, Rutinas) con período configurable. Sin nuevo data — solo agregación de entidades existentes.

| #    | Tarea                                                                              | Detalle                                                                 |
| ---- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 10.1 | Endpoints backend `/reports/finances-dashboard` + `/reports/routines-dashboard`    | Aggregation con raw SQL + JOIN por moneda                               |
| 10.2 | Period helper timezone-aware (`week/30d/month/3m`)                                 | Intl-based, tests con DST                                               |
| 10.3 | Entity + api.ts + hooks en web                                                     | `useFinancesDashboard`, `useRoutinesDashboard`                          |
| 10.4 | Chart library — Recharts directo                                                   | Decidido por incompatibilidad de Tremor 3.x con Tailwind 4              |
| 10.5 | Shared primitives                                                                  | `PeriodSelector`, `KpiCard`, `BarList`, `ReportShell`                   |
| 10.6 | Página `/reports/finances`                                                         | Balance, flow, top categorías, debts KPI, daily flow chart              |
| 10.7 | Página `/reports/routines`                                                         | Today KPIs con progress bars, top habit streaks                         |
| 10.8 | Nueva sección "Reportes" en sidebar (bottom)                                       | Con entradas para Finanzas y Rutinas                                    |
| 10.9 | i18n completa en 3 locales                                                         | Reportes, periodos, widgets, labels                                     |

**Entregable:** Dashboards accesibles desde la sección "Reportes" en sidebar, cargan en <1s con datos reales, responsive.

---

## Fase 11 — Servicios Mensuales ✅

**Objetivo:** Gestionar pagos recurrentes (luz, agua, internet, ...) con un período de facturación mensual. Paga = genera `EXPENSE`; saltear = avanza el período sin movimiento.

| #     | Tarea                                                              | Detalle                                                                   |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 11.1  | `MonthlyService` entity + Zod schemas (`create/update/pay`)        | Currency y `startPeriod` inmutables después de creación                   |
| 11.2  | `monthly-services.api.ts` + hooks TanStack Query                   | Invalidation de `monthly-services` + `transactions` + `accounts` en `pay` |
| 11.3  | `MonthlyServiceCard`                                               | Estado derivado (paid / pending / overdue) + menú 3-dots + botones        |
| 11.4  | `MonthlyServicesSummary`                                           | KPIs del mes (pagados / pendientes / atrasados)                           |
| 11.5  | `MonthlyServiceForm` (create/edit)                                 | En edit: sin `currency` ni `startPeriod`                                  |
| 11.6  | `PayMonthlyServiceForm`                                            | Modal con amount / date / description / accountIdOverride                 |
| 11.7  | `MonthlyServicesList` (tabs activos / archivados + empty states)   | Grid responsive (1 / 2 / 3 cols)                                          |
| 11.8  | Page `/services` + item en sidebar (sección Finanzas)              | Ícono `Receipt` de lucide                                                 |
| 11.9  | i18n en es / en / pt                                               | Namespace `monthlyServices` + `errors.MSVC_001/002/003`                   |
| 11.10 | Tests                                                              | Schema (create/update/pay) + Card (estados) + List (loading/empty/data)   |

**Entregable:** Pantalla `/services` funcional con CRUD, pagar (crea EXPENSE), saltear mes, archivar y eliminar (bloqueado si hay pagos).

---

## Fase 12 — Chores (Quehaceres recurrentes no diarios) ✅

**Objetivo:** Tareas recurrentes con cadencia configurable en `days/weeks/months/years` (cortar pelo, limpiar alacena, ...). Hecho = log + `nextDueDate` recalculado; saltear = avanzar `nextDueDate` sin log.

| #    | Tarea                                                              | Detalle                                                                                |
| ---- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 12.1 | `Chore` + `ChoreLog` entities + Zod schemas (`create/update/done`) | `intervalValue` + `intervalUnit` inmutables; en edit se permite tocar `nextDueDate`    |
| 12.2 | `chores.api.ts` + hooks TanStack Query                             | Invalida `chores.list` + `chores.detail` + `chore-logs(:id)` en `markDone`             |
| 12.3 | `ChoreCard`                                                        | Estado derivado client-side (`overdue` / `upcoming` / `horizon`) + menú 3-dots         |
| 12.4 | Helper puro `chore-status.ts`                                      | `getChoreStatus(nextDueDate, today)` con tests de bordes (hoy, +7d, +8d, mes, año)     |
| 12.5 | `ChoreForm` (create/edit)                                          | En create: `intervalValue/Unit` + `startDate`; en edit: `nextDueDate` editable manual  |
| 12.6 | `MarkChoreDoneForm` (modal)                                        | `doneAt` (default = hoy user TZ) + `note` opcional                                     |
| 12.7 | `ChoreLogsHistoryDialog` (modal paginado)                          | Trigger desde menú 3-dots; reset de offset por chore vía `key={chore.id}`              |
| 12.8 | `ChoresList` (tabs activos / archivados + empty states)            | Sort default por `nextDueDate ASC`; grid responsive (1 / 2 / 3 cols)                   |
| 12.9 | Page `/chores` + item en sidebar (sección Rutinas)                 | Ícono `Wrench` de lucide                                                               |
| 12.10| i18n en es / en / pt                                               | Namespace `chores` + `errors.CHRE_001/002`                                             |
| 12.11| Tests                                                              | Schemas (create/update/markDone) + helper de status + Card + List                      |

**Entregable:** Pantalla `/chores` funcional con CRUD, marcar hecho (modal con fecha + nota), saltear ciclo, ver historial paginado, archivar y eliminar (bloqueado si hay logs).

---

## Módulos Futuros (fuera del MVP actual)

Estos módulos se planificarán después de las fases anteriores:

- **Presupuestos:** Límites por categoría con alertas.
- **Vinculación hábitos ↔ finanzas:** Hábitos con costo asociado (ej: "comer fuera" suma a gasto).
- **Schedule:** Transacciones recurrentes, recordatorios.
- **Export / import:** CSV/JSON de transacciones y tareas.
- **Historial de quick-tasks completadas:** Hoy se pierden al cleanup; requiere tabla de log dedicada.
- **Heatmap anual** en el dashboard de Rutinas.
- **Mobile app nativa** con Expo reusando la misma API.
