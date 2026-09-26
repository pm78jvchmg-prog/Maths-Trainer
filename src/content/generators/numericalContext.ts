/**
 * Numerical Methods, level 9: the trapezium rule in context (roadmap C15).
 *
 * Shown on the Numerical Methods Basics card. The rule used on readings:
 * areas from widths and depths, distance from speed and volume from a flow
 * rate, how many strips a set of readings makes, the average speed over a
 * journey, over or under from the way the graph bends, what more strips do
 * to the estimate, and profiles given by a formula, with a volume from a
 * cross-section.
 *
 * Readings are whole numbers and the spacings are 0.5, 1, 1.5, 2, 3 or 5, so
 * every estimate is an exact decimal. An estimate is not the integral, so no
 * `expression` here declares `integrand` or `limits`: the oracle would grade
 * the estimate against the exact value.
 */
import type { Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { plotFigure, plotSvg } from '../figures';
import { say } from './format';
import {
  aligned,
  around,
  choiceSlide,
  clean,
  fillBank,
  fmt,
  numberBank,
  polyTex,
  show,
  stepBank,
  terminates,
  turned,
  valueAt,
  type Poly,
} from './numericalKit';

/* ================================================================
 * Readings and their stories
 * ================================================================ */

interface Story {
  setup: (h: string) => string;
  x: string;
  y: string;
  /** What the estimate is, for the question and for the meaning options. */
  what: string;
  unit: string;
  hs: number[];
  lo: number;
  hi: number;
  zeroEnds?: boolean;
  /** Area stories estimate an area; rate stories integrate a rate over time. */
  kind: 'area' | 'rate';
}

const STORIES: Story[] = [
  {
    setup: (h) => `A river's depth $d$ m is measured every $${h}$ m from bank to bank.`,
    x: 'x',
    y: 'd',
    what: 'the area of its cross-section',
    unit: 'square metres',
    hs: [0.5, 1, 2, 3],
    lo: 1,
    hi: 9,
    zeroEnds: true,
    kind: 'area',
  },
  {
    setup: (h) => `A pond's width $w$ m is measured every $${h}$ m along its length.`,
    x: 'x',
    y: 'w',
    what: 'the area of the pond',
    unit: 'square metres',
    hs: [1, 2, 5],
    lo: 2,
    hi: 20,
    kind: 'area',
  },
  {
    setup: (h) => `A lawn's width $w$ m is measured every $${h}$ m along it.`,
    x: 'x',
    y: 'w',
    what: 'the area of the lawn',
    unit: 'square metres',
    hs: [1.5, 2, 3],
    lo: 3,
    hi: 15,
    kind: 'area',
  },
  {
    setup: (h) => `A car's speed $v$ m/s is read every $${h}$ s.`,
    x: 't',
    y: 'v',
    what: 'the distance it travels',
    unit: 'metres',
    hs: [1, 2, 5],
    lo: 4,
    hi: 30,
    kind: 'rate',
  },
  {
    setup: (h) => `Water runs into a tank at $r$ litres per minute, read every $${h}$ minutes.`,
    x: 't',
    y: 'r',
    what: 'the volume of water that runs in',
    unit: 'litres',
    hs: [1, 2, 5],
    lo: 5,
    hi: 40,
    kind: 'rate',
  },
  {
    setup: (h) => `A file downloads at $r$ megabytes per second, read every $${h}$ s.`,
    x: 't',
    y: 'r',
    what: 'the amount of data downloaded',
    unit: 'megabytes',
    hs: [0.5, 1, 2],
    lo: 2,
    hi: 20,
    kind: 'rate',
  },
  {
    setup: (h) => `A heater's power $P$ kW is read every $${h}$ hours.`,
    x: 't',
    y: 'P',
    what: 'the energy it uses',
    unit: 'kilowatt-hours',
    hs: [0.5, 1, 2],
    lo: 1,
    hi: 9,
    kind: 'rate',
  },
];

const storiesOf = (kind: Story['kind']): number[] => STORIES.map((s, i) => (s.kind === kind ? i : -1)).filter((i) => i >= 0);

interface Readings {
  story: number;
  h: number;
  ys: number[];
}

function sampleReadings(rng: Rng, stories: number[], count: number): Readings {
  const story = rng.pick(stories);
  const s = STORIES[story];
  const ys = Array.from({ length: count }, (_, i) => (s.zeroEnds && (i === 0 || i === count - 1) ? 0 : rng.int(s.lo, s.hi)));
  return { story, h: rng.pick(s.hs), ys };
}

const xsOf = ({ h, ys }: Readings): number[] => ys.map((_, i) => clean(i * h));

/** Readings as a two-row table, split in two above five columns so it fits a phone. */
function readingsTex(params: Readings): string {
  const s = STORIES[params.story];
  return twoRowTable(s.x, s.y, xsOf(params), params.ys);
}

/**
 * Any two-row table of values. Above five columns it is split into pieces of
 * equal length stacked one above the other, so it fits a phone: an `array`
 * cannot break, and a wider one scrolls.
 */
function twoRowTable(x: string, y: string, xs: number[], ys: number[]): string {
  const part = (from: number, to: number) =>
    `\\begin{array}{c|${'c'.repeat(to - from)}} ${x} & ${xs.slice(from, to).map(fmt).join(' & ')} \\\\ \\hline ${y} & ${ys.slice(from, to).map(fmt).join(' & ')} \\end{array}`;
  if (ys.length <= 5) return part(0, ys.length);
  const size = Math.ceil(ys.length / Math.ceil(ys.length / 5));
  const parts: string[] = [];
  for (let from = 0; from < ys.length; from += size) parts.push(part(from, Math.min(from + size, ys.length)));
  return `\\begin{gathered} ${parts.join(' \\\\[6pt] ')} \\end{gathered}`;
}

function sums(ys: number[], h: number) {
  const n = ys.length - 1;
  const ends = ys[0] + ys[n];
  const mids = ys.slice(1, -1).reduce((a, y) => a + y, 0);
  const total = ends + 2 * mids;
  return { n, ends, mids, total, area: clean((h / 2) * total) };
}

/** `y_1 + y_2 + y_3`, or with a `\cdots` past four. */
function midNames(n: number): string {
  return n > 4 ? `y_1 + \\cdots + y_{${n - 1}}` : Array.from({ length: n - 1 }, (_, i) => `y_${i + 1}`).join(' + ');
}

function ruleSolution(ys: number[], h: number): SolutionStep[] {
  const { n, ends, mids, total, area } = sums(ys, h);
  return [
    { text: `${ys.length} readings make ${n} strips of width $h = ${fmt(h)}$. The two end readings count once, every middle one twice.` },
    { tex: aligned(`y_0 + y_${n} &= ${fmt(ends)}`, `${midNames(n)} &= ${fmt(mids)}`) },
    { tex: `${fmt(ends)} + 2 \\times ${fmt(mids)} = ${fmt(total)}` },
    { tex: `\\frac{${fmt(h)}}{2} \\times ${fmt(total)} = ${fmt(area)}` },
  ];
}

function readingsSolution(params: Readings): SolutionStep[] {
  const s = STORIES[params.story];
  return [...ruleSolution(params.ys, params.h), { text: `So ${s.what} is about $${fmt(sums(params.ys, params.h).area)}$ ${s.unit}.` }];
}

function ruleChoices(ys: number[], h: number) {
  const { ends, mids, total, area } = sums(ys, h);
  return options(
    { tex: fmt(area), answer: fmt(area) },
    { tex: fmt(clean(h * total)), answer: fmt(clean(h * total)) },
    { tex: fmt(clean((h / 2) * (ends + mids))), answer: fmt(clean((h / 2) * (ends + mids))) },
    { tex: fmt(clean(h * (ends + mids))), answer: fmt(clean(h * (ends + mids))) },
    { tex: fmt(clean(area + h)), answer: fmt(clean(area + h)) },
  ).slice(0, 4);
}

/* ================================================================
 * Lesson 1: areas from readings
 * ================================================================ */

const ctxTrapValue: Generator<Readings> = {
  id: 'numer-ctx-trap-value',
  sample: (rng, difficulty) => sampleReadings(rng, storiesOf('area'), difficulty > 1 ? 7 : 5),
  choices: (params) => ruleChoices(params.ys, params.h),
  render: (params): Slide => {
    const s = STORIES[params.story];
    return {
      kind: 'expression',
      prompt: [say(s.setup(fmt(params.h))), show(readingsTex(params)), say(`Use the trapezium rule to estimate ${s.what}, in ${s.unit}.`)],
      lead: 'A \\approx',
      keypad: [],
      answer: fmt(sums(params.ys, params.h).area),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: readingsSolution,
};

/** The rule's two sums, the bracket and the estimate, as a tree. */
const ctxSumsTree: Generator<Readings> = {
  id: 'numer-ctx-sums-tree',
  sample: (rng, difficulty) => sampleReadings(rng, difficulty > 1 ? [...storiesOf('area'), ...storiesOf('rate')] : storiesOf('area'), difficulty > 1 ? 6 : 5),
  render: (params): Slide => {
    const s = STORIES[params.story];
    const { n, ends, mids, total, area } = sums(params.ys, params.h);
    const answer = [ends, mids, total, area].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(s.setup(fmt(params.h))),
        show(readingsTex(params)),
        say(`Top row: $y_0 + y_${n}$, then $${midNames(n)}$. Then the bracket, then the estimate of ${s.what}.`),
      ],
      expression: `\\frac{${fmt(params.h)}}{2}\\big[y_0 + y_${n} + 2(${midNames(n)})\\big]`,
      nodes: [
        { id: 'ends', from: [] },
        { id: 'mids', from: [] },
        { id: 'total', from: ['ends', 'mids'] },
        { id: 'area', from: ['total'] },
      ],
      bank: numberBank(answer, [ends + mids, 2 * ends + mids, clean(params.h * total), clean(total / 2)].map(fmt), around([area, total], 1)),
      answer,
    };
  },
  solution: readingsSolution,
};

interface StripsParams {
  story: number;
  /** The whole span measured across. */
  span: number;
  readings: number;
}

/**
 * How many strips a set of readings makes, and how wide. The slip it catches
 * is counting readings as strips: n readings make n - 1 strips.
 */
const ctxStrips: Generator<StripsParams> = {
  id: 'numer-ctx-strips-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const story = rng.pick(difficulty > 1 ? storiesOf('rate') : storiesOf('area'));
      const readings = rng.int(4, 9);
      const h = rng.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]);
      const span = clean(h * (readings - 1));
      if (span > 40) continue;
      return { story, span, readings };
    }
  },
  render: (params): Slide => {
    const { span, readings } = params;
    const n = readings - 1;
    const h = clean(span / n);
    const label = (strips: number, width: number) => `${strips} \\text{ strips, } h = ${fmt(width)}`;
    const candidates: [number, number][] = [
      [readings, clean(span / readings)],
      [readings, h],
      [n, clean(span / readings)],
      [n, clean(2 * h)],
      [n - 1, clean(span / (n - 1))],
    ];
    const wrong = candidates.filter(([k, w]) => terminates(w, 3) && !(k === n && w === h));
    return choiceSlide(
      [say(`${stripsText(params)} How many strips does the trapezium rule use, and how wide is each?`)],
      options({ tex: label(n, h) }, ...wrong.map(([k, w]) => ({ tex: label(k, w) }))).slice(0, 4),
    );
  },
  solution: ({ span, readings }) => {
    const n = readings - 1;
    return [
      { text: `The readings sit at the edges of the strips, so $${readings}$ readings mark out $${readings} - 1 = ${n}$ strips.` },
      { tex: `h = \\frac{${fmt(span)}}{${n}} = ${fmt(clean(span / n))}` },
    ];
  },
};

function stripsText(params: StripsParams): string {
  const span = fmt(params.span);
  switch (params.story) {
    case 0:
      return `A river is $${span}$ m wide. Its depth is measured at ${params.readings} evenly spaced points, one on each bank.`;
    case 1:
      return `A pond is $${span}$ m long. Its width is measured at ${params.readings} evenly spaced points, one at each end.`;
    case 2:
      return `A lawn is $${span}$ m long. Its width is measured at ${params.readings} evenly spaced points, one at each end.`;
    case 3:
      return `A car's speed is read ${params.readings} times, evenly spaced over $${span}$ seconds, at the start, at the end and in between.`;
    case 4:
      return `A tank's flow rate is read ${params.readings} times, evenly spaced over $${span}$ minutes, at the start, at the end and in between.`;
    case 5:
      return `A download rate is read ${params.readings} times, evenly spaced over $${span}$ seconds, at the start, at the end and in between.`;
    default:
      return `A heater's power is read ${params.readings} times, evenly spaced over $${span}$ hours, at the start, at the end and in between.`;
  }
}

/** The rule worked along a line, as `numer-trapezium-steps` does it, on readings. */
const ctxRuleSteps: Generator<Readings> = {
  id: 'numer-ctx-rule-steps',
  sample: (rng, difficulty) => sampleReadings(rng, difficulty > 1 ? storiesOf('rate') : storiesOf('area'), difficulty > 1 ? 6 : 5),
  render: (params): Slide => {
    const s = STORIES[params.story];
    const { ys, h } = params;
    const { n, ends, mids, total, area } = sums(ys, h);
    const half = clean(h / 2);
    return {
      kind: 'steps',
      prompt: [
        say(s.setup(fmt(h))),
        show(readingsTex(params)),
        say(`Estimate ${s.what}. Tap the part to work out next, then choose its value.`),
      ],
      start: [fmt(half), '\\times', '[', `${fmt(ys[0])} + ${fmt(ys[n])}`, '+', `2(${ys.slice(1, -1).map(fmt).join(' + ')})`, ']'],
      reductions: [
        { span: [3, 4], value: fmt(ends), bank: stepBank(fmt(ends), fmt(ends + 1), fmt(ys[0] * ys[n]), fmt(ends + ys[1])) },
        { span: [5, 6], value: fmt(2 * mids), bank: stepBank(fmt(2 * mids), fmt(mids), fmt(mids + 2), fmt(2 * mids + 2)) },
        { span: [2, 7], operator: 4, value: fmt(total), bank: stepBank(fmt(total), fmt(ends + mids), fmt(total + 1), fmt(total - 2)) },
        { span: [0, 3], operator: 1, value: fmt(area), bank: stepBank(fmt(area), fmt(clean(h * total)), fmt(total), fmt(clean(area + half))) },
      ],
    };
  },
  solution: readingsSolution,
};

/* ================================================================
 * Lesson 2: distance from speed
 * ================================================================ */

const speedDistance: Generator<Readings> = {
  id: 'numer-speed-distance',
  sample: (rng, difficulty) => sampleReadings(rng, storiesOf('rate'), difficulty > 1 ? 6 : 5),
  choices: (params) => ruleChoices(params.ys, params.h),
  render: (params): Slide => {
    const s = STORIES[params.story];
    return {
      kind: 'expression',
      prompt: [say(s.setup(fmt(params.h))), show(readingsTex(params)), say(`Use the trapezium rule to estimate ${s.what}, in ${s.unit}.`)],
      lead: '\\text{estimate} \\approx',
      keypad: [],
      answer: fmt(sums(params.ys, params.h).area),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: readingsSolution,
};

const carSpeed = (): number[] => [storiesOf('rate')[0]];

/** Average speed: the distance over the whole time, or the height of a rectangle of the same area. */
const averageOf = ({ ys, h }: Readings): number => clean(sums(ys, h).area / ((ys.length - 1) * h));

/** The rectangle with the same area as the trapezia: slide to its height, the average speed. */
const speedMeanSlider: Generator<Readings> = {
  id: 'numer-speed-mean-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleReadings(rng, carSpeed(), difficulty > 1 ? 5 : 3);
      if (!Number.isInteger(averageOf(params) * 4)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { ys, h } = params;
    const xs = xsOf(params);
    const n = ys.length - 1;
    const end = xs[n];
    const top = Math.ceil(Math.max(...ys) / 5) * 5 + 5;
    const joined = (t: number) => {
      const i = Math.min(n - 1, Math.max(0, Math.floor(t / h)));
      const f = (t - xs[i]) / h;
      return ys[i] + f * (ys[i + 1] - ys[i]);
    };
    const svg = plotSvg({
      xMin: 0,
      xMax: end,
      yMin: 0,
      yMax: top,
      curves: [{ f: joined, accent: true }],
      verticals: xs.map((x) => ({ x })),
      label: `A speed-time graph joining the readings ${ys.join(', ')} with straight lines`,
    });
    return {
      kind: 'slider',
      prompt: [
        say(`${STORIES[params.story].setup(fmt(h))} The graph joins the readings with straight lines.`),
        show(readingsTex(params)),
        say('Slide the line to the average speed over the whole time.'),
      ],
      min: 0,
      max: top,
      step: 0.25,
      answer: averageOf(params),
      readout: '\\text{speed} = {v}',
      figure: plotFigure(svg, 'y'),
    };
  },
  solution: (params) => {
    const { ys, h } = params;
    const n = ys.length - 1;
    const { area } = sums(ys, h);
    return [
      ...ruleSolution(ys, h).slice(1),
      { text: `That is the distance. The time is $${n}$ strips of $${fmt(h)}$ s, which is $${fmt(clean(n * h))}$ s, so the average speed is` },
      { tex: `\\frac{${fmt(area)}}{${fmt(clean(n * h))}} = ${fmt(averageOf(params))}` },
    ];
  },
};

const speedAverage: Generator<Readings> = {
  id: 'numer-speed-average',
  sample: (rng, difficulty) => sampleReadings(rng, carSpeed(), difficulty > 1 ? 6 : 5),
  choices: (params) => {
    const { ys, h } = params;
    const { area, total } = sums(ys, h);
    const time = (ys.length - 1) * h;
    const mean = clean(ys.reduce((a, y) => a + y, 0) / ys.length);
    return options(
      { tex: fmt(averageOf(params)), answer: fmt(averageOf(params)) },
      { tex: fmt(area), answer: fmt(area) },
      { tex: fmt(clean(total / time)), answer: fmt(clean(total / time)) },
      ...(terminates(mean, 3) ? [{ tex: fmt(mean), answer: fmt(mean) }] : []),
      { tex: fmt(clean(area / ys.length)), answer: fmt(clean(area / ys.length)) },
    ).slice(0, 4);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(STORIES[params.story].setup(fmt(params.h))),
      show(readingsTex(params)),
      say('Estimate the distance with the trapezium rule, then the average speed over the whole time, in m/s.'),
    ],
    lead: '\\text{average} \\approx',
    keypad: [],
    answer: fmt(averageOf(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { ys, h } = params;
    const n = ys.length - 1;
    const { area } = sums(ys, h);
    return [
      ...ruleSolution(ys, h),
      { text: `The whole time is $${n}$ strips of $${fmt(h)}$ s, which is $${fmt(clean(n * h))}$ s.` },
      { tex: `\\frac{${fmt(area)}}{${fmt(clean(n * h))}} = ${fmt(averageOf(params))}` },
    ];
  },
};

interface MeaningParams extends Readings {
  /** The three other stories offered as distractors. */
  others: number[];
}

const MEANINGS = STORIES.map((s) => `${s.what[0].toUpperCase()}${s.what.slice(1)}, in ${s.unit}`);

/** What the number the rule gives stands for, in which units. */
const ctxMeaning: Generator<MeaningParams> = {
  id: 'numer-ctx-meaning-choice',
  sample: (rng, difficulty) => {
    const base = sampleReadings(rng, difficulty > 1 ? STORIES.map((_, i) => i) : storiesOf('rate'), 5);
    const others = rng.sample(
      STORIES.map((_, i) => i).filter((i) => i !== base.story && MEANINGS[i] !== MEANINGS[base.story]),
      3,
    );
    return { ...base, others };
  },
  render: (params): Slide => {
    const { area } = sums(params.ys, params.h);
    return choiceSlide(
      [
        say(STORIES[params.story].setup(fmt(params.h))),
        show(readingsTex(params)),
        say(`The trapezium rule on these readings gives $${fmt(area)}$. What does that number estimate?`),
      ],
      [{ tex: MEANINGS[params.story], correct: true }, ...params.others.map((i) => ({ tex: MEANINGS[i] }))],
      false,
    );
  },
  solution: (params) => {
    const s = STORIES[params.story];
    return [
      {
        text:
          s.kind === 'area'
            ? `The rule finds the area under the graph of $${s.y}$ against $${s.x}$. Widths in metres times distances in metres make square metres: ${s.what}.`
            : `The rule finds the area under the graph of a rate against time, and a rate times a time is an amount: ${s.what}, in ${s.unit}.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 3: over or under, in context
 * ================================================================ */

interface BendParams {
  story: number;
  /** v = p + q t + r t^2 on [0, span]. */
  p: number;
  q: number;
  r: number;
  span: number;
  n: number;
  /** Draw the graph with its chords (difficulty 1) or give the formula alone. */
  picture: boolean;
}

const BEND_STORIES = [
  { what: "a car's speed $v$ m/s", y: 'v', total: 'the distance it travels' },
  { what: 'the rate $r$ litres per minute at which water runs into a tank', y: 'r', total: 'the volume that runs in' },
  { what: "a cyclist's speed $v$ m/s", y: 'v', total: 'the distance ridden' },
];

const bendPoly = ({ p, q, r }: BendParams): Poly => [r, q, p];

function sampleBend(rng: Rng, difficulty: number, allowLine: boolean): BendParams {
  for (;;) {
    const r = allowLine && rng.chance(0.2) ? 0 : rng.pick([-2, -1, -0.5, 0.5, 1, 2]);
    const q = rng.int(-4, 8);
    const p = rng.int(1, 12);
    const span = rng.pick([4, 6, 8]);
    const f = (t: number) => valueAt([r, q, p], t);
    let ok = true;
    for (let i = 0; i <= 40; i += 1) {
      const y = f((span * i) / 40);
      if (y < 0.5 || y > 60) ok = false;
    }
    if (!ok) continue;
    return { story: rng.int(0, BEND_STORIES.length - 1), p, q, r, span, n: rng.pick([2, 4]), picture: difficulty === 1 };
  }
}

const tVar = (tex: string): string => tex.replace(/x/g, 't');

function bendFigure(params: BendParams): string {
  const f = (t: number) => valueAt(bendPoly(params), t);
  const h = params.span / params.n;
  const chords = (t: number) => {
    const i = Math.min(params.n - 1, Math.floor(t / h));
    const a = i * h;
    return f(a) + ((f(a + h) - f(a)) * (t - a)) / h;
  };
  let top = 0;
  for (let i = 0; i <= 40; i += 1) top = Math.max(top, f((params.span * i) / 40));
  return plotSvg({
    xMin: 0,
    xMax: params.span,
    yMin: 0,
    yMax: Math.ceil(top + 2),
    curves: [{ f }, { f: chords, accent: true }],
    verticals: Array.from({ length: params.n + 1 }, (_, i) => ({ x: i * h })),
    label: 'The graph against time with the tops of the trapezia drawn as straight chords',
  });
}

function bendPrompt(params: BendParams, question: string) {
  const s = BEND_STORIES[params.story];
  const formula = `${s.y} = ${tVar(polyTex(bendPoly(params)))}`;
  return [
    say(`Over $0 \\le t \\le ${params.span}$, ${s.what} is $${formula}$. The trapezium rule with ${params.n} strips estimates ${s.total}.`),
    ...(params.picture ? [{ kind: 'diagram' as const, svg: bendFigure(params) }] : []),
    say(question),
  ];
}

const BEND_LABELS = { over: 'An overestimate', under: 'An underestimate', exact: 'Exactly right' };

function bendSolution(params: BendParams): SolutionStep[] {
  const { r } = params;
  if (r === 0) {
    return [
      { text: 'There is no $t^{2}$ term, so the graph is a straight line.' },
      { text: 'Each chord lies along the line itself, so the trapezia fit exactly: the estimate is exactly right.' },
    ];
  }
  return [
    {
      text:
        r > 0
          ? `The $t^{2}$ term is positive, so the graph bends up: each chord lies above the curve.`
          : `The $t^{2}$ term is negative, so the graph bends down: each chord lies below the curve.`,
    },
    { text: r > 0 ? 'The trapezia hold a little too much: an overestimate.' : 'The trapezia miss a little: an underestimate.' },
  ];
}

const ctxBendChoice: Generator<BendParams> = {
  id: 'numer-ctx-bend-choice',
  sample: (rng, difficulty) => sampleBend(rng, difficulty, difficulty > 1),
  render: (params): Slide =>
    choiceSlide(
      bendPrompt(params, 'Is the estimate too big, too small, or exactly right?'),
      [
        { tex: BEND_LABELS.over, correct: params.r > 0 },
        { tex: BEND_LABELS.under, correct: params.r < 0 },
        { tex: BEND_LABELS.exact, correct: params.r === 0 },
      ],
      false,
    ),
  solution: bendSolution,
};

const ctxBendFlow: Generator<BendParams> = {
  id: 'numer-ctx-bend-flow',
  sample: (rng, difficulty) => sampleBend(rng, difficulty, false),
  render: (params): Slide => {
    const s = BEND_STORIES[params.story];
    const verdict = (side: string) =>
      turned(
        [
          { label: 'Too big', outcome: 'An overestimate.' },
          { label: 'Too small', outcome: 'An underestimate.' },
        ],
        `${side}${params.p}${params.q}${params.r}${params.span}${params.n}`,
      );
    return {
      kind: 'flow',
      prompt: bendPrompt(params, 'Decide whether the estimate is too big or too small.'),
      subject: `${s.y} = ${tVar(polyTex(bendPoly(params)))}`,
      steps: [
        {
          id: 'bend',
          ask: 'Which way does the graph bend?',
          branches: [
            { label: 'Up', to: 'up' },
            { label: 'Down', to: 'down' },
          ],
        },
        { id: 'up', ask: 'So each chord lies above the curve. Is the estimate too big or too small?', branches: verdict('up') },
        { id: 'down', ask: 'So each chord lies below the curve. Is the estimate too big or too small?', branches: verdict('down') },
      ],
      answer: params.r > 0 ? ['Up', 'Too big'] : ['Down', 'Too small'],
    };
  },
  solution: bendSolution,
};

const ctxBendTiles: Generator<BendParams> = {
  id: 'numer-ctx-bend-tiles',
  sample: (rng, difficulty) => sampleBend(rng, difficulty, false),
  render: (params): Slide => {
    const answer = params.r > 0 ? ['\\text{up}', '\\text{overestimate}'] : ['\\text{down}', '\\text{underestimate}'];
    return {
      kind: 'tiles',
      prompt: bendPrompt(params, 'Complete the sentence.'),
      template: '\\text{The graph bends } {0} \\text{, so the rule gives an } {1}',
      bank: fillBank(answer, ['\\text{up}', '\\text{down}', '\\text{overestimate}', '\\text{underestimate}']),
      answer,
    };
  },
  solution: bendSolution,
};

/* ================================================================
 * Lesson 4: more strips
 * ================================================================ */

interface MoreParams {
  /** f = a x^2 + b x + c on [0, 6], positive throughout. */
  a: number;
  b: number;
  c: number;
}

function sampleMore(rng: Rng): MoreParams {
  for (;;) {
    const a = rng.pick([-3, -2, -1, 1, 2, 3]);
    const b = rng.int(-3, 12);
    const c = rng.int(1, 12);
    let ok = true;
    for (let x = 0; x <= 6; x += 0.5) if (valueAt([a, b, c], x) <= 0) ok = false;
    if (!ok) continue;
    return { a, b, c };
  }
}

const morePoly = ({ a, b, c }: MoreParams): Poly => [a, b, c];

/** The trapezium estimate with n strips over [0, 6]. */
function estimateWith(params: MoreParams, n: number): number {
  const h = 6 / n;
  const ys = Array.from({ length: n + 1 }, (_, i) => valueAt(morePoly(params), i * h));
  return sums(ys, h).area;
}

const exactOf = ({ a, b, c }: MoreParams): number => 72 * a + 18 * b + 6 * c;

const moreIntegral = (params: MoreParams): string => `\\int_0^6 (${polyTex(morePoly(params))})\\,dx`;

/**
 * Estimates with 2, 3 and 6 strips. On a quadratic over [0, 6] the error is
 * exactly 36a / n^2, so the estimates close in from one side. Difficulty 1
 * asks which is best; difficulty 2 which number could be the exact value.
 */
const moreCloser: Generator<MoreParams & { exact: boolean }> = {
  id: 'numer-more-closer-choice',
  sample: (rng, difficulty) => ({ ...sampleMore(rng), exact: difficulty > 1 }),
  render: (params): Slide => {
    const [e2, e3, e6] = [2, 3, 6].map((n) => estimateWith(params, n));
    const bend = params.a > 0 ? 'up' : 'down';
    const intro = say(
      `The trapezium rule estimates an integral with 2, 3 and 6 strips as $${fmt(e2)}$, $${fmt(e3)}$ and $${fmt(e6)}$. The curve bends ${bend} all the way.`,
    );
    if (!params.exact) {
      return choiceSlide(
        [intro, say('Which estimate is likely to be closest to the exact value?')],
        [{ tex: fmt(e6), correct: true }, { tex: fmt(e2) }, { tex: fmt(e3) }, { tex: fmt(clean((e2 + e6) / 2)) }],
      );
    }
    const I = exactOf(params);
    const a = params.a;
    return choiceSlide(
      [intro, say('Which of these could be the exact value?')],
      [{ tex: fmt(I), correct: true }, { tex: fmt(clean(I + 2 * a)) }, { tex: fmt(clean(I + 6 * a)) }, { tex: fmt(clean(I + 20 * a)) }],
    );
  },
  solution: (params) => {
    const over = params.a > 0;
    return [
      { text: 'More strips mean shorter chords that hug the curve more closely, so the 6-strip estimate is the best of the three.' },
      {
        text: over
          ? 'The curve bends up, so every estimate is too big, and they fall towards the exact value as the strips increase: it is below even the 6-strip estimate.'
          : 'The curve bends down, so every estimate is too small, and they rise towards the exact value as the strips increase: it is above even the 6-strip estimate.',
      },
      ...(params.exact ? [{ text: `Of the options, only $${fmt(exactOf(params))}$ is beyond the 6-strip estimate, on the far side from the others.` }] : []),
    ];
  },
};

/** A table of estimates as the strips increase, the exact value's pull visible down the column. */
const moreTable: Generator<MoreParams & { upTo: number }> = {
  id: 'numer-more-strips-table',
  sample: (rng, difficulty) => ({ ...sampleMore(rng), upTo: difficulty > 1 ? 6 : 3 }),
  render: (params): Slide => {
    const ns = params.upTo === 6 ? [1, 2, 3, 6] : [1, 2, 3];
    const est = ns.map((n) => estimateWith(params, n));
    const answer = est.slice(1).map(fmt);
    const slips = ns.slice(1).flatMap((n) => {
      const h = 6 / n;
      const ys = Array.from({ length: n + 1 }, (_, i) => valueAt(morePoly(params), i * h));
      const { ends, mids, total } = sums(ys, h);
      return [clean(h * total), clean((h / 2) * (ends + mids))];
    });
    return {
      kind: 'table',
      prompt: [say(`Trapezium rule estimates of $${moreIntegral(params)}$. Fill in the estimates for more strips.`)],
      columns: ['n', 'h', '\\text{estimate}'],
      rows: ns.map((n, i) => [String(n), fmt(6 / n), i === 0 ? fmt(est[0]) : null]),
      bank: numberBank(answer, slips.map(fmt), around(est.slice(1), 1)),
      answer,
    };
  },
  solution: (params) => {
    const ns = params.upTo === 6 ? [2, 3, 6] : [2, 3];
    return [
      { text: 'Each row needs the heights at every multiple of $h$ from $0$ to $6$:' },
      ...ns.map((n) => {
        const h = 6 / n;
        const ys = Array.from({ length: n + 1 }, (_, i) => valueAt(morePoly(params), i * h));
        const { ends, mids, area } = sums(ys, h);
        return { tex: `n = ${n}: \\ \\frac{${fmt(h)}}{2}(${fmt(ends)} + 2 \\times ${fmt(mids)}) = ${fmt(area)}` };
      }),
      { text: 'The estimates close in on the exact value as the strips increase.' },
    ];
  },
};

/* ================================================================
 * Lesson 5: profiles and cross-sections
 * ================================================================ */

interface ProfileParams {
  /** A tunnel y = k(w^2 - x^2) on [-w, w], or a riverbed d = k x(L - x) on [0, L]. */
  kind: 'tunnel' | 'riverbed';
  k: number;
  /** Half-width w, or width L. */
  size: number;
  n: number;
}

function profileRange({ kind, size }: ProfileParams): [number, number] {
  return kind === 'tunnel' ? [-size, size] : [0, size];
}

function profileF({ kind, k, size }: ProfileParams): (x: number) => number {
  return kind === 'tunnel' ? (x) => k * (size * size - x * x) : (x) => k * x * (size - x);
}

function profileTex({ kind, k, size }: ProfileParams): string {
  const coef = k === 1 ? '' : fmt(k);
  return kind === 'tunnel' ? `y = ${coef}(${size * size} - x^{2})` : `d = ${coef}x(${size} - x)`;
}

function profileText(params: ProfileParams): string {
  const [lo, hi] = profileRange(params);
  return params.kind === 'tunnel'
    ? `A tunnel's entrance is the region under $${profileTex(params)}$ above the ground, from $x = ${lo}$ to $x = ${hi}$, in metres.`
    : `A channel's depth $d$ m at a distance $x$ m across is $${profileTex(params)}$, from $x = 0$ to $x = ${hi}$.`;
}

function profileHeights(params: ProfileParams): { h: number; xs: number[]; ys: number[] } {
  const [lo, hi] = profileRange(params);
  const h = (hi - lo) / params.n;
  const xs = Array.from({ length: params.n + 1 }, (_, i) => clean(lo + i * h));
  const f = profileF(params);
  return { h, xs, ys: xs.map((x) => clean(f(x))) };
}

function sampleProfile(rng: Rng, counts: (params: ProfileParams) => number[]): ProfileParams {
  for (;;) {
    const kind = rng.pick(['tunnel', 'riverbed'] as const);
    const k = rng.pick([0.5, 1, 1.5, 2, 2.5, 3]);
    const size = kind === 'tunnel' ? rng.pick([2, 3, 4, 5]) : rng.pick([4, 6, 8, 10]);
    const base = { kind, k, size, n: 1 };
    const n = rng.pick(counts(base));
    const params = { ...base, n };
    const { h, ys } = profileHeights(params);
    if (!terminates(h, 2) || ys.some((y) => y > 99)) continue;
    return params;
  }
}

function profileSolution(params: ProfileParams): SolutionStep[] {
  const { h, xs, ys } = profileHeights(params);
  return [
    { text: `${params.n} strips across make $h = ${fmt(h)}$. The heights are` },
    { tex: twoRowTable('x', params.kind === 'tunnel' ? 'y' : 'd', xs, ys) },
    ...ruleSolution(ys, h).slice(1),
  ];
}

const profileArea: Generator<ProfileParams> = {
  id: 'numer-profile-area',
  sample: (rng, difficulty) =>
    sampleProfile(rng, ({ kind, size }) => (difficulty > 1 ? [kind === 'tunnel' ? size : size / 2] : [kind === 'tunnel' ? 2 * size : size])),
  choices: (params) => {
    const { h, ys } = profileHeights(params);
    return ruleChoices(ys, h);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(profileText(params)), say(`Use the trapezium rule with ${params.n} strips to estimate the ${params.kind === 'tunnel' ? "entrance's area" : "channel's cross-section"}, in square metres.`)],
    lead: 'A \\approx',
    keypad: [],
    answer: fmt(sums(profileHeights(params).ys, profileHeights(params).h).area),
    domain: 'real',
    mode: 'exact',
  }),
  solution: profileSolution,
};

/**
 * Four strips on a profile that is nought at both ends: the rule is then h
 * times the three middle heights, since the bracket is 2(y_1 + y_2 + y_3).
 */
const profileTree: Generator<ProfileParams> = {
  id: 'numer-profile-heights-tree',
  sample: (rng) => sampleProfile(rng, () => [4]),
  render: (params): Slide => {
    const { h, xs, ys } = profileHeights(params);
    const mids = clean(ys[1] + ys[2] + ys[3]);
    const area = clean(h * mids);
    const answer = [ys[1], ys[2], ys[3], mids, area].map(fmt);
    const f = profileF(params);
    return {
      kind: 'tree',
      prompt: [
        say(profileText(params)),
        say(
          `Four strips, $h = ${fmt(h)}$. Both ends are $0$. Top row: the heights at $x = ${fmt(xs[1])}$, $${fmt(xs[2])}$, $${fmt(xs[3])}$. Then their sum, then the area.`,
        ),
      ],
      expression: `A \\approx \\frac{${fmt(h)}}{2}\\big[0 + 0 + 2(y_1 + y_2 + y_3)\\big]`,
      nodes: [
        { id: 'y1', from: [] },
        { id: 'y2', from: [] },
        { id: 'y3', from: [] },
        { id: 'sum', from: ['y1', 'y2', 'y3'] },
        { id: 'area', from: ['sum'] },
      ],
      bank: numberBank(answer, [clean(f(h)), clean((h / 2) * mids), clean(2 * h * mids), clean(f(xs[2] + h / 2))].map(fmt), around([area, mids], 1)),
      answer,
    };
  },
  solution: (params) => {
    const { h, xs, ys } = profileHeights(params);
    const mids = clean(ys[1] + ys[2] + ys[3]);
    return [
      { text: `The heights at $x = ${fmt(xs[1])}$, $${fmt(xs[2])}$ and $${fmt(xs[3])}$ are $${fmt(ys[1])}$, $${fmt(ys[2])}$ and $${fmt(ys[3])}$, and the ends are $0$.` },
      { tex: `${fmt(ys[1])} + ${fmt(ys[2])} + ${fmt(ys[3])} = ${fmt(mids)}` },
      { tex: `\\frac{${fmt(h)}}{2} \\times 2 \\times ${fmt(mids)} = ${fmt(h)} \\times ${fmt(mids)} = ${fmt(clean(h * mids))}` },
    ];
  },
};

interface VolumeParams extends Readings {
  length: number;
}

/** A prism's volume: the cross-section the rule estimates, times the length. */
const profileVolume: Generator<VolumeParams> = {
  id: 'numer-profile-volume',
  sample: (rng, difficulty) => ({ ...sampleReadings(rng, [0], difficulty > 1 ? 6 : 5), length: rng.pick([10, 20, 25, 50, 100]) }),
  choices: (params) => {
    const { area, total } = sums(params.ys, params.h);
    return options(
      { tex: fmt(clean(area * params.length)), answer: fmt(clean(area * params.length)) },
      { tex: fmt(area), answer: fmt(area) },
      { tex: fmt(clean(params.h * total * params.length)), answer: fmt(clean(params.h * total * params.length)) },
      { tex: fmt(clean((area * params.length) / 2)), answer: fmt(clean((area * params.length) / 2)) },
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(`A canal $${params.length}$ m long has the same cross-section all the way along. Its depth $d$ m is measured every $${fmt(params.h)}$ m across:`),
      show(readingsTex(params)),
      say('Estimate the volume of water in the canal, in cubic metres.'),
    ],
    lead: 'V \\approx',
    keypad: [],
    answer: fmt(clean(sums(params.ys, params.h).area * params.length)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { area } = sums(params.ys, params.h);
    return [
      ...ruleSolution(params.ys, params.h),
      { text: `That is the cross-section in square metres. The canal is a prism, so` },
      { tex: `V \\approx ${fmt(area)} \\times ${params.length} = ${fmt(clean(area * params.length))}` },
    ];
  },
};

export const numericalContextGenerators = [
  ctxTrapValue,
  ctxSumsTree,
  ctxStrips,
  ctxRuleSteps,
  speedDistance,
  speedMeanSlider,
  speedAverage,
  ctxMeaning,
  ctxBendChoice,
  ctxBendFlow,
  ctxBendTiles,
  moreCloser,
  moreTable,
  profileArea,
  profileTree,
  profileVolume,
];

