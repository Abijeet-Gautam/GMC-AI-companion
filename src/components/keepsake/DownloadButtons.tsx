'use client';

import { FileCode2, FileImage } from 'lucide-react';

/**
 * Client-side image export of the keepsake card canvas.
 * Rendering lives in LeafCanvas (toBlob / serialized SVG); these buttons
 * just trigger it.
 */
export default function DownloadButtons({
  onPng,
  onSvg,
}: {
  onPng: () => void;
  onSvg: () => void;
}) {
  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={onPng}>
        <FileImage size={15} aria-hidden="true" />
        PNG
      </button>
      <button type="button" className="btn btn-secondary" onClick={onSvg}>
        <FileCode2 size={15} aria-hidden="true" />
        SVG
      </button>
    </>
  );
}
