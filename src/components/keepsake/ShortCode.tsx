'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Short leaf code (first 8 hex chars) with a copy-to-clipboard button. */
export default function ShortCode({ id }: { id: string }) {
  const code = id.slice(0, 8).toUpperCase();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — the code is
      // visible on screen, so there is nothing more to do.
      return;
    }
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="keepsake-code-row">
      <span className="keepsake-code-label">Leaf code</span>
      <code className="keepsake-code">{code}</code>
      <button
        type="button"
        className="btn btn-ghost keepsake-code-copy"
        onClick={copy}
        aria-label={copied ? 'Leaf code copied' : 'Copy leaf code'}
      >
        {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
