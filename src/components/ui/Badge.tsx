import { forwardRef, HTMLAttributes } from 'react';
import { cn } from './cn';
import './Badge.css';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => (
    <span ref={ref} className={cn('badge', `badge--${variant}`, className)} {...props} />
  ),
);

Badge.displayName = 'Badge';