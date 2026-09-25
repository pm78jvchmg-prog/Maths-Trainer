/**
 * Contest Math, level 12: More Advanced Algebra.
 *
 * Six lessons: systems of equations, rates, quadratics, exponents, special
 * functions and logarithms. Each question gives way to one move: add or
 * subtract whole equations, time the thing instead of following it, complete
 * the square, put both sides over one base, pair the terms from the two ends,
 * change every logarithm to one base.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { Generator, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import type { Rng } from '../../engine/rng';
import { FRACTION_KEYS, fracTex, lcm, num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ---------- small TeX helpers ---------- */

/** ` + 5`, ` - 5`, or nothing for 0: a term written after another. */
const signed = (n: number): string => (n === 0 ? '' : n > 0 ? ` + ${n}` : ` - ${-n}`);

/** A coefficient in front of a letter: `x`, `-x`, `3x`. */
const coef = (n: number, letter = 'x'): string => (n === 1 ? letter : n === -1 ? `-${letter}` : `${n}${letter}`);

/** A linear term after another: ` + 3x`, ` - x`. */
const signedX = (n: number): string => (n === 0 ? '' : n > 0 ? ` + ${coef(n)}` : ` - ${coef(-n)}`);

/** `ax^2 + bx + c`, zero terms left out. */
const quadTex = (a: number, b: number, c: number): string => `${a === 1 ? '' : a}x^2${signedX(b)}${signed(c)}`;

/** `x + 3`, `x - 3`, or `x`. */
const shift = (p: number): string => `x${signed(p)}`;

/** `b^{e}`, a first power written bare. */
const pw = (b: number | string, e: number): string => (e === 1 ? `${b}` : `${b}^{${e}}`);

/* ================================================================
 * Lesson 1: Systems of Equations
 * ================================================================ */

/* ---------- a sum and a difference of squares ---------- */

interface SumDiffParams {
  x: number;
  y: number;
  askX: boolean;
}

const cmAaSumDiff: Generator<SumDiffParams> = {
  id: 'cm-aa-sum-diff',
  sample(rng, difficulty) {
    for (;;) {
      const x = rng.int(6, difficulty >= 2 ? 45 : 35);
      const y = rng.int(1, x - 1);
      if (x + y > 70 || x - y < 2) continue;
      return { x, y, askX: difficulty >= 2 };
    }
  },
  render({ x, y, askX }) {
    const s = x + y;
    return typed(
      [say('Two numbers $x$ and $y$ satisfy'), show(`x + y = ${s}`), show(`x^2 - y^2 = ${s * (x - y)}`), say(askX ? 'Find $x$.' : 'Find $x - y$.')],
      askX ? x : x - y,
      askX ? 'x =' : 'x - y =',
    );
  },
  choices({ x, y, askX }) {
    const s = x + y;
    const d = x - y;
    return askX ? numberOptions(x, [y, d, s + d, s], 1, 1) : numberOptions(d, [s - d, 2 * d, s * d - s, d + 2], 1, 1);
  },
  solution({ x, y, askX }) {
    const s = x + y;
    const d = x - y;
    const steps: SolutionStep[] = [
      { text: 'Do not solve for the numbers. Factorise the difference of squares:' },
      { tex: 'x^2 - y^2 = (x + y)(x - y)' },
      { tex: `${s * d} = ${s}(x - y)` },
      { tex: `x - y = ${s * d} \\div ${s} = ${d}` },
    ];
    if (askX) {
      steps.push(
        { text: 'Now add the equations for $x + y$ and $x - y$, and $y$ cancels:' },
        { tex: `2x = ${s} + ${d} = ${2 * x}` },
        { tex: `x = ${x}` },
      );
    }
    return steps;
  },
};

/* ---------- 2x + y + z, x + 2y + z, x + y + 2z ---------- */

interface CyclicParams {
  x: number;
  y: number;
  z: number;
  askX: boolean;
}

const cyclicTotals = ({ x, y, z }: CyclicParams) => [2 * x + y + z, x + 2 * y + z, x + y + 2 * z];

const cmAaCyclic: Generator<CyclicParams> = {
  id: 'cm-aa-cyclic',
  sample(rng, difficulty) {
    for (;;) {
      const top = difficulty >= 2 ? 40 : 20;
      const x = rng.int(1, top);
      const y = rng.int(1, top);
      const z = rng.int(1, top);
      if (x === y || y === z || x === z) continue;
      return { x, y, z, askX: difficulty >= 2 };
    }
  },
  render(p) {
    const [a, b, c] = cyclicTotals(p);
    return typed(
      [say('Solve as little as you can.'), show(`2x + y + z = ${a}`), show(`x + 2y + z = ${b}`), show(`x + y + 2z = ${c}`), say(p.askX ? 'Find $x$.' : 'Find $x + y + z$.')],
      p.askX ? p.x : p.x + p.y + p.z,
      p.askX ? 'x =' : 'x + y + z =',
    );
  },
  choices(p) {
    const [a, b, c] = cyclicTotals(p);
    const t = p.x + p.y + p.z;
    return p.askX ? numberOptions(p.x, [t, p.y, p.z, a / 2], 1, 1) : numberOptions(t, [(a + b + c) / 3, (a + b + c) / 2, a + b + c, p.x], 1, 1);
  },
  solution(p) {
    const [a, b, c] = cyclicTotals(p);
    const t = p.x + p.y + p.z;
    const steps: SolutionStep[] = [
      { text: 'Add all three equations. Each letter appears $2 + 1 + 1 = 4$ times on the left:' },
      { tex: `4(x + y + z) = ${a} + ${b} + ${c} = ${a + b + c}` },
      { tex: `x + y + z = ${t}` },
    ];
    if (p.askX) {
      steps.push({ text: 'The first equation is $x + y + z$ with one more $x$:' }, { tex: `x = ${a} - ${t} = ${p.x}` });
    }
    return steps;
  },
};

/* ---------- swapped coefficients ---------- */

interface SwapParams {
  a: number;
  b: number;
  p: number;
  q: number;
  ctx: number;
  askOne: boolean;
}

const SWAP = [
  { one: 'apple', many: 'apples', l: 'A', two: 'pear', twos: 'pears', m: 'P' },
  { one: 'mug', many: 'mugs', l: 'M', two: 'plate', twos: 'plates', m: 'P' },
  { one: 'notebook', many: 'notebooks', l: 'N', two: 'ruler', twos: 'rulers', m: 'R' },
  { one: 'cake', many: 'cakes', l: 'C', two: 'bun', twos: 'buns', m: 'B' },
  { one: 'stamp', many: 'stamps', l: 'S', two: 'envelope', twos: 'envelopes', m: 'E' },
];

const swapTotals = ({ a, b, p, q }: SwapParams) => [a * p + b * q, b * p + a * q];

function sampleSwap(rng: Rng, difficulty: number, askOne: boolean): SwapParams {
  const a = rng.int(3, 8);
  const b = rng.int(1, a - 1);
  const p = rng.int(8, difficulty >= 2 ? 90 : 45);
  const q = rng.int(4, p - 2);
  return { a, b, p, q, ctx: rng.int(0, SWAP.length - 1), askOne };
}

function swapFacts(s: SwapParams): string {
  const c = SWAP[s.ctx];
  const [m, n] = swapTotals(s);
  const count = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  return `${count(s.a, c.one, c.many)} and ${count(s.b, c.two, c.twos)} cost ${m}p. ${count(s.b, c.one, c.many)} and ${count(s.a, c.two, c.twos)} cost ${n}p.`;
}

function swapSolution(s: SwapParams, full: boolean): SolutionStep[] {
  const c = SWAP[s.ctx];
  const [m, n] = swapTotals(s);
  const [L, M] = [c.l, c.m];
  const steps: SolutionStep[] = [
    { text: `Call the prices $${L}$ and $${M}$ in pence:` },
    { tex: `${coef(s.a, L)} + ${coef(s.b, M)} = ${m}` },
    { tex: `${coef(s.b, L)} + ${coef(s.a, M)} = ${n}` },
    { text: `Add them: each letter now appears ${s.a + s.b} times.` },
    { tex: `${s.a + s.b}(${L} + ${M}) = ${m + n}` },
    { tex: `${L} + ${M} = ${s.p + s.q}` },
  ];
  if (full) {
    steps.push(
      { text: 'Take the second from the first:' },
      ...(s.a - s.b === 1 ? [] : [{ tex: `${s.a - s.b}(${L} - ${M}) = ${m - n}` }]),
      { tex: `${L} - ${M} = ${s.p - s.q}` },
      { text: `Add the sum and the difference, and $${M}$ cancels:` },
      { tex: `2${L} = ${s.p + s.q} + ${s.p - s.q} = ${2 * s.p}` },
      { tex: `${L} = ${s.p}` },
    );
  }
  return steps;
}

const cmAaSwap: Generator<SwapParams> = {
  id: 'cm-aa-swap',
  sample: (rng, difficulty) => sampleSwap(rng, difficulty, difficulty >= 2),
  render(s) {
    const c = SWAP[s.ctx];
    return typed(
      [say(swapFacts(s)), say(s.askOne ? `How much does one ${c.one} cost, in pence?` : `How much do one ${c.one} and one ${c.two} cost together, in pence?`)],
      s.askOne ? s.p : s.p + s.q,
      '\\text{pence} =',
    );
  },
  choices(s) {
    const [m, n] = swapTotals(s);
    return s.askOne
      ? numberOptions(s.p, [s.q, s.p + s.q, s.p - s.q, (s.p + s.q) / 2], 1, 1)
      : numberOptions(s.p + s.q, [(m + n) / 2, m - n, s.p, m + n], 1, 1);
  },
  solution: (s) => swapSolution(s, s.askOne),
};

const cmAaSwapTiles: Generator<SwapParams> = {
  id: 'cm-aa-swap-tiles',
  sample: (rng, difficulty) => sampleSwap(rng, difficulty, true),
  render(s) {
    const c = SWAP[s.ctx];
    const [m, n] = swapTotals(s);
    return {
      kind: 'tiles',
      prompt: [say(swapFacts(s)), say(`Call the prices $${c.l}$ and $${c.m}$ in pence, and fill in the working.`)],
      template: `${c.l} + ${c.m} = {0}, \\quad ${c.l} - ${c.m} = {1}, \\quad ${c.l} = {2}`,
      bank: numberBank([s.p + s.q, s.p - s.q, s.p], [s.q, (m + n) / 2, m - n, s.p + 1], 3, 1, 1),
      answer: [num(s.p + s.q), num(s.p - s.q), num(s.p)],
    };
  },
  solution: (s) => swapSolution(s, true),
};

/* ================================================================
 * Lesson 2: Rates and Ratios
 * ================================================================ */

const TRIPS = [
  { who: 'courier', verb: 'travels', place: 'depot' },
  { who: 'drone', verb: 'flies', place: 'beacon' },
  { who: 'robot', verb: 'rolls', place: 'charging point' },
  { who: 'boat', verb: 'sails', place: 'harbour' },
];

const hours = (n: number) => `${n} hour${n === 1 ? '' : 's'}`;

/* ---------- average speed there and back ---------- */

interface AvgParams {
  u: number;
  v: number;
  ctx: number;
  /** Difficulty 2: the average is given, the return speed asked. */
  target: number;
}

const harmonic = (u: number, v: number) => (2 * u * v) / (u + v);

const cmAaAvgSpeed: Generator<AvgParams> = {
  id: 'cm-aa-avg-speed',
  sample(rng, difficulty) {
    for (;;) {
      const ctx = rng.int(0, TRIPS.length - 1);
      if (difficulty >= 2) {
        const u = rng.int(6, 60);
        const target = rng.int(Math.ceil(u / 2) + 1, 2 * u - 1);
        if (target === u || (target * u) % (2 * u - target) !== 0) continue;
        const v = (target * u) / (2 * u - target);
        if (v > 150 || v === u || 2 * target - u === v) continue;
        return { u, v, ctx, target };
      }
      const u = rng.int(4, 60);
      const v = rng.int(4, 90);
      if (u === v || (u + v) % 2 !== 0 || !Number.isInteger(harmonic(u, v))) continue;
      return { u, v, ctx, target: 0 };
    }
  },
  render({ u, v, ctx, target }) {
    const t = TRIPS[ctx];
    if (target) {
      return typed(
        [say(`A ${t.who} ${t.verb} to a ${t.place} at ${u} km/h. How fast must it come back the same way, for an average of ${target} km/h over the whole trip?`)],
        v,
        '\\text{km/h} =',
      );
    }
    return typed(
      [say(`A ${t.who} ${t.verb} to a ${t.place} at ${u} km/h and straight back the same way at ${v} km/h.`), say('What is the average speed for the whole trip?')],
      harmonic(u, v),
      '\\text{km/h} =',
    );
  },
  choices({ u, v, target }) {
    if (target) return numberOptions(v, [2 * target - u, target, v + u], 1, 1);
    const h = harmonic(u, v);
    return numberOptions(h, [(u + v) / 2, (u + v) / 2 + 1, h - 2], 1, 1);
  },
  solution({ u, v, target }) {
    if (target) {
      const d = lcm(lcm(u, v), target);
      return [
        { text: `Pick a distance every speed divides: say ${d} km each way. Then the whole trip must take` },
        { tex: `${2 * d} \\div ${target} = ${(2 * d) / target} \\text{ h}` },
        { text: 'The way out already used' },
        { tex: `${d} \\div ${u} = ${d / u} \\text{ h}` },
        { text: `so the return has ${hours((2 * d) / target - d / u)} for ${d} km:` },
        { tex: `${d} \\div ${(2 * d) / target - d / u} = ${v}` },
        { text: `Averaging the speeds, $2 \\times ${target} - ${u} = ${2 * target - u}$, is the trap: the slow part of the trip takes more of the time.` },
      ];
    }
    const d = lcm(u, v);
    const time = d / u + d / v;
    return [
      { text: `Average speed is total distance over total time. Pick a distance both speeds divide: say ${d} km each way.` },
      { tex: `${d} \\div ${u} + ${d} \\div ${v} = ${d / u} + ${d / v} = ${time} \\text{ h}` },
      { tex: `${2 * d} \\div ${time} = ${harmonic(u, v)}` },
      { text: `The average of the two speeds, ${(u + v) / 2}, is the trap: more of the time is spent at the slower speed.` },
    ];
  },
};

/* ---------- the same trip, as tiles ---------- */

interface AvgTilesParams {
  u: number;
  v: number;
  d: number;
  ctx: number;
}

const cmAaAvgSpeedTiles: Generator<AvgTilesParams> = {
  id: 'cm-aa-avg-speed-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const u = rng.int(3, difficulty >= 2 ? 60 : 30);
      const v = rng.int(3, difficulty >= 2 ? 60 : 30);
      if (u === v || !Number.isInteger(harmonic(u, v))) continue;
      const d = lcm(u, v) * rng.int(1, 3);
      if (d > 300) continue;
      const t1 = d / u;
      const t2 = d / v;
      const h = harmonic(u, v);
      if (new Set([t1, t2, h]).size < 3) continue;
      return { u, v, d, ctx: rng.int(0, TRIPS.length - 1) };
    }
  },
  render({ u, v, d, ctx }) {
    const t = TRIPS[ctx];
    const t1 = d / u;
    const t2 = d / v;
    const h = harmonic(u, v);
    return {
      kind: 'tiles',
      prompt: [
        say(`A ${t.who} ${t.verb} ${d} km to a ${t.place} at ${u} km/h and back at ${v} km/h.`),
        say('Fill in the hours out, the hours back, and the average speed in km/h.'),
      ],
      template: '\\text{out} = {0}, \\quad \\text{back} = {1}, \\quad \\text{average} = {2}',
      bank: numberBank([t1, t2, h], [(u + v) / 2, t1 + t2, u, v, h + 1].filter(Number.isInteger), 3, 1, 1),
      answer: [num(t1), num(t2), num(h)],
    };
  },
  solution({ u, v, d }) {
    const t1 = d / u;
    const t2 = d / v;
    return [
      { tex: `${d} \\div ${u} = ${t1} \\text{ h out}` },
      { tex: `${d} \\div ${v} = ${t2} \\text{ h back}` },
      { text: 'The average is the whole distance over the whole time:' },
      { tex: `${2 * d} \\div ${t1 + t2} = ${harmonic(u, v)}` },
    ];
  },
};

/* ---------- time it, don't follow it ---------- */

interface MeetParams {
  u: number;
  v: number;
  /** Difficulty 1: the dog's speed and the hours until the friends meet. */
  w: number;
  t: number;
  /** Difficulty 2: the head start in hours; 0 for the dog. */
  h: number;
}

const cmAaMeet: Generator<MeetParams> = {
  id: 'cm-aa-meet',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const u = rng.int(3, 20);
        const v = rng.int(u + 1, 60);
        const h = rng.int(1, 4);
        if ((u * h) % (v - u) !== 0) continue;
        const t = (u * h) / (v - u);
        if (t > 8) continue;
        return { u, v, w: 0, t, h };
      }
      const u = rng.int(2, 7);
      const v = rng.int(2, 8);
      if (u === v) continue;
      const t = rng.int(1, 5);
      const w = rng.int(9, 20);
      return { u, v, w, t, h: 0 };
    }
  },
  render({ u, v, w, t, h }) {
    if (h) {
      return typed(
        [say(`Ann sets off along a road at ${u} km/h. ${h === 1 ? 'An hour' : `${h} hours`} later Ben follows from the same place at ${v} km/h.`), say('How far from the start does Ben catch her?')],
        v * t,
        '\\text{km} =',
      );
    }
    return typed(
      [
        say(`Two friends ${(u + v) * t} km apart walk towards each other at ${u} km/h and ${v} km/h. Their dog runs from one to the other and back, over and over, at ${w} km/h, until they meet.`),
        say('How far does the dog run?'),
      ],
      w * t,
      '\\text{km} =',
    );
  },
  choices({ u, v, w, t, h }) {
    if (h) return numberOptions(v * t, [u * h, v * h, u * t, (u * v * h) / (u + v)], 1, 1);
    const d = (u + v) * t;
    return numberOptions(w * t, [d, 2 * w * t, w * t + d, (w - u) * t], 1, 1);
  },
  solution({ u, v, w, t, h }) {
    if (h) {
      return [
        { text: `When Ben sets off, Ann is ahead by` },
        { tex: `${u} \\times ${h} = ${u * h} \\text{ km}` },
        { text: 'and he closes that gap at the difference of their speeds:' },
        { tex: `${v} - ${u} = ${v - u} \\text{ km/h}` },
        { tex: `${u * h} \\div ${v - u} = ${t} \\text{ h}` },
        { text: 'In that time Ben covers' },
        { tex: `${v} \\times ${t} = ${v * t}` },
      ];
    }
    const d = (u + v) * t;
    return [
      { text: 'Following the dog’s zigzags is hopeless. Time it instead. The friends close the gap at' },
      { tex: `${u} + ${v} = ${u + v} \\text{ km/h}` },
      { tex: `${d} \\div ${u + v} = ${t} \\text{ h}` },
      { text: 'The dog runs the whole of that time:' },
      { tex: `${w} \\times ${t} = ${w * t}` },
    ];
  },
};

/* ---------- a tap and a leak ---------- */

interface FillParams {
  a: number;
  /** Difficulty 2: a second tap; 0 when there is one. */
  b: number;
  leak: number;
}

/** Minutes to fill: one over the rates added, the leak's taken away. */
function fillTime({ a, b, leak }: FillParams): number {
  if (!b) return (a * leak) / (leak - a);
  return (a * b * leak) / (leak * b + leak * a - a * b);
}

const cmAaFillDrain: Generator<FillParams> = {
  id: 'cm-aa-fill-drain',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const a = rng.int(2, 30);
        const b = rng.int(2, 30);
        const leak = rng.int(3, 60);
        if (a === b || leak <= Math.min(a, b)) continue;
        const rate = leak * b + leak * a - a * b;
        if (rate <= 0 || (a * b * leak) % rate !== 0) continue;
        const t = (a * b * leak) / rate;
        if (t < 2 || t > 90 || t === a || t === b) continue;
        return { a, b, leak };
      }
      const a = rng.int(2, 30);
      const leak = rng.int(a + 1, 90);
      if ((a * leak) % (leak - a) !== 0) continue;
      const t = (a * leak) / (leak - a);
      if (t > 180) continue;
      return { a, b: 0, leak };
    }
  },
  render(p) {
    const taps = p.b ? `Two taps fill a tank in ${p.a} and ${p.b} minutes on their own.` : `A tap fills a tank in ${p.a} minutes.`;
    return typed(
      [say(`${taps} A leak empties a full tank in ${p.leak} minutes.`), say(`With the tank empty and ${p.b ? 'all three' : 'both'} working, how long does it take to fill?`)],
      fillTime(p),
      '\\text{minutes} =',
    );
  },
  choices(p) {
    const t = fillTime(p);
    if (p.b) return numberOptions(t, [(p.a * p.b) / (p.a + p.b), p.a + p.b - p.leak, p.leak - p.a - p.b, (p.a + p.b) / 2], 1, 1);
    return numberOptions(t, [p.leak - p.a, (p.a + p.leak) / 2, (p.a * p.leak) / (p.a + p.leak), p.a + p.leak], 1, 1);
  },
  solution(p) {
    const t = fillTime(p);
    if (p.b) {
      const n = p.a * p.b * p.leak;
      return [
        { text: 'Work in tanks per minute. The taps add and the leak takes away:' },
        { tex: `\\frac{1}{${p.a}} + \\frac{1}{${p.b}} - \\frac{1}{${p.leak}} = ${fracTex(n / t, n)}` },
        { text: 'So the tank fills in' },
        { tex: `${t} \\text{ minutes}` },
      ];
    }
    return [
      { text: 'Work in tanks per minute. The tap adds and the leak takes away:' },
      { tex: `\\frac{1}{${p.a}} - \\frac{1}{${p.leak}} = ${fracTex(p.leak - p.a, p.a * p.leak)}` },
      { text: 'So the tank fills in' },
      { tex: `${t} \\text{ minutes}` },
      { text: `Taking the times away, ${p.leak} − ${p.a}, is the trap: rates add and subtract, times do not.` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Quadratics
 * ================================================================ */

/* ---------- least value by completing the square ---------- */

interface SquareParams {
  a: number;
  h: number;
  k: number;
}

const squareConst = ({ a, h, k }: SquareParams) => a * h * h + k;
const bracket = (h: number) => `(x${signed(-h)})`;

function squareSolution(s: SquareParams): SolutionStep[] {
  const { a, h, k } = s;
  const c = squareConst(s);
  const steps: SolutionStep[] = [];
  if (a === 1) {
    steps.push(
      { text: `Half of the $x$ coefficient is ${-h}, so use $${bracket(h)}^2$, which starts the same way:` },
      { tex: `${bracket(h)}^2 = ${quadTex(1, -2 * h, h * h)}` },
      { tex: `${quadTex(1, -2 * h, c)} = ${bracket(h)}^2${signed(k)}` },
    );
  } else {
    steps.push(
      { text: `Take the ${a} out of the $x$ terms first:` },
      { tex: `${quadTex(a, -2 * a * h, c)} = ${a}(${quadTex(1, -2 * h, 0)})${signed(c)}` },
      { tex: `= ${a}${bracket(h)}^2 - ${a * h * h}${signed(c)}` },
      { tex: `= ${a}${bracket(h)}^2${signed(k)}` },
    );
  }
  steps.push({ text: `A square is never negative, so the least value is ${k}, when $x = ${h}$.` });
  return steps;
}

const cmAaCompleteSquare: Generator<SquareParams> = {
  id: 'cm-aa-complete-square',
  sample(rng, difficulty) {
    for (;;) {
      const a = difficulty >= 2 ? rng.int(2, 5) : 1;
      const h = rng.int(1, difficulty >= 2 ? 6 : 9) * rng.sign();
      const k = rng.int(-25, 25);
      if (squareConst({ a, h, k }) === 0 || squareConst({ a, h, k }) === k) continue;
      return { a, h, k };
    }
  },
  render(s) {
    return typed([say(`As $x$ varies, what is the least value of`), show(quadTex(s.a, -2 * s.a * s.h, squareConst(s)))], s.k, '\\text{least value} =');
  },
  choices(s) {
    const c = squareConst(s);
    return numberOptions(s.k, [c, c - s.h * s.h, -s.k, s.k - s.a * s.h], 1, -Infinity);
  },
  solution: squareSolution,
};

const cmAaSquareTiles: Generator<SquareParams> = {
  id: 'cm-aa-square-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const a = difficulty >= 2 ? rng.int(2, 5) : 1;
      const h = rng.int(1, difficulty >= 2 ? 6 : 9);
      const k = rng.int(1, 25);
      if (h === k) continue;
      return { a, h, k };
    }
  },
  render(s) {
    const c = squareConst(s);
    return {
      kind: 'tiles',
      prompt: [say('Complete the square.')],
      template: `${quadTex(s.a, -2 * s.a * s.h, c)} = ${s.a === 1 ? '' : s.a}(x - {0})^2 + {1}`,
      bank: numberBank([s.h, s.k], [2 * s.h, c, s.h * s.h, s.a * s.h, c - s.h * s.h], 3, 1, 1),
      answer: [num(s.h), num(s.k)],
    };
  },
  solution: squareSolution,
};

/* ---------- a shared root ---------- */

interface SharedParams {
  r: number;
  s1: number;
  s2: number;
  askOther: boolean;
}

const cmAaSharedRoot: Generator<SharedParams> = {
  id: 'cm-aa-shared-root',
  sample(rng, difficulty) {
    for (;;) {
      const pick = () => rng.int(1, 9) * rng.sign();
      const r = pick();
      const s1 = pick();
      const s2 = pick();
      if (new Set([r, s1, s2]).size < 3 || r + s1 === 0 || r + s2 === 0) continue;
      return { r, s1, s2, askOther: difficulty >= 2 };
    }
  },
  render({ r, s1, s2, askOther }) {
    return typed(
      [
        say('These two equations have exactly one root in common.'),
        show(`${quadTex(1, -(r + s1), r * s1)} = 0`),
        show(`${quadTex(1, -(r + s2), r * s2)} = 0`),
        say(askOther ? 'Find the other root of the second equation.' : 'Find the common root.'),
      ],
      askOther ? s2 : r,
      'x =',
    );
  },
  choices({ r, s1, s2, askOther }) {
    return askOther ? numberOptions(s2, [r, s1, -s2, r * s2], 1, -Infinity) : numberOptions(r, [s1, s2, -r], 1, -Infinity);
  },
  solution({ r, s1, s2, askOther }) {
    const steps: SolutionStep[] = [
      { text: 'Take the second equation from the first. The $x^2$ terms cancel, and the common root still fits what is left:' },
      { tex: `${coef(s2 - s1)}${signed(r * s1 - r * s2)} = 0` },
      { tex: `x = ${r}` },
    ];
    if (askOther) {
      steps.push(
        { text: `The two roots of the second equation multiply to its constant term, ${r * s2}:` },
        { tex: `${r} \\times s = ${r * s2}` },
        { tex: `s = ${s2}` },
      );
    }
    return steps;
  },
};

/* ---------- a root that goes on forever ---------- */

interface NestedParams {
  n: number;
  minus: boolean;
}

const nestedTex = (a: number, op: string) => `\\sqrt{${a} ${op} \\sqrt{${a} ${op} \\sqrt{${a} ${op} \\cdots}}}`;

const cmAaNestedRoot: Generator<NestedParams> = {
  id: 'cm-aa-nested-root',
  sample: (rng, difficulty) => ({ n: rng.int(2, 40), minus: difficulty >= 2 }),
  render({ n, minus }) {
    const a = n * (n + 1);
    return typed([say('The pattern goes on forever. Find'), show(`x = ${nestedTex(a, minus ? '-' : '+')}`)], minus ? n : n + 1, 'x =');
  },
  choices({ n, minus }) {
    return minus ? numberOptions(n, [n + 1, n - 1, 2 * n + 1], 1, 1) : numberOptions(n + 1, [n, n + 2, 2 * n + 1], 1, 1);
  },
  solution({ n, minus }) {
    const a = n * (n + 1);
    const op = minus ? '-' : '+';
    return [
      { text: `Everything under the first root after the ${a} is $x$ again:` },
      { tex: `x = \\sqrt{${a} ${op} x}` },
      { tex: `x^2 = ${a} ${op} x` },
      { tex: minus ? `x^2 + x - ${a} = 0` : `x^2 - x - ${a} = 0` },
      { tex: minus ? `(x - ${n})(x + ${n + 1}) = 0` : `(x - ${n + 1})(x + ${n}) = 0` },
      { text: `A square root is never negative, so $x = ${minus ? n : n + 1}$.` },
    ];
  },
};

/* ================================================================
 * Lesson 4: Exponents
 * ================================================================ */

/* ---------- powers of one base ---------- */

interface PowerEqParams {
  b: number;
  m: number;
  n: number;
  p: number;
  q: number;
}

const powerX = ({ m, n, p, q }: PowerEqParams) => (n * q - m * p) / (m - n);

/** `4`, `\\left(\\tfrac{1}{4}\\right)` for a negative power. */
const baseTex = (b: number, m: number) => (m > 0 ? `${b ** m}` : `\\left(\\tfrac{1}{${b ** -m}}\\right)`);

function samplePowerEq(rng: Rng, difficulty: number, distinct: boolean): PowerEqParams {
  for (;;) {
    const b = difficulty >= 2 ? rng.pick([2, 2, 3, 3, 5]) : 2;
    const top = b === 2 ? 5 : b === 3 ? 4 : 3;
    const m = difficulty >= 2 && rng.chance(0.4) ? -rng.int(1, top - 1) : rng.int(difficulty >= 2 ? 1 : 2, top);
    const n = rng.int(difficulty >= 2 ? 1 : 2, top);
    if (m === n || (m === 1 && n === 1)) continue;
    const p = rng.int(-6, 6);
    const q = rng.int(-6, 6);
    if (p === q) continue;
    const s = { b, m, n, p, q };
    const x = powerX(s);
    if (!Number.isInteger(x) || x === 0 || Math.abs(x) > 20) continue;
    if (distinct && new Set([m, n, x]).size < 3) continue;
    return s;
  }
}

/** `3(x + 1)`, or the bracket's inside alone for a coefficient of 1. */
const times = (k: number, inside: string) => (k === 1 ? inside : `${k}(${inside})`);

const powerEqTex = (s: PowerEqParams) => `${baseTex(s.b, s.m)}^{${shift(s.p)}} = ${s.b ** s.n}^{${shift(s.q)}}`;

function powerEqSolution(s: PowerEqParams): SolutionStep[] {
  const x = powerX(s);
  const steps: SolutionStep[] = [{ text: `Write both sides as powers of ${s.b}${s.m < 0 ? `, with $\\tfrac{1}{${s.b ** -s.m}} = ${s.b}^{${s.m}}$` : ''}:` }];
  steps.push(
    { tex: `${s.b}^{${times(s.m, shift(s.p))}} = ${s.b}^{${times(s.n, shift(s.q))}}` },
    { text: 'Equal powers of one base have equal exponents:' },
    { tex: `${coef(s.m)}${signed(s.m * s.p)} = ${coef(s.n)}${signed(s.n * s.q)}` },
    ...(s.m - s.n === 1 ? [] : [{ tex: `${coef(s.m - s.n)} = ${s.n * s.q - s.m * s.p}` }]),
    { tex: `x = ${x}` },
  );
  return steps;
}

const cmAaPowerEquation: Generator<PowerEqParams> = {
  id: 'cm-aa-power-equation',
  sample: (rng, difficulty) => samplePowerEq(rng, difficulty, false),
  render: (s) => typed([say('Solve for $x$.'), show(powerEqTex(s))], powerX(s), 'x ='),
  choices(s) {
    const x = powerX(s);
    return numberOptions(x, [(s.m * s.q - s.n * s.p) / (s.n - s.m), -x, s.q - s.p, x + 1], 1, -Infinity);
  },
  solution: powerEqSolution,
};

const cmAaPowerEquationTiles: Generator<PowerEqParams> = {
  id: 'cm-aa-power-equation-tiles',
  sample: (rng, difficulty) => samplePowerEq(rng, difficulty, true),
  render(s) {
    const x = powerX(s);
    return {
      kind: 'tiles',
      prompt: [say(`Write both sides as powers of ${s.b}, then set the exponents equal.`), show(powerEqTex(s))],
      template: `{0}(${shift(s.p)}) = {1}(${shift(s.q)}), \\quad x = {2}`,
      bank: numberBank([s.m, s.n, x], [s.b ** Math.abs(s.m), s.b ** s.n, -x, s.q - s.p], 3, 1, -Infinity),
      answer: [num(s.m), num(s.n), num(x)],
    };
  },
  solution: powerEqSolution,
};

/* ---------- many copies of one power ---------- */

interface CopiesParams {
  b: number;
  j: number;
  /** Difficulty 2: each copy is a power of b squared. */
  squared: boolean;
  total: number;
}

const copiesX = ({ j, squared, total }: CopiesParams) => (squared ? (total - j) / 2 : total - j);

const cmAaPowerSum: Generator<CopiesParams> = {
  id: 'cm-aa-power-sum',
  sample(rng, difficulty) {
    for (;;) {
      const [b, j] = rng.pick([
        [2, 1],
        [2, 2],
        [2, 3],
        [3, 1],
        [3, 2],
        [5, 1],
      ]);
      const squared = difficulty >= 2;
      const total = rng.int(8, 50);
      const s = { b, j, squared, total };
      if (!Number.isInteger(copiesX(s)) || copiesX(s) < 2) continue;
      return s;
    }
  },
  render(s) {
    const k = s.b ** s.j;
    const base = s.squared ? s.b * s.b : s.b;
    const rhs = `${s.b}^{${s.total}}`;
    const prompt =
      k <= 4
        ? [say('Solve for $x$.'), show(`${Array(k).fill(`${base}^x`).join(' + ')} = ${rhs}`)]
        : [say(`${k} copies of $${base}^x$ are added, and the total is $${rhs}$.`), say('Find $x$.')];
    return typed(prompt, copiesX(s), 'x =');
  },
  choices(s) {
    const k = s.b ** s.j;
    const x = copiesX(s);
    return s.squared
      ? numberOptions(x, [s.total - s.j, s.total / 2, (s.total - k) / 2, x + 1], 1, 1)
      : numberOptions(x, [s.total / k, s.total - 1, s.total - k, s.total], 1, 1);
  },
  solution(s) {
    const k = s.b ** s.j;
    const x = copiesX(s);
    if (!s.squared) {
      return [
        { text: `${k} copies of $${s.b}^x$ make $${k} \\times ${s.b}^x$, and ${k} is a power of ${s.b}:` },
        { tex: s.j === 1 ? `${k} \\times ${s.b}^x = ${s.b}^{x + 1}` : `${k} \\times ${s.b}^x = ${pw(s.b, s.j)} \\times ${s.b}^x = ${s.b}^{x + ${s.j}}` },
        { tex: `x + ${s.j} = ${s.total}` },
        { tex: `x = ${x}` },
      ];
    }
    return [
      { text: `Write everything as a power of ${s.b}. Each copy is $${s.b * s.b}^x = ${s.b}^{2x}$, and ${k} of them make` },
      { tex: `${pw(s.b, s.j)} \\times ${s.b}^{2x} = ${s.b}^{2x + ${s.j}}` },
      { tex: `2x + ${s.j} = ${s.total}` },
      { tex: `x = ${x}` },
    ];
  },
};

/* ---------- take out the smallest power ---------- */

interface FactorPowerParams {
  b: number;
  big: number;
  p: number;
  /** Difficulty 1: the denominator is b^(big - q). */
  q: number;
  plus: boolean;
  /** Difficulty 2: the denominator is b^(big + 1) ± b^big. */
  pair: boolean;
}

function factorValue({ b, p, q, plus, pair }: FactorPowerParams): number {
  const top = b ** p + (plus ? 1 : -1);
  return pair ? top / (b + (plus ? 1 : -1)) : b ** q * top;
}

const cmAaFactorPower: Generator<FactorPowerParams> = {
  id: 'cm-aa-factor-power',
  sample(rng, difficulty) {
    for (;;) {
      const pair = difficulty >= 2;
      const b = pair ? rng.int(2, 6) : rng.pick([2, 3, 5]);
      const p = rng.int(pair ? 2 : 1, pair ? 5 : 3);
      const q = pair ? 0 : rng.int(0, 2);
      const plus = rng.chance(0.5);
      const s = { b, big: rng.int(10, 60), p, q, plus, pair };
      const v = factorValue(s);
      if (!Number.isInteger(v) || v > 800 || v < 2) continue;
      if (pair && b === 2 && !plus) continue;
      return s;
    }
  },
  render(s) {
    const op = s.plus ? '+' : '-';
    const top = `${s.b}^{${s.big + s.p}} ${op} ${s.b}^{${s.big}}`;
    const bottom = s.pair ? `${s.b}^{${s.big + 1}} ${op} ${s.b}^{${s.big}}` : `${s.b}^{${s.big - s.q}}`;
    return typed([say('Work out'), show(`\\frac{${top}}{${bottom}}`)], factorValue(s), '\\text{value} =');
  },
  choices(s) {
    const v = factorValue(s);
    const sign = s.plus ? 1 : -1;
    if (s.pair) return numberOptions(v, [s.b ** (s.p - 1), s.b ** (s.p - 1) + sign, s.b ** s.p + sign, v + 1], 1, 1);
    return numberOptions(v, [s.b ** (s.p + s.q), s.b ** s.p + sign, s.b ** (s.p + s.q) + sign, v + s.b], 1, 1);
  },
  solution(s) {
    const op = s.plus ? '+' : '-';
    const sign = s.plus ? 1 : -1;
    const v = factorValue(s);
    const steps: SolutionStep[] = [
      { text: `Take out the smallest power, $${s.b}^{${s.big}}$, from the top:` },
      { tex: `${s.b}^{${s.big + s.p}} ${op} ${s.b}^{${s.big}} = ${s.b}^{${s.big}}(${pw(s.b, s.p)} ${op} 1)` },
    ];
    if (s.pair) {
      steps.push(
        { text: 'and from the bottom:' },
        { tex: `${s.b}^{${s.big + 1}} ${op} ${s.b}^{${s.big}} = ${s.b}^{${s.big}}(${s.b} ${op} 1)` },
        { text: `The $${s.b}^{${s.big}}$ cancels:` },
        { tex: `\\frac{${s.b ** s.p + sign}}{${s.b + sign}} = ${v}` },
      );
    } else if (s.q === 0) {
      steps.push({ text: 'That cancels with the bottom:' }, { tex: `${pw(s.b, s.p)} ${op} 1 = ${v}` });
    } else {
      steps.push(
        { text: `Dividing $${s.b}^{${s.big}}$ by $${s.b}^{${s.big - s.q}}$ leaves $${pw(s.b, s.q)}$:` },
        { tex: `${pw(s.b, s.q)} \\times ${s.b ** s.p + sign} = ${v}` },
      );
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 5: Special Functions
 * ================================================================ */

/* ---------- a sum of floors of square roots ---------- */

interface FloorParams {
  top: number;
}

/** [value, first n, count] for each value of floor(sqrt(n)), n = 1..top. */
function floorGroups(top: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let k = 1; k * k <= top; k += 1) {
    const last = Math.min(top, (k + 1) * (k + 1) - 1);
    out.push([k, k * k, last - k * k + 1]);
  }
  return out;
}

const floorSum = (top: number) => floorGroups(top).reduce((acc, [k, , c]) => acc + k * c, 0);

const floorSumTex = (top: number) =>
  `\\lfloor \\sqrt{1} \\rfloor + \\lfloor \\sqrt{2} \\rfloor + \\cdots + \\lfloor \\sqrt{${top}} \\rfloor`;

function floorSolution(top: number): SolutionStep[] {
  const groups = floorGroups(top);
  const terms = groups.map(([k, , c]) => `${k} \\times ${c}`);
  const lines: string[] = [];
  for (let i = 0; i < terms.length; i += 3) lines.push(terms.slice(i, i + 3).join(' + '));
  const steps: SolutionStep[] = [
    { text: 'Group the terms by value. $\\lfloor \\sqrt{n} \\rfloor = k$ from $n = k^2$ up to $(k + 1)^2 - 1$, which is $2k + 1$ values of $n$; the last group stops early, at the top of the sum.' },
  ];
  lines.forEach((line, i) => steps.push({ tex: `${line}${i === lines.length - 1 ? '' : ' +'}` }));
  steps.push({ tex: `= ${floorSum(top)}` });
  return steps;
}

const cmAaFloorSum: Generator<FloorParams> = {
  id: 'cm-aa-floor-sum',
  sample(rng, difficulty) {
    for (;;) {
      const top = difficulty >= 2 ? rng.int(40, 99) : rng.int(10, 48);
      const r = Math.sqrt(top + 1);
      if (Number.isInteger(r) && difficulty < 2) continue;
      return { top };
    }
  },
  render({ top }) {
    return typed(
      [say('$\\lfloor y \\rfloor$ is the whole-number part of $y$, so $\\lfloor \\sqrt{5} \\rfloor = 2$. Add up'), show(floorSumTex(top))],
      floorSum(top),
      '\\text{sum} =',
    );
  },
  choices({ top }) {
    const groups = floorGroups(top);
    const s = floorSum(top);
    const twoK = groups.reduce((acc, [k, , c], i) => acc + k * (i === groups.length - 1 ? c : 2 * k), 0);
    const fullLast = groups.reduce((acc, [k]) => acc + k * (2 * k + 1), 0);
    return numberOptions(s, [twoK, fullLast, s + groups.length, s - groups.length], 1, 1);
  },
  solution: ({ top }) => floorSolution(top),
};

const cmAaFloorTable: Generator<FloorParams> = {
  id: 'cm-aa-floor-table',
  sample(rng, difficulty) {
    for (;;) {
      const top = difficulty >= 2 ? rng.int(20, 63) : rng.int(5, 48);
      const counts = floorGroups(top).map(([, , c]) => c);
      const answer = [...counts, floorSum(top)];
      if (new Set(answer).size < answer.length) continue;
      return { top };
    }
  },
  render({ top }) {
    const groups = floorGroups(top);
    const counts = groups.map(([, , c]) => c);
    const s = floorSum(top);
    const range = (first: number, c: number) => (c === 1 ? `${first}` : `${first} \\text{ to } ${first + c - 1}`);
    return {
      kind: 'table',
      prompt: [
        say(`Group $n = 1, 2, \\ldots, ${top}$ by the value of $\\lfloor \\sqrt{n} \\rfloor$, the whole-number part of $\\sqrt{n}$. Fill in how many $n$ are in each group, then the sum of $\\lfloor \\sqrt{n} \\rfloor$ over all of them.`),
      ],
      columns: ['\\lfloor \\sqrt{n} \\rfloor', 'n', '\\text{count}'],
      rows: [...groups.map(([k, first, c]) => [`${k}`, range(first, c), null]), ['\\text{sum}', '', null]],
      bank: numberBank([...counts, s], [s + groups.length, 2 * groups.length, counts[counts.length - 1] + 2, s - groups.length], 3, 1, 1),
      answer: [...counts, s].map(num),
    };
  },
  solution: ({ top }) => floorSolution(top),
};

/* ---------- two distances on the number line ---------- */

interface AbsParams {
  a: number;
  gap: number;
  c: number;
  /** Difficulty 2: c equals the gap, and the question counts whole solutions. */
  count: boolean;
}

const absTex = ({ a, gap }: AbsParams, c: number) => `|x${signed(-a)}| + |x${signed(-(a + gap))}| = ${c}`;

const cmAaAbsSum: Generator<AbsParams> = {
  id: 'cm-aa-abs-sum',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(-10, 10);
      const gap = rng.int(2, 14);
      if (difficulty >= 2) return { a, gap, c: gap, count: true };
      const c = rng.int(gap + 1, gap + 16);
      if ((2 * a + gap + c) % 2 !== 0 || a === 0 || a + gap === 0) continue;
      return { a, gap, c, count: false };
    }
  },
  render(s) {
    if (s.count) {
      return typed([say('How many whole numbers $x$ satisfy'), show(absTex(s, s.c))], s.gap + 1, '\\text{how many} =');
    }
    return typed([say('Find the larger solution of'), show(absTex(s, s.c))], (2 * s.a + s.gap + s.c) / 2, 'x =');
  },
  choices(s) {
    if (s.count) return numberOptions(s.gap + 1, [s.gap, 2, s.gap - 1, 2 * s.gap], 1, 1);
    const b = s.a + s.gap;
    const big = (s.a + b + s.c) / 2;
    return numberOptions(big, [s.a + s.c, b + s.c, (s.a + b - s.c) / 2, s.c], 1, -Infinity);
  },
  solution(s) {
    const b = s.a + s.gap;
    const steps: SolutionStep[] = [
      { text: `$|x${signed(-s.a)}|$ is the distance from $x$ to ${s.a} on the number line, and $|x${signed(-b)}|$ the distance to ${b}. Anywhere between them the two distances add to the gap:` },
      { tex: `${b} - ${s.a < 0 ? `(${s.a})` : s.a} = ${s.gap}` },
    ];
    if (s.count) {
      steps.push(
        { text: `So every $x$ from ${s.a} to ${b} works, and nothing outside does, since there the total is more than ${s.gap}. Count the whole numbers, ends included:` },
        { tex: `${s.gap} + 1 = ${s.gap + 1}` },
      );
      return steps;
    }
    const big = (s.a + b + s.c) / 2;
    steps.push(
      { text: `${s.c} is more than that, so the solutions are outside. To the right of ${b} both bars open as they stand:` },
      { tex: `(x${signed(-s.a)}) + (x${signed(-b)}) = ${s.c}` },
      { tex: `2x${signed(-(s.a + b))} = ${s.c}` },
      { tex: `x = ${big}` },
    );
    return steps;
  },
};

/* ---------- substitute twice ---------- */

interface FunctionalParams {
  k: number;
  c: number;
  p: number;
  q: number;
  t: number;
}

const fnValues = ({ k, c, p, q, t }: FunctionalParams) => {
  const A = p * t + q;
  const B = p * (c - t) + q;
  return { A, B, f: (k * B - A) / (k * k - 1) };
};

const cmAaFunctional: Generator<FunctionalParams> = {
  id: 'cm-aa-functional',
  sample(rng, difficulty) {
    for (;;) {
      const k = difficulty >= 2 ? 3 : 2;
      const c = rng.int(1, 10);
      const p = rng.int(1, 6) * rng.sign();
      const q = rng.int(-10, 10);
      const t = rng.int(0, 10);
      if (2 * t === c || t === c) continue;
      const s = { k, c, p, q, t };
      const { f } = fnValues(s);
      if (!Number.isInteger(f) || Math.abs(f) > 60) continue;
      return s;
    }
  },
  render(s) {
    return typed(
      [say('For every number $x$,'), show(`f(x) + ${s.k}f(${s.c} - x) = ${coef(s.p)}${signed(s.q)}`), say(`Find $f(${s.t})$.`)],
      fnValues(s).f,
      `f(${s.t}) =`,
    );
  },
  choices(s) {
    const { A, B, f } = fnValues(s);
    return numberOptions(f, [A, A / (s.k + 1), B, -f], 1, -Infinity);
  },
  solution(s) {
    const { A, B, f } = fnValues(s);
    const u = s.c - s.t;
    return [
      { text: `Put $x = ${s.t}$, then $x = ${u}$. Each gives an equation in the same two unknowns:` },
      { tex: `f(${s.t}) + ${s.k}f(${u}) = ${A}` },
      { tex: `f(${u}) + ${s.k}f(${s.t}) = ${B}` },
      { text: `Multiply the second by ${s.k} and take away the first; $f(${u})$ cancels:` },
      { tex: `${s.k * s.k - 1}f(${s.t}) = ${s.k * B - A}` },
      { tex: `f(${s.t}) = ${f}` },
    ];
  },
};

/* ---------- pair the terms from the two ends ---------- */

interface PairParams {
  a: number;
  n: number;
}

const cmAaPairSum: Generator<PairParams> = {
  id: 'cm-aa-pair-sum',
  sample: (rng, difficulty) => ({ a: difficulty >= 2 ? rng.pick([9, 16, 25, 36]) : 4, n: rng.int(5, difficulty >= 2 ? 80 : 40) }),
  render({ a, n }) {
    const r = Math.sqrt(a);
    return typed(
      [
        say('Let'),
        show(`f(x) = \\frac{${a}^x}{${a}^x + ${r}}`),
        say('Work out'),
        show(`f\\left(\\tfrac{1}{${n}}\\right) + f\\left(\\tfrac{2}{${n}}\\right) + \\cdots + f\\left(\\tfrac{${n - 1}}{${n}}\\right)`),
      ],
      (n - 1) / 2,
      '\\text{sum} =',
    );
  },
  choices({ n }) {
    return numberOptions((n - 1) / 2, [n / 2, n - 1, (n - 2) / 2, n], n % 2 === 1 ? 1 : 0.5, 0);
  },
  solution({ a, n }) {
    const r = Math.sqrt(a);
    return [
      { text: `Pair $f(x)$ with $f(1 - x)$, a term from each end. Since $${a}^{1 - x} = ${a} \\div ${a}^x$,` },
      { tex: `f(1 - x) = \\frac{${a}}{${a} + ${r} \\times ${a}^x} = \\frac{${r}}{${r} + ${a}^x}` },
      { tex: `f(x) + f(1 - x) = \\frac{${a}^x + ${r}}{${a}^x + ${r}} = 1` },
      { text: `So the ${n - 1} terms are halves of pairs worth 1${n % 2 === 0 ? ', the middle one being $f(\\tfrac{1}{2}) = \\tfrac{1}{2}$' : ''}:` },
      { tex: `${n - 1} \\times \\tfrac{1}{2} = ${num((n - 1) / 2)}` },
    ];
  },
};

/* ================================================================
 * Lesson 6: Logarithms
 * ================================================================ */

/* ---------- a chain of logs ---------- */

interface ChainParams {
  a: number;
  j: number;
  flip: boolean;
}

const cmAaLogChain: Generator<ChainParams> = {
  id: 'cm-aa-log-chain',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(2, 31);
      const j = rng.int(2, 9);
      const m = a ** j;
      if (m > 1000 || m - a < 4) continue;
      return { a, j, flip: difficulty >= 2 };
    }
  },
  render({ a, j, flip }) {
    const m = a ** j;
    const term = (base: number, arg: number) => `\\log_{${base}} ${arg}`;
    const tex = flip
      ? `${term(a + 1, a)} \\times ${term(a + 2, a + 1)} \\times \\cdots \\times ${term(m, m - 1)}`
      : `${term(a, a + 1)} \\times ${term(a + 1, a + 2)} \\times \\cdots \\times ${term(m - 1, m)}`;
    return typed([say('Work out the product'), show(tex)], flip ? `1/${j}` : j, '\\text{product} =', flip ? FRACTION_KEYS : []);
  },
  choices({ a, j, flip }) {
    const m = a ** j;
    if (flip) {
      const frac = (d: number) => ({ tex: `\\frac{1}{${d}}`, answer: `1/${d}` });
      return options(frac(j), { tex: `${j}`, answer: `${j}` }, frac(m - a), frac(j + 1), frac(j - 1 > 1 ? j - 1 : j + 2)).slice(0, 4);
    }
    return numberOptions(j, [m - a, j + 1, j - 1, a * j], 1, 1);
  },
  solution({ a, j, flip }) {
    const m = a ** j;
    const L = (x: number) => `\\log ${x}`;
    if (flip) {
      return [
        { text: 'Write each log as a fraction of logs in one base: $\\log_b c = \\log c \\div \\log b$. Each top cancels the bottom after it:' },
        { tex: `\\frac{${L(a)}}{${L(a + 1)}} \\times \\frac{${L(a + 1)}}{${L(a + 2)}} \\times \\cdots \\times \\frac{${L(m - 1)}}{${L(m)}}` },
        { tex: `= \\frac{${L(a)}}{${L(m)}} = \\log_{${m}} ${a}` },
        { text: `Since $${m} = ${a}^{${j}}$, that is $\\tfrac{1}{${j}}$.` },
      ];
    }
    return [
      { text: 'Write each log as a fraction of logs in one base: $\\log_b c = \\log c \\div \\log b$. Each top cancels the bottom after it:' },
      { tex: `\\frac{${L(a + 1)}}{${L(a)}} \\times \\frac{${L(a + 2)}}{${L(a + 1)}} \\times \\cdots \\times \\frac{${L(m)}}{${L(m - 1)}}` },
      { tex: `= \\frac{${L(m)}}{${L(a)}} = \\log_{${a}} ${m}` },
      { text: `Since $${m} = ${a}^{${j}}$, that is ${j}. Counting the ${m - a} factors is the trap.` },
    ];
  },
};

/* ---------- combine two logs, as tiles ---------- */

interface CombineLogParams {
  b: number;
  n: number;
  x: number;
  y: number;
  minus: boolean;
}

const isPowerOf = (v: number, b: number) => {
  let x = v;
  while (x > 1 && x % b === 0) x /= b;
  return x === 1;
};

const cmAaLogTiles: Generator<CombineLogParams> = {
  id: 'cm-aa-log-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const b = rng.int(2, 9);
      const n = rng.int(2, 4);
      const whole = b ** n;
      if (difficulty >= 2) {
        const y = rng.int(2, 12);
        const x = y * whole;
        if (x > 2000 || isPowerOf(y, b) || y === n || x === n) continue;
        return { b, n, x, y, minus: true };
      }
      if (whole > 4096) continue;
      const x = rng.int(2, whole - 1);
      if (whole % x !== 0) continue;
      const y = whole / x;
      if (x === y || isPowerOf(x, b) || isPowerOf(y, b)) continue;
      return { b, n, x, y, minus: false };
    }
  },
  render({ b, n, x, y, minus }) {
    const inside = minus ? x / y : x * y;
    return {
      kind: 'tiles',
      prompt: [say('Combine the two logs into one, then work it out.')],
      template: `\\log_${b} ${x} ${minus ? '-' : '+'} \\log_${b} ${y} = \\log_${b} {0} = {1}`,
      bank: numberBank([inside, n], [minus ? x - y : x + y, n + 1, n - 1, b * n], 3, 1, 1),
      answer: [num(inside), num(n)],
    };
  },
  solution({ b, n, x, y, minus }) {
    const inside = minus ? x / y : x * y;
    return [
      { text: minus ? 'Logs of the same base subtract by dividing inside:' : 'Logs of the same base add by multiplying inside:' },
      { tex: `\\log_{${b}} ${x} ${minus ? '-' : '+'} \\log_{${b}} ${y} = \\log_{${b}} ${inside}` },
      { text: `and ${inside} is a power of ${b}:` },
      { tex: `${inside} = ${b}^{${n}}` },
      { tex: `\\log_{${b}} ${inside} = ${n}` },
    ];
  },
};

/* ---------- logs of one number to related bases ---------- */

interface LogEqParams {
  c: number;
  /** The powers of c used as bases. */
  es: number[];
  t: number;
}

/** [log_c x, the right-hand side]. */
function logEqValues({ es, t }: LogEqParams): [number, number] {
  const d = es.reduce((acc, e) => lcm(acc, e), 1);
  const L = d * t;
  const k = es.reduce((acc, e) => acc + L / e, 0);
  return [L, k];
}

const cmAaLogEquation: Generator<LogEqParams> = {
  id: 'cm-aa-log-equation',
  sample(rng, difficulty) {
    for (;;) {
      const es = difficulty >= 2 ? rng.pick([[1, 3], [1, 2, 4], [2, 3], [1, 4]]) : [1, 2];
      const c = rng.int(2, 12);
      if (c ** Math.max(...es) > 10000) continue;
      const t = rng.int(1, 6);
      const s = { c, es, t };
      const [L] = logEqValues(s);
      if (c ** L > 1_000_000) continue;
      return s;
    }
  },
  render(s) {
    const [, k] = logEqValues(s);
    const lhs = s.es.map((e) => `\\log_{${s.c ** e}} x`).join(' + ');
    return typed([say('Solve for $x$.'), show(`${lhs} = ${k}`)], s.c ** logEqValues(s)[0], 'x =');
  },
  choices(s) {
    const [L, k] = logEqValues(s);
    const x = s.c ** L;
    return numberOptions(x, [s.c ** k, L, s.c ** (L + 1), s.c ** (L - 1) > 1 ? s.c ** (L - 1) : s.c ** (L + 2)], 1, 1);
  },
  solution(s) {
    const [L, k] = logEqValues(s);
    const d = s.es.reduce((acc, e) => lcm(acc, e), 1);
    const total = s.es.reduce((acc, e) => acc + d / e, 0);
    const steps: SolutionStep[] = [{ text: `Change every log to base ${s.c}: a log to base $${s.c}^{e}$ is $\\tfrac{1}{e}$ of a log to base ${s.c}.` }];
    for (const e of s.es) if (e > 1) steps.push({ tex: `\\log_{${s.c ** e}} x = \\tfrac{1}{${e}}\\log_{${s.c}} x` });
    steps.push(
      { tex: `${fracTex(total, d)}\\log_{${s.c}} x = ${k}` },
      { tex: `\\log_{${s.c}} x = ${L}` },
      { tex: `x = ${pw(s.c, L)} = ${s.c ** L}` },
    );
    return steps;
  },
};

/* ---------- a power of a log ---------- */

interface LogPowerParams {
  b: number;
  m: number;
  /** The log's base is b^q. */
  q: number;
  d: number;
}

/** The number inside the log, d^q, and the value, d^m. */
const logPowerValues = ({ q, d, m }: LogPowerParams) => [d ** q, d ** m];

const cmAaLogPower: Generator<LogPowerParams> = {
  id: 'cm-aa-log-power',
  sample(rng, difficulty) {
    for (;;) {
      const b = rng.int(2, 7);
      const q = difficulty >= 2 ? rng.int(2, 3) : 1;
      const m = rng.int(difficulty >= 2 ? 1 : 2, difficulty >= 2 ? 4 : 3);
      const d = rng.int(2, difficulty >= 2 ? 9 : 12);
      if (m === q || d === b || isPowerOf(d, b) || isPowerOf(b, d) || b ** m > 400 || b ** q > 100) continue;
      const [inside, value] = logPowerValues({ b, m, q, d });
      if (inside > 1000 || value > 2000) continue;
      return { b, m, q, d };
    }
  },
  render(s) {
    const [inside, value] = logPowerValues(s);
    return typed([say('Work out'), show(`${s.b ** s.m}^{\\log_{${s.b ** s.q}} ${inside}}`)], value, '\\text{value} =');
  },
  choices(s) {
    const [inside, value] = logPowerValues(s);
    return numberOptions(value, [inside, s.m * inside, inside * s.b ** s.m, s.d * s.m, value * s.d], 1, 1);
  },
  solution(s) {
    const [inside, value] = logPowerValues(s);
    const a = s.b ** s.m;
    if (s.q === 1) {
      return [
        { text: `Write ${a} as a power of ${s.b}, and swap the order of the two powers:` },
        { tex: `${a}^{\\log_{${s.b}} ${inside}} = \\left(${s.b}^{\\log_{${s.b}} ${inside}}\\right)^{${s.m}}` },
        { text: `$${s.b}^{\\log_{${s.b}} ${inside}}$ is ${inside}, by what a log means:` },
        { tex: `${inside}^{${s.m}} = ${value}` },
      ];
    }
    return [
      ...(s.m === 1
        ? [{ text: `Write ${s.b ** s.q} as a power of ${s.b}:` }, { tex: `${s.b ** s.q} = ${s.b}^{${s.q}}` }]
        : [{ text: `Write both ${a} and ${s.b ** s.q} as powers of ${s.b}:` }, { tex: `${a} = ${pw(s.b, s.m)}, \\qquad ${s.b ** s.q} = ${s.b}^{${s.q}}` }]),
      { text: `A log to base $${s.b}^{${s.q}}$ is $\\tfrac{1}{${s.q}}$ of a log to base ${s.b}, so` },
      { tex: `${a}^{\\log_{${s.b ** s.q}} ${inside}} = ${s.b}^{${fracTex(s.m, s.q)}\\log_{${s.b}} ${inside}} = ${inside}^{${fracTex(s.m, s.q)}}` },
      { tex: `${inside} = ${s.d}^{${s.q}}, \\qquad ${inside}^{${fracTex(s.m, s.q)}} = ${s.m === 1 ? value : `${pw(s.d, s.m)} = ${value}`}` },
    ];
  },
};

export const contestAdvancedAlgebraGenerators = [
  cmAaSumDiff,
  cmAaCyclic,
  cmAaSwap,
  cmAaSwapTiles,
  cmAaAvgSpeed,
  cmAaAvgSpeedTiles,
  cmAaMeet,
  cmAaFillDrain,
  cmAaCompleteSquare,
  cmAaSquareTiles,
  cmAaSharedRoot,
  cmAaNestedRoot,
  cmAaPowerEquation,
  cmAaPowerEquationTiles,
  cmAaPowerSum,
  cmAaFactorPower,
  cmAaFloorSum,
  cmAaFloorTable,
  cmAaAbsSum,
  cmAaFunctional,
  cmAaPairSum,
  cmAaLogChain,
  cmAaLogTiles,
  cmAaLogEquation,
  cmAaLogPower,
];

