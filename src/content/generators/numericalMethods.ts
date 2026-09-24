/**
 * Numerical Methods (roadmap C15).
 *
 * Level 1 finds roots without solving: the change of sign and where it
 * fails, rearranging f(x) = 0 into x = g(x), the staircase and cobweb
 * pictures of that iteration, and why it diverges when |g'(α)| > 1. Level 2
 * is Newton-Raphson (the tangent step, a root to a stated accuracy, and where
 * it goes wrong) and the trapezium rule (the rule itself, and whether it
 * overestimates or underestimates). Level 3 is bounds and errors: absolute
 * and relative error, the bounds of a calculation on rounded values, and how
 * an error in x_n is carried through g, one step and then k. Level 4 is
 * Simpson's rule: a parabola through each pair of strips, why n is even, how
 * it compares with the trapezium rule on the same heights, why it is exact
 * for cubics, and using it on a table of readings. Level 5 is Euler's
 * method: one tangent step, stepping on in a table, a gradient recomputed
 * from the new y, the error against the exact solution of an equation in x
 * alone and which way it misses, and the error roughly proportional to h.
 * Level 6 is choosing a method: interval bisection, one root chased by
 * bisection, iteration and Newton-Raphson side by side, how fast each
 * closes in, when each breaks on the f shown, and which to reach for.
 *
 * Three rules hold everywhere in this file.
 *
 * - An `iterate` answer is exact tokens, so a table is only asked when every
 *   sensible way of working agrees on it: values carry full precision, are
 *   written through `written` (which refuses a value near a rounding
 *   boundary), and the draw is refused if carrying the rounded value forward
 *   changes any row. `carriedRounded` below is a copy of the private one in
 *   `iterationTable.ts`. The limit comes from iterating to convergence, never
 *   from reading `x_4`.
 * - A trapezium, Simpson or Euler estimate is not the integral, so no
 *   `expression` here declares `source`, `integrand` or `limits`: the oracle
 *   would grade the estimate against the exact value. Ordinates are whole by choice of `f`,
 *   `a`, `b` and `n` (polynomials at whole numbers, `2^x`, and `k/x` for a
 *   `k` every ordinate divides), so every estimate is an exact decimal.
 * - The checker compares values (PITFALLS 3.4), so a rearrangement or the
 *   Newton-Raphson formula, which is a form, goes through `tiles` or
 *   `choice`. Only numbers, and a derivative with its `source`, are typed.
 *
 * Every decimal shown or graded is exact: a value that would not terminate
 * within three places is refused at sampling rather than rounded.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { ALGEBRA_KEYS, ROOT_KEYS, sumTex, termTex } from './calculus';
import { ITERATES, bracketTex, fixedScheme, written, type FixedFamily } from './iterationTable';

/* ================================================================
 * Shared helpers
 * ================================================================ */

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });

/** A value as it is written: no float dust, no trailing zeros. */
export function fmt(value: number): string {
  const text = String(Number(value.toFixed(6)));
  return text === '-0' ? '0' : text;
}

/** Whether a value is an exact decimal of at most `dp` places. */
function terminates(value: number, dp = 3): boolean {
  const scaled = value * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-7;
}

/** A number as a factor or an argument, bracketed when negative. */
function paren(value: number | string): string {
  const text = typeof value === 'number' ? fmt(value) : value;
  return text.startsWith('-') ? `(${text})` : text;
}

/**
 * Display lines stacked on their `&`, since two facts side by side run past
 * a phone's width once the numbers carry four decimal places.
 */
function aligned(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** Two values of f, one above the other. */
function pairTex(a: number | string, fa: number | string, b: number | string, fb: number | string): string {
  const show = (v: number | string) => (typeof v === 'number' ? fmt(v) : v);
  return aligned(`f(${show(a)}) &= ${show(fa)}`, `f(${show(b)}) &= ${show(fb)}`);
}

/** "+ 4" or "- 3", for a term that follows another. */
function signed(value: number): string {
  return value < 0 ? `- ${fmt(-value)}` : `+ ${fmt(value)}`;
}

/** `x - 3`, `x + 2`: the factor for a root. */
function linFactor(root: number): string {
  return root < 0 ? `x + ${-root}` : `x - ${root}`;
}

/** Polynomial coefficients, highest power first. */
type Poly = number[];

function valueAt(p: Poly, x: number): number {
  return p.reduce((acc, c) => acc * x + c, 0);
}

function derivative(p: Poly): Poly {
  const n = p.length - 1;
  return p.slice(0, -1).map((c, i) => c * (n - i));
}

/** A polynomial as the learner reads it, in any variable. */
function polyTex(p: Poly, variable = 'x'): string {
  const n = p.length - 1;
  const tex = sumTex(p.map((c, i) => termTex(c, n - i))) || '0';
  return variable === 'x' ? tex : tex.replace(/x/g, variable);
}

/** The same for the grader. Never displayed. */
function polyAnswer(p: Poly): string {
  const n = p.length - 1;
  const terms = p.map((c, i) => (c === 0 ? '' : `(${c})*x^(${n - i})`)).filter(Boolean);
  return terms.length === 0 ? '0' : terms.join(' + ');
}

/** A root of `f` between `lo` and `hi`, by halving. Requires a sign change. */
function bisect(f: (x: number) => number, lo: number, hi: number): number {
  let a = lo;
  let b = hi;
  for (let n = 0; n < 200; n += 1) {
    const mid = (a + b) / 2;
    if (Math.sign(f(mid)) === Math.sign(f(a))) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}

/** Every real root of `f` in [lo, hi], found where it changes sign on a fine comb. */
function rootsIn(f: (x: number) => number, lo: number, hi: number): number[] {
  const out: number[] = [];
  const steps = 800;
  for (let i = 0; i < steps; i += 1) {
    const a = lo + ((hi - lo) * i) / steps;
    const b = lo + ((hi - lo) * (i + 1)) / steps;
    if (f(a) === 0) out.push(a);
    else if (f(a) * f(b) < 0) out.push(bisect(f, a, b));
  }
  return out;
}

/** A gradient, numerically. Only ever used to decide, never displayed raw. */
function slope(g: (x: number) => number, x: number): number {
  const h = 1e-6;
  return (g(x + h) - g(x - h)) / (2 * h);
}

function nonZero(rng: Rng, max: number): number {
  return rng.int(1, max) * rng.sign();
}

/**
 * A bank of numbers: the answer as a multiset (a value needed twice is
 * offered twice), then the slips that differ from every answer, topped up
 * from `fillers` until `spare` distractors are left. Sorted, never shuffled
 * (PITFALLS 3.10).
 */
function numberBank(answer: string[], slips: (string | undefined)[], fillers: string[] = [], spare = 3): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  for (const token of [...slips, ...fillers]) {
    if (extras.length >= spare) break;
    if (token === undefined || needed.has(token) || extras.includes(token)) continue;
    extras.push(token);
  }
  return [...answer, ...extras].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));
}

/** Numbers either side of each value, for topping up a bank. */
function around(values: number[], unit = 1): string[] {
  return [1, 2, 3].flatMap((k) => values.flatMap((v) => [fmt(v + k * unit), fmt(v - k * unit)]));
}

/**
 * A tiles bank: every token the answer needs, then distractors that differ
 * from all of them once spaces are ignored, since "- 3" and "-3" would be two
 * tiles that look the same. Sorted.
 */
function fillBank(answer: string[], distractors: string[]): string[] {
  const bare = (token: string) => token.replace(/\s+/g, '');
  const needed = new Set(answer.map(bare));
  const extras: string[] = [];
  for (const token of distractors) {
    if (needed.has(bare(token)) || extras.some((extra) => bare(extra) === bare(token))) continue;
    extras.push(token);
  }
  return [...answer, ...extras].sort();
}

/** A steps bank: the value and its slips, de-duplicated, ordered by hash. */
function stepBank(value: string, ...slips: string[]): string[] {
  const out = [...new Set([value, ...slips])];
  return out.sort((a, b) => hashSeed(a) - hashSeed(b));
}

/**
 * A native choice slide, turned by a hash of its labels so the answer is not
 * always first yet one question renders one way.
 */
function choiceSlide(prompt: Block[], opts: ChoiceOption[], tex = true): Slide {
  const turn = hashSeed(opts.map((o) => o.tex).join('|')) % opts.length;
  const ordered = [...opts.slice(turn), ...opts.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/** Flow branches turned by a hash of `key`, so the right one is not always first. */
function turned<T>(items: T[], key: string): T[] {
  const turn = hashSeed(key) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/** A curve clamped so a steep arm leaves the picture without huge numbers in the SVG. */
function clamped(f: (x: number) => number, limit: number): (x: number) => number {
  return (x) => {
    const y = f(x);
    return Number.isFinite(y) ? Math.max(-limit, Math.min(limit, y)) : y;
  };
}


/** A two-column table of values, stacked so it never runs off a phone. */
function valueTable(head: [string, string], rows: [string, string][]): string {
  const body = rows.map(([x, y]) => `${x} & ${y}`).join(' \\\\ ');
  return `\\begin{array}{c|c} ${head[0]} & ${head[1]} \\\\ \\hline ${body} \\end{array}`;
}

const cube = (x: number) => x * x * x;

/* ================================================================
 * Level 1, lesson 1: the change of sign
 * ================================================================ */

interface CubicInterval {
  /** f(x) = x^3 + r x^2 + p x + q. */
  r: number;
  p: number;
  q: number;
  /** The interval is [a, a + 1]. */
  a: number;
}

const cubicOf = ({ r, p, q }: Pick<CubicInterval, 'r' | 'p' | 'q'>): Poly => [1, r, p, q];

/** A cubic that changes sign across [a, a + 1], with modest values at both ends. */
function sampleCubicInterval(rng: Rng, difficulty: number): CubicInterval {
  for (;;) {
    const hard = difficulty > 1;
    const r = hard ? nonZero(rng, 3) : 0;
    const p = nonZero(rng, 9);
    const q = nonZero(rng, 9);
    const a = hard ? rng.int(-4, 3) : rng.int(-2, 3);
    const f = cubicOf({ r, p, q });
    const fa = valueAt(f, a);
    const fb = valueAt(f, a + 1);
    if (!(fa * fb < 0) || Math.abs(fa) > 40 || Math.abs(fb) > 40) continue;
    return { r, p, q, a };
  }
}

/** The cube part at x: `x^3`, or `x^3 + r x^2` at difficulty 2. */
function cubePart({ r }: CubicInterval, x: number): number {
  return cube(x) + r * x * x;
}

function cubePartTex({ r }: CubicInterval, x: number): string {
  const base = `${paren(x)}^{3}`;
  if (r === 0) return base;
  return `${base} ${r < 0 ? '-' : '+'} ${Math.abs(r) === 1 ? '' : `${Math.abs(r)} \\times `}${paren(x)}^{2}`;
}

function linearPartTex({ p, q }: CubicInterval, x: number): string {
  return `${p} \\times ${paren(x)} ${signed(q)}`;
}

/**
 * f at both ends of [a, a + 1], worked as strands: the cube part and the
 * linear part at each end on top, each f beneath.
 */
const signTree: Generator<CubicInterval> = {
  id: 'numer-sign-tree',
  sample: sampleCubicInterval,
  render: (params): Slide => {
    const { p, q, a } = params;
    const b = a + 1;
    const f = cubicOf(params);
    const answer = [cubePart(params, a), p * a + q, cubePart(params, b), p * b + q, valueAt(f, a), valueAt(f, b)].map(fmt);
    const slips = [
      -valueAt(f, a),
      -valueAt(f, b),
      cubePart(params, -a) + p * a + q,
      p * a - q,
      p * b - q,
      cubePart(params, a) - (p * a + q),
      cubePart(params, b) - (p * b + q),
    ].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Check for a change of sign of $f(x) = ${polyTex(f)}$ on $[${a}, ${b}]$. Top row, left to right: $${cubePartTex(params, a)}$, then $${linearPartTex(params, a)}$, then the same two at $x = ${b}$. Underneath, $f(${a})$ and $f(${b})$.`,
        ),
      ],
      expression: `f(${a}) \\text{ and } f(${b})`,
      nodes: [
        { id: 'ca', from: [] },
        { id: 'la', from: [] },
        { id: 'cb', from: [] },
        { id: 'lb', from: [] },
        { id: 'fa', from: ['ca', 'la'] },
        { id: 'fb', from: ['cb', 'lb'] },
      ],
      bank: numberBank(answer, slips, around([valueAt(f, a), valueAt(f, b)])),
      answer,
    };
  },
  solution: (params) => {
    const { a } = params;
    const b = a + 1;
    const f = cubicOf(params);
    const fa = valueAt(f, a);
    const fb = valueAt(f, b);
    return [
      { text: `At $x = ${a}$: $${cubePartTex(params, a)} = ${fmt(cubePart(params, a))}$ and $${linearPartTex(params, a)} = ${fmt(params.p * a + params.q)}$.` },
      { tex: `f(${a}) = ${fmt(fa)}` },
      { text: `At $x = ${b}$: $${cubePartTex(params, b)} = ${fmt(cubePart(params, b))}$ and $${linearPartTex(params, b)} = ${fmt(params.p * b + params.q)}$.` },
      { tex: `f(${b}) = ${fmt(fb)}` },
      { text: `One is ${fa < 0 ? 'negative' : 'positive'} and the other ${fb < 0 ? 'negative' : 'positive'}. A polynomial is continuous, so there is a root between $${a}$ and $${b}$.` },
    ];
  },
};

interface IntervalTableParams {
  p: number;
  q: number;
  /** The first x in the table. */
  start: number;
  /** 1 for whole numbers, 0.1 for tenths. */
  step: number;
}

function tableXs({ start, step }: IntervalTableParams): number[] {
  return Array.from({ length: 5 }, (_, i) => Number((start + i * step).toFixed(1)));
}

const tableValue = (params: IntervalTableParams, x: number) => valueAt([1, 0, params.p, params.q], x);

/** A value in the table, to three places where it is not whole. */
function tableTex(params: IntervalTableParams, x: number): string {
  const y = tableValue(params, x);
  return params.step === 1 ? fmt(y) : y.toFixed(3);
}

/**
 * Which interval must hold a root, read off a table of values. At
 * difficulty 2 the table runs in tenths, so the values are small and the
 * signs are the only thing to read.
 */
const signInterval: Generator<IntervalTableParams> = {
  id: 'numer-sign-interval',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = nonZero(rng, 9);
      const q = nonZero(rng, 9);
      const f = (x: number) => valueAt([1, 0, p, q], x);
      if (difficulty > 1) {
        const roots = rootsIn(f, -4, 4);
        if (roots.length === 0) continue;
        const root = rng.pick(roots);
        const tenth = Math.floor(root * 10);
        // Clear of the table's edges and of zero, so every sign is plain.
        if (Math.abs(root * 10 - tenth - 0.5) > 0.4) continue;
        const start = (tenth - rng.int(0, 3)) / 10;
        const params = { p, q, start, step: 0.1 };
        if (fair(params)) return params;
        continue;
      }
      const params = { p, q, start: rng.int(-3, 0), step: 1 };
      if (fair(params)) return params;
    }
  },
  render: (params): Slide => {
    const xs = tableXs(params);
    const intervals = xs.slice(0, -1).map((x, i) => [x, xs[i + 1]] as const);
    const change = intervals.findIndex(([lo, hi]) => tableValue(params, lo) * tableValue(params, hi) < 0);
    return choiceSlide(
      [
        say(`Some values of $f(x) = ${polyTex([1, 0, params.p, params.q])}$. Which interval must contain a root of $f(x) = 0$?`),
        show(valueTable(['x', 'f(x)'], xs.map((x) => [fmt(x), tableTex(params, x)]))),
      ],
      intervals.map(([lo, hi], i) => ({ tex: `[${fmt(lo)},\\ ${fmt(hi)}]`, correct: i === change })),
    );
  },
  solution: (params) => {
    const xs = tableXs(params);
    const i = xs.findIndex((x, k) => k < 4 && tableValue(params, x) * tableValue(params, xs[k + 1]) < 0);
    const lo = xs[i];
    const hi = xs[i + 1];
    return [
      { text: 'Look down the $f(x)$ column for the one place the sign changes.' },
      { text: `$f(${fmt(lo)}) = ${tableTex(params, lo)}$ and $f(${fmt(hi)}) = ${tableTex(params, hi)}$ have opposite signs.` },
      { text: `$f$ is a polynomial, so continuous: a root lies in $[${fmt(lo)}, ${fmt(hi)}]$. Everywhere else the sign stays the same, so the table cannot promise a root there.` },
    ];
  },
};

/** Exactly one change of sign in the table, and no value too near zero to read. */
function fair(params: IntervalTableParams): boolean {
  const ys = tableXs(params).map((x) => tableValue(params, x));
  const least = params.step === 1 ? 0.5 : 0.002;
  if (ys.some((y) => Math.abs(y) < least || Math.abs(y) > 60)) return false;
  const changes = ys.slice(0, -1).filter((y, i) => y * ys[i + 1] < 0).length;
  return changes === 1;
}

interface SignFlowParams {
  kind: 'poly' | 'jump';
  p: number;
  q: number;
  a: number;
  /** Width of the interval. */
  w: number;
  /** `jump`: f(x) = k / (x - c). */
  k: number;
  c: number;
}

function signFlowF(params: SignFlowParams): (x: number) => number {
  return params.kind === 'jump'
    ? (x) => params.k / (x - params.c)
    : (x) => valueAt([1, 0, params.p, params.q], x);
}

function signFlowTex(params: SignFlowParams): string {
  return params.kind === 'jump'
    ? `f(x) = \\frac{${params.k}}{${linFactor(params.c)}}`
    : `f(x) = ${polyTex([1, 0, params.p, params.q])}`;
}

const sgn = (y: number) => (y < 0 ? 'Negative' : 'Positive');

/**
 * The whole sign-change argument as three decisions: continuous, the sign at
 * one end, the sign at the other. At difficulty 2 some are k/(x - c) with the
 * asymptote inside the interval.
 */
const signFlow: Generator<SignFlowParams> = {
  id: 'numer-sign-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1 && rng.chance(0.35)) {
        const a = rng.int(-3, 2);
        const w = rng.pick([1, 2]);
        const c = w === 1 ? a + 0.5 : a + 1;
        const k = nonZero(rng, 9);
        if (c === 0) continue;
        return { kind: 'jump', p: 0, q: 0, a, w, k, c };
      }
      const p = nonZero(rng, 9);
      const q = nonZero(rng, 9);
      const a = rng.int(-3, 2);
      const w = difficulty > 1 ? rng.pick([1, 2]) : 1;
      const f = (x: number) => valueAt([1, 0, p, q], x);
      const fa = f(a);
      const fb = f(a + w);
      if (fa === 0 || fb === 0 || Math.abs(fa) > 40 || Math.abs(fb) > 40) continue;
      // Half with a change of sign, half without, so neither answer is free.
      if (rng.chance(0.5) !== fa * fb < 0) continue;
      return { kind: 'poly', p, q, a, w, k: 0, c: 0 };
    }
  },
  render: (params): Slide => {
    const f = signFlowF(params);
    const { a, w } = params;
    const b = a + w;
    const ends = (first: 'Positive' | 'Negative') => {
      const other = first === 'Positive' ? 'Negative' : 'Positive';
      return [
        { label: first, outcome: 'No change of sign, so the test says nothing about a root here.' },
        { label: other, outcome: `A change of sign on a continuous curve: there is a root between $${a}$ and $${b}$.` },
      ];
    };
    return {
      kind: 'flow',
      prompt: [say(`Decide what the change-of-sign test tells you about $f$ on $[${a}, ${b}]$.`)],
      subject: signFlowTex(params),
      steps: [
        {
          id: 'cont',
          ask: `Is $f$ continuous on $[${a}, ${b}]$, with no gap or asymptote?`,
          branches: [
            { label: 'Yes', to: 'fa' },
            { label: 'No', outcome: 'Then a change of sign proves nothing: the graph can jump across the axis without meeting it.' },
          ],
        },
        {
          id: 'fa',
          ask: `Work out $f(${a})$. Is it positive or negative?`,
          branches: [
            { label: 'Positive', to: 'fbp' },
            { label: 'Negative', to: 'fbn' },
          ],
        },
        { id: 'fbp', ask: `And $f(${b})$?`, branches: turned(ends('Positive'), `${a}${b}p`) },
        { id: 'fbn', ask: `And $f(${b})$?`, branches: turned(ends('Negative'), `${a}${b}n`) },
      ],
      answer: params.kind === 'jump' ? ['No'] : ['Yes', sgn(f(a)), sgn(f(b))],
    };
  },
  solution: (params) => {
    const f = signFlowF(params);
    const { a, w } = params;
    const b = a + w;
    if (params.kind === 'jump') {
      return [
        { text: `$f$ has a vertical asymptote at $x = ${fmt(params.c)}$, inside $[${a}, ${b}]$, so it is not continuous there.` },
        { text: `$f(${a})$ and $f(${b})$ do have opposite signs, but the graph jumps from one side of the axis to the other at the asymptote. $f(x)$ is never $0$, so there is no root at all.` },
      ];
    }
    const change = f(a) * f(b) < 0;
    return [
      { text: '$f$ is a polynomial, so it is continuous everywhere.' },
      { tex: pairTex(a, f(a), b, f(b)) },
      {
        text: change
          ? `The sign changes, so there is a root between $${a}$ and $${b}$.`
          : 'Both have the same sign, so the test says nothing: there could be no root, or two, between them.',
      },
    ];
  },
};

interface SignValueParams extends CubicInterval {
  /** The point to evaluate at, strictly inside the interval. */
  c: number;
}

/**
 * f at a decimal point inside the interval, exactly: the value whose sign
 * says which part of the interval the root is in.
 */
const signValue: Generator<SignValueParams> = {
  id: 'numer-sign-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = sampleCubicInterval(rng, difficulty);
      const c = difficulty > 1 ? base.a + rng.pick([0.2, 0.3, 0.4, 0.6, 0.7, 0.8]) : base.a + 0.5;
      const value = valueAt(cubicOf(base), c);
      if (Math.abs(value) < 0.1) continue;
      return { ...base, c: Number(c.toFixed(1)) };
    }
  },
  choices: (params) => {
    const f = cubicOf(params);
    const { c } = params;
    const right = valueAt(f, c);
    const squared = c * c + params.r * c * c + params.p * c + params.q;
    const noConstant = right - params.q;
    return options(
      { tex: fmt(right), answer: fmt(right) },
      { tex: fmt(-right), answer: fmt(-right) },
      { tex: fmt(squared), answer: fmt(squared) },
      { tex: fmt(noConstant), answer: fmt(noConstant) },
      { tex: fmt(right + 1), answer: fmt(right + 1) },
    ).slice(0, 4);
  },
  render: (params): Slide => {
    const f = cubicOf(params);
    const { a, c } = params;
    return {
      kind: 'expression',
      prompt: [
        say(`$f(x) = ${polyTex(f)}$ changes sign on $[${a}, ${a + 1}]$. Find $f(${fmt(c)})$ exactly: its sign says which side of $${fmt(c)}$ the root is on.`),
      ],
      lead: `f(${fmt(c)}) =`,
      keypad: [],
      answer: fmt(valueAt(f, c)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const f = cubicOf(params);
    const { a, c } = params;
    const value = valueAt(f, c);
    const fa = valueAt(f, a);
    const side = value * fa < 0 ? `$[${a}, ${fmt(c)}]$` : `$[${fmt(c)}, ${a + 1}]$`;
    const times = (k: number, term: string) => (k === 1 ? term : k === -1 ? `-${term}` : `${k} \\times ${term}`);
    const pieces = [`${paren(c)}^{3}`];
    if (params.r !== 0) pieces.push(times(params.r, `${paren(c)}^{2}`));
    pieces.push(times(params.p, paren(c)), fmt(params.q));
    return [
      { text: 'Substitute, keeping every decimal place:' },
      {
        tex: aligned(
          `f(${fmt(c)}) &= ${pieces[0]}`,
          ...pieces.slice(1).map((piece) => `&\\quad ${piece.startsWith('-') ? `- ${piece.slice(1)}` : `+ ${piece}`}`),
          `&= ${fmt(value)}`,
        ),
      },
      { text: `$f(${a}) = ${fmt(fa)}$, so the sign changes on ${side}: the root is there.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 2: where the sign test fails
 * ================================================================ */

type FailKind = 'root' | 'jump' | 'touch' | 'two';

interface FailPictureParams {
  kind: FailKind;
  /** Interval [a, a + 2]. */
  a: number;
  /** Which way up the curve is drawn. */
  s: number;
  /** Where the feature sits inside the interval, as a distance from a. */
  at: number;
  /** Half the gap between two roots. */
  w: number;
  /** Difficulty 2: the interval is only named, on squared paper. */
  hard: boolean;
}

const FAIL_LABELS: Record<FailKind, string> = {
  root: 'A change of sign, and a root between',
  jump: 'A change of sign, but no root: the graph jumps',
  touch: 'No change of sign, but a root where the curve touches',
  two: 'No change of sign, but two roots between',
};

function failCurve({ kind, a, s, at, w }: FailPictureParams): (x: number) => number {
  const m = a + at;
  switch (kind) {
    case 'root':
      return (x) => s * (x - m) * (1 + 0.15 * (x - m) * (x - m));
    case 'jump':
      return (x) => s / (x - m);
    case 'touch':
      return (x) => s * 0.9 * (x - m) * (x - m);
    case 'two':
      return (x) => s * ((x - m) * (x - m) - w * w);
  }
}

/**
 * What the sign test finds, and what is really there, from a picture. At
 * difficulty 2 the interval is only named, on squared paper, and the two
 * roots sit closer together.
 */
const failPicture: Generator<FailPictureParams> = {
  id: 'numer-fail-picture',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick<FailKind>(['root', 'jump', 'touch', 'two']);
    return {
      kind,
      a: rng.int(-3, 1),
      s: rng.sign(),
      at: rng.pick([0.6, 0.8, 1, 1.2, 1.4]),
      w: hard ? rng.pick([0.25, 0.3, 0.35]) : rng.pick([0.45, 0.5, 0.55]),
      hard,
    };
  },
  render: (params): Slide => {
    const { a, hard } = params;
    const b = a + 2;
    const svg = plotSvg({
      xMin: -4,
      xMax: 4,
      yMin: -4,
      yMax: 4,
      grid: hard,
      curves: [{ f: clamped(failCurve(params), 9), breaks: params.kind === 'jump' }],
      verticals: hard ? [] : [{ x: a }, { x: b }],
      label: `A curve, with the interval from ${a} to ${b}${hard ? '' : ' between dashed lines'}`,
    });
    return choiceSlide(
      [
        say(
          hard
            ? `Someone checks the signs of $f(${a})$ and $f(${b})$ for the curve $y = f(x)$ below. What do they find, and what is really there?`
            : `Someone checks the signs of $f$ at the dashed lines, $x = ${a}$ and $x = ${b}$. What do they find, and what is really there?`,
        ),
        { kind: 'diagram', svg },
      ],
      (Object.keys(FAIL_LABELS) as FailKind[]).map((kind) => ({ tex: FAIL_LABELS[kind], correct: kind === params.kind })),
      false,
    );
  },
  solution: (params) => {
    const { a } = params;
    const b = a + 2;
    switch (params.kind) {
      case 'root':
        return [
          { text: `The curve is on opposite sides of the axis at $x = ${a}$ and $x = ${b}$, and it is unbroken, so it crosses once in between.` },
          { text: 'Here the test works: a change of sign, and a root.' },
        ];
      case 'jump':
        return [
          { text: 'The ends are on opposite sides of the axis, so the signs do change.' },
          { text: 'But the curve never meets the axis: it jumps across at a vertical asymptote. A change of sign only proves a root when $f$ is continuous.' },
        ];
      case 'touch':
        return [
          { text: 'Both ends are on the same side of the axis, so there is no change of sign.' },
          { text: 'Yet the curve touches the axis between them: a repeated root, where $f$ reaches $0$ without changing sign.' },
        ];
      case 'two':
        return [
          { text: 'Both ends are on the same side of the axis, so there is no change of sign.' },
          { text: 'The curve crosses down and back up again in between, so there are two roots. Split the interval and test each half.' },
        ];
    }
  },
};

interface FailFlowParams {
  kind: 'jump' | 'shifted' | 'poly' | 'same';
  a: number;
  w: number;
  /** k / (x - c) - m for the rational kinds. */
  k: number;
  c: number;
  m: number;
  /** x^2 + p x + q, or x^3 + p x + q, for the polynomial kinds. */
  p: number;
  q: number;
}

function failFlowF(params: FailFlowParams): (x: number) => number {
  const { kind, k, c, m, p, q } = params;
  if (kind === 'jump' || kind === 'shifted') return (x) => k / (x - c) - m;
  if (kind === 'same') return (x) => x * x + p * x + q;
  return (x) => cube(x) + p * x + q;
}

function failFlowTex(params: FailFlowParams): string {
  const { kind, k, c, m, p, q } = params;
  if (kind === 'jump' || kind === 'shifted') {
    const frac = `\\frac{${k}}{${c === 0 ? 'x' : linFactor(c)}}`;
    return m === 0 ? `f(x) = ${frac}` : `f(x) = ${frac} ${signed(-m)}`;
  }
  if (kind === 'same') return `f(x) = ${polyTex([1, p, q])}`;
  return `f(x) = ${polyTex([1, 0, p, q])}`;
}

/**
 * Two questions in order: do the signs differ, and is f continuous? Rational
 * functions with the asymptote inside and outside the interval, and
 * polynomials with and without a change of sign.
 */
const failFlow: Generator<FailFlowParams> = {
  id: 'numer-fail-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const kind = rng.pick<FailFlowParams['kind']>(hard ? ['jump', 'shifted', 'jump', 'same'] : ['jump', 'poly', 'same']);
      const a = rng.int(-3, 3);
      const w = rng.pick([1, 2]);
      const base = { kind, a, w, k: 0, c: 0, m: 0, p: 0, q: 0 };
      let params: FailFlowParams;
      if (kind === 'jump') {
        // The asymptote in the middle of [a, a + 2].
        params = { ...base, w: 2, k: nonZero(rng, 9), c: a + 1, m: hard ? rng.int(-2, 2) : 0 };
        if (params.c === 0) continue;
      } else if (kind === 'shifted') {
        // A root at c + k/m, inside the interval, with the asymptote outside.
        const k = rng.int(2, 9);
        const m = rng.int(1, 4) * rng.sign();
        const c = rng.int(-3, 3);
        const root = c + k / m;
        const lo = Math.floor(root) - (rng.chance(0.5) ? 1 : 0);
        if (Number.isInteger(root) || (lo <= c && c <= lo + 2) || Math.abs(root) > 6) continue;
        params = { ...base, a: lo, w: 2, k, c, m };
        if (Math.abs(root - lo) < 0.2 || Math.abs(lo + 2 - root) < 0.2) continue;
      } else if (kind === 'same') {
        params = { ...base, p: rng.int(-6, 6), q: rng.int(-9, 9) };
      } else {
        params = { ...base, p: nonZero(rng, 9), q: nonZero(rng, 9) };
      }
      const f = failFlowF(params);
      const fa = f(params.a);
      const fb = f(params.a + params.w);
      if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa === 0 || fb === 0) continue;
      if (Math.abs(fa) > 40 || Math.abs(fb) > 40) continue;
      if (!terminates(fa, 2) || !terminates(fb, 2)) continue;
      if (params.kind === 'same' && fa * fb < 0) continue;
      if ((params.kind === 'poly' || params.kind === 'shifted' || params.kind === 'jump') && !(fa * fb < 0)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { a, w, kind } = params;
    const b = a + w;
    return {
      kind: 'flow',
      prompt: [say(`Does the change-of-sign test show a root of $f(x) = 0$ in $[${a}, ${b}]$?`)],
      subject: failFlowTex(params),
      steps: [
        {
          id: 'signs',
          ask: `Work out $f(${a})$ and $f(${b})$. Do they have different signs?`,
          branches: [
            { label: 'Yes', to: 'cont' },
            { label: 'No', outcome: 'No change of sign, so the test cannot say: there may be no root, two roots, or a touch.' },
          ],
        },
        {
          id: 'cont',
          ask: `Is $f$ continuous on the whole of $[${a}, ${b}]$?`,
          branches: [
            { label: 'Yes', outcome: `Then there is a root between $${a}$ and $${b}$.` },
            { label: 'No', outcome: 'No conclusion: the sign changes across the asymptote, not at a root.' },
          ],
        },
      ],
      answer: kind === 'same' ? ['No'] : kind === 'jump' ? ['Yes', 'No'] : ['Yes', 'Yes'],
    };
  },
  solution: (params) => {
    const f = failFlowF(params);
    const { a, w, kind, c } = params;
    const b = a + w;
    const values = { tex: pairTex(a, f(a), b, f(b)) };
    if (kind === 'same') {
      return [values, { text: 'The same sign at both ends, so the test says nothing either way.' }];
    }
    if (kind === 'jump') {
      return [
        values,
        { text: `The signs differ, but $f$ has an asymptote at $x = ${fmt(c)}$, inside the interval.` },
        { text: 'The graph jumps across the axis there, so the change of sign does not show a root.' },
      ];
    }
    return [
      values,
      {
        text:
          kind === 'poly'
            ? 'The signs differ, and a polynomial is continuous, so there is a root between them.'
            : `The signs differ, and the only asymptote, $x = ${c}$, is outside the interval, so $f$ is continuous on it: there is a root between them.`,
      },
    ];
  },
};

interface TouchParams {
  /** Touches the axis at t, crosses it at u. */
  t: number;
  u: number;
  /** -1 draws it upside down. */
  s: number;
  /** Difficulty 2 writes the crossing factor first. */
  crossingFirst: boolean;
}

/**
 * A curve that touches the axis at one root and crosses at another: complete
 * its equation from the graph. The touch is exactly where a sign test would
 * see nothing.
 */
const touchTiles: Generator<TouchParams> = {
  id: 'numer-touch-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const t = rng.int(-3, 3);
      const u = rng.int(-3, 3);
      if (t === 0 || u === 0 || t === u) continue;
      const hard = difficulty > 1;
      return { t, u, s: hard ? rng.sign() : 1, crossingFirst: hard && rng.chance(0.5) };
    }
  },
  render: ({ t, u, s, crossingFirst }): Slide => {
    const token = (root: number) => (root < 0 ? `+ ${-root}` : `- ${root}`);
    const lead = s < 0 ? '-' : '';
    const template = crossingFirst ? `y = ${lead}(x {0})(x {1})^2` : `y = ${lead}(x {0})^2(x {1})`;
    const answer = crossingFirst ? [token(u), token(t)] : [token(t), token(u)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          'The curve crosses the axis at one root and only touches it at another, where a sign test would see no change of sign. Complete its equation.',
        ),
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: -4,
            xMax: 4,
            yMin: -8,
            yMax: 8,
            grid: true,
            curves: [{ f: clamped((x) => s * (x - t) * (x - t) * (x - u), 20) }],
            label: `A cubic curve on squared paper, touching the x-axis at ${t} and crossing it at ${u}`,
          }),
        },
      ],
      template,
      bank: fillBank(answer, [token(-t), token(-u), token(t + (t > 0 ? 1 : -1)), token(u + (u > 0 ? 1 : -1))]),
      answer,
    };
  },
  solution: ({ t, u, s }) => [
    { text: `The curve touches the axis at $x = ${t}$ without crossing, so that root is repeated: $(${linFactor(t)})^{2}$.` },
    { text: `It crosses at $x = ${u}$, a single root: $(${linFactor(u)})$.` },
    { tex: `y = ${s < 0 ? '-' : ''}(${linFactor(t)})^{2}(${linFactor(u)})` },
    { text: `Near $x = ${t}$ the curve stays on one side of the axis, so $f$ has the same sign either side of that root, and a sign test there finds nothing.` },
  ],
};

interface SplitParams {
  /** f(x) = k x^2 + b x + c at difficulty 1, or a cubic k x^3 + ... at 2. */
  poly: Poly;
  a: number;
  /** The interval is [a, a + len]. */
  len: number;
  /** Where to evaluate. */
  t: number;
}

/**
 * Both ends positive, yet two roots between: evaluate f at a point inside and
 * find the dip below the axis that splits the interval in two.
 */
const splitValue: Generator<SplitParams> = {
  id: 'numer-split-value',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1) {
        // A cubic with two roots inside a unit interval, tested at its
        // midpoint: k(x - m)^2 - d has roots m ± sqrt(d/k), inside when d < k/4,
        // and whole coefficients when k is 16 or 36. The third factor is
        // positive across the interval.
        const a = rng.int(-2, 2);
        const k = rng.pick([16, 36]);
        const d = rng.int(1, k / 4 - 1);
        const m2 = 2 * a + 1;
        const quad = [k, -k * m2, (k * m2 * m2) / 4 - d];
        const r3 = rng.chance(0.5) ? a - rng.int(1, 3) : a + 1 + rng.int(1, 3);
        const lin = r3 < a ? [1, -r3] : [-1, r3];
        const poly = [
          quad[0] * lin[0],
          quad[0] * lin[1] + quad[1] * lin[0],
          quad[1] * lin[1] + quad[2] * lin[0],
          quad[2] * lin[1],
        ];
        const f = (x: number) => valueAt(poly, x);
        const t = a + 0.5;
        if (f(a) > 60 || f(a + 1) > 60 || r3 === 0) continue;
        return { poly, a, len: 1, t };
      }
      // A quadratic dipping to -d at a whole number t inside the interval.
      const k = rng.int(2, 6);
      const len = rng.pick([2, 3]);
      const t = rng.int(-3, 3);
      const a = t - rng.int(1, len - 1);
      const b = rng.int(-4, 4);
      const d = rng.int(1, 9);
      const poly = [k, b - 2 * k * t, k * t * t - b * t - d];
      const f = (x: number) => valueAt(poly, x);
      if (f(a) <= 0 || f(a + len) <= 0 || f(a) > 40 || f(a + len) > 40) continue;
      return { poly, a, len, t };
    }
  },
  render: ({ poly, a, len, t }): Slide => {
    const f = (x: number) => valueAt(poly, x);
    const b = a + len;
    return {
      kind: 'expression',
      prompt: [
        say(
          `$f(x) = ${polyTex(poly)}$. Both $f(${a}) = ${fmt(f(a))}$ and $f(${b}) = ${fmt(f(b))}$ are positive, so the sign test finds nothing on $[${a}, ${b}]$. Find $f(${fmt(t)})$.`,
        ),
      ],
      lead: `f(${fmt(t)}) =`,
      keypad: [],
      answer: fmt(f(t)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ poly, a, len, t }) => {
    const f = (x: number) => valueAt(poly, x);
    const b = a + len;
    return [
      { text: `Substitute $x = ${fmt(t)}$:` },
      { tex: `f(${fmt(t)}) = ${fmt(f(t))}` },
      { text: `That is negative, while $f(${a})$ and $f(${b})$ are positive. So the sign changes twice: once on $[${a}, ${fmt(t)}]$ and again on $[${fmt(t)}, ${b}]$.` },
      { text: 'There are two roots in the interval, which the test on its ends could not see.' },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 3: rearranging to x = g(x)
 * ================================================================ */

type Shape = 'cbrt' | 'sqrt' | 'divide' | 'recip';

interface RearrangeParams {
  shape: Shape;
  /**
   * cbrt, divide: x^3 + P x + Q = 0.
   * sqrt: x^2 + P x + Q = 0.
   * recip: x^2 + P x - Q = 0, so x(x + P) = Q.
   */
  P: number;
  Q: number;
}

/** The equation as the learner reads it. */
function equationTex({ shape, P, Q }: RearrangeParams): string {
  if (shape === 'sqrt') return `${polyTex([1, P, Q])} = 0`;
  if (shape === 'recip') return `${polyTex([1, P, -Q])} = 0`;
  return `${polyTex([1, 0, P, Q])} = 0`;
}

/** `3x + 5` with a coefficient token and a signed constant token. */
const coefToken = (c: number) => fmt(c);

/**
 * The rearrangement as tiles: the shape is set in the template, and the
 * learner supplies the numbers with their signs. Every sign slip is in the
 * bank, since moving a term across is where they happen.
 */
const rearrangeTiles: Generator<RearrangeParams> = {
  id: 'numer-rearrange-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const shape = rng.pick<Shape>(hard ? ['cbrt', 'divide', 'recip', 'sqrt'] : ['cbrt', 'sqrt', 'divide']);
    for (;;) {
      const P = rng.int(-9, 9);
      const Q = nonZero(rng, 9);
      if (Math.abs(P) < 2) continue;
      // A coefficient -3 and a constant - 3 would draw as the same tile.
      if (Math.abs(P) === Math.abs(Q)) continue;
      // At difficulty 1 the terms move across to positive numbers.
      if (!hard && (shape === 'cbrt' || shape === 'sqrt') && (P > 0 || Q > 0)) continue;
      if (!hard && shape === 'divide' && P > 0) continue;
      if (shape === 'recip' && Q < 0) continue;
      return { shape, P, Q };
    }
  },
  render: (params): Slide => {
    const { shape, P, Q } = params;
    let template: string;
    let answer: string[];
    let slips: string[];
    switch (shape) {
      case 'cbrt':
      case 'sqrt':
        template = `x = ({0}x {1})^{1/${shape === 'cbrt' ? 3 : 2}}`;
        answer = [coefToken(-P), signed(-Q)];
        slips = [coefToken(P), signed(Q)];
        break;
      case 'divide':
        template = 'x = (x^3 {0}) \\div {1}';
        answer = [signed(Q), coefToken(-P)];
        slips = [signed(-Q), coefToken(P)];
        break;
      case 'recip':
        template = 'x = {0} \\div (x {1})';
        answer = [fmt(Q), signed(P)];
        slips = [fmt(-Q), signed(-P)];
        break;
    }
    return {
      kind: 'tiles',
      prompt: [say('Rearrange the equation into the form below, ready to iterate.'), show(equationTex(params))],
      template,
      bank: fillBank(answer, slips),
      answer,
    };
  },
  solution: (params) => {
    const { shape, P, Q } = params;
    switch (shape) {
      case 'cbrt':
        return [
          { text: 'Keep $x^{3}$ on the left and move the other terms across, changing their signs:' },
          { tex: `x^{3} = ${polyTex([-P, -Q])}` },
          { text: 'Then take the cube root of both sides:' },
          { tex: `x = \\sqrt[3]{${polyTex([-P, -Q])}}` },
        ];
      case 'sqrt':
        return [
          { text: 'Keep $x^{2}$ on the left and move the other terms across, changing their signs:' },
          { tex: `x^{2} = ${polyTex([-P, -Q])}` },
          { text: 'Then take the square root of both sides:' },
          { tex: `x = \\sqrt{${polyTex([-P, -Q])}}` },
        ];
      case 'divide':
        return [
          { text: `Move the $x$ term to one side on its own:` },
          { tex: `${termTex(-P, 1)} = ${polyTex([1, 0, 0, Q])}` },
          { text: `Then divide by $${-P}$:` },
          { tex: `x = \\frac{${polyTex([1, 0, 0, Q])}}{${-P}}` },
        ];
      case 'recip':
        return [
          { text: 'Move the constant across and factorise the left side:' },
          { tex: `x(${polyTex([1, P])}) = ${Q}` },
          { text: `Then divide by $${polyTex([1, P])}$:` },
          { tex: `x = \\frac{${Q}}{${polyTex([1, P])}}` },
        ];
    }
  },
};

interface SchemeParams {
  shape: Shape;
  /** The scheme's own numbers: sqrt[3]{a x + b}, sqrt{a x + b}, (x^3 + b)/a, a/(x + b). */
  a: number;
  b: number;
}

function schemeTex({ shape, a, b }: SchemeParams): string {
  switch (shape) {
    case 'cbrt':
      return `x_{n+1} = \\sqrt[3]{${polyTex([a, b], 'x_n')}}`;
    case 'sqrt':
      return `x_{n+1} = \\sqrt{${polyTex([a, b], 'x_n')}}`;
    case 'divide':
      return `x_{n+1} = \\frac{${polyTex([1, 0, 0, b], 'x_n')}}{${a}}`;
    case 'recip':
      return `x_{n+1} = \\frac{${a}}{${polyTex([1, b], 'x_n')}}`;
  }
}

/** The equation a scheme solves, as coefficients of f(x) = 0. */
function schemeEquation({ shape, a, b }: SchemeParams): Poly {
  switch (shape) {
    case 'cbrt':
      return [1, 0, -a, -b];
    case 'sqrt':
      return [1, -a, -b];
    case 'divide':
      return [1, 0, -a, b];
    case 'recip':
      return [1, b, -a];
  }
}

/**
 * The other direction: given the scheme, which equation is its limit a root
 * of? The slips are the sign errors of undoing it, and the wrong power.
 */
const schemeEquationChoice: Generator<SchemeParams> = {
  id: 'numer-scheme-equation',
  sample: (rng, difficulty) => {
    const shape = rng.pick<Shape>(difficulty > 1 ? ['divide', 'recip', 'cbrt'] : ['cbrt', 'sqrt']);
    return { shape, a: rng.int(2, 9), b: nonZero(rng, 9) };
  },
  render: (params): Slide => {
    const right = schemeEquation(params);
    const n = right.length;
    const flip = (p: Poly, i: number) => p.map((c, k) => (k === i ? -c : c));
    // The other power: a cube where a square belongs, or the reverse.
    const other = n === 4 ? [1, right[2], right[3]] : [1, 0, right[1], right[2]];
    const wrong = [flip(right, n - 1), flip(right, n - 2), flip(flip(right, n - 1), n - 2), other];
    const eq = (p: Poly) => `${polyTex(p)} = 0`;
    return choiceSlide(
      [say('The iteration below converges. Its limit is a root of which equation?'), show(schemeTex(params))],
      options({ tex: eq(right) }, ...wrong.map((p) => ({ tex: eq(p) }))).slice(0, 4),
    );
  },
  solution: (params) => {
    const right = schemeEquation(params);
    const { shape, a, b } = params;
    const at = shape === 'divide' ? `\\frac{${polyTex([1, 0, 0, b])}}{${a}}` : shape === 'recip' ? `\\frac{${a}}{${polyTex([1, b])}}` : shape === 'cbrt' ? `\\sqrt[3]{${polyTex([a, b])}}` : `\\sqrt{${polyTex([a, b])}}`;
    const undo =
      shape === 'cbrt'
        ? 'Cube both sides'
        : shape === 'sqrt'
          ? 'Square both sides'
          : shape === 'divide'
            ? `Multiply both sides by $${a}$`
            : `Multiply both sides by $${polyTex([1, b])}$`;
    return [
      { text: 'At the limit, $x_{n+1}$ and $x_n$ are the same number $x$:' },
      { tex: `x = ${at}` },
      { text: `${undo}, then bring everything to one side:` },
      { tex: `${polyTex(right)} = 0` },
    ];
  },
};

interface FirstIterateParams {
  shape: 'square' | 'recip' | 'cube';
  a: number;
  b: number;
  x0: number;
}

function firstIterate({ shape, a, b, x0 }: FirstIterateParams): number {
  if (shape === 'recip') return a / (x0 + b);
  const power = shape === 'cube' ? cube(x0) : x0 * x0;
  return (power + b) / a;
}

function firstSchemeTex({ shape, a, b }: FirstIterateParams): string {
  if (shape === 'recip') return `x_{n+1} = \\frac{${a}}{${polyTex([1, b], 'x_n')}}`;
  return `x_{n+1} = \\frac{${polyTex(shape === 'cube' ? [1, 0, 0, b] : [1, 0, b], 'x_n')}}{${a}}`;
}

/**
 * x_1 from x_0, one operation at a time: the power, the bracket, the
 * division. Every value is an exact decimal.
 */
const firstIterateSteps: Generator<FirstIterateParams> = {
  id: 'numer-first-iterate-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const shape = rng.pick<FirstIterateParams['shape']>(hard ? ['square', 'cube', 'recip'] : ['square', 'recip']);
      const a = shape === 'recip' ? rng.int(2, 12) : rng.pick([2, 4, 5, 8, 10]);
      const b = shape === 'recip' ? rng.int(1, 6) : nonZero(rng, 9);
      const x0 = hard ? rng.pick([0.5, 1.5, 2.5, 1, 2, 3]) : rng.int(1, 4);
      const params = { shape, a, b, x0 };
      const x1 = firstIterate(params);
      if (!terminates(x1, 3) || Math.abs(x1 - x0) < 0.1 || Math.abs(x1) > 20) continue;
      if (shape !== 'recip' && (x0 * x0 + b === 0 || cube(x0) + b === 0)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { shape, a, b, x0 } = params;
    const x1 = firstIterate(params);
    const prompt = [
      say(`Work out $x_1$ from $x_0 = ${fmt(x0)}$. Tap the part you would do next, then choose what it comes to.`),
      show(firstSchemeTex(params)),
    ];
    if (shape === 'recip') {
      const inside = x0 + b;
      return {
        kind: 'steps',
        prompt,
        start: [String(a), '\\div', '(', fmt(x0), '+', String(b), ')'],
        reductions: [
          { span: [2, 7], operator: 4, value: fmt(inside), bank: stepBank(fmt(inside), fmt(x0 * b), fmt(inside + 1), fmt(x0 - b)) },
          { span: [0, 3], operator: 1, value: fmt(x1), bank: stepBank(fmt(x1), fmt(inside / a), fmt(a - inside), fmt(x1 * 10)) },
        ],
      };
    }
    const k = shape === 'cube' ? 3 : 2;
    const power = x0 ** k;
    const top = power + b;
    return {
      kind: 'steps',
      prompt,
      start: ['(', `${fmt(x0)}^${k}`, b < 0 ? '-' : '+', String(Math.abs(b)), ')', '\\div', String(a)],
      reductions: [
        { span: [1, 2], value: fmt(power), bank: stepBank(fmt(power), fmt(k * x0), fmt(x0 + k), fmt(power + 1)) },
        { span: [0, 5], operator: 2, value: fmt(top), bank: stepBank(fmt(top), fmt(power - b), fmt(top + 1), fmt(-top)) },
        { span: [0, 3], operator: 1, value: fmt(x1), bank: stepBank(fmt(x1), fmt(a / top), fmt(top - a), fmt(x1 * 10)) },
      ],
    };
  },
  solution: (params) => {
    const { shape, a, b, x0 } = params;
    const x1 = firstIterate(params);
    if (shape === 'recip') {
      return [
        { text: `Put $x_0 = ${fmt(x0)}$ into the scheme. The bracket first:` },
        { tex: `${fmt(x0)} ${signed(b)} = ${fmt(x0 + b)}` },
        { tex: `x_1 = \\frac{${a}}{${fmt(x0 + b)}} = ${fmt(x1)}` },
      ];
    }
    const k = shape === 'cube' ? 3 : 2;
    return [
      { text: `Put $x_0 = ${fmt(x0)}$ into the scheme. The power first:` },
      { tex: `${fmt(x0)}^{${k}} = ${fmt(x0 ** k)}` },
      { tex: `${fmt(x0 ** k)} ${signed(b)} = ${fmt(x0 ** k + b)}` },
      { tex: `x_1 = \\frac{${fmt(x0 ** k + b)}}{${a}} = ${fmt(x1)}` },
    ];
  },
};

/* ================================================================
 * Iteration tables: copies of the private helpers in iterationTable.ts
 * ================================================================ */

/** Cut off rather than rounded: the most common slip in a table like this. */
function truncated(value: number, dp: number): string {
  const unit = 10 ** dp;
  return (Math.trunc(value * unit + Math.sign(value) * 1e-9) / unit).toFixed(dp);
}

/** One unit in the last place away, the other way from how it rounded. */
function roundedWrongWay(value: number, dp: number): string {
  const unit = 10 ** dp;
  const scaled = value * unit;
  const other = scaled - Math.floor(scaled) >= 0.5 ? Math.floor(scaled) : Math.ceil(scaled);
  return (other / unit).toFixed(dp);
}

function sortTokens(tokens: string[]): string[] {
  return [...tokens].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));
}

/** `x_0` to `x_{steps}` in full precision, or undefined if a step leaves the domain. */
function run(step: (x: number) => number, x0: number, steps: number): number[] | undefined {
  const values = [x0];
  for (let n = 0; n < steps; n += 1) {
    const next = step(values[n]);
    if (!Number.isFinite(next) || Math.abs(next) > 1e3) return undefined;
    values.push(next);
  }
  return values;
}

/** The rows for a learner who carries each written value forward. */
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

/** Where a scheme settles, iterating until it stops moving. */
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

/** The answer as a multiset, then distractors really different from every token. */
function iterateBank(answer: string[], distractors: (string | undefined)[], most = 3): string[] | undefined {
  const extras: string[] = [];
  for (const token of distractors) {
    if (token === undefined || answer.includes(token) || extras.includes(token)) continue;
    if (/^-0\.0*$/.test(token)) continue;
    extras.push(token);
    if (extras.length === most) break;
  }
  if (extras.length < 2) return undefined;
  return sortTokens([...answer, ...extras]);
}

/** One line per row: the value to a few more places, then what is written. */
function rowSteps(values: number[], tokens: string[]): SolutionStep[] {
  const dp = tokens[0].split('.')[1]?.length ?? 0;
  return tokens.map((token, idx) => {
    const value = values[idx + 1];
    const long = value.toFixed(dp + 3);
    const more = Math.abs(Number(long) - value) < 1e-12 ? '' : '\\ldots';
    return { text: `$x_{${idx + 1}} = ${long}${more}$, written $${token}$` };
  });
}

interface IterationTable {
  values: number[];
  rows: string[];
  root: number;
  rootToken: string;
}

/**
 * A table whose last row has settled on the root to `dp` places, after at
 * least two rows of real work. Undefined for any draw that is not fair.
 */
function settledTable(step: (x: number) => number, x0: number, dp: number): IterationTable | undefined {
  const values = run(step, x0, ITERATES);
  if (!values || values.some((x) => Math.abs(x) > 50)) return undefined;
  const tokens = values.slice(1).map((x) => written(x, dp));
  if (tokens.some((token) => token === undefined)) return undefined;
  const rows = tokens as string[];
  const carried = carriedRounded(step, x0, dp);
  if (!carried || carried.some((token, idx) => token !== rows[idx])) return undefined;
  if (rows[0] === x0.toFixed(dp)) return undefined;
  const root = limitOf(step, x0);
  if (root === undefined) return undefined;
  const rootToken = written(root, dp);
  if (rootToken === undefined) return undefined;
  if (rows[ITERATES - 1] !== rootToken || rows[1] === rootToken) return undefined;
  return { values, rows, root, rootToken };
}

/* ================================================================
 * Level 1, lesson 4: staircases and cobwebs
 * ================================================================ */

/**
 * y = g(x), y = x and the path of an iteration, on square axes from 0 to
 * `hi`. Drawn to scale with no inset, so a slider's marker declared over
 * [0, hi] lines up with it exactly, as `vectorSvg` does.
 *
 * `legs` counts the path's segments from (x_0, 0): up to the curve, across to
 * y = x, up or down to the curve, and so on.
 */
export function cobwebSvg(
  g: (x: number) => number,
  opts: { hi: number; x0: number; legs: number; label: string },
): string {
  const SIZE = 240;
  const { hi, x0, legs } = opts;
  const clamp = (v: number) => Math.max(-hi, Math.min(2 * hi, v));
  const sx = (v: number) => ((SIZE * clamp(v)) / hi).toFixed(1);
  const sy = (v: number) => ((SIZE * (hi - clamp(v))) / hi).toFixed(1);
  const parts = [`<svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" role="img" aria-label="${opts.label}">`];
  for (let t = 1; t < hi; t += 1) {
    parts.push(
      `<line x1="${sx(t)}" y1="${SIZE}" x2="${sx(t)}" y2="${SIZE - 6}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
      `<line x1="0" y1="${sy(t)}" x2="6" y2="${sy(t)}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    );
  }
  parts.push(
    `<line x1="0" y1="${SIZE}" x2="${SIZE}" y2="${SIZE}" stroke="currentColor" stroke-width="1.5" opacity="0.55" />`,
    `<line x1="0" y1="0" x2="0" y2="${SIZE}" stroke="currentColor" stroke-width="1.5" opacity="0.55" />`,
    `<line x1="0" y1="${SIZE}" x2="${SIZE}" y2="0" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4" opacity="0.6" />`,
  );
  const SAMPLES = 160;
  const curve: string[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const x = (hi * i) / SAMPLES;
    curve.push(`${i === 0 ? 'M' : 'L'} ${sx(x)},${sy(g(x))}`);
  }
  parts.push(`<path fill="none" stroke="currentColor" stroke-width="2" d="${curve.join(' ')}" />`);
  if (legs > 0) {
    const points: [number, number][] = [[x0, 0]];
    let x = x0;
    for (let leg = 0; leg < legs; leg += 1) {
      if (leg % 2 === 0) {
        points.push([x, g(x)]);
      } else {
        x = g(x);
        points.push([x, x]);
      }
      if (Math.abs(x) > 2 * hi) break;
    }
    const d = points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${sx(px)},${sy(py)}`).join(' ');
    parts.push(`<path class="plot-accent" fill="none" stroke="currentColor" stroke-width="2" d="${d}" />`);
  }
  parts.push(`<circle cx="${sx(x0)}" cy="${SIZE}" r="4" fill="currentColor" />`);
  parts.push('</svg>');
  return parts.join('');
}

type CobwebKind = 'stair-in' | 'stair-out' | 'web-in' | 'web-out';

interface CobwebChoiceParams {
  kind: CobwebKind;
  alpha: number;
  m: number;
  /** A little curvature, so the line looks like a curve. */
  c: number;
  x0: number;
}

const COBWEB_LABELS: Record<CobwebKind, string> = {
  'stair-in': 'A staircase, closing in on the root',
  'stair-out': 'A staircase, moving away from the root',
  'web-in': 'A cobweb, closing in on the root',
  'web-out': 'A cobweb, spiralling away from the root',
};

const cobwebG = ({ alpha, m, c }: CobwebChoiceParams) => (x: number) => alpha + m * (x - alpha) + c * (x - alpha) * (x - alpha);

/**
 * Name the diagram: staircase or cobweb, closing in or moving away. At
 * difficulty 2 the gradient at the root is nearer ±1, so the path changes
 * slowly either way.
 */
const cobwebChoice: Generator<CobwebChoiceParams> = {
  id: 'numer-cobweb-choice',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick<CobwebKind>(['stair-in', 'stair-out', 'web-in', 'web-out']);
    const size: Record<CobwebKind, number[]> = hard
      ? { 'stair-in': [0.7, 0.8], 'stair-out': [1.25, 1.35], 'web-in': [-0.7, -0.8], 'web-out': [-1.2, -1.3] }
      : { 'stair-in': [0.3, 0.45, 0.6], 'stair-out': [1.6, 1.9], 'web-in': [-0.35, -0.5, -0.65], 'web-out': [-1.5, -1.8] };
    const alpha = rng.pick([2, 2.5, 3, 3.5]);
    const inward = kind.endsWith('in');
    const offset = (inward ? rng.pick([1.2, 1.5, 1.8]) : rng.pick([0.3, 0.4, 0.5])) * rng.sign();
    return { kind, alpha, m: rng.pick(size[kind]), c: rng.pick([-0.05, 0, 0.05]), x0: alpha + offset };
  },
  render: (params): Slide => {
    const svg = cobwebSvg(cobwebG(params), { hi: 6, x0: params.x0, legs: 12, label: 'The curve y = g(x), the line y = x, and the path of the iteration from x_0' });
    return choiceSlide(
      [say('The diagram shows $y = g(x)$, the dashed line $y = x$, and the path of $x_{n+1} = g(x_n)$ from $x_0$. What does it show?'), { kind: 'diagram', svg }],
      (Object.keys(COBWEB_LABELS) as CobwebKind[]).map((kind) => ({ tex: COBWEB_LABELS[kind], correct: kind === params.kind })),
      false,
    );
  },
  solution: ({ kind, m }) => {
    const stair = kind.startsWith('stair');
    const inward = kind.endsWith('in');
    return [
      {
        text: stair
          ? 'The path steps the same way every time, never crossing the root: a staircase. That happens when $g$ slopes upward at the root.'
          : 'The path swings from one side of the root to the other: a cobweb. That happens when $g$ slopes downward at the root.',
      },
      {
        text: inward
          ? 'Each step is shorter than the one before, so the iteration closes in on the root.'
          : 'Each step is longer than the one before, so the iteration moves away from the root.',
      },
      { text: `Here $g'(\\alpha) = ${fmt(m)}$, and $|g'(\\alpha)| ${Math.abs(m) < 1 ? '<' : '>'} 1$.` },
    ];
  },
};

interface CobwebSliderParams {
  shape: 'square' | 'recip';
  a: number;
  b: number;
  x0: number;
  /** 1 asks for x_1; 2 draws the first step and asks for x_2. */
  target: 1 | 2;
}

const sliderG = ({ shape, a, b }: CobwebSliderParams) =>
  shape === 'recip' ? (x: number) => a / (x + b) : (x: number) => (x * x + b) / a;

function sliderSchemeTex({ shape, a, b }: CobwebSliderParams): string {
  return shape === 'recip'
    ? `x_{n+1} = \\frac{${a}}{${polyTex([1, b], 'x_n')}}`
    : `x_{n+1} = \\frac{${polyTex([1, 0, b], 'x_n')}}{${a}}`;
}

const COBWEB_HI = 6;

/** The value asked for, and what the slider snaps to: the nearest tenth. */
function sliderTarget(params: CobwebSliderParams): { exact: number; snapped: number } {
  const g = sliderG(params);
  const exact = params.target === 1 ? g(params.x0) : g(g(params.x0));
  return { exact, snapped: Math.round(exact * 10) / 10 };
}

/**
 * Follow the path to the next value: up to the curve, across to y = x, and
 * down to the axis. The picture draws the first two legs at difficulty 1, and
 * the whole first step at difficulty 2, which asks for x_2.
 */
const cobwebSlider: Generator<CobwebSliderParams> = {
  id: 'numer-cobweb-slider',
  sample: (rng, difficulty) => {
    const target: 1 | 2 = difficulty > 1 ? 2 : 1;
    for (;;) {
      const shape = rng.pick<CobwebSliderParams['shape']>(['square', 'recip']);
      const a = shape === 'recip' ? rng.int(2, 12) : rng.pick([2, 4, 5, 8, 10]);
      const b = shape === 'recip' ? rng.int(1, 4) : rng.int(1, 9);
      const x0 = rng.pick([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
      const params = { shape, a, b, x0, target };
      const g = sliderG(params);
      const { exact, snapped } = sliderTarget(params);
      if (exact < 0.3 || exact > COBWEB_HI - 0.3 || Math.abs(exact - snapped) > 0.02) continue;
      if (target === 1 && !terminates(exact, 1)) continue;
      if (Math.abs(g(x0) - x0) < 0.4) continue;
      if (target === 2 && Math.abs(g(g(x0)) - g(x0)) < 0.3) continue;
      // The curve has to cross y = x inside the picture for the diagram to mean anything.
      if (rootsIn((x) => g(x) - x, 0.1, COBWEB_HI).length === 0) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const g = sliderG(params);
    const { snapped } = sliderTarget(params);
    const name = params.target === 1 ? 'x_1' : 'x_2';
    return {
      kind: 'slider',
      prompt: [
        say(
          params.target === 1
            ? `The path of $${sliderSchemeTex(params)}$ starts at $x_0 = ${fmt(params.x0)}$: up to the curve, then across to $y = x$. Slide the line to $x_1$, where the next step starts.`
            : `The first step of $${sliderSchemeTex(params)}$ from $x_0 = ${fmt(params.x0)}$ is drawn. Carry on the path and slide the line to $x_2$, to the nearest tenth.`,
        ),
      ],
      min: 0,
      max: COBWEB_HI,
      step: 0.1,
      answer: snapped,
      readout: `${name} = {v}`,
      figure: {
        svg: cobwebSvg(g, {
          hi: COBWEB_HI,
          x0: params.x0,
          legs: params.target === 1 ? 2 : 3,
          label: 'The curve y = g(x), the line y = x, and the start of the iteration path',
        }),
        xMin: 0,
        xMax: COBWEB_HI,
      },
    };
  },
  solution: (params) => {
    const g = sliderG(params);
    const x1 = g(params.x0);
    const steps: SolutionStep[] = [
      { text: `Up from $x_0 = ${fmt(params.x0)}$ to the curve reaches height $g(${fmt(params.x0)}) = ${fmt(x1)}$.` },
      { text: `Across to $y = x$ keeps that height, so the path is now above $x = ${fmt(x1)}$: that is $x_1$.` },
    ];
    if (params.target === 2) {
      const x2 = g(x1);
      steps.push(
        { text: `From there, up or down to the curve reaches $g(${fmt(x1)}) = ${x2.toFixed(3)}$, and across to $y = x$ again.` },
        { text: `So $x_2 \\approx ${fmt(Math.round(x2 * 10) / 10)}$.` },
      );
    }
    return steps;
  },
};

type GFamily = 'square' | 'cube' | 'recip' | 'sqrt' | 'fall';

interface GParams {
  family: GFamily;
  a: number;
  b: number;
}

/** g, its derivative, and both written out: for the learner and for mathjs. */
function gOf({ family, a, b }: GParams) {
  switch (family) {
    case 'square':
      return {
        g: (x: number) => (x * x + b) / a,
        dg: (x: number) => (2 * x) / a,
        tex: `\\frac{${polyTex([1, 0, b])}}{${a}}`,
        dTex: `\\frac{2x}{${a}}`,
        slips: [`\\frac{x}{${a}}`, `\\frac{2x ${signed(b)}}{${a}}`],
        source: `(x^2 + (${b}))/${a}`,
        answer: `2*x/${a}`,
      };
    case 'cube':
      return {
        g: (x: number) => (cube(x) + b) / a,
        dg: (x: number) => (3 * x * x) / a,
        tex: `\\frac{${polyTex([1, 0, 0, b])}}{${a}}`,
        dTex: `\\frac{3x^{2}}{${a}}`,
        slips: [`\\frac{x^{2}}{${a}}`, `\\frac{3x^{2} ${signed(b)}}{${a}}`],
        source: `(x^3 + (${b}))/${a}`,
        answer: `3*x^2/${a}`,
      };
    case 'recip':
      return {
        g: (x: number) => a / (x + b),
        dg: (x: number) => -a / ((x + b) * (x + b)),
        tex: `\\frac{${a}}{${polyTex([1, b])}}`,
        dTex: `-\\frac{${a}}{(${polyTex([1, b])})^{2}}`,
        slips: [`\\frac{${a}}{(${polyTex([1, b])})^{2}}`, `-\\frac{${a}}{${polyTex([1, b])}}`],
        source: `${a}/(x + (${b}))`,
        answer: `-${a}/(x + (${b}))^2`,
      };
    case 'sqrt':
      return {
        g: (x: number) => Math.sqrt(a * x + b),
        dg: (x: number) => a / (2 * Math.sqrt(a * x + b)),
        tex: `\\sqrt{${polyTex([a, b])}}`,
        dTex: `\\frac{${a}}{2\\sqrt{${polyTex([a, b])}}}`,
        // With a = 1 the dropped chain factor is the right answer, so the
        // halving slipped the other way stands in for it.
        slips: [
          a === 1 ? `\\frac{\\sqrt{${polyTex([a, b])}}}{2}` : `\\frac{1}{2\\sqrt{${polyTex([a, b])}}}`,
          `\\frac{${a}}{\\sqrt{${polyTex([a, b])}}}`,
        ],
        source: `sqrt(${a}*x + (${b}))`,
        answer: `${a}/(2*sqrt(${a}*x + (${b})))`,
      };
    case 'fall':
      return {
        g: (x: number) => (b - cube(x)) / a,
        dg: (x: number) => (-3 * x * x) / a,
        tex: `\\frac{${b} - x^{3}}{${a}}`,
        dTex: `-\\frac{3x^{2}}{${a}}`,
        slips: [`\\frac{3x^{2}}{${a}}`, `-\\frac{x^{2}}{${a}}`],
        source: `(${b} - x^3)/${a}`,
        answer: `-3*x^2/${a}`,
      };
  }
}

/** A root of x = g(x) for these numbers, the positive one where there are several. */
function fixedPoint(params: GParams): number | undefined {
  const { g } = gOf(params);
  const roots = rootsIn((x) => g(x) - x, 0.05, 8).filter((x) => Number.isFinite(g(x)));
  return roots.length === 0 ? undefined : roots[roots.length - 1];
}

function sampleG(rng: Rng, families: GFamily[]): GParams {
  const family = rng.pick(families);
  switch (family) {
    case 'square':
    case 'cube':
      return { family, a: rng.int(2, 9), b: nonZero(rng, 9) };
    case 'recip':
      return { family, a: rng.int(2, 12), b: rng.int(1, 6) };
    case 'sqrt':
      return { family, a: rng.int(1, 9), b: rng.int(1, 9) };
    case 'fall':
      return { family, a: rng.int(2, 9), b: rng.int(1, 12) };
  }
}

interface GFlowParams extends GParams {
  alpha: number;
}

/** A scheme whose gradient at its root is clearly inside or clearly outside ±1. */
function sampleGFlow(rng: Rng, families: GFamily[]): GFlowParams {
  for (;;) {
    const params = sampleG(rng, families);
    const alpha = fixedPoint(params);
    if (alpha === undefined || alpha < 0.2) continue;
    const size = Math.abs(gOf(params).dg(alpha));
    if (Math.abs(size - 1) < 0.2 || size < 0.1 || size > 6) continue;
    return { ...params, alpha: Number(alpha.toFixed(2)) };
  }
}

const COBWEB_OUTCOMES = {
  'Positive/Yes': 'A staircase, closing in on $\\alpha$.',
  'Positive/No': 'A staircase, moving away from $\\alpha$.',
  'Negative/Yes': 'A cobweb, closing in on $\\alpha$.',
  'Negative/No': 'A cobweb, spiralling away from $\\alpha$.',
};

/**
 * What the diagram will look like, from the gradient at the root: its sign
 * picks staircase or cobweb, its size picks in or out. Difficulty 1 gives
 * g'(x); difficulty 2 leaves the differentiating to the learner.
 */
const cobwebFlow: Generator<GFlowParams & { given: boolean }> = {
  id: 'numer-cobweb-flow',
  sample: (rng, difficulty) => ({
    ...sampleGFlow(rng, difficulty > 1 ? ['square', 'cube', 'recip', 'fall'] : ['square', 'recip', 'fall']),
    given: difficulty === 1,
  }),
  render: (params): Slide => {
    const { tex, dTex, dg } = gOf(params);
    const gradient = dg(params.alpha);
    const size = (sign: 'Positive' | 'Negative') => ({
      id: sign === 'Positive' ? 'pos' : 'neg',
      ask: `Is $|g'(\\alpha)|$ less than $1$?`,
      branches: (['Yes', 'No'] as const).map((label) => ({ label, outcome: COBWEB_OUTCOMES[`${sign}/${label}`] })),
    });
    return {
      kind: 'flow',
      prompt: [
        say(
          `The iteration $x_{n+1} = g(x_n)$ has a root at $\\alpha \\approx ${fmt(params.alpha)}$${params.given ? `, and $g'(x) = ${dTex}$` : ''}. What will its staircase or cobweb diagram do near $\\alpha$?`,
        ),
      ],
      subject: `g(x) = ${tex}`,
      steps: [
        {
          id: 'sign',
          ask: `Is $g'(\\alpha)$ positive or negative?`,
          branches: [
            { label: 'Positive', to: 'pos' },
            { label: 'Negative', to: 'neg' },
          ],
        },
        size('Positive'),
        size('Negative'),
      ],
      answer: [gradient > 0 ? 'Positive' : 'Negative', Math.abs(gradient) < 1 ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const { dTex, dg } = gOf(params);
    const gradient = dg(params.alpha);
    return [
      { tex: `g'(x) = ${dTex}` },
      { tex: `g'(${fmt(params.alpha)}) \\approx ${gradient.toFixed(2)}` },
      { text: `It is ${gradient > 0 ? 'positive, so the path steps one way: a staircase' : 'negative, so the path swings from side to side: a cobweb'}.` },
      { text: `Its size is ${Math.abs(gradient) < 1 ? 'less than $1$, so each step is shorter than the last and the path closes in' : 'more than $1$, so each step is longer than the last and the path moves away'}.` },
    ];
  },
};

interface FixedLimitParams {
  family: FixedFamily;
  a: number;
  b: number;
  x0: number;
  dp: number;
}

function workFixedLimit(params: FixedLimitParams) {
  const scheme = fixedScheme(params);
  const table = settledTable(scheme.g, params.x0, params.dp);
  if (!table) return undefined;
  if (Math.abs(scheme.f(table.root)) > 1e-9) return undefined;
  if (Math.abs(table.root - Math.round(table.root)) < 0.05) return undefined;
  const { values, rows, rootToken } = table;
  const dp = params.dp;
  const firstTruncated = values
    .slice(1)
    .map((x) => truncated(x, dp))
    .find((token, idx) => token !== rows[idx]);
  const bank = iterateBank(
    [...rows, rootToken],
    [
      firstTruncated,
      roundedWrongWay(values[1], dp),
      roundedWrongWay(table.root, dp),
      written(fixedScheme({ ...params, b: -params.b }).g(params.x0), dp),
      roundedWrongWay(values[2], dp),
    ],
  );
  if (!bank) return undefined;
  return { scheme, ...table, answer: [...rows, rootToken], bank };
}

/**
 * A rearrangement run until it settles: the conclusion is the value the rows
 * stop changing at, which is the root to the places asked.
 */
const fixedLimit: Generator<FixedLimitParams> = {
  id: 'numer-fixed-limit',
  sample: (rng, difficulty) => {
    const dp = difficulty > 1 ? 3 : 2;
    for (let attempt = 0; attempt < 2000; attempt += 1) {
      const family = rng.pick<FixedFamily>(difficulty > 1 ? ['sqrt', 'cbrt', 'recip'] : ['sqrt', 'cbrt']);
      const a = rng.int(1, 9);
      const b = family === 'recip' ? rng.int(1, 9) : rng.int(2, 30);
      const guess = limitOf(fixedScheme({ family, a, b, x0: 1, dp }).g, 1);
      if (guess === undefined) continue;
      const x0 = Math.max(0, Math.round(guess) + rng.pick([-2, -1, 1, 2]));
      const params = { family, a, b, x0, dp };
      if (workFixedLimit(params)) return params;
    }
    throw new Error('numer-fixed-limit: no fair draw');
  },
  render: (params): Slide => {
    const work = workFixedLimit(params)!;
    return {
      kind: 'iterate',
      prompt: [
        { kind: 'prose', text: `Starting from $x_0 = ${params.x0}$, this rearrangement of $${work.scheme.equationTex} = 0$ converges.` },
        { kind: 'display', tex: work.scheme.schemeTex },
        {
          kind: 'prose',
          text: `Keep full accuracy between steps and write each $x_n$ to ${params.dp} decimal places, then the root they settle on.`,
        },
      ],
      start: String(params.x0),
      conclusion: 'limit',
      bank: work.bank,
      answer: work.answer,
    };
  },
  solution: (params) => {
    const work = workFixedLimit(params)!;
    return [
      { text: 'Put each value back into the scheme, keeping every digit and rounding only what you write down.', tex: work.scheme.schemeTex },
      ...rowSteps(work.values, work.rows),
      { text: `The last rows agree to ${params.dp} decimal places, so the root is $${work.rootToken}$ to ${params.dp} decimal places.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 5: when iteration fails
 * ================================================================ */

/** g'(x) for the scheme, typed, with g as the source so the oracle can check it. */
const gPrime: Generator<GParams> = {
  id: 'numer-gprime',
  sample: (rng, difficulty) => sampleG(rng, difficulty > 1 ? ['recip', 'sqrt', 'fall'] : ['square', 'cube']),
  render: (params): Slide => {
    const { tex, source, answer } = gOf(params);
    const positive = params.family === 'sqrt' || params.family === 'recip';
    return {
      kind: 'expression',
      prompt: [say(`Whether $x_{n+1} = g(x_n)$ converges depends on $g'$ near the root. Differentiate:`), show(`g(x) = ${tex}`)],
      lead: "g'(x) =",
      keypad: params.family === 'sqrt' ? ROOT_KEYS : ALGEBRA_KEYS,
      answer,
      source,
      domain: positive ? 'positive' : 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { tex, dTex } = gOf(params);
    const { family, a, b } = params;
    const how: Record<GFamily, string> = {
      square: `Write it as $\\frac{1}{${a}}(x^{2} ${signed(b)})$: the constant goes, and $x^{2}$ gives $2x$.`,
      cube: `Write it as $\\frac{1}{${a}}(x^{3} ${signed(b)})$: the constant goes, and $x^{3}$ gives $3x^{2}$.`,
      recip: `Write it as $${a}(${polyTex([1, b])})^{-1}$ and use the chain rule: the power drops to $-2$.`,
      sqrt: `Write it as $(${polyTex([a, b])})^{\\frac{1}{2}}$ and use the chain rule: $\\frac{1}{2}$ times the inside's derivative, $${a}$.`,
      fall: `Write it as $\\frac{1}{${a}}(${b} - x^{3})$: the constant goes, and $-x^{3}$ gives $-3x^{2}$.`,
    };
    return [{ tex: `g(x) = ${tex}` }, { text: how[family] }, { tex: `g'(x) = ${dTex}` }];
  },
};

interface WhichParams {
  p: number;
  q: number;
  alpha: number;
  /** Which of the last two rearrangements is offered beside the first two. */
  other: 2 | 3;
}

/** The four standard rearrangements of x^3 + p x + q = 0. */
function candidates({ p, q }: Pick<WhichParams, 'p' | 'q'>) {
  const frac = (top: string, bottom: string, negative: boolean) => `${negative ? '-' : ''}\\frac{${top}}{${bottom}}`;
  return [
    {
      tex: `x = \\sqrt[3]{${polyTex([-p, -q])}}`,
      g: (x: number) => Math.cbrt(-p * x - q),
    },
    {
      tex: `x = ${frac(polyTex([1, 0, 0, q]), String(Math.abs(p)), p > 0)}`,
      g: (x: number) => -(cube(x) + q) / p,
    },
    {
      tex: `x = ${frac(String(Math.abs(q)), polyTex([1, 0, p]), q > 0)}`,
      g: (x: number) => -q / (x * x + p),
    },
    {
      tex: `x = \\sqrt{${-p} ${q > 0 ? '-' : '+'} \\frac{${Math.abs(q)}}{x}}`,
      g: (x: number) => Math.sqrt(-p - q / x),
    },
  ];
}

/**
 * Three rearrangements of one cubic; exactly one has |g'(α)| < 1 at the root,
 * so exactly one converges there.
 *
 * Not all four at once: the cube-root and divide-by-p forms are inverse
 * functions of each other, so their gradients at α multiply to 1, and the
 * same holds for the last two. Exactly one of each pair converges, so
 * offering all four would always make two right. The first pair is offered
 * with whichever of the second pair diverges.
 */
const whichConverges: Generator<WhichParams> = {
  id: 'numer-which-converges',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = difficulty > 1 ? nonZero(rng, 9) : -rng.int(2, 9);
      const q = nonZero(rng, 9);
      const f = (x: number) => cube(x) + p * x + q;
      const roots = rootsIn(f, -6, 6).filter((x) => Math.abs(x) > 0.3);
      if (roots.length === 0) continue;
      const alpha = difficulty > 1 ? rng.pick(roots) : roots[roots.length - 1];
      const sizes = candidates({ p, q }).map(({ g }) => Math.abs(slope(g, alpha)));
      const [a, b] = sizes;
      if (!(Math.min(a, b) < 0.85 && Math.max(a, b) > 1.15)) continue;
      const others = ([2, 3] as const).filter((i) => Number.isFinite(sizes[i]) && sizes[i] > 1.15);
      if (others.length === 0) continue;
      return { p, q, alpha: Number(alpha.toFixed(2)), other: rng.pick(others) };
    }
  },
  render: (params): Slide => {
    const exact = exactRoot(params);
    const list = offered(params);
    return choiceSlide(
      [
        say(`$${polyTex([1, 0, params.p, params.q])} = 0$ has a root $\\alpha \\approx ${fmt(params.alpha)}$. Which rearrangement, used as $x_{n+1} = g(x_n)$ from near $\\alpha$, converges to it?`),
      ],
      list.map(({ tex, g }) => ({ tex, correct: Math.abs(slope(g, exact)) < 1 })),
    );
  },
  solution: (params) => {
    const exact = exactRoot(params);
    return [
      { text: `An iteration converges to $\\alpha$ when $|g'(\\alpha)| < 1$. Work out $g'$ at $${fmt(params.alpha)}$ for each:` },
      ...offered(params).map(({ tex, g }) => ({ text: `$${tex}$: $|g'(\\alpha)| \\approx ${Math.abs(slope(g, exact)).toFixed(2)}$` })),
      { text: 'Only one is below $1$. The others push each iterate further from $\\alpha$ than the last.' },
    ];
  },
};

function exactRoot({ p, q, alpha }: WhichParams): number {
  return rootsIn((x) => cube(x) + p * x + q, alpha - 0.01, alpha + 0.01)[0] ?? alpha;
}

function offered(params: WhichParams) {
  const list = candidates(params);
  return [list[0], list[1], list[params.other]];
}

/**
 * Two decisions: which g'(x) is right, then whether its size at the root is
 * below 1. The first fork asks the differentiating as a choice.
 */
const divergeFlow: Generator<GFlowParams> = {
  id: 'numer-diverge-flow',
  sample: (rng, difficulty) => sampleGFlow(rng, difficulty > 1 ? ['recip', 'sqrt', 'fall', 'cube'] : ['square', 'cube', 'recip']),
  render: (params): Slide => {
    const { tex, dTex, slips, dg } = gOf(params);
    const size = Math.abs(dg(params.alpha));
    return {
      kind: 'flow',
      prompt: [say(`Will $x_{n+1} = g(x_n)$ converge to its root $\\alpha \\approx ${fmt(params.alpha)}$?`)],
      subject: `g(x) = ${tex}`,
      steps: [
        {
          id: 'deriv',
          ask: `Which is $g'(x)$?`,
          branches: turned([dTex, ...slips], tex).map((label) => ({ label: `$${label}$`, to: 'size' })),
        },
        {
          id: 'size',
          ask: `At $\\alpha \\approx ${fmt(params.alpha)}$, is $|g'(\\alpha)|$ less than $1$?`,
          branches: [
            { label: 'Yes', outcome: 'Then it converges: each step lands closer to $\\alpha$ than the last.' },
            { label: 'No', outcome: 'Then it diverges: each step lands further from $\\alpha$, however close $x_0$ starts.' },
          ],
        },
      ],
      answer: [`$${dTex}$`, size < 1 ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const { dTex, dg } = gOf(params);
    const value = dg(params.alpha);
    return [
      { tex: `g'(x) = ${dTex}` },
      { tex: `|g'(${fmt(params.alpha)})| \\approx ${Math.abs(value).toFixed(2)}` },
      {
        text:
          Math.abs(value) < 1
            ? 'Less than $1$, so the iteration converges to $\\alpha$ from a start close enough.'
            : 'More than $1$, so the iteration diverges: $\\alpha$ is still a root, but this rearrangement cannot find it.',
      },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 1: the tangent step
 * ================================================================ */

interface NewtonPolyParams {
  poly: Poly;
}

/** A cubic for Newton-Raphson; at difficulty 2 with an x^2 term, a leading 2, or a quartic. */
function sampleNewtonPoly(rng: Rng, difficulty: number): NewtonPolyParams {
  if (difficulty > 1) {
    const form = rng.int(0, 2);
    if (form === 0) return { poly: [1, nonZero(rng, 4), nonZero(rng, 9), nonZero(rng, 9)] };
    if (form === 1) return { poly: [2, 0, nonZero(rng, 9), nonZero(rng, 9)] };
    return { poly: [1, 0, 0, nonZero(rng, 9), nonZero(rng, 9)] };
  }
  return { poly: [1, 0, nonZero(rng, 9), nonZero(rng, 9)] };
}

/**
 * The Newton-Raphson formula for a given f, as tiles: f(x_n) on top and
 * f'(x_n) underneath. The bank holds them both, so the formula upside down is
 * always on offer, and the usual slips in differentiating.
 */
const newtonFormulaTiles: Generator<NewtonPolyParams> = {
  id: 'numer-newton-formula-tiles',
  sample: sampleNewtonPoly,
  render: ({ poly }): Slide => {
    const df = derivative(poly);
    const top = polyTex(poly, 'x_n');
    const bottom = polyTex(df, 'x_n');
    // Powers dropped without multiplying down, and a constant that survived.
    const powerOnly = polyTex(poly.slice(0, -1), 'x_n');
    const keptConstant = polyTex([...df.slice(0, -1), df[df.length - 1] + poly[poly.length - 1]], 'x_n');
    const flipped = polyTex([...poly.slice(0, -1), -poly[poly.length - 1]], 'x_n');
    return {
      kind: 'tiles',
      prompt: [say(`Write the Newton-Raphson formula for $f(x) = ${polyTex(poly)}$.`)],
      template: 'x_{n+1} = x_n - ({0}) \\div ({1})',
      bank: fillBank([top, bottom], [powerOnly, keptConstant, flipped]),
      answer: [top, bottom],
    };
  },
  solution: ({ poly }) => [
    { text: 'The formula divides $f(x_n)$ by $f\'(x_n)$ and takes the result away from $x_n$:', tex: `x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}` },
    { text: `Differentiate: $f'(x) = ${polyTex(derivative(poly))}$.` },
    { text: 'Put both in, so $x_{n+1}$ is', tex: `x_n - \\frac{${polyTex(poly, 'x_n')}}{${polyTex(derivative(poly), 'x_n')}}` },
  ],
};

interface NewtonStepParams {
  poly: Poly;
  x0: number;
}

function newtonStep({ poly, x0 }: NewtonStepParams) {
  const fa = valueAt(poly, x0);
  const da = valueAt(derivative(poly), x0);
  const ratio = fa / da;
  return { fa, da, ratio, x1: x0 - ratio };
}

/** A whole-number start whose single step comes out as an exact short decimal. */
function sampleNewtonStep(rng: Rng, difficulty: number): NewtonStepParams {
  for (;;) {
    const hard = difficulty > 1;
    const poly = hard ? [1, nonZero(rng, 4), nonZero(rng, 9), nonZero(rng, 9)] : [1, 0, nonZero(rng, 9), nonZero(rng, 9)];
    const x0 = hard ? nonZero(rng, 3) : rng.int(1, 3);
    const { fa, da, ratio } = newtonStep({ poly, x0 });
    if (fa === 0 || da === 0 || !terminates(ratio, 3) || Math.abs(ratio) > 3 || Math.abs(ratio) < 0.01) continue;
    if (Math.abs(fa) > 60 || Math.abs(da) > 60) continue;
    return { poly, x0 };
  }
}

/**
 * One Newton-Raphson step as a tree: f(x_0) and f'(x_0) on top, their
 * quotient, then x_1.
 */
const newtonTree: Generator<NewtonStepParams> = {
  id: 'numer-newton-tree',
  sample: sampleNewtonStep,
  render: (params): Slide => {
    const { poly, x0 } = params;
    const { fa, da, ratio, x1 } = newtonStep(params);
    const answer = [fa, da, ratio, x1].map(fmt);
    const powerOnly = valueAt(poly.slice(0, -1), x0);
    const slips = [
      fmt(-fa),
      fmt(x0 + ratio),
      fmt(-ratio),
      terminates(da / fa, 3) ? fmt(da / fa) : undefined,
      fmt(powerOnly),
      fmt(x0 - fa),
    ];
    return {
      kind: 'tree',
      prompt: [
        say(
          `One Newton-Raphson step for $f(x) = ${polyTex(poly)}$ from $x_0 = ${x0}$. Top row: $f(${x0})$, then $f'(${x0})$. Underneath, $\\frac{f(${x0})}{f'(${x0})}$, then $x_1$.`,
        ),
      ],
      expression: `x_1 = ${x0} - \\frac{f(${x0})}{f'(${x0})}`,
      nodes: [
        { id: 'f', from: [] },
        { id: 'd', from: [] },
        { id: 'q', from: ['f', 'd'] },
        { id: 'x1', from: ['q'] },
      ],
      bank: numberBank(answer, slips, around([x1, ratio], 0.25)),
      answer,
    };
  },
  solution: (params) => {
    const { poly, x0 } = params;
    const { fa, da, ratio, x1 } = newtonStep(params);
    return [
      { text: `$f'(x) = ${polyTex(derivative(poly))}$` },
      { tex: `f(${x0}) = ${fmt(fa)}, \\quad f'(${x0}) = ${fmt(da)}` },
      { tex: `\\frac{f(${x0})}{f'(${x0})} = \\frac{${fmt(fa)}}{${fmt(da)}} = ${fmt(ratio)}` },
      { tex: aligned(`x_1 &= ${x0} - ${paren(ratio)}`, `&= ${fmt(x1)}`) },
    ];
  },
};

interface DerivativeParams {
  poly: Poly;
  /** A k/x term at difficulty 2, or 0. */
  k: number;
}

function derivativeFTex({ poly, k }: DerivativeParams): string {
  const base = polyTex(poly);
  if (k === 0) return base;
  return `${base} ${k < 0 ? '-' : '+'} \\frac{${Math.abs(k)}}{x}`;
}

/** f'(x), typed, with f as its source so mathjs can check it independently. */
const newtonDerivative: Generator<DerivativeParams> = {
  id: 'numer-newton-derivative',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      return rng.chance(0.5)
        ? { poly: [1, 0, nonZero(rng, 9), nonZero(rng, 9), nonZero(rng, 9)], k: 0 }
        : { poly: [rng.int(1, 3), nonZero(rng, 9), nonZero(rng, 9)].concat([0]), k: nonZero(rng, 9) };
    }
    return { poly: [rng.int(1, 4), rng.int(-5, 5), nonZero(rng, 9), nonZero(rng, 9)], k: 0 };
  },
  render: (params): Slide => {
    const { poly, k } = params;
    const df = derivative(poly);
    return {
      kind: 'expression',
      prompt: [say('Newton-Raphson needs the gradient of the curve at each step. Find $f\'(x)$.'), show(`f(x) = ${derivativeFTex(params)}`)],
      lead: "f'(x) =",
      keypad: ALGEBRA_KEYS,
      answer: k === 0 ? polyAnswer(df) : `${polyAnswer(df)} - (${k})/x^2`,
      source: k === 0 ? polyAnswer(poly) : `${polyAnswer(poly)} + (${k})/x`,
      domain: k === 0 ? 'real' : 'positive',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { poly, k } = params;
    const df = polyTex(derivative(poly));
    const steps: SolutionStep[] = [{ text: 'Differentiate term by term: multiply by the power, then take one off it. A constant goes.' }];
    if (k !== 0) {
      steps.push({ text: `Write $\\frac{${k}}{x}$ as $${k}x^{-1}$, which gives $${-k}x^{-2}$.` });
      steps.push({ tex: `f'(x) = ${df} ${k > 0 ? '-' : '+'} \\frac{${Math.abs(k)}}{x^{2}}` });
    } else {
      steps.push({ tex: `f'(x) = ${df}` });
    }
    return steps;
  },
};

/* ================================================================
 * Level 2, lesson 2: a root to a set accuracy
 * ================================================================ */

interface RootIterateParams {
  /** f(x) = x^k - N. */
  k: 2 | 3;
  N: number;
  x0: number;
  dp: number;
}

const rootStep = ({ k, N }: RootIterateParams) => (x: number) => x - (x ** k - N) / (k * x ** (k - 1));

function workRootIterate(params: RootIterateParams) {
  const step = rootStep(params);
  const table = settledTable(step, params.x0, params.dp);
  if (!table) return undefined;
  const exact = params.k === 2 ? Math.sqrt(params.N) : Math.cbrt(params.N);
  if (Math.abs(table.root - exact) > 1e-9) return undefined;
  const { values, rows, rootToken } = table;
  const dp = params.dp;
  const firstTruncated = values
    .slice(1)
    .map((x) => truncated(x, dp))
    .find((token, idx) => token !== rows[idx]);
  const x0 = params.x0;
  const bank = iterateBank(
    [...rows, rootToken],
    [
      firstTruncated,
      written(x0 + (x0 ** params.k - params.N) / (params.k * x0 ** (params.k - 1)), dp),
      roundedWrongWay(values[1], dp),
      roundedWrongWay(table.root, dp),
      roundedWrongWay(values[2], dp),
    ],
  );
  if (!bank) return undefined;
  return { ...table, answer: [...rows, rootToken], bank };
}

/**
 * Newton-Raphson finding √N or ∛N, run until the written rows stop changing.
 * The bisection check in the test confirms the root independently.
 */
const newtonRootIterate: Generator<RootIterateParams> = {
  id: 'numer-newton-root-iterate',
  sample: (rng, difficulty) => {
    const k: 2 | 3 = difficulty > 1 ? 3 : 2;
    const dp = difficulty > 1 ? 4 : 3;
    for (let attempt = 0; attempt < 2000; attempt += 1) {
      const N = rng.int(3, k === 2 ? 99 : 60);
      const root = k === 2 ? Math.sqrt(N) : Math.cbrt(N);
      if (Math.abs(root - Math.round(root)) < 0.05) continue;
      const x0 = rng.int(1, Math.ceil(root) + 4);
      const params = { k, N, x0, dp };
      if (workRootIterate(params)) return params;
    }
    throw new Error('numer-newton-root-iterate: no fair draw');
  },
  render: (params): Slide => {
    const work = workRootIterate(params)!;
    const { k, N } = params;
    const f = `x^{${k}} - ${N}`;
    return {
      kind: 'iterate',
      prompt: [
        {
          kind: 'prose',
          text: `Use Newton-Raphson on $f(x) = ${f}$ to find $${k === 2 ? `\\sqrt{${N}}` : `\\sqrt[3]{${N}}`}$, starting from $x_0 = ${params.x0}$.`,
        },
        { kind: 'display', tex: `x_{n+1} = x_n - \\frac{x_n^{${k}} - ${N}}{${k}x_n${k === 3 ? '^{2}' : ''}}` },
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
  solution: (params) => {
    const work = workRootIterate(params)!;
    const { k, N } = params;
    return [
      { text: `$f(x) = x^{${k}} - ${N}$ is zero at $x = ${k === 2 ? `\\sqrt{${N}}` : `\\sqrt[3]{${N}}`}$, and $f'(x) = ${k}x${k === 3 ? '^{2}' : ''}$.` },
      ...rowSteps(work.values, work.rows),
      { text: `The rows stop changing at ${params.dp} decimal places, so the root is $${work.rootToken}$.` },
    ];
  },
};

interface BoundsParams {
  poly: Poly;
  dp: number;
  /** The value claimed for the root, in units of the last place. */
  claimUnits: number;
}

function boundsOf({ dp, claimUnits }: BoundsParams) {
  const unit = 10 ** -dp;
  const claim = claimUnits * unit;
  return {
    claim: claim.toFixed(dp),
    lo: (claim - unit / 2).toFixed(dp + 1),
    hi: (claim + unit / 2).toFixed(dp + 1),
  };
}

/** A value of f at a bound, to two more places than the bound. */
function boundValue({ poly, dp }: BoundsParams, at: string): string {
  return valueAt(poly, Number(at)).toFixed(dp + 3);
}

/**
 * The accuracy check worked along a line: f at the lower bound, f at the
 * upper, then the sign of their product. A third of the time the claim is one
 * unit off, and the product is positive.
 */
const boundsSteps: Generator<BoundsParams> = {
  id: 'numer-bounds-steps',
  sample: (rng, difficulty) => {
    const dp = difficulty > 1 ? 3 : 2;
    for (;;) {
      const poly = [1, 0, nonZero(rng, 9), nonZero(rng, 9)];
      const roots = rootsIn((x) => valueAt(poly, x), -4, 4);
      if (roots.length === 0) continue;
      const alpha = rng.pick(roots);
      const units = alpha * 10 ** dp;
      const nearest = Math.round(units);
      // Well inside its rounding cell, so the right claim is plainly right.
      if (Math.abs(units - nearest) > 0.35 || Math.abs(alpha - Math.round(alpha)) < 0.05) continue;
      const claimUnits = rng.chance(1 / 3) ? nearest + rng.sign() : nearest;
      const params = { poly, dp, claimUnits };
      const { lo, hi } = boundsOf(params);
      const small = 3 * 10 ** -(dp + 3);
      if ([lo, hi].some((at) => Math.abs(valueAt(poly, Number(at))) < small)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { claim, lo, hi } = boundsOf(params);
    const flo = boundValue(params, lo);
    const fhi = boundValue(params, hi);
    const change = Number(flo) * Number(fhi) < 0;
    const negate = (token: string) => (token.startsWith('-') ? token.slice(1) : `-${token}`);
    const atClaim = boundValue(params, claim);
    return {
      kind: 'steps',
      prompt: [
        say(
          `An iteration suggests $\\alpha = ${claim}$ to ${params.dp} decimal places, for a root of $f(x) = ${polyTex(params.poly)}$. Check it: tap the part you would do next, then choose what it comes to. A negative product is a change of sign.`,
        ),
      ],
      start: [`f(${lo})`, '\\times', `f(${hi})`],
      reductions: [
        { span: [0, 1], value: flo, bank: stepBank(flo, negate(flo), atClaim, fhi) },
        { span: [2, 3], value: fhi, bank: stepBank(fhi, negate(fhi), atClaim, flo) },
        { span: [0, 3], operator: 1, value: change ? '< 0' : '> 0', bank: stepBank(change ? '< 0' : '> 0', change ? '> 0' : '< 0') },
      ],
    };
  },
  solution: (params) => {
    const { claim, lo, hi } = boundsOf(params);
    const flo = boundValue(params, lo);
    const fhi = boundValue(params, hi);
    const change = Number(flo) * Number(fhi) < 0;
    return [
      { text: `$${claim}$ to ${params.dp} decimal places means $${lo} \\le \\alpha < ${hi}$, so test $f$ at those two bounds.` },
      { tex: pairTex(lo, flo, hi, fhi) },
      {
        text: change
          ? `The signs differ and $f$ is continuous, so the root is between them: $\\alpha = ${claim}$ to ${params.dp} decimal places.`
          : `Same sign, so no change of sign: the root is not in that interval, and $${claim}$ is not correct to ${params.dp} decimal places.`,
      },
    ];
  },
};

interface AccuracyParams {
  /** The rounded root, in units of its last place. */
  units: number;
  dp: number;
  /** Which way the question runs. */
  read: boolean;
}

/**
 * The interval a claimed accuracy stands for. Difficulty 1 asks which
 * interval to test; difficulty 2 often gives the sign change and asks what it
 * shows.
 */
const accuracyChoice: Generator<AccuracyParams> = {
  id: 'numer-accuracy-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const dp = difficulty > 1 ? rng.pick([2, 3]) : rng.pick([1, 2]);
      const units = rng.int(5 * 10 ** dp, 50 * 10 ** (dp - 1) * 10 - 1);
      if (units % 10 === 0) continue;
      return { units, dp, read: difficulty > 1 && rng.chance(0.5) };
    }
  },
  render: ({ units, dp, read }): Slide => {
    const unit = 10 ** -dp;
    const r = units * unit;
    const at = (v: number, places = dp + 1) => v.toFixed(places);
    const claim = r.toFixed(dp);
    if (read) {
      const places = (text: string) => `\\alpha = ${text} \\text{ to ${text.split('.')[1].length} d.p.}`;
      return choiceSlide(
        [say(`$f$ is continuous, with $f(${at(r - unit / 2)}) < 0$ and $f(${at(r + unit / 2)}) > 0$. What does that show about the root $\\alpha$ between them?`)],
        [
          { tex: places(claim), correct: true },
          { tex: places(at(r - unit / 2)) },
          { tex: places(at(r + unit / 2)) },
          { tex: places((r + unit).toFixed(dp)) },
        ],
      );
    }
    const interval = (lo: number, hi: number, places = dp + 1) => `[${at(lo, places)},\\ ${at(hi, places)}]`;
    return choiceSlide(
      [say(`To show that $\\alpha = ${claim}$ correct to ${dp} decimal place${dp === 1 ? '' : 's'}, which interval must $f(x)$ change sign across?`)],
      [
        { tex: interval(r - unit / 2, r + unit / 2), correct: true },
        { tex: interval(r, r + unit, dp) },
        { tex: interval(r - unit, r + unit, dp) },
        { tex: interval(r - unit / 20, r + unit / 20, dp + 2) },
      ],
    );
  },
  solution: ({ units, dp, read }) => {
    const unit = 10 ** -dp;
    const r = units * unit;
    const lo = (r - unit / 2).toFixed(dp + 1);
    const hi = (r + unit / 2).toFixed(dp + 1);
    return [
      { text: `A number rounds to $${r.toFixed(dp)}$ at ${dp} decimal place${dp === 1 ? '' : 's'} exactly when it lies from $${lo}$ up to $${hi}$.` },
      {
        text: read
          ? `A change of sign across $[${lo}, ${hi}]$ puts $\\alpha$ in that interval, so $\\alpha = ${r.toFixed(dp)}$ to ${dp} decimal places.`
          : `So a change of sign across $[${lo}, ${hi}]$ is what proves it: halfway to each neighbour, not the neighbours themselves.`,
      },
    ];
  },
};

type StopScenario = 'confirm' | 'more' | 'edge';

interface StopParams {
  poly: Poly;
  dp: number;
  scenario: StopScenario;
  /** x_3 and x_4, written to dp + 2 places. */
  x3: string;
  x4: string;
}

function stopBounds({ dp, x4 }: StopParams) {
  const unit = 10 ** -dp;
  const r = Number(Number(x4).toFixed(dp));
  return { claim: r.toFixed(dp), lo: (r - unit / 2).toFixed(dp + 1), hi: (r + unit / 2).toFixed(dp + 1) };
}

/**
 * When to stop: do the last two iterates agree to the places asked, and does
 * the sign change across the bounds? The third scenario agrees but fails the
 * check, because the root sits just across a rounding boundary.
 */
const stopFlow: Generator<StopParams> = {
  id: 'numer-stop-flow',
  sample: (rng, difficulty) => {
    const dp = difficulty > 1 ? 3 : 2;
    const unit = 10 ** -dp;
    const scenario = rng.pick<StopScenario>(['confirm', 'more', 'edge']);
    for (;;) {
      const poly = [1, 0, nonZero(rng, 9), nonZero(rng, 9)];
      const roots = rootsIn((x) => valueAt(poly, x), 0.3, 4);
      if (roots.length === 0) continue;
      const alpha = roots[0];
      // Where alpha sits in its rounding cell: 0 at the value it rounds to,
      // ±0.5 at the boundaries either side.
      const d = alpha / unit - Math.round(alpha / unit);
      let e3: number;
      let e4: number;
      if (scenario === 'edge') {
        // Just inside one cell, with the iterates just across the boundary.
        const side = d > 0 ? 1 : -1;
        const gap = 0.5 - Math.abs(d);
        if (gap > 0.15 || gap < 0.03) continue;
        e3 = side * (gap + rng.pick([0.25, 0.3, 0.35])) * unit;
        e4 = side * (gap + rng.pick([0.08, 0.1, 0.12])) * unit;
      } else {
        if (Math.abs(d) > 0.2) continue;
        const side = rng.sign();
        e3 = side * (scenario === 'more' ? rng.pick([1.2, 1.4, 1.6]) : rng.pick([0.1, 0.15])) * unit;
        e4 = -side * rng.pick([0.02, 0.03, 0.04]) * unit;
      }
      const x3 = (alpha + e3).toFixed(dp + 2);
      const x4 = (alpha + e4).toFixed(dp + 2);
      const params = { poly, dp, scenario, x3, x4 };
      const agree = Number(x3).toFixed(dp) === Number(x4).toFixed(dp);
      if (agree !== (scenario !== 'more')) continue;
      const { lo, hi } = stopBounds(params);
      const flo = valueAt(poly, Number(lo));
      const fhi = valueAt(poly, Number(hi));
      if (Math.abs(flo) < 5 * 10 ** -(dp + 3) || Math.abs(fhi) < 5 * 10 ** -(dp + 3)) continue;
      if ((flo * fhi < 0) !== (scenario === 'confirm') && scenario !== 'more') continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { dp, poly } = params;
    const { claim, lo, hi } = stopBounds(params);
    const flo = valueAt(poly, Number(lo)).toFixed(dp + 3);
    const fhi = valueAt(poly, Number(hi)).toFixed(dp + 3);
    return {
      kind: 'flow',
      prompt: [
        say(`A fixed-point iteration for a root of $f(x) = ${polyTex(poly)}$ has reached the values below. The root is wanted to ${dp} decimal places. Is it time to stop?`),
      ],
      subject: `x_3 = ${params.x3}, \\quad x_4 = ${params.x4}`,
      steps: [
        {
          id: 'agree',
          ask: `Do $x_3$ and $x_4$ agree when rounded to ${dp} decimal places?`,
          branches: [
            { label: 'Yes', to: 'sign' },
            { label: 'No', outcome: 'Not yet: work out another iterate and compare again.' },
          ],
        },
        {
          id: 'sign',
          ask: `$f(${lo}) = ${flo}$ and $f(${hi}) = ${fhi}$. Is there a change of sign?`,
          branches: [
            { label: 'Yes', outcome: `Stop: $\\alpha = ${claim}$ to ${dp} decimal places.` },
            { label: 'No', outcome: `Not yet: the root is not in $[${lo}, ${hi}]$, so $${claim}$ is not right. Keep iterating.` },
          ],
        },
      ],
      answer: params.scenario === 'more' ? ['No'] : params.scenario === 'confirm' ? ['Yes', 'Yes'] : ['Yes', 'No'],
    };
  },
  solution: (params) => {
    const { dp, poly, scenario } = params;
    const { claim, lo, hi } = stopBounds(params);
    const round3 = Number(params.x3).toFixed(dp);
    const round4 = Number(params.x4).toFixed(dp);
    if (scenario === 'more') {
      return [
        { text: `To ${dp} decimal places, $x_3$ is $${round3}$ and $x_4$ is $${round4}$.` },
        { text: 'They differ, so the iteration has not settled at that accuracy yet: keep going.' },
      ];
    }
    const flo = valueAt(poly, Number(lo)).toFixed(dp + 3);
    const fhi = valueAt(poly, Number(hi)).toFixed(dp + 3);
    return [
      { text: `Both round to $${claim}$. To be sure, the root must lie in $[${lo}, ${hi}]$.` },
      { tex: pairTex(lo, flo, hi, fhi) },
      {
        text:
          scenario === 'confirm'
            ? `A change of sign, so $\\alpha = ${claim}$ to ${dp} decimal places.`
            : `No change of sign: the root is just outside that interval. Agreeing iterates are a hint, not a proof, so keep iterating.`,
      },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 3: where Newton-Raphson fails
 * ================================================================ */

type NrFailKind = 'flat' | 'far' | 'good' | 'cycle';

interface NrFailParams {
  kind: NrFailKind;
  /** s((x - h)^3 - 3w^2(x - h)) + v, or the cycling cubic shifted by h. */
  s: number;
  h: number;
  w: number;
  v: number;
  x0: number;
}

const NR_FAIL_LABELS: Record<NrFailKind, string> = {
  flat: 'The tangent is flat, so it never meets the axis: there is no next value',
  far: 'The tangent is nearly flat, so the next value lands far away',
  good: 'The next value lands close to the nearest root',
  cycle: 'The values bounce back and forth between two points for ever',
};

function nrFailCurve({ kind, s, h, w, v }: NrFailParams): { f: (x: number) => number; df: (x: number) => number } {
  if (kind === 'cycle') {
    return {
      f: (x) => s * ((x - h) ** 3 - 2 * (x - h) + 2),
      df: (x) => s * (3 * (x - h) ** 2 - 2),
    };
  }
  return {
    f: (x) => s * ((x - h) ** 3 - 3 * w * w * (x - h)) + v,
    df: (x) => s * (3 * (x - h) ** 2 - 3 * w * w),
  };
}

function tangentAt(f: (x: number) => number, df: (x: number) => number, x0: number): (x: number) => number {
  const y0 = f(x0);
  const m = df(x0);
  return (x) => y0 + m * (x - x0);
}

/**
 * What happens next, from a picture of the curve and the tangent at x_0.
 * The cycle, where two tangents send the iterates back and forth, is only
 * asked at difficulty 2.
 */
const nrFailPicture: Generator<NrFailParams> = {
  id: 'numer-nr-fail-picture',
  sample: (rng, difficulty) => {
    const kinds: NrFailKind[] = difficulty > 1 ? ['flat', 'far', 'good', 'cycle'] : ['flat', 'far', 'good'];
    for (;;) {
      const kind = rng.pick(kinds);
      const s = rng.pick([0.3, 0.4, 0.5]) * rng.sign();
      const h = rng.pick([-1, -0.5, 0, 0.5, 1]);
      const w = rng.pick([1, 1.5]);
      const v = rng.pick([-2, -1, 1, 2]);
      if (kind === 'cycle') {
        const params = { kind, s: rng.pick([0.5, 1]) * rng.sign(), h: rng.int(-2, 1), w: 1, v: 0, x0: 0 };
        return { ...params, x0: params.h };
      }
      const turning = h + rng.sign() * w;
      const base = { kind, s, h, w, v, x0: turning };
      const { f, df } = nrFailCurve(base);
      if (Math.abs(f(turning)) < 1 || Math.abs(f(turning)) > 5) continue;
      if (kind === 'flat') return base;
      if (kind === 'far') {
        const x0 = turning + rng.pick([0.15, 0.2, 0.25]) * rng.sign();
        const x1 = x0 - f(x0) / df(x0);
        if (Math.abs(x1 - x0) < 3) continue;
        return { ...base, x0 };
      }
      const roots = rootsIn(f, -4, 4);
      if (roots.length === 0) continue;
      const root = rng.pick(roots);
      const x0 = Number((root + rng.pick([0.4, 0.5, 0.6]) * rng.sign()).toFixed(1));
      if (Math.abs(x0) > 3.5 || Math.abs(df(x0)) < 1.5) continue;
      const x1 = x0 - f(x0) / df(x0);
      if (Math.abs(x1 - root) > Math.abs(x0 - root) / 2) continue;
      if (Math.abs(f(x0)) > 5) continue;
      return { ...base, x0 };
    }
  },
  render: (params): Slide => {
    const { f, df } = nrFailCurve(params);
    const tangents = params.kind === 'cycle' ? [params.x0, params.x0 + 1] : [params.x0];
    const svg = plotSvg({
      xMin: -4,
      xMax: 4,
      yMin: -6,
      yMax: 6,
      curves: [
        { f: clamped(f, 20) },
        ...tangents.map((at) => ({ f: clamped(tangentAt(f, df, at), 20), accent: true })),
      ],
      verticals: [{ x: params.x0 }],
      marks: tangents.map((at) => ({ x: at, y: f(at) })),
      label: 'A curve, with the tangent drawn at the starting value',
    });
    return choiceSlide(
      [
        say(
          params.kind === 'cycle'
            ? 'Newton-Raphson starts at the dashed line. The tangents there and at the next value are drawn. What happens?'
            : 'Newton-Raphson starts at the dashed line, and the tangent there is drawn. What happens next?',
        ),
        { kind: 'diagram', svg },
      ],
      (Object.keys(NR_FAIL_LABELS) as NrFailKind[]).map((kind) => ({ tex: NR_FAIL_LABELS[kind], correct: kind === params.kind })),
      false,
    );
  },
  solution: (params) => {
    switch (params.kind) {
      case 'flat':
        return [
          { text: "$x_0$ is at a turning point, so $f'(x_0) = 0$ and the tangent is horizontal." },
          { text: 'The formula would divide by zero: the tangent never reaches the axis. Start somewhere else.' },
        ];
      case 'far':
        return [
          { text: "$x_0$ is close to a turning point, so $f'(x_0)$ is small and the tangent is shallow." },
          { text: 'A shallow tangent meets the axis a long way off, so $x_1$ lands far from $x_0$, often nearer a different root.' },
        ];
      case 'good':
        return [
          { text: 'The tangent is steep near a root, and meets the axis close to it.' },
          { text: 'So $x_1$ is nearer the root than $x_0$, and the method homes in.' },
        ];
      case 'cycle':
        return [
          { text: 'The tangent at $x_0$ meets the axis at the next value, and the tangent there meets it back at $x_0$.' },
          { text: 'So the values repeat for ever and never reach a root. Start somewhere else.' },
        ];
    }
  },
};

interface NrFlowParams {
  /** f(x) = x^3 - 3k^2 x + c. */
  k: number;
  c: number;
  x0: number;
}

const nrFlowPoly = ({ k, c }: NrFlowParams): Poly => [1, 0, -3 * k * k, c];

/**
 * Two decisions from a start: is the tangent flat, and if not, which root
 * does the step land nearest? Sometimes that is not the root nearest the
 * start.
 */
const nrFailFlow: Generator<NrFlowParams> = {
  id: 'numer-nr-fail-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const k = difficulty > 1 ? rng.pick([1, 2]) : 2;
      const c = k === 1 ? rng.sign() : nonZero(rng, 12);
      const params = { k, c, x0: 0 };
      const poly = nrFlowPoly(params);
      const roots = rootsIn((x) => valueAt(poly, x), -6, 6);
      if (roots.length !== 3) continue;
      const labels = roots.map((r) => r.toFixed(1));
      if (new Set(labels).size !== 3) continue;
      if (rng.chance(difficulty > 1 ? 0.25 : 0.4)) return { ...params, x0: k * rng.sign() };
      const x0 = rng.int(-4, 4);
      if (Math.abs(x0) === k) continue;
      const fx = valueAt(poly, x0);
      const dx = valueAt(derivative(poly), x0);
      if (fx === 0 || dx === 0) continue;
      const x1 = x0 - fx / dx;
      const gaps = roots.map((r) => Math.abs(x1 - r)).sort((a, b) => a - b);
      if (gaps[1] - gaps[0] < 0.4 || Math.abs(x1) > 8) continue;
      return { ...params, x0 };
    }
  },
  render: (params): Slide => {
    const poly = nrFlowPoly(params);
    const roots = rootsIn((x) => valueAt(poly, x), -6, 6);
    const { x0 } = params;
    const fx = valueAt(poly, x0);
    const dx = valueAt(derivative(poly), x0);
    const label = (r: number) => `The root near $${r.toFixed(1)}$`;
    const nearestStart = roots.reduce((best, r) => (Math.abs(r - x0) < Math.abs(best - x0) ? r : best));
    const x1 = dx === 0 ? x0 : x0 - fx / dx;
    const landed = roots.reduce((best, r) => (Math.abs(r - x1) < Math.abs(best - x1) ? r : best));
    return {
      kind: 'flow',
      prompt: [
        say(
          `$f(x) = 0$ has roots near $${roots.map((r) => r.toFixed(1)).join('$, $')}$. Newton-Raphson starts from $x_0 = ${x0}$. What happens on the first step?`,
        ),
      ],
      subject: `f(x) = ${polyTex(poly)}`,
      steps: [
        {
          id: 'flat',
          ask: `Work out $f'(${x0})$. Is it zero?`,
          branches: [
            { label: 'Yes', outcome: 'Stop: the tangent is flat and never meets the axis, so there is no $x_1$. Start somewhere else.' },
            { label: 'No', to: 'near' },
          ],
        },
        {
          id: 'near',
          ask: `Work out $x_1 = x_0 - \\frac{f(x_0)}{f'(x_0)}$. Which root is it nearest?`,
          branches: roots.map((r) => ({
            label: label(r),
            outcome: `The next steps home in on the root near $${r.toFixed(1)}$, which is ${r === nearestStart ? '' : 'not '}the one nearest $x_0$.`,
          })),
        },
      ],
      answer: dx === 0 ? ['Yes'] : ['No', label(landed)],
    };
  },
  solution: (params) => {
    const poly = nrFlowPoly(params);
    const { x0 } = params;
    const fx = valueAt(poly, x0);
    const dx = valueAt(derivative(poly), x0);
    const steps: SolutionStep[] = [{ text: `$f'(x) = ${polyTex(derivative(poly))}$, so $f'(${x0}) = ${fmt(dx)}$.` }];
    if (dx === 0) {
      steps.push({ text: `$x_0 = ${x0}$ is a turning point: the tangent is flat and the formula would divide by zero.` });
      return steps;
    }
    const x1 = x0 - fx / dx;
    steps.push({ tex: `x_1 = ${x0} - \\frac{${fmt(fx)}}{${fmt(dx)}} \\approx ${x1.toFixed(2)}` });
    const roots = rootsIn((x) => valueAt(poly, x), -6, 6);
    const landed = roots.reduce((best, r) => (Math.abs(r - x1) < Math.abs(best - x1) ? r : best));
    steps.push({ text: `That is nearest the root near $${landed.toFixed(1)}$.` });
    return steps;
  },
};

interface TangentSliderParams {
  poly: Poly;
  x0: number;
}

const SLIDE_X = 5;

/**
 * Slide to where the tangent at x_0 meets the axis: that is x_1. Every
 * answer is on the quarter-steps the slider moves in.
 */
const tangentSlider: Generator<TangentSliderParams> = {
  id: 'numer-tangent-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const poly = difficulty > 1 ? [1, 0, nonZero(rng, 6), nonZero(rng, 6)] : [1, rng.int(-4, 4), nonZero(rng, 6)];
      const x0 = nonZero(rng, 3);
      const { fa, da, x1 } = newtonStep({ poly, x0 });
      if (fa === 0 || da === 0 || !terminates(x1 * 4, 0) || Math.abs(x1) > SLIDE_X - 0.5) continue;
      if (Math.abs(x1 - x0) < 0.5 || Math.abs(fa) > 9) continue;
      return { poly, x0 };
    }
  },
  render: ({ poly, x0 }): Slide => {
    const f = (x: number) => valueAt(poly, x);
    const df = (x: number) => valueAt(derivative(poly), x);
    return {
      kind: 'slider',
      prompt: [
        say(
          `The curve is $y = ${polyTex(poly)}$, with its tangent at $x_0 = ${x0}$ drawn. Slide the line to where the tangent meets the $x$-axis: that is $x_1$.`,
        ),
      ],
      min: -SLIDE_X,
      max: SLIDE_X,
      step: 0.25,
      answer: newtonStep({ poly, x0 }).x1,
      readout: 'x_1 = {v}',
      figure: {
        svg: plotSvg({
          xMin: -SLIDE_X,
          xMax: SLIDE_X,
          yMin: -10,
          yMax: 10,
          curves: [{ f: clamped(f, 30) }, { f: clamped(tangentAt(f, df, x0), 30), accent: true }],
          verticals: [{ x: x0 }],
          marks: [{ x: x0, y: f(x0) }],
          label: `A curve with its tangent at x equals ${x0}`,
        }),
        ...markerWindow(-SLIDE_X, SLIDE_X),
      },
    };
  },
  solution: ({ poly, x0 }) => {
    const { fa, da, x1 } = newtonStep({ poly, x0 });
    return [
      { text: `The tangent at $x_0$ meets the axis at $x_0 - \\frac{f(x_0)}{f'(x_0)}$. Here $f(${x0}) = ${fa}$ and $f'(${x0}) = ${da}$.` },
      { tex: `x_1 = ${x0} - \\frac{${fa}}{${da}} = ${fmt(x1)}` },
    ];
  },
};

interface FlatParams {
  /** Stationary points s1 < s2; f'(x) = m(x - s1)(x - s2). */
  s1: number;
  s2: number;
  c: number;
  /** 1 for x^3 - 3k^2 x + c, 2 for 2x^3 + ... */
  lead: 1 | 2;
}

function flatPoly({ s1, s2, c, lead }: FlatParams): Poly {
  // f' = 3 lead (x - s1)(x - s2), so f = lead x^3 - (3 lead / 2)(s1 + s2) x^2 + 3 lead s1 s2 x + c.
  return [lead, (-3 * lead * (s1 + s2)) / 2, 3 * lead * s1 * s2, c];
}

/** The starting values to avoid: where f'(x) = 0. */
const flatTiles: Generator<FlatParams> = {
  id: 'numer-flat-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1) {
        const s1 = rng.int(-4, 4);
        const s2 = rng.int(-4, 4);
        if (s1 >= s2 || s1 === -s2) continue;
        return { s1, s2, c: nonZero(rng, 9), lead: 2 };
      }
      const k = rng.int(1, 4);
      return { s1: -k, s2: k, c: nonZero(rng, 9), lead: 1 };
    }
  },
  render: (params): Slide => {
    const { s1, s2 } = params;
    const poly = flatPoly(params);
    const answer = [fmt(s1), fmt(s2)];
    return {
      kind: 'tiles',
      prompt: [
        say(`Newton-Raphson fails from any $x_0$ where the tangent is flat. For $f(x) = ${polyTex(poly)}$, which two starting values must be avoided?`),
      ],
      template: 'x = {0} \\text{ or } x = {1}',
      bank: fillBank(answer, [fmt(-s1), fmt(-s2), fmt(s1 + s2), fmt(s1 * s2), fmt(3 * s2), fmt(s2 * s2)].filter((t) => t !== '0')),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const poly = flatPoly(params);
    const df = derivative(poly);
    return [
      { text: `The tangent is flat where $f'(x) = 0$:` },
      { tex: `${polyTex(df)} = 0` },
      { tex: `${params.lead * 3}(${linFactor(params.s1)})(${linFactor(params.s2)}) = 0` },
      { text: `So avoid $x_0 = ${params.s1}$ and $x_0 = ${params.s2}$, and starting close to them.` },
    ];
  },
};

/* ================================================================
 * Level 2, lessons 4 and 5: the trapezium rule
 * ================================================================ */

type TrapFn = 'quad' | 'pow2' | 'recip';

interface TrapParams {
  fn: TrapFn;
  /** Quadratic coefficients, highest first. */
  poly: Poly;
  /** k in k/x. */
  k: number;
  a: number;
  h: number;
  n: number;
}

function trapF({ fn, poly, k }: TrapParams): (x: number) => number {
  if (fn === 'pow2') return (x) => 2 ** x;
  if (fn === 'recip') return (x) => k / x;
  return (x) => valueAt(poly, x);
}

function trapFTex({ fn, poly, k }: TrapParams): string {
  if (fn === 'pow2') return '2^{x}';
  if (fn === 'recip') return `\\frac{${k}}{x}`;
  return polyTex(poly);
}

function ordinates(params: TrapParams): number[] {
  const f = trapF(params);
  return Array.from({ length: params.n + 1 }, (_, i) => f(params.a + i * params.h));
}

function trapSums(params: TrapParams) {
  const ys = ordinates(params);
  const ends = ys[0] + ys[ys.length - 1];
  const mids = ys.slice(1, -1).reduce((s, y) => s + y, 0);
  const total = ends + 2 * mids;
  return { ys, ends, mids, total, area: (params.h / 2) * total };
}

/** Reciprocal draws whose every ordinate is whole: start, width, and the k that works. */
const RECIP_ROWS: { a: number; h: number; n: number; k: number[] }[] = [
  { a: 1, h: 1, n: 3, k: [12, 24, 36, 48, 60] },
  { a: 2, h: 1, n: 3, k: [60, 120] },
  { a: 1, h: 2, n: 3, k: [105] },
  { a: 1, h: 1, n: 4, k: [60, 120] },
  { a: 2, h: 1, n: 4, k: [60, 120] },
  { a: 3, h: 1, n: 3, k: [60, 120] },
  { a: 1, h: 1, n: 2, k: [6, 12, 18, 24, 30] },
  { a: 2, h: 1, n: 2, k: [12, 24] },
  { a: 1, h: 2, n: 2, k: [15, 30] },
];

/**
 * A function, interval and strip count with whole, positive ordinates. `n`
 * is the strip count wanted, where the draw allows it.
 */
function sampleTrap(rng: Rng, difficulty: number, counts: number[]): TrapParams {
  for (;;) {
    const n = rng.pick(counts);
    const fn: TrapFn = difficulty > 1 ? rng.pick<TrapFn>(['quad', 'pow2', 'recip']) : 'quad';
    if (fn === 'recip') {
      const rows = RECIP_ROWS.filter((row) => row.n === n);
      if (rows.length === 0) continue;
      const row = rng.pick(rows);
      return { fn, poly: [], k: rng.pick(row.k), a: row.a, h: row.h, n };
    }
    if (fn === 'pow2') return { fn, poly: [], k: 0, a: rng.int(0, 2), h: 1, n };
    const h = difficulty > 1 ? 2 : 1;
    const poly = [rng.pick([1, 1, 2, -1]), rng.int(-4, 4), rng.int(1, 12)];
    const params = { fn, poly, k: 0, a: rng.int(0, 3), h, n };
    const ys = ordinates(params);
    if (ys.some((y) => y <= 0 || y > 99)) continue;
    return params;
  }
}

function heightsText(params: TrapParams): string {
  const xs = Array.from({ length: params.n + 1 }, (_, i) => fmt(params.a + i * params.h));
  return `$x = ${xs.join(', ')}$`;
}

function integralTex(params: TrapParams): string {
  return `\\int_{${params.a}}^{${fmt(params.a + params.n * params.h)}} ${trapFTex(params)}\\,dx`;
}

/**
 * The ordinates and the rule's sums as a tree: the four heights, the two
 * sums, the bracket, the estimate.
 */
const ordinatesTree: Generator<TrapParams> = {
  id: 'numer-ordinates-tree',
  sample: (rng, difficulty) => sampleTrap(rng, difficulty, [3]),
  render: (params): Slide => {
    const { ys, ends, mids, total, area } = trapSums(params);
    const answer = [...ys, ends, mids, total, area].map(fmt);
    const f = trapF(params);
    const slips = [
      ends + mids,
      params.h * total,
      total / 2,
      f(params.a - params.h),
      f(params.a + 4 * params.h),
      2 * ends + mids,
    ].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Estimate the integral with 3 strips of width $h = ${fmt(params.h)}$. Top row: the heights $y_0$ to $y_3$ at ${heightsText(params)}. Then $y_0 + y_3$ and $y_1 + y_2$; then $y_0 + y_3 + 2(y_1 + y_2)$; last, $\\frac{h}{2}$ times that.`,
        ),
      ],
      expression: integralTex(params),
      nodes: [
        { id: 'y0', from: [] },
        { id: 'y1', from: [] },
        { id: 'y2', from: [] },
        { id: 'y3', from: [] },
        { id: 'ends', from: ['y0', 'y3'] },
        { id: 'mids', from: ['y1', 'y2'] },
        { id: 'total', from: ['ends', 'mids'] },
        { id: 'area', from: ['total'] },
      ],
      bank: numberBank(answer, slips, around([area, total])),
      answer,
    };
  },
  solution: (params) => trapSolution(params),
};

function trapSolution(params: TrapParams): SolutionStep[] {
  const { ys, ends, mids, total, area } = trapSums(params);
  const n = params.n;
  return [
    { text: `Strips of width $h = ${fmt(params.h)}$ put the heights at ${heightsText(params)}:` },
    { tex: ordinateRows(ys) },
    { text: `The two ends once, every middle height twice:` },
    { tex: aligned(`y_0 + y_{${n}} &= ${fmt(ends)}`, `${heightList(1, n - 1)} &= ${fmt(mids)}`) },
    { tex: `${fmt(ends)} + 2 \\times ${fmt(mids)} = ${fmt(total)}` },
    { tex: `\\frac{${fmt(params.h)}}{2} \\times ${fmt(total)} = ${fmt(area)}` },
  ];
}

/** `y_1 + y_2 + ... + y_{n-1}`, written out. */
function heightList(from: number, to: number): string {
  return Array.from({ length: to - from + 1 }, (_, i) => `y_${from + i}`).join(' + ');
}

/** The heights three to a row: seven of them on one line run off a phone. */
function ordinateRows(ys: number[]): string {
  const rows: string[] = [];
  for (let i = 0; i < ys.length; i += 3) {
    rows.push(ys.slice(i, i + 3).map((y, j) => `y_{${i + j}} = ${fmt(y)}`).join(',\\ '));
  }
  return `\\begin{gathered} ${rows.join(' \\\\ ')} \\end{gathered}`;
}

interface TrapFormulaParams {
  a: number;
  width: number;
  n: number;
  /** Which function is named, from FORMULA_FUNCTIONS. */
  f: number;
}

const FORMULA_FUNCTIONS = ['\\sqrt{x}', '\\ln x', 'e^{x}', '2^{x}', '\\frac{1}{x}', 'x^{3}'];

/**
 * The rule's shape as tiles: h/2 as a number, the two ends, the middle
 * heights. The strip count sets which heights are ends and which are middles.
 */
const trapeziumTiles: Generator<TrapFormulaParams> = {
  id: 'numer-trapezium-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = difficulty > 1 ? rng.pick([4, 5, 6]) : rng.pick([3, 4]);
      const width = difficulty > 1 ? rng.pick([1, 2, 3]) : n * rng.pick([1, 2]);
      const h = width / n;
      if (!terminates(h / 2, 3)) continue;
      return { a: rng.int(1, 4), width, n, f: rng.int(0, FORMULA_FUNCTIONS.length - 1) };
    }
  },
  render: ({ a, width, n, f }): Slide => {
    const h = width / n;
    const answer = [fmt(h / 2), `y_0 + y_${n}`, heightList(1, n - 1)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `Estimate $\\int_{${a}}^{${a + width}} ${FORMULA_FUNCTIONS[f]}\\,dx$ with ${n} strips. Complete the trapezium rule, where $y_0, y_1, \\ldots, y_${n}$ are the heights at the ends of the strips.`,
        ),
      ],
      template: 'A \\approx {0}[{1} + 2({2})]',
      bank: fillBank(answer, [
        fmt(h),
        fmt(2 * h),
        `y_0 + y_${n - 1}`,
        `y_1 + y_${n}`,
        heightList(0, n - 1),
        heightList(1, n),
      ]),
      answer,
    };
  },
  solution: ({ width, n }) => {
    const h = width / n;
    return [
      { text: `${n} strips across a width of $${width}$ makes $h = ${fmt(h)}$, so $\\frac{h}{2} = ${fmt(h / 2)}$.` },
      { text: `The heights run from $y_0$ to $y_${n}$. The two ends belong to one strip each; every middle height is shared by two strips, so it counts twice.` },
      {
        tex: aligned(
          `A &\\approx ${fmt(h / 2)}[y_0 + y_${n}`,
          `&\\quad + 2(${n > 4 ? `y_1 + y_2 + \\cdots + y_${n - 1}` : heightList(1, n - 1)})]`,
        ),
      },
    ];
  },
};

/** The estimate itself, typed. Not the integral: no `integrand` or `limits`. */
const trapeziumEstimate: Generator<TrapParams> = {
  id: 'numer-trapezium-estimate',
  sample: (rng, difficulty) => sampleTrap(rng, difficulty, [3, 4]),
  choices: (params) => {
    const { ends, mids, total, area } = trapSums(params);
    const h = params.h;
    return options(
      { tex: fmt(area), answer: fmt(area) },
      { tex: fmt(h * total), answer: fmt(h * total) },
      { tex: fmt((h / 2) * (ends + mids)), answer: fmt((h / 2) * (ends + mids)) },
      { tex: fmt(h * (ends + mids)), answer: fmt(h * (ends + mids)) },
      { tex: fmt(area + h), answer: fmt(area + h) },
    ).slice(0, 4);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`Use the trapezium rule with ${params.n} strips to estimate the integral.`), show(integralTex(params))],
    lead: `${integralTex(params)} \\approx`,
    keypad: [],
    answer: fmt(trapSums(params).area),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => trapSolution(params),
};

/**
 * The rule worked along a line: the ends, the doubled middles, the bracket,
 * then h/2 times it.
 */
const trapeziumSteps: Generator<TrapParams> = {
  id: 'numer-trapezium-steps',
  sample: (rng, difficulty) => sampleTrap(rng, difficulty, [3, 4]),
  render: (params): Slide => {
    const { ys, ends, mids, total, area } = trapSums(params);
    const n = params.n;
    const half = params.h / 2;
    const middle = ys.slice(1, -1).map(fmt).join(' + ');
    return {
      kind: 'steps',
      prompt: [
        say(
          `The trapezium rule for $${integralTex(params)}$ with ${n} strips, $h = ${fmt(params.h)}$, is set up below from the heights $y_0$ to $y_${n}$. Tap the part you would work out next, then choose what it comes to.`,
        ),
      ],
      start: [fmt(half), '\\times', '[', `${fmt(ys[0])} + ${fmt(ys[n])}`, '+', `2(${middle})`, ']'],
      reductions: [
        { span: [3, 4], value: fmt(ends), bank: stepBank(fmt(ends), fmt(ends + 1), fmt(ends - 1), fmt(ys[0] * ys[n])) },
        { span: [5, 6], value: fmt(2 * mids), bank: stepBank(fmt(2 * mids), fmt(mids), fmt(mids + 2), fmt(2 * mids + 2)) },
        { span: [2, 7], operator: 4, value: fmt(total), bank: stepBank(fmt(total), fmt(ends + mids), fmt(total + 1), fmt(total - 2)) },
        { span: [0, 3], operator: 1, value: fmt(area), bank: stepBank(fmt(area), fmt(params.h * total), fmt(total), fmt(area + half)) },
      ],
    };
  },
  solution: (params) => trapSolution(params),
};

type Bend = 'up' | 'down';

interface CurveChoice {
  tex: string;
  f: (x: number) => number;
  /** Where the curve may be drawn from. */
  from: number;
  bend: Bend;
  /** f'' written out, with two slips beside it. */
  second: string;
  slips: string[];
}

/** Curves the concavity questions draw from, each bending one way over x > from. */
const CURVES: CurveChoice[] = [
  { tex: 'x^{2} + 1', f: (x) => x * x + 1, from: -3, bend: 'up', second: '2', slips: ['2x', '0'] },
  { tex: '2^{x}', f: (x) => 2 ** x, from: -2, bend: 'up', second: '2^{x}(\\ln 2)^{2}', slips: ['x(x - 1)2^{x - 2}', '-2^{x}'] },
  { tex: '\\frac{6}{x}', f: (x) => 6 / x, from: 0.5, bend: 'up', second: '\\frac{12}{x^{3}}', slips: ['-\\frac{6}{x^{2}}', '-\\frac{12}{x^{3}}'] },
  { tex: 'e^{x}', f: (x) => Math.exp(x), from: -2, bend: 'up', second: 'e^{x}', slips: ['xe^{x - 1}', '-e^{x}'] },
  { tex: '\\sqrt{x}', f: (x) => Math.sqrt(x), from: 0.25, bend: 'down', second: '-\\frac{1}{4}x^{-\\frac{3}{2}}', slips: ['\\frac{1}{2}x^{-\\frac{1}{2}}', '\\frac{1}{4}x^{-\\frac{3}{2}}'] },
  { tex: '\\ln x', f: (x) => Math.log(x), from: 0.5, bend: 'down', second: '-\\frac{1}{x^{2}}', slips: ['\\frac{1}{x}', '\\frac{1}{x^{2}}'] },
  { tex: '9 - x^{2}', f: (x) => 9 - x * x, from: -3, bend: 'down', second: '-2', slips: ['-2x', '2'] },
];

interface ConcavityParams {
  curve: number;
  a: number;
  n: number;
  /** Difficulty 2 names the curve without drawing it. */
  drawn: boolean;
}

const OVER = 'An overestimate';
const UNDER = 'An underestimate';

/** The chords the rule draws, as one piecewise-straight function. */
function chords(f: (x: number) => number, a: number, h: number, n: number): (x: number) => number {
  return (x) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor((x - a) / h)));
    const x0 = a + i * h;
    return f(x0) + ((f(x0 + h) - f(x0)) / h) * (x - x0);
  };
}

/**
 * Over or under, from the way the curve bends: a picture with the chords
 * drawn at difficulty 1, the formula alone at 2.
 */
const concavityChoice: Generator<ConcavityParams> = {
  id: 'numer-concavity-choice',
  sample: (rng, difficulty) => {
    const curve = rng.int(0, CURVES.length - 1);
    const from = CURVES[curve].from;
    const a = Math.ceil(from) + rng.int(0, 2) + (from > 0 && Math.ceil(from) === from ? 0 : 0);
    return { curve, a: Math.max(a, from > 0 ? 1 : a), n: rng.pick([2, 3, 4]), drawn: difficulty === 1 };
  },
  render: ({ curve, a, n, drawn }): Slide => {
    const c = CURVES[curve];
    const b = a + 2;
    const h = 2 / n;
    const prompt: Block[] = [
      say(`The trapezium rule with ${n} strips is used to estimate $\\int_{${a}}^{${b}} ${c.tex}\\,dx$. Is the estimate too big or too small?`),
    ];
    if (drawn) {
      const ys = [c.f(a), c.f(b)];
      const top = Math.max(...ys, c.f(a + 1)) * 1.15 + 0.5;
      prompt.push({
        kind: 'diagram',
        svg: plotSvg({
          xMin: a - 0.5,
          xMax: b + 0.5,
          yMin: Math.min(0, ...ys) - 0.5,
          yMax: top,
          curves: [{ f: c.f }, { f: chords(c.f, a, h, n), accent: true }],
          shade: { f: chords(c.f, a, h, n), from: a, to: b },
          verticals: Array.from({ length: n + 1 }, (_, i) => ({ x: a + i * h })),
          label: `The curve y = ${c.tex} with the trapezium tops drawn as straight chords`,
        }),
      });
    }
    return choiceSlide(prompt, [
      { tex: OVER, correct: c.bend === 'up' },
      { tex: UNDER, correct: c.bend === 'down' },
      { tex: 'Exactly right' },
    ], false);
  },
  solution: ({ curve }) => {
    const c = CURVES[curve];
    return c.bend === 'up'
      ? [
          { text: `$y = ${c.tex}$ bends upward: $\\frac{d^{2}y}{dx^{2}} = ${c.second} > 0$ here.` },
          { text: 'So each straight chord sits above the curve, and the trapezia hold a little more area than the curve does: an overestimate.' },
        ]
      : [
          { text: `$y = ${c.tex}$ bends downward: $\\frac{d^{2}y}{dx^{2}} = ${c.second} < 0$ here.` },
          { text: 'So each straight chord sits below the curve, and the trapezia miss a little of the area: an underestimate.' },
        ];
  },
};

interface ConcavityFlowParams {
  /** x^3 + r x^2 + p x + q on [a, a + 2], or k/x on [a, a + 2] with a > 0. */
  kind: 'cubic' | 'recip';
  r: number;
  p: number;
  q: number;
  k: number;
  a: number;
}

function concavityFacts({ kind, r, p, q, k, a }: ConcavityFlowParams) {
  if (kind === 'recip') {
    return {
      tex: `\\frac{${k}}{x}`,
      second: `\\frac{${2 * k}}{x^{3}}`,
      slips: [`-\\frac{${k}}{x^{2}}`, `-\\frac{${2 * k}}{x^{3}}`],
      positive: k > 0,
    };
  }
  const poly = [1, r, p, q];
  return {
    tex: polyTex(poly),
    second: polyTex([6, 2 * r]),
    slips: [polyTex(derivative(poly)), polyTex([3, 2 * r])],
    positive: 6 * a + 2 * r > 0,
  };
}

/** Which is f'', then its sign on the interval, then over or under. */
const concavityFlow: Generator<ConcavityFlowParams> = {
  id: 'numer-concavity-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1 && rng.chance(0.4)) {
        return { kind: 'recip', r: 0, p: 0, q: 0, k: nonZero(rng, 12), a: rng.int(1, 4) };
      }
      const r = nonZero(rng, 6);
      const a = rng.int(-4, 3);
      // f'' = 6x + 2r keeps one sign across the whole of [a, a + 2].
      if ((6 * a + 2 * r) * (6 * (a + 2) + 2 * r) <= 0) continue;
      return { kind: 'cubic', r, p: rng.int(-9, 9), q: rng.int(-9, 9), k: 0, a };
    }
  },
  render: (params): Slide => {
    const facts = concavityFacts(params);
    const b = params.a + 2;
    return {
      kind: 'flow',
      prompt: [say(`Will the trapezium rule over- or underestimate $\\int_{${params.a}}^{${b}} f(x)\\,dx$?`)],
      subject: `f(x) = ${facts.tex}`,
      steps: [
        {
          id: 'second',
          ask: "Which is $f''(x)$?",
          branches: turned([facts.second, ...facts.slips], facts.tex).map((label) => ({ label: `$${label}$`, to: 'sign' })),
        },
        {
          id: 'sign',
          ask: `On $[${params.a}, ${b}]$, is $f''(x)$ positive or negative?`,
          branches: [
            { label: 'Positive', outcome: 'The curve bends upward, so the chords sit above it: an overestimate.' },
            { label: 'Negative', outcome: 'The curve bends downward, so the chords sit below it: an underestimate.' },
          ],
        },
      ],
      answer: [`$${facts.second}$`, facts.positive ? 'Positive' : 'Negative'],
    };
  },
  solution: (params) => {
    const facts = concavityFacts(params);
    const b = params.a + 2;
    return [
      { tex: `f''(x) = ${facts.second}` },
      {
        text:
          params.kind === 'recip'
            ? `For $x$ in $[${params.a}, ${b}]$, $x^{3} > 0$, so $f''(x)$ has the sign of $${2 * params.k}$: ${facts.positive ? 'positive' : 'negative'}.`
            : `At $x = ${params.a}$ it is $${6 * params.a + 2 * params.r}$ and at $x = ${b}$ it is $${6 * b + 2 * params.r}$: ${facts.positive ? 'positive' : 'negative'} throughout.`,
      },
      { text: facts.positive ? 'Concave up, so the trapezium rule overestimates.' : 'Concave down, so the trapezium rule underestimates.' },
    ];
  },
};

interface ErrorParams {
  poly: Poly;
  a: number;
  n: number;
}

/** The exact integral of a polynomial over [a, b], from its antiderivative. */
function exactIntegral(poly: Poly, a: number, b: number): number {
  const n = poly.length - 1;
  return poly.reduce((sum, c, i) => {
    const k = n - i;
    return sum + (c * (b ** (k + 1) - a ** (k + 1))) / (k + 1);
  }, 0);
}

function errorFacts({ poly, a, n }: ErrorParams) {
  const params: TrapParams = { fn: 'quad', poly, k: 0, a, h: 1, n };
  const { area } = trapSums(params);
  const exact = exactIntegral(poly, a, a + n);
  return { area, exact, error: area - exact };
}

/**
 * The error, estimate minus exact value, for a polynomial whose integral is
 * whole: the x^2 coefficient a multiple of 3, the x coefficient even and the
 * x^3 coefficient a multiple of 4, so every antiderivative term is whole.
 */
const errorValue: Generator<ErrorParams> = {
  id: 'numer-error-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const poly =
        difficulty > 1
          ? [rng.pick([4, -4, 8]), 3 * rng.int(-2, 2), 2 * rng.int(-3, 3), rng.int(1, 9)]
          : [rng.pick([3, 6, -3]), 2 * rng.int(-3, 3), rng.int(1, 9)];
      const a = rng.int(0, 2);
      const n = rng.pick([2, 3]);
      const { area, exact, error } = errorFacts({ poly, a, n });
      if (!terminates(area, 1) || !Number.isInteger(Math.round(exact * 1e6) / 1e6) || Math.abs(error) < 0.1) continue;
      if (Math.abs(exact) > 300) continue;
      return { poly, a, n };
    }
  },
  render: (params): Slide => {
    const { area, error } = errorFacts(params);
    const b = params.a + params.n;
    return {
      kind: 'expression',
      prompt: [
        say(`The trapezium rule with ${params.n} strips gives $${fmt(area)}$ for the integral below. Integrate exactly, then find the error: the estimate minus the exact value.`),
        show(`\\int_{${params.a}}^{${b}} (${polyTex(params.poly)})\\,dx`),
      ],
      lead: '\\text{error} =',
      keypad: [],
      answer: fmt(error),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { area, exact, error } = errorFacts(params);
    const b = params.a + params.n;
    const k = params.poly.length - 1;
    const anti = sumTex(params.poly.map((c, i) => termTex(c / (k - i + 1), k - i + 1)));
    return [
      { text: 'Integrate term by term:' },
      { tex: aligned(`&\\Big[${anti}\\Big]_{${params.a}}^{${b}}`, `&= ${fmt(exact)}`) },
      { tex: aligned(`\\text{error} &= ${fmt(area)} - ${paren(exact)}`, `&= ${fmt(error)}`) },
      { text: error > 0 ? 'Positive: the rule overestimated, as it does for a curve bending upward.' : 'Negative: the rule underestimated, as it does for a curve bending downward.' },
    ];
  },
};

interface MeanHeightParams {
  trap: TrapParams;
}

/**
 * A trapezium has the same area as a rectangle whose height is the mean of
 * its two ends. Slide to that height. Difficulty 2 has two strips, whose mean
 * height is (y_0 + 2y_1 + y_2)/4.
 */
const meanHeightSlider: Generator<MeanHeightParams> = {
  id: 'numer-mean-height-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const two = difficulty > 1;
      const trap = sampleTrap(rng, two ? 2 : 1, [two ? 2 : 1]);
      const width = trap.h * trap.n;
      if (!two && trap.fn === 'quad') {
        // One strip of width 2 or 3, so the curve has room to bend.
        const wide = { ...trap, h: rng.pick([2, 3]) };
        const ys = ordinates(wide);
        if (ys.some((y) => y <= 0 || y > 20)) continue;
        return { trap: wide };
      }
      const ys = ordinates(trap);
      if (ys.some((y) => y <= 0 || y > 30) || width < 2) continue;
      return { trap };
    }
  },
  render: ({ trap }): Slide => {
    const { total } = trapSums(trap);
    const f = trapF(trap);
    const n = trap.n;
    const mean = total / (2 * n);
    const b = trap.a + n * trap.h;
    const ys = ordinates(trap);
    const top = Math.ceil(Math.max(...ys, f((trap.a + b) / 2)) + 2);
    return {
      kind: 'slider',
      prompt: [
        say(
          n === 1
            ? `A single trapezium over $[${trap.a}, ${b}]$ under $y = ${trapFTex(trap)}$ has the same area as a rectangle of the same width whose height is the mean of the two end heights. Slide the line to that height.`
            : `The two trapezia over $[${trap.a}, ${b}]$ under $y = ${trapFTex(trap)}$ have the same area as a rectangle of the same width, of height $\\frac{y_0 + 2y_1 + y_2}{4}$. Slide the line to that height.`,
        ),
      ],
      min: 0,
      max: top,
      step: n === 1 ? 0.5 : 0.25,
      answer: mean,
      readout: '\\text{height} = {v}',
      figure: {
        svg: plotSvg({
          xMin: trap.a - 0.5,
          xMax: b + 0.5,
          yMin: 0,
          yMax: top,
          curves: [{ f }, { f: chords(f, trap.a, trap.h, n), accent: true }],
          verticals: Array.from({ length: n + 1 }, (_, i) => ({ x: trap.a + i * trap.h })),
          label: `The curve y = ${trapFTex(trap)} with the trapezium tops drawn`,
        }),
        ...markerWindow(0, top, 'y'),
        axis: 'y',
      },
    };
  },
  solution: ({ trap }) => {
    const ys = ordinates(trap);
    const { total } = trapSums(trap);
    const n = trap.n;
    return n === 1
      ? [
          { text: `The end heights are $${fmt(ys[0])}$ and $${fmt(ys[1])}$.` },
          { tex: `\\frac{${fmt(ys[0])} + ${fmt(ys[1])}}{2} = ${fmt(total / 2)}` },
          { text: 'Width times this height is exactly the trapezium rule with one strip.' },
        ]
      : [
          { text: `The heights are $${ys.map(fmt).join('$, $')}$. The middle one is shared by both trapezia, so it counts twice.` },
          { tex: `\\frac{${fmt(ys[0])} + 2 \\times ${fmt(ys[1])} + ${fmt(ys[2])}}{4} = ${fmt(total / 4)}` },
        ];
  },
};

/* ================================================================
 * Level 3: bounds and errors, shared helpers
 * ================================================================ */

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** The other sign of a written number. */
function flipped(token: string): string {
  return token.startsWith('-') ? token.slice(1) : `-${token}`;
}

/** Half a unit in the last of `dp` places: the most rounding can move a value. */
const halfUnit = (dp: number) => 0.5 * 10 ** -dp;

/** How a rounded value was given. */
function precisionText(dp: number): string {
  return dp === 0 ? 'to the nearest whole number' : `to ${dp} decimal place${dp === 1 ? '' : 's'}`;
}

/** A size of error, to two significant figures, for a worked solution. */
function roughly(value: number): string {
  return Math.abs(value).toPrecision(2);
}

/** A value's lower and upper bound, written to one place more than it was given. */
function boundsOfValue(value: number, dp: number): [number, number] {
  const h = halfUnit(dp);
  return [Number((value - h).toFixed(dp + 1)), Number((value + h).toFixed(dp + 1))];
}

/** An exact value that is a fraction or a root, and the number it stands for. */
interface ExactValue {
  kind: 'frac' | 'sqrt' | 'cbrt';
  /** frac: a / b. sqrt, cbrt: the root of a. */
  a: number;
  b: number;
}

function exactOf({ kind, a, b }: ExactValue): number {
  return kind === 'frac' ? a / b : kind === 'sqrt' ? Math.sqrt(a) : Math.cbrt(a);
}

function exactTex({ kind, a, b }: ExactValue): string {
  return kind === 'frac' ? `\\frac{${a}}{${b}}` : kind === 'sqrt' ? `\\sqrt{${a}}` : `\\sqrt[3]{${a}}`;
}

/** A fraction that does not terminate, or a root that is not whole: something an estimate can only approach. */
function sampleEndless(rng: Rng, kind: ExactValue['kind']): ExactValue {
  for (;;) {
    if (kind === 'frac') {
      const b = rng.pick([3, 6, 7, 9, 11, 12, 13]);
      const a = rng.int(1, 4 * b);
      if (gcd(a, b) !== 1 || a % b === 0) continue;
      return { kind, a, b };
    }
    const a = kind === 'sqrt' ? rng.int(2, 99) : rng.int(2, 60);
    const root = exactOf({ kind, a, b: 1 });
    if (Math.abs(root - Math.round(root)) < 0.02) continue;
    return { kind, a, b: 1 };
  }
}

/* ================================================================
 * Level 3, lesson 1: absolute error
 * ================================================================ */

interface AbsErrorParams {
  /** α = p / q, the positive root of (q x - p)(x + r) = 0. */
  p: number;
  q: number;
  r: number;
  /** The iterate x_n, and n. */
  estimate: number;
  n: number;
  /** Difficulty 2 gives only the factorised equation, so α has to be found first. */
  hidden: boolean;
}

function absErrorFacts({ p, q, estimate }: AbsErrorParams) {
  const alpha = p / q;
  return { alpha, error: estimate - alpha };
}

/**
 * The error in an iterate, estimate minus exact value, for a root known
 * exactly as a fraction that terminates. At difficulty 2 the root has to be
 * read off a factorised quadratic first, and sits nearer the estimate.
 */
const absError: Generator<AbsErrorParams> = {
  id: 'numer-abs-error',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const q = hard ? rng.pick([8, 16, 20, 40]) : rng.pick([2, 4, 5, 8]);
      const p = rng.int(Math.ceil(0.2 * q), 6 * q);
      if (gcd(p, q) !== 1 || p % q === 0) continue;
      const dp = hard ? 4 : 3;
      const unit = 10 ** -dp;
      const k = rng.int(1, hard ? 60 : 40) * rng.sign();
      const estimate = Number(((Math.round((p / q) / unit) + k) * unit).toFixed(dp));
      if (!terminates(p / q, dp)) continue;
      return { p, q, r: rng.int(1, 6), estimate, n: rng.int(2, 5), hidden: hard };
    }
  },
  render: (params): Slide => {
    const { p, q, r, estimate, n, hidden } = params;
    const where = hidden
      ? `the positive root $\\alpha$ of $(${q}x - ${p})(x + ${r}) = 0$`
      : `the root $\\alpha = \\frac{${p}}{${q}}$`;
    return {
      kind: 'expression',
      prompt: [
        say(`An iteration converging to ${where} has reached $x_{${n}} = ${fmt(estimate)}$. Find the error in $x_{${n}}$: the estimate minus the exact value.`),
      ],
      lead: '\\text{error} =',
      keypad: [],
      answer: fmt(absErrorFacts(params).error),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { p, q, estimate, n, hidden } = params;
    const { alpha, error } = absErrorFacts(params);
    const steps: SolutionStep[] = [];
    if (hidden) steps.push({ text: `The positive root comes from the first bracket: $${q}x - ${p} = 0$, so $\\alpha = \\frac{${p}}{${q}}$.` });
    steps.push(
      { tex: `\\frac{${p}}{${q}} = ${fmt(alpha)}` },
      { tex: aligned(`\\text{error} &= ${fmt(estimate)} - ${fmt(alpha)}`, `&= ${fmt(error)}`) },
      { text: error > 0 ? `Positive: $x_{${n}}$ is an overestimate.` : `Negative: $x_{${n}}$ is an underestimate.` },
    );
    return steps;
  },
};

interface AbsSizeParams {
  num: number;
  den: number;
  estimate: number;
  dp: number;
}

/**
 * The absolute error of a decimal estimate of a fraction, worked along a
 * line: the fraction as a decimal, the difference, then its size.
 */
const absSizeSteps: Generator<AbsSizeParams> = {
  id: 'numer-abs-size-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const den = hard ? rng.pick([8, 16, 32, 40, 80]) : rng.pick([4, 8, 20, 25]);
      const num = rng.int(1, 3 * den);
      if (gcd(num, den) !== 1 || num % den === 0) continue;
      const dp = hard ? 2 : 1;
      const unit = 10 ** -dp;
      const exact = num / den;
      const estimate = Number(((Math.round(exact / unit) + rng.pick([-1, 0, 0, 1])) * unit).toFixed(dp));
      if (Math.abs(estimate - exact) < 1e-9 || estimate <= 0) continue;
      return { num, den, estimate, dp };
    }
  },
  render: ({ num, den, estimate, dp }): Slide => {
    const exact = num / den;
    const value = fmt(exact);
    const error = fmt(estimate - exact);
    const size = fmt(Math.abs(estimate - exact));
    const rounded = fmt(Number(exact.toFixed(dp)));
    return {
      kind: 'steps',
      prompt: [
        say(
          `The absolute error is the size of the error, ignoring its sign. Find it for the estimate $\\frac{${num}}{${den}} \\approx ${fmt(estimate)}$: tap the part you would do next, then choose what it comes to.`,
        ),
      ],
      start: ['|', fmt(estimate), '-', `\\frac{${num}}{${den}}`, '|'],
      reductions: [
        {
          span: [3, 4],
          value,
          bank: stepBank(value, `${num}.${den}`, rounded === value ? fmt(exact + 0.1) : rounded, fmt(exact * 10)),
        },
        { span: [1, 4], operator: 2, value: error, bank: stepBank(error, flipped(error), fmt(estimate + exact), fmt((estimate - exact) * 10)) },
        { span: [0, 3], value: size, bank: stepBank(size, flipped(size), fmt(Math.abs(estimate - exact) * 10), fmt(halfUnit(dp))) },
      ],
    };
  },
  solution: ({ num, den, estimate }) => {
    const exact = num / den;
    const error = estimate - exact;
    return [
      { tex: `\\frac{${num}}{${den}} = ${fmt(exact)}` },
      { tex: aligned(`&${fmt(estimate)} - ${fmt(exact)}`, `&= ${fmt(error)}`) },
      { text: `The absolute error is its size, $${fmt(Math.abs(error))}$. The sign only says the estimate is ${error > 0 ? 'too big' : 'too small'}.` },
    ];
  },
};

interface ClosestParams {
  exact: ExactValue;
  /** The four estimates offered, as written. */
  estimates: string[];
}

/** Estimates of a value to one, two and three places: rounded, cut off, and rounded the wrong way. */
function estimatesOf(value: number): string[] {
  const out = [1, 2, 3].flatMap((dp) => [value.toFixed(dp), truncated(value, dp), roundedWrongWay(value, dp)]);
  return [...new Set(out)].filter((token) => Math.abs(Number(token) - value) > 1e-9);
}

/**
 * Which of four estimates is closest. More places are not always closer: a
 * value cut off at three places can beat one rounded at two, and the other way
 * about. Difficulty 2 estimates a root rather than a fraction.
 */
const closestChoice: Generator<ClosestParams> = {
  id: 'numer-closest-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const exact = sampleEndless(rng, difficulty > 1 ? rng.pick(['sqrt', 'cbrt'] as const) : 'frac');
      const value = exactOf(exact);
      const estimates = rng.sample(estimatesOf(value), 4);
      const sizes = estimates.map((token) => Math.abs(Number(token) - value)).sort((a, b) => a - b);
      if (sizes[1] < 1.5 * sizes[0]) continue;
      // Not simply the one with the most places.
      const places = (token: string) => token.split('.')[1].length;
      const best = estimates.find((token) => Math.abs(Number(token) - value) === sizes[0])!;
      if (difficulty > 1 && estimates.filter((token) => places(token) === places(best)).length < 2) continue;
      return { exact, estimates };
    }
  },
  render: ({ exact, estimates }): Slide => {
    const value = exactOf(exact);
    const best = Math.min(...estimates.map((token) => Math.abs(Number(token) - value)));
    return choiceSlide(
      [say(`Which estimate of $${exactTex(exact)}$ has the smallest absolute error?`)],
      estimates.map((token) => ({ tex: token, correct: Math.abs(Number(token) - value) === best })),
    );
  },
  solution: ({ exact, estimates }) => {
    const value = exactOf(exact);
    const sorted = [...estimates].sort((a, b) => Math.abs(Number(a) - value) - Math.abs(Number(b) - value));
    return [
      { text: `$${exactTex(exact)} = ${value.toFixed(6)}\\ldots$. Take each estimate away from it and ignore the sign:` },
      ...sorted.map((token) => ({ tex: `|${token} - ${exactTex(exact)}| \\approx ${roughly(Number(token) - value)}` })),
      { text: `$${sorted[0]}$ is closest. More decimal places only help when they are the right ones.` },
    ];
  },
};

interface OverUnderParams {
  exact: ExactValue;
  estimate: string;
  dp: number;
}

/**
 * Two decisions about an estimate: over or under, then whether it is out by
 * no more than rounding would allow, which is whether it is the exact value
 * correctly rounded.
 */
const overUnderFlow: Generator<OverUnderParams> = {
  id: 'numer-over-under-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const dp = hard ? 3 : 2;
    const unit = 10 ** -dp;
    const close = rng.chance(0.5);
    for (;;) {
      const exact = sampleEndless(rng, hard ? rng.pick(['sqrt', 'cbrt'] as const) : 'frac');
      const value = exactOf(exact);
      const nearest = Math.round(value / unit);
      const units = close ? nearest : nearest + rng.sign();
      const off = Math.abs(units - value / unit);
      if (Math.abs(off - 0.5) < 0.1 || off < 0.05) continue;
      return { exact, estimate: (units * unit).toFixed(dp), dp };
    }
  },
  render: ({ exact, estimate, dp }): Slide => {
    const value = exactOf(exact);
    const error = Number(estimate) - value;
    const half = fmt(halfUnit(dp));
    const size = (word: string) => ({
      ask: `Is its size at most half a unit in the last place of the estimate, $${half}$?`,
      branches: turned(
        [
          { label: 'Yes', outcome: `An ${word}, and it is the exact value correctly rounded to ${dp} decimal places.` },
          { label: 'No', outcome: `An ${word}, and out by more than rounding explains: it is not the exact value correctly rounded.` },
        ],
        `${estimate}${word}`,
      ),
    });
    return {
      kind: 'flow',
      prompt: [say(`Is the estimate below too big or too small, and is it the exact value correctly rounded?`)],
      subject: `${exactTex(exact)} \\approx ${estimate}`,
      steps: [
        {
          id: 'sign',
          ask: 'Work out the error, the estimate minus the exact value. Is it positive or negative?',
          branches: [
            { label: 'Positive', to: 'over' },
            { label: 'Negative', to: 'under' },
          ],
        },
        { id: 'over', ...size('overestimate') },
        { id: 'under', ...size('underestimate') },
      ],
      answer: [error > 0 ? 'Positive' : 'Negative', Math.abs(error) <= halfUnit(dp) ? 'Yes' : 'No'],
    };
  },
  solution: ({ exact, estimate, dp }) => {
    const value = exactOf(exact);
    const error = Number(estimate) - value;
    return [
      { tex: `${exactTex(exact)} = ${value.toFixed(dp + 3)}\\ldots` },
      { tex: aligned(`\\text{error} &= ${estimate} - ${value.toFixed(dp + 3)}\\ldots`, `&\\approx ${error.toFixed(dp + 2)}`) },
      {
        text: `${error > 0 ? 'Positive, so an overestimate' : 'Negative, so an underestimate'}. Its size is ${Math.abs(error) <= halfUnit(dp) ? 'within' : 'more than'} $${fmt(halfUnit(dp))}$, so $${estimate}$ ${Math.abs(error) <= halfUnit(dp) ? 'is' : 'is not'} the exact value rounded to ${dp} decimal places${Math.abs(error) <= halfUnit(dp) ? '' : `; that would be $${value.toFixed(dp)}$`}.`,
      },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 2: relative and percentage error
 * ================================================================ */

interface RelParams {
  exact: number;
  /** The relative error, signed, an exact decimal. */
  rel: number;
  /** Which story the numbers are told in. */
  context: 0 | 1 | 2;
  percent: boolean;
}

const REL_EASY = [0.002, 0.004, 0.005, 0.01, 0.02, 0.025, 0.04, 0.05, 0.08, 0.1];
const REL_HARD = [0.0025, 0.0125, 0.015, 0.035, 0.045, 0.06, 0.075, 0.12, 0.15];

/** The estimate the relative error implies, exact to a few places. */
const relEstimate = ({ exact, rel }: Pick<RelParams, 'exact' | 'rel'>) => Number((exact * (1 + rel)).toFixed(6));

/**
 * An exact value and a relative error whose estimate is a short decimal.
 * Difficulty 2 has exact values that are not whole and less round errors.
 */
function sampleRel(rng: Rng, difficulty: number): Pick<RelParams, 'exact' | 'rel'> {
  const hard = difficulty > 1;
  for (;;) {
    const exact = hard ? rng.pick([rng.int(2, 60) / 4, rng.int(2, 99) / 5, rng.int(20, 400)]) : rng.int(2, 250);
    const rel = rng.pick(hard ? REL_HARD : REL_EASY) * rng.sign();
    if (!terminates(exact * rel, 3) || Math.abs(exact - 100) < 1e-9) continue;
    return { exact: Number(exact.toFixed(2)), rel };
  }
}

function relStory({ exact, rel, context }: RelParams): string {
  const estimate = fmt(relEstimate({ exact, rel }));
  switch (context) {
    case 0:
      return `A length of exactly $${fmt(exact)}$ cm is measured as $${estimate}$ cm.`;
    case 1:
      return `The trapezium rule gives $${estimate}$ for an integral whose exact value is $${fmt(exact)}$.`;
    case 2:
      return `A value of exactly $${fmt(exact)}$ is stored as $${estimate}$.`;
  }
}

const relAnswer = ({ rel, percent }: Pick<RelParams, 'rel' | 'percent'>) => fmt(percent ? rel * 100 : rel);

/**
 * The relative error, error over exact value, typed; as a percentage at
 * difficulty 2. Its multiple-choice form offers the sign slip, the error not
 * divided, and the percentage for the fraction or the other way round.
 */
const relError: Generator<RelParams> = {
  id: 'numer-rel-error',
  sample: (rng, difficulty) => ({ ...sampleRel(rng, difficulty), context: rng.pick([0, 1, 2] as const), percent: difficulty > 1 }),
  choices: (params) => {
    const right = relAnswer(params);
    const error = fmt(relEstimate(params) - params.exact);
    const other = fmt(params.percent ? params.rel : params.rel * 100);
    return options(
      { tex: right, answer: right },
      { tex: flipped(right), answer: flipped(right) },
      { tex: error, answer: error },
      { tex: other, answer: other },
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `${relStory(params)} Find the ${params.percent ? 'percentage error, as a number of per cent' : 'relative error'}: the error divided by the exact value${params.percent ? ', times 100' : ''}.`,
      ),
    ],
    lead: params.percent ? '\\text{percentage error (\\%)} =' : '\\text{relative error} =',
    keypad: [],
    answer: relAnswer(params),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const estimate = relEstimate(params);
    const error = estimate - params.exact;
    return [
      { tex: aligned(`\\text{error} &= ${fmt(estimate)} - ${fmt(params.exact)}`, `&= ${fmt(error)}`) },
      { tex: aligned(`\\text{relative} &= \\frac{${fmt(error)}}{${fmt(params.exact)}}`, `&= ${fmt(params.rel)}`) },
      ...(params.percent ? [{ tex: `${fmt(params.rel)} \\times 100 = ${fmt(params.rel * 100)}\\%` }] : []),
      { text: `Divide by the exact value, never the estimate. ${params.rel > 0 ? 'Positive: an overestimate.' : 'Negative: an underestimate.'}` },
    ];
  },
};

/**
 * The relative error built from the two values, then worked out. The exact
 * value is needed twice, and the estimate once.
 */
const relTiles: Generator<Omit<RelParams, 'context'>> = {
  id: 'numer-rel-tiles',
  sample: (rng, difficulty) => ({ ...sampleRel(rng, difficulty), percent: difficulty > 1 }),
  render: (params): Slide => {
    const exact = fmt(params.exact);
    const estimate = fmt(relEstimate(params));
    const value = relAnswer(params);
    const answer = [estimate, exact, exact, value];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `A value of exactly $${exact}$ is estimated as $${estimate}$. Build its ${params.percent ? 'percentage' : 'relative'} error from the tiles and work it out.`,
        ),
      ],
      template: params.percent
        ? '\\text{percentage error} = ({0} - {1}) \\div {2} \\times 100 = {3}\\%'
        : '\\text{relative error} = ({0} - {1}) \\div {2} = {3}',
      bank: fillBank(answer, [
        flipped(value),
        fmt(relEstimate(params) - params.exact),
        fmt(params.percent ? params.rel : params.rel * 100),
        fmt(params.exact * 2),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const estimate = relEstimate(params);
    const error = estimate - params.exact;
    return [
      { text: 'Estimate minus exact value first, then divide by the exact value.' },
      { tex: aligned(`&(${fmt(estimate)} - ${fmt(params.exact)}) \\div ${fmt(params.exact)}`, `&= ${fmt(error)} \\div ${fmt(params.exact)}`, `&= ${fmt(params.rel)}`) },
      ...(params.percent ? [{ tex: `${fmt(params.rel)} \\times 100 = ${fmt(params.rel * 100)}\\%` }] : []),
    ];
  },
};

interface RelSliderParams {
  exact: number;
  /** Percentage error, signed. */
  pct: number;
  /** Difficulty 2: the estimate is given and the exact value is slid to. */
  inverse: boolean;
}

function relSliderWindow({ exact, pct, inverse }: RelSliderParams) {
  const estimate = exact * (1 + pct / 100);
  const shown = inverse ? estimate : exact;
  return { estimate, shown, min: Math.floor(shown * 0.75), max: Math.ceil(shown * 1.25) };
}

/**
 * Slide to the estimate that has a stated percentage error; at difficulty 2
 * slide to the exact value behind an estimate instead. The figure graphs the
 * percentage error against the value slid, so the answer is where that line
 * meets the dashed level.
 */
const relSlider: Generator<RelSliderParams> = {
  id: 'numer-rel-slider',
  sample: (rng, difficulty) => {
    const inverse = difficulty > 1;
    for (;;) {
      const exact = inverse ? rng.int(24, 120) / 2 : rng.int(4, 12) * 5;
      const pct = (inverse ? rng.pick([2, 2.5, 4, 5, 6, 7.5, 8, 10, 12.5, 15]) : rng.int(2, 16)) * rng.sign();
      const estimate = exact * (1 + pct / 100);
      const answer = inverse ? exact : estimate;
      if (!terminates(answer * 2, 0) || !terminates(estimate, 2)) continue;
      const params = { exact, pct, inverse };
      const { min, max } = relSliderWindow(params);
      if (answer < min + 0.5 || answer > max - 0.5) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { exact, pct, inverse } = params;
    const { estimate, min, max } = relSliderWindow(params);
    const error = inverse ? (x: number) => (100 * (estimate - x)) / x : (x: number) => (100 * (x - exact)) / exact;
    return {
      kind: 'slider',
      prompt: [
        say(
          inverse
            ? `An estimate of $${fmt(estimate)}$ has a percentage error of $${fmt(pct)}\\%$. Slide the line to the exact value. The graph shows the percentage error $${fmt(estimate)}$ would have for each exact value.`
            : `The exact value is $${fmt(exact)}$. Slide the line to the estimate whose percentage error is $${fmt(pct)}\\%$. The graph shows the percentage error of each estimate.`,
        ),
      ],
      min,
      max,
      step: 0.5,
      // On the half-step lattice by construction; rounded so float noise
      // (50 x 1.11 = 55.50000000000001) never reaches the answer.
      answer: Math.round((inverse ? exact : estimate) * 2) / 2,
      readout: inverse ? '\\text{exact value} = {v}' : '\\text{estimate} = {v}',
      figure: {
        svg: plotSvg({
          xMin: min,
          xMax: max,
          yMin: -30,
          yMax: 30,
          curves: [{ f: clamped(error, 60), accent: true }],
          horizontals: [pct],
          marks: [{ x: inverse ? estimate : exact, y: 0 }],
          label: `The percentage error graphed against the ${inverse ? 'exact value' : 'estimate'}, with a dashed line at ${fmt(pct)} per cent`,
        }),
        ...markerWindow(min, max),
      },
    };
  },
  solution: (params) => {
    const { exact, pct, inverse } = params;
    const { estimate } = relSliderWindow(params);
    return inverse
      ? [
          { text: `A percentage error of $${fmt(pct)}\\%$ means the estimate is $${fmt(100 + pct)}\\%$ of the exact value.` },
          { tex: `\\text{exact} = ${fmt(estimate)} \\div ${fmt(1 + pct / 100)} = ${fmt(exact)}` },
          { text: 'Divide back rather than take the percentage off the estimate: the percentage is of the exact value.' },
        ]
      : [
          { tex: `${fmt(pct)}\\% \\text{ of } ${fmt(exact)} = ${fmt((exact * pct) / 100)}` },
          { tex: `\\text{estimate} = ${fmt(exact)} ${signed((exact * pct) / 100)} = ${fmt(estimate)}` },
        ];
  },
};

interface RelCompareParams {
  unit: string;
  /** Exact value and estimate, per option. */
  items: [number, number][];
  largest: boolean;
}

const relOf = ([exact, estimate]: [number, number]) => Math.abs(estimate - exact) / exact;

/**
 * Which of four measurements is most (or least) accurate for its size. The
 * one with the smallest error is never the answer at difficulty 2: a large
 * thing measured roughly can still be measured well.
 */
const relCompare: Generator<RelCompareParams> = {
  id: 'numer-rel-compare',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const largest = hard && rng.chance(0.5);
    for (;;) {
      const bands: [number, number][] = [[2, 9], [10, 60], [80, 400], [500, 2000]];
      const items = bands.map(([lo, hi]): [number, number] => {
        const exact = rng.int(lo, hi);
        const error = rng.pick(hi < 10 ? [0.1, 0.2, 0.3] : hi < 100 ? [0.2, 0.5, 1, 1.5] : hi < 500 ? [1, 2, 3, 5] : [5, 10, 20, 30]);
        return [exact, Number((exact + error * rng.sign()).toFixed(1))];
      });
      const rels = items.map(relOf);
      const order = [...rels].sort((a, b) => (largest ? b - a : a - b));
      if ((largest ? order[1] * 1.3 > order[0] : order[1] < order[0] * 1.3)) continue;
      const pick = rels.indexOf(order[0]);
      const sizes = items.map(([e, m]) => Math.abs(m - e));
      const plain = largest ? sizes.indexOf(Math.max(...sizes)) : sizes.indexOf(Math.min(...sizes));
      if (hard && plain === pick) continue;
      // Listed in an order fixed by the numbers, never shuffled (PITFALLS 3.10).
      const listed = [...items].sort((a, b) => hashSeed(a.join('/')) - hashSeed(b.join('/')));
      return { unit: rng.pick(['cm', 'g', 'ml', 'mm']), items: listed, largest };
    }
  },
  render: ({ unit, items, largest }): Slide => {
    const rels = items.map(relOf);
    const target = largest ? Math.max(...rels) : Math.min(...rels);
    return choiceSlide(
      [say(`Four things were measured once each. Which measurement has the ${largest ? 'largest' : 'smallest'} relative error?`)],
      items.map((item, idx) => ({ tex: `${fmt(item[0])} ${unit}, measured as ${fmt(item[1])} ${unit}`, correct: rels[idx] === target })),
      false,
    );
  },
  solution: ({ unit, items, largest }) =>
    [
      { text: 'Divide each error by the exact value it belongs to:' },
      ...items.map((item) => ({ tex: `\\frac{${fmt(Math.abs(item[1] - item[0]))}}{${fmt(item[0])}} \\approx ${roughly(relOf(item))}` })),
      { text: `The ${largest ? 'largest' : 'smallest'} relative error is the ${fmt(items[items.map(relOf).indexOf((largest ? Math.max : Math.min)(...items.map(relOf)))][0])} ${unit} measurement. The size of the error alone does not decide it: what matters is the error for the size of the thing.` },
    ] as SolutionStep[],
};

/* ================================================================
 * Level 3, lesson 3: bounds on a result
 * ================================================================ */

/** A rounded value, and how many places it was rounded to. */
interface Rounded {
  value: number;
  dp: number;
}

/** A positive value given to `dp` places, not whole where places are asked for. */
function sampleRounded(rng: Rng, dp: number, lo: number, hi: number): Rounded {
  for (;;) {
    const unit = 10 ** -dp;
    const value = Number((rng.int(Math.ceil(lo / unit), Math.floor(hi / unit)) * unit).toFixed(dp));
    if (dp > 0 && terminates(value, dp - 1)) continue;
    return { value, dp };
  }
}

const lowerOf = ({ value, dp }: Rounded) => boundsOfValue(value, dp)[0];
const upperOf = ({ value, dp }: Rounded) => boundsOfValue(value, dp)[1];

type BoundOp = 'sum' | 'diff' | 'prod';

interface BoundTreeParams {
  a: Rounded;
  b: Rounded;
  op: BoundOp;
}

const OP_TEX: Record<BoundOp, string> = { sum: 'a + b', diff: 'a - b', prod: 'ab' };

/** The result's bounds, from the ends the operation needs: both low for the least sum, low minus high for the least difference. */
function boundTreeFacts({ a, b, op }: BoundTreeParams) {
  const [aL, aU] = boundsOfValue(a.value, a.dp);
  const [bL, bU] = boundsOfValue(b.value, b.dp);
  switch (op) {
    case 'sum':
      return { aL, aU, bL, bU, lo: aL + bL, hi: aU + bU, loFrom: ['aL', 'bL'], hiFrom: ['aU', 'bU'] };
    case 'diff':
      return { aL, aU, bL, bU, lo: aL - bU, hi: aU - bL, loFrom: ['aL', 'bU'], hiFrom: ['aU', 'bL'] };
    case 'prod':
      return { aL, aU, bL, bU, lo: aL * bL, hi: aU * bU, loFrom: ['aL', 'bL'], hiFrom: ['aU', 'bU'] };
  }
}

/**
 * Each input's bounds on top, the result's lower and upper bound beneath.
 * Difficulty 2 has differences and products, and inputs rounded to different
 * places.
 */
const boundTree: Generator<BoundTreeParams> = {
  id: 'numer-bound-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const op = rng.pick<BoundOp>(hard ? ['diff', 'prod'] : ['sum', 'diff']);
      const dpA = hard ? rng.pick([1, 2]) : rng.pick([0, 1]);
      const dpB = hard ? rng.pick([1, 2]) : dpA;
      const a = sampleRounded(rng, dpA, 2, op === 'prod' ? 9 : 30);
      const b = sampleRounded(rng, dpB, 1, op === 'prod' ? 9 : 30);
      const facts = boundTreeFacts({ a, b, op });
      if (facts.lo <= 0 || a.value === b.value) continue;
      return { a, b, op };
    }
  },
  render: (params): Slide => {
    const { a, b, op } = params;
    const f = boundTreeFacts(params);
    const answer = [f.aL, f.aU, f.bL, f.bU, f.lo, f.hi].map(fmt);
    const combine = (x: number, y: number) => (op === 'sum' ? x + y : op === 'diff' ? x - y : x * y);
    const slips = [
      combine(a.value, b.value),
      combine(f.aL, f.bU),
      combine(f.aU, f.bL),
      combine(f.aL, f.bL),
      combine(f.aU, f.bU),
      a.value - 10 ** -a.dp,
      b.value + 10 ** -b.dp,
    ].map(fmt);
    const where = a.dp === b.dp ? `each ${precisionText(a.dp)}` : `$a$ ${precisionText(a.dp)} and $b$ ${precisionText(b.dp)}`;
    return {
      kind: 'tree',
      prompt: [
        say(
          `$a = ${fmt(a.value)}$ and $b = ${fmt(b.value)}$, ${where}. Top row: the lower and upper bounds of $a$, then of $b$. Underneath: the lower bound of $${OP_TEX[op]}$, then its upper bound.`,
        ),
      ],
      expression: `\\text{bounds of } ${OP_TEX[op]}`,
      nodes: [
        { id: 'aL', from: [] },
        { id: 'aU', from: [] },
        { id: 'bL', from: [] },
        { id: 'bU', from: [] },
        { id: 'lo', from: f.loFrom },
        { id: 'hi', from: f.hiFrom },
      ],
      bank: numberBank(answer, slips, around([f.lo, f.hi], 10 ** -Math.max(a.dp, b.dp))),
      answer,
    };
  },
  solution: (params) => {
    const { a, b, op } = params;
    const f = boundTreeFacts(params);
    const how: Record<BoundOp, string> = {
      sum: 'The least sum takes both lower bounds; the greatest takes both upper bounds.',
      diff: 'The least difference takes the smallest $a$ and the largest $b$; the greatest difference the other way round.',
      prod: 'Both values are positive, so the least product takes both lower bounds and the greatest both upper bounds.',
    };
    const sym = op === 'sum' ? '+' : op === 'diff' ? '-' : '\\times';
    const [loA, loB] = f.loFrom.map((id) => fmt(f[id as 'aL' | 'aU' | 'bL' | 'bU']));
    const [hiA, hiB] = f.hiFrom.map((id) => fmt(f[id as 'aL' | 'aU' | 'bL' | 'bU']));
    return [
      { text: `Half a unit either way: $${fmt(f.aL)} \\le a < ${fmt(f.aU)}$ and $${fmt(f.bL)} \\le b < ${fmt(f.bU)}$.` },
      { text: how[op] },
      { tex: aligned(`\\text{lower} &= ${loA} ${sym} ${loB}`, `&= ${fmt(f.lo)}`) },
      { tex: aligned(`\\text{upper} &= ${hiA} ${sym} ${hiB}`, `&= ${fmt(f.hi)}`) },
      { text: `So the value calculated from $${fmt(a.value)}$ and $${fmt(b.value)}$ could be anywhere in that range.` },
    ];
  },
};

type ValueOp = BoundOp | 'prodDiff' | 'diffProd';

interface BoundValueParams {
  op: ValueOp;
  xs: Rounded[];
  upper: boolean;
  /** A rectangle, for a product at difficulty 1. */
  story: boolean;
}

const VALUE_TEX: Record<ValueOp, string> = { sum: 'x + y', diff: 'x - y', prod: 'xy', prodDiff: 'xy - z', diffProd: '(x - y)z' };

/**
 * The bound asked for, and the ends it takes, one per input: 'L' or 'U'.
 * Worked from the shape of the calculation: a quantity subtracted takes the
 * opposite end to the result.
 */
function boundValueFacts({ op, xs, upper }: BoundValueParams): { value: number; ends: ('L' | 'U')[] } {
  const same = upper ? 'U' : 'L';
  const other = upper ? 'L' : 'U';
  const ends: ('L' | 'U')[] = {
    sum: [same, same],
    diff: [same, other],
    prod: [same, same],
    prodDiff: [same, same, other],
    diffProd: [same, other, same],
  }[op] as ('L' | 'U')[];
  const v = xs.map((x, i) => (ends[i] === 'L' ? lowerOf(x) : upperOf(x)));
  const value = {
    sum: () => v[0] + v[1],
    diff: () => v[0] - v[1],
    prod: () => v[0] * v[1],
    prodDiff: () => v[0] * v[1] - v[2],
    diffProd: () => (v[0] - v[1]) * v[2],
  }[op]();
  return { value, ends };
}

/**
 * An upper or lower bound of a calculation, typed. Difficulty 2 mixes a
 * product with a difference across three values, some to two places.
 */
const boundValueAsk: Generator<BoundValueParams> = {
  id: 'numer-bound-value',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const op = rng.pick<ValueOp>(hard ? ['diff', 'prodDiff', 'diffProd', 'prodDiff'] : ['sum', 'diff', 'prod']);
      const count = op === 'prodDiff' || op === 'diffProd' ? 3 : 2;
      const shared = rng.pick([0, 1]);
      const xs = Array.from({ length: count }, () => sampleRounded(rng, hard ? rng.pick([1, 2]) : shared, 1, 20));
      const upper = rng.chance(0.5);
      const params = { op, xs, upper, story: !hard && op === 'prod' };
      const low = boundValueFacts({ ...params, upper: false }).value;
      const high = boundValueFacts({ ...params, upper: true }).value;
      if (low <= 0.5 || high > 200 || !terminates(high, 6) || !terminates(low, 6)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { op, xs, upper, story } = params;
    const names = ['x', 'y', 'z'];
    const given = xs.map((x, i) => `$${names[i]} = ${fmt(x.value)}$`).join(xs.length === 3 ? ', ' : ' and ');
    const same = xs.every((x) => x.dp === xs[0].dp);
    const where = same ? `each ${precisionText(xs[0].dp)}` : xs.map((x, i) => `$${names[i]}$ ${precisionText(x.dp)}`).join(', ');
    const word = upper ? 'upper' : 'lower';
    const text = story
      ? `A rectangle measures $${fmt(xs[0].value)}$ cm by $${fmt(xs[1].value)}$ cm, each ${precisionText(xs[0].dp)}. Find the ${word} bound of its area, in cm$^2$.`
      : `${given}, ${where}. Find the ${word} bound of $${VALUE_TEX[op]}$.`;
    return {
      kind: 'expression',
      prompt: [say(text)],
      lead: `\\text{${word} bound} =`,
      keypad: [],
      answer: fmt(boundValueFacts(params).value),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { op, xs, upper } = params;
    const { value, ends } = boundValueFacts(params);
    const names = ['x', 'y', 'z'];
    const used = xs.map((x, i) => fmt(ends[i] === 'L' ? lowerOf(x) : upperOf(x)));
    const shape: Record<ValueOp, string> = {
      sum: `${used[0]} + ${used[1]}`,
      diff: `${used[0]} - ${used[1]}`,
      prod: `${used[0]} \\times ${used[1]}`,
      prodDiff: `${used[0]} \\times ${used[1]} - ${used[2]}`,
      diffProd: `(${used[0]} - ${used[1]}) \\times ${used[2]}`,
    };
    return [
      {
        text: `To make it as ${upper ? 'large' : 'small'} as possible: ${xs
          .map((_, i) => `$${names[i]}$ at its ${ends[i] === 'L' ? 'lower' : 'upper'} bound, $${used[i]}$`)
          .join(', ')}. Whatever is taken away goes to the opposite end.`,
      },
      { tex: aligned(`&${shape[op]}`, `&= ${fmt(value)}`) },
    ];
  },
};

type EndsShape = 'quot' | 'quotDiff' | 'diffQuot' | 'subQuot';

interface BoundEndsParams {
  shape: EndsShape;
  xs: Rounded[];
  lower: boolean;
  /** Difficulty 2: which three of the other end choices are offered, as indexes. */
  others: number[];
}

const ENDS_TEX: Record<EndsShape, string> = {
  quot: '\\frac{a}{b}',
  quotDiff: '\\frac{a}{b - c}',
  diffQuot: '\\frac{a - b}{c}',
  subQuot: 'a - \\frac{b}{c}',
};

/** The ends that give the bound asked for, by the shape of the calculation. */
function rightEnds({ shape, lower }: Pick<BoundEndsParams, 'shape' | 'lower'>): ('L' | 'U')[] {
  const lo = lower ? 'L' : 'U';
  const hi = lower ? 'U' : 'L';
  // The least a/b: the least top over the greatest bottom. Subtracting
  // inside a denominator flips it twice.
  switch (shape) {
    case 'quot':
      return [lo, hi];
    case 'quotDiff':
      return [lo, hi, lo];
    case 'diffQuot':
      return [lo, hi, hi];
    case 'subQuot':
      return [lo, hi, lo];
  }
}

/** Every way of choosing an end per input, as 'L'/'U' strings, in a fixed order. */
function allEnds(count: number): ('L' | 'U')[][] {
  return Array.from({ length: 2 ** count }, (_, mask) =>
    Array.from({ length: count }, (_, i) => ((mask >> (count - 1 - i)) & 1 ? 'U' : 'L') as 'L' | 'U'),
  );
}

function endsTex(shape: EndsShape, xs: Rounded[], ends: ('L' | 'U')[]): string {
  const v = xs.map((x, i) => fmt(ends[i] === 'L' ? lowerOf(x) : upperOf(x)));
  switch (shape) {
    case 'quot':
      return `\\frac{${v[0]}}{${v[1]}}`;
    case 'quotDiff':
      return `\\frac{${v[0]}}{${v[1]} - ${v[2]}}`;
    case 'diffQuot':
      return `\\frac{${v[0]} - ${v[1]}}{${v[2]}}`;
    case 'subQuot':
      return `${v[0]} - \\frac{${v[1]}}{${v[2]}}`;
  }
}

function endsValue(shape: EndsShape, xs: Rounded[], ends: ('L' | 'U')[]): number {
  const v = xs.map((x, i) => (ends[i] === 'L' ? lowerOf(x) : upperOf(x)));
  switch (shape) {
    case 'quot':
      return v[0] / v[1];
    case 'quotDiff':
      return v[0] / (v[1] - v[2]);
    case 'diffQuot':
      return (v[0] - v[1]) / v[2];
    case 'subQuot':
      return v[0] - v[1] / v[2];
  }
}

function endsOffered({ shape, xs, lower, others }: BoundEndsParams) {
  const right = rightEnds({ shape, lower });
  const wrong = allEnds(xs.length).filter((ends) => ends.join('') !== right.join(''));
  const picked = xs.length === 2 ? wrong : others.map((i) => wrong[i]);
  return [right, ...picked];
}

/**
 * Which calculation gives the bound: the ends of each input written in.
 * Difficulty 1 is a quotient, all four ways; difficulty 2 has three inputs,
 * with a difference inside the fraction or beside it.
 */
const boundEnds: Generator<BoundEndsParams> = {
  id: 'numer-bound-ends',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const shape = hard ? rng.pick<EndsShape>(['quotDiff', 'diffQuot', 'subQuot']) : 'quot';
      const count = shape === 'quot' ? 2 : 3;
      const dp = hard ? rng.pick([1, 2]) : rng.pick([0, 1]);
      const xs = Array.from({ length: count }, () => sampleRounded(rng, dp, 1, 20));
      const params = { shape, xs, lower: rng.chance(0.5), others: rng.sample([0, 1, 2, 3, 4, 5, 6], 3) };
      // Every denominator and difference stays positive at every end.
      const values = allEnds(count).map((ends) => endsValue(shape, xs, ends));
      if (values.some((v) => !(v > 0) || !Number.isFinite(v))) continue;
      if (shape === 'quotDiff' && lowerOf(xs[1]) - upperOf(xs[2]) < 0.5) continue;
      const offered = endsOffered(params).map((ends) => endsValue(shape, xs, ends));
      if (offered.slice(1).some((v) => Math.abs(v - offered[0]) < 1e-9)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { shape, xs, lower } = params;
    const names = ['a', 'b', 'c'];
    const given = xs.map((x, i) => `$${names[i]} = ${fmt(x.value)}$`).join(', ');
    return choiceSlide(
      [say(`${given}, each ${precisionText(xs[0].dp)}. Which calculation gives the ${lower ? 'lower' : 'upper'} bound of $${ENDS_TEX[shape]}$?`)],
      endsOffered(params).map((ends, i) => ({ tex: endsTex(shape, xs, ends), correct: i === 0 })),
    );
  },
  solution: (params) => {
    const { shape, xs, lower } = params;
    const right = rightEnds(params);
    const names = ['a', 'b', 'c'];
    const reason: Record<EndsShape, string> = {
      quot: `A fraction is ${lower ? 'least' : 'greatest'} with the ${lower ? 'smallest' : 'largest'} top and the ${lower ? 'largest' : 'smallest'} bottom.`,
      quotDiff: `Make the bottom, $b - c$, as ${lower ? 'large' : 'small'} as possible: $b$ ${lower ? 'up' : 'down'} and $c$ ${lower ? 'down' : 'up'}.`,
      diffQuot: `Make the top, $a - b$, as ${lower ? 'small' : 'large'} as possible, and divide by the ${lower ? 'largest' : 'smallest'} $c$.`,
      subQuot: `Take away as ${lower ? 'much' : 'little'} as possible: $\\frac{b}{c}$ ${lower ? 'largest' : 'smallest'}, with $b$ ${lower ? 'up' : 'down'} and $c$ ${lower ? 'down' : 'up'}.`,
    };
    return [
      { text: reason[shape] },
      { text: right.map((end, i) => `$${names[i]}$ at its ${end === 'L' ? 'lower' : 'upper'} bound`).join(', ') + ':' },
      { tex: aligned(`&${endsTex(shape, xs, right)}`, `&= ${endsValue(shape, xs, right).toFixed(4)}\\ldots`) },
    ];
  },
};

type AccuracyOutcome = 'dp' | 'whole' | 'neither';

interface BoundAccuracyParams {
  op: 'sum' | 'prod';
  x: Rounded;
  y: Rounded;
}

function accuracyFacts({ op, x, y }: BoundAccuracyParams) {
  const [xL, xU] = boundsOfValue(x.value, x.dp);
  const [yL, yU] = boundsOfValue(y.value, y.dp);
  const lo = op === 'sum' ? xL + yL : xL * yL;
  const hi = op === 'sum' ? xU + yU : xU * yU;
  const to1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
  const outcome: AccuracyOutcome = to1(lo) === to1(hi) ? 'dp' : Math.round(lo) === Math.round(hi) ? 'whole' : 'neither';
  return { xL, xU, yL, yU, lo, hi, outcome };
}

/** Clear of every rounding boundary at one place and at a whole number, so the rounding is not a coin toss. */
function clearOfBoundaries(v: number): boolean {
  const off = (scaled: number) => Math.abs(scaled - Math.floor(scaled) - 0.5);
  return off(v * 10) > 0.05 && off(v) > 0.05;
}

/**
 * The lower bound of a result, then how accurately the result can be quoted:
 * to one place if both bounds round the same there, else to the nearest whole
 * number if they agree on that, else not even that.
 */
const boundAccuracyFlow: Generator<BoundAccuracyParams> = {
  id: 'numer-bound-accuracy-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const target = rng.pick<AccuracyOutcome>(['dp', 'whole', 'neither']);
    for (;;) {
      const op = rng.pick<BoundAccuracyParams['op']>(hard ? ['prod', 'prod', 'sum'] : ['sum', 'prod']);
      const dp = target === 'dp' ? 2 : rng.pick([1, 2]);
      const top = op === 'prod' ? (hard ? 15 : 9) : 40;
      const x = sampleRounded(rng, dp, 1, top);
      const y = sampleRounded(rng, dp, 1, top);
      const f = accuracyFacts({ op, x, y });
      if (f.outcome !== target || !clearOfBoundaries(f.lo) || !clearOfBoundaries(f.hi)) continue;
      if (!terminates(f.lo, 6) || !terminates(f.hi, 6)) continue;
      const params = { op, x, y };
      if (new Set(lowerLabels(params)).size !== 3) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { op, x, y } = params;
    const f = accuracyFacts(params);
    const labels = lowerLabels(params);
    return {
      kind: 'flow',
      prompt: [
        say(`$x = ${fmt(x.value)}$ and $y = ${fmt(y.value)}$, each ${precisionText(x.dp)}. How accurately can $A$ be quoted?`),
      ],
      subject: `A = ${op === 'sum' ? 'x + y' : 'xy'}`,
      steps: [
        {
          id: 'lo',
          ask: 'Which is the lower bound of $A$?',
          branches: turned(labels, labels.join()).map((label) => ({ label: `$${label}$`, to: 'agree' })),
        },
        {
          id: 'agree',
          ask: `The upper bound is $${fmt(f.hi)}$. Do the two bounds round to the same value at 1 decimal place?`,
          branches: [
            { label: 'Yes', outcome: 'Then quote $A$ to 1 decimal place: the value both bounds round to.' },
            { label: 'No', to: 'whole' },
          ],
        },
        {
          id: 'whole',
          ask: 'Do they round to the same whole number?',
          branches: [
            { label: 'Yes', outcome: 'Then quote $A$ to the nearest whole number, and no more accurately.' },
            { label: 'No', outcome: 'Then $A$ is not even known to the nearest whole number: quote the bounds instead.' },
          ],
        },
      ],
      answer: [`$${labels[0]}$`, ...(f.outcome === 'dp' ? ['Yes'] : f.outcome === 'whole' ? ['No', 'Yes'] : ['No', 'No'])],
    };
  },
  solution: (params) => {
    const { op } = params;
    const f = accuracyFacts(params);
    const sym = op === 'sum' ? '+' : '\\times';
    const to1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
    return [
      { tex: aligned(`\\text{lower} &= ${fmt(f.xL)} ${sym} ${fmt(f.yL)}`, `&= ${fmt(f.lo)}`) },
      { tex: aligned(`\\text{upper} &= ${fmt(f.xU)} ${sym} ${fmt(f.yU)}`, `&= ${fmt(f.hi)}`) },
      { text: `To 1 decimal place they are $${to1(f.lo)}$ and $${to1(f.hi)}$; to the nearest whole number, $${Math.round(f.lo)}$ and $${Math.round(f.hi)}$.` },
      {
        text:
          f.outcome === 'dp'
            ? `They agree at 1 decimal place, so $A = ${to1(f.lo)}$ to 1 decimal place.`
            : f.outcome === 'whole'
              ? `They only agree as whole numbers, so $A = ${Math.round(f.lo)}$ to the nearest whole number.`
              : 'They do not even agree as whole numbers, so the bounds are the honest answer.',
      },
    ];
  },
};

/** The lower bound first, then two slips: the value itself, and ends a whole unit out (or mixed). */
function lowerLabels(params: BoundAccuracyParams): string[] {
  const { op, x, y } = params;
  const f = accuracyFacts(params);
  const combine = (a: number, b: number) => (op === 'sum' ? a + b : a * b);
  const unit = 10 ** -x.dp;
  return [fmt(f.lo), fmt(combine(x.value, y.value)), op === 'sum' ? fmt(combine(x.value - unit, y.value - unit)) : fmt(combine(f.xL, f.yU))];
}

/* ================================================================
 * Level 3, lesson 4: an error carried through g
 * ================================================================ */

interface CarryTreeParams {
  family: FixedFamily;
  a: number;
  b: number;
  /** x_n, rounded to `dp` places. */
  c: number;
  dp: number;
}

/** g at both bounds of x_n, to four places, and how far apart they land. */
function carryFacts(params: CarryTreeParams) {
  const scheme = fixedScheme({ ...params, x0: params.c });
  const [lo, hi] = boundsOfValue(params.c, params.dp);
  const gLo = written(scheme.g(lo), 4);
  const gHi = written(scheme.g(hi), 4);
  if (gLo === undefined || gHi === undefined) return undefined;
  const width = Math.abs(Number(gHi) - Number(gLo)).toFixed(4);
  return { scheme, lo, hi, gLo, gHi, width };
}

/**
 * x_n known only to lie between its bounds: g at each bound brackets x_{n+1},
 * and the bracket comes out narrower than it went in. Difficulty 2 adds
 * g(x) = a/(x + b), which is decreasing, so the upper bound of x_n gives the
 * lower bound of x_{n+1}.
 */
const carryTree: Generator<CarryTreeParams> = {
  id: 'numer-carry-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const family = rng.pick<FixedFamily>(hard ? ['recip', 'recip', 'cbrt'] : ['sqrt', 'cbrt']);
      const a = family === 'recip' ? rng.int(2, 12) : rng.int(1, 9);
      const b = family === 'recip' ? rng.int(1, 5) : rng.int(1, 12);
      const root = limitOf(fixedScheme({ family, a, b, x0: 1, dp: 2 }).g, 1);
      if (root === undefined || root < 0.5) continue;
      const dp = hard ? rng.pick([1, 2]) : 2;
      const c = Number(root.toFixed(dp));
      if (terminates(c, dp - 1)) continue;
      const params = { family, a, b, c, dp };
      const facts = carryFacts(params);
      if (!facts || facts.width === '0.0000') continue;
      return params;
    }
  },
  render: (params): Slide => {
    const f = carryFacts(params)!;
    const { c, dp } = params;
    const g = f.scheme.g;
    const answer = [fmt(f.lo), fmt(f.hi), f.gLo, f.gHi, f.width];
    const unit = 10 ** -dp;
    const slips = [
      written(g(c), 4),
      written(g(c - unit), 4),
      written(g(c + unit), 4),
      (2 * halfUnit(dp)).toFixed(4),
      (Number(f.gLo) + Number(f.gHi)).toFixed(4),
    ];
    return {
      kind: 'tree',
      prompt: [
        say(`$x_n = ${fmt(c)}$ ${precisionText(dp)}, and the next value comes from the scheme below.`),
        show(f.scheme.schemeTex),
        say('Top row: the lower and upper bounds of $x_n$. Middle: the scheme at each, to 4 decimal places. Bottom: how far apart those two are.'),
      ],
      expression: 'x_{n+1} \\text{ from the bounds of } x_n',
      nodes: [
        { id: 'lo', from: [] },
        { id: 'hi', from: [] },
        { id: 'gLo', from: ['lo'] },
        { id: 'gHi', from: ['hi'] },
        { id: 'width', from: ['gLo', 'gHi'] },
      ],
      bank: numberBank(
        answer,
        slips,
        [1, 2, 3].flatMap((k) => [f.gLo, f.gHi].flatMap((token) => [(Number(token) + k * 1e-4).toFixed(4), (Number(token) - k * 1e-4).toFixed(4)])),
      ),
      answer,
    };
  },
  solution: (params) => {
    const f = carryFacts(params)!;
    const decreasing = Number(f.gHi) < Number(f.gLo);
    return [
      { text: `$${fmt(params.c)}$ ${precisionText(params.dp)} means $${fmt(f.lo)} \\le x_n < ${fmt(f.hi)}$, a gap of $${fmt(2 * halfUnit(params.dp))}$.` },
      { tex: aligned(`g(${fmt(f.lo)}) &= ${f.gLo}`, `g(${fmt(f.hi)}) &= ${f.gHi}`) },
      {
        text: decreasing
          ? `$g$ is decreasing, so the upper bound of $x_n$ gives the lower bound of $x_{n+1}$: $${f.gHi} \\le x_{n+1} \\le ${f.gLo}$.`
          : `$g$ is increasing, so $${f.gLo} \\le x_{n+1} \\le ${f.gHi}$.`,
      },
      { text: `They are $${f.width}$ apart, narrower than the gap in $x_n$: near the root $|g'| < 1$ squeezes the uncertainty.` },
    ];
  },
};

type ExactFamily = 'square' | 'recip' | 'fall';

interface ExactSchemeParams {
  family: ExactFamily;
  /** The root the iteration is near: a whole number. */
  alpha: number;
  /** square: the other root; recip, fall: b. */
  m: number;
}

/**
 * Schemes with a whole-number root and a gradient there that is an exact
 * fraction: (x^2 + pq)/(p + q) with roots p and q, c/(x + b), and
 * (c - x^2)/b.
 */
function exactScheme({ family, alpha, m }: ExactSchemeParams) {
  switch (family) {
    case 'square': {
      const s = alpha + m;
      const pq = alpha * m;
      return {
        g: (x: number) => (x * x + pq) / s,
        tex: `\\frac{x^{2} + ${pq}}{${s}}`,
        dTex: `\\frac{2x}{${s}}`,
        factor: (2 * alpha) / s,
      };
    }
    case 'recip': {
      const c = alpha * (alpha + m);
      return {
        g: (x: number) => c / (x + m),
        tex: `\\frac{${c}}{x + ${m}}`,
        dTex: `-\\frac{${c}}{(x + ${m})^{2}}`,
        factor: -alpha / (alpha + m),
      };
    }
    case 'fall': {
      const c = alpha * alpha + alpha * m;
      return {
        g: (x: number) => (c - x * x) / m,
        tex: `\\frac{${c} - x^{2}}{${m}}`,
        dTex: `-\\frac{2x}{${m}}`,
        factor: (-2 * alpha) / m,
      };
    }
  }
}

/** A scheme whose gradient at the root is a short decimal, shrinking or growing errors as asked. */
function sampleExactScheme(rng: Rng, families: ExactFamily[], grow: boolean | undefined): ExactSchemeParams {
  for (;;) {
    const family = rng.pick(families);
    const alpha = rng.int(1, 6);
    const m = family === 'square' ? rng.int(1, 12) : rng.int(1, 16);
    if (family === 'square' && m === alpha) continue;
    // For (x^2 + pq)/(p + q) the smaller root attracts and the larger repels.
    if (family === 'square' && grow !== undefined && grow !== alpha > m) continue;
    const params = { family, alpha, m };
    const { factor } = exactScheme(params);
    const size = Math.abs(factor);
    if (!terminates(factor, 3) || size < 0.1 || (size > 0.9 && size < 1.2) || size > 3) continue;
    if (grow !== undefined && grow !== size > 1) continue;
    return params;
  }
}

const DELTAS = [0.01, 0.02, 0.03, 0.04, 0.05, 0.1, 0.2];

interface CarryErrorParams extends ExactSchemeParams {
  delta: number;
  given: boolean;
}

/**
 * The error one step on: about g'(α) times the error before. Difficulty 1
 * gives g'(x); difficulty 2 leaves the differentiating to the learner and has
 * decreasing schemes, where the error changes sign.
 */
const carryError: Generator<CarryErrorParams> = {
  id: 'numer-carry-error',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const scheme = sampleExactScheme(rng, hard ? ['square', 'recip', 'recip'] : ['square'], false);
      const delta = rng.pick(DELTAS) * (hard ? rng.sign() : 1);
      if (!terminates(exactScheme(scheme).factor * delta, 6)) continue;
      return { ...scheme, delta, given: !hard };
    }
  },
  render: (params): Slide => {
    const { alpha, delta, given } = params;
    const s = exactScheme(params);
    return {
      kind: 'expression',
      prompt: [
        say(
          `$x_{n+1} = g(x_n)$ is converging to $\\alpha = ${alpha}$, with $g(x) = ${s.tex}$${given ? ` and $g'(x) = ${s.dTex}$` : ''}. It has reached $x_n = ${fmt(alpha + delta)}$, an error of $${fmt(delta)}$. About what is the error in $x_{n+1}$?`,
        ),
      ],
      lead: '\\text{error in } x_{n+1} \\approx',
      keypad: [],
      answer: fmt(s.factor * delta),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { alpha, delta } = params;
    const s = exactScheme(params);
    return [
      { text: "Near the root, one step multiplies the error by about $g'(\\alpha)$ (Numerical Methods Basics, When Iteration Fails)." },
      { tex: aligned(`g'(x) &= ${s.dTex}`, `g'(${alpha}) &= ${fmt(s.factor)}`) },
      { tex: `${fmt(s.factor)} \\times ${paren(delta)} = ${fmt(s.factor * delta)}` },
      ...(s.factor < 0 ? [{ text: 'The gradient is negative, so the error changes sign: $x_{n+1}$ lands on the other side of $\\alpha$.' }] : []),
    ];
  },
};

interface CarrySliderParams {
  family: 'square' | 'recip';
  a: number;
  b: number;
  /** x_n to the nearest whole number. */
  c: number;
  upper: boolean;
}

const carrySliderG = ({ family, a, b }: CarrySliderParams) =>
  family === 'square' ? (x: number) => (x * x + b) / a : (x: number) => a / (x + b);

function carrySliderTex({ family, a, b }: CarrySliderParams): string {
  return family === 'square' ? `\\frac{x^{2} + ${b}}{${a}}` : `\\frac{${a}}{x + ${b}}`;
}

function carrySliderFacts(params: CarrySliderParams) {
  const g = carrySliderG(params);
  const lo = params.c - 0.5;
  const hi = params.c + 0.5;
  const values = [g(lo), g(hi)];
  const answer = params.upper ? Math.max(...values) : Math.min(...values);
  return { g, lo, hi, gLo: values[0], gHi: values[1], answer, top: Math.ceil(Math.max(...values) + 1) };
}

/**
 * Slide to the upper (or lower) bound of x_{n+1}, with the curve drawn and the
 * bounds of x_n marked on it. For the decreasing a/(x + b) at difficulty 2 the
 * upper bound comes from the lower end.
 */
const carrySlider: Generator<CarrySliderParams> = {
  id: 'numer-carry-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const family = hard ? rng.pick<CarrySliderParams['family']>(['recip', 'recip', 'square']) : 'square';
      const a = family === 'square' ? rng.pick([3, 5, 5, 7, 9, 10]) : rng.int(2, 15);
      const b = family === 'square' ? rng.int(1, 12) : rng.int(1, 5);
      const c = rng.int(1, 4);
      const params = { family, a, b, c, upper: hard ? rng.chance(0.5) : true };
      const f = carrySliderFacts(params);
      if (!terminates(f.answer * 20, 0) || Math.abs(f.gHi - f.gLo) < 0.3) continue;
      if (Math.min(f.gLo, f.gHi) < 0.3 || Math.max(f.gLo, f.gHi) > 8) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const f = carrySliderFacts(params);
    const word = params.upper ? 'upper' : 'lower';
    return {
      kind: 'slider',
      prompt: [
        say(
          `$x_n = ${params.c}$ to the nearest whole number, and $x_{n+1} = g(x_n)$ with $g(x) = ${carrySliderTex(params)}$, drawn with the bounds of $x_n$ dashed. Slide the line to the ${word} bound of $x_{n+1}$.`,
        ),
      ],
      min: 0,
      max: f.top,
      step: 0.05,
      answer: f.answer,
      readout: `\\text{${word} bound} = {v}`,
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: params.c + 2,
          yMin: 0,
          yMax: f.top,
          curves: [{ f: clamped(f.g, 3 * f.top) }],
          verticals: [{ x: f.lo }, { x: f.hi }],
          label: `The curve y = g(x) with dashed lines at x = ${fmt(f.lo)} and x = ${fmt(f.hi)}`,
        }),
        ...markerWindow(0, f.top, 'y'),
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const f = carrySliderFacts(params);
    const decreasing = f.gHi < f.gLo;
    return [
      { text: `$x_n$ lies from $${fmt(f.lo)}$ to $${fmt(f.hi)}$.` },
      { tex: aligned(`g(${fmt(f.lo)}) &= ${fmt(f.gLo)}`, `g(${fmt(f.hi)}) &= ${fmt(f.gHi)}`) },
      {
        text: `$g$ is ${decreasing ? 'decreasing' : 'increasing'}, so the ${params.upper ? 'upper' : 'lower'} bound of $x_{n+1}$ is $${fmt(f.answer)}$, from the ${
          (params.upper !== decreasing) ? 'upper' : 'lower'
        } bound of $x_n$.`,
      },
    ];
  },
};

interface ShrinkFlowParams extends ExactSchemeParams {
  delta: number;
  given: boolean;
}

/** The error one step on, then the slips: the sign lost, and dividing by g'(α) rather than multiplying. */
function shrinkLabels({ delta, ...scheme }: ShrinkFlowParams): string[] {
  const { factor } = exactScheme(scheme);
  const right = fmt(factor * delta);
  const divided = terminates(delta / factor, 6) ? fmt(delta / factor) : fmt(factor + delta);
  const out = [right, flipped(right), divided];
  return new Set(out).size === 3 ? out : [right, flipped(right), fmt(2 * factor * delta)];
}

/**
 * The error one step on, then whether it is smaller than before: whether this
 * step closed in on the root or moved away from it.
 */
const shrinkFlow: Generator<ShrinkFlowParams> = {
  id: 'numer-shrink-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const grow = rng.chance(0.5);
    for (;;) {
      const scheme = sampleExactScheme(rng, hard ? ['square', 'fall', 'recip'] : ['square'], grow);
      const delta = rng.pick(DELTAS) * rng.sign();
      if (!terminates(exactScheme(scheme).factor * delta, 6)) continue;
      return { ...scheme, delta, given: !hard };
    }
  },
  render: (params): Slide => {
    const { alpha, delta, given } = params;
    const s = exactScheme(params);
    const labels = shrinkLabels(params);
    return {
      kind: 'flow',
      prompt: [
        say(
          `$x_{n+1} = g(x_n)$ has a root at $\\alpha = ${alpha}$${given ? `, and $g'(x) = ${s.dTex}$` : ''}. Does the next step close in on it?`,
        ),
      ],
      subject: `g(x) = ${s.tex}`,
      steps: [
        {
          id: 'err',
          ask: `$x_n = ${fmt(alpha + delta)}$ is out by $${fmt(delta)}$. About what is the error in $x_{n+1}$?`,
          branches: turned(labels, labels.join()).map((label) => ({ label: `$${label}$`, to: 'size' })),
        },
        {
          id: 'size',
          ask: `Is that smaller in size than $${fmt(Math.abs(delta))}$?`,
          branches: [
            { label: 'Yes', outcome: 'The error shrinks: this step closed in on $\\alpha$.' },
            { label: 'No', outcome: 'The error grows: this step moved away from $\\alpha$.' },
          ],
        },
      ],
      answer: [`$${labels[0]}$`, Math.abs(s.factor) < 1 ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const { alpha, delta } = params;
    const s = exactScheme(params);
    return [
      { tex: aligned(`g'(x) &= ${s.dTex}`, `g'(${alpha}) &= ${fmt(s.factor)}`) },
      { text: 'The error in $x_{n+1}$ is about', tex: `${fmt(s.factor)} \\times ${paren(delta)} = ${fmt(s.factor * delta)}` },
      {
        text:
          Math.abs(s.factor) < 1
            ? `$|g'(\\alpha)| < 1$, so the error shrinks each step.`
            : `$|g'(\\alpha)| > 1$, so the error grows each step, however close $x_n$ starts.`,
      },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 5: the error after k steps
 * ================================================================ */

interface KParams {
  /** |g'(α)|: each step multiplies the error by about this. */
  r: number;
  /** The most x_0 can be out by. */
  delta: number;
  /** The error to get below. */
  eps: number;
}

const K_RATES = [0.1, 0.2, 0.25, 0.4, 0.5];
const K_RATES_HARD = [0.3, 0.35, 0.45, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8];
const K_DELTAS = [0.1, 0.2, 0.5, 1, 2];
const K_DELTAS_HARD = [0.2, 0.25, 0.5, 1, 2];
const K_EPS = [0.01, 0.005, 0.001, 0.0005, 0.0001];
/** Half a unit in the 2nd, 3rd or 4th place: what "correct to n places" asks. */
const K_EPS_PLACES = [0.005, 0.0005, 0.00005];

/** The quotient of logarithms k has to exceed. */
const kQuotient = ({ r, delta, eps }: KParams) => Math.log(eps / delta) / Math.log(r);

/**
 * Whether the count is safe to ask: k well clear of a whole number, so that
 * r^k δ is not within a whisker of ε, and ε / δ a short decimal.
 */
function fairK(params: KParams): boolean {
  const q = kQuotient(params);
  const part = q - Math.floor(q);
  return q > 1 && q < 60 && part > 0.1 && part < 0.9 && terminates(params.eps / params.delta, 6);
}

/** The first k with r^k δ < ε. */
const kOf = (params: KParams) => Math.ceil(kQuotient(params));

function sampleK(rng: Rng, difficulty: number): KParams {
  const hard = difficulty > 1;
  for (;;) {
    const params = {
      r: rng.pick(hard ? K_RATES_HARD : K_RATES),
      delta: rng.pick(hard ? K_DELTAS_HARD : K_DELTAS),
      eps: rng.pick(hard ? K_EPS_PLACES : K_EPS),
    };
    if (fairK(params)) return params;
  }
}

/** ε in words: plain at difficulty 1, as places of accuracy at difficulty 2. */
function epsText(eps: number): string {
  const places = K_EPS_PLACES.indexOf(eps);
  return places >= 0 ? `below $${fmt(eps)}$, enough for ${places + 2} decimal places` : `below $${fmt(eps)}$`;
}

interface KCountParams extends KParams {
  /** Difficulty 2: r is |g'(α)| for this scheme, to be worked out. */
  scheme?: ExactSchemeParams;
}

/**
 * How many steps until the error is certainly small enough: the first k with
 * r^k δ < ε. At difficulty 2, r has to be found as |g'(α)| first.
 */
const kCount: Generator<KCountParams> = {
  id: 'numer-k-count',
  sample: (rng, difficulty) => {
    if (difficulty === 1) return sampleK(rng, 1);
    for (;;) {
      const scheme = sampleExactScheme(rng, ['square', 'recip'], false);
      const r = Math.abs(exactScheme(scheme).factor);
      const params = { r, delta: rng.pick(K_DELTAS_HARD), eps: rng.pick(K_EPS_PLACES), scheme };
      if (r <= 0.85 && fairK(params)) return params;
    }
  },
  render: (params): Slide => {
    const { r, delta, eps, scheme } = params;
    const rate = scheme
      ? `$x_{n+1} = g(x_n)$ with $g(x) = ${exactScheme(scheme).tex}$ is converging to $\\alpha = ${scheme.alpha}$, so each step multiplies the error by about $|g'(\\alpha)|$.`
      : `Near the root, each step of an iteration multiplies the error by about $${fmt(r)}$.`;
    return {
      kind: 'expression',
      prompt: [say(`${rate} $x_0$ is out by at most $${fmt(delta)}$. After how many steps is the error first certain to be ${epsText(eps)}?`)],
      lead: 'k =',
      keypad: [],
      answer: String(kOf(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { r, delta, eps, scheme } = params;
    const k = kOf(params);
    const steps: SolutionStep[] = [];
    if (scheme) {
      const s = exactScheme(scheme);
      steps.push({ tex: aligned(`g'(x) &= ${s.dTex}`, `|g'(${scheme.alpha})| &= ${fmt(r)}`) });
    }
    steps.push(
      { text: `After $k$ steps the error is at most $${fmt(r)}^{k} \\times ${fmt(delta)}$, which must be less than $${fmt(eps)}$:` },
      { tex: `k > \\frac{\\ln ${fmt(eps / delta)}}{\\ln ${fmt(r)}} = ${kQuotient(params).toFixed(2)}` },
      { text: `Dividing by $\\ln ${fmt(r)}$, which is negative, turns the inequality round. The first whole number past it is $k = ${k}$.` },
      { text: 'Check:', tex: aligned(`&${fmt(r)}^{${k}} \\times ${fmt(delta)}`, `&\\approx ${(r ** k * delta).toPrecision(2)} < ${fmt(eps)}`) },
    );
    return steps;
  },
};

interface KTilesParams extends KParams {
  logs: boolean;
}

/**
 * The condition on k, built from tiles: r^k δ < ε at difficulty 1, and with
 * logarithms taken at difficulty 2, where dividing by ln r turns the
 * inequality round.
 */
const kTiles: Generator<KTilesParams> = {
  id: 'numer-k-tiles',
  sample: (rng, difficulty) => ({ ...sampleK(rng, difficulty), logs: difficulty > 1 }),
  render: (params): Slide => {
    const { r, delta, eps, logs } = params;
    const answer = logs ? [fmt(eps / delta), fmt(r)] : [fmt(r), fmt(delta), fmt(eps)];
    const distractors = logs
      ? [fmt(delta / eps), fmt(eps), fmt(delta), fmt(1 - r), fmt(r * delta)]
      : [fmt(eps / delta), fmt(1 - r), fmt(r * delta), fmt(delta / 10)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `Each step multiplies the error by about $${fmt(r)}$, and $x_0$ is out by at most $${fmt(delta)}$. ${
            logs ? 'Take logarithms to build' : 'Build'
          } the condition for the error after $k$ steps to be ${epsText(eps)}.`,
        ),
      ],
      template: logs ? 'k > \\ln({0}) \\div \\ln({1})' : '({0})^k \\times {1} < {2}',
      bank: fillBank(answer, distractors),
      answer,
    };
  },
  solution: (params) => {
    const { r, delta, eps } = params;
    return [
      { tex: `${fmt(r)}^{k} \\times ${fmt(delta)} < ${fmt(eps)}` },
      { tex: `${fmt(r)}^{k} < ${fmt(eps / delta)}` },
      { tex: `k \\ln ${fmt(r)} < \\ln ${fmt(eps / delta)}` },
      { text: `$\\ln ${fmt(r)}$ is negative, so dividing by it turns the inequality round:` },
      { tex: aligned(`k &> \\ln ${fmt(eps / delta)} \\div \\ln ${fmt(r)}`, `&= ${kQuotient(params).toFixed(2)}`) },
    ];
  },
};

/** Both logarithms to 3 places and the quotient to 2, or undefined when rounding could go either way. */
function kLogFacts(params: KParams) {
  const ratio = params.eps / params.delta;
  const top = written(Math.log(ratio), 3);
  const bottom = written(Math.log(params.r), 3);
  const quotient = written(kQuotient(params), 2);
  if (!top || !bottom || !quotient) return undefined;
  // A learner dividing the rounded logarithms has to land on the same answer.
  if (written(Number(top) / Number(bottom), 2) !== quotient) return undefined;
  return { ratio, top, bottom, quotient };
}

/**
 * The quotient worked along a line: each logarithm to 3 decimal places, then
 * one divided by the other.
 */
const kLogsSteps: Generator<KParams> = {
  id: 'numer-k-logs-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleK(rng, difficulty);
      if (kLogFacts(params)) return params;
    }
  },
  render: (params): Slide => {
    const f = kLogFacts(params)!;
    const { r, delta, eps } = params;
    const slips = (...tokens: (string | undefined)[]) => tokens.filter((t): t is string => t !== undefined);
    return {
      kind: 'steps',
      prompt: [
        say(
          `The error after $k$ steps is at most $${fmt(r)}^{k} \\times ${fmt(delta)}$, and it must be below $${fmt(eps)}$. So $k$ must be greater than the quotient below. Work it out, each logarithm to 3 decimal places: tap the part you would do next, then choose what it comes to.`,
        ),
      ],
      start: [`\\ln(${fmt(f.ratio)})`, '\\div', `\\ln(${fmt(r)})`],
      reductions: [
        { span: [0, 1], value: f.top, bank: stepBank(f.top, ...slips(flipped(f.top), written(Math.log10(f.ratio), 3), written(Math.log(eps), 3))) },
        { span: [2, 3], value: f.bottom, bank: stepBank(f.bottom, ...slips(flipped(f.bottom), written(Math.log10(r), 3), written(Math.log(1 - r), 3))) },
        {
          span: [0, 3],
          operator: 1,
          value: f.quotient,
          bank: stepBank(f.quotient, ...slips(flipped(f.quotient), written(Number(f.bottom) / Number(f.top), 2), written(Number(f.top) - Number(f.bottom), 2))),
        },
      ],
    };
  },
  solution: (params) => {
    const f = kLogFacts(params)!;
    return [
      { tex: aligned(`\\ln ${fmt(f.ratio)} &= ${f.top}`, `\\ln ${fmt(params.r)} &= ${f.bottom}`) },
      { tex: `${f.top} \\div ${paren(f.bottom)} = ${f.quotient}` },
      { text: `Two negatives make a positive. $k$ must be more than $${f.quotient}$, so $k = ${kOf(params)}$ steps.` },
    ];
  },
};

interface ErrorIterateParams {
  family: FixedFamily;
  a: number;
  b: number;
  x0: number;
  dp: number;
}

/** The table, the tenth the root is in and the rate the errors shrink at, or undefined for a draw that is not fair. */
function workErrorIterate(params: ErrorIterateParams) {
  const scheme = fixedScheme(params);
  const { g, f } = scheme;
  const { x0, dp } = params;
  const values = run(g, x0, ITERATES);
  if (!values) return undefined;
  const tokens = values.slice(1).map((x) => written(x, dp));
  if (tokens.some((token) => token === undefined)) return undefined;
  const rows = tokens as string[];
  const carried = carriedRounded(g, x0, dp);
  if (!carried || carried.some((token, idx) => token !== rows[idx])) return undefined;
  if (rows[0] === x0.toFixed(dp)) return undefined;
  const root = limitOf(g, x0);
  if (root === undefined || Math.abs(f(root)) > 1e-9) return undefined;
  const tenth = Math.floor(root * 10 + 1e-9);
  const offset = root * 10 - tenth;
  if (offset < 0.1 || offset > 0.9) return undefined;
  const lo = tenth / 10;
  const hi = (tenth + 1) / 10;
  if (!(f(lo) * f(hi) < 0) || Math.abs(f(lo)) < 0.001 || Math.abs(f(hi)) < 0.001) return undefined;
  // The table starts outside the tenth and ends inside it: the closing in is the point.
  const tenthOfRow = (token: string) => Math.floor(Number(token) * 10 + 1e-9);
  if (tenthOfRow(rows[ITERATES - 1]) !== tenth || tenthOfRow(rows[0]) === tenth) return undefined;
  const rate = Math.abs(slope(g, root));
  if (rate < 0.1 || rate > 0.8) return undefined;
  const firstTruncated = values
    .slice(1)
    .map((x) => truncated(x, dp))
    .find((token, idx) => token !== rows[idx]);
  const numeric = iterateBank(rows, [
    firstTruncated,
    roundedWrongWay(values[1], dp),
    roundedWrongWay(values[2], dp),
    written(fixedScheme({ ...params, b: -params.b }).g(x0), dp),
  ]);
  if (!numeric) return undefined;
  const neighbour = bracketTex(offset < 0.5 ? tenth - 1 : tenth + 1);
  return {
    scheme,
    values,
    rows,
    tenth,
    rate,
    answer: [...rows, bracketTex(tenth)],
    bank: sortTokens([...numeric, bracketTex(tenth), neighbour]),
  };
}

/**
 * A table whose errors visibly shrink by about |g'(α)| a row, closing into
 * the tenth that the sign change then confirms.
 */
const errorIterate: Generator<ErrorIterateParams> = {
  id: 'numer-error-iterate',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const dp = hard ? 3 : 2;
    for (let attempt = 0; attempt < 4000; attempt += 1) {
      const family = rng.pick<FixedFamily>(hard ? ['cbrt', 'recip', 'sqrt'] : ['sqrt', 'cbrt']);
      const a = family === 'recip' ? rng.int(2, 20) : rng.int(1, 9);
      const b = family === 'recip' ? rng.int(1, 6) : rng.int(1, 30);
      const guess = limitOf(fixedScheme({ family, a, b, x0: 1, dp }).g, 1);
      if (guess === undefined) continue;
      const x0 = Math.max(0, Math.round(guess) + rng.pick([-2, -1, 1, 2]));
      const params = { family, a, b, x0, dp };
      if (workErrorIterate(params)) return params;
    }
    throw new Error('numer-error-iterate: no fair draw');
  },
  render: (params): Slide => {
    const work = workErrorIterate(params)!;
    return {
      kind: 'iterate',
      prompt: [
        say(
          `Starting from $x_0 = ${params.x0}$, this iteration converges to a root $\\alpha$ of $${work.scheme.equationTex} = 0$. Near $\\alpha$, $|g'(x)| \\approx ${work.rate.toFixed(2)}$, so each error is about $${work.rate.toFixed(2)}$ times the one before.`,
        ),
        show(work.scheme.schemeTex),
        say(`Keep full accuracy between steps and write each $x_n$ to ${params.dp} decimal places, then the two tenths $\\alpha$ lies between.`),
      ],
      start: String(params.x0),
      conclusion: 'bracket',
      bank: work.bank,
      answer: work.answer,
    };
  },
  solution: (params) => {
    const work = workErrorIterate(params)!;
    const { values, tenth } = work;
    const gaps = values.slice(1).map((x, i) => Math.abs(x - values[i]));
    const lo = (tenth / 10).toFixed(1);
    const hi = ((tenth + 1) / 10).toFixed(1);
    const f = work.scheme.f;
    return [
      { text: 'Put each value back into the scheme, keeping every digit and rounding only what you write down.', tex: work.scheme.schemeTex },
      ...rowSteps(values, work.rows),
      {
        text: `The steps between rows are about $${gaps.map((gap) => gap.toFixed(params.dp + 1)).join('$, $')}$: each roughly $${work.rate.toFixed(2)}$ times the last, as the errors are.`,
      },
      { tex: aligned(`f(${lo}) &= ${f(Number(lo)).toFixed(3)}`, `f(${hi}) &= ${f(Number(hi)).toFixed(3)}`) },
      { text: `The sign changes, so $${bracketTex(tenth)}$.` },
    ];
  },
};

/* ================================================================
 * Level 4: Simpson's rule, shared helpers
 * ================================================================ */

type Reduction = Extract<Slide, { kind: 'steps' }>['reductions'][number];

/** Simpson's weights for n strips: 1, 4, 2, 4, ..., 2, 4, 1. */
function simpsonWeights(n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => (i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2));
}

/**
 * Simpson's rule on heights at spacing h: the two ends, the odd-numbered
 * heights (each the middle of a pair of strips), the even-numbered middle ones
 * (where two pairs meet), the bracket and the estimate.
 */
function simpsonOf(ys: number[], h: number) {
  const n = ys.length - 1;
  const ends = ys[0] + ys[n];
  const odds = ys.reduce((s, y, i) => (i % 2 === 1 ? s + y : s), 0);
  const evens = ys.reduce((s, y, i) => (i > 0 && i < n && i % 2 === 0 ? s + y : s), 0);
  const total = ends + 4 * odds + 2 * evens;
  return { ys, ends, odds, evens, total, area: (h * total) / 3 };
}

const simpsonSums = (params: TrapParams) => simpsonOf(ordinates(params), params.h);

/** The bracket from its three sums, on two lines so it never runs off a phone. */
function sumLine(ends: number, odds: number, evens: number | undefined, total: number): string {
  const terms = `${fmt(ends)} + 4 \\times ${fmt(odds)}${evens === undefined ? '' : ` + 2 \\times ${fmt(evens)}`}`;
  return aligned(`&${terms}`, `&= ${fmt(total)}`);
}

/** Heights times their weights, three to a line, since seven in a row run off a phone. */
function weightedTex(ys: number[], total: number): string {
  const weights = simpsonWeights(ys.length - 1);
  const terms = ys.map((y, i) => (weights[i] === 1 ? fmt(y) : `${weights[i]}(${fmt(y)})`));
  if (terms.length <= 3) return `${terms.join(' + ')} = ${fmt(total)}`;
  const rows: string[] = [];
  for (let i = 0; i < terms.length; i += 3) rows.push(terms.slice(i, i + 3).join(' + '));
  return aligned(`&${rows[0]}`, ...rows.slice(1).map((row) => `&\\quad + ${row}`), `&= ${fmt(total)}`);
}

/** `y_1 + y_3 + ...`. Single-digit indices and no braces, since tiles split on `{digit}`. */
function oddList(n: number): string {
  return Array.from({ length: n / 2 }, (_, i) => `y_${2 * i + 1}`).join(' + ');
}

/** `y_2 + y_4 + ...`, the even-numbered middle heights. Empty for two strips. */
function evenList(n: number): string {
  return Array.from({ length: n / 2 - 1 }, (_, i) => `y_${2 * i + 2}`).join(' + ');
}

/** Simpson's bracket in letters: `y_0 + 4(y_1 + y_3) + 2y_2 + y_4`. */
function simpsonBracketTex(n: number): string {
  if (n === 2) return 'y_0 + 4y_1 + y_2';
  const evens = n === 4 ? '2y_2' : `2(${evenList(n)})`;
  return `y_0 + 4(${oddList(n)}) + ${evens} + y_${n}`;
}

/** The trapezium rule's bracket in letters, on the same heights. */
function trapBracketTex(n: number): string {
  return n === 2 ? 'y_0 + 2y_1 + y_2' : `y_0 + 2(${heightList(1, n - 1)}) + y_${n}`;
}

/**
 * Whole, positive heights whose Simpson estimate is an exact decimal.
 *
 * Simpson's rule divides by 3, and on a polynomial of degree 3 or less its
 * estimate is the integral, whose x^3/3 part is whole only when the x^2
 * coefficient times the width is a multiple of 3. So a quadratic has x^2
 * coefficient ±3, or strips of width 3; a cubic has x^2 coefficient a multiple
 * of 3. `2^x` never passes at h = 1 (its bracket is 13 or 65 times a power of
 * 2), and `k/x` only on the few `RECIP_ROWS` whose bracket divides. Whatever
 * is left over is refused rather than rounded. Difficulty 2 has wider strips,
 * cubics and `k/x`.
 */
function sampleSimpson(rng: Rng, difficulty: number, counts: number[]): TrapParams {
  const hard = difficulty > 1;
  for (;;) {
    const n = rng.pick(counts);
    const roll = rng.next();
    let params: TrapParams;
    if (hard && roll < 0.2) {
      params = { fn: 'quad', poly: [rng.pick([1, -1]), 3 * rng.int(-2, 2), rng.int(-6, 6), rng.int(1, 30)], k: 0, a: rng.int(0, 3), h: 1, n };
    } else if (hard && roll < 0.35) {
      params = sampleTrap(rng, 2, [n]);
      if (params.fn !== 'recip') continue;
    } else if (n === 2 && roll > 0.75) {
      // Strips of width 3, so h/3 = 1 and any quadratic will do.
      params = { fn: 'quad', poly: [rng.pick([1, 1, 2, -1]), rng.int(-6, 6), rng.int(1, 40)], k: 0, a: rng.int(0, 2), h: 3, n };
    } else {
      const lead = rng.pick([3, 3, -3]);
      const c = lead > 0 ? rng.int(1, 30) : rng.int(40, 99);
      params = { fn: 'quad', poly: [lead, rng.int(-8, 8), c], k: 0, a: rng.int(0, hard ? 2 : 3), h: hard ? 2 : 1, n };
    }
    const ys = ordinates(params);
    if (ys.some((y) => y <= 0 || y > 99)) continue;
    if (!terminates(simpsonSums(params).area)) continue;
    return params;
  }
}

function simpsonSolution(params: TrapParams): SolutionStep[] {
  const { ys, ends, odds, evens, total, area } = simpsonSums(params);
  const n = params.n;
  const sums = [`y_0 + y_{${n}} &= ${fmt(ends)}`, `${oddList(n)} &= ${fmt(odds)}`];
  if (n > 2) sums.push(`${evenList(n)} &= ${fmt(evens)}`);
  return [
    { text: `Strips of width $h = ${fmt(params.h)}$ put the heights at ${heightsText(params)}:` },
    { tex: ordinateRows(ys) },
    {
      text:
        n === 2
          ? 'One parabola over the pair of strips: the ends once, the middle height four times.'
          : 'The ends once, the odd-numbered heights (the middle of each pair) four times, the even-numbered middle ones (where two pairs meet) twice:',
    },
    { tex: aligned(...sums) },
    { tex: sumLine(ends, odds, n > 2 ? evens : undefined, total) },
    { tex: `\\frac{${fmt(params.h)}}{3} \\times ${fmt(total)} = ${fmt(area)}` },
  ];
}

/* ================================================================
 * Level 4, lesson 1: a parabola through three points
 * ================================================================ */

interface SimpsonFormulaParams {
  a: number;
  h: number;
  n: number;
  /** Which function is named, from FORMULA_FUNCTIONS. */
  f: number;
}

/** Strip widths whose third is an exact decimal, so h/3 can be a tile. */
const THIRDABLE = [0.3, 0.6, 0.75, 1.2, 1.5, 3];

/**
 * The rule's shape as tiles: h/3 as a number, then the heights in their
 * places. Two strips at difficulty 1; four or six at 2, where the odd- and
 * even-numbered middles have to be told apart.
 */
const simpsonTiles: Generator<SimpsonFormulaParams> = {
  id: 'numer-simpson-tiles',
  sample: (rng, difficulty) => ({
    a: rng.int(1, 4),
    h: rng.pick(THIRDABLE),
    n: difficulty > 1 ? rng.pick([4, 6]) : 2,
    f: rng.int(0, FORMULA_FUNCTIONS.length - 1),
  }),
  render: ({ a, h, n, f }): Slide => {
    const two = n === 2;
    const answer = two ? [fmt(h / 3), 'y_0 + y_2', 'y_1'] : [fmt(h / 3), `y_0 + y_${n}`, oddList(n), evenList(n)];
    const slips = two
      ? [fmt(h), fmt(h / 2), 'y_0 + y_1', 'y_1 + y_2', 'y_0', 'y_2']
      : [fmt(h), fmt(h / 2), `y_0 + y_${n - 1}`, heightList(1, n - 1), `${evenList(n)} + y_${n}`, `y_0 + ${oddList(n)}`];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `Estimate $\\int_{${a}}^{${fmt(a + n * h)}} ${FORMULA_FUNCTIONS[f]}\\,dx$ with ${n} strips. Complete Simpson's rule, where ${n === 2 ? '$y_0$, $y_1$ and $y_2$' : `$y_0, y_1, \\ldots, y_${n}$`} are the heights at the ends of the strips.`,
        ),
      ],
      template: two ? 'A \\approx {0}[{1} + 4{2}]' : 'A \\approx {0}[{1} + 4({2}) + 2({3})]',
      bank: fillBank(answer, slips),
      answer,
    };
  },
  solution: ({ h, n }) => [
    { text: `${n} strips across a width of $${fmt(n * h)}$ makes $h = ${fmt(h)}$, so $\\frac{h}{3} = ${fmt(h / 3)}$.` },
    {
      text:
        n === 2
          ? 'One parabola runs through the three heights. The ends count once each and the middle one four times.'
          : 'The strips go in pairs, one parabola to a pair. The ends count once; the odd-numbered heights, the middle of each pair, four times; the even-numbered ones, where two pairs meet, twice.',
    },
    {
      tex:
        n === 2
          ? `A \\approx ${fmt(h / 3)}[y_0 + y_2 + 4y_1]`
          : aligned(`A &\\approx ${fmt(h / 3)}[y_0 + y_{${n}}`, `&\\quad + 4(${oddList(n)})`, `&\\quad + 2(${evenList(n)})]`),
    },
  ],
};

/**
 * Two strips as a tree: the three heights, 4y_1, the bracket, the estimate.
 */
const parabolaTree: Generator<TrapParams> = {
  id: 'numer-parabola-tree',
  sample: (rng, difficulty) => sampleSimpson(rng, difficulty, [2]),
  render: (params): Slide => {
    const { ys, total, area } = simpsonSums(params);
    const h = params.h;
    const answer = [ys[0], ys[1], ys[2], 4 * ys[1], total, area].map(fmt);
    const trap = ys[0] + 2 * ys[1] + ys[2];
    const slips = [2 * ys[1], trap, (h / 2) * trap, h * total, ys[0] + ys[1] + ys[2], (h / 2) * total]
      .filter((v) => terminates(v))
      .map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Simpson's rule with 2 strips of width $h = ${fmt(h)}$ fits one parabola through three heights. Top row: $y_0$, $y_1$, $y_2$ at ${heightsText(params)}. Then $4y_1$; then $y_0 + 4y_1 + y_2$; last, $\\frac{h}{3}$ times that.`,
        ),
      ],
      expression: integralTex(params),
      nodes: [
        { id: 'y0', from: [] },
        { id: 'y1', from: [] },
        { id: 'y2', from: [] },
        { id: 'four', from: ['y1'] },
        { id: 'total', from: ['y0', 'four', 'y2'] },
        { id: 'area', from: ['total'] },
      ],
      bank: numberBank(answer, slips, around([area, total])),
      answer,
    };
  },
  solution: (params) => simpsonSolution(params),
};

/**
 * The rule worked along a line: the ends, four times the odd-numbered
 * heights, twice the even-numbered ones, the bracket, then h/3 times it.
 */
const simpsonSteps: Generator<TrapParams> = {
  id: 'numer-simpson-steps',
  sample: (rng, difficulty) => sampleSimpson(rng, difficulty, [difficulty > 1 ? 4 : 2]),
  render: (params): Slide => {
    const { ys, ends, odds, evens, total, area } = simpsonSums(params);
    const n = params.n;
    const h = params.h;
    const oddYs = ys.filter((_, i) => i % 2 === 1).map(fmt);
    const start = [
      `\\frac{${fmt(h)}}{3}`,
      '\\times',
      '[',
      `${fmt(ys[0])} + ${fmt(ys[n])}`,
      '+',
      n === 2 ? `4 \\times ${oddYs[0]}` : `4(${oddYs.join(' + ')})`,
    ];
    const reductions: Reduction[] = [
      { span: [3, 4], value: fmt(ends), bank: stepBank(fmt(ends), fmt(ends + 1), fmt(ends - 1), fmt(ys[0] * ys[n])) },
      { span: [5, 6], value: fmt(4 * odds), bank: stepBank(fmt(4 * odds), fmt(odds), fmt(2 * odds), fmt(4 * odds + 4)) },
    ];
    if (n > 2) {
      const evenYs = ys.filter((_, i) => i > 0 && i < n && i % 2 === 0).map(fmt);
      start.push('+', evenYs.length === 1 ? `2 \\times ${evenYs[0]}` : `2(${evenYs.join(' + ')})`);
      reductions.push({
        span: [7, 8],
        value: fmt(2 * evens),
        bank: stepBank(fmt(2 * evens), fmt(evens), fmt(4 * evens), fmt(2 * evens + 2)),
      });
    }
    start.push(']');
    reductions.push({
      span: [2, start.length],
      operator: 4,
      value: fmt(total),
      bank: stepBank(fmt(total), fmt(ends + odds + evens), fmt(ends + 2 * (odds + evens)), fmt(total + 1)),
    });
    reductions.push({
      span: [0, 3],
      operator: 1,
      value: fmt(area),
      bank: stepBank(fmt(area), ...[h * total, (h / 2) * total, area + 1].filter((v) => terminates(v)).map(fmt)),
    });
    return {
      kind: 'steps',
      prompt: [
        say(
          `Simpson's rule for $${integralTex(params)}$ with ${n} strips, $h = ${fmt(h)}$, is set up below from the heights $y_0$ to $y_${n}$. Tap the part you would work out next, then choose what it comes to.`,
        ),
      ],
      start,
      reductions,
    };
  },
  solution: (params) => simpsonSolution(params),
};

/** Which bracket, written with the question's own heights. */
const weightsChoice: Generator<TrapParams> = {
  id: 'numer-weights-choice',
  sample: (rng, difficulty) => sampleSimpson(rng, difficulty, [difficulty > 1 ? 4 : 2]),
  render: (params): Slide => {
    const y = ordinates(params).map(fmt);
    const n = params.n;
    const opts: ChoiceOption[] =
      n === 2
        ? [
            { tex: `${y[0]} + 4(${y[1]}) + ${y[2]}`, correct: true },
            { tex: `${y[0]} + 2(${y[1]}) + ${y[2]}` },
            { tex: `4(${y[0]}) + ${y[1]} + 4(${y[2]})` },
            { tex: `${y[0]} + ${y[1]} + ${y[2]}` },
          ]
        : [
            { tex: `${y[0]} + 4(${y[1]} + ${y[3]}) + 2(${y[2]}) + ${y[4]}`, correct: true },
            { tex: `${y[0]} + 2(${y[1]} + ${y[3]}) + 4(${y[2]}) + ${y[4]}` },
            { tex: `${y[0]} + 2(${y[1]} + ${y[2]} + ${y[3]}) + ${y[4]}` },
            { tex: `${y[0]} + 4(${y[1]} + ${y[2]} + ${y[3]}) + ${y[4]}` },
          ];
    return choiceSlide(
      [
        say(
          `Simpson's rule with ${n} strips estimates $${integralTex(params)}$ as $\\frac{h}{3}$ times a bracket of the heights. The heights at ${heightsText(params)} are $${y.join('$, $')}$. Which is the bracket?`,
        ),
      ],
      opts,
    );
  },
  solution: (params) => {
    const { ys, total } = simpsonSums(params);
    const n = params.n;
    const weights = simpsonWeights(n);
    return [
      {
        text:
          n === 2
            ? 'The ends count once and the middle height four times: weights $1, 4, 1$.'
            : `The ends count once, the odd-numbered heights four times and the even-numbered middle one twice: weights $${weights.join(', ')}$.`,
      },
      { tex: simpsonBracketTex(n) },
      { tex: weightedTex(ys, total) },
    ];
  },
};

/* ================================================================
 * Level 4, lesson 2: more strips
 * ================================================================ */

/** The weights row as tiles, under the question's own heights. */
const weightsTiles: Generator<TrapParams> = {
  id: 'numer-weights-tiles',
  sample: (rng, difficulty) => sampleTrap(rng, 1, [difficulty > 1 ? 6 : 4]),
  render: (params): Slide => {
    const ys = ordinates(params);
    const n = params.n;
    const answer = simpsonWeights(n).map(String);
    return {
      kind: 'tiles',
      prompt: [
        say(
          `Simpson's rule with ${n} strips estimates $${integralTex(params)}$ as $\\frac{h}{3}$ times a weighted sum of the heights at ${heightsText(params)}. Fill in each height's weight.`,
        ),
      ],
      template: ys.map((y, i) => `{${i}}(${fmt(y)})`).join(' + '),
      // A spare weight the answer already uses would only be a second copy of
      // one of its own tiles, so only the ones it does not use are added.
      bank: [...answer, ...['2', '3', '4'].filter((w) => !answer.includes(w))].sort(),
      answer,
    };
  },
  solution: (params) => {
    const n = params.n;
    return [
      { text: `${n} strips make ${n / 2} pairs, one parabola to a pair, and each pair gives its three heights $1, 4, 1$.` },
      { text: 'Where two pairs meet, the shared height collects a 1 from each: 2. So the row runs' },
      { tex: simpsonWeights(n).join(',\\ ') },
      { text: 'On these heights the bracket is' },
      { tex: weightedTex(ordinates(params), simpsonSums(params).total) },
    ];
  },
};

/** The estimate itself, typed. Not the integral: no `integrand` or `limits`. */
const simpsonEstimate: Generator<TrapParams> = {
  id: 'numer-simpson-estimate',
  sample: (rng, difficulty) => sampleSimpson(rng, difficulty, [4]),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`Use Simpson's rule with ${params.n} strips to estimate the integral.`), show(integralTex(params))],
    lead: `${integralTex(params)} \\approx`,
    keypad: [],
    answer: fmt(simpsonSums(params).area),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => simpsonSolution(params),
};

interface OddFlowParams {
  a: number;
  h: number;
  strips: number;
  /** Difficulty 1 lists the x values; 2 gives the range and the spacing. */
  listed: boolean;
}

const MIXED = 'Simpson on all but the last strip, the trapezium rule on that one';
const ANYWAY = "Simpson's weights on every strip anyway";
const DROP = 'Leave the last strip out';

/** How many strips, whether they pair up, and what to do when one is left over. */
const oddFlow: Generator<OddFlowParams> = {
  id: 'numer-odd-flow',
  sample: (rng, difficulty) => ({
    a: rng.int(0, 4),
    h: rng.pick([0.5, 1, 2, 5, 10]),
    strips: rng.int(3, 8),
    listed: difficulty === 1,
  }),
  render: ({ a, h, strips, listed }): Slide => {
    const xs = Array.from({ length: strips + 1 }, (_, i) => fmt(a + i * h));
    const b = xs[strips];
    const where = listed ? `at $x = ${xs.join(', ')}$` : `every $${fmt(h)}$ from $x = ${a}$ to $x = ${b}$`;
    const key = `${a}|${h}|${strips}`;
    const answer = strips % 2 === 0 ? [String(strips), 'Yes'] : [String(strips), 'No', MIXED];
    return {
      kind: 'flow',
      prompt: [say(`The heights of a curve are known ${where}, and nowhere else. The area under it is wanted by Simpson's rule.`)],
      subject: `\\int_{${a}}^{${b}} y\\,dx`,
      steps: [
        {
          id: 'count',
          ask: 'How many strips do those heights make?',
          branches: turned([strips, strips + 1, strips - 1].map(String), key).map((label) => ({ label, to: 'pairs' })),
        },
        {
          id: 'pairs',
          ask: "Simpson's rule takes the strips two at a time. Do they pair up exactly?",
          branches: [
            { label: 'Yes', outcome: "Then Simpson's rule takes them all at once." },
            { label: 'No', to: 'odd' },
          ],
        },
        {
          id: 'odd',
          ask: 'One strip is left over. What now?',
          branches: turned(
            [
              { label: MIXED, outcome: 'Then every strip is counted, all but one of them under parabolas.' },
              { label: ANYWAY, outcome: 'Then the weights run $1, 4, 2, \\ldots$ to the end, whatever the last pair looks like.' },
              { label: DROP, outcome: 'Then the estimate covers a narrower interval than the one asked about.' },
            ],
            key,
          ),
        },
      ],
      answer,
    };
  },
  solution: ({ a, h, strips }) => {
    const b = a + strips * h;
    const count = { text: `From $${a}$ to $${fmt(b)}$ in steps of $${fmt(h)}$ is $${strips}$ strips: one fewer than the number of heights.` };
    return strips % 2 === 0
      ? [count, { text: `$${strips}$ is even, so the strips make $${strips / 2}$ pairs and Simpson's rule takes them all.` }]
      : [
          count,
          { text: `$${strips}$ is odd, so one strip is left once the rest are paired. Simpson's weights only come from pairs.` },
          { text: `Use Simpson's rule on the first $${strips - 1}$ strips and the trapezium rule on the last one, and add the two.` },
        ];
  },
};

/**
 * Four strips as a tree: the five heights, the ends, 4 times the odd-numbered
 * pair, 2 times the middle, the bracket and the estimate.
 */
const stripsTree: Generator<TrapParams> = {
  id: 'numer-strips-tree',
  sample: (rng, difficulty) => sampleSimpson(rng, difficulty, [4]),
  render: (params): Slide => {
    const { ys, ends, odds, evens, total, area } = simpsonSums(params);
    const h = params.h;
    const answer = [...ys, ends, 4 * odds, 2 * evens, total, area].map(fmt);
    const slips = [odds, 2 * odds, evens, 4 * evens, ends + 2 * (odds + evens), h * total, (h / 2) * total]
      .filter((v) => terminates(v))
      .map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Simpson's rule with 4 strips, $h = ${fmt(h)}$. Top row: $y_0$ to $y_4$ at ${heightsText(params)}. Then $y_0 + y_4$, $4(y_1 + y_3)$ and $2y_2$; then their total; last, $\\frac{h}{3}$ times that.`,
        ),
      ],
      expression: integralTex(params),
      nodes: [
        { id: 'y0', from: [] },
        { id: 'y1', from: [] },
        { id: 'y2', from: [] },
        { id: 'y3', from: [] },
        { id: 'y4', from: [] },
        { id: 'ends', from: ['y0', 'y4'] },
        { id: 'odds', from: ['y1', 'y3'] },
        { id: 'evens', from: ['y2'] },
        { id: 'total', from: ['ends', 'odds', 'evens'] },
        { id: 'area', from: ['total'] },
      ],
      bank: numberBank(answer, slips, around([area, total])),
      answer,
    };
  },
  solution: (params) => simpsonSolution(params),
};

/* ================================================================
 * Level 4, lesson 3: Simpson against the trapezium
 * ================================================================ */

/** Both rules from the same heights, side by side. */
const bothTree: Generator<TrapParams> = {
  id: 'numer-both-tree',
  sample: (rng, difficulty) => sampleSimpson(rng, difficulty, [difficulty > 1 ? 4 : 2]),
  render: (params): Slide => {
    const simp = simpsonSums(params);
    const trap = trapSums(params);
    const n = params.n;
    const h = params.h;
    const leaves = simp.ys.map((_, i) => ({ id: `y${i}`, from: [] as string[] }));
    const all = leaves.map((leaf) => leaf.id);
    const answer = [...simp.ys, trap.total, simp.total, trap.area, simp.area].map(fmt);
    const slips = [(h / 3) * trap.total, (h / 2) * simp.total, trap.ends + trap.mids, h * trap.total]
      .filter((v) => terminates(v))
      .map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Estimate the integral both ways from the same ${n + 1} heights, $h = ${fmt(h)}$. Top row: $y_0$ to $y_${n}$ at ${heightsText(params)}. Then the trapezium bracket $${trapBracketTex(n)}$ and Simpson's bracket $${simpsonBracketTex(n)}$. Last, the estimates: $\\frac{h}{2}$ times the first, $\\frac{h}{3}$ times the second.`,
        ),
      ],
      expression: integralTex(params),
      nodes: [...leaves, { id: 'tb', from: all }, { id: 'sb', from: all }, { id: 't', from: ['tb'] }, { id: 's', from: ['sb'] }],
      bank: numberBank(answer, slips, around([simp.area, trap.area]), 4),
      answer,
    };
  },
  solution: (params) => {
    const simp = simpsonSums(params);
    const trap = trapSums(params);
    const h = fmt(params.h);
    return [
      { text: `The heights at ${heightsText(params)}:` },
      { tex: ordinateRows(simp.ys) },
      { text: 'Trapezium rule: the ends once, every middle height twice.' },
      { tex: `T = \\frac{${h}}{2} \\times ${fmt(trap.total)} = ${fmt(trap.area)}` },
      { text: "Simpson's rule: the ends once, then $4, 2, 4, \\ldots$ across the middle." },
      { tex: `S = \\frac{${h}}{3} \\times ${fmt(simp.total)} = ${fmt(simp.area)}` },
    ];
  },
};

/** Simpson's estimate minus the trapezium's, on the same heights. */
const gapValue: Generator<TrapParams> = {
  id: 'numer-gap-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleSimpson(rng, difficulty, [difficulty > 1 ? 4 : 2]);
      if (Math.abs(simpsonSums(params).area - trapSums(params).area) > 1e-9) return params;
    }
  },
  render: (params): Slide => {
    const s = simpsonSums(params).area;
    const t = trapSums(params).area;
    return {
      kind: 'expression',
      prompt: [
        say(
          `The trapezium rule with ${params.n} strips gives $T = ${fmt(t)}$ for the integral below. Use Simpson's rule on the same heights, $h = ${fmt(params.h)}$, to find $S$, then give $S - T$.`,
        ),
        show(integralTex(params)),
      ],
      lead: 'S - T =',
      keypad: [],
      answer: fmt(s - t),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const s = simpsonSums(params).area;
    const t = trapSums(params).area;
    return [
      ...simpsonSolution(params),
      { tex: `S - T = ${fmt(s)} - ${paren(t)} = ${fmt(s - t)}` },
      {
        text:
          s < t
            ? "Simpson's estimate is the smaller: its parabolas follow the curve down where the trapezia's straight tops cut across above it."
            : "Simpson's estimate is the larger: its parabolas follow the curve up where the trapezia's straight tops cut across below it.",
      },
    ];
  },
};

interface CloserParams {
  poly: Poly;
  a: number;
  n: number;
}

type Closer = 'simpson' | 'trap' | 'same';

const CLOSER_LABELS: Record<Closer, string> = {
  simpson: "Simpson's rule",
  trap: 'The trapezium rule',
  same: 'Both are equally close',
};

function closerFacts({ poly, a, n }: CloserParams) {
  const params: TrapParams = { fn: 'quad', poly, k: 0, a, h: 1, n };
  const t = trapSums(params).area;
  const s = simpsonSums(params).area;
  const exact = exactIntegral(poly, a, a + n);
  const dt = Math.abs(t - exact);
  const ds = Math.abs(s - exact);
  const winner: Closer = dt < 1e-9 && ds < 1e-9 ? 'same' : ds < dt ? 'simpson' : 'trap';
  return { params, ys: ordinates(params), t, s, exact, dt, ds, winner };
}

/**
 * Which rule lands nearer a known exact value. Difficulty 1 is a line (both
 * exact) or a quadratic or cubic (Simpson exact); difficulty 2 is a quartic,
 * where Simpson's rule usually wins but, when the x^2 term all but cancels the
 * bend, the trapezium rule can. The winner is chosen first and the draw found
 * to fit, so neither answer is a foregone conclusion; near ties are refused.
 */
const closerChoice: Generator<CloserParams> = {
  id: 'numer-closer-choice',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const want: Closer = hard ? (rng.chance(0.35) ? 'trap' : 'simpson') : rng.chance(0.25) ? 'same' : 'simpson';
    for (let attempt = 0; ; attempt += 1) {
      const target = attempt < 5000 ? want : undefined;
      const n = hard && target !== 'trap' ? rng.pick([2, 4]) : 2;
      let poly: Poly;
      if (hard) poly = [rng.pick([1, 2, 3]), rng.int(-3, 3), 3 * rng.int(-6, 4), 2 * rng.int(-6, 6), rng.int(0, 40)];
      else if (target === 'same') poly = [nonZero(rng, 6), rng.int(1, 20)];
      else poly = [rng.int(0, 1) * rng.sign(), 3 * nonZero(rng, 2), rng.int(-6, 6), rng.int(1, 20)];
      const a = rng.int(hard ? -2 : 0, 2);
      const params = { poly, a, n };
      const facts = closerFacts(params);
      if (facts.ys.some((y) => y < 1 || y > 99)) continue;
      if (!terminates(facts.s) || !terminates(facts.exact)) continue;
      if (target !== undefined && facts.winner !== target) continue;
      if (facts.winner !== 'same' && Math.max(facts.dt, facts.ds) < 1.5 * Math.min(facts.dt, facts.ds)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { ys, exact, winner } = closerFacts(params);
    const b = params.a + params.n;
    const xs = ys.map((_, i) => fmt(params.a + i));
    return choiceSlide(
      [
        say(
          `$\\int_{${params.a}}^{${b}} f(x)\\,dx = ${fmt(exact)}$ exactly. The heights of $f$ at $x = ${xs.join(', ')}$ are $${ys.map(fmt).join('$, $')}$. Using all ${params.n} strips, which rule's estimate comes closer to the exact value?`,
        ),
      ],
      (['simpson', 'trap', 'same'] as Closer[]).map((key) => ({ tex: CLOSER_LABELS[key], correct: key === winner })),
      false,
    );
  },
  solution: (params) => {
    const { t, s, exact, dt, ds, winner } = closerFacts(params);
    return [
      { tex: aligned(`T &= ${fmt(t)}`, `S &= ${fmt(s)}`) },
      { text: `Against the exact $${fmt(exact)}$, the trapezium rule is out by $${fmt(dt)}$ and Simpson's rule by $${fmt(ds)}$.` },
      {
        text:
          winner === 'same'
            ? 'Both are exact: on a straight line the chords and the parabolas are the line itself.'
            : winner === 'simpson'
              ? "Simpson's rule is closer."
              : "The trapezium rule is closer this time: the curve's bend all but evens out across the interval, and Simpson's small error is the larger.",
      },
    ];
  },
};

interface RefineParams {
  trap: TrapParams;
  /** Difficulty 1 states S = (4T_2 - T_1)/3; difficulty 2 leaves it to the learner. */
  told: boolean;
}

const BEND_UP = 'Upward, so the chords sit above it';
const BEND_DOWN = 'Downward, so the chords sit below it';

function refineFacts({ trap }: RefineParams) {
  const ys = ordinates(trap);
  const h = trap.h;
  const t1 = h * (ys[0] + ys[2]);
  const t2 = (h / 2) * (ys[0] + 2 * ys[1] + ys[2]);
  return { ys, t1, t2, s: simpsonSums(trap).area };
}

/**
 * Two trapezium estimates, one strip and two, then Simpson's from the same
 * three heights: which way the curve bends from which way the estimate moved,
 * and S = (4T_2 - T_1)/3.
 */
const refineFlow: Generator<RefineParams> = {
  id: 'numer-refine-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const trap = sampleSimpson(rng, difficulty, [2]);
      // A cubic can change the way it bends mid-interval; these never do.
      if (trap.fn === 'quad' && trap.poly.length > 3) continue;
      return { trap, told: difficulty === 1 };
    }
  },
  render: (params): Slide => {
    const { t1, t2, s } = refineFacts(params);
    const key = `${t1}|${t2}`;
    const values = [s, (t1 + t2) / 2, (4 * t1 - t2) / 3, 2 * t2 - t1].filter((v) => terminates(v)).map(fmt);
    const labels = [...new Set(values)].slice(0, 4);
    return {
      kind: 'flow',
      prompt: [
        say(
          `The trapezium rule on $${integralTex(params.trap)}$ gives $T_1$ with one strip and $T_2$ with two, both from the heights at ${heightsText(params.trap)}. The curve bends the same way all along.`,
        ),
      ],
      subject: `T_1 = ${fmt(t1)}, \\quad T_2 = ${fmt(t2)}`,
      steps: [
        {
          id: 'bend',
          ask: 'Halving the strip width moved the estimate from $T_1$ to $T_2$. Which way does the curve bend?',
          branches: [
            { label: BEND_UP, to: 'simpson' },
            { label: BEND_DOWN, to: 'simpson' },
          ],
        },
        {
          id: 'simpson',
          ask: params.told
            ? "Simpson's rule on the same three heights is $S = \\frac{4T_2 - T_1}{3}$. What is $S$?"
            : "What is Simpson's estimate $S$ from the same three heights?",
          branches: turned(
            labels.map((label) => ({ label: `$${label}$`, outcome: `Then $S = ${label}$.` })),
            key,
          ),
        },
      ],
      answer: [t1 > t2 ? BEND_UP : BEND_DOWN, `$${fmt(s)}$`],
    };
  },
  solution: (params) => {
    const { ys, t1, t2, s } = refineFacts(params);
    const h = fmt(params.trap.h);
    return [
      {
        text:
          t1 > t2
            ? 'More strips brought the estimate down, so the chords were sitting above the curve: it bends upward.'
            : 'More strips brought the estimate up, so the chords were sitting below the curve: it bends downward.',
      },
      { text: "Four $T_2$ less one $T_1$ leaves the heights weighted $1, 4, 1$, which is Simpson's rule:" },
      { tex: `S = \\frac{4 \\times ${fmt(t2)} - ${paren(t1)}}{3} = ${fmt(s)}` },
      { tex: `\\frac{${h}}{3}(${fmt(ys[0])} + 4 \\times ${fmt(ys[1])} + ${fmt(ys[2])}) = ${fmt(s)}` },
    ];
  },
};

/* ================================================================
 * Level 4, lesson 4: exact for cubics
 * ================================================================ */

/** An antiderivative with fractional coefficients kept as fractions. */
function antiTex(poly: Poly): string {
  const n = poly.length - 1;
  return sumTex(
    poly.map((c, i) => {
      const k = n - i + 1;
      if (c === 0) return '0';
      if (Number.isInteger(c / k)) return termTex(c / k, k);
      const g = gcd(Math.abs(c), k);
      return `${c < 0 ? '-' : ''}\\tfrac{${Math.abs(c) / g}}{${k / g}}${k === 1 ? 'x' : `x^{${k}}`}`;
    }),
  );
}

interface SimpsonErrorParams {
  poly: Poly;
  a: number;
  n: number;
}

function simpsonErrorFacts({ poly, a, n }: SimpsonErrorParams) {
  const s = simpsonSums({ fn: 'quad', poly, k: 0, a, h: 1, n }).area;
  const exact = exactIntegral(poly, a, a + n);
  return { s, exact, error: s - exact };
}

/**
 * The error, estimate minus exact value. A quartic (the x^4 coefficient a
 * multiple of 3, so the error is an exact decimal) most of the time, and a
 * cubic otherwise, whose error is nought.
 */
const simpsonError: Generator<SimpsonErrorParams> = {
  id: 'numer-simpson-error',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = difficulty > 1 ? 4 : 2;
      const poly = rng.chance(0.65)
        ? [rng.pick([3, -3]), rng.int(-4, 4), 3 * rng.int(-3, 3), 2 * rng.int(-4, 4), rng.int(-9, 9)]
        : [rng.pick([1, 2, 4, -1, -2]), 3 * rng.int(-2, 2), 2 * rng.int(-4, 4), rng.int(-9, 9)];
      const a = rng.int(-2, 1);
      const { s, exact } = simpsonErrorFacts({ poly, a, n });
      if (!terminates(s) || !terminates(exact) || Math.abs(exact) > 400) continue;
      return { poly, a, n };
    }
  },
  render: (params): Slide => {
    const { s, error } = simpsonErrorFacts(params);
    const b = params.a + params.n;
    return {
      kind: 'expression',
      prompt: [
        say(
          `Simpson's rule with ${params.n} strips gives $${fmt(s)}$ for the integral below, where $f(x) = ${polyTex(params.poly)}$. Integrate exactly, then find the error: the estimate minus the exact value.`,
        ),
        show(`\\int_{${params.a}}^{${b}} f(x)\\,dx`),
      ],
      lead: '\\text{error} =',
      keypad: [],
      answer: fmt(error),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { s, exact, error } = simpsonErrorFacts(params);
    const b = params.a + params.n;
    const quartic = params.poly.length === 5;
    return [
      { text: `Integrate term by term: $F(x) = ${antiTex(params.poly)}$.` },
      { tex: `F(${b}) - F(${params.a}) = ${fmt(exact)}` },
      { tex: aligned(`\\text{error} &= ${fmt(s)} - ${paren(exact)}`, `&= ${fmt(error)}`) },
      {
        text: quartic
          ? "Not nought: an $x^{4}$ term is more than any parabola can follow exactly, so Simpson's rule is only close."
          : "Nought: on a cubic, Simpson's rule is exact.",
      },
    ];
  },
};

interface Candidate {
  tex: string;
  /** The degree of a polynomial; absent for a function that is not one. */
  degree?: number;
}

/** A polynomial of a given degree, written out, with small whole coefficients. */
function expandedCandidate(rng: Rng, degree: number): Candidate {
  const poly = Array.from({ length: degree + 1 }, (_, i) => (i === 0 ? nonZero(rng, 3) : rng.chance(0.4) ? 0 : nonZero(rng, 9)));
  return { tex: polyTex(poly), degree };
}

/** A polynomial of a given degree written as a product, so its degree has to be counted. */
function factoredCandidate(rng: Rng, degree: number): Candidate {
  const x = degree > 1 && rng.chance(0.3);
  const factors: string[] = [];
  let left = x ? degree - 1 : degree;
  while (left > 0) {
    if (left >= 2 && rng.chance(0.4)) {
      const squared = left >= 4 && rng.chance(0.4);
      factors.push(`(x^{2} + ${rng.int(1, 5)})${squared ? '^{2}' : ''}`);
      left -= squared ? 4 : 2;
    } else {
      const squared = left >= 2 && rng.chance(0.4);
      factors.push(`(${linFactor(nonZero(rng, 4))})${squared ? '^{2}' : ''}`);
      left -= squared ? 2 : 1;
    }
  }
  return { tex: `${x ? 'x' : ''}${factors.join('')}`, degree };
}

/** A function that is not a polynomial, in the plain form or a disguised one. */
function otherCandidate(rng: Rng, disguised: boolean): Candidate {
  const k = rng.int(2, 12);
  const plain = ['2^{x}', `\\frac{${k}}{x}`, '\\sqrt{x}', 'e^{x}', '\\ln x', '\\sin x'];
  const hidden = [`\\frac{x^{3} + ${k}}{x}`, 'x^{2}\\sqrt{x}', 'x^{3} + 2^{x}', `\\frac{${k}}{x^{2}}`, 'x\\ln x', `x^{3} + \\frac{${k}}{x}`];
  return { tex: rng.pick(disguised ? hidden : plain) };
}

/** A candidate integrand: exact under Simpson (degree 3 or less), a higher polynomial, or not a polynomial. */
function candidate(rng: Rng, difficulty: number, kind: 'exact' | 'high' | 'other'): Candidate {
  const hard = difficulty > 1;
  if (kind === 'other') return otherCandidate(rng, hard);
  const degree = kind === 'exact' ? rng.int(hard ? 2 : 1, 3) : rng.int(4, 5);
  return hard ? factoredCandidate(rng, degree) : expandedCandidate(rng, degree);
}

interface ExactFlowParams {
  f: Candidate;
  a: number;
  n: number;
}

const EXACT_YES = '3 or less';
const EXACT_NO = '4 or more';

/** Is Simpson's rule exact here: a polynomial, and of degree at most 3. */
const exactFlow: Generator<ExactFlowParams> = {
  id: 'numer-exact-flow',
  sample: (rng, difficulty) => {
    const kind = rng.pick<'exact' | 'high' | 'other'>(['exact', 'exact', 'high', 'high', 'other']);
    return { f: candidate(rng, difficulty, kind), a: rng.int(1, 3), n: rng.pick([2, 4, 6]) };
  },
  render: ({ f, a, n }): Slide => ({
    kind: 'flow',
    prompt: [say(`Simpson's rule with ${n} strips is used on $\\int_{${a}}^{${a + n}} f(x)\\,dx$. Does it give the integral exactly?`)],
    subject: `f(x) = ${f.tex}`,
    steps: [
      {
        id: 'poly',
        ask: 'Is $f$ a polynomial?',
        branches: [
          { label: 'Yes', to: 'degree' },
          { label: 'No', outcome: "Then there is no degree to go by, and Simpson's rule gives only an estimate." },
        ],
      },
      {
        id: 'degree',
        ask: 'What is its degree?',
        branches: [
          { label: EXACT_YES, outcome: "Then Simpson's rule gives the integral exactly." },
          { label: EXACT_NO, outcome: "Then Simpson's rule gives an estimate, not the integral." },
        ],
      },
    ],
    answer: f.degree === undefined ? ['No'] : ['Yes', f.degree <= 3 ? EXACT_YES : EXACT_NO],
  }),
  solution: ({ f }) =>
    f.degree === undefined
      ? [
          { text: `$${f.tex}$ is not a polynomial: it has a power of $x$ that is not a whole number, or $x$ in a denominator, an exponent, a log or a sine.` },
          { text: "Simpson's rule is exact only for polynomials of degree 3 or less, so here it is an estimate." },
        ]
      : [
          { text: `$${f.tex}$ is a polynomial of degree $${f.degree}$${f.tex.includes('(') ? ', counting the powers of $x$ across the brackets' : ''}.` },
          {
            text:
              f.degree <= 3
                ? "Simpson's rule is exact for every polynomial of degree 3 or less: the parabolas' error from an $x^{3}$ term cancels across each pair of strips."
                : "Degree 4 or more has a part no parabola follows, and it does not cancel, so Simpson's rule is only an estimate.",
          },
        ],
};

interface ExactChoiceParams {
  /** The first is the one Simpson's rule integrates exactly. */
  fs: Candidate[];
  a: number;
  n: number;
}

/** Of four integrands, the one on which Simpson's rule is exact. */
const exactChoice: Generator<ExactChoiceParams> = {
  id: 'numer-exact-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const fs = [
        candidate(rng, difficulty, 'exact'),
        candidate(rng, difficulty, 'high'),
        candidate(rng, difficulty, rng.chance(0.5) ? 'high' : 'other'),
        candidate(rng, difficulty, 'other'),
      ];
      if (new Set(fs.map((f) => f.tex)).size < fs.length) continue;
      return { fs, a: rng.int(1, 3), n: rng.pick([2, 4]) };
    }
  },
  render: ({ fs, a, n }): Slide =>
    choiceSlide(
      [say(`Simpson's rule with ${n} strips is used on $\\int_{${a}}^{${a + n}} f(x)\\,dx$. For which $f(x)$ does it give the integral exactly?`)],
      fs.map((f, i) => ({ tex: f.tex, correct: i === 0 })),
    ),
  solution: ({ fs }) => [
    { text: "Simpson's rule is exact for polynomials of degree 3 or less, and only those." },
    ...fs.map((f) => ({
      text:
        f.degree === undefined
          ? `$${f.tex}$ is not a polynomial.`
          : `$${f.tex}$ has degree $${f.degree}$${f.degree <= 3 ? ': exact.' : ': an estimate.'}`,
    })),
  ],
};

interface CubicStepsParams {
  poly: Poly;
  a: number;
  h: number;
}

function cubicFacts({ poly, a, h }: CubicStepsParams) {
  const trap: TrapParams = { fn: 'quad', poly, k: 0, a, h, n: 2 };
  const F = (x: number) => exactIntegral(poly, 0, x);
  const b = a + 2 * h;
  return { trap, b, Fa: F(a), Fb: F(b), exact: F(b) - F(a), ...simpsonSums(trap) };
}

/**
 * Simpson's rule set against the exact integral of a cubic, worked along one
 * line, until the difference comes out nought. The coefficients (x^3 a multiple
 * of 4, x^2 of 3, x of 2) keep every value of the antiderivative whole.
 */
const cubicSteps: Generator<CubicStepsParams> = {
  id: 'numer-cubic-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const h = difficulty > 1 ? 2 : 1;
      const poly = [rng.pick([4, -4, 4]), 3 * rng.int(-3, 3), 2 * rng.int(-6, 6), rng.int(1, 30)];
      const a = difficulty > 1 ? rng.int(-2, 0) : rng.int(0, 2);
      const params = { poly, a, h };
      const { ys } = cubicFacts(params);
      if (ys.some((y) => y < 1 || y > 99)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { trap, b, Fa, Fb, exact, ys, ends, total, area } = cubicFacts(params);
    const h = params.h;
    const lower = (h / 2) * total;
    const reductions: Reduction[] = [
      { span: [3, 4], value: fmt(ends), bank: stepBank(fmt(ends), fmt(ends + 1), fmt(ends - 1), fmt(ys[0] * ys[2])) },
      { span: [5, 6], value: fmt(4 * ys[1]), bank: stepBank(fmt(4 * ys[1]), fmt(ys[1]), fmt(2 * ys[1]), fmt(4 * ys[1] + 4)) },
      { span: [2, 7], operator: 4, value: fmt(total), bank: stepBank(fmt(total), fmt(ends + ys[1]), fmt(ends + 2 * ys[1]), fmt(total + 1)) },
      {
        span: [0, 3],
        operator: 1,
        value: fmt(area),
        bank: stepBank(fmt(area), ...[h * total, lower, area + 1].filter((v) => terminates(v)).map(fmt)),
      },
      { span: [2, 3], value: fmt(exact), bank: stepBank(fmt(exact), fmt(Fb + Fa), fmt(exact + 1), fmt(-exact)) },
      { span: [0, 3], operator: 1, value: '0', bank: stepBank('0', fmt(area + exact), '1', '-1') },
    ];
    return {
      kind: 'steps',
      prompt: [
        say(
          `Simpson's rule with 2 strips, $h = ${fmt(h)}$, is set against the exact value of $${integralTex(trap)}$. Here $F(x) = ${antiTex(params.poly)}$, so the exact value is $F(${fmt(b)}) - F(${params.a})$. Tap the part you would work out next, then choose what it comes to.`,
        ),
      ],
      start: [
        `\\frac{${fmt(h)}}{3}`,
        '\\times',
        '[',
        `${fmt(ys[0])} + ${fmt(ys[2])}`,
        '+',
        `4 \\times ${fmt(ys[1])}`,
        ']',
        '-',
        `(${fmt(Fb)} - ${paren(Fa)})`,
      ],
      reductions,
    };
  },
  solution: (params) => {
    const { b, Fa, Fb, exact, total, area } = cubicFacts(params);
    return [
      ...simpsonSolution(cubicFacts(params).trap).slice(0, 2),
      { tex: `\\frac{${fmt(params.h)}}{3} \\times ${fmt(total)} = ${fmt(area)}` },
      { tex: aligned(`F(${fmt(b)}) - F(${params.a}) &= ${fmt(Fb)} - ${paren(Fa)}`, `&= ${fmt(exact)}`) },
      { text: "The same number: on a cubic, Simpson's rule is exact, so the difference is nought." },
    ];
  },
};

/* ================================================================
 * Level 4, lesson 5: from a table of readings
 * ================================================================ */

interface Story {
  /** The opening sentence, given the spacing as written. */
  setup: (h: string) => string;
  x: string;
  y: string;
  ask: string;
  lead: string;
  /** Spacings whose third is an exact decimal. */
  hs: number[];
  lo: number;
  hi: number;
  /** Readings at the two ends are nought, as at a river's banks. */
  zeroEnds?: boolean;
}

const STORIES: Story[] = [
  {
    setup: (h) => `A river's depth $d$, in metres, is measured every $${h}$ m across it, from bank to bank.`,
    x: 'x',
    y: 'd',
    ask: 'Estimate the area of its cross-section, in square metres.',
    lead: 'A \\approx',
    hs: [0.6, 1.5, 3],
    lo: 1,
    hi: 9,
    zeroEnds: true,
  },
  {
    setup: (h) => `A car's speed $v$, in metres per second, is read every $${h}$ seconds.`,
    x: 't',
    y: 'v',
    ask: 'Estimate how far it travels, in metres.',
    lead: '\\text{distance} \\approx',
    hs: [1.5, 3, 6],
    lo: 4,
    hi: 30,
  },
  {
    setup: (h) => `A pond's width $w$, in metres, is measured every $${h}$ m along its length.`,
    x: 'x',
    y: 'w',
    ask: "Estimate the pond's area, in square metres.",
    lead: 'A \\approx',
    hs: [0.75, 1.5, 3, 6],
    lo: 2,
    hi: 20,
  },
  {
    setup: (h) => `Water runs into a tank at $r$ litres a minute, read every $${h}$ minutes.`,
    x: 't',
    y: 'r',
    ask: 'Estimate how much runs in, in litres.',
    lead: 'V \\approx',
    hs: [1.5, 3, 6],
    lo: 5,
    hi: 40,
  },
];

interface ReadingsParams {
  story: number;
  h: number;
  ys: number[];
}

function sampleReadings(rng: Rng, count: number): ReadingsParams {
  const story = rng.int(0, STORIES.length - 1);
  const s = STORIES[story];
  const ys = Array.from({ length: count }, (_, i) => (s.zeroEnds && (i === 0 || i === count - 1) ? 0 : rng.int(s.lo, s.hi)));
  return { story, h: rng.pick(s.hs), ys };
}

const readingsXs = ({ h, ys }: ReadingsParams) => ys.map((_, i) => i * h);

/**
 * Readings as a two-row table. Six columns of values fit a phone and seven do
 * not, so a longer table is split in two, one above the other.
 */
function readingsTable(x: string, y: string, xs: number[], ys: number[]): string {
  const part = (from: number, to: number) =>
    `\\begin{array}{c|${'c'.repeat(to - from)}} ${x} & ${xs.slice(from, to).map(fmt).join(' & ')} \\\\ \\hline ${y} & ${ys.slice(from, to).map(fmt).join(' & ')} \\end{array}`;
  if (ys.length <= 5) return part(0, ys.length);
  const half = Math.ceil(ys.length / 2);
  return `\\begin{gathered} ${part(0, half)} \\\\[6pt] ${part(half, ys.length)} \\end{gathered}`;
}

function readingsTex(params: ReadingsParams): string {
  const s = STORIES[params.story];
  return readingsTable(s.x, s.y, readingsXs(params), params.ys);
}

function readingsSolution(params: ReadingsParams): SolutionStep[] {
  const { ends, odds, evens, total, area } = simpsonOf(params.ys, params.h);
  const n = params.ys.length - 1;
  return [
    { text: `${params.ys.length} readings make ${n} strips, an even number, of width $h = ${fmt(params.h)}$.` },
    { tex: aligned(`\\text{ends} &= ${fmt(ends)}`, `\\text{odd-numbered} &= ${fmt(odds)}`, `\\text{even-numbered} &= ${fmt(evens)}`) },
    { tex: sumLine(ends, odds, evens, total) },
    { tex: `\\frac{${fmt(params.h)}}{3} \\times ${fmt(total)} = ${fmt(area)}` },
  ];
}

/** One estimate from a table of real readings. */
const readingsEstimate: Generator<ReadingsParams> = {
  id: 'numer-readings-estimate',
  sample: (rng, difficulty) => sampleReadings(rng, difficulty > 1 ? 7 : 5),
  render: (params): Slide => {
    const s = STORIES[params.story];
    return {
      kind: 'expression',
      prompt: [say(s.setup(fmt(params.h))), show(readingsTex(params)), say(`${s.ask} Use Simpson's rule.`)],
      lead: s.lead,
      keypad: [],
      answer: fmt(simpsonOf(params.ys, params.h).area),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => readingsSolution(params),
};

/** The same, as a tree from the grouped sums up. */
const tableTree: Generator<ReadingsParams> = {
  id: 'numer-table-tree',
  sample: (rng, difficulty) => sampleReadings(rng, difficulty > 1 ? 7 : 5),
  render: (params): Slide => {
    const s = STORIES[params.story];
    const { ends, odds, evens, total, area } = simpsonOf(params.ys, params.h);
    const h = params.h;
    const answer = [ends, odds, evens, 4 * odds, 2 * evens, total, area].map(fmt);
    const slips = [2 * odds, 4 * evens, ends + odds + evens, ends + 2 * (odds + evens), h * total, (h / 2) * total]
      .filter((v) => terminates(v))
      .map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(s.setup(fmt(h))),
        show(readingsTex(params)),
        say(
          `${s.ask} Top row: the two end readings added, then the odd-numbered ones, then the even-numbered middle ones. Then 4 times and 2 times those; the bracket; last, $\\frac{h}{3}$ times it.`,
        ),
      ],
      expression: `\\frac{${fmt(h)}}{3}[\\ldots]`,
      nodes: [
        { id: 'ends', from: [] },
        { id: 'odds', from: [] },
        { id: 'evens', from: [] },
        { id: 'four', from: ['odds'] },
        { id: 'two', from: ['evens'] },
        { id: 'total', from: ['ends', 'four', 'two'] },
        { id: 'area', from: ['total'] },
      ],
      bank: numberBank(answer, slips, around([area, total])),
      answer,
    };
  },
  solution: (params) => readingsSolution(params),
};

/** Simpson's parabolas through the readings, one to each pair of strips, for drawing. */
function parabolas(xs: number[], ys: number[]): (x: number) => number {
  const h = xs[1] - xs[0];
  const pairs = (xs.length - 1) / 2;
  return (x) => {
    const pair = Math.min(pairs - 1, Math.max(0, Math.floor((x - xs[0]) / (2 * h))));
    const [x0, x1, x2] = xs.slice(2 * pair, 2 * pair + 3);
    const [y0, y1, y2] = ys.slice(2 * pair, 2 * pair + 3);
    return (
      (y0 * (x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2)) +
      (y1 * (x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2)) +
      (y2 * (x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1))
    );
  };
}

interface ReadingsSliderParams {
  ys: number[];
  h: number;
}

/**
 * The height of the rectangle with Simpson's area over the same width: its
 * estimate over the width, which is the bracket over 3n whatever h is. Drawn
 * as the readings with the rule's parabolas through them.
 */
const readingsSlider: Generator<ReadingsSliderParams> = {
  id: 'numer-readings-slider',
  sample: (rng, difficulty) => {
    const step = difficulty > 1 ? 0.25 : 0.5;
    for (;;) {
      const count = difficulty > 1 ? 7 : 5;
      const ys = Array.from({ length: count }, () => rng.int(2, 16));
      const h = rng.pick([0.5, 1, 2]);
      const mean = simpsonOf(ys, h).total / (3 * (count - 1));
      if (Math.abs(mean / step - Math.round(mean / step)) > 1e-9) continue;
      return { ys, h };
    }
  },
  render: ({ ys, h }): Slide => {
    const n = ys.length - 1;
    const xs = ys.map((_, i) => i * h);
    const width = n * h;
    const mean = simpsonOf(ys, h).total / (3 * n);
    const curve = parabolas(xs, ys);
    const top = Math.ceil(Math.max(...ys, ...xs.slice(0, -1).map((x) => curve(x + h / 2))) + 2);
    return {
      kind: 'slider',
      prompt: [
        say(`A curve's heights at equal steps are below, with Simpson's parabolas drawn through them.`),
        show(readingsTable('x', 'y', xs, ys)),
        say(
          `A rectangle $${fmt(width)}$ wide with the same area as Simpson's estimate has height $\\frac{S}{${fmt(width)}}$. Slide the line to that height.`,
        ),
      ],
      min: 0,
      max: top,
      step: ys.length > 5 ? 0.25 : 0.5,
      answer: mean,
      readout: '\\text{height} = {v}',
      figure: {
        svg: plotSvg({
          xMin: -h / 4,
          xMax: width + h / 4,
          yMin: 0,
          yMax: top,
          curves: [{ f: curve, accent: true }],
          marks: xs.map((x, i) => ({ x, y: ys[i] })),
          verticals: [{ x: 0 }, { x: width }],
          label: "Readings at equal steps with Simpson's parabolas through them",
        }),
        ...markerWindow(0, top, 'y'),
        axis: 'y',
      },
    };
  },
  solution: ({ ys, h }) => {
    const n = ys.length - 1;
    const { total, area } = simpsonOf(ys, h);
    return [
      { text: `Weights $${simpsonWeights(n).join(', ')}$ give the bracket:` },
      { tex: weightedTex(ys, total) },
      { tex: `S = \\frac{${fmt(h)}}{3} \\times ${fmt(total)} = ${fmt(area)}` },
      { tex: `\\frac{S}{${fmt(n * h)}} = ${fmt(total / (3 * n))}` },
    ];
  },
};

interface OddChoiceParams extends ReadingsParams {
  /** Difficulty 1 shows the table; 2 gives only the range, so the strips are counted from it. */
  listed: boolean;
}

type OddMethod = 'all' | 'mixed' | 'drop';

const ODD_LABELS: Record<OddMethod, string> = {
  all: "Simpson's rule on all the strips",
  mixed: "Simpson's rule on all but the last strip, the trapezium rule on that one",
  drop: "Leave out the last reading, then Simpson's rule on the rest",
};

/** Which method covers every reading properly: it turns on whether the strips pair up. */
const oddChoice: Generator<OddChoiceParams> = {
  id: 'numer-odd-choice',
  sample: (rng, difficulty) => ({ ...sampleReadings(rng, rng.int(5, 8)), listed: difficulty === 1 }),
  render: (params): Slide => {
    const s = STORIES[params.story];
    const n = params.ys.length - 1;
    const right: OddMethod = n % 2 === 0 ? 'all' : 'mixed';
    const shown: Block[] = params.listed
      ? [say(s.setup(fmt(params.h))), show(readingsTex(params))]
      : [say(`${s.setup(fmt(params.h))} The readings run from $${s.x} = 0$ to $${s.x} = ${fmt(n * params.h)}$.`)];
    return choiceSlide(
      [...shown, say(`${s.ask} Which of these uses Simpson's rule properly and every reading?`)],
      (['all', 'mixed', 'drop'] as OddMethod[]).map((key) => ({ tex: ODD_LABELS[key], correct: key === right })),
      false,
    );
  },
  solution: (params) => {
    const n = params.ys.length - 1;
    return [
      { text: `${n + 1} readings make ${n} strips, one fewer than the readings.` },
      n % 2 === 0
        ? { text: `$${n}$ is even: the strips pair up, so Simpson's rule takes them all.` }
        : { text: `$${n}$ is odd: one strip is left over. Simpson's rule on the first $${n - 1}$, the trapezium rule on the last, and add.` },
      { text: 'Leaving out a reading throws away part of the area asked about.' },
    ];
  },
};

/* ================================================================
 * Level 5: Euler's method
 * ================================================================ */

/**
 * The right-hand side of dy/dx = f(x, y): a polynomial in x, plus q y, plus
 * r x y. With q = r = 0 the equation is in x alone and its exact solution is
 * found by integrating, which is the only place an exact y is ever asked for.
 */
interface Rhs {
  px: Poly;
  q: number;
  r: number;
}

/** An initial value problem stepped n times with step h. */
interface Ivp {
  rhs: Rhs;
  x0: number;
  y0: number;
  h: number;
  n: number;
}

/** Float dust off a value built from exact decimals. */
const clean = (value: number) => Number(value.toFixed(9));

const hasY = ({ q, r }: Rhs) => q !== 0 || r !== 0;

function rhsAt({ px, q, r }: Rhs, x: number, y: number): number {
  return clean(valueAt(px, x) + q * y + r * x * y);
}

/** Signed terms joined as they are read: `2x^{2} - xy + 0.5y - 3`. */
function termPieces(terms: [number, string[]][]): string[] {
  const out: string[] = [];
  for (const [c, factors] of terms) {
    if (c === 0) continue;
    const size = Math.abs(c);
    const parts = size === 1 && factors.length > 0 ? factors : [fmt(size), ...factors];
    // A bracketed factor sits against what it multiplies: `0.5(-3)`, which keeps a line of working short.
    const body = parts.reduce((acc, part) => (acc === '' ? part : part.startsWith('(') ? `${acc}${part}` : `${acc} \\times ${part}`), '');
    out.push(out.length === 0 ? (c < 0 ? `-${body}` : body) : c < 0 ? `- ${body}` : `+ ${body}`);
  }
  return out.length === 0 ? ['0'] : out;
}

const termsTex = (terms: [number, string[]][]) => termPieces(terms).join(' ');

/** f as the learner reads it: x terms, then xy, then y, then the constant. */
function rhsTex({ px, q, r }: Rhs): string {
  const n = px.length - 1;
  const letters = (c: number, v: string): [number, string[]] => [c, [v]];
  const terms: [number, string[]][] = [
    ...px.slice(0, -1).map((c, i) => letters(c, n - i === 1 ? 'x' : `x^{${n - i}}`)),
    letters(r, 'xy'),
    letters(q, 'y'),
    [px[n], []],
  ];
  // Letters sit against their coefficient, `2x` rather than `2 \times x`.
  return termsTex(terms).replace(/ \\times (?=[xy])/g, '');
}

/** f with numbers in place of x and y, term by term, for lines of working. */
function rhsSubTex({ px, q, r }: Rhs, x: number, y: number): string[] {
  const n = px.length - 1;
  const power = (k: number) => (k === 1 ? paren(x) : `${paren(x)}^{${k}}`);
  return termPieces([
    ...px.slice(0, -1).map((c, i): [number, string[]] => [c, [power(n - i)]]),
    [r, [paren(x), paren(y)]],
    [q, [paren(y)]],
    [px[n], []],
  ]);
}

/** `f(x_0, y_0)`, or `f(x_0)` when y plays no part. */
function gradName(rhs: Rhs, x: string, y: string): string {
  return hasY(rhs) ? `f(${x}, ${y})` : `f(${x})`;
}

/** The problem as one sentence: the equation and the starting point. */
function ivpText({ rhs, x0, y0 }: Pick<Ivp, 'rhs' | 'x0' | 'y0'>): string {
  return `$\\frac{dy}{dx} = ${gradName(rhs, 'x', 'y')} = ${rhsTex(rhs)}$, with $y = ${fmt(y0)}$ when $x = ${fmt(x0)}$`;
}

/** The equation alone, for a flow's subject line. */
const odeTex = (rhs: Rhs) => `\\frac{dy}{dx} = ${rhsTex(rhs)}`;

interface EulerRun {
  xs: number[];
  ys: number[];
  /** The gradient used for each step: gs[i] = f(x_i, y_i). */
  gs: number[];
}

/** Euler's method: y_{i+1} = y_i + h f(x_i, y_i), n times. */
function eulerRun({ rhs, x0, y0, h, n }: Ivp): EulerRun {
  const xs = [x0];
  const ys = [y0];
  const gs: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const g = rhsAt(rhs, xs[i], ys[i]);
    gs.push(g);
    xs.push(clean(xs[i] + h));
    ys.push(clean(ys[i] + h * g));
  }
  return { xs, ys, gs };
}

/** The run, when every value it writes is an exact decimal of a sensible size. */
function exactRun(ivp: Ivp, limit = 60): EulerRun | undefined {
  const run = eulerRun(ivp);
  const written = [...run.xs, ...run.ys, ...run.gs, ...run.gs.map((g) => clean(ivp.h * g))];
  return written.every((v) => terminates(v) && Math.abs(v) <= limit) ? run : undefined;
}

/** An antiderivative with no constant, by the power rule. */
function antiderivative(px: Poly): Poly {
  const n = px.length - 1;
  return [...px.map((c, i) => c / (n - i + 1)), 0];
}

/** The exact y at x, for an equation in x alone: y_0 plus the integral from x_0. */
function exactY({ rhs, x0, y0 }: Pick<Ivp, 'rhs' | 'x0' | 'y0'>, x: number): number {
  const F = antiderivative(rhs.px);
  return clean(y0 + valueAt(F, x) - valueAt(F, x0));
}

/** An antiderivative as the learner reads it. */
const antiTexOf = (px: Poly) => rhsTex({ px: antiderivative(px).map(clean), q: 0, r: 0 });

/**
 * The solution curve, for drawing only: integrated exactly when f is in x
 * alone, and by a fine Runge-Kutta march otherwise. Nothing graded reads it.
 */
function solutionCurve({ rhs, x0, y0 }: Pick<Ivp, 'rhs' | 'x0' | 'y0'>): (x: number) => number {
  if (!hasY(rhs)) return (x) => exactY({ rhs, x0, y0 }, x);
  const f = (x: number, y: number) => valueAt(rhs.px, x) + rhs.q * y + rhs.r * x * y;
  return (x) => {
    const steps = 40;
    const dx = (x - x0) / steps;
    let t = x0;
    let y = y0;
    for (let i = 0; i < steps; i += 1) {
      const k1 = f(t, y);
      const k2 = f(t + dx / 2, y + (dx * k1) / 2);
      const k3 = f(t + dx / 2, y + (dx * k2) / 2);
      const k4 = f(t + dx, y + dx * k3);
      y += (dx * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
      t += dx;
    }
    return y;
  };
}

/**
 * The solution curve over one window, marched once rather than from x_0 on
 * every call: `solutionCurve` re-runs forty Runge-Kutta steps per point, and a
 * plot asks for hundreds of points. Here one RK4 step per grid gap of
 * `(xMax - xMin) / samples`, anchored on x_0, fills a table, and a point
 * between two entries is read off the line joining them. For drawing only.
 */
function windowCurve(ivp: Pick<Ivp, 'rhs' | 'x0' | 'y0'>, xMin: number, xMax: number, samples = 160): (x: number) => number {
  const { rhs, x0, y0 } = ivp;
  if (!hasY(rhs)) return solutionCurve(ivp);
  const f = (x: number, y: number) => valueAt(rhs.px, x) + rhs.q * y + rhs.r * x * y;
  const dx = (xMax - xMin) / samples;
  const first = Math.floor((xMin - x0) / dx) - 1;
  const last = Math.ceil((xMax - x0) / dx) + 1;
  const table = new Map<number, number>([[0, y0]]);
  for (const dir of [1, -1]) {
    let y = y0;
    for (let k = 0; dir > 0 ? k < last : k > first; k += dir) {
      const t = x0 + k * dx;
      const d = dir * dx;
      const k1 = f(t, y);
      const k2 = f(t + d / 2, y + (d * k1) / 2);
      const k3 = f(t + d / 2, y + (d * k2) / 2);
      const k4 = f(t + d, y + d * k3);
      y += (d * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
      table.set(k + dir, y);
    }
  }
  return (x) => {
    const at = (x - x0) / dx;
    const near = Math.round(at);
    if (Math.abs(at - near) < 1e-9 && table.has(near)) return table.get(near)!;
    const k = Math.max(first, Math.min(last - 1, Math.floor(at)));
    const [a, b] = [table.get(k)!, table.get(k + 1)!];
    return a + (b - a) * (at - k);
  };
}

const H_EASY = [0.5, 0.2, 0.1];
const H_HARD = [0.25, 0.2, 0.1, 0.5];

/**
 * An equation in x alone: a line at difficulty 1, a quadratic with whole or
 * half coefficients at 2. Refused unless every step and the exact y at the
 * end are exact decimals.
 */
function sampleXOnly(rng: Rng, difficulty: number, steps: number[], hs = difficulty > 1 ? H_HARD : H_EASY): Ivp {
  const hard = difficulty > 1;
  for (;;) {
    const px: Poly = hard
      ? [rng.pick([-3, -1.5, 1.5, 3]), rng.int(-4, 4), rng.int(-3, 5)]
      : [nonZero(rng, 4), rng.int(-4, 5)];
    const ivp: Ivp = { rhs: { px, q: 0, r: 0 }, x0: rng.int(0, 3), y0: rng.int(-3, 6), h: rng.pick(hs), n: rng.pick(steps) };
    const run = exactRun(ivp);
    if (!run) continue;
    const exact = exactY(ivp, run.xs[ivp.n]);
    if (!terminates(exact) || Math.abs(exact) > 60) continue;
    return ivp;
  }
}

/**
 * An equation with y in it: `ax + by + c` at difficulty 1, and at 2 half
 * coefficients, starts on the half-integers and products `xy`. Refused unless
 * y actually moves the second gradient, so holding the first one fixed is a
 * visible slip.
 */
function sampleWithY(rng: Rng, difficulty: number, steps: number[], hs = difficulty > 1 ? H_HARD : H_EASY): Ivp {
  const hard = difficulty > 1;
  for (;;) {
    const rhs: Rhs =
      hard && rng.next() < 0.5
        ? { px: [0, rng.int(-2, 2)], q: rng.pick([0, 0, 1, -1]), r: rng.pick([1, -1, 0.5, 2]) }
        : { px: [rng.int(-2, 3), rng.int(-3, 3)], q: rng.pick(hard ? [1, -1, 2, -2, 0.5, -0.5] : [1, -1, 2]), r: 0 };
    const ivp: Ivp = {
      rhs,
      x0: hard ? rng.int(0, 6) / 2 : rng.int(0, 2),
      y0: rng.int(hard ? -3 : 0, 5),
      h: rng.pick(hs),
      n: rng.pick(steps),
    };
    const run = exactRun(ivp);
    if (!run) continue;
    if (rhsAt(rhs, run.xs[1], run.ys[1]) === rhsAt(rhs, run.xs[1], ivp.y0)) continue;
    return ivp;
  }
}

/** Either kind, a third of the time in x alone. */
function sampleAny(rng: Rng, difficulty: number, steps: number[], hs?: number[]): Ivp {
  return rng.next() < 1 / 3 ? sampleXOnly(rng, difficulty, steps, hs) : sampleWithY(rng, difficulty, steps, hs);
}

/** Substituted terms, as many to a line as fit a phone: about 18 characters. */
function substituted(pieces: string[]): string[] {
  const width = (piece: string) => piece.replace(/\\times/g, 'x').replace(/[\\{}^ ]/g, '').length;
  const lines: string[][] = [];
  for (const piece of pieces) {
    const last = lines[lines.length - 1];
    if (last && [...last, piece].reduce((sum, p) => sum + width(p) + 1, 0) <= 18) last.push(piece);
    else lines.push([piece]);
  }
  return lines.map((line, i) => `&${i === 0 ? '=' : '\\quad'} ${line.join(' ')}`);
}

/** The error worked out, the subtraction split so it never runs off a phone. */
const errorTex = (estimate: number, exact: number, error: number) =>
  aligned(`\\text{error} &= ${fmt(estimate)}`, `&\\quad - ${paren(exact)}`, `&= ${fmt(error)}`);

/** The working for step i: the gradient, then the new y. */
function stepLines({ rhs, h }: Ivp, run: EulerRun, i: number): SolutionStep[] {
  const { xs, ys, gs } = run;
  return [
    { tex: aligned(`&${gradName(rhs, fmt(xs[i]), fmt(ys[i]))}`, ...substituted(rhsSubTex(rhs, xs[i], ys[i])), `&= ${fmt(gs[i])}`) },
    { tex: aligned(`y_{${i + 1}} &= ${fmt(ys[i])} + ${fmt(h)}${gs[i] < 0 ? paren(gs[i]) : ` \\times ${fmt(gs[i])}`}`, `&= ${fmt(ys[i + 1])}`) },
  ];
}

/** Every step of a run, each gradient found at the point the last step reached. */
function runSolution(ivp: Ivp): SolutionStep[] {
  const run = eulerRun(ivp);
  return [
    { text: `Each step: the gradient at the point reached so far, times $h = ${fmt(ivp.h)}$, added to $y$.` },
    ...run.gs.flatMap((_, i) => stepLines(ivp, run, i)),
  ];
}

/** Rows n, x_n, y_n so far, as a small table in the prompt. */
function reachedTable(run: EulerRun, upTo: number): string {
  const rows = run.xs.slice(0, upTo + 1).map((x, i) => `${i} & ${fmt(x)} & ${fmt(run.ys[i])}`);
  return `\\begin{array}{c|c|c} n & x_n & y_n \\\\ \\hline ${rows.join(' \\\\ ')} \\end{array}`;
}

/** A native choice slide turned by `key`, for options whose labels never change. */
function keyedChoice(prompt: Block[], opts: ChoiceOption[], key: string, tex: boolean): Slide {
  const ordered = turned(opts, key);
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

const ivpKey = ({ rhs, x0, y0, h, n }: Ivp) => `${rhs.px.join(',')}|${rhs.q}|${rhs.r}|${x0}|${y0}|${h}|${n}`;

/*
 * Every Euler value is an estimate, not the solution, so no slide in this
 * level declares `source`, `integrand` or `limits`: the oracle in
 * generators.test.ts would differentiate or integrate and mark the estimate
 * against the exact answer. The checks live in numericalMethods.test.ts, which
 * reads f, h, x_0 and y_0 off each slide and steps Euler itself.
 */

/* ---------- Level 5, lesson 1: one tangent step ---------- */

/** One step as a tree: x_1 and the gradient, the rise h times it, then y_1. */
const eulerStepTree: Generator<Ivp> = {
  id: 'numer-euler-step-tree',
  sample: (rng, difficulty) => sampleAny(rng, difficulty, [1]),
  render: (ivp): Slide => {
    const { rhs, x0, y0, h } = ivp;
    const run = eulerRun(ivp);
    const [g] = run.gs;
    const rise = clean(h * g);
    const answer = [run.xs[1], g, rise, run.ys[1]].map(fmt);
    const slips = [clean(y0 + g), rhsAt(rhs, run.xs[1], y0), clean(g + h), clean(y0 - rise), clean(x0 + g)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${ivpText(ivp)}. One step of Euler's method with $h = ${fmt(h)}$ runs along the tangent at $(${fmt(x0)}, ${fmt(y0)})$. Top row: $x_1$, and the gradient $${gradName(rhs, 'x_0', 'y_0')}$. Then the rise, $h$ times that gradient; last, $y_1$.`,
        ),
      ],
      expression: `y_1 = y_0 + h\\,${gradName(rhs, 'x_0', 'y_0')}`,
      nodes: [
        { id: 'x1', from: [] },
        { id: 'grad', from: [] },
        { id: 'rise', from: ['grad'] },
        { id: 'y1', from: ['rise'] },
      ],
      bank: numberBank(answer, slips.map(fmt), around([run.ys[1], g], h)),
      answer,
    };
  },
  solution: (ivp) => {
    const run = eulerRun(ivp);
    return [
      { tex: `x_1 = ${fmt(ivp.x0)} + ${fmt(ivp.h)} = ${fmt(run.xs[1])}` },
      { text: 'The gradient where the step starts, then that gradient times the step:' },
      ...stepLines(ivp, run, 0),
    ];
  },
};

/**
 * The step formula as tiles, with the question's own numbers: the first step
 * at difficulty 1, and at 2 the second, from a table of where the first one
 * reached, so the old point is there to be picked by mistake.
 */
const eulerFormulaTiles: Generator<Ivp> = {
  id: 'numer-euler-formula-tiles',
  sample: (rng, difficulty) => sampleAny(rng, difficulty, [difficulty > 1 ? 2 : 1]),
  render: (ivp): Slide => {
    const { rhs, h, n } = ivp;
    const run = eulerRun(ivp);
    const k = n - 1;
    const [xk, yk] = [run.xs[k], run.ys[k]].map(fmt);
    const answer = hasY(rhs) ? [yk, fmt(h), xk, yk] : [yk, fmt(h), xk];
    const slips = [run.xs[k + 1], run.gs[k], clean(2 * h), ...(k > 0 ? [run.xs[0], run.ys[0]] : [clean(run.ys[0] + 1)])].map(fmt);
    const prompt: Block[] =
      k === 0
        ? [say(`${ivpText(ivp)}. Complete the first step of Euler's method, with $h = ${fmt(h)}$.`)]
        : [
            say(`${ivpText(ivp)}. Euler's method with $h = ${fmt(h)}$ has reached this far:`),
            show(reachedTable(run, k)),
            say('Complete the next step.'),
          ];
    return {
      kind: 'tiles',
      prompt,
      template: `y_${k + 1} = {0} + {1} \\times ${hasY(rhs) ? 'f({2}, {3})' : 'f({2})'}`,
      bank: fillBank(answer, slips),
      answer,
    };
  },
  solution: (ivp) => {
    const run = eulerRun(ivp);
    const k = ivp.n - 1;
    return [
      { text: `The step starts from the last point reached, $(${fmt(run.xs[k])}, ${fmt(run.ys[k])})$, and uses the gradient there.` },
      { tex: `y_{${k + 1}} = y_{${k}} + h\\,${gradName(ivp.rhs, `x_{${k}}`, `y_{${k}}`)}` },
      ...stepLines(ivp, run, k),
    ];
  },
};

const SLIDER_STEP = 0.25;

/**
 * The tangent drawn against the curve, and the learner slides a line to the
 * height it reaches one step along: y_1. Only draws where y_1 sits on the
 * slider's quarter steps.
 */
const eulerTangentSlider: Generator<Ivp> = {
  id: 'numer-euler-tangent-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const ivp = sampleAny(rng, difficulty, [1], difficulty > 1 ? [0.25, 0.5] : [0.5]);
      const run = eulerRun(ivp);
      const on = run.ys[1] / SLIDER_STEP;
      if (Math.abs(on - Math.round(on)) > 1e-9 || Math.abs(run.gs[0]) > 8 || run.gs[0] === 0) continue;
      return ivp;
    }
  },
  render: (ivp): Slide => {
    const { x0, y0, h } = ivp;
    const run = eulerRun(ivp);
    const [g] = run.gs;
    const tangent = (x: number) => y0 + g * (x - x0);
    const xMin = x0 - h / 2;
    const xMax = x0 + 1.5 * h;
    const curve = clamped(windowCurve(ivp, xMin, xMax), 200);
    const seen = Array.from({ length: 41 }, (_, i) => xMin + ((xMax - xMin) * i) / 40).flatMap((x) => [curve(x), tangent(x)]);
    const lo = Math.floor(Math.min(...seen)) - 1;
    const hi = Math.ceil(Math.max(...seen)) + 1;
    return {
      kind: 'slider',
      prompt: [
        say(
          `${ivpText(ivp)}. The curve is the solution; the accent line is its tangent at $(${fmt(x0)}, ${fmt(y0)})$. Slide the level to the height the tangent reaches at $x = ${fmt(run.xs[1])}$: Euler's $y_1$ with $h = ${fmt(h)}$.`,
        ),
      ],
      min: lo,
      max: hi,
      step: SLIDER_STEP,
      answer: run.ys[1],
      readout: 'y_1 = {v}',
      figure: {
        svg: plotSvg({
          xMin,
          xMax,
          yMin: lo,
          yMax: hi,
          curves: [{ f: curve }, { f: tangent, accent: true }],
          verticals: [{ x: x0, dashed: true }, { x: run.xs[1], dashed: true }],
          marks: [{ x: x0, y: y0 }],
          label: `The solution curve through (${fmt(x0)}, ${fmt(y0)}) and its tangent there, running on to x = ${fmt(run.xs[1])}`,
        }),
        ...markerWindow(lo, hi, 'y'),
        axis: 'y',
      },
    };
  },
  solution: (ivp) => [
    { text: 'The tangent has the gradient $\\frac{dy}{dx}$ gives at the start. Over a step of $h$ it rises $h$ times that:' },
    ...stepLines(ivp, eulerRun(ivp), 0),
    { text: 'The curve itself ends somewhere else: the step follows the tangent, not the curve.' },
  ],
};

/** The four points a step might be said to reach, or none when two coincide. */
function pointOptions(ivp: Ivp): ChoiceOption[] | undefined {
  const { rhs, h, n } = ivp;
  const run = eulerRun(ivp);
  const k = n - 1;
  const [xn, yk, g] = [run.xs[n], run.ys[k], run.gs[k]];
  const heights = [
    run.ys[n],
    clean(yk + g),
    clean(yk + h * rhsAt(rhs, xn, yk)),
    n > 1 ? clean(ivp.y0 + n * h * run.gs[0]) : clean(h * g),
  ];
  if (new Set(heights).size < 4 || !heights.every((v) => terminates(v))) return undefined;
  return heights.map((y, i) => ({ tex: `(${fmt(xn)}, ${fmt(y)})`, correct: i === 0 }));
}

/**
 * Where a step lands: the right one beside forgetting h, taking the gradient
 * at the far end, and (first step) forgetting y_0 or (second) holding the
 * first gradient.
 */
const eulerPointChoice: Generator<Ivp> = {
  id: 'numer-euler-point-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const ivp = sampleAny(rng, difficulty, [difficulty > 1 ? 2 : 1]);
      if (pointOptions(ivp)) return ivp;
    }
  },
  render: (ivp): Slide =>
    choiceSlide(
      [
        say(
          `${ivpText(ivp)}. Euler's method runs with $h = ${fmt(ivp.h)}$. Where does ${ivp.n > 1 ? 'the second step' : 'the first step'} land?`,
        ),
      ],
      pointOptions(ivp)!,
    ),
  solution: (ivp) => {
    const run = eulerRun(ivp);
    return [
      { text: 'Each step moves $h$ across and $h$ times the gradient at its start up.' },
      ...run.gs.flatMap((_, i) => stepLines(ivp, run, i)),
      { text: `So the step lands at $(${fmt(run.xs[ivp.n])}, ${fmt(run.ys[ivp.n])})$.` },
    ];
  },
};

/** One step's estimate, typed, with h left to be read off the two x values. */
const eulerFirstValue: Generator<Ivp> = {
  id: 'numer-euler-first-value',
  sample: (rng, difficulty) => sampleAny(rng, difficulty, [1]),
  render: (ivp): Slide => {
    const run = eulerRun(ivp);
    return {
      kind: 'expression',
      prompt: [say(`${ivpText(ivp)}. Use a single step of Euler's method to estimate $y$ when $x = ${fmt(run.xs[1])}$.`)],
      lead: `y(${fmt(run.xs[1])}) \\approx`,
      keypad: [],
      answer: fmt(run.ys[1]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (ivp) => [
    { text: `One step from $x = ${fmt(ivp.x0)}$ to $x = ${fmt(ivp.x0 + ivp.h)}$ is $h = ${fmt(ivp.h)}$.` },
    ...stepLines(ivp, eulerRun(ivp), 0),
  ],
};

/* ---------- Level 5, lesson 2: stepping on ---------- */

/**
 * The table as it is written on paper: n, x_n, y_n and the gradient, each
 * row's gradient then the next y from a bank. `numer-euler-table` has f in x
 * alone; `numer-euler-ytable` (lesson 3) has y in it.
 */
function eulerTableSlide(ivp: Ivp): Slide {
  const { rhs, h, n, y0 } = ivp;
  const run = eulerRun(ivp);
  const rows = run.xs.map((x, i) => [String(i), fmt(x), i === 0 ? fmt(y0) : null, i < n ? null : '']);
  const answer = run.xs.flatMap((_, i) => [...(i > 0 ? [run.ys[i]] : []), ...(i < n ? [run.gs[i]] : [])]).map(fmt);
  const slips = [
    clean(y0 + n * h * run.gs[0]),
    clean(y0 + run.gs[0]),
    clean(run.ys[1] + run.gs[1]),
    clean(run.ys[n] + h),
    clean(run.ys[n] - h * run.gs[n - 1]),
  ];
  return {
    kind: 'table',
    prompt: [
      say(
        `${ivpText(ivp)}. Fill in the table by Euler's method with $h = ${fmt(h)}$: each row's gradient $${gradName(rhs, 'x_n', 'y_n')}$, then the next row's $y$.`,
      ),
    ],
    columns: ['n', 'x_n', 'y_n', gradName(rhs, 'x_n', 'y_n')],
    rows,
    bank: numberBank(answer, slips.map(fmt), around([run.ys[n]], h)),
    answer,
  };
}

const eulerTable: Generator<Ivp> = {
  id: 'numer-euler-table',
  sample: (rng, difficulty) => sampleXOnly(rng, difficulty, [difficulty > 1 ? 4 : 3]),
  render: eulerTableSlide,
  solution: runSolution,
};

interface ChainParams extends Ivp {
  /** Both steps on one line (f in x alone), rather than the second from a given y_1. */
  both: boolean;
}

/**
 * A step worked along a line. Difficulty 1 is the second step from a given
 * y_1. Difficulty 2 is two steps at once for an equation in x alone, where
 * y_2 = y_0 + h f(x_0) + h f(x_1), so the gradients can be found first.
 */
const eulerChainSteps: Generator<ChainParams> = {
  id: 'numer-euler-chain-steps',
  sample: (rng, difficulty) =>
    difficulty > 1 ? { ...sampleXOnly(rng, 2, [2]), both: true } : { ...sampleAny(rng, 1, [2]), both: false },
  render: (params): Slide => {
    const { rhs, h, y0, both } = params;
    const run = eulerRun(params);
    const [x0, x1] = run.xs;
    const [g0, g1] = run.gs;
    const [, y1, y2] = run.ys;
    const H = fmt(h);
    const bank = (value: number, ...slips: number[]) => stepBank(fmt(value), ...slips.map(fmt));
    if (!both) {
      return {
        kind: 'steps',
        prompt: [
          say(
            `${ivpText(params)}. With $h = ${H}$, the first step of Euler's method reached $y_1 = ${fmt(y1)}$ at $x_1 = ${fmt(x1)}$. Work out $y_2$: tap the part you would work out next, then choose what it comes to.`,
          ),
        ],
        start: [fmt(y1), '+', H, '\\times', gradName(rhs, fmt(x1), fmt(y1))],
        reductions: [
          { span: [4, 5], value: fmt(g1), bank: bank(g1, g0, rhsAt(rhs, x1, y0), g1 + 1) },
          { span: [2, 5], operator: 3, value: fmt(clean(h * g1)), bank: bank(clean(h * g1), g1, clean(g1 + h), clean(2 * h * g1)) },
          { span: [0, 3], operator: 1, value: fmt(y2), bank: bank(y2, clean(y1 + g1), clean(y1 + h * g0), clean(y2 + h)) },
        ],
      };
    }
    return {
      kind: 'steps',
      prompt: [
        say(
          `${ivpText(params)}. The gradient does not depend on $y$, so two steps of Euler's method with $h = ${H}$ are one line. Work out $y_2$: tap the part you would work out next, then choose what it comes to.`,
        ),
      ],
      start: [fmt(y0), '+', H, '\\times', `f(${fmt(x0)})`, '+', H, '\\times', `f(${fmt(x1)})`],
      reductions: [
        { span: [4, 5], value: fmt(g0), bank: bank(g0, g1, g0 + 1, rhsAt(rhs, x0 + 1, 0)) },
        { span: [8, 9], value: fmt(g1), bank: bank(g1, g0, g1 + 1, rhsAt(rhs, run.xs[2], 0)) },
        { span: [2, 5], operator: 3, value: fmt(clean(h * g0)), bank: bank(clean(h * g0), g0, clean(g0 + h), clean(2 * h * g0)) },
        { span: [4, 7], operator: 5, value: fmt(clean(h * g1)), bank: bank(clean(h * g1), g1, clean(g1 + h), clean(2 * h * g1)) },
        { span: [0, 3], operator: 1, value: fmt(y1), bank: bank(y1, clean(y0 + g0), clean(y1 + h), clean(y1 - 2 * h * g0)) },
        { span: [0, 3], operator: 1, value: fmt(y2), bank: bank(y2, clean(y0 + 2 * h * g0), clean(y2 + h), clean(y1 + g1)) },
      ],
    };
  },
  solution: (params) => {
    const run = eulerRun(params);
    return params.both
      ? [
          { text: `The gradient depends on $x$ alone, so each step adds $h$ times $f$ at the step's start, whatever $y$ has reached.` },
          ...stepLines(params, run, 0),
          ...stepLines(params, run, 1),
        ]
      : [{ text: 'The second step takes its gradient at the point the first one reached.' }, ...stepLines(params, run, 1)];
  },
};

/** An estimate several steps along, typed; the number of steps is left to count. */
const eulerReachValue: Generator<Ivp> = {
  id: 'numer-euler-reach-value',
  sample: (rng, difficulty) => sampleXOnly(rng, difficulty, difficulty > 1 ? [3, 4] : [2, 3]),
  render: (ivp): Slide => {
    const run = eulerRun(ivp);
    const X = fmt(run.xs[ivp.n]);
    return {
      kind: 'expression',
      prompt: [say(`${ivpText(ivp)}. Use Euler's method with $h = ${fmt(ivp.h)}$ to estimate $y$ when $x = ${X}$.`)],
      lead: `y(${X}) \\approx`,
      keypad: [],
      answer: fmt(run.ys[ivp.n]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (ivp) => [
    { text: `From $x = ${fmt(ivp.x0)}$ to $x = ${fmt(eulerRun(ivp).xs[ivp.n])}$ in steps of $${fmt(ivp.h)}$ is $${ivp.n}$ steps.` },
    ...runSolution(ivp),
  ],
};

/** The three branches of the count flow's last fork, or none when two agree. */
function countValues(ivp: Ivp): number[] | undefined {
  const { rhs, h, n } = ivp;
  const run = eulerRun(ivp);
  const [V, g] = [run.ys[n - 1], run.gs[n - 1]];
  const values = [run.ys[n], clean(V + g), clean(V + h * rhsAt(rhs, run.xs[n], V))];
  return new Set(values).size === 3 && values.every((v) => terminates(v)) ? values : undefined;
}

/**
 * Reading y at a given x: how many steps reach it, where the last one takes
 * its gradient, and the value it lands on, from a stated second-to-last row.
 */
const eulerCountFlow: Generator<Ivp> = {
  id: 'numer-euler-count-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const ivp = sampleAny(rng, difficulty, difficulty > 1 ? [4] : [3, 4]);
      if (countValues(ivp)) return ivp;
    }
  },
  render: (ivp): Slide => {
    const { h, n, x0 } = ivp;
    const run = eulerRun(ivp);
    const X = fmt(run.xs[n]);
    const V = fmt(run.ys[n - 1]);
    const key = ivpKey(ivp);
    const values = countValues(ivp)!.map(fmt);
    const last = [`At $x = ${fmt(run.xs[n - 1])}$`, `At $x = ${X}$`, `At $x = ${fmt(x0)}$`];
    return {
      kind: 'flow',
      prompt: [
        say(
          `${ivpText(ivp)}. Euler's method with $h = ${fmt(h)}$ is to estimate $y$ at $x = ${X}$, and its working has reached $y = ${V}$ one step short of there.`,
        ),
      ],
      subject: `\\begin{gathered} ${odeTex(ivp.rhs)} \\\\ y(${fmt(x0)}) = ${fmt(ivp.y0)} \\end{gathered}`,
      steps: [
        {
          id: 'count',
          ask: `How many steps of $${fmt(h)}$ take $x$ from $${fmt(x0)}$ to $${X}$?`,
          branches: turned([n, n + 1, n - 1].map(String), key).map((label) => ({ label, to: 'last' })),
        },
        {
          id: 'last',
          ask: `The last step starts from $y = ${V}$. Where is its gradient worked out?`,
          branches: turned(last, key).map((label) => ({ label, to: 'value' })),
        },
        {
          id: 'value',
          ask: `So Euler's estimate of $y(${X})$ is`,
          branches: turned(
            [
              { label: `$${values[0]}$`, outcome: `That is the last row of the table: $y_${n}$.` },
              { label: `$${values[1]}$`, outcome: 'That adds the whole gradient, as if the step were 1 wide.' },
              { label: `$${values[2]}$`, outcome: 'That takes the gradient at the end of the step instead of its start.' },
            ],
            key,
          ),
        },
      ],
      answer: [String(n), last[0], `$${values[0]}$`],
    };
  },
  solution: (ivp) => {
    const run = eulerRun(ivp);
    const n = ivp.n;
    return [
      { text: `$\\frac{${fmt(run.xs[n])} - ${fmt(ivp.x0)}}{${fmt(ivp.h)}} = ${n}$ steps, so the estimate is $y_${n}$.` },
      { text: `The last step starts at $x_${n - 1} = ${fmt(run.xs[n - 1])}$, where $y_${n - 1} = ${fmt(run.ys[n - 1])}$, and takes its gradient there:` },
      ...stepLines(ivp, run, n - 1),
    ];
  },
};

/* ---------- Level 5, lesson 3: when f has y in it ---------- */

const eulerYTable: Generator<Ivp> = {
  id: 'numer-euler-ytable',
  sample: (rng, difficulty) => sampleWithY(rng, difficulty, [3]),
  render: eulerTableSlide,
  solution: runSolution,
};

/** Two steps as a tree, the second gradient fed by the new y. */
const eulerYTree: Generator<Ivp> = {
  id: 'numer-euler-y-tree',
  sample: (rng, difficulty) => sampleWithY(rng, difficulty, [2]),
  render: (ivp): Slide => {
    const { rhs, x0, y0, h } = ivp;
    const run = eulerRun(ivp);
    const [g0, g1] = run.gs;
    const [, y1, y2] = run.ys;
    const answer = [g0, y1, g1, y2].map(fmt);
    const stale = rhsAt(rhs, run.xs[1], y0);
    const slips = [clean(y0 + 2 * h * g0), stale, clean(y1 + h * stale), rhsAt(rhs, x0, y1), clean(y1 + g1)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${ivpText(ivp)}. Two steps of Euler's method with $h = ${fmt(h)}$. Top: the gradient $f(x_0, y_0)$; then $y_1$; then the gradient $f(x_1, y_1)$ at the point reached; last, $y_2$.`,
        ),
      ],
      expression: 'y_2 = y_1 + h\\,f(x_1, y_1)',
      nodes: [
        { id: 'g0', from: [] },
        { id: 'y1', from: ['g0'] },
        { id: 'g1', from: ['y1'] },
        { id: 'y2', from: ['g1'] },
      ],
      bank: numberBank(answer, slips.map(fmt), around([y2], h)),
      answer,
    };
  },
  solution: (ivp) => {
    const run = eulerRun(ivp);
    return [
      ...stepLines(ivp, run, 0),
      { text: `The gradient has $y$ in it, so it is worked out again at $(${fmt(run.xs[1])}, ${fmt(run.ys[1])})$:` },
      ...stepLines(ivp, run, 1),
    ];
  },
};

/** The four ways to take the second gradient: from (x_1, y_1), and the three slips. */
function frozenOptions(ivp: Ivp): ChoiceOption[] | undefined {
  const { rhs, h, x0, y0 } = ivp;
  const run = eulerRun(ivp);
  const [x1, y1] = [run.xs[1], run.ys[1]];
  const points: [number, number][] = [
    [x1, y1],
    [x1, y0],
    [x0, y0],
    [x0, y1],
  ];
  const values = points.map(([x, y]) => clean(y1 + h * rhsAt(rhs, x, y)));
  if (new Set(values).size < 4 || !values.every((v) => terminates(v))) return undefined;
  return points.map(([x, y], i) => ({
    tex: `${fmt(y1)} + ${fmt(h)}\\,f(${fmt(x)}, ${fmt(y)}) = ${fmt(values[i])}`,
    correct: i === 0,
  }));
}

/** Which line gives y_2: the new point, or a gradient held over from the start. */
const eulerFrozenChoice: Generator<Ivp> = {
  id: 'numer-euler-frozen-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const ivp = sampleWithY(rng, difficulty, [2]);
      if (frozenOptions(ivp)) return ivp;
    }
  },
  render: (ivp): Slide => {
    const run = eulerRun(ivp);
    return choiceSlide(
      [
        say(
          `${ivpText(ivp)}. Euler's method with $h = ${fmt(ivp.h)}$ gives $y_1 = ${fmt(run.ys[1])}$ at $x_1 = ${fmt(run.xs[1])}$. Which line gives $y_2$?`,
        ),
      ],
      frozenOptions(ivp)!,
    );
  },
  solution: (ivp) => {
    const run = eulerRun(ivp);
    return [
      { text: 'The second step starts where the first one landed, so its gradient uses both new values, $x_1$ and $y_1$:' },
      ...stepLines(ivp, run, 1),
      { text: 'Keeping $x_0$ or $y_0$ carries part of the first gradient into a step that starts somewhere else.' },
    ];
  },
};

/** The flow's three values for y_2, or none when two agree. */
function slipValues(ivp: Ivp): number[] | undefined {
  const { rhs, h, y0 } = ivp;
  const run = eulerRun(ivp);
  const [g0, g1] = run.gs;
  const y1 = run.ys[1];
  const third = hasY(rhs) ? clean(y1 + h * rhsAt(rhs, run.xs[1], y0)) : clean(y0 + h * g1);
  const values = [run.ys[2], clean(y1 + h * g0), third];
  return new Set(values).size === 3 && values.every((v) => terminates(v)) ? values : undefined;
}

/**
 * Whether y matters, where the second gradient is found, and y_2. For f in x
 * alone the middle question is skipped: the gradient at x_1 is the same
 * whatever y has reached.
 */
const eulerSlipFlow: Generator<Ivp> = {
  id: 'numer-euler-slip-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const ivp = sampleAny(rng, difficulty, [2]);
      if (slipValues(ivp)) return ivp;
    }
  },
  render: (ivp): Slide => {
    const { rhs, x0, y0, h } = ivp;
    const run = eulerRun(ivp);
    const [x1, y1] = [fmt(run.xs[1]), fmt(run.ys[1])];
    const key = ivpKey(ivp);
    const values = slipValues(ivp)!.map((v) => `$${fmt(v)}$`);
    const where = [
      `$(${x1}, ${y1})$, where the first step landed`,
      `$(${x1}, ${fmt(y0)})$, keeping the starting $y$`,
      `$(${fmt(x0)}, ${fmt(y0)})$, the same as the first step`,
    ];
    return {
      kind: 'flow',
      prompt: [
        say(`${ivpText(ivp)}. Euler's method with $h = ${fmt(h)}$ gives $y_1 = ${y1}$ at $x_1 = ${x1}$. The second step needs its own gradient.`),
      ],
      subject: odeTex(rhs),
      steps: [
        {
          id: 'depends',
          ask: 'With $x$ held fixed, does the gradient change when $y$ changes?',
          branches: [
            { label: 'Yes', to: 'where' },
            { label: 'No', to: 'value' },
          ],
        },
        {
          id: 'where',
          ask: "So the second step's gradient is worked out at",
          branches: turned(
            [
              { label: where[0], to: 'value' },
              { label: where[1], outcome: 'Then the gradient ignores how far the first step climbed.' },
              { label: where[2], outcome: 'Then the second step runs on along the first tangent.' },
            ],
            key,
          ),
        },
        {
          id: 'value',
          ask: 'So $y_2$ is',
          branches: turned(
            [
              { label: values[0], outcome: "That is Euler's second step." },
              { label: values[1], outcome: 'That holds the first gradient for both steps.' },
              {
                label: values[2],
                outcome: hasY(rhs) ? 'That finds the gradient with the old $y$.' : 'That adds the second gradient to $y_0$ instead of to $y_1$.',
              },
            ],
            key,
          ),
        },
      ],
      answer: hasY(rhs) ? ['Yes', where[0], values[0]] : ['No', values[0]],
    };
  },
  solution: (ivp) => {
    const run = eulerRun(ivp);
    return [
      {
        text: hasY(ivp.rhs)
          ? `$${rhsTex(ivp.rhs)}$ has $y$ in it, so the gradient is found again at the new point $(${fmt(run.xs[1])}, ${fmt(run.ys[1])})$.`
          : `$${rhsTex(ivp.rhs)}$ has no $y$ in it, so only the new $x$ matters.`,
      },
      ...stepLines(ivp, run, 1),
    ];
  },
};

/** Two or three steps with y in f, typed. Euler's value, never the true y. */
const eulerYValue: Generator<Ivp> = {
  id: 'numer-euler-y-value',
  sample: (rng, difficulty) => sampleWithY(rng, difficulty, [difficulty > 1 ? 3 : 2]),
  render: (ivp): Slide => {
    const run = eulerRun(ivp);
    const X = fmt(run.xs[ivp.n]);
    return {
      kind: 'expression',
      prompt: [say(`${ivpText(ivp)}. Use Euler's method with $h = ${fmt(ivp.h)}$ to estimate $y$ when $x = ${X}$.`)],
      lead: `y(${X}) \\approx`,
      keypad: [],
      answer: fmt(run.ys[ivp.n]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: runSolution,
};

/* ---------- Level 5, lesson 4: against the exact answer ---------- */

/** The exact working for an equation in x alone: integrate, then y(X). */
function exactLines(ivp: Ivp, X: number): SolutionStep[] {
  const F = antiderivative(ivp.rhs.px).map(clean);
  const [FX, F0] = [valueAt(F, X), valueAt(F, ivp.x0)].map(clean);
  return [
    { text: `Integrating: $y = ${antiTexOf(ivp.rhs.px)} + c$, with $c$ fixed by $y = ${fmt(ivp.y0)}$ at $x = ${fmt(ivp.x0)}$ (Differential Equations Basics, A Particular Solution).` },
    { tex: aligned(`y(${fmt(X)}) &= ${fmt(ivp.y0)} + ${paren(FX)}`, `&\\quad - ${paren(F0)}`, `&= ${fmt(exactY(ivp, X))}`) },
  ];
}

/** The error in the last estimate: estimate minus true value, as level 3 has it. */
function eulerError(ivp: Ivp) {
  const run = eulerRun(ivp);
  const X = run.xs[ivp.n];
  const estimate = run.ys[ivp.n];
  const exact = exactY(ivp, X);
  return { run, X, estimate, exact, error: clean(estimate - exact) };
}

function errorSolution(ivp: Ivp): SolutionStep[] {
  const { X, estimate, exact, error } = eulerError(ivp);
  return [
    ...runSolution(ivp),
    ...exactLines(ivp, X),
    { tex: errorTex(estimate, exact, error) },
    { text: error < 0 ? 'Negative: the estimate is too low.' : 'Positive: the estimate is too high.' },
  ];
}

/** Euler's values down one side, the true y on the other, the error where they meet. */
const eulerErrorTree: Generator<Ivp> = {
  id: 'numer-euler-error-tree',
  sample: (rng, difficulty) => sampleXOnly(rng, difficulty, [difficulty > 1 ? 3 : 2]),
  render: (ivp): Slide => {
    const { run, X, estimate, exact, error } = eulerError(ivp);
    const n = ivp.n;
    const ys = run.ys.slice(1);
    const answer = [...ys, exact, error].map(fmt);
    const slips = [clean(-error), clean(exact + ivp.h), clean(ivp.y0 + n * ivp.h * run.gs[0]), clean(estimate + error)];
    const names = ys.map((_, i) => `y_${i + 1}`);
    return {
      kind: 'tree',
      prompt: [
        say(
          `${ivpText(ivp)}. Down the left, Euler's ${names.map((name) => `$${name}$`).join(', ')} with $h = ${fmt(ivp.h)}$. Beside them the true $y(${fmt(X)})$, from integrating. Last, the error: the estimate minus the true value.`,
        ),
      ],
      expression: `\\text{error} = y_${n} - y(${fmt(X)})`,
      nodes: [
        ...ys.map((_, i) => ({ id: `y${i + 1}`, from: i === 0 ? [] : [`y${i}`] })),
        { id: 'exact', from: [] },
        { id: 'error', from: [`y${n}`, 'exact'] },
      ],
      bank: numberBank(answer, slips.map(fmt), around([exact, error], ivp.h)),
      answer,
    };
  },
  solution: errorSolution,
};

/** The error after n steps, typed. */
const eulerErrorValue: Generator<Ivp> = {
  id: 'numer-euler-error-value',
  sample: (rng, difficulty) => sampleXOnly(rng, difficulty, difficulty > 1 ? [3, 4] : [2, 3, 4]),
  render: (ivp): Slide => {
    const { X, error } = eulerError(ivp);
    return {
      kind: 'expression',
      prompt: [
        say(
          `${ivpText(ivp)}. Euler's method with $h = ${fmt(ivp.h)}$ estimates $y$ at $x = ${fmt(X)}$. Solve the equation exactly and find the error in that estimate: the estimate minus the true value.`,
        ),
      ],
      lead: '\\text{error} =',
      keypad: [],
      answer: fmt(error),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: errorSolution,
};

/** Whether the gradient f rises across the steps, or undefined if it turns. */
function gradientRises({ rhs, x0, h, n }: Ivp): boolean | undefined {
  const df = derivative(rhs.px);
  const ends = [valueAt(df, x0), valueAt(df, x0 + n * h)];
  if (ends.some((v) => Math.abs(v) < 1e-9) || Math.sign(ends[0]) !== Math.sign(ends[1])) return undefined;
  return ends[0] > 0;
}

/** An equation in x alone whose gradient only rises or only falls over the steps. */
function sampleMonotone(rng: Rng, difficulty: number, steps: number[], hs?: number[]): Ivp {
  for (;;) {
    const ivp = sampleXOnly(rng, difficulty, steps, hs);
    if (gradientRises(ivp) !== undefined) return ivp;
  }
}

const RISES = 'It rises';
const FALLS = 'It falls';
const BELOW = 'Below the curve';
const ABOVE = 'Above the curve';

/**
 * Which way Euler misses: a rising gradient bends the curve up, tangents sit
 * under it, and the estimate is low. Difficulty 2 has a quadratic f, so the
 * gradient's own slope has to be checked at both ends.
 */
const eulerMissFlow: Generator<Ivp> = {
  id: 'numer-euler-miss-flow',
  sample: (rng, difficulty) => sampleMonotone(rng, difficulty, [2, 3, 4]),
  render: (ivp): Slide => {
    const X = fmt(ivp.x0 + ivp.n * ivp.h);
    const rises = gradientRises(ivp)!;
    return {
      kind: 'flow',
      prompt: [say(`${ivpText(ivp)}. Euler's method with $h = ${fmt(ivp.h)}$ estimates $y$ at $x = ${X}$.`)],
      subject: `\\begin{gathered} ${odeTex(ivp.rhs)} \\\\ ${fmt(ivp.x0)} \\le x \\le ${X} \\end{gathered}`,
      steps: [
        {
          id: 'gradient',
          ask: `As $x$ runs from $${fmt(ivp.x0)}$ to $${X}$, does the gradient $\\frac{dy}{dx}$ rise or fall?`,
          branches: [
            { label: RISES, to: 'tangent' },
            { label: FALLS, to: 'tangent' },
          ],
        },
        {
          id: 'tangent',
          ask: 'So a tangent step, starting on the curve, ends',
          branches: [
            { label: BELOW, to: 'verdict' },
            { label: ABOVE, to: 'verdict' },
          ],
        },
        {
          id: 'verdict',
          ask: `So Euler's estimate of $y(${X})$ is`,
          branches: [
            { label: UNDER, outcome: 'Too low: the error, estimate minus true value, is negative.' },
            { label: OVER, outcome: 'Too high: the error, estimate minus true value, is positive.' },
          ],
        },
      ],
      answer: rises ? [RISES, BELOW, UNDER] : [FALLS, ABOVE, OVER],
    };
  },
  solution: (ivp) => {
    const rises = gradientRises(ivp)!;
    const df = derivative(ivp.rhs.px);
    const X = ivp.x0 + ivp.n * ivp.h;
    return [
      {
        text: `The gradient $${rhsTex(ivp.rhs)}$ has slope $${rhsTex({ px: df, q: 0, r: 0 })}$, which is $${fmt(valueAt(df, ivp.x0))}$ at $x = ${fmt(ivp.x0)}$ and $${fmt(valueAt(df, X))}$ at $x = ${fmt(X)}$: ${rises ? 'positive throughout, so the gradient rises' : 'negative throughout, so the gradient falls'}.`,
      },
      {
        text: rises
          ? 'The curve bends upward, so each tangent runs below it and every step comes up short: an underestimate.'
          : 'The curve bends downward, so each tangent runs above it and every step overshoots: an overestimate.',
      },
      { tex: aligned(`y_${ivp.n} &= ${fmt(eulerError(ivp).estimate)}`, `y(${fmt(X)}) &= ${fmt(eulerError(ivp).exact)}`) },
    ];
  },
};

/** The four verdicts: too high or too low, for either reason. */
const MISS_LABELS = [
  'Too low, as the curve bends upward',
  'Too high, as the curve bends upward',
  'Too low, as the curve bends downward',
  'Too high, as the curve bends downward',
];

/** The solution curve drawn, and which way Euler will miss read off its bend. */
const eulerMissChoice: Generator<Ivp> = {
  id: 'numer-euler-miss-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const ivp = sampleMonotone(rng, difficulty, [2, 4], [0.5]);
      // A bend worth seeing: the gradient changes by a good share of its size.
      const ends = [ivp.x0, ivp.x0 + ivp.n * ivp.h].map((x) => valueAt(ivp.rhs.px, x));
      if (Math.abs(ends[1] - ends[0]) >= 0.6 * Math.max(...ends.map(Math.abs))) return ivp;
    }
  },
  render: (ivp): Slide => {
    const X = ivp.x0 + ivp.n * ivp.h;
    const right = gradientRises(ivp) ? 0 : 3;
    const curve = solutionCurve(ivp);
    const seen = Array.from({ length: 41 }, (_, i) => curve(ivp.x0 + ((X - ivp.x0) * i) / 40));
    const [lo, hi] = [Math.min(...seen), Math.max(...seen)];
    const pad = (hi - lo) * 0.1;
    return keyedChoice(
      [
        say(
          `The curve is the solution of ${ivpText(ivp)}. Euler's method with $h = ${fmt(ivp.h)}$ starts at the dot and estimates $y$ at $x = ${fmt(X)}$. How will its estimate compare with the true value?`,
        ),
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: ivp.x0,
            xMax: X,
            yMin: lo - pad,
            yMax: hi + pad,
            curves: [{ f: curve }],
            marks: [{ x: ivp.x0, y: ivp.y0 }],
            label: `The solution curve from x = ${fmt(ivp.x0)} to x = ${fmt(X)}, starting at the dot`,
          }),
        },
      ],
      MISS_LABELS.map((tex, i) => ({ tex, correct: i === right })),
      ivpKey(ivp),
      false,
    );
  },
  solution: (ivp) => {
    const { estimate, exact, X } = eulerError(ivp);
    const rises = gradientRises(ivp)!;
    return [
      {
        text: rises
          ? 'The curve bends upward: it gets steeper as $x$ grows. A tangent leaves it with the gradient at its start and falls behind, so every step lands low.'
          : 'The curve bends downward: its gradient falls as $x$ grows. A tangent keeps the steeper gradient at its start and overshoots, so every step lands high.',
      },
      { tex: aligned(`y_${ivp.n} &= ${fmt(estimate)}`, `y(${fmt(X)}) &= ${fmt(exact)}`) },
    ];
  },
};

interface ExactStepsParams extends Ivp {
  /** Difficulty 1 writes F out; 2 leaves the integrating to the learner. */
  given: boolean;
}

/**
 * The error worked along a line: F at both ends, the integral, the true y,
 * then the estimate less it. Only draws where F at each end is exact too.
 */
const eulerExactSteps: Generator<ExactStepsParams> = {
  id: 'numer-euler-exact-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const ivp = sampleXOnly(rng, difficulty, [2, 3]);
      const F = antiderivative(ivp.rhs.px);
      const X = ivp.x0 + ivp.n * ivp.h;
      if ([valueAt(F, X), valueAt(F, ivp.x0)].every((v) => terminates(clean(v)))) return { ...ivp, given: difficulty === 1 };
    }
  },
  render: (params): Slide => {
    const { estimate, exact, error, X } = eulerError(params);
    const F = antiderivative(params.rhs.px).map(clean);
    const [FX, F0] = [valueAt(F, X), valueAt(F, params.x0)].map(clean);
    const I = clean(FX - F0);
    const x = fmt(X);
    const x0 = fmt(params.x0);
    const y0 = params.y0;
    const bank = (value: number, ...slips: number[]) => stepBank(fmt(value), ...slips.map(fmt));
    const where = params.given
      ? `with $F(x) = ${antiTexOf(params.rhs.px)}$`
      : `where $F$ is the antiderivative of $${rhsTex(params.rhs)}$ with no constant`;
    return {
      kind: 'steps',
      prompt: [
        say(
          `${ivpText(params)}. Euler's method with $h = ${fmt(params.h)}$ estimates $y(${x}) \\approx ${fmt(estimate)}$. The true value is $F(${x}) - F(${x0}) + ${paren(y0)}$, ${where}. Work out the error, the estimate minus the true value: tap the part you would work out next, then choose what it comes to.`,
        ),
      ],
      start: [fmt(estimate), '-', '(', `F(${x})`, '-', `F(${x0})`, '+', paren(y0), ')'],
      reductions: [
        { span: [3, 4], value: fmt(FX), bank: bank(FX, valueAt(params.rhs.px, X), clean(FX + 1), clean(-FX)) },
        { span: [5, 6], value: fmt(F0), bank: bank(F0, valueAt(params.rhs.px, params.x0), clean(F0 + 1), clean(F0 - 1)) },
        { span: [3, 6], operator: 4, value: fmt(I), bank: bank(I, clean(FX + F0), clean(F0 - FX), clean(I + 1)) },
        { span: [2, 7], operator: 4, value: fmt(exact), bank: bank(exact, clean(I - y0), I, clean(exact + 1)) },
        { span: [0, 3], operator: 1, value: fmt(error), bank: bank(error, clean(-error), clean(estimate + exact), clean(error - 1)) },
      ],
    };
  },
  solution: (params) => {
    const { X, estimate, exact, error } = eulerError(params);
    return [
      ...exactLines(params, X),
      { tex: errorTex(estimate, exact, error) },
    ];
  },
};

/* ---------- Level 5, lesson 5: step size against error ---------- */

/** The same journey with h and h/2: estimates, true value, errors. */
function halving(ivp: Ivp) {
  const coarse = eulerError(ivp);
  const fine = eulerError({ ...ivp, h: clean(ivp.h / 2), n: 2 * ivp.n });
  return { coarse, fine };
}

function sampleHalving(rng: Rng, difficulty: number): Ivp {
  for (;;) {
    const ivp = sampleXOnly(rng, difficulty, [2], [0.5, 0.2]);
    if (exactRun({ ...ivp, h: clean(ivp.h / 2), n: 2 * ivp.n })) return ivp;
  }
}

function halvingSolution(ivp: Ivp): SolutionStep[] {
  const { coarse, fine } = halving(ivp);
  const half = clean(ivp.h / 2);
  return [
    { text: `With $h = ${fmt(ivp.h)}$, $${ivp.n}$ steps:` },
    ...runSolution(ivp).slice(1),
    { text: `With $h = ${fmt(half)}$, $${2 * ivp.n}$ steps, the same way, reaching $${fmt(fine.estimate)}$.` },
    { text: `The errors, $h = ${fmt(ivp.h)}$ then $h = ${fmt(half)}$:` },
    { tex: errorTex(coarse.estimate, coarse.exact, coarse.error) },
    { tex: errorTex(fine.estimate, fine.exact, fine.error) },
    { text: 'Halving the step roughly halves the error.' },
  ];
}

/**
 * h and h/2 side by side: estimates and errors from a bank, with the true
 * value given. Difficulty 1 is a straight-line f, whose error halves exactly,
 * and gives the finer estimate; 2 is a quadratic and leaves both to find.
 */
const eulerHalveTable: Generator<Ivp> = {
  id: 'numer-euler-halve-table',
  sample: sampleHalving,
  render: (ivp): Slide => {
    const { coarse, fine } = halving(ivp);
    const hard = ivp.rhs.px.length > 2;
    const half = clean(ivp.h / 2);
    const answer = (hard ? [coarse.estimate, coarse.error, fine.estimate, fine.error] : [coarse.estimate, coarse.error, fine.error]).map(fmt);
    const slips = [clean(-coarse.error), clean(-fine.error), clean(2 * coarse.error), clean(coarse.error / 4), coarse.exact];
    return {
      kind: 'table',
      prompt: [
        say(
          `${ivpText(ivp)}. Its true value at $x = ${fmt(coarse.X)}$ is $${fmt(coarse.exact)}$. Fill in Euler's estimate there with each step size, and its error: the estimate minus the true value.`,
        ),
      ],
      columns: ['h', '\\text{steps}', '\\text{estimate}', '\\text{error}'],
      rows: [
        [fmt(ivp.h), String(ivp.n), null, null],
        [fmt(half), String(2 * ivp.n), hard ? null : fmt(fine.estimate), null],
      ],
      bank: numberBank(answer, slips.map(fmt), around([coarse.error, fine.error], 0.05)),
      answer,
    };
  },
  solution: halvingSolution,
};

interface NeededParams {
  x0: number;
  h: number;
  steps: number;
  error: number;
  target: number;
}

const TARGETS = [0.01, 0.02, 0.04, 0.05, 0.1, 0.2];

/** h shrinks by error/target, so the steps grow by it, rounded up. */
const neededSteps = ({ steps, error, target }: NeededParams) => Math.ceil(clean((steps * error) / target) - 1e-9);

/**
 * How many steps a target error needs, taking the error as proportional to h.
 * Difficulty 1 has a whole ratio; 2 one that leaves a fraction to round up.
 */
const eulerNeededValue: Generator<NeededParams> = {
  id: 'numer-euler-needed-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const ratio = difficulty > 1 ? rng.pick([1.5, 2.5, 3.5, 4.5, 1.25, 2.4]) : rng.int(2, 8);
      const target = rng.pick(TARGETS);
      const steps = difficulty > 1 ? rng.pick([3, 5, 7]) : rng.pick([2, 4, 5, 10]);
      const params = { x0: rng.int(0, 3), h: rng.pick([0.5, 0.25, 0.2, 0.1]), steps, error: clean(ratio * target), target };
      if (!terminates(params.error) || !terminates(params.x0 + steps * params.h)) continue;
      if (difficulty > 1 && Number.isInteger(clean(steps * ratio))) continue;
      return params;
    }
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `Euler's method with $${params.steps}$ steps of $h = ${fmt(params.h)}$, from $x = ${params.x0}$ to $x = ${fmt(clean(params.x0 + params.steps * params.h))}$, gives an estimate whose error has size $${fmt(params.error)}$. Taking the error as proportional to $h$, what is the fewest steps that brings it to $${fmt(params.target)}$ or less?`,
      ),
    ],
    lead: '\\text{steps} =',
    keypad: [],
    answer: String(neededSteps(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const ratio = clean(params.error / params.target);
    const exact = clean(params.steps * ratio);
    return [
      { text: `The error has to shrink by a factor of $\\frac{${fmt(params.error)}}{${fmt(params.target)}} = ${fmt(ratio)}$, so $h$ does too.` },
      { text: `A step that many times smaller means that many times as many steps: $${params.steps} \\times ${fmt(ratio)} = ${fmt(exact)}$.` },
      ...(Number.isInteger(exact) ? [] : [{ text: `Steps come whole, and $${Math.floor(exact)}$ would leave the error just over the target, so $${neededSteps(params)}$.` }]),
    ];
  },
};

/** The four guesses at the h/2 estimate, or none when two coincide. */
function halveOptions(ivp: Ivp): ChoiceOption[] | undefined {
  const { estimate, exact, error } = eulerError(ivp);
  const values = [exact + error / 2, exact + error / 4, exact - error / 2, estimate + error / 2].map(clean);
  if (error === 0 || new Set(values).size < 4 || !values.every((v) => terminates(v))) return undefined;
  return values.map((v, i) => ({ tex: fmt(v), correct: i === 0 }));
}

/**
 * The h/2 estimate from h's and the true value: half the error, same side.
 * Exact for a straight-line f (difficulty 1), roughly so for a quadratic.
 */
const eulerHalveChoice: Generator<Ivp> = {
  id: 'numer-euler-halve-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const ivp = sampleXOnly(rng, difficulty, [2, 3, 4]);
      if (halveOptions(ivp)) return ivp;
    }
  },
  render: (ivp): Slide => {
    const { X, estimate, exact } = eulerError(ivp);
    return choiceSlide(
      [
        say(
          `${ivpText(ivp)}. With $h = ${fmt(ivp.h)}$, Euler's method estimates $y(${fmt(X)}) \\approx ${fmt(estimate)}$; the true value is $${fmt(exact)}$. Roughly what will it give with $h = ${fmt(clean(ivp.h / 2))}$?`,
        ),
      ],
      halveOptions(ivp)!,
    );
  },
  solution: (ivp) => {
    const { estimate, exact, error } = eulerError(ivp);
    return [
      { tex: errorTex(estimate, exact, error) },
      { text: `Halving $h$ roughly halves the error, and the estimate stays on the same side of the true value, since the curve still bends the same way.` },
      { tex: aligned(`&${fmt(exact)} + \\tfrac{1}{2}(${fmt(error)})`, `&= ${fmt(clean(exact + error / 2))}`) },
    ];
  },
};

interface SizeParams {
  x0: number;
  h: number;
  steps: number;
  error: number;
  /** How many times smaller the error must get. */
  k: number;
}

const sizeOf = ({ error, k }: SizeParams) => clean(error / k);

/** By what factor, so what h, so how many steps: the error proportional to h. */
const eulerSizeFlow: Generator<SizeParams> = {
  id: 'numer-euler-size-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = {
        x0: rng.int(0, 3),
        h: rng.pick([0.5, 0.25, 0.2, 0.1]),
        steps: rng.pick([2, 4, 5]),
        error: rng.pick([0.12, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.2, 1.6, 2]),
        k: rng.pick(difficulty > 1 ? [4, 5, 8, 10] : [2, 4, 5]),
      };
      if ([clean(params.h / params.k), sizeOf(params)].every((v) => terminates(v))) return params;
    }
  },
  render: (params): Slide => {
    const { x0, h, steps, error, k } = params;
    const X = fmt(clean(x0 + steps * h));
    const key = `${x0}|${h}|${steps}|${error}|${k}`;
    const factors = [k, k * k, k + 1].map((v) => `$${v}$`);
    const hs = [h / k, h / (k * k), h * k].map((v) => `$h = ${fmt(clean(v))}$`);
    const counts = [steps * k, steps * k * k, steps].map(String);
    return {
      kind: 'flow',
      prompt: [
        say(
          `Euler's method with $${steps}$ steps of $h = ${fmt(h)}$, from $x = ${x0}$ to $x = ${X}$, has an error of size $${fmt(error)}$. It is wanted down to $${fmt(sizeOf(params))}$, with the error proportional to $h$.`,
        ),
      ],
      subject: `\\begin{aligned} h = ${fmt(h)}: \\quad \\text{error} &= ${fmt(error)} \\\\ \\text{wanted: error} &= ${fmt(sizeOf(params))} \\end{aligned}`,
      steps: [
        {
          id: 'factor',
          ask: 'The error has to shrink by what factor?',
          branches: turned(factors, key).map((label) => ({ label, to: 'h' })),
        },
        {
          id: 'h',
          ask: 'So the new step is',
          branches: turned(hs, key).map((label) => ({ label, to: 'count' })),
        },
        {
          id: 'count',
          ask: `That takes how many steps from $x = ${x0}$ to $x = ${X}$?`,
          branches: turned(
            [
              { label: counts[0], outcome: `$${k}$ times the steps for an error $${k}$ times smaller.` },
              { label: counts[1], outcome: 'That is the count if the error went with $h^{2}$.' },
              { label: counts[2], outcome: 'That is the count already taken.' },
            ],
            key,
          ),
        },
      ],
      answer: [factors[0], hs[0], counts[0]],
    };
  },
  solution: (params) => {
    const { h, steps, error, k } = params;
    return [
      { tex: `\\frac{${fmt(error)}}{${fmt(sizeOf(params))}} = ${k}` },
      { text: `The error is proportional to $h$, so $h$ shrinks by $${k}$ too: $\\frac{${fmt(h)}}{${k}} = ${fmt(clean(h / k))}$.` },
      { text: `The journey is the same length, so it takes $${k}$ times the steps: $${steps} \\times ${k} = ${steps * k}$.` },
    ];
  },
};

interface SizeSliderParams {
  h: number;
  /** The slider's step. */
  unit: number;
  error: number;
  /** The step the learner is after. */
  target: number;
}

const SIZE_ERRORS = [0.2, 0.3, 0.4, 0.6, 0.8, 1.2, 1.5, 2];

/**
 * Error against h drawn as the line through the origin and the two measured
 * points; the learner slides to the h that gives the stated error.
 */
const eulerSizeSlider: Generator<SizeSliderParams> = {
  id: 'numer-euler-size-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const h = difficulty > 1 ? rng.pick([0.5, 0.25]) : 0.5;
      const unit = difficulty > 1 ? 0.025 : 0.05;
      const target = clean(unit * rng.int(1, Math.round(h / unit) - 1));
      const params = { h, unit, error: rng.pick(SIZE_ERRORS), target };
      if (target === clean(h / 2)) continue;
      if (!terminates(clean((params.error * target) / h))) continue;
      return params;
    }
  },
  render: ({ h, unit, error, target }): Slide => {
    const wanted = clean((error * target) / h);
    const hMax = clean(h * 1.2);
    return {
      kind: 'slider',
      prompt: [
        say(
          `Euler's method on one journey gives an error of size $${fmt(error)}$ with $h = ${fmt(h)}$, and $${fmt(clean(error / 2))}$ with $h = ${fmt(clean(h / 2))}$: the error is proportional to $h$, the line on the graph. Slide to the step that brings the error down to $${fmt(wanted)}$.`,
        ),
      ],
      min: 0,
      max: hMax,
      step: unit,
      answer: target,
      readout: 'h = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: hMax,
          yMin: 0,
          yMax: error * 1.3,
          curves: [{ f: (x) => (error * x) / h, accent: true }],
          marks: [
            { x: h, y: error },
            { x: h / 2, y: error / 2 },
          ],
          horizontals: [wanted],
          label: `Error against step size: a line through the origin and the points (${fmt(h)}, ${fmt(error)}) and (${fmt(h / 2)}, ${fmt(error / 2)}), with a level at ${fmt(wanted)}`,
        }),
        ...markerWindow(0, hMax, 'x'),
        axis: 'x',
      },
    };
  },
  solution: ({ h, error, target }) => {
    const wanted = clean((error * target) / h);
    return [
      { text: `The error per unit of $h$ is $\\frac{${fmt(error)}}{${fmt(h)}} = ${fmt(clean(error / h))}$.` },
      { tex: `h = \\frac{${fmt(wanted)}}{${fmt(clean(error / h))}} = ${fmt(target)}` },
    ];
  },
};

/* ================================================================
 * Level 6: choosing a method
 * ================================================================ */

/*
 * Nothing in this level types a derivative, so no slide declares `source`,
 * `integrand` or `limits`. A midpoint, an iterate, an error, a step count or
 * a verdict is not a function of x for the oracle in generators.test.ts to
 * differentiate. Their checks live in numericalMethods.test.ts, which reads f,
 * the bracket, g and the start off each slide and runs every method itself.
 */

/** The sign of f(m) as a bisection table writes it. */
const signOf = (y: number) => (y < 0 ? '-' : '+');

interface Halving {
  a: number;
  b: number;
  m: number;
  fm: number;
}

/** Bisection written out: each row's interval, its midpoint, f there, and the interval it leaves. */
function halvings(poly: Poly, a: number, b: number, count: number): { rows: Halving[]; next: [number, number] } {
  const rows: Halving[] = [];
  let [lo, hi] = [a, b];
  for (let i = 0; i < count; i += 1) {
    const m = (lo + hi) / 2;
    const fm = valueAt(poly, m);
    rows.push({ a: lo, b: hi, m, fm });
    if (Math.sign(fm) === Math.sign(valueAt(poly, lo))) lo = m;
    else hi = m;
  }
  return { rows, next: [lo, hi] };
}

/** f(m) for a working line: exact when it is short, else to three places. */
function fmTex(fm: number): string {
  return terminates(fm) ? `= ${fmt(fm)}` : `\\approx ${fmt(Number(fm.toFixed(3)))}`;
}

function halvingLines(poly: Poly, a: number, b: number, count: number): SolutionStep[] {
  const { rows, next } = halvings(poly, a, b, count);
  return [
    ...rows.map(({ a: lo, b: hi, m, fm }, i) => {
      const [nlo, nhi] = i + 1 < rows.length ? [rows[i + 1].a, rows[i + 1].b] : next;
      return {
        text: `$m = ${fmt(m)}$, $f(${fmt(m)}) ${fmTex(fm)}$, the same sign as $f(${fmt(nlo === lo ? hi : lo)})$, so keep $[${fmt(nlo)}, ${fmt(nhi)}]$.`,
      };
    }),
  ];
}

interface BisectParams {
  /** A cubic with whole coefficients. */
  poly: Poly;
  /** The bracket is [a, a + 1]: whole ends at difficulty 1, half ends at 2. */
  a: number;
}

/**
 * A cubic with exactly one root in [a, a + 1] and a sign change across it,
 * whose midpoints through three halvings are all clear of zero. Half ends at
 * difficulty 2 keep every midpoint within three places.
 */
function sampleBracket(rng: Rng, difficulty: number): BisectParams {
  const hard = difficulty > 1;
  for (;;) {
    const poly = hard ? [1, nonZero(rng, 3), nonZero(rng, 6), nonZero(rng, 9)] : [1, 0, nonZero(rng, 8), nonZero(rng, 9)];
    const f = (x: number) => valueAt(poly, x);
    const roots = rootsIn(f, -5, 5);
    if (roots.length === 0) continue;
    const root = rng.pick(roots);
    const a = hard ? Math.floor(root - 0.5) + 0.5 : Math.floor(root);
    if (f(a) * f(a + 1) >= 0 || rootsIn(f, a, a + 1).length !== 1) continue;
    if (Math.abs(f(a)) > 40 || Math.abs(f(a + 1)) > 40) continue;
    if (halvings(poly, a, a + 1, 3).rows.some((row) => Math.abs(row.fm) < 0.01)) continue;
    return { poly, a };
  }
}

const bracketText = ({ poly, a }: BisectParams) =>
  `$f(x) = ${polyTex(poly)}$ has $f(${fmt(a)}) = ${fmt(valueAt(poly, a))}$ and $f(${fmt(a + 1)}) = ${fmt(valueAt(poly, a + 1))}$`;

/* ---------- Level 6, lesson 1: interval bisection ---------- */

/**
 * Three halvings as the table is written on paper: a, b, the midpoint m and
 * the sign of f(m), which says which half keeps the root.
 */
const bisectTable: Generator<BisectParams> = {
  id: 'numer-bisect-table',
  sample: sampleBracket,
  render: (params): Slide => {
    const { poly, a } = params;
    const { rows } = halvings(poly, a, a + 1, 3);
    const cells = rows.map((row, i) => [String(i), i === 0 ? fmt(row.a) : null, i === 0 ? fmt(row.b) : null, null, signOf(row.fm)]);
    const answer = rows.flatMap((row, i) => [...(i > 0 ? [row.a, row.b] : []), row.m]).map(fmt);
    // The other half's midpoint each time, the half-width for the midpoint, and a stray quarter.
    const slips = [
      ...rows.slice(1).map((row, i) => (row.a === rows[i].a ? rows[i].m + (rows[i].b - rows[i].m) / 2 : rows[i].a + (rows[i].m - rows[i].a) / 2)),
      0.5,
      a + 0.25,
    ].map(fmt);
    return {
      kind: 'table',
      prompt: [
        say(
          `${bracketText(params)}, so a root lies between. Bisect three times: each row's midpoint $m$, then the half whose ends still differ in sign is the next row. The last column is the sign of $f(m)$.`,
        ),
      ],
      columns: ['n', 'a', 'b', 'm', 'f(m)'],
      rows: cells,
      bank: numberBank(answer, slips, around([rows[2].m], 0.125)),
      answer,
    };
  },
  solution: ({ poly, a }) => [
    { text: `$f(${fmt(a)})$ and $f(${fmt(a + 1)})$ differ in sign, so each midpoint keeps the half whose ends still differ.` },
    ...halvingLines(poly, a, a + 1, 3),
  ],
};

/** One halving decided a step at a time: the midpoint, the half that keeps the root, the next midpoint. */
const bisectFlow: Generator<BisectParams> = {
  id: 'numer-bisect-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleBracket(rng, difficulty);
      const m = params.a + 0.5;
      if (new Set([m, 0.5, 2 * params.a + 1]).size === 3) return params;
    }
  },
  render: (params): Slide => {
    const { poly, a } = params;
    const b = a + 1;
    const { rows, next } = halvings(poly, a, b, 1);
    const { m, fm } = rows[0];
    const key = `${poly.join(',')}|${a}`;
    const [lo, hi] = next;
    const halves = [`$[${fmt(lo)}, ${fmt(hi)}]$`, `$[${fmt(lo === a ? m : a)}, ${fmt(lo === a ? b : m)}]$`, `$[${fmt(a)}, ${fmt(b)}]$`];
    const nextMid = (lo + hi) / 2;
    const otherMid = lo === a ? (m + b) / 2 : (a + m) / 2;
    return {
      kind: 'flow',
      prompt: [say(`${bracketText(params)}. Take one step of bisection, then say where the next one goes.`)],
      subject: `f(x) = ${polyTex(poly)}`,
      steps: [
        {
          id: 'mid',
          ask: `The midpoint of $[${fmt(a)}, ${fmt(b)}]$ is`,
          branches: turned([m, 0.5, 2 * a + 1].map((v) => `$${fmt(v)}$`), key).map((label) => ({ label, to: 'half' })),
        },
        {
          id: 'half',
          ask: `$f(${fmt(m)}) = ${fmt(fm)}$. The root is now in`,
          branches: turned(halves, key).map((label) => ({ label, to: 'next' })),
        },
        {
          id: 'next',
          ask: 'So the next midpoint is',
          branches: turned(
            [
              { label: `$${fmt(nextMid)}$`, outcome: 'The middle of the half that kept its sign change.' },
              { label: `$${fmt(otherMid)}$`, outcome: 'That is the middle of the half the root is not in.' },
              { label: `$${fmt(m)}$`, outcome: 'That is the midpoint already used.' },
            ],
            key,
          ),
        },
      ],
      answer: [`$${fmt(m)}$`, halves[0], `$${fmt(nextMid)}$`],
    };
  },
  solution: ({ poly, a }) => {
    const [lo, hi] = halvings(poly, a, a + 1, 1).next;
    return [
      { tex: `m = \\frac{${fmt(a)} + ${fmt(a + 1)}}{2} = ${fmt(a + 0.5)}` },
      ...halvingLines(poly, a, a + 1, 1),
      { text: `The next midpoint is the middle of that interval, $${fmt((lo + hi) / 2)}$.` },
    ];
  },
};

type HalvingsMode = 'width' | 'count' | 'mid';

interface HalvingsParams {
  mode: HalvingsMode;
  /** The starting interval's width. */
  W: number;
  /** Halvings, for `width`; the target, for the counts. */
  k: number;
  eps: number;
}

const HALVING_WIDTHS = [1, 2, 3, 4, 5, 0.5, 1.5, 2.5];
const HALVING_EPS = [0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0005];

/** The quotient a count has to pass: log2 of W over the width wanted. */
const halvingsQuotient = ({ mode, W, eps }: HalvingsParams) => Math.log2(mode === 'mid' ? W / (2 * eps) : W / eps);

/** The halvings needed, or the width after k of them. */
const halvingsAnswer = (params: HalvingsParams) =>
  params.mode === 'width' ? fmt(params.W / 2 ** params.k) : String(Math.ceil(halvingsQuotient(params)));

/**
 * The width (b - a)/2^k after k halvings, and the halvings a target needs:
 * at difficulty 1 the width itself or a width below ε, at 2 a midpoint
 * certain to be within ε, which needs half the width below ε. A count is
 * drawn again when the logarithm sits near a whole number.
 */
const bisectHalvings: Generator<HalvingsParams> = {
  id: 'numer-bisect-halvings',
  sample: (rng, difficulty) => {
    for (;;) {
      const mode: HalvingsMode = difficulty > 1 ? 'mid' : rng.pick(['width', 'count']);
      const params = { mode, W: rng.pick(HALVING_WIDTHS), k: rng.int(2, 5), eps: rng.pick(HALVING_EPS) };
      if (mode === 'width') {
        if (terminates(params.W / 2 ** params.k, 6)) return params;
        continue;
      }
      const q = halvingsQuotient(params);
      const part = q - Math.floor(q);
      if (q > 1 && part > 0.1 && part < 0.9) return params;
    }
  },
  render: (params): Slide => {
    const { mode, W, k, eps } = params;
    const start = `Bisection starts on an interval of width $${fmt(W)}$.`;
    const ask =
      mode === 'width'
        ? `How wide is the interval after $${k}$ halvings?`
        : mode === 'count'
          ? `How many halvings until its width is first less than $${fmt(eps)}$?`
          : `The root is estimated by the midpoint of the last interval. How many halvings until that midpoint is certain to be within $${fmt(eps)}$ of the root?`;
    return {
      kind: 'expression',
      prompt: [say(`${start} ${ask}`)],
      lead: mode === 'width' ? '\\text{width} =' : 'k =',
      keypad: [],
      answer: halvingsAnswer(params),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { mode, W, k, eps } = params;
    if (mode === 'width') {
      return [
        { text: 'Each halving halves the width, so after $k$ of them it is $\\frac{b - a}{2^{k}}$.' },
        { tex: `\\frac{${fmt(W)}}{2^{${k}}} = ${fmt(W / 2 ** k)}` },
      ];
    }
    const target = mode === 'mid' ? 2 * eps : eps;
    const answer = Number(halvingsAnswer(params));
    return [
      ...(mode === 'mid' ? [{ text: `The midpoint is at most half the width from the root, so the width must be below $${fmt(target)}$.` }] : []),
      { tex: aligned(`\\frac{${fmt(W)}}{2^{k}} &< ${fmt(target)}`, `2^{k} &> ${fmt(W / target)}`) },
      { text: `$2^{${answer - 1}} = ${2 ** (answer - 1)}$ is not enough and $2^{${answer}} = ${2 ** answer}$ is, so $k = ${answer}$.` },
    ];
  },
};

interface BisectChoiceParams extends BisectParams {
  /** Halvings: two at difficulty 1, three at 2. */
  k: number;
}

/** Which interval holds the root after k halvings: the right one and three of the same width. */
const bisectChoice: Generator<BisectChoiceParams> = {
  id: 'numer-bisect-choice',
  sample: (rng, difficulty) => ({ ...sampleBracket(rng, difficulty), k: difficulty > 1 ? 3 : 2 }),
  render: (params): Slide => {
    const { poly, a, k } = params;
    const width = 1 / 2 ** k;
    const [lo] = halvings(poly, a, a + 1, k).next;
    const at = Math.round((lo - a) / width);
    const count = 2 ** k;
    const others = [at - 1, at + 1, count - 1 - at, at + 2, at - 2].filter((i) => i >= 0 && i < count && i !== at);
    const picks = [...new Set(others)].slice(0, 3);
    const label = (i: number) => `[${fmt(a + i * width)}, ${fmt(a + (i + 1) * width)}]`;
    return choiceSlide(
      [say(`${bracketText(params)}. After ${k === 2 ? 'two' : 'three'} halvings by bisection, which interval holds the root?`)],
      [at, ...picks].map((i) => ({ tex: label(i), correct: i === at })),
    );
  },
  solution: ({ poly, a, k }) => halvingLines(poly, a, a + 1, k),
};

/* ---------- Level 6, lesson 2: side by side ---------- */

interface SideParams {
  /** x^3 + rx^2 + px + q, drawn so Newton-Raphson's first step is a short decimal. */
  poly: Poly;
  /** The start shared by the iteration and Newton-Raphson. */
  x0: number;
  /** Bisection's bracket is [lo, lo + 1], and holds the root nearest x0. */
  lo: number;
}

/** The places iterates are written to. */
const SIDE_DP = 4;

/** x = the cube root of -(rx^2 + px + q), the rearrangement of f(x) = 0. */
function sideG({ poly }: Pick<SideParams, 'poly'>): (x: number) => number {
  const rest = poly.slice(1).map((c) => -c);
  return (x) => Math.cbrt(valueAt(rest, x));
}

const sideGTex = ({ poly }: Pick<SideParams, 'poly'>, variable = 'x') => `\\sqrt[3]{${polyTex(poly.slice(1).map((c) => -c), variable)}}`;

const newtonOf = (poly: Poly) => (x: number) => x - valueAt(poly, x) / valueAt(derivative(poly), x);

/**
 * `steps` values of `step` from x0 written to `dp` places, or undefined when
 * a value sits near a rounding boundary or carrying the written value forward
 * would change a later row.
 */
function writtenRun(step: (x: number) => number, x0: number, steps: number, dp: number): { full: number[]; tokens: string[] } | undefined {
  const full: number[] = [];
  const tokens: string[] = [];
  let [x, carried] = [x0, x0];
  for (let n = 0; n < steps; n += 1) {
    x = step(x);
    const token = written(x, dp);
    if (token === undefined || written(step(carried), dp) !== token) return undefined;
    full.push(x);
    tokens.push(token);
    carried = Number(token);
  }
  return { full, tokens };
}

/** Every column of the side-by-side table: three midpoints, three iterates, three Newton-Raphson values. */
function sideColumns(params: SideParams) {
  const { poly, x0, lo } = params;
  const f = (x: number) => valueAt(poly, x);
  const mids = halvings(poly, lo, lo + 1, 3).rows.map((row) => row.m);
  const iter = writtenRun(sideG(params), x0, 3, SIDE_DP);
  const newton = writtenRun(newtonOf(poly), x0, 3, SIDE_DP);
  if (!iter || !newton) return undefined;
  return { f, mids, iter, newton, alpha: bisect(f, lo, lo + 1) };
}

/** Whole starts from 1 to 3 at difficulty 1, an x^2 term or a negative start at 2. */
function sampleSide(rng: Rng, difficulty: number): SideParams {
  for (;;) {
    const { poly, x0 } = sampleNewtonStep(rng, difficulty > 1 ? 2 : rng.pick([1, 2]));
    if (difficulty === 1 && x0 < 1) continue;
    const f = (x: number) => valueAt(poly, x);
    const lo = f(x0) * f(x0 + 1) < 0 ? x0 : f(x0 - 1) * f(x0) < 0 ? x0 - 1 : undefined;
    if (lo === undefined || rootsIn(f, lo, lo + 1).length !== 1) continue;
    const params = { poly, x0, lo };
    const columns = sideColumns(params);
    if (!columns) continue;
    const { alpha, iter, newton, mids } = columns;
    if (Math.abs(slope(sideG(params), alpha)) > 0.7) continue;
    if (Math.abs(newton.full[2] - alpha) > 1e-3 || Math.abs(iter.full[2] - alpha) > Math.abs(x0 - alpha)) continue;
    if (halvings(poly, lo, lo + 1, 3).rows.some((row) => Math.abs(row.fm) < 0.01) || mids.includes(x0)) continue;
    return params;
  }
}

const sideText = (params: SideParams) =>
  `$f(x) = ${polyTex(params.poly)}$ has a root $\\alpha$ in $[${params.lo}, ${params.lo + 1}]$. Three methods chase it: bisection on that interval, the iteration $x_{n+1} = ${sideGTex(params, 'x_n')}$, and Newton-Raphson, the last two from $x_0 = ${params.x0}$.`;

/** The three columns as a display, rows 1 to 3 filled in, for the slides that compare them. */
function sideDisplay(params: SideParams): string {
  const { mids, iter, newton } = sideColumns(params)!;
  const rows = [0, 1, 2].map((i) => `${fmt(mids[i])} & ${iter.tokens[i]} & ${newton.tokens[i]}`);
  return `\\begin{array}{c|c|c} \\text{Bis.} & \\text{Iter.} & \\text{N-R} \\\\ \\hline ${rows.join(' \\\\ ')} \\end{array}`;
}

function sideSolution(params: SideParams): SolutionStep[] {
  const { mids, iter, newton } = sideColumns(params)!;
  return [
    { text: `Bisection halves $[${params.lo}, ${params.lo + 1}]$: $${mids.map(fmt).join(',\\ ')}$.` },
    { text: `Iteration puts each value back into $${sideGTex(params)}$: $${iter.tokens.join(',\\ ')}$.` },
    { text: `Newton-Raphson takes $x - \\frac{f(x)}{f'(x)}$ with $f'(x) = ${polyTex(derivative(params.poly))}$: $${newton.tokens.join(',\\ ')}$.` },
  ];
}

interface SideTableParams extends SideParams {
  /** The first blank row: 3 at difficulty 1, 2 at difficulty 2. */
  from: number;
}

/** One root chased three ways in three columns, iterates to four places. */
const sideTable: Generator<SideTableParams> = {
  id: 'numer-side-table',
  sample: (rng, difficulty) => ({ ...sampleSide(rng, difficulty), from: difficulty > 1 ? 2 : 3 }),
  render: (params): Slide => {
    const { lo, x0, from, poly } = params;
    const { mids, iter, newton } = sideColumns(params)!;
    const cell = (value: string, row: number) => (row >= from ? null : value);
    const rows = [
      ['0', `[${lo}, ${lo + 1}]`, fmt(x0), fmt(x0)],
      ...[1, 2, 3].map((n) => [String(n), cell(fmt(mids[n - 1]), n), cell(iter.tokens[n - 1], n), cell(newton.tokens[n - 1], n)]),
    ];
    const answer = [1, 2, 3].filter((n) => n >= from).flatMap((n) => [fmt(mids[n - 1]), iter.tokens[n - 1], newton.tokens[n - 1]]);
    const last = newton.full[2];
    const slips = [
      fmt(mids[1] + (mids[2] - mids[1]) * -1),
      written(2 * newton.full[1] - last, SIDE_DP),
      written(sideG(params)(iter.full[2]), SIDE_DP),
      written(newton.full[1] + valueAt(poly, newton.full[1]) / valueAt(derivative(poly), newton.full[1]), SIDE_DP),
      written(iter.full[2] + 0.001, SIDE_DP),
    ];
    return {
      kind: 'table',
      prompt: [say(`${sideText(params)} Fill in the table, iterates to $${SIDE_DP}$ decimal places.`)],
      columns: ['n', '\\text{Bis.}', '\\text{Iter.}', '\\text{N-R}'],
      rows,
      bank: numberBank(answer, slips, around([mids[2]], 0.125)),
      answer,
    };
  },
  solution: sideSolution,
};

interface SideFlowParams extends SideParams {
  /** Which step is asked: the first at difficulty 1, the second at 2. */
  n: number;
}

/** The labels of the side flow, right one first, or none when two coincide. */
function sideFlowLabels(params: SideFlowParams) {
  const { poly, x0, lo, n } = params;
  const { mids, iter, newton } = sideColumns(params)!;
  const prevIter = n === 1 ? x0 : iter.full[0];
  const prevNewton = n === 1 ? x0 : newton.full[0];
  const [f, df] = [valueAt(poly, prevNewton), valueAt(derivative(poly), prevNewton)];
  const bis = [mids[n - 1], n === 1 ? lo + 0.25 : mids[0] + (mids[0] - mids[1]), lo + 1];
  const it = [iter.tokens[n - 1], written(Math.cbrt(poly[2] * prevIter + poly[3]), SIDE_DP), written(Math.cbrt(-poly[2] * prevIter) - poly[3], SIDE_DP)];
  const nr = [newton.tokens[n - 1], written(prevNewton + f / df, SIDE_DP), written(prevNewton - f, SIDE_DP)];
  const groups = [bis.map(fmt), it, nr];
  if (groups.some((group) => group.some((label) => label === undefined) || new Set(group).size !== 3)) return undefined;
  return groups as string[][];
}

/**
 * Each method's next value from the same start, one question each. At
 * difficulty 2 the first values are given and the second is asked.
 */
const sideFlow: Generator<SideFlowParams> = {
  id: 'numer-side-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = { ...sampleSide(rng, difficulty), n: difficulty > 1 ? 2 : 1 };
      if (sideFlowLabels(params)) return params;
    }
  },
  render: (params): Slide => {
    const { n, x0, poly, lo } = params;
    const { mids, iter, newton } = sideColumns(params)!;
    const [bis, it, nr] = sideFlowLabels(params)!.map((group) => group.map((label) => `$${label}$`));
    const key = `${poly.join(',')}|${x0}|${lo}|${n}`;
    const given =
      n === 1
        ? ''
        : ` Their first values were $m_1 = ${fmt(mids[0])}$, $x_1 = ${iter.tokens[0]}$ by iteration and $x_1 = ${newton.tokens[0]}$ by Newton-Raphson.`;
    const which = n === 1 ? 'first' : 'second';
    return {
      kind: 'flow',
      prompt: [say(`${sideText(params)}${given} Find each method's ${which} value, iterates to $${SIDE_DP}$ decimal places.`)],
      subject: `f(x) = ${polyTex(poly)}`,
      steps: [
        { id: 'bis', ask: `Bisection's ${which} midpoint is`, branches: turned(bis, key).map((label) => ({ label, to: 'it' })) },
        { id: 'it', ask: `The iteration's $x_${n}$ is`, branches: turned(it, key).map((label) => ({ label, to: 'nr' })) },
        {
          id: 'nr',
          ask: `Newton-Raphson's $x_${n}$ is`,
          branches: turned(
            nr.map((label, i) => ({
              label,
              outcome: ['The tangent step: $f$ over $f\'$, taken away.', 'That adds $\\frac{f}{f\'}$ instead of taking it away.', "That forgets to divide by $f'$."][i],
            })),
            key,
          ),
        },
      ],
      answer: [bis[0], it[0], nr[0]],
    };
  },
  solution: sideSolution,
};

type Method = 'bisection' | 'iteration' | 'newton';

const METHOD_NAMES: Record<Method, string> = { bisection: 'Bisection', iteration: 'Iteration', newton: 'Newton-Raphson' };

/** Each method's third value, how far it is from the root, and how much it last moved. */
function sideRace(params: SideParams) {
  const { mids, iter, newton, alpha } = sideColumns(params)!;
  const race = {
    bisection: { error: Math.abs(mids[2] - alpha), moved: Math.abs(mids[2] - mids[1]) },
    iteration: { error: Math.abs(iter.full[2] - alpha), moved: Math.abs(iter.full[2] - iter.full[1]) },
    newton: { error: Math.abs(newton.full[2] - alpha), moved: Math.abs(newton.full[2] - newton.full[1]) },
  };
  const methods = Object.keys(race) as Method[];
  const byError = [...methods].sort((m, n) => race[m].error - race[n].error);
  const byMoved = [...methods].sort((m, n) => race[m].moved - race[n].moved);
  return { race, closest: byError[0], clear: race[byError[0]].error < race[byError[1]].error / 2 && byError[0] === byMoved[0] };
}

/**
 * Which column is closest to the root after three steps, from how much each
 * is still moving. Only asked when the closest is also the one moving least.
 */
const nearestMethod: Generator<SideParams> = {
  id: 'numer-nearest-method',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleSide(rng, difficulty);
      if (sideRace(params).clear) return params;
    }
  },
  render: (params): Slide =>
    keyedChoice(
      [
        say(`${sideText(params)} Steps 1 to 3 of each:`),
        show(sideDisplay(params)),
        say('Which is closest to $\\alpha$ now?'),
      ],
      (Object.keys(METHOD_NAMES) as Method[]).map((method) => ({ tex: METHOD_NAMES[method], correct: method === sideRace(params).closest })),
      `${params.poly.join(',')}|${params.x0}`,
      false,
    ),
  solution: (params) => {
    const { mids, iter, newton } = sideColumns(params)!;
    const closest = sideRace(params).closest;
    return [
      { text: `Bisection's last midpoint moved $${fmt(Math.abs(mids[2] - mids[1]))}$, and the root is somewhere in an interval $${fmt(0.125)}$ wide.` },
      { text: `The iteration moved from $${iter.tokens[1]}$ to $${iter.tokens[2]}$; Newton-Raphson from $${newton.tokens[1]}$ to $${newton.tokens[2]}$.` },
      { text: `A method still moving a lot is still a long way off, so ${METHOD_NAMES[closest]} is closest.` },
    ];
  },
};

/**
 * Newton-Raphson's first step as a line to reduce: f(x_0), f'(x_0), their
 * quotient, then x_1. The cubic has an x^2 term and the start may be
 * negative at difficulty 2.
 */
const sideSteps: Generator<NewtonStepParams> = {
  id: 'numer-side-steps',
  sample: sampleNewtonStep,
  render: ({ poly, x0 }): Slide => {
    const { fa, da, ratio, x1 } = newtonStep({ poly, x0 });
    const X = fmt(x0);
    const bank = (value: number, ...slips: number[]) => stepBank(fmt(value), ...slips.map(fmt));
    return {
      kind: 'steps',
      prompt: [
        say(
          `Bisection needs a bracket and iteration a rearrangement; Newton-Raphson needs $f'(x)$. For $f(x) = ${polyTex(poly)}$ from $x_0 = ${X}$, work out $x_1$: tap the part you would work out next, then choose what it comes to.`,
        ),
      ],
      start: [X, '-', `f(${X})`, '\\div', `f'(${X})`],
      reductions: [
        { span: [2, 3], value: fmt(fa), bank: bank(fa, -fa, fa + 1, valueAt(poly, -x0)) },
        { span: [4, 5], value: fmt(da), bank: bank(da, -da, da + 1, valueAt(poly.slice(0, -1), x0)) },
        { span: [2, 5], operator: 3, value: fmt(ratio), bank: bank(ratio, -ratio, fa - da, fa * da) },
        { span: [0, 3], operator: 1, value: fmt(x1), bank: bank(x1, x0 + ratio, x0 - fa, x1 + 1) },
      ],
    };
  },
  solution: ({ poly, x0 }) => {
    const { fa, da, ratio, x1 } = newtonStep({ poly, x0 });
    return [
      { text: `$f'(x) = ${polyTex(derivative(poly))}$.` },
      { tex: aligned(`f(${fmt(x0)}) &= ${fmt(fa)}`, `f'(${fmt(x0)}) &= ${fmt(da)}`) },
      { tex: aligned(`x_1 &= ${fmt(x0)} - \\frac{${fmt(fa)}}{${fmt(da)}}`, `&= ${fmt(x0)} - ${paren(ratio)}`, `&= ${fmt(x1)}`) },
    ];
  },
};

/* ---------- Level 6, lesson 3: speed of convergence ---------- */

interface SpeedParams {
  /** Bisection's interval width now. */
  W: number;
  /** Iteration: |g'(α)|, and the error now. */
  r: number;
  e: number;
  /** Newton-Raphson's correct decimal places now. */
  p: number;
}

const SPEED_WIDTHS = [1, 0.5, 0.4, 0.2, 0.1, 2];
const SPEED_ERRORS = [0.1, 0.2, 0.4, 0.5, 0.05, 1];

/** The three one-step labels, right one first, or none when two agree or one runs long. */
function speedLabels({ W, r, e, p }: SpeedParams) {
  const bis = [W / 2, W / 4, W / 10];
  const it = [r * e, e * (1 - r), r * r * e];
  const nr = [2 * p, p + 1, 3 * p];
  const ok = [bis, it].every((group) => group.every((v) => terminates(v, 6)) && new Set(group.map(fmt)).size === 3);
  return ok ? { bis: bis.map(fmt), it: it.map(fmt), nr: nr.map(String) } : undefined;
}

/**
 * What one more step does to each method: bisection halves the width,
 * iteration multiplies the error by |g'(α)|, Newton-Raphson roughly doubles
 * the correct places.
 */
const speedFlow: Generator<SpeedParams> = {
  id: 'numer-speed-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = {
        W: rng.pick(SPEED_WIDTHS),
        r: rng.pick(difficulty > 1 ? K_RATES_HARD : K_RATES),
        e: rng.pick(SPEED_ERRORS),
        p: rng.int(2, difficulty > 1 ? 6 : 4),
      };
      if (speedLabels(params)) return params;
    }
  },
  render: (params): Slide => {
    const { W, r, e, p } = params;
    const { bis, it, nr } = speedLabels(params)!;
    const key = `${W}|${r}|${e}|${p}`;
    return {
      kind: 'flow',
      prompt: [say('Three methods are part way to the same root. What does one more step of each do?')],
      subject: `\\begin{aligned} \\text{bisection width} &= ${fmt(W)} \\\\ \\text{iteration error} &\\approx ${fmt(e)} \\\\ \\text{N-R correct places} &= ${p} \\end{aligned}`,
      steps: [
        {
          id: 'bis',
          ask: `One more halving leaves bisection's interval how wide?`,
          branches: turned(bis, key).map((v) => ({ label: `$${v}$`, to: 'it' })),
        },
        {
          id: 'it',
          ask: `The iteration has $|g'(\\alpha)| \\approx ${fmt(r)}$. One more step leaves an error of about`,
          branches: turned(it, key).map((v) => ({ label: `$${v}$`, to: 'nr' })),
        },
        {
          id: 'nr',
          ask: 'One more step of Newton-Raphson gives about how many correct places?',
          branches: turned(
            nr.map((label, i) => ({
              label,
              outcome: ['Close to the root, the correct places roughly double.', 'That is one place a step, which is bisection-slow.', 'Tripling is faster than Newton-Raphson manages.'][i],
            })),
            key,
          ),
        },
      ],
      answer: [`$${bis[0]}$`, `$${it[0]}$`, nr[0]],
    };
  },
  solution: ({ W, r, e, p }) => [
    { text: `Bisection halves its interval: $\\frac{${fmt(W)}}{2} = ${fmt(W / 2)}$.` },
    { text: `Iteration multiplies the error by about $|g'(\\alpha)|$: $${fmt(r)} \\times ${fmt(e)} = ${fmt(r * e)}$.` },
    { text: `Newton-Raphson roughly squares the error, which doubles the correct places: $${p}$ becomes about $${2 * p}$.` },
  ],
};

interface SpeedTableParams extends SpeedParams {
  /** Rows after row 0: two at difficulty 1, three at 2. */
  steps: number;
}

/** The three methods step by step: w_n = W/2^n, e_n = r^n e, d_n = 2^n p. */
function speedRows({ W, r, e, p, steps }: SpeedTableParams): number[][] {
  return Array.from({ length: steps + 1 }, (_, n) => [W / 2 ** n, e * r ** n, p * 2 ** n]);
}

/** Row 0 given, the rest filled from a bank: widths halve, errors shrink by r, places double. */
const speedTable: Generator<SpeedTableParams> = {
  id: 'numer-speed-table',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = {
        W: rng.pick(SPEED_WIDTHS),
        r: rng.pick(difficulty > 1 ? K_RATES_HARD : K_RATES),
        e: rng.pick(SPEED_ERRORS),
        p: rng.int(1, 3),
        steps: difficulty > 1 ? 3 : 2,
      };
      if (speedRows(params).every((row) => row.every((v) => terminates(v, 6)))) return params;
    }
  },
  render: (params): Slide => {
    const values = speedRows(params);
    const rows = values.map((row, n) => [String(n), ...row.map((v) => (n === 0 ? fmt(v) : null))]);
    const answer = values.slice(1).flatMap((row) => row.map(fmt));
    const last = values[values.length - 1];
    const slips = [last[0] / 2, last[1] * params.r, last[1] * 2, last[2] + 1, last[2] / 2 + 1, params.p + params.steps].map(fmt);
    return {
      kind: 'table',
      prompt: [
        say(
          `Three methods close in on one root. $w_n$ is the width of bisection's interval, $e_n$ the iteration's error with $|g'(\\alpha)| \\approx ${fmt(params.r)}$, and $d_n$ the correct decimal places of Newton-Raphson. Fill in the next ${params.steps === 2 ? 'two' : 'three'} rows.`,
        ),
      ],
      columns: ['n', 'w_n', 'e_n', 'd_n'],
      rows,
      bank: numberBank(answer, slips, around([last[2]], 1)),
      answer,
    };
  },
  solution: (params) => {
    const values = speedRows(params);
    return [
      { text: `Bisection halves: $${values.map((row) => fmt(row[0])).join(',\\ ')}$.` },
      { text: `Iteration multiplies by $${fmt(params.r)}$: $${values.map((row) => fmt(row[1])).join(',\\ ')}$.` },
      { text: `Newton-Raphson doubles its places: $${values.map((row) => row[2]).join(',\\ ')}$.` },
    ];
  },
};

interface SpeedCountParams {
  /** The error all three start with: 0.1 or 0.01, so Newton-Raphson has 1 or 2 places. */
  e0: number;
  /** The target is an error below 10^-P. */
  P: number;
  r: number;
}

const placesOf = (e0: number) => Math.round(-Math.log10(e0));

/** The quotient each count has to pass, where the method has one. */
function speedQuotients({ e0, P, r }: SpeedCountParams) {
  return { bisection: Math.log2(e0 * 10 ** P), iteration: Math.log(10 ** -P / e0) / Math.log(r) };
}

function speedCounts(params: SpeedCountParams) {
  const q = speedQuotients(params);
  let newton = 0;
  while (placesOf(params.e0) * 2 ** newton < params.P) newton += 1;
  const counts = { bisection: Math.ceil(q.bisection), iteration: Math.ceil(q.iteration), newton };
  return { ...counts, fewest: Math.min(counts.bisection, counts.iteration, counts.newton) };
}

/**
 * The steps each method needs from the same error to a stated one, and the
 * fewest of the three. Drawn again when a logarithm sits near a whole number.
 */
const speedTree: Generator<SpeedCountParams> = {
  id: 'numer-speed-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = {
        e0: difficulty > 1 ? rng.pick([0.1, 0.01]) : 0.1,
        P: rng.int(4, 15),
        r: rng.pick(difficulty > 1 ? K_RATES_HARD : [0.2, 0.25, 0.3, 0.4, 0.5]),
      };
      const fair = Object.values(speedQuotients(params)).every((q) => q > 1 && q - Math.floor(q) > 0.1 && q - Math.floor(q) < 0.9);
      if (fair && params.P > placesOf(params.e0)) return params;
    }
  },
  render: (params): Slide => {
    const { e0, P, r } = params;
    const counts = speedCounts(params);
    const answer = [counts.bisection, counts.iteration, counts.newton, counts.fewest].map(String);
    const slips = [counts.bisection - 1, counts.bisection + 1, counts.iteration + 1, counts.iteration - 1, counts.newton + 1, P].map(String);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Three methods each have an error of at most $${fmt(e0)}$, so Newton-Raphson has $${placesOf(e0)}$ correct place${placesOf(e0) > 1 ? 's' : ''}. Bisection halves its error bound each step, the iteration multiplies its error by about $${fmt(r)}$, and Newton-Raphson doubles its correct places. Top row: the steps each needs to get the error below $10^{-${P}}$, bisection, iteration, then Newton-Raphson. Below: the fewest.`,
        ),
      ],
      expression: `\\text{error} < 10^{-${P}}`,
      nodes: [
        { id: 'bis', from: [] },
        { id: 'it', from: [] },
        { id: 'nr', from: [] },
        { id: 'fewest', from: ['bis', 'it', 'nr'] },
      ],
      bank: numberBank(answer, slips, around([counts.bisection], 1)),
      answer,
    };
  },
  solution: (params) => {
    const { e0, P, r } = params;
    const q = speedQuotients(params);
    const counts = speedCounts(params);
    const places = Array.from({ length: counts.newton + 1 }, (_, n) => placesOf(e0) * 2 ** n);
    return [
      { text: `Bisection: $\\frac{${fmt(e0)}}{2^{k}} < 10^{-${P}}$ needs $k > ${q.bisection.toFixed(2)}$, so $${counts.bisection}$ steps.` },
      { text: `Iteration: $${fmt(r)}^{k} \\times ${fmt(e0)} < 10^{-${P}}$ needs $k > ${q.iteration.toFixed(2)}$, so $${counts.iteration}$ steps.` },
      { text: `Newton-Raphson: places $${places.join(', ')}$, so $${counts.newton}$ steps.` },
      { text: `The fewest is $${counts.fewest}$.` },
    ];
  },
};

/* ---------- Level 6, lessons 4 and 5: when each breaks, and which to reach for ---------- */

type Plan = 'bisection' | 'iteration' | 'newton';

interface Kit {
  /** f(x) = x^3 - 3s^2 x + q, turning at x = ±s, with three roots. */
  s: number;
  q: number;
  /** Which plans are set up to work on α, the largest root. */
  ok: Record<Plan, boolean>;
  /** Newton-Raphson's start: s itself when it is set up to fail. */
  x0: number;
}

const kitPoly = ({ s, q }: Pick<Kit, 's' | 'q'>): Poly => [1, 0, -3 * s * s, q];

/**
 * The three plans for one cubic. Bisection works on [⌊α⌋, ⌊α⌋ + 1] and fails
 * on an interval that also holds the middle root, where both ends share a
 * sign. Iteration works through the cube root, whose gradient at α is
 * s^2/α^2 < 1, and fails through (x^3 + q)/3s^2, whose gradient is α^2/s^2.
 * Newton-Raphson fails from the turning point x = s, where f'(s) = 0.
 */
function kitFacts(kit: Kit) {
  const { s, q, ok, x0 } = kit;
  const poly = kitPoly(kit);
  const f = (x: number) => valueAt(poly, x);
  const [, middle, alpha] = rootsIn(f, -3 * s, 3 * s);
  const bracket: [number, number] = ok.bisection ? [Math.floor(alpha), Math.floor(alpha) + 1] : [Math.floor(middle), Math.ceil(alpha)];
  const k = 3 * s * s;
  const g = ok.iteration
    ? { g: (x: number) => Math.cbrt(k * x - q), tex: `\\sqrt[3]{${polyTex([k, -q])}}` }
    : { g: (x: number) => (x ** 3 + q) / k, tex: `\\frac{${polyTex([1, 0, 0, q])}}{${k}}` };
  return { poly, f, alpha, bracket, ...g, x0, df: valueAt(derivative(poly), x0) };
}

function sampleKit(rng: Rng, difficulty: number, ok: Record<Plan, boolean>): Kit {
  const s = difficulty > 1 ? 3 : 2;
  for (;;) {
    const q = nonZero(rng, 2 * s ** 3 - 1);
    const f = (x: number) => valueAt(kitPoly({ s, q }), x);
    const roots = rootsIn(f, -3 * s, 3 * s);
    if (roots.length !== 3) continue;
    if (Array.from({ length: 6 * s + 1 }, (_, i) => i - 3 * s).some((n) => f(n) === 0)) continue;
    const alpha = roots[2];
    if (alpha < 1.15 * s) continue;
    return { s, q, ok, x0: ok.newton ? Math.ceil(alpha) + rng.int(0, 1) : s };
  }
}

const kitKey = ({ s, q, ok, x0 }: Kit) => `${s}|${q}|${ok.bisection}|${ok.iteration}|${ok.newton}|${x0}`;

/** The three plans in words, for a prompt. */
function kitText(kit: Kit): string {
  const { poly, alpha, bracket, tex, x0 } = kitFacts(kit);
  return `$f(x) = ${polyTex(poly)}$ has a root $\\alpha \\approx ${alpha.toFixed(1)}$. Three plans to find it: bisection on $[${bracket[0]}, ${bracket[1]}]$; the iteration $x_{n+1} = g(x_n)$ with $g(x) = ${tex}$; and Newton-Raphson from $x_0 = ${x0}$.`;
}

/** Why each plan fails when it does. */
function failReasons(kit: Kit): Record<Plan, string> {
  const { bracket, x0 } = kitFacts(kit);
  return {
    bisection: `$f(${bracket[0]})$ and $f(${bracket[1]})$ have the same sign`,
    iteration: `$|g'(x)| > 1$ near $\\alpha$`,
    newton: `$f'(${x0}) = 0$, so the tangent is flat`,
  };
}

/** The working behind each plan's verdict. */
function kitLines(kit: Kit): SolutionStep[] {
  const { f, alpha, bracket, x0, df } = kitFacts(kit);
  const s2 = kit.s * kit.s;
  const gradient = kit.ok.iteration ? `\\frac{${s2}}{\\alpha^{2}}` : `\\frac{\\alpha^{2}}{${s2}}`;
  return [
    {
      text: `$f(${bracket[0]}) = ${fmt(f(bracket[0]))}$ and $f(${bracket[1]}) = ${fmt(f(bracket[1]))}$: ${kit.ok.bisection ? 'a change of sign, so bisection can start' : 'no change of sign, so bisection cannot start, though two roots lie between'}.`,
    },
    {
      text: `$g'(\\alpha) = ${gradient} \\approx ${fmt(Number((kit.ok.iteration ? s2 / alpha ** 2 : alpha ** 2 / s2).toFixed(2)))}$: ${kit.ok.iteration ? 'below 1, so the iteration closes in' : 'above 1, so the iteration runs away'}.`,
    },
    { text: `$f'(${x0}) = ${fmt(df)}$: ${kit.ok.newton ? 'the tangent is steep, so Newton-Raphson homes in' : 'the tangent is flat and never meets the axis'}.` },
  ];
}

const PLANS: Plan[] = ['bisection', 'iteration', 'newton'];
const PLAN_NAMES: Record<Plan, string> = { bisection: 'Bisection', iteration: 'Iteration', newton: 'Newton-Raphson' };

const failing = (plan: Plan): Record<Plan, boolean> => ({ bisection: plan !== 'bisection', iteration: plan !== 'iteration', newton: plan !== 'newton' });

/** One of the three plans on f is set up to fail: which, and why. */
const breaksFlow: Generator<Kit & { fails: Plan }> = {
  id: 'numer-breaks-flow',
  sample: (rng, difficulty) => {
    const fails = rng.pick(PLANS);
    return { ...sampleKit(rng, difficulty, failing(fails)), fails };
  },
  render: (kit): Slide => {
    const key = kitKey(kit);
    const reasons = failReasons(kit);
    const whole = '$\\alpha$ is not a whole number';
    const outcomes: Record<Plan, string> = {
      bisection: 'Both ends are on the same side of the axis, so there is no sign change to follow.',
      iteration: 'Each step multiplies the error by more than 1, so the iterates run away from $\\alpha$.',
      newton: 'A flat tangent never meets the axis, so there is no $x_1$.',
    };
    return {
      kind: 'flow',
      prompt: [say(`${kitText(kit)} One plan fails.`)],
      subject: `f(x) = ${polyTex(kitPoly(kit))}`,
      steps: [
        { id: 'which', ask: 'Which plan fails?', branches: turned(PLANS.map((plan) => PLAN_NAMES[plan]), key).map((label) => ({ label, to: 'why' })) },
        {
          id: 'why',
          ask: 'Why?',
          branches: turned(
            [
              ...PLANS.map((plan) => ({ label: reasons[plan], outcome: outcomes[plan] })),
              { label: whole, outcome: 'Every method here finds roots that are not whole; that is what they are for.' },
            ],
            key,
          ),
        },
      ],
      answer: [PLAN_NAMES[kit.fails], reasons[kit.fails]],
    };
  },
  solution: kitLines,
};

type PictureVerdict = 'bisection' | 'newton' | 'neither';

/**
 * The curve with bisection's interval dashed and the tangent at Newton-Raphson's
 * start drawn: which fails, read off the picture.
 */
const breaksPicture: Generator<Kit & { verdict: PictureVerdict }> = {
  id: 'numer-breaks-picture',
  sample: (rng, difficulty) => {
    const verdict = rng.pick<PictureVerdict>(['bisection', 'newton', 'neither']);
    const ok = { bisection: verdict !== 'bisection', iteration: true, newton: verdict !== 'newton' };
    return { ...sampleKit(rng, difficulty, ok), verdict };
  },
  render: (kit): Slide => {
    const { f, bracket, x0, df, poly } = kitFacts(kit);
    const span = 3 * kit.s + 0.5;
    const limit = 3 * kit.s ** 3;
    const svg = plotSvg({
      xMin: -span,
      xMax: span,
      yMin: -limit,
      yMax: limit,
      curves: [{ f: clamped(f, limit * 2) }, { f: clamped((x) => f(x0) + df * (x - x0), limit * 2), accent: true }],
      verticals: [{ x: bracket[0] }, { x: bracket[1] }],
      marks: [{ x: x0, y: f(x0) }],
      label: `The curve y = f(x), dashed lines at x = ${bracket[0]} and x = ${bracket[1]}, and the tangent at x = ${x0}`,
    });
    return choiceSlide(
      [
        say(
          `$f(x) = ${polyTex(poly)}$. Bisection is to start on the dashed interval $[${bracket[0]}, ${bracket[1]}]$, and Newton-Raphson from $x_0 = ${x0}$, where the tangent is drawn. Both are after the largest root. Which fails?`,
        ),
        { kind: 'diagram', svg },
      ],
      [
        { tex: `Bisection on [${bracket[0]}, ${bracket[1]}]: no change of sign`, correct: kit.verdict === 'bisection' },
        { tex: `Newton-Raphson from ${x0}: the tangent is flat`, correct: kit.verdict === 'newton' },
        { tex: 'Neither: both close in on the root', correct: kit.verdict === 'neither' },
      ],
      false,
    );
  },
  solution: (kit) => kitLines(kit).filter((_, i) => i !== 1),
};

/** The numbers that decide whether bisection and Newton-Raphson can start. */
const breaksTree: Generator<Kit> = {
  id: 'numer-breaks-tree',
  sample: (rng, difficulty) => {
    const verdict = rng.pick<PictureVerdict>(['bisection', 'newton', 'neither']);
    return sampleKit(rng, difficulty, { bisection: verdict !== 'bisection', iteration: true, newton: verdict !== 'newton' });
  },
  render: (kit): Slide => {
    const { f, bracket, x0, df, poly } = kitFacts(kit);
    const [fa, fb] = bracket.map(f);
    const answer = [fa, fb, df, fa * fb].map(fmt);
    const s2 = kit.s * kit.s;
    const slips = [-fa, -fb, df + 3 * s2, 3 * x0 * x0, -fa * fb, fa + fb].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `$f(x) = ${polyTex(poly)}$. Before bisecting $[${bracket[0]}, ${bracket[1]}]$ or starting Newton-Raphson at $x_0 = ${x0}$, check both can start. Top row: $f(${bracket[0]})$, $f(${bracket[1]})$ and $f'(${x0})$. Below: $f(${bracket[0]})\\,f(${bracket[1]})$, negative when the sign changes.`,
        ),
      ],
      expression: `f(${bracket[0]})\\,f(${bracket[1]}) \\text{ and } f'(${x0})`,
      nodes: [
        { id: 'fa', from: [] },
        { id: 'fb', from: [] },
        { id: 'df', from: [] },
        { id: 'prod', from: ['fa', 'fb'] },
      ],
      bank: numberBank(answer, slips, around([fa * fb], 2)),
      answer,
    };
  },
  solution: (kit) => [{ text: `$f'(x) = ${polyTex(derivative(kitPoly(kit)))}$.` }, ...kitLines(kit).filter((_, i) => i !== 1)],
};

/** The fastest plan that works: Newton-Raphson, then iteration, then bisection. */
const reachFor = ({ ok }: Pick<Kit, 'ok'>): Plan => (ok.newton ? 'newton' : ok.iteration ? 'iteration' : 'bisection');

/** A kit whose fastest working plan is `plan`, the slower ones set up either way. */
function sampleReach(rng: Rng, difficulty: number, plan: Plan): Kit {
  const ok = {
    newton: plan === 'newton',
    iteration: plan === 'iteration' || (plan === 'newton' && rng.chance(0.5)),
    bisection: plan === 'bisection' || rng.chance(0.5),
  };
  return sampleKit(rng, difficulty, ok);
}

/** The values the learner checks, stated at difficulty 1 and left to work out at 2. */
function kitValues(kit: Kit): string {
  const { f, alpha, bracket, x0, df, g } = kitFacts(kit);
  return ` Here $f(${bracket[0]}) = ${fmt(f(bracket[0]))}$, $f(${bracket[1]}) = ${fmt(f(bracket[1]))}$, $g'(\\alpha) \\approx ${fmt(Number(slope(g, alpha).toFixed(2)))}$ and $f'(${x0}) = ${fmt(df)}$.`;
}

/** Which plan to reach for: the fastest of the three that will work on this f. */
const reachChoice: Generator<Kit & { stated: boolean }> = {
  id: 'numer-reach-choice',
  sample: (rng, difficulty) => ({ ...sampleReach(rng, difficulty, rng.pick(PLANS)), stated: difficulty === 1 }),
  render: (kit): Slide =>
    keyedChoice(
      [say(`${kitText(kit)}${kit.stated ? kitValues(kit) : ''} Which should you reach for: the fastest plan that will work?`)],
      PLANS.map((plan) => ({ tex: PLAN_NAMES[plan], correct: plan === reachFor(kit) })),
      kitKey(kit),
      false,
    ),
  solution: (kit) => [
    ...kitLines(kit),
    { text: `Newton-Raphson is fastest when it can start, then iteration, then bisection, so ${PLAN_NAMES[reachFor(kit)]}.` },
  ],
};

/** The first value the chosen plan gives: exact for bisection and Newton-Raphson, four places for iteration. */
function reachFirst(kit: Kit): string | undefined {
  const { poly, bracket, g, x0 } = kitFacts(kit);
  switch (reachFor(kit)) {
    case 'bisection':
      return fmt((bracket[0] + bracket[1]) / 2);
    case 'iteration':
      return written(g(x0), SIDE_DP);
    case 'newton': {
      const { ratio, x1 } = newtonStep({ poly, x0 });
      return terminates(ratio) ? fmt(x1) : undefined;
    }
  }
}

/** Reach for the plan that fits, then take its first step. */
const reachValue: Generator<Kit & { stated: boolean }> = {
  id: 'numer-reach-value',
  sample: (rng, difficulty) => {
    const plan = rng.pick(PLANS);
    for (;;) {
      const kit = { ...sampleReach(rng, difficulty, plan), stated: difficulty === 1 };
      if (reachFirst(kit) !== undefined) return kit;
    }
  },
  render: (kit): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `${kitText(kit)}${kit.stated ? kitValues(kit) : ''} Take the fastest plan that will work, iteration also starting from $x_0 = ${kit.x0}$, and give its first estimate of $\\alpha$, to $${SIDE_DP}$ decimal places where it is not exact.`,
      ),
    ],
    lead: '\\text{first estimate} =',
    keypad: [],
    answer: reachFirst(kit)!,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (kit) => {
    const { poly, bracket, tex, x0 } = kitFacts(kit);
    const plan = reachFor(kit);
    const first =
      plan === 'bisection'
        ? { tex: `m = \\frac{${bracket[0]} + ${bracket[1]}}{2} = ${reachFirst(kit)}` }
        : plan === 'iteration'
          ? { tex: aligned(`x_1 &= g(${x0})`, `&= ${tex.replace(/x/g, `(${x0})`)}`, `&= ${reachFirst(kit)}`) }
          : { tex: `x_1 = ${x0} - \\frac{${fmt(valueAt(poly, x0))}}{${fmt(valueAt(derivative(poly), x0))}} = ${reachFirst(kit)}` };
    return [...kitLines(kit), { text: `So ${PLAN_NAMES[plan]}, and its first step:` }, first];
  },
};

type Scenario = 'table' | 'steep' | 'flatG' | 'flatNoG';

interface ReachFlowParams {
  scenario: Scenario;
  a: number;
  fa: number;
  fb: number;
  /** |g'| near the root, when a rearrangement is in hand. */
  r: number;
  x0: number;
  /** f'(x_0), when a formula is in hand. */
  d: number;
}

const REACH_REASONS = {
  sign: 'It needs nothing but the change of sign, and always closes in',
  fast: 'The tangent is steep at the start, and the correct places roughly double each step',
  g: "|g'| is below 1 near the root, so the iterates close in without a derivative",
  wrongFast: 'It always takes the fewest steps',
  wrongDiverge: "|g'| above 1 means it closes in faster",
};

/** The method a scenario calls for, and the reason. */
function reachAnswer({ scenario }: ReachFlowParams): { plan: Plan; reason: keyof typeof REACH_REASONS } {
  switch (scenario) {
    case 'table':
      return { plan: 'bisection', reason: 'sign' };
    case 'steep':
      return { plan: 'newton', reason: 'fast' };
    case 'flatG':
      return { plan: 'iteration', reason: 'g' };
    case 'flatNoG':
      return { plan: 'bisection', reason: 'sign' };
  }
}

/** What is in hand, one fact a line. */
function reachFacts({ scenario, a, fa, fb, r, x0, d }: ReachFlowParams): string[] {
  const sign = `$f(${a}) = ${fa}$ and $f(${a + 1}) = ${fb}$.`;
  switch (scenario) {
    case 'table':
      return [sign, '$f$ is only known from a table of readings, so there is no formula to differentiate or rearrange.'];
    case 'steep':
      return [sign, `$f$ is a polynomial, and $f'(${x0}) = ${d}$ at the first guess $x_0 = ${x0}$.`, `A rearrangement $x = g(x)$ has $|g'| \\approx ${fmt(r)}$ near the root.`];
    case 'flatG':
      return [sign, `$f$ is a polynomial, but $f'(${x0}) = 0$ at the only first guess, $x_0 = ${x0}$.`, `A rearrangement $x = g(x)$ has $|g'| \\approx ${fmt(r)}$ near the root.`];
    case 'flatNoG':
      return [sign, `$f$ is a polynomial, but $f'(${x0}) = 0$ at the only first guess, $x_0 = ${x0}$.`, `A rearrangement $x = g(x)$ has $|g'| \\approx ${fmt(r)}$ near the root.`];
  }
}

/** From what is in hand, which method, and why. */
const reachFlow: Generator<ReachFlowParams> = {
  id: 'numer-reach-flow',
  sample: (rng, difficulty) => {
    const scenario = rng.pick<Scenario>(difficulty > 1 ? ['steep', 'flatG', 'flatNoG'] : ['table', 'steep', 'flatG']);
    const converging = scenario === 'flatG' || (scenario === 'steep' && rng.chance(0.5));
    const a = rng.int(-3, 4);
    const fa = nonZero(rng, 9);
    return {
      scenario,
      a,
      fa,
      fb: -Math.sign(fa) * rng.int(1, 9),
      r: converging ? rng.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) : rng.pick([1.4, 1.6, 1.8, 2.2, 2.5, 3]),
      x0: a + rng.pick([0, 1]),
      d: scenario === 'steep' ? rng.int(4, 20) * rng.sign() : 0,
    };
  },
  render: (params): Slide => {
    const key = `${params.scenario}|${params.a}|${params.fa}|${params.fb}|${params.r}|${params.x0}|${params.d}`;
    const { plan, reason } = reachAnswer(params);
    const others = (Object.keys(REACH_REASONS) as (keyof typeof REACH_REASONS)[]).filter((k) => k !== reason);
    const picks = [reason, ...turned(others, key).slice(0, 2)];
    return {
      kind: 'flow',
      prompt: [say(`A root of $f(x) = 0$ is wanted. In hand: ${reachFacts(params).join(' ')}`)],
      subject: `f(${params.a}) = ${params.fa}, \\quad f(${params.a + 1}) = ${params.fb}`,
      steps: [
        { id: 'plan', ask: 'Which method do you reach for?', branches: turned(PLANS.map((p) => PLAN_NAMES[p]), key).map((label) => ({ label, to: 'why' })) },
        {
          id: 'why',
          ask: 'Why that one?',
          branches: turned(
            picks.map((k) => ({ label: REACH_REASONS[k], outcome: k === reason ? 'That is what makes it the one to use here.' : 'That is not what decides it.' })),
            key,
          ),
        },
      ],
      answer: [PLAN_NAMES[plan], REACH_REASONS[reason]],
    };
  },
  solution: (raw) => {
    const { plan } = reachAnswer(raw);
    const lines: Record<Scenario, string> = {
      table: 'With no formula there is no derivative for Newton-Raphson and nothing to rearrange; the sign change is all there is.',
      steep: `A steep tangent at $x_0 = ${raw.x0}$ means Newton-Raphson can start, and it is the fastest of the three.`,
      flatG: `$f'(${raw.x0}) = 0$ rules Newton-Raphson out, and $|g'| \\approx ${fmt(raw.r)} < 1$ means the iteration converges.`,
      flatNoG: `$f'(${raw.x0}) = 0$ rules Newton-Raphson out, and $|g'| \\approx ${fmt(raw.r)} > 1$ means the iteration diverges, so only the sign change is left.`,
    };
    return [{ text: lines[raw.scenario] }, { text: `So ${PLAN_NAMES[plan]}.` }];
  },
};

export const numericalMethodsGenerators = [
  signTree,
  signInterval,
  signFlow,
  signValue,
  failPicture,
  failFlow,
  touchTiles,
  splitValue,
  rearrangeTiles,
  schemeEquationChoice,
  firstIterateSteps,
  cobwebChoice,
  cobwebSlider,
  cobwebFlow,
  fixedLimit,
  gPrime,
  whichConverges,
  divergeFlow,
  newtonFormulaTiles,
  newtonTree,
  newtonDerivative,
  newtonRootIterate,
  boundsSteps,
  accuracyChoice,
  stopFlow,
  nrFailPicture,
  nrFailFlow,
  tangentSlider,
  flatTiles,
  ordinatesTree,
  trapeziumTiles,
  trapeziumEstimate,
  trapeziumSteps,
  concavityChoice,
  concavityFlow,
  errorValue,
  meanHeightSlider,
  absError,
  absSizeSteps,
  closestChoice,
  overUnderFlow,
  relError,
  relTiles,
  relSlider,
  relCompare,
  boundTree,
  boundValueAsk,
  boundEnds,
  boundAccuracyFlow,
  carryTree,
  carryError,
  carrySlider,
  shrinkFlow,
  kCount,
  kTiles,
  kLogsSteps,
  errorIterate,
  simpsonTiles,
  parabolaTree,
  simpsonSteps,
  weightsChoice,
  weightsTiles,
  simpsonEstimate,
  oddFlow,
  stripsTree,
  bothTree,
  gapValue,
  closerChoice,
  refineFlow,
  simpsonError,
  exactFlow,
  exactChoice,
  cubicSteps,
  readingsEstimate,
  tableTree,
  readingsSlider,
  oddChoice,
  eulerStepTree,
  eulerFormulaTiles,
  eulerTangentSlider,
  eulerPointChoice,
  eulerFirstValue,
  eulerTable,
  eulerChainSteps,
  eulerReachValue,
  eulerCountFlow,
  eulerYTable,
  eulerYTree,
  eulerFrozenChoice,
  eulerSlipFlow,
  eulerYValue,
  eulerErrorTree,
  eulerErrorValue,
  eulerMissFlow,
  eulerMissChoice,
  eulerExactSteps,
  eulerHalveTable,
  eulerNeededValue,
  eulerHalveChoice,
  eulerSizeFlow,
  eulerSizeSlider,
  bisectTable,
  bisectFlow,
  bisectHalvings,
  bisectChoice,
  sideTable,
  sideFlow,
  nearestMethod,
  sideSteps,
  speedFlow,
  speedTable,
  speedTree,
  breaksFlow,
  breaksPicture,
  breaksTree,
  reachChoice,
  reachValue,
  reachFlow,
];
