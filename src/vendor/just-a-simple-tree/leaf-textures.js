// Leaf path and cluster painters adapted from Mike Fernandez's foliage.js (MIT).
// See LICENSE. A single transparent cell replaces the original 2x2 luminance atlas.
import * as THREE from 'three'
import { mulberry32 } from './wood.js'

function pointed(ctx, length) {
  ctx.moveTo(-length, 0)
  ctx.quadraticCurveTo(0, -length * 0.75, length, 0)
  ctx.quadraticCurveTo(0, length * 0.75, -length, 0)
}

function round(ctx, length) {
  ctx.ellipse(0, 0, length, length * 0.7, 0, 0, Math.PI * 2)
}

// A willow leaf: long and narrow, tapering to a point at both ends
function willow(ctx, length) {
  ctx.moveTo(-length, 0)
  ctx.quadraticCurveTo(-length * 0.2, -length * 0.26, length, 0)
  ctx.quadraticCurveTo(-length * 0.2, length * 0.26, -length, 0)
}

// An oak leaf: narrow at the base, widest past the middle, with rounded
// lobes down each side
const LOBES = 3 // down each side
function oak(ctx, length) {
  const width = (t) => length * 0.5 * Math.sin(Math.PI * t) ** 0.7 * (0.6 + 0.4 * Math.abs(Math.sin(LOBES * Math.PI * t)))
  ctx.moveTo(-length, 0)
  for (let i = 1; i <= 40; i++) ctx.lineTo(-length + (2 * length * i) / 40, -width(i / 40))
  for (let i = 39; i >= 0; i--) ctx.lineTo(-length + (2 * length * i) / 40, width(i / 40))
}

// A pine sprig: a thin twig with needles in pairs along it, leaning towards
// its tip and shortening there, one path so it fills in one go
function sprig(ctx, length) {
  const stem = Math.max(length * 0.04, 1.5)
  ctx.rect(-length, -stem, length * 2, stem * 2)
  const pairs = 7
  for (let i = 0; i < pairs; i++) {
    const t = i / (pairs - 1)
    const x = -length * 0.85 + t * length * 1.7
    const needle = length * 0.55 * (1 - 0.45 * t)
    const half = Math.max(length * 0.035, 1.5)
    for (const side of [-1, 1]) {
      const tipX = x + needle * Math.cos(0.75)
      const tipY = side * needle * Math.sin(0.75)
      ctx.moveTo(x - half, 0)
      ctx.lineTo(tipX, tipY)
      ctx.lineTo(x + half, 0)
      ctx.closePath()
    }
  }
}

function cluster(ctx, random, shape, count, smallest, largest, turn) {
  ctx.fillStyle = '#fff'
  for (let i = 0; i < count; i++) {
    const d = Math.sqrt(random()) * (118 - largest)
    const t = random() * Math.PI * 2
    ctx.save()
    ctx.translate(Math.cos(t) * d, Math.sin(t) * d)
    ctx.rotate(turn ? (random() - 0.5) * turn : random() * Math.PI * 2)
    ctx.beginPath()
    shape(ctx, smallest + random() * (largest - smallest))
    ctx.fill()
    ctx.restore()
  }
}

export function createClusterTexture(shape, species) {
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d'); ctx.translate(128,128);
  const painter=shape==='oak'?oak:shape==='round'?round:shape==='needle'?sprig:species==='willow'?willow:pointed;
  cluster(ctx,mulberry32(42),painter,shape==='needle'?16:species==='willow'?18:30,shape==='needle'?34:species==='willow'?40:13,shape==='needle'?52:species==='willow'?58:21,species==='willow'?.7:undefined);
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace; return texture;
}
