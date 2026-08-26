/**
 * isVisibleInHierarchy — three.js's `Object3D.visible` is local only;
 * setting `group.visible = false` on an ancestor does not flip a
 * descendant's own `.visible` flag, it just skips that subtree at
 * render/raycast time. DOM label overlays (annotate/label.ts) live
 * outside the three.js scene graph, so they can't rely on that
 * render-time skip — they must walk the ancestor chain themselves to
 * know whether the glyph they're attached to is actually showing.
 */
import type * as THREE from 'three';

export function isVisibleInHierarchy(obj: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = obj;
  while (node) {
    if (!node.visible) return false;
    node = node.parent;
  }
  return true;
}
