/**
 * Exponential Models: the continuous model y = Ae^(kt), read, evaluated,
 * rewritten, fitted and used.
 *
 * Other courses own the pieces this is built from, and nothing here teaches
 * them again: whole-step growth without e is Exponents level 7, ln and solving
 * N = N0 r^t for t is Logarithms level 3, linearising a model is Logarithms
 * level 6, and d/dx of e^x is Differentiation level 4. What this owns is the
 * model itself: what A and k say, b^t written as e^(kt), doubling time and
 * half-life as (ln 2)/k, models bounded by a level, and the rate as ky. Level
 * 7 sets the model against the data it was fitted to: residuals, where it
 * stops fitting, choosing between two fits, and how far past the data it can
 * be trusted.
 *
 * Every value a learner computes is whole. The trick that makes that possible
 * is keeping k a whole multiple of ln 2 or ln 3 over a whole time, so e^(kt)
 * at a whole number of those times is a whole power of 2 or 3. Decimal k
 * appears only where nothing has to be evaluated: reading a model, building
 * one from a percentage, and the rate ky, which stays exact.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { bin, num, pow, type Expr } from '../expr';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg, plotFigure } from '../figures';
import { canonicalSet } from '../numberLine';
import { EXP_KEYS } from './calculus';
import { aOrAn, gcd } from './format';
// Where a slider's handle rests before it is touched, so no answer sits there.
import { defaultSliderValue } from '../../ui/sliderValue';
import type { Rng } from '../../engine/rng';

/* ---------- shared helpers ---------- */

function chain(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** A tiles or tree bank: the answer's tokens plus distinct distractors, sorted. */
function fillBank(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  const extras = [...new Set(distractors)].filter((token) => !needed.has(token));
  return [...answer, ...extras].sort();
}

/**
 * A tree bank that keeps at least two distractors, topping up from whole
 * numbers just past the largest answer when the question's own slips collide.
 */
function treeBank(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  const extras = [...new Set(distractors)].filter((token) => !needed.has(token));
  const top = Math.max(...answer.map(Number).filter(Number.isFinite));
  for (let step = 1; extras.length < 3; step += 1) {
    const candidate = `${top + step}`;
    if (!needed.has(candidate) && !extras.includes(candidate)) extras.push(candidate);
  }
  return [...answer, ...extras].sort();
}

/** A decimal without float noise: 0.1 + 0.2 reads 0.3. */
function dec(x: number): string {
  return String(Number(x.toFixed(6)));
}

/** A whole number as the learner reads it in TeX: 20{,}000 from five digits up. */
function texNum(n: number): string {
  return Math.abs(n) >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}') : String(n);
}

/**
 * The same items turned by a hash of `key`, so the right branch or option is
 * not always first yet one question still renders one way.
 */
function turned<T>(items: T[], key: string): T[] {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const turn = Math.abs(hash) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/**
 * Four whole-number options: the answer, then the slips in the order given.
 * A slip that is not a positive whole number, or that collides, is dropped
 * and the gap filled with numbers near the answer. `plain` keeps the labels to
 * bare digits, which an evaluate slide needs because it reads them as numbers.
 */
function numberOptions(correct: number, slips: number[], plain = false): ChoiceOption[] {
  const show = plain ? String : texNum;
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of slips) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || value <= 0 || seen.has(value) || value > correct * 50) continue;
    seen.add(value);
    picked.push(value);
  }
  const unit = Math.max(1, Math.round(correct / 10));
  for (let step = 1; picked.length < 3; step += 1) {
    for (const candidate of [correct + step * unit, correct - step * unit]) {
      if (picked.length === 3) break;
      if (candidate <= 0 || seen.has(candidate)) continue;
      seen.add(candidate);
      picked.push(candidate);
    }
  }
  return options(
    { tex: show(correct), answer: String(correct) },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: show(value), answer: String(value) })),
  );
}

/** Six whole values for a reduce bank: the right one, then the slips, sorted. */
function offer(correct: number, ...near: number[]): string[] {
  const seen = new Set([correct]);
  const out = [correct];
  for (const value of near) {
    if (out.length >= 6) break;
    if (!Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  for (let step = 1; out.length < 6; step += 1) {
    for (const candidate of [correct + step, correct - step]) {
      if (out.length >= 6) break;
      if (candidate <= 0 || seen.has(candidate)) continue;
      seen.add(candidate);
      out.push(candidate);
    }
  }
  return out.sort((x, y) => x - y).map(String);
}

/** Whether a slider's resting handle would already sit on the answer. */
function sliderSpan(answer: number, span: number): number {
  let out = span;
  while (defaultSliderValue(0, out, 1) === answer) out += 1;
  return out;
}

/** The keypad for a constant such as ln 2 / 5: e and ln, without the x. */
const LN_KEYS: KeypadKey[] = EXP_KEYS.filter((key) => key.insert !== 'x' && key.insert !== '^');

/**
 * k = sign × (ln b) / h, the one shape every evaluated model here takes.
 * With h = 1 the model multiplies by b every unit of time; with h above 1 it
 * takes h units to multiply by b once.
 */
interface Rate {
  b: number;
  h: number;
  down: boolean;
}

/** k itself, as the learner reads it: \ln 2, \frac{\ln 2}{5}, -\ln 3. */
function kTex({ b, h, down }: Rate): string {
  const size = h === 1 ? `\\ln ${b}` : `\\frac{\\ln ${b}}{${h}}`;
  return down ? `-${size}` : size;
}

/** The power kt as it sits in the model: t\ln 2, -\frac{\ln 2}{5}t. */
function ktTex({ b, h, down }: Rate, v = 't'): string {
  const size = h === 1 ? `${v}\\ln ${b}` : `\\frac{\\ln ${b}}{${h}}${v}`;
  return down ? `-${size}` : size;
}

/** The whole model: 40e^{\frac{\ln 2}{5}t}. */
function modelTex(a: number, rate: Rate, v = 't'): string {
  return `${texNum(a)}e^{${ktTex(rate, v)}}`;
}

/** The model with a decimal k: 250e^{-0.04t}. */
function decimalModel(a: number, k: number, down: boolean, v = 't'): string {
  return `${texNum(a)}e^{${down ? '-' : ''}${dec(k)}${v}}`;
}

/* ---------- stories ---------- */

interface Story {
  /** The model's letter. */
  sym: string;
  /** What is modelled, opening a sentence. */
  subject: string;
  /** The unit of time, singular. */
  unit: string;
  /** What the value counts, for "250 ___". */
  of: string;
}

const GROW_STORIES: Story[] = [
  { sym: 'N', subject: 'The number of bacteria in a dish', unit: 'hour', of: 'bacteria' },
  { sym: 'P', subject: 'The population of a town', unit: 'year', of: 'people' },
  { sym: 'V', subject: 'The value of an investment, in pounds,', unit: 'year', of: 'pounds' },
  { sym: 'F', subject: 'The number of followers of a new account', unit: 'week', of: 'followers' },
];

const DECAY_STORIES: Story[] = [
  { sym: 'D', subject: 'The amount of a drug in the blood, in mg,', unit: 'hour', of: 'mg' },
  { sym: 'M', subject: 'The mass of a radioactive sample, in grams,', unit: 'day', of: 'grams' },
  { sym: 'C', subject: 'The caffeine left in the body, in mg,', unit: 'hour', of: 'mg' },
  { sym: 'L', subject: 'The brightness of a fading lamp, in lumens,', unit: 'second', of: 'lumens' },
];

function storyOf(down: boolean, ctx: number): Story {
  const list = down ? DECAY_STORIES : GROW_STORIES;
  return list[ctx % list.length];
}

/** "The number of bacteria after t hours is modelled by N = ...". */
function opening(story: Story, model: string): string {
  return `${story.subject} after $t$ ${story.unit}s is modelled by $${story.sym} = ${model}$.`;
}

/* ---------- Level 1, lesson 1: reading the model ---------- */

const READ_STARTS = [20, 40, 60, 80, 120, 150, 200, 240, 300, 400, 500, 600, 800, 1200];
const READ_PERCENTS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30];

interface ReadParams {
  a: number;
  /** The continuous rate as a percentage: k = p / 100. */
  p: number;
  down: boolean;
  ctx: number;
}

function sampleRead(rng: Rng, difficulty: number): ReadParams {
  return {
    a: rng.pick(READ_STARTS),
    p: rng.pick(difficulty > 1 ? [...READ_PERCENTS, 1.5, 2.5, 3.5, 7.5, 12.5] : READ_PERCENTS),
    down: rng.chance(0.5),
    ctx: rng.int(0, 3),
  };
}

/**
 * Read a model's start and direction, one fork at a time: e^0, then the start,
 * then the sign of k, then what that sign does.
 */
const expmReadFlow: Generator<ReadParams> = {
  id: 'expm-read-flow',
  sample: sampleRead,
  render: ({ a, p, down, ctx }): Slide => {
    const story = storyOf(down, ctx);
    const model = decimalModel(a, p / 100, down);
    const key = `${a}-${p}-${down}-${ctx}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, model)} Read the model one question at a time. Each answer chooses what gets asked next.`,
        },
      ],
      subject: `${story.sym} = ${model}`,
      steps: [
        {
          id: 'zero',
          ask: 'At $t = 0$ the power is $e^{0}$. What does $e^{0}$ come to?',
          branches: turned(
            [
              { label: '$1$', to: 'start' },
              { label: '$0$', outcome: '$e^{0} = 0$ would make every model start at nothing, whatever number sat in front.' },
              { label: '$e$', outcome: '$e$ is $e^{1}$. At the start the power is $0$, not $1$.' },
            ],
            key,
          ),
        },
        {
          id: 'start',
          ask: `So what is $${story.sym}$ at the start?`,
          branches: turned(
            [
              { label: `$${texNum(a)}$`, to: 'sign' },
              { label: `$${texNum(a)}e$`, outcome: 'That keeps an $e$ that $e^{0}$ has already turned into a number.' },
              { label: `$${dec((a * p) / 100)}$`, outcome: `That multiplies the start by $k$, but $k$ sits in the power, where $t = 0$ cancels it.` },
            ],
            `${key}-start`,
          ),
        },
        {
          id: 'sign',
          ask: 'Is $k$, the number multiplying $t$ in the power, positive or negative?',
          branches: [
            { label: 'Positive', to: 'up' },
            { label: 'Negative', to: 'down' },
          ],
        },
        {
          id: 'up',
          ask: `With $k$ positive, what does $${story.sym}$ do as $t$ increases?`,
          branches: [
            { label: 'Grows', outcome: 'A positive $k$ makes $e^{kt}$ bigger as $t$ goes up, so the model grows from its start.' },
            { label: 'Levels off', outcome: 'A positive $k$ never levels off: $e^{kt}$ keeps climbing, faster and faster.' },
          ],
        },
        {
          id: 'down',
          ask: `With $k$ negative, what does $${story.sym}$ do as $t$ increases?`,
          branches: [
            { label: 'Decays towards 0', outcome: 'A negative $k$ makes $e^{kt}$ shrink towards $0$, so the model decays from its start.' },
            { label: 'Falls below 0', outcome: '$e^{kt}$ is positive for every $t$, so a model like this never goes below $0$.' },
          ],
        },
      ],
      answer: ['$1$', `$${texNum(a)}$`, down ? 'Negative' : 'Positive', down ? 'Decays towards 0' : 'Grows'],
    };
  },
  solution: ({ a, p, down, ctx }) => {
    const story = storyOf(down, ctx);
    return [
      { text: `At $t = 0$ the power is $0$ and $e^{0} = 1$, so $${story.sym} = ${texNum(a)} \\times 1 = ${texNum(a)}$.` },
      {
        text: down
          ? `Here $k = -${dec(p / 100)}$ is negative, so $e^{kt}$ shrinks and the model decays towards $0$.`
          : `Here $k = ${dec(p / 100)}$ is positive, so $e^{kt}$ climbs and the model grows.`,
      },
    ];
  },
};

type StartAsk = 'start' | 'double' | 'triple' | 'half' | 'quarter';

interface StartParams extends ReadParams {
  ask: StartAsk;
}

function startValue({ a, ask }: StartParams): number {
  if (ask === 'double') return 2 * a;
  if (ask === 'triple') return 3 * a;
  if (ask === 'half') return a / 2;
  if (ask === 'quarter') return a / 4;
  return a;
}

const START_QUESTIONS: Record<StartAsk, (sym: string) => string> = {
  start: (sym) => `What is $${sym}$ at the start, when $t = 0$?`,
  double: (sym) => `It has doubled when $${sym}$ reaches what value?`,
  triple: (sym) => `It has tripled when $${sym}$ reaches what value?`,
  half: (sym) => `It has halved when $${sym}$ falls to what value?`,
  quarter: (sym) => `It is down to a quarter of its start when $${sym}$ is what?`,
};

/** The start value, or at difficulty 2 the value that marks a doubling or a halving. */
const expmStart: Generator<StartParams> = {
  id: 'expm-start',
  sample: (rng, difficulty) => {
    const read = sampleRead(rng, difficulty);
    const ask: StartAsk =
      difficulty > 1 ? rng.pick(read.down ? (['half', 'quarter'] as const) : (['double', 'triple'] as const)) : 'start';
    return { ...read, ask };
  },
  choices: (params) => {
    const { a, p } = params;
    const value = startValue(params);
    return numberOptions(value, [
      params.ask === 'start' ? a + p : a,
      a * 2 === value ? a + 2 : a * 2,
      params.ask === 'half' || params.ask === 'quarter' ? a - 2 : a + 3,
      (a * (100 + p)) / 100,
    ]);
  },
  render: (params): Slide => {
    const { a, p, down, ctx, ask } = params;
    const story = storyOf(down, ctx);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `${opening(story, decimalModel(a, p / 100, down))} ${START_QUESTIONS[ask](story.sym)}` },
      ],
      lead: `${story.sym} =`,
      keypad: [],
      answer: String(startValue(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, ask, down, ctx } = params;
    const { sym } = storyOf(down, ctx);
    const steps: SolutionStep[] = [
      { text: `At $t = 0$, $e^{0} = 1$, so the model starts at the number in front: $${sym} = ${texNum(a)}$.` },
    ];
    if (ask !== 'start') {
      const factor = { double: '2 \\times', triple: '3 \\times', half: '\\tfrac{1}{2} \\times', quarter: '\\tfrac{1}{4} \\times' }[ask];
      steps.push({ tex: `${factor} ${texNum(a)} = ${texNum(startValue(params))}` });
      steps.push({ text: 'Doubling, halving and the rest are always measured against the start, $A$.' });
    }
    return steps;
  },
};

/** Build the model from a story: the start, then e to the power kt. */
const expmBuildTiles: Generator<ReadParams> = {
  id: 'expm-build-tiles',
  sample: sampleRead,
  render: ({ a, p, down, ctx }): Slide => {
    const story = storyOf(down, ctx);
    const k = dec(p / 100);
    const sign = down ? '-' : '';
    const answer = [texNum(a), `e^{${sign}${k}t}`];
    const verb = down ? 'decreases' : 'increases';
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} starts at ${a} and ${verb} continuously at ${p}% per ${story.unit}. Build the model for $${story.sym}$ after $t$ ${story.unit}s.`,
        },
      ],
      template: `${story.sym} = {0}\\,{1}`,
      bank: fillBank(answer, [
        `e^{${sign}${p}t}`,
        `e^{${down ? '' : '-'}${k}t}`,
        `e^{${sign}${dec(p / 1000)}t}`,
        `${texNum(a + p)}`,
        `${dec((a * p) / 100)}`,
      ]),
      answer,
    };
  },
  solution: ({ a, p, down, ctx }) => {
    const { sym } = storyOf(down, ctx);
    return [
      { text: `The start goes in front, since $e^{0} = 1$ at $t = 0$.` },
      { text: `A continuous rate of ${p}% is $k = ${dec(p / 100)}$, ${down ? 'negative because it decreases' : 'positive because it increases'}.` },
      { tex: `${sym} = ${decimalModel(a, p / 100, down)}` },
    ];
  },
};

/** Which sentence describes the model: start, direction and rate. */
const expmDescribe: Generator<ReadParams> = {
  id: 'expm-describe',
  sample: sampleRead,
  render: ({ a, p, down, ctx }): Slide => {
    const story = storyOf(down, ctx);
    const per = `per ${story.unit}`;
    const way = (fall: boolean) => (fall ? 'decays' : 'grows');
    const right = `Starts at ${a} and ${way(down)} continuously at ${p}% ${per}`;
    const labels = [
      right,
      `Starts at ${a} and ${way(!down)} continuously at ${p}% ${per}`,
      `Starts at ${a} and ${way(down)} continuously at ${dec(p / 100)}% ${per}`,
      `Starts at ${a} and ${way(down)} continuously at ${down ? 100 - p : 100 + p}% ${per}`,
    ];
    const ordered = turned(labels, labels.join('|'));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, decimalModel(a, p / 100, down))} Which of these describes it?`,
        },
      ],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${ordered.indexOf(right)}`,
    };
  },
  solution: ({ a, p, down }) => [
    { text: `The number in front is the start: $${texNum(a)}$.` },
    {
      text: `$k = ${down ? '-' : ''}${dec(p / 100)}$ is ${down ? 'negative, so it decays' : 'positive, so it grows'}, and as a percentage $${dec(p / 100)} = ${p}\\%$.`,
    },
    { text: '$k$ is already the rate as a decimal. Do not add it to 1: that is the multiplier of step-by-step growth, not a continuous rate.' },
  ],
};

/* ---------- Level 1, lesson 2: evaluating the model ---------- */

type PowerForm = 'whole' | 'negative' | 'fraction' | 'sum';

interface PowerParams {
  form: PowerForm;
  b: number;
  n: number;
  /** A second factor, for the sum form; a root degree for the fraction form. */
  c: number;
  style: number;
}

function sampleWholePower(rng: Rng): { b: number; n: number } {
  for (;;) {
    const b = rng.int(2, 10);
    const n = rng.int(2, 4);
    if (b ** n <= 10000) return { b, n };
  }
}

/** e^{n ln b} as the whole number b^n, and at difficulty 2 its variants. */
const expmPowerValue: Generator<PowerParams> = {
  id: 'expm-power-value',
  sample: (rng, difficulty) => {
    if (difficulty === 1) return { form: 'whole', ...sampleWholePower(rng), c: 1, style: rng.int(0, 1) };
    const form = rng.pick(['negative', 'fraction', 'sum'] as const);
    if (form === 'negative') {
      for (;;) {
        const b = rng.int(2, 6);
        const n = rng.int(1, 4);
        if (b ** n <= 1000) return { form, b, n, c: 1, style: rng.int(0, 1) };
      }
    }
    if (form === 'fraction') {
      // e^{(n/m) ln b} with b a perfect m-th power, so it comes to (root)^n.
      const m = rng.pick([2, 3]);
      const root = rng.int(2, m === 2 ? 10 : 5);
      const n = rng.pick([1, 3, 5].filter((v) => v % m !== 0 && root ** v <= 5000));
      return { form, b: root ** m, n, c: m, style: rng.int(0, 1) };
    }
    // Kept small enough that the worked product fits a phone screen.
    for (;;) {
      const { b, n } = sampleWholePower(rng);
      const c = rng.int(2, 7);
      if (b ** n * c <= 3000) return { form, b, n, c, style: rng.int(0, 1) };
    }
  },
  choices: (params) => {
    const { form, b, n, c } = params;
    if (form === 'negative') {
      const v = b ** n;
      return options(
        { tex: `\\frac{1}{${v}}`, answer: `1/${v}` },
        { tex: `-${v}`, answer: `-${v}` },
        { tex: `\\frac{1}{${b * n}}`, answer: `1/${b * n}` },
        { tex: `-${b * n}`, answer: `-${b * n}` },
      );
    }
    const value = powerValue(params);
    return numberOptions(value, [
      form === 'fraction' ? (b * n) / c : n * b,
      form === 'sum' ? b ** n + c : b ** (n + 1),
      form === 'fraction' ? b ** n : n + b,
      form === 'sum' ? n * b * c : b ** (n - 1),
    ]);
  },
  render: (params): Slide => {
    const tex = powerTex(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text:
            params.style === 0
              ? 'Work this out exactly. $e^{\\ln b} = b$ does most of it.'
              : 'Write this as a single exact number, using $e^{\\ln b} = b$.',
        },
      ],
      lead: `${tex} =`,
      keypad: params.form === 'negative' ? [{ insert: '/' }] : [],
      answer: params.form === 'negative' ? `1/${params.b ** params.n}` : String(powerValue(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { form, b, n, c } = params;
    if (form === 'whole') {
      return [
        { text: `$n\\ln b = \\ln b^{n}$, so the power is $\\ln ${b}^{${n}}$, and $e$ undoes $\\ln$.` },
        { tex: chain(`e^{${n}\\ln ${b}} &= \\left(e^{\\ln ${b}}\\right)^{${n}}`, `&= ${b}^{${n}} = ${texNum(b ** n)}`) },
      ];
    }
    if (form === 'negative') {
      return [
        { text: 'A negative power is one over the positive power.' },
        {
          tex: chain(
            `${powerTex(params)} &= \\frac{1}{e^{${n === 1 ? '' : n}\\ln ${b}}}`,
            `&= \\frac{1}{${b}^{${n}}} = \\frac{1}{${b ** n}}`,
          ),
        },
      ];
    }
    if (form === 'fraction') {
      const rootValue = Math.round(b ** (1 / c));
      return [
        { text: `$e^{\\ln ${b}} = ${b}$, so this is $${b}$ to the power $\\frac{${n}}{${c}}$: a root, then a power.` },
        { tex: chain(`e^{\\frac{${n}}{${c}}\\ln ${b}} &= ${b}^{\\frac{${n}}{${c}}}`, `&= ${rootValue}^{${n}} = ${texNum(rootValue ** n)}`) },
      ];
    }
    return [
      { text: 'A sum in the power is a product of two powers.' },
      {
        tex: chain(
          `e^{${n}\\ln ${b} + \\ln ${c}} &= e^{${n}\\ln ${b}} \\times e^{\\ln ${c}}`,
          `&= ${texNum(b ** n)} \\times ${c} = ${texNum(b ** n * c)}`,
        ),
      },
    ];
  },
};

function powerTex({ form, b, n, c }: PowerParams): string {
  if (form === 'negative') return `e^{-${n === 1 ? '' : n}\\ln ${b}}`;
  if (form === 'fraction') return `e^{\\frac{${n}}{${c}}\\ln ${b}}`;
  if (form === 'sum') return `e^{${n}\\ln ${b} + \\ln ${c}}`;
  return `e^{${n}\\ln ${b}}`;
}

function powerValue({ form, b, n, c }: PowerParams): number {
  if (form === 'fraction') return Math.round(b ** (1 / c)) ** n;
  if (form === 'sum') return b ** n * c;
  return b ** n;
}

type EvalForm = 'grow' | 'gain' | 'decay' | 'between';

interface EvalParams {
  form: EvalForm;
  /** The start. For decay it is a multiple of b^n, so the value is whole. */
  a: number;
  b: number;
  n: number;
  /** The earlier time, for `between`. */
  n1: number;
  ctx: number;
}

function evalExpr({ form, a, b, n, n1 }: EvalParams): Expr {
  const at = (t: number) => bin('*', num(a), pow(num(b), num(t)));
  if (form === 'gain') return bin('-', at(n), num(a));
  if (form === 'decay') return bin('/', num(a), pow(num(b), num(n)));
  if (form === 'between') return bin('-', at(n), at(n1));
  return at(n);
}

function evalValue({ form, a, b, n, n1 }: EvalParams): number {
  if (form === 'gain') return a * b ** n - a;
  if (form === 'decay') return a / b ** n;
  if (form === 'between') return a * (b ** n - b ** n1);
  return a * b ** n;
}

const EVAL_QUESTIONS: Record<EvalForm, (sym: string, n: number, n1: number) => string> = {
  grow: (sym, n) => `The line below is $${sym}$ at $t = ${n}$.`,
  gain: (sym, n) => `The line below is how much $${sym}$ has grown by at $t = ${n}$.`,
  decay: (sym, n) => `The line below is $${sym}$ at $t = ${n}$.`,
  between: (sym, n, n1) => `The line below is how much $${sym}$ grows between $t = ${n1}$ and $t = ${n}$.`,
};

/**
 * The model at a whole time, reduced a piece at a time. The power comes
 * before the multiplication, and the slip it invites, (a × b)^n, sits in the
 * product's bank.
 */
const expmEvaluate: Generator<EvalParams> = {
  id: 'expm-evaluate',
  sample: (rng, difficulty) => {
    for (;;) {
      const form: EvalForm = difficulty > 1 ? rng.pick(['gain', 'decay', 'between'] as const) : rng.pick(['grow', 'gain', 'decay'] as const);
      const b = rng.int(2, difficulty > 1 ? 5 : 3);
      const n = rng.int(2, difficulty > 1 ? 5 : 4);
      if (b ** n > 625) continue;
      const a = form === 'decay' ? rng.int(1, 9) * b ** n : rng.int(2, difficulty > 1 ? 12 : 9);
      if (a > 5000) continue;
      const n1 = form === 'between' ? rng.int(1, n - 1) : 0;
      return { form, a, b, n, n1, ctx: rng.int(0, 3) };
    }
  },
  choices: (params) => {
    const { form, a, b, n, n1 } = params;
    const value = evalValue(params);
    if (form === 'decay') return numberOptions(value, [a / (b * n), a - b ** n, a / b ** (n - 1), a * b ** n], true);
    if (form === 'between') return numberOptions(value, [a * b ** (n - n1), a * b ** n, a * (b ** n - b ** n1) + a, (a * b) ** n], true);
    return numberOptions(value, [(a * b) ** n - (form === 'gain' ? a : 0), a * b * n, a * b ** (n - 1), a * b ** n + a], true);
  },
  evaluatePrompt: ({ form, a, b, n, n1, ctx }) => {
    const down = form === 'decay';
    const story = storyOf(down, ctx);
    return [
      { kind: 'prose', text: `${opening(story, modelTex(a, { b, h: 1, down }))} ${EVAL_QUESTIONS[form](story.sym, n, n1)} What does it come to?` },
    ];
  },
  render: (params): Slide => {
    const { form, a, b, n, n1, ctx } = params;
    const down = form === 'decay';
    const story = storyOf(down, ctx);
    const rate: Rate = { b, h: 1, down };
    const power = b ** n;
    const banks: Record<string, string[]> = {};
    if (form === 'grow') {
      banks.r = offer(a * power, (a * b) ** n, a * b * n, a + power, power);
      banks['r.r'] = offer(power, b * n, b + n, b ** (n - 1));
    } else if (form === 'gain') {
      banks.r = offer(a * power - a, a * power + a, a * power, power - a, a * b * n - a);
      banks['r.l'] = offer(a * power, (a * b) ** n, a * b * n, a + power, power);
      banks['r.l.r'] = offer(power, b * n, b + n, b ** (n - 1));
    } else if (form === 'decay') {
      banks.r = offer(a / power, a / b, a - power, a / (b * n), a * power);
      banks['r.r'] = offer(power, b * n, b + n, b ** (n - 1));
    } else {
      const early = b ** n1;
      banks.r = offer(a * (power - early), a * power + a * early, a * b ** (n - n1), a * power);
      banks['r.l'] = offer(a * power, (a * b) ** n, a * b * n, a + power);
      banks['r.l.r'] = offer(power, b * n, b + n, b ** (n - 1));
      banks['r.r'] = offer(a * early, (a * b) ** n1, a * b * n1, a + early);
      banks['r.r.r'] = offer(early, b * n1, b + n1, b ** (n1 + 1));
    }
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, rate))} ${EVAL_QUESTIONS[form](story.sym, n, n1)} Tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      expr: evalExpr(params),
      banks,
    };
  },
  solution: (params) => {
    const { form, a, b, n, n1 } = params;
    const power = b ** n;
    const lines: string[] = [];
    if (form === 'grow') lines.push(`& ${a} \\times ${b}^{${n}}`, `&= ${a} \\times ${power}`, `&= ${texNum(a * power)}`);
    if (form === 'gain') {
      lines.push(`& ${a} \\times ${b}^{${n}} - ${a}`, `&= ${a} \\times ${power} - ${a}`, `&= ${texNum(a * power)} - ${a}`, `&= ${texNum(a * power - a)}`);
    }
    if (form === 'decay') lines.push(`& ${texNum(a)} \\div ${b}^{${n}}`, `&= ${texNum(a)} \\div ${power}`, `&= ${texNum(a / power)}`);
    if (form === 'between') {
      lines.push(
        `& ${a} \\times ${b}^{${n}} - ${a} \\times ${b}^{${n1}}`,
        `&= ${texNum(a * power)} - ${texNum(a * b ** n1)}`,
        `&= ${texNum(evalValue(params))}`,
      );
    }
    return [
      { text: `$e^{${form === 'decay' ? '-' : ''}t\\ln ${b}} = ${form === 'decay' ? `\\frac{1}{${b}^{t}}` : `${b}^{t}`}$, since $e^{\\ln ${b}} = ${b}$. Then the power comes first.` },
      { tex: chain(...lines) },
    ];
  },
};

interface AtTimeParams {
  a: number;
  b: number;
  h: number;
  /** How many lots of h: the answer's power of b. */
  m: number;
  down: boolean;
  ctx: number;
}

function atTimeValue({ a, b, m, down }: AtTimeParams): number {
  return down ? a / b ** m : a * b ** m;
}

/**
 * A model with k = (ln b)/h at t = mh, worked as a tree: how many lots of h,
 * that power of b, then the value.
 */
const expmAtTimeTree: Generator<AtTimeParams> = {
  id: 'expm-at-time-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const b = rng.pick(difficulty > 1 ? [2, 3] : [2]);
      const h = rng.int(2, 6);
      const m = rng.int(2, difficulty > 1 ? 4 : 3);
      const down = difficulty > 1 && rng.chance(0.5);
      const a = down ? rng.int(1, 12) * b ** m : rng.int(2, 15);
      if (a * b ** m > 5000) continue;
      return { a, b, h, m, down, ctx: rng.int(0, 3) };
    }
  },
  render: (params): Slide => {
    const { a, b, h, m, down, ctx } = params;
    const story = storyOf(down, ctx);
    const t = m * h;
    const answer = [String(m), String(b ** m), String(atTimeValue(params))];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, { b, h, down }))} Find $${story.sym}$ when $t = ${t}$: fill in how many lots of $${h}$ ${story.unit}s that is, that power of $${b}$, then $${story.sym}$.`,
        },
      ],
      expression: down ? `${texNum(a)} \\div ${b}^{${t} \\div ${h}}` : `${a} \\times ${b}^{${t} \\div ${h}}`,
      nodes: [
        { id: 'lots', from: [] },
        { id: 'power', from: ['lots'] },
        { id: 'value', from: ['power'] },
      ],
      bank: treeBank(answer, [
        String(t),
        String(b * m),
        String(down ? a / b ** (m - 1) : a * b ** (m + 1)),
        String(down ? a - b ** m : a * b * m),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, b, h, m, down } = params;
    const t = m * h;
    return [
      { text: `$e^{\\frac{\\ln ${b}}{${h}}t} = ${b}^{t/${h}}$, so every $${h}$ units of time ${down ? 'divide' : 'multiply'} by $${b}$.` },
      {
        tex: chain(
          `${t} \\div ${h} &= ${m}`,
          `${b}^{${m}} &= ${b ** m}`,
          `${texNum(a)} ${down ? '\\div' : '\\times'} ${b ** m} &= ${texNum(atTimeValue(params))}`,
        ),
      },
    ];
  },
};

interface PassParams {
  a: number;
  b: number;
  down: boolean;
  /** The answer: the first whole t past the target. */
  n: number;
  /** The target, strictly between the values at n - 1 and n. */
  target: number;
  ctx: number;
}

const ROUND_TARGETS = [10, 20, 25, 30, 40, 50, 60, 75, 100, 120, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1500, 2000];

/** Slide to the first whole time the model passes, or drops below, a target. */
const expmPassSlider: Generator<PassParams> = {
  id: 'expm-pass-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const down = difficulty > 1 && rng.chance(0.5);
      const b = rng.pick([2, 3]);
      const n = rng.int(2, b === 2 ? 7 : 4);
      const a = down ? rng.pick([1, 3, 5]) * b ** n * rng.pick([1, 2]) : rng.int(2, 12);
      const before = down ? a / b ** (n - 1) : a * b ** (n - 1);
      const after = down ? a / b ** n : a * b ** n;
      const low = Math.min(before, after);
      const high = Math.max(before, after);
      // Strictly between, so "first past it" has one answer.
      const inside = ROUND_TARGETS.filter((v) => v > low && v < high);
      if (inside.length === 0 || a > 3000) continue;
      return { a, b, down, n, target: rng.pick(inside), ctx: rng.int(0, 3) };
    }
  },
  render: ({ a, b, down, n, target, ctx }): Slide => {
    const story = storyOf(down, ctx);
    const span = sliderSpan(n, n + 3);
    const f = (t: number) => (down ? a / b ** t : a * b ** t);
    const top = down ? a * 1.1 : target * 1.6;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, { b, h: 1, down }))} Each dot is a whole ${story.unit}. Slide to the first at which $${story.sym}$ is ${down ? 'below' : 'above'} the dashed line, $${target}$.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer: n,
      readout: `t = {v}`,
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: top,
          curves: [{ f: (t) => Math.min(f(t), top * 2) }],
          marks: Array.from({ length: span + 1 }, (_, k) => ({ x: k, y: f(k) })).filter((mark) => mark.y <= top),
          horizontals: [target],
          label: `A curve ${down ? 'falling' : 'rising'} from ${a}, with a dashed line at ${target}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: ({ a, b, down, n, target }) => {
    const at = (t: number) => (down ? a / b ** t : a * b ** t);
    const op = down ? '\\div' : '\\times';
    return [
      { text: `$e^{${down ? '-' : ''}t\\ln ${b}} = ${down ? `\\frac{1}{${b}^{t}}` : `${b}^{t}`}$, so each ${down ? 'step divides' : 'step multiplies'} by $${b}$. Work along until it passes $${target}$.` },
      { tex: chain(`t = ${n - 1}: \\quad ${texNum(a)} ${op} ${b}^{${n - 1}} &= ${texNum(at(n - 1))}`, `t = ${n}: \\quad ${texNum(a)} ${op} ${b}^{${n}} &= ${texNum(at(n))}`) },
      { text: `So it first passes $${target}$ at $t = ${n}$.` },
    ];
  },
};

/* ---------- Level 1, lesson 3: from b^t to e^(kt) ---------- */

type ConvertForm = 'plain' | 'slow' | 'recip';

interface ConvertParams {
  a: number;
  b: number;
  h: number;
  form: ConvertForm;
  ctx: number;
}

/** b^t, b^(t/h) or (1/b)^t as the learner reads it. */
function baseForm({ b, h, form }: ConvertParams): string {
  if (form === 'recip') return `\\left(\\frac{1}{${b}}\\right)^{t}`;
  if (form === 'slow') return `${b}^{t/${h}}`;
  return `${b}^{t}`;
}

function convertRate({ b, h, form }: ConvertParams): Rate {
  return { b, h: form === 'slow' ? h : 1, down: form === 'recip' };
}

function sampleConvert(rng: Rng, difficulty: number): ConvertParams {
  const form: ConvertForm = difficulty > 1 ? rng.pick(['slow', 'recip', 'slow'] as const) : 'plain';
  return {
    a: rng.pick(READ_STARTS),
    b: rng.int(2, form === 'plain' ? 10 : 6),
    h: rng.int(2, 8),
    form,
    ctx: rng.int(0, 3),
  };
}

/** Rewrite A × b^t as Ae^(kt): the start stays, and k = ln b. */
const expmConvertTiles: Generator<ConvertParams> = {
  id: 'expm-convert-tiles',
  sample: sampleConvert,
  render: (params): Slide => {
    const { a, b, h, form, ctx } = params;
    const story = storyOf(form === 'recip', ctx);
    const answer = [texNum(a), `e^{${ktTex(convertRate(params))}}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} after $t$ ${story.unit}s is $${story.sym} = ${texNum(a)} \\times ${baseForm(params)}$. Write the same model in the form $Ae^{kt}$.`,
        },
      ],
      template: `${story.sym} = {0}\\,{1}`,
      bank: fillBank(answer, [
        `e^{${b}t}`,
        `e^{t\\ln ${a}}`,
        `e^{\\frac{t}{\\ln ${b}}}`,
        form === 'slow' ? `e^{${h}t\\ln ${b}}` : form === 'recip' ? `e^{t\\ln ${b}}` : `e^{-t\\ln ${b}}`,
        texNum(a * b),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, b, h, form } = params;
    const steps: SolutionStep[] = [{ text: `Write $${b}$ as $e^{\\ln ${b}}$, then use the power law.` }];
    if (form === 'plain') steps.push({ tex: `${b}^{t} = \\left(e^{\\ln ${b}}\\right)^{t} = e^{t\\ln ${b}}` });
    if (form === 'slow') steps.push({ tex: `${b}^{t/${h}} = \\left(e^{\\ln ${b}}\\right)^{t/${h}} = e^{\\frac{\\ln ${b}}{${h}}t}` });
    if (form === 'recip') steps.push({ tex: `\\left(\\frac{1}{${b}}\\right)^{t} = ${b}^{-t} = e^{-t\\ln ${b}}` });
    steps.push({ text: `The start, $${texNum(a)}$, is untouched: only the part with $t$ in it changes shape.` });
    return steps;
  },
};

type KForm = 'plain' | 'slow' | 'recip' | 'fast';

interface KParams {
  b: number;
  /** The divisor for `slow`, the multiplier for `fast`. */
  h: number;
  form: KForm;
  style: number;
}

function kFormBase({ b, h, form }: KParams): string {
  if (form === 'slow') return `${b}^{t/${h}}`;
  if (form === 'recip') return `\\left(\\frac{1}{${b}}\\right)^{t}`;
  if (form === 'fast') return `${b}^{${h}t}`;
  return `${b}^{t}`;
}

function kFormTex({ b, h, form }: KParams): string {
  if (form === 'slow') return `\\frac{\\ln ${b}}{${h}}`;
  if (form === 'recip') return `-\\ln ${b}`;
  if (form === 'fast') return `${h}\\ln ${b}`;
  return `\\ln ${b}`;
}

const K_PHRASES = [
  (base: string) => `Write $${base}$ in the form $e^{kt}$. What is $k$?`,
  (base: string) => `A quantity changes as $A \\times ${base}$. Written as $Ae^{kt}$, what is $k$?`,
  (base: string) => `Find the $k$ that makes $e^{kt} = ${base}$ for every $t$.`,
];

/** The k that turns b^t into e^(kt), typed with the ln key. */
const expmKValue: Generator<KParams> = {
  id: 'expm-k-value',
  sample: (rng, difficulty) => {
    const form: KForm = difficulty > 1 ? rng.pick(['slow', 'recip', 'fast'] as const) : 'plain';
    return {
      b: rng.int(2, form === 'plain' ? 12 : 7),
      h: form === 'fast' ? rng.int(2, 4) : rng.int(2, 9),
      form,
      style: rng.int(0, K_PHRASES.length - 1),
    };
  },
  choices: ({ b, h, form }) => {
    const right = kFormTex({ b, h, form, style: 0 });
    if (form === 'slow') {
      return options(
        { tex: right, answer: `log(${b})/${h}` },
        { tex: `\\frac{${h}}{\\ln ${b}}`, answer: `${h}/log(${b})` },
        { tex: `${h}\\ln ${b}`, answer: `${h}*log(${b})` },
        { tex: `\\ln ${b}`, answer: `log(${b})` },
      );
    }
    if (form === 'recip') {
      return options(
        { tex: right, answer: `-log(${b})` },
        { tex: `\\ln ${b}`, answer: `log(${b})` },
        { tex: `\\frac{1}{${b}}`, answer: `1/${b}` },
        { tex: `-\\frac{1}{\\ln ${b}}`, answer: `-1/log(${b})` },
      );
    }
    if (form === 'fast') {
      return options(
        { tex: right, answer: `${h}*log(${b})` },
        { tex: `\\ln ${b}`, answer: `log(${b})` },
        { tex: `\\frac{\\ln ${b}}{${h}}`, answer: `log(${b})/${h}` },
        { tex: `${h} + \\ln ${b}`, answer: `${h}+log(${b})` },
      );
    }
    return options(
      { tex: right, answer: `log(${b})` },
      { tex: `${b}`, answer: `${b}` },
      { tex: `\\frac{1}{\\ln ${b}}`, answer: `1/log(${b})` },
      { tex: `e^{${b}}`, answer: `e^${b}` },
    );
  },
  render: (params): Slide => {
    const { b, h, form } = params;
    const answer =
      form === 'slow' ? `log(${b})/${h}` : form === 'recip' ? `-log(${b})` : form === 'fast' ? `${h}*log(${b})` : `log(${b})`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: K_PHRASES[params.style](kFormBase(params)) }],
      lead: 'k =',
      keypad: LN_KEYS,
      answer,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { b, h, form } = params;
    const base = kFormBase(params);
    const steps: SolutionStep[] = [{ text: `$${b} = e^{\\ln ${b}}$, so` }];
    if (form === 'plain') steps.push({ tex: `${base} = e^{t\\ln ${b}}` });
    if (form === 'slow') steps.push({ tex: `${base} = e^{\\frac{t}{${h}}\\ln ${b}} = e^{\\frac{\\ln ${b}}{${h}}t}` });
    if (form === 'recip') steps.push({ tex: `${base} = ${b}^{-t} = e^{-t\\ln ${b}}` });
    if (form === 'fast') steps.push({ tex: `${base} = e^{${h}t\\ln ${b}}` });
    steps.push({ text: `So $k = ${kFormTex(params)}$: everything multiplying $t$ in the power.` });
    return steps;
  },
};

type BackForm = 'plain' | 'multiple' | 'root' | 'recip';

interface BackParams {
  a: number;
  /** The base inside the logarithm as written. */
  c: number;
  /** The whole multiple in front of the log, or the divisor under it. */
  m: number;
  form: BackForm;
  ctx: number;
}

/** The base b the model multiplies by each unit of time. */
function backBase({ c, m, form }: BackParams): number {
  if (form === 'multiple') return c ** m;
  if (form === 'root') return Math.round(c ** (1 / m));
  return c;
}

function backPower({ c, m, form }: BackParams): string {
  if (form === 'multiple') return `${m}t\\ln ${c}`;
  if (form === 'root') return `\\frac{\\ln ${c}}{${m}}t`;
  if (form === 'recip') return `-t\\ln ${c}`;
  return `t\\ln ${c}`;
}

const ROOT_BASES = [
  [4, 2],
  [9, 2],
  [16, 2],
  [25, 2],
  [36, 2],
  [49, 2],
  [64, 2],
  [81, 2],
  [100, 2],
  [8, 3],
  [27, 3],
  [64, 3],
  [125, 3],
  [16, 4],
  [81, 4],
];

/** From e^(kt) back to b^t: which model is the same? */
const expmBack: Generator<BackParams> = {
  id: 'expm-back',
  sample: (rng, difficulty) => {
    const ctx = rng.int(0, 3);
    const a = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
    if (difficulty === 1) {
      // A base equal to the start would make "c times a to the t" the answer too.
      const c = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10].filter((v) => v !== a));
      return { a, c, m: 1, form: 'plain', ctx };
    }
    const form = rng.pick(['multiple', 'root', 'recip'] as const);
    if (form === 'multiple') {
      // Never (2, 2): its slip, m times c, is 4 too.
      const [c, m] = rng.pick([
        [3, 3],
        [4, 2],
        [2, 3],
        [3, 2],
        [5, 2],
        [2, 4],
      ]);
      return { a, c, m, form, ctx };
    }
    if (form === 'root') {
      const [c, m] = rng.pick(ROOT_BASES);
      return { a, c, m, form, ctx };
    }
    return { a, c: rng.int(2, 6), m: 1, form, ctx };
  },
  render: (params): Slide => {
    const { a, c, m, form, ctx } = params;
    const story = storyOf(form === 'recip', ctx);
    const base = backBase(params);
    const right = form === 'recip' ? `${a} \\times \\left(\\frac{1}{${c}}\\right)^{t}` : `${a} \\times ${base}^{t}`;
    const wrongs =
      form === 'plain'
        ? [`${a * c}^{t}`, `${a}e^{${c}t}`, `${c} \\times ${a}^{t}`]
        : form === 'multiple'
          ? [`${a} \\times ${m * c}^{t}`, `${a} \\times ${c}^{t}`, `${a * base}^{t}`]
          : form === 'root'
            ? [`${a} \\times ${c}^{t}`, `${a * base}^{t}`, `${a}e^{${base}t}`]
            : [`${a} \\times ${c}^{t}`, `-${a} \\times ${c}^{t}`, `${a}e^{-${c}t}`];
    const labels = [right, ...wrongs];
    const ordered = turned(labels, labels.join('|'));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} after $t$ ${story.unit}s is $${story.sym} = ${a}e^{${backPower(params)}}$. Which of these is the same model?`,
        },
      ],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label: `${story.sym} = ${label}`, tex: true })),
      correctId: `opt${ordered.indexOf(right)}`,
    };
  },
  solution: (params) => {
    const { a, c, m, form } = params;
    const base = backBase(params);
    if (form === 'multiple') {
      return [
        { text: 'A number in front of a logarithm goes inside as a power.' },
        { tex: `e^{${m}t\\ln ${c}} = e^{t\\ln ${c}^{${m}}} = e^{t\\ln ${base}} = ${base}^{t}` },
        { text: `So the model is $${a} \\times ${base}^{t}$: it multiplies by $${base}$ each unit of time.` },
      ];
    }
    if (form === 'root') {
      return [
        { text: `Dividing a logarithm by $${m}$ takes a root inside it.` },
        { tex: `e^{\\frac{\\ln ${c}}{${m}}t} = \\left(${c}^{\\frac{1}{${m}}}\\right)^{t} = ${base}^{t}` },
        { text: `So the model is $${a} \\times ${base}^{t}$.` },
      ];
    }
    if (form === 'recip') {
      return [
        { text: 'The minus sign makes it one over the power: a decay.' },
        { tex: `e^{-t\\ln ${c}} = ${c}^{-t} = \\left(\\frac{1}{${c}}\\right)^{t}` },
      ];
    }
    return [
      { text: `$e^{\\ln ${c}} = ${c}$, so` },
      { tex: `e^{t\\ln ${c}} = \\left(e^{\\ln ${c}}\\right)^{t} = ${c}^{t}` },
      { text: `The start, $${a}$, stays in front, times $${c}^{t}$.` },
    ];
  },
};

type MultiplierForm = 'plain' | 'multiple' | 'root' | 'difference';

interface MultiplierParams {
  /** The answer: what e^k comes to. */
  target: number;
  form: MultiplierForm;
  /** Inputs for the written k. */
  c: number;
  m: number;
  ctx: number;
}

function multiplierK({ target, form, c, m }: MultiplierParams): string {
  if (form === 'multiple') return `${m}\\ln ${c}`;
  if (form === 'root') return `\\frac{\\ln ${c}}{${m}}`;
  if (form === 'difference') return `\\ln ${target * c} - \\ln ${c}`;
  return `\\ln ${target}`;
}

/** Slide to e^k, the multiplier per unit of time, read off the curve at t = 1. */
const expmMultiplierSlider: Generator<MultiplierParams> = {
  id: 'expm-multiplier-slider',
  sample: (rng, difficulty) => {
    const ctx = rng.int(0, 3);
    if (difficulty === 1) return { target: rng.int(2, 10), form: 'plain', c: 1, m: 1, ctx };
    const form = rng.pick(['multiple', 'root', 'difference'] as const);
    if (form === 'multiple') {
      const [c, m] = rng.pick([
        [2, 2],
        [2, 3],
        [3, 2],
      ]);
      return { target: c ** m, form, c, m, ctx };
    }
    if (form === 'root') {
      const [c, m] = rng.pick(ROOT_BASES.filter(([base, degree]) => Math.round(base ** (1 / degree)) <= 10));
      return { target: Math.round(c ** (1 / m)), form, c, m, ctx };
    }
    return { target: rng.int(2, 10), form, c: rng.int(2, 5), m: 1, ctx };
  },
  render: (params): Slide => {
    const { target, ctx } = params;
    const story = GROW_STORIES[ctx];
    const k = multiplierK(params);
    const span = sliderSpan(target, 12);
    const window = markerWindow(0, span, 'y');
    const growth = Math.log(target);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} is multiplied by $e^{kt}$ after $t$ ${story.unit}s, with $k = ${k}$. The curve is $e^{kt}$ and the dashed line is $t = 1$. Slide to the multiplier per ${story.unit}: the height of the curve there.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer: target,
      readout: 'e^{k} = {v}',
      figure: plotFigure(plotSvg({
          xMin: 0,
          xMax: 1.4,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [{ f: (t) => Math.min(Math.exp(growth * t), span * 2) }],
          marks: [{ x: 0, y: 1 }],
          verticals: [{ x: 1, dashed: true }],
          label: 'A rising curve starting at 1, with a dashed line at t = 1',
        }), 'y'),
    };
  },
  solution: (params) => {
    const { target, form, c, m, ctx } = params;
    const k = multiplierK(params);
    const steps: SolutionStep[] = [
      { text: `At $t = 1$ the curve is at $e^{k}$, which is what one ${GROW_STORIES[ctx].unit} multiplies by.` },
    ];
    if (form === 'plain') steps.push({ tex: `e^{\\ln ${target}} = ${target}` });
    if (form === 'multiple') steps.push({ tex: `e^{${k}} = e^{\\ln ${c}^{${m}}} = ${c}^{${m}} = ${target}` });
    if (form === 'root') steps.push({ tex: `e^{${k}} = ${c}^{\\frac{1}{${m}}} = ${target}` });
    if (form === 'difference') steps.push({ tex: `e^{${k}} = e^{\\ln \\frac{${target * c}}{${c}}} = ${target}` });
    return steps;
  },
};

/* ---------- Level 1, lesson 4: doubling time and half-life ---------- */

type DoubleForm = 'double' | 'half' | 'four' | 'eight' | 'triple' | 'quarter-life';

interface DoubleParams {
  a: number;
  /** The denominator of k as written. */
  den: number;
  form: DoubleForm;
  ctx: number;
}

/** The log in k: ln 2 for most, ln 4 or ln 8 or ln 3 for the rest. */
function doubleLog(form: DoubleForm): number {
  if (form === 'four') return 4;
  if (form === 'eight') return 8;
  if (form === 'triple') return 3;
  return 2;
}

function doubleRate({ den, form }: DoubleParams): Rate {
  return { b: doubleLog(form), h: den, down: form === 'half' || form === 'quarter-life' };
}

/** The time asked for: to double, halve, triple, or fall to a quarter. */
function doubleAnswer({ den, form }: DoubleParams): number {
  if (form === 'four') return den / 2;
  if (form === 'eight') return den / 3;
  if (form === 'quarter-life') return 2 * den;
  return den;
}

function doubleWhat(form: DoubleForm): string {
  if (form === 'half') return 'half-life';
  if (form === 'quarter-life') return 'time to fall to a quarter';
  if (form === 'triple') return 'tripling time';
  return 'doubling time';
}

function sampleDouble(rng: Rng, forms: readonly DoubleForm[]): DoubleParams {
  const form = rng.pick(forms);
  const den =
    form === 'four' ? 2 * rng.int(1, 8) : form === 'eight' ? 3 * rng.int(1, 5) : rng.int(2, 12);
  return { a: rng.pick(READ_STARTS), den, form, ctx: rng.int(0, 3) };
}

/** Slide to the doubling time, or the half-life, on the model's graph. */
const expmDoublingSlider: Generator<DoubleParams> = {
  id: 'expm-doubling-slider',
  sample: (rng, difficulty) =>
    sampleDouble(rng, difficulty > 1 ? (['half', 'four', 'quarter-life'] as const) : (['double'] as const)),
  render: (params): Slide => {
    const { a, form, ctx } = params;
    const rate = doubleRate(params);
    const story = storyOf(rate.down, ctx);
    const answer = doubleAnswer(params);
    const level = form === 'half' ? a / 2 : form === 'quarter-life' ? a / 4 : 2 * a;
    const span = sliderSpan(answer, Math.max(answer + 4, Math.ceil(answer * 1.6)));
    const k = (rate.down ? -1 : 1) * (Math.log(rate.b) / rate.h);
    const what = doubleWhat(form);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, rate))} The dashed line is $${texNum(level)}$. Slide to the ${what}: the ${story.unit}s it takes to reach that line.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: `t = {v}`,
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: rate.down ? a * 1.1 : 2 * a * 1.4,
          curves: [{ f: (t) => Math.min(a * Math.exp(k * t), a * 4) }],
          horizontals: [level],
          label: `A curve ${rate.down ? 'falling' : 'rising'} from ${a}, with a dashed line at ${level}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: (params) => doublingSolution(params),
};

function doublingSolution(params: DoubleParams): SolutionStep[] {
  const { den, form } = params;
  const rate = doubleRate(params);
  const answer = doubleAnswer(params);
  const kk = `\\frac{\\ln ${rate.b}}{${den}}`;
  if (form === 'half' || form === 'double') {
    return [
      { text: `The ${doubleWhat(form)} is $\\ln 2$ divided by the size of $k$.` },
      { tex: chain(`\\ln 2 \\div ${kk} &= \\ln 2 \\times \\frac{${den}}{\\ln 2}`, `&= ${den}`) },
    ];
  }
  if (form === 'triple') {
    return [
      { text: 'Tripling is $\\ln 3$ divided by $k$, the same way doubling is $\\ln 2$ divided by $k$.' },
      { tex: `\\ln 3 \\div ${kk} = ${den}` },
    ];
  }
  if (form === 'quarter-life') {
    return [
      { text: 'A quarter is two halvings, so it takes two half-lives.' },
      { tex: chain(`\\ln 2 \\div \\frac{\\ln 2}{${den}} &= ${den}`, `2 \\times ${den} &= ${answer}`) },
    ];
  }
  return [
    { text: `$\\ln ${rate.b} = ${form === 'four' ? 2 : 3}\\ln 2$, so $k = \\frac{${form === 'four' ? 2 : 3}\\ln 2}{${den}}$.` },
    {
      tex: chain(
        `\\ln 2 \\div \\frac{${form === 'four' ? 2 : 3}\\ln 2}{${den}} &= \\frac{${den}}{${form === 'four' ? 2 : 3}}`,
        `&= ${answer}`,
      ),
    },
  ];
}

/** The doubling time, half-life or tripling time, typed. */
const expmDoubling: Generator<DoubleParams> = {
  id: 'expm-doubling',
  sample: (rng, difficulty) =>
    sampleDouble(rng, difficulty > 1 ? (['four', 'eight', 'triple', 'quarter-life'] as const) : (['double', 'half'] as const)),
  choices: (params) => {
    const { den } = params;
    const { b } = doubleRate(params);
    const answer = doubleAnswer(params);
    return options(
      { tex: `${answer}`, answer: `${answer}` },
      { tex: `${den}\\ln ${b}`, answer: `${den}*log(${b})` },
      { tex: `\\frac{\\ln ${b}}{${den}}`, answer: `log(${b})/${den}` },
      { tex: `${answer === den ? den * 2 : den}`, answer: `${answer === den ? den * 2 : den}` },
    );
  },
  render: (params): Slide => {
    const { a, form, ctx } = params;
    const rate = doubleRate(params);
    const story = storyOf(rate.down, ctx);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${opening(story, modelTex(a, rate))} Find its ${doubleWhat(form)}, in ${story.unit}s.` }],
      lead: `\\text{${doubleWhat(form)}} =`,
      keypad: [],
      answer: String(doubleAnswer(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => doublingSolution(params),
};

/** Build the model from a doubling time, a half-life or a tripling time. */
const expmDoublingTiles: Generator<DoubleParams> = {
  id: 'expm-doubling-tiles',
  sample: (rng, difficulty) =>
    sampleDouble(rng, difficulty > 1 ? (['half', 'triple'] as const) : (['double'] as const)),
  render: (params): Slide => {
    const { a, den, form, ctx } = params;
    const rate = doubleRate(params);
    const story = storyOf(rate.down, ctx);
    const sign = rate.down ? '-' : '';
    const answer = [texNum(a), `e^{${sign}\\frac{\\ln ${rate.b}}{${den}}t}`];
    const verb = form === 'half' ? 'halves' : form === 'triple' ? 'triples' : 'doubles';
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} starts at ${a} and ${verb} every ${den} ${story.unit}s. Build the model for $${story.sym}$ after $t$ ${story.unit}s.`,
        },
      ],
      template: `${story.sym} = {0}\\,{1}`,
      bank: fillBank(answer, [
        `e^{${sign}\\frac{${den}}{\\ln ${rate.b}}t}`,
        `e^{${sign}${den}t\\ln ${rate.b}}`,
        ...(den === rate.b ? [] : [`e^{${sign}\\frac{\\ln ${den}}{${rate.b}}t}`]),
        `e^{${rate.down ? '' : '-'}\\frac{\\ln ${rate.b}}{${den}}t}`,
        `e^{${sign}\\frac{t}{${den}}}`,
        texNum(a * rate.b),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, den, form } = params;
    const rate = doubleRate(params);
    const factor = form === 'half' ? '\\frac{1}{2}' : `${rate.b}`;
    return [
      { text: `Every ${den} units of time multiply by $${factor}$, so the model is $${texNum(a)} \\times ${factor === '\\frac{1}{2}' ? '\\left(\\frac{1}{2}\\right)' : factor}^{t/${den}}$.` },
      { tex: `${factor === '\\frac{1}{2}' ? '\\left(\\frac{1}{2}\\right)' : factor}^{t/${den}} = e^{${rate.down ? '-' : ''}\\frac{\\ln ${rate.b}}{${den}}t}` },
      { text: `So $k = ${kTex(rate)}$: ${rate.down ? 'minus ' : ''}$\\ln ${rate.b}$ over the time it takes.` },
    ];
  },
};

/**
 * Doubling time or half-life, by the sign of k first. The last fork offers the
 * answer next to the two ways of mis-dividing by k.
 */
const expmHalfLifeFlow: Generator<DoubleParams & { down: boolean }> = {
  id: 'expm-halflife-flow',
  sample: (rng, difficulty) => {
    const params = sampleDouble(rng, difficulty > 1 ? (['four', 'eight'] as const) : (['double'] as const));
    return { ...params, down: rng.chance(0.5) };
  },
  render: (params): Slide => {
    const { a, den, down, ctx } = params;
    const rate: Rate = { b: doubleLog(params.form), h: den, down };
    const story = storyOf(down, ctx);
    const answer = doubleAnswer(params);
    const key = `${a}-${den}-${params.form}-${down}`;
    const unit = `${story.unit}s`;
    const timeFork = (id: string, what: string) => ({
      id,
      ask: `The ${what} is $\\ln 2$ divided by the size of $k$. What does it come to?`,
      branches: turned(
        [
          { label: `$${answer}$ ${unit}`, outcome: `$\\ln 2 \\div ${kTex({ ...rate, down: false })} = ${answer}$, so every ${answer} ${unit} it ${what === 'half-life' ? 'halves' : 'doubles'}.` },
          { label: `$${den}\\ln ${rate.b}$ ${unit}`, outcome: `That multiplies by $\\ln ${rate.b}$ where the ${what} divides by $k$.` },
          { label: `$${2 * den}$ ${unit}`, outcome: `That is twice the denominator of $k$, which is not $\\ln 2 \\div k$.` },
        ],
        `${key}-${id}`,
      ),
    });
    return {
      kind: 'flow',
      prompt: [
        { kind: 'prose', text: `${opening(story, modelTex(a, rate))} Find how long it takes to double or to halve. Each answer chooses what gets asked next.` },
      ],
      subject: `${story.sym} = ${modelTex(a, rate)}`,
      steps: [
        {
          id: 'sign',
          ask: 'Is $k$ positive or negative?',
          branches: [
            { label: 'Positive', to: 'grow' },
            { label: 'Negative', to: 'decay' },
          ],
        },
        {
          id: 'grow',
          ask: 'So the time that describes it is how long it takes to...',
          branches: [
            { label: 'Double', to: 'dt' },
            { label: 'Halve', outcome: 'A growing model never halves: it only gets bigger.' },
          ],
        },
        {
          id: 'decay',
          ask: 'So the time that describes it is how long it takes to...',
          branches: [
            { label: 'Halve', to: 'ht' },
            { label: 'Double', outcome: 'A decaying model never doubles: it only gets smaller.' },
          ],
        },
        timeFork('dt', 'doubling time'),
        timeFork('ht', 'half-life'),
      ],
      answer: [down ? 'Negative' : 'Positive', down ? 'Halve' : 'Double', `$${answer}$ ${unit}`],
    };
  },
  solution: (params) => {
    const { den, down } = params;
    const rate: Rate = { b: doubleLog(params.form), h: den, down };
    const answer = doubleAnswer(params);
    const steps: SolutionStep[] = [
      { text: `$k = ${kTex(rate)}$ is ${down ? 'negative, so it decays and has a half-life' : 'positive, so it grows and has a doubling time'}.` },
    ];
    if (rate.b !== 2) steps.push({ text: `$\\ln ${rate.b} = ${rate.b === 4 ? 2 : 3}\\ln 2$, so $k$ is $\\frac{\\ln 2}{${answer}}$ in size.` });
    steps.push({ tex: `\\ln 2 \\div \\frac{\\ln 2}{${answer}} = ${answer}` });
    return steps;
  },
};

/* ---------- Level 2, lesson 1: fitting a model to two points ---------- */

interface FitParams {
  a: number;
  /** What one unit of time multiplies (or, decaying, divides) by. */
  c: number;
  t1: number;
  /** The gap between the two times. */
  d: number;
  down: boolean;
  ctx: number;
}

function fitPoints({ a, c, t1, d, down }: FitParams): { y1: number; y2: number; t2: number } {
  const at = (t: number) => (down ? a / c ** t : a * c ** t);
  return { y1: at(t1), y2: at(t1 + d), t2: t1 + d };
}

function sampleFit(rng: Rng, difficulty: number): FitParams {
  for (;;) {
    const hard = difficulty > 1;
    const c = rng.pick(hard ? [2, 3, 4, 5] : [2, 3]);
    const t1 = rng.int(1, hard ? 3 : 2);
    const d = rng.int(hard ? 2 : 1, 3);
    const down = hard && rng.chance(0.5);
    const a = down ? rng.int(1, 6) * c ** (t1 + d) : rng.int(2, 12);
    if (a * c ** (down ? 0 : t1 + d) > 20000) continue;
    return { a, c, t1, d, down, ctx: rng.int(0, 3) };
  }
}

function fitPrompt(params: FitParams, ask: string): string {
  const { y1, y2, t2 } = fitPoints(params);
  const story = storyOf(params.down, params.ctx);
  return `${story.subject} is modelled by $${story.sym} = Ae^{kt}$, with $t$ in ${story.unit}s. At $t = ${params.t1}$ it is $${texNum(y1)}$, and at $t = ${t2}$ it is $${texNum(y2)}$. ${ask}`;
}

function fitSolution(params: FitParams): SolutionStep[] {
  const { a, c, t1, d, down } = params;
  const { y1, y2, t2 } = fitPoints(params);
  const r = c ** d;
  return [
    { text: `Divide one value by the other and $A$ cancels, leaving $e^{k}$ to the power of the gap in time.` },
    {
      tex: chain(
        down ? `\\frac{${texNum(y1)}}{${texNum(y2)}} &= ${r}` : `\\frac{${texNum(y2)}}{${texNum(y1)}} &= ${r}`,
        `${t2} - ${t1} &= ${d}`,
        `${d === 1 ? `${r}` : `\\sqrt${d === 2 ? '' : `[${d}]`}{${r}}`} &= ${c}`,
      ),
    },
    { text: `So each ${storyOf(down, params.ctx).unit} ${down ? 'divides' : 'multiplies'} by $${c}$, which makes $k = ${down ? '-' : ''}\\ln ${c}$.` },
    { tex: `A = ${texNum(y1)} ${down ? '\\times' : '\\div'} ${c}^{${t1}} = ${texNum(a)}` },
  ];
}

/**
 * A and k from two points, as a tree: the ratio, the time between, the
 * multiplier per unit of time, then back to the start.
 */
const expmFitTree: Generator<FitParams> = {
  id: 'expm-fit-tree',
  sample: sampleFit,
  render: (params): Slide => {
    const { a, c, t1, d, down } = params;
    const { y1, y2, t2 } = fitPoints(params);
    const r = c ** d;
    const answer = [String(r), String(d), String(c), String(a)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: fitPrompt(
            params,
            `Fill in the ratio of the ${down ? 'first value to the second' : 'second value to the first'}, the time between, what one unit of time ${down ? 'divides' : 'multiplies'} by, then $A$.`,
          ),
        },
      ],
      expression: `(${t1},\\ ${texNum(y1)}) \\quad (${t2},\\ ${texNum(y2)})`,
      nodes: [
        { id: 'ratio', from: [] },
        { id: 'gap', from: [] },
        { id: 'per', from: ['ratio', 'gap'] },
        { id: 'start', from: ['per'] },
      ],
      bank: treeBank(
        answer,
        [Math.abs(y2 - y1), t2, r / d, down ? y1 * c ** (t1 - 1) : y1 / c ** (t1 - 1), c + 1]
          .filter(Number.isInteger)
          .map(String),
      ),
      answer,
    };
  },
  solution: fitSolution,
};

/** k from two points, typed with the ln key. */
const expmFitK: Generator<FitParams> = {
  id: 'expm-fit-k',
  sample: sampleFit,
  choices: (params) => {
    const { c, d, down } = params;
    const { t2 } = fitPoints(params);
    const r = c ** d;
    const sign = down ? '-' : '';
    return options(
      { tex: `${sign}\\ln ${c}`, answer: `${sign}log(${c})` },
      { tex: `${sign}\\ln ${r}`, answer: `${sign}log(${r})` },
      { tex: `${sign}\\frac{\\ln ${r}}{${t2}}`, answer: `${sign}log(${r})/${t2}` },
      { tex: `${down ? '' : '-'}\\ln ${c}`, answer: `${down ? '' : '-'}log(${c})` },
      { tex: `${sign}${c}`, answer: `${sign}${c}` },
    ).slice(0, 4);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: fitPrompt(params, 'Find $k$.') }],
    lead: 'k =',
    keypad: LN_KEYS,
    answer: `${params.down ? '-' : ''}log(${params.c})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: fitSolution,
};

/** Build the fitted model from two points. */
const expmFitTiles: Generator<FitParams> = {
  id: 'expm-fit-tiles',
  sample: sampleFit,
  render: (params): Slide => {
    const { a, c, d, down, ctx } = params;
    const { y1 } = fitPoints(params);
    const story = storyOf(down, ctx);
    const sign = down ? '-' : '';
    const answer = [texNum(a), `e^{${sign}t\\ln ${c}}`];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: fitPrompt(params, 'Build the model.') }],
      template: `${story.sym} = {0}\\,{1}`,
      bank: fillBank(answer, [
        texNum(y1),
        ...(d > 1 ? [`e^{${sign}t\\ln ${c ** d}}`] : []),
        `e^{${sign}${c}t}`,
        `e^{${down ? '' : '-'}t\\ln ${c}}`,
        texNum(down ? a / c : a * c),
      ]),
      answer,
    };
  },
  solution: fitSolution,
};

interface StartBackParams extends Rate {
  a: number;
  /** How many lots of h the known time is. */
  m: number;
  ctx: number;
}

function startBackValue({ a, b, m, down }: StartBackParams): number {
  return down ? a / b ** m : a * b ** m;
}

/** Work back to the start from one later value and a known k. */
const expmStartBack: Generator<StartBackParams> = {
  id: 'expm-start-back',
  sample: (rng, difficulty) => {
    for (;;) {
      const b = rng.pick(difficulty > 1 ? [2, 3] : [2, 3]);
      const h = difficulty > 1 ? rng.int(2, 6) : 1;
      const m = rng.int(2, difficulty > 1 ? 4 : 5);
      const down = rng.chance(0.5);
      const a = down ? rng.int(1, 9) * b ** m : rng.int(2, 15);
      if (a * (down ? 1 : b ** m) > 8000) continue;
      return { a, b, h, m, down, ctx: rng.int(0, 3) };
    }
  },
  choices: (params) => {
    const { a, b, m, down } = params;
    const v = startBackValue(params);
    return numberOptions(a, [down ? v * b ** (m - 1) : v / b ** (m - 1), down ? v * b * m : v / (b * m), down ? v / b ** m : v * b ** m, v - b ** m]);
  },
  render: (params): Slide => {
    const { b, h, m, down, ctx } = params;
    const story = storyOf(down, ctx);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} is modelled by $${story.sym} = Ae^{${ktTex({ b, h, down })}}$, with $t$ in ${story.unit}s. At $t = ${m * h}$, $${story.sym} = ${texNum(startBackValue(params))}$. What was it at the start?`,
        },
      ],
      lead: 'A =',
      keypad: [],
      answer: String(params.a),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, b, h, m, down } = params;
    const t = m * h;
    const v = startBackValue(params);
    return [
      { text: `At $t = ${t}$ the power is $e^{${down ? '-' : ''}${m}\\ln ${b}} = ${down ? `\\frac{1}{${b ** m}}` : b ** m}$.` },
      { tex: chain(`A ${down ? '\\div' : '\\times'} ${b ** m} &= ${texNum(v)}`, `A &= ${texNum(v)} ${down ? '\\times' : '\\div'} ${b ** m} = ${texNum(a)}`) },
    ];
  },
};

/* ---------- Level 2, lesson 2: models with a limit ---------- */

interface BoundedStory {
  sym: string;
  subject: string;
  unit: string;
  rising: boolean;
  /** The level in words, for a solution: "room temperature". */
  level: string;
}

const BOUNDED_STORIES: BoundedStory[] = [
  { sym: 'T', subject: 'The temperature of a cup of tea, in °C,', unit: 'minute', rising: false, level: 'the temperature of the room' },
  { sym: 'T', subject: 'The temperature of a bowl of soup, in °C,', unit: 'minute', rising: false, level: 'the temperature of the kitchen' },
  { sym: 'T', subject: 'The temperature of a hot metal bar, in °C,', unit: 'minute', rising: false, level: 'the temperature of the workshop' },
  { sym: 'T', subject: 'The temperature of a drink taken out of the fridge, in °C,', unit: 'minute', rising: true, level: 'the temperature of the room' },
  { sym: 'v', subject: 'The speed of a falling skydiver, in m/s,', unit: 'second', rising: true, level: 'the terminal speed' },
  { sym: 'W', subject: 'The number of words a learner can type per minute', unit: 'week', rising: true, level: 'the best speed they reach' },
];

function boundedStory(rising: boolean, ctx: number): BoundedStory {
  const list = BOUNDED_STORIES.filter((story) => story.rising === rising);
  return list[ctx % list.length];
}

interface BoundParams {
  /** The level it settles at. */
  level: number;
  /** How far from the level it starts. */
  gap: number;
  /** A decimal k, as a percentage: k = p / 100. */
  p: number;
  rising: boolean;
  ctx: number;
}

function boundStart({ level, gap, rising }: BoundParams): number {
  return rising ? level - gap : level + gap;
}

function boundTex({ level, gap, p, rising }: BoundParams): string {
  return `${level} ${rising ? '-' : '+'} ${gap}e^{-${dec(p / 100)}t}`;
}

function sampleBound(rng: Rng, difficulty: number): BoundParams {
  const rising = difficulty > 1 ? rng.chance(0.5) : rng.chance(0.3);
  const ctx = rng.int(0, 5);
  const story = boundedStory(rising, ctx);
  const level = story.sym === 'T' ? rng.int(15, 25) : story.sym === 'v' ? rng.pick([40, 45, 50, 55, 60]) : rng.pick([40, 50, 60, 70, 80]);
  // Rising, a gap of exactly half the level would start it at the gap itself,
  // and two answers on the flow would read the same.
  const gaps = Array.from({ length: level - 2 - Math.ceil(level / 3) + 1 }, (_, i) => Math.ceil(level / 3) + i);
  const gap = rising ? rng.pick(gaps.filter((g) => 2 * g !== level)) : rng.pick([30, 40, 45, 50, 55, 60, 65, 70, 75]);
  return { level, gap, p: rng.pick([2, 4, 5, 8, 10, 15, 20, 25]), rising, ctx };
}

function boundOpening(params: BoundParams): string {
  const story = boundedStory(params.rising, params.ctx);
  return `${story.subject} after $t$ ${story.unit}s is modelled by $${story.sym} = ${boundTex(params)}$.`;
}

/** Where a bounded model starts and where it settles, by what e^(-kt) does. */
const expmLimitFlow: Generator<BoundParams> = {
  id: 'expm-limit-flow',
  sample: sampleBound,
  render: (params): Slide => {
    const { level, gap, rising } = params;
    const story = boundedStory(rising, params.ctx);
    const start = boundStart(params);
    const key = `${level}-${gap}-${params.p}-${rising}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${boundOpening(params)} Find where it settles and where it starts. Each answer chooses what gets asked next.`,
        },
      ],
      subject: `${story.sym} = ${boundTex(params)}`,
      steps: [
        {
          id: 'long',
          ask: `As $t$ gets large, what happens to $e^{-${dec(params.p / 100)}t}$?`,
          branches: turned(
            [
              { label: 'It tends to $0$', to: 'limit' },
              { label: 'It keeps growing', outcome: 'A negative power shrinks as $t$ grows, so this term does not grow.' },
              { label: 'It tends to $1$', outcome: '$e^{0} = 1$ only at $t = 0$. After that the negative power keeps shrinking it.' },
            ],
            key,
          ),
        },
        {
          id: 'limit',
          ask: `So in the long run, $${story.sym}$ settles at...`,
          branches: turned(
            [
              { label: `$${level}$`, to: 'start' },
              { label: `$${start}$`, outcome: `In the long run the $e^{-kt}$ term is gone, and this still counts all ${gap} of it.` },
              { label: '$0$', outcome: `Only the $e^{-kt}$ term goes to $0$. The $${level}$ in front stays.` },
            ],
            `${key}-limit`,
          ),
        },
        {
          id: 'start',
          ask: `And at $t = 0$, what is $${story.sym}$?`,
          branches: turned(
            [
              { label: `$${start}$`, outcome: `$e^{0} = 1$, so it starts at $${level} ${rising ? '-' : '+'} ${gap} = ${start}$.` },
              { label: `$${gap}$`, outcome: `That is the $e^{-kt}$ term alone, without the $${level}$ it sits beside.` },
              { label: `$${rising ? level + gap : level - gap}$`, outcome: `That ${rising ? 'adds' : 'takes away'} the ${gap}, where the model ${rising ? 'takes it away' : 'adds it'}.` },
            ],
            `${key}-start`,
          ),
        },
      ],
      answer: ['It tends to $0$', `$${level}$`, `$${start}$`],
    };
  },
  solution: (params) => boundSolution(params),
};

function boundSolution(params: BoundParams): SolutionStep[] {
  const { level, gap, rising } = params;
  const story = boundedStory(rising, params.ctx);
  return [
    { text: `At $t = 0$, $e^{0} = 1$, so it starts at $${level} ${rising ? '-' : '+'} ${gap} = ${boundStart(params)}$.` },
    { text: `As $t$ grows, $e^{-kt}$ shrinks to $0$, so $${story.sym}$ settles at $${level}$: ${story.level}.` },
    { text: `It ${rising ? 'rises' : 'falls'} towards that level and never passes it, because the ${gap} is multiplied by something that stays positive.` },
  ];
}

type BoundAsk = 'start' | 'limit' | 'gap';

/** The start or the limit of a bounded model, typed; at difficulty 2 also the gap between them. */
const expmBoundedStart: Generator<BoundParams & { ask: BoundAsk }> = {
  id: 'expm-bounded-start',
  sample: (rng, difficulty) => ({
    ...sampleBound(rng, difficulty),
    ask: rng.pick(difficulty > 1 ? (['start', 'limit', 'gap'] as const) : (['start', 'limit'] as const)),
  }),
  choices: (params) => {
    const { level, gap, rising, ask } = params;
    const start = boundStart(params);
    const value = ask === 'start' ? start : ask === 'limit' ? level : gap;
    return numberOptions(value, [level, start, gap, rising ? level + gap : level - gap, 0]);
  },
  render: (params): Slide => {
    const { level, gap, ask } = params;
    const story = boundedStory(params.rising, params.ctx);
    const question = {
      start: `What is $${story.sym}$ at the start?`,
      limit: `What value does $${story.sym}$ settle at in the long run?`,
      gap: `How far does $${story.sym}$ move altogether, from its start to the level it settles at?`,
    }[ask];
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${boundOpening(params)} ${question}` }],
      lead: ask === 'gap' ? '\\text{change} =' : `${story.sym} =`,
      keypad: [],
      answer: String(ask === 'start' ? boundStart(params) : ask === 'limit' ? level : gap),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => boundSolution(params),
};

interface CoolParams {
  level: number;
  /** A multiple of b^m, so the value at t = mh is whole. */
  gap: number;
  b: number;
  h: number;
  m: number;
  rising: boolean;
  ctx: number;
}

function coolValue({ level, gap, b, m, rising }: CoolParams): number {
  return rising ? level - gap / b ** m : level + gap / b ** m;
}

function coolModel({ level, gap, b, h, rising }: CoolParams): string {
  return `${level} ${rising ? '-' : '+'} ${gap}e^{${ktTex({ b, h, down: true })}}`;
}

/** The model, and which time the line below is its value at. */
function coolQuestion(params: CoolParams): string {
  const story = boundedStory(params.rising, params.ctx);
  return `${story.subject} after $t$ ${story.unit}s is $${story.sym} = ${coolModel(params)}$. At $t = ${params.m * params.h}$, $${story.sym}$ is the line below.`;
}

/** A bounded model at t = mh, reduced a piece at a time: level ± gap ÷ b^m. */
const expmCoolEvaluate: Generator<CoolParams> = {
  id: 'expm-cool-evaluate',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const b = hard ? rng.pick([2, 3]) : 2;
      const m = rng.int(2, hard ? 4 : 3);
      const rising = hard && rng.chance(0.5);
      const ctx = rng.int(0, 5);
      const story = boundedStory(rising, ctx);
      const level = story.sym === 'T' ? rng.int(15, 25) : rng.pick([40, 50, 60, 80]);
      const gap = rng.int(1, 12) * b ** m;
      if (gap > (rising ? level - 2 : 90) || gap < 8) continue;
      return { level, gap, b, h: rng.int(2, 10), m, rising, ctx };
    }
  },
  choices: (params) => {
    const { level, gap, b, m, rising } = params;
    const shift = rising ? -1 : 1;
    return numberOptions(
      coolValue(params),
      [(level + shift * gap) / b ** m, level + (shift * gap) / b, level + shift * gap, level + (shift * gap) / (b * m)],
      true,
    );
  },
  evaluatePrompt: (params) => [{ kind: 'prose', text: `${coolQuestion(params)} What does it come to?` }],
  render: (params): Slide => {
    const { level, gap, b, m, rising } = params;
    const power = b ** m;
    const part = gap / power;
    const op = rising ? '-' : '+';
    const shift = rising ? -1 : 1;
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `${coolQuestion(params)} Tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      expr: bin(op, num(level), bin('/', num(gap), pow(num(b), num(m)))),
      banks: {
        r: offer(level + shift * part, (level + shift * gap) / power, level + (shift * gap) / b, level + shift * gap, level - shift * part),
        'r.r': offer(part, gap / b, gap - power, gap / (b * m), gap * power),
        'r.r.r': offer(power, b * m, b + m, b ** (m + 1)),
      },
    };
  },
  solution: (params) => {
    const { level, gap, b, h, m, rising } = params;
    const op = rising ? '-' : '+';
    return [
      { text: `At $t = ${m * h}$: $e^{-\\frac{\\ln ${b}}{${h}} \\times ${m * h}} = e^{-${m}\\ln ${b}} = \\frac{1}{${b ** m}}$.` },
      {
        tex: chain(
          `& ${level} ${op} ${gap} \\div ${b}^{${m}}`,
          `&= ${level} ${op} ${gap} \\div ${b ** m}`,
          `&= ${level} ${op} ${gap / b ** m}`,
          `&= ${coolValue(params)}`,
        ),
      },
      { text: 'The division comes before the $' + op + '$, so work out how much of the gap is left first.' },
    ];
  },
};

interface CoolTileStory {
  sym: string;
  /** Believable starting temperatures for this story. */
  starts: number[];
  /** Opens the prompt with the start and the level. */
  opening: (start: number, level: number) => string;
  unit: string;
  rising: boolean;
}

const COOL_TILE_STORIES: CoolTileStory[] = [
  { sym: 'T', starts: [60, 65, 70, 75, 80, 85, 90, 95], opening: (s, l) => `A cup of tea at ${s}°C is left in a room at ${l}°C.`, unit: 'minute', rising: false },
  { sym: 'T', starts: [150, 160, 170, 180, 190, 200, 210, 220], opening: (s, l) => `A tray of bread at ${s}°C comes out of the oven into a kitchen at ${l}°C.`, unit: 'minute', rising: false },
  { sym: 'T', starts: [2, 3, 4, 5, 6, 7], opening: (s, l) => `A can of drink at ${s}°C is taken out of the fridge into a room at ${l}°C.`, unit: 'minute', rising: true },
  { sym: 'T', starts: [1, 2, 3, 4, 5, 6, 7, 8, 9], opening: (s, l) => `A cold stone at ${s}°C is put in a greenhouse at ${l}°C.`, unit: 'minute', rising: true },
];

interface CoolTileParams {
  start: number;
  level: number;
  p: number;
  ctx: number;
}

/** Build the bounded model from the start and the level it approaches. */
const expmCoolTiles: Generator<CoolTileParams> = {
  id: 'expm-cool-tiles',
  sample: (rng, difficulty) => {
    const ctx = rng.int(0, difficulty > 1 ? 3 : 1);
    const level = rng.int(15, 28);
    const start = rng.pick(COOL_TILE_STORIES[ctx].starts);
    return { start, level, p: rng.pick([2, 3, 4, 5, 8, 10, 12, 15]), ctx };
  },
  render: ({ start, level, p, ctx }): Slide => {
    const story = COOL_TILE_STORIES[ctx];
    const gap = Math.abs(start - level);
    const k = dec(p / 100);
    const answer = [`${level}`, `${gap}e^{-${k}t}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${story.opening(start, level)} Its temperature ${story.rising ? 'rises' : 'falls'} towards ${level}°C with $k = ${k}$. Build the model for $T$ after $t$ ${story.unit}s.`,
        },
      ],
      template: `T = {0} ${story.rising ? '-' : '+'} {1}`,
      bank: fillBank(answer, [
        `${start}`,
        `${start === 1 ? '' : start}e^{-${k}t}`,
        `${gap}e^{${k}t}`,
        `${start + level}e^{-${k}t}`,
        `${gap}`,
      ]),
      answer,
    };
  },
  solution: ({ start, level, p, ctx }) => {
    const story = COOL_TILE_STORIES[ctx];
    const gap = Math.abs(start - level);
    return [
      { text: `In the long run the $e^{-kt}$ term dies away, so the number on its own is the level it approaches: $${level}$.` },
      { text: `At $t = 0$ the $e^{-kt}$ term is its full size, which has to make up the gap: ${story.rising ? `$${level} - ${start}$` : `$${start} - ${level}$`} $= ${gap}$.` },
      { tex: `T = ${level} ${story.rising ? '-' : '+'} ${gap}e^{-${dec(p / 100)}t}` },
    ];
  },
};

/* ---------- Level 2, lesson 3: the time to reach a value ---------- */

interface ReachParams extends Rate {
  a: number;
  /** How many lots of h it takes: the answer is m × h. */
  m: number;
  ctx: number;
}

function reachTarget({ a, b, m, down }: ReachParams): number {
  return down ? a / b ** m : a * b ** m;
}

function sampleReach(rng: Rng, difficulty: number): ReachParams {
  for (;;) {
    const hard = difficulty > 1;
    const b = rng.pick(hard ? [2, 3] : [2]);
    const h = rng.int(hard ? 2 : 1, hard ? 8 : 6);
    const m = rng.int(2, hard ? 4 : 5);
    const down = hard ? rng.chance(0.6) : rng.chance(0.3);
    const a = down ? rng.int(1, 8) * b ** m : rng.int(2, 15);
    if (a * (down ? 1 : b ** m) > 8000) continue;
    return { a, b, h, m, down, ctx: rng.int(0, 3) };
  }
}

function reachOpening(params: ReachParams): string {
  return opening(storyOf(params.down, params.ctx), modelTex(params.a, params));
}

/** Distinct step options, sorted, so one question renders one way. */
function stepsBank(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function reachSolution(params: ReachParams): SolutionStep[] {
  const { a, b, h, m, down } = params;
  const power = b ** m;
  const kt = ktTex(params);
  return [
    { text: `Divide by the start, $${texNum(a)}$, to leave the power of $e$ on its own.` },
    { tex: `e^{${kt}} = ${down ? `\\frac{1}{${power}}` : power}` },
    { text: `Take $\\ln$ of both sides, and write $\\ln ${power}$ as $${m}\\ln ${b}$.` },
    { tex: chain(`${kt} &= ${down ? '-' : ''}\\ln ${power}`, `&= ${down ? '-' : ''}${m}\\ln ${b}`) },
    { text: h === 1 ? `So $t = ${m}$.` : `The $\\ln ${b}$ cancels, leaving $\\frac{t}{${h}} = ${m}$, so $t = ${m * h}$.` },
  ];
}

/**
 * Solve Ae^(kt) = V one step at a time: divide off A, take ln, write the log
 * as a multiple of ln b, then t.
 */
const expmReachSteps: Generator<ReachParams> = {
  id: 'expm-reach-steps',
  sample: sampleReach,
  render: (params): Slide => {
    const { a, b, h, m, down } = params;
    const target = reachTarget(params);
    const power = b ** m;
    const kt = ktTex(params);
    const ratio = down ? `\\frac{1}{${power}}` : `${power}`;
    const minus = down ? '-' : '';
    const sameLog = (x: number, y: number) => Math.abs(Math.log(x) - Math.log(y)) < 1e-9;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${reachOpening(params)} Find when $${storyOf(down, params.ctx).sym} = ${texNum(target)}$ one step at a time: tap the step to do next, then choose what it gives.`,
        },
      ],
      start: [modelTex(a, params), '=', texNum(target)],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: `e^{${kt}} = ${ratio}`,
          bank: stepsBank([
            `e^{${kt}} = ${ratio}`,
            `e^{${kt}} = ${texNum(Math.abs(target - a))}`,
            `e^{${kt}} = ${texNum(target * a)}`,
            `${kt} = ${ratio}`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `${kt} = ${minus}\\ln ${power}`,
          bank: stepsBank([`${kt} = ${minus}\\ln ${power}`, `${kt} = ${ratio}`, `${kt} = e^{${power}}`, `t = ${minus}\\ln ${power}`]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `${kt} = ${minus}${m}\\ln ${b}`,
          bank: stepsBank([
            `${kt} = ${minus}${m}\\ln ${b}`,
            ...(sameLog(m ** b, power) ? [] : [`${kt} = ${minus}${b}\\ln ${m}`]),
            ...(sameLog(m * b, power) ? [] : [`${kt} = ${minus}\\ln ${m * b}`]),
            `${kt} = ${minus}${m + 1}\\ln ${b}`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `t = ${m * h}`,
          bank: stepsBank([`t = ${m * h}`, `t = ${m}`, `t = ${m * h + h}`, `t = ${h}`, `t = ${m * h - 1}`]),
        },
      ],
    };
  },
  solution: reachSolution,
};

type WhenParams = ReachParams & { bounded: boolean; level: number };

function whenValue(params: WhenParams): number {
  if (!params.bounded) return reachTarget(params);
  return params.level + reachTarget(params);
}

/** The time to reach a value, typed; at difficulty 2 some models have a level to settle at. */
const expmWhen: Generator<WhenParams> = {
  id: 'expm-when',
  sample: (rng, difficulty) => {
    const reach = sampleReach(rng, difficulty);
    const bounded = difficulty > 1 && rng.chance(0.5);
    if (!bounded) return { ...reach, bounded, level: 0 };
    // Cooling: T = level + a e^{-kt}, reaching level + a / b^m.
    return { ...reach, down: true, a: rng.int(1, 8) * reach.b ** reach.m, bounded, level: rng.int(15, 25) };
  },
  choices: (params) => {
    const { h, m } = params;
    return numberOptions(m * h, [m, h, (m + 1) * h, (m - 1) * h, m * h + 1]);
  },
  render: (params): Slide => {
    const story = params.bounded ? BOUNDED_STORIES[params.ctx % 3] : storyOf(params.down, params.ctx);
    const model = params.bounded ? `${params.level} + ${modelTex(params.a, params)}` : modelTex(params.a, params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} after $t$ ${story.unit}s is modelled by $${story.sym} = ${model}$. When does it reach $${texNum(whenValue(params))}$?`,
        },
      ],
      lead: 't =',
      keypad: [],
      answer: String(params.m * params.h),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const steps = reachSolution(params);
    if (!params.bounded) return steps;
    return [
      { text: `Take away the level first: $${texNum(whenValue(params))} - ${params.level} = ${texNum(reachTarget(params))}$ is what the $e^{-kt}$ term must come to.` },
      ...steps,
    ];
  },
};

/** Slide to the time the model's curve meets a dashed level. */
const expmReachSlider: Generator<ReachParams> = {
  id: 'expm-reach-slider',
  sample: sampleReach,
  render: (params): Slide => {
    const { a, b, h, m, down, ctx } = params;
    const story = storyOf(down, ctx);
    const target = reachTarget(params);
    const answer = m * h;
    const span = sliderSpan(answer, Math.max(answer + 4, Math.ceil(answer * 1.5)));
    const k = ((down ? -1 : 1) * Math.log(b)) / h;
    const top = down ? a * 1.1 : target * 1.5;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${reachOpening(params)} The dashed line is $${texNum(target)}$. Slide to the time, in ${story.unit}s, when $${story.sym}$ reaches it.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: `t = {v}`,
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: top,
          curves: [{ f: (t) => Math.min(a * Math.exp(k * t), top * 2) }],
          horizontals: [target],
          label: `A curve ${down ? 'falling' : 'rising'} from ${a}, with a dashed line at ${target}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: reachSolution,
};

/** Build t as a logarithm divided by the size of k. */
const expmReachTiles: Generator<ReachParams> = {
  id: 'expm-reach-tiles',
  sample: sampleReach,
  render: (params): Slide => {
    const { a, b, h, m } = params;
    const target = reachTarget(params);
    const power = b ** m;
    const size = h === 1 ? `\\ln ${b}` : `\\frac{\\ln ${b}}{${h}}`;
    const answer = [`\\ln ${power}`, size];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${reachOpening(params)} Build the time it takes to reach $${texNum(target)}$.`,
        },
      ],
      template: 't = {0} \\div {1}',
      bank: fillBank(answer, [
        `\\ln ${texNum(target)}`,
        `\\ln ${texNum(a)}`,
        `${power}`,
        h === 1 ? `\\frac{1}{\\ln ${b}}` : `\\frac{${h}}{\\ln ${b}}`,
        `\\ln ${texNum(Math.abs(target - a))}`,
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { b, h, m } = params;
    const power = b ** m;
    return [
      { text: `It has to change by a factor of $${power}$, and $e^{kt}$ changes by $e^{|k|t}$, so $|k|t = \\ln ${power}$.` },
      {
        tex:
          h === 1
            ? chain(`t &= \\ln ${power} \\div \\ln ${b}`, `&= \\frac{${m}\\ln ${b}}{\\ln ${b}} = ${m}`)
            : chain(`t &= \\ln ${power} \\div \\frac{\\ln ${b}}{${h}}`, `&= ${m}\\ln ${b} \\times \\frac{${h}}{\\ln ${b}}`, `&= ${m * h}`),
      },
    ];
  },
};

/* ---------- Level 2, lesson 4: the rate of change ---------- */

const RATE_KS = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 1.5, 2, 3];
const RATE_STARTS = [10, 20, 40, 50, 60, 80, 100, 200];

interface RateParams {
  a: number;
  k: number;
  down: boolean;
  /** A level to settle at, for a bounded model; 0 when there is none. */
  level: number;
  rising: boolean;
}

function sampleRate(rng: Rng, difficulty: number): RateParams {
  const bounded = difficulty > 1 && rng.chance(0.6);
  const a = rng.pick(RATE_STARTS);
  return {
    a,
    // A coefficient of exactly 1 would print as 1e^{...}.
    k: rng.pick(RATE_KS.filter((k) => Math.abs(a * k - 1) > 1e-9)),
    down: bounded || rng.chance(0.4),
    level: bounded ? rng.int(10, 30) : 0,
    rising: bounded && rng.chance(0.5),
  };
}

/** The model y (or T) in x. */
function rateModel({ a, k, down, level, rising }: RateParams): string {
  const term = `${a}e^{${down ? '-' : ''}${dec(k)}x}`;
  if (level === 0) return term;
  return `${level} ${rising ? '-' : '+'} ${term}`;
}

/** The derivative as the learner reads it. */
function rateDerivTex({ a, k, down, level, rising }: RateParams): string {
  const negative = level === 0 ? down : !rising;
  return `${negative ? '-' : ''}${dec(a * k)}e^{${down ? '-' : ''}${dec(k)}x}`;
}

function rateDerivAnswer({ a, k, down, level, rising }: RateParams): string {
  const negative = level === 0 ? down : !rising;
  return `${negative ? '-' : ''}${dec(a * k)}*e^(${down ? '-' : ''}${dec(k)}*x)`;
}

function rateSource({ a, k, down, level, rising }: RateParams): string {
  const term = `${a}*e^(${down ? '-' : ''}${dec(k)}*x)`;
  return level === 0 ? term : `${level} ${rising ? '-' : '+'} ${term}`;
}

/** dy/dx of a model: k times the e term, in x so the derivative can be checked independently. */
const expmRate: Generator<RateParams> = {
  id: 'expm-rate',
  sample: sampleRate,
  choices: (params) => {
    const { a, k, down, level } = params;
    const e = `e^{${down ? '-' : ''}${dec(k)}x}`;
    const eAns = `e^(${down ? '-' : ''}${dec(k)}*x)`;
    const right = rateDerivTex(params);
    const flipped = right.startsWith('-') ? right.slice(1) : `-${right}`;
    const flippedAnswer = right.startsWith('-') ? `${dec(a * k)}*${eAns}` : `-${dec(a * k)}*${eAns}`;
    return options(
      { tex: right, answer: rateDerivAnswer(params) },
      { tex: level === 0 ? `${a}${e}` : `${level} ${right.startsWith('-') ? '' : '+'}${right}`, answer: level === 0 ? `${a}*${eAns}` : `${level} + (${rateDerivAnswer(params)})` },
      { tex: `${dec(k)}${e}`, answer: `${dec(k)}*${eAns}` },
      { tex: flipped, answer: flippedAnswer },
    );
  },
  render: (params): Slide => {
    const bounded = params.level !== 0;
    const sym = bounded ? 'T' : 'y';
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: bounded
            ? `A temperature is modelled by $T = ${rateModel(params)}$, with $x$ for the time. Find $\\frac{dT}{dx}$ in terms of $x$.`
            : `A quantity is modelled by $y = ${rateModel(params)}$, with $x$ for the time. Find its rate of change, $\\frac{dy}{dx}$, in terms of $x$.`,
        },
      ],
      lead: `\\frac{d${sym}}{dx} =`,
      keypad: EXP_KEYS,
      answer: rateDerivAnswer(params),
      source: rateSource(params),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, k, down, level } = params;
    const kk = `${down ? '-' : ''}${dec(k)}`;
    const steps: SolutionStep[] = [
      { text: `Differentiating $e^{kx}$ brings the $k$ down in front: $\\frac{d}{dx}e^{kx} = ke^{kx}$.` },
      { tex: `${kk} \\times ${a} = ${down ? '-' : ''}${dec(a * k)}` },
    ];
    if (level !== 0) steps.push({ text: `The constant $${level}$ does not change, so it differentiates to $0$.` });
    steps.push({ tex: rateDerivTex(params) });
    steps.push({ text: level === 0 ? `That is $${kk}y$: the rate is $k$ times the amount there is.` : 'That is $k$ times how far $T$ is from its level.' });
    return steps;
  },
};

interface RateAtParams {
  a: number;
  /** k as a percentage. */
  p: number;
  v: number;
  down: boolean;
  ctx: number;
}

const RATE_AT_VALUES = [200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 2400, 3000, 4000, 5000];

/** The rate at a moment is k times the amount right then, not the start. */
const expmRateAt: Generator<RateAtParams> = {
  id: 'expm-rate-at',
  sample: (rng, difficulty) => {
    for (;;) {
      const down = difficulty > 1 && rng.chance(0.6);
      const p = rng.pick([2, 3, 4, 5, 8, 10, 12, 15, 20, 25, 30, 40]);
      const a = rng.pick(RATE_AT_VALUES);
      const v = rng.pick(RATE_AT_VALUES);
      if (down ? v >= a : v <= a) continue;
      if (!Number.isInteger((v * p) / 100) || !Number.isInteger((a * p) / 100)) continue;
      return { a, p, v, down, ctx: rng.int(0, 3) };
    }
  },
  choices: ({ a, p, v, down }) => {
    const s = down ? -1 : 1;
    const rate = (s * v * p) / 100;
    return options(
      { tex: `${rate}`, answer: `${rate}` },
      { tex: `${(s * a * p) / 100}`, answer: `${(s * a * p) / 100}` },
      { tex: `${-rate}`, answer: `${-rate}` },
      { tex: `${(s * Math.abs(v - a) * p) / 100}`, answer: `${(s * Math.abs(v - a) * p) / 100}` },
    );
  },
  render: ({ a, p, v, down, ctx }): Slide => {
    const story = storyOf(down, ctx);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, decimalModel(a, p / 100, down))} ${down ? `What is its rate of change, in ${story.of} per ${story.unit}, at the moment $${story.sym} = ${texNum(v)}$?` : `How fast is it growing, in ${story.of} per ${story.unit}, at the moment $${story.sym} = ${texNum(v)}$?`}`,
        },
      ],
      lead: `\\frac{d${story.sym}}{dt} =`,
      keypad: [],
      answer: String(((down ? -1 : 1) * v * p) / 100),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, p, v, down, ctx }) => {
    const { sym } = storyOf(down, ctx);
    const k = `${down ? '-' : ''}${dec(p / 100)}`;
    return [
      { text: `For $${sym} = Ae^{kt}$, the rate is $\\frac{d${sym}}{dt} = k${sym}$: $k$ times the amount there is right then.` },
      { tex: `${k} \\times ${texNum(v)} = ${((down ? -1 : 1) * v * p) / 100}` },
      { text: `Using the start, $${texNum(a)}$, would give the rate at $t = 0$, not now.` },
    ];
  },
};

/** dy/dx written two ways: in x, and as k times y (or k times the gap to the level). */
const expmRateTiles: Generator<RateParams> = {
  id: 'expm-rate-tiles',
  sample: sampleRate,
  render: (params): Slide => {
    const { a, k, down, level, rising } = params;
    const kk = dec(k);
    const ak = dec(a * k);
    const e = `e^{${down ? '-' : ''}${kk}x}`;
    if (level === 0) {
      const s = down ? '-' : '';
      const answer = [`${s}${ak}${e}`, `${s}${kk}y`];
      return {
        kind: 'tiles',
        prompt: [
          { kind: 'prose', text: `For $y = ${rateModel(params)}$, write $\\frac{dy}{dx}$ in terms of $x$, then in terms of $y$.` },
        ],
        template: '\\frac{dy}{dx} = {0} = {1}',
        bank: fillBank(answer, [`${s}${a}${e}`, `${s}${kk}${e}`, `${s}${ak}y`, `${s}${kk}x`, `${down ? '' : '-'}${kk}y`]),
        answer,
      };
    }
    const bk = dec(a * k);
    const answer = rising ? [`${bk}${e}`, `${kk}(${level} - T)`] : [`-${bk}${e}`, `-${kk}(T - ${level})`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `For $T = ${rateModel(params)}$, write $\\frac{dT}{dx}$ in terms of $x$, then in terms of $T$.`,
        },
      ],
      template: '\\frac{dT}{dx} = {0} = {1}',
      bank: fillBank(answer, [
        `-${kk}T`,
        rising ? `-${bk}${e}` : `${bk}${e}`,
        rising ? `${kk}(${level} + T)` : `-${kk}(T + ${level})`,
        rising ? `${kk}T` : `-${kk}(${level} - T)`,
        `${rising ? '' : '-'}${a}${e}`,
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, k, level, rising } = params;
    if (level === 0) {
      return [
        { text: 'Differentiate: the $k$ comes down in front.' },
        { tex: `\\frac{dy}{dx} = ${rateDerivTex(params)}` },
        { text: `That is $${params.down ? '-' : ''}${dec(k)}$ times $${a}e^{${params.down ? '-' : ''}${dec(k)}x}$, which is $y$ itself.` },
      ];
    }
    return [
      { text: `The ${level} differentiates to $0$, and the $e$ term brings down $-${dec(k)}$.` },
      { tex: `\\frac{dT}{dx} = ${rateDerivTex(params)}` },
      {
        text: rising
          ? `$${a}e^{-${dec(k)}x}$ is $${level} - T$, how far $T$ is below its level, so the rate is $${dec(k)}(${level} - T)$.`
          : `$${a}e^{-${dec(k)}x}$ is $T - ${level}$, how far $T$ is above its level, so the rate is $-${dec(k)}(T - ${level})$.`,
      },
    ];
  },
};

interface RateMatchParams {
  p: number;
  down: boolean;
  bounded: boolean;
  level: number;
  ctx: number;
}

/** Which rate equation says what the sentence says. */
const expmRateMatch: Generator<RateMatchParams> = {
  id: 'expm-rate-match',
  sample: (rng, difficulty) => ({
    p: rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]),
    down: rng.chance(0.5),
    bounded: difficulty > 1,
    level: rng.int(12, 30),
    ctx: rng.int(0, 3),
  }),
  render: ({ p, down, bounded, level, ctx }): Slide => {
    const k = dec(p / 100);
    let sentence: string;
    let right: string;
    let wrongs: string[];
    if (!bounded) {
      const story = storyOf(down, ctx);
      const s = story.sym;
      const lhs = `\\frac{d${s}}{dt} =`;
      sentence = `${story.subject.replace(/,$/, '')}, $${s}$, ${down ? 'falls' : 'grows'} at a rate equal to ${p}% of its current size per ${story.unit}.`;
      right = `${lhs} ${down ? '-' : ''}${k}${s}`;
      wrongs = [`${lhs} ${down ? '-' : ''}${p}${s}`, `${lhs} ${down ? '-' : ''}${k}t`, `${lhs} ${down ? '' : '-'}${k}${s}`];
    } else {
      const lhs = '\\frac{dT}{dt} =';
      sentence = down
        ? `A hot drink cools at a rate proportional to how far its temperature $T$ is above the room's ${level}°C, with constant ${k}.`
        : `A cold drink warms at a rate proportional to how far its temperature $T$ is below the room's ${level}°C, with constant ${k}.`;
      right = down ? `${lhs} -${k}(T - ${level})` : `${lhs} ${k}(${level} - T)`;
      wrongs = down
        ? [`${lhs} -${k}T`, `${lhs} ${k}(T - ${level})`, `${lhs} -${k}(T + ${level})`]
        : [`${lhs} ${k}T`, `${lhs} -${k}(${level} - T)`, `${lhs} ${k}(T + ${level})`];
    }
    const labels = [right, ...wrongs];
    const ordered = turned(labels, labels.join('|'));
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `${sentence} Which equation says the same thing?` }],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
      correctId: `opt${ordered.indexOf(right)}`,
    };
  },
  solution: ({ p, down, bounded, level }) => {
    const k = dec(p / 100);
    if (!bounded) {
      return [
        { text: `${p}% of its current size is $${k}$ times it, and ${down ? 'falling makes the rate negative' : 'growing makes the rate positive'}.` },
        { text: 'The rate depends on the amount there is, not on the time: that is what makes it exponential.' },
      ];
    }
    return [
      { text: down ? `How far above the room it is: $T - ${level}$.` : `How far below the room it is: $${level} - T$.` },
      { text: down ? `Cooling makes the rate negative, so $\\frac{dT}{dt} = -${k}(T - ${level})$.` : `Warming makes the rate positive, so $\\frac{dT}{dt} = ${k}(${level} - T)$.` },
    ];
  },
};

/* ---------- Level 2, lesson 5: linear, exponential or bounded ---------- */

type TableKind = 'linear' | 'exponential' | 'bounded';

interface TableParams {
  kind: TableKind;
  /** Values at equal steps of t. */
  values: number[];
  /** The step between the times in the table. */
  dt: number;
}

/** The table, a `t` row over a row named `label`: `y`, or a story's own letter. */
function tableTex({ values, dt }: TableParams, label = 'y'): string {
  const times = values.map((_, i) => `${i * dt}`).join(' & ');
  return `\\begin{array}{c|${'c'.repeat(values.length)}} t & ${times} \\\\ \\hline ${label} & ${values.map(texNum).join(' & ')} \\end{array}`;
}

function sampleTable(rng: Rng, difficulty: number, kind: TableKind): TableParams {
  const count = difficulty > 1 ? 5 : 4;
  const dt = difficulty > 1 ? rng.pick([1, 2, 5]) : 1;
  const idx = Array.from({ length: count }, (_, i) => i);
  if (kind === 'linear') {
    const d = rng.pick([-1, 1]) * rng.int(3, 15);
    const a = d > 0 ? rng.int(2, 40) : rng.int(-d * count + 5, -d * count + 60);
    return { kind, values: idx.map((i) => a + d * i), dt };
  }
  if (kind === 'exponential') {
    const r = rng.pick([2, 3]);
    const shrink = rng.chance(0.4);
    const q = rng.int(1, 9);
    return { kind, values: idx.map((i) => (shrink ? q * r ** (count - 1 - i) : (q + 1) * r ** i)), dt };
  }
  const f = rng.pick(difficulty > 1 ? [2, 3] : [2]);
  const gap = rng.int(1, 6) * f ** (count - 1);
  const rising = rng.chance(0.5);
  // Rising towards the level from below, so the level has to clear the gap
  // or the table starts below zero.
  const level = rising ? gap + rng.int(2, 40) : rng.int(10, 50);
  return { kind, values: idx.map((i) => (rising ? level - gap / f ** i : level + gap / f ** i)), dt };
}

/** Which model a table follows: equal gaps, equal ratios, or gaps shrinking by a factor. */
const expmModelFlow: Generator<TableParams> = {
  id: 'expm-model-flow',
  sample: (rng, difficulty) =>
    sampleTable(rng, difficulty, rng.pick(['linear', 'exponential', 'bounded', 'bounded'] as const)),
  render: (params): Slide => ({
    kind: 'flow',
    prompt: [
      { kind: 'prose', text: 'Which kind of model fits this table? Each answer chooses what gets asked next.' },
      { kind: 'display', tex: tableTex(params) },
    ],
    subject: '\\text{the table}',
    steps: [
      {
        id: 'diff',
        ask: 'Are the gaps between neighbouring values all the same?',
        branches: [
          { label: 'Yes', outcome: 'Equal gaps mean the same amount is added each step: a linear model, $y = a + bt$.' },
          { label: 'No', to: 'ratio' },
        ],
      },
      {
        id: 'ratio',
        ask: 'Is each value the same multiple of the one before?',
        branches: [
          { label: 'Yes', outcome: 'The same multiplier every step: an exponential model, $y = Ae^{kt}$.' },
          { label: 'No', to: 'gaps' },
        ],
      },
      {
        id: 'gaps',
        ask: 'Do the gaps themselves shrink by the same factor every step?',
        branches: [
          { label: 'Yes', outcome: 'Gaps shrinking by a constant factor close in on a level: a bounded model, $y = L \\pm Be^{-kt}$.' },
          { label: 'No', outcome: 'Then none of these three models fits the table.' },
        ],
      },
    ],
    answer: params.kind === 'linear' ? ['Yes'] : params.kind === 'exponential' ? ['No', 'Yes'] : ['No', 'No', 'Yes'],
  }),
  solution: ({ kind, values }) => {
    const gaps = values.slice(1).map((v, i) => v - values[i]);
    const steps: SolutionStep[] = [{ text: `The gaps are $${gaps.join(',\\ ')}$.` }];
    if (kind === 'linear') {
      steps.push({ text: 'They are all the same, so the model is linear.' });
      return steps;
    }
    const top = values[1] > values[0] ? values[1] / values[0] : values[0] / values[1];
    if (kind === 'exponential') {
      steps.push({ text: `Not equal, but each value is $${dec(values[1] / values[0])}$ times the one before, so it is exponential.` });
      return steps;
    }
    steps.push({ text: `Not equal, and the ratios are not equal either: $${dec(top)}$ at first, then something else.` });
    steps.push({ text: `But each gap is $\\frac{1}{${Math.round(gaps[0] / gaps[1])}}$ of the one before, so it closes in on a level: bounded.` });
    return steps;
  },
};

type ModelKind = 'linear' | 'grow' | 'decay' | 'fall' | 'rise';

const MODEL_FORMS: Record<ModelKind, string> = {
  linear: 'y = a + bt',
  grow: 'y = Ae^{kt}',
  decay: 'y = Ae^{-kt}',
  fall: 'y = L + Be^{-kt}',
  rise: 'y = L - Be^{-kt}',
};

const MODEL_STORIES: Record<ModelKind, ((x: number, y: number) => string)[]> = {
  linear: [
    (x, y) => `A savings jar starts with £${x}, and £${y} is added every week.`,
    (x, y) => `A candle ${x + 20} cm tall burns down ${y % 5 + 1} cm every hour.`,
    (x, y) => `A taxi charges £${y % 6 + 2} to start and £${x % 4 + 1} for every mile.`,
  ],
  grow: [
    (x, y) => `A culture of ${x * 10} cells doubles every ${y % 6 + 2} hours.`,
    (x, y) => `£${x * 100} is invested at ${y % 8 + 2}% a year, compounded continuously.`,
    (x) => `A rumour known to ${x} people spreads at a rate proportional to how many know it.`,
  ],
  decay: [
    (x) => `${aOrAn(x * 10, true)} ${x * 10} mg dose of a drug leaves the blood at a rate proportional to the amount left.`,
    (x, y) => `${aOrAn(x * 5, true)} ${x * 5} g radioactive sample halves every ${y % 9 + 2} days.`,
    (x, y) => `A car worth £${x * 1000} loses value continuously at ${y % 10 + 5}% a year.`,
  ],
  fall: [
    (x, y) => `A pie at ${150 + x} °C is left to cool in a kitchen at ${15 + (y % 10)} °C.`,
    (x, y) => `A bath at ${40 + (x % 10)} °C cools towards the ${15 + (y % 8)} °C of the bathroom.`,
  ],
  rise: [
    (x) => `Total sales of a new game rise quickly at first, then level off at ${x * 10} thousand.`,
    (x) => `A skydiver's speed rises towards a terminal speed of ${40 + x} m/s.`,
    (x, y) => `A can at ${2 + (x % 5)} °C warms up in a room at ${18 + (y % 8)} °C.`,
  ],
};

interface ModelChoiceParams {
  kind: ModelKind;
  story: number;
  x: number;
  y: number;
}

/** Which model form a story calls for. */
const expmModelChoice: Generator<ModelChoiceParams> = {
  id: 'expm-model-choice',
  sample: (rng, difficulty) => {
    const kind = rng.pick(difficulty > 1 ? (['decay', 'fall', 'rise', 'rise', 'linear'] as const) : (['linear', 'grow', 'decay', 'fall'] as const));
    return { kind, story: rng.int(0, MODEL_STORIES[kind].length - 1), x: rng.int(2, 9), y: rng.int(3, 40) };
  },
  render: ({ kind, story, x, y }): Slide => {
    const others = (Object.keys(MODEL_FORMS) as ModelKind[]).filter((other) => other !== kind);
    const picked = turned(others, `${kind}-${story}-${x}-${y}`).slice(0, 3);
    const labels = [MODEL_FORMS[kind], ...picked.map((other) => MODEL_FORMS[other])];
    const ordered = turned(labels, `${labels.join('|')}-${x}`);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${MODEL_STORIES[kind][story](x, y)} Which model fits? Here $a$ and $b$ are constants, and $A$, $B$, $L$ and $k$ are positive.`,
        },
      ],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
      correctId: `opt${ordered.indexOf(MODEL_FORMS[kind])}`,
    };
  },
  solution: ({ kind }) => {
    const why: Record<ModelKind, string> = {
      linear: 'The same amount is added every step, which is linear.',
      grow: 'It multiplies by the same factor over equal times, or grows in proportion to its size: exponential growth.',
      decay: 'It shrinks by the same factor over equal times, or in proportion to its size: exponential decay.',
      fall: 'It falls towards a level above zero and settles there: a level plus a decaying term.',
      rise: 'It rises towards a ceiling and levels off: a level minus a decaying term.',
    };
    return [{ text: why[kind] }, { tex: MODEL_FORMS[kind] }];
  },
};

interface NextParams {
  bounded: boolean;
  level: number;
  /** The multiplier per step (exponential) or the factor the gap shrinks by. */
  f: number;
  /** The start (exponential) or the first gap (bounded). */
  a: number;
  rising: boolean;
}

function nextValues({ bounded, level, f, a, rising }: NextParams): number[] {
  return [0, 1, 2, 3].map((i) => (bounded ? (rising ? level - a / f ** i : level + a / f ** i) : a * f ** i));
}

/**
 * Carry a table on by one step: the ratio twice, then the next value; or,
 * bounded, the gaps to the level, the factor they shrink by, the next gap and
 * the next value.
 */
const expmNextTree: Generator<NextParams> = {
  id: 'expm-next-tree',
  sample: (rng, difficulty) => {
    const bounded = difficulty > 1;
    const f = rng.pick(bounded ? [2, 3] : [2, 3, 4, 5]);
    return {
      bounded,
      level: rng.int(10, 40),
      f,
      a: bounded ? rng.int(1, 6) * f ** 3 : rng.int(2, 15),
      rising: bounded && rng.chance(0.5),
    };
  },
  render: (params): Slide => {
    const { bounded, level, f, rising } = params;
    const values = nextValues(params);
    const [y0, y1, y2, y3] = values;
    const table = `\\begin{array}{c|cccc} t & 0 & 1 & 2 & 3 \\\\ \\hline y & ${texNum(y0)} & ${texNum(y1)} & ${texNum(y2)} & ? \\end{array}`;
    if (!bounded) {
      const answer = [String(f), String(f), String(y3)];
      return {
        kind: 'tree',
        prompt: [
          {
            kind: 'prose',
            text: 'The table follows an exponential model. Fill in each value divided by the one before, then the value at $t = 3$.',
          },
          { kind: 'display', tex: table },
        ],
        expression: `y_{3} = y_{2} \\times \\text{ratio}`,
        nodes: [
          { id: 'first', from: [] },
          { id: 'second', from: [] },
          { id: 'next', from: ['first', 'second'] },
        ],
        bank: treeBank(answer, [String(y2 + (y2 - y1)), String(y1 - y0), String(y2 * (f + 1)), String(f + 1)]),
        answer,
      };
    }
    const g1 = Math.abs(y1 - level);
    const g2 = Math.abs(y2 - level);
    const g3 = g2 / f;
    const answer = [String(g1), String(g2), String(f), String(g3), String(y3)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `The table follows a bounded model settling at $${level}$. Fill in how far $y$ is from ${level} at $t = 1$ and at $t = 2$, the factor that gap shrinks by, the gap at $t = 3$, then $y$ at $t = 3$.`,
        },
        { kind: 'display', tex: table },
      ],
      expression: `y = ${level} ${rising ? '-' : '+'} \\text{gap}`,
      nodes: [
        { id: 'g1', from: [] },
        { id: 'g2', from: [] },
        { id: 'factor', from: ['g1', 'g2'] },
        { id: 'g3', from: ['factor'] },
        { id: 'next', from: ['g3'] },
      ],
      bank: treeBank(
        answer,
        [y2 + (y2 - y1), level, rising ? level + g3 : level - g3, g2 - g3, f + 1].filter((v) => Number.isInteger(v) && v > 0).map(String),
      ),
      answer,
    };
  },
  solution: (params) => {
    const { bounded, level, f, rising } = params;
    const [, y1, y2, y3] = nextValues(params);
    if (!bounded) {
      return [
        { text: `Each value is $${f}$ times the one before, so the next is $${texNum(y2)} \\times ${f} = ${texNum(y3)}$.` },
        { text: `Adding the last gap again, $${texNum(y2 + (y2 - y1))}$, would treat it as linear.` },
      ];
    }
    const g2 = Math.abs(y2 - level);
    return [
      { text: `Measure from the level, not from zero: the gaps are $${Math.abs(y1 - level)}$ and $${g2}$, shrinking by $${f}$ each step.` },
      { tex: chain(`\\text{gap} &= ${g2} \\div ${f} = ${g2 / f}`, `y &= ${level} ${rising ? '-' : '+'} ${g2 / f} = ${y3}`) },
    ];
  },
};

/* ---------- Level 3, lesson 1: the rate as a percentage ---------- */

interface PercentParams {
  a: number;
  /** The rate as a percentage of the amount: k = p / 100. */
  p: number;
  down: boolean;
  ctx: number;
}

const HALF_PERCENTS = [0.5, 1.5, 2.5, 3.5, 7.5, 12.5];

function samplePercent(rng: Rng, difficulty: number): PercentParams {
  return {
    a: rng.pick(READ_STARTS),
    p: rng.pick(difficulty > 1 ? [...READ_PERCENTS.slice(0, 8), ...HALF_PERCENTS] : READ_PERCENTS),
    down: rng.chance(0.5),
    ctx: rng.int(0, 3),
  };
}

/** "the number of bacteria in a dish", for the middle of a sentence. */
function lowerSubject(story: Story): string {
  return story.subject.charAt(0).toLowerCase() + story.subject.slice(1);
}

/**
 * Four decimal options: the answer, then the slips in the order given. A slip
 * that collides with one already taken is dropped and the gap filled with
 * multiples of the answer.
 */
function decimalOptions(correct: number, slips: number[]): ChoiceOption[] {
  const seen = new Set([dec(correct)]);
  const picked: string[] = [];
  for (const value of [...slips, correct * 2, correct / 2, correct * 10, correct * 3]) {
    if (picked.length === 3) break;
    const shown = dec(value);
    if (!Number.isFinite(value) || seen.has(shown)) continue;
    seen.add(shown);
    picked.push(shown);
  }
  return options({ tex: dec(correct), answer: dec(correct) }, ...picked.map((shown) => ({ tex: shown, answer: shown })));
}

/** Build the rate equation from a sentence, then the model it gives. */
const expmPercentTiles: Generator<PercentParams> = {
  id: 'expm-percent-tiles',
  sample: samplePercent,
  render: ({ a, p, down, ctx }): Slide => {
    const story = storyOf(down, ctx);
    const { sym } = story;
    const k = dec(p / 100);
    const s = down ? '-' : '';
    const flip = down ? '' : '-';
    const answer = [`${s}${k}${sym}`, `${texNum(a)}e^{${s}${k}t}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} starts at ${a}, and ${down ? 'falls' : 'grows'} at a rate equal to ${p}% of its current size per ${story.unit}. Build the rate equation, then the model for $${sym}$ after $t$ ${story.unit}s.`,
        },
      ],
      template: `\\frac{d${sym}}{dt} = {0} \\qquad ${sym} = {1}`,
      bank: fillBank(answer, [
        `${s}${p}${sym}`,
        `${s}${k}t`,
        `${flip}${k}${sym}`,
        `${texNum(a)}e^{${s}${p}t}`,
        `${s}${dec((a * p) / 100)}`,
      ]),
      answer,
    };
  },
  solution: ({ a, p, down, ctx }) => {
    const { sym } = storyOf(down, ctx);
    const k = `${down ? '-' : ''}${dec(p / 100)}`;
    return [
      {
        text: `${p}% of its current size is $${dec(p / 100)}$ times $${sym}$, and ${down ? 'falling makes the rate negative' : 'growing makes the rate positive'}.`,
      },
      { tex: `\\frac{d${sym}}{dt} = ${k}${sym}` },
      { text: `A rate of $k${sym}$ belongs to the model $Ae^{kt}$ with that same $k$, and it starts from $${texNum(a)}$.` },
      { tex: `${sym} = ${decimalModel(a, p / 100, down)}` },
    ];
  },
};

type PercentKParams = PercentParams & { reverse: boolean };

/** k as a decimal from a percentage, and at difficulty 2 the percentage back from a model. */
const expmPercentK: Generator<PercentKParams> = {
  id: 'expm-percent-k',
  sample: (rng, difficulty) => ({ ...samplePercent(rng, difficulty), reverse: difficulty > 1 && rng.chance(0.5) }),
  choices: ({ p, down, reverse }) => {
    if (reverse) return decimalOptions(p, [p / 100, down ? 100 - p : 100 + p, p * 10]);
    const k = ((down ? -1 : 1) * p) / 100;
    return decimalOptions(k, [(down ? -1 : 1) * p, k / 10, -k]);
  },
  render: ({ a, p, down, ctx, reverse }): Slide => {
    const story = storyOf(down, ctx);
    if (reverse) {
      return {
        kind: 'expression',
        prompt: [
          {
            kind: 'prose',
            text: `${opening(story, decimalModel(a, p / 100, down))} At any moment it is ${down ? 'falling' : 'growing'} at what percentage of its current size per ${story.unit}?`,
          },
        ],
        lead: '\\text{percentage} =',
        keypad: [],
        answer: dec(p),
        domain: 'real',
        mode: 'exact',
      };
    }
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} ${down ? 'falls' : 'grows'} at a rate equal to ${p}% of its current size per ${story.unit}. Its model is $${story.sym} = Ae^{kt}$. What is $k$, as a decimal?`,
        },
      ],
      lead: 'k =',
      keypad: [],
      answer: `${down ? '-' : ''}${dec(p / 100)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ p, down, reverse }) => {
    const k = `${down ? '-' : ''}${dec(p / 100)}`;
    if (reverse) {
      return [
        { text: `$k = ${k}$ is the rate as a decimal of the amount. Times 100 makes it a percentage.` },
        { tex: `${dec(p / 100)} \\times 100 = ${dec(p)}\\%` },
        { text: `The sign only says which way: ${down ? 'negative, so it is falling' : 'positive, so it is growing'}.` },
      ];
    }
    return [
      { text: `A percentage is out of 100: $${dec(p)}\\% = ${dec(p)} \\div 100 = ${dec(p / 100)}$.` },
      { text: `${down ? 'Falling makes $k$ negative' : 'Growing makes $k$ positive'}, so $k = ${k}$.` },
    ];
  },
};

type PercentFlowParams = PercentParams & { v: number };

/**
 * Read the rate from a model one fork at a time: the sign of k, its size as a
 * percentage, what that is a percentage of, and at difficulty 2 the rate at a
 * given moment.
 */
const expmPercentFlow: Generator<PercentFlowParams> = {
  id: 'expm-percent-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = samplePercent(rng, difficulty);
      if (difficulty === 1) return { ...base, v: 0 };
      const v = rng.pick(RATE_AT_VALUES);
      if (base.down ? v >= base.a : v <= base.a) continue;
      if (!Number.isInteger((v * base.p) / 100) || !Number.isInteger((base.a * base.p) / 100)) continue;
      return { ...base, v };
    }
  },
  render: ({ a, p, down, ctx, v }): Slide => {
    const story = storyOf(down, ctx);
    const { sym, unit } = story;
    const key = `${a}-${p}-${down}-${ctx}-${v}`;
    const now = dec((v * p) / 100);
    const forks = (dir: 'up' | 'down') => {
      const ing = dir === 'up' ? 'growing' : 'falling';
      const size = [
        { label: `${dec(p)}%`, to: `${dir}Of` },
        { label: `${dec(p / 100)}%`, outcome: '$k$ is already a decimal of the amount. Times 100 makes it a percentage.' },
        {
          label: `${dec(dir === 'up' ? 100 + p : 100 - p)}%`,
          outcome: 'That is a multiplier for step-by-step growth. A continuous $k$ is the rate itself.',
        },
      ];
      const what = [
        v === 0
          ? { label: 'Its size at that moment', outcome: `So the rate keeps pace with $${sym}$: the more there is, the faster it changes.` }
          : { label: 'Its size at that moment', to: `${dir}Now` },
        { label: 'Its size at the start', outcome: `That would change it by the same amount every ${unit}: a straight line, not an exponential.` },
        { label: `Its size one ${unit} earlier`, outcome: `That is step-by-step growth, applied once a ${unit}. A continuous rate applies at every instant.` },
      ];
      const steps = [
        { id: dir, ask: 'As a percentage of the amount, how big is $k$?', branches: turned(size, `${key}-${dir}`) },
        { id: `${dir}Of`, ask: `So at any moment, $${sym}$ is ${ing} at ${dec(p)}% of what, per ${unit}?`, branches: turned(what, `${key}-${dir}-of`) },
      ];
      if (v !== 0) {
        steps.push({
          id: `${dir}Now`,
          ask: `So when $${sym} = ${texNum(v)}$, how fast is it ${ing}, in ${story.of} per ${unit}?`,
          branches: turned(
            [
              { label: `$${now}$`, outcome: `$${dec(p)}\\%$ of $${texNum(v)}$, the amount at that moment.` },
              { label: `$${dec((a * p) / 100)}$`, outcome: 'That uses the start. The rate uses the amount right then.' },
              { label: `$${texNum(v * p)}$`, outcome: 'That multiplies by the percentage rather than by $k$.' },
            ],
            `${key}-${dir}-now`,
          ),
        });
      }
      return steps;
    };
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, decimalModel(a, p / 100, down))} Read its rate one question at a time. Each answer chooses what gets asked next.`,
        },
      ],
      subject: `${sym} = ${decimalModel(a, p / 100, down)}`,
      steps: [
        {
          id: 'sign',
          ask: 'Is $k$, the number multiplying $t$ in the power, positive or negative?',
          branches: [
            { label: 'Positive', to: 'up' },
            { label: 'Negative', to: 'down' },
          ],
        },
        ...forks('up'),
        ...forks('down'),
      ],
      answer: [down ? 'Negative' : 'Positive', `${dec(p)}%`, 'Its size at that moment', ...(v === 0 ? [] : [`$${now}$`])],
    };
  },
  solution: ({ p, down, ctx, v }) => {
    const { sym } = storyOf(down, ctx);
    const k = `${down ? '-' : ''}${dec(p / 100)}`;
    const steps: SolutionStep[] = [
      { text: `$k = ${k}$ is ${down ? 'negative, so it falls' : 'positive, so it grows'}, and $${dec(p / 100)} = ${dec(p)}\\%$.` },
      { text: `Its rate is $\\frac{d${sym}}{dt} = ${k}${sym}$: ${dec(p)}% of whatever $${sym}$ is at that moment.` },
    ];
    if (v !== 0) steps.push({ tex: `${k} \\times ${texNum(v)} = ${dec(((down ? -1 : 1) * v * p) / 100)}` });
    return steps;
  },
};

type WordsParams = PercentParams & { fromModel: boolean };

/** Which sentence says what a rate equation, or at difficulty 2 a model, says. */
const expmRateWords: Generator<WordsParams> = {
  id: 'expm-rate-words',
  sample: (rng, difficulty) => ({ ...samplePercent(rng, difficulty), fromModel: difficulty > 1 }),
  render: ({ a, p, down, ctx, fromModel }): Slide => {
    const story = storyOf(down, ctx);
    const { sym, unit, of } = story;
    const k = dec(p / 100);
    const verb = down ? 'falls' : 'grows';
    const given = fromModel
      ? opening(story, decimalModel(a, p / 100, down))
      : `$${sym}$ is ${lowerSubject(story)} after $t$ ${unit}s, and $\\frac{d${sym}}{dt} = ${down ? '-' : ''}${k}${sym}$.`;
    // Plain text: a choice label is TeX throughout or not at all.
    const right = `${sym} ${verb} at ${dec(p)}% of its current size per ${unit}`;
    const labels = [
      right,
      `${sym} ${verb} by ${dec(p)} ${of} every ${unit}`,
      `${sym} ${verb} at ${dec(p / 100)}% of its current size per ${unit}`,
      fromModel
        ? `${sym} ${verb} by ${dec((a * p) / 100)} ${of} every ${unit}`
        : `${sym} ${verb} at ${dec(p)}% of its starting size per ${unit}`,
    ];
    const ordered = turned(labels, labels.join('|'));
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `${given} Which sentence says the same thing about its rate?` }],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${ordered.indexOf(right)}`,
    };
  },
  solution: ({ a, p, down, ctx, fromModel }) => {
    const { sym } = storyOf(down, ctx);
    const k = `${down ? '-' : ''}${dec(p / 100)}`;
    const steps: SolutionStep[] = [];
    if (fromModel) {
      steps.push({ text: `Differentiating brings $k$ down in front, so the rate is $k$ times the model itself:` });
      steps.push({ tex: chain(`\\frac{d${sym}}{dt} &= ${k} \\times ${decimalModel(a, p / 100, down)}`, `&= ${k}${sym}`) });
    }
    steps.push({ text: `$${dec(p / 100)}$ times $${sym}$ is ${dec(p)}% of $${sym}$, and $${sym}$ is its size at that moment, not at the start.` });
    steps.push({ text: `So it ${down ? 'falls' : 'grows'} at ${dec(p)}% of its current size: the amount it changes by is not fixed.` });
    return steps;
  },
};

/* ---------- Level 3, lesson 2: the average rate over an interval ---------- */

interface AvgParams extends Rate {
  a: number;
  /** The interval runs from t = m1 × h to t = m2 × h. */
  m1: number;
  m2: number;
  ctx: number;
}

/** The model at t = m × h, which is a whole power of b away from the start. */
function lotsValue({ a, b, down }: Rate & { a: number }, m: number): number {
  return down ? a / b ** m : a * b ** m;
}

function avgRate(params: AvgParams): number {
  const { h, m1, m2 } = params;
  return (lotsValue(params, m2) - lotsValue(params, m1)) / ((m2 - m1) * h);
}

/**
 * A model and an interval whose average rate is whole. The ends are drawn
 * first, as whole numbers of h, and the start is built to divide out.
 */
function sampleAvg(rng: Rng, difficulty: number, from: number, decay: boolean): AvgParams {
  for (;;) {
    const hard = difficulty > 1;
    const b = rng.pick(hard ? [2, 3] : [2]);
    const h = rng.int(1, hard ? 6 : 4);
    const down = decay && rng.chance(0.4);
    const m1 = rng.int(from, hard ? 2 : 1);
    const m2 = rng.int(m1 + 1, b === 2 ? 5 : 3);
    const a = down ? rng.int(1, 6) * b ** m2 : rng.int(2, hard ? 20 : 12);
    const params = { a, b, h, down, m1, m2, ctx: rng.int(0, 3) };
    if ((down ? a : a * b ** m2) > 4000) continue;
    if (!Number.isInteger(avgRate(params))) continue;
    return params;
  }
}

/** b^t, b^{t/h}, or one over it: what e^{kt} is once k is (ln b)/h. */
function everyTex({ b, h, down }: Rate): string {
  const power = h === 1 ? `${b}^{t}` : `${b}^{t/${h}}`;
  return down ? `\\frac{1}{${power}}` : power;
}

/** The value at t = m × h, worked: 40 \times 2^{3} = 320. */
function lotsLine(params: Rate & { a: number }, m: number, sym: string): string {
  const { a, b, h, down } = params;
  return `${sym}(${m * h}) &= ${texNum(a)} ${down ? '\\div' : '\\times'} ${b}^{${m}} = ${texNum(lotsValue(params, m))}`;
}

/** The model's curve and the chord joining it at two times, dashed. */
function chordFigure(f: (t: number) => number, t1: number, t2: number, span: number, label: string): Block {
  const y1 = f(t1);
  const y2 = f(t2);
  const top = Math.max(f(0), y1, y2) * 1.25;
  const slope = (y2 - y1) / (t2 - t1);
  return {
    kind: 'diagram',
    svg: plotSvg({
      xMin: 0,
      xMax: span,
      yMin: 0,
      yMax: top,
      curves: [
        { f: (t) => Math.min(f(t), top * 2) },
        // Only between the two points; the pen lifts outside them.
        { f: (t) => (t >= t1 && t <= t2 ? y1 + slope * (t - t1) : NaN), dashed: true, breaks: true },
      ],
      marks: [
        { x: t1, y: y1 },
        { x: t2, y: y2 },
      ],
      label,
    }),
  };
}

function avgSolution(params: AvgParams): SolutionStep[] {
  const { h, m1, m2, down, ctx } = params;
  const { sym } = storyOf(down, ctx);
  const y1 = lotsValue(params, m1);
  const y2 = lotsValue(params, m2);
  const t1 = m1 * h;
  const t2 = m2 * h;
  return [
    { text: `$e^{${ktTex(params)}} = ${everyTex(params)}$, so at a whole number of ${h === 1 ? 'units' : `lots of ${h}`} it is a whole power of $${params.b}$.` },
    { tex: chain(lotsLine(params, m2, sym), lotsLine(params, m1, sym)) },
    { text: 'The average rate is the change divided by the time it took:' },
    { tex: `\\frac{${texNum(y2)} - ${texNum(y1)}}{${t2} - ${t1}} = \\frac{${texNum(y2 - y1)}}{${t2 - t1}} = ${texNum(avgRate(params))}` },
  ];
}

/** The average rate as a tree: each end, the change, the time between, then the rate. */
const expmAvgTree: Generator<AvgParams> = {
  id: 'expm-avg-tree',
  sample: (rng, difficulty) => sampleAvg(rng, difficulty, difficulty > 1 ? 1 : 0, difficulty > 1),
  render: (params): Slide => {
    const { a, h, m1, m2, down, ctx } = params;
    const story = storyOf(down, ctx);
    const { sym } = story;
    const t1 = m1 * h;
    const t2 = m2 * h;
    const y1 = lotsValue(params, m1);
    const y2 = lotsValue(params, m2);
    const answer = [y2, y1, y2 - y1, t2 - t1, avgRate(params)].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, params))} Find its average rate of change from $t = ${t1}$ to $t = ${t2}$. Fill in $${sym}$ at each end, the change, the time between, then the average rate.`,
        },
      ],
      expression: `\\frac{${sym}(${t2}) - ${sym}(${t1})}{${t2} - ${t1}}`,
      nodes: [
        { id: 'late', from: [] },
        { id: 'early', from: [] },
        { id: 'change', from: ['late', 'early'] },
        { id: 'gap', from: [] },
        { id: 'average', from: ['change', 'gap'] },
      ],
      bank: treeBank(answer, [String(y2 + y1), String(t2 + t1), String(m2 - m1), String(lotsValue(params, m2 + 1))]),
      answer,
    };
  },
  solution: avgSolution,
};

function avgExpr(params: AvgParams): Expr {
  const { a, b, h, m1, m2 } = params;
  const at = (m: number): Expr => {
    if (m === 0) return num(a);
    if (m === 1) return bin('*', num(a), num(b));
    return bin('*', num(a), pow(num(b), num(m)));
  };
  return bin('/', bin('-', at(m2), at(m1)), m1 === 0 ? num(m2 * h) : bin('-', num(m2 * h), num(m1 * h)));
}

/**
 * The average rate of a growing model, reduced a piece at a time. The powers
 * come first; the slips on offer are the ones the order invites.
 */
const expmAvgReduce: Generator<AvgParams> = {
  id: 'expm-avg-reduce',
  sample: (rng, difficulty) => sampleAvg(rng, difficulty, difficulty > 1 ? 1 : 0, false),
  render: (params): Slide => {
    const { a, b, h, m1, m2, ctx } = params;
    const story = storyOf(false, ctx);
    const y1 = lotsValue(params, m1);
    const y2 = lotsValue(params, m2);
    const t1 = m1 * h;
    const t2 = m2 * h;
    const banks: Record<string, string[]> = {
      r: offer(avgRate(params), (y2 - y1) / t2, (y2 + y1) / (t2 - t1), y2 - y1, (y2 - y1) / (m2 - m1)),
      'r.l': offer(y2 - y1, y2 + y1, y2, a * b ** (m2 - m1), y2 - a),
    };
    const valueBanks = (path: string, m: number) => {
      if (m === 0) return;
      banks[path] = offer(lotsValue(params, m), (a * b) ** m, a * b * m, a + b ** m, b ** m, a * b ** (m + 1));
      if (m > 1) banks[`${path}.r`] = offer(b ** m, b * m, b + m, b ** (m - 1), b ** (m + 1));
    };
    valueBanks('r.l.l', m2);
    valueBanks('r.l.r', m1);
    if (m1 > 0) banks['r.r'] = offer(t2 - t1, t2 + t1, m2 - m1, t2, t1);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, params))} The line below is its average rate of change from $t = ${t1}$ to $t = ${t2}$. Tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      expr: avgExpr(params),
      banks,
    };
  },
  solution: avgSolution,
};

type StretchParams = Rate & { a: number; j: number; ctx: number };

/** The size of the average rate over the h units starting at t = j × h. */
function stretchRate(params: StretchParams): number {
  return Math.abs(lotsValue(params, params.j + 1) - lotsValue(params, params.j)) / params.h;
}

/**
 * Slide to the start of the stretch, one step of h long, over which the model
 * changes by a given average rate. Equal stretches do not change by equal
 * amounts: that is the point of the question.
 */
const expmAvgSlider: Generator<StretchParams> = {
  id: 'expm-avg-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const b = rng.pick(hard ? [2, 3] : [2]);
      const h = rng.int(1, hard ? 5 : 4);
      const j = rng.int(1, b === 2 ? 4 : 2);
      const down = hard && rng.chance(0.5);
      const a = down ? rng.int(1, 5) * b ** (j + 1) : rng.int(1, 12);
      const params = { a, b, h, down, j, ctx: rng.int(0, 3) };
      if (!down && a === 1) continue;
      if ((down ? a : a * b ** (j + 2)) > 6000) continue;
      if (!Number.isInteger(stretchRate(params))) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { a, b, h, j, down, ctx } = params;
    const story = storyOf(down, ctx);
    const answer = j * h;
    let lots = j + 3;
    while (defaultSliderValue(0, lots * h, h) === answer) lots += 1;
    const span = lots * h;
    const k = ((down ? -1 : 1) * Math.log(b)) / h;
    const f = (t: number) => a * Math.exp(k * t);
    const top = down ? a * 1.1 : lotsValue(params, j + 2) * 1.1;
    const stretch = h === 1 ? `one-${story.unit}` : `${h}-${story.unit}`;
    const rate = stretchRate(params);
    // One of anything is singular: 1 lumen, 1 gram, 1 person.
    const counted =
      rate !== 1 ? story.of : story.of === 'people' ? 'person' : story.of === 'bacteria' ? 'bacterium' : story.of.replace(/s$/, '');
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, params))} Each dot is $${story.sym}$ ${h === 1 ? `every ${story.unit}` : `every ${h} ${story.unit}s`}. Slide to the start of the ${stretch} stretch over which it ${down ? 'falls' : 'grows'} at an average of ${texNum(rate)} ${counted} per ${story.unit}.`,
        },
      ],
      min: 0,
      max: span,
      step: h,
      answer,
      readout: 't = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: top,
          curves: [{ f: (t) => Math.min(f(t), top * 2) }],
          marks: Array.from({ length: lots + 1 }, (_, i) => ({ x: i * h, y: lotsValue(params, i) })).filter((mark) => mark.y <= top),
          label: `A curve ${down ? 'falling' : 'rising'} from ${a}, with a dot every ${h} units of time`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: (params) => {
    const { b, h, j, down, ctx } = params;
    const { sym, unit } = storyOf(down, ctx);
    const row = (i: number) => {
      const y0 = lotsValue(params, i);
      const y1 = lotsValue(params, i + 1);
      return `t = ${i * h}: \\quad \\frac{${texNum(y1)} - ${texNum(y0)}}{${h}} &= ${texNum((y1 - y0) / h)}`;
    };
    return [
      { text: `$e^{${ktTex(params)}} = ${everyTex(params)}$, so every ${h === 1 ? '' : `${h}-${unit} `}step ${down ? 'divides' : 'multiplies'} $${sym}$ by $${b}$. Work out the average rate over each stretch in turn.` },
      { tex: chain(row(j - 1), row(j)) },
      { text: `So the stretch starts at $t = ${j * h}$. ${down ? 'A decaying model changes fastest early on.' : 'A growing model changes faster the later the stretch.'}` },
    ];
  },
};

/** The average rate over an interval, typed, with the chord drawn. */
const expmAvgRate: Generator<AvgParams> = {
  id: 'expm-avg-rate',
  sample: (rng, difficulty) => sampleAvg(rng, difficulty, difficulty > 1 ? 1 : 0, difficulty > 1),
  choices: (params) => {
    const { h, m1, m2 } = params;
    const y1 = lotsValue(params, m1);
    const y2 = lotsValue(params, m2);
    const avg = avgRate(params);
    return wholeOptions(avg, [y2 - y1, (y2 - y1) / (m2 * h), (y2 + y1) / ((m2 - m1) * h), -avg, (y2 - y1) / (m2 - m1)]);
  },
  render: (params): Slide => {
    const { a, b, h, m1, m2, down, ctx } = params;
    const story = storyOf(down, ctx);
    const t1 = m1 * h;
    const t2 = m2 * h;
    const k = ((down ? -1 : 1) * Math.log(b)) / h;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, params))} What is its average rate of change from $t = ${t1}$ to $t = ${t2}$, in ${story.of} per ${story.unit}? The dashed chord joins those two points.`,
        },
        chordFigure(
          (t) => a * Math.exp(k * t),
          t1,
          t2,
          t2 + Math.max(h, 2),
          `A curve ${down ? 'falling' : 'rising'} from ${a}, with a dashed chord from t = ${t1} to t = ${t2}`,
        ),
      ],
      lead: '\\text{average rate} =',
      keypad: [],
      answer: String(avgRate(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: avgSolution,
};

/** Whole-number options that may be negative: the answer, then the slips. */
function wholeOptions(correct: number, slips: number[]): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of slips) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  const unit = Math.max(1, Math.round(Math.abs(correct) / 10));
  for (let step = 1; picked.length < 3; step += 1) {
    for (const candidate of [correct + step * unit, correct - step * unit]) {
      if (picked.length === 3 || seen.has(candidate)) continue;
      seen.add(candidate);
      picked.push(candidate);
    }
  }
  return options(
    { tex: texNum(correct), answer: String(correct) },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: texNum(value), answer: String(value) })),
  );
}

interface CompareParams extends Rate {
  a: number;
  /** Each stretch as [start, end] in lots of h. */
  first: [number, number];
  second: [number, number];
  ctx: number;
}

function stretchAverage(params: CompareParams, [from, to]: [number, number]): number {
  return (lotsValue(params, to) - lotsValue(params, from)) / ((to - from) * params.h);
}

/**
 * Which of two stretches changes faster on average. Equal lengths at
 * difficulty 1, where the shape of the curve decides it; different lengths at
 * difficulty 2, where it has to be worked out.
 */
const expmAvgCompare: Generator<CompareParams> = {
  id: 'expm-avg-compare',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const b = rng.pick(hard ? [2, 3] : [2]);
      const top = b === 2 ? 5 : 3;
      const h = rng.int(1, 4);
      const down = rng.chance(0.5);
      let first: [number, number];
      let second: [number, number];
      if (!hard) {
        const length = rng.int(1, 2);
        const s1 = rng.int(0, top - length - 1);
        const s2 = rng.int(s1 + 1, top - length);
        first = [s1, s1 + length];
        second = [s2, s2 + length];
      } else {
        const p1 = rng.int(0, top - 1);
        first = [p1, rng.int(p1 + 1, top)];
        const p2 = rng.int(0, top - 1);
        second = [p2, rng.int(p2 + 1, top)];
        if (second[0] < first[0] || (second[0] === first[0] && second[1] <= first[1])) continue;
        if (second[1] - second[0] === first[1] - first[0]) continue;
      }
      const end = Math.max(first[1], second[1]);
      const a = down ? rng.int(1, 4) * b ** end : rng.int(2, 12);
      const params = { a, b, h, down, first, second, ctx: rng.int(0, 3) };
      if ((down ? a : a * b ** end) > 5000) continue;
      const one = stretchAverage(params, first);
      const two = stretchAverage(params, second);
      if (!Number.isInteger(one) || !Number.isInteger(two) || Math.abs(one) === Math.abs(two)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { a, h, first, second, down, ctx } = params;
    const story = storyOf(down, ctx);
    const span = ([from, to]: [number, number]) => `t = ${from * h} \\text{ to } t = ${to * h}`;
    const faster = Math.abs(stretchAverage(params, first)) > Math.abs(stretchAverage(params, second)) ? 'first' : 'second';
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, params))} Over which of these does $${story.sym}$ change faster, on average?`,
        },
      ],
      options: [
        { id: 'first', label: span(first), tex: true },
        { id: 'second', label: span(second), tex: true },
        { id: 'same', label: 'Both at the same average rate' },
      ],
      correctId: faster,
    };
  },
  solution: (params) => {
    const { h, first, second, down, ctx } = params;
    const { sym } = storyOf(down, ctx);
    const line = (stretch: [number, number]) => {
      const [from, to] = stretch;
      return `\\frac{${texNum(lotsValue(params, to))} - ${texNum(lotsValue(params, from))}}{${to * h} - ${from * h}} &= ${texNum(stretchAverage(params, stretch))}`;
    };
    return [
      { text: `$e^{${ktTex(params)}} = ${everyTex(params)}$. Work out $${sym}$ at each end, then each average rate.` },
      { tex: chain(line(first), line(second)) },
      {
        text: down
          ? 'A decaying model flattens out, so the size of its rate is what counts: the bigger size changes faster.'
          : 'A growing model gets steeper, so a later stretch tends to change faster; a longer one can still average less.',
      },
    ];
  },
};

/* ---------- Level 3, lesson 3: average against instantaneous ---------- */

interface InstantParams extends Rate {
  a: number;
  /** The moment is t = m × h, where the model is a whole power of b from its start. */
  m: number;
  ctx: number;
}

/**
 * A model and a moment at which its rate, (ln b / h) times the value, is a
 * whole multiple of ln b: the value is drawn first and made to divide by h.
 */
function sampleInstant(rng: Rng, difficulty: number, minM = 1): InstantParams {
  for (;;) {
    const hard = difficulty > 1;
    const b = rng.pick(hard ? [2, 3] : [2]);
    const h = rng.int(1, hard ? 8 : 6);
    const m = rng.int(minM, b === 2 ? 4 : 3);
    const down = hard && rng.chance(0.5);
    const a = down ? rng.int(1, 8) * b ** m : rng.int(2, 15);
    const params = { a, b, h, m, down, ctx: rng.int(0, 3) };
    const y = lotsValue(params, m);
    if (y % h !== 0 || (down ? a : y) > 5000) continue;
    return params;
  }
}

/** c ln b as the learner reads it: \ln 2, 64\ln 2, -\ln 3. */
function lnTex(c: number, b: number): string {
  if (c === 1) return `\\ln ${b}`;
  if (c === -1) return `-\\ln ${b}`;
  return `${texNum(c)}\\ln ${b}`;
}

/** (n ln b) / h, as a whole multiple of ln b where it divides. */
function lnOver(n: number, b: number, h: number): string {
  if (n % h === 0) return lnTex(n / h, b);
  return `${n < 0 ? '-' : ''}\\frac{${lnTex(Math.abs(n), b)}}{${h}}`;
}

/** The signed whole multiple of ln b that the rate comes to at t = m × h. */
function instantC(params: InstantParams): number {
  return ((params.down ? -1 : 1) * lotsValue(params, params.m)) / params.h;
}

function instantSolution(params: InstantParams): SolutionStep[] {
  const { b, m, down, ctx } = params;
  const { sym } = storyOf(down, ctx);
  const y = lotsValue(params, m);
  return [
    { text: `The rate is $k${sym}$: $k = ${kTex(params)}$ times the amount at that moment.` },
    {
      tex: chain(
        lotsLine(params, m, sym),
        `\\frac{d${sym}}{dt} &= ${kTex(params)} \\times ${texNum(y)} = ${lnTex(instantC(params), b)}`,
      ),
    },
    { text: `Leave $\\ln ${b}$ as it is: that keeps the rate exact, where any decimal for it is rounded.` },
  ];
}

/** The exact rate at a moment, typed with the ln key. */
const expmInstant: Generator<InstantParams> = {
  id: 'expm-instant',
  sample: (rng, difficulty) => sampleInstant(rng, difficulty),
  choices: (params) => {
    const { a, b, h, m, down } = params;
    const s = down ? -1 : 1;
    const c = instantC(params);
    const y = lotsValue(params, m);
    const start =
      a % h === 0
        ? { tex: lnTex((s * a) / h, b), answer: `${(s * a) / h}*log(${b})` }
        : { tex: `${down ? '-' : ''}\\frac{${a}\\ln ${b}}{${h}}`, answer: `${s * a}*log(${b})/${h}` };
    return options(
      { tex: lnTex(c, b), answer: `${c}*log(${b})` },
      { tex: texNum(c), answer: String(c) },
      h === 1 ? { tex: lnTex(-c, b), answer: `${-c}*log(${b})` } : { tex: lnTex(s * y, b), answer: `${s * y}*log(${b})` },
      start,
    );
  },
  render: (params): Slide => {
    const { a, b, h, m, down, ctx } = params;
    const story = storyOf(down, ctx);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, params))} Find the exact rate at which it is changing at $t = ${m * h}$, in terms of $\\ln ${b}$.`,
        },
      ],
      lead: `\\frac{d${story.sym}}{dt} =`,
      keypad: LN_KEYS,
      answer: `${instantC(params)}*log(${b})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: instantSolution,
};

/** The rate at a moment built as k times the value there, then the exact product. */
const expmInstantTiles: Generator<InstantParams> = {
  id: 'expm-instant-tiles',
  sample: (rng, difficulty) => sampleInstant(rng, difficulty),
  render: (params): Slide => {
    const { a, b, h, m, down, ctx } = params;
    const story = storyOf(down, ctx);
    const y = lotsValue(params, m);
    const c = instantC(params);
    const answer = [kTex(params), texNum(y), lnTex(c, b)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, params))} Build its rate of change at $t = ${m * h}$: $k$, times $${story.sym}$ at that moment, then the exact rate.`,
        },
      ],
      template: `\\frac{d${story.sym}}{dt} = {0} \\times {1} = {2}`,
      bank: fillBank(answer, [
        kTex({ ...params, down: !down }),
        h === 1 ? `\\frac{1}{\\ln ${b}}` : `\\frac{${h}}{\\ln ${b}}`,
        texNum(a),
        lnTex((down ? -1 : 1) * y, b),
        texNum(c),
      ]),
      answer,
    };
  },
  solution: instantSolution,
};

interface CurveParams {
  a: number;
  /** The rate as a percentage: k = p / 100. */
  p: number;
  down: boolean;
  t1: number;
  t2: number;
  atEnd: boolean;
  ctx: number;
}

/**
 * The chord against the tangent, one fork at a time: which way the model
 * goes, whether its curve steepens, and so how the rate at one end of a
 * stretch compares with the average over it.
 */
const expmRateCompareFlow: Generator<CurveParams> = {
  id: 'expm-rate-compare-flow',
  sample: (rng, difficulty) => {
    const t1 = rng.int(0, 4);
    return {
      a: rng.pick(READ_STARTS),
      p: rng.pick([5, 10, 15, 20, 25, 30]),
      down: rng.chance(0.5),
      t1,
      t2: t1 + rng.int(2, 6),
      atEnd: difficulty === 1 || rng.chance(0.5),
      ctx: rng.int(0, 3),
    };
  },
  render: ({ a, p, down, t1, t2, atEnd, ctx }): Slide => {
    const story = storyOf(down, ctx);
    const model = decimalModel(a, p / 100, down);
    const k = ((down ? -1 : 1) * p) / 100;
    const at = atEnd ? t2 : t1;
    const where = `So at $t = ${at}$, the ${atEnd ? 'end' : 'start'} of the stretch from $t = ${t1}$ to $t = ${t2}$, is it changing faster or slower than its average rate over the stretch?`;
    const compare = (curveSteepens: boolean) =>
      [
        {
          label: 'Faster',
          outcome: curveSteepens === atEnd ? 'There the curve is steeper than the chord joining the ends of the stretch.' : 'That would need the curve steeper there than the chord.',
        },
        {
          label: 'Slower',
          outcome: curveSteepens === atEnd ? 'That would need the curve shallower there than the chord.' : 'There the curve is shallower than the chord joining the ends of the stretch.',
        },
        { label: 'At the same rate', outcome: 'An exponential never runs straight, so its chord and its curve part company at the ends.' },
      ];
    const expected = down !== atEnd ? 'Faster' : 'Slower';
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, model)} The dashed chord joins $t = ${t1}$ and $t = ${t2}$. Compare its rate at one end with the average.`,
        },
        chordFigure(
          (t) => a * Math.exp(k * t),
          t1,
          t2,
          t2 + 2,
          `A curve ${down ? 'falling' : 'rising'} from ${a}, with a dashed chord from t = ${t1} to t = ${t2}`,
        ),
      ],
      subject: `${story.sym} = ${model}`,
      steps: [
        {
          id: 'dir',
          ask: 'Is the model growing or decaying?',
          branches: [
            { label: 'Growing', to: 'growSteep' },
            { label: 'Decaying', to: 'decaySteep' },
          ],
        },
        {
          id: 'growSteep',
          ask: 'As $t$ increases, does its curve get steeper or shallower?',
          branches: [
            { label: 'Steeper', to: 'growWhere' },
            { label: 'Shallower', outcome: 'A growing exponential never flattens: its rate is $k$ times an amount that keeps rising.' },
          ],
        },
        {
          id: 'decaySteep',
          ask: 'As $t$ increases, does its curve get steeper or shallower?',
          branches: [
            { label: 'Steeper', outcome: 'A decaying exponential never steepens: its rate is $k$ times an amount that keeps shrinking.' },
            { label: 'Shallower', to: 'decayWhere' },
          ],
        },
        { id: 'growWhere', ask: where, branches: compare(true) },
        { id: 'decayWhere', ask: where, branches: compare(false) },
      ],
      answer: [down ? 'Decaying' : 'Growing', down ? 'Shallower' : 'Steeper', expected],
    };
  },
  solution: ({ a, p, down, t1, t2, atEnd, ctx }) => {
    const { sym } = storyOf(down, ctx);
    const k = ((down ? -1 : 1) * p) / 100;
    const f = (t: number) => a * Math.exp(k * t);
    const avg = (f(t2) - f(t1)) / (t2 - t1);
    const at = atEnd ? t2 : t1;
    const rate = k * f(at);
    return [
      {
        text: down
          ? `It decays, so its rate $k${sym}$ shrinks in size as $${sym}$ does: the curve flattens.`
          : `It grows, so its rate $k${sym}$ rises with $${sym}$: the curve steepens.`,
      },
      {
        text: `The average over the stretch is the chord's gradient, about $${dec(Number(avg.toFixed(1)))}$. At $t = ${at}$ the rate is about $${dec(Number(rate.toFixed(1)))}$, so it is changing ${down !== atEnd ? 'faster' : 'slower'} there.`,
      },
    ];
  },
};

type WhichAsk = 'average' | 'instant';

type WhichParams = AvgParams & { ask: WhichAsk; atStart: boolean };

/** Which calculation a question about the rate calls for: a chord, or k times the value. */
const expmWhichRate: Generator<WhichParams> = {
  id: 'expm-which-rate',
  sample: (rng, difficulty) => {
    const base = sampleAvg(rng, difficulty, difficulty > 1 ? 1 : 0, difficulty > 1);
    return { ...base, ask: rng.pick(['average', 'instant'] as const), atStart: difficulty > 1 && rng.chance(0.5) };
  },
  render: (params): Slide => {
    const { a, h, m1, m2, down, ctx, ask, atStart } = params;
    const story = storyOf(down, ctx);
    const t1 = m1 * h;
    const t2 = m2 * h;
    const y1 = texNum(lotsValue(params, m1));
    const y2 = texNum(lotsValue(params, m2));
    const ing = down ? 'falling' : 'growing';
    const question =
      ask === 'average'
        ? `On average, how fast was it ${ing} per ${story.unit} between $t = ${t1}$ and $t = ${t2}$?`
        : `How fast is it ${ing} at the moment $t = ${atStart ? t1 : t2}$?`;
    const labels = {
      average: `\\frac{${y2} - ${y1}}{${t2} - ${t1}}`,
      end: `${kTex(params)} \\times ${y2}`,
      start: `${kTex(params)} \\times ${y1}`,
      ratio: `\\frac{${y2}}{${t2}}`,
    };
    const right = ask === 'average' ? labels.average : atStart ? labels.start : labels.end;
    const all = [labels.average, labels.end, labels.start, labels.ratio];
    const ordered = turned(all, `${all.join('|')}-${ask}-${atStart}`);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, params))} ${question} Which calculation answers that?`,
        },
      ],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
      correctId: `opt${ordered.indexOf(right)}`,
    };
  },
  solution: (params) => {
    const { h, m1, m2, ask, atStart, down, ctx } = params;
    const { sym } = storyOf(down, ctx);
    if (ask === 'average') {
      return [
        { text: 'An average over a stretch is the change divided by the time: the gradient of the chord.' },
        { tex: `\\frac{${texNum(lotsValue(params, m2))} - ${texNum(lotsValue(params, m1))}}{${m2 * h} - ${m1 * h}} = ${texNum(avgRate(params))}` },
      ];
    }
    const m = atStart ? m1 : m2;
    return [
      { text: `How fast at one moment is the rate there, $k${sym}$, using $${sym}$ at that moment: the gradient of the tangent.` },
      { tex: `${kTex(params)} \\times ${texNum(lotsValue(params, m))} = ${lnOver((down ? -1 : 1) * lotsValue(params, m), params.b, h)}` },
    ];
  },
};

/* ---------- Level 3, lesson 4: from the rate back ---------- */

interface KFromParams {
  v: number;
  p: number;
  down: boolean;
  ctx: number;
}

/** k from a rate and the amount at that moment. */
const expmKFromRate: Generator<KFromParams> = {
  id: 'expm-k-from-rate',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const p = rng.pick(hard ? [2, 3, 4, 5, 8, 10, ...HALF_PERCENTS] : [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]);
      const v = rng.pick(RATE_AT_VALUES);
      if (!Number.isInteger((v * p) / 100)) continue;
      return { v, p, down: hard && rng.chance(0.5), ctx: rng.int(0, 3) };
    }
  },
  choices: ({ v, p, down }) => {
    const s = down ? -1 : 1;
    const k = (s * p) / 100;
    return decimalOptions(k, [s * p, (s * v) / ((v * p) / 100), -k]);
  },
  render: ({ v, p, down, ctx }): Slide => {
    const story = storyOf(down, ctx);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} is modelled by $${story.sym} = Ae^{kt}$, with $t$ in ${story.unit}s. At the moment $${story.sym} = ${texNum(v)}$, it is ${down ? 'falling' : 'growing'} at ${texNum((v * p) / 100)} ${story.of} per ${story.unit}. What is $k$?`,
        },
      ],
      lead: 'k =',
      keypad: [],
      answer: dec(((down ? -1 : 1) * p) / 100),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ v, p, down, ctx }) => {
    const { sym } = storyOf(down, ctx);
    const r = ((down ? -1 : 1) * v * p) / 100;
    return [
      { text: `The rate is $\\frac{d${sym}}{dt} = k${sym}$, so $k$ is the rate divided by the amount at that moment.` },
      { tex: `k = \\frac{${texNum(r)}}{${texNum(v)}} = ${dec(r / v)}` },
      { text: `That is ${dec(p)}% of the amount per unit of time, ${down ? 'negative because it is falling' : 'positive because it is growing'}.` },
    ];
  },
};

type AmountParams = InstantParams & { lnForm: boolean; p: number; v: number };

/**
 * The amount at a moment from the rate there and k: rate divided by k. With a
 * decimal k at difficulty 1; at difficulty 2, often with k = (ln b)/h and the
 * rate a multiple of ln b.
 */
const expmAmountFromRate: Generator<AmountParams> = {
  id: 'expm-amount-from-rate',
  sample: (rng, difficulty) => {
    const instant = sampleInstant(rng, difficulty);
    const lnForm = difficulty > 1 && rng.chance(0.6);
    for (;;) {
      const p = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 40]);
      const v = rng.pick(RATE_AT_VALUES);
      if (!Number.isInteger((v * p) / 100)) continue;
      return { ...instant, down: lnForm ? instant.down : difficulty > 1 && rng.chance(0.5), lnForm, p, v };
    }
  },
  choices: (params) => {
    if (params.lnForm) {
      const { a, b, h } = params;
      const c = Math.abs(instantC(params));
      return numberOptions(c * h, [c, c * b * h, a, c * h * h]);
    }
    const { p, v } = params;
    const r = (v * p) / 100;
    return numberOptions(v, [r, v / 10, v * 10, r * p, v + r]);
  },
  render: (params): Slide => {
    const { a, b, p, v, down, ctx, lnForm } = params;
    const story = storyOf(down, ctx);
    const ing = down ? 'falling' : 'growing';
    const text = lnForm
      ? `${opening(story, modelTex(a, params))} At one moment it is ${ing} at $${lnTex(Math.abs(instantC(params)), b)}$ ${story.of} per ${story.unit}. What is $${story.sym}$ at that moment?`
      : `${story.subject} is modelled by $${story.sym} = Ae^{${down ? '-' : ''}${dec(p / 100)}t}$, with $t$ in ${story.unit}s. At one moment it is ${ing} at ${texNum((v * p) / 100)} ${story.of} per ${story.unit}. What is $${story.sym}$ at that moment?`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text }],
      lead: `${story.sym} =`,
      keypad: [],
      answer: String(lnForm ? lotsValue(params, params.m) : v),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { b, h, p, v, down, ctx, lnForm } = params;
    const { sym } = storyOf(down, ctx);
    const steps: SolutionStep[] = [{ text: `The rate is $k${sym}$, so $${sym}$ is the rate divided by $k$. The signs cancel for a fall.` }];
    if (lnForm) {
      const c = Math.abs(instantC(params));
      steps.push({
        tex: chain(`${sym} &= ${lnTex(c, b)} \\div ${h === 1 ? `\\ln ${b}` : `\\frac{\\ln ${b}}{${h}}`}`, `&= ${texNum(c)} \\times ${h} = ${texNum(c * h)}`),
      });
      steps.push({ text: `The $\\ln ${b}$ cancels: that is why the rate was given as a multiple of it.` });
    } else {
      steps.push({ tex: `${sym} = ${texNum((v * p) / 100)} \\div ${dec(p / 100)} = ${texNum(v)}` });
    }
    return steps;
  },
};

/** "e^{kt} = 8" and "e^{kt} = \frac{1}{8}" alike. */
function ratioTex(params: InstantParams): string {
  const power = params.b ** params.m;
  return params.down ? `\\frac{1}{${power}}` : `${power}`;
}

function rateTimeSolution(params: InstantParams): SolutionStep[] {
  const { a, b, h, m, down, ctx } = params;
  const { sym } = storyOf(down, ctx);
  const y = lotsValue(params, m);
  return [
    { text: `The rate is $k${sym}$, so first find $${sym}$ itself: divide the rate by $k = ${kTex(params)}$.` },
    { tex: `${sym} = ${lnTex(instantC(params), b)} \\div ${kTex(params)} = ${texNum(y)}` },
    { text: `Then it is a question of when $${sym}$ reaches $${texNum(y)}$:` },
    {
      tex: chain(
        `e^{${ktTex(params)}} &= ${texNum(y)} \\div ${texNum(a)} = ${ratioTex(params)}`,
        `${ktTex(params)} &= ${down ? '-' : ''}${m}\\ln ${b}`,
        `t &= ${m * h}`,
      ),
    },
  ];
}

/**
 * When the rate reaches a value, solved one step at a time: divide off k,
 * divide off the start, take ln, then t.
 */
const expmRateSolveSteps: Generator<InstantParams> = {
  id: 'expm-rate-solve-steps',
  sample: (rng, difficulty) => sampleInstant(rng, difficulty, 2),
  render: (params): Slide => {
    const { a, b, h, m, down, ctx } = params;
    const story = storyOf(down, ctx);
    const y = lotsValue(params, m);
    const c = instantC(params);
    const model = modelTex(a, params);
    const kt = ktTex(params);
    const ratio = ratioTex(params);
    const minus = down ? '-' : '';
    const power = b ** m;
    const sameLog = (x: number, z: number) => Math.abs(Math.log(x) - Math.log(z)) < 1e-9;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, model)} Find when $\\frac{d${story.sym}}{dt} = ${lnTex(c, b)}$ one step at a time: tap the step to do next, then choose what it gives.`,
        },
      ],
      start: [`${kTex(params)} \\times ${model}`, '=', lnTex(c, b)],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: `${model} = ${texNum(y)}`,
          bank: stepsBank([
            `${model} = ${texNum(y)}`,
            `${model} = ${texNum(Math.abs(c))}`,
            `${model} = ${lnTex(y, b)}`,
            `${model} = ${texNum(Math.abs(c) * b)}`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `e^{${kt}} = ${ratio}`,
          bank: stepsBank([
            `e^{${kt}} = ${ratio}`,
            `e^{${kt}} = ${texNum(Math.abs(y - a))}`,
            `e^{${kt}} = ${texNum(y * a)}`,
            `${kt} = ${ratio}`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `${kt} = ${minus}${m}\\ln ${b}`,
          bank: stepsBank([
            `${kt} = ${minus}${m}\\ln ${b}`,
            ...(sameLog(m ** b, power) ? [] : [`${kt} = ${minus}${b}\\ln ${m}`]),
            `${kt} = ${minus}${m + 1}\\ln ${b}`,
            `${kt} = e^{${power}}`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `t = ${m * h}`,
          bank: stepsBank([`t = ${m * h}`, `t = ${m}`, `t = ${m * h + h}`, `t = ${h}`, `t = ${m * h - 1}`]),
        },
      ],
    };
  },
  solution: rateTimeSolution,
};

/**
 * When the rate reaches a value, as a tree: the amount at that moment, how
 * many times the start it is, that as a power of b, then the time.
 */
const expmRateReachTree: Generator<InstantParams> = {
  id: 'expm-rate-reach-tree',
  sample: (rng, difficulty) => sampleInstant(rng, difficulty, 2),
  render: (params): Slide => {
    const { a, b, h, m, down, ctx } = params;
    const story = storyOf(down, ctx);
    const y = lotsValue(params, m);
    const c = instantC(params);
    const answer = [y, b ** m, m, m * h].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, params))} When is it ${down ? 'falling' : 'growing'} at $${lnTex(Math.abs(c), b)}$ ${story.of} per ${story.unit}? Fill in $${story.sym}$ at that moment, how many times ${down ? 'smaller than the start' : 'the start'} that is, that as a power of $${b}$, then the time.`,
        },
      ],
      expression: `\\frac{d${story.sym}}{dt} = ${kTex(params)} \\times ${story.sym} = ${lnTex(c, b)}`,
      nodes: [
        { id: 'amount', from: [] },
        { id: 'factor', from: ['amount'] },
        { id: 'power', from: ['factor'] },
        { id: 'time', from: ['power'] },
      ],
      bank: treeBank(answer, [String(Math.abs(c)), String(y * b), String(m + 1), String((m + 1) * h), String(b * m)]),
      answer,
    };
  },
  solution: rateTimeSolution,
};

/* ---------- Level 3, lesson 5: two models at the same rate ---------- */

interface TwoStory {
  what: string;
  syms: [string, string];
  unit: string;
}

const TWO_STORIES: TwoStory[] = [
  { what: 'The populations of two towns', syms: ['P', 'Q'], unit: 'year' },
  { what: 'Two cultures of bacteria', syms: ['M', 'N'], unit: 'hour' },
  { what: 'Two savings accounts, in pounds,', syms: ['S', 'V'], unit: 'year' },
  { what: 'The followers of two new accounts', syms: ['F', 'G'], unit: 'week' },
];

interface TwoRatesParams {
  a1: number;
  p1: number;
  a2: number;
  p2: number;
  /** Ask about the long run too, not just t = 0. */
  later: boolean;
  ctx: number;
}

/** Two decimal-k models whose rates at t = 0 differ, and whose k differ. */
function sampleTwoRates(rng: Rng, difficulty: number): TwoRatesParams {
  for (;;) {
    const a1 = rng.pick(READ_STARTS);
    const a2 = rng.pick(READ_STARTS);
    const p1 = rng.pick(READ_PERCENTS);
    const p2 = rng.pick(READ_PERCENTS);
    if (a1 === a2 || p1 === p2 || a1 * p1 === a2 * p2) continue;
    return { a1, p1, a2, p2, later: difficulty > 1, ctx: rng.int(0, 3) };
  }
}

function twoRatesOpening({ a1, p1, a2, p2, ctx }: TwoRatesParams): string {
  const story = TWO_STORIES[ctx % TWO_STORIES.length];
  const [s1, s2] = story.syms;
  return `${story.what} after $t$ ${story.unit}s are $${s1} = ${decimalModel(a1, p1 / 100, false)}$ and $${s2} = ${decimalModel(a2, p2 / 100, false)}$.`;
}

function twoRatesSolution({ a1, p1, a2, p2, ctx }: TwoRatesParams): SolutionStep[] {
  const [s1, s2] = TWO_STORIES[ctx % TWO_STORIES.length].syms;
  const r1 = (a1 * p1) / 100;
  const r2 = (a2 * p2) / 100;
  return [
    { text: 'At $t = 0$ each rate is $k$ times the start:' },
    { tex: chain(`\\frac{d${s1}}{dt} &= ${dec(p1 / 100)} \\times ${texNum(a1)} = ${dec(r1)}`, `\\frac{d${s2}}{dt} &= ${dec(p2 / 100)} \\times ${texNum(a2)} = ${dec(r2)}`) },
    { text: `So $${r1 > r2 ? s1 : s2}$ is growing faster at the start.` },
    {
      text: `In the long run the bigger $k$ wins, whatever the starts: $${p1 > p2 ? s1 : s2}$, with $k = ${dec(Math.max(p1, p2) / 100)}$.`,
    },
  ];
}

/** Which of two models is growing faster at the start, and at difficulty 2 later on too. */
const expmTwoFaster: Generator<TwoRatesParams> = {
  id: 'expm-two-faster',
  sample: sampleTwoRates,
  render: (params): Slide => {
    const { a1, p1, a2, p2, later, ctx } = params;
    const [s1, s2] = TWO_STORIES[ctx % TWO_STORIES.length].syms;
    const start = a1 * p1 > a2 * p2 ? s1 : s2;
    const long = p1 > p2 ? s1 : s2;
    const other = (s: string) => (s === s1 ? s2 : s1);
    let labels: string[];
    let right: string;
    if (!later) {
      right = `${start} is growing faster`;
      labels = [`${s1} is growing faster`, `${s2} is growing faster`, 'They are growing at the same rate'];
    } else {
      right = start === long ? `${start} all the time` : `${start} at first, ${long} later`;
      labels = [`${s1} at first, ${s2} later`, `${s2} at first, ${s1} later`, `${s1} all the time`, `${s2} all the time`];
      // Name the right one first, then turn, so it is not always in one place.
      labels = [right, ...labels.filter((label) => label !== right)];
      labels = turned(labels, `${a1}-${p1}-${a2}-${p2}-${other(start)}`);
    }
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${twoRatesOpening(params)} ${later ? 'Which is growing faster at $t = 0$, and which in the long run?' : 'Which is growing faster at $t = 0$?'}`,
        },
      ],
      options: labels.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${labels.indexOf(right)}`,
    };
  },
  solution: twoRatesSolution,
};

/**
 * Two models compared one fork at a time: faster at the start, bigger k, so
 * faster later, and at difficulty 2 whether their rates are ever equal.
 */
const expmTwoFlow: Generator<TwoRatesParams> = {
  id: 'expm-two-flow',
  sample: sampleTwoRates,
  render: (params): Slide => {
    const { a1, p1, a2, p2, later, ctx } = params;
    const [s1, s2] = TWO_STORIES[ctx % TWO_STORIES.length].syms;
    const start = a1 * p1 > a2 * p2 ? s1 : s2;
    const long = p1 > p2 ? s1 : s2;
    const pair = (to?: string, outcome?: string) =>
      [s1, s2].map((s) => (to ? { label: `$${s}$`, to } : { label: `$${s}$`, outcome: outcome ?? '' }));
    const future = 'An $e^{kt}$ with the bigger $k$ always ends up ahead, however far behind it starts.';
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `${twoRatesOpening(params)} Compare how fast they grow, one question at a time.` }],
      subject: `${s1} \\text{ and } ${s2}`,
      steps: [
        { id: 'zero', ask: 'At $t = 0$ each rate is $k$ times the start. Which is growing faster then?', branches: pair('k') },
        { id: 'k', ask: 'Which has the bigger $k$?', branches: pair('later') },
        {
          id: 'later',
          ask: 'So which is growing faster far into the future?',
          branches: later ? pair('cross') : pair(undefined, future),
        },
        {
          id: 'cross',
          ask: 'Are they ever growing at exactly the same rate?',
          branches: [
            { label: 'Yes, once', outcome: 'The one behind at the start catches up, and at that moment the two rates are equal.' },
            { label: 'Never', outcome: 'One ahead at the start with the bigger $k$ as well stays ahead for good.' },
          ],
        },
      ],
      answer: [`$${start}$`, `$${long}$`, `$${long}$`, ...(later ? [start === long ? 'Never' : 'Yes, once'] : [])],
    };
  },
  solution: (params) => {
    const steps = twoRatesSolution(params);
    if (!params.later) return steps;
    const faster = params.a1 * params.p1 > params.a2 * params.p2;
    const bigger = params.p1 > params.p2;
    steps.push({
      text: faster === bigger ? 'The same one leads at the start and in the long run, so the rates are never equal.' : 'One leads at the start and the other later, so somewhere between, the rates are equal.',
    });
    return steps;
  },
};

interface TwoParams {
  b: number;
  h: number;
  /** The models' k are p × (ln b)/h and q × (ln b)/h, with p = q + 1. */
  p: number;
  q: number;
  /** The start of the model with the bigger k. */
  a1: number;
  /** The rates are equal at t = m × h. */
  m: number;
  /** Whether the model with the bigger k is named first. */
  fastFirst: boolean;
  ctx: number;
}

/** The start of the model with the smaller k: q × a2 = p × a1 × b^m. */
function twoSlowStart({ b, p, q, a1, m }: TwoParams): number {
  return (p * a1 * b ** m) / q;
}

/**
 * Two models whose rates are equal at a whole time. The bigger k starts
 * smaller, so the other is ahead on rate until t = m h, when
 * p a1 b^{ps} = q a2 b^{qs} with s = m.
 */
function sampleTwo(rng: Rng, difficulty: number): TwoParams {
  for (;;) {
    const hard = difficulty > 1;
    const b = rng.pick(hard ? [2, 3] : [2]);
    const [p, q] = hard ? rng.pick([[2, 1], [3, 2]] as const) : [2, 1];
    const h = rng.int(1, hard ? 6 : 4);
    const m = rng.int(1, b === 2 ? 3 : 2);
    const a1 = rng.int(1, 12) * q;
    const params = { b, h, p, q, a1, m, fastFirst: rng.chance(0.5), ctx: rng.int(0, 3) };
    if (a1 < 2 || twoSlowStart(params) > 3000) continue;
    return params;
  }
}

/** c × (ln b)/h as the coefficient of t. */
function twoK(c: number, b: number, h: number): string {
  const top = c === 1 ? `\\ln ${b}` : `${c}\\ln ${b}`;
  return h === 1 ? top : `\\frac{${top}}{${h}}`;
}

function twoModelTex(start: number, c: number, { b, h }: TwoParams): string {
  const power = h === 1 ? `${c === 1 ? '' : c}t\\ln ${b}` : `${twoK(c, b, h)}t`;
  return `${texNum(start)}e^{${power}}`;
}

function twoOpening(params: TwoParams): { text: string; fast: string; slow: string } {
  const { p, q, a1, fastFirst, ctx } = params;
  const story = TWO_STORIES[ctx % TWO_STORIES.length];
  const [s1, s2] = story.syms;
  const fast = fastFirst ? s1 : s2;
  const slow = fastFirst ? s2 : s1;
  const models: Record<string, string> = {
    [fast]: twoModelTex(a1, p, params),
    [slow]: twoModelTex(twoSlowStart(params), q, params),
  };
  return {
    text: `${story.what} after $t$ ${story.unit}s are $${s1} = ${models[s1]}$ and $${s2} = ${models[s2]}$.`,
    fast,
    slow,
  };
}

function twoSolution(params: TwoParams): SolutionStep[] {
  const { b, h, p, q, a1, m } = params;
  const { fast, slow } = twoOpening(params);
  const a2 = twoSlowStart(params);
  const u = h === 1 ? `${b}^{t}` : `${b}^{t/${h}}`;
  const uPow = (n: number) => (n === 1 ? 'u' : `u^{${n}}`);
  return [
    { text: `Write $u = ${u}$, so $${fast} = ${texNum(a1)}${uPow(p)}$ and $${slow} = ${texNum(a2)}${uPow(q)}$.` },
    { text: `Each rate is $k$ times the amount, and both $k$ are whole multiples of $${twoK(1, b, h)}$, which cancels:` },
    {
      tex: chain(`${p} \\times ${texNum(a1)}${uPow(p)} &= ${q} \\times ${texNum(a2)}${uPow(q)}`, `u &= \\frac{${texNum(q * a2)}}{${texNum(p * a1)}} = ${b ** m}`),
    },
    { text: `$${u} = ${b}^{${m}}$, so $t = ${m * h}$. That is when the rates match, not the sizes.` },
  ];
}

/** Slide to the time two models grow at the same rate, over a plot of both. */
const expmTwoSlider: Generator<TwoParams> = {
  id: 'expm-two-slider',
  sample: sampleTwo,
  render: (params): Slide => {
    const { b, h, p, q, a1, m } = params;
    const { text } = twoOpening(params);
    const a2 = twoSlowStart(params);
    const answer = m * h;
    const span = sliderSpan(answer, Math.max(answer + 3, Math.ceil(answer * 1.6)));
    const base = Math.log(b) / h;
    const fastCurve = (t: number) => a1 * Math.exp(p * base * t);
    const slowCurve = (t: number) => a2 * Math.exp(q * base * t);
    const top = slowCurve(answer) * 2;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${text} The curves are their sizes; the coloured one has the bigger $k$. Slide to the time at which they are growing at the same rate.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: 't = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: top,
          curves: [{ f: (t) => Math.min(slowCurve(t), top * 2) }, { f: (t) => Math.min(fastCurve(t), top * 2), accent: true }],
          label: 'Two rising curves, one starting lower and climbing faster',
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: twoSolution,
};

/** The whole time at which two models grow at the same rate, typed. */
const expmTwoEqual: Generator<TwoParams> = {
  id: 'expm-two-equal',
  sample: sampleTwo,
  choices: ({ h, m }) => numberOptions(m * h, [(m + 1) * h, m, h, 2 * m * h]),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `${twoOpening(params).text} At what time are they growing at the same rate?` }],
    lead: 't =',
    keypad: [],
    answer: String(params.m * params.h),
    domain: 'real',
    mode: 'exact',
  }),
  solution: twoSolution,
};

/* ---------- Level 4: comparing models ---------- */

/**
 * Every comparison here writes both models in one power, u = b^{t/h}, with
 * each k a whole multiple (possibly negative) of (ln b)/h. At a whole number
 * of h, u is a whole power of b, so every value is whole; and setting two
 * models equal leaves a power of u equal to a ratio of starts, which is a
 * whole power of b because the starts were built from the answer.
 */

/** u written out: 2^{t} or 2^{t/5}. */
function uTex(b: number, h: number): string {
  return h === 1 ? `${b}^{t}` : `${b}^{t/${h}}`;
}

/** A power of u as it sits beside a start: u, u^{2}, u^{-1}. */
function uPow(n: number): string {
  return n === 1 ? 'u' : `u^{${n}}`;
}

/**
 * A model whose k is c × (ln b)/h, c whole and possibly negative, with the
 * fraction in lowest terms: 40e^{\frac{2\ln 2}{5}t}, but 2 × (ln 2)/4 as
 * \frac{\ln 2}{2}. A fraction left as 2/4 reads as a mistake.
 */
function multModel(a: number, c: number, b: number, h: number): string {
  let top = Math.abs(c);
  let bottom = h;
  for (let d = Math.min(top, bottom); d > 1; d -= 1) {
    if (top % d === 0 && bottom % d === 0) {
      top /= d;
      bottom /= d;
      break;
    }
  }
  const power = bottom === 1 ? `${top === 1 ? '' : top}t\\ln ${b}` : `${twoK(top, b, bottom)}t`;
  return `${texNum(a)}e^{${c < 0 ? '-' : ''}${power}}`;
}

/** a u^c at u = b^j: multiplied by b^{cj}, or divided by it when c is negative. */
function termAt(a: number, c: number, b: number, j: number): number {
  return c < 0 ? a / b ** (-c * j) : a * b ** (c * j);
}

/** The value at t = j × h, worked: P(10) &= 12 \times 2^{4} = 192. */
function termLine(a: number, c: number, b: number, j: number, name: string): string {
  return `${name} &= ${texNum(a)} ${c < 0 ? '\\div' : '\\times'} ${b}^{${Math.abs(c) * j}} = ${texNum(termAt(a, c, b, j))}`;
}

/** "so t/5 = 3 and t = 15", or "so t = 3" when h is 1. */
function timeFrom(m: number, h: number): string {
  return h === 1 ? `so $t = ${m}$` : `so $\\frac{t}{${h}} = ${m}$ and $t = ${m * h}$`;
}

/* ---------- Level 4, lesson 1: which model is ahead ---------- */

interface LeadParams {
  b: number;
  h: number;
  /** The first model is a1 u^{c1}, the second a2 u^{c2}, with u = b^{t/h}. */
  a1: number;
  c1: number;
  a2: number;
  c2: number;
  /** Compared at t = m × h. */
  m: number;
  /** Ask about the start as well as t = m h. */
  both: boolean;
  ctx: number;
}

/**
 * Two models compared at a whole time. The bigger start always has the
 * smaller k, so neither size can be read off the starts alone. At difficulty 2
 * one model may decay, and its start is built to divide out.
 */
function sampleLead(rng: Rng, difficulty: number): LeadParams {
  for (;;) {
    const hard = difficulty > 1;
    const b = hard ? rng.pick([2, 3]) : 2;
    const h = rng.int(1, hard ? 6 : 4);
    const m = rng.int(1, b === 2 ? 3 : 2);
    const ks = hard ? [-2, -1, 1, 2, 3] : [1, 2, 3];
    const c1 = rng.pick(ks);
    const c2 = rng.pick(ks);
    if (c1 === c2) continue;
    const start = (c: number) => (c < 0 ? rng.int(1, 6) * b ** (-c * m) : rng.int(2, hard ? 40 : 30));
    const a1 = start(c1);
    const a2 = start(c2);
    if (a1 === a2 || (a1 - a2) * (c1 - c2) >= 0) continue;
    const p = termAt(a1, c1, b, m);
    const q = termAt(a2, c2, b, m);
    if (p === q || Math.max(a1, a2, p, q) > 4000) continue;
    return { b, h, a1, c1, a2, c2, m, both: hard, ctx: rng.int(0, 3) };
  }
}

function leadSyms({ ctx }: { ctx: number }): [string, string] {
  return TWO_STORIES[ctx % TWO_STORIES.length].syms;
}

function leadOpening(params: LeadParams): string {
  const { b, h, a1, c1, a2, c2, ctx } = params;
  const story = TWO_STORIES[ctx % TWO_STORIES.length];
  const [s1, s2] = story.syms;
  return `${story.what} after $t$ ${story.unit}s are $${s1} = ${multModel(a1, c1, b, h)}$ and $${s2} = ${multModel(a2, c2, b, h)}$.`;
}

function leadValues({ b, a1, c1, a2, c2, m }: LeadParams): [number, number] {
  return [termAt(a1, c1, b, m), termAt(a2, c2, b, m)];
}

function leadSolution(params: LeadParams): SolutionStep[] {
  const { b, h, a1, c1, a2, c2, m } = params;
  const [s1, s2] = leadSyms(params);
  const [p, q] = leadValues(params);
  const t = m * h;
  return [
    {
      text: `With $u = ${uTex(b, h)}$, $${s1} = ${texNum(a1)}${uPow(c1)}$ and $${s2} = ${texNum(a2)}${uPow(c2)}$. At $t = ${t}$, $u = ${b}^{${m}}$.`,
    },
    { tex: chain(termLine(a1, c1, b, m, `${s1}(${t})`), termLine(a2, c2, b, m, `${s2}(${t})`)) },
    {
      text: `So $${p > q ? s1 : s2}$ is ahead by $${texNum(Math.abs(p - q))}$, although $${a1 > a2 ? s1 : s2}$ started bigger.`,
    },
  ];
}

/** Both models at a whole time, and the gap between them, as a tree. */
const expmLeadTree: Generator<LeadParams> = {
  id: 'expm-lead-tree',
  sample: sampleLead,
  render: (params): Slide => {
    const { b, a1, c1, c2, m, h } = params;
    const [s1, s2] = leadSyms(params);
    const [p, q] = leadValues(params);
    const t = m * h;
    const f1 = b ** (Math.abs(c1) * m);
    const f2 = b ** (Math.abs(c2) * m);
    const answer = [f1, p, f2, q, p - q].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${leadOpening(params)} Compare them at $t = ${t}$: fill in the power of $${b}$ on each start, then $${s1}$ and $${s2}$, then $${s1} - ${s2}$ (negative if $${s2}$ is ahead).`,
        },
      ],
      expression: `${s1}(${t}) - ${s2}(${t})`,
      nodes: [
        { id: 'f1', from: [] },
        { id: 'first', from: ['f1'] },
        { id: 'f2', from: [] },
        { id: 'second', from: ['f2'] },
        { id: 'gap', from: ['first', 'second'] },
      ],
      bank: treeBank(answer, [
        String(q - p),
        String(p + q),
        String(termAt(a1, c1, b, m + 1)),
        String(b ** (Math.abs(c1) * m + 1)),
        String(a1 * b * Math.abs(c1) * m),
      ]),
      answer,
    };
  },
  solution: leadSolution,
};

/** Which model is bigger at a whole time, and at difficulty 2 at the start too. */
const expmLeadWhich: Generator<LeadParams> = {
  id: 'expm-lead-which',
  sample: sampleLead,
  render: (params): Slide => {
    const { a1, a2, m, h, both } = params;
    const [s1, s2] = leadSyms(params);
    const [p, q] = leadValues(params);
    const t = m * h;
    const later = p > q ? s1 : s2;
    let labels: string[];
    let right: string;
    if (!both) {
      right = `${later} is bigger`;
      labels = [`${s1} is bigger`, `${s2} is bigger`, 'They are the same size'];
    } else {
      const first = a1 > a2 ? s1 : s2;
      right = first === later ? `${first} both times` : `${first} at the start, ${later} at t = ${t}`;
      labels = [
        right,
        ...[`${s1} at the start, ${s2} at t = ${t}`, `${s2} at the start, ${s1} at t = ${t}`, `${s1} both times`, `${s2} both times`].filter(
          (label) => label !== right,
        ),
      ];
      labels = turned(labels, `${params.a1}-${params.c1}-${params.a2}-${params.c2}-${t}`);
    }
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${leadOpening(params)} ${both ? `Which is bigger at $t = 0$, and which at $t = ${t}$?` : `Which is bigger at $t = ${t}$?`}`,
        },
      ],
      options: labels.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${labels.indexOf(right)}`,
    };
  },
  solution: leadSolution,
};

/** How far ahead the leader is at a whole time, typed. */
const expmLeadGap: Generator<LeadParams> = {
  id: 'expm-lead-gap',
  sample: sampleLead,
  choices: (params) => {
    const [p, q] = leadValues(params);
    const { a1, c1, a2, c2, b, m } = params;
    return numberOptions(Math.abs(p - q), [
      p + q,
      Math.abs(a1 - a2),
      Math.abs(termAt(a1, c1, b, 1) - termAt(a2, c2, b, 1)),
      Math.max(p, q),
      Math.abs(termAt(a1, c1, b, m + 1) - termAt(a2, c2, b, m + 1)),
    ]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `${leadOpening(params)} At $t = ${params.m * params.h}$, how much bigger is the larger of the two?`,
      },
    ],
    lead: '\\text{gap} =',
    keypad: [],
    answer: String(Math.abs(leadValues(params)[0] - leadValues(params)[1])),
    domain: 'real',
    mode: 'exact',
  }),
  solution: leadSolution,
};

interface LeadFlowParams {
  a1: number;
  /** k as a signed percentage: k = p / 100. */
  p1: number;
  a2: number;
  p2: number;
  ctx: number;
}

/** Two decimal-k models; at difficulty 2 one of them may decay. */
function sampleLeadFlow(rng: Rng, difficulty: number): LeadFlowParams {
  for (;;) {
    const a1 = rng.pick(READ_STARTS);
    const a2 = rng.pick(READ_STARTS);
    let p1 = rng.pick(READ_PERCENTS);
    let p2 = rng.pick(READ_PERCENTS);
    if (difficulty > 1 && rng.chance(0.5)) {
      if (rng.chance(0.5)) p1 = -p1;
      else p2 = -p2;
    }
    if (a1 === a2 || p1 === p2) continue;
    return { a1, p1, a2, p2, ctx: rng.int(0, 3) };
  }
}

function signedModel(a: number, p: number, v = 't'): string {
  return decimalModel(a, Math.abs(p) / 100, p < 0, v);
}

/**
 * Start against rate, one fork at a time: which starts bigger, which has the
 * bigger k, so which wins in the long run, and whether the one behind ever
 * draws level.
 */
const expmLeadFlow: Generator<LeadFlowParams> = {
  id: 'expm-lead-flow',
  sample: sampleLeadFlow,
  render: (params): Slide => {
    const { a1, p1, a2, p2, ctx } = params;
    const story = TWO_STORIES[ctx % TWO_STORIES.length];
    const [s1, s2] = story.syms;
    const first = a1 > a2 ? s1 : s2;
    const long = p1 > p2 ? s1 : s2;
    const pair = (to: string) => [s1, s2].map((s) => ({ label: `$${s}$`, to }));
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${story.what} after $t$ ${story.unit}s are $${s1} = ${signedModel(a1, p1)}$ and $${s2} = ${signedModel(a2, p2)}$. Compare their sizes, one question at a time.`,
        },
      ],
      subject: `${s1} \\text{ and } ${s2}`,
      steps: [
        { id: 'start', ask: 'Which is bigger at $t = 0$?', branches: pair('k') },
        { id: 'k', ask: 'Which has the bigger $k$, counting its sign?', branches: pair('long') },
        { id: 'long', ask: 'So which is bigger far into the future?', branches: pair('cross') },
        {
          id: 'cross',
          ask: 'Does the one behind at the start ever draw level?',
          branches: [
            {
              label: 'Yes, once',
              outcome: 'The bigger $k$ always wins in the end. Starting behind, it catches up once and then pulls away.',
            },
            { label: 'Never', outcome: 'Starting ahead with the bigger $k$ as well, it is never caught.' },
          ],
        },
      ],
      answer: [`$${first}$`, `$${long}$`, `$${long}$`, first === long ? 'Never' : 'Yes, once'],
    };
  },
  solution: ({ a1, p1, a2, p2, ctx }) => {
    const [s1, s2] = TWO_STORIES[ctx % TWO_STORIES.length].syms;
    const first = a1 > a2 ? s1 : s2;
    const long = p1 > p2 ? s1 : s2;
    return [
      { text: `At $t = 0$ each model is its start, so $${first}$ is bigger: $${texNum(Math.max(a1, a2))}$ against $${texNum(Math.min(a1, a2))}$.` },
      { text: `$${long}$ has the bigger $k$, $${dec(Math.max(p1, p2) / 100)}$, and the bigger $k$ always ends up ahead, whatever the starts.` },
      {
        text:
          first === long
            ? `$${long}$ is ahead at the start and in the long run, so they never draw level.`
            : `$${first}$ leads at first and $${long}$ later, so they draw level exactly once in between.`,
      },
    ];
  },
};

/* ---------- Level 4, lesson 2: when one overtakes another ---------- */

interface OvertakeParams {
  b: number;
  h: number;
  /** The faster model is a1 u^p, the slower a2 u^q, with u = b^{t/h} and p > q. */
  p: number;
  q: number;
  a1: number;
  /** They are the same size at t = m × h. */
  m: number;
  /** Whether the faster model is named first. */
  fastFirst: boolean;
  ctx: number;
}

/** The slower model's start: a1 u^p = a2 u^q at u = b^m. */
function overtakeSlowStart({ a1, b, p, q, m }: OvertakeParams): number {
  return a1 * b ** ((p - q) * m);
}

function sampleOvertake(rng: Rng, difficulty: number): OvertakeParams {
  for (;;) {
    const hard = difficulty > 1;
    const b = hard ? rng.pick([2, 3]) : 2;
    const [p, q] = hard ? rng.pick([[2, 1], [3, 1], [3, 2]] as const) : ([2, 1] as const);
    const h = rng.int(1, hard ? 6 : 5);
    const m = rng.int(1, b === 2 ? 3 : 2);
    const a1 = rng.int(2, hard ? 15 : 12);
    const params = { b, h, p, q, a1, m, fastFirst: rng.chance(0.5), ctx: rng.int(0, 3) };
    if (overtakeSlowStart(params) > 3000) continue;
    return params;
  }
}

function overtakeOpening(params: OvertakeParams): { text: string; fast: string; slow: string } {
  const { b, h, p, q, a1, fastFirst, ctx } = params;
  const story = TWO_STORIES[ctx % TWO_STORIES.length];
  const [s1, s2] = story.syms;
  const fast = fastFirst ? s1 : s2;
  const slow = fastFirst ? s2 : s1;
  const models: Record<string, string> = {
    [fast]: multModel(a1, p, b, h),
    [slow]: multModel(overtakeSlowStart(params), q, b, h),
  };
  return {
    text: `${story.what} after $t$ ${story.unit}s are $${s1} = ${models[s1]}$ and $${s2} = ${models[s2]}$.`,
    fast,
    slow,
  };
}

function overtakeSolution(params: OvertakeParams): SolutionStep[] {
  const { b, h, p, q, a1, m } = params;
  const { fast, slow } = overtakeOpening(params);
  const a2 = overtakeSlowStart(params);
  const d = p - q;
  const ratio = b ** (d * m);
  return [
    { text: `Write $u = ${uTex(b, h)}$, so $${fast} = ${texNum(a1)}${uPow(p)}$ and $${slow} = ${texNum(a2)}${uPow(q)}$.` },
    { text: `They are the same size when these are equal. Divide both sides by $${texNum(a1)}${uPow(q)}$:` },
    {
      tex: chain(
        `${texNum(a1)}${uPow(p)} &= ${texNum(a2)}${uPow(q)}`,
        `${uPow(d)} &= \\frac{${texNum(a2)}}{${texNum(a1)}} = ${ratio}`,
        ...(d > 1 ? [`u &= ${b ** m} = ${b}^{${m}}`] : []),
      ),
    },
    { text: `$${uTex(b, h)} = ${b}^{${m}}$, ${timeFrom(m, h)}. From then on $${fast}$, with the bigger $k$, is ahead.` },
  ];
}

/** Solve for the time one model catches another, a step at a time. */
const expmOvertakeSteps: Generator<OvertakeParams> = {
  id: 'expm-overtake-steps',
  sample: sampleOvertake,
  render: (params): Slide => {
    const { b, h, p, q, a1, m, fastFirst } = params;
    const a2 = overtakeSlowStart(params);
    const d = p - q;
    const ratio = b ** (d * m);
    const u = uTex(b, h);
    const { text } = overtakeOpening(params);
    const fastSide: [number, number] = [a1, p];
    const slowSide: [number, number] = [a2, q];
    const [left, right] = fastFirst ? [fastSide, slowSide] : [slowSide, fastSide];
    const inU = (x: [number, number], y: [number, number]) => `${texNum(x[0])}${uPow(x[1])} = ${texNum(y[0])}${uPow(y[1])}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${text} Find when they are the same size, one step at a time, with $u = ${u}$.`,
        },
      ],
      start: [multModel(left[0], left[1], b, h), '=', multModel(right[0], right[1], b, h)],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: inU(left, right),
          bank: stepsBank([
            inU(left, right),
            inU([left[0], right[1]], [right[0], left[1]]),
            inU([left[0] * left[1], left[1]], [right[0] * right[1], right[1]]),
            `${uPow(left[1])} = ${uPow(right[1])}`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `${uPow(d)} = ${ratio}`,
          bank: stepsBank([
            `${uPow(d)} = ${ratio}`,
            `${uPow(d)} = \\frac{${texNum(a1)}}{${texNum(a2)}}`,
            `${uPow(d)} = ${texNum(a2 - a1)}`,
            `${uPow(p + q)} = ${ratio}`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `${u} = ${b}^{${m}}`,
          bank: stepsBank([`${u} = ${b}^{${m}}`, `${u} = ${b}^{${d * m}}`, `${u} = ${b}^{${m + 1}}`, `${u} = ${m}^{${b}}`]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `t = ${m * h}`,
          bank: stepsBank([`t = ${m * h}`, `t = ${m}`, `t = ${(m + 1) * h}`, `t = ${h}`, `t = ${m * h + 1}`]),
        },
      ],
    };
  },
  solution: overtakeSolution,
};

/** Each model in terms of u, and the u at which they are level. */
const expmOvertakeTiles: Generator<OvertakeParams> = {
  id: 'expm-overtake-tiles',
  sample: sampleOvertake,
  render: (params): Slide => {
    const { b, h, p, q, a1, m, fastFirst, ctx } = params;
    const a2 = overtakeSlowStart(params);
    const [s1, s2] = TWO_STORIES[ctx % TWO_STORIES.length].syms;
    const fastTok = `${texNum(a1)}${uPow(p)}`;
    const slowTok = `${texNum(a2)}${uPow(q)}`;
    const answer = [fastFirst ? fastTok : slowTok, fastFirst ? slowTok : fastTok, String(b ** m)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${overtakeOpening(params).text} Write each in terms of $u = ${uTex(b, h)}$, then fill in the value of $u$ at which they are the same size.`,
        },
      ],
      template: `${s1} = {0}, \\quad ${s2} = {1}, \\quad u = {2}`,
      bank: fillBank(answer, [
        `${texNum(a1)}${uPow(q)}`,
        `${texNum(a2)}${uPow(p)}`,
        `${texNum(a1 * p)}${uPow(p)}`,
        String(b ** ((p - q) * m)),
        String(m * h),
        String(b ** (m + 1)),
      ]),
      answer,
    };
  },
  solution: overtakeSolution,
};

/** Slide to the time the faster model catches the slower, over a plot of both. */
const expmOvertakeSlider: Generator<OvertakeParams> = {
  id: 'expm-overtake-slider',
  sample: sampleOvertake,
  render: (params): Slide => {
    const { b, h, p, q, a1, m } = params;
    const { text, fast } = overtakeOpening(params);
    const a2 = overtakeSlowStart(params);
    const answer = m * h;
    const span = sliderSpan(answer, Math.max(answer + 3, Math.ceil(answer * 1.6)));
    const base = Math.log(b) / h;
    const fastCurve = (t: number) => a1 * Math.exp(p * base * t);
    const slowCurve = (t: number) => a2 * Math.exp(q * base * t);
    // The two meet halfway up, so the crossing sits in the middle of the picture.
    const top = a1 * b ** (p * m) * 2;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${text} The coloured curve is $${fast}$. Slide to the time at which the two are the same size.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: 't = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: top,
          curves: [{ f: (t) => Math.min(slowCurve(t), top * 2) }, { f: (t) => Math.min(fastCurve(t), top * 2), accent: true }],
          label: 'Two rising curves: the coloured one starts lower and climbs faster, crossing the other',
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: overtakeSolution,
};

/** The whole time at which one model catches another, typed. */
const expmOvertakeTime: Generator<OvertakeParams> = {
  id: 'expm-overtake-time',
  sample: sampleOvertake,
  choices: ({ h, m, p, q }) => numberOptions(m * h, [m, (m + 1) * h, (p - q) * m * h, h, 2 * m * h]),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `${overtakeOpening(params).text} At what time are they the same size?` }],
    lead: 't =',
    keypad: [],
    answer: String(params.m * params.h),
    domain: 'real',
    mode: 'exact',
  }),
  solution: overtakeSolution,
};

/* ---------- Level 4, lesson 3: growth meets decay ---------- */

interface MeetStory {
  /** The rising model's letter, then the falling one's. */
  syms: [string, string];
  /** Names both, opening a sentence. */
  lead: string;
  unit: string;
}

const MEET_STORIES: MeetStory[] = [
  { syms: ['N', 'D'], lead: 'The users $N$ of a new app and $D$ of an old one', unit: 'week' },
  { syms: ['W', 'T'], lead: 'The bacteria $W$ in a warm dish and $T$ in a treated one', unit: 'hour' },
  { syms: ['S', 'R'], lead: 'The monthly sales $S$ of a new phone and $R$ of the one it replaces', unit: 'month' },
  { syms: ['G', 'C'], lead: 'The values in pounds of a growing fund $G$ and of a car $C$ that loses value', unit: 'year' },
];

interface MeetParams {
  b: number;
  h: number;
  /** Rising a u^p against falling a2 u^{-q}, with u = b^{t/h}. */
  p: number;
  q: number;
  a: number;
  /** They meet at t = m × h. */
  m: number;
  /** Whether the picture draws the rising model in colour. */
  accentRise: boolean;
  ctx: number;
}

/** The falling model's start: a u^p = a2 u^{-q} at u = b^m. */
function meetFallStart({ a, b, p, q, m }: MeetParams): number {
  return a * b ** ((p + q) * m);
}

/** The size both are when they meet. */
function meetValue({ a, b, p, m }: MeetParams): number {
  return a * b ** (p * m);
}

function sampleMeet(rng: Rng, difficulty: number): MeetParams {
  for (;;) {
    const hard = difficulty > 1;
    const b = hard ? rng.pick([2, 3]) : 2;
    const [p, q] = hard ? rng.pick([[1, 1], [2, 1], [1, 2]] as const) : ([1, 1] as const);
    const h = rng.int(1, hard ? 6 : 5);
    const m = rng.int(1, b === 2 ? 3 : 2);
    const a = rng.int(2, hard ? 30 : 25);
    const params = { b, h, p, q, a, m, accentRise: rng.chance(0.5), ctx: rng.int(0, 3) };
    if (meetFallStart(params) > 4000) continue;
    return params;
  }
}

function meetOpening(params: MeetParams): string {
  const { b, h, p, q, a, ctx } = params;
  const story = MEET_STORIES[ctx % MEET_STORIES.length];
  const [rise, fall] = story.syms;
  return `${story.lead} after $t$ ${story.unit}s are $${rise} = ${multModel(a, p, b, h)}$ and $${fall} = ${multModel(meetFallStart(params), -q, b, h)}$.`;
}

function meetSolution(params: MeetParams): SolutionStep[] {
  const { b, h, p, q, a, m } = params;
  const [rise, fall] = MEET_STORIES[params.ctx % MEET_STORIES.length].syms;
  const a2 = meetFallStart(params);
  return [
    {
      text: `Write $u = ${uTex(b, h)}$, so $${rise} = ${texNum(a)}${uPow(p)}$ and $${fall} = \\frac{${texNum(a2)}}{${uPow(q)}}$. Set them equal and multiply by $${uPow(q)}$: the powers add.`,
    },
    {
      tex: chain(
        `${texNum(a)}${uPow(p + q)} &= ${texNum(a2)}`,
        `${uPow(p + q)} &= \\frac{${texNum(a2)}}{${texNum(a)}} = ${b ** ((p + q) * m)}`,
        `u &= ${b}^{${m}}`,
      ),
    },
    { text: `$${uTex(b, h)} = ${b}^{${m}}$, ${timeFrom(m, h)}. Both are $${texNum(meetValue(params))}$ then.` },
  ];
}

/** The picture both meet-time questions share: rising against falling, clipped to show the crossing. */
function meetWindow(params: MeetParams): { top: number; rise: (t: number) => number; fall: (t: number) => number } {
  const { b, h, p, q, a } = params;
  const base = Math.log(b) / h;
  const a2 = meetFallStart(params);
  // Never so tall that the crossing is squashed against the axis.
  const top = Math.min(a2 * 1.1, meetValue(params) * 3);
  return {
    top,
    rise: (t) => Math.min(a * Math.exp(p * base * t), top * 2),
    fall: (t) => Math.min(a2 * Math.exp(-q * base * t), top * 2),
  };
}

/** Where a rising and a falling model meet, as a tree: the ratio, u, then the time and the size. */
const expmMeetTree: Generator<MeetParams> = {
  id: 'expm-meet-tree',
  sample: sampleMeet,
  render: (params): Slide => {
    const { b, h, p, q, a, m } = params;
    const a2 = meetFallStart(params);
    const ratio = b ** ((p + q) * m);
    const answer = [ratio, b ** m, m * h, meetValue(params)].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${meetOpening(params)} With $u = ${uTex(b, h)}$ they meet when $${uPow(p + q)} = \\frac{${texNum(a2)}}{${texNum(a)}}$. Fill in that fraction, $u$, the time they meet, then the size both are then.`,
        },
      ],
      expression: `${uPow(p + q)} = \\frac{${texNum(a2)}}{${texNum(a)}}`,
      nodes: [
        { id: 'ratio', from: [] },
        { id: 'u', from: ['ratio'] },
        { id: 'time', from: ['u'] },
        { id: 'size', from: ['u'] },
      ],
      bank: treeBank(answer, [
        String(a2 - a),
        String(b ** (m + 1)),
        String(m),
        String((p + q) * m * h),
        String(a * b ** (p * m + 1)),
      ]),
      answer,
    };
  },
  solution: meetSolution,
};

/** Slide to the time a rising and a falling model meet. */
const expmMeetSlider: Generator<MeetParams> = {
  id: 'expm-meet-slider',
  sample: sampleMeet,
  render: (params): Slide => {
    const { m, h, ctx } = params;
    const [rise] = MEET_STORIES[ctx % MEET_STORIES.length].syms;
    const answer = m * h;
    const span = sliderSpan(answer, Math.max(answer + 3, Math.ceil(answer * 1.7)));
    const { top, rise: up, fall } = meetWindow(params);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${meetOpening(params)} The coloured curve is $${rise}$. Slide to the time at which they meet.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: 't = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: top,
          curves: [{ f: fall }, { f: up, accent: true }],
          label: 'A falling curve and a coloured rising curve that cross',
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: meetSolution,
};

/** The whole time a rising and a falling model meet, typed. */
const expmMeetTime: Generator<MeetParams> = {
  id: 'expm-meet-time',
  sample: sampleMeet,
  choices: ({ m, h, p, q }) => numberOptions(m * h, [(p + q) * m * h, m, (m + 1) * h, h, m * h + 1]),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `${meetOpening(params)} When do they meet?` }],
    lead: 't =',
    keypad: [],
    answer: String(params.m * params.h),
    domain: 'real',
    mode: 'exact',
  }),
  solution: meetSolution,
};

/** Which model is the coloured curve, and when they meet, from a picture. */
const expmMeetWhich: Generator<MeetParams> = {
  id: 'expm-meet-which',
  sample: sampleMeet,
  render: (params): Slide => {
    const { a, b, h, p, q, m, accentRise, ctx } = params;
    const [rise, fall] = MEET_STORIES[ctx % MEET_STORIES.length].syms;
    const t = m * h;
    const slip = (p + q) * m * h;
    const span = Math.max(t + 3, Math.ceil(t * 1.8));
    const { top, rise: up, fall: down } = meetWindow(params);
    const coloured = accentRise ? rise : fall;
    const label = (sym: string, when: number) => `${sym} is coloured; they meet at t = ${when}`;
    const right = label(coloured, t);
    const labels = turned([label(rise, t), label(fall, t), label(rise, slip), label(fall, slip)], `${a}-${b}-${h}-${p}-${q}-${m}`);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${meetOpening(params)} They meet at the ringed point. Which is the coloured curve, and when do they meet?`,
        },
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: 0,
            xMax: span,
            yMin: 0,
            yMax: top,
            curves: [
              { f: accentRise ? down : up },
              { f: accentRise ? up : down, accent: true },
            ],
            marks: [{ x: t, y: meetValue(params) }],
            label: `A rising and a falling curve crossing at a ringed point; the ${accentRise ? 'rising' : 'falling'} one is coloured`,
          }),
        },
      ],
      options: labels.map((text, idx) => ({ id: `opt${idx}`, label: text })),
      correctId: `opt${labels.indexOf(right)}`,
    };
  },
  solution: (params) => {
    const [rise, fall] = MEET_STORIES[params.ctx % MEET_STORIES.length].syms;
    return [
      {
        text: `$${rise}$ has a positive $k$, so it is the rising curve; $${fall}$ has a negative $k$ and falls. The coloured curve ${params.accentRise ? 'rises' : 'falls'}, so it is $${params.accentRise ? rise : fall}$.`,
      },
      ...meetSolution(params),
    ];
  },
};

/* ---------- Level 4, lesson 4: sums of exponentials ---------- */

const SUM_STORIES: Story[] = [
  { sym: 'N', subject: 'The number of insects in a greenhouse', unit: 'week', of: 'insects' },
  { sym: 'P', subject: 'The population of an island', unit: 'year', of: 'people' },
  { sym: 'V', subject: 'The value of a portfolio, in pounds,', unit: 'year', of: 'pounds' },
  { sym: 'C', subject: 'The number of cells in a sample', unit: 'hour', of: 'cells' },
];

interface SumParams {
  b: number;
  h: number;
  /** N = a1 u^{c1} + a2 u^{c2}, with u = b^{t/h} and c1 ≠ c2, neither 0. */
  a1: number;
  c1: number;
  a2: number;
  c2: number;
  /** Evaluated at t = j × h. */
  j: number;
  ctx: number;
}

/**
 * A sum of two exponentials, whole at t = j h. At difficulty 1 one term grows
 * and one decays; at difficulty 2 both may grow or both decay, which is where
 * "the bigger k wins" has to be applied with its sign.
 */
function sampleSum(rng: Rng, difficulty: number): SumParams {
  for (;;) {
    const hard = difficulty > 1;
    const b = hard ? rng.pick([2, 3]) : 2;
    const h = rng.int(1, hard ? 6 : 5);
    const j = rng.int(1, b === 2 ? 3 : 2);
    const pairs: [number, number][] = hard
      ? [[1, -1], [2, -1], [1, -2], [1, 2], [1, 3], [-1, -2], [-1, -3]]
      : [[1, -1]];
    let [c1, c2] = rng.pick(pairs);
    if (rng.chance(0.5)) [c1, c2] = [c2, c1];
    const start = (c: number) => (c < 0 ? rng.int(1, 8) * b ** (-c * j) : rng.int(2, hard ? 30 : 20));
    const a1 = start(c1);
    const a2 = start(c2);
    const params = { b, h, a1, c1, a2, c2, j, ctx: rng.int(0, 3) };
    if (a1 === a2) continue;
    if (Math.max(a1, a2, sumValue(params)) > 4000) continue;
    return params;
  }
}

function sumValue({ b, a1, c1, a2, c2, j }: SumParams): number {
  return termAt(a1, c1, b, j) + termAt(a2, c2, b, j);
}

function sumModel({ b, h, a1, c1, a2, c2 }: SumParams): string {
  return `${multModel(a1, c1, b, h)} + ${multModel(a2, c2, b, h)}`;
}

function sumStory({ ctx }: SumParams): Story {
  return SUM_STORIES[ctx % SUM_STORIES.length];
}

function sumOpening(params: SumParams): string {
  return opening(sumStory(params), sumModel(params));
}

function sumSolution(params: SumParams): SolutionStep[] {
  const { b, h, a1, c1, a2, c2, j } = params;
  const { sym } = sumStory(params);
  const t = j * h;
  const win = c1 > c2 ? multModel(a1, c1, b, h) : multModel(a2, c2, b, h);
  return [
    { text: `At $t = 0$ both powers are $e^{0} = 1$, so $${sym}(0) = ${texNum(a1)} + ${texNum(a2)} = ${texNum(a1 + a2)}$.` },
    { text: `At $t = ${t}$, $u = ${uTex(b, h)} = ${b}^{${j}}$, so each term is its start multiplied or divided by a power of $${b}$:` },
    {
      tex: chain(
        termLine(a1, c1, b, j, `${texNum(a1)}${uPow(c1)}`),
        termLine(a2, c2, b, j, `${texNum(a2)}${uPow(c2)}`),
        `${sym}(${t}) &= ${texNum(termAt(a1, c1, b, j))} + ${texNum(termAt(a2, c2, b, j))} = ${texNum(sumValue(params))}`,
      ),
    },
    {
      text: `In the long run the term with the bigger $k$, sign included, wins: $${sym} \\approx ${win}$, so it ${Math.max(c1, c2) > 0 ? 'grows without limit' : 'falls towards $0$'}.`,
    },
  ];
}

/** The start and the long-run term of a sum, from tiles. */
const expmSumTiles: Generator<SumParams> = {
  id: 'expm-sum-tiles',
  sample: sampleSum,
  render: (params): Slide => {
    const { b, h, a1, c1, a2, c2 } = params;
    const { sym } = sumStory(params);
    const t1 = multModel(a1, c1, b, h);
    const t2 = multModel(a2, c2, b, h);
    const [win, lose] = c1 > c2 ? [t1, t2] : [t2, t1];
    const winC = Math.max(c1, c2);
    const answer = [String(a1 + a2), win];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${sumOpening(params)} Fill in its value at the start, and the one term it is close to once $t$ is large.`,
        },
      ],
      template: `${sym}(0) = {0}, \\quad ${sym} \\approx {1}`,
      bank: fillBank(answer, [
        String(Math.max(a1, a2)),
        String(a1 * a2),
        String(Math.abs(a1 - a2)),
        lose,
        multModel(a1 + a2, winC, b, h),
      ]),
      answer,
    };
  },
  solution: sumSolution,
};

interface SumFlowParams {
  a1: number;
  /** Signed percentages: k = p / 100. */
  p1: number;
  a2: number;
  p2: number;
  ctx: number;
}

function sampleSumFlow(rng: Rng, difficulty: number): SumFlowParams {
  for (;;) {
    const a1 = rng.pick(READ_STARTS);
    const a2 = rng.pick(READ_STARTS);
    let p1 = rng.pick(READ_PERCENTS);
    let p2 = -rng.pick(READ_PERCENTS);
    if (difficulty > 1) {
      const kind = rng.int(0, 2);
      if (kind === 1) p2 = -p2;
      if (kind === 2) p1 = -p1;
    }
    if (rng.chance(0.5)) [p1, p2] = [p2, p1];
    if (a1 === a2 || p1 === p2) continue;
    return { a1, p1, a2, p2, ctx: rng.int(0, 3) };
  }
}

/** What a sum does: the start, the term that wins, then where the whole thing goes. */
const expmSumFlow: Generator<SumFlowParams> = {
  id: 'expm-sum-flow',
  sample: sampleSumFlow,
  render: (params): Slide => {
    const { a1, p1, a2, p2, ctx } = params;
    const story = SUM_STORIES[ctx % SUM_STORIES.length];
    const { sym } = story;
    const t1 = signedModel(a1, p1);
    const t2 = signedModel(a2, p2);
    const win = p1 > p2 ? t1 : t2;
    const grows = Math.max(p1, p2) > 0;
    const key = `${a1}-${p1}-${a2}-${p2}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, `${t1} + ${t2}`)} Work out what it does, one question at a time.`,
        },
      ],
      subject: `${sym} = ${t1} + ${t2}`,
      steps: [
        {
          id: 'start',
          ask: `At $t = 0$ both powers are $e^{0} = 1$. What is $${sym}$ at the start?`,
          branches: turned(
            [
              { label: `$${texNum(a1 + a2)}$`, to: 'win' },
              { label: `$${texNum(a1 * a2)}$`, outcome: 'That multiplies the two terms, but they are added.' },
              { label: `$${texNum(a1)}$`, outcome: `That leaves out the second term, which is $${texNum(a2)}$ at the start.` },
            ],
            key,
          ),
        },
        {
          id: 'win',
          ask: 'As $t$ grows, which term ends up much the bigger of the two?',
          branches: [
            { label: `$${t1}$`, to: 'long' },
            { label: `$${t2}$`, to: 'long' },
          ],
        },
        {
          id: 'long',
          ask: `So what does $${sym}$ do in the long run?`,
          branches: [
            {
              label: 'Grows without limit',
              outcome: 'A term with a positive $k$ keeps growing, and nothing in a sum can cancel it.',
            },
            {
              label: 'Falls towards 0',
              outcome: 'With both $k$ negative, both terms shrink towards $0$, the one with $k$ nearer $0$ more slowly.',
            },
            {
              label: `Levels off at ${texNum(a1 + a2)}`,
              outcome: 'The start is where it begins, not where it ends: neither term stays the size it started.',
            },
          ],
        },
      ],
      answer: [`$${texNum(a1 + a2)}$`, `$${win}$`, grows ? 'Grows without limit' : 'Falls towards 0'],
    };
  },
  solution: ({ a1, p1, a2, p2, ctx }) => {
    const { sym } = SUM_STORIES[ctx % SUM_STORIES.length];
    const win = p1 > p2 ? signedModel(a1, p1) : signedModel(a2, p2);
    const top = Math.max(p1, p2) / 100;
    return [
      { text: `At $t = 0$, $${sym} = ${texNum(a1)} + ${texNum(a2)} = ${texNum(a1 + a2)}$.` },
      { text: `The term with the bigger $k$, sign included, wins in the long run: $${win}$, with $k = ${dec(top)}$.` },
      {
        text:
          top > 0
            ? `Its $k$ is positive, so $${sym}$ grows without limit.`
            : `Even that $k$ is negative, so $${sym}$ falls towards $0$, following $${win}$.`,
      },
    ];
  },
};

/** A sum's value at a whole time, typed. */
const expmSumAt: Generator<SumParams> = {
  id: 'expm-sum-at',
  sample: sampleSum,
  choices: (params) => {
    const { b, a1, c1, a2, c2, j } = params;
    return numberOptions(sumValue(params), [
      termAt(a1, c1, b, j),
      termAt(a2, c2, b, j),
      a1 + a2,
      termAt(a1, Math.abs(c1), b, j) + termAt(a2, Math.abs(c2), b, j),
      termAt(a1, c1, b, j + 1) + termAt(a2, c2, b, j + 1),
    ]);
  },
  render: (params): Slide => {
    const { sym } = sumStory(params);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${sumOpening(params)} What is $${sym}$ at $t = ${params.j * params.h}$?` }],
      lead: `${sym}(${params.j * params.h}) =`,
      keypad: [],
      answer: String(sumValue(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: sumSolution,
};

/** A sum at a whole time as a tree: each factor, each term, then the total. */
const expmSumTree: Generator<SumParams> = {
  id: 'expm-sum-tree',
  sample: sampleSum,
  render: (params): Slide => {
    const { b, h, a1, c1, a2, c2, j } = params;
    const { sym } = sumStory(params);
    const t = j * h;
    const v1 = termAt(a1, c1, b, j);
    const v2 = termAt(a2, c2, b, j);
    const answer = [b ** (Math.abs(c1) * j), v1, b ** (Math.abs(c2) * j), v2, v1 + v2].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${sumOpening(params)} Find $${sym}$ at $t = ${t}$. Fill in the power of $${b}$ each start is multiplied or divided by, then each term, then $${sym}$.`,
        },
      ],
      expression: `${sym}(${t})`,
      nodes: [
        { id: 'f1', from: [] },
        { id: 'first', from: ['f1'] },
        { id: 'f2', from: [] },
        { id: 'second', from: ['f2'] },
        { id: 'total', from: ['first', 'second'] },
      ],
      bank: treeBank(answer, [
        String(a1 + a2),
        String(Math.abs(v1 - v2)),
        String(b ** (Math.abs(c1) * j + 1)),
        String(termAt(a1, Math.abs(c1), b, j) + termAt(a2, Math.abs(c2), b, j)),
      ]),
      answer,
    };
  },
  solution: sumSolution,
};

/* ---------- Level 4, lesson 5: differences and the gap ---------- */

interface GapStory {
  /** The model that ends up ahead, then the other. */
  syms: [string, string];
  lead: string;
  unit: string;
}

const GAP_STORIES: GapStory[] = [
  { syms: ['I', 'C'], lead: "A firm's yearly income $I$ and yearly costs $C$ in thousands of pounds", unit: 'year' },
  { syms: ['M', 'N'], lead: 'Two cultures of bacteria $M$ and $N$', unit: 'hour' },
  { syms: ['F', 'G'], lead: 'The followers $F$ and $G$ of two accounts', unit: 'week' },
  { syms: ['S', 'V'], lead: 'The visitors $S$ and $V$ to two websites, in thousands,', unit: 'month' },
];

interface GapParams {
  b: number;
  h: number;
  /** P = a u^2 and Q = a(r - s) u, with u = b^{t/h}, so P - Q = a u^2 - a(r - s) u. */
  a: number;
  /** P - Q reaches a r s at u = r = b^m, which is t = m h; the other root is u = -s. */
  m: number;
  s: number;
  /** A whole time, t = j × h, for the tree to evaluate the gap at. */
  j: number;
  ctx: number;
}

function gapR({ b, m }: GapParams): number {
  return b ** m;
}

/** Q's start, which is also its coefficient of u. */
function gapQ(params: GapParams): number {
  return params.a * (gapR(params) - params.s);
}

/** The gap asked for: P - Q at u = r. */
function gapTarget(params: GapParams): number {
  return params.a * gapR(params) * params.s;
}

function sampleGap(rng: Rng, difficulty: number): GapParams {
  for (;;) {
    const hard = difficulty > 1;
    const b = hard ? rng.pick([2, 3]) : 2;
    const m = rng.int(1, b === 2 ? 3 : 2);
    const r = b ** m;
    const s = rng.int(1, r - 1);
    const a = rng.int(2, hard ? 9 : 6);
    const h = rng.int(1, hard ? 6 : 4);
    const j = rng.int(1, Math.min(m + 1, b === 2 ? 3 : 2));
    const params = { b, h, a, m, s, j, ctx: rng.int(0, 3) };
    if (gapTarget(params) > 4000 || a * b ** (2 * j) > 4000) continue;
    return params;
  }
}

function gapSyms({ ctx }: GapParams): [string, string] {
  return GAP_STORIES[ctx % GAP_STORIES.length].syms;
}

function gapOpening(params: GapParams): string {
  const { b, h, a, ctx } = params;
  const story = GAP_STORIES[ctx % GAP_STORIES.length];
  const [P, Q] = story.syms;
  return `${story.lead} after $t$ ${story.unit}s are $${P} = ${multModel(a, 2, b, h)}$ and $${Q} = ${multModel(gapQ(params), 1, b, h)}$.`;
}

function gapSolution(params: GapParams): SolutionStep[] {
  const { b, h, a, m, s } = params;
  const [P, Q] = gapSyms(params);
  const r = gapR(params);
  const q = gapQ(params);
  const g = gapTarget(params);
  return [
    { text: `Write $u = ${uTex(b, h)}$. Then $${P} = ${a}u^{2}$ and $${Q} = ${texNum(q)}u$, so the gap is a quadratic in $u$:` },
    {
      tex: chain(
        `${a}u^{2} - ${texNum(q)}u &= ${texNum(g)}`,
        `${a}u^{2} - ${texNum(q)}u - ${texNum(g)} &= 0`,
        `${a}(u - ${r})(u + ${s}) &= 0`,
      ),
    },
    { text: `$u = ${uTex(b, h)}$ is never negative, so $u = -${s}$ is no use and $u = ${r} = ${b}^{${m}}$, ${timeFrom(m, h)}.` },
  ];
}

/** The gap P - Q at a whole time, through u: u, then each model, then the difference. */
const expmDiffTree: Generator<GapParams> = {
  id: 'expm-diff-tree',
  sample: sampleGap,
  render: (params): Slide => {
    const { b, h, a, j } = params;
    const [P, Q] = gapSyms(params);
    const u = b ** j;
    const p = a * u * u;
    const q = gapQ(params) * u;
    const t = j * h;
    const answer = [u, p, q, p - q].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${gapOpening(params)} With $u = ${uTex(b, h)}$, find $${P} - ${Q}$ at $t = ${t}$. Fill in $u$, $${P}$ and $${Q}$, then $${P} - ${Q}$ (negative if $${Q}$ is ahead).`,
        },
      ],
      expression: `${P}(${t}) - ${Q}(${t})`,
      nodes: [
        { id: 'u', from: [] },
        { id: 'first', from: ['u'] },
        { id: 'second', from: ['u'] },
        { id: 'gap', from: ['first', 'second'] },
      ],
      bank: treeBank(answer, [String(a * u), String(q - p), String(p + q), String(b ** (j + 1)), String(a * u * u * u)]),
      answer,
    };
  },
  solution: (params) => {
    const { b, h, a, j } = params;
    const [P, Q] = gapSyms(params);
    const u = b ** j;
    const q = gapQ(params);
    const t = j * h;
    return [
      { text: `$${P} = ${a}u^{2}$ and $${Q} = ${texNum(q)}u$ with $u = ${uTex(b, h)}$. At $t = ${t}$, $u = ${b}^{${j}} = ${u}$.` },
      {
        tex: chain(
          `${P}(${t}) &= ${a} \\times ${u}^{2} = ${texNum(a * u * u)}`,
          `${Q}(${t}) &= ${texNum(q)} \\times ${u} = ${texNum(q * u)}`,
          `${P} - ${Q} &= ${texNum(a * u * u - q * u)}`,
        ),
      },
      { text: a * u * u >= q * u ? `So $${P}$ is ahead, or level, at $t = ${t}$.` : `It is negative: $${Q}$ is still ahead at $t = ${t}$.` },
    ];
  },
};

/** Solve P - Q = G as a quadratic in u, one step at a time. */
const expmGapSteps: Generator<GapParams> = {
  id: 'expm-gap-steps',
  sample: sampleGap,
  render: (params): Slide => {
    const { b, h, a, m, s } = params;
    const [P, Q] = gapSyms(params);
    const r = gapR(params);
    const q = texNum(gapQ(params));
    const g = texNum(gapTarget(params));
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${gapOpening(params)} When is $${P}$ exactly $${g}$ more than $${Q}$? Solve one step at a time, with $u = ${uTex(b, h)}$.`,
        },
      ],
      start: [`${multModel(a, 2, b, h)} - ${multModel(gapQ(params), 1, b, h)}`, '=', g],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: `${a}u^{2} - ${q}u - ${g} = 0`,
          bank: stepsBank([
            `${a}u^{2} - ${q}u - ${g} = 0`,
            `${a}u^{2} - ${q}u + ${g} = 0`,
            `${a}u^{2} + ${q}u - ${g} = 0`,
            `${a}u^{2} - ${q}u = 0`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `${a}(u - ${r})(u + ${s}) = 0`,
          bank: stepsBank([
            `${a}(u - ${r})(u + ${s}) = 0`,
            `${a}(u + ${r})(u - ${s}) = 0`,
            `${a}(u - ${r})(u - ${s}) = 0`,
            `(u - ${r})(${a}u + ${s}) = 0`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `u = ${r}`,
          bank: stepsBank([`u = ${r}`, `u = -${s}`, `u = ${s}`, `u = -${r}`]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `t = ${m * h}`,
          bank: stepsBank([`t = ${m * h}`, `t = ${m}`, `t = ${r * h}`, `t = ${(m + 1) * h}`, `t = ${h}`]),
        },
      ],
    };
  },
  solution: gapSolution,
};

/** Slide to the time the gap P - Q reaches a dashed level, over a plot of the gap. */
const expmGapSlider: Generator<GapParams> = {
  id: 'expm-gap-slider',
  sample: sampleGap,
  render: (params): Slide => {
    const { b, h, a, m, s } = params;
    const [P, Q] = gapSyms(params);
    const r = gapR(params);
    const q = gapQ(params);
    const g = gapTarget(params);
    const answer = m * h;
    const span = sliderSpan(answer, Math.max(answer + 3, Math.ceil(answer * 1.6)));
    const base = Math.log(b) / h;
    const top = g * 1.8;
    const gap = (t: number) => {
      const u = Math.exp(base * t);
      return Math.min(a * u * u - q * u, top * 2);
    };
    // The lowest the gap goes, at u = (r - s) / 2, when that is after the start.
    const dip = r - s >= 2 ? -(a * (r - s) ** 2) / 4 : a - q;
    const bottom = Math.min(0, dip) - g * 0.15;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${gapOpening(params)} The curve is $${P} - ${Q}$ and the dashed line is $${texNum(g)}$. Slide to the time at which $${P}$ is $${texNum(g)}$ more than $${Q}$.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: 't = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: bottom,
          yMax: top,
          curves: [{ f: gap, accent: true }],
          horizontals: [g],
          label: `The gap between two models, ${a - q < 0 ? 'starting below zero and ' : ''}rising through a dashed line at ${g}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: gapSolution,
};

/** Three options for when two models are level, the right one first, never two alike. */
function levelLabels(right: number, slips: number[]): string[] {
  const out = [right];
  for (const value of [...slips, right + 1, right + 2, right + 3]) {
    if (out.length === 3) break;
    if (value > 0 && !out.includes(value)) out.push(value);
  }
  return out.map((value) => `$u = ${texNum(value)}$`);
}

/** Read P - Q one fork at a time: the quadratic in u, who leads at the start, when they are level, the long run. */
const expmGapFlow: Generator<GapParams> = {
  id: 'expm-gap-flow',
  sample: sampleGap,
  render: (params): Slide => {
    const { b, h, a, s } = params;
    const [P, Q] = gapSyms(params);
    const r = gapR(params);
    const q = gapQ(params);
    const key = `${a}-${b}-${h}-${r}-${s}`;
    const form = `$${a}u^{2} - ${texNum(q)}u$`;
    const levelAt = r - s;
    const startLabel = levelAt === 1 ? 'They are level' : `$${Q}$`;
    const levels = levelLabels(levelAt, [q, a, levelAt * a]);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${gapOpening(params)} Read the gap $${P} - ${Q}$, one question at a time, with $u = ${uTex(b, h)}$.`,
        },
      ],
      subject: `${P} - ${Q}`,
      steps: [
        {
          id: 'form',
          ask: `What is $${P} - ${Q}$ in terms of $u$?`,
          branches: turned(
            [
              { label: form, to: 'start' },
              {
                label: `$${a}u - ${texNum(q)}u^{2}$`,
                outcome: `That swaps the powers. $${P}$ has the $2$ in its power, so it is the one with $u^{2}$.`,
              },
              {
                // Zero when the two coefficients match: the slip then reads 0, not 0u.
                label: a === q ? '$0$' : `$${texNum(a - q)}u$`,
                outcome: '$u^{2}$ and $u$ are different powers, so the two terms do not combine.',
              },
            ],
            key,
          ),
        },
        {
          id: 'start',
          ask: 'At $t = 0$, $u = 1$. Which is bigger then?',
          branches: [
            { label: `$${P}$`, to: 'level' },
            { label: `$${Q}$`, to: 'level' },
            { label: 'They are level', to: 'level' },
          ],
        },
        {
          id: 'level',
          ask: `Setting $${a}u^{2} = ${texNum(q)}u$ and dividing by $u$, when are they the same size?`,
          branches: turned(
            levels.map((label) => ({ label, to: 'long' })),
            `${key}-level`,
          ),
        },
        {
          id: 'long',
          ask: `So what does $${P} - ${Q}$ do after that?`,
          branches: [
            { label: 'Grows without limit', outcome: `$u^{2}$ outgrows $u$, so the gap keeps widening in $${P}$'s favour.` },
            { label: `Falls back to 0`, outcome: 'They are level only once for $u > 0$, so the gap cannot close again.' },
            { label: 'Settles at a level', outcome: 'Both terms keep growing, and the $u^{2}$ one faster, so nothing settles.' },
          ],
        },
      ],
      answer: [form, startLabel, levels[0], 'Grows without limit'],
    };
  },
  solution: (params) => {
    const { b, h, a, s } = params;
    const [P, Q] = gapSyms(params);
    const r = gapR(params);
    const q = gapQ(params);
    return [
      { text: `With $u = ${uTex(b, h)}$, $${P} - ${Q} = ${a}u^{2} - ${texNum(q)}u$.` },
      {
        text:
          r - s === 1
            ? `At $t = 0$, $u = 1$ and both are $${a}$: they start level.`
            : `At $t = 0$, $u = 1$: $${P} = ${a}$ and $${Q} = ${texNum(q)}$, so $${Q}$ is bigger.`,
      },
      { tex: `${a}u^{2} = ${texNum(q)}u \\quad\\Rightarrow\\quad u = \\frac{${texNum(q)}}{${a}} = ${r - s}` },
      { text: `Beyond that the $u^{2}$ term runs away from the $u$ term, so $${P}$ pulls ahead and the gap grows without limit.` },
    ];
  },
};

/* ---------- Level 5: logistic growth ---------- */

/**
 * The logistic model P = L / (1 + Ae^(-kt)): growth that slows as it nears a
 * ceiling L. Whole values come from the same trick as level 4. With A = b^j
 * and k = (ln b)/h, e^(kt) at t = mh is u = b^m, and multiplying top and
 * bottom by u gives P = Lu / (u + A). So the ceiling is built as c(b^m + b^j),
 * which makes P(mh) = c b^m and (L - P)u = AP an equation in whole numbers;
 * and P = L/2 falls at t = jh, where u = A. A decimal k appears only in reading
 * the model and in the rate kP(1 - P/L), where L and P are built from the
 * answer so the rate is whole.
 *
 * L - Ae^(-kt) is level 2's (`expm-limit-flow` and friends); here it is only
 * the shape a logistic curve is told apart from.
 */

const LOGISTIC_STORIES: Story[] = [
  { sym: 'N', subject: 'The number of rabbits on an island', unit: 'month', of: 'rabbits' },
  { sym: 'R', subject: 'The number of students who have heard a rumour', unit: 'hour', of: 'students' },
  { sym: 'U', subject: 'The number of people in a town using a new app', unit: 'week', of: 'people' },
  { sym: 'F', subject: 'The number of fish in a new lake', unit: 'year', of: 'fish' },
  { sym: 'D', subject: 'The number of plants in a field that have a disease', unit: 'day', of: 'plants' },
];

function logisticStory(ctx: number): Story {
  return LOGISTIC_STORIES[ctx % LOGISTIC_STORIES.length];
}

/** The model, \frac{600}{1 + 8e^{-\frac{\ln 2}{5}t}}; `power` is the power of e, sign included. */
function logisticTex(l: number, a: number, power: string): string {
  return `\\frac{${texNum(l)}}{1 + ${a}e^{${power}}}`;
}

/**
 * A prompt with the model on a line of its own. A fraction with a fraction in
 * its power is too small to read inside a sentence on a phone.
 */
function logisticPrompt(story: Story, model: string, ask: string): Block[] {
  return [
    { kind: 'prose', text: `${story.subject} after $t$ ${story.unit}s is modelled by` },
    { kind: 'display', tex: `${story.sym} = ${model}` },
    { kind: 'prose', text: ask },
  ];
}

/** The S-curve itself, for a figure. */
function logisticCurve(l: number, a: number, k: number): (t: number) => number {
  return (t) => l / (1 + a * Math.exp(-k * t));
}

/** Four or more distinct "t = n" options for a steps slide: the answer, the slips, then neighbours. */
function timeSteps(answer: number, slips: number[], v = 't'): string[] {
  const values = [answer];
  for (const value of [...slips, answer + 1, answer + 2, answer + 3]) {
    if (values.length === 5) break;
    if (Number.isInteger(value) && value > 0 && !values.includes(value)) values.push(value);
  }
  return stepsBank(values.map((value) => `${v} = ${texNum(value)}`));
}

/* ---------- Level 5, lesson 1: reading the model ---------- */

const LOGISTIC_STARTS = [10, 20, 25, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300];

interface LogReadParams {
  /** The start. The ceiling is s(1 + a), so the start is whole. */
  s: number;
  a: number;
  /** k = p / 100. */
  p: number;
  ctx: number;
}

function logCeiling({ s, a }: LogReadParams): number {
  return s * (1 + a);
}

function sampleLogRead(rng: Rng, difficulty: number): LogReadParams {
  for (;;) {
    const hard = difficulty > 1;
    const a = rng.int(2, hard ? 19 : 9);
    const s = rng.pick(LOGISTIC_STARTS);
    const p = rng.pick(hard ? [...READ_PERCENTS, 1.5, 2.5, 7.5, 12.5] : [5, 10, 15, 20, 25, 30, 40, 50]);
    if (s * (1 + a) > (hard ? 4000 : 2000)) continue;
    return { s, a, p, ctx: rng.int(0, 4) };
  }
}

function logReadModel(params: LogReadParams): string {
  return logisticTex(logCeiling(params), params.a, `-${dec(params.p / 100)}t`);
}

function logReadSolution(params: LogReadParams): SolutionStep[] {
  const { s, a, p } = params;
  const l = logCeiling(params);
  return [
    {
      text: `At $t = 0$, $e^{0} = 1$, so the bottom is $1 + ${a} = ${a + 1}$ and it starts at $\\frac{${texNum(l)}}{${a + 1}} = ${texNum(s)}$.`,
    },
    {
      text: `As $t$ grows, $e^{-${dec(p / 100)}t}$ shrinks to $0$ and the bottom to $1$, so it levels off at the ceiling, $${texNum(l)}$.`,
    },
    { text: `$k = ${dec(p / 100)}$ sets the pace: the bigger $k$, the sooner it gets close to the ceiling.` },
  ];
}

/** Build a logistic model from a story: its ceiling, A from the start, and k. */
const expmLogisticBuildTiles: Generator<LogReadParams> = {
  id: 'expm-logistic-build-tiles',
  sample: sampleLogRead,
  render: (params): Slide => {
    const { s, a, p, ctx } = params;
    const story = logisticStory(ctx);
    const l = logCeiling(params);
    const k = dec(p / 100);
    const answer = [texNum(l), String(a), k];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} starts at ${s}, can never go above ${l}, and grows logistically with $k = ${k}$ per ${story.unit}. Fill in the three numbers of its model:`,
        },
        { kind: 'display', tex: `${story.sym} = \\frac{L}{1 + Ae^{-kt}}` },
      ],
      template: 'L = {0} \\quad A = {1} \\quad k = {2}',
      bank: fillBank(answer, [texNum(s), String(a + 1), texNum(l - s), `-${k}`, String(p)]),
      answer,
    };
  },
  solution: (params) => {
    const { s, a, p, ctx } = params;
    const l = logCeiling(params);
    return [
      { text: `The ceiling is $L = ${texNum(l)}$.` },
      {
        text: `At $t = 0$ the model is $\\frac{L}{1 + A}$, so $1 + A = \\frac{${texNum(l)}}{${texNum(s)}} = ${a + 1}$ and $A = ${a}$.`,
      },
      { text: `$k = ${dec(p / 100)}$ goes in as it is: the minus sign is already written in the power.` },
      { tex: `${logisticStory(ctx).sym} = ${logReadModel(params)}` },
    ];
  },
};

type LogStartAsk = 'start' | 'room' | 'times';

type LogStartParams = LogReadParams & { ask: LogStartAsk };

function logStartValue(params: LogStartParams): number {
  if (params.ask === 'room') return logCeiling(params) - params.s;
  if (params.ask === 'times') return params.a + 1;
  return params.s;
}

/** The start, typed; at difficulty 2 also how far it has to grow, or how many times over. */
const expmLogisticStart: Generator<LogStartParams> = {
  id: 'expm-logistic-start',
  sample: (rng, difficulty) => ({
    ...sampleLogRead(rng, difficulty),
    ask: difficulty > 1 ? rng.pick(['start', 'room', 'times'] as const) : 'start',
  }),
  choices: (params) => {
    const { s, a } = params;
    const l = logCeiling(params);
    return numberOptions(logStartValue(params), [l / a, s, l - s, a, a + 1, l, l / 2]);
  },
  render: (params): Slide => {
    const story = logisticStory(params.ctx);
    const { sym } = story;
    const question = {
      start: `What is $${sym}$ at the start, when $t = 0$?`,
      room: `How much more does $${sym}$ have to grow, after the start, before it gets close to its ceiling?`,
      times: `Its ceiling is how many times its value at the start?`,
    }[params.ask];
    return {
      kind: 'expression',
      prompt: logisticPrompt(story, logReadModel(params), question),
      lead: params.ask === 'start' ? `${sym}(0) =` : params.ask === 'room' ? '\\text{still to grow} =' : `L \\div ${sym}(0) =`,
      keypad: [],
      answer: String(logStartValue(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const steps = logReadSolution(params).slice(0, 2);
    const l = logCeiling(params);
    if (params.ask === 'room') steps.push({ tex: `${texNum(l)} - ${texNum(params.s)} = ${texNum(l - params.s)}` });
    if (params.ask === 'times') steps.push({ tex: `${texNum(l)} \\div ${texNum(params.s)} = ${params.a + 1}` });
    return steps;
  },
};

/** Which sentence describes the S-curve, with the picture beside the model. */
const expmLogisticRead: Generator<LogReadParams> = {
  id: 'expm-logistic-read',
  sample: sampleLogRead,
  render: (params): Slide => {
    const { s, a, p, ctx } = params;
    const story = logisticStory(ctx);
    const l = logCeiling(params);
    const k = p / 100;
    // Long enough for the curve to get within 5% of its ceiling.
    const span = Math.ceil(Math.log(19 * a) / k);
    const slip = Number.isInteger(l / a) ? l / a : l - s;
    const right = `Starts at ${s}, levels off at ${l}`;
    const labels = turned(
      [right, `Starts at ${s}, grows without limit`, `Starts at 0, levels off at ${l}`, `Starts at ${slip}, levels off at ${l}`],
      `${s}-${a}-${p}-${ctx}`,
    );
    return {
      kind: 'choice',
      prompt: [
        ...logisticPrompt(story, logReadModel(params), 'The picture shows it, with its start ringed. Which describes it?'),
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: 0,
            xMax: span,
            yMin: 0,
            yMax: l * 1.15,
            curves: [{ f: logisticCurve(l, a, k), accent: true }],
            horizontals: [l],
            marks: [{ x: 0, y: s }],
            label: 'An S-shaped curve rising from a ringed start towards a dashed ceiling',
          }),
        },
      ],
      options: labels.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${labels.indexOf(right)}`,
    };
  },
  solution: logReadSolution,
};

type LogFlowParams = LogReadParams & { logistic: boolean };

/**
 * A logistic model or a bounded one, L - Ae^(-kt), built to start and settle
 * at the same values, so only when it grows fastest tells them apart.
 */
const expmLogisticFlow: Generator<LogFlowParams> = {
  id: 'expm-logistic-flow',
  sample: (rng, difficulty) => ({ ...sampleLogRead(rng, difficulty), logistic: rng.chance(0.5) }),
  render: (params): Slide => {
    const { s, a, p, ctx, logistic } = params;
    const story = logisticStory(ctx);
    const { sym } = story;
    const l = logCeiling(params);
    const gap = l - s;
    const k = dec(p / 100);
    const model = logistic ? logReadModel(params) : `${texNum(l)} - ${texNum(gap)}e^{-${k}t}`;
    const key = `${s}-${a}-${p}-${logistic}`;
    const half = 'When it is halfway to its ceiling';
    return {
      kind: 'flow',
      prompt: [
        { kind: 'prose', text: `${story.subject} after $t$ ${story.unit}s is modelled by` },
        { kind: 'display', tex: `${sym} = ${model}` },
        { kind: 'prose', text: 'Read it one question at a time. Each answer chooses what gets asked next.' },
      ],
      subject: `${sym} = ${model}`,
      steps: [
        {
          id: 'start',
          ask: `At $t = 0$, $e^{0} = 1$. What is $${sym}$ at the start?`,
          branches: turned(
            [
              { label: `$${texNum(s)}$`, to: 'limit' },
              {
                label: `$${texNum(l)}$`,
                outcome: logistic
                  ? `That is the top of the fraction on its own. At $t = 0$ the bottom is $1 + ${a}$, not $1$.`
                  : `That leaves out the $e^{-kt}$ term, which is its full $${texNum(gap)}$ at the start.`,
              },
              {
                label: '$0$',
                outcome: logistic
                  ? `The top is $${texNum(l)}$ and the bottom is positive, so the fraction is never $0$.`
                  : `At the start the $e^{-kt}$ term is $${texNum(gap)}$, not all $${texNum(l)}$.`,
              },
            ],
            key,
          ),
        },
        {
          id: 'limit',
          ask: `In the long run $e^{-${k}t}$ tends to $0$. What does $${sym}$ settle at?`,
          branches: turned(
            [
              { label: `$${texNum(l)}$`, to: 'fast' },
              { label: `$${texNum(s)}$`, outcome: 'That is where it starts. It rises from there.' },
              { label: 'It grows without limit', outcome: `With $e^{-${k}t}$ gone, nothing is left that keeps growing.` },
            ],
            `${key}-limit`,
          ),
        },
        {
          id: 'fast',
          ask: 'So both kinds of model could start and settle there. When is this one growing fastest?',
          branches: [
            {
              label: 'At the start',
              outcome: logistic
                ? 'A logistic model starts slowly, with little to grow from. It speeds up before it slows down.'
                : 'Yes: the gap to the level is biggest at the start, so it closes fastest then and slower ever after.',
            },
            {
              label: half,
              outcome: logistic
                ? 'Yes: a logistic curve speeds up until it is halfway, then slows as it nears the ceiling. An S shape.'
                : 'A model $L - Ae^{-kt}$ never speeds up: its gap to the level shrinks, and the rate with it.',
            },
          ],
        },
      ],
      answer: [`$${texNum(s)}$`, `$${texNum(l)}$`, logistic ? half : 'At the start'],
    };
  },
  solution: (params) => {
    const { s, a, logistic } = params;
    const l = logCeiling(params);
    return [
      {
        text: logistic
          ? `At $t = 0$ the bottom is $1 + ${a}$, so it starts at $\\frac{${texNum(l)}}{${a + 1}} = ${texNum(s)}$.`
          : `At $t = 0$ the term is its full $${texNum(l - s)}$, so it starts at $${texNum(l)} - ${texNum(l - s)} = ${texNum(s)}$.`,
      },
      { text: `$e^{-kt}$ dies away, so it settles at $${texNum(l)}$.` },
      {
        text: logistic
          ? 'It is logistic: slow at first, fastest at half the ceiling, then slowing. An S-curve.'
          : 'It is $L - Ae^{-kt}$: fastest at the start, then slower and slower as it closes on its level.',
      },
    ];
  },
};

/* ---------- Level 5, lesson 2: values at whole times ---------- */

const LOGISTIC_SCALES = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 120, 150, 200];

interface LogValueParams {
  b: number;
  h: number;
  /** A = b^j, so the model is at half its ceiling at t = jh. */
  j: number;
  /** Asked about t = mh, where e^{kt} = b^m. Never j. */
  m: number;
  /** The ceiling is c(b^m + b^j), so the value at t = mh is c b^m. */
  c: number;
  ctx: number;
}

function sampleLogValue(rng: Rng, difficulty: number): LogValueParams {
  for (;;) {
    const hard = difficulty > 1;
    const b = hard ? rng.pick([2, 3]) : 2;
    const j = rng.int(1, b === 2 ? 3 : 2);
    const m = rng.int(1, b === 2 && hard ? 4 : 3);
    if (m === j) continue;
    const params = { b, h: rng.int(1, hard ? 8 : 5), j, m, c: rng.pick(LOGISTIC_SCALES), ctx: rng.int(0, 4) };
    if (logValueCeiling(params) > 4000) continue;
    return params;
  }
}

function logValueCeiling({ b, j, m, c }: LogValueParams): number {
  return c * (b ** m + b ** j);
}

function logValueAt({ b, m, c }: LogValueParams): number {
  return c * b ** m;
}

function logValueModel(params: LogValueParams): string {
  const { b, h, j } = params;
  return logisticTex(logValueCeiling(params), b ** j, ktTex({ b, h, down: true }));
}

function logValueSolution(params: LogValueParams): SolutionStep[] {
  const { b, h, j, m, c, ctx } = params;
  const { sym } = logisticStory(ctx);
  const l = texNum(logValueCeiling(params));
  const a = b ** j;
  const u = b ** m;
  const t = m * h;
  return [
    {
      text: `Multiply top and bottom by $u = e^{${ktTex({ b, h, down: false })}} = ${uTex(b, h)}$. Since $e^{-kt} \\times e^{kt} = 1$, $${sym} = \\frac{${l}u}{u + ${a}}$.`,
    },
    { text: `At $t = ${t}$, $u = ${b}^{${m}} = ${u}$:` },
    {
      tex: chain(
        `${sym}(${t}) &= \\frac{${l} \\times ${u}}{${u} + ${a}}`,
        `&= ${l} \\div ${u + a} \\times ${u}`,
        `&= ${c} \\times ${u} = ${texNum(c * u)}`,
      ),
    },
  ];
}

/** The value at a whole time as a tree: u, the bottom, L shared out, then the value. */
const expmLogisticValueTree: Generator<LogValueParams> = {
  id: 'expm-logistic-value-tree',
  sample: sampleLogValue,
  render: (params): Slide => {
    const { b, h, j, m, c, ctx } = params;
    const story = logisticStory(ctx);
    const l = texNum(logValueCeiling(params));
    const a = b ** j;
    const u = b ** m;
    const answer = [u, u + a, c, c * u].map(String);
    return {
      kind: 'tree',
      prompt: logisticPrompt(
        story,
        logValueModel(params),
        `With $u = ${uTex(b, h)}$ it is $${story.sym} = \\frac{${l}u}{u + ${a}}$. Find $${story.sym}$ at $t = ${m * h}$: fill in $u$, then $u + ${a}$, then $${l}$ divided by that, then $${story.sym}$.`,
      ),
      expression: `\\frac{${l}u}{u + ${a}}`,
      nodes: [
        { id: 'u', from: [] },
        { id: 'bottom', from: ['u'] },
        { id: 'share', from: ['bottom'] },
        { id: 'value', from: ['share', 'u'] },
      ],
      bank: treeBank(answer, [String(b * m), String(b ** (m + 1)), String(u * a), String(c * a), String(c + u)]),
      answer,
    };
  },
  solution: logValueSolution,
};

/** The value at a whole time, typed. */
const expmLogisticAt: Generator<LogValueParams> = {
  id: 'expm-logistic-at',
  sample: sampleLogValue,
  choices: (params) => {
    const { b, j, m, c } = params;
    const l = logValueCeiling(params);
    return numberOptions(logValueAt(params), [c * b ** j, c, l - logValueAt(params), c * b ** (m + 1), l / 2]);
  },
  render: (params): Slide => {
    const story = logisticStory(params.ctx);
    const t = params.m * params.h;
    return {
      kind: 'expression',
      prompt: logisticPrompt(story, logValueModel(params), `What is $${story.sym}$ at $t = ${t}$?`),
      lead: `${story.sym}(${t}) =`,
      keypad: [],
      answer: String(logValueAt(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: logValueSolution,
};

/** L ÷ (b^m + A) × b^m, a piece at a time; its evaluate form comes from `choices`. */
const expmLogisticReduce: Generator<LogValueParams> = {
  id: 'expm-logistic-reduce',
  sample: sampleLogValue,
  choices: (params) => {
    const { b, j, m, c } = params;
    const l = logValueCeiling(params);
    const u = b ** m;
    return numberOptions(c * u, [c, c * b ** j, l / u, c * b ** (m + 1), c * u + c], true);
  },
  evaluatePrompt: (params) =>
    logisticPrompt(
      logisticStory(params.ctx),
      logValueModel(params),
      `At $t = ${params.m * params.h}$, $e^{kt} = ${params.b}^{${params.m}}$ and $${logisticStory(params.ctx).sym}$ is the line below. What does it come to?`,
    ),
  render: (params): Slide => {
    const { b, j, m, c, h, ctx } = params;
    const story = logisticStory(ctx);
    const l = logValueCeiling(params);
    const a = b ** j;
    const u = b ** m;
    const powerBank = offer(u, b * m, b + m, b ** (m + 1), u + 1);
    return {
      kind: 'reduce',
      prompt: logisticPrompt(
        story,
        logValueModel(params),
        `At $t = ${m * h}$, $e^{kt} = ${b}^{${m}}$ and $${story.sym}$ is the line below. Tap the part you would do **next**, then choose what it comes to.`,
      ),
      expr: bin('*', bin('/', num(l), bin('+', pow(num(b), num(m)), num(a))), pow(num(b), num(m))),
      banks: {
        r: offer(c * u, c * b ** (m + 1), c + u, c * a, l - c * u, c * u + c),
        'r.l': offer(c, l / u, l / a, 2 * c, c + 1),
        'r.l.r': offer(u + a, u * a, b * m + a, u + a + 1),
        'r.l.r.l': powerBank,
        'r.r': powerBank,
      },
    };
  },
  solution: logValueSolution,
};

/** Substitute u, tidy the fraction, then divide, one step at a time. */
const expmLogisticWorkSteps: Generator<LogValueParams> = {
  id: 'expm-logistic-work-steps',
  sample: sampleLogValue,
  render: (params): Slide => {
    const { b, h, j, m, c, ctx } = params;
    const story = logisticStory(ctx);
    const lv = logValueCeiling(params);
    const l = texNum(lv);
    const a = b ** j;
    const u = b ** m;
    const t = m * h;
    const put = (v: number) => `\\frac{${l} \\times ${v}}{${v} + ${a}}`;
    const wrongU = [...new Set([b * m, b ** (m + 1), m, u + 1])].filter((v) => v !== u).slice(0, 3);
    return {
      kind: 'steps',
      prompt: logisticPrompt(
        story,
        logValueModel(params),
        `With $u = ${uTex(b, h)}$ it is $${story.sym} = \\frac{${l}u}{u + ${a}}$. Find $${story.sym}(${t})$ one step at a time: tap the step to do next, then choose what it gives.`,
      ),
      start: [`\\frac{${l}u}{u + ${a}}`],
      reductions: [
        { span: [0, 1], operator: 0, value: put(u), bank: stepsBank([put(u), ...wrongU.map(put)]) },
        {
          span: [0, 1],
          operator: 0,
          value: `\\frac{${texNum(lv * u)}}{${u + a}}`,
          bank: stepsBank([
            `\\frac{${texNum(lv * u)}}{${u + a}}`,
            `\\frac{${texNum(lv * u)}}{${u * a}}`,
            `\\frac{${texNum(lv + u)}}{${u + a}}`,
            `\\frac{${l}}{${u + a}}`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: texNum(c * u),
          bank: stepsBank([...new Set([c * u, c, c * a, c * u + c, lv - c * u])].map(texNum)),
        },
      ],
    };
  },
  solution: logValueSolution,
};

/* ---------- Level 5, lesson 3: half the ceiling ---------- */

const LOGISTIC_CEILINGS = [100, 120, 150, 200, 240, 300, 400, 500, 600, 800, 900, 1000, 1200, 1500, 2000, 2400, 3000];

interface LogMidParams {
  b: number;
  h: number;
  /** A = b^j, so it is at half its ceiling at t = jh. */
  j: number;
  l: number;
  ctx: number;
}

function sampleLogMid(rng: Rng, difficulty: number): LogMidParams {
  const hard = difficulty > 1;
  const b = hard ? rng.pick([2, 3]) : 2;
  return { b, h: rng.int(1, hard ? 8 : 5), j: rng.int(1, 3), l: rng.pick(LOGISTIC_CEILINGS), ctx: rng.int(0, 4) };
}

function logMidModel({ b, h, j, l }: LogMidParams): string {
  return logisticTex(l, b ** j, ktTex({ b, h, down: true }));
}

function logMidSolution({ b, h, j, l }: LogMidParams): SolutionStep[] {
  const a = b ** j;
  return [
    { text: `Half the ceiling is $${texNum(l / 2)}$. The fraction is half of $${texNum(l)}$ exactly when its bottom is $2$:` },
    {
      tex: chain(
        `1 + ${a}e^{${ktTex({ b, h, down: true })}} &= 2`,
        `${a}e^{${ktTex({ b, h, down: true })}} &= 1`,
        `e^{${ktTex({ b, h, down: false })}} &= ${a} = ${b}^{${j}}`,
      ),
    },
    {
      text:
        h === 1
          ? `So $t\\ln ${b} = ${lnTex(j, b)}$ and $t = ${j}$.`
          : `So $\\frac{t}{${h}}\\ln ${b} = ${lnTex(j, b)}$, $\\frac{t}{${h}} = ${j}$ and $t = ${j * h}$.`,
    },
    { text: 'That is where the S-curve is steepest: it speeds up before it and slows down after.' },
  ];
}

/** Slide to the time a logistic model reaches half its ceiling. */
const expmLogisticMidSlider: Generator<LogMidParams> = {
  id: 'expm-logistic-mid-slider',
  sample: sampleLogMid,
  render: (params): Slide => {
    const { b, h, j, l, ctx } = params;
    const story = logisticStory(ctx);
    const answer = j * h;
    const span = sliderSpan(answer, Math.max(answer + 3, 2 * answer + h));
    return {
      kind: 'slider',
      prompt: logisticPrompt(
        story,
        logMidModel(params),
        `The dashed line is its ceiling, $${texNum(l)}$. Slide to the time at which $${story.sym}$ is half its ceiling.`,
      ),
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: 't = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: l * 1.15,
          curves: [{ f: logisticCurve(l, b ** j, Math.log(b) / h), accent: true }],
          horizontals: [l],
          label: 'An S-shaped curve rising towards a dashed ceiling',
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: logMidSolution,
};

type LogMidAsk = 'half' | 'fastest';

/** The time of half the ceiling, typed; at difficulty 2 it may be asked as the time of fastest growth. */
const expmLogisticMid: Generator<LogMidParams & { ask: LogMidAsk }> = {
  id: 'expm-logistic-mid',
  sample: (rng, difficulty) => ({
    ...sampleLogMid(rng, difficulty),
    ask: difficulty > 1 ? rng.pick(['half', 'fastest'] as const) : 'half',
  }),
  choices: ({ b, h, j }) => numberOptions(j * h, [j, h, b ** j * h, (j + 1) * h, j * h + 1]),
  render: (params): Slide => {
    const story = logisticStory(params.ctx);
    return {
      kind: 'expression',
      prompt: logisticPrompt(
        story,
        logMidModel(params),
        params.ask === 'half' ? `When is $${story.sym}$ half its ceiling?` : `When is $${story.sym}$ growing fastest?`,
      ),
      lead: 't =',
      keypad: [],
      answer: String(params.j * params.h),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const steps = logMidSolution(params);
    if (params.ask === 'fastest') steps.unshift({ text: 'A logistic model grows fastest at half its ceiling.' });
    return steps;
  },
};

/** Solve P = L/2 one step at a time: the bottom is 2, so e^(kt) = A. */
const expmLogisticHalfSteps: Generator<LogMidParams> = {
  id: 'expm-logistic-half-steps',
  sample: sampleLogMid,
  render: (params): Slide => {
    const { b, h, j, l, ctx } = params;
    const story = logisticStory(ctx);
    const a = b ** j;
    const down = ktTex({ b, h, down: true });
    const up = ktTex({ b, h, down: false });
    const sameLog = (x: number, y: number) => Math.abs(Math.log(x) - Math.log(y)) < 1e-9;
    return {
      kind: 'steps',
      prompt: logisticPrompt(
        story,
        logMidModel(params),
        `Find when $${story.sym}$ is half its ceiling, $${texNum(l / 2)}$, one step at a time: tap the step to do next, then choose what it gives.`,
      ),
      start: [logMidModel(params), '=', texNum(l / 2)],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: `1 + ${a}e^{${down}} = 2`,
          bank: stepsBank([
            `1 + ${a}e^{${down}} = 2`,
            `1 + ${a}e^{${down}} = \\frac{1}{2}`,
            `1 + ${a}e^{${down}} = ${texNum(l / 2)}`,
            `${a}e^{${down}} = 2`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `e^{${up}} = ${a}`,
          bank: stepsBank([`e^{${up}} = ${a}`, `e^{${up}} = \\frac{1}{${a}}`, `e^{${up}} = ${a + 1}`, `e^{${up}} = ${2 * a}`]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `${up} = ${lnTex(j, b)}`,
          bank: stepsBank([
            `${up} = ${lnTex(j, b)}`,
            ...(j === 1 || sameLog(j ** b, a) ? [] : [`${up} = ${b}\\ln ${j}`]),
            `${up} = ${j + 1}\\ln ${b}`,
            `${up} = \\ln ${a + 1}`,
          ]),
        },
        { span: [0, 1], operator: 0, value: `t = ${j * h}`, bank: timeSteps(j * h, [j, h, a * h, (j + 1) * h]) },
      ],
    };
  },
  solution: logMidSolution,
};

/** Which ringed point on the S-curve is steepest. */
const expmLogisticSteepest: Generator<LogMidParams> = {
  id: 'expm-logistic-steepest',
  sample: sampleLogMid,
  render: (params): Slide => {
    const { b, h, j, l, ctx } = params;
    const story = logisticStory(ctx);
    const mid = j * h;
    const times = mid - 2 * h >= 0 ? [mid - 2 * h, mid, mid + 2 * h, mid + 4 * h] : [0, mid, mid + 2 * h, mid + 4 * h];
    const f = logisticCurve(l, b ** j, Math.log(b) / h);
    const right = `t = ${mid}`;
    const labels = turned(
      times.map((t) => `t = ${t}`),
      `${b}-${h}-${j}-${l}-${ctx}`,
    );
    return {
      kind: 'choice',
      prompt: [
        ...logisticPrompt(
          story,
          logMidModel(params),
          `The picture shows it with four points ringed, one at each of the times below. At which is $${story.sym}$ growing fastest?`,
        ),
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: 0,
            xMax: times[3] + h,
            yMin: 0,
            yMax: l * 1.15,
            curves: [{ f, accent: true }],
            horizontals: [l],
            marks: times.map((t) => ({ x: t, y: f(t) })),
            label: 'An S-shaped curve under a dashed ceiling, with four ringed points',
          }),
        },
      ],
      options: labels.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${labels.indexOf(right)}`,
    };
  },
  solution: (params) => [
    { text: 'A logistic curve is steepest where it is half its ceiling, so find when that is.' },
    ...logMidSolution(params).slice(0, 3),
  ],
};

/* ---------- Level 5, lesson 4: the rate ---------- */

interface LogRateParams {
  /** L = n^2 r and P = i n r, so P(1 - P/L) = i(n - i) r is whole. */
  n: number;
  r: number;
  i: number;
  /** k = p / 100, drawn so that k P(1 - P/L) is whole too. */
  p: number;
  /** The model's A. It plays no part in the rate. */
  a: number;
  ctx: number;
}

function sampleLogRate(rng: Rng, difficulty: number): LogRateParams {
  for (;;) {
    const hard = difficulty > 1;
    const n = rng.pick([4, 5]);
    const r = rng.pick(hard ? [4, 5, 8, 10, 12, 15, 20, 24, 25, 30, 40, 50, 60, 80, 100, 120, 150] : [5, 10, 20, 25, 40, 50, 100]);
    const i = rng.int(1, n - 1);
    const p = rng.pick(hard ? [5, 10, 15, 20, 25, 30, 40, 50] : [10, 20, 25, 50]);
    if ((p * i * (n - i) * r) % 100 !== 0 || n * n * r > 4000) continue;
    return { n, r, i, p, a: rng.int(2, hard ? 19 : 9), ctx: rng.int(0, 4) };
  }
}

function logRateNumbers({ n, r, i, p }: LogRateParams): { l: number; value: number; inner: number; rate: number } {
  const inner = i * (n - i) * r;
  return { l: n * n * r, value: i * n * r, inner, rate: (p * inner) / 100 };
}

function logRateModel(params: LogRateParams): string {
  return logisticTex(logRateNumbers(params).l, params.a, `-${dec(params.p / 100)}t`);
}

function logRateSolution(params: LogRateParams): SolutionStep[] {
  const { p, ctx } = params;
  const { sym } = logisticStory(ctx);
  const { l, value, inner, rate } = logRateNumbers(params);
  const k = dec(p / 100);
  return [
    { text: `A logistic model grows at $\\frac{d${sym}}{dt} = k${sym}\\left(1 - \\frac{${sym}}{L}\\right)$, here with $k = ${k}$ and $L = ${texNum(l)}$.` },
    {
      tex: chain(
        `1 - \\frac{${value}}{${texNum(l)}} &= \\frac{${texNum(l - value)}}{${texNum(l)}}`,
        `${value} \\times \\frac{${texNum(l - value)}}{${texNum(l)}} &= ${inner}`,
        `\\frac{d${sym}}{dt} &= ${k} \\times ${inner} = ${dec(rate)}`,
      ),
    },
    {
      text:
        2 * value < l
          ? `$${value}$ is below half the ceiling, so the growth is still speeding up.`
          : `$${value}$ is above half the ceiling, so the growth is slowing down.`,
    },
  ];
}

/** The rate formula, filled in for this model. */
const expmLogisticRateTiles: Generator<LogRateParams> = {
  id: 'expm-logistic-rate-tiles',
  sample: sampleLogRate,
  render: (params): Slide => {
    const { p, a, ctx } = params;
    const story = logisticStory(ctx);
    const { sym } = story;
    const { l } = logRateNumbers(params);
    const k = dec(p / 100);
    const answer = [k, `\\frac{${sym}}{${texNum(l)}}`];
    return {
      kind: 'tiles',
      prompt: logisticPrompt(story, logRateModel(params), `Fill in the rate at which $${sym}$ grows, in terms of $${sym}$.`),
      template: `\\frac{d${sym}}{dt} = {0}${sym}(1 - {1})`,
      bank: fillBank(answer, [
        `-${k}`,
        String(p),
        String(a),
        `\\frac{${texNum(l)}}{${sym}}`,
        `\\frac{${sym}}{${a}}`,
        ...(l % 2 === 0 ? [`\\frac{${sym}}{${texNum(l / 2)}}`] : []),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { sym } = logisticStory(params.ctx);
    const { l } = logRateNumbers(params);
    return [
      { text: `The rate is $k${sym}\\left(1 - \\frac{${sym}}{L}\\right)$, with $k$ and $L$ read from the model; $A$ plays no part.` },
      { tex: `\\frac{d${sym}}{dt} = ${dec(params.p / 100)}${sym}\\left(1 - \\frac{${sym}}{${texNum(l)}}\\right)` },
    ];
  },
};

type LogRateAsk = 'at' | 'max';

/** The rate at a value, typed; at difficulty 2 sometimes the greatest rate, kL/4. */
const expmLogisticRateAt: Generator<LogRateParams & { ask: LogRateAsk }> = {
  id: 'expm-logistic-rate-at',
  sample: (rng, difficulty) => {
    const params = sampleLogRate(rng, difficulty);
    const { l } = logRateNumbers(params);
    const max = difficulty > 1 && (params.p * l) % 400 === 0 && rng.chance(0.4);
    return { ...params, ask: max ? 'max' : 'at' };
  },
  choices: (params) => {
    const { p } = params;
    const { l, value, inner, rate } = logRateNumbers(params);
    const correct = params.ask === 'max' ? (p * l) / 400 : rate;
    return numberOptions(correct, [inner, (p * value) / 100, 2 * rate, (p * (l - value)) / 100, (p * l) / 400, (p * l) / 200]);
  },
  render: (params): Slide => {
    const story = logisticStory(params.ctx);
    const { sym } = story;
    const { l, value, rate } = logRateNumbers(params);
    const question =
      params.ask === 'max'
        ? `What is the greatest rate at which $${sym}$ grows, in ${story.of} per ${story.unit}?`
        : `How fast is it growing, in ${story.of} per ${story.unit}, when $${sym} = ${value}$?`;
    return {
      kind: 'expression',
      prompt: logisticPrompt(story, logRateModel(params), question),
      lead: `\\frac{d${sym}}{dt} =`,
      keypad: [],
      answer: String(params.ask === 'max' ? (params.p * l) / 400 : rate),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    if (params.ask === 'at') return logRateSolution(params);
    const { sym } = logisticStory(params.ctx);
    const { l } = logRateNumbers(params);
    const k = dec(params.p / 100);
    return [
      { text: `The rate $k${sym}\\left(1 - \\frac{${sym}}{L}\\right)$ is greatest at half the ceiling, $${sym} = ${texNum(l / 2)}$.` },
      { tex: `${k} \\times ${texNum(l / 2)} \\times \\frac{1}{2} = ${dec((params.p * l) / 400)}` },
    ];
  },
};

/** Below or above half the ceiling, so speeding up or slowing down. */
const expmLogisticRateFlow: Generator<LogRateParams> = {
  id: 'expm-logistic-rate-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleLogRate(rng, difficulty);
      const { l, value } = logRateNumbers(params);
      if (l % 2 === 0 && 2 * value !== l) return params;
    }
  },
  render: (params): Slide => {
    const { n, i, p } = params;
    const story = logisticStory(params.ctx);
    const { sym } = story;
    const { l, value } = logRateNumbers(params);
    const below = 2 * value < l;
    const bracket = `\\frac{${n - i}}{${n}}`;
    const trend = (to: string) => ({
      id: to,
      ask: 'So is its growth speeding up or slowing down there?',
      branches: [
        {
          label: 'Speeding up',
          outcome: 'Below half the ceiling there is plenty of room left, and more to grow from each moment, so the rate rises.',
        },
        {
          label: 'Slowing down',
          outcome: 'Above half the ceiling the room left shrinks faster than the amount grows, so the rate falls.',
        },
      ],
    });
    return {
      kind: 'flow',
      prompt: logisticPrompt(
        story,
        logRateModel(params),
        `It grows at $\\frac{d${sym}}{dt} = ${dec(p / 100)}${sym}\\left(1 - \\frac{${sym}}{${texNum(l)}}\\right)$. Look at the moment $${sym} = ${value}$, one question at a time.`,
      ),
      subject: `${sym} = ${value}`,
      steps: [
        {
          id: 'bracket',
          ask: `At $${sym} = ${value}$, what is $1 - \\frac{${sym}}{${texNum(l)}}$?`,
          branches: turned(
            [
              { label: `$${bracket}$`, to: 'side' },
              { label: `$\\frac{${i}}{${n}}$`, outcome: `That is $\\frac{${sym}}{${texNum(l)}}$ itself, before taking it from $1$.` },
              { label: `$\\frac{${n}}{${n - i}}$`, outcome: 'That is upside down. The part of the ceiling left is less than $1$.' },
            ],
            `${n}-${i}-${params.r}-${p}`,
          ),
        },
        {
          id: 'side',
          ask: `Half the ceiling is $${texNum(l / 2)}$. Is $${sym} = ${value}$ below it or above it?`,
          branches: [
            { label: 'Below', to: 'below' },
            { label: 'Above', to: 'above' },
          ],
        },
        trend('below'),
        trend('above'),
      ],
      answer: [`$${bracket}$`, below ? 'Below' : 'Above', below ? 'Speeding up' : 'Slowing down'],
    };
  },
  solution: logRateSolution,
};

/** The rate at a value as a tree: the room left, P(1 - P/L), then the rate. */
const expmLogisticRateTree: Generator<LogRateParams> = {
  id: 'expm-logistic-rate-tree',
  sample: sampleLogRate,
  render: (params): Slide => {
    const { p } = params;
    const story = logisticStory(params.ctx);
    const { sym } = story;
    const { l, value, inner, rate } = logRateNumbers(params);
    const k = dec(p / 100);
    const L = texNum(l);
    const answer = [l - value, inner, rate].map(String);
    return {
      kind: 'tree',
      prompt: logisticPrompt(
        story,
        logRateModel(params),
        `It grows at $\\frac{d${sym}}{dt} = ${k}${sym}\\left(1 - \\frac{${sym}}{${L}}\\right)$. Find the rate when $${sym} = ${value}$: fill in $${L} - ${value}$, then $${value}\\left(1 - \\frac{${value}}{${L}}\\right)$, then the rate.`,
      ),
      expression: `${k} \\times ${value}\\left(1 - \\frac{${value}}{${L}}\\right)`,
      nodes: [
        { id: 'room', from: [] },
        { id: 'inner', from: ['room'] },
        { id: 'rate', from: ['inner'] },
      ],
      bank: treeBank(
        answer,
        [l / 2, l + value, value, 10 * rate, 2 * inner, (p * value) / 100].filter(Number.isInteger).map(String),
      ),
      answer,
    };
  },
  solution: logRateSolution,
};

/* ---------- Level 5, lesson 5: reaching a value ---------- */

function logReachSolution(params: LogValueParams): SolutionStep[] {
  const { b, h, j, m, ctx } = params;
  const { sym } = logisticStory(ctx);
  const l = logValueCeiling(params);
  const a = b ** j;
  const value = logValueAt(params);
  return [
    { text: `With $u = e^{${ktTex({ b, h, down: false })}} = ${uTex(b, h)}$, $${sym} = \\frac{${texNum(l)}u}{u + ${a}}$. Set it equal to $${texNum(value)}$ and clear the fraction:` },
    {
      tex: chain(
        `${texNum(l)}u &= ${texNum(value)}(u + ${a})`,
        `${texNum(l - value)}u &= ${texNum(a * value)}`,
        `u &= ${b ** m} = ${b}^{${m}}`,
      ),
    },
    { text: `$${uTex(b, h)} = ${b}^{${m}}$, ${timeFrom(m, h)}.` },
  ];
}

/** Solve P = value one step at a time, through u = e^(kt). */
const expmLogisticReachSteps: Generator<LogValueParams> = {
  id: 'expm-logistic-reach-steps',
  sample: sampleLogValue,
  render: (params): Slide => {
    const { b, h, j, m, ctx } = params;
    const story = logisticStory(ctx);
    const lv = logValueCeiling(params);
    const pv = logValueAt(params);
    const l = texNum(lv);
    const v = texNum(pv);
    const a = b ** j;
    const u = b ** m;
    return {
      kind: 'steps',
      prompt: logisticPrompt(
        story,
        logValueModel(params),
        `Find when $${story.sym} = ${v}$ one step at a time, with $u = ${uTex(b, h)}$: tap the step to do next, then choose what it gives.`,
      ),
      start: [logValueModel(params), '=', v],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: `${l}u = ${v}(u + ${a})`,
          bank: stepsBank([
            `${l}u = ${v}(u + ${a})`,
            `${l} = ${v}(u + ${a})`,
            `${l}u = ${v}u + ${a}`,
            `${l}u = ${v}(1 + ${a}u)`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `${texNum(lv - pv)}u = ${texNum(a * pv)}`,
          bank: stepsBank([
            `${texNum(lv - pv)}u = ${texNum(a * pv)}`,
            `${texNum(lv + pv)}u = ${texNum(a * pv)}`,
            `${texNum(lv - pv)}u = ${texNum(a + pv)}`,
            `${texNum(lv - pv)}u = ${v}`,
          ]),
        },
        { span: [0, 1], operator: 0, value: `u = ${u}`, bank: timeSteps(u, [a, b ** (m + 1), b * m], 'u') },
        { span: [0, 1], operator: 0, value: `t = ${m * h}`, bank: timeSteps(m * h, [m, h, u * h, (m + 1) * h]) },
      ],
    };
  },
  solution: logReachSolution,
};

/** The equation in u, then u itself, from tiles. */
const expmLogisticUTiles: Generator<LogValueParams> = {
  id: 'expm-logistic-u-tiles',
  sample: sampleLogValue,
  render: (params): Slide => {
    const { b, h, j, m, ctx } = params;
    const story = logisticStory(ctx);
    const lv = logValueCeiling(params);
    const pv = logValueAt(params);
    const a = b ** j;
    const answer = [texNum(lv - pv), texNum(a * pv), String(b ** m)];
    return {
      kind: 'tiles',
      prompt: logisticPrompt(
        story,
        logValueModel(params),
        `With $u = ${uTex(b, h)}$, $${story.sym} = ${texNum(pv)}$ clears to $(L - ${story.sym})u = A${story.sym}$. Fill in that equation, then $u$.`,
      ),
      template: '{0}u = {1}, \\quad u = {2}',
      bank: fillBank(answer, [texNum(lv + pv), texNum(pv), texNum(lv), texNum(a + pv), String(a), String(b ** (m + 1))]),
      answer,
    };
  },
  solution: logReachSolution,
};

/** Slide to the time the S-curve reaches a dashed value. */
const expmLogisticReachSlider: Generator<LogValueParams> = {
  id: 'expm-logistic-reach-slider',
  sample: sampleLogValue,
  render: (params): Slide => {
    const { b, h, j, m, ctx } = params;
    const story = logisticStory(ctx);
    const l = logValueCeiling(params);
    const value = logValueAt(params);
    const answer = m * h;
    const span = sliderSpan(answer, Math.max(answer + 3, Math.ceil(answer * 1.5), (2 * j + 1) * h));
    return {
      kind: 'slider',
      prompt: logisticPrompt(
        story,
        logValueModel(params),
        `The upper dashed line is its ceiling and the lower one is $${texNum(value)}$. Slide to the time at which $${story.sym}$ reaches $${texNum(value)}$.`,
      ),
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: 't = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: l * 1.15,
          curves: [{ f: logisticCurve(l, b ** j, Math.log(b) / h), accent: true }],
          horizontals: [l, value],
          label: `An S-shaped curve rising towards a dashed ceiling, with a second dashed line at ${value}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: logReachSolution,
};

/** The time to reach a value, typed. */
const expmLogisticWhen: Generator<LogValueParams> = {
  id: 'expm-logistic-when',
  sample: sampleLogValue,
  choices: ({ b, h, j, m }) => numberOptions(m * h, [m, h, j * h, b ** m * h, (m + 1) * h]),
  render: (params): Slide => {
    const story = logisticStory(params.ctx);
    return {
      kind: 'expression',
      prompt: logisticPrompt(story, logValueModel(params), `When does $${story.sym}$ reach $${texNum(logValueAt(params))}$?`),
      lead: 't =',
      keypad: [],
      answer: String(params.m * params.h),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: logReachSolution,
};

/* ---------- Level 6: continuous compounding ---------- */

/*
 * Money at a nominal rate paid in steps, then continuously. Every value a
 * learner computes stays exact and short. Anything typed or placed is
 * compounded twice a year with a whole percentage each half, so a year's
 * multiplier is a two-place decimal squared, four places at most, and a
 * balance on whole hundreds comes out in pounds and pence. Quarterly, monthly
 * and daily appear only where nothing is evaluated: which calculation, which
 * order, which offer, and there the step's rate stays a fraction. e is met as
 * the limit of (1 + x/n)^n with n at most 4, where every value is a fraction,
 * and a continuous amount stays exact as Ae^(rt).
 */

const ACCOUNTS = ['A savings account', 'A bond', 'A fixed-rate saver', 'A deposit account', 'An investment fund'];

/** Whole hundreds, so a year compounded twice lands on pounds and pence. */
const SAVINGS = [...READ_STARTS.filter((a) => a % 100 === 0), 1000, 1500, 2000, 2500, 5000];

/** Half-year rates as whole percentages: the easy ones square in the head. */
const HALF_EASY = [1, 2, 3, 4, 5, 10];
const HALF_HARD = [6, 7, 8, 9, 11, 12];

interface Schedule {
  n: number;
  word: string;
  label: string;
}

const SCHEDULES: Schedule[] = [
  { n: 1, word: 'yearly', label: 'Yearly' },
  { n: 2, word: 'twice a year', label: 'Twice a year' },
  { n: 4, word: 'quarterly', label: 'Quarterly' },
  { n: 12, word: 'monthly', label: 'Monthly' },
  { n: 365, word: 'daily', label: 'Daily' },
];

function scheduleOf(n: number): Schedule {
  return SCHEDULES.find((s) => s.n === n) ?? SCHEDULES[0];
}

/** The rate a year actually pays, as a decimal: n steps, or continuous when n is 0. */
function effectiveRate(r: number, n: number): number {
  return n === 0 ? Math.exp(r / 100) - 1 : (1 + r / 100 / n) ** n - 1;
}

/** An amount in pounds as TeX: whole pounds bare, otherwise to the penny. */
function money(x: number): string {
  const pence = Math.round(x * 100);
  return pence % 100 === 0 ? texNum(pence / 100) : (pence / 100).toFixed(2);
}

/** The same amount in prose, with its pound sign. */
function pounds(x: number): string {
  const pence = Math.round(x * 100);
  if (pence % 100 !== 0) return `£${(pence / 100).toFixed(2)}`;
  return `£${String(pence / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** p/q in lowest terms as TeX, a whole number bare. */
function fracOf(p: number, q: number): string {
  const g = gcd(p, q);
  return q / g === 1 ? String(p / g) : `\\frac{${p / g}}{${q / g}}`;
}

/** p/q in lowest terms for mathjs. */
function fracAnswer(p: number, q: number): string {
  const g = gcd(p, q);
  return q / g === 1 ? String(p / g) : `${p / g}/${q / g}`;
}

/** Years or months, whichever reads naturally. */
function spanWords(months: number): string {
  if (months % 12 !== 0) return `${months} months`;
  return months === 12 ? '1 year' : `${months / 12} years`;
}

/** e to a power, with e^1 written as e. */
function ePow(power: string): string {
  return power === '1' ? 'e' : `e^{${power}}`;
}

/* ---------- Level 6, lesson 1: compounding in steps ---------- */

interface HalfParams {
  a: number;
  /** The half-year rate as a whole percentage; the yearly rate is 2q. */
  q: number;
  ctx: number;
}

function sampleHalf(rng: Rng, difficulty: number): HalfParams {
  return {
    a: rng.pick(SAVINGS),
    q: rng.pick(difficulty > 1 ? HALF_HARD : HALF_EASY),
    ctx: rng.int(0, ACCOUNTS.length - 1),
  };
}

/** The whole year's multiplier, (1 + q/100)^2, exactly. */
function yearFactor(q: number): number {
  return (100 + q) ** 2 / 10000;
}

function halfBalance({ a, q }: HalfParams): number {
  return (a * (100 + q) ** 2) / 10000;
}

/** 800\left(1 + \frac{0.1}{2}\right)^{2}. */
function halfTex(a: number | string, q: number, power = '2'): string {
  const front = typeof a === 'number' ? texNum(a) : a;
  return `${front}\\left(1 + \\frac{${dec(q / 50)}}{2}\\right)^{${power}}`;
}

function halfOpening({ a, q, ctx }: HalfParams): string {
  return `${ACCOUNTS[ctx]} pays ${2 * q}% a year, compounded twice a year: ${q}% every six months. ${pounds(a)} is paid in.`;
}

function halfSolution(params: HalfParams): SolutionStep[] {
  const { a, q } = params;
  const balance = halfBalance(params);
  const yearly = (a * (100 + 2 * q)) / 100;
  return [
    {
      text: `${2 * q}% a year in two steps is ${q}% a step, $${dec(q / 100)}$ as a decimal, so each half year multiplies the balance by $${dec(1 + q / 100)}$.`,
    },
    {
      tex: chain(
        `${dec(1 + q / 100)}^{2} &= ${dec(yearFactor(q))}`,
        `${texNum(a)} \\times ${dec(yearFactor(q))} &= ${money(balance)}`,
      ),
    },
    {
      text: `Paid once a year, ${2 * q}% would give ${pounds(yearly)}. The extra ${pounds(balance - yearly)} is interest earned on the first half year's interest.`,
    },
  ];
}

/** A year compounded twice, as a tree: the step's rate, its multiplier, the year's, the balance. */
const expmStepTree: Generator<HalfParams> = {
  id: 'expm-step-tree',
  sample: sampleHalf,
  render: (params): Slide => {
    const { a, q } = params;
    const answer = [dec(q / 100), dec(1 + q / 100), dec(yearFactor(q)), money(halfBalance(params))];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${halfOpening(params)} Fill in the half-year rate as a decimal, its multiplier, the year's multiplier, then the balance after a year.`,
        },
      ],
      expression: halfTex(a, q),
      nodes: [
        { id: 'rate', from: [] },
        { id: 'step', from: ['rate'] },
        { id: 'year', from: ['step'] },
        { id: 'balance', from: ['year'] },
      ],
      bank: fillBank(answer, [
        dec(q / 50),
        dec(1 + q / 50),
        dec(2 * (1 + q / 100)),
        money((a * (100 + 2 * q)) / 100),
        money(2 * a * (1 + q / 100)),
      ]),
      answer,
    };
  },
  solution: halfSolution,
};

type StepWorkParams = HalfParams & { back: boolean };

/**
 * The same year worked as a line of steps. At difficulty 2 it runs backwards:
 * the balance is given and the amount paid in is found.
 */
const expmStepWorkSteps: Generator<StepWorkParams> = {
  id: 'expm-step-work-steps',
  sample: (rng, difficulty) => {
    const back = difficulty > 1;
    return { ...sampleHalf(rng, 1), q: rng.pick(back ? [...HALF_EASY, ...HALF_HARD] : HALF_EASY), back };
  },
  render: (params): Slide => {
    const { a, q, back } = params;
    const m = dec(1 + q / 100);
    const f = dec(yearFactor(q));
    const balance = halfBalance(params);
    const bracket = `\\left(1 + \\frac{${dec(q / 50)}}{2}\\right)^{2}`;
    const square = {
      span: [2, 3] as [number, number],
      operator: 2,
      value: `${m}^{2}`,
      bank: stepsBank([`${m}^{2}`, `${dec(1 + q / 50)}^{2}`, `${dec(1 + q / 10)}^{2}`, `${m}^{4}`]),
    };
    const multiply = {
      span: [2, 3] as [number, number],
      operator: 2,
      value: f,
      bank: stepsBank([f, dec(1 + q / 50), dec(2 * (1 + q / 100)), dec(1 + (q / 100) ** 2)]),
    };
    if (!back) {
      return {
        kind: 'steps',
        prompt: [
          {
            kind: 'prose',
            text: `${halfOpening(params)} Work out the balance after one year one step at a time: tap the step to do next, then choose what it gives.`,
          },
        ],
        start: [texNum(a), '\\times', bracket],
        reductions: [
          square,
          multiply,
          {
            span: [0, 3],
            operator: 1,
            value: money(balance),
            bank: stepsBank([
              money(balance),
              money((a * (100 + 2 * q)) / 100),
              money(2 * a * (1 + q / 100)),
              money(a + yearFactor(q)),
            ]),
          },
        ],
      };
    }
    const total = money(balance);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${ACCOUNTS[params.ctx]} pays ${2 * q}% a year, compounded twice a year. After one year the balance is ${pounds(balance)}. Find $P$, the amount paid in, one step at a time.`,
        },
      ],
      start: ['P', '\\times', bracket, '=', total],
      reductions: [
        square,
        multiply,
        {
          span: [0, 5],
          operator: 1,
          value: `P = ${total} \\div ${f}`,
          bank: stepsBank([
            `P = ${total} \\div ${f}`,
            `P = ${total} \\times ${f}`,
            `P = ${total} - ${f}`,
            `P = ${f} \\div ${total}`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `P = ${texNum(a)}`,
          bank: stepsBank([
            `P = ${texNum(a)}`,
            `P = ${money(balance - a)}`,
            `P = ${texNum(a + 100)}`,
            `P = ${money(balance * yearFactor(q))}`,
          ]),
        },
      ],
    };
  },
  solution: (params) => {
    const steps = halfSolution(params);
    if (!params.back) return steps;
    const f = dec(yearFactor(params.q));
    return [
      steps[0],
      {
        tex: chain(
          `P \\times ${f} &= ${money(halfBalance(params))}`,
          `P &= ${money(halfBalance(params))} \\div ${f}`,
          `&= ${texNum(params.a)}`,
        ),
      },
      { text: 'Working backwards divides by the year\'s multiplier, the one step that undoes multiplying by it.' },
    ];
  },
};

type StepAmountParams = HalfParams & { interest: boolean };

/** Type the balance after a year compounded twice, or at difficulty 2 the interest it earns. */
const expmStepAmount: Generator<StepAmountParams> = {
  id: 'expm-step-amount',
  sample: (rng, difficulty) => ({
    ...sampleHalf(rng, 1),
    q: rng.pick(difficulty > 1 ? [...HALF_EASY, ...HALF_HARD] : HALF_EASY),
    interest: difficulty > 1,
  }),
  render: (params): Slide => {
    const balance = halfBalance(params);
    const ask = params.interest
      ? 'How much interest does it earn in the year, in pounds?'
      : 'How much is in the account after one year, in pounds?';
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${halfOpening(params)} ${ask}` }],
      lead: params.interest ? '\\text{interest} =' : '\\text{balance} =',
      keypad: [],
      answer: dec(params.interest ? balance - params.a : balance),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const steps = halfSolution(params);
    if (!params.interest) return steps;
    return [
      ...steps.slice(0, 2),
      { text: `The interest is what was added: ${pounds(halfBalance(params))} $-$ ${pounds(params.a)} $=$ ${pounds(halfBalance(params) - params.a)}.` },
    ];
  },
};

interface CalcParams {
  a: number;
  r: number;
  n: number;
  t: number;
  ctx: number;
}

/** Which calculation gives the balance: n steps a year for t years is nt steps. */
const expmStepCalc: Generator<CalcParams> = {
  id: 'expm-step-calc',
  sample: (rng, difficulty) => {
    const n = rng.pick(difficulty > 1 ? [4, 12, 365] : [2, 4]);
    return {
      a: rng.pick(READ_STARTS),
      r: rng.pick(READ_PERCENTS),
      n,
      t: rng.int(2, n === 365 ? 3 : difficulty > 1 ? 8 : 5),
      ctx: rng.int(0, ACCOUNTS.length - 1),
    };
  },
  render: ({ a, r, n, t, ctx }): Slide => {
    const R = dec(r / 100);
    const step = `\\frac{${R}}{${n}}`;
    const body = (inside: string, power: string) => `${texNum(a)}\\left(1 + ${inside}\\right)^{${power}}`;
    const right = body(step, String(n * t));
    const slips = [
      body(step, String(t)),
      body(R, String(n * t)),
      body(step, String(n)),
      `${body(step, String(n))} \\times ${t}`,
      body(step, `\\frac{${t}}{${n}}`),
    ];
    const labels = [right, ...[...new Set(slips)].filter((label) => label !== right).slice(0, 3)];
    const ordered = turned(labels, labels.join('|'));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${ACCOUNTS[ctx]} pays ${r}% a year, compounded ${scheduleOf(n).word}. ${pounds(a)} is paid in. Which calculation gives the balance after ${t} years?`,
        },
      ],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
      correctId: `opt${ordered.indexOf(right)}`,
    };
  },
  solution: ({ a, r, n, t }) => {
    const R = dec(r / 100);
    return [
      { text: `Paid ${scheduleOf(n).word}, each step pays $\\frac{${R}}{${n}}$ of the balance, so it multiplies by $1 + \\frac{${R}}{${n}}$.` },
      { text: `There are ${n} steps a year, so ${t} years is $${n} \\times ${t} = ${n * t}$ steps.` },
      { tex: `${texNum(a)}\\left(1 + \\frac{${R}}{${n}}\\right)^{${n * t}}` },
    ];
  },
};

/* ---------- Level 6, lesson 2: more often, more money ---------- */

interface OftenFlowParams {
  r: number;
  /** The less frequent schedule, as steps a year. */
  lo: number;
  /** The more frequent one. */
  hi: number;
  /** At difficulty 2 the rarer offer pays yearly at a higher rate, r + gap. */
  gap: number;
  ctx: number;
}

/** Two offers, one fork at a time: which compounds more often, which ends ahead, by how much. */
const expmOftenFlow: Generator<OftenFlowParams> = {
  id: 'expm-often-flow',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      return {
        r: rng.pick(READ_PERCENTS.filter((p) => p <= 12)),
        lo: 1,
        hi: rng.pick([4, 12, 365]),
        gap: rng.pick([1, 2]),
        ctx: rng.int(0, ACCOUNTS.length - 1),
      };
    }
    const [lo, hi] = rng.sample(SCHEDULES, 2).map((s) => s.n).sort((x, y) => x - y);
    return { r: rng.pick(READ_PERCENTS), lo, hi, gap: 0, ctx: rng.int(0, ACCOUNTS.length - 1) };
  },
  render: ({ r, lo, hi, gap, ctx }): Slide => {
    const rare = scheduleOf(lo);
    const often = scheduleOf(hi);
    const key = `${r}-${lo}-${hi}-${gap}-${ctx}`;
    const extra = dec(Math.round(effectiveRate(r, hi) * 10000 - r * 100) / 100);
    if (gap === 0) {
      return {
        kind: 'flow',
        prompt: [
          {
            kind: 'prose',
            text: `${ACCOUNTS[ctx]} offers ${r}% a year, and you choose whether it is compounded ${rare.word} or ${often.word}. Decide one question at a time.`,
          },
        ],
        subject: `${r}\\% \\text{: ${rare.word} or ${often.word}}`,
        steps: [
          {
            id: 'often',
            ask: 'Which adds interest to the balance more often?',
            branches: turned(
              [
                { label: often.label, to: 'more' },
                { label: rare.label, outcome: `${rare.label} pays ${lo === 1 ? 'once' : `${lo} times`} a year, ${often.word} ${hi} times.` },
                { label: 'Neither', outcome: 'The yearly rate is the same, but the number of steps it is paid in is not.' },
              ],
              key,
            ),
          },
          {
            id: 'more',
            ask: 'Both pay the same yearly rate. Which ends the year with more?',
            branches: turned(
              [
                { label: often.label, to: 'much' },
                { label: rare.label, outcome: 'Paying less often means each payment is bigger, but the money waits longer before it earns anything itself.' },
                { label: 'They end level', outcome: 'Interest paid earlier starts earning interest of its own, so the two do not end level.' },
              ],
              `${key}-more`,
            ),
          },
          {
            id: 'much',
            ask: `Roughly how much more does ${often.word} add over the year?`,
            branches: [
              { label: 'A little', outcome: `Right: at ${r}% a year the gap is only the interest on the interest, a small part of the total.` },
              {
                label: hi / lo === 2 ? 'About twice as much' : `About ${Math.round(hi / lo)} times as much`,
                outcome: 'The rate is the same. More steps split the same rate into smaller pieces, so only the interest on the interest is extra.',
              },
            ],
          },
        ],
        answer: [often.label, often.label, 'A little'],
      };
    }
    const high = `${r + gap}% yearly`;
    const low = `${r}% ${often.word}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${ACCOUNTS[ctx]} offers either ${r}% a year compounded ${often.word}, or ${r + gap}% a year paid once, yearly. Decide one question at a time.`,
        },
      ],
      subject: `${r}\\% \\text{ ${often.word} or } ${r + gap}\\% \\text{ yearly}`,
      steps: [
        {
          id: 'rate',
          ask: 'Which has the higher yearly rate?',
          branches: turned(
            [
              { label: high, to: 'gain' },
              { label: low, outcome: `${r}% is the lower rate; compounding ${often.word} is how it is paid, not a higher rate.` },
            ],
            key,
          ),
        },
        {
          id: 'gain',
          ask: `Compounding ${often.word} adds interest on the interest. At ${r}%, is that worth ${gap === 1 ? 'a whole percentage point' : `${gap} whole percentage points`}?`,
          branches: [
            { label: 'No, less than that', to: 'end' },
            { label: 'Yes, at least that', outcome: `Compounding ${often.word} at ${r}% adds only about ${extra} of a percentage point.` },
          ],
        },
        {
          id: 'end',
          ask: 'So which ends the year ahead?',
          branches: turned(
            [
              { label: high, outcome: `Right: ${r}% ${often.word} pays about ${dec(r + Number(extra))}% over the year, less than ${r + gap}%.` },
              { label: low, outcome: `Compounding adds about ${extra} of a point, not enough to make up ${gap === 1 ? 'a whole point' : `${gap} points`}.` },
            ],
            `${key}-end`,
          ),
        },
      ],
      answer: [high, 'No, less than that', high],
    };
  },
  solution: ({ r, lo, hi, gap }) => {
    const often = scheduleOf(hi);
    const gain = dec(Math.round(effectiveRate(r, hi) * 10000) / 100);
    if (gap === 0) {
      return [
        { text: `Compounded ${often.word}, interest is added ${hi} times a year against ${lo === 1 ? 'once' : `${lo} times`}, so it starts earning interest of its own sooner.` },
        { text: `So ${often.word} ends ahead, but only a little: over a year it pays about ${gain}% against ${dec(Math.round(effectiveRate(r, lo) * 10000) / 100)}%.` },
      ];
    }
    return [
      { text: `${r}% compounded ${often.word} pays about ${gain}% over a year.` },
      { text: `That is less than ${r + gap}% paid yearly: compounding adds a fraction of a point, and the other offer is ${gap === 1 ? 'a whole point' : `${gap} points`} higher.` },
    ];
  },
};

interface OrderParams {
  a: number;
  /** Four offers: yearly rate and steps a year. */
  offers: { r: number; n: number }[];
}

function offerLabel({ r, n }: { r: number; n: number }, mixed: boolean): string {
  const word = scheduleOf(n).word;
  return mixed ? `${r}% ${word}` : word;
}

/** Put four offers in order of what they pay after a year. */
const expmOftenOrder: Generator<OrderParams> = {
  id: 'expm-often-order',
  sample: (rng, difficulty) => {
    const a = rng.pick(READ_STARTS);
    if (difficulty > 1) {
      const r = rng.pick([2, 3, 4, 5, 6, 8, 10]);
      const [n1, n2] = rng.sample(SCHEDULES, 2).map((s) => s.n);
      const [n3, n4] = rng.sample(SCHEDULES, 2).map((s) => s.n);
      return {
        a,
        offers: [
          { r, n: Math.max(n1, n2) },
          { r: r + 1, n: Math.min(n3, n4) },
          { r, n: Math.min(n1, n2) },
          { r: r + 1, n: Math.max(n3, n4) },
        ],
      };
    }
    const r = rng.pick(READ_PERCENTS);
    const picked = rng.sample(SCHEDULES, 4).map((s) => s.n);
    // Listed in a hashed order rather than smallest first, so the prompt does not give the answer.
    return { a, offers: turned(picked, `${a}-${r}-${picked.join('')}`).map((n) => ({ r, n })) };
  },
  render: ({ a, offers }): Slide => {
    const mixed = new Set(offers.map((o) => o.r)).size > 1;
    const sorted = [...offers].sort((x, y) => effectiveRate(x.r, x.n) - effectiveRate(y.r, y.n));
    const list = (items: { r: number; n: number }[]) => {
      const text = items.map((o) => offerLabel(o, mixed)).join(', ');
      return text.charAt(0).toUpperCase() + text.slice(1);
    };
    const right = list(sorted);
    const swap = (i: number, j: number) => {
      const out = [...sorted];
      [out[i], out[j]] = [out[j], out[i]];
      return list(out);
    };
    const byFrequency = list([...offers].sort((x, y) => x.n - y.n || x.r - y.r));
    const slips = [...(mixed ? [byFrequency] : []), list([...sorted].reverse()), swap(1, 2), swap(0, 1), swap(2, 3)];
    const labels = [right, ...[...new Set(slips)].filter((label) => label !== right).slice(0, 3)];
    const ordered = turned(labels, labels.join('|'));
    const rate = offers[0].r;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: mixed
            ? `You have ${pounds(a)} to put away for a year and four offers: ${offers.map((o) => offerLabel(o, true)).join(', ')}. Which list runs from the offer that pays least to the one that pays most?`
            : `${pounds(a)} is put away for a year at ${rate}% a year. It could be compounded ${offers.map((o) => scheduleOf(o.n).word).join(', ')}. Which list runs from the smallest balance after a year to the largest?`,
        },
      ],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${ordered.indexOf(right)}`,
    };
  },
  solution: ({ offers }) => {
    const mixed = new Set(offers.map((o) => o.r)).size > 1;
    const sorted = [...offers].sort((x, y) => effectiveRate(x.r, x.n) - effectiveRate(y.r, y.n));
    const paid = sorted.map((o) => `${offerLabel(o, true)} pays about ${dec(Math.round(effectiveRate(o.r, o.n) * 10000) / 100)}%`).join('; ');
    return [
      {
        text: mixed
          ? 'Compounding more often adds only a small part of a percentage point here, so the higher yearly rate comes first; within one rate, more often pays more.'
          : 'At one yearly rate, the more often it is compounded, the more it pays.',
      },
      { text: `Over a year: ${paid}.` },
    ];
  },
};

interface OftenTilesParams {
  a: number;
  q: number;
  /** Months left in; 0 at difficulty 2 asks for the balance after t years in general. */
  months: number;
  ctx: number;
}

/** Build A(1 + r/2)^(2t) from a story, for a whole number of half years or for t. */
const expmOftenTiles: Generator<OftenTilesParams> = {
  id: 'expm-often-tiles',
  sample: (rng, difficulty) => ({
    a: rng.pick(READ_STARTS),
    q: rng.pick(difficulty > 1 ? [...HALF_EASY, ...HALF_HARD] : HALF_EASY),
    months: difficulty > 1 ? rng.pick([0, 18, 30, 42]) : 12 * rng.int(2, 6),
    ctx: rng.int(0, ACCOUNTS.length - 1),
  }),
  render: ({ a, q, months, ctx }): Slide => {
    const R = dec(q / 50);
    const power = months === 0 ? '2t' : String(months / 6);
    const years = months === 0 ? 't' : dec(months / 12);
    const bracket = (inside: string, p: string) => `\\left(1 + ${inside}\\right)^{${p}}`;
    const half = `\\frac{${R}}{2}`;
    const answer = [texNum(a), bracket(half, power)];
    const when = months === 0 ? 'after $t$ years' : `after ${spanWords(months)}`;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${ACCOUNTS[ctx]} pays ${2 * q}% a year, compounded twice a year. ${pounds(a)} is paid in. Build the balance $B$ ${when}.`,
        },
      ],
      template: 'B = {0}\\,{1}',
      bank: fillBank(answer, [
        bracket(half, years),
        bracket(R, power),
        bracket(`\\frac{2}{${R}}`, power),
        ...(months === 0 ? [bracket(half, '\\frac{t}{2}')] : [bracket(half, String(months))]),
        texNum(2 * a),
      ]),
      answer,
    };
  },
  solution: ({ a, q, months }) => {
    const R = dec(q / 50);
    const steps = months === 0 ? '2t' : String(months / 6);
    return [
      { text: `Twice a year, each step multiplies by $1 + \\frac{${R}}{2}$.` },
      {
        text:
          months === 0
            ? 'In $t$ years there are $2t$ half years, so that is the power.'
            : `${spanWords(months)} is ${months / 6} half years, so that is the power.`,
      },
      { tex: `B = ${halfTex(a, q, steps)}` },
    ];
  },
};

/** How much more twice a year pays than yearly: the interest on the first half's interest. */
const expmOftenGainTree: Generator<HalfParams> = {
  id: 'expm-often-gain-tree',
  sample: sampleHalf,
  render: (params): Slide => {
    const { a, q } = params;
    const balance = halfBalance(params);
    const yearly = (a * (100 + 2 * q)) / 100;
    const answer = [dec(yearFactor(q)), money(balance), money(yearly), money(balance - yearly)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${halfOpening(params)} How much more is that than ${2 * q}% paid once a year? Fill in the year's multiplier, the balance compounded twice, the balance paid yearly, then the difference.`,
        },
      ],
      expression: `${texNum(a)} \\times ${dec(1 + q / 100)}^{2} - ${texNum(a)} \\times ${dec(1 + q / 50)}`,
      nodes: [
        { id: 'factor', from: [] },
        { id: 'twice', from: ['factor'] },
        { id: 'yearly', from: [] },
        { id: 'gain', from: ['twice', 'yearly'] },
      ],
      bank: fillBank(answer, [
        dec(1 + q / 50),
        money(2 * a * (1 + q / 100)),
        money(balance - a),
        money((a * q) / 100),
        money(a * (1 + q / 100)),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, q } = params;
    const balance = halfBalance(params);
    const yearly = (a * (100 + 2 * q)) / 100;
    return [
      { tex: chain(`${dec(1 + q / 100)}^{2} &= ${dec(yearFactor(q))}`, `${texNum(a)} \\times ${dec(yearFactor(q))} &= ${money(balance)}`) },
      { tex: `${texNum(a)} \\times ${dec(1 + q / 50)} = ${money(yearly)}` },
      {
        text: `The difference, ${pounds(balance - yearly)}, is ${q}% interest on the ${pounds((a * q) / 100)} paid after six months.`,
      },
    ];
  },
};

/* ---------- Level 6, lesson 3: e as a limit ---------- */

interface BernoulliParams {
  /** Steps a year. */
  n: number;
  /** The yearly rate as a whole multiple of 100%. */
  x: number;
  /** The amount paid in over n^n. */
  k: number;
  ctx: number;
}

const STEP_PERIODS: Record<number, string> = { 2: 'six months', 3: 'four months', 4: 'three months' };

function sampleBernoulli(rng: Rng, difficulty: number): BernoulliParams {
  return { n: rng.pick([2, 3, 4]), x: difficulty > 1 ? 2 : 1, k: rng.int(1, 12), ctx: rng.int(0, ACCOUNTS.length - 1) };
}

function bernoulliStart({ n, k }: BernoulliParams): number {
  return k * n ** n;
}

function bernoulliEnd(params: BernoulliParams): number {
  const { n, x } = params;
  return (bernoulliStart(params) * (n + x) ** n) / n ** n;
}

function bernoulliOpening(params: BernoulliParams, paid = true): string {
  const { n, x, ctx } = params;
  const grows = x % n === 0 ? `multiplies by ${1 + x / n}` : `grows by $${fracOf(x, n)}$ of itself`;
  const paidIn = paid ? ` ${pounds(bernoulliStart(params))} is paid in.` : '';
  return `${ACCOUNTS[ctx]} pays ${100 * x}% a year, compounded in ${n} equal steps: every ${STEP_PERIODS[n]} the balance ${grows}.${paidIn}`;
}

function bernoulliTex({ n, x }: BernoulliParams): string {
  return `\\left(1 + \\frac{${x}}{${n}}\\right)^{${n}}`;
}

function bernoulliSolution(params: BernoulliParams): SolutionStep[] {
  const { n, x } = params;
  const start = bernoulliStart(params);
  return [
    { text: `Each step multiplies by $1 + \\frac{${x}}{${n}} = ${fracOf(n + x, n)}$, and there are ${n} steps in the year.` },
    {
      tex: chain(
        `${bernoulliTex(params)} &= \\frac{${n + x}^{${n}}}{${n}^{${n}}} = ${fracOf((n + x) ** n, n ** n)}`,
        `${texNum(start)} \\times ${fracOf((n + x) ** n, n ** n)} &= ${texNum(bernoulliEnd(params))}`,
      ),
    },
    { text: `Paid once a year, ${100 * x}% would give only ${pounds(start * (1 + x))}.` },
  ];
}

/** P(1 + x/n)^n as a tree: the step's multiplier, the year's, then the balance. */
const expmBernoulliTree: Generator<BernoulliParams> = {
  id: 'expm-bernoulli-tree',
  sample: sampleBernoulli,
  render: (params): Slide => {
    const { n, x } = params;
    const start = bernoulliStart(params);
    const answer = [fracOf(n + x, n), fracOf((n + x) ** n, n ** n), texNum(bernoulliEnd(params))];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${bernoulliOpening(params)} Fill in what each step multiplies by, what the year multiplies by, then the balance after a year.`,
        },
      ],
      expression: `${texNum(start)}${bernoulliTex(params)}`,
      nodes: [
        { id: 'step', from: [] },
        { id: 'year', from: ['step'] },
        { id: 'balance', from: ['year'] },
      ],
      bank: fillBank(answer, [
        fracOf(n, n + x),
        fracOf(x, n),
        fracOf((n + x) ** n, n),
        ...(n === 2 ? [] : [fracOf((n + x) ** 2, n ** 2)]),
        texNum(start * (1 + x)),
        texNum((start * (n + x)) / n),
      ]),
      answer,
    };
  },
  solution: bernoulliSolution,
};

/** The same year backwards: the balance is given, so the amount paid in is found. */
const expmBernoulliBackSteps: Generator<BernoulliParams> = {
  id: 'expm-bernoulli-back-steps',
  sample: sampleBernoulli,
  render: (params): Slide => {
    const { n, x } = params;
    const start = bernoulliStart(params);
    const end = texNum(bernoulliEnd(params));
    const top = (n + x) ** n;
    const bottom = n ** n;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${bernoulliOpening(params, false)} After a year the balance is ${pounds(bernoulliEnd(params))}. Find $P$, the amount paid in, one step at a time.`,
        },
      ],
      start: ['P', '\\times', bernoulliTex(params), '=', end],
      reductions: [
        {
          span: [2, 3],
          operator: 2,
          value: `\\left(\\frac{${n + x}}{${n}}\\right)^{${n}}`,
          bank: stepsBank([
            `\\left(\\frac{${n + x}}{${n}}\\right)^{${n}}`,
            `\\left(\\frac{${x}}{${n}}\\right)^{${n}}`,
            `\\left(\\frac{${n}}{${n + x}}\\right)^{${n}}`,
            `\\left(\\frac{${x + 1}}{${n}}\\right)^{${n}}`,
          ]),
        },
        {
          span: [2, 3],
          operator: 2,
          value: fracOf(top, bottom),
          bank: stepsBank([fracOf(top, bottom), fracOf(top, n), fracOf(n + x, bottom), fracOf(bottom, top)]),
        },
        {
          span: [0, 5],
          operator: 1,
          value: `P = ${end} \\times ${fracOf(bottom, top)}`,
          bank: stepsBank([
            `P = ${end} \\times ${fracOf(bottom, top)}`,
            `P = ${end} \\times ${fracOf(top, bottom)}`,
            `P = ${end} - ${fracOf(top, bottom)}`,
            `P = ${end} \\div ${n}`,
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `P = ${texNum(start)}`,
          bank: stepsBank([
            `P = ${texNum(start)}`,
            `P = ${texNum(bernoulliEnd(params) - start)}`,
            `P = ${texNum(start * n)}`,
            `P = ${texNum(start + bottom)}`,
          ]),
        },
      ],
    };
  },
  solution: (params) => {
    const { n, x } = params;
    const power = fracOf((n + x) ** n, n ** n);
    return [
      { tex: `${bernoulliTex(params)} = \\left(\\frac{${n + x}}{${n}}\\right)^{${n}} = ${power}` },
      { text: `So $P \\times ${power} = ${texNum(bernoulliEnd(params))}$. Dividing by a fraction is multiplying by it upside down.` },
      { tex: `P = ${texNum(bernoulliEnd(params))} \\times ${fracOf(n ** n, (n + x) ** n)} = ${texNum(bernoulliStart(params))}` },
    ];
  },
};

interface EValueParams {
  x: number;
  n: number;
  say: number;
}

const E_VALUE_ASKS = ['Work it out exactly, as a fraction if it is not whole.', 'Give its exact value as a single fraction, or a whole number.'];

/** (1 + x/n)^n exactly, as a fraction: the values climbing towards e^x. */
const expmEValue: Generator<EValueParams> = {
  id: 'expm-e-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const x = rng.pick(difficulty > 1 ? [-3, -2, -1, 1, 2, 3] : [1, 2, 3, 4]);
      const n = rng.int(difficulty > 1 ? 2 : 1, 4);
      if (n + x > 0) return { x, n, say: rng.int(0, E_VALUE_ASKS.length - 1) };
    }
  },
  render: ({ x, n, say }): Slide => {
    const inner = `1 ${x < 0 ? '-' : '+'} \\frac{${Math.abs(x)}}{${n}}`;
    const how = n === 1 ? 'in one step' : `in ${n} equal steps`;
    const story =
      x < 0
        ? `£1 losing ${-100 * x}% a year, ${how}, shrinks to the value below.`
        : `£1 at ${100 * x}% a year, compounded ${how}, grows to the value below.`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${story} ${E_VALUE_ASKS[say]}` }],
      lead: `\\left(${inner}\\right)^{${n}} =`,
      keypad: [{ insert: '/' }],
      answer: fracAnswer((n + x) ** n, n ** n),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ x, n }) => [
    { text: 'Write the bracket as one fraction first.' },
    {
      tex: chain(
        `1 ${x < 0 ? '-' : '+'} \\frac{${Math.abs(x)}}{${n}} &= \\frac{${n + x}}{${n}}`,
        `\\left(\\frac{${n + x}}{${n}}\\right)^{${n}} &= \\frac{${(n + x) ** n}}{${n ** n}}${gcd((n + x) ** n, n ** n) > 1 ? ` = ${fracOf((n + x) ** n, n ** n)}` : ''}`,
      ),
    },
    { text: `As $n$ grows, $\\left(1 ${x < 0 ? '-' : '+'} \\frac{${Math.abs(x)}}{n}\\right)^{n}$ gets closer and closer to $${ePow(String(x))}$.` },
  ],
};

interface ELimitParams {
  a: number;
  x: number;
  t: number;
  ctx: number;
}

/** What the balance approaches as the steps become more and more frequent: Ae^(xt). */
const expmELimit: Generator<ELimitParams> = {
  id: 'expm-e-limit',
  sample: (rng, difficulty) => ({
    a: rng.pick(READ_STARTS),
    x: difficulty > 1 ? rng.pick([2, 3]) : 1,
    t: rng.int(1, 3),
    ctx: rng.int(0, ACCOUNTS.length - 1),
  }),
  render: ({ a, x, t, ctx }): Slide => {
    const A = texNum(a);
    const yearly = t === 1 ? `${A} \\times ${1 + x}` : `${A} \\times ${1 + x}^{${t}}`;
    const right = `${A}${ePow(String(x * t))}`;
    const slips = [
      yearly,
      `${A}${ePow(String(t))}`,
      `${A}${ePow(String(x))}`,
      '\\text{no limit: it grows for ever}',
      `${A}${ePow(String(x + t))}`,
    ];
    const labels = [right, ...[...new Set(slips)].filter((label) => label !== right).slice(0, 3)];
    const ordered = turned(labels, labels.join('|'));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${ACCOUNTS[ctx]} pays ${100 * x}% a year on ${pounds(a)}, compounded in more and more, smaller and smaller steps. What does the balance after ${t === 1 ? 'one year' : `${t} years`} get closer and closer to?`,
        },
      ],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
      correctId: `opt${ordered.indexOf(right)}`,
    };
  },
  solution: ({ a, x, t }) => [
    { text: `In $n$ steps a year, one year multiplies by $\\left(1 + \\frac{${x}}{n}\\right)^{n}$, which gets closer and closer to $${ePow(String(x))}$ but never passes it.` },
    {
      text:
        t === 1
          ? `One year multiplies by that once: $${ePow(String(x))}$.`
          : `${t} years multiply by it ${t} times: $\\left(${ePow(String(x))}\\right)^{${t}} = ${ePow(String(x * t))}$.`,
    },
    { tex: `${texNum(a)}${ePow(String(x * t))}` },
  ],
};

/* ---------- Level 6, lesson 4: continuous compounding ---------- */

interface ContParams {
  a: number;
  r: number;
  months: number;
  ctx: number;
}

function sampleCont(rng: Rng, difficulty: number, rates = READ_PERCENTS): ContParams {
  return {
    a: rng.pick(READ_STARTS),
    r: rng.pick(rates),
    // Every span is a multiple of three months, so r times the years is four places at most.
    months: difficulty > 1 ? rng.pick([6, 9, 18, 30, 42]) : 12 * rng.int(2, 6),
    ctx: rng.int(0, ACCOUNTS.length - 1),
  };
}

/** rt, the power of e: 0.05 for 5% over one year. */
function contPower({ r, months }: ContParams): string {
  return dec((r * months) / 1200);
}

function contOpening({ a, r, ctx }: ContParams): string {
  return `${ACCOUNTS[ctx]} pays ${r}% a year, compounded continuously. ${pounds(a)} is paid in.`;
}

function contSolution(params: ContParams): SolutionStep[] {
  const { a, r, months } = params;
  const t = dec(months / 12);
  return [
    { text: `Compounded continuously at ${r}%, the balance is $Ae^{rt}$ with $r = ${dec(r / 100)}$${months % 12 === 0 ? '' : ` and $t = ${t}$, since ${months} months is ${t} of a year`}.` },
    { tex: `${dec(r / 100)} \\times ${t} = ${contPower(params)}` },
    { tex: `B = ${texNum(a)}e^{${contPower(params)}}` },
  ];
}

/** Build Ae^(rt) from a story: the amount paid in, then e to the power rt. */
const expmContTiles: Generator<ContParams> = {
  id: 'expm-cont-tiles',
  sample: (rng, difficulty) => sampleCont(rng, difficulty),
  render: (params): Slide => {
    const { a, r, months } = params;
    const answer = [texNum(a), `e^{${contPower(params)}}`];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `${contOpening(params)} Build the balance $B$ after ${spanWords(months)}.` }],
      template: 'B = {0}\\,{1}',
      bank: fillBank(answer, [
        `e^{${dec(r / 100)}}`,
        `e^{${dec((r * months) / 12)}}`,
        `e^{${dec((r * months) / 100)}}`,
        `\\left(1 + ${dec(r / 100)}\\right)^{${dec(months / 12)}}`,
        texNum(a + r),
      ]),
      answer,
    };
  },
  solution: contSolution,
};

type ContExactParams = ContParams & { interest: boolean };

/** Type the continuous balance exactly, leaving e in it; at difficulty 2 sometimes the interest. */
const expmContExact: Generator<ContExactParams> = {
  id: 'expm-cont-exact',
  sample: (rng, difficulty) => ({ ...sampleCont(rng, difficulty), interest: difficulty > 1 && rng.chance(0.5) }),
  render: (params): Slide => {
    const { a, months, interest } = params;
    const power = contPower(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${contOpening(params)} ${interest ? 'How much interest does it earn' : 'What is the balance'} after ${spanWords(months)}? Give the exact value, leaving $e$ in it.`,
        },
      ],
      lead: interest ? '\\text{interest} =' : 'B =',
      keypad: EXP_KEYS,
      answer: interest ? `${a}*e^(${power}) - ${a}` : `${a}*e^(${power})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const steps = contSolution(params);
    if (!params.interest) return steps;
    const A = texNum(params.a);
    return [...steps, { text: `The interest is what was added: $${A}e^{${contPower(params)}} - ${A}$.` }];
  },
};

/** From (1 + r/n)^(nt) to e^(rt), one fork at a time, then how it compares. */
const expmContFlow: Generator<ContParams> = {
  id: 'expm-cont-flow',
  sample: (rng, difficulty) => sampleCont(rng, difficulty, difficulty > 1 ? READ_PERCENTS.filter((p) => p <= 12) : READ_PERCENTS),
  render: (params): Slide => {
    const { a, r, months, ctx } = params;
    const R = dec(r / 100);
    const t = dec(months / 12);
    const kt = contPower(params);
    const A = texNum(a);
    const key = `${a}-${r}-${months}-${ctx}`;
    const last =
      months % 12 === 0
        ? {
            id: 'compare',
            ask: `Is that more or less than compounding daily at ${r}%?`,
            branches: turned(
              [
                { label: 'More, but only a little', outcome: 'Right: daily is already very close to the limit, and continuous is the limit itself.' },
                { label: 'Less', outcome: 'Every extra step adds a little, and continuous is where the steps end up, so it pays the most.' },
                { label: 'A lot more', outcome: `Daily is already very close: at ${r}% the two differ by pennies in the pound.` },
              ],
              `${key}-compare`,
            ),
          }
        : {
            id: 'compare',
            ask: `Over a whole year, which pays more: this, or ${r + 1}% a year paid yearly?`,
            branches: turned(
              [
                { label: `${r + 1}% yearly`, outcome: `Right: continuous compounding at ${r}% pays about ${dec(Math.round(effectiveRate(r, 0) * 10000) / 100)}% a year, less than ${r + 1}%.` },
                { label: `${r}% continuously`, outcome: `Compounding adds less than a percentage point at ${r}%, not the whole point needed to beat ${r + 1}%.` },
              ],
              `${key}-compare`,
            ),
          };
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${contOpening(params)} In $n$ equal steps a year, the balance after ${spanWords(months)} would be $${A}\\left(1 + \\frac{${R}}{n}\\right)^{${t}n}$. Follow it as $n$ grows.`,
        },
      ],
      subject: `${A}\\left(1 + \\frac{${R}}{n}\\right)^{${t}n}`,
      steps: [
        {
          id: 'limit',
          ask: `As $n$ grows, what does $\\left(1 + \\frac{${R}}{n}\\right)^{${t}n}$ get closer to?`,
          branches: turned(
            [
              { label: `$e^{${kt}}$`, to: 'amount' },
              { label: `$e^{${R}}$`, outcome: `That is one year's growth. There are ${t} years, so the power of $e$ is $${R} \\times ${t}$.` },
              { label: `$\\left(1 + ${R}\\right)^{${t}}$`, outcome: 'That is compounding once a year, the fewest steps, not the limit of many.' },
              { label: 'No limit', outcome: 'Each extra step adds less than the one before, and the total levels off at a limit.' },
            ],
            key,
          ),
        },
        {
          id: 'amount',
          ask: 'So what is the balance, compounded continuously?',
          branches: turned(
            [
              { label: `$${A}e^{${kt}}$`, to: 'compare' },
              { label: `$${A} + e^{${kt}}$`, outcome: `$e^{${kt}}$ multiplies the amount paid in; it is not added to it.` },
              { label: `$e^{${kt}}$`, outcome: 'That is what each pound grows to. The balance is that times the amount paid in.' },
            ],
            `${key}-amount`,
          ),
        },
        last,
      ],
      answer: [`$e^{${kt}}$`, `$${A}e^{${kt}}$`, months % 12 === 0 ? 'More, but only a little' : `${r + 1}% yearly`],
    };
  },
  solution: (params) => [
    { text: `$\\left(1 + \\frac{${dec(params.r / 100)}}{n}\\right)^{n}$ gets closer and closer to $e^{${dec(params.r / 100)}}$, so ${spanWords(params.months)} of it gets closer to $e^{${dec(params.r / 100)} \\times ${dec(params.months / 12)}}$.` },
    ...contSolution(params).slice(1),
  ],
};

/** Many steps to e^(rt) as a line: regroup the power, take the limit, multiply out. */
const expmContSteps: Generator<ContParams> = {
  id: 'expm-cont-steps',
  sample: (rng, difficulty) => sampleCont(rng, difficulty),
  render: (params): Slide => {
    const { a, r, months } = params;
    const R = dec(r / 100);
    const t = dec(months / 12);
    const kt = contPower(params);
    const A = texNum(a);
    const inner = `\\left(1 + \\frac{${R}}{n}\\right)`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${contOpening(params)} In $n$ steps a year, the balance after ${spanWords(months)} is below. Take $n$ to be larger and larger, one step at a time.`,
        },
      ],
      start: [A, '\\times', `${inner}^{${t}n}`],
      reductions: [
        {
          span: [2, 3],
          operator: 2,
          value: `\\left(${inner}^{n}\\right)^{${t}}`,
          bank: stepsBank([
            `\\left(${inner}^{n}\\right)^{${t}}`,
            `${inner}^{n} \\times ${t}`,
            `${inner}^{n + ${t}}`,
          ]),
        },
        {
          span: [2, 3],
          operator: 2,
          value: `\\left(e^{${R}}\\right)^{${t}}`,
          bank: stepsBank([
            `\\left(e^{${R}}\\right)^{${t}}`,
            `\\left(1 + ${R}\\right)^{${t}}`,
            `${t}e^{${R}}`,
            `\\left(e^{${R}}\\right)^{n}`,
          ]),
        },
        {
          span: [2, 3],
          operator: 2,
          value: `e^{${kt}}`,
          bank: stepsBank([`e^{${kt}}`, `e^{${dec(r / 100 + months / 12)}}`, `e^{${R}}`, `e^{${dec((r * months) / 12)}}`]),
        },
        {
          span: [0, 3],
          operator: 1,
          value: `${A}e^{${kt}}`,
          bank: stepsBank([`${A}e^{${kt}}`, `${A} + e^{${kt}}`, `e^{${dec((a * r * months) / 1200)}}`, `${texNum(a * 2)}e^{${kt}}`]),
        },
      ],
    };
  },
  solution: (params) => {
    const R = dec(params.r / 100);
    const t = dec(params.months / 12);
    return [
      { text: `A power of a power multiplies: $\\left(1 + \\frac{${R}}{n}\\right)^{${t}n} = \\left(\\left(1 + \\frac{${R}}{n}\\right)^{n}\\right)^{${t}}$.` },
      { text: `As $n$ grows the inside gets closer to $e^{${R}}$, and $\\left(e^{${R}}\\right)^{${t}} = e^{${contPower(params)}}$.` },
      { tex: `B = ${texNum(params.a)}e^{${contPower(params)}}` },
    ];
  },
};

/* ---------- Level 6, lesson 5: the effective annual rate ---------- */

interface EffectiveParams {
  /** A continuous rate as a percentage, or the half-year rate q when twice a year. */
  p: number;
  continuous: boolean;
  ctx: number;
}

/** Type the effective annual rate: twice a year as a percentage, continuous exactly as e^k - 1. */
const expmEffective: Generator<EffectiveParams> = {
  id: 'expm-effective',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { p: rng.pick(READ_PERCENTS), continuous: true, ctx: rng.int(0, ACCOUNTS.length - 1) }
      : { p: rng.pick([...HALF_EASY, ...HALF_HARD]), continuous: false, ctx: rng.int(0, ACCOUNTS.length - 1) },
  render: ({ p, continuous, ctx }): Slide => {
    if (continuous) {
      return {
        kind: 'expression',
        prompt: [
          {
            kind: 'prose',
            text: `${ACCOUNTS[ctx]} pays ${p}% a year, compounded continuously. What is its effective annual rate, as a decimal? Give the exact value, leaving $e$ in it.`,
          },
        ],
        lead: '\\text{rate} =',
        keypad: EXP_KEYS,
        answer: `e^(${dec(p / 100)}) - 1`,
        domain: 'real',
        mode: 'exact',
      };
    }
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${ACCOUNTS[ctx]} pays ${2 * p}% a year, compounded twice a year. What is its effective annual rate: the percentage a balance really grows by in a year? Type the number without the % sign.`,
        },
      ],
      lead: '\\text{rate in } \\% =',
      keypad: [],
      answer: dec((yearFactor(p) - 1) * 100),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ p, continuous }) => {
    if (continuous) {
      return [
        { text: `Continuously at ${p}%, one year multiplies the balance by $e^{${dec(p / 100)}}$.` },
        { text: `The rate earned is what that adds to each pound: $e^{${dec(p / 100)}} - 1$, a little more than $${dec(p / 100)}$.` },
      ];
    }
    return [
      { tex: `${dec(1 + p / 100)}^{2} = ${dec(yearFactor(p))}` },
      { text: `So each pound grows by $${dec(yearFactor(p) - 1)}$ in a year: ${dec((yearFactor(p) - 1) * 100)}%, a little more than the ${2 * p}% it is quoted at.` },
    ];
  },
};

interface BestParams {
  a: number;
  r: number;
  /** Which offer wins: twice a year, yearly at a little more, or continuous. */
  winner: 'twice' | 'yearly' | 'continuous';
  ctx: number;
}

/** A yearly rate just below, and just above, what twice a year really pays at r. */
const BEST_DELTAS: Record<number, [number, number]> = {
  4: [0.02, 0.05],
  6: [0.05, 0.1],
  8: [0.1, 0.2],
  10: [0.2, 0.3],
  12: [0.3, 0.4],
};

function bestOffers({ r, winner }: BestParams): { label: string; rate: number; n: number }[] {
  const [low, high] = BEST_DELTAS[r];
  const yearly = dec(r + (winner === 'yearly' ? high : low));
  const continuous = winner === 'continuous' ? r : r - 1;
  return [
    { label: `${r}% a year, compounded twice a year`, rate: r, n: 2 },
    { label: `${yearly}% a year, paid yearly`, rate: Number(yearly), n: 1 },
    { label: `${continuous}% a year, compounded continuously`, rate: continuous, n: 0 },
  ];
}

/** Which of three offers pays the most, judged by effective annual rate. */
const expmEffectiveBest: Generator<BestParams> = {
  id: 'expm-effective-best',
  // Difficulty 1 is settled by twice a year against yearly, with continuous
  // well behind; difficulty 2 can make continuous at the same rate the winner.
  sample: (rng, difficulty) => {
    const params: BestParams = {
      a: rng.pick(READ_STARTS),
      r: rng.pick([4, 6, 8, 10, 12]),
      winner: rng.pick(difficulty > 1 ? (['twice', 'yearly', 'continuous'] as const) : (['twice', 'yearly'] as const)),
      ctx: rng.int(0, ACCOUNTS.length - 1),
    };
    const offers = bestOffers(params);
    const best = offers.reduce((x, y) => (effectiveRate(y.rate, y.n) > effectiveRate(x.rate, x.n) ? y : x));
    const expected = { twice: 2, yearly: 1, continuous: 0 }[params.winner];
    if (best.n !== expected) throw new Error(`expm-effective-best: ${best.label} beats the intended winner`);
    return params;
  },
  render: (params): Slide => {
    const offers = bestOffers(params);
    const right = offers.find((o) => o.n === { twice: 2, yearly: 1, continuous: 0 }[params.winner])!.label;
    const labels = offers.map((o) => o.label);
    const ordered = turned(labels, `${params.a}|${labels.join('|')}|${params.ctx}`);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `You have ${pounds(params.a)} to put away for a year, and ${ACCOUNTS[params.ctx].charAt(0).toLowerCase()}${ACCOUNTS[params.ctx].slice(1)} comes in three versions. Which pays the most?`,
        },
      ],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${ordered.indexOf(right)}`,
    };
  },
  solution: (params) => {
    const { r } = params;
    const offers = bestOffers(params);
    const [, yearly, continuous] = offers;
    return [
      { text: `Twice a year at ${r}%: $${dec(1 + r / 200)}^{2} = ${dec(yearFactor(r / 2))}$, so it really pays ${dec((yearFactor(r / 2) - 1) * 100)}%.` },
      { text: `Yearly at ${yearly.rate}% pays exactly ${yearly.rate}%.` },
      {
        text: `Continuously at ${continuous.rate}% pays $e^{${dec(continuous.rate / 100)}} - 1$, about ${dec(Math.round(effectiveRate(continuous.rate, 0) * 10000) / 100)}%${continuous.rate === r ? `, more than twice a year at the same ${r}%` : ': compounding adds less than a percentage point, so it cannot make up the point it starts behind'}.`,
      },
    ];
  },
};

/** Continuous rate k: the year's multiplier, the rate it pays, and how that compares with k. */
const expmEffectiveFlow: Generator<EffectiveParams> = {
  id: 'expm-effective-flow',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { p: rng.pick([...HALF_EASY, ...HALF_HARD]), continuous: false, ctx: rng.int(0, ACCOUNTS.length - 1) }
      : { p: rng.pick(READ_PERCENTS), continuous: true, ctx: rng.int(0, ACCOUNTS.length - 1) },
  render: ({ p, continuous, ctx }): Slide => {
    const key = `${p}-${continuous}-${ctx}`;
    if (continuous) {
      const k = dec(p / 100);
      return {
        kind: 'flow',
        prompt: [
          {
            kind: 'prose',
            text: `${ACCOUNTS[ctx]} pays ${p}% a year, compounded continuously, so $k = ${k}$. Find the rate it really pays in a year, one question at a time.`,
          },
        ],
        subject: `k = ${k}`,
        steps: [
          {
            id: 'factor',
            ask: 'In one year, each pound is multiplied by what?',
            branches: turned(
              [
                { label: `$e^{${k}}$`, to: 'rate' },
                { label: `$${dec(1 + p / 100)}$`, outcome: `That is ${p}% paid once a year. Continuously, one year multiplies by $e^{k}$.` },
                { label: `$e^{${p}}$`, outcome: `$k$ is the rate as a decimal, $${k}$, not the percentage ${p}.` },
              ],
              key,
            ),
          },
          {
            id: 'rate',
            ask: 'So what does each pound gain in a year, as a decimal?',
            branches: turned(
              [
                { label: `$e^{${k}} - 1$`, to: 'size' },
                { label: `$e^{${k}}$`, outcome: 'That is what each pound grows to. The gain is that less the pound itself.' },
                { label: `$${k}$`, outcome: `$${k}$ is the rate it is quoted at; compounding continuously makes it pay a little more.` },
              ],
              `${key}-rate`,
            ),
          },
          {
            id: 'size',
            ask: `Is $e^{${k}} - 1$ more or less than $${k}$?`,
            branches: [
              { label: 'More', outcome: `Right: about ${dec(Math.round(effectiveRate(p, 0) * 10000) / 10000)}, the interest on the interest on top of $${k}$.` },
              { label: 'Less', outcome: 'Interest earning interest can only add to a year, so it pays more than $k$.' },
              { label: 'The same', outcome: `It would be the same only if interest never earned interest; continuously, it always does.` },
            ],
          },
        ],
        answer: [`$e^{${k}}$`, `$e^{${k}} - 1$`, 'More'],
      };
    }
    const m = dec(1 + p / 100);
    const aer = dec((yearFactor(p) - 1) * 100);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${ACCOUNTS[ctx]} pays ${2 * p}% a year, compounded twice a year. Find the rate it really pays in a year, one question at a time.`,
        },
      ],
      subject: `${2 * p}\\% \\text{ a year, twice a year}`,
      steps: [
        {
          id: 'factor',
          ask: 'In one year, each pound is multiplied by what?',
          branches: turned(
            [
              { label: `$${m}^{2}$`, to: 'rate' },
              { label: `$${dec(1 + p / 50)}$`, outcome: `That is ${2 * p}% paid once. Twice a year is two steps of ${p}%.` },
              { label: `$${m} \\times 2$`, outcome: 'Two steps multiply twice; they do not double.' },
            ],
            key,
          ),
        },
        {
          id: 'rate',
          ask: `$${m}^{2} = ${dec(yearFactor(p))}$. What is the effective annual rate?`,
          branches: turned(
            [
              { label: `${aer}%`, outcome: `Right: each pound gains $${dec(yearFactor(p) - 1)}$, which is ${aer}%, a little more than ${2 * p}%.` },
              { label: `${dec(yearFactor(p) * 100)}%`, outcome: 'That counts the pound itself. The rate is only what is gained.' },
              { label: `${2 * p}%`, outcome: `${2 * p}% is the rate as quoted; compounding twice makes it pay a little more.` },
            ],
            `${key}-rate`,
          ),
        },
      ],
      answer: [`$${m}^{2}$`, `${aer}%`],
    };
  },
  solution: ({ p, continuous }) => {
    if (continuous) {
      return [
        { text: `Continuously at $k = ${dec(p / 100)}$, a year multiplies by $e^{${dec(p / 100)}}$.` },
        { text: `The rate is the gain on each pound, $e^{${dec(p / 100)}} - 1$, about ${dec(Math.round(effectiveRate(p, 0) * 10000) / 100)}%: more than ${p}%.` },
      ];
    }
    return [
      { tex: `${dec(1 + p / 100)}^{2} = ${dec(yearFactor(p))}` },
      { text: `Each pound gains $${dec(yearFactor(p) - 1)}$, an effective annual rate of ${dec((yearFactor(p) - 1) * 100)}%.` },
    ];
  },
};


interface MatchParams {
  /** p% paid yearly, or at difficulty 2 the half-year rate of 2p% twice a year. */
  p: number;
  twice: boolean;
  ctx: number;
}

/** Backwards: the continuous rate that grows a year as much as p% yearly, or 2p% twice a year. */
const expmEffectiveTiles: Generator<MatchParams> = {
  id: 'expm-effective-tiles',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { p: rng.pick([...HALF_EASY, ...HALF_HARD]), twice: true, ctx: rng.int(0, ACCOUNTS.length - 1) }
      : { p: rng.pick(READ_PERCENTS), twice: false, ctx: rng.int(0, ACCOUNTS.length - 1) },
  render: ({ p, twice, ctx }): Slide => {
    const m = dec(1 + p / 100);
    const quoted = twice ? `${2 * p}% a year, compounded twice a year` : `${p}% a year, paid yearly`;
    const answer = twice ? [`${m}^{2}`, `2\\ln ${m}`] : [m, `\\ln ${m}`];
    const slips = twice
      ? [`\\ln ${m}`, `\\ln ${dec(2 * (1 + p / 100))}`, dec(1 + p / 50), `\\ln ${dec(1 + p / 50)}`, `${m}^{\\frac{1}{2}}`]
      : [dec(p / 100), `\\ln ${dec(p / 100)}`, `e^{${m}}`, `e^{${dec(p / 100)}}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${ACCOUNTS[ctx]} pays ${quoted}. What continuous rate $k$ would grow a balance by exactly as much in a year? A year multiplies by $e^{k}$: build what that equals, then $k$.`,
        },
      ],
      template: 'e^{k} = {0} \\qquad k = {1}',
      bank: fillBank(answer, slips),
      answer,
    };
  },
  solution: ({ p, twice }) => {
    const m = dec(1 + p / 100);
    if (!twice) {
      return [
        { text: `${p}% paid yearly multiplies by $${m}$ in a year. Continuously at $k$ it multiplies by $e^{k}$.` },
        { tex: chain(`e^{k} &= ${m}`, `k &= \\ln ${m}`) },
        { text: `$\\ln ${m}$ is a little under $${dec(p / 100)}$: compounding continuously needs a slightly lower rate to keep up.` },
      ];
    }
    return [
      { text: `Twice a year at ${2 * p}%, a year multiplies by $${m}^{2}$.` },
      { tex: chain(`e^{k} &= ${m}^{2}`, `k &= \\ln ${m}^{2} = 2\\ln ${m}`) },
    ];
  },
};

/* ---------- Level 7: the limits of a model ---------- */

/*
 * A model against the data it was fitted to. Every table is built outward
 * from its answer: the model is drawn first, and each column of the table
 * sits at a whole number of the model's own steps, so every prediction is A
 * times a whole power of 2 or 3, or A divided by one. Then the residuals are
 * drawn whole and added on to make the measurements. So every residual,
 * largest residual, sum of squares and time is whole, and what a learner
 * works out is a power, a subtraction and a square.
 *
 * Nothing here is a derivative or an integral, so no slide declares `source`,
 * `integrand` or `limits`: the oracles in generators.test.ts have nothing to
 * check. exponentialModels.test.ts reads the model and the table back out of
 * every prompt instead and works each answer out again.
 */

/** A fair fit scatters small residuals; a drift is one sign, growing; a leave fits, then does not. */
type DataShape = 'fair' | 'drift' | 'leave';

interface DataParams extends Rate {
  a: number;
  /** Columns sit this many steps of h apart: 1, or 2 to leave a whole time between them. */
  gap: number;
  /** Observed minus predicted, one per column of the table. */
  res: number[];
  /** The first column where the data leaves the model; 0 when it never does. */
  from: number;
  /** How far the data may stray before it counts as leaving; 0 when unused. */
  margin: number;
  ctx: number;
}

/** The model's value at t = m h: a whole power of b times A, or A over one. */
function predictAt({ a, b, down }: DataParams, m: number): number {
  return down ? a / b ** m : a * b ** m;
}

function dataPredicted(params: DataParams): number[] {
  return params.res.map((_, i) => predictAt(params, i * params.gap));
}

function dataObserved(params: DataParams): number[] {
  return dataPredicted(params).map((value, i) => value + params.res[i]);
}

function dataTimes({ res, gap, h }: DataParams): number[] {
  return res.map((_, i) => i * gap * h);
}

function lastTime(params: DataParams): number {
  return (params.res.length - 1) * params.gap * params.h;
}

/** "every hour", "every 5 hours". */
function everyUnit(step: number, unit: string): string {
  return step === 1 ? `every ${unit}` : `every ${step} ${unit}s`;
}

/** kt at a number t, as it sits in the power: 3\ln 2, \frac{\ln 2}{5} \times 15. */
function kAtTex({ b, h, down }: Rate, t: number): string {
  const size = h === 1 ? mLnTex(t, b) : `\\frac{\\ln ${b}}{${h}} \\times ${t}`;
  return down ? `-${size}` : size;
}

/** m\ln b, with 1\ln b written \ln b. */
function mLnTex(m: number, b: number): string {
  return m === 1 ? `\\ln ${b}` : `${m}\\ln ${b}`;
}

/** kt at t = m h, worked down to a whole multiple of ln b: \frac{\ln 2}{5} \times 15 = 3\ln 2. */
function kWorkedTex(rate: Rate, m: number): string {
  const t = m * rate.h;
  const whole = `${rate.down ? '-' : ''}${mLnTex(m, rate.b)}`;
  return rate.h === 1 ? whole : `${kAtTex(rate, t)} = ${whole}`;
}

/** e^{kt} at t = m h: b^m, or 1 over it for a decay. */
function factorTex({ b, down }: Rate, m: number): string {
  return down ? `\\frac{1}{${b ** m}}` : String(b ** m);
}

function dataStory(params: DataParams): Story {
  return storyOf(params.down, params.ctx);
}

/**
 * How wide a table of measurements may run across a 393 px screen, counted
 * as the digits in its cells plus two for each column's spacing: five columns
 * of 3, 2, 2, 3 and 3 digits fit, and 3, 3, 3, 3 and 2 already touch the
 * edge. A wider table is turned on its side, `t` and the model's letter
 * heading two columns, rather than scrolling its last values away.
 */
const ACROSS_WIDTH = 22;

/** A table of measurements, the model's letter labelling the values. */
function measuredTex(values: number[], dt: number, label: string): string {
  const times = values.map((_, i) => i * dt);
  const digits = values.reduce((sum, v, i) => sum + Math.max(String(v).length, String(times[i]).length), 0);
  if (digits + 2 * values.length <= ACROSS_WIDTH) return tableTex({ kind: 'exponential', values, dt }, label);
  const rows = values.map((v, i) => `${times[i]} & ${texNum(v)}`).join(' \\\\ ');
  return `\\begin{array}{c|c} t & ${label} \\\\ \\hline ${rows} \\end{array}`;
}

/** The table of measurements, the model's letter on the second row. */
function dataTable(params: DataParams): string {
  return measuredTex(dataObserved(params), params.gap * params.h, dataStory(params).sym);
}

function dataOpening(params: DataParams): string {
  const story = dataStory(params);
  return `${story.subject} was measured ${everyUnit(params.gap * params.h, story.unit)}, with $t$ in ${story.unit}s, and fitted with $${story.sym} = ${modelTex(params.a, params)}$.`;
}

/** The story, the table on a line of its own, then the question. */
function dataPrompt(params: DataParams, ask: string, ...after: Block[]): Block[] {
  return [
    { kind: 'prose', text: dataOpening(params) },
    { kind: 'display', tex: dataTable(params) },
    { kind: 'prose', text: ask },
    ...after,
  ];
}

/**
 * Residuals written out: the quoted ones a prompt reads from. A short list
 * sits on one line of a phone; a longer one puts the label on a line of its
 * own and the values under it, at most three to a line.
 */
function residualLine(res: number[]): string {
  if (res.length <= 4 && res.join('').length <= 8) return `\\text{residuals: } ${res.join(',\\ ')}`;
  const rows = (res.length <= 4 ? [res] : [res.slice(0, 3), res.slice(3)]).map((row) => row.join(',\\ '));
  return `\\begin{gathered} \\text{residuals: } \\\\ ${rows.join(', \\\\ ')} \\end{gathered}`;
}

/** Predictions stay three digits wide at most. */
const FIT_TOP = 1000;

function sampleModel(
  rng: Rng,
  difficulty: number,
  count: number,
  { gap = 1, hs, top = FIT_TOP, grow = false }: DataOptions,
): Omit<DataParams, 'res' | 'from' | 'margin'> {
  const steps = (count - 1) * gap;
  const b = difficulty > 1 && 8 * 3 ** steps <= top ? rng.pick([2, 2, 3]) : 2;
  const h = rng.pick(hs ?? (difficulty > 1 ? [1, 2, 5] : [1]));
  const down = !grow && difficulty > 1 && rng.chance(0.5);
  const span = b ** steps;
  const least = down ? 4 : 8;
  const q = rng.int(least, Math.max(least, Math.floor(top / span)));
  return { a: down ? q * span : q, b, h, down, gap, ctx: rng.int(0, 3) };
}

interface DataOptions {
  /** How many columns; by default 4, or 5 at difficulty 2, one more for a leave. */
  count?: number;
  gap?: number;
  /** The step lengths h to draw from. */
  hs?: number[];
  top?: number;
  /** Growth only, never a decay. */
  grow?: boolean;
}

/**
 * Small whole residuals of both signs, each within about an eighth of its
 * prediction, with one clearly the largest in size.
 */
function fairResiduals(rng: Rng, predicted: number[], wide: boolean): number[] {
  const cap = wide ? 9 : 5;
  for (;;) {
    const res = predicted.map((value) => {
      const size = rng.int(1, Math.min(cap, Math.max(1, Math.floor(value / 8))));
      return rng.chance(0.5) ? size : -size;
    });
    const sizes = res.map(Math.abs);
    const top = Math.max(...sizes);
    const mixed = res.some((r) => r > 0) && res.some((r) => r < 0);
    if (mixed && sizes.filter((size) => size === top).length === 1) return res;
  }
}

/** Is each value past the first on the same side of the one before, strictly? */
function monotone(values: number[], down: boolean): boolean {
  return values.every((value, i) => i === 0 || (down ? value < values[i - 1] : value > values[i - 1]));
}

/** Is each size from `from` on strictly bigger than the one before? */
function growing(res: number[], from: number): boolean {
  return res.every((r, i) => i <= from || Math.abs(r) > Math.abs(res[i - 1]));
}

const TRIANGLE = [1, 3, 6, 10, 15, 21];

/** A run of one sign growing along the table: the data curving away from the model from the start. */
function driftResiduals(rng: Rng, predicted: number[], down: boolean): number[] | undefined {
  const sign = rng.chance(0.5) ? 1 : -1;
  const c = rng.int(1, 3);
  const res = predicted.map((_, i) => sign * c * TRIANGLE[i]);
  const observed = predicted.map((value, i) => value + res[i]);
  const plausible = res.every((r, i) => Math.abs(r) * 2 < predicted[i]);
  return plausible && monotone(observed, down) ? res : undefined;
}

/**
 * Small residuals up to column `from`, then the data levels off: the step into
 * column `from` is half the step before it (a sixth or a quarter for a decay,
 * which was already slowing), and each step after is half the one before. So
 * the residuals take one sign and grow, and a growth table is an S: speeding
 * up while it follows the model, slowing once it leaves.
 */
function leaveResiduals(rng: Rng, predicted: number[], from: number, { b, down }: Rate): number[] | undefined {
  const res = predicted.slice(0, from).map(() => (rng.chance(0.5) ? 1 : -1) * rng.int(1, 2));
  const observed = predicted.slice(0, from).map((value, i) => value + res[i]);
  const early = observed.slice(1).map((value, i) => value - observed[i]);
  if (!down && !early.every((step, i) => i === 0 || step > early[i - 1])) return undefined;
  let step = Math.trunc(early[early.length - 1] / (down ? 2 * b : 2));
  for (let i = from; i < predicted.length; i += 1) {
    if (step === 0) return undefined;
    observed.push(observed[i - 1] + step);
    res.push(observed[i] - predicted[i]);
    step = Math.trunc(step / 2);
  }
  return monotone(observed, down) && growing(res, from) ? res : undefined;
}

/** Margins a question may name: the data "more than D away". */
const MARGINS = [3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];

function sampleData(rng: Rng, difficulty: number, shape: DataShape, options: DataOptions = {}): DataParams {
  const count = options.count ?? (shape === 'leave' ? 4 : 3) + (difficulty > 1 ? 2 : 1);
  for (;;) {
    const model = sampleModel(rng, difficulty, count, options);
    const predicted = dataPredicted({ ...model, res: Array<number>(count).fill(0), from: 0, margin: 0 });
    if (shape === 'fair') {
      return { ...model, res: fairResiduals(rng, predicted, difficulty > 1), from: 0, margin: 0 };
    }
    if (shape === 'drift') {
      const res = driftResiduals(rng, predicted, model.down);
      if (res) return { ...model, res, from: 1, margin: 0 };
      continue;
    }
    // Growth needs two steps on the model first, to be seen speeding up.
    const from = rng.int(model.down ? 2 : 3, count - 2);
    const res = leaveResiduals(rng, predicted, from, model);
    if (!res) continue;
    const early = Math.max(...res.slice(0, from).map(Math.abs));
    const margins = MARGINS.filter((d) => d > early && d < Math.abs(res[from]));
    if (margins.length > 0) return { ...model, res, from, margin: rng.pick(margins) };
  }
}

/** The model worked at column i, then the residual there. */
function residualSteps(params: DataParams, i: number): SolutionStep[] {
  const { a, down } = params;
  const m = i * params.gap;
  const t = m * params.h;
  const { sym } = dataStory(params);
  const predicted = predictAt(params, m);
  const observed = predicted + params.res[i];
  const r = params.res[i];
  return [
    { text: `At $t = ${t}$ the power is $${kWorkedTex(params, m)}$, so $e^{kt} = ${factorTex(params, m)}$ and the model gives` },
    { tex: `${sym} = ${texNum(a)} ${down ? '\\div' : '\\times'} ${params.b ** m} = ${texNum(predicted)}` },
    { text: `The residual is the measurement minus the model: $${texNum(observed)} - ${texNum(predicted)} = ${r}$.` },
    { text: r > 0 ? 'It is positive: the data sits above the model there.' : 'It is negative: the data sits below the model there.' },
  ];
}

/* ---------- Level 7, lesson 1: residuals ---------- */

type AtParams = DataParams & { i: number };

function sampleAt(rng: Rng, difficulty: number): AtParams {
  const fit = sampleData(rng, difficulty, rng.chance(0.3) ? 'drift' : 'fair');
  return { ...fit, i: rng.int(1, fit.res.length - 1) };
}

function atTime({ i, gap, h }: AtParams): number {
  return i * gap * h;
}

/** Type the residual at one time. */
const expmResidual: Generator<AtParams> = {
  id: 'expm-residual',
  sample: sampleAt,
  choices: (params) => {
    const r = params.res[params.i];
    const predicted = dataPredicted(params)[params.i];
    return wholeOptions(r, [-r, predicted + r, predicted, r + (r > 0 ? 1 : -1)]);
  },
  render: (params): Slide => {
    const t = atTime(params);
    const ask =
      params.res.length <= 4
        ? `What is the residual at $t = ${t}$: the measurement minus the model's value there?`
        : `What is the residual at $t = ${t}$?`;
    return {
      kind: 'expression',
      prompt: dataPrompt(params, ask),
      lead: '\\text{residual} =',
      keypad: [],
      answer: String(params.res[params.i]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => residualSteps(params, params.i),
};

/** The residual as a tree: e^(kt) at that time, the model's value, then the residual. */
const expmPredictTree: Generator<AtParams> = {
  id: 'expm-predict-tree',
  sample: sampleAt,
  render: (params): Slide => {
    const { a, b, down, i } = params;
    const t = atTime(params);
    const m = i * params.gap;
    const predicted = predictAt(params, m);
    const observed = predicted + params.res[i];
    const r = params.res[i];
    const answer = [factorTex(params, m), String(predicted), String(r)];
    return {
      kind: 'tree',
      prompt: dataPrompt(
        params,
        `Find the residual at $t = ${t}$. Fill in $e^{kt}$ there, the model's value, then the measurement minus the model.`,
      ),
      expression: `${texNum(observed)} - ${texNum(a)}e^{${kAtTex(params, t)}}`,
      nodes: [
        { id: 'factor', from: [] },
        { id: 'model', from: ['factor'] },
        { id: 'residual', from: ['model'] },
      ],
      bank: treeBank(answer, [
        factorTex(params, m + 1),
        down ? String(b ** m) : `\\frac{1}{${b ** m}}`,
        String(b * m),
        String(predictAt(params, m + 1)),
        String(-r),
        String(observed + predicted),
      ]),
      answer,
    };
  },
  solution: (params) => residualSteps(params, params.i),
};

/** Build the residual: the measurement, minus the model, and what that comes to. */
const expmResidualTiles: Generator<AtParams> = {
  id: 'expm-residual-tiles',
  sample: sampleAt,
  render: (params): Slide => {
    const { a, b, down, i } = params;
    const t = atTime(params);
    const m = i * params.gap;
    const predicted = predictAt(params, m);
    const observed = predicted + params.res[i];
    const r = params.res[i];
    // Difficulty 2 has five columns, and works the model out on the line too.
    const worked = params.res.length > 4;
    const answer = worked ? [String(observed), String(a), String(b ** m), String(r)] : [String(observed), String(predicted), String(r)];
    const distractors = [String(-r), String(predictAt(params, m + 1)), String(predictAt(params, m - 1))];
    if (worked) distractors.push(String(b ** (m + 1)), String(b * m));
    return {
      kind: 'tiles',
      prompt: dataPrompt(
        params,
        worked
          ? `Build the residual at $t = ${t}$, where $e^{kt} = ${factorTex(params, m)}$.`
          : `Build the residual at $t = ${t}$.`,
      ),
      template: worked ? `r = {0} - {1} ${down ? '\\div' : '\\times'} {2} = {3}` : 'r = {0} - {1} = {2}',
      bank: fillBank(answer, distractors),
      answer,
    };
  },
  solution: (params) => residualSteps(params, params.i),
};

/** Fill in the model's column and the residuals in a table. */
const expmResidColumn: Generator<DataParams> = {
  id: 'expm-resid-column',
  sample: (rng, difficulty) => sampleData(rng, difficulty, rng.chance(0.3) ? 'drift' : 'fair'),
  render: (params): Slide => {
    const story = dataStory(params);
    const times = dataTimes(params);
    const predicted = dataPredicted(params);
    const observed = dataObserved(params);
    // Difficulty 2 has five columns: the first two rows are done, the rest
    // need the model worked as well.
    const worked = params.res.length > 4;
    const answer: string[] = [];
    const rows = times.map((t, i) => {
      const hideModel = worked && i >= 2;
      const hideResidual = !worked || i >= 2;
      if (hideModel) answer.push(String(predicted[i]));
      if (hideResidual) answer.push(String(params.res[i]));
      return [
        String(t),
        texNum(observed[i]),
        hideModel ? null : texNum(predicted[i]),
        hideResidual ? null : String(params.res[i]),
      ];
    });
    const distractors = [
      ...params.res.map((r) => String(-r)),
      ...(worked ? [String(predictAt(params, params.res.length * params.gap)), String(predicted[2] + predicted[1])] : []),
    ];
    return {
      kind: 'table',
      prompt: [
        { kind: 'prose', text: dataOpening(params) },
        {
          kind: 'prose',
          text: worked
            ? `Fill in the model's value where it is missing, then each residual, the measurement minus the model.`
            : `The model's values are worked out. Fill in each residual, the measurement minus the model.`,
        },
      ],
      columns: ['t', story.sym, '\\text{model}', '\\text{residual}'],
      rows,
      bank: treeBank(answer, distractors),
      answer,
    };
  },
  solution: (params) => {
    const predicted = dataPredicted(params);
    const observed = dataObserved(params);
    const lines = dataTimes(params).map((t, i) => `t = ${t}: &\\; ${texNum(observed[i])} - ${texNum(predicted[i])} = ${params.res[i]}`);
    return [
      { text: `The model multiplies by $${params.down ? `\\frac{1}{${params.b ** params.gap}}` : params.b ** params.gap}$ from one column to the next, since $e^{kt}$ is a power of $${params.b}$ there.` },
      { tex: chain(...lines) },
      { text: 'A positive residual is data above the model, a negative one data below it.' },
    ];
  },
};

/* ---------- Level 7, lesson 2: reading the residuals ---------- */

/** The column whose residual is furthest from zero. There is only ever one. */
function furthest(res: number[]): number {
  const sizes = res.map(Math.abs);
  return sizes.indexOf(Math.max(...sizes));
}

function furthestSolution(params: DataParams): SolutionStep[] {
  const i = furthest(params.res);
  const t = dataTimes(params)[i];
  return [
    { text: 'Work out every residual, the measurement minus the model:' },
    { tex: residualLine(params.res) },
    { text: `The one furthest from $0$, whatever its sign, is $${params.res[i]}$ at $t = ${t}$. That is where the model misses the data most.` },
  ];
}

/**
 * The residual furthest from zero, with its sign; at difficulty 2 the time at
 * which it happens.
 */
const expmResidLargest: Generator<DataParams> = {
  id: 'expm-resid-largest',
  sample: (rng, difficulty) => sampleData(rng, difficulty, 'fair'),
  choices: (params) => {
    const i = furthest(params.res);
    if (params.res.length <= 4) {
      const r = params.res[i];
      const next = params.res.filter((_, j) => j !== i).sort((x, y) => Math.abs(y) - Math.abs(x));
      return wholeOptions(r, [-r, next[0], Math.max(...params.res) === r ? Math.min(...params.res) : Math.max(...params.res)]);
    }
    const times = dataTimes(params);
    const order = times.map((_, j) => j).filter((j) => j !== i).sort((x, y) => Math.abs(params.res[y]) - Math.abs(params.res[x]));
    return options(
      { tex: `t = ${times[i]}`, answer: String(times[i]) },
      ...order.slice(0, 3).map((j) => ({ tex: `t = ${times[j]}`, answer: String(times[j]) })),
    );
  },
  render: (params): Slide => {
    const small = params.res.length <= 4;
    return {
      kind: 'expression',
      prompt: dataPrompt(
        params,
        small
          ? 'Work out every residual. Which one is furthest from $0$? Give it with its sign.'
          : 'Work out every residual. At what time is the model furthest from the data?',
      ),
      lead: small ? '\\text{residual} =' : 't =',
      keypad: [],
      answer: String(small ? params.res[furthest(params.res)] : dataTimes(params)[furthest(params.res)]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: furthestSolution,
};

/** Every residual in a tree, then the one furthest from zero. */
const expmFurthestTree: Generator<DataParams> = {
  id: 'expm-furthest-tree',
  sample: (rng, difficulty) => sampleData(rng, difficulty, 'fair'),
  render: (params): Slide => {
    const times = dataTimes(params);
    const top = params.res[furthest(params.res)];
    const answer = [...params.res.map(String), String(top)];
    return {
      kind: 'tree',
      prompt: dataPrompt(params, 'Fill in the residual at each time, then the one furthest from $0$, with its sign.'),
      expression: '\\text{the residual furthest from } 0',
      nodes: [
        ...times.map((t) => ({ id: `r${t}`, from: [] })),
        { id: 'largest', from: times.map((t) => `r${t}`) },
      ],
      bank: treeBank(answer, [String(-top), ...params.res.map((r) => String(-r))]),
      answer,
    };
  },
  solution: furthestSolution,
};

const FAIR_FIT = 'A fair fit';
const WRONG_SHAPE = 'The wrong shape';

/** Read a line of residuals: do they change sign, are they small, do they grow, and so what. */
const expmPatternFlow: Generator<DataParams> = {
  id: 'expm-pattern-flow',
  sample: (rng, difficulty) => sampleData(rng, difficulty, rng.chance(0.5) ? 'fair' : 'drift'),
  render: (params): Slide => {
    const story = dataStory(params);
    const fair = params.from === 0;
    const verdict = (id: string, good: boolean) => ({
      id,
      ask: 'So what do the residuals say about the model?',
      branches: [
        {
          label: FAIR_FIT,
          outcome: good
            ? 'Small residuals scattered either side of $0$ are what measurement error looks like. The model fits.'
            : 'A fair fit scatters its residuals either side of $0$. One sign, growing, means the data is curving away.',
        },
        {
          label: WRONG_SHAPE,
          outcome: good
            ? 'A wrong shape shows as a run of one sign that grows. These change sign and stay small.'
            : 'A run of residuals of one sign, growing, means the model is the wrong shape for this data.',
        },
      ],
    });
    return {
      kind: 'flow',
      prompt: dataPrompt(params, 'Its residuals are below. Read them one question at a time.', {
        kind: 'display',
        tex: residualLine(params.res),
      }),
      subject: `${story.sym} = ${modelTex(params.a, params)}`,
      steps: [
        {
          id: 'sign',
          ask: 'Do the residuals change sign?',
          branches: [
            { label: 'Yes', to: 'size' },
            { label: 'No', to: 'grow' },
          ],
        },
        {
          id: 'size',
          ask: 'Are they all small next to the measurements?',
          branches: [
            { label: 'Yes', to: 'fair' },
            { label: 'No', outcome: 'Each is a few units on measurements in the tens or hundreds, which is small.' },
          ],
        },
        {
          id: 'grow',
          ask: 'Do they grow in size along the table?',
          branches: [
            { label: 'Yes', to: 'shape' },
            { label: 'No', outcome: 'Each one is bigger than the one before it.' },
          ],
        },
        verdict('fair', true),
        verdict('shape', false),
      ],
      answer: fair ? ['Yes', 'Yes', FAIR_FIT] : ['No', 'Yes', WRONG_SHAPE],
    };
  },
  solution: (params) => {
    const fair = params.from === 0;
    return [
      { tex: residualLine(params.res) },
      {
        text: fair
          ? 'They change sign and all stay small, so they look like measurement error: a fair fit.'
          : `They are all ${params.res[0] > 0 ? 'positive' : 'negative'} and grow along the table, so the data curves away from the model: it is the wrong shape.`,
      },
    ];
  },
};

const PATTERN_FAIR = 'A fair fit: small residuals either side of zero';
const PATTERN_LOW = 'The model is too low, by more each time';
const PATTERN_HIGH = 'The model is too high, by more each time';

/** What the residuals say, from the table itself: a fair fit, or a model too low or too high. */
const expmPatternChoice: Generator<DataParams> = {
  id: 'expm-pattern-choice',
  sample: (rng, difficulty) => sampleData(rng, difficulty, rng.chance(0.4) ? 'fair' : 'drift'),
  render: (params): Slide => {
    const right = params.from === 0 ? PATTERN_FAIR : params.res[0] > 0 ? PATTERN_LOW : PATTERN_HIGH;
    const labels = turned([PATTERN_FAIR, PATTERN_LOW, PATTERN_HIGH], `${params.a}-${params.res.join(',')}`);
    return {
      kind: 'choice',
      prompt: dataPrompt(params, 'Work out the residuals. What do they say about the model?'),
      options: labels.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${labels.indexOf(right)}`,
    };
  },
  solution: (params) => {
    const fair = params.from === 0;
    const above = params.res[0] > 0;
    return [
      { tex: residualLine(params.res) },
      {
        text: fair
          ? 'They change sign and stay small: a fair fit.'
          : `They are all ${above ? 'positive' : 'negative'} and growing: the data is ${above ? 'above' : 'below'} the model by more each time, so the model is too ${above ? 'low' : 'high'}.`,
      },
    ];
  },
};

/* ---------- Level 7, lesson 3: when a model stops fitting ---------- */

function sampleLeave(rng: Rng, difficulty: number): DataParams {
  return sampleData(rng, difficulty, 'leave');
}

function leaveSolution(params: DataParams): SolutionStep[] {
  const t = dataTimes(params)[params.from];
  const levelling = params.down ? 'settles above zero' : 'levels off';
  return [
    { tex: residualLine(params.res) },
    {
      text: `Up to $t = ${dataTimes(params)[params.from - 1]}$ every residual is within $${params.margin}$ of $0$. At $t = ${t}$ it is $${params.res[params.from]}$, more than $${params.margin}$ away, and it grows from there.`,
    },
    {
      text: `The data ${levelling}, but $e^{${params.down ? '-' : ''}kt}$ never does, so the model stops fitting from $t = ${t}$.`,
    },
  ];
}

/** The model's curve with the measurements as dots, for a slider to run along. */
function dataFigure(params: DataParams, xMax: number): string {
  const observed = dataObserved(params);
  const k = ((params.down ? -1 : 1) * Math.log(params.b)) / params.h;
  const top = params.down ? params.a * 1.15 : Math.max(...observed) * 1.6;
  return plotSvg({
    xMin: 0,
    xMax,
    yMin: 0,
    yMax: top,
    curves: [{ f: (t) => Math.min(params.a * Math.exp(k * t), top * 2) }],
    marks: dataTimes(params).map((t, i) => ({ x: t, y: observed[i] })),
    label: `Measurements as dots and a ${params.down ? 'falling' : 'rising'} model curve`,
  });
}

/** Slide to the first time the data is more than a margin away from the model. */
const expmLeavesSlider: Generator<DataParams> = {
  id: 'expm-leaves-slider',
  sample: sampleLeave,
  render: (params): Slide => {
    const answer = dataTimes(params)[params.from];
    const step = params.h;
    let max = lastTime(params);
    while (defaultSliderValue(0, max, step) === answer) max += step;
    return {
      kind: 'slider',
      prompt: dataPrompt(
        params,
        `Slide to the first time the measurement is more than $${params.margin}$ away from the model.`,
      ),
      min: 0,
      max,
      step,
      answer,
      readout: 't = {v}',
      figure: { svg: dataFigure(params, max), ...markerWindow(0, max) },
    };
  },
  solution: leaveSolution,
};

/** How far apart the model and the data are at the last measurement. */
const expmOvershoot: Generator<DataParams> = {
  id: 'expm-overshoot',
  sample: sampleLeave,
  choices: (params) => {
    const last = params.res.length - 1;
    const gap = Math.abs(params.res[last]);
    return numberOptions(gap, [Math.abs(params.res[last - 1]), dataObserved(params)[last], dataPredicted(params)[last], gap + params.margin]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: dataPrompt(params, `How far apart are the model and the measurement at $t = ${lastTime(params)}$?`),
    lead: '\\text{gap} =',
    keypad: [],
    answer: String(Math.abs(params.res[params.res.length - 1])),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const last = params.res.length - 1;
    const steps = residualSteps(params, last);
    return [
      ...steps.slice(0, 3),
      {
        text: `So they are $${Math.abs(params.res[last])}$ apart, with the model ${params.res[last] < 0 ? 'above' : 'below'} the data: the data has ${params.down ? 'stopped falling' : 'stopped growing'} as fast as the model.`,
      },
    ];
  },
};

const LEVEL_FIXES = ['Logistic', 'Bounded', 'A bigger k'];

/** Where the data goes once the model stops fitting, what it is doing, and what model fits instead. */
const expmLevelFlow: Generator<DataParams> = {
  id: 'expm-level-flow',
  sample: sampleLeave,
  render: (params): Slide => {
    const story = dataStory(params);
    const t = dataTimes(params)[params.from];
    const { down } = params;
    const fixOutcome: Record<string, string> = {
      Logistic: down
        ? 'A logistic model rises to a ceiling. This data falls and settles above zero, which is $L + Be^{-kt}$.'
        : 'Right: it grew like an exponential, then levelled off. That S-shape is a logistic model, $\\frac{L}{1 + Ae^{-kt}}$.',
      Bounded: down
        ? 'Right: it falls and settles at a level above zero. That is a bounded model, $L + Be^{-kt}$.'
        : '$L - Be^{-kt}$ climbs fastest at the start. This data first sped up like an exponential, then levelled: logistic.',
      'A bigger k': down
        ? 'A bigger $k$ falls to zero even faster. The data is settling above zero instead.'
        : 'A bigger $k$ climbs even faster, further away from data that is levelling off.',
    };
    return {
      kind: 'flow',
      prompt: dataPrompt(params, `The model stops fitting at $t = ${t}$. Its residuals are below.`, {
        kind: 'display',
        tex: residualLine(params.res),
      }),
      subject: `${story.sym} = ${modelTex(params.a, params)}`,
      steps: [
        {
          id: 'where',
          ask: `From $t = ${t}$ on, where are the measurements?`,
          branches: [
            { label: 'Above the model', to: down ? 'doing' : 'wrong-side' },
            { label: 'Below the model', to: down ? 'wrong-side' : 'doing' },
          ],
        },
        {
          id: 'wrong-side',
          ask: 'Which sign are those residuals, then?',
          branches: [
            { label: 'Positive', outcome: 'A positive residual is a measurement above the model.' },
            { label: 'Negative', outcome: 'A negative residual is a measurement below the model.' },
          ],
        },
        {
          id: 'doing',
          ask: 'So what are the measurements doing that the model does not?',
          branches: [
            { label: 'Levelling off', to: 'fix' },
            { label: down ? 'Falling faster' : 'Growing faster', outcome: down ? 'Data falling faster would sit below the model, with negative residuals.' : 'Data growing faster would sit above the model, with positive residuals.' },
          ],
        },
        {
          id: 'fix',
          ask: 'Which kind of model could follow the whole table?',
          branches: turned(LEVEL_FIXES, `${params.a}-${params.res.join(',')}`).map((label) => ({ label, outcome: fixOutcome[label] })),
        },
      ],
      answer: [down ? 'Above the model' : 'Below the model', 'Levelling off', down ? 'Bounded' : 'Logistic'],
    };
  },
  solution: (params) => [
    ...leaveSolution(params),
    {
      text: params.down
        ? 'A fall that settles at a level is a bounded model, $L + Be^{-kt}$, from level 2.'
        : 'Growth that speeds up and then levels off is logistic, $\\frac{L}{1 + Ae^{-kt}}$, from level 5.',
    },
  ],
};

const FIX_FORMS: Record<string, string> = {
  logistic: 'y = \\frac{L}{1 + Ae^{-kt}}',
  fall: 'y = L + Be^{-kt}',
  rise: 'y = L - Be^{-kt}',
  linear: 'y = a + bt',
};

/** Which model could fit the whole table, once an exponential stops fitting. */
const expmFixChoice: Generator<DataParams> = {
  id: 'expm-fix-choice',
  sample: sampleLeave,
  render: (params): Slide => {
    const right = FIX_FORMS[params.down ? 'fall' : 'logistic'];
    const labels = turned(Object.values(FIX_FORMS), `${params.a}-${params.res.join(',')}`);
    const t = dataTimes(params)[params.from];
    const ask =
      params.res.length > 5
        ? 'The exponential stops fitting part way along. Which of these could fit the whole table? $L$, $A$, $B$ and $k$ are positive.'
        : `The exponential fits up to $t = ${dataTimes(params)[params.from - 1]}$ and not from $t = ${t}$. Which of these could fit the whole table? $L$, $A$, $B$ and $k$ are positive.`;
    return {
      kind: 'choice',
      prompt: dataPrompt(params, ask),
      options: labels.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
      correctId: `opt${labels.indexOf(right)}`,
    };
  },
  solution: (params) => [
    ...leaveSolution(params).slice(0, 2),
    {
      text: params.down
        ? 'The measurements fall and settle at a level above zero, so the model needs that level: $y = L + Be^{-kt}$.'
        : 'The measurements speed up like an exponential at first, then level off: an S-shape, which is logistic, $y = \\frac{L}{1 + Ae^{-kt}}$.',
    },
  ],
};

/* ---------- Level 7, lesson 4: choosing between two fits ---------- */

interface PairParams {
  fit: DataParams;
  /** The second model: another start for the same k, or a line with this slope. */
  other: { kind: 'exp'; a: number } | { kind: 'line'; slope: number };
  /** Whether the data follows the second model rather than the exponential. */
  second: boolean;
  /** Whether the exponential is labelled B rather than A. */
  swap: boolean;
  /** Which model a question asks about: 0 for A, 1 for B. */
  ask: number;
}

function otherPredicted({ fit, other }: PairParams): number[] {
  return dataTimes(fit).map((t, i) =>
    other.kind === 'line' ? fit.a + other.slope * t : predictAt({ ...fit, a: other.a }, i * fit.gap),
  );
}

/** The measurements: the data follows whichever model it was drawn from. */
function pairObserved(params: PairParams): number[] {
  const truth = params.second ? otherPredicted(params) : dataPredicted(params.fit);
  return truth.map((value, i) => value + params.fit.res[i]);
}

/** Each model's predictions, as labelled: A first. */
function pairPredictions(params: PairParams): [number[], number[]] {
  const exp = dataPredicted(params.fit);
  const other = otherPredicted(params);
  return params.swap ? [other, exp] : [exp, other];
}

function pairResiduals(params: PairParams): [number[], number[]] {
  const observed = pairObserved(params);
  const [pa, pb] = pairPredictions(params);
  return [observed.map((y, i) => y - pa[i]), observed.map((y, i) => y - pb[i])];
}

function squares(res: number[]): number {
  return res.reduce((sum, r) => sum + r * r, 0);
}

function largestSize(res: number[]): number {
  return Math.max(...res.map(Math.abs));
}

function samplePair(rng: Rng, difficulty: number): PairParams {
  for (;;) {
    // Small starts, so the model that misses does so by tens, not hundreds.
    const fit = sampleData(rng, difficulty, 'fair', { count: 4, top: 200, hs: difficulty > 1 ? [1, 2] : [1] });
    const predicted = dataPredicted(fit);
    let other: PairParams['other'];
    if (difficulty > 1) {
      const raw = (predicted[3] - predicted[0]) / (3 * fit.h);
      other = { kind: 'line', slope: Math.round(raw) };
    } else {
      other = { kind: 'exp', a: fit.a + rng.pick([-2, -1, 1, 2]) };
    }
    const second = rng.chance(0.5);
    const swap = rng.chance(0.5);
    // Difficulty 1 asks about the better fit, whose residuals are the small ones.
    const ask = difficulty > 1 ? rng.int(0, 1) : second === swap ? 0 : 1;
    const params: PairParams = { fit, other, second, swap, ask };
    const observed = pairObserved(params);
    const [ra, rb] = pairResiduals(params);
    const truthIsA = params.second === params.swap;
    const [good, bad] = truthIsA ? [ra, rb] : [rb, ra];
    const clear = squares(good) < squares(bad) && largestSize(good) < largestSize(bad);
    const readable = squares(bad) <= 3000 && observed.every((y) => y > 0) && otherPredicted(params).every((y) => y > 0);
    if (clear && readable) return params;
  }
}

/** Which label the better fit carries. */
function betterLabel(params: PairParams): 'A' | 'B' {
  return params.second === params.swap ? 'A' : 'B';
}

function lineTex(start: number, slope: number): string {
  if (slope === 0) return texNum(start);
  return `${texNum(start)} ${slope < 0 ? '-' : '+'} ${Math.abs(slope) === 1 ? '' : Math.abs(slope)}t`;
}

function pairPrompt(params: PairParams, ask: string): Block[] {
  const { fit, other } = params;
  const story = dataStory(fit);
  const exp = modelTex(fit.a, fit);
  const second = other.kind === 'line' ? lineTex(fit.a, other.slope) : modelTex(other.a, fit);
  const [ma, mb] = params.swap ? [second, exp] : [exp, second];
  return [
    {
      kind: 'prose',
      text: `${story.subject} was measured ${everyUnit(fit.gap * fit.h, story.unit)}, with $t$ in ${story.unit}s, and two models were fitted.`,
    },
    { kind: 'display', tex: `\\begin{aligned} \\text{A:} \\;\\; ${story.sym} &= ${ma} \\\\ \\text{B:} \\;\\; ${story.sym} &= ${mb} \\end{aligned}` },
    {
      kind: 'display',
      tex: measuredTex(pairObserved(params), fit.gap * fit.h, story.sym),
    },
    { kind: 'prose', text: ask },
  ];
}

function pairSolution(params: PairParams): SolutionStep[] {
  const [ra, rb] = pairResiduals(params);
  const [pa, pb] = pairPredictions(params);
  const better = betterLabel(params);
  return [
    { text: `Model A gives $${pa.map(texNum).join(',\\ ')}$ and model B gives $${pb.map(texNum).join(',\\ ')}$, so the residuals are` },
    { tex: chain(`\\text{A} &: \\; ${ra.join(',\\ ')}`, `\\text{B} &: \\; ${rb.join(',\\ ')}`) },
    { text: 'Square each residual and add, so a miss counts the same above or below:' },
    // The squares, not the residuals squared: four bracketed squares run off a phone.
    {
      tex: chain(
        `S_A &= ${ra.map((r) => r * r).join(' + ')}`,
        `&= ${squares(ra)}`,
        `S_B &= ${rb.map((r) => r * r).join(' + ')}`,
        `&= ${squares(rb)}`,
      ),
    },
    { text: `The smaller sum is the better fit: model ${better}.` },
  ];
}

const LABELS = ['A', 'B'] as const;

/** One model's residuals in a tree, then the sum of their squares. */
const expmSquaresTree: Generator<PairParams> = {
  id: 'expm-squares-tree',
  sample: samplePair,
  render: (params): Slide => {
    const res = pairResiduals(params)[params.ask];
    const times = dataTimes(params.fit);
    const answer = [...res.map(String), String(squares(res))];
    const total = res.reduce((sum, r) => sum + r, 0);
    return {
      kind: 'tree',
      prompt: pairPrompt(
        params,
        `Fill in model ${LABELS[params.ask]}'s residual at each time, then the sum of their squares, $S_${LABELS[params.ask]}$.`,
      ),
      expression: `S_${LABELS[params.ask]} = \\sum r^2`,
      nodes: [...times.map((t) => ({ id: `r${t}`, from: [] })), { id: 'sum', from: times.map((t) => `r${t}`) }],
      bank: treeBank(answer, [
        String(res.reduce((sum, r) => sum + Math.abs(r), 0)),
        String(total * total),
        String(squares(pairResiduals(params)[1 - params.ask])),
        ...res.map((r) => String(-r)),
      ]),
      answer,
    };
  },
  solution: pairSolution,
};

/** Type the sum of squared residuals for one model. */
const expmSsr: Generator<PairParams> = {
  id: 'expm-ssr',
  sample: samplePair,
  choices: (params) => {
    const res = pairResiduals(params)[params.ask];
    const total = res.reduce((sum, r) => sum + r, 0);
    return numberOptions(squares(res), [
      res.reduce((sum, r) => sum + Math.abs(r), 0),
      total * total,
      squares(res) - res[0] * res[0],
      squares(pairResiduals(params)[1 - params.ask]),
    ]);
  },
  render: (params): Slide => {
    const label = LABELS[params.ask];
    return {
      kind: 'expression',
      prompt: pairPrompt(params, `What is $S_${label}$, the sum of the squares of model ${label}'s residuals?`),
      lead: `S_${label} =`,
      keypad: [],
      answer: String(squares(pairResiduals(params)[params.ask])),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: pairSolution,
};

/** Both sums of squares, then the better fit. */
const expmBetterTiles: Generator<PairParams> = {
  id: 'expm-better-tiles',
  sample: samplePair,
  render: (params): Slide => {
    const [ra, rb] = pairResiduals(params);
    const answer = [String(squares(ra)), String(squares(rb)), `\\text{${betterLabel(params)}}`];
    const absA = ra.reduce((sum, r) => sum + Math.abs(r), 0);
    const absB = rb.reduce((sum, r) => sum + Math.abs(r), 0);
    return {
      kind: 'tiles',
      prompt: pairPrompt(params, 'Work out the sum of squared residuals for each model, then say which fits better.'),
      template: 'S_A = {0}, \\; S_B = {1}, \\; \\text{better: } {2}',
      bank: fillBank(answer, ['\\text{A}', '\\text{B}', String(absA), String(absB)]),
      answer,
    };
  },
  solution: pairSolution,
};

/** Judged by the largest residual: each model's, then which is better. */
const expmLargestFlow: Generator<PairParams> = {
  id: 'expm-largest-flow',
  sample: samplePair,
  render: (params): Slide => {
    const pair = pairResiduals(params);
    const better = betterLabel(params);
    const fork = (idx: number, next: string) => {
      const res = pair[idx];
      const size = largestSize(res);
      const sorted = [...new Set(res.map(Math.abs))].sort((x, y) => y - x);
      const slips = [
        { value: sorted[1], why: 'That one is not the furthest from zero. Look along every residual, ignoring sign.' },
        { value: res.reduce((sum, r) => sum + Math.abs(r), 0), why: 'That adds every residual up. The largest residual is just the single biggest miss.' },
        { value: size + 1, why: 'Not quite: work the residuals out again, measurement minus model.' },
      ].filter((slip) => slip.value !== undefined && slip.value !== size);
      const seen = new Set([size]);
      const branches = [{ label: `$${size}$`, to: next } as { label: string; to?: string; outcome?: string }];
      for (const slip of slips) {
        if (seen.has(slip.value) || branches.length === 3) continue;
        seen.add(slip.value);
        branches.push({ label: `$${slip.value}$`, outcome: slip.why });
      }
      return {
        id: `m${idx}`,
        ask: `What is model ${LABELS[idx]}'s largest residual, ignoring its sign?`,
        branches: turned(branches, `${res.join(',')}-${idx}`),
      };
    };
    return {
      kind: 'flow',
      prompt: pairPrompt(params, 'Judge the two models by their largest residuals, one question at a time.'),
      subject: '\\text{A against B}',
      steps: [
        fork(0, 'm1'),
        fork(1, 'which'),
        {
          id: 'which',
          ask: 'Judged by its largest residual, which model fits better?',
          branches: [
            {
              label: 'Model A',
              outcome: better === 'A' ? 'Right: its worst miss is smaller.' : 'Model A misses by more at its worst.',
            },
            {
              label: 'Model B',
              outcome: better === 'B' ? 'Right: its worst miss is smaller.' : 'Model B misses by more at its worst.',
            },
          ],
        },
      ],
      answer: [`$${largestSize(pair[0])}$`, `$${largestSize(pair[1])}$`, `Model ${better}`],
    };
  },
  solution: (params) => {
    const [ra, rb] = pairResiduals(params);
    return [
      { tex: chain(`\\text{A} &: \\; ${ra.join(',\\ ')}`, `\\text{B} &: \\; ${rb.join(',\\ ')}`) },
      { text: `Model A's largest residual in size is $${largestSize(ra)}$ and model B's is $${largestSize(rb)}$.` },
      { text: `The smaller worst miss is the better fit: model ${betterLabel(params)}. Here the sum of squares agrees.` },
    ];
  },
};

/* ---------- Level 7, lesson 5: beyond the data ---------- */

type InterpParams = DataParams & { j: number };

/** Measurements every two steps, so a whole time falls between each pair. */
function sampleInterp(rng: Rng, difficulty: number): InterpParams {
  const fit = sampleData(rng, difficulty, 'fair', { count: 4, gap: 2 });
  return { ...fit, j: rng.int(0, 2) };
}

/** The model's prediction between two measurements. */
const expmInterpValue: Generator<InterpParams> = {
  id: 'expm-interp-value',
  sample: sampleInterp,
  choices: (params) => {
    const m = 2 * params.j + 1;
    const observed = dataObserved(params);
    const middle = (observed[params.j] + observed[params.j + 1]) / 2;
    return numberOptions(predictAt(params, m), [middle, predictAt(params, m - 1), predictAt(params, m + 1), observed[params.j + 1]]);
  },
  render: (params): Slide => {
    const t = (2 * params.j + 1) * params.h;
    const { sym } = dataStory(params);
    return {
      kind: 'expression',
      prompt: dataPrompt(params, `There is no measurement at $t = ${t}$. What does the model predict there?`),
      lead: `${sym} =`,
      keypad: [],
      answer: String(predictAt(params, 2 * params.j + 1)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const m = 2 * params.j + 1;
    const t = m * params.h;
    const { sym } = dataStory(params);
    return [
      { text: `$t = ${t}$ lies between the measurements at $t = ${2 * params.j * params.h}$ and $t = ${(2 * params.j + 2) * params.h}$, so this is interpolation.` },
      { tex: chain(`kt &= ${kWorkedTex(params, m)}`, `e^{kt} &= ${factorTex(params, m)}`, `${sym} &= ${texNum(params.a)} ${params.down ? '\\div' : '\\times'} ${params.b ** m} = ${texNum(predictAt(params, m))}`) },
      { text: 'The model fits the data well, so a value between two measurements can be trusted.' },
    ];
  },
};

/** Tables whose last time fits a number line: at most 10. */
const LINE_TABLES: { count: number; gap: number; h: number }[] = [
  { count: 4, gap: 1, h: 1 },
  { count: 5, gap: 1, h: 1 },
  { count: 4, gap: 2, h: 1 },
  { count: 4, gap: 1, h: 2 },
  { count: 5, gap: 1, h: 2 },
  { count: 6, gap: 1, h: 2 },
  { count: 3, gap: 1, h: 5 },
  { count: 3, gap: 2, h: 2 },
];


type LineParams = DataParams & { outside: boolean };

/** Shade the times where a prediction is interpolation; at difficulty 2 where it is extrapolation. */
const expmValidLine: Generator<LineParams> = {
  id: 'expm-valid-line',
  sample: (rng, difficulty) => {
    const shape = rng.pick(LINE_TABLES);
    const fit = sampleData(rng, difficulty, 'fair', { count: shape.count, gap: shape.gap, hs: [shape.h] });
    return { ...fit, outside: difficulty > 1 };
  },
  render: (params): Slide => {
    const last = lastTime(params);
    return {
      kind: 'numberLine',
      prompt: dataPrompt(
        params,
        params.outside
          ? 'Shade every time at which a prediction from the model would be extrapolation, before the first measurement or after the last.'
          : 'Shade every time at which a prediction from the model is interpolation.',
      ),
      min: -1,
      max: 11,
      step: 1,
      answer: canonicalSet(params.outside ? `(-inf,0)|(${last},inf)` : `[0,${last}]`) ?? '',
    };
  },
  solution: (params) => {
    const last = lastTime(params);
    return [
      { text: `The measurements run from $t = 0$ to $t = ${last}$.` },
      { text: 'A prediction inside that range, ends included, is interpolation: the data is on both sides of it.' },
      {
        text: params.outside
          ? `Anywhere before $0$ or after $${last}$ is extrapolation, so both ends are open: $0$ and $${last}$ themselves are measured.`
          : `So shade from $0$ to $${last}$ with both ends filled. Beyond them is extrapolation.`,
      },
    ];
  },
};

/** Stories for a prediction far past the data, each with a size it cannot pass. */
interface FarStory extends Story {
  cap: (limit: string) => string;
}

const FAR_STORIES: FarStory[] = [
  { sym: 'N', subject: 'The number of bacteria in a dish', unit: 'hour', of: 'bacteria', cap: (c) => `The dish has room for at most $${c}$ bacteria.` },
  { sym: 'R', subject: 'The number of rabbits on an island', unit: 'month', of: 'rabbits', cap: (c) => `The island can feed at most $${c}$ rabbits.` },
  { sym: 'H', subject: 'The number of pupils who have heard a rumour', unit: 'hour', of: 'pupils', cap: (c) => `The school has $${c}$ pupils.` },
  { sym: 'W', subject: 'The area of a pond covered by weed, in square metres,', unit: 'week', of: 'square metres', cap: (c) => `The pond is $${c}$ square metres in area.` },
];

type FarCase = 'inside' | 'over' | 'under';

interface FarParams {
  fit: DataParams;
  /** The time asked about, in steps of h. */
  m: number;
  /** The most the story allows. */
  cap: number;
  where: FarCase;
  story: number;
}

/** Round numbers a story's limit is drawn from. */
const CAPS = [2, 3, 4, 5, 6, 8].flatMap((lead) => [100, 1000, 10000, 100000].map((scale) => lead * scale)).sort((x, y) => x - y);

function sampleFar(rng: Rng, difficulty: number): FarParams {
  for (;;) {
    const fit = sampleData(rng, difficulty, 'fair', { count: 4, gap: 2, grow: true });
    const where: FarCase = rng.pick(difficulty > 1 ? ['inside', 'over', 'under', 'under'] : ['inside', 'over', 'over']);
    const m = where === 'inside' ? rng.pick([1, 3, 5]) : 6 + rng.int(2, 6);
    const predicted = predictAt(fit, m);
    const highest = Math.max(...dataObserved(fit));
    const caps =
      where === 'over'
        ? CAPS.filter((c) => c > highest * 1.2 && c < predicted)
        : CAPS.filter((c) => c >= Math.max(predicted, highest) * 1.2).slice(0, 3);
    if (caps.length > 0) return { fit, m, cap: rng.pick(caps), where, story: rng.int(0, FAR_STORIES.length - 1) };
  }
}

function farOpening({ fit, story }: FarParams): string {
  const s = FAR_STORIES[story];
  return `${s.subject} was measured ${everyUnit(fit.gap * fit.h, s.unit)}, with $t$ in ${s.unit}s, and fitted with $${s.sym} = ${modelTex(fit.a, fit)}$.`;
}

const FAR_VERDICTS = ['It cannot happen', 'Only with caution', 'It can be trusted'];

/** Is a prediction inside the data, and if not, does it pass what the story allows? */
const expmFarFlow: Generator<FarParams> = {
  id: 'expm-far-flow',
  sample: sampleFar,
  render: (params): Slide => {
    const { fit, m, cap, where } = params;
    const s = FAR_STORIES[params.story];
    const t = m * fit.h;
    const last = lastTime(fit);
    const predicted = predictAt(fit, m);
    // Each step is reached by what the learner has said so far, which may be
    // wrong, so an outcome states the rule rather than this question's numbers.
    const verdicts = (over: boolean) =>
      FAR_VERDICTS.map((label) => ({
        label,
        outcome:
          label === 'It cannot happen'
            ? over
              ? 'More than is possible cannot happen: the growth must slow long before then.'
              : 'Within what is possible it could happen, if the growth carried on unchecked.'
            : label === 'Only with caution'
              ? over
                ? 'Caution is for a prediction that could happen. More than is possible cannot happen at all.'
                : 'It could happen, but only if the growth carries on unchecked past the data: a rough guess at best.'
              : 'Past the data nothing checks the model. A prediction there is never simply trusted.',
      }));
    return {
      kind: 'flow',
      prompt: [
        { kind: 'prose', text: farOpening(params) },
        { kind: 'display', tex: measuredTex(dataObserved(fit), fit.gap * fit.h, s.sym) },
        { kind: 'prose', text: `${s.cap(texNum(cap))} Is the model's prediction at $t = ${t}$ sensible?` },
      ],
      subject: `${s.sym} = ${modelTex(fit.a, fit)}`,
      steps: [
        {
          id: 'range',
          ask: `Is $t = ${t}$ inside the times the data covers, $t = 0$ to $t = ${last}$?`,
          branches: [
            { label: 'Yes', to: 'inside' },
            { label: 'No', to: 'cap' },
          ],
        },
        {
          id: 'inside',
          ask: 'So is a prediction there interpolation or extrapolation?',
          branches: [
            { label: 'Interpolation', outcome: 'Between measurements, with a model that fits them, a prediction can be trusted.' },
            { label: 'Extrapolation', outcome: 'Extrapolation is predicting outside the data. A time between measurements is interpolation.' },
          ],
        },
        {
          id: 'cap',
          ask: `The model gives $${s.sym} = ${texNum(predicted)}$ at $t = ${t}$. Is that more than $${texNum(cap)}$?`,
          branches: [
            { label: 'Yes', to: 'over' },
            { label: 'No', to: 'under' },
          ],
        },
        { id: 'over', ask: 'So is the prediction sensible?', branches: verdicts(true) },
        { id: 'under', ask: 'So is the prediction sensible?', branches: verdicts(false) },
      ],
      answer:
        where === 'inside'
          ? ['Yes', 'Interpolation']
          : where === 'over'
            ? ['No', 'Yes', 'It cannot happen']
            : ['No', 'No', 'Only with caution'],
    };
  },
  solution: (params) => {
    const { fit, m, cap, where } = params;
    const t = m * fit.h;
    const last = lastTime(fit);
    const predicted = predictAt(fit, m);
    if (where === 'inside') {
      return [
        { text: `$t = ${t}$ lies between measurements, inside $0$ to $${last}$: interpolation.` },
        { text: `The model fits the data closely, so its value there, $${texNum(predicted)}$, can be trusted.` },
      ];
    }
    return [
      { text: `$t = ${t}$ is past the last measurement at $t = ${last}$: extrapolation.` },
      { tex: `${texNum(fit.a)} \\times ${fit.b}^{${m}} = ${texNum(predicted)}` },
      {
        text:
          where === 'over'
            ? `That is more than the $${texNum(cap)}$ possible, so it cannot happen: the growth has to level off first.`
            : `That is within the $${texNum(cap)}$ possible, but nothing in the data shows the growth carrying on that long. Use it only with caution.`,
      },
    ];
  },
};

type TrustParams = DataParams & { times: [number, number, number, number] };

/**
 * Four times to predict at: between measurements while the model fits, between
 * them after it has stopped, one step past the data, and far past it. The
 * first is the one to trust.
 */
function sampleTrust(rng: Rng, difficulty: number): TrustParams {
  const fit = sampleData(rng, difficulty, 'leave', { hs: difficulty > 1 ? [2, 4] : [2] });
  const half = fit.h / 2;
  const last = lastTime(fit);
  const good = (2 * rng.int(0, fit.from - 2) + 1) * half;
  const after = (2 * rng.int(fit.from, fit.res.length - 2) + 1) * half;
  return { ...fit, times: [good, after, last + fit.h, last + rng.int(4, 6) * fit.h] };
}

const expmTrustChoice: Generator<TrustParams> = {
  id: 'expm-trust-choice',
  sample: sampleTrust,
  render: (params): Slide => {
    const fromT = dataTimes(params)[params.from];
    const labels = turned(params.times.map((t) => `t = ${t}`), `${params.a}-${params.res.join(',')}`);
    const ask =
      params.res.length > 5
        ? `The model stays within $${params.margin}$ of the measurements only up to a point. At which time can its prediction be trusted most?`
        : `The measurements are more than $${params.margin}$ from the model from $t = ${fromT}$ on. At which time can its prediction be trusted most?`;
    return {
      kind: 'choice',
      prompt: dataPrompt(params, ask),
      options: labels.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
      correctId: `opt${labels.indexOf(`t = ${params.times[0]}`)}`,
    };
  },
  solution: (params) => {
    const [good, after, near, far] = params.times;
    const fromT = dataTimes(params)[params.from];
    return [
      { tex: residualLine(params.res) },
      { text: `The model fits up to $t = ${dataTimes(params)[params.from - 1]}$ and leaves the data from $t = ${fromT}$.` },
      { text: `$t = ${good}$ is between measurements where the model fits: interpolation, and trustworthy.` },
      { text: `$t = ${after}$ is inside the data but where the model has stopped fitting. $t = ${near}$ and $t = ${far}$ are past the data altogether, and the further out, the less the model can be trusted.` },
    ];
  },
};

/* ---------- registry ---------- */

export const exponentialModelGenerators = [
  expmReadFlow,
  expmStart,
  expmBuildTiles,
  expmDescribe,
  expmPowerValue,
  expmEvaluate,
  expmAtTimeTree,
  expmPassSlider,
  expmConvertTiles,
  expmKValue,
  expmBack,
  expmMultiplierSlider,
  expmDoublingSlider,
  expmDoubling,
  expmDoublingTiles,
  expmHalfLifeFlow,
  expmFitTree,
  expmFitK,
  expmFitTiles,
  expmStartBack,
  expmLimitFlow,
  expmBoundedStart,
  expmCoolEvaluate,
  expmCoolTiles,
  expmReachSteps,
  expmWhen,
  expmReachSlider,
  expmReachTiles,
  expmRate,
  expmRateAt,
  expmRateTiles,
  expmRateMatch,
  expmModelFlow,
  expmModelChoice,
  expmNextTree,
  expmPercentTiles,
  expmPercentK,
  expmPercentFlow,
  expmRateWords,
  expmAvgTree,
  expmAvgReduce,
  expmAvgSlider,
  expmAvgRate,
  expmAvgCompare,
  expmInstant,
  expmInstantTiles,
  expmRateCompareFlow,
  expmWhichRate,
  expmKFromRate,
  expmAmountFromRate,
  expmRateSolveSteps,
  expmRateReachTree,
  expmTwoFaster,
  expmTwoFlow,
  expmTwoSlider,
  expmTwoEqual,
  expmLeadTree,
  expmLeadWhich,
  expmLeadGap,
  expmLeadFlow,
  expmOvertakeSteps,
  expmOvertakeTiles,
  expmOvertakeSlider,
  expmOvertakeTime,
  expmMeetTree,
  expmMeetSlider,
  expmMeetTime,
  expmMeetWhich,
  expmSumTiles,
  expmSumFlow,
  expmSumAt,
  expmSumTree,
  expmDiffTree,
  expmGapSteps,
  expmGapSlider,
  expmGapFlow,
  expmLogisticBuildTiles,
  expmLogisticStart,
  expmLogisticRead,
  expmLogisticFlow,
  expmLogisticValueTree,
  expmLogisticAt,
  expmLogisticReduce,
  expmLogisticWorkSteps,
  expmLogisticMidSlider,
  expmLogisticMid,
  expmLogisticHalfSteps,
  expmLogisticSteepest,
  expmLogisticRateTiles,
  expmLogisticRateAt,
  expmLogisticRateFlow,
  expmLogisticRateTree,
  expmLogisticReachSteps,
  expmLogisticUTiles,
  expmLogisticReachSlider,
  expmLogisticWhen,
  expmStepTree,
  expmStepWorkSteps,
  expmStepAmount,
  expmStepCalc,
  expmOftenFlow,
  expmOftenOrder,
  expmOftenTiles,
  expmOftenGainTree,
  expmBernoulliTree,
  expmBernoulliBackSteps,
  expmEValue,
  expmELimit,
  expmContTiles,
  expmContExact,
  expmContFlow,
  expmContSteps,
  expmEffective,
  expmEffectiveBest,
  expmEffectiveFlow,
  expmEffectiveTiles,
  expmResidual,
  expmPredictTree,
  expmResidualTiles,
  expmResidColumn,
  expmResidLargest,
  expmFurthestTree,
  expmPatternFlow,
  expmPatternChoice,
  expmLeavesSlider,
  expmOvershoot,
  expmLevelFlow,
  expmFixChoice,
  expmSquaresTree,
  expmSsr,
  expmBetterTiles,
  expmLargestFlow,
  expmInterpValue,
  expmValidLine,
  expmFarFlow,
  expmTrustChoice,
];
