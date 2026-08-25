import { describe, it, expect } from 'vitest';
import * as M from './index';

describe('Vec3', () => {
  it('add/sub/scale/negate', () => {
    expect(M.add([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
    expect(M.sub([4, 5, 6], [1, 2, 3])).toEqual([3, 3, 3]);
    expect(M.scale([1, 2, 3], 2)).toEqual([2, 4, 6]);
    expect(M.negate([1, -2, 3])).toEqual([-1, 2, -3]);
  });

  it('in-place variants match allocating variants', () => {
    const out: [number, number, number] = [0, 0, 0];
    M.addInto(out, [1, 2, 3], [4, 5, 6]);
    expect(out).toEqual(M.add([1, 2, 3], [4, 5, 6]));
    M.subInto(out, [4, 5, 6], [1, 2, 3]);
    expect(out).toEqual(M.sub([4, 5, 6], [1, 2, 3]));
    M.scaleInto(out, [1, 2, 3], 3);
    expect(out).toEqual(M.scale([1, 2, 3], 3));
    M.crossInto(out, [1, 0, 0], [0, 1, 0]);
    expect(out).toEqual(M.cross([1, 0, 0], [0, 1, 0]));
    M.negateInto(out, [1, 2, 3]);
    expect(out).toEqual(M.negate([1, 2, 3]));
    M.normalizeInto(out, [3, 0, 0]);
    expect(out).toEqual(M.normalize([3, 0, 0]));
    M.normalizeInto(out, [0, 0, 0]);
    expect(out).toEqual([0, 0, 0]);
    M.lerpInto(out, [0, 0, 0], [10, 10, 10], 0.5);
    expect(out).toEqual(M.lerp([0, 0, 0], [10, 10, 10], 0.5));
  });

  it('cross is right-handed: x cross y = z', () => {
    expect(M.cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(M.cross([0, 1, 0], [0, 0, 1])).toEqual([1, 0, 0]);
    expect(M.cross([0, 0, 1], [1, 0, 0])).toEqual([0, 1, 0]);
  });

  it('dot, norm, lengthSq, distance', () => {
    expect(M.dot([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(M.norm([3, 4, 0])).toBe(5);
    expect(M.lengthSq([3, 4, 0])).toBe(25);
    expect(M.distance([0, 0, 0], [3, 4, 0])).toBe(5);
    expect(M.distanceSq([0, 0, 0], [3, 4, 0])).toBe(25);
  });

  it('normalize handles the zero vector without NaN', () => {
    expect(M.normalize([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('normalize produces a unit vector', () => {
    const n = M.normalize([3, 4, 0]);
    expect(M.norm(n)).toBeCloseTo(1, 12);
  });

  it('lerp at t=0 and t=1 returns the endpoints', () => {
    expect(M.lerp([1, 2, 3], [4, 5, 6], 0)).toEqual([1, 2, 3]);
    expect(M.lerp([1, 2, 3], [4, 5, 6], 1)).toEqual([4, 5, 6]);
  });

  it('approxEquals', () => {
    expect(M.approxEquals([1, 2, 3], [1 + 1e-12, 2, 3])).toBe(true);
    expect(M.approxEquals([1, 2, 3], [1.1, 2, 3])).toBe(false);
  });

  it('copyInto', () => {
    const out: [number, number, number] = [0, 0, 0];
    M.copyInto(out, [1, 2, 3]);
    expect(out).toEqual([1, 2, 3]);
  });

  it('outer product matches componentwise definition', () => {
    const o = M.outer([1, 2, 3], [4, 5, 6]);
    // column-major: col j = a * b[j]
    expect(o).toEqual([4, 8, 12, 5, 10, 15, 6, 12, 18]);
  });
});

describe('Vec2', () => {
  it('add2/sub2/scale2/dot2/cross2', () => {
    expect(M.add2([1, 2], [3, 4])).toEqual([4, 6]);
    expect(M.sub2([3, 4], [1, 2])).toEqual([2, 2]);
    expect(M.scale2([1, 2], 3)).toEqual([3, 6]);
    expect(M.dot2([1, 2], [3, 4])).toBe(11);
    expect(M.cross2([1, 0], [0, 1])).toBe(1);
  });

  it('in-place variants match allocating variants', () => {
    const out: [number, number] = [0, 0];
    M.addInto2(out, [1, 2], [3, 4]);
    expect(out).toEqual(M.add2([1, 2], [3, 4]));
    M.subInto2(out, [3, 4], [1, 2]);
    expect(out).toEqual(M.sub2([3, 4], [1, 2]));
    M.scaleInto2(out, [1, 2], 5);
    expect(out).toEqual(M.scale2([1, 2], 5));
    M.normalizeInto2(out, [3, 4]);
    expect(out).toEqual(M.normalize2([3, 4]));
    M.normalizeInto2(out, [0, 0]);
    expect(out).toEqual([0, 0]);
  });

  it('norm2/normalize2 handles zero vector', () => {
    expect(M.norm2([3, 4])).toBe(5);
    expect(M.normalize2([0, 0])).toEqual([0, 0]);
  });
});

describe('Mat3', () => {
  it('identity3 multiplied by anything returns that thing', () => {
    const m: M.Mat3 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(M.multiplyMat3(M.identity3(), m)).toEqual(m);
    expect(M.multiplyMat3(m, M.identity3())).toEqual(m);
  });

  it('fromColumns3 round-trips through transformMat3', () => {
    const m = M.fromColumns3([1, 0, 0], [0, 2, 0], [0, 0, 3]);
    expect(M.transformMat3(m, [1, 1, 1])).toEqual([1, 2, 3]);
  });

  it('transpose is its own inverse operation', () => {
    const m: M.Mat3 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(M.transposeMat3(M.transposeMat3(m))).toEqual(m);
  });

  it('determinant of identity is 1, of a singular matrix is 0', () => {
    expect(M.determinantMat3(M.identity3())).toBe(1);
    expect(M.determinantMat3([1, 2, 3, 2, 4, 6, 1, 1, 1])).toBeCloseTo(0, 9);
  });

  it('invertMat3 undoes a scaling matrix', () => {
    const m = M.fromColumns3([2, 0, 0], [0, 4, 0], [0, 0, 5]);
    const inv = M.invertMat3(m);
    expect(inv).not.toBeNull();
    const product = M.multiplyMat3(m, inv as M.Mat3);
    for (let i = 0; i < 9; i++) expect(product[i]).toBeCloseTo(M.identity3()[i], 9);
  });

  it('invertMat3 of a rotation matrix equals its transpose (orthogonal)', () => {
    const q = M.fromAxisAngle([0, 0, 1], Math.PI / 3);
    const r = M.toMatrix(q);
    const inv = M.invertMat3(r) as M.Mat3;
    const t = M.transposeMat3(r);
    for (let i = 0; i < 9; i++) expect(inv[i]).toBeCloseTo(t[i], 9);
  });

  it('invertMat3 returns null for a singular matrix', () => {
    expect(M.invertMat3([1, 2, 3, 2, 4, 6, 1, 1, 1])).toBeNull();
  });
});

describe('Mat4', () => {
  it('identity4 multiplied by anything returns that thing', () => {
    const m = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    expect(M.multiplyMat4(M.identity4(), m)).toEqual(m);
    expect(M.multiplyMat4(m, M.identity4())).toEqual(m);
  });

  it('transpose is its own inverse operation', () => {
    const m = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    expect(M.transposeMat4(M.transposeMat4(m))).toEqual(m);
  });

  it('invertMat4 undoes a translation+scale matrix', () => {
    // column-major: columns are basis vectors then translation
    const m = [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 5, 6, 7, 1];
    const inv = M.invertMat4(m);
    expect(inv).not.toBeNull();
    const product = M.multiplyMat4(m, inv as M.Mat4);
    const id = M.identity4();
    for (let i = 0; i < 16; i++) expect(product[i]).toBeCloseTo(id[i], 9);
  });

  it('invertMat4 returns null for a singular matrix', () => {
    const singular = [1, 2, 3, 4, 2, 4, 6, 8, 0, 0, 1, 0, 0, 0, 0, 1];
    expect(M.invertMat4(singular)).toBeNull();
  });

  it('transformPoint4 applies translation, transformVector4 does not', () => {
    const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 6, 7, 1];
    expect(M.transformPoint4(m, [1, 1, 1])).toEqual([6, 7, 8]);
    expect(M.transformVector4(m, [1, 1, 1])).toEqual([1, 1, 1]);
  });

  it('transformPoint4 perspective-divides when w != 1', () => {
    // row 3 (w-row) reads back the input's z, so w = p[2].
    const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0];
    expect(M.transformPoint4(m, [1, 1, 2])).toEqual([0.5, 0.5, 1]);
  });
});

describe('Quat', () => {
  it('identityQuat rotates nothing', () => {
    expect(M.rotateVec3(M.identityQuat(), [1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('fromAxisAngle + rotateVec3: 90deg about z sends x to y', () => {
    const q = M.fromAxisAngle([0, 0, 1], Math.PI / 2);
    const v = M.rotateVec3(q, [1, 0, 0]);
    expect(v[0]).toBeCloseTo(0, 9);
    expect(v[1]).toBeCloseTo(1, 9);
    expect(v[2]).toBeCloseTo(0, 9);
  });

  it('fromAxisAngle normalizes a non-unit axis', () => {
    const q = M.fromAxisAngle([0, 0, 5], Math.PI / 2);
    const v = M.rotateVec3(q, [1, 0, 0]);
    expect(v[1]).toBeCloseTo(1, 9);
  });

  it('multiplyQuat composes: rotate by b then a equals rotate by a*b', () => {
    const a = M.fromAxisAngle([0, 0, 1], Math.PI / 4);
    const b = M.fromAxisAngle([1, 0, 0], Math.PI / 3);
    const composed = M.multiplyQuat(a, b);
    const v: M.Vec3 = [1, 1, 1];
    const viaComposed = M.rotateVec3(composed, v);
    const viaSequential = M.rotateVec3(a, M.rotateVec3(b, v));
    expect(viaComposed[0]).toBeCloseTo(viaSequential[0], 9);
    expect(viaComposed[1]).toBeCloseTo(viaSequential[1], 9);
    expect(viaComposed[2]).toBeCloseTo(viaSequential[2], 9);
  });

  it('conjugate and inverse agree for a unit quaternion', () => {
    const q = M.fromAxisAngle([1, 2, 3], 1.23);
    const inv = M.inverseQuat(q);
    const conj = M.conjugate(q);
    for (let i = 0; i < 4; i++) expect(inv[i]).toBeCloseTo(conj[i], 9);
  });

  it('a quaternion composed with its inverse is the identity rotation', () => {
    const q = M.fromAxisAngle([1, 2, 3], 1.23);
    const roundTrip = M.multiplyQuat(M.inverseQuat(q), q);
    const v: M.Vec3 = [1, 0, 0];
    const r = M.rotateVec3(roundTrip, v);
    expect(r[0]).toBeCloseTo(v[0], 9);
    expect(r[1]).toBeCloseTo(v[1], 9);
    expect(r[2]).toBeCloseTo(v[2], 9);
  });

  it('toMatrix/fromMatrix round-trip', () => {
    const q = M.normalizeQuat(M.fromAxisAngle([1, 2, 3], 0.7));
    const m = M.toMatrix(q);
    const q2 = M.fromMatrix(m);
    // q and q2 may differ by an overall sign (same rotation) — compare via dot.
    expect(Math.abs(M.dotQuat(q, q2))).toBeCloseTo(1, 9);
  });

  it('fromMatrix round-trips a 180deg rotation about each axis (exercises every trace<=0 branch)', () => {
    for (const axis of [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as M.Vec3[]) {
      const q = M.fromAxisAngle(axis, Math.PI);
      const q2 = M.fromMatrix(M.toMatrix(q));
      expect(Math.abs(M.dotQuat(q, q2))).toBeCloseTo(1, 9);
    }
  });

  it('toMatrix produces the same rotation as rotateVec3', () => {
    const q = M.fromAxisAngle([0.3, -0.5, 0.8], 1.1);
    const m = M.toMatrix(q);
    const v: M.Vec3 = [1, -2, 3];
    const viaMatrix = M.transformMat3(m, v);
    const viaQuat = M.rotateVec3(q, v);
    expect(viaMatrix[0]).toBeCloseTo(viaQuat[0], 9);
    expect(viaMatrix[1]).toBeCloseTo(viaQuat[1], 9);
    expect(viaMatrix[2]).toBeCloseTo(viaQuat[2], 9);
  });

  it('slerp at t=0 and t=1 returns the endpoints (up to sign)', () => {
    const a = M.fromAxisAngle([0, 0, 1], 0.2);
    const b = M.fromAxisAngle([0, 0, 1], 1.5);
    const s0 = M.slerp(a, b, 0);
    const s1 = M.slerp(a, b, 1);
    expect(Math.abs(M.dotQuat(s0, a))).toBeCloseTo(1, 9);
    expect(Math.abs(M.dotQuat(s1, b))).toBeCloseTo(1, 9);
  });

  it('slerp at t=0.5 is the halfway rotation angle', () => {
    const a = M.fromAxisAngle([0, 0, 1], 0);
    const b = M.fromAxisAngle([0, 0, 1], Math.PI / 2);
    const mid = M.slerp(a, b, 0.5);
    const v = M.rotateVec3(mid, [1, 0, 0]);
    // halfway to a 90deg rotation about z is 45deg
    expect(v[0]).toBeCloseTo(Math.SQRT1_2, 9);
    expect(v[1]).toBeCloseTo(Math.SQRT1_2, 9);
  });

  it('slerp takes the short path when the dot product is negative', () => {
    const a = M.fromAxisAngle([0, 0, 1], 0);
    const negB: M.Quat = [-0, -0, -Math.sin(0.1), -Math.cos(0.1)]; // same rotation as angle 0.2, negated
    const mid = M.slerp(a, negB, 0.5);
    const v = M.rotateVec3(mid, [1, 0, 0]);
    // should be the short way (angle 0.1), not the long way (~2pi - 0.1)
    expect(v[1]).toBeGreaterThan(0);
  });

  it('slerp handles nearly-identical quaternions without NaN', () => {
    const a = M.fromAxisAngle([0, 0, 1], 0.5);
    const b = M.fromAxisAngle([0, 0, 1], 0.5 + 1e-10);
    const mid = M.slerp(a, b, 0.5);
    expect(Number.isNaN(mid[0])).toBe(false);
    expect(Number.isNaN(mid[3])).toBe(false);
  });
});

describe('eigenSymmetric3', () => {
  it('a diagonal matrix returns its own diagonal as eigenvalues, ascending', () => {
    const { values } = M.eigenSymmetric3([3, 0, 0, 0, 1, 0, 0, 0, 2]);
    expect(values[0]).toBeCloseTo(1, 9);
    expect(values[1]).toBeCloseTo(2, 9);
    expect(values[2]).toBeCloseTo(3, 9);
  });

  it('reconstructs M from V * diag(values) * V^T for a non-diagonal matrix', () => {
    const m: M.Mat3 = [4, 1, 2, 1, 3, 0.5, 2, 0.5, 5];
    const { values, vectors } = M.eigenSymmetric3(m);
    const V = M.fromColumns3(vectors[0], vectors[1], vectors[2]);
    const D: M.Mat3 = [values[0], 0, 0, 0, values[1], 0, 0, 0, values[2]];
    const reconstructed = M.multiplyMat3(M.multiplyMat3(V, D), M.transposeMat3(V));
    for (let i = 0; i < 9; i++) expect(reconstructed[i]).toBeCloseTo(m[i], 6);
  });

  it('eigenvectors are unit length and mutually orthogonal', () => {
    const m: M.Mat3 = [4, 1, 2, 1, 3, 0.5, 2, 0.5, 5];
    const { vectors } = M.eigenSymmetric3(m);
    for (const v of vectors) expect(M.norm(v)).toBeCloseTo(1, 9);
    expect(M.dot(vectors[0], vectors[1])).toBeCloseTo(0, 9);
    expect(M.dot(vectors[0], vectors[2])).toBeCloseTo(0, 9);
    expect(M.dot(vectors[1], vectors[2])).toBeCloseTo(0, 9);
  });
});

describe('tmp scratch pool', () => {
  it('tmp.v3() reuses pre-allocated storage (identity after a full ring cycle)', () => {
    const first = M.tmp.v3();
    let last: [number, number, number] = first;
    for (let i = 0; i < 63; i++) last = M.tmp.v3();
    const wrapped = M.tmp.v3();
    expect(wrapped).toBe(first);
    expect(last).not.toBe(first);
  });

  it('tmp.v2() reuses pre-allocated storage independently of tmp.v3()', () => {
    const first = M.tmp.v2();
    for (let i = 0; i < 63; i++) M.tmp.v2();
    const wrapped = M.tmp.v2();
    expect(wrapped).toBe(first);
  });

  it('writing into a tmp.v3() slot works like any mutable array', () => {
    const v = M.tmp.v3();
    v[0] = 42;
    expect(v[0]).toBe(42);
  });
});
