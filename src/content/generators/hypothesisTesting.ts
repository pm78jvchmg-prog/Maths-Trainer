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
 * Level 4 tests a correlation: `H_0: \rho = 0` against a direction or none,
 * the critical value of r read from a quoted excerpt of the product-moment
 * table (`PMCC_TABLE`), one- and two-tailed decisions with the column halved
 * for two, and how n and the level move the verdict. Every r and critical
 * value is quoted to four places, and no |r| is ever one.
 *
 * Nothing here is calculus, so no slide declares `source` and the oracle in
 * `generators.test.ts` rightly skips every one; the checks that matter are in
 * `hypothesisTesting.test.ts`.
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
 * Level 4: testing a correlation
 * ================================================================ */

/** The table's columns: one-tailed levels in %, loosest first. */
const PMCC_LEVELS = [10, 5, 2.5, 1, 0.5];

/** Two-tailed levels a column can serve: each reads the column at half of it. */
const TWO_LEVELS = [10, 5, 2, 1];

/**
 * Critical values of the product-moment correlation coefficient, in
 * ten-thousandths: row `n - 4` for n = 4 to 30, one column per level in
 * `PMCC_LEVELS`. The standard table, to four places.
 * `hypothesisTesting.test.ts` recomputes every value it finds quoted from the
 * density of r under `H_0`, and checks that the columns fall and the rows rise.
 */
const PMCC_TABLE: number[][] = [
  [8000, 9000, 9500, 9800, 9900], // n = 4
  [6870, 8054, 8783, 9343, 9587], // n = 5
  [6084, 7293, 8114, 8822, 9172], // n = 6
  [5509, 6694, 7545, 8329, 8745], // n = 7
  [5067, 6215, 7067, 7887, 8343], // n = 8
  [4716, 5822, 6664, 7498, 7977], // n = 9
  [4428, 5494, 6319, 7155, 7646], // n = 10
  [4187, 5214, 6021, 6851, 7348], // n = 11
  [3981, 4973, 5760, 6581, 7079], // n = 12
  [3802, 4762, 5529, 6339, 6835], // n = 13
  [3646, 4575, 5324, 6120, 6614], // n = 14
  [3507, 4409, 5140, 5923, 6411], // n = 15
  [3383, 4259, 4973, 5742, 6226], // n = 16
  [3271, 4124, 4821, 5577, 6055], // n = 17
  [3170, 4000, 4683, 5425, 5897], // n = 18
  [3077, 3887, 4555, 5285, 5751], // n = 19
  [2992, 3783, 4438, 5155, 5614], // n = 20
  [2914, 3687, 4329, 5034, 5487], // n = 21
  [2841, 3598, 4227, 4921, 5368], // n = 22
  [2774, 3515, 4132, 4815, 5256], // n = 23
  [2711, 3438, 4044, 4716, 5151], // n = 24
  [2653, 3365, 3961, 4622, 5052], // n = 25
  [2598, 3297, 3882, 4534, 4958], // n = 26
  [2546, 3233, 3809, 4451, 4869], // n = 27
  [2497, 3172, 3739, 4372, 4785], // n = 28
  [2451, 3115, 3673, 4297, 4705], // n = 29
  [2407, 3061, 3610, 4226, 4629], // n = 30
];

const PMCC_MIN_N = 4;
const PMCC_MAX_N = 30;

/** The table entry for n at a one-tailed level, in ten-thousandths. */
function cv(n: number, level: number): number {
  const col = PMCC_LEVELS.indexOf(level);
  if (col < 0 || n < PMCC_MIN_N || n > PMCC_MAX_N) throw new Error(`no critical value for n = ${n} at ${level}%`);
  return PMCC_TABLE[n - PMCC_MIN_N][col];
}

/** A value in ten-thousandths to four places, the way r and the table are quoted. */
const R4 = (tenK: number): string => (tenK / 10000).toFixed(4);

/** The column a test reads: the level itself, or half of it for two tails. */
const columnOf = (level: number, tail: Tail): number => (tail === 'two' ? level / 2 : level);

/**
 * An excerpt of the table: rows `ns`, at most three columns `levels` (four
 * run off a phone), every value to four places. Every critical value a prompt uses is quoted through this, so the
 * test can read them all back one way.
 */
function pmccExcerpt(ns: number[], levels: number[]): Block {
  const head = ['n', ...levels.map((l) => `${fmt(l)}\\%`)].join(' & ');
  const rows = ns.map((n) => [`${n}`, ...levels.map((l) => R4(cv(n, l)))].join(' & '));
  if (levels.length > 3) throw new Error('an excerpt of more than three columns runs off a phone');
  return show(`\\small \\begin{array}{c|${'c'.repeat(levels.length)}} ${head} \\\\ \\hline ${rows.join(' \\\\ ')} \\end{array}`);
}

const PMCC_INTRO = say('Critical values of $r$, by one-tailed level:');

/** `count` consecutive values from `from`, clamped to lie within [lo, hi]. */
function windowOf(from: number, count: number, lo: number, hi: number): number[] {
  const start = Math.max(lo, Math.min(from, hi - count + 1));
  return range(start, start + count - 1);
}

/** `count` consecutive columns of the table, starting where `at` asks, within the table. */
const levelsFrom = (at: number, count: number): number[] =>
  windowOf(at, count, 0, PMCC_LEVELS.length - 1).map((i) => PMCC_LEVELS[i]);

interface CorrContext {
  who: string;
  x: string;
  y: string;
  /** What one pair is recorded from, plural. */
  items: string;
  /** A positive correlation in the scenario's words. */
  up: string;
  /** A negative one. */
  down: string;
}

const CORR_CONTEXTS: CorrContext[] = [
  {
    who: 'An ice-cream seller',
    x: 'the daily temperature',
    y: 'the number of ice creams sold',
    items: 'days',
    up: 'more ice creams are sold on warmer days',
    down: 'fewer ice creams are sold on warmer days',
  },
  {
    who: 'A teacher',
    x: 'the hours spent revising',
    y: 'the exam mark',
    items: 'students',
    up: 'students who revise for longer score higher marks',
    down: 'students who revise for longer score lower marks',
  },
  {
    who: 'A doctor',
    x: 'age',
    y: 'resting heart rate',
    items: 'patients',
    up: 'older patients have higher resting heart rates',
    down: 'older patients have lower resting heart rates',
  },
  {
    who: 'A botanist',
    x: 'the hours of sunlight',
    y: 'the height of a plant',
    items: 'plants',
    up: 'plants given more sunlight grow taller',
    down: 'plants given more sunlight grow less tall',
  },
  {
    who: 'An estate agent',
    x: 'the distance from the city centre',
    y: 'the price of a house',
    items: 'houses',
    up: 'houses further from the centre cost more',
    down: 'houses further from the centre cost less',
  },
  {
    who: 'A car dealer',
    x: 'the age of a car',
    y: 'its selling price',
    items: 'cars',
    up: 'older cars sell for more',
    down: 'older cars sell for less',
  },
  {
    who: 'A running coach',
    x: 'the hours of training a week',
    y: 'the time taken to run 400 m',
    items: 'athletes',
    up: 'athletes who train more take longer to run 400 m',
    down: 'athletes who train more take less time to run 400 m',
  },
  {
    who: 'A café owner',
    x: 'the daily rainfall',
    y: 'the number of customers',
    items: 'days',
    up: 'more customers come in on wetter days',
    down: 'fewer customers come in on wetter days',
  },
  {
    who: 'A shop manager',
    x: 'the price of a sandwich',
    y: 'the number sold',
    items: 'weeks',
    up: 'more sandwiches sell in weeks when they cost more',
    down: 'fewer sandwiches sell in weeks when they cost more',
  },
  {
    who: 'A sleep researcher',
    x: 'daily screen time',
    y: 'hours of sleep',
    items: 'children',
    up: 'children with more screen time sleep for longer',
    down: 'children with more screen time sleep for less time',
  },
];

const pickCorr = (rng: Rng): number => rng.int(0, CORR_CONTEXTS.length - 1);

const SIGN_WORD: Record<Tail, string> = { up: 'positive ', down: 'negative ', two: '' };

/**
 * The suspicion. `worded` puts it in the scenario's own words, so the
 * direction has to be read from them; otherwise it names the correlation.
 */
function corrSuspicion(c: CorrContext, tail: Tail, worded: boolean): string {
  if (!worded) {
    return tail === 'two'
      ? `${c.who} suspects that ${c.x} and ${c.y} are correlated.`
      : `${c.who} suspects ${SIGN_WORD[tail]}correlation between ${c.x} and ${c.y}.`;
  }
  if (tail === 'up') return `${c.who} suspects that ${c.up}.`;
  if (tail === 'down') return `${c.who} suspects that ${c.down}.`;
  return `${c.who} suspects a link between ${c.x} and ${c.y}, but not which way it goes.`;
}

const corrSample = (c: CorrContext, n: number, rh: number): string =>
  `They record ${c.x} and ${c.y} for a random sample of ${n} ${c.items}, giving $r = ${R4(rh)}$.`;

/** What `H_1` says, in the scenario's words. */
const corrWords = (c: CorrContext, tail: Tail): string => `there is ${SIGN_WORD[tail]}correlation between ${c.x} and ${c.y}`;

const rhoH1 = (tail: Tail): string => `H_1: \\rho ${OP[tail]} 0`;

const rhoHyps = (tail: Tail): string => `H_0: \\rho = 0, \\; ${rhoH1(tail)}`;

/** The test stated outright: hypotheses, level and sample size. */
const corrTest = (tail: Tail, level: number, n: number): string =>
  `A test of $H_0: \\rho = 0$ against $${rhoH1(tail)}$ at the ${fmt(level)}% level uses a random sample of ${n} pairs.`;

/** Whether r rejects `H_0`: on `H_1`'s side of zero and beyond the critical value. */
function rhoRejects(rh: number, tail: Tail, c: number): boolean {
  if (tail === 'up') return rh > c;
  if (tail === 'down') return rh < -c;
  return Math.abs(rh) > c;
}

/** The critical region for r, with the value to four places. */
function rhoRegionTex(tail: Tail, c: number): string {
  if (tail === 'up') return `r > ${R4(c)}`;
  if (tail === 'down') return `r < ${R4(-c)}`;
  return `|r| > ${R4(c)}`;
}

/**
 * r in ten-thousandths, on the side of `c` that `reject` asks for, never
 * within `gap` of it and never as far out as one.
 */
function drawR(rng: Rng, c: number, reject: boolean, gap: number): number {
  return reject ? rng.int(Math.min(c + gap, 9800), Math.min(c + 3000, 9899)) : rng.int(Math.max(300, c - 3000), c - gap);
}

interface CorrScene {
  ctx: number;
  n: number;
  tail: Tail;
  /** The stated level, in %. A two-tailed test reads the column at half of it. */
  level: number;
  /** r in ten-thousandths, signed. */
  rh: number;
  /** Where the quoted excerpt of the table starts: first n, first column. */
  lo: number;
  at: number;
  /** Difficulty 2: the suspicion in words, and more of the table to read. */
  hard: boolean;
}

interface SceneOptions {
  tails?: Tail[];
  /** The chance r points the wrong way for a one-tailed test. */
  wrongSign?: number;
  nMin?: number;
  nMax?: number;
}

/** A test whose decision is about even: half the draws reject. */
function sampleScene(rng: Rng, difficulty: number, { tails = TAILS, wrongSign = 0, nMin = 5, nMax = 30 }: SceneOptions = {}): CorrScene {
  const hard = difficulty > 1;
  const tail = rng.pick(tails);
  const level = tail === 'two' ? rng.pick(TWO_LEVELS) : rng.pick(PMCC_LEVELS);
  const n = rng.int(nMin, nMax);
  const c = cv(n, columnOf(level, tail));
  const size = drawR(rng, c, rng.chance(0.5), hard ? 5 : 40);
  const sign = tail === 'down' ? -1 : tail === 'up' ? 1 : rng.chance(0.5) ? 1 : -1;
  const flipped = tail !== 'two' && rng.chance(wrongSign) ? -sign : sign;
  return { ctx: pickCorr(rng), n, tail, level, rh: flipped * size, lo: n - rng.int(0, 2), at: rng.int(0, 2), hard };
}

/** The excerpt a scene quotes: its row among neighbours, its column among neighbours. */
function sceneExcerpt({ n, tail, level, lo, at, hard }: CorrScene): Block {
  const col = columnOf(level, tail);
  if (!hard) return pmccExcerpt([n], [col]);
  // lo is within two below n and at within two, so both windows hold the scene's own cell.
  return pmccExcerpt(windowOf(lo, 3, PMCC_MIN_N, PMCC_MAX_N), levelsFrom(PMCC_LEVELS.indexOf(col) - at, 3));
}

const sceneC = (sc: CorrScene): number => cv(sc.n, columnOf(sc.level, sc.tail));

/** The sentence setting the test up: in words at difficulty 2, stated outright otherwise. */
function sceneSetup(sc: CorrScene): string {
  const c = CORR_CONTEXTS[sc.ctx];
  return sc.hard
    ? `${corrSuspicion(c, sc.tail, false)} ${corrSample(c, sc.n, sc.rh)} The test is at the ${fmt(sc.level)}% level.`
    : `${corrTest(sc.tail, sc.level, sc.n)} The sample gives $r = ${R4(sc.rh)}$.`;
}

/** The worked decision for a scene, step by step. */
function sceneSolution(sc: CorrScene): SolutionStep[] {
  const c = sceneC(sc);
  const col = columnOf(sc.level, sc.tail);
  const reject = rhoRejects(sc.rh, sc.tail, c);
  const steps: SolutionStep[] = [{ tex: aligned([`H_0&: \\rho = 0`, `H_1&: \\rho ${OP[sc.tail]} 0`]) }];
  steps.push({
    text:
      sc.tail === 'two'
        ? `Two tails, so read the ${fmt(col)}% column, half of ${fmt(sc.level)}%. At $n = ${sc.n}$ it gives $${R4(c)}$.`
        : `One tail, so read the ${fmt(col)}% column. At $n = ${sc.n}$ it gives $${R4(c)}$.`,
  });
  steps.push({ tex: `\\text{critical region: } ${rhoRegionTex(sc.tail, c)}` });
  const wrongWay = sc.tail !== 'two' && Math.sign(sc.rh) !== (sc.tail === 'up' ? 1 : -1);
  steps.push({
    text: wrongWay
      ? `$r = ${R4(sc.rh)}$ points the other way from $H_1$, so it can never be evidence for it.`
      : `$r = ${R4(sc.rh)}$ is ${reject ? '' : 'not '}in the critical region.`,
  });
  steps.push({ text: verdict(corrWords(CORR_CONTEXTS[sc.ctx], sc.tail), sc.level, reject) });
  return steps;
}

/* ---------------- Level 4, lesson 1: hypotheses about rho ---------------- */

interface RhoClaimParams {
  ctx: number;
  tail: Tail;
  n: number;
  rh: number;
  /** Difficulty 2 words the suspicion in context and first asks what goes in H_0. */
  hard: boolean;
}

/** A sample r of either sign: the direction of H_1 never comes from it. */
function sampleClaim(rng: Rng, difficulty: number): RhoClaimParams {
  return {
    ctx: pickCorr(rng),
    tail: rng.pick(TAILS),
    n: rng.int(6, 30),
    rh: (rng.chance(0.5) ? 1 : -1) * rng.int(500, 9500),
    hard: difficulty > 1,
  };
}

function claimSolution({ ctx, tail, n, rh }: RhoClaimParams): SolutionStep[] {
  const c = CORR_CONTEXTS[ctx];
  return [
    { text: `$H_0$ is always no correlation in the population, $\\rho = 0$. The sample's $r = ${R4(rh)}$, from ${n} ${c.items}, is the evidence and never goes in a hypothesis.` },
    {
      text:
        tail === 'two'
          ? 'The suspicion names no direction, so the test is two-tailed.'
          : `The suspicion is of ${SIGN_WORD[tail]}correlation: as ${c.x} goes up, ${c.y} ${tail === 'up' ? 'goes up' : 'goes down'}. One-tailed.`,
    },
    { tex: aligned([`H_0&: \\rho = 0`, `H_1&: \\rho ${OP[tail]} 0`]) },
  ];
}

/**
 * From a suspicion to `H_1`, one decision at a time. At difficulty 2 the
 * suspicion is in the scenario's words and the first fork is what `H_0` says.
 */
const rhoFlow: Generator<RhoClaimParams> = {
  id: 'hyp-rho-flow',
  sample: sampleClaim,
  render: ({ ctx, tail, n, rh, hard }): Slide => {
    const c = CORR_CONTEXTS[ctx];
    const key = `rho|${ctx}|${tail}|${n}|${rh}`;
    const steps = [
      {
        id: 'dir',
        ask: 'Does the suspicion say which way the correlation goes?',
        branches: spun(
          [
            { label: 'Yes', to: 'way' },
            { label: 'No', outcome: 'Two-tailed, $H_1: \\rho \\ne 0$: correlation either way counts against $H_0$.' },
          ],
          key,
        ),
      },
      {
        id: 'way',
        ask: 'Which way does it say?',
        branches: spun(
          [
            { label: 'Positive', outcome: 'One-tailed, $H_1: \\rho > 0$: only a large positive $r$ counts as evidence.' },
            { label: 'Negative', outcome: 'One-tailed, $H_1: \\rho < 0$: only a large negative $r$ counts as evidence.' },
          ],
          `${key}|way`,
        ),
      },
    ];
    const nullLabel = '$\\rho = 0$, no correlation';
    if (hard) {
      steps.unshift({
        id: 'null',
        ask: 'What does the null hypothesis, $H_0$, say?',
        branches: spun(
          [
            { label: nullLabel, to: 'dir' },
            {
              label: `$\\rho = ${R4(rh)}$, the sample's value`,
              outcome: '$H_0$ is always $\\rho = 0$, no correlation in the population. The sample\'s $r$ is the evidence, never a hypothesis.',
            },
          ],
          `${key}|null`,
        ),
      });
    }
    const rest = tail === 'two' ? ['No'] : ['Yes', tail === 'up' ? 'Positive' : 'Negative'];
    return {
      kind: 'flow',
      prompt: [
        say(`${corrSuspicion(c, tail, hard)} ${corrSample(c, n, rh)}`),
        say('Work through the questions to reach the alternative hypothesis, $H_1$.'),
      ],
      subject: hard ? `r = ${R4(rh)}` : 'H_0: \\rho = 0',
      steps,
      answer: hard ? [nullLabel, ...rest] : rest,
    };
  },
  solution: claimSolution,
};

/**
 * Both hypotheses as tiles. The bank offers the sample's own r beside the
 * zero, since that is the number a learner reaches for by mistake.
 */
const rhoTiles: Generator<RhoClaimParams> = {
  id: 'hyp-rho-tiles',
  sample: sampleClaim,
  render: ({ ctx, tail, n, rh, hard }): Slide => {
    const c = CORR_CONTEXTS[ctx];
    const answer = ['0', OP[tail], '0'];
    const others = TAILS.filter((t) => t !== tail).map((t) => OP[t]);
    return {
      kind: 'tiles',
      prompt: [say(`${corrSuspicion(c, tail, hard)} ${corrSample(c, n, rh)}`), say('Complete the hypotheses for a test of the suspicion.')],
      template: 'H_0: \\rho = {0}, \\quad H_1: \\rho {1} {2}',
      bank: tokenBank(answer, [...others, R4(rh), R4(-rh), '1'], hard ? 4 : 3),
      answer,
    };
  },
  solution: claimSolution,
};

/**
 * The pair of hypotheses from four: the sample's letter r in place of rho,
 * the sample's value in place of zero, and the wrong direction.
 */
const rhoChoice: Generator<RhoClaimParams> = {
  id: 'hyp-rho-choice',
  sample: (rng, difficulty) => {
    const claim = sampleClaim(rng, difficulty);
    // At difficulty 2 a one-tailed suspicion meets a sample leaning the other way.
    if (claim.hard && claim.tail !== 'two') return { ...claim, rh: (claim.tail === 'up' ? -1 : 1) * Math.abs(claim.rh) };
    return claim;
  },
  render: ({ ctx, tail, n, rh, hard }): Slide => {
    const c = CORR_CONTEXTS[ctx];
    const bySample: Tail = rh > 0 ? 'up' : 'down';
    const wrong: Tail = tail === 'two' ? bySample : tail === 'up' ? 'down' : 'up';
    return choiceSlide(
      [say(`${corrSuspicion(c, tail, hard)} ${corrSample(c, n, rh)}`), say('Which hypotheses test the suspicion?')],
      options(
        { tex: rhoHyps(tail) },
        { tex: `H_0: r = 0, \\; H_1: r ${OP[tail]} 0` },
        { tex: rhoHyps(wrong) },
        { tex: `H_0: \\rho = ${R4(rh)}, \\; H_1: \\rho ${OP[tail]} ${R4(rh)}` },
      ),
    );
  },
  solution: claimSolution,
};

interface H1TableParams {
  ctxs: number[];
  tails: Tail[];
  hard: boolean;
}

const STUDIES = ['A', 'B', 'C', 'D'];

/** `H_1` for three or four studies at once, each from its own suspicion. */
const rhoH1Table: Generator<H1TableParams> = {
  id: 'hyp-rho-h1-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const size = hard ? 4 : 3;
    for (;;) {
      const tails = Array.from({ length: size }, () => rng.pick(TAILS));
      if (new Set(tails).size < 2) continue;
      return { ctxs: rng.sample(range(0, CORR_CONTEXTS.length - 1), size), tails, hard };
    }
  },
  render: ({ ctxs, tails, hard }): Slide => {
    const answer = tails.map((t) => `\\rho ${OP[t]} 0`);
    return {
      kind: 'table',
      prompt: [
        say('Each study tests $H_0: \\rho = 0$.'),
        ...ctxs.map((ctx, i) => say(`**${STUDIES[i]}.** ${corrSuspicion(CORR_CONTEXTS[ctx], tails[i], hard)}`)),
        say('Fill in $H_1$ for each.'),
      ],
      columns: ['\\text{study}', 'H_1'],
      rows: ctxs.map((_, i) => [`\\text{${STUDIES[i]}}`, null]),
      bank: tokenBank(answer, ['\\rho > 0', '\\rho < 0', '\\rho \\ne 0', 'r > 0', 'r < 0', 'r \\ne 0'], 3),
      answer,
    };
  },
  solution: ({ ctxs, tails }) => [
    { text: 'A direction in the suspicion gives one tail; none gives two. $H_1$ is always about $\\rho$, the population.' },
    ...ctxs.map((ctx, i) => ({
      text: `${STUDIES[i]}: ${tails[i] === 'two' ? 'a link with no direction' : `${SIGN_WORD[tails[i]]}correlation`} between ${CORR_CONTEXTS[ctx].x} and ${CORR_CONTEXTS[ctx].y}, so $H_1: \\rho ${OP[tails[i]]} 0$.`,
    })),
  ],
};

/* ---------------- Level 4, lesson 2: the critical value ---------------- */

interface LookupParams {
  ctx: number;
  n: number;
  level: number;
  lo: number;
  at: number;
  /** Difficulty 2 reads a bigger excerpt, with n from a description of the data. */
  hard: boolean;
}

function sampleLookup(rng: Rng, difficulty: number): LookupParams {
  const hard = difficulty > 1;
  const n = rng.int(5, 30);
  return { ctx: pickCorr(rng), n, level: rng.pick(PMCC_LEVELS), lo: n - rng.int(0, hard ? 3 : 2), at: rng.int(0, 2), hard };
}

/** The excerpt a lookup quotes: three columns, and three rows or four. */
function lookupExcerpt({ level, lo, at, hard }: LookupParams): Block {
  const ns = windowOf(lo, hard ? 4 : 3, PMCC_MIN_N, PMCC_MAX_N);
  const col = PMCC_LEVELS.indexOf(level);
  // lo is within the window's length below n, so the window holds n's row.
  return pmccExcerpt(ns, levelsFrom(col - at, 3));
}

/** One table entry, typed: the row for n and the column for the level. */
const pmccLookup: Generator<LookupParams> = {
  id: 'hyp-pmcc-lookup',
  sample: sampleLookup,
  render: (params): Slide => {
    const { ctx, n, level, hard } = params;
    const c = CORR_CONTEXTS[ctx];
    return {
      kind: 'expression',
      prompt: [
        PMCC_INTRO,
        lookupExcerpt(params),
        say(
          hard
            ? `${c.who} records ${c.x} and ${c.y} for ${n} ${c.items}, to test for positive correlation at the ${fmt(level)}% level. Find the critical value.`
            : `Find the critical value for a one-tailed test at the ${fmt(level)}% level with a sample of ${n}.`,
        ),
      ],
      lead: '\\text{critical value} =',
      keypad: [],
      answer: typed(cv(n, level)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ ctx, n, level, hard }) => [
    ...(hard ? [{ text: `Each of the ${n} ${CORR_CONTEXTS[ctx].items} gives one pair, so $n = ${n}$.` }] : []),
    { text: `Row $n = ${n}$, column ${fmt(level)}%: the critical value is $${R4(cv(n, level))}$.` },
  ],
};

interface PmccTableParams {
  cells: [number, number][];
  lo: number;
  /** The first of the three columns quoted. */
  at: number;
  hard: boolean;
}

/** Several table entries at once, with the cells beside each in the bank. */
const pmccTable: Generator<PmccTableParams> = {
  id: 'hyp-pmcc-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const rows = hard ? 4 : 3;
    const lo = rng.int(PMCC_MIN_N, PMCC_MAX_N - 3);
    const at = rng.int(0, 2);
    const all = range(lo, lo + 3).flatMap((n) => levelsFrom(at, 3).map((l): [number, number] => [n, l]));
    return { cells: rng.sample(all, rows), lo, at, hard };
  },
  render: ({ cells, lo, at, hard }): Slide => {
    const answer = cells.map(([n, l]) => R4(cv(n, l)));
    const slips = cells.flatMap(([n, l]) => {
      const col = PMCC_LEVELS.indexOf(l);
      return [
        col > 0 ? R4(cv(n, PMCC_LEVELS[col - 1])) : undefined,
        col < PMCC_LEVELS.length - 1 ? R4(cv(n, PMCC_LEVELS[col + 1])) : undefined,
        n > PMCC_MIN_N ? R4(cv(n - 1, l)) : undefined,
        n < PMCC_MAX_N ? R4(cv(n + 1, l)) : undefined,
      ];
    });
    return {
      kind: 'table',
      prompt: [
        PMCC_INTRO,
        pmccExcerpt(range(lo, lo + 3), levelsFrom(at, 3)),
        say(hard ? 'Fill in the critical value for each one-tailed test.' : 'Fill in the critical value for each one-tailed test, from its row and column.'),
      ],
      columns: ['n', '\\text{level}', '\\text{value}'],
      rows: cells.map(([n, l]) => [`${n}`, `${fmt(l)}\\%`, null]),
      bank: decimalBank(answer, spun(slips, answer.join('|')), hard ? 4 : 3),
      answer,
    };
  },
  solution: ({ cells }) => [
    { text: 'The row is the sample size and the column the level.' },
    { tex: aligned(cells.map(([n, l]) => `n = ${n}, \\; ${fmt(l)}\\% &: \\quad ${R4(cv(n, l))}`)) },
  ],
};

interface TrendParams {
  n1: number;
  l1: number;
  n2: number;
  l2: number;
  /** Table values on the wrong side of the quoted one, in ten-thousandths. */
  slips: number[];
}

/**
 * One critical value quoted, and four candidates for another: only one lies
 * on the side the trend allows. Difficulty 1 changes n alone; difficulty 2
 * changes n and the level together, pulling the same way.
 */
const pmccTrendChoice: Generator<TrendParams> = {
  id: 'hyp-pmcc-trend-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const n1 = rng.int(6, 28);
      const i1 = rng.int(0, PMCC_LEVELS.length - 1);
      const bigger = rng.chance(0.5);
      const n2 = bigger ? n1 + rng.int(1, 6) : n1 - rng.int(1, 6);
      if (n2 < PMCC_MIN_N || n2 > PMCC_MAX_N) continue;
      // A larger sample falls; a looser level (earlier column) falls with it.
      const i2 = difficulty > 1 ? (bigger ? i1 - rng.int(1, 2) : i1 + rng.int(1, 2)) : i1;
      if (i2 < 0 || i2 >= PMCC_LEVELS.length) continue;
      const l1 = PMCC_LEVELS[i1];
      const l2 = PMCC_LEVELS[i2];
      const given = cv(n1, l1);
      const target = cv(n2, l2);
      const wrongSide = PMCC_TABLE.flat().filter((v) => (bigger ? v > given : v < given) && v !== target);
      const pool = [...new Set(wrongSide)].sort((a, b) => Math.abs(a - given) - Math.abs(b - given)).slice(0, 8);
      if (pool.length < 3) continue;
      return { n1, l1, n2, l2, slips: rng.sample(pool, 3) };
    }
  },
  render: ({ n1, l1, n2, l2, slips }): Slide =>
    choiceSlide(
      [
        PMCC_INTRO,
        pmccExcerpt([n1], [l1]),
        say(`Without the rest of the table: only one of these could be the critical value for $n = ${n2}$ at the ${fmt(l2)}% level. Which?`),
      ],
      options({ tex: R4(cv(n2, l2)) }, ...slips.map((v) => ({ tex: R4(v) }))),
    ),
  solution: ({ n1, l1, n2, l2 }) => {
    const falls = cv(n2, l2) < cv(n1, l1);
    const why = [
      n2 > n1 ? 'a larger sample needs a weaker $r$ to be convincing' : 'a smaller sample needs a stronger $r$ to be convincing',
      ...(l2 !== l1 ? [l2 > l1 ? 'a looser level needs less evidence' : 'a stricter level needs more evidence'] : []),
    ];
    return [
      { text: `From $n = ${n1}$ to $n = ${n2}$${l2 !== l1 ? `, and from ${fmt(l1)}% to ${fmt(l2)}%` : ''}: ${why.join(', and ')}.` },
      { text: `So the critical value must be ${falls ? 'below' : 'above'} $${R4(cv(n1, l1))}$. Only $${R4(cv(n2, l2))}$ is.` },
    ];
  },
};

/**
 * From the data to the table cell: n counts pairs, never values, and a
 * one-tailed test reads the level's own column, never half of it.
 */
const pmccFlow: Generator<LookupParams> = {
  id: 'hyp-pmcc-flow',
  sample: sampleLookup,
  render: (params): Slide => {
    const { ctx, n, level, hard } = params;
    const c = CORR_CONTEXTS[ctx];
    const key = `pmcc|${ctx}|${n}|${level}|${hard}`;
    const value = cv(n, level);
    const rowBranches = [
      { label: `$${n}$, one per pair`, to: 'col' },
      { label: `$${2 * n}$, one per value`, outcome: `Each of the ${n} ${c.items} gives one pair, and the table's $n$ counts pairs.` },
    ];
    if (hard) rowBranches.push({ label: `$${n - 1}$, one fewer`, outcome: `The table is read at the sample size itself, $n = ${n}$, with nothing taken off.` });
    return {
      kind: 'flow',
      prompt: [
        PMCC_INTRO,
        lookupExcerpt(params),
        say(`${c.who} records ${c.x} and ${c.y} for each of ${n} ${c.items}, to test $H_0: \\rho = 0$ against $H_1: \\rho > 0$ at the ${fmt(level)}% level.`),
      ],
      subject: 'H_1: \\rho > 0',
      steps: [
        { id: 'row', ask: 'Which row of the table, $n$?', branches: spun(rowBranches, key) },
        {
          id: 'col',
          ask: 'Which column?',
          branches: spun(
            [
              { label: `${fmt(level)}%`, outcome: `The critical value is $${R4(value)}$: reject $H_0$ if $r > ${R4(value)}$.` },
              { label: `${fmt(level / 2)}%`, outcome: 'Halving the level is for a two-tailed test. This one names a direction, so all of the level is in one tail.' },
            ],
            `${key}|col`,
          ),
        },
      ],
      answer: [`$${n}$, one per pair`, `${fmt(level)}%`],
    };
  },
  solution: ({ ctx, n, level }) => [
    { text: `Each of the ${n} ${CORR_CONTEXTS[ctx].items} gives one pair of values, so $n = ${n}$.` },
    { text: `$H_1: \\rho > 0$ is one-tailed, so the ${fmt(level)}% column: the critical value is $${R4(cv(n, level))}$.` },
  ],
};

/* ---------------- Level 4, lesson 3: one-tailed tests ---------------- */

/**
 * The decision, one question at a time: does r point the way `H_1` does,
 * and is it beyond the critical value. The end is the conclusion in context.
 */
const rhoDecisionFlow: Generator<CorrScene> = {
  id: 'hyp-rho-decision-flow',
  sample: (rng, difficulty) => sampleScene(rng, difficulty, { tails: ONE_TAILS, wrongSign: 0.25 }),
  render: (sc): Slide => {
    const ctxt = CORR_CONTEXTS[sc.ctx];
    const c = sceneC(sc);
    const words = corrWords(ctxt, sc.tail);
    const key = `rdf|${sc.ctx}|${sc.n}|${sc.level}|${sc.rh}|${sc.tail}`;
    const rightWay = Math.sign(sc.rh) === (sc.tail === 'up' ? 1 : -1);
    const reject = rhoRejects(sc.rh, sc.tail, c);
    return {
      kind: 'flow',
      prompt: [PMCC_INTRO, sceneExcerpt(sc), say(sceneSetup(sc)), say('Work through the test to its conclusion.')],
      subject: `r = ${R4(sc.rh)}, \\; ${rhoH1(sc.tail)}`,
      steps: [
        {
          id: 'sign',
          ask: `Does $r$ have the sign $H_1$ looks for?`,
          branches: spun(
            [
              { label: 'Yes', to: 'size' },
              { label: 'No', outcome: `${verdict(words, sc.level, false)} An $r$ of the wrong sign is never evidence for $H_1$, however large.` },
            ],
            key,
          ),
        },
        {
          id: 'size',
          ask: 'Is $r$ beyond the critical value, on the side $H_1$ points to?',
          branches: spun(
            [
              { label: 'Yes', outcome: verdict(words, sc.level, true) },
              { label: 'No', outcome: verdict(words, sc.level, false) },
            ],
            `${key}|size`,
          ),
        },
      ],
      answer: rightWay ? ['Yes', reject ? 'Yes' : 'No'] : ['No'],
    };
  },
  solution: sceneSolution,
};

interface RegionSceneParams extends CorrScene {
  /** The value a two-tailed slip reads: the column at half the level, or the next one along. */
  slip: number;
}

function sampleRegionScene(rng: Rng, difficulty: number): RegionSceneParams {
  const sc = sampleScene(rng, difficulty, { tails: ONE_TAILS });
  const col = PMCC_LEVELS.indexOf(sc.level);
  const other = col < PMCC_LEVELS.length - 1 ? PMCC_LEVELS[col + 1] : PMCC_LEVELS[col - 1];
  return { ...sc, slip: cv(sc.n, other) };
}

/** The excerpt for a region question, holding the slip's cell as well as the answer's. */
function regionExcerpt(sc: RegionSceneParams): Block {
  const col = PMCC_LEVELS.indexOf(sc.level);
  const levels = col < PMCC_LEVELS.length - 1 ? [PMCC_LEVELS[col], PMCC_LEVELS[col + 1]] : [PMCC_LEVELS[col - 1], PMCC_LEVELS[col]];
  const cols = sc.hard ? levelsFrom(Math.min(col, 2), 3) : levels;
  return pmccExcerpt(sc.hard ? windowOf(sc.lo, 3, PMCC_MIN_N, PMCC_MAX_N) : [sc.n], cols);
}

function regionSetup(sc: RegionSceneParams): string {
  const c = CORR_CONTEXTS[sc.ctx];
  return sc.hard
    ? `${corrSuspicion(c, sc.tail, true)} They will test it at the ${fmt(sc.level)}% level with a random sample of ${sc.n} ${c.items}.`
    : corrTest(sc.tail, sc.level, sc.n);
}

function rhoRegionSolution(sc: RegionSceneParams): SolutionStep[] {
  const c = sceneC(sc);
  return [
    { text: `$H_1: \\rho ${OP[sc.tail]} 0$ names a direction, so the whole ${fmt(sc.level)}% sits in the ${sc.tail === 'up' ? 'upper' : 'lower'} tail.` },
    { text: `Row $n = ${sc.n}$, column ${fmt(sc.level)}%: $${R4(c)}$.` },
    { tex: `\\text{critical region: } ${rhoRegionTex(sc.tail, c)}` },
  ];
}

/** The critical region for r from four: wrong way, two-tailed, and the wrong column. */
const rhoRegionChoice: Generator<RegionSceneParams> = {
  id: 'hyp-rho-region-choice',
  sample: sampleRegionScene,
  render: (sc): Slide => {
    const c = sceneC(sc);
    const flip: Tail = sc.tail === 'up' ? 'down' : 'up';
    return choiceSlide(
      [PMCC_INTRO, regionExcerpt(sc), say(regionSetup(sc)), say('Which is the critical region?')],
      options(
        { tex: rhoRegionTex(sc.tail, c) },
        { tex: rhoRegionTex(flip, c) },
        { tex: rhoRegionTex('two', c) },
        { tex: rhoRegionTex(sc.tail, sc.slip) },
      ),
    );
  },
  solution: rhoRegionSolution,
};

/** The critical region as tiles: the inequality's direction and the signed value. */
const rhoRegionTiles: Generator<RegionSceneParams> = {
  id: 'hyp-rho-region-tiles',
  sample: sampleRegionScene,
  render: (sc): Slide => {
    const c = sceneC(sc);
    const up = sc.tail === 'up';
    const answer = [up ? '>' : '<', R4(up ? c : -c)];
    return {
      kind: 'tiles',
      prompt: [PMCC_INTRO, regionExcerpt(sc), say(regionSetup(sc)), say('Complete the critical region.')],
      template: 'r {0} {1}',
      bank: tokenBank(answer, [up ? '<' : '>', R4(up ? -c : c), R4(up ? sc.slip : -sc.slip), R4(up ? -sc.slip : sc.slip)], sc.hard ? 4 : 3),
      answer,
    };
  },
  solution: rhoRegionSolution,
};

/** The density of r when rho = 0, for a sample of n: proportional to (1 - r^2)^((n - 4)/2). */
function rDensity(n: number): (r: number) => number {
  const shape = (r: number) => (Math.abs(r) >= 1 ? 0 : (1 - r * r) ** ((n - 4) / 2));
  let area = 0;
  const steps = 400;
  for (let i = 0; i < steps; i += 1) area += shape(-1 + ((i + 0.5) * 2) / steps) * (2 / steps);
  return (r: number) => shape(r) / area;
}

/** How r falls for a sample of n if there is no correlation, with a tail or two shaded when asked. */
function rCurveSvg(n: number, label: string, shadeFrom?: { edge: number; tail: OneTail }): string {
  const f = rDensity(n);
  return plotSvg({
    xMin: -1,
    xMax: 1,
    yMin: 0,
    yMax: f(0) * 1.15,
    curves: [{ f }],
    verticals: [{ x: 0, dashed: true }],
    shade: shadeFrom ? (shadeFrom.tail === 'up' ? { f, from: shadeFrom.edge, to: 1 } : { f, from: -1, to: shadeFrom.edge }) : undefined,
    label,
  });
}

/**
 * Slide a line to the edge of the critical region, over the curve r follows
 * if there is no correlation. The slider moves in hundredths, so the target
 * is the critical value to two places.
 */
const rhoCriticalSlider: Generator<RegionSceneParams> = {
  id: 'hyp-rho-critical-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const sc = sampleRegionScene(rng, difficulty);
      // Difficulty 1 is the upper tail only; a sample of 5 barely has a curve;
      // and a value ending in 50 would be a coin toss to the nearest hundredth.
      if ((difficulty < 2 && sc.tail !== 'up') || sc.n < 6 || sceneC(sc) % 100 === 50) continue;
      return sc;
    }
  },
  render: (sc): Slide => {
    const c = sceneC(sc);
    const signed = sc.tail === 'up' ? c : -c;
    return {
      kind: 'slider',
      prompt: [
        PMCC_INTRO,
        regionExcerpt(sc),
        say(regionSetup(sc)),
        say(`The curve shows how $r$ from ${sc.n} pairs falls if $\\rho = 0$. Slide the line to the edge of the critical region, as near as the slider allows.`),
      ],
      min: -1,
      max: 1,
      step: 0.01,
      answer: Number((Math.round(signed / 100) / 100).toFixed(2)),
      readout: 'r = {v}',
      figure: {
        svg: rCurveSvg(sc.n, `How r from a sample of ${sc.n} is spread if there is no correlation`),
        ...markerWindow(-1, 1),
      },
    };
  },
  solution: (sc) => [
    ...rhoRegionSolution(sc),
    { text: `To the nearest hundredth the edge is at $${fmt(Math.round((sc.tail === 'up' ? sceneC(sc) : -sceneC(sc)) / 100) / 100)}$.` },
  ],
};

/* ---------------- Level 4, lesson 4: two-tailed tests ---------------- */

/**
 * A two-tailed decision: the column at half the level, then |r| against it.
 * Difficulty 2 has a negative r half the time and more of the table.
 */
const rhoTwoFlow: Generator<CorrScene> = {
  id: 'hyp-rho-two-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const sc = sampleScene(rng, difficulty, { tails: ['two'] });
      if (difficulty < 2 && sc.rh < 0) continue;
      return sc;
    }
  },
  render: (sc): Slide => {
    const ctxt = CORR_CONTEXTS[sc.ctx];
    const c = sceneC(sc);
    const words = corrWords(ctxt, 'two');
    const key = `r2f|${sc.ctx}|${sc.n}|${sc.level}|${sc.rh}`;
    const half = sc.level / 2;
    return {
      kind: 'flow',
      prompt: [PMCC_INTRO, pmccExcerpt(sc.hard ? windowOf(sc.lo, 3, PMCC_MIN_N, PMCC_MAX_N) : [sc.n], twoColumns(sc.level)), say(sceneSetup(sc))],
      subject: `r = ${R4(sc.rh)}, \\; H_1: \\rho \\ne 0`,
      steps: [
        {
          id: 'col',
          ask: 'Which column of the table?',
          branches: spun(
            [
              { label: `${fmt(half)}%`, to: 'size' },
              {
                label: `${fmt(sc.level)}%`,
                outcome: `The columns are one-tailed levels. Two tails share the ${fmt(sc.level)}%, so each holds ${fmt(half)}%: read the ${fmt(half)}% column.`,
              },
            ],
            key,
          ),
        },
        {
          id: 'size',
          ask: `Is $|r|$ larger than $${R4(c)}$?`,
          branches: spun(
            [
              { label: 'Yes', outcome: verdict(words, sc.level, true) },
              { label: 'No', outcome: verdict(words, sc.level, false) },
            ],
            `${key}|size`,
          ),
        },
      ],
      answer: [`${fmt(half)}%`, rhoRejects(sc.rh, 'two', c) ? 'Yes' : 'No'],
    };
  },
  solution: sceneSolution,
};

/** The columns quoted for a two-tailed test at `level`: its half, and the level itself when the table has it. */
function twoColumns(level: number): number[] {
  return PMCC_LEVELS.filter((l) => l === level / 2 || l === level);
}

interface RhoTwoTilesParams extends CorrScene {
  /** The column a slip reads: the whole level, or the next stricter one when the table has no such column. */
  slipLevel: number;
}

/** A two-tailed critical region as two tiles: `r < -c` or `r > c`, c from the halved column. */
const rhoTwoTiles: Generator<RhoTwoTilesParams> = {
  id: 'hyp-rho-two-tiles',
  sample: (rng, difficulty) => {
    const sc = sampleScene(rng, difficulty, { tails: ['two'] });
    return { ...sc, slipLevel: PMCC_LEVELS.includes(sc.level) ? sc.level : sc.level / 4 };
  },
  render: (sc): Slide => {
    const c = sceneC(sc);
    const answer = [R4(-c), R4(c)];
    const ctxt = CORR_CONTEXTS[sc.ctx];
    const slip = cv(sc.n, sc.slipLevel);
    const beside = cv(sc.n < PMCC_MAX_N ? sc.n + 1 : sc.n - 1, sc.level / 2);
    const ns = sc.hard ? windowOf(sc.lo, 3, PMCC_MIN_N, PMCC_MAX_N) : [sc.n];
    return {
      kind: 'tiles',
      prompt: [
        PMCC_INTRO,
        pmccExcerpt(ns, sc.hard ? levelsFrom(Math.min(PMCC_LEVELS.indexOf(sc.level / 2), PMCC_LEVELS.indexOf(sc.slipLevel)) - (sc.at % 2), 3) : PMCC_LEVELS.filter((l) => l === sc.level / 2 || l === sc.slipLevel)),
        say(
          sc.hard
            ? `${corrSuspicion(ctxt, 'two', true)} They will test it at the ${fmt(sc.level)}% level with a random sample of ${sc.n} ${ctxt.items}.`
            : corrTest('two', sc.level, sc.n),
        ),
        say('Complete the critical region.'),
      ],
      template: 'r < {0} \\; \\text{or} \\; r > {1}',
      bank: tokenBank(answer, [R4(-slip), R4(slip), R4(-beside), R4(beside)], sc.hard ? 4 : 2),
      answer,
    };
  },
  solution: (sc) => {
    const c = sceneC(sc);
    return [
      { text: `$H_1: \\rho \\ne 0$ has two tails, ${fmt(sc.level / 2)}% in each, so read the ${fmt(sc.level / 2)}% column at $n = ${sc.n}$: $${R4(c)}$.` },
      { text: 'The critical region is both ends:' },
      { tex: `r < ${R4(-c)} \\; \\text{or} \\; r > ${R4(c)}` },
    ];
  },
};

/**
 * Which column to read, typed as its level: the level itself for one tail,
 * half of it for two. Difficulty 2 gives the suspicion in words, so the
 * number of tails has to be found first.
 */
const rhoColumn: Generator<CorrScene> = {
  id: 'hyp-rho-column',
  sample: (rng, difficulty) => sampleScene(rng, difficulty),
  render: (sc): Slide => {
    const ctxt = CORR_CONTEXTS[sc.ctx];
    return {
      kind: 'expression',
      prompt: [
        say(
          sc.hard
            ? `${corrSuspicion(ctxt, sc.tail, true)} They will test it at the ${fmt(sc.level)}% level with a random sample of ${sc.n} ${ctxt.items}.`
            : corrTest(sc.tail, sc.level, sc.n),
        ),
        say('The table of critical values has columns for the one-tailed levels 10%, 5%, 2.5%, 1% and 0.5%. Which column does this test read? Give its level, in %.'),
      ],
      lead: '\\text{column} =',
      keypad: [],
      answer: fmt(columnOf(sc.level, sc.tail)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (sc) => [
    {
      text:
        sc.tail === 'two'
          ? `$H_1: \\rho \\ne 0$ is two-tailed: the ${fmt(sc.level)}% is split, ${fmt(sc.level / 2)}% in each tail.`
          : `$H_1: \\rho ${OP[sc.tail]} 0$ is one-tailed: all ${fmt(sc.level)}% is in one tail.`,
    },
    { text: `So read the ${fmt(columnOf(sc.level, sc.tail))}% column.` },
  ],
};

interface TwoTableParams {
  lo: number;
  /** The first of the three columns quoted. */
  at: number;
  rows: { n: number; tail: Tail; level: number }[];
  hard: boolean;
}

/** The critical value as the table would write it: signed for a lower tail, ± for two. */
function rhoToken(tail: Tail, c: number): string {
  if (tail === 'down') return R4(-c);
  if (tail === 'two') return `\\pm ${R4(c)}`;
  return R4(c);
}

/**
 * Critical values for several tests. Difficulty 1 is all two-tailed;
 * difficulty 2 mixes one tail and two, so each row's column is a decision.
 */
const rhoTwoTable: Generator<TwoTableParams> = {
  id: 'hyp-rho-two-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const lo = rng.int(PMCC_MIN_N, PMCC_MAX_N - 2);
    // Three columns are quoted, so every row reads one of them.
    const at = rng.int(1, 2);
    const cols = levelsFrom(at, 3);
    const twos = TWO_LEVELS.filter((l) => cols.includes(l / 2));
    for (;;) {
      const rows = Array.from({ length: hard ? 4 : 3 }, () => {
        const tail: Tail = hard ? rng.pick(TAILS) : 'two';
        return { n: rng.int(lo, lo + 2), tail, level: tail === 'two' ? rng.pick(twos) : rng.pick(cols) };
      });
      const keys = rows.map((r) => `${r.n}|${r.tail}|${r.level}`);
      if (new Set(keys).size < rows.length) continue;
      if (hard && !rows.some((r) => r.tail === 'two')) continue;
      return { lo, at, rows, hard };
    }
  },
  render: ({ lo, at, rows, hard }): Slide => {
    const answer = rows.map((r) => rhoToken(r.tail, cv(r.n, columnOf(r.level, r.tail))));
    // Each row with its ends miscounted (a lone value for two tails, both ends
    // for one), then read at the wrong column: the whole level for two tails,
    // half of it for one.
    const slips = rows.flatMap((r) => {
      const right = cv(r.n, columnOf(r.level, r.tail));
      const wrong = r.tail === 'two' ? r.level : r.level / 2;
      return [
        r.tail === 'two' ? R4(right) : `\\pm ${R4(right)}`,
        PMCC_LEVELS.includes(wrong) ? rhoToken(r.tail, cv(r.n, wrong)) : undefined,
      ];
    });
    return {
      kind: 'table',
      prompt: [PMCC_INTRO, pmccExcerpt(range(lo, lo + 2), levelsFrom(at, 3)), say('Fill in the critical value of $r$ for each test of $H_0: \\rho = 0$.')],
      columns: ['n', 'H_1', '\\text{level}', '\\text{value}'],
      rows: rows.map((r) => [`${r.n}`, `\\rho ${OP[r.tail]} 0`, `${fmt(r.level)}\\%`, null]),
      bank: tokenBank(answer, spun(slips, answer.join('|')).filter((t): t is string => t !== undefined), hard ? 4 : 3),
      answer,
    };
  },
  solution: ({ rows }) => [
    { text: 'One tail reads the level\'s own column; two tails read half the level, with $\\pm$ for both ends.' },
    // One sentence a row: three conditions and a value side by side run past a phone's width.
    ...rows.map((r) => ({
      text: `$n = ${r.n}$, $H_1: \\rho ${OP[r.tail]} 0$ at ${fmt(r.level)}%: the ${fmt(columnOf(r.level, r.tail))}% column, $${rhoToken(r.tail, cv(r.n, columnOf(r.level, r.tail)))}$.`,
    })),
  ],
};

/* ---------------- Level 4, lesson 5: sample size and level ---------------- */

interface SmallestParams {
  ctx: number;
  tail: Tail;
  level: number;
  rh: number;
  /** The smallest tabled n at which r rejects. */
  n: number;
  hard: boolean;
}

/** The smallest n in the table whose critical value r clears, for a column. */
function smallestN(size: number, col: number): number | undefined {
  for (let n = PMCC_MIN_N; n <= PMCC_MAX_N; n += 1) if (cv(n, col) < size) return n;
  return undefined;
}

/**
 * The column plotted against n with a line at |r|: slide to the smallest n
 * whose critical value falls below the line. Difficulty 2 is two-tailed or a
 * lower tail, so the column is halved or r's sign set aside first.
 */
const rhoNSlider: Generator<SmallestParams> = {
  id: 'hyp-rho-n-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const tail: Tail = hard ? rng.pick(['down', 'two'] as Tail[]) : 'up';
      const level = tail === 'two' ? rng.pick(TWO_LEVELS) : rng.pick(PMCC_LEVELS);
      const col = columnOf(level, tail);
      const size = rng.int(3200, 8200);
      const n = smallestN(size, col);
      if (n === undefined || n < 6 || n > 28) continue;
      // Clear of every value in the column, so no reading of the dots is a coin toss.
      if (range(PMCC_MIN_N, PMCC_MAX_N).some((m) => Math.abs(cv(m, col) - size) < 30)) continue;
      const sign = tail === 'down' ? -1 : tail === 'two' && rng.chance(0.5) ? -1 : 1;
      return { ctx: pickCorr(rng), tail, level, rh: sign * size, n, hard };
    }
  },
  render: ({ ctx, tail, level, rh, n }): Slide => {
    const col = columnOf(level, tail);
    const ctxt = CORR_CONTEXTS[ctx];
    const shown = windowOf(n - 2, 4, PMCC_MIN_N, PMCC_MAX_N);
    return {
      kind: 'slider',
      prompt: [
        PMCC_INTRO,
        pmccExcerpt(shown, [col]),
        say(`A study of ${ctxt.x} and ${ctxt.y} finds $r = ${R4(rh)}$. It tests $H_0: \\rho = 0$ against $${rhoH1(tail)}$ at the ${fmt(level)}% level.`),
        say(`The dots are the ${fmt(col)}% column for every $n$; the line is at $|r|$. Slide to the smallest $n$ at which this $r$ would reject $H_0$.`),
      ],
      min: PMCC_MIN_N,
      max: PMCC_MAX_N,
      step: 1,
      answer: n,
      readout: 'n = {v}',
      figure: {
        svg: plotSvg({
          xMin: PMCC_MIN_N - 1,
          xMax: PMCC_MAX_N + 1,
          yMin: 0,
          yMax: 1,
          curves: [],
          marks: range(PMCC_MIN_N, PMCC_MAX_N).map((m) => ({ x: m, y: cv(m, col) / 10000 })),
          horizontals: [Math.abs(rh) / 10000],
          label: `The critical values of r for n from 4 to 30, falling, with a line across at ${R4(Math.abs(rh))}`,
        }),
        ...markerWindow(PMCC_MIN_N - 1, PMCC_MAX_N + 1),
      },
    };
  },
  solution: ({ tail, level, rh, n }) => {
    const col = columnOf(level, tail);
    return [
      {
        text:
          tail === 'two'
            ? `Two tails: read the ${fmt(col)}% column and compare $|r| = ${R4(Math.abs(rh))}$.`
            : `One tail, and $r$ points the way $H_1$ does: read the ${fmt(col)}% column and compare $|r| = ${R4(Math.abs(rh))}$.`,
      },
      { tex: aligned([`n = ${n - 1} &: \\quad ${R4(cv(n - 1, col))} > ${R4(Math.abs(rh))}`, `n = ${n} &: \\quad ${R4(cv(n, col))} < ${R4(Math.abs(rh))}`]) },
      { text: `The critical value falls as $n$ grows, so $n = ${n}$ is the first sample size at which this $r$ rejects $H_0$.` },
    ];
  },
};

interface ShiftParams {
  ctx: number;
  rh: number;
  n1: number;
  l1: number;
  n2: number;
  l2: number;
  hard: boolean;
}

/**
 * The same r under another n or level: which way the critical value moves,
 * then whether r still clears it. Difficulty 1 moves n; difficulty 2 moves the
 * level, or both at once in opposite directions.
 */
const rhoShiftFlow: Generator<ShiftParams> = {
  id: 'hyp-rho-shift-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n1 = rng.int(6, 28);
      const i1 = rng.int(0, PMCC_LEVELS.length - 1);
      // Difficulty 2 moves the level, and n with it half the time, the same way:
      // a stricter level (a later column) with a smaller sample, both raising it.
      const up = rng.chance(0.5);
      const i2 = hard ? i1 + (up ? 1 : -1) * rng.int(1, 2) : i1;
      const n2 = hard ? (rng.chance(0.5) ? n1 : n1 + (up ? -1 : 1) * rng.int(2, 8)) : n1 + (up ? 1 : -1) * rng.int(2, 8);
      if (n2 < PMCC_MIN_N || n2 > PMCC_MAX_N || i2 < 0 || i2 >= PMCC_LEVELS.length || (n2 === n1 && i2 === i1)) continue;
      const c1 = cv(n1, PMCC_LEVELS[i1]);
      const c2 = cv(n2, PMCC_LEVELS[i2]);
      if (Math.abs(c1 - c2) < 150) continue;
      // r between the two, so the verdict flips; or beyond both, so it does not.
      const lo = Math.min(c1, c2);
      const hi = Math.max(c1, c2);
      const size = rng.chance(0.6) ? rng.int(lo + 30, hi - 30) : rng.chance(0.5) ? rng.int(hi + 30, Math.min(hi + 1500, 9800)) : rng.int(Math.max(300, lo - 1500), lo - 30);
      return { ctx: pickCorr(rng), rh: size, n1, l1: PMCC_LEVELS[i1], n2, l2: PMCC_LEVELS[i2], hard };
    }
  },
  render: ({ ctx, rh, n1, l1, n2, l2 }): Slide => {
    const ctxt = CORR_CONTEXTS[ctx];
    const c1 = cv(n1, l1);
    const c2 = cv(n2, l2);
    const words = corrWords(ctxt, 'up');
    const key = `shift|${ctx}|${rh}|${n1}|${l1}|${n2}|${l2}`;
    const change = [n2 !== n1 ? `with a sample of ${n2}` : '', l2 !== l1 ? `at the ${fmt(l2)}% level` : ''].filter(Boolean).join(' ');
    const rises = c2 > c1;
    const wrongWay = `It is ${rises ? 'larger' : 'smaller'}: $${R4(c2)}$. ${trendWhy(n1, l1, n2, l2)}`;
    const ns = [...new Set([n1, n2])].sort((a, b) => a - b);
    const levels = PMCC_LEVELS.filter((l) => l === l1 || l === l2);
    return {
      kind: 'flow',
      prompt: [
        PMCC_INTRO,
        pmccExcerpt(ns, levels),
        say(`A test for positive correlation between ${ctxt.x} and ${ctxt.y} at the ${fmt(l1)}% level, with a sample of ${n1}, found $r = ${R4(rh)}$ against a critical value of $${R4(c1)}$.`),
        say(`Suppose the same $r$ were tested ${change} instead.`),
      ],
      subject: `r = ${R4(rh)}, \\; H_1: \\rho > 0`,
      steps: [
        {
          id: 'move',
          ask: 'Is the new critical value larger or smaller?',
          branches: spun(
            [
              rises ? { label: 'Larger', to: 'clear' } : { label: 'Larger', outcome: wrongWay },
              rises ? { label: 'Smaller', outcome: wrongWay } : { label: 'Smaller', to: 'clear' },
            ],
            key,
          ),
        },
        {
          id: 'clear',
          ask: `The new critical value is $${R4(c2)}$. Is $r$ beyond it?`,
          branches: spun(
            [
              { label: 'Yes', outcome: verdict(words, l2, true) },
              { label: 'No', outcome: verdict(words, l2, false) },
            ],
            `${key}|clear`,
          ),
        },
      ],
      answer: [rises ? 'Larger' : 'Smaller', rh > c2 ? 'Yes' : 'No'],
    };
  },
  solution: ({ ctx, rh, n1, l1, n2, l2 }) => {
    const c1 = cv(n1, l1);
    const c2 = cv(n2, l2);
    return [
      { text: `${trendWhy(n1, l1, n2, l2)} The table gives $${R4(c2)}$ against $${R4(c1)}$.` },
      { text: `$r = ${R4(rh)}$ is ${rh > c2 ? 'above' : 'below'} $${R4(c2)}$. ${verdict(corrWords(CORR_CONTEXTS[ctx], 'up'), l2, rh > c2)}` },
    ];
  },
};

/** Why a critical value moved, in words. */
function trendWhy(n1: number, l1: number, n2: number, l2: number): string {
  const parts: string[] = [];
  if (n2 !== n1) parts.push(n2 > n1 ? 'a larger sample needs a weaker $r$' : 'a smaller sample needs a stronger $r$');
  if (l2 !== l1) parts.push(l2 > l1 ? 'a looser level needs less evidence' : 'a stricter level needs more evidence');
  const text = parts.join(', and ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

interface WhichParams {
  ctx: number;
  tail: Tail;
  rh: number;
  lo: number;
  /** Four settings, as n and the stated level; the first is the one that rejects. */
  settings: [number, number][];
}

/**
 * The same r at four settings of n and level: exactly one rejects. Difficulty
 * 2 is two-tailed, so every stated level is read at half.
 */
const rhoWhichRejects: Generator<WhichParams> = {
  id: 'hyp-rho-which-rejects',
  sample: (rng, difficulty) => {
    const tail: Tail = difficulty > 1 ? 'two' : 'up';
    for (;;) {
      // Three columns are quoted: for two tails, three halves of the two-tailed levels.
      const cols = levelsFrom(rng.int(tail === 'two' ? 1 : 0, 2), 3);
      const levels = tail === 'two' ? TWO_LEVELS.filter((l) => cols.includes(l / 2)) : cols;
      const lo = rng.int(PMCC_MIN_N, PMCC_MAX_N - 2);
      const all = range(lo, lo + 2).flatMap((n) => levels.map((l): [number, number] => [n, l]));
      const picked = rng.sample(all, 4);
      const values = picked.map(([n, l]) => cv(n, columnOf(l, tail)));
      const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
      const [low, next] = [values[order[0]], values[order[1]]];
      if (next - low < 80) continue;
      const size = rng.int(low + 30, next - 30);
      const sign = tail === 'two' && rng.chance(0.5) ? -1 : 1;
      const settings = [picked[order[0]], ...picked.filter((_, i) => i !== order[0])];
      return { ctx: pickCorr(rng), tail, rh: sign * size, lo, settings };
    }
  },
  render: ({ ctx, tail, rh, lo, settings }): Slide => {
    const ctxt = CORR_CONTEXTS[ctx];
    const cols = [...new Set(settings.map(([, l]) => columnOf(l, tail)))];
    const label = ([n, l]: [number, number]) => `n = ${n}, \\; ${fmt(l)}\\%`;
    return choiceSlide(
      [
        PMCC_INTRO,
        pmccExcerpt(range(lo, lo + 2), PMCC_LEVELS.filter((l) => cols.includes(l))),
        say(`A study of ${ctxt.x} and ${ctxt.y} finds $r = ${R4(rh)}$ and tests $H_0: \\rho = 0$ against $${rhoH1(tail)}$.`),
        say('At which sample size and level would this $r$ reject $H_0$?'),
      ],
      options({ tex: label(settings[0]) }, ...settings.slice(1).map((s) => ({ tex: label(s) }))),
    );
  },
  solution: ({ tail, rh, settings }) => [
    {
      text: `${tail === 'two' ? 'Two tails, so each level is read at half. ' : ''}Compare each critical value with $|r| = ${R4(Math.abs(rh))}$:`,
    },
    {
      tex: aligned(
        settings.map(([n, l]) => {
          const c = cv(n, columnOf(l, tail));
          return `n = ${n}, \\ ${fmt(l)}\\% &: \\ ${R4(c)} ${c < Math.abs(rh) ? '<' : '>'} |r|`;
        }),
      ),
    },
    { text: `Only at $n = ${settings[0][0]}$ and ${fmt(settings[0][1])}% is the critical value below $|r|$.` },
  ],
};

/**
 * The conclusion a test supports: evidence of association at a level, never
 * cause and never proof, and "not enough evidence" never "no correlation".
 */
const rhoCauseChoice: Generator<CorrScene> = {
  id: 'hyp-rho-cause-choice',
  sample: (rng, difficulty) => sampleScene(rng, difficulty, { tails: ONE_TAILS }),
  render: (sc): Slide => {
    const ctxt = CORR_CONTEXTS[sc.ctx];
    const c = sceneC(sc);
    const reject = rhoRejects(sc.rh, sc.tail, c);
    const words = corrWords(ctxt, sc.tail);
    const level = fmt(sc.level);
    const moves = sc.tail === 'up' ? 'rise' : 'fall';
    // Plain-text labels, so no $: the decision is in the words.
    const yes = `There is evidence at the ${level}% level that ${words}.`;
    const no = `There is not enough evidence at the ${level}% level that ${words}.`;
    const opts = reject
      ? options(
          { tex: yes },
          { tex: `There is evidence at the ${level}% level that raising ${ctxt.x} makes ${ctxt.y} ${moves}.` },
          { tex: `This proves that ${words}.` },
          { tex: no },
        )
      : options(
          { tex: no },
          { tex: `This shows there is no correlation between ${ctxt.x} and ${ctxt.y}.` },
          { tex: `This shows that ${ctxt.x} has no effect on ${ctxt.y}.` },
          { tex: yes },
        );
    return choiceSlide(
      [
        PMCC_INTRO,
        sceneExcerpt(sc),
        say(sceneSetup(sc)),
        say(sc.hard ? 'Which conclusion does the test support?' : `The critical region is $${rhoRegionTex(sc.tail, c)}$. Which conclusion does the test support?`),
      ],
      opts,
      false,
    );
  },
  solution: (sc) => [
    ...sceneSolution(sc),
    {
      text: 'A test of correlation shows association, not cause: something else may drive both. And it weighs evidence; it never proves, and not rejecting never shows $\\rho = 0$.',
    },
  ],
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
  rhoFlow,
  rhoTiles,
  rhoChoice,
  rhoH1Table,
  pmccLookup,
  pmccTable,
  pmccTrendChoice,
  pmccFlow,
  rhoDecisionFlow,
  rhoRegionChoice,
  rhoRegionTiles,
  rhoCriticalSlider,
  rhoTwoFlow,
  rhoTwoTiles,
  rhoColumn,
  rhoTwoTable,
  rhoNSlider,
  rhoShiftFlow,
  rhoWhichRejects,
  rhoCauseChoice,
] as Generator<never>[];
