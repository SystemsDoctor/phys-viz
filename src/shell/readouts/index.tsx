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
import { DIMENSIONLESS } from '@/kernel/units';
import { formatQuantityWithUnit } from '../unitSymbol';
import { MathSpan } from '../MathSpan';
import { Tooltip } from '../Tooltip';

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
          const formatted = formatQuantityWithUnit({
            value: value ?? NaN,
            dim: def.unit ?? DIMENSIONLESS,
          });
          const labelContent = def.symbol ? <MathSpan latex={def.symbol} /> : def.label;
          return (
            <tr key={def.key}>
              <td className="pv-readouts__label">
                {def.description ? (
                  <Tooltip text={def.description}>{labelContent}</Tooltip>
                ) : (
                  labelContent
                )}
              </td>
              <td className="pv-readouts__value">{formatted}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
