import { describe, it, expect } from 'vitest';
import { compileExpr, isExprError } from './index';
import type { CompiledExpr } from './index';

function compileOk(source: string, vars: string[] = []): CompiledExpr {
  const result = compileExpr(source, vars);
  if (isExprError(result)) {
    throw new Error(`expected '${source}' to compile, got error: ${result.message}`);
  }
  return result;
}

describe('numbers and arithmetic', () => {
  it('evaluates a bare number', () => {
    expect(compileOk('42')({})).toBe(42);
  });

  it('evaluates decimals', () => {
    expect(compileOk('3.14')({})).toBeCloseTo(3.14, 9);
  });

  it('evaluates scientific notation', () => {
    expect(compileOk('1e3')({})).toBe(1000);
    expect(compileOk('1.5e-2')({})).toBeCloseTo(0.015, 9);
  });

  it('treats a trailing "e" with no exponent digits as a separate identifier, not part of the number', () => {
    // "5e" backtracks the tokenizer to just "5", then "e" is its own
    // (here, unknown/unexpected) token — never silently misparsed.
    expect(isExprError(compileExpr('5e', []))).toBe(true);
  });

  it('adds, subtracts, multiplies, divides', () => {
    expect(compileOk('2 + 3')({})).toBe(5);
    expect(compileOk('5 - 2')({})).toBe(3);
    expect(compileOk('4 * 5')({})).toBe(20);
    expect(compileOk('10 / 4')({})).toBe(2.5);
  });

  it('respects standard operator precedence', () => {
    expect(compileOk('2 + 3 * 4')({})).toBe(14);
    expect(compileOk('(2 + 3) * 4')({})).toBe(20);
  });

  it('is left-associative for + and -', () => {
    expect(compileOk('10 - 3 - 2')({})).toBe(5);
  });

  it('handles exponentiation right-associatively', () => {
    // 2^3^2 = 2^(3^2) = 2^9 = 512, not (2^3)^2 = 64
    expect(compileOk('2^3^2')({})).toBe(512);
  });

  it('handles unary minus binding looser than exponentiation', () => {
    expect(compileOk('-2^2')({})).toBe(-4);
  });

  it('handles a negative exponent', () => {
    expect(compileOk('2^-2')({})).toBeCloseTo(0.25, 9);
  });

  it('handles a leading unary plus as a no-op', () => {
    expect(compileOk('+5')({})).toBe(5);
  });

  it('handles nested parentheses', () => {
    expect(compileOk('((1 + 2) * (3 + 4))')({})).toBe(21);
  });
});

describe('variables', () => {
  it('reads a declared variable', () => {
    expect(compileOk('x', ['x'])({ x: 7 })).toBe(7);
  });

  it('combines multiple variables', () => {
    const f = compileOk('x * y + 1', ['x', 'y']);
    expect(f({ x: 2, y: 3 })).toBe(7);
  });

  it('rejects an undeclared variable with a typed error', () => {
    const result = compileExpr('x + 1', []);
    expect(isExprError(result)).toBe(true);
    if (isExprError(result)) {
      expect(result.message).toContain('x');
      expect(result.offset).toBe(0);
    }
  });
});

describe('functions', () => {
  it('evaluates every whitelisted unary function', () => {
    expect(compileOk('sin(0)')({})).toBeCloseTo(0, 9);
    expect(compileOk('cos(0)')({})).toBeCloseTo(1, 9);
    expect(compileOk('tan(0)')({})).toBeCloseTo(0, 9);
    expect(compileOk('asin(1)')({})).toBeCloseTo(Math.PI / 2, 9);
    expect(compileOk('acos(1)')({})).toBeCloseTo(0, 9);
    expect(compileOk('atan(1)')({})).toBeCloseTo(Math.PI / 4, 9);
    expect(compileOk('exp(0)')({})).toBeCloseTo(1, 9);
    expect(compileOk('ln(1)')({})).toBeCloseTo(0, 9);
    expect(compileOk('sqrt(9)')({})).toBeCloseTo(3, 9);
    expect(compileOk('abs(-4)')({})).toBe(4);
    expect(compileOk('sign(-4)')({})).toBe(-1);
    expect(compileOk('floor(4.7)')({})).toBe(4);
  });

  it('evaluates atan2 (binary)', () => {
    expect(compileOk('atan2(1, 1)')({})).toBeCloseTo(Math.PI / 4, 9);
  });

  it('evaluates min/max with 2 or more args', () => {
    expect(compileOk('min(3, 1, 2)')({})).toBe(1);
    expect(compileOk('max(3, 1, 2)')({})).toBe(3);
    expect(compileOk('min(3, 1)')({})).toBe(1);
  });

  it('accepts an expression as a function argument', () => {
    expect(compileOk('sqrt(2*2 + 3*3)')({})).toBeCloseTo(Math.sqrt(13), 9);
  });

  it('accepts variables inside function calls', () => {
    expect(compileOk('sin(x)', ['x'])({ x: 0 })).toBeCloseTo(0, 9);
  });

  it('rejects an unknown function with a typed error', () => {
    const result = compileExpr('foo(1)', []);
    expect(isExprError(result)).toBe(true);
    if (isExprError(result)) expect(result.message).toContain('foo');
  });

  it('rejects a unary function called with the wrong number of arguments', () => {
    const result = compileExpr('sin(1, 2)', []);
    expect(isExprError(result)).toBe(true);
  });

  it('rejects atan2 called with one argument', () => {
    const result = compileExpr('atan2(1)', []);
    expect(isExprError(result)).toBe(true);
  });

  it('rejects min called with only one argument', () => {
    const result = compileExpr('min(1)', []);
    expect(isExprError(result)).toBe(true);
  });
});

describe('rejected input (never eval, never new Function)', () => {
  it('rejects an unexpected character', () => {
    const result = compileExpr('1 & 2', []);
    expect(isExprError(result)).toBe(true);
    if (isExprError(result)) expect(result.offset).toBe(2);
  });

  it('rejects a missing closing parenthesis', () => {
    expect(isExprError(compileExpr('(1 + 2', []))).toBe(true);
  });

  it('rejects an empty expression', () => {
    expect(isExprError(compileExpr('', []))).toBe(true);
  });

  it('rejects trailing garbage after a valid expression', () => {
    const result = compileExpr('1 + 2 3', []);
    expect(isExprError(result)).toBe(true);
    if (isExprError(result)) expect(result.offset).toBe(6);
  });

  it('rejects implicit multiplication', () => {
    expect(isExprError(compileExpr('2x', ['x']))).toBe(true);
  });

  it('reports a character offset that points at the actual problem', () => {
    const result = compileExpr('1 + xyz', []);
    expect(isExprError(result)).toBe(true);
    if (isExprError(result)) expect(result.offset).toBe(4);
  });
});

describe('isExprError', () => {
  it('distinguishes a compiled function from an error object', () => {
    expect(isExprError(compileExpr('1', []))).toBe(false);
    expect(isExprError(compileExpr('1 +', []))).toBe(true);
  });
});
