/**
 * Numerical Methods, level 10: numerical methods in modelling (roadmap C15).
 *
 * Shown on the Numerical Methods Basics card. A problem in words becomes an
 * equation, the equation is solved by the methods of the earlier levels, and
 * the answer is reported, checked and judged: setting up a volume equation
 * and bracketing its root, rounding and the interval a rounded value stands
 * for, whether an answer makes sense, percentage error, and choosing a method.
 *
 * Every value a learner types or taps is exact. Roots of the models are never
 * asked for beyond the tenth the slider reads, and rounding is done on whole
 * numbers of digits (`decimal`, `roundUnits`) so no float ever decides a digit.
 */
import type { Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { plotFigure, plotSvg } from '../figures';
import { say } from './format';
import {
  aligned,
  around,
  bisect,
  choiceSlide,
  clamped,
  clean,
  fillBank,
  fmt,
  numberBank,
  polyTex,
  show,
  signed,
  terminates,
  turned,
  valueAt,
  withAxisNumbers,
  type Poly,
} from './numericalKit';

/* ================================================================
 * Digits held as whole numbers
 * ================================================================ */

/** `units` times ten to the `exp`, written out: (312, -2) is 3.12, (35, 1) is 350. */
function decimal(units: number, exp: number): string {
  if (exp >= 0) return String(units * 10 ** exp);
  const negative = units < 0;
  const digits = String(Math.abs(units)).padStart(-exp + 1, '0');
  const whole = digits.slice(0, exp);
  const frac = digits.slice(exp);
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

/** Round `units` to a multiple of `10^drop`, halves up, returning the count of those multiples. */
function roundUnits(units: number, drop: number): number {
  if (drop <= 0) return units * 10 ** -drop;
  const step = 10 ** drop;
  return Math.floor((units + step / 2) / step);
}

/** Cut off rather than rounded, the slip rounding is most often mistaken for. */
const truncUnits = (units: number, drop: number): number => (drop <= 0 ? units * 10 ** -drop : Math.floor(units / 10 ** drop));

const digitCount = (units: number): number => String(Math.abs(units)).length;

const PLACE_WORDS = ['', '1 decimal place', '2 decimal places', '3 decimal places'];
const SF_WORDS = ['', '1 significant figure', '2 significant figures', '3 significant figures', '4 significant figures'];

/* ================================================================
 * Volume models
 * ================================================================ */

interface Model {
  story: (k: number, V: number) => string;
  /** The volume, as the story builds it. */
  volume: (x: number, k: number) => number;
  /** The volume written from its dimensions, `x^{2}(x + 2)`. */
  build: (k: number) => string;
  /** The same in words, for a figure's label: SVG text cannot hold TeX. */
  plain: (k: number) => string;
  /** The volume at a number, written for substitution. */
  buildAt: (x: string, k: number) => string;
  /** x^3 + b x^2 - V, with its leading coefficient. */
  lead: number;
  square: (k: number) => number;
}

const MODELS: Model[] = [
  {
    story: (k, V) => `A box has a square base of side $x$ cm. It is $${k}$ cm taller than it is wide, and its volume is $${V}$ cm³.`,
    volume: (x, k) => x * x * (x + k),
    build: (k) => `x^{2}(x + ${k})`,
    plain: (k) => `x squared times (x + ${k})`,
    buildAt: (x, k) => `${x}^{2} \\times (${x} + ${k})`,
    lead: 1,
    square: (k) => k,
  },
  {
    story: (k, V) => `A box has a square base of side $x$ cm. It is $${k}$ cm less tall than it is wide, and its volume is $${V}$ cm³.`,
    volume: (x, k) => x * x * (x - k),
    build: (k) => `x^{2}(x - ${k})`,
    plain: (k) => `x squared times (x - ${k})`,
    buildAt: (x, k) => `${x}^{2} \\times (${x} - ${k})`,
    lead: 1,
    square: (k) => -k,
  },
  {
    story: (k, V) => `A block measures $x$ cm by $2x$ cm by $x + ${k}$ cm. Its volume is $${V}$ cm³.`,
    volume: (x, k) => 2 * x * x * (x + k),
    build: (k) => `2x^{2}(x + ${k})`,
    plain: (k) => `2x squared times (x + ${k})`,
    buildAt: (x, k) => `2 \\times ${x}^{2} \\times (${x} + ${k})`,
    lead: 2,
    square: (k) => 2 * k,
  },
];

interface ModelParams {
  kind: number;
  k: number;
  V: number;
}

const modelPoly = ({ kind, k, V }: ModelParams): Poly => [MODELS[kind].lead, MODELS[kind].square(k), 0, -V];

/** The one positive root: the side the story asks for. */
function sideOf(params: ModelParams): number {
  const p = modelPoly(params);
  return bisect((x) => valueAt(p, x), Math.max(0.5, params.k * (params.kind === 1 ? 1 : 0)), 30);
}

const tenthOf = (params: ModelParams): number => clean(Math.round(sideOf(params) * 10) / 10);

function sampleModel(rng: Rng, kinds: number[]): ModelParams {
  for (;;) {
    const kind = rng.pick(kinds);
    const k = rng.int(1, 5);
    const target = rng.int(21, 59) / 10;
    if (kind === 1 && target < k + 1) continue;
    const V = Math.round(MODELS[kind].volume(target, k));
    if (V < 12 || V > 400) continue;
    const params = { kind, k, V };
    const side = sideOf(params);
    const whole = side - Math.floor(side);
    const tenth = side * 10 - Math.floor(side * 10);
    if (whole < 0.06 || whole > 0.94 || Math.abs(tenth - 0.5) < 0.15) continue;
    return params;
  }
}

const fTex = (params: ModelParams): string => `f(x) = ${polyTex(modelPoly(params))}`;

/** `f(3) = 3^3 + 2 x 3^2 - 50 = -5`, one power at a time. */
function substitution(p: Poly, n: number): string[] {
  const [a, b, , c] = p;
  const cube = `${a === 1 ? '' : `${a} \\times `}${n}^{3}`;
  const square = `${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : `${Math.abs(b)} \\times `}${n}^{2}`;
  const parts = [a * n ** 3, b * n * n, c];
  return [`f(${n}) &= ${cube} ${square} ${signed(c)}`, `&= ${fmt(parts[0])} ${signed(parts[1])} ${signed(parts[2])}`, `&= ${fmt(valueAt(p, n))}`];
}

function expandSolution(params: ModelParams): SolutionStep[] {
  const p = modelPoly(params);
  return [
    { text: 'Multiply out the volume, then take the volume away from both sides:' },
    { tex: aligned(`${MODELS[params.kind].build(params.k)} &= ${params.V}`, `${polyTex([p[0], p[1], 0, 0])} &= ${params.V}`, `${polyTex(p)} &= 0`) },
  ];
}

/** Lesson 1: from the story to the equation. */
const modelTiles: Generator<ModelParams> = {
  id: 'numer-model-equation-tiles',
  sample: (rng, difficulty) => sampleModel(rng, difficulty > 1 ? [0, 1, 2] : [0, 1]),
  render: (params): Slide => {
    const p = modelPoly(params);
    const answer = [signed(p[1]), signed(p[3])];
    return {
      kind: 'tiles',
      prompt: [say(MODELS[params.kind].story(params.k, params.V)), say('Write the volume as an equation equal to nought.')],
      // `x^3`, not `x^{3}`: a template is split on `{n}`, and `{3}` would read as a blank.
      template: `${p[0] === 1 ? '' : p[0]}x^3 {0}x^2 {1} = 0`,
      bank: fillBank(answer, [signed(-p[1]), signed(params.V), signed(params.k === p[1] ? 2 * p[1] : params.k), signed(-p[1] - 1), signed(-params.V - params.k)]),
      answer,
    };
  },
  solution: expandSolution,
};

interface ValueParams extends ModelParams {
  at: number;
}

function sampleValue(rng: Rng, kinds: number[]): ValueParams {
  const params = sampleModel(rng, kinds);
  const side = sideOf(params);
  return { ...params, at: rng.pick([Math.floor(side), Math.ceil(side)]) };
}

const modelValue: Generator<ValueParams> = {
  id: 'numer-model-value',
  sample: (rng, difficulty) => sampleValue(rng, difficulty > 1 ? [0, 1, 2] : [0, 1]),
  choices: (params) => {
    const p = modelPoly(params);
    const n = params.at;
    const right = valueAt(p, n);
    return options(
      { tex: fmt(right), answer: fmt(right) },
      { tex: fmt(right + 2 * params.V), answer: fmt(right + 2 * params.V) },
      { tex: fmt(p[0] * n ** 3 - params.V), answer: fmt(p[0] * n ** 3 - params.V) },
      { tex: fmt(right - 2 * p[1] * n * n), answer: fmt(right - 2 * p[1] * n * n) },
      { tex: fmt(right + 1), answer: fmt(right + 1) },
    ).slice(0, 4);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(MODELS[params.kind].story(params.k, params.V)), show(fTex(params)), say(`Work out $f(${params.at})$.`)],
    lead: `f(${params.at}) =`,
    keypad: [],
    answer: fmt(valueAt(modelPoly(params), params.at)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const value = valueAt(modelPoly(params), params.at);
    return [
      { tex: aligned(...substitution(modelPoly(params), params.at)) },
      {
        text:
          value < 0
            ? `Negative: a box of side $${params.at}$ cm holds less than $${params.V}$ cm³, so the side is more than $${params.at}$.`
            : `Positive: a box of side $${params.at}$ cm holds more than $${params.V}$ cm³, so the side is less than $${params.at}$.`,
      },
    ];
  },
};

/**
 * Five values of f. Values of two or three digits with their signs make five
 * columns too wide for a phone, so a wide table is split three over two, as
 * the readings tables are.
 */
function valuesTable(params: ModelParams, from: number): string {
  const p = modelPoly(params);
  const xs = Array.from({ length: 5 }, (_, i) => from + i);
  const ys = xs.map((x) => fmt(valueAt(p, x)));
  const part = (a: number, b: number) =>
    `\\begin{array}{c|${'c'.repeat(b - a)}} x & ${xs.slice(a, b).join(' & ')} \\\\ \\hline f(x) & ${ys.slice(a, b).join(' & ')} \\end{array}`;
  if (ys.join('').length <= 10) return part(0, 5);
  return `\\begin{gathered} ${part(0, 3)} \\\\[6pt] ${part(3, 5)} \\end{gathered}`;
}

const tableStart = (params: ModelParams): number => Math.max(params.kind === 1 ? params.k : 1, Math.floor(sideOf(params)) - 2);

interface IntervalParams extends ModelParams {
  /** Give a table of values (difficulty 1) or leave them to be worked out. */
  table: boolean;
}

const modelInterval: Generator<IntervalParams> = {
  id: 'numer-model-interval-choice',
  sample: (rng, difficulty) => ({ ...sampleModel(rng, difficulty > 1 ? [0, 1, 2] : [0, 1]), table: difficulty === 1 }),
  render: (params): Slide => {
    const low = Math.floor(sideOf(params));
    const start = Math.max(1, low - 1);
    return choiceSlide(
      [
        say(MODELS[params.kind].story(params.k, params.V)),
        show(fTex(params)),
        ...(params.table ? [show(valuesTable(params, tableStart(params)))] : []),
        say('Between which two whole numbers is the side $x$?'),
      ],
      [start, start + 1, start + 2, start + 3].map((n) => ({ tex: `${n} < x < ${n + 1}`, correct: n === low })),
    );
  },
  solution: (params) => {
    const p = modelPoly(params);
    const low = Math.floor(sideOf(params));
    return [
      { tex: aligned(`f(${low}) &= ${fmt(valueAt(p, low))}`, `f(${low + 1}) &= ${fmt(valueAt(p, low + 1))}`) },
      { text: `The sign changes from negative to positive, so the side is between $${low}$ and $${low + 1}$: $${low} < x < ${low + 1}$.` },
    ];
  },
};

function meetFigure(params: ModelParams): string {
  const m = MODELS[params.kind];
  const xMax = Math.ceil(sideOf(params)) + 1;
  const top = Math.ceil((params.V * 1.6) / 10) * 10;
  return withAxisNumbers(
    plotSvg({
      xMin: 0,
      xMax,
      yMin: -top * 0.15,
      yMax: top,
      curves: [{ f: clamped((x) => m.volume(x, params.k), top * 2) }, { f: () => params.V, accent: true }],
      label: `The graph of the volume y = ${m.plain(params.k)} against x, and the line y = ${params.V}`,
    }),
  );
}

const modelSlider: Generator<ModelParams> = {
  id: 'numer-model-graph-slider',
  sample: (rng, difficulty) => sampleModel(rng, difficulty > 1 ? [0, 1, 2] : [0, 1]),
  render: (params): Slide => ({
    kind: 'slider',
    prompt: [
      say(MODELS[params.kind].story(params.k, params.V)),
      say(`The graph shows $y = ${MODELS[params.kind].build(params.k)}$ and the line $y = ${params.V}$. Slide to the side $x$, to the nearest tenth.`),
    ],
    min: 0,
    max: Math.ceil(sideOf(params)) + 1,
    step: 0.1,
    tolerance: 0.15,
    answer: tenthOf(params),
    readout: 'x = {v}',
    figure: plotFigure(meetFigure(params)),
  }),
  solution: (params) => {
    const r = tenthOf(params);
    const m = MODELS[params.kind];
    return [
      { text: `The side is where the volume curve meets the line $y = ${params.V}$. Read down to the $x$-axis: about $x = ${fmt(r)}$.` },
      { text: 'A check, by putting it back in:' },
      { tex: `${m.buildAt(fmt(r), params.k)} = ${fmt(clean(m.volume(r, params.k)))}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: reporting a root
 * ================================================================ */

interface RoundParams {
  /** The value is `units x 10^exp`. */
  units: number;
  exp: number;
  mode: 'dp' | 'sf';
  places: number;
}

/** The exponent of the last digit kept. */
function keptExp({ units, exp, mode, places }: RoundParams): number {
  if (mode === 'dp') return -places;
  const lead = digitCount(units) - 1 + exp;
  return lead - places + 1;
}

function roundedOf(params: RoundParams, places = params.places): string {
  const kept = keptExp({ ...params, places });
  return decimal(roundUnits(params.units, kept - params.exp), kept);
}

const roundReport: Generator<RoundParams> = {
  id: 'numer-report-round',
  sample: (rng, difficulty) => {
    for (;;) {
      const params: RoundParams =
        difficulty > 1
          ? { units: rng.int(10000, 99999), exp: rng.pick([-7, -6, -5, -3, -2, -1]), mode: 'sf', places: rng.pick([2, 3]) }
          : { units: rng.int(10000000, 99999999), exp: -7, mode: 'dp', places: rng.pick([1, 2, 3]) };
      const kept = keptExp(params);
      const q = roundUnits(params.units, kept - params.exp);
      if (q % 10 === 0 || digitCount(q) !== digitCount(truncUnits(params.units, kept - params.exp))) continue;
      return params;
    }
  },
  choices: (params) => {
    const kept = keptExp(params);
    const drop = kept - params.exp;
    const right = roundedOf(params);
    const wrong = [
      decimal(truncUnits(params.units, drop), kept),
      roundedOf(params, params.places + 1),
      params.places > 1 ? roundedOf(params, params.places - 1) : decimal(roundUnits(params.units, drop) + 1, kept),
      params.mode === 'sf' && kept > 0 ? String(roundUnits(params.units, drop)) : decimal(roundUnits(params.units, drop) - 1, kept),
      decimal(roundUnits(params.units, drop) + 2, kept),
      decimal(roundUnits(params.units, drop) - 2, kept),
    ];
    // A value written with a trailing nought is the same number as the right answer, or as another slip.
    const distinct = wrong.filter((w, i) => Number(w) !== Number(right) && wrong.findIndex((v) => Number(v) === Number(w)) === i);
    return options({ tex: right, answer: right }, ...distinct.map((w) => ({ tex: w, answer: w }))).slice(0, 4);
  },
  render: (params): Slide => {
    const value = decimal(params.units, params.exp);
    return {
      kind: 'expression',
      prompt: [say(`Round $${value}$ to ${params.mode === 'dp' ? PLACE_WORDS[params.places] : SF_WORDS[params.places]}.`)],
      lead: `${value} \\approx`,
      keypad: [],
      answer: roundedOf(params),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const kept = keptExp(params);
    const drop = kept - params.exp;
    const digits = String(params.units);
    const next = Number(digits[digits.length - drop]);
    const where =
      params.mode === 'dp'
        ? `Keep ${PLACE_WORDS[params.places]}.`
        : `Count ${SF_WORDS[params.places]} from the first digit that is not nought${kept > 0 ? ', then fill with noughts back to the decimal point' : ''}.`;
    return [
      { text: `${where} The next digit is $${next}$, so round ${next >= 5 ? 'up' : 'down'}.` },
      { tex: `${decimal(params.units, params.exp)} \\approx ${roundedOf(params)}` },
    ];
  },
};

interface ReportParams {
  story: number;
  /** The reported value is `units x 10^exp`. */
  units: number;
  exp: number;
  mode: 'dp' | 'sf';
}

const REPORT_STORIES = [
  { name: 'x', what: 'The side of a box', unit: 'cm' },
  { name: 't', what: 'The time a ball lands', unit: 's' },
  { name: 'L', what: 'The length of a fence', unit: 'm' },
  { name: '\\alpha', what: 'A root', unit: '' },
];

function sampleReport(rng: Rng, difficulty: number): ReportParams {
  for (;;) {
    const story = rng.int(0, REPORT_STORIES.length - 1);
    if (difficulty === 1) {
      const exp = rng.pick([-1, -2]);
      const units = rng.int(11, exp === -1 ? 99 : 999);
      if (units % 10 === 0) continue;
      return { story, units, exp, mode: 'dp' };
    }
    const units = rng.int(11, 999);
    const exp = rng.pick([-2, -1, 0, 1]);
    if (units % 10 === 0 || (units < 100 && exp === -2)) continue;
    return { story, units, exp, mode: 'sf' };
  }
}

function reportText(params: ReportParams): string {
  const s = REPORT_STORIES[params.story];
  const places = params.mode === 'dp' ? PLACE_WORDS[-params.exp] : SF_WORDS[digitCount(params.units)];
  const unit = s.unit ? ` ${s.unit}` : '';
  return `${s.what} is $${s.name} = ${decimal(params.units, params.exp)}$${unit} to ${places}.`;
}

/** The bounds, half a unit of the last digit either side, written exactly. */
function boundsOf({ units, exp }: ReportParams): { lo: string; hi: string; half: string } {
  return { lo: decimal((2 * units - 1) * 5, exp - 1), hi: decimal((2 * units + 1) * 5, exp - 1), half: decimal(5, exp - 1) };
}

const reportInterval: Generator<ReportParams> = {
  id: 'numer-report-interval-tiles',
  sample: (rng, difficulty) => sampleReport(rng, difficulty),
  render: (params): Slide => {
    const { lo, hi } = boundsOf(params);
    const { units, exp } = params;
    const name = REPORT_STORIES[params.story].name;
    const answer = [lo, hi];
    return {
      kind: 'tiles',
      prompt: [say(reportText(params)), say('Fill in the interval it lies in.')],
      template: `{0} \\le ${name} < {1}`,
      bank: fillBank(answer, [decimal(units, exp), decimal(units - 1, exp), decimal(units + 1, exp), decimal(10 * units - 1, exp - 1), decimal(10 * units + 9, exp - 1)]),
      answer,
    };
  },
  solution: (params) => {
    const { lo, hi, half } = boundsOf(params);
    return [
      { text: `Anything within half a unit of the last digit, $${half}$, rounds to it: from $${lo}$ up to but not including $${hi}$.` },
      { tex: `${lo} \\le ${REPORT_STORIES[params.story].name} < ${hi}` },
    ];
  },
};

const reportErrorBound: Generator<ReportParams> = {
  id: 'numer-report-error-bound-choice',
  sample: (rng, difficulty) => sampleReport(rng, difficulty),
  render: (params): Slide => {
    const { half } = boundsOf(params);
    return choiceSlide(
      [say(reportText(params)), say('What is the largest the error in this value can be?')],
      [
        { tex: half, correct: true },
        { tex: decimal(1, params.exp) },
        { tex: decimal(5, params.exp - 2) },
        { tex: decimal(5, params.exp) },
      ],
    );
  },
  solution: (params) => {
    const { lo, hi, half } = boundsOf(params);
    return [
      { text: `The true value is from $${lo}$ up to $${hi}$, so it is at most half a unit of the last digit away:` },
      { tex: `\\text{error} \\le ${half}` },
    ];
  },
};

interface AgreeParams {
  /** Two estimates held to four places, as whole numbers of ten-thousandths. */
  first: number;
  second: number;
  dp: number;
}

const roundedTo = (units: number, dp: number): string => decimal(roundUnits(units, 4 - dp), -dp);

const reportAgree: Generator<AgreeParams> = {
  id: 'numer-report-agree-flow',
  sample: (rng, difficulty) => {
    const dp = difficulty > 1 ? 2 : 1;
    const agree = rng.chance(0.5);
    const unit = 10 ** (4 - dp);
    for (;;) {
      const first = rng.int(10001, 99999);
      const second = first + rng.int(-unit / 2, unit / 2);
      if (second === first) continue;
      const [a, b] = [roundedTo(first, dp), roundedTo(second, dp)];
      if ((a === b) !== agree || a.endsWith('0') || b.endsWith('0')) continue;
      return { first, second, dp };
    }
  },
  render: ({ first, second, dp }): Slide => {
    const [a, b] = [roundedTo(first, dp), roundedTo(second, dp)];
    const slip = (units: number, right: string) => {
      const cut = decimal(truncUnits(units, 4 - dp), -dp);
      return cut !== right ? cut : decimal(roundUnits(units, 4 - dp) + 1, -dp);
    };
    const words = PLACE_WORDS[dp];
    return {
      kind: 'flow',
      prompt: [
        say(`Two estimates of a root, the second closer than the first: $${decimal(first, -4)}$, then $${decimal(second, -4)}$. Can the root be given to ${words}?`),
      ],
      subject: `${decimal(first, -4)} \\quad ${decimal(second, -4)}`,
      steps: [
        {
          id: 'first',
          ask: `Round $${decimal(first, -4)}$ to ${words}.`,
          branches: turned([{ label: `$${a}$`, to: 'second' }, { label: `$${slip(first, a)}$`, to: 'second' }], `${first}a`),
        },
        {
          id: 'second',
          ask: `Round $${decimal(second, -4)}$ to ${words}.`,
          branches: turned([{ label: `$${b}$`, to: 'verdict' }, { label: `$${slip(second, b)}$`, to: 'verdict' }], `${second}b`),
        },
        {
          id: 'verdict',
          ask: 'Do the two agree?',
          branches: [
            { label: 'Yes', outcome: `Report the root as $${b}$ to ${words}.` },
            { label: 'No', outcome: `Not yet: take another estimate before giving ${words}.` },
          ],
        },
      ],
      answer: [`$${a}$`, `$${b}$`, a === b ? 'Yes' : 'No'],
    };
  },
  solution: ({ first, second, dp }) => {
    const [a, b] = [roundedTo(first, dp), roundedTo(second, dp)];
    return [
      { tex: aligned(`${decimal(first, -4)} &\\approx ${a}`, `${decimal(second, -4)} &\\approx ${b}`) },
      {
        text:
          a === b
            ? `They agree, so the root is $${b}$ to ${PLACE_WORDS[dp]}.`
            : `They round differently, so the estimates do not yet fix the root to ${PLACE_WORDS[dp]}.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 3: does the answer make sense?
 * ================================================================ */

interface RootsParams {
  story: number;
  /** The quadratic the story comes to, x^2 + b x + c = 0 (or 5t^2 + b t + c = 0 for the ball). */
  b: number;
  c: number;
}

const ROOT_STORIES = [
  {
    text: ({ b, c }: RootsParams) => `A ball is thrown up from $${-c}$ m above the ground. Its height after $t$ s is $h = ${-c} + ${-b}t - 5t^{2}$, and it lands when $h = 0$.`,
    name: 't',
    lead: 5,
    why: 'Time runs forward from the throw, so the negative time is before it was thrown. It lands at the positive time.',
  },
  {
    text: ({ b, c }: RootsParams) => `A rectangle is $x$ m wide and $x + ${b}$ m long. Its area is $${-c}$ m², so $x^{2} + ${b}x - ${-c} = 0$.`,
    name: 'x',
    lead: 1,
    why: 'A width cannot be negative, so only the positive root is the width.',
  },
  {
    text: ({ b, c }: RootsParams) => `A rectangle has a perimeter of $${-2 * b}$ m and an area of $${c}$ m². One side is $x$ m, so $x^{2} - ${-b}x + ${c} = 0$.`,
    name: 'x',
    lead: 1,
    why: 'Both roots are positive and they add up to half the perimeter: one is the width and the other the length.',
  },
];

function rootsOf({ story, b, c }: RootsParams): [number, number] {
  const a = ROOT_STORIES[story].lead;
  const d = Math.sqrt(b * b - 4 * a * c);
  return [(-b - d) / (2 * a), (-b + d) / (2 * a)];
}

const senseRoot: Generator<RootsParams> = {
  id: 'numer-sense-root-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const story = rng.pick(difficulty > 1 ? [0, 1, 2] : [0, 1]);
      const params: RootsParams =
        story === 0
          ? { story, b: -rng.int(5, 25), c: -rng.int(1, 20) }
          : story === 1
            ? { story, b: rng.int(1, 9), c: -rng.int(10, 60) }
            : { story, b: -rng.int(8, 20), c: rng.int(5, 60) };
      if (params.b * params.b - 4 * ROOT_STORIES[story].lead * params.c <= 0) continue;
      const [lo, hi] = rootsOf(params).map((r) => r.toFixed(2));
      if (lo === hi || Math.abs(Number(lo)) < 0.1 || lo.endsWith('0') || hi.endsWith('0')) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const s = ROOT_STORIES[params.story];
    const [lo, hi] = rootsOf(params).map((r) => r.toFixed(2));
    const both = lo[0] !== '-';
    return choiceSlide(
      [say(s.text(params)), say(`The roots are $${s.name} \\approx ${lo}$ and $${s.name} \\approx ${hi}$. Which ${both ? 'make' : 'makes'} sense as the answer?`)],
      [
        { tex: `${s.name} \\approx ${hi}`, correct: !both },
        { tex: `${s.name} \\approx ${lo}` },
        { tex: '\\text{Both}', correct: both },
        { tex: '\\text{Neither}' },
      ],
    );
  },
  solution: (params) => [{ text: ROOT_STORIES[params.story].why }],
};

const checkValueOf = (params: ModelParams): number => clean(MODELS[params.kind].volume(tenthOf(params), params.k));

const senseCheck: Generator<ModelParams> = {
  id: 'numer-sense-check-value',
  sample: (rng, difficulty) => sampleModel(rng, difficulty > 1 ? [0, 1, 2] : [0, 1]),
  choices: (params) => {
    const r = tenthOf(params);
    const m = MODELS[params.kind];
    const right = checkValueOf(params);
    const wrong = [clean(m.lead * r ** 3 + m.square(params.k)), clean(m.lead * 2 * r * (r + m.square(params.k) / m.lead)), clean(right + 1), clean(right - 10)];
    return options({ tex: fmt(right), answer: fmt(right) }, ...wrong.map((w) => ({ tex: fmt(w), answer: fmt(w) }))).slice(0, 4);
  },
  render: (params): Slide => {
    const r = fmt(tenthOf(params));
    return {
      kind: 'expression',
      prompt: [
        say(MODELS[params.kind].story(params.k, params.V)),
        say(`A search gives $x = ${r}$. Check it: work out $${MODELS[params.kind].build(params.k)}$ at $x = ${r}$.`),
      ],
      lead: `${MODELS[params.kind].buildAt(r, params.k)} =`,
      keypad: [],
      answer: fmt(checkValueOf(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const r = tenthOf(params);
    const m = MODELS[params.kind];
    const inner = clean(r + m.square(params.k) / m.lead);
    return [
      { tex: aligned(`&${m.buildAt(fmt(r), params.k)}`, `&= ${m.lead === 1 ? '' : `${m.lead} \\times `}${fmt(clean(r * r))} \\times ${fmt(inner)}`, `&= ${fmt(checkValueOf(params))}`) },
      { text: `Close to $${params.V}$, so $x = ${fmt(r)}$ makes sense.` },
    ];
  },
};

type Claim = 'good' | 'negative' | 'over' | 'off';

interface SenseParams extends ModelParams {
  claim: number;
  limit: number;
  kindOf: Claim;
}

const verdictPath = ({ kindOf }: SenseParams): string[] =>
  kindOf === 'negative' ? ['No'] : kindOf === 'over' ? ['Yes', 'No'] : ['Yes', 'Yes', kindOf === 'good' ? 'Yes' : 'No'];

const senseFlow: Generator<SenseParams> = {
  id: 'numer-sense-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const model = sampleModel(rng, difficulty > 1 ? [0, 2] : [0]);
      const r = tenthOf(model);
      const limit = Math.ceil(r) + rng.int(1, 4);
      const kindOf = rng.pick<Claim>(['good', 'good', 'negative', 'over', 'off', 'off']);
      const claim =
        kindOf === 'good'
          ? r
          : kindOf === 'negative'
            ? -r
            : kindOf === 'over'
              ? clean(limit + rng.int(1, 30) / 10)
              : clean(r + rng.sign() * rng.int(8, 15) / 10);
      if (kindOf === 'off' && (claim < 0.5 || claim >= limit)) continue;
      const value = MODELS[model.kind].volume(claim, model.k);
      if (kindOf === 'off' && Math.abs(value - model.V) < 0.2 * model.V) continue;
      return { ...model, claim, limit, kindOf };
    }
  },
  render: (params): Slide => {
    const m = MODELS[params.kind];
    const c = fmt(params.claim);
    const value = fmt(clean(m.volume(params.claim, params.k)));
    const yesNo = (key: string, yes: { to?: string; outcome?: string }, no: { to?: string; outcome?: string }) =>
      turned([{ label: 'Yes', ...yes }, { label: 'No', ...no }], `${key}${c}${params.V}`);
    return {
      kind: 'flow',
      prompt: [
        say(`${m.story(params.k, params.V)} It must fit in a crate $${params.limit}$ cm wide.`),
        say(`Someone gives the side as $x = ${c}$. Decide whether to accept it.`),
      ],
      subject: `${m.build(params.k)} = ${params.V}`,
      steps: [
        { id: 'sign', ask: `Is $x = ${c}$ positive?`, branches: yesNo('s', { to: 'fit' }, { outcome: 'Reject: a length cannot be negative.' }) },
        { id: 'fit', ask: `Is $${c}$ less than $${params.limit}$?`, branches: yesNo('f', { to: 'check' }, { outcome: 'Reject: the box would not fit in the crate.' }) },
        {
          id: 'check',
          ask: `Putting it back in gives $${value}$. Is that within $10\\%$ of $${params.V}$?`,
          branches: yesNo('c', { outcome: `Accept: $x = ${c}$ makes sense.` }, { outcome: 'Reject: it does not solve the equation.' }),
        },
      ],
      answer: verdictPath(params),
    };
  },
  solution: (params) => {
    const m = MODELS[params.kind];
    const c = fmt(params.claim);
    switch (params.kindOf) {
      case 'negative':
        return [{ text: `$x = ${c}$ is negative, and a length cannot be: reject it.` }];
      case 'over':
        return [{ text: `$${c}$ is more than $${params.limit}$, so the box would not fit: reject it.` }];
      default:
        return [
          { text: `$x = ${c}$ is positive and less than $${params.limit}$. Put it back in:` },
          { tex: `${m.buildAt(c, params.k)} = ${fmt(clean(m.volume(params.claim, params.k)))}` },
          {
            text:
              params.kindOf === 'good'
                ? `$10\\%$ of $${params.V}$ is $${fmt(clean(params.V / 10))}$, and this is within it: accept.`
                : `$10\\%$ of $${params.V}$ is $${fmt(clean(params.V / 10))}$, and this is much further off: reject.`,
          },
        ];
    }
  },
};

/* ================================================================
 * Lesson 4: percentage error
 * ================================================================ */

interface PctParams {
  story: number;
  exact: number;
  /** How far off the estimate is, signed: positive when it is too big. */
  off: number;
}

const PCT_STORIES = [
  { text: (e: string, a: string) => `The trapezium rule estimates an area as $${e}$ m². The exact area is $${a}$ m².` },
  { text: (e: string, a: string) => `A decimal search gives a length of $${e}$ cm. The exact length is $${a}$ cm.` },
  { text: (e: string, a: string) => `A model predicts a tank holds $${e}$ litres. It actually holds $${a}$ litres.` },
];

const EXACTS = [20, 25, 40, 50, 80, 100, 125, 200, 250, 400, 500];

const pctOf = ({ exact, off }: PctParams): number => clean((100 * Math.abs(off)) / exact);
const estimateOf = ({ exact, off }: PctParams): number => clean(exact + off);

function samplePct(rng: Rng, difficulty: number): PctParams {
  for (;;) {
    const exact = rng.pick(EXACTS);
    const size = difficulty > 1 ? rng.int(1, Math.floor((2 * exact) / 5)) / 2 : rng.int(1, Math.floor(exact / 5));
    const params = { story: rng.int(0, PCT_STORIES.length - 1), exact, off: size * rng.sign() };
    if (!terminates(pctOf(params), 2) || !terminates(Math.abs(params.off) / exact, 4)) continue;
    return params;
  }
}

const pctPrompt = (params: PctParams): string => PCT_STORIES[params.story].text(fmt(estimateOf(params)), fmt(params.exact));

function pctSolution(params: PctParams): SolutionStep[] {
  const d = fmt(Math.abs(params.off));
  return [
    { text: 'The error is how far the estimate is from the exact value. Divide by the exact value and multiply by $100$:' },
    { tex: aligned(`\\text{error} &= ${fmt(Math.abs(params.off))}`, `\\frac{${d}}{${fmt(params.exact)}} \\times 100 &= ${fmt(pctOf(params))}\\%`) },
  ];
}

const pctError: Generator<PctParams> = {
  id: 'numer-pct-error',
  sample: (rng, difficulty) => samplePct(rng, difficulty),
  choices: (params) => {
    const d = Math.abs(params.off);
    const overEstimate = clean((100 * d) / estimateOf(params));
    const wrong = [...(terminates(overEstimate, 2) ? [overEstimate] : []), d, clean(d / params.exact), clean(2 * pctOf(params)), clean(pctOf(params) + 1)];
    return options({ tex: fmt(pctOf(params)), answer: fmt(pctOf(params)) }, ...wrong.map((w) => ({ tex: fmt(w), answer: fmt(w) }))).slice(0, 4);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(pctPrompt(params)), say('Work out the percentage error.')],
    lead: '\\text{percentage error} =',
    keypad: [],
    answer: fmt(pctOf(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: pctSolution,
};

const pctTree: Generator<PctParams> = {
  id: 'numer-pct-parts-tree',
  sample: (rng, difficulty) => samplePct(rng, difficulty),
  render: (params): Slide => {
    const d = Math.abs(params.off);
    const ratio = clean(d / params.exact);
    const answer = [fmt(d), fmt(ratio), fmt(pctOf(params))];
    return {
      kind: 'tree',
      prompt: [say(pctPrompt(params)), say('The error first, then the error over the exact value, then as a percentage.')],
      expression: '\\frac{\\text{error}}{\\text{exact}} \\times 100',
      nodes: [
        { id: 'error', from: [] },
        { id: 'ratio', from: ['error'] },
        { id: 'pct', from: ['ratio'] },
      ],
      bank: numberBank(answer, [fmt(clean(params.exact + estimateOf(params))), fmt(clean(ratio * 10)), fmt(clean(pctOf(params) / 10))], around([d, pctOf(params)], 1)),
      answer,
    };
  },
  solution: pctSolution,
};

interface AcceptParams extends PctParams {
  within: number;
}

const pctAccept: Generator<AcceptParams> = {
  id: 'numer-pct-accept-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = { ...samplePct(rng, difficulty), within: rng.pick([1, 2, 5, 10]) };
      if (pctOf(params) === params.within) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const p = pctOf(params);
    const ratio = clean(Math.abs(params.off) / params.exact);
    const key = `${params.exact}${params.off}${params.within}`;
    return {
      kind: 'flow',
      prompt: [say(pctPrompt(params)), say(`The estimate is good enough if it is within $${params.within}\\%$.`)],
      subject: `\\frac{\\text{error}}{\\text{exact}} \\times 100`,
      steps: [
        {
          id: 'side',
          ask: 'Is the estimate too big or too small?',
          branches: turned([{ label: 'Too big', to: 'pct' }, { label: 'Too small', to: 'pct' }], `${key}s`),
        },
        {
          id: 'pct',
          ask: 'What is the percentage error?',
          branches: turned([{ label: `$${fmt(p)}\\%$`, to: 'ok' }, { label: `$${fmt(ratio)}\\%$`, to: 'ok' }], `${key}p`),
        },
        {
          id: 'ok',
          ask: `Is that within $${params.within}\\%$?`,
          branches: [
            { label: 'Yes', outcome: 'Accept the estimate.' },
            { label: 'No', outcome: 'Not good enough: use more strips or a closer search.' },
          ],
        },
      ],
      answer: [params.off > 0 ? 'Too big' : 'Too small', `$${fmt(p)}\\%$`, p <= params.within ? 'Yes' : 'No'],
    };
  },
  solution: (params) => [
    { text: `The estimate $${fmt(estimateOf(params))}$ is ${params.off > 0 ? 'more' : 'less'} than $${fmt(params.exact)}$: too ${params.off > 0 ? 'big' : 'small'}.` },
    ...pctSolution(params).slice(1),
    { text: pctOf(params) <= params.within ? `Within $${params.within}\\%$: accept it.` : `More than $${params.within}\\%$: not good enough.` },
  ],
};

/* ================================================================
 * Lesson 5: choosing a method
 * ================================================================ */

const METHODS = ['The quadratic formula', 'A change of sign, then a decimal search', 'The trapezium rule', 'Integrate exactly'];

interface TaskParams {
  task: number;
  a: number;
  b: number;
}

function taskText({ task, a, b }: TaskParams): string {
  switch (task) {
    case 0:
      return `Find the exact roots of $x^{2} ${signed(a)}x ${signed(b)} = 0$.`;
    case 1:
      return `Find a root of $x^{3} ${signed(a)}x ${signed(b)} = 0$ to $2$ decimal places.`;
    case 2:
      return `Estimate the area of a field from its width, measured every $${a}$ m along its $${a * b}$ m length.`;
    default:
      return `Find the exact area under $y = ${polyTex([a, 0, b])}$ from $x = 0$ to $x = 3$.`;
  }
}

const TASK_WHY = [
  'A quadratic has a formula for its roots, and the formula gives them exactly.',
  'A cubic like this has no formula to use here. A change of sign finds an interval, and a decimal search narrows it.',
  'There is no formula for the width, only readings, so the trapezium rule estimates the area from them.',
  'A polynomial can be integrated exactly, so there is no need to estimate.',
];

const methodChoice: Generator<TaskParams> = {
  id: 'numer-method-choice',
  sample: (rng) => {
    for (;;) {
      const task = rng.int(0, 3);
      if (task === 0) {
        const a = rng.int(-9, 9);
        const b = rng.int(-9, 9);
        const disc = a * a - 4 * b;
        if (b === 0 || disc <= 0 || Number.isInteger(Math.sqrt(disc))) continue;
        return { task, a, b };
      }
      if (task === 1) {
        const a = rng.int(-9, 9);
        const b = rng.int(-9, 9);
        if (a === 0 || b === 0) continue;
        return { task, a, b };
      }
      if (task === 2) return { task, a: rng.pick([2, 5, 10]), b: rng.int(4, 10) };
      const a = rng.int(1, 5);
      return { task, a, b: rng.int(1, 9) };
    }
  },
  render: (params): Slide =>
    choiceSlide(
      [say(taskText(params)), say('Which method suits it best?')],
      METHODS.map((tex, i) => ({ tex, correct: i === params.task })),
      false,
    ),
  solution: (params) => [{ text: TASK_WHY[params.task] }],
};

interface RouteParams {
  p: Poly;
  at: number;
}

const routePath = ({ p, at }: RouteParams): string[] => (p.length === 3 ? ['Yes'] : ['No', valueAt(p, at) * valueAt(p, at + 1) < 0 ? 'Yes' : 'No']);

const methodFlow: Generator<RouteParams> = {
  id: 'numer-method-flow',
  sample: (rng) => {
    for (;;) {
      const at = rng.int(-2, 3);
      const p = rng.chance(0.25) ? [1, rng.int(-9, 9), rng.int(-9, 9)] : [1, 0, rng.int(-9, 9), rng.int(-9, 9)];
      if (p[p.length - 1] === 0 || p[p.length - 2] === 0) continue;
      if (p.length === 4 && (valueAt(p, at) === 0 || valueAt(p, at + 1) === 0)) continue;
      return { p, at };
    }
  },
  render: (params): Slide => {
    const { p, at } = params;
    const key = `${p.join(',')}${at}`;
    return {
      kind: 'flow',
      prompt: [say(`Find a root of $f(x) = 0$, and choose how.`)],
      subject: `f(x) = ${polyTex(p)}`,
      steps: [
        {
          id: 'kind',
          ask: 'Is $f(x)$ a quadratic?',
          branches: turned(
            [
              { label: 'Yes', outcome: 'Use the quadratic formula: it gives the roots exactly.' },
              { label: 'No', to: 'sign' },
            ],
            `${key}k`,
          ),
        },
        {
          id: 'sign',
          ask: `$f(${at}) = ${fmt(valueAt(p, at))}$ and $f(${at + 1}) = ${fmt(valueAt(p, at + 1))}$. Does the sign change?`,
          branches: turned(
            [
              { label: 'Yes', outcome: `A root lies between $${at}$ and $${at + 1}$: search it in tenths.` },
              { label: 'No', outcome: 'No root is shown here: try another pair of whole numbers.' },
            ],
            `${key}s`,
          ),
        },
      ],
      answer: routePath(params),
    };
  },
  solution: ({ p, at }) =>
    p.length === 3
      ? [{ text: `$f(x) = ${polyTex(p)}$ is a quadratic, so the quadratic formula gives its roots exactly.` }]
      : [
          { text: 'A cubic has no formula to use here, so look for a change of sign:' },
          { tex: aligned(`f(${at}) &= ${fmt(valueAt(p, at))}`, `f(${at + 1}) &= ${fmt(valueAt(p, at + 1))}`) },
          {
            text:
              valueAt(p, at) * valueAt(p, at + 1) < 0
                ? `The sign changes, so a root lies between $${at}$ and $${at + 1}$.`
                : `No change of sign, so this pair shows no root: try another.`,
          },
        ],
};

export const numericalModellingGenerators = [
  modelTiles,
  modelValue,
  modelInterval,
  modelSlider,
  roundReport,
  reportInterval,
  reportErrorBound,
  reportAgree,
  senseRoot,
  senseCheck,
  senseFlow,
  pctError,
  pctTree,
  pctAccept,
  methodChoice,
  methodFlow,
];
