/**
 * Demo generators for the `iterate` widget, ahead of the Numerical Methods
 * course (roadmap C15). No lesson asks them yet; the property tests still do.
 *
 * - `iterate-fixed-point` runs a rearrangement `x_{n+1} = g(x_n)` that
 *   converges, then asks for the two tenths the root lies between.
 * - `iterate-newton-raphson` runs Newton-Raphson on a cubic, then asks for the
 *   value the iterates settle on.
 *
 * Every answer is an exact token, so rounding has to be beyond argument. Values
 * carry full precision from row to row and are only written through `toFixed`
 * at the end, and a draw is refused when any written value sits close to a
 * rounding boundary (`toFixed` rounds the float, so `1.005` prints as `1.00`),
 * would print as `-0.000`, or would come out differently for a learner who
 * carries the rounded value forward instead of the full one. What is left is a
 * table every sensible way of working agrees on.
 *
 * The conclusion is never read off `x_4`. The limit comes from iterating to
 * convergence, and the bracket is only offered once `f` changes sign across it.
 */
import type { Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { sumTex, termTex } from './calculus';

/** Rows the learner fills in: `x_1` to `x_4`. */
export const ITERATES = 4;

/**
 * How close to a rounding boundary a value may sit, as a fraction of a unit
 * in the last place written.
 */
const MARGIN = 0.05;

/**
 * `value` written to `dp` places, or undefined when that is not safe to ask:
 * too near a boundary between two roundings, or a negative zero.
 */
export function written(value: number, dp: number): string | undefined {
  if (!Number.isFinite(value)) return undefined;
  const scaled = value * 10 ** dp;
  if (Math.abs(scaled - Math.floor(scaled) - 0.5) < MARGIN) return undefined;
  const text = value.toFixed(dp);
  if (/^-0\.0*$/.test(text)) return undefined;
  return text;
}

/** Cut off rather than rounded: the most common slip in a table like this. */
function truncated(value: number, dp: number): string {
  const unit = 10 ** dp;
  // A nudge inwards so 1.23 held as 1.2299999 still truncates to 1.23.
  return (Math.trunc(value * unit + Math.sign(value) * 1e-9) / unit).toFixed(dp);
}

/** One unit in the last place away, the other way from how it rounded. */
function roundedWrongWay(value: number, dp: number): string {
  const unit = 10 ** dp;
  const scaled = value * unit;
  const other = scaled - Math.floor(scaled) >= 0.5 ? Math.floor(scaled) : Math.ceil(scaled);
  return (other / unit).toFixed(dp);
}

/** The tenth a value falls in, as an integer count of tenths. */
function tenthOf(value: number): number {
  return Math.floor(value * 10 + 1e-9);
}

/** The conclusion token for a root in the tenth `k`, e.g. `1.8 < \alpha < 1.9`. */
export function bracketTex(k: number): string {
  return `${(k / 10).toFixed(1)} < \\alpha < ${((k + 1) / 10).toFixed(1)}`;
}

/** Numbers first, in order; a bracket sorts by its lower end. */
function sortBank(tokens: string[]): string[] {
  return [...tokens].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));
}

/**
 * `x_0` to `x_{steps}` under `step`, in full precision.
 *
 * Returns undefined as soon as a step leaves the function's domain or runs off
 * towards infinity, so a caller never has to inspect a NaN.
 */
function run(step: (x: number) => number, x0: number, steps: number): number[] | undefined {
  const values = [x0];
  for (let n = 0; n < steps; n += 1) {
    const next = step(values[n]);
    if (!Number.isFinite(next) || Math.abs(next) > 1e3) return undefined;
    values.push(next);
  }
  return values;
}

/**
 * The same four rows for a learner who carries each written value forward.
 * Refusing draws where this differs is what lets the prompt accept either
 * habit without saying which.
 */
function carriedRounded(step: (x: number) => number, x0: number, dp: number): string[] | undefined {
  const tokens: string[] = [];
  let x = x0;
  for (let n = 0; n < ITERATES; n += 1) {
    const token = written(step(x), dp);
    if (token === undefined) return undefined;
    tokens.push(token);
    x = Number(token);
  }
  return tokens;
}

/** Where the scheme settles, iterating until it stops moving. */
function limitOf(step: (x: number) => number, x0: number): number | undefined {
  let x = x0;
  for (let n = 0; n < 500; n += 1) {
    const next = step(x);
    if (!Number.isFinite(next)) return undefined;
    if (Math.abs(next - x) < 1e-13) return next;
    x = next;
  }
  return undefined;
}

/**
 * The bank: the answer as a multiset (a value the table needs twice is offered
 * twice), then distractors that are really different from every answer token.
 */
function bankOf(answer: string[], distractors: (string | undefined)[], most: number): string[] | undefined {
  const extras: string[] = [];
  for (const token of distractors) {
    if (token === undefined || answer.includes(token) || extras.includes(token)) continue;
    if (/^-0\.0*$/.test(token)) continue;
    extras.push(token);
    if (extras.length === most) break;
  }
  if (extras.length < 2) return undefined;
  return sortBank([...answer, ...extras]);
}

/** `a x_n + b` as it would be written, for any coefficients. */
function linearTex(a: number, b: number): string {
  return sumTex([termTex(a, 1).replace('x', 'x_n'), termTex(b, 0)]);
}

/**
 * One line per row of the table: the value to a few more places than asked,
 * then what gets written down. Prose rather than a display, because a worked
 * solution is narrow on a phone and `x_1 = 1.05882... ≈ 1.059` overflows it.
 */
function rowSteps(values: number[], tokens: string[]): SolutionStep[] {
  const dp = tokens[0].split('.')[1]?.length ?? 0;
  return tokens.map((token, idx) => {
    const value = values[idx + 1];
    const long = value.toFixed(dp + 3);
    // An iterate that happens to be exact does not trail off.
    const more = Math.abs(Number(long) - value) < 1e-12 ? '' : '\\ldots';
    return { text: `$x_{${idx + 1}} = ${long}${more}$, written $${token}$` };
  });
}

/* ---------- Fixed-point iteration ---------- */

export type FixedFamily = 'sqrt' | 'cbrt' | 'recip' | 'square';

export interface FixedPointParams {
  family: FixedFamily;
  a: number;
  b: number;
  x0: number;
  dp: number;
}

/** A rearrangement: the scheme, the equation it solves, and both written out. */
export interface Scheme {
  g: (x: number) => number;
  f: (x: number) => number;
  /** `x_{n+1} = ...`. TeX. */
  schemeTex: string;
  /** The left side of `... = 0`. TeX. */
  equationTex: string;
}

export function fixedScheme({ family, a, b }: FixedPointParams): Scheme {
  switch (family) {
    // x^2 = ax + b, so x = sqrt(ax + b): |g'| = a / 2x < 1/2 at the root.
    case 'sqrt':
      return {
        g: (x) => (a * x + b < 0 ? NaN : Math.sqrt(a * x + b)),
        f: (x) => x * x - a * x - b,
        schemeTex: `x_{n+1} = \\sqrt{${linearTex(a, b)}}`,
        equationTex: sumTex(['x^{2}', termTex(-a, 1), termTex(-b, 0)]),
      };
    // x^3 = ax + b: |g'| = a / 3x^2, small at the positive root.
    case 'cbrt':
      return {
        g: (x) => Math.cbrt(a * x + b),
        f: (x) => x * x * x - a * x - b,
        schemeTex: `x_{n+1} = \\sqrt[3]{${linearTex(a, b)}}`,
        equationTex: sumTex(['x^{3}', termTex(-a, 1), termTex(-b, 0)]),
      };
    // x(x + b) = a: g' = -x / (x + b), so the iterates straddle the root.
    case 'recip':
      return {
        g: (x) => (x + b === 0 ? NaN : a / (x + b)),
        f: (x) => x * x + b * x - a,
        schemeTex: `x_{n+1} = \\frac{${a}}{${linearTex(1, b)}}`,
        equationTex: sumTex(['x^{2}', termTex(b, 1), termTex(-a, 0)]),
      };
    // x^2 - ax + b = 0 at its smaller root, where g' = 2x / a < 1.
    case 'square':
      return {
        g: (x) => (x * x + b) / a,
        f: (x) => x * x - a * x + b,
        schemeTex: `x_{n+1} = \\frac{x_n^{2} + ${b}}{${a}}`,
        equationTex: sumTex(['x^{2}', termTex(-a, 1), termTex(b, 0)]),
      };
  }
}

interface FixedPointWorking {
  scheme: Scheme;
  values: number[];
  tokens: string[];
  root: number;
  tenth: number;
  answer: string[];
  bank: string[];
}

/** Everything the slide needs, or undefined for a draw that is not fair to ask. */
export function workFixedPoint(params: FixedPointParams): FixedPointWorking | undefined {
  const scheme = fixedScheme(params);
  const { g, f } = scheme;
  const { x0, dp } = params;

  const values = run(g, x0, ITERATES + 1);
  if (!values) return undefined;
  const tokens = values.slice(1, ITERATES + 1).map((x) => written(x, dp));
  if (tokens.some((token) => token === undefined)) return undefined;
  const rows = tokens as string[];
  const carried = carriedRounded(g, x0, dp);
  if (!carried || carried.some((token, idx) => token !== rows[idx])) return undefined;
  // The start itself must not already be the answer to write down.
  if (rows[0] === x0.toFixed(dp)) return undefined;

  const root = limitOf(g, x0);
  if (root === undefined || Math.abs(f(root)) > 1e-9) return undefined;

  // Clear of either end of its tenth, so the sign change is plain to see.
  const tenth = tenthOf(root);
  const offset = root * 10 - tenth;
  if (offset < 0.1 || offset > 0.9) return undefined;
  const lo = tenth / 10;
  const hi = (tenth + 1) / 10;
  if (!(f(lo) * f(hi) < 0) || Math.abs(f(lo)) < 0.001 || Math.abs(f(hi)) < 0.001) return undefined;
  // The last row lands in the same tenth, so the table and the conclusion agree.
  if (tenthOf(Number(rows[ITERATES - 1])) !== tenth) return undefined;

  const answer = [...rows, bracketTex(tenth)];

  // The neighbouring bracket on the side the root is nearer.
  const neighbour = bracketTex(offset < 0.5 ? tenth - 1 : tenth + 1);
  const firstTruncated = values
    .slice(1, ITERATES + 1)
    .map((x) => truncated(x, dp))
    .find((token, idx) => token !== rows[idx]);
  const flipped = fixedScheme({ ...params, b: -params.b }).g(x0);
  const numeric = bankOf(
    rows,
    [
      firstTruncated,
      written(flipped, dp),
      written(values[ITERATES + 1], dp),
      roundedWrongWay(values[2], dp),
      roundedWrongWay(values[1], dp),
    ],
    3,
  );
  if (!numeric) return undefined;

  return {
    scheme,
    values,
    tokens: rows,
    root,
    tenth,
    answer,
    bank: sortBank([...numeric, bracketTex(tenth), neighbour]),
  };
}

const FAMILIES: Record<number, FixedFamily[]> = {
  1: ['sqrt', 'recip'],
  2: ['cbrt', 'square', 'sqrt', 'recip'],
};

function drawFixedPoint(rng: Rng, difficulty: number): FixedPointParams {
  const family = rng.pick(FAMILIES[difficulty] ?? FAMILIES[1]);
  const dp = difficulty >= 2 ? 3 : 2;
  let a: number;
  let b: number;
  switch (family) {
    case 'sqrt':
      a = rng.int(1, 7);
      b = rng.int(1, 9);
      break;
    case 'cbrt':
      a = rng.int(1, 7);
      b = rng.int(1, 9);
      break;
    case 'recip':
      a = rng.int(2, 12);
      b = rng.int(1, 5);
      break;
    case 'square':
      a = rng.int(3, 8);
      b = rng.int(1, Math.floor((a * a - 1) / 4));
      break;
  }
  // Near the root the scheme is heading for, but not on it.
  const guess = limitOf(fixedScheme({ family, a, b, x0: 0, dp }).g, family === 'square' ? 0 : 1) ?? 1;
  const x0 = Math.max(0, Math.round(guess) + rng.int(-1, 1));
  return { family, a, b, x0, dp };
}

export const iterateFixedPoint: Generator<FixedPointParams> = {
  id: 'iterate-fixed-point',
  sample(rng, difficulty) {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const params = drawFixedPoint(rng, difficulty);
      if (workFixedPoint(params)) return params;
    }
    throw new Error('iterate-fixed-point: no fair draw in 500 attempts');
  },
  render(params) {
    const work = workFixedPoint(params)!;
    return {
      kind: 'iterate',
      prompt: [
        {
          kind: 'prose',
          text: `Starting from $x_0 = ${params.x0}$, the iteration below converges to a root $\\alpha$ of $${work.scheme.equationTex} = 0$.`,
        },
        { kind: 'display', tex: work.scheme.schemeTex },
        {
          kind: 'prose',
          text: `Keep full accuracy between steps and write each $x_n$ to ${params.dp} decimal places, then the two tenths $\\alpha$ lies between.`,
        },
      ],
      start: String(params.x0),
      conclusion: 'bracket',
      bank: work.bank,
      answer: work.answer,
    };
  },
  solution(params) {
    const work = workFixedPoint(params)!;
    const { f, equationTex, schemeTex } = work.scheme;
    const lo = (work.tenth / 10).toFixed(1);
    const hi = ((work.tenth + 1) / 10).toFixed(1);
    const sign = (value: number) => (value < 0 ? '< 0' : '> 0');
    const steps: SolutionStep[] = [
      {
        text: `Put each value back into the scheme, keeping every digit and rounding only what you write down.`,
        tex: schemeTex,
      },
      ...rowSteps(work.values, work.tokens),
      {
        text: `The iterates are closing in on a value between ${lo} and ${hi}. To be sure the root is there, look for a sign change of $f(x) = ${equationTex}$:`,
        tex: `f(${lo}) = ${f(Number(lo)).toFixed(3)} ${sign(f(Number(lo)))}`,
      },
      { tex: `f(${hi}) = ${f(Number(hi)).toFixed(3)} ${sign(f(Number(hi)))}` },
      { text: `The sign changes, so $${bracketTex(work.tenth)}$.` },
    ];
    return steps;
  },
};

/* ---------- Newton-Raphson ---------- */

export interface NewtonParams {
  /** `f(x) = x^3 + p x^2 + q x + r`. */
  p: number;
  q: number;
  r: number;
  x0: number;
  dp: number;
}

export function cubic({ p, q, r }: Pick<NewtonParams, 'p' | 'q' | 'r'>) {
  return {
    f: (x: number) => ((x + p) * x + q) * x + r,
    df: (x: number) => (3 * x + 2 * p) * x + q,
    tex: sumTex(['x^{3}', termTex(p, 2), termTex(q, 1), termTex(r, 0)]),
    derivativeTex: sumTex([termTex(3, 2), termTex(2 * p, 1), termTex(q, 0)]),
  };
}

interface NewtonWorking {
  values: number[];
  tokens: string[];
  root: number;
  rootToken: string;
  answer: string[];
  bank: string[];
}

export function workNewton(params: NewtonParams): NewtonWorking | undefined {
  const { f, df } = cubic(params);
  const { x0, dp } = params;
  // A step is only asked where the tangent is far from flat; a near-flat one
  // throws the next iterate a long way, and the question becomes about that.
  const step = (x: number) => (Math.abs(df(x)) < 0.5 ? NaN : x - f(x) / df(x));

  if (Math.abs(f(x0)) < 0.5) return undefined;
  const values = run(step, x0, ITERATES);
  if (!values || values.some((x) => Math.abs(x) > 10)) return undefined;
  const tokens = values.slice(1).map((x) => written(x, dp));
  if (tokens.some((token) => token === undefined)) return undefined;
  const rows = tokens as string[];
  const carried = carriedRounded(step, x0, dp);
  if (!carried || carried.some((token, idx) => token !== rows[idx])) return undefined;

  const root = limitOf(step, x0);
  if (root === undefined || Math.abs(f(root)) > 1e-9) return undefined;
  // A whole-number root is a factor-theorem question, not a numerical one.
  if (Math.abs(root - Math.round(root)) < 0.05) return undefined;
  const rootToken = written(root, dp);
  if (rootToken === undefined) return undefined;
  // Settled by the last row, but only after two rows of real work: a table
  // that reads the root four times over has asked one step, not an iteration.
  if (rows[ITERATES - 1] !== rootToken || rows[1] === rootToken) return undefined;

  const answer = [...rows, rootToken];
  const low = Math.min(...values) - 2;
  const high = Math.max(...values) + 2;
  const plausible = (x: number) => (x >= low && x <= high ? written(x, dp) : undefined);
  const firstTruncated = values
    .slice(1)
    .map((x) => truncated(x, dp))
    .find((token, idx) => token !== rows[idx]);
  const bank = bankOf(
    answer,
    [
      firstTruncated,
      // The sign of the correction flipped.
      plausible(x0 + f(x0) / df(x0)),
      // f(x_0) itself written down as x_1.
      plausible(f(x0)),
      roundedWrongWay(values[1], dp),
      roundedWrongWay(values[2], dp),
    ],
    3,
  );
  if (!bank) return undefined;

  return { values, tokens: rows, root, rootToken, answer, bank };
}

function drawNewton(rng: Rng, difficulty: number): NewtonParams {
  if (difficulty >= 2) {
    return {
      p: rng.int(-3, 3),
      q: rng.int(-6, 6),
      r: rng.pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
      x0: rng.int(-3, 3),
      dp: 4,
    };
  }
  return {
    p: 0,
    q: rng.int(-6, 6),
    r: rng.pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    x0: rng.int(-3, 3),
    dp: 3,
  };
}

export const iterateNewtonRaphson: Generator<NewtonParams> = {
  id: 'iterate-newton-raphson',
  sample(rng, difficulty) {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const params = drawNewton(rng, difficulty);
      if (workNewton(params)) return params;
    }
    throw new Error('iterate-newton-raphson: no fair draw in 500 attempts');
  },
  render(params) {
    const work = workNewton(params)!;
    return {
      kind: 'iterate',
      prompt: [
        {
          kind: 'prose',
          text: `Use Newton-Raphson on $f(x) = ${cubic(params).tex}$, starting from $x_0 = ${params.x0}$.`,
        },
        { kind: 'display', tex: `x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}` },
        {
          kind: 'prose',
          text: `Keep full accuracy between steps and write each $x_n$ to ${params.dp} decimal places, then the root they converge to.`,
        },
      ],
      start: String(params.x0),
      conclusion: 'limit',
      bank: work.bank,
      answer: work.answer,
    };
  },
  solution(params) {
    const work = workNewton(params)!;
    const { tex, derivativeTex } = cubic(params);
    return [
      {
        text: `Differentiate first: $f(x) = ${tex}$ gives $f'(x) = ${derivativeTex}$. Then put each value through`,
        tex: `x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}`,
      },
      ...rowSteps(work.values, work.tokens),
      {
        text: `The iterates stop changing at ${params.dp} decimal places, so the root is $${work.rootToken}$ to ${params.dp} decimal places.`,
      },
    ];
  },
};

export const iterationTableGenerators = [iterateFixedPoint, iterateNewtonRaphson];
