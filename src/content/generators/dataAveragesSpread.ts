/**
 * Data, Averages and Spread (roadmap C17).
 *
 * Level 1 is averages: the mean, median and mode of a list and which one a
 * question wants, a missing value from a known mean and two groups combined,
 * frequency tables with an `fx` column, grouped data by midpoints, and
 * reading a scatter diagram. Level 2 is spread: the range and what an extreme
 * value does to it, quartiles and the interquartile range, outliers by the
 * 1.5 times IQR rule, variance from `\sum x^2 / n - \bar{x}^2`, and the
 * standard deviation, with two sets compared by mean and spread.
 *
 * Three rules hold everywhere in this file.
 *
 * - Every answer is exact. Lists are drawn so their statistics are whole or
 *   land on a short decimal, and a draw that would not is refused at sampling
 *   rather than rounded. Numbers are written through `fmt`, one way only, so
 *   a bank never offers two tiles that look alike.
 * - Quartiles only ever come from lists of length `4k + 3` (7, 11, 15), where
 *   they sit at whole positions `k + 1`, `2k + 2` and `3k + 3`. That is the one
 *   rule the course teaches, so no other length is ever drawn.
 * - Nothing here is calculus, so no slide declares `source`, `integrand` or
 *   `limits`. `dataAveragesSpread.test.ts` recomputes every statistic from the
 *   drawn data by plain arithmetic instead.
 *
 * The checker compares values (PITFALLS 3.4), so a formula with the values
 * dropped in is `tiles`; a typed `expression` is only ever a number.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { hashSeed, type Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { fmt } from './numericalMethods';
import { mix, steered, stepBank } from './parametricImplicit';

/* ================================================================
 * Shared helpers
 * ================================================================ */

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });

const total = (xs: readonly number[]): number => xs.reduce((acc, x) => acc + x, 0);
const ordered = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b);

/** Whether a value is an exact decimal of at most `dp` places. */
export function exact(value: number, dp: number): boolean {
  const scaled = value * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

const whole = (value: number): boolean => exact(value, 0);

/** Only the slips that terminate within two places, for a bank of values. */
const tidy = (values: number[]): number[] => values.filter((v) => Number.isFinite(v) && exact(v, 2));

/** The middle of a list: one value for an odd length, the mean of two for an even one. */
export function median(xs: readonly number[]): number {
  const s = ordered(xs);
  const n = s.length;
  return n % 2 === 1 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/**
 * A list as prose, each value its own piece of inline maths, so that eleven
 * values wrap across a phone rather than running off it as one display.
 */
const listProse = (xs: readonly number[]): string => xs.map((x) => `$${fmt(x)}$`).join(', ');

function ints(rng: Rng, n: number, lo: number, hi: number): number[] {
  return Array.from({ length: n }, () => rng.int(lo, hi));
}

/**
 * A bank of numbers: the answer as a multiset (a value needed twice is offered
 * twice), then slips that differ from every answer, topped up with near misses
 * until `spare` are left. Sorted by value, never shuffled (PITFALLS 3.10).
 */
function valueBank(answer: number[], slips: number[], spare = 3, unit = 1): string[] {
  const needed = new Set(answer.map(fmt));
  const extras: string[] = [];
  const add = (value: number) => {
    if (extras.length >= spare || !Number.isFinite(value) || !exact(value, 2)) return;
    const token = fmt(value);
    if (needed.has(token) || extras.includes(token)) return;
    extras.push(token);
  };
  for (const value of slips) add(value);
  for (let step = 1; extras.length < spare; step += 1) {
    for (const value of answer) {
      add(value + step * unit);
      add(value - step * unit);
    }
  }
  return [...answer.map(fmt), ...extras].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));
}

/**
 * Four options for a numeric answer: the slips given, then near misses. The
 * order is steered by `salt`, so the answer's slot is spread across draws
 * while one question still renders one way.
 */
function valueChoices(correct: number, wrong: number[], salt: number, unit = 1): ChoiceOption[] {
  const seen = new Set([fmt(correct)]);
  const picked: number[] = [];
  const take = (value: number, into: number[], limit: number) => {
    if (into.length >= limit || !Number.isFinite(value) || !exact(value, 2)) return;
    if (seen.has(fmt(value))) return;
    seen.add(fmt(value));
    into.push(value);
  };
  for (const value of wrong) take(value, picked, 3);
  for (let step = 1; picked.length < 3; step += 1) {
    take(correct + step * unit, picked, 3);
    take(correct - step * unit, picked, 3);
  }
  const spare: number[] = [];
  for (let step = 1; spare.length < 4; step += 1) {
    take(correct + step * unit, spare, 4);
    take(correct - step * unit, spare, 4);
  }
  const asOption = (v: number) => ({ tex: fmt(v), answer: fmt(v) });
  return steered(options(asOption(correct), ...picked.map(asOption)), salt, spare.map(asOption));
}

/**
 * A native choice slide, turned by a hash of `key` so the answer is not
 * always first yet one question renders one way.
 */
function choiceSlide(prompt: Block[], opts: ChoiceOption[], key: string, tex = true): Slide {
  const turn = hashSeed(key) % opts.length;
  const turnedOpts = [...opts.slice(turn), ...opts.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    options: turnedOpts.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex })),
    correctId: `opt${turnedOpts.findIndex((option) => option.correct)}`,
  };
}

/** Flow branches turned by a hash of `key`, so the right one is not always first. */
function rotated<T>(items: T[], key: string): T[] {
  const turn = hashSeed(key) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/** Lines stacked in one display and aligned on their `&`. */
function aligned(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** A frequency table laid on its side: a row of values over a row of frequencies. */
function freqTableTex(xs: readonly number[], fs: readonly number[], head = 'x'): string {
  return `\\begin{array}{c|${'c'.repeat(xs.length)}} ${head} & ${xs.map(fmt).join(' & ')} \\\\ \\hline f & ${fs.join(' & ')} \\end{array}`;
}

/** A class interval as it is written in a table. */
const classTex = (lo: number, hi: number): string => `${fmt(lo)} \\le x < ${fmt(hi)}`;

/** A grouped frequency table, one class per row. */
function groupedTableTex(bounds: readonly number[], fs: readonly number[]): string {
  const rows = fs.map((f, i) => `${classTex(bounds[i], bounds[i + 1])} & ${f}`).join(' \\\\ ');
  return `\\begin{array}{c|c} \\text{Class} & f \\\\ \\hline ${rows} \\end{array}`;
}

const NUMBER_KEYS: KeypadKey[] = [];
const ROOT_KEY: KeypadKey[] = [{ insert: 'sqrt(' }];

/* ================================================================
 * Level 1, lesson 1: mean, median and mode
 * ================================================================ */

/** Things a short list of whole numbers could count. Prose only: no units in a template. */
const LIST_CONTEXTS = [
  'Minutes spent on homework each night',
  'Points scored in each round of a quiz',
  'Cups of coffee sold each hour',
  'Pages read each day',
  'Visitors to a museum each hour',
  'Marks in each spelling test',
  'Emails received each day',
  'Parcels delivered each hour',
];

interface MeanParams {
  values: number[];
  context: number;
}

/**
 * The mean of a list: a whole number at difficulty 1, a decimal at 2, with
 * lists of different lengths so the division is not always by the same n.
 */
const mean: Generator<MeanParams> = {
  id: 'dat-mean',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n = hard ? rng.int(5, 9) : rng.int(4, 7);
      const values = hard ? ints(rng, n, 10, 60) : ints(rng, n, 1, 20);
      const m = total(values) / n;
      if (hard ? whole(m) || !exact(m, 1) : !whole(m)) continue;
      return { values, context: rng.int(0, LIST_CONTEXTS.length - 1) };
    }
  },
  render: ({ values, context }): Slide => ({
    kind: 'expression',
    prompt: [say(`${LIST_CONTEXTS[context]}: ${listProse(values)}. Find the mean.`)],
    lead: '\\bar{x} =',
    keypad: NUMBER_KEYS,
    answer: fmt(total(values) / values.length),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ values }) => [
    { text: `Add all ${values.length} values: the total is $${fmt(total(values))}$.` },
    { text: `Divide by how many there are, $${values.length}$.` },
    { tex: `\\bar{x} = \\frac{${fmt(total(values))}}{${values.length}} = ${fmt(total(values) / values.length)}` },
  ],
};

interface MedianModeParams {
  values: number[];
  ask: 'median' | 'mode';
}

/** The mode of a list: its most common value, and the count it appears. */
function modeOf(values: readonly number[]): { value: number; count: number } {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = { value: NaN, count: 0 };
  for (const [value, count] of counts) if (count > best.count) best = { value, count };
  return best;
}

/**
 * The median or the mode of an unsorted list. The median comes from an odd
 * length at difficulty 1 and an even one at 2, where it is the mean of the
 * middle pair; the mode has a single winner, with a runner-up at 2.
 */
const medianMode: Generator<MedianModeParams> = {
  id: 'dat-median-mode',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const ask = rng.pick<MedianModeParams['ask']>(['median', 'mode']);
    for (;;) {
      if (ask === 'median') {
        const n = hard ? rng.pick([6, 8, 10]) : rng.pick([5, 7, 9]);
        const values = ints(rng, n, 1, 40);
        const s = ordered(values);
        // Sorting has to matter: the unsorted middle is never already the answer.
        const middle = values[Math.floor(n / 2)];
        if (middle === median(values)) continue;
        if (hard && s[n / 2 - 1] === s[n / 2]) continue;
        return { values, ask };
      }
      const n = hard ? rng.int(7, 10) : rng.int(6, 9);
      const top = rng.int(1, 30);
      const copies = hard ? 3 : 2;
      const rest: number[] = [];
      // At difficulty 2 a second value appears twice, one short of the mode.
      const pool = Array.from({ length: 40 }, (_, i) => i + 1).filter((v) => v !== top);
      const others = rng.sample(pool, n - copies - (hard ? 1 : 0));
      rest.push(...others);
      if (hard) rest.push(others[0]);
      const values = rng.shuffle([...rest, ...Array.from({ length: copies }, () => top)]);
      if (hard && modeOf(values).count !== 3) continue;
      return { values, ask };
    }
  },
  render: ({ values, ask }): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the ${ask} of ${listProse(values)}.`)],
    lead: `\\text{${ask}} =`,
    keypad: NUMBER_KEYS,
    answer: fmt(ask === 'median' ? median(values) : modeOf(values).value),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ values, ask }) => {
    const s = ordered(values);
    const steps: SolutionStep[] = [{ text: `In order: ${listProse(s)}.` }];
    if (ask === 'mode') {
      const { value, count } = modeOf(values);
      steps.push({ text: `$${value}$ appears ${count} times, more than any other value, so the mode is $${value}$.` });
      return steps;
    }
    const n = s.length;
    if (n % 2 === 1) {
      steps.push({ text: `With ${n} values the middle one is the ${(n + 1) / 2}th, which is $${s[(n - 1) / 2]}$.` });
    } else {
      steps.push(
        { text: `With ${n} values there are two in the middle, the ${n / 2}th and the ${n / 2 + 1}th: $${s[n / 2 - 1]}$ and $${s[n / 2]}$.` },
        { tex: `\\text{median} = \\frac{${s[n / 2 - 1]} + ${s[n / 2]}}{2} = ${fmt(median(s))}` },
      );
    }
    return steps;
  },
  choices: ({ values, ask }) => {
    const n = values.length;
    const s = ordered(values);
    if (ask === 'median') {
      const m = total(values) / n;
      return valueChoices(
        median(values),
        [values[Math.floor(n / 2)], Math.round(m * 10) / 10, s[Math.floor(n / 2)], s[Math.floor((n - 1) / 2)]],
        mix(...values),
        0.5,
      );
    }
    const { value, count } = modeOf(values);
    return valueChoices(value, [count, median(values), s[n - 1], s[0]], mix(...values));
  },
};

interface SumTreeParams {
  values: number[];
}

/**
 * The mean as a tree: the values added in pairs, the pairs into a total, and
 * the total shared out. Four values at difficulty 1, six at 2.
 */
const sumTree: Generator<SumTreeParams> = {
  id: 'dat-sum-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n = hard ? 6 : 4;
      const values = hard ? ints(rng, n, 10, 50) : ints(rng, n, 1, 25);
      const m = total(values) / n;
      if (hard ? !exact(m, 1) : !whole(m)) continue;
      return { values };
    }
  },
  render: ({ values }): Slide => {
    const n = values.length;
    const pairs = Array.from({ length: n / 2 }, (_, i) => values[2 * i] + values[2 * i + 1]);
    const t = total(values);
    const answer = [...pairs, t, t / n];
    const slips = [t + values[0], t - values[n - 1], t / (n - 1), t / 2, values[0] + values[2], values[1] + values[3], t / n + 1];
    const pairIds = pairs.map((_, i) => `p${i}`);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Find the mean of ${listProse(values)}. Top row, left to right: the first two values added, then the next two${n === 6 ? ', then the last two' : ''}. Underneath, the total, then the mean.`,
        ),
      ],
      expression: '\\bar{x} = \\frac{\\sum x}{n}',
      nodes: [...pairIds.map((id) => ({ id, from: [] })), { id: 'total', from: pairIds }, { id: 'mean', from: ['total'] }],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: ({ values }) => {
    const n = values.length;
    const t = total(values);
    const pairs = Array.from({ length: n / 2 }, (_, i) => `${values[2 * i]} + ${values[2 * i + 1]} = ${values[2 * i] + values[2 * i + 1]}`);
    return [
      { text: 'Add the values in pairs:' },
      { tex: aligned(...pairs.map((p) => p.replace(' = ', ' &= '))) },
      { text: `The pairs add to a total of $${t}$, and there are $${n}$ values.` },
      { tex: `\\bar{x} = \\frac{${t}}{${n}} = ${fmt(t / n)}` },
    ];
  },
};

interface AverageFlowParams {
  kind: 'category' | 'outlier' | 'even' | 'common';
  context: number;
  /** Numbers for a numeric kind; indices into the context's words for a category. */
  values: number[];
  /** Difficulty 2 adds the question of whether the most common value is wanted. */
  purpose: boolean;
}

const CATEGORY_CONTEXTS = [
  { short: 'favourite colours', long: 'favourite colours of some pupils', words: ['red', 'blue', 'green', 'yellow', 'purple'] },
  { short: 'journeys to school', long: 'ways some pupils get to school', words: ['bus', 'car', 'walk', 'bike', 'train'] },
  { short: 'pets', long: 'pets owned by some families', words: ['cat', 'dog', 'fish', 'rabbit', 'hamster'] },
  { short: 'favourite sports', long: 'favourite sports of a class', words: ['football', 'tennis', 'netball', 'swimming', 'cricket'] },
];

const OUTLIER_CONTEXTS = [
  { short: 'salaries', long: 'salaries at a small firm, in thousands of pounds', lo: 20, hi: 35, far: [110, 240] },
  { short: 'house prices', long: 'prices of houses on a street, in thousands of pounds', lo: 150, hi: 290, far: [900, 1500] },
  { short: 'commutes', long: 'journey times to work, in minutes', lo: 10, hi: 25, far: [90, 140] },
  { short: 'ages', long: 'ages of the people at a party', lo: 20, hi: 30, far: [70, 92] },
];

const EVEN_CONTEXTS = [
  { short: 'heights', long: 'heights of some pupils, in centimetres', lo: 150, hi: 175 },
  { short: 'test marks', long: 'marks in a test out of 100', lo: 45, hi: 80 },
  { short: 'temperatures', long: 'midday temperatures over a week, in degrees', lo: 12, hi: 22 },
  { short: 'sunflower heights', long: 'heights of some sunflowers, in centimetres', lo: 110, hi: 140 },
];

const COMMON_CONTEXTS = [
  { short: 'shoe sizes', long: 'shoe sizes a shop sold, to decide which size to order most of', lo: 4, hi: 11 },
  { short: 'dress sizes', long: 'dress sizes a shop sold, to decide which size to stock most of', lo: 8, hi: 16 },
  { short: 'hat sizes', long: 'hat sizes sold at a stall, to decide which size to make most of', lo: 54, hi: 60 },
  { short: 'family sizes', long: 'numbers of people in the families booking a holiday, to decide which size of flat to build most of', lo: 2, hi: 6 },
];

/** Whether an end of the list stands apart: its gap to the next value is over twice the spread of the rest. */
function farEnd(values: readonly number[]): boolean {
  const s = ordered(values);
  const n = s.length;
  return s[n - 1] - s[n - 2] > 2 * (s[n - 2] - s[0]) || s[1] - s[0] > 2 * (s[n - 1] - s[1]);
}

function averageContext({ kind, context }: AverageFlowParams) {
  if (kind === 'category') return CATEGORY_CONTEXTS[context];
  if (kind === 'outlier') return OUTLIER_CONTEXTS[context];
  if (kind === 'even') return EVEN_CONTEXTS[context];
  return COMMON_CONTEXTS[context];
}

function averageData(params: AverageFlowParams): string {
  if (params.kind === 'category') {
    const { words } = CATEGORY_CONTEXTS[params.context];
    return params.values.map((i) => words[i]).join(', ');
  }
  return listProse(params.values);
}

/**
 * Which average a question wants. Categories only have a mode; numbers with
 * one value far from the rest want the median; otherwise the mean. At
 * difficulty 2 the first fork asks whether the question is after the most
 * common value, since a shop ordering shoe sizes wants the mode of numbers.
 */
const whichAverage: Generator<AverageFlowParams> = {
  id: 'dat-which-average',
  sample: (rng, difficulty) => {
    const purpose = difficulty > 1;
    const kind = rng.pick<AverageFlowParams['kind']>(purpose ? ['category', 'outlier', 'even', 'common'] : ['category', 'outlier', 'even']);
    const context = rng.int(0, 3);
    const n = rng.int(5, 7);
    if (kind === 'category') {
      for (;;) {
        const values = ints(rng, n, 0, 4);
        if (new Set(values).size >= 3) return { kind, context, values, purpose };
      }
    }
    if (kind === 'outlier') {
      const { lo, hi, far } = OUTLIER_CONTEXTS[context];
      const values = [...ints(rng, n - 1, lo, hi), rng.int(far[0], far[1])];
      return { kind, context, values: rng.shuffle(values), purpose };
    }
    const { lo, hi } = kind === 'even' ? EVEN_CONTEXTS[context] : COMMON_CONTEXTS[context];
    for (;;) {
      const values = ints(rng, n + 1, lo, hi);
      // A common value has to exist for a shop to stock it.
      if (kind === 'common' && modeOf(values).count < 2) continue;
      if (new Set(values).size < 3) continue;
      // Nothing may stand apart from the rest, or the median would be the answer.
      if (kind === 'even' && farEnd(values)) continue;
      return { kind, context, values, purpose };
    }
  },
  render: (params): Slide => {
    const { kind, purpose } = params;
    const ctx = averageContext(params);
    const key = `${kind}${params.values.join(',')}`;
    const mode = 'The mode: it is the only average that makes sense for categories.';
    const steps: Extract<Slide, { kind: 'flow' }>['steps'] = [];
    if (purpose) {
      steps.push({
        id: 'common',
        ask: 'Is the question after the most common value?',
        branches: rotated(
          [
            { label: 'Yes', outcome: 'The mode: the value that turns up most often is exactly what is wanted.' },
            { label: 'No', to: 'type' },
          ],
          `${key}c`,
        ),
      });
    }
    steps.push(
      {
        id: 'type',
        ask: 'Are the values numbers you can add up, or categories?',
        branches: rotated(
          [
            { label: 'Numbers', to: 'extreme' },
            { label: 'Categories', outcome: mode },
          ],
          `${key}t`,
        ),
      },
      {
        id: 'extreme',
        ask: 'Is there a value far away from all the rest?',
        branches: rotated(
          [
            { label: 'Yes', outcome: 'The median: one extreme value drags the mean towards it, but the middle value hardly moves.' },
            { label: 'No', outcome: 'The mean: it uses every value, and nothing extreme is pulling it.' },
          ],
          `${key}e`,
        ),
      },
    );
    const path: string[] =
      kind === 'common'
        ? ['Yes']
        : kind === 'category'
          ? ['Categories']
          : kind === 'outlier'
            ? ['Numbers', 'Yes']
            : ['Numbers', 'No'];
    const purposeWords = kind === 'common' ? '' : ' A typical value is wanted.';
    return {
      kind: 'flow',
      prompt: [say(`Here are the ${ctx.long}: ${averageData(params)}.${purpose ? purposeWords : ''} Which average suits them best?`)],
      subject: `\\text{${ctx.short}}`,
      steps,
      answer: purpose && kind !== 'common' ? ['No', ...path] : path,
    };
  },
  solution: (params) => {
    const { kind } = params;
    if (kind === 'category') return [{ text: 'These are categories, not numbers: there is nothing to add up or put in order, so only the mode works.' }];
    if (kind === 'common') {
      const { value } = modeOf(params.values);
      return [{ text: `The question wants the most common value, which is the mode: here $${value}$.` }];
    }
    const s = ordered(params.values);
    if (kind === 'outlier') {
      return [
        { text: `In order: ${listProse(s)}. The value $${s[s.length - 1]}$ is far above the rest.` },
        { text: `The mean would be dragged up towards it, so the median, $${fmt(median(s))}$, is the better typical value.` },
      ];
    }
    return [
      { text: `In order: ${listProse(s)}. Nothing is far from the rest.` },
      { text: `So the mean, which uses every value, is the best choice: $${fmt(Math.round((total(s) / s.length) * 10) / 10)}$ to one decimal place.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 2: a missing value, and two groups combined
 * ================================================================ */

interface MissingParams {
  known: number[];
  x: number;
}

const missingMean = ({ known, x }: MissingParams): number => (total(known) + x) / (known.length + 1);

/** A list with one value hidden, and a mean that is whole at difficulty 1 and a decimal at 2. */
function sampleMissing(rng: Rng, difficulty: number): MissingParams {
  const hard = difficulty > 1;
  for (;;) {
    const n = hard ? rng.int(5, 8) : rng.int(4, 6);
    const known = hard ? ints(rng, n - 1, 5, 40) : ints(rng, n - 1, 2, 20);
    const x = hard ? rng.int(5, 40) : rng.int(2, 20);
    const m = missingMean({ known, x });
    if (hard ? whole(m) || !exact(m, 1) : !whole(m)) continue;
    if (known.includes(x)) continue;
    return { known, x };
  }
}

function missingSolution({ known, x }: MissingParams): SolutionStep[] {
  const n = known.length + 1;
  const m = missingMean({ known, x });
  return [
    { text: `A mean of $${fmt(m)}$ over ${n} values means they add up to $${n} \\times ${fmt(m)} = ${fmt(n * m)}$.` },
    { text: `The ${n - 1} values you know add up to $${total(known)}$.` },
    { tex: `x = ${fmt(n * m)} - ${total(known)} = ${x}` },
  ];
}

const missingValue: Generator<MissingParams> = {
  id: 'dat-missing',
  sample: sampleMissing,
  render: (params): Slide => {
    const n = params.known.length + 1;
    return {
      kind: 'expression',
      prompt: [say(`The mean of these ${n} values is $${fmt(missingMean(params))}$: ${listProse(params.known)} and $x$. Find $x$.`)],
      lead: 'x =',
      keypad: NUMBER_KEYS,
      answer: fmt(params.x),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: missingSolution,
};

/**
 * The same missing value with the working laid out as tiles: the count times
 * the mean, less what the known values add to.
 */
const totalTiles: Generator<MissingParams> = {
  id: 'dat-total-tiles',
  sample: sampleMissing,
  render: (params): Slide => {
    const n = params.known.length + 1;
    const m = missingMean(params);
    const s = total(params.known);
    return {
      kind: 'tiles',
      prompt: [
        say(
          `The mean of ${n} values is $${fmt(m)}$. The values are ${listProse(params.known)} and $x$. Fill in the working: all ${n} values add up to ${n} times the mean, and $x$ is what is left after the others.`,
        ),
      ],
      template: `x = ${n} \\times {0} - {1} = {2}`,
      bank: valueBank([m, s, params.x], [n * m, s + params.x, params.x + m, n, s - m, m * (n - 1)]),
      answer: [fmt(m), fmt(s), fmt(params.x)],
    };
  },
  solution: missingSolution,
};

interface CombinedParams {
  nA: number;
  mA: number;
  nB: number;
  mB: number;
  names: number;
}

const GROUP_NAMES: [string, string][] = [
  ['Class A', 'Class B'],
  ['the morning shift', 'the evening shift'],
  ['the red team', 'the blue team'],
  ['the first coach', 'the second coach'],
  ['the boys', 'the girls'],
  ['the choir', 'the band'],
];

const combinedTotal = ({ nA, mA, nB, mB }: CombinedParams): number => nA * mA + nB * mB;
const combinedMean = (p: CombinedParams): number => combinedTotal(p) / (p.nA + p.nB);

/**
 * Two groups, each with its size and mean, combined into one mean. Never the
 * mean of the two means, which the draw keeps different from the answer.
 */
const combinedTree: Generator<CombinedParams> = {
  id: 'dat-combined-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const nA = hard ? rng.int(8, 25) : rng.int(3, 12);
      const nB = hard ? rng.int(8, 25) : rng.int(3, 12);
      const mA = hard ? rng.int(20, 120) / 2 : rng.int(5, 30);
      const mB = hard ? rng.int(20, 120) / 2 : rng.int(5, 30);
      const params = { nA, mA, nB, mB, names: rng.int(0, GROUP_NAMES.length - 1) };
      const m = combinedMean(params);
      if (nA === nB || mA === mB) continue;
      if (hard ? whole(m) || !exact(m, 1) : !whole(m)) continue;
      if (Math.abs(m - (mA + mB) / 2) < 0.05) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { nA, mA, nB, mB } = params;
    const [a, b] = GROUP_NAMES[params.names];
    const t = combinedTotal(params);
    const n = nA + nB;
    const answer = [nA * mA, nB * mB, n, t, t / n];
    const slips = [(mA + mB) / 2, nA + mA, nB + mB, mA + mB, t / 2, nA * mB, n + 1, t / n + 1];
    return {
      kind: 'tree',
      prompt: [
        say(
          `There are ${nA} in ${a}, with a mean of $${fmt(mA)}$, and ${nB} in ${b}, with a mean of $${fmt(mB)}$. Find the mean of everyone together. Top row, left to right: the total for ${a}, the total for ${b}, and how many there are altogether. Then the combined total, then the combined mean.`,
        ),
      ],
      expression: '\\bar{x} = \\frac{\\text{total}}{n}',
      nodes: [
        { id: 'ta', from: [] },
        { id: 'tb', from: [] },
        { id: 'n', from: [] },
        { id: 't', from: ['ta', 'tb'] },
        { id: 'm', from: ['t', 'n'] },
      ],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { nA, mA, nB, mB } = params;
    const t = combinedTotal(params);
    const n = nA + nB;
    return [
      { text: 'A mean times the number of values gives the total, so find each group\'s total first.' },
      { tex: aligned(`${nA} \\times ${fmt(mA)} &= ${fmt(nA * mA)}`, `${nB} \\times ${fmt(mB)} &= ${fmt(nB * mB)}`) },
      { text: `Together that is $${fmt(t)}$ over $${n}$ values.` },
      { tex: `\\bar{x} = \\frac{${fmt(t)}}{${n}} = ${fmt(t / n)}` },
      { text: `Not the mean of the two means, $${fmt((mA + mB) / 2)}$: the bigger group counts for more.` },
    ];
  },
};

interface ChangeParams {
  n: number;
  m: number;
  v: number;
  op: 'add' | 'remove';
}

const changedCount = ({ n, op }: ChangeParams): number => (op === 'add' ? n + 1 : n - 1);
const changedTotal = ({ n, m, v, op }: ChangeParams): number => (op === 'add' ? n * m + v : n * m - v);
const changedMean = (p: ChangeParams): number => changedTotal(p) / changedCount(p);

/**
 * A value added to a list, or taken out of it, and the new mean worked one
 * operation at a time: the old total, the new total, the share.
 */
const addValueSteps: Generator<ChangeParams> = {
  id: 'dat-add-value-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const op = hard ? rng.pick<ChangeParams['op']>(['add', 'remove']) : 'add';
      const n = rng.int(3, hard ? 12 : 8);
      const m = rng.int(4, hard ? 40 : 20);
      const v = rng.int(1, hard ? 80 : 40);
      const params = { n, m, v, op };
      const next = changedMean(params);
      if (v === m || next <= 0 || changedCount(params) < 2) continue;
      if (hard ? !exact(next, 1) : !whole(next)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { n, m, v, op } = params;
    const p = n * m;
    const s = changedTotal(params);
    const N = changedCount(params);
    const next = changedMean(params);
    const sign = op === 'add' ? '+' : '-';
    const other = op === 'add' ? p - v : p + v;
    return {
      kind: 'steps',
      prompt: [
        say(
          `The mean of ${n} values is $${m}$. The value $${v}$ is ${op === 'add' ? 'added to' : 'taken out of'} the list. Find the new mean: tap the part you would do next, then choose what it comes to.`,
        ),
      ],
      start: ['(', `${n}`, '\\times', `${m}`, sign, `${v}`, ')', '\\div', `${N}`],
      reductions: [
        { span: [1, 4], operator: 2, value: fmt(p), bank: stepBank(fmt(p), ...tidy([n + m, p + m, m * N]).map(fmt)) },
        { span: [0, 5], operator: 2, value: fmt(s), bank: stepBank(fmt(s), fmt(other), fmt(s + 1), fmt(s - 1)) },
        { span: [0, 3], operator: 1, value: fmt(next), bank: stepBank(fmt(next), ...tidy([s / n, next + 1, next - 1, (m + v) / 2]).map(fmt)) },
      ],
    };
  },
  solution: (params) => {
    const { n, m, v, op } = params;
    const N = changedCount(params);
    return [
      { text: `The ${n} values add up to $${n} \\times ${m} = ${n * m}$.` },
      { text: `${op === 'add' ? 'Adding' : 'Taking out'} $${v}$ makes the total $${changedTotal(params)}$, now over ${N} values.` },
      { tex: `\\bar{x} = \\frac{${changedTotal(params)}}{${N}} = ${fmt(changedMean(params))}` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 3: frequency tables
 * ================================================================ */

const FREQ_CONTEXTS = [
  { text: 'A survey asked some families how many children they have.', from: [0, 1] },
  { text: 'A team recorded the goals it scored in each match.', from: [0, 1] },
  { text: 'A dice was rolled and each score recorded.', from: [1, 2] },
  { text: 'A shop recorded the shoe sizes it sold in a morning.', from: [3, 7] },
  { text: 'A class counted the pets each pupil has.', from: [0, 1] },
  { text: 'A car park counted the people in each car.', from: [1, 2] },
  { text: 'A café counted the sugars each customer took.', from: [0, 1] },
];

interface FreqParams {
  xs: number[];
  fs: number[];
  context: number;
}

const fx = ({ xs, fs }: FreqParams): number[] => xs.map((x, i) => x * fs[i]);
const freqTotal = ({ fs }: FreqParams): number => total(fs);
const freqMean = (p: FreqParams): number => total(fx(p)) / freqTotal(p);

/** Consecutive values with frequencies: four rows at difficulty 1, five at 2. */
function sampleFreq(rng: Rng, difficulty: number, accept: (p: FreqParams) => boolean): FreqParams {
  const hard = difficulty > 1;
  for (;;) {
    const context = rng.int(0, FREQ_CONTEXTS.length - 1);
    const [lo, hi] = FREQ_CONTEXTS[context].from;
    const start = rng.int(lo, hi);
    const k = hard ? 5 : 4;
    const xs = Array.from({ length: k }, (_, i) => start + i);
    const fs = ints(rng, k, 1, hard ? 15 : 9);
    const params = { xs, fs, context };
    if (accept(params)) return params;
  }
}

const freqPrompt = (p: FreqParams, ask: string): Block[] => [
  say(FREQ_CONTEXTS[p.context].text),
  show(freqTableTex(p.xs, p.fs)),
  say(ask),
];

/** The `fx` column of a frequency table, and its total, filled in. */
const fxTable: Generator<FreqParams> = {
  id: 'dat-fx-table',
  sample: (rng, difficulty) => sampleFreq(rng, difficulty, () => true),
  render: (params): Slide => {
    const products = fx(params);
    const answer = [...products, total(products)];
    const slips = [
      ...params.xs.map((x, i) => x + params.fs[i]),
      total(params.xs),
      freqTotal(params),
      total(products) + params.xs[params.xs.length - 1],
    ];
    return {
      kind: 'table',
      prompt: [
        say(`${FREQ_CONTEXTS[params.context].text} Fill in the $fx$ column, each value times its frequency, and its total at the bottom.`),
      ],
      columns: ['x', 'f', 'fx'],
      rows: [
        ...params.xs.map((x, i) => [fmt(x), `${params.fs[i]}`, null]),
        ['\\text{Total}', `${freqTotal(params)}`, null],
      ],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const products = fx(params);
    return [
      { text: 'Each row of $fx$ is the value times how often it happened:' },
      { tex: aligned(...params.xs.map((x, i) => `${x} \\times ${params.fs[i]} &= ${products[i]}`)) },
      { text: `They add up to $\\sum fx = ${total(products)}$: the total of all ${freqTotal(params)} values.` },
    ];
  },
};

/** The mean from a frequency table: whole at difficulty 1, a decimal at 2. */
const freqMeanGen: Generator<FreqParams> = {
  id: 'dat-freq-mean',
  sample: (rng, difficulty) =>
    sampleFreq(rng, difficulty, (p) => {
      const m = freqMean(p);
      return difficulty > 1 ? !whole(m) && exact(m, 1) : whole(m);
    }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: freqPrompt(params, 'Find the mean.'),
    lead: '\\bar{x} =',
    keypad: NUMBER_KEYS,
    answer: fmt(freqMean(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => [
    { text: 'Multiply each value by its frequency and add: that is the total of every value in the table.' },
    { tex: aligned(...params.xs.map((x, i) => `${x} \\times ${params.fs[i]} &= ${x * params.fs[i]}`)) },
    { tex: `\\sum fx = ${total(fx(params))}` },
    { text: `There are $\\sum f = ${freqTotal(params)}$ values altogether.` },
    { tex: `\\bar{x} = \\frac{\\sum fx}{\\sum f} = \\frac{${total(fx(params))}}{${freqTotal(params)}} = ${fmt(freqMean(params))}` },
  ],
};

/**
 * The same mean with the formula laid out as tiles. The slips are the two
 * classic ones: adding the values rather than `fx`, and dividing by the
 * number of rows rather than the number of values.
 */
const freqFormulaTiles: Generator<FreqParams> = {
  id: 'dat-freq-formula-tiles',
  sample: (rng, difficulty) =>
    sampleFreq(rng, difficulty, (p) => {
      const m = freqMean(p);
      return difficulty > 1 ? !whole(m) && exact(m, 1) : whole(m);
    }),
  render: (params): Slide => {
    const sfx = total(fx(params));
    const sf = freqTotal(params);
    const k = params.xs.length;
    return {
      kind: 'tiles',
      prompt: freqPrompt(params, 'Fill in the working for the mean.'),
      template: '\\bar{x} = {0} \\div {1} = {2}',
      bank: valueBank([sfx, sf, sfx / sf], [total(params.xs), k, sfx / k, sf / k, total(params.xs) / k]),
      answer: [fmt(sfx), fmt(sf), fmt(sfx / sf)],
    };
  },
  solution: (params) => [
    { text: `The top is $\\sum fx = ${total(fx(params))}$, the total of every value, not $\\sum x = ${total(params.xs)}$.` },
    { text: `The bottom is $\\sum f = ${freqTotal(params)}$, how many values there are, not the ${params.xs.length} rows.` },
    { tex: `\\bar{x} = ${total(fx(params))} \\div ${freqTotal(params)} = ${fmt(freqMean(params))}` },
  ],
};

interface FreqChoiceParams extends FreqParams {
  ask: 'mode' | 'median';
}

/** The value in position `p` (1-based) of the data a frequency table holds. */
function freqAt({ xs, fs }: FreqParams, p: number): number {
  let seen = 0;
  for (let i = 0; i < xs.length; i += 1) {
    seen += fs[i];
    if (p <= seen) return xs[i];
  }
  return xs[xs.length - 1];
}

const freqMode = ({ xs, fs }: FreqParams): number => xs[fs.indexOf(Math.max(...fs))];
const freqMedian = (p: FreqParams): number => freqAt(p, (freqTotal(p) + 1) / 2);

/**
 * The mode of a frequency table at difficulty 1 (the value, not its
 * frequency), and the median at 2, found by counting through to the middle.
 */
const freqChoice: Generator<FreqChoiceParams> = {
  id: 'dat-freq-choice',
  sample: (rng, difficulty) => {
    const ask = difficulty > 1 ? 'median' : 'mode';
    const params = sampleFreq(rng, difficulty, (p) => {
      const top = Math.max(...p.fs);
      if (p.fs.filter((f) => f === top).length > 1) return false;
      if (ask === 'mode') return top !== freqMode(p);
      // An odd total puts the median on one value; the middle of the table and
      // the mode must both be wrong, or counting through is not being asked.
      if (freqTotal(p) % 2 === 0) return false;
      const m = freqMedian(p);
      return m !== p.xs[Math.floor(p.xs.length / 2)] && m !== freqMode(p);
    });
    return { ...params, ask };
  },
  render: (params): Slide => {
    const { ask } = params;
    const answer = ask === 'mode' ? freqMode(params) : freqMedian(params);
    const wrong =
      ask === 'mode'
        ? [Math.max(...params.fs), params.xs[params.xs.length - 1], freqMedian(params)]
        : [(freqTotal(params) + 1) / 2, params.xs[Math.floor(params.xs.length / 2)], freqMode(params)];
    const opts = valueChoices(answer, wrong, mix(...params.fs));
    return choiceSlide(freqPrompt(params, `Which is the ${ask}?`), opts, `${params.xs.join(',')}|${params.fs.join(',')}`);
  },
  solution: (params) => {
    if (params.ask === 'mode') {
      const top = Math.max(...params.fs);
      return [
        { text: `The biggest frequency is $${top}$, so the most common value is the one it belongs to.` },
        { text: `The mode is $${freqMode(params)}$: the value, not its frequency.` },
      ];
    }
    const n = freqTotal(params);
    const p = (n + 1) / 2;
    let running = 0;
    const counts = params.fs.map((f) => (running += f));
    return [
      { text: `There are $${n}$ values, so the median is the ${p}th.` },
      { text: `Counting through the frequencies: ${counts.map((c, i) => `up to $${params.xs[i]}$ makes $${c}$`).join(', ')}.` },
      { text: `The ${p}th value is $${freqMedian(params)}$.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 4: grouped data
 * ================================================================ */

const GROUPED_CONTEXTS = [
  'Some people timed how many minutes a puzzle took them.',
  'A gardener measured some plants, in centimetres.',
  'A post office weighed some parcels, in hundreds of grams.',
  'A gym recorded the ages of its members.',
  'A class measured how far each pupil threw a ball, in metres.',
  'A café timed how many minutes each customer waited.',
];

interface GroupedParams {
  /** Class boundaries, one more than there are classes. */
  bounds: number[];
  fs: number[];
  context: number;
}

const midpoints = ({ bounds }: GroupedParams): number[] =>
  bounds.slice(0, -1).map((lo, i) => (lo + bounds[i + 1]) / 2);

const groupedTotal = (p: GroupedParams): number => total(midpoints(p).map((m, i) => m * p.fs[i]));
const groupedMean = (p: GroupedParams): number => groupedTotal(p) / total(p.fs);

/**
 * Classes of equal width, or of mixed widths where `mixed` is set, and a
 * frequency for each.
 */
function sampleGrouped(
  rng: Rng,
  k: number,
  mixed: boolean,
  maxF: number,
  accept: (p: GroupedParams) => boolean,
): GroupedParams {
  for (;;) {
    const width = rng.pick([5, 10, 20]);
    const start = mixed ? 5 * rng.int(0, 6) : width * rng.int(0, 3);
    const bounds = [start];
    for (let i = 0; i < k; i += 1) bounds.push(bounds[i] + (mixed ? rng.pick([5, 10, 15, 20]) : width));
    const fs = ints(rng, k, 1, maxF);
    const params = { bounds, fs, context: rng.int(0, GROUPED_CONTEXTS.length - 1) };
    if (accept(params)) return params;
  }
}

/** The midpoint of every class, filled in beside its frequency. */
const midpointTable: Generator<GroupedParams> = {
  id: 'dat-midpoint-table',
  sample: (rng, difficulty) =>
    difficulty > 1 ? sampleGrouped(rng, 5, true, 20, () => true) : sampleGrouped(rng, 4, false, 12, () => true),
  render: (params): Slide => {
    const mids = midpoints(params);
    const { bounds } = params;
    const slips = [bounds[0], bounds[bounds.length - 1], bounds[1], mids[mids.length - 1] + (bounds[1] - bounds[0])];
    return {
      kind: 'table',
      prompt: [say(`${GROUPED_CONTEXTS[params.context]} Fill in the midpoint of each class: halfway between its two ends.`)],
      columns: ['\\text{Class}', 'f', '\\text{Midpoint}'],
      rows: params.fs.map((f, i) => [classTex(bounds[i], bounds[i + 1]), `${f}`, null]),
      bank: valueBank(mids, slips, 3, 5),
      answer: mids.map(fmt),
    };
  },
  solution: (params) => {
    const mids = midpoints(params);
    return [
      { text: 'Each midpoint is the two ends of its class added and halved:' },
      {
        tex: aligned(
          ...mids.map((m, i) => `\\frac{${params.bounds[i]} + ${params.bounds[i + 1]}}{2} &= ${fmt(m)}`),
        ),
      },
    ];
  },
};

const groupedPrompt = (p: GroupedParams, ask: string): Block[] => [
  say(GROUPED_CONTEXTS[p.context]),
  show(groupedTableTex(p.bounds, p.fs)),
  say(ask),
];

function groupedSolution(p: GroupedParams): SolutionStep[] {
  const mids = midpoints(p);
  return [
    { text: `The exact values are lost in the table, so use each class's midpoint: ${mids.map((m) => `$${fmt(m)}$`).join(', ')}.` },
    { tex: aligned(...mids.map((m, i) => `${fmt(m)} \\times ${p.fs[i]} &= ${fmt(m * p.fs[i])}`)) },
    { tex: `\\sum fx = ${fmt(groupedTotal(p))}` },
    { tex: `\\bar{x} \\approx \\frac{${fmt(groupedTotal(p))}}{${total(p.fs)}} = ${fmt(groupedMean(p))}` },
    { text: 'It is an estimate: each value is taken to sit in the middle of its class.' },
  ];
}

const meanAccept = (hard: boolean) => (p: GroupedParams) => {
  const m = groupedMean(p);
  return hard ? !whole(m) && exact(m, 1) : whole(m);
};

/** An estimated mean from a grouped table, using the midpoints. */
const groupedMeanGen: Generator<GroupedParams> = {
  id: 'dat-grouped-mean',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? sampleGrouped(rng, 5, true, 12, meanAccept(true))
      : sampleGrouped(rng, 4, false, 9, meanAccept(false)),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: groupedPrompt(params, 'Estimate the mean, using the midpoint of each class.'),
    lead: '\\bar{x} \\approx',
    keypad: NUMBER_KEYS,
    answer: fmt(groupedMean(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: groupedSolution,
};

/**
 * The estimated mean of three classes, one operation at a time: each
 * midpoint times its frequency, the products added, the total shared out.
 */
const groupedSteps: Generator<GroupedParams> = {
  id: 'dat-grouped-steps',
  sample: (rng, difficulty) =>
    difficulty > 1 ? sampleGrouped(rng, 3, true, 12, meanAccept(true)) : sampleGrouped(rng, 3, false, 9, meanAccept(false)),
  render: (params): Slide => {
    const mids = midpoints(params);
    const { fs } = params;
    const p = mids.map((m, i) => m * fs[i]);
    const q = p[0] + p[1];
    const t = groupedTotal(params);
    const N = total(fs);
    const mean = t / N;
    const productBank = (i: number) => stepBank(fmt(p[i]), ...tidy([mids[i] + fs[i], params.bounds[i] * fs[i], p[i] + fs[i]]).map(fmt));
    return {
      kind: 'steps',
      prompt: groupedPrompt(params, 'The midpoints are in the line below. Estimate the mean: tap the part you would do next, then choose what it comes to.'),
      start: ['(', fmt(mids[0]), '\\times', `${fs[0]}`, '+', fmt(mids[1]), '\\times', `${fs[1]}`, '+', fmt(mids[2]), '\\times', `${fs[2]}`, ')', '\\div', `${N}`],
      reductions: [
        { span: [1, 4], operator: 2, value: fmt(p[0]), bank: productBank(0) },
        { span: [3, 6], operator: 4, value: fmt(p[1]), bank: productBank(1) },
        { span: [5, 8], operator: 6, value: fmt(p[2]), bank: productBank(2) },
        { span: [1, 4], operator: 2, value: fmt(q), bank: stepBank(fmt(q), fmt(q + 10), fmt(q - 10), fmt(p[0] * 2)) },
        { span: [0, 5], operator: 2, value: fmt(t), bank: stepBank(fmt(t), fmt(t + 10), fmt(t - 10), fmt(q)) },
        { span: [0, 3], operator: 1, value: fmt(mean), bank: stepBank(fmt(mean), ...tidy([t / 3, mean + 1, mean - 1, total(mids) / 3]).map(fmt)) },
      ],
    };
  },
  solution: groupedSolution,
};

interface ClassChoiceParams extends GroupedParams {
  ask: 'modal' | 'median';
}

/** Which class the value in position `p` (1-based) falls in. */
function classAt({ fs }: GroupedParams, p: number): number {
  let seen = 0;
  for (let i = 0; i < fs.length; i += 1) {
    seen += fs[i];
    if (p <= seen) return i;
  }
  return fs.length - 1;
}

/**
 * The modal class at difficulty 1, and the class holding the median at 2,
 * which is never the modal one. Classes are all one width, so the biggest
 * frequency really is the most crowded class.
 */
const modalClass: Generator<ClassChoiceParams> = {
  id: 'dat-modal-class',
  sample: (rng, difficulty) => {
    const ask = difficulty > 1 ? 'median' : 'modal';
    const params = sampleGrouped(rng, difficulty > 1 ? 5 : 4, false, 15, (p) => {
      const top = Math.max(...p.fs);
      if (p.fs.filter((f) => f === top).length > 1) return false;
      if (ask === 'modal') return true;
      const n = total(p.fs);
      return n % 2 === 1 && classAt(p, (n + 1) / 2) !== p.fs.indexOf(top);
    });
    return { ...params, ask };
  },
  render: (params): Slide => {
    const k = params.fs.length;
    const right = params.ask === 'modal' ? params.fs.indexOf(Math.max(...params.fs)) : classAt(params, (total(params.fs) + 1) / 2);
    const opts = Array.from({ length: k }, (_, i) => ({
      tex: classTex(params.bounds[i], params.bounds[i + 1]),
      correct: i === right ? true : undefined,
    }));
    return choiceSlide(
      groupedPrompt(params, params.ask === 'modal' ? 'Which is the modal class?' : 'Which class contains the median?'),
      opts,
      `${params.bounds.join(',')}|${params.fs.join(',')}`,
    );
  },
  solution: (params) => {
    if (params.ask === 'modal') {
      const i = params.fs.indexOf(Math.max(...params.fs));
      return [{ text: `The biggest frequency, $${params.fs[i]}$, belongs to $${classTex(params.bounds[i], params.bounds[i + 1])}$: that is the modal class.` }];
    }
    const n = total(params.fs);
    const p = (n + 1) / 2;
    const i = classAt(params, p);
    let running = 0;
    const counts = params.fs.map((f) => (running += f));
    return [
      { text: `There are $${n}$ values, so the median is the ${p}th.` },
      { text: `Running totals of the frequencies: ${counts.map((c) => `$${c}$`).join(', ')}.` },
      { text: `The ${p}th value falls in $${classTex(params.bounds[i], params.bounds[i + 1])}$.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 5: scatter diagrams
 * ================================================================ */

type Point = [number, number];

/** Every scatter shares one window, so squares can be counted from 0 to 10. */
const SCATTER = { xMin: -0.4, xMax: 10.4, yMin: -0.4, yMax: 10.4 };

function scatterSvg(points: readonly Point[], label: string, line?: (x: number) => number): string {
  return plotSvg({
    ...SCATTER,
    height: 200,
    grid: true,
    curves: line ? [{ f: line, accent: true }] : [],
    marks: points.map(([x, y]) => ({ x, y })),
    label,
  });
}

/** Pearson's correlation, used only to decide what a draw shows. */
export function correlation(points: readonly Point[]): number {
  const n = points.length;
  const mx = total(points.map((p) => p[0])) / n;
  const my = total(points.map((p) => p[1])) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of points) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}

type Strength = 'strong' | 'weak' | 'none';

const fits = (r: number, strength: Strength): boolean =>
  strength === 'strong' ? Math.abs(r) >= 0.9 : strength === 'weak' ? Math.abs(r) >= 0.4 && Math.abs(r) <= 0.7 : Math.abs(r) <= 0.25;

/**
 * Points on distinct whole x from 1 to 9 around a line, with whole y from 0
 * to 10, redrawn until the correlation is the strength asked for.
 */
function scatterPoints(rng: Rng, n: number, sign: 1 | -1, strength: Strength, xs?: number[]): Point[] {
  for (;;) {
    const at = xs ?? ordered(rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], n));
    const slope = rng.pick([0.6, 0.8, 1]) * sign;
    const start = sign > 0 ? rng.int(0, 3) : rng.int(7, 10);
    const noise = strength === 'strong' ? 1 : 3;
    const points: Point[] = at.map((x) => [
      x,
      strength === 'none' ? rng.int(1, 9) : Math.round(start + slope * x) + rng.int(-noise, noise),
    ]);
    if (points.some(([, y]) => y < 0 || y > 10)) continue;
    const r = correlation(points);
    if (!fits(r, strength)) continue;
    if (strength !== 'none' && Math.sign(r) !== sign) continue;
    return points;
  }
}

const pointsLabel = (points: readonly Point[]): string => `A scatter diagram of ${points.length} points on a grid from 0 to 10`;

interface CorrelationParams {
  points: Point[];
  sign: 1 | -1 | 0;
  strength: Strength;
  graded: boolean;
}

function correlationName({ sign, strength, graded }: CorrelationParams): string {
  if (sign === 0) return 'No correlation';
  const way = sign > 0 ? 'positive' : 'negative';
  if (!graded) return `${way[0].toUpperCase()}${way.slice(1)} correlation`;
  return `${strength === 'strong' ? 'Strong' : 'Weak'} ${way} correlation`;
}

/**
 * The correlation a scatter shows: its direction at difficulty 1, and its
 * direction and strength at 2.
 */
const correlationChoice: Generator<CorrelationParams> = {
  id: 'dat-correlation',
  sample: (rng, difficulty) => {
    const graded = difficulty > 1;
    const sign = rng.pick<1 | -1 | 0>(graded ? [1, -1] : [1, -1, 0]);
    const strength: Strength = sign === 0 ? 'none' : graded ? rng.pick<Strength>(['strong', 'weak']) : 'strong';
    const n = rng.int(7, 9);
    const points = scatterPoints(rng, n, sign === 0 ? 1 : sign, strength);
    return { points, sign, strength, graded };
  },
  render: (params): Slide => {
    const names = params.graded
      ? ['Strong positive correlation', 'Weak positive correlation', 'Strong negative correlation', 'Weak negative correlation']
      : ['Positive correlation', 'Negative correlation', 'No correlation'];
    const right = correlationName(params);
    const opts = names.map((tex) => ({ tex, correct: tex === right ? true : undefined }));
    return choiceSlide(
      [{ kind: 'diagram', svg: scatterSvg(params.points, pointsLabel(params.points)) }, say('Describe the correlation this scatter diagram shows.')],
      opts,
      JSON.stringify(params.points),
      false,
    );
  },
  solution: (params) => {
    const steps: SolutionStep[] = [];
    if (params.sign === 0) {
      steps.push({ text: 'The points are scattered with no trend: as $x$ goes up, $y$ neither rises nor falls. No correlation.' });
      return steps;
    }
    steps.push({
      text:
        params.sign > 0
          ? 'As $x$ increases, $y$ tends to increase too: positive correlation.'
          : 'As $x$ increases, $y$ tends to decrease: negative correlation.',
    });
    if (params.graded) {
      steps.push({
        text:
          params.strength === 'strong'
            ? 'The points lie close to a straight line, so it is strong.'
            : 'The trend is there, but the points are spread well away from any one line, so it is weak.',
      });
    }
    return steps;
  },
};

interface ScatterSliderParams {
  points: Point[];
  mode: 'outlier' | 'line';
  /** The x the learner should slide to. */
  target: number;
  /** For `line`: y = a + b x, and the y the line reaches at the target. */
  a: number;
  b: number;
}

const lineAt = (a: number, b: number) => (x: number) => a + b * x;

/**
 * Slide the marker to a point on a scatter: the one point that breaks the
 * pattern at difficulty 1, and where the drawn line of best fit reaches a
 * given height at 2.
 */
const scatterSlider: Generator<ScatterSliderParams> = {
  id: 'dat-scatter-slider',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      for (;;) {
        const b = rng.pick([0.5, 1, 2, -0.5, -1, -2]);
        const target = rng.int(1, 9);
        const y = rng.int(1, 9);
        const a = y - b * target;
        if (a < -3 || a > 13) continue;
        const f = lineAt(a, b);
        const xs = ordered(rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== target), 7));
        const points: Point[] = xs.map((x) => [x, Math.round(f(x)) + rng.int(-1, 1)]);
        if (points.some(([, py]) => py < 0 || py > 10)) continue;
        if (Math.abs(correlation(points)) < 0.8) continue;
        return { points, mode: 'line', target, a, b };
      }
    }
    for (;;) {
      const sign = rng.pick<1 | -1>([1, -1]);
      const target = rng.int(1, 9);
      const xs = ordered(rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== target), 7));
      const base = scatterPoints(rng, 7, sign, 'strong', xs);
      // The odd one out sits at least four squares off the trend of the rest.
      const n = base.length;
      const mx = total(base.map((p) => p[0])) / n;
      const my = total(base.map((p) => p[1])) / n;
      const slope =
        total(base.map(([x, y]) => (x - mx) * (y - my))) / total(base.map(([x]) => (x - mx) ** 2));
      const expected = my + slope * (target - mx);
      const y = rng.int(0, 10);
      if (Math.abs(y - expected) < 4) continue;
      const points = [...base, [target, y] as Point].sort((p, q) => p[0] - q[0]);
      return { points, mode: 'outlier', target, a: 0, b: 0 };
    }
  },
  render: (params): Slide => {
    const line = params.mode === 'line' ? lineAt(params.a, params.b) : undefined;
    const y = line ? line(params.target) : 0;
    return {
      kind: 'slider',
      prompt: [
        say(
          params.mode === 'outlier'
            ? 'One point does not follow the pattern of the rest. Slide the line to it.'
            : `The line of best fit is drawn. Slide the marker to the value of $x$ where the line predicts $y = ${fmt(y)}$. Each square is one unit.`,
        ),
      ],
      min: 0,
      max: 10,
      step: 1,
      answer: params.target,
      readout: 'x = {v}',
      figure: {
        svg: scatterSvg(params.points, pointsLabel(params.points), line),
        ...markerWindow(SCATTER.xMin, SCATTER.xMax),
      },
    };
  },
  solution: (params) => {
    if (params.mode === 'outlier') {
      const odd = params.points.find(([x]) => x === params.target)!;
      return [
        { text: 'The rest of the points follow one trend, close to a straight line.' },
        { text: `The point $(${odd[0]}, ${odd[1]})$ sits far from that line: it is the one that does not fit, at $x = ${params.target}$.` },
      ];
    }
    const y = lineAt(params.a, params.b)(params.target);
    return [
      { text: `Go across from $y = ${fmt(y)}$ to the line, then straight down.` },
      { text: `The line reaches that height at $x = ${params.target}$.` },
    ];
  },
};

interface LineParams {
  points: Point[];
  a: number;
  b: number;
  x: number;
}

/** `a + bx` as the learner reads it. */
const lineTex = (a: number, b: number): string => `${fmt(a)} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b))}x`;

/**
 * An estimate from a line of best fit's equation, at an x inside the data.
 * The line rises with whole-number `a` at difficulty 1; at 2 it falls, and
 * the x is a half.
 */
const lineEstimate: Generator<LineParams> = {
  id: 'dat-line-estimate',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const a = hard ? rng.int(80, 100) / 10 : rng.int(0, 3);
      const b = hard ? -rng.int(4, 9) / 10 : rng.int(5, 10) / 10;
      const f = lineAt(a, b);
      const xs = ordered(rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 8));
      const points: Point[] = xs.map((x) => [x, Math.round(f(x)) + rng.int(-1, 1)]);
      if (points.some(([, y]) => y < 0 || y > 10)) continue;
      const lo = xs[0];
      const hi = xs[xs.length - 1];
      const x = hard ? rng.int(lo, hi - 1) + 0.5 : rng.int(lo + 1, hi - 1);
      return { points, a, b, x };
    }
  },
  render: ({ points, a, b, x }): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'diagram', svg: scatterSvg(points, pointsLabel(points), lineAt(a, b)) },
      say(`The line of best fit is $y = ${lineTex(a, b)}$. Use it to estimate $y$ when $x = ${fmt(x)}$.`),
    ],
    lead: 'y \\approx',
    keypad: NUMBER_KEYS,
    answer: fmt(a + b * x),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, x }) => [
    { text: `Put $x = ${fmt(x)}$ into the equation of the line:` },
    { tex: `y = ${fmt(a)} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b))} \\times ${fmt(x)} = ${fmt(a + b * x)}` },
    { text: `$x = ${fmt(x)}$ is inside the data, so this is interpolation.` },
  ],
};

interface ReliableParams {
  points: Point[];
  a: number;
  b: number;
  x: number;
  strong: boolean;
}

/**
 * Whether an estimate from a line of best fit can be trusted: outside the
 * data it is extrapolation; inside, it is only as good as the correlation.
 * The data are always strong at difficulty 1.
 */
const reliableFlow: Generator<ReliableParams> = {
  id: 'dat-reliable-flow',
  sample: (rng, difficulty) => {
    const strong = difficulty > 1 ? rng.chance(0.5) : true;
    const sign = rng.pick<1 | -1>([1, -1]);
    const n = rng.int(6, 7);
    for (;;) {
      const xs = ordered(rng.sample([2, 3, 4, 5, 6, 7, 8], n));
      const points = scatterPoints(rng, n, sign, strong ? 'strong' : 'weak', xs);
      const mx = total(points.map((p) => p[0])) / n;
      const my = total(points.map((p) => p[1])) / n;
      const b = total(points.map(([x, y]) => (x - mx) * (y - my))) / total(points.map(([x]) => (x - mx) ** 2));
      const a = my - b * mx;
      const lo = xs[0];
      const hi = xs[n - 1];
      const inside = rng.chance(0.5);
      const x = inside ? rng.int(lo + 1, hi - 1) : rng.pick([...[0, 1].filter((v) => v < lo), hi + rng.int(2, 8)]);
      if (inside && (x <= lo || x >= hi)) continue;
      return { points, a, b, x, strong };
    }
  },
  render: (params): Slide => {
    const { points, x, strong } = params;
    const lo = points[0][0];
    const hi = points[points.length - 1][0];
    const inside = x > lo && x < hi;
    const key = `${JSON.stringify(points)}${x}`;
    return {
      kind: 'flow',
      prompt: [
        { kind: 'diagram', svg: scatterSvg(points, pointsLabel(points), lineAt(params.a, params.b)) },
        say(`The line of best fit is drawn. Someone uses it to estimate $y$ when $x = ${x}$. Decide whether to trust that estimate.`),
      ],
      subject: `x = ${x}`,
      steps: [
        {
          id: 'inside',
          ask: `The data run from $x = ${lo}$ to $x = ${hi}$. Is $x = ${x}$ inside that range?`,
          branches: rotated(
            [
              { label: 'Yes', to: 'close' },
              { label: 'No', outcome: 'Extrapolation: nothing says the pattern carries on past the data, so the estimate is unreliable.' },
            ],
            `${key}i`,
          ),
        },
        {
          id: 'close',
          ask: 'Do the points lie close to the line?',
          branches: rotated(
            [
              { label: 'Yes', outcome: 'Interpolation with strong correlation: a reliable estimate.' },
              { label: 'No', outcome: 'The correlation is weak, so even inside the data the line is a poor guide.' },
            ],
            `${key}c`,
          ),
        },
      ],
      answer: inside ? ['Yes', strong ? 'Yes' : 'No'] : ['No'],
    };
  },
  solution: (params) => {
    const lo = params.points[0][0];
    const hi = params.points[params.points.length - 1][0];
    if (!(params.x > lo && params.x < hi)) {
      return [
        { text: `$x = ${params.x}$ is outside the data, which run from $${lo}$ to $${hi}$.` },
        { text: 'Using the line out there is extrapolation: the pattern may change beyond what was measured, so the estimate cannot be trusted.' },
      ];
    }
    return [
      { text: `$x = ${params.x}$ is inside the data, from $${lo}$ to $${hi}$: interpolation.` },
      {
        text: params.strong
          ? 'The points hug the line, a strong correlation, so the estimate is reliable.'
          : 'But the points are spread well away from the line, a weak correlation, so the estimate is not reliable.',
      },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 1: the range
 * ================================================================ */

const RANGE_CONTEXTS = [
  'Marks in a quiz',
  'Ages of the players in a team',
  'Heights of some seedlings, in centimetres',
  'Scores in a darts match',
  'Minutes each bus was late',
  'Lengths of some worms, in millimetres',
];

const COLD_CONTEXTS = [
  'Midnight temperatures over some nights, in degrees Celsius',
  'Temperatures at a ski resort each morning, in degrees Celsius',
  'Lowest temperatures each day in a mountain town, in degrees Celsius',
];

interface RangeParams {
  values: number[];
  cold: boolean;
  context: number;
}

const rangeOf = (xs: readonly number[]): number => Math.max(...xs) - Math.min(...xs);

/**
 * A list whose largest and smallest values are not simply its first and last,
 * so reading off the ends of the list as written is a slip rather than a
 * shortcut. Whole positive values at difficulty 1; temperatures either side
 * of zero at 2.
 */
function sampleRange(rng: Rng, difficulty: number): RangeParams {
  const cold = difficulty > 1;
  for (;;) {
    const n = cold ? rng.int(6, 10) : rng.int(5, 9);
    const values = cold ? ints(rng, n, -12, 15) : ints(rng, n, 1, 60);
    const hi = Math.max(...values);
    const lo = Math.min(...values);
    if (cold && (lo >= 0 || hi <= 0)) continue;
    const ends = [values[0], values[n - 1]];
    if (ends.includes(hi) && ends.includes(lo)) continue;
    if (hi === lo) continue;
    return { values, cold, context: rng.int(0, (cold ? COLD_CONTEXTS : RANGE_CONTEXTS).length - 1) };
  }
}

const rangeLead = (p: RangeParams): string => (p.cold ? COLD_CONTEXTS : RANGE_CONTEXTS)[p.context];

function rangeSolution({ values }: RangeParams): SolutionStep[] {
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  return [
    { text: `The largest value is $${hi}$ and the smallest is $${lo}$.` },
    { tex: `\\text{range} = ${hi} - ${lo < 0 ? `(${lo})` : lo} = ${hi - lo}` },
  ];
}

const range: Generator<RangeParams> = {
  id: 'dat-range',
  sample: sampleRange,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`${rangeLead(params)}: ${listProse(params.values)}. Find the range.`)],
    lead: '\\text{range} =',
    keypad: NUMBER_KEYS,
    answer: fmt(rangeOf(params.values)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: rangeSolution,
};

/** The range as working: largest take smallest, with a negative bracketed. */
const rangeTiles: Generator<RangeParams> = {
  id: 'dat-range-tiles',
  sample: sampleRange,
  render: (params): Slide => {
    const { values } = params;
    const s = ordered(values);
    const hi = s[s.length - 1];
    const lo = s[0];
    const n = values.length;
    return {
      kind: 'tiles',
      prompt: [say(`${rangeLead(params)}: ${listProse(values)}. Fill in the working for the range.`)],
      template: lo < 0 ? '\\text{range} = {0} - ({1}) = {2}' : '\\text{range} = {0} - {1} = {2}',
      bank: valueBank([hi, lo, hi - lo], [values[0], values[n - 1], s[n - 2], s[1], hi + lo, -lo]),
      answer: [fmt(hi), fmt(lo), fmt(hi - lo)],
    };
  },
  solution: rangeSolution,
};

interface RemoveParams {
  values: number[];
  /** Index of the value that is taken out. */
  at: number;
  cold: boolean;
}

/**
 * The range once an extreme value is taken out of a list: the largest at
 * difficulty 1, and either end, with temperatures either side of zero, at 2.
 */
const removeChoice: Generator<RemoveParams> = {
  id: 'dat-remove-choice',
  sample: (rng, difficulty) => {
    const cold = difficulty > 1;
    for (;;) {
      const n = rng.int(6, 9);
      const rest = cold ? ints(rng, n - 1, -3, 12) : ints(rng, n - 1, 10, 40);
      const high = !cold || rng.chance(0.5);
      const v = cold ? (high ? rng.int(22, 35) : rng.int(-25, -12)) : rng.int(65, 99);
      const at = rng.int(0, n - 1);
      const values = [...rest.slice(0, at), v, ...rest.slice(at)];
      if (rangeOf(rest) === 0 || rangeOf(rest) === rangeOf(values)) continue;
      return { values, at, cold };
    }
  },
  render: (params): Slide => {
    const { values, at } = params;
    const v = values[at];
    const rest = values.filter((_, i) => i !== at);
    const now = rangeOf(rest);
    const before = rangeOf(values);
    const wrong = [before, before - now, Math.abs(v) - now, Math.max(...rest) - Math.min(...values)];
    const lead = params.cold ? 'Temperatures recorded at a weather station, in degrees Celsius' : 'Scores in a test';
    return choiceSlide(
      [say(`${lead}: ${listProse(values)}. The value $${v}$ was a mistake and is taken out. What is the range of what is left?`)],
      valueChoices(now, wrong, mix(...values)),
      values.join(','),
    );
  },
  solution: ({ values, at }) => {
    const rest = values.filter((_, i) => i !== at);
    const before = rangeOf(values);
    const now = rangeOf(rest);
    return [
      { text: `With $${values[at]}$ in, the range is $${before}$.` },
      { text: `Without it the largest value is $${Math.max(...rest)}$ and the smallest $${Math.min(...rest)}$, so the range is $${now}$.` },
      { text: `One extreme value made the range ${before - now} bigger: the range is only as trustworthy as its two ends.` },
    ];
  },
};

interface RangeFlowParams {
  values: number[];
  v: number;
  kind: 'inside' | 'end' | 'repeat';
}

/**
 * Whether taking one value out changes the range: only an end can, and only
 * when it is the only one of its size. Repeated ends arrive at difficulty 2.
 */
const rangeFlow: Generator<RangeFlowParams> = {
  id: 'dat-range-flow',
  sample: (rng, difficulty) => {
    const kind = rng.pick<RangeFlowParams['kind']>(difficulty > 1 ? ['inside', 'end', 'repeat'] : ['inside', 'end']);
    for (;;) {
      const n = rng.int(6, 8);
      const values = ints(rng, n, 1, 30);
      const hi = Math.max(...values);
      const lo = Math.min(...values);
      if (hi - lo < 5) continue;
      const count = (x: number) => values.filter((y) => y === x).length;
      if (kind === 'inside') {
        const inner = values.filter((x) => x !== hi && x !== lo);
        if (inner.length === 0) continue;
        return { values, v: rng.pick(inner), kind };
      }
      const v = rng.chance(0.5) ? hi : lo;
      if (kind === 'end') {
        if (count(v) !== 1) continue;
        return { values, v, kind };
      }
      // A repeated end: copy it over one of the middle values.
      const others = values.map((x, i) => [x, i] as const).filter(([x]) => x !== hi && x !== lo);
      if (others.length === 0 || count(v) !== 1) continue;
      const [, i] = rng.pick(others);
      const copy = [...values];
      copy[i] = v;
      return { values: copy, v, kind };
    }
  },
  render: ({ values, v, kind }): Slide => {
    const key = `${values.join(',')}|${v}`;
    return {
      kind: 'flow',
      prompt: [say(`The values are ${listProse(values)}. Does taking out one $${v}$ change the range?`)],
      subject: `\\text{take out } ${v}`,
      steps: [
        {
          id: 'end',
          ask: `Is $${v}$ the largest or the smallest value?`,
          branches: rotated(
            [
              { label: 'Yes', to: 'only' },
              { label: 'No', outcome: 'No change: the range only depends on the largest and smallest values, and neither moves.' },
            ],
            `${key}e`,
          ),
        },
        {
          id: 'only',
          ask: `Is there another $${v}$ in the list?`,
          branches: rotated(
            [
              { label: 'Yes', outcome: 'No change: the other one stays, so that end of the data is still there.' },
              { label: 'No', outcome: 'It changes: the next value in becomes the new end.' },
            ],
            `${key}o`,
          ),
        },
      ],
      answer: kind === 'inside' ? ['No'] : kind === 'end' ? ['Yes', 'No'] : ['Yes', 'Yes'],
    };
  },
  solution: ({ values, v, kind }) => {
    const hi = Math.max(...values);
    const lo = Math.min(...values);
    const steps: SolutionStep[] = [{ text: `The range is $${hi} - ${lo} = ${hi - lo}$.` }];
    if (kind === 'inside') steps.push({ text: `$${v}$ is neither end, so taking it out leaves $${hi}$ and $${lo}$ where they are.` });
    else if (kind === 'repeat') steps.push({ text: `$${v}$ is an end, but it appears twice: the other $${v}$ stays, so the range is still $${hi - lo}$.` });
    else {
      const rest = [...values];
      rest.splice(values.indexOf(v), 1);
      steps.push({ text: `$${v}$ is the only one at that end. Without it the range is $${rangeOf(rest)}$.` });
    }
    return steps;
  },
};

/* ================================================================
 * Level 2, lesson 2: quartiles and the interquartile range
 * ================================================================ */

interface QuartileParams {
  /** As shown to the learner: in order at difficulty 1, jumbled at 2. */
  values: number[];
  sorted: boolean;
}

/**
 * The quartiles of a list of length 4k + 3, at whole positions k + 1, 2k + 2
 * and 3k + 3. No other length is ever drawn.
 */
export function quartiles(values: readonly number[]) {
  const s = ordered(values);
  const k = (s.length - 3) / 4;
  if (!Number.isInteger(k)) throw new Error(`quartiles: ${s.length} is not 4k + 3`);
  return { s, k, q1: s[k], q2: s[2 * k + 1], q3: s[3 * k + 2] };
}

function sampleQuartiles(rng: Rng, lengths: number[], sorted: boolean): QuartileParams {
  for (;;) {
    const n = rng.pick(lengths);
    const raw = ints(rng, n, 1, 60);
    const { s, k, q1, q2, q3 } = quartiles(raw);
    if (!(q1 < q2 && q2 < q3)) continue;
    // Jumbled means jumbled: the quartile positions of the list as written
    // must not already hold the quartiles.
    if (!sorted && (raw[k] === q1 || raw[3 * k + 2] === q3)) continue;
    return { values: sorted ? s : raw, sorted };
  }
}

const quartilePrompt = ({ values, sorted }: QuartileParams, ask: string): Block[] => [
  say(
    sorted
      ? `These ${values.length} values are in order: ${listProse(values)}. ${ask}`
      : `Here are ${values.length} values: ${listProse(values)}. Put them in order first. ${ask}`,
  ),
];

function quartileSolution(params: QuartileParams): SolutionStep[] {
  const { s, k, q1, q2, q3 } = quartiles(params.values);
  const n = s.length;
  const steps: SolutionStep[] = [];
  if (!params.sorted) steps.push({ text: `In order: ${listProse(s)}.` });
  steps.push(
    { text: `There are $${n}$ values, so $\\frac{n + 1}{4} = ${(n + 1) / 4}$: the quartiles sit at positions $${k + 1}$, $${2 * k + 2}$ and $${3 * k + 3}$.` },
    { tex: aligned(`Q_1 &= ${q1}`, `Q_2 &= ${q2}`, `Q_3 &= ${q3}`) },
    { tex: `\\text{IQR} = ${q3} - ${q1} = ${q3 - q1}` },
  );
  return steps;
}

/** Where each quartile sits in the ordered list, and what it is. */
const quartileTable: Generator<QuartileParams> = {
  id: 'dat-quartile-table',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleQuartiles(rng, [11, 15], false) : sampleQuartiles(rng, [7, 11], true)),
  render: (params): Slide => {
    const { s, k, q1, q2, q3 } = quartiles(params.values);
    const n = s.length;
    const answer = [k + 1, q1, 2 * k + 2, q2, 3 * k + 3, q3];
    const slips = [k, 2 * k + 1, 3 * k + 2, s[k + 1], s[3 * k + 3], params.values[k], n / 2, 3 * k + 4];
    return {
      kind: 'table',
      prompt: quartilePrompt(params, 'Fill in where each quartile sits and its value.'),
      columns: ['\\text{Quartile}', '\\text{Position}', '\\text{Value}'],
      rows: [
        ['Q_1', null, null],
        ['Q_2', null, null],
        ['Q_3', null, null],
      ],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: quartileSolution,
};

/** Both quartiles into the interquartile range. */
const quartilesTree: Generator<QuartileParams> = {
  id: 'dat-quartiles-tree',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleQuartiles(rng, [11, 15], true) : sampleQuartiles(rng, [7, 11], true)),
  render: (params): Slide => {
    const { s, k, q1, q2, q3 } = quartiles(params.values);
    const n = s.length;
    const answer = [q1, q3, q3 - q1];
    const slips = [q2, s[k + 1], s[3 * k + 1], s[n - 1] - s[0], q3 + q1, s[0], s[n - 1]];
    return {
      kind: 'tree',
      prompt: quartilePrompt(params, 'Top row: the lower quartile, then the upper quartile. Underneath, the interquartile range.'),
      expression: '\\text{IQR} = Q_3 - Q_1',
      nodes: [
        { id: 'q1', from: [] },
        { id: 'q3', from: [] },
        { id: 'iqr', from: ['q1', 'q3'] },
      ],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: quartileSolution,
};

/** The interquartile range, typed: from an ordered list at difficulty 1, a jumbled one at 2. */
const iqr: Generator<QuartileParams> = {
  id: 'dat-iqr',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleQuartiles(rng, [11, 15], false) : sampleQuartiles(rng, [7, 11], true)),
  render: (params): Slide => {
    const { q1, q3 } = quartiles(params.values);
    return {
      kind: 'expression',
      prompt: quartilePrompt(params, 'Find the interquartile range.'),
      lead: '\\text{IQR} =',
      keypad: NUMBER_KEYS,
      answer: fmt(q3 - q1),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: quartileSolution,
};

interface QuartileChoiceParams {
  n: number;
  which: 1 | 2 | 3;
  /** At difficulty 2 the question is about a value, from this ordered list. */
  values: number[];
}

const QUARTILE_NAMES = { 1: 'lower quartile', 2: 'median', 3: 'upper quartile' } as const;

/**
 * Which position holds a quartile of n ordered values at difficulty 1, and
 * which value is the quartile of a given ordered list at 2.
 */
const quartileChoice: Generator<QuartileChoiceParams> = {
  id: 'dat-quartile-choice',
  sample: (rng, difficulty) => {
    const which = rng.pick<1 | 2 | 3>(difficulty > 1 ? [1, 3] : [1, 2, 3]);
    if (difficulty > 1) {
      const { values } = sampleQuartiles(rng, [11, 15], true);
      return { n: values.length, which, values };
    }
    return { n: 4 * rng.int(1, 24) + 3, which, values: [] };
  },
  render: ({ n, which, values }): Slide => {
    const k = (n - 3) / 4;
    const name = QUARTILE_NAMES[which];
    if (values.length === 0) {
      const at = which * (k + 1);
      const wrong = [which * k, which * (k + 1) + 1, n - at, (n + 1) / 2, (n + 1) / 4];
      return choiceSlide(
        [say(`A list of $${n}$ values is in order. Which position holds the ${name}?`)],
        valueChoices(at, wrong, mix(n, which)),
        `${n}|${which}`,
      );
    }
    const { s, q1, q2, q3 } = quartiles(values);
    const right = which === 1 ? q1 : q3;
    const pos = which * (k + 1) - 1;
    const wrong = [which === 1 ? q3 : q1, q2, s[pos - 1], s[pos + 1], pos + 1];
    return choiceSlide(
      [say(`These ${n} values are in order: ${listProse(values)}. Which is the ${name}?`)],
      valueChoices(right, wrong, mix(...values)),
      values.join(','),
    );
  },
  solution: ({ n, which, values }) => {
    const k = (n - 3) / 4;
    const steps: SolutionStep[] = [
      { text: `With $n = ${n}$, $\\frac{n + 1}{4} = ${k + 1}$, so the quartiles are at positions $${k + 1}$, $${2 * k + 2}$ and $${3 * k + 3}$.` },
      { text: `The ${QUARTILE_NAMES[which]} is at position $${which * (k + 1)}$.` },
    ];
    if (values.length > 0) steps.push({ text: `Counting along the ordered list, that value is $${ordered(values)[which * (k + 1) - 1]}$.` });
    return steps;
  },
};

/* ================================================================
 * Level 2, lesson 3: outliers by 1.5 times the IQR
 * ================================================================ */

interface FenceParams {
  q1: number;
  q3: number;
  side: 'upper' | 'lower';
}

const fences = ({ q1, q3 }: { q1: number; q3: number }) => ({
  lower: q1 - 1.5 * (q3 - q1),
  upper: q3 + 1.5 * (q3 - q1),
});

/** Quartiles with an even IQR at difficulty 1, so the fence is whole; any IQR at 2. */
function sampleFence(rng: Rng, difficulty: number, side: FenceParams['side'] | 'either'): FenceParams {
  const hard = difficulty > 1;
  const q1 = rng.int(5, 40);
  const spread = hard ? rng.int(3, 21) : 2 * rng.int(1, 10);
  return { q1, q3: q1 + spread, side: side === 'either' ? rng.pick<FenceParams['side']>(['upper', 'lower']) : side };
}

function fenceSolution({ q1, q3, side }: FenceParams): SolutionStep[] {
  const spread = q3 - q1;
  const f = fences({ q1, q3 });
  return [
    { tex: `\\text{IQR} = ${q3} - ${q1} = ${spread}` },
    { tex: `1.5 \\times ${spread} = ${fmt(1.5 * spread)}` },
    {
      tex:
        side === 'upper'
          ? `${q3} + ${fmt(1.5 * spread)} = ${fmt(f.upper)}`
          : `${q1} - ${fmt(1.5 * spread)} = ${fmt(f.lower)}`,
    },
    { text: `Anything ${side === 'upper' ? 'above' : 'below'} $${fmt(side === 'upper' ? f.upper : f.lower)}$ is an outlier.` },
  ];
}

/** A fence worked one operation at a time: the IQR, one and a half of it, then out from the quartile. */
const fenceSteps: Generator<FenceParams> = {
  id: 'dat-fence-steps',
  sample: (rng, difficulty) => sampleFence(rng, difficulty, difficulty > 1 ? 'either' : 'upper'),
  render: (params): Slide => {
    const { q1, q3, side } = params;
    const spread = q3 - q1;
    const part = 1.5 * spread;
    const f = fences(params);
    const fence = side === 'upper' ? f.upper : f.lower;
    const miss = side === 'upper' ? q1 + part : q3 - part;
    return {
      kind: 'steps',
      prompt: [
        say(
          `The quartiles are $Q_1 = ${q1}$ and $Q_3 = ${q3}$. Work out the ${side} fence: tap the part you would do next, then choose what it comes to.`,
        ),
      ],
      start: side === 'upper' ? [`${q3}`, '+', '1.5', '\\times', '(', `${q3}`, '-', `${q1}`, ')'] : [`${q1}`, '-', '1.5', '\\times', '(', `${q3}`, '-', `${q1}`, ')'],
      reductions: [
        { span: [4, 9], operator: 6, value: fmt(spread), bank: stepBank(fmt(spread), fmt(q3 + q1), fmt(spread + 1), fmt(spread - 1)) },
        { span: [2, 5], operator: 3, value: fmt(part), bank: stepBank(fmt(part), fmt(spread + 1.5), fmt(2 * spread), fmt(part + 1)) },
        { span: [0, 3], operator: 1, value: fmt(fence), bank: stepBank(fmt(fence), fmt(miss), fmt(fence + 1), fmt(fence - 1)) },
      ],
    };
  },
  solution: fenceSolution,
};

/** A fence as tiles: the quartile, the IQR and the result, from the formula in the prompt. */
const fenceTiles: Generator<FenceParams> = {
  id: 'dat-fence-tiles',
  sample: (rng, difficulty) => sampleFence(rng, difficulty, difficulty > 1 ? 'either' : 'lower'),
  render: (params): Slide => {
    const { q1, q3, side } = params;
    const spread = q3 - q1;
    const f = fences(params);
    const upper = side === 'upper';
    const fence = upper ? f.upper : f.lower;
    return {
      kind: 'tiles',
      prompt: [
        say(`The quartiles are $Q_1 = ${q1}$ and $Q_3 = ${q3}$. Fill in the working for the ${side} fence:`),
        show(upper ? 'Q_3 + 1.5 \\times \\text{IQR}' : 'Q_1 - 1.5 \\times \\text{IQR}'),
      ],
      template: upper ? '{0} + 1.5 \\times {1} = {2}' : '{0} - 1.5 \\times {1} = {2}',
      bank: valueBank(
        [upper ? q3 : q1, spread, fence],
        [upper ? q1 : q3, 1.5 * spread, upper ? f.lower : f.upper, q1 + q3, fence + spread],
      ),
      answer: [fmt(upper ? q3 : q1), fmt(spread), fmt(fence)],
    };
  },
  solution: fenceSolution,
};

interface OutlierCountParams {
  values: number[];
  sorted: boolean;
}

/**
 * A list of 11 or 15 values with up to two strays, drawn so no value sits
 * within one of a fence: whether it is an outlier is never a coin toss.
 */
function sampleOutliers(rng: Rng, lengths: number[], sorted: boolean): OutlierCountParams {
  for (;;) {
    const n = rng.pick(lengths);
    const strays = rng.int(0, 2);
    const lo = rng.int(10, 40);
    const body = ints(rng, n - strays, lo, lo + rng.int(10, 25));
    const out = Array.from({ length: strays }, () => (rng.chance(0.6) ? lo + rng.int(45, 80) : lo - rng.int(25, 9 + lo)));
    const raw = rng.shuffle([...body, ...out]);
    const { q1, q2, q3 } = quartiles(raw);
    if (!(q1 < q2 && q2 < q3)) continue;
    const f = fences({ q1, q3 });
    if (raw.some((x) => Math.abs(x - f.lower) < 1 || Math.abs(x - f.upper) < 1)) continue;
    return { values: sorted ? ordered(raw) : raw, sorted };
  }
}

const outliersIn = (values: readonly number[]): number[] => {
  const { q1, q3 } = quartiles(values);
  const f = fences({ q1, q3 });
  return values.filter((x) => x < f.lower || x > f.upper);
};

/** How many outliers a list holds: quartiles given at difficulty 1, found from a jumbled list at 2. */
const outlierCount: Generator<OutlierCountParams> = {
  id: 'dat-outlier-count',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleOutliers(rng, [11, 15], false) : sampleOutliers(rng, [11], true)),
  render: (params): Slide => {
    const { q1, q3 } = quartiles(params.values);
    const n = params.values.length;
    const lead = params.sorted
      ? `These ${n} values are in order: ${listProse(params.values)}. $Q_1 = ${q1}$ and $Q_3 = ${q3}$.`
      : `Here are ${n} values: ${listProse(params.values)}.`;
    return {
      kind: 'expression',
      prompt: [say(`${lead} How many of them are outliers by the $1.5 \\times \\text{IQR}$ rule?`)],
      lead: '\\text{outliers} =',
      keypad: NUMBER_KEYS,
      answer: fmt(outliersIn(params.values).length),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { s, q1, q3 } = quartiles(params.values);
    const f = fences({ q1, q3 });
    const found = outliersIn(params.values);
    const steps: SolutionStep[] = [];
    if (!params.sorted) steps.push({ text: `In order: ${listProse(s)}, so $Q_1 = ${q1}$ and $Q_3 = ${q3}$.` });
    steps.push(
      { text: `The IQR is $${q3 - q1}$, and $1.5 \\times ${q3 - q1} = ${fmt(1.5 * (q3 - q1))}$.` },
      { text: `The fences are $${q1} - ${fmt(1.5 * (q3 - q1))} = ${fmt(f.lower)}$ and $${q3} + ${fmt(1.5 * (q3 - q1))} = ${fmt(f.upper)}$.` },
      {
        text:
          found.length === 0
            ? 'Every value sits between the fences: no outliers.'
            : `Outside them: ${listProse(ordered(found))}. That is ${found.length} outlier${found.length === 1 ? '' : 's'}.`,
      },
    );
    return steps;
  },
};

interface OutlierFlowParams {
  q1: number;
  q3: number;
  v: number;
}

/**
 * Is one value an outlier? Above the upper fence, below the lower one, or
 * between. Clear-cut at difficulty 1; within three of a fence, with fences on
 * the half, at 2.
 */
const outlierFlow: Generator<OutlierFlowParams> = {
  id: 'dat-outlier-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const { q1, q3 } = sampleFence(rng, difficulty, 'upper');
      const f = fences({ q1, q3 });
      const where = rng.pick(['above', 'below', 'inside'] as const);
      const v =
        where === 'above'
          ? Math.ceil(f.upper) + rng.int(hard ? 0 : 2, hard ? 2 : 15)
          : where === 'below'
            ? Math.floor(f.lower) - rng.int(hard ? 0 : 2, hard ? 2 : 15)
            : hard
              ? rng.pick([Math.floor(f.upper) - rng.int(0, 2), Math.ceil(f.lower) + rng.int(0, 2)])
              : rng.int(Math.ceil(f.lower) + 1, Math.floor(f.upper) - 1);
      if (v === f.upper || v === f.lower) continue;
      return { q1, q3, v };
    }
  },
  render: ({ q1, q3, v }): Slide => {
    const key = `${q1}|${q3}|${v}`;
    const f = fences({ q1, q3 });
    return {
      kind: 'flow',
      prompt: [say(`The quartiles of some data are $Q_1 = ${q1}$ and $Q_3 = ${q3}$. Is the value $${v}$ an outlier?`)],
      subject: `x = ${v}`,
      steps: [
        {
          id: 'high',
          ask: `Is $${v}$ above the upper fence, $Q_3 + 1.5 \\times \\text{IQR}$?`,
          branches: rotated(
            [
              { label: 'Yes', outcome: 'An outlier: it is more than 1.5 IQR above the upper quartile.' },
              { label: 'No', to: 'low' },
            ],
            `${key}h`,
          ),
        },
        {
          id: 'low',
          ask: `Is $${v}$ below the lower fence, $Q_1 - 1.5 \\times \\text{IQR}$?`,
          branches: rotated(
            [
              { label: 'Yes', outcome: 'An outlier: it is more than 1.5 IQR below the lower quartile.' },
              { label: 'No', outcome: 'Not an outlier: it sits between the two fences.' },
            ],
            `${key}l`,
          ),
        },
      ],
      answer: v > f.upper ? ['Yes'] : v < f.lower ? ['No', 'Yes'] : ['No', 'No'],
    };
  },
  solution: ({ q1, q3, v }) => {
    const f = fences({ q1, q3 });
    return [
      { text: `$\\text{IQR} = ${q3} - ${q1} = ${q3 - q1}$, and $1.5 \\times ${q3 - q1} = ${fmt(1.5 * (q3 - q1))}$.` },
      { text: `The fences are $${fmt(f.lower)}$ and $${fmt(f.upper)}$.` },
      {
        text:
          v > f.upper
            ? `$${v}$ is above $${fmt(f.upper)}$: an outlier.`
            : v < f.lower
              ? `$${v}$ is below $${fmt(f.lower)}$: an outlier.`
              : `$${v}$ is between them: not an outlier.`,
      },
    ];
  },
};

/* ================================================================
 * Level 2, lessons 4 and 5: variance and standard deviation
 * ================================================================ */

interface VarParams {
  values: number[];
}

/** The summary statistics of a list, all exact. */
export function summary(values: readonly number[]) {
  const n = values.length;
  const sx = total(values);
  const sx2 = total(values.map((x) => x * x));
  const m = sx / n;
  const a = sx2 / n;
  return { n, sx, sx2, m, a, m2: m * m, variance: a - m * m };
}

/**
 * A list whose mean and variance are whole, with a variance that is a perfect
 * square where the root will be asked.
 */
function sampleVar(rng: Rng, n: number, lo: number, hi: number, square: boolean): VarParams {
  for (;;) {
    const values = ints(rng, n, lo, hi);
    const { m, variance } = summary(values);
    if (!whole(m) || !whole(variance) || variance <= 0) continue;
    if (square && !whole(Math.sqrt(variance))) continue;
    return { values };
  }
}

const summaryProse = (values: readonly number[]): string => {
  const { n, sx, sx2 } = summary(values);
  return `For ${n} values, $\\sum x = ${sx}$ and $\\sum x^2 = ${sx2}$.`;
};

function varianceSolution({ values }: VarParams, root = false): SolutionStep[] {
  const { n, sx, sx2, m, a, variance } = summary(values);
  const steps: SolutionStep[] = [
    { tex: `\\bar{x} = \\frac{${sx}}{${n}} = ${fmt(m)}` },
    { tex: `\\frac{\\sum x^2}{n} = \\frac{${sx2}}{${n}} = ${fmt(a)}` },
    { tex: aligned(`\\sigma^2 &= ${fmt(a)} - ${fmt(m)}^2`, `&= ${fmt(a)} - ${fmt(m * m)} = ${fmt(variance)}`) },
  ];
  if (root) steps.push({ tex: `\\sigma = \\sqrt{${fmt(variance)}} = ${fmt(Math.sqrt(variance))}` });
  return steps;
}

/** The `x^2` column, and its total, for a short list. A negative value arrives at difficulty 2. */
const x2Table: Generator<VarParams> = {
  id: 'dat-x2-table',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      for (;;) {
        const values = ints(rng, 5, -6, 15);
        if (values.some((x) => x < 0) && new Set(values).size === 5) return { values };
      }
    }
    for (;;) {
      const values = ints(rng, 4, 1, 12);
      if (new Set(values).size === 4) return { values };
    }
  },
  render: ({ values }): Slide => {
    const squares = values.map((x) => x * x);
    const { sx, sx2 } = summary(values);
    const answer = [...squares, sx2];
    const slips = [...values.map((x) => 2 * x), ...values.filter((x) => x < 0).map((x) => -x * x), sx * sx, sx2 + 1, sx2 - 1];
    return {
      kind: 'table',
      prompt: [say(`Fill in $x^2$ for each value, and $\\sum x^2$ at the bottom.`)],
      columns: ['x', 'x^2'],
      rows: [...values.map((x) => [fmt(x), null]), [`\\textstyle\\sum x = ${sx}`, null]],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: ({ values }) => [
    { text: 'Square each value. A negative squares to a positive:' },
    { tex: aligned(...values.map((x) => `${x < 0 ? `(${x})` : x}^2 &= ${x * x}`)) },
    { text: `Adding the column: $\\sum x^2 = ${summary(values).sx2}$. That is not $(\\sum x)^2 = ${summary(values).sx ** 2}$.` },
  ],
};

/** The variance as a tree: the mean and the mean of the squares, the mean squared, the difference. */
const varTree: Generator<VarParams> = {
  id: 'dat-var-tree',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleVar(rng, rng.int(6, 8), 1, 20, false) : sampleVar(rng, rng.int(4, 5), 1, 12, false)),
  render: ({ values }): Slide => {
    const { n, sx, m, a, m2, variance } = summary(values);
    const answer = [m, a, m2, variance];
    const slips = [a - m, 2 * m, (sx * sx) / n, variance + 1, m2 + m, a + m2];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${summaryProse(values)} Find the variance. Top row, left to right: the mean $\\bar{x}$, then $\\frac{\\sum x^2}{n}$. Then $\\bar{x}^2$, then the variance.`,
        ),
      ],
      expression: '\\sigma^2 = \\frac{\\sum x^2}{n} - \\bar{x}^2',
      nodes: [
        { id: 'm', from: [] },
        { id: 'a', from: [] },
        { id: 'm2', from: ['m'] },
        { id: 'v', from: ['a', 'm2'] },
      ],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => varianceSolution(params),
};

/**
 * The variance formula worked one operation at a time: the mean of the
 * squares, the mean, the mean squared, the difference.
 */
const varFormulaSteps: Generator<VarParams> = {
  id: 'dat-var-formula-steps',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleVar(rng, rng.int(6, 8), 1, 20, false) : sampleVar(rng, rng.int(4, 5), 1, 12, false)),
  render: ({ values }): Slide => {
    const { n, sx, sx2, m, a, m2, variance } = summary(values);
    return {
      kind: 'steps',
      prompt: [say(`${summaryProse(values)} Find the variance: tap the part you would do next, then choose what it comes to.`)],
      start: [`${sx2}`, '\\div', `${n}`, '-', '(', `${sx}`, '\\div', `${n}`, ')^{2}'],
      reductions: [
        { span: [0, 3], operator: 1, value: fmt(a), bank: stepBank(fmt(a), ...tidy([a + 1, a - 1, sx2 - n]).map(fmt)) },
        { span: [3, 6], operator: 4, value: fmt(m), bank: stepBank(fmt(m), fmt(m + 1), fmt(m - 1), fmt(sx - n)) },
        { span: [2, 5], operator: 4, value: fmt(m2), bank: stepBank(fmt(m2), fmt(2 * m), fmt(m2 + 1), fmt(m)) },
        { span: [0, 3], operator: 1, value: fmt(variance), bank: stepBank(fmt(variance), fmt(a - m), fmt(variance + 1), fmt(a + m2)) },
      ],
    };
  },
  solution: (params) => varianceSolution(params),
};

/** The variance, typed: from the summary sums at difficulty 1, from a short list at 2. */
const varianceGen: Generator<VarParams & { list: boolean }> = {
  id: 'dat-variance',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { ...sampleVar(rng, rng.int(4, 5), 1, 15, false), list: true }
      : { ...sampleVar(rng, rng.int(4, 8), 1, 15, false), list: false },
  render: ({ values, list }): Slide => ({
    kind: 'expression',
    prompt: [say(list ? `Find the variance of ${listProse(values)}.` : `${summaryProse(values)} Find the variance.`)],
    lead: '\\sigma^2 =',
    keypad: NUMBER_KEYS,
    answer: fmt(summary(values).variance),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => varianceSolution(params),
};

/** The standard deviation, with a root key: from the sums at difficulty 1, from a list at 2. */
const sd: Generator<VarParams & { list: boolean }> = {
  id: 'dat-sd',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { ...sampleVar(rng, rng.int(4, 6), 1, 20, true), list: true }
      : { ...sampleVar(rng, rng.int(4, 8), 1, 15, true), list: false },
  render: ({ values, list }): Slide => ({
    kind: 'expression',
    prompt: [say(list ? `Find the standard deviation of ${listProse(values)}.` : `${summaryProse(values)} Find the standard deviation.`)],
    lead: '\\sigma =',
    keypad: ROOT_KEY,
    answer: fmt(Math.sqrt(summary(values).variance)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => varianceSolution(params, true),
};

/** Variance then its root, as tiles. */
const sdTiles: Generator<VarParams> = {
  id: 'dat-sd-tiles',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleVar(rng, rng.int(6, 8), 1, 20, true) : sampleVar(rng, rng.int(4, 5), 1, 12, true)),
  render: ({ values }): Slide => {
    const { m, a, m2, variance } = summary(values);
    const root = Math.sqrt(variance);
    return {
      kind: 'tiles',
      prompt: [say(`${summaryProse(values)} Fill in the working for the variance and the standard deviation.`)],
      template: '\\sigma^2 = {0} - {1} = {2}, \\quad \\sigma = {3}',
      bank: valueBank([a, m2, variance, root], [m, a - m, root + 1, variance / 2, 2 * m]),
      answer: [fmt(a), fmt(m2), fmt(variance), fmt(root)],
    };
  },
  solution: (params) => varianceSolution(params, true),
};

interface CompareParams {
  context: number;
  mA: number;
  sA: number;
  mB: number;
  sB: number;
  /** B's spread is given as a variance, to be rooted before comparing. */
  squared: boolean;
}

const COMPARE_CONTEXTS = [
  { names: ['Class A', 'Class B'] as [string, string], intro: 'Two classes sat the same test.', what: 'test marks', higher: true },
  { names: ['North', 'South'] as [string, string], intro: 'Two shops, North and South, recorded their sales each day for a month.', what: 'daily sales', higher: true },
  { names: ['Team A', 'Team B'] as [string, string], intro: 'Two teams recorded the points they scored in each match.', what: 'points scored', higher: true },
  { names: ['Runner A', 'Runner B'] as [string, string], intro: 'Two runners timed their laps of a track, in seconds.', what: 'lap times', higher: false },
  { names: ['Route 1', 'Route 2'] as [string, string], intro: 'A driver timed two routes to work over some weeks, in minutes.', what: 'journey times', higher: false },
  { names: ['Line A', 'Line B'] as [string, string], intro: 'Two production lines counted the faulty parts they made each day.', what: 'faulty parts', higher: false },
];

/**
 * Two groups with a mean and a spread each. At difficulty 2 the means are
 * close and B's spread is given as a variance that would compare the wrong
 * way if it were read as a standard deviation.
 */
function sampleCompare(rng: Rng, difficulty: number): CompareParams {
  const squared = difficulty > 1;
  for (;;) {
    const mA = rng.int(20, 80);
    const mB = mA + (squared ? rng.int(1, 3) : rng.int(3, 12)) * rng.sign();
    const sA = rng.int(2, 12);
    const sB = rng.int(2, 12);
    if (sA === sB || mB <= 0) continue;
    if (squared && Math.sign(sB * sB - sA) === Math.sign(sB - sA)) continue;
    return { context: rng.int(0, COMPARE_CONTEXTS.length - 1), mA, sA, mB, sB, squared };
  }
}

function compareTableTex({ context, mA, sA, mB, sB, squared }: CompareParams): string {
  const [a, b] = COMPARE_CONTEXTS[context].names;
  const head = squared ? '\\text{Spread}' : '\\text{SD}';
  const spreadA = squared ? `\\sigma = ${sA}` : `${sA}`;
  const spreadB = squared ? `\\sigma^2 = ${sB * sB}` : `${sB}`;
  return `\\begin{array}{l|c|c} & \\bar{x} & ${head} \\\\ \\hline \\text{${a}} & ${mA} & ${spreadA} \\\\ \\text{${b}} & ${mB} & ${spreadB} \\end{array}`;
}

function compareSolution(params: CompareParams): SolutionStep[] {
  const { context, mA, sA, mB, sB, squared } = params;
  const [a, b] = COMPARE_CONTEXTS[context].names;
  const steps: SolutionStep[] = [];
  if (squared) steps.push({ text: `${b}'s spread is a variance: its standard deviation is $\\sqrt{${sB * sB}} = ${sB}$.` });
  steps.push(
    { text: `${mA > mB ? a : b} has the higher mean, $${Math.max(mA, mB)}$ against $${Math.min(mA, mB)}$.` },
    { text: `${sA < sB ? a : b} has the smaller standard deviation, $${Math.min(sA, sB)}$ against $${Math.max(sA, sB)}$, so its values are more consistent.` },
  );
  return steps;
}

/** Which statement about two groups is right, from their means and spreads. */
const compareChoice: Generator<CompareParams> = {
  id: 'dat-compare-choice',
  sample: sampleCompare,
  render: (params): Slide => {
    const [a, b] = COMPARE_CONTEXTS[params.context].names;
    const higher = params.mA > params.mB ? a : b;
    const steadier = params.sA < params.sB ? a : b;
    const opts = [a, b].flatMap((x) =>
      [a, b].map((y) => ({
        tex: `${x} has the higher mean, and ${y} is more consistent.`,
        correct: x === higher && y === steadier ? true : undefined,
      })),
    );
    return choiceSlide(
      [say(COMPARE_CONTEXTS[params.context].intro), show(compareTableTex(params)), say('Which statement is correct?')],
      opts,
      `${params.mA}|${params.sA}|${params.mB}|${params.sB}`,
      false,
    );
  },
  solution: compareSolution,
};

/**
 * The same comparison as a walk: first whether a higher value is better in
 * this context, since for lap times the lower mean wins, then which group
 * did better on average, then which was more consistent.
 */
const compareFlow: Generator<CompareParams> = {
  id: 'dat-compare-flow',
  sample: sampleCompare,
  render: (params): Slide => {
    const ctx = COMPARE_CONTEXTS[params.context];
    const [a, b] = ctx.names;
    const key = `${params.mA}|${params.sA}|${params.mB}|${params.sB}|${params.context}`;
    const better = ctx.higher === params.mA > params.mB ? a : b;
    const steadier = params.sA < params.sB ? a : b;
    const verdict = (best: string) =>
      [a, b].map((y) => ({
        label: y,
        outcome: best === y ? `${best} did better on average and was more consistent.` : `${best} did better on average, but ${y} was more consistent.`,
      }));
    const pick = (ask: string, id: string): Extract<Slide, { kind: 'flow' }>['steps'][number] => ({
      id,
      ask,
      branches: [
        { label: a, to: 'ca' },
        { label: b, to: 'cb' },
      ],
    });
    return {
      kind: 'flow',
      prompt: [say(`${ctx.intro} Compare the two.`)],
      subject: compareTableTex(params),
      steps: [
        {
          id: 'better',
          ask: `Is a higher value better for ${ctx.what}?`,
          branches: rotated(
            [
              { label: 'Yes', to: 'hi' },
              { label: 'No', to: 'lo' },
            ],
            `${key}b`,
          ),
        },
        pick('Which has the higher mean?', 'hi'),
        pick('Which has the lower mean?', 'lo'),
        { id: 'ca', ask: 'Which has the smaller standard deviation?', branches: verdict(a) },
        { id: 'cb', ask: 'Which has the smaller standard deviation?', branches: verdict(b) },
      ],
      answer: [ctx.higher ? 'Yes' : 'No', better, steadier],
    };
  },
  solution: (params) => {
    const ctx = COMPARE_CONTEXTS[params.context];
    return [
      { text: ctx.higher ? `For ${ctx.what}, higher is better.` : `For ${ctx.what}, lower is better.` },
      ...compareSolution(params),
    ];
  },
};

export const dataAveragesSpreadGenerators = [
  mean,
  medianMode,
  sumTree,
  whichAverage,
  missingValue,
  totalTiles,
  combinedTree,
  addValueSteps,
  fxTable,
  freqMeanGen,
  freqFormulaTiles,
  freqChoice,
  midpointTable,
  groupedMeanGen,
  groupedSteps,
  modalClass,
  correlationChoice,
  scatterSlider,
  lineEstimate,
  reliableFlow,
  range,
  rangeTiles,
  removeChoice,
  rangeFlow,
  quartileTable,
  quartilesTree,
  iqr,
  quartileChoice,
  fenceSteps,
  fenceTiles,
  outlierCount,
  outlierFlow,
  x2Table,
  varTree,
  varFormulaSteps,
  varianceGen,
  sd,
  sdTiles,
  compareChoice,
  compareFlow,
];
