/**
 * Exponents and Radicals, level 7: growth by repeated multiplication.
 *
 * The index laws put to work on things that grow or shrink by the same factor
 * at every step: a start value times a multiplier to the power of the number
 * of steps. Everything stays at whole numbers of steps. Solving `a^x = b` by
 * logarithms and drawing `e^x` belong to other courses, so the only way this
 * level finds a number of steps is by counting or by matching bases.
 *
 * Spread into `indicesGenerators` rather than registered on its own, so the
 * registry does not change.
 */
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import { bin, num, pow, type Expr } from '../expr';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
// Where a slider's handle rests before it is touched. Imported rather than
// restated so a question cannot be built against a rule the widget has moved.
import { defaultSliderValue } from '../../ui/sliderValue';
import type { Rng } from '../../engine/rng';
import { aOrAn } from './format';

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

/** A whole number as the learner reads it in TeX: 20{,}000 from five digits up. */
function texNum(n: number): string {
  return Math.abs(n) >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}') : String(n);
}

/** The same in prose: 20,000. */
function proseNum(n: number): string {
  return Math.abs(n) >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(n);
}

/**
 * The same items turned by a hash of `key`, so a flow's right branch is not
 * always first yet one question still renders one way.
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
 * and the gap filled with numbers near the answer.
 */
function numberOptions(correct: number, slips: number[], plain = false): ChoiceOption[] {
  const show = plain ? String : texNum;
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of slips) {
    if (picked.length === 3) break;
    // A slip fifty times out is not one anybody would weigh up.
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

/** A percentage multiplier held in hundredths: 105 is 1.05, 80 is 0.8. */
function dec(c: number): string {
  return String(c / 100);
}

/** (c / 100)^n written out exactly: 110 and 2 give 1.21. */
function decPow(c: number, n: number): string {
  const places = 2 * n;
  const digits = String(c ** n).padStart(places + 1, '0');
  const whole = digits.slice(0, -places);
  const fraction = digits.slice(-places).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

/** a × (c / 100)^n when that is a whole number, else undefined. Exact. */
function wholeAfter(a: number, c: number, n: number): number | undefined {
  const top = a * c ** n;
  const bottom = 100 ** n;
  return top % bottom === 0 ? top / bottom : undefined;
}

function rootName(n: number): string {
  if (n === 2) return 'square root';
  if (n === 3) return 'cube root';
  return `${['', '', '', '', 'fourth', 'fifth', 'sixth'][n] ?? `${n}th`} root`;
}

/**
 * A run of values joined by arrows, four to a row, so a long halving does not
 * run off a phone screen.
 */
function arrows(values: number[]): string {
  const rows: string[] = [];
  for (let i = 0; i < values.length; i += 4) {
    const row = values.slice(i, i + 4).map(texNum).join(' \\to ');
    rows.push(i === 0 ? `& ${row}` : `& \\to ${row}`);
  }
  return chain(...rows);
}

/** Numbers every sample below leans on: a list of values of a × r^k. */
function terms(a: number, r: number, count: number, from = 0): number[] {
  return Array.from({ length: count }, (_, k) => a * r ** (from + k));
}

/* ---------- Lesson 1: a multiplier per step ---------- */

const MULTIPLY_VERB: Record<number, string> = {
  2: 'doubles',
  3: 'triples',
  4: 'multiplies by 4',
  5: 'multiplies by 5',
  10: 'multiplies by 10',
};

interface TermContext {
  noun: string;
  unit: string;
  opening: (a: number, verb: string, period: string) => string;
  question: (time: string) => string;
}

const TERM_CONTEXTS: TermContext[] = [
  {
    noun: 'cells',
    unit: 'hour',
    opening: (a, verb, period) =>
      `A culture starts with ${a} cells, and the number of cells ${verb} every ${period}.`,
    question: (time) => `How many cells are there after ${time}?`,
  },
  {
    noun: 'shares',
    unit: 'day',
    opening: (a, verb, period) =>
      `A post has ${a} shares on the day it goes up, and its share count ${verb} every ${period}.`,
    question: (time) => `How many shares does it have ${time} later?`,
  },
  {
    noun: 'people',
    unit: 'hour',
    opening: (a, verb, period) =>
      `A rumour starts with ${a} people, and the number who know it ${verb} every ${period}.`,
    question: (time) => `How many people know it after ${time}?`,
  },
  {
    noun: 'area',
    unit: 'week',
    opening: (a, verb, period) =>
      `Weed covers ${a} square metres of a pond, and the area it covers ${verb} every ${period}.`,
    question: (time) => `How many square metres does it cover after ${time}?`,
  },
  {
    noun: 'coins',
    unit: 'round',
    opening: (a, verb, period) =>
      `A game starts you on ${a} coins, and your total ${verb} every ${period} you survive.`,
    question: (time) => `How many coins do you have after ${time}?`,
  },
];

interface TermParams {
  a: number;
  r: number;
  /** Number of multiplications. */
  n: number;
  /** Time units per multiplication; above 1 the learner has to count the steps. */
  every: number;
  ctx: number;
}

function termWords({ n, every, ctx }: TermParams): { period: string; time: string } {
  const { unit } = TERM_CONTEXTS[ctx];
  return {
    period: every === 1 ? unit : `${every} ${unit}s`,
    time: `${n * every} ${unit}s`,
  };
}

function sampleTerm(rng: Rng, difficulty: number): TermParams {
  for (;;) {
    const hard = difficulty > 1;
    const r = rng.pick(hard ? [2, 3, 4, 5] : [2, 3, 10]);
    const n = rng.int(hard ? 3 : 2, hard ? 6 : 5);
    const a = rng.int(2, hard ? 12 : 9);
    if (a * r ** n > (hard ? 200000 : 100000)) continue;
    return { a, r, n, every: hard ? rng.pick([2, 3, 4]) : 1, ctx: rng.int(0, TERM_CONTEXTS.length - 1) };
  }
}

/** The value after n steps: a start times the multiplier to the power n. */
const growTerm: Generator<TermParams> = {
  id: 'grow-term',
  sample: sampleTerm,
  choices: ({ a, r, n, every }) =>
    numberOptions(a * r ** n, [
      a * r * n,
      (a * r) ** n,
      a * r ** (n * every),
      a * r ** (n - 1),
      a * r ** (n + 1),
    ]),
  render: (params): Slide => {
    const { a, r, ctx } = params;
    const context = TERM_CONTEXTS[ctx];
    const { period, time } = termWords(params);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${context.opening(a, MULTIPLY_VERB[r], period)} ${context.question(time)}` }],
      lead: `\\text{${context.noun}} =`,
      keypad: [],
      answer: String(a * r ** params.n),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, r, n, every, ctx } = params;
    const { unit } = TERM_CONTEXTS[ctx];
    const { time } = termWords(params);
    return [
      {
        text:
          every === 1
            ? `${time} is ${n} steps, so there are ${n} multiplications by $${r}$.`
            : `${time} is ${n} lots of ${every} ${unit}s, so there are ${n} multiplications by $${r}$, not ${n * every}.`,
      },
      { tex: chain(`${a} \\times ${r}^{${n}} &= ${a} \\times ${texNum(r ** n)}`, `&= ${texNum(a * r ** n)}`) },
      { text: 'The index belongs to the multiplier alone: work out the power first, then multiply by the start.' },
    ];
  },
};

interface RuleParams {
  a: number;
  r: number;
  /** The step the table starts at: 0 shows the start, 1 hides it. */
  from: number;
}

function ruleTable(a: number, r: number, from: number): string {
  const steps = [0, 1, 2, 3].map((k) => `${from + k}`).join(' & ');
  const values = terms(a, r, 4, from).map(texNum).join(' & ');
  return `\\begin{array}{c|cccc} n & ${steps} \\\\ \\hline V & ${values} \\end{array}`;
}

/** Build V = a × r^n from a table of values. */
const growRuleTiles: Generator<RuleParams> = {
  id: 'grow-rule-tiles',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 12 : 9),
    r: rng.int(2, 5),
    from: difficulty > 1 ? 1 : 0,
  }),
  render: ({ a, r, from }): Slide => {
    const answer = [`${a}`, `${r}^{n}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'The table gives the value $V$ after $n$ steps. Build the rule for $V$: the start, times the multiplier to the power $n$.',
        },
        { kind: 'display', tex: ruleTable(a, r, from) },
      ],
      template: 'V = {0} \\times {1}',
      bank: fillBank(answer, [`${a * r}`, `${a * r - a}`, `${r}n`, `n^{${r}}`, `${r + 1}^{n}`]),
      answer,
    };
  },
  solution: ({ a, r, from }) => {
    const [first, second] = terms(a, r, 2, from);
    return [
      { text: `Each value is ${r} times the one before: $${texNum(second)} \\div ${texNum(first)} = ${r}$.` },
      from === 0
        ? { text: `The start is the value at $n = 0$, which is $${a}$.` }
        : {
            text: `The table starts at $n = 1$, so step back once to find the start: $${texNum(first)} \\div ${r} = ${a}$.`,
          },
      { tex: `V = ${a} \\times ${r}^{n}` },
    ];
  },
};

interface ChainParams {
  a: number;
  r: number;
  /** How many steps the tree fills in. */
  steps: number;
}

/** Multiply, and multiply again: the values after each step, down a chain. */
const growChainTree: Generator<ChainParams> = {
  id: 'grow-chain-tree',
  sample: (rng, difficulty) => ({
    a: rng.int(difficulty > 1 ? 2 : 1, difficulty > 1 ? 12 : 9),
    r: rng.int(2, 5),
    steps: difficulty > 1 ? 4 : 3,
  }),
  render: ({ a, r, steps }): Slide => {
    const values = terms(a, r, steps, 1);
    const answer = values.map(texNum);
    const ids = values.map((_, k) => `s${k + 1}`);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `A value starts at $${a}$ and is multiplied by $${r}$ at every step. Fill in the value after each step, from step 1 at the top to step ${steps} at the bottom.`,
        },
      ],
      expression: `V = ${a} \\times ${r}^{n}`,
      nodes: ids.map((id, k) => ({ id, from: k === 0 ? [] : [ids[k - 1]] })),
      bank: fillBank(answer, [
        ...[1, 2, 3].map((k) => texNum(a + k * r)),
        texNum(a * r * 2),
        texNum(a * r * 3),
        texNum(a * r ** (steps + 1)),
        texNum(a * (r + 1)),
      ]),
      answer,
    };
  },
  solution: ({ a, r, steps }) => {
    const values = terms(a, r, steps + 1);
    return [
      { text: `Each step multiplies the value before it by $${r}$. Adding $${r}$ each time is a different, slower kind of growth.` },
      {
        tex: chain(
          ...values.slice(1).map((value, k) => `${texNum(values[k])} \\times ${r} &= ${texNum(value)}`),
        ),
      },
      {
        text: `After ${steps} steps that is $${a} \\times ${r}^{${steps}} = ${texNum(values[steps])}$: the index counts the multiplications.`,
      },
    ];
  },
};

const GROWTH_OPENINGS = [
  (a: number, verb: string, n: number) => `A colony of ${a} ants ${verb} every month for ${n} months.`,
  (a: number, verb: string, n: number) => `A pile of ${a} sweets ${verb} every round of a game, for ${n} rounds.`,
  (a: number, verb: string, n: number) => `A patch of ${a} daisies ${verb} every year for ${n} years.`,
];

interface GrowthParams {
  a: number;
  r: number;
  n: number;
  ctx: number;
}

function growthExpr({ a, r, n }: GrowthParams): Expr {
  return bin('-', bin('*', num(a), pow(num(r), num(n))), num(a));
}

/** Six whole values for a reduce bank: the right one first, then the slips. */
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

/**
 * How much it grew by: a × r^n − a, reduced a piece at a time.
 *
 * The power has to be taken before the multiplication, and the slip it
 * invites, (a × r)^n, is in the product's bank as a believable wrong value.
 */
const growEvaluate: Generator<GrowthParams> = {
  id: 'grow-evaluate',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const r = rng.int(2, hard ? 5 : 3);
      const n = rng.int(2, hard ? 5 : 4);
      const a = rng.int(2, hard ? 12 : 9);
      if (r ** n > 625) continue;
      return { a, r, n, ctx: rng.int(0, GROWTH_OPENINGS.length - 1) };
    }
  },
  choices: ({ a, r, n }) => {
    const grown = a * r ** n;
    // Plain digits: an evaluate slide reads its options back as numbers.
    return numberOptions(grown - a, [(a * r) ** n - a, grown, a * r * n - a, a * r ** (n - 1) - a], true);
  },
  render: (params): Slide => {
    const { a, r, n, ctx } = params;
    const power = r ** n;
    const product = a * power;
    const verb = MULTIPLY_VERB[r] ?? `multiplies by ${r}`;
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `${GROWTH_OPENINGS[ctx](a, verb, n)} The line below is how much it grew by. Tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      expr: growthExpr(params),
      banks: {
        r: offer(product - a, product + a, product, power - a, a * r * n - a),
        'r.l': offer(product, ...((a * r) ** n < 100000 ? [(a * r) ** n] : []), a * r * n, a + power, power),
        'r.l.r': offer(power, r * n, r + n, r ** (n - 1)),
      },
    };
  },
  solution: ({ a, r, n }) => {
    const power = r ** n;
    const product = a * power;
    return [
      { text: 'The power comes first, then the multiplication, and the taking away last.' },
      {
        tex: chain(
          `& ${a} \\times ${r}^{${n}} - ${a}`,
          `&= ${a} \\times ${power} - ${a}`,
          `&= ${texNum(product)} - ${a}`,
          `&= ${texNum(product - a)}`,
        ),
      },
      { text: `It grew from $${a}$ to $${texNum(product)}$, which is $${texNum(product - a)}$ more.` },
    ];
  },
};

/* ---------- Lesson 2: percentage change as a multiplier ---------- */

interface PctContext {
  /** True for a context that rises, false for one that falls. */
  up: boolean;
  money: boolean;
  opening: (a: string, p: number) => string;
  /** Asks for the value after `time`. */
  question: (time: string) => string;
  noun: string;
}

const PCT_CONTEXTS: PctContext[] = [
  {
    up: true,
    money: true,
    noun: 'value',
    opening: (a, p) => `A house worth £${a} rises in value by ${p}% a year.`,
    question: (time) => `What is it worth after ${time}?`,
  },
  {
    up: true,
    money: false,
    noun: 'people',
    opening: (a, p) => `A town of ${a} people grows by ${p}% a year.`,
    question: (time) => `How many people live there after ${time}?`,
  },
  {
    up: true,
    money: true,
    noun: 'balance',
    opening: (a, p) => `Savings of £${a} earn ${p}% interest a year, which is added to the pot.`,
    question: (time) => `How much is in the pot after ${time}?`,
  },
  {
    up: false,
    money: true,
    noun: 'value',
    opening: (a, p) => `A car worth £${a} loses ${p}% of its value each year.`,
    question: (time) => `What is it worth after ${time}?`,
  },
  {
    up: false,
    money: false,
    noun: 'fish',
    opening: (a, p) => `A lake holds ${a} fish, and ${p}% of them are lost each year.`,
    question: (time) => `How many fish are left after ${time}?`,
  },
  {
    up: false,
    money: true,
    noun: 'price',
    opening: (a, p) => `A phone costing £${a} drops in price by ${p}% a year.`,
    question: (time) => `What does it cost after ${time}?`,
  },
];

function years(n: number): string {
  return n === 1 ? '1 year' : `${n} years`;
}

/** The yearly multiplier in hundredths: 5% up is 105, 20% down is 80. */
function yearly(p: number, up: boolean): number {
  return up ? 100 + p : 100 - p;
}

/** What multiplying by c / 100 does, as a plain fact. */
function describeChange(c: number): string {
  if (c > 100) return `adds $${c - 100}\\%$`;
  if (c < 100) return `takes off $${100 - c}\\%$`;
  return 'changes nothing';
}

interface PctFlowParams {
  p: number;
  ctx: number;
  a: number;
  n: number;
}

const FLOW_PERCENTS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];
const ROUND_STARTS = [200, 400, 500, 800, 1000, 1500, 2000, 2500, 4000, 5000, 8000];

/** Candidate multipliers for a p% change one way: the right one and the usual slips. */
function candidateMultipliers(p: number, up: boolean): number[] {
  const out = [yearly(p, up), p];
  if (p < 10) out.push(up ? 100 + 10 * p : 100 - 10 * p);
  else if (p % 10 === 0) out.push(up ? 100 + p / 10 : 100 - p / 10);
  return [...new Set(out)];
}

/**
 * From a percentage change to the multiplier, and over several years to its
 * power. Each fork leads somewhere different, and every outcome states a fact
 * about the branch taken, so a wrong turn never shows the right multiplier.
 */
const growPctFlow: Generator<PctFlowParams> = {
  id: 'grow-pct-flow',
  sample: (rng, difficulty) => ({
    p: rng.pick(FLOW_PERCENTS),
    ctx: rng.int(0, PCT_CONTEXTS.length - 1),
    a: rng.pick(ROUND_STARTS),
    n: difficulty > 1 ? rng.int(2, 4) : 1,
  }),
  render: ({ p, ctx, a, n }): Slide => {
    const context = PCT_CONTEXTS[ctx];
    const right = yearly(p, context.up);
    const key = `${p}-${ctx}-${n}`;
    const stepsFor = (up: boolean) => {
      const candidates = candidateMultipliers(p, up);
      const fork = {
        id: up ? 'up' : 'down',
        ask: `Which multiplier makes ${aOrAn(p)} $${p}\\%$ ${up ? 'increase' : 'decrease'}?`,
        branches: turned(
          candidates.map((c, i) =>
            n === 1
              ? { label: `$\\times ${dec(c)}$`, outcome: `Multiplying by $${dec(c)}$ ${describeChange(c)}.` }
              : { label: `$\\times ${dec(c)}$`, to: `${up ? 'up' : 'down'}-years-${i}` },
          ),
          key,
        ),
      };
      const yearSteps =
        n === 1
          ? []
          : candidates.map((c, i) => ({
              id: `${up ? 'up' : 'down'}-years-${i}`,
              ask: `Over ${n} years, what does that make the multiplier?`,
              branches: turned(
                [
                  {
                    label: `$${dec(c)}^{${n}}$`,
                    outcome: `Each year multiplies by $${dec(c)}$ again, so ${n} years multiply by $${dec(c)}^{${n}} = ${decPow(c, n)}$.`,
                  },
                  {
                    label: `$${dec(c)} \\times ${n}$`,
                    outcome: `That adds the yearly multiplier up ${n} times. Growth applies it ${n} times, one year after another.`,
                  },
                ],
                `${key}-${i}`,
              ),
            }));
      return [fork, ...yearSteps];
    };
    const label = `$\\times ${dec(right)}$`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${context.opening(proseNum(a), p)} Find what it is multiplied by over ${years(n)}. Each answer chooses what gets asked next.`,
        },
      ],
      subject: `${p}\\%\\ \\text{a year}${n > 1 ? `,\\ ${n}\\ \\text{years}` : ''}`,
      steps: [
        {
          id: 'way',
          ask: 'Does the amount end up bigger or smaller?',
          branches: [
            { label: 'Bigger', to: 'up' },
            { label: 'Smaller', to: 'down' },
          ],
        },
        ...stepsFor(true),
        ...stepsFor(false),
      ],
      answer: [context.up ? 'Bigger' : 'Smaller', label, ...(n > 1 ? [`$${dec(right)}^{${n}}$`] : [])],
    };
  },
  solution: ({ p, ctx, n }) => {
    const { up } = PCT_CONTEXTS[ctx];
    const c = yearly(p, up);
    return [
      {
        text: up
          ? `An increase keeps all 100% and adds ${p}% more, so each year multiplies by $${dec(c)}$.`
          : `A decrease of ${p}% leaves ${c}% of the amount, so each year multiplies by $${dec(c)}$.`,
      },
      { tex: chain(`100\\% ${up ? '+' : '-'} ${p}\\% &= ${c}\\%`, `&\\to \\times ${dec(c)}`) },
      n > 1
        ? { text: `Each year multiplies by $${dec(c)}$ again, so ${n} years multiply by $${dec(c)}^{${n}}$.` }
        : { text: `Multiplying by $${dec(p)}$ instead would keep only ${p}% of the amount.` },
    ];
  },
};

interface PctCalcParams {
  a: number;
  p: number;
  ctx: number;
  n: number;
}

const TILE_PERCENTS = { easy: [5, 10, 20, 25, 50], hard: [2, 3, 4, 5, 6, 8, 12, 15, 30, 40] };
const TILE_STARTS = [300, 400, 600, 800, 1200, 1500, 2000, 2400, 3000, 5000, 6000];

/** Build start × multiplier^years from the story. */
const growPctTiles: Generator<PctCalcParams> = {
  id: 'grow-pct-tiles',
  sample: (rng, difficulty) => ({
    a: rng.pick(TILE_STARTS),
    p: rng.pick(difficulty > 1 ? TILE_PERCENTS.hard : TILE_PERCENTS.easy),
    ctx: rng.int(0, PCT_CONTEXTS.length - 1),
    n: rng.int(2, difficulty > 1 ? 6 : 4),
  }),
  render: ({ a, p, ctx, n }): Slide => {
    const context = PCT_CONTEXTS[ctx];
    const c = yearly(p, context.up);
    const answer = [`${a}`, `${dec(c)}^{${n}}`];
    const change = (a * p) / 100;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${context.opening(proseNum(a), p)} Build the calculation for the ${context.noun} after ${years(n)}.`,
        },
      ],
      template: `\\text{${context.noun}} = {0} \\times {1}`,
      bank: fillBank(answer, [
        ...(Number.isInteger(change) ? [`${change}`] : []),
        `${dec(p)}^{${n}}`,
        `${dec(yearly(p, !context.up))}^{${n}}`,
        `${dec(c)} \\times ${n}`,
        ...(p < 10 ? [`${dec(context.up ? 100 + 10 * p : 100 - 10 * p)}^{${n}}`] : []),
      ]),
      answer,
    };
  },
  solution: ({ a, p, ctx, n }) => {
    const { up } = PCT_CONTEXTS[ctx];
    const c = yearly(p, up);
    return [
      {
        text: `${aOrAn(p, true)} ${p}% ${up ? 'rise' : 'fall'} leaves ${c}% of the amount, so each year multiplies by $${dec(c)}$.`,
      },
      { tex: `${a} \\times ${dec(c)}^{${n}}` },
      { text: `The start is multiplied once by the whole power: the index ${n} counts the years.` },
    ];
  },
};

/** Starts and rates for which the value after n years is a whole number. */
function pctValuePool(percents: number[], counts: number[]): PctCalcParams[] {
  const starts = [
    100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1600, 2000, 2400, 2500, 3000, 4000, 5000, 6000,
    8000, 10000, 12000, 16000, 20000, 25000, 40000, 50000,
  ];
  return PCT_CONTEXTS.flatMap((context, ctx) =>
    percents.flatMap((p) =>
      counts.flatMap((n) =>
        starts
          .filter((a) => wholeAfter(a, yearly(p, context.up), n) !== undefined)
          .map((a) => ({ a, p, ctx, n })),
      ),
    ),
  );
}

const PCT_VALUE_EASY = pctValuePool([5, 10, 20, 25, 50], [1, 2]);
const PCT_VALUE_HARD = pctValuePool([2, 4, 5, 10, 15, 20, 25, 30, 40, 50], [2, 3]);

/** The value after n years of the same percentage change, typed. */
const growPctValue: Generator<PctCalcParams> = {
  id: 'grow-pct-value',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? PCT_VALUE_HARD : PCT_VALUE_EASY),
  choices: ({ a, p, ctx, n }) => {
    const { up } = PCT_CONTEXTS[ctx];
    const c = yearly(p, up);
    const value = wholeAfter(a, c, n) ?? 0;
    const simple = (a * (100 + (up ? 1 : -1) * n * p)) / 100;
    return numberOptions(value, [
      simple,
      wholeAfter(a, c, 1) ?? 0,
      wholeAfter(a, yearly(p, !up), n) ?? 0,
      wholeAfter(a, c, n + 1) ?? 0,
    ]);
  },
  render: ({ a, p, ctx, n }): Slide => {
    const context = PCT_CONTEXTS[ctx];
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${context.opening(proseNum(a), p)} ${context.question(years(n))}` }],
      lead: `\\text{${context.noun}} =`,
      keypad: [],
      answer: String(wholeAfter(a, yearly(p, context.up), n)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, p, ctx, n }) => {
    const { up } = PCT_CONTEXTS[ctx];
    const c = yearly(p, up);
    const value = wholeAfter(a, c, n) ?? 0;
    const steps: SolutionStep[] = [
      { text: `${aOrAn(p, true)} ${p}% ${up ? 'rise' : 'fall'} multiplies by $${dec(c)}$ each year.` },
      {
        tex: chain(
          `& ${texNum(a)} \\times ${dec(c)}^{${n}}`,
          `&= ${texNum(a)} \\times ${decPow(c, n)}`,
          `&= ${texNum(value)}`,
        ),
      },
    ];
    if (n > 1) {
      steps.push({
        text: `Each year's ${p}% is worked out on the new amount, not the original, which is why this is not just ${n} lots of ${p}%.`,
      });
    }
    return steps;
  },
};

interface PassParams {
  a: number;
  p: number;
  /** The target as a multiple of the start. */
  times: number;
  ctx: number;
}

const PASS_CONTEXTS = [
  { opening: (a: string, p: number) => `Savings of £${a} earn ${p}% interest a year.`, money: true },
  { opening: (a: string, p: number) => `A town of ${a} people grows by ${p}% a year.`, money: false },
  { opening: (a: string, p: number) => `A painting worth £${a} gains ${p}% in value each year.`, money: true },
];

/** The first whole year that a × m^n is more than times × a. */
function passYear(p: number, times: number): number {
  let n = 0;
  while ((1 + p / 100) ** n <= times) n += 1;
  return n;
}

const PASS_STARTS = [100, 200, 250, 400, 500, 800, 1000, 1200, 1500, 2000];

function passPool(percents: number[], multiples: number[]): PassParams[] {
  return PASS_CONTEXTS.flatMap((_, ctx) =>
    percents.flatMap((p) =>
      multiples
        .filter((times) => passYear(p, times) <= 12)
        .flatMap((times) => PASS_STARTS.map((a) => ({ a, p, times, ctx }))),
    ),
  );
}

const PASS_EASY = passPool([10, 20, 25, 50], [2]);
const PASS_HARD = passPool([8, 10, 12, 15, 20, 25, 30, 40, 50], [3, 4, 5]);

/** Slide to the first whole year a percentage growth passes a target. */
const growPctSlider: Generator<PassParams> = {
  id: 'grow-pct-slider',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? PASS_HARD : PASS_EASY),
  render: ({ a, p, times, ctx }): Slide => {
    const context = PASS_CONTEXTS[ctx];
    const target = a * times;
    const answer = passYear(p, times);
    let span = answer + 3;
    while (defaultSliderValue(0, span, 1) === answer) span += 1;
    const m = 1 + p / 100;
    const top = target * 1.5;
    const unit = context.money ? '£' : '';
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${context.opening(proseNum(a), p)} Each dot is a year's end. Slide to the first whole year it is more than ${unit}${proseNum(target)}, the dashed line.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: '\\text{year } {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: top,
          curves: [{ f: (t) => Math.min(a * m ** t, top * 2) }],
          marks: Array.from({ length: span + 1 }, (_, k) => ({ x: k, y: a * m ** k })).filter(
            (mark) => mark.y <= top,
          ),
          horizontals: [target],
          label: `A curve rising by ${p} percent a year, with a dashed line at ${target}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: ({ a, p, times }) => {
    const answer = passYear(p, times);
    const c = 100 + p;
    const at = (n: number) => a * (c / 100) ** n;
    const shown = (n: number) => {
      const value = at(n);
      return Number.isInteger(value) ? `= ${texNum(value)}` : `\\approx ${texNum(Math.round(value))}`;
    };
    return [
      { text: `Each year multiplies by $${dec(c)}$. Keep multiplying until the value passes $${texNum(a * times)}$.` },
      {
        tex: chain(
          `${texNum(a)} \\times ${dec(c)}^{${answer - 1}} &${shown(answer - 1)}`,
          `${texNum(a)} \\times ${dec(c)}^{${answer}} &${shown(answer)}`,
        ),
      },
      { text: `So it first passes $${texNum(a * times)}$ at the end of year ${answer}.` },
    ];
  },
};

/* ---------- Lesson 3: decay and negative indices ---------- */

const HALF_CONTEXTS = [
  { what: 'A dose of medicine', unit: 'mg', time: 'hour', left: 'in the blood' },
  { what: 'A radioactive sample', unit: 'g', time: 'day', left: 'in the sample' },
  { what: 'The caffeine from a strong coffee', unit: 'mg', time: 'hour', left: 'in the body' },
];

interface HalfParams {
  a: number;
  /** Half-life, in whole time units. */
  h: number;
  /** Number of halvings. */
  k: number;
  ctx: number;
  /** Ask for the amount after k half-lives, or for the time to fall below `below`. */
  ask: 'amount' | 'time';
  below: number;
}

function sampleHalf(rng: Rng, difficulty: number): HalfParams {
  for (;;) {
    const k = rng.int(difficulty > 1 ? 2 : 1, difficulty > 1 ? 5 : 4);
    const odd = rng.pick([1, 3, 5, 7, 9, 15, 25]);
    const a = odd * 2 ** rng.int(k, k + 2);
    if (a > 2000 || a < 16) continue;
    const h = rng.pick([2, 3, 4, 5, 6, 8, 12]);
    const ask = difficulty > 1 && rng.chance(0.5) ? 'time' : 'amount';
    // A round number in (a / 2^k, a / 2^(k - 1)]: first gone below after k halvings.
    const low = a / 2 ** k;
    const high = a / 2 ** (k - 1);
    const rounds = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].filter((t) => t > low && t <= high);
    if (ask === 'time' && rounds.length === 0) continue;
    return { a, h, k, ctx: rng.int(0, HALF_CONTEXTS.length - 1), ask, below: ask === 'time' ? rng.pick(rounds) : 0 };
  }
}

/** Half-life: the amount after whole half-lives, or when it first drops below a value. */
const growHalfLife: Generator<HalfParams> = {
  id: 'grow-half-life',
  sample: sampleHalf,
  choices: ({ a, h, k, ask }) =>
    ask === 'amount'
      ? numberOptions(a / 2 ** k, [a / (2 * k), a / 2 ** (k - 1), a / 2 ** (k + 1), a - (k * a) / 2])
      : numberOptions(k * h, [(k - 1) * h, (k + 1) * h, k, h]),
  render: ({ a, h, k, ctx, ask, below }): Slide => {
    const context = HALF_CONTEXTS[ctx];
    const opening = `${context.what} starts at ${a} ${context.unit}, and the amount ${context.left} halves every ${h} ${context.time}s.`;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text:
            ask === 'amount'
              ? `${opening} How many ${context.unit} are left after ${k * h} ${context.time}s?`
              : `${opening} After how many ${context.time}s is it first below ${below} ${context.unit}?`,
        },
      ],
      lead: ask === 'amount' ? `\\text{${context.unit}} =` : `\\text{${context.time}s} =`,
      keypad: [],
      answer: String(ask === 'amount' ? a / 2 ** k : k * h),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, h, k, ctx, ask, below }) => {
    const { time, unit } = HALF_CONTEXTS[ctx];
    const halvings = arrows(terms(a, 0.5, k + 1));
    if (ask === 'amount') {
      return [
        {
          text:
            k === 1
              ? `${h} ${time}s is exactly one half-life, so the amount halves once.`
              : `${k * h} ${time}s is ${k} half-lives of ${h} ${time}s, so the amount halves ${k} times.`,
        },
        { tex: `${a} \\times 2^{-${k}} = \\frac{${a}}{${2 ** k}} = ${a / 2 ** k}` },
        { tex: halvings },
      ];
    }
    return [
      { text: 'Halve until the amount first drops below the target, counting the halvings.' },
      { tex: halvings },
      {
        text: `After ${k - 1} halving${k === 2 ? '' : 's'} there ${k === 2 ? 'is' : 'are'} still ${a / 2 ** (k - 1)} ${unit}, and the next takes it below ${below}. That is ${k} half-lives, $${k} \\times ${h} = ${k * h}$ ${time}s.`,
      },
    ];
  },
};

interface HalfLifeSliderParams {
  a: number;
  h: number;
  /** Halvings to the dashed line: 1 is the half-life itself. */
  j: number;
  ctx: number;
}

const DECAY_STARTS = [80, 100, 120, 160, 200, 240, 320, 400, 480, 600, 800];

/** Read the half-life off a decay curve, or find the time to a quarter or an eighth. */
const growHalfLifeSlider: Generator<HalfLifeSliderParams> = {
  id: 'grow-halflife-slider',
  sample: (rng, difficulty) => {
    const j = difficulty > 1 ? rng.int(2, 3) : 1;
    const h = rng.int(2, j === 3 ? 5 : j === 2 ? 7 : 9);
    return { a: rng.pick(DECAY_STARTS), h, j, ctx: rng.int(0, HALF_CONTEXTS.length - 1) };
  },
  render: ({ a, h, j, ctx }): Slide => {
    const context = HALF_CONTEXTS[ctx];
    const answer = j * h;
    const target = a / 2 ** j;
    let span = Math.max(answer + 4, Math.ceil(answer * 1.5));
    while (defaultSliderValue(0, span, 1) === answer) span += 1;
    const fraction = j === 1 ? 'half' : j === 2 ? 'a quarter' : 'an eighth';
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text:
            j === 1
              ? `The curve shows ${context.what.toLowerCase()} decaying from ${a} ${context.unit}. The dashed line is half of it. Slide to the half-life: the ${context.time}s it takes to halve.`
              : `The curve shows ${context.what.toLowerCase()} decaying from ${a} ${context.unit}, halving every ${h} ${context.time}s. The dashed line is ${fraction} of the start. Slide to the time it gets there.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: `t = {v} \\text{ ${context.time}s}`,
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: a * 1.1,
          curves: [{ f: (t) => a * 2 ** (-t / h) }],
          horizontals: [target],
          label: `A decay curve starting at ${a}, with a dashed line at ${target}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: ({ a, h, j, ctx }) => {
    const { time, unit } = HALF_CONTEXTS[ctx];
    return [
      j === 1
        ? { text: `The curve meets the dashed line at ${a / 2} ${unit}, half the start, at $t = ${h}$.` }
        : { text: `${j === 2 ? 'A quarter' : 'An eighth'} is ${j} halvings: $${a} \\times 2^{-${j}} = ${a / 2 ** j}$.` },
      { tex: arrows(terms(a, 0.5, j + 1)) },
      { text: `Each halving takes ${h} ${time}s, so that is $${j} \\times ${h} = ${j * h}$ ${time}s.` },
    ];
  },
};

const SHRINK_SUBJECTS = ['A sample of a drug', 'The strength of a signal', 'The light getting through a stack of filters'];

function shrinkVerb(b: number, style: number): string {
  if (b === 2) return ['halves', 'is cut in half', 'loses half of what is left'][style];
  return [
    `is divided by ${b}`,
    `shrinks to $\\frac{1}{${b}}$ of its size`,
    `keeps only $\\frac{1}{${b}}$ of what it had`,
  ][style];
}

interface ShrinkParams {
  b: number;
  n: number;
  subject: number;
  style: number;
}

function shrinkPool(bases: number[], counts: number[]): { b: number; n: number }[] {
  return bases.flatMap((b) => counts.filter((n) => b ** n <= 100000).map((n) => ({ b, n })));
}

const SHRINK_EASY = shrinkPool([2, 3, 4, 5, 10], [2, 3, 4, 5]);
const SHRINK_HARD = shrinkPool([2, 3, 4, 5, 6, 7, 8, 10], [3, 4, 5, 6]);

/** Shrinking n times written as one over a power, then as a negative index. */
const growDecayTiles: Generator<ShrinkParams> = {
  id: 'grow-decay-tiles',
  sample: (rng, difficulty) => ({
    ...rng.pick(difficulty > 1 ? SHRINK_HARD : SHRINK_EASY),
    subject: rng.int(0, SHRINK_SUBJECTS.length - 1),
    style: rng.int(0, 2),
  }),
  render: ({ b, n, subject, style }): Slide => {
    const answer = [`\\frac{1}{${texNum(b ** n)}}`, `${b}^{-${n}}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${SHRINK_SUBJECTS[subject]} ${shrinkVerb(b, style)} at every step. What is it multiplied by over ${n} steps? Give it as a fraction, then as a single power of ${b}.`,
        },
      ],
      template: '\\text{multiplier} = {0} = {1}',
      bank: fillBank(answer, [
        `\\frac{1}{${b * n}}`,
        `${b}^{${n}}`,
        `-${b}^{${n}}`,
        `${b}^{-${n + 1}}`,
        `\\frac{1}{${texNum(b ** (n - 1))}}`,
      ]),
      answer,
    };
  },
  solution: ({ b, n }) => [
    { text: `Each step multiplies by $\\frac{1}{${b}}$, so ${n} steps multiply by that ${n} times.` },
    {
      tex: chain(
        `\\left(\\frac{1}{${b}}\\right)^{${n}} &= \\frac{1}{${b}^{${n}}}`,
        `&= \\frac{1}{${texNum(b ** n)}} = ${b}^{-${n}}`,
      ),
    },
    { text: 'A negative index means one over the positive power. It makes the value smaller, never negative.' },
  ],
};

type TrendForm = 'power' | 'negative' | 'fraction' | 'fraction-negative';

interface TrendParams {
  a: number;
  /** The base as a fraction top / bottom in lowest terms. */
  top: number;
  bottom: number;
  form: TrendForm;
}

/** The base as written: 3, or \frac{2}{3} in brackets. */
function baseTex(top: number, bottom: number): string {
  return bottom === 1 ? `${top}` : `\\left(\\frac{${top}}{${bottom}}\\right)`;
}

/** A multiplier as a label: 3, \frac{1}{3}, \frac{2}{3}. */
function ratioLabel(top: number, bottom: number): string {
  return bottom === 1 ? `${top}` : `\\frac{${top}}{${bottom}}`;
}

/**
 * Growth or decay? The multiplier per step first, then whether it is more
 * than 1. A negative index is where the misconceptions live: it is a
 * reciprocal, not a negative number, and a reciprocal of a fraction grows.
 */
const growTrendFlow: Generator<TrendParams> = {
  id: 'grow-trend-flow',
  sample: (rng, difficulty) => {
    const a = rng.pick([3, 4, 5, 6, 8, 10, 12, 20, 50, 100]);
    if (difficulty > 1 && rng.chance(0.5)) {
      const [top, bottom] = rng.pick([
        [3, 2],
        [2, 3],
        [4, 3],
        [3, 4],
        [5, 2],
        [2, 5],
        [5, 4],
        [4, 5],
      ]);
      return { a, top, bottom, form: rng.pick(['power', 'negative'] as const) };
    }
    const b = rng.pick([2, 3, 4, 5, 10]);
    const form = rng.pick(['power', 'negative', 'fraction', 'fraction-negative'] as const);
    return form === 'fraction' || form === 'fraction-negative'
      ? { a, top: 1, bottom: b, form }
      : { a, top: b, bottom: 1, form };
  },
  render: ({ a, top, bottom, form }): Slide => {
    const negative = form === 'negative' || form === 'fraction-negative';
    // What one step multiplies by: the base, or its reciprocal under a negative index.
    const [mTop, mBottom] = negative ? [bottom, top] : [top, bottom];
    const grows = mTop > mBottom;
    const right = `$${ratioLabel(mTop, mBottom)}$`;
    // The base itself, when a negative index flips it; the reciprocal otherwise.
    const flipped = `$${ratioLabel(negative ? top : bottom, negative ? bottom : top)}$`;
    const minus = `$-${ratioLabel(mTop, mBottom)}$`;
    // A negative index read as a negative number is the slip worth offering,
    // so the minus sign only appears where there is a negative index to misread.
    const labels = [...new Set(negative ? [right, flipped, minus] : [right, flipped])];
    const key = `${a}-${top}-${bottom}-${form}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'This gives a value $V$ after $n$ steps. Does it grow or decay? Each answer chooses what gets asked next.',
        },
      ],
      subject: `V = ${a} \\times ${baseTex(top, bottom)}^{${negative ? '-n' : 'n'}}`,
      steps: [
        {
          id: 'multiplier',
          ask: 'What does each step multiply the value by?',
          branches: turned(
            labels.map((label) => ({ label, to: 'size' })),
            key,
          ),
        },
        {
          id: 'size',
          ask: 'Is that multiplier bigger than 1?',
          branches: [
            { label: 'Yes', outcome: 'Then every step makes the value bigger: that is growth.' },
            { label: 'No', outcome: 'Then every step makes the value smaller: that is decay.' },
          ],
        },
      ],
      answer: [right, grows ? 'Yes' : 'No'],
    };
  },
  solution: ({ top, bottom, form }) => {
    const negative = form === 'negative' || form === 'fraction-negative';
    const [mTop, mBottom] = negative ? [bottom, top] : [top, bottom];
    const grows = mTop > mBottom;
    const steps: SolutionStep[] = [];
    if (negative) {
      steps.push({ text: 'A negative index is a reciprocal: it turns the base upside down.' });
      steps.push({
        tex: `${baseTex(top, bottom)}^{-n} = \\left(${ratioLabel(mTop, mBottom)}\\right)^{n}`,
      });
    }
    steps.push({
      text: `So each step multiplies by $${ratioLabel(mTop, mBottom)}$, which is ${grows ? 'more' : 'less'} than 1: the value ${grows ? 'grows' : 'decays towards 0, but never reaches it or goes negative'}.`,
    });
    return steps;
  },
};

/* ---------- Lesson 4: comparing growth ---------- */

type Rival = { kind: 'linear'; k: number } | { kind: 'affine'; c: number; k: number } | { kind: 'power'; p: number };

function rivalValue(rival: Rival, n: number): number {
  if (rival.kind === 'linear') return rival.k * n;
  if (rival.kind === 'affine') return rival.c + rival.k * n;
  return n ** rival.p;
}

/** The rival in terms of `v`: 10n, 20 + 5n, n^{2}. */
function rivalTex(rival: Rival, v = 'n'): string {
  if (rival.kind === 'linear') return `${rival.k}${v}`;
  if (rival.kind === 'affine') return `${rival.c} + ${rival.k}${v}`;
  return `${v}^{${rival.p}}`;
}

/** The rival at a number: 10 \times 6, 20 + 5 \times 6, 6^{2}. */
function rivalAt(rival: Rival, n: number): string {
  if (rival.kind === 'linear') return `${rival.k} \\times ${n}`;
  if (rival.kind === 'affine') return `${rival.c} + ${rival.k} \\times ${n}`;
  return `${n}^{${rival.p}}`;
}

/** The first whole n from which b^n stays above the rival for good. */
function overtake(b: number, rival: Rival): number {
  let last = -1;
  for (let n = 0; n <= 40; n += 1) if (b ** n <= rivalValue(rival, n)) last = n;
  return last + 1;
}

interface OvertakeParams {
  b: number;
  rival: Rival;
}

function overtakePool(bases: number[], rivals: Rival[]): OvertakeParams[] {
  return bases.flatMap((b) =>
    rivals
      .map((rival) => ({ b, rival }))
      .filter(({ b, rival }) => {
        const n = overtake(b, rival);
        return n >= 3 && n <= 12;
      }),
  );
}

const OVERTAKE_EASY = overtakePool(
  [2],
  [
    ...Array.from({ length: 38 }, (_, i) => ({ kind: 'linear' as const, k: i + 3 })),
    { kind: 'power', p: 2 },
  ],
);
const OVERTAKE_HARD = overtakePool(
  [2, 3],
  [
    ...[10, 20, 50, 100].flatMap((c) => [2, 5, 10, 20].map((k) => ({ kind: 'affine' as const, c, k }))),
    { kind: 'power', p: 2 },
    { kind: 'power', p: 3 },
    ...[20, 50, 100].map((k) => ({ kind: 'linear' as const, k })),
  ],
);

/** Slide to the whole number from which a power of b pulls ahead for good. */
const growOvertakeSlider: Generator<OvertakeParams> = {
  id: 'grow-overtake-slider',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? OVERTAKE_HARD : OVERTAKE_EASY),
  render: ({ b, rival }): Slide => {
    const answer = overtake(b, rival);
    let span = answer + 3;
    while (defaultSliderValue(0, span, 1) === answer) span += 1;
    const top = Math.max(rivalValue(rival, answer), b ** (answer - 1)) * 2;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The solid curve is $y = ${b}^{x}$ and the dashed one is $y = ${rivalTex(rival, 'x')}$. Slide to the first whole number $n$ from which $${b}^{n}$ stays bigger than $${rivalTex(rival)}$ for good.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer,
      readout: 'n = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: top,
          curves: [
            { f: (t) => Math.min(b ** t, top * 2) },
            { f: (t) => Math.min(rivalValue(rival, t), top * 2), dashed: true },
          ],
          label: `The curve y equals ${b} to the x crossing y equals ${rivalTex(rival, 'x')}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: ({ b, rival }) => {
    const n = overtake(b, rival);
    return [
      {
        text: `Work out $${b}^{n}$ and $${rivalTex(rival)}$ at whole numbers until the power is ahead and stays there.`,
      },
      {
        tex: chain(
          `n = ${n - 1}: \\; ${b}^{${n - 1}} = ${texNum(b ** (n - 1))} &\\le ${texNum(rivalValue(rival, n - 1))}`,
          `n = ${n}: \\; ${b}^{${n}} = ${texNum(b ** n)} &> ${texNum(rivalValue(rival, n))}`,
        ),
      },
      {
        text: `From $n = ${n}$ on, each step multiplies $${b}^{n}$ by ${b}, which the other cannot keep up with, so it stays ahead for good.`,
      },
    ];
  },
};

interface CompareParams {
  b: number;
  rival: Rival;
  n: number;
}

/** Both sides at one n, then their difference: which is ahead? */
const growCompareTree: Generator<CompareParams> = {
  id: 'grow-compare-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const b = difficulty > 1 ? rng.pick([2, 3]) : 2;
      const rival: Rival = rng.pick([
        { kind: 'linear', k: rng.int(3, 30) },
        { kind: 'affine', c: rng.pick([10, 20, 50]), k: rng.int(2, 10) },
        { kind: 'power', p: rng.pick([2, 3]) },
      ]);
      const n = rng.int(3, b === 3 ? 7 : 10);
      if (b ** n === rivalValue(rival, n)) continue;
      if (difficulty === 1 && rival.kind === 'affine') continue;
      return { b, rival, n };
    }
  },
  render: ({ b, rival, n }): Slide => {
    const power = b ** n;
    const other = rivalValue(rival, n);
    const gap = power - other;
    const answer = [texNum(power), texNum(other), texNum(gap)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Is $${b}^{n}$ ahead of $${rivalTex(rival)}$ when $n = ${n}$? Top row: each one at $n = ${n}$. Bottom: the first minus the second, which is positive when the power is ahead.`,
        },
      ],
      expression: `${b}^{${n}} - ${rival.kind === 'affine' ? `(${rivalAt(rival, n)})` : rivalAt(rival, n)}`,
      nodes: [
        { id: 'power', from: [] },
        { id: 'other', from: [] },
        { id: 'gap', from: ['power', 'other'] },
      ],
      bank: fillBank(answer, [
        texNum(b * n),
        texNum(n ** b),
        texNum(-gap),
        texNum(power + other),
        ...(rival.kind === 'power' ? [texNum(rival.p * n)] : [texNum(other + n)]),
      ]),
      answer,
    };
  },
  solution: ({ b, rival, n }) => {
    const power = b ** n;
    const other = rivalValue(rival, n);
    const gap = power - other;
    return [
      { tex: chain(`${b}^{${n}} &= ${texNum(power)}`, `${rivalAt(rival, n)} &= ${texNum(other)}`) },
      { tex: `${texNum(power)} - ${texNum(other)} = ${texNum(gap)}` },
      {
        text:
          gap > 0
            ? `Positive, so at $n = ${n}$ the power is ahead by ${texNum(gap)}.`
            : `Negative, so at $n = ${n}$ the power is still behind, by ${texNum(-gap)}.`,
      },
    ];
  },
};

type Pattern = 'add' | 'times' | 'neither';

interface PatternParams {
  pattern: Pattern;
  /** Four terms. */
  seq: number[];
  /** The common difference, or the ratio as top / bottom. */
  d: number;
  top: number;
  bottom: number;
}

function samplePattern(rng: Rng, difficulty: number): PatternParams {
  const hard = difficulty > 1;
  const roll = rng.next();
  if (roll < 0.35) {
    const d = hard && rng.chance(0.5) ? -rng.int(2, 9) : rng.int(2, 9);
    const a = d < 0 ? rng.int(30, 60) : rng.int(1, 12);
    return { pattern: 'add', seq: [0, 1, 2, 3].map((k) => a + k * d), d, top: 0, bottom: 1 };
  }
  if (roll < 0.75) {
    if (hard && rng.chance(0.5)) {
      const bottom = rng.pick([2, 3]);
      const a = rng.int(1, 5) * bottom ** 3;
      return { pattern: 'times', seq: terms(a, 1 / bottom, 4).map(Math.round), d: 0, top: 1, bottom };
    }
    const r = rng.int(2, 4);
    const a = rng.int(1, hard ? 9 : 6);
    return { pattern: 'times', seq: terms(a, r, 4), d: 0, top: r, bottom: 1 };
  }
  const c = rng.int(0, 6);
  const start = rng.int(1, 3);
  const shape = rng.pick(hard ? ['square', 'triangle', 'cube'] : ['square', 'triangle']);
  const f = (k: number) => (shape === 'square' ? k * k : shape === 'cube' ? k * k * k : (k * (k + 1)) / 2);
  return { pattern: 'neither', seq: [0, 1, 2, 3].map((k) => f(start + k) + c), d: 0, top: 0, bottom: 1 };
}

/** A multiplier as a label on a button: ×3, ×\frac{1}{2}. */
function timesLabel(top: number, bottom: number): string {
  return `$\\times ${ratioLabel(top, bottom)}$`;
}

function signedLabel(d: number): string {
  return `$${d < 0 ? '-' : '+'} ${Math.abs(d)}$`;
}

/**
 * Linear, exponential or neither, from four terms. The two kinds of growth
 * this level is about differ in one thing — adding the same amount against
 * multiplying by the same number — and this makes the learner check both.
 */
const growPatternFlow: Generator<PatternParams> = {
  id: 'grow-pattern-flow',
  sample: samplePattern,
  render: ({ pattern, seq, d, top, bottom }): Slide => {
    const [first] = seq;
    const key = seq.join(',');
    const gapFirst = seq[1] - seq[0];
    const addCandidates =
      pattern === 'add'
        ? [d, d + (d > 0 ? 1 : -1), 2 * d]
        : [...new Set([gapFirst, seq[3] - seq[2]])].filter((g) => g !== 0);
    const addOptions = (addCandidates.length > 1 ? addCandidates : [...addCandidates, addCandidates[0] + 1]).map(
      (g) => ({
        label: signedLabel(g),
        outcome: `${g < 0 ? `Taking away $${-g}$` : `Adding $${g}$`} each time from $${first}$ gives $${[0, 1, 2, 3].map((k) => first + k * g).join(', ')}$.`,
      }),
    );
    const timesCandidates: [number, number][] =
      pattern === 'times'
        ? bottom === 1
          ? [
              [top, 1],
              [top + 1, 1],
              [top === 2 ? 4 : top - 1, 1],
            ]
          : [
              [1, bottom],
              [bottom, 1],
              [1, bottom * bottom],
            ]
        : [
            [2, 1],
            [3, 1],
          ];
    const timesOptions = timesCandidates.map(([t, b]) => ({
      label: timesLabel(t, b),
      outcome:
        b === 1
          ? `Multiplying by $${t}$ each time from $${first}$ gives $${terms(first, t, 4).join(', ')}$.`
          : `Multiplying by $\\frac{1}{${b}}$ each time from $${first}$ divides by ${b} at every step.`,
    }));
    const answer =
      pattern === 'add'
        ? ['Yes', signedLabel(d)]
        : pattern === 'times'
          ? ['No', 'Yes', timesLabel(top, bottom)]
          : ['No', 'No'];
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'What kind of growth does this sequence show? Each answer chooses what gets asked next.',
        },
      ],
      subject: `${seq.join(',\\ ')},\\ \\dots`,
      steps: [
        {
          id: 'gap',
          ask: 'Is the gap between neighbouring terms the same each time?',
          branches: [
            { label: 'Yes', to: 'add' },
            { label: 'No', to: 'ratio' },
          ],
        },
        { id: 'add', ask: 'What is added each time?', branches: turned(addOptions, key) },
        {
          id: 'ratio',
          ask: 'Is each term the one before multiplied by the same number?',
          branches: [
            { label: 'Yes', to: 'times' },
            {
              label: 'No',
              outcome: 'Then it is neither: the gaps change and so do the ratios, so it is not linear or exponential.',
            },
          ],
        },
        { id: 'times', ask: 'Multiplied by what?', branches: turned(timesOptions, key) },
      ],
      answer,
    };
  },
  solution: ({ pattern, seq, d, top, bottom }) => {
    const gaps = seq.slice(1).map((value, k) => value - seq[k]);
    if (pattern === 'add') {
      return [
        { text: `The gaps are ${gaps.join(', ')}: the same every time.` },
        { text: `So each term adds $${d}$. That is linear growth: a straight line, not repeated multiplication.` },
      ];
    }
    if (pattern === 'times') {
      return [
        { text: `The gaps are ${gaps.join(', ')}, which change, so it is not linear.` },
        { tex: `${seq[1]} \\div ${seq[0]} = ${ratioLabel(top, bottom)}, \\quad ${seq[2]} \\div ${seq[1]} = ${ratioLabel(top, bottom)}` },
        {
          text: `Every term is the one before times $${ratioLabel(top, bottom)}$: exponential ${top > bottom ? 'growth' : 'decay'}.`,
        },
      ];
    }
    return [
      { text: `The gaps are ${gaps.join(', ')}, which change, so it is not linear.` },
      { text: `And $${seq[1]} \\div ${seq[0]}$ is not $${seq[2]} \\div ${seq[1]}$, so it is not exponential either.` },
    ];
  },
};

interface LongRunParams {
  n: number;
  k: number;
  p: number;
  b: number;
  c: number;
  k2: number;
}

interface Contender {
  tex: string;
  value: number;
}

function contenders({ n, k, p, b, c, k2 }: LongRunParams): Contender[] {
  return [
    { tex: `${k}n`, value: k * n },
    { tex: `n^{${p}}`, value: n ** p },
    { tex: `${b}^{n}`, value: b ** n },
    { tex: `${c} + ${k2}n`, value: c + k2 * n },
  ];
}

/** True when the four values are distinct, so exactly one is largest. */
function clearWinner(params: LongRunParams): boolean {
  const values = contenders(params).map((entry) => entry.value);
  return new Set(values).size === values.length;
}

/**
 * Which is largest at a given n? Not always the power: at small n a big
 * coefficient wins, and seeing that is half the point.
 */
const growLongRun: Generator<LongRunParams> = {
  id: 'grow-long-run',
  sample: (rng, difficulty) => {
    for (;;) {
      const b = difficulty > 1 ? rng.pick([2, 3]) : 2;
      const params = {
        // Capped so 3^n stays a number a person would work out.
        n: rng.pick(difficulty > 1 ? (b === 3 ? [4, 5, 6, 8] : [6, 8, 10, 12, 15]) : [3, 5, 8, 10, 12]),
        k: rng.pick([10, 20, 50, 100]),
        p: rng.pick([2, 3]),
        b,
        c: rng.pick([100, 200, 500, 1000]),
        k2: rng.pick([5, 10]),
      };
      if (clearWinner(params)) return params;
    }
  },
  render: (params): Slide => {
    const entries = contenders(params);
    const best = entries.reduce((top, entry) => (entry.value > top.value ? entry : top));
    const ordered = turned(entries, entries.map((entry) => entry.tex).join('|') + params.n);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which of these is largest when $n = ${params.n}$?` }],
      options: ordered.map((entry, idx) => ({ id: `opt${idx}`, label: entry.tex, tex: true })),
      correctId: `opt${ordered.indexOf(best)}`,
    };
  },
  solution: (params) => {
    const entries = contenders(params);
    const best = entries.reduce((top, entry) => (entry.value > top.value ? entry : top));
    const power = `${params.b}^{n}`;
    return [
      { text: `Work each one out at $n = ${params.n}$.` },
      { tex: chain(...entries.map((entry) => `${entry.tex} &= ${texNum(entry.value)}`)) },
      {
        text:
          best.tex === power
            ? `$${power}$ is largest. From here on it pulls further ahead, since each step multiplies it by ${params.b}.`
            : `$${best.tex}$ is largest here. $${power}$ is not ahead yet, but it multiplies by ${params.b} at every step, so it overtakes the others eventually.`,
      },
    ];
  },
};

/* ---------- Lesson 5: working backwards ---------- */

interface StartParams {
  /** The start, the answer. */
  a: number;
  kind: 'whole' | 'percent' | 'halving';
  /** Whole multiplier, or percentage in hundredths. */
  r: number;
  n: number;
  ctx: number;
}

const START_CONTEXTS = [
  { whole: 'A colony of bacteria', unit: 'hour' },
  { whole: 'A savings pot', unit: 'year' },
  { whole: 'A pile of coins in a game', unit: 'round' },
];

function startValue({ a, kind, r, n }: StartParams): number {
  if (kind === 'halving') return a / 2 ** n;
  if (kind === 'percent') return wholeAfter(a, r, n) ?? 0;
  return a * r ** n;
}

function sampleStart(rng: Rng, difficulty: number): StartParams {
  for (;;) {
    const ctx = rng.int(0, START_CONTEXTS.length - 1);
    const roll = rng.next();
    if (difficulty > 1 && roll < 0.35) {
      const pick = rng.pick(PCT_VALUE_HARD);
      return { a: pick.a, kind: 'percent', r: yearly(pick.p, PCT_CONTEXTS[pick.ctx].up), n: pick.n, ctx };
    }
    if (difficulty > 1 && roll < 0.65) {
      const n = rng.int(2, 5);
      const a = rng.pick([3, 5, 7, 9, 15, 25]) * 2 ** rng.int(n, n + 2);
      if (a > 3000) continue;
      return { a, kind: 'halving', r: 2, n, ctx };
    }
    const r = rng.pick(difficulty > 1 ? [3, 4, 5] : [2, 3, 10]);
    const n = rng.int(2, difficulty > 1 ? 5 : 4);
    const a = rng.int(2, 20);
    if (a * r ** n > 50000) continue;
    return { a, kind: 'whole', r, n, ctx };
  }
}

function startStory(params: StartParams): string {
  const { kind, r, n, ctx } = params;
  const value = texNum(startValue(params));
  if (kind === 'halving') {
    return `A radioactive sample halves every day. After ${n} days, $${value}$ g is left. How many grams were there at the start?`;
  }
  if (kind === 'percent') {
    const up = r > 100;
    return `A value ${up ? 'rises' : 'falls'} by ${Math.abs(r - 100)}% every year. After ${years(n)} it is $${value}$. What was it at the start?`;
  }
  const { whole, unit } = START_CONTEXTS[ctx];
  return `${whole} ${MULTIPLY_VERB[r]} every ${unit}. After ${n} ${unit}s it is $${value}$. What was it at the start?`;
}

/** The start from the value after n steps: divide by the multiplier to the power n. */
const growFindStart: Generator<StartParams> = {
  id: 'grow-find-start',
  sample: sampleStart,
  choices: (params) => {
    const { a, kind, r, n } = params;
    const value = startValue(params);
    if (kind === 'halving') return numberOptions(a, [value * 2 * n, value * 2 ** (n - 1), value / 2 ** n]);
    if (kind === 'percent') {
      return numberOptions(a, [
        wholeAfter(value, 200 - r, n) ?? 0,
        (value * 100) / (100 + (r - 100) * n),
        wholeAfter(a, r, 1) ?? 0,
      ]);
    }
    return numberOptions(a, [value / (r * n), a * r, value * r ** n, a * r ** (n - 1)]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: startStory(params) }],
    lead: '\\text{start} =',
    keypad: [],
    answer: String(params.a),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { a, kind, r, n } = params;
    const value = texNum(startValue(params));
    if (kind === 'halving') {
      return [
        { text: `Going forwards halves ${n} times, so going back doubles ${n} times.` },
        { tex: chain(`\\text{start} &= ${value} \\times 2^{${n}}`, `&= ${value} \\times ${2 ** n}`, `&= ${texNum(a)}`) },
      ];
    }
    const m = kind === 'percent' ? dec(r) : `${r}`;
    const mn = kind === 'percent' ? decPow(r, n) : texNum(r ** n);
    return [
      { text: `Going forwards multiplies by $${m}^{${n}}$, so going back divides by it.` },
      { tex: chain(`\\text{start} &= ${value} \\div ${m}^{${n}}`, `&= ${value} \\div ${mn}`, `&= ${texNum(a)}`) },
      ...(kind === 'percent'
        ? [{ text: `Taking the percentage off the end value instead does not undo it, because the change was worked on the start.` }]
        : []),
    ];
  },
};

interface MultiplierParams {
  a: number;
  r: number;
  /** Step of the first known value. */
  k: number;
  /** Steps between the two known values. */
  g: number;
}

/** From two values g steps apart: the ratio, its g-th root, then back to the start. */
const growMultiplierTree: Generator<MultiplierParams> = {
  id: 'grow-multiplier-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const g = difficulty > 1 ? 3 : 2;
      const params = { a: rng.int(1, 9), r: rng.int(2, 5), k: rng.int(1, 3), g };
      if (params.a * params.r ** (params.k + g) > 20000) continue;
      return params;
    }
  },
  render: ({ a, r, k, g }): Slide => {
    const first = a * r ** k;
    const second = a * r ** (k + g);
    const answer = [texNum(r ** g), `${r}`, `${a}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `A value $V$ is multiplied by the same number at every step. Top: how many times bigger $V_{${k + g}}$ is than $V_{${k}}$. Then the multiplier. Then the start, $V_{0}$.`,
        },
      ],
      expression: `V_{${k}} = ${texNum(first)}, \\quad V_{${k + g}} = ${texNum(second)}`,
      nodes: [
        { id: 'ratio', from: [] },
        { id: 'multiplier', from: ['ratio'] },
        { id: 'start', from: ['multiplier'] },
      ],
      bank: fillBank(answer, [
        texNum(second - first),
        ...(Number.isInteger(r ** g / g) ? [texNum(r ** g / g)] : []),
        `${r * g}`,
        texNum(first),
        texNum(a * r),
        `${r + 1}`,
        `${a + 1}`,
        texNum(first * r),
      ]),
      answer,
    };
  },
  solution: ({ a, r, k, g }) => {
    const first = a * r ** k;
    const second = a * r ** (k + g);
    return [
      { tex: `${texNum(second)} \\div ${texNum(first)} = ${texNum(r ** g)}` },
      {
        text: `That is ${g} steps' worth of multiplying, so the multiplier is the ${rootName(g)}: $${g === 2 ? `\\sqrt{${r ** g}}` : `\\sqrt[${g}]{${r ** g}}`} = ${r}$.`,
      },
      { text: `Then step back ${k} time${k === 1 ? '' : 's'} from $V_{${k}}$ to the start.` },
      { tex: `V_{0} = ${texNum(first)} \\div ${r}^{${k}} = ${a}` },
    ];
  },
};

interface StepsParams {
  a: number;
  r: number;
  m: number;
  ctx: number;
}

const STEPS_CONTEXTS = [
  (a: number, r: number) => `A culture of ${a} cells ${MULTIPLY_VERB[r] ?? `multiplies by ${r}`} every hour.`,
  (a: number, r: number) => `A value starts at ${a} and is multiplied by ${r} at every step.`,
  (a: number, r: number) => `A game starts you on ${a} points, and your score ${MULTIPLY_VERB[r] ?? `multiplies by ${r}`} every level.`,
];

/** How many steps: divide off the start, then match the bases. */
const growStepsTiles: Generator<StepsParams> = {
  id: 'grow-steps-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const r = rng.pick(hard ? [2, 3, 4, 5, 10] : [2, 3, 4, 5]);
      const m = rng.int(2, hard ? 7 : 5);
      const a = rng.int(hard ? 2 : 1, hard ? 12 : 9);
      if (a * r ** m > (hard ? 100000 : 5000)) continue;
      return { a, r, m, ctx: rng.int(0, STEPS_CONTEXTS.length - 1) };
    }
  },
  render: ({ a, r, m, ctx }): Slide => {
    const value = a * r ** m;
    const answer = [texNum(r ** m), `${r}^{${m}}`, `${m}`];
    const unit = ['hours', 'steps', 'levels'][ctx];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `${STEPS_CONTEXTS[ctx](a, r)} After how many ${unit} is it ${proseNum(value)}?` },
        { kind: 'display', tex: `${a} \\times ${r}^{n} = ${texNum(value)}` },
      ],
      template: `${r}^n = {0} = {1},\\ \\text{so } n = {2}`,
      bank: fillBank(answer, [
        texNum(value),
        `${r}^{${m + 1}}`,
        `${r}^{${m - 1}}`,
        `${m + 1}`,
        `${m - 1}`,
      ]),
      answer,
    };
  },
  solution: ({ a, r, m }) => {
    const value = a * r ** m;
    return [
      { text: `Divide both sides by the start, $${a}$, then write the result as a power of $${r}$.` },
      {
        tex: chain(
          `${r}^{n} &= ${texNum(value)} \\div ${a} = ${texNum(r ** m)}`,
          `${r}^{n} &= ${r}^{${m}}`,
        ),
      },
      { text: `The bases match, so the indices do too: $n = ${m}$.` },
    ];
  },
};

type Unknown = 'start' | 'multiplier' | 'steps';

interface UndoParams {
  unknown: Unknown;
  a: number;
  r: number;
  n: number;
}

const UNKNOWN_LABELS: Record<Unknown, string> = {
  start: 'The start',
  multiplier: 'The multiplier',
  steps: 'The number of steps',
};

/**
 * Which part is missing, how to undo it, and what it comes to. Every problem
 * is a × r^n = V with one part boxed; the three unknowns need three different
 * inverses, which is the thing the learner has to choose.
 */
const growUndoFlow: Generator<UndoParams> = {
  id: 'grow-undo-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const unknown = rng.pick(['start', 'multiplier', 'steps'] as const);
      const r = rng.int(2, difficulty > 1 ? 6 : 5);
      const n = rng.int(2, difficulty > 1 ? 4 : 3);
      const a = rng.int(2, difficulty > 1 ? 12 : 9);
      if (a * r ** n > 10000) continue;
      return { unknown, a, r, n };
    }
  },
  render: ({ unknown, a, r, n }): Slide => {
    const value = a * r ** n;
    const V = texNum(value);
    const key = `${unknown}-${a}-${r}-${n}`;
    const subject =
      unknown === 'start'
        ? `\\square \\times ${r}^{${n}} = ${V}`
        : unknown === 'multiplier'
          ? `${a} \\times \\square^{${n}} = ${V}`
          : `${a} \\times ${r}^{\\square} = ${V}`;
    const given: Record<Unknown, string> = {
      start: `The start is given: it is $${a}$.`,
      multiplier: `The multiplier is given: it is $${r}$.`,
      steps: `The number of steps is given: it is $${n}$.`,
    };
    const methods: { label: string; right: boolean; outcome?: string }[] =
      unknown === 'start'
        ? [
            { label: `Divide $${V}$ by $${r}^{${n}}$`, right: true },
            { label: `Subtract $${r}^{${n}}$ from $${V}$`, right: false, outcome: 'Subtracting undoes adding, but the start was multiplied.' },
            { label: `Take the ${rootName(n)} of $${V}$`, right: false, outcome: 'A root undoes a power, but the start is not the part raised to the power.' },
          ]
        : unknown === 'multiplier'
          ? [
              { label: `Divide by $${a}$, then take the ${rootName(n)}`, right: true },
              { label: `Divide by $${a}$, then divide by $${n}$`, right: false, outcome: `Dividing by $${n}$ undoes multiplying by it, not raising to the power $${n}$.` },
              { label: `Take away $${a}$, then divide by $${n}$`, right: false, outcome: 'That finds an amount added at each step, which is linear growth, not repeated multiplication.' },
            ]
          : [
              { label: `Divide by $${a}$, then write it as a power of $${r}$`, right: true },
              { label: `Divide $${V}$ by $${r}$`, right: false, outcome: 'Dividing by the multiplier once undoes one step, not all of them.' },
              { label: `Divide by $${a}$, then divide by $${r}$`, right: false, outcome: 'Dividing by the multiplier finds the value one step earlier, not the number of steps.' },
            ];
    const answerValue = unknown === 'start' ? a : unknown === 'multiplier' ? r : n;
    const candidates = [
      ...new Set(
        unknown === 'start'
          ? [a, value / (r * n), a * r, a + 1].filter((x) => Number.isInteger(x) && x > 0)
          : unknown === 'multiplier'
            ? [r, value / a / n, r + 1, r - 1].filter((x) => Number.isInteger(x) && x > 1)
            : [n, n + 1, n - 1, value / a].filter((x) => Number.isInteger(x) && x > 0),
      ),
    ].slice(0, 3);
    const check = (x: number) => {
      const got = unknown === 'start' ? x * r ** n : unknown === 'multiplier' ? a * x ** n : a * r ** x;
      const shown =
        unknown === 'start'
          ? `${x} \\times ${r}^{${n}}`
          : unknown === 'multiplier'
            ? `${a} \\times ${x}^{${n}}`
            : `${a} \\times ${r}^{${x}}`;
      return got === value
        ? `Check: $${shown} = ${V}$.`
        : `Check: $${shown} = ${texNum(got)}$, not $${V}$.`;
    };
    const rightMethod = methods.find((method) => method.right)!;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'The box is the missing part of a start times a multiplier to the power of the number of steps. Each answer chooses what gets asked next.',
        },
      ],
      subject,
      steps: [
        {
          id: 'unknown',
          ask: 'Which part is missing?',
          branches: (['start', 'multiplier', 'steps'] as const).map((part) =>
            part === unknown
              ? { label: UNKNOWN_LABELS[part], to: 'method' }
              : { label: UNKNOWN_LABELS[part], outcome: given[part] },
          ),
        },
        {
          id: 'method',
          ask: 'How do you undo it?',
          branches: turned(
            methods.map((method) =>
              method.right ? { label: method.label, to: 'value' } : { label: method.label, outcome: method.outcome },
            ),
            key,
          ),
        },
        {
          id: 'value',
          ask: 'What does that give?',
          branches: turned(
            candidates.map((x) => ({ label: `$${texNum(x)}$`, outcome: check(x) })),
            `${key}-value`,
          ),
        },
      ],
      answer: [UNKNOWN_LABELS[unknown], rightMethod.label, `$${texNum(answerValue)}$`],
    };
  },
  solution: ({ unknown, a, r, n }) => {
    const value = a * r ** n;
    const V = texNum(value);
    if (unknown === 'start') {
      return [
        { text: 'The start was multiplied by the power, so divide by it.' },
        { tex: chain(`\\square &= ${V} \\div ${r}^{${n}}`, `&= ${V} \\div ${texNum(r ** n)}`, `&= ${a}`) },
      ];
    }
    if (unknown === 'multiplier') {
      return [
        { text: `Divide off the start, then undo the power $${n}$ with a ${rootName(n)}.` },
        {
          tex: chain(
            `\\square^{${n}} &= ${V} \\div ${a} = ${texNum(r ** n)}`,
            `\\square &= ${n === 2 ? `\\sqrt{${texNum(r ** n)}}` : `\\sqrt[${n}]{${texNum(r ** n)}}`} = ${r}`,
          ),
        },
      ];
    }
    return [
      { text: `Divide off the start, then write what is left as a power of $${r}$ and match the indices.` },
      { tex: chain(`${r}^{\\square} &= ${V} \\div ${a} = ${texNum(r ** n)}`, `&= ${r}^{${n}}`) },
      { text: `So there were ${n} steps.` },
    ];
  },
};

export const growthGenerators = [
  growTerm,
  growRuleTiles,
  growChainTree,
  growEvaluate,
  growPctFlow,
  growPctTiles,
  growPctValue,
  growPctSlider,
  growHalfLife,
  growHalfLifeSlider,
  growDecayTiles,
  growTrendFlow,
  growOvertakeSlider,
  growCompareTree,
  growPatternFlow,
  growLongRun,
  growFindStart,
  growMultiplierTree,
  growStepsTiles,
  growUndoFlow,
] as unknown as Generator<unknown>[];
