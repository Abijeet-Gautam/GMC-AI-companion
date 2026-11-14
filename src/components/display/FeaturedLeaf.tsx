'use client';

import { AnimatePresence, motion } from 'motion/react';
import LeafGlyph from '../LeafGlyph';
import type { PublicLeaf, LeafShape } from '@/lib/types';
import { timeAgo } from '@/lib/time';

const VALID_SHAPES = new Set(['oval', 'maple', 'heart', 'willow']);

/**
 * The wish currently being showcased: newest arrival, else the newest leaf
 * on the tree. Crossfades when a new arrival takes the spotlight.
 */
export default function FeaturedLeaf({ leaf }: { leaf: PublicLeaf | null }) {
  const shape = (VALID_SHAPES.has(leaf?.leafShape ?? '')
    ? leaf?.leafShape
    : 'oval') as LeafShape;

  return (
    <section className="ds-featured" aria-label="A wish from the tree" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.blockquote
          key={leaf?.id ?? 'first-hope'}
          className="ds-featured-card"
          initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(3px)', transition: { duration: 0.18 } }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="ds-featured-label">
            <LeafGlyph
              shape={shape}
              color={leaf?.color ?? '#d9b45a'}
              size={20}
            />
            A wish taking root
          </span>
          <p className="ds-featured-body">
            {leaf ? `“${leaf.body}”` : 'Every future begins with a hope.'}
          </p>
          {leaf && (
            <p className="ds-featured-meta">
              <span>#{leaf.position}</span>
              <i style={{ background: leaf.color ?? '#d9b45a' }} aria-hidden="true" />
              {timeAgo(leaf.createdAt)}
            </p>
          )}
        </motion.blockquote>
      </AnimatePresence>
    </section>
  );
}
