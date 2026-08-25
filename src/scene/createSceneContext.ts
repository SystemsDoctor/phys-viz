/**
 * createSceneContext — the real SceneContext implementation, wiring
 * every glyph/annotate factory to a SubstrateHost. Consumed only by
 * Viewport; never imported by a module (modules only ever see the
 * `SceneContext` interface, handed to them by the shell in M3).
 */
import type { SceneContext, GroupHandle, DraggableProps, DraggableHandle } from './SceneContext';
import type { SubstrateHost, PickTarget } from './internal/SubstrateHost';
import { getPalette } from './theme';
import { createArrow } from './glyphs/arrow';
import { createCurvedArrow } from './glyphs/curvedArrow';
import { createPath } from './glyphs/path';
import { createPoint } from './glyphs/point';
import { createPatch } from './glyphs/patch';
import { createSurface } from './glyphs/surface';
import { createArc } from './glyphs/arc';
import { createBody } from './glyphs/body';
import { createField } from './glyphs/field';
import { createFrame } from './glyphs/frame';
import { createAxes } from './glyphs/axes';
import { createGraticule } from './glyphs/graticule';
import { createLabel } from './annotate/label';
import { createDimensionLine } from './annotate/dimensionLine';

function createDraggable(props: DraggableProps, host: SubstrateHost): DraggableHandle {
  let active = true;
  let point = props.getPoint;
  let radiusPx = props.radiusPx ?? 14;
  let group = props.group;

  const target: PickTarget = {
    paramKey: props.paramKey,
    getPoint: () => point(),
    radiusPx,
    isVisible: () => {
      if (!active) return false;
      const obj = host.resolveGroup(group);
      return obj.visible;
    },
  };
  const unregister = host.registerPickTarget(target);

  return {
    set(next) {
      if (next.getPoint) point = next.getPoint;
      if (next.radiusPx !== undefined) {
        radiusPx = next.radiusPx;
        target.radiusPx = radiusPx;
      }
      if (next.group !== undefined) group = next.group;
    },
    visible(show) {
      active = show;
    },
    dispose() {
      unregister();
    },
  };
}

export function createSceneContext(host: SubstrateHost): SceneContext {
  return {
    get palette() {
      return getPalette();
    },
    get up() {
      return host.upAxis();
    },

    group(name: string): GroupHandle {
      return { id: name };
    },

    arrow: (props) => createArrow(props, host),
    curvedArrow: (props) => createCurvedArrow(props, host),
    path: (props) => createPath(props, host),
    point: (props) => createPoint(props, host),
    patch: (props) => createPatch(props, host),
    surface: (props) => createSurface(props, host),
    arc: (props) => createArc(props, host),
    body: (props) => createBody(props, host),
    field: (props) => createField(props, host),
    frame: (props) => createFrame(props, host),
    axes: (props) => createAxes(props, host),
    graticule: (props) => createGraticule(props, host),

    label: (props) => createLabel(props, host),
    dimensionLine: (props) => createDimensionLine(props, host),

    draggable: (props) => createDraggable(props, host),
  };
}
