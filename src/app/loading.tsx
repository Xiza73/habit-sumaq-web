export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
          S
        </div>
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    </div>
  );
}
