# Convenciones de Código

---

## Naming

### Archivos y Carpetas

| Tipo                 | Convención                       | Ejemplo                |
| -------------------- | -------------------------------- | ---------------------- |
| Componentes React    | PascalCase                       | `AccountCard.tsx`      |
| Hooks                | camelCase con prefijo `use`      | `use-accounts.ts`      |
| Archivos de utilidad | kebab-case                       | `http-client.ts`       |
| Schemas Zod          | kebab-case con sufijo `.schema`  | `account.schema.ts`    |
| API clients          | kebab-case con sufijo `.api`     | `accounts.api.ts`      |
| Adapters             | kebab-case con sufijo `.adapter` | `account.adapter.ts`   |
| Stores Zustand       | kebab-case con sufijo `.store`   | `auth.store.ts`        |
| Enums/constantes     | kebab-case con sufijo `.enums`   | `account.enums.ts`     |
| Tests                | mismo nombre + `.test`           | `AccountCard.test.tsx` |
| i18n messages        | kebab-case por idioma            | `es.json`, `en.json`   |

### Variables y Funciones

| Tipo              | Convención                                  | Ejemplo                              |
| ----------------- | ------------------------------------------- | ------------------------------------ |
| Variables         | camelCase                                   | `accountBalance`                     |
| Funciones         | camelCase                                   | `formatCurrency()`                   |
| Componentes React | PascalCase                                  | `function AccountCard()`             |
| Hooks             | camelCase con `use`                         | `useAccounts()`                      |
| Constantes        | UPPER_SNAKE_CASE                            | `MAX_ACCOUNT_NAME_LENGTH`            |
| Enums (as const)  | PascalCase objeto, UPPER_SNAKE para valores | `AccountType.CHECKING`               |
| Tipos/Interfaces  | PascalCase                                  | `interface Account {}`               |
| Generics          | letra mayúscula descriptiva                 | `<TData>`, `<TError>`                |
| Props interfaces  | PascalCase con sufijo `Props`               | `interface AccountCardProps {}`      |
| Event handlers    | `on` + Verbo + Sustantivo                   | `onCreateAccount`, `onDeleteItem`    |
| Boolean variables | prefijo `is`/`has`/`can`/`should`           | `isLoading`, `hasError`, `canDelete` |

### API & Query Keys

```typescript
// Query keys: array con namespace, luego identificadores
const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  list: (filters: AccountFilters) => [...accountKeys.lists(), filters] as const,
  details: () => [...accountKeys.all, 'detail'] as const,
  detail: (id: string) => [...accountKeys.details(), id] as const,
};
```

---

## Estructura de Componentes

### Orden interno de un componente

```tsx
"use client"; // 1. Directiva (si aplica)

// 2. Imports (en orden: React, externas, @/ internas, relativas, estilos)
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAccounts } from '@/core/application/hooks/use-accounts';
import { accountSchema } from '@/core/domain/schemas/account.schema';
import type { Account } from '@/core/domain/entities/account';
import { Button } from '@/presentation/components/ui/Button';

// 3. Tipos locales (si son solo para este componente)
interface AccountFormProps {
  account?: Account;
  onSuccess: () => void;
}

// 4. Componente (función nombrada, export default al final)
function AccountForm({ account, onSuccess }: AccountFormProps) {
  // 4a. Hooks (React hooks primero, luego custom hooks)
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading } = useAccounts();

  // 4b. Variables derivadas / memoización
  const sortedAccounts = useMemo(() => /* ... */, [data]);

  // 4c. Handlers
  function handleSubmit(values: FormValues) {
    // ...
  }

  // 4d. Early returns (loading, error, empty)
  if (isLoading) return <LoadingSpinner />;
  if (!data) return <EmptyState />;

  // 4e. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

export default AccountForm;
```

### Exports

- **Componentes de feature/page:** `export default` (requerido por Next.js para pages).
- **Componentes de UI reutilizables:** `export` nombrado, re-exportar desde `index.ts`.
- **Hooks, utilidades, tipos:** `export` nombrado siempre.
- **No usar barrel files** (`index.ts`) excepto en `components/ui/` para agrupar primitivos.

---

## Patrones de Código

### Conditional Rendering

```tsx
// Bien — operador ternario para simple
{
  isLoading ? <Skeleton /> : <AccountList accounts={data} />;
}

// Bien — && para mostrar/ocultar (asegurarse de que el lado izquierdo sea boolean)
{
  hasAccounts && <AccountList accounts={data} />;
}

// Mal — && con número (puede renderizar "0")
{
  accounts.length && <AccountList />;
} // ❌
{
  accounts.length > 0 && <AccountList />;
} // ✅
```

### Error Handling en API calls

```typescript
// En los hooks de TanStack Query, no en los componentes
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
    // Los errores se manejan en el componente con el estado error del mutation
  });
}
```

### Formularios

```tsx
// Siempre: React Hook Form + Zod schema
const form = useForm<CreateAccountInput>({
  resolver: zodResolver(createAccountSchema),
  defaultValues: {
    name: '',
    type: 'checking',
    currency: 'PEN',
    initialBalance: 0,
  },
});
```

---

## Tailwind CSS

### Orden de clases

Seguir un orden lógico (no es enforced por herramientas, pero mantener consistencia):

1. Layout (`flex`, `grid`, `block`, `hidden`)
2. Sizing (`w-`, `h-`, `min-`, `max-`)
3. Spacing (`p-`, `m-`, `gap-`)
4. Typography (`text-`, `font-`, `leading-`)
5. Visual (`bg-`, `border-`, `rounded-`, `shadow-`)
6. Interactive (`hover:`, `focus:`, `active:`)
7. Transitions (`transition-`, `duration-`)

### Responsive

```tsx
// Mobile-first: el estilo base es mobile, luego se escala
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
```

### Variantes con CVA

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-border bg-background hover:bg-muted',
        ghost: 'hover:bg-muted',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);
```

---

## Imports

### Path Aliases

```typescript
// Siempre usar alias @/ en lugar de rutas relativas profundas
import { Button } from '@/presentation/components/ui/Button'; // ✅
import { Button } from '../../../../components/ui/Button'; // ❌

// Rutas relativas solo dentro del mismo módulo/carpeta
import { formatAmount } from './helpers'; // ✅ (mismo directorio)
```

---

## Zod Schemas

```typescript
// Nombre: create/update + Entity + Schema
export const createAccountSchema = z.object({
  name: z.string().min(1, 'required').max(100, 'max_length'),
  type: z.enum(['checking', 'savings', 'cash', 'credit_card', 'investment']),
  currency: z.enum(['PEN', 'USD', 'EUR']),
  initialBalance: z.number().min(0).default(0),
  color: z.string().max(7).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

// Tipo derivado del schema
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
```

---

## Cosas a Evitar

- **No usar `any`** — usar `unknown` + type narrowing.
- **No usar `enum` de TypeScript** — usar `as const` objects.
- **No usar `useEffect` para fetch** — usar TanStack Query.
- **No usar CSS modules** ni styled-components.
- **No crear archivos `types.ts` globales** — colocar tipos junto a su dominio.
- **No usar `index.tsx`** como nombre de componente — usar el nombre real.
- **No hacer fetch desde componentes** — pasar por `infrastructure/api/`.
- **No poner lógica de negocio en componentes** — mover a hooks o use-cases.
- **No usar `!important`** en estilos.
- **No hardcodear textos** — siempre vía i18n.
