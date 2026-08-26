/**
 * App — shell root. LAYER 2 (ARCHITECTURE.md §9).
 *
 * May import kernel, scene, modules/types, modules/registry, and react.
 * Must NOT import a concrete module implementation directly — modules
 * are loaded through `@/modules/registry`'s `loadModule()`.
 *
 * Currently just the M2 throwaway: mounts src/scene/demoScene.ts (every
 * glyph through the real SceneContext/Viewport) onto a full-viewport
 * canvas to satisfy the M2 acceptance criterion. TODO(M3): replace with
 * hash routing (wouter), the Zustand store (shell/state), and the real
 * routes.
 */
import React, { useEffect, useRef } from 'react';
import { mountDemoScene } from '@/scene/demoScene';

export function App(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountDemoScene(canvas);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}
