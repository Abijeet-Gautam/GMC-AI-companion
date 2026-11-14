/**
 * Theme catalog — the canopy palettes a tree can wear.
 * Maps to TreeTheme.canopy values; used by the home page theme grid
 * and (later) the studio theme picker.
 */
import type { SkyTheme } from './types';

export interface ThemeDef {
  id: string;
  label: string;
  short: string;
  /** Accent color used for dots, icons, and highlights. */
  color: string;
  sky: SkyTheme;
  canopy: 'ember' | 'jade' | 'violet' | 'rose';
  leafPalette: string[];
  /** Example aspiration offered as a starting point on the wish form. */
  prompt: string;
}

export const themes: ThemeDef[] = [
  {
    id: 'ember',
    label: 'Ember Dusk',
    short: 'Ember',
    color: '#e2725b',
    sky: 'dusk',
    canopy: 'ember',
    leafPalette: ['#ffd166', '#ef476f', '#f78c6b', '#ffe08a', '#f4a261'],
    prompt: 'I hope the evenings feel warmer than the day — slow meals, softer light, someone laughing nearby.',
  },
  {
    id: 'jade',
    label: 'Jade Dawn',
    short: 'Jade',
    color: '#4ade80',
    sky: 'dawn',
    canopy: 'jade',
    leafPalette: ['#a7f3d0', '#34d399', '#6ee7b7', '#d1fae5', '#10b981'],
    prompt: 'I hope the city keeps room for rain, moss, and every small green thing that refuses to leave.',
  },
  {
    id: 'violet',
    label: 'Violet Night',
    short: 'Violet',
    color: '#a78bfa',
    sky: 'night',
    canopy: 'violet',
    leafPalette: ['#c4b5fd', '#8b5cf6', '#a78bfa', '#ddd6fe', '#7c3aed'],
    prompt: 'I hope we learn to rest without earning it first — and to dream in public, out loud.',
  },
  {
    id: 'rose',
    label: 'Rose Forest',
    short: 'Rose',
    color: '#fb7185',
    sky: 'forest',
    canopy: 'rose',
    leafPalette: ['#fecdd3', '#f472b6', '#fb7185', '#fce7f3', '#e11d48'],
    prompt: 'I hope kindness stays in style — held doors, long visits, notes left where strangers find them.',
  },
];

export function themeFor(id: string): ThemeDef {
  return themes.find((t) => t.id === id) ?? themes[0]!;
}