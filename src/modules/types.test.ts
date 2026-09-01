import { describe, it, expect } from 'vitest';
import { MODULE_CONTRACT_VERSION } from './types';

/**
 * MODULE_CONTRACT_VERSION has no other CI guard — its own doc comment
 * admits "a bump is a signal to manually sweep src/modules/*, not
 * something CI checks for you yet." This pins the current value so any
 * bump fails the suite and forces a deliberate diff review (update the
 * expectation here, alongside the ADR the doc comment requires) rather
 * than landing silently in an unrelated PR.
 */
describe('MODULE_CONTRACT_VERSION (drift guard)', () => {
  it('matches the recorded expectation', () => {
    expect(MODULE_CONTRACT_VERSION).toBe(3);
  });
});
