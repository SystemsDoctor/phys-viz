/**
 * shell/layers — renders a module's LayerDef[] as a checklist, grouped.
 * This is the "click a toggle to add the cross product" interaction from
 * the original brief, and it is generic (ARCHITECTURE.md §9).
 *
 * Also implements Predict mode: freeze time at t=0 (ModuleView's job —
 * see M3-27) and hide layers tagged `reveal: true` until the student
 * clicks reveal. Modules opt in merely by tagging a layer — no module
 * code needed (§9 "Predict mode"). Which reveal-tagged layers have
 * already been revealed this round is transient UI state local to this
 * component (not part of AppState — resetting it is just "ask again
 * next time predict mode is entered", not a bookmarkable concern).
 *
 * The ~150ms fade-in a toggle produces IN THE VIEWPORT (§15, M3-8) is
 * scene-layer work — Viewport.setGroupVisible animates it — this
 * component only fades in its own newly-revealed checklist rows.
 */
import React from 'react';
import type { LayerDef } from '@/modules/types';

export function LayerManager(props: {
  defs: LayerDef[];
  values: Record<string, boolean>;
  predictMode: boolean;
  onChange: (key: string, value: boolean) => void;
}): React.ReactElement {
  const { defs, values, predictMode, onChange } = props;
  const [revealed, setRevealed] = React.useState<Set<string>>(new Set());

  // A fresh prediction round (predict mode just turned on) starts with
  // nothing revealed yet.
  const wasPredicting = React.useRef(predictMode);
  if (predictMode && !wasPredicting.current) setRevealed(new Set());
  wasPredicting.current = predictMode;

  function reveal(def: LayerDef): void {
    setRevealed((prev) => new Set(prev).add(def.key));
    onChange(def.key, true);
  }

  const groups: { name: string | undefined; defs: LayerDef[] }[] = [];
  const byName = new Map<string | undefined, (typeof groups)[number]>();
  for (const def of defs) {
    let group = byName.get(def.group);
    if (!group) {
      group = { name: def.group, defs: [] };
      byName.set(def.group, group);
      groups.push(group);
    }
    group.defs.push(def);
  }

  return (
    <div className="pv-layer-manager">
      {groups.map((group, i) => (
        <fieldset key={group.name ?? `_ungrouped_${i}`} className="pv-param-group">
          {group.name && <legend>{group.name}</legend>}
          {group.defs.map((def) => {
            const hidden = predictMode && def.reveal === true && !revealed.has(def.key);
            if (hidden) {
              return (
                <button
                  key={def.key}
                  type="button"
                  className="pv-layer-row pv-layer-row--reveal"
                  onClick={() => reveal(def)}
                >
                  Reveal: {def.label}
                </button>
              );
            }
            const justRevealed = predictMode && def.reveal === true && revealed.has(def.key);
            return (
              <label
                key={def.key}
                className={justRevealed ? 'pv-layer-row pv-layer-row--fade-in' : 'pv-layer-row'}
              >
                <input
                  type="checkbox"
                  className="pv-toggle__box"
                  checked={values[def.key] ?? def.default}
                  onChange={(e) => onChange(def.key, e.target.checked)}
                />
                <span>{def.label}</span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
