/**
 * ModuleErrorBoundary — catches module exceptions and renders a card
 * with the module id, the error, and a "reset to defaults" button. The
 * gallery stays usable (ARCHITECTURE.md §3 principle 5 "Fail visible,
 * not silent"; §9).
 *
 * A React class component because error boundaries cannot yet be
 * function components (no hook equivalent of
 * `getDerivedStateFromError`/`componentDidCatch`).
 *
 * `instance.update()`/`scalars()`/`step()` are called from OUTSIDE
 * React (§13 — a Zustand subscribe callback and a bare rAF loop, not
 * component render), so a throw there is invisible to this boundary's
 * own catch machinery, which only sees render-phase errors. ModuleView
 * wraps those calls in try/catch and reports the failure through
 * `externalError` instead — same fallback UI either way.
 */
import React from 'react';

interface ModuleErrorBoundaryProps {
  moduleId: string;
  onReset: () => void;
  children: React.ReactNode;
  externalError?: Error | null;
}

interface ModuleErrorBoundaryState {
  error: Error | null;
}

export class ModuleErrorBoundary extends React.Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return { error };
  }

  private readonly handleReset = (): void => {
    this.setState({ error: null });
    this.props.onReset();
  };

  render(): React.ReactNode {
    const error = this.state.error ?? this.props.externalError;
    if (!error) return this.props.children;
    return (
      <div className="pv-module-error" role="alert">
        <h2>Something went wrong in &ldquo;{this.props.moduleId}&rdquo;</h2>
        <p className="pv-module-error__message">{error.message}</p>
        <button type="button" onClick={this.handleReset}>
          Reset to defaults
        </button>
      </div>
    );
  }
}
