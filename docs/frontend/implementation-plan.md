# Plan de Implementación

Desarrollo progresivo por fases. Cada fase produce un incremento funcional y testeado.

---

## Fase 0 — Fundación (Scaffolding)

**Objetivo:** Configurar la base del proyecto antes de cualquier feature.

| # | Tarea | Detalle |
|---|---|---|
| 0.1 | Reestructurar a `src/` | Mover `app/` dentro de `src/`, actualizar `tsconfig.json` paths |
| 0.2 | Crear estructura de carpetas | `core/`, `infrastructure/`, `presentation/`, `lib/`, `i18n/` |
| 0.3 | Configurar Tailwind CSS 4 con tokens de tema | Variables CSS semánticas, modo claro/oscuro |
| 0.4 | Instalar dependencias core | `zustand`, `@tanstack/react-query`, `react-hook-form`, `zod`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `next-intl` |
| 0.5 | Configurar `http-client.ts` | Wrapper de fetch con base URL, interceptors, refresh de tokens |
| 0.6 | Configurar TanStack Query provider | `QueryProvider.tsx` con defaults |
| 0.7 | Configurar ThemeProvider | Soporte light/dark/system |
| 0.8 | Configurar i18n | `next-intl` con archivos base de mensajes (es, en, pt) |
| 0.9 | Crear componentes UI base | `Button`, `Input`, `Card`, `Modal`, `Select`, `LoadingSpinner`, `EmptyState`, `Toast` |
| 0.10 | Configurar ESLint + import order | Reglas de import, no unused vars, etc. |
| 0.11 | Configurar Vitest | Setup con React Testing Library, aliases de path |
| 0.12 | Configurar variables de entorno | `.env.local`, `env.ts` tipado |

**Entregable:** Proyecto limpio con arquitectura lista, UI kit base funcional, y un componente de ejemplo renderizando.

---

## Fase 1 — Autenticación

**Objetivo:** Login con Google OAuth, manejo de sesión, guards de rutas.

| # | Tarea | Detalle |
|---|---|---|
| 1.1 | Crear `auth.store.ts` | Zustand store para access token en memoria |
| 1.2 | Crear `auth.api.ts` | Funciones: `initiateGoogleLogin()`, `refreshToken()`, `logout()`, `getMe()` |
| 1.3 | Crear `http-client.ts` interceptors | Auto-attach del token, auto-refresh en 401, redirect a login si refresh falla |
| 1.4 | Crear page `/login` | Botón "Iniciar sesión con Google", layout público |
| 1.5 | Crear page `/auth/callback` | Captura `accessToken` de query param, guarda en store, redirige a dashboard |
| 1.6 | Crear `AuthProvider` | Verifica sesión al cargar, redirige si no autenticado |
| 1.7 | Crear layout `(dashboard)` | Auth guard, sidebar skeleton, header con avatar |
| 1.8 | Crear layout `(auth)` | Layout público sin sidebar |
| 1.9 | Implementar logout | Llamar API, limpiar store, redirigir a login |
| 1.10 | Tests | Auth flow, guards, refresh token |

**Entregable:** Usuario puede loguearse con Google, ver su dashboard vacío, y hacer logout.

---

## Fase 2 — Settings de Usuario

**Objetivo:** El usuario puede configurar sus preferencias (idioma, tema, moneda, formato de fecha).

| # | Tarea | Detalle |
|---|---|---|
| 2.1 | Crear `user-settings.api.ts` | `getSettings()`, `updateSettings()` |
| 2.2 | Crear `use-user-settings.ts` hook | Query + mutation para settings |
| 2.3 | Crear `UserSettings` entity y schema | Tipos + validación Zod |
| 2.4 | Crear page `/settings` | Formulario con selects para cada preferencia |
| 2.5 | Integrar tema con settings | Sincronizar ThemeProvider con la preferencia guardada en backend |
| 2.6 | Integrar i18n con settings | Cambiar idioma dinámicamente según preferencia |
| 2.7 | Integrar dateFormat | Usar la preferencia para formatear fechas en toda la app |
| 2.8 | Tests | Formulario, persistencia, cambio de tema/idioma |

**Entregable:** Settings funcionales que persisten en backend y aplican inmediatamente en la UI.

---

## Fase 3 — Módulo de Cuentas (MVP Core)

**Objetivo:** CRUD completo de cuentas financieras.

| # | Tarea | Detalle |
|---|---|---|
| 3.1 | Crear `Account` entity + enums | Tipos, `AccountType`, `Currency` |
| 3.2 | Crear schemas Zod | `createAccountSchema`, `updateAccountSchema` |
| 3.3 | Crear `accounts.api.ts` | Todas las operaciones CRUD + archive |
| 3.4 | Crear `use-accounts.ts` hook | Queries y mutations con query keys |
| 3.5 | Crear `AccountCard` component | Card con nombre, tipo, ícono, color, balance |
| 3.6 | Crear `AccountList` component | Grid de cards, toggle archivar/mostrar archivadas |
| 3.7 | Crear page `/accounts` | Lista con botón "Nueva cuenta", filtros |
| 3.8 | Crear `AccountForm` component | Formulario de creación/edición con validación |
| 3.9 | Implementar crear cuenta | Modal con formulario, selección de tipo/moneda/color/ícono |
| 3.10 | Implementar editar cuenta | Modal pre-populated, campos no editables deshabilitados |
| 3.11 | Implementar archivar/desarchivar | Toggle con confirmación |
| 3.12 | Implementar eliminar cuenta | Confirmación, manejo de error ACC_003 si tiene transacciones |
| 3.13 | Crear `AccountDetail` page | Detalle de cuenta con resumen de balance |
| 3.14 | Componente sidebar/nav | Navegación entre módulos |
| 3.15 | Tests | Unit tests de componentes, integration tests de formularios |

**Entregable:** Módulo de cuentas completo con CRUD, validaciones y manejo de errores.

---

## Fase 4 — Módulo de Categorías

**Objetivo:** CRUD de categorías de ingreso/gasto.

| # | Tarea | Detalle |
|---|---|---|
| 4.1 | Crear `Category` entity + enums + schemas | Tipos y validación |
| 4.2 | Crear `categories.api.ts` + hooks | API client y TanStack Query hooks |
| 4.3 | Crear page `/categories` | Lista con tabs INCOME/EXPENSE |
| 4.4 | Crear `CategoryForm` | Creación/edición con selección de color/ícono |
| 4.5 | Implementar protección de categorías default | No editar tipo, no eliminar defaults |
| 4.6 | Tests | CRUD flow, edge cases |

**Entregable:** Categorías funcionales, listas para asociarse a transacciones.

---

## Fase 5 — Módulo de Transacciones

**Objetivo:** CRUD completo de transacciones con todos los tipos.

| # | Tarea | Detalle |
|---|---|---|
| 5.1 | Crear `Transaction` entity + enums + schemas | Todos los tipos y estados |
| 5.2 | Crear `transactions.api.ts` + hooks | Incluye settle endpoint |
| 5.3 | Crear page `/transactions` | Lista con filtros (cuenta, categoría, tipo, fecha, estado) |
| 5.4 | Crear `TransactionForm` | Formulario dinámico según tipo |
| 5.5 | Implementar INCOME/EXPENSE | Formulario básico |
| 5.6 | Implementar TRANSFER | Selector de cuenta destino, validación de moneda |
| 5.7 | Implementar DEBT/LOAN | Campo reference obligatorio, estado PENDING |
| 5.8 | Implementar liquidación (settle) | Formulario de liquidación parcial/total |
| 5.9 | Implementar edición | Restricciones según status |
| 5.10 | Implementar eliminación | Confirmación con aviso de cascada para DEBT/LOAN |
| 5.11 | Actualizar `AccountDetail` | Listar transacciones de la cuenta |
| 5.12 | Tests | Todos los tipos, settle flow, cascadas |

**Entregable:** Transacciones completas con todos los tipos, liquidaciones y cascadas.

---

## Fase 6 — Pulido y UX

**Objetivo:** Refinar la experiencia general.

| # | Tarea | Detalle |
|---|---|---|
| 6.1 | Responsive completo | Revisar todas las vistas en mobile, tablet, desktop |
| 6.2 | Loading states | Skeletons y spinners consistentes |
| 6.3 | Error boundaries | Manejo global + por sección |
| 6.4 | Empty states | Ilustraciones y CTAs para módulos vacíos |
| 6.5 | Toasts y notificaciones | Feedback de acciones exitosas/fallidas |
| 6.6 | Keyboard shortcuts | Acciones rápidas para power users |
| 6.7 | Optimistic updates | Actualizar UI antes de confirmación del backend |
| 6.8 | Animaciones | Transiciones suaves entre vistas y estados |
| 6.9 | Tests e2e | Playwright: flujos críticos end-to-end |
| 6.10 | Auditoría de accesibilidad | axe-core, contraste, navegación por teclado |

**Entregable:** Aplicación pulida, accesible y lista para producción.

---

## Módulos Futuros (fuera del MVP)

Estos módulos se planificarán después de completar las fases 0–6:

- **Daily Planner:** Planificación de gastos diarios, metas de ahorro.
- **Schedule:** Transacciones recurrentes, recordatorios.
- **Reportes:** Gráficos de gastos por categoría, tendencias mensuales.
- **Presupuestos:** Límites por categoría con alertas.
