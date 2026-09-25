/**
 * Data, Averages and Spread (roadmap C17).
 *
 * Level 1 is averages: the mean, median and mode of a list and which one a
 * question wants, a missing value from a known mean and two groups combined,
 * frequency tables with an `fx` column, grouped data by midpoints, and
 * reading a scatter diagram. Level 2 is spread: the range and what an extreme
 * value does to it, quartiles and the interquartile range, outliers by the
 * 1.5 times IQR rule, variance from `\sum x^2 / n - \bar{x}^2`, and the
 * standard deviation, with two sets compared by mean and spread. Level 3 is
 * representing data: stem-and-leaf diagrams, box plots (one read on its own,
 * then two compared on one scale), and histograms of unequal classes by
 * frequency density, read back as areas. Level 4 is cumulative frequency:
 * running totals down a grouped table, the curve through the upper
 * boundaries (drawn by `cumulativeSvg`), readings off it, the median and
 * quartiles at n/4, n/2 and 3n/4, percentiles at pn/100, and the same
 * readings by interpolating inside a class. Level 5 is coding data: what
 * x -> bx + c does to each average and spread (`movedStat`), coding with
 * y = (x - a)/b and decoding back, the mean and variance of x from coded
 * sums (`sampleSums` draws the coded mean and variance first, so every sum
 * and answer is exact), and coding in context.
 *
 * Level 3 draws its own pictures: `boxPlotSvg` and `histogramSvg` below, since
 * `plotSvg` has curves and marks but no boxes or bars. No tappable box or
 * histogram widget exists yet, so values are read off them through sliders,
 * choices, tiles, tables, steps and trees.
 *
 * Three rules hold everywhere in this file.
 *
 * - Every answer is exact. Lists are drawn so their statistics are whole or
 *   land on a short decimal, and a draw that would not is refused at sampling
 *   rather than rounded. Numbers are written through `fmt`, one way only, so
 *   a bank never offers two tiles that look alike.
 * - Quartiles of a list only ever come from lists of length `4k + 3` (7, 11,
 *   15), where they sit at whole positions `k + 1`, `2k + 2` and `3k + 3`.
 *   That is the one list rule the course teaches, so no other length is ever
 *   drawn. Level 4 reads quartiles off a curve instead, at n/4, n/2 and 3n/4,
 *   and every reading there is drawn to land a whole number of tenths through
 *   its class, so it is exact.
 * - Nothing here is calculus, so no slide declares `source`, `integrand` or
 *   `limits`, and the generic oracle skips every generator here.
 *   `dataAveragesSpread.test.ts` recomputes every statistic from the drawn
 *   data by plain arithmetic instead; for level 4 it reads each curve back off
 *   its own picture and works every reading from the curve's corners.
 *
 * The checker compares values (PITFALLS 3.4), so a formula with the values
 * dropped in is `tiles`; a typed `expression` is only ever a number.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { hashSeed, type Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { fmt } from './numericalMethods';
import { defaultSliderValue } from '../../ui/sliderValue';
import { mix, steered, stepBank } from './parametricImplicit';
import { nth, say } from './format';

/* ================================================================
 * Shared helpers
 * ================================================================ */

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
      steps.push({ text: `With ${n} values the middle one is the ${nth((n + 1) / 2)}, which is $${s[(n - 1) / 2]}$.` });
    } else {
      steps.push(
        { text: `With ${n} values there are two in the middle, the ${nth(n / 2)} and the ${nth(n / 2 + 1)}: $${s[n / 2 - 1]}$ and $${s[n / 2]}$.` },
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
          `The mean of ${n} values is $${fmt(m)}$. The values are ${listProse(params.known)} and $x$. Fill in the working.`,
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
          `There are ${nA} in ${a}, with a mean of $${fmt(mA)}$, and ${nB} in ${b}, with a mean of $${fmt(mB)}$. Top row: the totals for ${a} and ${b}, then how many altogether. Then the combined total, then the combined mean.`,
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
      { text: `There are $${n}$ values, so the median is the ${nth(p)}.` },
      { text: `Counting through the frequencies: ${counts.map((c, i) => `up to $${params.xs[i]}$ makes $${c}$`).join(', ')}.` },
      { text: `The ${nth(p)} value is $${freqMedian(params)}$.` },
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
      { text: `There are $${n}$ values, so the median is the ${nth(p)}.` },
      { text: `Running totals of the frequencies: ${counts.map((c) => `$${c}$`).join(', ')}.` },
      { text: `The ${nth(p)} value falls in $${classTex(params.bounds[i], params.bounds[i + 1])}$.` },
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
/** a + bx as written by hand: no 0 in front, and x rather than 1x. */
function lineTex(a: number, b: number): string {
  const slope = `${Math.abs(b) === 1 ? '' : fmt(Math.abs(b))}x`;
  if (a === 0) return b < 0 ? `-${slope}` : slope;
  return `${fmt(a)} ${b < 0 ? '-' : '+'} ${slope}`;
}

/** The same line with x put in, before it is worked out. */
function lineAtTex(a: number, b: number, x: number): string {
  const times = `${fmt(Math.abs(b))} \\times ${fmt(x)}`;
  if (a === 0) return b < 0 ? `-${times}` : times;
  return `${fmt(a)} ${b < 0 ? '-' : '+'} ${times}`;
}

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
    { tex: `y = ${lineAtTex(a, b, x)} = ${fmt(a + b * x)}` },
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

/* ================================================================
 * Level 3, lesson 1: stem-and-leaf diagrams
 * ================================================================ */

/**
 * What a stem and a leaf stand for. `tens` reads `4 | 7` as 47, `tenths` as
 * 4.7, and `hundreds` has two-digit stems, so `12 | 5` is 125.
 */
type StemKey = 'tens' | 'tenths' | 'hundreds';

/** A value held as its stem and leaf run together: 47 is stem 4, leaf 7. */
const stemValue = (code: number, key: StemKey): number => (key === 'tenths' ? code / 10 : code);

/** Things the values can be. Prose only: units never reach a template. */
const STEM_CONTEXTS: Record<StemKey, string[]> = {
  tens: [
    'Marks in a test out of 100',
    'Ages of the people on a coach trip',
    'Pulse rates of some runners',
    'Minutes some pupils spent on homework',
    'Scores in a quiz',
  ],
  tenths: [
    'Lengths of some worms, in centimetres',
    'Masses of some parcels, in kilograms',
    'Rainfall each day, in millimetres',
    'Heights of some seedlings, in centimetres',
    'Times to solve a puzzle, in minutes',
  ],
  hundreds: [
    'Masses of some apples, in grams',
    'Numbers of visitors to a museum each day',
    'Heights of some trees, in centimetres',
    'Points scored in a computer game',
    'Numbers of steps up some towers',
  ],
};

interface StemParams {
  /** Stem and leaf as one whole number each, in the order the list gives them. */
  codes: number[];
  key: StemKey;
  /** The key's own example, a stem of the diagram with a leaf of its choosing. */
  keyCode: number;
  context: number;
}

interface StemRow {
  stem: number;
  leaves: number[];
}

/** One row per stem from the smallest to the largest, leaves in order. */
function stemRows(codes: readonly number[]): StemRow[] {
  const s = ordered(codes);
  const first = Math.floor(s[0] / 10);
  const last = Math.floor(s[s.length - 1] / 10);
  return Array.from({ length: last - first + 1 }, (_, i) => ({
    stem: first + i,
    leaves: s.filter((c) => Math.floor(c / 10) === first + i).map((c) => c % 10),
  }));
}

/** A row's leaves as the diagram writes them, spaced apart. */
const leavesTex = (leaves: readonly number[]): string => leaves.join('\\;');

function stemTex(codes: readonly number[]): string {
  const rows = stemRows(codes).map((r) => `${r.stem} & ${leavesTex(r.leaves)}`);
  return `\\begin{array}{r|l} ${rows.join(' \\\\ ')} \\end{array}`;
}

const stemKeyProse = ({ keyCode, key }: StemParams): string =>
  `Key: $${Math.floor(keyCode / 10)} \\mid ${keyCode % 10}$ means $${fmt(stemValue(keyCode, key))}$.`;

const stemList = ({ codes, key }: StemParams): number[] => codes.map((c) => stemValue(c, key));

/**
 * `n` values over exactly `m` consecutive stems, none empty and none with more
 * than six leaves, so a row fits a phone. Tenths never have a leaf of 0, which
 * `fmt` would print as a whole number and hide the leaf.
 */
function sampleStem(rng: Rng, n: number, m: number, key: StemKey, sorted: boolean, accept: (p: StemParams) => boolean = () => true): StemParams {
  const [lo, hi] = key === 'hundreds' ? [10, 39] : [1, 9];
  for (;;) {
    const first = rng.int(lo, hi - m + 1);
    const raw = Array.from({ length: n }, () => (first + rng.int(0, m - 1)) * 10 + rng.int(key === 'tenths' ? 1 : 0, 9));
    const rows = stemRows(raw);
    if (rows.length !== m || rows.some((r) => r.leaves.length === 0 || r.leaves.length > 6)) continue;
    const keyCode = rows[rng.int(0, m - 1)].stem * 10 + rng.int(key === 'tenths' ? 1 : 0, 9);
    const params = { codes: sorted ? ordered(raw) : raw, key, keyCode, context: rng.int(0, STEM_CONTEXTS[key].length - 1) };
    if (accept(params)) return params;
  }
}

const stemPrompt = (p: StemParams, ask: string): Block[] => [
  say(`${STEM_CONTEXTS[p.key][p.context]}, in a stem-and-leaf diagram.`),
  show(stemTex(p.codes)),
  say(`${stemKeyProse(p)} ${ask}`),
];

/** The diagram read back into its values, row by row. */
function stemReadSolution(p: StemParams): SolutionStep[] {
  const rows = stemRows(p.codes);
  return [
    { text: `${stemKeyProse(p)} Each leaf is one value, so a leaf written twice is two values.` },
    // Prose rather than a display, so a row of six three-digit values wraps on a phone.
    { text: `Row by row, the values are ${listProse(rows.flatMap((r) => r.leaves.map((l) => stemValue(r.stem * 10 + l, p.key))))}.` },
  ];
}

interface StemDrawParams extends StemParams {
  sorted: boolean;
}

/**
 * Draw the diagram from a list: the leaves of each stem filled in, smallest
 * first. The list comes in order at difficulty 1; at 2 it is jumbled, over
 * four stems, with a key in tenths or with two-digit stems.
 */
const stemLeaves: Generator<StemDrawParams> = {
  id: 'dat-stem-leaves',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const key: StemKey = hard ? rng.pick<StemKey>(['tenths', 'hundreds']) : 'tens';
    // Some row repeats a leaf, so writing each leaf once is a wrong answer.
    const params = sampleStem(rng, hard ? rng.int(11, 13) : rng.int(8, 10), hard ? 4 : 3, key, !hard, (p) =>
      stemRows(p.codes).some((r) => new Set(r.leaves).size < r.leaves.length && r.leaves.length > 2),
    );
    return { ...params, sorted: !hard };
  },
  render: (params): Slide => {
    const rows = stemRows(params.codes);
    const answer = rows.map((r) => leavesTex(r.leaves));
    const slips: string[] = [];
    for (const r of rows) {
      const given = params.codes.filter((c) => Math.floor(c / 10) === r.stem).map((c) => c % 10);
      slips.push(leavesTex(given));
      slips.push(leavesTex([...new Set(r.leaves)]));
      slips.push(leavesTex([...r.leaves].reverse()));
      slips.push(r.leaves.map((l) => fmt(stemValue(r.stem * 10 + l, params.key))).join('\\;'));
    }
    const extras: string[] = [];
    for (const slip of slips) {
      if (extras.length < 3 && !answer.includes(slip) && !extras.includes(slip)) extras.push(slip);
    }
    return {
      kind: 'table',
      prompt: [
        say(
          `${STEM_CONTEXTS[params.key][params.context]}: ${listProse(stemList(params))}.${params.sorted ? '' : ' They are not in order.'} Draw a stem-and-leaf diagram: fill in each stem's leaves, smallest first.`,
        ),
        say(stemKeyProse(params)),
      ],
      columns: ['\\text{Stem}', '\\text{Leaves}'],
      rows: rows.map((r) => [`${r.stem}`, null]),
      bank: [...answer, ...extras].sort((a, b) => a.localeCompare(b)),
      answer,
    };
  },
  solution: (params) => {
    const rows = stemRows(params.codes);
    const steps: SolutionStep[] = [];
    if (!params.sorted) steps.push({ text: `In order: ${listProse(ordered(stemList(params)))}.` });
    steps.push(
      { text: `${stemKeyProse(params)} So each value splits into its stem and its last digit, the leaf.` },
      { tex: aligned(...rows.map((r) => `${r.stem} &\\mid ${leavesTex(r.leaves)}`)) },
    );
    const repeated = rows.find((r) => new Set(r.leaves).size < r.leaves.length);
    if (repeated) steps.push({ text: `A value that appears twice keeps both its leaves, as on stem $${repeated.stem}$.` });
    return steps;
  },
};

interface StemReadParams extends StemParams {
  ask: 'largest' | 'smallest' | 'range' | 'count';
  /** For `count`: the line, as a code, that values must be above. */
  above: number;
}

function stemReadAnswer(p: StemReadParams): number {
  const s = ordered(p.codes);
  const v = (c: number) => stemValue(c, p.key);
  if (p.ask === 'largest') return v(s[s.length - 1]);
  if (p.ask === 'smallest') return v(s[0]);
  if (p.ask === 'range') return (s[s.length - 1] - s[0]) / (p.key === 'tenths' ? 10 : 1);
  return s.filter((c) => c > p.above).length;
}

/**
 * One fact read straight off a diagram: its largest or smallest value, or how
 * many values lie above a line, at difficulty 1; the range or a count with a
 * key in tenths or two-digit stems at 2.
 */
const stemRead: Generator<StemReadParams> = {
  id: 'dat-stem-read',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const key: StemKey = hard ? rng.pick<StemKey>(['tenths', 'hundreds']) : 'tens';
    const ask = rng.pick<StemReadParams['ask']>(hard ? ['range', 'count'] : ['largest', 'smallest', 'count']);
    for (;;) {
      const params = sampleStem(rng, hard ? rng.int(11, 14) : rng.int(8, 10), hard ? 4 : 3, key, true);
      const s = ordered(params.codes);
      const above = rng.int(s[0] + 1, s[s.length - 1] - 1);
      if (key === 'tenths' && above % 10 === 0) continue;
      if (params.codes.includes(above)) continue;
      const count = s.filter((c) => c > above).length;
      if (ask === 'count' && (count < 2 || count > s.length - 2)) continue;
      return { ...params, ask, above };
    }
  },
  render: (params): Slide => {
    const question = {
      largest: 'What is the largest value?',
      smallest: 'What is the smallest value?',
      range: 'What is the range?',
      count: `How many values are more than $${fmt(stemValue(params.above, params.key))}$?`,
    }[params.ask];
    return {
      kind: 'expression',
      prompt: stemPrompt(params, question),
      lead: params.ask === 'count' ? '\\text{how many} =' : `\\text{${params.ask}} =`,
      keypad: NUMBER_KEYS,
      answer: fmt(stemReadAnswer(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const s = ordered(params.codes);
    const v = (c: number) => fmt(stemValue(c, params.key));
    const steps = stemReadSolution(params);
    if (params.ask === 'largest') steps.push({ text: `The largest is the last leaf on the bottom stem: $${v(s[s.length - 1])}$.` });
    if (params.ask === 'smallest') steps.push({ text: `The smallest is the first leaf on the top stem: $${v(s[0])}$.` });
    if (params.ask === 'range') {
      steps.push({ tex: `\\text{range} = ${v(s[s.length - 1])} - ${v(s[0])} = ${fmt(stemReadAnswer(params))}` });
    }
    if (params.ask === 'count') {
      const over = s.filter((c) => c > params.above);
      steps.push({ text: `More than $${v(params.above)}$: ${over.map((c) => `$${v(c)}$`).join(', ')}. That is ${over.length} values.` });
    }
    return steps;
  },
};

/**
 * The median and both quartiles counted straight off the leaves, then the
 * interquartile range. Lists of 4k + 3 values only, the one length the course
 * finds quartiles for: 7 or 11 at difficulty 1, 11 or 15 with a key in tenths
 * or two-digit stems at 2.
 */
const stemQuartiles: Generator<StemParams> = {
  id: 'dat-stem-quartiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const key: StemKey = hard ? rng.pick<StemKey>(['tenths', 'hundreds']) : 'tens';
    const n = rng.pick(hard ? [11, 15] : [7, 11]);
    return sampleStem(rng, n, n === 7 ? 3 : rng.int(3, 4), key, true, (p) => {
      const { q1, q2, q3 } = quartiles(p.codes);
      return q1 < q2 && q2 < q3;
    });
  },
  render: (params): Slide => {
    const { s, k, q1, q2, q3 } = quartiles(params.codes);
    const v = (c: number) => stemValue(c, params.key);
    const unit = params.key === 'tenths' ? 0.1 : 1;
    const answer = [v(q1), v(q2), v(q3), v(q3) - v(q1)];
    const slips = [s[k - 1], s[k + 1], s[2 * k], s[2 * k + 2], s[3 * k + 1], s[3 * k + 3]]
      .filter((c) => c !== undefined)
      .map(v)
      .concat([v(s[s.length - 1]) - v(s[0]), v(q2) - v(q1)]);
    return {
      kind: 'tree',
      prompt: stemPrompt(params, 'Top row, left to right: the lower quartile, the median, the upper quartile. Underneath, the interquartile range.'),
      expression: '\\text{IQR} = Q_3 - Q_1',
      nodes: [
        { id: 'q1', from: [] },
        { id: 'q2', from: [] },
        { id: 'q3', from: [] },
        { id: 'iqr', from: ['q1', 'q3'] },
      ],
      bank: valueBank(answer, slips, 3, unit),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { s, k, q1, q2, q3 } = quartiles(params.codes);
    const v = (c: number) => fmt(stemValue(c, params.key));
    return [
      { text: `The leaves are already in order, top to bottom. There are $${s.length}$, so the quartiles are the ${nth(k + 1)}, ${nth(2 * k + 2)} and ${nth(3 * k + 3)} leaves.` },
      { text: `${stemKeyProse(params)} Counting along:` },
      { tex: aligned(`Q_1 &= ${v(q1)}`, `Q_2 &= ${v(q2)}`, `Q_3 &= ${v(q3)}`) },
      { tex: `\\text{IQR} = ${v(q3)} - ${v(q1)} = ${fmt(stemValue(q3, params.key) - stemValue(q1, params.key))}` },
    ];
  },
};

interface StemKeyParams extends StemParams {
  /** The stem whose row is asked about. */
  stem: number;
}

const valuesTex = (values: readonly number[]): string => values.map(fmt).join(',\\ ');

/**
 * What one row stands for under the key: every leaf, a repeated leaf twice,
 * at the key's scale. The distractors drop the repeat, misread the scale by
 * ten either way, or add the stem to each leaf.
 */
const stemKeyChoice: Generator<StemKeyParams> = {
  id: 'dat-stem-key',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const key: StemKey = hard ? rng.pick<StemKey>(['tenths', 'hundreds']) : 'tens';
    const hasRepeat = (r: StemRow) => r.leaves.length >= 3 && new Set(r.leaves).size < r.leaves.length;
    const params = sampleStem(rng, hard ? rng.int(10, 13) : rng.int(8, 10), hard ? rng.int(3, 4) : 3, key, true, (p) =>
      stemRows(p.codes).some(hasRepeat),
    );
    const rows = stemRows(params.codes).filter(hasRepeat);
    return { ...params, stem: rng.pick(rows).stem };
  },
  render: (params): Slide => {
    const row = stemRows(params.codes).find((r) => r.stem === params.stem)!;
    const values = row.leaves.map((l) => stemValue(params.stem * 10 + l, params.key));
    const distinct = [...new Set(row.leaves)].map((l) => stemValue(params.stem * 10 + l, params.key));
    const scaled = (by: number) => values.map((x) => x * by);
    const slips = [
      distinct,
      params.key === 'tenths' ? scaled(10) : scaled(0.1),
      row.leaves.map((l) => params.stem + l),
      params.key === 'tenths' ? scaled(0.1) : scaled(10),
    ];
    return choiceSlide(
      stemPrompt(params, `Which values does the row with stem $${params.stem}$ stand for?`),
      options({ tex: valuesTex(values) }, ...slips.map((xs) => ({ tex: valuesTex(xs) }))).slice(0, 4),
      `${params.codes.join(',')}|${params.key}|${params.stem}`,
    );
  },
  solution: (params) => {
    const row = stemRows(params.codes).find((r) => r.stem === params.stem)!;
    const values = row.leaves.map((l) => stemValue(params.stem * 10 + l, params.key));
    return [
      { text: stemKeyProse(params) },
      { text: `So each leaf on stem $${params.stem}$ joins onto it the same way, and every leaf is a value, repeats included:` },
      { tex: `${params.stem} \\mid ${leavesTex(row.leaves)}` },
      { text: `stands for ${listProse(values)}.` },
    ];
  },
};

/* ================================================================
 * Level 3, lessons 2 and 3: box plots
 * ================================================================ */

/** The five values a box is drawn from, and any outliers plotted beyond the whiskers. */
export interface Box {
  min: number;
  q1: number;
  q2: number;
  q3: number;
  max: number;
  outliers: number[];
}

/** A number line: every `tick` gets a mark and a faint line up, every `every` a number. */
export interface BoxScale {
  lo: number;
  hi: number;
  tick: number;
  every: number;
}

/** The same width and inset as `plotSvg`, so `markerWindow` lines a slider up with it. */
const FIG_WIDTH = 280;
const FIG_PAD = 12;

/**
 * Box plots over one scale, one row each, named when there are two.
 *
 * Drawn here rather than by `plotSvg`, which has curves, marks and verticals
 * but no boxes. Every value sits on a tick, so it can be read off exactly. The
 * pieces carry class names (`box-body`, `box-median`, `box-whisker`,
 * `box-outlier`, `box-label`) so the tests can read the picture back.
 */
export function boxPlotSvg(rows: { name?: string; box: Box }[], scale: BoxScale, label: string): string {
  const named = rows.some((r) => r.name !== undefined);
  const rowH = named ? 44 : 34;
  const axis = FIG_PAD + rows.length * rowH + 6;
  const height = axis + 22;
  const x = (v: number) => (FIG_PAD + ((v - scale.lo) / (scale.hi - scale.lo)) * (FIG_WIDTH - 2 * FIG_PAD)).toFixed(1);
  const parts = [`<svg viewBox="0 0 ${FIG_WIDTH} ${height}" width="100%" role="img" aria-label="${label}">`];
  const ticks = Math.round((scale.hi - scale.lo) / scale.tick);
  for (let i = 0; i <= ticks; i += 1) {
    const v = scale.lo + i * scale.tick;
    const major = whole(v / scale.every);
    parts.push(
      `<line x1="${x(v)}" y1="${FIG_PAD}" x2="${x(v)}" y2="${axis}" stroke="currentColor" stroke-width="0.5" opacity="${major ? 0.3 : 0.15}" />`,
      `<line x1="${x(v)}" y1="${axis}" x2="${x(v)}" y2="${axis + (major ? 6 : 3)}" stroke="currentColor" stroke-width="1" opacity="0.7" />`,
    );
    if (major) {
      parts.push(`<text class="box-label" x="${x(v)}" y="${axis + 17}" font-size="10" fill="currentColor" text-anchor="middle">${fmt(v)}</text>`);
    }
  }
  parts.push(`<line x1="${FIG_PAD}" y1="${axis}" x2="${FIG_WIDTH - FIG_PAD}" y2="${axis}" stroke="currentColor" stroke-width="1" opacity="0.7" />`);
  rows.forEach(({ name, box }, i) => {
    const top = FIG_PAD + i * rowH + (named ? 14 : 2);
    const mid = top + 10;
    if (name !== undefined) parts.push(`<text x="${FIG_PAD}" y="${top - 4}" font-size="10" fill="currentColor">${name}</text>`);
    parts.push(
      `<line class="box-whisker" x1="${x(box.min)}" y1="${mid}" x2="${x(box.q1)}" y2="${mid}" stroke="currentColor" stroke-width="1.5" />`,
      `<line class="box-whisker" x1="${x(box.q3)}" y1="${mid}" x2="${x(box.max)}" y2="${mid}" stroke="currentColor" stroke-width="1.5" />`,
      `<line x1="${x(box.min)}" y1="${mid - 6}" x2="${x(box.min)}" y2="${mid + 6}" stroke="currentColor" stroke-width="1.5" />`,
      `<line x1="${x(box.max)}" y1="${mid - 6}" x2="${x(box.max)}" y2="${mid + 6}" stroke="currentColor" stroke-width="1.5" />`,
      `<rect class="plot-shade" x="${x(box.q1)}" y="${top}" width="${(Number(x(box.q3)) - Number(x(box.q1))).toFixed(1)}" height="20" />`,
      `<rect class="box-body" x="${x(box.q1)}" y="${top}" width="${(Number(x(box.q3)) - Number(x(box.q1))).toFixed(1)}" height="20" fill="none" stroke="currentColor" stroke-width="1.5" />`,
      `<line class="box-median" x1="${x(box.q2)}" y1="${top}" x2="${x(box.q2)}" y2="${top + 20}" stroke="currentColor" stroke-width="2.5" />`,
    );
    for (const o of box.outliers) {
      const c = Number(x(o));
      parts.push(
        `<path class="box-outlier" d="M ${(c - 4).toFixed(1)},${mid - 4} L ${(c + 4).toFixed(1)},${mid + 4} M ${(c - 4).toFixed(1)},${mid + 4} L ${(c + 4).toFixed(1)},${mid - 4}" stroke="currentColor" stroke-width="1.5" />`,
      );
    }
  });
  parts.push('</svg>');
  return parts.join('');
}

/**
 * Ticks of 5 numbered every 10 at difficulty 1; ticks of 2 at 2, where a
 * value has to be counted along from the nearest number.
 */
function boxScale(rng: Rng, hard: boolean): BoxScale {
  const lo = 10 * rng.int(0, hard ? 6 : 4);
  return hard ? { lo, hi: lo + 40, tick: 2, every: 10 } : { lo, hi: lo + 60, tick: 5, every: 10 };
}

/**
 * Five values on the scale's ticks, the box at least two ticks wide. An
 * outlier, where one is asked for, lies beyond its 1.5 IQR fence and the
 * whisker stops inside it, as the rule of da-l2 draws it.
 */
function sampleBox(rng: Rng, scale: BoxScale, outlier: 'none' | 'upper' | 'lower'): Box {
  const n = Math.round((scale.hi - scale.lo) / scale.tick);
  const at = (i: number) => scale.lo + i * scale.tick;
  const slots = Array.from({ length: n + 1 }, (_, i) => i);
  for (;;) {
    const [a, b, c, d, e] = ordered(rng.sample(slots, 5));
    if (d - b < 2) continue;
    // Both whiskers stay inside their fences, or the plot would be hiding an outlier.
    const upper = d + 1.5 * (d - b);
    const lower = b - 1.5 * (d - b);
    if (e > upper || a < lower) continue;
    const box = { min: at(a), q1: at(b), q2: at(c), q3: at(d), max: at(e), outliers: [] as number[] };
    if (outlier === 'none') return box;
    if (outlier === 'upper') {
      if (Math.floor(upper) + 1 > n) continue;
      return { ...box, outliers: [at(rng.int(Math.floor(upper) + 1, n))] };
    }
    if (Math.ceil(lower) - 1 < 0) continue;
    return { ...box, outliers: [at(rng.int(0, Math.ceil(lower) - 1))] };
  }
}

const boxLabel = (scale: BoxScale, outlier: boolean): string =>
  `A box plot on a scale from ${scale.lo} to ${scale.hi}${outlier ? ', with one outlier marked by a cross' : ''}`;

const boxFigure = (box: Box, scale: BoxScale): Block => ({
  kind: 'diagram',
  svg: boxPlotSvg([{ box }], scale, boxLabel(scale, box.outliers.length > 0)),
});

/** The smallest and largest values in the data: an outlier is still a value. */
const boxEnds = (box: Box) => ({ lo: Math.min(box.min, ...box.outliers), hi: Math.max(box.max, ...box.outliers) });

/** A list of 4k + 3 values whose ends lie outside its quartiles, so all five values differ. */
function sampleFive(rng: Rng, lengths: number[], sorted: boolean): QuartileParams {
  for (;;) {
    const params = sampleQuartiles(rng, lengths, sorted);
    const { s, q1, q3 } = quartiles(params.values);
    if (s[0] < q1 && q3 < s[s.length - 1]) return params;
  }
}

/** The five values a box plot is drawn from, found from a list: in order at difficulty 1, jumbled at 2. */
const boxFive: Generator<QuartileParams> = {
  id: 'dat-box-five',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleFive(rng, [11, 15], false) : sampleFive(rng, [7, 11], true)),
  render: (params): Slide => {
    const { s, k, q1, q2, q3 } = quartiles(params.values);
    const n = s.length;
    const answer = [s[0], q1, q2, q3, s[n - 1]];
    const slips = [s[k + 1], s[k - 1], s[3 * k + 1], s[3 * k + 3], params.values[0], params.values[n - 1], params.values[2 * k + 1], q3 - q1, s[n - 1] - s[0]];
    return {
      kind: 'table',
      prompt: quartilePrompt(params, 'Fill in the five values a box plot is drawn from.'),
      columns: ['\\text{Summary}', '\\text{Value}'],
      rows: [
        ['\\text{Smallest}', null],
        ['Q_1', null],
        ['\\text{Median}', null],
        ['Q_3', null],
        ['\\text{Largest}', null],
      ],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { s } = quartiles(params.values);
    const steps = quartileSolution(params).slice(0, -1);
    steps.push({ text: `The ends of the whiskers are the smallest and largest values, $${s[0]}$ and $${s[s.length - 1]}$.` });
    return steps;
  },
};

interface BoxReadParams {
  box: Box;
  scale: BoxScale;
  /** Difficulty 2 asks the range as well, and may plot an outlier that the range has to include. */
  both: boolean;
}

/**
 * The interquartile range read off a box plot at difficulty 1. At 2 the ticks
 * are finer, the range is asked too, and a cross may mark an outlier: the
 * range runs to it, since it is still one of the values.
 */
const boxRead: Generator<BoxReadParams> = {
  id: 'dat-box-read',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const scale = boxScale(rng, hard);
    const box = sampleBox(rng, scale, hard ? rng.pick(['none', 'upper', 'lower'] as const) : 'none');
    return { box, scale, both: hard };
  },
  render: ({ box, scale, both }): Slide => {
    const { lo, hi } = boxEnds(box);
    const iqr = box.q3 - box.q1;
    const answer = both ? [hi, lo, hi - lo, box.q3, box.q1, iqr] : [box.q3, box.q1, iqr];
    const slips = [box.q2, box.max, box.min, box.max - box.min, box.q3 - box.q2, box.q2 - box.q1];
    return {
      kind: 'tiles',
      prompt: [
        boxFigure(box, scale),
        say(both ? 'Read the box plot. Fill in the working for the range and the interquartile range.' : 'Read the box plot. Fill in the working for the interquartile range.'),
      ],
      template: both ? '\\text{range} = {0} - {1} = {2}, \\quad \\text{IQR} = {3} - {4} = {5}' : '\\text{IQR} = {0} - {1} = {2}',
      bank: valueBank(answer, slips, 3, scale.tick),
      answer: answer.map(fmt),
    };
  },
  solution: ({ box, scale, both }) => {
    const { lo, hi } = boxEnds(box);
    const steps: SolutionStep[] = [
      { text: `Each small division on the scale is $${fmt(scale.tick)}$. The box runs from $Q_1 = ${fmt(box.q1)}$ to $Q_3 = ${fmt(box.q3)}$, with the median at $${fmt(box.q2)}$.` },
    ];
    if (both) {
      if (box.outliers.length > 0) steps.push({ text: `The cross at $${fmt(box.outliers[0])}$ is an outlier, but still a value, so the range runs to it.` });
      steps.push({ tex: `\\text{range} = ${fmt(hi)} - ${fmt(lo)} = ${fmt(hi - lo)}` });
    }
    steps.push({ tex: `\\text{IQR} = ${fmt(box.q3)} - ${fmt(box.q1)} = ${fmt(box.q3 - box.q1)}` });
    return steps;
  },
};

interface BoxSliderParams {
  box: Box;
  scale: BoxScale;
  ask: 'q1' | 'q2' | 'q3';
  /** Difficulty 2 names the value by what it means rather than by its name. */
  worded: boolean;
}

const BOX_NAMES = { q1: 'lower quartile', q2: 'median', q3: 'upper quartile' } as const;
const BOX_MEANINGS = {
  q1: 'a quarter of the values lie below it',
  q2: 'half the values lie above it and half below',
  q3: 'a quarter of the values lie above it',
} as const;

/**
 * Slide the marker along the scale to a quartile or the median of a box
 * plot, named at difficulty 1 and described by what it means at 2, where the
 * ticks are finer and an outlier may be plotted.
 */
const boxSlider: Generator<BoxSliderParams> = {
  id: 'dat-box-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const ask = rng.pick(['q1', 'q2', 'q3'] as const);
    for (;;) {
      const scale = boxScale(rng, hard);
      const box = sampleBox(rng, scale, hard ? rng.pick(['none', 'upper', 'lower'] as const) : 'none');
      // The handle starts in the middle, where an untouched answer must not score.
      if (box[ask] === scale.lo + Math.round((scale.hi - scale.lo) / 2 / scale.tick) * scale.tick) continue;
      return { box, scale, ask, worded: hard };
    }
  },
  render: ({ box, scale, ask, worded }): Slide => ({
    kind: 'slider',
    prompt: [
      say(
        worded
          ? `Slide the marker to the value where ${BOX_MEANINGS[ask]}.`
          : `Slide the marker to the ${BOX_NAMES[ask]} of this box plot.`,
      ),
    ],
    min: scale.lo,
    max: scale.hi,
    step: scale.tick,
    answer: box[ask],
    readout: '\\text{marker at } {v}',
    figure: {
      svg: boxPlotSvg([{ box }], scale, boxLabel(scale, box.outliers.length > 0)),
      ...markerWindow(scale.lo, scale.hi),
    },
  }),
  solution: ({ box, ask, worded }) => {
    const steps: SolutionStep[] = [];
    if (worded) steps.push({ text: `A box plot splits the values into quarters, so ${BOX_MEANINGS[ask]} at the ${BOX_NAMES[ask]}.` });
    steps.push({
      text: {
        q1: `The lower quartile is the left-hand end of the box: $${fmt(box.q1)}$.`,
        q2: `The median is the line inside the box: $${fmt(box.q2)}$.`,
        q3: `The upper quartile is the right-hand end of the box: $${fmt(box.q3)}$.`,
      }[ask],
    });
    return steps;
  },
};

interface WhiskerParams {
  values: number[];
  sorted: boolean;
  side: 'upper' | 'lower';
}

/**
 * Where a whisker ends when a list holds an outlier: at the furthest value
 * that is not one, not at the outlier, the fence or the quartile. The upper
 * whisker of an ordered list with its quartiles given at difficulty 1; either
 * whisker of a jumbled list at 2.
 */
const boxWhisker: Generator<WhiskerParams> = {
  id: 'dat-box-whisker',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const side = hard ? rng.pick(['upper', 'lower'] as const) : 'upper';
    for (;;) {
      const n = hard ? rng.pick([11, 15]) : 11;
      const lo = rng.int(15, 40);
      const spread = rng.int(10, 24);
      const body = ints(rng, n - 1, lo, lo + spread);
      const stray = side === 'upper' ? lo + spread + rng.int(12, 40) : lo - rng.int(12, lo - 2);
      const raw = rng.shuffle([...body, stray]);
      const { q1, q2, q3 } = quartiles(raw);
      if (!(q1 < q2 && q2 < q3)) continue;
      const f = fences({ q1, q3 });
      if (outliersIn(raw).length !== 1 || !(stray > f.upper || stray < f.lower)) continue;
      if (raw.some((x) => Math.abs(x - f.lower) < 1 || Math.abs(x - f.upper) < 1)) continue;
      const end = side === 'upper' ? Math.max(...body) : Math.min(...body);
      if (end === (side === 'upper' ? q3 : q1)) continue;
      return { values: hard ? raw : ordered(raw), sorted: !hard, side };
    }
  },
  render: ({ values, sorted, side }): Slide => {
    const { q1, q3 } = quartiles(values);
    const f = fences({ q1, q3 });
    const upper = side === 'upper';
    const inside = values.filter((x) => x >= f.lower && x <= f.upper);
    const end = upper ? Math.max(...inside) : Math.min(...inside);
    const stray = upper ? Math.max(...values) : Math.min(...values);
    const n = values.length;
    const lead = sorted
      ? `These ${n} values are in order: ${listProse(values)}. $Q_1 = ${q1}$ and $Q_3 = ${q3}$.`
      : `Here are ${n} values: ${listProse(values)}.`;
    return choiceSlide(
      [say(`${lead} A box plot of them marks any outlier with a cross. Where does the ${upper ? 'right-hand' : 'left-hand'} whisker end?`)],
      valueChoices(end, [stray, upper ? f.upper : f.lower, upper ? q3 : q1], mix(...values)),
      values.join(','),
    );
  },
  solution: ({ values, sorted, side }) => {
    const { s, q1, q3 } = quartiles(values);
    const f = fences({ q1, q3 });
    const upper = side === 'upper';
    const inside = values.filter((x) => x >= f.lower && x <= f.upper);
    const stray = upper ? Math.max(...values) : Math.min(...values);
    const steps: SolutionStep[] = [];
    if (!sorted) steps.push({ text: `In order: ${listProse(s)}, so $Q_1 = ${q1}$ and $Q_3 = ${q3}$.` });
    steps.push(
      { text: `The IQR is $${q3 - q1}$, so the fences are $${fmt(f.lower)}$ and $${fmt(f.upper)}$.` },
      { text: `$${stray}$ is beyond the ${side} fence: it is an outlier, and plotted as a cross.` },
      { text: `The whisker stops at the ${upper ? 'largest' : 'smallest'} value that is not an outlier: $${upper ? Math.max(...inside) : Math.min(...inside)}$.` },
    );
    return steps;
  },
};

interface BoxFenceParams {
  box: Box;
  scale: BoxScale;
  side: 'upper' | 'lower';
}

/**
 * Check a plotted outlier: the fence from quartiles read off the plot, one
 * operation at a time. The line starts as symbols, so the first step is
 * reading $Q_3$ and $Q_1$ off the box. The upper fence on the coarse scale at
 * difficulty 1; either fence on the fine one at 2.
 */
const boxFence: Generator<BoxFenceParams> = {
  id: 'dat-box-fence',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const side = hard ? rng.pick(['upper', 'lower'] as const) : 'upper';
    const scale = boxScale(rng, hard);
    return { box: sampleBox(rng, scale, side), scale, side };
  },
  render: ({ box, scale, side }): Slide => {
    const upper = side === 'upper';
    const iqr = box.q3 - box.q1;
    const part = 1.5 * iqr;
    const fence = upper ? box.q3 + part : box.q1 - part;
    const t = scale.tick;
    return {
      kind: 'steps',
      prompt: [
        boxFigure(box, scale),
        say(
          `The cross at $${fmt(box.outliers[0])}$ is plotted as an outlier. Work out the ${side} fence from the box's quartiles. Tap the part you would do next, then choose what it comes to.`,
        ),
      ],
      start: [upper ? 'Q_3' : 'Q_1', upper ? '+' : '-', '1.5', '\\times', '(', 'Q_3', '-', 'Q_1', ')'],
      reductions: [
        { span: [4, 9], operator: 6, value: fmt(iqr), bank: stepBank(fmt(iqr), ...tidy([box.q3 + box.q1, box.max - box.min, iqr + t, box.q2 - box.q1]).map(fmt)) },
        { span: [2, 5], operator: 3, value: fmt(part), bank: stepBank(fmt(part), ...tidy([iqr + 1.5, 2 * iqr, part + t]).map(fmt)) },
        {
          span: [0, 3],
          operator: 1,
          value: fmt(fence),
          bank: stepBank(fmt(fence), ...tidy([upper ? box.q1 + part : box.q3 - part, fence + t, fence - t, upper ? box.max + part : box.min - part]).map(fmt)),
        },
      ],
    };
  },
  solution: ({ box, side }) => {
    const upper = side === 'upper';
    const iqr = box.q3 - box.q1;
    const fence = upper ? box.q3 + 1.5 * iqr : box.q1 - 1.5 * iqr;
    return [
      { text: `The box runs from $Q_1 = ${fmt(box.q1)}$ to $Q_3 = ${fmt(box.q3)}$, so the IQR is $${fmt(iqr)}$ and $1.5 \\times ${fmt(iqr)} = ${fmt(1.5 * iqr)}$.` },
      { tex: upper ? `${fmt(box.q3)} + ${fmt(1.5 * iqr)} = ${fmt(fence)}` : `${fmt(box.q1)} - ${fmt(1.5 * iqr)} = ${fmt(fence)}` },
      { text: `The cross at $${fmt(box.outliers[0])}$ is ${upper ? 'above' : 'below'} $${fmt(fence)}$, so it is an outlier, and the whisker stops at $${fmt(upper ? box.max : box.min)}$, inside the fence.` },
    ];
  },
};

/* ---------- comparing two box plots ---------- */

interface TwoBoxParams {
  context: number;
  a: Box;
  b: Box;
  scale: BoxScale;
}

const iqrOf = (box: Box): number => box.q3 - box.q1;
const rangeOfBox = (box: Box): number => box.max - box.min;

/**
 * Two box plots on one scale whose medians and IQRs both differ. At
 * difficulty 2 the ticks are finer and the ranges compare the other way
 * round from the IQRs, so reading spread off the whiskers gives the wrong
 * group.
 */
function sampleTwoBoxes(rng: Rng, difficulty: number): TwoBoxParams {
  const hard = difficulty > 1;
  const context = rng.int(0, COMPARE_CONTEXTS.length - 1);
  const scale = boxScale(rng, hard);
  const gap = hard ? 1 : 2;
  for (;;) {
    const a = sampleBox(rng, scale, 'none');
    const b = sampleBox(rng, scale, 'none');
    if (Math.abs(a.q2 - b.q2) < gap * scale.tick || Math.abs(iqrOf(a) - iqrOf(b)) < gap * scale.tick) continue;
    const r = Math.sign(rangeOfBox(a) - rangeOfBox(b));
    if (hard && r !== -Math.sign(iqrOf(a) - iqrOf(b))) continue;
    return { context, a, b, scale };
  }
}

function twoBoxFigure({ context, a, b, scale }: TwoBoxParams): Block {
  const [na, nb] = COMPARE_CONTEXTS[context].names;
  return {
    kind: 'diagram',
    svg: boxPlotSvg(
      [
        { name: na, box: a },
        { name: nb, box: b },
      ],
      scale,
      `Two box plots on one scale from ${scale.lo} to ${scale.hi}: ${na} above, ${nb} below`,
    ),
  };
}

function twoBoxSolution({ context, a, b }: TwoBoxParams): SolutionStep[] {
  const [na, nb] = COMPARE_CONTEXTS[context].names;
  return [
    { text: `Medians: ${na} $${fmt(a.q2)}$, ${nb} $${fmt(b.q2)}$. ${a.q2 > b.q2 ? na : nb} is higher on average.` },
    {
      text: `Interquartile ranges: ${na} $${fmt(a.q3)} - ${fmt(a.q1)} = ${fmt(iqrOf(a))}$, ${nb} $${fmt(b.q3)} - ${fmt(b.q1)} = ${fmt(iqrOf(b))}$. ${iqrOf(a) > iqrOf(b) ? na : nb} is more spread out.`,
    },
    { text: 'The IQR is the spread to compare, not the length of the whiskers: one extreme value can stretch a whisker.' },
  ];
}

/** Which statement about two box plots is right: the higher median, and the larger IQR. */
const boxesChoice: Generator<TwoBoxParams> = {
  id: 'dat-boxes-choice',
  sample: sampleTwoBoxes,
  render: (params): Slide => {
    const [na, nb] = COMPARE_CONTEXTS[params.context].names;
    const higher = params.a.q2 > params.b.q2 ? na : nb;
    const wider = iqrOf(params.a) > iqrOf(params.b) ? na : nb;
    const opts = [na, nb].flatMap((x) =>
      [na, nb].map((y) => ({
        tex: `${x} has the higher median, and ${y} has the larger interquartile range.`,
        correct: x === higher && y === wider ? true : undefined,
      })),
    );
    return choiceSlide(
      [twoBoxFigure(params), say(`${COMPARE_CONTEXTS[params.context].intro} Which statement is correct?`)],
      opts,
      JSON.stringify([params.a, params.b, params.scale.lo]),
      false,
    );
  },
  solution: twoBoxSolution,
};

interface BoxesFlowParams extends TwoBoxParams {
  /** Difficulty 2 first asks whether a higher value is better here. */
  better: boolean;
}

/**
 * Two box plots compared as a walk: the higher median, then the larger IQR at
 * difficulty 1. At 2, first whether a higher value is better in this context,
 * then which group did better on average, then which was more consistent.
 */
const boxesFlow: Generator<BoxesFlowParams> = {
  id: 'dat-boxes-flow',
  sample: (rng, difficulty) => ({ ...sampleTwoBoxes(rng, difficulty), better: difficulty > 1 }),
  render: (params): Slide => {
    const ctx = COMPARE_CONTEXTS[params.context];
    const [na, nb] = ctx.names;
    const key = JSON.stringify([params.a, params.b, params.context]);
    const higher = params.a.q2 > params.b.q2 ? na : nb;
    const wider = iqrOf(params.a) > iqrOf(params.b) ? na : nb;
    const steadier = wider === na ? nb : na;
    const prompt = [twoBoxFigure(params), say(`${ctx.intro} Compare the two.`)];
    const subject = `\\text{${na}} \\text{ and } \\text{${nb}}`;
    if (!params.better) {
      const spread = (id: string, high: string): Extract<Slide, { kind: 'flow' }>['steps'][number] => ({
        id,
        ask: 'Which has the larger interquartile range?',
        branches: [na, nb].map((y) => ({ label: y, outcome: `${high} has the higher median, and ${y} is more spread out.` })),
      });
      return {
        kind: 'flow',
        prompt,
        subject,
        steps: [
          {
            id: 'med',
            ask: 'Which has the higher median?',
            branches: [
              { label: na, to: 'sa' },
              { label: nb, to: 'sb' },
            ],
          },
          spread('sa', na),
          spread('sb', nb),
        ],
        answer: [higher, wider],
      };
    }
    const best = ctx.higher === params.a.q2 > params.b.q2 ? na : nb;
    const verdict = (winner: string) =>
      [na, nb].map((y) => ({
        label: y,
        outcome: winner === y ? `${winner} did better on average and was more consistent.` : `${winner} did better on average, but ${y} was more consistent.`,
      }));
    const pick = (ask: string, id: string): Extract<Slide, { kind: 'flow' }>['steps'][number] => ({
      id,
      ask,
      branches: [
        { label: na, to: 'ca' },
        { label: nb, to: 'cb' },
      ],
    });
    return {
      kind: 'flow',
      prompt,
      subject,
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
        pick('Which has the higher median?', 'hi'),
        pick('Which has the lower median?', 'lo'),
        { id: 'ca', ask: 'Which has the smaller interquartile range?', branches: verdict(na) },
        { id: 'cb', ask: 'Which has the smaller interquartile range?', branches: verdict(nb) },
      ],
      answer: [ctx.higher ? 'Yes' : 'No', best, steadier],
    };
  },
  solution: (params) => {
    const ctx = COMPARE_CONTEXTS[params.context];
    const steps = twoBoxSolution(params);
    if (params.better) steps.unshift({ text: ctx.higher ? `For ${ctx.what}, higher is better.` : `For ${ctx.what}, lower is better, so the lower median did better.` });
    return steps;
  },
};

/** Both boxes' quartiles read off, and each IQR: coarse ticks at difficulty 1, fine at 2. */
const boxesTree: Generator<TwoBoxParams> = {
  id: 'dat-boxes-tree',
  sample: sampleTwoBoxes,
  render: (params): Slide => {
    const { a, b, scale } = params;
    const [na, nb] = COMPARE_CONTEXTS[params.context].names;
    const answer = [a.q1, a.q3, b.q1, b.q3, iqrOf(a), iqrOf(b)];
    const slips = [a.q2, b.q2, a.min, b.max, rangeOfBox(a), rangeOfBox(b), Math.abs(a.q2 - b.q2)];
    return {
      kind: 'tree',
      prompt: [
        twoBoxFigure(params),
        say(`Top row, left to right: $Q_1$ and $Q_3$ of ${na}, then $Q_1$ and $Q_3$ of ${nb}. Underneath, the interquartile range of each.`),
      ],
      expression: '\\text{IQR} = Q_3 - Q_1',
      nodes: [
        { id: 'a1', from: [] },
        { id: 'a3', from: [] },
        { id: 'b1', from: [] },
        { id: 'b3', from: [] },
        { id: 'ia', from: ['a1', 'a3'] },
        { id: 'ib', from: ['b1', 'b3'] },
      ],
      bank: valueBank(answer, slips, 3, scale.tick),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { a, b } = params;
    const [na, nb] = COMPARE_CONTEXTS[params.context].names;
    return [
      { text: `Each box runs from $Q_1$ to $Q_3$. Each small division is $${fmt(params.scale.tick)}$.` },
      { tex: aligned(`\\text{${na}}: ${fmt(a.q3)} - ${fmt(a.q1)} &= ${fmt(iqrOf(a))}`, `\\text{${nb}}: ${fmt(b.q3)} - ${fmt(b.q1)} &= ${fmt(iqrOf(b))}`) },
    ];
  },
};

type Quartile = 'q1' | 'q2' | 'q3';

interface BoxesPercentParams extends TwoBoxParams {
  /** The second group's value the question is about. */
  stat: Quartile;
  /** The first group's quartile it lines up with. */
  match: Quartile;
  above: boolean;
  /** How many values the first group has, at difficulty 2; 0 asks for a percentage. */
  count: number;
}

/** The share of a box plot's values above each of its quartiles. */
const SHARE_ABOVE: Record<Quartile, number> = { q1: 0.75, q2: 0.5, q3: 0.25 };

const boxesShare = ({ match, above }: BoxesPercentParams): number => (above ? SHARE_ABOVE[match] : 1 - SHARE_ABOVE[match]);

/**
 * What share of one group lies above or below a value of the other, where
 * that value lines up with one of the first group's quartiles. A percentage
 * at difficulty 1; at 2 a number of values out of a stated count.
 */
const boxesPercent: Generator<BoxesPercentParams> = {
  id: 'dat-boxes-percent',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const context = rng.int(0, COMPARE_CONTEXTS.length - 1);
    const scale = boxScale(rng, hard);
    const stat = rng.pick(['q1', 'q2', 'q3'] as const);
    const match = rng.pick(['q1', 'q2', 'q3'] as const);
    for (;;) {
      // Both boxes are redrawn: a fixed first box can leave no room for the second.
      const a = sampleBox(rng, scale, 'none');
      const b = sampleBox(rng, scale, 'none');
      if (b[stat] !== a[match] || JSON.stringify(a) === JSON.stringify(b)) continue;
      const count = hard ? rng.pick([20, 40, 60, 80, 100, 120, 200]) : 0;
      return { context, a, b, scale, stat, match, above: rng.chance(0.5), count };
    }
  },
  render: (params): Slide => {
    const [na, nb] = COMPARE_CONTEXTS[params.context].names;
    const share = boxesShare(params);
    const way = params.above ? 'more' : 'less';
    return {
      kind: 'expression',
      prompt: [
        twoBoxFigure(params),
        say(
          params.count > 0
            ? `${COMPARE_CONTEXTS[params.context].intro} ${na} has ${params.count} values. About how many of them are ${way} than the ${BOX_NAMES[params.stat]} of ${nb}?`
            : `${COMPARE_CONTEXTS[params.context].intro} About what percentage of ${na}'s values are ${way} than the ${BOX_NAMES[params.stat]} of ${nb}?`,
        ),
      ],
      lead: params.count > 0 ? '\\text{number} \\approx' : '\\text{percentage} \\approx',
      keypad: NUMBER_KEYS,
      answer: fmt(params.count > 0 ? params.count * share : 100 * share),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const [na, nb] = COMPARE_CONTEXTS[params.context].names;
    const v = params.b[params.stat];
    const share = boxesShare(params);
    const steps: SolutionStep[] = [
      { text: `The ${BOX_NAMES[params.stat]} of ${nb} is $${fmt(v)}$, which is where ${na}'s ${BOX_NAMES[params.match]} is.` },
      { text: `Each part of a box plot holds a quarter of the values, so $${fmt(100 * share)}\\%$ of ${na} lies ${params.above ? 'above' : 'below'} it.` },
    ];
    if (params.count > 0) steps.push({ tex: `${fmt(share)} \\times ${params.count} = ${fmt(share * params.count)}` });
    return steps;
  },
};

/* ================================================================
 * Level 3, lessons 4 and 5: histograms
 * ================================================================ */

export interface HistFigure {
  bounds: readonly number[];
  /** Each bar's height, a frequency density; `null` leaves the bar out. */
  heights: readonly (number | null)[];
  yMax: number;
  /** A faint line across at every step. */
  yStep: number;
  /** A number up the side at every multiple of this; 0 leaves the scale unnumbered. */
  yEvery: number;
  /** Faint lines up at this spacing too, so squares can be counted. */
  xGrid?: number;
  label: string;
}

export const HIST_HEIGHT = 170;

/**
 * The bottom of the drawing as a density: below zero, to leave room for the
 * class boundaries under the axis. A `y` slider over the figure declares its
 * span from here to `yMax`, through `markerWindow`.
 */
export const histFloor = (yMax: number): number => (-12 * yMax) / (HIST_HEIGHT - 36);

/**
 * A histogram: bars as wide as their classes and as tall as their frequency
 * densities, on squared lines so heights can be read off.
 *
 * Drawn here rather than by `plotSvg`, which has no bars. The bars carry the
 * class `hist-bar` and the numbers along each axis `hist-x` and `hist-y`, so
 * the tests can read the picture back.
 */
export function histogramSvg(fig: HistFigure): string {
  const { bounds, heights, yMax, yStep, yEvery, xGrid, label } = fig;
  const left = yEvery > 0 ? 30 : 14;
  const right = FIG_WIDTH - 14;
  const first = bounds[0];
  const last = bounds[bounds.length - 1];
  const floor = histFloor(yMax);
  const x = (v: number) => left + ((v - first) / (last - first)) * (right - left);
  const y = (v: number) => FIG_PAD + ((yMax - v) / (yMax - floor)) * (HIST_HEIGHT - 2 * FIG_PAD);
  const f1 = (v: number) => v.toFixed(1);
  const parts = [`<svg viewBox="0 0 ${FIG_WIDTH} ${HIST_HEIGHT}" width="100%" role="img" aria-label="${label}">`];
  const rows = Math.round(yMax / yStep);
  for (let j = 1; j <= rows; j += 1) {
    parts.push(`<line x1="${left}" y1="${f1(y(j * yStep))}" x2="${right}" y2="${f1(y(j * yStep))}" stroke="currentColor" stroke-width="0.5" opacity="0.2" />`);
  }
  if (xGrid) {
    for (let v = first + xGrid; v < last; v += xGrid) {
      parts.push(`<line x1="${f1(x(v))}" y1="${f1(y(0))}" x2="${f1(x(v))}" y2="${f1(y(yMax))}" stroke="currentColor" stroke-width="0.5" opacity="0.2" />`);
    }
  }
  if (yEvery > 0) {
    for (let j = 0; j * yEvery <= yMax + 1e-9; j += 1) {
      parts.push(
        `<text class="hist-y" x="${left - 4}" y="${f1(y(j * yEvery) + 3.5)}" font-size="9" fill="currentColor" text-anchor="end">${fmt(j * yEvery)}</text>`,
      );
    }
  }
  heights.forEach((h, i) => {
    if (h === null) return;
    const at = `x="${f1(x(bounds[i]))}" y="${f1(y(h))}" width="${f1(x(bounds[i + 1]) - x(bounds[i]))}" height="${f1(y(0) - y(h))}"`;
    parts.push(`<rect class="plot-shade" ${at} />`, `<rect class="hist-bar" ${at} fill="none" stroke="currentColor" stroke-width="1.5" />`);
  });
  parts.push(
    `<line x1="${left}" y1="${f1(y(0))}" x2="${right}" y2="${f1(y(0))}" stroke="currentColor" stroke-width="1" opacity="0.7" />`,
    `<line x1="${left}" y1="${f1(y(0))}" x2="${left}" y2="${FIG_PAD}" stroke="currentColor" stroke-width="1" opacity="0.7" />`,
  );
  for (const b of bounds) {
    parts.push(`<text class="hist-x" x="${f1(x(b))}" y="${f1(y(0) + 13)}" font-size="9" fill="currentColor" text-anchor="middle">${fmt(b)}</text>`);
  }
  parts.push('</svg>');
  return parts.join('');
}

interface HistParams {
  /** Class boundaries, one more than there are classes. */
  bounds: number[];
  freqs: number[];
  context: number;
}

const classWidths = ({ bounds, freqs }: HistParams): number[] => freqs.map((_, i) => bounds[i + 1] - bounds[i]);
const densities = (p: HistParams): number[] => classWidths(p).map((w, i) => p.freqs[i] / w);

/** How a draw is made: the widths on offer, and densities as whole numbers of `step`. */
interface HistRule {
  widths: number[];
  step: number;
  units: [number, number];
  /** Numbers up the side every this much. */
  every: number;
}

/** Whole densities up to 10 on classes of 5, 10 and 20. */
const HIST_EASY: HistRule = { widths: [5, 10, 20], step: 1, units: [1, 10], every: 2 };
/** Densities in fifths up to 3, on classes as awkward as 15, 25 and 40. Every frequency is still whole. */
const HIST_HARD: HistRule = { widths: [5, 10, 15, 20, 25, 40], step: 0.2, units: [2, 15], every: 1 };

const histRule = (difficulty: number): HistRule => (difficulty > 1 ? HIST_HARD : HIST_EASY);

/** The rule a draw was made under: only difficulty 2 draws more than three classes. */
const ruleOf = (p: { freqs: readonly number[] }): HistRule => histRule(p.freqs.length > 3 ? 2 : 1);

/**
 * `k` classes of at least two different widths, none narrower than a
 * thirteenth of the whole so its boundary numbers do not collide, with a
 * density on the rule's grid and so a whole frequency.
 */
function sampleHist(rng: Rng, k: number, rule: HistRule, accept: (p: HistParams) => boolean = () => true): HistParams {
  for (;;) {
    const ws = Array.from({ length: k }, () => rng.pick(rule.widths));
    if (new Set(ws).size < 2 || Math.min(...ws) * 13 < total(ws)) continue;
    const bounds = [10 * rng.int(0, 5)];
    for (const w of ws) bounds.push(bounds[bounds.length - 1] + w);
    const freqs = ws.map((w) => Math.round(rng.int(rule.units[0], rule.units[1]) * rule.step * w));
    const params = { bounds, freqs, context: rng.int(0, GROUPED_CONTEXTS.length - 1) };
    if (densities(params).some((d) => !exact(d / rule.step, 0))) continue;
    if (accept(params)) return params;
  }
}

/** The vertical scale for a histogram under a rule: its lines, its numbers and its top. */
function histScale(p: HistParams, rule: HistRule) {
  const top = Math.max(...densities(p));
  return { yMax: Math.ceil(top / rule.every - 1e-9) * rule.every, yStep: rule.step, yEvery: rule.every };
}

const histLabel = (p: HistParams): string =>
  `A histogram of ${p.freqs.length} classes from ${p.bounds[0]} to ${p.bounds[p.bounds.length - 1]}, with frequency density up the side`;

function histFigure(p: HistParams, rule: HistRule, hide?: number): string {
  return histogramSvg({
    bounds: p.bounds,
    heights: densities(p).map((d, i) => (i === hide ? null : d)),
    ...histScale(p, rule),
    label: histLabel(p),
  });
}

const histPrompt = (p: HistParams, rule: HistRule, ask: string): Block[] => [
  { kind: 'diagram', svg: histFigure(p, rule) },
  say(`${GROUPED_CONTEXTS[p.context]} The vertical scale is frequency density. ${ask}`),
];

const classOf = (p: HistParams, i: number): string => classTex(p.bounds[i], p.bounds[i + 1]);

/** Frequency density written out for one class. */
const densityLine = (p: HistParams, i: number): string =>
  `\\frac{${p.freqs[i]}}{${classWidths(p)[i]}} = ${fmt(densities(p)[i])}`;

/**
 * Each class's width and frequency density filled in from a grouped table:
 * three classes with whole densities at difficulty 1, four with densities in
 * fifths and awkward widths at 2.
 */
const fdTable: Generator<HistParams> = {
  id: 'dat-fd-table',
  sample: (rng, difficulty) => sampleHist(rng, difficulty > 1 ? 4 : 3, histRule(difficulty)),
  render: (params): Slide => {
    const ws = classWidths(params);
    const ds = densities(params);
    const answer = ws.flatMap((w, i) => [w, ds[i]]);
    const slips = params.freqs.flatMap((f, i) => [ws[i] / f, params.bounds[i + 1], f - ws[i], f / 10]);
    return {
      kind: 'table',
      prompt: [say(`${GROUPED_CONTEXTS[params.context]} The classes are different widths. Fill in each class's width, then its frequency density: the frequency divided by the width.`)],
      columns: ['\\text{Class}', 'f', '\\text{Width}', '\\text{Density}'],
      rows: params.freqs.map((f, i) => [classOf(params, i), `${f}`, null, null]),
      bank: valueBank(answer, slips, 3, ruleOf(params).step),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => [
    { text: 'Each width is the top of the class take the bottom. Each density is the frequency over the width:' },
    { tex: aligned(...params.freqs.map((_, i) => `${classWidths(params)[i]}: \\quad ${densityLine(params, i).replace(' = ', ' &= ')}`)) },
    { text: 'The density is how many values there are per unit of width, which is what makes unequal classes comparable.' },
  ],
};

interface HistClassParams extends HistParams {
  /** The class the question is about. */
  at: number;
}

/**
 * One class's frequency density as tiles, the frequency over the width. A
 * whole density at difficulty 1; at 2 the width is 15, 20, 25 or 40 and the
 * density a decimal.
 */
const fdTiles: Generator<HistClassParams> = {
  id: 'dat-fd-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const params = sampleHist(rng, hard ? 4 : 3, histRule(difficulty));
      const at = rng.int(0, params.freqs.length - 1);
      const w = classWidths(params)[at];
      if (hard && (w < 15 || whole(densities(params)[at]))) continue;
      return { ...params, at };
    }
  },
  render: (params): Slide => {
    const { at } = params;
    const f = params.freqs[at];
    const w = classWidths(params)[at];
    const d = densities(params)[at];
    return {
      kind: 'tiles',
      prompt: [
        say(GROUPED_CONTEXTS[params.context]),
        show(groupedTableTex(params.bounds, params.freqs)),
        say(`Fill in the working for the frequency density of $${classOf(params, at)}$.`),
      ],
      template: '\\text{density} = {0} \\div {1} = {2}',
      bank: valueBank([f, w, d], [w / f, params.bounds[at + 1], params.bounds[at], f * w, 2 * d, f / 10]),
      answer: [fmt(f), fmt(w), fmt(d)],
    };
  },
  solution: (params) => [
    { text: `The class $${classOf(params, params.at)}$ is $${params.bounds[params.at + 1]} - ${params.bounds[params.at]} = ${classWidths(params)[params.at]}$ wide.` },
    { tex: `\\text{density} = ${densityLine(params, params.at)}` },
  ],
};

/**
 * Slide the marker up to the height a missing bar should be: its frequency
 * over its width. Whole densities at difficulty 1, fifths at 2.
 */
const fdSlider: Generator<HistClassParams> = {
  id: 'dat-fd-slider',
  sample: (rng, difficulty) => {
    const rule = histRule(difficulty);
    for (;;) {
      const params = sampleHist(rng, difficulty > 1 ? 4 : 3, rule);
      const at = rng.int(0, params.freqs.length - 1);
      const { yMax } = histScale(params, rule);
      // The handle starts in the middle, where an untouched answer must not score.
      if (Math.abs(densities(params)[at] - Math.round(yMax / 2 / rule.step) * rule.step) < 1e-9) continue;
      return { ...params, at };
    }
  },
  render: (params): Slide => {
    const rule = ruleOf(params);
    const { yMax } = histScale(params, rule);
    return {
      kind: 'slider',
      prompt: [
        say(
          `${GROUPED_CONTEXTS[params.context]} The histogram is missing the bar for $${classOf(params, params.at)}$, which has a frequency of $${params.freqs[params.at]}$. Slide the marker to the height that bar should be.`,
        ),
      ],
      min: 0,
      max: yMax,
      step: rule.step,
      answer: densities(params)[params.at],
      readout: '\\text{density} = {v}',
      figure: {
        svg: histFigure(params, rule, params.at),
        ...markerWindow(histFloor(yMax), yMax, 'y', HIST_HEIGHT),
        axis: 'y',
      },
    };
  },
  solution: (params) => [
    { text: 'A bar is as tall as its frequency density, the frequency over the class width.' },
    { tex: `\\text{density} = ${densityLine(params, params.at)}` },
  ],
};

interface HistAreaParams extends HistClassParams {
  /** Two classes, `at` and the one after, at difficulty 2. */
  two: boolean;
}

/**
 * The frequency from a bar's area, density times width: one bar with a
 * whole density at difficulty 1, two neighbouring bars in fifths at 2.
 */
const fdArea: Generator<HistAreaParams> = {
  id: 'dat-fd-area',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const params = sampleHist(rng, hard ? 4 : 3, histRule(difficulty));
    return { ...params, at: rng.int(0, params.freqs.length - (hard ? 2 : 1)), two: hard };
  },
  render: (params): Slide => {
    const { at, two } = params;
    const rule = ruleOf(params);
    const end = two ? at + 2 : at + 1;
    return {
      kind: 'expression',
      prompt: histPrompt(
        params,
        rule,
        two
          ? `How many values are in $${classTex(params.bounds[at], params.bounds[end])}$?`
          : `How many values are in the class $${classOf(params, at)}$?`,
      ),
      lead: 'f =',
      keypad: NUMBER_KEYS,
      answer: fmt(total(params.freqs.slice(at, end))),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { at, two } = params;
    const ds = densities(params);
    const ws = classWidths(params);
    const bars = two ? [at, at + 1] : [at];
    const steps: SolutionStep[] = [
      { text: 'The frequency is the area of the bar: its height, the density, times its width.' },
      { tex: aligned(...bars.map((i) => `${fmt(ds[i])} \\times ${ws[i]} &= ${params.freqs[i]}`)) },
    ];
    if (two) steps.push({ tex: `${params.freqs[at]} + ${params.freqs[at + 1]} = ${params.freqs[at] + params.freqs[at + 1]}` });
    return steps;
  },
};

interface HistPartParams extends HistParams {
  /** The range asked about runs from `p` in class `i` to `q` in class `i + 1`. */
  i: number;
  p: number;
  q: number;
}

/** The two pieces of area a range covers: the end of bar `i` and the start of bar `i + 1`. */
function histPieces({ i, p, q, ...h }: HistPartParams): [number, number] {
  const ds = densities(h);
  return [ds[i] * (h.bounds[i + 1] - p), ds[i + 1] * (q - h.bounds[i + 1])];
}

/**
 * The frequency in a range that takes part of a bar, by the share of its
 * width: a whole bar and part of the next at difficulty 1, part of each of two
 * bars at 2. Every piece comes to a whole number.
 */
const histPart: Generator<HistPartParams> = {
  id: 'dat-hist-part',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const h = sampleHist(rng, hard ? 4 : 3, histRule(difficulty));
      const i = rng.int(0, h.freqs.length - 2);
      const ws = classWidths(h);
      const p = hard ? h.bounds[i + 1] - rng.int(1, ws[i] - 1) : h.bounds[i];
      const q = h.bounds[i + 1] + rng.int(1, ws[i + 1] - 1);
      const params = { ...h, i, p, q };
      if (histPieces(params).some((piece) => !whole(piece) || piece === 0)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const [a, b] = histPieces(params);
    const ds = densities(params);
    const answer = [a, b, a + b];
    const slips = [params.freqs[params.i], params.freqs[params.i + 1], ds[params.i], ds[params.i + 1], params.q - params.p, params.freqs[params.i] + params.freqs[params.i + 1]];
    return {
      kind: 'tree',
      prompt: histPrompt(
        params,
        ruleOf(params),
        `Estimate how many values lie between $${params.p}$ and $${params.q}$. Top row: the part in the first bar, then the part in the second. Underneath, the total.`,
      ),
      expression: 'f = \\text{density} \\times \\text{width}',
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: [] },
        { id: 't', from: ['a', 'b'] },
      ],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { i, p, q, bounds } = params;
    const ds = densities(params);
    const [a, b] = histPieces(params);
    return [
      { text: `From $${p}$ to $${q}$ takes $${bounds[i + 1] - p}$ of the width of the bar at height $${fmt(ds[i])}$, and $${q - bounds[i + 1]}$ of the next, at height $${fmt(ds[i + 1])}$.` },
      { tex: aligned(`${fmt(ds[i])} \\times ${bounds[i + 1] - p} &= ${fmt(a)}`, `${fmt(ds[i + 1])} \\times ${q - bounds[i + 1]} &= ${fmt(b)}`) },
      { text: `About $${fmt(a + b)}$ values. An estimate, since it takes the values in a class to be spread evenly across it.` },
    ];
  },
};

/**
 * Every bar's frequency read off as its area, then the total: three classes
 * with whole densities at difficulty 1, four or five in fifths at 2.
 */
const histTotal: Generator<HistParams> = {
  id: 'dat-hist-total',
  sample: (rng, difficulty) => sampleHist(rng, difficulty > 1 ? rng.int(4, 5) : 3, histRule(difficulty)),
  render: (params): Slide => {
    const ds = densities(params);
    const answer = [...params.freqs, total(params.freqs)];
    const slips = [...ds, total(ds), total(params.freqs) + classWidths(params)[0]];
    return {
      kind: 'table',
      prompt: histPrompt(params, ruleOf(params), 'Fill in the frequency of each class, then the total.'),
      columns: ['\\text{Class}', 'f'],
      rows: [...params.freqs.map((_, i) => [classOf(params, i), null]), ['\\text{Total}', null]],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const ds = densities(params);
    const ws = classWidths(params);
    return [
      { text: 'Each frequency is a bar\'s area, its height times its width:' },
      { tex: aligned(...params.freqs.map((f, i) => `${fmt(ds[i])} \\times ${ws[i]} &= ${f}`)) },
      { text: `Adding the areas: $${params.freqs.join(' + ')} = ${total(params.freqs)}$.` },
    ];
  },
};

interface HistTallestParams extends HistParams {
  ask: 'most' | 'fewest';
}

/**
 * Which class holds the most values, or the fewest, drawn so that the tallest
 * bar (or the shortest) is not the answer: height is density, and a wide low
 * bar can hold more. Three classes and the most at difficulty 1; four or five
 * and either at 2.
 */
const histTallest: Generator<HistTallestParams> = {
  id: 'dat-hist-tallest',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const ask = hard ? rng.pick(['most', 'fewest'] as const) : 'most';
    const pickOf = (xs: number[]) => (ask === 'most' ? Math.max(...xs) : Math.min(...xs));
    const params = sampleHist(rng, hard ? rng.int(4, 5) : 3, histRule(difficulty), (p) => {
      const ds = densities(p);
      const f = pickOf(p.freqs);
      const d = pickOf(ds);
      if (p.freqs.filter((x) => x === f).length > 1 || ds.filter((x) => x === d).length > 1) return false;
      return p.freqs.indexOf(f) !== ds.indexOf(d);
    });
    return { ...params, ask };
  },
  render: (params): Slide => {
    const pick = params.ask === 'most' ? Math.max(...params.freqs) : Math.min(...params.freqs);
    const right = params.freqs.indexOf(pick);
    const opts = params.freqs.map((_, i) => ({ tex: classOf(params, i), correct: i === right ? true : undefined }));
    return choiceSlide(
      histPrompt(params, ruleOf(params), `Which class has the ${params.ask} values?`),
      opts,
      `${params.bounds.join(',')}|${params.freqs.join(',')}|${params.ask}`,
    );
  },
  solution: (params) => {
    const ds = densities(params);
    const ws = classWidths(params);
    const pick = params.ask === 'most' ? Math.max(...params.freqs) : Math.min(...params.freqs);
    const i = params.freqs.indexOf(pick);
    const bar = params.ask === 'most' ? ds.indexOf(Math.max(...ds)) : ds.indexOf(Math.min(...ds));
    return [
      { text: `The ${params.ask === 'most' ? 'tallest' : 'shortest'} bar is $${classOf(params, bar)}$, but height is frequency density, not frequency. The frequency is the area, bar by bar from the left:` },
      { tex: aligned(...params.freqs.map((f, j) => `${fmt(ds[j])} \\times ${ws[j]} &= ${f}`)) },
      { text: `So $${classOf(params, i)}$ has the ${params.ask} values, $${pick}$.` },
    ];
  },
};

interface HistScaleParams {
  bounds: number[];
  /** Bar heights in squares of the grid. */
  heights: number[];
  /** The width of one square along the bottom. */
  grid: number;
  /** Values per square. */
  per: number;
  known: number;
  asked: number;
  context: number;
}

const squaresOf = ({ bounds, heights, grid }: HistScaleParams, i: number): number => ((bounds[i + 1] - bounds[i]) / grid) * heights[i];

/**
 * A histogram with no numbers up the side: one class's frequency is given,
 * which fixes how many values a square of the grid stands for, and another
 * class's frequency follows from its area in squares. Whole values per
 * square at difficulty 1; a half at 2, over four classes.
 */
const histScaleGen: Generator<HistScaleParams> = {
  id: 'dat-hist-scale',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const k = hard ? 4 : 3;
    for (;;) {
      const grid = hard ? rng.pick([5, 10]) : 5;
      const spans = Array.from({ length: k }, () => rng.int(1, 4));
      if (new Set(spans).size < 2 || total(spans) > 12) continue;
      const bounds = [10 * rng.int(0, 5)];
      for (const s of spans) bounds.push(bounds[bounds.length - 1] + s * grid);
      const heights = Array.from({ length: k }, () => rng.int(1, 8));
      const per = hard ? rng.pick([0.5, 1.5, 2.5]) : rng.int(1, 5);
      const [known, asked] = rng.sample(Array.from({ length: k }, (_, i) => i), 2);
      const params = { bounds, heights, grid, per, known, asked, context: rng.int(0, GROUPED_CONTEXTS.length - 1) };
      const sk = squaresOf(params, known);
      const sa = squaresOf(params, asked);
      if (sk === sa || heights[known] === heights[asked] || !whole(per * sk) || !whole(per * sa)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { bounds, heights, grid, known, asked, per } = params;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'diagram',
          svg: histogramSvg({
            bounds,
            heights,
            yMax: Math.max(...heights) + 1,
            yStep: 1,
            yEvery: 0,
            xGrid: grid,
            label: `A histogram of ${heights.length} classes on squared lines, with no numbers up the side`,
          }),
        },
        say(
          `${GROUPED_CONTEXTS[params.context]} The vertical scale is not numbered. The class $${classTex(bounds[known], bounds[known + 1])}$ has a frequency of $${fmt(per * squaresOf(params, known))}$. How many values are in $${classTex(bounds[asked], bounds[asked + 1])}$?`,
        ),
      ],
      lead: 'f =',
      keypad: NUMBER_KEYS,
      answer: fmt(per * squaresOf(params, asked)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { bounds, heights, grid, known, asked, per } = params;
    const sk = squaresOf(params, known);
    const sa = squaresOf(params, asked);
    const size = (i: number) => `${(bounds[i + 1] - bounds[i]) / grid} \\times ${heights[i]} = ${squaresOf(params, i)}`;
    return [
      { text: `Frequency is area, so count squares. The bar for $${classTex(bounds[known], bounds[known + 1])}$ covers $${size(known)}$ squares.` },
      { text: `So one square stands for $${fmt(per * sk)} \\div ${sk} = ${fmt(per)}$ values.` },
      { text: `The bar for $${classTex(bounds[asked], bounds[asked + 1])}$ covers $${size(asked)}$ squares.` },
      { tex: `f = ${sa} \\times ${fmt(per)} = ${fmt(per * sa)}` },
    ];
  },
};

/* ================================================================
 * Level 4: cumulative frequency
 * ================================================================ */

/**
 * What a grouped table could hold. Units live here, in prose, and never in a
 * template or a readout.
 */
const CF_CONTEXTS: { of: (n: number) => string; starts: number[]; widths: number[] }[] = [
  { of: (n) => `the finishing times of ${n} runners in a fun run, in minutes`, starts: [20, 30, 40], widths: [5, 10] },
  { of: (n) => `the masses of ${n} apples, in grams`, starts: [80, 100, 120], widths: [10, 20] },
  { of: (n) => `the heights of ${n} seedlings, in millimetres`, starts: [0, 10, 20], widths: [5, 10] },
  { of: (n) => `the times ${n} pupils took to solve a puzzle, in seconds`, starts: [0, 20, 40], widths: [10, 20] },
  { of: (n) => `the lengths of ${n} leaves, in millimetres`, starts: [30, 40, 50], widths: [5, 10] },
  { of: (n) => `the journey times to work of ${n} people, in minutes`, starts: [0, 10], widths: [5, 10] },
  { of: (n) => `the marks of ${n} students in a test out of 100`, starts: [20, 30], widths: [10] },
];

interface CfParams {
  /** Class boundaries, one more than there are classes. */
  bounds: number[];
  fs: number[];
  context: number;
}

/** The running totals of a list of frequencies: the cumulative frequency column. */
const running = (fs: readonly number[]): number[] => {
  let t = 0;
  return fs.map((f) => (t += f));
};

const cfN = (p: CfParams): number => total(p.fs);
const cfIntro = (p: CfParams): string => CF_CONTEXTS[p.context].of(cfN(p));

/**
 * A grouped table: four or five classes at difficulty 1, five or six at 2.
 * With `mixed`, one class after the first is twice as wide as the rest, so a
 * class width cannot be carried from one row to the next without looking.
 */
function sampleCf(rng: Rng, difficulty: number, accept: (p: CfParams) => boolean, mixed = false): CfParams {
  const hard = difficulty > 1;
  for (;;) {
    const context = rng.int(0, CF_CONTEXTS.length - 1);
    const { starts, widths } = CF_CONTEXTS[context];
    const w = rng.pick(widths);
    const k = hard ? (mixed ? 5 : rng.int(5, 6)) : rng.int(4, 5);
    const sizes = Array.from({ length: k }, () => w);
    if (mixed && hard) sizes[rng.int(1, k - 1)] = 2 * w;
    const bounds = [rng.pick(starts)];
    for (const size of sizes) bounds.push(bounds[bounds.length - 1] + size);
    const params = { bounds, fs: ints(rng, k, 2, hard ? 24 : 15), context };
    if (accept(params)) return params;
  }
}

interface Reading {
  /** The class the position falls in, by running totals. */
  i: number;
  /** How many values lie below that class. */
  before: number;
  lo: number;
  width: number;
  f: number;
  value: number;
}

/**
 * Where position `pos` sits: its class by running totals, then the value
 * interpolated inside it. The curve is drawn with straight joins, so this is
 * also exactly what reading across and down the curve gives.
 */
function readAt(p: CfParams, pos: number): Reading {
  const i = classAt(p, pos);
  const before = i === 0 ? 0 : running(p.fs)[i - 1];
  const lo = p.bounds[i];
  const width = p.bounds[i + 1] - lo;
  const f = p.fs[i];
  return { i, before, lo, width, f, value: Number(fmt(lo + ((pos - before) * width) / f)) };
}

/** How far through its class a position is, in tenths: 10 is the class's top. */
function tenths(p: CfParams, pos: number): number {
  const r = readAt(p, pos);
  return (10 * (pos - r.before)) / r.f;
}

/**
 * A reading that lands on a grid line: halfway through its class or at its
 * top, each class being two squares wide. What difficulty 1 asks.
 */
function onGrid(p: CfParams, pos: number): boolean {
  const t = tenths(p, pos);
  return pos > 0 && whole(t) && t % 5 === 0;
}

/**
 * A reading a whole number of tenths through its class, and not on a grid
 * line, so it has to be judged between the lines. What difficulty 2 asks.
 */
function betweenLines(p: CfParams, pos: number): boolean {
  const t = tenths(p, pos);
  return pos > 0 && whole(t) && t % 5 !== 0;
}

/** How many values the curve puts below `x`: the running total, plus a share of the class it falls in. */
function countBelow(p: CfParams, x: number): number {
  const totals = running(p.fs);
  for (let i = 0; i < p.fs.length; i += 1) {
    const lo = p.bounds[i];
    const hi = p.bounds[i + 1];
    if (x <= hi) return Number(fmt((i === 0 ? 0 : totals[i - 1]) + ((x - lo) * p.fs[i]) / (hi - lo)));
  }
  return cfN(p);
}

/**
 * Values of x inside a class where the curve's height is a whole number:
 * only halfway along at difficulty 1, any other tenth at 2.
 */
function insideReads(p: CfParams, grid: boolean): number[] {
  const xs: number[] = [];
  for (let i = 0; i < p.fs.length; i += 1) {
    const lo = p.bounds[i];
    const width = p.bounds[i + 1] - lo;
    for (const t of grid ? [5] : [1, 2, 3, 4, 6, 7, 8, 9]) {
      const x = Number(fmt(lo + (t * width) / 10));
      if (whole(countBelow(p, x))) xs.push(x);
    }
  }
  return xs;
}

/** A grouped table with its running totals beside the frequencies, or without them. */
function cfTableTex({ bounds, fs }: CfParams, withTotals: boolean): string {
  const totals = running(fs);
  const rows = fs
    .map((f, i) => `${classTex(bounds[i], bounds[i + 1])} & ${f}${withTotals ? ` & ${totals[i]}` : ''}`)
    .join(' \\\\ ');
  return `\\begin{array}{c|c${withTotals ? '|c' : ''}} \\text{Class} & f${withTotals ? ' & \\text{cf}' : ''} \\\\ \\hline ${rows} \\end{array}`;
}

/* ---------- the curve ---------- */

/** plotSvg's own width and inset, repeated so the scale lands where it draws (as `logGraphSvg` does). */
const CF_WIDTH = 280;
const CF_PAD = 12;
export const CF_HEIGHT = 220;
/** Just short of a whole square below and left of the axes: room for the scale, and no stray grid line. */
const CF_EDGE = -0.95;

interface CfFrame {
  /** The lowest boundary, where the vertical axis stands. */
  x0: number;
  /** Data units per square across (half the narrowest class) and up. */
  sx: number;
  sy: number;
  /** The window's far edges, in squares. */
  uMax: number;
  vMax: number;
}

function cfFrame({ bounds, fs }: Pick<CfParams, 'bounds' | 'fs'>): CfFrame {
  const widths = bounds.slice(1).map((b, i) => b - bounds[i]);
  const sx = Math.min(...widths) / 2;
  const n = total(fs);
  const sy = [1, 2, 5, 10, 20].find((s) => n / s <= 12) ?? 25;
  return {
    x0: bounds[0],
    sx,
    sy,
    uMax: (bounds[bounds.length - 1] - bounds[0]) / sx + 0.4,
    vMax: Math.ceil(n / sy) + 0.4,
  };
}

/** How a curve was plotted: correctly, or with one of the three usual mistakes. */
type CfPlot = 'right' | 'frequency' | 'midpoint' | 'nostart';

/**
 * A cumulative frequency curve on squared paper, with a scale.
 *
 * plotSvg draws squares at every whole unit and no numbers, so the data are
 * drawn in squares (half the narrowest class across, a round count up) and
 * the scale is laid over it as SVG text, as `logGraphSvg` does. Plain
 * numbers only: KaTeX cannot render inside SVG. The points are joined by
 * straight lines, so a reading across and down is exactly the interpolation
 * lesson 5 does by arithmetic.
 *
 * `across` and `down` draw dashed read-off lines at a cumulative frequency
 * and at a value; `plot` draws one of the usual mistakes, for a question
 * about whether a curve is right.
 */
export function cumulativeSvg(
  p: Pick<CfParams, 'bounds' | 'fs'>,
  { across = [], down = [], plot = 'right' }: { across?: number[]; down?: number[]; plot?: CfPlot } = {},
): string {
  const frame = cfFrame(p);
  const { x0, sx, sy, uMax, vMax } = frame;
  const totals = running(p.fs);
  const points: Point[] = plot === 'nostart' ? [] : [[p.bounds[0], 0]];
  p.fs.forEach((f, i) => {
    const x = plot === 'midpoint' ? (p.bounds[i] + p.bounds[i + 1]) / 2 : p.bounds[i + 1];
    points.push([x, plot === 'frequency' ? f : totals[i]]);
  });
  const squares = points.map(([x, y]): Point => [(x - x0) / sx, y / sy]);
  const curve = (u: number): number => {
    for (let j = 0; j + 1 < squares.length; j += 1) {
      const [ua, va] = squares[j];
      const [ub, vb] = squares[j + 1];
      if (u >= ua && u <= ub) return va + ((u - ua) * (vb - va)) / (ub - ua);
    }
    return NaN;
  };
  const svg = plotSvg({
    xMin: CF_EDGE,
    xMax: uMax,
    yMin: CF_EDGE,
    yMax: vMax,
    height: CF_HEIGHT,
    grid: true,
    curves: [{ f: curve, accent: true, breaks: true }],
    marks: squares.map(([x, y]) => ({ x, y })),
    horizontals: across.map((y) => y / sy),
    verticals: down.map((x) => ({ x: (x - x0) / sx })),
    label: `A cumulative frequency curve through ${points.length} points, from ${fmt(p.bounds[0])} to ${fmt(p.bounds[p.bounds.length - 1])}, on a grid`,
  });
  const px = (u: number) => CF_PAD + ((u - CF_EDGE) / (uMax - CF_EDGE)) * (CF_WIDTH - 2 * CF_PAD);
  const py = (v: number) => CF_PAD + ((vMax - v) / (vMax - CF_EDGE)) * (CF_HEIGHT - 2 * CF_PAD);
  const text = (axis: 'x' | 'y', x: number, y: number, anchor: string, words: string) =>
    `<text data-axis="${axis}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="10" fill="currentColor" text-anchor="${anchor}">${words}</text>`;
  // The lowest boundary sits in the corner, left of the upright axis, which
  // would otherwise run through the middle of it.
  const scale = [
    ...p.bounds.map((b, j) =>
      j === 0 ? text('x', px(0) - 3, py(0) + 11, 'end', fmt(b)) : text('x', px((b - x0) / sx), py(0) + 11, 'middle', fmt(b)),
    ),
    ...Array.from({ length: Math.floor(vMax / 2) }, (_, j) => 2 * (j + 1)).map((v) =>
      text('y', px(0) - 4, py(v) + 3.5, 'end', fmt(v * sy)),
    ),
  ];
  return svg.replace('</svg>', `${scale.join('')}</svg>`);
}

/** The span a slider's marker declares over a curve, along the values or up the counts. */
function cfMarker(p: CfParams, axis: 'x' | 'y') {
  const { x0, sx, sy, uMax, vMax } = cfFrame(p);
  return axis === 'x'
    ? { ...markerWindow(x0 + CF_EDGE * sx, x0 + uMax * sx) }
    : { ...markerWindow(CF_EDGE * sy, vMax * sy, 'y', CF_HEIGHT), axis: 'y' as const };
}

/**
 * Whether an answer sits clear of where the slider's handle rests before it
 * is touched. A handle resting on the answer would give it away, and the
 * middle of the track is often exactly a boundary or a halfway point.
 */
const clearOfRest = (answer: number, min: number, max: number, step: number, tolerance: number): boolean =>
  Math.abs(answer - defaultSliderValue(min, max, step)) > tolerance + 1e-9;

/** The drag step and tolerance of a slider along the values: a tenth of the narrowest class. */
const cfStep = (p: CfParams): number => cfFrame(p).sx / 5;

/** Whether a reading along the values is clear of the handle's resting place. */
const acrossClear = (p: CfParams, pos: number): boolean =>
  clearOfRest(readAt(p, pos).value, p.bounds[0], p.bounds[p.bounds.length - 1], cfStep(p), cfStep(p));

/** How close a count read up the curve must be: a quarter of a square, and never under a half. */
const upTolerance = (p: CfParams): number => Math.max(0.5, cfFrame(p).sy / 4);

const cfDiagram = (p: CfParams, opts: Parameters<typeof cumulativeSvg>[1] = {}): Block => ({
  kind: 'diagram',
  svg: cumulativeSvg(p, opts),
});

/* ---------- which statistic ---------- */

/** A percentile's name, with the median and quartiles called what they are. */
function pctName(pct: number): string {
  if (pct === 50) return 'median';
  if (pct === 25) return 'lower quartile';
  if (pct === 75) return 'upper quartile';
  return `${nth(pct)} percentile`;
}

function pctSymbol(pct: number): string {
  if (pct === 50) return '\\text{median}';
  if (pct === 25) return 'Q_1';
  if (pct === 75) return 'Q_3';
  return `P_{${pct}}`;
}

const pctPosition = (p: CfParams, pct: number): number => Number(fmt((pct * cfN(p)) / 100));

/** The class and interpolation, written out for any position. */
function interpolationSolution(p: CfParams, pct: number): SolutionStep[] {
  const pos = pctPosition(p, pct);
  const r = readAt(p, pos);
  const totals = running(p.fs);
  return [
    { text: `The ${pctName(pct)} is at position $\\frac{${pct}}{100} \\times ${cfN(p)} = ${fmt(pos)}$.` },
    { text: `Running totals: ${totals.map((t) => `$${t}$`).join(', ')}. So $${r.before}$ values lie below $${fmt(r.lo)}$, and position $${fmt(pos)}$ is in $${classTex(r.lo, r.lo + r.width)}$.` },
    { text: `It is $${fmt(pos)} - ${r.before} = ${fmt(pos - r.before)}$ of the $${r.f}$ values into that class, which is $${fmt(r.width)}$ wide.` },
    { tex: `${fmt(r.lo)} + \\frac{${fmt(pos - r.before)}}{${r.f}} \\times ${fmt(r.width)} = ${fmt(r.value)}` },
  ];
}

/* ---------- lesson 1: cumulative frequency tables ---------- */

interface CfTableParams extends CfParams {
  /** At difficulty 2, a row whose frequency is hidden and whose running total is given instead. */
  hidden: number;
}

function runningSolution(p: CfParams): SolutionStep[] {
  const totals = running(p.fs);
  return [
    { text: 'Each running total is the one above it plus the next frequency:' },
    { tex: aligned(`${p.fs[0]} &= ${totals[0]}`, ...totals.slice(1).map((t, i) => `${totals[i]} + ${p.fs[i + 1]} &= ${t}`)) },
    { text: `The last total, $${cfN(p)}$, is how many values there are altogether.` },
  ];
}

/**
 * The cumulative frequency column filled in down a grouped table. At
 * difficulty 2 one frequency is missing and its running total is given, so it
 * has to be found by taking away the total above.
 */
const cfTable: Generator<CfTableParams> = {
  id: 'dat-cf-table',
  sample: (rng, difficulty) => {
    const params = sampleCf(rng, difficulty, () => true);
    return { ...params, hidden: difficulty > 1 ? rng.int(1, params.fs.length - 2) : -1 };
  },
  render: (params): Slide => {
    const { bounds, fs, hidden } = params;
    const totals = running(fs);
    const answer = fs.map((f, i) => (i === hidden ? f : totals[i]));
    const slips = [...fs.slice(1).map((f, i) => f + fs[i]), cfN(params) + fs[0], totals[totals.length - 1] - 1];
    return {
      kind: 'table',
      prompt: [
        say(
          `The table shows ${cfIntro(params)}. Fill in the cumulative frequency column: the running total of the frequencies.${hidden >= 0 ? ' One frequency is missing, and its running total is given instead.' : ''}`,
        ),
      ],
      columns: ['\\text{Class}', 'f', '\\text{cf}'],
      rows: fs.map((f, i) =>
        i === hidden ? [classTex(bounds[i], bounds[i + 1]), null, `${totals[i]}`] : [classTex(bounds[i], bounds[i + 1]), `${f}`, null],
      ),
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const steps = runningSolution(params);
    const h = params.hidden;
    if (h < 0) return steps;
    const totals = running(params.fs);
    return [
      { text: `The missing frequency is its running total take the one above: $${totals[h]} - ${totals[h - 1]} = ${params.fs[h]}$.` },
      ...steps,
    ];
  },
};

interface CfPointParams extends CfParams {
  /** The class asked about; never the first, so its running total is not its frequency. */
  at: number;
  /** Whether the running totals are printed in the table (difficulty 1) or left to work out. */
  given: boolean;
}

/**
 * Which point a class puts on the curve: its upper boundary against its
 * running total. The slips are the midpoint, the lower boundary, and the
 * frequency in place of the running total. The running totals are given at
 * difficulty 1 and have to be worked out at 2.
 */
const cfPoint: Generator<CfPointParams> = {
  id: 'dat-cf-point',
  sample: (rng, difficulty) => {
    const params = sampleCf(rng, difficulty, () => true);
    return { ...params, at: rng.int(1, params.fs.length - 1), given: difficulty === 1 };
  },
  render: (params): Slide => {
    const { bounds, fs, at } = params;
    const c = running(fs)[at];
    const lo = bounds[at];
    const hi = bounds[at + 1];
    const point = (x: number, y: number) => `(${fmt(x)}, ${y})`;
    const opts = [
      { tex: point(hi, c), correct: true },
      { tex: point((lo + hi) / 2, c) },
      { tex: point(lo, c) },
      { tex: point(hi, fs[at]) },
    ];
    return choiceSlide(
      [
        say(`The table shows ${cfIntro(params)}.`),
        show(cfTableTex(params, params.given)),
        say(`Which point goes on the cumulative frequency curve for the class $${classTex(lo, hi)}$?`),
      ],
      opts,
      `cfpoint${bounds.join(',')}|${fs.join(',')}|${at}`,
    );
  },
  solution: (params) => {
    const { bounds, fs, at } = params;
    const totals = running(fs);
    return [
      ...(!params.given
        ? [{ text: `Running totals first: ${totals.map((t) => `$${t}$`).join(', ')}.` }]
        : []),
      { text: `By the end of the class, at its upper boundary $${fmt(bounds[at + 1])}$, $${totals[at]}$ values have been counted.` },
      { text: `So the point is $(${fmt(bounds[at + 1])}, ${totals[at]})$: the upper boundary, not the midpoint, and the running total, not the frequency.` },
    ];
  },
};

/**
 * The table run backwards: the running totals are given and the frequencies
 * are found by taking each total away from the next.
 */
const cfBack: Generator<CfParams> = {
  id: 'dat-cf-back',
  sample: (rng, difficulty) => sampleCf(rng, difficulty, () => true),
  render: (params): Slide => {
    const { bounds, fs } = params;
    const totals = running(fs);
    const slips = [...totals.slice(1, 3), ...totals.slice(2).map((t, i) => t - totals[i])];
    return {
      kind: 'table',
      prompt: [
        say(`The table shows ${cfIntro(params)}, with only the running totals kept. Fill in the frequency of each class.`),
      ],
      columns: ['\\text{Class}', 'f', '\\text{cf}'],
      rows: fs.map((_, i) => [classTex(bounds[i], bounds[i + 1]), null, `${totals[i]}`]),
      bank: valueBank(fs, slips),
      answer: fs.map(fmt),
    };
  },
  solution: (params) => {
    const totals = running(params.fs);
    return [
      { text: 'Each frequency is how much its running total grew by. The first class has nothing above it:' },
      { tex: aligned(`f_1 &= ${totals[0]}`, ...totals.slice(1).map((t, i) => `${t} - ${totals[i]} &= ${params.fs[i + 1]}`)) },
      { text: `They add back up to $${cfN(params)}$, the last running total.` },
    ];
  },
};

interface CfCountParams extends CfParams {
  /** The boundary asked about, by index: never the first or the last. */
  at: number;
  above: boolean;
}

/**
 * How many values lie below an inner class boundary, read as a running total.
 * At difficulty 2 the question is how many are at least that big, which is
 * what is left over: n take the running total.
 */
const cfCount: Generator<CfCountParams> = {
  id: 'dat-cf-count',
  sample: (rng, difficulty) => {
    const params = sampleCf(rng, difficulty, () => true);
    return { ...params, at: rng.int(1, params.fs.length - 1), above: difficulty > 1 };
  },
  render: (params): Slide => {
    const below = running(params.fs)[params.at - 1];
    const b = fmt(params.bounds[params.at]);
    return {
      kind: 'expression',
      prompt: [
        say(`The table shows ${cfIntro(params)}.`),
        show(groupedTableTex(params.bounds, params.fs)),
        say(params.above ? `How many of the values are at least $${b}$?` : `How many of the values are less than $${b}$?`),
      ],
      lead: '\\text{count} =',
      keypad: NUMBER_KEYS,
      answer: fmt(params.above ? cfN(params) - below : below),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const totals = running(params.fs);
    const below = totals[params.at - 1];
    const b = fmt(params.bounds[params.at]);
    const steps: SolutionStep[] = [
      { text: `Running totals: ${totals.map((t) => `$${t}$`).join(', ')}.` },
      { text: `Every class below $${b}$ is counted by the running total at $${b}$: $${below}$ values are less than $${b}$.` },
    ];
    if (params.above) steps.push({ tex: `${cfN(params)} - ${below} = ${cfN(params) - below} \\text{ are at least } ${b}` });
    return steps;
  },
};

/* ---------- lesson 2: the curve ---------- */

interface CfAtParams extends CfParams {
  x: number;
  /** Difficulty 1 reads halfway along a class, with a guide line; 2 at any other tenth, without. */
  guided: boolean;
}

/** Pick an x inside a class where the curve's height is whole, or refuse the draw. */
function sampleInside(rng: Rng, difficulty: number): CfAtParams {
  const guided = difficulty === 1;
  for (;;) {
    const params = sampleCf(rng, difficulty, () => true);
    // At least a square clear of the bottom and the top too, where a reading
    // would be a guess at a sliver of the scale.
    const { sy } = cfFrame(params);
    const xs = insideReads(params, guided).filter((x) => {
      const c = countBelow(params, x);
      return c >= sy && c <= cfN(params) - sy && clearOfRest(c, 0, cfN(params), 1, upTolerance(params));
    });
    if (xs.length === 0) continue;
    return { ...params, x: rng.pick(xs), guided };
  }
}

/**
 * How many values lie below a given value, read off the curve by sliding a
 * line up to its height there. Tolerant of a quarter of a square either way,
 * which is as close as a curve can be read.
 */
const cfBelowSlider: Generator<CfAtParams> = {
  id: 'dat-cf-below-slider',
  sample: sampleInside,
  render: (params): Slide => {
    const x = fmt(params.x);
    return {
      kind: 'slider',
      prompt: [
        say(
          `The curve shows ${cfIntro(params)}. Slide the line to the curve's height at $${x}$: how many values are less than $${x}$.${params.guided ? ` The dashed line marks $${x}$.` : ''}`,
        ),
      ],
      min: 0,
      max: cfN(params),
      step: 1,
      tolerance: upTolerance(params),
      answer: countBelow(params, params.x),
      readout: '\\text{cf} = {v}',
      figure: { svg: cumulativeSvg(params, { down: params.guided ? [params.x] : [] }), ...cfMarker(params, 'y') },
    };
  },
  solution: (params) => {
    const r = readAt(params, countBelow(params, params.x));
    const x = fmt(params.x);
    return [
      { text: `Go up from $${x}$ to the curve, then across to the cumulative frequency axis.` },
      { text: `$${x}$ is $${fmt((params.x - r.lo) / r.width)}$ of the way through $${classTex(r.lo, r.lo + r.width)}$. There are $${r.before}$ values below that class and $${r.f}$ in it, joined by a straight line, so the curve there is` },
      { tex: `${r.before} + ${fmt((params.x - r.lo) / r.width)} \\times ${r.f} = ${fmt(countBelow(params, params.x))}` },
    ];
  },
};

interface CfPairParams extends CfParams {
  a: number;
  b: number;
}

/**
 * Two values to read at: inner class boundaries at difficulty 1, points
 * inside two different classes at 2, always with whole heights.
 */
function samplePair(rng: Rng, difficulty: number): CfPairParams {
  for (;;) {
    const params = sampleCf(rng, difficulty, () => true);
    const xs = difficulty > 1 ? insideReads(params, false) : params.bounds.slice(1, -1);
    if (xs.length < 2) continue;
    const [a, b] = ordered(rng.sample(xs, 2));
    if (difficulty > 1 && classAt(params, countBelow(params, a)) === classAt(params, countBelow(params, b))) continue;
    return { ...params, a, b };
  }
}

/**
 * How many values lie between two values: the reading at the top take the
 * reading at the bottom, laid out as tiles.
 */
const cfBetween: Generator<CfPairParams> = {
  id: 'dat-cf-between',
  sample: samplePair,
  render: (params): Slide => {
    const ca = countBelow(params, params.a);
    const cb = countBelow(params, params.b);
    const n = cfN(params);
    return {
      kind: 'tiles',
      prompt: [
        say(`The curve and table show ${cfIntro(params)}.`),
        cfDiagram(params),
        show(cfTableTex(params, true)),
        say(`How many values lie between $${fmt(params.a)}$ and $${fmt(params.b)}$? Fill in the reading at $${fmt(params.b)}$, the reading at $${fmt(params.a)}$, and the difference.`),
      ],
      template: '{0} - {1} = {2}',
      bank: valueBank([cb, ca, cb - ca], [n - cb, n - ca, cb + ca, n - (cb - ca)]),
      answer: [fmt(cb), fmt(ca), fmt(cb - ca)],
    };
  },
  solution: (params) => {
    const ca = countBelow(params, params.a);
    const cb = countBelow(params, params.b);
    return [
      { text: `Up to the curve and across: $${fmt(cb)}$ values are less than $${fmt(params.b)}$, and $${fmt(ca)}$ are less than $${fmt(params.a)}$.` },
      { text: 'Those below the bottom value are inside the first count too, so take them away:' },
      { tex: `${fmt(cb)} - ${fmt(ca)} = ${fmt(cb - ca)}` },
    ];
  },
};

interface CfAboveParams extends CfParams {
  x: number;
}

/**
 * How many values are more than a given value: n take the reading. At an
 * inner boundary at difficulty 1, inside a class at 2.
 */
const cfAbove: Generator<CfAboveParams> = {
  id: 'dat-cf-above',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleCf(rng, difficulty, () => true);
      const xs = difficulty > 1 ? insideReads(params, false) : params.bounds.slice(1, -1);
      if (xs.length === 0) continue;
      return { ...params, x: rng.pick(xs) };
    }
  },
  render: (params): Slide => {
    const c = countBelow(params, params.x);
    const n = cfN(params);
    const r = readAt(params, c);
    const opts = valueChoices(n - c, [c, n - c + r.f, n - c - r.f, n], mix(...params.fs, params.x));
    return choiceSlide(
      [
        say(`The curve and table show ${cfIntro(params)}.`),
        cfDiagram(params),
        show(cfTableTex(params, true)),
        say(`How many values are more than $${fmt(params.x)}$?`),
      ],
      opts,
      `cfabove${params.bounds.join(',')}|${params.fs.join(',')}|${params.x}`,
    );
  },
  solution: (params) => {
    const c = countBelow(params, params.x);
    const n = cfN(params);
    return [
      { text: `The curve counts from the bottom: $${fmt(c)}$ values are less than $${fmt(params.x)}$.` },
      { text: 'The rest are more than it:' },
      { tex: `${n} - ${fmt(c)} = ${fmt(n - c)}` },
    ];
  },
};

interface CfCheckParams extends CfParams {
  plot: CfPlot;
}

/**
 * Whether a curve is drawn right, one check at a time: it only ever rises,
 * its points sit at the upper boundaries, and it starts from zero at the
 * lowest boundary. Difficulty 1 draws it right, with frequencies, or at
 * midpoints; 2 adds a curve that skips the starting point.
 */
const cfCheck: Generator<CfCheckParams> = {
  id: 'dat-cf-check',
  sample: (rng, difficulty) => {
    const plot = rng.pick<CfPlot>(difficulty > 1 ? ['right', 'frequency', 'midpoint', 'nostart'] : ['right', 'frequency', 'midpoint']);
    // Frequencies that happen to rise would pass the first check honestly.
    const params = sampleCf(rng, difficulty, (p) => plot !== 'frequency' || p.fs.some((f, i) => i > 0 && f < p.fs[i - 1]));
    return { ...params, plot };
  },
  render: (params): Slide => {
    const key = `cfcheck${params.bounds.join(',')}|${params.fs.join(',')}|${params.plot}`;
    const answers: Record<CfPlot, string[]> = {
      frequency: ['No'],
      midpoint: ['Yes', 'No'],
      nostart: ['Yes', 'Yes', 'No'],
      right: ['Yes', 'Yes', 'Yes'],
    };
    const b0 = fmt(params.bounds[0]);
    return {
      kind: 'flow',
      prompt: [
        say(`Someone drew a cumulative frequency curve for ${cfIntro(params)}, in classes from $${b0}$ to $${fmt(params.bounds[params.bounds.length - 1])}$. Check it.`),
        cfDiagram(params, { plot: params.plot }),
      ],
      subject: '\\text{the curve}',
      steps: [
        {
          id: 'rise',
          ask: 'Does the curve only ever go up?',
          branches: rotated(
            [
              { label: 'Yes', to: 'upper' },
              { label: 'No', outcome: 'Wrong: it plots the frequencies. A running total can never go down.' },
            ],
            `${key}r`,
          ),
        },
        {
          id: 'upper',
          ask: 'Is every point above a class boundary?',
          branches: rotated(
            [
              { label: 'Yes', to: 'start' },
              { label: 'No', outcome: 'Wrong: the points are at the midpoints. Each belongs at its upper class boundary.' },
            ],
            `${key}u`,
          ),
        },
        {
          id: 'start',
          ask: `Does it start from zero at $${b0}$?`,
          branches: rotated(
            [
              { label: 'Yes', outcome: 'Drawn right.' },
              { label: 'No', outcome: `Wrong: nothing lies below $${b0}$, so the curve starts at $(${b0}, 0)$.` },
            ],
            `${key}s`,
          ),
        },
      ],
      answer: answers[params.plot],
    };
  },
  solution: (params) => {
    const b0 = fmt(params.bounds[0]);
    const why: Record<CfPlot, string> = {
      frequency: 'The curve goes down somewhere, so it cannot be a running total: it is the frequencies plotted.',
      midpoint: 'The points sit halfway between the boundaries. A running total is only complete at the top of its class, so each point belongs at the upper boundary.',
      nostart: `It begins at the first class's point. No value is less than $${b0}$, so the curve has to start at $(${b0}, 0)$.`,
      right: `It only rises, every point is above an upper boundary, and it starts at $(${b0}, 0)$ and ends at $${cfN(params)}$: drawn right.`,
    };
    return [{ text: why[params.plot] }];
  },
};

/* ---------- lesson 3: median and quartiles from the curve ---------- */

interface CfQuartileParams extends CfParams {
  /** 25, 50 or 75: the percentile that is the quartile asked for. */
  pct: number;
  guided: boolean;
}

/**
 * The median at difficulty 1, landing on a grid line and with the dashed
 * line across at n/2; at 2 the median or either quartile, between the lines
 * and with no guide. Tolerant of a tenth of a class either way.
 */
const cfQuartileSlider: Generator<CfQuartileParams> = {
  id: 'dat-cf-quartile-slider',
  sample: (rng, difficulty) => {
    const guided = difficulty === 1;
    const pct = guided ? 50 : rng.pick([25, 50, 75]);
    const params = sampleCf(rng, difficulty, (p) => {
      if (cfN(p) % 4 !== 0) return false;
      const pos = pctPosition(p, pct);
      return (guided ? onGrid(p, pos) : betweenLines(p, pos)) && acrossClear(p, pos);
    });
    return { ...params, pct, guided };
  },
  render: (params): Slide => {
    const pos = pctPosition(params, params.pct);
    const b = params.bounds;
    return {
      kind: 'slider',
      prompt: [
        say(
          `The curve shows ${cfIntro(params)}. Slide the marker to the ${pctName(params.pct)}.${params.guided ? ` The dashed line is at a cumulative frequency of $${fmt(pos)}$.` : ''}`,
        ),
      ],
      min: b[0],
      max: b[b.length - 1],
      step: cfStep(params),
      tolerance: cfStep(params),
      answer: readAt(params, pos).value,
      readout: `${pctSymbol(params.pct)} = {v}`,
      figure: { svg: cumulativeSvg(params, { across: params.guided ? [pos] : [] }), ...cfMarker(params, 'x') },
    };
  },
  solution: (params) => {
    const pos = pctPosition(params, params.pct);
    const r = readAt(params, pos);
    return [
      { text: `With $n = ${cfN(params)}$ on a curve, the ${pctName(params.pct)} is at a cumulative frequency of $${fmt(pos)}$.` },
      { text: `Across from $${fmt(pos)}$ to the curve, then down: that is inside $${classTex(r.lo, r.lo + r.width)}$, $${fmt(pos - r.before)}$ of its $${r.f}$ values in.` },
      { tex: `${fmt(r.lo)} + \\frac{${fmt(pos - r.before)}}{${r.f}} \\times ${fmt(r.width)} = ${fmt(r.value)}` },
    ];
  },
};

interface CfQuartilesParams extends CfParams {
  guided: boolean;
}

/**
 * n divisible by four, and every quartile readable: on grid lines at
 * difficulty 1, and at 2 in tenths with at least `offGrid` of them between
 * the lines.
 */
function sampleQuartileReads(rng: Rng, difficulty: number, pcts: number[], offGrid: number): CfQuartilesParams {
  const guided = difficulty === 1;
  const params = sampleCf(rng, difficulty, (p) => {
    if (cfN(p) % 4 !== 0) return false;
    const positions = pcts.map((pct) => pctPosition(p, pct));
    if (guided) return positions.every((pos) => onGrid(p, pos));
    const read = positions.every((pos) => onGrid(p, pos) || betweenLines(p, pos));
    return read && positions.filter((pos) => betweenLines(p, pos)).length >= offGrid;
  });
  return { ...params, guided };
}

/**
 * Where each quartile sits and what it reads as, in a table: positions n/4,
 * n/2 and 3n/4 rather than the list rule's (n + 1)/4.
 */
const cfPositions: Generator<CfQuartilesParams> = {
  id: 'dat-cf-positions',
  sample: (rng, difficulty) => sampleQuartileReads(rng, difficulty, [25, 50, 75], 2),
  render: (params): Slide => {
    const n = cfN(params);
    const qs = [25, 50, 75].map((pct) => ({ pos: pctPosition(params, pct), value: readAt(params, pctPosition(params, pct)).value }));
    const answer = qs.flatMap(({ pos, value }) => [pos, value]);
    const slips = [(n + 1) / 4, (n + 1) / 2, (3 * (n + 1)) / 4, ...params.bounds.slice(1, -1)];
    return {
      kind: 'table',
      prompt: [
        say(`The curve and table show ${cfIntro(params)}.`),
        cfDiagram(params),
        show(cfTableTex(params, true)),
        say('Fill in the cumulative frequency where each quartile is read, and its value off the curve.'),
      ],
      columns: ['', '\\text{Position}', '\\text{Value}'],
      rows: [
        ['Q_1', null, null],
        ['Q_2', null, null],
        ['Q_3', null, null],
      ],
      bank: valueBank(answer, slips, 4),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const n = cfN(params);
    return [
      { text: `On a curve the quartiles are at $\\frac{n}{4}$, $\\frac{n}{2}$ and $\\frac{3n}{4}$: here $${n / 4}$, $${n / 2}$ and $${(3 * n) / 4}$.` },
      ...[25, 50, 75].map((pct, j) => {
        const pos = pctPosition(params, pct);
        const r = readAt(params, pos);
        return { tex: `Q_${j + 1} = ${fmt(r.lo)} + \\frac{${fmt(pos - r.before)}}{${r.f}} \\times ${fmt(r.width)} = ${fmt(r.value)}` };
      }),
    ];
  },
};

/**
 * The interquartile range as a tree: the two positions, the two quartiles
 * read from them, and their difference.
 */
const cfIqr: Generator<CfQuartilesParams> = {
  id: 'dat-cf-iqr',
  sample: (rng, difficulty) => sampleQuartileReads(rng, difficulty, [25, 75], 1),
  render: (params): Slide => {
    const n = cfN(params);
    const p1 = pctPosition(params, 25);
    const p3 = pctPosition(params, 75);
    const q1 = readAt(params, p1).value;
    const q3 = readAt(params, p3).value;
    const answer = [p1, p3, q1, q3, q3 - q1];
    const slips = [(n + 1) / 4, (3 * (n + 1)) / 4, n / 2, q3 + q1, readAt(params, n / 2).value];
    return {
      kind: 'tree',
      prompt: [
        say(`The curve and table show ${cfIntro(params)}.`),
        cfDiagram(params),
        show(cfTableTex(params, true)),
        say('Find the interquartile range. Top row: where $Q_1$ and $Q_3$ are read. Then the two quartiles off the curve, then the IQR.'),
      ],
      expression: '\\text{IQR} = Q_3 - Q_1',
      nodes: [
        { id: 'p1', from: [] },
        { id: 'p3', from: [] },
        { id: 'q1', from: ['p1'] },
        { id: 'q3', from: ['p3'] },
        { id: 'iqr', from: ['q1', 'q3'] },
      ],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const n = cfN(params);
    const q1 = readAt(params, n / 4).value;
    const q3 = readAt(params, (3 * n) / 4).value;
    return [
      { text: `$Q_1$ is read at $\\frac{${n}}{4} = ${n / 4}$ and $Q_3$ at $\\frac{3 \\times ${n}}{4} = ${(3 * n) / 4}$.` },
      { text: `Across and down: $Q_1 = ${fmt(q1)}$ and $Q_3 = ${fmt(q3)}$.` },
      { tex: `\\text{IQR} = ${fmt(q3)} - ${fmt(q1)} = ${fmt(q3 - q1)}` },
    ];
  },
};

interface CfRuleParams {
  n: number;
  pct: number;
  context: number;
}

/**
 * Where on the curve a quartile is read. n is a multiple of four at
 * difficulty 1; at 2 it is two more than one, so the lower and upper
 * quartiles fall on a half. The slip is the list rule, (n + 1)/4.
 */
const cfRule: Generator<CfRuleParams> = {
  id: 'dat-cf-rule',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const n = hard ? 4 * rng.int(6, 40) + 2 : 4 * rng.int(5, 40);
    return { n, pct: rng.pick(hard ? [25, 75] : [25, 50, 75]), context: rng.int(0, CF_CONTEXTS.length - 1) };
  },
  render: ({ n, pct, context }): Slide => {
    const q = pct / 25;
    const correct = (q * n) / 4;
    const opts = valueChoices(correct, [(q * (n + 1)) / 4, correct + 1, q === 2 ? n / 4 : n / 2], mix(n, pct), 0.5);
    return choiceSlide(
      [
        say(`A cumulative frequency curve is drawn for ${CF_CONTEXTS[context].of(n)}.`),
        say(`At what cumulative frequency is the ${pctName(pct)} read off?`),
      ],
      opts,
      `cfrule${n}|${pct}`,
    );
  },
  solution: ({ n, pct }) => {
    const q = pct / 25;
    return [
      { tex: `\\frac{${q === 1 ? '' : `${q} \\times `}${n}}{4} = ${fmt((q * n) / 4)}` },
      { text: 'A curve counts continuously, so a quarter of the way up is simply a quarter of $n$.' },
      { text: 'The $(n + 1)$ rule from Measures of Spread belongs to a list of $4k + 3$ values, where each value has its own place to count to. It is not used on a curve.' },
    ];
  },
};

/* ---------- lesson 4: percentiles ---------- */

interface PctPositionParams {
  n: number;
  pct: number;
  context: number;
}

/** Tens at difficulty 1; at 2 the fives in between, which can land on a half. */
const PCT_TENS = [10, 20, 30, 40, 60, 70, 80, 90];
const PCT_FIVES = [5, 15, 35, 45, 55, 65, 85, 95];

/** Where the pth percentile is read: p hundredths of the way up, as tiles. */
const pctPositionTiles: Generator<PctPositionParams> = {
  id: 'dat-pct-position',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n = hard ? 2 * rng.int(15, 100) : 10 * rng.int(2, 20);
      const pct = rng.pick(hard ? PCT_FIVES : PCT_TENS);
      if (!exact((pct * n) / 100, 1)) continue;
      return { n, pct, context: rng.int(0, CF_CONTEXTS.length - 1) };
    }
  },
  render: ({ n, pct, context }): Slide => {
    const pos = (pct * n) / 100;
    return {
      kind: 'tiles',
      prompt: [
        say(`A cumulative frequency curve is drawn for ${CF_CONTEXTS[context].of(n)}. Fill in the working for the cumulative frequency where the ${pctName(pct)} is read.`),
      ],
      template: '\\text{position} = {0} \\div 100 \\times {1} = {2}',
      bank: valueBank([pct, n, pos], [100 - pct, ((100 - pct) * n) / 100, (pct * (n + 1)) / 100, pos * 10]),
      answer: [fmt(pct), fmt(n), fmt(pos)],
    };
  },
  solution: ({ n, pct }) => [
    { text: `The ${pctName(pct)} is the value ${pct}% of the way up the data, so it is read at ${pct} hundredths of $n$.` },
    { tex: `\\frac{${pct}}{100} \\times ${n} = ${fmt((pct * n) / 100)}` },
    { text: 'The median is the 50th percentile and the quartiles the 25th and 75th: the same rule.' },
  ],
};

interface PctSliderParams extends CfParams {
  pct: number;
  guided: boolean;
}

/**
 * A percentile read off the curve by sliding a marker to it: a tens
 * percentile on a grid line with a guide at difficulty 1, and at 2 any five
 * between the lines with none.
 */
const pctSlider: Generator<PctSliderParams> = {
  id: 'dat-pct-slider',
  sample: (rng, difficulty) => {
    const guided = difficulty === 1;
    const pct = rng.pick(guided ? PCT_TENS : [...PCT_TENS, ...PCT_FIVES]);
    const params = sampleCf(rng, difficulty, (p) => {
      const pos = (pct * cfN(p)) / 100;
      if (!exact(pos, 1)) return false;
      return (guided ? onGrid(p, pos) : betweenLines(p, pos)) && acrossClear(p, pos);
    });
    return { ...params, pct, guided };
  },
  render: (params): Slide => {
    const pos = pctPosition(params, params.pct);
    const b = params.bounds;
    return {
      kind: 'slider',
      prompt: [
        say(
          `The curve shows ${cfIntro(params)}. Slide the marker to the ${pctName(params.pct)}.${params.guided ? ` The dashed line is at a cumulative frequency of $${fmt(pos)}$.` : ''}`,
        ),
      ],
      min: b[0],
      max: b[b.length - 1],
      step: cfStep(params),
      tolerance: cfStep(params),
      answer: readAt(params, pos).value,
      readout: `${pctSymbol(params.pct)} = {v}`,
      figure: { svg: cumulativeSvg(params, { across: params.guided ? [pos] : [] }), ...cfMarker(params, 'x') },
    };
  },
  solution: (params) => interpolationSolution(params, params.pct),
};

/**
 * The 10th to 90th interpercentile range in a table: each percentile's
 * position and value, then the difference. It leaves out the top and bottom
 * tenths, so one extreme value cannot move it.
 */
const pctRange: Generator<CfQuartilesParams> = {
  id: 'dat-pct-range',
  sample: (rng, difficulty) => {
    const guided = difficulty === 1;
    const params = sampleCf(rng, difficulty, (p) => {
      if (cfN(p) % 10 !== 0) return false;
      const positions = [10, 90].map((pct) => pctPosition(p, pct));
      if (guided) return positions.every((pos) => onGrid(p, pos));
      return positions.every((pos) => onGrid(p, pos) || betweenLines(p, pos)) && positions.some((pos) => betweenLines(p, pos));
    });
    return { ...params, guided };
  },
  render: (params): Slide => {
    const n = cfN(params);
    const p10 = pctPosition(params, 10);
    const p90 = pctPosition(params, 90);
    const v10 = readAt(params, p10).value;
    const v90 = readAt(params, p90).value;
    const answer = [p10, v10, p90, v90, v90 - v10];
    const slips = [(n + 1) / 10, (9 * (n + 1)) / 10, v90 + v10, params.bounds[params.bounds.length - 1] - params.bounds[0]];
    return {
      kind: 'table',
      prompt: [
        say(`The curve and table show ${cfIntro(params)}.`),
        cfDiagram(params),
        show(cfTableTex(params, true)),
        say('Find the 10th to 90th interpercentile range: where each percentile is read, its value, then the difference.'),
      ],
      columns: ['', '\\text{Position}', '\\text{Value}'],
      rows: [
        ['P_{10}', null, null],
        ['P_{90}', null, null],
        ['\\text{Range}', '', null],
      ],
      bank: valueBank(answer, slips, 4),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const n = cfN(params);
    const v10 = readAt(params, n / 10).value;
    const v90 = readAt(params, (9 * n) / 10).value;
    return [
      { text: `$P_{10}$ is read at $\\frac{10}{100} \\times ${n} = ${n / 10}$ and $P_{90}$ at $${(9 * n) / 10}$.` },
      { text: `Off the curve: $P_{10} = ${fmt(v10)}$ and $P_{90} = ${fmt(v90)}$.` },
      { tex: `P_{90} - P_{10} = ${fmt(v90)} - ${fmt(v10)} = ${fmt(v90 - v10)}` },
    ];
  },
};

/**
 * What percentage of the values lie below a given value: the reading as a
 * share of n. At an inner boundary at difficulty 1, inside a class at 2.
 */
const pctRank: Generator<CfAboveParams> = {
  id: 'dat-pct-rank',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleCf(rng, difficulty, () => true);
      const xs = (difficulty > 1 ? insideReads(params, false) : params.bounds.slice(1, -1)).filter((x) =>
        exact((100 * countBelow(params, x)) / cfN(params), 1),
      );
      if (xs.length === 0) continue;
      return { ...params, x: rng.pick(xs) };
    }
  },
  render: (params): Slide => {
    const c = countBelow(params, params.x);
    const pct = (100 * c) / cfN(params);
    const opts = valueChoices(pct, [c, 100 - pct, (100 * c) / (cfN(params) + 1)], mix(...params.fs, params.x), 5);
    return choiceSlide(
      [
        say(`The curve and table show ${cfIntro(params)}.`),
        cfDiagram(params),
        show(cfTableTex(params, true)),
        say(`What percentage of the values are less than $${fmt(params.x)}$?`),
      ],
      opts,
      `pctrank${params.bounds.join(',')}|${params.fs.join(',')}|${params.x}`,
    );
  },
  solution: (params) => {
    const c = countBelow(params, params.x);
    const n = cfN(params);
    return [
      { text: `Up to the curve and across: $${fmt(c)}$ of the $${n}$ values are less than $${fmt(params.x)}$.` },
      { tex: `\\frac{${fmt(c)}}{${n}} \\times 100 = ${fmt((100 * c) / n)}\\%` },
      { text: `So $${fmt(params.x)}$ sits at about the ${nth(Number(fmt((100 * c) / n)), fmt((100 * c) / n))} percentile.` },
    ];
  },
};

/* ---------- lesson 5: interpolating inside a class ---------- */

interface InterpParams extends CfParams {
  /** The percentile asked for: 50 is the median. */
  pct: number;
}

const INTERP_PCTS = [25, 75, 10, 20, 30, 40, 60, 70, 80, 90];

/**
 * A grouped table and a percentile to estimate from it: the median over
 * equal classes at difficulty 1, and at 2 a quartile or a tens percentile
 * over classes where one is twice as wide. The position lands strictly
 * inside a class, never on its top, and a whole number of tenths through it,
 * so the estimate is exact.
 */
function sampleInterp(rng: Rng, difficulty: number, fits: (p: InterpParams) => boolean = () => true): InterpParams {
  const hard = difficulty > 1;
  for (;;) {
    const pct = hard ? rng.pick(INTERP_PCTS) : 50;
    const params = sampleCf(
      rng,
      difficulty,
      (p) => {
        const pos = pctPosition(p, pct);
        if (!exact(pos, 1) || pos <= 0) return false;
        const t = tenths(p, pos);
        return whole(t) && t > 0 && t < 10;
      },
      hard,
    );
    const drawn = { ...params, pct };
    if (fits(drawn)) return drawn;
  }
}

const interpPrompt = (p: InterpParams, ask: string): Block[] => [
  say(`The table shows ${cfIntro(p)}.`),
  show(groupedTableTex(p.bounds, p.fs)),
  say(ask),
];

/**
 * Which class holds a percentile, found by running totals. Never the modal
 * class nor the middle row, so neither shortcut lands on it.
 */
const interpClass: Generator<InterpParams> = {
  id: 'dat-interp-class',
  sample: (rng, difficulty) =>
    sampleInterp(rng, difficulty, (p) => {
      const top = Math.max(...p.fs);
      const i = readAt(p, pctPosition(p, p.pct)).i;
      return p.fs.filter((f) => f === top).length === 1 && i !== p.fs.indexOf(top) && i !== Math.floor(p.fs.length / 2);
    }),
  render: (params): Slide => {
    const right = readAt(params, pctPosition(params, params.pct)).i;
    const opts = params.fs.map((_, i) => ({
      tex: classTex(params.bounds[i], params.bounds[i + 1]),
      correct: i === right ? true : undefined,
    }));
    return choiceSlide(
      interpPrompt(params, `Which class holds the ${pctName(params.pct)}?`),
      opts,
      `interpclass${params.bounds.join(',')}|${params.fs.join(',')}|${params.pct}`,
    );
  },
  solution: (params) => {
    const pos = pctPosition(params, params.pct);
    const r = readAt(params, pos);
    return [
      { text: `The ${pctName(params.pct)} is at position $\\frac{${params.pct}}{100} \\times ${cfN(params)} = ${fmt(pos)}$.` },
      { text: `Running totals: ${running(params.fs).map((t) => `$${t}$`).join(', ')}.` },
      { text: `$${r.before}$ values come before $${classTex(r.lo, r.lo + r.width)}$ and $${r.before + r.f}$ by its end, so position $${fmt(pos)}$ is in it.` },
    ];
  },
};

/** The interpolation laid out with its numbers in, as tiles. */
const interpTiles: Generator<InterpParams> = {
  id: 'dat-interp-tiles',
  sample: (rng, difficulty) => sampleInterp(rng, difficulty),
  render: (params): Slide => {
    const pos = pctPosition(params, params.pct);
    const r = readAt(params, pos);
    const next = r.i + 1 < params.fs.length ? r.i + 1 : r.i - 1;
    const answer = [r.lo, pos, r.before, r.f, r.width, r.value];
    const slips = [r.lo + r.width, r.before + r.f, params.fs[next], params.bounds[next + 1] - params.bounds[next], r.lo + r.width / 2];
    return {
      kind: 'tiles',
      prompt: interpPrompt(
        params,
        `Estimate the ${pctName(params.pct)} by interpolating inside its class. Fill in the working.`,
      ),
      template: '{0} + ({1} - {2}) \\div {3} \\times {4} = {5}',
      bank: valueBank(answer, slips, 4),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => interpolationSolution(params, params.pct),
};

/**
 * The same interpolation worked one operation at a time: how far into the
 * class, scaled by its width, shared over its frequency, added to its start.
 */
const interpSteps: Generator<InterpParams> = {
  id: 'dat-interp-steps',
  sample: (rng, difficulty) => sampleInterp(rng, difficulty),
  render: (params): Slide => {
    const pos = pctPosition(params, params.pct);
    const r = readAt(params, pos);
    const d = pos - r.before;
    const dw = d * r.width;
    const share = dw / r.f;
    const bank = (value: number, ...slips: number[]) =>
      stepBank(fmt(value), ...tidy(slips).map(fmt).filter((s) => s !== fmt(value)));
    return {
      kind: 'steps',
      prompt: interpPrompt(
        params,
        `The ${pctName(params.pct)} is at position $${fmt(pos)}$, inside $${classTex(r.lo, r.lo + r.width)}$ with $${r.before}$ values before it. Estimate it: tap the part you would do next, then choose what it comes to.`,
      ),
      start: [fmt(r.lo), '+', '(', fmt(pos), '-', fmt(r.before), ')', '\\times', fmt(r.width), '\\div', fmt(r.f)],
      reductions: [
        { span: [2, 7], operator: 4, value: fmt(d), bank: bank(d, pos + r.before, d + 1, d - 1) },
        { span: [2, 5], operator: 3, value: fmt(dw), bank: bank(dw, d + r.width, dw + r.width, dw - r.width) },
        { span: [2, 5], operator: 3, value: fmt(share), bank: bank(share, dw * r.f, share + 1, share - 1, r.f / dw) },
        { span: [0, 3], operator: 1, value: fmt(r.value), bank: bank(r.value, r.value + 1, r.value - 1, r.lo + r.width - share) },
      ],
    };
  },
  solution: (params) => interpolationSolution(params, params.pct),
};

/** The whole estimate, typed as one number. */
const interpValue: Generator<InterpParams> = {
  id: 'dat-interp-value',
  sample: (rng, difficulty) => sampleInterp(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: interpPrompt(params, `Estimate the ${pctName(params.pct)} by interpolation.`),
    lead: `${pctSymbol(params.pct)} \\approx`,
    keypad: NUMBER_KEYS,
    answer: fmt(readAt(params, pctPosition(params, params.pct)).value),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => interpolationSolution(params, params.pct),
};

/* ================================================================
 * Level 5: coding data
 * ================================================================ */

/**
 * The statistics a change of every value can act on. An average (mean,
 * median, mode) moves with the data; a spread (range, IQR, standard
 * deviation, variance) is left alone by adding and stretched by multiplying,
 * the variance by the square.
 */
export type CodeStat = 'mean' | 'median' | 'mode' | 'range' | 'iqr' | 'sd' | 'variance';

const CODE_STATS: Record<CodeStat, { word: string; short: string; average: boolean }> = {
  mean: { word: 'mean', short: 'Mean', average: true },
  median: { word: 'median', short: 'Median', average: true },
  mode: { word: 'mode', short: 'Mode', average: true },
  range: { word: 'range', short: 'Range', average: false },
  iqr: { word: 'interquartile range', short: 'IQR', average: false },
  sd: { word: 'standard deviation', short: 'SD', average: false },
  variance: { word: 'variance', short: 'Variance', average: false },
};

const ALL_STATS: CodeStat[] = ['mean', 'median', 'mode', 'range', 'iqr', 'sd', 'variance'];

/** "a mean", "an interquartile range". */
const article = (word: string): string => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`);

/** A statistic once every value x has become bx + c, with b > 0. */
export function movedStat(stat: CodeStat, v: number, b: number, c: number): number {
  if (CODE_STATS[stat].average) return b * v + c;
  return stat === 'variance' ? b * b * v : b * v;
}

/** The change in words, as one sentence. */
function changeSentence(b: number, c: number, past = false): string {
  const is = past ? 'was' : 'is';
  if (b === 1) return `Every value ${is} ${c > 0 ? 'increased' : 'decreased'} by $${fmt(Math.abs(c))}$.`;
  if (c === 0) return `Every value ${is} multiplied by $${fmt(b)}$.`;
  return `Every value ${is} multiplied by $${fmt(b)}$, and then $${fmt(Math.abs(c))}$ ${c > 0 ? `${is} added` : `${is} taken off`}.`;
}

/** `3x + 5`, `x - 4`, `0.5x`: the change as the right-hand side of a rule. */
function linTex(b: number, c: number, v = 'x'): string {
  const bx = b === 1 ? v : `${fmt(b)}${v}`;
  return c === 0 ? bx : `${bx} ${c > 0 ? '+' : '-'} ${fmt(Math.abs(c))}`;
}

/** The working for one statistic after the change, with the reason. */
function moveSolution(stat: CodeStat, v: number, b: number, c: number): SolutionStep[] {
  const { word, average } = CODE_STATS[stat];
  const after = fmt(movedStat(stat, v, b, c));
  const sign = c > 0 ? '+' : '-';
  if (average) {
    const scaled = b === 1 ? fmt(v) : `${fmt(b)} \\times ${fmt(v)}`;
    return [
      { text: `The ${word} is an average, so it goes wherever the values go.` },
      { tex: c === 0 ? `${scaled} = ${after}` : `${scaled} ${sign} ${fmt(Math.abs(c))} = ${after}` },
    ];
  }
  const steps: SolutionStep[] = [];
  if (c !== 0) steps.push({ text: `The ${word} measures spread. ${b === 1 ? 'Adding or taking off' : 'The adding or taking off'} the same amount moves every value together, so no gap changes.` });
  if (b === 1) {
    steps.push({ tex: `\\text{still } ${fmt(v)}` });
    return steps;
  }
  if (stat === 'variance') {
    steps.push(
      { text: `Multiplying by $${fmt(b)}$ stretches every gap, and the variance is in squared units, so it is multiplied by $${fmt(b)}^2$.` },
      { tex: `${fmt(b)}^2 \\times ${fmt(v)} = ${fmt(b * b)} \\times ${fmt(v)} = ${after}` },
    );
    return steps;
  }
  steps.push(
    { text: `Multiplying by $${fmt(b)}$ stretches every gap by $${fmt(b)}$.` },
    { tex: `${fmt(b)} \\times ${fmt(v)} = ${after}` },
  );
  return steps;
}

/** The usual slips for one statistic under x -> bx + c, most tempting first. */
function moveSlips(stat: CodeStat, v: number, b: number, c: number): number[] {
  if (CODE_STATS[stat].average) return [v, b * v, v + c, b * v - c, v - c, b * (v + c)];
  if (stat === 'variance') return [b * v, b * v + c, v + c, v, b * b * v + c];
  return [b * v + c, v + c, b * b * v, v, v - c, v + b];
}

/** Things a set of data can be. Prose only, in the plural, so "have" follows. */
const CODE_CONTEXTS = [
  'The heights of some plants',
  'The times some runners took',
  'The masses of some parcels',
  'The scores in a quiz',
  'The lengths of some fish',
  'The prices of some books',
  'The daily sales at a café',
  'The temperatures one week',
];

/** A whole number or one decimal place, from `lo` to `hi`. */
const oneDp = (rng: Rng, lo: number, hi: number): number => rng.int(lo * 10, hi * 10) / 10;

/** A value for a statistic that will read sensibly: averages larger than spreads. */
function statValue(rng: Rng, stat: CodeStat, decimals: boolean): number {
  switch (stat) {
    case 'mean':
    case 'median':
      return decimals ? oneDp(rng, 20, 80) : rng.int(20, 80);
    case 'mode':
      return rng.int(20, 80);
    case 'range':
      return rng.int(8, 45);
    case 'iqr':
      return rng.int(4, 25);
    case 'sd':
      return decimals ? oneDp(rng, 1.2, 9.8) : rng.int(2, 12);
    case 'variance':
      return rng.int(4, 90);
  }
}

interface MoveAskParams {
  context: number;
  b: number;
  c: number;
  /** Two statistics the prompt gives: an average and a spread. */
  stats: [CodeStat, CodeStat];
  values: [number, number];
  /** Which of the two is asked for after the change. */
  ask: 0 | 1;
}

/** Two given statistics, one asked for after the change, as a typed answer. */
function moveAsk(id: string, sample: (rng: Rng, difficulty: number) => MoveAskParams): Generator<MoveAskParams> {
  return {
    id,
    sample,
    render: ({ context, b, c, stats, values, ask }): Slide => {
      const [s0, s1] = stats;
      const w = CODE_STATS[stats[ask]];
      return {
        kind: 'expression',
        prompt: [
          say(
            `${CODE_CONTEXTS[context]} have ${article(CODE_STATS[s0].word)} of $${fmt(values[0])}$ and ${article(CODE_STATS[s1].word)} of $${fmt(values[1])}$. ${changeSentence(b, c)} Find the new ${w.word}.`,
          ),
        ],
        lead: `\\text{new ${stats[ask] === 'iqr' || stats[ask] === 'sd' ? w.short : w.word}} =`,
        keypad: NUMBER_KEYS,
        answer: fmt(movedStat(stats[ask], values[ask], b, c)),
        domain: 'real',
        mode: 'exact',
      };
    },
    solution: ({ b, c, stats, values, ask }) => moveSolution(stats[ask], values[ask], b, c),
    choices: ({ b, c, stats, values, ask }) => {
      const stat = stats[ask];
      const v = values[ask];
      const right = movedStat(stat, v, b, c);
      const slips = moveSlips(stat, v, b, c).filter((x) => x > 0);
      return valueChoices(right, slips, mix(b * 10, c, v * 10, ask), 1);
    },
  };
}

/** The pairs a prompt may give, an average with a spread. */
const PAIRS: [CodeStat, CodeStat][] = [
  ['mean', 'sd'],
  ['median', 'iqr'],
  ['mean', 'variance'],
  ['mode', 'range'],
  ['median', 'range'],
];

function sampleStatPair(rng: Rng, pairs: [CodeStat, CodeStat][], decimals: boolean) {
  const stats = rng.pick(pairs);
  const values: [number, number] = [statValue(rng, stats[0], decimals), statValue(rng, stats[1], decimals)];
  return { stats, values, ask: rng.pick<0 | 1>([0, 1]) };
}

/**
 * Every value shifted by a constant: a mean or standard deviation after an
 * increase at difficulty 1; at 2 a decrease, over any average and spread.
 */
const codeShift = moveAsk('dat-code-shift', (rng, difficulty) => {
  const hard = difficulty > 1;
  const c = hard ? -rng.int(2, 15) : rng.int(2, 20);
  const { stats, values, ask } = sampleStatPair(rng, hard ? PAIRS : [['mean', 'sd']], true);
  return { context: rng.int(0, CODE_CONTEXTS.length - 1), b: 1, c, stats, values, ask };
});

/**
 * Every value multiplied by a constant: a whole multiplier over a mean,
 * median, range or standard deviation at difficulty 1; at 2 a multiplier
 * that may be a half, over pairs that take in the variance and the IQR.
 */
const codeScale = moveAsk('dat-code-scale', (rng, difficulty) => {
  const hard = difficulty > 1;
  for (;;) {
    const b = rng.pick(hard ? [0.5, 1.5, 2.5, 3, 4, 10] : [2, 3, 4, 5, 10]);
    const { stats, values, ask } = sampleStatPair(
      rng,
      hard
        ? [
            ['mean', 'variance'],
            ['median', 'iqr'],
            ['mean', 'sd'],
          ]
        : [
            ['mean', 'sd'],
            ['median', 'range'],
          ],
      true,
    );
    if (!exact(movedStat(stats[ask], values[ask], b, 0), 2)) continue;
    return { context: rng.int(0, CODE_CONTEXTS.length - 1), b, c: 0, stats, values, ask };
  }
});

interface MoveTableParams {
  b: number;
  c: number;
  stats: CodeStat[];
  values: number[];
}

/** Four statistics before a change, and the learner fills in each after it. */
function moveTable(id: string, sample: (rng: Rng, difficulty: number) => MoveTableParams): Generator<MoveTableParams> {
  return {
    id,
    sample: (rng, difficulty) => {
      for (;;) {
        const p = sample(rng, difficulty);
        const after = p.stats.map((s, i) => movedStat(s, p.values[i], p.b, p.c));
        if (!after.every((a) => exact(a, 2))) continue;
        if (new Set(after.map(fmt)).size !== after.length) continue;
        return p;
      }
    },
    render: ({ b, c, stats, values }): Slide => {
      const after = stats.map((s, i) => movedStat(s, values[i], b, c));
      const slips = tidy(stats.flatMap((s, i) => moveSlips(s, values[i], b, c).slice(0, 2)).filter((x) => x > 0));
      return {
        kind: 'table',
        prompt: [say(`${changeSentence(b, c)} Fill in each statistic after the change.`)],
        columns: ['', '\\text{Before}', '\\text{After}'],
        rows: stats.map((s, i) => [`\\text{${CODE_STATS[s].short}}`, fmt(values[i]), null]),
        bank: valueBank(after, slips, 3),
        answer: after.map(fmt),
      };
    },
    solution: ({ b, c, stats, values }) => {
      const averages = stats.filter((s) => CODE_STATS[s].average).map((s) => CODE_STATS[s].word);
      const spreads = stats.filter((s) => !CODE_STATS[s].average).map((s) => CODE_STATS[s].word);
      const lines = stats.map((s, i) => {
        const v = values[i];
        const after = fmt(movedStat(s, v, b, c));
        const head = `\\text{${CODE_STATS[s].short}}`;
        if (CODE_STATS[s].average) {
          const scaled = b === 1 ? fmt(v) : `${fmt(b)} \\times ${fmt(v)}`;
          return `${head} &= ${c === 0 ? scaled : `${scaled} ${c > 0 ? '+' : '-'} ${fmt(Math.abs(c))}`} = ${after}`;
        }
        if (b === 1) return `${head} &= ${after}`;
        return `${head} &= ${s === 'variance' ? `${fmt(b)}^2` : fmt(b)} \\times ${fmt(v)} = ${after}`;
      });
      return [
        {
          text:
            b === 1
              ? `The ${averages.join(' and ')} move with the values. The ${spreads.join(' and ')} measure gaps, which do not change.`
              : `Multiplying stretches everything: the ${averages.join(' and ')}, and the gaps too. The variance is in squared units, so it goes up by the square.`,
        },
        { tex: aligned(...lines) },
      ];
    },
  };
}

/**
 * Four statistics before and after adding a constant: an increase over the
 * mean, median, range and standard deviation at difficulty 1, a decrease
 * over the mean, mode, IQR and variance at 2.
 */
const codeShiftTable = moveTable('dat-code-shift-table', (rng, difficulty) => {
  const hard = difficulty > 1;
  const stats: CodeStat[] = hard ? ['mean', 'mode', 'iqr', 'variance'] : ['mean', 'median', 'range', 'sd'];
  return {
    b: 1,
    c: hard ? -rng.int(2, 15) : rng.int(2, 20),
    stats,
    values: stats.map((s) => statValue(rng, s, true)),
  };
});

/**
 * Four statistics before and after multiplying: a whole multiplier at
 * difficulty 1, and at 2 one that may be a half, with the variance asked.
 */
const codeScaleTable = moveTable('dat-code-scale-table', (rng, difficulty) => {
  const hard = difficulty > 1;
  const stats: CodeStat[] = hard ? ['mean', 'iqr', 'sd', 'variance'] : ['mean', 'median', 'range', 'sd'];
  return {
    b: rng.pick(hard ? [0.5, 1.5, 2, 3] : [2, 3, 4, 5, 10]),
    c: 0,
    stats,
    values: stats.map((s) => statValue(rng, s, !hard || s === 'mean')),
  };
});

interface ShiftBackParams {
  c: number;
  /** The mean after the change. */
  after: number;
  /** The spread, which the change did not touch. */
  spread: number;
  squared: boolean;
}

/**
 * Undoing a shift: the mean and a spread after every value was moved, and
 * the learner fills in both from before. An increase and the standard
 * deviation at difficulty 1; a decrease and the variance at 2.
 */
const codeShiftBack: Generator<ShiftBackParams> = {
  id: 'dat-code-shift-back',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const c = hard ? -rng.int(2, 15) : rng.int(2, 20);
    return { c, after: oneDp(rng, 25, 90), spread: hard ? rng.int(4, 90) : oneDp(rng, 1.2, 9.8), squared: hard };
  },
  render: ({ c, after, spread, squared }): Slide => {
    const before = after - c;
    const k = Math.abs(c);
    const sym = squared ? '\\sigma^2' : '\\sigma';
    return {
      kind: 'tiles',
      prompt: [
        say(
          `${changeSentence(1, c, true)} Afterwards the mean is $${fmt(after)}$ and the ${squared ? 'variance' : 'standard deviation'} is $${fmt(spread)}$. Fill in both from before the change.`,
        ),
      ],
      template: `\\bar{x} = {0} ${c > 0 ? '-' : '+'} {1} = {2} \\qquad ${sym} = {3}`,
      bank: valueBank([after, k, before, spread], [after + c, spread - k, spread + k, before - c]),
      answer: [fmt(after), fmt(k), fmt(before), fmt(spread)],
    };
  },
  solution: ({ c, after, spread, squared }) => [
    { text: `The change ${c > 0 ? 'added' : 'took off'} $${Math.abs(c)}$, so undo it for the mean: ${c > 0 ? 'take it off' : 'add it back'}.` },
    { tex: `\\bar{x} = ${fmt(after)} ${c > 0 ? '-' : '+'} ${Math.abs(c)} = ${fmt(after - c)}` },
    { text: `The ${squared ? 'variance' : 'standard deviation'} was never changed, since moving every value together leaves every gap alone: it is still $${fmt(spread)}$.` },
  ],
};

interface EffectParams {
  b: number;
  c: number;
  stat: CodeStat;
  v: number;
}

/** Three values to choose between for the new statistic, the answer among them. */
function effectValues({ b, c, stat, v }: EffectParams): number[] {
  const right = movedStat(stat, v, b, c);
  const out: number[] = [right];
  for (const x of [...moveSlips(stat, v, b, c), right + 1, right + 2]) {
    if (out.length === 3) break;
    if (x > 0 && exact(x, 2) && !out.some((y) => fmt(y) === fmt(x))) out.push(x);
  }
  return out;
}

/**
 * Whether a statistic is an average or a spread, then what it becomes: a
 * shift at difficulty 1, and at 2 a multiplier, with or without a shift.
 */
const codeEffectFlow: Generator<EffectParams> = {
  id: 'dat-code-effect-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const stat = rng.pick(ALL_STATS);
      const b = hard ? rng.pick([2, 3, 4, 5, 10, 0.5]) : 1;
      const c = hard && rng.chance(0.3) ? 0 : rng.int(2, 20) * (hard ? 1 : rng.sign());
      const v = statValue(rng, stat, !hard);
      const p = { b, c, stat, v };
      if (!exact(movedStat(stat, v, b, c), 2) || movedStat(stat, v, b, c) <= 0) continue;
      return p;
    }
  },
  render: (params): Slide => {
    const { b, c, stat, v } = params;
    const { word, average } = CODE_STATS[stat];
    const key = `${b}|${c}|${stat}|${v}`;
    const values = rotated(effectValues(params), `${key}v`);
    const pickValue = (id: string, ask: string) => ({
      id,
      ask,
      branches: values.map((x) => ({ label: `$${fmt(x)}$`, outcome: `The new ${word} is $${fmt(x)}$.` })),
    });
    return {
      kind: 'flow',
      prompt: [say(`The ${word} of a set of data is $${fmt(v)}$. ${changeSentence(b, c)}`)],
      subject: `x \\to ${linTex(b, c)}`,
      steps: [
        {
          id: 'kind',
          ask: `Is the ${word} an average or a measure of spread?`,
          branches: rotated(
            [
              { label: 'An average', to: 'avg' },
              { label: 'A spread', to: 'spr' },
            ],
            `${key}k`,
          ),
        },
        pickValue('avg', `An average goes wherever the values go. What is the new ${word}?`),
        pickValue('spr', `A spread measures gaps between values. What is the new ${word}?`),
      ],
      answer: [average ? 'An average' : 'A spread', `$${fmt(movedStat(stat, v, b, c))}$`],
    };
  },
  solution: ({ b, c, stat, v }) => moveSolution(stat, v, b, c),
};

interface LinearParams {
  context: number;
  b: number;
  c: number;
  m: number;
  s: number;
  ask: 'mean' | 'sd' | 'variance';
}

const LINEAR_LEAD = { mean: '\\bar{y} =', sd: '\\sigma_y =', variance: '\\sigma_y^2 =' };
const LINEAR_WORD = { mean: 'the mean', sd: 'the standard deviation', variance: 'the variance' };

/** Values x with a mean and standard deviation, changed by y = bx + c. */
function sampleLinear(rng: Rng, difficulty: number, asks: LinearParams['ask'][]): LinearParams {
  const hard = difficulty > 1;
  for (;;) {
    const b = rng.pick(hard ? [0.5, 1.5, 2.5, 3, 4, 10] : [2, 3, 4, 5]);
    const c = rng.int(1, 20) * (hard ? rng.sign() : 1);
    const m = hard ? oneDp(rng, 5, 40) : rng.int(5, 40);
    const s = hard ? oneDp(rng, 1.2, 8) : rng.int(2, 9);
    const ask = rng.pick(asks);
    const p = { context: rng.int(0, CODE_CONTEXTS.length - 1), b, c, m, s, ask };
    const out = linearAnswer(p);
    if (!exact(out, 2) || b * m + c <= 0) continue;
    return p;
  }
}

function linearAnswer({ b, c, m, s, ask }: LinearParams): number {
  return ask === 'mean' ? b * m + c : ask === 'sd' ? b * s : (b * s) ** 2;
}

const linearPrompt = ({ b, c, m, s }: LinearParams, ask: string): Block[] => [
  say(`Values of $x$ have a mean of $${fmt(m)}$ and a standard deviation of $${fmt(s)}$. Each one is changed to`),
  show(`y = ${linTex(b, c)}`),
  say(ask),
];

function linearSolution({ b, c, m, s }: LinearParams): SolutionStep[] {
  const cTex = `${c > 0 ? '+' : '-'} ${fmt(Math.abs(c))}`;
  return [
    { text: 'The multiplying acts on the mean and on every gap; the adding only moves the mean.' },
    {
      tex: aligned(
        `\\bar{y} &= ${fmt(b)} \\times ${fmt(m)} ${cTex} = ${fmt(b * m + c)}`,
        `\\sigma_y &= ${fmt(b)} \\times ${fmt(s)} = ${fmt(b * s)}`,
        `\\sigma_y^2 &= ${fmt(b * s)}^2 = ${fmt((b * s) ** 2)}`,
      ),
    },
  ];
}

/**
 * y = bx + c from the mean and standard deviation of x: the mean or the
 * standard deviation of y with a whole b at difficulty 1; at 2 b may be a
 * half, c may be taken off, and the variance is asked too.
 */
const codeLinear: Generator<LinearParams> = {
  id: 'dat-code-linear',
  sample: (rng, difficulty) => sampleLinear(rng, difficulty, difficulty > 1 ? ['mean', 'sd', 'variance'] : ['mean', 'sd']),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: linearPrompt(p, `Find ${LINEAR_WORD[p.ask]} of $y$.`),
    lead: LINEAR_LEAD[p.ask],
    keypad: NUMBER_KEYS,
    answer: fmt(linearAnswer(p)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: linearSolution,
  choices: (p) => {
    const { b, c, m, s, ask } = p;
    const slips =
      ask === 'mean' ? [b * m, m + c, b * (m + c)] : ask === 'sd' ? [b * s + c, s, b * b * s] : [b * s * s, b * s, (b * s) ** 2 + c];
    return valueChoices(linearAnswer(p), slips.filter((x) => x > 0), mix(b * 10, c, m * 10, s * 10), 1);
  },
};

/**
 * y = bx + c as a tree: b times the mean and b times the standard deviation,
 * then the new mean and the new variance.
 */
const codeLinearTree: Generator<LinearParams> = {
  id: 'dat-code-bxc-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = sampleLinear(rng, difficulty, ['variance']);
      const answer = [p.b * p.m, p.b * p.s, p.b * p.m + p.c, (p.b * p.s) ** 2];
      if (new Set(answer.map(fmt)).size === 4 && answer.every((x) => exact(x, 2))) return p;
    }
  },
  render: (p): Slide => {
    const { b, c, m, s } = p;
    const answer = [b * m, b * s, b * m + c, (b * s) ** 2];
    const slips = [m + c, b * m - c, b * s + c, b * s * s, b * b * s, s * s];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Values of $x$ have $\\bar{x} = ${fmt(m)}$ and $\\sigma_x = ${fmt(s)}$. Find the mean and the variance of $y$. Top row: $${fmt(b)} \\times \\bar{x}$, then $${fmt(b)} \\times \\sigma_x$. Underneath: $\\bar{y}$, then $\\sigma_y^2$.`,
        ),
      ],
      expression: `y = ${linTex(b, c)}`,
      nodes: [
        { id: 'bm', from: [] },
        { id: 'bs', from: [] },
        { id: 'ym', from: ['bm'] },
        { id: 'yv', from: ['bs'] },
      ],
      bank: valueBank(answer, tidy(slips.filter((x) => x > 0))),
      answer: answer.map(fmt),
    };
  },
  solution: linearSolution,
};

/* ---------- coding and decoding ---------- */

/** y = (x - a)/b as the learner reads it, or y = x - a when b is 1. */
function codingTex(a: number, b: number): string {
  return b === 1 ? `y = x - ${fmt(a)}` : `y = \\frac{x - ${fmt(a)}}{${fmt(b)}}`;
}

interface CodedTableParams {
  a: number;
  b: number;
  ys: number[];
}

/**
 * Coding a short list: each value's coded value, then the coded mean. Four
 * values with coded values from 0 to 8 at difficulty 1; five at 2, with one
 * below the value subtracted, so a coded value is negative.
 */
const codeCodedTable: Generator<CodedTableParams> = {
  id: 'dat-code-coded-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const b = rng.pick(hard ? [5, 10, 20, 25] : [2, 5, 10]);
      const a = rng.int(hard ? 20 : 10, 99) * 10;
      const ys = rng.sample(hard ? [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6, 7, 8], hard ? 5 : 4);
      if (hard && !ys.some((y) => y < 0)) continue;
      const my = total(ys) / ys.length;
      if (!exact(my, 1) || ys.includes(my)) continue;
      return { a, b, ys };
    }
  },
  render: ({ a, b, ys }): Slide => {
    const xs = ys.map((y) => a + b * y);
    const my = total(ys) / ys.length;
    const answer = [...ys, my];
    const slips = [b * ys[0], b * ys[1], my * b, a + b * my, ys[0] + 1, my + 1];
    return {
      kind: 'table',
      prompt: [say('Code each value with'), show(codingTex(a, b)), say('Then find the mean of the coded values.')],
      columns: ['x', 'y'],
      rows: [...xs.map((x) => [fmt(x), null]), ['\\text{Mean}', null]],
      bank: valueBank(answer, tidy(slips)),
      answer: answer.map(fmt),
    };
  },
  solution: ({ a, b, ys }) => {
    const xs = ys.map((x) => a + b * x);
    return [
      { text: `Take $${fmt(a)}$ off each value, then divide by $${fmt(b)}$:` },
      { tex: aligned(...xs.map((x, i) => `\\frac{${fmt(x)} - ${fmt(a)}}{${fmt(b)}} &= ${fmt(ys[i])}`)) },
      { tex: `\\bar{y} = \\frac{${fmt(total(ys))}}{${ys.length}} = ${fmt(total(ys) / ys.length)}` },
    ];
  },
};

interface DecodeParams {
  a: number;
  b: number;
  /** The coded mean. */
  my: number;
  /** The coded standard deviation, or the coded variance when `ask` is variance. */
  sy: number;
  ask: 'mean' | 'sd' | 'variance';
}

const DECODE_LEAD = { mean: '\\bar{x} =', sd: '\\sigma_x =', variance: '\\sigma_x^2 =' };

function decodeAnswer({ a, b, my, sy, ask }: DecodeParams): number {
  return ask === 'mean' ? a + b * my : ask === 'sd' ? b * sy : b * b * sy;
}

const codedStatsTex = ({ my, sy, ask }: DecodeParams): string =>
  ask === 'variance' ? `\\bar{y} = ${fmt(my)} \\qquad \\sigma_y^2 = ${fmt(sy)}` : `\\bar{y} = ${fmt(my)} \\qquad \\sigma_y = ${fmt(sy)}`;

function decodeSolution(p: DecodeParams): SolutionStep[] {
  const { a, b, my, sy, ask } = p;
  const steps: SolutionStep[] = [{ text: `Decoding undoes the coding: $x = ${fmt(a)} + ${fmt(b)}y$.` }];
  if (ask === 'mean') {
    steps.push({ tex: `\\bar{x} = ${fmt(a)} + ${fmt(b)} \\times ${my < 0 ? `(${fmt(my)})` : fmt(my)} = ${fmt(a + b * my)}` });
  } else if (ask === 'sd') {
    steps.push(
      { text: `Adding $${fmt(a)}$ does not change a spread, so only the $${fmt(b)}$ acts on it.` },
      { tex: `\\sigma_x = ${fmt(b)} \\times ${fmt(sy)} = ${fmt(b * sy)}` },
    );
  } else {
    steps.push(
      { text: `Adding $${fmt(a)}$ does not change a spread, and the variance is multiplied by $${fmt(b)}^2$.` },
      { tex: `\\sigma_x^2 = ${fmt(b)}^2 \\times ${fmt(sy)} = ${fmt(b * b * sy)}` },
    );
  }
  return steps;
}

/**
 * Decoding a summary: the mean of x from the coded mean at difficulty 1, a
 * whole b; at 2 the standard deviation or variance of x too, with a coded
 * mean that may be negative.
 */
const codeDecode: Generator<DecodeParams> = {
  id: 'dat-code-decode',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const ask = hard ? rng.pick<DecodeParams['ask']>(['mean', 'sd', 'variance']) : 'mean';
      const b = rng.pick(hard ? [2, 4, 5, 10, 20] : [2, 5, 10]);
      const a = rng.int(2, 99) * 10;
      const my = hard ? oneDp(rng, -5, 8) : oneDp(rng, 0.5, 9);
      const sy = ask === 'variance' ? oneDp(rng, 0.5, 12) : oneDp(rng, 0.5, 6);
      const p = { a, b, my, sy, ask };
      if (my === 0 || !exact(decodeAnswer(p), 2)) continue;
      return p;
    }
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      say('Values of $x$ are coded with'),
      show(codingTex(p.a, p.b)),
      say('and the coded values have'),
      show(codedStatsTex(p)),
      say(`Find ${LINEAR_WORD[p.ask]} of $x$.`),
    ],
    lead: DECODE_LEAD[p.ask],
    keypad: NUMBER_KEYS,
    answer: fmt(decodeAnswer(p)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: decodeSolution,
  choices: (p) => {
    const { a, b, my, sy, ask } = p;
    const slips =
      ask === 'mean' ? [a + my, b * my, a * b + my, a - b * my] : ask === 'sd' ? [a + b * sy, sy, b * b * sy] : [b * sy, a + b * b * sy, sy];
    return valueChoices(decodeAnswer(p), slips, mix(a, b, my * 10, sy * 10), 1);
  },
};

/**
 * Decoding as tiles: the mean filled in as a + b times the coded mean, then
 * the standard deviation at difficulty 1 or the variance at 2.
 */
const codeDecodeTiles: Generator<DecodeParams> = {
  id: 'dat-code-decode-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const b = rng.pick(hard ? [2, 4, 5, 10, 20] : [2, 5, 10]);
      const a = rng.int(2, 99) * 10;
      const my = oneDp(rng, 0.5, 9);
      const sy = hard ? oneDp(rng, 0.5, 12) : oneDp(rng, 0.5, 6);
      const p: DecodeParams = { a, b, my, sy, ask: hard ? 'variance' : 'sd' };
      if (my === b || !exact(decodeAnswer(p), 2)) continue;
      return p;
    }
  },
  render: (p): Slide => {
    const { a, b, my, sy, ask } = p;
    const answer = [a, b, my, a + b * my, decodeAnswer(p)];
    const slips = [a + my, b * my, sy, ask === 'variance' ? b * sy : b * b * sy, a + decodeAnswer(p)];
    return {
      kind: 'tiles',
      prompt: [
        say('Values of $x$ are coded with'),
        show(codingTex(a, b)),
        say('and the coded values have'),
        show(codedStatsTex(p)),
        say(`Fill in the mean and the ${ask === 'sd' ? 'standard deviation' : 'variance'} of $x$.`),
      ],
      template: `\\bar{x} = {0} + {1} \\times {2} = {3} \\qquad ${ask === 'sd' ? '\\sigma_x' : '\\sigma_x^2'} = {4}`,
      bank: valueBank(answer, tidy(slips)),
      answer: answer.map(fmt),
    };
  },
  solution: (p) => [...decodeSolution({ ...p, ask: 'mean' }), ...decodeSolution(p).slice(1)],
};

interface EncodeParams {
  a: number;
  b: number;
  /** The coded mean and standard deviation the question works towards. */
  my: number;
  sy: number;
  ask: 'mean' | 'sd' | 'variance';
}

/** What is asked for, worked forwards from x. */
const encodeAnswer = ({ my, sy, ask }: EncodeParams): number => (ask === 'mean' ? my : ask === 'sd' ? sy : sy * sy);

/**
 * Coding a summary forwards: from the mean and standard deviation of x to
 * those of y. The mean or the standard deviation at difficulty 1; at 2 the
 * variance too, from a variance of x, and a coded mean that may be negative.
 */
const codeEncode: Generator<EncodeParams> = {
  id: 'dat-code-encode',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const b = rng.pick(hard ? [2, 4, 5, 10, 20] : [2, 5, 10]);
      const a = rng.int(2, 99) * 10;
      const my = hard ? oneDp(rng, -5, 8) : oneDp(rng, 0.5, 9);
      const sy = oneDp(rng, 0.5, 6);
      const ask = rng.pick<EncodeParams['ask']>(hard ? ['mean', 'sd', 'variance'] : ['mean', 'sd']);
      if (my === 0 || !exact(a + b * my, 2) || !exact(b * sy, 2) || !exact((b * sy) ** 2, 2)) continue;
      return { a, b, my, sy, ask };
    }
  },
  render: (p): Slide => {
    const { a, b, my, sy, ask } = p;
    const mx = a + b * my;
    const sx = b * sy;
    const given = ask === 'variance' ? `\\bar{x} = ${fmt(mx)} \\qquad \\sigma_x^2 = ${fmt(sx * sx)}` : `\\bar{x} = ${fmt(mx)} \\qquad \\sigma_x = ${fmt(sx)}`;
    return {
      kind: 'expression',
      prompt: [say('Values of $x$ have'), show(given), say('They are coded with'), show(codingTex(a, b)), say(`Find ${LINEAR_WORD[ask]} of $y$.`)],
      lead: LINEAR_LEAD[ask],
      keypad: NUMBER_KEYS,
      answer: fmt(encodeAnswer(p)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, my, sy, ask }) => {
    const mx = a + b * my;
    const sx = b * sy;
    if (ask === 'mean') {
      return [
        { text: 'Code the mean just as you would code one value: take off $a$, then divide by $b$.' },
        { tex: `\\bar{y} = \\frac{${fmt(mx)} - ${fmt(a)}}{${fmt(b)}} = ${fmt(my)}` },
      ];
    }
    if (ask === 'sd') {
      return [
        { text: `Taking off $${fmt(a)}$ leaves a spread alone, so only the dividing acts on it.` },
        { tex: `\\sigma_y = \\frac{${fmt(sx)}}{${fmt(b)}} = ${fmt(sy)}` },
      ];
    }
    return [
      { text: `Taking off $${fmt(a)}$ leaves a spread alone, and dividing by $${fmt(b)}$ divides the variance by $${fmt(b)}^2 = ${fmt(b * b)}$.` },
      { tex: `\\sigma_y^2 = \\frac{${fmt(sx * sx)}}{${fmt(b * b)}} = ${fmt(sy * sy)}` },
    ];
  },
  choices: (p) => {
    const { a, b, my, sy, ask } = p;
    const mx = a + b * my;
    const sx = b * sy;
    const slips = ask === 'mean' ? [mx - a, mx / b - a, (mx + a) / b] : ask === 'sd' ? [(sx - a) / b, sx, sx / (b * b)] : [(sx * sx) / b, sx * sx, sy];
    return valueChoices(encodeAnswer(p), slips, mix(a, b, my * 10, sy * 10), 1);
  },
};

/* ---------- variance from coded sums ---------- */

interface SumsTableParams {
  a: number;
  b: number;
  ys: number[];
}

/**
 * Coding four values and filling in y, y squared, and both sums: y = x - a
 * with coded values from 1 to 9 at difficulty 1; y = (x - a)/b at 2, with a
 * coded value below zero whose square is positive.
 */
const codeSumsTable: Generator<SumsTableParams> = {
  id: 'dat-code-sums-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const b = hard ? rng.pick([2, 5, 10]) : 1;
      const a = hard ? rng.int(5, 99) * 10 : rng.int(4, 99) * 5;
      const ys = rng.sample(hard ? [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7, 8, 9], 4);
      if (hard && !ys.some((y) => y < 0)) continue;
      if (hard && new Set(ys.map(Math.abs)).size !== 4) continue;
      return { a, b, ys };
    }
  },
  render: ({ a, b, ys }): Slide => {
    const xs = ys.map((y) => a + b * y);
    const sy = total(ys);
    const syy = total(ys.map((y) => y * y));
    const answer = [...ys.flatMap((y) => [y, y * y]), sy, syy];
    const slips = [b * ys[0], sy * sy, ...ys.filter((y) => y < 0).map((y) => -y * y), syy + 1];
    return {
      kind: 'table',
      prompt: [say('Code each value with'), show(codingTex(a, b)), say('Fill in $y$ and $y^2$ for each, then both totals.')],
      columns: ['x', 'y', 'y^2'],
      rows: [...xs.map((x) => [fmt(x), null, null]), ['\\textstyle\\sum', null, null]],
      bank: valueBank(answer, tidy(slips)),
      answer: answer.map(fmt),
    };
  },
  solution: ({ a, b, ys }) => {
    const xs = ys.map((y) => a + b * y);
    return [
      { text: b === 1 ? `Take $${fmt(a)}$ off each value, then square:` : `Take $${fmt(a)}$ off each value and divide by $${fmt(b)}$, then square:` },
      { tex: aligned(...xs.map((x, i) => `${fmt(x)} &\\to ${fmt(ys[i])} \\to ${fmt(ys[i] * ys[i])}`)) },
      { tex: `\\textstyle\\sum y = ${fmt(total(ys))} \\qquad \\sum y^2 = ${fmt(total(ys.map((y) => y * y)))}` },
    ];
  },
};

interface SumsParams {
  a: number;
  b: number;
  n: number;
  /** Σy and Σy². */
  sy: number;
  syy: number;
  ask: 'mean' | 'sd' | 'variance';
}

/** The coded mean and variance, and what they decode to. */
export function codedSummary({ a, b, n, sy, syy }: SumsParams) {
  const my = sy / n;
  const meanSq = syy / n;
  const vy = meanSq - my * my;
  return { my, meanSq, my2: my * my, vy, mx: a + b * my, vx: b * b * vy, sx: b * Math.sqrt(vy) };
}

/**
 * n, Σy and Σy² for coded data, drawn from a coded mean and standard
 * deviation so everything asked is exact: y = x - a at difficulty 1 unless
 * `scaled`, y = (x - a)/b otherwise. `root` asks for a coded standard
 * deviation with an exact root; `positive` keeps the coded mean above zero.
 */
function sampleSums(
  rng: Rng,
  difficulty: number,
  opts: { scaled?: boolean; root?: boolean; positive?: boolean; asks?: SumsParams['ask'][] } = {},
): SumsParams {
  const hard = difficulty > 1;
  for (;;) {
    const b = hard || opts.scaled ? rng.pick(hard ? [2, 4, 5, 10, 20] : [2, 5, 10]) : 1;
    const a = rng.int(2, 99) * 10;
    const n = rng.int(5, 30);
    const my = rng.int(opts.positive ? 1 : -20, 50) / 10;
    const sdy = opts.root ? rng.pick([1, 1.5, 2, 2.5, 3, 4, 5, 6]) : 0;
    const vy = opts.root ? sdy * sdy : rng.int(5, 200) / 10;
    const sy = n * my;
    const syy = n * (vy + my * my);
    if (!whole(sy) || !whole(syy) || sy === 0) continue;
    const ask = rng.pick<SumsParams['ask']>(opts.asks ?? ['mean']);
    const p = { a, b, n, sy: Math.round(sy), syy: Math.round(syy), ask };
    const s = codedSummary(p);
    if (![s.my, s.meanSq, s.my2, s.vy, s.mx, s.vx].every((x) => exact(x, 2))) continue;
    if (opts.root && !exact(s.sx, 2)) continue;
    return p;
  }
}

const sumsPrompt = ({ a, b, n, sy, syy }: SumsParams, ask: string): Block[] => [
  say(`$${n}$ values of $x$ are coded with`),
  show(codingTex(a, b)),
  say('giving'),
  show(`\\textstyle\\sum y = ${fmt(sy)} \\qquad \\sum y^2 = ${fmt(syy)}`),
  say(ask),
];

function sumsSolution(p: SumsParams): SolutionStep[] {
  const { a, b, n, sy, syy, ask } = p;
  const s = codedSummary(p);
  const steps: SolutionStep[] = [{ tex: `\\bar{y} = \\frac{${fmt(sy)}}{${n}} = ${fmt(s.my)}` }];
  if (ask === 'mean') {
    steps.push({ tex: `\\bar{x} = ${fmt(a)} + ${b === 1 ? '' : `${fmt(b)} \\times `}${s.my < 0 ? `(${fmt(s.my)})` : fmt(s.my)} = ${fmt(s.mx)}` });
    return steps;
  }
  steps.push({
    tex: aligned(`\\sigma_y^2 &= \\frac{${fmt(syy)}}{${n}} - ${s.my < 0 ? `(${fmt(s.my)})` : fmt(s.my)}^2`, `&= ${fmt(s.meanSq)} - ${fmt(s.my2)} = ${fmt(s.vy)}`),
  });
  if (ask === 'variance') {
    steps.push(
      { text: b === 1 ? 'Taking off $a$ changed no spread, so the variance of $x$ is the same.' : `Decode: the $${fmt(a)}$ does not touch a spread, and the variance is multiplied by $${fmt(b)}^2$.` },
      { tex: `\\sigma_x^2 = ${b === 1 ? '' : `${fmt(b)}^2 \\times `}${fmt(s.vy)} = ${fmt(s.vx)}` },
    );
  } else {
    steps.push(
      { tex: `\\sigma_y = \\sqrt{${fmt(s.vy)}} = ${fmt(Math.sqrt(s.vy))}` },
      { text: `Decode: the $${fmt(a)}$ does not touch a spread${b === 1 ? '' : `, and the standard deviation is multiplied by $${fmt(b)}$`}.` },
      { tex: `\\sigma_x = ${b === 1 ? '' : `${fmt(b)} \\times `}${fmt(Math.sqrt(s.vy))} = ${fmt(s.sx)}` },
    );
  }
  return steps;
}

/**
 * The variance of x from coded sums, as a tree: the coded mean and the mean
 * of the squares, the coded mean squared, the coded variance, and the
 * variance of x. A whole b of 2, 5 or 10 at difficulty 1; at 2 any b, and a
 * coded mean that may be negative.
 */
const codeSumsTree: Generator<SumsParams> = {
  id: 'dat-code-var-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = sampleSums(rng, difficulty, { scaled: true, positive: difficulty === 1, asks: ['variance'] });
      const s = codedSummary(p);
      const answer = [s.my, s.meanSq, s.my2, s.vy, s.vx];
      if (new Set(answer.map(fmt)).size === 5) return p;
    }
  },
  render: (p): Slide => {
    const s = codedSummary(p);
    const answer = [s.my, s.meanSq, s.my2, s.vy, s.vx];
    const slips = [s.meanSq - s.my, 2 * s.my, (p.sy * p.sy) / p.n, p.b * s.vy, s.vy + p.a, s.mx];
    return {
      kind: 'tree',
      prompt: sumsPrompt(
        p,
        'Find the variance of $x$. Top row: $\\bar{y}$, then $\\frac{\\sum y^2}{n}$. Then $\\bar{y}^2$, then $\\sigma_y^2$, and last $\\sigma_x^2$.',
      ),
      expression: `\\sigma_x^2 = ${fmt(p.b)}^2 \\times \\sigma_y^2`,
      nodes: [
        { id: 'ybar', from: [] },
        { id: 'sq', from: [] },
        { id: 'ybar2', from: ['ybar'] },
        { id: 'vy', from: ['sq', 'ybar2'] },
        { id: 'vx', from: ['vy'] },
      ],
      bank: valueBank(answer, tidy(slips)),
      answer: answer.map(fmt),
    };
  },
  solution: sumsSolution,
};

/**
 * The mean of x from Σy, one operation at a time: y = x - a at difficulty 1,
 * so the coded mean and then a added; at 2 y = (x - a)/b, so the coded
 * mean, times b, plus a.
 */
const codeSumsMean: Generator<SumsParams> = {
  id: 'dat-code-sums-mean',
  sample: (rng, difficulty) => sampleSums(rng, difficulty, { positive: true }),
  render: (p): Slide => {
    const { a, b, n, sy } = p;
    const s = codedSummary(p);
    const bank = (value: number, ...slips: number[]) => stepBank(fmt(value), ...tidy(slips).map(fmt).filter((t) => t !== fmt(value)));
    const prompt: Block[] = [
      say(`$${n}$ values of $x$ are coded with`),
      show(codingTex(a, b)),
      say(`and $\\sum y = ${fmt(sy)}$. Find the mean of $x$: tap the part you would do next, then choose what it comes to.`),
    ];
    if (b === 1) {
      return {
        kind: 'steps',
        prompt,
        start: [fmt(a), '+', fmt(sy), '\\div', `${n}`],
        reductions: [
          { span: [2, 5], operator: 3, value: fmt(s.my), bank: bank(s.my, sy * n, s.my + 1, s.my - 1) },
          { span: [0, 3], operator: 1, value: fmt(s.mx), bank: bank(s.mx, a + sy, s.mx + 1, s.mx - 1) },
        ],
      };
    }
    return {
      kind: 'steps',
      prompt,
      start: [fmt(a), '+', fmt(b), '\\times', '(', fmt(sy), '\\div', `${n}`, ')'],
      reductions: [
        { span: [4, 9], operator: 6, value: fmt(s.my), bank: bank(s.my, sy * n, s.my + 1, s.my - 1) },
        { span: [2, 5], operator: 3, value: fmt(b * s.my), bank: bank(b * s.my, b + s.my, s.my / b, b * s.my + b) },
        { span: [0, 3], operator: 1, value: fmt(s.mx), bank: bank(s.mx, a + s.my, s.mx + 1, s.mx - 1) },
      ],
    };
  },
  solution: sumsSolution,
};

const SUMS_LEAD = DECODE_LEAD;

/**
 * The mean, standard deviation or variance of x from coded sums, typed. The
 * mean or variance with y = x - a at difficulty 1; at 2 y = (x - a)/b and the
 * standard deviation too, with a coded variance whose root is exact.
 */
const codeSums: Generator<SumsParams> = {
  id: 'dat-code-sums',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const ask = rng.pick<SumsParams['ask']>(hard ? ['mean', 'sd', 'variance'] : ['mean', 'variance']);
    return sampleSums(rng, difficulty, { root: ask === 'sd', asks: [ask] });
  },
  render: (p): Slide => {
    const s = codedSummary(p);
    return {
      kind: 'expression',
      prompt: sumsPrompt(p, `Find ${LINEAR_WORD[p.ask]} of $x$.`),
      lead: SUMS_LEAD[p.ask],
      keypad: NUMBER_KEYS,
      answer: fmt(p.ask === 'mean' ? s.mx : p.ask === 'sd' ? s.sx : s.vx),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: sumsSolution,
  choices: (p) => {
    const s = codedSummary(p);
    const { a, b, ask } = p;
    const right = ask === 'mean' ? s.mx : ask === 'sd' ? s.sx : s.vx;
    const slips = ask === 'mean' ? [a + p.sy, b * s.my, a + s.my] : ask === 'sd' ? [a + s.sx, b * s.vy, Math.sqrt(s.vy)] : [b * s.vy, a + s.vx, s.meanSq * b * b, s.vy];
    return valueChoices(right, tidy(slips), mix(a, b, p.n, p.sy, p.syy), 1);
  },
};

/* ---------- coding in context ---------- */

interface ConvertContext {
  what: string;
  /** Unit written after a value before and after, TeX. */
  from: string;
  to: string;
  toWords: string;
  rule: string;
  b: number;
  c: number;
}

const CONVERSIONS: ConvertContext[] = [
  {
    what: 'Temperatures at a weather station',
    from: '^\\circ\\text{C}',
    to: '^\\circ\\text{F}',
    toWords: 'degrees Fahrenheit',
    rule: 'F = 1.8C + 32',
    b: 1.8,
    c: 32,
  },
  {
    what: 'Temperatures in a greenhouse',
    from: '^\\circ\\text{C}',
    to: '^\\circ\\text{F}',
    toWords: 'degrees Fahrenheit',
    rule: 'F = 1.8C + 32',
    b: 1.8,
    c: 32,
  },
  { what: 'Marks in a test out of $40$', from: '', to: '\\%', toWords: 'percentages', rule: 'P = 2.5M', b: 2.5, c: 0 },
  { what: 'Marks in a quiz out of $20$', from: '', to: '\\%', toWords: 'percentages', rule: 'P = 5M', b: 5, c: 0 },
  { what: 'Times spent on homework', from: '\\text{ h}', to: '\\text{ min}', toWords: 'minutes', rule: 'M = 60H', b: 60, c: 0 },
];

interface ConvertParams {
  context: number;
  m: number;
  s: number;
  ask: 'mean' | 'sd' | 'variance';
}

function convertAnswer({ context, m, s, ask }: ConvertParams): number {
  const { b, c } = CONVERSIONS[context];
  return ask === 'mean' ? b * m + c : ask === 'sd' ? b * s : b * b * s;
}

/**
 * A summary converted into other units, a coding in all but name: the mean
 * or standard deviation at difficulty 1, and at 2 the standard deviation or
 * the variance, which goes up by the square of the multiplier.
 */
const codeConvert: Generator<ConvertParams> = {
  id: 'dat-code-convert',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const context = rng.int(0, CONVERSIONS.length - 1);
      const ask = rng.pick<ConvertParams['ask']>(hard ? ['sd', 'variance'] : ['mean', 'sd']);
      const [lo, hi] = CONVERSIONS[context].b === 60 ? [0.5, 4] : CONVERSIONS[context].c ? [5, 30] : [8, 18];
      const m = oneDp(rng, lo, hi);
      const s = ask === 'variance' ? (CONVERSIONS[context].b === 60 ? rng.int(1, 20) / 100 : rng.int(2, 30)) : oneDp(rng, 0.5, lo < 1 ? 1.5 : 6);
      const p = { context, m, s, ask };
      if (!exact(convertAnswer(p), 2)) continue;
      return p;
    }
  },
  render: (p): Slide => {
    const ctx = CONVERSIONS[p.context];
    const spread = p.ask === 'variance' ? `a variance of $${fmt(p.s)}$` : `a standard deviation of $${fmt(p.s)}${ctx.from}$`;
    return {
      kind: 'expression',
      prompt: [
        say(`${ctx.what} have a mean of $${fmt(p.m)}${ctx.from}$ and ${spread}. They are converted into ${ctx.toWords} with`),
        show(ctx.rule),
        say(`Find ${LINEAR_WORD[p.ask]} in ${ctx.toWords}.`),
      ],
      lead: p.ask === 'mean' ? '\\text{mean} =' : p.ask === 'sd' ? '\\text{SD} =' : '\\text{variance} =',
      keypad: NUMBER_KEYS,
      answer: fmt(convertAnswer(p)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ context, m, s, ask }) => {
    const { b, c, rule } = CONVERSIONS[context];
    const stat: CodeStat = ask === 'mean' ? 'mean' : ask;
    return [{ text: `The rule $${rule}$ multiplies every value by $${fmt(b)}$${c ? ` and adds $${c}$` : ''}.` }, ...moveSolution(stat, ask === 'mean' ? m : s, b, c)];
  },
  choices: (p) => {
    const { b, c } = CONVERSIONS[p.context];
    const { m, s, ask } = p;
    const slips = ask === 'mean' ? [b * m, m + c, b * (m + c)] : ask === 'sd' ? [b * s + c, s, b * b * s] : [b * s, b * s + c, b * b * s + c, s];
    return valueChoices(convertAnswer(p), tidy(slips).filter((x) => x > 0), mix(p.context, m * 10, s * 100), 1);
  },
};

interface ChooseParams {
  /** The values, in the order the prompt lists them. */
  xs: number[];
  /** The coded values asked for, in order. */
  targets: number[];
  a: number;
  b: number;
}

/**
 * Choosing a coding: five equally spaced values, and a and b to turn them
 * into given coded values. -2 to 2 at difficulty 1, so a is the middle value
 * and b the gap; at 2 the values are jumbled, and the targets are 0 to 4, so
 * a is the smallest, or -4 to 4 in twos, so b is half the gap.
 */
const codeChooseTiles: Generator<ChooseParams> = {
  id: 'dat-code-choose-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const plan = hard ? rng.pick(['zero', 'even'] as const) : 'mid';
    const gap = rng.pick(plan === 'even' ? [10, 20, 30, 40, 50] : [5, 10, 15, 20, 25, 50]);
    const first = rng.int(10, 300) * 5;
    const sorted = Array.from({ length: 5 }, (_, i) => first + i * gap);
    const targets = plan === 'mid' ? [-2, -1, 0, 1, 2] : plan === 'zero' ? [0, 1, 2, 3, 4] : [-4, -2, 0, 2, 4];
    const a = plan === 'zero' ? sorted[0] : sorted[2];
    const b = plan === 'even' ? gap / 2 : gap;
    return { xs: hard ? rng.shuffle(sorted) : sorted, targets, a, b };
  },
  render: ({ xs, targets, a, b }): Slide => {
    const s = ordered(xs);
    const gap = s[1] - s[0];
    const slips = [a === s[0] ? s[2] : s[0], s[4], b === gap ? 2 * gap : gap, a + gap, b / 2];
    return {
      kind: 'tiles',
      prompt: [
        say(`The values ${listProse(xs)} are coded with`),
        show('y = \\frac{x - a}{b}'),
        say(`so that the coded values are ${listProse(targets)}. Fill in $a$ and $b$.`),
      ],
      template: 'y = (x - {0}) \\div {1}',
      bank: valueBank([a, b], tidy(slips), 4),
      answer: [fmt(a), fmt(b)],
    };
  },
  solution: ({ xs, targets, a, b }) => {
    const s = ordered(xs);
    const zero = targets.indexOf(0);
    return [
      { text: `The value coded as $0$ is the one $a$ is taken from: in order, the ${nth(zero + 1)} value, $${fmt(a)}$.` },
      { text: `Neighbouring values are $${fmt(s[1] - s[0])}$ apart, and their coded values $${fmt(targets[1] - targets[0])}$ apart, so $b = ${fmt(b)}$.` },
      { tex: `y = \\frac{x - ${fmt(a)}}{${fmt(b)}}` },
    ];
  },
};

const CODED_PAIRS: { intro: string; names: [string, string] }[] = [
  { intro: 'Two farms weighed the eggs their hens laid, in grams.', names: ['Farm A', 'Farm B'] },
  { intro: 'Two machines filled bags of rice, in grams.', names: ['Machine A', 'Machine B'] },
  { intro: 'Two shops weighed their bags of flour, in grams.', names: ['Shop A', 'Shop B'] },
  { intro: 'Two bakeries weighed their loaves, in grams.', names: ['Bakery A', 'Bakery B'] },
  { intro: 'Two orchards weighed their apples, in grams.', names: ['Orchard A', 'Orchard B'] },
];

interface CompareCodedParams {
  context: number;
  a: [number, number];
  b: [number, number];
  my: [number, number];
  sy: [number, number];
}

const decodedMeans = ({ a, b, my }: CompareCodedParams): [number, number] => [a[0] + b[0] * my[0], a[1] + b[1] * my[1]];
const decodedSds = ({ b, sy }: CompareCodedParams): [number, number] => [b[0] * sy[0], b[1] * sy[1]];

/**
 * Two sets coded two different ways. At difficulty 1 both take off a
 * different a, so the coded means compare the wrong way round; at 2 they
 * divide by a different b as well, so the coded standard deviations do too.
 */
function sampleCompareCoded(rng: Rng, difficulty: number): CompareCodedParams {
  const hard = difficulty > 1;
  for (;;) {
    const a0 = rng.int(5, 90) * 10;
    const a: [number, number] = hard ? [a0, a0] : [a0, a0 + rng.pick([10, 20, 30]) * rng.sign()];
    const b: [number, number] = hard ? (rng.sample([1, 2, 4, 5], 2) as [number, number]) : [1, 1];
    const my: [number, number] = [oneDp(rng, 1, 12), oneDp(rng, 1, 12)];
    const sy: [number, number] = [oneDp(rng, 1, 6), oneDp(rng, 1, 6)];
    const p = { context: rng.int(0, CODED_PAIRS.length - 1), a, b, my, sy };
    const [m0, m1] = decodedMeans(p);
    const [s0, s1] = decodedSds(p);
    if (m0 === m1 || s0 === s1 || my[0] === my[1] || sy[0] === sy[1]) continue;
    if (!hard && Math.sign(m0 - m1) === Math.sign(my[0] - my[1])) continue;
    if (hard && Math.sign(s0 - s1) === Math.sign(sy[0] - sy[1])) continue;
    if (![m0, m1, s0, s1].every((x) => exact(x, 2))) continue;
    return p;
  }
}

function comparePrompt(p: CompareCodedParams, ask: string): Block[] {
  const [nA, nB] = CODED_PAIRS[p.context].names;
  return [
    say(`${CODED_PAIRS[p.context].intro} Each coded its masses its own way:`),
    show(`\\text{${nA}:} \\; ${codingTex(p.a[0], p.b[0])} \\qquad \\text{${nB}:} \\; ${codingTex(p.a[1], p.b[1])}`),
    show(
      `\\begin{array}{l|c|c} & \\bar{y} & \\sigma_y \\\\ \\hline \\text{${nA}} & ${fmt(p.my[0])} & ${fmt(p.sy[0])} \\\\ \\text{${nB}} & ${fmt(p.my[1])} & ${fmt(p.sy[1])} \\end{array}`,
    ),
    say(ask),
  ];
}

function compareCodedSolution(p: CompareCodedParams): SolutionStep[] {
  const [nA, nB] = CODED_PAIRS[p.context].names;
  const means = decodedMeans(p);
  const sds = decodedSds(p);
  const times = (i: 0 | 1) => (p.b[i] === 1 ? '' : `${fmt(p.b[i])} \\times `);
  const lines = (i: 0 | 1) => {
    const tag = i === 0 ? 'A' : 'B';
    return [
      `\\bar{x}_${tag} &= ${fmt(p.a[i])} + ${times(i)}${fmt(p.my[i])} = ${fmt(means[i])}`,
      `\\sigma_${tag} &= ${times(i)}${fmt(p.sy[i])}${p.b[i] === 1 ? '' : ` = ${fmt(sds[i])}`}`,
    ];
  };
  return [
    { text: `Decode each set with its own coding before comparing:` },
    { tex: '\\bar{x} = a + b\\bar{y} \\qquad \\sigma_x = b\\sigma_y' },
    { tex: aligned(...lines(0), ...lines(1)) },
    {
      text: `${means[0] > means[1] ? nA : nB} has the higher mean, and ${sds[0] < sds[1] ? nA : nB} the smaller standard deviation, so it is more consistent.`,
    },
  ];
}

/** Both sets decoded into a table of means and standard deviations. */
const codeCompareTable: Generator<CompareCodedParams> = {
  id: 'dat-code-compare-table',
  sample: sampleCompareCoded,
  render: (p): Slide => {
    const [nA, nB] = CODED_PAIRS[p.context].names;
    const means = decodedMeans(p);
    const sds = decodedSds(p);
    const answer = [means[0], sds[0], means[1], sds[1]];
    const slips = [p.a[0] + p.my[1], p.a[1] + p.my[0], p.a[0] + p.sy[0], p.b[0] * p.b[0] * p.sy[0], p.b[1] * p.b[1] * p.sy[1], p.a[1] + p.sy[1]];
    return {
      kind: 'table',
      prompt: comparePrompt(p, 'Decode both: fill in the mean and standard deviation of each.'),
      columns: ['', '\\bar{x}', '\\sigma_x'],
      rows: [
        [`\\text{${nA}}`, null, null],
        [`\\text{${nB}}`, null, null],
      ],
      bank: valueBank(answer, tidy(slips.filter((x) => x > 0))),
      answer: answer.map(fmt),
    };
  },
  solution: compareCodedSolution,
};

/** Which set has the higher mean, then which is more consistent, once decoded. */
const codeCompareFlow: Generator<CompareCodedParams> = {
  id: 'dat-code-compare-flow',
  sample: sampleCompareCoded,
  render: (p): Slide => {
    const [nA, nB] = CODED_PAIRS[p.context].names;
    const means = decodedMeans(p);
    const sds = decodedSds(p);
    const verdict = (best: string) =>
      [nA, nB].map((y) => ({
        label: y,
        outcome: best === y ? `${best} is heavier on average and more consistent.` : `${best} is heavier on average, but ${y} is more consistent.`,
      }));
    return {
      kind: 'flow',
      prompt: comparePrompt(p, 'Compare the two sets of masses.'),
      subject: '\\bar{x} = a + b\\bar{y} \\qquad \\sigma_x = b\\sigma_y',
      steps: [
        {
          id: 'mean',
          ask: 'Decoded, which has the higher mean?',
          branches: [
            { label: nA, to: 'ca' },
            { label: nB, to: 'cb' },
          ],
        },
        { id: 'ca', ask: 'Decoded, which has the smaller standard deviation?', branches: verdict(nA) },
        { id: 'cb', ask: 'Decoded, which has the smaller standard deviation?', branches: verdict(nB) },
      ],
      answer: [means[0] > means[1] ? nA : nB, sds[0] < sds[1] ? nA : nB],
    };
  },
  solution: compareCodedSolution,
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
  stemLeaves,
  stemRead,
  stemQuartiles,
  stemKeyChoice,
  boxFive,
  boxRead,
  boxSlider,
  boxWhisker,
  boxFence,
  boxesChoice,
  boxesFlow,
  boxesTree,
  boxesPercent,
  fdTable,
  fdTiles,
  fdSlider,
  fdArea,
  histPart,
  histTotal,
  histTallest,
  histScaleGen,
  cfTable,
  cfPoint,
  cfBack,
  cfCount,
  cfBelowSlider,
  cfBetween,
  cfAbove,
  cfCheck,
  cfQuartileSlider,
  cfPositions,
  cfIqr,
  cfRule,
  pctPositionTiles,
  pctSlider,
  pctRange,
  pctRank,
  interpClass,
  interpTiles,
  interpSteps,
  interpValue,
  codeShift,
  codeShiftTable,
  codeShiftBack,
  codeEffectFlow,
  codeScale,
  codeScaleTable,
  codeLinear,
  codeLinearTree,
  codeCodedTable,
  codeDecode,
  codeDecodeTiles,
  codeEncode,
  codeSumsTable,
  codeSumsTree,
  codeSumsMean,
  codeSums,
  codeConvert,
  codeChooseTiles,
  codeCompareTable,
  codeCompareFlow,
];
