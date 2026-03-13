import { forwardRef, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  compact?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, compact, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'flex w-full rounded-md border border-border bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        compact ? 'h-9 px-2 py-1' : 'h-10 px-3 py-2',
        className,
      )}
      {...props}
    />
  );
});
