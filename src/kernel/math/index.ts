/**
 * kernel/math — Layer 0 (pure). See ARCHITECTURE.md §7.
 *
 * Vec2, Vec3, Mat3, Mat4, Quat as plain typed structures with free
 * functions (add, cross, normalize, ...). Every function that returns a
 * Vec2/Vec3/Mat3/Mat4/Quat has an allocating form and, where the result is
 * plausibly built in a per-frame hot path, an in-place `xInto(out, ...)`
 * form (`addInto(out, a, b)`). Functions that return a plain number
 * (dot, norm, distance, determinant, ...) never allocate a result, so
 * they have no `Into` counterpart.
 *
 * A scratch pool (`tmp.v3()`) of pre-allocated temporaries lives here so
 * hot paths (the render loop, `update()`) can allocate nothing — see the
 * Performance budget in §17 ("Allocations in the animation loop: zero").
 *
 * Orientation is ALWAYS represented as a quaternion, never Euler angles —
 * rigid-body and gyroscope modules will gimbal-lock otherwise (§7).
 *
 * Matrices are COLUMN-MAJOR (index = col * n + row), matching three.js —
 * Mat3 has 9 elements, Mat4 has 16.
 */

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Mat4 = readonly number[]; // 16 elements, column-major
export type Quat = readonly [number, number, number, number]; // x, y, z, w

/* --------------------------------- Vec3 --------------------------------- */

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function addInto(out: [number, number, number], a: Vec3, b: Vec3): void {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function subInto(out: [number, number, number], a: Vec3, b: Vec3): void {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
}

export function negate(a: Vec3): Vec3 {
  return [-a[0], -a[1], -a[2]];
}

export function negateInto(out: [number, number, number], a: Vec3): void {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function crossInto(out: [number, number, number], a: Vec3, b: Vec3): void {
  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];
  out[0] = x;
  out[1] = y;
  out[2] = z;
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function scaleInto(out: [number, number, number], a: Vec3, s: number): void {
  out[0] = a[0] * s;
  out[1] = a[1] * s;
  out[2] = a[2] * s;
}

export function lengthSq(a: Vec3): number {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}

export function norm(a: Vec3): number {
  return Math.sqrt(lengthSq(a));
}

export function normalize(a: Vec3): Vec3 {
  const len = norm(a);
  if (len === 0) return [0, 0, 0];
  return [a[0] / len, a[1] / len, a[2] / len];
}

export function normalizeInto(out: [number, number, number], a: Vec3): void {
  const len = norm(a);
  if (len === 0) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return;
  }
  out[0] = a[0] / len;
  out[1] = a[1] / len;
  out[2] = a[2] / len;
}

export function distanceSq(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.sqrt(distanceSq(a, b));
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function lerpInto(out: [number, number, number], a: Vec3, b: Vec3, t: number): void {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
}

export function copyInto(out: [number, number, number], a: Vec3): void {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
}

/** Componentwise approximate equality, for tests and convergence checks. */
export function approxEquals(a: Vec3, b: Vec3, eps = 1e-9): boolean {
  return (
    Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps && Math.abs(a[2] - b[2]) <= eps
  );
}

/** Outer product a ⊗ b, as a column-major Mat3 (used by e.g. the parallel-axis theorem). */
export function outer(a: Vec3, b: Vec3): Mat3 {
  // column-major: column j is a * b[j]
  return [
    a[0] * b[0],
    a[1] * b[0],
    a[2] * b[0],
    a[0] * b[1],
    a[1] * b[1],
    a[2] * b[1],
    a[0] * b[2],
    a[1] * b[2],
    a[2] * b[2],
  ];
}

/* --------------------------------- Vec2 --------------------------------- */

export function add2(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]];
}

export function addInto2(out: [number, number], a: Vec2, b: Vec2): void {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
}

export function sub2(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}

export function subInto2(out: [number, number], a: Vec2, b: Vec2): void {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
}

export function scale2(a: Vec2, s: number): Vec2 {
  return [a[0] * s, a[1] * s];
}

export function scaleInto2(out: [number, number], a: Vec2, s: number): void {
  out[0] = a[0] * s;
  out[1] = a[1] * s;
}

export function dot2(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}

/** Scalar "2D cross product" — the z-component of the embedded 3D cross. */
export function cross2(a: Vec2, b: Vec2): number {
  return a[0] * b[1] - a[1] * b[0];
}

export function lengthSq2(a: Vec2): number {
  return a[0] * a[0] + a[1] * a[1];
}

export function norm2(a: Vec2): number {
  return Math.sqrt(lengthSq2(a));
}

export function normalize2(a: Vec2): Vec2 {
  const len = norm2(a);
  if (len === 0) return [0, 0];
  return [a[0] / len, a[1] / len];
}

export function normalizeInto2(out: [number, number], a: Vec2): void {
  const len = norm2(a);
  if (len === 0) {
    out[0] = 0;
    out[1] = 0;
    return;
  }
  out[0] = a[0] / len;
  out[1] = a[1] / len;
}

/* --------------------------------- Mat3 --------------------------------- */

export function identity3(): Mat3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

export function fromColumns3(c0: Vec3, c1: Vec3, c2: Vec3): Mat3 {
  return [c0[0], c0[1], c0[2], c1[0], c1[1], c1[2], c2[0], c2[1], c2[2]];
}

export function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  const out: number[] = new Array(9);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[k * 3 + row] * b[col * 3 + k];
      }
      out[col * 3 + row] = sum;
    }
  }
  return out as unknown as Mat3;
}

export function transposeMat3(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function determinantMat3(m: Mat3): number {
  const [a, d, g, b, e, h, c, f, i] = m; // columns (a,d,g) (b,e,h) (c,f,i)
  return a * (e * i - h * f) - b * (d * i - g * f) + c * (d * h - g * e);
}

export function invertMat3(m: Mat3): Mat3 | null {
  const [a, d, g, b, e, h, c, f, i] = m;
  const det = a * (e * i - h * f) - b * (d * i - g * f) + c * (d * h - g * e);
  if (Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  // Adjugate (transpose of cofactor matrix), scaled by 1/det, expressed
  // directly in column-major output order.
  return [
    (e * i - f * h) * invDet,
    -(d * i - f * g) * invDet,
    (d * h - e * g) * invDet,
    -(b * i - c * h) * invDet,
    (a * i - c * g) * invDet,
    -(a * h - b * g) * invDet,
    (b * f - c * e) * invDet,
    -(a * f - c * d) * invDet,
    (a * e - b * d) * invDet,
  ];
}

export function transformMat3(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
    m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
    m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
  ];
}

/* --------------------------------- Mat4 --------------------------------- */

export function identity4(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function multiplyMat4(a: Mat4, b: Mat4): Mat4 {
  const out: number[] = new Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

export function transposeMat4(m: Mat4): Mat4 {
  const out: number[] = new Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[row * 4 + col] = m[col * 4 + row];
    }
  }
  return out;
}

/** General 4x4 inverse via Gauss-Jordan elimination with partial pivoting. */
export function invertMat4(m: Mat4): Mat4 | null {
  // Build augmented [A | I] as a 4x8 row-major working array for pivoting
  // clarity (converted back to column-major on return).
  const rows: number[][] = [];
  for (let row = 0; row < 4; row++) {
    const r: number[] = [];
    for (let col = 0; col < 4; col++) r.push(m[col * 4 + row]);
    for (let col = 0; col < 4; col++) r.push(col === row ? 1 : 0);
    rows.push(r);
  }

  for (let pivot = 0; pivot < 4; pivot++) {
    let pivotRow = pivot;
    let maxAbs = Math.abs(rows[pivot][pivot]);
    for (let row = pivot + 1; row < 4; row++) {
      const v = Math.abs(rows[row][pivot]);
      if (v > maxAbs) {
        maxAbs = v;
        pivotRow = row;
      }
    }
    if (maxAbs < 1e-12) return null;
    if (pivotRow !== pivot) {
      const tmpRow = rows[pivot];
      rows[pivot] = rows[pivotRow];
      rows[pivotRow] = tmpRow;
    }
    const pivotVal = rows[pivot][pivot];
    for (let col = 0; col < 8; col++) rows[pivot][col] /= pivotVal;
    for (let row = 0; row < 4; row++) {
      if (row === pivot) continue;
      const factor = rows[row][pivot];
      if (factor === 0) continue;
      for (let col = 0; col < 8; col++) rows[row][col] -= factor * rows[pivot][col];
    }
  }

  const out: number[] = new Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[col * 4 + row] = rows[row][col + 4];
    }
  }
  return out;
}

/** Transform a point (implicit w=1, perspective-divides if w != 1). */
export function transformPoint4(m: Mat4, p: Vec3): Vec3 {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  if (w === 1 || w === 0) return [x, y, z];
  return [x / w, y / w, z / w];
}

/** Transform a direction vector (implicit w=0 — no translation, no divide). */
export function transformVector4(m: Mat4, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2],
  ];
}

/* --------------------------------- Quat --------------------------------- */

export function identityQuat(): Quat {
  return [0, 0, 0, 1];
}

/**
 * Hamilton product a*b: composition such that
 * `rotateVec3(multiplyQuat(a, b), v) === rotateVec3(a, rotateVec3(b, v))`
 * — i.e. b's rotation is applied first, then a's.
 */
export function multiplyQuat(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function conjugate(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function lengthQuat(q: Quat): number {
  return Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
}

export function normalizeQuat(q: Quat): Quat {
  const len = lengthQuat(q);
  if (len === 0) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

/** Inverse (== conjugate for a unit quaternion; general form divides by |q|^2). */
export function inverseQuat(q: Quat): Quat {
  const lenSq = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
  if (lenSq === 0) return [0, 0, 0, 1];
  const invLenSq = 1 / lenSq;
  return [-q[0] * invLenSq, -q[1] * invLenSq, -q[2] * invLenSq, q[3] * invLenSq];
}

export function dotQuat(a: Quat, b: Quat): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

/** Build a rotation quaternion from an axis (need not be pre-normalized) and an angle in radians. */
export function fromAxisAngle(axis: Vec3, angle: number): Quat {
  const a = normalize(axis);
  const half = angle / 2;
  const s = Math.sin(half);
  return [a[0] * s, a[1] * s, a[2] * s, Math.cos(half)];
}

/** Rotation matrix (column-major Mat3) for a quaternion (need not be pre-normalized). */
export function toMatrix(q: Quat): Mat3 {
  const [x, y, z, w] = normalizeQuat(q);
  const xx = x * x,
    xy = x * y,
    xz = x * z,
    xw = x * w;
  const yy = y * y,
    yz = y * z,
    yw = y * w;
  const zz = z * z,
    zw = z * w;
  return [
    1 - 2 * (yy + zz),
    2 * (xy + zw),
    2 * (xz - yw),
    2 * (xy - zw),
    1 - 2 * (xx + zz),
    2 * (yz + xw),
    2 * (xz + yw),
    2 * (yz - xw),
    1 - 2 * (xx + yy),
  ];
}

/** Recover a quaternion from a (proper, orthonormal) rotation matrix — Shepperd's method. */
export function fromMatrix(m: Mat3): Quat {
  const m00 = m[0],
    m10 = m[1],
    m20 = m[2];
  const m01 = m[3],
    m11 = m[4],
    m21 = m[5];
  const m02 = m[6],
    m12 = m[7],
    m22 = m[8];
  const trace = m00 + m11 + m22;

  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }
}

/** Shortest-path spherical interpolation; falls back to normalized lerp for near-zero angle. */
export function slerp(a: Quat, b: Quat, t: number): Quat {
  let [bx, by, bz, bw] = b;
  let cosHalfTheta = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cosHalfTheta < 0) {
    cosHalfTheta = -cosHalfTheta;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  if (cosHalfTheta > 1 - 1e-9) {
    return normalizeQuat([
      a[0] + (bx - a[0]) * t,
      a[1] + (by - a[1]) * t,
      a[2] + (bz - a[2]) * t,
      a[3] + (bw - a[3]) * t,
    ]);
  }
  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sqrt(1 - cosHalfTheta * cosHalfTheta);
  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
  return [
    a[0] * ratioA + bx * ratioB,
    a[1] * ratioA + by * ratioB,
    a[2] * ratioA + bz * ratioB,
    a[3] * ratioA + bw * ratioB,
  ];
}

/** Rotate a vector by a quaternion without building the full matrix (need not be pre-normalized). */
export function rotateVec3(q: Quat, v: Vec3): Vec3 {
  const [qx, qy, qz, qw] = normalizeQuat(q);
  const qxyz: Vec3 = [qx, qy, qz];
  const t = scale(cross(qxyz, v), 2);
  const cross2Term = cross(qxyz, t);
  return [
    v[0] + qw * t[0] + cross2Term[0],
    v[1] + qw * t[1] + cross2Term[1],
    v[2] + qw * t[2] + cross2Term[2],
  ];
}

/* -------------------------- Symmetric eigendecomposition ------------------------- */

export interface EigenSymmetric3 {
  values: [number, number, number];
  vectors: [Vec3, Vec3, Vec3];
}

/**
 * Eigenvalues/eigenvectors of a symmetric 3x3 matrix via cyclic Jacobi
 * rotation. Eigenvectors fall out of the rotation accumulation directly,
 * with no separate (and fiddlier, for repeated roots) recovery step.
 * Returned in ascending eigenvalue order.
 */
export function eigenSymmetric3(m: Mat3, maxSweeps = 50, tol = 1e-12): EigenSymmetric3 {
  // Row-major working copy for readability (this is not a hot-path op).
  const a: number[][] = [
    [m[0], m[3], m[6]],
    [m[1], m[4], m[7]],
    [m[2], m[5], m[8]],
  ];
  const v: number[][] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const pairs: [number, number, number][] = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 2, 0],
  ];

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let offDiagSumSq = 0;
    for (const [p, q] of pairs) offDiagSumSq += a[p][q] * a[p][q];
    if (offDiagSumSq < tol) break;

    for (const [p, q, r] of pairs) {
      const apq = a[p][q];
      if (Math.abs(apq) < 1e-300) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * apq);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;

      a[p][p] -= t * apq;
      a[q][q] += t * apq;
      a[p][q] = 0;
      a[q][p] = 0;

      const arp = a[r][p];
      const arq = a[r][q];
      a[r][p] = c * arp - s * arq;
      a[p][r] = a[r][p];
      a[r][q] = s * arp + c * arq;
      a[q][r] = a[r][q];

      for (let i = 0; i < 3; i++) {
        const vip = v[i][p];
        const viq = v[i][q];
        v[i][p] = c * vip - s * viq;
        v[i][q] = s * vip + c * viq;
      }
    }
  }

  const order = [0, 1, 2].sort((i, j) => a[i][i] - a[j][j]);
  const values: [number, number, number] = [
    a[order[0]][order[0]],
    a[order[1]][order[1]],
    a[order[2]][order[2]],
  ];
  const vectors: [Vec3, Vec3, Vec3] = [
    [v[0][order[0]], v[1][order[0]], v[2][order[0]]],
    [v[0][order[1]], v[1][order[1]], v[2][order[1]]],
    [v[0][order[2]], v[1][order[2]], v[2][order[2]]],
  ];
  return { values, vectors };
}

/* ------------------------------- Scratch pool ------------------------------- */

/**
 * Pre-allocated ring of temporary vectors so hot paths allocate nothing.
 * Usage: `const v = tmp.v3(); v[0] = ...` — do not retain the reference
 * past the current frame/update call.
 *
 * CONTRACT: the ring wraps. A `tmp.v3()` result is only valid until the
 * Nth-next `tmp.v3()` call (N = ring size, 64). Never store a scratch
 * result on `this`, in a closure, or return it from a module's `create()`
 * — copy it into owned storage (`[...v]` or `structuredClone`) first, or
 * callers get silent, hard-to-repro corruption when the ring wraps under
 * them. Module authors: never call `tmp.v3()` inside `create()` and hold
 * the result across `update()` calls. `tmp.v2()` has its own, separate
 * ring — the two never alias each other.
 */
const RING_SIZE = 64;

function makeRing(size: number): [number, number, number][] {
  const ring: [number, number, number][] = [];
  for (let i = 0; i < size; i++) ring.push([0, 0, 0]);
  return ring;
}

function makeRing2(size: number): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i < size; i++) ring.push([0, 0]);
  return ring;
}

const v3Ring = makeRing(RING_SIZE);
const v2Ring = makeRing2(RING_SIZE);
let v3Idx = 0;
let v2Idx = 0;

export const tmp = {
  v2(): [number, number] {
    const v = v2Ring[v2Idx];
    v2Idx = (v2Idx + 1) % RING_SIZE;
    return v;
  },
  v3(): [number, number, number] {
    const v = v3Ring[v3Idx];
    v3Idx = (v3Idx + 1) % RING_SIZE;
    return v;
  },
};
