'use client';

import { usePathname } from 'next/navigation';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { queryClient } from '@/infrastructure/config/query-client';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // The floating habit window is ~340px wide and its own webview, so the
  // devtools launcher lands on top of the card itself rather than in a corner
  // of a full page. The main window keeps them.
  const isPip = usePathname()?.startsWith('/pip') ?? false;

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {!isPip && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
