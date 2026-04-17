# Estrategia de Testing

---

## Stack

| Herramienta                     | Propósito                           |
| ------------------------------- | ----------------------------------- |
| **Vitest**                      | Test runner, assertions, mocking    |
| **React Testing Library (RTL)** | Testing de componentes React        |
| **MSW (Mock Service Worker)**   | Mock de API en tests de integración |
| **Playwright**                  | Tests end-to-end                    |

---

## Pirámide de Tests

```
         ╱╲
        ╱ E2E ╲          Playwright — flujos críticos completos
       ╱────────╲
      ╱Integration╲      RTL + MSW — componentes con data fetching
     ╱──────────────╲
    ╱     Unit        ╲   Vitest — lógica pura, utils, schemas, stores
   ╱────────────────────╲
```

### Distribución objetivo

- **Unit:** ~60% — Rápidos, alta cobertura de lógica.
- **Integration:** ~30% — Componentes interactuando con hooks y API.
- **E2E:** ~10% — Flujos de usuario críticos.

---

## Tests Unitarios

### Qué testear

- **Schemas Zod:** Validación de inputs válidos e inválidos.
- **Utilidades (`lib/`):** Formateo de montos, fechas, helpers.
- **Stores Zustand:** State transitions y computed values.
- **Adapters:** Transformación correcta de DTOs a entities.
- **Enums/constantes:** Verificar que los valores coincidan con la API.

### Qué NO testear a nivel unitario

- Componentes de UI puros sin lógica (un `Button` que solo aplica estilos).
- Implementación interna de librerías (React Hook Form, TanStack Query).

### Ejemplo: Schema test

```typescript
import { describe, it, expect } from 'vitest';
import { createAccountSchema } from '@/core/domain/schemas/account.schema';

describe('createAccountSchema', () => {
  it('accepts valid input', () => {
    const input = {
      name: 'Mi cuenta',
      type: 'checking',
      currency: 'PEN',
      initialBalance: 100,
    };
    expect(createAccountSchema.safeParse(input).success).toBe(true);
  });

  it('rejects empty name', () => {
    const input = { name: '', type: 'checking', currency: 'PEN' };
    const result = createAccountSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects negative initial balance', () => {
    const input = { name: 'Test', type: 'checking', currency: 'PEN', initialBalance: -10 };
    const result = createAccountSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
```

### Ejemplo: Utility test

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/lib/format';

describe('formatCurrency', () => {
  it('formats PEN correctly', () => {
    expect(formatCurrency(1500.5, 'PEN')).toBe('S/ 1,500.50');
  });

  it('formats USD correctly', () => {
    expect(formatCurrency(1500.5, 'USD')).toBe('$ 1,500.50');
  });
});
```

---

## Tests de Integración

### Qué testear

- **Formularios:** Submit exitoso, validación inline, manejo de errores de API.
- **Listas con data fetching:** Loading state, render de datos, empty state, error state.
- **Flujos de interacción:** Crear cuenta → aparece en la lista, eliminar → desaparece.

### Setup con MSW

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('*/accounts', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: '1', name: 'Cuenta principal', type: 'checking', currency: 'PEN', balance: 1500 },
      ],
    });
  }),

  http.post('*/accounts', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        success: true,
        data: { id: '2', ...body, balance: body.initialBalance ?? 0 },
      },
      { status: 201 },
    );
  }),
];
```

### Ejemplo: Component integration test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountList } from '@/presentation/features/accounts/AccountList';
import { TestProviders } from '@/test/utils';

describe('AccountList', () => {
  it('renders accounts from API', async () => {
    render(<AccountList />, { wrapper: TestProviders });

    await waitFor(() => {
      expect(screen.getByText('Cuenta principal')).toBeInTheDocument();
    });
  });

  it('shows empty state when no accounts', async () => {
    // Override handler para retornar lista vacía
    server.use(
      http.get('*/accounts', () => HttpResponse.json({ success: true, data: [] }))
    );

    render(<AccountList />, { wrapper: TestProviders });

    await waitFor(() => {
      expect(screen.getByText(/no tienes cuentas/i)).toBeInTheDocument();
    });
  });
});
```

---

## Tests E2E (Playwright)

### Flujos cubiertos hoy (módulo Habits)

Un spec por flujo bajo `e2e/habits/`. Nombres únicos por test vía `testInfo.testId`
para aislamiento cuando `workers > 1`.

1. **Crear:** `/habits` → "Nuevo hábito" → form → submit → aparece en lista.
2. **Check-in + undo:** seed vía API → click `Registrar` → `1/3` → click `Deshacer registro` → `0/3`.
3. **Editar:** seed → menú de acciones → Editar → cambiar nombre → Guardar → assert visible.
4. **Archivar:** seed → archivar → oculto del daily view → toggle "Show archived" → visible → desarchivar → toggle back → visible.
5. **Eliminar:** seed → menú → Eliminar → confirm dialog → assert removido del DOM.
6. **Detalle + reload:** click card → URL `/habits/{id}` → reload → session sobrevive.
7. **Heatmap:** seed + 3 logs históricos → `/habits/{id}` → assert `Historial` + SVG grid.

### Estructura

```
e2e/
├── fixtures/
│   └── authenticated-page.ts    # fixture `auth` (test-login → cookies + Bearer API client)
├── helpers/
│   └── habits-api.ts            # createHabit / deleteHabit / logHabit
└── habits/
    ├── create-habit.spec.ts
    ├── checkin.spec.ts
    ├── edit-habit.spec.ts
    ├── archive-habit.spec.ts
    ├── delete-habit.spec.ts
    ├── detail-navigation.spec.ts
    └── heatmap-renders.spec.ts
```

No usamos Page Objects por ahora: con un solo módulo en e2e, los fixtures +
helpers son más idiomáticos. Migrar a PO cuando se sumen accounts/transactions.

### Autenticación en e2e

Para evitar depender del flujo real de Google OAuth, el backend expone un
endpoint oculto `POST /auth/test-login` (triple guard, devuelve 404 ante
cualquier fallo). El fixture `auth` lo consume así:

1. `POST /auth/test-login { email }` con header `x-test-auth-secret`.
2. Captura el `accessToken` del body y el `refresh_token` del `Set-Cookie`.
3. Inyecta `refresh_token` (HttpOnly) + `NEXT_LOCALE=es` en el browser
   context → el silent-refresh del frontend resuelve el access token al
   primer request protegido.
4. Devuelve `{ page, api, email }` scoped al test. `api` ya tiene Bearer
   configurado para seed/cleanup.

El fixture aborta con un error claro si `TEST_AUTH_SECRET` no está seteada.

### Correr e2e localmente

Se necesitan backend + frontend corriendo en paralelo.

```bash
# terminal 1 — backend (habit-sumaq-backend)
TEST_AUTH_ENABLED=true TEST_AUTH_SECRET=<32-o-mas-chars> pnpm start:dev

# terminal 2 — frontend (habit-sumaq-web)
pnpm test:e2e:install          # solo la primera vez: descarga chromium
TEST_AUTH_SECRET=<mismo-secret> pnpm test:e2e
```

El mismo secret DEBE estar en ambos procesos (si no, el endpoint devuelve
404 por el timing-safe compare). El boot del backend falla con Zod error
si `TEST_AUTH_ENABLED=true` pero el secret es `< 32` chars o está vacío.

Comandos útiles:

- `pnpm test:e2e` — headless, reporter `list` local, `github` + `html` en CI.
- `pnpm test:e2e:ui` — modo UI interactivo (debug).
- `pnpm exec playwright show-report` — abre el HTML report del último run.

---

## Convenciones de Testing

### Naming

- Archivos de test junto al archivo que testean: `AccountCard.test.tsx` junto a `AccountCard.tsx`.
- Describir con `describe('ComponentName')` o `describe('functionName')`.
- Los `it()` empiezan con un verbo en presente: `it('renders...', 'rejects...', 'shows...')`.

### AAA Pattern

```typescript
it('shows error when name is empty', async () => {
  // Arrange
  render(<AccountForm onSuccess={vi.fn()} />, { wrapper: TestProviders });

  // Act
  await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

  // Assert
  expect(screen.getByText(/required/i)).toBeInTheDocument();
});
```

### Qué priorizar

1. **User behavior, no implementación.** Testear lo que el usuario ve y hace, no detalles internos.
2. **Queries accesibles.** Preferir `getByRole`, `getByLabelText`, `getByText` sobre `getByTestId`.
3. **No testear estilos.** No verificar clases CSS ni colores inline.
4. **No testear librerías.** No testear que TanStack Query cachea, ni que Zod valida regexes.

### Test Utils

```typescript
// test/utils.tsx — Wrapper con todos los providers
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/presentation/providers/ThemeProvider';

export function TestProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

---

## Comandos

```bash
pnpm test              # Ejecutar todos los tests unitarios + integración
pnpm test --watch      # Watch mode durante desarrollo
pnpm test:coverage     # Reporte de cobertura
pnpm test:e2e          # Tests Playwright (requiere app corriendo)
pnpm test:e2e --ui     # Playwright con interfaz visual
```

---

## Cobertura Mínima

| Capa                          | Objetivo              |
| ----------------------------- | --------------------- |
| `core/domain/schemas/`        | 90%+                  |
| `lib/`                        | 90%+                  |
| `core/application/stores/`    | 80%+                  |
| `infrastructure/adapters/`    | 80%+                  |
| `presentation/features/`      | 70%+                  |
| `presentation/components/ui/` | Solo si tienen lógica |
