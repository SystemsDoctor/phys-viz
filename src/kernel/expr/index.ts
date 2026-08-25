/**
 * kernel/expr — Layer 0 (pure). See ARCHITECTURE.md §7.
 *
 * A small recursive-descent parser over a whitelisted grammar: numbers,
 * named variables, + - * / ^, parentheses, and a fixed function set
 * (sin cos tan asin acos atan atan2 exp ln sqrt abs sign min max floor).
 * Compiles directly to a closure — no intermediate AST retained.
 *
 * NO `eval`, NO `new Function`. This is user-facing input on a public
 * site (the `expression` param kind and the sandbox module) — see the
 * Visualizer Doctrine §2: "A constrained expression parser ... is the
 * ceiling. We are not building a CAS."
 *
 * Precedence (highest to lowest): parentheses/functions, `^` (right-
 * associative), unary +/-, `*` `/`, binary `+` `-`. Unary minus binds
 * looser than `^`, matching ordinary math notation: `-2^2` is `-4`, not
 * `4`.
 *
 * Returns typed errors with character offsets so the input field can
 * underline the problem.
 */

export interface ExprError {
  message: string;
  offset: number;
}

export type CompiledExpr = (vars: Record<string, number>) => number;

interface FunctionSpec {
  /** Exact argument count, or -1 for variadic (at least 2 args — min/max). */
  arity: number;
  fn: (...args: number[]) => number;
}

const FUNCTIONS: Record<string, FunctionSpec> = {
  sin: { arity: 1, fn: Math.sin },
  cos: { arity: 1, fn: Math.cos },
  tan: { arity: 1, fn: Math.tan },
  asin: { arity: 1, fn: Math.asin },
  acos: { arity: 1, fn: Math.acos },
  atan: { arity: 1, fn: Math.atan },
  atan2: { arity: 2, fn: Math.atan2 },
  exp: { arity: 1, fn: Math.exp },
  ln: { arity: 1, fn: Math.log },
  sqrt: { arity: 1, fn: Math.sqrt },
  abs: { arity: 1, fn: Math.abs },
  sign: { arity: 1, fn: Math.sign },
  floor: { arity: 1, fn: Math.floor },
  min: { arity: -1, fn: (...args) => Math.min(...args) },
  max: { arity: -1, fn: (...args) => Math.max(...args) },
};

class ParseError extends Error {
  offset: number;
  constructor(message: string, offset: number) {
    super(message);
    this.offset = offset;
  }
}

type Token =
  | { type: 'num'; value: number; offset: number }
  | { type: 'ident'; value: string; offset: number }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '^'; offset: number }
  | { type: 'lparen'; offset: number }
  | { type: 'rparen'; offset: number }
  | { type: 'comma'; offset: number }
  | { type: 'eof'; offset: number };

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

function isIdentStart(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

function isIdentPart(c: string): boolean {
  return isIdentStart(c) || isDigit(c);
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const n = source.length;
  let i = 0;

  while (i < n) {
    const c = source[i];

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }

    if (isDigit(c) || (c === '.' && i + 1 < n && isDigit(source[i + 1]))) {
      const start = i;
      while (i < n && isDigit(source[i])) i++;
      if (i < n && source[i] === '.') {
        i++;
        while (i < n && isDigit(source[i])) i++;
      }
      if (i < n && (source[i] === 'e' || source[i] === 'E')) {
        const expStart = i;
        let j = i + 1;
        if (j < n && (source[j] === '+' || source[j] === '-')) j++;
        if (j < n && isDigit(source[j])) {
          while (j < n && isDigit(source[j])) j++;
          i = j;
        } else {
          i = expStart; // not a valid exponent suffix — leave it for the next token
        }
      }
      tokens.push({ type: 'num', value: Number(source.slice(start, i)), offset: start });
      continue;
    }

    if (isIdentStart(c)) {
      const start = i;
      i++;
      while (i < n && isIdentPart(source[i])) i++;
      tokens.push({ type: 'ident', value: source.slice(start, i), offset: start });
      continue;
    }

    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') {
      tokens.push({ type: 'op', value: c, offset: i });
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'lparen', offset: i });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rparen', offset: i });
      i++;
      continue;
    }
    if (c === ',') {
      tokens.push({ type: 'comma', offset: i });
      i++;
      continue;
    }

    throw new ParseError(`unexpected character '${c}'`, i);
  }

  tokens.push({ type: 'eof', offset: n });
  return tokens;
}

function parse(tokens: Token[], allowedVars: readonly string[]): CompiledExpr {
  let pos = 0;
  const peek = (): Token => tokens[pos];
  const advance = (): Token => tokens[pos++];
  const expectRparen = (): void => {
    const t = peek();
    if (t.type !== 'rparen') throw new ParseError("expected ')'", t.offset);
    advance();
  };

  function parseExpression(): CompiledExpr {
    return parseAdditive();
  }

  function parseAdditive(): CompiledExpr {
    let left = parseMultiplicative();
    for (;;) {
      const t = peek();
      if (t.type !== 'op' || (t.value !== '+' && t.value !== '-')) return left;
      advance();
      const right = parseMultiplicative();
      const prevLeft = left;
      left =
        t.value === '+'
          ? (vars: Record<string, number>) => prevLeft(vars) + right(vars)
          : (vars: Record<string, number>) => prevLeft(vars) - right(vars);
    }
  }

  function parseMultiplicative(): CompiledExpr {
    let left = parseUnary();
    for (;;) {
      const t = peek();
      if (t.type !== 'op' || (t.value !== '*' && t.value !== '/')) return left;
      advance();
      const right = parseUnary();
      const prevLeft = left;
      left =
        t.value === '*'
          ? (vars: Record<string, number>) => prevLeft(vars) * right(vars)
          : (vars: Record<string, number>) => prevLeft(vars) / right(vars);
    }
  }

  function parseUnary(): CompiledExpr {
    const t = peek();
    if (t.type === 'op' && (t.value === '-' || t.value === '+')) {
      advance();
      const operand = parsePower();
      if (t.value === '-') return (vars: Record<string, number>) => -operand(vars);
      return operand;
    }
    return parsePower();
  }

  function parsePower(): CompiledExpr {
    const base = parsePrimary();
    const t = peek();
    if (t.type === 'op' && t.value === '^') {
      advance();
      const exponent = parseUnary(); // right-associative
      return (vars: Record<string, number>) => Math.pow(base(vars), exponent(vars));
    }
    return base;
  }

  function parseArgs(): CompiledExpr[] {
    const args: CompiledExpr[] = [];
    if (peek().type === 'rparen') return args;
    args.push(parseExpression());
    while (peek().type === 'comma') {
      advance();
      args.push(parseExpression());
    }
    return args;
  }

  function parsePrimary(): CompiledExpr {
    const t = peek();

    if (t.type === 'num') {
      advance();
      const value = t.value;
      return () => value;
    }

    if (t.type === 'lparen') {
      advance();
      const inner = parseExpression();
      expectRparen();
      return inner;
    }

    if (t.type === 'ident') {
      advance();
      const name = t.value;

      if (peek().type === 'lparen') {
        advance();
        const args = parseArgs();
        expectRparen();

        const spec = FUNCTIONS[name];
        if (!spec) throw new ParseError(`unknown function '${name}'`, t.offset);
        if (spec.arity >= 0 && args.length !== spec.arity) {
          throw new ParseError(
            `function '${name}' expects ${spec.arity} argument(s), got ${args.length}`,
            t.offset,
          );
        }
        if (spec.arity === -1 && args.length < 2) {
          throw new ParseError(
            `function '${name}' expects at least 2 arguments, got ${args.length}`,
            t.offset,
          );
        }
        const fn = spec.fn;
        return (vars: Record<string, number>) => fn(...args.map((a) => a(vars)));
      }

      if (!allowedVars.includes(name)) {
        throw new ParseError(`unknown variable '${name}'`, t.offset);
      }
      return (vars: Record<string, number>) => vars[name];
    }

    throw new ParseError('expected a number, variable, function call, or parenthesis', t.offset);
  }

  const result = parseExpression();
  if (peek().type !== 'eof') {
    throw new ParseError('unexpected token after expression', peek().offset);
  }
  return result;
}

export function compileExpr(source: string, allowedVars: string[]): CompiledExpr | ExprError {
  try {
    const tokens = tokenize(source);
    return parse(tokens, allowedVars);
  } catch (e) {
    if (e instanceof ParseError) return { message: e.message, offset: e.offset };
    throw e;
  }
}

export function isExprError(result: CompiledExpr | ExprError): result is ExprError {
  return typeof result !== 'function';
}
