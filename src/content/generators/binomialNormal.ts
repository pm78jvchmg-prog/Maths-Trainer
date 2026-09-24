/**
 * Binomial and Normal Distributions (roadmap C18).
 *
 * Level 1 is the binomial distribution: when a binomial model applies,
 * P(X = r) from its three factors, the probability table and P(X <= r), the
 * complement for "at least" and the rest, and the mean np and variance
 * np(1 - p). Level 2 is the normal distribution: the curve and the
 * 68-95-99.7 rule, standardising, a probability from Phi, working back from a
 * probability, and finding mu or sigma from one known probability. Level 3
 * finds both: why one probability leaves a line of pairs, two probabilities
 * written as x = mu + z sigma, eliminating mu to get sigma and then mu, equal
 * tails putting mu at the midpoint, a proportion in context, and putting the
 * pair back to check it or to find a new probability. Level 3's values sit at
 * a table z (x whole) or a percentage point (x to two places), and every pair
 * of statements is refused unless its two z differ by at least a half. Level 4
 * is the normal approximation to the binomial: why a long binomial sum is
 * worth replacing and how the bars make a bell near p = 0.5, when np and
 * n(1 - p) are large enough, the matching N(np, np(1 - p)), the continuity
 * correction, and the whole route to a probability from quoted Phi. Level 5
 * combines independent normals: aX + b, then X + Y and X - Y (means add or
 * subtract, variances always add), aX + bY in general, a total of n copies
 * against one copy multiplied by n, and a probability from the combination,
 * P(X > Y) among them. Level 5 builds every combination from a Pythagorean
 * triple, so its variance is a perfect square and sigma is whole.
 *
 * Nothing here is calculus, so no slide declares `source` or `integrand`;
 * `binomialNormal.test.ts` is the independent check.
 *
 * Three rules hold everywhere in this file.
 *
 * - Every typed answer is an exact decimal. A binomial p is a tenth (or a
 *   half) and n runs from 3 to 6 wherever a probability is computed, so
 *   P(X = r) has at most n decimal places and `fmt` keeps it whole; draws are
 *   still refused unless `terminates` agrees. A fraction p (a dice, a
 *   guessed answer) only ever reaches a `tiles` or `choice` slide.
 * - Normal probabilities are read from Phi, never worked out behind the
 *   learner's back: the prompt quotes every Phi value the question needs,
 *   and the answer is one of them, its complement, or a difference of two.
 *   The quoted values are Phi to four places, from the series in `phi`,
 *   which `binomialNormal.test.ts` checks against Simpson's rule. mu is
 *   whole, sigma is drawn from `SIGMAS`, and z is refused unless it has at
 *   most two decimal places, so z, x and every answer terminate. Level 4
 *   draws n and p from `SQUARE_PAIRS`, whose variance is a square, and
 *   refuses a corrected boundary whose z has more than two places.
 * - The checker compares values (PITFALLS 3.4), so a form (the three
 *   factors of P(X = r), which cumulative probability, the standardising
 *   equation) goes through `tiles`, `flow` or `choice`. Only the number that
 *   comes out is typed.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { nCr } from './binomialExpansion';
import { fmt } from './numericalMethods';
import { fracTex, stepBank, tokenBank } from './parametricImplicit';
import { canonicalSet } from '../numberLine';

/* ================================================================
 * Shared helpers
 * ================================================================ */

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });

/** Sums and products of tenths carry float dust; this wipes it. */
const clean = (value: number): number => Number(value.toFixed(10));

/** Whether a value is an exact decimal of at most `dp` places. */
export function terminates(value: number, dp = 6): boolean {
  const scaled = value * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** Decimal places in a written value. */
const places = (text: string): number => (text.includes('.') ? text.length - text.indexOf('.') - 1 : 0);

/** Lines stacked on their `&`. */
const aligned = (...lines: string[]): string => `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;

/** A sum worked over short lines (one term, or two small ones), so it never runs off a phone. */
function sumTex(label: string, terms: string[], total: string): string {
  const lines = [`${label} &= ${terms[0]}`];
  for (let i = 1; i < terms.length; ) {
    const take = i + 1 < terms.length && terms[i].length + terms[i + 1].length <= 8 ? 2 : 1;
    lines.push(`&\\quad + ${terms.slice(i, i + take).join(' + ')}`);
    i += take;
  }
  return aligned(...lines, `&= ${total}`);
}

/** Items turned by a hash of `key`, so the right one is not always first. */
function turned<T>(items: T[], key: string): T[] {
  const turn = hashSeed(key) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/**
 * A native choice slide, turned by a hash of its labels so the answer is not
 * always first yet one question renders one way (PITFALLS 3.10).
 */
function choiceSlide(prompt: Block[], opts: ChoiceOption[], tex = true): Slide {
  const ordered = turned(opts, opts.map((o) => o.tex).join('|'));
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/**
 * Options for a decimal answer: the slips given, then near misses one unit
 * in the last place either side. Probabilities keep `positive` so no slip
 * below zero is offered.
 */
function decimalChoices(correct: number, wrong: number[], positive = true): ChoiceOption[] {
  const right = fmt(correct);
  const seen = new Set([right]);
  const picked: string[] = [];
  const add = (value: number) => {
    const text = fmt(value);
    if (picked.length >= 3 || !Number.isFinite(value) || (positive && value <= 0) || seen.has(text)) return;
    seen.add(text);
    picked.push(text);
  };
  wrong.forEach(add);
  const unit = 10 ** -Math.max(1, places(right));
  for (let k = 1; picked.length < 3 && k < 50; k += 1) {
    add(correct + k * unit);
    add(correct - k * unit);
  }
  const asOption = (text: string) => ({ tex: text, answer: text });
  return options(asOption(right), ...picked.map(asOption));
}

/**
 * A bank of decimals for a tree or a table: the answer as a multiset, then
 * distinct slips, then values one unit in the last place either side, until
 * `spare` distractors are left. Sorted, never shuffled.
 */
function decimalBank(answer: string[], slips: number[], spare = 3, positive = true): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  const add = (value: number) => {
    const text = fmt(value);
    if (extras.length >= spare || !Number.isFinite(value) || (positive && value <= 0)) return;
    if (needed.has(text) || extras.includes(text)) return;
    extras.push(text);
  };
  slips.forEach(add);
  for (let k = 1; extras.length < spare && k < 50; k += 1) {
    for (const token of answer) {
      const unit = 10 ** -places(token);
      add(Number(token) + k * unit);
      add(Number(token) - k * unit);
    }
  }
  return [...answer, ...extras].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
}

/** A number as a factor, bracketed when negative. */
const paren = (value: number): string => (value < 0 ? `(${fmt(value)})` : fmt(value));

/* ================================================================
 * The binomial distribution
 * ================================================================ */

const TENTHS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

/** 1 - p, without the dust. */
const comp = (p: number): number => clean(1 - p);

/** P(X = r) for X ~ B(n, p). */
export function pmf(n: number, p: number, r: number): number {
  if (r < 0 || r > n) return 0;
  return clean(nCr(n, r) * p ** r * comp(p) ** (n - r));
}

/** P(X <= r) for X ~ B(n, p). */
export function cdf(n: number, p: number, r: number): number {
  let total = 0;
  for (let k = 0; k <= Math.min(r, n); k += 1) total += pmf(n, p, k);
  return clean(total);
}

/** `0.3^{2}`, or `0.3` for a first power: the one spelling every tile uses. */
const powTex = (base: number, k: number): string => (k === 1 ? fmt(base) : `${fmt(base)}^{${k}}`);

const binomTex = (n: number, r: number): string => `\\tbinom{${n}}{${r}}`;

const bTex = (n: number, p: number): string => `X \\sim B(${n}, ${fmt(p)})`;

/** A setting for a count of successes, in plain words with the numbers in. */
interface Setting {
  setup: (n: number, p: number) => string;
  success: string;
  failure: string;
}

const SETTINGS: Setting[] = [
  {
    setup: (n, p) => `${n} seeds are planted, and each germinates with probability $${fmt(p)}$, independently of the others.`,
    success: 'the number that germinate',
    failure: 'the number that do not germinate',
  },
  {
    setup: (n, p) => `A player takes ${n} free throws, scoring each with probability $${fmt(p)}$, independently.`,
    success: 'the number of throws scored',
    failure: 'the number of throws missed',
  },
  {
    setup: (n, p) => `A machine makes bolts, each faulty with probability $${fmt(p)}$, independently. A sample of ${n} is checked.`,
    success: 'the number of faulty bolts in the sample',
    failure: 'the number of bolts in the sample that are not faulty',
  },
  {
    setup: (n, p) => `A spinner lands on red with probability $${fmt(p)}$. It is spun ${n} times.`,
    success: 'the number of times it lands on red',
    failure: 'the number of times it does not land on red',
  },
  {
    setup: (n, p) => `A bus is late with probability $${fmt(p)}$ each day, independently, and it runs on ${n} days.`,
    success: 'the number of days it is late',
    failure: 'the number of days it is on time',
  },
  {
    setup: (n, p) => `An archer shoots ${n} arrows, each hitting the target with probability $${fmt(p)}$, independently.`,
    success: 'the number of hits',
    failure: 'the number of misses',
  },
  {
    setup: (n, p) => `Each of ${n} patients recovers from an illness with probability $${fmt(p)}$, independently.`,
    success: 'the number who recover',
    failure: 'the number who do not recover',
  },
  {
    setup: (n, p) => `A goalkeeper faces ${n} penalties and saves each with probability $${fmt(p)}$, independently.`,
    success: 'the number saved',
    failure: 'the number of goals scored against them',
  },
];

/** The sentence a binomial question opens with. */
const settingText = (setting: number, n: number, p: number): string =>
  `${SETTINGS[setting].setup(n, p)} $X$ is ${SETTINGS[setting].success}.`;

/* ---------- Level 1, lesson 1: when a binomial model applies ---------- */

type Condition = 'fixed' | 'two' | 'const' | 'indep';

const CONDITION_WORDS: Record<Condition, string> = {
  fixed: 'A fixed number of trials',
  two: 'Only two outcomes on each trial',
  const: 'The same chance of success each time',
  indep: 'Trials independent of each other',
};

/** A setting that breaks one of the four conditions, with the reason why. */
interface Failing {
  fails: Condition;
  text: (n: number, p: number, k: number) => string;
  why: string;
  /** Breaks two conditions at once, so only a flow (which stops at the first) may ask it. */
  flowOnly?: boolean;
}

const FAILING: Failing[] = [
  {
    fails: 'fixed',
    text: (_n, p) => `A player takes free throws until the first miss, scoring each with probability $${fmt(p)}$. $X$ is the number of throws taken.`,
    why: 'The throws go on until a miss, so the number of trials is not fixed in advance.',
  },
  {
    fails: 'fixed',
    text: (_n, p, k) => `A spinner lands on red with probability $${fmt(p)}$. It is spun until it has landed on red ${k} times. $X$ is the number of spins.`,
    why: 'The spinning stops when a target is reached, so the number of trials is not fixed in advance.',
  },
  {
    fails: 'fixed',
    text: (n, p) => `A machine makes bolts until it has made ${n} faulty ones, each bolt faulty with probability $${fmt(p)}$. $X$ is the number of bolts made.`,
    why: 'The machine stops when it reaches a count of faulty bolts, so the number of trials is not fixed in advance.',
  },
  {
    fails: 'two',
    text: (n) => `A fair dice is rolled ${n} times. $X$ is the total of the scores.`,
    why: 'Each roll has six outcomes that all count towards $X$, not just a success or a failure.',
  },
  {
    fails: 'two',
    text: (n, _p, k) => `A spinner with ${k + 3} equal sectors, numbered 1 to ${k + 3}, is spun ${n} times. $X$ is the sum of the numbers.`,
    why: 'Every sector adds its own amount to $X$, so a spin is not just a success or a failure.',
  },
  {
    fails: 'const',
    text: (n, p) => `A player takes ${n} free throws. The chance of scoring the first is $${fmt(p)}$, and it rises by $0.05$ after every throw. $X$ is the number scored.`,
    why: 'The chance of success changes from one throw to the next.',
  },
  {
    fails: 'const',
    text: (n, p) => `A new machine makes ${n} bolts. The first is faulty with probability $${fmt(p)}$, and as the machine wears each bolt is more likely to be faulty than the one before. $X$ is the number of faulty bolts.`,
    why: 'The chance of a faulty bolt grows as the machine wears, so it is not the same each time.',
  },
  {
    fails: 'const',
    text: (n, _p, k) => `Counters are taken one at a time, without replacement, from a bag of ${k + 3} red and ${n + 2} blue counters. ${n} are taken. $X$ is the number of red counters.`,
    why: 'Without replacement, each counter taken changes the chance that the next is red.',
    flowOnly: true,
  },
  {
    fails: 'indep',
    text: (n) => `${n} houses on one street are checked after a storm. $X$ is the number that flooded.`,
    why: 'Houses on one street flood or stay dry together, so one result tells you about the others.',
  },
  {
    fails: 'indep',
    text: (n, p) => `${n} friends each go to a concert with probability $${fmt(p)}$, but they always decide together as a group. $X$ is the number who go.`,
    why: 'The friends decide together, so one going tells you the others will go too.',
  },
  {
    fails: 'indep',
    text: (n) => `A string of ${n + 10} fairy lights is wired so that if one bulb fails, every bulb on it goes dark. $X$ is the number of bulbs that are not lit.`,
    why: 'One bulb failing puts out the rest, so the bulbs are not independent.',
  },
];

const ORDER: Condition[] = ['fixed', 'two', 'const', 'indep'];

interface ConditionsParams {
  /** An index into `FAILING`, or -1 for a genuine binomial setting. */
  failing: number;
  setting: number;
  n: number;
  p: number;
  k: number;
}

function conditionsText({ failing, setting, n, p, k }: ConditionsParams): string {
  return failing < 0 ? settingText(setting, n, p) : FAILING[failing].text(n, p, k);
}

function sampleConditions(rng: Rng, difficulty: number, flow: boolean): ConditionsParams {
  const pool = FAILING.map((_, i) => i).filter((i) => flow || !FAILING[i].flowOnly);
  const binomial = flow && rng.chance(difficulty > 1 ? 0.3 : 0.45);
  return {
    failing: binomial ? -1 : rng.pick(pool),
    setting: rng.int(0, SETTINGS.length - 1),
    n: rng.int(4, 12),
    p: rng.pick(TENTHS),
    k: rng.int(2, 4),
  };
}

function conditionsSolution(params: ConditionsParams): SolutionStep[] {
  if (params.failing < 0) {
    return [
      { text: `There are ${params.n} trials, fixed in advance, and each is a success or a failure.` },
      { text: `The chance of success is $${fmt(params.p)}$ every time, and the trials are independent.` },
      { text: `All four hold, so $${bTex(params.n, params.p)}$.` },
    ];
  }
  const failing = FAILING[params.failing];
  const at = ORDER.indexOf(failing.fails);
  return [
    ...(at > 0 ? [{ text: `${ORDER.slice(0, at).map((c) => CONDITION_WORDS[c]).join(', ')}: ${at === 1 ? 'that holds' : 'those hold'}.` }] : []),
    { text: `${CONDITION_WORDS[failing.fails]}: no. ${failing.why}` },
    { text: 'So a binomial model does not fit.' },
  ];
}

const conditionsFlow: Generator<ConditionsParams> = {
  id: 'dist-binomial-conditions-flow',
  sample: (rng, difficulty) => sampleConditions(rng, difficulty, true),
  render: (params): Slide => {
    const fails = params.failing < 0 ? undefined : FAILING[params.failing].fails;
    const no = (words: string) => ({ label: 'No', outcome: `Not binomial: ${words}` });
    const key = conditionsText(params);
    const fork = (id: string, ask: string, onward: { label: string; to?: string; outcome?: string }, noWords: string) => ({
      id,
      ask,
      branches: turned([{ ...onward, label: 'Yes' }, no(noWords)], `${key}${id}`),
    });
    const upTo = fails ? ORDER.indexOf(fails) : 3;
    return {
      kind: 'flow',
      prompt: [say(`${key} Decide whether $X$ can be modelled by a binomial distribution.`)],
      subject: 'X \\sim B(n, p)\\,?',
      steps: [
        fork('fixed', 'Is there a fixed number of trials?', { label: 'Yes', to: 'two' }, 'the number of trials is not fixed.'),
        fork('two', 'Does each trial end in just a success or a failure?', { label: 'Yes', to: 'const' }, 'a trial has more than two outcomes.'),
        fork('const', 'Is the chance of success the same on every trial?', { label: 'Yes', to: 'indep' }, 'the chance of success changes.'),
        fork('indep', 'Are the trials independent of each other?', { label: 'Yes', outcome: 'All four conditions hold, so $X$ is binomial.' }, 'the trials affect each other.'),
      ],
      answer: fails ? [...ORDER.slice(0, upTo).map(() => 'Yes'), 'No'] : ['Yes', 'Yes', 'Yes', 'Yes'],
    };
  },
  solution: conditionsSolution,
};

const conditionsChoice: Generator<ConditionsParams> = {
  id: 'dist-binomial-which-fails',
  sample: (rng, difficulty) => sampleConditions(rng, difficulty, false),
  render: (params): Slide => {
    const fails = FAILING[params.failing].fails;
    return choiceSlide(
      [say(`${conditionsText(params)} This is not a binomial setting. Which condition fails?`)],
      options(
        { tex: CONDITION_WORDS[fails] },
        ...ORDER.filter((c) => c !== fails).map((c) => ({ tex: CONDITION_WORDS[c] })),
      ),
      false,
    );
  },
  solution: conditionsSolution,
};

/** A probability as [top, bottom]; tenths are written as decimals. */
type Chance = [number, number];

const chanceTex = ([top, bottom]: Chance): string => (bottom === 10 ? fmt(top / 10) : fracTex(top, bottom));

interface NameParams {
  /** Index into `SETTINGS`, or -1 for a dice, -2 for a guessed quiz. */
  setting: number;
  n: number;
  chance: Chance;
  /** X counts the failures rather than the successes. */
  failures: boolean;
}

function nameText({ setting, n, chance, failures }: NameParams): string {
  if (setting === -1) {
    return `A fair dice is rolled ${n} times. $X$ is the number of rolls that ${failures ? 'are not a six' : 'land on six'}.`;
  }
  if (setting === -2) {
    return `A quiz has ${n} questions, each with ${chance[1]} options, and every answer is a guess. $X$ is the number of answers that are ${failures ? 'wrong' : 'right'}.`;
  }
  const s = SETTINGS[setting];
  return `${s.setup(n, chance[0] / 10)} $X$ is ${failures ? s.failure : s.success}.`;
}

/** The chance X counts, which is the failure chance when X counts failures. */
const counted = ({ chance: [top, bottom], failures }: NameParams): Chance => (failures ? [bottom - top, bottom] : [top, bottom]);

const binomialName: Generator<NameParams> = {
  id: 'dist-binomial-name',
  sample: (rng, difficulty) => {
    const n = rng.int(4, 20);
    const failures = difficulty > 1 && rng.chance(0.5);
    const kind = rng.int(0, 9);
    if (kind === 0) return { setting: -1, n, chance: [1, 6], failures };
    if (kind === 1) return { setting: -2, n, chance: [1, rng.pick([3, 4, 5])], failures };
    const top = rng.pick([1, 2, 3, 4, 6, 7, 8, 9]);
    return { setting: rng.int(0, SETTINGS.length - 1), n, chance: [top, 10], failures };
  },
  render: (params): Slide => {
    const [top, bottom] = counted(params);
    const right = chanceTex([top, bottom]);
    const other = chanceTex([bottom - top, bottom]);
    const extras = [other, String(params.n + 1), String(params.n - 1)];
    if (bottom !== 10) extras.push(fracTex(1, bottom + 1), String(bottom));
    return {
      kind: 'tiles',
      prompt: [say(`${nameText(params)} Write down the distribution of $X$.`)],
      template: 'X \\sim B({0}, {1})',
      bank: tokenBank([String(params.n), right], extras),
      answer: [String(params.n), right],
    };
  },
  solution: (params) => {
    const [top, bottom] = counted(params);
    return [
      { text: `There are $n = ${params.n}$ trials.` },
      {
        text: params.failures
          ? `$X$ counts the failures, so its "success" on each trial is a failure, with probability $1 - ${chanceTex([bottom - top, bottom])} = ${chanceTex([top, bottom])}$.`
          : `The chance that one trial counts towards $X$ is $${chanceTex([top, bottom])}$.`,
      },
      { tex: `X \\sim B(${params.n}, ${chanceTex([top, bottom])})` },
    ];
  },
};

interface TrialsParams {
  ask: 'n' | 'p';
  kind: number;
  a: number;
  b: number;
  p: number;
}

const GROUPS = [
  (a: number, b: number, p: number) => `A gardener plants ${a} rows of ${b} seeds, and each seed germinates with probability $${fmt(p)}$, independently. $X$ is the number that germinate.`,
  (a: number, b: number, p: number) => `A shop receives ${a} boxes of ${b} eggs, and each egg is cracked with probability $${fmt(p)}$, independently. $X$ is the number of cracked eggs.`,
  (a: number, b: number, p: number) => `A player takes ${b} penalties in each of ${a} matches, scoring each with probability $${fmt(p)}$, independently. $X$ is the number scored.`,
  (a: number, b: number, p: number) => `${a} classes of ${b} pupils each sit a test, and each pupil passes with probability $${fmt(p)}$, independently. $X$ is the number who pass.`,
];

const RATES = [
  (n: number, a: number) => `A spinner has 10 equal sectors, and ${a} of them are red. It is spun ${n} times. $X$ is the number of reds.`,
  (n: number, a: number) => `${a * 5}% of the bolts a machine makes are faulty. A sample of ${n} bolts is checked. $X$ is the number that are faulty.`,
  (n: number, a: number) => `A bag holds ${a} red and ${20 - a} blue counters. A counter is taken and put back, ${n} times. $X$ is the number of reds.`,
];

const trialsP = ({ kind, a }: TrialsParams): number => clean(kind === 0 ? a / 10 : kind === 1 ? (a * 5) / 100 : a / 20);

const binomialTrials: Generator<TrialsParams> = {
  id: 'dist-trials',
  sample: (rng, difficulty) => {
    const ask = difficulty > 1 && rng.chance(0.6) ? 'p' : 'n';
    if (ask === 'n') {
      return { ask, kind: rng.int(0, GROUPS.length - 1), a: rng.int(3, 9), b: rng.int(3, 12), p: rng.pick(TENTHS) };
    }
    const kind = rng.int(0, RATES.length - 1);
    const a = kind === 0 ? rng.int(1, 9) : rng.int(1, 19);
    return { ask, kind, a, b: rng.int(5, 30), p: 0 };
  },
  render: (params): Slide => {
    if (params.ask === 'n') {
      return {
        kind: 'expression',
        prompt: [say(`${GROUPS[params.kind](params.a, params.b, params.p)} So $X \\sim B(n, ${fmt(params.p)})$. Find $n$.`)],
        lead: 'n =',
        keypad: [],
        answer: String(params.a * params.b),
        domain: 'real',
        mode: 'exact',
      };
    }
    return {
      kind: 'expression',
      prompt: [say(`${RATES[params.kind](params.b, params.a)} So $X \\sim B(${params.b}, p)$. Find $p$ as a decimal.`)],
      lead: 'p =',
      keypad: [],
      answer: fmt(trialsP(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    if (params.ask === 'n') {
      return [
        { text: 'Every one of the items is a trial, so count them all.' },
        { tex: `n = ${params.a} \\times ${params.b} = ${params.a * params.b}` },
      ];
    }
    const p = trialsP(params);
    const why =
      params.kind === 0
        ? `$${params.a}$ of the $10$ equal sectors are red: $\\frac{${params.a}}{10} = ${fmt(p)}$.`
        : params.kind === 1
          ? `$${params.a * 5}\\%$ is $\\frac{${params.a * 5}}{100} = ${fmt(p)}$.`
          : `$${params.a}$ of the $20$ counters are red, and putting each back keeps it that way: $\\frac{${params.a}}{20} = ${fmt(p)}$.`;
    return [{ text: why }, { tex: `p = ${fmt(p)}` }];
  },
};

/* ---------- Level 1, lesson 2: P(X = r) ---------- */

interface PointParams {
  n: number;
  p: number;
  r: number;
  setting: number;
}

/** n, p and r with P(X = r) exact and not vanishingly small. */
function samplePoint(rng: Rng, difficulty: number, avoidHalf = false): PointParams {
  for (;;) {
    const n = difficulty > 1 ? rng.int(4, 6) : rng.int(3, 5);
    const p = rng.pick(TENTHS);
    if (avoidHalf && p === 0.5) continue;
    const r = rng.int(1, n - 1);
    const value = pmf(n, p, r);
    if (value < 0.001 || !terminates(value)) continue;
    return { n, p, r, setting: rng.int(0, SETTINGS.length - 1) };
  }
}

function pointSolution({ n, p, r }: PointParams): SolutionStep[] {
  const q = comp(p);
  return [
    { text: `$${r}$ success${r === 1 ? '' : 'es'} and $${n - r}$ failure${n - r === 1 ? '' : 's'}, in any of $\\tbinom{${n}}{${r}}$ orders.` },
    {
      tex: aligned(
        `& P(X = ${r})`,
        `&= ${binomTex(n, r)} \\times ${powTex(p, r)} \\times ${powTex(q, n - r)}`,
        `&= ${nCr(n, r)} \\times ${fmt(p ** r)} \\times ${fmt(q ** (n - r))}`,
        `&= ${fmt(pmf(n, p, r))}`,
      ),
    },
  ];
}

const pointFactors: Generator<PointParams> = {
  id: 'dist-pmf-factors',
  sample: (rng, difficulty) => samplePoint(rng, difficulty),
  render: ({ n, p, r }): Slide => {
    const q = comp(p);
    const answer = [String(nCr(n, r)), fmt(p ** r), fmt(q ** (n - r)), fmt(pmf(n, p, r))];
    const slips = [nCr(n, r + 1), nCr(n, r - 1), p ** (n - r), q ** r, p * r, clean(p ** r * q ** (n - r)), pmf(n, p, r + 1)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${bTex(n, p)}$. Work out $P(X = ${r})$ from its three factors. Top row, left to right: $${binomTex(n, r)}$, then $${powTex(p, r)}$, then $${powTex(q, n - r)}$. Underneath, their product.`,
        ),
      ],
      expression: aligned(`& P(X = ${r})`, `&= ${binomTex(n, r)} \\times ${powTex(p, r)} \\times ${powTex(q, n - r)}`),
      nodes: [
        { id: 'c', from: [] },
        { id: 'a', from: [] },
        { id: 'b', from: [] },
        { id: 'P', from: ['c', 'a', 'b'] },
      ],
      bank: decimalBank(answer, slips),
      answer,
    };
  },
  solution: pointSolution,
};

const pointValue: Generator<PointParams> = {
  id: 'dist-pmf',
  sample: (rng, difficulty) => samplePoint(rng, difficulty),
  render: (params): Slide => {
    const { n, p, r, setting } = params;
    return {
      kind: 'expression',
      prompt: [
        say(
          `${settingText(setting, n, p)} So $${bTex(n, p)}$. Find the probability that $X$ is exactly $${r}$.`,
        ),
      ],
      lead: `P(X = ${r}) =`,
      keypad: [],
      answer: fmt(pmf(n, p, r)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: pointSolution,
  choices: ({ n, p, r }) => {
    const q = comp(p);
    return decimalChoices(pmf(n, p, r), [
      clean(p ** r * q ** (n - r)),
      clean(nCr(n, r) * p ** (n - r) * q ** r),
      cdf(n, p, r),
      comp(pmf(n, p, r)),
    ]);
  },
};

const pointForm: Generator<PointParams> = {
  id: 'dist-pmf-form',
  sample: (rng, difficulty) => samplePoint(rng, difficulty, true),
  render: ({ n, p, r }): Slide => {
    const q = comp(p);
    const answer = [binomTex(n, r), powTex(p, r), powTex(q, n - r)];
    const extras = [powTex(p, n - r), powTex(q, r), powTex(p, n), powTex(q, n)];
    for (const other of [r + 1, r - 1]) {
      if (other >= 0 && other <= n && nCr(n, other) !== nCr(n, r)) extras.unshift(binomTex(n, other));
    }
    return {
      kind: 'tiles',
      prompt: [
        say(
          `$${bTex(n, p)}$. Build $P(X = ${r})$: first the number of orders, then the chance of the successes, then the chance of the failures.`,
        ),
      ],
      template: `P(X = ${r}) = {0} \\times {1} \\times {2}`,
      bank: tokenBank(answer, extras, 4),
      answer,
    };
  },
  solution: pointSolution,
};

const pointWorking: Generator<PointParams> = {
  id: 'dist-pmf-working',
  sample: (rng, difficulty) => samplePoint(rng, difficulty),
  render: ({ n, p, r }): Slide => {
    const q = comp(p);
    const c = nCr(n, r);
    const a = clean(p ** r);
    const b = clean(q ** (n - r));
    const ca = clean(c * a);
    const value = pmf(n, p, r);
    return {
      kind: 'steps',
      prompt: [
        say(`$${bTex(n, p)}$. Work out $P(X = ${r})$ one piece at a time: tap the part to do next, then choose what it comes to.`),
      ],
      start: [binomTex(n, r), '\\times', powTex(p, r), '\\times', powTex(q, n - r)],
      reductions: [
        { span: [0, 1], value: String(c), bank: stepBank(String(c), String(nCr(n, r + 1) || n), String(n * r), String(c + 1)) },
        { span: [2, 3], value: fmt(a), bank: stepBank(fmt(a), fmt(p * r), fmt(clean(a * 10)), fmt(q ** r)) },
        { span: [4, 5], value: fmt(b), bank: stepBank(fmt(b), fmt(q * (n - r)), fmt(clean(b * 10)), fmt(p ** (n - r))) },
        { span: [0, 3], operator: 1, value: fmt(ca), bank: stepBank(fmt(ca), fmt(clean(c + a)), fmt(clean(ca * 10)), fmt(clean(ca / 10))) },
        { span: [0, 3], operator: 1, value: fmt(value), bank: stepBank(fmt(value), fmt(clean(ca + b)), fmt(clean(value * 10)), fmt(clean(a * b))) },
      ],
    };
  },
  solution: pointSolution,
};

/* ---------- Level 1, lesson 3: the table and P(X <= r) ---------- */

interface TableParams {
  n: number;
  p: number;
  /** Rows whose P(X = r) is blank. */
  blanks: number[];
  /** Rows whose P(X <= r) is blank, when that column is shown. */
  cumBlanks: number[];
}

const tableFill: Generator<TableParams> = {
  id: 'dist-table-fill',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = difficulty > 1 ? rng.int(3, 4) : rng.int(3, 5);
      const p = rng.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
      const rows = Array.from({ length: n + 1 }, (_, r) => r);
      if (rows.some((r) => !terminates(pmf(n, p, r)))) continue;
      if (difficulty > 1) {
        const blanks = rng.sample(rows, 2).sort((a, b) => a - b);
        const cumBlanks = rng.sample(rows.slice(1, n), 2).sort((a, b) => a - b);
        return { n, p, blanks, cumBlanks };
      }
      return { n, p, blanks: rng.sample(rows, n > 3 ? 3 : 2).sort((a, b) => a - b), cumBlanks: [] };
    }
  },
  render: ({ n, p, blanks, cumBlanks }): Slide => {
    const cum = cumBlanks.length > 0;
    const rows: (string | null)[][] = [];
    const answer: string[] = [];
    for (let r = 0; r <= n; r += 1) {
      const row: (string | null)[] = [String(r)];
      const point = fmt(pmf(n, p, r));
      if (blanks.includes(r)) {
        row.push(null);
        answer.push(point);
      } else row.push(point);
      if (cum) {
        const upTo = fmt(cdf(n, p, r));
        if (cumBlanks.includes(r)) {
          row.push(null);
          answer.push(upTo);
        } else row.push(upTo);
      }
      rows.push(row);
    }
    const slips = blanks.flatMap((r) => [pmf(n, p, n - r), comp(pmf(n, p, r)), cdf(n, p, r)]);
    return {
      kind: 'table',
      prompt: [
        say(
          cum
            ? `$${bTex(n, p)}$. Fill in the gaps in the table: each $P(X = r)$ from the formula, each $P(X \\le r)$ as a running total.`
            : `$${bTex(n, p)}$. Fill in the gaps in its probability table.`,
        ),
      ],
      columns: cum ? ['r', 'P(X = r)', 'P(X \\le r)'] : ['r', 'P(X = r)'],
      rows,
      bank: decimalBank(answer, slips),
      answer,
    };
  },
  solution: ({ n, p, blanks, cumBlanks }) => {
    const q = comp(p);
    const steps: SolutionStep[] = blanks.map((r) => ({
      tex: aligned(
        `& P(X = ${r})`,
        `&= ${binomTex(n, r)} \\times ${r === 0 ? '1' : powTex(p, r)} \\times ${r === n ? '1' : powTex(q, n - r)}`,
        `&= ${fmt(pmf(n, p, r))}`,
      ),
    }));
    for (const r of cumBlanks) {
      steps.push({ text: `$P(X \\le ${r})$ is the total down to $r = ${r}$: $P(X \\le ${r - 1}) + P(X = ${r}) = ${fmt(cdf(n, p, r))}$.` });
    }
    return steps;
  },
};

interface CumulativeParams {
  n: number;
  p: number;
  r: number;
  /** Asked as P(X < r + 1) rather than P(X <= r). */
  strict: boolean;
  setting: number;
}

function sampleCumulative(rng: Rng, difficulty: number, maxR = 3): CumulativeParams {
  for (;;) {
    const n = rng.int(3, 5);
    const p = rng.pick(TENTHS);
    const r = rng.int(1, Math.min(n - 1, maxR));
    const value = cdf(n, p, r);
    if (!terminates(value) || value < 0.001 || value > 0.999) continue;
    return { n, p, r, strict: difficulty > 1 && rng.chance(0.5), setting: rng.int(0, SETTINGS.length - 1) };
  }
}

const cumulativeLabel = ({ r, strict }: CumulativeParams): string => (strict ? `P(X < ${r + 1})` : `P(X \\le ${r})`);

function cumulativeSolution(params: CumulativeParams): SolutionStep[] {
  const { n, p, r, strict } = params;
  const terms = Array.from({ length: r + 1 }, (_, k) => fmt(pmf(n, p, k)));
  return [
    ...(strict ? [{ text: `Fewer than $${r + 1}$ means $${r}$ or fewer: $P(X < ${r + 1}) = P(X \\le ${r})$.` }] : []),
    { text: `Add $P(X = r)$ for $r = 0$ up to $${r}$.` },
    { tex: sumTex(`P(X \\le ${r})`, terms, fmt(cdf(n, p, r))) },
  ];
}

const cumulative: Generator<CumulativeParams> = {
  id: 'dist-cumulative',
  sample: (rng, difficulty) => sampleCumulative(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`${settingText(params.setting, params.n, params.p)} So $${bTex(params.n, params.p)}$. Find $${cumulativeLabel(params)}$.`)],
    lead: `${cumulativeLabel(params)} =`,
    keypad: [],
    answer: fmt(cdf(params.n, params.p, params.r)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: cumulativeSolution,
  choices: ({ n, p, r }) =>
    decimalChoices(cdf(n, p, r), [cdf(n, p, r - 1), pmf(n, p, r), comp(cdf(n, p, r)), cdf(n, p, r + 1)]),
};

const cumulativeParts: Generator<CumulativeParams> = {
  id: 'dist-cumulative-parts',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleCumulative(rng, difficulty, 2);
      if (params.r === 2) return params;
    }
  },
  render: (params): Slide => {
    const { n, p } = params;
    const parts = [0, 1, 2].map((k) => fmt(pmf(n, p, k)));
    const answer = [...parts, fmt(cdf(n, p, 2))];
    const slips = [pmf(n, p, 3), cdf(n, p, 1), comp(cdf(n, p, 2)), comp(pmf(n, p, 0)), clean(p ** 2)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${bTex(n, p)}$. Find $${cumulativeLabel(params)}$. Top row, left to right: $P(X = 0)$, $P(X = 1)$ and $P(X = 2)$. Underneath, their total.`,
        ),
      ],
      expression: aligned(`& ${cumulativeLabel(params)}`, '&= P(X = 0) + P(X = 1)', '&\\quad + P(X = 2)'),
      nodes: [
        { id: 'p0', from: [] },
        { id: 'p1', from: [] },
        { id: 'p2', from: [] },
        { id: 'sum', from: ['p0', 'p1', 'p2'] },
      ],
      bank: decimalBank(answer, slips),
      answer,
    };
  },
  solution: cumulativeSolution,
};

interface MissingParams {
  n: number;
  p: number;
  missing: number;
}

/** A probability table stacked in two columns, so it never runs off a phone. */
function probabilityTable(rows: [string, string][]): string {
  const body = rows.map(([r, value]) => `${r} & ${value}`).join(' \\\\ ');
  return `\\begin{array}{c|c} r & P(X = r) \\\\ \\hline ${body} \\end{array}`;
}

const tableMissing: Generator<MissingParams> = {
  id: 'dist-table-missing',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = difficulty > 1 ? rng.int(4, 5) : rng.int(3, 4);
      const p = rng.pick([0.2, 0.3, 0.4, 0.6, 0.7, 0.8]);
      const missing = rng.int(0, n);
      if (!terminates(pmf(n, p, missing)) || pmf(n, p, missing) < 0.001) continue;
      return { n, p, missing };
    }
  },
  render: ({ n, p, missing }): Slide => ({
    kind: 'expression',
    prompt: [
      say('The table shows the probability distribution of $X$, with one value missing. Find it.'),
      show(probabilityTable(Array.from({ length: n + 1 }, (_, r) => [String(r), r === missing ? '?' : fmt(pmf(n, p, r))]))),
    ],
    lead: `P(X = ${missing}) =`,
    keypad: [],
    answer: fmt(pmf(n, p, missing)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, p, missing }) => {
    const known = Array.from({ length: n + 1 }, (_, r) => r).filter((r) => r !== missing);
    const total = clean(known.reduce((acc, r) => acc + pmf(n, p, r), 0));
    return [
      { text: 'The probabilities in a table always add up to $1$.' },
      { tex: sumTex('\\text{The rest}', known.map((r) => fmt(pmf(n, p, r))), fmt(total)) },
      { tex: aligned(`P(X = ${missing}) &= 1 - ${fmt(total)}`, `&= ${fmt(pmf(n, p, missing))}`) },
    ];
  },
};

/* ---------- Level 1, lesson 4: at least, at most, between ---------- */

type Relation = 'lt' | 'le' | 'gt' | 'ge';

const PHRASES: { words: (k: number) => string; rel: Relation }[] = [
  { words: (k) => `at least ${k}`, rel: 'ge' },
  { words: (k) => `more than ${k}`, rel: 'gt' },
  { words: (k) => `at most ${k}`, rel: 'le' },
  { words: (k) => `fewer than ${k}`, rel: 'lt' },
  { words: (k) => `no more than ${k}`, rel: 'le' },
  { words: (k) => `no fewer than ${k}`, rel: 'ge' },
];

const RELATION_TEX: Record<Relation, string> = { lt: '<', le: '\\le', gt: '>', ge: '\\ge' };

/** The cumulative form of an event: `1 - ` or not, and the value inside P(X <= .). */
function cumulativeOf(rel: Relation, k: number): { complement: boolean; upTo: number } {
  switch (rel) {
    case 'lt':
      return { complement: false, upTo: k - 1 };
    case 'le':
      return { complement: false, upTo: k };
    case 'gt':
      return { complement: true, upTo: k };
    case 'ge':
      return { complement: true, upTo: k - 1 };
  }
}

const cumTex = (complement: boolean, upTo: number): string => `${complement ? '1 - ' : ''}P(X \\le ${upTo})`;

interface WhichParams {
  n: number;
  p: number;
  k: number;
  phrase: number;
  setting: number;
}

function whichSolution({ k, phrase }: WhichParams): SolutionStep[] {
  const { words, rel } = PHRASES[phrase];
  const { complement, upTo } = cumulativeOf(rel, k);
  return [
    { text: `"${words(k)}" is $X ${RELATION_TEX[rel]} ${k}$.` },
    complement
      ? { text: `That is the top of the distribution, so take what is left after $X \\le ${upTo}$: $${cumTex(true, upTo)}$.` }
      : { text: `That runs from $0$ up to $${upTo}$ inclusive: $${cumTex(false, upTo)}$.` },
  ];
}

const whichCumulative: Generator<WhichParams> = {
  id: 'dist-which-cumulative',
  sample: (rng) => {
    const n = rng.int(6, 15);
    return { n, p: rng.pick(TENTHS), k: rng.int(2, n - 2), phrase: rng.int(0, PHRASES.length - 1), setting: rng.int(0, SETTINGS.length - 1) };
  },
  render: (params): Slide => {
    const { n, p, k, phrase, setting } = params;
    const key = `${n}|${k}|${phrase}`;
    const { rel } = PHRASES[phrase];
    const { complement, upTo } = cumulativeOf(rel, k);
    const forms: [boolean, number][] = [
      [false, k - 1],
      [false, k],
      [true, k - 1],
      [true, k],
    ];
    return {
      kind: 'flow',
      prompt: [say(`${settingText(setting, n, p)} You want the probability that $X$ is ${PHRASES[phrase].words(k)}.`)],
      subject: bTex(n, p),
      steps: [
        {
          id: 'ineq',
          ask: 'Write the event as an inequality.',
          branches: turned((['lt', 'le', 'gt', 'ge'] as Relation[]).map((r) => ({ label: `$X ${RELATION_TEX[r]} ${k}$`, to: 'cum' })), key),
        },
        {
          id: 'cum',
          ask: 'Which cumulative probability gives it?',
          branches: turned(
            forms.map(([c, u]) => ({ label: `$${cumTex(c, u)}$`, outcome: `So the probability is $${cumTex(c, u)}$.` })),
            `${key}c`,
          ),
        },
      ],
      answer: [`$X ${RELATION_TEX[rel]} ${k}$`, `$${cumTex(complement, upTo)}$`],
    };
  },
  solution: whichSolution,
};

const atLeast: Generator<WhichParams> = {
  id: 'dist-at-least',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = rng.int(4, 6);
      const p = rng.pick(TENTHS);
      const phrase = difficulty > 1 ? rng.int(0, PHRASES.length - 1) : rng.pick([0, 5]);
      const k = rng.int(1, difficulty > 1 ? 3 : 2);
      const { rel } = PHRASES[phrase];
      if (rel === 'lt' && k < 2) continue;
      const params = { n, p, k, phrase, setting: rng.int(0, SETTINGS.length - 1) };
      const value = atLeastValue(params);
      if (!terminates(value) || value < 0.001 || value > 0.999) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { n, p, k, phrase, setting } = params;
    const { rel } = PHRASES[phrase];
    return {
      kind: 'expression',
      prompt: [say(`${settingText(setting, n, p)} So $${bTex(n, p)}$. Find the probability that $X$ is ${PHRASES[phrase].words(k)}.`)],
      lead: `P(X ${RELATION_TEX[rel]} ${k}) =`,
      keypad: [],
      answer: fmt(atLeastValue(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { n, p, k, phrase } = params;
    const { complement, upTo } = cumulativeOf(PHRASES[phrase].rel, k);
    const terms = Array.from({ length: upTo + 1 }, (_, r) => fmt(pmf(n, p, r)));
    return [
      ...whichSolution(params),
      { tex: sumTex(`P(X \\le ${upTo})`, terms, fmt(cdf(n, p, upTo))) },
      ...(complement ? [{ tex: `1 - ${fmt(cdf(n, p, upTo))} = ${fmt(atLeastValue(params))}` }] : []),
    ];
  },
  choices: (params) => {
    const { n, p, k, phrase } = params;
    const { complement, upTo } = cumulativeOf(PHRASES[phrase].rel, k);
    const value = atLeastValue(params);
    return decimalChoices(value, [
      complement ? cdf(n, p, upTo) : comp(cdf(n, p, upTo)),
      complement ? comp(cdf(n, p, upTo + 1)) : cdf(n, p, upTo + 1),
      complement ? comp(cdf(n, p, upTo - 1)) : cdf(n, p, upTo - 1),
      pmf(n, p, k),
    ]);
  },
};

function atLeastValue({ n, p, k, phrase }: WhichParams): number {
  const { complement, upTo } = cumulativeOf(PHRASES[phrase].rel, k);
  return complement ? comp(cdf(n, p, upTo)) : cdf(n, p, upTo);
}

interface WorkingParams {
  n: number;
  p: number;
  k: 1 | 2;
}

const atLeastWorking: Generator<WorkingParams> = {
  id: 'dist-at-least-working',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = rng.int(3, 6);
      const p = rng.pick(TENTHS);
      const k: 1 | 2 = difficulty > 1 || rng.chance(0.4) ? 2 : 1;
      const value = comp(cdf(n, p, k - 1));
      if (!terminates(value) || value < 0.001 || value > 0.999) continue;
      return { n, p, k };
    }
  },
  render: ({ n, p, k }): Slide => {
    const q = comp(p);
    const zero = pmf(n, p, 0);
    const one = pmf(n, p, 1);
    const first = comp(zero);
    const prompt = [
      say(
        `$${bTex(n, p)}$. Work out $P(X \\ge ${k})$ as $1 - P(X = 0)${k === 2 ? ' - P(X = 1)' : ''}$: tap the part to do next, then choose what it comes to.`,
      ),
    ];
    if (k === 1) {
      return {
        kind: 'steps',
        prompt,
        start: ['1', '-', powTex(q, n)],
        reductions: [
          { span: [2, 3], value: fmt(zero), bank: stepBank(fmt(zero), fmt(q * n), fmt(p ** n), fmt(clean(zero * 10))) },
          { span: [0, 3], operator: 1, value: fmt(first), bank: stepBank(fmt(first), fmt(zero), fmt(clean(1 + zero)), fmt(comp(p ** n))) },
        ],
      };
    }
    const value = clean(first - one);
    return {
      kind: 'steps',
      prompt,
      start: ['1', '-', powTex(q, n), '-', `${n} \\times ${fmt(p)} \\times ${powTex(q, n - 1)}`],
      reductions: [
        { span: [2, 3], value: fmt(zero), bank: stepBank(fmt(zero), fmt(q * n), fmt(p ** n), fmt(clean(zero * 10))) },
        { span: [4, 5], value: fmt(one), bank: stepBank(fmt(one), fmt(clean(p * q ** (n - 1))), fmt(clean(n * p * q)), fmt(clean(one * 10))) },
        { span: [0, 3], operator: 1, value: fmt(first), bank: stepBank(fmt(first), fmt(clean(1 + zero)), fmt(comp(one)), fmt(comp(p ** n))) },
        { span: [0, 3], operator: 1, value: fmt(value), bank: stepBank(fmt(value), fmt(clean(first + one)), fmt(comp(one)), fmt(clean(value * 10))) },
      ],
    };
  },
  solution: ({ n, p, k }) => {
    const q = comp(p);
    const steps: SolutionStep[] = [
      { text: `"At least ${k}" is everything except ${k === 1 ? '$X = 0$' : '$X = 0$ and $X = 1$'}.` },
      { tex: aligned(`P(X = 0) &= ${powTex(q, n)}`, `&= ${fmt(pmf(n, p, 0))}`) },
    ];
    if (k === 2) steps.push({ tex: aligned(`& P(X = 1)`, `&= ${n} \\times ${fmt(p)} \\times ${powTex(q, n - 1)}`, `&= ${fmt(pmf(n, p, 1))}`) });
    steps.push({ tex: `P(X \\ge ${k}) = ${fmt(comp(cdf(n, p, k - 1)))}` });
    return steps;
  },
};

type Between = 'ii' | 'ei' | 'ie' | 'ee';

const BETWEEN_WORDS: Record<Between, (a: number, b: number) => string> = {
  ii: (a, b) => `between ${a} and ${b} inclusive`,
  ei: (a, b) => `more than ${a} but at most ${b}`,
  ie: (a, b) => `at least ${a} but fewer than ${b}`,
  ee: (a, b) => `more than ${a} but fewer than ${b}`,
};

const BETWEEN_TEX: Record<Between, (a: number, b: number) => string> = {
  ii: (a, b) => `P(${a} \\le X \\le ${b})`,
  ei: (a, b) => `P(${a} < X \\le ${b})`,
  ie: (a, b) => `P(${a} \\le X < ${b})`,
  ee: (a, b) => `P(${a} < X < ${b})`,
};

interface BetweenParams {
  n: number;
  p: number;
  a: number;
  b: number;
  form: Between;
  words: boolean;
}

/** The two cumulative values whose difference is the event. */
function betweenParts({ a, b, form }: BetweenParams): [number, number] {
  const hi = form === 'ii' || form === 'ei' ? b : b - 1;
  const lo = form === 'ii' || form === 'ie' ? a - 1 : a;
  return [hi, lo];
}

const betweenForm: Generator<BetweenParams> = {
  id: 'dist-between-form',
  sample: (rng, difficulty) => {
    const n = rng.int(8, 20);
    const a = rng.int(2, n - 5);
    const b = rng.int(a + 2, n - 1);
    return { n, p: rng.pick(TENTHS), a, b, form: rng.pick<Between>(['ii', 'ei', 'ie', 'ee']), words: difficulty > 1 };
  },
  render: (params): Slide => {
    const { n, p, a, b, form, words } = params;
    const [hi, lo] = betweenParts(params);
    const label = (h: number, l: number) => `P(X \\le ${h}) - P(X \\le ${l})`;
    return choiceSlide(
      [
        say(
          words
            ? `$${bTex(n, p)}$. Which gives the probability that $X$ is ${BETWEEN_WORDS[form](a, b)}?`
            : `$${bTex(n, p)}$. Which gives $${BETWEEN_TEX[form](a, b)}$?`,
        ),
      ],
      options(
        { tex: label(hi, lo) },
        ...[b, b - 1].flatMap((h) => [a, a - 1].map((l) => ({ tex: label(h, l) }))),
      ),
    );
  },
  solution: (params) => {
    const { a, b, form } = params;
    const [hi, lo] = betweenParts(params);
    return [
      { text: `The event is $${BETWEEN_TEX[form](a, b)}$: the values from $${lo + 1}$ to $${hi}$.` },
      { text: `$P(X \\le ${hi})$ counts everything up to $${hi}$; take away everything up to $${lo}$, which is below the event.` },
      { tex: aligned(`& ${BETWEEN_TEX[form](a, b)}`, `&= P(X \\le ${hi})`, `&\\quad - P(X \\le ${lo})`) },
    ];
  },
};

/* ---------- Level 1, lesson 5: mean and variance ---------- */

interface MomentParams {
  n: number;
  p: number;
  ask: 'mean' | 'var';
}

function sampleMoments(rng: Rng, difficulty: number): MomentParams {
  for (;;) {
    const n = difficulty > 1 ? rng.int(12, 80) : rng.int(5, 40);
    const p = rng.pick(TENTHS);
    const ask = difficulty > 1 && rng.chance(0.65) ? 'var' : rng.chance(0.3) ? 'var' : 'mean';
    if (!terminates(n * p, 2)) continue;
    return { n, p, ask };
  }
}

const meanOf = ({ n, p }: { n: number; p: number }): number => clean(n * p);
const varOf = ({ n, p }: { n: number; p: number }): number => clean(n * p * comp(p));

function momentSolution({ n, p, ask }: MomentParams): SolutionStep[] {
  const q = comp(p);
  if (ask === 'mean') return [{ text: 'The mean of $B(n, p)$ is $np$.' }, { tex: `E(X) = ${n} \\times ${fmt(p)} = ${fmt(meanOf({ n, p }))}` }];
  return [
    { text: 'The variance of $B(n, p)$ is $np(1 - p)$.' },
    { tex: aligned(`\\mathrm{Var}(X) &= ${n} \\times ${fmt(p)} \\times ${fmt(q)}`, `&= ${fmt(varOf({ n, p }))}`) },
  ];
}

const moments: Generator<MomentParams> = {
  id: 'dist-mean-variance',
  sample: sampleMoments,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`$${bTex(params.n, params.p)}$. Find its ${params.ask === 'mean' ? 'mean' : 'variance'}.`)],
    lead: params.ask === 'mean' ? 'E(X) =' : '\\mathrm{Var}(X) =',
    keypad: [],
    answer: fmt(params.ask === 'mean' ? meanOf(params) : varOf(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: momentSolution,
  choices: (params) => {
    const { n, p } = params;
    const q = comp(p);
    return params.ask === 'mean'
      ? decimalChoices(meanOf(params), [clean(n * q), varOf(params), clean(n + p)])
      : decimalChoices(varOf(params), [meanOf(params), clean(n * p * p), clean(n * p * q * q)]);
  },
};

const momentForm: Generator<MomentParams> = {
  id: 'dist-mean-form',
  sample: (rng, difficulty) => ({ ...sampleMoments(rng, difficulty), ask: difficulty > 1 ? 'var' : 'mean' }),
  render: (params): Slide => {
    const { n, p, ask } = params;
    const q = comp(p);
    if (ask === 'mean') {
      const answer = [String(n), fmt(p), fmt(meanOf(params))];
      return {
        kind: 'tiles',
        prompt: [say(`$${bTex(n, p)}$. Fill in its mean: $n$, then $p$, then the value.`)],
        template: 'E(X) = {0} \\times {1} = {2}',
        bank: tokenBank(answer, [fmt(q), fmt(varOf(params)), fmt(clean(n * q)), String(n + 1)]),
        answer,
      };
    }
    const answer = [String(n), fmt(p), fmt(q), fmt(varOf(params))];
    return {
      kind: 'tiles',
      prompt: [say(`$${bTex(n, p)}$. Fill in its variance: $n$, then $p$, then $1 - p$, then the value.`)],
      template: '\\mathrm{Var}(X) = {0} \\times {1} \\times {2} = {3}',
      bank: tokenBank(answer, [fmt(meanOf(params)), fmt(clean(n * p * p)), fmt(clean(p * q)), String(n - 1)]),
      answer,
    };
  },
  solution: momentSolution,
};

const spreadParts: Generator<MomentParams> = {
  id: 'dist-spread-parts',
  sample: (rng, difficulty) => ({ ...sampleMoments(rng, difficulty), ask: 'var' }),
  render: (params): Slide => {
    const { n, p } = params;
    const q = comp(p);
    const answer = [fmt(meanOf(params)), fmt(q), fmt(varOf(params))];
    const slips = [clean(n * q), clean(n * p * p), clean(meanOf(params) - q), clean(p * q), clean(varOf(params) * 10)];
    return {
      kind: 'tree',
      prompt: [
        say(`$${bTex(n, p)}$. Top row: the mean $np$, then $1 - p$. Underneath: the variance, $np(1 - p)$.`),
      ],
      expression: '\\mathrm{Var}(X) = np \\times (1 - p)',
      nodes: [
        { id: 'mean', from: [] },
        { id: 'q', from: [] },
        { id: 'var', from: ['mean', 'q'] },
      ],
      bank: decimalBank(answer, slips),
      answer,
    };
  },
  solution: (params) => [
    { tex: aligned(`E(X) &= np = ${params.n} \\times ${fmt(params.p)}`, `&= ${fmt(meanOf(params))}`) },
    { tex: `1 - p = ${fmt(comp(params.p))}` },
    { tex: aligned(`\\mathrm{Var}(X) &= ${fmt(meanOf(params))} \\times ${fmt(comp(params.p))}`, `&= ${fmt(varOf(params))}`) },
  ],
};

interface FromMomentsParams {
  n: number;
  p: number;
  ask: 'n' | 'p';
}

const fromMoments: Generator<FromMomentsParams> = {
  id: 'dist-from-moments',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = rng.int(5, 60);
      const p = rng.pick(TENTHS);
      if (!terminates(n * p, 1)) continue;
      return { n, p, ask: difficulty > 1 ? 'n' : 'p' };
    }
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `$X \\sim B(n, p)$ has mean $${fmt(meanOf(params))}$ and variance $${fmt(varOf(params))}$. Find $${params.ask}$.`,
      ),
    ],
    lead: `${params.ask} =`,
    keypad: [],
    answer: params.ask === 'n' ? String(params.n) : fmt(params.p),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const m = fmt(meanOf(params));
    const v = fmt(varOf(params));
    const steps: SolutionStep[] = [
      { text: `Divide the variance by the mean: $\\frac{np(1 - p)}{np} = 1 - p$.` },
      { tex: aligned(`1 - p &= \\frac{${v}}{${m}} = ${fmt(comp(params.p))}`, `p &= ${fmt(params.p)}`) },
    ];
    if (params.ask === 'n') steps.push({ tex: `n = \\frac{${m}}{${fmt(params.p)}} = ${params.n}` });
    return steps;
  },
};

interface MatchParams {
  n: number;
  p: number;
}

/** Binomial distributions that share the mean or the variance with B(n, p), but not both. */
function lookalikes({ n, p }: MatchParams): [number, number][] {
  const mean = meanOf({ n, p });
  const variance = varOf({ n, p });
  const out: [number, number][] = [];
  const add = (m: number, q: number) => {
    if (!Number.isInteger(m) || m < 2 || q <= 0 || q >= 1) return;
    if (meanOf({ n: m, p: q }) === mean && varOf({ n: m, p: q }) === variance) return;
    if (out.some(([a, b]) => a === m && b === q)) return;
    out.push([m, clean(q)]);
  };
  add(n, comp(p));
  for (const other of TENTHS) add(clean(mean / other), other);
  add(n + 10, p);
  add(Math.max(2, n - 5), p);
  return out;
}

const matchMoments: Generator<MatchParams> = {
  id: 'dist-match-moments',
  sample: (rng) => {
    for (;;) {
      const n = rng.int(6, 50);
      const p = rng.pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]);
      if (!terminates(n * p, 1)) continue;
      return { n, p };
    }
  },
  render: (params): Slide => {
    const others = lookalikes(params);
    const pick = [others[0], ...others.slice(1).sort((a, b) => hashSeed(`${a}`) - hashSeed(`${b}`))].slice(0, 3);
    return choiceSlide(
      [say(`$X$ has a binomial distribution with mean $${fmt(meanOf(params))}$ and variance $${fmt(varOf(params))}$. Which is it?`)],
      options({ tex: `B(${params.n}, ${fmt(params.p)})` }, ...pick.map(([m, q]) => ({ tex: `B(${m}, ${fmt(q)})` }))),
    );
  },
  solution: (params) => [
    { text: 'The mean is $np$ and the variance $np(1 - p)$, so the variance over the mean is $1 - p$.' },
    { tex: aligned(`1 - p &= \\frac{${fmt(varOf(params))}}{${fmt(meanOf(params))}} = ${fmt(comp(params.p))}`, `p &= ${fmt(params.p)}`) },
    { tex: `n = \\frac{${fmt(meanOf(params))}}{${fmt(params.p)}} = ${params.n}` },
  ],
};

/* ================================================================
 * The normal distribution
 * ================================================================ */

/** Standard deviations a question may use: every whole x then gives a z of at most two places. */
export const SIGMAS = [2, 4, 5, 8, 10, 20, 25, 50];

/** erf by its Maclaurin series, which is exact in doubles for the |x| < 2.2 used here. */
function erf(x: number): number {
  let sum = 0;
  let power = x;
  let factorial = 1;
  for (let k = 0; k < 60; k += 1) {
    if (k > 0) {
      power *= -x * x;
      factorial *= k;
    }
    sum += power / (factorial * (2 * k + 1));
  }
  return (2 / Math.sqrt(Math.PI)) * sum;
}

/** Phi(z) to four places, as a table prints it. Only ever quoted for z > 0. */
export function phi(z: number): number {
  return Number((0.5 * (1 + erf(z / Math.SQRT2))).toFixed(4));
}

/** P(X < x) read from the table: Phi(z) above the mean, 1 - Phi(|z|) below it. */
const below = (z: number): number => (z >= 0 ? phi(z) : clean(1 - phi(-z)));

/** The percentage points quoted wherever a question works back from a probability. */
export const CRITICAL = [
  { z: 1.645, tail: 0.05 },
  { z: 1.96, tail: 0.025 },
  { z: 2.326, tail: 0.01 },
  { z: 2.576, tail: 0.005 },
];

const CRITICAL_TABLE =
  '\\begin{array}{c|c} \\Phi(z) & z \\\\ \\hline 0.95 & 1.645 \\\\ 0.975 & 1.96 \\\\ 0.99 & 2.326 \\\\ 0.995 & 2.576 \\end{array}';

const MEASURES = [
  { what: 'The mass of a bag of flour', unit: 'grams' },
  { what: 'The time taken to finish a puzzle', unit: 'seconds' },
  { what: 'The height of a sunflower', unit: 'cm' },
  { what: 'The lifetime of a light bulb', unit: 'hours' },
  { what: 'The length of a phone call', unit: 'seconds' },
  { what: 'The mark on a test', unit: 'marks' },
];

const nTex = (mu: number | string, sigma: number): string => `X \\sim N(${mu}, ${sigma * sigma})`;

/** The sentence a normal question opens with: in words, or in N(mu, sigma^2). */
function measureText(measure: number, mu: number, sigma: number, words: boolean): string {
  const { what, unit } = MEASURES[measure];
  return words
    ? `${what}, in ${unit}, is normally distributed with mean $${mu}$ and standard deviation $${sigma}$.`
    : `${what}, in ${unit}, is $${nTex(mu, sigma)}$.`;
}

const density = (mu: number, sigma: number) => (x: number) =>
  Math.exp(-(((x - mu) / sigma) ** 2) / 2) / (sigma * Math.sqrt(2 * Math.PI));

/** A normal curve over [xMin, xMax], with an optional shaded stretch and vertical lines. */
export function normalSvg(
  mu: number,
  sigma: number,
  opts: { xMin: number; xMax: number; shade?: [number, number]; verticals?: number[]; label: string },
): string {
  const f = density(mu, sigma);
  return plotSvg({
    xMin: opts.xMin,
    xMax: opts.xMax,
    yMin: 0,
    yMax: 1.15 * f(mu),
    curves: [{ f }],
    shade: opts.shade && { f, from: opts.shade[0], to: opts.shade[1] },
    verticals: (opts.verticals ?? []).map((x) => ({ x })),
    label: opts.label,
  });
}

/** A whole mean well clear of zero for this sigma. */
const drawMu = (rng: Rng, sigma: number): number => sigma * rng.int(4, 8) + rng.int(0, 20);

/** A whole distance k from the mean whose z = k / sigma has at most two places. */
function drawK(rng: Rng, sigma: number, maxZ = 2.5, sign?: number): number {
  for (;;) {
    const k = rng.int(1, Math.floor(maxZ * sigma)) * (sign ?? rng.sign());
    if (terminates(k / sigma, 2)) return k;
  }
}

/* ---------- Level 2, lesson 1: the curve and the 68-95-99.7 rule ---------- */

/** Percentage below mu + k sigma, by the 68-95-99.7 rule. */
const RULE_BELOW: Record<number, number> = { [-3]: 0.15, [-2]: 2.5, [-1]: 16, 0: 50, 1: 84, 2: 97.5, 3: 99.85 };

const RULE_TARGETS = [
  { k: 1, words: 'about 84% of values lie below it' },
  { k: -1, words: 'about 16% of values lie below it' },
  { k: 2, words: 'about 97.5% of values lie below it' },
  { k: -2, words: 'about 2.5% of values lie below it' },
  { k: 3, words: 'about 99.85% of values lie below it' },
  { k: -3, words: 'about 0.15% of values lie below it' },
  { k: 1, words: 'about 16% of values lie above it' },
  { k: -1, words: 'about 84% of values lie above it' },
  { k: 2, words: 'about 2.5% of values lie above it' },
  { k: -2, words: 'about 97.5% of values lie above it' },
];

interface RuleSliderParams {
  measure: number;
  mu: number;
  sigma: number;
  target: number;
}

const ruleSlider: Generator<RuleSliderParams> = {
  id: 'dist-rule-slider',
  sample: (rng, difficulty) => {
    const sigma = rng.pick(SIGMAS);
    return {
      measure: rng.int(0, MEASURES.length - 1),
      mu: drawMu(rng, sigma),
      sigma,
      target: rng.int(0, difficulty > 1 ? RULE_TARGETS.length - 1 : 5),
    };
  },
  render: ({ measure, mu, sigma, target }): Slide => {
    const min = mu - 4 * sigma;
    const max = mu + 4 * sigma;
    const window = markerWindow(min, max);
    return {
      kind: 'slider',
      prompt: [
        say(
          `${measureText(measure, mu, sigma, true)} The shaded middle, within one standard deviation of the mean, holds about 68% of values. Slide the line to the value where ${RULE_TARGETS[target].words}.`,
        ),
      ],
      min,
      max,
      step: sigma / 2,
      answer: mu + RULE_TARGETS[target].k * sigma,
      readout: 'x = {v}',
      figure: {
        svg: normalSvg(mu, sigma, {
          xMin: window.xMin,
          xMax: window.xMax,
          shade: [mu - sigma, mu + sigma],
          verticals: [mu - sigma, mu + sigma],
          label: 'A normal curve with the middle 68 percent, within one standard deviation of the mean, shaded',
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: ({ mu, sigma, target }) => {
    const { k, words } = RULE_TARGETS[target];
    const x = mu + k * sigma;
    return [
      { text: `68% within $1$ standard deviation, 95% within $2$ and 99.7% within $3$; the rest splits equally between the two tails.` },
      { text: `So ${RULE_BELOW[k]}% of values lie below $\\mu ${k < 0 ? '-' : '+'} ${Math.abs(k) === 1 ? '' : Math.abs(k)}\\sigma$, which is where ${words}.` },
      { tex: `${mu} ${k < 0 ? '-' : '+'} ${Math.abs(k)} \\times ${sigma} = ${x}` },
    ];
  },
};

interface RulePercentParams {
  measure: number;
  mu: number;
  sigma: number;
  form: 'between' | 'above' | 'below';
  a: number;
  b: number;
}

function rulePercent({ form, a, b }: RulePercentParams): number {
  if (form === 'above') return clean(100 - RULE_BELOW[a]);
  if (form === 'below') return RULE_BELOW[b];
  return clean(RULE_BELOW[b] - RULE_BELOW[a]);
}

const rulePercentGen: Generator<RulePercentParams> = {
  id: 'dist-rule-percent',
  sample: (rng, difficulty) => {
    const sigma = rng.pick(SIGMAS);
    const reach = difficulty > 1 ? 3 : 2;
    const form = difficulty > 1 ? rng.pick<RulePercentParams['form']>(['between', 'between', 'above', 'below']) : 'between';
    for (;;) {
      const a = rng.int(-reach, reach);
      const b = rng.int(-reach, reach);
      if (form === 'between' && a >= b) continue;
      if (form === 'above' && a === 0) continue;
      if (form === 'below' && b === 0) continue;
      return { measure: rng.int(0, MEASURES.length - 1), mu: drawMu(rng, sigma), sigma, form, a, b };
    }
  },
  render: (params): Slide => {
    const { measure, mu, sigma, form, a, b } = params;
    const event =
      form === 'between' ? `between $${mu + a * sigma}$ and $${mu + b * sigma}$` : form === 'above' ? `above $${mu + a * sigma}$` : `below $${mu + b * sigma}$`;
    return {
      kind: 'expression',
      prompt: [say(`${measureText(measure, mu, sigma, true)} Use the 68-95-99.7 rule to find the percentage of values ${event}.`)],
      lead: '\\text{Percentage} =',
      keypad: [],
      answer: fmt(rulePercent(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { mu, sigma, form, a, b } = params;
    const at = (k: number) => `${mu + k * sigma} \\text{ is } \\mu ${k < 0 ? '-' : '+'} ${Math.abs(k)}\\sigma`;
    const lines: SolutionStep[] = [];
    if (form !== 'below') lines.push({ tex: at(a) });
    if (form !== 'above') lines.push({ tex: at(b) });
    lines.push({ text: 'Below $\\mu - 3\\sigma, \\mu - 2\\sigma, \\ldots, \\mu + 3\\sigma$ lie about $0.15, 2.5, 16, 50, 84, 97.5, 99.85$ percent.' });
    if (form === 'between') lines.push({ tex: `${RULE_BELOW[b]} - ${RULE_BELOW[a]} = ${fmt(rulePercent(params))}` });
    else if (form === 'above') lines.push({ tex: `100 - ${RULE_BELOW[a]} = ${fmt(rulePercent(params))}` });
    else lines.push({ tex: `${fmt(rulePercent(params))}` });
    return lines;
  },
};

interface NotationParams {
  measure: number;
  mu: number;
  sigma: number;
  mode: 'sd' | 'write';
}

const normalNotation: Generator<NotationParams> = {
  id: 'dist-normal-notation',
  sample: (rng, difficulty) => {
    const sigma = rng.pick(SIGMAS);
    return {
      measure: rng.int(0, MEASURES.length - 1),
      mu: drawMu(rng, sigma),
      sigma,
      mode: difficulty > 1 && rng.chance(0.6) ? 'sd' : rng.chance(0.4) ? 'sd' : 'write',
    };
  },
  render: ({ measure, mu, sigma, mode }): Slide => {
    const v = sigma * sigma;
    if (mode === 'sd') {
      return choiceSlide(
        [say(`${measureText(measure, mu, sigma, false)} What is its standard deviation?`)],
        options({ tex: `${sigma}` }, { tex: `${v}` }, { tex: `${2 * sigma}` }, { tex: `${v / 2}` }, { tex: `${sigma + 1}` }).slice(0, 4),
      );
    }
    const { what, unit } = MEASURES[measure];
    return choiceSlide(
      [say(`${what}, in ${unit}, is normally distributed with mean $${mu}$ and standard deviation $${sigma}$. Which describes it?`)],
      options(
        { tex: `X \\sim N(${mu}, ${v})` },
        { tex: `X \\sim N(${mu}, ${sigma})` },
        { tex: `X \\sim N(${v}, ${mu})` },
        { tex: `X \\sim N(${mu}, ${2 * sigma})` },
        { tex: `X \\sim N(${sigma}, ${mu})` },
      ).slice(0, 4),
    );
  },
  solution: ({ mu, sigma, mode }) => [
    { text: 'In $N(\\mu, \\sigma^2)$ the second number is the variance, the square of the standard deviation.' },
    mode === 'sd'
      ? { tex: aligned(`\\sigma^2 &= ${sigma * sigma}`, `\\sigma &= \\sqrt{${sigma * sigma}} = ${sigma}`) }
      : { tex: aligned(`\\mu &= ${mu}`, `\\sigma^2 &= ${sigma}^2 = ${sigma * sigma}`, `X &\\sim N(${mu}, ${sigma * sigma})`) },
  ],
};

interface RuleFlowParams {
  measure: number;
  mu: number;
  sigma: number;
  k: number;
  dir: 'above' | 'below';
}

/** The share of values on the asked side of mu + k sigma, as the rule gives it. */
const ruleShare = ({ k, dir }: RuleFlowParams): number => (dir === 'below' ? RULE_BELOW[k] : clean(100 - RULE_BELOW[k]));

const RULE_OPTIONS: Record<number, number[]> = { 1: [16, 34, 84], 2: [2.5, 47.5, 97.5], 3: [0.15, 49.85, 99.85] };

const ruleFlow: Generator<RuleFlowParams> = {
  id: 'dist-rule-flow',
  sample: (rng, difficulty) => {
    const sigma = rng.pick(SIGMAS);
    return {
      measure: rng.int(0, MEASURES.length - 1),
      mu: drawMu(rng, sigma),
      sigma,
      k: rng.int(1, difficulty > 1 ? 3 : 2) * rng.sign(),
      dir: rng.pick<RuleFlowParams['dir']>(['above', 'below']),
    };
  },
  render: (params): Slide => {
    const { measure, mu, sigma, k, dir } = params;
    const x = mu + k * sigma;
    const key = `${mu}|${sigma}|${k}|${dir}`;
    const pctStep = (m: number) => ({
      id: `k${m}`,
      ask: `About what percentage of values are ${dir} ${x}?`,
      branches: turned(
        RULE_OPTIONS[m].map((v) => ({ label: `${v}%`, outcome: `So about ${v}% of values are ${dir} ${x}.` })),
        `${key}${m}`,
      ),
    });
    return {
      kind: 'flow',
      prompt: [say(`${measureText(measure, mu, sigma, false)} Use the 68-95-99.7 rule to estimate the share of values ${dir} ${x}.`)],
      subject: nTex(mu, sigma),
      steps: [
        {
          id: 'side',
          ask: `Is ${x} above or below the mean?`,
          branches: turned([{ label: 'Above', to: 'far' }, { label: 'Below', to: 'far' }], key),
        },
        {
          id: 'far',
          ask: 'How many standard deviations is it from the mean?',
          branches: [1, 2, 3].map((m) => ({ label: String(m), to: `k${m}` })),
        },
        pctStep(1),
        pctStep(2),
        pctStep(3),
      ],
      answer: [k > 0 ? 'Above' : 'Below', String(Math.abs(k)), `${ruleShare(params)}%`],
    };
  },
  solution: (params) => {
    const { mu, sigma, k, dir } = params;
    const x = mu + k * sigma;
    const m = Math.abs(k);
    const inside = { 1: 68, 2: 95, 3: 99.7 }[m];
    return [
      { text: `The standard deviation is $\\sqrt{${sigma * sigma}} = ${sigma}$, so $${x}$ is $${m}$ standard deviation${m === 1 ? '' : 's'} ${k > 0 ? 'above' : 'below'} the mean.` },
      { text: `About ${inside}% lie within $${m}$ of the mean, leaving ${fmt((100 - (inside ?? 0)) / 2)}% in each tail.` },
      { text: `So about ${ruleShare(params)}% of values are ${dir} ${x}.` },
    ];
  },
};

/* ---------- Level 2, lesson 2: standardising ---------- */

interface ZParams {
  measure: number;
  mu: number;
  sigma: number;
  /** x = mu + k. */
  k: number;
  words: boolean;
}

function sampleZ(rng: Rng, difficulty: number, words?: boolean): ZParams {
  const sigma = rng.pick(SIGMAS);
  return {
    measure: rng.int(0, MEASURES.length - 1),
    mu: drawMu(rng, sigma),
    sigma,
    k: drawK(rng, sigma, difficulty > 1 ? 2.8 : 2),
    words: words ?? difficulty < 2,
  };
}

const zOf = ({ k, sigma }: { k: number; sigma: number }): number => clean(k / sigma);

function zSolution({ mu, sigma, k, words }: ZParams): SolutionStep[] {
  return [
    ...(words ? [] : [{ text: `The variance is $${sigma * sigma}$, so $\\sigma = ${sigma}$.` }]),
    { tex: aligned(`z &= \\frac{x - \\mu}{\\sigma} = \\frac{${mu + k} - ${mu}}{${sigma}}`, `&= \\frac{${k}}{${sigma}} = ${fmt(zOf({ k, sigma }))}`) },
  ];
}

const zScore: Generator<ZParams> = {
  id: 'dist-z-score',
  sample: (rng, difficulty) => sampleZ(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`${measureText(params.measure, params.mu, params.sigma, params.words)} Standardise $x = ${params.mu + params.k}$.`)],
    lead: 'z =',
    keypad: [],
    answer: fmt(zOf(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: zSolution,
  choices: (params) => {
    const z = zOf(params);
    return decimalChoices(z, [-z, clean(params.k / (params.sigma * params.sigma)), clean(params.k * params.sigma), clean(z + 1)], false);
  },
};

const zForm: Generator<ZParams> = {
  id: 'dist-z-form',
  sample: (rng, difficulty) => sampleZ(rng, difficulty),
  render: (params): Slide => {
    const { measure, mu, sigma, k, words } = params;
    const z = zOf(params);
    const answer = [String(mu + k), String(mu), String(sigma), fmt(z)];
    return {
      kind: 'tiles',
      prompt: [say(`${measureText(measure, mu, sigma, words)} Standardise $x = ${mu + k}$: fill in $x$, $\\mu$ and $\\sigma$, then the value of $z$.`)],
      template: 'z = ({0} - {1}) \\div {2} = {3}',
      bank: tokenBank(answer, [String(sigma * sigma), fmt(-z), String(k), fmt(clean(z * 10))], 3),
      answer,
    };
  },
  solution: zSolution,
};

const zParts: Generator<ZParams> = {
  id: 'dist-z-parts',
  sample: (rng, difficulty) => sampleZ(rng, difficulty, false),
  render: (params): Slide => {
    const { mu, sigma, k } = params;
    const z = zOf(params);
    const answer = [String(k), String(sigma), fmt(z)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${nTex(mu, sigma)}$. Standardise $x = ${mu + k}$. Top row: $x - \\mu$, then $\\sigma$. Underneath: $z$.`,
        ),
      ],
      expression: 'z = \\frac{x - \\mu}{\\sigma}',
      nodes: [
        { id: 'd', from: [] },
        { id: 's', from: [] },
        { id: 'z', from: ['d', 's'] },
      ],
      bank: decimalBank(answer, [sigma * sigma, -k, -z, clean(k / (sigma * sigma)), clean(z * 10)], 3, false),
      answer,
    };
  },
  solution: zSolution,
};

interface ZWorkingParams extends ZParams {
  back: boolean;
}

const zWorking: Generator<ZWorkingParams> = {
  id: 'dist-z-working',
  sample: (rng, difficulty) => ({ ...sampleZ(rng, difficulty, false), back: rng.chance(difficulty > 1 ? 0.6 : 0.4) }),
  render: (params): Slide => {
    const { mu, sigma, k, back } = params;
    const z = zOf(params);
    const x = mu + k;
    const tap = 'Tap the part to do next, then choose what it comes to.';
    if (!back) {
      return {
        kind: 'steps',
        prompt: [say(`$${nTex(mu, sigma)}$. Standardise $x = ${x}$ with $z = (x - \\mu) \\div \\sigma$. ${tap}`)],
        start: ['(', String(x), '-', String(mu), ')', '\\div', String(sigma)],
        reductions: [
          { span: [0, 5], operator: 2, value: String(k), bank: stepBank(String(k), String(-k), String(k + 1), String(x + mu)) },
          { span: [0, 3], operator: 1, value: fmt(z), bank: stepBank(fmt(z), fmt(clean(k / (sigma * sigma))), fmt(-z), fmt(clean(k * sigma))) },
        ],
      };
    }
    return {
      kind: 'steps',
      prompt: [say(`$${nTex(mu, sigma)}$. Find the value $x$ with $z = ${fmt(z)}$, using $x = \\mu + z\\sigma$. ${tap}`)],
      start: [String(mu), k < 0 ? '-' : '+', fmt(Math.abs(z)), '\\times', String(sigma)],
      reductions: [
        {
          span: [2, 5],
          operator: 3,
          value: String(Math.abs(k)),
          bank: stepBank(String(Math.abs(k)), fmt(clean(Math.abs(z) * sigma * sigma)), fmt(clean(Math.abs(z) + sigma)), String(Math.abs(k) + 1)),
        },
        { span: [0, 3], operator: 1, value: String(x), bank: stepBank(String(x), String(mu - k), String(x + 1), fmt(clean((mu + Math.abs(z)) * sigma))) },
      ],
    };
  },
  solution: (params) => {
    if (!params.back) return zSolution(params);
    const { mu, sigma, k } = params;
    return [
      { text: 'Rearrange $z = \\frac{x - \\mu}{\\sigma}$: $x = \\mu + z\\sigma$.' },
      { tex: aligned(`x &= ${mu} + ${paren(zOf(params))} \\times ${sigma}`, `&= ${mu} ${k < 0 ? '-' : '+'} ${Math.abs(k)} = ${mu + k}`) },
    ];
  },
};

const SUBJECTS: [string, string][] = [
  ['Maths', 'English'],
  ['History', 'Physics'],
  ['Chemistry', 'French'],
  ['Biology', 'Art'],
  ['Geography', 'Music'],
];

interface CompareParams {
  pair: number;
  first: { mu: number; sigma: number; k: number };
  second: { mu: number; sigma: number; k: number };
}

const zCompare: Generator<CompareParams> = {
  id: 'dist-z-compare',
  sample: (rng, difficulty) => {
    const one = () => {
      const sigma = rng.pick([4, 5, 8, 10]);
      return { mu: rng.int(40, 65), sigma, k: drawK(rng, sigma, 2, difficulty > 1 ? undefined : 1) };
    };
    for (;;) {
      const first = one();
      const second = one();
      const tie = zOf(first) === zOf(second);
      if (tie && !(difficulty > 1 && rng.chance(0.3))) continue;
      if (first.mu + first.k > 100 || second.mu + second.k > 100) continue;
      return { pair: rng.int(0, SUBJECTS.length - 1), first, second };
    }
  },
  render: ({ pair, first, second }): Slide => {
    const [a, b] = SUBJECTS[pair];
    const z1 = zOf(first);
    const z2 = zOf(second);
    const answer = z1 === z2 ? 'Both equally well' : z1 > z2 ? a : b;
    return choiceSlide(
      [
        say(
          `A student scores ${first.mu + first.k} in ${a}, where marks are $N(${first.mu}, ${first.sigma * first.sigma})$, and ${second.mu + second.k} in ${b}, where marks are $N(${second.mu}, ${second.sigma * second.sigma})$. Compared with everyone else, which result is better?`,
        ),
      ],
      options({ tex: answer }, ...[a, b, 'Both equally well'].map((tex) => ({ tex }))),
      false,
    );
  },
  solution: ({ pair, first, second }) => {
    const [a, b] = SUBJECTS[pair];
    const z1 = zOf(first);
    const z2 = zOf(second);
    return [
      { text: 'Standardise both marks: $z$ says how many standard deviations each is above or below its own mean.' },
      { text: `${a}:` },
      { tex: `z = \\frac{${first.mu + first.k} - ${first.mu}}{${first.sigma}} = ${fmt(z1)}` },
      { text: `${b}:` },
      { tex: `z = \\frac{${second.mu + second.k} - ${second.mu}}{${second.sigma}} = ${fmt(z2)}` },
      { text: z1 === z2 ? 'The two are equal, so the results are equally good.' : `The larger $z$ is the better result: ${z1 > z2 ? a : b}.` },
    ];
  },
};

/* ---------- Level 2, lesson 3: a probability from Phi ---------- */

interface ProbParams {
  measure: number;
  mu: number;
  sigma: number;
  mode: 'below' | 'above' | 'between';
  k1: number;
  /** The upper end, for `between`. */
  k2: number;
}

const probValue = ({ mode, k1, k2, sigma }: ProbParams): number => {
  const lower = below(clean(k1 / sigma));
  if (mode === 'below') return lower;
  if (mode === 'above') return clean(1 - lower);
  return clean(below(clean(k2 / sigma)) - lower);
};

function sampleProb(rng: Rng, difficulty: number): ProbParams {
  const sigma = rng.pick(SIGMAS);
  const measure = rng.int(0, MEASURES.length - 1);
  const mu = drawMu(rng, sigma);
  if (difficulty > 1 && rng.chance(0.5)) {
    for (;;) {
      const k1 = drawK(rng, sigma, 2.5);
      const k2 = drawK(rng, sigma, 2.5);
      if (k2 <= k1 || Math.abs(k1) === Math.abs(k2)) continue;
      return { measure, mu, sigma, mode: 'between', k1, k2 };
    }
  }
  return {
    measure,
    mu,
    sigma,
    mode: rng.pick<ProbParams['mode']>(['below', 'above']),
    k1: drawK(rng, sigma, 2.5, difficulty > 1 ? undefined : 1),
    k2: 0,
  };
}

/** The Phi values a question quotes, one per distinct |z|. */
function quotes({ mode, k1, k2, sigma }: ProbParams): number[] {
  const zs = mode === 'between' ? [k1, k2] : [k1];
  return [...new Set(zs.map((k) => clean(Math.abs(k) / sigma)))].sort((a, b) => a - b);
}

const quoteTex = (zs: number[]): string => aligned(...zs.map((z) => `\\Phi(${fmt(z)}) &= ${fmt(phi(z))}`));

function eventTex({ mode, mu, k1, k2 }: ProbParams): string {
  if (mode === 'below') return `P(X < ${mu + k1})`;
  if (mode === 'above') return `P(X > ${mu + k1})`;
  return `P(${mu + k1} < X < ${mu + k2})`;
}

/** P(X < mu + k) worked from Phi, for a solution line. */
function belowLine(k: number, sigma: number): string {
  const z = clean(k / sigma);
  return z >= 0
    ? aligned(`P(Z < ${fmt(z)}) &= \\Phi(${fmt(z)})`, `&= ${fmt(phi(z))}`)
    : aligned(`& P(Z < ${fmt(z)})`, `&= 1 - \\Phi(${fmt(-z)})`, `&= ${fmt(below(z))}`);
}

function probSolution(params: ProbParams): SolutionStep[] {
  const { mu, sigma, mode, k1, k2 } = params;
  const steps: SolutionStep[] = [
    { tex: `z = \\frac{${mu + k1} - ${mu}}{${sigma}} = ${fmt(clean(k1 / sigma))}` },
  ];
  if (mode === 'between') steps.push({ tex: `z = \\frac{${mu + k2} - ${mu}}{${sigma}} = ${fmt(clean(k2 / sigma))}` });
  steps.push({ tex: belowLine(k1, sigma) });
  if (mode === 'above') steps.push({ tex: aligned(`P(X > ${mu + k1}) &= 1 - ${fmt(below(clean(k1 / sigma)))}`, `&= ${fmt(probValue(params))}`) });
  if (mode === 'between') {
    steps.push({ tex: belowLine(k2, sigma) });
    steps.push({
      tex: aligned(`& ${eventTex(params)}`, `&= ${fmt(below(clean(k2 / sigma)))} - ${fmt(below(clean(k1 / sigma)))}`, `&= ${fmt(probValue(params))}`),
    });
  }
  return steps;
}

const normalProb: Generator<ProbParams> = {
  id: 'dist-normal-prob',
  sample: sampleProb,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(`${measureText(params.measure, params.mu, params.sigma, false)} Find $${eventTex(params)}$ using`),
      show(quoteTex(quotes(params))),
    ],
    lead: `${eventTex(params)} =`,
    keypad: [],
    answer: fmt(probValue(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: probSolution,
  choices: (params) => {
    const value = probValue(params);
    const quoted = quotes(params).map(phi);
    return decimalChoices(value, [
      clean(1 - value),
      ...quoted,
      params.mode === 'between' ? clean(quoted[quoted.length - 1] - quoted[0]) : clean(1 - quoted[0]),
      params.mode === 'between' ? clean(quoted[0] + quoted[quoted.length - 1] - 1) : clean(quoted[0] - 0.5),
    ]);
  },
};

interface TailParams {
  measure: number;
  mu: number;
  sigma: number;
  k: number;
  dir: 'below' | 'above';
}

const tailFlow: Generator<TailParams> = {
  id: 'dist-tail-flow',
  sample: (rng, difficulty) => {
    const sigma = rng.pick(SIGMAS);
    return {
      measure: rng.int(0, MEASURES.length - 1),
      mu: drawMu(rng, sigma),
      sigma,
      k: drawK(rng, sigma, difficulty > 1 ? 2.8 : 2),
      dir: rng.pick<TailParams['dir']>(['below', 'above']),
    };
  },
  render: ({ measure, mu, sigma, k, dir }): Slide => {
    const z = clean(k / sigma);
    const u = fmt(Math.abs(z));
    const op = dir === 'below' ? '<' : '>';
    const direct = (dir === 'below') === z > 0;
    const forms = [`$\\Phi(${u})$`, `$1 - \\Phi(${u})$`, `$\\Phi(${u}) - 0.5$`];
    const right = direct ? forms[0] : forms[1];
    const key = `${mu}|${sigma}|${k}|${dir}`;
    return {
      kind: 'flow',
      prompt: [
        say(`${measureText(measure, mu, sigma, false)} The table only gives $\\Phi$ for positive $z$. Decide how to find the probability.`),
      ],
      subject: `P(X ${op} ${mu + k})`,
      steps: [
        {
          id: 'sign',
          ask: `Standardise $x = ${mu + k}$. Is $z$ positive or negative?`,
          branches: turned([{ label: 'Positive', to: 'tail' }, { label: 'Negative', to: 'tail' }], key),
        },
        {
          id: 'tail',
          ask: `Which gives $P(X ${op} ${mu + k})$?`,
          branches: turned(
            forms.map((label) => ({ label, outcome: `So the probability is ${label}.` })),
            `${key}t`,
          ),
        },
      ],
      answer: [z > 0 ? 'Positive' : 'Negative', right],
    };
  },
  solution: ({ mu, sigma, k, dir }) => {
    const z = clean(k / sigma);
    const u = fmt(Math.abs(z));
    const direct = (dir === 'below') === z > 0;
    return [
      { tex: `z = \\frac{${mu + k} - ${mu}}{${sigma}} = ${fmt(z)}` },
      {
        text: direct
          ? `$\\Phi(${u})$ is the area below $${u}$, and that is the side asked for.`
          : z > 0
            ? `$\\Phi(${u})$ is the area below $${u}$; the area above is what is left: $1 - \\Phi(${u})$.`
            : `By symmetry, the area ${dir === 'below' ? 'below' : 'above'} $${fmt(z)}$ matches the area ${dir === 'below' ? 'above' : 'below'} $${u}$, which is $${dir === 'below' ? `1 - \\Phi(${u})` : `\\Phi(${u})`}$.`,
      },
    ];
  },
};

interface ProbTableParams {
  mu: number;
  sigma: number;
  ks: number[];
}

const normalTable: Generator<ProbTableParams> = {
  id: 'dist-normal-table',
  sample: (rng, difficulty) => {
    const sigma = rng.pick(SIGMAS);
    for (;;) {
      const ks = [drawK(rng, sigma, 2.5), drawK(rng, sigma, 2.5), drawK(rng, sigma, 2.5, difficulty > 1 ? -1 : 1)];
      if (new Set(ks.map(Math.abs)).size < 3) continue;
      return { mu: drawMu(rng, sigma), sigma, ks: ks.sort((a, b) => a - b) };
    }
  },
  render: ({ mu, sigma, ks }): Slide => {
    const [first, ...rest] = ks;
    const zs = ks.map((k) => clean(k / sigma));
    const rows: (string | null)[][] = [[String(mu + first), fmt(zs[0]), fmt(below(zs[0]))], ...rest.map((k) => [String(mu + k), null, null])];
    const answer = rest.flatMap((_, i) => [fmt(zs[i + 1]), fmt(below(zs[i + 1]))]);
    const slips = rest.flatMap((_, i) => {
      const z = zs[i + 1];
      return [-z, clean(1 - below(z)), phi(Math.abs(z)) === below(z) ? clean(1 - phi(Math.abs(z))) : phi(Math.abs(z))];
    });
    const quoted = [...new Set(rest.map((k) => clean(Math.abs(k) / sigma)))].sort((a, b) => a - b);
    return {
      kind: 'table',
      prompt: [
        say(`$${nTex(mu, sigma)}$. The first row is done. Fill in $z$ and $P(X < x)$ for the others, using`),
        show(aligned(...quoted.map((z) => `\\Phi(${fmt(z)}) &= ${fmt(phi(z))}`))),
      ],
      columns: ['x', 'z', 'P(X < x)'],
      rows,
      bank: decimalBank(answer, slips, 3, false),
      answer,
    };
  },
  solution: ({ mu, sigma, ks }) =>
    ks.slice(1).flatMap((k) => [
      { tex: `z = \\frac{${mu + k} - ${mu}}{${sigma}} = ${fmt(clean(k / sigma))}` },
      { tex: belowLine(k, sigma) },
    ]),
};

interface BetweenNormalParams {
  mu: number;
  sigma: number;
  k1: number;
  k2: number;
}

const betweenNormal: Generator<BetweenNormalParams> = {
  id: 'dist-normal-between-form',
  sample: (rng, difficulty) => {
    const sigma = rng.pick(SIGMAS);
    for (;;) {
      const k1 = drawK(rng, sigma, 2.5);
      const k2 = drawK(rng, sigma, 2.5);
      if (k2 <= k1 || Math.abs(k1) === Math.abs(k2)) continue;
      // Difficulty 1 keeps to the case that straddles the mean or sits above it.
      if (difficulty < 2 && k2 < 0) continue;
      // Phi(u) + Phi(v) = 1.5 would make two of the four forms equal in value.
      if (clean(phi(Math.abs(k1 / sigma)) + phi(Math.abs(k2 / sigma))) === 1.5) continue;
      return { mu: drawMu(rng, sigma), sigma, k1, k2 };
    }
  },
  render: ({ mu, sigma, k1, k2 }): Slide => {
    const z1 = clean(k1 / sigma);
    const z2 = clean(k2 / sigma);
    const u = fmt(Math.abs(z1));
    const v = fmt(Math.abs(z2));
    const [pu, pv] = [phi(Math.abs(z1)), phi(Math.abs(z2))];
    const forms = [
      { tex: `\\Phi(${v}) - \\Phi(${u})`, answer: fmt(clean(pv - pu)) },
      { tex: `\\Phi(${v}) + \\Phi(${u}) - 1`, answer: fmt(clean(pv + pu - 1)) },
      { tex: `\\Phi(${u}) - \\Phi(${v})`, answer: fmt(clean(pu - pv)) },
      { tex: `2 - \\Phi(${u}) - \\Phi(${v})`, answer: fmt(clean(2 - pu - pv)) },
    ];
    const right = z1 > 0 ? 0 : z2 > 0 ? 1 : 2;
    return choiceSlide(
      [say(`$${nTex(mu, sigma)}$. Which gives $P(${mu + k1} < X < ${mu + k2})$?`)],
      options(forms[right], ...forms.filter((_, i) => i !== right)),
    );
  },
  solution: ({ sigma, k1, k2 }) => {
    const z1 = clean(k1 / sigma);
    const z2 = clean(k2 / sigma);
    const u = fmt(Math.abs(z1));
    const v = fmt(Math.abs(z2));
    return [
      { tex: aligned(`z_1 &= ${fmt(z1)}`, `z_2 &= ${fmt(z2)}`) },
      { text: 'The probability is the area below $z_2$ take away the area below $z_1$.' },
      z1 > 0
        ? { tex: `\\Phi(${v}) - \\Phi(${u})` }
        : z2 > 0
          ? { tex: aligned(`& \\Phi(${v}) - (1 - \\Phi(${u}))`, `&= \\Phi(${v}) + \\Phi(${u}) - 1`) }
          : { tex: aligned(`& (1 - \\Phi(${v}))`, `&\\quad - (1 - \\Phi(${u}))`, `&= \\Phi(${u}) - \\Phi(${v})`) },
    ];
  },
};

/* ---------- Level 2, lesson 4: working back from a probability ---------- */

type InverseForm = 'top' | 'bottom' | 'below' | 'upper' | 'lower';

interface InverseParams {
  measure: number;
  mu: number;
  sigma: number;
  crit: number;
  form: InverseForm;
}

/** The signed z at a: positive when a is above the mean. */
const inverseZ = ({ crit, form }: InverseParams): number => (form === 'bottom' || form === 'lower' ? -CRITICAL[crit].z : CRITICAL[crit].z);

const inverseA = (params: InverseParams): number => clean(params.mu + inverseZ(params) * params.sigma);

const pct = (share: number): string => `${fmt(clean(share * 100))}%`;

function inverseCondition({ crit, form }: InverseParams): string {
  const t = CRITICAL[crit].tail;
  switch (form) {
    case 'top':
      return `$P(X > a) = ${fmt(t)}$`;
    case 'bottom':
      return `$P(X < a) = ${fmt(t)}$`;
    case 'below':
      return `$P(X < a) = ${fmt(clean(1 - t))}$`;
    case 'upper':
      return `the middle ${pct(clean(1 - 2 * t))} of values lie between $b$ and $a$, with $a$ the upper end`;
    case 'lower':
      return `the middle ${pct(clean(1 - 2 * t))} of values lie between $a$ and $b$, with $a$ the lower end`;
  }
}

function sampleInverse(rng: Rng, difficulty: number, sigmas = SIGMAS): InverseParams {
  const sigma = rng.pick(sigmas);
  return {
    measure: rng.int(0, MEASURES.length - 1),
    mu: drawMu(rng, sigma),
    sigma,
    crit: rng.int(0, CRITICAL.length - 1),
    form: difficulty > 1 ? rng.pick<InverseForm>(['top', 'bottom', 'below', 'upper', 'lower']) : rng.pick<InverseForm>(['top', 'bottom']),
  };
}

function inverseSolution(params: InverseParams): SolutionStep[] {
  const { mu, sigma, crit, form } = params;
  const { z, tail } = CRITICAL[crit];
  const why: Record<InverseForm, string> = {
    top: `$${fmt(tail)}$ above $a$ means $${fmt(clean(1 - tail))}$ below it, so $a$ is $${z}$ standard deviations above the mean.`,
    bottom: `$${fmt(tail)}$ below $a$ is a lower tail. By symmetry it matches the top $${fmt(tail)}$, so $a$ is $${z}$ standard deviations below the mean.`,
    below: `$\\Phi(z) = ${fmt(clean(1 - tail))}$ gives $z = ${z}$.`,
    upper: `The middle ${pct(clean(1 - 2 * tail))} leaves $${fmt(tail)}$ in each tail, so the upper end is at $z = ${z}$.`,
    lower: `The middle ${pct(clean(1 - 2 * tail))} leaves $${fmt(tail)}$ in each tail, so the lower end is at $z = -${z}$.`,
  };
  return [
    { text: why[form] },
    { tex: aligned(`a &= \\mu + z\\sigma`, `&= ${mu} + ${paren(inverseZ(params))} \\times ${sigma}`, `&= ${fmt(inverseA(params))}`) },
  ];
}

const inverseX: Generator<InverseParams> = {
  id: 'dist-inverse-x',
  sample: (rng, difficulty) => sampleInverse(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(`${measureText(params.measure, params.mu, params.sigma, false)} Find $a$, where ${inverseCondition(params)}. Use the table:`),
      show(CRITICAL_TABLE),
    ],
    lead: 'a =',
    keypad: [],
    answer: fmt(inverseA(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: inverseSolution,
  choices: (params) => {
    const { mu, sigma } = params;
    const z = inverseZ(params);
    const others = CRITICAL.filter((_, i) => i !== params.crit).map((c) => clean(mu + Math.sign(z) * c.z * sigma));
    return decimalChoices(inverseA(params), [clean(mu - z * sigma), clean(mu + z * sigma * sigma), ...others]);
  },
};

const inverseForm: Generator<InverseParams> = {
  id: 'dist-inverse-form',
  sample: (rng, difficulty) => sampleInverse(rng, difficulty),
  render: (params): Slide => {
    const { measure, mu, sigma, crit } = params;
    const z = inverseZ(params);
    const answer = [String(mu), z < 0 ? '-' : '+', fmt(CRITICAL[crit].z), String(sigma)];
    const neighbour = CRITICAL[(crit + 1) % CRITICAL.length].z;
    return {
      kind: 'tiles',
      prompt: [
        say(`${measureText(measure, mu, sigma, false)} Build $a = \\mu \\pm z\\sigma$, where ${inverseCondition(params)}. Use the table:`),
        show(CRITICAL_TABLE),
      ],
      template: 'a = {0} {1} {2} \\times {3}',
      bank: tokenBank(answer, [z < 0 ? '+' : '-', String(sigma * sigma), fmt(neighbour), fmt(clean(1 - CRITICAL[crit].tail))], 4),
      answer,
    };
  },
  solution: inverseSolution,
};

const inverseSlider: Generator<InverseParams> = {
  id: 'dist-inverse-slider',
  sample: (rng, difficulty) => ({
    ...sampleInverse(rng, difficulty, difficulty > 1 ? [2, 4, 5, 8] : [2, 4, 5]),
    form: rng.pick<InverseForm>(difficulty > 1 ? ['top', 'bottom', 'below'] : ['top', 'bottom']),
  }),
  render: (params): Slide => {
    const { measure, mu, sigma } = params;
    const min = mu - 3 * sigma;
    const max = mu + 3 * sigma;
    const window = markerWindow(min, max);
    return {
      kind: 'slider',
      prompt: [
        say(`${measureText(measure, mu, sigma, false)} ${inverseCondition(params).replace(/^\$P/, 'Here $P')}. Slide the line to $a$, to the nearest whole number. Use the table:`),
        show(CRITICAL_TABLE),
      ],
      min,
      max,
      step: 1,
      answer: Math.round(inverseA(params)),
      readout: 'a \\approx {v}',
      figure: {
        svg: normalSvg(mu, sigma, {
          xMin: window.xMin,
          xMax: window.xMax,
          verticals: [mu - 2 * sigma, mu - sigma, mu + sigma, mu + 2 * sigma],
          label: 'A normal curve with dashed lines one and two standard deviations either side of the mean',
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: (params) => [...inverseSolution(params), { text: `To the nearest whole number, $a \\approx ${Math.round(inverseA(params))}$.` }],
};

const inverseParts: Generator<InverseParams> = {
  id: 'dist-inverse-parts',
  sample: (rng, difficulty) => sampleInverse(rng, difficulty),
  render: (params): Slide => {
    const { mu, sigma, crit } = params;
    const z = inverseZ(params);
    const zs = clean(z * sigma);
    const answer = [fmt(z), fmt(zs), fmt(inverseA(params))];
    const neighbours = CRITICAL.filter((_, i) => i !== crit).map((c) => Math.sign(z) * c.z);
    return {
      kind: 'tree',
      prompt: [
        say(`$${nTex(mu, sigma)}$ and ${inverseCondition(params)}. From the top: $z$ at $a$, then $z\\sigma$, then $a = \\mu + z\\sigma$. Use the table:`),
        show(CRITICAL_TABLE),
      ],
      expression: 'a = \\mu + z\\sigma',
      nodes: [
        { id: 'z', from: [] },
        { id: 'zs', from: ['z'] },
        { id: 'a', from: ['zs'] },
      ],
      bank: decimalBank(answer, [-z, ...neighbours, clean(z * sigma * sigma), clean(mu - zs)], 3, false),
      answer,
    };
  },
  solution: inverseSolution,
};

interface CriticalParams {
  crit: number;
  form: number;
  words: boolean;
}

/** Six ways to ask for a percentage point: the probability shown, and whether the answer is -z. */
const CRITICAL_FORMS: { symbols: (t: number) => string; words: (t: number) => string; negative: boolean }[] = [
  { symbols: (t) => `P(Z > z) = ${fmt(t)}`, words: (t) => `cuts off the top ${pct(t)}`, negative: false },
  { symbols: (t) => `P(Z < z) = ${fmt(clean(1 - t))}`, words: (t) => `has ${pct(clean(1 - t))} of values below it`, negative: false },
  { symbols: (t) => `P(Z < z) = ${fmt(t)}`, words: (t) => `cuts off the bottom ${pct(t)}`, negative: true },
  { symbols: (t) => `P(Z > z) = ${fmt(clean(1 - t))}`, words: (t) => `has ${pct(clean(1 - t))} of values above it`, negative: true },
  { symbols: (t) => `P(-z < Z < z) = ${fmt(clean(1 - 2 * t))}`, words: (t) => `is the upper end of the middle ${pct(clean(1 - 2 * t))}`, negative: false },
  { symbols: (t) => `P(|Z| > z) = ${fmt(clean(2 * t))}`, words: (t) => `leaves ${pct(clean(2 * t))} further from $0$ than it, on the two sides together`, negative: false },
];

const criticalChoice: Generator<CriticalParams> = {
  id: 'dist-critical-choice',
  sample: (rng, difficulty) => ({
    crit: rng.int(0, CRITICAL.length - 1),
    form: rng.int(0, difficulty > 1 ? CRITICAL_FORMS.length - 1 : 3),
    words: rng.chance(0.5),
  }),
  render: ({ crit, form, words }): Slide => {
    const { z, tail } = CRITICAL[crit];
    const f = CRITICAL_FORMS[form];
    const sign = f.negative ? -1 : 1;
    const ask = words ? `Find the value $z$ that ${f.words(tail)}.` : `Find $z$ with $${f.symbols(tail)}$.`;
    return choiceSlide(
      [say(`$Z \\sim N(0, 1)$. ${ask} Use the table:`), show(CRITICAL_TABLE)],
      options(
        { tex: fmt(sign * z), answer: fmt(sign * z) },
        { tex: fmt(-sign * z), answer: fmt(-sign * z) },
        ...CRITICAL.filter((_, i) => i !== crit).map((c) => ({ tex: fmt(sign * c.z), answer: fmt(sign * c.z) })),
      ).slice(0, 4),
    );
  },
  solution: ({ crit, form }) => {
    const { z, tail } = CRITICAL[crit];
    const f = CRITICAL_FORMS[form];
    return [
      {
        text: `${form > 3 ? 'Split equally between the two tails, that' : 'That'} leaves $${fmt(tail)}$ in the ${f.negative ? 'lower' : 'upper'} tail, so $\\Phi(${f.negative ? '-z' : 'z'}) = ${fmt(clean(1 - tail))}$.`,
      },
      { tex: f.negative ? aligned(`-z &= ${z}`, `z &= ${fmt(-z)}`) : `z = ${z}` },
    ];
  },
};

/* ---------- Level 2, lesson 5: finding mu or sigma ---------- */

/** z values whose Phi is quoted from the table, for finding sigma. */
const GRID_Z = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5];

interface FindParams {
  measure: number;
  ask: 'mu' | 'sigma';
  mu: number;
  sigma: number;
  /** Signed z at x. */
  z: number;
  /** Whether z is a percentage point rather than a table value. */
  crit: boolean;
  dir: 'below' | 'above';
  /** x itself, whole. */
  x: number;
}

function sampleFind(rng: Rng, difficulty: number, ask?: FindParams['ask']): FindParams {
  const measure = rng.int(0, MEASURES.length - 1);
  const want = ask ?? (difficulty > 1 && rng.chance(0.5) ? 'sigma' : 'mu');
  const dir = rng.pick<FindParams['dir']>(['below', 'above']);
  const sign = difficulty > 1 ? rng.sign() : 1;
  for (;;) {
    const sigma = rng.pick(SIGMAS);
    if (want === 'mu') {
      const crit = rng.chance(0.5);
      const z = sign * (crit ? rng.pick(CRITICAL).z : rng.pick(GRID_Z));
      const x = drawMu(rng, sigma) + Math.round(z * sigma);
      const mu = clean(x - z * sigma);
      if (!terminates(mu, 3)) continue;
      return { measure, ask: want, mu, sigma, z, crit, dir, x };
    }
    const z = sign * rng.pick(GRID_Z);
    if (!Number.isInteger(z * sigma)) continue;
    const mu = drawMu(rng, sigma);
    return { measure, ask: want, mu, sigma, z, crit: false, dir, x: clean(mu + z * sigma) };
  }
}

function findQuote({ z, crit }: FindParams): string {
  const u = Math.abs(z);
  return crit ? `\\Phi(${fmt(u)}) = ${fmt(clean(1 - CRITICAL.find((c) => c.z === u)!.tail))}` : `\\Phi(${fmt(u)}) = ${fmt(phi(u))}`;
}

/** The quoted Phi value, which a crit z reads off the percentage points. */
const quotedPhi = ({ z, crit }: FindParams): number => {
  const u = Math.abs(z);
  return crit ? clean(1 - CRITICAL.find((c) => c.z === u)!.tail) : phi(u);
};

/** P(X < x) or P(X > x) for a find question, from the quoted value alone. */
const statedProb = (params: FindParams): number => {
  const q = quotedPhi(params);
  const lower = params.z >= 0 ? q : clean(1 - q);
  return params.dir === 'below' ? lower : clean(1 - lower);
};

function findPrompt(params: FindParams, closing: string): Block[] {
  const { measure, ask, mu, sigma, x, dir } = params;
  const { what, unit } = MEASURES[measure];
  const given = ask === 'mu' ? `$X \\sim N(\\mu, ${sigma * sigma})$` : `$X \\sim N(${mu}, \\sigma^2)$`;
  return [say(`${what}, in ${unit}, is ${given}, and $P(X ${dir === 'below' ? '<' : '>'} ${fmt(x)}) = ${fmt(statedProb(params))}$. ${closing} Use $${findQuote(params)}$.`)];
}

function findSolution(params: FindParams): SolutionStep[] {
  const { ask, mu, sigma, x, z } = params;
  const u = fmt(Math.abs(z));
  const q = quotedPhi(params);
  const steps: SolutionStep[] = [
    {
      text:
        z > 0
          ? `So $P(X < ${fmt(x)}) = ${fmt(q)} = \\Phi(${u})$, and $z = ${u}$ at $x = ${fmt(x)}$.`
          : `So $P(X < ${fmt(x)}) = ${fmt(clean(1 - q))}$, under a half: $x$ is below the mean, and by symmetry $z = -${u}$.`,
    },
  ];
  if (ask === 'mu') {
    steps.push({ tex: `\\frac{${fmt(x)} - \\mu}{${sigma}} = ${fmt(z)}` });
    steps.push({ tex: aligned(`\\mu &= ${fmt(x)} - ${paren(z)} \\times ${sigma}`, `&= ${fmt(mu)}`) });
  } else {
    steps.push({ tex: `\\frac{${fmt(x)} - ${mu}}{\\sigma} = ${fmt(z)}` });
    steps.push({ tex: `\\sigma = \\frac{${fmt(clean(x - mu))}}{${fmt(z)}} = ${sigma}` });
  }
  return steps;
}

const findParameter: Generator<FindParams> = {
  id: 'dist-find-parameter',
  sample: (rng, difficulty) => sampleFind(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: findPrompt(params, `Find $\\${params.ask}$.`),
    lead: `\\${params.ask} =`,
    keypad: [],
    answer: fmt(params.ask === 'mu' ? params.mu : params.sigma),
    domain: 'real',
    mode: 'exact',
  }),
  solution: findSolution,
};

const findWorking: Generator<FindParams> = {
  id: 'dist-find-working',
  sample: (rng, difficulty) => sampleFind(rng, difficulty),
  render: (params): Slide => {
    const { ask, mu, sigma, x, z } = params;
    const tap = 'Tap the part to do next, then choose what it comes to.';
    if (ask === 'mu') {
      const zs = clean(Math.abs(z) * sigma);
      return {
        kind: 'steps',
        prompt: findPrompt(params, `So $z = ${fmt(z)}$ at $x = ${fmt(x)}$, and $\\mu = x - z\\sigma$. ${tap}`),
        start: [fmt(x), z < 0 ? '+' : '-', fmt(Math.abs(z)), '\\times', String(sigma)],
        reductions: [
          { span: [2, 5], operator: 3, value: fmt(zs), bank: stepBank(fmt(zs), fmt(clean(Math.abs(z) * sigma * sigma)), fmt(clean(Math.abs(z) + sigma)), fmt(clean(zs * 10))) },
          { span: [0, 3], operator: 1, value: fmt(mu), bank: stepBank(fmt(mu), fmt(clean(2 * x - mu)), fmt(clean(mu + 1)), fmt(clean((x - Math.abs(z)) * sigma))) },
        ],
      };
    }
    const d = clean(x - mu);
    return {
      kind: 'steps',
      prompt: findPrompt(params, `So $z = ${fmt(z)}$ at $x = ${fmt(x)}$, and $\\sigma = (x - \\mu) \\div z$. ${tap}`),
      start: ['(', fmt(x), '-', String(mu), ')', '\\div', paren(z)],
      reductions: [
        { span: [0, 5], operator: 2, value: fmt(d), bank: stepBank(fmt(d), fmt(-d), fmt(clean(x + mu)), fmt(clean(d + 1))) },
        { span: [0, 3], operator: 1, value: String(sigma), bank: stepBank(String(sigma), fmt(clean(d * z)), String(sigma * sigma), fmt(-sigma)) },
      ],
    };
  },
  solution: findSolution,
};

const findEquation: Generator<FindParams> = {
  id: 'dist-find-equation',
  sample: (rng, difficulty) => sampleFind(rng, difficulty),
  render: (params): Slide => {
    const { ask, mu, sigma, x, z } = params;
    const prob = fmt(statedProb(params));
    if (ask === 'mu') {
      const answer = [fmt(x), String(sigma), fmt(z)];
      return {
        kind: 'tiles',
        prompt: findPrompt(params, 'Build the equation that standardising $x$ gives.'),
        template: '({0} - \\mu) \\div {1} = {2}',
        bank: tokenBank(answer, [fmt(-z), String(sigma * sigma), prob, fmt(quotedPhi(params))], 4),
        answer,
      };
    }
    const answer = [fmt(x), String(mu), fmt(z)];
    return {
      kind: 'tiles',
      prompt: findPrompt(params, 'Build the equation that standardising $x$ gives.'),
      template: '({0} - {1}) \\div \\sigma = {2}',
      bank: tokenBank(answer, [fmt(-z), prob, fmt(quotedPhi(params)), fmt(clean(x - mu))], 4),
      answer,
    };
  },
  solution: findSolution,
};

const findChoice: Generator<FindParams> = {
  id: 'dist-find-choice',
  sample: (rng, difficulty) => sampleFind(rng, 2, difficulty > 1 && rng.chance(0.5) ? 'sigma' : 'mu'),
  render: (params): Slide => {
    const { ask, mu, sigma, x, z } = params;
    const prob = fmt(statedProb(params));
    const top = ask === 'mu' ? `${fmt(x)} - \\mu` : `${fmt(x)} - ${fmt(mu)}`;
    const under = ask === 'mu' ? String(sigma) : '\\sigma';
    const squared = ask === 'mu' ? String(sigma * sigma) : '\\sigma^2';
    return choiceSlide(
      findPrompt(params, 'Which equation does standardising $x$ give?'),
      options(
        { tex: `\\frac{${top}}{${under}} = ${fmt(z)}` },
        { tex: `\\frac{${top}}{${under}} = ${fmt(-z)}` },
        { tex: `\\frac{${top}}{${squared}} = ${fmt(z)}` },
        { tex: `\\frac{${top}}{${under}} = ${prob}` },
      ),
    );
  },
  solution: findSolution,
};

/* ================================================================
 * Level 3: finding both mu and sigma
 * ================================================================ */

/** A value with a stated probability: its signed z, the value, and which side is stated. */
interface Known {
  z: number;
  /** Whole at a table z; at most two places at a percentage point. */
  x: number;
  dir: 'below' | 'above';
}

interface BothParams {
  measure: number;
  mu: number;
  sigma: number;
  /** The lower value, then the upper. */
  lo: Known;
  hi: Known;
  ask: 'mu' | 'sigma';
  /** Which value a one-equation question is about. */
  which: 'lo' | 'hi';
}

/**
 * How the two values sit: either side of the mean, both on one side, or the
 * same distance either side (equal tails).
 */
type BothShape = 'any' | 'straddle' | 'oneSide' | 'symmetric';

/** A value at a table z (whole) or at a percentage point (two places at most), on the side `sign` says. */
function drawAt(rng: Rng, mu: number, sigma: number, sign: number, critical: boolean): { z: number; x: number } | undefined {
  if (critical) {
    const z = sign * rng.pick(CRITICAL).z;
    const x = clean(mu + z * sigma);
    return terminates(x, 2) ? { z, x } : undefined;
  }
  const k = drawK(rng, sigma, 2.5, sign);
  const z = clean(k / sigma);
  return Math.abs(z) < 0.2 ? undefined : { z, x: mu + k };
}

const SIDES: Known['dir'][] = ['below', 'above'];

function sampleBoth(rng: Rng, difficulty: number, shape: BothShape = 'any'): BothParams {
  const measure = rng.int(0, MEASURES.length - 1);
  const ask = rng.pick<BothParams['ask']>(['mu', 'sigma']);
  const which = rng.pick<BothParams['which']>(['lo', 'hi']);
  const form = shape !== 'any' ? shape : difficulty > 1 && rng.chance(0.4) ? 'oneSide' : 'straddle';
  const critical = difficulty > 1 ? 0.4 : 0.25;
  // Difficulty 1 mostly states the two tails (always, for equal tails); difficulty 2 either side of either value.
  const tails = difficulty < 2 ? form === 'symmetric' || rng.chance(0.7) : rng.chance(0.3);
  const dirs: Known['dir'][] = tails ? ['below', 'above'] : [rng.pick(SIDES), rng.pick(SIDES)];
  for (;;) {
    const sigma = rng.pick(SIGMAS);
    const mu = drawMu(rng, sigma);
    const side = rng.sign();
    const first = drawAt(rng, mu, sigma, form === 'oneSide' ? side : -1, rng.chance(critical));
    if (!first) continue;
    const second =
      form === 'symmetric'
        ? { z: -first.z, x: clean(2 * mu - first.x) }
        : drawAt(rng, mu, sigma, form === 'oneSide' ? side : 1, rng.chance(critical));
    if (!second) continue;
    const [lo, hi] = first.z < second.z ? [first, second] : [second, first];
    if (hi.z - lo.z < 0.5) continue;
    // Equal |z| is the pattern lesson's case; elsewhere it would hand over the midpoint.
    if (form !== 'symmetric' && Math.abs(Math.abs(lo.z) - Math.abs(hi.z)) < 1e-9) continue;
    return { measure, mu, sigma, lo: { ...lo, dir: dirs[0] }, hi: { ...hi, dir: dirs[1] }, ask, which };
  }
}

/** P(X < x), read from the quoted Phi alone. */
const lowerOf = (k: Known): number => below(k.z);

/** The probability the question states, from the quoted Phi alone. */
const statedOf = (k: Known): number => (k.dir === 'below' ? lowerOf(k) : clean(1 - lowerOf(k)));

const knownTex = (k: Known): string => `P(X ${k.dir === 'below' ? '<' : '>'} ${fmt(k.x)}) = ${fmt(statedOf(k))}`;

/** The |z| values a question quotes Phi for, smallest first. */
const quotesOf = (...known: Known[]): number[] => [...new Set(known.map((k) => Math.abs(k.z)))].sort((a, b) => a - b);

function bothPrompt(params: BothParams, closing: string): Block[] {
  const { what, unit } = MEASURES[params.measure];
  return [
    say(`${what}, in ${unit}, is $X \\sim N(\\mu, \\sigma^2)$, with $${knownTex(params.lo)}$ and $${knownTex(params.hi)}$. ${closing} Use`),
    show(quoteTex(quotesOf(params.lo, params.hi))),
  ];
}

/** A coefficient of sigma: `1.5`, or nothing for 1. */
const coef = (value: number): string => (value === 1 ? '' : value === -1 ? '-' : fmt(value));

/** `+ 1.5\sigma` or `- 1.5\sigma`. */
const zSigma = (z: number): string => `${z < 0 ? '-' : '+'} ${coef(Math.abs(z))}\\sigma`;

/** `x &= \mu + z\sigma`, for an aligned pair. */
const eqTex = (x: number, z: number): string => `${fmt(x)} &= \\mu ${zSigma(z)}`;

/** Why the z at a known value has the sign and size it has. */
function knownLine(k: Known): string {
  const x = fmt(k.x);
  const u = fmt(Math.abs(k.z));
  const lower = fmt(lowerOf(k));
  const stated = k.dir === 'above' ? `$P(X > ${x}) = ${fmt(statedOf(k))}$, so $P(X < ${x}) = ${lower}$` : `$P(X < ${x}) = ${lower}$`;
  return k.z > 0
    ? `${stated}, which is $\\Phi(${u})$: $z = ${u}$ at $x = ${x}$.`
    : `${stated}, under a half, so $${x}$ is below the mean: $1 - ${lower} = \\Phi(${u})$ and $z = -${u}$.`;
}

function bothSolution(params: BothParams): SolutionStep[] {
  const { mu, sigma, lo, hi } = params;
  const d = clean(hi.x - lo.x);
  const dz = clean(hi.z - lo.z);
  return [
    { text: knownLine(lo) },
    { text: knownLine(hi) },
    { tex: aligned(eqTex(lo.x, lo.z), eqTex(hi.x, hi.z)) },
    { text: 'Take the first from the second and $\\mu$ cancels:' },
    { tex: dz === 1 ? `\\sigma = ${fmt(d)}` : aligned(`${fmt(d)} &= ${coef(dz)}\\sigma`, `\\sigma &= ${fmt(d)} \\div ${fmt(dz)}`, `&= ${sigma}`) },
    { tex: aligned(`\\mu &= ${fmt(lo.x)} ${lo.z < 0 ? '+' : '-'} ${fmt(Math.abs(lo.z))} \\times ${sigma}`, `&= ${fmt(mu)}`) },
  ];
}

/** `\mu = 56, \; \sigma = 4`. */
const pairTex = (mu: number, sigma: number): string => `\\mu = ${fmt(mu)}, \\; \\sigma = ${fmt(sigma)}`;

/** The standard deviations either side of sigma in `SIGMAS`, without wrapping round. */
function neighbours(sigma: number): [number, number] {
  const at = SIGMAS.indexOf(sigma);
  const up = SIGMAS[at + 1] ?? SIGMAS[at - 1];
  const down = SIGMAS[at - 1] ?? SIGMAS[at + 1];
  return [up, down];
}

/* ---------- Level 3, lesson 1: why one probability is not enough ---------- */

interface OneParams {
  measure: number;
  mu: number;
  sigma: number;
  known: Known;
}

function sampleOne(rng: Rng, difficulty: number): OneParams {
  const measure = rng.int(0, MEASURES.length - 1);
  // Difficulty 1 states P(X < x); difficulty 2 either side, so it may need turning round first.
  const dir = difficulty > 1 ? rng.pick(SIDES) : 'below';
  for (;;) {
    const sigma = rng.pick(SIGMAS);
    const mu = drawMu(rng, sigma);
    const at = drawAt(rng, mu, sigma, rng.sign(), rng.chance(difficulty > 1 ? 0.4 : 0.25));
    if (at) return { measure, mu, sigma, known: { ...at, dir } };
  }
}

function onePrompt({ measure, known }: OneParams, closing: string): Block[] {
  const { what, unit } = MEASURES[measure];
  const u = Math.abs(known.z);
  return [
    say(`${what}, in ${unit}, is $X \\sim N(\\mu, \\sigma^2)$ with both $\\mu$ and $\\sigma$ unknown, and $${knownTex(known)}$. ${closing} Use $\\Phi(${fmt(u)}) = ${fmt(phi(u))}$.`),
  ];
}

function oneSolution({ known }: OneParams): SolutionStep[] {
  return [
    { text: knownLine(known) },
    { tex: `\\frac{${fmt(known.x)} - \\mu}{\\sigma} = ${fmt(known.z)}` },
    { text: 'That is one equation with two unknowns in it, so on its own it cannot fix both.' },
  ];
}

const bothSignFlow: Generator<OneParams> = {
  id: 'dist-both-sign-flow',
  sample: sampleOne,
  render: (params): Slide => {
    const { known } = params;
    const x = fmt(known.x);
    const u = fmt(Math.abs(known.z));
    const eq = (rhs: string) => `$\\frac{${x} - \\mu}{\\sigma} = ${rhs}$`;
    const labels = [...new Set([eq(u), eq(`-${u}`), eq(fmt(statedOf(known)))])];
    const key = knownTex(known);
    return {
      kind: 'flow',
      prompt: onePrompt(params, `Decide how standardising $${x}$ goes.`),
      subject: key,
      steps: [
        {
          id: 'side',
          ask: `Is $${x}$ above or below the mean?`,
          branches: turned([{ label: 'Above the mean', to: 'eq' }, { label: 'Below the mean', to: 'eq' }], key),
        },
        {
          id: 'eq',
          ask: 'Which equation does standardising give?',
          branches: turned(
            labels.map((label) => ({ label, outcome: `So ${label}: one equation, two unknowns.` })),
            `${key}e`,
          ),
        },
      ],
      answer: [known.z > 0 ? 'Above the mean' : 'Below the mean', eq(fmt(known.z))],
    };
  },
  solution: oneSolution,
};

const bothStandardise: Generator<OneParams> = {
  id: 'dist-both-standardise',
  sample: sampleOne,
  render: (params): Slide => {
    const { known } = params;
    const answer = [fmt(known.x), fmt(known.z)];
    const u = Math.abs(known.z);
    return {
      kind: 'tiles',
      prompt: onePrompt(params, 'Build the equation that standardising gives.'),
      template: '({0} - \\mu) \\div \\sigma = {1}',
      bank: tokenBank(answer, [fmt(-known.z), fmt(statedOf(known)), fmt(phi(u)), fmt(clean(1 - phi(u)))], 3),
      answer,
    };
  },
  solution: oneSolution,
};

const bothFits: Generator<OneParams> = {
  id: 'dist-both-fits',
  sample: sampleOne,
  render: (params): Slide => {
    const { mu, sigma, known } = params;
    const [other] = neighbours(sigma);
    const { x, z } = known;
    return choiceSlide(
      onePrompt(params, 'Which of these pairs fits it?'),
      options(
        { tex: pairTex(mu, sigma) },
        { tex: pairTex(clean(x + z * sigma), sigma) },
        { tex: pairTex(mu, other) },
        { tex: pairTex(clean(x + z * other), other) },
      ),
    );
  },
  solution: (params) => {
    const { mu, sigma, known } = params;
    const [other] = neighbours(sigma);
    const { x, z } = known;
    return [
      { text: knownLine(known) },
      { tex: aligned(`${fmt(x)} &= \\mu ${zSigma(z)}`, `&= ${fmt(mu)} ${z < 0 ? '-' : '+'} ${fmt(Math.abs(z))} \\times ${sigma}`) },
      { text: `So $${pairTex(mu, sigma)}$ fits. It is not the only pair that would: $\\sigma = ${other}$ with $\\mu = ${fmt(clean(x - z * other))}$ fits as well, which is why one probability cannot fix both.` },
    ];
  },
};

/* ---------- Level 3, lesson 2: two probabilities, two equations ---------- */

const bothTable: Generator<BothParams> = {
  id: 'dist-both-table',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { lo, hi } = params;
    const answer = [fmt(lowerOf(lo)), fmt(lo.z), fmt(lowerOf(hi)), fmt(hi.z)];
    const slips = [-lo.z, -hi.z, clean(1 - lowerOf(lo)), clean(1 - lowerOf(hi))];
    return {
      kind: 'table',
      prompt: bothPrompt(params, 'Fill in $P(X < x)$ and $z$ at each value.'),
      columns: ['x', 'P(X < x)', 'z'],
      rows: [
        [fmt(lo.x), null, null],
        [fmt(hi.x), null, null],
      ],
      bank: decimalBank(answer, slips, 3, false),
      answer,
    };
  },
  solution: ({ lo, hi }) => [{ text: knownLine(lo) }, { text: knownLine(hi) }],
};

const bothEquation: Generator<BothParams> = {
  id: 'dist-both-equation',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const [k, other] = params.which === 'lo' ? [params.lo, params.hi] : [params.hi, params.lo];
    const u = Math.abs(k.z);
    const answer = [fmt(k.x), k.z < 0 ? '-' : '+', fmt(u)];
    return {
      kind: 'tiles',
      prompt: bothPrompt(params, `Build the equation that $x = ${fmt(k.x)}$ gives.`),
      template: '{0} = \\mu {1} {2}\\sigma',
      bank: tokenBank(answer, [k.z < 0 ? '+' : '-', fmt(other.x), fmt(Math.abs(other.z)), fmt(statedOf(k)), fmt(phi(u))], 4),
      answer,
    };
  },
  solution: (params) => {
    const k = params.which === 'lo' ? params.lo : params.hi;
    return [{ text: knownLine(k) }, { tex: `${fmt(k.x)} = \\mu ${zSigma(k.z)}` }];
  },
};

const bothPair: Generator<BothParams> = {
  id: 'dist-both-pair',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { lo, hi } = params;
    const pair = (a: number, b: number) => aligned(eqTex(lo.x, a), eqTex(hi.x, b));
    return choiceSlide(
      bothPrompt(params, 'Which pair of equations do they give?'),
      options(
        { tex: pair(lo.z, hi.z) },
        { tex: pair(-lo.z, -hi.z) },
        { tex: pair(hi.z, lo.z) },
        { tex: pair(lo.z < 0 ? -statedOf(lo) : statedOf(lo), hi.z < 0 ? -statedOf(hi) : statedOf(hi)) },
      ),
    );
  },
  solution: (params) => [
    { text: knownLine(params.lo) },
    { text: knownLine(params.hi) },
    { tex: aligned(eqTex(params.lo.x, params.lo.z), eqTex(params.hi.x, params.hi.z)) },
  ],
};

/* ---------- Level 3, lesson 3: solving simultaneously ---------- */

const exactOnly = (values: number[]): number[] => values.filter((v) => Number.isFinite(v) && terminates(v, 3));

const bothSolve: Generator<BothParams> = {
  id: 'dist-both-solve',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: bothPrompt(params, `Find $\\${params.ask}$.`),
    lead: `\\${params.ask} =`,
    keypad: [],
    answer: fmt(params.ask === 'mu' ? params.mu : params.sigma),
    domain: 'real',
    mode: 'exact',
  }),
  solution: bothSolution,
  choices: (params) => {
    const { mu, sigma, lo, hi, ask } = params;
    const d = clean(hi.x - lo.x);
    if (ask === 'sigma') {
      return decimalChoices(sigma, exactOnly([d / Math.abs(hi.z), d / Math.abs(lo.z), d / (Math.abs(hi.z) + Math.abs(lo.z)), d / clean(hi.z + lo.z)]));
    }
    return decimalChoices(mu, exactOnly([clean(lo.x + lo.z * sigma), clean(hi.x + hi.z * sigma), clean((lo.x + hi.x) / 2)]));
  },
};

const bothWorking: Generator<BothParams> = {
  id: 'dist-both-working',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { sigma, lo, hi } = params;
    const d = clean(hi.x - lo.x);
    const dz = clean(hi.z - lo.z);
    return {
      kind: 'steps',
      prompt: bothPrompt(
        params,
        'Taking one equation from the other gives $\\sigma = (b - a) \\div (z_b - z_a)$, with $a$ the lower value. Tap the part to do next, then choose what it comes to.',
      ),
      start: ['(', fmt(hi.x), '-', fmt(lo.x), ')', '\\div', '(', fmt(hi.z), '-', paren(lo.z), ')'],
      reductions: [
        { span: [0, 5], operator: 2, value: fmt(d), bank: stepBank(fmt(d), fmt(-d), fmt(clean(hi.x + lo.x)), fmt(clean(d + 1))) },
        { span: [2, 7], operator: 4, value: fmt(dz), bank: stepBank(fmt(dz), fmt(clean(hi.z + lo.z)), fmt(-dz), fmt(clean(dz + 0.5))) },
        {
          span: [0, 3],
          operator: 1,
          value: String(sigma),
          bank: stepBank(String(sigma), ...exactOnly([d / Math.abs(hi.z), d / Math.abs(lo.z)]).map(fmt), fmt(-sigma), String(2 * sigma)),
        },
      ],
    };
  },
  solution: bothSolution,
};

const bothNodes: Generator<BothParams> = {
  id: 'dist-both-nodes-tree',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { mu, sigma, lo, hi } = params;
    const d = clean(hi.x - lo.x);
    const dz = clean(hi.z - lo.z);
    const zs = clean(lo.z * sigma);
    const answer = [fmt(d), fmt(dz), String(sigma), fmt(zs), fmt(mu)];
    return {
      kind: 'tree',
      prompt: bothPrompt(
        params,
        `Take $a = ${fmt(lo.x)}$ and $b = ${fmt(hi.x)}$. From the top: $b - a$ and $z_b - z_a$, then $\\sigma$, then $z_a\\sigma$, then $\\mu = a - z_a\\sigma$.`,
      ),
      expression: '\\mu = a - z_a\\sigma',
      nodes: [
        { id: 'd', from: [] },
        { id: 'dz', from: [] },
        { id: 'sigma', from: ['d', 'dz'] },
        { id: 'zs', from: ['sigma'] },
        { id: 'mu', from: ['zs'] },
      ],
      bank: decimalBank(answer, [clean(hi.z + lo.z), -zs, clean(lo.x + zs), clean(hi.x - hi.z * sigma + 1), clean(2 * sigma)], 3, false),
      answer,
    };
  },
  solution: bothSolution,
};

/* ---------- Level 3, lesson 4: pairs with a pattern ---------- */

function symmetricSolution(params: BothParams): SolutionStep[] {
  const { mu, sigma, lo, hi } = params;
  const half = clean((hi.x - lo.x) / 2);
  const u = fmt(Math.abs(hi.z));
  return [
    { text: `$P(X < ${fmt(lo.x)}) = ${fmt(lowerOf(lo))}$ and $P(X > ${fmt(hi.x)}) = ${fmt(clean(1 - lowerOf(hi)))}$: the two tails match, so the values sit the same distance either side of the mean.` },
    { tex: `\\mu = \\frac{${fmt(lo.x)} + ${fmt(hi.x)}}{2} = ${fmt(mu)}` },
    { text: `$\\Phi(${u}) = ${fmt(lowerOf(hi))}$, so $${fmt(hi.x)}$ is $${u}$ standard deviations above the mean, and half the gap is $${fmt(half)}$.` },
    { tex: `\\sigma = ${fmt(half)} \\div ${u} = ${sigma}` },
  ];
}

const bothSymmetric: Generator<BothParams> = {
  id: 'dist-both-symmetric',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty, 'symmetric'),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: bothPrompt(params, `Find $\\${params.ask}$.`),
    lead: `\\${params.ask} =`,
    keypad: [],
    answer: fmt(params.ask === 'mu' ? params.mu : params.sigma),
    domain: 'real',
    mode: 'exact',
  }),
  solution: symmetricSolution,
  choices: (params) => {
    const { mu, sigma, lo, hi, ask } = params;
    const d = clean(hi.x - lo.x);
    const u = Math.abs(hi.z);
    if (ask === 'sigma') return decimalChoices(sigma, exactOnly([d / u, d / 2, clean(d / 2) * u]));
    return decimalChoices(mu, exactOnly([d, clean(d / 2), clean(hi.x + u * sigma)]));
  },
};

interface MidpointParams extends BothParams {
  /** The slider's ends, off-centre so the middle of the track is not the answer. */
  from: number;
  to: number;
}

const bothMidpoint: Generator<MidpointParams> = {
  id: 'dist-both-midpoint-slider',
  sample: (rng, difficulty) => {
    const params = sampleBoth(rng, difficulty, 'symmetric');
    // One end reaches well past its line and the other only just, so the
    // handle's resting place, the middle of the track, is never the answer.
    const reach = Math.max(2, Math.round(params.sigma / 2));
    const near = rng.int(1, reach);
    const far = near + rng.int(4, 4 + reach);
    const [left, right] = rng.chance(0.5) ? [near, far] : [far, near];
    return { ...params, from: Math.floor(params.lo.x) - left, to: Math.ceil(params.hi.x) + right };
  },
  render: (params): Slide => {
    const { measure, mu, lo, hi, from, to } = params;
    const { what, unit } = MEASURES[measure];
    const window = markerWindow(from, to);
    return {
      kind: 'slider',
      prompt: [
        say(`${what}, in ${unit}, is $X \\sim N(\\mu, \\sigma^2)$, with $${knownTex(lo)}$ and $${knownTex(hi)}$. The dashed lines are at $${fmt(lo.x)}$ and $${fmt(hi.x)}$. Slide the line to $\\mu$.`),
      ],
      min: from,
      max: to,
      step: 1,
      answer: mu,
      readout: '\\mu = {v}',
      figure: {
        svg: plotSvg({
          xMin: window.xMin,
          xMax: window.xMax,
          yMin: 0,
          yMax: 1,
          curves: [],
          verticals: [
            { x: lo.x, dashed: true },
            { x: hi.x, dashed: true },
          ],
          label: 'An axis with dashed lines at the two values',
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: (params) => symmetricSolution(params).slice(0, 2),
};

const bothHalfGap: Generator<BothParams> = {
  id: 'dist-both-half-gap',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty, 'symmetric'),
  render: (params): Slide => {
    const { lo, hi } = params;
    const u = Math.abs(hi.z);
    const answer = [fmt(hi.x), fmt(lo.x), fmt(u)];
    return {
      kind: 'tiles',
      prompt: bothPrompt(params, 'The tails match, so $\\sigma$ is half the gap between the values, divided by $z$. Build it.'),
      template: '\\sigma = ({0} - {1}) \\div (2 \\times {2})',
      bank: tokenBank(answer, [fmt(lowerOf(hi)), fmt(statedOf(lo)), fmt(clean(2 * u)), fmt(-u)], 3),
      answer,
    };
  },
  solution: symmetricSolution,
};

/** How a proportion in context is worded for each of `MEASURES`. */
const PROPORTIONS: { who: string; below: string; above: string }[] = [
  { who: 'bags', below: 'weigh less than', above: 'weigh more than' },
  { who: 'solvers', below: 'finish in under', above: 'take longer than' },
  { who: 'sunflowers', below: 'are shorter than', above: 'are taller than' },
  { who: 'bulbs', below: 'fail before', above: 'last longer than' },
  { who: 'calls', below: 'last less than', above: 'last longer than' },
  { who: 'students', below: 'score under', above: 'score over' },
];

const bothProportion: Generator<BothParams> = {
  id: 'dist-both-proportion',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { measure, lo, hi, ask } = params;
    const { what, unit } = MEASURES[measure];
    const words = PROPORTIONS[measure];
    const part = (k: Known) => `$${fmt(clean(statedOf(k) * 100))}\\%$ of ${words.who} ${words[k.dir]} $${fmt(k.x)}$ ${unit}`;
    return {
      kind: 'expression',
      prompt: [
        say(`${what}, in ${unit}, is normally distributed. ${part(lo)}, and ${part(hi)}. Find the ${ask === 'mu' ? 'mean' : 'standard deviation'}, $\\${ask}$. Use`),
        show(quoteTex(quotesOf(lo, hi))),
      ],
      lead: `\\${ask} =`,
      keypad: [],
      answer: fmt(ask === 'mu' ? params.mu : params.sigma),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => [
    { text: `As probabilities: $${knownTex(params.lo)}$ and $${knownTex(params.hi)}$.` },
    ...bothSolution(params),
  ],
};

/* ---------- Level 3, lesson 5: checking and using the result ---------- */

const foundText = (params: BothParams): string =>
  `${MEASURES[params.measure].what}, in ${MEASURES[params.measure].unit}, has $${knownTex(params.lo)}$ and $${knownTex(params.hi)}$, and these were solved to give $X \\sim N(${fmt(params.mu)}, ${params.sigma * params.sigma})$.`;

const bothCheckTable: Generator<BothParams> = {
  id: 'dist-both-check-table',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { lo, hi } = params;
    const answer = [fmt(lo.z), fmt(lowerOf(lo)), fmt(hi.z), fmt(lowerOf(hi))];
    return {
      kind: 'table',
      prompt: [say(`${foundText(params)} Check it: fill in $z$ and $P(X < x)$ at each value, using`), show(quoteTex(quotesOf(lo, hi)))],
      columns: ['x', 'z', 'P(X < x)'],
      rows: [
        [fmt(lo.x), null, null],
        [fmt(hi.x), null, null],
      ],
      bank: decimalBank(answer, [-lo.z, -hi.z, clean(1 - lowerOf(lo)), clean(1 - lowerOf(hi))], 3, false),
      answer,
    };
  },
  solution: ({ mu, sigma, lo, hi }) =>
    [lo, hi].flatMap((k) => [
      { tex: aligned(`z &= \\frac{${fmt(k.x)} - ${fmt(mu)}}{${sigma}}`, `&= ${fmt(k.z)}`) },
      { tex: belowLine(clean(k.z * sigma), sigma) },
      { text: k.dir === 'below' ? `That is the $${fmt(statedOf(k))}$ stated.` : `So $P(X > ${fmt(k.x)}) = ${fmt(statedOf(k))}$, as stated.` },
    ]),
};

const bothVerify: Generator<BothParams> = {
  id: 'dist-both-verify',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { mu, sigma, lo, hi } = params;
    const [up, down] = neighbours(sigma);
    return choiceSlide(
      bothPrompt(params, 'Which pair makes both statements true?'),
      options(
        { tex: pairTex(mu, sigma) },
        // Each of these fits one statement and not the other.
        { tex: pairTex(clean(lo.x - lo.z * up), up) },
        { tex: pairTex(clean(hi.x - hi.z * down), down) },
        { tex: pairTex(clean(lo.x + lo.z * sigma), sigma) },
      ),
    );
  },
  solution: (params) => [
    ...bothSolution(params),
    { text: `Each other pair fits at most one of the two statements; only $${pairTex(params.mu, params.sigma)}$ fits both.` },
  ],
};

interface NewParams extends BothParams {
  /** The new value, whole, and its z. */
  c: number;
  zc: number;
  op: 'below' | 'above';
}

function sampleNew(rng: Rng, difficulty: number): NewParams {
  const params = sampleBoth(rng, difficulty);
  for (;;) {
    const k = drawK(rng, params.sigma, 2.5, difficulty > 1 ? undefined : 1);
    // A value already stated would answer itself.
    if (params.mu + k === params.lo.x || params.mu + k === params.hi.x) continue;
    return { ...params, c: params.mu + k, zc: clean(k / params.sigma), op: rng.pick(SIDES) };
  }
}

const newProb = ({ zc, op }: NewParams): number => (op === 'below' ? below(zc) : clean(1 - below(zc)));

const newEvent = ({ c, op }: NewParams): string => `P(X ${op === 'below' ? '<' : '>'} ${c})`;

function newPrompt(params: NewParams, closing: string): Block[] {
  const { what, unit } = MEASURES[params.measure];
  return [
    say(`${what}, in ${unit}, is $X \\sim N(\\mu, \\sigma^2)$, with $${knownTex(params.lo)}$ and $${knownTex(params.hi)}$. ${closing} Use`),
    show(quoteTex(quotesOf(params.lo, params.hi, { z: params.zc, x: params.c, dir: params.op }))),
  ];
}

function newSolution(params: NewParams): SolutionStep[] {
  const { mu, sigma, c, zc } = params;
  const steps: SolutionStep[] = [
    ...bothSolution(params),
    { tex: aligned(`z &= \\frac{${c} - ${fmt(mu)}}{${sigma}}`, `&= ${fmt(zc)}`) },
    { tex: belowLine(clean(zc * sigma), sigma) },
  ];
  if (params.op === 'above') steps.push({ tex: aligned(`${newEvent(params)} &= 1 - ${fmt(below(zc))}`, `&= ${fmt(newProb(params))}`) });
  return steps;
}

const bothNewProb: Generator<NewParams> = {
  id: 'dist-both-new-prob',
  sample: sampleNew,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: newPrompt(params, `Find $\\mu$ and $\\sigma$, then $${newEvent(params)}$.`),
    lead: `${newEvent(params)} =`,
    keypad: [],
    answer: fmt(newProb(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: newSolution,
  choices: (params) => {
    const value = newProb(params);
    const u = Math.abs(params.zc);
    return decimalChoices(value, [clean(1 - value), phi(u), clean(1 - phi(u)), clean(phi(u) - 0.5)]);
  },
};

const bothChain: Generator<NewParams> = {
  id: 'dist-both-chain-tree',
  sample: sampleNew,
  render: (params): Slide => {
    const { mu, sigma, lo, zc } = params;
    const p = newProb(params);
    const answer = [String(sigma), fmt(mu), fmt(zc), fmt(p)];
    return {
      kind: 'tree',
      prompt: newPrompt(params, `From the top: $\\sigma$, then $\\mu$, then $z$ at $${params.c}$, then $${newEvent(params)}$.`),
      expression: newEvent(params),
      nodes: [
        { id: 'sigma', from: [] },
        { id: 'mu', from: ['sigma'] },
        { id: 'z', from: ['mu'] },
        { id: 'p', from: ['z'] },
      ],
      bank: decimalBank(answer, [-zc, clean(1 - p), clean(lo.x + lo.z * sigma), clean(2 * sigma)], 3, false),
      answer,
    };
  },
  solution: newSolution,
};

/* ================================================================
 * Level 4: the normal approximation to the binomial
 * ================================================================ */

/**
 * Settings with room for hundreds of trials. The number of trials is the only
 * bare number in the sentence and p the only one inside `$...$`, which is how
 * `binomialNormal.test.ts` reads them back out.
 */
const LARGE_SETTINGS: { setup: (n: number, p: number) => string; success: string }[] = [
  {
    setup: (n, p) => `${n} seeds are planted, and each germinates with probability $${fmt(p)}$, independently.`,
    success: 'the number that germinate',
  },
  {
    setup: (n, p) => `A machine makes bolts, each faulty with probability $${fmt(p)}$, independently. A sample of ${n} is checked.`,
    success: 'the number of faulty bolts in the sample',
  },
  {
    setup: (n, p) => `Each email to an inbox is spam with probability $${fmt(p)}$, independently, and ${n} emails arrive.`,
    success: 'the number of spam emails',
  },
  {
    setup: (n, p) => `Each passenger who books a flight fails to turn up with probability $${fmt(p)}$, independently, and ${n} passengers book.`,
    success: 'the number who fail to turn up',
  },
  {
    setup: (n, p) => `Each voter in a large town backs a plan with probability $${fmt(p)}$, independently, and ${n} voters are asked.`,
    success: 'the number who back the plan',
  },
  {
    setup: (n, p) => `Each customer at a cafe pays by card with probability $${fmt(p)}$, independently, and ${n} customers are served.`,
    success: 'the number who pay by card',
  },
  {
    setup: (n, p) => `A player takes ${n} free throws, scoring each with probability $${fmt(p)}$, independently.`,
    success: 'the number of throws scored',
  },
  {
    setup: (n, p) => `Each of ${n} patients recovers from an illness with probability $${fmt(p)}$, independently.`,
    success: 'the number who recover',
  },
];

const largeText = (setting: number, n: number, p: number): string =>
  `${LARGE_SETTINGS[setting].setup(n, p)} $X$ is ${LARGE_SETTINGS[setting].success}.`;

/** The opening of a level 4 question: B(n, p) in symbols, or a setting in words. */
const opening = (words: boolean, setting: number, n: number, p: number): string =>
  words ? largeText(setting, n, p) : `$${bTex(n, p)}$.`;

/**
 * The (n, p) pairs the matching normal is drawn from. Every one has a
 * variance np(1 - p) that is a perfect square, so sigma is whole and
 * N(np, np(1 - p)) is written in whole numbers.
 */
const SQUARE_PAIRS: [number, number][] = [
  [36, 0.5],
  [48, 0.25],
  [48, 0.75],
  [64, 0.5],
  [100, 0.1],
  [100, 0.2],
  [100, 0.5],
  [100, 0.8],
  [100, 0.9],
  [144, 0.5],
  [150, 0.4],
  [150, 0.6],
  [192, 0.25],
  [192, 0.75],
  [196, 0.5],
  [225, 0.2],
  [225, 0.8],
  [256, 0.5],
  [324, 0.5],
  [400, 0.1],
  [400, 0.2],
  [400, 0.5],
  [400, 0.8],
  [400, 0.9],
  [625, 0.2],
  [625, 0.8],
  [900, 0.1],
  [900, 0.5],
  [900, 0.9],
];

/** sigma for a pair, or undefined when np(1 - p) is not a square (such a draw is refused). */
function wholeSigma(n: number, p: number): number | undefined {
  const variance = varOf({ n, p });
  const sigma = Math.round(Math.sqrt(variance));
  return sigma * sigma === variance ? sigma : undefined;
}

/**
 * The pairs a whole-route question may use. A corrected boundary sits half
 * way between whole numbers, so z = (k + 0.5) / sigma, and that has at most
 * two decimal places only when sigma has at most one factor of 2. A sigma of
 * 4 or 8 never does, so those pairs would be refused at every boundary.
 */
const ROUTE_PAIRS = SQUARE_PAIRS.filter(([n, p]) => (wholeSigma(n, p) ?? 4) % 4 !== 0);

/** Draw a pair from a table, refusing any whose sigma is not whole. */
function drawPair(rng: Rng, pairs: [number, number][]): { n: number; p: number; sigma: number } {
  for (;;) {
    const [n, p] = rng.pick(pairs);
    const sigma = wholeSigma(n, p);
    if (sigma !== undefined) return { n, p, sigma };
  }
}

/** B(n, p) row by the ratio of neighbours, for drawing only. */
function binomialRow(n: number, p: number): number[] {
  const row = [(1 - p) ** n];
  for (let r = 0; r < n; r += 1) row.push((row[r] * (n - r) * p) / ((r + 1) * (1 - p)));
  return row;
}

/* The same box as `plotSvg`, so `markerWindow` lines a slider up with the bars. */
const BARS_WIDTH = 280;
const BARS_PAD = 12;
const BARS_HEIGHT = 160;
/** Room under the axis for its numbers. */
const BARS_FOOT = 20;

/**
 * The bars of B(n, p) for r from `from` to `to`, each a unit wide and centred
 * on r, with an optional matching normal curve over them, a shaded run of bars
 * and a dashed boundary. File-local SVG: `plotSvg` draws curves, not bars.
 */
export function barsSvg(
  n: number,
  p: number,
  opts: { from: number; to: number; curve?: boolean; shade?: [number, number]; boundary?: number; label: string },
): string {
  const { from, to } = opts;
  const row = binomialRow(n, p);
  const mu = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  const f = density(mu, sd);
  const left = from - 0.5;
  const right = to + 0.5;
  const tallest = Math.max(...row.slice(from, to + 1), opts.curve ? f(mu) : 0);
  const base = BARS_HEIGHT - BARS_FOOT;
  const px = (x: number) => BARS_PAD + ((x - left) / (right - left)) * (BARS_WIDTH - 2 * BARS_PAD);
  const py = (y: number) => base - (y / (1.12 * tallest)) * (base - BARS_PAD);
  const f1 = (v: number) => v.toFixed(1);
  const parts = [`<svg viewBox="0 0 ${BARS_WIDTH} ${BARS_HEIGHT}" width="100%" role="img" aria-label="${opts.label}">`];
  for (let r = from; r <= to; r += 1) {
    const shaded = opts.shade ? r >= opts.shade[0] && r <= opts.shade[1] : true;
    const at = `x="${f1(px(r - 0.5))}" y="${f1(py(row[r]))}" width="${f1(px(r + 0.5) - px(r - 0.5))}" height="${f1(base - py(row[r]))}"`;
    if (shaded) parts.push(`<rect class="plot-shade" ${at} />`);
    parts.push(`<rect ${at} fill="none" stroke="currentColor" stroke-width="1" opacity="0.8" />`);
  }
  if (opts.curve) {
    const points = Array.from({ length: 161 }, (_, i) => {
      const x = left + ((right - left) * i) / 160;
      return `${f1(px(x))},${f1(py(f(x)))}`;
    });
    parts.push(`<path class="plot-accent" fill="none" stroke="currentColor" stroke-width="2" d="M ${points.join(' L ')}" />`);
  }
  if (opts.boundary !== undefined) {
    const x = f1(px(opts.boundary));
    parts.push(`<line x1="${x}" y1="${BARS_PAD}" x2="${x}" y2="${base}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" />`);
  }
  parts.push(`<line x1="${BARS_PAD}" y1="${base}" x2="${BARS_WIDTH - BARS_PAD}" y2="${base}" stroke="currentColor" stroke-width="1" opacity="0.7" />`);
  const every = [1, 2, 5, 10, 20, 50].find((step) => (to - from) / step <= 8) ?? 100;
  for (let r = Math.ceil(from / every) * every; r <= to; r += every) {
    parts.push(`<text x="${f1(px(r))}" y="${base + 14}" font-size="9" fill="currentColor" text-anchor="middle">${r}</text>`);
  }
  parts.push('</svg>');
  return parts.join('');
}

/* ---------- Level 4, lesson 1: why approximate ---------- */

type Side = 'le' | 'lt' | 'ge' | 'gt';

const SIDE_TEX: Record<Side, string> = { le: '\\le', lt: '<', ge: '\\ge', gt: '>' };

interface SumParams {
  n: number;
  p: number;
  r: number;
  rel: Side;
}

/** The first and last k in the exact sum for P(X rel r). */
function sumEnds({ n, r, rel }: SumParams): [number, number] {
  if (rel === 'le') return [0, r];
  if (rel === 'lt') return [0, r - 1];
  if (rel === 'ge') return [r, n];
  return [r + 1, n];
}

const approxSum: Generator<SumParams> = {
  id: 'dist-approx-sum',
  sample: (rng, difficulty) => {
    const n = difficulty > 1 ? rng.int(5, 30) * 10 : rng.int(20, 60);
    const p = rng.pick(TENTHS);
    const r = Math.min(n - 4, Math.max(3, Math.round(n * p) + rng.int(-8, 8)));
    const rel = rng.pick<Side>(difficulty > 1 ? ['lt', 'gt', 'le', 'ge'] : ['le', 'ge']);
    return { n, p, r, rel };
  },
  render: (params): Slide => {
    const { n, p, r, rel } = params;
    const [a, b] = sumEnds(params);
    const answer = [String(a), String(b), String(b - a + 1)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `$${bTex(n, p)}$. Worked out exactly, $P(X ${SIDE_TEX[rel]} ${r})$ is a sum of single probabilities $P(X = k)$, one for each whole number $k$ it takes in. Fill in the first and last $k$, and how many terms that is.`,
        ),
      ],
      template: 'P(X = {0}) + \\dots + P(X = {1}) \\text{, with } {2} \\text{ terms}',
      bank: tokenBank(answer, [r - 1, r + 1, n + 1, n - r, b - a, 1, n - 1].map(String), 3),
      answer,
    };
  },
  solution: (params) => {
    const { r, rel } = params;
    const [a, b] = sumEnds(params);
    const why: Record<Side, string> = {
      le: `$X \\le ${r}$ takes in every whole number from $0$ up to $${r}$ itself.`,
      lt: `$X < ${r}$ stops one short of $${r}$: the last whole number it takes in is $${r - 1}$.`,
      ge: `$X \\ge ${r}$ takes in $${r}$ itself and everything above it, up to $n$.`,
      gt: `$X > ${r}$ leaves $${r}$ out, so it starts at $${r + 1}$ and runs up to $n$.`,
    };
    return [
      { text: why[rel] },
      { tex: aligned(`& P(X = ${a}) + P(X = ${a + 1})`, `&\\quad + \\dots + P(X = ${b})`) },
      { text: `That is $${b} - ${a} + 1 = ${b - a + 1}$ terms, each with its own $\\tbinom{n}{k}$ and powers: long work by hand, which is why a normal curve is used instead.` },
    ];
  },
};

interface BarsParams {
  n: number;
  p: number;
  /** The wrong values of p on offer. */
  wrong: number[];
}

const approxBars: Generator<BarsParams> = {
  id: 'dist-approx-bars',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const n = rng.pick(hard ? [20, 24, 25, 30, 40] : [10, 12, 15, 16, 20]);
    const grid = hard ? Array.from({ length: 19 }, (_, i) => clean((i + 1) * 0.05)) : TENTHS;
    const p = rng.pick(grid);
    const shifts = hard ? [0.1, -0.1, 0.15, -0.15, 0.2, -0.2] : [0.3, -0.3, 0.4, -0.4, 0.5, -0.5];
    const pool = [comp(p), ...shifts.map((s) => clean(p + s))].filter((q, i, all) => q >= 0.05 && q <= 0.95 && q !== p && all.indexOf(q) === i);
    const wrong: number[] = [];
    while (wrong.length < 3) {
      const q = rng.pick(pool);
      if (!wrong.includes(q)) wrong.push(q);
    }
    return { n, p, wrong };
  },
  render: ({ n, p, wrong }): Slide =>
    choiceSlide(
      [
        say(`These bars show the distribution of $X$, the number of successes in $${n}$ trials. Which binomial distribution is it?`),
        { kind: 'diagram', svg: barsSvg(n, p, { from: 0, to: n, label: `The bars of a binomial distribution over 0 to ${n}` }) },
      ],
      options({ tex: `B(${n}, ${fmt(p)})` }, ...wrong.map((q) => ({ tex: `B(${n}, ${fmt(q)})` }))),
    ),
  solution: ({ n, p }) => [
    { text: 'The bars are tallest near the mean, $np$, so find where the peak sits as a share of $n$.' },
    { tex: `np = ${n} \\times ${fmt(p)} = ${fmt(clean(n * p))}` },
    {
      text:
        p === 0.5
          ? 'A peak in the middle, with the bars falling away evenly on both sides, is $p = 0.5$.'
          : `A peak at about $${fmt(clean(n * p))}$ out of $${n}$, with the longer tail to the ${p < 0.5 ? 'right' : 'left'}, is $p = ${fmt(p)}$.`,
    },
  ],
};

interface SkewParams {
  n: number;
  p: number;
  words: boolean;
  setting: number;
}

const NEAR_HALF = [0.45, 0.5, 0.55];
const FAR_FROM_HALF = [0.05, 0.1, 0.15, 0.85, 0.9, 0.95];

const approxSkew: Generator<SkewParams> = {
  id: 'dist-approx-skew',
  sample: (rng, difficulty) => ({
    n: rng.int(8, 30),
    p: rng.chance(0.34) ? rng.pick(NEAR_HALF) : rng.pick(FAR_FROM_HALF),
    words: difficulty > 1,
    setting: rng.int(0, LARGE_SETTINGS.length - 1),
  }),
  render: ({ n, p, words, setting }): Slide => {
    const key = `${n}|${p}|${words}|${setting}`;
    const near = NEAR_HALF.includes(p);
    return {
      kind: 'flow',
      prompt: [say(`${opening(words, setting, n, p)} Decide the shape of the bars of its distribution.`)],
      subject: words ? 'X \\sim B(n, p)' : bTex(n, p),
      steps: [
        {
          id: 'half',
          ask: 'Is $p$ close to a half?',
          branches: turned([{ label: 'Yes', outcome: 'Close to symmetric: the bars make a bell.' }, { label: 'No', to: 'low' }], key),
        },
        {
          id: 'low',
          ask: 'Is $p$ below a half?',
          branches: turned(
            [
              { label: 'Yes', outcome: 'Piled up near $0$, with a long tail to the right.' },
              { label: 'No', outcome: `Piled up near $${n}$, with a long tail to the left.` },
            ],
            `${key}low`,
          ),
        },
      ],
      answer: near ? ['Yes'] : ['No', p < 0.5 ? 'Yes' : 'No'],
    };
  },
  solution: ({ n, p }) => {
    const mean = fmt(clean(n * p));
    if (NEAR_HALF.includes(p)) {
      return [
        { text: `$p = ${fmt(p)}$ is close to a half, so a success and a failure are about as likely as each other.` },
        { text: `The bars rise to a peak near the mean, $np = ${mean}$, and fall away much the same on each side: close to a bell.` },
      ];
    }
    return [
      { text: `$p = ${fmt(p)}$ is well ${p < 0.5 ? 'below' : 'above'} a half, so the mean $np = ${mean}$ sits close to ${p < 0.5 ? '$0$' : `$${n}$`}.` },
      { text: `The bars cannot go past ${p < 0.5 ? '$0$' : `$${n}$`}, so they pile up there and trail off in a long tail to the ${p < 0.5 ? 'right' : 'left'}: skewed, not a bell.` },
    ];
  },
};

interface PeakParams {
  n: number;
  p: number;
  words: boolean;
  setting: number;
}

/** The stretch of r worth drawing: about four sigma either side of np, at least twelve wide. */
function barWindow(n: number, p: number): [number, number] {
  const mu = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  let from = Math.max(0, Math.floor(mu - 4 * sd));
  let to = Math.min(n, Math.ceil(mu + 4 * sd));
  while (to - from < 12) {
    if (from > 0) from -= 1;
    if (to - from < 12 && to < n) to += 1;
  }
  return [from, to];
}

const approxPeak: Generator<PeakParams> = {
  id: 'dist-approx-peak',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      n: hard ? rng.pick([20, 40, 60, 80, 100]) : rng.int(2, 8) * 10,
      p: hard ? rng.pick([0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]) : rng.pick(TENTHS),
      words: hard,
      setting: rng.int(0, LARGE_SETTINGS.length - 1),
    };
  },
  render: ({ n, p, words, setting }): Slide => {
    const [from, to] = barWindow(n, p);
    return {
      kind: 'slider',
      prompt: [
        say(`${opening(words, setting, n, p)} Its bars are drawn below. The normal curve that matches them is centred on the mean of $X$. Slide the line to that mean.`),
      ],
      min: from,
      max: to,
      step: 1,
      answer: clean(n * p),
      readout: '\\mu = {v}',
      figure: {
        svg: barsSvg(n, p, { from, to, label: `The bars of B(${n}, ${fmt(p)}) from ${from} to ${to}` }),
        ...markerWindow(from - 0.5, to + 0.5),
        axis: 'x',
      },
    };
  },
  solution: ({ n, p }) => [
    { text: 'The mean of $B(n, p)$ is $np$, and the matching normal curve is centred there, close to the tallest bars.' },
    { tex: `np = ${n} \\times ${fmt(p)} = ${fmt(clean(n * p))}` },
  ],
};

/* ---------- Level 4, lesson 2: when it is allowed ---------- */

/** np and n(1 - p) worked out, each over two short lines so neither runs off a phone. */
const productsTex = (n: number, p: number): string =>
  aligned(`np &= ${n} \\times ${fmt(p)}`, `&= ${fmt(clean(n * p))}`, `n(1 - p) &= ${n} \\times ${fmt(comp(p))}`, `&= ${fmt(clean(n * comp(p)))}`);

/** Whether np and n(1 - p) are both above 5. */
const approxOk = (n: number, p: number): boolean => clean(n * p) > 5 && clean(n * comp(p)) > 5;

interface ValidParams {
  n: number;
  p: number;
  words: boolean;
  setting: number;
}

const approxValid: Generator<ValidParams> = {
  id: 'dist-approx-valid',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const grid = hard ? [0.01, 0.02, 0.04, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.92, 0.95, 0.96, 0.98, 0.99] : TENTHS;
    const target = rng.pick(['ok', 'np', 'nq']);
    for (;;) {
      const n = hard ? rng.int(4, 80) * 5 : rng.int(2, 20) * 5;
      const p = rng.pick(grid);
      const np = clean(n * p);
      const nq = clean(n * comp(p));
      if (np <= 5 && nq <= 5) continue;
      const got = np <= 5 ? 'np' : nq <= 5 ? 'nq' : 'ok';
      if (got === target) return { n, p, words: hard && rng.chance(0.6), setting: rng.int(0, LARGE_SETTINGS.length - 1) };
    }
  },
  render: ({ n, p, words, setting }): Slide => {
    const key = `${n}|${p}|${words}|${setting}`;
    const np = clean(n * p);
    return {
      kind: 'flow',
      prompt: [say(`${opening(words, setting, n, p)} Decide whether a normal distribution can approximate $X$.`)],
      subject: words ? 'X \\sim B(n, p)\\,?' : `${bTex(n, p)}\\,?`,
      steps: [
        {
          id: 'np',
          ask: 'Is $np$ above $5$?',
          branches: turned([{ label: 'Yes', to: 'nq' }, { label: 'No', outcome: 'No: $np$ is $5$ or less, so the bars pile up against $0$.' }], key),
        },
        {
          id: 'nq',
          ask: 'Is $n(1 - p)$ above $5$?',
          branches: turned(
            [
              { label: 'Yes', outcome: 'Yes: both are above $5$, so a normal approximation is reasonable.' },
              { label: 'No', outcome: 'No: $n(1 - p)$ is $5$ or less, so the bars pile up against $n$.' },
            ],
            `${key}nq`,
          ),
        },
      ],
      answer: np > 5 ? ['Yes', clean(n * comp(p)) > 5 ? 'Yes' : 'No'] : ['No'],
    };
  },
  solution: ({ n, p }) => {
    const np = clean(n * p);
    const nq = clean(n * comp(p));
    return [
      { tex: productsTex(n, p) },
      {
        text: approxOk(n, p)
          ? 'Both are above $5$, so the bars are close enough to a bell for a normal approximation.'
          : `$${np <= 5 ? 'np' : 'n(1 - p)'} = ${fmt(np <= 5 ? np : nq)}$ is not above $5$, so the bars are too lopsided for a normal curve.`,
      },
    ];
  },
};

interface ProductsParams {
  n: number;
  p: number;
}

const YES = '\\text{yes}';
const NO = '\\text{no}';

const approxProducts: Generator<ProductsParams> = {
  id: 'dist-approx-products',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const good = rng.chance(0.5);
    for (;;) {
      const n = hard ? rng.int(4, 60) * 5 : rng.int(1, 12) * 10;
      const p = hard ? rng.pick([0.02, 0.04, 0.05, 0.06, 0.08, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.92, 0.94, 0.95, 0.96, 0.98]) : rng.pick(TENTHS);
      if (approxOk(n, p) === good) return { n, p };
    }
  },
  render: ({ n, p }): Slide => {
    const np = clean(n * p);
    const nq = clean(n * comp(p));
    const answer = [fmt(np), fmt(nq), approxOk(n, p) ? YES : NO];
    return {
      kind: 'tiles',
      prompt: [say(`$${bTex(n, p)}$. Work out $np$ and $n(1 - p)$, then say whether a normal distribution can approximate $X$.`)],
      template: 'np = {0}, \\; n(1 - p) = {1} \\text{: approximate? } {2}',
      bank: tokenBank(answer, [approxOk(n, p) ? NO : YES, fmt(clean(n * p * comp(p))), fmt(clean(n - p)), String(n)], 3),
      answer,
    };
  },
  solution: ({ n, p }) => {
    const np = clean(n * p);
    return [
      { tex: productsTex(n, p) },
      {
        text: approxOk(n, p)
          ? 'Both are above $5$, so yes.'
          : `$${np <= 5 ? 'np' : 'n(1 - p)'}$ is $5$ or less, so no: the bars are too lopsided.`,
      },
    ];
  },
};

interface WhichValidParams {
  good: [number, number];
  bad: [number, number][];
}

const approxWhichValid: Generator<WhichValidParams> = {
  id: 'dist-approx-which-valid',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const smaller = (n: number, p: number) => Math.min(clean(n * p), clean(n * comp(p)));
    const draw = (): [number, number] => [rng.int(2, 40) * 5, rng.pick([0.01, 0.02, 0.04, 0.05, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 0.95, 0.96, 0.98, 0.99])];
    let good: [number, number];
    for (;;) {
      good = draw();
      const m = smaller(...good);
      if (hard ? m > 5 && m <= 9 : m >= 15) break;
    }
    const bad: [number, number][] = [];
    while (bad.length < 3) {
      const pair = draw();
      const m = smaller(...pair);
      if (hard ? m < 3 || m > 5 : m > 3) continue;
      if (bad.some(([n, p]) => n === pair[0] && p === pair[1])) continue;
      // One of each side at least, so "p is small" is not the whole story.
      if (bad.length === 2 && bad.every(([n, p]) => (clean(n * p) <= 5) === (clean(pair[0] * pair[1]) <= 5))) continue;
      bad.push(pair);
    }
    return { good, bad };
  },
  render: ({ good, bad }): Slide =>
    choiceSlide(
      [say('Which of these binomial distributions can a normal distribution approximate well?')],
      options({ tex: `B(${good[0]}, ${fmt(good[1])})` }, ...bad.map(([n, p]) => ({ tex: `B(${n}, ${fmt(p)})` }))),
    ),
  solution: ({ good, bad }) => {
    const row = ([n, p]: [number, number]) => `B(${n}, ${fmt(p)}) & ${fmt(Math.min(clean(n * p), clean(n * comp(p))))}`;
    return [
      { text: 'Both $np$ and $n(1 - p)$ must be above $5$, so check the smaller of the two for each:' },
      { tex: `\\begin{array}{c|c} & \\text{smaller} \\\\ \\hline ${[good, ...bad].map(row).join(' \\\\ ')} \\end{array}` },
      { text: `Only $B(${good[0]}, ${fmt(good[1])})$ has both above $5$.` },
    ];
  },
};

interface MinNParams {
  /** p in hundredths. */
  hundredths: number;
}

/** The smallest whole n with n * min(p, 1 - p) above 5, worked in whole hundredths. */
const smallestN = ({ hundredths }: MinNParams): number => Math.floor(500 / Math.min(hundredths, 100 - hundredths)) + 1;

const approxMinN: Generator<MinNParams> = {
  id: 'dist-approx-min-n',
  sample: (rng, difficulty) => ({ hundredths: difficulty > 1 ? rng.int(52, 90) : rng.int(10, 48) }),
  render: (params): Slide => {
    const p = params.hundredths / 100;
    const m = Math.min(p, comp(p));
    const window = markerWindow(0, 60);
    return {
      kind: 'slider',
      prompt: [
        say(
          `$X \\sim B(n, ${fmt(p)})$. Slide $n$ to the smallest whole number that makes $np$ and $n(1 - p)$ both above $5$. The lines show $np$ and $n(1 - p)$ as $n$ grows, with $5$ dashed.`,
        ),
      ],
      min: 0,
      max: 60,
      step: 1,
      answer: smallestN(params),
      readout: 'n = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 60,
          yMin: 0,
          yMax: 10,
          curves: [{ f: (x) => x * m, accent: true }, { f: (x) => x * (1 - m) }],
          horizontals: [5],
          label: 'Two straight lines through the origin, np and n(1 - p), and a dashed line at 5',
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const p = params.hundredths / 100;
    const m = Math.min(p, comp(p));
    const n = smallestN(params);
    return [
      { text: `The smaller of $p$ and $1 - p$ is $${fmt(m)}$, so that is the product that has to clear $5$.` },
      { tex: aligned(`${n - 1} \\times ${fmt(m)} &= ${fmt(clean((n - 1) * m))} \\le 5`, `${n} \\times ${fmt(m)} &= ${fmt(clean(n * m))} > 5`) },
      { text: `So the smallest $n$ is $${n}$.` },
    ];
  },
};

/* ---------- Level 4, lesson 3: the matching normal ---------- */

interface MatchNormalParams {
  n: number;
  p: number;
  sigma: number;
  ask: 'mean' | 'var' | 'sd';
  words: boolean;
  setting: number;
}

function sampleMatch(rng: Rng, difficulty: number): MatchNormalParams {
  const hard = difficulty > 1;
  return {
    ...drawPair(rng, SQUARE_PAIRS),
    ask: rng.pick<MatchNormalParams['ask']>(hard ? ['var', 'sd'] : ['mean', 'var']),
    words: hard,
    setting: rng.int(0, LARGE_SETTINGS.length - 1),
  };
}

const nApprox = (n: number, p: number): string => `Y \\sim N(${fmt(meanOf({ n, p }))}, ${fmt(varOf({ n, p }))})`;

function matchSolution({ n, p, sigma }: MatchNormalParams): SolutionStep[] {
  const mu = meanOf({ n, p });
  const v = varOf({ n, p });
  return [
    { tex: aligned(`\\mu &= np`, `&= ${n} \\times ${fmt(p)} = ${fmt(mu)}`, `\\sigma^2 &= np(1 - p)`, `&= ${fmt(mu)} \\times ${fmt(comp(p))} = ${fmt(v)}`) },
    { tex: aligned(`\\sigma &= \\sqrt{${fmt(v)}} = ${sigma}`, `Y &\\sim N(${fmt(mu)}, ${fmt(v)})`) },
  ];
}

const approxParam: Generator<MatchNormalParams> = {
  id: 'dist-approx-param',
  sample: sampleMatch,
  render: (params): Slide => {
    const { n, p, sigma, ask, words, setting } = params;
    const wanted = { mean: 'its mean $\\mu$', var: 'its variance $\\sigma^2$', sd: 'its standard deviation $\\sigma$' }[ask];
    return {
      kind: 'expression',
      prompt: [say(`${opening(words, setting, n, p)} A normal distribution $Y \\sim N(\\mu, \\sigma^2)$ is to approximate $X$. Find ${wanted}.`)],
      lead: { mean: '\\mu =', var: '\\sigma^2 =', sd: '\\sigma =' }[ask],
      keypad: [],
      answer: fmt(ask === 'mean' ? meanOf(params) : ask === 'var' ? varOf(params) : sigma),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: matchSolution,
};

const approxNormal: Generator<MatchNormalParams> = {
  id: 'dist-approx-normal',
  sample: sampleMatch,
  render: (params): Slide => {
    const { n, p, sigma, words, setting } = params;
    const mu = fmt(meanOf(params));
    const v = fmt(varOf(params));
    return choiceSlide(
      [say(`${opening(words, setting, n, p)} Which normal distribution approximates $X$?`)],
      options(
        { tex: nApprox(n, p) },
        { tex: `Y \\sim N(${mu}, ${sigma})` },
        { tex: `Y \\sim N(${mu}, ${mu})` },
        { tex: `Y \\sim N(${fmt(clean(n * comp(p)))}, ${v})` },
        { tex: `Y \\sim N(${v}, ${mu})` },
      ).slice(0, 4),
    );
  },
  solution: (params) => [
    { text: 'The matching normal has the same mean and the same variance as $X$, and the second number in $N(\\mu, \\sigma^2)$ is the variance.' },
    ...matchSolution(params),
  ],
};

const approxBuild: Generator<MatchNormalParams> = {
  id: 'dist-approx-build',
  sample: sampleMatch,
  render: (params): Slide => {
    const { n, p, sigma, words, setting } = params;
    const answer = [fmt(meanOf(params)), fmt(varOf(params)), String(sigma)];
    return {
      kind: 'tiles',
      prompt: [say(`${opening(words, setting, n, p)} Build the normal distribution that approximates $X$, and its standard deviation.`)],
      template: 'Y \\sim N({0}, {1}), \\quad \\sigma = {2}',
      bank: tokenBank(answer, [fmt(clean(n * comp(p))), String(n), fmt(clean(meanOf(params) * p)), String(sigma + 1), fmt(clean(varOf(params) * 2))], 3),
      answer,
    };
  },
  solution: matchSolution,
};

const approxMomentsTree: Generator<MatchNormalParams> = {
  id: 'dist-approx-moments-tree',
  sample: sampleMatch,
  render: (params): Slide => {
    const { n, p, sigma, words, setting } = params;
    const mu = meanOf(params);
    const v = varOf(params);
    const answer = [fmt(mu), fmt(v), String(sigma)];
    return {
      kind: 'tree',
      prompt: [say(`${opening(words, setting, n, p)} From the top: the mean $np$, then the variance $np(1 - p)$, then the standard deviation $\\sigma$ of the matching normal.`)],
      expression: 'Y \\sim N(np, np(1 - p))',
      nodes: [
        { id: 'mu', from: [] },
        { id: 'var', from: ['mu'] },
        { id: 'sd', from: ['var'] },
      ],
      bank: decimalBank(answer, [clean(n * comp(p)), clean(mu * p), clean(v / 2), sigma + 1, clean(2 * sigma)], 3),
      answer,
    };
  },
  solution: matchSolution,
};

/* ---------- Level 4, lesson 4: the continuity correction ---------- */

type CcRel = Side | 'eq' | 'between';

/** An event for X: `r` alone, or from `r` to `s` inclusive for `between`. */
interface CcEvent {
  rel: CcRel;
  r: number;
  s: number;
}

/** The corrected event for Y: Y > lo, Y < hi, or both. */
function corrected({ rel, r, s }: CcEvent): { lo?: number; hi?: number } {
  switch (rel) {
    case 'le':
      return { hi: r + 0.5 };
    case 'lt':
      return { hi: r - 0.5 };
    case 'ge':
      return { lo: r - 0.5 };
    case 'gt':
      return { lo: r + 0.5 };
    case 'eq':
      return { lo: r - 0.5, hi: r + 0.5 };
    case 'between':
      return { lo: r - 0.5, hi: s + 0.5 };
  }
}

function xEventTex({ rel, r, s }: CcEvent): string {
  if (rel === 'eq') return `P(X = ${r})`;
  if (rel === 'between') return `P(${r} \\le X \\le ${s})`;
  return `P(X ${SIDE_TEX[rel]} ${r})`;
}

function xEventWords({ rel, r, s }: CcEvent): string {
  const words: Record<CcRel, string> = {
    le: `at most $${r}$`,
    lt: `fewer than $${r}$`,
    ge: `at least $${r}$`,
    gt: `more than $${r}$`,
    eq: `exactly $${r}$`,
    between: `between $${r}$ and $${s}$ inclusive`,
  };
  return words[rel];
}

/** The event as the prompt names it: in symbols, or "the probability that X is ...". */
const eventText = (event: CcEvent, words: boolean): string =>
  words ? `the probability that $X$ is ${xEventWords(event)}` : `$${xEventTex(event)}$`;

function yEventTex({ lo, hi }: { lo?: number; hi?: number }): string {
  if (lo !== undefined && hi !== undefined) return `P(${fmt(lo)} < Y < ${fmt(hi)})`;
  if (hi !== undefined) return `P(Y < ${fmt(hi)})`;
  return `P(Y > ${fmt(lo!)})`;
}

/** Why the correction lands where it does, for a solution. */
function ccWhy({ rel, r, s }: CcEvent): string {
  const why: Record<CcRel, string> = {
    le: `$X \\le ${r}$ takes in the bar at $${r}$, which runs up to $${r + 0.5}$.`,
    lt: `Fewer than $${r}$ is $X \\le ${r - 1}$, and the bar at $${r - 1}$ runs up to $${r - 0.5}$.`,
    ge: `$X \\ge ${r}$ takes in the bar at $${r}$, which starts at $${r - 0.5}$.`,
    gt: `More than $${r}$ is $X \\ge ${r + 1}$, and the bar at $${r + 1}$ starts at $${r + 0.5}$.`,
    eq: `$X = ${r}$ is the single bar at $${r}$, which runs from $${r - 0.5}$ to $${r + 0.5}$.`,
    between: `The bars from $${r}$ to $${s}$ run from $${r - 0.5}$ to $${s + 0.5}$.`,
  };
  return why[rel];
}

interface CcParams {
  n: number;
  p: number;
  event: CcEvent;
  words: boolean;
}

/** A binomial with both np and n(1 - p) above 5, and an event near its mean. */
function sampleCc(rng: Rng, rels: CcRel[], words: boolean): CcParams {
  for (;;) {
    const n = rng.int(4, 30) * 10;
    const p = rng.pick(TENTHS);
    if (!approxOk(n, p)) continue;
    const mu = clean(n * p);
    const sd = Math.sqrt(varOf({ n, p }));
    const rel = rng.pick(rels);
    const r = Math.round(mu + rng.int(-Math.ceil(2 * sd), Math.ceil(2 * sd)));
    const s = rel === 'between' ? r + rng.int(1, 4) : r;
    if (r < 2 || s > n - 2) continue;
    return { n, p, event: { rel, r, s }, words };
  }
}

const ccPrompt = ({ n, p }: CcParams): string => `$${bTex(n, p)}$ is approximated by $${nApprox(n, p)}$.`;

function ccSolution(params: CcParams): SolutionStep[] {
  const { event } = params;
  return [
    { text: `Each whole number $k$ is a bar from $k - 0.5$ to $k + 0.5$. ${ccWhy(event)}` },
    { tex: aligned(`& ${xEventTex(event)}`, `&\\approx ${yEventTex(corrected(event))}`) },
  ];
}

const ccChoice: Generator<CcParams> = {
  id: 'dist-cc-choice',
  sample: (rng, difficulty) =>
    difficulty > 1 ? sampleCc(rng, ['le', 'lt', 'ge', 'gt', 'eq', 'between'], true) : sampleCc(rng, ['le', 'ge'], false),
  render: (params): Slide => {
    const { event, words } = params;
    const { r, s } = event;
    const right = corrected(event);
    let wrong: { lo?: number; hi?: number }[];
    if (right.lo !== undefined && right.hi !== undefined) {
      wrong =
        event.rel === 'eq'
          ? [{ lo: r, hi: r + 1 }, { lo: r - 1, hi: r }, { hi: r + 0.5 }]
          : [{ lo: r + 0.5, hi: s - 0.5 }, { lo: r - 0.5, hi: s - 0.5 }, { lo: r + 0.5, hi: s + 0.5 }];
    } else {
      const b = right.lo ?? right.hi!;
      const other = 2 * r - b;
      wrong =
        right.hi !== undefined
          ? [{ hi: other }, { hi: r }, { lo: b }]
          : [{ lo: other }, { lo: r }, { hi: b }];
    }
    return choiceSlide(
      [say(`${ccPrompt(params)} With the continuity correction, which gives ${eventText(event, words)}?`)],
      options({ tex: yEventTex(right) }, ...wrong.map((y) => ({ tex: yEventTex(y) }))),
    );
  },
  solution: ccSolution,
};

const ccFlow: Generator<CcParams> = {
  id: 'dist-cc-flow',
  sample: (rng, difficulty) => sampleCc(rng, difficulty > 1 ? ['lt', 'gt', 'lt', 'gt', 'le', 'ge'] : ['le', 'ge'], true),
  render: (params): Slide => {
    const { event } = params;
    const { rel, r } = event;
    const key = `${params.n}|${params.p}|${rel}|${r}`;
    const whole = [`$X \\le ${r}$`, `$X \\le ${r - 1}$`, `$X \\ge ${r}$`, `$X \\ge ${r + 1}$`];
    const rightWhole = { le: whole[0], lt: whole[1], ge: whole[2], gt: whole[3] }[rel as Side];
    const { lo, hi } = corrected(event);
    const under = hi !== undefined;
    const c = (under ? hi : lo)!;
    const ys = under
      ? [`$Y < ${fmt(c)}$`, `$Y < ${fmt(c - 1)}$`, `$Y > ${fmt(c)}$`, `$Y > ${fmt(c - 1)}$`]
      : [`$Y > ${fmt(c)}$`, `$Y > ${fmt(c + 1)}$`, `$Y < ${fmt(c)}$`, `$Y < ${fmt(c + 1)}$`];
    return {
      kind: 'flow',
      prompt: [say(`${ccPrompt(params)} Find the event for $Y$ that gives ${eventText(event, true)}.`)],
      subject: `X \\text{ is ${xEventWords(event).replace(/\$/g, '')}}`,
      steps: [
        {
          id: 'whole',
          ask: 'As whole numbers, which values of $X$ count?',
          branches: turned(whole.map((label) => ({ label, to: 'cc' })), key),
        },
        {
          id: 'cc',
          ask: 'With the continuity correction, which event for $Y$?',
          branches: turned(
            ys.map((label) => ({ label, outcome: `So the probability is approximated by ${label.replace(/^\$/, '$P(').replace(/\$$/, ')$')}.` })),
            `${key}cc`,
          ),
        },
      ],
      answer: [rightWhole, ys[0]],
    };
  },
  solution: ccSolution,
};

interface CcLineParams extends CcParams {
  /** The left end of the six-unit window, a whole number. */
  min: number;
}

/** The corrected event as a number-line set, every end open. */
function ccSet(event: CcEvent): string {
  const { lo, hi } = corrected(event);
  return canonicalSet(`(${lo === undefined ? '-inf' : fmt(lo)},${hi === undefined ? 'inf' : fmt(hi)})`)!;
}

const ccLine: Generator<CcLineParams> = {
  id: 'dist-cc-line',
  sample: (rng, difficulty) => {
    const base = difficulty > 1 ? sampleCc(rng, ['lt', 'gt', 'eq', 'between'], true) : sampleCc(rng, ['le', 'ge'], false);
    const { lo, hi } = corrected(base.event);
    const ends = [lo, hi].filter((e): e is number => e !== undefined);
    // Every end strictly inside a window of twelve half-steps, the first tick whole.
    const min = rng.int(Math.ceil(Math.max(...ends) + 0.5 - 6), Math.floor(Math.min(...ends) - 0.5));
    return { ...base, min };
  },
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      say(
        `${ccPrompt(params)} Shade the values of $Y$ that give ${eventText(params.event, params.words)}, with the continuity correction. $Y$ is continuous, so an end carries no probability of its own: leave every end dot hollow.`,
      ),
    ],
    min: params.min,
    max: params.min + 6,
    step: 0.5,
    answer: ccSet(params.event),
  }),
  solution: (params) => {
    const { lo, hi } = corrected(params.event);
    return [
      ...ccSolution(params),
      {
        text:
          lo !== undefined && hi !== undefined
            ? `So shade from $${fmt(lo)}$ to $${fmt(hi)}$, with hollow dots at both ends.`
            : `So put a hollow dot at $${fmt((lo ?? hi)!)}$ and shade ${lo !== undefined ? 'right' : 'left'} off the end of the line.`,
      },
    ];
  },
};

interface CcBoundaryParams extends CcParams {
  /** Which end is asked, for a two-sided event. */
  end: 'lo' | 'hi';
}

const ccBoundary: Generator<CcBoundaryParams> = {
  id: 'dist-cc-boundary',
  sample: (rng, difficulty) => ({
    ...(difficulty > 1 ? sampleCc(rng, ['lt', 'gt', 'eq', 'between'], true) : sampleCc(rng, ['le', 'ge'], rng.chance(0.3))),
    end: rng.pick<CcBoundaryParams['end']>(['lo', 'hi']),
  }),
  render: (params): Slide => {
    const { event, words, end } = params;
    const { lo, hi } = corrected(event);
    const both = lo !== undefined && hi !== undefined;
    const shape = both ? 'P(a < Y < b)' : hi !== undefined ? 'P(Y < b)' : 'P(Y > b)';
    const letter = both && end === 'lo' ? 'a' : 'b';
    const value = both ? (end === 'lo' ? lo : hi) : (lo ?? hi);
    return {
      kind: 'expression',
      prompt: [say(`${ccPrompt(params)} With the continuity correction, ${eventText(event, words)} is approximated by $${shape}$. Find $${letter}$.`)],
      lead: `${letter} =`,
      keypad: [],
      answer: fmt(value!),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ccSolution,
};

/* ---------- Level 4, lesson 5: the whole route ---------- */

interface RouteParams {
  n: number;
  p: number;
  sigma: number;
  event: CcEvent;
  words: boolean;
  setting: number;
}

/** The z at each corrected boundary, lower first. */
function routeZs({ n, p, sigma, event }: RouteParams): number[] {
  const mu = meanOf({ n, p });
  const { lo, hi } = corrected(event);
  return [lo, hi].filter((b): b is number => b !== undefined).map((b) => clean((b - mu) / sigma));
}

/**
 * A route question: a pair whose sigma is whole, an event near the mean, and
 * every corrected boundary at a z of at most two places and at most 2.5 from
 * the mean. Anything else is refused and drawn again.
 */
function sampleRoute(rng: Rng, difficulty: number, rels: CcRel[]): RouteParams {
  for (;;) {
    const { n, p, sigma } = drawPair(rng, ROUTE_PAIRS);
    const mu = meanOf({ n, p });
    const rel = rng.pick(rels);
    const r = mu + rng.int(-Math.floor(2.4 * sigma), Math.floor(2.4 * sigma));
    const s = rel === 'between' ? r + rng.int(1, 2 * sigma) : r;
    if (r < 1 || s > n - 1) continue;
    const params: RouteParams = { n, p, sigma, event: { rel, r, s }, words: difficulty > 1, setting: rng.int(0, LARGE_SETTINGS.length - 1) };
    const zs = routeZs(params);
    if (zs.some((z) => !terminates(z, 2) || Math.abs(z) > 2.5 || Math.abs(z) < 0.05)) continue;
    return params;
  }
}

/** The probability, read from the quoted Phi values. */
function routeValue(params: RouteParams): number {
  const { lo, hi } = corrected(params.event);
  const zs = routeZs(params);
  if (lo !== undefined && hi !== undefined) return clean(below(zs[1]) - below(zs[0]));
  if (hi !== undefined) return below(zs[0]);
  return clean(1 - below(zs[0]));
}

/** The distinct |z| a route question quotes Phi at. */
const routeQuotes = (params: RouteParams): number[] => [...new Set(routeZs(params).map(Math.abs))].sort((a, b) => a - b);

function routeSolution(params: RouteParams): SolutionStep[] {
  const { n, p, sigma, event } = params;
  const mu = meanOf({ n, p });
  const { lo, hi } = corrected(event);
  const zs = routeZs(params);
  const bounds = [lo, hi].filter((b): b is number => b !== undefined);
  const steps: SolutionStep[] = [
    { text: `$np = ${fmt(mu)}$ and $n(1 - p) = ${fmt(clean(n - mu))}$ are both above $5$, so approximate by $${nApprox(n, p)}$, with $\\sigma = ${sigma}$.` },
    { tex: aligned(`& ${xEventTex(event)}`, `&\\approx ${yEventTex({ lo, hi })}`) },
    ...bounds.map((b, i) => ({ tex: aligned(`z &= \\frac{${fmt(b)} - ${fmt(mu)}}{${sigma}}`, `&= ${fmt(zs[i])}`) })),
  ];
  const lower = (z: number) => (z >= 0 ? `\\Phi(${fmt(z)})` : `1 - \\Phi(${fmt(-z)})`);
  if (bounds.length === 2) {
    steps.push({ tex: aligned(`& (${lower(zs[1])})`, `&\\quad - (${lower(zs[0])})`, `&= ${fmt(below(zs[1]))} - ${fmt(below(zs[0]))}`, `&= ${fmt(routeValue(params))}`) });
  } else if (hi !== undefined) {
    steps.push({ tex: aligned(`& P(Z < ${fmt(zs[0])})`, `&= ${lower(zs[0])}`, `&= ${fmt(routeValue(params))}`) });
  } else {
    steps.push({ tex: aligned(`& P(Z > ${fmt(zs[0])})`, `&= 1 - P(Z < ${fmt(zs[0])})`, `&= 1 - ${fmt(below(zs[0]))}`, `&= ${fmt(routeValue(params))}`) });
  }
  return steps;
}

const ONE_SIDED: Side[] = ['le', 'lt', 'ge', 'gt'];

const approxProb: Generator<RouteParams> = {
  id: 'dist-approx-prob',
  sample: (rng, difficulty) => sampleRoute(rng, difficulty, difficulty > 1 ? ['le', 'lt', 'ge', 'gt', 'eq', 'between'] : ['le', 'ge']),
  render: (params): Slide => {
    const { n, p, event, words, setting } = params;
    return {
      kind: 'expression',
      prompt: [
        say(`${opening(words, setting, n, p)} Use a normal approximation, with a continuity correction, to find ${eventText(event, words)}. Use`),
        show(quoteTex(routeQuotes(params))),
      ],
      lead: `${xEventTex(event)} \\approx`,
      keypad: [],
      answer: fmt(routeValue(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: routeSolution,
  choices: (params) => {
    const value = routeValue(params);
    const quoted = routeQuotes(params).map(phi);
    return decimalChoices(value, [clean(1 - value), ...quoted, ...quoted.map((q) => clean(1 - q))]);
  },
};

const approxRouteTree: Generator<RouteParams> = {
  id: 'dist-approx-route-tree',
  sample: (rng, difficulty) => sampleRoute(rng, difficulty, difficulty > 1 ? ONE_SIDED : ['le', 'ge']),
  render: (params): Slide => {
    const { n, p, sigma, event, words, setting } = params;
    const { lo, hi } = corrected(event);
    const b = (lo ?? hi)!;
    const [z] = routeZs(params);
    const value = routeValue(params);
    const mu = meanOf({ n, p });
    const answer = [fmt(b), fmt(z), fmt(value)];
    const other = 2 * event.r - b;
    return {
      kind: 'tree',
      prompt: [
        say(
          `${opening(words, setting, n, p)} It is approximated by $${nApprox(n, p)}$, with $\\sigma = ${sigma}$. For ${eventText(event, words)}, from the top: the corrected boundary $b$, then its $z$, then the probability. Use`,
        ),
        show(quoteTex(routeQuotes(params))),
      ],
      expression: `${xEventTex(event)} \\approx P(Y ${hi !== undefined ? '<' : '>'} b)`,
      nodes: [
        { id: 'b', from: [] },
        { id: 'z', from: ['b'] },
        { id: 'P', from: ['z'] },
      ],
      bank: decimalBank(answer, [other, event.r, -z, clean((other - mu) / sigma), clean(1 - value)], 3, false),
      answer,
    };
  },
  solution: routeSolution,
};

const approxStandardise: Generator<RouteParams> = {
  id: 'dist-approx-standardise-steps',
  sample: (rng, difficulty) => sampleRoute(rng, difficulty, difficulty > 1 ? ONE_SIDED : ['le', 'ge']),
  render: (params): Slide => {
    const { n, p, sigma, event, words, setting } = params;
    const { lo, hi } = corrected(event);
    const b = (lo ?? hi)!;
    const mu = meanOf({ n, p });
    const d = clean(b - mu);
    const [z] = routeZs(params);
    const up = event.rel === 'le' || event.rel === 'gt';
    const other = 2 * event.r - b;
    const slip = clean(d / (sigma * sigma));
    return {
      kind: 'steps',
      prompt: [
        say(
          `${opening(words, setting, n, p)} It is approximated by $${nApprox(n, p)}$. For ${eventText(event, words)}, correct the boundary, then standardise it with $z = (b - \\mu) \\div \\sigma$. Tap the part to do next, then choose what it comes to.`,
        ),
      ],
      start: ['(', String(event.r), up ? '+' : '-', '0.5', '-', fmt(mu), ')', '\\div', String(sigma)],
      reductions: [
        { span: [1, 4], operator: 2, value: fmt(b), bank: stepBank(fmt(b), fmt(other), String(event.r), fmt(b + 1), fmt(b - 1)) },
        { span: [0, 5], operator: 2, value: fmt(d), bank: stepBank(fmt(d), fmt(-d), fmt(clean(b + mu)), fmt(clean(d + 1))) },
        {
          span: [0, 3],
          operator: 1,
          value: fmt(z),
          bank: stepBank(fmt(z), fmt(-z), fmt(clean(d * sigma)), terminates(slip, 4) && slip !== z ? fmt(slip) : fmt(clean(z + 0.1))),
        },
      ],
    };
  },
  solution: routeSolution,
};

const approxPlan: Generator<RouteParams> = {
  id: 'dist-approx-plan',
  sample: (rng, difficulty) => sampleRoute(rng, difficulty, difficulty > 1 ? ONE_SIDED : ['le', 'ge']),
  render: (params): Slide => {
    const { n, p, sigma, event, words, setting } = params;
    const mu = fmt(meanOf({ n, p }));
    const v = fmt(varOf({ n, p }));
    const { lo, hi } = corrected(event);
    const b = (lo ?? hi)!;
    const other = 2 * event.r - b;
    const [z] = routeZs(params);
    const u = fmt(Math.abs(z));
    const op = hi !== undefined ? '<' : '>';
    const opp = hi !== undefined ? '>' : '<';
    const forms = [`$\\Phi(${u})$`, `$1 - \\Phi(${u})$`, `$\\Phi(${u}) - 0.5$`];
    // P(Y < b) is Phi(|z|) above the mean and 1 - Phi(|z|) below it; P(Y > b) the other way round.
    const direct = (hi !== undefined) === z > 0;
    const key = `${n}|${p}|${event.rel}|${event.r}|${words}|${setting}`;
    return {
      kind: 'flow',
      prompt: [say(`${opening(words, setting, n, p)} Plan how to approximate ${eventText(event, words)}.`)],
      subject: xEventTex(event),
      steps: [
        {
          id: 'normal',
          ask: 'Which normal distribution matches $X$?',
          branches: turned([`$N(${mu}, ${v})$`, `$N(${mu}, ${sigma})$`, `$N(${mu}, ${mu})$`].map((label) => ({ label, to: 'cc' })), key),
        },
        {
          id: 'cc',
          ask: 'With the continuity correction, which event for $Y$?',
          branches: turned([`$Y ${op} ${fmt(b)}$`, `$Y ${op} ${fmt(other)}$`, `$Y ${opp} ${fmt(b)}$`].map((label) => ({ label, to: 'phi' })), `${key}cc`),
        },
        {
          id: 'phi',
          ask: 'Standardise the boundary. Which gives the probability?',
          branches: turned(forms.map((label) => ({ label, outcome: `So the probability is ${label}.` })), `${key}phi`),
        },
      ],
      answer: [`$N(${mu}, ${v})$`, `$Y ${op} ${fmt(b)}$`, direct ? forms[0] : forms[1]],
    };
  },
  solution: routeSolution,
};

/* ================================================================
 * Level 5: sums and differences of independent normals
 * ================================================================ */

/** Any letter's normal, `W \sim N(mu, sigma^2)`: the second number is always the variance. */
const nOf = (name: string, mu: number, sigma: number): string => `${name} \\sim N(${fmt(mu)}, ${fmt(sigma * sigma)})`;

/**
 * Pythagorean triples (p, q, s). A combination aX + bY with a sigma_X = p and
 * |b| sigma_Y = q has variance p^2 + q^2 = s^2, so its standard deviation s
 * is whole. Every level 5 draw is built from one, and refused unless the
 * variance really is a square.
 */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [9, 12, 15],
  [8, 15, 17],
  [12, 16, 20],
  [15, 20, 25],
  [7, 24, 25],
  [10, 24, 26],
  [20, 21, 29],
  [16, 30, 34],
  [30, 40, 50],
  [14, 48, 50],
];

/** The triples whose s divides 100, so every whole distance from the mean has a z of at most two places. */
const ROUND_TRIPLES = TRIPLES.filter(([, , s]) => 100 % s === 0);

/** The triples small enough for a context's means to sit well clear of zero. */
const SMALL_TRIPLES = TRIPLES.filter(([, , s]) => s <= 25);

/** A combination aX + bY + c of independent X ~ N(mx, sx^2) and Y ~ N(my, sy^2); b = 0 for one variable. */
interface Combo {
  a: number;
  b: number;
  c: number;
  mx: number;
  sx: number;
  my: number;
  sy: number;
}

const comboMean = (p: Combo): number => p.a * p.mx + p.b * p.my + p.c;
const comboVar = (p: Combo): number => p.a * p.a * p.sx * p.sx + p.b * p.b * p.sy * p.sy;
const isSquare = (value: number): boolean => Number.isInteger(Math.sqrt(value));
/** Whole by construction: a draw whose variance is not a square is refused. */
const comboSd = (p: Combo): number => Math.round(Math.sqrt(comboVar(p)));

/** aX + bY + c as the learner reads it: `2X - 3Y + 5`, `X + Y`, `-2X + 400`. */
function comboTex({ a, b, c }: Pick<Combo, 'a' | 'b' | 'c'>): string {
  const term = (k: number, v: string): string => (Math.abs(k) === 1 ? v : `${Math.abs(k)}${v}`);
  let out = `${a < 0 ? '-' : ''}${term(a, 'X')}`;
  if (b !== 0) out += ` ${b < 0 ? '-' : '+'} ${term(b, 'Y')}`;
  if (c !== 0) out += ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
  return out;
}

/** A coefficient times a number, as a term of a sum: `3 \times 40`, `- 40`. */
function termTex(k: number, v: number, first: boolean): string {
  const size = Math.abs(k) === 1 ? fmt(v) : `${Math.abs(k)} \\times ${fmt(v)}`;
  if (first) return k < 0 ? `-${size}` : size;
  return `${k < 0 ? '-' : '+'} ${size}`;
}

/** A coefficient squared, bracketed when negative. */
const sqTex = (k: number): string => (k < 0 ? `(${k})^2` : `${k}^2`);

function meanLines(p: Combo, name: string): string[] {
  // The first term on its own line and the rest under it, so the sum never runs off a phone.
  const rest: string[] = [];
  if (p.b !== 0) rest.push(termTex(p.b, p.my, false));
  if (p.c !== 0) rest.push(`${p.c < 0 ? '-' : '+'} ${Math.abs(p.c)}`);
  const first = `\\mathrm{E}(${name}) &= ${termTex(p.a, p.mx, true)}`;
  return [...(rest.length ? [first, `&\\quad ${rest.join(' ')}`] : [first]), `&= ${fmt(comboMean(p))}`];
}

function varLines(p: Combo, name: string): string[] {
  const lines = [`\\mathrm{Var}(${name}) &= ${sqTex(p.a)} \\times ${p.sx * p.sx}`];
  if (p.b !== 0) lines.push(`&\\; + ${sqTex(p.b)} \\times ${p.sy * p.sy}`);
  return [...lines, `&= ${comboVar(p)}`, `\\sigma_{${name}} &= \\sqrt{${comboVar(p)}}`, `&= ${comboSd(p)}`];
}

function comboSolution(p: Combo, name = 'W'): SolutionStep[] {
  return [
    {
      text: `The mean follows the combination. Each variance is multiplied by its coefficient **squared**, and they add even where the coefficient is negative; a constant moves the mean and leaves the spread alone.`,
    },
    { tex: aligned(...meanLines(p, name)) },
    { tex: aligned(...varLines(p, name)) },
  ];
}

type Ask = 'mean' | 'var' | 'sd';

const WANTED: Record<Ask, (name: string) => string> = {
  mean: (name) => `the mean of $${name}$`,
  var: (name) => `the variance of $${name}$`,
  sd: (name) => `the standard deviation of $${name}$`,
};

const LEAD: Record<Ask, (name: string) => string> = {
  mean: (name) => `\\mathrm{E}(${name}) =`,
  var: (name) => `\\mathrm{Var}(${name}) =`,
  sd: (name) => `\\sigma_{${name}} =`,
};

const askValue = (p: Combo, ask: Ask): number => (ask === 'mean' ? comboMean(p) : ask === 'var' ? comboVar(p) : comboSd(p));

/* ---------- Level 5, lesson 1: aX + b ---------- */

interface LinearParams extends Combo {
  setting: number;
  words: boolean;
  ask: Ask;
}

/**
 * Settings where one measurement is scaled and shifted. The rule is written
 * as `W = aX + b` inside the sentence, never as a count of separate items:
 * "3 apples" would be a total of three copies, which is lesson 4's point.
 */
const LINEAR_SETTINGS: { as: number[]; c: (rng: Rng, a: number, mx: number, sx: number) => number; text: (w: string) => string }[] = [
  {
    as: [2, 3],
    c: (rng) => rng.int(2, 6),
    text: (w) => `A taxi ride is $X$ km long, and the fare in pounds is a fixed charge plus a rate per km, $${w}$`,
  },
  {
    as: [20, 30, 40, 50],
    c: (rng) => 5 * rng.int(4, 12),
    text: (w) => `A plumber spends $X$ hours on a job and charges a call-out fee plus an hourly rate, so the bill in pounds is $${w}$`,
  },
  {
    as: [2, 3, 5],
    c: (rng, a, mx) => -5 * rng.int(1, Math.floor((a * mx) / 10)),
    text: (w) => `A club sells $X$ raffle tickets at a fixed price, having already paid for the prizes, so its profit in pounds is $${w}$`,
  },
  {
    as: [-2, -5, -10],
    c: (rng, a, mx, sx) => 10 * Math.ceil((Math.abs(a) * (mx + 4 * sx)) / 10) + 10 * rng.int(0, 10),
    text: (w) => `A full tank has $X$ buckets of water drawn off, all the same size, so the number of litres left is $${w}$`,
  },
  {
    as: [-2, -3, -4],
    c: (rng, a, mx, sx) => 10 * Math.ceil((Math.abs(a) * (mx + 4 * sx)) / 10) + 10 * rng.int(0, 5),
    text: (w) => `A quiz starts each player on a fixed score and takes points off for each of their $X$ wrong answers, so the final score is $${w}$`,
  },
];

const LINEAR_SIGMAS = [2, 3, 4, 5, 6, 8, 10];

function sampleLinear(rng: Rng, difficulty: number): LinearParams {
  const sx = rng.pick(LINEAR_SIGMAS);
  const mx = drawMu(rng, sx);
  const base = { b: 0, my: 0, sy: 0, mx, sx };
  if (difficulty > 1) {
    const setting = rng.int(0, LINEAR_SETTINGS.length - 1);
    const { as, c } = LINEAR_SETTINGS[setting];
    const a = rng.pick(as);
    return { ...base, a, c: c(rng, a, mx, sx), setting, words: true, ask: rng.pick<Ask>(['var', 'sd']) };
  }
  const a = rng.pick([2, 3, 4, 5]);
  const c = rng.chance(0.5) ? rng.int(1, 30) : -rng.int(1, Math.min(30, a * mx - 1));
  return { ...base, a, c, setting: 0, words: false, ask: rng.pick<Ask>(['mean', 'var']) };
}

const linearW = (p: Combo): string => `W = ${comboTex(p)}`;

function linearOpening(p: LinearParams): string {
  const x = `$X \\sim N(${p.mx}, ${p.sx * p.sx})$`;
  return p.words ? `${LINEAR_SETTINGS[p.setting].text(linearW(p))}, where ${x}.` : `${x} and $${linearW(p)}$.`;
}

function linearSolution(p: LinearParams): SolutionStep[] {
  return [
    { text: `Multiplying by $${p.a}$ multiplies the mean by $${p.a}$ and the variance by $${sqTex(p.a)} = ${p.a * p.a}$, so $\\sigma$ is multiplied by $${Math.abs(p.a)}$. Adding $${p.c}$ moves the mean and leaves the spread alone.` },
    { tex: aligned(...meanLines(p, 'W')) },
    { tex: aligned(...varLines(p, 'W')) },
  ];
}

const linMoment: Generator<LinearParams> = {
  id: 'dist-lin-moment',
  sample: sampleLinear,
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`${linearOpening(p)} Find ${WANTED[p.ask]('W')}.`)],
    lead: LEAD[p.ask]('W'),
    keypad: [],
    answer: fmt(askValue(p, p.ask)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: linearSolution,
  choices: (p) => {
    const { a, c, mx, sx } = p;
    const v = sx * sx;
    const slips: Record<Ask, number[]> = {
      mean: [a * mx, mx + c, a * (mx + c)],
      var: [Math.abs(a) * v, a * a * v + Math.abs(c), v, a * a * sx],
      sd: [a * a * sx, sx, Math.abs(a) * v],
    };
    return decimalChoices(askValue(p, p.ask), slips[p.ask], p.ask !== 'mean');
  },
};

const linNormal: Generator<LinearParams> = {
  id: 'dist-lin-normal',
  sample: sampleLinear,
  render: (p): Slide => {
    const e = fmt(comboMean(p));
    const v = comboVar(p);
    return choiceSlide(
      [say(`${linearOpening(p)} Which distribution does $W$ have?`)],
      options(
        { tex: `W \\sim N(${e}, ${v})` },
        { tex: `W \\sim N(${e}, ${Math.abs(p.a) * p.sx * p.sx})` },
        { tex: `W \\sim N(${e}, ${comboSd(p)})` },
        { tex: `W \\sim N(${fmt(p.a * p.mx)}, ${v})` },
        { tex: `W \\sim N(${e}, ${v + Math.abs(p.c)})` },
      ).slice(0, 4),
    );
  },
  solution: linearSolution,
};

const linSpreadTree: Generator<LinearParams> = {
  id: 'dist-lin-spread-tree',
  sample: sampleLinear,
  render: (p): Slide => {
    const { a, sx } = p;
    const v = sx * sx;
    const answer = [fmt(a * a), fmt(a * a * v), fmt(Math.abs(a) * sx)];
    return {
      kind: 'tree',
      prompt: [say(`${linearOpening(p)} From the top: the factor the variance is multiplied by, then $\\mathrm{Var}(W)$, then the standard deviation of $W$.`)],
      expression: '\\mathrm{Var}(W) = a^2\\,\\mathrm{Var}(X)',
      nodes: [
        { id: 'factor', from: [] },
        { id: 'var', from: ['factor'] },
        { id: 'sd', from: ['var'] },
      ],
      bank: decimalBank(answer, [a, a * v, a * a * sx, sx, -Math.abs(a) * sx, Math.abs(a) * v], 3, false),
      answer,
    };
  },
  solution: linearSolution,
};

const linEffectFlow: Generator<LinearParams> = {
  id: 'dist-lin-effect-flow',
  sample: sampleLinear,
  render: (p): Slide => {
    const { a, c, mx, sx } = p;
    const v = sx * sx;
    const cTex = `${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
    const key = `${a}|${c}|${mx}|${sx}|${p.words}|${p.setting}`;
    const mean = [`$${a} \\times ${mx} ${cTex} = ${comboMean(p)}$`, `$${a} \\times ${mx} = ${a * mx}$`, `$${mx} ${cTex} = ${mx + c}$`];
    const variance = [`$${sqTex(a)} \\times ${v} = ${a * a * v}$`, `$${a} \\times ${v} = ${a * v}$`, `$${sqTex(a)} \\times ${v} ${cTex} = ${a * a * v + c}$`];
    const sd =
      a < 0
        ? [`$${Math.abs(a)} \\times ${sx} = ${Math.abs(a) * sx}$`, `$${a} \\times ${sx} = ${a * sx}$`, `$${sqTex(a)} \\times ${sx} = ${a * a * sx}$`]
        : [`$${a} \\times ${sx} = ${a * sx}$`, `$${sx}$, unchanged`, `$${sqTex(a)} \\times ${sx} = ${a * a * sx}$`];
    return {
      kind: 'flow',
      prompt: [say(`${linearOpening(p)} Work out the distribution of $W$ one step at a time.`)],
      subject: linearW(p),
      steps: [
        { id: 'mean', ask: 'What is the mean of $W$?', branches: turned(mean.map((label) => ({ label, to: 'var' })), `${key}m`) },
        { id: 'var', ask: 'What is its variance?', branches: turned(variance.map((label) => ({ label, to: 'sd' })), `${key}v`) },
        {
          id: 'sd',
          ask: 'So what is its standard deviation?',
          branches: turned(sd.map((label) => ({ label, outcome: `So the standard deviation of $W$ is ${label}.` })), `${key}s`),
        },
      ],
      answer: [mean[0], variance[0], sd[0]],
    };
  },
  solution: linearSolution,
};

/* ---------- Level 5, lesson 2: X + Y and X - Y ---------- */

/**
 * Two independent measurements. `bx` and `by` are where their means sit, far
 * enough above 4 sigma for any triple with s up to 25.
 */
const PAIR_SETTINGS: { lead: string; bx: number; by: number; more: string; less: string }[] = [
  { lead: "An apple's mass $X$ and an orange's mass $Y$, in grams,", bx: 160, by: 190, more: 'the apple is heavier than the orange', less: 'the apple is lighter than the orange' },
  { lead: 'The time $X$ to walk to a bus stop and the time $Y$ spent on the bus, in seconds,', bx: 600, by: 640, more: 'the walk takes longer than the bus ride', less: 'the walk takes less time than the bus ride' },
  { lead: "A man's height $X$ and a woman's height $Y$, in mm,", bx: 1760, by: 1690, more: 'the man is taller than the woman', less: 'the man is shorter than the woman' },
  { lead: 'The length $X$ of a rod cut by machine A and the length $Y$ of a rod cut by machine B, in mm,', bx: 800, by: 780, more: 'the rod from A is the longer', less: 'the rod from A is the shorter' },
  { lead: 'The mass $X$ of an empty jar and the mass $Y$ of the jam put in it, in grams,', bx: 300, by: 340, more: 'the jar weighs more than the jam', less: 'the jar weighs less than the jam' },
  { lead: 'The lifetime $X$ of a brand A battery and the lifetime $Y$ of a brand B battery, in hours,', bx: 400, by: 380, more: 'the brand A battery lasts longer', less: 'the brand B battery lasts longer' },
];

interface PairParams extends Combo {
  setting: number;
  words: boolean;
  ask: Ask;
}

/** sigma_X and sigma_Y from a triple, either way round. */
function tripleSigmas(rng: Rng, triples: [number, number, number][]): [number, number] {
  const [p, q] = rng.pick(triples);
  return rng.chance(0.5) ? [p, q] : [q, p];
}

function samplePair(rng: Rng, difficulty: number): PairParams {
  const [sx, sy] = tripleSigmas(rng, SMALL_TRIPLES);
  const words = difficulty > 1;
  const setting = rng.int(0, PAIR_SETTINGS.length - 1);
  const { bx, by } = PAIR_SETTINGS[setting];
  const mx = words ? bx + rng.int(-20, 20) : drawMu(rng, sx);
  const my = words ? by + rng.int(-20, 20) : drawMu(rng, sy);
  const b = rng.pick([1, -1]);
  return { a: 1, b, c: 0, mx, sx, my, sy, setting: words ? setting : 0, words, ask: rng.pick<Ask>(words ? ['var', 'sd'] : ['mean', 'var']) };
}

function pairOpening(p: { mx: number; sx: number; my: number; sy: number; setting: number; words: boolean }): string {
  const dists = `$${nOf('X', p.mx, p.sx)}$ and $${nOf('Y', p.my, p.sy)}$`;
  return p.words ? `${PAIR_SETTINGS[p.setting].lead} are independent, with ${dists}.` : `${dists} are independent.`;
}

function pairSolution(p: PairParams): SolutionStep[] {
  return [
    {
      text:
        p.b < 0
          ? 'The means subtract, but the variances **add**: taking $Y$ away adds its uncertainty to that of $X$, it does not cancel it.'
          : 'For independent $X$ and $Y$, the means add and the variances add.',
    },
    { tex: aligned(...meanLines(p, 'W')) },
    { tex: aligned(...varLines(p, 'W')) },
  ];
}

const sumMoment: Generator<PairParams> = {
  id: 'dist-sum-moment',
  sample: samplePair,
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`${pairOpening(p)} $${linearW(p)}$. Find ${WANTED[p.ask]('W')}.`)],
    lead: LEAD[p.ask]('W'),
    keypad: [],
    answer: fmt(askValue(p, p.ask)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: pairSolution,
  choices: (p) => {
    const { b, mx, sx, my, sy } = p;
    const slips: Record<Ask, number[]> = {
      mean: [mx - b * my, my - mx, mx],
      var: [Math.abs(sx * sx - sy * sy), sx + sy, (sx + sy) ** 2, sx * sx],
      sd: [sx + sy, Math.abs(sx - sy), comboVar(p)],
    };
    return decimalChoices(askValue(p, p.ask), slips[p.ask], p.ask !== 'mean');
  },
};

const sumNormal: Generator<PairParams> = {
  id: 'dist-sum-normal',
  sample: samplePair,
  render: (p): Slide => {
    const { b, mx, sx, my, sy } = p;
    const e = fmt(comboMean(p));
    const v = comboVar(p);
    return choiceSlide(
      [say(`${pairOpening(p)} Which distribution does $${linearW(p)}$ have?`)],
      options(
        { tex: `W \\sim N(${e}, ${v})` },
        { tex: `W \\sim N(${e}, ${Math.abs(sx * sx - sy * sy)})` },
        { tex: `W \\sim N(${e}, ${sx + sy})` },
        { tex: b < 0 ? `W \\sim N(${fmt(mx + my)}, ${v})` : `W \\sim N(${e}, ${(sx + sy) ** 2})` },
        { tex: `W \\sim N(${e}, ${comboSd(p)})` },
      ).slice(0, 4),
    );
  },
  solution: pairSolution,
};

const sumVarTiles: Generator<PairParams> = {
  id: 'dist-sum-var-tiles',
  sample: samplePair,
  render: (p): Slide => {
    const { sx, sy } = p;
    const vx = sx * sx;
    const vy = sy * sy;
    const answer = [String(vx), '+', String(vy), String(vx + vy), String(comboSd(p))];
    return {
      kind: 'tiles',
      prompt: [say(`${pairOpening(p)} $${linearW(p)}$. Build $\\mathrm{Var}(W)$ from $\\mathrm{Var}(X)$ and $\\mathrm{Var}(Y)$, in that order, then its standard deviation.`)],
      template: '\\mathrm{Var}(W) = {0} {1} {2} = {3}, \\quad \\sigma_W = {4}',
      bank: tokenBank(answer, ['-', String(Math.abs(vx - vy)), String(sx + sy), String(Math.abs(sx - sy)), String((sx + sy) ** 2)], 4),
      answer,
    };
  },
  solution: pairSolution,
};

const sumTable: Generator<PairParams> = {
  id: 'dist-sum-table',
  sample: samplePair,
  render: (p): Slide => {
    const { mx, sx, my, sy } = p;
    const v = sx * sx + sy * sy;
    const hard = p.words;
    const rows: (string | null)[][] = [
      ['X + Y', null, null],
      ['X - Y', null, null],
      ...(hard ? [['Y - X', null, null]] : []),
    ];
    const answer = [fmt(mx + my), fmt(v), fmt(mx - my), fmt(v), ...(hard ? [fmt(my - mx), fmt(v)] : [])];
    return {
      kind: 'table',
      prompt: [say(`${pairOpening(p)} Fill in the mean and the variance of each combination.`)],
      columns: ['', '\\mathrm{E}', '\\mathrm{Var}'],
      rows,
      bank: decimalBank(answer, [hard ? mx : my - mx, Math.abs(sx * sx - sy * sy), sx + sy, comboSd({ ...p, b: 1 }), (sx + sy) ** 2], 3, false),
      answer,
    };
  },
  solution: (p) => {
    const plus = { ...p, b: 1 };
    const minus = { ...p, b: -1 };
    return [
      { text: 'The means add or subtract with the variables. The variances add every time, whichever way round the difference is taken.' },
      { tex: aligned(...meanLines(plus, 'X + Y')) },
      { tex: aligned(...meanLines(minus, 'X - Y')) },
      { tex: aligned(`\\mathrm{Var}(X \\pm Y) &= ${p.sx * p.sx} + ${p.sy * p.sy}`, `&= ${comboVar(plus)}`) },
    ];
  },
};

/* ---------- Level 5, lesson 3: aX + bY ---------- */

interface ComboParams extends Combo {
  ask: Ask;
}

/**
 * aX + bY + c from a triple: a sigma_X and |b| sigma_Y are the triple's legs,
 * so the variance is its hypotenuse squared. Any coefficient that would leave
 * a sigma below 2 is refused and drawn again.
 */
function drawCombo(rng: Rng, triples: [number, number, number][], as: number[], bs: number[], c: () => number): Combo {
  for (;;) {
    const [p, q] = tripleSigmas(rng, triples);
    const a = rng.pick(as);
    const b = rng.pick(bs);
    if (p % Math.abs(a) !== 0 || q % Math.abs(b) !== 0) continue;
    const sx = p / Math.abs(a);
    const sy = q / Math.abs(b);
    if (sx < 2 || sy < 2) continue;
    const combo = { a, b, c: c(), mx: drawMu(rng, sx), sx, my: drawMu(rng, sy), sy };
    if (isSquare(comboVar(combo))) return combo;
  }
}

function sampleCombo(rng: Rng, difficulty: number): ComboParams {
  const hard = difficulty > 1;
  const combo = drawCombo(rng, TRIPLES, [1, 2, 3, 4], hard ? [-4, -3, -2, 2, 3, 4] : [2, 3, 4], () =>
    hard && rng.chance(0.6) ? rng.sign() * rng.int(1, 50) : 0,
  );
  return { ...combo, ask: rng.pick<Ask>(hard ? ['var', 'sd'] : ['mean', 'var']) };
}

const comboOpening = (p: Combo): string => `$${nOf('X', p.mx, p.sx)}$ and $${nOf('Y', p.my, p.sy)}$ are independent, and $${linearW(p)}$.`;

const comboMoment: Generator<ComboParams> = {
  id: 'dist-combo-moment',
  sample: sampleCombo,
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`${comboOpening(p)} Find ${WANTED[p.ask]('W')}.`)],
    lead: LEAD[p.ask]('W'),
    keypad: [],
    answer: fmt(askValue(p, p.ask)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => comboSolution(p),
  choices: (p) => {
    const { a, b, c, mx, sx, my, sy } = p;
    const vx = sx * sx;
    const vy = sy * sy;
    const slips: Record<Ask, number[]> = {
      mean: [a * mx + b * my, a * mx - b * my + c, mx + my + c],
      var: [Math.abs(a * vx + b * vy), Math.abs(a * a * vx - b * b * vy), vx + vy, a * a * vx],
      sd: [Math.abs(a) * sx + Math.abs(b) * sy, Math.abs(a * sx + b * sy), comboVar(p)],
    };
    return decimalChoices(askValue(p, p.ask), slips[p.ask], p.ask !== 'mean');
  },
};

const comboNormal: Generator<ComboParams> = {
  id: 'dist-combo-normal',
  sample: sampleCombo,
  render: (p): Slide => {
    const { a, b, mx, sx, my, sy } = p;
    const e = fmt(comboMean(p));
    const v = comboVar(p);
    const vx = sx * sx;
    const vy = sy * sy;
    return choiceSlide(
      [say(`${comboOpening(p)} Which distribution does $W$ have?`)],
      options(
        { tex: `W \\sim N(${e}, ${v})` },
        { tex: `W \\sim N(${e}, ${Math.abs(a * vx + b * vy)})` },
        { tex: `W \\sim N(${e}, ${comboSd(p)})` },
        { tex: `W \\sim N(${e}, ${Math.abs(a * a * vx - b * b * vy)})` },
        { tex: `W \\sim N(${fmt(a * mx - b * my + p.c)}, ${v})` },
        { tex: `W \\sim N(${e}, ${a * vx + Math.abs(b) * vy + 1})` },
      ).slice(0, 4),
    );
  },
  solution: (p) => comboSolution(p),
};

const comboVarSteps: Generator<ComboParams> = {
  id: 'dist-combo-var-steps',
  sample: sampleCombo,
  render: (p): Slide => {
    const { a, b, sx, sy } = p;
    const vx = sx * sx;
    const vy = sy * sy;
    const first = a * a * vx;
    const second = b * b * vy;
    const total = first + second;
    return {
      kind: 'steps',
      prompt: [say(`${comboOpening(p)} Work out $\\mathrm{Var}(W)$. Tap the part to do next, then choose what it comes to.`)],
      start: [sqTex(a), '\\times', String(vx), '+', sqTex(b), '\\times', String(vy)],
      reductions: [
        { span: [0, 3], operator: 1, value: String(first), bank: stepBank(String(first), String(Math.abs(a) * vx), String(a * a + vx), String(2 * Math.abs(a) * vx + 1)) },
        { span: [2, 5], operator: 3, value: String(second), bank: stepBank(String(second), String(b * vy), String(b * b + vy), String(-second)) },
        { span: [0, 3], operator: 1, value: String(total), bank: stepBank(String(total), String(Math.abs(first - second)), String(total + 1), String(comboSd(p))) },
      ],
    };
  },
  solution: (p) => comboSolution(p),
};

const comboBuild: Generator<ComboParams> = {
  id: 'dist-combo-build',
  sample: sampleCombo,
  render: (p): Slide => {
    const { a, b, mx, sx, my, sy } = p;
    const answer = [fmt(comboMean(p)), String(comboVar(p)), String(comboSd(p))];
    return {
      kind: 'tiles',
      prompt: [say(`${comboOpening(p)} Build the distribution of $W$, and its standard deviation.`)],
      template: 'W \\sim N({0}, {1}), \\quad \\sigma_W = {2}',
      bank: tokenBank(
        answer,
        [
          fmt(a * mx - b * my + p.c),
          String(Math.abs(a * sx * sx + b * sy * sy)),
          String(Math.abs(a) * sx + Math.abs(b) * sy),
          String(Math.abs(a * a * sx * sx - b * b * sy * sy)),
          fmt(comboMean(p) + 10),
        ],
        3,
      ),
      answer,
    };
  },
  solution: (p) => comboSolution(p),
};

/* ---------- Level 5, lesson 4: a total of n copies ---------- */

/** Counts whose total has variance n sigma^2 a perfect square, so its sigma is whole. */
const SQUARE_COUNTS = [4, 9, 16, 25];

const TOTAL_SIGMAS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

/** Separate items added up. None of these says "once"; every scaled setting does, which the test leans on. */
const COPY_SETTINGS: { base: number; text: (n: number, name: string) => string }[] = [
  { base: 1000, text: (n, name) => `A bag of flour has mass $X$ grams. A box holds ${n} bags, and $${name}$ is their total mass.` },
  { base: 500, text: (n, name) => `A rod is $X$ mm long. ${n} rods are laid end to end, and $${name}$ is the length of the row.` },
  { base: 210, text: (n, name) => `A song on a playlist lasts $X$ seconds. $${name}$ is the time ${n} different songs take, played one after another.` },
  { base: 80, text: (n, name) => `A passenger has mass $X$ kg. $${name}$ is the total mass of ${n} passengers in a lift.` },
  { base: 180, text: (n, name) => `A cashier takes $X$ seconds to serve a customer. $${name}$ is the time taken to serve ${n} customers.` },
];

/** One measurement multiplied up. */
const SCALED_SETTINGS: { base: number; text: (n: number, name: string) => string }[] = [
  { base: 300, text: (n, name) => `A length on a plan is measured once, at $X$ mm, and multiplied by ${n} to give the real length $${name}$.` },
  { base: 120, text: (n, name) => `A parcel is weighed once, at $X$ grams, and the postage in pence is $${name}$, ${n} times that reading.` },
  { base: 40, text: (n, name) => `A cook weighs one spoonful of spice once, at $X$ grams, and a large batch uses ${n} times that mass, $${name}$.` },
];

interface TotalParams {
  n: number;
  mx: number;
  sx: number;
  scaled: boolean;
  setting: number;
  words: boolean;
  ask: Ask;
}

function sampleTotal(rng: Rng, difficulty: number, words = difficulty > 1): TotalParams {
  const hard = difficulty > 1;
  const sx = rng.pick(TOTAL_SIGMAS);
  const n = rng.pick(hard ? SQUARE_COUNTS : SQUARE_COUNTS.slice(0, 2));
  const scaled = hard && rng.chance(0.5);
  const settings = scaled ? SCALED_SETTINGS : COPY_SETTINGS;
  const setting = rng.int(0, settings.length - 1);
  const mx = words ? Math.max(settings[setting].base, 5 * sx) + rng.int(-20, 20) : drawMu(rng, sx);
  return { n, mx, sx, scaled, setting, words, ask: rng.pick<Ask>(hard ? ['var', 'sd'] : ['mean', 'var']) };
}

const totalName = (p: TotalParams): string => (p.scaled ? 'S' : 'T');

const totalTex = (p: TotalParams): string => (p.scaled ? `S = ${p.n}X` : `T = X_1 + X_2 + \\dots + X_{${p.n}}`);

/** Its combination with every copy's coefficient: 1 each for a total, n on one copy for a scaled value. */
const totalMean = (p: TotalParams): number => p.n * p.mx;
const totalVar = (p: TotalParams): number => (p.scaled ? p.n * p.n : p.n) * p.sx * p.sx;
const totalSd = (p: TotalParams): number => (p.scaled ? p.n : Math.sqrt(p.n)) * p.sx;
const totalValue = (p: TotalParams, ask: Ask): number => (ask === 'mean' ? totalMean(p) : ask === 'var' ? totalVar(p) : totalSd(p));

function totalOpening(p: TotalParams): string {
  const settings = p.scaled ? SCALED_SETTINGS : COPY_SETTINGS;
  const defn = p.scaled
    ? `$${totalTex(p)}$, where $X \\sim N(${p.mx}, ${p.sx * p.sx})$.`
    : `$${totalTex(p)}$, where the $X_i$ are independent and each is $N(${p.mx}, ${p.sx * p.sx})$.`;
  return p.words ? `${settings[p.setting].text(p.n, totalName(p))} So ${defn}` : defn;
}

function totalSolution(p: TotalParams): SolutionStep[] {
  const { n, mx, sx } = p;
  const v = sx * sx;
  const name = totalName(p);
  return p.scaled
    ? [
        { text: `$${name} = ${n}X$ is one value multiplied by $${n}$: every error in it is multiplied by $${n}$ too, so the variance is multiplied by $${n}^2$.` },
        { tex: aligned(`\\mathrm{E}(${name}) &= ${n} \\times ${mx}`, `&= ${n * mx}`, `\\mathrm{Var}(${name}) &= ${n}^2 \\times ${v}`, `&= ${n * n * v}`, `\\sigma_{${name}} &= ${n} \\times ${sx}`, `&= ${n * sx}`) },
      ]
    : [
        { text: `$${name}$ adds $${n}$ separate values. Their errors partly cancel, so the variances simply add: $${n}$ lots of $${v}$, not $${n}^2$.` },
        { tex: aligned(`\\mathrm{E}(${name}) &= ${n} \\times ${mx}`, `&= ${n * mx}`, `\\mathrm{Var}(${name}) &= ${n} \\times ${v}`, `&= ${n * v}`, `\\sigma_{${name}} &= \\sqrt{${n * v}}`, `&= ${totalSd(p)}`) },
      ];
}

const totalMoment: Generator<TotalParams> = {
  id: 'dist-total-moment',
  sample: (rng, difficulty) => sampleTotal(rng, difficulty),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`${totalOpening(p)} Find ${WANTED[p.ask](totalName(p))}.`)],
    lead: LEAD[p.ask](totalName(p)),
    keypad: [],
    answer: fmt(totalValue(p, p.ask)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: totalSolution,
  choices: (p) => {
    const { n, mx, sx } = p;
    const v = sx * sx;
    const slips: Record<Ask, number[]> = {
      mean: [mx, n * n * mx, n + mx],
      var: [p.scaled ? n * v : n * n * v, v, n * sx],
      sd: [p.scaled ? Math.sqrt(n) * sx : n * sx, sx, n * v],
    };
    return decimalChoices(totalValue(p, p.ask), slips[p.ask]);
  },
};

const totalNormal: Generator<TotalParams> = {
  id: 'dist-total-normal',
  sample: (rng, difficulty) => sampleTotal(rng, difficulty),
  render: (p): Slide => {
    const { n, mx, sx } = p;
    const v = sx * sx;
    const name = totalName(p);
    const e = totalMean(p);
    return choiceSlide(
      [say(`${totalOpening(p)} Which distribution does $${name}$ have?`)],
      options(
        { tex: `${name} \\sim N(${e}, ${totalVar(p)})` },
        { tex: `${name} \\sim N(${e}, ${p.scaled ? n * v : n * n * v})` },
        { tex: `${name} \\sim N(${e}, ${v})` },
        { tex: `${name} \\sim N(${mx}, ${totalVar(p)})` },
        { tex: `${name} \\sim N(${e}, ${n * sx})` },
      ).slice(0, 4),
    );
  },
  solution: totalSolution,
};

const totalTable: Generator<TotalParams> = {
  id: 'dist-total-table',
  sample: (rng, difficulty) => sampleTotal(rng, difficulty, false),
  render: (p): Slide => {
    const { n, mx, sx } = p;
    const v = sx * sx;
    const copies = { ...p, scaled: false };
    const scaled = { ...p, scaled: true };
    const answer = [fmt(totalVar(copies)), fmt(totalSd(copies)), fmt(totalVar(scaled)), fmt(totalSd(scaled))];
    return {
      kind: 'table',
      prompt: [
        say(
          `$X \\sim N(${mx}, ${v})$. $${totalTex(copies)}$ adds ${n} independent copies of $X$, and $${totalTex(scaled)}$ is one copy multiplied by ${n}. Fill in the variance and the standard deviation of each.`,
        ),
      ],
      columns: ['', '\\mathrm{Var}', '\\sigma'],
      rows: [
        ['T', null, null],
        ['S', null, null],
      ],
      bank: decimalBank(answer, [v, n * n * sx, sx, n + sx, 2 * n * v], 3),
      answer,
    };
  },
  solution: (p) => [...totalSolution({ ...p, scaled: false }), ...totalSolution({ ...p, scaled: true })],
};

const totalFlow: Generator<TotalParams> = {
  id: 'dist-total-flow',
  sample: (rng, difficulty) => {
    const params = sampleTotal(rng, difficulty, true);
    // Both kinds at both difficulties: which kind it is, is the question.
    const scaled = rng.chance(0.5);
    const settings = scaled ? SCALED_SETTINGS : COPY_SETTINGS;
    const setting = rng.int(0, settings.length - 1);
    return { ...params, scaled, setting, mx: Math.max(settings[setting].base, 5 * params.sx) + rng.int(-20, 20) };
  },
  render: (p): Slide => {
    const { n, mx, sx } = p;
    const v = sx * sx;
    const settings = p.scaled ? SCALED_SETTINGS : COPY_SETTINGS;
    const name = 'W';
    const key = `${n}|${mx}|${sx}|${p.scaled}|${p.setting}|${p.ask}`;
    const kinds = [`$X_1 + X_2 + \\dots + X_{${n}}$, separate values`, `$${n}X$, one value scaled`];
    const vars = [`$${n} \\times ${v} = ${n * v}$`, `$${n}^2 \\times ${v} = ${n * n * v}$`, `$${v}$, unchanged`];
    const sds = [`$\\sqrt{${n * v}} = ${Math.sqrt(n) * sx}$`, `$${n} \\times ${sx} = ${n * sx}$`, `$${sx}$, unchanged`];
    const withSd = p.ask === 'sd';
    return {
      kind: 'flow',
      prompt: [say(`${settings[p.setting].text(n, name)} Here $X \\sim N(${mx}, ${v})$.`)],
      subject: name,
      steps: [
        { id: 'kind', ask: `What is $${name}$?`, branches: turned(kinds.map((label) => ({ label, to: 'var' })), `${key}k`) },
        {
          id: 'var',
          ask: `So what is $\\mathrm{Var}(${name})$?`,
          branches: turned(
            vars.map((label) => (withSd ? { label, to: 'sd' } : { label, outcome: `So $\\mathrm{Var}(${name})$ is ${label}.` })),
            `${key}v`,
          ),
        },
        ...(withSd
          ? [
              {
                id: 'sd',
                ask: `And the standard deviation of $${name}$?`,
                branches: turned(sds.map((label) => ({ label, outcome: `So $\\sigma_{${name}}$ is ${label}.` })), `${key}s`),
              },
            ]
          : []),
      ],
      answer: [p.scaled ? kinds[1] : kinds[0], p.scaled ? vars[1] : vars[0], ...(withSd ? [p.scaled ? sds[1] : sds[0]] : [])],
    };
  },
  solution: totalSolution,
};

/* ---------- Level 5, lesson 5: a probability from the combination ---------- */

interface ComboProbParams extends Combo {
  k: number;
  op: 'lt' | 'gt';
}

const comboZ = (p: ComboProbParams): number => clean((p.k - comboMean(p)) / comboSd(p));

const comboProbValue = (p: ComboProbParams): number => (p.op === 'lt' ? below(comboZ(p)) : clean(1 - below(comboZ(p))));

/** A whole distance from the mean whose z has at most two places and sits between 0.05 and 2.5. */
function drawOffset(rng: Rng, s: number): number {
  for (;;) {
    const d = rng.sign() * rng.int(1, Math.floor(2.5 * s));
    const z = d / s;
    if (terminates(z, 2) && Math.abs(z) >= 0.05) return d;
  }
}

function sampleComboProb(rng: Rng, difficulty: number): ComboProbParams {
  const hard = difficulty > 1;
  const combo = hard
    ? drawCombo(rng, ROUND_TRIPLES, [1, 2, 3], [-4, -3, -2, -1, 1, 2, 3, 4], () => (rng.chance(0.4) ? rng.sign() * rng.int(1, 40) : 0))
    : drawCombo(rng, ROUND_TRIPLES, [1], [-1, 1], () => 0);
  const k = comboMean(combo) + drawOffset(rng, comboSd(combo));
  return { ...combo, k, op: rng.pick<ComboProbParams['op']>(['lt', 'gt']) };
}

const comboEvent = (p: ComboProbParams): string => `P(W ${p.op === 'lt' ? '<' : '>'} ${fmt(p.k)})`;

/** P(Z < z) or P(Z > z) read from Phi(|z|), for a solution line. */
function sideLines(z: number, op: 'lt' | 'gt', value: number): string[] {
  const u = fmt(Math.abs(z));
  const direct = (op === 'lt') === z > 0;
  return [`& P(Z ${op === 'lt' ? '<' : '>'} ${fmt(z)})`, `&= ${direct ? `\\Phi(${u})` : `1 - \\Phi(${u})`}`, `&= ${fmt(value)}`];
}

function comboProbSolution(p: ComboProbParams): SolutionStep[] {
  const z = comboZ(p);
  return [
    ...comboSolution(p).slice(1),
    { tex: aligned(`z &= \\frac{${fmt(p.k)} - ${fmt(comboMean(p))}}{${comboSd(p)}}`, `&= ${fmt(z)}`) },
    { tex: aligned(...sideLines(z, p.op, comboProbValue(p))) },
  ];
}

const comboProb: Generator<ComboProbParams> = {
  id: 'dist-combo-prob',
  sample: sampleComboProb,
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`${comboOpening(p)} Find $${comboEvent(p)}$ using`), show(quoteTex([Math.abs(comboZ(p))]))],
    lead: `${comboEvent(p)} =`,
    keypad: [],
    answer: fmt(comboProbValue(p)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: comboProbSolution,
  choices: (p) => {
    const value = comboProbValue(p);
    const quoted = phi(Math.abs(comboZ(p)));
    return decimalChoices(value, [clean(1 - value), quoted, clean(1 - quoted), clean(quoted - 0.5)]);
  },
};

interface BiggerParams extends Combo {
  setting: number;
  words: boolean;
  /** `more` asks P(X > Y), `less` P(X < Y). */
  dir: 'more' | 'less';
}

function sampleBigger(rng: Rng, difficulty: number): BiggerParams {
  const words = difficulty > 1;
  const triples = ROUND_TRIPLES.filter(([, , s]) => s <= 25);
  const [sx, sy] = tripleSigmas(rng, triples);
  const s = Math.sqrt(sx * sx + sy * sy);
  const setting = rng.int(0, PAIR_SETTINGS.length - 1);
  const mx = words ? PAIR_SETTINGS[setting].bx + rng.int(-20, 20) : drawMu(rng, Math.max(sx, sy)) + 3 * s;
  const d = drawOffset(rng, s);
  return { a: 1, b: -1, c: 0, mx, sx, my: mx - d, sy, setting: words ? setting : 0, words, dir: words && rng.chance(0.5) ? 'less' : 'more' };
}

/** D = X - Y has its z at D = 0. */
const biggerZ = (p: BiggerParams): number => clean(-comboMean(p) / comboSd(p));

const biggerEvent = (p: BiggerParams): string => `P(X ${p.dir === 'more' ? '>' : '<'} Y)`;

const biggerValue = (p: BiggerParams): number => (p.dir === 'more' ? clean(1 - below(biggerZ(p))) : below(biggerZ(p)));

function biggerAsk(p: BiggerParams): string {
  return p.words ? `the probability that ${PAIR_SETTINGS[p.setting][p.dir]}, $${biggerEvent(p)}$` : `$${biggerEvent(p)}$`;
}

function biggerSolution(p: BiggerParams): SolutionStep[] {
  const z = biggerZ(p);
  const op = p.dir === 'more' ? 'gt' : 'lt';
  return [
    { text: `Let $D = X - Y$. Then $${biggerEvent(p)}$ is $P(D ${p.dir === 'more' ? '>' : '<'} 0)$.` },
    { tex: aligned(...meanLines(p, 'D')) },
    { tex: aligned(...varLines(p, 'D')) },
    { tex: aligned(`z &= \\frac{0 - ${fmt(comboMean(p))}}{${comboSd(p)}}`, `&= ${fmt(z)}`) },
    { tex: aligned(...sideLines(z, op, biggerValue(p))) },
  ];
}

const biggerProb: Generator<BiggerParams> = {
  id: 'dist-bigger-prob',
  sample: sampleBigger,
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`${pairOpening(p)} Find ${biggerAsk(p)}, using`), show(quoteTex([Math.abs(biggerZ(p))]))],
    lead: `${biggerEvent(p)} =`,
    keypad: [],
    answer: fmt(biggerValue(p)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: biggerSolution,
  choices: (p) => {
    const value = biggerValue(p);
    const quoted = phi(Math.abs(biggerZ(p)));
    return decimalChoices(value, [clean(1 - value), quoted, clean(1 - quoted), 0.5]);
  },
};

const diffRouteTree: Generator<BiggerParams> = {
  id: 'dist-diff-route-tree',
  sample: sampleBigger,
  render: (p): Slide => {
    const m = comboMean(p);
    const s = comboSd(p);
    const z = biggerZ(p);
    const value = biggerValue(p);
    const answer = [fmt(m), String(s), fmt(z), fmt(value)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${pairOpening(p)} For ${biggerAsk(p)}, let $D = X - Y$. From the top: $\\mathrm{E}(D)$ and the standard deviation of $D$, then the $z$ of $D = 0$, then the probability. Use`,
        ),
        show(quoteTex([Math.abs(z)])),
      ],
      expression: `${biggerEvent(p)} = P(D ${p.dir === 'more' ? '>' : '<'} 0)`,
      nodes: [
        { id: 'mean', from: [] },
        { id: 'sd', from: [] },
        { id: 'z', from: ['mean', 'sd'] },
        { id: 'P', from: ['z'] },
      ],
      bank: decimalBank(answer, [-m, p.sx + p.sy, comboVar(p), -z, clean(1 - value)], 3, false),
      answer,
    };
  },
  solution: biggerSolution,
};

const diffPlan: Generator<BiggerParams> = {
  id: 'dist-diff-plan',
  sample: sampleBigger,
  render: (p): Slide => {
    const { sx, sy } = p;
    const m = fmt(comboMean(p));
    const z = biggerZ(p);
    const u = fmt(Math.abs(z));
    const op = p.dir === 'more' ? '>' : '<';
    const opp = p.dir === 'more' ? '<' : '>';
    const forms = [`$\\Phi(${u})$`, `$1 - \\Phi(${u})$`, `$\\Phi(${u}) - 0.5$`];
    // P(D > 0) is P(Z > z): Phi(|z|) when z is below zero, 1 - Phi(|z|) above it; P(D < 0) the other way round.
    const direct = (p.dir === 'more') === z < 0;
    const key = `${p.mx}|${sx}|${p.my}|${sy}|${p.dir}|${p.words}|${p.setting}`;
    const normals = [`$N(${m}, ${sx * sx + sy * sy})$`, `$N(${m}, ${Math.abs(sx * sx - sy * sy)})$`, `$N(${m}, ${comboSd(p)})$`];
    return {
      kind: 'flow',
      prompt: [say(`${pairOpening(p)} Plan how to find ${biggerAsk(p)}, with $D = X - Y$.`)],
      subject: biggerEvent(p),
      steps: [
        { id: 'normal', ask: 'Which distribution does $D$ have?', branches: turned(normals.map((label) => ({ label, to: 'event' })), key) },
        {
          id: 'event',
          ask: `Which event for $D$ is $${biggerEvent(p)}$?`,
          branches: turned([`$D ${op} 0$`, `$D ${opp} 0$`].map((label) => ({ label, to: 'phi' })), `${key}e`),
        },
        {
          id: 'phi',
          ask: `Standardise $D = 0$, which gives $z = ${fmt(z)}$. Which gives the probability?`,
          branches: turned(forms.map((label) => ({ label, outcome: `So the probability is ${label}.` })), `${key}p`),
        },
      ],
      answer: [normals[0], `$D ${op} 0$`, direct ? forms[0] : forms[1]],
    };
  },
  solution: biggerSolution,
};

export const binomialNormalGenerators = [
  conditionsFlow,
  conditionsChoice,
  binomialName,
  binomialTrials,
  pointFactors,
  pointValue,
  pointForm,
  pointWorking,
  tableFill,
  cumulative,
  cumulativeParts,
  tableMissing,
  whichCumulative,
  atLeast,
  atLeastWorking,
  betweenForm,
  moments,
  momentForm,
  spreadParts,
  fromMoments,
  matchMoments,
  ruleSlider,
  rulePercentGen,
  normalNotation,
  ruleFlow,
  zScore,
  zForm,
  zParts,
  zWorking,
  zCompare,
  normalProb,
  tailFlow,
  normalTable,
  betweenNormal,
  inverseX,
  inverseForm,
  inverseSlider,
  inverseParts,
  criticalChoice,
  findParameter,
  findWorking,
  findEquation,
  findChoice,
  bothSignFlow,
  bothStandardise,
  bothFits,
  bothTable,
  bothEquation,
  bothPair,
  bothSolve,
  bothWorking,
  bothNodes,
  bothSymmetric,
  bothMidpoint,
  bothHalfGap,
  bothProportion,
  bothCheckTable,
  bothVerify,
  bothNewProb,
  bothChain,
  approxSum,
  approxBars,
  approxSkew,
  approxPeak,
  approxValid,
  approxProducts,
  approxWhichValid,
  approxMinN,
  approxParam,
  approxNormal,
  approxBuild,
  approxMomentsTree,
  ccChoice,
  ccFlow,
  ccLine,
  ccBoundary,
  approxProb,
  approxRouteTree,
  approxStandardise,
  approxPlan,
  linMoment,
  linNormal,
  linSpreadTree,
  linEffectFlow,
  sumMoment,
  sumNormal,
  sumVarTiles,
  sumTable,
  comboMoment,
  comboNormal,
  comboVarSteps,
  comboBuild,
  totalMoment,
  totalNormal,
  totalTable,
  totalFlow,
  comboProb,
  biggerProb,
  diffRouteTree,
  diffPlan,
];
