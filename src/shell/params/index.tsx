/**
 * shell/params — reads a module's ParamDef[] and renders the control
 * panel. A module author writes zero UI code (ARCHITECTURE.md §9).
 * Adding a new *kind* of control (e.g. a 2D angle dial) is a shell
 * change here that every module can then use.
 */
import React from 'react';
import type { ParamDef } from '@/modules/types';
import { Slider } from '../controls/Slider';
import { VectorPad } from '../controls/VectorPad';
import { Toggle } from '../controls/Toggle';
import { Select } from '../controls/Select';
import { ExpressionField } from '../controls/ExpressionField';
import { AngleDial } from '../controls/AngleDial';

export function ParamControl(props: {
  def: ParamDef;
  value: unknown;
  onChange: (value: unknown) => void;
}): React.ReactElement {
  const { def, value, onChange } = props;

  switch (def.kind) {
    case 'number':
      return (
        <Slider
          label={def.label}
          min={def.min}
          max={def.max}
          step={def.step}
          value={value as number}
          logScale={def.logScale}
          onChange={onChange}
        />
      );
    case 'vector':
      return (
        <VectorPad
          label={def.label}
          value={value as [number, number, number]}
          range={def.range}
          onChange={onChange}
        />
      );
    case 'toggle':
      return <Toggle label={def.label} value={value as boolean} onChange={onChange} />;
    case 'select':
      return (
        <Select
          label={def.label}
          value={value as string}
          options={def.options}
          onChange={onChange}
        />
      );
    case 'expression':
      return (
        <ExpressionField
          label={def.label}
          value={value as string}
          vars={def.vars}
          onChange={onChange}
        />
      );
    case 'angle':
      return (
        <AngleDial
          label={def.label}
          value={value as number}
          min={def.min}
          max={def.max}
          onChange={onChange}
        />
      );
  }
}

interface ParamGroup {
  name: string | undefined;
  defs: ParamDef[];
}

function groupParams(defs: ParamDef[]): ParamGroup[] {
  const groups: ParamGroup[] = [];
  const byName = new Map<string | undefined, ParamGroup>();
  for (const def of defs) {
    let group = byName.get(def.group);
    if (!group) {
      group = { name: def.group, defs: [] };
      byName.set(def.group, group);
      groups.push(group);
    }
    group.defs.push(def);
  }
  return groups;
}

export function ParamPanel(props: {
  defs: ParamDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}): React.ReactElement {
  const { defs, values, onChange } = props;
  const groups = groupParams(defs);

  return (
    <div className="pv-param-panel">
      {groups.map((group, i) => (
        <fieldset key={group.name ?? `_ungrouped_${i}`} className="pv-param-group">
          {group.name && <legend>{group.name}</legend>}
          {group.defs.map((def) => (
            <ParamControl
              key={def.key}
              def={def}
              value={values[def.key]}
              onChange={(v) => onChange(def.key, v)}
            />
          ))}
        </fieldset>
      ))}
    </div>
  );
}
