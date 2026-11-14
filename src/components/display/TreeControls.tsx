'use client';

import type { MutableRefObject } from 'react';
import { motion } from 'motion/react';
import { Minus, Pause, Play, Plus, RotateCcw, Wind } from 'lucide-react';
import type { SceneController } from '../TreeScene';

/**
 * GMC-style nudge bar for the 3D canopy. Buttons no-op silently when the
 * 3D scene hasn't booted (or failed), same as GMC's controller calls.
 */
export default function TreeControls({
  sceneRef,
  rotating,
  onToggleRotate,
}: {
  sceneRef: MutableRefObject<SceneController | null>;
  rotating: boolean;
  onToggleRotate: () => void;
}) {
  return (
    <div className="ds-controls" role="toolbar" aria-label="Tree controls">
      <span className="ds-controls-hint">Live canopy — wishes bloom as they’re planted</span>

      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Send a breeze through the tree"
        onClick={() => sceneRef.current?.breeze()}
      >
        <Wind size={18} />
      </motion.button>

      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.9 }}
        aria-label={rotating ? 'Pause tree rotation' : 'Resume tree rotation'}
        aria-pressed={rotating}
        onClick={onToggleRotate}
      >
        {rotating ? <Pause size={17} /> : <Play size={17} />}
      </motion.button>

      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Zoom in on the tree"
        onClick={() => sceneRef.current?.zoom(0.85)}
      >
        <Plus size={19} />
      </motion.button>

      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Zoom out of the tree"
        onClick={() => sceneRef.current?.zoom(1.15)}
      >
        <Minus size={19} />
      </motion.button>

      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Reset the tree view"
        onClick={() => sceneRef.current?.resetView()}
      >
        <RotateCcw size={17} />
      </motion.button>
    </div>
  );
}
