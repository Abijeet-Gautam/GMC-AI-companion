'use client';

import { useEffect, useRef } from 'react';

/** Deterministic PRNG so the tree shape is stable across renders. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface GlowLeaf {
  // position as fraction of canvas (relative to canopy anchor)
  dx: number;
  dy: number;
  r: number;
  hue: number; // 36..58 gold family
  phase: number;
}
interface FallingLeaf {
  x: number; y: number; vy: number; sway: number; phase: number; rot: number; vr: number; size: number; hue: number;
}
interface Firefly { x: number; y: number; phase: number; speed: number; amp: number; }

export default function TreeCanvas({
  leafCount = 14,
  growth = 1,
  className,
  paused = false,
}: {
  /** How many wish-leaves glow on the tree (maps to visual density). */
  leafCount?: number;
  /** 0 = bare sapling … 1 = mature tree; drives trunk, branches and canopy size. */
  growth?: number;
  className?: string;
  /** Stops the animation loop once the 3D canopy is painting over this one. */
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ------- static-ish layout, rebuilt on resize -------
    const rand = mulberry32(20261113);
    const stars = Array.from({ length: 70 }, () => ({
      x: rand(), y: rand() * 0.42, r: rand() * 1.3 + 0.4, tw: rand() * Math.PI * 2,
    }));
    const canopyBlobs = Array.from({ length: 9 }, (_, i) => ({
      // offsets around the canopy anchor (cx, cy), as fraction of width
      ox: (rand() - 0.5) * 0.46,
      oy: (rand() - 0.5) * 0.30,
      rx: 0.16 + rand() * 0.12,
      ry: 0.13 + rand() * 0.10,
      tone: i % 3,
    }));
    const branchSpecs = [
      { mx: -0.02, c1x: -0.10, c1y: -0.13, ex: -0.21, ey: -0.27, w: 0.022 },
      { mx: 0.03, c1x: 0.11, c1y: -0.14, ex: 0.22, ey: -0.28, w: 0.022 },
      { mx: -0.01, c1x: -0.05, c1y: -0.20, ex: -0.12, ey: -0.38, w: 0.016 },
      { mx: 0.01, c1x: 0.05, c1y: -0.21, ex: 0.12, ey: -0.39, w: 0.016 },
      { mx: 0.0, c1x: 0.0, c1y: -0.28, ex: 0.0, ey: -0.46, w: 0.02 },
    ];

    // ------- growth staging: sapling (0) → mature (1) -------
    const g = Math.min(1, Math.max(0, growth));
    const branchP = Math.min(1, Math.max(0, (g - 0.12) / 0.63)); // first limbs ~12% … full at ~75%
    const canopyP = Math.min(1, Math.max(0, (g - 0.35) / 0.6)); // canopy forms from ~35% to ~95%
    const trunkScale = 0.5 + 0.5 * g;
    const canopyScaleX = 0.12 + 0.88 * canopyP;
    const canopyScaleY = 0.1 + 0.9 * canopyP;

    const visualLeaves = Math.min(46, Math.max(10, Math.round(6 + leafCount * 0.55)));
    const shownLeaves = Math.round(visualLeaves * canopyP);
    const glowLeaves: GlowLeaf[] = Array.from({ length: shownLeaves }, () => ({
      dx: (rand() - 0.5) * 0.42,
      dy: (rand() - 0.5) * 0.27 - 0.31, // canopy band above trunk base anchor
      r: 1.6 + rand() * 2.4,
      hue: 38 + rand() * 18,
      phase: rand() * Math.PI * 2,
    }));

    function spawnFaller(r: () => number, scatter = false): FallingLeaf {
      return {
        x: 0.5 + (r() - 0.5) * 0.5,
        y: scatter ? r() : 0.18 + r() * 0.15,
        vy: 0.00055 + r() * 0.0006,
        sway: 0.012 + r() * 0.02,
        phase: r() * Math.PI * 2,
        rot: r() * Math.PI,
        vr: (r() - 0.5) * 0.02,
        size: 2.2 + r() * 2.6,
        hue: 34 + r() * 26,
      };
    }
    const maxFallers = Math.min(26, Math.round((8 + Math.round(leafCount * 0.18)) * g));
    const fallers: FallingLeaf[] = Array.from({ length: maxFallers }, () => spawnFaller(rand, true));

    const fireflies: Firefly[] = Array.from({ length: 7 }, () => ({
      x: rand(), y: 0.45 + rand() * 0.35, phase: rand() * Math.PI * 2, speed: 0.00025 + rand() * 0.0003, amp: 0.02 + rand() * 0.03,
    }));

    // ------- paint -------
    const canopyTones = [
      ['#3d5a2b', '#2c4420'],
      ['#465f2c', '#31481f'],
      ['#374f26', '#263a1c'],
    ] as const;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const groundY = height * 0.93;
      const anchorY = height * 0.62; // where trunk meets canopy

      // sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#26150f');
      sky.addColorStop(0.35, '#332016');
      sky.addColorStop(0.72, '#1d1310');
      sky.addColorStop(1, '#120c0a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // moon + halo
      const moonX = width * 0.82, moonY = height * 0.13, moonR = Math.min(width, height) * 0.055;
      const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.3, moonX, moonY, moonR * 5);
      halo.addColorStop(0, 'rgba(250, 235, 200, 0.35)');
      halo.addColorStop(1, 'rgba(250, 235, 200, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height * 0.4);
      ctx.fillStyle = '#f6ead2';
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(190, 175, 145, 0.5)';
      ctx.beginPath(); ctx.arc(moonX - moonR * 0.3, moonY + moonR * 0.15, moonR * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX + moonR * 0.35, moonY - moonR * 0.25, moonR * 0.12, 0, Math.PI * 2); ctx.fill();

      // stars
      for (const s of stars) {
        const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.0016 + s.tw);
        ctx.globalAlpha = tw;
        ctx.fillStyle = '#ffefc9';
        ctx.beginPath(); ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // distant hills
      ctx.fillStyle = '#191009';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.62);
      ctx.bezierCurveTo(width * 0.2, height * 0.5, width * 0.3, height * 0.66, width * 0.5, height * 0.6);
      ctx.bezierCurveTo(width * 0.72, height * 0.54, width * 0.8, height * 0.66, width, height * 0.58);
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();

      // ground
      const ground = ctx.createLinearGradient(0, height * 0.8, 0, height);
      ground.addColorStop(0, '#201510');
      ground.addColorStop(1, '#0b0706');
      ctx.fillStyle = ground;
      ctx.fillRect(0, height * 0.8, width, height * 0.2);

      // root glow under the tree
      const rootGlow = ctx.createRadialGradient(cx, groundY, 4, cx, groundY, width * 0.42);
      rootGlow.addColorStop(0, 'rgba(217, 180, 90, 0.20)');
      rootGlow.addColorStop(1, 'rgba(217, 180, 90, 0)');
      ctx.fillStyle = rootGlow;
      ctx.fillRect(0, height * 0.66, width, height * 0.34);

      const sway = reduced ? 0 : Math.sin(t * 0.0009) * width * 0.008;

      // trunk silhouette
      const trunkBaseHW = width * 0.052 * trunkScale;
      const trunkTopHW = width * 0.016 * trunkScale;
      const trunkGrad = ctx.createLinearGradient(cx - trunkBaseHW, 0, cx + trunkBaseHW, 0);
      trunkGrad.addColorStop(0, '#241610');
      trunkGrad.addColorStop(0.42, '#4a2c1c');
      trunkGrad.addColorStop(0.58, '#553524');
      trunkGrad.addColorStop(1, '#1d120d');
      ctx.fillStyle = trunkGrad;
      ctx.beginPath();
      ctx.moveTo(cx - trunkBaseHW, groundY);
      ctx.bezierCurveTo(cx - trunkBaseHW * 0.82, groundY - height * 0.16, cx - trunkTopHW + sway * 0.3, anchorY + height * 0.06, cx - trunkTopHW + sway, anchorY);
      ctx.lineTo(cx + trunkTopHW + sway, anchorY);
      ctx.bezierCurveTo(cx + trunkTopHW + sway * 0.3, anchorY + height * 0.06, cx + trunkBaseHW * 0.82, groundY - height * 0.16, cx + trunkBaseHW, groundY);
      ctx.closePath();
      ctx.fill();

      // roots
      ctx.strokeStyle = '#2b1a12';
      ctx.lineCap = 'round';
      const rootSpecs = [
        { ex: -0.26, ey: 0.035, w: 0.016 }, { ex: -0.13, ey: 0.05, w: 0.013 },
        { ex: 0.13, ey: 0.05, w: 0.013 }, { ex: 0.26, ey: 0.035, w: 0.016 },
      ];
      for (const r of rootSpecs) {
        ctx.lineWidth = width * r.w;
        ctx.beginPath();
        ctx.moveTo(cx, groundY - height * 0.012);
        ctx.quadraticCurveTo(cx + (r.ex * width) * 0.45, groundY + height * 0.005, cx + r.ex * width, groundY + r.ey * height);
        ctx.stroke();
      }

      // branches (grow in from the trunk as the tree matures)
      for (const b of branchSpecs) {
        ctx.strokeStyle = '#33200f';
        ctx.lineWidth = Math.max(1.5, width * b.w * (0.35 + 0.65 * branchP));
        ctx.beginPath();
        ctx.moveTo(cx + sway * 0.7, anchorY + height * 0.02);
        ctx.quadraticCurveTo(
          cx + b.c1x * width * branchP + sway * 0.85, anchorY + b.c1y * height * branchP + height * 0.02,
          cx + b.ex * width * branchP + sway, anchorY + b.ey * height * branchP + height * 0.02,
        );
        ctx.stroke();
      }

      // canopy blobs (back-to-front)
      for (const blob of canopyBlobs) {
        const bx = cx + blob.ox * width * canopyScaleX + sway * 1.4;
        const by = anchorY + blob.oy * height * canopyScaleY - height * 0.12;
        const rx = blob.rx * width * canopyScaleX;
        const ry = blob.ry * height * canopyScaleY;
        const [inner, outer] = canopyTones[blob.tone];
        const g = ctx.createRadialGradient(bx - rx * 0.3, by - ry * 0.35, ry * 0.1, bx, by, Math.max(rx, ry));
        g.addColorStop(0, inner);
        g.addColorStop(1, outer);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // warm rim light on canopy top
      if (canopyP > 0.02) {
        const rim = ctx.createRadialGradient(cx + sway * 1.4, anchorY - height * 0.33, 6, cx + sway * 1.4, anchorY - height * 0.33, width * 0.34);
        rim.addColorStop(0, `rgba(238, 213, 143, ${0.24 * canopyP})`);
        rim.addColorStop(1, 'rgba(238, 213, 143, 0)');
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.ellipse(cx + sway * 1.4, anchorY - height * 0.30, width * 0.32 * canopyScaleX, height * 0.16 * canopyScaleY, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // glowing wish leaves
      for (const leaf of glowLeaves) {
        const lx = cx + leaf.dx * width + sway * 1.6;
        const ly = anchorY + leaf.dy * height - height * 0.06 + (reduced ? 0 : Math.sin(t * 0.0012 + leaf.phase) * 2.2);
        const pulse = reduced ? 0.85 : 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(t * 0.0018 + leaf.phase * 1.7));
        const r = leaf.r * (reduced ? 1 : 0.85 + 0.35 * pulse);
        const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 5);
        glow.addColorStop(0, `hsla(${leaf.hue}, 95%, 72%, ${0.85 * pulse})`);
        glow.addColorStop(0.35, `hsla(${leaf.hue}, 92%, 58%, ${0.38 * pulse})`);
        glow.addColorStop(1, `hsla(${leaf.hue}, 90%, 50%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(lx, ly, r * 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsla(${leaf.hue}, 100%, ${68 + pulse * 18}%, 1)`;
        ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI * 2); ctx.fill();
      }

      // falling leaves
      if (!reduced) {
        for (let i = 0; i < fallers.length; i++) {
          const f = fallers[i];
          f.y += f.vy * 16.6;
          f.phase += 0.016;
          f.rot += f.vr;
          if (f.y > 0.98) fallers[i] = spawnFaller(Math.random, false);
          const fx = (f.x + Math.sin(f.phase) * f.sway) * width;
          const fy = f.y * height;
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(f.rot + Math.sin(f.phase) * 0.4);
          ctx.fillStyle = `hsla(${f.hue}, 72%, 55%, 0.9)`;
          ctx.beginPath();
          ctx.ellipse(0, 0, f.size, f.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // fireflies
      for (const fly of fireflies) {
        const fx = (fly.x + (reduced ? 0 : Math.sin(t * fly.speed + fly.phase) * fly.amp)) * width;
        const fy = (fly.y + (reduced ? 0 : Math.cos(t * fly.speed * 1.3 + fly.phase) * fly.amp)) * height;
        const glowPulse = reduced ? 0.8 : 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.003 + fly.phase * 2));
        ctx.fillStyle = `rgba(190, 255, 150, ${glowPulse})`;
        ctx.shadowColor = 'rgba(190, 255, 150, 0.9)';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    if (reduced || paused) {
      draw(1000);
    } else {
      const loop = (t: number) => {
        draw(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [leafCount, growth, paused]);

  return <canvas ref={canvasRef} className={className} role="img" aria-label="A glowing wishing tree at dusk with luminous leaves" />;
}
