'use client';

import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import TreeCanvas from './TreeCanvas';
import TreeScene from './TreeScene';
import type { SceneController } from './TreeScene';
import type { TreeTheme } from '@/lib/types';

/**
 * The canopy stage: a live 3D tree with the lightweight 2D canvas underneath
 * as its poster and fallback. The 2D tree paints immediately, so the stage is
 * never empty, and stops animating once the 3D canvas fades in over it.
 */
export default function TreeStage({
  leafCount = 14,
  growth = 1,
  sceneRef,
  theme,
  autoRotate = true,
}: {
  leafCount?: number;
  /** 0 = bare sapling … 1 = mature tree; anything above renders as mature. */
  growth?: number;
  /** Forwarded to the 3D scene so the display controls can drive it. */
  sceneRef?: MutableRefObject<SceneController | null>;
  /** Canopy palette override from the tree's stored theme. */
  theme?: Pick<TreeTheme, 'leafPalette'> | null;
  /** Initial auto-rotation state; the Play/Pause control toggles it live. */
  autoRotate?: boolean;
}) {
  const [live, setLive] = useState(false);
  const handleReady = useCallback(() => setLive(true), []);

  return (
    <>
      <div
        className={`tree-layer tree-layer-2d${live ? ' is-hidden' : ''}`}
        style={live ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
      >
        <TreeCanvas leafCount={leafCount} growth={growth} paused={live} />
      </div>
      <TreeScene
        leafCount={leafCount}
        growth={growth}
        onReady={handleReady}
        sceneRef={sceneRef}
        theme={theme}
        autoRotate={autoRotate}
      />
    </>
  );
}
