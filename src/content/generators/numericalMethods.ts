/**
 * Numerical Methods (roadmap C15).
 *
 * Level 1 finds roots without solving: the change of sign and where it
 * fails, rearranging f(x) = 0 into x = g(x), the staircase and cobweb
 * pictures of that iteration, and why it diverges when |g'(α)| > 1. Level 2
 * is Newton-Raphson (the tangent step, a root to a stated accuracy, and where
 * it goes wrong) and the trapezium rule (the rule itself, and whether it
 * overestimates or underestimates).
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
 * - A trapezium estimate is not the integral, so no `expression` here
 *   declares `integrand` and `limits`: the quadrature oracle would grade the
 *   estimate against the exact value. Ordinates are whole by choice of `f`,
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
import { ITERATES, fixedScheme, written, type FixedFamily } from './iterationTable';

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
];
