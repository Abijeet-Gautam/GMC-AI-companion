'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { SourceCitation } from '@/lib/types';

interface MessagePayload {
  status: string;
  message: string | null;
  sources: SourceCitation[];
  commentary: boolean;
  position: number;
}

/**
 * Polls /api/leaves/[id]/message until the background pipeline lands the
 * reflection (same pattern as the phone success state), then renders the
 * message with its citations. Sources are lifted to the parent so
 * ChamberFact can quote the first one.
 */
export default function AIMessage({
  leafId,
  onSources,
}: {
  leafId: string;
  onSources?: (sources: SourceCitation[]) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [state, setState] = useState<'waiting' | 'ready' | 'quiet'>('waiting');

  useEffect(() => {
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch(`/api/leaves/${leafId}/message`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as MessagePayload;
          // Pipeline gave up on this leaf (or it was never eligible) — stop quietly.
          if (data.status === 'failed' || data.status === 'skipped' || data.status === 'unavailable') {
            clearInterval(id);
            setState('quiet');
            return;
          }
          if (data.status === 'ready' && data.message) {
            const lift = Array.isArray(data.sources) ? data.sources : [];
            setMessage(data.message);
            setSources(lift);
            onSources?.(lift);
            setState('ready');
            clearInterval(id);
            return;
          }
        }
      } catch {
        /* keep polling */
      }
      if (tries >= 12) {
        clearInterval(id);
        setState('quiet');
      }
    }, 1600);
    return () => clearInterval(id);
  }, [leafId, onSources]);

  if (state === 'quiet') return null;

  return (
    <section className="keepsake-reflection" aria-label="Reflection">
      <p className="keepsake-section-eyebrow">
        <Sparkles size={13} aria-hidden="true" />
        The tree&rsquo;s reflection
      </p>
      {state === 'waiting' ? (
        <p className="keepsake-reflection-pending" role="status">
          <span className="spinner spinner-light" aria-hidden="true" />
          The tree is composing its reflection…
        </p>
      ) : (
        <>
          <blockquote className="keepsake-message">“{message}”</blockquote>
          {sources.length > 0 && (
            <ul className="keepsake-sources">
              {sources.map((s, i) => (
                <li key={`${s.title}-${i}`}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.title}
                    </a>
                  ) : (
                    s.title
                  )}
                  <span className="keepsake-source-by"> · {s.source}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
