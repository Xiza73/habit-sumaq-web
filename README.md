# Habit Sumaq — Web

Frontend de Habit Sumaq: aplicación web de finanzas personales + hábitos + tareas diarias + reportes. Consume la [API REST del backend](https://github.com/Xiza73/habit-sumaq-backend) (NestJS 11 + PostgreSQL).

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Lenguaje | TypeScript 5 (strict) |
| State (cliente) | Zustand |
| State (server) | TanStack Query |
| Forms | React Hook Form + Zod |
| i18n | next-intl (es / en / pt) |
| Icons | Lucide React |
| Charts | Recharts |
| Drag & drop | `@dnd-kit` |
| Markdown | `react-markdown` + `remark-gfm` |
| Auth | Google OAuth (JWT access en memoria, refresh en HttpOnly cookie) |
| Testing | Vitest + React Testing Library + Playwright |
| Package manager | pnpm |

## Prerequisitos

- Node.js ≥ 22
- pnpm ≥ 9
- Backend de Habit Sumaq corriendo localmente o accesible por HTTP

## Setup local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno
cp .env.example .env.local
# Editar .env.local según tu setup (ver sección abajo)

# 3. Levantar el dev server
pnpm dev
```

Abrí [http://localhost:3001](http://localhost:3001).

> La primera vez que entres con tu cuenta, el frontend detecta automáticamente tu IANA timezone vía `Intl.DateTimeFormat` y la guarda en user-settings. Podés cambiarla después en `/settings`.

## Variables de entorno

Definidas en `.env.local`. Todas deben tener prefijo `NEXT_PUBLIC_*` para ser expuestas al cliente.

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3001` | Puerto del dev server |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3010/api/v1` | Base URL del backend |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` | URL pública del frontend (usada en callbacks OAuth) |

## Comandos

```bash
pnpm dev          # Dev server con hot reload
pnpm build        # Build de producción
pnpm start        # Servidor de producción (requiere build previo)
pnpm lint         # ESLint sobre todo el repo
pnpm test         # Tests unitarios (Vitest)
pnpm test:e2e     # Tests end-to-end (Playwright)
pnpm tsc --noEmit # Verificar tipos sin emitir
```

## Estructura de carpetas

Clean Architecture adaptada al App Router de Next.js:

```
src/
├── app/                       # Routes de Next.js
│   ├── (auth)/                # Grupo público (login, callback)
│   └── (dashboard)/           # Grupo protegido (todo el resto)
├── core/
│   ├── application/           # Casos de uso del cliente (hooks)
│   │   ├── hooks/             # TanStack Query hooks + lógica de UI
│   │   └── stores/            # Zustand stores (auth, UI)
│   └── domain/                # Tipos, schemas Zod, enums
│       ├── entities/          # Interfaces puras
│       ├── schemas/           # Zod schemas de validación
│       ├── enums/             # Enums como const
│       └── constants/         # Constantes de dominio (ej: timezones curados)
├── infrastructure/
│   ├── api/                   # Clientes REST (http-client, *.api.ts)
│   └── config/                # Lectura de env vars
├── presentation/
│   ├── components/            # UI compartida (ui, layout, feedback)
│   ├── features/              # Features del producto
│   │   ├── accounts/
│   │   ├── categories/
│   │   ├── transactions/
│   │   ├── monthly-services/
│   │   ├── habits/
│   │   ├── quick-tasks/
│   │   ├── reports/
│   │   └── settings/
│   └── providers/             # Providers de contexto
├── i18n/
│   └── messages/              # es.json, en.json, pt.json
├── lib/                       # Helpers puros (format, utils)
└── test/                      # Setup y utilidades de testing
```

Reglas:

- **Server Components por defecto**, `'use client'` solo si hay interactividad.
- **Un componente por archivo** (PascalCase, función nombrada).
- **Hooks personalizados en archivos separados** con prefijo `use`.
- **UI texts siempre por `next-intl`** — nada hardcodeado.
- **Validación con Zod** antes de mandar al backend; errores inline por campo.
- Ver [docs/frontend/conventions.md](docs/frontend/conventions.md) para detalle.

## Módulos implementados

- **Autenticación** — Login con Google OAuth, JWT con refresh silencioso
- **Cuentas** — CRUD completo con archivado
- **Categorías** — CRUD con categorías default por usuario
- **Transacciones** — CRUD con 5 tipos (INCOME, EXPENSE, TRANSFER, DEBT, LOAN), settle, bulk settle, debts dashboard
- **Servicios mensuales** — Pagos recurrentes (luz, agua, internet, ...) con pagar / saltear mes / archivar
- **Hábitos** — Tracking diario/semanal con streaks, heatmap y stats
- **Diarias** — Lista TODO diaria con DnD, markdown y lazy cleanup en medianoche del user
- **Settings** — Idioma, tema, moneda default, formato de fecha, inicio de semana, timezone (auto-detectado)
- **Reportes** — Dashboards agregados por módulo (Finanzas, Rutinas) con período configurable

## Documentación adicional

| Documento | Ubicación |
|---|---|
| Arquitectura | [docs/frontend/architecture.md](docs/frontend/architecture.md) |
| Convenciones | [docs/frontend/conventions.md](docs/frontend/conventions.md) |
| Plan de implementación | [docs/frontend/implementation-plan.md](docs/frontend/implementation-plan.md) |
| i18n | [docs/frontend/i18n.md](docs/frontend/i18n.md) |
| Testing | [docs/frontend/testing.md](docs/frontend/testing.md) |
| State management | [docs/frontend/state-management.md](docs/frontend/state-management.md) |
| Temas y paletas | [docs/frontend/themes.md](docs/frontend/themes.md) |
| Linting y formateo | [docs/frontend/linting.md](docs/frontend/linting.md) |
| Reglas de negocio | [docs/frontend/business-rules.md](docs/frontend/business-rules.md) |

### Contrato con el backend (single source of truth)

Estos tres documentos **viven canónicamente en `habit-sumaq-backend`** — este repo solo tiene stubs con el link porque el backend es quien define el contrato:

| Documento | Canonical (backend) |
|---|---|
| API Reference | [habit-sumaq-backend/docs/frontend/api-reference.md](https://github.com/Xiza73/habit-sumaq-backend/blob/master/docs/frontend/api-reference.md) |
| Enums | [habit-sumaq-backend/docs/frontend/enums.md](https://github.com/Xiza73/habit-sumaq-backend/blob/master/docs/frontend/enums.md) |
| Códigos de error | [habit-sumaq-backend/docs/frontend/error-codes.md](https://github.com/Xiza73/habit-sumaq-backend/blob/master/docs/frontend/error-codes.md) |

## Convención de documentación

Todo cambio con impacto de contrato (endpoint, módulo nuevo, variable de entorno, comando, schema) debe documentarse **antes** del PR y **después** al mergear. Ver la sección "Convención de documentación" en [`CLAUDE.md`](CLAUDE.md).

## Contribuir

1. Branch desde `master`: `feat/<módulo>/<descripción>` o `fix/<módulo>/<descripción>`
2. Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
3. Pipeline local antes del PR: `pnpm tsc --noEmit` + `pnpm lint` + `pnpm test`
4. Nunca mergear a `master` sin PR; CI + Vercel preview deben estar verdes

## Licencia

Privado. Todos los derechos reservados.
