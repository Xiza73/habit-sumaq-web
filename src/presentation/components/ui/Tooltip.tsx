'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface TooltipProps {
  /** Already-translated text shown in the floating tooltip. */
  label: string;
  /** The trigger element. Merged onto via `asChild`, so pass a single node. */
  children: React.ReactNode;
  /** Which edge of the trigger the tooltip prefers. Defaults to `'top'`. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment along that edge. Defaults to Radix's `'center'`. */
  align?: 'start' | 'center' | 'end';
}

/**
 * Portal-based hover/focus tooltip built on Radix.
 *
 * The content renders through a {@link TooltipPrimitive.Portal}, so it escapes
 * clipping ancestors — notably the `overflow-x-auto` table wrapper — instead of
 * being cut off like a native `title` would be. Expects a single
 * {@link TooltipProvider} mounted once at the app root; it does not provide one
 * itself so all triggers share the same open/close delays.
 */
export function Tooltip({ label, children, side = 'top', align = 'center' }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className="z-50 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0"
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-popover" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
