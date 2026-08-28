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

  it('goTo leaves the target untouched by default, even for a named preset', () => {
    controller.setState({ theta: 0, phi: 0, radius: 6, target: [4, 5, 6], projection: 'ortho' });
    controller.goTo('+x', 0);
    expect(controller.getState().target).toEqual([4, 5, 6]);
  });

  it('goTo with recenterTarget resets a panned-away target to the origin (Recenter view, ADR 0012)', () => {
    controller.setState({ theta: 0, phi: 0, radius: 6, target: [4, 5, 6], projection: 'ortho' });
    controller.goTo('+x', 0, undefined, true);
    expect(controller.getState().target).toEqual([0, 0, 0]);
  });

  it('setLockedToPlane does not throw and can be toggled back', () => {
    expect(() => controller.setLockedToPlane(true)).not.toThrow();
    expect(() => controller.setLockedToPlane(false)).not.toThrow();
  });

  it('onChange fires during a goTo tween and can be unsubscribed', () => {
    let calls = 0;
    const unsubscribe = controller.onChange(() => calls++);
    controller.goTo('+x', 0); // reducedMotion:true forces instant, but onDone path still runs
    expect(calls).toBeGreaterThan(0);
    unsubscribe();
    const before = calls;
    controller.goTo('+y', 0);
    expect(calls).toBe(before);
  });

  it('dispose does not throw', () => {
    expect(() => controller.dispose()).not.toThrow();
  });

  // ADR 0012: "Recenter" shifts the rendered frame so content centers in
  // the VISIBLE pane (canvas minus the overlay panel), not the full
  // canvas — via THREE's setViewOffset "lens shift" rather than moving
  // the camera/target.
  describe('setPaneOffset (ADR 0012)', () => {
    it('applies a view offset of half the occluded width, centered on the active camera', () => {
      controller.resize(1000, 600);
      controller.setPaneOffset(1000, 600, 340);
      const view = (controller.object as THREE.OrthographicCamera).view;
      expect(view?.enabled).toBe(true);
      expect(view?.offsetX).toBeCloseTo(170, 6); // 340 / 2
      expect(view?.offsetY).toBe(0);
      expect(view?.fullWidth).toBe(1000);
      expect(view?.fullHeight).toBe(600);
    });

    it('a zero or negative occluded width clears any existing offset', () => {
      controller.resize(1000, 600);
      controller.setPaneOffset(1000, 600, 340);
      controller.setPaneOffset(1000, 600, 0);
      const view = (controller.object as THREE.OrthographicCamera).view;
      expect(view?.enabled).toBe(false);
    });

    it('applies to both projections, so switching after the fact stays centered', () => {
      controller.resize(1000, 600);
      controller.setPaneOffset(1000, 600, 340);
      controller.setProjection('persp');
      const perspView = (controller.object as THREE.PerspectiveCamera).view;
      expect(perspView?.enabled).toBe(true);
      expect(perspView?.offsetX).toBeCloseTo(170, 6);
    });

    it('notifies onChange listeners (so Viewport.renderOnDemand marks a frame dirty)', () => {
      let calls = 0;
      controller.onChange(() => calls++);
      controller.setPaneOffset(1000, 600, 340);
      expect(calls).toBeGreaterThan(0);
    });
  });
});
