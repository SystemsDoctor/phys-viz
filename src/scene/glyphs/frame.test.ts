import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createFrame } from './frame';
import { createFakeHost } from '../internal/fakeHost.test-utils';

describe('createFrame', () => {
  it('attaches to the scene root when no group or parent is given', () => {
    const host = createFakeHost();
    const handle = createFrame({ origin: [0, 0, 0], orientation: [0, 0, 0, 1] }, host);
    expect(host.root.children.length).toBe(1);
    handle.dispose();
  });

  it('applies origin, orientation, and scale', () => {
    const host = createFakeHost();
    const handle = createFrame({ origin: [1, 2, 3], orientation: [0, 0, 0, 1], scale: 2 }, host);
    const group = host.root.children[0] as THREE.Group;
    expect(group.position.toArray()).toEqual([1, 2, 3]);
    expect(group.scale.toArray()).toEqual([2, 2, 2]);
    handle.dispose();
  });

  it('nests a child frame under its parent frame in the real scene graph', () => {
    const host = createFakeHost();
    const parentHandle = createFrame({ origin: [5, 0, 0], orientation: [0, 0, 0, 1] }, host);
    const parentGroup = host.root.children[0] as THREE.Group;
    const childCountBefore = parentGroup.children.length; // 3 own axis lines

    const childHandle = createFrame(
      { origin: [0, 1, 0], orientation: [0, 0, 0, 1], parent: parentHandle },
      host,
    );
    // the nested frame's group becomes one more child of the parent's own group...
    expect(parentGroup.children.length).toBe(childCountBefore + 1);
    // ...and is NOT a direct child of the scene root.
    expect(host.root.children.length).toBe(1);

    childHandle.dispose();
    parentHandle.dispose();
  });

  it('re-parents when the parent prop changes via set()', () => {
    const host = createFakeHost();
    const parentA = createFrame({ origin: [0, 0, 0], orientation: [0, 0, 0, 1] }, host);
    const parentB = createFrame({ origin: [1, 0, 0], orientation: [0, 0, 0, 1] }, host);
    const groupA = host.root.children[0] as THREE.Group;
    const groupB = host.root.children[1] as THREE.Group;
    const ownAxisCount = groupA.children.length; // 3, same for both frames

    const child = createFrame(
      { origin: [0, 0, 0], orientation: [0, 0, 0, 1], parent: parentA },
      host,
    );
    expect(groupA.children.length).toBe(ownAxisCount + 1);

    child.set({ parent: parentB });
    expect(groupA.children.length).toBe(ownAxisCount);
    expect(groupB.children.length).toBe(ownAxisCount + 1);

    child.dispose();
    parentA.dispose();
    parentB.dispose();
  });

  it('dispose removes the group and does not throw if disposed after its parent', () => {
    const host = createFakeHost();
    const parent = createFrame({ origin: [0, 0, 0], orientation: [0, 0, 0, 1] }, host);
    const child = createFrame({ origin: [0, 0, 0], orientation: [0, 0, 0, 1], parent }, host);
    expect(() => {
      parent.dispose();
      child.dispose();
    }).not.toThrow();
  });
});
