/**
 * Type-level assertion that MockSceneContext mirrors the real
 * SceneContext exactly (ARCHITECTURE.md §20's M2 acceptance criterion).
 *
 * Checked only by `tsc -b` (`npm run typecheck`, the first step of
 * `ci.yml`) — NOT vitest. Vitest's transform is esbuild, which does not
 * type-check, so a file that only fails at the type level would pass
 * `vitest run` silently. This file is deliberately named without a
 * `.test.ts`/`.spec.ts` suffix so it's excluded from vitest's glob, but
 * `tsconfig.json`'s `include: ["src", "tests"]` still covers it, so it
 * participates in every typecheck/build run with zero extra wiring.
 *
 * If a glyph/method is added to SceneContext and forgotten in
 * MockSceneContext (or vice versa), `_mirrorCheck`'s assignment below
 * fails to compile — that failure IS the test.
 */
import type { SceneContext } from '@/scene/SceneContext';
import type { createMockSceneContext, MockSceneContextTestSurface } from './MockSceneContext';

type MockApi = Omit<ReturnType<typeof createMockSceneContext>, keyof MockSceneContextTestSurface>;

// The standard "distributive conditional type" equality check — unlike a
// naive mutual `extends`, this correctly rejects excess-property cases
// in either direction rather than treating a supertype/subtype pair as
// interchangeable.
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const _mirrorCheck: IsEqual<SceneContext, MockApi> = true;
void _mirrorCheck;
