import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';
import './Toast.css';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
  children?: ReactNode;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ className, type = 'info', duration = 5000, children, ...props }, ref) => (
    <div 
      ref={ref}
      className={cn('toast', `toast--${type}`, className)}
      {...props}
    >
      <div className="toast-content">
        <span className="toast-icon">{type === 'success' ? '✓' : type === 'info' ? 'ℹ' : type === 'warning' ? '⚠' : '✗'}</span>
        <span className="toast-message">{children}</span>
      </div>
    </div>
  ),
);

Toast.displayName = 'Toast';