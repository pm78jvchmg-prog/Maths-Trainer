/**
 * Exponential Models: the continuous model y = Ae^(kt), read, evaluated,
 * rewritten, fitted and used.
 *
 * Other courses own the pieces this is built from, and nothing here teaches
 * them again: whole-step growth without e is Exponents level 7, ln and solving
 * N = N0 r^t for t is Logarithms level 3, linearising a model is Logarithms
 * level 6, and d/dx of e^x is Differentiation level 4. What this owns is the
 * model itself: what A and k say, b^t written as e^(kt), doubling time and
 * half-life as (ln 2)/k, models bounded by a level, and the rate as ky.
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
import { markerWindow, plotSvg } from '../figures';
import { EXP_KEYS } from './calculus';
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
  grow: (sym, n) => `The line below is $${sym}$ at $t = ${n}$, with $e^{t\\ln b}$ written as $b^{t}$.`,
  gain: (sym, n) => `The line below is how much $${sym}$ has grown by at $t = ${n}$, with $e^{t\\ln b}$ written as $b^{t}$.`,
  decay: (sym, n) => `The line below is $${sym}$ at $t = ${n}$, with $e^{-t\\ln b}$ written as $\\frac{1}{b^{t}}$.`,
  between: (sym, n, n1) => `The line below is how much $${sym}$ grows between $t = ${n1}$ and $t = ${n}$, with $e^{t\\ln b}$ written as $b^{t}$.`,
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
          text: `${opening(story, modelTex(a, { b, h, down }))} Find $${story.sym}$ when $t = ${t}$. It ${down ? 'divides' : 'multiplies'} by $${b}$ every $${h}$ ${story.unit}s, so fill in how many lots of $${h}$ that is, then that power of $${b}$, then $${story.sym}$.`,
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
          text: `${opening(story, modelTex(a, { b, h: 1, down }))} The dashed line is $${target}$, and each dot is the value at a whole ${story.unit}. Slide to the first whole ${story.unit} at which $${story.sym}$ is ${down ? 'below' : 'above'} $${target}$.`,
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
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 1.4,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [{ f: (t) => Math.min(Math.exp(growth * t), span * 2) }],
          marks: [{ x: 0, y: 1 }],
          verticals: [{ x: 1, dashed: true }],
          label: 'A rising curve starting at 1, with a dashed line at t = 1',
        }),
        ...window,
        axis: 'y',
      },
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
            `Fill in the ratio of the ${down ? 'first value to the second' : 'second value to the first'}, then the time between them, then what one unit of time ${down ? 'divides' : 'multiplies'} by, then the start $A$.`,
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
  render: (params): Slide => {
    const { level, gap, b, h, m, rising, ctx } = params;
    const story = boundedStory(rising, ctx);
    const power = b ** m;
    const part = gap / power;
    const op = rising ? '-' : '+';
    const shift = rising ? -1 : 1;
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `${story.subject} after $t$ ${story.unit}s is $${story.sym} = ${coolModel(params)}$. At $t = ${m * h}$ the power is $-${m}\\ln ${b}$, so $e$ to it is $\\frac{1}{${b}^{${m}}}$ and $${story.sym}$ is the line below. Tap the part you would do **next**, then choose what it comes to.`,
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
        `${start}e^{-${k}t}`,
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
    const { a, b, h, m, down } = params;
    const target = reachTarget(params);
    const power = b ** m;
    const size = h === 1 ? `\\ln ${b}` : `\\frac{\\ln ${b}}{${h}}`;
    const answer = [`\\ln ${power}`, size];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${reachOpening(params)} Build the time it takes to reach $${texNum(target)}$: the logarithm of how many times ${down ? 'smaller' : 'bigger'} that is, divided by the size of $k$.`,
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

function tableTex({ values, dt }: TableParams): string {
  const times = values.map((_, i) => `${i * dt}`).join(' & ');
  return `\\begin{array}{c|${'c'.repeat(values.length)}} t & ${times} \\\\ \\hline y & ${values.map(texNum).join(' & ')} \\end{array}`;
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
    (x) => `A ${x * 10} mg dose of a drug leaves the blood at a rate proportional to the amount left.`,
    (x, y) => `A ${x * 5} g radioactive sample halves every ${y % 9 + 2} days.`,
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
          text: `${opening(story, modelTex(a, params))} The line below is its average rate of change from $t = ${t1}$ to $t = ${t2}$, with $e^{${ktTex(params)}}$ written as $${everyTex(params)}$. Tap the part you would do **next**, then choose what it comes to.`,
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
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${opening(story, modelTex(a, params))} Each dot is $${story.sym}$ ${h === 1 ? `every ${story.unit}` : `every ${h} ${story.unit}s`}. Slide to the start of the ${stretch} stretch over which it ${down ? 'falls' : 'grows'} at an average of ${texNum(stretchRate(params))} ${story.of} per ${story.unit}.`,
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
    const { sym } = storyOf(down, ctx);
    const row = (i: number) => {
      const y0 = lotsValue(params, i);
      const y1 = lotsValue(params, i + 1);
      return `t = ${i * h}: \\quad \\frac{${texNum(y1)} - ${texNum(y0)}}{${h}} &= ${texNum((y1 - y0) / h)}`;
    };
    return [
      { text: `$e^{${ktTex(params)}} = ${everyTex(params)}$, so every ${h === 1 ? '' : `${h} `}step ${down ? 'divides' : 'multiplies'} $${sym}$ by $${b}$. Work out the average rate over each stretch in turn.` },
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
  return `${n < 0 ? '-' : ''}\\frac{${texNum(Math.abs(n))}\\ln ${b}}{${h}}`;
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
          text: `${opening(story, model)} The dashed chord joins $t = ${t1}$ and $t = ${t2}$. Compare its rate at one end with the average, one question at a time.`,
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
          text: `${opening(story, model)} Its rate is $\\frac{d${story.sym}}{dt} = ${kTex(params)} \\times ${story.sym}$. Find when $\\frac{d${story.sym}}{dt} = ${lnTex(c, b)}$ one step at a time: tap the step to do next, then choose what it gives.`,
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
];
