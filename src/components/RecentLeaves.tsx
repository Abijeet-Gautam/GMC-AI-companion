'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LeafGlyph from './LeafGlyph';
import type { LeafShape, PublicLeaf } from '@/lib/types';
import { timeAgo } from '@/lib/time';

export type { PublicLeaf };

const VALID_SHAPES = new Set(['oval', 'maple', 'heart', 'willow']);

export default function RecentLeaves({
  pollMs = 4000,
  compact = false,
  leaves: controlledLeaves,
  count: controlledCount,
}: {
  pollMs?: number;
  compact?: boolean;
  /** When provided, the feed is controlled (renders without polling). */
  leaves?: PublicLeaf[] | null;
  count?: number;
}) {
  const controlled = controlledLeaves != null;
  const [leaves, setLeaves] = useState<PublicLeaf[] | null>(controlled ? controlledLeaves : null);
  const [count, setCount] = useState(controlledCount ?? 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (controlled) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/leaves?tree=global', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { count: number; leaves: PublicLeaf[] };
        if (!alive) return;
        setLeaves(data.leaves ?? []);
        setCount(data.count ?? 0);
        setError(false);
      } catch {
        if (alive) setError(true);
      }
    };
    load();
    const id = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs, controlled]);

  const data = controlled ? (controlledLeaves ?? []) : leaves;
  const feedCount = controlled ? (controlledCount ?? 0) : count;
  const visible = useMemo(() => (data ?? []).slice(0, compact ? 4 : 12), [data, compact]);

  if (error && !data) {
    return (
      <div className="leaf-feed" role="status">
        <div className="leaf-card" style={{ animation: 'none' }}>
          <span className="leaf-body text-muted">
            The tree is quiet right now. Your wish will be safe — check back in a moment.
          </span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="leaf-feed" aria-busy="true" aria-label="Loading wishes">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="leaf-card" style={{ animation: 'none', opacity: 0.55 }}>
            <div className="leaf-glyph" style={{ background: '#2a201c', boxShadow: 'none' }} />
            <div className="leaf-body">
              <div style={{ height: 10, width: '82%', background: '#241a16', borderRadius: 6 }} />
              <div style={{ height: 8, width: '38%', background: '#1f1613', borderRadius: 6, marginTop: 8 }} />
            </div>
            <div className="leaf-rank" style={{ visibility: 'hidden' }}>#0</div>
          </div>
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="leaf-feed">
        <div className="leaf-card" style={{ animation: 'none' }}>
          <LeafGlyph shape="oval" color="#d9b45a" size={22} />
          <span className="leaf-body text-muted">
            No wishes on the tree yet. Be the first to hang a leaf.
          </span>
          <a href="/phone" className="leaf-rank" style={{ textDecoration: 'none' }}>Plant a wish</a>
        </div>
      </div>
    );
  }

  return (
    <div className="leaf-feed" aria-live="polite">
      {visible.map((leaf, i) => (
        <article
          key={leaf.id}
          className="leaf-card"
          style={{ animationDelay: `${Math.min(i, 8) * 70}ms`, ['--leaf' as string]: leaf.color ?? '#d9b45a' }}
        >
          <span className="leaf-glyph" aria-hidden="true">
            <LeafGlyph
              shape={(VALID_SHAPES.has(leaf.leafShape ?? '') ? leaf.leafShape : 'oval') as LeafShape}
              color={leaf.color ?? '#d9b45a'}
              size={18}
            />
          </span>
          <div>
            <p className="leaf-body">{leaf.body}</p>
            <p className="leaf-meta">
              {timeAgo(leaf.createdAt)}{' '}{leaf.messageStatus !== 'ready' && (
                <span className="leaf-status">({leaf.messageStatus})</span>
              )}
            </p>
          </div>
          <span className="leaf-rank" title="Position on the tree">
            <Link href={`/leaf/${leaf.id}`}>#{leaf.position}</Link>
          </span>
        </article>
      ))}
      {!compact && feedCount > visible.length && (
        <p className="leaf-meta" style={{ textAlign: 'center', padding: '0.35rem 0' }}>
          …and {feedCount - visible.length} more glowing on the tree
        </p>
      )}
    </div>
  );
}
