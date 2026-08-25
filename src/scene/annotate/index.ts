/**
 * scene/annotate — KaTeX billboards, dimension lines, graticule labels.
 * See ARCHITECTURE.md §8.
 *
 * `label({ latex, anchor, offset })` renders once to an HTML element via
 * KaTeX and is positioned by projecting the anchor each frame. HTML
 * overlay rather than a texture: crisp at any zoom, selectable, and
 * accessible to screen readers (§16).
 *
 * Also: dimension lines, projection drop-lines (dashed), and leader
 * lines.
 *
 * TODO(M2): implement.
 */

export interface LabelProps {
  latex: string;
  anchor: [number, number, number];
  offset?: [number, number];
}

export interface LabelHandle {
  set(props: Partial<LabelProps>): void;
  visible(show: boolean): void;
  dispose(): void;
}

export function createLabel(_props: LabelProps): LabelHandle {
  throw new Error('scene/annotate: not implemented (see M2 in ARCHITECTURE.md §20)');
}

export interface DimensionLineProps {
  from: [number, number, number];
  to: [number, number, number];
  offset?: number;
  label?: string;
}

export function createDimensionLine(_props: DimensionLineProps): LabelHandle {
  throw new Error('scene/annotate: not implemented (see M2 in ARCHITECTURE.md §20)');
}
