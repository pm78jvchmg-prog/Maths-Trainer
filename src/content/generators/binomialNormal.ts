/**
 * Binomial and Normal Distributions (roadmap C18).
 *
 * Level 1 is the binomial distribution: when a binomial model applies,
 * P(X = r) from its three factors, the probability table and P(X <= r), the
 * complement for "at least" and the rest, and the mean np and variance
 * np(1 - p). Level 2 is the normal distribution: the curve and the
 * 68-95-99.7 rule, standardising, a probability from Phi, working back from a
 * probability, and finding mu or sigma from one known probability.
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
 *   most two decimal places, so z, x and every answer terminate.
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
];
