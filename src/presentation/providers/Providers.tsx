'use client';

import { Toaster } from 'sonner';

import { PostHogProvider } from './PostHogProvider';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <PostHogProvider>
      <QueryProvider>
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'font-sans',
            }}
            richColors
            closeButton
          />
        </ThemeProvider>
      </QueryProvider>
    </PostHogProvider>
  );
}
