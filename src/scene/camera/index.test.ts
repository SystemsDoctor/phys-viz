import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createCameraController } from './index';
import type { CameraController } from './index';

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  return canvas;
}

describe('createCameraController', () => {
  let controller: CameraController;

  beforeEach(() => {
    controller = createCameraController({ canvas: makeCanvas(), upAxis: 'y', reducedMotion: true });
  });

  it('defaults to an orthographic camera', () => {
    expect(controller.object).toBeInstanceOf(THREE.OrthographicCamera);
  });

  it('setProjection swaps the active camera object', () => {
    controller.setProjection('persp');
    expect(controller.object).toBeInstanceOf(THREE.PerspectiveCamera);
    controller.setProjection('ortho');
    expect(controller.object).toBeInstanceOf(THREE.OrthographicCamera);
  });

  it('resize updates the perspective aspect ratio', () => {
    controller.setProjection('persp');
    controller.resize(800, 400);
    expect((controller.object as THREE.PerspectiveCamera).aspect).toBeCloseTo(2, 6);
  });

  it('resize updates the orthographic frustum aspect ratio', () => {
    controller.resize(800, 400);
    const ortho = controller.object as THREE.OrthographicCamera;
    expect((ortho.right - ortho.left) / (ortho.top - ortho.bottom)).toBeCloseTo(2, 6);
  });

  it('getState/setState round-trips', () => {
    controller.resize(400, 400);
    controller.goTo('+x', 0);
    const state = controller.getState();
    const controller2 = createCameraController({ canvas: makeCanvas(), reducedMotion: true });
    controller2.resize(400, 400);
    controller2.setState(state);
    const roundTripped = controller2.getState();
    expect(roundTripped.theta).toBeCloseTo(state.theta, 6);
    expect(roundTripped.phi).toBeCloseTo(state.phi, 6);
    expect(roundTripped.radius).toBeCloseTo(state.radius, 6);
    expect(roundTripped.target).toEqual(state.target);
    expect(roundTripped.projection).toBe(state.projection);
  });

  it('goTo +y looks straight down the up axis (phi near 0)', () => {
    controller.goTo('+y', 0);
    const state = controller.getState();
    expect(state.phi).toBeCloseTo(0, 6);
  });

  it('goTo iso is equidistant in angle from all three canonical axes', () => {
    controller.goTo('iso', 0);
    const state = controller.getState();
    // phi for direction (1,1,1) normalized: acos(1/sqrt(3))
    expect(state.phi).toBeCloseTo(Math.acos(1 / Math.sqrt(3)), 6);
    expect(state.theta).toBeCloseTo(Math.PI / 4, 6);
  });

  it('setUpAxis without animation reorients the camera up vector', () => {
    controller.goTo('+y', 0);
    controller.setUpAxis('z', false);
    expect(controller.getUpAxis()).toBe('z');
    const up = controller.object.up;
    expect(up.x).toBeCloseTo(0, 6);
    expect(up.y).toBeCloseTo(0, 6);
    expect(up.z).toBeCloseTo(1, 6);
  });

  it('goTo fit recenters on the given bounds and adjusts radius', () => {
    controller.goTo('fit', 0, { center: [1, 2, 3], radius: 5 });
    const state = controller.getState();
    expect(state.target).toEqual([1, 2, 3]);
    expect(state.radius).toBeCloseTo(11, 6);
  });

  it('setLockedToPlane does not throw and can be toggled back', () => {
    expect(() => controller.setLockedToPlane(true)).not.toThrow();
    expect(() => controller.setLockedToPlane(false)).not.toThrow();
  });

  it('dispose does not throw', () => {
    expect(() => controller.dispose()).not.toThrow();
  });
});
