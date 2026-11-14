import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';
import './Textarea.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn('textarea', className)} {...props} />
  ),
);

Textarea.displayName = 'Textarea';