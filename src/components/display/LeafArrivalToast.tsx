'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { PublicLeaf } from '@/lib/types';

/**
 * Arrival chip: as new wishes land they queue up and get released in small
 * batches. While any batch is mid-flight, a chip names the count.
 */
export default function LeafArrivalToast({ ids, leaves }: { ids: string[]; leaves: PublicLeaf[] }) {
  return (
    <div className="ds-arrivals" aria-hidden="true">
      <AnimatePresence>
        {ids.length > 0 && (
          <motion.div
            key="arrival-wave"
            className="ds-arrival-chip"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <span className="ds-arrival-dots">
              {ids.slice(0, 6).map((id) => {
                const leaf = leaves.find((l) => l.id === id);
                return <i key={id} style={{ background: leaf?.color ?? '#d9b45a' }} />;
              })}
            </span>
            <span>
              {ids.length === 1
                ? 'A new wish is taking root'
                : `${ids.length} wishes are taking root together`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
