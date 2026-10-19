import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-blue-500/25 bg-blue-500/10 text-blue-400',
        secondary:
          'border-slate-700/60 bg-slate-800/80 text-slate-300',
        destructive:
          'border-rose-500/25 bg-rose-500/10 text-rose-400',
        success:
          'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
        outline: 'text-slate-300 border-slate-700/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
