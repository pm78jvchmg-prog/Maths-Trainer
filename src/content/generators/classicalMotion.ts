/**
 * Classical Mechanics, level 1: Describing Motion (`clm-l1`).
 *
 * Speeds in two units, average speed over a race, closing speeds, stopping
 * distances, and stepping motion forward in time. Kinematics (motion graphs
 * and the suvat equations) is used here, not taught again: a braking distance
 * is its v^2 = u^2 + 2as with v = 0.
 *
 * Every given value is one a textbook prints, whole or one decimal place.
 * Speeds given in km h^-1 are 3.6 times a whole or half m s^-1, so a
 * conversion never rounds, and most quotients are drawn to terminate through
 * `until`. A lap time, whose natural length and speed never divide out, is
 * asked to 1 decimal place instead and rounded. Nothing here is calculus, so no slide
 * declares `source`; `classicalMotion.test.ts` recomputes every answer by a
 * route of its own.
 */
import type { Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { turned } from './parametricImplicit';
import { gcd } from './format';
import {
  dots,
  askPrecision,
  exact,
  fixed,
  fmt,
  forks,
  kmh,
  metres,
  ms,
  ms2,
  numChoices,
  roundTo,
  roundedWell,
  salted,
  say,
  secs,
  show,
  track,
  typed,
  typedRounded,
  until,
  valueBank,
  type Precision,
} from './classicalKit';

/** A bank of tidy values: distractors that are not short exact decimals are left out. */
const tidyBank = (answer: number[], wrong: number[], spare = 3): string[] =>
  valueBank(
    answer,
    wrong.filter((v) => v > 0 && exact(v, 2)),
    spare,
  );

/** km h^-1 from m s^-1. */
const toKmh = (v: number): number => Number((v * 3.6).toFixed(6));

/* ================================================================
 * Speeds and units
 * ================================================================ */

const SLOW = ['a cyclist', 'a sprinter', 'a horse', 'a rowing boat', 'a skater'];
const MEDIUM = ['a car on a main road', 'a delivery van', 'a motorbike', 'a bus on a bypass', 'a lorry on a motorway'];
const FAST = ['a Formula One car on the main straight', 'a high-speed train', 'a racing motorbike', 'a light aircraft at take-off'];

const moverFor = (rng: Rng, v: number): string => rng.pick(v <= 15 ? SLOW : v <= 38 ? MEDIUM : FAST);

interface ConvertParams {
  who: string;
  /** The speed in m s^-1. */
  v: number;
  to: 'ms' | 'kmh';
}

/** Expression: a speed from km h^-1 to m s^-1 (easy), or either way with halves (hard). */
const kmhConvert: Generator<ConvertParams> = {
  id: 'clm-kmh-convert',
  sample: (rng, difficulty) => {
    const v = difficulty > 1 ? rng.int(10, 150) / 2 : rng.int(5, 70);
    return { who: moverFor(rng, v), v, to: difficulty > 1 ? rng.pick<ConvertParams['to']>(['ms', 'kmh']) : 'ms' };
  },
  render: ({ who, v, to }) =>
    to === 'ms'
      ? typed([say(`${who[0].toUpperCase()}${who.slice(1)} is timed at ${kmh(toKmh(v))}. What is that in $\\text{m s}^{-1}$?`)], 'v =', v)
      : typed([say(`${who[0].toUpperCase()}${who.slice(1)} is moving at ${ms(v)}. What is that in $\\text{km h}^{-1}$?`)], 'v =', toKmh(v)),
  solution: ({ v, to }) => [
    { text: 'One metre each second is $3600\\text{ m}$ an hour, which is $3.6\\text{ km}$ an hour.' },
    to === 'ms'
      ? { tex: `v = ${fmt(toKmh(v))} \\div 3.6 = ${fmt(v)}` }
      : { tex: `v = ${fmt(v)} \\times 3.6 = ${fmt(toKmh(v))}` },
  ],
  choices: ({ v, to }) => {
    const k = toKmh(v);
    return to === 'ms'
      ? numChoices(v, [k * 3.6, k / 60, k / 6, 2 * v], salted(v, 1))
      : numChoices(k, [v / 3.6, v * 60, 36 * v, 2 * k], salted(v, 2));
  },
};

interface LapParams {
  /** Lap length in km, one decimal place. */
  L: number;
  /** Easy: the average speed, whole km h^-1. Hard: the lap time, whole seconds. */
  given: number;
  find: 't' | 'v';
}

/** Lap times and speeds are asked to 1 decimal place. */
const LAP_DP: Precision = { dp: 1 };

/** The lap time in seconds (easy) or the average speed in km h^-1 (hard), unrounded. */
// Seconds are 3600 L over the speed in km h^-1; km h^-1 are 3600 L over the seconds. The same quotient, either way round.
const lapAnswer = ({ L, given }: LapParams): number => (3600 * L) / given;

/**
 * Whether the answer comes out the same when the learner carries the speed in
 * m s^-1 rounded to 2 or 3 decimal places into the next line, rather than
 * the exact value: easy divides the metres by given / 3.6, hard multiplies
 * metres / given by 3.6.
 */
function lapCarriesWell(p: LapParams): boolean {
  const m = Math.round(p.L * 1000);
  const want = roundTo(lapAnswer(p), LAP_DP);
  return [2, 3].every((dp) => {
    const carried = p.find === 't' ? m / roundTo(p.given / 3.6, { dp }) : roundTo(m / p.given, { dp }) * 3.6;
    return roundTo(carried, LAP_DP) === want;
  });
}


/** Expression: lap time from lap length and average speed in km h^-1, or (hard) the average speed, each to 1 decimal place. */
const lapTime: Generator<LapParams> = {
  id: 'clm-lap-time',
  sample: (rng, difficulty) =>
    until(
      () => {
        const find = difficulty > 1 ? ('v' as const) : ('t' as const);
        return { L: rng.int(30, 70) / 10, given: find === 't' ? rng.int(150, 260) : rng.int(70, 120), find };
      },
      (p) => {
        const x = lapAnswer(p);
        return roundedWell(x, LAP_DP) && lapCarriesWell(p) && (p.find === 't' ? x >= 50 && x <= 150 : x >= 120 && x <= 300);
      },
    ),
  render: (p) => {
    const { L, given, find } = p;
    return find === 't'
      ? typedRounded(
          [say(`A lap of a circuit is $${fmt(L)}\\text{ km}$. A car laps it at an average of ${kmh(given)}. How long does the lap take, in seconds? ${askPrecision(LAP_DP)}`)],
          't =',
          lapAnswer(p),
          LAP_DP,
        )
      : typedRounded(
          [say(`A car covers a $${fmt(L)}\\text{ km}$ lap in ${secs(given)}. Find its average speed in $\\text{km h}^{-1}$. ${askPrecision(LAP_DP)}`)],
          'v =',
          lapAnswer(p),
          LAP_DP,
        );
  },
  solution: (p) => {
    const { L, given, find } = p;
    const m = Math.round(L * 1000);
    const metresLine = { tex: `${fmt(L)}\\text{ km} = ${m}\\text{ m}` };
    if (find === 't') {
      const v = given / 3.6;
      return [
        { text: 'Work in metres and seconds.' },
        metresLine,
        { tex: `${given} \\div 3.6 = ${dots(v)}` },
        { tex: `t = \\frac{${m}}{${dots(v)}} = ${dots(lapAnswer(p), 3)}` },
        { text: 'To 1 decimal place:' },
        { tex: `t = ${fixed(lapAnswer(p), LAP_DP)}` },
      ];
    }
    return [
      metresLine,
      { tex: `v = \\frac{${m}}{${given}} = ${dots(m / given)}\\text{ m s}^{-1}` },
      { text: 'Then to kilometres an hour:' },
      { tex: `${dots(m / given)} \\times 3.6 = ${dots(lapAnswer(p), 3)}` },
      { text: 'To 1 decimal place:' },
      { tex: `v = ${fixed(lapAnswer(p), LAP_DP)}` },
    ];
  },
  choices: (p) => {
    const x = lapAnswer(p);
    const r = (v: number) => roundTo(v, LAP_DP);
    const m = p.L * 1000;
    return p.find === 't'
      ? numChoices(r(x), [r(m / p.given), r(x * 3.6), r(x / 3.6), r(x + 10)], salted(p.L * 10, p.given), LAP_DP)
      : numChoices(r(x), [r(m / p.given), r(x / 3.6), r(x + 36)], salted(p.given, p.L * 10), LAP_DP);
  },
};

interface SpeedRow {
  v: number;
  blank: 'ms' | 'kmh';
}

/** Table: three speeds each written in both units, one of the pair missing from each row. */
const speedTable: Generator<{ rows: SpeedRow[] }> = {
  id: 'clm-speed-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const blanks: SpeedRow['blank'][] = hard ? turned(['ms', 'kmh', rng.pick<SpeedRow['blank']>(['ms', 'kmh'])], rng.int(0, 2)) : ['ms', 'ms', 'ms'];
    return until(
      () => ({ rows: blanks.map((blank) => ({ v: hard ? rng.int(10, 150) / 2 : rng.int(5, 60), blank })) }),
      ({ rows }) => new Set(rows.map((r) => r.v)).size === 3,
    );
  },
  render: ({ rows }) => {
    const answer: number[] = [];
    const cell = (value: number, blank: boolean) => {
      if (!blank) return fmt(value);
      answer.push(value);
      return null;
    };
    return {
      kind: 'table',
      prompt: [say('Each row is one speed written in both units. Fill in the gaps.')],
      columns: ['', '\\text{km h}^{-1}', '\\text{m s}^{-1}'],
      rows: rows.map(({ v, blank }, i) => [['A', 'B', 'C'][i], cell(toKmh(v), blank === 'kmh'), cell(v, blank === 'ms')]),
      bank: tidyBank(
        answer,
        rows.flatMap(({ v, blank }) => (blank === 'ms' ? [1.2 * v, 0.9 * v] : [3 * v, 4 * v])),
      ),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map(({ v, blank }, i): SolutionStep => {
      const name = ['A', 'B', 'C'][i];
      return blank === 'ms'
        ? { tex: `${name}: ${fmt(toKmh(v))} \\div 3.6 = ${fmt(v)}` }
        : { tex: `${name}: ${fmt(v)} \\times 3.6 = ${fmt(toKmh(v))}` };
    }),
};

interface GapParams {
  v: number;
  /** Tenths of a second between the two cars crossing the line. */
  tenths: number;
  inKmh: boolean;
}

const GAP_SPAN = 100;

/** Slider: a time gap between two cars at the same speed, as a distance: d = v t. */
const gapSlider: Generator<GapParams> = {
  id: 'clm-gap-slider',
  sample: (rng, difficulty) => ({ v: rng.int(4, 9) * 10, tenths: rng.int(1, 10), inKmh: difficulty > 1 }),
  render: ({ v, tenths, inKmh }) => {
    const figure = track(0, GAP_SPAN, [{ at: 0, name: 'A' }], 'A straight road marked in metres behind car A');
    return {
      kind: 'slider',
      prompt: [
        say(
          `Car B crosses the timing line ${secs(tenths / 10)} after car A. Both are doing ${inKmh ? kmh(toKmh(v)) : ms(v)}. Slide to how far behind A car B is, in metres.`,
        ),
      ],
      min: 0,
      max: GAP_SPAN,
      step: 1,
      answer: (v * tenths) / 10,
      readout: 'd = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: ({ v, tenths, inKmh }) => [
    ...(inKmh ? [{ tex: `${fmt(toKmh(v))} \\div 3.6 = ${fmt(v)}` }] : []),
    { text: `In the ${fmt(tenths / 10)} s after A crosses, B is still covering the ground to the line:` },
    { tex: `d = ${fmt(v)} \\times ${fmt(tenths / 10)} = ${fmt((v * tenths) / 10)}` },
  ],
};

/* ================================================================
 * Average speed over a race
 * ================================================================ */

interface StintParams {
  v1: number;
  t1: number;
  v2: number;
  t2: number;
  /** Seconds stopped in the pits between the stints; 0 when easy. */
  pit: number;
}

const stintNumbers = ({ v1, t1, v2, t2, pit }: StintParams) => {
  const d1 = v1 * t1;
  const d2 = v2 * t2;
  const T = t1 + t2 + pit;
  return { d1, d2, D: d1 + d2, T, avg: (d1 + d2) / T };
};

/** Tree: two stints (and, hard, a pit stop): each distance, the total, the total time, the average speed. */
const stintTree: Generator<StintParams> = {
  id: 'clm-stint-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({
        v1: rng.int(20, 80),
        t1: rng.int(10, 60),
        v2: rng.int(20, 80),
        t2: rng.int(10, 60),
        pit: difficulty > 1 ? rng.int(4, 30) : 0,
      }),
      (p) => p.v1 !== p.v2 && exact(stintNumbers(p).avg, 1),
    ),
  render: (p) => {
    const { d1, d2, D, T, avg } = stintNumbers(p);
    const { v1, t1, v2, t2, pit } = p;
    return {
      kind: 'tree',
      prompt: [
        say(
          pit
            ? `A car drives for ${secs(t1)} at ${ms(v1)}, stops in the pits for ${secs(pit)}, then drives for ${secs(t2)} at ${ms(v2)}. Find its average speed over the whole time, in $\\text{m s}^{-1}$.`
            : `A car drives for ${secs(t1)} at ${ms(v1)}, then for ${secs(t2)} at ${ms(v2)}. Find its average speed, in $\\text{m s}^{-1}$.`,
        ),
        say('Top row: the two distances, in metres. Then the total distance, the total time and the average speed.'),
      ],
      expression: '\\bar{v} = \\frac{\\text{total distance}}{\\text{total time}}',
      nodes: [
        { id: 'd1', from: [] },
        { id: 'd2', from: [] },
        { id: 'D', from: ['d1', 'd2'] },
        { id: 'T', from: [] },
        { id: 'avg', from: ['D', 'T'] },
      ],
      bank: tidyBank([d1, d2, D, T, avg], [(v1 + v2) / 2, D / (t1 + t2), t1 + t2 === T ? T + 10 : t1 + t2]),
      answer: [d1, d2, D, T, avg].map(fmt),
    };
  },
  solution: (p) => {
    const { d1, d2, D, T, avg } = stintNumbers(p);
    return [
      { tex: `${fmt(p.v1)} \\times ${fmt(p.t1)} = ${fmt(d1)}` },
      { tex: `${fmt(p.v2)} \\times ${fmt(p.t2)} = ${fmt(d2)}` },
      { tex: `D = ${fmt(d1)} + ${fmt(d2)} = ${fmt(D)}` },
      { tex: p.pit ? `T = ${p.t1} + ${p.pit} + ${p.t2} = ${T}` : `T = ${p.t1} + ${p.t2} = ${T}` },
      { tex: `\\bar{v} = \\frac{${fmt(D)}}{${fmt(T)}} = ${fmt(avg)}` },
    ];
  },
};

/** Pairs of whole speeds whose average over equal distances, 2ab/(a + b), is whole. */
const halvesFrom = (lo: number, hi: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let a = lo; a <= hi; a += 1) {
    for (let b = a + 1; b <= hi; b += 1) if ((2 * a * b) % (a + b) === 0) out.push([a, b]);
  }
  return out;
};

const EASY_HALVES = halvesFrom(4, 60);
const HARD_HALVES = halvesFrom(4, 90);

const harmonic = (a: number, b: number): number => (2 * a * b) / (a + b);

interface HalvesParams {
  first: number;
  second: number;
  find: 'avg' | 'second';
}

/** Expression: equal distances at two speeds give 2ab/(a + b), not the mean; hard, the second speed that gives an average. */
const equalHalves: Generator<HalvesParams> = {
  id: 'clm-equal-halves',
  sample: (rng, difficulty) => {
    const [a, b] = rng.pick(difficulty > 1 ? HARD_HALVES : EASY_HALVES);
    const [first, second] = rng.chance(0.5) ? [a, b] : [b, a];
    return { first, second, find: difficulty > 1 ? 'second' : 'avg' };
  },
  render: ({ first, second, find }) => {
    const V = harmonic(first, second);
    return find === 'avg'
      ? typed(
          [say(`A runner covers the first half of a course at ${ms(first)} and the second half, just as long, at ${ms(second)}. Find the average speed for the whole course.`)],
          '\\bar{v} =',
          V,
        )
      : typed(
          [say(`A runner covers the first half of a course at ${ms(first)}. How fast must the second half, just as long, be run to average ${ms(V)} overall?`)],
          'v_{2} =',
          second,
        );
  },
  solution: ({ first, second, find }) => {
    const V = harmonic(first, second);
    if (find === 'avg') {
      return [
        { text: 'Call each half $d$. The two halves take $\\frac{d}{a}$ and $\\frac{d}{b}$, so' },
        { tex: '\\bar{v} = \\frac{2d}{\\frac{d}{a} + \\frac{d}{b}} = \\frac{2ab}{a + b}' },
        { tex: `\\bar{v} = \\frac{2 \\times ${first} \\times ${second}}{${first} + ${second}}` },
        { tex: `\\bar{v} = ${fmt(V)}` },
      ];
    }
    return [
      { text: 'Rearrange $\\bar{v} = \\frac{2ab}{a + b}$ for $b$:' },
      { tex: 'b = \\frac{\\bar{v}a}{2a - \\bar{v}}' },
      { tex: `b = \\frac{${fmt(V)} \\times ${first}}{${2 * first} - ${fmt(V)}}` },
      { tex: `b = ${second}` },
    ];
  },
  choices: ({ first, second, find }) => {
    const V = harmonic(first, second);
    return find === 'avg'
      ? numChoices(V, [(first + second) / 2, Math.abs(second - first), first * second / 10], salted(first, second))
      : numChoices(second, [2 * V - first, V, first], salted(second, first));
  },
};

type StintCol = 'd' | 't' | 'v';

interface AvgRow {
  v: number;
  t: number;
  blank: StintCol;
}

interface AvgTableParams {
  rows: AvgRow[];
  /** Hard: a last row for the whole journey, its distance and average speed blank. */
  total: boolean;
}

/** Table: distance, time and speed for three stints, one missing from each; hard adds the whole journey. */
const avgTable: Generator<AvgTableParams> = {
  id: 'clm-avg-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const blanks: StintCol[] = turned(hard ? ['v', 't', 'd'] : ['v', 'v', 'd'], rng.int(0, 2));
    return until(
      () => ({ rows: blanks.map((blank) => ({ v: rng.int(4, 30), t: rng.int(4, 50), blank })), total: hard }),
      ({ rows, total }) => {
        const D = rows.reduce((s, r) => s + r.v * r.t, 0);
        const T = rows.reduce((s, r) => s + r.t, 0);
        return new Set(rows.map((r) => r.v)).size === 3 && (!total || exact(D / T, 1));
      },
    );
  },
  render: ({ rows, total }) => {
    const answer: number[] = [];
    const cell = (value: number, blank: boolean) => {
      if (!blank) return fmt(value);
      answer.push(value);
      return null;
    };
    const body = rows.map(({ v, t, blank }, i) => [['1', '2', '3'][i], cell(v * t, blank === 'd'), cell(t, blank === 't'), cell(v, blank === 'v')]);
    const D = rows.reduce((s, r) => s + r.v * r.t, 0);
    const T = rows.reduce((s, r) => s + r.t, 0);
    if (total) body.push(['\\text{all}', cell(D, true), fmt(T), cell(D / T, true)]);
    return {
      kind: 'table',
      prompt: [
        say(
          total
            ? 'A journey in three stages, then the whole of it. Distances are in metres, times in seconds, speeds in $\\text{m s}^{-1}$. Fill in the gaps.'
            : 'Three stages of a journey. Distances are in metres, times in seconds, speeds in $\\text{m s}^{-1}$. Fill in the gaps.',
        ),
      ],
      columns: ['', 'd', 't', 'v'],
      rows: body,
      bank: tidyBank(answer, [...rows.map((r) => r.v * r.t + r.t), total ? rows.reduce((s, r) => s + r.v, 0) / 3 : 0]),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows, total }) => {
    const lines: SolutionStep[] = rows.map(({ v, t, blank }, i): SolutionStep => {
      if (blank === 'd') return { tex: `d_{${i + 1}} = ${v} \\times ${t} = ${v * t}` };
      if (blank === 't') return { tex: `t_{${i + 1}} = \\frac{${v * t}}{${v}} = ${t}` };
      return { tex: `v_{${i + 1}} = \\frac{${v * t}}{${t}} = ${v}` };
    });
    if (!total) return lines;
    const D = rows.reduce((s, r) => s + r.v * r.t, 0);
    const T = rows.reduce((s, r) => s + r.t, 0);
    return [
      ...lines,
      { text: 'The whole journey: add the distances, then divide by the total time.' },
      { tex: `D = ${rows.map((r) => r.v * r.t).join(' + ')} = ${D}` },
      { tex: `\\bar{v} = \\frac{${D}}{${T}} = ${fmt(D / T)}` },
    ];
  },
};

/** Lap pairs for the flow: whole speeds with a whole average and a lap length both lap times divide. */
const LAP_PAIRS = halvesFrom(20, 90).filter(([a, b]) => (a * b) / gcd(a, b) <= 4000);

interface AvgFlowParams {
  v1: number;
  v2: number;
  L: number;
  /** Hard: a first fork asking whether 2V - v1 will do. */
  trap: boolean;
}

/** Flow: the speed needed on a second lap to average V over two: time allowed, time used, speed. */
const avgFlow: Generator<AvgFlowParams> = {
  id: 'clm-avg-flow',
  sample: (rng, difficulty) => {
    const [a, b] = rng.pick(LAP_PAIRS);
    const [v1, v2] = rng.chance(0.5) ? [a, b] : [b, a];
    const lcm = (a * b) / gcd(a, b);
    const k = rng.int(1, Math.max(1, Math.floor(8000 / lcm)));
    return { v1, v2, L: lcm * k, trap: difficulty > 1 };
  },
  render: ({ v1, v2, L, trap }) => {
    const V = harmonic(v1, v2);
    const naive = 2 * V - v1;
    const RIGHT_TRAP = 'No: the slower lap takes longer, so it counts for more';
    const WRONG_TRAP = 'Yes: the two lap speeds must average to the target';
    const steps = [
      {
        id: 'total',
        ask: `To average ${ms(V)} over both laps, how long can the two laps take in all, in seconds?`,
        branches: forks((2 * L) / V, [L / V, (2 * L) / v1, L / v1]).map((label) => ({ label, to: 'first' })),
      },
      {
        id: 'first',
        ask: 'Lap 1 took, in seconds:',
        branches: forks(L / v1, [L / V, L / v2, (2 * L) / v1]).map((label) => ({ label, to: 'second' })),
      },
      {
        id: 'second',
        ask: 'So lap 2 has the time that is left. Its speed must be, in $\\text{m s}^{-1}$:',
        branches: forks(v2, [naive, V, v1]).map((label) => ({ label, outcome: 'Average speed is total distance over total time, so it is the times that add.' })),
      },
    ];
    return {
      kind: 'flow',
      prompt: [say(`A race is two laps of ${metres(L)}. A driver averages ${ms(v1)} on lap 1. What average speed on lap 2 gives ${ms(V)} over both laps?`)],
      subject: '\\bar{v} = \\frac{\\text{total distance}}{\\text{total time}}',
      steps: trap
        ? [
            {
              id: 'trap',
              ask: `Is lap 2 simply $2 \\times ${fmt(V)} - ${v1} = ${fmt(naive)}$?`,
              branches: (salted(v1, v2, L) % 2 ? [RIGHT_TRAP, WRONG_TRAP] : [WRONG_TRAP, RIGHT_TRAP]).map((label) => ({ label, to: 'total' })),
            },
            ...steps,
          ]
        : steps,
      answer: [...(trap ? [RIGHT_TRAP] : []), `$${fmt((2 * L) / V)}$`, `$${fmt(L / v1)}$`, `$${v2}$`],
    };
  },
  solution: ({ v1, v2, L }) => {
    const V = harmonic(v1, v2);
    const T = (2 * L) / V;
    return [
      { tex: `T = \\frac{2 \\times ${L}}{${fmt(V)}} = ${fmt(T)}` },
      { tex: `t_{1} = \\frac{${L}}{${v1}} = ${fmt(L / v1)}` },
      { tex: `t_{2} = ${fmt(T)} - ${fmt(L / v1)} = ${fmt(L / v2)}` },
      { tex: `v_{2} = \\frac{${L}}{${fmt(L / v2)}} = ${v2}` },
    ];
  },
};

/* ================================================================
 * Closing speeds
 * ================================================================ */

const PAIRS = ['trains', 'cars', 'cyclists', 'boats', 'runners'];
const ONE = { trains: 'Train', cars: 'Car', cyclists: 'Cyclist', boats: 'Boat', runners: 'Runner' } as const;

interface RelParams {
  who: (typeof PAIRS)[number];
  a: number;
  b: number;
}

const dirOf = (v: number): string => (v > 0 ? 'east' : 'west');

/** Expression: the velocity of B relative to A along a line, b - a with signs. Easy: same way; hard: opposite ways. */
const relVelocity: Generator<RelParams> = {
  id: 'clm-rel-velocity',
  sample: (rng, difficulty) =>
    until(
      () => {
        const s = rng.sign();
        const a = rng.int(2, 30) * s;
        const b = rng.int(2, 30) * (difficulty > 1 ? -s : s);
        return { who: rng.pick(PAIRS), a, b };
      },
      ({ a, b }) => a !== b,
    ),
  render: ({ who, a, b }) => {
    const one = ONE[who as keyof typeof ONE];
    return typed(
      [
        say(
          `Take east as positive. ${one} A moves at ${ms(Math.abs(a))} ${dirOf(a)} and ${one.toLowerCase()} B at ${ms(Math.abs(b))} ${dirOf(b)}. Find the velocity of B relative to A, in $\\text{m s}^{-1}$.`,
        ),
      ],
      'v_{B} - v_{A} =',
      b - a,
    );
  },
  solution: ({ a, b }) => [
    { text: 'With east positive, each velocity carries its sign. B relative to A is what A would measure: B minus A.' },
    { tex: `v_{A} = ${a}, \\quad v_{B} = ${b}` },
    { tex: `v_{B} - v_{A} = ${b} - ${a < 0 ? `(${a})` : a} = ${b - a}` },
    { text: b - a > 0 ? 'Positive: to A, B seems to move east.' : 'Negative: to A, B seems to move west.' },
  ],
  choices: ({ a, b }) => numChoices(b - a, [a - b, a + b, -(a + b), Math.abs(b) + Math.abs(a)], salted(a, b)),
};

interface MeetParams {
  v1: number;
  v2: number;
  t: number;
  chase: boolean;
}

const meetGap = ({ v1, v2, t, chase }: MeetParams): number => (chase ? v1 - v2 : v1 + v2) * t;

/** Expression: time to meet head on, d/(v1 + v2); hard, time to catch up, d/(v1 - v2). */
const meetTime: Generator<MeetParams> = {
  id: 'clm-meet-time',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? until(
          () => ({ v1: rng.int(15, 40), v2: rng.int(8, 30), t: rng.int(5, 60), chase: true }),
          ({ v1, v2 }) => v1 > v2,
        )
      : { v1: rng.int(3, 30), v2: rng.int(3, 30), t: rng.int(5, 60), chase: false },
  render: (p) => {
    const d = meetGap(p);
    return typed(
      [
        say(
          p.chase
            ? `A police car is ${metres(d)} behind a van on a straight road. The van drives at ${ms(p.v2)} and the police car at ${ms(p.v1)}, the same way. How long does the police car take to catch the van, in seconds?`
            : `Two cyclists are ${metres(d)} apart and ride straight towards each other at ${ms(p.v1)} and ${ms(p.v2)}. How long until they meet, in seconds?`,
        ),
      ],
      't =',
      p.t,
    );
  },
  solution: (p) => {
    const d = meetGap(p);
    return p.chase
      ? [
          { text: 'The gap shrinks by the difference of the speeds each second:' },
          { tex: `${p.v1} - ${p.v2} = ${p.v1 - p.v2}` },
          { tex: `t = \\frac{${d}}{${p.v1 - p.v2}} = ${p.t}` },
        ]
      : [
          { text: 'Heading towards each other, the gap shrinks by the sum of the speeds each second:' },
          { tex: `${p.v1} + ${p.v2} = ${p.v1 + p.v2}` },
          { tex: `t = \\frac{${d}}{${p.v1 + p.v2}} = ${p.t}` },
        ];
  },
  choices: (p) => {
    const d = meetGap(p);
    return numChoices(p.t, [p.chase ? d / (p.v1 + p.v2) : d / Math.abs(p.v1 - p.v2), d / p.v1, d / p.v2, 2 * p.t], salted(d, p.t));
  },
};

interface MeetSliderParams {
  vA: number;
  vB: number;
  /** Seconds A runs alone before B sets off; 0 when easy. */
  head: number;
  /** Seconds both run before they meet. */
  t: number;
}

const meetPoint = ({ vA, head, t }: MeetSliderParams): number => vA * (head + t);
const pathLength = ({ vA, vB, head, t }: MeetSliderParams): number => vA * head + (vA + vB) * t;

/** Slider: where two runners heading towards each other meet, measured from A's end; hard, B starts late. */
const meetSlider: Generator<MeetSliderParams> = {
  id: 'clm-meet-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({ vA: rng.int(2, 9), vB: rng.int(2, 9), head: difficulty > 1 ? rng.int(2, 8) : 0, t: rng.int(3, 12) }),
      (p) => pathLength(p) <= 120 && pathLength(p) >= 30 && p.vA !== p.vB,
    ),
  render: (p) => {
    const d = pathLength(p);
    const figure = track(0, d, [
      { at: 0, name: 'A' },
      { at: d, name: 'B' },
    ], `A path ${d} metres long, A at one end and B at the other`);
    return {
      kind: 'slider',
      prompt: [
        say(
          p.head
            ? `A and B run towards each other along a ${metres(d)} path, A at ${ms(p.vA)} and B at ${ms(p.vB)}. B sets off ${secs(p.head)} after A. Slide to where they meet, in metres from A's end.`
            : `A and B run towards each other along a ${metres(d)} path, A at ${ms(p.vA)} and B at ${ms(p.vB)}. Slide to where they meet, in metres from A's end.`,
        ),
      ],
      min: 0,
      max: d,
      step: 1,
      answer: meetPoint(p),
      readout: 'x = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => {
    const d = pathLength(p);
    const left = d - p.vA * p.head;
    return [
      ...(p.head ? [{ text: `Alone for ${p.head} s, A covers $${p.vA} \\times ${p.head} = ${p.vA * p.head}$, leaving ${left} m.` }] : []),
      { tex: `t = \\frac{${left}}{${p.vA} + ${p.vB}} = ${p.t}` },
      { tex: `x = ${p.vA} \\times ${p.head + p.t} = ${meetPoint(p)}` },
    ];
  },
};

interface OvertakeParams {
  vl: number;
  r: number;
  car: number;
  lorry: number;
  /** Hard: gaps behind the lorry at the start and ahead of it at the end; 0 when easy. */
  behind: number;
  ahead: number;
}

const gainOf = (p: OvertakeParams): number => p.behind + p.car + p.lorry + p.ahead;

/** Tree: an overtake: the distance to gain, the relative speed, the time, and the car's distance. */
const overtakeTree: Generator<OvertakeParams> = {
  id: 'clm-overtake-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({
        vl: rng.int(16, 25),
        r: rng.pick([2, 4, 5, 8, 10]),
        car: rng.int(4, 5),
        lorry: rng.int(10, 18),
        behind: difficulty > 1 ? rng.int(10, 30) : 0,
        ahead: difficulty > 1 ? rng.int(10, 30) : 0,
      }),
      (p) => exact(gainOf(p) / p.r, 1),
    ),
  render: (p) => {
    const gain = gainOf(p);
    const t = gain / p.r;
    const s = (p.vl + p.r) * t;
    return {
      kind: 'tree',
      prompt: [
        say(
          p.behind
            ? `A car ${metres(p.car)} long overtakes a lorry ${metres(p.lorry)} long. The lorry drives at ${ms(p.vl)}, the car at ${ms(p.vl + p.r)}. The car starts ${metres(p.behind)} behind the lorry and pulls in ${metres(p.ahead)} ahead of it.`
            : `A car ${metres(p.car)} long overtakes a lorry ${metres(p.lorry)} long. The lorry drives at ${ms(p.vl)}, the car at ${ms(p.vl + p.r)}. The car starts with its front at the back of the lorry, and ends with its back at the lorry's front.`,
        ),
        say('Find the distance to gain on the lorry, the relative speed, how long the overtake takes, and how far the car travels.'),
      ],
      expression: 't = \\frac{\\text{distance gained}}{\\text{relative speed}}',
      nodes: [
        { id: 'gain', from: [] },
        { id: 'rel', from: [] },
        { id: 't', from: ['gain', 'rel'] },
        { id: 's', from: ['t'] },
      ],
      bank: tidyBank([gain, p.r, t, s], [p.lorry + p.behind + p.ahead, gain / (p.vl + p.r), p.vl * t, 2 * p.vl + p.r]),
      answer: [gain, p.r, t, s].map(fmt),
    };
  },
  solution: (p) => {
    const gain = gainOf(p);
    const t = gain / p.r;
    return [
      { text: 'Relative to the lorry, the car must move its own length plus the lorry\'s' + (p.behind ? ', plus both gaps:' : ':') },
      { tex: `${p.behind ? `${p.behind} + ` : ''}${p.car} + ${p.lorry}${p.ahead ? ` + ${p.ahead}` : ''} = ${gain}` },
      { tex: `${p.vl + p.r} - ${p.vl} = ${p.r}` },
      { tex: `t = \\frac{${gain}}{${p.r}} = ${fmt(t)}` },
      { tex: `s = ${p.vl + p.r} \\times ${fmt(t)} = ${fmt((p.vl + p.r) * t)}` },
    ];
  },
};

/* ================================================================
 * Stopping distances
 * ================================================================ */

/** Speeds whose km h^-1 is whole: multiples of 2.5 m s^-1 are multiples of 9 km h^-1. */
const ROAD_SPEEDS = [10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35];

interface ThinkParams {
  v: number;
  /** Reaction time in tenths of a second. */
  tr: number;
  find: 'd' | 'tr';
}

/** Expression: thinking distance, speed times reaction time, from a speed in km h^-1; hard, the reaction time. */
const thinking: Generator<ThinkParams> = {
  id: 'clm-thinking',
  sample: (rng, difficulty) =>
    until(
      () => ({ v: rng.pick(ROAD_SPEEDS), tr: rng.int(5, 15), find: difficulty > 1 ? ('tr' as const) : ('d' as const) }),
      // Backwards the distance is printed, so it is one a textbook would print: one decimal place.
      (p) => p.find === 'd' || exact((p.v * p.tr) / 10, 1),
    ),
  render: ({ v, tr, find }) => {
    const d = (v * tr) / 10;
    return find === 'd'
      ? typed(
          [say(`A driver doing ${kmh(toKmh(v))} takes ${secs(tr / 10)} to react to a hazard. How far does the car travel before the brakes go on, in metres?`)],
          'd =',
          d,
        )
      : typed(
          [say(`A driver doing ${kmh(toKmh(v))} travels ${metres(d)} before the brakes go on. What is the driver's reaction time, in seconds?`)],
          't =',
          tr / 10,
        );
  },
  solution: ({ v, tr, find }) => [
    { tex: `${fmt(toKmh(v))} \\div 3.6 = ${fmt(v)}` },
    { text: 'Until the brakes go on, the car keeps its speed.' },
    find === 'd'
      ? { tex: `d = ${fmt(v)} \\times ${fmt(tr / 10)} = ${fmt((v * tr) / 10)}` }
      : { tex: `t = \\frac{${fmt((v * tr) / 10)}}{${fmt(v)}} = ${fmt(tr / 10)}` },
  ],
  choices: ({ v, tr, find }) => {
    const d = (v * tr) / 10;
    return find === 'd'
      ? numChoices(d, [(toKmh(v) * tr) / 10, d * 2, v / (tr / 10)], salted(v, tr))
      : numChoices(tr / 10, [d / toKmh(v), v / d, (tr + 5) / 10], salted(tr, v));
  },
};

/** Decelerations as a textbook prints them, whole or one decimal place. */
const DECELS = [4, 5, 6, 6.5, 7, 7.5, 8];

interface BrakeParams {
  v: number;
  a: number;
  find: 'd' | 'a';
}

const brakeDistance = ({ v, a }: Pick<BrakeParams, 'v' | 'a'>): number => (v * v) / (2 * a);

/** Expression: braking distance u^2/(2a) at a steady deceleration; hard, the deceleration from a distance. */
const braking: Generator<BrakeParams> = {
  id: 'clm-braking',
  sample: (rng, difficulty) =>
    until(
      () => ({ v: rng.int(8, 32), a: rng.pick(DECELS), find: difficulty > 1 ? ('a' as const) : ('d' as const) }),
      // Backwards the distance is printed, so it has one decimal place at most.
      (p) => exact(brakeDistance(p), p.find === 'a' ? 1 : 2),
    ),
  render: (p) => {
    const d = brakeDistance(p);
    return p.find === 'd'
      ? typed([say(`A car at ${ms(p.v)} brakes with a steady deceleration of ${ms2(p.a)}. How far does it travel while braking, in metres?`)], 'd =', d)
      : typed([say(`A car at ${ms(p.v)} brakes steadily and stops in ${metres(d)}. Find its deceleration, in $\\text{m s}^{-2}$.`)], 'a =', p.a);
  },
  solution: (p) => {
    const d = brakeDistance(p);
    return p.find === 'd'
      ? [
          { text: 'It ends at rest, so $0 = u^{2} - 2ad$:' },
          { tex: 'd = \\frac{u^{2}}{2a}' },
          { tex: `d = \\frac{${p.v}^{2}}{2 \\times ${fmt(p.a)}} = ${fmt(d)}` },
        ]
      : [
          { text: 'It ends at rest, so $0 = u^{2} - 2ad$:' },
          { tex: 'a = \\frac{u^{2}}{2d}' },
          { tex: `a = \\frac{${p.v}^{2}}{2 \\times ${fmt(d)}} = ${fmt(p.a)}` },
        ];
  },
  choices: (p) => {
    const d = brakeDistance(p);
    return p.find === 'd' ? numChoices(d, [2 * d, p.v / (2 * p.a), d / 2], salted(p.v, p.a)) : numChoices(p.a, [2 * p.a, p.a / 2, p.v / d], salted(p.a, p.v));
  },
};

interface SquaredParams {
  /** Speeds in km h^-1. */
  v1: number;
  v2: number;
  d1: number;
}

/** Expression: braking distance goes as speed squared, so k times the speed is k^2 times the distance. */
const speedSquared: Generator<SquaredParams> = {
  id: 'clm-speed-squared',
  sample: (rng, difficulty) =>
    until(
      () => {
        const v1 = rng.int(2, 8) * 10;
        const k = rng.pick(difficulty > 1 ? [1.5, 2.5, 0.5, 0.75, 1.25] : [2, 3, 0.5]);
        return { v1, v2: v1 * k, d1: rng.int(4, 40) };
      },
      ({ v1, v2, d1 }) => Number.isInteger(v2) && v2 <= 140 && v2 >= 10 && exact(d1 * (v2 / v1) ** 2, 2),
    ),
  render: ({ v1, v2, d1 }) =>
    typed(
      [say(`A car's braking distance at ${kmh(v1)} is ${metres(d1)}. With the same deceleration, what is it at ${kmh(v2)}, in metres?`)],
      'd =',
      d1 * (v2 / v1) ** 2,
    ),
  solution: ({ v1, v2, d1 }) => [
    { text: 'Braking distance is $\\frac{u^{2}}{2a}$, so with $a$ fixed it goes as the speed squared.' },
    { tex: `\\frac{${v2}}{${v1}} = ${fmt(v2 / v1)}` },
    { tex: `d = ${d1} \\times ${fmt(v2 / v1)}^{2} = ${fmt(d1 * (v2 / v1) ** 2)}` },
  ],
  choices: ({ v1, v2, d1 }) => numChoices(d1 * (v2 / v1) ** 2, [(d1 * v2) / v1, d1 + v2 - v1, 2 * d1 * (v2 / v1)], salted(v1, v2, d1)),
};

interface StopParams {
  v: number;
  tr: number;
  a: number;
  inKmh: boolean;
}

const stopParts = ({ v, tr, a }: Pick<StopParams, 'v' | 'tr' | 'a'>) => {
  const think = (v * tr) / 10;
  const brake = (v * v) / (2 * a);
  return { think, brake, stop: think + brake };
};

const sampleStop = (rng: Rng, hard: boolean): StopParams =>
  until(
    () => ({ v: rng.pick(ROAD_SPEEDS), tr: rng.int(5, 12), a: rng.pick(DECELS), inKmh: hard }),
    (p) => exact(stopParts(p).brake, 2) && exact(stopParts(p).stop, 2),
  );

const speedPhrase = ({ v, inKmh }: Pick<StopParams, 'v' | 'inKmh'>): string => (inKmh ? kmh(toKmh(v)) : ms(v));

/** Tree: stopping distance as thinking distance plus braking distance. Hard gives the speed in km h^-1. */
const stoppingTree: Generator<StopParams> = {
  id: 'clm-stopping-tree',
  sample: (rng, difficulty) => sampleStop(rng, difficulty > 1),
  render: (p) => {
    const { think, brake, stop } = stopParts(p);
    return {
      kind: 'tree',
      prompt: [
        say(`A driver at ${speedPhrase(p)} has a reaction time of ${secs(p.tr / 10)}, then brakes at ${ms2(p.a)}. Find the stopping distance, in metres.`),
        say('Top row: the thinking distance and the braking distance.'),
      ],
      expression: '\\text{stopping} = \\text{thinking} + \\text{braking}',
      nodes: [
        { id: 'think', from: [] },
        { id: 'brake', from: [] },
        { id: 'stop', from: ['think', 'brake'] },
      ],
      bank: tidyBank([think, brake, stop], [2 * brake, p.v / (2 * p.a), think + 2 * brake]),
      answer: [think, brake, stop].map(fmt),
    };
  },
  solution: (p) => {
    const { think, brake, stop } = stopParts(p);
    return [
      ...(p.inKmh ? [{ tex: `${fmt(toKmh(p.v))} \\div 3.6 = ${fmt(p.v)}` }] : []),
      { tex: `\\text{thinking} = ${fmt(p.v)} \\times ${fmt(p.tr / 10)} = ${fmt(think)}` },
      { tex: `\\text{braking} = \\frac{${fmt(p.v)}^{2}}{2 \\times ${fmt(p.a)}} = ${fmt(brake)}` },
      { tex: `${fmt(think)} + ${fmt(brake)} = ${fmt(stop)}` },
    ];
  },
};

interface HazardParams extends StopParams {
  /** How far ahead the hazard is when seen, in whole metres. */
  D: number;
}

/** Flow: does a car stop before a hazard? Thinking distance, braking distance, then the verdict. */
const stopFlow: Generator<HazardParams> = {
  id: 'clm-stop-flow',
  sample: (rng, difficulty) => {
    const p = sampleStop(rng, difficulty > 1);
    const { stop } = stopParts(p);
    const D = rng.chance(0.5) ? Math.ceil(stop) + rng.int(1, 12) : Math.floor(stop) - rng.int(1, 12);
    return { ...p, D: Math.max(5, D) };
  },
  render: (p) => {
    const { think, brake, stop } = stopParts(p);
    const stops = p.D > stop;
    const YES = `Yes, with $${fmt(p.D - stop)}\\text{ m}$ to spare`;
    const NO = 'No, it reaches the hazard still moving';
    return {
      kind: 'flow',
      prompt: [
        say(
          `A driver at ${speedPhrase(p)} sees a hazard ${metres(p.D)} ahead. The driver takes ${secs(p.tr / 10)} to react, then brakes at ${ms2(p.a)}. Does the car stop in time?`,
        ),
      ],
      subject: '\\text{stopping} = \\text{thinking} + \\text{braking}',
      steps: [
        {
          id: 'think',
          ask: 'The thinking distance, in metres, is:',
          branches: forks(think, [(toKmh(p.v) * p.tr) / 10, 2 * think, think / 2], 0.5).map((label) => ({ label, to: 'brake' })),
        },
        {
          id: 'brake',
          ask: 'The braking distance, in metres, is:',
          branches: forks(brake, [2 * brake, brake / 2, p.v / p.a], 0.5).map((label) => ({ label, to: 'verdict' })),
        },
        {
          id: 'verdict',
          ask: `Compare the stopping distance with the $${p.D}\\text{ m}$ to the hazard. Does it stop in time?`,
          branches: [
            { label: stops ? YES : `Yes, with $${fmt(Math.abs(p.D - stop) + 2)}\\text{ m}$ to spare`, outcome: 'The stopping distance is the thinking distance plus the braking distance.' },
            { label: NO, outcome: 'The stopping distance is the thinking distance plus the braking distance.' },
          ],
        },
      ],
      answer: [`$${fmt(think)}$`, `$${fmt(brake)}$`, stops ? YES : NO],
    };
  },
  solution: (p) => {
    const { think, brake, stop } = stopParts(p);
    return [
      ...(p.inKmh ? [{ tex: `${fmt(toKmh(p.v))} \\div 3.6 = ${fmt(p.v)}` }] : []),
      { tex: `\\text{thinking} = ${fmt(p.v)} \\times ${fmt(p.tr / 10)} = ${fmt(think)}` },
      { tex: `\\text{braking} = \\frac{${fmt(p.v)}^{2}}{2 \\times ${fmt(p.a)}} = ${fmt(brake)}` },
      { tex: `\\text{stopping} = ${fmt(stop)}` },
      { text: p.D > stop ? `That is less than ${p.D} m, so it stops in time.` : `That is more than ${p.D} m, so it does not stop in time.` },
    ];
  },
};

/* ================================================================
 * Stepping through time
 * ================================================================ */

interface StepParams {
  x0: number;
  v0: number;
  a: number;
  dt: number;
}

/** The Euler rule: position moves on by the old speed, then the speed by the acceleration. */
export function stepRows({ x0, v0, a, dt }: StepParams, n: number): { x: number; v: number }[] {
  const rows = [{ x: x0, v: v0 }];
  for (let k = 0; k < n; k += 1) {
    const { x, v } = rows[rows.length - 1];
    rows.push({ x: Number((x + v * dt).toFixed(6)), v: Number((v + a * dt).toFixed(6)) });
  }
  return rows;
}

const STEP_RULE = 'x_{n+1} = x_{n} + v_{n}\\,\\Delta t \\qquad v_{n+1} = v_{n} + a\\,\\Delta t';

/** Table: three steps of the rule from a given start: position and velocity on each row. */
const stepTable: Generator<StepParams> = {
  id: 'clm-step-table',
  sample: (rng, difficulty) =>
    until(
      () => ({
        x0: rng.int(0, 12),
        v0: rng.int(0, 8),
        a: rng.pick([-3, -2, -1, 1, 2, 3, 4]),
        dt: difficulty > 1 ? 0.5 : 1,
      }),
      (p) => new Set(stepRows(p, 3).map((r) => r.x)).size === 4,
    ),
  render: (p) => {
    const rows = stepRows(p, 3);
    const answer = rows.slice(1).flatMap((r) => [r.x, r.v]);
    const wrong = rows.slice(1).map((r) => r.x + p.a * p.dt * p.dt);
    return {
      kind: 'table',
      prompt: [
        say(`Each step is ${secs(p.dt)} and the acceleration is ${ms2(p.a)}. Each new row comes from the row above:`),
        show(STEP_RULE),
      ],
      columns: ['n', 'x', 'v'],
      rows: rows.map((r, n) => [String(n), n === 0 ? fmt(r.x) : null, n === 0 ? fmt(r.v) : null]),
      bank: valueBank(answer, wrong.filter((v) => exact(v, 2))),
      answer: answer.map(fmt),
    };
  },
  solution: (p) => {
    const rows = stepRows(p, 3);
    return rows.slice(1).flatMap((r, i): SolutionStep[] => {
      const prev = rows[i];
      return [
        { tex: `x_{${i + 1}} = ${fmt(prev.x)} + ${fmt(prev.v)} \\times ${fmt(p.dt)} = ${fmt(r.x)}` },
        { tex: `v_{${i + 1}} = ${fmt(prev.v)} ${p.a < 0 ? '-' : '+'} ${fmt(Math.abs(p.a))} \\times ${fmt(p.dt)} = ${fmt(r.v)}` },
      ];
    });
  },
};

interface Car {
  x: number;
  v: number;
}

interface TrafficParams {
  /** Front car first. */
  cars: Car[];
  showGap: boolean;
}

const VMAX = 5;

/** Nagel-Schreckenberg without the random slow-down: speed up by one, but never past the limit or into the gap ahead. */
export function trafficStep(cars: Car[]): Car[] {
  return cars.map((car, i) => {
    const gap = i === 0 ? Infinity : cars[i - 1].x - car.x - 1;
    const v = Math.min(car.v + 1, VMAX, gap);
    return { x: car.x + v, v };
  });
}

/** Table: one step of the traffic rule for three cars: each new speed and new cell. */
const trafficTable: Generator<TrafficParams> = {
  id: 'clm-traffic-table',
  sample: (rng, difficulty) =>
    until(
      () => {
        const c = rng.int(0, 6);
        const b = c + rng.int(1, 7);
        const a = b + rng.int(1, 7);
        return {
          cars: [a, b, c].map((x) => ({ x, v: rng.int(0, VMAX) })),
          showGap: difficulty < 2,
        };
      },
      ({ cars }) => {
        const next = trafficStep(cars);
        // At least one car held back by the gap, and one not.
        const held = next.filter((car, i) => car.v < Math.min(cars[i].v + 1, VMAX)).length;
        return held >= 1 && held <= 2 && next.some((car, i) => car.v !== cars[i].v);
      },
    ),
  render: ({ cars, showGap }) => {
    const next = trafficStep(cars);
    const answer = next.flatMap((car) => [car.v, car.x]);
    const gapOf = (i: number) => (i === 0 ? '\\infty' : fmt(cars[i - 1].x - cars[i].x - 1));
    return {
      kind: 'table',
      prompt: [
        say(`Cars on a road of numbered cells, A in front with a clear road ahead. The limit is ${VMAX} cells a step, and every car moves at once:`),
        show('v_{\\text{new}} = \\min(v + 1,\\ 5,\\ \\text{gap})'),
        say('The gap is the number of empty cells in front of a car. Then each car moves on $v_{\\text{new}}$ cells.'),
      ],
      columns: showGap ? ['', 'x', 'v', '\\text{gap}', 'v_{\\text{new}}', 'x_{\\text{new}}'] : ['', 'x', 'v', 'v_{\\text{new}}', 'x_{\\text{new}}'],
      rows: cars.map((car, i) => [['A', 'B', 'C'][i], fmt(car.x), fmt(car.v), ...(showGap ? [gapOf(i)] : []), null, null]),
      bank: valueBank(
        answer,
        cars.flatMap((car) => [car.x + car.v, car.v + 1]),
      ),
      answer: answer.map(fmt),
    };
  },
  solution: ({ cars }) => {
    const next = trafficStep(cars);
    return cars.flatMap((car, i): SolutionStep[] => {
      const name = ['A', 'B', 'C'][i];
      const gap = i === 0 ? '\\infty' : fmt(cars[i - 1].x - car.x - 1);
      return [
        { tex: `${name}: \\min(${car.v + 1}, 5, ${gap}) = ${next[i].v}` },
        { tex: `x = ${car.x} + ${next[i].v} = ${next[i].x}` },
      ];
    });
  },
};

interface StepVelParams {
  x0: number;
  u: number;
  a: number;
  dt: number;
  /** Which step the question starts from. */
  k: number;
  find: 'v' | 'a';
}

const positionAt = ({ x0, u, a, dt }: StepVelParams, n: number): number => x0 + u * n * dt + (a * (n * dt) ** 2) / 2;

/** Expression: from positions at equal time steps, a velocity (easy) or the acceleration from a second difference (hard). */
const stepVelocity: Generator<StepVelParams> = {
  id: 'clm-step-velocity',
  sample: (rng, difficulty) => ({
    x0: rng.int(0, 20),
    u: rng.int(0, 10),
    a: rng.pick([2, 4, 6, 8, 10]),
    dt: rng.pick([1, 2]),
    k: rng.int(0, difficulty > 1 ? 1 : 2),
    find: difficulty > 1 ? 'a' : 'v',
  }),
  render: (p) => {
    const xs = [0, 1, 2, 3].map((n) => positionAt(p, n));
    const table = `\\begin{array}{c|cccc} t & ${[0, 1, 2, 3].map((n) => fmt(n * p.dt)).join(' & ')} \\\\ \\hline x & ${xs.map(fmt).join(' & ')} \\end{array}`;
    return p.find === 'v'
      ? typed(
          [
            say('A car\'s position, in metres, is read every few seconds:'),
            show(table),
            say(`Find its average velocity from $t = ${fmt(p.k * p.dt)}$ to $t = ${fmt((p.k + 1) * p.dt)}$, in $\\text{m s}^{-1}$.`),
          ],
          'v =',
          (xs[p.k + 1] - xs[p.k]) / p.dt,
        )
      : typed(
          [
            say('A car\'s position, in metres, is read every few seconds. Its acceleration is constant.'),
            show(table),
            say('Find its acceleration, in $\\text{m s}^{-2}$.'),
          ],
          'a =',
          p.a,
        );
  },
  solution: (p) => {
    const xs = [0, 1, 2, 3].map((n) => positionAt(p, n));
    const { k, dt } = p;
    if (p.find === 'v') {
      return [{ tex: `v = \\frac{${fmt(xs[k + 1])} - ${fmt(xs[k])}}{${fmt(dt)}} = ${fmt((xs[k + 1] - xs[k]) / dt)}` }];
    }
    const v1 = (xs[k + 1] - xs[k]) / dt;
    const v2 = (xs[k + 2] - xs[k + 1]) / dt;
    return [
      { text: 'Velocities over two steps in a row:' },
      { tex: `\\frac{${fmt(xs[k + 1])} - ${fmt(xs[k])}}{${fmt(dt)}} = ${fmt(v1)}` },
      { tex: `\\frac{${fmt(xs[k + 2])} - ${fmt(xs[k + 1])}}{${fmt(dt)}} = ${fmt(v2)}` },
      { text: 'The velocity changes by that much each step:' },
      { tex: `a = \\frac{${fmt(v2)} - ${fmt(v1)}}{${fmt(dt)}} = ${fmt(p.a)}` },
    ];
  },
  choices: (p) => {
    const xs = [0, 1, 2, 3].map((n) => positionAt(p, n));
    const { k, dt } = p;
    if (p.find === 'v') {
      const v = (xs[k + 1] - xs[k]) / dt;
      return numChoices(v, [xs[k + 1] - xs[k], xs[k + 1] / ((k + 1) * dt), v + p.a * dt], salted(v, k, dt));
    }
    const second = xs[k + 2] - 2 * xs[k + 1] + xs[k];
    return numChoices(p.a, [second, second / dt, (xs[k + 2] - xs[k + 1]) / dt], salted(p.a, dt, k));
  },
};

interface StepErrorParams {
  a: number;
  dt: number;
  N: number;
}

/** Distance stepped from rest, with position moved on by the old speed each step. */
const steppedDistance = ({ a, dt, N }: StepErrorParams): number => (a * dt * dt * N * (N - 1)) / 2;
const trueDistance = ({ a, dt, N }: StepErrorParams): number => (a * (N * dt) ** 2) / 2;

/** Tree: stepping from rest against the exact 1/2 a T^2: stepped distance, true distance, and the shortfall. */
const stepErrorTree: Generator<StepErrorParams> = {
  id: 'clm-step-error-tree',
  sample: (rng, difficulty) =>
    difficulty > 1 ? { a: rng.pick([2, 4, 6, 8, 12]), dt: 0.5, N: rng.int(4, 8) } : { a: rng.int(2, 10), dt: 1, N: rng.int(3, 6) },
  render: (p) => {
    const stepped = steppedDistance(p);
    const exactS = trueDistance(p);
    return {
      kind: 'tree',
      prompt: [
        say(
          `A car starts from rest with acceleration ${ms2(p.a)}. Step it forward in steps of ${secs(p.dt)} with the rule, for ${secs(p.N * p.dt)}. Find the distance stepping gives, the true distance, and how far short stepping falls.`,
        ),
        show(STEP_RULE),
      ],
      expression: 's = \\tfrac{1}{2}aT^{2}',
      nodes: [
        { id: 'stepped', from: [] },
        { id: 'exact', from: [] },
        { id: 'short', from: ['stepped', 'exact'] },
      ],
      bank: tidyBank([stepped, exactS, exactS - stepped], [(p.a * p.dt * p.dt * p.N * (p.N + 1)) / 2, p.a * (p.N * p.dt) ** 2, exactS + stepped]),
      answer: [stepped, exactS, exactS - stepped].map(fmt),
    };
  },
  solution: (p) => {
    const speeds = Array.from({ length: p.N }, (_, k) => fmt(p.a * k * p.dt));
    return [
      { text: `The speeds used, one per step, start at 0. Each moves the car on for ${fmt(p.dt)} s:` },
      { tex: `s = ${fmt(p.dt)} \\times (${speeds.join(' + ')}) = ${fmt(steppedDistance(p))}` },
      { tex: `\\tfrac{1}{2} \\times ${p.a} \\times ${fmt(p.N * p.dt)}^{2} = ${fmt(trueDistance(p))}` },
      { tex: `${fmt(trueDistance(p))} - ${fmt(steppedDistance(p))} = ${fmt(trueDistance(p) - steppedDistance(p))}` },
    ];
  },
};

export const classicalMotionGenerators = [
  kmhConvert,
  lapTime,
  speedTable,
  gapSlider,
  stintTree,
  equalHalves,
  avgTable,
  avgFlow,
  relVelocity,
  meetTime,
  meetSlider,
  overtakeTree,
  thinking,
  braking,
  speedSquared,
  stoppingTree,
  stopFlow,
  stepTable,
  trafficTable,
  stepVelocity,
  stepErrorTree,
] as Generator<never>[];

/** Exposed for `classicalMotion.test.ts`, which recomputes each answer its own way. */
export const classicalMotionInternals = { toKmh, harmonic, stintNumbers, meetGap, pathLength, meetPoint, gainOf, stopParts, brakeDistance, steppedDistance, trueDistance, positionAt };
