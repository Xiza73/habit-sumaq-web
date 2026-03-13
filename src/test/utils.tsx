import { type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import messages from '@/i18n/messages/es.json';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function TestProviders({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
