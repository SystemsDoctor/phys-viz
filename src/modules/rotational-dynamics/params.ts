import type { ParamDef, LayerDef, ScalarDef } from '../types';

// TODO(M5): torque with drawn moment arm, parallel-axis animation, L vs
// omega non-parallel case, precession and nutation, rolling with
// instantaneous axis and cycloid trace, inertia ellipsoid, Dzhanibekov
// effect. See ARCHITECTURE.md §20 (M5).
export const params: ParamDef[] = [];
export const layers: LayerDef[] = [];
export const scalars: ScalarDef[] = [];
