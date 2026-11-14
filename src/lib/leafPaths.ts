import type { LeafShape } from './types';

/**
 * Stylized leaf silhouettes in a 24x24 viewBox, shared by the DOM glyph
 * (LeafGlyph) and the keepsake canvas/SVG renderer (LeafCanvas), so the
 * leaf reads identically everywhere. Keep the two consumers on this module.
 */
export const LEAF_SHAPE_PATHS: Record<LeafShape, string> = {
  oval: 'M12 2C8 7 5 11 5 15a7 7 0 0 0 14 0c0-4-3-8-7-13z',
  maple: 'M12 2l2.1 3.6 3.9-1.1-1 4 3.8 1.2-2.6 3.2 2.9 2.7-4.3.4 1.3 4-4.1-2.2L12 22l-2-4.2-4.1 2.2 1.3-4-4.3-.4 2.9-2.7-2.6-3.2 3.8-1.2-1-4 3.9 1.1L12 2z',
  heart: 'M12 21s-7.5-4.9-9.8-9.6C.8 8.4 3.6 5 7.2 5c2.1 0 3.7 1.1 4.8 2.8C13.1 6.1 14.7 5 16.8 5c3.6 0 6.4 3.4 5 6.4C19.5 16.1 12 21 12 21z',
  willow: 'M12 1c-2.4 4.4-3.4 8.4-2.1 12.4.9 2.5 2.3 4.6 4.1 6.6M12 1c2 4.8 2.9 9.4 2 14.1M9.5 8C8 11 7.7 14 8.6 16.8M14.6 8.6c1.4 3.2 1.7 6.4.7 9.7',
};

/** 'willow' is drawn as an open stroke; every other shape is filled. */
export function isStrokeOnly(shape: LeafShape): boolean {
  return shape === 'willow';
}
