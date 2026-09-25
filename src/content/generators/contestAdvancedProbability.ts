/**
 * Contest Math, level 22: More Advanced Probability.
 *
 * Six lessons, each a clear step past Level 8. Probability turns a pair of
 * random numbers into a point in a square, multiplies the shrinking chances
 * of "all different", and gets "exactly" from two "at most"s (and, for the
 * smallest and largest together, from inclusion and exclusion). Conditional
 * Probability pictures a crowd and counts it, weighs a coin by the evidence
 * of its tosses, and keeps the "at least one" condition honest. Expected
 * Value adds value times chance, reads it backwards for a missing prize,
 * splits a line of tickets into equal gaps, adds tail chances, and decides
 * when a re-spin pays. Recursion writes an answer in terms of itself: a wait
 * starts again after a miss, a game of turns comes back round, and the chance
 * of landing on a square comes from the two squares before it. Linearity of
 * Expectation adds one indicator per place, face or gap. Events with States
 * tracks only what matters so far: the run of successes, the pattern half
 * made, the gambler's pounds.
 *
 * Every answer is exact: a whole number, a terminating decimal, or a fraction
 * in lowest terms typed with the `/` key. Shared helpers are in
 * `contestMath.ts`.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { sortByValue, tokenValue } from './probTree';
import { FRACTION_KEYS, fracAnswer, fracTex, gcd, num, numberBank, numberOptions, pounds, say, typed } from './contestMath';

/* ================================================================
 * Fractions
 * ================================================================ */

type Frac = [number, number];

function red([p, q]: Frac): Frac {
  const sign = q < 0 ? -1 : 1;
  const g = gcd(p, q) || 1;
  return [(sign * p) / g, (sign * q) / g];
}

const add = (a: Frac, b: Frac): Frac => red([a[0] * b[1] + b[0] * a[1], a[1] * b[1]]);
const sub = (a: Frac, b: Frac): Frac => red([a[0] * b[1] - b[0] * a[1], a[1] * b[1]]);
const mul = (a: Frac, b: Frac): Frac => red([a[0] * b[0], a[1] * b[1]]);
const div = (a: Frac, b: Frac): Frac => red([a[0] * b[1], a[1] * b[0]]);
const pow = (a: Frac, n: number): Frac => red([a[0] ** n, a[1] ** n]);
const ONE: Frac = [1, 1];
const value = (f: Frac) => f[0] / f[1];

const ftex = (f: Frac) => fracTex(f[0], f[1]);
const fans = (f: Frac) => fracAnswer(f[0], f[1]);

/** `\frac{12}{36} = \frac{1}{3}`, or just `\frac{5}{36}` when it is already in lowest terms. */
function rawThenLowest([p, q]: Frac): string {
  const raw = `\\frac{${p}}{${q}}`;
  return gcd(p, q) > 1 ? `${raw} = ${fracTex(p, q)}` : raw;
}

/** A probability typed on the fraction keypad. */
const typedProb = (prompt: Block[], answer: Frac) => typed(prompt, fans(red(answer)), 'P =', FRACTION_KEYS);

/** An expected value typed on the fraction keypad. */
const typedMean = (prompt: Block[], answer: Frac, lead = 'E =') => typed(prompt, fans(red(answer)), lead, FRACTION_KEYS);

/**
 * Four options for a probability: the answer and the first three distinct
 * slips strictly between 0 and 1, topped up with neighbours. Compared in
 * lowest terms, so a slip that works out to the answer is never offered.
 */
function probOptions(right: Frac, slips: Frac[]): ChoiceOption[] {
  const [p, q] = red(right);
  const seen = new Set([fans(right)]);
  const picked: Frac[] = [];
  const near: Frac[] = [
    [p + 1, q],
    [p - 1, q],
    [2 * p + 1, 2 * q],
    [2 * p - 1, 2 * q],
    [p + 2, q],
    [p - 2, q],
    [3 * p + 1, 3 * q],
    [3 * p - 1, 3 * q],
  ];
  for (const f of [...slips, ...near]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(f[0]) || !Number.isInteger(f[1]) || f[0] <= 0 || f[1] <= 0 || f[0] >= f[1]) continue;
    const key = fans(f);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(red(f));
  }
  return options({ tex: ftex(right), answer: fans(right) }, ...picked.map((f) => ({ tex: ftex(f), answer: fans(f) })));
}

/**
 * Four options for an expected value: positive, distinct in lowest terms, and
 * whole when the answer is whole, so a fraction beside a whole answer is not
 * eliminated on sight.
 */
function meanOptions(right: Frac, slips: Frac[]): ChoiceOption[] {
  const r = red(right);
  const whole = r[1] === 1;
  const seen = new Set([fans(r)]);
  const picked: Frac[] = [];
  const [p, q] = r;
  const near: Frac[] = whole
    ? [1, -1, 2, -2, 3, -3, 4, -4].map((d): Frac => [p + d, 1])
    : [
        [p + 1, q],
        [p - 1, q],
        [p + q, q],
        [p - q, q],
        [2 * p + 1, 2 * q],
        [2 * p - 1, 2 * q],
        [p + 2, q],
        [p - 2, q],
      ];
  for (const f of [...slips, ...near]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(f[0]) || !Number.isInteger(f[1]) || f[1] === 0) continue;
    const g = red(f);
    if (g[0] <= 0) continue;
    if (whole && g[1] !== 1) continue;
    const key = fans(g);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(g);
  }
  return options({ tex: ftex(r), answer: fans(r) }, ...picked.map((f) => ({ tex: ftex(f), answer: fans(f) })));
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let out = 1;
  for (let i = 1; i <= k; i += 1) out = (out * (n - k + i)) / i;
  return Math.round(out);
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const Words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/** "fair dice" for six sides, "fair 8-sided dice, each numbered 1 to 8," otherwise. */
const diceName = (m: number) => (m === 6 ? 'fair dice' : `fair ${m}-sided dice, each numbered 1 to ${m},`);

/** `\tfrac{1}{3}` for prose. */
const tf = (f: Frac) => {
  const [p, q] = red(f);
  return q === 1 ? `${p}` : `\\tfrac{${p}}{${q}}`;
};

/* ---------- the events a die or coin can show ---------- */

interface Event {
  /** 'A fair die', 'A fair coin'. */
  device: string;
  /** 'rolled' or 'tossed'. */
  verb: string;
  /** 'roll' or 'toss'. */
  noun: string;
  /** 'rolls' or 'tosses'. */
  nouns: string;
  /** What counts as a success: 'a six', 'heads'. */
  yes: string;
  /** Its complement, read naturally: 'a roll that is not a six', 'tails'. */
  no: string;
  k: number;
  m: number;
}

const die = (m: number) => (m === 6 ? 'A fair die' : `A fair ${m}-sided die, numbered 1 to ${m},`);

function dieEvent(m: number, yes: string, no: string, k: number): Event {
  return { device: die(m), verb: 'rolled', noun: 'roll', nouns: 'rolls', yes, no, k, m };
}

const EVENTS: Event[] = [
  { device: 'A fair coin', verb: 'tossed', noun: 'toss', nouns: 'tosses', yes: 'heads', no: 'tails', k: 1, m: 2 },
  dieEvent(6, 'a six', 'a roll that is not a six', 1),
  dieEvent(6, 'a 5 or a 6', 'a roll of 4 or less', 2),
  dieEvent(6, 'an even number', 'an odd number', 3),
  dieEvent(6, 'a number above 2', 'a 1 or a 2', 4),
  dieEvent(6, 'a number other than 6', 'a six', 5),
  dieEvent(4, 'a 4', 'a roll that is not a 4', 1),
  dieEvent(4, 'an even number', 'an odd number', 2),
  dieEvent(4, 'a number above 1', 'a 1', 3),
  dieEvent(8, 'an 8', 'a roll that is not an 8', 1),
  dieEvent(8, 'a 7 or an 8', 'a roll of 6 or less', 2),
  dieEvent(8, 'a number above 5', 'a roll of 5 or less', 3),
  dieEvent(8, 'an even number', 'an odd number', 4),
  dieEvent(8, 'a number above 3', 'a roll of 3 or less', 5),
  dieEvent(10, 'a 10', 'a roll that is not a 10', 1),
  dieEvent(10, 'a 9 or a 10', 'a roll of 8 or less', 2),
  dieEvent(10, 'a number above 7', 'a roll of 7 or less', 3),
  dieEvent(10, 'a prime number', 'a roll that is not prime', 4),
  dieEvent(10, 'an odd number', 'an even number', 5),
  dieEvent(12, 'a 12', 'a roll that is not a 12', 1),
  dieEvent(12, 'a number above 9', 'a roll of 9 or less', 3),
  dieEvent(12, 'a multiple of 3', 'a roll that is not a multiple of 3', 4),
  dieEvent(12, 'a number above 10', 'a roll of 10 or less', 2),
  dieEvent(20, 'a number above 15', 'a roll of 15 or less', 5),
  dieEvent(20, 'a number above 16', 'a roll of 16 or less', 4),
  dieEvent(20, 'a number above 10', 'a roll of 10 or less', 10),
  dieEvent(5, 'a 5', 'a roll that is not a 5', 1),
  dieEvent(5, 'a number above 3', 'a roll of 3 or less', 2),
];

const pOf = (e: Event): Frac => red([e.k, e.m]);

/** Events whose chance is one over a whole number, for runs whose waits come out whole. */
const UNIT_EVENTS = EVENTS.filter((e) => pOf(e)[0] === 1);

const rOf = (e: Event) => pOf(e)[1];

/* ================================================================
 * Lesson 1: Probability
 * ================================================================ */

/* ---------- two random numbers are a point in a square ---------- */

interface GeomParams {
  kind: 'sum' | 'gap';
  meet: boolean;
  a: number;
  c: number;
}

const MEET_WAITS = [5, 10, 12, 15, 20, 24, 30, 36, 40, 45];

const geomAnswer = ({ kind, a, c }: GeomParams): Frac => (kind === 'sum' ? red([c * c, 2 * a * a]) : red([a * a - (a - c) ** 2, a * a]));

const cmApGeomSquare: Generator<GeomParams> = {
  id: 'cm-ap-geom-square',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      const a = rng.int(3, 12);
      return { kind: 'sum', meet: false, a, c: rng.int(1, a - 1) };
    }
    if (rng.chance(0.4)) return { kind: 'gap', meet: true, a: 60, c: rng.pick(MEET_WAITS) };
    const a = rng.int(3, 12);
    return { kind: 'gap', meet: false, a, c: rng.int(1, a - 1) };
  },
  render(p) {
    if (p.meet) {
      return typedProb(
        [say(`Two friends each arrive at a café at a random time between 12:00 and 1:00. Each waits ${p.c} minutes for the other, then leaves.`), say('What is the probability that they meet?')],
        geomAnswer(p),
      );
    }
    const ask = p.kind === 'sum' ? `their sum is less than ${p.c}` : `they differ by less than ${p.c}`;
    return typedProb(
      [say(`Two numbers are each chosen at random between 0 and ${p.a}, every value in that range equally likely.`), say(`What is the probability that ${ask}?`)],
      geomAnswer(p),
    );
  },
  choices(p) {
    const { a, c } = p;
    if (p.kind === 'sum') return probOptions(geomAnswer(p), [[c, 2 * a], [c * c, a * a], [c, a]]);
    return probOptions(geomAnswer(p), [[c, a], [(a - c) ** 2, a * a], [2 * c, a], [c * c, a * a]]);
  },
  solution(p) {
    const { a, c } = p;
    const steps: SolutionStep[] = [
      { text: `Two numbers together are one point $(x, y)$ chosen at random in a square of side ${a}${p.meet ? ', in minutes after 12:00' : ''}. A probability is an area of that square over its whole area:` },
      { tex: `${a} \\times ${a} = ${a * a}` },
    ];
    if (p.kind === 'sum') {
      steps.push(
        { text: `The points with a sum less than ${c} fill the corner triangle at $(0, 0)$, with both short sides ${c}:` },
        { tex: `\\frac{1}{2} \\times ${c} \\times ${c} = ${num((c * c) / 2)}` },
        { tex: `P = ${num((c * c) / 2)} \\div ${a * a} = ${ftex(geomAnswer(p))}` },
      );
    } else {
      steps.push(
        { text: `${p.meet ? 'They miss each other' : `The numbers differ by ${c} or more`} in the two corner triangles away from the diagonal, each with short sides ${a - c}. Slid together, the two make a square:` },
        { tex: `(${a} - ${c})^2 = ${(a - c) ** 2}` },
        { tex: `P = 1 - \\frac{${(a - c) ** 2}}{${a * a}} = ${ftex(geomAnswer(p))}` },
      );
    }
    return steps;
  },
};

/* ---------- all different: multiply the shrinking chances ---------- */

interface BirthdayParams {
  story: number;
  n: number;
  k: number;
  same: boolean;
}

const perm = (n: number, k: number) => Array.from({ length: k }, (_, i) => n - i).reduce((t, x) => t * x, 1);

const allDifferent = ({ n, k }: BirthdayParams): Frac => red([perm(n, k), n ** k]);

const birthdayAnswer = (p: BirthdayParams): Frac => (p.same ? sub(ONE, allDifferent(p)) : allDifferent(p));

function birthdayWords(p: BirthdayParams): [string, string] {
  const K = Words[p.k];
  if (p.story === 0) {
    return [`${K} ${diceName(p.n)} are rolled.`, p.same ? 'at least two of them show the same number' : 'they all show different numbers'];
  }
  if (p.story === 1) {
    return [`${K} people each pick a whole number from 1 to ${p.n} at random.`, p.same ? 'at least two of them pick the same number' : 'they all pick different numbers'];
  }
  return [`${K} balls are dropped one at a time into ${p.n} boxes, each ball equally likely to land in any box.`, p.same ? 'some box ends up with two or more balls' : 'no box ends up with more than one ball'];
}

const cmApBirthday: Generator<BirthdayParams> = {
  id: 'cm-ap-birthday',
  sample(rng, difficulty) {
    const k = difficulty >= 2 ? 4 : 3;
    const n = difficulty >= 2 ? rng.int(5, 10) : rng.int(4, 12);
    return { story: rng.int(0, 2), n, k, same: rng.chance(0.5) };
  },
  render(p) {
    const [setup, ask] = birthdayWords(p);
    return typedProb([say(setup), say(`What is the probability that ${ask}?`)], birthdayAnswer(p));
  },
  choices(p) {
    const { n, k } = p;
    const all = n ** k;
    if (p.same) return probOptions(birthdayAnswer(p), [[(k * (k - 1)) / 2, n], [perm(n, k), all], [all - choose(n, k), all]]);
    return probOptions(birthdayAnswer(p), [[choose(n, k), all], [(n - 1) ** (k - 1), n ** (k - 1)], [all - perm(n, k), all]]);
  },
  solution(p) {
    const { n, k } = p;
    const factors = Array.from({ length: k }, (_, i) => `\\frac{${n - i}}{${n}}`).join(' \\times ');
    const steps: SolutionStep[] = [
      { text: `Take them one at a time. The first can be anything; each one after it must avoid every ${p.story === 2 ? 'box' : 'number'} already taken, so the chances shrink:` },
      { tex: `${factors} = ${ftex(allDifferent(p))}` },
    ];
    if (p.same) steps.push({ text: 'At least one repeat is everything else:' }, { tex: `P = 1 - ${ftex(allDifferent(p))} = ${ftex(birthdayAnswer(p))}` });
    return steps;
  },
};

/* ---------- the largest (or smallest) die: "at most" minus "at most" ---------- */

interface DiceMaxParams {
  m: number;
  k: number;
  kind: 'max' | 'min' | 'both';
  i: number;
  j: number;
}

function diceMaxCount({ m, k, kind, i, j }: DiceMaxParams): number {
  if (kind === 'max') return j ** k - (j - 1) ** k;
  if (kind === 'min') return (m - j + 1) ** k - (m - j) ** k;
  const d = j - i;
  return (d + 1) ** k - 2 * d ** k + (d - 1) ** k;
}

const cmApDiceMax: Generator<DiceMaxParams> = {
  id: 'cm-ap-dice-max',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      const m = rng.pick([4, 6, 8]);
      const k = rng.pick([2, 3]);
      const kind = rng.pick(['max', 'min'] as const);
      const j = kind === 'max' ? rng.int(2, m) : rng.int(1, m - 1);
      return { m, k, kind, i: 0, j };
    }
    const k = rng.pick([3, 3, 4]);
    const m = k === 4 ? 6 : rng.pick([6, 8]);
    const [i, j] = rng.sample(Array.from({ length: m }, (_, x) => x + 1), 2).sort((x, y) => x - y);
    return { m, k, kind: 'both', i, j };
  },
  render(p) {
    const ask =
      p.kind === 'max'
        ? `the largest number shown is exactly ${p.j}`
        : p.kind === 'min'
          ? `the smallest number shown is exactly ${p.j}`
          : `the smallest number shown is ${p.i} and the largest is ${p.j}`;
    return typedProb([say(`${Words[p.k]} ${diceName(p.m)} are rolled.`), say(`What is the probability that ${ask}?`)], red([diceMaxCount(p), p.m ** p.k]));
  },
  choices(p) {
    const { m, k, j } = p;
    const all = m ** k;
    const right = red([diceMaxCount(p), all]);
    if (p.kind === 'both') {
      const d = p.j - p.i;
      return probOptions(right, [[k * (k - 1) * (d - 1) ** (k - 2), all], [(d + 1) ** k - 2 * d ** k, all], [(d + 1) ** k, all], [(d + 1) ** k - (d - 1) ** k, all]]);
    }
    const t = p.kind === 'max' ? j : m - j + 1;
    return probOptions(right, [[1, m], [t ** k, all], [k * (t - 1) ** (k - 1), all]]);
  },
  solution(p) {
    const { m, k, j } = p;
    const count = diceMaxCount(p);
    const steps: SolutionStep[] = [{ text: `There are $${m}^{${k}} = ${m ** k}$ equally likely outcomes.` }];
    if (p.kind === 'max') {
      steps.push(
        { text: `The largest is at most ${j} when every die is, ${j} choices each. Take off the outcomes where every die is at most ${j - 1}, which never reach ${j}:` },
        { tex: `${j}^{${k}} - ${j - 1}^{${k}} = ${j ** k} - ${(j - 1) ** k} = ${count}` },
      );
    } else if (p.kind === 'min') {
      const t = m - j + 1;
      steps.push(
        { text: `The smallest is at least ${j} when every die shows ${j} to ${m}, ${t} choices each. Take off the outcomes where every die is at least ${j + 1}:` },
        { tex: `${t}^{${k}} - ${t - 1}^{${k}} = ${t ** k} - ${(t - 1) ** k} = ${count}` },
      );
    } else {
      const d = p.j - p.i;
      steps.push(
        { text: `Every die from ${p.i} to ${p.j}: ${d + 1} choices each. Take off the outcomes with no ${p.i} and those with no ${p.j}, ${d} choices each. The outcomes with neither were taken off twice, so add them back:` },
        { tex: `${d + 1}^{${k}} - 2 \\times ${d}^{${k}} + ${d - 1}^{${k}}` },
        { tex: `= ${(d + 1) ** k} - ${2 * d ** k} + ${(d - 1) ** k} = ${count}` },
      );
    }
    steps.push({ tex: `P = ${rawThenLowest([count, m ** k])}` });
    return steps;
  },
};

/* ---------- the same count as a table ---------- */

interface DiceMaxTableParams {
  m: number;
  k: number;
  kind: 'max' | 'min';
  j0: number;
}

function maxTableRows({ m, k, kind, j0 }: DiceMaxTableParams): [number, number, number][] {
  return [j0, j0 + 1, j0 + 2].map((j) => {
    const t = kind === 'max' ? j : m - j + 1;
    return [j, t ** k, t ** k - (t - 1) ** k];
  });
}

const cmApDiceMaxTable: Generator<DiceMaxTableParams> = {
  id: 'cm-ap-dice-max-table',
  sample(rng, difficulty) {
    const k = difficulty >= 2 ? 3 : 2;
    const m = difficulty >= 2 ? rng.pick([4, 6, 8, 10]) : rng.pick([6, 8, 10]);
    return { m, k, kind: rng.pick(['max', 'min'] as const), j0: rng.int(1, m - 2) };
  },
  render(p): Slide {
    const rows = maxTableRows(p);
    const answer = rows.flatMap(([, a, e]) => [a, e]);
    const word = p.kind === 'max' ? 'largest' : 'smallest';
    const edge = p.kind === 'max' ? 'at most' : 'at least';
    const t0 = p.kind === 'max' ? p.j0 : p.m - p.j0 - 1;
    return {
      kind: 'table',
      prompt: [
        say(`${Words[p.k]} ${diceName(p.m)} are rolled.`),
        say(`For each $j$, count the outcomes where the ${word} number is ${edge} $j$, and where it is exactly $j$.`),
      ],
      columns: ['j', p.kind === 'max' ? '\\text{largest} \\le j' : '\\text{smallest} \\ge j', `\\text{${word}} = j`],
      rows: rows.map(([j]) => [`${j}`, null, null]),
      bank: numberBank(answer, [(t0 - 1) ** p.k, (t0 + 4) ** p.k, p.k * (t0 + 1), 2 * t0 + 3, p.m ** p.k].filter((v) => v > 0), 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution(p) {
    const edge = p.kind === 'max' ? 'at most $j$' : 'at least $j$';
    const steps: SolutionStep[] = [
      {
        text: `${Words[p.k]} dice all ${edge}: ${p.kind === 'max' ? '$j$' : `$${p.m + 1} - j$`} choices each. Exactly $j$ is that count less the count one step ${p.kind === 'max' ? 'below' : 'above'}:`,
      },
    ];
    for (const [j, a, e] of maxTableRows(p)) {
      const t = p.kind === 'max' ? j : p.m - j + 1;
      steps.push({ tex: `j = ${j}: \\; ${t}^{${p.k}} = ${a}, \\quad ${a} - ${(t - 1) ** p.k} = ${e}` });
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 2: Conditional Probability
 * ================================================================ */

/* ---------- a positive test: picture the crowd ---------- */

const SCREENS = [
  {
    setup: (prev: number, sens: number, fp: number) =>
      `In a large town, ${prev}% of people have a certain condition. A test for it is positive for ${sens}% of people who have it, and for ${fp}% of people who do not.`,
    one: 'A person picked at random tests positive. What is the probability that they have the condition?',
    two: 'A person picked at random takes the test twice. Given whether they have the condition, the two results are independent, and both are positive. What is the probability that they have the condition?',
    nouns: 'people',
    have: 'have it',
    not: 'do not',
    pos: 'test positive',
    pos2: 'test positive twice',
    table: { first: '\\text{people}', yes: '\\text{has it}', no: '\\text{does not}', flag: '\\text{positive}', pass: '\\text{negative}' },
  },
  {
    setup: (prev: number, sens: number, fp: number) =>
      `${prev}% of the items a factory makes are faulty. A scanner flags ${sens}% of the faulty items, and also ${fp}% of the good ones.`,
    one: 'An item is flagged. What is the probability that it is faulty?',
    two: 'An item goes through two scanners of this kind, which work independently given whether it is faulty, and both flag it. What is the probability that it is faulty?',
    nouns: 'items',
    have: 'are faulty',
    not: 'are good',
    pos: 'are flagged',
    pos2: 'are flagged by both',
    table: { first: '\\text{items}', yes: '\\text{faulty}', no: '\\text{good}', flag: '\\text{flagged}', pass: '\\text{passed}' },
  },
  {
    setup: (prev: number, sens: number, fp: number) =>
      `${prev}% of the emails reaching an inbox are spam. A filter marks ${sens}% of the spam as junk, and also ${fp}% of the genuine emails.`,
    one: 'An email is marked as junk. What is the probability that it is spam?',
    two: 'An email is checked by two filters of this kind, which work independently given whether it is spam, and both mark it as junk. What is the probability that it is spam?',
    nouns: 'emails',
    have: 'are spam',
    not: 'are genuine',
    pos: 'are marked as junk',
    pos2: 'are marked by both',
    table: { first: '\\text{emails}', yes: '\\text{spam}', no: '\\text{genuine}', flag: '\\text{junk}', pass: '\\text{kept}' },
  },
];

interface ScreenParams {
  story: number;
  prev: number;
  sens: number;
  fp: number;
  twice: boolean;
}

function screenCounts({ prev, sens, fp, twice }: ScreenParams) {
  const N = twice ? 10000 : 1000;
  const ill = (N * prev) / 100;
  const well = N - ill;
  const tp = twice ? (ill * sens * sens) / 10000 : (ill * sens) / 100;
  const fpos = twice ? (well * fp * fp) / 10000 : (well * fp) / 100;
  return { N, ill, well, tp, fpos };
}

function sampleScreen(rng: Rng, twice: boolean, story: number): ScreenParams {
  for (;;) {
    const p = {
      story,
      prev: rng.pick(twice ? [1, 2, 4, 5, 10, 20] : [2, 4, 5, 10, 20]),
      sens: rng.pick([80, 90, 95]),
      fp: rng.pick([5, 10, 20]),
      twice,
    };
    const c = screenCounts(p);
    if (![c.ill, c.tp, c.fpos].every(Number.isInteger)) continue;
    if (c.tp === 0 || c.fpos === 0) continue;
    return p;
  }
}

const screenAnswer = (p: ScreenParams): Frac => {
  const c = screenCounts(p);
  return red([c.tp, c.tp + c.fpos]);
};

const cmApTestBayes: Generator<ScreenParams> = {
  id: 'cm-ap-test-bayes',
  sample(rng, difficulty) {
    return sampleScreen(rng, difficulty >= 2, rng.int(0, SCREENS.length - 1));
  },
  render(p) {
    const s = SCREENS[p.story];
    return typedProb([say(s.setup(p.prev, p.sens, p.fp)), say(p.twice ? s.two : s.one)], screenAnswer(p));
  },
  choices(p) {
    const c = screenCounts(p);
    const slips: Frac[] = [[p.sens, 100], [c.fpos, c.tp + c.fpos], [c.tp, c.N]];
    // Twice: the answer for one positive result is the trap.
    if (p.twice) slips.unshift([p.prev * p.sens, p.prev * p.sens + (100 - p.prev) * p.fp]);
    return probOptions(screenAnswer(p), slips);
  },
  solution(p) {
    const s = SCREENS[p.story];
    const c = screenCounts(p);
    const tex = p.twice
      ? [`${c.ill} \\times ${p.sens}\\% \\times ${p.sens}\\% = ${c.tp}`, `${c.well} \\times ${p.fp}\\% \\times ${p.fp}\\% = ${c.fpos}`]
      : [`${c.ill} \\times ${p.sens}\\% = ${c.tp}`, `${c.well} \\times ${p.fp}\\% = ${c.fpos}`];
    return [
      { text: `Picture ${c.N} ${s.nouns}: ${c.ill} ${s.have} and ${c.well} ${s.not}. Of those ${c.ill}, the number that ${p.twice ? s.pos2 : s.pos}:` },
      { tex: tex[0] },
      { text: `Of the ${c.well}, the number that ${p.twice ? s.pos2 : s.pos}:` },
      { tex: tex[1] },
      { text: `So ${c.tp + c.fpos} ${p.twice ? s.pos2 : s.pos} in all, and ${c.tp} of them ${s.have}:` },
      { tex: `P = ${rawThenLowest([c.tp, c.tp + c.fpos])}` },
    ];
  },
};

/* ---------- the same crowd as a two-way table ---------- */

const cmApTestTable: Generator<ScreenParams> = {
  id: 'cm-ap-test-table',
  sample(rng) {
    return sampleScreen(rng, false, rng.int(0, SCREENS.length - 1));
  },
  render(p): Slide {
    const s = SCREENS[p.story];
    const t = s.table;
    const c = screenCounts(p);
    const fn = c.ill - c.tp;
    const tn = c.well - c.fpos;
    const answer = [c.tp, fn, c.fpos, tn];
    return {
      kind: 'table',
      prompt: [say(s.setup(p.prev, p.sens, p.fp)), say(`Fill in how many of ${c.N} ${s.nouns} fall in each part of the table.`)],
      columns: [t.first, t.flag, t.pass],
      rows: [
        [t.yes, null, null],
        [t.no, null, null],
      ],
      bank: numberBank(answer, [c.ill, c.well, c.tp + c.fpos, p.sens, p.fp * 10, c.ill - c.fpos].filter((v) => v > 0), 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution(p) {
    const s = SCREENS[p.story];
    const c = screenCounts(p);
    return [
      { text: `Of ${c.N}, ${p.prev}% ${s.have}:` },
      { tex: `${c.N} \\times ${p.prev}\\% = ${c.ill}, \\qquad ${c.N} - ${c.ill} = ${c.well}` },
      { text: `Split each row by the ${p.sens}% and the ${p.fp}%:` },
      { tex: `${c.ill} \\times ${p.sens}\\% = ${c.tp}, \\qquad ${c.ill} - ${c.tp} = ${c.ill - c.tp}` },
      { tex: `${c.well} \\times ${p.fp}\\% = ${c.fpos}, \\qquad ${c.well} - ${c.fpos} = ${c.well - c.fpos}` },
    ];
  },
};

/* ---------- which coin? weigh it by its tosses ---------- */

interface CoinBagParams {
  f: number;
  d: number;
  n: number;
  next: boolean;
}

const coinWeight = ({ d, n }: CoinBagParams) => d * 2 ** n;

const coinAnswer = (p: CoinBagParams): Frac => {
  const D = coinWeight(p);
  return p.next ? red([2 * D + p.f, 2 * (D + p.f)]) : red([D, D + p.f]);
};

const cmApCoinBag: Generator<CoinBagParams> = {
  id: 'cm-ap-coin-bag',
  sample(rng, difficulty) {
    return { f: rng.int(1, 7), d: rng.int(1, 3), n: rng.int(1, 3), next: difficulty >= 2 };
  },
  render(p) {
    const tossed = p.n === 1 ? 'It is tossed once and lands heads.' : `It is tossed ${p.n === 2 ? 'twice' : 'three times'} and lands heads every time.`;
    return typedProb(
      [
        say(`A bag holds ${p.f} fair ${plural(p.f, 'coin', 'coins')} and ${p.d} two-headed ${plural(p.d, 'coin', 'coins')}. One coin is taken out at random. ${tossed}`),
        say(p.next ? 'What is the probability that the next toss is heads too?' : 'What is the probability that it is a two-headed coin?'),
      ],
      coinAnswer(p),
    );
  },
  choices(p) {
    const D = coinWeight(p);
    const { f, d } = p;
    if (p.next) return probOptions(coinAnswer(p), [[1, 2], [D, D + f], [2 * d + f, 2 * (d + f)], [3, 4]]);
    return probOptions(coinAnswer(p), [[d, d + f], [f, D + f], [2 * d, 2 * d + f], [1, 2]]);
  },
  solution(p) {
    const { f, d, n } = p;
    const D = coinWeight(p);
    const t = d + f;
    const steps: SolutionStep[] = [
      { text: `Multiply along each path: the coin, then ${n === 1 ? 'heads' : `${n} heads`}.` },
      { tex: `P(\\text{two-headed and heads}) = \\frac{${d}}{${t}} \\times 1` },
      { tex: `P(\\text{fair and heads}) = \\frac{${f}}{${t}} \\times \\frac{1}{${2 ** n}}` },
      { text: `Given the heads, keep only these two paths. Times $${t * 2 ** n}$, they are in the ratio $${D} : ${f}$, so` },
      { tex: `P(\\text{two-headed}) = ${rawThenLowest([D, D + f])}` },
    ];
    if (p.next) {
      steps.push(
        { text: 'A two-headed coin gives heads again for certain, a fair one half the time:' },
        { tex: `${ftex(red([D, D + f]))} \\times 1 + ${ftex(red([f, D + f]))} \\times \\frac{1}{2} = ${ftex(coinAnswer(p))}` },
      );
    }
    return steps;
  },
};

/* ---------- "at least one" is not "the first one" ---------- */

const BAGS = [
  { thing: 'counters', A: 'red', B: 'blue' },
  { thing: 'marbles', A: 'green', B: 'yellow' },
  { thing: 'sweets', A: 'lemon', B: 'mint' },
];

interface CondPairParams {
  bag: number;
  r: number;
  b: number;
  three: boolean;
}

function condPairParts({ r, b, three }: CondPairParams): { fav: number; given: number } {
  if (!three) return { fav: choose(r, 2), given: choose(r + b, 2) - choose(b, 2) };
  return { fav: choose(r, 3), given: choose(r, 2) * b + choose(r, 3) };
}

const condPairAnswer = (p: CondPairParams): Frac => {
  const { fav, given } = condPairParts(p);
  return red([fav, given]);
};

const cmApCondPair: Generator<CondPairParams> = {
  id: 'cm-ap-cond-pair',
  sample(rng, difficulty) {
    const three = difficulty >= 2;
    return { bag: rng.int(0, BAGS.length - 1), r: rng.int(three ? 3 : 2, 7), b: rng.int(2, three ? 6 : 7), three };
  },
  render(p) {
    const s = BAGS[p.bag];
    const taken = p.three ? 'Three are taken out at random.' : 'Two are taken out at random.';
    const given = p.three ? `At least two of them are ${s.A}.` : `At least one of them is ${s.A}.`;
    const ask = p.three ? `all three are ${s.A}` : `both are ${s.A}`;
    return typedProb([say(`A bag holds ${p.r} ${s.A} and ${p.b} ${s.B} ${s.thing}. ${taken} ${given}`), say(`What is the probability that ${ask}?`)], condPairAnswer(p));
  },
  choices(p) {
    const { r, b } = p;
    const n = r + b;
    if (p.three) return probOptions(condPairAnswer(p), [[r - 2, n - 2], [choose(r, 3), choose(n, 3)], [choose(r, 3), choose(r, 2) * b]]);
    return probOptions(condPairAnswer(p), [[r - 1, n - 1], [choose(r, 2), choose(n, 2)], [choose(r, 2), r * b]]);
  },
  solution(p) {
    const s = BAGS[p.bag];
    const { r, b } = p;
    const n = r + b;
    const { fav, given } = condPairParts(p);
    if (!p.three) {
      return [
        { text: `Every pair of the ${n} is equally likely. Keep the pairs with at least one ${s.A}: all of them, less the pairs with none.` },
        { tex: `\\binom{${n}}{2} - \\binom{${b}}{2} = ${choose(n, 2)} - ${choose(b, 2)} = ${given}` },
        { text: `Both ${s.A}:` },
        { tex: `\\binom{${r}}{2} = ${fav}` },
        { tex: `P = ${rawThenLowest([fav, given])}` },
        { text: `Not $${ftex(red([r - 1, n - 1]))}$: that answers "the first one is ${s.A}", which tells you more.` },
      ];
    }
    return [
      { text: `Every set of three is equally likely. At least two ${s.A} is exactly two ${s.A} (with one ${s.B}) or three:` },
      { tex: `\\binom{${r}}{2} \\times ${b} + \\binom{${r}}{3} = ${choose(r, 2) * b} + ${fav} = ${given}` },
      { tex: `P = ${rawThenLowest([fav, given])}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Expected Value
 * ================================================================ */

/* ---------- a raffle: value times tickets ---------- */

interface RaffleParams {
  N: number;
  prizes: [number, number][];
}

const raffleTotal = ({ prizes }: RaffleParams) => prizes.reduce((t, [v, c]) => t + v * c, 0);

function prizeList(prizes: [number, number][]): string {
  const parts = prizes.map(([v, c], i) => `${c} ${i === 0 ? `${plural(c, 'wins', 'win')}` : 'win'} ${pounds(v)}`);
  return parts.length === 2 ? `${parts[0]} and ${parts[1]}` : `${parts[0]}, ${parts[1]} and ${parts[2]}`;
}

const cmApEvTable: Generator<RaffleParams> = {
  id: 'cm-ap-ev-table',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      const N = rng.pick([10, 20, 50]);
      return { N, prizes: [[rng.pick([20, 25, 50, 100]), rng.int(1, 3)], [rng.pick([2, 4, 5, 10]), rng.int(2, N / 2)]] };
    }
    const N = rng.pick([20, 50, 100]);
    return {
      N,
      prizes: [
        [rng.pick([100, 200, 250]), 1],
        [rng.pick([20, 25, 40, 50]), rng.int(2, 4)],
        [rng.pick([2, 4, 5, 8]), rng.int(3, N / 4)],
      ],
    };
  },
  render(p): Slide {
    const products = p.prizes.map(([v, c]) => v * c);
    const total = raffleTotal(p);
    const E = total / p.N;
    const winners = p.prizes.reduce((t, [, c]) => t + c, 0);
    return {
      kind: 'table',
      prompt: [
        say(`A box holds ${p.N} raffle tickets. Of them, ${prizeList(p.prizes)}; the other ${p.N - winners} win nothing.`),
        say('One ticket is drawn. Fill in the table, ending with the expected winnings in pounds.'),
      ],
      columns: ['\\text{prize}', '\\text{tickets}', '\\text{prize} \\times \\text{tickets}'],
      rows: [...p.prizes.map(([v, c]) => [`${v}`, `${c}`, null]), ['\\text{all}', `${p.N}`, null], ['\\text{per ticket}', '', null]],
      bank: numberBank(
        [...products, total, E],
        [total / winners, p.prizes.reduce((t, [v]) => t + v, 0), total / 10, E * 2].filter((x) => Number.isInteger(x * 100)),
        3,
        1,
        0,
      ),
      answer: [...products, total, E].map(num),
    };
  },
  solution(p) {
    const total = raffleTotal(p);
    return [
      { text: 'Each prize, times the tickets that win it:' },
      { tex: p.prizes.map(([v, c]) => `${v} \\times ${c} = ${v * c}`).join(', \\qquad ') },
      { text: `Across all ${p.N} tickets that is £${total}, so one ticket is worth on average` },
      { tex: `E = \\frac{${total}}{${p.N}} = ${num(total / p.N)}` },
    ];
  },
};

/* ---------- a missing prize, or a fair payout ---------- */

interface MissingParams {
  kind: 'spinner' | 'fair';
  m: number;
  w: number;
  x: number;
  v: number;
  y: number;
  /** Fair game: the cost and the event, as an index into DICE_EVENTS. */
  c: number;
  ev: number;
}

/** Events for two fair dice: how many of the 36 ordered outcomes, and of the 21 unordered pairs. */
const DICE_EVENTS = [
  { text: 'a double', ways: 6, unordered: 6 },
  { text: 'a total of 7', ways: 6, unordered: 3 },
  { text: 'a total of 12', ways: 1, unordered: 1 },
  { text: 'a total of 11', ways: 2, unordered: 1 },
  { text: 'a total of 10', ways: 3, unordered: 2 },
  { text: 'a total of 9', ways: 4, unordered: 2 },
  { text: 'a total of 5', ways: 4, unordered: 2 },
  { text: 'a total of 4', ways: 3, unordered: 2 },
  { text: 'a total of at least 10', ways: 6, unordered: 4 },
  { text: 'a total of at least 11', ways: 3, unordered: 2 },
  { text: 'a total of 2 or 12', ways: 2, unordered: 2 },
  { text: 'a total of 6', ways: 5, unordered: 3 },
];

const missingAnswer = (p: MissingParams) => (p.kind === 'spinner' ? p.x : (36 * p.c) / DICE_EVENTS[p.ev].ways);

const cmApEvMissing: Generator<MissingParams> = {
  id: 'cm-ap-ev-missing',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      for (;;) {
        const m = rng.pick([4, 5, 8, 10, 20]);
        const w = rng.int(1, 3);
        if (w + 1 >= m) continue;
        const v = rng.int(1, Math.min(4, m - w - 1));
        const p: MissingParams = { kind: 'spinner', m, w, x: rng.pick([10, 15, 20, 25, 30, 40, 50]), v, y: rng.pick([1, 2, 4, 5]), c: 0, ev: 0 };
        // The expected payout has to be a whole number of pence.
        if (!Number.isInteger(((p.w * p.x + p.v * p.y) * 100) / p.m)) continue;
        return p;
      }
    }
    for (;;) {
      const ev = rng.int(0, DICE_EVENTS.length - 1);
      const c = rng.pick([1, 2, 3, 5]);
      if ((36 * c) % DICE_EVENTS[ev].ways !== 0) continue;
      return { kind: 'fair', m: 0, w: 0, x: 0, v: 0, y: 0, c, ev };
    }
  },
  render(p) {
    if (p.kind === 'spinner') {
      const E = (p.w * p.x + p.v * p.y) / p.m;
      return typed(
        [
          say(`A spinner has ${p.m} equal sectors. ${Words[p.w]} of them ${plural(p.w, 'pays', 'pay')} the top prize, ${p.v} ${plural(p.v, 'pays', 'pay')} ${pounds(p.y)}, and the rest pay nothing.`),
          say(`The expected payout per spin is ${pounds(E)}. What is the top prize, in pounds?`),
        ],
        p.x,
        '\\text{prize} =',
      );
    }
    const e = DICE_EVENTS[p.ev];
    return typed(
      [
        say(`A game costs ${pounds(p.c)} to play. Two fair dice are rolled, and the player is paid a prize if they show ${e.text}, and nothing otherwise.`),
        say('The game is fair: the expected payout equals the cost. What is the prize, in pounds?'),
      ],
      missingAnswer(p),
      '\\text{prize} =',
    );
  },
  choices(p) {
    const right = missingAnswer(p);
    if (p.kind === 'spinner') {
      const total = p.w * p.x + p.v * p.y;
      return numberOptions(right, [total, total / p.w + p.y, (total + p.v * p.y) / p.w, total / (p.w + p.v)]);
    }
    const e = DICE_EVENTS[p.ev];
    return numberOptions(right, [(21 * p.c) / e.unordered, right - p.c, right + p.c, 11 * p.c]);
  },
  solution(p) {
    if (p.kind === 'spinner') {
      const E = (p.w * p.x + p.v * p.y) / p.m;
      const total = p.w * p.x + p.v * p.y;
      const steps: SolutionStep[] = [
        { text: `Over ${p.m} spins, one landing on each sector, the payouts add to` },
        { tex: `${p.m} \\times ${num(E)} = ${total}` },
        {
          text: `The ${p.v} ${plural(p.v, 'sector', 'sectors')} paying £${p.y} ${plural(p.v, 'gives', 'give')} $${p.v * p.y}$ of that, and the rest ${p.w === 1 ? 'is the top prize' : `is shared by the ${p.w} top-prize sectors`}:`,
        },
        { tex: `${total} - ${p.v * p.y} = ${total - p.v * p.y}` },
      ];
      if (p.w > 1) steps.push({ tex: `\\text{prize} = ${total - p.v * p.y} \\div ${p.w} = ${p.x}` });
      return steps;
    }
    const e = DICE_EVENTS[p.ev];
    const right = missingAnswer(p);
    return [
      { text: `Count ordered outcomes: ${e.text} is ${e.ways} of the 36, so the prize is paid with probability` },
      { tex: `P = ${rawThenLowest([e.ways, 36])}` },
      { text: 'A fair game has expected payout equal to the cost:' },
      { tex: `\\text{prize} \\times ${ftex(red([e.ways, 36]))} = ${p.c}` },
      { tex: `\\text{prize} = ${p.c} \\times ${ftex(red([36, e.ways]))} = ${right}` },
    ];
  },
};

/* ---------- the largest of several: gaps, or tail chances ---------- */

interface EvMaxParams {
  kind: 'tickets' | 'dice';
  n: number;
  k: number;
  largest: boolean;
  spinner: boolean;
}

function evMaxAnswer({ kind, n, k, largest }: EvMaxParams): Frac {
  if (kind === 'tickets') return largest ? red([k * (n + 1), k + 1]) : red([n + 1, k + 1]);
  const sumPow = Array.from({ length: n }, (_, i) => (i + 1) ** k).reduce((t, x) => t + x, 0);
  const small = red([sumPow, n ** k]);
  return largest ? sub([n + 1, 1], small) : small;
}

const cmApEvMax: Generator<EvMaxParams> = {
  id: 'cm-ap-ev-max',
  sample(rng, difficulty) {
    if (difficulty < 2) return { kind: 'tickets', n: rng.int(5, 30), k: rng.pick([2, 3]), largest: rng.chance(0.6), spinner: false };
    return { kind: 'dice', n: rng.pick([4, 5, 6, 8, 10, 12]), k: rng.pick([2, 3]), largest: rng.chance(0.5), spinner: rng.chance(0.4) };
  },
  render(p) {
    const which = p.largest ? 'largest' : 'smallest';
    if (p.kind === 'tickets') {
      return typedMean(
        [say(`${Words[p.k]} tickets are drawn at random, without putting any back, from tickets numbered 1 to ${p.n}.`), say(`What is the expected value of the ${which} number drawn?`)],
        evMaxAnswer(p),
      );
    }
    const setup = p.spinner
      ? `A spinner with ${p.n} equal sectors numbered 1 to ${p.n} is spun ${p.k === 2 ? 'twice' : 'three times'}.`
      : `${Words[p.k]} ${diceName(p.n)} are rolled.`;
    return typedMean([say(setup), say(`What is the expected value of the ${which} number shown?`)], evMaxAnswer(p));
  },
  choices(p) {
    const { n, k } = p;
    const right = evMaxAnswer(p);
    const other = evMaxAnswer({ ...p, largest: !p.largest });
    const mean: Frac = [n + 1, 2];
    if (p.kind === 'tickets') return meanOptions(right, [p.largest ? [n, 1] : [n, k + 1], mean, other, p.largest ? [k * n, k + 1] : [n + 1, k]]);
    const noReplace = evMaxAnswer({ ...p, kind: 'tickets' });
    return meanOptions(right, [noReplace, mean, other, p.largest ? [n, 1] : [1, 1]]);
  },
  solution(p) {
    const { n, k } = p;
    if (p.kind === 'tickets') {
      const gap = red([n + 1, k + 1]);
      const steps: SolutionStep[] = [
        { text: `Put fences at 0 and ${n + 1}. The ${k} numbers drawn cut the space between them into ${k + 1} gaps, which add up to ${n + 1}, and by symmetry every gap has the same expected size:` },
        { tex: `\\frac{${n + 1}}{${k + 1}}${gcd(n + 1, k + 1) > 1 ? ` = ${ftex(gap)}` : ''}` },
      ];
      if (p.largest) steps.push({ text: `The largest sits one gap below the top fence:` }, { tex: `E = ${n + 1} - ${ftex(gap)} = ${ftex(evMaxAnswer(p))}` });
      else steps.push({ text: 'The smallest is the first gap above 0:' }, { tex: `E = ${ftex(gap)}` });
      return steps;
    }
    const sumPow = Array.from({ length: n }, (_, i) => (i + 1) ** k).reduce((t, x) => t + x, 0);
    const small = red([sumPow, n ** k]);
    const steps: SolutionStep[] = [
      { text: `A whole-number score's expected value is the sum of the chances that it is at least 1, at least 2, and so on. The smallest is at least $j$ when every one is, so` },
      { tex: `E(\\text{smallest}) = \\frac{${n}^{${k}} + ${n - 1}^{${k}} + \\cdots + 1^{${k}}}{${n}^{${k}}}` },
      { tex: `= ${rawThenLowest([sumPow, n ** k])}` },
    ];
    if (p.largest) {
      steps.push(
        { text: `Swap every number $a$ for $${n + 1} - a$, which is just as likely: the largest turns into the smallest, so` },
        { tex: `E(\\text{largest}) = ${n + 1} - ${ftex(small)} = ${ftex(evMaxAnswer(p))}` },
      );
    }
    return steps;
  },
};

/* ---------- when does a re-spin pay? ---------- */

interface RespinParams {
  values: number[];
  spins: 2 | 3;
}

const meanOf = (values: number[]): Frac => red([values.reduce((t, v) => t + v, 0), values.length]);

/** The value of a spin you may keep or replace by something worth `later`. */
function withOption(values: number[], later: Frac): Frac {
  const s = values.length;
  let total: Frac = [0, 1];
  for (const v of values) total = add(total, value([v, 1]) > value(later) ? [v, s] : mul(later, [1, s]));
  return total;
}

function respinValues({ values, spins }: RespinParams): Frac[] {
  const e1 = meanOf(values);
  const e2 = withOption(values, e1);
  return spins === 2 ? [e1, e2] : [e1, e2, withOption(values, e2)];
}

const cmApEvRespin: Generator<RespinParams> = {
  id: 'cm-ap-ev-respin',
  sample(rng, difficulty) {
    const spins = difficulty >= 2 ? 3 : 2;
    for (;;) {
      const s = rng.pick([4, 5]);
      const values = rng.sample(Array.from({ length: 12 }, (_, i) => i + 1), s).sort((a, b) => a - b);
      const vals = respinValues({ values, spins });
      if (vals.some((f, i) => i > 0 && value(f) <= value(vals[i - 1]))) continue;
      // Keep the threshold off the sector values, so "keep or spin again" is never a tie.
      if (vals.slice(0, -1).some((f) => values.some((v) => Math.abs(v - value(f)) < 1e-9))) continue;
      if (vals[vals.length - 1][1] > 200) continue;
      return { values, spins };
    }
  },
  render(p) {
    const list = `${p.values.slice(0, -1).join(', ')} and ${p.values[p.values.length - 1]}`;
    const rule =
      p.spins === 2
        ? 'You spin once, and may then spin once more, but if you do you must keep the second score.'
        : 'You may spin up to three times, stopping whenever you like, and your score is the last spin.';
    return typedMean(
      [say(`A spinner has ${p.values.length} equal sectors marked ${list}. ${rule}`), say('Playing as well as possible, what is your expected score?')],
      respinValues(p)[p.spins - 1],
    );
  },
  choices(p) {
    const vals = respinValues(p);
    const s = p.values.length;
    let best = 0;
    for (const a of p.values) for (const b of p.values) best += Math.max(a, b);
    const slips: Frac[] = [vals[0], red([best, s * s]), [p.values[s - 1], 1]];
    if (p.spins === 3) slips.unshift(vals[1]);
    return meanOptions(vals[p.spins - 1], slips);
  },
  solution(p) {
    const vals = respinValues(p);
    const s = p.values.length;
    const steps: SolutionStep[] = [
      { text: 'Work backwards from the last spin. A last spin must be kept, so it is worth its average:' },
      { tex: `\\frac{${p.values.join(' + ')}}{${s}} = ${ftex(vals[0])}` },
    ];
    for (let i = 1; i < vals.length; i += 1) {
      const high = p.values.filter((v) => v > value(vals[i - 1]));
      const low = s - high.length;
      steps.push(
        {
          text: `${i === vals.length - 1 ? 'On the first spin' : 'On the spin before'}, keep a score above $${ftex(vals[i - 1])}$ and spin again below it:`,
        },
        { tex: `\\frac{${high.join(' + ')}}{${s}} + \\frac{${low}}{${s}} \\times ${ftex(vals[i - 1])} = ${ftex(vals[i])}` },
      );
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 4: Recursion
 * ================================================================ */

/* ---------- waiting for a colour ---------- */

interface WaitParams {
  m: number;
  i: number;
  j: number;
  both: boolean;
}

function waitAnswer({ m, i, j, both }: WaitParams): Frac {
  if (!both) return red([m, i]);
  const c = i + j;
  return add(add([m, c], mul([i, c], [m, j])), mul([j, c], [m, i]));
}

const cmApWait: Generator<WaitParams> = {
  id: 'cm-ap-wait',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      const m = rng.pick([4, 6, 8, 10, 12, 20]);
      return { m, i: rng.int(1, m / 2), j: 0, both: false };
    }
    for (;;) {
      const m = rng.pick([6, 8, 10, 12]);
      const i = rng.int(1, m - 2);
      const j = rng.int(1, m - 1 - i);
      if (i === j && rng.chance(0.6)) continue;
      return { m, i, j, both: true };
    }
  },
  render(p) {
    const faces = p.both
      ? `${p.i} red ${plural(p.i, 'face', 'faces')}, ${p.j} blue ${plural(p.j, 'face', 'faces')} and the rest white`
      : `${p.i} red ${plural(p.i, 'face', 'faces')} and the rest white`;
    const until = p.both ? 'until a red face and a blue face have both come up' : 'until a red face comes up';
    return typedMean(
      [say(`${p.m === 6 ? 'A fair die' : `A fair ${p.m}-sided die`} has ${faces}. It is rolled ${until}.`), say('What is the expected number of rolls, counting the last one?')],
      waitAnswer(p),
    );
  },
  choices(p) {
    const { m, i, j } = p;
    if (!p.both) return meanOptions(waitAnswer(p), [[m - i, i], [m, 2 * i], [m + i, 2 * i]]);
    return meanOptions(waitAnswer(p), [add([m, i], [m, j]), [m, Math.min(i, j)], [2 * m, i + j]]);
  },
  solution(p) {
    const { m, i, j } = p;
    if (!p.both) {
      return [
        { text: 'Call the expected number of rolls $E$. After one roll, either it was red, or it was wasted and you are back where you started:' },
        { tex: `E = 1 + ${ftex(red([m - i, m]))}E` },
        { tex: `${ftex(red([i, m]))}E = 1` },
        { tex: `E = ${ftex(waitAnswer(p))}` },
      ];
    }
    const c = i + j;
    return [
      { text: `First wait for either colour. ${c} of the ${m} faces are coloured, so by the same equation as for one colour that takes $${ftex(red([m, c]))}$ rolls on average.` },
      { text: `That face is red with probability $${ftex(red([i, c]))}$, and then you wait for blue, $${ftex(red([m, j]))}$ more rolls. If it was blue, you wait $${ftex(red([m, i]))}$ for red:` },
      { tex: `E = ${ftex(red([m, c]))} + ${ftex(red([i, c]))} \\times ${ftex(red([m, j]))} + ${ftex(red([j, c]))} \\times ${ftex(red([m, i]))}` },
      { tex: `= ${ftex(waitAnswer(p))}` },
    ];
  },
};

/* ---------- taking turns: the game comes back round ---------- */

const PLAYERS = [
  ['Ana', 'Ben'],
  ['Dev', 'Eve'],
  ['Gus', 'Hana'],
  ['Jo', 'Kit'],
];

interface TurnsParams {
  pair: number;
  a: number;
  b: number;
}

function turnsAnswer({ a, b }: TurnsParams): Frac {
  const pa = pOf(EVENTS[a]);
  const qa = sub(ONE, pa);
  const qb = sub(ONE, pOf(EVENTS[b]));
  return div(pa, sub(ONE, mul(qa, qb)));
}

/** 'a fair die', 'a fair 8-sided die', 'a fair coin': the device mid-sentence. */
const short = (e: Event) => (e.device.charAt(0).toLowerCase() + e.device.slice(1)).replace(/, numbered.*$/, '');

const cmApFirstToWin: Generator<TurnsParams> = {
  id: 'cm-ap-first-to-win',
  sample(rng, difficulty) {
    const pair = rng.int(0, PLAYERS.length - 1);
    if (difficulty < 2) {
      const a = rng.int(0, EVENTS.length - 1);
      return { pair, a, b: a };
    }
    for (;;) {
      const a = rng.int(0, EVENTS.length - 1);
      const b = rng.int(0, EVENTS.length - 1);
      if (EVENTS[a].m === EVENTS[b].m) continue;
      return { pair, a, b };
    }
  },
  render(p) {
    const [A, B] = PLAYERS[p.pair];
    const ea = EVENTS[p.a];
    const eb = EVENTS[p.b];
    if (p.a === p.b) {
      return typedProb(
        [say(`${A} and ${B} take turns with ${short(ea)}, ${A} first. The first to get ${ea.yes} wins.`), say(`What is the probability that ${A} wins?`)],
        turnsAnswer(p),
      );
    }
    return typedProb(
      [
        say(`${A} and ${B} take turns, ${A} first. On each turn ${A} uses ${short(ea)} and wins with ${ea.yes}; ${B} uses ${short(eb)} and wins with ${eb.yes}.`),
        say(`They go on until someone wins. What is the probability that ${A} wins?`),
      ],
      turnsAnswer(p),
    );
  },
  choices(p) {
    const pa = pOf(EVENTS[p.a]);
    const pb = pOf(EVENTS[p.b]);
    const right = turnsAnswer(p);
    return probOptions(right, [[1, 2], div(pa, add(pa, pb)), pa, sub(ONE, right)]);
  },
  solution(p) {
    const [A] = PLAYERS[p.pair];
    const pa = pOf(EVENTS[p.a]);
    const qa = sub(ONE, pa);
    const qb = sub(ONE, pOf(EVENTS[p.b]));
    const both = mul(qa, qb);
    return [
      { text: `Call ${A}'s chance $P$. ${A} wins on the first turn, or both miss and the game is back where it started, with ${A} to go:` },
      { tex: `P = ${ftex(pa)} + ${ftex(qa)} \\times ${ftex(qb)} \\times P` },
      { tex: `P = ${ftex(pa)} + ${ftex(both)}P` },
      { tex: `${ftex(sub(ONE, both))}P = ${ftex(pa)}` },
      { tex: `P = ${ftex(turnsAnswer(p))}` },
    ];
  },
};

/* ---------- landing on a square: the two squares before ---------- */

const WALKS = [
  {
    setup: (a: string) => `A frog hops along a row of lily pads, starting on pad 0. Each hop takes it 1 pad forward with probability $${a}$, or 2 pads forward otherwise.`,
    unit: 'pad',
    land: 'it lands on',
    over: (n: number) => `it hops over pad ${n} without landing on it`,
  },
  {
    setup: (a: string) => `A token starts on square 0 of a long track. Each turn it moves 1 square forward with probability $${a}$, or 2 squares forward otherwise.`,
    unit: 'square',
    land: 'it lands on',
    over: (n: number) => `it jumps over square ${n} without landing on it`,
  },
  {
    setup: (a: string) => `Sam climbs a long staircase from step 0. Each stride goes up 1 step with probability $${a}$, or 2 steps otherwise.`,
    unit: 'step',
    land: 'Sam treads on',
    over: (n: number) => `Sam strides over step ${n} without treading on it`,
  },
];

interface LandParams {
  story: number;
  a: Frac;
  n: number;
  over: boolean;
}

function landChances(a: Frac, n: number): Frac[] {
  const b = sub(ONE, a);
  const out: Frac[] = [ONE, a];
  for (let k = 2; k <= n; k += 1) out.push(add(mul(a, out[k - 1]), mul(b, out[k - 2])));
  return out;
}

const landAnswer = ({ a, n, over }: LandParams): Frac => {
  const ps = landChances(a, n);
  return over ? sub(ONE, ps[n]) : ps[n];
};

function landSteps(a: Frac, n: number, unit: string): SolutionStep[] {
  const b = sub(ONE, a);
  const ps = landChances(a, n);
  const steps: SolutionStep[] = [
    { text: `Write $p_k$ for the chance of landing on ${unit} $k$. To land on $k$, the last move comes from $k - 1$ (a move of 1) or from $k - 2$ (a move of 2), never both:` },
    { tex: `p_k = ${ftex(a)}p_{k-1} + ${ftex(b)}p_{k-2}` },
    { text: `Start from $p_0 = 1$ and $p_1 = ${ftex(a)}$:` },
  ];
  for (let k = 2; k <= n; k += 1) {
    steps.push({ tex: `p_{${k}} = ${ftex(a)} \\times ${ftex(ps[k - 1])} + ${ftex(b)} \\times ${ftex(ps[k - 2])} = ${ftex(ps[k])}` });
  }
  return steps;
}

const LAND_EASY: Frac[] = [
  [1, 2],
  [1, 3],
  [2, 3],
];
const LAND_HARD: Frac[] = [
  [1, 4],
  [3, 4],
  [2, 5],
  [3, 5],
];

const cmApLandOn: Generator<LandParams> = {
  id: 'cm-ap-land-on',
  sample(rng, difficulty) {
    const story = rng.int(0, WALKS.length - 1);
    if (difficulty < 2) return { story, a: rng.pick(LAND_EASY), n: rng.int(3, 7), over: false };
    const over = rng.chance(0.5);
    return { story, a: over ? rng.pick([...LAND_EASY, ...LAND_HARD]) : rng.pick(LAND_HARD), n: rng.int(3, over ? 6 : 5), over };
  },
  render(p) {
    const w = WALKS[p.story];
    const ask = p.over ? w.over(p.n) : `${w.land} ${w.unit} ${p.n}`;
    return typedProb([say(w.setup(tf(p.a))), say(`What is the probability that ${ask}?`)], landAnswer(p));
  },
  choices(p) {
    const ps = landChances(p.a, p.n);
    const b = sub(ONE, p.a);
    const limit = red([p.a[1], 2 * p.a[1] - p.a[0]]);
    if (p.over) return probOptions(landAnswer(p), [ps[p.n], mul(b, ps[p.n - 2]), sub(ONE, limit), b]);
    return probOptions(landAnswer(p), [limit, pow(p.a, p.n), ps[p.n - 1], sub(ONE, ps[p.n])]);
  },
  solution(p) {
    const w = WALKS[p.story];
    const steps = landSteps(p.a, p.n - (p.over ? 1 : 0), w.unit);
    if (p.over) {
      const b = sub(ONE, p.a);
      const ps = landChances(p.a, p.n);
      steps.push(
        { text: `The only way past ${w.unit} ${p.n} without landing on it is to land on ${p.n - 1} and then move 2:` },
        { tex: `P = ${ftex(b)} \\times ${ftex(ps[p.n - 1])} = ${ftex(landAnswer(p))}` },
      );
    }
    return steps;
  },
};

/* ---------- the same chances as a table ---------- */

interface LandTableParams {
  story: number;
  a: Frac;
  R: number;
}

const cmApLandTable: Generator<LandTableParams> = {
  id: 'cm-ap-land-table',
  sample(rng, difficulty) {
    const story = rng.int(0, WALKS.length - 1);
    if (difficulty < 2) return { story, a: rng.pick([...LAND_EASY, [1, 4], [3, 4]] as Frac[]), R: rng.pick([3, 4]) };
    return { story, a: rng.pick([...LAND_HARD, [1, 5], [4, 5]] as Frac[]), R: rng.pick([4, 5]) };
  },
  render(p): Slide {
    const w = WALKS[p.story];
    const ps = landChances(p.a, p.R);
    const b = sub(ONE, p.a);
    const answer = ps.slice(1).map(ftex);
    const taken = new Set(answer.map((t) => tokenValue(t)));
    const spares: string[] = [];
    const candidates: Frac[] = [];
    for (let k = 2; k <= p.R; k += 1) candidates.push(pow(p.a, k), mul(b, ps[k - 2]), mul(p.a, ps[k - 1]), sub(ONE, ps[k]));
    candidates.push(b, pow(b, 2));
    for (const f of candidates) {
      if (spares.length === 3) break;
      const v = value(f);
      if (v <= 0 || v >= 1 || [...taken].some((u) => Math.abs((u ?? -1) - v) < 1e-12)) continue;
      taken.add(v);
      spares.push(ftex(f));
    }
    return {
      kind: 'table',
      prompt: [say(w.setup(tf(p.a))), say(`Write $p_k$ for the probability that ${w.land} ${w.unit} $k$. Fill in the table.`)],
      columns: ['k', 'p_k'],
      rows: [['0', '1'], ...Array.from({ length: p.R }, (_, i) => [`${i + 1}`, null])],
      bank: sortByValue([...answer, ...spares]),
      answer,
    };
  },
  solution(p) {
    return landSteps(p.a, p.R, WALKS[p.story].unit);
  },
};

/* ================================================================
 * Lesson 5: Linearity of Expectation
 * ================================================================ */

/* ---------- the expected total: one draw at a time ---------- */

interface DrawSumParams {
  kind: 'tickets' | 'dice';
  n: number;
  k: number;
  left: boolean;
  t: number;
}

const highSum = (m: number, t: number) => ((m + t + 1) * (m - t)) / 2;

function drawSumAnswer(p: DrawSumParams): Frac {
  if (p.kind === 'tickets') return red([(p.left ? p.n - p.k : p.k) * (p.n + 1), 2]);
  return red([p.k * highSum(p.n, p.t), p.n]);
}

const cmApDrawSum: Generator<DrawSumParams> = {
  id: 'cm-ap-draw-sum',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      const n = rng.int(10, 40);
      return { kind: 'tickets', n, k: rng.int(2, 6), left: rng.chance(0.4), t: 0 };
    }
    const m = rng.pick([6, 8, 10, 12]);
    return { kind: 'dice', n: m, k: rng.int(2, 6), left: false, t: rng.int(1, m - 2) };
  },
  render(p) {
    if (p.kind === 'tickets') {
      return typedMean(
        [
          say(`A box holds ${p.n} tickets numbered 1 to ${p.n}. ${Words[p.k]} are drawn at random, without putting any back.`),
          say(`What is the expected total of the numbers ${p.left ? 'left in the box' : 'drawn'}?`),
        ],
        drawSumAnswer(p),
      );
    }
    return typedMean(
      [
        say(`${Words[p.k]} ${diceName(p.n)} are rolled. The score is the total of the dice that show more than ${p.t}; the others score nothing.`),
        say('What is the expected score?'),
      ],
      drawSumAnswer(p),
    );
  },
  choices(p) {
    const right = drawSumAnswer(p);
    if (p.kind === 'tickets') {
      const c = p.left ? p.n - p.k : p.k;
      return meanOptions(right, [[c * p.n, 2], [(p.left ? p.k : p.n - p.k) * (p.n + 1), 2], [p.n + 1, 2], [c * (p.n + 2), 2]]);
    }
    return meanOptions(right, [[p.k * (p.t + 1 + p.n), 2], [highSum(p.n, p.t), p.n], [p.k * (p.n + 1), 2], [p.k * (p.n - p.t), p.n]]);
  },
  solution(p) {
    if (p.kind === 'tickets') {
      const c = p.left ? p.n - p.k : p.k;
      return [
        {
          text: `${p.left ? `${c} tickets are left, and each` : 'Each ticket drawn'}, looked at on its own, is equally likely to be any of the ${p.n}, so its expected number is the average. Expectations add even though the tickets are not independent:`,
        },
        { tex: `\\frac{1 + ${p.n}}{2} = ${ftex(red([p.n + 1, 2]))}` },
        { tex: `E = ${c} \\times ${ftex(red([p.n + 1, 2]))} = ${ftex(drawSumAnswer(p))}` },
      ];
    }
    const faces = p.n - p.t <= 3 ? Array.from({ length: p.n - p.t }, (_, i) => p.t + 1 + i).join(' + ') : `${p.t + 1} + \\cdots + ${p.n}`;
    return [
      { text: `One die scores its face when it shows ${p.t + 1} ${p.n - p.t === 2 ? 'or' : 'to'} ${p.n}, and 0 otherwise:` },
      { tex: `\\frac{${faces}}{${p.n}} = ${ftex(red([highSum(p.n, p.t), p.n]))}` },
      { text: `Add that for each of the ${p.k} dice:` },
      { tex: `E = ${p.k} \\times ${ftex(red([highSum(p.n, p.t), p.n]))} = ${ftex(drawSumAnswer(p))}` },
    ];
  },
};

/* ---------- how many different: one indicator per face ---------- */

const DISTINCT_STORIES = [
  {
    setup: (k: number, m: number) => `${Words[k]} ${diceName(m)} are rolled.`,
    one: 'What is the expected number of different numbers that come up?',
    exact: 'What is the expected number of numbers that come up on exactly one die?',
    thing: 'number',
    things: 'numbers',
    by: 'dice',
  },
  {
    setup: (k: number, m: number) => `${Words[k]} people each choose one of ${m} ice-cream flavours at random.`,
    one: 'What is the expected number of different flavours chosen?',
    exact: 'What is the expected number of flavours chosen by exactly one person?',
    thing: 'flavour',
    things: 'flavours',
    by: 'people',
  },
  {
    setup: (k: number, m: number) => `${Words[k]} balls are dropped into ${m} boxes, each ball equally likely to land in any box.`,
    one: 'What is the expected number of boxes with at least one ball in?',
    exact: 'What is the expected number of boxes holding exactly one ball?',
    thing: 'box',
    things: 'boxes',
    by: 'balls',
  },
];

interface DistinctParams {
  story: number;
  m: number;
  k: number;
  exact: boolean;
}

function distinctAnswer({ m, k, exact }: DistinctParams): Frac {
  if (exact) return red([k * (m - 1) ** (k - 1), m ** (k - 1)]);
  return red([m ** k - (m - 1) ** k, m ** (k - 1)]);
}

const cmApDistinct: Generator<DistinctParams> = {
  id: 'cm-ap-distinct',
  sample(rng, difficulty) {
    const m = rng.pick([3, 4, 5, 6, 8, 10]);
    return { story: rng.int(0, DISTINCT_STORIES.length - 1), m, k: rng.int(2, 4), exact: difficulty >= 2 };
  },
  render(p) {
    const s = DISTINCT_STORIES[p.story];
    return typedMean([say(s.setup(p.k, p.m)), say(p.exact ? s.exact : s.one)], distinctAnswer(p));
  },
  choices(p) {
    const { m, k } = p;
    const right = distinctAnswer(p);
    if (p.exact) return meanOptions(right, [distinctAnswer({ ...p, exact: false }), [k * (m - 1) ** (k - 1), m ** k], [(m - 1) ** k, m ** (k - 1)], [k, 1]]);
    return meanOptions(right, [[Math.min(k, m), 1], [m ** k - (m - 1) ** k, m ** k], [(m - 1) ** k, m ** (k - 1)], [k * (m - 1), m]]);
  },
  solution(p) {
    const s = DISTINCT_STORIES[p.story];
    const { m, k } = p;
    const steps: SolutionStep[] = [
      { text: `Give each of the ${m} ${s.things} a score of 1 if it counts and 0 if not. The count is the sum of the scores, so its expected value is the sum of their chances, and every ${s.thing} has the same chance.` },
    ];
    if (!p.exact) {
      steps.push(
        { text: `One ${s.thing} is missed by all ${k} ${s.by} with probability` },
        { tex: `\\left(\\frac{${m - 1}}{${m}}\\right)^{${k}} = \\frac{${(m - 1) ** k}}{${m ** k}}` },
        { tex: `E = ${m} \\times \\frac{${m ** k - (m - 1) ** k}}{${m ** k}} = ${ftex(distinctAnswer(p))}` },
      );
    } else {
      const one = k * (m - 1) ** (k - 1);
      steps.push(
        { text: `One ${s.thing} counts when exactly one of the ${k} ${s.by} gives it (${k} ways to say which) and the other ${k - 1} miss it:` },
        { tex: `${k} \\times \\frac{1}{${m}} \\times \\left(\\frac{${m - 1}}{${m}}\\right)^{${k - 1}} = \\frac{${one}}{${m ** k}}` },
        { tex: `E = ${m} \\times \\frac{${one}}{${m ** k}} = ${ftex(distinctAnswer(p))}` },
      );
    }
    return steps;
  },
};

/* ---------- mixed neighbours: one indicator per gap ---------- */

const NEIGHBOURS = [
  {
    setup: (b: number, g: number, circle: boolean) => `${b} boys and ${g} girls ${circle ? 'sit around a round table' : 'stand in a line'} in a random order.`,
    ask: 'What is the expected number of neighbouring pairs made up of a boy and a girl?',
    mixed: 'a boy and a girl',
  },
  {
    setup: (b: number, g: number, circle: boolean) => `${b} red and ${g} blue beads are threaded ${circle ? 'onto a closed loop' : 'onto a string'} in a random order.`,
    ask: 'What is the expected number of neighbouring pairs of beads with different colours?',
    mixed: 'different colours',
  },
  {
    setup: (b: number, g: number, circle: boolean) => `${b} red and ${g} black cards are shuffled and ${circle ? 'dealt face up in a circle' : 'dealt face up in a row'}.`,
    ask: 'What is the expected number of neighbouring pairs of cards with different colours?',
    mixed: 'different colours',
  },
];

interface NeighbourParams {
  story: number;
  b: number;
  g: number;
  circle: boolean;
}

const gapsOf = ({ b, g, circle }: NeighbourParams) => (circle ? b + g : b + g - 1);
const mixedChance = ({ b, g }: NeighbourParams): Frac => red([b * g, choose(b + g, 2)]);
const neighbourAnswer = (p: NeighbourParams): Frac => mul([gapsOf(p), 1], mixedChance(p));

function sampleNeighbours(rng: Rng, difficulty: number): NeighbourParams {
  return { story: rng.int(0, NEIGHBOURS.length - 1), b: rng.int(2, 8), g: rng.int(2, 8), circle: difficulty >= 2 };
}

function neighbourSolution(p: NeighbourParams): SolutionStep[] {
  const n = p.b + p.g;
  const gaps = gapsOf(p);
  return [
    { text: `${p.circle ? `Around the ${p.story === 1 ? 'loop' : 'circle'}, ${n} places make ${n} neighbouring pairs` : `In a row of ${n} there are ${gaps} neighbouring pairs`}. Score each pair 1 if it is ${NEIGHBOURS[p.story].mixed}. The two in any one pair are a random pair of the ${n}, so each scores 1 with probability` },
    { tex: `\\frac{${p.b} \\times ${p.g}}{\\binom{${n}}{2}} = ${rawThenLowest([p.b * p.g, choose(n, 2)])}` },
    { text: 'Expectations add, whatever the pairs have to do with each other:' },
    { tex: `E = ${gaps} \\times ${ftex(mixedChance(p))} = ${ftex(neighbourAnswer(p))}` },
  ];
}

const cmApAdjacent: Generator<NeighbourParams> = {
  id: 'cm-ap-adjacent',
  sample: sampleNeighbours,
  render(p) {
    const s = NEIGHBOURS[p.story];
    return typedMean([say(s.setup(p.b, p.g, p.circle)), say(s.ask)], neighbourAnswer(p));
  },
  choices(p) {
    const n = p.b + p.g;
    const gaps = gapsOf(p);
    const other = p.circle ? n - 1 : n;
    return meanOptions(neighbourAnswer(p), [[gaps, 2], mul([other, 1], mixedChance(p)), [2 * p.b * p.g * gaps, n * n], [p.b * p.g, n]]);
  },
  solution: neighbourSolution,
};

const cmApAdjacentTiles: Generator<NeighbourParams> = {
  id: 'cm-ap-adjacent-tiles',
  sample: sampleNeighbours,
  render(p): Slide {
    const s = NEIGHBOURS[p.story];
    const n = p.b + p.g;
    const answer = [`${gapsOf(p)}`, ftex(mixedChance(p)), ftex(neighbourAnswer(p))];
    const bank = [...answer];
    const other = p.circle ? n - 1 : n;
    const candidates: Frac[] = [[other, 1], [2 * p.b * p.g, n * n], [1, 2], mul([other, 1], mixedChance(p)), [gapsOf(p), 2], [p.b * p.g, n]];
    let extra = 0;
    for (const f of candidates) {
      if (extra === 3) break;
      const t = ftex(red(f));
      if (bank.includes(t)) continue;
      bank.push(t);
      extra += 1;
    }
    return {
      kind: 'tiles',
      prompt: [
        say(s.setup(p.b, p.g, p.circle)),
        say(`Finish the line: the number of neighbouring pairs, the chance that one of them is ${s.mixed}, and the expected number of such pairs.`),
      ],
      template: '\\text{expected} = {0} \\times {1} = {2}',
      bank: sortByValue(bank),
      answer,
    };
  },
  solution: neighbourSolution,
};

/* ================================================================
 * Lesson 6: Events with States
 * ================================================================ */

/* ---------- a run of successes: build it one at a time ---------- */

interface StreakParams {
  ev: number;
  N: number;
}

const streakTerms = ({ ev, N }: StreakParams) => Array.from({ length: N }, (_, i) => rOf(UNIT_EVENTS[ev]) ** (i + 1));
const streakTotal = (p: StreakParams) => streakTerms(p).reduce((t, x) => t + x, 0);
const TIMES = ['', 'once', 'twice', 'three times', 'four times'];

function sampleStreak(rng: Rng, lo: number, hi: number, capR: number): StreakParams {
  for (;;) {
    const ev = rng.int(0, UNIT_EVENTS.length - 1);
    const N = rng.int(lo, hi);
    const r = rOf(UNIT_EVENTS[ev]);
    if (N > lo && r > capR) continue;
    if (streakTotal({ ev, N }) > 10000) continue;
    return { ev, N };
  }
}

const streakSetup = (p: StreakParams) => {
  const e = UNIT_EVENTS[p.ev];
  return `${e.device} is ${e.verb} until ${e.yes} comes up ${TIMES[p.N]} in a row.`;
};

function streakSolution(p: StreakParams): SolutionStep[] {
  const e = UNIT_EVENTS[p.ev];
  const r = rOf(e);
  const steps: SolutionStep[] = [
    {
      text: `Let $T_j$ be the expected number of ${e.nouns} to first reach a run of $j$. From a run of $j - 1$, one more ${e.noun} either extends it (chance $\\tfrac{1}{${r}}$) or breaks it, and then the whole run of $j$ has to be built again:`,
    },
    { tex: `T_j = T_{j-1} + 1 + \\frac{${r - 1}}{${r}}T_j` },
    { tex: `T_j = ${r}(T_{j-1} + 1)` },
    { tex: `T_1 = ${r}` },
  ];
  let t = r;
  for (let j = 2; j <= p.N; j += 1) {
    steps.push({ tex: `T_{${j}} = ${r} \\times (${t} + 1) = ${r * (t + 1)}` });
    t = r * (t + 1);
  }
  return steps;
}

const cmApStreak: Generator<StreakParams> = {
  id: 'cm-ap-streak',
  sample(rng, difficulty) {
    return difficulty >= 2 ? sampleStreak(rng, 3, 4, 6) : sampleStreak(rng, 2, 3, 4);
  },
  render(p) {
    const e = UNIT_EVENTS[p.ev];
    return typed([say(streakSetup(p)), say(`What is the expected number of ${e.nouns}, counting the last one?`)], streakTotal(p), 'E =');
  },
  choices(p) {
    const r = rOf(UNIT_EVENTS[p.ev]);
    return numberOptions(streakTotal(p), [r ** p.N, p.N * r, r ** p.N + r ** (p.N - 1) + r]);
  },
  solution: streakSolution,
};

const cmApStreakTable: Generator<StreakParams> = {
  id: 'cm-ap-streak-table',
  sample(rng, difficulty) {
    return difficulty >= 2 ? sampleStreak(rng, 3, 4, 6) : sampleStreak(rng, 2, 3, 6);
  },
  render(p): Slide {
    const e = UNIT_EVENTS[p.ev];
    const r = rOf(e);
    const terms = streakTerms(p);
    const answer = terms.map((_, j) => terms.slice(j).reduce((t, x) => t + x, 0));
    return {
      kind: 'table',
      prompt: [
        say(streakSetup(p)),
        say(`Write $E_j$ for the expected number of ${e.nouns} still needed when the run so far is $j$ long. Fill in the table.`),
      ],
      columns: ['j', 'E_j'],
      rows: answer.map((_, j) => [`${j}`, null]),
      bank: numberBank(answer, [r ** (p.N + 1), p.N * r, answer[0] + r, r ** p.N - r, 2 * r ** p.N], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution(p) {
    const terms = streakTerms(p);
    const steps = streakSolution(p);
    steps.push({ text: 'So the whole run takes the sum of the steps, and a run already $j$ long has only the later steps still to come:' });
    for (let j = 0; j < terms.length; j += 1) {
      const rest = terms.slice(j);
      steps.push({ tex: `E_{${j}} = ${rest.length > 1 ? `${rest.join(' + ')} = ` : ''}${rest.reduce((t, x) => t + x, 0)}` });
    }
    return steps;
  },
};

/* ---------- patterns: a success then a failure, and a race ---------- */

interface PatternParams {
  ev: number;
  /** 'sf' / 'fs': expected wait for the pattern. 'ana' / 'ben': the race, asking for that player. */
  kind: 'sf' | 'fs' | 'ana' | 'ben';
  /** In the race, true when Ana holds "two in a row". */
  anaDouble: boolean;
}

function patternAnswer({ ev, kind, anaDouble }: PatternParams): Frac {
  const e = EVENTS[ev];
  if (kind === 'sf' || kind === 'fs') return red([e.m * e.m, e.k * (e.m - e.k)]);
  const double = pow(pOf(e), 2);
  const askDouble = (kind === 'ana') === anaDouble;
  return askDouble ? double : sub(ONE, double);
}

const cmApPattern: Generator<PatternParams> = {
  id: 'cm-ap-pattern',
  sample(rng, difficulty) {
    const ev = rng.int(0, EVENTS.length - 1);
    if (difficulty < 2) return { ev, kind: rng.pick(['sf', 'fs'] as const), anaDouble: false };
    return { ev, kind: rng.pick(['ana', 'ben'] as const), anaDouble: rng.chance(0.5) };
  },
  render(p) {
    const e = EVENTS[p.ev];
    if (p.kind === 'sf' || p.kind === 'fs') {
      const pattern = p.kind === 'sf' ? `${e.yes} is followed straight away by ${e.no}` : `${e.no} is followed straight away by ${e.yes}`;
      return typedMean([say(`${e.device} is ${e.verb} until ${pattern}.`), say(`What is the expected number of ${e.nouns}, counting the last one?`)], patternAnswer(p));
    }
    const double = `${e.yes} comes up twice in a row`;
    const after = `${e.no} is followed straight away by ${e.yes}`;
    const [ana, ben] = p.anaDouble ? [double, after] : [after, double];
    return typedProb(
      [say(`${e.device} is ${e.verb} again and again. Ana wins as soon as ${ana}; Ben wins as soon as ${ben}.`), say(`What is the probability that ${p.kind === 'ana' ? 'Ana' : 'Ben'} wins?`)],
      patternAnswer(p),
    );
  },
  choices(p) {
    const e = EVENTS[p.ev];
    const { k, m } = e;
    const right = patternAnswer(p);
    if (p.kind === 'sf' || p.kind === 'fs') {
      const first = p.kind === 'sf' ? k : m - k;
      return meanOptions(right, [[m * m, first * first], [m + first, first], [m, first], [2 * m * m, k * (m - k)]]);
    }
    const pp = pOf(e);
    return probOptions(right, [[1, 2], pp, sub(ONE, pp), sub(ONE, right)]);
  },
  solution(p) {
    const e = EVENTS[p.ev];
    const pp = pOf(e);
    if (p.kind === 'sf' || p.kind === 'fs') {
      const [first, second] = p.kind === 'sf' ? [pp, sub(ONE, pp)] : [sub(ONE, pp), pp];
      const [a, b] = p.kind === 'sf' ? [e.yes, e.no] : [e.no, e.yes];
      return [
        { text: `Nothing is lost once ${a} has come up: every ${e.noun} after it is either ${a} again, which keeps you in the same place, or ${b}, which finishes. So wait for ${a}, then wait for ${b}:` },
        { tex: `E = ${ftex(div(ONE, first))} + ${ftex(div(ONE, second))} = ${ftex(patternAnswer(p))}` },
      ];
    }
    const doubler = p.anaDouble ? 'Ana' : 'Ben';
    const double = pow(pp, 2);
    const steps: SolutionStep[] = [
      {
        text: `Once ${e.no} has come up, ${doubler} can no longer win: ${doubler} needs ${e.yes} straight after ${e.yes}, but the next time ${e.yes} comes up it completes the other pattern first. So ${doubler} wins only if the first two ${e.nouns} both give ${e.yes}:`,
      },
      { tex: `P(\\text{${doubler}}) = \\left(${ftex(pp)}\\right)^2 = ${ftex(double)}` },
    ];
    if (!sameFrac(patternAnswer(p), double)) steps.push({ tex: `P(\\text{${doubler === 'Ana' ? 'Ben' : 'Ana'}}) = 1 - ${ftex(double)} = ${ftex(patternAnswer(p))}` });
    return steps;
  },
};

function sameFrac(a: Frac, b: Frac): boolean {
  return a[0] * b[1] === b[0] * a[1];
}

/* ---------- the gambler's ruin: steps in a ratio ---------- */

type Bias = 'fair' | 'up2' | 'up3' | 'down2' | 'down3';

const BIAS_P: Record<Bias, Frac> = { fair: [1, 2], up2: [2, 3], up3: [3, 4], down2: [1, 3], down3: [1, 4] };

interface RuinParams {
  story: number;
  N: number;
  k: number;
  bias: Bias;
}

/** The sizes of the N steps from P_0 = 0 to P_N = 1, in proportion. */
function ruinWeights({ N, bias }: RuinParams): number[] {
  if (bias === 'fair') return Array.from({ length: N }, () => 1);
  const s = bias.endsWith('3') ? 3 : 2;
  return Array.from({ length: N }, (_, i) => (bias.startsWith('up') ? s ** (N - 1 - i) : s ** i));
}

function ruinAnswer(p: RuinParams): Frac {
  const w = ruinWeights(p);
  const total = w.reduce((t, x) => t + x, 0);
  return red([w.slice(0, p.k).reduce((t, x) => t + x, 0), total]);
}

const RUIN_NAMES = ['Ana', 'Eve', 'Hana', 'Kit'];

const cmApRuin: Generator<RuinParams> = {
  id: 'cm-ap-ruin',
  sample(rng, difficulty) {
    const story = rng.int(0, 1 + RUIN_NAMES.length - 1);
    if (difficulty < 2) {
      for (;;) {
        const N = rng.int(4, 10);
        const k = rng.int(1, N - 1);
        if (2 * k === N) continue;
        return { story, N, k, bias: 'fair' };
      }
    }
    const N = rng.int(3, 6);
    return { story, N, k: rng.int(1, N - 1), bias: rng.pick(['up2', 'up3', 'down2', 'down3'] as const) };
  },
  render(p) {
    const pr = tf(BIAS_P[p.bias]);
    if (p.story === 0) {
      return typedProb(
        [
          say(`A counter starts on square ${p.k} of a track numbered 0 to ${p.N}. Each turn it moves one square up with probability $${pr}$, and one square down otherwise. It stops when it reaches 0 or ${p.N}.`),
          say(`What is the probability that it reaches ${p.N}?`),
        ],
        ruinAnswer(p),
      );
    }
    const name = RUIN_NAMES[p.story - 1];
    return typedProb(
      [
        say(`${name} has £${p.k} and bets £1 at a time, winning each bet with probability $${pr}$. She stops when she has £${p.N} or nothing.`),
        say(`What is the probability that she reaches £${p.N}?`),
      ],
      ruinAnswer(p),
    );
  },
  choices(p) {
    const right = ruinAnswer(p);
    const pp = BIAS_P[p.bias];
    const slips: Frac[] = p.bias === 'fair' ? [[1, 2], [p.N - p.k, p.N], pow(pp, p.N - p.k)] : [[p.k, p.N], pow(pp, p.N - p.k), [1, 2]];
    slips.push(sub(ONE, right));
    return probOptions(right, slips);
  },
  solution(p) {
    const pp = BIAS_P[p.bias];
    const qq = sub(ONE, pp);
    const unit = p.story === 0 ? 'square $j$' : '£$j$';
    const steps: SolutionStep[] = [
      { text: `Write $P_j$ for the chance of reaching ${p.story === 0 ? p.N : `£${p.N}`} from ${unit}, so $P_0 = 0$ and $P_{${p.N}} = 1$. One step goes up or down:` },
      { tex: `P_j = ${ftex(pp)}P_{j+1} + ${ftex(qq)}P_{j-1}` },
    ];
    if (p.bias === 'fair') {
      steps.push(
        { text: `So each $P_j$ is halfway between its neighbours: the $P_j$ climb in ${p.N} equal steps from 0 to 1.` },
        { tex: `P_{${p.k}} = ${rawThenLowest([p.k, p.N])}` },
      );
      return steps;
    }
    const w = ruinWeights(p);
    const total = w.reduce((t, x) => t + x, 0);
    const part = w.slice(0, p.k).reduce((t, x) => t + x, 0);
    const ratio = div(qq, pp);
    steps.push(
      { text: 'Split $P_j$ as $' + `${ftex(pp)}P_j + ${ftex(qq)}P_j` + '$ and rearrange:' },
      { tex: `${ftex(pp)}(P_{j+1} - P_j) = ${ftex(qq)}(P_j - P_{j-1})` },
      { text: `Each step up the ladder of $P_j$ is $${ftex(ratio)}$ times the one before, so the ${p.N} steps from 0 to 1 are in the ratio` },
      { tex: w.join(' : ') },
      { text: `and $P_{${p.k}}$ is the first ${p.k} of them over all ${p.N}:` },
      { tex: `P_{${p.k}} = ${rawThenLowest([part, total])}` },
    );
    return steps;
  },
};

export const contestAdvancedProbabilityGenerators = [
  cmApGeomSquare,
  cmApBirthday,
  cmApDiceMax,
  cmApDiceMaxTable,
  cmApTestBayes,
  cmApTestTable,
  cmApCoinBag,
  cmApCondPair,
  cmApEvTable,
  cmApEvMissing,
  cmApEvMax,
  cmApEvRespin,
  cmApWait,
  cmApFirstToWin,
  cmApLandOn,
  cmApLandTable,
  cmApDrawSum,
  cmApDistinct,
  cmApAdjacent,
  cmApAdjacentTiles,
  cmApStreak,
  cmApStreakTable,
  cmApPattern,
  cmApRuin,
];
