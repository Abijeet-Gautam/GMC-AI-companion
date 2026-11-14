'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MotionConfig, motion } from 'motion/react';
import LeafCanvas, { type LeafCanvasHandle } from './LeafCanvas';
import LeafMeta from './LeafMeta';
import AIMessage from './AIMessage';
import ChamberFact from './ChamberFact';
import DownloadButtons from './DownloadButtons';
import ShareButton from './ShareButton';
import ShortCode from './ShortCode';
import type { KeepsakeLeaf, SourceCitation } from '@/lib/types';

export default function LeafKeepsakeClient({ leaf }: { leaf: KeepsakeLeaf }) {
  const canvasRef = useRef<LeafCanvasHandle>(null);
  // Lifted from AIMessage so ChamberFact can quote the reflection's first source.
  const [sources, setSources] = useState<SourceCitation[]>([]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="keepsake-stage">
        <div className="keepsake-back">
          <Link href="/" className="keepsake-back-link">
            <ArrowLeft size={15} aria-hidden="true" />
            The Wishing Tree
          </Link>
        </div>

        <div className="keepsake-layout">
          <motion.figure
            className="keepsake-visual"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <LeafCanvas ref={canvasRef} leaf={leaf} />
            <figcaption className="keepsake-caption">
              Leaf #{leaf.position} · {leaf.treeName}
            </figcaption>
          </motion.figure>

          <motion.section
            className="keepsake-panel"
            aria-label="Leaf keepsake"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="keepsake-eyebrow">Keepsake · {leaf.treeName}</p>
            <h1 className="keepsake-title font-display">Your wish is on the tree.</h1>

            <LeafMeta leaf={leaf} />
            <AIMessage leafId={leaf.id} onSources={setSources} />
            <ChamberFact sources={sources} />

            <div className="keepsake-actions">
              <DownloadButtons
                onPng={() => canvasRef.current?.downloadPng()}
                onSvg={() => canvasRef.current?.downloadSvg()}
              />
              <ShareButton leaf={leaf} />
            </div>

            <ShortCode id={leaf.id} />
          </motion.section>
        </div>
      </main>
    </MotionConfig>
  );
}
