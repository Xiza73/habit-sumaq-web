# Estrategia de Testing

---

## Stack

| Herramienta | Propósito |
|---|---|
| **Vitest** | Test runner, assertions, mocking |
| **React Testing Library (RTL)** | Testing de componentes React |
| **MSW (Mock Service Worker)** | Mock de API en tests de integración |
| **Playwright** | Tests end-to-end |

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
    return HttpResponse.json({
      success: true,
      data: { id: '2', ...body, balance: body.initialBalance ?? 0 },
    }, { status: 201 });
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

### Flujos críticos a cubrir

1. **Auth flow:** Login con Google → callback → dashboard.
2. **Crear cuenta:** Abrir formulario → llenar campos → submit → aparece en lista.
3. **Editar cuenta:** Click editar → modificar nombre → guardar → refleja cambio.
4. **Archivar cuenta:** Archivar → desaparece de lista activa → aparece en archivadas.
5. **Eliminar cuenta:** Eliminar cuenta sin transacciones → confirmación → desaparece.
6. **Settings:** Cambiar tema → UI refleja cambio. Cambiar idioma → textos cambian.
7. **Crear transacción:** Seleccionar tipo → llenar campos → submit → balance se actualiza.

### Estructura

```
e2e/
├── fixtures/
│   └── auth.ts          # Login helper
├── pages/
│   ├── accounts.page.ts # Page Object para cuentas
│   └── settings.page.ts
└── tests/
    ├── auth.spec.ts
    ├── accounts.spec.ts
    ├── settings.spec.ts
    └── transactions.spec.ts
```

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

| Capa | Objetivo |
|---|---|
| `core/domain/schemas/` | 90%+ |
| `lib/` | 90%+ |
| `core/application/stores/` | 80%+ |
| `infrastructure/adapters/` | 80%+ |
| `presentation/features/` | 70%+ |
| `presentation/components/ui/` | Solo si tienen lógica |
