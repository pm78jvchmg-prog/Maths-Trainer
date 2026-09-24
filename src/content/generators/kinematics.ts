/**
 * Kinematics (roadmap C20), the first course in the Mechanics tab.
 *
 * Level 1 is motion graphs: displacement against distance and velocity
 * against speed along a line, average speed and velocity over a journey, the
 * gradient of a displacement-time graph as velocity, the gradient of a
 * velocity-time graph as acceleration, and the area under one as the distance
 * travelled. Level 2 is constant acceleration: the suvat equations, choosing
 * one from what is given, vertical motion under gravity with g = 9.8, and
 * journeys in two stages or with one particle catching another.
 *
 * Three rules hold everywhere in this file.
 *
 * - Every answer is exact: whole, or one decimal place. u, a and t are drawn
 *   whole and paired so s is whole; under gravity u is a multiple of 4.9 and t
 *   is whole, so every height and speed lands on one decimal. A draw that
 *   would not is refused at sampling, never rounded.
 * - Units live in the prompt prose only. mathjs reads `m` as a variable, so no
 *   template, tile or answer ever carries one.
 * - Nothing declares `source`, `integrand` or `limits`. No answer here is a
 *   derivative or an integral of a mathjs function of x, and the oracles in
 *   `generators.test.ts` would grade it as one (PITFALLS 2.2).
 *   `kinematics.test.ts` recomputes the answers by routes of its own instead.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { fmt } from './numericalMethods';
import { stepBank, tokenBank } from './parametricImplicit';

/* ================================================================
 * Shared helpers
 * ================================================================ */

const say = (text: string): Block => ({ kind: 'prose', text });

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
      keypad: [],
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
      keypad: [],
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
    keypad: [],
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
    keypad: [],
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
    keypad: [],
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
      keypad: [],
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
    keypad: [],
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
      keypad: [],
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
      keypad: [],
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
      keypad: [],
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
    keypad: [],
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
      keypad: [],
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
      keypad: [],
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
] as Generator<never>[]).map(tidied);
