# State Management y Data Fetching

---

## Principio: Separar Estado de Servidor vs Estado de Cliente

| Tipo             | Herramienta    | Ejemplos                                                          |
| ---------------- | -------------- | ----------------------------------------------------------------- |
| **Server state** | TanStack Query | Cuentas, categorías, transacciones, user settings                 |
| **Client state** | Zustand        | Access token, sidebar open/close, modal state, filtros temporales |

**Regla:** Si el dato viene del backend o necesita sincronizarse con él → TanStack Query. Si es estado puramente local de la UI → Zustand o `useState`.

---

## TanStack Query — Server State

### Configuración Global

```typescript
// infrastructure/config/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos antes de refetch
      gcTime: 10 * 60 * 1000, // 10 minutos en cache
      retry: 1, // 1 reintento en error
      refetchOnWindowFocus: true, // Refetch al volver a la pestaña
    },
    mutations: {
      retry: 0, // No reintentar mutaciones
    },
  },
});
```

### Query Keys Factory

Cada recurso define un factory de keys para consistencia:

```typescript
// core/application/hooks/use-accounts.ts
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  list: (filters?: AccountFilters) => [...accountKeys.lists(), filters] as const,
  details: () => [...accountKeys.all, 'detail'] as const,
  detail: (id: string) => [...accountKeys.details(), id] as const,
};
```

### Patrón de Query Hook

```typescript
export function useAccounts(filters?: AccountFilters) {
  return useQuery({
    queryKey: accountKeys.list(filters),
    queryFn: () => accountsApi.getAll(filters),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => accountsApi.getById(id),
    enabled: !!id,
  });
}
```

### Patrón de Mutation Hook

```typescript
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountInput }) =>
      accountsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(id) });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}
```

### Invalidación cruzada

Cuando una transacción modifica el balance de una cuenta:

```typescript
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      // Las transacciones afectan balances → invalidar cuentas también
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}
```

---

## Zustand — Client State

### Auth Store

```typescript
// core/application/stores/auth.store.ts
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setAccessToken: (accessToken) => set({ accessToken }),
}));
```

### UI Store

```typescript
// core/application/stores/ui.store.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
```

### Reglas de Zustand

1. **No guardar server state en Zustand.** Si viene del API, va en TanStack Query.
2. **Stores pequeños y enfocados.** Un store por dominio (`auth`, `ui`), no un mega-store.
3. **No usar Zustand para formularios.** Eso es React Hook Form.
4. **Selectors** para evitar re-renders innecesarios:

```typescript
// Bien — solo re-renderiza cuando cambia sidebarOpen
const sidebarOpen = useUIStore((s) => s.sidebarOpen);

// Mal — re-renderiza ante cualquier cambio en el store
const store = useUIStore();
```

---

## HTTP Client

### Estructura

```typescript
// infrastructure/api/http-client.ts

class HttpClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = useAuthStore.getState().accessToken;

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      credentials: 'include', // Para cookies HttpOnly
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    // Si 401 → intentar refresh
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request<T>(endpoint, options); // Reintentar
      }
      // Refresh falló → redirigir a login
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    const json = await response.json();

    if (!json.success) {
      throw new ApiError(json.message, json.error?.code, json.error?.details);
    }

    return json.data;
  }

  // Métodos de conveniencia
  get<T>(endpoint: string) { return this.request<T>(endpoint); }
  post<T>(endpoint: string, body: unknown) { ... }
  patch<T>(endpoint: string, body: unknown) { ... }
  delete<T>(endpoint: string) { ... }
}

export const httpClient = new HttpClient(process.env.NEXT_PUBLIC_API_URL!);
```

### API Error Class

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

---

## Patrones

### Loading, Error y Empty States

```tsx
function AccountList() {
  const { data: accounts, isLoading, error } = useAccounts();

  if (isLoading) return <AccountListSkeleton />;
  if (error) return <ErrorState message={error.message} />;
  if (!accounts?.length) return <EmptyState title="No tienes cuentas" />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
```

### Optimistic Updates (Fase 6)

```typescript
export function useArchiveAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsApi.toggleArchive,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: accountKeys.lists() });
      const previous = queryClient.getQueryData(accountKeys.list());

      queryClient.setQueryData(accountKeys.list(), (old: Account[]) =>
        old.map((a) => (a.id === id ? { ...a, isArchived: !a.isArchived } : a)),
      );

      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(accountKeys.list(), context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}
```
