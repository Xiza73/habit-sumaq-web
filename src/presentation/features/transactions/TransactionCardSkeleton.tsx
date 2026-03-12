export function TransactionCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="size-10 rounded-lg bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-20 rounded bg-muted" />
      </div>
      <div className="space-y-2 text-right">
        <div className="ml-auto h-4 w-20 rounded bg-muted" />
        <div className="ml-auto h-3 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}
