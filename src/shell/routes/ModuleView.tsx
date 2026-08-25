/**
 * ModuleView route — `#/m/:id`. Lazily loads the module via
 * `loadModule(id)`, mounts the Viewport, and renders the auto-generated
 * control panel, layer manager, timeline, plots, readouts, and explain
 * panel around it. Wrapped in ModuleErrorBoundary (§9, §16).
 * TODO(M3/M4): implement.
 */
import React from 'react';

export function ModuleView(_props: { moduleId: string }): React.ReactElement {
  throw new Error('shell/routes/ModuleView: not implemented (see M3 in ARCHITECTURE.md §20)');
}
