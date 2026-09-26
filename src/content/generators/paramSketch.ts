/**
 * Sketching parametric curves: Parametric & Implicit, level 8, on the Basics
 * card.
 *
 * Everything here is about the *picture* a pair of parametric equations draws
 * rather than its gradient: a table of points joined in order of t, which way
 * the point travels, where a curve with a restricted t starts and ends and
 * which values it covers, its leftmost, rightmost, highest and lowest points,
 * and matching equations to a sketch.
 *
 * Curves are polynomials in t with whole coefficients, or circles and ellipses
 * written with `cos t` and `sin t`, so every point a learner is asked for is
 * whole. Where a question depends on two curves being told apart by eye
 * (matching a sketch, reflecting a curve) the generator measures the gap
 * between the drawn curves with `curvesApart` and refuses any draw where a wrong
 * option would draw the same picture. `paramSketch.test.ts` checks every
 * answer again by brute force: evaluating the curves with mathjs, searching t
 * for points, and sampling the trig curves.
 *
 * As everywhere, `*Tex` is what the learner reads and `answer` is what mathjs
 * grades.
 */
import type { Block, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import {
  bracketed,
  curveBlocks,
  derived,
  mix,
  numberBank,
  numberChoices,
  pair,
  paramSvg,
  pointAt,
  polyTex,
  randomPoly,
  steered,
  tokenBank,
  treeBank,
  turned,
  valueAt,
  vertexPoly,
  type ParamCurve,
} from './parametricImplicit';

/* ---------- Shared helpers ---------- */

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

const DXDT = '\\frac{dx}{dt}';
const DYDT = '\\frac{dy}{dt}';

/** "A curve is traced by" and its two equations. */
const traced = (curve: ParamCurve): Block[] => [prose('A curve is traced by'), ...curveBlocks(curve)];

/**
 * A polynomial with a number put in for t, as a line of working:
 * `(-2)^{2} - 3 \times (-2) + 1`. Never glues a digit to a digit.
 */
export function substituted(coefficients: readonly number[], value: number): string {
  const top = coefficients.length - 1;
  const v = bracketed(value);
  const parts: string[] = [];
  coefficients.forEach((c, i) => {
    if (c === 0) return;
    const n = top - i;
    const size = Math.abs(c);
    const power = n === 0 ? '' : n === 1 ? v : `${v}^{${n}}`;
    // A bare minus before a power reads as the square of a negative number
    // (-3^2), so a coefficient of -1 on a power is written out as 1 times it.
    const bare = size === 1 && !(c < 0 && n >= 2);
    const body = n === 0 ? `${size}` : bare ? power : `${size} \\times ${power}`;
    if (parts.length === 0) parts.push(c < 0 ? `-${body}` : body);
    else parts.push(c < 0 ? `- ${body}` : `+ ${body}`);
  });
  return parts.length === 0 ? '0' : parts.join(' ');
}

/** `x = <working> = value`, or just `x = value` when there is nothing to work. */
function worked(name: string, coefficients: readonly number[], t: number): string {
  const value = valueAt(coefficients, t);
  const line = substituted(coefficients, t);
  return line === `${value}` ? `${name} = ${value}` : `${name} = ${line} = ${value}`;
}

/** The whole numbers from lo to hi. */
const range = (lo: number, hi: number): number[] => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** A few distinct values of t, drawn without repeats. */
function distinctTs(rng: Rng, count: number, lo: number, hi: number): number[] {
  const pool = range(lo, hi);
  const out: number[] = [];
  while (out.length < count) {
    const at = rng.int(0, pool.length - 1);
    out.push(pool.splice(at, 1)[0]);
  }
  return out;
}

/**
 * Whether two drawn curves are plainly different pictures inside the square
 * window of half-width `span`: some visible point of one lies at least
 * `apart` from every point of the other. Two parametrisations of one curve
 * are never apart, however differently they run.
 *
 * The points of each curve are bucketed into cells `apart` wide, so a point
 * only looks at its own cell and the eight round it, and the search stops at
 * the first point that is far from the other curve.
 */
export function curvesApart(
  f: (t: number) => [number, number],
  fRange: [number, number],
  g: (t: number) => [number, number],
  gRange: [number, number],
  span: number,
  apart: number,
): boolean {
  const sample = (h: (t: number) => [number, number], [lo, hi]: [number, number]) =>
    Array.from({ length: 801 }, (_, i) => h(lo + ((hi - lo) * i) / 800));
  const cell = (v: number) => Math.floor(v / apart);
  const grid = (points: [number, number][]) => {
    const map = new Map<string, [number, number][]>();
    for (const p of points) {
      const key = `${cell(p[0])},${cell(p[1])}`;
      const list = map.get(key);
      if (list) list.push(p);
      else map.set(key, [p]);
    }
    return map;
  };
  const farFrom = (points: [number, number][], other: Map<string, [number, number][]>) =>
    points.some(([x, y]) => {
      if (Math.abs(x) > span || Math.abs(y) > span) return false;
      const cx = cell(x);
      const cy = cell(y);
      for (let i = -1; i <= 1; i += 1) {
        for (let j = -1; j <= 1; j += 1) {
          for (const [u, v] of other.get(`${cx + i},${cy + j}`) ?? []) {
            if (Math.hypot(x - u, y - v) < apart) return false;
          }
        }
      }
      return true;
    });
  const fs = sample(f, fRange);
  const gs = sample(g, gRange);
  return farFrom(fs, grid(gs)) || farFrom(gs, grid(fs));
}

/** A gap of a unit on a twelve-unit window is about 18 px on a phone: plainly a different picture. */
const VISIBLY_DIFFERENT = 1;

/* ---------- A table of points ---------- */

export interface TableParams {
  curve: ParamCurve;
  /** The first value of t in the table; five rows follow. */
  start: number;
  /** Which cells are blank, as row * 2 + (0 for x, 1 for y). */
  blanks: number[];
}

export const tableTs = ({ start }: TableParams): number[] => range(start, start + 4);

/** The blank values, rows top to bottom, x before y. */
export function tableAnswer(params: TableParams): number[] {
  return [...params.blanks]
    .sort((a, b) => a - b)
    .map((cell) => {
      const t = params.start + Math.floor(cell / 2);
      return valueAt(cell % 2 === 0 ? params.curve.x : params.curve.y, t);
    });
}

/**
 * A table of t, x and y with some cells blank, filled from a bank.
 *
 * The bank carries each blank's value at -t, the slip of dropping the sign of
 * a negative t, so squaring $-2$ as if it were $-4$ is on offer.
 */
const pskTable: Generator<TableParams> = {
  id: 'psk-table',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const quad = randomPoly(rng, 2, hard ? 3 : 2);
      const line = hard && rng.chance(0.4) ? randomPoly(rng, 2, 2) : randomPoly(rng, 1, 3);
      const curve = rng.chance(0.5) ? { x: line, y: quad } : { x: quad, y: line };
      const start = hard ? rng.int(-3, 0) : rng.int(-2, 0);
      const blanks = distinctTs(rng, hard ? 6 : 4, 0, 9);
      const params: TableParams = { curve, start, blanks };
      const values = tableTs(params).flatMap((t) => pointAt(curve, t));
      if (values.some((v) => Math.abs(v) > (hard ? 20 : 14))) continue;
      if (!blanks.some((c) => c % 2 === 0) || !blanks.some((c) => c % 2 === 1)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { curve, blanks } = params;
    const ts = tableTs(params);
    const rows = ts.map((t, i) => [
      `${t}`,
      blanks.includes(2 * i) ? null : `${valueAt(curve.x, t)}`,
      blanks.includes(2 * i + 1) ? null : `${valueAt(curve.y, t)}`,
    ]);
    const answer = tableAnswer(params);
    const slips = [...blanks].flatMap((cell) => {
      const t = params.start + Math.floor(cell / 2);
      const poly = cell % 2 === 0 ? curve.x : curve.y;
      return [valueAt(poly, -t), -valueAt(poly, t)];
    });
    return {
      kind: 'table',
      prompt: [...traced(curve), prose('Fill in the table of points.')],
      columns: ['t', 'x', 'y'],
      rows,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { curve } = params;
    return [...params.blanks]
      .sort((a, b) => a - b)
      .map((cell): SolutionStep => {
        const t = params.start + Math.floor(cell / 2);
        const isX = cell % 2 === 0;
        return { text: `At $t = ${t}$:`, tex: worked(isX ? 'x' : 'y', isX ? curve.x : curve.y, t) };
      })
      .concat([{ text: 'Plot the five points and join them in order of $t$, from the top row down.' }]);
  },
};

/* ---------- The order the points are traced in ---------- */

export interface OrderParams {
  /** Which coordinate is linear in t, m t + b; the other is a quadratic. */
  lin: 'x' | 'y';
  m: number;
  b: number;
  quad: number[];
  /** The values of t of the points on the curve, in no particular order. */
  ts: number[];
  /** A point that is not on the curve, or null. */
  off: [number, number] | null;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const letter = (i: number): string => `\\text{${LETTERS[i]}}`;

export const orderCurve = ({ lin, m, b, quad }: OrderParams): ParamCurve =>
  lin === 'x' ? { x: [m, b], y: quad } : { x: quad, y: [m, b] };

/**
 * The listed points, labelled A, B, C, ... in order of the quadratic
 * coordinate (then the linear one), so the listing is fixed by the question
 * and the letters never simply run in order of t. `t` is null for the point
 * off the curve.
 */
export function listed(params: OrderParams): { p: [number, number]; t: number | null }[] {
  const curve = orderCurve(params);
  const points: { p: [number, number]; t: number | null }[] = params.ts.map((t) => ({ p: pointAt(curve, t), t }));
  if (params.off) points.push({ p: params.off, t: null });
  const qi = params.lin === 'x' ? 1 : 0;
  return points.sort((a, b) => a.p[qi] - b.p[qi] || a.p[1 - qi] - b.p[1 - qi]);
}

/** The letters of the points on the curve, in order of t. */
export function orderAnswer(params: OrderParams): string[] {
  return listed(params)
    .map((point, i) => ({ ...point, i }))
    .filter((point) => point.t !== null)
    .sort((a, b) => (a.t as number) - (b.t as number))
    .map((point) => letter(point.i));
}

function sampleOrder(rng: Rng, difficulty: number, count: number, withOff: boolean): OrderParams {
  const hard = difficulty >= 2;
  for (;;) {
    const params: OrderParams = {
      lin: rng.chance(0.5) ? 'x' : 'y',
      m: rng.pick(hard ? [1, 2, 3, -1, -2, -3] : [1, 2, -1, -2]),
      b: rng.int(-3, 3),
      quad: vertexPoly(rng.pick([1, -1]), rng.int(-1, 1), rng.int(-3, 3)),
      ts: distinctTs(rng, count, -3, 3),
      off: null,
    };
    const curve = orderCurve(params);
    if (withOff) {
      const spare = range(-3, 3).filter((t) => !params.ts.includes(t));
      const t = rng.pick(spare);
      const [x, y] = pointAt(curve, t);
      const nudge = rng.pick([1, 2, -1, -2]);
      params.off = params.lin === 'x' ? [x, y + nudge] : [x + nudge, y];
    }
    const points = listed(params);
    if (points.some(({ p }) => Math.abs(p[0]) > 12 || Math.abs(p[1]) > 12)) continue;
    // Two listed points in one place would be one dot with two letters.
    if (new Set(points.map(({ p }) => pair(...p))).size < points.length) continue;
    // Letters that already run in order of t (or against it) hand the answer over.
    const answer = orderAnswer(params);
    const alphabetical = points.map((_, i) => letter(i)).filter((l) => answer.includes(l));
    if (answer.join() === alphabetical.join() || answer.join() === [...alphabetical].reverse().join()) continue;
    return params;
  }
}

const pointsDisplay = (params: OrderParams): Block =>
  display(listed(params).map(({ p }, i) => `${letter(i)}\\,${pair(...p)}`).join(' \\qquad '));

/** Solution steps that find t for each listed point from the linear coordinate. */
function findTSteps(params: OrderParams): SolutionStep[] {
  const { lin, m, b } = params;
  const other = lin === 'x' ? 'y' : 'x';
  const quad = params.quad;
  const steps: SolutionStep[] = [
    { text: `Only $${lin} = ${polyTex([m, b])}$ has one $t$ for each value, so solve it for each point, then check $${other}$.` },
  ];
  listed(params).forEach(({ p }, i) => {
    const value = lin === 'x' ? p[0] : p[1];
    const t = (value - b) / m;
    const given = lin === 'x' ? p[1] : p[0];
    const actual = valueAt(quad, t);
    steps.push({
      text:
        actual === given
          ? `$${letter(i)}$: $${polyTex([m, b])} = ${value}$ gives $t = ${t}$, and then $${other} = ${actual}$. It is on the curve.`
          : `$${letter(i)}$: $${polyTex([m, b])} = ${value}$ gives $t = ${t}$, but then $${other} = ${actual}$, not $${given}$. It is not on the curve.`,
    });
  });
  return steps;
}

/**
 * The points on the curve placed in the order they are traced.
 *
 * One listed point is not on the curve and is the tile left over. The letters
 * are assigned in order of the quadratic coordinate, which is the order a
 * learner who joins the dots left to right (or bottom to top) would use.
 */
const pskOrder: Generator<OrderParams> = {
  id: 'psk-order',
  sample: (rng, difficulty) => sampleOrder(rng, difficulty, difficulty >= 2 ? 4 : 3, true),
  choices: (params) => {
    const answer = orderAnswer(params);
    const arrow = (letters: string[]) => letters.join(' \\to ');
    const points = listed(params);
    const alphabetical = points.map((_, i) => letter(i)).filter((l) => answer.includes(l));
    const offLetter = letter(points.findIndex((point) => point.t === null));
    const withOff = [...answer.slice(0, -1), offLetter];
    const swapped = [answer[1], answer[0], ...answer.slice(2)];
    const all = options(
      { tex: arrow(answer) },
      { tex: arrow([...answer].reverse()) },
      { tex: arrow(alphabetical) },
      { tex: arrow(withOff) },
      { tex: arrow(swapped) },
    );
    return steered(all.slice(0, 4), mix(params.m, params.b, ...params.ts), all.slice(4));
  },
  render: (params): Slide => {
    const answer = orderAnswer(params);
    const points = listed(params);
    return {
      kind: 'tiles',
      prompt: [
        ...traced(orderCurve(params)),
        prose(`${answer.length} of these points lie on it. In what order does it pass through them as $t$ increases?`),
        pointsDisplay(params),
      ],
      template: answer.map((_, i) => `{${i}}`).join(' \\to '),
      bank: tokenBank(answer, points.map((_, i) => letter(i)), 1),
      answer,
    };
  },
  solution: (params) => [
    ...findTSteps(params),
    { text: `In order of $t$: $${orderAnswer(params).join(' \\to ')}$.` },
  ],
};

/** Which of four points on the curve is reached first, or last. */
export interface FirstParams extends OrderParams {
  last: boolean;
}

const firstOf = (params: FirstParams): number => {
  const ts = params.ts;
  return params.last ? Math.max(...ts) : Math.min(...ts);
};

/**
 * Which listed point the curve reaches first (or last) as t increases.
 *
 * Native choice, the points listed in an order turned by the question's own
 * numbers. The point furthest left, or lowest, is always on offer, and is the
 * reflex answer.
 */
const pskFirst: Generator<FirstParams> = {
  id: 'psk-first',
  sample: (rng, difficulty) => ({ ...sampleOrder(rng, difficulty, 4, false), last: difficulty >= 2 && rng.chance(0.5) }),
  render: (params): Slide => {
    const curve = orderCurve(params);
    const target = firstOf(params);
    const points = turned(
      params.ts.map((t) => ({ t, p: pointAt(curve, t) })).sort((a, b) => a.t - b.t),
      mix(params.m, params.b, ...params.quad) % 4,
    );
    return {
      kind: 'choice',
      prompt: [
        ...traced(curve),
        prose(`As $t$ increases, which of these points does it reach ${params.last ? 'last' : 'first'}?`),
      ],
      options: points.map(({ t, p }) => ({ id: `t${t}`, label: pair(...p), tex: true })),
      correctId: `t${target}`,
    };
  },
  solution: (params) => {
    const curve = orderCurve(params);
    const { lin, m, b } = params;
    const steps: SolutionStep[] = [
      { text: `Find $t$ at each point from the linear equation, $${lin} = ${polyTex([m, b])}$.` },
    ];
    for (const t of [...params.ts].sort((p, q) => p - q)) {
      steps.push({ text: `$${pair(...pointAt(curve, t))}$ is where $t = ${t}$.` });
    }
    const target = firstOf(params);
    steps.push({
      text: `The ${params.last ? 'largest' : 'smallest'} $t$ is $${target}$, so it reaches $${pair(...pointAt(curve, target))}$ ${params.last ? 'last' : 'first'}.`,
    });
    return steps;
  },
};

/* ---------- Which way the point travels ---------- */

export interface HeadingParams {
  curve: ParamCurve;
  k: number;
}

export type Heading = 'right-up' | 'right-down' | 'left-up' | 'left-down';

export function heading({ curve, k }: HeadingParams): Heading {
  const dx = valueAt(derived(curve.x), k);
  const dy = valueAt(derived(curve.y), k);
  return `${dx > 0 ? 'right' : 'left'}-${dy > 0 ? 'up' : 'down'}` as Heading;
}

/**
 * Which way the point is moving at a value of t, from the signs of the two
 * rates. Four options always in the same order, as a compass would list them:
 * each is right a quarter of the time.
 */
const pskHeading: Generator<HeadingParams> = {
  id: 'psk-heading',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const line = randomPoly(rng, 1, 3);
      const quad = randomPoly(rng, 2, hard ? 3 : 2);
      const curve = hard && rng.chance(0.5) ? { x: quad, y: rng.chance(0.5) ? line : randomPoly(rng, 2, 2) } : { x: line, y: quad };
      const k = rng.int(hard ? -3 : -2, 3);
      if (valueAt(derived(curve.x), k) === 0 || valueAt(derived(curve.y), k) === 0) continue;
      return { curve, k };
    }
  },
  render: (params): Slide => ({
    kind: 'choice',
    prompt: [...traced(params.curve), prose(`As $t$ increases through $t = ${params.k}$, which way is the point moving?`)],
    options: [
      { id: 'right-up', label: 'Right and up' },
      { id: 'right-down', label: 'Right and down' },
      { id: 'left-up', label: 'Left and up' },
      { id: 'left-down', label: 'Left and down' },
    ],
    correctId: heading(params),
  }),
  solution: ({ curve, k }) => {
    const dx = valueAt(derived(curve.x), k);
    const dy = valueAt(derived(curve.y), k);
    return [
      { text: `Differentiate each equation and put in $t = ${k}$.`, tex: `${DXDT} = ${polyTex(derived(curve.x))}` },
      { tex: `${DXDT} = ${dx} \\text{ at } t = ${k}` },
      { tex: `${DYDT} = ${polyTex(derived(curve.y))}` },
      { tex: `${DYDT} = ${dy} \\text{ at } t = ${k}` },
      {
        text: `$${DXDT}$ is ${dx > 0 ? 'positive, so $x$ is increasing: right' : 'negative, so $x$ is decreasing: left'}. $${DYDT}$ is ${dy > 0 ? 'positive, so $y$ is increasing: up' : 'negative, so $y$ is decreasing: down'}.`,
      },
    ];
  },
};

/* ---------- Circles ---------- */

export interface CircleParams {
  /** `cs`: x takes the cosine, y the sine. `sc`: the other way round. */
  form: 'cs' | 'sc';
  /** A minus sign on the sine term, which reverses the direction. */
  flip: boolean;
  h: number;
  k: number;
  r: number;
  /** The quarter turn asked about: t = q pi / 2. */
  q: number;
}

/** `2 + 3\cos t`, `-3\sin t`, `1 - 4\sin t`. */
export function trigTex(centre: number, amp: number, fn: 'cos' | 'sin'): string {
  const size = Math.abs(amp) === 1 ? '' : `${Math.abs(amp)}`;
  const term = `${size}\\${fn} t`;
  if (centre === 0) return amp < 0 ? `-${term}` : term;
  return `${centre} ${amp < 0 ? '-' : '+'} ${term}`;
}

/** [centre, amplitude, function] for x and then y. */
export function circleParts({ form, flip, h, k, r }: CircleParams): [[number, number, 'cos' | 'sin'], [number, number, 'cos' | 'sin']] {
  const s = flip ? -r : r;
  return form === 'cs'
    ? [
        [h, r, 'cos'],
        [k, s, 'sin'],
      ]
    : [
        [h, s, 'sin'],
        [k, r, 'cos'],
      ];
}

export function circleTex(params: CircleParams): string {
  const [[h, a, f], [k, b, g]] = circleParts(params);
  return `x = ${trigTex(h, a, f)} \\qquad y = ${trigTex(k, b, g)}`;
}

/** cos and sin of q pi / 2, exactly. */
const QUARTER: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const QUARTER_TEX = ['0', '\\frac{\\pi}{2}', '\\pi', '\\frac{3\\pi}{2}'];

export function circleAt(params: CircleParams, q: number): [number, number] {
  const [c, s] = QUARTER[((q % 4) + 4) % 4];
  const value = ([centre, amp, fn]: [number, number, 'cos' | 'sin']) => centre + amp * (fn === 'cos' ? c : s) + 0;
  const [xp, yp] = circleParts(params);
  return [value(xp), value(yp)];
}

/** Anticlockwise for x = cos, y = sin; each swap or minus sign turns it round. */
export const anticlockwise = ({ form, flip }: CircleParams): boolean => (form === 'cs') !== flip;

/** The first move from the start: `up`/`down` for the cosine-sine form, `right`/`left` for the other. */
export function firstMove({ form, flip }: CircleParams): 'up' | 'down' | 'left' | 'right' {
  if (form === 'cs') return flip ? 'down' : 'up';
  return flip ? 'left' : 'right';
}

function sampleCircle(rng: Rng, difficulty: number): CircleParams {
  const hard = difficulty >= 2;
  return {
    form: rng.chance(0.5) ? 'cs' : 'sc',
    flip: hard && rng.chance(0.5),
    h: rng.int(-4, 4),
    k: rng.int(-4, 4),
    r: rng.int(2, 5),
    q: hard ? rng.int(1, 3) : rng.int(0, 3),
  };
}

/** The same circle with cosine and sine traded between the coordinates. */
const otherForm = (params: CircleParams): CircleParams => ({ ...params, form: params.form === 'cs' ? 'sc' : 'cs' });

const circlePrompt = (params: CircleParams): Block[] => [prose('A circle is traced by'), display(circleTex(params))];

/**
 * Where the point is at a quarter turn, as tiles.
 *
 * The bank carries the point the other pairing of sine and cosine would give,
 * which is the slip of reading `cos` for `sin`, and the point half a turn on.
 */
const pskQuarter: Generator<CircleParams> = {
  id: 'psk-quarter',
  sample: sampleCircle,
  choices: (params) => {
    const [x, y] = circleAt(params, params.q);
    const [ox, oy] = circleAt(otherForm(params), params.q);
    const [px, py] = circleAt(params, params.q + 2);
    const [nx, ny] = circleAt(params, params.q + 1);
    const all = options(
      { tex: pair(x, y) },
      { tex: pair(ox, oy) },
      { tex: pair(px, py) },
      { tex: pair(params.h, params.k) },
      { tex: pair(nx, ny) },
      { tex: pair(y, x) },
    );
    return steered(all.slice(0, 4), mix(params.h, params.k, params.r, params.q), all.slice(4));
  },
  render: (params): Slide => {
    const [x, y] = circleAt(params, params.q);
    const [ox, oy] = circleAt(otherForm(params), params.q);
    const [px, py] = circleAt(params, params.q + 2);
    return {
      kind: 'tiles',
      prompt: [...circlePrompt(params), prose(`Where is the point when $t = ${QUARTER_TEX[params.q]}$?`)],
      template: '({0}, {1})',
      bank: numberBank([x, y], [ox, oy, px, py, params.h, params.k]),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: (params) => {
    const [c, s] = QUARTER[params.q];
    const [x, y] = circleAt(params, params.q);
    const t = QUARTER_TEX[params.q];
    return [
      { text: `At $t = ${t}$:`, tex: `\\cos ${t} = ${c} \\qquad \\sin ${t} = ${s}` },
      { text: 'Put these into each equation.', tex: `x = ${x} \\qquad y = ${y}` },
      { text: `So the point is $${pair(x, y)}$.` },
    ];
  },
};

const MOVE_LABEL = { up: 'Up', down: 'Down', left: 'Left', right: 'Right' } as const;
const MOVE_MEANS = {
  up: '$y$ rises',
  down: '$y$ falls',
  left: '$x$ falls',
  right: '$x$ rises',
} as const;

/** The first move a way round makes from a start point on the circle. */
function moveFor(params: CircleParams, anti: boolean): 'up' | 'down' | 'left' | 'right' {
  // Starting on the right of the centre, anticlockwise goes up; starting on top, it goes left.
  if (params.form === 'cs') return anti ? 'up' : 'down';
  return anti ? 'left' : 'right';
}

/**
 * Where a circle starts and which way round it goes, as three decisions: the
 * point at t = 0, the first move from it, and so the direction.
 */
const pskCircleFlow: Generator<CircleParams> = {
  id: 'psk-circle-flow',
  sample: sampleCircle,
  render: (params): Slide => {
    const start = circleAt(params, 0);
    const wrongStart = circleAt(otherForm(params), 0);
    const centre: [number, number] = [params.h, params.k];
    const move = firstMove(params);
    const anti = anticlockwise(params);
    const way = anti ? 'Anticlockwise' : 'Clockwise';
    const notWay = anti ? 'Clockwise' : 'Anticlockwise';
    const salt = mix(params.h, params.k, params.r, params.flip ? 1 : 0, params.form === 'cs' ? 1 : 0);
    const cosOn = params.form === 'cs' ? 'x' : 'y';
    const cosOff = params.form === 'cs' ? 'y' : 'x';
    return {
      kind: 'flow',
      prompt: [...circlePrompt(params), prose('Where does it start, and which way round does it go?')],
      subject: '\\cos 0 = 1 \\qquad \\sin 0 = 0',
      steps: [
        {
          id: 'start',
          ask: 'Where is the point when $t = 0$?',
          branches: turned(
            [
              { label: `$${pair(...start)}$`, to: 'move' },
              {
                label: `$${pair(...wrongStart)}$`,
                outcome: `$${pair(...wrongStart)}$ is where it would start with $\\cos t$ in the $${cosOff}$ equation. Here $\\cos t$ is in the $${cosOn}$ equation.`,
              },
              {
                label: `$${pair(...centre)}$`,
                outcome: `$${pair(...centre)}$ is the centre. The point stays $${params.r}$ away from it all the way round.`,
              },
            ],
            salt % 3,
          ),
        },
        {
          id: 'move',
          ask: 'Just after $t = 0$, which way does it move?',
          branches: (['up', 'down', 'left', 'right'] as const).map((dir) =>
            dir === move
              ? { label: MOVE_LABEL[dir], to: 'way' }
              : { label: MOVE_LABEL[dir], outcome: `Moving ${dir} would mean ${MOVE_MEANS[dir]} just after $t = 0$.` },
          ),
        },
        {
          id: 'way',
          ask: `So which way round does it go from $${pair(...start)}$?`,
          branches: turned(
            [
              { label: way, outcome: `${way} from $${pair(...start)}$, once round as $t$ runs from $0$ to $2\\pi$.` },
              {
                label: notWay,
                outcome: `Going ${notWay.toLowerCase()} from $${pair(...start)}$, its first move would be ${moveFor(params, !anti)}.`,
              },
            ],
            (salt >>> 3) % 2,
          ),
        },
      ],
      answer: [`$${pair(...start)}$`, MOVE_LABEL[move], way],
    };
  },
  solution: (params) => circleSolution(params),
};

function circleSolution(params: CircleParams): SolutionStep[] {
  const start = circleAt(params, 0);
  const [[, , fx], [, , fy]] = circleParts(params);
  const move = firstMove(params);
  const rising = move === 'up' || move === 'right';
  const coord = move === 'up' || move === 'down' ? 'y' : 'x';
  const sinSign = params.flip ? 'minus' : 'plus';
  return [
    { text: `At $t = 0$, $\\cos t = 1$ and $\\sin t = 0$, so it starts at $${pair(...start)}$.` },
    {
      text: `$\\sin t$ grows from $0$ as $t$ increases, and it is in the $${fx === 'sin' ? 'x' : 'y'}$ equation with a ${sinSign} sign, so $${coord}$ ${rising ? 'rises' : 'falls'}: the point moves ${move}. ($\\cos t$, in the $${fy === 'cos' ? 'y' : 'x'}$ equation, barely changes at first.)`,
    },
    {
      text: `Moving ${move} from the ${params.form === 'cs' ? 'right-hand' : 'top'} point of the circle is ${anticlockwise(params) ? 'anticlockwise' : 'clockwise'}.`,
    },
  ];
}

/**
 * The start and the direction together, from four options: the right start
 * or the other pairing's, each either way round.
 */
const pskSense: Generator<CircleParams> = {
  id: 'psk-sense',
  sample: sampleCircle,
  render: (params): Slide => {
    const start = pair(...circleAt(params, 0));
    const other = pair(...circleAt(otherForm(params), 0));
    const anti = anticlockwise(params);
    const opts = [
      { id: 'right-anti', label: `\\text{Anticlockwise from } ${start}`, tex: true },
      { id: 'right-clock', label: `\\text{Clockwise from } ${start}`, tex: true },
      { id: 'other-anti', label: `\\text{Anticlockwise from } ${other}`, tex: true },
      { id: 'other-clock', label: `\\text{Clockwise from } ${other}`, tex: true },
    ];
    return {
      kind: 'choice',
      prompt: [...circlePrompt(params), prose('Where does it start, and which way round does it go?')],
      options: turned(opts, mix(params.h, params.k, params.r, params.form === 'cs' ? 3 : 5) % 4),
      correctId: anti ? 'right-anti' : 'right-clock',
    };
  },
  solution: (params) => circleSolution(params),
};

/* ---------- A curve with ends ---------- */

export interface EndsParams {
  curve: ParamCurve;
  lo: number;
  hi: number;
}

/**
 * Where a curve drawn for lo <= t <= hi starts and ends, as tiles.
 *
 * The bank carries the point at t = 0, which is where a curve "starts" only
 * when the interval does.
 */
const pskEnds: Generator<EndsParams> = {
  id: 'psk-ends',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const x = randomPoly(rng, rng.pick([1, 2]), hard ? 3 : 2);
      const y = randomPoly(rng, rng.pick([1, 2]), hard ? 3 : 2);
      if (x.length === 2 && y.length === 2) continue;
      const lo = rng.int(hard ? -3 : -2, 1);
      const hi = lo + rng.int(2, 4);
      const curve = { x, y };
      const [xs, ys] = pointAt(curve, lo);
      const [xe, ye] = pointAt(curve, hi);
      if ([xs, ys, xe, ye].some((v) => Math.abs(v) > 20)) continue;
      if (xs === xe && ys === ye) continue;
      return { curve, lo, hi };
    }
  },
  choices: ({ curve, lo, hi }) => {
    const s = pointAt(curve, lo);
    const e = pointAt(curve, hi);
    const z = pointAt(curve, 0);
    const b = pointAt(curve, hi - 1);
    const arrow = (p: [number, number], q: [number, number]) => `${pair(...p)} \\to ${pair(...q)}`;
    const all = options(
      { tex: arrow(s, e) },
      { tex: arrow(e, s) },
      { tex: arrow(z, e) },
      { tex: arrow([s[1], s[0]], [e[1], e[0]]) },
      { tex: arrow(s, b) },
      { tex: arrow(z, b) },
    );
    return steered(all.slice(0, 4), mix(lo, hi, ...curve.x, ...curve.y), all.slice(4));
  },
  render: ({ curve, lo, hi }): Slide => {
    const [xs, ys] = pointAt(curve, lo);
    const [xe, ye] = pointAt(curve, hi);
    const [xz, yz] = pointAt(curve, 0);
    return {
      kind: 'tiles',
      prompt: [
        ...traced(curve),
        prose(`It is drawn only for $${lo} \\le t \\le ${hi}$. Where does it start and where does it end?`),
      ],
      template: '({0}, {1}) \\to ({2}, {3})',
      bank: numberBank([xs, ys, xe, ye], [xz, yz, ...pointAt(curve, hi - 1), -xs, -ye]),
      answer: [xs, ys, xe, ye].map(String),
    };
  },
  solution: ({ curve, lo, hi }) => [
    { text: `It starts at the smallest $t$, $t = ${lo}$.`, tex: worked('x', curve.x, lo) },
    { tex: worked('y', curve.y, lo) },
    { text: `It ends at the largest $t$, $t = ${hi}$.`, tex: worked('x', curve.x, hi) },
    { tex: worked('y', curve.y, hi) },
    { text: `So it runs from $${pair(...pointAt(curve, lo))}$ to $${pair(...pointAt(curve, hi))}$.` },
  ],
};

/* ---------- The values a curve covers ---------- */

export interface RangeParams {
  /** The coordinate that is a quadratic, and is asked about. */
  coord: 'x' | 'y';
  a: number;
  h: number;
  c: number;
  /** The other coordinate, m t + b. */
  m: number;
  b: number;
  lo: number;
  hi: number;
}

export const rangeCurve = ({ coord, a, h, c, m, b }: RangeParams): ParamCurve =>
  coord === 'x' ? { x: vertexPoly(a, h, c), y: [m, b] } : { x: [m, b], y: vertexPoly(a, h, c) };

/** The smallest and largest value of the quadratic coordinate over the interval. */
export function coverage(params: RangeParams): [number, number] {
  const quad = vertexPoly(params.a, params.h, params.c);
  const ends = [valueAt(quad, params.lo), valueAt(quad, params.hi)];
  const inside = params.lo < params.h && params.h < params.hi;
  const values = inside ? [...ends, params.c] : ends;
  return [Math.min(...values), Math.max(...values)];
}

/** The number line's window: the set with room either side, at most twelve steps. */
export function rangeWindow(params: RangeParams): [number, number] {
  const [lo, hi] = coverage(params);
  const width = hi - lo;
  const extra = Math.max(0, 6 - width);
  const left = 1 + Math.floor(extra / 2);
  return [lo - left, hi + 1 + extra - Math.floor(extra / 2)];
}

/**
 * The set of values of x (or y) a curve covers on a restricted interval of t,
 * shaded on a number line.
 *
 * The trap is the turning point inside the interval: x = t^2 on -1 <= t <= 3
 * covers 0 <= x <= 9, not 1 <= x <= 9, which is what the two ends alone give.
 * Most draws put the turning point strictly inside for that reason.
 */
const pskRange: Generator<RangeParams> = {
  id: 'psk-range',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const a = hard ? rng.pick([1, -1]) : 1;
      const h = rng.int(-2, 2);
      const trap = rng.chance(0.7);
      let lo: number;
      let hi: number;
      if (trap) {
        lo = h - rng.int(1, 2);
        hi = h + rng.int(1, 3);
      } else if (rng.chance(0.5)) {
        // Wholly after the turn, perhaps starting on it.
        lo = h + rng.int(0, 1);
        hi = lo + rng.int(2, 3);
      } else {
        hi = h - rng.int(0, 1);
        lo = hi - rng.int(2, 3);
      }
      const params: RangeParams = {
        coord: rng.chance(0.5) ? 'x' : 'y',
        a,
        h,
        c: rng.int(-4, 4),
        m: rng.pick([1, 2, -1, -2]),
        b: rng.int(-3, 3),
        lo,
        hi,
      };
      const inside = lo < h && h < hi;
      if (inside !== trap) continue;
      const [cLo, cHi] = coverage(params);
      if (cHi - cLo < 2 || cHi - cLo > 9) continue;
      return params;
    }
  },
  choices: (params) => {
    const [lo, hi] = coverage(params);
    const quad = vertexPoly(params.a, params.h, params.c);
    const e1 = valueAt(quad, params.lo);
    const e2 = valueAt(quad, params.hi);
    const v = params.coord;
    const set = (p: number, q: number) => `${p} \\le ${v} \\le ${q}`;
    const all = options(
      { tex: set(lo, hi) },
      { tex: set(Math.min(e1, e2), Math.max(e1, e2)) },
      { tex: set(params.lo, params.hi) },
      { tex: set(Math.min(lo, params.c), Math.max(hi, params.c) + 1) },
      { tex: set(lo - 1, hi) },
      { tex: set(lo, hi + 1) },
      { tex: set(lo + 1, hi) },
    );
    return steered(all.slice(0, 4), mix(params.h, params.c, params.lo, params.hi, params.a), all.slice(4));
  },
  render: (params): Slide => {
    const [lo, hi] = coverage(params);
    const [min, max] = rangeWindow(params);
    return {
      kind: 'numberLine',
      prompt: [
        ...traced(rangeCurve(params)),
        prose(`It is drawn only for $${params.lo} \\le t \\le ${params.hi}$. Which values of $${params.coord}$ does it cover?`),
      ],
      min,
      max,
      step: 1,
      answer: `[${lo},${hi}]`,
    };
  },
  solution: (params) => {
    const quad = vertexPoly(params.a, params.h, params.c);
    const v = params.coord;
    const [lo, hi] = coverage(params);
    const inside = params.lo < params.h && params.h < params.hi;
    const rate = v === 'x' ? DXDT : DYDT;
    return [
      { text: `At the ends: $t = ${params.lo}$ and $t = ${params.hi}$.`, tex: `${worked(v, quad, params.lo)} \\qquad ${worked(v, quad, params.hi)}` },
      { text: `$${v}$ turns where $${rate} = 0$.`, tex: `${polyTex(derived(quad))} = 0 \\quad t = ${params.h}` },
      inside
        ? {
            text: `$t = ${params.h}$ is inside the interval, so $${v}$ reaches $${params.c}$ there before turning back.`,
          }
        : {
            text: `$t = ${params.h}$ is outside the interval, so $${v}$ only rises or only falls between the ends.`,
          },
      { text: `So it covers $${lo} \\le ${v} \\le ${hi}$.` },
    ];
  },
};

/* ---------- Leftmost, rightmost, highest and lowest ---------- */

export interface TurnParams {
  /** The coordinate that is a quadratic, a (t - h)^2 + c. */
  coord: 'x' | 'y';
  a: number;
  h: number;
  c: number;
  /** The other coordinate: linear, or a quadratic turning somewhere else. */
  other: number[];
}

export const turnQuad = ({ a, h, c }: TurnParams): number[] => vertexPoly(a, h, c);

export const turnCurve = (params: TurnParams): ParamCurve =>
  params.coord === 'x' ? { x: turnQuad(params), y: params.other } : { x: params.other, y: turnQuad(params) };

/** leftmost, rightmost, lowest or highest. */
export function extremeWord({ coord, a }: TurnParams): string {
  if (coord === 'x') return a > 0 ? 'leftmost' : 'rightmost';
  return a > 0 ? 'lowest' : 'highest';
}

/** The extreme point: at t = h. */
export const extremePoint = (params: TurnParams): [number, number] => pointAt(turnCurve(params), params.h);

function sampleTurn(rng: Rng, difficulty: number, limit: number): TurnParams {
  const hard = difficulty >= 2;
  for (;;) {
    const params: TurnParams = {
      coord: rng.chance(0.5) ? 'x' : 'y',
      a: hard ? rng.pick([1, 2, -1, -2]) : rng.pick([1, -1]),
      h: rng.int(-3, 3),
      c: rng.int(-limit, limit),
      other: hard && rng.chance(0.4) ? randomPoly(rng, 2, 2) : randomPoly(rng, 1, 3),
    };
    if (params.h === 0 || params.c === 0) continue;
    // A second quadratic turning at the same t would make the point there a corner of both.
    if (params.other.length === 3 && valueAt(derived(params.other), params.h) === 0) continue;
    const [x, y] = extremePoint(params);
    if (Math.abs(x) > limit || Math.abs(y) > limit) continue;
    return params;
  }
}

/** The lines that find the extreme point by setting the rate to zero. */
function turnSteps(params: TurnParams): SolutionStep[] {
  const quad = turnQuad(params);
  const rate = params.coord === 'x' ? DXDT : DYDT;
  const curve = turnCurve(params);
  const word = extremeWord(params);
  const [x, y] = extremePoint(params);
  return [
    {
      text: `$${params.coord}$ is a quadratic in $t$ ${params.a > 0 ? 'with a positive' : 'with a negative'} $t^{2}$ term, so it has a ${params.a > 0 ? 'smallest' : 'largest'} value, where $${rate} = 0$. That gives the ${word} point.`,
      tex: `${rate} = ${polyTex(derived(quad))} = 0`,
    },
    { tex: `t = ${params.h}` },
    { text: `Put $t = ${params.h}$ into both equations.`, tex: worked('x', curve.x, params.h) },
    { tex: worked('y', curve.y, params.h) },
    { text: `The ${word} point is $${pair(x, y)}$.` },
  ];
}

/**
 * The extreme point as a tree: the t where the quadratic coordinate's rate is
 * zero, then x and y there.
 */
const pskTurn: Generator<TurnParams> = {
  id: 'psk-turn',
  sample: (rng, difficulty) => sampleTurn(rng, difficulty, 12),
  choices: (params) => {
    const curve = turnCurve(params);
    const [x, y] = extremePoint(params);
    const all = options(
      { tex: pair(x, y) },
      { tex: pair(...pointAt(curve, 0)) },
      { tex: pair(...pointAt(curve, -params.h)) },
      { tex: pair(y, x) },
      { tex: pair(...pointAt(curve, params.h + 1)) },
      { tex: pair(...pointAt(curve, params.h - 1)) },
    );
    return steered(all.slice(0, 4), mix(params.h, params.c, params.a, ...params.other), all.slice(4));
  },
  render: (params): Slide => {
    const curve = turnCurve(params);
    const quad = turnQuad(params);
    const [x, y] = extremePoint(params);
    const rate = params.coord === 'x' ? DXDT : DYDT;
    return {
      kind: 'tree',
      prompt: [
        ...traced(curve),
        prose(
          `Find its ${extremeWord(params)} point, from the value of $t$ where $${rate} = 0$.`,
        ),
      ],
      expression: `${polyTex(derived(quad))} = 0`,
      nodes: [
        { id: 't', from: [] },
        { id: 'x', from: ['t'] },
        { id: 'y', from: ['t'] },
      ],
      bank: treeBank([params.h, x, y], [-params.h, ...pointAt(curve, 0), ...pointAt(curve, -params.h), params.a * params.h]),
      answer: [params.h, x, y].map(String),
    };
  },
  solution: turnSteps,
};

/**
 * The extreme value slid to on the picture: a position across for leftmost
 * or rightmost, a height for highest or lowest.
 */
const pskExtremeSlider: Generator<TurnParams> = {
  id: 'psk-extreme-slider',
  // An untouched slider rests at 0, so the sampler never makes 0 the answer.
  sample: (rng, difficulty) => sampleTurn(rng, difficulty, 6),
  render: (params): Slide => {
    const curve = turnCurve(params);
    const span = 8;
    const across = params.coord === 'x';
    return {
      kind: 'slider',
      prompt: [
        ...traced(curve),
        prose(
          across
            ? `Slide the line across to its ${extremeWord(params)} point.`
            : `Slide the line to the height of its ${extremeWord(params)} point.`,
        ),
      ],
      min: -span,
      max: span,
      step: 1,
      answer: params.c,
      readout: across ? 'x = {v}' : 'y = {v}',
      figure: {
        svg: paramSvg((t) => pointAt(curve, t), {
          span,
          tMin: params.h - 6,
          tMax: params.h + 6,
          label: 'The curve traced as t runs',
        }),
        xMin: -span,
        xMax: span,
        axis: across ? 'x' : 'y',
      },
    };
  },
  solution: (params) => {
    const steps = turnSteps(params);
    return [
      ...steps.slice(0, 2),
      { text: `Put $t = ${params.h}$ into the $${params.coord}$ equation.`, tex: worked(params.coord, turnQuad(params), params.h) },
      { text: `So the line goes at $${params.coord} = ${params.c}$.` },
    ];
  },
};

/**
 * The smallest or largest value of the quadratic coordinate, by completing
 * the square: a (t - h)^2 + c is never below c when a is positive.
 */
const pskSquare: Generator<TurnParams> = {
  id: 'psk-square',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleTurn(rng, difficulty, 12);
      if (Math.abs(params.a) === 1) return params;
    }
  },
  choices: (params) => {
    const quad = turnQuad(params);
    return numberChoices(params.c, [quad[2], params.h, -params.c, params.c + params.h], mix(params.h, params.c, params.a));
  },
  render: (params): Slide => {
    const most = params.a > 0 ? 'smallest' : 'largest';
    return {
      kind: 'expression',
      prompt: [
        ...traced(turnCurve(params)),
        prose(`Complete the square in the $${params.coord}$ equation. What is the ${most} value of $${params.coord}$ on the curve?`),
      ],
      lead: `\\text{${most} } ${params.coord} =`,
      keypad: [],
      answer: `${params.c}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const quad = turnQuad(params);
    const v = params.coord;
    const inner = polyTex([1, -params.h]);
    const square = `(${inner})^{2}`;
    const shift = params.h * params.h;
    const lines: SolutionStep[] =
      params.a > 0
        ? [
            { text: 'Halve the coefficient of $t$ for the bracket.', tex: `${v} = ${polyTex(quad)}` },
            { tex: `${v} = ${square} - ${shift} ${params.c + shift < 0 ? '-' : '+'} ${Math.abs(params.c + shift)}` },
            { tex: `${v} = ${square} ${params.c < 0 ? '-' : '+'} ${Math.abs(params.c)}` },
            { text: `A square is never negative, so $${v}$ is smallest when the bracket is $0$, at $t = ${params.h}$.` },
          ]
        : [
            { text: 'Take out the minus sign first.', tex: `${v} = -(${polyTex([1, -2 * params.h])}) ${quad[2] < 0 ? '-' : '+'} ${Math.abs(quad[2])}` },
            { tex: `${v} = -${square} ${params.c < 0 ? '-' : '+'} ${Math.abs(params.c)}` },
            { text: `Minus a square is never positive, so $${v}$ is largest when the bracket is $0$, at $t = ${params.h}$.` },
          ];
    return [...lines, { text: `The ${params.a > 0 ? 'smallest' : 'largest'} value is $${v} = ${params.c}$.` }];
  },
};

/* ---------- Matching equations to a sketch ---------- */

export type Shape =
  | { kind: 'poly'; x: number[]; y: number[] }
  | { kind: 'trig'; x: [number, number, 'cos' | 'sin']; y: [number, number, 'cos' | 'sin'] };

export interface MatchParams {
  right: Shape;
  wrong: Shape[];
}

export const MATCH_SPAN = 6;

/**
 * A `paramSvg` drawing with faint lines at every whole number, so a point on
 * the sketch can be read off. `paramSvg` draws on a 220 unit square with the
 * window running edge to edge, which is all this needs to know.
 */
export function withGrid(svg: string, span: number): string {
  const SIZE = 220;
  const lines: string[] = [];
  for (let v = -span + 1; v < span; v += 1) {
    if (v === 0) continue;
    const at = ((SIZE * (v + span)) / (2 * span)).toFixed(1);
    lines.push(
      `<line x1="${at}" y1="0" x2="${at}" y2="${SIZE}" stroke="currentColor" stroke-width="0.5" opacity="0.18" />`,
      `<line x1="0" y1="${at}" x2="${SIZE}" y2="${at}" stroke="currentColor" stroke-width="0.5" opacity="0.18" />`,
    );
  }
  const open = svg.indexOf('>') + 1;
  return svg.slice(0, open) + lines.join('') + svg.slice(open);
}

export function shapeAt(shape: Shape): (t: number) => [number, number] {
  if (shape.kind === 'poly') return (t) => [valueAt(shape.x, t), valueAt(shape.y, t)];
  const part = ([c, a, fn]: [number, number, 'cos' | 'sin'], t: number) => c + a * (fn === 'cos' ? Math.cos(t) : Math.sin(t));
  return (t) => [part(shape.x, t), part(shape.y, t)];
}

export const shapeRange = (shape: Shape): [number, number] => (shape.kind === 'poly' ? [-5, 5] : [0, 2 * Math.PI]);

export function shapeTex(shape: Shape): string {
  if (shape.kind === 'poly') return `x = ${polyTex(shape.x)}, \\; y = ${polyTex(shape.y)}`;
  return `x = ${trigTex(...shape.x)}, \\; y = ${trigTex(...shape.y)}`;
}

const swapShape = (shape: Shape): Shape => ({ ...shape, x: shape.y, y: shape.x }) as Shape;

function negateShape(shape: Shape, axis: 'x' | 'y'): Shape {
  if (shape.kind === 'poly') {
    return axis === 'x' ? { ...shape, x: shape.x.map((c) => -c + 0) } : { ...shape, y: shape.y.map((c) => -c + 0) };
  }
  const neg = ([c, a, fn]: [number, number, 'cos' | 'sin']): [number, number, 'cos' | 'sin'] => [-c + 0, -a, fn];
  return axis === 'x' ? { ...shape, x: neg(shape.x) } : { ...shape, y: neg(shape.y) };
}

function shiftShape(shape: Shape, axis: 'x' | 'y', by: number): Shape {
  if (shape.kind === 'poly') {
    const bump = (p: number[]) => [...p.slice(0, -1), p[p.length - 1] + by];
    return axis === 'x' ? { ...shape, x: bump(shape.x) } : { ...shape, y: bump(shape.y) };
  }
  const bump = ([c, a, fn]: [number, number, 'cos' | 'sin']): [number, number, 'cos' | 'sin'] => [c + by, a, fn];
  return axis === 'x' ? { ...shape, x: bump(shape.x) } : { ...shape, y: bump(shape.y) };
}

export const shapesApart = (f: Shape, g: Shape): boolean =>
  curvesApart(shapeAt(f), shapeRange(f), shapeAt(g), shapeRange(g), MATCH_SPAN, VISIBLY_DIFFERENT);

function sampleShape(rng: Rng, difficulty: number): Shape {
  const hard = difficulty >= 2;
  if (hard && rng.chance(0.35)) {
    for (;;) {
      const a = rng.int(1, 4);
      const b = rng.int(1, 4);
      const h = rng.int(-2, 2);
      const k = rng.int(-2, 2);
      if (a === b || Math.abs(h) + a > 5 || Math.abs(k) + b > 5) continue;
      return { kind: 'trig', x: [h, a, 'cos'], y: [k, b, 'sin'] };
    }
  }
  const lead = hard ? rng.pick([1, -1]) : 1;
  const quad = [lead, 0, rng.int(-3, 3)];
  const line = [rng.pick(hard ? [1, 2, -1, -2] : [1, 2]), rng.int(-2, 2)];
  return rng.chance(0.5) ? { kind: 'poly', x: quad, y: line } : { kind: 'poly', x: line, y: quad };
}

/**
 * Which pair of equations draws the sketch.
 *
 * The wrong pairs are the curve with x and y swapped (a reflection in
 * y = x), with one sign turned over (a reflection in an axis) and with one
 * constant changed (a translation). A candidate that draws the same picture
 * as the right one, or as another option, is dropped: y = 2t and y = -2t
 * trace the same sideways parabola when x = t^2, only in the other direction.
 */
const pskMatch: Generator<MatchParams> = {
  id: 'psk-match',
  sample: (rng, difficulty) => {
    for (;;) {
      const right = sampleShape(rng, difficulty);
      const first = rng.chance(0.5) ? 'x' : 'y';
      const second = first === 'x' ? 'y' : 'x';
      const by = rng.pick([2, -2, 3, -3]);
      const candidates = [
        swapShape(right),
        negateShape(right, first),
        shiftShape(right, first, by),
        negateShape(right, second),
        shiftShape(right, second, by),
        shiftShape(right, first, -by),
      ];
      const wrong: Shape[] = [];
      for (const candidate of candidates) {
        if (wrong.length === 3) break;
        const drawn = [right, ...wrong];
        if (drawn.some((shape) => shapeTex(shape) === shapeTex(candidate))) continue;
        if (drawn.some((shape) => !shapesApart(shape, candidate))) continue;
        wrong.push(candidate);
      }
      if (wrong.length < 3) continue;
      return { right, wrong };
    }
  },
  render: ({ right, wrong }): Slide => {
    const start = shapeAt(right)(0).map((v) => Math.round(v * 1000) / 1000) as [number, number];
    const all = [right, ...wrong].map((shape, i) => ({ id: `o${i}`, label: shapeTex(shape), tex: true }));
    const numbers = shapeTex(right).split('').map((ch) => ch.charCodeAt(0));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'diagram',
          svg: withGrid(
            paramSvg(shapeAt(right), {
              span: MATCH_SPAN,
              tMin: shapeRange(right)[0],
              tMax: shapeRange(right)[1],
              marks: [start],
              label: 'A curve on a grid of unit squares, with a dot at the point where t = 0',
            }),
            MATCH_SPAN,
          ),
        },
        prose('Which pair of equations draws this curve? The dot is where $t = 0$.'),
      ],
      options: turned(all, mix(...numbers) % 4),
      correctId: 'o0',
    };
  },
  solution: ({ right }) => {
    const [x0, y0] = shapeAt(right)(0).map((v) => Math.round(v)) as [number, number];
    const steps: SolutionStep[] = [
      { text: `At $t = 0$ the right pair gives $${pair(x0, y0)}$, which is where the dot is.`, tex: shapeTex(right) },
    ];
    if (right.kind === 'poly') {
      const quadIsX = right.x.length === 3;
      const quad = quadIsX ? right.x : right.y;
      const word = quadIsX ? (quad[0] > 0 ? 'leftmost' : 'rightmost') : quad[0] > 0 ? 'lowest' : 'highest';
      steps.push({
        text: `$${quadIsX ? 'x' : 'y'} = ${polyTex(quad)}$ turns at $t = 0$, so the dot is also the ${word} point, and the curve opens ${quadIsX ? (quad[0] > 0 ? 'to the right' : 'to the left') : quad[0] > 0 ? 'upwards' : 'downwards'}.`,
      });
    } else {
      const [h, a] = right.x;
      const [k, b] = right.y;
      steps.push({
        text: `It is an ellipse centred at $${pair(h, k)}$, reaching $${a}$ either side of the centre across and $${b}$ above and below.`,
      });
    }
    steps.push({
      text: 'Swapping $x$ and $y$ reflects the curve in $y = x$, changing a sign reflects it in an axis, and changing a constant slides it along: each of those draws a different picture.',
    });
    return steps;
  },
};

/* ---------- Key points for a sketch ---------- */

export interface FeatureParams {
  /** x = a (t - h)^2 + c */
  a: number;
  h: number;
  c: number;
  /** y = m (t - r) */
  m: number;
  r: number;
}

export const featureCurve = ({ a, h, c, m, r }: FeatureParams): ParamCurve => ({ x: vertexPoly(a, h, c), y: [m, -m * r] });

/** [x at t = 0, y at t = 0, x at the turn, y at the turn, x on the x-axis]. */
export function featureValues(params: FeatureParams): number[] {
  const curve = featureCurve(params);
  const [x0, y0] = pointAt(curve, 0);
  const [xv, yv] = pointAt(curve, params.h);
  const [xr] = pointAt(curve, params.r);
  return [x0, y0, xv, yv, xr];
}

/**
 * A table of the points worth plotting first: where t = 0, the leftmost (or
 * rightmost) point, and where the curve meets the x-axis.
 */
const pskFeatures: Generator<FeatureParams> = {
  id: 'psk-features',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const params: FeatureParams = {
        a: hard ? rng.pick([1, -1]) : 1,
        h: rng.int(-3, 3),
        c: rng.int(-5, 5),
        m: rng.pick(hard ? [1, 2, 3, -1, -2, -3] : [1, 2, -1, -2]),
        r: rng.int(-3, 3),
      };
      if (params.h === 0 || params.r === 0 || params.r === params.h) continue;
      if (featureValues(params).some((v) => Math.abs(v) > 15)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const answer = featureValues(params);
    const curve = featureCurve(params);
    const slips = [
      ...pointAt(curve, -params.h),
      valueAt(curve.x, -params.r),
      params.m * params.r,
      params.a * params.h * params.h,
      -answer[0],
      -answer[3],
    ];
    return {
      kind: 'table',
      prompt: [...traced(curve), prose('Fill in the key points for a sketch.')],
      columns: ['\\text{Point}', 'x', 'y'],
      rows: [
        ['t = 0', null, null],
        [`\\text{${params.a > 0 ? 'leftmost' : 'rightmost'}}`, null, null],
        ['\\text{on the } x\\text{-axis}', null, '0'],
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const curve = featureCurve(params);
    const [x0, y0, xv, yv] = featureValues(params);
    return [
      { text: 'At $t = 0$:', tex: `x = ${x0} \\qquad y = ${y0}` },
      {
        text: `The ${params.a > 0 ? 'leftmost' : 'rightmost'} point is where $${DXDT} = 0$.`,
        tex: `${polyTex(derived(curve.x))} = 0 \\quad t = ${params.h}`,
      },
      { tex: `x = ${xv} \\qquad y = ${yv}` },
      { text: 'On the $x$-axis, $y = 0$.', tex: `${polyTex(curve.y)} = 0 \\quad t = ${params.r}` },
      { tex: worked('x', curve.x, params.r) },
    ];
  },
};

/* ---------- Reflecting a curve ---------- */

export type Mirror = 'y=x' | 'x-axis' | 'y-axis';

export interface ReflectParams {
  x: number[];
  y: number[];
  mirror: Mirror;
}

const MIRROR_TEX: Record<Mirror, string> = {
  'y=x': 'the line $y = x$',
  'x-axis': 'the $x$-axis',
  'y-axis': 'the $y$-axis',
};

const negPoly = (p: number[]): number[] => p.map((c) => -c + 0);

/** The four tokens, as [x-token, y-token] pairs for each mirror and for a half turn. */
export function reflectPairs({ x, y }: ReflectParams): Record<Mirror | 'turn', [number[], number[]]> {
  return {
    'y=x': [y, x],
    'x-axis': [x, negPoly(y)],
    'y-axis': [negPoly(x), y],
    turn: [negPoly(x), negPoly(y)],
  };
}

/**
 * The equations of a curve reflected in y = x or an axis, placed as tiles.
 *
 * The bank is the two original expressions and their negatives, so every way
 * of reflecting is buildable from it. A draw where some other pair of tiles
 * draws the same picture as the answer (a parabola whose axis is a
 * coordinate axis) is refused.
 */
const pskReflect: Generator<ReflectParams> = {
  id: 'psk-reflect',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const quad = vertexPoly(hard ? rng.pick([1, -1]) : 1, rng.pick([1, 2, -1, -2]), rng.int(-3, 3));
      const line = [rng.pick(hard ? [1, 2, 3, -1, -2, -3] : [1, 2, -1, -2]), rng.pick([1, 2, 3, -1, -2, -3])];
      const params: ReflectParams = {
        ...(rng.chance(0.5) ? { x: quad, y: line } : { x: line, y: quad }),
        mirror: rng.pick(['y=x', 'x-axis', 'y-axis'] as const),
      };
      // Every pair of tiles draws the curve moved by a reflection or a turn
      // (or a straight line). The parabola is symmetric only in its own axis,
      // so two pairs draw one picture only when that axis is a coordinate
      // axis: when the linear coordinate is 0 at the vertex. The independent
      // test samples every pair to confirm it.
      const vertexT = quad[1] / (-2 * quad[0]);
      if (valueAt(line, vertexT) === 0) continue;
      return params;
    }
  },
  choices: (params) => {
    const pairs = reflectPairs(params);
    const tex = ([px, py]: [number[], number[]]) => `x = ${polyTex(px)}, \\; y = ${polyTex(py)}`;
    const others = (['y=x', 'x-axis', 'y-axis', 'turn'] as const).filter((m) => m !== params.mirror);
    return steered(
      options({ tex: tex(pairs[params.mirror]) }, ...others.map((m) => ({ tex: tex(pairs[m]) }))),
      mix(...params.x, ...params.y, params.mirror.length),
    );
  },
  render: (params): Slide => {
    const [ax, ay] = reflectPairs(params)[params.mirror];
    const answer = [polyTex(ax), polyTex(ay)];
    const tokens = [params.x, params.y, negPoly(params.x), negPoly(params.y)].map((p) => polyTex(p));
    return {
      kind: 'tiles',
      prompt: [...traced(params), prose(`It is reflected in ${MIRROR_TEX[params.mirror]}. Which equations trace the reflection?`)],
      template: 'x = {0}, \\quad y = {1}',
      bank: tokenBank(answer, tokens),
      answer,
    };
  },
  solution: (params) => {
    const [ax, ay] = reflectPairs(params)[params.mirror];
    const rule =
      params.mirror === 'y=x'
        ? 'Reflecting in $y = x$ swaps the coordinates: the old $y$ becomes the new $x$, and the old $x$ the new $y$.'
        : params.mirror === 'x-axis'
          ? 'Reflecting in the $x$-axis keeps every $x$ and turns every $y$ into $-y$.'
          : 'Reflecting in the $y$-axis keeps every $y$ and turns every $x$ into $-x$.';
    return [{ text: rule }, { tex: `x = ${polyTex(ax)}` }, { tex: `y = ${polyTex(ay)}` }];
  },
};

export const paramSketchGenerators = [
  pskTable,
  pskOrder,
  pskFirst,
  pskHeading,
  pskQuarter,
  pskCircleFlow,
  pskSense,
  pskEnds,
  pskRange,
  pskTurn,
  pskExtremeSlider,
  pskSquare,
  pskMatch,
  pskFeatures,
  pskReflect,
] as Generator<unknown>[];
