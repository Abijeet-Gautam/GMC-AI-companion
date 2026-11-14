import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from './cn';
import { Check } from 'lucide-react';
import './Checkbox.css';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <label className={cn('checkbox-label', className)}>
      <input type="checkbox" ref={ref} className="checkbox" {...props} />
      <span className="checkbox-indicator">
        <Check className="checkbox-check" size={12} />
      </span>
      <span className="checkbox-label-text">{props.children}</span>
    </label>
  ),
);

Checkbox.displayName = 'Checkbox';