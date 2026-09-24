/**
 * Hypothesis Testing (roadmap C19).
 *
 * Level 1 tests a proportion with the binomial model: the null and
 * alternative hypotheses and which tail, the test statistic `X ~ B(n, p)`
 * under `H_0`, the p-value read from quoted cumulatives, the critical region
 * and its actual significance level, and two-tailed tests with the level
 * halved. Level 2 tests a mean with the normal model: the sample mean's
 * distribution `N(\mu, \sigma^2/n)`, the z statistic, the four critical
 * values, the decision and its conclusion in the scenario's words, and the
 * level as the chance of rejecting a true `H_0`, with how n moves the verdict.
 * Level 3 is Type I and Type II errors: naming the mistake an outcome makes,
 * the size of a test (P(Type I), the region's probability under `H_0`),
 * P(Type II) and the power for a stated alternative from cumulatives quoted at
 * that alternative, the trade between the two at fixed n, and both errors in
 * the test of a mean, with `\Phi` values quoted in the prompt.
 *
 * Nothing here is calculus, so no slide declares `source` and the generic
 * derivative oracle does not apply; `hypothesisTesting.test.ts` is the oracle.
 *
 * Four rules hold everywhere in this file.
 *
 * - A probability is quoted, never typed from a calculation. Every prompt
 *   carries the cumulatives `P(X \le k)` it needs, to four places, and a typed
 *   answer is one of them, a difference of two, a sum, or a level. `cdf` below
 *   is used only to choose what to quote and to fix a critical region, and
 *   every comparison with a level is made on the quoted value, in
 *   ten-thousandths, since that is the number the learner compares.
 *   `hypothesisTesting.test.ts` recomputes each quoted cumulative its own way.
 * - A typed number is exact. In level 2 n is a square and `\sigma` a multiple
 *   of `\sqrt{n}`, so `\sigma / \sqrt{n}` is whole, and `\bar{x}` is drawn so z
 *   has at most two places.
 * - A hypothesis or a model is a form, so it goes through `tiles`; `expression`
 *   is only ever a number (PITFALLS 3.4).
 * - Units stay in prose. A conclusion is written in the scenario's words,
 *   never "reject" alone.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { nCr } from './binomialExpansion';
import { fmt } from './numericalMethods';
import { stepBank, tokenBank, treeBank } from './parametricImplicit';

/* ================================================================
 * Shared helpers
 * ================================================================ */

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });

/** Display lines stacked on their `&`, so a list of cumulatives never runs off a phone. */
const aligned = (lines: string[]): string => `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;

/**
 * `lhs = a = b = c`, one equals sign per line: a chain of four-place values
 * on one line runs past the width of a phone.
 */
const chain = (lhs: string, ...rest: string[]): string =>
  // A probability on the left takes a line of its own: beside its first step it runs past a phone's width.
  lhs.startsWith('P(')
    ? aligned([`& ${lhs}`, ...rest.map((step) => `&= ${step}`)])
    : aligned(rest.map((step, i) => `${i === 0 ? lhs : ''} &= ${step}`));

/** Items turned by a hash of `key`, so the right one is not always first yet one question renders one way. */
function spun<T>(items: T[], key: string): T[] {
  const turn = hashSeed(key) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/** A native choice slide, turned by a hash of its labels (PITFALLS 3.10). */
function choiceSlide(prompt: Block[], opts: ChoiceOption[], tex = true): Slide {
  const turn = hashSeed(opts.map((o) => o.tex).join('|')) % opts.length;
  const ordered = [...opts.slice(turn), ...opts.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/**
 * A choice whose labels are the same few every time, turned by a hash of the
 * question as well: otherwise each right answer always sits in one place.
 */
const keyedChoice = (prompt: Block[], opts: ChoiceOption[], key: string, tex = true): Slide => choiceSlide(prompt, spun(opts, key), tex);

/**
 * A bank of decimals: the answer as a multiset, then slips that differ from
 * every answer, until `spare` are left over. Sorted by value, never shuffled.
 */
function decimalBank(answer: string[], slips: (string | undefined)[], spare = 3): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  for (const token of slips) {
    if (extras.length >= spare) break;
    if (token === undefined || needed.has(token) || extras.includes(token)) continue;
    extras.push(token);
  }
  return [...answer, ...extras].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));
}

/** Whether a value is an exact decimal of at most `dp` places. */
function terminates(value: number, dp: number): boolean {
  const scaled = value * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-7;
}

type Tail = 'up' | 'down' | 'two';
type OneTail = 'up' | 'down';

const TAILS: Tail[] = ['up', 'down', 'two'];
const ONE_TAILS: OneTail[] = ['up', 'down'];

/** The sign in `H_1`. */
const OP: Record<Tail, string> = { up: '>', down: '<', two: '\\ne' };

/** A level such as 5 or 2.5, as a probability the learner reads. */
const asProb = (level: number): string => fmt(level / 100);

/* ================================================================
 * Binomial: the model behind level 1
 * ================================================================ */

/** P(X <= x) for X ~ B(n, p). Only ever used to choose what to quote. */
function cdf(n: number, p: number, x: number): number {
  if (x < 0) return 0;
  let total = 0;
  for (let r = 0; r <= Math.min(x, n); r += 1) total += nCr(n, r) * p ** r * (1 - p) ** (n - r);
  return total;
}

/** P(X <= x) as it is quoted, in ten-thousandths. */
const q = (n: number, p: number, x: number): number => Math.round(cdf(n, p, x) * 10000);

/**
 * Whether P(X <= x) can be quoted: strictly between 0.0000 and 1.0000 once
 * rounded, and nowhere near a rounding tie, so an independent recomputation
 * cannot round it the other way.
 */
function quotable(n: number, p: number, x: number): boolean {
  if (x < 0 || x >= n) return false;
  const scaled = cdf(n, p, x) * 10000;
  const frac = scaled - Math.floor(scaled);
  return Math.abs(frac - 0.5) > 1e-6 && Math.round(scaled) >= 1 && Math.round(scaled) <= 9999;
}

/** Ten-thousandths as the learner reads them. */
const P4 = (tenK: number): string => (tenK / 10000).toFixed(4);

/** The same value as a typed answer: no trailing zeros. */
const typed = (tenK: number): string => fmt(tenK / 10000);

const le = (k: number): string => `P(X \\le ${k})`;

/** A block quoting P(X <= k) for each k, one per line. */
const quotes = (n: number, p: number, ks: number[]): Block =>
  show(aligned(ks.map((k) => `${le(k)} &= ${P4(q(n, p, k))}`)));

/** P(X >= x) in ten-thousandths, from the quoted P(X <= x - 1). */
const upper = (n: number, p: number, x: number): number => 10000 - q(n, p, x - 1);

const PS = [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8];

const model = (n: number, p: number): string => `X \\sim B(${n}, ${fmt(p)})`;

interface Context {
  who: string;
  /** Plural noun for the trials. */
  unit: string;
  /** What a success does, agreeing with a plural subject. */
  event: string;
}

const CONTEXTS: Context[] = [
  { who: 'A seed company', unit: 'seeds', event: 'germinate' },
  { who: 'A clinic', unit: 'patients', event: 'recover within a week' },
  { who: 'A marketing team', unit: 'emails sent', event: 'are opened' },
  { who: 'A basketball coach', unit: 'free throws', event: 'go in' },
  { who: 'A factory manager', unit: 'components', event: 'are faulty' },
  { who: 'A café owner', unit: 'customers', event: 'order a hot drink' },
  { who: 'A bus company', unit: 'buses', event: 'arrive late' },
  { who: 'A gardener', unit: 'bulbs', event: 'flower in spring' },
  { who: 'A games designer', unit: 'spins of a spinner', event: 'land on red' },
  { who: 'A council', unit: 'residents asked', event: 'support the plan' },
];

const pct = (p: number): number => Math.round(p * 100);

const claimText = (c: Context, p: number): string => `${c.who} claims that ${pct(p)}% of ${c.unit} ${c.event}.`;

function suspicionText(c: Context, p: number, tail: Tail): string {
  if (tail === 'up') return `A researcher suspects that more than ${pct(p)}% of ${c.unit} ${c.event}.`;
  if (tail === 'down') return `A researcher suspects that fewer than ${pct(p)}% of ${c.unit} ${c.event}.`;
  return `A researcher suspects that the proportion of ${c.unit} that ${c.event} is not ${pct(p)}%.`;
}

/** What `H_1` says, in the scenario's words. */
function claimWords(c: Context, p: number, tail: Tail): string {
  if (tail === 'up') return `more than ${pct(p)}% of ${c.unit} ${c.event}`;
  if (tail === 'down') return `fewer than ${pct(p)}% of ${c.unit} ${c.event}`;
  return `the proportion of ${c.unit} that ${c.event} is not ${pct(p)}%`;
}

/** A conclusion in context. */
function verdict(words: string, level: number, reject: boolean): string {
  return reject
    ? `Reject $H_0$: there is evidence at the ${level}% level that ${words}.`
    : `Do not reject $H_0$: there is not enough evidence at the ${level}% level that ${words}.`;
}

const sampleText = (c: Context, n: number, x: number): string =>
  `In a sample of ${n} ${c.unit}, the number that ${c.event} is $${x}$.`;

const pickCtx = (rng: Rng): number => rng.int(0, CONTEXTS.length - 1);

/** Every k in [from, to] that can be quoted, or undefined if any cannot. */
function quotableRange(n: number, p: number, from: number, to: number): number[] | undefined {
  const ks: number[] = [];
  for (let k = from; k <= to; k += 1) {
    if (!quotable(n, p, k)) return undefined;
    ks.push(k);
  }
  return ks;
}

/**
 * The critical region of a one-tailed test at `level`%: `X >= c` for the upper
 * tail, `X <= c` for the lower. Undefined when there is none, or when the
 * decision hangs on a quoted value within 0.0005 of the level.
 */
function oneTailRegion(n: number, p: number, tail: OneTail, level: number): number | undefined {
  const cap = level * 100;
  if (tail === 'up') {
    for (let c = 1; c <= n; c += 1) {
      if (!quotable(n, p, c - 1)) continue;
      const t = upper(n, p, c);
      if (t <= cap) {
        if (cap - t < 5 || c < 2 || !quotable(n, p, c - 2) || upper(n, p, c - 1) - cap < 5) return undefined;
        return c;
      }
    }
    return undefined;
  }
  for (let c = n - 1; c >= 0; c -= 1) {
    if (!quotable(n, p, c)) continue;
    const t = q(n, p, c);
    if (t <= cap) {
      if (cap - t < 5 || !quotable(n, p, c + 1) || q(n, p, c + 1) - cap < 5) return undefined;
      return c;
    }
  }
  return undefined;
}

/* ================================================================
 * Level 1, lesson 1: hypotheses, tails and the level
 * ================================================================ */

interface ClaimParams {
  ctx: number;
  p: number;
  tail: Tail;
  n: number;
  x: number;
  /** Difficulty 2 first asks which value belongs in H_0, the claim or the sample. */
  hard: boolean;
}

/**
 * From a claim and a suspicion to `H_1`, one decision at a time: does the
 * suspicion name a direction, and which. At difficulty 2 the sample is given
 * too, and the first fork is whether it or the claim goes in `H_0`.
 */
const claimFlow: Generator<ClaimParams> = {
  id: 'hyp-claim-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = rng.pick(PS);
      const n = rng.int(10, 30);
      const x = rng.int(1, n - 1);
      if (Math.abs(x / n - p) < 1e-9) continue;
      return { ctx: pickCtx(rng), p, tail: rng.pick(TAILS), n, x, hard: difficulty > 1 };
    }
  },
  render: ({ ctx, p, tail, n, x, hard }): Slide => {
    const c = CONTEXTS[ctx];
    const P = fmt(p);
    const key = `${ctx}|${P}|${tail}|${n}|${x}`;
    const steps = [
      {
        id: 'dir',
        ask: 'Does the suspicion say which way the proportion has moved?',
        branches: spun(
          [
            { label: 'Yes', to: 'way' },
            { label: 'No', outcome: `Two-tailed, $H_1: p \\ne ${P}$: a change either way counts against the claim.` },
          ],
          key,
        ),
      },
      {
        id: 'way',
        ask: 'Which way does it say?',
        branches: spun(
          [
            { label: 'Higher', outcome: `One-tailed, $H_1: p > ${P}$: only a large number of ${c.unit} that ${c.event} counts as evidence.` },
            { label: 'Lower', outcome: `One-tailed, $H_1: p < ${P}$: only a small number of ${c.unit} that ${c.event} counts as evidence.` },
          ],
          `${key}|way`,
        ),
      },
    ];
    const claimLabel = `$p = ${P}$, the claim`;
    if (hard) {
      steps.unshift({
        id: 'null',
        ask: 'Which value belongs in the null hypothesis, $H_0$?',
        branches: spun(
          [
            { label: claimLabel, to: 'dir' },
            {
              label: `$p = \\frac{${x}}{${n}}$, the sample`,
              outcome: '$H_0$ is always the claim being tested. The sample is the evidence, never a hypothesis.',
            },
          ],
          `${key}|null`,
        ),
      });
    }
    const rest = tail === 'two' ? ['No'] : ['Yes', tail === 'up' ? 'Higher' : 'Lower'];
    return {
      kind: 'flow',
      prompt: [
        say(`${claimText(c, p)} ${suspicionText(c, p, tail)}${hard ? ` ${sampleText(c, n, x)}` : ''}`),
        say('Work through the questions to reach the alternative hypothesis, $H_1$.'),
      ],
      subject: hard ? `X = ${x}, \\; n = ${n}` : `H_0: p = ${P}`,
      steps,
      answer: hard ? [claimLabel, ...rest] : rest,
    };
  },
  solution: ({ ctx, p, tail, hard }) => {
    const c = CONTEXTS[ctx];
    const P = fmt(p);
    const steps: SolutionStep[] = [];
    if (hard) steps.push({ text: `$H_0$ is the claim, $p = ${P}$. The sample is the evidence you test it with.` });
    steps.push({
      text:
        tail === 'two'
          ? `The suspicion is only that the proportion is not ${pct(p)}%, with no direction, so the test is two-tailed.`
          : `The suspicion says ${tail === 'up' ? 'more' : 'fewer'} than ${pct(p)}% of ${c.unit} ${c.event}, so the test is one-tailed.`,
    });
    steps.push({ tex: aligned([`H_0&: p = ${P}`, `H_1&: p ${OP[tail]} ${P}`]) });
    return steps;
  },
};

interface HypTilesParams {
  ctx: number;
  p: number;
  tail: Tail;
  n: number;
  x: number;
}

/** Sizes whose sample proportion is a short decimal, so it can sit in the bank as a slip. */
const SHORT_NS = [10, 20, 25, 40, 50];

/**
 * Write both hypotheses. The bank offers the sample's own proportion and the
 * complement `1 - p` beside the claim, since those are the numbers a learner
 * reaches for by mistake.
 */
const hypothesesTiles: Generator<HypTilesParams> = {
  id: 'hyp-hypotheses-tiles',
  sample: (rng) => {
    for (;;) {
      const p = rng.pick(PS);
      const n = rng.pick(SHORT_NS);
      const x = rng.int(1, n - 1);
      if (fmt(x / n) === fmt(p) || fmt(x / n) === fmt(1 - p) || fmt(x / n).length > 5) continue;
      return { ctx: pickCtx(rng), p, tail: rng.pick(TAILS), n, x };
    }
  },
  render: ({ ctx, p, tail, n, x }): Slide => {
    const c = CONTEXTS[ctx];
    const P = fmt(p);
    const answer = [P, OP[tail], P];
    const others = TAILS.filter((t) => t !== tail).map((t) => OP[t]);
    return {
      kind: 'tiles',
      prompt: [
        say(`${claimText(c, p)} ${suspicionText(c, p, tail)} ${sampleText(c, n, x)}`),
        say('Complete the hypotheses for a test of the claim.'),
      ],
      template: 'H_0: p = {0}, \\quad H_1: p {1} {2}',
      bank: tokenBank(answer, [...others, fmt(x / n), fmt(1 - p)], 4),
      answer,
    };
  },
  solution: ({ ctx, p, tail, n, x }) => {
    const c = CONTEXTS[ctx];
    const P = fmt(p);
    return [
      { text: `Both hypotheses are about $p$, the proportion of all ${c.unit} that ${c.event}. $H_0$ is the claim: $p = ${P}$.` },
      {
        text: `The sample proportion $\\frac{${x}}{${n}} = ${fmt(x / n)}$ is the evidence, so it never goes in a hypothesis. $H_1$ is what the researcher suspects: ${claimWords(c, p, tail)}.`,
      },
      { tex: aligned([`H_0&: p = ${P}`, `H_1&: p ${OP[tail]} ${P}`]) },
    ];
  },
};

interface TailsParams {
  ctx: number;
  p: number;
  tail: Tail;
  /** Difficulty 2 hints at the direction rather than stating it. */
  hard: boolean;
}

const TAIL_LABEL: Record<Tail, string> = {
  up: 'One-tailed, looking for a higher proportion',
  down: 'One-tailed, looking for a lower proportion',
  two: 'Two-tailed, looking for a change either way',
};

function hintText(c: Context, tail: Tail): string {
  if (tail === 'up') return `After a change, ${c.who.toLowerCase()} hopes the proportion of ${c.unit} that ${c.event} has gone up.`;
  if (tail === 'down') return `After a change, ${c.who.toLowerCase()} fears the proportion of ${c.unit} that ${c.event} has dropped.`;
  return `After a change, ${c.who.toLowerCase()} wonders whether the proportion of ${c.unit} that ${c.event} is any different.`;
}

/** One tail or two, and which: the kind of test the suspicion calls for. */
const tailsChoice: Generator<TailsParams> = {
  id: 'hyp-tails',
  sample: (rng, difficulty) => ({ ctx: pickCtx(rng), p: rng.pick(PS), tail: rng.pick(TAILS), hard: difficulty > 1 }),
  render: ({ ctx, p, tail, hard }): Slide => {
    const c = CONTEXTS[ctx];
    const opts = options(
      { tex: TAIL_LABEL[tail] },
      ...TAILS.filter((t) => t !== tail).map((t) => ({ tex: TAIL_LABEL[t] })),
      ...(hard ? [{ tex: 'One-tailed, pointing whichever way the sample falls' }] : []),
    );
    return choiceSlide(
      [
        say(`${claimText(c, p)} ${hard ? hintText(c, tail) : suspicionText(c, p, tail)}`),
        say('What kind of test does this call for?'),
      ],
      opts,
      false,
    );
  },
  solution: ({ ctx, p, tail }) => {
    const c = CONTEXTS[ctx];
    return [
      {
        text:
          tail === 'two'
            ? 'No direction is named, only a difference, so either an unusually large or an unusually small count would count as evidence: two tails.'
            : `The suspicion points one way, towards ${tail === 'up' ? 'more' : 'fewer'} ${c.unit} that ${c.event}, so only that tail counts: one tail.`,
      },
      { tex: `H_1: p ${OP[tail]} ${fmt(p)}` },
      { text: 'The direction comes from the suspicion, decided before the data is seen, never from which way the sample happens to fall.' },
    ];
  },
};

interface ExpectedParams {
  ctx: number;
  p: number;
  n: number;
  x: number;
  /** Difficulty 2 asks how far the observed count is from the expected one. */
  gap: boolean;
}

/**
 * What `H_0` expects, `E(X) = np`, and at difficulty 2 how far the sample
 * sits from it: the size of the surprise a test measures.
 */
const expected: Generator<ExpectedParams> = {
  id: 'hyp-expected',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = rng.pick(PS);
      const n = rng.int(8, 60);
      const mean = n * p;
      if (!terminates(mean, 0)) continue;
      const x = rng.int(0, n);
      if (x === Math.round(mean)) continue;
      return { ctx: pickCtx(rng), p, n, x, gap: difficulty > 1 };
    }
  },
  render: ({ ctx, p, n, x, gap }): Slide => {
    const c = CONTEXTS[ctx];
    const mean = Math.round(n * p);
    return {
      kind: 'expression',
      prompt: [
        say(`${claimText(c, p)} A sample of ${n} ${c.unit} is taken, and $X$ is the number that ${c.event}.`),
        say(
          gap
            ? `In fact $X = ${x}$. By how much does that differ from what $H_0: p = ${fmt(p)}$ expects? Give the observed count minus the expected one.`
            : `If $H_0: p = ${fmt(p)}$ is true, what is the expected value of $X$?`,
        ),
      ],
      lead: gap ? `${x} - E(X) =` : 'E(X) =',
      keypad: [],
      answer: String(gap ? x - mean : mean),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ p, n, x, gap }) => {
    const mean = Math.round(n * p);
    const steps: SolutionStep[] = [
      { text: 'Under $H_0$ each trial succeeds with probability $p$, so on average $np$ of them do.' },
      { tex: chain('E(X)', 'np', `${n} \\times ${fmt(p)}`, `${mean}`) },
    ];
    if (gap) steps.push({ tex: `${x} - ${mean} = ${x - mean}` });
    return steps;
  },
};

/* ================================================================
 * Level 1, lesson 2: the test statistic and its model
 * ================================================================ */

interface ModelParams {
  ctx: number;
  p: number;
  n: number;
  x: number;
  /** Difficulty 2 gives the claim in words, "one in four". */
  words: boolean;
}

const IN_WORDS: Record<string, string> = {
  '0.1': 'one in ten',
  '0.2': 'one in five',
  '0.25': 'one in four',
  '0.3': 'three in ten',
  '0.4': 'two in five',
  '0.5': 'half',
  '0.6': 'three in five',
  '0.7': 'seven in ten',
  '0.75': 'three in four',
  '0.8': 'four in five',
};

/** The model of the test statistic under `H_0`, `X ~ B(n, p)`, from a scenario. */
const modelTiles: Generator<ModelParams> = {
  id: 'hyp-model-tiles',
  sample: (rng, difficulty) => {
    const words = difficulty > 1;
    for (;;) {
      const p = words ? Number(rng.pick(Object.keys(IN_WORDS))) : rng.pick(PS);
      const n = rng.pick(SHORT_NS);
      const x = rng.int(1, n - 1);
      if (fmt(x / n) === fmt(p) || fmt(x / n) === fmt(1 - p) || fmt(x / n).length > 5 || x === n - x) continue;
      return { ctx: pickCtx(rng), p, n, x, words };
    }
  },
  render: ({ ctx, p, n, x, words }): Slide => {
    const c = CONTEXTS[ctx];
    const claim = words
      ? `${c.who} claims that ${IN_WORDS[fmt(p)]} of ${c.unit} ${c.event}.`
      : claimText(c, p);
    const answer = [String(n), fmt(p)];
    return {
      kind: 'tiles',
      prompt: [
        say(`${claim} ${sampleText(c, n, x)}`),
        say(`$X$ is the number of the ${n} that ${c.event}. Complete its distribution if the claim is true.`),
      ],
      template: 'X \\sim B({0}, {1})',
      bank: tokenBank(answer, [String(x), fmt(x / n), fmt(1 - p), String(n - x)], 3),
      answer,
    };
  },
  solution: ({ ctx, p, n, x, words }) => {
    const c = CONTEXTS[ctx];
    return [
      { text: `There are ${n} trials, one for each of the ${c.unit} in the sample, and each is a success or not.` },
      {
        text: words
          ? `"${IN_WORDS[fmt(p)]}" is a probability of $${fmt(p)}$: that is the claim, so it is the model under $H_0$.`
          : `The claim gives the probability of success, $${fmt(p)}$, and the model is built on the claim.`,
      },
      { tex: model(n, p) },
      { text: `The count $${x}$ is the value observed, never a parameter of the model.` },
    ];
  },
};

interface TailTreeParams {
  n: number;
  p: number;
  x: number;
  /** Difficulty 1 prints the rule beside the question. */
  hint: boolean;
}

/**
 * "At least" and "more than" from a table of `P(X <= k)`: each is one minus
 * a cumulative, and they differ by one in which one. The top row is the
 * cumulative each comes from, the bottom row the answer.
 */
const upperTree: Generator<TailTreeParams> = {
  id: 'hyp-upper-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = rng.int(8, 25);
      const p = rng.pick(PS);
      const x = rng.int(2, n - 2);
      if (!quotableRange(n, p, x - 2, x + 1)) continue;
      const values = [x - 2, x - 1, x, x + 1].map((k) => q(n, p, k));
      if (new Set(values).size < 4) continue;
      return { n, p, x, hint: difficulty < 2 };
    }
  },
  render: ({ n, p, x, hint }): Slide => {
    const b = q(n, p, x - 1);
    const a = q(n, p, x);
    const answer = [P4(b), P4(a), P4(10000 - b), P4(10000 - a)];
    const slips = [
      P4(q(n, p, x - 2)),
      P4(q(n, p, x + 1)),
      P4(10000 - q(n, p, x - 2)),
      P4(10000 - q(n, p, x + 1)),
      P4(a - b),
    ];
    return {
      kind: 'tree',
      prompt: [
        say(`$${model(n, p)}$ and the table gives:`),
        quotes(n, p, [x - 2, x - 1, x, x + 1]),
        say(
          `Find $P(X \\ge ${x})$ and $P(X > ${x})$. Top row, left to right: the cumulative each one comes from.${hint ? ' Each answer is $1$ minus its cumulative.' : ''}`,
        ),
      ],
      expression: `P(X \\ge ${x}) \\text{ and } P(X > ${x})`,
      nodes: [
        { id: 'b', from: [] },
        { id: 'a', from: [] },
        { id: 'ge', from: ['b'] },
        { id: 'gt', from: ['a'] },
      ],
      bank: decimalBank(answer, slips, 3),
      answer,
    };
  },
  solution: ({ n, p, x }) => {
    const b = q(n, p, x - 1);
    const a = q(n, p, x);
    return [
      { text: `"At least ${x}" leaves out $0$ to $${x - 1}$, so it comes from $${le(x - 1)}$.` },
      { tex: chain(`P(X \\ge ${x})`, `1 - ${le(x - 1)}`, `1 - ${P4(b)}`, P4(10000 - b)) },
      { text: `"More than ${x}" leaves out $0$ to $${x}$, so it comes from $${le(x)}$.` },
      { tex: chain(`P(X > ${x})`, `1 - ${le(x)}`, `1 - ${P4(a)}`, P4(10000 - a)) },
    ];
  },
};

interface StatisticParams {
  ctx: number;
  p: number;
  n: number;
  level: number;
  ask: 'statistic' | 'condition';
}

/**
 * What the test statistic is, or what the binomial model needs to be fair:
 * the two things to be sure of before any number is worked out.
 */
const statisticChoice: Generator<StatisticParams> = {
  id: 'hyp-statistic-choice',
  sample: (rng) => ({
    ctx: pickCtx(rng),
    p: rng.pick(PS),
    n: rng.int(10, 40),
    level: rng.pick([1, 5, 10]),
    ask: rng.pick<StatisticParams['ask']>(['statistic', 'condition']),
  }),
  render: ({ ctx, p, n, level, ask }): Slide => {
    const c = CONTEXTS[ctx];
    const Unit = c.unit[0].toUpperCase() + c.unit.slice(1);
    const setup = `${claimText(c, p)} To test it at the ${level}% level, ${n} ${c.unit} are sampled at random.`;
    if (ask === 'statistic') {
      return choiceSlide(
        [say(setup), say('What is the test statistic?')],
        options(
          { tex: `The number of the ${n} ${c.unit} that ${c.event}` },
          { tex: `The claimed proportion, ${pct(p)}%` },
          { tex: `The sample size, ${n}` },
          { tex: `The significance level, ${level}%` },
        ),
        false,
      );
    }
    return choiceSlide(
      [say(setup), say('Which of these must be true for the binomial model to be fair?')],
      options(
        { tex: `${Unit} ${c.event} independently, each with the same probability` },
        { tex: `At least 30 ${c.unit} are sampled` },
        { tex: `The claimed proportion is exactly 50%` },
        { tex: `The sample size is chosen after seeing the results` },
      ),
      false,
    );
  },
  solution: ({ ctx, p, n, ask }) => {
    const c = CONTEXTS[ctx];
    if (ask === 'statistic') {
      return [
        { text: `The test statistic is what the sample measures and the test judges: $X$, the number of the ${n} ${c.unit} that ${c.event}. Under $H_0$ its model is:` },
        { tex: model(n, p) },
      ];
    }
    return [
      { text: `$B(${n}, ${fmt(p)})$ counts successes in a fixed number of trials that do not affect each other and share one probability.` },
      { text: `So the ${c.unit} must ${c.event.replace(/^are /, 'be ')} independently, each with probability $${fmt(p)}$. Nothing needs the sample to be large or the proportion to be a half.` },
    ];
  },
};

interface PointParams {
  n: number;
  p: number;
  /** The lower end; equal to `b` for P(X = b). */
  a: number;
  b: number;
}

/**
 * A probability that is not a cumulative, as the difference of two that are:
 * `P(X = x)` at difficulty 1, `P(a <= X <= b)` at difficulty 2.
 */
const pointProb: Generator<PointParams> = {
  id: 'hyp-point-prob',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = rng.int(8, 25);
      const p = rng.pick(PS);
      const b = rng.int(2, n - 2);
      const a = difficulty > 1 ? b - rng.int(1, 3) : b;
      if (a < 1 || !quotableRange(n, p, a - 2, b + 1)) continue;
      if (q(n, p, b) - q(n, p, a - 1) < 5) continue;
      return { n, p, a, b };
    }
  },
  render: ({ n, p, a, b }): Slide => {
    const value = q(n, p, b) - q(n, p, a - 1);
    const range = a === b ? `P(X = ${b})` : `P(${a} \\le X \\le ${b})`;
    const ks: number[] = [];
    for (let k = a - 2; k <= b + 1; k += 1) ks.push(k);
    return {
      kind: 'expression',
      prompt: [say(`$${model(n, p)}$ and the table gives:`), quotes(n, p, ks), say(`Find $${range}$.`)],
      lead: `${range} =`,
      keypad: [],
      answer: typed(value),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ n, p, a, b }) => {
    const top = q(n, p, b);
    const bottom = q(n, p, a - 1);
    const range = a === b ? `P(X = ${b})` : `P(${a} \\le X \\le ${b})`;
    return [
      { text: `$${le(b)} = ${P4(top)}$ counts everything up to $${b}$. Take away everything below $${a}$, which is $${le(a - 1)} = ${P4(bottom)}$.` },
      // The range is its own line: beside the subtraction it runs off a phone.
      { tex: aligned([`& ${range}`, `&= ${P4(top)} - ${P4(bottom)}`, `&= ${P4(top - bottom)}`]) },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 3: the p-value
 * ================================================================ */

interface PTableParams {
  n: number;
  p: number;
  /** The first row with a blank. */
  k: number;
  rows: number;
}

/**
 * The upper-tail column of a table from its cumulative column: each
 * `P(X >= x)` is one minus the cumulative in the row above.
 */
const pvalueTable: Generator<PTableParams> = {
  id: 'hyp-pvalue-table',
  sample: (rng, difficulty) => {
    const rows = difficulty > 1 ? 4 : 3;
    for (;;) {
      const n = rng.int(8, 25);
      const p = rng.pick(PS);
      const lo = Math.max(2, Math.ceil(n * p));
      if (lo > n - rows) continue;
      const k = rng.int(lo, n - rows);
      if (!quotableRange(n, p, k - 2, k + rows)) continue;
      const cells = Array.from({ length: rows + 3 }, (_, i) => q(n, p, k - 2 + i));
      if (new Set(cells).size < cells.length) continue;
      return { n, p, k, rows };
    }
  },
  render: ({ n, p, k, rows }): Slide => {
    const table: (string | null)[][] = [[`${k - 1}`, P4(q(n, p, k - 1)), '']];
    const answer: string[] = [];
    for (let x = k; x < k + rows; x += 1) {
      table.push([`${x}`, P4(q(n, p, x)), null]);
      answer.push(P4(upper(n, p, x)));
    }
    const slips = [
      P4(10000 - q(n, p, k + rows - 1)),
      P4(10000 - q(n, p, k - 2)),
      P4(q(n, p, k)),
      P4(q(n, p, k + 1)),
      P4(10000 - q(n, p, k + rows)),
    ];
    return {
      kind: 'table',
      prompt: [
        say(`$${model(n, p)}$. Fill in $P(X \\ge x)$ from the cumulative column: $P(X \\ge x) = 1 - P(X \\le x - 1)$.`),
      ],
      columns: ['x', 'P(X \\le x)', 'P(X \\ge x)'],
      rows: table,
      bank: decimalBank(answer, slips, 3),
      answer,
    };
  },
  solution: ({ n, p, k, rows }) => {
    const steps: SolutionStep[] = [{ text: '"At least $x$" is everything except $0$ to $x - 1$, which is the cumulative one row up.' }];
    for (let x = k; x < k + rows; x += 1) {
      steps.push({ tex: chain(`P(X \\ge ${x})`, `1 - ${P4(q(n, p, x - 1))}`, P4(upper(n, p, x))) });
    }
    return steps;
  },
};

interface PValueParams {
  ctx: number;
  p: number;
  n: number;
  x: number;
  tail: OneTail;
  /** Difficulty 2 asks for "the p-value" without naming the probability. */
  hard: boolean;
}

/** The p-value of a one-tailed test, in ten-thousandths. */
const pOf = ({ n, p, x, tail }: { n: number; p: number; x: number; tail: OneTail }): number =>
  tail === 'up' ? upper(n, p, x) : q(n, p, x);

const pTex = (x: number, tail: OneTail): string => (tail === 'up' ? `P(X \\ge ${x})` : le(x));

/** The counts strictly on `H_1`'s side of the expected count, leaving out 0 and n. */
function tailSpan(n: number, p: number, tail: OneTail): [number, number] {
  const mean = n * p;
  return tail === 'up' ? [Math.max(1, Math.ceil(mean + 0.5)), n - 1] : [1, Math.min(n - 1, Math.floor(mean - 0.5))];
}

/** A count in the tail `H_1` points at, with a p-value worth quoting. */
function sampleTailCount(rng: Rng, n: number, p: number, tail: OneTail): number | undefined {
  const [lo, hi] = tailSpan(n, p, tail);
  if (lo > hi) return undefined;
  const x = rng.int(lo, hi);
  if (!quotableRange(n, p, x - 1, x + 1)) return undefined;
  const pv = pOf({ n, p, x, tail });
  if (pv < 5 || pv > 3000) return undefined;
  return x;
}

/** The p-value of a one-tailed test from the quoted cumulatives. */
const pvalue: Generator<PValueParams> = {
  id: 'hyp-pvalue',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = rng.int(10, 25);
      const p = rng.pick(PS);
      const tail = difficulty > 1 ? rng.pick(ONE_TAILS) : 'up';
      const x = sampleTailCount(rng, n, p, tail);
      if (x === undefined) continue;
      return { ctx: pickCtx(rng), p, n, x, tail, hard: difficulty > 1 };
    }
  },
  render: ({ ctx, p, n, x, tail, hard }): Slide => {
    const c = CONTEXTS[ctx];
    return {
      kind: 'expression',
      prompt: [
        say(`${claimText(c, p)} ${suspicionText(c, p, tail)} ${sampleText(c, n, x)}`),
        say(`Under $H_0$, $${model(n, p)}$ and`),
        quotes(n, p, [x - 1, x, x + 1]),
        say(
          hard
            ? 'Find the p-value: the probability, if $H_0$ is true, of a result at least as extreme as this one.'
            : `Find the p-value, $P(X \\ge ${x})$.`,
        ),
      ],
      lead: hard ? '\\text{p-value} =' : `P(X \\ge ${x}) =`,
      keypad: [],
      answer: typed(pOf({ n, p, x, tail })),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ p, n, x, tail }) => {
    const pv = pOf({ n, p, x, tail });
    if (tail === 'down') {
      return [
        { text: `$H_1: p < ${fmt(p)}$, so a count this small or smaller is at least as extreme.` },
        { tex: `${le(x)} = ${P4(pv)}` },
        { text: 'It is quoted directly, since the lower tail is already a cumulative.' },
      ];
    }
    return [
      { text: `$H_1: p > ${fmt(p)}$, so a count of $${x}$ or more is at least as extreme.` },
      { tex: chain(`P(X \\ge ${x})`, `1 - ${le(x - 1)}`, `1 - ${P4(q(n, p, x - 1))}`, P4(pv)) },
    ];
  },
};

interface DecisionParams extends PValueParams {
  level: number;
}

/**
 * The decision, as two forks: which tail counts as evidence, then whether its
 * probability is below the level. Each end is the conclusion in the
 * scenario's words. Difficulty 1 quotes the p-value; difficulty 2 quotes
 * cumulatives and leaves the subtraction to the learner.
 */
const decisionFlow: Generator<DecisionParams> = {
  id: 'hyp-decision-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = rng.int(10, 25);
      const p = rng.pick(PS);
      const tail = rng.pick(ONE_TAILS);
      const x = sampleTailCount(rng, n, p, tail);
      if (x === undefined) continue;
      const level = rng.pick([1, 5, 10]);
      const pv = pOf({ n, p, x, tail });
      if (Math.abs(pv - level * 100) < 5) continue;
      // About half should reject, so neither answer is free.
      if (rng.chance(0.5) !== pv < level * 100) continue;
      // The wrong tail's probability is shown too, so it must be quotable.
      if (!quotable(n, p, tail === 'up' ? x : x - 1)) continue;
      return { ctx: pickCtx(rng), p, n, x, tail, level, hard: difficulty > 1 };
    }
  },
  render: ({ ctx, p, n, x, tail, level, hard }): Slide => {
    const c = CONTEXTS[ctx];
    const words = claimWords(c, p, tail);
    const key = `${ctx}|${n}|${x}|${fmt(p)}|${level}`;
    const ask = (t: OneTail) =>
      hard
        ? `Is $${pTex(x, t)}$ below $${asProb(level)}$?`
        : `Is $${pTex(x, t)} = ${P4(pOf({ n, p, x, tail: t }))}$ below $${asProb(level)}$?`;
    const ends = [
      { label: 'Yes', outcome: verdict(words, level, true) },
      { label: 'No', outcome: verdict(words, level, false) },
    ];
    const large = 'A large count';
    const small = 'A small count';
    return {
      kind: 'flow',
      prompt: [
        say(`${claimText(c, p)} ${suspicionText(c, p, tail)} ${sampleText(c, n, x)} The test is at the ${level}% level.`),
        hard ? quotes(n, p, [x - 1, x, x + 1]) : say(`Under $H_0$, $${model(n, p)}$.`),
      ],
      subject: `H_1: p ${OP[tail]} ${fmt(p)}, \\quad X = ${x}`,
      steps: [
        {
          id: 'tail',
          ask: 'Which counts as evidence for $H_1$?',
          branches: spun(
            [
              { label: large, to: 'up' },
              { label: small, to: 'down' },
            ],
            key,
          ),
        },
        { id: 'up', ask: ask('up'), branches: spun(ends, `${key}|u`) },
        { id: 'down', ask: ask('down'), branches: spun(ends, `${key}|d`) },
      ],
      answer: [tail === 'up' ? large : small, pOf({ n, p, x, tail }) < level * 100 ? 'Yes' : 'No'],
    };
  },
  solution: ({ ctx, p, n, x, tail, level }) => {
    const c = CONTEXTS[ctx];
    const pv = pOf({ n, p, x, tail });
    const reject = pv < level * 100;
    return [
      { text: `$H_1: p ${OP[tail]} ${fmt(p)}$, so ${tail === 'up' ? 'large' : 'small'} counts are the evidence and the p-value is $${pTex(x, tail)}$.` },
      {
        tex:
          tail === 'up'
            ? chain(`P(X \\ge ${x})`, `1 - ${P4(q(n, p, x - 1))}`, P4(pv))
            : `${le(x)} = ${P4(pv)}`,
      },
      { tex: `${P4(pv)} ${reject ? '<' : '>'} ${asProb(level)}` },
      { text: verdict(claimWords(c, p, tail), level, reject) },
    ];
  },
};

interface PChoiceParams {
  ctx: number;
  p: number;
  n: number;
  x: number;
  tail: OneTail;
  hard: boolean;
}

/** Which probability is the p-value: the right tail, and "or more" rather than "exactly". */
const pvalueChoice: Generator<PChoiceParams> = {
  id: 'hyp-pvalue-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = rng.int(10, 40);
      const p = rng.pick(PS);
      const tail = rng.pick(ONE_TAILS);
      const [lo, hi] = tailSpan(n, p, tail);
      if (lo > hi) continue;
      return { ctx: pickCtx(rng), p, n, x: rng.int(lo, hi), tail, hard: difficulty > 1 };
    }
  },
  render: ({ ctx, p, n, x, tail, hard }): Slide => {
    const c = CONTEXTS[ctx];
    const opts =
      tail === 'up'
        ? options(
            { tex: `P(X \\ge ${x})` },
            { tex: `P(X = ${x})` },
            { tex: le(x) },
            { tex: hard ? `P(X > ${x})` : `P(X \\ge ${x + 1})` },
          )
        : options(
            { tex: le(x) },
            { tex: `P(X = ${x})` },
            { tex: `P(X \\ge ${x})` },
            { tex: hard ? `P(X < ${x})` : le(x - 1) },
          );
    return choiceSlide(
      [
        say(`${claimText(c, p)} ${suspicionText(c, p, tail)} ${sampleText(c, n, x)}`),
        say(`Under $H_0$, $${model(n, p)}$. Which probability is the p-value?`),
      ],
      opts,
    );
  },
  solution: ({ p, x, tail }) => [
    {
      text: `The p-value is the chance, if $H_0$ is true, of a result at least as extreme as $${x}$ in the direction of $H_1: p ${OP[tail]} ${fmt(p)}$.`,
    },
    {
      text:
        tail === 'up'
          ? `So $${x}$ or more: $P(X \\ge ${x})$. $P(X = ${x})$ leaves out the counts beyond it, and $P(X > ${x})$ leaves out $${x}$ itself.`
          : `So $${x}$ or fewer: $${le(x)}$. $P(X = ${x})$ leaves out the counts below it, and $P(X < ${x})$ leaves out $${x}$ itself.`,
    },
  ],
};

/* ================================================================
 * Level 1, lesson 4: the critical region and the actual level
 * ================================================================ */

interface RegionParams {
  ctx: number;
  n: number;
  p: number;
  tail: OneTail;
  level: number;
  c: number;
}

/** The cumulatives a one-tailed region needs, with a neighbour either side. */
function regionQuotes({ n, p, tail, c }: Pick<RegionParams, 'n' | 'p' | 'tail' | 'c'>): number[] {
  const from = tail === 'up' ? c - 3 : c - 1;
  const ks: number[] = [];
  for (let k = from; k <= from + 3; k += 1) if (quotable(n, p, k)) ks.push(k);
  return ks;
}

function sampleRegion(rng: Rng, nMin: number, nMax: number, levels: number[]): RegionParams {
  for (;;) {
    const n = rng.int(nMin, nMax);
    const p = rng.pick(PS);
    const tail = rng.pick(ONE_TAILS);
    const level = rng.pick(levels);
    const c = oneTailRegion(n, p, tail, level);
    if (c === undefined) continue;
    return { ctx: pickCtx(rng), n, p, tail, level, c };
  }
}

const regionTex = (tail: OneTail, c: number): string => (tail === 'up' ? `X \\ge ${c}` : `X \\le ${c}`);

/** The actual significance level of a one-tailed region, in ten-thousandths. */
const actualOf = ({ n, p, tail, c }: Pick<RegionParams, 'n' | 'p' | 'tail' | 'c'>): number =>
  tail === 'up' ? upper(n, p, c) : q(n, p, c);

function regionSolution({ n, p, tail, level, c }: RegionParams): SolutionStep[] {
  const cap = asProb(level);
  if (tail === 'up') {
    return [
      { text: `Look for the smallest $c$ with $P(X \\ge c) \\le ${cap}$.` },
      { tex: chain(`P(X \\ge ${c - 1})`, `1 - ${P4(q(n, p, c - 2))}`, `${P4(upper(n, p, c - 1))} > ${cap}`) },
      { tex: chain(`P(X \\ge ${c})`, `1 - ${P4(q(n, p, c - 1))}`, `${P4(upper(n, p, c))} \\le ${cap}`) },
      { text: `So the critical region is $X \\ge ${c}$.` },
    ];
  }
  return [
    { text: `Look for the largest $c$ with $P(X \\le c) \\le ${cap}$.` },
    { tex: aligned([`${le(c)} &= ${P4(q(n, p, c))} \\le ${cap}`, `${le(c + 1)} &= ${P4(q(n, p, c + 1))} > ${cap}`]) },
    { text: `So the critical region is $X \\le ${c}$.` },
  ];
}

/**
 * Shade the critical region of a one-tailed test on a number line. Only
 * small n, so every count has a tick: the region is a ray from its end.
 */
const regionLine: Generator<RegionParams> = {
  id: 'hyp-region-line',
  sample: (rng) => sampleRegion(rng, 5, 10, [5, 10]),
  render: (params): Slide => {
    const { ctx, n, p, tail, level, c } = params;
    const ctxt = CONTEXTS[ctx];
    return {
      kind: 'numberLine',
      prompt: [
        say(`${claimText(ctxt, p)} ${suspicionText(ctxt, p, tail)} The test uses a sample of ${n} at the ${level}% level.`),
        say(`Under $H_0$, $${model(n, p)}$ and`),
        quotes(n, p, regionQuotes(params)),
        say('Shade the critical region for $X$.'),
      ],
      min: -1,
      max: n + 1,
      step: 1,
      answer: tail === 'up' ? `[${c},inf)` : `(-inf,${c}]`,
    };
  },
  solution: (params) => regionSolution(params),
};

/**
 * Tail probabilities for three candidate regions, then the one that is the
 * critical region's: its probability is the actual significance level.
 */
const regionTable: Generator<RegionParams & { k: number }> = {
  id: 'hyp-region-table',
  sample: (rng) => {
    for (;;) {
      const region = sampleRegion(rng, 10, 25, [1, 5, 10]);
      if (region.tail !== 'up') continue;
      const k = region.c - rng.int(0, 2);
      if (!quotableRange(region.n, region.p, k - 1, k + 2)) continue;
      return { ...region, k };
    }
  },
  render: ({ ctx, n, p, level, c, k }): Slide => {
    const ctxt = CONTEXTS[ctx];
    const tails = [k, k + 1, k + 2].map((x) => P4(upper(n, p, x)));
    const answer = [...tails, P4(upper(n, p, c))];
    const slips = [
      P4(q(n, p, k)),
      P4(q(n, p, k + 1)),
      P4(10000 - q(n, p, k + 2)),
      quotable(n, p, k - 2) ? P4(upper(n, p, k - 1)) : undefined,
    ];
    return {
      kind: 'table',
      prompt: [
        say(`${claimText(ctxt, p)} ${suspicionText(ctxt, p, 'up')} The test uses a sample of ${n} at the ${level}% level, and under $H_0$, $${model(n, p)}$.`),
        quotes(n, p, [k - 1, k, k + 1]),
        say('Fill in the probability of each candidate region, then the actual significance level of the test.'),
      ],
      columns: ['c', 'P(X \\ge c)'],
      rows: [[`${k}`, null], [`${k + 1}`, null], [`${k + 2}`, null], ['\\text{actual level}', null]],
      bank: decimalBank(answer, slips, 3),
      answer,
    };
  },
  solution: ({ n, p, level, c, k }) => [
    { tex: aligned([k, k + 1, k + 2].map((x) => `P(X \\ge ${x}) &= 1 - ${P4(q(n, p, x - 1))} \\\\ &= ${P4(upper(n, p, x))}`)) },
    { text: `The smallest region with probability at most $${asProb(level)}$ is $X \\ge ${c}$, so the actual significance level is $${P4(upper(n, p, c))}$.` },
  ],
};

/**
 * The actual significance level: the probability of the critical region
 * under `H_0`, which is at most the stated level and usually below it.
 */
const actualLevel: Generator<RegionParams & { given: boolean }> = {
  id: 'hyp-actual-level',
  sample: (rng, difficulty) => ({ ...sampleRegion(rng, 8, 25, [1, 5, 10]), given: difficulty < 2 }),
  render: (params): Slide => {
    const { ctx, n, p, tail, level, c, given } = params;
    const ctxt = CONTEXTS[ctx];
    return {
      kind: 'expression',
      prompt: [
        say(`${claimText(ctxt, p)} ${suspicionText(ctxt, p, tail)} The test uses a sample of ${n} at the ${level}% level.`),
        say(`Under $H_0$, $${model(n, p)}$ and`),
        quotes(n, p, regionQuotes(params)),
        say(
          given
            ? `The critical region is $${regionTex(tail, c)}$. Find the actual significance level.`
            : 'Find the critical region, then give the actual significance level of the test.',
        ),
      ],
      lead: '\\text{actual level} =',
      keypad: [],
      answer: typed(actualOf(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => [
    ...(params.given ? [] : regionSolution(params)),
    {
      text: `The actual significance level is the probability of landing in the region if $H_0$ is true: $P(${regionTex(params.tail, params.c)}) = ${P4(actualOf(params))}$.`,
    },
    { text: `It is below ${params.level}%, since a count cannot land on a fraction of a region.` },
  ],
};

/** The critical region from four candidates, for n too large for a number line. */
const regionChoice: Generator<RegionParams> = {
  id: 'hyp-region-choice',
  sample: (rng) => sampleRegion(rng, 11, 30, [1, 5, 10]),
  render: (params): Slide => {
    const { ctx, n, p, tail, level, c } = params;
    const ctxt = CONTEXTS[ctx];
    const opts =
      tail === 'up'
        ? options({ tex: `X \\ge ${c}` }, { tex: `X \\ge ${c - 1}` }, { tex: `X \\ge ${c + 1}` }, { tex: `X \\le ${c}` })
        : options({ tex: `X \\le ${c}` }, { tex: `X \\le ${c + 1}` }, { tex: `X \\le ${c - 1}` }, { tex: `X \\ge ${c}` });
    return choiceSlide(
      [
        say(`${claimText(ctxt, p)} ${suspicionText(ctxt, p, tail)} The test uses a sample of ${n} at the ${level}% level.`),
        say(`Under $H_0$, $${model(n, p)}$ and`),
        quotes(n, p, regionQuotes(params)),
        say('Which is the critical region?'),
      ],
      opts,
    );
  },
  solution: (params) => regionSolution(params),
};

/* ================================================================
 * Level 1, lesson 5: two-tailed tests
 * ================================================================ */

interface TwoFlowParams {
  ctx: number;
  n: number;
  p: number;
  x: number;
  level: number;
}

const twoP = ({ n, p, x }: Pick<TwoFlowParams, 'n' | 'p' | 'x'>): number => (x > n * p ? upper(n, p, x) : q(n, p, x));
const twoPTex = ({ n, p, x }: Pick<TwoFlowParams, 'n' | 'p' | 'x'>): string =>
  x > n * p ? `P(X \\ge ${x})` : le(x);

/**
 * A two-tailed decision: which side of the expected count the sample fell,
 * what that tail is compared with, and the verdict.
 */
const twoFlow: Generator<TwoFlowParams> = {
  id: 'hyp-two-flow',
  sample: (rng) => {
    for (;;) {
      const n = rng.int(10, 25);
      const p = rng.pick(PS);
      const tail = rng.pick(ONE_TAILS);
      const x = sampleTailCount(rng, n, p, tail);
      if (x === undefined) continue;
      const level = rng.pick([5, 10]);
      const half = level * 50;
      const pv = twoP({ n, p, x });
      // Between the half and the whole level is the interesting band: the
      // learner who forgets to halve reaches the wrong verdict.
      if (Math.abs(pv - half) < 5 || Math.abs(pv - 2 * half) < 5) continue;
      if (rng.chance(0.5) !== pv < half) continue;
      return { ctx: pickCtx(rng), n, p, x, level };
    }
  },
  render: ({ ctx, n, p, x, level }): Slide => {
    const c = CONTEXTS[ctx];
    const mean = fmt(n * p);
    const above = x > n * p;
    const words = claimWords(c, p, 'two');
    const pv = twoP({ n, p, x });
    const key = `${ctx}|${n}|${x}|${fmt(p)}|${level}`;
    const half = asProb(level / 2);
    return {
      kind: 'flow',
      prompt: [
        say(`${claimText(c, p)} ${suspicionText(c, p, 'two')} ${sampleText(c, n, x)} The test is at the ${level}% level.`),
        say(`Under $H_0$, $${model(n, p)}$ and $${twoPTex({ n, p, x })} = ${P4(pv)}$.`),
      ],
      subject: `H_1: p \\ne ${fmt(p)}, \\quad X = ${x}`,
      steps: [
        {
          id: 'side',
          ask: `$H_0$ expects $np = ${mean}$. Which side of it is $${x}$?`,
          branches: spun(
            [
              { label: above ? 'Above' : 'Below', to: 'split' },
              { label: above ? 'Below' : 'Above', outcome: `No: $${x}$ is ${above ? 'above' : 'below'} $${mean}$, so its tail is the ${above ? 'upper' : 'lower'} one.` },
            ],
            key,
          ),
        },
        {
          id: 'split',
          ask: 'What is that one tail compared with?',
          branches: spun(
            [
              { label: `$${asProb(level)}$, the whole level`, outcome: `No: a two-tailed test splits the ${level}% between the two tails.` },
              { label: `$${half}$, half the level`, to: 'compare' },
            ],
            `${key}|s`,
          ),
        },
        {
          id: 'compare',
          ask: `Is $${P4(pv)}$ below $${half}$?`,
          branches: spun(
            [
              { label: 'Yes', outcome: verdict(words, level, true) },
              { label: 'No', outcome: verdict(words, level, false) },
            ],
            `${key}|c`,
          ),
        },
      ],
      answer: [above ? 'Above' : 'Below', `$${half}$, half the level`, pv < level * 50 ? 'Yes' : 'No'],
    };
  },
  solution: ({ ctx, n, p, x, level }) => {
    const c = CONTEXTS[ctx];
    const pv = twoP({ n, p, x });
    const reject = pv < level * 50;
    return [
      { text: `$H_0$ expects $${fmt(n * p)}$, and $${x}$ is ${x > n * p ? 'above' : 'below'} it, so the ${x > n * p ? 'upper' : 'lower'} tail is the one to look at.` },
      { text: `Two tails share the ${level}%, so each is compared with $${asProb(level / 2)}$.` },
      { tex: aligned([`${twoPTex({ n, p, x })} &= ${P4(pv)}`, `&${reject ? '<' : '>'} ${asProb(level / 2)}`]) },
      { text: verdict(claimWords(c, p, 'two'), level, reject) },
    ];
  },
};

interface TwoRegionParams {
  ctx: number;
  n: number;
  p: number;
  level: number;
  /** Lower region X <= a. */
  a: number;
  /** Upper region X >= b. */
  b: number;
}

/** Both ends of a two-tailed region, each tail at half the level, or undefined. */
function twoRegion(n: number, p: number, level: number): { a: number; b: number } | undefined {
  const half = level * 50;
  let a: number | undefined;
  for (let k = n - 1; k >= 0; k -= 1) {
    if (!quotable(n, p, k)) continue;
    if (q(n, p, k) <= half) {
      if (half - q(n, p, k) < 5 || !quotable(n, p, k + 1) || q(n, p, k + 1) - half < 5) return undefined;
      a = k;
      break;
    }
  }
  let b: number | undefined;
  for (let k = 1; k <= n; k += 1) {
    if (!quotable(n, p, k - 1)) continue;
    if (upper(n, p, k) <= half) {
      if (half - upper(n, p, k) < 5 || k < 2 || !quotable(n, p, k - 2) || upper(n, p, k - 1) - half < 5) return undefined;
      b = k;
      break;
    }
  }
  if (a === undefined || b === undefined || b - a < 2) return undefined;
  return { a, b };
}

function sampleTwoRegion(rng: Rng, nMin: number, nMax: number): TwoRegionParams {
  for (;;) {
    const n = rng.int(nMin, nMax);
    const p = rng.pick(PS);
    const level = rng.pick([5, 10]);
    const region = twoRegion(n, p, level);
    if (!region) continue;
    return { ctx: pickCtx(rng), n, p, level, ...region };
  }
}

const twoQuotes = ({ n, p, a, b }: Pick<TwoRegionParams, 'n' | 'p' | 'a' | 'b'>): number[] => {
  const ks = new Set([a, a + 1, b - 2, b - 1]);
  return [...ks].filter((k) => quotable(n, p, k)).sort((x, y) => x - y);
};

function twoRegionSolution({ n, p, level, a, b }: TwoRegionParams): SolutionStep[] {
  const half = asProb(level / 2);
  return [
    { text: `Each tail gets half of ${level}%: at most $${half}$.` },
    { tex: aligned([`${le(a)} &= ${P4(q(n, p, a))} \\le ${half}`, `${le(a + 1)} &= ${P4(q(n, p, a + 1))} > ${half}`]) },
    { tex: chain(`P(X \\ge ${b})`, `1 - ${P4(q(n, p, b - 1))}`, `${P4(upper(n, p, b))} \\le ${half}`) },
    { tex: chain(`P(X \\ge ${b - 1})`, `1 - ${P4(q(n, p, b - 2))}`, `${P4(upper(n, p, b - 1))} > ${half}`) },
    { text: `So the critical region is $X \\le ${a}$ or $X \\ge ${b}$.` },
  ];
}

/** Both tails of a two-tailed critical region, shaded on a number line. */
const twoRegionLine: Generator<TwoRegionParams> = {
  id: 'hyp-two-region-line',
  sample: (rng) => sampleTwoRegion(rng, 5, 10),
  render: (params): Slide => {
    const { ctx, n, p, level, a, b } = params;
    const c = CONTEXTS[ctx];
    return {
      kind: 'numberLine',
      prompt: [
        say(`${claimText(c, p)} ${suspicionText(c, p, 'two')} The test uses a sample of ${n} at the ${level}% level.`),
        say(`Under $H_0$, $${model(n, p)}$ and`),
        quotes(n, p, twoQuotes(params)),
        say('Shade the critical region for $X$: both tails.'),
      ],
      min: -1,
      max: n + 1,
      step: 1,
      answer: `(-inf,${a}]|[${b},inf)`,
    };
  },
  solution: (params) => twoRegionSolution(params),
};

interface TwoTilesParams {
  ctx: number;
  p: number;
  level: number;
}

/**
 * The alternative of a two-tailed test and what each tail is held to: `\ne`,
 * and half the level. The bank offers the whole level and double it.
 */
const twoTiles: Generator<TwoTilesParams> = {
  id: 'hyp-two-tiles',
  sample: (rng) => ({ ctx: pickCtx(rng), p: rng.pick(PS), level: rng.pick([1, 2, 5, 10]) }),
  render: ({ ctx, p, level }): Slide => {
    const c = CONTEXTS[ctx];
    const P = fmt(p);
    const answer = ['\\ne', P, '\\frac{\\alpha}{2}', asProb(level / 2)];
    return {
      kind: 'tiles',
      prompt: [
        say(`${claimText(c, p)} ${suspicionText(c, p, 'two')} The test is at the ${level}% level, $\\alpha = ${asProb(level)}$.`),
        say('Complete the alternative hypothesis and what each tail is compared with.'),
      ],
      template: 'H_1: p {0} {1}, \\quad \\text{each tail: } {2} = {3}',
      bank: tokenBank(answer, ['>', '<', '\\alpha', '2\\alpha', asProb(level), asProb(level * 2)], 5),
      answer,
    };
  },
  solution: ({ p, level }) => [
    { text: 'A change either way counts, so $H_1$ uses $\\ne$ and the test has two tails.' },
    { tex: `H_1: p \\ne ${fmt(p)}` },
    { text: `The ${level}% is shared between the tails, so each gets half.` },
    { tex: `\\frac{\\alpha}{2} = \\frac{${asProb(level)}}{2} = ${asProb(level / 2)}` },
  ],
};

/** The actual significance level of a two-tailed test: both tails' probabilities added. */
const twoLevel: Generator<TwoRegionParams> = {
  id: 'hyp-two-level',
  sample: (rng) => sampleTwoRegion(rng, 10, 20),
  render: (params): Slide => {
    const { ctx, n, p, level, a, b } = params;
    const c = CONTEXTS[ctx];
    return {
      kind: 'expression',
      prompt: [
        say(`${claimText(c, p)} ${suspicionText(c, p, 'two')} A test at the ${level}% level uses a sample of ${n}.`),
        say(`Under $H_0$, $${model(n, p)}$ and`),
        quotes(n, p, twoQuotes(params)),
        say(`The critical region is $X \\le ${a}$ or $X \\ge ${b}$. Find the actual significance level.`),
      ],
      lead: '\\text{actual level} =',
      keypad: [],
      answer: typed(q(n, p, a) + upper(n, p, b)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ n, p, a, b }) => [
    { text: 'The actual level is the chance of landing in either tail if $H_0$ is true.' },
    { tex: `${le(a)} = ${P4(q(n, p, a))}` },
    { tex: chain(`P(X \\ge ${b})`, `1 - ${P4(q(n, p, b - 1))}`, P4(upper(n, p, b))) },
    { tex: chain('\\text{level}', `${P4(q(n, p, a))} + ${P4(upper(n, p, b))}`, P4(q(n, p, a) + upper(n, p, b))) },
  ],
};

/* ================================================================
 * Normal: the model behind level 2
 * ================================================================ */

interface MeanContext {
  /** Follows "the mean". */
  quantity: string;
  unit: string;
  mus: number[];
}

const range = (from: number, to: number, step = 1): number[] =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

const MEAN_CONTEXTS: MeanContext[] = [
  { quantity: 'mass of a bag of flour', unit: 'g', mus: [500, 750, 1000, 1500] },
  { quantity: 'time a pizza delivery takes', unit: 'minutes', mus: range(25, 45) },
  { quantity: 'length of a bolt', unit: 'mm', mus: range(40, 80, 5) },
  { quantity: 'lifetime of a battery', unit: 'hours', mus: range(100, 200, 10) },
  { quantity: 'height of a seedling after four weeks', unit: 'cm', mus: range(12, 30) },
  { quantity: 'volume of juice in a carton', unit: 'ml', mus: [250, 330, 500, 750, 1000] },
  { quantity: 'time to run 400 m', unit: 'seconds', mus: range(55, 75) },
  { quantity: 'reaction time of a driver', unit: 'ms', mus: range(200, 300, 10) },
];

const NS = [4, 9, 16, 25, 36, 100];

interface MeanScene {
  ctx: number;
  mu: number;
  n: number;
  /** The standard error, sigma / sqrt(n), whole. */
  s: number;
  /** z in hundredths. */
  zh: number;
  tail: Tail;
  level: number;
}

const sigmaOf = ({ s, n }: Pick<MeanScene, 's' | 'n'>): number => s * Math.round(Math.sqrt(n));
const zOf = ({ zh }: Pick<MeanScene, 'zh'>): number => zh / 100;
const xbarOf = ({ mu, zh, s }: Pick<MeanScene, 'mu' | 'zh' | 's'>): number => mu + (zh * s) / 100;

/** The critical values the course uses, by level and number of tails. */
const Z_ONE: Record<string, number> = { '5': 1.645, '2.5': 1.96, '1': 2.326, '0.5': 2.576 };
const Z_TWO: Record<string, number> = { '10': 1.645, '5': 1.96, '2': 2.326, '1': 2.576 };

const critical = (level: number, tail: Tail): number => (tail === 'two' ? Z_TWO : Z_ONE)[String(level)];

/** The critical region for z. */
function zRegionTex(level: number, tail: Tail): string {
  const c = fmt(critical(level, tail));
  if (tail === 'up') return `z > ${c}`;
  if (tail === 'down') return `z < -${c}`;
  return `|z| > ${c}`;
}

/** Two plausible wrong regions: the wrong tail, and the wrong number of tails. */
function wrongRegions(level: number, tail: Tail): string[] {
  const one = Z_ONE[String(level)];
  const two = Z_TWO[String(level)];
  if (tail === 'two') return [`z > ${fmt(two)}`, one === undefined ? `z < -${fmt(two)}` : `|z| > ${fmt(one)}`];
  return [tail === 'up' ? `z < -${fmt(one)}` : `z > ${fmt(one)}`, `|z| > ${fmt(two)}`];
}

const inRegion = (sc: MeanScene): boolean => {
  const c = critical(sc.level, sc.tail);
  const z = zOf(sc);
  if (sc.tail === 'up') return z > c;
  if (sc.tail === 'down') return z < -c;
  return Math.abs(z) > c;
};

interface MeanOptions {
  tails?: Tail[];
  /** |z| drawn in hundredths from this range. */
  zLo?: number;
  zHi?: number;
  /** Draw z to one place, for a slider. */
  tenths?: boolean;
  ns?: number[];
}

function sampleMean(rng: Rng, { tails = TAILS, zLo = 20, zHi = 320, tenths = false, ns = NS }: MeanOptions = {}): MeanScene {
  for (;;) {
    const ctx = rng.int(0, MEAN_CONTEXTS.length - 1);
    const mu = rng.pick(MEAN_CONTEXTS[ctx].mus);
    const n = rng.pick(ns);
    const s = rng.int(1, 8);
    if (sigmaOf({ s, n }) * 3 > mu) continue;
    const tail = rng.pick(tails);
    const size = tenths ? rng.int(Math.ceil(zLo / 10), Math.floor(zHi / 10)) * 10 : rng.int(zLo, zHi);
    const sign = tail === 'up' ? 1 : tail === 'down' ? -1 : rng.sign();
    const level = tail === 'two' ? rng.pick([1, 5, 10]) : rng.pick([1, 5]);
    const sc = { ctx, mu, n, s, zh: sign * size, tail, level };
    // Never so close to the critical value that the decision is a rounding question.
    if (Math.abs(Math.abs(zOf(sc)) - critical(level, tail)) < 0.03) continue;
    return sc;
  }
}

const SUSPECT: Record<Tail, string> = { up: 'has increased', down: 'has decreased', two: 'has changed' };

function meanClaim(sc: MeanScene): string {
  const c = MEAN_CONTEXTS[sc.ctx];
  return `The mean ${c.quantity} is claimed to be $${sc.mu}$ ${c.unit}, with standard deviation $${sigmaOf(sc)}$ ${c.unit}.`;
}

const meanSuspicion = (sc: MeanScene): string => `It is suspected that the mean ${SUSPECT[sc.tail]}.`;

const meanSample = (sc: MeanScene): string =>
  `A random sample of $${sc.n}$ has mean $\\bar{x} = ${fmt(xbarOf(sc))}$ ${MEAN_CONTEXTS[sc.ctx].unit}.`;

const meanWords = (sc: MeanScene): string => `the mean ${MEAN_CONTEXTS[sc.ctx].quantity} ${SUSPECT[sc.tail]}`;

const zFormula = (sc: MeanScene): string =>
  chain(
    'z',
    '\\frac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}',
    `\\frac{${fmt(xbarOf(sc))} - ${sc.mu}}{${sigmaOf(sc)} / \\sqrt{${sc.n}}}`,
    `\\frac{${fmt((sc.zh * sc.s) / 100)}}{${sc.s}} = ${fmt(zOf(sc))}`,
  );

/** The standard normal density. */
const phi = (x: number): number => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);

const Z_SPAN = 3.5;

/** The standard normal curve with a dashed line at its centre, and a tail shaded from `edge` outward. */
function normalSvg(label: string, shadeFrom?: { edge: number; tail: OneTail }): string {
  return plotSvg({
    xMin: -Z_SPAN,
    xMax: Z_SPAN,
    yMin: 0,
    yMax: 0.45,
    curves: [{ f: phi }],
    verticals: [{ x: 0, dashed: true }],
    shade: shadeFrom
      ? shadeFrom.tail === 'up'
        ? { f: phi, from: shadeFrom.edge, to: Z_SPAN }
        : { f: phi, from: -Z_SPAN, to: shadeFrom.edge }
      : undefined,
    label,
  });
}

/* ================================================================
 * Level 2, lesson 1: the distribution of the sample mean
 * ================================================================ */

interface MeanModelParams extends MeanScene {
  /** Difficulty 2 gives the variance of X rather than its standard deviation. */
  variance: boolean;
}

/** `\bar{X} ~ N(\mu, \sigma^2/n)` with the numbers put in. */
const meanModelTiles: Generator<MeanModelParams> = {
  id: 'hyp-mean-model-tiles',
  sample: (rng, difficulty) => ({ ...sampleMean(rng), variance: difficulty > 1 }),
  render: (sc): Slide => {
    const c = MEAN_CONTEXTS[sc.ctx];
    const sigma = sigmaOf(sc);
    const answer = [String(sc.mu), String(sc.s * sc.s)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          sc.variance
            ? `The ${c.quantity} is modelled as normal with mean $${sc.mu}$ ${c.unit} and variance $${sigma * sigma}$.`
            : `The ${c.quantity} is modelled as normal with mean $${sc.mu}$ ${c.unit} and standard deviation $${sigma}$ ${c.unit}.`,
        ),
        say(`$\\bar{X}$ is the mean of a random sample of $${sc.n}$. Complete its distribution.`),
      ],
      template: '\\bar{X} \\sim N({0}, {1})',
      bank: tokenBank(answer, [String(sigma * sigma), String(sc.s), String(sigma), String(sc.n), String(sc.mu / sc.n)].filter((t) => !t.includes('.')), 3),
      answer,
    };
  },
  solution: (sc) => {
    const sigma = sigmaOf(sc);
    return [
      { text: 'The sample mean keeps the population mean but its variance is divided by the sample size.' },
      { tex: `\\bar{X} \\sim N\\left(\\mu, \\frac{\\sigma^2}{n}\\right)` },
      { tex: `\\frac{\\sigma^2}{n} = \\frac{${sigma * sigma}}{${sc.n}} = ${sc.s * sc.s}` },
      { tex: `\\bar{X} \\sim N(${sc.mu}, ${sc.s * sc.s})` },
    ];
  },
};

/** The standard deviation of the sample mean at difficulty 1, its variance at difficulty 2. */
const meanSe: Generator<MeanModelParams> = {
  id: 'hyp-mean-se',
  sample: (rng, difficulty) => ({ ...sampleMean(rng), variance: difficulty > 1 }),
  render: (sc): Slide => {
    const c = MEAN_CONTEXTS[sc.ctx];
    return {
      kind: 'expression',
      prompt: [
        say(`The ${c.quantity} has mean $${sc.mu}$ ${c.unit} and standard deviation $${sigmaOf(sc)}$ ${c.unit}. A random sample of $${sc.n}$ is taken.`),
        say(sc.variance ? 'Find the variance of the sample mean, $\\bar{X}$.' : 'Find the standard deviation of the sample mean, $\\bar{X}$.'),
      ],
      lead: sc.variance ? '\\text{Var}(\\bar{X}) =' : '\\sigma / \\sqrt{n} =',
      keypad: [],
      answer: String(sc.variance ? sc.s * sc.s : sc.s),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (sc) => {
    const sigma = sigmaOf(sc);
    return sc.variance
      ? [{ tex: chain('\\text{Var}(\\bar{X})', `\\frac{\\sigma^2}{n} = \\frac{${sigma}^2}{${sc.n}}`, `\\frac{${sigma * sigma}}{${sc.n}} = ${sc.s * sc.s}`) }]
      : [
          { tex: `\\frac{\\sigma}{\\sqrt{n}} = \\frac{${sigma}}{\\sqrt{${sc.n}}} = \\frac{${sigma}}{${Math.round(Math.sqrt(sc.n))}} = ${sc.s}` },
          { text: 'Divided by $\\sqrt{n}$, not by $n$: it is the variance that is divided by $n$.' },
        ];
  },
};

/** From the population to the sample mean: the variance, divided by n, then its square root. */
const meanSpreadTree: Generator<MeanScene> = {
  id: 'hyp-mean-spread-tree',
  sample: (rng) => sampleMean(rng),
  render: (sc): Slide => {
    const c = MEAN_CONTEXTS[sc.ctx];
    const sigma = sigmaOf(sc);
    const root = Math.round(Math.sqrt(sc.n));
    const answer = [sigma * sigma, sc.s * sc.s, sc.s];
    return {
      kind: 'tree',
      prompt: [
        say(`The ${c.quantity} has standard deviation $${sigma}$ ${c.unit}. A random sample of $${sc.n}$ is taken.`),
        say('Work down to the standard deviation of $\\bar{X}$: first $\\sigma^2$, then $\\frac{\\sigma^2}{n}$, then its square root.'),
      ],
      expression: '\\sqrt{\\sigma^2 / n}',
      nodes: [
        { id: 'var', from: [] },
        { id: 'vbar', from: ['var'] },
        { id: 'se', from: ['vbar'] },
      ],
      bank: treeBank(answer, [2 * sigma, sigma, sc.s * sc.s * root, sigma * sigma * sc.n, sc.s * root, sc.s * sc.s * sc.s]),
      answer: answer.map(String),
    };
  },
  solution: (sc) => {
    const sigma = sigmaOf(sc);
    return [
      { tex: `\\sigma^2 = ${sigma}^2 = ${sigma * sigma}` },
      { tex: `\\frac{\\sigma^2}{n} = \\frac{${sigma * sigma}}{${sc.n}} = ${sc.s * sc.s}` },
      { tex: `\\sqrt{${sc.s * sc.s}} = ${sc.s}` },
    ];
  },
};

interface SpreadParams {
  ctx: number;
  /** Population standard deviation. */
  sigma: number;
  from: number;
  to: number;
}

/** Pairs of sample sizes whose standard errors are both whole for a suitable sigma. */
const PAIRS: [number, number][] = [
  [4, 16],
  [9, 36],
  [4, 36],
  [25, 100],
  [4, 100],
  [16, 4],
  [36, 9],
  [100, 25],
  [36, 4],
  [100, 4],
];

/**
 * Change the sample size and say what happens to the spread of the sample
 * mean: it moves with the square root of n, not with n.
 */
const meanSpreadChoice: Generator<SpreadParams> = {
  id: 'hyp-mean-spread-choice',
  sample: (rng) => {
    for (;;) {
      const [from, to] = rng.pick(PAIRS);
      const sigma = rng.int(2, 60);
      const a = Math.sqrt(from);
      const b = Math.sqrt(to);
      if (sigma % a !== 0 || sigma % b !== 0) continue;
      return { ctx: rng.int(0, MEAN_CONTEXTS.length - 1), sigma, from, to };
    }
  },
  render: ({ ctx, sigma, from, to }): Slide => {
    const c = MEAN_CONTEXTS[ctx];
    const before = sigma / Math.sqrt(from);
    const after = sigma / Math.sqrt(to);
    // Divided by n rather than its root, unchanged, the variance, and moved the wrong way.
    const slips = [(before * from) / to, before, (sigma * sigma) / to, before * Math.sqrt(to / from)].filter((v) => terminates(v, 3));
    const opts = options(
      { tex: fmt(after), answer: fmt(after) },
      ...slips.map((v) => ({ tex: fmt(v), answer: fmt(v) })),
    ).slice(0, 4);
    return choiceSlide(
      [
        say(`The ${c.quantity} has standard deviation $${sigma}$ ${c.unit}. With samples of $${from}$, the standard deviation of $\\bar{X}$ is $${fmt(before)}$.`),
        say(`What is it with samples of $${to}$ instead?`),
      ],
      opts,
    );
  },
  solution: ({ sigma, from, to }) => [
    { tex: `\\frac{\\sigma}{\\sqrt{n}} = \\frac{${sigma}}{\\sqrt{${to}}} = \\frac{${sigma}}{${Math.sqrt(to)}} = ${fmt(sigma / Math.sqrt(to))}` },
    {
      text: `The sample is $${fmt(to / from)}$ times the size, so the spread is divided by $\\sqrt{${fmt(to / from)}} = ${fmt(Math.sqrt(to / from))}$, not by $${fmt(to / from)}$.`,
    },
  ],
};

/* ================================================================
 * Level 2, lesson 2: the test statistic z
 * ================================================================ */

/** z from the sample: difficulty 1 above the mean only, difficulty 2 either side. */
const zStat: Generator<MeanScene> = {
  id: 'hyp-z',
  sample: (rng, difficulty) => sampleMean(rng, { tails: difficulty > 1 ? TAILS : ['up'] }),
  render: (sc): Slide => ({
    kind: 'expression',
    prompt: [
      say(`${meanClaim(sc)} ${meanSample(sc)}`),
      say('Find the test statistic $z$.'),
    ],
    lead: 'z =',
    keypad: [],
    answer: fmt(zOf(sc)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (sc) => [
    { text: `Under $H_0$, $\\bar{X} \\sim N(${sc.mu}, ${sc.s * sc.s})$, so the standard deviation of $\\bar{X}$ is $${sc.s}$.` },
    { tex: zFormula(sc) },
  ],
};

/** z worked in three reductions: the gap, the standard error, then the division. */
const standardiseSteps: Generator<MeanScene> = {
  id: 'hyp-standardise-steps',
  sample: (rng) => sampleMean(rng),
  render: (sc): Slide => {
    const xbar = fmt(xbarOf(sc));
    const sigma = sigmaOf(sc);
    const root = Math.round(Math.sqrt(sc.n));
    const d = (sc.zh * sc.s) / 100;
    const z = zOf(sc);
    return {
      kind: 'steps',
      prompt: [
        say(`${meanClaim(sc)} ${meanSample(sc)}`),
        say('Work out $z$ one step at a time.'),
      ],
      start: ['(', xbar, '-', `${sc.mu}`, ')', '\\div', '(', `${sigma}`, '\\div', `\\sqrt{${sc.n}}`, ')'],
      reductions: [
        { span: [1, 4], operator: 2, value: fmt(d), bank: stepBank(fmt(d), fmt(-d), fmt(d + 1), fmt(xbarOf(sc) + sc.mu)) },
        { span: [4, 9], operator: 6, value: `${sc.s}`, bank: stepBank(`${sc.s}`, fmt(sigma / sc.n), `${sigma * root}`, `${sc.s * sc.s}`) },
        { span: [0, 5], operator: 3, value: fmt(z), bank: stepBank(fmt(z), fmt(-z), fmt(d * sc.s), fmt(z * 10)) },
      ],
    };
  },
  solution: (sc) => [
    { tex: chain('\\bar{x} - \\mu', `${fmt(xbarOf(sc))} - ${sc.mu}`, fmt((sc.zh * sc.s) / 100)) },
    { tex: `\\frac{\\sigma}{\\sqrt{n}} = \\frac{${sigmaOf(sc)}}{\\sqrt{${sc.n}}} = ${sc.s}` },
    { tex: `z = ${fmt((sc.zh * sc.s) / 100)} \\div ${sc.s} = ${fmt(zOf(sc))}` },
  ],
};

/** The z statistic set up in its form: which number goes on top, which underneath. */
const zTiles: Generator<MeanScene> = {
  id: 'hyp-z-tiles',
  sample: (rng) => sampleMean(rng),
  render: (sc): Slide => {
    const xbar = fmt(xbarOf(sc));
    const sigma = sigmaOf(sc);
    const answer = [xbar, `${sc.mu}`, `\\frac{${sigma}}{\\sqrt{${sc.n}}}`];
    return {
      kind: 'tiles',
      prompt: [
        say(`${meanClaim(sc)} ${meanSample(sc)}`),
        say('Set up the test statistic.'),
      ],
      template: 'z = ({0} - {1}) \\div {2}',
      bank: tokenBank(answer, [`\\frac{${sigma}}{${sc.n}}`, `\\frac{${sigma * sigma}}{${sc.n}}`, `${sigma}`, `${sc.n}`], 3),
      answer,
    };
  },
  solution: (sc) => [
    { text: 'Standardise the sample mean: subtract the mean $H_0$ claims, and divide by the standard deviation of $\\bar{X}$, which is $\\frac{\\sigma}{\\sqrt{n}}$.' },
    { tex: zFormula(sc) },
  ],
};

/**
 * Work out z and slide the line to it, over the standard normal curve with
 * the critical region shaded: where it lands is the decision.
 */
const zSlider: Generator<MeanScene> = {
  id: 'hyp-z-slider',
  sample: (rng) => sampleMean(rng, { tails: ['up', 'down'], tenths: true, zLo: 30, zHi: 330 }),
  render: (sc): Slide => {
    const c = critical(sc.level, sc.tail);
    const tail = sc.tail as OneTail;
    return {
      kind: 'slider',
      prompt: [
        say(`${meanClaim(sc)} ${meanSuspicion(sc)} ${meanSample(sc)}`),
        say(`The shaded tail is the critical region at the ${sc.level}% level. Work out $z$ and slide the line to it.`),
      ],
      min: -Z_SPAN,
      max: Z_SPAN,
      step: 0.1,
      answer: zOf(sc),
      readout: 'z = {v}',
      figure: {
        svg: normalSvg('The standard normal curve with one tail shaded as the critical region', {
          edge: tail === 'up' ? c : -c,
          tail,
        }),
        ...markerWindow(-Z_SPAN, Z_SPAN),
      },
    };
  },
  solution: (sc) => [
    { tex: zFormula(sc) },
    {
      text: inRegion(sc)
        ? `It lies in the shaded tail, beyond $${sc.tail === 'up' ? '' : '-'}${fmt(critical(sc.level, sc.tail))}$.`
        : `It lies outside the shaded tail, which starts at $${sc.tail === 'up' ? '' : '-'}${fmt(critical(sc.level, sc.tail))}$.`,
    },
  ],
};

/* ================================================================
 * Level 2, lesson 3: critical values
 * ================================================================ */

interface Combo {
  level: number;
  tail: Tail;
}

const COMBOS: Combo[] = [
  { level: 5, tail: 'up' },
  { level: 5, tail: 'down' },
  { level: 1, tail: 'up' },
  { level: 1, tail: 'down' },
  { level: 2.5, tail: 'up' },
  { level: 0.5, tail: 'down' },
  { level: 10, tail: 'two' },
  { level: 5, tail: 'two' },
  { level: 2, tail: 'two' },
  { level: 1, tail: 'two' },
];

/** The critical value as the table writes it: signed for a lower tail, ± for two. */
function criticalToken({ level, tail }: Combo): string {
  const c = fmt(critical(level, tail));
  if (tail === 'down') return `-${c}`;
  if (tail === 'two') return `\\pm ${c}`;
  return c;
}

interface CriticalTableParams {
  mu: number;
  rows: number[];
}

/** Critical values for several tests at once: level, direction, value. */
const criticalTable: Generator<CriticalTableParams> = {
  id: 'hyp-critical-table',
  sample: (rng, difficulty) => {
    const size = difficulty > 1 ? 4 : 3;
    return { mu: rng.int(10, 90), rows: rng.sample(range(0, COMBOS.length - 1), size) };
  },
  render: ({ mu, rows }): Slide => {
    const answer = rows.map((i) => criticalToken(COMBOS[i]));
    const slips = ['1.645', '1.96', '2.326', '2.576'].flatMap((c) => [c, `-${c}`, `\\pm ${c}`]);
    return {
      kind: 'table',
      prompt: [say(`Each row is a test of $H_0: \\mu = ${mu}$. Fill in the critical value of $z$ for each.`)],
      columns: ['\\text{level}', 'H_1', '\\text{critical } z'],
      rows: rows.map((i) => [`${fmt(COMBOS[i].level)}\\%`, `\\mu ${OP[COMBOS[i].tail]} ${mu}`, null]),
      bank: tokenBank(answer, spun(slips, `${mu}|${rows.join(',')}`), 3),
      answer,
    };
  },
  solution: ({ mu, rows }) => [
    { text: 'One tail holds the whole level; two tails hold half each.' },
    ...rows.flatMap((i): SolutionStep[] => {
      const { level, tail } = COMBOS[i];
      return [
        {
          text: `$H_1: \\mu ${OP[tail]} ${mu}$ at ${fmt(level)}%: ${tail === 'two' ? `${fmt(level / 2)}% in each tail` : `all ${fmt(level)}% in the ${tail === 'up' ? 'upper' : 'lower'} tail`}, so`,
        },
        { tex: zRegionTex(level, tail) },
      ];
    }),
  ],
};

interface CriticalFlowParams {
  mu: number;
  level: number;
  tail: Tail;
}

/**
 * One tail or two, then the value: the route from `H_1` and a level to the
 * critical region. Each end is the rule for rejecting.
 */
const criticalFlow: Generator<CriticalFlowParams> = {
  id: 'hyp-critical-flow',
  sample: (rng) => {
    const combo = rng.pick(COMBOS);
    return { mu: rng.int(10, 90), ...combo };
  },
  render: ({ mu, level, tail }): Slide => {
    const key = `${mu}|${level}|${tail}`;
    const values = [1.645, 1.96, 2.326, 2.576];
    const leaf = (t: Tail, v: number) => {
      const region = t === 'up' ? `z > ${fmt(v)}` : t === 'down' ? `z < -${fmt(v)}` : `|z| > ${fmt(v)}`;
      return { label: `$${fmt(v)}$`, outcome: `Reject $H_0$ when $${region}$.` };
    };
    const oneTail: Tail = tail === 'two' ? 'up' : tail;
    return {
      kind: 'flow',
      prompt: [say(`A test of $H_0: \\mu = ${mu}$ at the ${fmt(level)}% level. Find the critical region.`)],
      subject: `H_1: \\mu ${OP[tail]} ${mu}`,
      steps: [
        {
          id: 'tails',
          ask: 'One tail or two?',
          branches: spun(
            [
              { label: 'One', to: 'one' },
              { label: 'Two', to: 'two' },
            ],
            key,
          ),
        },
        {
          id: 'one',
          ask: `The whole ${fmt(level)}% sits in one tail. Which critical value?`,
          branches: spun(values.map((v) => leaf(oneTail, v)), `${key}|1`),
        },
        {
          id: 'two',
          ask: `Each tail holds half the level. Which critical value?`,
          branches: spun(values.map((v) => leaf('two', v)), `${key}|2`),
        },
      ],
      answer: [tail === 'two' ? 'Two' : 'One', `$${fmt(critical(level, tail))}$`],
    };
  },
  solution: ({ mu, level, tail }) => [
    {
      text:
        tail === 'two'
          ? `$H_1: \\mu \\ne ${mu}$ names no direction, so two tails of $${fmt(level / 2)}\\%$ each.`
          : `$H_1: \\mu ${OP[tail]} ${mu}$ names a direction, so one tail of $${fmt(level)}\\%$.`,
    },
    { tex: zRegionTex(level, tail) },
  ],
};

/** The critical region for z from four, with a one-or-two-tailed slip and a wrong direction among them. */
const zRegionChoice: Generator<CriticalFlowParams> = {
  id: 'hyp-z-region-choice',
  sample: (rng) => ({ mu: rng.int(10, 90), ...rng.pick(COMBOS.filter((c) => c.level === 5 || c.level === 1)) }),
  render: ({ mu, level, tail }): Slide => {
    const regionWith = (t: Tail, v: number) => (t === 'up' ? `z > ${fmt(v)}` : t === 'down' ? `z < -${fmt(v)}` : `|z| > ${fmt(v)}`);
    const one = Z_ONE[String(level)];
    const two = Z_TWO[String(level)];
    // The value for the wrong number of tails, the right value the wrong way,
    // and the right value with the wrong number of tails.
    const slips =
      tail === 'two'
        ? [regionWith('two', one), regionWith('up', two), regionWith('up', one)]
        : [regionWith(tail, two), regionWith(tail === 'up' ? 'down' : 'up', one), regionWith('two', one)];
    return choiceSlide(
      [say(`A test of $H_0: \\mu = ${mu}$ against $H_1: \\mu ${OP[tail]} ${mu}$, at the ${fmt(level)}% level. Which is the critical region?`)],
      options({ tex: zRegionTex(level, tail) }, ...slips.map((tex) => ({ tex }))),
    );
  },
  solution: ({ mu, level, tail }) => [
    {
      text:
        tail === 'two'
          ? `No direction in $H_1$, so $${fmt(level / 2)}\\%$ in each tail.`
          : `$H_1$ points ${tail === 'up' ? 'up' : 'down'}, so all $${fmt(level)}\\%$ sits in the ${tail === 'up' ? 'upper' : 'lower'} tail.`,
    },
    { tex: aligned([`&H_1: \\mu ${OP[tail]} ${mu}`, `\\Rightarrow \\; &${zRegionTex(level, tail)}`]) },
  ],
};

/**
 * Slide the line to a critical value on the standard normal curve. The
 * slider moves in steps of 0.05 and accepts anything within 0.06 of the
 * value, which keeps each of the four values' targets apart.
 */
const criticalSlider: Generator<CriticalFlowParams> = {
  id: 'hyp-critical-slider',
  sample: (rng, difficulty) => ({
    mu: rng.int(10, 90),
    ...rng.pick(difficulty > 1 ? COMBOS : COMBOS.filter((c) => c.tail === 'up')),
  }),
  render: ({ mu, level, tail }): Slide => {
    const c = critical(level, tail);
    const signed = tail === 'down' ? -c : c;
    return {
      kind: 'slider',
      prompt: [
        say(
          `A test of $H_0: \\mu = ${mu}$ against $H_1: \\mu ${OP[tail]} ${mu}$ at the ${fmt(level)}% level. Slide the line to the ${tail === 'two' ? 'upper ' : ''}critical value of $z$, as near as the slider allows.`,
        ),
      ],
      min: -3,
      max: 3,
      step: 0.05,
      answer: Number((Math.round(signed * 20) / 20).toFixed(2)),
      tolerance: 0.06,
      readout: 'z = {v}',
      figure: {
        svg: normalSvg('The standard normal curve, centred on zero'),
        ...markerWindow(-Z_SPAN, Z_SPAN),
      },
    };
  },
  solution: ({ level, tail }) => [
    {
      text:
        tail === 'two'
          ? `Two tails of $${fmt(level / 2)}\\%$ each, so the upper critical value is $${fmt(critical(level, tail))}$.`
          : `One tail of $${fmt(level)}\\%$, so the critical value is $${tail === 'down' ? '-' : ''}${fmt(critical(level, tail))}$.`,
    },
  ],
};

/* ================================================================
 * Level 2, lesson 4: the decision and the conclusion
 * ================================================================ */

interface DecideParams extends MeanScene {
  /** Difficulty 2 gives the data and leaves z to the learner. */
  hard: boolean;
}

function sampleDecide(rng: Rng, difficulty: number): DecideParams {
  for (;;) {
    const sc = sampleMean(rng, { zLo: 30, zHi: 300 });
    // About half should reject, so neither end is free.
    if (rng.chance(0.5) !== inRegion(sc)) continue;
    return { ...sc, hard: difficulty > 1 };
  }
}

const verdictMean = (sc: MeanScene, reject: boolean): string => verdict(meanWords(sc), sc.level, reject);

/**
 * The critical region, then whether z is in it; each end is the conclusion
 * in the scenario's words. The wrong regions end at a line saying why.
 */
const meanDecisionFlow: Generator<DecideParams> = {
  id: 'hyp-mean-decision-flow',
  sample: sampleDecide,
  render: (sc): Slide => {
    const key = `${sc.ctx}|${sc.mu}|${sc.zh}|${sc.level}|${sc.tail}`;
    const right = zRegionTex(sc.level, sc.tail);
    const branches = [
      { label: `$${right}$`, to: 'in' },
      ...wrongRegions(sc.level, sc.tail).map((tex) => ({
        label: `$${tex}$`,
        outcome:
          sc.tail === 'two'
            ? 'Not this region: $H_1$ names no direction, so both tails count.'
            : tex.startsWith('|')
              ? 'Not this region: that is a two-tailed test, and $H_1$ names a direction.'
              : 'Not this region: it is the wrong tail for $H_1$.',
      })),
    ];
    return {
      kind: 'flow',
      prompt: [
        say(`${meanClaim(sc)} ${meanSuspicion(sc)} ${meanSample(sc)} The test is at the ${fmt(sc.level)}% level.`),
        ...(sc.hard ? [] : [say(`The test statistic is $z = ${fmt(zOf(sc))}$.`)]),
      ],
      subject: `H_1: \\mu ${OP[sc.tail]} ${sc.mu}`,
      steps: [
        { id: 'region', ask: 'Which is the critical region?', branches: spun(branches, key) },
        {
          id: 'in',
          ask: sc.hard ? 'Work out $z$. Is it in the critical region?' : `Is $z = ${fmt(zOf(sc))}$ in the critical region?`,
          branches: spun(
            [
              { label: 'Yes', outcome: verdictMean(sc, true) },
              { label: 'No', outcome: verdictMean(sc, false) },
            ],
            `${key}|in`,
          ),
        },
      ],
      answer: [`$${right}$`, inRegion(sc) ? 'Yes' : 'No'],
    };
  },
  solution: (sc) => [
    { tex: zFormula(sc) },
    { tex: `\\text{critical region: } ${zRegionTex(sc.level, sc.tail)}` },
    { text: verdictMean(sc, inRegion(sc)) },
  ],
};

/** The conclusion worded properly: evidence, the level, and the context, never proof. */
const conclusionChoice: Generator<DecideParams> = {
  id: 'hyp-conclusion-choice',
  sample: sampleDecide,
  render: (sc): Slide => {
    const c = MEAN_CONTEXTS[sc.ctx];
    const level = fmt(sc.level);
    const words = meanWords(sc);
    const reject = inRegion(sc);
    const yes = `There is evidence at the ${level}% level that ${words}.`;
    const no = `There is not enough evidence at the ${level}% level that ${words}.`;
    const opposite = sc.tail === 'up' ? 'has decreased' : sc.tail === 'down' ? 'has increased' : `is still ${sc.mu}`;
    return choiceSlide(
      [
        say(`${meanClaim(sc)} ${meanSuspicion(sc)} ${meanSample(sc)}`),
        say(`At the ${level}% level the critical region is $${zRegionTex(sc.level, sc.tail)}$, and $z = ${fmt(zOf(sc))}$. Which conclusion is right?`),
      ],
      options(
        { tex: reject ? yes : no },
        { tex: reject ? no : yes },
        { tex: `This proves that ${words}.` },
        { tex: `There is evidence at the ${level}% level that the mean ${c.quantity} ${opposite}.` },
      ),
      false,
    );
  },
  solution: (sc) => [
    { text: `$z = ${fmt(zOf(sc))}$ is ${inRegion(sc) ? '' : 'not '}in the critical region $${zRegionTex(sc.level, sc.tail)}$.` },
    { text: `${inRegion(sc) ? 'So' : 'So there is no reason to'} reject $H_0$. A test gives evidence at a level, never proof, and the conclusion says what it means for the ${MEAN_CONTEXTS[sc.ctx].quantity}.` },
  ],
};

/**
 * The critical value of the sample mean itself: how far from the claimed
 * mean `\bar{x}` must be before the test rejects.
 */
const meanXbar: Generator<MeanScene> = {
  id: 'hyp-mean-xbar',
  sample: (rng, difficulty) => sampleMean(rng, { tails: difficulty > 1 ? TAILS : ['up', 'down'] }),
  render: (sc): Slide => {
    const c = MEAN_CONTEXTS[sc.ctx];
    const ask =
      sc.tail === 'up'
        ? 'the smallest sample mean'
        : sc.tail === 'down'
          ? 'the largest sample mean'
          : 'the upper critical value of the sample mean';
    return {
      kind: 'expression',
      prompt: [
        say(`${meanClaim(sc)} ${meanSuspicion(sc)} A random sample of $${sc.n}$ is to be taken, and the test is at the ${fmt(sc.level)}% level.`),
        say(`Find ${ask} that would lead to rejecting $H_0$, in ${c.unit}.`),
      ],
      lead: '\\bar{x} =',
      keypad: [],
      answer: fmt(sc.mu + (sc.tail === 'down' ? -1 : 1) * critical(sc.level, sc.tail) * sc.s),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (sc) => {
    const c = critical(sc.level, sc.tail);
    const sign = sc.tail === 'down' ? '-' : '+';
    return [
      { tex: `\\frac{\\sigma}{\\sqrt{n}} = \\frac{${sigmaOf(sc)}}{\\sqrt{${sc.n}}} = ${sc.s}` },
      { text: `The boundary is where $z = ${sc.tail === 'down' ? '-' : ''}${fmt(c)}$, so $\\bar{x}$ sits that many standard deviations from $${sc.mu}$.` },
      { tex: chain('\\bar{x}', `${sc.mu} ${sign} ${fmt(c)} \\times ${sc.s}`, fmt(sc.mu + (sc.tail === 'down' ? -1 : 1) * c * sc.s)) },
    ];
  },
};

/** The whole statistic as a tree: the gap and the standard error, then z. */
const zTree: Generator<MeanScene> = {
  id: 'hyp-z-tree',
  sample: (rng) => sampleMean(rng),
  render: (sc): Slide => {
    const d = (sc.zh * sc.s) / 100;
    const sigma = sigmaOf(sc);
    const z = zOf(sc);
    const answer = [fmt(d), `${sc.s}`, fmt(z)];
    return {
      kind: 'tree',
      prompt: [
        say(`${meanClaim(sc)} ${meanSample(sc)}`),
        say('Top row: $\\bar{x} - \\mu$, then $\\frac{\\sigma}{\\sqrt{n}}$. Underneath, $z$.'),
      ],
      expression: 'z = \\frac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}',
      nodes: [
        { id: 'd', from: [] },
        { id: 'se', from: [] },
        { id: 'z', from: ['d', 'se'] },
      ],
      bank: decimalBank(answer, [fmt(-d), fmt(sigma / sc.n), `${sigma}`, fmt(-z), fmt(d / sigma), fmt(d * sc.s), fmt(z + 1)], 3),
      answer,
    };
  },
  solution: (sc) => [
    { tex: chain('\\bar{x} - \\mu', `${fmt(xbarOf(sc))} - ${sc.mu}`, fmt((sc.zh * sc.s) / 100)) },
    { tex: `\\frac{\\sigma}{\\sqrt{n}} = \\frac{${sigmaOf(sc)}}{\\sqrt{${sc.n}}} = ${sc.s}` },
    { tex: `z = \\frac{${fmt((sc.zh * sc.s) / 100)}}{${sc.s}} = ${fmt(zOf(sc))}` },
  ],
};

/* ================================================================
 * Level 2, lesson 5: the level, and how n moves the verdict
 * ================================================================ */

interface AlarmParams {
  ctx: number;
  runs: number;
  /** In ten-thousandths: a stated level, or a quoted actual level. */
  level: number;
  actual: boolean;
}

/**
 * The level is the chance of rejecting a true `H_0`, so across many tests of
 * a true claim it is the expected share of false alarms. Difficulty 2 uses a
 * binomial test's actual level instead of a stated one.
 */
const falseAlarms: Generator<AlarmParams> = {
  id: 'hyp-false-alarms',
  sample: (rng, difficulty) => {
    const actual = difficulty > 1;
    for (;;) {
      const runs = rng.pick([50, 100, 200, 250, 400, 500, 1000]);
      const level = actual ? rng.int(40, 990) : rng.pick([1, 5, 10]) * 100;
      if (!terminates((runs * level) / 10000, 2)) continue;
      return { ctx: pickCtx(rng), runs, level, actual };
    }
  },
  render: ({ ctx, runs, level, actual }): Slide => {
    const c = CONTEXTS[ctx];
    return {
      kind: 'expression',
      prompt: [
        say(
          actual
            ? `A test of ${c.who.toLowerCase()}'s claim about ${c.unit} has actual significance level $${P4(level)}$.`
            : `${c.who} tests its claim about ${c.unit} at the ${fmt(level / 100)}% level.`,
        ),
        say(`Suppose the claim is true, and the test is run on ${runs} separate samples. How many of them would you expect to reject $H_0$ wrongly?`),
      ],
      lead: '\\text{expected} =',
      keypad: [],
      answer: fmt((runs * level) / 10000),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ runs, level, actual }) => [
    { text: `${actual ? 'The actual significance level' : 'The significance level'} is the probability of rejecting $H_0$ when it is true.` },
    { tex: `${runs} \\times ${actual ? P4(level) : fmt(level / 10000)} = ${fmt((runs * level) / 10000)}` },
  ],
};

interface GrowParams {
  ctx: number;
  sigma: number;
  from: number;
  to: number;
  /** The gap xbar - mu, the same in both samples. */
  d: number;
}

/** The same sample mean from a sample of a different size: z moves with the square root of n. */
const nChoice: Generator<GrowParams> = {
  id: 'hyp-n-choice',
  sample: (rng) => {
    for (;;) {
      const [from, to] = rng.pick(PAIRS);
      const sigma = rng.int(2, 60);
      if (sigma % Math.sqrt(from) !== 0 || sigma % Math.sqrt(to) !== 0) continue;
      const d = rng.int(1, 40) / 10;
      const z1 = d / (sigma / Math.sqrt(from));
      const z2 = d / (sigma / Math.sqrt(to));
      if (!terminates(z1, 2) || !terminates(z2, 2) || z1 < 0.2 || z2 < 0.2 || z1 > 6 || z2 > 6) continue;
      return { ctx: rng.int(0, MEAN_CONTEXTS.length - 1), sigma, from, to, d };
    }
  },
  render: ({ ctx, sigma, from, to, d }): Slide => {
    const c = MEAN_CONTEXTS[ctx];
    const z1 = d / (sigma / Math.sqrt(from));
    const z2 = d / (sigma / Math.sqrt(to));
    const ratio = to / from;
    const wrong = [z1 * ratio, z1, z1 / ratio, z2 * 2].filter((v) => terminates(v, 3));
    return choiceSlide(
      [
        say(`The ${c.quantity} has standard deviation $${sigma}$ ${c.unit}. A sample of $${from}$ has a mean $${fmt(d)}$ ${c.unit} above the claimed mean, giving $z = ${fmt(z1)}$.`),
        say(`A sample of $${to}$ has the same mean. What is its $z$?`),
      ],
      options({ tex: fmt(z2), answer: fmt(z2) }, ...wrong.map((v) => ({ tex: fmt(v), answer: fmt(v) }))).slice(0, 4),
    );
  },
  solution: ({ sigma, from, to, d }) => [
    { tex: `\\frac{\\sigma}{\\sqrt{n}} = \\frac{${sigma}}{\\sqrt{${to}}} = ${fmt(sigma / Math.sqrt(to))}` },
    { tex: `z = \\frac{${fmt(d)}}{${fmt(sigma / Math.sqrt(to))}} = ${fmt(d / (sigma / Math.sqrt(to)))}` },
    {
      text: `The same gap from a sample $${fmt(to / from)}$ times ${to > from ? 'larger' : 'smaller'} gives a $z$ $\\sqrt{${fmt(to / from)}}$ times as big: ${to > from ? 'a larger sample makes the same difference more convincing' : 'a smaller sample makes it less convincing'}.`,
    },
  ],
};

/**
 * Whether a result is significant at 5%, and then at 1%: a stricter level is
 * harder to meet, so failing at 5% settles both.
 */
const levelsFlow: Generator<DecideParams> = {
  id: 'hyp-levels-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const sc = sampleMean(rng, { tails: ['up', 'down', 'two'], zLo: 40, zHi: 320 });
      const loose = critical(5, sc.tail);
      const strict = critical(1, sc.tail);
      const z = Math.abs(zOf(sc));
      if (Math.abs(z - loose) < 0.05 || Math.abs(z - strict) < 0.05) continue;
      // Spread the three outcomes evenly.
      const band = z < loose ? 0 : z < strict ? 1 : 2;
      if (band !== rng.int(0, 2)) continue;
      return { ...sc, level: 5, hard: difficulty > 1 };
    }
  },
  render: (sc): Slide => {
    const key = `${sc.ctx}|${sc.mu}|${sc.zh}|${sc.tail}`;
    const words = meanWords(sc);
    const loose = fmt(critical(5, sc.tail));
    const strict = fmt(critical(1, sc.tail));
    const measure = sc.tail === 'two' ? '|z|' : sc.tail === 'down' ? '-z' : 'z';
    const zText = fmt(zOf(sc));
    return {
      kind: 'flow',
      prompt: [
        say(`${meanClaim(sc)} ${meanSuspicion(sc)} ${meanSample(sc)}`),
        say(sc.hard ? 'Work out $z$, then decide at which levels the test rejects $H_0$.' : `The test statistic is $z = ${zText}$. Decide at which levels the test rejects $H_0$.`),
      ],
      subject: `H_1: \\mu ${OP[sc.tail]} ${sc.mu}`,
      steps: [
        {
          id: 'five',
          ask: `At 5%: is $${measure}$ more than $${loose}$?`,
          branches: spun(
            [
              { label: 'Yes', to: 'one' },
              { label: 'No', outcome: `Not significant at 5%, so not at 1% either: there is not enough evidence at either level that ${words}.` },
            ],
            key,
          ),
        },
        {
          id: 'one',
          ask: `At 1%: is $${measure}$ more than $${strict}$?`,
          branches: spun(
            [
              { label: 'Yes', outcome: `Significant at both: there is evidence even at the 1% level that ${words}.` },
              { label: 'No', outcome: `There is evidence at the 5% level that ${words}, but not at the 1% level.` },
            ],
            `${key}|1`,
          ),
        },
      ],
      answer: (() => {
        const z = Math.abs(zOf(sc));
        if (z < critical(5, sc.tail)) return ['No'];
        return ['Yes', z > critical(1, sc.tail) ? 'Yes' : 'No'];
      })(),
    };
  },
  solution: (sc) => [
    { tex: zFormula(sc) },
    { text: `At 5% the critical region is $${zRegionTex(5, sc.tail)}$; at 1% it is $${zRegionTex(1, sc.tail)}$.` },
    { text: 'The 1% region sits inside the 5% one, so anything significant at 1% is significant at 5%, and anything not significant at 5% is not significant at 1%.' },
  ],
};

interface NTableParams {
  ctx: number;
  sigma: number;
  ns: number[];
  d: number;
  /** Difficulty 1 gives the standard errors. */
  given: boolean;
}

/** Sigmas that make the standard error whole for at least three of the sample sizes. */
const TABLE_SIGMAS = [12, 20, 24, 30, 36, 40, 60];

/**
 * The same gap `\bar{x} - \mu` from samples of three sizes: the standard
 * error shrinks with `\sqrt{n}` and z grows, which is how a bigger sample
 * turns the same difference into a significant one.
 */
const nTable: Generator<NTableParams> = {
  id: 'hyp-n-table',
  sample: (rng, difficulty) => {
    for (;;) {
      const sigma = rng.pick(TABLE_SIGMAS);
      const fits = NS.filter((n) => sigma % Math.sqrt(n) === 0);
      if (fits.length < 3) continue;
      const ns = rng.sample(fits, 3).sort((a, b) => a - b);
      const d = rng.int(1, 60) / 10;
      const zs = ns.map((n) => d / (sigma / Math.sqrt(n)));
      if (!zs.every((z) => terminates(z, 2)) || zs[0] < 0.1 || zs[2] > 8) continue;
      return { ctx: rng.int(0, MEAN_CONTEXTS.length - 1), sigma, ns, d, given: difficulty < 2 };
    }
  },
  render: ({ ctx, sigma, ns, d, given }): Slide => {
    const c = MEAN_CONTEXTS[ctx];
    const se = (n: number) => sigma / Math.sqrt(n);
    const answer = ns.flatMap((n) => (given ? [fmt(d / se(n))] : [fmt(se(n)), fmt(d / se(n))]));
    const unused = NS.filter((n) => !ns.includes(n));
    const slips = [
      ...unused.map((n) => fmt(d / se(n))),
      ...unused.map((n) => fmt(se(n))),
      ...ns.map((n) => fmt(d / (sigma / n))),
      ...ns.map((n) => fmt(d * se(n))),
    ].filter((t) => t.length <= 6);
    return {
      kind: 'table',
      prompt: [
        say(`The ${c.quantity} has standard deviation $${sigma}$ ${c.unit}. Three samples of different sizes each have a mean $${fmt(d)}$ ${c.unit} above the claimed mean.`),
        say(given ? 'Fill in $z$ for each sample.' : 'Fill in the standard deviation of $\\bar{X}$ and then $z$ for each sample.'),
      ],
      columns: ['n', '\\sigma / \\sqrt{n}', 'z'],
      rows: ns.map((n) => (given ? [`${n}`, fmt(se(n)), null] : [`${n}`, null, null])),
      bank: decimalBank(answer, slips, 3),
      answer,
    };
  },
  solution: ({ sigma, ns, d }) => [
    ...ns.map((n) => ({
      tex: aligned([
        `n &= ${n}`,
        `\\frac{\\sigma}{\\sqrt{n}} &= \\frac{${sigma}}{${Math.sqrt(n)}} = ${fmt(sigma / Math.sqrt(n))}`,
        `z &= \\frac{${fmt(d)}}{${fmt(sigma / Math.sqrt(n))}} = ${fmt(d / (sigma / Math.sqrt(n)))}`,
      ]),
    })),
    { text: 'The same difference counts for more in a bigger sample, since its mean varies less.' },
  ],
};

/* ================================================================
 * Level 3: Type I and Type II errors
 * ================================================================ */

/** A probability under a stated p, as options and flows write it. */
const under = (event: string, p: number): string => `P(${event} \\mid p = ${fmt(p)})`;

/**
 * The cumulatives quoted at one value of p, under a line naming it. Level 3
 * quotes at the claim and at the truth side by side, so every table says
 * which p it belongs to, and `hypothesisTesting.test.ts` reads each pair back.
 */
const quotesAt = (n: number, p: number, ks: number[]): Block[] => [say(`If $p = ${fmt(p)}$:`), quotes(n, p, ks)];

/** The counts among `ks` whose cumulative can be quoted, sorted and without repeats. */
const quotableOnly = (n: number, p: number, ks: number[]): number[] =>
  [...new Set(ks)].filter((k) => quotable(n, p, k)).sort((x, y) => x - y);

interface ErrorScene {
  ctx: number;
  n: number;
  /** The claim, `H_0: p = p_0`. */
  p0: number;
  /** What p really is, on `H_1`'s side of the claim. */
  p1: number;
  tail: OneTail;
  level: number;
  /** The critical region is `X >= c` for the upper tail, `X <= c` for the lower. */
  c: number;
}

/** The counts that do not reject: everything outside the critical region. */
const outsideTex = ({ tail, c }: Pick<ErrorScene, 'tail' | 'c'>): string => (tail === 'up' ? `X \\le ${c - 1}` : `X \\ge ${c + 1}`);

/** The count whose cumulative both errors are read from: `X <= c - 1` below an upper region, `X <= c` for a lower one. */
const edgeOf = ({ tail, c }: Pick<ErrorScene, 'tail' | 'c'>): number => (tail === 'up' ? c - 1 : c);

/** P(Type I) in ten-thousandths: the probability of the region when `H_0` is true. */
const alphaOf = ({ n, p0, tail, c }: Pick<ErrorScene, 'n' | 'p0' | 'tail' | 'c'>): number =>
  tail === 'up' ? upper(n, p0, c) : q(n, p0, c);

/** P(Type II) in ten-thousandths: the probability of landing outside the region when p is really `p`. */
const betaOf = ({ n, tail, c }: Pick<ErrorScene, 'n' | 'tail' | 'c'>, p: number): number =>
  tail === 'up' ? q(n, p, c - 1) : 10000 - q(n, p, c);

/** The values of p on `H_1`'s side of the claim. */
const toward = (p0: number, tail: OneTail): number[] => PS.filter((p) => (tail === 'up' ? p > p0 + 1e-9 : p < p0 - 1e-9));

interface SceneOptions {
  nMin: number;
  nMax: number;
  levels?: number[];
  tails?: OneTail[];
}

/**
 * A one-tailed test with its critical region, and a true p on `H_1`'s side
 * at which P(Type II) can be quoted. Both errors are then strictly between
 * 0.0000 and 1.0000 as quoted, so neither is a sure thing.
 */
function sampleScene(rng: Rng, { nMin, nMax, levels = [1, 5, 10], tails = ONE_TAILS }: SceneOptions): ErrorScene {
  for (;;) {
    const n = rng.int(nMin, nMax);
    const p0 = rng.pick(PS);
    const tail = rng.pick(tails);
    const level = rng.pick(levels);
    const c = oneTailRegion(n, p0, tail, level);
    if (c === undefined) continue;
    const side = toward(p0, tail);
    if (side.length === 0) continue;
    const p1 = rng.pick(side);
    if (!quotable(n, p1, edgeOf({ tail, c }))) continue;
    return { ctx: pickCtx(rng), n, p0, p1, tail, level, c };
  }
}

const sceneText = ({ ctx, n, p0, tail, level }: ErrorScene): string =>
  `${claimText(CONTEXTS[ctx], p0)} ${suspicionText(CONTEXTS[ctx], p0, tail)} The test uses a sample of ${n} at the ${level}% level.`;

const truthText = (ctx: number, p: number): string => `In fact, ${pct(p)}% of ${CONTEXTS[ctx].unit} ${CONTEXTS[ctx].event}.`;

const regionSentence = ({ tail, c }: Pick<ErrorScene, 'tail' | 'c'>): string => `The critical region is $${regionTex(tail, c)}$.`;

/** How the region was found from the quoted cumulatives at `p_0`. */
const sceneRegionSolution = (sc: ErrorScene): SolutionStep[] =>
  regionSolution({ ctx: sc.ctx, n: sc.n, p: sc.p0, tail: sc.tail, level: sc.level, c: sc.c });

/** The quoted cumulatives at `p_0` that the region is found from. */
const sceneRegionQuotes = (sc: ErrorScene): number[] => regionQuotes({ n: sc.n, p: sc.p0, tail: sc.tail, c: sc.c });

/** P(Type II) worked from the cumulative at `p`, as a solution line. */
function betaLine(sc: ErrorScene, p: number): string {
  const k = edgeOf(sc);
  return sc.tail === 'up'
    ? aligned([`& P(${outsideTex(sc)})`, `&= ${P4(q(sc.n, p, k))}`])
    : chain(`P(${outsideTex(sc)})`, `1 - ${le(k)}`, `1 - ${P4(q(sc.n, p, k))}`, P4(betaOf(sc, p)));
}

/* ---------- Level 3, lesson 1: the two mistakes ---------- */

type ErrorKind = 'one' | 'two' | 'none';

const ERROR_LABEL: Record<ErrorKind, string> = {
  one: 'A Type I error',
  two: 'A Type II error',
  none: 'No error: the test got it right',
};

/** Which mistake, if any: a Type I error rejects a true `H_0`, a Type II error keeps a false one. */
const errorKind = (truth: boolean, reject: boolean): ErrorKind => (truth ? (reject ? 'one' : 'none') : reject ? 'none' : 'two');

interface OutcomeParams {
  ctx: number;
  p0: number;
  /** The true proportion when `H_0` is false. */
  p1: number;
  tail: OneTail;
  level: number;
  /** Whether `H_0` is true. */
  truth: boolean;
  reject: boolean;
  /** Difficulty 2 gives the outcome in the scenario's words, not as "rejects $H_0$". */
  words: boolean;
}

function sampleOutcome(rng: Rng, difficulty: number): OutcomeParams {
  for (;;) {
    const p0 = rng.pick(PS);
    const tail = rng.pick(ONE_TAILS);
    const side = toward(p0, tail);
    if (side.length === 0) continue;
    return {
      ctx: pickCtx(rng),
      p0,
      p1: rng.pick(side),
      tail,
      level: rng.pick([1, 5, 10]),
      truth: rng.chance(0.5),
      reject: rng.chance(0.5),
      words: difficulty > 1,
    };
  }
}

function outcomeText({ ctx, p0, tail, level, reject, words }: OutcomeParams): string {
  if (!words) return `The test, at the ${level}% level, ${reject ? 'rejects' : 'does not reject'} $H_0$.`;
  const claim = claimWords(CONTEXTS[ctx], p0, tail);
  return reject
    ? `The test finds evidence at the ${level}% level that ${claim}.`
    : `The test finds not enough evidence at the ${level}% level that ${claim}.`;
}

const factText = ({ ctx, p0, p1, truth }: OutcomeParams): string =>
  truth ? `In fact, exactly ${pct(p0)}% of ${CONTEXTS[ctx].unit} ${CONTEXTS[ctx].event}, as claimed.` : truthText(ctx, p1);

function outcomeSolution(params: OutcomeParams): SolutionStep[] {
  const { p0, p1, truth, reject, level } = params;
  const kind = errorKind(truth, reject);
  return [
    { text: truth ? `$H_0: p = ${fmt(p0)}$ is true.` : `$H_0: p = ${fmt(p0)}$ is false: $p$ is really $${fmt(p1)}$.` },
    { text: `The test ${reject ? 'rejected' : 'did not reject'} $H_0$.` },
    {
      text:
        kind === 'one'
          ? `Rejecting a true $H_0$ is a Type I error. At the ${level}% level it happens with probability at most $${asProb(level)}$.`
          : kind === 'two'
            ? 'Keeping a false $H_0$ is a Type II error: the test missed a real change.'
            : `${truth ? 'Keeping a true' : 'Rejecting a false'} $H_0$ is the right call, so there is no error.`,
    },
  ];
}

/** Name the mistake a described outcome makes, from the truth and the decision. */
const errorChoice: Generator<OutcomeParams> = {
  id: 'hyp-error-choice',
  sample: sampleOutcome,
  render: (params): Slide => {
    const { ctx, p0, tail, truth, reject } = params;
    const c = CONTEXTS[ctx];
    const kind = errorKind(truth, reject);
    const others = (['one', 'two', 'none'] as ErrorKind[]).filter((k) => k !== kind);
    return keyedChoice(
      [
        say(`${claimText(c, p0)} ${suspicionText(c, p0, tail)}`),
        say(`${outcomeText(params)} ${factText(params)}`),
        say('What has happened?'),
      ],
      options({ tex: ERROR_LABEL[kind] }, ...others.map((k) => ({ tex: ERROR_LABEL[k] }))),
      `${ctx}|${fmt(p0)}|${fmt(params.p1)}|${tail}|${params.level}`,
      false,
    );
  },
  solution: outcomeSolution,
};

interface ErrorFlowParams extends OutcomeParams {
  /** Difficulty 2 quotes a p-value in ten-thousandths, and the decision is the learner's. */
  pv: number;
}

/**
 * Two forks to name the outcome: is `H_0` true, and was it rejected. Each of
 * the four ends says what happened. Difficulty 2 gives a p-value instead of
 * the decision.
 */
const errorFlow: Generator<ErrorFlowParams> = {
  id: 'hyp-error-flow',
  sample: (rng, difficulty) => {
    const base = sampleOutcome(rng, 1);
    const cap = base.level * 100;
    const pv = base.reject ? rng.int(5, cap - 5) : rng.int(cap + 5, 4000);
    return { ...base, words: false, pv: difficulty > 1 ? pv : 0 };
  },
  render: (params): Slide => {
    const { ctx, p0, tail, level, truth, reject, pv } = params;
    const c = CONTEXTS[ctx];
    const key = `${ctx}|${fmt(p0)}|${tail}|${level}|${pv}`;
    const decided = pv > 0;
    const second = decided ? `Is $${P4(pv)}$ below $${asProb(level)}$?` : 'Was $H_0$ rejected?';
    return {
      kind: 'flow',
      prompt: [
        say(`${claimText(c, p0)} ${suspicionText(c, p0, tail)}`),
        say(
          `${decided ? `The test is at the ${level}% level, and its p-value is $${P4(pv)}$.` : outcomeText(params)} ${factText(params)}`,
        ),
        say('Work through the questions to name what happened.'),
      ],
      subject: `H_0: p = ${fmt(p0)}, \\quad H_1: p ${OP[tail]} ${fmt(p0)}`,
      steps: [
        {
          id: 'truth',
          ask: 'Is $H_0$ true?',
          branches: spun(
            [
              { label: 'Yes', to: 'held' },
              { label: 'No', to: 'false' },
            ],
            key,
          ),
        },
        {
          id: 'held',
          ask: second,
          branches: spun(
            [
              { label: 'Yes', outcome: `A Type I error: a true $H_0$ was rejected. At the ${level}% level that happens with probability at most $${asProb(level)}$.` },
              { label: 'No', outcome: 'No error: a true $H_0$ was kept.' },
            ],
            `${key}|t`,
          ),
        },
        {
          id: 'false',
          ask: second,
          branches: spun(
            [
              { label: 'Yes', outcome: 'No error: a false $H_0$ was rejected.' },
              { label: 'No', outcome: 'A Type II error: a false $H_0$ was kept, and the change was missed.' },
            ],
            `${key}|f`,
          ),
        },
      ],
      answer: [truth ? 'Yes' : 'No', reject ? 'Yes' : 'No'],
    };
  },
  solution: (params) => [
    ...(params.pv > 0
      ? [{ tex: `${P4(params.pv)} ${params.reject ? '<' : '>'} ${asProb(params.level)}` }]
      : []),
    ...outcomeSolution(params),
  ],
};

interface ErrorTilesParams extends ErrorScene {
  which: 'I' | 'II';
}

/**
 * Each error as an event and a truth: a Type I error is landing in the region
 * when `p = p_0`, a Type II error landing outside it when p is on `H_1`'s side.
 */
const errorTiles: Generator<ErrorTilesParams> = {
  id: 'hyp-error-tiles',
  sample: (rng, difficulty) => ({
    ...sampleScene(rng, { nMin: 10, nMax: 30, tails: difficulty > 1 ? ONE_TAILS : ['up'] }),
    which: rng.pick<ErrorTilesParams['which']>(['I', 'II']),
  }),
  render: (sc): Slide => {
    const { ctx, n, p0, tail, level, c, which } = sc;
    const ctxt = CONTEXTS[ctx];
    const P0 = fmt(p0);
    const up = tail === 'up';
    const answer =
      which === 'I'
        ? [up ? '\\ge' : '\\le', `${c}`, '=', P0]
        : [up ? '\\le' : '\\ge', `${up ? c - 1 : c + 1}`, OP[tail], P0];
    return {
      kind: 'tiles',
      prompt: [
        say(`${claimText(ctxt, p0)} ${suspicionText(ctxt, p0, tail)}`),
        say(`At the ${level}% level, with a sample of ${n}, the critical region is $${regionTex(tail, c)}$.`),
        say(`Complete the description of a Type ${which} error: which counts cause it, and what $p$ is when it happens.`),
      ],
      template: `\\text{Type ${which}: } X {0} {1} \\text{ when } p {2} {3}`,
      bank: tokenBank(answer, ['\\le', '\\ge', `${c - 1}`, `${c}`, `${c + 1}`, '=', OP[tail], OP[up ? 'down' : 'up'], fmt(1 - p0)], 5),
      answer,
    };
  },
  solution: (sc) => {
    const P0 = fmt(sc.p0);
    return sc.which === 'I'
      ? [
          { text: `A Type I error rejects $H_0$ when it is true: $X$ lands in the critical region while $p = ${P0}$.` },
          { tex: aligned([`&\\text{Type I: } ${regionTex(sc.tail, sc.c)}`, `&\\text{when } p = ${P0}`]) },
        ]
      : [
          { text: `A Type II error keeps $H_0$ when it is false: $X$ lands outside the critical region while $p ${OP[sc.tail]} ${P0}$.` },
          { tex: aligned([`&\\text{Type II: } ${outsideTex(sc)}`, `&\\text{when } p ${OP[sc.tail]} ${P0}`]) },
        ];
  },
};

interface ErrorLineParams extends ErrorScene {
  which: 'I' | 'II';
  /** Difficulty 2 quotes cumulatives instead of naming the region. */
  found: boolean;
}

/**
 * Shade the counts that would make a given error: the critical region for a
 * Type I error, everything outside it for a Type II error. Small n, so every
 * count has a tick and each set is a ray, as the course draws regions.
 */
const errorLine: Generator<ErrorLineParams> = {
  id: 'hyp-error-line',
  sample: (rng, difficulty) => {
    for (;;) {
      const sc = sampleScene(rng, { nMin: 5, nMax: 10, levels: [5, 10] });
      // The counts outside the region reach at least one tick.
      if (sc.tail === 'up' ? sc.c < 1 : sc.c > sc.n - 1) continue;
      const found = difficulty > 1;
      return { ...sc, which: found ? 'II' : rng.pick<ErrorLineParams['which']>(['I', 'II']), found };
    }
  },
  render: (sc): Slide => {
    const { n, p0, p1, tail, c, which, found, ctx } = sc;
    const answer =
      which === 'I'
        ? tail === 'up'
          ? `[${c},inf)`
          : `(-inf,${c}]`
        : tail === 'up'
          ? `(-inf,${c - 1}]`
          : `[${c + 1},inf)`;
    return {
      kind: 'numberLine',
      prompt: [
        say(sceneText(sc)),
        ...(found
          ? [say(`Under $H_0$, $${model(n, p0)}$.`), ...quotesAt(n, p0, sceneRegionQuotes(sc))]
          : [say(regionSentence(sc))]),
        say(
          which === 'I'
            ? 'Suppose $H_0$ is true. Shade the counts that would lead to a Type I error.'
            : `${truthText(ctx, p1)} Shade the counts that would lead to a Type II error.`,
        ),
      ],
      min: -1,
      max: n + 1,
      step: 1,
      answer,
    };
  },
  solution: (sc) => [
    ...(sc.found ? sceneRegionSolution(sc) : []),
    sc.which === 'I'
      ? { text: `A Type I error rejects a true $H_0$, which happens whenever $X$ lands in the critical region, $${regionTex(sc.tail, sc.c)}$.` }
      : {
          text: `$p$ is really $${fmt(sc.p1)}$, so $H_0$ is false. A Type II error is failing to reject it, which happens whenever $X$ lands outside the critical region: $${outsideTex(sc)}$.`,
        },
  ],
};

/* ---------- Level 3, lesson 2: the size of a test ---------- */

interface RuleParams {
  ctx: number;
  n: number;
  p0: number;
  tail: Tail;
  /** Lower region `X <= a`; -1 when there is none. */
  a: number;
  /** Upper region `X >= b`; n + 1 when there is none. */
  b: number;
}

/** P(Type I) of a rule, in ten-thousandths: both tails' probabilities under `H_0`. */
const sizeOf = ({ n, p0, tail, a, b }: RuleParams): number =>
  (tail === 'up' ? 0 : q(n, p0, a)) + (tail === 'down' ? 0 : upper(n, p0, b));

/**
 * A rejection rule someone fixed in advance, not found from a level: a count
 * at or beyond `b`, at or below `a`, or either. Its size is whatever the
 * region's probability comes to under `H_0`.
 */
function sampleRule(rng: Rng, tails: Tail[]): RuleParams {
  for (;;) {
    const n = rng.int(10, 25);
    const p0 = rng.pick(PS);
    const tail = rng.pick(tails);
    const mean = n * p0;
    let a = -1;
    let b = n + 1;
    if (tail !== 'up') {
      const hi = Math.ceil(mean) - 2;
      if (hi < 1) continue;
      a = rng.int(1, hi);
      if (!quotable(n, p0, a) || !quotable(n, p0, a + 1) || q(n, p0, a) < 5) continue;
    }
    if (tail !== 'down') {
      const lo = Math.floor(mean) + 2;
      if (lo > n - 1) continue;
      b = rng.int(lo, n - 1);
      if (!quotable(n, p0, b - 1) || !quotable(n, p0, b - 2) || upper(n, p0, b) < 5) continue;
    }
    const rule = { ctx: pickCtx(rng), n, p0, tail, a, b };
    if (sizeOf(rule) > 3000) continue;
    return rule;
  }
}

function ruleText({ ctx, n, tail, a, b }: RuleParams): string {
  const c = CONTEXTS[ctx];
  const when = tail === 'up' ? `${b} or more` : tail === 'down' ? `${a} or fewer` : `${a} or fewer, or ${b} or more`;
  return `A researcher samples ${n} ${c.unit} and decides in advance to reject the claim if ${when} of them ${c.event}.`;
}

const ruleQuotes = ({ n, p0, tail, a, b }: RuleParams): number[] =>
  quotableOnly(n, p0, [...(tail === 'up' ? [] : [a, a + 1]), ...(tail === 'down' ? [] : [b - 2, b - 1])]);

function ruleSolution(rule: RuleParams): SolutionStep[] {
  const { n, p0, tail, a, b } = rule;
  const steps: SolutionStep[] = [{ text: 'A Type I error is rejecting $H_0$ when it is true: landing in the region when $p$ is the claimed value.' }];
  if (tail !== 'up') steps.push({ tex: `${le(a)} = ${P4(q(n, p0, a))}` });
  if (tail !== 'down') steps.push({ tex: chain(`P(X \\ge ${b})`, `1 - ${P4(q(n, p0, b - 1))}`, P4(upper(n, p0, b))) });
  if (tail === 'two') {
    steps.push({ tex: chain('P(\\text{Type I})', `${P4(q(n, p0, a))} + ${P4(upper(n, p0, b))}`, P4(sizeOf(rule))) });
  }
  return steps;
}

/** The size of a stated rule: one tail at difficulty 1, both at difficulty 2. */
const sizeExpr: Generator<RuleParams> = {
  id: 'hyp-size',
  sample: (rng, difficulty) => sampleRule(rng, difficulty > 1 ? ['two'] : ONE_TAILS),
  render: (rule): Slide => {
    const c = CONTEXTS[rule.ctx];
    return {
      kind: 'expression',
      prompt: [
        say(`${claimText(c, rule.p0)} ${suspicionText(c, rule.p0, rule.tail)} ${ruleText(rule)}`),
        say(`Under $H_0$, $${model(rule.n, rule.p0)}$.`),
        ...quotesAt(rule.n, rule.p0, ruleQuotes(rule)),
        say('Find the probability of a Type I error.'),
      ],
      lead: 'P(\\text{Type I}) =',
      keypad: [],
      answer: typed(sizeOf(rule)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ruleSolution,
};

/**
 * The size of a two-tailed rule reduced one step at a time. Difficulty 1
 * starts from the quoted numbers; difficulty 2 starts from the cumulatives
 * by name, so each has to be read from the table first.
 */
const sizeSum: Generator<RuleParams & { named: boolean }> = {
  id: 'hyp-size-sum',
  sample: (rng, difficulty) => ({ ...sampleRule(rng, ['two']), named: difficulty > 1 }),
  render: (rule): Slide => {
    const { n, p0, a, b, named } = rule;
    const c = CONTEXTS[rule.ctx];
    const A = q(n, p0, a);
    const B = q(n, p0, b - 1);
    const U = 10000 - B;
    const size = A + U;
    const tail = [
      { span: [2, 7] as [number, number], operator: 4, value: P4(U), bank: stepBank(P4(U), P4(B), P4(10000 - q(n, p0, b)), P4(10000 - q(n, p0, b - 2))) },
      {
        span: [0, 3] as [number, number],
        operator: 1,
        value: P4(size),
        bank: stepBank(P4(size), P4(Math.abs(U - A)), ...(A + B < 10000 ? [P4(A + B)] : []), P4(10000 - size)),
      },
    ];
    const reads = [
      { span: [0, 1] as [number, number], value: P4(A), bank: stepBank(P4(A), P4(q(n, p0, a + 1)), P4(q(n, p0, b - 2)), P4(B)) },
      { span: [5, 6] as [number, number], value: P4(B), bank: stepBank(P4(B), P4(q(n, p0, b - 2)), P4(A), P4(q(n, p0, a + 1))) },
    ];
    return {
      kind: 'steps',
      prompt: [
        say(`${claimText(c, p0)} ${suspicionText(c, p0, 'two')} ${ruleText(rule)}`),
        say(`Under $H_0$, $${model(n, p0)}$.`),
        ...quotesAt(n, p0, ruleQuotes(rule)),
        say(`Work out the probability of a Type I error, one step at a time.${named ? ' Read each cumulative from the table first.' : ''}`),
      ],
      start: named
        ? [le(a), '+', '(', '1', '-', le(b - 1), ')']
        : [P4(A), '+', '(', '1', '-', P4(B), ')'],
      reductions: named ? [...reads, ...tail] : tail,
    };
  },
  solution: (rule) => ruleSolution(rule),
};

interface SizeChoiceParams extends ErrorScene {
  hard: boolean;
}

/** Which probability is P(Type I): the region's, and at the claimed p. */
const sizeChoice: Generator<SizeChoiceParams> = {
  id: 'hyp-size-choice',
  sample: (rng, difficulty) => ({ ...sampleScene(rng, { nMin: 10, nMax: 30 }), hard: difficulty > 1 }),
  render: (sc): Slide => {
    const { p0, tail, c, level, hard } = sc;
    const region = regionTex(tail, c);
    const up = tail === 'up';
    const slips = hard
      ? [under(outsideTex(sc), p0), asProb(level), under(up ? `X > ${c}` : `X < ${c}`, p0)]
      : [under(outsideTex(sc), p0), under(`X = ${c}`, p0), under(up ? `X \\ge ${c - 1}` : `X \\le ${c + 1}`, p0)];
    return choiceSlide(
      [say(sceneText(sc)), say(`${regionSentence(sc)} Which is the probability of a Type I error?`)],
      options({ tex: under(region, p0) }, ...slips.map((tex) => ({ tex }))),
    );
  },
  solution: (sc) => [
    { text: `A Type I error rejects $H_0$ when it is true, so it is the region's probability when $p = ${fmt(sc.p0)}$:` },
    { tex: under(regionTex(sc.tail, sc.c), sc.p0) },
    {
      text: `That is the actual significance level. It is at most $${asProb(sc.level)}$ but not equal to it, since a count cannot land on a fraction of a region.`,
    },
  ],
};

interface SizeTableParams {
  ctx: number;
  n: number;
  p0: number;
  tail: OneTail;
  levels: number[];
  cs: number[];
  /** Difficulty 1 gives each critical value. */
  given: boolean;
}

/**
 * One test at three levels: the critical value and the size at each. A
 * stricter level pushes the region out, and the chance of a Type I error
 * falls with it.
 */
const sizeTable: Generator<SizeTableParams> = {
  id: 'hyp-size-table',
  sample: (rng, difficulty) => {
    const levels = [10, 5, 1];
    for (;;) {
      const n = rng.int(10, 30);
      const p0 = rng.pick(PS);
      const tail = rng.pick(ONE_TAILS);
      const found = levels.map((level) => oneTailRegion(n, p0, tail, level));
      if (found.some((c) => c === undefined)) continue;
      const cs = found as number[];
      if (new Set(cs).size < cs.length) continue;
      const span = tail === 'up' ? [Math.min(...cs) - 2, Math.max(...cs) - 1] : [Math.min(...cs), Math.max(...cs) + 1];
      if (!quotableRange(n, p0, span[0], span[1])) continue;
      return { ctx: pickCtx(rng), n, p0, tail, levels, cs, given: difficulty < 2 };
    }
  },
  render: ({ ctx, n, p0, tail, levels, cs, given }): Slide => {
    const c = CONTEXTS[ctx];
    const up = tail === 'up';
    const ks = up ? quotableOnly(n, p0, cs.flatMap((x) => [x - 2, x - 1])) : quotableOnly(n, p0, cs.flatMap((x) => [x, x + 1]));
    const alphas = cs.map((x) => alphaOf({ n, p0, tail, c: x }));
    const answer = cs.flatMap((x, i) => (given ? [P4(alphas[i])] : [`${x}`, P4(alphas[i])]));
    const slips = [
      ...alphas.map((v) => P4(10000 - v)),
      ...cs.map((x) => P4(alphaOf({ n, p0, tail, c: up ? x - 1 : x + 1 }))),
      ...(given ? [] : cs.flatMap((x) => [`${x - 1}`, `${x + 1}`])),
    ];
    return {
      kind: 'table',
      prompt: [
        say(`${claimText(c, p0)} ${suspicionText(c, p0, tail)} The test uses a sample of ${n}, with critical region $X ${up ? '\\ge' : '\\le'} c$.`),
        say(`Under $H_0$, $${model(n, p0)}$.`),
        ...quotesAt(n, p0, ks),
        say(given ? 'Fill in the probability of a Type I error at each level.' : 'Fill in the critical value $c$ and the probability of a Type I error at each level.'),
      ],
      columns: ['\\text{level}', 'c', 'P(\\text{Type I})'],
      rows: levels.map((level, i) => [`${level}\\%`, given ? `${cs[i]}` : null, null]),
      bank: decimalBank(answer, slips, given ? 3 : 4),
      answer,
    };
  },
  solution: ({ n, p0, tail, levels, cs }) => [
    { text: 'P(Type I) is the probability of the critical region when $H_0$ is true.' },
    ...cs.map((x, i) => ({
      tex:
        tail === 'up'
          ? aligned([`\\text{${levels[i]}\\%: } & P(X \\ge ${x})`, `&= 1 - ${P4(q(n, p0, x - 1))}`, `&= ${P4(upper(n, p0, x))}`])
          : aligned([`\\text{${levels[i]}\\%: } & P(X \\le ${x})`, `&= ${P4(q(n, p0, x))}`]),
    })),
    { text: 'The stricter the level, the smaller the region, and the less likely a Type I error.' },
  ],
};

/* ---------- Level 3, lesson 3: Type II for a stated alternative ---------- */

/** The cumulatives at the true p around the edge of the region. */
const edgeQuotes = (sc: ErrorScene, p: number): number[] => {
  const k = edgeOf(sc);
  return quotableOnly(sc.n, p, [k - 1, k, k + 1]);
};

interface BetaParams extends ErrorScene {
  /** Difficulty 2 leaves the region to be found from the cumulatives at `p_0`. */
  found: boolean;
}

function sampleBeta(rng: Rng, difficulty: number): BetaParams {
  for (;;) {
    const sc = sampleScene(rng, { nMin: 10, nMax: 25, tails: difficulty > 1 ? ONE_TAILS : ['up'] });
    if (edgeQuotes(sc, sc.p1).length < 2) continue;
    return { ...sc, found: difficulty > 1 };
  }
}

/** The prompt for a Type II question: the test, its region named or quoted, and the truth with its cumulatives. */
function betaPrompt(sc: BetaParams): Block[] {
  return [
    say(sceneText(sc)),
    ...(sc.found
      ? [say(`Under $H_0$, $${model(sc.n, sc.p0)}$.`), ...quotesAt(sc.n, sc.p0, sceneRegionQuotes(sc))]
      : [say(regionSentence(sc))]),
    say(truthText(sc.ctx, sc.p1)),
    ...quotesAt(sc.n, sc.p1, edgeQuotes(sc, sc.p1)),
  ];
}

function betaSolution(sc: BetaParams): SolutionStep[] {
  return [
    ...(sc.found ? sceneRegionSolution(sc) : []),
    { text: `A Type II error keeps $H_0$ though $p$ is really $${fmt(sc.p1)}$: $X$ lands outside the region, $${outsideTex(sc)}$, with $p = ${fmt(sc.p1)}$.` },
    { tex: betaLine(sc, sc.p1) },
  ];
}

/** P(Type II) typed, from the cumulatives quoted at the true p. */
const betaExpr: Generator<BetaParams> = {
  id: 'hyp-beta',
  sample: sampleBeta,
  render: (sc): Slide => ({
    kind: 'expression',
    prompt: [...betaPrompt(sc), say('Find the probability of a Type II error.')],
    lead: 'P(\\text{Type II}) =',
    keypad: [],
    answer: typed(betaOf(sc, sc.p1)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: betaSolution,
};

interface BetaChoiceParams extends ErrorScene {
  /** Difficulty 2 offers the four numbers rather than the four events. */
  numbers: boolean;
}

/**
 * Which probability is P(Type II): outside the region rather than in it, and
 * at the true p rather than the claimed one. The four options are the four
 * cells of the table of errors.
 */
const betaChoice: Generator<BetaChoiceParams> = {
  id: 'hyp-beta-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const sc = sampleScene(rng, { nMin: 10, nMax: 30 });
      const values = [betaOf(sc, sc.p1), 10000 - betaOf(sc, sc.p1), alphaOf(sc), 10000 - alphaOf(sc)];
      if (new Set(values).size < 4) continue;
      return { ...sc, numbers: difficulty > 1 };
    }
  },
  render: (sc): Slide => {
    const { n, p0, p1, tail, c, numbers } = sc;
    const k = edgeOf(sc);
    const region = regionTex(tail, c);
    const outside = outsideTex(sc);
    const beta = betaOf(sc, p1);
    const alpha = alphaOf(sc);
    const opts = numbers
      ? options({ tex: P4(beta) }, { tex: P4(10000 - beta) }, { tex: P4(alpha) }, { tex: P4(10000 - alpha) })
      : options({ tex: under(outside, p1) }, { tex: under(region, p1) }, { tex: under(outside, p0) }, { tex: under(region, p0) });
    return choiceSlide(
      [
        say(sceneText(sc)),
        say(`${regionSentence(sc)} ${truthText(sc.ctx, p1)}`),
        ...(numbers ? [...quotesAt(n, p0, [k]), ...quotesAt(n, p1, [k])] : []),
        say('Which is the probability of a Type II error?'),
      ],
      opts,
    );
  },
  solution: (sc) => [
    { text: `A Type II error keeps a false $H_0$: $X$ lands outside the region while $p$ is really $${fmt(sc.p1)}$.` },
    { tex: under(outsideTex(sc), sc.p1) },
    ...(sc.numbers ? [{ tex: betaLine(sc, sc.p1) }] : []),
    { text: `Landing in the region when $p = ${fmt(sc.p1)}$ is the power; the two probabilities at $p = ${fmt(sc.p0)}$ belong to $H_0$ being true.` },
  ],
};

/**
 * P(Type II) one decision at a time: the event is landing outside the region,
 * outside is the next count in, and its probability comes from the table at
 * the true p. Each wrong turn ends saying why.
 */
const betaFlow: Generator<ErrorScene> = {
  id: 'hyp-beta-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const sc = sampleScene(rng, { nMin: 10, nMax: 25, tails: difficulty > 1 ? ONE_TAILS : ['up'] });
      const k = edgeOf(sc);
      if (!quotableRange(sc.n, sc.p1, k - 1, k + 1) || k - 1 < 0) continue;
      if (sc.tail === 'up' ? sc.c < 2 : sc.c + 2 > sc.n) continue;
      const { right, power, slip } = betaFlowValues(sc);
      if (new Set([right, power, slip]).size < 3) continue;
      return sc;
    }
  },
  render: (sc): Slide => {
    const { n, p1, tail, c } = sc;
    const up = tail === 'up';
    const key = `${sc.ctx}|${n}|${fmt(sc.p0)}|${fmt(p1)}|${c}|${tail}`;
    const { right, power, slip } = betaFlowValues(sc);
    const outside = outsideTex(sc);
    return {
      kind: 'flow',
      prompt: [
        say(sceneText(sc)),
        say(`${regionSentence(sc)} ${truthText(sc.ctx, p1)}`),
        ...quotesAt(n, p1, [edgeOf(sc) - 1, edgeOf(sc), edgeOf(sc) + 1]),
        say('Work through the questions to the probability of a Type II error.'),
      ],
      subject: `${regionTex(tail, c)}, \\quad p = ${fmt(p1)}`,
      steps: [
        {
          id: 'event',
          ask: 'A Type II error happens when $X$ lands where?',
          branches: spun(
            [
              { label: 'In the critical region', outcome: 'No: landing in the region rejects $H_0$, and rejecting a false $H_0$ is the right call.' },
              { label: 'Outside the critical region', to: 'which' },
            ],
            key,
          ),
        },
        {
          id: 'which',
          ask: `Outside $${regionTex(tail, c)}$ means:`,
          branches: spun(
            [
              { label: `$${outside}$`, to: 'value' },
              { label: `$X ${up ? '\\le' : '\\ge'} ${c}$`, outcome: `No: $X = ${c}$ is in the critical region.` },
              { label: `$X ${up ? '\\le' : '\\ge'} ${up ? c - 2 : c + 2}$`, outcome: `No: $X = ${up ? c - 1 : c + 1}$ is outside the region too.` },
            ],
            `${key}|w`,
          ),
        },
        {
          id: 'value',
          ask: `So when $p = ${fmt(p1)}$, P(Type II) is:`,
          branches: spun(
            [
              { label: `$${P4(right)}$`, outcome: `Right: $P(${outside}) = ${P4(right)}$, the chance the test misses that $p$ is really $${fmt(p1)}$.` },
              { label: `$${P4(power)}$`, outcome: `No: that is $P(${regionTex(tail, c)})$, the chance of rejecting, which is the power.` },
              { label: `$${P4(slip)}$`, outcome: `No: that is off by one count at the edge of the region.` },
            ],
            `${key}|v`,
          ),
        },
      ],
      answer: ['Outside the critical region', `$${outside}$`, `$${P4(right)}$`],
    };
  },
  solution: (sc) => [
    { text: `A Type II error keeps $H_0$ when it is false: $X$ lands outside the region, $${outsideTex(sc)}$, when $p = ${fmt(sc.p1)}$.` },
    { tex: betaLine(sc, sc.p1) },
  ],
};

/** The right P(Type II), the power beside it, and the value one count off. */
function betaFlowValues(sc: ErrorScene): { right: number; power: number; slip: number } {
  const right = betaOf(sc, sc.p1);
  const slip = sc.tail === 'up' ? q(sc.n, sc.p1, sc.c) : 10000 - q(sc.n, sc.p1, sc.c - 1);
  return { right, power: 10000 - right, slip };
}

/* ---------- Level 3, lesson 4: power ---------- */

/** The power typed: 1 minus P(Type II) at the true p. */
const powerExpr: Generator<BetaParams> = {
  id: 'hyp-power',
  sample: sampleBeta,
  render: (sc): Slide => ({
    kind: 'expression',
    prompt: [...betaPrompt(sc), say('Find the power of the test: the probability that it rejects $H_0$ when $p$ is really this value.')],
    lead: '\\text{power} =',
    keypad: [],
    answer: typed(10000 - betaOf(sc, sc.p1)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (sc) => [
    ...betaSolution(sc),
    { tex: chain('\\text{power}', '1 - P(\\text{Type II})', `1 - ${P4(betaOf(sc, sc.p1))}`, P4(10000 - betaOf(sc, sc.p1))) },
  ],
};

interface PairParams extends ErrorScene {
  /** A second alternative, further from the claim than `p1`. */
  p2: number;
}

/**
 * P(Type II) and the power for two alternatives at once: the one further from
 * the claim is easier to detect, so its power is higher.
 */
const powerPairTree: Generator<PairParams> = {
  id: 'hyp-power-pair-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const sc = sampleScene(rng, { nMin: 10, nMax: 25, tails: difficulty > 1 ? ONE_TAILS : ['up'] });
      const further = toward(sc.p1, sc.tail);
      if (further.length === 0) continue;
      const p2 = rng.pick(further);
      if (!quotable(sc.n, p2, edgeOf(sc))) continue;
      return { ...sc, p2 };
    }
  },
  render: (sc): Slide => {
    const { n, p1, p2, tail, c } = sc;
    const k = edgeOf(sc);
    const other = tail === 'up' ? c : c - 1;
    const b1 = betaOf(sc, p1);
    const b2 = betaOf(sc, p2);
    const answer = [P4(b1), P4(b2), P4(10000 - b1), P4(10000 - b2)];
    const slips = [p1, p2].flatMap((p) => (quotable(n, p, other) ? [P4(q(n, p, other)), P4(10000 - q(n, p, other))] : []));
    return {
      kind: 'tree',
      prompt: [
        say(`${sceneText(sc)} ${regionSentence(sc)}`),
        say(`Two alternatives are checked: $p = ${fmt(p1)}$ and $p = ${fmt(p2)}$.`),
        ...quotesAt(n, p1, quotableOnly(n, p1, [k, other])),
        ...quotesAt(n, p2, quotableOnly(n, p2, [k, other])),
        say(`Top row: P(Type II) if $p = ${fmt(p1)}$, then if $p = ${fmt(p2)}$. Bottom row: the power of each.`),
      ],
      expression: '\\text{power} = 1 - P(\\text{Type II})',
      nodes: [
        { id: 'b1', from: [] },
        { id: 'b2', from: [] },
        { id: 'w1', from: ['b1'] },
        { id: 'w2', from: ['b2'] },
      ],
      bank: decimalBank(answer, [...slips, P4(alphaOf(sc)), P4(10000 - alphaOf(sc))], 3),
      answer,
    };
  },
  solution: (sc) => [
    { text: `A Type II error is $${outsideTex(sc)}$, worked at each alternative.` },
    { tex: betaLine(sc, sc.p1) },
    { tex: betaLine(sc, sc.p2) },
    { tex: aligned([`1 - ${P4(betaOf(sc, sc.p1))} &= ${P4(10000 - betaOf(sc, sc.p1))}`, `1 - ${P4(betaOf(sc, sc.p2))} &= ${P4(10000 - betaOf(sc, sc.p2))}`]) },
    { text: `$p = ${fmt(sc.p2)}$ is further from the claim, so the test is more likely to notice it: the power is higher.` },
  ],
};

type Change = 'looser' | 'stricter' | 'further' | 'closer';

interface ChangeParams {
  ctx: number;
  n: number;
  p0: number;
  tail: OneTail;
  change: Change;
  /** The level before and after; the same for a change of alternative. */
  from: number;
  to: number;
  /** The critical region before and after. */
  cFrom: number;
  cTo: number;
  /** The alternative before and after; the same for a change of level. */
  pFrom: number;
  pTo: number;
  /** Difficulty 2 asks about P(Type II) rather than the power. */
  beta: boolean;
}

const LEVEL_PAIRS: [number, number][] = [
  [5, 10],
  [1, 5],
  [1, 10],
];

/** Which way each error moves: size up or down or level, then the power or P(Type II). */
function changeAnswer(change: Change, beta: boolean): string {
  const second = (up: boolean) => (beta ? `P(Type II) ${up ? 'rises' : 'falls'}` : `the power ${up ? 'rises' : 'falls'}`);
  if (change === 'looser') return `P(Type I) rises and ${second(!beta)}`;
  if (change === 'stricter') return `P(Type I) falls and ${second(beta)}`;
  if (change === 'further') return `P(Type I) is unchanged and ${second(!beta)}`;
  return `P(Type I) is unchanged and ${second(beta)}`;
}

/**
 * What a change does to both errors at once: a looser level buys power with
 * Type I errors, and a further alternative is easier to detect with the
 * region unchanged.
 */
const powerChoice: Generator<ChangeParams> = {
  id: 'hyp-power-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = rng.int(10, 30);
      const p0 = rng.pick(PS);
      const tail = rng.pick(ONE_TAILS);
      const change = rng.pick<Change>(['looser', 'stricter', 'further', 'closer']);
      const side = toward(p0, tail);
      if (side.length < 2) continue;
      const beta = difficulty > 1;
      if (change === 'looser' || change === 'stricter') {
        const [lo, hi] = rng.pick(LEVEL_PAIRS);
        const [from, to] = change === 'looser' ? [lo, hi] : [hi, lo];
        const cFrom = oneTailRegion(n, p0, tail, from);
        const cTo = oneTailRegion(n, p0, tail, to);
        if (cFrom === undefined || cTo === undefined || cFrom === cTo) continue;
        const p = rng.pick(side);
        return { ctx: pickCtx(rng), n, p0, tail, change, from, to, cFrom, cTo, pFrom: p, pTo: p, beta };
      }
      const level = rng.pick([1, 5, 10]);
      const c = oneTailRegion(n, p0, tail, level);
      if (c === undefined) continue;
      const [near, far] = rng.sample(side, 2).sort((x, y) => (tail === 'up' ? x - y : y - x));
      const [pFrom, pTo] = change === 'further' ? [near, far] : [far, near];
      return { ctx: pickCtx(rng), n, p0, tail, change, from: level, to: level, cFrom: c, cTo: c, pFrom, pTo, beta };
    }
  },
  render: (params): Slide => {
    const { ctx, n, p0, tail, change, from, to, cFrom, cTo, pFrom, pTo, beta } = params;
    const c = CONTEXTS[ctx];
    const setup =
      change === 'looser' || change === 'stricter'
        ? `At the ${from}% level the critical region is $${regionTex(tail, cFrom)}$. The level is changed to ${to}%, and the region becomes $${regionTex(tail, cTo)}$. The true proportion is ${pct(pFrom)}% throughout.`
        : `At the ${from}% level the critical region is $${regionTex(tail, cFrom)}$. The errors are worked out for a true proportion of ${pct(pFrom)}%, then again for ${pct(pTo)}%.`;
    const all: Change[] = ['looser', 'stricter', 'further', 'closer'];
    return keyedChoice(
      [
        say(`${claimText(c, p0)} ${suspicionText(c, p0, tail)} The test uses a sample of ${n}.`),
        say(setup),
        say(beta ? 'What happens to the probabilities of a Type I and a Type II error?' : 'What happens to the probability of a Type I error, and to the power?'),
      ],
      options({ tex: changeAnswer(change, beta) }, ...all.filter((x) => x !== change).map((x) => ({ tex: changeAnswer(x, beta) }))),
      `${ctx}|${n}|${fmt(p0)}|${cFrom}|${cTo}|${fmt(pFrom)}|${fmt(pTo)}`,
      false,
    );
  },
  solution: ({ change, tail, from, to, cFrom, cTo, pFrom, pTo }) => {
    if (change === 'looser' || change === 'stricter') {
      const grows = change === 'looser';
      return [
        { text: `Going from ${from}% to ${to}% moves the region from $${regionTex(tail, cFrom)}$ to $${regionTex(tail, cTo)}$: it ${grows ? 'grows' : 'shrinks'}.` },
        {
          text: grows
            ? 'A bigger region rejects more often whatever p is: more Type I errors when $H_0$ is true, and more power, so fewer Type II errors, when it is false.'
            : 'A smaller region rejects less often whatever p is: fewer Type I errors when $H_0$ is true, but less power, so more Type II errors, when it is false.',
        },
      ];
    }
    return [
      { text: `The level and the region stay the same, so P(Type I) does not change.` },
      {
        text:
          change === 'further'
            ? `A true proportion of ${pct(pTo)}% is further from the claim than ${pct(pFrom)}%, so the count is more likely to land in the region: the power rises and P(Type II) falls.`
            : `A true proportion of ${pct(pTo)}% is closer to the claim than ${pct(pFrom)}%, so the count is less likely to land in the region: the power falls and P(Type II) rises.`,
      },
    ];
  },
};

interface TradeParams extends ErrorScene {
  /** The looser level first, then the stricter. */
  levels: [number, number];
  cs: [number, number];
  given: boolean;
}

/**
 * The trade between the errors at fixed n: the same test at two levels, each
 * with its size and its P(Type II) at the true p. The stricter level has the
 * smaller size and the bigger P(Type II).
 */
const tradeTable: Generator<TradeParams> = {
  id: 'hyp-trade-table',
  sample: (rng, difficulty) => {
    for (;;) {
      const sc = sampleScene(rng, { nMin: 10, nMax: 30, levels: [10] });
      const [lo] = rng.pick(LEVEL_PAIRS.filter(([, hi]) => hi === 10));
      const strict = oneTailRegion(sc.n, sc.p0, sc.tail, lo);
      if (strict === undefined || strict === sc.c) continue;
      const cs: [number, number] = [sc.c, strict];
      if (!cs.every((c) => quotable(sc.n, sc.p1, edgeOf({ tail: sc.tail, c })))) continue;
      const span = sc.tail === 'up' ? [Math.min(...cs) - 2, Math.max(...cs) - 1] : [Math.min(...cs), Math.max(...cs) + 1];
      if (!quotableRange(sc.n, sc.p0, span[0], span[1])) continue;
      return { ...sc, levels: [10, lo], cs, given: difficulty < 2 };
    }
  },
  render: (sc): Slide => {
    const { n, p0, p1, tail, levels, cs, given, ctx } = sc;
    const up = tail === 'up';
    const scenes = cs.map((c) => ({ ...sc, c }));
    const alphas = scenes.map(alphaOf);
    const betas = scenes.map((s) => betaOf(s, p1));
    const answer = cs.flatMap((c, i) => [...(given ? [] : [`${c}`]), P4(alphas[i]), P4(betas[i])]);
    const edges = scenes.map(edgeOf);
    const p0ks = given ? edges : quotableOnly(n, p0, up ? cs.flatMap((c) => [c - 2, c - 1]) : cs.flatMap((c) => [c, c + 1]));
    const slips = [...alphas.map((v) => P4(10000 - v)), ...betas.map((v) => P4(10000 - v)), ...(given ? [] : cs.flatMap((c) => [`${c - 1}`, `${c + 1}`]))];
    const ctxt = CONTEXTS[ctx];
    return {
      kind: 'table',
      prompt: [
        say(`${claimText(ctxt, p0)} ${suspicionText(ctxt, p0, tail)} The test uses a sample of ${n}, with critical region $X ${up ? '\\ge' : '\\le'} c$. ${truthText(ctx, p1)}`),
        ...quotesAt(n, p0, quotableOnly(n, p0, p0ks)),
        ...quotesAt(n, p1, quotableOnly(n, p1, edges)),
        say(
          `${given ? 'At each level, fill in' : 'Find $c$ at each level, then fill in'} $\\alpha = P(\\text{Type I})$ and $\\beta = P(\\text{Type II})$ when $p = ${fmt(p1)}$.`,
        ),
      ],
      columns: ['\\text{level}', 'c', '\\alpha', '\\beta'],
      rows: levels.map((level, i) => [`${level}\\%`, given ? `${cs[i]}` : null, null, null]),
      bank: decimalBank(answer, slips, 3),
      answer,
    };
  },
  solution: (sc) => {
    const scenes = sc.cs.map((c) => ({ ...sc, c }));
    return [
      ...(sc.given ? [] : scenes.flatMap((s, i) => sceneRegionSolution({ ...s, level: sc.levels[i] }))),
      ...scenes.flatMap((s, i): SolutionStep[] => [
        { text: `At ${sc.levels[i]}%, the region is $${regionTex(s.tail, s.c)}$:` },
        {
          tex: aligned([
            s.tail === 'up'
              ? `\\alpha &= 1 - ${P4(q(s.n, s.p0, s.c - 1))} = ${P4(alphaOf(s))}`
              : `\\alpha &= ${le(s.c)} = ${P4(alphaOf(s))}`,
            s.tail === 'up'
              ? `\\beta &= ${P4(betaOf(s, s.p1))}`
              : `\\beta &= 1 - ${P4(q(s.n, s.p1, s.c))} = ${P4(betaOf(s, s.p1))}`,
          ]),
        },
      ]),
      { text: 'The stricter level cuts the chance of a Type I error but raises the chance of a Type II error: at a fixed sample size, one cannot fall without the other rising.' },
    ];
  },
};

/* ---------- Level 3, lesson 5: errors in the test of a mean ---------- */

/**
 * The standard normal cumulative, by the Taylor series of erf. Used only to
 * choose what to quote; the test file checks each quote by Simpson's rule.
 */
function Phi(z: number): number {
  const x = z / Math.SQRT2;
  let term = x;
  let sum = x;
  for (let k = 1; k < 400; k += 1) {
    term *= (-x * x) / k;
    const add = term / (2 * k + 1);
    sum += add;
    if (Math.abs(add) < 1e-17) break;
  }
  return 0.5 + sum / Math.sqrt(Math.PI);
}

/** Phi(z) as quoted, in ten-thousandths. */
const phiQ = (z: number): number => Math.round(Phi(z) * 10000);

/** Whether Phi(z) can be quoted: inside (0, 1) once rounded, and nowhere near a rounding tie. */
function phiQuotable(z: number): boolean {
  const scaled = Phi(z) * 10000;
  const frac = scaled - Math.floor(scaled);
  return Math.abs(frac - 0.5) > 0.01 && Math.round(scaled) >= 1 && Math.round(scaled) <= 9999;
}

/** A quoted table of Phi, one value per line. */
const phiQuotes = (zs: number[]): Block[] => [
  say('The standard normal table gives:'),
  show(aligned([...new Set(zs)].sort((a, b) => a - b).map((z) => `\\Phi(${fmt(z)}) &= ${P4(phiQ(z))}`))),
];

/** P(Z < z) in ten-thousandths from a quoted Phi of |z|. */
const belowQ = (z: number): number => (z >= 0 ? phiQ(z) : 10000 - phiQ(-z));

interface MeanErrScene {
  ctx: number;
  mu: number;
  n: number;
  /** sigma / sqrt(n), whole. */
  s: number;
  tail: OneTail;
  level: number;
  /** How far the true mean sits from the claim, towards `H_1`, in hundredths of s. */
  dh: number;
}

const mSign = (tail: OneTail): number => (tail === 'up' ? 1 : -1);
const mCrit = (sc: Pick<MeanErrScene, 'level' | 'tail'>): number => critical(sc.level, sc.tail);
const mXc = (sc: MeanErrScene): number => sc.mu + mSign(sc.tail) * mCrit(sc) * sc.s;
const mTrue = (sc: MeanErrScene): number => sc.mu + (mSign(sc.tail) * sc.dh * sc.s) / 100;
/** The boundary of the region standardised under the true mean: `(x_c - mu_1) / s`. */
const mZ = (sc: MeanErrScene): number => (mSign(sc.tail) * Math.round(mCrit(sc) * 1000 - sc.dh * 10)) / 1000;
/** P(Type II) in ten-thousandths: the sample mean falls short of the boundary. */
const mBeta = (sc: MeanErrScene): number => (sc.tail === 'up' ? belowQ(mZ(sc)) : 10000 - belowQ(mZ(sc)));

function sampleMeanErr(rng: Rng): MeanErrScene {
  for (;;) {
    const ctx = rng.int(0, MEAN_CONTEXTS.length - 1);
    const mu = rng.pick(MEAN_CONTEXTS[ctx].mus);
    const n = rng.pick(NS);
    const s = rng.int(1, 8);
    if (sigmaOf({ s, n }) * 3 > mu) continue;
    const sc: MeanErrScene = { ctx, mu, n, s, tail: rng.pick(ONE_TAILS), level: rng.pick([5, 1]), dh: rng.int(10, 80) * 5 };
    const z = Math.abs(mZ(sc));
    if (z < 0.05 || z > 2.9 || !terminates((sc.dh * s) / 100, 1)) continue;
    if (!phiQuotable(z) || !phiQuotable(sc.dh / 100) || Math.abs(z - sc.dh / 100) < 1e-9) continue;
    return sc;
  }
}

function meanErrText(sc: MeanErrScene): string {
  const c = MEAN_CONTEXTS[sc.ctx];
  return `The mean ${c.quantity} is claimed to be $${sc.mu}$ ${c.unit}, with standard deviation $${sigmaOf(sc)}$ ${c.unit}. It is suspected that the mean ${SUSPECT[sc.tail]}. A test at the ${sc.level}% level uses a random sample of $${sc.n}$.`;
}

const meanTruth = (sc: MeanErrScene): string => `In fact the mean is $${fmt(mTrue(sc))}$ ${MEAN_CONTEXTS[sc.ctx].unit}.`;

const xcTex = (sc: MeanErrScene): string => `\\bar{x} ${sc.tail === 'up' ? '>' : '<'} ${fmt(mXc(sc))}`;

function meanErrSolution(sc: MeanErrScene): SolutionStep[] {
  const c = fmt(mCrit(sc));
  const sign = sc.tail === 'up' ? '+' : '-';
  const z = mZ(sc);
  const miss = sc.tail === 'up' ? `P(\\bar{X} < ${fmt(mXc(sc))})` : `P(\\bar{X} > ${fmt(mXc(sc))})`;
  const zLine =
    sc.tail === 'up'
      ? z >= 0
        ? chain(`P(Z < ${fmt(z)})`, `\\Phi(${fmt(z)})`, P4(mBeta(sc)))
        : chain(`P(Z < ${fmt(z)})`, `1 - \\Phi(${fmt(-z)})`, P4(mBeta(sc)))
      : z <= 0
        ? chain(`P(Z > ${fmt(z)})`, `\\Phi(${fmt(-z)})`, P4(mBeta(sc)))
        : chain(`P(Z > ${fmt(z)})`, `1 - \\Phi(${fmt(z)})`, P4(mBeta(sc)));
  return [
    { tex: `\\frac{\\sigma}{\\sqrt{n}} = \\frac{${sigmaOf(sc)}}{\\sqrt{${sc.n}}} = ${sc.s}` },
    { tex: chain('\\bar{x}_c', `${sc.mu} ${sign} ${c} \\times ${sc.s}`, fmt(mXc(sc))) },
    { text: `A Type II error keeps $H_0$: the sample mean misses the region, $${miss}$, when the true mean is $${fmt(mTrue(sc))}$.` },
    { tex: chain('z', `\\frac{${fmt(mXc(sc))} - ${fmt(mTrue(sc))}}{${sc.s}}`, fmt(z)) },
    { tex: zLine },
  ];
}

interface MeanBetaParams extends MeanErrScene {
  /** Difficulty 1 gives the critical sample mean. */
  given: boolean;
}

/** P(Type II) of a test of a mean: the boundary under the true mean, as a normal tail. */
const meanBeta: Generator<MeanBetaParams> = {
  id: 'hyp-mean-beta',
  sample: (rng, difficulty) => ({ ...sampleMeanErr(rng), given: difficulty < 2 }),
  render: (sc): Slide => ({
    kind: 'expression',
    prompt: [
      say(meanErrText(sc)),
      say(`${sc.given ? `It rejects $H_0$ when $${xcTex(sc)}$. ` : ''}${meanTruth(sc)}`),
      ...phiQuotes([Math.abs(mZ(sc)), sc.dh / 100]),
      say('Find the probability of a Type II error.'),
    ],
    lead: 'P(\\text{Type II}) =',
    keypad: [],
    answer: typed(mBeta(sc)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (sc) => (sc.given ? meanErrSolution(sc).slice(2) : meanErrSolution(sc)),
};

/** The same route as a tree: the critical mean, its z under the true mean, then P(Type II). */
const meanMissTree: Generator<MeanErrScene & { hint: boolean }> = {
  id: 'hyp-mean-miss-tree',
  // Difficulty 1 gives the standard deviation of the sample mean.
  sample: (rng, difficulty) => ({ ...sampleMeanErr(rng), hint: difficulty < 2 }),
  render: (sc): Slide => {
    const z = mZ(sc);
    const sign = mSign(sc.tail);
    const beta = mBeta(sc);
    const answer = [fmt(mXc(sc)), fmt(z), P4(beta)];
    const slips = [
      fmt(sc.mu + sign * mCrit(sc) * sigmaOf(sc)),
      fmt(mTrue(sc) + sign * mCrit(sc) * sc.s),
      fmt(-z),
      P4(10000 - beta),
      P4(phiQ(sc.dh / 100)),
    ];
    return {
      kind: 'tree',
      prompt: [
        say(`${meanErrText(sc)} ${meanTruth(sc)}${sc.hint ? ` The standard deviation of $\\bar{X}$ is $${sc.s}$ ${MEAN_CONTEXTS[sc.ctx].unit}.` : ''}`),
        ...phiQuotes([Math.abs(z), sc.dh / 100]),
        say('Top: the critical value of $\\bar{x}$. Then that boundary as a $z$ under the true mean. Then the probability of a Type II error.'),
      ],
      expression: 'P(\\text{Type II})',
      nodes: [
        { id: 'xc', from: [] },
        { id: 'z', from: ['xc'] },
        { id: 'beta', from: ['z'] },
      ],
      bank: decimalBank(answer, slips, 3),
      answer,
    };
  },
  solution: meanErrSolution,
};

interface NBetaParams {
  ctx: number;
  mu: number;
  sigma: number;
  ns: number[];
  /** |mu_1 - mu_0|, to one place. */
  gap: number;
  tail: OneTail;
  level: number;
  /** Difficulty 1 gives each z. */
  given: boolean;
}

/** The boundary standardised under the true mean, for sample size n. */
function nZ({ sigma, gap, tail, level }: Pick<NBetaParams, 'sigma' | 'gap' | 'tail' | 'level'>, n: number): number {
  const d = gap / (sigma / Math.sqrt(n));
  return (mSign(tail) * Math.round(critical(level, tail) * 1000 - d * 1000)) / 1000;
}

const nBeta = (params: Pick<NBetaParams, 'sigma' | 'gap' | 'tail' | 'level'>, n: number): number => {
  const z = nZ(params, n);
  return params.tail === 'up' ? belowQ(z) : 10000 - belowQ(z);
};

/**
 * The same test and the same true mean at three sample sizes: at a fixed
 * level, P(Type II) shrinks as n grows, because the sample mean varies less.
 */
const betaNTable: Generator<NBetaParams> = {
  id: 'hyp-beta-n-table',
  sample: (rng, difficulty) => {
    for (;;) {
      const sigma = rng.pick(TABLE_SIGMAS);
      const ctx = rng.int(0, MEAN_CONTEXTS.length - 1);
      const mu = rng.pick(MEAN_CONTEXTS[ctx].mus);
      if (sigma * 3 > mu) continue;
      const fits = NS.filter((n) => sigma % Math.sqrt(n) === 0);
      if (fits.length < 3) continue;
      const ns = rng.sample(fits, 3).sort((a, b) => a - b);
      const gap = rng.int(1, 150) / 10;
      const tail = rng.pick(ONE_TAILS);
      const level = rng.pick([5, 1]);
      const params = { sigma, gap, tail, level };
      if (!ns.every((n) => terminates(gap / (sigma / Math.sqrt(n)), 2))) continue;
      const zs = ns.map((n) => nZ(params, n));
      if (zs.some((z) => Math.abs(z) < 0.05 || Math.abs(z) > 2.9 || !phiQuotable(Math.abs(z)))) continue;
      if (new Set(zs.map(Math.abs)).size < 3) continue;
      return { ctx, mu, sigma, ns, gap, tail, level, given: difficulty < 2 };
    }
  },
  render: (params): Slide => {
    const { ctx, mu, sigma, ns, gap, tail, level, given } = params;
    const c = MEAN_CONTEXTS[ctx];
    const zs = ns.map((n) => nZ(params, n));
    const betas = ns.map((n) => nBeta(params, n));
    const answer = ns.flatMap((_, i) => [...(given ? [] : [fmt(zs[i])]), P4(betas[i])]);
    const slips = [
      ...betas.map((b) => P4(10000 - b)),
      ...(given ? [] : [...zs.map((z) => fmt(-z)), ...ns.map((n) => fmt(critical(level, tail) - (gap * n) / sigma))]),
    ].filter((t) => t.length <= 7);
    const truth = mu + mSign(tail) * gap;
    return {
      kind: 'table',
      prompt: [
        say(
          `The mean ${c.quantity} is claimed to be $${mu}$ ${c.unit}, with standard deviation $${sigma}$ ${c.unit}. It is suspected that the mean ${SUSPECT[tail]}, and a test at the ${level}% level is planned. In fact the mean is $${fmt(truth)}$ ${c.unit}.`,
        ),
        say(
          `For each sample size, $z$ is the boundary of the critical region standardised under the true mean. ${given ? 'Fill in' : 'Fill in $z$ and'} $\\beta = P(\\text{Type II})$.`,
        ),
        ...phiQuotes(zs.map(Math.abs)),
      ],
      columns: ['n', 'z', '\\beta'],
      rows: ns.map((n, i) => [`${n}`, given ? fmt(zs[i]) : null, null]),
      bank: decimalBank(answer, slips, 3),
      answer,
    };
  },
  solution: (params) => {
    const { ctx, mu, sigma, ns, gap, tail, level } = params;
    const c = critical(level, tail);
    const up = tail === 'up';
    const unit = MEAN_CONTEXTS[ctx].unit;
    const tailTex = (z: number): string =>
      up ? `P(Z < ${fmt(z)})` : `P(Z > ${fmt(z)})`;
    return [
      {
        text: `The boundary is $\\bar{x}_c = ${mu} ${up ? '+' : '-'} ${fmt(c)} \\times \\frac{${sigma}}{\\sqrt{n}}$, and the true mean is $${fmt(gap)}$ ${unit} ${up ? 'above' : 'below'} the claim. Measured from the true mean in standard deviations of $\\bar{X}$, the boundary sits at $z = ${up ? '' : '-'}\\left(${fmt(c)} - \\frac{${fmt(gap)}}{${sigma} / \\sqrt{n}}\\right)$.`,
      },
      ...ns.map((n) => ({
        tex: aligned([
          `n &= ${n}`,
          `z &= ${up ? '' : '-('}${fmt(c)} - \\frac{${fmt(gap)}}{${fmt(sigma / Math.sqrt(n))}}${up ? '' : ')'}`,
          `&= ${fmt(nZ(params, n))}`,
          `\\beta &= ${tailTex(nZ(params, n))}`,
          `&= ${P4(nBeta(params, n))}`,
        ]),
      })),
      { text: 'A bigger sample tightens the spread of $\\bar{X}$, so a real change is harder to miss: $\\beta$ falls while the level stays the same.' },
    ];
  },
};

type MeanChange = 'bigger' | 'smaller' | 'stricter' | 'looser' | 'further' | 'closer';

interface MeanChangeParams extends MeanErrScene {
  change: MeanChange;
  /** The new sample size, level or true mean's shift, as the change needs. */
  n2: number;
  level2: number;
  dh2: number;
}

const MEAN_CHANGE_ANSWER: Record<'same-down' | 'same-up' | 'down-up' | 'up-down', string> = {
  'same-down': 'P(Type I) stays the same and P(Type II) falls',
  'same-up': 'P(Type I) stays the same and P(Type II) rises',
  'down-up': 'P(Type I) falls and P(Type II) rises',
  'up-down': 'P(Type I) rises and P(Type II) falls',
};

const meanChangeKey = (change: MeanChange): keyof typeof MEAN_CHANGE_ANSWER =>
  change === 'bigger' || change === 'further' ? 'same-down' : change === 'smaller' || change === 'closer' ? 'same-up' : change === 'stricter' ? 'down-up' : 'up-down';

/**
 * What a change to the test of a mean does to each error: the sample size
 * and the true mean move only P(Type II); the level trades one error for the
 * other. Difficulty 1 changes n or the level; difficulty 2 the true mean too.
 */
const meanErrorChoice: Generator<MeanChangeParams> = {
  id: 'hyp-mean-error-choice',
  sample: (rng, difficulty) => {
    const changes: MeanChange[] = difficulty > 1 ? ['bigger', 'smaller', 'stricter', 'looser', 'further', 'closer'] : ['bigger', 'smaller', 'stricter', 'looser'];
    for (;;) {
      const sc = sampleMeanErr(rng);
      const change = rng.pick(changes);
      const bigger = NS.filter((m) => m > sc.n);
      const smaller = NS.filter((m) => m < sc.n);
      const pool = change === 'bigger' ? bigger : change === 'smaller' ? smaller : [sc.n];
      if (pool.length === 0) continue;
      const n2 = rng.pick(pool);
      const level = change === 'stricter' ? 5 : change === 'looser' ? 1 : sc.level;
      const level2 = change === 'stricter' ? 1 : change === 'looser' ? 5 : level;
      const dh2 = change === 'further' ? sc.dh + rng.int(1, 10) * 10 : change === 'closer' ? sc.dh - rng.int(1, 5) * 5 : sc.dh;
      if (dh2 <= 0 || !terminates((dh2 * sc.s) / 100, 1)) continue;
      return { ...sc, level, change, n2, level2, dh2 };
    }
  },
  render: (sc): Slide => {
    const c = MEAN_CONTEXTS[sc.ctx];
    const shifted = { ...sc, dh: sc.dh2 };
    const setup =
      sc.change === 'bigger' || sc.change === 'smaller'
        ? `The sample size is changed from $${sc.n}$ to $${sc.n2}$, still at the ${sc.level}% level.`
        : sc.change === 'stricter' || sc.change === 'looser'
          ? `The level is changed from ${sc.level}% to ${sc.level2}%, with the same sample size.`
          : `The test is left as it is, but the true mean turns out to be $${fmt(mTrue(shifted))}$ ${c.unit} instead.`;
    const right = MEAN_CHANGE_ANSWER[meanChangeKey(sc.change)];
    return keyedChoice(
      [say(`${meanErrText(sc)} ${meanTruth(sc)}`), say(setup), say('What happens to the probabilities of the two errors?')],
      options({ tex: right }, ...Object.values(MEAN_CHANGE_ANSWER).filter((t) => t !== right).map((tex) => ({ tex }))),
      `${sc.ctx}|${sc.mu}|${sc.n}|${sc.n2}|${sc.s}|${sc.dh}|${sc.dh2}|${sc.level}`,
      false,
    );
  },
  solution: (sc) => {
    const c = MEAN_CONTEXTS[sc.ctx];
    if (sc.change === 'bigger' || sc.change === 'smaller') {
      return [
        { text: `The level is still ${sc.level}%, so P(Type I) is still ${asProb(sc.level)}$: $\\bar{X}$ is continuous, so the region is drawn to hold exactly the level under $H_0$.` },
        {
          text: `With $n = ${sc.n2}$ the standard deviation of $\\bar{X}$ is $\\frac{${sigmaOf(sc)}}{\\sqrt{${sc.n2}}}$, ${sc.change === 'bigger' ? 'smaller, so the sample mean is less likely to fall short of the boundary when the mean really has moved: P(Type II) falls' : 'larger, so the sample mean is more likely to fall short of the boundary: P(Type II) rises'}.`,
        },
      ];
    }
    if (sc.change === 'stricter' || sc.change === 'looser') {
      return [
        {
          text: `At ${sc.level2}% the critical value is $${fmt(critical(sc.level2, sc.tail))}$ instead of $${fmt(critical(sc.level, sc.tail))}$: the region ${sc.change === 'stricter' ? 'shrinks' : 'grows'}.`,
        },
        { text: sc.change === 'stricter' ? 'Fewer Type I errors, but more real changes are missed: P(Type II) rises.' : 'More Type I errors, but fewer real changes are missed: P(Type II) falls.' },
      ];
    }
    return [
      { text: 'The test itself has not changed, so P(Type I) is the same.' },
      {
        text: `A true mean of $${fmt(mTrue({ ...sc, dh: sc.dh2 }))}$ ${c.unit} is ${sc.change === 'further' ? 'further from' : 'closer to'} the claim, so the sample mean is ${sc.change === 'further' ? 'less' : 'more'} likely to fall short of the boundary: P(Type II) ${sc.change === 'further' ? 'falls' : 'rises'}.`,
      },
    ];
  },
};

export const hypothesisTestingGenerators = [
  claimFlow,
  hypothesesTiles,
  tailsChoice,
  expected,
  modelTiles,
  upperTree,
  statisticChoice,
  pointProb,
  pvalueTable,
  pvalue,
  decisionFlow,
  pvalueChoice,
  regionLine,
  regionTable,
  actualLevel,
  regionChoice,
  twoFlow,
  twoRegionLine,
  twoTiles,
  twoLevel,
  meanModelTiles,
  meanSe,
  meanSpreadTree,
  meanSpreadChoice,
  zStat,
  standardiseSteps,
  zTiles,
  zSlider,
  criticalTable,
  criticalFlow,
  zRegionChoice,
  criticalSlider,
  meanDecisionFlow,
  conclusionChoice,
  meanXbar,
  zTree,
  falseAlarms,
  nChoice,
  levelsFlow,
  nTable,
  errorChoice,
  errorFlow,
  errorTiles,
  errorLine,
  sizeExpr,
  sizeSum,
  sizeChoice,
  sizeTable,
  betaExpr,
  betaChoice,
  betaFlow,
  powerExpr,
  powerPairTree,
  powerChoice,
  tradeTable,
  meanBeta,
  meanMissTree,
  betaNTable,
  meanErrorChoice,
] as Generator<never>[];
