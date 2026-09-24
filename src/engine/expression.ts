/**
 * A thin, typed layer over mathjs: parse user input, work out which symbols are
 * genuinely free variables, and evaluate safely over the reals or the complex plane.
 */
import { create, all, type MathNode } from 'mathjs';
import type { Rng } from './rng';

export const math = create(all, {});

/**
 * `ln` is how a maths student writes the natural logarithm; mathjs spells it
 * `log`. Without this alias `ln(x)` parses (it looks like a call) and then
 * fails at every sample point, so the learner is told their answer could not
 * be checked rather than that it was fine.
 */
math.import({ ln: math.log }, { silent: true });

/**
 * Trig in degrees, for the keypad's function keys on a degree-mode question.
 *
 * mathjs works in radians, so a learner typing `4sin(30)` for a height would be
 * graded on sin of 30 radians. The editor shows `\sin(30)` either way and
 * serialises a degree-mode key to one of these instead: the learner reads the
 * calculator they know, and the checker reads an unambiguous unit. Inverses
 * hand back degrees for the same reason.
 */
const DEGREE = Math.PI / 180;
math.import(
  {
    sind: (x: number) => math.sin(x * DEGREE),
    cosd: (x: number) => math.cos(x * DEGREE),
    tand: (x: number) => math.tan(x * DEGREE),
    asind: (x: number) => (math.asin(x) as number) / DEGREE,
    acosd: (x: number) => (math.acos(x) as number) / DEGREE,
    atand: (x: number) => math.atan(x) / DEGREE,
  },
  { silent: true },
);

/**
 * Symbols mathjs resolves on its own. Critically this includes `i`: without
 * excluding it, `3+4i` looks like it has a free variable named `i` and the
 * checker would start assigning it random values.
 */
const BUILTIN_SYMBOLS = new Set([
  'i', 'e', 'E', 'pi', 'PI', 'tau', 'phi', 'Infinity', 'NaN', 'true', 'false', 'null',
]);

/** A scalar mathjs can hand back from a numeric expression. */
export type Scalar = number | { re: number; im: number; isComplex?: boolean };

export interface ParseOk {
  ok: true;
  node: MathNode;
  /** Free variables, excluding built-in constants and declared arbitrary constants. */
  variables: string[];
}
export interface ParseFail {
  ok: false;
  /** Human-facing, shown as "that isn't a complete expression" rather than "wrong". */
  error: string;
}
export type ParseResult = ParseOk | ParseFail;

/**
 * Parse an expression string.
 *
 * `arbitraryConstants` names symbols that stand for an unknown constant rather
 * than a variable — `C` in an indefinite integral. They are excluded from the
 * free-variable list and bound to 0 at evaluation time, so `x^2/2` and
 * `x^2/2 + C` probe identically.
 */
export function parseExpression(
  input: string,
  arbitraryConstants: readonly string[] = [],
): ParseResult {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: false, error: 'Enter an answer.' };

  const ignored = new Set([...BUILTIN_SYMBOLS, ...arbitraryConstants]);

  let node: MathNode;
  try {
    node = math.parse(bracketLoneLetters(trimmed));
  } catch (err) {
    return { ok: false, error: describeParseError(err) };
  }

  // A misspelled function parses happily as a call and only fails at
  // evaluation, where it looks like an unverifiable answer rather than a typo.
  const unknown: string[] = [];
  node.traverse((child) => {
    if (child.type !== 'FunctionNode') return;
    const name = (child as unknown as { fn: { name: string } }).fn?.name;
    if (name && typeof (math as unknown as Record<string, unknown>)[name] !== 'function') {
      unknown.push(name);
    }
  });
  if (unknown.length > 0) {
    return { ok: false, error: `There is no function called ${unknown[0]}.` };
  }

  const variables = new Set<string>();
  node.traverse((child, path, parent) => {
    if (child.type !== 'SymbolNode') return;
    // `sin` in `sin(x)` parses as a SymbolNode too, but at path 'fn' under a
    // FunctionNode. It is a function name, not a variable.
    const isFunctionName = parent?.type === 'FunctionNode' && path === 'fn';
    const { name } = child as unknown as { name: string };
    if (!isFunctionName && !ignored.has(name)) variables.add(name);
  });

  return { ok: true, node, variables: [...variables].sort() };
}

/**
 * A name followed by a bracket, found by reading names whole from the left so
 * the `x` at the end of `x2x(` is never taken for one on its own.
 */
const NAME_BEFORE_BRACKET = /[A-Za-z_][A-Za-z0-9_]*(?=\s*\()/g;

/**
 * Write a lone letter in front of a bracket as a bracketed letter, `(x)(`.
 *
 * mathjs reads any name followed by a bracket as a function call, so `x(x+1)`
 * was a call to a function named x and came back as "There is no function
 * called x" — a factorised answer typed exactly as it is printed could not be
 * graded, on every keypad offering a letter key beside `(`. No function is
 * named by a single letter, so the letter is a factor.
 *
 * It is done to the string rather than to the parsed tree because a call binds
 * tighter than `^`: `x(x+1)^2` parses as `(x(x+1))^2`, and turning that call
 * into a product would square the x as well. `(x)(x+1)^2` is the implicit
 * product the formula keypads already produce (`BRACKETED_LETTER` in
 * `mathInput.tsx`), with the power on the bracket alone.
 *
 * Longer names are left as they are, so a misspelt `sinn(x)` is still reported
 * as a function that does not exist.
 */
function bracketLoneLetters(input: string): string {
  return input.replace(NAME_BEFORE_BRACKET, (name) =>
    name.length === 1 && typeof (math as unknown as Record<string, unknown>)[name] !== 'function'
      ? `(${name})`
      : name,
  );
}

function describeParseError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/Unexpected end of expression/i.test(raw)) return "That expression isn't finished.";
  if (/Parenthesis \) expected/i.test(raw)) return 'There is a bracket left open.';
  if (/Value expected/i.test(raw)) return 'Something is missing from that expression.';
  return 'That expression could not be read.';
}

/** True for anything we must not compare against: NaN, ±Infinity, non-scalars. */
export function isInvalidScalar(value: unknown): boolean {
  if (typeof value === 'number') return !Number.isFinite(value);
  if (typeof value === 'object' && value !== null && 're' in value && 'im' in value) {
    const c = value as { re: number; im: number };
    return !Number.isFinite(c.re) || !Number.isFinite(c.im);
  }
  return true;
}

/** Something `evaluateAt` can run: a parsed node, or one compiled ahead of time. */
export interface Evaluable {
  evaluate(scope?: Record<string, unknown>): unknown;
}

/**
 * Compile a parsed expression once, for evaluating at many points.
 *
 * `node.evaluate` compiles the tree afresh on every call, and a check evaluates
 * each side at up to 24 points; compiling once is several times faster. A node
 * that fails to compile yields one whose every evaluation fails, which is what
 * evaluating the node would have done, so no verdict changes.
 */
export function compileExpression(node: MathNode): Evaluable {
  try {
    return node.compile();
  } catch (err) {
    return {
      evaluate: () => {
        throw err;
      },
    };
  }
}

/** Evaluate at a point. Returns `undefined` for a domain hole rather than throwing. */
export function evaluateAt(
  node: Evaluable,
  scope: Record<string, unknown>,
): Scalar | undefined {
  try {
    const value = node.evaluate(scope);
    return isInvalidScalar(value) ? undefined : (value as Scalar);
  } catch {
    return undefined;
  }
}

/** |a − b|, treating reals and complex numbers uniformly. */
export function distance(a: Scalar, b: Scalar): number {
  const ar = typeof a === 'number' ? a : a.re;
  const ai = typeof a === 'number' ? 0 : a.im;
  const br = typeof b === 'number' ? b : b.re;
  const bi = typeof b === 'number' ? 0 : b.im;
  return Math.hypot(ar - br, ai - bi);
}

/** |a|, for scaling a relative tolerance. */
export function magnitude(a: Scalar): number {
  return typeof a === 'number' ? Math.abs(a) : Math.hypot(a.re, a.im);
}

/**
 * Draw one sample point for each variable.
 *
 * Two deliberate choices:
 *
 * 1. Values avoid 0, ±1 and small integers. At x = 1 the expressions x, x^2 and
 *    sqrt(x) all agree, so integer-heavy sampling invents false matches.
 * 2. Over the complex domain, |Im| is held clear of zero so no point lands on
 *    the negative real axis — the branch cut of `log` and `sqrt`, where those
 *    functions are discontinuous and evaluation either side of it is unstable.
 *    This avoids sampling *at* the discontinuity. It does not paper over
 *    identities that genuinely fail off the principal branch: log(z^2) and
 *    2log(z) differ over half the plane, and are correctly marked different.
 * 3. The `positive` domain drops the sign flip, and is for questions whose
 *    subject is only defined for a positive base. `sqrt(x^3)` and `x^(3/2)`
 *    are the same function for x ≥ 0 and every textbook writes them as equal,
 *    but mathjs reads both through the principal branch at negative x and they
 *    come out different for three powers in every four — so probing over the
 *    whole real line marks a correct answer wrong. It is deliberately narrower
 *    than `real` and must be opted into per slide: it also accepts answers that
 *    differ only where x < 0, `sqrt(x^2)` for `x` among them, which is right
 *    for a question about indices and wrong for most other questions.
 */
export function samplePoint(
  rng: Rng,
  variables: readonly string[],
  domain: 'real' | 'complex' | 'positive',
): Record<string, unknown> {
  const scope: Record<string, unknown> = {};
  for (const name of variables) {
    if (domain === 'complex') {
      const re = rng.float(0.35, 2.4) * rng.sign();
      const im = rng.float(0.4, 2.2) * rng.sign();
      // Keep |im| clear of 0 so a negative `re` never lands on the cut itself.
      scope[name] = math.complex(re, im);
    } else {
      scope[name] = rng.float(0.35, 2.6) * (domain === 'positive' ? 1 : rng.sign());
    }
  }
  return scope;
}
