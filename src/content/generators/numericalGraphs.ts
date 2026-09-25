/**
 * Numerical Methods, level 8: locating roots graphically (roadmap C15).
 *
 * Shown on the Numerical Methods Basics card. Reading a root off a graph to
 * the whole numbers either side and then to a tenth, counting roots and the
 * solutions of f(x) = k, where two graphs meet and rearranging to h(x) = 0 for
 * a sign test, roots from a table of values, the decimal search that zooms in
 * a tenth at a time, and the two bounds that confirm a root to a set accuracy.
 *
 * Curves are drawn on squared paper with the whole numbers written along the
 * axis (`withAxisNumbers`), and every root a question asks about sits well
 * inside its interval (a fraction of 0.2 to 0.8) so reading it is never a
 * coin toss. Table values are cubics at whole numbers, halves and tenths, so
 * every value is an exact decimal.
 */
import type { Generator, Slide } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { plotFigure, plotSvg } from '../figures';
import { say } from './format';
import {
  aligned,
  around,
  choiceSlide,
  clamped,
  clean,
  fillBank,
  fmt,
  numberBank,
  paren,
  polyTex,
  rootsIn,
  sgn,
  show,
  signed,
  turned,
  valueAt,
  withAxisNumbers,
  type Poly,
} from './numericalKit';

/* ================================================================
 * Lesson 1: roots on a graph
 * ================================================================ */

interface CurveParams {
  /** The roots where the curve crosses, in order. */
  roots: number[];
  /** A root where the curve only touches the axis, if any. */
  touch?: number;
  /** For a single crossing: the quadratic factor (x - m)^2 + c that has no roots. */
  m: number;
  c: number;
  /** Which way up. */
  s: number;
  /** Which crossing a question asks about, as an index into `roots`. */
  ask: number;
  /** A horizontal line y = k, or 0 for none. */
  k: number;
}

const X_MIN = -4;
const X_MAX = 4;

function rawCurve({ roots, touch, m, c, s }: CurveParams): (x: number) => number {
  return (x) => {
    let y = s;
    for (const r of roots) y *= x - r;
    if (touch !== undefined) y *= (x - touch) * (x - touch);
    else if (roots.length === 1) y *= (x - m) * (x - m) + c;
    return y;
  };
}

/** The curve scaled so its bumps between the roots stand about four units tall. */
function curveOf(params: CurveParams): (x: number) => number {
  const f = rawCurve(params);
  const xs = [...params.roots, ...(params.touch === undefined ? [] : [params.touch])];
  const lo = Math.min(...xs) - 0.6;
  const hi = Math.max(...xs) + 0.6;
  let top = 0;
  for (let i = 0; i <= 200; i += 1) top = Math.max(top, Math.abs(f(lo + ((hi - lo) * i) / 200)));
  const scale = 4 / top;
  return (x) => f(x) * scale;
}

/** A tenth with a fraction of 0.2 to 0.8, so it sits plainly inside its whole-number interval. */
function tenthIn(rng: Rng, from: number, to: number): number {
  for (;;) {
    const r = clean(rng.int(from * 10, to * 10) / 10);
    const frac = clean(r - Math.floor(r));
    if (frac >= 0.2 && frac <= 0.8) return r;
  }
}

/** Crossing roots in separate whole-number intervals, at least 1.2 apart. */
function spreadRoots(rng: Rng, count: number): number[] {
  for (;;) {
    const roots = Array.from({ length: count }, () => tenthIn(rng, -3.8, 3.8)).sort((a, b) => a - b);
    const floors = new Set(roots.map(Math.floor));
    if (floors.size < count) continue;
    if (roots.some((r, i) => i > 0 && r - roots[i - 1] < 1.2)) continue;
    return roots;
  }
}

function sampleCurve(rng: Rng, kind: 'one' | 'three' | 'touch'): CurveParams {
  const s = rng.sign();
  if (kind === 'one') {
    const roots = spreadRoots(rng, 1);
    return { roots, m: Math.round(roots[0]) + rng.pick([-1, 1]), c: rng.int(1, 3), s, ask: 0, k: 0 };
  }
  if (kind === 'three') return { roots: spreadRoots(rng, 3), m: 0, c: 0, s, ask: rng.int(0, 2), k: 0 };
  for (;;) {
    const [r, t] = spreadRoots(rng, 2);
    const touch = rng.chance(0.5) ? Math.round(t) : Math.round(r);
    const cross = touch === Math.round(t) ? r : t;
    if (Math.abs(touch - cross) < 1.2 || Math.abs(touch) > 3) continue;
    return { roots: [cross], touch, m: 0, c: 0, s, ask: 0, k: 0 };
  }
}

function curveSvg(params: CurveParams, label: string): string {
  const f = clamped(curveOf(params), 9);
  return withAxisNumbers(
    plotSvg({
      xMin: X_MIN,
      xMax: X_MAX,
      yMin: -6,
      yMax: 6,
      grid: true,
      curves: [{ f }],
      horizontals: params.k === 0 ? [] : [params.k],
      label,
    }),
  );
}

const WHICH = ['smallest', 'middle', 'largest'];

function whichRoot(params: CurveParams): string {
  return params.roots.length === 1 ? 'the root' : `the ${WHICH[params.ask]} root`;
}

const intervalTex = (n: number): string => `[${n},\\ ${n + 1}]`;

/** Which pair of whole numbers a root lies between, read off the graph. */
const graphInterval: Generator<CurveParams> = {
  id: 'numer-graph-interval-choice',
  sample: (rng, difficulty) => sampleCurve(rng, difficulty > 1 ? 'three' : 'one'),
  render: (params): Slide => {
    const r = params.roots[params.ask];
    const n = Math.floor(r);
    const others = params.roots.filter((_, i) => i !== params.ask).map(Math.floor);
    const pool = [...others, n - 1, n + 1, n - 2, n + 2].filter((v, i, all) => v !== n && all.indexOf(v) === i);
    return choiceSlide(
      [
        { kind: 'diagram', svg: curveSvg(params, 'The graph of y = f(x) on squared paper, crossing the x-axis') },
        say(`The graph of $y = f(x)$. Between which two whole numbers is ${whichRoot(params)} of $f(x) = 0$?`),
      ],
      [{ tex: intervalTex(n), correct: true }, ...pool.slice(0, 3).map((v) => ({ tex: intervalTex(v) }))],
    );
  },
  solution: (params) => {
    const r = params.roots[params.ask];
    const n = Math.floor(r);
    return [
      { text: 'A root of $f(x) = 0$ is where the curve crosses the $x$-axis.' },
      { text: `${params.roots.length === 1 ? 'It' : `Of the three crossings, ${whichRoot(params)}`} crosses between the grid lines at $x = ${n}$ and $x = ${n + 1}$, at about $x = ${fmt(r)}$.` },
    ];
  },
};

/** How many roots, or at difficulty 2 how many solutions of f(x) = k, from the graph. */
const graphCount: Generator<CurveParams> = {
  id: 'numer-graph-count',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleCurve(rng, rng.pick(['one', 'three', 'touch'] as const));
      if (difficulty === 1) return params;
      const k = rng.pick([-3, -2, -1, 1, 2, 3]);
      const f = curveOf(params);
      // Clear of every turning point, so the line never grazes the curve.
      const tops: number[] = [];
      for (let i = 1; i < 400; i += 1) {
        const x = X_MIN + (i * (X_MAX - X_MIN)) / 400;
        const h = (X_MAX - X_MIN) / 400;
        if ((f(x) - f(x - h)) * (f(x + h) - f(x)) <= 0) tops.push(f(x));
      }
      if (tops.some((y) => Math.abs(y - k) < 0.5)) continue;
      const hits = rootsIn((x) => f(x) - k, -12, 12, 2400);
      if (hits.some((x) => x < X_MIN + 0.3 || x > X_MAX - 0.3)) continue;
      return { ...params, k };
    }
  },
  choices: (params) => {
    const right = countOf(params);
    return options({ tex: String(right) }, ...[0, 1, 2, 3, 4].filter((n) => n !== right).map((n) => ({ tex: String(n) }))).slice(0, 4);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'diagram', svg: curveSvg(params, 'The graph of y = f(x) on squared paper') },
      say(
        params.k === 0
          ? 'The graph of $y = f(x)$. How many roots has $f(x) = 0$?'
          : `The graph of $y = f(x)$, with the dashed line $y = ${params.k}$. How many solutions has $f(x) = ${params.k}$?`,
      ),
    ],
    lead: '\\text{number} =',
    keypad: [],
    answer: String(countOf(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) =>
    params.k === 0
      ? [
          { text: 'Count where the curve meets the $x$-axis, crossing or just touching.' },
          {
            text:
              params.touch === undefined
                ? `It crosses ${params.roots.length === 1 ? 'once' : 'three times'}: ${countOf(params)} root${countOf(params) === 1 ? '' : 's'}.`
                : `It crosses once and touches once, where it turns back without crossing: that touch is a root too, so $2$.`,
          },
        ]
      : [
          { text: `The solutions of $f(x) = ${params.k}$ are where the curve meets the line $y = ${params.k}$.` },
          { text: `Count the meeting points: $${countOf(params)}$.` },
        ],
};

function countOf(params: CurveParams): number {
  if (params.k === 0) return params.roots.length + (params.touch === undefined ? 0 : 1);
  const f = curveOf(params);
  return rootsIn((x) => f(x) - params.k, -12, 12, 2400).length;
}

/** Slide to a root, read to a tenth off the squared paper. */
const graphRootSlider: Generator<CurveParams> = {
  id: 'numer-graph-root-slider',
  sample: (rng, difficulty) => sampleCurve(rng, difficulty > 1 ? 'three' : 'one'),
  render: (params): Slide => {
    const r = params.roots[params.ask];
    return {
      kind: 'slider',
      prompt: [say(`Slide the marker to ${whichRoot(params)} of $f(x) = 0$, to the nearest tenth.`)],
      min: X_MIN,
      max: X_MAX,
      step: 0.1,
      tolerance: 0.15,
      answer: r,
      readout: 'x = {v}',
      figure: plotFigure(curveSvg(params, 'The graph of y = f(x) on squared paper, crossing the x-axis')),
    };
  },
  solution: (params) => {
    const r = params.roots[params.ask];
    const n = Math.floor(r);
    return [
      { text: `${params.roots.length === 1 ? 'The curve crosses' : `Of the three crossings, ${whichRoot(params)} is`} between $x = ${n}$ and $x = ${n + 1}$.` },
      { text: `Split that square into tenths by eye: it crosses at about $x = ${fmt(r)}$.` },
    ];
  },
};

/* ================================================================
 * Lesson 2: where two graphs meet
 * ================================================================ */

type PairKind = 'cube' | 'square' | 'recip';

interface MeetParams {
  kind: PairKind;
  /** The curve's coefficient: a x^3, a x^2 or a / x. */
  a: number;
  /** The line y = m x + c. */
  m: number;
  c: number;
  /** Which solution a question asks about: 0 the smaller, 1 the larger. */
  ask: number;
}

function curveTex({ kind, a }: MeetParams): string {
  const coef = a === 1 ? '' : String(a);
  if (kind === 'cube') return `${coef}x^{3}`;
  if (kind === 'square') return `${coef}x^{2}`;
  return `\\frac{${a}}{x}`;
}

const lineTex = ({ m, c }: MeetParams): string => polyTex([m, c]);

function curveFn({ kind, a }: MeetParams): (x: number) => number {
  if (kind === 'cube') return (x) => a * x * x * x;
  if (kind === 'square') return (x) => a * x * x;
  return (x) => a / x;
}

/** The solutions of curve = line, exactly where a formula gives them. */
function solutions(params: MeetParams): number[] {
  const { kind, a, m, c } = params;
  if (kind === 'square' || kind === 'recip') {
    // a x^2 - m x - c = 0, or m x^2 + c x - a = 0 for a / x = m x + c.
    const [A, B, C] = kind === 'square' ? [a, -m, -c] : [m, c, -a];
    if (A === 0) return kind === 'recip' && B !== 0 ? [-C / B].filter((x) => x !== 0) : [];
    const disc = B * B - 4 * A * C;
    if (disc < 0) return [];
    const root = Math.sqrt(disc);
    return [(-B - root) / (2 * A), (-B + root) / (2 * A)].filter((x) => kind !== 'recip' || x !== 0).sort((p, q) => p - q);
  }
  return rootsIn((x) => a * x * x * x - m * x - c, -12, 12, 2400);
}

/** No near-miss: the gap between the graphs is never small except where they cross. */
function clearMeeting(params: MeetParams): boolean {
  const { kind, a, m, c } = params;
  if (kind !== 'cube') {
    const [A, B, C] = kind === 'square' ? [a, -m, -c] : [m, c, -a];
    if (A === 0) return false;
    return Math.abs(B * B - 4 * A * C) >= 4;
  }
  if (m <= 0) return true;
  const turn = Math.sqrt(m / (3 * a));
  return [turn, -turn].every((x) => Math.abs(a * x * x * x - m * x - c) >= 0.8);
}

function sampleMeet(rng: Rng, kinds: PairKind[], counts: number[]): MeetParams {
  for (;;) {
    const kind = rng.pick(kinds);
    const a = kind === 'recip' ? rng.pick([1, 2, 4]) : rng.pick([1, 1, 2]);
    const m = kind === 'recip' ? rng.int(-2, 2) : rng.int(-4, 4);
    const c = rng.int(-4, 4);
    const params = { kind, a, m, c, ask: rng.int(0, 1) };
    if (kind === 'recip' && m === 0) continue;
    if (!clearMeeting(params)) continue;
    const xs = solutions(params);
    if (!counts.includes(xs.length)) continue;
    const f = curveFn(params);
    if (xs.some((x) => Math.abs(x) > 3.6 || Math.abs(f(x)) > 7.5 || Math.abs(x) < 0.2)) continue;
    if (xs.some((x, i) => i > 0 && x - xs[i - 1] < 0.6)) continue;
    // Read to a tenth: keep each well inside its tenth.
    if (xs.some((x) => Math.abs(x * 10 - Math.round(x * 10)) > 0.35)) continue;
    return params;
  }
}

function meetSvg(params: MeetParams): string {
  return withAxisNumbers(
    plotSvg({
      xMin: X_MIN,
      xMax: X_MAX,
      yMin: -8,
      yMax: 8,
      grid: true,
      curves: [{ f: clamped(curveFn(params), 12), breaks: params.kind === 'recip' }, { f: (x) => params.m * x + params.c, accent: true }],
      label: `The graphs of y = ${curveTex(params)} and the straight line y = ${lineTex(params)}`,
    }),
  );
}

const equationTex = (params: MeetParams): string => `${curveTex(params)} = ${lineTex(params)}`;

const meetCount: Generator<MeetParams> = {
  id: 'numer-meet-count-choice',
  sample: (rng, difficulty) => sampleMeet(rng, difficulty > 1 ? ['cube', 'square', 'recip'] : ['cube', 'square'], [0, 1, 2, 3]),
  render: (params): Slide => {
    const count = solutions(params).length;
    return choiceSlide(
      [
        { kind: 'diagram', svg: meetSvg(params) },
        say(`The graphs of $y = ${curveTex(params)}$ and $y = ${lineTex(params)}$. How many solutions has $${equationTex(params)}$?`),
      ],
      [0, 1, 2, 3].map((n) => ({ tex: String(n), correct: n === count })),
    );
  },
  solution: (params) => {
    const xs = solutions(params);
    return [
      { text: `Each solution of $${equationTex(params)}$ is the $x$-coordinate of a point where the two graphs meet.` },
      {
        text:
          xs.length === 0
            ? 'They never meet, so there are no solutions.'
            : `They meet ${['', 'once', 'twice', 'three times'][xs.length]}, so there ${xs.length === 1 ? 'is $1$ solution' : `are $${xs.length}$ solutions`}.`,
      },
    ];
  },
};

const meetSlider: Generator<MeetParams> = {
  id: 'numer-meet-slider',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleMeet(rng, ['square', 'recip'], [2]) : sampleMeet(rng, ['cube'], [1])),
  render: (params): Slide => {
    const xs = solutions(params);
    const x = xs.length === 1 ? xs[0] : xs[params.ask];
    const which = xs.length === 1 ? 'the solution' : params.ask === 0 ? 'the smaller solution' : 'the larger solution';
    return {
      kind: 'slider',
      prompt: [say(`Slide the marker to ${which} of $${equationTex(params)}$, to the nearest tenth.`)],
      min: X_MIN,
      max: X_MAX,
      step: 0.1,
      tolerance: 0.15,
      answer: clean(Math.round(x * 10) / 10),
      readout: 'x = {v}',
      figure: plotFigure(meetSvg(params)),
    };
  },
  solution: (params) => {
    const xs = solutions(params);
    const x = xs.length === 1 ? xs[0] : xs[params.ask];
    return [
      { text: `The solution is where the two graphs cross${xs.length === 1 ? '' : params.ask === 0 ? ', the left-hand crossing' : ', the right-hand crossing'}.` },
      { text: `Read down to the $x$-axis: about $x = ${fmt(clean(Math.round(x * 10) / 10))}$.` },
    ];
  },
};

interface RearrangeParams {
  /** a x^k = m x + c. */
  a: number;
  k: number;
  m: number;
  c: number;
}

function sampleRearrange(rng: Rng): RearrangeParams {
  for (;;) {
    const m = rng.int(-9, 9);
    const c = rng.int(-9, 9);
    if (Math.abs(m) < 2 || c === 0) continue;
    return { a: rng.pick([1, 1, 2]), k: rng.pick([2, 3]), m, c };
  }
}

const lhsTex = ({ a, k }: RearrangeParams): string => `${a === 1 ? '' : a}x^{${k}}`;
const rearrangeEq = (p: RearrangeParams): string => `${lhsTex(p)} = ${polyTex([p.m, p.c])}`;
const hPoly = ({ a, k, m, c }: RearrangeParams): Poly => (k === 3 ? [a, 0, -m, -c] : [a, -m, -c]);

const meetTiles: Generator<RearrangeParams> = {
  id: 'numer-meet-rearrange-tiles',
  sample: (rng) => sampleRearrange(rng),
  render: (params): Slide => {
    const { m, c } = params;
    const answer = [signed(-m), signed(-c)];
    return {
      kind: 'tiles',
      prompt: [say(`Rearrange $${rearrangeEq(params)}$ into the form $h(x) = 0$.`)],
      // `x^3`, not `x^{3}`: a template is split on `{n}`, and `{3}` would read as a blank.
      template: `${params.a === 1 ? '' : params.a}x^${params.k} {0}x {1} = 0`,
      bank: fillBank(answer, [signed(m), signed(c), signed(-c - m), signed(m - c)]),
      answer,
    };
  },
  solution: (params) => [
    { text: 'Take both terms on the right over to the left, changing their signs:' },
    { tex: `${polyTex(hPoly(params))} = 0` },
  ],
};

interface MeetValueParams extends RearrangeParams {
  x: number;
}

const meetValue: Generator<MeetValueParams> = {
  id: 'numer-meet-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = sampleRearrange(rng);
      const x = difficulty > 1 ? rng.int(-3, 2) + 0.5 : rng.int(-3, 3);
      const v = valueAt(hPoly(base), x);
      if (v === 0 || Math.abs(v) > 60) continue;
      return { ...base, x };
    }
  },
  choices: (params) => {
    const h = valueAt(hPoly(params), params.x);
    const lhs = params.a * params.x ** params.k;
    const rhs = params.m * params.x + params.c;
    return options(
      { tex: fmt(h), answer: fmt(h) },
      { tex: fmt(-h), answer: fmt(-h) },
      { tex: fmt(clean(lhs + rhs)), answer: fmt(clean(lhs + rhs)) },
      { tex: fmt(clean(lhs)), answer: fmt(clean(lhs)) },
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`To test $${rearrangeEq(params)}$ for a change of sign, write it as $h(x) = 0$. Find $h(${fmt(params.x)})$.`)],
    lead: `h(${fmt(params.x)}) =`,
    keypad: [],
    answer: fmt(valueAt(hPoly(params), params.x)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { a, k, m, c, x } = params;
    const lhs = clean(a * x ** k);
    const rhs = clean(m * x + c);
    return [
      { tex: `h(x) = ${polyTex(hPoly(params))}` },
      { text: 'That is the left side minus the right side, so work each out and subtract:' },
      { tex: aligned(`${lhsTex(params).replace('x', `(${fmt(x)})`)} &= ${fmt(lhs)}`, `${polyTex([m, c]).replace('x', ` \\times ${paren(x)}`)} &= ${fmt(rhs)}`) },
      { tex: `h(${fmt(x)}) = ${fmt(lhs)} - ${paren(rhs)} = ${fmt(clean(lhs - rhs))}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: roots from a table of values
 * ================================================================ */

interface TableParams {
  p: Poly;
  xs: number[];
  /** Rows whose value is left blank. */
  blanks: number[];
}

/** A cubic whose values at the table's points are modest and never nought. */
function sampleTableCubic(rng: Rng, xs: number[], withSquare: boolean, changes?: number[]): Poly {
  for (;;) {
    const p = [1, withSquare ? rng.int(-3, 3) : 0, rng.int(-7, 7), rng.int(-9, 9)];
    const ys = xs.map((x) => valueAt(p, x));
    if (ys.some((y) => y === 0 || Math.abs(y) > 40)) continue;
    const count = ys.slice(1).filter((y, i) => y * ys[i] < 0).length;
    if (count === 0 || (changes && !changes.includes(count))) continue;
    return p;
  }
}

function valuesTable(xs: number[], ys: string[]): string {
  const part = (from: number, to: number) =>
    `\\begin{array}{c|${'c'.repeat(to - from)}} x & ${xs.slice(from, to).map(fmt).join(' & ')} \\\\ \\hline f(x) & ${ys.slice(from, to).join(' & ')} \\end{array}`;
  if (xs.length <= 5) return part(0, xs.length);
  const half = Math.ceil(xs.length / 2);
  return `\\begin{gathered} ${part(0, half)} \\\\[6pt] ${part(half, xs.length)} \\end{gathered}`;
}

function substitution(p: Poly, x: number): string {
  const terms: string[] = [`${paren(x)}^{3}`];
  const [, r, q, k] = p;
  if (r !== 0) terms.push(`${r < 0 ? '-' : '+'} ${Math.abs(r) === 1 ? '' : `${Math.abs(r)} \\times `}${paren(x)}^{2}`);
  if (q !== 0) terms.push(`${q < 0 ? '-' : '+'} ${Math.abs(q)} \\times ${paren(x)}`);
  if (k !== 0) terms.push(signed(k));
  return `f(${fmt(x)}) = ${terms.join(' ')} = ${fmt(clean(valueAt(p, x)))}`;
}

const tableFill: Generator<TableParams> = {
  id: 'numer-table-fill',
  sample: (rng, difficulty) => {
    const xs = difficulty > 1 ? [-3, -2, -1, 0, 1, 2] : [-2, -1, 0, 1, 2];
    const p = sampleTableCubic(rng, xs, difficulty > 1);
    const blanks = rng.sample(xs.map((_, i) => i), difficulty > 1 ? 4 : 3).sort((a, b) => a - b);
    return { p, xs, blanks };
  },
  render: ({ p, xs, blanks }): Slide => {
    const answer = blanks.map((i) => fmt(valueAt(p, xs[i])));
    const slips = blanks.flatMap((i) => [valueAt(p, -xs[i]), valueAt(p, xs[i]) - 2 * p[3], -valueAt(p, xs[i])]).map(fmt);
    return {
      kind: 'table',
      prompt: [say(`Fill in the table of values for $f(x) = ${polyTex(p)}$.`)],
      columns: ['x', 'f(x)'],
      rows: xs.map((x, i) => [fmt(x), blanks.includes(i) ? null : fmt(valueAt(p, x))]),
      bank: numberBank(answer, slips, around(blanks.map((i) => valueAt(p, xs[i])), 1)),
      answer,
    };
  },
  solution: ({ p, xs, blanks }) => [
    { text: 'Substitute each $x$, taking care with the signs of negative numbers:' },
    ...blanks.map((i) => ({ tex: substitution(p, xs[i]) })),
  ],
};

/** Sign changes in a table: each one proves a root, so they count the roots there must be. */
const tableCount: Generator<TableParams> = {
  id: 'numer-table-count',
  sample: (rng, difficulty) => {
    const xs = difficulty > 1 ? [-3, -2, -1, 0, 1, 2, 3] : [-2, -1, 0, 1, 2, 3];
    return { p: sampleTableCubic(rng, xs, difficulty > 1), xs, blanks: [] };
  },
  choices: (params) => {
    const right = changesOf(params).length;
    return options({ tex: String(right) }, ...[0, 1, 2, 3, 4].filter((n) => n !== right).map((n) => ({ tex: String(n) }))).slice(0, 4);
  },
  render: (params): Slide => {
    const { p, xs } = params;
    return {
      kind: 'expression',
      prompt: [
        say(`Values of a polynomial $f(x)$. At least how many roots of $f(x) = 0$ lie between $${fmt(xs[0])}$ and $${fmt(xs[xs.length - 1])}$?`),
        show(valuesTable(xs, xs.map((x) => fmt(valueAt(p, x))))),
      ],
      lead: '\\text{roots} =',
      keypad: [],
      answer: String(changesOf(params).length),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const changes = changesOf(params);
    return [
      { text: 'Read along the $f(x)$ row and mark each place the sign changes.' },
      { text: `It changes on ${changes.map(([a, b]) => `$[${fmt(a)}, ${fmt(b)}]$`).join(', ')}.` },
      { text: `A polynomial is continuous, so each change proves a root: at least $${changes.length}$.` },
    ];
  },
};

function changesOf({ p, xs }: TableParams): [number, number][] {
  return xs
    .slice(1)
    .map((x, i) => [xs[i], x] as [number, number])
    .filter(([a, b]) => valueAt(p, a) * valueAt(p, b) < 0);
}

interface HalveParams {
  p: Poly;
  a: number;
  w: number;
}

/** A sign change on [a, a + w], then its midpoint tested: which half holds the root. */
const tableNext: Generator<HalveParams> = {
  id: 'numer-table-next-flow',
  sample: (rng, difficulty) => {
    const w = difficulty > 1 ? 0.5 : 1;
    for (;;) {
      const p = [1, 0, rng.int(-7, 7), rng.int(-9, 9)];
      const a = difficulty > 1 ? rng.int(-6, 5) / 2 : rng.int(-3, 2);
      const ys = [a, a + w / 2, a + w].map((x) => valueAt(p, x));
      if (ys.some((y) => Math.abs(y) < 0.1 || Math.abs(y) > 40)) continue;
      if (ys[0] * ys[2] > 0) continue;
      return { p, a, w };
    }
  },
  render: ({ p, a, w }): Slide => {
    const mid = a + w / 2;
    const same = valueAt(p, a) * valueAt(p, mid) > 0;
    return {
      kind: 'flow',
      prompt: [say(`$f(x) = ${polyTex(p)}$. Decide where its root is.`)],
      subject: aligned(...[a, mid, a + w].map((x) => `f(${fmt(x)}) &= ${fmt(clean(valueAt(p, x)))}`)),
      steps: [
        {
          id: 'change',
          ask: `Does $f$ change sign on $[${fmt(a)}, ${fmt(a + w)}]$?`,
          branches: [
            { label: 'Yes', to: 'half' },
            { label: 'No', outcome: 'Then the test proves no root there.' },
          ],
        },
        {
          id: 'half',
          ask: `Is $f(${fmt(mid)})$ the same sign as $f(${fmt(a)})$?`,
          branches: turned(
            [
              { label: 'Yes', outcome: `So the sign changes on the right half: the root is in $[${fmt(mid)}, ${fmt(a + w)}]$.` },
              { label: 'No', outcome: `So the sign changes on the left half: the root is in $[${fmt(a)}, ${fmt(mid)}]$.` },
            ],
            `${polyTex(p)}${a}${w}`,
          ),
        },
      ],
      answer: ['Yes', same ? 'Yes' : 'No'],
    };
  },
  solution: ({ p, a, w }) => {
    const mid = a + w / 2;
    const same = valueAt(p, a) * valueAt(p, mid) > 0;
    return [
      { text: `$f(${fmt(a)})$ and $f(${fmt(a + w)})$ have opposite signs, so there is a root between them.` },
      {
        text: same
          ? `$f(${fmt(mid)})$ has the same sign as $f(${fmt(a)})$, so the change happens after the middle: the root is in $[${fmt(mid)}, ${fmt(a + w)}]$.`
          : `$f(${fmt(mid)})$ has the other sign, so the change happens before the middle: the root is in $[${fmt(a)}, ${fmt(mid)}]$.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 4: zooming in, a tenth at a time
 * ================================================================ */

interface ZoomParams {
  p: Poly;
  /** The first tenth in the table. */
  start: number;
  blanks: number[];
}

/** A cubic with a root well inside a tenth, and the tenths around it. */
function sampleZoom(rng: Rng, withSquare: boolean): { p: Poly; tenth: number } {
  for (;;) {
    const p = [1, withSquare ? rng.int(-3, 3) : 0, rng.int(-7, 7), rng.int(-9, 9)];
    const roots = rootsIn((x) => valueAt(p, x), -4, 4);
    if (roots.length === 0) continue;
    const root = rng.pick(roots);
    const tenth = Math.floor(root * 10);
    const inside = root * 10 - tenth;
    if (inside < 0.2 || inside > 0.8 || Math.abs(root) < 0.3) continue;
    // Its neighbours far enough off that a tenth holds only this one.
    if (roots.some((r) => r !== root && Math.abs(r - root) < 0.6)) continue;
    return { p, tenth: tenth / 10 };
  }
}

const zoomXs = ({ start }: ZoomParams): number[] => Array.from({ length: 5 }, (_, i) => clean(start + i / 10));

const zoomTable: Generator<ZoomParams> = {
  id: 'numer-zoom-table',
  sample: (rng, difficulty) => {
    const { p, tenth } = sampleZoom(rng, difficulty > 1);
    const start = clean(tenth - rng.int(0, 3) / 10);
    const blanks = rng.sample([0, 1, 2, 3, 4], difficulty > 1 ? 4 : 3).sort((a, b) => a - b);
    return { p, start, blanks };
  },
  render: (params): Slide => {
    const { p, blanks } = params;
    const xs = zoomXs(params);
    const ys = xs.map((x) => clean(valueAt(p, x)));
    const answer = blanks.map((i) => fmt(ys[i]));
    const slips = blanks.flatMap((i) => [clean(-ys[i]), clean(valueAt(p, -xs[i])), clean(ys[i] + 0.1)]).map(fmt);
    return {
      kind: 'table',
      prompt: [say(`$f(x) = ${polyTex(p)}$ has a root near $x = ${fmt(xs[2])}$. Fill in the table in tenths.`)],
      columns: ['x', 'f(x)'],
      rows: xs.map((x, i) => [fmt(x), blanks.includes(i) ? null : fmt(ys[i])]),
      bank: numberBank(answer, slips, around(blanks.map((i) => ys[i]), 0.01)),
      answer,
    };
  },
  solution: (params) => {
    const xs = zoomXs(params);
    const ys = xs.map((x) => clean(valueAt(params.p, x)));
    const k = ys.findIndex((y, i) => i < 4 && y * ys[i + 1] < 0);
    return [
      ...params.blanks.map((i) => ({ tex: substitution(params.p, xs[i]) })),
      { text: `The sign changes between $x = ${fmt(xs[k])}$ and $x = ${fmt(xs[k + 1])}$, so that is where the root is.` },
    ];
  },
};

interface RoundParams {
  p: Poly;
  tenth: number;
}

/** A root in [t, t + 0.1]: the midpoint t + 0.05 decides which way it rounds. */
const zoomRound: Generator<RoundParams> = {
  id: 'numer-zoom-round-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const { p, tenth } = sampleZoom(rng, difficulty > 1);
      const mid = valueAt(p, tenth + 0.05);
      if (Math.abs(mid) < 0.01) continue;
      return { p, tenth };
    }
  },
  render: ({ p, tenth }): Slide => {
    const lo = tenth;
    const mid = clean(tenth + 0.05);
    const hi = clean(tenth + 0.1);
    const same = valueAt(p, lo) * valueAt(p, mid) > 0;
    const pick = (key: string) =>
      turned(
        [
          { label: fmt(lo), outcome: `The root rounds to $${fmt(lo)}$.` },
          { label: fmt(hi), outcome: `The root rounds to $${fmt(hi)}$.` },
        ],
        `${key}${polyTex(p)}${tenth}`,
      );
    return {
      kind: 'flow',
      prompt: [say(`$f(x) = ${polyTex(p)}$ has a root between $${fmt(lo)}$ and $${fmt(hi)}$. Find it to 1 decimal place.`)],
      subject: aligned(...[lo, mid, hi].map((x) => `f(${fmt(x)}) &= ${fmt(clean(valueAt(p, x)))}`)),
      steps: [
        {
          id: 'side',
          ask: `Is $f(${fmt(mid)})$ the same sign as $f(${fmt(lo)})$?`,
          branches: [
            { label: 'Yes', to: 'upper' },
            { label: 'No', to: 'lower' },
          ],
        },
        { id: 'upper', ask: `So the root is in $[${fmt(mid)}, ${fmt(hi)}]$. To 1 decimal place it is`, branches: pick('upper') },
        { id: 'lower', ask: `So the root is in $[${fmt(lo)}, ${fmt(mid)}]$. To 1 decimal place it is`, branches: pick('lower') },
      ],
      answer: same ? ['Yes', fmt(hi)] : ['No', fmt(lo)],
    };
  },
  solution: ({ p, tenth }) => {
    const lo = tenth;
    const mid = clean(tenth + 0.05);
    const hi = clean(tenth + 0.1);
    const same = valueAt(p, lo) * valueAt(p, mid) > 0;
    return [
      { text: `Test the halfway point $${fmt(mid)}$, where rounding switches from $${fmt(lo)}$ to $${fmt(hi)}$.` },
      { tex: substitution(p, mid) },
      {
        text: same
          ? `Same sign as $f(${fmt(lo)})$, so the root is past the halfway point, in $[${fmt(mid)}, ${fmt(hi)}]$: it is $${fmt(hi)}$ to 1 decimal place.`
          : `Opposite sign to $f(${fmt(lo)})$, so the root is before the halfway point, in $[${fmt(lo)}, ${fmt(mid)}]$: it is $${fmt(lo)}$ to 1 decimal place.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 5: confirming a root
 * ================================================================ */

interface BoundsParams {
  /** The claim in units of the last place. */
  units: number;
  dp: number;
}

const boundsOf = ({ units, dp }: BoundsParams) => {
  const u = 10 ** -dp;
  const claim = clean(units * u);
  return { claim, lo: clean(claim - u / 2), hi: clean(claim + u / 2), u };
};

const places = (dp: number): string => `${dp} decimal place${dp === 1 ? '' : 's'}`;

const confirmTiles: Generator<BoundsParams> = {
  id: 'numer-confirm-bounds-tiles',
  sample: (rng, difficulty) => {
    const dp = difficulty > 1 ? 2 : 1;
    for (;;) {
      const units = rng.int(10 ** dp, 9 * 10 ** dp);
      if (units % 10 === 0) continue;
      return { units, dp };
    }
  },
  render: (params): Slide => {
    const { claim, lo, hi, u } = boundsOf(params);
    const answer = [fmt(lo), fmt(hi)];
    return {
      kind: 'tiles',
      prompt: [say(`To show that $\\alpha = ${claim.toFixed(params.dp)}$ to ${places(params.dp)}, which two values of $f$ do you work out?`)],
      template: 'f({0}) \\text{ and } f({1})',
      bank: fillBank(answer, [fmt(clean(claim - u)), fmt(clean(claim + u)), claim.toFixed(params.dp), fmt(clean(claim - u / 10)), fmt(clean(claim + u / 10))]),
      answer,
    };
  },
  solution: (params) => {
    const { claim, lo, hi } = boundsOf(params);
    return [
      { text: `A number rounds to $${claim.toFixed(params.dp)}$ to ${places(params.dp)} when it is from $${fmt(lo)}$ up to $${fmt(hi)}$, halfway to each neighbour.` },
      { tex: `${fmt(lo)} \\le \\alpha < ${fmt(hi)}` },
      { text: `So show that $f$ changes sign between $f(${fmt(lo)})$ and $f(${fmt(hi)})$.` },
    ];
  },
};

interface VerdictParams extends BoundsParams {
  p: Poly;
  /** Show the two values rather than leaving them to be worked out. */
  given: boolean;
}

/** A value of f at a bound, to four places, which is enough to be sure of its sign. */
const boundValue = (p: Poly, x: number): string => valueAt(p, x).toFixed(4);

const confirmVerdict: Generator<VerdictParams> = {
  id: 'numer-confirm-verdict-flow',
  sample: (rng, difficulty) => {
    const dp = difficulty > 1 ? 2 : 1;
    for (;;) {
      const p = [1, 0, rng.int(-7, 7), rng.int(-9, 9)];
      const roots = rootsIn((x) => valueAt(p, x), 0.1, 4);
      if (roots.length === 0) continue;
      const alpha = rng.pick(roots);
      const exact = alpha * 10 ** dp;
      const nearest = Math.round(exact);
      if (Math.abs(exact - nearest) > 0.35 || nearest % 10 === 0) continue;
      const units = rng.chance(1 / 3) ? nearest + rng.sign() : nearest;
      const params = { p, units, dp, given: difficulty === 1 };
      const { lo, hi } = boundsOf(params);
      if ([lo, hi].some((x) => Math.abs(valueAt(p, x)) < 0.0005)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { p, dp, given } = params;
    const { claim, lo, hi } = boundsOf(params);
    const flo = valueAt(p, lo);
    const fhi = valueAt(p, hi);
    const verdicts = (first: string) => {
      const other = first === 'Positive' ? 'Negative' : 'Positive';
      return turned(
        [
          { label: first, outcome: `No change of sign, so this does not show $\\alpha = ${claim.toFixed(dp)}$.` },
          { label: other, outcome: `A change of sign, so $\\alpha = ${claim.toFixed(dp)}$ to ${places(dp)}.` },
        ],
        `${first}${polyTex(p)}${claim}`,
      );
    };
    return {
      kind: 'flow',
      prompt: [
        say(`Decide whether $\\alpha = ${claim.toFixed(dp)}$ to ${places(dp)} is a root of $f(x) = 0$.`),
        ...(given ? [show(aligned(`f(${fmt(lo)}) &\\approx ${boundValue(p, lo)}`, `f(${fmt(hi)}) &\\approx ${boundValue(p, hi)}`))] : []),
      ],
      subject: `f(x) = ${polyTex(p)}`,
      steps: [
        {
          id: 'lo',
          ask: `Is $f(${fmt(lo)})$ positive or negative?`,
          branches: [
            { label: 'Positive', to: 'pos' },
            { label: 'Negative', to: 'neg' },
          ],
        },
        { id: 'pos', ask: `And $f(${fmt(hi)})$?`, branches: verdicts('Positive') },
        { id: 'neg', ask: `And $f(${fmt(hi)})$?`, branches: verdicts('Negative') },
      ],
      answer: [sgn(flo), sgn(fhi)],
    };
  },
  solution: (params) => {
    const { p, dp } = params;
    const { claim, lo, hi } = boundsOf(params);
    const change = valueAt(p, lo) * valueAt(p, hi) < 0;
    return [
      { text: `The bounds of $${claim.toFixed(dp)}$ are $${fmt(lo)}$ and $${fmt(hi)}$.` },
      { tex: aligned(`f(${fmt(lo)}) &\\approx ${boundValue(p, lo)}`, `f(${fmt(hi)}) &\\approx ${boundValue(p, hi)}`) },
      {
        text: change
          ? `The sign changes, so the root is between the bounds: $\\alpha = ${claim.toFixed(dp)}$ to ${places(dp)}.`
          : `No change of sign, so the root is not between the bounds: $${claim.toFixed(dp)}$ is wrong.`,
      },
    ];
  },
};

export const numericalGraphsGenerators = [
  graphInterval,
  graphCount,
  graphRootSlider,
  meetCount,
  meetSlider,
  meetTiles,
  meetValue,
  tableFill,
  tableCount,
  tableNext,
  zoomTable,
  zoomRound,
  confirmTiles,
  confirmVerdict,
];
