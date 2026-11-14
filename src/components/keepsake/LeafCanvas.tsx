'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { isStrokeOnly, LEAF_SHAPE_PATHS } from '@/lib/leafPaths';
import type { KeepsakeLeaf, LeafShape } from '@/lib/types';

export interface LeafCanvasHandle {
  /** Render the current card as a PNG and trigger a download. */
  downloadPng: () => void;
  /** Render the current card as an SVG and trigger a download. */
  downloadSvg: () => void;
}

const VIEW_W = 1080;
const VIEW_H = 1350;
const CX = VIEW_W / 2;
const LEAF_TOP = 236;
const LEAF_SCALE = 17.5;
const WISH_FONT_PX = 42;
const WISH_LINE_HEIGHT = 58;
const WISH_TOP = 800;
const WRAP_WIDTH = 880;
const MAX_LINES = 5;
const DISPLAY_STACK = `'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif`;
const SANS_STACK = `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

const CANOPY_HEX = /^#[0-9a-f]{6}$/i;

/** Deterministic PRNG — the star field must look identical on every render. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rand = mulberry32(7);
  return Array.from({ length: 26 }, () => ({
    x: rand() * VIEW_W,
    y: rand() * 540,
    r: rand() * 1.5 + 0.5,
    a: rand() * 0.5 + 0.3,
  }));
})();

const SHAPES = new Set(['oval', 'maple', 'heart', 'willow']);

function shapeOf(leaf: KeepsakeLeaf): LeafShape {
  const s = (leaf.leafShape ?? '').toLowerCase();
  return (SHAPES.has(s) ? s : 'oval') as LeafShape;
}

function colorOf(leaf: KeepsakeLeaf): string {
  return leaf.color && CANOPY_HEX.test(leaf.color) ? leaf.color : '#d9b45a';
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&apos;';
    }
  });
}

/** Greedy word wrap measured against the live canvas context. */
function wrapLines(ctx: CanvasRenderingContext2D, font: string, text: string): string[] {
  ctx.font = font;
  const measure = (s: string) => ctx.measureText(s).width;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measure(candidate) <= WRAP_WIDTH) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  if (lines.length <= MAX_LINES) return lines;
  const shown = lines.slice(0, MAX_LINES);
  let last = shown[MAX_LINES - 1]!;
  while (last.length > 1 && measure(`${last}…`) > WRAP_WIDTH) {
    last = last.slice(0, -1).trimEnd();
  }
  shown[MAX_LINES - 1] = `${last.trimEnd()}…`;
  return shown;
}

function shortCode(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(iso))
      .toUpperCase();
  } catch {
    return '';
  }
}

function metaLine(leaf: KeepsakeLeaf): string {
  const shape = shapeOf(leaf).toUpperCase();
  const date = formatDate(leaf.createdAt);
  return [`#${leaf.position}`, shape, date].filter(Boolean).join('   ·   ');
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function drawCard(ctx: CanvasRenderingContext2D, leaf: KeepsakeLeaf, lines: string[]) {
  const color = colorOf(leaf);
  const shape = shapeOf(leaf);

  // --- sky ---
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#181010');
  sky.addColorStop(0.38, '#22131f');
  sky.addColorStop(0.72, '#231516');
  sky.addColorStop(1, '#110a09');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // --- warm glow where the canopy would be ---
  const glow = ctx.createRadialGradient(CX, 460, 30, CX, 460, 540);
  glow.addColorStop(0, 'rgba(226, 158, 82, 0.26)');
  glow.addColorStop(0.55, 'rgba(206, 128, 66, 0.08)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // --- stars ---
  for (const star of STARS) {
    ctx.globalAlpha = star.a;
    ctx.fillStyle = '#f5efe6';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- branch silhouette the leaf hangs from ---
  ctx.strokeStyle = '#2c1d11';
  ctx.lineCap = 'round';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(CX - 430, 96);
  ctx.quadraticCurveTo(CX - 200, 168, CX - 14, LEAF_TOP - 4);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(CX - 210, 150);
  ctx.quadraticCurveTo(CX - 330, 168, CX - 385, 240);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX - 120, 185);
  ctx.quadraticCurveTo(CX - 185, 235, CX - 172, 300);
  ctx.stroke();
  // the stem the leaf dangles from
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(CX - 14, LEAF_TOP - 4);
  ctx.lineTo(CX, LEAF_TOP + 26);
  ctx.stroke();

  // --- the leaf, glowing ---
  const path = new Path2D(LEAF_SHAPE_PATHS[shape]);
  const leafCx = CX;
  const leafCy = LEAF_TOP + 26 + ((22 - 2) / 2) * LEAF_SCALE;
  const drawLeaf = (blur: number, alpha: number) => {
    ctx.save();
    ctx.translate(leafCx, leafCy);
    ctx.scale(LEAF_SCALE, LEAF_SCALE);
    ctx.translate(-12, -14);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur / LEAF_SCALE; // shadowBlur is affected by the transform scale
    if (isStrokeOnly(shape)) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.stroke(path);
    } else {
      ctx.fillStyle = color;
      ctx.fill(path);
    }
    ctx.restore();
  };
  drawLeaf(150, 0.85);
  drawLeaf(46, 1);

  // --- the wish ---
  ctx.font = `500 ${WISH_FONT_PX}px ${DISPLAY_STACK}`;
  ctx.fillStyle = '#f5efe6';
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    ctx.fillText(line, CX, WISH_TOP + i * WISH_LINE_HEIGHT);
  });

  // --- meta ---
  const metaY = WISH_TOP + lines.length * WISH_LINE_HEIGHT + 34;
  ctx.font = `600 19px ${SANS_STACK}`;
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#a89a8f';
  ctx.fillText(metaLine(leaf), CX, metaY);
  ctx.globalAlpha = 1;

  // --- divider ---
  ctx.strokeStyle = 'rgba(217, 180, 90, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX - 58, metaY + 34);
  ctx.lineTo(CX + 58, metaY + 34);
  ctx.stroke();

  // --- short code ---
  ctx.font = `600 17px ${SANS_STACK}`;
  ctx.fillStyle = '#d9b45a';
  ctx.fillText(`LEAF ${shortCode(leaf.id)}`, CX, metaY + 74);

  // --- tagline + brand ---
  ctx.font = `italic 400 22px ${DISPLAY_STACK}`;
  ctx.fillStyle = '#8d7f74';
  ctx.fillText('every leaf is a wish.', CX, VIEW_H - 78);
  ctx.font = `600 15px ${SANS_STACK}`;
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#d9b45a';
  ctx.fillText('T H E   W I S H I N G   T R E E', CX, 74);
  ctx.globalAlpha = 1;
}

function buildShareSvg(leaf: KeepsakeLeaf, lines: string[]): string {
  const color = colorOf(leaf);
  const shape = shapeOf(leaf);
  const strokeOnly = isStrokeOnly(shape);
  const leafCx = CX;
  const leafCy = LEAF_TOP + 26 + ((22 - 2) / 2) * LEAF_SCALE;
  const leafMarkup = `<g transform="translate(${leafCx}, ${leafCy}) scale(${LEAF_SCALE}) translate(-12, -14)" filter="url(#soft)"><path d="${LEAF_SHAPE_PATHS[shape]}" ${
    strokeOnly
      ? `fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`
      : `fill="${color}"`
  }/></g>`;
  const stars = STARS.map(
    (s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(1)}" fill="#f5efe6" fill-opacity="${s.a.toFixed(2)}"/>`,
  ).join('');
  const wishText = lines
    .map((line, i) => `<text x="${CX}" y="${WISH_TOP + i * WISH_LINE_HEIGHT}" text-anchor="middle" font-family="${DISPLAY_STACK}" font-weight="500" font-size="${WISH_FONT_PX}" fill="#f5efe6">${escapeXml(line)}</text>`)
    .join('\n  ');
  const metaY = WISH_TOP + lines.length * WISH_LINE_HEIGHT + 34;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="${VIEW_W}" height="${VIEW_H}" role="img" aria-label="A wish from The Wishing Tree">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#181010"/>
      <stop offset="0.38" stop-color="#22131f"/>
      <stop offset="0.72" stop-color="#231516"/>
      <stop offset="1" stop-color="#110a09"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.34" r="0.55">
      <stop offset="0" stop-color="#e29e52" stop-opacity="0.26"/>
      <stop offset="0.55" stop-color="#ce8042" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="9" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="${VIEW_W}" height="${VIEW_H}" fill="url(#sky)"/>
  <rect width="${VIEW_W}" height="${VIEW_H}" fill="url(#glow)"/>
  ${stars}
  <path d="M${CX - 430} 96 Q${CX - 200} 168, ${CX - 14} ${LEAF_TOP - 4}" fill="none" stroke="#2c1d11" stroke-width="11" stroke-linecap="round"/>
  <path d="M${CX - 210} 150 Q${CX - 330} 168, ${CX - 385} 240" fill="none" stroke="#2c1d11" stroke-width="5" stroke-linecap="round"/>
  <path d="M${CX - 120} 185 Q${CX - 185} 235, ${CX - 172} 300" fill="none" stroke="#2c1d11" stroke-width="5" stroke-linecap="round"/>
  <path d="M${CX - 14} ${LEAF_TOP - 4} L${CX} ${LEAF_TOP + 26}" fill="none" stroke="#2c1d11" stroke-width="3.5" stroke-linecap="round"/>
  ${leafMarkup}
  ${wishText}
  <text x="${CX}" y="${metaY}" text-anchor="middle" font-family="${SANS_STACK}" font-weight="600" font-size="19" fill="#a89a8f">${escapeXml(metaLine(leaf))}</text>
  <line x1="${CX - 58}" y1="${metaY + 34}" x2="${CX + 58}" y2="${metaY + 34}" stroke="#d9b45a" stroke-opacity="0.45" stroke-width="2"/>
  <text x="${CX}" y="${metaY + 74}" text-anchor="middle" font-family="${SANS_STACK}" font-weight="600" font-size="17" letter-spacing="2" fill="#d9b45a">LEAF ${shortCode(leaf.id)}</text>
  <text x="${CX}" y="${VIEW_H - 78}" text-anchor="middle" font-family="${DISPLAY_STACK}" font-style="italic" font-size="22" fill="#8d7f74">every leaf is a wish.</text>
  <text x="${CX}" y="74" text-anchor="middle" font-family="${SANS_STACK}" font-weight="600" font-size="15" letter-spacing="6" fill="#d9b45a" fill-opacity="0.8">THE WISHING TREE</text>
</svg>
`;
}

const LeafCanvas = forwardRef<LeafCanvasHandle, { leaf: KeepsakeLeaf }>(function LeafCanvas({ leaf }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const preparedRef = useRef<{ lines: string[] } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const font = `500 ${WISH_FONT_PX}px ${DISPLAY_STACK}`;

    const paint = () => {
      const lines = wrapLines(ctx, font, leaf.body);
      preparedRef.current = { lines };
      drawCard(ctx, leaf, lines);
    };

    paint();
    // Repaint once the display font lands so the wish doesn't ship in a fallback.
    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) paint();
      });
    }
    return () => {
      cancelled = true;
    };
  }, [leaf]);

  useImperativeHandle(ref, () => ({
    downloadPng() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const lines = preparedRef.current?.lines ?? wrapLines(ctx, `500 ${WISH_FONT_PX}px ${DISPLAY_STACK}`, leaf.body);
      drawCard(ctx, leaf, lines); // ensure the PNG matches what is on screen
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `wishing-tree-leaf-${leaf.id.slice(0, 8).toLowerCase()}.png`);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }, 'image/png');
    },
    downloadSvg() {
      const ctx = canvasRef.current?.getContext('2d');
      const lines = preparedRef.current?.lines ?? (ctx ? wrapLines(ctx, `500 ${WISH_FONT_PX}px ${DISPLAY_STACK}`, leaf.body) : [leaf.body]);
      const svg = buildShareSvg(leaf, lines);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `wishing-tree-leaf-${leaf.id.slice(0, 8).toLowerCase()}.svg`);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    },
  }), [leaf]);

  return (
    <canvas
      ref={canvasRef}
      className="keepsake-canvas"
      width={VIEW_W}
      height={VIEW_H}
      role="img"
      aria-label={`Keepsake card for leaf #${leaf.position}: “${leaf.body}”`}
    />
  );
});

export default LeafCanvas;
