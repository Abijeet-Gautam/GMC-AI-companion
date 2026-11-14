import type { KeepsakeLeaf, LeafShape, AspirationCategory } from '@/lib/types';

const SHAPES = new Set<LeafShape>(['oval', 'maple', 'heart', 'willow']);
const SHAPE_LABELS: Record<LeafShape, string> = {
  oval: 'Oval',
  maple: 'Maple',
  heart: 'Heart',
  willow: 'Willow',
};
const FALLBACK_COLOR = '#d9b45a';
const HEX = /^#[0-9a-f]{6}$/i;

export default function LeafMeta({ leaf }: { leaf: KeepsakeLeaf }) {
  const shape = SHAPES.has(leaf.leafShape as LeafShape)
    ? (leaf.leafShape as LeafShape)
    : 'oval';
  const color = leaf.color && HEX.test(leaf.color) ? leaf.color : FALLBACK_COLOR;
  const date = (() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(leaf.createdAt));
    } catch {
      return '';
    }
  })();
  const category = leaf.aspirationCategory ?? { primary: 'none', secondary: null, reason: '' };
  const categoryLabel =
    category.primary !== 'none'
      ? `${category.primary}${category.secondary && category.secondary.length > 0 ? `: ${category.secondary.join(', ')}` : ''}`
      : 'Uncategorized';

  return (
    <div className="keepsake-meta">
      {/* Full text, never truncated — the canvas clamps to five lines. */}
      <blockquote className="keepsake-wish">“{leaf.body}”</blockquote>
      <dl className="keepsake-facts">
        <div className="keepsake-fact">
          <dt>Position</dt>
          <dd>Leaf #{leaf.position}</dd>
        </div>
        <div className="keepsake-fact">
          <dt>Shape</dt>
          <dd>{SHAPE_LABELS[shape]}</dd>
        </div>
        <div className="keepsake-fact">
          <dt>Color</dt>
          <dd>
            <span className="keepsake-color-dot" style={{ background: color }} aria-hidden="true" />
            {color}
          </dd>
        </div>
        {date && (
          <div className="keepsake-fact">
            <dt>Hung</dt>
            <dd>{date}</dd>
          </div>
        )}
        <div className="keepsake-fact">
          <dt>Category</dt>
          <dd>{categoryLabel}</dd>
        </div>
      </dl>
    </div>
  );
}
