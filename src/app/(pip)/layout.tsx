import { AuthProvider } from '@/presentation/providers/AuthProvider';
import { LocaleSync } from '@/presentation/providers/LocaleSync';

/**
 * Chrome-free shell for every floating window.
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
      {/*
        The window is created with `transparent: true`, but the document still
        paints `bg-background` over all of it, so dimming the card blended it
        against THAT instead of the desktop — it went darker and showed
        nothing through. Clearing it here makes the window actually
        see-through, and is what lets the card have corners again: there is no
        opaque slab left behind them.

        Unlayered, so it beats the `@layer base` rule in globals.css on cascade
        order rather than with `!important`.
      */}
      <style>{'html,body{background:transparent}'}</style>
      <style>{'nextjs-portal{display:none!important}'}</style>
      <LocaleSync />
      {children}
    </AuthProvider>
  );
}
