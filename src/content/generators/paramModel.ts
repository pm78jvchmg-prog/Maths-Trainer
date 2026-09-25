/**
 * Modelling with parametric equations (Parametric & Implicit, level 9).
 *
 * Every question is a path in context, with $t$ the time in seconds and
 * distances in metres. Two motions run through the file:
 *
 * - steady motion in a straight line, $x = x_0 + ut$, $y = y_0 + vt$ (a drone,
 *   whose $y$ is its height, or a boat, whose $x$ and $y$ are map positions);
 * - a ball thrown from the ground or from a height $h$,
 *   $x = ut$, $y = h + vt - 5t^{2}$, the $5$ being half of gravity taken as
 *   $10$ m/s².
 *
 * Numbers are chosen so that everything the learner meets is whole: a ball's
 * upward speed is a multiple of $5$ where it has to land at a whole time, and
 * of $10$ where it has to peak at one, which makes the greatest height
 * $h + 5T^{2}$ a multiple of $5$ as well. `paramModel.test.ts` recomputes each
 * answer from the equations by mathjs and by brute force over $t$.
 *
 * As everywhere, `*Tex` is what the learner reads and `answer` is what mathjs
 * grades.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { gcdOrOne } from './format';
import {
  OPERATOR_KEYS,
  bareTile,
  bracketed,
  mix,
  numberBank,
  numberChoices,
  pair,
  signed,
  spaced,
  steered,
  tokenBank,
  treeBank,
  turned,
} from './parametricImplicit';

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** An answer in x. */
const X_KEYS: KeypadKey[] = [spaced('x'), ...OPERATOR_KEYS];

/** A non-zero whole number in [lo, hi]. */
function nonZero(rng: Rng, lo: number, hi: number): number {
  for (;;) {
    const n = rng.int(lo, hi);
    if (n !== 0) return n;
  }
}

/** A multiple of `step` in [lo, hi]. */
const multiple = (rng: Rng, step: number, lo: number, hi: number): number => step * rng.int(lo / step, hi / step);

/* ---------- Straight-line motion ---------- */

/** x = x0 + u t, y = y0 + v t. */
export interface LineMotion {
  obj: 'drone' | 'boat';
  x0: number;
  u: number;
  y0: number;
  v: number;
}

/** `4 + 3t`, `10 - t`, `3t`, `-2t`: a start and a steady rate. */
export function lineTex(start: number, rate: number): string {
  const size = Math.abs(rate) === 1 ? 't' : `${Math.abs(rate)}t`;
  if (start === 0) return rate < 0 ? `-${size}` : size;
  return `${start} ${rate < 0 ? '-' : '+'} ${size}`;
}

/** The same line with a value of t put in: `4 + 3 \times 5`. */
function lineAtTex(start: number, rate: number, t: number): string {
  const product = `${Math.abs(rate)} \\times ${t}`;
  if (start === 0) return rate < 0 ? `-${product}` : product;
  return `${start} ${rate < 0 ? '-' : '+'} ${product}`;
}

/** The mathjs source of a line in t. */
export const lineSource = (start: number, rate: number): string => `(${start}) + (${rate})*t`;

export const lineAt = (m: LineMotion, t: number): [number, number] => [m.x0 + m.u * t, m.y0 + m.v * t];

const who = (m: LineMotion): string => (m.obj === 'drone' ? 'A drone' : 'A boat');

/** The motion's two equations, one display. */
const lineBlocks = (m: LineMotion): Block[] => [display(`x = ${lineTex(m.x0, m.u)} \\qquad y = ${lineTex(m.y0, m.v)}`)];

const lineIntro = (m: LineMotion): Block[] => [
  prose(`${who(m)} moves so that after $t$ seconds it is at`),
  ...lineBlocks(m),
];

function sampleLine(rng: Rng, hard: boolean, obj: LineMotion['obj'] = rng.pick(['drone', 'boat'] as const)): LineMotion {
  if (!hard) {
    return {
      obj,
      x0: rng.int(0, 10),
      u: rng.int(1, 5),
      y0: obj === 'drone' ? rng.int(5, 15) : rng.int(0, 12),
      v: obj === 'drone' ? rng.int(1, 5) : nonZero(rng, -3, 5),
    };
  }
  return {
    obj,
    x0: rng.int(-10, 15),
    u: nonZero(rng, -4, 6),
    y0: obj === 'drone' ? rng.int(20, 40) : rng.int(-10, 15),
    v: obj === 'drone' ? nonZero(rng, -3, 6) : nonZero(rng, -5, 6),
  };
}

/* ---------- A point at a time ---------- */

export interface LinePointParams extends LineMotion {
  k: number;
}

/**
 * Where a steadily moving object is at a given time, placed as tiles.
 *
 * The bank carries the start, the distance moved without the start added
 * (`uk`, `vk`) and the position a second later.
 */
const linePoint: Generator<LinePointParams> = {
  id: 'pmod-line-point',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const m = sampleLine(rng, hard);
      const k = hard ? rng.int(2, 6) : rng.int(1, 4);
      const [X, Y] = lineAt(m, k);
      if (X === Y) continue;
      return { ...m, k };
    }
  },
  choices: (p) => {
    const [X, Y] = lineAt(p, p.k);
    const all = options(
      { tex: pair(X, Y) },
      { tex: pair(p.u * p.k, p.v * p.k) },
      { tex: pair(Y, X) },
      { tex: pair(X + p.u, Y + p.v) },
      { tex: pair(p.x0, p.y0) },
      { tex: pair(X, p.y0) },
    );
    return steered(all.slice(0, 4), mix(X, Y, p.k), all.slice(4));
  },
  render: (p): Slide => {
    const [X, Y] = lineAt(p, p.k);
    return {
      kind: 'tiles',
      prompt: [...lineIntro(p), prose(`Where is it when $t = ${p.k}$?`)],
      template: '({0}, {1})',
      bank: numberBank([X, Y], [p.u * p.k, p.v * p.k, X + p.u, Y + p.v, p.x0, p.y0]),
      answer: [`${X}`, `${Y}`],
    };
  },
  solution: (p) => {
    const [X, Y] = lineAt(p, p.k);
    return [
      { text: `Put $t = ${p.k}$ into the $x$ equation.`, tex: `x = ${lineAtTex(p.x0, p.u, p.k)} = ${X}` },
      { text: 'Then into the $y$ equation.', tex: `y = ${lineAtTex(p.y0, p.v, p.k)} = ${Y}` },
      { text: `So it is at $${pair(X, Y)}$.` },
    ];
  },
};

/* ---------- Where it starts ---------- */

/** Where the object starts: t = 0. The slips are the rates and the point a second in. */
function startOptions(m: LineMotion): string[] {
  const out: string[] = [];
  for (const label of [
    pair(m.x0, m.y0),
    pair(m.u, m.v),
    pair(m.x0 + m.u, m.y0 + m.v),
    pair(m.y0, m.x0),
    pair(m.x0 + 2 * m.u, m.y0 + 2 * m.v),
    pair(m.u, m.y0),
  ]) {
    if (!out.includes(label)) out.push(label);
    if (out.length === 4) break;
  }
  return out;
}

const lineStart: Generator<LineMotion> = {
  id: 'pmod-start',
  sample: (rng, difficulty) => {
    for (;;) {
      const m = sampleLine(rng, difficulty >= 2);
      if (m.x0 === m.u && m.y0 === m.v) continue;
      return m;
    }
  },
  render: (m): Slide => {
    const labels = startOptions(m);
    const ordered = turned(labels, mix(m.x0, m.u, m.y0, m.v) % labels.length);
    return {
      kind: 'choice',
      prompt: [...lineIntro(m), prose('Where does it start?')],
      options: ordered.map((label, i) => ({ id: `o${i}`, label, tex: true })),
      correctId: `o${ordered.indexOf(labels[0])}`,
    };
  },
  solution: (m) => [
    { text: 'It starts at $t = 0$, where every $t$ term is zero.', tex: `x = ${m.x0} \\qquad y = ${m.y0}` },
    { text: `So it starts at $${pair(m.x0, m.y0)}$. The numbers multiplying $t$ are how far it moves each second.` },
  ],
};

/* ---------- How far it has moved across ---------- */

export interface MovedParams extends LineMotion {
  /** From t = a to t = b; a is 0 at difficulty 1. */
  a: number;
  b: number;
}

const moved: Generator<MovedParams> = {
  id: 'pmod-moved',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const m = sampleLine(rng, hard);
      const u = hard ? rng.int(2, 8) : rng.int(2, 6);
      const a = hard ? rng.int(1, 4) : 0;
      const b = a + (hard ? rng.int(2, 5) : rng.int(2, 5));
      const x0 = hard ? m.x0 : rng.int(2, 10);
      if (u === Math.abs(m.v)) continue;
      return { ...m, x0, u, a, b };
    }
  },
  choices: (p) => {
    const d = p.u * (p.b - p.a);
    const xb = p.x0 + p.u * p.b;
    return numberChoices(d, [xb, Math.abs(p.v) * (p.b - p.a), p.u * p.b, xb + p.x0 + p.u * p.a], mix(p.x0, p.u, p.a, p.b));
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      ...lineIntro(p),
      prose(
        p.a === 0
          ? `How many metres has it moved across in the first $${p.b}$ seconds?`
          : `How many metres does it move across between $t = ${p.a}$ and $t = ${p.b}$?`,
      ),
    ],
    lead: '\\text{distance} =',
    keypad: [],
    answer: `${p.u * (p.b - p.a)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => {
    const xa = p.x0 + p.u * p.a;
    const xb = p.x0 + p.u * p.b;
    return [
      { text: `At $t = ${p.a}$:`, tex: `x = ${lineAtTex(p.x0, p.u, p.a)} = ${xa}` },
      { text: `At $t = ${p.b}$:`, tex: `x = ${lineAtTex(p.x0, p.u, p.b)} = ${xb}` },
      { text: 'The distance across is the change in $x$.', tex: `${xb} - ${bracketed(xa)} = ${xb - xa}` },
    ];
  },
};

/* ---------- A thrown ball ---------- */

/** x = u t, y = h + v t - 5 t^2. */
export interface Ball {
  u: number;
  v: number;
  h: number;
}

export const ballXTex = (u: number): string => (u === 1 ? 't' : `${u}t`);
export const ballYTex = (h: number, v: number): string => `${h === 0 ? '' : `${h} + `}${v}t - 5t^{2}`;
export const ballSources = (b: Ball): { x: string; y: string } => ({
  x: `(${b.u})*t`,
  y: `(${b.h}) + (${b.v})*t - 5*t^2`,
});

const ballAt = (b: Ball, t: number): [number, number] => [b.u * t, b.h + b.v * t - 5 * t * t];

const ballBlocks = (b: Ball): Block[] => [display(`x = ${ballXTex(b.u)} \\qquad y = ${ballYTex(b.h, b.v)}`)];

const ballIntro = (b: Ball): Block[] => [
  prose(`A ball is thrown from ${b.h === 0 ? 'the ground' : `a height of $${b.h}$ metres`}. After $t$ seconds it is at`),
  ...ballBlocks(b),
];

/* ---------- Height at a time ---------- */

export interface HeightParams extends Ball {
  k: number;
}

/**
 * The height at a time, as a tree: $vt$ and $5t^{2}$ worked separately, then
 * one taken from the other. The bank carries $5t$ for the square forgotten and
 * $(5t)^{2}$ for the square taken of the whole product.
 */
const heightTree: Generator<HeightParams> = {
  id: 'pmod-height-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const v = hard ? multiple(rng, 5, 20, 50) : multiple(rng, 5, 10, 40);
    const k = rng.int(hard ? 2 : 1, v / 5 - 1);
    return { u: rng.int(2, hard ? 9 : 6), v, h: 0, k };
  },
  render: (p): Slide => {
    const a = p.v * p.k;
    const b = 5 * p.k * p.k;
    return {
      kind: 'tree',
      prompt: [
        ...ballIntro(p),
        prose(`How high is it at $t = ${p.k}$? Work out $${p.v}t$ and $5t^{2}$ first, then take one from the other.`),
      ],
      expression: `${p.v}(${p.k}) - 5(${p.k})^{2}`,
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: [] },
        { id: 'y', from: ['a', 'b'] },
      ],
      bank: treeBank([a, b, a - b], [5 * p.k, 25 * p.k * p.k, a + b, a - 5 * p.k]),
      answer: [`${a}`, `${b}`, `${a - b}`],
    };
  },
  solution: (p) => {
    const a = p.v * p.k;
    const b = 5 * p.k * p.k;
    return [
      { text: `Put $t = ${p.k}$ into $y$.`, tex: `y = ${p.v}(${p.k}) - 5(${p.k})^{2}` },
      { text: 'Square first, then multiply by $5$.', tex: `= ${a} - ${b}` },
      { tex: `= ${a - b}` },
      { text: `So it is $${a - b}$ metres up, and $${p.u * p.k}$ metres across.` },
    ];
  },
};

/* ---------- When it reaches a value ---------- */

export interface ReachParams extends LineMotion {
  T: number;
}

/** Which coordinate is given: a drone's height, a boat's x. */
const reachAxis = (p: ReachParams): 'x' | 'y' => (p.obj === 'drone' ? 'y' : 'x');

function reachParts(p: ReachParams) {
  const along = reachAxis(p);
  const start = along === 'y' ? p.y0 : p.x0;
  const rate = along === 'y' ? p.v : p.u;
  const otherStart = along === 'y' ? p.x0 : p.y0;
  const otherRate = along === 'y' ? p.u : p.v;
  return {
    along,
    other: along === 'y' ? 'x' : 'y',
    start,
    rate,
    target: start + rate * p.T,
    otherStart,
    otherRate,
    otherValue: otherStart + otherRate * p.T,
  };
}

function sampleReach(rng: Rng, difficulty: number): ReachParams {
  const hard = difficulty >= 2;
  for (;;) {
    const m = sampleLine(rng, hard);
    const T = hard ? rng.int(2, 8) : rng.int(2, 6);
    const p = { ...m, T };
    const { target } = reachParts(p);
    if (m.obj === 'drone' && target <= 0) continue;
    return p;
  }
}

const reachQuestion = (p: ReachParams): string =>
  reachAxis(p) === 'y'
    ? `When is it $${reachParts(p).target}$ metres up?`
    : `When does it reach $x = ${reachParts(p).target}$?`;

function reachSolution(p: ReachParams): SolutionStep[] {
  const { along, start, rate, target } = reachParts(p);
  return [
    { text: `Set the $${along}$ equation equal to $${target}$.`, tex: `${lineTex(start, rate)} = ${target}` },
    { tex: `${rate === 1 ? '' : rate === -1 ? '-' : rate}t = ${target - start}` },
    { tex: `t = ${p.T}` },
  ];
}

const reachTime: Generator<ReachParams> = {
  id: 'pmod-reach-time',
  sample: sampleReach,
  choices: (p) => {
    const { start, rate, target } = reachParts(p);
    const slips = [target - start, p.T + 1];
    if (target % rate === 0) slips.unshift(target / rate);
    if ((target + start) % rate === 0) slips.push((target + start) / rate);
    return numberChoices(p.T, slips, mix(p.T, start, rate, target));
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [...lineIntro(p), prose(reachQuestion(p))],
    lead: 't =',
    keypad: [],
    answer: `${p.T}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: reachSolution,
};

/**
 * When, then where: the time from the coordinate given, then the other
 * coordinate at that time.
 */
const reachTree: Generator<ReachParams> = {
  id: 'pmod-reach-tree',
  sample: sampleReach,
  render: (p): Slide => {
    const { along, start, rate, target, otherStart, otherRate, otherValue } = reachParts(p);
    return {
      kind: 'tree',
      prompt: [
        ...lineIntro(p),
        prose(
          along === 'y'
            ? `Where is it when it is $${target}$ metres up? The top box is $t$; the box below is $x$ then.`
            : `Where is it when it reaches $x = ${target}$? The top box is $t$; the box below is $y$ then.`,
        ),
      ],
      expression: `${lineTex(start, rate)} = ${target}`,
      nodes: [
        { id: 't', from: [] },
        { id: 'o', from: ['t'] },
      ],
      bank: treeBank(
        [p.T, otherValue],
        [target - start, otherValue + otherRate, otherStart + otherRate, otherValue - otherRate],
      ),
      answer: [`${p.T}`, `${otherValue}`],
    };
  },
  solution: (p) => {
    const { other, otherStart, otherRate, otherValue } = reachParts(p);
    return [
      ...reachSolution(p),
      { text: `Put $t = ${p.T}$ into the $${other}$ equation.`, tex: `${other} = ${lineAtTex(otherStart, otherRate, p.T)} = ${otherValue}` },
    ];
  },
};

/* ---------- When a ball lands ---------- */

function sampleLand(rng: Rng, difficulty: number): Ball {
  const hard = difficulty >= 2;
  return {
    u: hard ? rng.int(3, 12) : rng.int(2, 6),
    v: hard ? multiple(rng, 5, 20, 60) : multiple(rng, 5, 10, 40),
    h: 0,
  };
}

function landSolution(b: Ball): SolutionStep[] {
  const T = b.v / 5;
  return [
    { text: 'It lands when its height is $0$.', tex: `${b.v}t - 5t^{2} = 0` },
    { text: 'Take out the common factor $5t$.', tex: `5t(${T} - t) = 0` },
    { tex: `t = 0 \\quad \\text{or} \\quad t = ${T}` },
    { text: `$t = 0$ is the moment it is thrown, so it lands at $t = ${T}$.` },
  ];
}

const landTime: Generator<Ball> = {
  id: 'pmod-land-time',
  sample: sampleLand,
  choices: (b) => {
    const T = b.v / 5;
    return numberChoices(T, [0, b.v / 10, b.v, T + 1], mix(b.u, b.v));
  },
  render: (b): Slide => ({
    kind: 'expression',
    prompt: [...ballIntro(b), prose('When does it land?')],
    lead: 't =',
    keypad: [],
    answer: `${b.v / 5}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: landSolution,
};

const landingTree: Generator<Ball> = {
  id: 'pmod-landing-tree',
  sample: sampleLand,
  render: (b): Slide => {
    const T = b.v / 5;
    return {
      kind: 'tree',
      prompt: [
        ...ballIntro(b),
        prose('When does it land, and how far away? The top box is $t$ when it lands; the box below is $x$ then.'),
      ],
      expression: `${b.v}t - 5t^{2} = 0`,
      nodes: [
        { id: 't', from: [] },
        { id: 'x', from: ['t'] },
      ],
      bank: treeBank([T, b.u * T], [b.v / 10, (b.u * b.v) / 10, b.u * (T + 1), b.v]),
      answer: [`${T}`, `${b.u * T}`],
    };
  },
  solution: (b) => {
    const T = b.v / 5;
    return [...landSolution(b), { text: `Put $t = ${T}$ into $x$.`, tex: `x = ${b.u} \\times ${T} = ${b.u * T}` }];
  },
};

/* ---------- The highest point ---------- */

/** v a multiple of 10, so the top is at a whole time; h a multiple of 5. */
function sampleTop(rng: Rng, difficulty: number, launch: boolean): Ball {
  const hard = difficulty >= 2;
  return {
    u: rng.int(2, 8),
    v: hard ? multiple(rng, 10, 20, 80) : multiple(rng, 10, 10, 60),
    h: hard && launch ? multiple(rng, 5, 5, 40) : 0,
  };
}

const topT = (b: Ball): number => b.v / 10;
const topY = (b: Ball): number => b.h + 5 * topT(b) ** 2;

function topTimeSteps(b: Ball): SolutionStep[] {
  const T = topT(b);
  return [
    {
      text: 'At the top the ball stops rising for a moment, so $\\frac{dy}{dt} = 0$.',
      tex: `\\frac{dy}{dt} = ${b.v} - 10t`,
    },
    { tex: `${b.v} - 10t = 0` },
    { tex: `t = ${T}` },
  ];
}

function topHeightSteps(b: Ball): SolutionStep[] {
  const T = topT(b);
  return [
    ...topTimeSteps(b),
    { text: `Put $t = ${T}$ into $y$.`, tex: `y = ${b.h === 0 ? '' : `${b.h} + `}${b.v}(${T}) - 5(${T})^{2}` },
    { tex: `= ${b.h === 0 ? '' : `${b.h} + `}${b.v * T} - ${5 * T * T}` },
    { tex: `= ${topY(b)}` },
  ];
}

const topTime: Generator<Ball> = {
  id: 'pmod-top-time',
  sample: (rng, difficulty) => sampleTop(rng, difficulty, false),
  choices: (b) => numberChoices(topT(b), [b.v / 5, b.v, topT(b) + 1, 5 * topT(b) ** 2], mix(b.u, b.v, 1)),
  render: (b): Slide => ({
    kind: 'expression',
    prompt: [...ballIntro(b), prose('At what time is it highest?')],
    lead: 't =',
    keypad: [],
    answer: `${topT(b)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: topTimeSteps,
};

const topHeight: Generator<Ball> = {
  id: 'pmod-top',
  sample: (rng, difficulty) => sampleTop(rng, difficulty, true),
  choices: (b) => {
    const T = topT(b);
    return numberChoices(topY(b), [b.h + b.v * T, 5 * T * T, b.h + 5 * T, topY(b) + 5], mix(b.u, b.v, b.h));
  },
  render: (b): Slide => ({
    kind: 'expression',
    prompt: [...ballIntro(b), prose('What is its greatest height, in metres?')],
    lead: '\\text{height} =',
    keypad: [],
    answer: `${topY(b)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: topHeightSteps,
};

/**
 * A path in the first quadrant, with square-free scaling: the window runs
 * `xLo..xHi` across and `yLo..yHi` up, mapped to the very edge of the picture,
 * so a slider marker placed as a fraction of the figure box lines up with it.
 */
export function motionSvg(
  f: (t: number) => [number, number],
  opts: {
    tMin?: number;
    tMax: number;
    xLo: number;
    xHi: number;
    yLo: number;
    yHi: number;
    marks?: [number, number][];
    label: string;
    width?: number;
    height?: number;
  },
): string {
  const W = opts.width ?? 220;
  const H = opts.height ?? 150;
  const { xLo, xHi, yLo, yHi, tMin = 0, tMax, marks = [] } = opts;
  const sx = (v: number) => ((W * (v - xLo)) / (xHi - xLo)).toFixed(1);
  const sy = (v: number) => ((H * (yHi - v)) / (yHi - yLo)).toFixed(1);
  const parts = [`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${opts.label}">`];
  parts.push(
    `<line x1="0" y1="${sy(0)}" x2="${W}" y2="${sy(0)}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    `<line x1="${sx(0)}" y1="0" x2="${sx(0)}" y2="${H}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
  );
  const SAMPLES = 160;
  const points: string[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const [x, y] = f(tMin + ((tMax - tMin) * i) / SAMPLES);
    points.push(`${i === 0 ? 'M' : 'L'} ${sx(x)},${sy(y)}`);
  }
  parts.push(`<path fill="none" stroke="currentColor" stroke-width="2" d="${points.join(' ')}" />`);
  for (const [x, y] of marks) {
    parts.push(`<circle cx="${sx(x)}" cy="${sy(y)}" r="4" fill="currentColor" />`);
  }
  parts.push('</svg>');
  return parts.join('');
}

/** When a ball launched from height h lands: the positive root of h + vt - 5t^2. */
export const ballLands = (b: Ball): number => (b.v + Math.sqrt(b.v * b.v + 20 * b.h)) / 10;

/** A ball's flight drawn to its landing, with a margin all round. */
export function ballFigure(b: Ball, marks: [number, number][], label: string, yTop?: number): { svg: string; yLo: number; yHi: number } {
  const tEnd = ballLands(b);
  const R = b.u * tEnd;
  const yHi = yTop ?? topY(b) * 1.2;
  const yLo = -0.06 * yHi;
  const svg = motionSvg((t) => ballAt(b, t), {
    tMax: tEnd,
    xLo: -0.06 * R,
    xHi: 1.06 * R,
    yLo,
    yHi,
    marks,
    label,
  });
  return { svg, yLo, yHi };
}

/**
 * The greatest height, slid to on a picture of the flight. The height is a
 * multiple of 5 (see `sampleTop`), so the track runs in fives.
 */
const topSlider: Generator<Ball> = {
  id: 'pmod-top-slider',
  sample: (rng, difficulty) => sampleTop(rng, difficulty, true),
  render: (b): Slide => {
    const top = topY(b);
    const max = 5 * Math.ceil((top * 1.3) / 5);
    const { svg, yLo, yHi } = ballFigure(b, [[0, b.h]], 'The path of the ball from its launch until it lands', max);
    return {
      kind: 'slider',
      prompt: [...ballIntro(b), prose('Slide the line to its greatest height.')],
      min: 0,
      max,
      step: 5,
      answer: top,
      readout: 'y = {v}',
      figure: { svg, xMin: yLo, xMax: yHi, axis: 'y' },
    };
  },
  solution: topHeightSteps,
};

/** The highest point as a tree: t, then x and y there. */
const peakTree: Generator<Ball> = {
  id: 'pmod-peak-tree',
  sample: (rng, difficulty) => sampleTop(rng, difficulty, true),
  render: (b): Slide => {
    const T = topT(b);
    const X = b.u * T;
    const Y = topY(b);
    return {
      kind: 'tree',
      prompt: [
        ...ballIntro(b),
        prose('Where is its highest point? The top box is $t$ there; below it, $x$ on the left and $y$ on the right.'),
      ],
      expression: `\\frac{dy}{dt} = ${b.v} - 10t = 0`,
      nodes: [
        { id: 't', from: [] },
        { id: 'x', from: ['t'] },
        { id: 'y', from: ['t'] },
      ],
      bank: treeBank([T, X, Y], [b.v / 5, (b.u * b.v) / 5, b.h + b.v * T, Y + 5]),
      answer: [`${T}`, `${X}`, `${Y}`],
    };
  },
  solution: (b) => {
    const T = topT(b);
    return [
      ...topHeightSteps(b),
      { text: `And $x$ at the same time:`, tex: `x = ${b.u} \\times ${T} = ${b.u * T}` },
      { text: `So the highest point is $${pair(b.u * T, topY(b))}$.` },
    ];
  },
};

/* ---------- Do the paths meet? ---------- */

/** Two boats on straight lines; their x agree at T. */
export interface MeetParams {
  a1: number;
  p1: number;
  b1: number;
  q1: number;
  a2: number;
  p2: number;
  b2: number;
  q2: number;
  T: number;
}

export const meetYs = (p: MeetParams): [number, number] => [p.b1 + p.q1 * p.T, p.b2 + p.q2 * p.T];
const meetX = (p: MeetParams): number => p.a1 + p.p1 * p.T;
export const collides = (p: MeetParams): boolean => meetYs(p)[0] === meetYs(p)[1];

function sampleMeet(rng: Rng, difficulty: number): MeetParams {
  const hard = difficulty >= 2;
  for (;;) {
    const T = rng.int(hard ? 2 : 1, hard ? 7 : 5);
    const p1 = rng.int(1, 5);
    const p2 = hard ? nonZero(rng, -3, 5) : rng.int(1, 5);
    if (p1 === p2) continue;
    const a1 = rng.int(0, 10);
    const a2 = a1 + (p1 - p2) * T;
    const q1 = nonZero(rng, -3, 5);
    const q2 = nonZero(rng, -3, 5);
    const b1 = rng.int(0, 10);
    const shift = rng.chance(0.5) ? 0 : nonZero(rng, -4, 4);
    const b2 = b1 + (q1 - q2) * T + shift;
    if (Math.abs(a2) > 40 || Math.abs(b2) > 40 || a2 === a1) continue;
    return { a1, p1, b1, q1, a2, p2, b2, q2, T };
  }
}

const meetIntro = (p: MeetParams): Block[] => [
  prose('Two boats move so that after $t$ seconds boat A is at'),
  display(`x = ${lineTex(p.a1, p.p1)} \\qquad y = ${lineTex(p.b1, p.q1)}`),
  prose('and boat B is at'),
  display(`x = ${lineTex(p.a2, p.p2)} \\qquad y = ${lineTex(p.b2, p.q2)}`),
];

function meetTimeSteps(p: MeetParams): SolutionStep[] {
  const k = p.p1 - p.p2;
  return [
    { text: 'Set their $x$-coordinates equal.', tex: `${lineTex(p.a1, p.p1)} = ${lineTex(p.a2, p.p2)}` },
    { tex: `${k === 1 ? '' : k === -1 ? '-' : k}t = ${p.a2 - p.a1}` },
    { tex: `t = ${p.T}` },
  ];
}

function meetYSteps(p: MeetParams): SolutionStep[] {
  const [yA, yB] = meetYs(p);
  return [
    { text: `At $t = ${p.T}$, boat A has`, tex: `y = ${lineAtTex(p.b1, p.q1, p.T)} = ${yA}` },
    { text: 'and boat B has', tex: `y = ${lineAtTex(p.b2, p.q2, p.T)} = ${yB}` },
    {
      text:
        yA === yB
          ? `Both are at $${pair(meetX(p), yA)}$ at the same time, so they collide.`
          : `Their $y$-coordinates differ at that time, so they do not collide.`,
    },
  ];
}

const meetTime: Generator<MeetParams> = {
  id: 'pmod-meet-time',
  sample: sampleMeet,
  choices: (p) => {
    const gap = p.a2 - p.a1;
    const slips = [gap, p.T + 1];
    const sum = p.p1 + p.p2;
    if (sum !== 0 && gap % sum === 0) slips.unshift(gap / sum);
    slips.push(-p.T);
    return numberChoices(p.T, slips, mix(p.a1, p.a2, p.p1, p.p2));
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [...meetIntro(p), prose('When are their $x$-coordinates equal?')],
    lead: 't =',
    keypad: [],
    answer: `${p.T}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: meetTimeSteps,
};

const meetTree: Generator<MeetParams> = {
  id: 'pmod-meet-tree',
  sample: sampleMeet,
  render: (p): Slide => {
    const [yA, yB] = meetYs(p);
    const [yA1, yB1] = meetYs({ ...p, T: p.T + 1 });
    return {
      kind: 'tree',
      prompt: [
        ...meetIntro(p),
        prose("The top box is $t$ when their $x$-coordinates are equal; below it, each boat's $y$ then: A on the left, B on the right."),
      ],
      expression: `${lineTex(p.a1, p.p1)} = ${lineTex(p.a2, p.p2)}`,
      nodes: [
        { id: 't', from: [] },
        { id: 'A', from: ['t'] },
        { id: 'B', from: ['t'] },
      ],
      bank: treeBank([p.T, yA, yB], [yA1, yB1, p.a2 - p.a1, p.b1 + p.q1]),
      answer: [`${p.T}`, `${yA}`, `${yB}`],
    };
  },
  solution: (p) => [...meetTimeSteps(p), ...meetYSteps(p)],
};

/**
 * Collide or not, as three decisions: the time the x agree, both y there,
 * then the verdict. Every outcome states where things are, never whether
 * the pick was right.
 */
const meetFlow: Generator<MeetParams> = {
  id: 'pmod-meet-flow',
  sample: sampleMeet,
  render: (p): Slide => {
    const [yA, yB] = meetYs(p);
    const X = meetX(p);
    const salt = mix(p.a1, p.a2, p.b1, p.b2, p.T);
    const xsAt = (t: number) => `Then A has $x = ${p.a1 + p.p1 * t}$ and B has $x = ${p.a2 + p.p2 * t}$.`;
    const tWrong = [p.T + 1, p.a2 - p.a1].filter((t, i, all) => t !== p.T && t > 0 && all.indexOf(t) === i);
    if (tWrong.length === 0) tWrong.push(p.T + 2);
    const ysLabel = (a: number, b: number) => `A: $y = ${a}$, B: $y = ${b}$`;
    const right = ysLabel(yA, yB);
    const [yA1, yB1] = meetYs({ ...p, T: p.T + 1 });
    const ysWrong = [ysLabel(yA1, yB1), ysLabel(p.b1, p.b2)].filter((l, i, all) => l !== right && all.indexOf(l) === i);
    const fact = collides(p)
      ? `Both boats are at $${pair(X, yA)}$ when $t = ${p.T}$.`
      : `At $t = ${p.T}$, A is at $${pair(X, yA)}$ and B is at $${pair(X, yB)}$.`;
    return {
      kind: 'flow',
      prompt: [...meetIntro(p), prose('Do the boats collide?')],
      subject: 'x_A = x_B',
      steps: [
        {
          id: 't',
          ask: 'When are their $x$-coordinates equal?',
          branches: turned(
            [
              { label: `$t = ${p.T}$`, to: 'y' },
              ...tWrong.map((t) => ({ label: `$t = ${t}$`, outcome: xsAt(t) })),
            ],
            salt % (tWrong.length + 1),
          ),
        },
        {
          id: 'y',
          ask: `What are their $y$-coordinates at $t = ${p.T}$?`,
          branches: turned(
            [
              { label: right, to: 'verdict' },
              ...ysWrong.map((label) => ({ label, outcome: `At $t = ${p.T}$ the boats are at $x = ${X}$.` })),
            ],
            (salt >>> 4) % (ysWrong.length + 1),
          ),
        },
        {
          id: 'verdict',
          ask: 'So do they collide?',
          branches: [
            { label: 'Yes', outcome: fact },
            { label: 'No', outcome: fact },
          ],
        },
      ],
      answer: [`$t = ${p.T}$`, right, collides(p) ? 'Yes' : 'No'],
    };
  },
  solution: (p) => [...meetTimeSteps(p), ...meetYSteps(p)],
};

/* ---------- The path without t ---------- */

/** A straight-line motion whose path has a whole gradient: v = m u. */
export interface LinePathParams {
  x0: number;
  u: number;
  y0: number;
  m: number;
}

export const pathC = (p: LinePathParams): number => p.y0 - p.m * p.x0;

function sampleLinePath(rng: Rng, difficulty: number): LinePathParams {
  const hard = difficulty >= 2;
  for (;;) {
    const p: LinePathParams = {
      x0: rng.int(1, 8),
      u: hard ? rng.int(2, 3) : 1,
      y0: rng.int(-5, 10),
      m: (hard ? rng.int(2, 5) : rng.int(2, 6)) * rng.sign(),
    };
    const c = pathC(p);
    if (c === 0 || Math.abs(c) > 40 || p.y0 === 0) continue;
    return p;
  }
}

const linePathIntro = (p: LinePathParams): Block[] => [
  prose('A boat moves so that after $t$ seconds it is at'),
  display(`x = ${lineTex(p.x0, p.u)} \\qquad y = ${lineTex(p.y0, p.m * p.u)}`),
];

/** t made the subject of x = x0 + u t. */
const tSubject = (p: LinePathParams): string => (p.u === 1 ? `x - ${p.x0}` : `\\frac{x - ${p.x0}}{${p.u}}`);

const lineEq = (m: number, c: number): string => `y = ${m === 1 ? '' : m === -1 ? '-' : m}x ${signed(c)}`;

function linePathSteps(p: LinePathParams): SolutionStep[] {
  const v = p.m * p.u;
  const c = pathC(p);
  const sub = p.u === 1 ? `(x - ${p.x0})` : ` \\times \\frac{x - ${p.x0}}{${p.u}}`;
  return [
    { text: 'Make $t$ the subject of the $x$ equation.', tex: `t = ${tSubject(p)}` },
    { text: 'Put it into the $y$ equation.', tex: `y = ${p.y0} ${v < 0 ? '-' : '+'} ${Math.abs(v)}${sub}` },
    ...(p.u === 1 ? [] : [{ tex: `y = ${p.y0} ${p.m < 0 ? '-' : '+'} ${Math.abs(p.m)}(x - ${p.x0})` }]),
    { text: 'Expand and collect.', tex: lineEq(p.m, c) },
  ];
}

/** The wrong lines on offer: start not subtracted, start forgotten, the rate not divided, the sign lost. */
function linePathSlips(p: LinePathParams): [number, number][] {
  const c = pathC(p);
  const out: [number, number][] = [];
  const seen = new Set([`${p.m},${c}`]);
  for (const [m, k] of [
    [p.m, p.y0 + p.m * p.x0],
    [p.m, p.y0],
    [p.m * p.u, p.y0 - p.m * p.u * p.x0],
    [-p.m, p.y0 + p.m * p.x0],
    [p.m, -c],
  ] as [number, number][]) {
    if (k === 0 || seen.has(`${m},${k}`)) continue;
    seen.add(`${m},${k}`);
    out.push([m, k]);
  }
  return out;
}

const linePath: Generator<LinePathParams> = {
  id: 'pmod-line-path',
  sample: sampleLinePath,
  choices: (p) => {
    const all = options({ tex: lineEq(p.m, pathC(p)) }, ...linePathSlips(p).map(([m, k]) => ({ tex: lineEq(m, k) })));
    return steered(all.slice(0, 4), mix(p.x0, p.u, p.y0, p.m), all.slice(4));
  },
  render: (p): Slide => {
    const c = pathC(p);
    const mTiles = [p.m * p.u, -p.m, p.u].map(bareTile);
    const cTiles = [p.y0 + p.m * p.x0, p.y0, -c].filter((k) => k !== 0).map(signed);
    return {
      kind: 'tiles',
      prompt: [...linePathIntro(p), prose('Find the equation of its path.')],
      template: 'y = {0}x {1}',
      bank: tokenBank([bareTile(p.m), signed(c)], [...cTiles, ...mTiles], 4),
      answer: [bareTile(p.m), signed(c)],
    };
  },
  solution: linePathSteps,
};

/** Eliminating t as two decisions: t made the subject, then the line. */
const pathFlow: Generator<LinePathParams> = {
  id: 'pmod-path-flow',
  sample: sampleLinePath,
  render: (p): Slide => {
    const c = pathC(p);
    const salt = mix(p.x0, p.u, p.y0, p.m, 7);
    // Each wrong subject, and where it puts the boat at t = 1.
    const wrongT: [string, number][] =
      p.u === 1
        ? [
            [`x + ${p.x0}`, 1 - p.x0],
            [`${p.x0} - x`, p.x0 - 1],
          ]
        : [
            [`\\frac{x + ${p.x0}}{${p.u}}`, p.u - p.x0],
            [`\\frac{x}{${p.u}} - ${p.x0}`, p.u * (1 + p.x0)],
          ];
    const right = `$${lineEq(p.m, c)}$`;
    const lines = linePathSlips(p).slice(0, 2);
    return {
      kind: 'flow',
      prompt: [...linePathIntro(p), prose('Find the equation of its path.')],
      subject: '\\text{eliminate } t',
      steps: [
        {
          id: 't',
          ask: 'Make $t$ the subject of the $x$ equation.',
          branches: turned(
            [
              { label: `$t = ${tSubject(p)}$`, to: 'line' },
              ...wrongT.map(([tex, x]) => ({
                label: `$t = ${tex}$`,
                outcome: `At $t = 1$ that gives $x = ${x}$, but the boat is at $x = ${p.x0 + p.u}$ then.`,
              })),
            ],
            salt % 3,
          ),
        },
        {
          id: 'line',
          ask: 'Put it into the $y$ equation and simplify. Which line is the path?',
          branches: turned(
            [
              { label: right, outcome: `The boat moves along $${lineEq(p.m, c)}$.` },
              ...lines.map(([m, k]) => ({
                label: `$${lineEq(m, k)}$`,
                outcome: `At $x = ${p.x0}$ that line has $y = ${m * p.x0 + k}$, but the boat starts at $${pair(p.x0, p.y0)}$.`,
              })),
            ],
            (salt >>> 3) % (lines.length + 1),
          ),
        },
      ],
      answer: [`$t = ${tSubject(p)}$`, right],
    };
  },
  solution: linePathSteps,
};

/* ---------- A ball's path ---------- */

export interface BallPathParams {
  u: number;
  v: number;
}

/** `\frac{3x}{2}`, `4x`, `x`: a fraction times x. */
function fracX(top: number, bottom: number, power: 1 | 2): string {
  const g = gcdOrOne(top, bottom);
  const p = top / g;
  const q = bottom / g;
  const x = power === 1 ? 'x' : 'x^{2}';
  if (q === 1) return `${p === 1 ? '' : p}${x}`;
  return `\\frac{${p === 1 ? '' : p}${x}}{${q}}`;
}

/** y = (a/b) x - (c/d) x^2, as the learner reads it. */
const ballPathTex = ([a, b]: [number, number], [c, d]: [number, number]): string => `${fracX(a, b, 1)} - ${fracX(c, d, 2)}`;

const ballPathAnswer = ([a, b]: [number, number], [c, d]: [number, number]): string => `(${a})/(${b})*x - (${c})/(${d})*x^2`;

const ballPath: Generator<BallPathParams> = {
  id: 'pmod-ball-path',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const u = hard ? rng.pick([2, 4, 5, 10]) : rng.pick([1, 5, 10]);
    const v = u === 10 && !hard ? multiple(rng, 10, 10, 60) : multiple(rng, 5, 10, 60);
    return { u, v };
  },
  choices: ({ u, v }) => {
    const right: [[number, number], [number, number]] = [
      [v, u],
      [5, u * u],
    ];
    const slips: [[number, number], [number, number]][] = [
      [
        [v, u],
        [5, u],
      ],
      [
        [v, u],
        [1, u * u],
      ],
      [
        [v * u, 1],
        [5 * u * u, 1],
      ],
      [
        [v, u],
        [25, u * u],
      ],
      [
        [v, 1],
        [5, u * u],
      ],
      [
        [v, u],
        [10, u * u],
      ],
    ];
    const key = ([[a, b], [c, d]]: [[number, number], [number, number]]) => `${a / b},${c / d}`;
    const seen = new Set([key(right)]);
    const wrong: Omit<ChoiceOption, 'correct'>[] = [];
    for (const slip of slips) {
      if (seen.has(key(slip))) continue;
      seen.add(key(slip));
      wrong.push({ tex: `y = ${ballPathTex(...slip)}`, answer: ballPathAnswer(...slip) });
    }
    const all = options({ tex: `y = ${ballPathTex(...right)}`, answer: ballPathAnswer(...right) }, ...wrong);
    return steered(all.slice(0, 4), mix(u, v), all.slice(4));
  },
  render: ({ u, v }): Slide => ({
    kind: 'expression',
    prompt: [...ballIntro({ u, v, h: 0 }), prose('Find the equation of its path, $y$ in terms of $x$.')],
    lead: 'y =',
    keypad: X_KEYS,
    answer: ballPathAnswer([v, u], [5, u * u]),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ u, v }) => {
    if (u === 1) {
      return [
        { text: 'The $x$ equation already gives $t$.', tex: 't = x' },
        { text: 'Put it into the $y$ equation.', tex: `y = ${v}x - 5x^{2}` },
      ];
    }
    const over = `\\frac{x}{${u}}`;
    const raw = `y = \\frac{${v}x}{${u}} - \\frac{5x^{2}}{${u * u}}`;
    const simplest = `y = ${ballPathTex([v, u], [5, u * u])}`;
    return [
      { text: 'Make $t$ the subject of the $x$ equation.', tex: `t = ${over}` },
      {
        text: 'Put it into the $y$ equation, squaring the whole fraction.',
        tex: `y = ${v} \\times ${over} - 5\\left(${over}\\right)^{2}`,
      },
      { tex: raw },
      ...(simplest === raw ? [] : [{ text: 'Simplify each fraction.', tex: simplest }]),
    ];
  },
};

/* ---------- Which values make sense ---------- */

export interface DomainParams {
  u: number;
  v: number;
  ask: 't' | 'x';
}

/** The options: the flight, then forever, half the flight, and a slip of the numbers. */
export function domainLabels(p: DomainParams): string[] {
  const T = p.v / 5;
  if (p.ask === 't') return [`0 \\le t \\le ${T}`, 't \\ge 0', `0 \\le t \\le ${T / 2}`, `0 \\le t \\le ${p.v}`];
  return [`0 \\le x \\le ${p.u * T}`, 'x \\ge 0', `0 \\le x \\le ${(p.u * T) / 2}`, `0 \\le x \\le ${p.u * p.v}`];
}

const domain: Generator<DomainParams> = {
  id: 'pmod-domain',
  sample: (rng, difficulty) => ({
    u: rng.int(2, 8),
    v: multiple(rng, 10, 10, 60),
    ask: difficulty >= 2 && rng.chance(0.5) ? 'x' : 't',
  }),
  render: (p): Slide => {
    const labels = domainLabels(p);
    const ordered = turned(labels, mix(p.u, p.v, p.ask === 't' ? 1 : 2) % labels.length);
    return {
      kind: 'choice',
      prompt: [
        ...ballIntro({ u: p.u, v: p.v, h: 0 }),
        prose(
          p.ask === 't'
            ? 'For which values of $t$ does the model describe its flight?'
            : 'Which values of $x$ does its flight cover?',
        ),
      ],
      options: ordered.map((label, i) => ({ id: `o${i}`, label, tex: true })),
      correctId: `o${ordered.indexOf(labels[0])}`,
    };
  },
  solution: (p) => {
    const T = p.v / 5;
    const steps: SolutionStep[] = [
      { text: 'It lands when $y = 0$.', tex: `${p.v}t - 5t^{2} = 0` },
      { tex: `5t(${T} - t) = 0` },
      { text: `So it is in the air from the throw at $t = 0$ until $t = ${T}$.`, tex: `0 \\le t \\le ${T}` },
    ];
    if (p.ask === 'x') {
      steps.push({
        text: `Across, $x = ${p.u}t$ runs from $0$ to $${p.u} \\times ${T} = ${p.u * T}$.`,
        tex: `0 \\le x \\le ${p.u * T}`,
      });
    }
    return steps;
  },
};

export const paramModelGenerators = [
  linePoint,
  lineStart,
  moved,
  heightTree,
  reachTime,
  reachTree,
  landTime,
  landingTree,
  topTime,
  topHeight,
  topSlider,
  peakTree,
  meetTime,
  meetTree,
  meetFlow,
  linePath,
  pathFlow,
  ballPath,
  domain,
] as Generator<unknown>[];

/** Exported for the independent test. */
export { ballAt };
