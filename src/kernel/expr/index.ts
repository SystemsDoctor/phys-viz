/**
 * kernel/expr — Layer 0 (pure). See ARCHITECTURE.md §7.
 *
 * A small recursive-descent parser over a whitelisted grammar: numbers,
 * named variables, + - * / ^, parentheses, and a fixed function set
 * (sin cos tan asin acos atan atan2 exp ln sqrt abs sign min max floor).
 * Compiles to a closure.
 *
 * NO `eval`, NO `new Function`. This is user-facing input on a public
 * site (the `expression` param kind and the sandbox module) — see the
 * Visualizer Doctrine §2: "A constrained expression parser ... is the
 * ceiling. We are not building a CAS."
 *
 * Returns typed errors with character offsets so the input field can
 * underline the problem.
 *
 * TODO(M1): implement per ARCHITECTURE.md §7.
 */

export interface ExprError {
  message: string;
  offset: number;
}

export type CompiledExpr = (vars: Record<string, number>) => number;

export function compileExpr(_source: string, _allowedVars: string[]): CompiledExpr | ExprError {
  throw new Error('kernel/expr: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function isExprError(_result: CompiledExpr | ExprError): _result is ExprError {
  throw new Error('kernel/expr: not implemented (see M1 in ARCHITECTURE.md §20)');
}
