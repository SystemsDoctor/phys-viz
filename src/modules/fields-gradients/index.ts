// TODO(M5): implement per ARCHITECTURE.md §20. Placeholder so the module
// registers and the contract suite has something to run against.
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import manifest from './manifest';
import { params, layers, scalars } from './params';

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  create(_ctx: SceneContext) {
    return {
      update(_state: ModuleState) {},
      scalars(_state: ModuleState) {
        return {};
      },
      dispose() {},
    };
  },
};

export default module;
