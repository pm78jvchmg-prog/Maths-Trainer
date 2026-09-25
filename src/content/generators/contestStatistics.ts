/**
 * Contest Math, level 3: Basic Statistics.
 *
 * Four lessons: the four measures of a data set, how they move when the set
 * changes, a set pinned down by its measures, and questions where the
 * measures leave more than one set possible. The idea under almost all of it
 * is that a mean is a total in disguise: the total is the mean times the
 * count, so a new value, a dropped value or a merged class is one subtraction
 * of totals. The rest is where the median sits: in the middle, which fixes
 * a place, and which moves with x when x is one of the numbers.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { Generator, SolutionStep } from '../types';
import { num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ---------- small helpers ---------- */

const sortUp = (xs: number[]): number[] => [...xs].sort((a, b) => a - b);
const total = (xs: number[]): number => xs.reduce((s, v) => s + v, 0);
/** A data set as TeX, spaced for reading: `7,\ 3,\ 9`. */
const listTex = (xs: number[]): string => xs.map(num).join(',\\ ');
/** A data set in prose: `72, 85, 64 and 90`. */
const andList = (xs: number[]): string => `${xs.slice(0, -1).map(num).join(', ')} and ${num(xs[xs.length - 1])}`;
const range = (lo: number, hi: number): number[] => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

function medianOf(xs: number[]): number {
  const s = sortUp(xs);
  const n = s.length;
  return n % 2 === 1 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

const WORDS: Record<number, string> = {
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Eleven',
};

/* ================================================================
 * Lesson 1: Data Measures
 * ================================================================ */

/* ---------- mean, median, mode and range in one table ---------- */

interface MeasuresParams {
  /** In the order shown. Exactly one value appears twice. */
  values: number[];
}

function measures(values: number[]) {
  const s = sortUp(values);
  const mode = s.find((v, i) => s[i + 1] === v) as number;
  return { mean: total(values) / values.length, median: medianOf(values), mode, range: s[s.length - 1] - s[0] };
}

/** The median read straight off the unsorted list: the trap. */
function unsortedMiddle(values: number[]): number {
  const n = values.length;
  return n % 2 === 1 ? values[(n - 1) / 2] : (values[n / 2 - 1] + values[n / 2]) / 2;
}

const cmStatMeasures: Generator<MeasuresParams> = {
  id: 'cm-stat-measures',
  sample(rng, difficulty) {
    const n = difficulty >= 2 ? 8 : 7;
    for (;;) {
      const distinct = rng.sample(range(2, 30), n - 1);
      const values = rng.shuffle([...distinct, rng.pick(distinct)]);
      if (total(values) % n !== 0) continue;
      const m = measures(values);
      if (new Set([m.mean, m.median, m.mode, m.range].map(num)).size < 4) continue;
      if (unsortedMiddle(values) === m.median) continue;
      return { values };
    }
  },
  render({ values }) {
    const m = measures(values);
    const answer = [m.mean, m.median, m.mode, m.range];
    return {
      kind: 'table',
      prompt: [say('Find the four measures of this data set.'), show(listTex(values))],
      columns: ['\\text{measure}', '\\text{value}'],
      rows: [
        ['\\text{mean}', null],
        ['\\text{median}', null],
        ['\\text{mode}', null],
        ['\\text{range}', null],
      ],
      bank: numberBank(answer, [unsortedMiddle(values), Math.max(...values), Math.min(...values)], 3),
      answer: answer.map(num),
    };
  },
  solution({ values }) {
    const s = sortUp(values);
    const n = values.length;
    const m = measures(values);
    const steps: SolutionStep[] = [
      { text: 'Sort the data first:' },
      { tex: listTex(s) },
      { text: `There are ${n} values and they add to ${total(values)}:` },
      { tex: `\\text{mean} = ${total(values)} \\div ${n} = ${num(m.mean)}` },
    ];
    if (n % 2 === 1) {
      steps.push({ text: `The median is the middle value, the ${ordinal((n + 1) / 2)}:` }, { tex: `\\text{median} = ${m.median}` });
    } else {
      steps.push(
        { text: `With ${n} values the median is halfway between the ${ordinal(n / 2)} and the ${ordinal(n / 2 + 1)}:` },
        { tex: `\\text{median} = (${s[n / 2 - 1]} + ${s[n / 2]}) \\div 2 = ${num(m.median)}` },
      );
    }
    steps.push(
      { text: `Only ${m.mode} appears twice, so it is the mode. The range is the largest take away the smallest:` },
      { tex: `\\text{range} = ${s[n - 1]} - ${s[0]} = ${m.range}` },
    );
    return steps;
  },
};

/* ---------- the median of a frequency table ---------- */

interface FreqParams {
  /** How many matches ended with 0, 1, 2, 3 and 4 goals. */
  counts: number[];
}

/** The value in place `i` (1-based) of the data the counts describe. */
function valueAt(counts: number[], i: number): number {
  let seen = 0;
  for (let v = 0; v < counts.length; v += 1) {
    seen += counts[v];
    if (i <= seen) return v;
  }
  return counts.length - 1;
}

function freqMedian(counts: number[]): number {
  const n = total(counts);
  return n % 2 === 1 ? valueAt(counts, (n + 1) / 2) : (valueAt(counts, n / 2) + valueAt(counts, n / 2 + 1)) / 2;
}

const cmFreqMedian: Generator<FreqParams> = {
  id: 'cm-freq-median',
  sample(rng, difficulty) {
    for (;;) {
      const counts = [0, 1, 2, 3, 4].map(() => rng.int(1, 9));
      const n = total(counts);
      if (difficulty >= 2 ? n % 2 === 1 : n % 2 === 0) continue;
      const md = freqMedian(counts);
      const top = Math.max(...counts);
      if (counts.filter((c) => c === top).length > 1) continue;
      const mode = counts.indexOf(top);
      // The middle of the goals row and the mode are the two traps: neither may be right.
      if (md === 2 || md === mode) continue;
      if (difficulty >= 2 && Number.isInteger(md)) continue;
      return { counts };
    }
  },
  render({ counts }) {
    return typed(
      [
        say(`A team noted the goals it scored in each of its ${total(counts)} matches.`),
        show(`\\begin{array}{c|ccccc} \\text{goals} & 0 & 1 & 2 & 3 & 4 \\\\ \\hline \\text{matches} & ${counts.join(' & ')} \\end{array}`),
        say('What is the median number of goals?'),
      ],
      freqMedian(counts),
      '\\text{median} =',
    );
  },
  choices({ counts }) {
    const md = freqMedian(counts);
    const n = total(counts);
    const mode = counts.indexOf(Math.max(...counts));
    const slips = [2, mode, medianOf(counts), valueAt(counts, Math.floor(n / 2))];
    return numberOptions(md, slips, Number.isInteger(md) ? 1 : 0.5, 0);
  },
  solution({ counts }) {
    const n = total(counts);
    const md = freqMedian(counts);
    const steps: SolutionStep[] = [];
    const last = n % 2 === 1 ? (n + 1) / 2 : n / 2 + 1;
    if (n % 2 === 1) steps.push({ text: `There are ${n} matches, so the median is the ${ordinal((n + 1) / 2)} value in order.` });
    else steps.push({ text: `There are ${n} matches, so the median is halfway between the ${ordinal(n / 2)} and ${ordinal(n / 2 + 1)} values in order.` });
    let seen = 0;
    for (let v = 0; v < counts.length && seen < last; v += 1) {
      const from = seen + 1;
      seen += counts[v];
      const places = counts[v] === 1 ? `place ${from}` : `places ${from} to ${seen}`;
      steps.push({ text: `The ${v}s fill ${places}.` });
    }
    if (n % 2 === 1) steps.push({ tex: `\\text{median} = ${md}` });
    else {
      steps.push({ tex: `\\text{median} = (${valueAt(counts, n / 2)} + ${valueAt(counts, n / 2 + 1)}) \\div 2 = ${num(md)}` });
    }
    steps.push({ text: 'The median counts matches, not the columns of the table: the middle column, 2, is a trap.' });
    return steps;
  },
};

/* ---------- the total is the mean times the count ---------- */

interface MissingParams {
  n: number;
  mean: number;
  /** Difficulty 1: the scores other than the last. */
  known: number[];
  /** Difficulty 2: the mean once the lowest is dropped. */
  after: number;
}

const missingAnswer = (p: MissingParams) =>
  p.known.length > 0 ? p.n * p.mean - total(p.known) : p.n * p.mean - (p.n - 1) * p.after;

const cmMissingScore: Generator<MissingParams> = {
  id: 'cm-missing-score',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const n = rng.int(5, 9);
        const mean = rng.int(55, 88);
        const after = mean + rng.int(1, 4);
        const p = { n, mean, known: [], after };
        if (missingAnswer(p) < 20) continue;
        return p;
      }
      const n = rng.int(4, 6);
      const mean = rng.int(60, 90);
      const known = Array.from({ length: n - 1 }, () => rng.int(50, 100));
      const p = { n, mean, known, after: 0 };
      const last = missingAnswer(p);
      if (last < 40 || last > 100 || last === mean) continue;
      return p;
    }
  },
  render(p) {
    if (p.known.length > 0) {
      return typed(
        [
          say(`Ali’s mean score over ${p.n} tests is ${p.mean}. His first ${p.n - 1} scores were ${andList(p.known)}.`),
          say('What did he score on the last test?'),
        ],
        missingAnswer(p),
        '\\text{last score} =',
      );
    }
    return typed(
      [
        say(`The mean of ${p.n} test scores is ${p.mean}. When the lowest score is dropped, the mean of the rest is ${p.after}.`),
        say('What was the lowest score?'),
      ],
      missingAnswer(p),
      '\\text{lowest} =',
    );
  },
  choices(p) {
    const x = missingAnswer(p);
    if (p.known.length > 0) {
      const knownMean = total(p.known) / p.known.length;
      return numberOptions(x, [p.mean, knownMean, 2 * p.mean - x, x + 10, x - 10], 1, 0);
    }
    const d = p.after - p.mean;
    return numberOptions(x, [p.mean - d, p.mean - p.n * d, p.mean, p.mean - (p.n - 2) * d], 1, 0);
  },
  solution(p) {
    const x = missingAnswer(p);
    if (p.known.length > 0) {
      return [
        { text: 'A mean is a total shared out, so the total is the mean times the count:' },
        { tex: `${p.n} \\times ${p.mean} = ${p.n * p.mean}` },
        { text: `The first ${p.n - 1} scores add to` },
        { tex: `${p.known.join(' + ')} = ${total(p.known)}` },
        { text: 'The last score is what is left:' },
        { tex: `${p.n * p.mean} - ${total(p.known)} = ${x}` },
      ];
    }
    return [
      { text: 'Work with totals. All the scores:' },
      { tex: `${p.n} \\times ${p.mean} = ${p.n * p.mean}` },
      { text: `The other ${p.n - 1}:` },
      { tex: `${p.n - 1} \\times ${p.after} = ${(p.n - 1) * p.after}` },
      { text: 'The lowest is the difference:' },
      { tex: `${p.n * p.mean} - ${(p.n - 1) * p.after} = ${x}` },
    ];
  },
};

/* ---------- consecutive numbers: the mean is the middle ---------- */

interface ConsecutiveParams {
  n: number;
  first: number;
  /** 1 for whole numbers in a row, 2 for even or odd numbers in a row. */
  step: number;
}

const consecutiveSum = ({ n, first, step }: ConsecutiveParams) => n * first + (step * n * (n - 1)) / 2;
const consecutiveLast = ({ n, first, step }: ConsecutiveParams) => first + step * (n - 1);

const cmConsecutiveMean: Generator<ConsecutiveParams> = {
  id: 'cm-consecutive-mean',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { n: rng.int(4, 8), first: rng.int(3, 70), step: 2 };
    return { n: rng.pick([5, 7, 9, 11]), first: rng.int(3, 60), step: 1 };
  },
  render(p) {
    const what = p.step === 1 ? 'whole numbers' : p.first % 2 === 0 ? 'even numbers' : 'odd numbers';
    return typed(
      [say(`${WORDS[p.n]} consecutive ${what} add up to ${consecutiveSum(p)}.`), say('What is the largest of them?')],
      consecutiveLast(p),
      '\\text{largest} =',
    );
  },
  choices(p) {
    const mean = consecutiveSum(p) / p.n;
    const last = consecutiveLast(p);
    if (p.step === 1) return numberOptions(last, [mean, mean + p.n - 1, mean + (p.n + 1) / 2, p.first], 1, 0);
    return numberOptions(last, [mean, mean + (p.n - 1) / 2, mean + 2 * (p.n - 1), mean + p.n, p.first], 1, 0);
  },
  solution(p) {
    const s = consecutiveSum(p);
    const mean = s / p.n;
    const last = consecutiveLast(p);
    const steps: SolutionStep[] = [
      { text: 'The numbers are evenly spaced, so their mean is the middle of them:' },
      { tex: `${s} \\div ${p.n} = ${mean}` },
    ];
    if (p.step === 1) {
      steps.push(
        { text: `The largest is ${(p.n - 1) / 2} steps of 1 above the middle:` },
        { tex: `${mean} + ${(p.n - 1) / 2} = ${last}` },
      );
    } else if (p.n % 2 === 1) {
      steps.push(
        { text: `The middle number is ${mean}, and the largest is ${(p.n - 1) / 2} steps of 2 above it:` },
        { tex: `${mean} + ${(p.n - 1) / 2} \\times 2 = ${last}` },
      );
    } else {
      steps.push(
        { text: `With an even count, ${mean} sits halfway between the middle two, ${mean - 1} and ${mean + 1}. The largest is ${p.n / 2 - 1} step${p.n / 2 - 1 === 1 ? '' : 's'} of 2 above ${mean + 1}:` },
        { tex: `${mean + 1} + ${p.n / 2 - 1} \\times 2 = ${last}` },
      );
    }
    steps.push({ text: 'The numbers are' }, { tex: `${p.first},\\ ${p.first + p.step},\\ \\ldots,\\ ${last}` });
    return steps;
  },
};

/* ================================================================
 * Lesson 2: Changing Data Sets
 * ================================================================ */

/* ---------- a newcomer moves the mean ---------- */

interface NewMeanParams {
  n: number;
  mean: number;
  d: number;
  /** Difficulty 2: someone leaves rather than arrives. */
  leave: boolean;
}

const moved = ({ n, mean, d, leave }: NewMeanParams) => (leave ? mean + (n - 1) * d : mean + (n + 1) * d);

const cmNewMean: Generator<NewMeanParams> = {
  id: 'cm-new-mean',
  sample(rng, difficulty) {
    for (;;) {
      const leave = difficulty >= 2;
      const p = { n: rng.int(leave ? 4 : 3, leave ? 10 : 9), mean: rng.int(12, 60), d: rng.int(1, 5), leave };
      if (moved(p) > 95 || (leave && p.mean - p.d < 10)) continue;
      return p;
    }
  },
  render(p) {
    if (p.leave) {
      return typed(
        [
          say(`The mean age of the ${p.n} people in a room is ${p.mean}. One person leaves, and the mean age of those left drops to ${p.mean - p.d}.`),
          say('How old is the person who left?'),
        ],
        moved(p),
        '\\text{age} =',
      );
    }
    return typed(
      [
        say(`The mean age of the ${p.n} people in a room is ${p.mean}. One more person comes in, and the mean age rises to ${p.mean + p.d}.`),
        say('How old is the newcomer?'),
      ],
      moved(p),
      '\\text{age} =',
    );
  },
  choices(p) {
    const x = moved(p);
    const { n, mean, d } = p;
    if (p.leave) return numberOptions(x, [mean - d, mean + d, mean + n * d, mean + (n - 2) * d], 1, 1);
    return numberOptions(x, [mean + d, mean + n * d, mean + (n + 2) * d], 1, 1);
  },
  solution(p) {
    const { n, mean, d } = p;
    const x = moved(p);
    if (p.leave) {
      return [
        { text: 'Work with totals. Before:' },
        { tex: `${n} \\times ${mean} = ${n * mean}` },
        { text: 'After:' },
        { tex: `${n - 1} \\times ${mean - d} = ${(n - 1) * (mean - d)}` },
        { text: 'The person who left took the difference with them:' },
        { tex: `${n * mean} - ${(n - 1) * (mean - d)} = ${x}` },
      ];
    }
    return [
      { text: 'Work with totals. Before:' },
      { tex: `${n} \\times ${mean} = ${n * mean}` },
      { text: 'After:' },
      { tex: `${n + 1} \\times ${mean + d} = ${(n + 1) * (mean + d)}` },
      { text: 'The newcomer brought the difference:' },
      { tex: `${(n + 1) * (mean + d)} - ${n * mean} = ${x}` },
      { text: `Quicker: the newcomer is at the new mean, ${mean + d}, plus ${d} to lift each of the ${n} already there.` },
      { tex: `${mean + d} + ${n} \\times ${d} = ${x}` },
    ];
  },
};

/* ---------- how many tests so far ---------- */

interface ShiftParams {
  n: number;
  mean: number;
  d: number;
}

const shiftScore = ({ n, mean, d }: ShiftParams) => mean + (n + 1) * d;

const cmCountFromShift: Generator<ShiftParams> = {
  id: 'cm-count-from-shift',
  sample(rng, difficulty) {
    for (;;) {
      const d = difficulty >= 2 ? rng.pick([0.5, 1.5, 2.5]) : rng.int(1, 4);
      const p = { n: rng.int(3, difficulty >= 2 ? 15 : 12), mean: rng.int(50, 88), d };
      const x = shiftScore(p);
      if (x > 100 || !Number.isInteger(x)) continue;
      return p;
    }
  },
  render(p) {
    return typed(
      [
        say(`Jo’s mean score on her tests so far is ${p.mean}. If she scores ${shiftScore(p)} on the next test, her mean will rise to ${num(p.mean + p.d)}.`),
        say('How many tests has she taken so far?'),
      ],
      p.n,
      '\\text{tests} =',
    );
  },
  choices(p) {
    return numberOptions(p.n, [p.n + 1, p.n - 1, shiftScore(p) - p.mean, p.n + 2], 1, 1);
  },
  solution(p) {
    const x = shiftScore(p);
    const coef = (v: number) => (v === 1 ? '' : num(v));
    return [
      { text: 'Call the number of tests so far $n$. The total goes from the old mean times $n$ to the new mean times one more test:' },
      { tex: `${p.mean}n + ${x} = ${num(p.mean + p.d)}(n + 1)` },
      { tex: `${p.mean}n + ${x} = ${num(p.mean + p.d)}n + ${num(p.mean + p.d)}` },
      { tex: `${num(x - p.mean - p.d)} = ${coef(p.d)}n` },
      { tex: `n = ${p.n}` },
      { text: `Check: the new score is ${x - p.mean} above the old mean, which lifts ${p.n + 1} tests by ${num(p.d)} each.` },
    ];
  },
};

/* ---------- two groups merged ---------- */

interface GroupsParams {
  a: number;
  p: number;
  b: number;
  q: number;
  /** Difficulty 2: the class mean is given and the number of boys asked. */
  count: boolean;
  r: number;
}

const groupsMean = ({ a, p, b, q }: GroupsParams) => (a * p + b * q) / (a + b);

function sampleGroups(rng: { int(min: number, max: number): number }, count: boolean): GroupsParams {
  for (;;) {
    const a = rng.int(count ? 4 : 5, count ? 36 : 30);
    const b = rng.int(5, 30);
    const p = rng.int(50, 90);
    const q = rng.int(55, 95);
    if (a === b || p === q || (p + q) % 2 !== 0) continue;
    const g = { a, p, b, q, count, r: 0 };
    const mean = groupsMean(g);
    if (!Number.isInteger(mean) || mean === (p + q) / 2) continue;
    if (count && p > q) continue;
    return { ...g, r: mean };
  }
}

const cmCombinedMean: Generator<GroupsParams> = {
  id: 'cm-combined-mean',
  sample(rng, difficulty) {
    return sampleGroups(rng, difficulty >= 2);
  },
  render(g) {
    if (g.count) {
      return typed(
        [
          say(`In a class, the boys’ mean score is ${g.p} and the girls’ mean score is ${g.q}. The mean for the whole class is ${g.r}.`),
          say(`There are ${g.b} girls. How many boys are there?`),
        ],
        g.a,
        '\\text{boys} =',
      );
    }
    return typed(
      [
        say(`A class of ${g.a} scored a mean of ${g.p} on a test, and a class of ${g.b} scored a mean of ${g.q}.`),
        say('What is the mean score of all the students together?'),
      ],
      g.r,
      '\\text{mean} =',
    );
  },
  choices(g) {
    if (g.count) {
      const flipped = (g.b * (g.r - g.p)) / (g.q - g.r);
      return numberOptions(g.a, [g.b, flipped, g.a + 1, g.a - 1], 1, 1);
    }
    const swapped = (g.b * g.p + g.a * g.q) / (g.a + g.b);
    return numberOptions(g.r, [(g.p + g.q) / 2, swapped, g.r + 1, g.r - 1], 1, 0);
  },
  solution(g) {
    if (g.count) {
      return [
        { text: `Each boy is ${g.r - g.p} below the class mean and each girl ${g.q - g.r} above it. Measured from the class mean, the gaps cancel:` },
        { tex: `${g.r - g.p} \\times \\text{boys} = ${g.q - g.r} \\times ${g.b}` },
        { tex: `\\text{boys} = ${g.b * (g.q - g.r)} \\div ${g.r - g.p} = ${g.a}` },
        { text: `Check with totals: ${g.a} boys and ${g.b} girls score ${g.a * g.p + g.b * g.q} in all, and ${g.a + g.b} times ${g.r} is the same.` },
      ];
    }
    return [
      { text: 'Means do not add, but totals do. Each class’s total:' },
      { tex: `${g.a} \\times ${g.p} = ${g.a * g.p}` },
      { tex: `${g.b} \\times ${g.q} = ${g.b * g.q}` },
      { text: `Share the whole total among all ${g.a + g.b} students:` },
      { tex: `${g.a * g.p + g.b * g.q} \\div ${g.a + g.b} = ${g.r}` },
      { text: `Halfway between ${g.p} and ${g.q} is the trap: the larger class pulls the mean towards its own.` },
    ];
  },
};

/* ---------- two groups merged, as tiles ---------- */

const cmCombinedMeanTiles: Generator<GroupsParams> = {
  id: 'cm-combined-mean-tiles',
  sample(rng) {
    return sampleGroups(rng, false);
  },
  render(g) {
    return {
      kind: 'tiles',
      prompt: [
        say(`A class of ${g.a} has a mean score of ${g.p}, and a class of ${g.b} has a mean score of ${g.q}.`),
        say('Fill in each class’s total, then the mean of all the students.'),
      ],
      template: '\\text{totals } {0} \\text{ and } {1}, \\quad \\text{mean} = {2}',
      bank: numberBank([g.a * g.p, g.b * g.q, g.r], [(g.p + g.q) / 2, g.a * g.q, g.b * g.p], 3),
      answer: [num(g.a * g.p), num(g.b * g.q), num(g.r)],
    };
  },
  solution: (g) => cmCombinedMean.solution(g),
};

/* ---------- what a change does to each measure ---------- */

type Change = 'shift' | 'scale' | 'top' | 'bottom';

interface ChangeParams {
  /** Five different whole numbers, in the order shown. */
  values: number[];
  change: Change;
  k: number;
}

function changed({ values, change, k }: ChangeParams): number[] {
  const s = sortUp(values);
  if (change === 'shift') return s.map((v) => v + k);
  if (change === 'scale') return s.map((v) => v * k);
  if (change === 'top') return [...s.slice(0, -1), s[s.length - 1] + k];
  return [s[0] - k, ...s.slice(1)];
}

const three = (xs: number[]) => {
  const s = sortUp(xs);
  return [total(xs) / xs.length, medianOf(xs), s[s.length - 1] - s[0]];
};

const cmChangeTable: Generator<ChangeParams> = {
  id: 'cm-change-table',
  sample(rng, difficulty) {
    for (;;) {
      const values = rng.sample(range(4, 40), 5);
      if (total(values) % 5 !== 0) continue;
      const change: Change = difficulty >= 2 ? rng.pick(['scale', 'bottom', 'top'] as const) : rng.pick(['shift', 'top'] as const);
      const k = change === 'scale' ? rng.int(2, 3) : change === 'shift' ? rng.int(2, 12) : 5 * rng.int(1, 4);
      const p = { values, change, k };
      if (change === 'bottom' && Math.min(...values) - k < 0) continue;
      const before = three(values);
      const after = three(changed(p));
      if (new Set(after.map(num)).size < 3 || new Set(before.map(num)).size < 3) continue;
      return p;
    }
  },
  render(p) {
    const before = three(p.values);
    const after = three(changed(p));
    const what = {
      shift: `Every number is increased by ${p.k}.`,
      scale: `Every number is ${p.k === 2 ? 'doubled' : 'tripled'}.`,
      top: `The largest number is increased by ${p.k}.`,
      bottom: `The smallest number is decreased by ${p.k}.`,
    }[p.change];
    const [mean, median, spread] = before;
    const slips = {
      shift: [spread + p.k, median, mean],
      scale: [spread, mean + p.k, median + p.k],
      top: [median + p.k, mean + p.k, spread],
      bottom: [median - p.k, mean - p.k, spread],
    }[p.change];
    return {
      kind: 'table',
      prompt: [show(listTex(p.values)), say(`${what} Fill in the new mean, median and range.`)],
      columns: ['\\text{measure}', '\\text{before}', '\\text{after}'],
      rows: [
        ['\\text{mean}', num(mean), null],
        ['\\text{median}', num(median), null],
        ['\\text{range}', num(spread), null],
      ],
      bank: numberBank(after, slips, 3, 1, -Infinity),
      answer: after.map(num),
    };
  },
  solution(p) {
    const [mean, median, spread] = three(p.values);
    const [m2, md2, r2] = three(changed(p));
    const { k } = p;
    if (p.change === 'shift') {
      return [
        { text: `Adding ${k} to every number slides the whole set up by ${k}. The mean and the median move with it:` },
        { tex: `${mean} + ${k} = ${m2}` },
        { tex: `${median} + ${k} = ${md2}` },
        { text: `The gap from smallest to largest does not change, so the range stays ${r2}.` },
      ];
    }
    if (p.change === 'scale') {
      return [
        { text: `Multiplying every number by ${k} stretches the set, so all three measures are multiplied by ${k}:` },
        { tex: `${mean} \\times ${k} = ${m2}` },
        { tex: `${median} \\times ${k} = ${md2}` },
        { tex: `${spread} \\times ${k} = ${r2}` },
      ];
    }
    const sign = p.change === 'top' ? '+' : '-';
    const end = p.change === 'top' ? 'largest' : 'smallest';
    return [
      { text: `Only the ${end} number moves, so the total changes by ${k}, shared among 5:` },
      { tex: `${mean} ${sign} ${k} \\div 5 = ${m2}` },
      { text: `The middle number is not touched, so the median stays ${md2}. The ${end} moves ${k} further out:` },
      { tex: `${spread} + ${k} = ${r2}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Determine the Set
 * ================================================================ */

/* ---------- five numbers from mean, median, mode and range ---------- */

interface FiveParams {
  /** Sorted. The mode is the two largest (`top`) or the two smallest. */
  set: number[];
  top: boolean;
}

function sampleFive(rng: { int(min: number, max: number): number; chance(p: number): boolean }, difficulty: number): FiveParams {
  const top = difficulty < 2 || rng.chance(0.5);
  for (;;) {
    let set: number[];
    if (top) {
      const t = rng.int(6, difficulty >= 2 ? 40 : 25);
      const c = rng.int(3, t - 1);
      const b = rng.int(2, c - 1);
      const a = rng.int(1, b - 1);
      set = [a, b, c, t, t];
    } else {
      const t = rng.int(1, difficulty >= 2 ? 25 : 15);
      const c = rng.int(t + 1, t + 12);
      const d = rng.int(c + 1, c + 12);
      const e = rng.int(d + 1, d + 12);
      set = [t, t, c, d, e];
    }
    if (total(set) % 5 !== 0) continue;
    const mean = total(set) / 5;
    if (mean === set[2]) continue;
    return { set, top };
  }
}

const fiveFacts = ({ set, top }: FiveParams) => ({
  mean: total(set) / 5,
  median: set[2],
  mode: top ? set[4] : set[0],
  spread: set[4] - set[0],
  asked: top ? set[1] : set[3],
});

function fiveSolution({ set, top }: FiveParams): SolutionStep[] {
  const f = fiveFacts({ set, top });
  const [a, b, c, d, e] = set;
  const fixed = top
    ? [
        { text: `The mode, ${f.mode}, appears at least twice and is above the median, so it fills both places above the middle:` },
        { tex: `\\square,\\ \\square,\\ ${c},\\ ${d},\\ ${e}` },
        { text: 'The range fixes the smallest:' },
        { tex: `${e} - ${f.spread} = ${a}` },
      ]
    : [
        { text: `The mode, ${f.mode}, appears at least twice and is below the median, so it fills both places below the middle:` },
        { tex: `${a},\\ ${b},\\ ${c},\\ \\square,\\ \\square` },
        { text: 'The range fixes the largest:' },
        { tex: `${a} + ${f.spread} = ${e}` },
      ];
  return [
    ...fixed,
    { text: 'The five add to 5 times the mean:' },
    { tex: `5 \\times ${f.mean} = ${5 * f.mean}` },
    { text: `The ${top ? 'second-smallest' : 'second-largest'} is what is left:` },
    { tex: top ? `${5 * f.mean} - ${a} - ${c} - ${d} - ${e} = ${b}` : `${5 * f.mean} - ${a} - ${b} - ${c} - ${e} = ${d}` },
    { text: 'So the numbers are' },
    { tex: listTex(set) },
  ];
}

const cmSetFromMeasures: Generator<FiveParams> = {
  id: 'cm-set-from-measures',
  sample: (rng, difficulty) => sampleFive(rng, difficulty),
  render(p) {
    const f = fiveFacts(p);
    return typed(
      [
        say(`Five whole numbers have mean ${f.mean}, median ${f.median} and range ${f.spread}. Their mode is ${f.mode}, and no other number appears more than once.`),
        say(`What is the ${p.top ? 'second-smallest' : 'second-largest'} number?`),
      ],
      f.asked,
      '\\text{number} =',
    );
  },
  choices(p) {
    const f = fiveFacts(p);
    return numberOptions(f.asked, [f.asked + f.mode, f.mean, f.asked + 1, f.asked - 1], 1, 1);
  },
  solution: fiveSolution,
};

const cmSetTiles: Generator<FiveParams> = {
  id: 'cm-set-tiles',
  sample: (rng, difficulty) => sampleFive(rng, difficulty),
  render(p) {
    const f = fiveFacts(p);
    return {
      kind: 'tiles',
      prompt: [
        say(`Five whole numbers have mean ${f.mean}, median ${f.median} and range ${f.spread}. Their mode is ${f.mode}, and no other number appears more than once.`),
        say('Write the five numbers, smallest first.'),
      ],
      template: '{0},\\ {1},\\ {2},\\ {3},\\ {4}',
      bank: numberBank(p.set, [f.asked + f.mode, f.mean, f.spread, f.median + 1], 3, 1, 1),
      answer: p.set.map(num),
    };
  },
  solution: fiveSolution,
};

/* ---------- three numbers from mean, median and range ---------- */

interface ThreeParams {
  a: number;
  k: number;
  c: number;
  /** Difficulty 2 asks for the smallest. */
  smallest: boolean;
}

const cmThreeNumbers: Generator<ThreeParams> = {
  id: 'cm-three-numbers',
  sample(rng, difficulty) {
    const hi = difficulty >= 2 ? 60 : 30;
    for (;;) {
      const [a, k, c] = sortUp(rng.sample(range(1, hi), 3));
      if ((a + k + c) % 3 !== 0 || (a + k + c) / 3 === k) continue;
      return { a, k, c, smallest: difficulty >= 2 };
    }
  },
  render(p) {
    const m = (p.a + p.k + p.c) / 3;
    return typed(
      [
        say(`Three whole numbers have mean ${m}, median ${p.k} and range ${p.c - p.a}.`),
        say(`What is the ${p.smallest ? 'smallest' : 'largest'} of them?`),
      ],
      p.smallest ? p.a : p.c,
      p.smallest ? '\\text{smallest} =' : '\\text{largest} =',
    );
  },
  choices(p) {
    const m = (p.a + p.k + p.c) / 3;
    const r = p.c - p.a;
    if (p.smallest) return numberOptions(p.a, [p.k - r, m - r, p.a + p.c - r, p.a + 1, p.a - 1], 1, 0);
    return numberOptions(p.c, [p.a + p.c, p.k + r, m + r, p.c + 1, p.c - 1], 1, 0);
  },
  solution(p) {
    const m = (p.a + p.k + p.c) / 3;
    const r = p.c - p.a;
    const pair = p.a + p.c;
    return [
      { text: 'The three add to 3 times the mean, and the median is the middle one, so the other two add to' },
      { tex: `3 \\times ${m} - ${p.k} = ${pair}` },
      { text: `They add to ${pair} and are ${r} apart, so the ${p.smallest ? 'smaller' : 'larger'} is` },
      { tex: p.smallest ? `(${pair} - ${r}) \\div 2 = ${p.a}` : `(${pair} + ${r}) \\div 2 = ${p.c}` },
      { text: 'So the numbers are' },
      { tex: listTex([p.a, p.k, p.c]) },
    ];
  },
};

/* ---------- four numbers: the median is a pair ---------- */

interface FourParams {
  /** Sorted. `low`: the mode is the two smallest; otherwise the two largest. */
  set: number[];
  low: boolean;
}

const fourFacts = ({ set, low }: FourParams) => ({
  mean: total(set) / 4,
  median: (set[1] + set[2]) / 2,
  mode: low ? set[0] : set[3],
  asked: low ? set[3] : set[0],
});

const cmFourSet: Generator<FourParams> = {
  id: 'cm-four-set',
  sample(rng, difficulty) {
    const low = difficulty < 2;
    for (;;) {
      let set: number[];
      if (low) {
        const t = rng.int(1, 20);
        const c = rng.int(t + 1, t + 14);
        set = [t, t, c, rng.int(c + 1, c + 20)];
      } else {
        const t = rng.int(8, 40);
        const b = rng.int(Math.max(2, t - 14), t - 1);
        set = [rng.int(Math.max(1, b - 20), b - 1), b, t, t];
      }
      if (total(set) % 4 !== 0) continue;
      const f = fourFacts({ set, low });
      if (f.mean === f.median) continue;
      return { set, low };
    }
  },
  render(p) {
    const f = fourFacts(p);
    return typed(
      [
        say(`Four whole numbers have mean ${f.mean} and median ${num(f.median)}. Their mode is ${f.mode}, and no other number appears more than once.`),
        say(`What is the ${p.low ? 'largest' : 'smallest'} of them?`),
      ],
      f.asked,
      p.low ? '\\text{largest} =' : '\\text{smallest} =',
    );
  },
  choices(p) {
    const f = fourFacts(p);
    const other = p.low ? p.set[2] : p.set[1];
    const whole = [4 * f.mean - 2 * f.mode - f.median, 4 * f.mean - f.mode - other, other, f.asked + 1, f.asked - 1];
    return numberOptions(f.asked, whole, 1, 0);
  },
  solution(p) {
    const f = fourFacts(p);
    const [a, b, c, d] = p.set;
    const other = p.low ? c : b;
    return [
      {
        text: p.low
          ? `The mode, ${f.mode}, appears at least twice and is below the median, so it is the two smallest:`
          : `The mode, ${f.mode}, appears at least twice and is above the median, so it is the two largest:`,
      },
      { tex: p.low ? `${a},\\ ${b},\\ \\square,\\ \\square` : `\\square,\\ \\square,\\ ${c},\\ ${d}` },
      { text: `The median is halfway between the middle two, so the ${p.low ? 'third' : 'second'} number is` },
      { tex: `2 \\times ${num(f.median)} - ${f.mode} = ${other}` },
      { text: 'The four add to 4 times the mean:' },
      { tex: `4 \\times ${f.mean} = ${4 * f.mean}` },
      { tex: `${4 * f.mean} - ${f.mode} - ${f.mode} - ${other} = ${f.asked}` },
      { text: 'So the numbers are' },
      { tex: listTex(p.set) },
    ];
  },
};

/* ================================================================
 * Lesson 4: Multiple Possibilities
 * ================================================================ */

/* ---------- mean equals median, with x anywhere ---------- */

interface XParams {
  /** The four given numbers, in the order shown. */
  given: number[];
  /** Difficulty 2 of `cm-mean-median-x` asks for the sum of every possible x. */
  sum: boolean;
}

function xCases({ given }: { given: number[] }) {
  const [p, q, r, s] = sortUp(given);
  const S = p + q + r + s;
  return { p, q, r, s, S, low: 5 * q - S, mid: S / 4, high: 5 * r - S };
}

function sampleX(rng: { sample<T>(items: readonly T[], n: number): T[] }, difficulty: number): XParams {
  const hi = difficulty >= 2 ? 40 : 25;
  for (;;) {
    const given = rng.sample(range(1, hi), 4);
    const c = xCases({ given });
    if (c.S % 4 !== 0 || !(c.q < c.mid && c.mid < c.r) || c.low < 1) continue;
    return { given, sum: difficulty >= 2 };
  }
}

function xSolution(p: XParams, ask: 'largest' | 'sum' | 'all'): SolutionStep[] {
  const c = xCases(p);
  const steps: SolutionStep[] = [
    { text: `In order the given numbers are ${andList([c.p, c.q, c.r, c.s])}, adding to ${c.S}. The median depends on where $x$ lands.` },
    { text: `If $x$ is ${c.q} or less, the median is ${c.q}:` },
    { tex: `${c.S} + x = 5 \\times ${c.q}` },
    { tex: `x = ${c.low}` },
    { text: `If $x$ is between ${c.q} and ${c.r}, the median is $x$ itself:` },
    { tex: `${c.S} + x = 5x` },
    { tex: `x = ${c.mid}` },
    { text: `If $x$ is ${c.r} or more, the median is ${c.r}:` },
    { tex: `${c.S} + x = 5 \\times ${c.r}` },
    { tex: `x = ${c.high}` },
    { text: 'Each value lands in its own case, so all three work.' },
  ];
  if (ask === 'largest') steps.push({ text: `The largest is ${c.high}. Taking $x$ as the median gives only ${c.mid}.` });
  else steps.push({ tex: `${c.low} + ${c.mid} + ${c.high} = ${c.low + c.mid + c.high}` });
  return steps;
}

const cmMeanMedianX: Generator<XParams> = {
  id: 'cm-mean-median-x',
  sample: (rng, difficulty) => sampleX(rng, difficulty),
  render(p) {
    const c = xCases(p);
    const { sum } = p;
    return typed(
      [
        say('These five numbers have a mean equal to their median.'),
        show(`${listTex(p.given)},\\ x`),
        say(sum ? 'What is the sum of all the possible values of $x$?' : 'What is the largest possible value of $x$?'),
      ],
      sum ? c.low + c.mid + c.high : c.high,
      sum ? '\\text{sum} =' : '\\text{largest } x =',
    );
  },
  choices(p) {
    const c = xCases(p);
    if (p.sum) return numberOptions(c.low + c.mid + c.high, [c.mid, c.mid + c.high, c.low + c.high, c.high], 1, 0);
    return numberOptions(c.high, [c.mid, c.low, 5 * c.s - c.S, c.high + 1], 1, 0);
  },
  solution: (p) => xSolution(p, p.sum ? 'sum' : 'largest'),
};

const cmMeanMedianCases: Generator<XParams> = {
  id: 'cm-mean-median-cases',
  sample: (rng, difficulty) => sampleX(rng, difficulty),
  render(p) {
    const c = xCases(p);
    const answer = [c.low, c.mid, c.high, c.low + c.mid + c.high];
    return {
      kind: 'table',
      prompt: [
        show(`${listTex(p.given)},\\ x`),
        say('These five numbers have a mean equal to their median. Find $x$ in each case, then the sum of the possible values.'),
      ],
      columns: ['\\text{case}', 'x'],
      rows: [
        [`x \\le ${c.q}`, null],
        [`${c.q} \\le x \\le ${c.r}`, null],
        [`x \\ge ${c.r}`, null],
        ['\\text{sum}', null],
      ],
      bank: numberBank(answer, [5 * c.s - c.S, c.mid + 1, c.high - c.low], 3),
      answer: answer.map(num),
    };
  },
  solution: (p) => xSolution(p, 'all'),
};

/* ---------- how many lists fit a mean and a median ---------- */

interface CountParams {
  m: number;
  k: number;
  distinct: boolean;
}

function countLists({ m, k, distinct }: CountParams): number {
  const pair = 3 * m - k;
  return distinct ? Math.min(k - 1, pair - k - 1) : Math.min(k, pair - k);
}

const cmCountSets: Generator<CountParams> = {
  id: 'cm-count-sets',
  sample(rng, difficulty) {
    const distinct = difficulty >= 2;
    for (;;) {
      const m = rng.int(4, 20);
      const k = rng.int(3, 2 * m);
      const p = { m, k, distinct };
      if (countLists(p) < 2) continue;
      return p;
    }
  },
  render(p) {
    const order = p.distinct ? 'a < b < c' : 'a \\le b \\le c';
    return typed(
      [
        say(`Three positive whole numbers $${order}$ have mean ${p.m} and median ${p.k}.`),
        say('How many different lists $a, b, c$ are possible?'),
      ],
      countLists(p),
      '\\text{lists} =',
    );
  },
  choices(p) {
    const pair = 3 * p.m - p.k;
    const n = countLists(p);
    if (p.distinct) return numberOptions(n, [p.k - 1, pair - p.k - 1, countLists({ ...p, distinct: false }), pair - 1, n + 1], 1, 1);
    return numberOptions(n, [p.k, pair - p.k, pair - 1, n + 1, n - 1], 1, 1);
  },
  solution(p) {
    const pair = 3 * p.m - p.k;
    const n = countLists(p);
    const steps: SolutionStep[] = [
      { text: 'The median is the middle number:' },
      { tex: `b = ${p.k}` },
      { text: 'The three add to 3 times the mean, so' },
      { tex: `a + c = 3 \\times ${p.m} - ${p.k} = ${pair}` },
    ];
    if (p.distinct) {
      steps.push({
        text: `Each list is fixed by $a$. It must be below ${p.k}, so at most ${p.k - 1}, and $c$ must be above ${p.k}, so $a$ is at most ${pair - p.k - 1}. So $a$ runs from 1 to ${n}:`,
      });
    } else {
      steps.push({
        text: `Each list is fixed by $a$. It can be at most ${p.k}, and $c$ must be at least ${p.k}, so $a$ is at most ${pair - p.k}. So $a$ runs from 1 to ${n}:`,
      });
    }
    steps.push({ tex: `\\text{lists} = ${n}` });
    return steps;
  },
};

/* ---------- the largest the largest can be ---------- */

interface ExtremeParams {
  m: number;
  k: number;
  distinct: boolean;
}

const extremeLargest = ({ m, k, distinct }: ExtremeParams) => (distinct ? 5 * m - 2 * k - 4 : 5 * m - 2 * k - 2);

const cmExtremeValue: Generator<ExtremeParams> = {
  id: 'cm-extreme-value',
  sample(rng, difficulty) {
    const distinct = difficulty >= 2;
    for (;;) {
      const m = rng.int(5, difficulty >= 2 ? 30 : 20);
      const k = rng.int(distinct ? 3 : 2, m + 4);
      const p = { m, k, distinct };
      if (extremeLargest(p) <= k + 2) continue;
      return p;
    }
  },
  render(p) {
    return typed(
      [
        say(`Five ${p.distinct ? 'different ' : ''}positive whole numbers have mean ${p.m} and median ${p.k}.`),
        say('What is the largest possible value of the largest number?'),
      ],
      extremeLargest(p),
      '\\text{largest} =',
    );
  },
  choices(p) {
    const e = extremeLargest(p);
    const { m, k } = p;
    if (p.distinct) return numberOptions(e, [5 * m - 2 * k - 2, 5 * m - 2 * k - 3, 5 * m - k - 6, e + 1], 1, 1);
    return numberOptions(e, [5 * m - k - 3, 5 * m - 2 * k, 5 * m - k, e + 1], 1, 1);
  },
  solution(p) {
    const e = extremeLargest(p);
    const { m, k } = p;
    const rest = p.distinct ? [1, 2, k, k + 1] : [1, 1, k, k];
    return [
      { text: 'The five add to 5 times the mean:' },
      { tex: `5 \\times ${m} = ${5 * m}` },
      {
        text: p.distinct
          ? `To make the largest as big as it can be, make the others as small as they can be. Different numbers below the median can be 1 and 2 at least, and the one above it is at least ${k + 1}:`
          : `To make the largest as big as it can be, make the others as small as they can be. The two below the median can be 1, and the one above it can be no less than ${k}:`,
      },
      { tex: `${rest.join(',\\ ')},\\ \\square` },
      { tex: `${5 * m} - ${rest.join(' - ')} = ${e}` },
    ];
  },
};

export const contestStatisticsGenerators = [
  cmStatMeasures,
  cmFreqMedian,
  cmMissingScore,
  cmConsecutiveMean,
  cmNewMean,
  cmCountFromShift,
  cmCombinedMean,
  cmCombinedMeanTiles,
  cmChangeTable,
  cmSetFromMeasures,
  cmSetTiles,
  cmThreeNumbers,
  cmFourSet,
  cmMeanMedianX,
  cmMeanMedianCases,
  cmCountSets,
  cmExtremeValue,
];
