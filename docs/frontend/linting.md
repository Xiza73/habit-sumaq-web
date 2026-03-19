# Linting y Formateo

Reglas de calidad de código, configuración de ESLint, Prettier y TypeScript strict.

---

## Herramientas

| Herramienta              | Versión | Propósito                                |
| ------------------------ | ------- | ---------------------------------------- |
| ESLint                   | 9.x     | Análisis estático y reglas de código     |
| Prettier                 | 3.x     | Formateo automático                      |
| typescript-eslint        | 8.x     | Reglas específicas de TypeScript         |
| eslint-config-next       | 16.x    | Reglas de Next.js y Core Web Vitals      |
| simple-import-sort       | 12.x   | Ordenamiento automático de imports       |
| eslint-plugin-prettier   | 5.x     | Integración Prettier ↔ ESLint           |

---

## Comandos

```bash
pnpm lint            # Ejecutar ESLint
pnpm lint:fix        # Corregir problemas auto-fixables
pnpm format          # Formatear con Prettier
pnpm format:check    # Verificar formato sin modificar
```

---

## Archivos de Configuración

| Archivo                | Descripción                                    |
| ---------------------- | ---------------------------------------------- |
| `eslint.config.mjs`   | Configuración ESLint (flat config, ESLint 9)   |
| `.prettierrc`          | Reglas de formateo Prettier                    |
| `.prettierignore`      | Archivos excluidos de Prettier                 |
| `tsconfig.json`        | Configuración TypeScript (strict mode)         |
| `tsconfig.eslint.json` | Configuración TypeScript para ESLint type-check |

---

## Configs Base (ESLint)

La configuración extiende las siguientes bases, en este orden:

1. **`@eslint/js` recommended** — reglas fundamentales de JavaScript.
2. **`eslint-config-next/core-web-vitals`** — mejores prácticas de Next.js y métricas web.
3. **`eslint-config-next/typescript`** — reglas Next.js + TypeScript.
4. **`typescript-eslint` recommendedTypeChecked** — reglas de TypeScript con type-checking.
5. **`eslint-plugin-prettier/recommended`** — ejecuta Prettier como regla de ESLint.

---

## Reglas de TypeScript

| Regla                                          | Nivel   | Descripción                                                  |
| ---------------------------------------------- | ------- | ------------------------------------------------------------ |
| `@typescript-eslint/no-explicit-any`           | `warn`  | Evitar `any`; preferir `unknown` + narrowing.                |
| `@typescript-eslint/no-floating-promises`      | `error` | Las promesas deben ser `await`-eadas o manejadas.            |
| `@typescript-eslint/no-unsafe-argument`        | `warn`  | No pasar valores `any` como argumento.                       |
| `@typescript-eslint/no-unsafe-assignment`      | `warn`  | No asignar valores `any` a variables tipadas.                |
| `@typescript-eslint/no-unused-vars`            | `error` | Variables no usadas son error. Prefijo `_` para ignorar.     |
| `@typescript-eslint/consistent-type-imports`   | `error` | Usar `import { type Foo }` (inline type imports).            |
| `@typescript-eslint/no-inferrable-types`       | `error` | No anotar tipos que TypeScript puede inferir.                |

### Patrón de variables ignoradas

```ts
// Correcto: prefijo _ para indicar que se ignora intencionalmente
const [_unused, setCount] = useState(0);
function handler(_event: MouseEvent) { /* ... */ }

// Incorrecto: variable no usada sin prefijo
const [unused, setCount] = useState(0); // error
```

### Type imports

```ts
// Correcto: inline type imports
import { type User, type Account } from '@/core/domain/models';
import { useAuth } from '@/presentation/hooks/useAuth';

// Incorrecto
import type { User } from '@/core/domain/models'; // no usar `import type`
```

---

## Orden de Imports

El plugin `simple-import-sort` organiza los imports automáticamente en este orden:

```ts
// 1. React y Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Paquetes externos
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. @/core/ (dominio)
import { userSchema } from '@/core/domain/schemas/user.schema';

// 4. @/infrastructure/
import { apiClient } from '@/infrastructure/api/client';

// 5. @/presentation/
import { Button } from '@/presentation/components/ui/Button';

// 6. @/lib/ y @/i18n/
import { cn } from '@/lib/utils';
import { useTranslations } from '@/i18n/hooks';

// 7. Otros @/ imports
import { ROUTES } from '@/config/routes';

// 8. Imports relativos (padres)
import { parentHelper } from '../helpers';

// 9. Imports relativos (directorio actual)
import { localUtil } from './utils';

// 10. Type imports (al final)
import { type AppConfig } from '@/core/domain/models';
```

> Los imports y exports se ordenan automáticamente con `pnpm lint:fix`.

---

## Reglas Core

| Regla                  | Nivel   | Descripción                                      |
| ---------------------- | ------- | ------------------------------------------------ |
| `no-console`           | `warn`  | Evitar `console.log` en producción.              |
| `no-duplicate-imports` | `error` | No importar del mismo módulo más de una vez.     |

---

## Excepciones para Tests

Los archivos `**/*.test.ts`, `**/*.test.tsx` y `**/*.spec.ts` tienen reglas relajadas:

| Regla                                        | Nivel | Motivo                                              |
| -------------------------------------------- | ----- | --------------------------------------------------- |
| `@typescript-eslint/unbound-method`          | `off` | Permitir pasar métodos como callbacks en mocks.     |
| `@typescript-eslint/no-unsafe-assignment`    | `off` | Permitir mocks y fixtures con tipos flexibles.      |

---

## Prettier — Reglas de Formateo

| Opción           | Valor      | Descripción                                    |
| ---------------- | ---------- | ---------------------------------------------- |
| `singleQuote`    | `true`     | Comillas simples para strings.                 |
| `trailingComma`  | `"all"`    | Coma trailing en estructuras multilinea.       |
| `printWidth`     | `100`      | Ancho máximo de línea.                         |
| `tabWidth`       | `2`        | Indentación de 2 espacios.                     |
| `semi`           | `true`     | Punto y coma obligatorio.                      |
| `arrowParens`    | `"always"` | Paréntesis siempre en arrow functions.         |
| `endOfLine`      | `"auto"`   | Detectar automáticamente (configurado en ESLint). |

### Archivos Ignorados por Prettier

```
.next
out
build
coverage
node_modules
pnpm-lock.yaml
```

---

## TypeScript Strict Mode

El `tsconfig.json` tiene `"strict": true`, lo que activa:

- `strictNullChecks` — `null` y `undefined` son tipos distintos.
- `strictFunctionTypes` — chequeo estricto de tipos en parámetros de funciones.
- `strictBindCallApply` — chequeo estricto en `bind`, `call`, `apply`.
- `strictPropertyInitialization` — propiedades de clase deben inicializarse.
- `noImplicitAny` — error si TypeScript no puede inferir y el tipo sería `any`.
- `noImplicitThis` — `this` debe tener tipo explícito si no es inferible.
- `alwaysStrict` — emitir `"use strict"` en cada archivo.

---

## Ignorados Globales (ESLint)

Los siguientes paths se excluyen del análisis:

```
.next/**
out/**
build/**
coverage/**
next-env.d.ts
```

---

## Checklist Rápido

Antes de hacer commit, verifica:

- [ ] `pnpm lint` pasa sin errores.
- [ ] `pnpm format:check` pasa sin diferencias.
- [ ] No hay `any` explícitos (o están justificados con `// eslint-disable-next-line`).
- [ ] Los imports están ordenados por capa.
- [ ] Los type imports usan `import { type ... }`.
- [ ] No hay `console.log` sin justificación.
- [ ] Las promesas están correctamente `await`-eadas o manejadas con `.catch()`.
