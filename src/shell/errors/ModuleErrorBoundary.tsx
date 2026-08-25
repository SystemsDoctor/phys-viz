/**
 * ModuleErrorBoundary — catches module exceptions and renders a card
 * with the module id, the error, and a "reset to defaults" button. The
 * gallery stays usable (ARCHITECTURE.md §3 principle 5 "Fail visible,
 * not silent"; §9).
 *
 * TODO(M3): implement as a React class component (error boundaries
 * cannot yet be function components).
 */
import React from 'react';

export class ModuleErrorBoundary extends React.Component<
  { moduleId: string; onReset: () => void; children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { moduleId: string; onReset: () => void; children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    throw new Error('shell/errors/ModuleErrorBoundary: not implemented (see M3 in ARCHITECTURE.md §20)');
  }
}
