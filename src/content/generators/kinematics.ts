/**
 * Kinematics (roadmap C20), the first course in the Mechanics tab.
 *
 * Level 1 is motion graphs: displacement against distance and velocity
 * against speed along a line, average speed and velocity over a journey, the
 * gradient of a displacement-time graph as velocity, the gradient of a
 * velocity-time graph as acceleration, and the area under one as the distance
 * travelled. Level 2 is constant acceleration: the suvat equations, choosing
 * one from what is given, vertical motion under gravity with g = 9.8, and
 * journeys in two stages or with one particle catching another. Level 3 is
 * calculus in t: v = ds/dt and a = dv/dt for polynomial and exponential s,
 * speeding up from the signs of v and a, integrating back with a known value
 * fixing the constant, and the definite integral of v over an interval on
 * which v keeps one sign, as a displacement and as a distance. Level 4 is
 * variable acceleration with polynomial s, v and a in t: at rest and turning
 * round, the greatest velocity and speed, distance against displacement when
 * v changes sign, curved motion graphs, and integrating from a starting value.
 *
 * These rules hold everywhere in this file.
 *
 * - Every answer is exact: whole, or one decimal place. u, a and t are drawn
 *   whole and paired so s is whole; under gravity u is a multiple of 4.9 and t
 *   is whole, so every height and speed lands on one decimal. A draw that
 *   would not is refused at sampling, never rounded.
 * - Units live in the prompt prose only. mathjs reads `m` as a variable, so no
 *   template, tile or answer ever carries one.
 * - Nothing declares `source`, and only the definite integrals of levels 3
 *   and 4 declare `integrand`, always with `limits` and with t renamed to x. The
 *   oracles in `generators.test.ts` work in x: `source` is differentiated in
 *   x and an `integrand` without `limits` is compared with d/dx of the answer,
 *   so neither can check a formula in t (PITFALLS 2.2). With `limits` the
 *   check is quadrature, which does not care about the letter.
 *   `kinematics.test.ts` recomputes every answer by routes of its own: level
 *   3 reads the formula off the slide and differentiates it in t with mathjs;
 *   level 4 parses the function the prompt shows, and differentiates with
 *   mathjs, bisects for roots and integrates by Simpson. A level 4 distance
 *   summed from pieces declares nothing.
 * - The level 3 answers typed as a formula in t are the one exception to the
 *   first rule: they carry a keypad with `t` on it, and are checked by value
 *   like any other typed answer.
 * - Level 4's polynomials in a prompt have whole coefficients, and every root,
 *   turning value and area is whole or a tenth; a draw that is not is refused.
 *   Level 4 holds its polynomials as `Coeffs`, constant term first, apart from
 *   level 3's `Poly`, highest power first.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { fmt } from './numericalMethods';
import { OPERATOR_KEYS, spaced, stepBank, tokenBank } from './parametricImplicit';
import { gcdOrOne, say } from './format';
import { WORKING_KEYS } from './workingKeys';

/* ================================================================
 * Shared helpers
 * ================================================================ */


/** g, as every question here states it. */
const G = 9.8;

/** Whether a value is exact to one decimal place. */
export const isTenth = (value: number): boolean =>
  Number.isFinite(value) && Math.abs(value * 10 - Math.round(value * 10)) < 1e-7;

/** A number that follows an operator: negatives are bracketed. */
const par = (value: number): string => (value < 0 ? `(${fmt(value)})` : fmt(value));

/** `+ 3` or `- 3`, for a term that follows another. */
const signed = (value: number): string => (value < 0 ? `- ${fmt(-value)}` : `+ ${fmt(value)}`);

/** Lines of working stacked on their `&`, so they never run off a phone. */
function aligned(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** A whole number in [-n, n] other than zero. */
function nonZero(rng: Rng, n: number): number {
  for (;;) {
    const value = rng.int(-n, n);
    if (value !== 0) return value;
  }
}

/** "a, b and c". */
function listed(items: string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * A bank of values: the answer as a multiset (a value needed twice is offered
 * twice), then slips unlike every answer, topped up with near misses. Only
 * exact tenths get in, so a slip that divides badly is dropped rather than
 * shown as a long decimal. Sorted by value, never shuffled (PITFALLS 3.10).
 */
function valueBank(answer: number[], slips: number[], spare = 3): string[] {
  const tokens = answer.map(fmt);
  const needed = new Set(tokens);
  const extras: string[] = [];
  const add = (value: number) => {
    if (extras.length >= spare || !isTenth(value)) return;
    const token = fmt(value);
    if (needed.has(token) || extras.includes(token)) return;
    extras.push(token);
  };
  slips.forEach(add);
  for (let step = 1; extras.length < spare; step += 1) {
    for (const value of answer) {
      add(value + step);
      add(value - step);
    }
  }
  return [...tokens, ...extras].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
}

/** Options for a numeric answer: the slips given, then near misses, four in all. */
function numChoices(correct: number, slips: number[]): ChoiceOption[] {
  const seen = new Set([fmt(correct)]);
  const picked: number[] = [];
  const add = (value: number) => {
    if (picked.length >= 3 || !isTenth(value)) return;
    const token = fmt(value);
    if (seen.has(token)) return;
    seen.add(token);
    picked.push(value);
  };
  slips.forEach(add);
  for (let step = 1; picked.length < 3; step += 1) {
    add(correct + step);
    add(correct - step);
  }
  const asOption = (value: number) => ({ tex: fmt(value), answer: fmt(value) });
  return options(asOption(correct), ...picked.map(asOption));
}

interface Option {
  label: string;
  correct?: boolean;
}

/**
 * A native choice slide, turned by a hash of its labels so the answer is not
 * always first yet one question renders one way. The correct option is listed
 * first, so a distractor that happens to read the same is the one dropped.
 */
function choiceSlide(prompt: Block[], opts: Option[], tex: boolean): Slide {
  const unique = opts.filter((option, idx) => opts.findIndex((other) => other.label === option.label) === idx);
  const turn = hashSeed(unique.map((option) => option.label).join('|')) % unique.length;
  const ordered = [...unique.slice(turn), ...unique.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.label, tex })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/** Flow branches turned by a hash of `key`, so the right one is not always first. */
function turned<T>(items: T[], key: string): T[] {
  const turn = hashSeed(key) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/** A direction and its opposite, for a line that is not drawn. */
const AXES: readonly { pos: string; neg: string }[] = [
  { pos: 'right', neg: 'left' },
  { pos: 'east', neg: 'west' },
  { pos: 'north', neg: 'south' },
];

const PEOPLE = ['A cyclist', 'A runner', 'A walker', 'A skater'] as const;
const VEHICLES = ['A car', 'A train', 'A bus', 'A van', 'A tram', 'A lorry'] as const;
const THROWN = ['ball', 'stone', 'coin', 'pebble'] as const;

/* ---------- Graphs made of straight stages ---------- */

/** A corner of a graph: (t, value). */
export type Corner = [number, number];

/** The function whose graph joins the corners with straight lines. */
export function through(corners: Corner[]): (x: number) => number {
  return (x) => {
    if (x <= corners[0][0]) return corners[0][1];
    for (let k = 1; k < corners.length; k += 1) {
      const [x0, y0] = corners[k - 1];
      const [x1, y1] = corners[k];
      if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return corners[corners.length - 1][1];
  };
}

/** The gradient of stage `k`, from corner k to corner k + 1. */
export const gradientOf = (corners: Corner[], k: number): number =>
  (corners[k + 1][1] - corners[k][1]) / (corners[k + 1][0] - corners[k][0]);

/** The area between stage `k` and the axis, counted negative below it. */
export const stageArea = (corners: Corner[], k: number): number =>
  ((corners[k][1] + corners[k + 1][1]) * (corners[k + 1][0] - corners[k][0])) / 2;

const stagesOf = (corners: Corner[]): number[] => corners.slice(1).map((_, k) => k);
const endOf = (corners: Corner[]): number => corners[corners.length - 1][0];

/** The corners as the learner reads them, `$(0, 2)$, $(3, 8)$ and $(5, 8)$`. */
const cornersText = (corners: Corner[]): string => listed(corners.map(([t, y]) => `$(${fmt(t)}, ${fmt(y)})$`));

/** A stage named by its times, `2 \le t \le 5`. */
const stageTex = (corners: Corner[], k: number): string => `${fmt(corners[k][0])} \\le t \\le ${fmt(corners[k + 1][0])}`;

interface GraphSpec {
  stages: number;
  lo: number;
  hi: number;
  /** Gradients may be halves as well as whole. */
  halves: boolean;
  /** The last corner's time may not pass this. */
  maxT: number;
}

/**
 * Corners of a graph in straight stages: whole times, whole values inside
 * [lo, hi], each stage a whole (or half) gradient and no two neighbouring
 * stages the same, so every corner is a real corner.
 */
function sampleCorners(rng: Rng, spec: GraphSpec, accept: (corners: Corner[]) => boolean = () => true): Corner[] {
  for (;;) {
    const corners: Corner[] = [[0, rng.int(spec.lo, spec.hi)]];
    let previous: number | undefined;
    let ok = true;
    for (let k = 0; k < spec.stages && ok; k += 1) {
      const [t0, y0] = corners[k];
      const d = rng.int(1, 4);
      const g = spec.halves ? rng.int(-8, 8) / 2 : rng.int(-4, 4);
      const y1 = y0 + g * d;
      if (!Number.isInteger(y1) || y1 < spec.lo || y1 > spec.hi || g === previous) ok = false;
      previous = g;
      corners.push([t0 + d, y1]);
    }
    if (!ok || endOf(corners) > spec.maxT) continue;
    if (accept(corners)) return corners;
  }
}

/** A graph on squared paper, with a ring at each corner. */
function graphSvg(corners: Corner[], label: string, shade?: { from: number; to: number }): string {
  const values = corners.map(([, y]) => y);
  const f = through(corners);
  return plotSvg({
    xMin: 0,
    xMax: endOf(corners),
    yMin: Math.min(0, ...values) - 1,
    yMax: Math.max(0, ...values) + 1,
    grid: true,
    height: 170,
    curves: [{ f }],
    marks: corners.map(([x, y]) => ({ x, y })),
    shade: shade && { f, ...shade },
    label,
  });
}

const figure = (svg: string): Block => ({ kind: 'diagram', svg });

/* ================================================================
 * Level 1, lesson 1: displacement and velocity along a line
 * ================================================================ */

interface DispParams {
  /** Positions visited, the first being the start. */
  stops: number[];
  ask: 'displacement' | 'distance';
  axis: number;
}

const dispOf = ({ stops }: DispParams): number => stops[stops.length - 1] - stops[0];
const distOf = ({ stops }: DispParams): number =>
  stops.slice(1).reduce((total, s, k) => total + Math.abs(s - stops[k]), 0);

/**
 * A particle turns round at every stop, so the distance and the displacement
 * always differ. Difficulty 2 has three legs rather than two.
 */
const disp: Generator<DispParams> = {
  id: 'kin-disp',
  sample: (rng, difficulty) => {
    const legs = difficulty > 1 ? 3 : 2;
    for (;;) {
      const stops = [rng.int(-4, 6)];
      for (let k = 0; k < legs; k += 1) stops.push(rng.int(-8, 10));
      const moves = stops.slice(1).map((s, k) => s - stops[k]);
      if (moves.some((m) => m === 0)) continue;
      if (moves.some((m, k) => k > 0 && Math.sign(m) === Math.sign(moves[k - 1]))) continue;
      const params: DispParams = { stops, ask: rng.pick(['displacement', 'distance'] as const), axis: rng.int(0, 2) };
      if (dispOf(params) === 0 && difficulty === 1) continue;
      return params;
    }
  },
  choices: (params) => {
    const right = params.ask === 'displacement' ? dispOf(params) : distOf(params);
    const other = params.ask === 'displacement' ? distOf(params) : Math.abs(dispOf(params));
    return numChoices(right, [other, -right, params.stops[params.stops.length - 1]]);
  },
  render: (params): Slide => {
    const { stops, ask } = params;
    const { pos } = AXES[params.axis];
    const path = stops.slice(1).map((s) => `$s = ${s}$`);
    return {
      kind: 'expression',
      prompt: [
        say(
          `A particle moves along a straight line. Its position $s$, in metres, is measured from $O$, positive to the ${pos}. It starts at $s = ${stops[0]}$ and moves to ${path.join(', then to ')}.`,
        ),
        say(ask === 'displacement' ? 'Find its displacement from where it started.' : 'Find the total distance it travels.'),
      ],
      lead: ask === 'displacement' ? '\\text{displacement} =' : '\\text{distance} =',
      keypad: WORKING_KEYS,
      answer: fmt(ask === 'displacement' ? dispOf(params) : distOf(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { stops, ask } = params;
    const legs = stops.slice(1).map((s, k) => `|${s} - ${par(stops[k])}| = ${Math.abs(s - stops[k])}`);
    if (ask === 'displacement') {
      return [
        { text: 'Displacement only cares where the particle ends up compared with where it started, not the route.' },
        { tex: `${stops[stops.length - 1]} - ${par(stops[0])} = ${dispOf(params)}` },
        { text: dispOf(params) < 0 ? 'Negative: it finished on the negative side of its start.' : 'The sign says which side of its start it finished.' },
      ];
    }
    return [
      { text: 'Distance adds up every leg, whichever way it went, so each leg counts as positive:' },
      { tex: aligned(...legs.map((leg) => `&${leg}`)) },
      { tex: `\\text{distance} = ${stops.slice(1).map((s, k) => Math.abs(s - stops[k])).join(' + ')} = ${distOf(params)}` },
    ];
  },
};

interface SignParams {
  vertical: boolean;
  axis: number;
  /** The first leg goes the positive way. */
  firstPositive: boolean;
  /** Out this far... */
  a: number;
  /** ...then back this far so far, still moving back. */
  b: number;
}

const signWord = (value: number): 'Positive' | 'Negative' | 'Zero' => (value > 0 ? 'Positive' : value < 0 ? 'Negative' : 'Zero');

function signState({ firstPositive, a, b }: SignParams): { v: number; s: number } {
  const way = firstPositive ? 1 : -1;
  return { v: -way, s: way * (a - b) };
}

function signWords(params: SignParams): { first: string; back: string; pos: string } {
  if (params.vertical) return { first: 'up', back: 'down', pos: params.firstPositive ? 'up' : 'down' };
  const { pos, neg } = AXES[params.axis];
  return params.firstPositive ? { first: pos, back: neg, pos } : { first: neg, back: pos, pos };
}

/**
 * The signs of velocity and displacement at one moment, as two decisions. The
 * velocity's sign is the way it is moving now; the displacement's is which
 * side of O it is on. Difficulty 2 adds a ball thrown up and the case where
 * it is back at O.
 */
const signFlow: Generator<SignParams> = {
  id: 'kin-sign-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const a = rng.int(2, 12);
      const b = hard && rng.chance(0.2) ? a : rng.int(1, 15);
      if (!hard && a === b) continue;
      return { vertical: hard && rng.chance(0.5), axis: rng.int(0, 2), firstPositive: rng.chance(0.5), a, b };
    }
  },
  render: (params): Slide => {
    const { a, b } = params;
    const { first, back, pos } = signWords(params);
    const story = params.vertical
      ? `A ball is thrown straight up from $O$ at the edge of a cliff. It rises ${a} m, then falls. It has now fallen ${b} m and is still falling.`
      : `A particle leaves $O$ and moves ${a} m ${first}. It turns round and has now moved ${b} m back, still moving ${back}.`;
    const key = `${a}|${b}|${pos}|${first}`;
    const outcome = (v: string, s: string) => {
      const where = s === 'Zero' ? 'it is back at $O$' : `it is on the ${s === 'Positive' ? 'positive' : 'negative'} side of $O$`;
      return `Velocity ${v.toLowerCase()}, displacement ${s.toLowerCase()}: it is moving the ${v === 'Positive' ? 'positive' : 'negative'} way, and ${where}.`;
    };
    const ends = (v: string) =>
      turned(
        (['Positive', 'Negative', 'Zero'] as const).map((s) => ({ label: s, outcome: outcome(v, s) })),
        `${key}${v}`,
      );
    const { v, s } = signState(params);
    return {
      kind: 'flow',
      prompt: [say(story), say(`Taking ${pos} as positive, decide the signs of its velocity and of its displacement from $O$ right now.`)],
      subject: 'v \\text{ and } s',
      steps: [
        {
          id: 'v',
          ask: 'What is the sign of its velocity now?',
          branches: turned(
            [
              { label: 'Positive', to: 'sp' },
              { label: 'Negative', to: 'sn' },
            ],
            key,
          ),
        },
        { id: 'sp', ask: 'And the sign of its displacement from $O$?', branches: ends('Positive') },
        { id: 'sn', ask: 'And the sign of its displacement from $O$?', branches: ends('Negative') },
      ],
      answer: [signWord(v), signWord(s)],
    };
  },
  solution: (params) => {
    const { a, b } = params;
    const { first, back, pos } = signWords(params);
    const { v, s } = signState(params);
    return [
      { text: `It is moving ${back} now, and ${pos} is positive, so its velocity is ${signWord(v).toLowerCase()}.` },
      {
        text:
          s === 0
            ? `It went ${a} m ${first} and has come ${b} m back, so it is at $O$: displacement zero.`
            : `It went ${a} m ${first} and has come ${b} m back, so it is ${Math.abs(a - b)} m ${a > b ? first : back} of $O$: displacement ${signWord(s).toLowerCase()}.`,
      },
      { text: 'Velocity is about which way it is moving; displacement is about where it is. The two signs need not agree.' },
    ];
  },
};

interface LineParams {
  start: number;
  /** Difficulty 1: one displacement. Difficulty 2: [velocity, time] pairs. */
  moves: [number, number][];
}

const LINE = 10;

const lineEnd = ({ start, moves }: LineParams): number => moves.reduce((s, [v, t]) => s + v * t, start);

/**
 * Where a particle ends up, placed on the line itself. Difficulty 2 gives two
 * stages as a velocity for a time, so the displacement has to be built.
 */
const lineSlider: Generator<LineParams> = {
  id: 'kin-line-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const start = rng.int(-7, 7);
      const moves: [number, number][] =
        difficulty > 1
          ? [
              [nonZero(rng, 4), rng.int(1, 3)],
              [nonZero(rng, 4), rng.int(1, 3)],
            ]
          : [[nonZero(rng, 12), 1]];
      if (difficulty > 1 && Math.sign(moves[0][0]) === Math.sign(moves[1][0])) continue;
      const middle = start + moves[0][0] * moves[0][1];
      const end = lineEnd({ start, moves });
      if (Math.abs(middle) > LINE || Math.abs(end) > LINE - 1 || end === start) continue;
      return { start, moves };
    }
  },
  render: (params): Slide => {
    const { start, moves } = params;
    const told =
      moves.length === 1
        ? `Its displacement from there is then $${moves[0][0]}$ m. Slide the line to where it ends up.`
        : `It moves with velocity $${moves[0][0]}$ m/s for ${moves[0][1]} s, then with velocity $${moves[1][0]}$ m/s for ${moves[1][1]} s. Slide the line to where it ends up.`;
    return {
      kind: 'slider',
      prompt: [say(`A particle starts at the dot, $s = ${start}$, on a line measured in metres from $O$, positive to the right.`), say(told)],
      min: -LINE,
      max: LINE,
      step: 1,
      answer: lineEnd(params),
      readout: 's = {v}',
      figure: {
        svg: plotSvg({
          xMin: -LINE,
          xMax: LINE,
          yMin: -1,
          yMax: 1,
          grid: true,
          height: 60,
          curves: [],
          marks: [{ x: start, y: 0 }],
          label: `A number line from ${-LINE} to ${LINE} with the particle's start marked`,
        }),
        ...markerWindow(-LINE, LINE),
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { start, moves } = params;
    const end = lineEnd(params);
    if (moves.length === 1) {
      return [
        { text: 'A displacement is a change of position, so add it to where the particle started:' },
        { tex: `${start} ${signed(moves[0][0])} = ${end}` },
      ];
    }
    const parts = moves.map(([v, t]) => v * t);
    return [
      { text: 'Each stage moves it velocity times time, with the sign of the velocity:' },
      { tex: aligned(...moves.map(([v, t], k) => `${par(v)} \\times ${t} &= ${parts[k]}`)) },
      { tex: `s = ${start} ${signed(parts[0])} ${signed(parts[1])} = ${end}` },
    ];
  },
};

interface MotionParams {
  axis: number;
  v: number;
  /** Difficulty 2: from this position to that one in `t` seconds. */
  from?: number;
  to?: number;
  t?: number;
}

/**
 * Speed is the size of the velocity; its sign is the direction. Difficulty 2
 * finds the velocity from two positions first.
 */
const motionChoice: Generator<MotionParams> = {
  id: 'kin-motion-choice',
  sample: (rng, difficulty) => {
    const axis = rng.int(0, 2);
    if (difficulty < 2) return { axis, v: nonZero(rng, 12) };
    for (;;) {
      const t = rng.int(2, 6);
      const v = nonZero(rng, 5);
      const from = rng.int(-12, 12);
      const to = from + v * t;
      if (Math.abs(to) > 20) continue;
      return { axis, v, from, to, t };
    }
  },
  render: ({ axis, v, from, to, t }): Slide => {
    const { pos, neg } = AXES[axis];
    const dir = (value: number) => (value > 0 ? pos : neg);
    const speed = Math.abs(v);
    const opts: Option[] = [
      { label: `Speed ${speed} m/s, moving ${dir(v)}`, correct: true },
      { label: `Speed ${speed} m/s, moving ${dir(-v)}` },
      { label: `Speed -${speed} m/s, moving ${dir(v)}` },
    ];
    if (t === undefined) {
      opts.push({ label: `Speed -${speed} m/s, moving ${dir(-v)}` });
      return choiceSlide(
        [say(`Taking ${pos} as positive, a particle has velocity $${v}$ m/s. Which describes its motion?`)],
        opts,
        false,
      );
    }
    opts.push({ label: `Speed ${Math.abs(to! - from!)} m/s, moving ${dir(v)}` });
    return choiceSlide(
      [
        say(
          `Taking ${pos} as positive, a particle moves steadily from $s = ${from}$ to $s = ${to}$ in ${t} seconds, with $s$ in metres. Which describes its motion?`,
        ),
      ],
      opts,
      false,
    );
  },
  solution: ({ axis, v, from, to, t }) => {
    const { pos, neg } = AXES[axis];
    const steps: SolutionStep[] = [];
    if (t !== undefined) {
      steps.push({ text: 'Velocity is the change in position over the time taken:' }, { tex: `v = \\frac{${to} - ${par(from!)}}{${t}} = ${v}` });
    }
    steps.push(
      { text: `Speed is the size of the velocity, so it is never negative: $${Math.abs(v)}$ m/s.` },
      { text: `The sign of $${v}$ gives the direction: ${v > 0 ? `positive, so ${pos}` : `negative, so ${neg}`}.` },
    );
    return steps;
  },
};

/* ================================================================
 * Level 1, lesson 2: average speed and velocity
 * ================================================================ */

interface AvgTreeParams {
  subject: number;
  /** Difficulty 1: [distance, time]. Difficulty 2: [speed, time]. */
  legs: [number, number][];
  bySpeed: boolean;
}

const avgParts = ({ legs, bySpeed }: AvgTreeParams) => {
  const dists = legs.map(([x, t]) => (bySpeed ? x * t : x));
  const D = dists[0] + dists[1];
  const T = legs[0][1] + legs[1][1];
  return { dists, D, T, S: D / T };
};

/**
 * Average speed as total distance over total time, built as a tree. At
 * difficulty 2 each stage is a speed for a time, so the distances come first.
 */
const avgTree: Generator<AvgTreeParams> = {
  id: 'kin-avg-tree',
  sample: (rng, difficulty) => {
    const bySpeed = difficulty > 1;
    for (;;) {
      const legs: [number, number][] = bySpeed
        ? [
            [rng.int(2, 12), rng.int(3, 20)],
            [rng.int(2, 12), rng.int(3, 20)],
          ]
        : [
            [rng.int(10, 120), rng.int(2, 20)],
            [rng.int(10, 120), rng.int(2, 20)],
          ];
      const params = { subject: rng.int(0, PEOPLE.length - 1), legs, bySpeed };
      const { S } = avgParts(params);
      if (!isTenth(S)) continue;
      if (bySpeed && (legs[0][0] === legs[1][0] || S === (legs[0][0] + legs[1][0]) / 2)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { legs, bySpeed } = params;
    const { dists, D, T, S } = avgParts(params);
    const who = PEOPLE[params.subject];
    const slips = [T / D, D - T, D * T, (legs[0][0] + legs[1][0]) / 2, legs[0][0] + legs[1][0], S * 2];
    if (!bySpeed) {
      return {
        kind: 'tree',
        prompt: [
          say(
            `${who} covers ${legs[0][0]} m in ${legs[0][1]} s, then ${legs[1][0]} m in ${legs[1][1]} s. Fill in the total distance and the total time, then the average speed in m/s.`,
          ),
        ],
        expression: '\\text{average speed} = \\frac{\\text{distance}}{\\text{time}}',
        nodes: [
          { id: 'D', from: [] },
          { id: 'T', from: [] },
          { id: 'S', from: ['D', 'T'] },
        ],
        bank: valueBank([D, T, S], slips),
        answer: [D, T, S].map(fmt),
      };
    }
    return {
      kind: 'tree',
      prompt: [
        say(
          `${who} goes at ${legs[0][0]} m/s for ${legs[0][1]} s, then at ${legs[1][0]} m/s for ${legs[1][1]} s. Fill in each stage's distance, the total distance, the total time, then the average speed.`,
        ),
      ],
      expression: '\\text{average speed} = \\frac{\\text{distance}}{\\text{time}}',
      nodes: [
        { id: 'd1', from: [] },
        { id: 'd2', from: [] },
        { id: 'D', from: ['d1', 'd2'] },
        { id: 'T', from: [] },
        { id: 'S', from: ['D', 'T'] },
      ],
      bank: valueBank([dists[0], dists[1], D, T, S], slips),
      answer: [dists[0], dists[1], D, T, S].map(fmt),
    };
  },
  solution: (params) => {
    const { legs, bySpeed } = params;
    const { dists, D, T, S } = avgParts(params);
    const steps: SolutionStep[] = [];
    if (bySpeed) {
      steps.push(
        { text: 'Each stage covers speed times time:' },
        { tex: aligned(`${legs[0][0]} \\times ${legs[0][1]} &= ${dists[0]}`, `${legs[1][0]} \\times ${legs[1][1]} &= ${dists[1]}`) },
      );
    }
    steps.push(
      { tex: aligned(`\\text{distance} &= ${dists[0]} + ${dists[1]} = ${D}`, `\\text{time} &= ${legs[0][1]} + ${legs[1][1]} = ${T}`) },
      { tex: `\\text{average speed} = \\frac{${D}}{${T}} = ${fmt(S)}` },
    );
    if (bySpeed) steps.push({ text: `Not the mean of the two speeds, $${fmt((legs[0][0] + legs[1][0]) / 2)}$: the stages take different times.` });
    return steps;
  },
};

interface AvgVelParams {
  axis: number;
  subject: number;
  a: number;
  b: number;
  t1: number;
  t2: number;
}

const avgVel = ({ a, b, t1, t2 }: AvgVelParams): number => (a - b) / (t1 + t2);

/**
 * Average velocity, out and back, one operation at a time. At difficulty 2
 * the way back is longer, so the average velocity comes out negative.
 */
const avgVelSteps: Generator<AvgVelParams> = {
  id: 'kin-avgvel-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const a = rng.int(4, 40);
      const b = rng.int(4, 40);
      const t1 = rng.int(2, 12);
      const t2 = rng.int(2, 12);
      if (difficulty > 1 ? b <= a : b >= a) continue;
      const params = { axis: rng.int(0, 2), subject: rng.int(0, PEOPLE.length - 1), a, b, t1, t2 };
      if (!isTenth(avgVel(params))) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { a, b, t1, t2 } = params;
    const { pos, neg } = AXES[params.axis];
    const top = a - b;
    const T = t1 + t2;
    const v = avgVel(params);
    return {
      kind: 'steps',
      prompt: [
        say(
          `${PEOPLE[params.subject]} goes ${a} m ${pos} in ${t1} s, then ${b} m ${neg} in ${t2} s. Taking ${pos} as positive, work out the average velocity: displacement over time. Tap the part to work out next, then choose its value.`,
        ),
      ],
      start: ['(', `${a}`, '-', `${b}`, ')', '\\div', '(', `${t1}`, '+', `${t2}`, ')'],
      reductions: [
        { span: [0, 5], operator: 2, value: fmt(top), bank: stepBank(fmt(top), fmt(a + b), fmt(-top), fmt(top + 1)) },
        { span: [2, 7], operator: 4, value: fmt(T), bank: stepBank(fmt(T), fmt(t1 * t2), fmt(Math.abs(t1 - t2)), fmt(T + 1)) },
        {
          span: [0, 3],
          operator: 1,
          value: fmt(v),
          bank: stepBank(fmt(v), ...[(a + b) / T, -v, v + 1].filter(isTenth).map(fmt)),
        },
      ],
    };
  },
  solution: (params) => {
    const { a, b, t1, t2 } = params;
    const { pos } = AXES[params.axis];
    const v = avgVel(params);
    return [
      { text: `With ${pos} positive the displacement is $${a} - ${b} = ${a - b}$ m, not the ${a + b} m walked.` },
      { tex: `\\bar{v} = \\frac{${a - b}}{${t1} + ${t2}} = \\frac{${a - b}}{${t1 + t2}} = ${fmt(v)}` },
      { text: v < 0 ? 'Negative: overall it moved the negative way.' : 'Positive: overall it moved the positive way.' },
    ];
  },
};

interface MeanSpeedParams {
  subject: number;
  d1: number;
  v1: number;
  d2: number;
  v2: number;
  rest: number;
}

const meanSpeed = ({ d1, v1, d2, v2, rest }: MeanSpeedParams): number => (d1 + d2) / (d1 / v1 + d2 / v2 + rest);

/**
 * The classic trap: two speeds over two distances, where the mean of the
 * speeds is wrong. Difficulty 2 stops for a while in the middle.
 */
const meanSpeedGen: Generator<MeanSpeedParams> = {
  id: 'kin-mean-speed',
  sample: (rng, difficulty) => {
    for (;;) {
      const v1 = rng.int(2, 12);
      const v2 = rng.int(2, 12);
      const d1 = v1 * rng.int(2, 15);
      const d2 = v2 * rng.int(2, 15);
      const rest = difficulty > 1 ? rng.int(2, 10) : 0;
      const params = { subject: rng.int(0, VEHICLES.length - 1), d1, v1, d2, v2, rest };
      const mean = meanSpeed(params);
      if (v1 === v2 || !isTenth(mean) || mean === (v1 + v2) / 2) continue;
      return params;
    }
  },
  choices: (params) => {
    const { d1, v1, d2, v2 } = params;
    const moving = (d1 + d2) / (d1 / v1 + d2 / v2);
    return numChoices(meanSpeed(params), [(v1 + v2) / 2, moving, (d1 + d2) / Math.max(v1, v2)]);
  },
  render: (params): Slide => {
    const { d1, v1, d2, v2, rest } = params;
    const middle = rest > 0 ? `, stops for ${rest} s,` : '';
    return {
      kind: 'expression',
      prompt: [
        say(
          `${VEHICLES[params.subject]} travels ${d1} m at ${v1} m/s${middle} then ${d2} m at ${v2} m/s. Find its average speed, in m/s, for the whole journey.`,
        ),
      ],
      lead: '\\text{average speed} =',
      keypad: WORKING_KEYS,
      answer: fmt(meanSpeed(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { d1, v1, d2, v2, rest } = params;
    const t1 = d1 / v1;
    const t2 = d2 / v2;
    const total = t1 + t2 + rest;
    return [
      { text: 'Each stage takes distance over speed:' },
      { tex: aligned(`\\frac{${d1}}{${v1}} &= ${t1}`, `\\frac{${d2}}{${v2}} &= ${t2}`) },
      { text: rest > 0 ? `With the ${rest} s stop, the whole journey takes $${t1} + ${t2} + ${rest} = ${total}$ s.` : `So the whole journey takes $${total}$ s.` },
      { tex: `\\text{average speed} = \\frac{${d1} + ${d2}}{${total}} = ${fmt(meanSpeed(params))}` },
    ];
  },
};

interface SetupParams {
  axis: number;
  subject: number;
  /** Leg lengths; odd legs go the positive way, even legs back. */
  legs: number[];
  times: number[];
  ask: 'speed' | 'velocity';
}

const legSum = (values: number[], sign: (k: number) => string) =>
  values.map((value, k) => (k === 0 ? `${value}` : `${sign(k)} ${value}`)).join(' ');

/**
 * Setting up an average before working it out: distance or displacement on
 * top, the total time below. Difficulty 2 has three legs.
 */
const setupTiles: Generator<SetupParams> = {
  id: 'kin-setup-tiles',
  sample: (rng, difficulty) => {
    const count = difficulty > 1 ? 3 : 2;
    for (;;) {
      const legs = Array.from({ length: count }, () => rng.int(10, 90));
      if (new Set(legs).size < count) continue;
      const times = Array.from({ length: count }, () => rng.int(2, 9));
      return { axis: rng.int(0, 2), subject: rng.int(0, PEOPLE.length - 1), legs, times, ask: rng.pick(['speed', 'velocity'] as const) };
    }
  },
  render: ({ axis, subject, legs, times, ask }): Slide => {
    const { pos, neg } = AXES[axis];
    const distance = legSum(legs, () => '+');
    const displacement = legSum(legs, (k) => (k % 2 === 1 ? '-' : '+'));
    const reversed = [legs[1], ...legs.filter((_, k) => k !== 1)].join(' - ');
    const time = legSum(times, () => '+');
    const product = times.join(' \\times ');
    const moves = legs.map((d, k) => `${d} m ${k % 2 === 0 ? pos : neg} in ${times[k]} s`);
    const answer = [ask === 'speed' ? distance : displacement, time];
    return {
      kind: 'tiles',
      prompt: [
        say(`${PEOPLE[subject]} goes ${listed(moves).replace(/ and /, ', then ')}. Taking ${pos} as positive, set up the average ${ask}.`),
      ],
      template: `\\text{average ${ask}} = ({0}) \\div ({1})`,
      bank: tokenBank(answer, [ask === 'speed' ? displacement : distance, reversed, product]),
      answer,
    };
  },
  solution: ({ axis, legs, times, ask }) => {
    const { pos } = AXES[axis];
    const total = times.reduce((a, b) => a + b, 0);
    if (ask === 'speed') {
      return [
        { text: 'Average speed uses the total distance, every leg counted positive, over the total time:' },
        { tex: `\\frac{${legSum(legs, () => '+')}}{${legSum(times, () => '+')}} = \\frac{${legs.reduce((a, b) => a + b, 0)}}{${total}}` },
      ];
    }
    const net = legs.reduce((s, d, k) => s + (k % 2 === 0 ? d : -d), 0);
    return [
      { text: `Average velocity uses the displacement: with ${pos} positive, the legs back are subtracted.` },
      { tex: `\\frac{${legSum(legs, (k) => (k % 2 === 1 ? '-' : '+'))}}{${legSum(times, () => '+')}} = \\frac{${net}}{${total}}` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 3: displacement-time graphs
 * ================================================================ */

interface StageParams {
  corners: Corner[];
  /** The stage asked about. */
  stage: number;
}

const ST_EASY: GraphSpec = { stages: 3, lo: 0, hi: 10, halves: false, maxT: 10 };
const ST_HARD: GraphSpec = { stages: 3, lo: -5, hi: 10, halves: true, maxT: 10 };

/** A stage that moves, picked from a graph drawn to `spec`. */
function sampleMovingStage(rng: Rng, spec: GraphSpec): StageParams {
  const corners = sampleCorners(rng, spec);
  const moving = stagesOf(corners).filter((k) => gradientOf(corners, k) !== 0);
  return { corners, stage: rng.pick(moving) };
}

/**
 * The gradient of one stage of a displacement-time graph, read as a velocity.
 * Difficulty 2 runs below the axis and has half-unit gradients.
 */
const stGradient: Generator<StageParams> = {
  id: 'kin-st-gradient',
  sample: (rng, difficulty) => sampleMovingStage(rng, difficulty > 1 ? ST_HARD : ST_EASY),
  choices: ({ corners, stage }) => {
    const g = gradientOf(corners, stage);
    const [t0, s0] = corners[stage];
    const [t1, s1] = corners[stage + 1];
    return numChoices(g, [-g, s1 - s0, (t1 - t0) / (s1 - s0), s1 / t1]);
  },
  render: ({ corners, stage }): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `A particle's displacement-time graph joins ${cornersText(corners)} with straight lines, $s$ in metres and $t$ in seconds. Find its velocity for $${stageTex(corners, stage)}$.`,
      ),
      figure(graphSvg(corners, 'A displacement-time graph made of straight stages')),
    ],
    lead: 'v =',
    keypad: WORKING_KEYS,
    answer: fmt(gradientOf(corners, stage)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ corners, stage }) => {
    const [t0, s0] = corners[stage];
    const [t1, s1] = corners[stage + 1];
    const g = gradientOf(corners, stage);
    return [
      { text: 'On a displacement-time graph the gradient is the velocity: change in $s$ over change in $t$.' },
      { tex: `v = \\frac{${s1} - ${par(s0)}}{${t1} - ${t0}} = \\frac{${s1 - s0}}{${t1 - t0}} = ${fmt(g)}` },
      { text: g < 0 ? 'Negative: the graph slopes down, so the particle is moving back the negative way.' : 'Positive: the graph slopes up.' },
    ];
  },
};

interface StSliderParams {
  corners: Corner[];
  ask: 'stops' | 'moves' | 'origin';
  answer: number;
}

/** Every time the graph is at zero, as a set; a stage lying along zero gives Infinity. */
function zerosOf(corners: Corner[]): number[] {
  const out = new Set<number>();
  for (const k of stagesOf(corners)) {
    const [t0, y0] = corners[k];
    const [t1, y1] = corners[k + 1];
    if (y0 === 0 && y1 === 0) return [Infinity];
    if (y0 === 0) out.add(t0);
    if (y1 === 0) out.add(t1);
    if (y0 * y1 < 0) out.add(t0 + (-y0 * (t1 - t0)) / (y1 - y0));
  }
  return [...out];
}

/**
 * A time read off a displacement-time graph by sliding to it: when the
 * particle stops or sets off again, or at difficulty 2 when it is at O.
 */
const stSlider: Generator<StSliderParams> = {
  id: 'kin-st-slider',
  sample: (rng, difficulty) => {
    if (difficulty < 2) {
      const corners = sampleCorners(rng, ST_EASY, (c) => stagesOf(c).filter((k) => gradientOf(c, k) === 0).length === 1);
      const flat = stagesOf(corners).find((k) => gradientOf(corners, k) === 0)!;
      const last = flat === corners.length - 2;
      const ask = flat === 0 ? 'moves' : last ? 'stops' : rng.pick(['stops', 'moves'] as const);
      return { corners, ask, answer: ask === 'stops' ? corners[flat][0] : corners[flat + 1][0] };
    }
    const corners = sampleCorners(rng, ST_HARD, (c) => {
      const zeros = zerosOf(c);
      return c[0][1] !== 0 && zeros.length === 1 && Number.isInteger(zeros[0] * 2);
    });
    return { corners, ask: 'origin', answer: zerosOf(corners)[0] };
  },
  render: ({ corners, ask, answer }): Slide => {
    const T = endOf(corners);
    const asked = {
      stops: 'Slide the line to the time the particle stops.',
      moves: 'Slide the line to the time the particle starts moving again.',
      origin: 'Slide the line to the time the particle is at $O$, where $s = 0$.',
    }[ask];
    return {
      kind: 'slider',
      prompt: [say(`The graph shows a particle's displacement $s$ from $O$, in metres, against time $t$ in seconds. ${asked}`)],
      min: 0,
      max: T,
      step: 0.5,
      answer,
      readout: 't = {v}',
      figure: {
        svg: graphSvg(corners, 'A displacement-time graph made of straight stages'),
        ...markerWindow(0, T),
        axis: 'x',
      },
    };
  },
  solution: ({ corners, ask, answer }) => {
    if (ask === 'origin') {
      return [
        { text: 'The particle is at $O$ where its displacement is zero: where the graph meets the $t$-axis.' },
        { text: `That happens once, at $t = ${fmt(answer)}$.` },
      ];
    }
    const flat = stagesOf(corners).find((k) => gradientOf(corners, k) === 0)!;
    return [
      { text: 'A flat stage means $s$ is not changing: the particle is at rest.' },
      { text: `The flat stage runs from $t = ${corners[flat][0]}$ to $t = ${corners[flat + 1][0]}$.` },
      { text: ask === 'stops' ? `So it stops at $t = ${answer}$.` : `So it sets off again at $t = ${answer}$.` },
    ];
  },
};

interface StTableParams {
  s0: number;
  /** [velocity, duration] per stage; the middle one is a rest. */
  stages: [number, number][];
  times: number[];
  /** Rows whose value is given, beyond the first. */
  given: number[];
}

const tableCorners = ({ s0, stages }: Pick<StTableParams, 's0' | 'stages'>): Corner[] => {
  const corners: Corner[] = [[0, s0]];
  for (const [v, d] of stages) {
    const [t, s] = corners[corners.length - 1];
    corners.push([t + d, s + v * d]);
  }
  return corners;
};

/**
 * Displacement at given times from a journey in words: move, rest, move. The
 * learner builds the table a graph would be drawn from. Difficulty 2 comes
 * back towards O at the end and gives one row fewer.
 */
const stTable: Generator<StTableParams> = {
  id: 'kin-st-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const s0 = hard ? rng.int(-4, 6) : rng.int(0, 5);
      const stages: [number, number][] = [
        [rng.int(1, 5), rng.int(1, 3)],
        [0, rng.int(1, 2)],
        [hard ? -rng.int(1, 5) : rng.int(1, 5), rng.int(1, 3)],
      ];
      const T = stages.reduce((sum, [, d]) => sum + d, 0);
      if (T < 5) continue;
      const times = [0, ...rng.sample(Array.from({ length: T }, (_, k) => k + 1), 5).sort((a, b) => a - b)];
      const given = hard ? [] : [rng.pick(times.slice(1))];
      return { s0, stages, times, given };
    }
  },
  render: (params): Slide => {
    const { s0, stages, times, given } = params;
    const f = through(tableCorners(params));
    const [[v1, d1], [, d2], [v3, d3]] = stages;
    const values = times.map(f);
    const blanks = times.map((t, k) => k > 0 && !given.includes(t));
    const answer = values.filter((_, k) => blanks[k]);
    // Slips: forgetting the rest, and running the first velocity on for ever.
    const slips = times.flatMap((t) => [s0 + v1 * t, f(t) + v3, f(t) - v1]);
    return {
      kind: 'table',
      prompt: [
        say(
          `A particle starts at $s = ${s0}$ m. It moves with velocity $${v1}$ m/s for ${d1} s, stays still for ${d2} s, then moves with velocity $${v3}$ m/s for ${d3} s. Fill in its displacement $s$ at each time $t$, in seconds.`,
        ),
      ],
      columns: ['t', 's'],
      rows: times.map((t, k) => [`${t}`, blanks[k] ? null : fmt(values[k])]),
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const corners = tableCorners(params);
    const [[v1, d1], , [v3]] = params.stages;
    return [
      { text: `For the first ${d1} s, $s$ changes by $${v1}$ every second: $s = ${params.s0} ${signed(v1)}t$, reaching $${corners[1][1]}$ at $t = ${corners[1][0]}$.` },
      { text: `It then stays at $s = ${corners[2][1]}$ until $t = ${corners[2][0]}$.` },
      { text: `After that $s$ changes by $${v3}$ every second, ending at $s = ${corners[3][1]}$ when $t = ${corners[3][0]}$.` },
    ];
  },
};

interface StChoiceParams {
  corners: Corner[];
  ask: 'rest' | 'fastest' | 'back' | 'slowest';
  answer: number;
}

/** The stages satisfying the question, which must be exactly one. */
function stagesFor(corners: Corner[], ask: StChoiceParams['ask']): number[] {
  const speeds = stagesOf(corners).map((k) => Math.abs(gradientOf(corners, k)));
  switch (ask) {
    case 'rest':
      return stagesOf(corners).filter((k) => speeds[k] === 0);
    case 'back':
      return stagesOf(corners).filter((k) => gradientOf(corners, k) < 0);
    case 'fastest':
      return stagesOf(corners).filter((k) => speeds[k] === Math.max(...speeds));
    case 'slowest':
      return speeds.includes(0) ? [] : stagesOf(corners).filter((k) => speeds[k] === Math.min(...speeds));
  }
}

/**
 * Which stage of a displacement-time graph is at rest, fastest, or at
 * difficulty 2 moving the negative way or most slowly.
 */
const stChoice: Generator<StChoiceParams> = {
  id: 'kin-st-choice',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const ask = rng.pick(hard ? (['back', 'fastest', 'slowest'] as const) : (['rest', 'fastest'] as const));
    const spec = hard ? { ...ST_HARD, stages: 4, maxT: 12 } : ST_EASY;
    const corners = sampleCorners(rng, spec, (c) => stagesFor(c, ask).length === 1);
    return { corners, ask, answer: stagesFor(corners, ask)[0] };
  },
  render: ({ corners, ask, answer }): Slide => {
    const question = {
      rest: 'During which stage is the particle at rest?',
      fastest: 'During which stage is the particle moving fastest?',
      back: 'During which stage is the particle moving the negative way?',
      slowest: 'During which stage is the particle moving, but most slowly?',
    }[ask];
    return choiceSlide(
      [
        say(`The graph shows a particle's displacement $s$ in metres against time $t$ in seconds. ${question}`),
        figure(graphSvg(corners, 'A displacement-time graph made of straight stages')),
      ],
      [answer, ...stagesOf(corners).filter((k) => k !== answer)].map((k) => ({ label: stageTex(corners, k), correct: k === answer })),
      true,
    );
  },
  solution: ({ corners, ask, answer }) => [
    { text: 'The gradient of each stage is its velocity:' },
    { tex: aligned(...stagesOf(corners).map((k) => `${stageTex(corners, k)}: &\\quad v = ${fmt(gradientOf(corners, k))}`)) },
    {
      text: {
        rest: 'At rest means a gradient of zero: a flat stage.',
        fastest: 'Fastest means the steepest stage, up or down: the largest size of gradient.',
        back: 'Moving the negative way means a negative gradient: the graph slopes down.',
        slowest: 'Most slowly means the gentlest stage that is not flat.',
      }[ask],
    },
    { text: `So the answer is $${stageTex(corners, answer)}$.` },
  ],
};

/* ================================================================
 * Level 1, lesson 4: velocity-time graphs
 * ================================================================ */

const VT_EASY: GraphSpec = { stages: 3, lo: 0, hi: 12, halves: false, maxT: 10 };
const VT_HARD: GraphSpec = { stages: 3, lo: -6, hi: 10, halves: true, maxT: 10 };

/**
 * The gradient of one stage of a velocity-time graph, read as an
 * acceleration. Difficulty 2 has decelerations, halves and negative velocity.
 */
const vtAccel: Generator<StageParams> = {
  id: 'kin-vt-accel',
  sample: (rng, difficulty) => sampleMovingStage(rng, difficulty > 1 ? VT_HARD : VT_EASY),
  choices: ({ corners, stage }) => {
    const g = gradientOf(corners, stage);
    const [t0, v0] = corners[stage];
    const [t1, v1] = corners[stage + 1];
    return numChoices(g, [-g, v1 - v0, (t1 - t0) / (v1 - v0), v1 / t1]);
  },
  render: ({ corners, stage }): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `A particle's velocity-time graph joins ${cornersText(corners)} with straight lines, $v$ in m/s and $t$ in seconds. Find its acceleration for $${stageTex(corners, stage)}$.`,
      ),
      figure(graphSvg(corners, 'A velocity-time graph made of straight stages')),
    ],
    lead: 'a =',
    keypad: WORKING_KEYS,
    answer: fmt(gradientOf(corners, stage)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ corners, stage }) => {
    const [t0, v0] = corners[stage];
    const [t1, v1] = corners[stage + 1];
    const g = gradientOf(corners, stage);
    return [
      { text: 'On a velocity-time graph the gradient is the acceleration: change in $v$ over change in $t$.' },
      { tex: `a = \\frac{${v1} - ${par(v0)}}{${t1} - ${t0}} = \\frac{${v1 - v0}}{${t1 - t0}} = ${fmt(g)}` },
      { text: g < 0 ? 'Negative: the velocity is falling.' : 'Positive: the velocity is rising.' },
    ];
  },
};

interface VtTreeParams {
  subject: number;
  u: number;
  v: number;
  t1: number;
  t2: number;
}

const vtA = ({ u, v, t1, t2 }: VtTreeParams): number => (v - u) / (t2 - t1);

/**
 * Acceleration as change in velocity over time taken, built as a tree.
 * Difficulty 2 crosses zero velocity and lands on tenths.
 */
const vtTree: Generator<VtTreeParams> = {
  id: 'kin-vt-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const t1 = rng.int(0, 8);
      const t2 = t1 + rng.pick(hard ? [2, 4, 5, 10] : [2, 3, 4, 5, 6]);
      const u = hard ? rng.int(-10, 20) : rng.int(0, 20);
      const v = hard ? rng.int(-10, 20) : rng.int(0, 20);
      const params = { subject: rng.int(0, VEHICLES.length - 1), u, v, t1, t2 };
      const a = vtA(params);
      if (a === 0 || !isTenth(a)) continue;
      if (hard ? u >= 0 && v >= 0 && Number.isInteger(a) : !Number.isInteger(a)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { u, v, t1, t2 } = params;
    const a = vtA(params);
    return {
      kind: 'tree',
      prompt: [
        say(
          `${VEHICLES[params.subject]}'s velocity changes steadily from $${u}$ m/s at $t = ${t1}$ to $${v}$ m/s at $t = ${t2}$. Fill in the change in velocity, the time taken, then the acceleration.`,
        ),
      ],
      expression: 'a = \\frac{\\text{change in velocity}}{\\text{time taken}}',
      nodes: [
        { id: 'dv', from: [] },
        { id: 'dt', from: [] },
        { id: 'a', from: ['dv', 'dt'] },
      ],
      bank: valueBank([v - u, t2 - t1, a], [u - v, t2, v + u, -a, (v + u) / (t2 - t1), v / t2]),
      answer: [v - u, t2 - t1, a].map(fmt),
    };
  },
  solution: (params) => {
    const { u, v, t1, t2 } = params;
    return [
      { tex: aligned(`\\Delta v &= ${v} - ${par(u)} = ${v - u}`, `\\Delta t &= ${t2} - ${t1} = ${t2 - t1}`) },
      { tex: `a = \\frac{${v - u}}{${t2 - t1}} = ${fmt(vtA(params))}` },
      { text: 'Final minus initial, always: a velocity that falls gives a negative acceleration.' },
    ];
  },
};

interface VtTilesParams {
  u: number;
  a: number;
  t1: number;
  /** A steady stage after the first, so the graph is a journey. */
  hold: number;
}

/**
 * The first stage of a velocity-time graph written as v = u + at: the
 * intercept and the gradient. Difficulty 2 slows down, sometimes by halves.
 */
const vtTiles: Generator<VtTilesParams> = {
  id: 'kin-vt-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const u = hard ? rng.int(4, 12) : rng.int(1, 8);
      const a = hard ? rng.pick([-3, -2, -1.5, -0.5, 0.5, 1.5, 2.5]) : rng.pick([2, 3, 4]);
      const t1 = rng.int(1, 4);
      const v1 = u + a * t1;
      if (!Number.isInteger(v1) || v1 < 0 || v1 > 14) continue;
      return { u, a, t1, hold: rng.int(1, 3) };
    }
  },
  render: ({ u, a, t1, hold }): Slide => {
    const v1 = u + a * t1;
    const corners: Corner[] = [
      [0, u],
      [t1, v1],
      [t1 + hold, v1],
    ];
    return {
      kind: 'tiles',
      prompt: [
        say(`The graph shows a particle's velocity $v$ in m/s against time $t$ in seconds. Complete the equation for its velocity during the first ${t1} s.`),
        figure(graphSvg(corners, 'A velocity-time graph: a sloping stage, then a steady one')),
      ],
      template: 'v = {0} {1}t',
      bank: tokenBank([`${u}`, signed(a)], [`${v1}`, signed(-a), signed(v1 - u), `${t1}`]),
      answer: [`${u}`, signed(a)],
    };
  },
  solution: ({ u, a, t1 }) => {
    const v1 = u + a * t1;
    return [
      { text: `The line starts at $v = ${u}$ when $t = 0$: that is $u$, the initial velocity.` },
      { tex: `a = \\frac{${v1} - ${u}}{${t1}} = ${fmt(a)}` },
      { tex: `v = ${u} ${signed(a)}t` },
    ];
  },
};

interface SpeedingParams {
  /** Difficulty 1: stated values. */
  v?: number;
  a?: number;
  /** Difficulty 2: a time on a graph. */
  corners?: Corner[];
  at: number;
}

function speedingState(params: SpeedingParams): { v: number; a: number } {
  if (params.corners === undefined) return { v: params.v!, a: params.a! };
  const { corners, at } = params;
  const k = stagesOf(corners).find((j) => corners[j][0] < at && at < corners[j + 1][0])!;
  return { v: through(corners)(at), a: gradientOf(corners, k) };
}

/**
 * Speeding up or slowing down, decided from the signs of v and a: the same
 * sign speeds up, opposite signs slow down. Difficulty 2 reads both off a
 * velocity-time graph, where a flat stage means a steady speed.
 */
const speedingFlow: Generator<SpeedingParams> = {
  id: 'kin-speeding-flow',
  sample: (rng, difficulty) => {
    if (difficulty < 2) return { v: nonZero(rng, 12), a: nonZero(rng, 5), at: rng.int(1, 9) };
    for (;;) {
      const corners = sampleCorners(rng, { ...VT_HARD, stages: 3 });
      const k = rng.pick(stagesOf(corners));
      const at = (corners[k][0] + corners[k + 1][0]) / 2;
      if (Number.isInteger(at) === false && !Number.isInteger(at * 2)) continue;
      if (corners[k + 1][0] - corners[k][0] < 2) continue;
      const v = through(corners)(at);
      if (v === 0 || !isTenth(v)) continue;
      return { corners, at };
    }
  },
  render: (params): Slide => {
    const { v, a } = speedingState(params);
    const key = `${fmt(v)}|${fmt(a)}|${params.at}`;
    const outcome = (vs: number, as: number) =>
      as === 0 ? 'Zero acceleration: its speed is steady.' : vs * as > 0 ? 'The same sign: it is speeding up.' : 'Opposite signs: it is slowing down.';
    const ends = (vs: number) =>
      turned(
        [
          { label: 'Positive', outcome: outcome(vs, 1) },
          { label: 'Negative', outcome: outcome(vs, -1) },
          { label: 'Zero', outcome: outcome(vs, 0) },
        ],
        `${key}${vs}`,
      );
    const prompt: Block[] =
      params.corners === undefined
        ? [say(`At $t = ${params.at}$ s a particle has velocity $${fmt(v)}$ m/s and acceleration $${fmt(a)}$ m/s². Is it speeding up or slowing down?`)]
        : [
            say(`The graph shows a particle's velocity $v$ in m/s against time $t$ in seconds. At $t = ${fmt(params.at)}$, is it speeding up or slowing down?`),
            figure(graphSvg(params.corners, 'A velocity-time graph made of straight stages')),
          ];
    return {
      kind: 'flow',
      prompt,
      subject: `t = ${fmt(params.at)}`,
      steps: [
        {
          id: 'v',
          ask: 'Is the velocity positive or negative?',
          branches: turned(
            [
              { label: 'Positive', to: 'ap' },
              { label: 'Negative', to: 'an' },
            ],
            key,
          ),
        },
        { id: 'ap', ask: 'Is the acceleration positive, negative or zero?', branches: ends(1) },
        { id: 'an', ask: 'Is the acceleration positive, negative or zero?', branches: ends(-1) },
      ],
      answer: [signWord(v), signWord(a)],
    };
  },
  solution: (params) => {
    const { v, a } = speedingState(params);
    const steps: SolutionStep[] = [];
    if (params.corners !== undefined) {
      steps.push({ text: `At $t = ${fmt(params.at)}$ the graph is at $v = ${fmt(v)}$, on a stage with gradient $${fmt(a)}$.` });
    }
    steps.push({
      text:
        a === 0
          ? 'A flat stage: no acceleration, so the speed is not changing.'
          : v * a > 0
            ? `$v$ and $a$ are both ${v > 0 ? 'positive' : 'negative'}: the acceleration pushes the way it is moving, so it speeds up.`
            : `$v$ is ${v > 0 ? 'positive' : 'negative'} but $a$ is ${a > 0 ? 'positive' : 'negative'}: the acceleration pushes against the motion, so it slows down.`,
    });
    return steps;
  },
};

/* ================================================================
 * Level 1, lesson 5: the area under a velocity-time graph
 * ================================================================ */

const areaOf = (corners: Corner[]): number => stagesOf(corners).reduce((sum, k) => sum + stageArea(corners, k), 0);

/**
 * The distance travelled as the whole shaded area under a velocity-time graph
 * that stays above the axis. Difficulty 2 has four stages.
 */
const distArea: Generator<{ corners: Corner[] }> = {
  id: 'kin-dist-area',
  sample: (rng, difficulty) => ({
    corners: sampleCorners(rng, { stages: difficulty > 1 ? 4 : 3, lo: 0, hi: 10, halves: false, maxT: 10 }, (c) => areaOf(c) > 0),
  }),
  choices: ({ corners }) => {
    const area = areaOf(corners);
    const noHalves = stagesOf(corners).reduce((sum, k) => sum + corners[k + 1][1] * (corners[k + 1][0] - corners[k][0]), 0);
    const box = Math.max(...corners.map(([, v]) => v)) * endOf(corners);
    return numChoices(area, [noHalves, box, area * 2]);
  },
  render: ({ corners }): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `A particle's velocity-time graph joins ${cornersText(corners)} with straight lines, $v$ in m/s and $t$ in seconds. Find the distance it travels in these ${endOf(corners)} seconds.`,
      ),
      figure(graphSvg(corners, 'A velocity-time graph with the area under it shaded', { from: 0, to: endOf(corners) })),
    ],
    lead: '\\text{distance} =',
    keypad: WORKING_KEYS,
    answer: fmt(areaOf(corners)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ corners }) => [
    { text: 'The distance is the area under the graph. Split it at each corner into trapezia (or triangles, where a side is zero), one area for each stage in turn:' },
    {
      tex: aligned(
        ...stagesOf(corners).map(
          (k) =>
            `A_${k + 1} &= \\tfrac{1}{2}(${corners[k][1]} + ${corners[k + 1][1]}) \\times ${corners[k + 1][0] - corners[k][0]} = ${fmt(stageArea(corners, k))}`,
        ),
      ),
    },
    { tex: `\\text{total} = ${stagesOf(corners).map((k) => fmt(stageArea(corners, k))).join(' + ')} = ${fmt(areaOf(corners))}` },
  ],
};

interface TrapParams {
  subject: number;
  u: number;
  v: number;
  t1: number;
  h: number;
}

const trapArea = ({ u, v, h }: TrapParams): number => ((u + v) * h) / 2;

/**
 * One trapezium, one operation at a time: the parallel sides, times the
 * width, halved. Difficulty 2 slows down, and the half can land on a tenth.
 */
const trapSteps: Generator<TrapParams> = {
  id: 'kin-trap-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const u = rng.int(hard ? 4 : 0, hard ? 18 : 10);
      const v = rng.int(hard ? 0 : 2, hard ? 14 : 16);
      const h = rng.int(2, hard ? 9 : 6);
      if (hard ? v >= u : v <= u) continue;
      const params = { subject: rng.int(0, VEHICLES.length - 1), u, v, t1: rng.int(0, 10), h };
      if (!hard && !Number.isInteger(trapArea(params))) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { u, v, t1, h } = params;
    const sum = u + v;
    const product = sum * h;
    const area = trapArea(params);
    return {
      kind: 'steps',
      prompt: [
        say(
          `Between $t = ${t1}$ and $t = ${t1 + h}$ seconds, ${VEHICLES[params.subject].toLowerCase()}'s velocity changes steadily from $${u}$ m/s to $${v}$ m/s. The distance it covers is the trapezium under that stage. Tap the part to work out next, then choose its value.`,
        ),
      ],
      start: ['(', `${u}`, '+', `${v}`, ')', '\\times', `${h}`, '\\div', '2'],
      reductions: [
        { span: [0, 5], operator: 2, value: fmt(sum), bank: stepBank(fmt(sum), fmt(Math.abs(v - u)), fmt(u * v), fmt(sum + 1)) },
        { span: [0, 3], operator: 1, value: fmt(product), bank: stepBank(fmt(product), fmt(sum + h), fmt(product + h), fmt(product - sum)) },
        { span: [0, 3], operator: 1, value: fmt(area), bank: stepBank(fmt(area), fmt(product * 2), fmt(area + 1), fmt(product - 2)) },
      ],
    };
  },
  solution: (params) => {
    const { u, v, h } = params;
    return [
      { text: `The stage is a trapezium with parallel sides $${u}$ and $${v}$ (the velocities) and width $${h}$ (the time).` },
      { tex: `\\tfrac{1}{2}(${u} + ${v}) \\times ${h} = \\tfrac{1}{2} \\times ${u + v} \\times ${h} = ${fmt(trapArea(params))}` },
    ];
  },
};

interface StagesTreeParams {
  subject: number;
  u: number;
  V: number;
  t1: number;
  t2: number;
  t3: number;
}

const stagesCorners = ({ u, V, t1, t2, t3 }: StagesTreeParams): Corner[] => [
  [0, u],
  [t1, V],
  [t1 + t2, V],
  [t1 + t2 + t3, 0],
];

/**
 * Speed up, cruise, slow to a stop: three areas and their total. Difficulty 2
 * starts already moving, so the first area is a trapezium.
 */
const stagesTree: Generator<StagesTreeParams> = {
  id: 'kin-stages-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const V = rng.int(3, 10);
      const u = difficulty > 1 ? rng.int(1, V - 1) : 0;
      const params = { subject: rng.int(0, VEHICLES.length - 1), u, V, t1: rng.int(1, 4), t2: rng.int(1, 4), t3: rng.int(1, 4) };
      if (params.t1 + params.t2 + params.t3 > 10) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const corners = stagesCorners(params);
    const areas = stagesOf(corners).map((k) => stageArea(corners, k));
    const total = areas.reduce((a, b) => a + b, 0);
    const T = endOf(corners);
    return {
      kind: 'tree',
      prompt: [
        say(
          `${VEHICLES[params.subject]} speeds up, travels steadily, then slows to a stop. Its velocity-time graph joins ${cornersText(corners)}, $v$ in m/s and $t$ in seconds. Fill in the area under each stage, then the total distance.`,
        ),
        figure(graphSvg(corners, 'A velocity-time graph in three stages with the area under it shaded', { from: 0, to: T })),
      ],
      expression: '\\text{distance} = A_1 + A_2 + A_3',
      nodes: [
        { id: 'A1', from: [] },
        { id: 'A2', from: [] },
        { id: 'A3', from: [] },
        { id: 'S', from: ['A1', 'A2', 'A3'] },
      ],
      bank: valueBank([...areas, total], [params.V * params.t1, params.V * params.t3, params.V * T, total * 2]),
      answer: [...areas, total].map(fmt),
    };
  },
  solution: (params) => {
    const { u, V, t1, t2, t3 } = params;
    const corners = stagesCorners(params);
    const areas = stagesOf(corners).map((k) => stageArea(corners, k));
    return [
      {
        tex: aligned(
          u === 0 ? `A_1 &= \\tfrac{1}{2} \\times ${t1} \\times ${V} = ${fmt(areas[0])}` : `A_1 &= \\tfrac{1}{2}(${u} + ${V}) \\times ${t1} = ${fmt(areas[0])}`,
          `A_2 &= ${t2} \\times ${V} = ${fmt(areas[1])}`,
          `A_3 &= \\tfrac{1}{2} \\times ${t3} \\times ${V} = ${fmt(areas[2])}`,
        ),
      },
      { tex: `\\text{distance} = ${areas.map(fmt).join(' + ')} = ${fmt(areas.reduce((a, b) => a + b, 0))}` },
    ];
  },
};

interface NetParams {
  corners: Corner[];
  /** Where v changes sign. */
  cross: number;
  ask: 'distance' | 'displacement';
}

function netAreas({ corners, cross }: NetParams): { above: number; below: number } {
  let above = 0;
  let below = 0;
  for (const k of stagesOf(corners)) {
    const area = stageArea(corners, k);
    if (corners[k + 1][0] <= cross) above += area;
    else below -= area;
  }
  return { above, below };
}

/**
 * A velocity that turns negative: the area below the axis is motion the other
 * way. Distance adds the two areas; displacement takes one from the other.
 * Only the area above the axis is shaded, one sign at a time.
 */
const netDisp: Generator<NetParams> = {
  id: 'kin-net-disp',
  sample: (rng, difficulty) => {
    const ask = rng.pick(['distance', 'displacement'] as const);
    for (;;) {
      const p = rng.int(2, 8);
      const q = rng.int(1, 6);
      let corners: Corner[];
      let cross: number;
      if (difficulty < 2) {
        const c = rng.int(1, 5);
        cross = c;
        corners = [
          [0, p],
          [c, 0],
          [c + rng.int(1, 4), -q],
        ];
      } else {
        const c1 = rng.int(1, 3);
        const c2 = c1 + rng.int(1, 3);
        const c3 = c2 + rng.int(1, 3);
        cross = c2;
        corners = [
          [0, 0],
          [c1, p],
          [c2, 0],
          [c3, -q],
          [c3 + rng.int(1, 3), -q],
        ];
      }
      const params = { corners, cross, ask };
      const { above, below } = netAreas(params);
      if (endOf(corners) > 10 || above === below) continue;
      return params;
    }
  },
  choices: (params) => {
    const { above, below } = netAreas(params);
    const right = params.ask === 'distance' ? above + below : above - below;
    return numChoices(right, [params.ask === 'distance' ? above - below : above + below, above, -right, below]);
  },
  render: (params): Slide => {
    const { corners, cross, ask } = params;
    const { above, below } = netAreas(params);
    return {
      kind: 'expression',
      prompt: [
        say(
          `A particle's velocity-time graph joins ${cornersText(corners)} with straight lines, $v$ in m/s and $t$ in seconds. The area above the axis is shaded. Find ${ask === 'distance' ? 'the total distance it travels' : 'its displacement from where it started'} over these ${endOf(corners)} seconds.`,
        ),
        figure(graphSvg(corners, 'A velocity-time graph that crosses the axis, with the area above it shaded', { from: 0, to: cross })),
      ],
      lead: ask === 'distance' ? '\\text{distance} =' : 's =',
      keypad: WORKING_KEYS,
      answer: fmt(ask === 'distance' ? above + below : above - below),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { cross, ask } = params;
    const { above, below } = netAreas(params);
    return [
      { text: `Up to $t = ${cross}$ the velocity is positive: the shaded area, $${fmt(above)}$, is distance moved the positive way.` },
      { text: `After that the velocity is negative: the area between the graph and the axis, $${fmt(below)}$, is distance moved back.` },
      ask === 'distance'
        ? { tex: `\\text{distance} = ${fmt(above)} + ${fmt(below)} = ${fmt(above + below)}` }
        : { tex: `s = ${fmt(above)} - ${fmt(below)} = ${fmt(above - below)}` },
    ];
  },
};

/* ================================================================
 * Level 2: constant acceleration
 * ================================================================ */

/** The five suvat quantities of one motion, all consistent. */
export interface Suvat {
  u: number;
  v: number;
  a: number;
  t: number;
  s: number;
}

export type SuvatVar = keyof Suvat;

/**
 * A motion from whole u, a and t, paired so s is whole: v = u + at and
 * s = ut + at^2/2. At difficulty 1 it speeds up; at difficulty 2 it may slow
 * down, possibly to rest, but never turns back, so a speed and a distance
 * stay what they say.
 */
function sampleSuvat(rng: Rng, difficulty: number): Suvat {
  for (;;) {
    const hard = difficulty > 1;
    const u = rng.int(0, hard ? 20 : 12);
    const a = hard ? nonZero(rng, 5) : rng.int(1, 5);
    const t = rng.int(2, 10);
    const v = u + a * t;
    const s = u * t + (a * t * t) / 2;
    if (!Number.isInteger(s) || v < 0 || s <= 0 || v > 40 || s > 400) continue;
    return { u, v, a, t, s };
  }
}

/* ================================================================
 * Level 2, lesson 1: v = u + at and s = ut + at^2/2
 * ================================================================ */

interface VuatParams extends Suvat {
  subject: number;
  find: 'v' | 'a' | 't' | 'u';
}

function sampleVuat(rng: Rng, difficulty: number, finds: VuatParams['find'][]): VuatParams {
  for (;;) {
    const motion = sampleSuvat(rng, difficulty);
    const find = rng.pick(finds);
    if (find === 'u' && motion.u === 0) continue;
    if (motion.v === motion.u) continue;
    return { ...motion, subject: rng.int(0, VEHICLES.length - 1), find };
  }
}

/** The facts of a v = u + at question, less the one asked for. */
function vuatFacts({ u, v, a, t, find }: VuatParams): string {
  const facts: string[] = [];
  if (find !== 'u') facts.push(u === 0 ? 'starts from rest' : `passes a post at ${u} m/s`);
  if (find !== 'a') facts.push(a < 0 ? `decelerates steadily at ${-a} m/s²` : `accelerates steadily at ${a} m/s²`);
  if (find !== 't') facts.push(`keeps this up for ${t} s`);
  if (find !== 'v') facts.push(v === 0 ? 'comes to rest' : `reaches ${v} m/s`);
  return listed(facts);
}

const VUAT_ASK = {
  v: 'Find its final velocity, in m/s.',
  a: 'Find its acceleration, in m/s².',
  t: 'Find the time this takes, in seconds.',
  u: 'Find its velocity at the post, in m/s.',
} as const;

/**
 * The values dropped into v = u + at, as tiles. At difficulty 2 the equation
 * is rearranged first, for a or for t.
 */
const vuatTiles: Generator<VuatParams> = {
  id: 'kin-vuat-tiles',
  sample: (rng, difficulty) => sampleVuat(rng, difficulty, difficulty > 1 ? ['a', 't'] : ['v']),
  render: (params): Slide => {
    const { u, v, a, t, s, find } = params;
    const prompt = [say(`${VEHICLES[params.subject]} ${vuatFacts(params)}, covering ${s} m. Fill in the values to find ${find === 'v' ? 'its final velocity' : find === 'a' ? 'its acceleration' : 'the time taken'}.`)];
    if (find === 'v') {
      const answer = [`${u}`, par(a), `${t}`];
      return { kind: 'tiles', prompt, template: 'v = {0} + {1} \\times {2}', bank: tokenBank(answer, [`${s}`, par(-a), `${t + 1}`, `${u + 1}`]), answer };
    }
    if (find === 'a') {
      const answer = [`${v}`, par(u), `${t}`];
      return { kind: 'tiles', prompt, template: 'a = ({0} - {1}) \\div {2}', bank: tokenBank(answer, [`${s}`, `${u + v}`, `${t * 2}`, `${t + 1}`, `${v + 1}`]), answer };
    }
    const answer = [`${v}`, `${u}`, par(a)];
    return { kind: 'tiles', prompt, template: 't = ({0} - {1}) \\div {2}', bank: tokenBank(answer, [`${s}`, par(-a), `${u + v}`, `${v + 1}`]), answer };
  },
  solution: ({ u, v, a, t, find }) => {
    if (find === 'v') return [{ text: 'Put the values straight into $v = u + at$:' }, { tex: `v = ${u} + ${par(a)} \\times ${t} = ${v}` }, { text: 'The distance is not needed: this equation has no $s$ in it.' }];
    if (find === 'a') return [{ text: 'Rearrange $v = u + at$ for $a$: take $u$ away, then divide by $t$.' }, { tex: `a = \\frac{v - u}{t} = \\frac{${v} - ${par(u)}}{${t}} = ${fmt(a)}` }];
    return [{ text: 'Rearrange $v = u + at$ for $t$: take $u$ away, then divide by $a$.' }, { tex: `t = \\frac{v - u}{a} = \\frac{${v} - ${u}}{${par(a)}} = ${t}` }];
  },
};

/**
 * v = u + at worked through to a number. Difficulty 2 asks for a, t or u.
 */
const vuat: Generator<VuatParams> = {
  id: 'kin-vuat',
  sample: (rng, difficulty) => sampleVuat(rng, difficulty, difficulty > 1 ? ['a', 't', 'u'] : ['v']),
  choices: ({ u, v, a, t, find }) => {
    switch (find) {
      case 'v':
        return numChoices(v, [u - a * t, u + a, a * t, u * t + a]);
      case 'a':
        return numChoices(a, [-a, (v + u) / t, (v - u) * t, v / t]);
      case 't':
        return numChoices(t, [(v + u) / a, (u - v) / a, (v - u) * a, v / a]);
      case 'u':
        return numChoices(u, [v + a * t, v - a, -u, a * t]);
    }
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`${VEHICLES[params.subject]} ${vuatFacts(params)}.`), say(VUAT_ASK[params.find])],
    lead: `${params.find} =`,
    keypad: WORKING_KEYS,
    answer: fmt(params[params.find]),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ u, v, a, t, find }) => {
    const lines: Record<VuatParams['find'], string> = {
      v: `v = u + at = ${u} + ${par(a)} \\times ${t} = ${v}`,
      a: `a = \\frac{v - u}{t} = \\frac{${v} - ${u}}{${t}} = ${fmt(a)}`,
      t: `t = \\frac{v - u}{a} = \\frac{${v} - ${u}}{${par(a)}} = ${t}`,
      u: `u = v - at = ${v} - ${par(a)} \\times ${t} = ${u}`,
    };
    return [
      { text: 'Nothing about distance is given or asked, so $v = u + at$ is the equation.' },
      { tex: lines[find] },
      ...(a < 0 ? [{ text: 'Slowing down makes the acceleration negative.' }] : []),
    ];
  },
};

interface SuatParams extends Suvat {
  subject: number;
}

/** A motion for s = ut + at^2/2 with a slowing but never stopping at difficulty 2. */
function sampleSuat(rng: Rng, difficulty: number): SuatParams {
  for (;;) {
    const motion = sampleSuvat(rng, difficulty);
    if (difficulty > 1 ? motion.a > 0 || motion.u === 0 : motion.u > 12) continue;
    if (motion.s > 250) continue;
    return { ...motion, subject: rng.int(0, VEHICLES.length - 1) };
  }
}

const suatPrompt = ({ u, a, t, subject }: SuatParams): string =>
  `${VEHICLES[subject]} ${u === 0 ? 'starts from rest and ' : `passes a post at ${u} m/s and `}${a < 0 ? `decelerates at ${-a} m/s²` : `accelerates at ${a} m/s²`} for ${t} s.`;

/**
 * s = ut + at^2/2 one operation at a time: the square, the two products, the
 * sum. At difficulty 2 it decelerates, so the half term is taken away.
 */
const suatSteps: Generator<SuatParams> = {
  id: 'kin-suat-steps',
  sample: sampleSuat,
  render: (params): Slide => {
    const { u, a, t, s } = params;
    const ut = u * t;
    const t2 = t * t;
    const half = (Math.abs(a) * t2) / 2;
    return {
      kind: 'steps',
      prompt: [
        say(`${suatPrompt(params)} Find how far it goes, using $s = ut + \\tfrac{1}{2}at^{2}$. Tap the part to work out next, then choose its value.`),
      ],
      start: [`${u}`, '\\times', `${t}`, a < 0 ? '-' : '+', '\\tfrac{1}{2}', '\\times', `${Math.abs(a)}`, '\\times', `${t}^2`],
      reductions: [
        { span: [8, 9], value: fmt(t2), bank: stepBank(fmt(t2), fmt(2 * t), fmt(t + 2), fmt(t2 + 1)) },
        { span: [0, 3], operator: 1, value: fmt(ut), bank: stepBank(fmt(ut), fmt(u + t), fmt(ut + t), fmt(ut + 1)) },
        { span: [2, 7], operator: 3, value: fmt(half), bank: stepBank(fmt(half), fmt(half * 2), fmt((Math.abs(a) * t) / 2), fmt(half + 1)) },
        { span: [0, 3], operator: 1, value: fmt(s), bank: stepBank(fmt(s), fmt(a < 0 ? ut + half : ut - half), fmt(ut), fmt(s + 1)) },
      ],
    };
  },
  solution: ({ u, a, t, s }) => [
    { tex: `s = ${u} \\times ${t} + \\tfrac{1}{2} \\times ${par(a)} \\times ${t}^{2}` },
    { tex: `= ${u * t} ${signed((a * t * t) / 2)} = ${s}` },
    { text: 'Square $t$ before multiplying by the half and by $a$.' },
  ],
};

/**
 * The same equation as a tree: ut and t^2 on top, the half term under t^2,
 * s at the bottom. At difficulty 2 the half term is negative.
 */
const suatTree: Generator<SuatParams> = {
  id: 'kin-suat-tree',
  sample: sampleSuat,
  render: (params): Slide => {
    const { u, a, t, s } = params;
    const ut = u * t;
    const t2 = t * t;
    const half = (a * t2) / 2;
    return {
      kind: 'tree',
      prompt: [say(`${suatPrompt(params)} Fill in $ut$ and $t^{2}$, then $\\tfrac{1}{2}at^{2}$, then the distance $s$.`)],
      expression: 's = ut + \\tfrac{1}{2}at^{2}',
      nodes: [
        { id: 'ut', from: [] },
        { id: 't2', from: [] },
        { id: 'h', from: ['t2'] },
        { id: 's', from: ['ut', 'h'] },
      ],
      bank: valueBank([ut, t2, half, s], [2 * t, a * t2, -half, ut - half, a * t]),
      answer: [ut, t2, half, s].map(fmt),
    };
  },
  solution: ({ u, a, t, s }) => [
    { tex: aligned(`ut &= ${u} \\times ${t} = ${u * t}`, `t^{2} &= ${t * t}`, `\\tfrac{1}{2}at^{2} &= \\tfrac{1}{2} \\times ${par(a)} \\times ${t * t} = ${fmt((a * t * t) / 2)}`) },
    { tex: `s = ${u * t} ${signed((a * t * t) / 2)} = ${s}` },
  ],
};

interface SuatFindParams extends SuatParams {
  find: 's' | 'a' | 'u';
}

/**
 * s = ut + at^2/2 to a number. Difficulty 2 runs it backwards: the distance
 * is given and a or u is asked.
 */
const suatFind: Generator<SuatFindParams> = {
  id: 'kin-suat-find',
  sample: (rng, difficulty) => {
    for (;;) {
      const motion = sampleSuat(rng, difficulty === 1 ? 1 : rng.pick([1, 2]));
      const find = difficulty > 1 ? rng.pick(['a', 'u'] as const) : 's';
      if (find === 'u' && motion.u === 0) continue;
      return { ...motion, find };
    }
  },
  choices: ({ u, a, t, s, find }) => {
    if (find === 's') return numChoices(s, [u * t + a * t, u * t + a * t * t, (u + a * t) * t]);
    if (find === 'a') return numChoices(a, [(s - u * t) / (t * t), (2 * s) / (t * t), -a]);
    return numChoices(u, [s / t, (s + (a * t * t) / 2) / t, u + a]);
  },
  render: (params): Slide => {
    const { u, a, t, s, find } = params;
    const who = VEHICLES[params.subject];
    const text =
      find === 's'
        ? `${suatPrompt(params)} How far does it travel in that time, in metres?`
        : find === 'a'
          ? `${who} ${u === 0 ? 'starts from rest' : `passes a post at ${u} m/s`} and covers ${s} m in the next ${t} s with constant acceleration. Find the acceleration, in m/s².`
          : `${who} passes a post and ${a < 0 ? `decelerates at ${-a} m/s²` : `accelerates at ${a} m/s²`}, covering ${s} m in the next ${t} s. Find its speed at the post, in m/s.`;
    return {
      kind: 'expression',
      prompt: [say(text)],
      lead: `${find} =`,
      keypad: WORKING_KEYS,
      answer: fmt(params[find]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ u, a, t, s, find }) => {
    const sub = `${s} = ${u === 0 && find !== 'u' ? '0' : find === 'u' ? 'u' : u} \\times ${t} + \\tfrac{1}{2} \\times ${find === 'a' ? 'a' : par(a)} \\times ${t}^{2}`;
    if (find === 's') return [{ tex: `s = ${u} \\times ${t} + \\tfrac{1}{2} \\times ${par(a)} \\times ${t}^{2} = ${u * t} ${signed((a * t * t) / 2)} = ${s}` }];
    if (find === 'a') {
      return [
        { tex: sub },
        { tex: `${s} = ${u * t} + ${(t * t) / 2}a` },
        { tex: `a = \\frac{${s} - ${u * t}}{${(t * t) / 2}} = ${a}` },
      ];
    }
    return [
      { tex: sub },
      { tex: `${s} = ${t}u ${signed((a * t * t) / 2)}` },
      { tex: `u = \\frac{${s} ${signed((-a * t * t) / 2)}}{${t}} = ${u}` },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 2: v^2 = u^2 + 2as and s = (u + v)t/2
 * ================================================================ */

interface V2Params {
  subject: number;
  u: number;
  v: number;
  a: number;
  s: number;
  find: 'v' | 's' | 'a';
}

/**
 * A motion for v^2 = u^2 + 2as: whole u and v, a whole a, and s whatever
 * (v^2 - u^2)/2a comes to, kept only when it is whole.
 */
function sampleV2(rng: Rng, difficulty: number, finds: V2Params['find'][]): V2Params {
  for (;;) {
    const hard = difficulty > 1;
    const u = rng.int(0, 20);
    const v = rng.int(0, 24);
    const a = hard ? nonZero(rng, 6) : rng.int(1, 6);
    if (u === v || Math.sign(v - u) !== Math.sign(a)) continue;
    const s = (v * v - u * u) / (2 * a);
    if (!Number.isInteger(s) || s > 300) continue;
    const find = rng.pick(finds);
    if (find === 'a' && !isTenth((v * v - u * u) / (2 * s))) continue;
    return { subject: rng.int(0, VEHICLES.length - 1), u, v, a, s, find };
  }
}

function v2Facts({ u, v, a, s, find }: V2Params): string {
  const opening = u === 0 ? 'starts from rest.' : `is moving at ${u} m/s.`;
  const pushes = a < 0 ? `brakes at ${-a} m/s²` : `accelerates at ${a} m/s²`;
  const ends = v === 0 ? 'comes to rest' : `reaches ${v} m/s`;
  if (find === 'v') return `${opening} It ${pushes} over the next ${s} m.`;
  if (find === 's') return `${opening} It ${pushes} until it ${ends}.`;
  return `${opening} Over the next ${s} m it steadily ${v === 0 ? 'comes to rest' : v > u ? `speeds up to ${v} m/s` : `slows to ${v} m/s`}.`;
}

/**
 * v^2 = u^2 + 2as to a number: v at difficulty 1, s or a at difficulty 2,
 * including stopping distances.
 */
const v2: Generator<V2Params> = {
  id: 'kin-v2',
  sample: (rng, difficulty) => sampleV2(rng, difficulty, difficulty > 1 ? ['s', 'a'] : ['v']),
  choices: ({ u, v, a, s, find }) => {
    if (find === 'v') return numChoices(v, [v * v, u + 2 * a * s, u + a * s]);
    if (find === 's') return numChoices(s, [(v * v - u * u) / a, (v - u) / (2 * a), -s]);
    return numChoices(a, [(v * v - u * u) / s, (v - u) / (2 * s), -a]);
  },
  render: (params): Slide => {
    const ask = { v: 'Find its speed at the end, in m/s.', s: 'Find the distance this takes, in metres.', a: 'Find its acceleration, in m/s².' }[params.find];
    return {
      kind: 'expression',
      prompt: [say(`${VEHICLES[params.subject]} ${v2Facts(params)} ${ask}`)],
      lead: `${params.find} =`,
      keypad: WORKING_KEYS,
      answer: fmt(params[params.find]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ u, v, a, s, find }) => {
    const intro = { text: 'No time is given or asked, so use $v^{2} = u^{2} + 2as$.' };
    if (find === 'v') return [intro, { tex: `v^{2} = ${u}^{2} + 2 \\times ${a} \\times ${s} = ${u * u} + ${2 * a * s} = ${v * v}` }, { tex: `v = \\sqrt{${v * v}} = ${v}` }];
    if (find === 's') return [intro, { tex: `${v}^{2} = ${u}^{2} + 2 \\times ${par(a)} \\times s` }, { tex: `s = \\frac{${v * v} - ${u * u}}{${2 * a}} = ${s}` }];
    return [intro, { tex: `${v}^{2} = ${u}^{2} + 2 \\times a \\times ${s}` }, { tex: `a = \\frac{${v * v} - ${u * u}}{${2 * s}} = ${fmt(a)}` }];
  },
};

/**
 * v^2 = u^2 + 2as as a tree: u^2 and 2as, their sum v^2, then v. At
 * difficulty 2 it is braking, so 2as is negative.
 */
const vsqTree: Generator<V2Params> = {
  id: 'kin-vsq-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleV2(rng, difficulty, ['v']);
      if (difficulty > 1 ? params.a > 0 || params.v === 0 : false) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { u, v, a, s } = params;
    return {
      kind: 'tree',
      prompt: [say(`${VEHICLES[params.subject]} ${v2Facts({ ...params, find: 'v' })} Fill in $u^{2}$ and $2as$, then $v^{2}$, then its speed $v$ at the end.`)],
      expression: 'v^{2} = u^{2} + 2as',
      nodes: [
        { id: 'u2', from: [] },
        { id: 'as', from: [] },
        { id: 'v2', from: ['u2', 'as'] },
        { id: 'v', from: ['v2'] },
      ],
      bank: valueBank([u * u, 2 * a * s, v * v, v], [a * s, u + 2 * a * s, v * v + 1, 2 * v, -2 * a * s]),
      answer: [u * u, 2 * a * s, v * v, v].map(fmt),
    };
  },
  solution: ({ u, v, a, s }) => [
    { tex: aligned(`u^{2} &= ${u}^{2} = ${u * u}`, `2as &= 2 \\times ${par(a)} \\times ${s} = ${2 * a * s}`, `v^{2} &= ${u * u} ${signed(2 * a * s)} = ${v * v}`) },
    { tex: `v = \\sqrt{${v * v}} = ${v}` },
  ],
};

interface UvtParams extends Suvat {
  subject: number;
  find: 's' | 't' | 'u' | 'v';
}

function sampleUvt(rng: Rng, difficulty: number, finds: UvtParams['find'][]): UvtParams {
  for (;;) {
    const motion = sampleSuvat(rng, difficulty);
    const find = rng.pick(finds);
    if (find === 'u' && motion.u === 0) continue;
    if (find === 'v' && motion.v === 0) continue;
    return { ...motion, subject: rng.int(0, VEHICLES.length - 1), find };
  }
}

function uvtFacts({ u, v, t, s, find }: UvtParams): string {
  const facts: string[] = [];
  if (find !== 'u') facts.push(u === 0 ? 'starts from rest' : `passes a post at ${u} m/s`);
  if (find !== 'v') facts.push(v === 0 ? 'steadily comes to rest' : `steadily ${v > u ? 'speeds up' : 'slows'} to ${v} m/s`);
  if (find !== 't') facts.push(`over ${t} s`);
  if (find !== 's') facts.push(`covering ${s} m`);
  return facts.join(', ');
}

/**
 * s = (u + v)t/2 with the values dropped in, the half kept as a tile. At
 * difficulty 2 it is rearranged for t.
 */
const uvtTiles: Generator<UvtParams> = {
  id: 'kin-uvt-tiles',
  sample: (rng, difficulty) => sampleUvt(rng, difficulty, [difficulty > 1 ? 't' : 's']),
  render: (params): Slide => {
    const { u, v, a, t, s, find } = params;
    const who = VEHICLES[params.subject];
    if (find === 's') {
      const answer = ['\\tfrac{1}{2}', `${u} + ${v}`, `${t}`];
      return {
        kind: 'tiles',
        prompt: [say(`${who} ${uvtFacts(params)}, accelerating at ${a} m/s². Fill in the values to find how far it goes.`)],
        template: 's = {0}({1}) \\times {2}',
        bank: tokenBank(answer, ['2', `${v} - ${u}`, `${Math.abs(a)}`]),
        answer,
      };
    }
    const answer = [`2 \\times ${s}`, `${u} + ${v}`];
    return {
      kind: 'tiles',
      prompt: [say(`${who} ${uvtFacts(params)}. Fill in the values to find the time this takes, from $s = \\tfrac{1}{2}(u + v)t$.`)],
      template: 't = {0} \\div ({1})',
      bank: tokenBank(answer, [`${s}`, `${s} \\div 2`, `${Math.max(u, v)} - ${Math.min(u, v)}`]),
      answer,
    };
  },
  solution: ({ u, v, t, s, find }) => {
    if (find === 's') {
      return [
        { text: 'The distance is the average of the two velocities times the time, so the acceleration is not needed:' },
        { tex: `s = \\tfrac{1}{2}(${u} + ${v}) \\times ${t} = ${s}` },
      ];
    }
    return [
      { text: 'Rearrange $s = \\tfrac{1}{2}(u + v)t$: double both sides, then divide by $u + v$.' },
      { tex: `t = \\frac{2s}{u + v} = \\frac{2 \\times ${s}}{${u} + ${v}} = ${t}` },
    ];
  },
};

/**
 * s = (u + v)t/2 to a number. Difficulty 2 asks for t, u or v instead.
 */
const uvt: Generator<UvtParams> = {
  id: 'kin-uvt',
  sample: (rng, difficulty) => sampleUvt(rng, difficulty, difficulty > 1 ? ['t', 'u', 'v'] : ['s']),
  choices: ({ u, v, t, s, find }) => {
    switch (find) {
      case 's':
        return numChoices(s, [(u + v) * t, ((v - u) * t) / 2, u + (v * t) / 2]);
      case 't':
        return numChoices(t, [s / (u + v), (2 * s) / Math.abs(v - u), s / 2]);
      case 'u':
        return numChoices(u, [s / t - v, (2 * s) / t, (2 * s) / t + v]);
      case 'v':
        return numChoices(v, [s / t - u, (2 * s) / t, (2 * s) / t + u]);
    }
  },
  render: (params): Slide => {
    const ask = {
      s: 'Find how far it goes, in metres.',
      t: 'Find the time this takes, in seconds.',
      u: 'Find its speed at the post, in m/s.',
      v: 'Find its speed at the end, in m/s.',
    }[params.find];
    return {
      kind: 'expression',
      prompt: [say(`${VEHICLES[params.subject]} ${uvtFacts(params)}. ${ask}`)],
      lead: `${params.find} =`,
      keypad: WORKING_KEYS,
      answer: fmt(params[params.find]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ u, v, t, s, find }) => {
    const intro = { text: 'The acceleration is not given or asked, so use $s = \\tfrac{1}{2}(u + v)t$.' };
    switch (find) {
      case 's':
        return [intro, { tex: `s = \\tfrac{1}{2}(${u} + ${v}) \\times ${t} = ${s}` }];
      case 't':
        return [intro, { tex: `t = \\frac{2s}{u + v} = \\frac{${2 * s}}{${u + v}} = ${t}` }];
      case 'u':
        return [intro, { tex: `u = \\frac{2s}{t} - v = \\frac{${2 * s}}{${t}} - ${v} = ${u}` }];
      case 'v':
        return [intro, { tex: `v = \\frac{2s}{t} - u = \\frac{${2 * s}}{${t}} - ${u} = ${v}` }];
    }
  },
};

/* ================================================================
 * Level 2, lesson 3: choosing the equation
 * ================================================================ */

/** Each equation, keyed by the quantity it leaves out. */
const EQUATIONS: Record<'s' | 'v' | 't' | 'a', string> = {
  s: 'v = u + at',
  v: 's = ut + \\tfrac{1}{2}at^{2}',
  t: 'v^{2} = u^{2} + 2as',
  a: 's = \\tfrac{1}{2}(u + v)t',
};

/** Leaves out u: never the right choice here, since u is always given or asked. */
const WITHOUT_U = 's = vt - \\tfrac{1}{2}at^{2}';

export interface Scenario extends Suvat {
  subject: number;
  missing: 's' | 'v' | 't' | 'a';
  asked: SuvatVar;
}

export const scenarioGiven = ({ missing, asked }: Pick<Scenario, 'missing' | 'asked'>): SuvatVar[] =>
  (['u', 'v', 'a', 't', 's'] as const).filter((q) => q !== missing && q !== asked);

/**
 * A suvat problem: three quantities given, one asked, one playing no part.
 * Never t asked with v missing, which would need the quadratic formula, and
 * never a quantity asked that is zero by the wording.
 */
function sampleScenario(rng: Rng, difficulty: number): Scenario {
  for (;;) {
    const motion = sampleSuvat(rng, difficulty);
    const missing = rng.pick(['s', 'v', 't', 'a'] as const);
    const asked = rng.pick((['u', 'v', 'a', 't', 's'] as const).filter((q) => q !== missing && (difficulty > 1 || q !== 'u')));
    if (asked === 't' && missing === 'v') continue;
    if ((asked === 'u' && motion.u === 0) || (asked === 'v' && motion.v === 0)) continue;
    return { ...motion, subject: rng.int(0, VEHICLES.length - 1), missing, asked };
  }
}

const FACT: Record<SuvatVar, (value: number) => string> = {
  u: (x) => (x === 0 ? 'It starts from rest.' : `It starts at ${x} m/s.`),
  v: (x) => (x === 0 ? 'It comes to rest.' : `It ends at ${x} m/s.`),
  a: (x) => (x < 0 ? `It decelerates at ${-x} m/s².` : `It accelerates at ${x} m/s².`),
  t: (x) => `This takes ${x} s.`,
  s: (x) => `It covers ${x} m.`,
};

const ASKED: Record<SuvatVar, string> = {
  u: 'Find its starting speed.',
  v: 'Find its final speed.',
  a: 'Find its acceleration.',
  t: 'Find the time taken.',
  s: 'Find the distance it covers.',
};

const scenarioText = (sc: Scenario): string =>
  `${VEHICLES[sc.subject]} moves in a straight line with constant acceleration. ${scenarioGiven(sc).map((q) => FACT[q](sc[q])).join(' ')} ${ASKED[sc.asked]}`;

/**
 * Which equation, found by asking which quantities the problem involves. Each
 * suvat equation leaves exactly one out.
 */
const whichFlow: Generator<Scenario> = {
  id: 'kin-which-flow',
  sample: sampleScenario,
  render: (sc): Slide => {
    const key = `${sc.u}|${sc.v}|${sc.a}|${sc.t}|${sc.s}|${sc.missing}|${sc.asked}`;
    const equation = (q: keyof typeof EQUATIONS) => `Use $${EQUATIONS[q]}$.`;
    const involves = (q: SuvatVar) => (q === sc.missing ? 'No' : 'Yes');
    const path = [involves('t')];
    if (sc.missing !== 't') path.push(involves('s'));
    if (sc.missing !== 't' && sc.missing !== 's') path.push(involves('v'));
    return {
      kind: 'flow',
      prompt: [say(scenarioText(sc)), say('Work out which equation to use.')],
      subject: 'u, v, a, t, s',
      steps: [
        {
          id: 't',
          ask: 'Does the problem involve the time, given or asked?',
          branches: turned(
            [
              { label: 'Yes', to: 's' },
              { label: 'No', outcome: equation('t') },
            ],
            `${key}t`,
          ),
        },
        {
          id: 's',
          ask: 'Does it involve the displacement?',
          branches: turned(
            [
              { label: 'Yes', to: 'v' },
              { label: 'No', outcome: equation('s') },
            ],
            `${key}s`,
          ),
        },
        {
          id: 'v',
          ask: 'Does it involve the final velocity?',
          branches: turned(
            [
              { label: 'Yes', outcome: equation('a') },
              { label: 'No', outcome: equation('v') },
            ],
            `${key}v`,
          ),
        },
      ],
      answer: path,
    };
  },
  solution: (sc) => [
    { text: `Given: $${scenarioGiven(sc).join(', ')}$. Asked: $${sc.asked}$. So $${sc.missing}$ plays no part.` },
    { text: `The equation without $${sc.missing}$ is $${EQUATIONS[sc.missing]}$.` },
  ],
};

/**
 * The same choice from the list of equations. Difficulty 2 adds the fifth,
 * which leaves out u, as a distractor.
 */
const whichChoice: Generator<Scenario & { five: boolean }> = {
  id: 'kin-which-choice',
  sample: (rng, difficulty) => ({ ...sampleScenario(rng, difficulty), five: difficulty > 1 }),
  render: (sc): Slide => {
    const labels = [EQUATIONS[sc.missing], ...(['s', 'v', 't', 'a'] as const).filter((q) => q !== sc.missing).map((q) => EQUATIONS[q])];
    if (sc.five) labels.push(WITHOUT_U);
    return choiceSlide(
      [say(scenarioText(sc)), say('Which equation gets you there in one step?')],
      labels.map((label, k) => ({ label, correct: k === 0 })),
      true,
    );
  },
  solution: (sc) => [
    { text: `The problem uses $${scenarioGiven(sc).join(', ')}$ and $${sc.asked}$, and never mentions $${sc.missing}$.` },
    { text: `Each equation leaves out one quantity; the one leaving out $${sc.missing}$ is $${EQUATIONS[sc.missing]}$.` },
  ],
};

/**
 * The chosen equation worked through to the answer. Difficulty 2 includes
 * decelerations and u as the unknown.
 */
const solveMixed: Generator<Scenario> = {
  id: 'kin-solve-mixed',
  sample: sampleScenario,
  choices: (sc) => {
    const right = sc[sc.asked];
    return numChoices(right, [-right, right * 2, right / 2, right + sc.t]);
  },
  render: (sc): Slide => ({
    kind: 'expression',
    prompt: [say(scenarioText(sc)), say(`Speeds in m/s, accelerations in m/s², times in seconds, distances in metres.`)],
    lead: `${sc.asked} =`,
    keypad: WORKING_KEYS,
    answer: fmt(sc[sc.asked]),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (sc) => {
    const { u, v, a, t, s } = sc;
    const work: Record<string, string> = {
      'u:s': `u = v - at = ${v} - ${par(a)} \\times ${t} = ${u}`,
      'v:s': `v = u + at = ${u} + ${par(a)} \\times ${t} = ${v}`,
      'a:s': `a = \\frac{v - u}{t} = \\frac{${v} - ${u}}{${t}} = ${a}`,
      't:s': `t = \\frac{v - u}{a} = \\frac{${v} - ${u}}{${par(a)}} = ${t}`,
      's:v': `s = ${u} \\times ${t} + \\tfrac{1}{2} \\times ${par(a)} \\times ${t}^{2} = ${s}`,
      'u:v': `u = \\frac{s - \\tfrac{1}{2}at^{2}}{t} = \\frac{${s} ${signed((-a * t * t) / 2)}}{${t}} = ${u}`,
      'a:v': `a = \\frac{2(s - ut)}{t^{2}} = \\frac{2(${s} - ${u * t})}{${t * t}} = ${a}`,
      'u:t': `u = \\sqrt{v^{2} - 2as} = \\sqrt{${v * v} ${signed(-2 * a * s)}} = ${u}`,
      'v:t': `v = \\sqrt{u^{2} + 2as} = \\sqrt{${u * u} ${signed(2 * a * s)}} = ${v}`,
      'a:t': `a = \\frac{v^{2} - u^{2}}{2s} = \\frac{${v * v} - ${u * u}}{${2 * s}} = ${a}`,
      's:t': `s = \\frac{v^{2} - u^{2}}{2a} = \\frac{${v * v} - ${u * u}}{${2 * a}} = ${s}`,
      'u:a': `u = \\frac{2s}{t} - v = \\frac{${2 * s}}{${t}} - ${v} = ${u}`,
      'v:a': `v = \\frac{2s}{t} - u = \\frac{${2 * s}}{${t}} - ${u} = ${v}`,
      't:a': `t = \\frac{2s}{u + v} = \\frac{${2 * s}}{${u + v}} = ${t}`,
      's:a': `s = \\tfrac{1}{2}(${u} + ${v}) \\times ${t} = ${s}`,
    };
    return [
      { text: `$${sc.missing}$ plays no part, so use $${EQUATIONS[sc.missing]}$.` },
      { tex: work[`${sc.asked}:${sc.missing}`] },
    ];
  },
};

interface SignsParams {
  kind: 'throw' | 'brake';
  /** The positive direction is the way it first moves. */
  alongFirst: boolean;
  speed: number;
  /** Deceleration for a car, g for a throw. */
  accel: number;
  dist: number;
  axis: number;
  thing: number;
}

function signsValues({ kind, alongFirst, speed, accel, dist }: SignsParams): [number, number, number] {
  const way = alongFirst ? 1 : -1;
  // A throw ends below where it started; a car ends ahead of where it braked.
  return kind === 'throw' ? [way * speed, -way * accel, -way * dist] : [way * speed, -way * accel, way * dist];
}

/**
 * u, a and s written down with signs, before any equation is used. Up or
 * down, the way of travel or against it: the convention is the learner's to
 * apply. Difficulty 1 always takes the first motion as positive.
 */
const signsTiles: Generator<SignsParams> = {
  id: 'kin-signs-tiles',
  sample: (rng, difficulty) => {
    const kind = rng.pick(['throw', 'brake'] as const);
    const alongFirst = difficulty > 1 ? rng.chance(0.5) : true;
    if (kind === 'throw') {
      return { kind, alongFirst, speed: rng.int(4, 25), accel: G, dist: rng.int(5, 60), axis: 0, thing: rng.int(0, THROWN.length - 1) };
    }
    for (;;) {
      const accel = rng.int(2, 8);
      const speed = rng.int(8, 30);
      const dist = (speed * speed) / (2 * accel);
      if (!isTenth(dist)) continue;
      return { kind, alongFirst, speed, accel, dist, axis: rng.int(0, 2), thing: rng.int(0, VEHICLES.length - 1) };
    }
  },
  render: (params): Slide => {
    const { kind, alongFirst, speed, accel, dist } = params;
    let story: string;
    if (kind === 'throw') {
      story = `A ${THROWN[params.thing]} is thrown straight up at ${speed} m/s from a ledge ${dist} m above the ground, and falls to the ground. Taking ${alongFirst ? 'up' : 'down'} as positive and $g = 9.8$ m/s², fill in $u$, $a$ and $s$ for the whole flight.`;
    } else {
      const { pos, neg } = AXES[params.axis];
      story = `${VEHICLES[params.thing]} travelling ${pos} at ${speed} m/s brakes at ${accel} m/s² and stops after ${fmt(dist)} m. Taking ${alongFirst ? pos : neg} as positive, fill in $u$, $a$ and $s$.`;
    }
    const answer = signsValues(params).map(fmt);
    return {
      kind: 'tiles',
      prompt: [say(story)],
      template: 'u = {0}, \\quad a = {1}, \\quad s = {2}',
      bank: tokenBank(answer, signsValues(params).map((x) => fmt(-x))),
      answer,
    };
  },
  solution: (params) => {
    const [u, a, s] = signsValues(params);
    const pos = params.kind === 'throw' ? (params.alongFirst ? 'up' : 'down') : 'the positive direction';
    return [
      { text: `Everything pointing ${pos === 'the positive direction' ? 'the positive way' : pos} is positive; everything pointing the other way is negative.` },
      {
        text:
          params.kind === 'throw'
            ? `It is thrown up, gravity pulls down, and it ends ${params.dist} m below where it started.`
            : 'It moves forwards, the braking acts backwards, and it ends up ahead of where it braked.',
      },
      { tex: aligned(`u &= ${fmt(u)}`, `a &= ${fmt(a)}`, `s &= ${fmt(s)}`) },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 4: vertical motion under gravity
 * ================================================================ */

/**
 * Under gravity everything is built from k, with u = 4.9k: the top is k/2
 * seconds up, the height at whole t is 4.9t(k - t), the velocity 4.9(k - 2t),
 * and a stone thrown from a cliff h = 4.9T(T - k) high lands at whole T. Each
 * of those is a whole number times 4.9, so it lands on one decimal place.
 */
const upSpeed = (k: number): number => 4.9 * k;
const heightAt = (k: number, t: number): number => 4.9 * t * (k - t);
const velocityAt = (k: number, t: number): number => 4.9 * (k - 2 * t);

interface GravParams {
  thing: number;
  k: number;
  /** Difficulty 1: the time asked about. Difficulty 2: the time it lands. */
  t: number;
  ask: 'height' | 'velocity' | 'time' | 'impact' | 'cliff';
}

const cliffOf = (k: number, T: number): number => 4.9 * T * (T - k);

/**
 * A height or velocity at a whole time, or at difficulty 2 a stone thrown up
 * from a cliff: when it lands (a quadratic in t), how fast, or how high the
 * cliff is.
 */
const gravHeight: Generator<GravParams> = {
  id: 'kin-grav-height',
  sample: (rng, difficulty) => {
    const thing = rng.int(0, THROWN.length - 1);
    if (difficulty > 1) {
      const k = rng.int(1, 6);
      return { thing, k, t: k + rng.int(1, 4), ask: rng.pick(['time', 'impact', 'cliff'] as const) };
    }
    for (;;) {
      const k = rng.int(2, 8);
      const t = rng.int(1, k - 1);
      const ask = rng.pick(['height', 'velocity'] as const);
      if (ask === 'velocity' && k === 2 * t) continue;
      return { thing, k, t, ask };
    }
  },
  choices: ({ k, t, ask }) => {
    const u = upSpeed(k);
    switch (ask) {
      case 'height':
        return numChoices(heightAt(k, t), [u * t + 4.9 * t * t, u * t - G * t * t, u * t]);
      case 'velocity':
        return numChoices(velocityAt(k, t), [-velocityAt(k, t), u + G * t, u - 4.9 * t]);
      case 'time':
        return numChoices(t, [t - k, k, cliffOf(k, t) / u]);
      case 'impact':
        return numChoices(4.9 * (2 * t - k), [u, G * t, 4.9 * (2 * t + k)]);
      case 'cliff':
        return numChoices(cliffOf(k, t), [4.9 * t * t, 4.9 * t * (t + k), u * t]);
    }
  },
  render: ({ thing, k, t, ask }): Slide => {
    const u = fmt(upSpeed(k));
    const what = THROWN[thing];
    const texts = {
      height: `A ${what} is thrown straight up at ${u} m/s. Taking $g = 9.8$ m/s², find its height above the point of projection after ${t} s, in metres.`,
      velocity: `A ${what} is thrown straight up at ${u} m/s. Taking up as positive and $g = 9.8$ m/s², find its velocity after ${t} s, in m/s.`,
      time: `A ${what} is thrown straight up at ${u} m/s from the edge of a cliff ${fmt(cliffOf(k, t))} m above the sea. Taking $g = 9.8$ m/s², how many seconds until it hits the sea?`,
      impact: `A ${what} is thrown straight up at ${u} m/s from the edge of a cliff, and hits the sea below ${t} s later. Taking $g = 9.8$ m/s², find its speed as it hits the sea, in m/s.`,
      cliff: `A ${what} is thrown straight up at ${u} m/s from the edge of a cliff, and hits the sea below ${t} s later. Taking $g = 9.8$ m/s², find the height of the cliff, in metres.`,
    };
    const answers = {
      height: heightAt(k, t),
      velocity: velocityAt(k, t),
      time: t,
      impact: 4.9 * (2 * t - k),
      cliff: cliffOf(k, t),
    };
    const leads = { height: 's =', velocity: 'v =', time: 't =', impact: '\\text{speed} =', cliff: 'h =' };
    return {
      kind: 'expression',
      prompt: [say(texts[ask])],
      lead: leads[ask],
      keypad: WORKING_KEYS,
      answer: fmt(answers[ask]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ k, t, ask }) => {
    const u = fmt(upSpeed(k));
    switch (ask) {
      case 'height':
        return [{ text: 'Up is positive and gravity pulls down, so $a = -9.8$.' }, { tex: `s = ${u} \\times ${t} - 4.9 \\times ${t}^{2} = ${fmt(heightAt(k, t))}` }];
      case 'velocity':
        return [
          { text: 'Up is positive and gravity pulls down, so $a = -9.8$.' },
          { tex: `v = ${u} - 9.8 \\times ${t} = ${fmt(velocityAt(k, t))}` },
          { text: velocityAt(k, t) < 0 ? 'Negative: it is already on its way down.' : 'Positive: it is still rising.' },
        ];
      case 'time':
        return [
          { text: `Up is positive and the sea is ${fmt(cliffOf(k, t))} m below, so $s = -${fmt(cliffOf(k, t))}$ and $a = -9.8$.` },
          { tex: `-${fmt(cliffOf(k, t))} = ${u}t - 4.9t^{2}` },
          { tex: `4.9t^{2} - ${u}t - ${fmt(cliffOf(k, t))} = 0` },
          { text: `The quadratic formula gives $t = ${t}$ or a negative time, which is before it was thrown.` },
        ];
      case 'impact':
        return [
          { text: 'Up is positive, so $a = -9.8$:' },
          { tex: `v = ${u} - 9.8 \\times ${t} = ${fmt(velocityAt(k, t))}` },
          { text: `Negative because it is moving down; the speed is $${fmt(4.9 * (2 * t - k))}$.` },
        ];
      case 'cliff':
        return [
          { tex: `s = ${u} \\times ${t} - 4.9 \\times ${t}^{2} = ${fmt(heightAt(k, t))}` },
          { text: `It ends ${fmt(cliffOf(k, t))} m below where it was thrown, so the cliff is ${fmt(cliffOf(k, t))} m high.` },
        ];
    }
  },
};

interface GravStepsParams {
  thing: number;
  k: number;
  t: number;
}

/**
 * s = ut - 4.9t^2 one operation at a time. At difficulty 2 it is thrown from
 * a cliff and the time runs past its return, so s comes out negative.
 */
const gravSteps: Generator<GravStepsParams> = {
  id: 'kin-grav-steps',
  sample: (rng, difficulty) => {
    const thing = rng.int(0, THROWN.length - 1);
    if (difficulty > 1) {
      const k = rng.int(1, 6);
      return { thing, k, t: k + rng.int(1, 3) };
    }
    const k = rng.int(2, 8);
    return { thing, k, t: rng.int(1, k - 1) };
  },
  render: ({ thing, k, t }): Slide => {
    const u = upSpeed(k);
    const ut = u * t;
    const drop = 4.9 * t * t;
    const s = heightAt(k, t);
    const where = t > k ? ' from the edge of a cliff' : '';
    return {
      kind: 'steps',
      prompt: [
        say(
          `A ${THROWN[thing]} is thrown straight up at ${fmt(u)} m/s${where}. Find its displacement $s$ above the point of projection after ${t} s, from $s = ut - 4.9t^{2}$: that is $s = ut + \\tfrac{1}{2}at^{2}$ with $a = -9.8$. Tap the part to work out next, then choose its value.`,
        ),
      ],
      start: [fmt(u), '\\times', `${t}`, '-', '4.9', '\\times', `${t}^2`],
      reductions: [
        { span: [6, 7], value: fmt(t * t), bank: stepBank(fmt(t * t), fmt(2 * t), fmt(t * t + 1)) },
        { span: [0, 3], operator: 1, value: fmt(ut), bank: stepBank(fmt(ut), fmt(u + t), fmt(ut + 4.9), fmt(ut - 4.9)) },
        { span: [2, 5], operator: 3, value: fmt(drop), bank: stepBank(fmt(drop), fmt(G * t * t), fmt(4.9 * t), fmt(drop + 4.9)) },
        { span: [0, 3], operator: 1, value: fmt(s), bank: stepBank(fmt(s), fmt(ut + drop), fmt(-s), fmt(s + 4.9)) },
      ],
    };
  },
  solution: ({ k, t }) => {
    const s = heightAt(k, t);
    return [
      { tex: `s = ${fmt(upSpeed(k))} \\times ${t} - 4.9 \\times ${t}^{2} = ${fmt(upSpeed(k) * t)} - ${fmt(4.9 * t * t)} = ${fmt(s)}` },
      {
        text:
          s < 0
            ? `Negative: after ${t} s it is ${fmt(-s)} m below the point it was thrown from.`
            : `Positive: it is ${fmt(s)} m above the point it was thrown from.`,
      },
    ];
  },
};

interface TopParams {
  thing: number;
  k: number;
  /** Height above the ground it is thrown from. */
  h: number;
  /** Difficulty 2: whole seconds to fall from the top to the ground. */
  n?: number;
}

/**
 * The greatest height, built in stages: the time to the top from v = u + at,
 * the height gained from s = (u + v)t/2 with v = 0, and the height above the
 * ground. Difficulty 2 goes on to the fall from the top and the total time.
 */
const topTree: Generator<TopParams> = {
  id: 'kin-top-tree',
  sample: (rng, difficulty) => {
    const thing = rng.int(0, THROWN.length - 1);
    if (difficulty > 1) {
      const k = rng.pick([2, 4, 6, 8, 10]);
      const n = k / 2 + rng.int(1, 5);
      return { thing, k, h: 4.9 * (n * n - (k / 2) ** 2), n };
    }
    return { thing, k: rng.pick([2, 4, 6, 8]), h: rng.int(1, 30) };
  },
  render: ({ thing, k, h, n }): Slide => {
    const u = upSpeed(k);
    const up = k / 2;
    const rise = (u * up) / 2;
    const top = h + rise;
    const base = `A ${THROWN[thing]} is thrown straight up at ${fmt(u)} m/s from a point ${fmt(h)} m above the ground. Taking $g = 9.8$ m/s², fill in the time to reach the top, the height it rises, then its greatest height above the ground`;
    const slips = [u / 4.9, u * up, rise * 2, top + h, h + u];
    if (n === undefined) {
      return {
        kind: 'tree',
        prompt: [say(`${base}.`)],
        expression: 't = \\frac{u}{9.8}, \\quad s = \\tfrac{1}{2}ut',
        nodes: [
          { id: 't', from: [] },
          { id: 'H', from: ['t'] },
          { id: 'G', from: ['H'] },
        ],
        bank: valueBank([up, rise, top], slips),
        answer: [up, rise, top].map(fmt),
      };
    }
    return {
      kind: 'tree',
      prompt: [say(`${base}, the time to fall from there to the ground, and its whole time in the air.`)],
      expression: 't = \\frac{u}{9.8}, \\; s = \\tfrac{1}{2}ut, \\; s = 4.9t^{2}',
      nodes: [
        { id: 't', from: [] },
        { id: 'H', from: ['t'] },
        { id: 'G', from: ['H'] },
        { id: 'F', from: ['G'] },
        { id: 'T', from: ['t', 'F'] },
      ],
      bank: valueBank([up, rise, top, n, up + n], [...slips, n * 2, up * 2]),
      answer: [up, rise, top, n, up + n].map(fmt),
    };
  },
  solution: ({ k, h, n }) => {
    const u = upSpeed(k);
    const up = k / 2;
    const rise = (u * up) / 2;
    const steps: SolutionStep[] = [
      { text: 'At the top it stops for an instant, so $v = 0$ there.' },
      { tex: aligned(`0 &= ${fmt(u)} - 9.8t`, `t &= ${fmt(up)}`) },
      { tex: `s = \\tfrac{1}{2}(${fmt(u)} + 0) \\times ${fmt(up)} = ${fmt(rise)}` },
      { tex: `\\text{height} = ${fmt(h)} + ${fmt(rise)} = ${fmt(h + rise)}` },
    ];
    if (n !== undefined) {
      steps.push(
        { text: 'From the top it falls from rest, so $s = 4.9t^{2}$ down:' },
        { tex: aligned(`4.9t^{2} &= ${fmt(h + rise)}`, `t^{2} &= ${n * n}`, `t &= ${n}`) },
        { tex: `\\text{time in the air} = ${fmt(up)} + ${n} = ${fmt(up + n)}` },
      );
    }
    return steps;
  },
};

interface GravSliderParams {
  thing: number;
  k: number;
  /** Difficulty 2: the landing time from a cliff. */
  T?: number;
  ask: 'top' | 'land' | 'level';
}

const sliderAnswer = ({ k, T, ask }: GravSliderParams): number => (ask === 'top' ? k / 2 : ask === 'land' ? (T ?? k) : k);

/**
 * A time read off a graph of height against time by sliding to it: the top,
 * the landing, or at difficulty 2 the moment it passes the cliff top again.
 */
const gravSlider: Generator<GravSliderParams> = {
  id: 'kin-grav-slider',
  sample: (rng, difficulty) => {
    const thing = rng.int(0, THROWN.length - 1);
    if (difficulty > 1) {
      const k = rng.int(1, 6);
      return { thing, k, T: k + rng.int(1, 4), ask: rng.pick(['top', 'land', 'level'] as const) };
    }
    return { thing, k: rng.int(1, 8), ask: rng.pick(['top', 'land'] as const) };
  },
  render: (params): Slide => {
    const { thing, k, T, ask } = params;
    const u = upSpeed(k);
    const end = T ?? k;
    const h = T === undefined ? 0 : cliffOf(k, T);
    const f = (t: number) => h + u * t - 4.9 * t * t;
    const top = h + 1.225 * k * k;
    const asked = {
      top: 'Slide the line to the time it reaches its greatest height.',
      land: T === undefined ? 'Slide the line to the time it lands again.' : 'Slide the line to the time it hits the sea.',
      level: 'Slide the line to the time it passes the top of the cliff again on the way down.',
    }[ask];
    const setting = T === undefined ? 'from the ground' : `from the top of a cliff ${fmt(h)} m above the sea`;
    return {
      kind: 'slider',
      prompt: [
        say(`A ${THROWN[thing]} is thrown straight up at ${fmt(u)} m/s ${setting}. The graph shows its height against time, with $g = 9.8$ m/s². ${asked}`),
      ],
      min: 0,
      max: end,
      step: 0.5,
      answer: sliderAnswer(params),
      readout: 't = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: end,
          yMin: -top * 0.04,
          yMax: top * 1.1,
          curves: [{ f }],
          horizontals: h > 0 ? [h] : [],
          marks: [{ x: 0, y: h }],
          label: 'A parabola of height against time for a stone thrown straight up',
        }),
        ...markerWindow(0, end),
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { k, T, ask } = params;
    const u = fmt(upSpeed(k));
    if (ask === 'top') {
      return [{ text: 'At the top its velocity is zero:' }, { tex: aligned(`0 &= ${u} - 9.8t`, `t &= ${fmt(k / 2)}`) }, { text: 'On the graph that is the peak of the parabola.' }];
    }
    if (ask === 'level') {
      return [
        { text: 'Back at the height it was thrown from means $s = 0$:' },
        { tex: aligned(`${u}t - 4.9t^{2} &= 0`, `t(${u} - 4.9t) &= 0`, `t = 0 \\text{ or } t &= ${k}`) },
        { text: 'The graph crosses the dashed line of the cliff top there, twice as long as the rise.' },
      ];
    }
    if (T === undefined) {
      return [{ tex: aligned(`${u}t - 4.9t^{2} &= 0`, `t(${u} - 4.9t) &= 0`, `t = 0 \\text{ or } t &= ${k}`) }, { text: 'Up and down take the same time: twice the time to the top.' }];
    }
    return [
      { text: `The sea is ${fmt(cliffOf(k, T))} m below, so solve $${u}t - 4.9t^{2} = -${fmt(cliffOf(k, T))}$.` },
      { text: `That gives $t = ${T}$, where the graph meets the axis.` },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 5: two-stage journeys and catching up
 * ================================================================ */

interface StageTableParams {
  subject: number;
  a1: number;
  t1: number;
  /** Deceleration in the second stage; zero for a steady one. */
  a2: number;
  t2: number;
}

function twoStages({ a1, t1, a2, t2 }: StageTableParams) {
  const v1 = a1 * t1;
  const s1 = (a1 * t1 * t1) / 2;
  const v2 = v1 - a2 * t2;
  const s2 = ((v1 + v2) * t2) / 2;
  return { v1, s1, v2, s2 };
}

/**
 * A journey in two stages as a table, a row per stage: where the first
 * stage ends is where the second starts. Difficulty 2 brakes in the second
 * stage and adds a row for the whole journey.
 */
const stageTable: Generator<StageTableParams> = {
  id: 'kin-stage-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const a1 = rng.int(1, 6);
      const t1 = rng.int(2, 8);
      const a2 = hard ? rng.int(1, 5) : 0;
      const t2 = rng.int(2, 10);
      const params = { subject: rng.int(0, VEHICLES.length - 1), a1, t1, a2, t2 };
      const { v2, s1, s2 } = twoStages(params);
      if (!Number.isInteger(s1) || !Number.isInteger(s2) || v2 < 0 || s1 + s2 > 500) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { a1, t1, a2, t2 } = params;
    const { v1, s1, v2, s2 } = twoStages(params);
    const second = a2 === 0 ? `then travels at that speed for ${t2} s` : `then brakes at ${a2} m/s² for ${t2} s`;
    const rows: (string | null)[][] = [
      ['1', '0', null, `${t1}`, null],
      ['2', null, null, `${t2}`, null],
    ];
    const answer = [v1, s1, v1, v2, s2];
    if (a2 !== 0) {
      rows.push(['\\text{all}', '', '', `${t1 + t2}`, null]);
      answer.push(s1 + s2);
    }
    return {
      kind: 'table',
      prompt: [
        say(
          `${VEHICLES[params.subject]} starts from rest and accelerates at ${a1} m/s² for ${t1} s, ${second}. Fill in the table, one row per stage, with speeds in m/s and distances in metres.`,
        ),
      ],
      columns: ['\\text{stage}', 'u', 'v', 't', 's'],
      rows,
      bank: valueBank(answer, [a1 * t1 * t1, v1 * (t1 + t2), s2 + s1 + v1, v1 * t2 * 2, a1 + t1]),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { a1, t1, a2, t2 } = params;
    const { v1, s1, v2, s2 } = twoStages(params);
    const steps: SolutionStep[] = [
      { text: 'Stage 1 starts from rest:' },
      { tex: aligned(`v &= 0 + ${a1} \\times ${t1} = ${v1}`, `s &= \\tfrac{1}{2} \\times ${a1} \\times ${t1}^{2} = ${s1}`) },
      { text: `Stage 2 starts at the speed stage 1 ends at, $u = ${v1}$:` },
    ];
    if (a2 === 0) {
      steps.push({ tex: `s = ${v1} \\times ${t2} = ${s2}` });
    } else {
      steps.push(
        { tex: aligned(`v &= ${v1} - ${a2} \\times ${t2} = ${v2}`, `s &= \\tfrac{1}{2}(${v1} + ${v2}) \\times ${t2} = ${s2}`) },
        { tex: `s = ${s1} + ${s2} = ${s1 + s2}` },
      );
    }
    return steps;
  },
};

interface CatchParams {
  subjects: [number, number];
  w: number;
  /** Difficulty 1: B's acceleration. Difficulty 2: [A's, B's]. */
  accels: number[];
}

function catchValues({ w, accels }: CatchParams): { gap: number; t: number; s: number; vB: number } {
  const aB = accels[accels.length - 1];
  const aA = accels.length > 1 ? accels[0] : 0;
  const gap = aB - aA;
  const t = (2 * w) / gap;
  return { gap, t, s: (aB * t * t) / 2, vB: aB * t };
}

/**
 * Catching up from a standing start: B sets off from rest as A passes at a
 * steady w, and catches A when their distances agree. At difficulty 2 A is
 * accelerating too, so the difference in accelerations does the catching.
 */
const catchTree: Generator<CatchParams> = {
  id: 'kin-catch-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const w = rng.int(2, 20);
      const accels = difficulty > 1 ? [rng.int(1, 3), rng.int(2, 8)] : [rng.int(1, 8)];
      const subjects: [number, number] = [rng.int(0, VEHICLES.length - 1), rng.int(0, VEHICLES.length - 1)];
      const params = { subjects, w, accels };
      const { gap, t, s } = catchValues(params);
      if (gap <= 0 || !Number.isInteger(t) || !Number.isInteger(s) || s > 800 || subjects[0] === subjects[1]) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { subjects, w, accels } = params;
    const { gap, t, s, vB } = catchValues(params);
    const A = VEHICLES[subjects[0]];
    const B = VEHICLES[subjects[1]].replace(/^A /, 'a ');
    if (accels.length === 1) {
      return {
        kind: 'tree',
        prompt: [
          say(
            `${A} passes a junction at a steady ${w} m/s. At that moment ${B} sets off from rest at the junction, accelerating at ${accels[0]} m/s² the same way. Fill in the time it takes to catch up, how far from the junction that is, and its speed then.`,
          ),
        ],
        expression: '\\tfrac{1}{2}at^{2} = wt',
        nodes: [
          { id: 't', from: [] },
          { id: 's', from: ['t'] },
          { id: 'v', from: ['t'] },
        ],
        bank: valueBank([t, s, vB], [w / accels[0], t * t, (accels[0] * t * t) / 4, w + accels[0]]),
        answer: [t, s, vB].map(fmt),
      };
    }
    return {
      kind: 'tree',
      prompt: [
        say(
          `${A} passes a junction at ${w} m/s, accelerating at ${accels[0]} m/s². At that moment ${B} sets off from rest at the junction, accelerating at ${accels[1]} m/s² the same way. Fill in the difference in accelerations, the time it takes to catch up, then how far from the junction that is.`,
        ),
      ],
      expression: '\\tfrac{1}{2}a_{B}t^{2} = wt + \\tfrac{1}{2}a_{A}t^{2}',
      nodes: [
        { id: 'd', from: [] },
        { id: 't', from: ['d'] },
        { id: 's', from: ['t'] },
      ],
      bank: valueBank([gap, t, s], [accels[0] + accels[1], (2 * w) / accels[1], w * t, t * t]),
      answer: [gap, t, s].map(fmt),
    };
  },
  solution: (params) => {
    const { w, accels } = params;
    const { gap, t, s, vB } = catchValues(params);
    if (accels.length === 1) {
      return [
        { text: 'Both start at the junction, so B catches up when they have gone the same distance:' },
        { tex: aligned(`\\tfrac{1}{2} \\times ${accels[0]} \\times t^{2} &= ${w}t`, `t &= \\frac{2 \\times ${w}}{${accels[0]}} = ${t}`) },
        { tex: aligned(`s &= ${w} \\times ${t} = ${s}`, `v &= ${accels[0]} \\times ${t} = ${vB}`) },
      ];
    }
    return [
      { tex: `\\tfrac{1}{2} \\times ${accels[1]}t^{2} = ${w}t + \\tfrac{1}{2} \\times ${accels[0]}t^{2}` },
      { tex: aligned(`\\tfrac{1}{2} \\times ${gap}t^{2} &= ${w}t`, `t &= \\frac{2 \\times ${w}}{${gap}} = ${t}`) },
      { tex: `s = \\tfrac{1}{2} \\times ${accels[1]} \\times ${t}^{2} = ${s}` },
    ];
  },
};

interface TwoStageParams {
  subject: number;
  V: number;
  t1: number;
  t2: number;
  /** Difficulty 2: a third stage slowing to rest. */
  t3?: number;
}

const twoStageTotal = ({ V, t1, t2, t3 }: TwoStageParams): number =>
  t3 === undefined ? (V * t1) / 2 + V * t2 : (V * (t1 + t3)) / 2 + V * t2;

/**
 * The distance of a journey that speeds up from rest and then cruises, one
 * operation at a time. At difficulty 2 it also slows to rest, and the two
 * triangles are taken together.
 */
const twoStageSteps: Generator<TwoStageParams> = {
  id: 'kin-twostage-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const params: TwoStageParams = {
        subject: rng.int(0, VEHICLES.length - 1),
        V: rng.int(3, 24),
        t1: rng.int(2, 12),
        t2: rng.int(2, 20),
        t3: difficulty > 1 ? rng.int(2, 12) : undefined,
      };
      if (!isTenth(twoStageTotal(params))) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { V, t1, t2, t3 } = params;
    const half = V / 2;
    const cruise = V * t2;
    const total = twoStageTotal(params);
    const who = VEHICLES[params.subject];
    if (t3 === undefined) {
      const tri = half * t1;
      return {
        kind: 'steps',
        prompt: [
          say(
            `${who} speeds up steadily from rest to ${V} m/s in ${t1} s, then keeps that speed for ${t2} s. The distance is the triangle then the rectangle under its velocity-time graph. Tap the part to work out next, then choose its value.`,
          ),
        ],
        start: ['\\tfrac{1}{2}', '\\times', `${V}`, '\\times', `${t1}`, '+', `${V}`, '\\times', `${t2}`],
        reductions: [
          { span: [0, 3], operator: 1, value: fmt(half), bank: stepBank(fmt(half), fmt(V * 2), fmt(V + 0.5), fmt(half + 1)) },
          { span: [0, 3], operator: 1, value: fmt(tri), bank: stepBank(fmt(tri), fmt(V * t1), fmt(half + t1), fmt(tri + half)) },
          { span: [2, 5], operator: 3, value: fmt(cruise), bank: stepBank(fmt(cruise), fmt(V + t2), fmt(cruise + V), fmt(cruise - V)) },
          { span: [0, 3], operator: 1, value: fmt(total), bank: stepBank(fmt(total), fmt(cruise - tri), fmt(total + V), fmt(V * (t1 + t2))) },
        ],
      };
    }
    const ends = t1 + t3;
    const tris = half * ends;
    return {
      kind: 'steps',
      prompt: [
        say(
          `${who} speeds up steadily from rest to ${V} m/s in ${t1} s, keeps that speed for ${t2} s, then slows steadily to rest in ${t3} s. The two triangles under its velocity-time graph have the same height, so they are taken together. Tap the part to work out next, then choose its value.`,
        ),
      ],
      start: ['\\tfrac{1}{2}', '\\times', `${V}`, '\\times', '(', `${t1}`, '+', `${t3}`, ')', '+', `${V}`, '\\times', `${t2}`],
      reductions: [
        { span: [4, 9], operator: 6, value: fmt(ends), bank: stepBank(fmt(ends), fmt(t1 * t3), fmt(Math.abs(t1 - t3)), fmt(ends + 1)) },
        { span: [0, 3], operator: 1, value: fmt(half), bank: stepBank(fmt(half), fmt(V * 2), fmt(half + 1), fmt(V + 0.5)) },
        { span: [0, 3], operator: 1, value: fmt(tris), bank: stepBank(fmt(tris), fmt(V * ends), fmt(half + ends), fmt(tris + half)) },
        { span: [2, 5], operator: 3, value: fmt(cruise), bank: stepBank(fmt(cruise), fmt(V + t2), fmt(cruise + V), fmt(cruise - V)) },
        { span: [0, 3], operator: 1, value: fmt(total), bank: stepBank(fmt(total), fmt(cruise - tris), fmt(total + V), fmt(V * (ends + t2))) },
      ],
    };
  },
  solution: (params) => {
    const { V, t1, t2, t3 } = params;
    const total = twoStageTotal(params);
    if (t3 === undefined) {
      return [
        { text: 'Speeding up from rest is a triangle; the steady stage is a rectangle.' },
        { tex: aligned(`A_1 &= \\tfrac{1}{2} \\times ${V} \\times ${t1} = ${fmt((V * t1) / 2)}`, `A_2 &= ${V} \\times ${t2} = ${V * t2}`, `s &= ${fmt((V * t1) / 2)} + ${V * t2} = ${fmt(total)}`) },
      ];
    }
    return [
      { text: `The two triangles share the height $${V}$, so they make one triangle whose base is both times together: $${t1} + ${t3} = ${t1 + t3}$.` },
      { tex: aligned(`A_1 &= \\tfrac{1}{2} \\times ${V} \\times ${t1 + t3} = ${fmt((V * (t1 + t3)) / 2)}`, `A_2 &= ${V} \\times ${t2} = ${V * t2}`, `s &= ${fmt((V * (t1 + t3)) / 2)} + ${V * t2} = ${fmt(total)}`) },
    ];
  },
};

interface CatchTimeParams {
  kind: 'towards' | 'behind' | 'head';
  subjects: [number, number];
  /** towards and behind: the gap; head: B's head start for A. */
  d: number;
  w1: number;
  /** B's speed, or at difficulty 2 B's acceleration. */
  w2: number;
}

export function catchTime({ kind, d, w1, w2 }: CatchTimeParams): number {
  if (kind === 'towards') return d / (w1 + w2);
  if (kind === 'behind') return d / (w2 - w1);
  // (1/2) w2 t^2 = d + w1 t, the positive root.
  return (w1 + Math.sqrt(w1 * w1 + 2 * w2 * d)) / w2;
}

/**
 * When two moving things meet. Difficulty 1 is steady speeds, towards each
 * other or one gaining on the other. Difficulty 2 gives the leader a head
 * start and the chaser an acceleration from rest, which is a quadratic in t.
 */
const catchTimeGen: Generator<CatchTimeParams> = {
  id: 'kin-catch-time',
  sample: (rng, difficulty) => {
    for (;;) {
      const subjects: [number, number] = [rng.int(0, PEOPLE.length - 1), rng.int(0, PEOPLE.length - 1)];
      if (subjects[0] === subjects[1]) continue;
      if (difficulty > 1) {
        const w2 = rng.int(1, 4);
        const w1 = rng.int(1, 6);
        const t = rng.int(3, 12);
        const d = (w2 * t * t) / 2 - w1 * t;
        if (!Number.isInteger(d) || d <= 0 || d > 150) continue;
        return { kind: 'head', subjects, d, w1, w2 };
      }
      const kind = rng.pick(['towards', 'behind'] as const);
      const w1 = rng.int(1, 8);
      const w2 = rng.int(kind === 'behind' ? w1 + 1 : 1, 10);
      const d = rng.int(10, 200);
      const params = { kind, subjects, d, w1, w2 };
      if (w2 <= (kind === 'behind' ? w1 : 0) || !isTenth(catchTime(params))) continue;
      return params;
    }
  },
  choices: (params) => {
    const { kind, d, w1, w2 } = params;
    const t = catchTime(params);
    if (kind === 'head') return numChoices(t, [(2 * w1) / w2, d / w1, Math.sqrt((2 * d) / w2)]);
    return numChoices(t, [kind === 'towards' ? d / Math.abs(w1 - w2) : d / (w1 + w2), d / w2, d / w1]);
  },
  render: (params): Slide => {
    const { kind, subjects, d, w1, w2 } = params;
    const A = PEOPLE[subjects[0]];
    const B = PEOPLE[subjects[1]].replace(/^A /, 'a ');
    const texts = {
      towards: `${A} and ${B} are ${d} m apart on a straight path and set off towards each other at the same moment, at ${w1} m/s and ${w2} m/s. After how many seconds do they meet?`,
      behind: `${A} is ${d} m ahead of ${B} on a straight path. Both move the same way, at ${w1} m/s and ${w2} m/s. After how many seconds does the second catch up?`,
      head: `${A} moves along a straight path at a steady ${w1} m/s. When they are ${d} m ahead, ${B} starts from rest behind them and accelerates at ${w2} m/s² the same way. After how many seconds does the second catch up?`,
    };
    return {
      kind: 'expression',
      prompt: [say(texts[kind])],
      lead: 't =',
      keypad: WORKING_KEYS,
      answer: fmt(catchTime(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { kind, d, w1, w2 } = params;
    const t = catchTime(params);
    if (kind === 'towards') {
      return [
        { text: 'Moving towards each other, they close the gap at the sum of their speeds.' },
        { tex: `t = \\frac{${d}}{${w1} + ${w2}} = ${fmt(t)}` },
      ];
    }
    if (kind === 'behind') {
      return [
        { text: 'Moving the same way, the gap closes at the difference of their speeds.' },
        { tex: `t = \\frac{${d}}{${w2} - ${w1}} = ${fmt(t)}` },
      ];
    }
    return [
      { text: 'Measure from where the second starts. They meet when the chaser has covered the head start plus what the leader has gone since:' },
      { tex: `\\tfrac{1}{2} \\times ${w2}t^{2} = ${d} + ${w1}t` },
      { tex: `${fmt(w2 / 2)}t^{2} - ${w1}t - ${d} = 0` },
      { text: `The quadratic formula gives $t = ${fmt(t)}$; the other root is negative.` },
    ];
  },
};

/* ================================================================
 * Level 3: calculus in kinematics
 *
 * s, v and a are formulas in t here: polynomials held as coefficients,
 * highest power first, and in lesson 3 exponentials B + Ae^{kt}. Every
 * coefficient a learner reads is whole. A formula that is integrated is drawn
 * with each coefficient a multiple of the power it will be divided by, so no
 * third or half ever reaches a formula on screen.
 * ================================================================ */

/** An answer in t. */
const T_KEYS: KeypadKey[] = [spaced('t'), ...OPERATOR_KEYS];

/** An answer in t with exponentials in it. */
const T_EXP_KEYS: KeypadKey[] = [spaced('t'), spaced('e'), ...OPERATOR_KEYS];

/** A polynomial in t: its coefficients, highest power first. */
export type Poly = number[];

const degreeOf = (p: Poly): number => p.length - 1;

/** p(t), by Horner's rule. */
export const polyAt = (p: Poly, t: number): number => p.reduce((total, c) => total * t + c, 0);

/** The derivative, term by term. A constant's is zero. */
export const derived = (p: Poly): Poly => (p.length < 2 ? [0] : p.slice(0, -1).map((c, i) => c * (degreeOf(p) - i)));

/** An antiderivative, with `c` as its constant term. */
export const integrated = (p: Poly, c: number): Poly => [...p.map((coefficient, i) => coefficient / (p.length - i)), c];

/** The single term c t^n. */
const single = (c: number, n: number): Poly => [c, ...Array<number>(n).fill(0)];

/** The nonzero terms as [coefficient, power], highest power first or, `rising`, lowest. */
function termsOf(p: Poly, rising = false): [number, number][] {
  const terms = p.map((c, i): [number, number] => [c, degreeOf(p) - i]).filter(([c]) => c !== 0);
  return rising ? terms.reverse() : terms;
}

/** Terms joined by their signs, each drawn by `draw` from its size and power. */
function joined(terms: [number, number][], draw: (size: number, power: number) => string): string {
  if (terms.length === 0) return '0';
  return terms
    .map(([c, n], k) => {
      const body = draw(Math.abs(c), n);
      if (k === 0) return c < 0 ? `-${body}` : body;
      return `${c < 0 ? '-' : '+'} ${body}`;
    })
    .join(' ');
}

/** `2t^{3} - 5t + 1`; lowest power first with `rising`, as a question may write it. */
export function polyTex(p: Poly, rising = false): string {
  return joined(termsOf(p, rising), (size, n) => {
    if (n === 0) return fmt(size);
    const power = n === 1 ? 't' : `t^{${n}}`;
    return size === 1 ? power : `${fmt(size)}${power}`;
  });
}

/** p with the time put in for t, the line before its value: `3(2)^{2} - 4(2) + 1`. */
function substituted(p: Poly, t: number): string {
  const x = `(${fmt(t)})`;
  return joined(termsOf(p), (size, n) => {
    if (n === 0) return fmt(size);
    const power = n === 1 ? x : `${x}^{${n}}`;
    return size === 1 ? power : `${fmt(size)}${power}`;
  });
}

/**
 * p at t as the values of its terms, `-37.5 - 25 + 6`: the line before the
 * total. Shorter than `substituted`, which for a cubic at a half second runs
 * off a phone.
 */
function termValues(p: Poly, t: number): string {
  const values = termsOf(p).map(([c, n]) => c * t ** n);
  if (values.length === 0) return '0';
  return values.map((value, k) => (k === 0 ? fmt(value) : value < 0 ? `- ${fmt(-value)}` : `+ ${fmt(value)}`)).join(' ');
}

/**
 * `lhs = p` as a solution line, through `via` if given (`\frac{ds}{dt}`), and
 * broken after two terms when p has four or more, so it fits a phone.
 */
function polyLine(lhs: string, p: Poly, via?: string): string {
  const terms = termsOf(p);
  if (!via && terms.length < 4) return `${lhs} = ${polyTex(p)}`;
  const rows = via ? [`${lhs} &= ${via}`] : [];
  const first = via ? '' : lhs;
  if (terms.length < 4) return aligned(...rows, `${first} &= ${polyTex(p)}`);
  const keep = (part: [number, number][]): Poly => p.map((c, i) => (part.some(([, n]) => n === degreeOf(p) - i) ? c : 0));
  const tail = polyTex(keep(terms.slice(2)));
  return aligned(...rows, `${first} &= ${polyTex(keep(terms.slice(0, 2)))}`, `&\\quad ${tail.startsWith('-') ? `- ${tail.slice(1)}` : `+ ${tail}`}`);
}

/** The same for mathjs, in `letter`. Never displayed, so bracketed rather than pretty. */
export function polyMath(p: Poly, letter = 't'): string {
  const terms = termsOf(p).map(([c, n]) => (n === 0 ? `(${fmt(c)})` : `(${fmt(c)})*${letter}^${n}`));
  return terms.length === 0 ? '0' : terms.join(' + ');
}

/** A derivative worked one term to a line. */
function termByTerm(p: Poly): string {
  return aligned(
    ...termsOf(p).map(([c, n]) => `\\frac{d}{dt}(${polyTex(single(c, n))}) &= ${n === 0 ? '0' : polyTex(single(c * n, n - 1))}`),
  );
}

/** Whole coefficients, each drawn from its own range. */
const drawPoly = (rng: Rng, ranges: [number, number][]): Poly => ranges.map(([lo, hi]) => rng.int(lo, hi));

/** Who is moving, where a formula gives the motion. */
const MOVERS = [
  'A particle moves along a straight line',
  'A bead slides along a straight wire',
  'A toy train runs along a straight track',
  'A robot moves along a straight rail',
  'A small boat moves along a straight canal',
] as const;

/** The opening of a question: who moves, and what the formula shown under it gives. */
function moving(mover: number, what: 's' | 'v' | 'a'): string {
  const measured = {
    s: 'its displacement from $O$ is $s$ metres',
    v: 'its velocity is $v$ m/s',
    a: 'its acceleration is $a$ m/s²',
  }[what];
  return `${MOVERS[mover]}. After $t$ seconds ${measured}, where`;
}

const show = (tex: string): Block => ({ kind: 'display', tex });

/** A smooth curve against t on [0, end], its window taken from the curve itself. */
function curveSvg(f: (t: number) => number, end: number, label: string, shade?: { from: number; to: number }): string {
  const values = Array.from({ length: 81 }, (_, k) => f((end * k) / 80));
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const pad = (hi - lo) * 0.08 || 1;
  return plotSvg({ xMin: 0, xMax: end, yMin: lo - pad, yMax: hi + pad, height: 170, curves: [{ f }], shade: shade && { f, ...shade }, label });
}

/** The two questions of a speeding-up flow: the sign of v, then of a. */
function speedFlowSteps(key: string): Extract<Slide, { kind: 'flow' }>['steps'] {
  const outcome = (vs: number, as: number) =>
    as === 0 ? 'Zero acceleration: for that moment its speed is not changing.' : vs * as > 0 ? 'The same sign: it is speeding up.' : 'Opposite signs: it is slowing down.';
  const ends = (vs: number) =>
    turned(
      [
        { label: 'Positive', outcome: outcome(vs, 1) },
        { label: 'Negative', outcome: outcome(vs, -1) },
        { label: 'Zero', outcome: outcome(vs, 0) },
      ],
      `${key}${vs}`,
    );
  return [
    {
      id: 'v',
      ask: 'Is its velocity positive or negative?',
      branches: turned(
        [
          { label: 'Positive', to: 'ap' },
          { label: 'Negative', to: 'an' },
        ],
        key,
      ),
    },
    { id: 'ap', ask: 'Is its acceleration positive, negative or zero?', branches: ends(1) },
    { id: 'an', ask: 'Is its acceleration positive, negative or zero?', branches: ends(-1) },
  ];
}

/** The last word of a speeding-up solution. */
const speedVerdict = (v: number, a: number): string =>
  v * a > 0
    ? `$v$ and $a$ are both ${v > 0 ? 'positive' : 'negative'}: the acceleration acts the way it is moving, so it is speeding up.`
    : `$v$ is ${v > 0 ? 'positive' : 'negative'} but $a$ is ${a > 0 ? 'positive' : 'negative'}: the acceleration acts against the motion, so it is slowing down.`;

/* ---------- Level 3, lesson 1: velocity from displacement ---------- */

interface FormulaParams {
  mover: number;
  /** The formula the question gives. */
  p: Poly;
  /** Written lowest power first, as difficulty 2 writes it. */
  rising: boolean;
}

/**
 * v = ds/dt typed as a function of t. Difficulty 1 is a quadratic or a cubic
 * in the usual order; difficulty 2 a cubic or quartic with any signs, written
 * lowest power first.
 */
const dsDt: Generator<FormulaParams> = {
  id: 'kin-ds-dt',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const p = hard
        ? rng.chance(0.5)
          ? [nonZero(rng, 3), ...drawPoly(rng, [[-5, 5], [-6, 6], [-9, 9], [-10, 10]])]
          : [nonZero(rng, 5), ...drawPoly(rng, [[-6, 6], [-9, 9], [-10, 10]])]
        : rng.chance(0.5)
          ? drawPoly(rng, [[1, 5], [-6, 6], [-9, 9], [0, 12]])
          : drawPoly(rng, [[1, 6], [-9, 9], [0, 12]]);
      if (termsOf(derived(p)).length < 2) continue;
      return { mover, p, rising: hard };
    }
  },
  render: ({ mover, p, rising }): Slide => ({
    kind: 'expression',
    prompt: [say(moving(mover, 's')), show(`s = ${polyTex(p, rising)}`), say('Find its velocity $v$ in terms of $t$.')],
    lead: 'v =',
    keypad: T_KEYS,
    answer: polyMath(derived(p)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ p, rising }) => [
    { text: 'Velocity is the rate of change of displacement, $v = \\frac{ds}{dt}$. Differentiate term by term: bring each power down in front and lower it by one. The constant goes.' },
    ...(rising ? [{ text: `In the usual order, $s = ${polyTex(p)}$.` }] : []),
    { tex: termByTerm(p) },
    { tex: polyLine('v', derived(p)) },
  ],
};

/**
 * v = ds/dt for a cubic, placed term by term. Tiles grade the form: the slips
 * on offer are a power not brought down and the constant kept. Difficulty 2
 * writes s lowest power first, with negative terms.
 */
const dsTiles: Generator<FormulaParams> = {
  id: 'kin-ds-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      mover: rng.int(0, MOVERS.length - 1),
      p: [rng.int(1, hard ? 5 : 4), nonZero(rng, hard ? 7 : 5), nonZero(rng, 9), hard ? rng.int(-9, 12) : rng.int(0, 12)],
      rising: hard,
    };
  },
  render: ({ mover, p, rising }): Slide => {
    const [a, b, c, d] = p;
    const answer = [fmt(3 * a), signed(2 * b), signed(c)];
    return {
      kind: 'tiles',
      prompt: [say(moving(mover, 's')), show(`s = ${polyTex(p, rising)}`), say('Complete its velocity, $v = \\frac{ds}{dt}$.')],
      template: 'v = {0}t^2 {1}t {2}',
      bank: tokenBank(answer, [fmt(a), signed(b), ...(d === 0 ? [] : [signed(d)]), signed(-2 * b), fmt(3 * a + 1)]),
      answer,
    };
  },
  solution: ({ p }) => [
    { text: 'Differentiate term by term: bring each power down in front and lower it by one. The constant goes.' },
    { tex: termByTerm(p) },
    { tex: polyLine('v', derived(p)) },
  ],
};

interface AtParams extends FormulaParams {
  at: number;
}

/**
 * v at a stated time: differentiate, then put the time in. Difficulty 2 has
 * negative terms written lowest power first, and half-second times.
 */
const vAt: Generator<AtParams> = {
  id: 'kin-v-at',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const p = hard
        ? [nonZero(rng, 3), ...drawPoly(rng, [[-6, 6], [-9, 9], [-10, 10]])]
        : rng.chance(0.5)
          ? drawPoly(rng, [[1, 3], [-5, 5], [-8, 8], [0, 10]])
          : drawPoly(rng, [[1, 6], [-9, 9], [0, 10]]);
      const at = hard ? rng.pick([0.5, 1.5, 2, 2.5, 3, 3.5, 4]) : rng.int(1, 5);
      const v = polyAt(derived(p), at);
      if (!isTenth(v) || Math.abs(v) > 150 || termsOf(derived(p)).length < 2) continue;
      return { mover, p, rising: hard, at };
    }
  },
  choices: ({ p, at }) =>
    // Slips: the displacement instead, the powers lowered but not brought down, the acceleration.
    numChoices(polyAt(derived(p), at), [polyAt(p, at), polyAt(p.slice(0, -1), at), polyAt(derived(derived(p)), at)]),
  render: ({ mover, p, rising, at }): Slide => ({
    kind: 'expression',
    prompt: [say(moving(mover, 's')), show(`s = ${polyTex(p, rising)}`), say(`Find its velocity when $t = ${fmt(at)}$.`)],
    lead: 'v =',
    keypad: WORKING_KEYS,
    answer: fmt(polyAt(derived(p), at)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ p, at }) => {
    const v = derived(p);
    return [
      { text: 'Differentiate first, then put the time in.' },
      { tex: polyLine('v', v, '\\frac{ds}{dt}') },
      { text: `At $t = ${fmt(at)}$:` },
      { tex: `v = ${termValues(v, at)} = ${fmt(polyAt(v, at))}` },
    ];
  },
};

interface TableParams {
  mover: number;
  p: Poly;
  /** Difficulty 2 asks for the displacement beside the velocity. */
  both: boolean;
}

const tableTimes = (both: boolean): number[] => (both ? [0, 1, 2, 3] : [0, 1, 2, 3, 4]);

/**
 * v at several times from s, laid out as a table: one derivative, put to
 * work repeatedly. Difficulty 2 has negative terms and asks for s as well, so
 * the two columns have to be kept apart.
 */
const vTable: Generator<TableParams> = {
  id: 'kin-v-table',
  sample: (rng, difficulty) => {
    const both = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const p = both
        ? [nonZero(rng, 2), ...drawPoly(rng, [[-5, 5], [-9, 9], [-9, 9]])]
        : rng.chance(0.5)
          ? drawPoly(rng, [[1, 2], [-4, 4], [-6, 6], [0, 9]])
          : drawPoly(rng, [[1, 4], [-8, 8], [0, 9]]);
      const values = tableTimes(both).flatMap((t) => [polyAt(p, t), polyAt(derived(p), t)]);
      if (values.some((value) => Math.abs(value) > 99) || termsOf(derived(p)).length < 2) continue;
      return { mover, p, both };
    }
  },
  render: ({ mover, p, both }): Slide => {
    const v = derived(p);
    const times = tableTimes(both);
    const rows = times.map((t, k): (string | null)[] => {
      const cells = both ? [fmt(polyAt(p, t)), fmt(polyAt(v, t))] : [fmt(polyAt(v, t))];
      return [`${t}`, ...cells.map((cell) => (k === 0 ? cell : null))];
    });
    const answer = times.slice(1).flatMap((t) => (both ? [polyAt(p, t), polyAt(v, t)] : [polyAt(v, t)]));
    // Slips: the displacement for the velocity, the average over the second before, the acceleration.
    const slips = times.slice(1).flatMap((t) => [polyAt(p, t), polyAt(p, t) - polyAt(p, t - 1), polyAt(derived(v), t)]);
    return {
      kind: 'table',
      prompt: [
        say(moving(mover, 's')),
        show(`s = ${polyTex(p)}`),
        say(both ? 'Fill in its displacement $s$ and its velocity $v$ at each time $t$.' : 'Fill in its velocity $v$ at each time $t$.'),
      ],
      columns: both ? ['t', 's', 'v'] : ['t', 'v'],
      rows,
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: ({ p, both }) => {
    const v = derived(p);
    const times = tableTimes(both).slice(1);
    return [
      { text: 'Differentiate once, then put each time in.' },
      { tex: `v = ${polyTex(v)}` },
      { tex: aligned(...times.map((t) => `v(${t}) &= ${fmt(polyAt(v, t))}`)) },
      ...(both ? [{ text: 'The displacements come from $s$ itself:' }, { tex: aligned(...times.map((t) => `s(${t}) &= ${fmt(polyAt(p, t))}`)) }] : []),
    ];
  },
};

interface VSliderParams {
  mover: number;
  /** s, a quadratic, so that v is a straight line. */
  p: Poly;
  /** The velocity asked about. */
  target: number;
  answer: number;
  rising: boolean;
}

const V_SLIDER_END = 8;

/**
 * The time a particle reaches a stated velocity, slid to on its
 * displacement-time curve. Difficulty 2 may be slowing down, and lands on a
 * half second.
 */
const vSlider: Generator<VSliderParams> = {
  id: 'kin-v-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const a = hard ? nonZero(rng, 3) : rng.int(1, 4);
      const b = hard ? rng.int(-12, 12) : rng.int(0, 8);
      const answer = hard ? rng.int(1, 15) / 2 : rng.int(1, 7);
      if (hard && Number.isInteger(answer)) continue;
      const target = 2 * a * answer + b;
      if (target === 0) continue;
      return { mover: rng.int(0, MOVERS.length - 1), p: [a, b, rng.int(0, 10)], target, answer, rising: hard };
    }
  },
  render: ({ mover, p, target, answer, rising }): Slide => ({
    kind: 'slider',
    prompt: [
      say(moving(mover, 's')),
      show(`s = ${polyTex(p, rising)}`),
      say(`The graph shows $s$ against $t$. Slide the line to the time its velocity is $${target}$ m/s.`),
    ],
    min: 0,
    max: V_SLIDER_END,
    step: 0.5,
    answer,
    readout: 't = {v}',
    figure: {
      svg: curveSvg((t) => polyAt(p, t), V_SLIDER_END, 'A displacement-time graph: a smooth curve'),
      ...markerWindow(0, V_SLIDER_END),
      axis: 'x',
    },
  }),
  solution: ({ p, target, answer }) => {
    const v = derived(p);
    return [
      { text: 'Differentiate to get the velocity, then set it equal to the value asked for.' },
      { tex: polyLine('v', v, '\\frac{ds}{dt}') },
      { tex: aligned(`${polyTex(v)} &= ${target}`, ...(v[1] === 0 ? [] : [`${polyTex([v[0], 0])} &= ${fmt(target - v[1])}`]), `t &= ${fmt(answer)}`) },
    ];
  },
};

/* ---------- Level 3, lesson 2: acceleration ---------- */

interface RateParams extends FormulaParams {
  /** Which formula is given: v, or s at difficulty 2. */
  from: 'v' | 's';
}

/** a as a polynomial: from v once, from s twice. */
const accelOf = ({ p, from }: Pick<RateParams, 'p' | 'from'>): Poly => (from === 'v' ? derived(p) : derived(derived(p)));

/** The working from the given formula to a, one derivative to a line. */
function toAccel({ p, from }: Pick<RateParams, 'p' | 'from'>): SolutionStep[] {
  if (from === 'v') return [{ tex: polyLine('a', derived(p), '\\frac{dv}{dt}') }];
  return [{ tex: polyLine('v', derived(p), '\\frac{ds}{dt}') }, { tex: polyLine('a', derived(derived(p)), '\\frac{dv}{dt}') }];
}

/** A formula to differentiate down to a: v at difficulty 1, s at difficulty 2. */
function sampleRate(rng: Rng, difficulty: number): RateParams {
  const hard = difficulty > 1;
  for (;;) {
    const mover = rng.int(0, MOVERS.length - 1);
    const p = hard
      ? rng.chance(0.5)
        ? [nonZero(rng, 3), ...drawPoly(rng, [[-5, 5], [-6, 6], [-9, 9], [-10, 10]])]
        : [nonZero(rng, 4), ...drawPoly(rng, [[-6, 6], [-9, 9], [-10, 10]])]
      : rng.chance(0.5)
        ? drawPoly(rng, [[1, 4], [-6, 6], [-9, 9], [0, 12]])
        : drawPoly(rng, [[1, 6], [-9, 9], [-12, 12]]);
    const params: RateParams = { mover, p, from: hard ? 's' : 'v', rising: hard };
    if (!termsOf(accelOf(params)).some(([, n]) => n > 0)) continue;
    return params;
  }
}

/**
 * a typed as a function of t: dv/dt at difficulty 1, and at difficulty 2 the
 * second derivative of s, written lowest power first.
 */
const aDt: Generator<RateParams> = {
  id: 'kin-a-dt',
  sample: sampleRate,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(moving(params.mover, params.from)), show(`${params.from} = ${polyTex(params.p, params.rising)}`), say('Find its acceleration $a$ in terms of $t$.')],
    lead: 'a =',
    keypad: T_KEYS,
    answer: polyMath(accelOf(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => [
    {
      text:
        params.from === 'v'
          ? 'Acceleration is the rate of change of velocity: $a = \\frac{dv}{dt}$. Differentiate term by term.'
          : 'Acceleration is the rate of change of velocity, which is itself the rate of change of displacement: differentiate twice, $a = \\frac{d^{2}s}{dt^{2}}$.',
    },
    ...toAccel(params),
  ],
};

interface RateAtParams extends RateParams {
  at: number;
}

/**
 * a at a stated time. Difficulty 1 differentiates v once at a whole second;
 * difficulty 2 differentiates s twice, sometimes at a half second.
 */
const aAt: Generator<RateAtParams> = {
  id: 'kin-a-at',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleRate(rng, difficulty);
      const at = difficulty > 1 ? rng.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]) : rng.int(1, 5);
      const a = polyAt(accelOf(params), at);
      if (!isTenth(a) || Math.abs(a) > 150 || a === 0) continue;
      return { ...params, at };
    }
  },
  choices: (params) => {
    const { p, from, at } = params;
    const a = polyAt(accelOf(params), at);
    // Slips: the formula given itself, one derivative short (or the powers not brought down), a sign lost.
    return numChoices(a, [polyAt(p, at), from === 's' ? polyAt(derived(p), at) : polyAt(p.slice(0, -1), at), -a]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(moving(params.mover, params.from)),
      show(`${params.from} = ${polyTex(params.p, params.rising)}`),
      say(`Find its acceleration when $t = ${fmt(params.at)}$.`),
    ],
    lead: 'a =',
    keypad: WORKING_KEYS,
    answer: fmt(polyAt(accelOf(params), params.at)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const a = accelOf(params);
    return [
      { text: params.from === 'v' ? 'Differentiate $v$ once, then put the time in.' : 'Differentiate $s$ twice, then put the time in.' },
      ...toAccel(params),
      { text: `At $t = ${fmt(params.at)}$:` },
      { tex: `a = ${termValues(a, params.at)} = ${fmt(polyAt(a, params.at))}` },
    ];
  },
};

/** v and a at the moment asked, from whichever formula is given. */
function stateAt({ p, from, at }: RateAtParams): { v: number; a: number } {
  const v = from === 'v' ? p : derived(p);
  return { v: polyAt(v, at), a: polyAt(derived(v), at) };
}

/**
 * Speeding up or slowing down at a moment, from a formula: work out v and a
 * there, then compare their signs. Difficulty 1 gives v; difficulty 2 gives s,
 * so both come from differentiating, sometimes at a half second.
 */
const accelFlow: Generator<RateAtParams> = {
  id: 'kin-accel-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const p = hard ? [nonZero(rng, 2), ...drawPoly(rng, [[-6, 6], [-9, 9], [0, 10]])] : [nonZero(rng, 3), ...drawPoly(rng, [[-8, 8], [-10, 10]])];
      const params: RateAtParams = { mover, p, from: hard ? 's' : 'v', rising: hard, at: hard ? rng.int(1, 10) / 2 : rng.int(1, 6) };
      const { v, a } = stateAt(params);
      if (v === 0 || a === 0 || !isTenth(v) || !isTenth(a)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { v, a } = stateAt(params);
    return {
      kind: 'flow',
      prompt: [
        say(moving(params.mover, params.from)),
        show(`${params.from} = ${polyTex(params.p, params.rising)}`),
        say(`At $t = ${fmt(params.at)}$, is it speeding up or slowing down?`),
      ],
      subject: `t = ${fmt(params.at)}`,
      steps: speedFlowSteps(`${polyTex(params.p)}|${params.from}|${fmt(params.at)}`),
      answer: [signWord(v), signWord(a)],
    };
  },
  solution: (params) => {
    const { v, a } = stateAt(params);
    const vPoly = params.from === 'v' ? params.p : derived(params.p);
    const at = fmt(params.at);
    return [
      ...(params.from === 's' ? [{ tex: polyLine('v', vPoly) }] : []),
      { tex: `v(${at}) = ${termValues(vPoly, params.at)} = ${fmt(v)}` },
      { tex: polyLine('a', derived(vPoly)) },
      { tex: `a(${at}) = ${termValues(derived(vPoly), params.at)} = ${fmt(a)}` },
      { text: speedVerdict(v, a) },
    ];
  },
};

/**
 * a = d²s/dt² placed term by term, from a cubic at difficulty 1 and a quartic,
 * written lowest power first, at difficulty 2. The slips on offer are
 * stopping at v and bringing a power down once only.
 */
const aTiles: Generator<FormulaParams> = {
  id: 'kin-a-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      mover: rng.int(0, MOVERS.length - 1),
      p: hard
        ? [rng.int(1, 3), nonZero(rng, 4), nonZero(rng, 6), rng.int(-9, 9), rng.int(-10, 10)]
        : [rng.int(1, 4), nonZero(rng, 6), rng.int(-9, 9), rng.int(0, 12)],
      rising: hard,
    };
  },
  render: ({ mover, p, rising }): Slide => {
    const quartic = p.length === 5;
    const [a, b, c] = p;
    const answer = quartic ? [fmt(12 * a), signed(6 * b), signed(2 * c)] : [fmt(6 * a), signed(2 * b)];
    const slips = quartic
      ? [fmt(4 * a), signed(3 * b), signed(c), fmt(6 * a), signed(-6 * b)]
      : [fmt(3 * a), signed(b), ...(c === 0 ? [] : [signed(c)]), signed(-2 * b), fmt(2 * a)];
    return {
      kind: 'tiles',
      prompt: [say(moving(mover, 's')), show(`s = ${polyTex(p, rising)}`), say('Complete its acceleration, $a = \\frac{d^{2}s}{dt^{2}}$.')],
      template: quartic ? 'a = {0}t^2 {1}t {2}' : 'a = {0}t {1}',
      bank: tokenBank(answer, slips),
      answer,
    };
  },
  solution: ({ p }) => [
    { text: 'Differentiate twice: once for the velocity, again for the acceleration.' },
    { tex: polyLine('v', derived(p), '\\frac{ds}{dt}') },
    { tex: polyLine('a', derived(derived(p)), '\\frac{dv}{dt}') },
  ],
};

/**
 * v and a at several times, as a table. Difficulty 1 gives v, so the v column
 * is substitution and the a column one derivative; difficulty 2 gives s.
 */
const vaTable: Generator<RateParams> = {
  id: 'kin-va-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const p = hard ? [nonZero(rng, 2), ...drawPoly(rng, [[-5, 5], [-8, 8], [-9, 9]])] : [nonZero(rng, 3), ...drawPoly(rng, [[-6, 6], [-9, 9]])];
      const params: RateParams = { mover, p, from: hard ? 's' : 'v', rising: false };
      const v = hard ? derived(p) : p;
      const values = [0, 1, 2, 3].flatMap((t) => [polyAt(v, t), polyAt(derived(v), t)]);
      if (values.some((value) => Math.abs(value) > 99) || termsOf(derived(v)).length < 2) continue;
      return params;
    }
  },
  render: ({ mover, p, from }): Slide => {
    const v = from === 'v' ? p : derived(p);
    const a = derived(v);
    const times = [0, 1, 2, 3];
    const rows = times.map((t, k): (string | null)[] => [`${t}`, k === 0 ? fmt(polyAt(v, t)) : null, k === 0 ? fmt(polyAt(a, t)) : null]);
    const answer = times.slice(1).flatMap((t) => [polyAt(v, t), polyAt(a, t)]);
    // Slips: the change in v over the second before, the given formula's own value, a sign lost.
    const slips = times.slice(1).flatMap((t) => [polyAt(v, t) - polyAt(v, t - 1), polyAt(p, t), -polyAt(a, t)]);
    return {
      kind: 'table',
      prompt: [say(moving(mover, from)), show(`${from} = ${polyTex(p)}`), say('Fill in its velocity $v$ and acceleration $a$ at each time $t$.')],
      columns: ['t', 'v', 'a'],
      rows,
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: ({ p, from }) => {
    const v = from === 'v' ? p : derived(p);
    const a = derived(v);
    return [
      ...(from === 's' ? [{ tex: polyLine('v', v, '\\frac{ds}{dt}') }] : []),
      { tex: polyLine('a', a, '\\frac{dv}{dt}') },
      { tex: aligned(...[1, 2, 3].map((t) => `v(${t}) &= ${fmt(polyAt(v, t))}`)) },
      { tex: aligned(...[1, 2, 3].map((t) => `a(${t}) &= ${fmt(polyAt(a, t))}`)) },
    ];
  },
};

/* ---------- Level 3, lesson 3: exponential motion ---------- */

interface ExpParams {
  mover: number;
  /** s = B + A e^{kt}. */
  A: number;
  k: number;
  B: number;
}

/** A e^{kt} as the learner reads it, `3e^{2t}`, `-e^{-t}`; a zero power leaves the number. */
function expTex(A: number, k: number): string {
  if (k === 0) return fmt(A);
  const coefficient = A === 1 ? '' : A === -1 ? '-' : fmt(A);
  const power = k === 1 ? 't' : k === -1 ? '-t' : `${k}t`;
  return `${coefficient}e^{${power}}`;
}

/** B + A e^{kt}, the constant first. */
function expSTex(A: number, k: number, B: number): string {
  if (B === 0) return expTex(A, k);
  return `${fmt(B)} ${A < 0 ? '-' : '+'} ${expTex(Math.abs(A), k)}`;
}

/** The same for mathjs. */
const expMath = (A: number, k: number, B = 0): string => `(${fmt(A)})*e^((${k})*t) + (${fmt(B)})`;

/** Difficulty 1: s = A e^{kt}, growing. Difficulty 2 adds a constant and lets A and k be negative. */
function sampleExp(rng: Rng, difficulty: number): ExpParams {
  const mover = rng.int(0, MOVERS.length - 1);
  if (difficulty < 2) return { mover, A: rng.int(1, 9), k: rng.int(2, 4), B: 0 };
  return { mover, A: nonZero(rng, 8), k: nonZero(rng, 4), B: nonZero(rng, 10) };
}

interface ExpAskParams extends ExpParams {
  ask: 'v' | 'a';
}

/**
 * v or a for s = B + A e^{kt}, typed as a function of t. Differentiating
 * brings k down in front each time, and the constant goes.
 */
const expV: Generator<ExpAskParams> = {
  id: 'kin-exp-v',
  sample: (rng, difficulty) => ({ ...sampleExp(rng, difficulty), ask: rng.pick(['v', 'a'] as const) }),
  choices: ({ A, k, B, ask }) => {
    const c = ask === 'v' ? A * k : A * k * k;
    const option = (coefficient: number, power: number, constant = 0) => ({
      tex: expSTex(coefficient, power, constant),
      answer: expMath(coefficient, power, constant),
    });
    // Slips: the other derivative, the constant kept, s unchanged, and the power rule's lowered power.
    const slips = [option(ask === 'v' ? A * k * k : A * k, k), option(c, k, B), option(A, k, B), option(ask === 'v' ? A * k : 2 * A * k, k - 1)];
    return options(option(c, k), ...slips).slice(0, 4);
  },
  render: ({ mover, A, k, B, ask }): Slide => ({
    kind: 'expression',
    prompt: [
      say(moving(mover, 's')),
      show(`s = ${expSTex(A, k, B)}`),
      say(ask === 'v' ? 'Find its velocity $v$ in terms of $t$.' : 'Find its acceleration $a$ in terms of $t$.'),
    ],
    lead: `${ask} =`,
    keypad: T_EXP_KEYS,
    answer: expMath(ask === 'v' ? A * k : A * k * k, k),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ A, k, B, ask }) => [
    {
      text: `Differentiating $e^{kt}$ brings $k$ down in front and leaves the power alone: $\\frac{d}{dt}e^{kt} = ke^{kt}$. Here $k = ${k}$${B === 0 ? '' : ', and the constant term goes'}.`,
    },
    { tex: `v = \\frac{ds}{dt} = ${expTex(A * k, k)}` },
    ...(ask === 'a' ? [{ tex: `a = \\frac{dv}{dt} = ${expTex(A * k * k, k)}` }] : []),
  ],
};

interface ExpStartParams extends ExpParams {
  ask: 's' | 'v' | 'a';
}

const expStartValue = ({ A, k, B, ask }: ExpStartParams): number => (ask === 's' ? A + B : ask === 'v' ? A * k : A * k * k);

/**
 * Where it starts, and how fast: s, v or a at t = 0, where e^0 = 1 leaves the
 * coefficient. Difficulty 2 has a constant term, which counts in s but not in
 * v or a.
 */
const expStart: Generator<ExpStartParams> = {
  id: 'kin-exp-start',
  sample: (rng, difficulty) => ({ ...sampleExp(rng, difficulty), ask: rng.pick(difficulty > 1 ? (['s', 'v', 'a'] as const) : (['v', 'a'] as const)) }),
  choices: (params) => {
    const { A, k, B } = params;
    // Slips: e^0 read as 0, the coefficient without k, the constant kept, the other derivative.
    return numChoices(expStartValue(params), [B, A, A * k + B, params.ask === 'a' ? A * k : A * k * k, A + B]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(moving(params.mover, 's')),
      show(`s = ${expSTex(params.A, params.k, params.B)}`),
      say(
        {
          s: 'Find its displacement from $O$ when $t = 0$.',
          v: 'Find its initial velocity, when $t = 0$.',
          a: 'Find its initial acceleration, when $t = 0$.',
        }[params.ask],
      ),
    ],
    lead: `${params.ask} =`,
    keypad: WORKING_KEYS,
    answer: fmt(expStartValue(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { A, k, B, ask } = params;
    const steps: SolutionStep[] = [];
    if (ask !== 's') steps.push({ tex: `v = ${expTex(A * k, k)}` });
    if (ask === 'a') steps.push({ tex: `a = ${expTex(A * k * k, k)}` });
    steps.push({ text: 'At $t = 0$ the exponential is $e^{0} = 1$, leaving its coefficient.' });
    const value = { s: `${fmt(B)} + ${par(A)} \\times 1`, v: `${par(A * k)} \\times 1`, a: `${par(A * k * k)} \\times 1` }[ask];
    steps.push({ tex: `${ask} = ${B === 0 && ask === 's' ? `${par(A)} \\times 1` : value} = ${fmt(expStartValue(params))}` });
    return steps;
  },
};

interface ExpTreeParams extends ExpParams {
  /** The displacement at the moment asked about. */
  S: number;
}

/**
 * v = ks read off s = Ae^{kt}, and a = kv, at the moment s takes a stated
 * value. Difficulty 2 has a constant term, so it is the distance from it that
 * k multiplies: v = k(s - B).
 */
const expTree: Generator<ExpTreeParams> = {
  id: 'kin-exp-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const A = hard ? nonZero(rng, 8) : rng.int(2, 9);
      const k = nonZero(rng, 3);
      const B = hard ? nonZero(rng, 10) : 0;
      const gap = hard ? nonZero(rng, 40) : rng.int(1, 60);
      // A moment after t = 0: e^{kt} = gap / A is above 1 growing, between 0 and 1 decaying.
      const ratio = gap / A;
      if (k > 0 ? ratio <= 1 : ratio <= 0 || ratio >= 1) continue;
      return { mover, A, k, B, S: gap + B };
    }
  },
  render: ({ mover, A, k, B, S }): Slide => {
    const gap = S - B;
    const answer = B === 0 ? [k, k * S, k * k * S] : [gap, k * gap, k * k * gap];
    return {
      kind: 'tree',
      prompt: [
        say(moving(mover, 's')),
        show(`s = ${expSTex(A, k, B)}`),
        say(
          B === 0
            ? `At one moment $s = ${S}$. Fill in $k$, then its velocity, then its acceleration at that moment.`
            : `At one moment $s = ${S}$. Fill in $s ${signed(-B)}$, then its velocity, then its acceleration at that moment.`,
        ),
      ],
      expression: B === 0 ? 'v = ks, \\quad a = kv' : aligned(`v &= k(s ${signed(-B)})`, 'a &= kv'),
      nodes:
        B === 0
          ? [
              { id: 'k', from: [] },
              { id: 'v', from: ['k'] },
              { id: 'a', from: ['k', 'v'] },
            ]
          : [
              { id: 'gap', from: [] },
              { id: 'v', from: ['gap'] },
              { id: 'a', from: ['v'] },
            ],
      // Slips: v at t = 0, k times s with the constant left in, a sign lost.
      bank: valueBank(answer, [A * k, k * S, -answer[1], S + k, -k]),
      answer: answer.map(fmt),
    };
  },
  solution: ({ A, k, B, S }) => {
    const gap = S - B;
    if (B === 0) {
      return [
        { text: `Differentiating $${expTex(A, k)}$ gives $${expTex(A * k, k)}$, which is $${k}$ times $s$: so $v = ${k}s$, and differentiating again, $a = ${k}v$.` },
        { tex: aligned(`v &= ${k} \\times ${S} = ${k * S}`, `a &= ${k} \\times ${par(k * S)} = ${k * k * S}`) },
      ];
    }
    return [
      { text: `The constant differentiates to nothing, so $v = ${expTex(A * k, k)}$, which is $${k}$ times $s ${signed(-B)}$.` },
      {
        tex: aligned(
          `s ${signed(-B)} &= ${gap}`,
          `v &= ${k} \\times ${par(gap)}`,
          `&= ${k * gap}`,
          `a &= ${k} \\times ${par(k * gap)}`,
          `&= ${k * k * gap}`,
        ),
      },
    ];
  },
};

/**
 * Speeding up or slowing down under s = B + A e^{kt}, for all time: e^{kt} is
 * always positive, so v takes the sign of Ak and a the sign of A. Growing
 * motion speeds up; decaying motion slows down.
 */
const expFlow: Generator<ExpParams> = {
  id: 'kin-exp-flow',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? sampleExp(rng, difficulty)
      : { mover: rng.int(0, MOVERS.length - 1), A: nonZero(rng, 9), k: nonZero(rng, 4), B: 0 },
  render: ({ mover, A, k, B }): Slide => ({
    kind: 'flow',
    prompt: [say(moving(mover, 's')), show(`s = ${expSTex(A, k, B)}`), say('As time goes on, is it speeding up or slowing down?')],
    subject: `s = ${expSTex(A, k, B)}`,
    steps: speedFlowSteps(`${A}|${k}|${B}`),
    answer: [signWord(A * k), signWord(A)],
  }),
  solution: ({ A, k }) => [
    { tex: aligned(`v &= ${expTex(A * k, k)}`, `a &= ${expTex(A * k * k, k)}`) },
    { text: `$e^{${k === 1 ? '' : k === -1 ? '-' : k}t}$ is positive at every time, so $v$ has the sign of $${fmt(A * k)}$ and $a$ the sign of $${fmt(A * k * k)}$, whatever $t$ is.` },
    { text: speedVerdict(A * k, A) },
  ],
};

/* ---------- Level 3, lesson 4: back by integrating ---------- */

interface IntParams {
  mover: number;
  /** The rate given: a, to find v, or v, to find s. */
  p: Poly;
  from: 'a' | 'v';
  /** What is found is `value` at time `at`. */
  at: number;
  value: number;
  rising: boolean;
}

/** The letter found by integrating what is given. */
const foundOf = (from: 'a' | 'v'): 'v' | 's' => (from === 'a' ? 'v' : 's');

/** The constant the condition fixes, and the formula with it. */
function recovered({ p, at, value }: Pick<IntParams, 'p' | 'at' | 'value'>): { c: number; result: Poly } {
  const c = value - polyAt(integrated(p, 0), at);
  return { c, result: integrated(p, c) };
}

/** The statement of the condition, in words. */
function conditionText({ from, at, value }: Pick<IntParams, 'from' | 'at' | 'value'>): string {
  if (from === 'a') {
    if (at === 0) return value === 0 ? 'It starts from rest.' : `It starts with velocity $${value}$ m/s.`;
    return `When $t = ${at}$ its velocity is $${value}$ m/s.`;
  }
  if (at === 0) return value === 0 ? 'It starts at $O$.' : `It starts at $s = ${value}$ m.`;
  return `When $t = ${at}$ its displacement is $s = ${value}$ m.`;
}

/** Integrate, then fix c: the working every lesson 4 solution shares. */
function constantSteps(params: Pick<IntParams, 'p' | 'from' | 'at' | 'value'>): SolutionStep[] {
  const found = foundOf(params.from);
  const free = integrated(params.p, 0);
  const { c, result } = recovered(params);
  return [
    { text: 'Integrate term by term: raise each power by one and divide by the new power. Integrating leaves a constant, $c$.' },
    { tex: `${found} = ${polyTex(free)} + c` },
    params.at === 0
      ? { text: `At $t = 0$ every term with $t$ in it is zero, so $c = ${fmt(params.value)}$.` }
      : { text: `Put $t = ${params.at}$ and $${found} = ${fmt(params.value)}$ in:` },
    ...(params.at === 0 ? [] : [{ tex: aligned(`${fmt(params.value)} &= ${termValues(free, params.at)} + c`, `c &= ${fmt(c)}`) }]),
    { tex: polyLine(found, result) },
  ];
}

/**
 * v from a, or s from v, typed as a function of t. Difficulty 1 integrates a
 * linear a with v known at the start; difficulty 2 integrates a quadratic v,
 * written lowest power first, with s known at a later time.
 */
const intV: Generator<IntParams> = {
  id: 'kin-int-v',
  sample: (rng, difficulty) => {
    const mover = rng.int(0, MOVERS.length - 1);
    if (difficulty < 2) return { mover, p: [2 * rng.int(1, 4), rng.int(-6, 8)], from: 'a', at: 0, value: rng.int(0, 12), rising: false };
    for (;;) {
      const p = [3 * nonZero(rng, 2), 2 * rng.int(-4, 4), rng.int(-9, 9)];
      if (termsOf(p).length < 2) continue;
      return { mover, p, from: 'v', at: rng.int(1, 3), value: rng.int(-10, 20), rising: true };
    }
  },
  render: (params): Slide => {
    const found = foundOf(params.from);
    return {
      kind: 'expression',
      prompt: [
        say(moving(params.mover, params.from)),
        show(`${params.from} = ${polyTex(params.p, params.rising)}`),
        say(`${conditionText(params)} Find ${found === 'v' ? 'its velocity $v$' : 'its displacement $s$'} in terms of $t$.`),
      ],
      lead: `${found} =`,
      keypad: T_KEYS,
      answer: polyMath(recovered(params).result),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => [
    ...(params.rising ? [{ text: `In the usual order, $v = ${polyTex(params.p)}$.` }] : []),
    ...constantSteps(params),
  ],
};

/**
 * Finding c, as a tree: each term of the integral at the stated time, then
 * what c must be to make the total right. Difficulty 1 integrates a linear a;
 * difficulty 2 a quadratic v, which has three terms to put the time into.
 */
const intCTree: Generator<IntParams> = {
  id: 'kin-int-c-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const p = hard ? [3 * nonZero(rng, 2), 2 * nonZero(rng, 4), nonZero(rng, 8)] : [2 * rng.int(1, 4), nonZero(rng, 6)];
      const params: IntParams = { mover, p, from: hard ? 'v' : 'a', at: rng.int(1, hard ? 3 : 4), value: rng.int(-10, hard ? 40 : 30), rising: false };
      const { c } = recovered(params);
      const terms = termsOf(integrated(p, 0)).map(([coefficient, n]) => coefficient * params.at ** n);
      if (c === 0 || terms.some((term) => Math.abs(term) > 99)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { p, from, at, value } = params;
    const found = foundOf(from);
    const free = integrated(p, 0);
    const terms = termsOf(free).map(([coefficient, n]) => coefficient * at ** n);
    const { c } = recovered(params);
    const total = terms.reduce((sum, term) => sum + term, 0);
    const answer = [...terms, c];
    return {
      kind: 'tree',
      prompt: [
        say(moving(params.mover, from)),
        show(`${from} = ${polyTex(p)}`),
        say(
          `Integrating gives $${found} = ${polyTex(free)} + c$. ${conditionText(params)} Fill in each term at $t = ${at}$, sign included, then $c$.`,
        ),
      ],
      expression: aligned(`${found} &= ${polyTex(free)} + c`, `${found}(${at}) &= ${fmt(value)}`),
      nodes: [...terms.map((_, i) => ({ id: `term${i}`, from: [] })), { id: 'c', from: terms.map((_, i) => `term${i}`) }],
      // Slips: the total added rather than taken away, the total itself, the value, c's sign lost.
      bank: valueBank(answer, [value + total, total, value, -c]),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const free = integrated(params.p, 0);
    const { c } = recovered(params);
    const total = polyAt(free, params.at);
    return [
      { tex: aligned(...termsOf(free).map(([coefficient, n]) => `${polyTex(single(coefficient, n))} &\\to ${substituted(single(coefficient, n), params.at)} = ${fmt(coefficient * params.at ** n)}`)) },
      { tex: aligned(`${fmt(params.value)} &= ${fmt(total)} + c`, `c &= ${fmt(params.value)} - ${par(total)} = ${fmt(c)}`) },
    ];
  },
};

/**
 * s from a quadratic v, placed term by term. Difficulty 1 knows s at the
 * start; difficulty 2 at a later time, and writes v lowest power first. The
 * slips on offer are a coefficient not divided and the known value taken for c.
 */
const intSTiles: Generator<IntParams> = {
  id: 'kin-int-s-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const p = [3 * rng.int(2, 4), 2 * nonZero(rng, 4), nonZero(rng, 9)];
      const params: IntParams = hard
        ? { mover, p, from: 'v', at: rng.int(1, 2), value: rng.int(-10, 30), rising: true }
        : { mover, p, from: 'v', at: 0, value: nonZero(rng, 12), rising: false };
      if (recovered(params).c === 0) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { result, c } = recovered(params);
    const [alpha, beta, r] = result;
    const answer = [fmt(alpha), signed(beta), signed(r), signed(c)];
    return {
      kind: 'tiles',
      prompt: [say(moving(params.mover, 'v')), show(`v = ${polyTex(params.p, params.rising)}`), say(`${conditionText(params)} Complete its displacement $s$.`)],
      template: 's = {0}t^3 {1}t^2 {2}t {3}',
      bank: tokenBank(answer, [fmt(params.p[0]), signed(params.p[1]), params.at === 0 ? signed(-c) : signed(params.value), signed(-beta), fmt(alpha + 1)]),
      answer,
    };
  },
  solution: (params) => constantSteps(params),
};

interface VAtParams {
  mover: number;
  /** a, a polynomial. */
  p: Poly;
  /** v at t = 0. */
  u: number;
  at: number;
}

const vFromA = ({ p, u }: Pick<VAtParams, 'p' | 'u'>): Poly => integrated(p, u);

/**
 * v at a stated time from a varying a and the starting velocity. The
 * distractor that matters is suvat's v = u + at with a read at that time,
 * which is wrong once a changes. Difficulty 2 has a quadratic a.
 */
const intVAt: Generator<VAtParams> = {
  id: 'kin-int-v-at',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const p = hard ? [3 * nonZero(rng, 2), 2 * rng.int(-4, 4), rng.int(-8, 8)] : [2 * rng.int(1, 4), rng.int(-6, 6)];
      const params = { mover, p, u: hard ? rng.int(-5, 10) : rng.int(0, 10), at: rng.int(1, hard ? 5 : 6) };
      if (Math.abs(polyAt(vFromA(params), params.at)) > 200) continue;
      return params;
    }
  },
  choices: (params) => {
    const { p, u, at } = params;
    const v = polyAt(vFromA(params), at);
    // Slips: suvat with a read at that time, the start forgotten, a itself.
    return numChoices(v, [u + polyAt(p, at) * at, v - u, polyAt(p, at)]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(moving(params.mover, 'a')),
      show(`a = ${polyTex(params.p)}`),
      say(`${conditionText({ from: 'a', at: 0, value: params.u })} Find its velocity when $t = ${params.at}$.`),
    ],
    lead: 'v =',
    keypad: WORKING_KEYS,
    answer: fmt(polyAt(vFromA(params), params.at)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const v = vFromA(params);
    return [
      { text: 'The acceleration changes with $t$, so the constant-acceleration equations do not apply: integrate instead.' },
      ...constantSteps({ p: params.p, from: 'a', at: 0, value: params.u }).slice(1),
      { text: `At $t = ${params.at}$:` },
      { tex: `v = ${termValues(v, params.at)} = ${fmt(polyAt(v, params.at))}` },
    ];
  },
};

interface STableParams {
  mover: number;
  /** v, a polynomial. */
  p: Poly;
  /** s at t = 0. */
  s0: number;
}

/**
 * s at several times from v and where it started: integrate once, fix c,
 * then fill the table. Difficulty 2 integrates a quadratic v and may start
 * on the negative side of O.
 */
const intSTable: Generator<STableParams> = {
  id: 'kin-int-s-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const p = hard ? [3 * rng.pick([-1, 1]), 2 * rng.int(-3, 3), rng.int(-6, 6)] : [2 * rng.int(1, 3), rng.int(-5, 6)];
      const s0 = hard ? rng.int(-8, 8) : rng.int(0, 10);
      const s = integrated(p, s0);
      if ([1, 2, 3, 4].some((t) => Math.abs(polyAt(s, t)) > 99)) continue;
      return { mover, p, s0 };
    }
  },
  render: ({ mover, p, s0 }): Slide => {
    const s = integrated(p, s0);
    const times = [0, 1, 2, 3, 4];
    const answer = times.slice(1).map((t) => polyAt(s, t));
    // Slips: v for s, the start forgotten, s0 + vt as if v were steady.
    const slips = times.slice(1).flatMap((t) => [polyAt(p, t), polyAt(s, t) - s0, s0 + polyAt(p, t) * t]);
    return {
      kind: 'table',
      prompt: [say(moving(mover, 'v')), show(`v = ${polyTex(p)}`), say(`${conditionText({ from: 'v', at: 0, value: s0 })} Fill in its displacement $s$ at each time $t$.`)],
      columns: ['t', 's'],
      rows: times.map((t, k) => [`${t}`, k === 0 ? fmt(s0) : null]),
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: ({ p, s0 }) => {
    const s = integrated(p, s0);
    return [
      ...constantSteps({ p, from: 'v', at: 0, value: s0 }),
      { tex: aligned(...[1, 2, 3, 4].map((t) => `s(${t}) &= ${fmt(polyAt(s, t))}`)) },
    ];
  },
};

/* ---------- Level 3, lesson 5: displacement over an interval ---------- */

interface IntervalParams {
  mover: number;
  /** v, linear or quadratic, keeping one sign on the interval. */
  v: Poly;
  from: number;
  to: number;
}

/**
 * The sign v keeps on [from, to], or 0 if it reaches zero there. v is at most
 * quadratic, so its ends and its one turning point settle it.
 */
export function signOn(v: Poly, from: number, to: number): number {
  const points = [from, to];
  if (v.length === 3 && v[0] !== 0) {
    const turn = -v[1] / (2 * v[0]);
    if (turn > from && turn < to) points.push(turn);
  }
  const values = points.map((t) => polyAt(v, t));
  if (values.every((value) => value > 0)) return 1;
  if (values.every((value) => value < 0)) return -1;
  return 0;
}

/** The displacement over the interval: the antiderivative at the top minus at the bottom. */
const displacementOver = ({ v, from, to }: Pick<IntervalParams, 'v' | 'from' | 'to'>): number =>
  polyAt(integrated(v, 0), to) - polyAt(integrated(v, 0), from);

/** A velocity whose integral has whole coefficients: linear with an even slope, or 3αt² + 2βt + r. */
function drawVelocity(rng: Rng, quadratic: boolean, sign: number): Poly {
  if (!quadratic) return [2 * nonZero(rng, 4), sign > 0 ? rng.int(1, 12) : -rng.int(1, 12)];
  return [3 * nonZero(rng, 2), 2 * rng.int(-4, 4), rng.int(-12, 12)];
}

/** An interval and a velocity keeping the sign `want` (either, if 0) throughout it. */
function sampleInterval(rng: Rng, difficulty: number, want: number, quadratic?: boolean): IntervalParams {
  const hard = difficulty > 1;
  for (;;) {
    const mover = rng.int(0, MOVERS.length - 1);
    const from = hard ? rng.int(1, 3) : 0;
    const to = from + rng.int(hard ? 1 : 2, hard ? 3 : 5);
    const sign = want === 0 ? rng.pick([1, -1]) : want;
    const v = drawVelocity(rng, quadratic ?? (hard || rng.chance(0.5)), sign);
    if (signOn(v, from, to) !== sign) continue;
    const d = displacementOver({ v, from, to });
    if (!isTenth(d) || Math.abs(d) > 300) continue;
    return { mover, v, from, to };
  }
}

/** The definite integral worked out, from the bracket to the number. */
function bracketTex({ v, from, to }: Pick<IntervalParams, 'v' | 'from' | 'to'>): string {
  const F = integrated(v, 0);
  return aligned(
    `&\\int_{${from}}^{${to}} (${polyTex(v)}) \\, dt`,
    `&= \\Big[ ${polyTex(F)} \\Big]_{${from}}^{${to}}`,
    `&= ${fmt(polyAt(F, to))} - ${par(polyAt(F, from))}`,
    `&= ${fmt(displacementOver({ v, from, to }))}`,
  );
}

/** Why v keeps its sign on the interval, as a solution line. */
function signReason({ v, from, to }: Pick<IntervalParams, 'v' | 'from' | 'to'>): string {
  const word = signOn(v, from, to) > 0 ? 'positive' : 'negative';
  return `$v(${from}) = ${fmt(polyAt(v, from))}$ and $v(${to}) = ${fmt(polyAt(v, to))}$, and $v$ does not reach zero in between: it is ${word} throughout.`;
}

/**
 * The displacement between two times, as the definite integral of v.
 * Difficulty 1 starts at t = 0 with v positive; difficulty 2 starts later, and
 * v may be negative throughout, making the displacement negative.
 */
const dispInt: Generator<IntervalParams> = {
  id: 'kin-disp-int',
  sample: (rng, difficulty) => sampleInterval(rng, difficulty, difficulty > 1 ? 0 : 1),
  choices: (params) => {
    const { v, from, to } = params;
    const F = integrated(v, 0);
    const d = displacementOver(params);
    // Slips: the bottom limit forgotten or added, the change in v, the trapezium rule on a curve.
    return numChoices(d, [polyAt(F, to), polyAt(F, to) + polyAt(F, from), polyAt(v, to) - polyAt(v, from), ((polyAt(v, from) + polyAt(v, to)) / 2) * (to - from), -d]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(moving(params.mover, 'v')), show(`v = ${polyTex(params.v)}`), say(`Find its displacement between $t = ${params.from}$ and $t = ${params.to}$.`)],
    lead: `\\int_{${params.from}}^{${params.to}} v \\, dt =`,
    keypad: WORKING_KEYS,
    answer: fmt(displacementOver(params)),
    integrand: polyMath(params.v, 'x'),
    limits: [params.from, params.to],
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => [
    { text: 'Displacement is the integral of velocity over the interval: integrate, then take the value at the bottom from the value at the top.' },
    { tex: bracketTex(params) },
  ],
};

/**
 * The same integral as a tree: the bracket at the top limit, at the bottom
 * limit, then their difference. Difficulty 2 has v negative throughout and
 * asks for the distance as well, which is the displacement's size.
 */
const intervalTree: Generator<IntervalParams> = {
  id: 'kin-interval-tree',
  sample: (rng, difficulty) => sampleInterval(rng, 2, difficulty > 1 ? -1 : 1, difficulty > 1 || rng.chance(0.5)),
  render: (params): Slide => {
    const { v, from, to } = params;
    const F = integrated(v, 0);
    const top = polyAt(F, to);
    const bottom = polyAt(F, from);
    const d = top - bottom;
    const negative = d < 0;
    const answer = negative ? [top, bottom, d, -d] : [top, bottom, d];
    return {
      kind: 'tree',
      prompt: [
        say(moving(params.mover, 'v')),
        show(`v = ${polyTex(v)}`),
        say(
          `Find its displacement between $t = ${from}$ and $t = ${to}$. Fill in the bracket at $t = ${to}$, at $t = ${from}$, then the displacement${negative ? ', then the distance it travels' : ''}.`,
        ),
      ],
      expression: aligned(`&\\int_{${from}}^{${to}} (${polyTex(v)}) \\, dt`, `&= \\Big[ ${polyTex(F)} \\Big]_{${from}}^{${to}}`),
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'd', from: ['top', 'bottom'] },
        ...(negative ? [{ id: 'distance', from: ['d'] }] : []),
      ],
      // Slips: the two ends added, taken the wrong way round, the change in v.
      bank: valueBank(answer, [top + bottom, bottom - top, polyAt(v, to) - polyAt(v, from)]),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const d = displacementOver(params);
    return [
      { tex: bracketTex(params) },
      ...(d < 0 ? [{ text: `It moves the negative way throughout, so the displacement is negative and the distance is its size, $${fmt(-d)}$.` }] : []),
    ];
  },
};

interface DistChoiceParams extends IntervalParams {
  ask: 'distance' | 'displacement';
  /** Difficulty 1 shows the graph, shaded over the interval. */
  picture: boolean;
}

/**
 * Which integral gives the distance, or the displacement: the sign v keeps on
 * the interval decides whether the distance needs a minus. Difficulty 1 shows
 * the graph with the interval shaded and always asks the distance;
 * difficulty 2 gives the formula alone, starts later, and asks either.
 */
const distChoice: Generator<DistChoiceParams> = {
  id: 'kin-dist-choice',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const params = sampleInterval(rng, difficulty, 0, true);
    return { ...params, ask: hard ? rng.pick(['distance', 'displacement'] as const) : 'distance', picture: !hard };
  },
  render: (params): Slide => {
    const { v, from, to, ask } = params;
    const positive = signOn(v, from, to) > 0;
    const integral = `\\int_{${from}}^{${to}} v \\, dt`;
    const right = { label: ask === 'displacement' || positive ? integral : `-${integral}`, correct: true };
    const wrong = [
      { label: ask === 'displacement' || positive ? `-${integral}` : integral },
      { label: `v(${to}) - v(${from})` },
      { label: from > 0 ? `\\int_{0}^{${to}} v \\, dt` : `\\tfrac{1}{2}\\big(v(${from}) + v(${to})\\big) \\times ${to - from}` },
    ];
    const prompt: Block[] = [
      say(moving(params.mover, 'v')),
      show(`v = ${polyTex(v)}`),
      say(
        ask === 'displacement'
          ? `Which of these gives its displacement between $t = ${from}$ and $t = ${to}$?`
          : `Which of these gives the distance it travels between $t = ${from}$ and $t = ${to}$?`,
      ),
    ];
    if (params.picture) prompt.push(figure(curveSvg((t) => polyAt(v, t), to + 1, 'A velocity-time graph, shaded over the interval asked about', { from, to })));
    return choiceSlide(prompt, [right, ...wrong], true);
  },
  solution: (params) => {
    const { ask } = params;
    const positive = signOn(params.v, params.from, params.to) > 0;
    return [
      { text: signReason(params) },
      {
        text:
          ask === 'displacement'
            ? 'The displacement is the integral of $v$ over the interval, whatever its sign.'
            : positive
              ? 'Moving the positive way throughout, the distance is the same as the displacement: the integral itself.'
              : 'Moving the negative way throughout, the integral comes out negative. The distance is its size, so it takes a minus sign.',
      },
    ];
  },
};

/**
 * A distance when v is negative throughout: the integral is negative and the
 * distance is its size. Difficulty 1 is linear from t = 0 and says v is
 * negative; difficulty 2 is quadratic from a later time and leaves the
 * learner to see it.
 */
const distInt: Generator<IntervalParams> = {
  id: 'kin-dist-int',
  sample: (rng, difficulty) => sampleInterval(rng, difficulty, -1, difficulty > 1),
  render: (params): Slide => {
    const { v, from, to } = params;
    return {
      kind: 'expression',
      prompt: [
        say(moving(params.mover, 'v')),
        show(`v = ${polyTex(v)}`),
        say(
          from === 0
            ? `Its velocity is negative from $t = ${from}$ to $t = ${to}$. Find the distance it travels between those times.`
            : `Find the distance it travels between $t = ${from}$ and $t = ${to}$.`,
        ),
      ],
      lead: '\\text{distance} =',
      keypad: WORKING_KEYS,
      answer: fmt(-displacementOver(params)),
      integrand: `-(${polyMath(v, 'x')})`,
      limits: [from, to],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => [
    ...(params.from === 0 ? [] : [{ text: signReason(params) }]),
    { text: 'The integral gives the displacement:' },
    { tex: bracketTex(params) },
    { text: `Negative, because it moves the negative way throughout. The distance is its size, $${fmt(-displacementOver(params))}$.` },
  ],
};

interface AreaSliderParams {
  mover: number;
  /** v, positive over the whole picture. */
  v: Poly;
  start: number;
  answer: number;
}

const AREA_END = 8;

/** How far it has gone from `start` to `t`. */
const goneBy = ({ v, start }: Pick<AreaSliderParams, 'v' | 'start'>, t: number): number =>
  polyAt(integrated(v, 0), t) - polyAt(integrated(v, 0), start);

/**
 * The time it has travelled a stated distance, slid to on its velocity-time
 * graph: the integral from the start to that time must come to the distance.
 * Difficulty 1 is linear from t = 0; difficulty 2 is quadratic from a later
 * start.
 */
const areaSlider: Generator<AreaSliderParams> = {
  id: 'kin-area-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const mover = rng.int(0, MOVERS.length - 1);
      const v = hard ? [3 * rng.int(1, 2), 2 * rng.int(-4, 2), rng.int(1, 12)] : [2 * rng.int(1, 3), rng.int(1, 9)];
      const start = hard ? rng.int(1, 2) : 0;
      if (signOn(v, 0, AREA_END) <= 0) continue;
      const answer = rng.int(start + 1, AREA_END - 1);
      const params = { mover, v, start, answer };
      const gone = goneBy(params, answer);
      if (!isTenth(gone) || gone > 500) continue;
      return params;
    }
  },
  render: (params): Slide => ({
    kind: 'slider',
    prompt: [
      say(moving(params.mover, 'v')),
      show(`v = ${polyTex(params.v)}`),
      say(
        `It moves the positive way throughout. The graph shows $v$ against $t$. Slide the line to the time it has travelled $${fmt(goneBy(params, params.answer))}$ m since $t = ${params.start}$.`,
      ),
    ],
    min: params.start,
    max: AREA_END,
    step: 0.5,
    answer: params.answer,
    readout: 't = {v}',
    figure: {
      svg: curveSvg((t) => polyAt(params.v, t), AREA_END, 'A velocity-time graph above the axis throughout'),
      ...markerWindow(0, AREA_END),
      axis: 'x',
    },
  }),
  solution: (params) => {
    const F = integrated(params.v, 0);
    const T = params.answer;
    const gone = goneBy(params, T);
    const base = polyAt(F, params.start);
    return [
      { text: `The distance since $t = ${params.start}$ is the integral of $v$ from $${params.start}$ up to the time $T$ asked for, here the area under the graph.` },
      { tex: aligned(`&\\int_{${params.start}}^{T} v \\, dt`, `&= \\Big[ ${polyTex(F)} \\Big]_{${params.start}}^{T}`) },
      { text: `Try whole seconds: at $T = ${T}$,` },
      { tex: aligned(`&${termValues(F, T)}${params.start === 0 ? '' : ` - ${par(base)}`}`, `&= ${fmt(gone)}`) },
      { text: `So $T = ${T}$.` },
    ];
  },
};

/* ================================================================
 * Level 4: variable acceleration
 * ================================================================ */

/** A polynomial in t, constant term first: `[2, 9, -6, 1]` is t^3 - 6t^2 + 9t + 2. */
export type Coeffs = number[];

/** Its value at t. */
export const evalAt = (p: Coeffs, t: number): number => p.reduce((sum, c, k) => sum + c * t ** k, 0);

/** Its derivative with respect to t. */
export const rateOf = (p: Coeffs): Coeffs => p.slice(1).map((c, k) => c * (k + 1));

/** The antiderivative worth `start` at t = 0. */
const growFrom = (p: Coeffs, start: number): Coeffs => [start, ...p.map((c, k) => c / (k + 1))];

/** The integral from a to b. */
const integralOf = (p: Coeffs, a: number, b: number): number => evalAt(growFrom(p, 0), b) - evalAt(growFrom(p, 0), a);

const isWhole = (p: Coeffs): boolean => p.every((c) => Number.isInteger(c));

/** c(t - r1)(t - r2)… multiplied out. */
function fromRoots(c: number, roots: number[]): Coeffs {
  let p: Coeffs = [c];
  for (const r of roots) p = [...p, 0].map((coef, k) => (k > 0 ? p[k - 1] : 0) - r * coef);
  return p.map((coef) => coef + 0);
}

/**
 * A coefficient's size as the learner reads it: a tenth as a decimal, and a
 * third or a sixth, which integrating a whole cubic leaves, as a fraction.
 */
function coefTex(size: number): string {
  if (isTenth(size)) return fmt(size);
  for (const q of [3, 6, 9]) {
    const n = Math.round(size * q);
    if (Math.abs(size * q - n) < 1e-9) return `\\tfrac{${n / gcdOrOne(n, q)}}{${q / gcdOrOne(n, q)}}`;
  }
  return fmt(size);
}

/**
 * `t^3 - 6t^2 + 9t + 2`, highest power first. Every prompt's polynomial has
 * whole coefficients, so mathjs parses what the learner reads; only worked
 * antiderivatives carry a fraction.
 */
function tPoly(p: Coeffs): string {
  const terms: string[] = [];
  for (let k = p.length - 1; k >= 0; k -= 1) {
    const c = p[k];
    if (c === 0) continue;
    const size = Math.abs(c);
    const power = k === 0 ? '' : k === 1 ? 't' : `t^${k}`;
    const body = k > 0 && size === 1 ? power : `${coefTex(size)}${power}`;
    terms.push(terms.length === 0 ? `${c < 0 ? '-' : ''}${body}` : `${c < 0 ? '-' : '+'} ${body}`);
  }
  return terms.length > 0 ? terms.join(' ') : '0';
}

/** The same polynomial in x for mathjs, for an `integrand`. */
const xPoly = (p: Coeffs): string => p.map((c, k) => `(${fmt(c)})*x^${k}`).join(' + ');

/** `3t(t - 2)(t + 1)`, a repeated root squared. */
function factored(c: number, roots: number[]): string {
  const counts = new Map<number, number>();
  for (const r of [...roots].sort((a, b) => a - b)) counts.set(r, (counts.get(r) ?? 0) + 1);
  const parts = [...counts].map(([r, n]) => {
    const base = r === 0 ? 't' : `(t ${signed(-r)})`;
    return n > 1 ? `${base}^${n}` : base;
  });
  return `${c === 1 ? '' : c === -1 ? '-' : fmt(c)}${parts.join('')}`;
}

/**
 * The polynomial's terms at a number, each worked out: `54 - 243 + 324 - 5`.
 * Values rather than each coefficient times a power, which ran a cubic off
 * a phone's width.
 */
function subbed(p: Coeffs, t: number): string {
  const values = p.map((c, k) => c * t ** k).reverse().filter((value) => value !== 0);
  return values.length > 0 ? values.map((value, k) => (k === 0 ? fmt(value) : signed(value))).join(' ') : '0';
}

/** A value worked out at one time, the time said in words so the line stays narrow. */
const valueAt = (letter: string, p: Coeffs, t: number): SolutionStep[] => [
  { text: `At $t = ${fmt(t)}$:` },
  { tex: `${letter} = ${subbed(p, t)} = ${fmt(evalAt(p, t))}` },
];

const ORDINAL = ['first', 'second', 'third'] as const;

/** The span of values a curve takes on [from, T], the axis included. */
function spanOf(f: (t: number) => number, T: number, from = 0): { lo: number; hi: number } {
  const values = Array.from({ length: 121 }, (_, i) => f(from + ((T - from) * i) / 120));
  return { lo: Math.min(0, ...values), hi: Math.max(0, ...values) };
}

interface CurveExtras {
  marks?: { x: number; y: number }[];
  /** Dashed straight lines, a tangent say. */
  lines?: ((t: number) => number)[];
  shade?: [number, number];
  /** Fit the window to the curve from here on, letting its start run off. */
  from?: number;
  /**
   * Squeeze the curve to about ten squares tall, so it always sits on squared
   * paper. Only for a graph read by eye with no equation and no values up the
   * side, where the height of a square carries nothing.
   */
  squeeze?: boolean;
}

/**
 * A curve against t on [0, T], its window fitted to the curve. Squared paper
 * only when there are few enough squares to count; the time is what a
 * learner reads off it, so a slider's readout carries the rest.
 */
function motionSvg(
  drawn: (t: number) => number,
  T: number,
  label: string,
  { marks = [], lines = [], shade, from = 0, squeeze = false }: CurveExtras = {},
): string {
  const whole = spanOf(drawn, T, from);
  const k = squeeze ? 10 / Math.max(10, whole.hi - whole.lo) : 1;
  const f = (t: number) => drawn(t) * k;
  const { lo, hi } = { lo: whole.lo * k, hi: whole.hi * k };
  const pad = Math.max(0.5, (hi - lo) * 0.08);
  return plotSvg({
    xMin: 0,
    xMax: T,
    yMin: lo - pad,
    yMax: hi + pad,
    grid: hi - lo <= 14,
    height: 170,
    curves: [{ f }, ...lines.map((g) => ({ f: (t: number) => g(t) * k, dashed: true }))],
    marks: marks.map(({ x, y }) => ({ x, y: y * k })),
    shade: shade && { f, from: shade[0], to: shade[1] },
    label,
  });
}

const sLine = (s: Coeffs): string => `At time $t$ seconds its displacement from $O$ is $s = ${tPoly(s)}$ m.`;
const vLine = (v: Coeffs): string => `At time $t$ seconds its velocity is $v = ${tPoly(v)}$ m/s.`;

/* ---------- lesson 1: at rest and turning round ---------- */

/** Motion with velocity c(t - p)(t - q), from s = s0: at rest at t = p and t = q. */
interface TurnParams {
  c: number;
  p: number;
  q: number;
  s0: number;
}

const turnV = ({ c, p, q }: TurnParams): Coeffs => fromRoots(c, [p, q]);
const turnS = (params: TurnParams): Coeffs => growFrom(turnV(params), params.s0);

/** A cubic displacement with whole coefficients, turning at whole times 1 <= p < q <= 6. */
function sampleTurn(rng: Rng): TurnParams {
  for (;;) {
    const p = rng.int(1, 4);
    const params = { c: rng.pick([-6, -3, -3, 3, 3, 6]), p, q: rng.int(p + 1, Math.min(p + 3, 6)), s0: rng.int(-5, 8) };
    if (isWhole(turnS(params))) return params;
  }
}

interface RestTimesParams extends TurnParams {
  fromS: boolean;
}

/**
 * The two times v = 0, from v at difficulty 1 and from s, differentiated
 * first, at difficulty 2.
 */
const restTimes: Generator<RestTimesParams> = {
  id: 'kin-rest-times',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { ...sampleTurn(rng), fromS: true };
    const p = rng.int(1, 5);
    return { c: nonZero(rng, 3), p, q: rng.int(p + 1, 7), s0: 0, fromS: false };
  },
  render: (params): Slide => {
    const { p, q, fromS } = params;
    const answer = [fmt(p), fmt(q)];
    return {
      kind: 'tiles',
      prompt: [say(`A particle moves in a straight line. ${fromS ? sLine(turnS(params)) : vLine(turnV(params))}`), say('Find the two times it is at rest.')],
      template: 't = {0} \\text{ and } t = {1}',
      bank: tokenBank(answer, [-p, -q, p + q, p * q, q - p, p + 1].map(fmt)),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const steps: SolutionStep[] = [];
    if (params.fromS) steps.push({ text: 'Differentiate $s$ to get the velocity:' }, { tex: `v = \\frac{ds}{dt} = ${tPoly(turnV(params))}` });
    steps.push(
      { text: 'At rest means $v = 0$. Factorise:' },
      { tex: `${factored(params.c, [params.p, params.q])} = 0` },
      { text: `So $t = ${params.p}$ or $t = ${params.q}$.` },
    );
    return steps;
  },
};

interface TurnPositionParams extends TurnParams {
  ask: 'first' | 'second' | 'between';
}

function turnPositionOf(params: TurnPositionParams): number {
  const s = turnS(params);
  if (params.ask === 'first') return evalAt(s, params.p);
  if (params.ask === 'second') return evalAt(s, params.q);
  return Math.abs(evalAt(s, params.q) - evalAt(s, params.p));
}

/**
 * Where the particle is when it turns round. Difficulty 2 asks the second
 * turn, or the distance between the two, which is one stretch in one
 * direction.
 */
const turnPosition: Generator<TurnPositionParams> = {
  id: 'kin-turn-position',
  sample: (rng, difficulty) => ({ ...sampleTurn(rng), ask: difficulty > 1 ? rng.pick(['second', 'between'] as const) : 'first' }),
  choices: (params) => {
    const s = turnS(params);
    const [sp, sq] = [evalAt(s, params.p), evalAt(s, params.q)];
    const answer = turnPositionOf(params);
    const slips = params.ask === 'between' ? [sq - sp, sp - sq, sq, sp] : [params.ask === 'first' ? sq : sp, answer - params.s0, -answer];
    return numChoices(answer, slips);
  },
  render: (params): Slide => {
    const asked = {
      first: 'Find its displacement from $O$ when it first turns round.',
      second: 'Find its displacement from $O$ the second time it turns round.',
      between: 'How far does it travel between the two times it turns round?',
    }[params.ask];
    return {
      kind: 'expression',
      prompt: [say(`A particle moves in a straight line. ${sLine(turnS(params))}`), say(asked)],
      lead: params.ask === 'between' ? '\\text{distance} =' : '\\text{displacement} =',
      keypad: WORKING_KEYS,
      answer: fmt(turnPositionOf(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const s = turnS(params);
    const { p, q } = params;
    const steps: SolutionStep[] = [
      { tex: `v = \\frac{ds}{dt} = ${tPoly(turnV(params))} = ${factored(params.c, [p, q])}` },
      { text: `$v = 0$ at $t = ${p}$ and $t = ${q}$, and changes sign at each, so it turns round at both.` },
    ];
    if (params.ask !== 'second') steps.push(...valueAt('s', s, p));
    if (params.ask !== 'first') steps.push(...valueAt('s', s, q));
    if (params.ask === 'between') {
      steps.push(
        { text: 'Between the two turns it moves one way only, so the distance is the change in $s$, without its sign:' },
        { tex: `|${fmt(evalAt(s, q))} - ${par(evalAt(s, p))}| = ${fmt(turnPositionOf(params))}` },
      );
    }
    return steps;
  },
};

/** Velocity c times a factor per root, asked about at t = r. */
interface TurnFlowParams {
  c: number;
  roots: number[];
  r: number;
}

type TurnKind = 'turn' | 'still' | 'moving';

/** How many times (t - r) divides v decides it: none, odd, even. */
function turnKind({ roots, r }: TurnFlowParams): TurnKind {
  const n = roots.filter((root) => root === r).length;
  return n === 0 ? 'moving' : n % 2 === 1 ? 'turn' : 'still';
}

/**
 * At rest, turning round, or neither, as two decisions: is v zero, and does
 * it change sign. A squared factor is at rest without turning. Difficulty 2
 * has three factors.
 */
const turnFlow: Generator<TurnFlowParams> = {
  id: 'kin-turn-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick(['turn', 'still', 'moving'] as const);
    for (;;) {
      const r = rng.int(1, 5);
      const other = () => rng.int(0, 6);
      const [m, n] = [other(), other()];
      if (m === r || n === r) continue;
      const roots = {
        turn: hard ? [r, m, rng.chance(0.5) ? m : n] : [r, m],
        still: hard ? [r, r, m] : [r, r],
        moving: hard ? [m, n, rng.chance(0.5) ? m : n] : [m, n],
      }[kind];
      const params = { c: nonZero(rng, 3), roots, r };
      if (turnKind(params) === kind) return params;
    }
  },
  render: (params): Slide => {
    const { c, roots, r } = params;
    const key = `${c}|${roots.join(',')}|${r}`;
    const kind = turnKind(params);
    return {
      kind: 'flow',
      prompt: [
        say(`A particle moves in a straight line. At time $t$ seconds its velocity is $v = ${factored(c, roots)}$ m/s.`),
        say(`Decide what it is doing at $t = ${r}$.`),
      ],
      subject: `t = ${r}`,
      steps: [
        {
          id: 'zero',
          ask: `What is $v$ at $t = ${r}$?`,
          branches: turned(
            [
              { label: 'Zero', to: 'sign' },
              { label: 'Not zero', outcome: 'Moving: it is not at rest at that moment.' },
            ],
            `${key}z`,
          ),
        },
        {
          id: 'sign',
          ask: `Does $v$ change sign as $t$ passes ${r}?`,
          branches: turned(
            [
              { label: 'Yes', outcome: 'At rest for an instant, and turning round.' },
              { label: 'No', outcome: 'At rest for an instant, then carrying on the same way.' },
            ],
            `${key}s`,
          ),
        },
      ],
      answer: kind === 'moving' ? ['Not zero'] : ['Zero', kind === 'turn' ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const { c, roots, r } = params;
    const value = evalAt(fromRoots(c, roots), r);
    const base = `(t ${signed(-r)})`;
    const kind = turnKind(params);
    return [
      { tex: `v(${r}) = ${fmt(value)}` },
      {
        text: {
          moving: `Not zero, so at $t = ${r}$ the particle is moving.`,
          turn: `The factor $${base}$ appears once, so it changes sign at $t = ${r}$ and takes $v$ with it: the particle turns round.`,
          still: `The factor $${base}$ appears squared, which is never negative, so $v$ has the same sign just before and just after: it stops for an instant and carries on.`,
        }[kind],
      },
    ];
  },
};

interface OriginParams {
  /** s = k(t - root)… */
  k: number;
  roots: number[];
  /** Which root is asked for. */
  ask: number;
  T: number;
}

const originS = ({ k, roots }: OriginParams): Coeffs => fromRoots(k, roots);

/**
 * When the particle is at O, slid to on its displacement-time graph. At
 * difficulty 1 it leaves O and comes back once; at difficulty 2 it passes
 * through O three times and one is asked for.
 */
const originSlider: Generator<OriginParams> = {
  id: 'kin-origin-slider',
  sample: (rng, difficulty) => {
    if (difficulty < 2) {
      const m = rng.int(2, 7);
      return { k: nonZero(rng, 3), roots: [0, m], ask: 1, T: m + rng.int(1, 2) };
    }
    const p = rng.int(1, 2);
    const q = p + rng.int(2, 3);
    const r = q + rng.int(2, 3);
    return { k: rng.pick([-1, 1]), roots: [p, q, r], ask: rng.int(0, 2), T: r + 1 };
  },
  render: (params): Slide => {
    const { roots, ask, T } = params;
    const s = originS(params);
    const three = roots.length > 2;
    return {
      kind: 'slider',
      prompt: three
        ? [
            say(`A particle's displacement from $O$ after $t$ seconds is $s = ${tPoly(s)}$ m, drawn below.`),
            say(`Slide the line to the ${ORDINAL[ask]} time it passes through $O$.`),
          ]
        : [say(`A particle leaves $O$ at $t = 0$. After $t$ seconds its displacement is $s = ${tPoly(s)}$ m.`), say('Slide the line to the time it is back at $O$.')],
      min: 0,
      max: T,
      step: 0.5,
      answer: roots[ask],
      readout: 't = {v}',
      figure: {
        svg: motionSvg((t) => evalAt(s, t), T, 'A curved displacement-time graph', { from: three ? roots[0] - 0.5 : 0 }),
        ...markerWindow(0, T),
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { k, roots, ask } = params;
    const t = roots[ask];
    if (roots.length > 2) {
      return [
        { text: 'At $O$ means $s = 0$: where the graph crosses the $t$-axis. The cubic factorises as' },
        { tex: `s = ${factored(k, roots)}` },
        { text: `so it is at $O$ at $t = ${roots.join('$, $t = ')}$. The ${ORDINAL[ask]} of these is $t = ${t}$.` },
      ];
    }
    return [
      { text: 'Back at $O$ means $s = 0$ again. Factorise:' },
      { tex: `${factored(k, roots)} = 0` },
      { text: `$t = 0$ is where it started, so it is back at $O$ at $t = ${t}$.` },
    ];
  },
};

/* ---------- lesson 2: maximum speed ---------- */

/** v = V - K(t - h)^2: greatest velocity V at t = h. */
interface PeakParams {
  K: number;
  h: number;
  V: number;
  s0: number;
  fromS: boolean;
}

const peakV = ({ K, h, V }: Pick<PeakParams, 'K' | 'h' | 'V'>): Coeffs => [V - K * h * h, 2 * K * h, -K];

/**
 * The greatest velocity as a tree: where a = 0, then v there. Difficulty 2
 * gives s, so v has to be found first.
 */
const peakTree: Generator<PeakParams> = {
  id: 'kin-peak-tree',
  sample: (rng, difficulty) => {
    if (difficulty < 2) return { K: rng.int(1, 3), h: rng.int(1, 5), V: rng.int(4, 30), s0: 0, fromS: false };
    return { K: rng.pick([3, 6]), h: rng.int(1, 4), V: rng.int(5, 40), s0: rng.int(-5, 8), fromS: true };
  },
  render: (params): Slide => {
    const { K, h, V, s0, fromS } = params;
    const v = peakV(params);
    return {
      kind: 'tree',
      prompt: [
        say(`A particle moves in a straight line. ${fromS ? sLine(growFrom(v, s0)) : vLine(v)}`),
        say('Fill in the time its acceleration is zero, then its greatest velocity.'),
      ],
      expression: 'v_{\\max} = v(t) \\text{ where } a = 0',
      nodes: [
        { id: 't', from: [] },
        { id: 'v', from: ['t'] },
      ],
      bank: valueBank([h, V], [2 * h, v[0], K * h, -V, V + K * h * h]),
      answer: [fmt(h), fmt(V)],
    };
  },
  solution: (params) => {
    const { K, h } = params;
    const v = peakV(params);
    const steps: SolutionStep[] = [];
    if (params.fromS) steps.push({ tex: `v = \\frac{ds}{dt} = ${tPoly(v)}` });
    steps.push(
      { tex: `a = \\frac{dv}{dt} = ${tPoly(rateOf(v))}` },
      { text: `$a = 0$ when $t = \\frac{${2 * K * h}}{${2 * K}} = ${h}$. Before that $a > 0$ and after it $a < 0$, so $v$ is greatest there.` },
      ...valueAt('v', v, h),
    );
    return steps;
  },
};

interface MaxVParams {
  K: number;
  h: number;
  V: number;
  fromA: boolean;
}

/**
 * The greatest velocity typed. Difficulty 2 gives the acceleration and the
 * starting velocity, so v is integrated first.
 */
const maxVelocity: Generator<MaxVParams> = {
  id: 'kin-max-velocity',
  sample: (rng, difficulty) => ({ K: rng.int(1, 4), h: rng.int(1, 5), V: rng.int(3, 30), fromA: difficulty > 1 }),
  choices: (params) => {
    const { K, h, V } = params;
    const v0 = peakV(params)[0];
    return numChoices(V, [v0, h, V + K * h * h, evalAt(peakV(params), h + 1)]);
  },
  render: (params): Slide => {
    const v = peakV(params);
    const start = v[0] === 0 ? 'It starts from rest.' : `Its velocity at $t = 0$ is $${fmt(v[0])}$ m/s.`;
    const told = params.fromA
      ? `At time $t$ seconds its acceleration is $a = ${tPoly(rateOf(v))}$ m/s². ${start}`
      : vLine(v);
    return {
      kind: 'expression',
      prompt: [say(`A particle moves in a straight line. ${told}`), say('Find its greatest velocity.')],
      lead: '\\text{greatest velocity} =',
      keypad: WORKING_KEYS,
      answer: fmt(params.V),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { h } = params;
    const v = peakV(params);
    const steps: SolutionStep[] = [];
    if (params.fromA) {
      steps.push({ text: `Integrate, with $v = ${fmt(v[0])}$ at $t = 0$:` }, { tex: `v = ${tPoly(v)}` });
    }
    steps.push(
      { text: `$a = ${tPoly(rateOf(v))} = 0$ when $t = ${h}$, where $a$ changes from positive to negative.` },
      ...valueAt('v', v, h),
    );
    return steps;
  },
};

/** v = c(t - h)^2 + m, on an interval [t1, t2]. */
interface SpeedParams {
  c: number;
  h: number;
  m: number;
  t1: number;
  t2: number;
  s0: number;
  fromS: boolean;
}

const speedV = ({ c, h, m }: Pick<SpeedParams, 'c' | 'h' | 'm'>): Coeffs => [c * h * h + m, -2 * c * h, c];

/** The times worth checking for the greatest speed: the ends, and where a = 0 if that is inside. */
function speedCandidates({ h, t1, t2 }: Pick<SpeedParams, 'h' | 't1' | 't2'>): number[] {
  return h > t1 && h < t2 ? [t1, h, t2] : [t1, t2];
}

const greatestSpeed = (params: SpeedParams): number =>
  Math.max(...speedCandidates(params).map((t) => Math.abs(evalAt(speedV(params), t))));

/** A velocity that changes sign, so the least velocity has a speed of its own. */
function sampleSpeed(rng: Rng, fromS: boolean): SpeedParams {
  const c = fromS ? rng.pick([-3, 3]) : nonZero(rng, 3);
  const h = rng.int(1, 4);
  return { c, h, m: -Math.sign(c) * rng.int(1, 12), t1: 0, t2: rng.int(h + 1, 6), s0: fromS ? rng.int(-4, 6) : 0, fromS };
}

/**
 * The candidates for the greatest speed, as a table: each end and the time
 * a = 0, with v and |v| at each. Difficulty 2 gives s.
 */
const speedTable: Generator<SpeedParams> = {
  id: 'kin-speed-table',
  sample: (rng, difficulty) => sampleSpeed(rng, difficulty > 1),
  render: (params): Slide => {
    const { h, t2, s0, fromS } = params;
    const v = speedV(params);
    const [v0, vh, vT] = [0, h, t2].map((t) => evalAt(v, t));
    const answer = [v0, Math.abs(v0), h, vh, Math.abs(vh), vT, Math.abs(vT)];
    return {
      kind: 'table',
      prompt: [
        say(`A particle moves in a straight line. ${fromS ? sLine(growFrom(v, s0)) : vLine(v)}`),
        say(`Its greatest speed for $0 \\le t \\le ${t2}$ is at an end or where $a = 0$. Fill in $v$ and the speed $|v|$ at each end, and the time $a = 0$ with $v$ and $|v|$ there.`),
      ],
      columns: ['t', 'v', '|v|'],
      rows: [
        ['0', null, null],
        [null, null, null],
        [fmt(t2), null, null],
      ],
      bank: valueBank(answer, [-v0, -vT, 2 * h, vh + 2 * params.c * h * h, -vh]),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { h, t2 } = params;
    const v = speedV(params);
    const steps: SolutionStep[] = [];
    if (params.fromS) steps.push({ tex: `v = \\frac{ds}{dt} = ${tPoly(v)}` });
    steps.push(
      { text: `$a = ${tPoly(rateOf(v))}$, which is zero at $t = ${h}$.` },
      { tex: aligned(...[0, h, t2].map((t) => `v(${t}) &= ${fmt(evalAt(v, t))}`)) },
      { text: `The greatest speed is the largest size, $${fmt(greatestSpeed(params))}$ m/s.` },
    );
    return steps;
  },
};

/**
 * The greatest speed on a closed interval, typed. At difficulty 2 the
 * interval need not start at 0, and a = 0 may fall outside it, where it does
 * not count.
 */
const intervalSpeed: Generator<SpeedParams> = {
  id: 'kin-interval-speed',
  sample: (rng, difficulty) => {
    for (;;) {
      let params: SpeedParams;
      if (difficulty < 2) params = sampleSpeed(rng, false);
      else {
        const t1 = rng.int(1, 3);
        const t2 = t1 + rng.int(2, 4);
        const h = rng.chance(0.5) ? rng.int(t1 + 1, t2 - 1) : rng.pick([rng.int(0, t1 - 1), rng.int(t2 + 1, t2 + 2)]);
        params = { c: nonZero(rng, 3), h, m: nonZero(rng, 12), t1, t2, s0: 0, fromS: false };
      }
      const speeds = speedCandidates(params).map((t) => Math.abs(evalAt(speedV(params), t)));
      const best = Math.max(...speeds);
      if (speeds.filter((speed) => speed === best).length === 1) return params;
    }
  },
  choices: (params) => {
    const v = speedV(params);
    const answer = greatestSpeed(params);
    const values = speedCandidates(params).map((t) => evalAt(v, t));
    return numChoices(answer, [Math.abs(params.m), Math.max(...values), ...values.map(Math.abs), -answer]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`A particle moves in a straight line. ${vLine(speedV(params))}`), say(`Find its greatest speed for $${params.t1} \\le t \\le ${params.t2}$.`)],
    lead: '\\text{greatest speed} =',
    keypad: WORKING_KEYS,
    answer: fmt(greatestSpeed(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { h, t1, t2 } = params;
    const v = speedV(params);
    const inside = h > t1 && h < t2;
    return [
      { text: `$a = ${tPoly(rateOf(v))}$, which is zero at $t = ${h}$${inside ? ', inside the interval.' : `, outside $${t1} \\le t \\le ${t2}$, so only the ends count.`}` },
      { tex: aligned(...speedCandidates(params).map((t) => `v(${t}) &= ${fmt(evalAt(v, t))}`)) },
      { text: `Speed is the size of $v$, so the greatest speed is $${fmt(greatestSpeed(params))}$ m/s.` },
    ];
  },
};

/* ---------- lesson 3: distance against displacement ---------- */

/** v = c(t - r)(t + n) on [0, T]: it changes sign once, at t = r. */
interface DistParams {
  c: number;
  r: number;
  n: number;
  T: number;
  /** Difficulty 1 shows v factorised, so the root is read off. */
  factorised: boolean;
}

const distV = ({ c, r, n }: DistParams): Coeffs => fromRoots(c, [r, -n]);

function distPieces(params: DistParams): { A1: number; A2: number; D: number; dist: number } {
  const v = distV(params);
  const A1 = integralOf(v, 0, params.r);
  const A2 = integralOf(v, params.r, params.T);
  return { A1, A2, D: A1 + A2, dist: Math.abs(A1) + Math.abs(A2) };
}

function sampleDist(rng: Rng, difficulty: number): DistParams {
  const hard = difficulty > 1;
  for (;;) {
    const r = rng.int(1, 4);
    const params = { c: nonZero(rng, 6), r, n: hard ? rng.int(1, 3) : 0, T: rng.int(r + 1, Math.min(r + 3, 6)), factorised: !hard };
    const { A1, A2, dist } = distPieces(params);
    if (isTenth(A1) && isTenth(A2) && dist <= 150) return params;
  }
}

const distLine = (params: DistParams): string => {
  const v = params.factorised ? factored(params.c, [params.r, -params.n]) : tPoly(distV(params));
  return `A particle moves in a straight line. At time $t$ seconds its velocity is $v = ${v}$ m/s.`;
};

/** Where v = 0, read from the factors or found by factorising. */
function rootStep(params: DistParams): SolutionStep {
  const where = params.n === 0 ? `$t = 0$ and $t = ${params.r}$` : `$t = ${params.r}$ and $t = ${-params.n}$`;
  return { text: `$v = ${factored(params.c, [params.r, -params.n])}$ is zero at ${where}, so inside the interval it changes sign only at $t = ${params.r}$.` };
}

/**
 * The displacement over an interval where v changes sign: one definite
 * integral, the sign kept. Declares its integrand and limits, the letter
 * renamed to x, so the quadrature oracle checks it.
 */
const dispIntegral: Generator<DistParams> = {
  id: 'kin-disp-integral',
  sample: sampleDist,
  choices: (params) => {
    const { A1, A2, D, dist } = distPieces(params);
    return numChoices(D, [dist, -D, A2, A1]);
  },
  render: (params): Slide => {
    const v = distV(params);
    return {
      kind: 'expression',
      prompt: [say(distLine(params)), say(`Find its displacement from $t = 0$ to $t = ${params.T}$.`)],
      lead: '\\text{displacement} =',
      keypad: WORKING_KEYS,
      answer: fmt(distPieces(params).D),
      integrand: xPoly(v),
      limits: [0, params.T],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const v = distV(params);
    const s = growFrom(v, 0);
    return [
      { text: 'Displacement is the one integral of $v$, signs and all:' },
      { tex: `\\int_{0}^{${params.T}} v\\,dt = \\Big[ ${tPoly(s)} \\Big]_{0}^{${params.T}}` },
      { tex: `= ${fmt(distPieces(params).D)}` },
      { text: 'It turns round on the way, so this is not the distance travelled.' },
    ];
  },
};

/**
 * The distance as a tree: the time it turns round, the signed displacement
 * either side, then their sizes added.
 */
const piecesTree: Generator<DistParams> = {
  id: 'kin-pieces-tree',
  sample: sampleDist,
  render: (params): Slide => {
    const { A1, A2, D, dist } = distPieces(params);
    const answer = [params.r, A1, A2, dist];
    return {
      kind: 'tree',
      prompt: [
        say(distLine(params)),
        say(`Fill in the time $r$ it turns round, the displacement from $t = 0$ to $r$ and from $r$ to $t = ${params.T}$, each with its sign, then the total distance.`),
      ],
      expression: `\\Big|\\int_{0}^{r} v\\,dt\\Big| + \\Big|\\int_{r}^{${params.T}} v\\,dt\\Big|`,
      nodes: [
        { id: 'r', from: [] },
        { id: 'A1', from: ['r'] },
        { id: 'A2', from: ['r'] },
        { id: 'D', from: ['A1', 'A2'] },
      ],
      bank: valueBank(answer, [D, -A1, -A2, Math.abs(D)]),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { A1, A2, dist } = distPieces(params);
    const s = growFrom(distV(params), 0);
    return [
      rootStep(params),
      { tex: `s = \\int v\\,dt = ${tPoly(s)}` },
      { tex: aligned(`\\int_{0}^{${params.r}} v\\,dt &= ${fmt(A1)}`, `\\int_{${params.r}}^{${params.T}} v\\,dt &= ${fmt(A2)}`) },
      { tex: `\\text{distance} = ${fmt(Math.abs(A1))} + ${fmt(Math.abs(A2))} = ${fmt(dist)}` },
    ];
  },
};

/** Which calculation gives the distance: split at the root, the negative piece made positive. */
const distOrDisp: Generator<DistParams> = {
  id: 'kin-dist-or-disp',
  sample: sampleDist,
  render: (params): Slide => {
    const { r, T } = params;
    const firstNegative = evalAt(distV(params), r / 2) < 0;
    const piece = (a: number | string, b: number | string) => `\\int_{${a}}^{${b}} v\\,dt`;
    const opts: Option[] = [
      { label: firstNegative ? `-${piece(0, r)} + ${piece(r, T)}` : `${piece(0, r)} - ${piece(r, T)}`, correct: true },
      { label: firstNegative ? `${piece(0, r)} - ${piece(r, T)}` : `-${piece(0, r)} + ${piece(r, T)}` },
      { label: piece(0, T) },
      { label: `${piece(0, r)} + ${piece(r, T)}` },
    ];
    return choiceSlide([say(distLine(params)), say(`Which calculation gives the total distance it travels from $t = 0$ to $t = ${T}$?`)], opts, true);
  },
  solution: (params) => {
    const firstNegative = evalAt(distV(params), params.r / 2) < 0;
    return [
      rootStep(params),
      {
        text: `Before $t = ${params.r}$, $v$ is ${firstNegative ? 'negative' : 'positive'}; after it, ${firstNegative ? 'positive' : 'negative'}. So split there, and make the negative piece positive before adding.`,
      },
      { text: 'One integral over the whole interval is the displacement: the two pieces partly cancel.' },
    ];
  },
};

/** The total distance typed, with the displacement among the slips. */
const distTotal: Generator<DistParams> = {
  id: 'kin-dist-total',
  sample: sampleDist,
  choices: (params) => {
    const { A1, A2, D, dist } = distPieces(params);
    return numChoices(dist, [D, Math.abs(D), Math.abs(A1), Math.abs(A2)]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(distLine(params)), say(`Find the total distance it travels from $t = 0$ to $t = ${params.T}$.`)],
    lead: '\\text{distance} =',
    keypad: WORKING_KEYS,
    answer: fmt(distPieces(params).dist),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { A1, A2, dist } = distPieces(params);
    return [
      rootStep(params),
      { tex: aligned(`\\int_{0}^{${params.r}} v\\,dt &= ${fmt(A1)}`, `\\int_{${params.r}}^{${params.T}} v\\,dt &= ${fmt(A2)}`) },
      { tex: `\\text{distance} = ${fmt(Math.abs(A1))} + ${fmt(Math.abs(A2))} = ${fmt(dist)}` },
    ];
  },
};

/** v = c times a factor per root, over [a, b]. */
interface SplitParams {
  c: number;
  roots: number[];
  a: number;
  b: number;
  factorised: boolean;
}

/** The root where v changes sign strictly inside (a, b), if there is one. */
function splitAt({ roots, a, b }: SplitParams): number | undefined {
  const inside = roots.filter((r) => r > a && r < b);
  return inside.length === 1 ? inside[0] : undefined;
}

/**
 * Whether to split the integral for the distance, and where: only where v
 * changes sign inside the interval. Difficulty 2 shows v multiplied out and
 * adds a squared factor, which touches zero without changing sign.
 */
const splitFlow: Generator<SplitParams> = {
  id: 'kin-split-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick(hard ? (['inside', 'outside', 'double'] as const) : (['inside', 'outside'] as const));
    const a = rng.int(0, 2);
    const b = a + rng.int(2, 4);
    const below = () => rng.int(a - 3, a - 1);
    const above = () => rng.int(b + 1, b + 3);
    const r = rng.int(a + 1, b - 1);
    const roots = {
      inside: [r, rng.chance(0.5) ? below() : above()],
      outside: rng.chance(0.5) ? [below(), above()] : [above(), above()],
      double: [r, r],
    }[kind];
    return { c: nonZero(rng, 3), roots: roots.sort((x, y) => x - y), a, b, factorised: !hard };
  },
  render: (params): Slide => {
    const { c, roots, a, b } = params;
    const at = splitAt(params);
    const key = `${c}|${roots.join(',')}|${a}|${b}`;
    const candidates = [...new Set([...roots, (a + b) / 2, a + 1, b - 1, b + 1])].slice(0, 3);
    const outcome = (x: number) => {
      if (x === at) return `Split there: the distance is $\\left|\\int_{${a}}^{${x}} v\\,dt\\right| + \\left|\\int_{${x}}^{${b}} v\\,dt\\right|$.`;
      if (roots.includes(x)) return `$v = 0$ at $t = ${fmt(x)}$, but $v$ keeps its sign through the interval there.`;
      return `$v$ is not zero at $t = ${fmt(x)}$.`;
    };
    const v = params.factorised ? factored(c, roots) : tPoly(fromRoots(c, roots));
    return {
      kind: 'flow',
      prompt: [
        say(`A particle moves in a straight line. At time $t$ seconds its velocity is $v = ${v}$ m/s.`),
        say(`Decide how to find the distance it travels from $t = ${a}$ to $t = ${b}$.`),
      ],
      subject: `${a} \\le t \\le ${b}`,
      steps: [
        {
          id: 'change',
          ask: `Does $v$ change sign between $t = ${a}$ and $t = ${b}$?`,
          branches: turned(
            [
              { label: 'Yes', to: 'where' },
              { label: 'No', outcome: `No split: the distance is $\\left|\\int_{${a}}^{${b}} v\\,dt\\right|$.` },
            ],
            `${key}c`,
          ),
        },
        {
          id: 'where',
          ask: 'Where does it change sign?',
          branches: turned(
            candidates.map((x) => ({ label: `$t = ${fmt(x)}$`, outcome: outcome(x) })),
            `${key}w`,
          ),
        },
      ],
      answer: at === undefined ? ['No'] : ['Yes', `$t = ${fmt(at)}$`],
    };
  },
  solution: (params) => {
    const { c, roots, a, b } = params;
    const at = splitAt(params);
    const zeros = [...new Set(roots)];
    const steps: SolutionStep[] = [
      { tex: `v = ${factored(c, roots)}` },
      { text: `$v = 0$ at $t = ${zeros.join('$ and $t = ')}$.` },
    ];
    if (at !== undefined) steps.push({ text: `Only $t = ${at}$ lies inside $${a} < t < ${b}$, and the factor there appears once, so $v$ changes sign: split the integral at $t = ${at}$.` });
    else if (roots.some((r) => r > a && r < b)) steps.push({ text: 'The factor inside the interval is squared, so $v$ touches zero without changing sign: one integral gives the distance.' });
    else steps.push({ text: `None of them lies inside $${a} < t < ${b}$, so $v$ keeps one sign there: one integral gives the distance.` });
    return steps;
  },
};

/* ---------- lesson 4: reading curved motion graphs ---------- */

interface GradParams {
  s: Coeffs;
  t0: number;
  T: number;
}

/**
 * The gradient of a curved displacement-time graph at a marked point, with
 * its tangent drawn: the velocity there. Difficulty 2 is a cubic.
 */
const curveGradient: Generator<GradParams> = {
  id: 'kin-curve-gradient',
  sample: (rng, difficulty) => {
    const s = difficulty > 1 ? [rng.int(-3, 5), rng.int(-8, 8), rng.int(-6, 6), rng.pick([-1, 1])] : [rng.int(-3, 5), rng.int(-6, 8), nonZero(rng, 3)];
    return { s, t0: rng.int(1, 4), T: 5 };
  },
  choices: ({ s, t0 }) => {
    const v0 = evalAt(rateOf(s), t0);
    return numChoices(v0, [evalAt(s, t0), evalAt(s, t0) / t0, evalAt(rateOf(rateOf(s)), t0), -v0]);
  },
  render: ({ s, t0, T }): Slide => {
    const y0 = evalAt(s, t0);
    const v0 = evalAt(rateOf(s), t0);
    return {
      kind: 'expression',
      prompt: [
        say(`The graph shows a particle's displacement $s = ${tPoly(s)}$ m from $O$ against time $t$ seconds, with the tangent at $t = ${t0}$ dashed.`),
        figure(motionSvg((t) => evalAt(s, t), T, 'A curved displacement-time graph with a dashed tangent at a marked point', { marks: [{ x: t0, y: y0 }], lines: [(t) => y0 + v0 * (t - t0)] })),
        say(`Find the gradient of the curve at $t = ${t0}$: the particle's velocity then.`),
      ],
      lead: '\\text{gradient} =',
      keypad: WORKING_KEYS,
      answer: fmt(v0),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ s, t0 }) => {
    const v = rateOf(s);
    return [
      { text: 'The gradient of a displacement-time graph is the velocity, $\\frac{ds}{dt}$:' },
      { tex: `\\frac{ds}{dt} = ${tPoly(v)}` },
      ...valueAt('v', v, t0),
    ];
  },
};

/** A curve and the whole or half times its gradient is zero. */
interface StationaryParams {
  f: Coeffs;
  /** Times the gradient is zero, in order. */
  roots: number[];
  ask: number;
  T: number;
}

/**
 * Difficulty 1: a quadratic, flat once at a whole or half time. Difficulty 2:
 * a cubic flat at two whole times, one of which is asked for.
 */
function sampleStationary(rng: Rng, difficulty: number): StationaryParams {
  if (difficulty > 1) {
    const turn = sampleTurn(rng);
    return { f: turnS(turn), roots: [turn.p, turn.q], ask: rng.int(0, 1), T: turn.q + rng.int(1, 2) };
  }
  for (;;) {
    const h = rng.int(2, 10) / 2;
    const k = nonZero(rng, 4);
    const f = [rng.int(-4, 10) + k * h * h, -2 * k * h, k];
    if (isWhole(f)) return { f, roots: [h], ask: 0, T: Math.ceil(h) + rng.int(1, 3) };
  }
}

function stationarySlider(id: string, letter: 's' | 'v'): Generator<StationaryParams> {
  const what = letter === 's' ? { graph: 'displacement', unit: 'm', event: 'the particle is at rest', rate: 'v = \\frac{ds}{dt}' } : { graph: 'velocity', unit: 'm/s', event: 'its acceleration is zero', rate: 'a = \\frac{dv}{dt}' };
  return {
    id,
    sample: sampleStationary,
    render: ({ f, roots, ask, T }): Slide => ({
      kind: 'slider',
      prompt: [
        say(`The graph shows a particle's ${what.graph} $${letter} = ${tPoly(f)}$ ${what.unit} against time $t$ seconds.`),
        say(`Slide the line to the ${roots.length > 1 ? `${ORDINAL[ask]} ` : ''}time ${what.event}.`),
      ],
      min: 0,
      max: T,
      step: 0.5,
      answer: roots[ask],
      readout: 't = {v}',
      figure: {
        svg: motionSvg((t) => evalAt(f, t), T, `A curved ${what.graph}-time graph`),
        ...markerWindow(0, T),
        axis: 'x',
      },
    }),
    solution: ({ f, roots, ask }) => [
      { text: `That is where the graph is flat: its gradient, $${what.rate}$, is zero.` },
      { tex: `${what.rate} = ${tPoly(rateOf(f))}` },
      { text: `This is zero at $t = ${roots.map(fmt).join('$ and $t = ')}$${roots.length > 1 ? `, and the ${ORDINAL[ask]} is $t = ${fmt(roots[ask])}$` : ''}.` },
    ],
  };
}

/** At rest where a displacement-time graph is flat. */
const flatSlider = stationarySlider('kin-flat-slider', 's');

/** Acceleration zero where a velocity-time graph is flat. */
const aZeroSlider = stationarySlider('kin-azero-slider', 'v');

interface AreaParams {
  v: Coeffs;
  T: number;
}

/**
 * The area under a curved velocity-time graph that stays above the axis:
 * the distance, and the displacement too. Declares its integrand and limits.
 * Difficulty 2 has a t term as well.
 */
const curveArea: Generator<AreaParams> = {
  id: 'kin-curve-area',
  sample: (rng, difficulty) => {
    for (;;) {
      const T = rng.int(1, 4);
      const v = [rng.int(1, 12), difficulty > 1 ? nonZero(rng, 6) : 0, rng.pick([-3, -1, 1, 3])];
      const area = integralOf(v, 0, T);
      if (!isTenth(area) || spanOf((t) => evalAt(v, t), T).lo < 0 || evalAt(v, T) <= 0) continue;
      if (Array.from({ length: 41 }, (_, i) => evalAt(v, (T * i) / 40)).some((y) => y <= 0)) continue;
      return { v, T };
    }
  },
  choices: ({ v, T }) => {
    const area = integralOf(v, 0, T);
    return numChoices(area, [evalAt(v, T), evalAt(v, T) * T, (evalAt(v, 0) + evalAt(v, T)) * T / 2, evalAt(rateOf(v), T)]);
  },
  render: ({ v, T }): Slide => ({
    kind: 'expression',
    prompt: [
      say(`The graph shows a particle's velocity $v = ${tPoly(v)}$ m/s against time $t$ seconds, with the area under it shaded from $t = 0$ to $t = ${T}$.`),
      figure(motionSvg((t) => evalAt(v, t), T, 'A curved velocity-time graph with the area under it shaded', { shade: [0, T] })),
      say('Find the distance it travels in that time.'),
    ],
    lead: '\\text{distance} =',
    keypad: WORKING_KEYS,
    answer: fmt(integralOf(v, 0, T)),
    integrand: xPoly(v),
    limits: [0, T],
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ v, T }) => [
    { text: 'The area under a velocity-time graph is the distance. The curve stays above the axis, so one integral gives it:' },
    { tex: `\\int_{0}^{${T}} v\\,dt = \\Big[ ${tPoly(growFrom(v, 0))} \\Big]_{0}^{${T}}` },
    { tex: `= ${fmt(integralOf(v, 0, T))}` },
  ],
};

interface GraphChoiceParams extends TurnParams {
  times: number[];
  ask: 'rest' | 'fastest' | 'back' | 'forward';
  answer: number;
  T: number;
}

/** The marked times answering the question; exactly one is wanted. */
function graphMatches(params: TurnParams & Pick<GraphChoiceParams, 'times' | 'ask'>): number[] {
  const v = turnV(params);
  const at = params.times.map((t) => evalAt(v, t));
  const speeds = at.map(Math.abs);
  const best = Math.max(...speeds);
  switch (params.ask) {
    case 'rest':
      return params.times.filter((_, k) => at[k] === 0);
    case 'back':
      return params.times.filter((_, k) => at[k] < 0);
    case 'forward':
      return params.times.filter((_, k) => at[k] > 0);
    case 'fastest':
      // Clearly fastest, so it can be seen on the graph rather than argued over.
      return speeds.filter((speed) => speed * 1.5 > best).length === 1 ? params.times.filter((_, k) => speeds[k] === best) : [];
  }
}

/**
 * Reading a curved displacement-time graph by eye, with no equation: which
 * marked moment is at rest, or fastest, or at difficulty 2 moving one way.
 */
const graphChoice: Generator<GraphChoiceParams> = {
  id: 'kin-graph-choice',
  sample: (rng, difficulty) => {
    const asks = difficulty > 1 ? (['back', 'forward', 'fastest'] as const) : (['rest', 'fastest'] as const);
    for (;;) {
      const turn = sampleTurn(rng);
      const times = rng.sample(Array.from({ length: turn.q + 2 }, (_, k) => k), 3).sort((a, b) => a - b);
      const ask = rng.pick(asks);
      const matches = graphMatches({ ...turn, times, ask });
      // Half a second past the last point of interest, so the curve's far arm does not squash the rest.
      if (matches.length === 1) return { ...turn, times, ask, answer: matches[0], T: Math.max(turn.q, times[2]) + 0.5 };
    }
  },
  render: (params): Slide => {
    const s = turnS(params);
    const question = {
      rest: 'At which of them is the particle at rest?',
      fastest: 'At which of them is it moving fastest?',
      back: 'At which of them is it moving the negative way?',
      forward: 'At which of them is it moving the positive way?',
    }[params.ask];
    const others = params.times.filter((t) => t !== params.answer);
    return choiceSlide(
      [
        say(`The graph shows a particle's displacement $s$ m from $O$ against time $t$ seconds, with three moments marked. ${question}`),
        figure(
          motionSvg((t) => evalAt(s, t), params.T, 'A curved displacement-time graph with three marked points', {
            marks: params.times.map((t) => ({ x: t, y: evalAt(s, t) })),
            squeeze: true,
          }),
        ),
      ],
      [params.answer, ...others].map((t) => ({ label: `t = ${t}`, correct: t === params.answer })),
      true,
    );
  },
  solution: (params) => {
    const v = turnV(params);
    return [
      {
        text: {
          rest: 'At rest where the graph is flat: its gradient, the velocity, is zero.',
          fastest: 'Fastest where the graph is steepest, uphill or down.',
          back: 'Moving the negative way where the graph slopes down.',
          forward: 'Moving the positive way where the graph slopes up.',
        }[params.ask],
      },
      { text: `The graph is $s = ${tPoly(turnS(params))}$, so $v = ${tPoly(v)}$:` },
      { tex: aligned(...params.times.map((t) => `v(${t}) &= ${fmt(evalAt(v, t))}`)) },
      { text: `So the answer is $t = ${params.answer}$.` },
    ];
  },
};

/* ---------- lesson 5: putting it together ---------- */

/** a = 2kt + b, with v = u at t = 0 and starting at O. */
interface ChainParams {
  k: number;
  b: number;
  u: number;
  T: number;
  toS: boolean;
}

const chainV = ({ k, b, u }: ChainParams): Coeffs => [u, b, k];
const chainAnswer = (params: ChainParams): number =>
  params.toS ? evalAt(growFrom(chainV(params), 0), params.T) : evalAt(chainV(params), params.T);

/**
 * From the acceleration and the starting velocity to v at a given time, or at
 * difficulty 2, integrating twice, to the displacement.
 */
const chainVelocity: Generator<ChainParams> = {
  id: 'kin-chain-velocity',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = { k: nonZero(rng, 3), b: nonZero(rng, 6), u: rng.int(0, 10), T: rng.int(1, difficulty > 1 ? 4 : 5), toS: difficulty > 1 };
      if (isTenth(chainAnswer(params)) && chainAnswer(params) !== 0) return params;
    }
  },
  choices: (params) => {
    const { k, b, u, T } = params;
    const answer = chainAnswer(params);
    const aT = 2 * k * T + b;
    const slips = params.toS ? [answer - u * T, u * T + b * T * T + k * T ** 3, evalAt(chainV(params), T)] : [answer - u, u + b * T + 2 * k * T * T, aT];
    return numChoices(answer, [...slips, -answer]);
  },
  render: (params): Slide => {
    const { u, T, toS } = params;
    const start = toS
      ? u === 0
        ? 'It starts from rest at $O$.'
        : `It starts at $O$ with velocity $${u}$ m/s.`
      : u === 0
        ? 'It starts from rest.'
        : `Its velocity at $t = 0$ is $${u}$ m/s.`;
    return {
      kind: 'expression',
      prompt: [
        say(`A particle moves in a straight line. At time $t$ seconds its acceleration is $a = ${tPoly(rateOf(chainV(params)))}$ m/s². ${start}`),
        say(toS ? `Find its displacement from $O$ at $t = ${T}$.` : `Find its velocity at $t = ${T}$.`),
      ],
      lead: toS ? '\\text{displacement} =' : '\\text{velocity} =',
      keypad: WORKING_KEYS,
      answer: fmt(chainAnswer(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const v = chainV(params);
    const steps: SolutionStep[] = [
      { text: `Integrate $a$, and use $v = ${params.u}$ at $t = 0$ for the constant:` },
      { tex: `v = ${tPoly(v)}` },
    ];
    if (params.toS) {
      const s = growFrom(v, 0);
      steps.push(
        { text: 'Integrate again; it starts at $O$, so the constant is 0:' },
        { tex: `s = ${tPoly(s)}` },
        ...valueAt('s', s, params.T),
      );
    } else steps.push(...valueAt('v', v, params.T));
    return steps;
  },
};

/** The answer's coefficients, constant first; the constant is the starting value. */
interface IntegrateParams {
  coeffs: Coeffs;
}

/**
 * Integrating with a starting value, as a form: v from a at difficulty 1, s
 * from v at difficulty 2. Tiles, since the checker would accept any equal
 * function and the form is the point. The leading coefficient is kept
 * positive so it never sits in the bank beside a signed tile that draws the
 * same.
 */
const integrateTiles: Generator<IntegrateParams> = {
  id: 'kin-integrate-tiles',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { coeffs: [nonZero(rng, 6), nonZero(rng, 8), nonZero(rng, 5), rng.int(2, 3)] }
      : { coeffs: [nonZero(rng, 8), nonZero(rng, 6), rng.int(2, 4)] },
  render: ({ coeffs }): Slide => {
    const toS = coeffs.length > 3;
    const given = rateOf(coeffs);
    const [start, ...rest] = coeffs;
    const lead = rest[rest.length - 1];
    const middle = rest.slice(0, -1).reverse();
    const answer = [fmt(lead), ...middle.map(signed), signed(start)];
    const extras = [fmt(lead * rest.length), signed(-start), ...middle.map((c) => signed(-c)), ...middle.map((c) => signed(2 * c))];
    return {
      kind: 'tiles',
      prompt: [
        say(
          toS
            ? `A particle moves in a straight line. At time $t$ seconds its velocity is $v = ${tPoly(given)}$ m/s, and when $t = 0$ it is at $s = ${start}$ m.`
            : `A particle moves in a straight line. At time $t$ seconds its acceleration is $a = ${tPoly(given)}$ m/s², and when $t = 0$ its velocity is $${start}$ m/s.`,
        ),
        say(toS ? 'Integrate to find its displacement $s$.' : 'Integrate to find its velocity $v$.'),
      ],
      template: toS ? 's = {0}t^3 {1}t^2 {2}t {3}' : 'v = {0}t^2 {1}t {2}',
      bank: tokenBank(answer, extras, 4),
      answer,
    };
  },
  solution: ({ coeffs }) => {
    const toS = coeffs.length > 3;
    return [
      { text: 'Raise each power by one and divide by the new power:' },
      { tex: `${toS ? 's' : 'v'} = ${tPoly([0, ...coeffs.slice(1)])} + c` },
      { text: `When $t = 0$ everything but $c$ is zero, so $c = ${coeffs[0]}$.` },
      { tex: `${toS ? 's' : 'v'} = ${tPoly(coeffs)}` },
    ];
  },
};

/** v = k(T - t)(t + n): moving the positive way until it stops at t = T. */
interface StopParams {
  k: number;
  T: number;
  n: number;
  s0: number;
}

const stopV = ({ k, T, n }: StopParams): Coeffs => fromRoots(-k, [T, -n]);
const stopDisp = (params: StopParams): number => integralOf(stopV(params), 0, params.T);

/**
 * From the acceleration and a start to when it next stops and how far it
 * went, as a tree. Difficulty 2 starts away from O, so the position follows.
 */
const stopTree: Generator<StopParams> = {
  id: 'kin-stop-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const params = { k: rng.int(1, 6), T: rng.int(2, 6), n: hard ? rng.int(1, 3) : rng.int(0, 2), s0: hard ? nonZero(rng, 6) : 0 };
      if (isTenth(stopDisp(params)) && stopDisp(params) <= 150) return params;
    }
  },
  render: (params): Slide => {
    const { T, s0 } = params;
    const v = stopV(params);
    const S = stopDisp(params);
    const hard = s0 !== 0;
    const answer = hard ? [T, S, s0 + S] : [T, S];
    const start = v[0] === 0 ? 'starts from rest' : `has velocity $${fmt(v[0])}$ m/s`;
    return {
      kind: 'tree',
      prompt: [
        say(`A particle moves in a straight line. At time $t$ seconds its acceleration is $a = ${tPoly(rateOf(v))}$ m/s².`),
        say(hard ? `When $t = 0$ it is at $s = ${s0}$ m and ${start}.` : `When $t = 0$ it is at $O$ and ${start}.`),
        say(
          hard
            ? 'Fill in the time it next comes to rest, its displacement over that time, then its position $s$ then.'
            : 'Fill in the time it next comes to rest, then how far it has travelled by then.',
        ),
      ],
      expression: 'v = \\int a\\,dt, \\quad s = \\int v\\,dt',
      nodes: hard
        ? [
            { id: 'T', from: [] },
            { id: 'S', from: ['T'] },
            { id: 'P', from: ['S'] },
          ]
        : [
            { id: 'T', from: [] },
            { id: 'S', from: ['T'] },
          ],
      bank: valueBank(answer, [T / 2, 2 * S, -S, s0 - S, T + 1]),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { k, T, n, s0 } = params;
    const v = stopV(params);
    const S = stopDisp(params);
    const steps: SolutionStep[] = [
      { text: `Integrate $a$, with $v = ${fmt(v[0])}$ at $t = 0$:` },
      { tex: `v = ${tPoly(v)} = ${factored(-k, [T, -n])}` },
      { text: `$v = 0$ next at $t = ${T}$, and it is positive until then, so it moves one way and the distance is the displacement.` },
      { text: `Integrate again, from $s = 0$ at $t = 0$:` },
      { tex: `s = ${tPoly(growFrom(v, 0))}` },
      { tex: `\\int_{0}^{${T}} v\\,dt = s(${T}) - s(0) = ${fmt(S)}` },
    ];
    if (s0 !== 0) steps.push({ tex: `s = ${s0} + ${fmt(S)} = ${fmt(s0 + S)}` });
    return steps;
  },
};

/**
 * A chain of equalities, `a = b = c`, one step to a line. Worked lines here
 * run to three or four equals signs with units of working in each, which at
 * phone width scrolls sideways; stacked, each line holds one step. A line
 * already aligned, or holding a `\\quad`, is laid out by hand and kept.
 */
function stacked(tex: string): string {
  if (tex.includes('&') || tex.includes('\\quad')) return tex;
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < tex.length; i++) {
    if (tex[i] === '{') depth++;
    else if (tex[i] === '}') depth--;
    else if (depth === 0 && tex.startsWith(' = ', i)) {
      parts.push(tex.slice(start, i));
      start = i + 3;
    }
  }
  parts.push(tex.slice(start));
  if (parts.length < 3) return tex;
  return aligned(`${parts[0]} &= ${parts[1]}`, ...parts.slice(2).map((part) => `&= ${part}`));
}

/** The same generator with its worked solution stacked by `stacked`. */
function tidied<P>(generator: Generator<P>): Generator<P> {
  return { ...generator, solution: (params) => generator.solution(params).map((step) => (step.tex ? { ...step, tex: stacked(step.tex) } : step)) };
}

export const kinematicsGenerators: Generator<never>[] = ([
  disp,
  signFlow,
  lineSlider,
  motionChoice,
  avgTree,
  avgVelSteps,
  meanSpeedGen,
  setupTiles,
  stGradient,
  stSlider,
  stTable,
  stChoice,
  vtAccel,
  vtTree,
  vtTiles,
  speedingFlow,
  distArea,
  trapSteps,
  stagesTree,
  netDisp,
  vuatTiles,
  vuat,
  suatSteps,
  suatTree,
  suatFind,
  v2,
  vsqTree,
  uvtTiles,
  uvt,
  whichFlow,
  whichChoice,
  solveMixed,
  signsTiles,
  gravHeight,
  gravSteps,
  topTree,
  gravSlider,
  stageTable,
  catchTree,
  twoStageSteps,
  catchTimeGen,
  dsDt,
  dsTiles,
  vAt,
  vTable,
  vSlider,
  aDt,
  aAt,
  accelFlow,
  aTiles,
  vaTable,
  expV,
  expStart,
  expTree,
  expFlow,
  intV,
  intCTree,
  intSTiles,
  intVAt,
  intSTable,
  dispInt,
  intervalTree,
  distChoice,
  distInt,
  areaSlider,
  restTimes,
  turnPosition,
  turnFlow,
  originSlider,
  peakTree,
  maxVelocity,
  speedTable,
  intervalSpeed,
  dispIntegral,
  piecesTree,
  distOrDisp,
  distTotal,
  splitFlow,
  curveGradient,
  flatSlider,
  aZeroSlider,
  curveArea,
  graphChoice,
  chainVelocity,
  integrateTiles,
  stopTree,
] as Generator<never>[]).map(tidied);
