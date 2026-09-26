/**
 * Algebraic and Partial Fractions, level 12: turning points and ranges of
 * rational functions.
 *
 * Level 5 read a fraction's graph off its rule: vertical and horizontal
 * asymptotes, holes and intercepts. This level finds what those miss. Setting
 * y = k and asking when the quadratic in x has real roots gives the values the
 * curve cannot take; the boundary values, where the discriminant is zero, are
 * the heights of the turning points, and the repeated root is their x. A top
 * one degree above the bottom divides into a slant line plus a leftover that
 * dies away: an oblique asymptote, approached from above or below. A curve
 * can cross its horizontal asymptote nearer in, never a vertical one, and
 * never the slant line of a quadratic over a linear bottom. The last lesson
 * puts all of it into one sketch.
 *
 * Two shapes of curve carry the turning points:
 *
 * - a quadratic over a linear bottom, built as (Ax + e)(x + d) + As^2 over
 *   x + d. Then the discriminant in k is (k - (e - Ad))^2 - (2As)^2, whose
 *   roots e - Ad -/+ 2As are whole, with turning points at x = -d -/+ s. The
 *   lower value is a maximum on the left branch and the upper a minimum on
 *   the right: the curve misses every value in between.
 * - a quadratic over a quadratic bottom that is never zero, drawn from a table
 *   searched once at load for whole boundary values and whole turning points.
 *   Its discriminant opens downwards, so the curve takes only the values
 *   between: the lower a minimum, the upper a maximum.
 *
 * Crossing questions build the top as A times the bottom plus m(x - x0), so
 * the x^2 terms cancel when the curve is set equal to A and x0 is the answer.
 *
 * As in the rest of the course the learner never types a fraction or a
 * polynomial; forms are placed from tiles or picked, and only numbers are
 * typed. `fractionsLevel12.test.ts` recomputes every answer from the rule the
 * learner is shown.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotFigure, plotSvg } from '../figures';
import { termTex } from './calculus';
import { say } from './format';
import { type Poly, divideBy, mulPoly, polyTex, scalePoly, subPoly, valueAt } from './polynomials';
import { windowFor } from './numberLine';
import {
  br,
  chain as alignedLines,
  choiceSlide,
  firstFour,
  frac,
  fracTerm,
  intOptions,
  numberBank,
  pbr,
  restingOn,
  show,
  signed,
  signedFracTerm,
  tileBank,
  turned,
} from './algebraicFractions';

/**
 * Lines of working aligned on their `&`, a minus that opens a cell kept as a
 * sign. KaTeX starts each aligned cell with an empty group, so `&-4k^{2}` is
 * set as a subtraction, "− 4k²" with a gap; `&{-}4k^{2}` reads as the negative.
 */
const chain = (...lines: string[]): string => alignedLines(...lines.map((line) => line.replace(/&(\s*)-/g, '&$1{-}')));

/* ================================================================
 * The curves
 * ================================================================ */

/** A curve y = top / bottom whose discriminant in k has whole roots. */
export interface Curve {
  /** Degree 2, highest power first. */
  top: Poly;
  /** Degree 1 (x + d) or degree 2 and never zero. */
  bottom: Poly;
  /** The roots of the discriminant in k, lo < hi. */
  lo: number;
  hi: number;
  /** The x of the turning point at y = lo, and at y = hi. */
  xLo: number;
  xHi: number;
  /** True for the quadratic bottom: y runs between lo and hi. */
  bounded: boolean;
}

/** (Ax + e)(x + d) + As^2 over x + d. */
export function quadOverLine(A: number, d: number, e: number, s: number): Curve {
  return {
    top: [A, A * d + e, e * d + A * s * s],
    bottom: [1, d],
    lo: e - A * d - 2 * A * s,
    hi: e - A * d + 2 * A * s,
    xLo: -d - s,
    xHi: -d + s,
    bounded: false,
  };
}

/**
 * Every quadratic over a never-zero quadratic, with small coefficients, whose
 * boundary values and turning points are whole. The horizontal asymptote A
 * sits strictly between the boundary values, so the curve reaches both ends
 * and the equation in x never drops to a linear one at an end.
 */
export const BOUNDED: Curve[] = (() => {
  const out: Curve[] = [];
  for (const A of [1, 2]) {
    for (let b = -8; b <= 8; b += 1) {
      for (let c = -9; c <= 12; c += 1) {
        for (let e = -4; e <= 4; e += 1) {
          for (let g = 1; g <= 10; g += 1) {
            if (e * e >= 4 * g || (b === A * e && c === A * g)) continue;
            const q = discPoly({ top: [A, b, c], bottom: [1, e, g] });
            const [q2, q1, q0] = q;
            const room = q1 * q1 - 4 * q2 * q0;
            const root = Math.round(Math.sqrt(Math.max(room, 0)));
            if (room <= 0 || root * root !== room) continue;
            const [lo, hi] = [(-q1 + root) / (2 * q2), (-q1 - root) / (2 * q2)].sort((u, v) => u - v);
            if (!Number.isInteger(lo) || !Number.isInteger(hi) || !(lo < A && A < hi) || Math.abs(lo) > 9 || Math.abs(hi) > 9) continue;
            const xLo = -(b - lo * e) / (2 * (A - lo));
            const xHi = -(b - hi * e) / (2 * (A - hi));
            if (!Number.isInteger(xLo) || !Number.isInteger(xHi)) continue;
            out.push({ top: [A, b, c], bottom: [1, e, g], lo, hi, xLo: xLo || 0, xHi: xHi || 0, bounded: true });
          }
        }
      }
    }
  }
  return out;
})();

/** A quadratic over x + d, its boundary values within `limit`. */
function sampleLinear(rng: Rng, A: number, sMax: number, limit: number): Curve {
  for (;;) {
    const c = quadOverLine(A, rng.int(-5, 5), rng.int(-5, 5), rng.int(1, sMax));
    if (Math.max(Math.abs(c.lo), Math.abs(c.hi)) <= limit) return c;
  }
}

/** Difficulty 1: a quadratic over x + d. Difficulty 2: a number in front, or half the time a quadratic bottom. */
function sampleCurve(rng: Rng, difficulty: number, keep: (c: Curve) => boolean = () => true): Curve {
  for (;;) {
    const c =
      difficulty < 2
        ? sampleLinear(rng, 1, 2, 12)
        : rng.chance(0.5)
          ? rng.pick(BOUNDED)
          : sampleLinear(rng, rng.int(1, 2), rng.int(1, 3), 15);
    if (keep(c)) return c;
  }
}

const f = (c: { top: Poly; bottom: Poly }) => (x: number): number => valueAt(c.top, x) / valueAt(c.bottom, x);
const lead = (c: Curve): number => c.top[0];
/** The slant line Ax + e and the leftover r over x + d, for a linear bottom. */
function divided(c: { top: Poly; bottom: Poly }): { line: Poly; r: number } {
  const { quotient, remainder } = divideBy(c.top, -c.bottom[1]);
  return { line: quotient, r: remainder };
}

const ruleTex = (c: { top: Poly; bottom: Poly }): string => `y = ${frac(polyTex(c.top), polyTex(c.bottom))}`;

/* ---------- the quadratic in x, with k in its coefficients ---------- */

/** Each coefficient of top - k * bottom, x^2 first, as [number, multiple of k]. */
function kLines(c: { top: Poly; bottom: Poly }): [number, number][] {
  const bottom = c.bottom.length === 2 ? [0, ...c.bottom] : c.bottom;
  return c.top.map((t, i): [number, number] => [t, -bottom[i]]);
}

/** A coefficient in k as the learner reads it: 3 - k, -2 - 2k, -k, 5. */
export function kTex(con: number, kc: number): string {
  if (kc === 0) return String(con);
  const size = Math.abs(kc) === 1 ? 'k' : `${Math.abs(kc)}k`;
  if (con === 0) return kc < 0 ? `-${size}` : size;
  return `${con} ${kc < 0 ? '-' : '+'} ${size}`;
}

/** One term of the quadratic in x after the first: + (3 - k)x, or - 4x when k has dropped out. */
function kTerm([con, kc]: [number, number], power: number): string {
  const x = power === 2 ? 'x^{2}' : power === 1 ? 'x' : '';
  if (kc === 0) {
    if (con === 0) return '';
    return `${con < 0 ? '-' : '+'} ${power === 0 ? Math.abs(con) : termTex(Math.abs(con), power)}`;
  }
  if (con === 0) return `${kc < 0 ? '-' : '+'} ${kTex(0, Math.abs(kc))}${x}`;
  return `+ (${kTex(con, kc)})${x}`;
}

/** The quadratic in x = 0 with k in it. */
export function kQuadTex(c: { top: Poly; bottom: Poly }): string {
  const [a2, a1, a0] = kLines(c);
  const first = a2[1] === 0 ? termTex(a2[0], 2) : a2[0] === 0 ? `${kTex(...a2)}x^{2}` : `(${kTex(...a2)})x^{2}`;
  return `${[first, kTerm(a1, 1), kTerm(a0, 0)].filter(Boolean).join(' ')} = 0`;
}

/** The discriminant of the quadratic in x, as a polynomial in k. */
export function discPoly(c: { top: Poly; bottom: Poly }): Poly {
  const [a2, a1, a0] = kLines(c).map(([con, kc]): Poly => [kc, con]);
  return subPoly(mulPoly(a1, a1), scalePoly(mulPoly(a2, a0), 4));
}

const inK = (p: Poly): string => polyTex(p).replace(/x/g, 'k');

/** (k - lo)(k - hi), a bracket for a root of 0 written as k alone. */
function factorK(lo: number, hi: number): string {
  const one = (r: number) => (r === 0 ? 'k' : `(k ${signed(-r)})`);
  return `${one(lo)}${one(hi)}`;
}

/** Which values y takes. */
export const rangeTex = (c: Curve): string =>
  c.bounded ? `${c.lo} \\leq y \\leq ${c.hi}` : `y \\leq ${c.lo} \\text{ or } y \\geq ${c.hi}`;

/** The same, as a number-line set. */
export const rangeSet = (c: Curve): string => (c.bounded ? `[${c.lo},${c.hi}]` : `(-inf,${c.lo}]|[${c.hi},inf)`);

/** The quadratic in x with k = K put in, multiplied out. */
const quadAt = (c: Curve, K: number): Poly => kLines(c).map(([con, kc]) => con + kc * K);

/** n(x - x0)^2 as the learner reads it. */
function squareTex(n: number, x0: number): string {
  const sq = x0 === 0 ? 'x^{2}' : `${pbr(-x0)}^{2}`;
  if (n === 1) return sq;
  if (n === -1) return `-${sq}`;
  return `${n}${sq}`;
}

/** What the turning point at y = K is. */
function kindAt(c: Curve, K: number): 'maximum' | 'minimum' {
  const low = K === c.lo;
  return c.bounded === low ? 'minimum' : 'maximum';
}

/** The x of the turning point at y = K. */
const xAt = (c: Curve, K: number): number => (K === c.lo ? c.xLo : c.xHi);

/** The working from y = k to the values the curve takes. */
function rangeSteps(c: Curve): SolutionStep[] {
  const q = discPoly(c);
  const steps: SolutionStep[] = [
    { text: 'Set $y = k$, multiply by the bottom and collect everything on one side:' },
    { tex: kQuadTex(c) },
    { text: 'That has a real root $x$ only when its discriminant is at least $0$:' },
    { tex: `${inK(q)} \\geq 0` },
  ];
  if (c.bounded) {
    steps.push(
      { text: `Divide by $${q[0]}$, which is negative, so the inequality turns round:` },
      { tex: `${factorK(c.lo, c.hi)} \\leq 0` },
      { text: `A product of two brackets is at most $0$ between its roots, so $${c.lo} \\leq k \\leq ${c.hi}$.` },
    );
  } else {
    steps.push(
      { tex: `${factorK(c.lo, c.hi)} \\geq 0` },
      { text: `A product of two brackets is at least $0$ outside its roots, so $k \\leq ${c.lo}$ or $k \\geq ${c.hi}$.` },
    );
  }
  steps.push({ text: 'So the curve takes' }, { tex: rangeTex(c) });
  return steps;
}

/** Putting a boundary value back: the repeated root, and so the turning point. */
function pointSteps(c: Curve, K: number): SolutionStep[] {
  const quad = quadAt(c, K);
  const x0 = xAt(c, K);
  return [
    { text: `At $k = ${K}$ the discriminant is $0$, so the quadratic in $x$ has a repeated root:` },
    { tex: chain(`&${polyTex(quad)} = 0`, `&${squareTex(quad[0], x0)} = 0`) },
    { text: `So $x = ${x0}$, and the turning point is $(${x0}, ${K})$, a ${kindAt(c, K)}.` },
  ];
}

/* ---------- figures ---------- */

interface Window {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * The curve with the pen lifted at a pole, its asymptotes dashed: the pole,
 * the slant line of a linear bottom, or the level of a quadratic one.
 */
function curveSvg(
  c: { top: Poly; bottom: Poly },
  win: Window,
  label: string,
  extra: { grid?: boolean; height?: number; marks?: { x: number; y: number }[] } = {},
): string {
  const linear = c.bottom.length === 2;
  const slant = linear ? divided(c).line : null;
  return plotSvg({
    ...win,
    curves: [
      { f: f(c), accent: true, breaks: true },
      ...(slant ? [{ f: (x: number) => valueAt(slant, x), dashed: true }] : []),
    ],
    verticals: linear ? [{ x: -c.bottom[1] }] : [],
    horizontals: linear || c.top[0] === 0 ? [] : [c.top[0] / c.bottom[0]],
    marks: extra.marks ?? [],
    grid: extra.grid,
    height: extra.height,
    label,
  });
}

/** Room above and below the turning points, and for a bounded curve its level. */
function heights(c: Curve): { yMin: number; yMax: number } {
  if (c.bounded) return { yMin: c.lo - 2, yMax: c.hi + 2 };
  const gap = Math.max(3, Math.round((c.hi - c.lo) / 2));
  return { yMin: c.lo - gap, yMax: c.hi + gap };
}

/* ================================================================
 * Lesson 1: values a curve cannot take
 * ================================================================ */

/** Set y = k and place the coefficients of the quadratic in x. */
const kQuadratic: Generator<Curve> = {
  id: 'af12-k-quadratic',
  sample: (rng, difficulty) => {
    for (;;) {
      const c = sampleCurve(rng, difficulty);
      const lines = kLines(c);
      const used = c.bounded ? lines : lines.slice(1);
      const tokens = used.map(([con, kc]) => kTex(con, kc));
      if (used.every(([, kc]) => kc !== 0) && new Set(tokens).size === tokens.length) return c;
    }
  },
  render: (c): Slide => {
    const lines = kLines(c);
    const used = c.bounded ? lines : lines.slice(1);
    const answer = used.map(([con, kc]) => kTex(con, kc));
    const A = lead(c);
    const template = c.bounded
      ? '({0})x^2 + ({1})x + ({2}) = 0'
      : `${A === 1 ? '' : A}x^2 + ({0})x + ({1}) = 0`;
    return {
      kind: 'tiles',
      prompt: [
        say('Set $y = k$ and multiply both sides by the bottom. Collect everything on one side and place the coefficients of the quadratic in $x$.'),
        show(ruleTex(c)),
      ],
      template,
      bank: tileBank(
        answer,
        used.flatMap(([con, kc]) => [kTex(con, -kc), kTex(-con, kc), kTex(con, kc === -1 ? -2 : kc + 1)]),
      ),
      answer,
    };
  },
  solution: (c) => [
    { text: 'Set the fraction equal to $k$ and multiply both sides by the bottom:' },
    { tex: `${polyTex(c.top)} = k(${polyTex(c.bottom)})` },
    { text: 'Take everything to the left and collect each power of $x$:' },
    { tex: kQuadTex(c) },
  ],
};

/** The discriminant of the quadratic in x, factorised, as the condition on k. */
const kDisc: Generator<Curve> = {
  id: 'af12-k-disc',
  sample: (rng, difficulty) => {
    for (;;) {
      const c = difficulty < 2 ? sampleLinear(rng, 1, 2, 12) : sampleLinear(rng, rng.int(1, 2), 3, 15);
      if (c.lo !== 0 && c.hi !== 0) return c;
    }
  },
  render: (c): Slide => {
    const answer = [signed(-c.lo), signed(-c.hi)];
    return {
      kind: 'tiles',
      prompt: [
        say('For $y = k$ to happen, the quadratic in $x$ must have a real root. Place the condition that puts on $k$, factorised.'),
        show(ruleTex(c)),
      ],
      template: '(k {0})(k {1}) \\geq 0',
      bank: tileBank(answer, [signed(c.lo), signed(c.hi), signed(-c.lo - 1), signed(-c.hi + 1)]),
      answer,
      unordered: true,
    };
  },
  solution: (c) => {
    const [, a1, a0] = kLines(c);
    const A = lead(c);
    return [
      { text: 'Set $y = k$ and rearrange:' },
      { tex: kQuadTex(c) },
      { text: `Real roots need $b^2 - 4ac \\geq 0$, with $a = ${A}$:` },
      {
        tex: chain(
          `&(${kTex(...a1)})^{2} - ${4 * A}(${kTex(...a0)})`,
          `=\\;&${inK(discPoly(c))}`,
          `=\\;&${factorK(c.lo, c.hi)}`,
        ),
      },
      { tex: `${factorK(c.lo, c.hi)} \\geq 0` },
    ];
  },
};

/** The values y takes, picked from four. */
const rangeWhich: Generator<Curve> = {
  id: 'af12-range-which',
  sample: (rng, difficulty) => sampleCurve(rng, difficulty),
  render: (c): Slide => {
    const { lo, hi } = c;
    const outside = `y \\leq ${lo} \\text{ or } y \\geq ${hi}`;
    const between = `${lo} \\leq y \\leq ${hi}`;
    return choiceSlide(
      [say('Which values can $y$ take on this curve?'), show(ruleTex(c))],
      firstFour(
        c.bounded ? between : outside,
        c.bounded ? outside : between,
        c.bounded ? `y < ${lo} \\text{ or } y > ${hi}` : `${lo} < y < ${hi}`,
        c.bounded ? `${-hi} \\leq y \\leq ${-lo}` : `y \\leq ${-hi} \\text{ or } y \\geq ${-lo}`,
        c.bounded ? `${lo} < y < ${hi}` : `y < ${lo} \\text{ or } y > ${hi}`,
      ),
    );
  },
  solution: rangeSteps,
};

/** The values y takes, shaded on a number line. */
const rangeLine: Generator<Curve & { min: number; max: number }> = {
  id: 'af12-range-line',
  sample: (rng, difficulty) => {
    const c = sampleCurve(rng, difficulty, (curve) => curve.hi - curve.lo <= 8);
    return { ...c, ...windowFor(rng, c.lo, c.hi, 12, 2) };
  },
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [say('Shade every value $y$ can take on this curve.'), show(ruleTex(params))],
    min: params.min,
    max: params.max,
    step: 1,
    answer: rangeSet(params),
  }),
  solution: (params) => [
    ...rangeSteps(params),
    {
      text: params.bounded
        ? 'Both ends are reached, so both dots are filled, with the shading between them.'
        : 'Both ends are reached, so both dots are filled, and the shading runs off each end of the line.',
    },
  ],
};

interface EdgeParams {
  c: Curve;
  upper: boolean;
}

const edgeValue = ({ c, upper }: EdgeParams): number => (upper ? c.hi : c.lo);

/** One end of the range, typed. */
const rangeEdge: Generator<EdgeParams> = {
  id: 'af12-range-edge',
  sample: (rng, difficulty) => ({ c: sampleCurve(rng, difficulty), upper: rng.chance(0.5) }),
  render: ({ c, upper }): Slide => ({
    kind: 'expression',
    prompt: [
      show(ruleTex(c)),
      say(
        c.bounded
          ? `What is the ${upper ? 'greatest' : 'least'} value $y$ takes on this curve?`
          : `This curve takes no value strictly between two numbers. What is the ${upper ? 'larger' : 'smaller'} of them?`,
      ),
    ],
    lead: 'y =',
    keypad: [],
    answer: String(edgeValue({ c, upper })),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (params) => {
    const { c } = params;
    const right = edgeValue(params);
    return intOptions(right, [params.upper ? c.lo : c.hi, -right, xAt(c, right), -(params.upper ? c.lo : c.hi)]);
  },
  solution: (params) => [...rangeSteps(params.c), { text: `So the ${params.upper ? 'upper' : 'lower'} end is $${edgeValue(params)}$.` }],
};

/* ================================================================
 * Lesson 2: turning points from the discriminant
 * ================================================================ */

/** Both boundary values, then the x of the turning point at each. */
const tpTree: Generator<Curve> = {
  id: 'af12-tp-tree',
  sample: (rng, difficulty) => sampleCurve(rng, difficulty),
  render: (c): Slide => {
    const answer = [c.lo, c.hi, c.xLo, c.xHi];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Find both turning points. Top row: the values of $k$ where the discriminant is zero, smaller first. Below each: the $x$ of the turning point at that height.',
        ),
      ],
      expression: ruleTex(c),
      nodes: [
        { id: 'lo', from: [] },
        { id: 'hi', from: [] },
        { id: 'xlo', from: ['lo'] },
        { id: 'xhi', from: ['hi'] },
      ],
      bank: numberBank(answer, [-c.lo, -c.hi, -c.xLo, -c.xHi]),
      answer: answer.map(String),
    };
  },
  solution: (c) => [...rangeSteps(c).slice(0, 4), { tex: `${factorK(c.lo, c.hi)} = 0 \\text{ at } k = ${c.lo}, ${c.hi}` }, ...pointSteps(c, c.lo), ...pointSteps(c, c.hi)],
};

interface PointParams {
  c: Curve;
  /** Which boundary value is put back. */
  K: number;
}

const samplePoint = (rng: Rng, difficulty: number): PointParams => {
  const c = sampleCurve(rng, difficulty);
  return { c, K: rng.chance(0.5) ? c.lo : c.hi };
};

const MAXIMUM = 'A maximum';
const MINIMUM = 'A minimum';

/** Put a boundary value back: the perfect square, the point, and its kind. */
const tpFlow: Generator<PointParams> = {
  id: 'af12-tp-flow',
  sample: samplePoint,
  render: ({ c, K }): Slide => {
    const x0 = xAt(c, K);
    const other = K === c.lo ? c.xHi : c.xLo;
    const key = `${ruleTex(c)}|${K}`;
    const squares = [...new Set([x0, -x0, other, x0 + 1].map((x) => `$${squareTex(1, x)} = 0$`))].slice(0, 3);
    const points = [...new Set([`(${x0}, ${K})`, `(${K}, ${x0})`, `(${other}, ${K})`, `(${-x0}, ${K})`])]
      .slice(0, 3)
      .map((p) => `$${p}$`);
    return {
      kind: 'flow',
      prompt: [say(`The discriminant is zero at $k = ${K}$. Find the turning point at that height.`)],
      subject: ruleTex(c),
      steps: [
        {
          id: 'square',
          ask: `Put $k = ${K}$ into the quadratic in $x$ and divide by the number in front of $x^2$. It becomes…`,
          branches: turned(squares, `${key}|square`).map((label) => ({ label, to: 'point' })),
        },
        {
          id: 'point',
          ask: 'So the turning point is…',
          branches: turned(points, `${key}|point`).map((label) => ({ label, to: 'kind' })),
        },
        {
          id: 'kind',
          ask: 'Is it a maximum or a minimum?',
          branches: turned([MAXIMUM, MINIMUM], `${key}|kind`).map((label) => ({
            label,
            outcome: `So $(${x0}, ${K})$ is a ${label === MAXIMUM ? 'maximum' : 'minimum'}.`,
          })),
        },
      ],
      answer: [`$${squareTex(1, x0)} = 0$`, `$(${x0}, ${K})$`, kindAt(c, K) === 'maximum' ? MAXIMUM : MINIMUM],
    };
  },
  solution: ({ c, K }) => [
    ...pointSteps(c, K),
    {
      text: c.bounded
        ? `The curve takes only values from $${c.lo}$ to $${c.hi}$, so the lower end is its minimum and the upper end its maximum.`
        : `The curve misses every value between $${c.lo}$ and $${c.hi}$. The lower one tops the left branch, a maximum; the upper one is the bottom of the right branch, a minimum.`,
    },
  ],
};

interface TpSliderParams {
  c: Curve;
  /** Ask for the maximum, else the minimum. */
  max: boolean;
  left: number;
  right: number;
}

const tpAnswer = ({ c, max }: TpSliderParams): number => {
  const K = c.bounded === max ? c.hi : c.lo;
  return xAt(c, K);
};

function tpTrack({ c, left, right }: TpSliderParams): [number, number] {
  const xs = [c.xLo, c.xHi, ...(c.bottom.length === 2 ? [-c.bottom[1]] : [])];
  return [Math.min(...xs) - left, Math.max(...xs) + right];
}

/** The marker slid to the x of the curve's maximum or minimum. */
const tpSlider: Generator<TpSliderParams> = {
  id: 'af12-tp-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const params: TpSliderParams = { c: sampleCurve(rng, difficulty), max: rng.chance(0.5), left: rng.int(2, 4), right: rng.int(2, 4) };
      const [min, max] = tpTrack(params);
      if (max - min <= 14 && tpAnswer(params) !== restingOn(min, max)) return params;
    }
  },
  render: (params): Slide => {
    const { c, max } = params;
    const [lo, hi] = tpTrack(params);
    return {
      kind: 'slider',
      prompt: [say(`The curve is $${ruleTex(c)}$. Slide the marker to the $x$ of its ${max ? 'maximum' : 'minimum'} point.`)],
      min: lo,
      max: hi,
      step: 1,
      answer: tpAnswer(params),
      readout: 'x = {v}',
      figure: plotFigure(curveSvg(c, { ...markerWindow(lo, hi), ...heights(c) }, 'The curve with its asymptotes dashed, turning at two points')),
    };
  },
  solution: (params) => {
    const { c, max } = params;
    const K = c.bounded === max ? c.hi : c.lo;
    return [...rangeSteps(c).slice(0, 4), { tex: `${factorK(c.lo, c.hi)} = 0 \\text{ at } k = ${c.lo}, ${c.hi}` }, ...pointSteps(c, K), { text: `So the marker goes to $x = ${xAt(c, K)}$.` }];
  },
};

/** The x of the turning point at a given boundary value, typed. */
const tpPoint: Generator<PointParams> = {
  id: 'af12-tp-point',
  sample: samplePoint,
  render: ({ c, K }): Slide => ({
    kind: 'expression',
    prompt: [show(ruleTex(c)), say(`The discriminant in $k$ is zero at $k = ${K}$. Find the $x$ of the turning point at that height.`)],
    lead: 'x =',
    keypad: [],
    answer: String(xAt(c, K)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ c, K }) => {
    const x0 = xAt(c, K);
    return intOptions(x0, [-x0, K === c.lo ? c.xHi : c.xLo, K, x0 + 2]);
  },
  solution: ({ c, K }) => pointSteps(c, K),
};

/* ================================================================
 * Lesson 3: oblique asymptotes
 * ================================================================ */

/** (Ax + e)(x + d) + r over x + d. */
interface Slant {
  A: number;
  d: number;
  e: number;
  r: number;
}

const slantCurve = ({ A, d, e, r }: Slant): { top: Poly; bottom: Poly } => ({ top: [A, A * d + e, e * d + r], bottom: [1, d] });
const lineTex = ({ A, e }: Slant): string => polyTex([A, e]);

function sampleSlant(rng: Rng, difficulty: number): Slant {
  const nz = (max: number) => rng.int(1, max) * rng.sign();
  return { A: difficulty < 2 ? 1 : rng.int(2, 3), d: nz(6), e: nz(6), r: nz(9) };
}

function divideSteps(s: Slant): SolutionStep[] {
  const c = slantCurve(s);
  return [
    { text: `Write the top as the bottom times a line, plus what is left over:` },
    { tex: chain(`&${polyTex(c.top)}`, `=\\;&(${lineTex(s)})(${br(s.d)}) ${signed(s.r)}`) },
    { text: 'Divide each part by the bottom:' },
    { tex: `y = ${lineTex(s)} ${signedFracTerm(s.r, br(s.d))}` },
    { text: `As $x$ grows either way the leftover shrinks to $0$, so the oblique asymptote is $y = ${lineTex(s)}$.` },
  ];
}

/** The division, placed: the line and the leftover. */
const obliqueDivide: Generator<Slant> = {
  id: 'af12-oblique-divide',
  sample: sampleSlant,
  render: (s): Slide => {
    const c = slantCurve(s);
    const answer = [termTex(s.A, 1), signed(s.e), signedFracTerm(s.r, br(s.d))];
    return {
      kind: 'tiles',
      prompt: [say('Divide the top by the bottom. Place the line and what is left over.'), show(ruleTex(c))],
      template: 'y = {0} {1} {2}',
      bank: tileBank(answer, [
        signed(-s.e),
        signed(c.top[1]),
        signedFracTerm(-s.r, br(s.d)),
        signedFracTerm(c.top[2], br(s.d)),
        signedFracTerm(s.r, br(-s.d)),
      ]),
      answer,
    };
  },
  solution: divideSteps,
};

/** The slant line, picked from four. */
const obliqueLine: Generator<Slant> = {
  id: 'af12-oblique-line',
  sample: sampleSlant,
  render: (s): Slide => {
    const c = slantCurve(s);
    const line = (m: number, k: number) => `y = ${polyTex([m, k])}`;
    return choiceSlide(
      [say('What is the oblique asymptote of this curve?'), show(ruleTex(c))],
      firstFour(line(s.A, s.e), line(s.A, c.top[1]), line(s.A, -s.e), line(s.A, s.d), line(s.A, -s.d), line(s.A, -c.top[1])),
    );
  },
  solution: divideSteps,
};

const SMALL_POS = 'Small and positive';
const SMALL_NEG = 'Small and negative';
const ABOVE = 'Just above the line';
const BELOW = 'Just below the line';

interface SideParams {
  s: Slant;
  /** Show the rule undivided, with a first step to divide it. */
  undivided: boolean;
}

/** Which side of the slant line the curve lies, far out each way. */
const obliqueFlow: Generator<SideParams> = {
  id: 'af12-oblique-flow',
  sample: (rng, difficulty) => ({ s: sampleSlant(rng, difficulty), undivided: difficulty > 1 }),
  render: ({ s, undivided }): Slide => {
    const c = slantCurve(s);
    const key = `${ruleTex(c)}|${undivided}`;
    const up = s.r > 0;
    const leftovers = [...new Set([fracTerm(s.r, br(s.d)), fracTerm(-s.r, br(s.d)), fracTerm(c.top[2], br(s.d)), fracTerm(s.r, br(-s.d))])]
      .slice(0, 3)
      .map((t) => `$${t}$`);
    const sides = (id: string, ask: string, next?: string) => ({
      id,
      ask,
      branches: turned([ABOVE, BELOW], `${key}|${id}`).map((label) =>
        next ? { label, to: next } : { label, outcome: `So far to the left the curve is ${label === ABOVE ? 'above' : 'below'} $y = ${lineTex(s)}$.` },
      ),
    });
    return {
      kind: 'flow',
      prompt: [say(`Its oblique asymptote is $y = ${lineTex(s)}$. Decide which side of that line the curve lies far out.`)],
      subject: undivided ? ruleTex(c) : `y = ${lineTex(s)} ${signedFracTerm(s.r, br(s.d))}`,
      steps: [
        ...(undivided
          ? [
              {
                id: 'leftover',
                ask: 'Divide the top by the bottom. What is left over beside the line?',
                branches: turned(leftovers, `${key}|leftover`).map((label) => ({ label, to: 'right' })),
              },
            ]
          : []),
        {
          id: 'right',
          ask: 'Far to the right the bottom is large and positive. So the leftover is…',
          branches: turned([SMALL_POS, SMALL_NEG], `${key}|right`).map((label) => ({ label, to: 'rightSide' })),
        },
        sides('rightSide', 'So far to the right the curve lies…', 'leftSide'),
        sides('leftSide', 'Far to the left the bottom is large and negative. There the curve lies…'),
      ],
      answer: [...(undivided ? [`$${fracTerm(s.r, br(s.d))}$`] : []), up ? SMALL_POS : SMALL_NEG, up ? ABOVE : BELOW, up ? BELOW : ABOVE],
    };
  },
  solution: ({ s }) => [
    ...divideSteps(s).slice(0, 4),
    { text: `Far to the right, $${br(s.d)}$ is large and positive, so $${fracTerm(s.r, br(s.d))}$ is small and ${s.r > 0 ? 'positive: the curve is just above' : 'negative: the curve is just below'} the line.` },
    { text: `Far to the left, $${br(s.d)}$ is large and negative, so the leftover is small and ${s.r > 0 ? 'negative: the curve is just below' : 'positive: the curve is just above'} the line.` },
  ],
};

interface SlantValueParams {
  s: Slant;
  /** Ask for the line's number, else the leftover's top. */
  askLine: boolean;
}

/** The slant line's number, or the leftover's top, typed. */
const obliqueValue: Generator<SlantValueParams> = {
  id: 'af12-oblique-value',
  sample: (rng, difficulty) => ({ s: sampleSlant(rng, difficulty), askLine: rng.chance(0.5) }),
  render: ({ s, askLine }): Slide => ({
    kind: 'expression',
    prompt: [
      show(ruleTex(slantCurve(s))),
      say(
        askLine
          ? `Its oblique asymptote is $y = ${termTex(s.A, 1)} + c$. Find $c$.`
          : `Divided out, it is a line plus $${frac('r', br(s.d))}$. Find the number $r$ left over.`,
      ),
    ],
    lead: askLine ? 'c =' : 'r =',
    keypad: [],
    answer: String(askLine ? s.e : s.r),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ s }) => divideSteps(s),
};

/* ================================================================
 * Lesson 4: crossing an asymptote
 * ================================================================ */

/** A over a monic quadratic bottom, the top A times it plus m(x - x0). */
interface Cross {
  A: number;
  bottom: Poly;
  m: number;
  x0: number;
}

const crossCurve = ({ A, bottom, m, x0 }: Cross): { top: Poly; bottom: Poly } => ({
  top: [A, A * bottom[1] + m, A * bottom[2] - m * x0],
  bottom,
});

/** A monic quadratic bottom: two whole roots, or never zero. */
function sampleBottom(rng: Rng, factorised: boolean): Poly {
  if (factorised) {
    for (;;) {
      const p = rng.int(-5, 5);
      const q = rng.int(-5, 5);
      if (p !== q) return [1, -(p + q), p * q];
    }
  }
  for (;;) {
    const e = rng.int(-4, 4);
    const fc = rng.int(1, 9);
    if (4 * fc - e * e >= 4) return [1, e, fc];
  }
}

function sampleCross(rng: Rng, difficulty: number, factorised: boolean): Cross {
  for (;;) {
    const bottom = sampleBottom(rng, factorised);
    const x0 = rng.int(-6, 6);
    const m = rng.int(1, 4) * rng.sign();
    const A = difficulty < 2 ? 1 : rng.int(2, 3);
    const answers = [m, m * x0, x0];
    if (valueAt(bottom, x0) !== 0 && new Set(answers).size === 3) return { A, bottom, m, x0 };
  }
}

function crossSteps(p: Cross): SolutionStep[] {
  const c = crossCurve(p);
  const times = p.A === 1 ? `${polyTex(p.bottom)}` : `${p.A}(${polyTex(p.bottom)})`;
  return [
    { text: `Set the curve equal to $${p.A}$ and multiply both sides by the bottom:` },
    {
      tex: chain(
        `&${polyTex(c.top)}`,
        `=\\;&${times}`,
        ...(p.A === 1 ? [] : [`=\\;&${polyTex(scalePoly(p.bottom, p.A))}`]),
      ),
    },
    { text: 'The $x^2$ terms cancel. Take the $x$ terms to the left and the numbers to the right:' },
    { tex: chain(`${termTex(p.m, 1)} &= ${p.m * p.x0}`, `x &= ${p.x0}`) },
  ];
}

/** Where the curve crosses its horizontal asymptote, typed. */
const crossValue: Generator<Cross> = {
  id: 'af12-cross-value',
  sample: (rng, difficulty) => sampleCross(rng, difficulty, rng.chance(0.5)),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [show(ruleTex(crossCurve(p))), say(`Its horizontal asymptote is $y = ${p.A}$. Where does the curve cross it?`)],
    lead: 'x =',
    keypad: [],
    answer: String(p.x0),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => intOptions(p.x0, [-p.x0, p.m * p.x0, p.m, -p.m * p.x0]),
  solution: crossSteps,
};

/** The linear equation left once the x^2 terms cancel, and its solution. */
const crossTree: Generator<Cross> = {
  id: 'af12-cross-tree',
  sample: (rng, difficulty) => sampleCross(rng, difficulty, rng.chance(0.5)),
  render: (p): Slide => {
    const answer = [p.m, p.m * p.x0, p.x0];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Set the curve equal to its horizontal asymptote, $y = ${p.A}$, and multiply by the bottom. The $x^2$ terms cancel. Top row: the number in front of $x$ once the $x$ terms are on the left, then the number on the right. Below: $x$.`,
        ),
      ],
      expression: ruleTex(crossCurve(p)),
      nodes: [
        { id: 'p', from: [] },
        { id: 'q', from: [] },
        { id: 'x', from: ['p', 'q'] },
      ],
      bank: numberBank(answer, [-p.m, -p.m * p.x0, -p.x0, p.A]),
      answer: answer.map(String),
    };
  },
  solution: crossSteps,
};

interface CrossSliderParams {
  p: Cross;
  left: number;
  right: number;
}

function crossTrack({ p, left, right }: CrossSliderParams): [number, number] {
  const middle = Math.round(-p.bottom[1] / 2);
  return [Math.min(p.x0, middle) - left, Math.max(p.x0, middle) + right];
}

/** The curve's heights across a window, to fit the picture round them. */
function spread(c: { top: Poly; bottom: Poly }, xMin: number, xMax: number): { low: number; high: number } {
  const ys = Array.from({ length: 81 }, (_, i) => f(c)(xMin + ((xMax - xMin) * i) / 80));
  return { low: Math.min(...ys), high: Math.max(...ys) };
}

/** The marker slid to where the curve crosses its dashed horizontal asymptote. */
const crossSlider: Generator<CrossSliderParams> = {
  id: 'af12-cross-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const params: CrossSliderParams = { p: sampleCross(rng, difficulty, false), left: rng.int(2, 4), right: rng.int(2, 4) };
      const [min, max] = crossTrack(params);
      const { low, high } = spread(crossCurve(params.p), min, max);
      if (max - min <= 12 && high - low <= 12 && params.p.x0 !== restingOn(min, max)) return params;
    }
  },
  render: (params): Slide => {
    const { p } = params;
    const c = crossCurve(p);
    const [min, max] = crossTrack(params);
    const window = markerWindow(min, max);
    const { low, high } = spread(c, window.xMin, window.xMax);
    return {
      kind: 'slider',
      prompt: [say(`The curve is $${ruleTex(c)}$, with its horizontal asymptote $y = ${p.A}$ dashed. Slide the marker to where the curve crosses it.`)],
      min,
      max,
      step: 1,
      answer: p.x0,
      readout: 'x = {v}',
      figure: plotFigure(
        curveSvg(c, { ...window, yMin: Math.floor(Math.min(low, p.A, 0)) - 1, yMax: Math.ceil(Math.max(high, p.A)) + 1 }, 'The curve crossing its dashed horizontal asymptote once'),
      ),
    };
  },
  solution: ({ p }) => [...crossSteps(p), { text: `So the marker goes to $x = ${p.x0}$.` }],
};

const NO_VERTICAL = 'No: the curve has no value there';
const YES_VERTICAL = 'Yes, where the top is zero';
const ONE_SOLUTION = 'An equation with one solution';
const NEVER_TRUE = 'A statement that is never true';

type CrossFlowParams =
  | { kind: 'once'; p: Cross; pole: number }
  | { kind: 'never'; A: number; bottom: Poly; n: number; pole: number }
  | { kind: 'slant'; s: Slant };

function crossFlowCurve(params: CrossFlowParams): { top: Poly; bottom: Poly } {
  if (params.kind === 'once') return crossCurve(params.p);
  if (params.kind === 'never') {
    const { A, bottom, n } = params;
    return { top: [A, A * bottom[1], A * bottom[2] + n], bottom };
  }
  return slantCurve(params.s);
}

const flowPole = (params: CrossFlowParams): number => (params.kind === 'slant' ? -params.s.d : params.pole);
const otherLine = (params: CrossFlowParams): string =>
  params.kind === 'slant' ? lineTex(params.s) : String(params.kind === 'once' ? params.p.A : params.A);

/** Which asymptotes the curve crosses: never the vertical one, and the other by solving. */
const crossFlow: Generator<CrossFlowParams> = {
  id: 'af12-cross-flow',
  sample: (rng, difficulty) => {
    const kind = rng.pick(['once', 'once', 'never', 'slant'] as const);
    if (kind === 'slant') return { kind, s: sampleSlant(rng, difficulty) };
    const bottom = sampleBottom(rng, true);
    const roots = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].filter((x) => valueAt(bottom, x) === 0);
    const pole = rng.pick(roots);
    if (kind === 'once') return { kind, p: { ...sampleCrossOn(rng, difficulty, bottom) }, pole };
    return { kind, A: difficulty < 2 ? 1 : rng.int(2, 3), bottom, n: rng.int(1, 6) * rng.sign(), pole };
  },
  render: (params): Slide => {
    const c = crossFlowCurve(params);
    const key = ruleTex(c);
    const pole = flowPole(params);
    const once = params.kind === 'once';
    const x0 = once ? params.p.x0 : 0;
    const places = once ? [...new Set([x0, -x0, pole, x0 + 1])].slice(0, 3).map((x) => `$x = ${x}$`) : [];
    return {
      kind: 'flow',
      prompt: [say('Decide which of this curve’s asymptotes it can cross.')],
      subject: ruleTex(c),
      steps: [
        {
          id: 'vertical',
          ask: `Can the curve ever cross its vertical asymptote $x = ${pole}$?`,
          branches: turned([NO_VERTICAL, YES_VERTICAL], `${key}|v`).map((label) => ({ label, to: 'other' })),
        },
        {
          id: 'other',
          ask: `Now set it equal to its other asymptote, $y = ${otherLine(params)}$, and multiply by the bottom. What is left?`,
          branches: turned([ONE_SOLUTION, NEVER_TRUE], `${key}|o`).map((label) =>
            label === ONE_SOLUTION
              ? once
                ? { label, to: 'where' }
                : { label, outcome: `So it crosses $y = ${otherLine(params)}$ once.` }
              : { label, outcome: `So it never crosses $y = ${otherLine(params)}$ either.` },
          ),
        },
        ...(once
          ? [
              {
                id: 'where',
                ask: 'Where does it cross?',
                branches: turned(places, `${key}|w`).map((label) => ({ label, outcome: `So it crosses $y = ${otherLine(params)}$ once, at ${label}.` })),
              },
            ]
          : []),
      ],
      answer: once ? [NO_VERTICAL, ONE_SOLUTION, `$x = ${x0}$`] : [NO_VERTICAL, NEVER_TRUE],
    };
  },
  solution: (params) => {
    const pole = flowPole(params);
    const first: SolutionStep = { text: `At $x = ${pole}$ the bottom is zero, so the curve has no value there: it can never cross $x = ${pole}$.` };
    if (params.kind === 'once') return [first, ...crossSteps(params.p)];
    if (params.kind === 'never') {
      const c = crossFlowCurve(params);
      return [
        first,
        { text: `Set it equal to $${params.A}$ and multiply by the bottom:` },
        { tex: `${polyTex(c.top)} = ${polyTex(scalePoly(params.bottom, params.A))}` },
        { text: `The $x^2$ terms cancel and so do the $x$ terms, leaving $${c.top[2]} = ${params.A * params.bottom[2]}$, which is never true. It never crosses.` },
      ];
    }
    const { s } = params;
    return [
      first,
      ...divideSteps(s).slice(0, 4),
      { text: `Setting it equal to $${lineTex(s)}$ leaves $${frac(String(s.r), br(s.d))} = 0$, and a fraction with top $${s.r}$ is never $0$. It never crosses.` },
    ];
  },
};

/** A crossing curve on a given bottom, x0 kept off its roots. */
function sampleCrossOn(rng: Rng, difficulty: number, bottom: Poly): Cross {
  for (;;) {
    const p = sampleCross(rng, difficulty, true);
    const q = { ...p, bottom };
    if (valueAt(bottom, q.x0) !== 0) return q;
  }
}

/* ================================================================
 * Lesson 5: putting it together
 * ================================================================ */

/** Every feature of a quadratic over x + d, in one table. */
const featuresTable: Generator<Curve> = {
  id: 'af12-features-table',
  sample: (rng, difficulty) => (difficulty < 2 ? sampleLinear(rng, 1, 2, 12) : sampleLinear(rng, rng.int(1, 2), 2, 15)),
  render: (c): Slide => {
    const { line } = divided(c);
    const rows: [string, number][] = [
      ['\\text{Asymptote } x', -c.bottom[1]],
      ['\\text{Slant gradient } m', line[0]],
      ['\\text{Slant intercept } c', line[1]],
      ['\\text{Maximum } x', c.xLo],
      ['\\text{Maximum } y', c.lo],
      ['\\text{Minimum } x', c.xHi],
      ['\\text{Minimum } y', c.hi],
    ];
    const answer = rows.map(([, v]) => v);
    return {
      kind: 'table',
      prompt: [
        show(ruleTex(c)),
        say('Fill in every feature of this curve: its vertical asymptote, its slant asymptote $y = mx + c$, and its two turning points.'),
      ],
      columns: ['\\text{Feature}', '\\text{Value}'],
      rows: rows.map(([name]) => [name, null]),
      bank: numberBank(answer, [c.bottom[1], -line[1], -c.lo, -c.hi, c.top[1]]),
      answer: answer.map(String),
    };
  },
  solution: (c) => {
    const { line, r } = divided(c);
    return [
      { text: `The bottom is zero at $x = ${-c.bottom[1]}$: the vertical asymptote.` },
      { text: 'Divide the top by the bottom:' },
      { tex: `y = ${polyTex(line)} ${signedFracTerm(r, polyTex(c.bottom))}` },
      { text: `So the slant asymptote is $y = ${polyTex(line)}$.` },
      ...rangeSteps(c).slice(0, 4),
      { tex: `${factorK(c.lo, c.hi)} \\geq 0` },
      ...pointSteps(c, c.lo),
      ...pointSteps(c, c.hi),
    ];
  },
};

interface SketchParams {
  A: number;
  d: number;
  e: number;
  s: number;
}

/** The rule and its three look-alikes: the pole moved across, the line's number flipped, the leftover negative. */
function sketchRules({ A, d, e, s }: SketchParams): { top: Poly; bottom: Poly }[] {
  const make = (dd: number, ee: number, r: number) => slantCurve({ A, d: dd, e: ee, r });
  return [make(d, e, A * s * s), make(-d, e, A * s * s), make(d, -e, A * s * s), make(d, e, -A * s * s)];
}

function sketchWindow({ d, s }: SketchParams, c: Curve): Window {
  return { xMin: -d - s - 3, xMax: -d + s + 3, yMin: c.lo - 3, yMax: c.hi + 3 };
}

/** A sketch on squared paper with its asymptotes dashed and turning points marked; which rule draws it? */
const sketchWhich: Generator<SketchParams> = {
  id: 'af12-sketch-which',
  sample: (rng, difficulty) => {
    const nz = (max: number) => rng.int(1, max) * rng.sign();
    const A = difficulty < 2 ? 1 : rng.int(1, 2);
    return { A, d: nz(4), e: nz(4), s: A === 2 ? 1 : rng.int(1, 2) };
  },
  render: (params): Slide => {
    const c = quadOverLine(params.A, params.d, params.e, params.s);
    const [right, ...wrong] = sketchRules(params).map((rule): ChoiceOption => ({ tex: ruleTex(rule) }));
    return choiceSlide(
      [
        say('Which rule draws this sketch? The dashed lines are its asymptotes, the dots its turning points, and each square of the grid is one unit.'),
        {
          kind: 'diagram',
          svg: curveSvg(c, sketchWindow(params, c), 'A curve on squared paper with a vertical and a slant asymptote dashed and two turning points marked', {
            grid: true,
            height: 220,
            marks: [
              { x: c.xLo, y: c.lo },
              { x: c.xHi, y: c.hi },
            ],
          }),
        } satisfies Block,
      ],
      options(right, ...wrong),
    );
  },
  solution: (params) => {
    const c = quadOverLine(params.A, params.d, params.e, params.s);
    const { line } = divided(c);
    return [
      { text: `Count off the grid: the vertical asymptote is $x = ${-params.d}$, so the bottom is $${br(params.d)}$.` },
      { text: `The slant asymptote is $y = ${polyTex(line)}$, and the curve turns at $(${c.xLo}, ${c.lo})$ and $(${c.xHi}, ${c.hi})$, so the leftover is positive.` },
      { tex: ruleTex(c) },
      { text: 'Dividing its top by the bottom gives that line plus a positive leftover, and the discriminant check gives those turning points.' },
    ];
  },
};

/** Plan a sketch: the asymptotes, the boundary values, and the values y takes. */
const sketchFlow: Generator<Curve> = {
  id: 'af12-sketch-flow',
  sample: (rng, difficulty) =>
    difficulty < 2
      ? sampleLinear(rng, 1, 2, 12)
      : rng.chance(0.5)
        ? rng.pick(BOUNDED)
        : sampleLinear(rng, 2, 2, 15),
  render: (c): Slide => {
    const key = ruleTex(c);
    const A = lead(c);
    let asymptotes: string[];
    if (c.bounded) {
      asymptotes = [`Only $y = ${A}$`, 'Only $y = 0$', `$y = ${A}$ and $x = ${c.xHi}$`, `$y = ${A}$ and $x = ${c.xLo}$`];
    } else {
      const d = c.bottom[1];
      const line = polyTex(divided(c).line);
      asymptotes = [
        `$x = ${-d}$ and $y = ${line}$`,
        `$x = ${d}$ and $y = ${line}$`,
        `$x = ${-d}$ and $y = ${A}$`,
        `$x = ${-d}$ and $y = ${polyTex([A, c.top[1]])}$`,
      ];
    }
    const pair = (u: number, v: number) => `$k = ${Math.min(u, v)}$ and $k = ${Math.max(u, v)}$`;
    const values = [...new Set([pair(c.lo, c.hi), pair(-c.lo, -c.hi), pair(c.xLo, c.xHi)])];
    const ranges = [`$y \\leq ${c.lo}$ or $y \\geq ${c.hi}$`, `$${c.lo} \\leq y \\leq ${c.hi}$`, `$${c.lo} < y < ${c.hi}$`];
    const right = asymptotes[0];
    const rightRange = c.bounded ? ranges[1] : ranges[0];
    return {
      kind: 'flow',
      prompt: [say('Plan a sketch of this curve, one feature at a time.')],
      subject: ruleTex(c),
      steps: [
        {
          id: 'asymptotes',
          ask: 'Which asymptotes does it have?',
          branches: turned([...new Set(asymptotes)], `${key}|a`).map((label) => ({ label, to: 'values' })),
        },
        {
          id: 'values',
          ask: 'Set $y = k$. The discriminant of the quadratic in $x$ is zero at…',
          branches: turned(values, `${key}|v`).map((label) => ({ label, to: 'range' })),
        },
        {
          id: 'range',
          ask: 'So the curve takes…',
          branches: turned(ranges, `${key}|r`).map((label) => ({
            label,
            outcome:
              label === rightRange
                ? `Its turning points are $(${c.xLo}, ${c.lo})$ and $(${c.xHi}, ${c.hi})$.`
                : 'So that is the part of the sketch the curve fills.',
          })),
        },
      ],
      answer: [right, pair(c.lo, c.hi), rightRange],
    };
  },
  solution: (c) => {
    const steps: SolutionStep[] = [];
    if (c.bounded) {
      steps.push({
        text: `The bottom is never zero, so there is no vertical asymptote. Both lines have degree $2$, so the horizontal asymptote is the ratio of the leading coefficients: $y = ${lead(c)}$.`,
      });
    } else {
      const { line, r } = divided(c);
      steps.push(
        { text: `The bottom is zero at $x = ${-c.bottom[1]}$. Dividing the top by the bottom:` },
        { tex: `y = ${polyTex(line)} ${signedFracTerm(r, polyTex(c.bottom))}` },
        { text: `So the slant asymptote is $y = ${polyTex(line)}$.` },
      );
    }
    return [...steps, ...rangeSteps(c)];
  },
};

export const fractionsLevel12Generators = [
  kQuadratic,
  kDisc,
  rangeWhich,
  rangeLine,
  rangeEdge,
  tpTree,
  tpFlow,
  tpSlider,
  tpPoint,
  obliqueDivide,
  obliqueLine,
  obliqueFlow,
  obliqueValue,
  crossValue,
  crossTree,
  crossSlider,
  crossFlow,
  featuresTable,
  sketchWhich,
  sketchFlow,
] as Generator<unknown>[];
