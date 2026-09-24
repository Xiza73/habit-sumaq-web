import { AuthProvider } from '@/presentation/providers/AuthProvider';
import { LocaleSync } from '@/presentation/providers/LocaleSync';

/**
 * Chrome-free shell for the floating habit windows.
 *
 * Deliberately NOT the dashboard layout: no sidebar, no header, no celebration
 * modal. The window is the size of one card, and a confetti modal firing in an
 * always-on-top 340px window would cover the thing it is celebrating.
 *
 * `AuthProvider` stays, because this is a separate webview with an empty store
 * — it re-establishes the session from the cookie the main window wrote.
 */
export default function PipLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocaleSync />
      {children}
    </AuthProvider>
  );
}
