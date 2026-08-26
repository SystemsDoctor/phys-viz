/**
 * shell/readouts — a live table of module-declared scalars with units,
 * formatted by kernel/units. In presenter mode this can be pinned as a
 * large overlay (ARCHITECTURE.md §9, §16).
 *
 * Every readout value is plain DOM text (a table cell), not a canvas
 * pixel — selectable and screen-reader-reachable for free (§16).
 */
import React from 'react';
import type { ScalarDef } from '@/modules/types';
import { formatQuantity, DIMENSIONLESS } from '@/kernel/units';
import { MathSpan } from '../MathSpan';

export function ReadoutTable(props: {
  defs: ScalarDef[];
  values: Record<string, number>;
  pinned?: boolean;
}): React.ReactElement {
  const { defs, values, pinned } = props;
  const rows = defs.filter((d) => d.readout !== false);

  return (
    <table className={pinned ? 'pv-readouts pv-readouts--pinned' : 'pv-readouts'}>
      <tbody>
        {rows.map((def) => {
          const value = values[def.key];
          const formatted = formatQuantity({
            value: value ?? NaN,
            dim: def.unit ?? DIMENSIONLESS,
          });
          return (
            <tr key={def.key}>
              <td className="pv-readouts__label">
                {def.symbol ? <MathSpan latex={def.symbol} /> : def.label}
              </td>
              <td className="pv-readouts__value">{formatted}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
