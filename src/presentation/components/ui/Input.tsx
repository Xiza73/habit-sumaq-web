import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  compact?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, compact, type, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex w-full rounded-md border border-border bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        compact ? 'h-9 px-2 py-1' : 'h-10 px-3 py-2',
        type === 'date' &&
          'inline appearance-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-datetime-edit]:flex-1',
        className,
      )}
      {...props}
    />
  );
});
