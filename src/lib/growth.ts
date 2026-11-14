import type { TreeTheme } from './types';

export type GrowthMode = NonNullable<TreeTheme['growthMode']>;

/** Wishes needed for a full canopy when the tree grows by contributions. */
export const DEFAULT_LEAVES_FOR_MATURITY = 48;

export interface GrowthState {
  growthMode: GrowthMode;
  leavesForMaturity: number;
  /** 0 = bare sapling … 1 = mature tree. */
  ratio: number;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Resolve a tree's growth settings from its stored theme and compute how far
 * along the growth journey it is. 'manual' (and any missing/invalid value)
 * renders the mature tree, exactly as before growth mode existed.
 */
export function growthFromTheme(theme: TreeTheme | null | undefined, count: number): GrowthState {
  const growthMode: GrowthMode = theme?.growthMode === 'contributions' ? 'contributions' : 'manual';
  const raw = theme?.leavesForMaturity;
  const leavesForMaturity =
    typeof raw === 'number' && Number.isFinite(raw) && raw > 0
      ? Math.floor(raw)
      : DEFAULT_LEAVES_FOR_MATURITY;
  const ratio =
    growthMode === 'contributions' ? clamp01((Number(count) || 0) / leavesForMaturity) : 1;
  return { growthMode, leavesForMaturity, ratio };
}
