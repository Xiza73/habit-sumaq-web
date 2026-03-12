# Arquitectura — Clean Architecture para Next.js App Router

## Principio Rector

Separar el **qué hace la app** (dominio/negocio) del **cómo lo hace** (frameworks, API, UI). Las dependencias siempre apuntan hacia adentro: la capa de dominio no conoce React, Next.js ni ninguna librería externa.

```
┌─────────────────────────────────────────────────┐
│                  Presentation                   │  ← Next.js App Router, React components
│    app/  +  components/  +  layouts/  +  hooks  │
├─────────────────────────────────────────────────┤
│                  Application                    │  ← Use cases, TanStack Query hooks, Zustand stores
│         use-cases  +  hooks  +  stores          │
├─────────────────────────────────────────────────┤
│                 Infrastructure                  │  ← API clients, adapters, storage
│           api/  +  adapters/  +  config/        │
├─────────────────────────────────────────────────┤
│                    Domain                       │  ← Entities, schemas, types, constants
│      entities  +  schemas  +  types  +  enums   │
└─────────────────────────────────────────────────┘
```

---

## Estructura de Carpetas

```
src/
├── app/                          # Next.js App Router (solo routing y layouts)
│   ├── (auth)/                   # Grupo de rutas públicas (login, callback)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── auth/
│   │       └── callback/
│   │           └── page.tsx
│   ├── (dashboard)/              # Grupo de rutas protegidas
│   │   ├── layout.tsx            # Layout con sidebar, auth guard
│   │   ├── accounts/
│   │   │   ├── page.tsx          # Lista de cuentas
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Detalle de cuenta
│   │   ├── categories/
│   │   │   └── page.tsx
│   │   ├── transactions/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── layout.tsx                # Root layout (providers, fonts, metadata)
│   └── not-found.tsx
│
├── core/                         # Capas internas (dominio + aplicación)
│   ├── domain/                   # Capa de dominio — SIN dependencias externas
│   │   ├── entities/             # Tipos que representan entidades del negocio
│   │   │   ├── account.ts        # Account, AccountType, Currency
│   │   │   ├── category.ts
│   │   │   ├── transaction.ts
│   │   │   ├── user.ts
│   │   │   └── user-settings.ts
│   │   ├── schemas/              # Schemas Zod para validación de formularios
│   │   │   ├── account.schema.ts
│   │   │   ├── category.schema.ts
│   │   │   └── transaction.schema.ts
│   │   └── enums/                # Constantes as const (no TS enums)
│   │       ├── account.enums.ts
│   │       ├── category.enums.ts
│   │       ├── transaction.enums.ts
│   │       └── common.enums.ts
│   │
│   └── application/              # Capa de aplicación — orquesta dominio + infra
│       ├── hooks/                # TanStack Query hooks (data fetching)
│       │   ├── use-accounts.ts
│       │   ├── use-categories.ts
│       │   ├── use-transactions.ts
│       │   └── use-user-settings.ts
│       ├── stores/               # Zustand stores (client state)
│       │   ├── auth.store.ts
│       │   └── ui.store.ts
│       └── use-cases/            # Lógica de negocio compleja (si aplica)
│           └── settle-transaction.ts
│
├── infrastructure/               # Capa de infraestructura — implementaciones concretas
│   ├── api/                      # Clientes HTTP
│   │   ├── http-client.ts        # Wrapper de fetch con interceptors, refresh, etc.
│   │   ├── accounts.api.ts       # Funciones para /accounts endpoints
│   │   ├── categories.api.ts
│   │   ├── transactions.api.ts
│   │   ├── auth.api.ts
│   │   └── user-settings.api.ts
│   ├── adapters/                 # Transformaciones API ↔ Domain
│   │   ├── account.adapter.ts
│   │   └── transaction.adapter.ts
│   └── config/                   # Configuración de librerías externas
│       ├── query-client.ts       # TanStack Query config
│       └── env.ts                # Variables de entorno tipadas
│
├── presentation/                 # Capa de presentación — componentes de UI
│   ├── components/               # Componentes reutilizables
│   │   ├── ui/                   # Primitivos de UI (Button, Input, Modal, Card, etc.)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Card.tsx
│   │   │   └── index.ts
│   │   ├── forms/                # Componentes de formulario compuestos
│   │   │   ├── AccountForm.tsx
│   │   │   ├── CategoryForm.tsx
│   │   │   └── TransactionForm.tsx
│   │   ├── feedback/             # Toast, Loading, ErrorBoundary, EmptyState
│   │   │   ├── Toast.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   └── layout/               # Shell, Sidebar, Header, NavItem
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── MobileNav.tsx
│   ├── features/                 # Componentes específicos de cada feature/módulo
│   │   ├── accounts/
│   │   │   ├── AccountCard.tsx
│   │   │   ├── AccountList.tsx
│   │   │   └── AccountDetail.tsx
│   │   ├── categories/
│   │   │   └── CategoryList.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionList.tsx
│   │   │   └── TransactionFilters.tsx
│   │   └── settings/
│   │       └── SettingsForm.tsx
│   ├── hooks/                    # Hooks de UI (no de datos)
│   │   ├── use-media-query.ts
│   │   ├── use-debounce.ts
│   │   └── use-modal.ts
│   └── providers/                # Context providers
│       ├── QueryProvider.tsx
│       ├── ThemeProvider.tsx
│       └── AuthProvider.tsx
│
├── lib/                          # Utilidades puras y helpers
│   ├── cn.ts                     # clsx + twMerge helper
│   ├── format.ts                 # Formateo de montos, fechas
│   └── constants.ts              # Constantes de UI (breakpoints, limits, etc.)
│
└── i18n/                         # Internacionalización
    ├── config.ts
    └── messages/
        ├── es.json
        ├── en.json
        └── pt.json
```

---

## Reglas de Dependencia

```
app/ → puede importar de: presentation/, core/, infrastructure/, lib/, i18n/
presentation/ → puede importar de: core/, infrastructure/ (solo via hooks), lib/
core/application/ → puede importar de: core/domain/, infrastructure/
core/domain/ → NO importa de ninguna otra capa (es puro TypeScript)
infrastructure/ → puede importar de: core/domain/
lib/ → NO importa de ninguna capa (utilidades puras)
```

### Regla de oro
> **Un componente de UI nunca llama a `fetch` ni conoce URLs de API.** Toda comunicación pasa por `infrastructure/api/` y se consume vía hooks de `core/application/hooks/`.

---

## Flujo de Datos Típico

### Lectura (Server Component)
```
page.tsx (Server Component)
  → import { getAccounts } from '@/infrastructure/api/accounts.api'
  → pasa data como props a componentes de presentación
```

### Lectura (Client Component)
```
AccountList.tsx ("use client")
  → useAccounts() (TanStack Query hook en core/application/hooks/)
    → accountsApi.getAll() (infrastructure/api/)
      → httpClient.get('/accounts') (infrastructure/api/http-client.ts)
        → Backend API
```

### Escritura (Formulario)
```
AccountForm.tsx ("use client")
  → useForm() con schema Zod (core/domain/schemas/)
  → onSubmit → useMutation() (TanStack Query)
    → accountsApi.create(data) (infrastructure/api/)
      → httpClient.post('/accounts', data)
  → onSuccess → invalidateQueries(['accounts'])
```

---

## Convenciones por Capa

### `app/` — Routing Layer
- Solo contiene `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Las pages son **thin**: obtienen datos y delegan renderizado a componentes de `presentation/`.
- Usar Route Groups `(nombre)` para agrupar rutas sin afectar la URL.
- Auth guard se implementa en el layout del grupo protegido.

### `core/domain/` — Domain Layer
- **Cero imports** de React, Next.js o librerías externas (excepto Zod para schemas).
- Entities son `interface` de TypeScript. Representan lo que el backend devuelve.
- Schemas Zod validan input del usuario (formularios), no responses del API.
- Enums son objetos `as const` con tipos derivados.

### `core/application/` — Application Layer
- TanStack Query hooks encapsulan query keys, stale times y mutaciones.
- Zustand stores manejan estado puramente de cliente (auth tokens, UI state como sidebar open/close).
- Use cases contienen lógica de negocio que involucra múltiples entidades o pasos.

### `infrastructure/` — Infrastructure Layer
- `http-client.ts` es el único punto que conoce `fetch`, `baseURL` y manejo de tokens.
- Cada archivo `.api.ts` expone funciones para un recurso (`getAll`, `getById`, `create`, `update`, `delete`).
- Adapters transforman DTOs del backend a entities del dominio si hay diferencias.

### `presentation/` — Presentation Layer
- `components/ui/` son primitivos genéricos (no conocen el dominio).
- `components/forms/` conectan UI primitivos con React Hook Form.
- `features/` contiene componentes que sí conocen el dominio (muestran cuentas, transacciones, etc.).
- Providers configuran contextos de librerías (Query, Theme, Auth).

---

## App Router: Server vs Client Components

### Server Components (por defecto)
- Pages y layouts que solo renderizan datos.
- Componentes que no necesitan estado, efectos ni event handlers.
- Pueden hacer `await` directamente a funciones de `infrastructure/api/`.

### Client Components (`"use client"`)
- Formularios interactivos.
- Componentes con `useState`, `useEffect`, `onClick`, etc.
- Componentes que usan hooks de TanStack Query o Zustand.
- Sidebar/nav con toggle.

### Regla práctica
> Empieza como Server Component. Solo agrega `"use client"` cuando necesites interactividad. Mueve la interactividad al componente hijo más pequeño posible.
