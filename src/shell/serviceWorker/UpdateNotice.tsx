/**
 * Non-blocking "new version available — reload" banner (ADR 0005). Renders
 * nothing until the service worker detects an update; never auto-dismisses
 * and never reloads on its own — the reload is always the user's click
 * (§1, "no fiddling mid-lecture": an instructor mid-demo must not have the
 * page change under them).
 *
 * Mounted once in App.tsx, next to <SettingsMenu />, route-independent.
 */
import React from 'react';
import { subscribeUpdateAvailable, isUpdateAvailable, applyUpdate } from './register';

export function UpdateNotice(): React.ReactElement | null {
  const [available, setAvailable] = React.useState(isUpdateAvailable());

  React.useEffect(() => subscribeUpdateAvailable(() => setAvailable(true)), []);

  if (!available) return null;

  return (
    <div className="pv-update-notice" role="status">
      <span>A new version is available.</span>
      <button type="button" onClick={applyUpdate}>
        Reload
      </button>
    </div>
  );
}
