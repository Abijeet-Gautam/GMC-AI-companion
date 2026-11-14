import { isStrokeOnly, LEAF_SHAPE_PATHS } from '@/lib/leafPaths';
import type { LeafShape } from '@/lib/types';

export default function LeafGlyph({
  shape = 'oval',
  color = '#d9b45a',
  size = 24,
  className,
}: {
  shape?: LeafShape;
  color?: string;
  size?: number;
  className?: string;
}) {
  const strokeOnly = isStrokeOnly(shape);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill={strokeOnly ? 'none' : color}
      stroke={strokeOnly ? color : 'none'}
      strokeWidth={strokeOnly ? 1.6 : 0}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={LEAF_SHAPE_PATHS[shape]} />
    </svg>
  );
}
