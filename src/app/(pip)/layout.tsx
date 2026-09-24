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
      {/*
        Next's dev overlay renders a floating button that, in a 340px window,
        sits right on top of the card. There is no per-route switch for it —
        but this window is its OWN document, so hiding it here leaves the main
        window's overlay untouched. Dev-only markup; it is not emitted in a
        production build.
      */}
      <style>{'nextjs-portal{display:none!important}'}</style>
      <LocaleSync />
      {children}
    </AuthProvider>
  );
}
