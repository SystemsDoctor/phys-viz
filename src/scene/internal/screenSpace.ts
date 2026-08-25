/**
 * screenSpace — shared helper for glyphs that must hold a constant
 * on-screen size regardless of world distance (arrow heads, point
 * markers) per ARCHITECTURE.md §8: "Cone head sized in SCREEN space,
 * not world space, so short vectors still read as arrows."
 */
import * as THREE from 'three';

/**
 * World units spanned by one screen pixel, at a given distance from an
 * orthographic or perspective camera. For orthographic cameras this is
 * independent of distance; for perspective cameras it grows linearly
 * with distance (the standard "size stays constant in screen space"
 * relation).
 */
export function worldUnitsPerPixel(
  camera: THREE.Camera,
  distance: number,
  rendererHeight: number,
): number {
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const ortho = camera as THREE.OrthographicCamera;
    return (ortho.top - ortho.bottom) / ortho.zoom / rendererHeight;
  }
  const persp = camera as THREE.PerspectiveCamera;
  const verticalFovRad = (persp.fov * Math.PI) / 180;
  return (2 * distance * Math.tan(verticalFovRad / 2)) / rendererHeight / persp.zoom;
}
