import { ArrowUpRight, BookOpen } from 'lucide-react';
import type { SourceCitation } from '@/lib/types';

/**
 * The "fact behind the reflection" — adapted from GMC's chamber
 * recommendation, which does not exist here. The reflection pipeline
 * anchors each message to real texts, so the first citation is the
 * single most concrete, checkable fact attached to this leaf.
 */
export default function ChamberFact({ sources }: { sources: SourceCitation[] }) {
  const fact = sources[0];

  return (
    <section className="keepsake-fact" aria-label="The fact behind the reflection">
      <p className="keepsake-section-eyebrow">
        <BookOpen size={13} aria-hidden="true" />
        The fact behind the reflection
      </p>
      {fact ? (
        <div className="keepsake-fact-card">
          <p className="keepsake-fact-title">{fact.title}</p>
          <p className="keepsake-fact-by">{fact.source}</p>
          {fact.url && (
            <a className="keepsake-fact-link" href={fact.url} target="_blank" rel="noreferrer">
              Read the source
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          )}
        </div>
      ) : (
        <p className="keepsake-fact-pending">
          Every reflection is anchored to a real text — its source will surface here once the
          reflection arrives.
        </p>
      )}
    </section>
  );
}
