'use client';

import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import Link from 'next/link';
import { Maximize, Minimize } from 'lucide-react';
import { MotionConfig, motion } from 'motion/react';
import TreeStage from '../TreeStage';
import type { SceneController } from '../TreeScene';
import RecentLeaves from '../RecentLeaves';
import ConnectionStatus from './ConnectionStatus';
import type { ConnectionState } from './ConnectionStatus';
import LeafArrivalToast from './LeafArrivalToast';
import FeaturedLeaf from './FeaturedLeaf';
import TreeControls from './TreeControls';
import { themeFor } from '@/lib/themes';
import { growthFromTheme } from '@/lib/growth';
import type { PublicLeaf, TreeTheme } from '@/lib/types';

const POLL_MS = 4000;

/**
 * The /tree display screen, adapted from GMC's DisplayScreen. One poll of
 * /api/leaves drives everything: the arrival queue, the featured leaf, the
 * count caption and the recent-wishes feed. The 3D scene is driven through
 * its SceneController (breeze / zoom / reset / rotate).
 */
export default function TreeDisplayClient({
  initialCount,
  initialLeaves,
  theme,
  qrSlot,
}: {
  initialCount: number;
  initialLeaves: PublicLeaf[];
  theme: TreeTheme | null;
  /** Server-rendered QR panel (resolves the absolute join URL). */
  qrSlot: ReactNode;
}) {
  const sceneRef = useRef<SceneController | null>(null);
  const [rotating, setRotating] = useState(true);
  const [connection, setConnection] = useState<ConnectionState>(
    initialLeaves.length ? 'live' : 'connecting',
  );
  const [leaves, setLeaves] = useState<PublicLeaf[]>(initialLeaves);
  const [count, setCount] = useState(initialCount);
  const [arrivalIds, setArrivalIds] = useState<string[]>([]);
  const [pending, setPending] = useState(0);
  const [full, setFull] = useState(false);

  const initialized = useRef(false);
  const seen = useRef(new Set<string>());
  const queue = useRef<PublicLeaf[]>([]);
  const flights = useRef(new Map<string, number>());

  const themeDef = themeFor(theme?.canopy ?? 'ember');
  const growth = growthFromTheme(theme, count).ratio;

  // ---- fullscreen -------------------------------------------------------
  useEffect(() => {
    const changed = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* Some embedded browsers do not support fullscreen. */
    }
  }

  // ---- poll -------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/leaves?tree=global', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { count: number; leaves: PublicLeaf[] };
        if (!alive) return;
        setCount((prev) => (prev === data.count ? prev : (data.count ?? prev)));
        setLeaves((prev) => {
          const next = data.leaves ?? [];
          if (prev.length === next.length && prev.every((l, i) => l.id === next[i]?.id)) {
            return prev;
          }
          return next;
        });
        setConnection((prev) => (prev === 'live' ? prev : 'live'));
      } catch {
        if (!alive) return;
        setConnection((prev) => (prev === 'live' || prev === 'reconnecting' ? 'reconnecting' : 'offline'));
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // ---- arrival sync (GMC pattern: seen-set → queue → batch release) -----
  useEffect(() => {
    const available = new Set(leaves.map((leaf) => leaf.id));

    if (!initialized.current) {
      initialized.current = true;
      seen.current = new Set(leaves.map((leaf) => leaf.id));
      queue.current = [];
      flights.current.clear();
      setArrivalIds([]);
      return;
    }

    // Leaves removed by moderation forget their seen IDs so a later
    // restoration registers as an arrival again.
    for (const id of seen.current) {
      if (!available.has(id)) seen.current.delete(id);
    }

    const incoming = leaves.filter((leaf) => !seen.current.has(leaf.id)).reverse();
    incoming.forEach((leaf) => seen.current.add(leaf.id));
    queue.current = [
      ...queue.current.filter((leaf) => available.has(leaf.id)),
      ...incoming,
    ].slice(-120);
    setPending(queue.current.length);

    for (const id of flights.current.keys()) {
      if (!available.has(id)) flights.current.delete(id);
    }
    setArrivalIds((previous) => previous.filter((id) => available.has(id)));
  }, [leaves]);

  // ---- batch release every 350ms, flights expire after ~2.4s ------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (queue.current.length === 0 && flights.current.size === 0) {
        return;
      }
      const now = Date.now();
      for (const [id, expires] of flights.current) {
        if (expires <= now || !seen.current.has(id)) flights.current.delete(id);
      }
      const size = Math.min(8, Math.max(1, Math.ceil(queue.current.length / 4)));
      const batch = queue.current.splice(0, size).filter((leaf) => seen.current.has(leaf.id));
      if (batch.length) {
        setPending(queue.current.length);
        const ids = new Set(batch.map((leaf) => leaf.id));
        setLeaves((previous) => [
          ...batch.reverse(),
          ...previous.filter((leaf) => !ids.has(leaf.id)),
        ].slice(0, 120));
        batch.forEach((leaf, index) => flights.current.set(leaf.id, now + 2400 + index * 80));
      }
      const ids = [...flights.current.keys()];
      setArrivalIds((previous) =>
        previous.length === ids.length && previous.every((id, i) => id === ids[i])
          ? previous
          : ids,
      );
    }, 350);
    return () => clearInterval(interval);
  }, []);

  // ---- controls ---------------------------------------------------------
  function toggleRotate() {
    const next = !rotating;
    setRotating(next);
    sceneRef.current?.setAutoRotate(next);
  }

  const featured = leaves[0] ?? null;

  return (
    <MotionConfig reducedMotion="user">
      <main className="ds-shell container">
        <div className="ds-grid">
          {/* ---------- Stage column ---------- */}
          <section className="ds-stage-col" aria-label="The living tree">
            <div className="ds-stage tree-stage tree-stage-wide">
              <TreeStage leafCount={count} growth={growth} sceneRef={sceneRef} theme={theme} autoRotate={rotating} />

              <div className="ds-topbar">
                <span className="ds-badge">
                  <i style={{ background: themeDef.color }} aria-hidden="true" />
                  {themeDef.label}
                </span>
                <div className="ds-topbar-actions">
                  <ConnectionStatus state={connection} />
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="ds-icon-btn"
                    aria-label={full ? 'Exit fullscreen' : 'Enter fullscreen'}
                    onClick={toggleFullscreen}
                  >
                    {full ? <Minimize size={18} /> : <Maximize size={18} />}
                  </motion.button>
                </div>
              </div>

              <LeafArrivalToast ids={arrivalIds} leaves={leaves} />

              <div className="tree-caption">
                <span className="pulse-dot" />
                {count} {count === 1 ? 'wish' : 'wishes'} glowing
                {pending > 0 ? ` · ${pending} finding a branch…` : ' · live'}
              </div>
            </div>

            <TreeControls sceneRef={sceneRef} rotating={rotating} onToggleRotate={toggleRotate} />
            <FeaturedLeaf leaf={featured} />
          </section>

          {/* ---------- Aside ---------- */}
          <aside className="ds-aside">
            <motion.section
              className="ds-qr card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <h2 className="font-display">Grow your leaf.</h2>
              <p>Scan. Share a hope. Watch it grow.</p>
              {qrSlot}
              <Link href="/phone?tree=global" className="btn btn-primary">
                Hang a leaf
              </Link>
            </motion.section>

            <section className="ds-feed" aria-label="Fresh on the branches">
              <h3 className="ds-feed-title font-display">Fresh on the branches</h3>
              <RecentLeaves compact leaves={leaves} count={count} />
            </section>

            <p className="ds-footnote">Anonymous voices. Shared possibilities.</p>
          </aside>
        </div>
      </main>
    </MotionConfig>
  );
}
