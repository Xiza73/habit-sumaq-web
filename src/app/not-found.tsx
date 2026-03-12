import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-3xl font-bold text-muted-foreground">
        ?
      </div>
      <h1 className="text-2xl font-bold">404</h1>
      <p className="max-w-xs text-muted-foreground">La página que buscas no existe o fue movida.</p>
      <Link
        href="/accounts"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
