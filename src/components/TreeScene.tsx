'use client';

import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { TreeTheme } from '@/lib/types';

/**
 * The subset of GMC's SceneController our display controls need: breeze,
 * zoom, reset, auto-rotate and manual orbit. The render loop stays internal.
 */
export interface SceneController {
  breeze(): void;
  zoom(factor: number): void;
  resetView(): void;
  setAutoRotate(on: boolean): void;
  orbit(horizontal: number): void;
}

/**
 * The living tree, in 3D.
 *
 * Ported from `just-a-simple-tree` (MIT — see ./tree/three/LICENSE): a
 * procedurally grown oak, cel-shaded bark, instanced leaf cards that sway in
 * the wind, drifting leaves and a small lawn. Only the renderer and camera
 * setup live here; the shape rules, shading and wind stay in the vendored
 * modules.
 *
 * Everything heavy — three.js, its TSL node materials, the tree modules — is
 * imported inside the effect, so none of it reaches the server bundle and the
 * page paints before a byte of WebGPU code is parsed. The canvas fades in
 * after the first rendered frame; if WebGPU and its WebGL2 fallback are both
 * unavailable, nothing is shown and the 2D canvas underneath stays put.
 */

/** Warm autumn ramp, tuned against the stage's dark ember gradient. */
const PALETTE = {
  leaves: ['#9c581e', '#df902a', '#fde088'],
  turned: ['#9e341c', '#d65e33', '#f2ab72'],
  wood: ['#2e1b12', '#54331e', '#82502e'],
  grass: ['#162a12', '#4e6d28'],
  shadow: '#12090e',
  darkness: 0.46,
};

/** The oak's grown settings: the upstream defaults, lifted on a short trunk. */
const SHAPE = {
  seed: 8263,
  size: 5.1,
  trunkThickness: 0.28,
  baseFlare: 1.85,
  trunkHeight: 0.8,
  splitHeight: 0.41,
  splitScatter: 0,
  mainLimbs: 4,
  levels: 2,
  branches: 4,
  droop: -1,
  bushClumps: 1,
  spread: 0.94,
  crookedness: 0.36,
  sides: 10,
  smoothness: 1,
  twigs: 5,
  variety: 1,
  cardsPerClump: 32,
  cardSize: 0.98,
  roundness: 0.64,
  clumpSize: 1.05,
  clumpEvenness: 0,
  aoDistance: 2.5,
  leafTexture: 'round cluster',
  leafColors: 'theme',
};

export interface TreeSceneProps {
  /** Wishes currently on the tree; nudges how many leaves drift down. */
  leafCount?: number;
  className?: string;
  /** Fired once the first frame has been drawn and the canvas is visible. */
  onReady?: () => void;
  /** Receives the controller that drives breeze/zoom/orbit/rotate. */
  sceneRef?: MutableRefObject<SceneController | null>;
  /** Canopy palette override; falls back to the ember ramp above. */
  theme?: Pick<TreeTheme, 'leafPalette'> | null;
  /** Initial camera spin state; the Play/Pause control toggles it live. */
  autoRotate?: boolean;
  /** 0 = bare sapling … 1 = mature tree; maps onto the oak's growth age. */
  growth?: number;
}

export default function TreeScene({
  leafCount = 0,
  className,
  onReady,
  sceneRef,
  theme,
  autoRotate = true,
  growth = 1,
}: TreeSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onReadyRef = useRef(onReady);
  const leafCountRef = useRef(leafCount);
  const sceneRefRef = useRef(sceneRef);
  const themeRef = useRef(theme);
  const autoRotateRef = useRef(autoRotate);
  const growthRef = useRef(growth);
  sceneRefRef.current = sceneRef;
  themeRef.current = theme;
  autoRotateRef.current = autoRotate;
  growthRef.current = growth;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  onReadyRef.current = onReady;
  leafCountRef.current = leafCount;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const mount = host;

    let disposed = false;
    let stop: (() => void) | null = null;
    let cancelStart: (() => void) | null = null;

    // Let the page settle first. Parsing the WebGPU graph and growing the tree
    // in one synchronous burst would block taps and client-side navigation for
    // seconds on slow devices, so the poster carries the stage until we're idle.
    const start = () => {
      cancelStart = null;
      void boot();
    };

    async function boot() {
      try {
        const THREE = await import('three/webgpu');
        const { oak } = (await import('./tree/three/oak.js')) as any;
        const { growAged, MATURE } = (await import('./tree/three/tree-age.js')) as any;
        const { LEVELS, woodParams, leafParams } = (await import('./tree/three/lod.js')) as any;
        const { createFoliage, fallingTexture } = (await import('./tree/three/foliage.js')) as any;
        const { createFallingLeaves } = (await import('./tree/three/falling-leaves.js')) as any;
        const { createGrass } = (await import('./tree/three/grass.js')) as any;
        const { wind } = (await import('./tree/three/wind.js')) as any;
        const { bounds } = (await import('./tree/three/bounds.js')) as any;
        const {
          barkMaterial,
          barkColors,
          shadowColor,
          shadowDarkness,
        } = (await import('./tree/three/shading.js')) as any;

        if (disposed) return;

        const reduced =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // ---------- renderer ----------
        const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        await renderer.init();
        if (disposed) {
          renderer.dispose();
          return;
        }

        // Three.js WebGPU backend falls back gracefully to WebGL2 when WebGPU
        // is unavailable. Both paths have hardware acceleration in modern browsers.
        // We start with full visual fidelity and dynamically adapt resolution/pacing
        // only if measured render time exceeds acceptable thresholds.
        const gpu = renderer.backend?.isWebGPUBackend === true;

        // 1.5x is where the cel bands read crisply; resolution can dynamically
        // adapt if the GPU/CPU struggles on heavier devices.
        let resolution = 1;
        const dpr = () => Math.min(window.devicePixelRatio || 1, 1.5) * resolution;
        renderer.setPixelRatio(dpr());
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;

        const canvas = renderer.domElement as HTMLCanvasElement;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.setAttribute('aria-hidden', 'true');
        mount.appendChild(canvas);

        // ---------- scene ----------
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(20, 1, 0.5, 220);

        // A warm directional sun casting soft anime cel shadows.
        const sun = new THREE.DirectionalLight('#fff5e4', 5.2);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = -8.5;
        sun.shadow.camera.right = 8.5;
        sun.shadow.camera.top = 8.5;
        sun.shadow.camera.bottom = -8.5;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 60;
        sun.shadow.bias = -0.0004;
        sun.shadow.normalBias = 0.025;
        sun.position.set(9.5, 14.5, 12);

        const hemisphere = new THREE.HemisphereLight('#cce2ff', '#6e5641', 1.15);
        scene.add(sun, hemisphere);

        // ---------- tree ----------
        // Growth ratio rides the oak's own age curve: 0 is a bare sapling,
        // MATURE is the tree as its settings grow it. A tree at MATURE gets
        // exactly its own settings, so growth >= 1 renders as today.
        const growthClamped = THREE.MathUtils.clamp(Number(growthRef.current) || 0, 0, 1);
        const params = {
          ...SHAPE,
          treeAge: MATURE * growthClamped,
          whorls: 9,
          whorlBranches: 6,
          slenderness: 1,
          cypressBranches: 20,
          willowStrands: 111,
          hang: 0.8,
          twist: 1,
          curls: 0.75,
          roots: 5,
          leavesLeft: 0.35,
        };

        const grown = growAged(oak, woodParams(params, LEVELS[0]));
        grown.clumps.forEach((clump: any, i: number) => {
          clump.swing = grown.geometry.userData.swayAt(clump.position, i);
        });
        if (params.twigs > 0) {
          grown.geometry = grown.geometry.userData.withTwigs(grown.clumps, params.twigs, true);
        }

        const tree = new THREE.Mesh(grown.geometry, barkMaterial());
        tree.castShadow = true;
        tree.receiveShadow = true;
        // The wind moves vertices in the shader, past the geometry's own sphere.
        tree.frustumCulled = false;
        scene.add(tree);

        const grass = createGrass();
        grass.setCount(
          reduced
            ? 2000
            : mount.clientWidth < 560
              ? 2600
              : 3800,
        );
        scene.add(grass.mesh);

        const foliage = createFoliage();
        foliage.setLeafTexture(params.leafTexture, null);
        foliage.setShown(true);
        foliage.setClumpsShown(false);
        foliage.uniforms.cardSize.value = params.cardSize;
        foliage.uniforms.roundness.value = params.roundness;
        foliage.mesh.frustumCulled = false;
        scene.add(foliage.mesh, foliage.clumps);

        // ---------- leaves in the air ----------
        const falling = createFallingLeaves({
          colors: foliage.uniforms.colors,
          turnedColors: foliage.uniforms.turned,
          imageColors: foliage.uniforms.imageColors,
          age: foliage.uniforms.age,
          crownCenter: foliage.uniforms.crownCenter,
          crownSize: foliage.uniforms.crownSize,
        });
        falling.setTexture(fallingTexture(params.leafTexture), null);
        falling.uniforms.amount.value = reduced
          ? 36
          : Math.min(160, Math.round((70 + Math.max(0, leafCountRef.current) * 4) * (0.3 + 0.7 * growthClamped)));
        falling.mesh.frustumCulled = false;
        scene.add(falling.mesh);

        // ---------- theme ----------
        barkColors.forEach((u: any, i: number) => u.value.set(PALETTE.wood[i]));
        PALETTE.leaves.forEach((hex, i) => foliage.uniforms.colors[i].value.set(hex));
        PALETTE.turned.forEach((hex, i) => foliage.uniforms.turned[i].value.set(hex));
        PALETTE.grass.forEach((hex, i) => grass.uniforms.colors[i].value.set(hex));
        shadowColor.value.set(PALETTE.shadow);
        shadowDarkness.value = PALETTE.darkness;

        // Canopy override: first three palette colors feed the live canopy,
        // the last three tint the turned leaves towards the ground.
        const leafPalette = themeRef.current?.leafPalette;
        if (leafPalette?.length) {
          leafPalette.slice(0, 3).forEach((hex, i) => foliage.uniforms.colors[i]?.value.set(hex));
          const turned = leafPalette.slice(-3);
          turned.forEach((hex, i) => foliage.uniforms.turned[i]?.value.set(hex));
        }

        // The sway grows towards the top of the wood, however much of it is drawn.
        wind.height.value =
          grown.geometry.userData.top ||
          Math.max(...grown.clumps.map((c: any) => c.position.y + c.radius));
        const baseWindStrength = reduced ? 0.08 : 0.2;
        wind.strength.value = baseWindStrength;
        wind.flutter.value = reduced ? 0.12 : 0.25;

        foliage.update(grown.clumps, leafParams(params, LEVELS[0]));

        // ---------- camera ----------
        const { box } = bounds(grown.geometry, foliage);
        const target = box.getCenter(new THREE.Vector3());
        const BASE_DIR = new THREE.Vector3(0.06, 0.15, 1).normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);
        const side = new THREE.Vector3().crossVectors(worldUp, BASE_DIR).normalize();
        const up = new THREE.Vector3().crossVectors(BASE_DIR, side).normalize();
        const tanY = Math.tan(((camera.fov / 2) * Math.PI) / 180);
        let baseDistance = 30;
        /** The fitted distance resetView() returns to; user zoom multiplies baseDistance. */
        let fittedDistance = 30;
        let autoRotateOn = autoRotateRef.current;
        let autoYaw = 0;
        let orbitYaw = 0;
        let gust = 0;

        /** Back the camera away until every corner of the tree is on screen. */
        function fitCamera() {
          const tanX = tanY * Math.max(camera.aspect, 0.2);
          let distance = 0;
          const corner = new THREE.Vector3();
          for (let i = 0; i < 8; i += 1) {
            corner
              .set(
                i & 1 ? box.max.x : box.min.x,
                i & 2 ? box.max.y : box.min.y,
                i & 4 ? box.max.z : box.min.z,
              )
              .sub(target);
            const x = corner.dot(side);
            const y = corner.dot(up);
            const z = corner.dot(BASE_DIR);
            distance = Math.max(distance, z + Math.abs(x) / tanX, z + Math.abs(y) / tanY);
          }
          // A little air round the crown; the box already rounds each leaf
          // card out to its full width, so this crops tighter than it sounds.
          baseDistance = distance * (camera.aspect < 1 ? 1.0 : 0.94);
          // Growth: auto-fit would blow a young tree up to full-frame size.
          // Hold a little of the mature framing back so a sapling reads small.
          const g = THREE.MathUtils.clamp(Number(growthRef.current) || 0, 0, 1);
          baseDistance *= 1 + (1 - g) * 1.05;
          fittedDistance = baseDistance;
        }

        function resize() {
          const width = mount.clientWidth || 1;
          const height = mount.clientHeight || 1;
          renderer.setPixelRatio(dpr());
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          fitCamera();
        }

        // ---------- pointer parallax ----------
        const aimed = { x: 0, y: 0 };
        const eased = { x: 0, y: 0 };
        function onPointerMove(event: PointerEvent) {
          const rect = mount.getBoundingClientRect();
          if (rect.width < 1 || rect.height < 1) return;
          aimed.x = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
          aimed.y = THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
        }
        if (!reduced && window.matchMedia('(pointer: fine)').matches) {
          window.addEventListener('pointermove', onPointerMove, { passive: true });
        }

        const dir = new THREE.Vector3();
        let last = performance.now();
        let elapsed = 0;

        function look(now: number) {
          const seconds = Math.min((now - last) / 1000, 0.1);
          last = now;
          elapsed += seconds;

          const ease = 1 - Math.exp(-4 * seconds);
          eased.x += (aimed.x - eased.x) * ease;
          eased.y += (aimed.y - eased.y) * ease;

          // A breeze impulse decays into the shader wind.
          if (gust > 0) {
            gust = Math.max(0, gust - seconds * 0.5);
            wind.strength.value = baseWindStrength * (1 + gust * 2.2);
          }

          // A slow breath of orbit (or a steady auto-rotate), plus a shallow
          // nod towards the pointer, plus any manual orbit offset.
          if (autoRotateOn && !reduced) autoYaw += seconds * 0.12;
          const drift = reduced ? 0 : Math.sin(elapsed * 0.16) * 0.035;
          dir
            .copy(BASE_DIR)
            .applyAxisAngle(worldUp, drift - eased.x * 0.1 + orbitYaw + autoYaw)
            .applyAxisAngle(side, eased.y * 0.05);
          camera.position.copy(target).addScaledVector(dir, baseDistance);
          camera.lookAt(target);
        }

        // ---------- frame loop ----------
        // Runs at a fluid 60 FPS by default. Dynamically monitors frame execution cost;
        // only steps down buffer resolution or paces frames if a genuine software rasteriser
        // or throttled device is detected.
        let targetFrameMs = 0;
        let lastFrameAt = 0;
        let slowFrames = 0;
        let fastFrames = 0;

        function frame() {
          const now = performance.now();
          if (targetFrameMs > 0 && now - lastFrameAt < targetFrameMs) return;
          lastFrameAt = now;

          look(now);
          falling.update(renderer);

          const started = performance.now();
          renderer.render(scene, camera);
          const cost = performance.now() - started;

          // Adaptive dynamic pacing: only throttle if actual render execution takes too long
          if (cost > 50) {
            slowFrames += 1;
            fastFrames = 0;
            if (slowFrames >= 5) {
              if (resolution > 0.6) {
                resolution = Math.max(0.6, resolution - 0.15);
                resize();
              } else if (targetFrameMs === 0) {
                targetFrameMs = 33; // 30 FPS floor for heavy systems
              } else if (targetFrameMs < 50) {
                targetFrameMs = 50; // 20 FPS floor on software rasterisers
              }
              slowFrames = 0;
            }
          } else if (cost < 20) {
            fastFrames += 1;
            if (fastFrames > 60) {
              slowFrames = 0;
              if (targetFrameMs > 0) targetFrameMs = 0;
              if (resolution < 1) {
                resolution = Math.min(1, resolution + 0.1);
                resize();
              }
              fastFrames = 0;
            }
          }
        }

        let onScreen = true;
        function play() {
          if (onScreen && !disposed && !document.hidden) renderer.setAnimationLoop(frame);
        }

        function pause() {
          renderer.setAnimationLoop(null);
        }

        const overlay = new IntersectionObserver(
          (entries) => {
            onScreen = entries[0]?.isIntersecting ?? true;
            if (onScreen) play();
            else pause();
          },
          { threshold: 0.01 },
        );
        overlay.observe(mount);

        // A background tab has no frames to show; stop burning CPU on them.
        const onVisibility = () => (document.hidden ? pause() : play());
        document.addEventListener('visibilitychange', onVisibility);

        const box2d = new ResizeObserver(resize);
        box2d.observe(mount);

        resize();
        frame();
        renderer.setAnimationLoop(frame);

        if (disposed) {
          renderer.setAnimationLoop(null);
          renderer.dispose();
          canvas.remove();
          overlay.disconnect();
          box2d.disconnect();
          document.removeEventListener('visibilitychange', onVisibility);
          return;
        }

        // Fade the canvas in only once there is a frame to show.
        const controller: SceneController = {
          breeze: () => {
            gust = 1;
          },
          zoom: (factor: number) => {
            baseDistance = THREE.MathUtils.clamp(
              baseDistance * factor,
              fittedDistance * 0.35,
              fittedDistance * 3.25,
            );
          },
          resetView: () => {
            baseDistance = fittedDistance;
            orbitYaw = 0;
          },
          setAutoRotate: (on: boolean) => {
            autoRotateOn = on;
          },
          orbit: (horizontal: number) => {
            orbitYaw += horizontal;
          },
        };
        if (sceneRefRef.current) sceneRefRef.current.current = controller;

        setReady(true);
        onReadyRef.current?.();

        stop = () => {
          renderer.setAnimationLoop(null);
          overlay.disconnect();
          box2d.disconnect();
          document.removeEventListener('visibilitychange', onVisibility);
          window.removeEventListener('pointermove', onPointerMove);
          if (sceneRefRef.current) sceneRefRef.current.current = null;
          scene.traverse((obj: any) => {
            obj.geometry?.dispose?.();
            const material = obj.material;
            if (Array.isArray(material)) material.forEach((m) => m?.dispose?.());
            else material?.dispose?.();
          });
          renderer.dispose();
          canvas.remove();
        };
      } catch (error) {
        if (disposed) return;
        // The 2D tree underneath is still there; this is a soft landing, not a crash.
        console.warn('[tree] 3D scene unavailable, keeping the 2D canopy.', error);
        setFailed(true);
      }
    }

    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(start, { timeout: 2000 });
      cancelStart = () => window.cancelIdleCallback(handle);
    } else {
      const handle = window.setTimeout(start, 300);
      cancelStart = () => window.clearTimeout(handle);
    }

    return () => {
      disposed = true;
      cancelStart?.();
      stop?.();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={['tree-scene', className, ready ? 'is-ready' : ''].filter(Boolean).join(' ')}
      data-failed={failed ? 'true' : undefined}
      aria-hidden="true"
    />
  );
}
