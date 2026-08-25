/**
 * App — shell root. LAYER 2 (ARCHITECTURE.md §9).
 *
 * May import kernel, scene, modules/types, modules/registry, and react.
 * Must NOT import a concrete module implementation directly — modules
 * are loaded through `@/modules/registry`'s `loadModule()`.
 *
 * TODO(M3): wire up hash routing (wouter), the Zustand store
 * (shell/state), and the routes below.
 */
import React from 'react';

export function App(): React.ReactElement {
  throw new Error('shell/App: not implemented (see M3 in ARCHITECTURE.md §20)');
}
