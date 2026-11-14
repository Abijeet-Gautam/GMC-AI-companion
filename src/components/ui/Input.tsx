import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from './cn';
import './Input.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('input', className)} {...props} />
  ),
);

Input.displayName = 'Input';