import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with conditional logic.
 * Handles conflicting classes intelligently (e.g., 'text-red-500 text-blue-500' → 'text-blue-500').
 * Usage: cn('text-sm font-bold', { 'text-red-500': error, 'hidden': !visible })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}