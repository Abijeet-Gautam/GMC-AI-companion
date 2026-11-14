'use client';

import { useCallback, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import type { KeepsakeLeaf } from '@/lib/types';

/**
 * Web Share API when the browser offers it; clipboard copy with a quiet
 * notice as the fallback (same pattern as the phone success state).
 */
export default function ShareButton({ leaf }: { leaf: KeepsakeLeaf }) {
  const [notice, setNotice] = useState('');

  const share = useCallback(async () => {
    const url = `${window.location.origin}/leaf/${leaf.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'The Wishing Tree',
          text: `“${leaf.body}” — a wish hanging on The Wishing Tree.`,
          url,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice('The leaf link is copied — share it anywhere.');
    } catch {
      setNotice(url);
    }
  }, [leaf]);

  return (
    <div className="keepsake-share">
      <button type="button" className="btn btn-primary" onClick={share}>
        <Share2 size={15} aria-hidden="true" />
        Share this leaf
      </button>
      {notice && (
        <p role="status" className="keepsake-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
