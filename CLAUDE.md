# Habit Sumaq — Reglas del Proyecto

Aplicación de finanzas personales y hábitos construida con **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4** y **TypeScript**.

El backend ya está implementado como una API REST (NestJS). Este proyecto es exclusivamente el **frontend**.

---

## Stack Tecnológico

- **Framework:** Next.js 16 con App Router
- **UI:** React 19 + Tailwind CSS 4
- **Lenguaje:** TypeScript (strict mode)
- **Package Manager:** pnpm
- **Auth:** Google OAuth (tokens JWT)
- **State:** Zustand (client state) + TanStack Query (server state)
- **Forms:** React Hook Form + Zod
- **i18n:** next-intl (es, en, pt)
- **Icons:** Lucide React
- **Testing:** Vitest + React Testing Library + Playwright (e2e)

---

## Documentación Complementaria

Antes de implementar cualquier feature, consulta los documentos relevantes:

| Documento              | Ruta                                                           | Descripción                                        |
| ---------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| Arquitectura           | [architecture.md](docs/frontend/architecture.md)               | Clean Architecture adaptada a Next.js App Router   |
| Temas y Paletas        | [themes.md](docs/frontend/themes.md)                           | Paletas de color para modo claro y oscuro          |
| Convenciones           | [conventions.md](docs/frontend/conventions.md)                 | Naming, estructura de archivos, patrones de código |
| Plan de Implementación | [implementation-plan.md](docs/frontend/implementation-plan.md) | Fases y orden de desarrollo                        |
| Testing                | [testing.md](docs/frontend/testing.md)                         | Estrategia de testing por capa                     |
| State Management       | [state-management.md](docs/frontend/state-management.md)       | Manejo de estado y data fetching                   |
| i18n                   | [i18n.md](docs/frontend/i18n.md)                               | Estrategia de internacionalización                 |
| Reglas de Negocio      | [business-rules.md](docs/frontend/business-rules.md)           | Reglas que la UI debe respetar                     |
| API Reference          | [api-reference.md](docs/frontend/api-reference.md)             | Endpoints, DTOs y contratos                        |
| Enums                  | [enums.md](docs/frontend/enums.md)                             | Valores válidos para cada campo                    |
| Códigos de Error       | [error-codes.md](docs/frontend/error-codes.md)                 | Mapeo de códigos a mensajes de UI                  |

---

## Reglas Generales

### Idioma

- **Código** (variables, funciones, componentes, tipos): siempre en **inglés**.
- **Textos de UI** (labels, mensajes, placeholders): siempre via **i18n**, nunca hardcodeados.
- **Comentarios**: en inglés. Solo cuando el código no es autoexplicativo.
- **Documentación del proyecto**: en español.
- **Commits**: en inglés, formato Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.).

### TypeScript

- **Strict mode** obligatorio. No usar `any` — preferir `unknown` y narrowing.
- Usar `interface` para shapes de objetos. Usar `type` para uniones, intersecciones y utilidades.
- No usar `enum` de TypeScript — usar `as const` objects con tipo derivado.
- Los tipos/interfaces de dominio van en la capa `domain/`. Los tipos de UI son locales al componente.
- Exportar tipos junto a donde se usan; no crear archivos `types.ts` genéricos a nivel global.

### Componentes React

- **Funciones nombradas** (`function Component()`) — no arrow functions para componentes.
- **Un componente por archivo**. El archivo lleva el nombre del componente en PascalCase.
- Hooks personalizados en archivos separados con prefijo `use`.
- Preferir **Server Components** por defecto. Usar `"use client"` solo cuando se necesite interactividad.
- No usar `useEffect` para sincronizar datos del servidor — usar TanStack Query.
- Props destructuradas directamente en la firma de la función.

### Estilos

- **Tailwind CSS 4** como sistema principal. No CSS modules ni styled-components.
- Usar **CSS variables** de Tailwind para theming (modo claro/oscuro).
- Clases utilitarias en el JSX. Para componentes reutilizables con variantes, usar `cva` (class-variance-authority).
- Responsive design **mobile-first**.
- No usar `!important`. Si hay conflictos, revisar la especificidad.

### Imports y Módulos

- Usar el alias `@/` que apunta a la raíz del proyecto.
- Orden de imports (enforced por ESLint):
  1. React / Next.js
  2. Librerías externas
  3. `@/` imports internos (por capa: domain → application → infrastructure → presentation)
  4. Imports relativos (`./ ../`)
  5. Estilos

### API y Data Fetching

- Toda comunicación con el backend pasa por la capa `infrastructure/api/`.
- Los **Server Components** pueden hacer fetch directamente usando los servicios de infraestructura.
- Los **Client Components** usan TanStack Query hooks definidos en `application/hooks/`.
- Manejo centralizado de errores: interceptor que lee `error.code` y muestra mensajes localizados.
- Los tokens se manejan automáticamente vía un wrapper de fetch con refresh silencioso.

### Formularios

- Usar React Hook Form + Zod para todo formulario.
- Los schemas Zod de validación viven en `domain/schemas/`.
- Validar en frontend **antes** de enviar al backend. Mostrar errores inline por campo.
- Tras submit exitoso, invalidar queries relevantes de TanStack Query.

### Git & Branching

- Rama principal: `main`.
- Ramas de feature: `feat/<module>/<description>` (ej: `feat/accounts/create-form`).
- Ramas de fix: `fix/<module>/<description>`.
- Commits atómicos. Un commit = un cambio lógico.

### Seguridad

- Nunca almacenar tokens en localStorage. El access token vive en memoria (Zustand); el refresh token es HttpOnly cookie.
- Sanitizar inputs del usuario antes de renderizar.
- No exponer variables de entorno del servidor al cliente (solo `NEXT_PUBLIC_*`).

---

## Variables de Entorno

```env
NEXT_PUBLIC_API_URL=http://localhost:3000    # URL del backend
NEXT_PUBLIC_APP_URL=http://localhost:3001    # URL del frontend
```

---

## Comandos

```bash
pnpm dev          # Desarrollo
pnpm build        # Build de producción
pnpm start        # Servidor de producción
pnpm lint         # Linting
pnpm test         # Tests unitarios (Vitest)
pnpm test:e2e     # Tests e2e (Playwright)
```

---

## Alcance Actual

El MVP cubre el módulo de **Cuentas** (accounts). Módulos futuros: categorías, transacciones, daily planner, schedule.

Implementar siguiendo el orden definido en [implementation-plan.md](docs/frontend/implementation-plan.md).
