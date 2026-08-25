/**
 * Throwaway rotatable-cube demo for the M0 acceptance criterion
 * (ARCHITECTURE.md §20 M0: "a rotatable cube is live"). This is NOT
 * the scene substrate — Viewport/camera/glyphs are all still M2 stubs.
 * M2's demo scene (M2-19) replaces this file wholesale once that
 * substrate exists.
 *
 * Lives in src/scene/ because scene/ is the only layer allowed to
 * import `three` (§6); src/shell/App.tsx only mounts it onto a canvas
 * it owns, with no `three` import of its own.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function mountDemoCube(canvas: HTMLCanvasElement): () => void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeceef2);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(2.5, 2, 3);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x0072b2 }),
  );
  scene.add(cube);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  let frameId = 0;
  function tick() {
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(tick);
  }
  frameId = requestAnimationFrame(tick);

  return function dispose() {
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    controls.dispose();
    cube.geometry.dispose();
    (cube.material as THREE.Material).dispose();
    renderer.dispose();
  };
}
