/**
 * Every glyph factory in scene/glyphs/ returns a Handle. Handles are
 * RETAINED and MUTATED; a module's create() builds them once, and its
 * update() calls `.set()` on them every frame. Never rebuild geometry
 * per frame (ARCHITECTURE.md §3, principle 3; §8).
 */
export interface Handle<Props> {
  set(props: Partial<Props>): void;
  visible(show: boolean): void;
  dispose(): void;
}
