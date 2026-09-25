/**
 * Number & Proof, level 2: Divisibility & Primes.
 *
 * Factors, multiples and primes; the HCF and LCM from prime factors;
 * divisibility tests and remainders; parity and multiples in algebra; and
 * rational against irrational numbers, with a recurring decimal turned into a
 * fraction. Level 1, Proof, is in `numberProof.ts`, and the shared helpers
 * (banks, choice slides, proof ordering) come from there.
 *
 * Every number the learner meets is under 1000. A factorisation or a
 * factorised expression is a *form*, so it goes through `tiles`, `tree` or
 * `steps`; only a count, a remainder, an HCF or LCM, or a fraction's value is
 * typed (PITFALLS 3.4). Surds and rationalising belong to Exponents & Radicals
 * and are not taught here: a root appears only as a number to classify.
 */
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { bankFor, bin, num, pow, valueOf, type Expr } from '../expr';
import { options } from '../choiceVariant';
import {
  choiceSlide,
  factorTex,
  fillBank,
  gcd,
  isPrime,
  lin,
  mod,
  orderSlide,
  orderSolution,
  pickDistractors,
  polyTex,
  say,
  stackTex,
  turned,
  type Proof,
} from './numberProof';

/* ---------- shared helpers ---------- */

/** A prime and its power. */
type PrimePower = [number, number];

/** `2^3`, or `5` for a first power. Single-digit exponents, so tiles-safe. */
function powTex([p, e]: PrimePower): string {
  return e === 1 ? `${p}` : `${p}^${e}`;
}

function productTex(factors: PrimePower[]): string {
  return factors.map(powTex).join(' \\times ');
}

/** `$2^2 \\times 3 = 12$`, or just `$7$` when there is nothing to multiply. */
function productEq(value: number): string {
  const tex = productTex(factorise(value));
  return tex === String(value) ? `$${value}$` : `$${tex} = ${value}$`;
}

function valueOfFactors(factors: PrimePower[]): number {
  return factors.reduce((acc, [p, e]) => acc * p ** e, 1);
}

/** The prime factorisation of n, smallest prime first. */
export function factorise(n: number): PrimePower[] {
  const out: PrimePower[] = [];
  let rest = n;
  for (let p = 2; p * p <= rest; p += 1) {
    let e = 0;
    while (rest % p === 0) {
      rest /= p;
      e += 1;
    }
    if (e > 0) out.push([p, e]);
  }
  if (rest > 1) out.push([rest, 1]);
  return out;
}

/** Numbers near a value, for topping up a bank whose slips collided. */
function near(value: number, count: number): number[] {
  const out: number[] = [];
  for (let gap = 1; out.length < count; gap += 1) out.push(value + gap, value - gap);
  return out.slice(0, count);
}

/** Six distinct whole values for a reduce node, the right one among them. */
function numBank(correct: number, slips: number[]): string[] {
  const seen = new Set([correct]);
  const out = [correct];
  for (const value of [...slips, ...near(correct, 10)]) {
    if (out.length >= 6) break;
    if (!Number.isInteger(value) || value < 0 || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out.sort((x, y) => x - y).map(String);
}

/** Four whole-number options: the answer and the first three distinct slips. */
function intOptions(correct: number, slips: number[], min = 0): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of [...slips, ...near(correct, 12)]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || value < min || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  return options(
    { tex: String(correct), answer: String(correct) },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: String(value), answer: String(value) })),
  );
}

/** A steps bank: the value and its slips, de-duplicated and ordered by hash. */
function stepBank(value: string, ...slips: string[]): string[] {
  return [...new Set([value, ...slips])].sort((a, b) => hashSeed(a) - hashSeed(b));
}

/** Primes up to √n, the ones a primality check has to try. */
function primesUpToRoot(n: number): number[] {
  const out: number[] = [];
  for (let p = 2; p * p <= n; p += 1) if (isPrime(p)) out.push(p);
  return out;
}

/* ================================================================
 * Lesson 1: factors, multiples and primes
 * ================================================================ */

interface IsPrimeParams {
  prime: number;
  others: number[];
}

const numIsPrime: Generator<IsPrimeParams> = {
  id: 'num-is-prime',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const [lo, hi] = hard ? [100, 400] : [20, 100];
    const inRange = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const primes = inRange.filter(isPrime);
    // Composites that dodge the quick tests: odd, not ending in 5, and at
    // difficulty 2 not a multiple of 3 either.
    const decoys = inRange.filter(
      (n) => !isPrime(n) && n % 2 === 1 && n % 5 !== 0 && (!hard || n % 3 !== 0),
    );
    return { prime: rng.pick(primes), others: rng.sample(decoys, 3).sort((a, b) => a - b) };
  },
  render({ prime, others }) {
    return choiceSlide([say('Which of these numbers is **prime**?')], String(prime), others.map(String));
  },
  solution({ prime, others }) {
    const tries = primesUpToRoot(prime);
    return [
      {
        text: `$${prime}$: none of ${tries.map((p) => `$${p}$`).join(', ')} divides it, and those are all the primes up to $\\sqrt{${prime}}$, so it is prime.`,
      },
      ...others.map((n) => ({ text: `$${n} = ${factorTex(n)}$, so it is not prime.` })),
    ];
  },
};

/* ---------- prime factorisation ---------- */

interface FactorParams {
  factors: PrimePower[];
}

function sampleFactors(rng: Rng, difficulty: number): FactorParams {
  const hard = difficulty >= 2;
  const pool = hard ? [2, 3, 5, 7, 11, 13] : [2, 3, 5, 7];
  const [lo, hi] = hard ? [100, 999] : [24, 400];
  for (;;) {
    const count = hard ? rng.int(3, 4) : rng.int(2, 3);
    const primes = rng.sample(pool, count).sort((a, b) => a - b);
    const factors: PrimePower[] = primes.map((p) => [p, rng.int(1, p === 2 ? 5 : 3)]);
    const n = valueOfFactors(factors);
    if (n < lo || n > hi) continue;
    if (factors.every(([, e]) => e === 1)) continue;
    return { factors };
  }
}

const numFactorise: Generator<FactorParams> = {
  id: 'num-factorise',
  sample: sampleFactors,
  render({ factors }) {
    const n = valueOfFactors(factors);
    const answer = factors.map(powTex);
    const used = factors.map(([p]) => p);
    const spare = [2, 3, 5, 7, 11].filter((p) => !used.includes(p));
    const slips = [
      ...factors.flatMap(([p, e]) => [powTex([p, e + 1]), ...(e > 1 ? [powTex([p, e - 1])] : [])]),
      ...spare.slice(0, 2).map((p) => powTex([p, 1])),
    ];
    return {
      kind: 'tiles',
      prompt: [say(`Write $${n}$ as a product of prime powers, smallest prime first.`)],
      template: `${n} = ${answer.map((_, i) => `{${i}}`).join(' \\times ')}`,
      bank: fillBank(answer, slips, 2, 4),
      answer,
    };
  },
  solution({ factors }) {
    let rest = valueOfFactors(factors);
    const steps: SolutionStep[] = [{ text: 'Divide by each prime as many times as it goes, smallest first:' }];
    for (const [p, e] of factors) {
      const chain = [rest];
      for (let i = 0; i < e; i += 1) {
        rest /= p;
        chain.push(rest);
      }
      steps.push({ text: `By $${p}$, $${e}$ time${e === 1 ? '' : 's'}: ${chain.map((v) => `$${v}$`).join(' → ')}.` });
    }
    steps.push({ tex: stackTex(`${valueOfFactors(factors)} = ${productTex(factors)}`) });
    return steps;
  },
};

/* ---------- a product of prime powers, worked out ---------- */

function factorExpr(factors: PrimePower[]): Expr {
  const parts = factors.map(([p, e]) => (e === 1 ? num(p) : pow(num(p), num(e))));
  return parts.slice(1).reduce((acc, part) => bin('*', acc, part), parts[0]);
}

function factorBanks(expr: Expr): Record<string, string[]> {
  const banks: Record<string, string[]> = {};
  const walk = (node: Expr, path: string) => {
    if (node.kind === 'power') {
      const base = valueOf(node.base);
      const exponent = valueOf(node.exponent);
      banks[path] = numBank(valueOf(node), [base * exponent, base ** (exponent - 1), base ** (exponent + 1), base + exponent]);
      return;
    }
    if (node.kind === 'binary') {
      banks[path] = bankFor(node).filter((token) => !token.startsWith('-'));
      walk(node.left, `${path}.l`);
      walk(node.right, `${path}.r`);
    }
  };
  walk(expr, 'r');
  return banks;
}

/** The product with each power read as base × exponent, the classic slip. */
function timesNotPower(factors: PrimePower[]): number {
  return factors.reduce((acc, [p, e]) => acc * (e === 1 ? p : p * e), 1);
}

const numFactorReduce: Generator<FactorParams> = {
  id: 'num-factor-reduce',
  sample(rng, difficulty) {
    for (;;) {
      const params = sampleFactors(rng, difficulty);
      if (params.factors.length <= 3) return params;
    }
  },
  choices({ factors }) {
    const n = valueOfFactors(factors);
    const [p, e] = factors[0];
    return intOptions(n, [timesNotPower(factors), (n / p ** e) * p ** (e + 1), (n / p ** e) * p ** Math.max(1, e - 1), n + p]);
  },
  render({ factors }) {
    const expr = factorExpr(factors);
    return {
      kind: 'reduce',
      prompt: [
        say('Work out the number from its prime factors. Tap the part you would do **next**, then choose what it comes to.'),
      ],
      expr,
      banks: factorBanks(expr),
    };
  },
  solution({ factors }) {
    return [
      { text: 'Powers first, then multiply:' },
      { tex: factors.filter(([, e]) => e > 1).map(([p, e]) => `${p}^{${e}} = ${p ** e}`).join(',\\quad ') },
      { tex: stackTex(`${productTex(factors)} = ${valueOfFactors(factors)}`) },
    ];
  },
};

/* ---------- counting factors ---------- */

interface CountParams extends FactorParams {
  given: 'factors' | 'number';
}

const numFactorCount: Generator<CountParams> = {
  id: 'num-factor-count',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const { factors } = sampleFactors(rng, 1);
      if (hard && factors.length < 2) continue;
      return { factors, given: hard ? 'number' : 'factors' };
    }
  },
  render({ factors, given }) {
    const n = valueOfFactors(factors);
    return {
      kind: 'expression',
      prompt: [
        say(
          given === 'factors'
            ? `$${n} = ${productTex(factors)}$. How many factors does $${n}$ have, counting $1$ and $${n}$?`
            : `How many factors does $${n}$ have, counting $1$ and $${n}$?`,
        ),
      ],
      lead: '\\text{number of factors} =',
      keypad: [],
      answer: String(factors.reduce((acc, [, e]) => acc * (e + 1), 1)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution({ factors }) {
    const n = valueOfFactors(factors);
    const count = factors.reduce((acc, [, e]) => acc * (e + 1), 1);
    return [
      { tex: stackTex(`${n} = ${productTex(factors)}`) },
      {
        text: `A factor takes each prime from $0$ times up to its power: ${factors.map(([p, e]) => `$${e + 1}$ choices for $${p}$`).join(', ')}.`,
      },
      { tex: stackTex(`${factors.map(([, e]) => `(${e} + 1)`).join(' \\times ')} = ${count}`) },
    ];
  },
};

/* ================================================================
 * Lesson 2: HCF and LCM
 * ================================================================ */

const PAIR_PRIMES = [2, 3, 5, 7];

interface PairParams {
  /** Exponents of 2, 3, 5 and 7. */
  ea: number[];
  eb: number[];
  want: 'hcf' | 'lcm';
}

const toFactors = (es: number[]): PrimePower[] =>
  es.map((e, i) => [PAIR_PRIMES[i], e] as PrimePower).filter(([, e]) => e > 0);
const hcfOf = (a: number, b: number) => gcd(a, b);
const lcmOf = (a: number, b: number) => (a * b) / gcd(a, b);

function samplePair(rng: Rng, difficulty: number): PairParams {
  const hard = difficulty >= 2;
  const width = hard ? 4 : 3;
  for (;;) {
    const ea = PAIR_PRIMES.map((_, i) => (i < width ? rng.int(0, i === 0 ? 3 : 2) : 0));
    const eb = PAIR_PRIMES.map((_, i) => (i < width ? rng.int(0, i === 0 ? 3 : 2) : 0));
    const a = valueOfFactors(toFactors(ea));
    const b = valueOfFactors(toFactors(eb));
    const want = rng.pick(['hcf', 'lcm'] as const);
    const shared = ea.filter((e, i) => e > 0 && eb[i] > 0).length;
    const all = ea.filter((e, i) => e > 0 || eb[i] > 0).length;
    if (a === b || a < 12 || b < 12 || lcmOf(a, b) >= 1000) continue;
    if (want === 'hcf' ? shared < 2 : all < 3) continue;
    if (a % b === 0 || b % a === 0) continue;
    return { ea, eb, want };
  }
}

const numHcfLcmTiles: Generator<PairParams> = {
  id: 'num-hcf-lcm-tiles',
  sample: samplePair,
  render({ ea, eb, want }) {
    const a = valueOfFactors(toFactors(ea));
    const b = valueOfFactors(toFactors(eb));
    const pick = want === 'hcf' ? Math.min : Math.max;
    const other = want === 'hcf' ? Math.max : Math.min;
    const chosen: PrimePower[] = PAIR_PRIMES.map((p, i) => [p, want === 'hcf' && (ea[i] === 0 || eb[i] === 0) ? 0 : pick(ea[i], eb[i])] as PrimePower).filter(([, e]) => e > 0);
    const answer = chosen.map(powTex);
    const slips = PAIR_PRIMES.flatMap((p, i) => {
      const out: string[] = [];
      const o = other(ea[i], eb[i]);
      if (o > 0) out.push(powTex([p, o]));
      if (ea[i] + eb[i] > 0) out.push(powTex([p, ea[i] + eb[i]]));
      return out;
    });
    const nudged = chosen.flatMap(([p, e]) => [powTex([p, e + 1]), ...(e > 1 ? [powTex([p, e - 1])] : [])]);
    const name = want === 'hcf' ? 'HCF' : 'LCM';
    return {
      kind: 'tiles',
      prompt: [
        say(`$${a} = ${productTex(toFactors(ea))}$ and $${b} = ${productTex(toFactors(eb))}$.`),
        say(`Write their **${name}** as a product of prime powers, smallest prime first.`),
      ],
      template: `\\text{${name}} = ${answer.map((_, i) => `{${i}}`).join(' \\times ')}`,
      bank: fillBank(answer, [...slips, ...nudged], 2, 4),
      answer,
    };
  },
  solution({ ea, eb, want }) {
    const a = valueOfFactors(toFactors(ea));
    const b = valueOfFactors(toFactors(eb));
    const value = want === 'hcf' ? hcfOf(a, b) : lcmOf(a, b);
    return [
      {
        text:
          want === 'hcf'
            ? 'The HCF takes only the primes both numbers share, each at the **smaller** of its two powers.'
            : 'The LCM takes every prime in either number, each at the **larger** of its two powers.',
      },
      { tex: stackTex(`\\text{${want === 'hcf' ? 'HCF' : 'LCM'}} = ${productTex(factorise(value))} = ${value}`) },
    ];
  },
};

/* ---------- HCF × LCM = a × b, as a tree ---------- */

interface LcmTreeParams {
  a: number;
  b: number;
}

const numLcmTree: Generator<LcmTreeParams> = {
  id: 'num-lcm-tree',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const a = rng.int(4, hard ? 45 : 24);
      const b = rng.int(a + 1, hard ? 60 : 30);
      const h = gcd(a, b);
      if (h < 2 || a * b >= 1000 || b % a === 0) continue;
      return { a, b };
    }
  },
  render({ a, b }) {
    const h = gcd(a, b);
    const l = lcmOf(a, b);
    const answer = [String(a * b), String(h), String(l)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Top row, left to right: $${a} \\times ${b}$, then the HCF of $${a}$ and $${b}$. Underneath: the LCM, the first divided by the second.`,
        ),
      ],
      expression: `\\text{LCM} = \\dfrac{${a} \\times ${b}}{\\text{HCF}}`,
      nodes: [
        { id: 'p', from: [] },
        { id: 'h', from: [] },
        { id: 'l', from: ['p', 'h'] },
      ],
      bank: fillBank(answer, [String(a + b), String(h * 2), String(l * 2), String(a * b - h), String(h / smallestPrime(h))]),
      answer,
    };
  },
  solution({ a, b }) {
    const h = gcd(a, b);
    return [
      { tex: stackTex(`${a} \\times ${b} = ${a * b}`) },
      { text: `The HCF is $${h}$, the biggest number dividing both $${a}$ and $${b}$.` },
      { tex: stackTex(`\\text{LCM} = \\frac{${a * b}}{${h}} = ${lcmOf(a, b)}`) },
    ];
  },
};

function smallestPrime(n: number): number {
  for (let d = 2; d <= n; d += 1) if (n % d === 0) return d;
  return n;
}

/* ---------- HCF and LCM in words ---------- */

interface Context {
  want: 'hcf' | 'lcm';
  text: (a: number, b: number) => string;
  lead: string;
}

const CONTEXTS: Context[] = [
  {
    want: 'hcf',
    text: (a, b) =>
      `Two ropes, $${a}$ cm and $${b}$ cm long, are cut into pieces all the same length, as long as possible, with nothing left over. How long is each piece, in cm?`,
    lead: '\\text{length} =',
  },
  {
    want: 'hcf',
    text: (a, b) =>
      `$${a}$ apples and $${b}$ pears are packed into identical bags, as many bags as possible, with none left over. How many bags?`,
    lead: '\\text{bags} =',
  },
  {
    want: 'hcf',
    text: (a, b) => `A floor is $${a}$ by $${b}$ units. What is the largest square tile, in units along a side, that covers it exactly?`,
    lead: '\\text{side} =',
  },
  {
    want: 'lcm',
    text: (a, b) =>
      `Two lights flash every $${a}$ and every $${b}$ seconds. They flash together now. After how many seconds do they next flash together?`,
    lead: '\\text{seconds} =',
  },
  {
    want: 'lcm',
    text: (a, b) =>
      `Buses leave one stop every $${a}$ minutes and another every $${b}$ minutes, both at 9:00. After how many minutes do both leave together again?`,
    lead: '\\text{minutes} =',
  },
  {
    want: 'lcm',
    text: (a, b) =>
      `What is the smallest number of sweets that can be shared equally among $${a}$ children, or equally among $${b}$ children?`,
    lead: '\\text{sweets} =',
  },
];

interface WordParams {
  a: number;
  b: number;
  context: number;
}

function sampleWords(rng: Rng, difficulty: number): WordParams {
  const hard = difficulty >= 2;
  for (;;) {
    const context = rng.int(0, CONTEXTS.length - 1);
    const { want } = CONTEXTS[context];
    const [lo, hi] = want === 'hcf' ? (hard ? [24, 180] : [12, 90]) : hard ? [6, 40] : [4, 20];
    const a = rng.int(lo, hi);
    const b = rng.int(lo, hi);
    const h = gcd(a, b);
    if (a >= b || b % a === 0 || h < (want === 'hcf' ? 3 : 2)) continue;
    if (lcmOf(a, b) >= 1000 || (want === 'lcm' && lcmOf(a, b) === a * b)) continue;
    return { a, b, context };
  }
}

const numHcf: Generator<WordParams & { words: boolean }> = {
  id: 'num-hcf',
  sample(rng, difficulty) {
    return { ...sampleWords(rng, difficulty), words: difficulty >= 2 };
  },
  render({ a, b, context, words }) {
    const c = CONTEXTS[context];
    const name = c.want === 'hcf' ? 'HCF' : 'LCM';
    return {
      kind: 'expression',
      prompt: [say(words ? c.text(a, b) : `Find the ${name} of $${a}$ and $${b}$.`)],
      lead: words ? c.lead : `\\text{${name}}(${a}, ${b}) =`,
      keypad: [],
      answer: String(c.want === 'hcf' ? hcfOf(a, b) : lcmOf(a, b)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution({ a, b, context, words }) {
    const { want } = CONTEXTS[context];
    const value = want === 'hcf' ? hcfOf(a, b) : lcmOf(a, b);
    return [
      ...(words
        ? [
            {
              text:
                want === 'hcf'
                  ? 'The biggest number that goes into both exactly: the HCF.'
                  : 'The first number both go into exactly: the LCM.',
            },
          ]
        : []),
      { tex: stackTex(`${a} = ${productTex(factorise(a))},\\quad ${b} = ${productTex(factorise(b))}`) },
      {
        text:
          want === 'hcf'
            ? `Shared primes at the smaller power: ${productEq(value)}.`
            : `Every prime at the larger power: ${productEq(value)}.`,
      },
    ];
  },
};

const numHcfFlow: Generator<WordParams> = {
  id: 'num-hcf-flow',
  sample(rng, difficulty) {
    return sampleWords(rng, difficulty);
  },
  render({ a, b, context }) {
    const c = CONTEXTS[context];
    const h = hcfOf(a, b);
    const l = lcmOf(a, b);
    const value = c.want === 'hcf' ? h : l;
    const values = [...new Set([h, l, a * b < 1000 ? a * b : a + b, c.want === 'hcf' ? a : b])].map(String);
    const which = {
      hcf: 'The HCF: the biggest number dividing both',
      lcm: 'The LCM: the smallest number both divide into',
    };
    const powers = { hcf: 'Shared primes, the smaller power', lcm: 'Every prime, the larger power' };
    return {
      kind: 'flow',
      prompt: [say(c.text(a, b)), say('Each answer chooses what gets asked next.')],
      subject: stackTex(`${a} = ${productTex(factorise(a))},\\quad ${b} = ${productTex(factorise(b))}`),
      steps: [
        {
          id: 'which',
          ask: 'What does the question need?',
          branches: [
            { label: which.hcf, to: 'power' },
            { label: which.lcm, to: 'power' },
          ],
        },
        {
          id: 'power',
          ask: 'From the prime factors, you take',
          branches: [
            { label: powers.hcf, to: 'value' },
            { label: powers.lcm, to: 'value' },
            { label: 'Every prime, the two powers added', to: 'value' },
          ],
        },
        {
          id: 'value',
          ask: 'So the answer is',
          branches: turned(values, `${a}|${b}|${context}`).map((v) => ({
            label: v,
            outcome: v === String(value) ? 'That is the answer.' : `$${v}$ is what you get another way.`,
          })),
        },
      ],
      answer: [which[c.want], powers[c.want], String(value)],
    };
  },
  solution({ a, b, context }) {
    const { want } = CONTEXTS[context];
    const value = want === 'hcf' ? hcfOf(a, b) : lcmOf(a, b);
    return [
      {
        text:
          want === 'hcf'
            ? 'Equal pieces, bags or tiles that fit both exactly: the biggest number dividing both, the HCF.'
            : 'Lining up again, or the first time both fit: the smallest number both divide into, the LCM.',
      },
      {
        text: `${want === 'hcf' ? 'Shared primes at the smaller power' : 'Every prime at the larger power'}: ${productEq(value)}.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 3: divisibility tests and remainders
 * ================================================================ */

const digitSum = (n: number) => String(n).split('').reduce((acc, d) => acc + Number(d), 0);

const TESTS: Record<number, { ask: (n: number) => string; rule: string; passes: (n: number) => boolean }> = {
  2: { ask: (n) => `Does $${n}$ end in an even digit?`, rule: 'ends in an even digit', passes: (n) => n % 2 === 0 },
  3: {
    ask: (n) => `Is the digit sum of $${n}$ a multiple of $3$?`,
    rule: 'has a digit sum that is a multiple of $3$',
    passes: (n) => n % 3 === 0,
  },
  4: {
    ask: (n) => `Are its last two digits, $${String(n).slice(-2)}$, a multiple of $4$?`,
    rule: 'has last two digits that make a multiple of $4$',
    passes: (n) => n % 4 === 0,
  },
  5: { ask: (n) => `Does $${n}$ end in $0$ or $5$?`, rule: 'ends in $0$ or $5$', passes: (n) => n % 5 === 0 },
  9: {
    ask: (n) => `Is the digit sum of $${n}$ a multiple of $9$?`,
    rule: 'has a digit sum that is a multiple of $9$',
    passes: (n) => n % 9 === 0,
  },
};

/** Each divisor as two tests whose numbers share no factor. */
const SPLITS: Record<number, [number, number]> = { 6: [2, 3], 12: [4, 3], 15: [5, 3], 18: [2, 9], 36: [4, 9] };

interface DivisibleParams {
  d: number;
  correct: number;
  others: number[];
}

/** Near misses for a divisor: numbers passing one part of its test. */
function nearMiss(d: number, n: number): boolean {
  if (n % d === 0) return false;
  const parts = SPLITS[d] ?? (d === 9 ? [3] : d === 4 ? [2] : [1]);
  return parts.some((p) => n % p === 0);
}

const numDivisible: Generator<DivisibleParams> = {
  id: 'num-divisible',
  sample(rng, difficulty) {
    const d = rng.pick(difficulty >= 2 ? [6, 12, 15, 18] : [3, 4, 9]);
    const range = Array.from({ length: 900 }, (_, i) => 100 + i);
    const correct = rng.pick(range.filter((n) => n % d === 0));
    const misses = range.filter((n) => nearMiss(d, n));
    return { d, correct, others: rng.sample(misses, 3).sort((a, b) => a - b) };
  },
  render({ d, correct, others }) {
    return choiceSlide([say(`Which of these is divisible by $${d}$?`)], String(correct), others.map(String));
  },
  solution({ d, correct, others }) {
    const tests = SPLITS[d] ?? [d];
    const why = (n: number) => {
      const failed = tests.find((t) => !TESTS[t].passes(n));
      return failed === undefined
        ? `passes ${tests.length > 1 ? 'both tests' : 'the test'}, so it is divisible by $${d}$`
        : `fails the test for $${failed}$ (it ${TESTS[failed].passes(n) ? '' : 'does not '}${failed === 2 ? 'end in an even digit' : failed === 5 ? 'end in $0$ or $5$' : failed === 4 ? 'end in two digits making a multiple of $4$' : `have a digit sum that is a multiple of $${failed}$`})`;
    };
    return [
      {
        text:
          tests.length > 1
            ? `A number is divisible by $${d}$ exactly when it passes the tests for $${tests[0]}$ and for $${tests[1]}$.`
            : `A number is divisible by $${d}$ exactly when it ${TESTS[d].rule}.`,
      },
      ...[correct, ...others].map((n) => ({ text: `$${n}$ (digit sum $${digitSum(n)}$) ${why(n)}.` })),
    ];
  },
};

/* ---------- running a two-part test ---------- */

interface DivisFlowParams {
  n: number;
  d: number;
}

const numDivisFlow: Generator<DivisFlowParams> = {
  id: 'num-divis-flow',
  sample(rng, difficulty) {
    const d = rng.pick(difficulty >= 2 ? [12, 18, 36] : [6, 15]);
    const [first, second] = SPLITS[d];
    const range = Array.from({ length: 900 }, (_, i) => 100 + i);
    const kind = rng.pick(['both', 'both', 'firstOnly', 'firstFails'] as const);
    const pool = range.filter((n) => {
      const a = n % first === 0;
      const b = n % second === 0;
      return kind === 'both' ? a && b : kind === 'firstOnly' ? a && !b : !a;
    });
    return { n: rng.pick(pool), d };
  },
  render({ n, d }) {
    const [first, second] = SPLITS[d];
    const one = TESTS[first].passes(n);
    const two = TESTS[second].passes(n);
    return {
      kind: 'flow',
      prompt: [
        say(
          `$${d} = ${first} \\times ${second}$, and those two share no factor, so a number is divisible by $${d}$ when it passes both tests. Is $${n}$? Each answer chooses what gets asked next.`,
        ),
      ],
      subject: `${n} \\div ${d}`,
      steps: [
        {
          id: 'first',
          ask: TESTS[first].ask(n),
          branches: [
            { label: 'Yes', to: 'second' },
            { label: 'No', to: 'verdict' },
          ],
        },
        {
          id: 'second',
          ask: TESTS[second].ask(n),
          branches: [
            { label: 'Yes', to: 'verdict' },
            { label: 'No', to: 'verdict' },
          ],
        },
        {
          id: 'verdict',
          ask: `So is $${n}$ divisible by $${d}$?`,
          branches: [
            { label: 'Yes', outcome: `Then $${n} \\div ${d}$ is a whole number.` },
            { label: 'No', outcome: `Then $${n} \\div ${d}$ leaves a remainder.` },
          ],
        },
      ],
      answer: one ? ['Yes', two ? 'Yes' : 'No', two ? 'Yes' : 'No'] : ['No', 'No'],
    };
  },
  solution({ n, d }) {
    const [first, second] = SPLITS[d];
    const one = TESTS[first].passes(n);
    const two = TESTS[second].passes(n);
    const verdict = one && two;
    return [
      { text: `Test for $${first}$: $${n}$ ${one ? '' : 'does not '}pass${one ? 'es' : ''}.` },
      ...(one ? [{ text: `Test for $${second}$: the digit sum is $${digitSum(n)}$, and it ${two ? 'passes' : 'does not pass'}.` }] : []),
      {
        text: verdict
          ? `So $${n} = ${d} \\times ${n / d}$.`
          : `So $${n}$ is not divisible by $${d}$: $${n} = ${d} \\times ${Math.floor(n / d)} + ${n % d}$.`,
      },
    ];
  },
};

/* ---------- remainders ---------- */

type RemainderParams =
  | { kind: 'plain'; n: number; d: number }
  | { kind: 'combine'; m: number; r1: number; r2: number; form: 'sum' | 'product' | 'double' | 'square' };

function combineTex(form: 'sum' | 'product' | 'double' | 'square'): string {
  return { sum: 'a + b', product: 'ab', double: '2a + b', square: 'a^2' }[form];
}

function combineValue(r1: number, r2: number, form: 'sum' | 'product' | 'double' | 'square'): number {
  return { sum: r1 + r2, product: r1 * r2, double: 2 * r1 + r2, square: r1 * r1 }[form];
}

function combineAt(r1: number, r2: number, form: 'sum' | 'product' | 'double' | 'square'): string {
  return { sum: `${r1} + ${r2}`, product: `${r1} \\times ${r2}`, double: `2 \\times ${r1} + ${r2}`, square: `${r1}^2` }[form];
}

function remainderAnswer(params: RemainderParams): number {
  return params.kind === 'plain'
    ? params.n % params.d
    : mod(combineValue(params.r1, params.r2, params.form), params.m);
}

const numRemainder: Generator<RemainderParams> = {
  id: 'num-remainder',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      for (;;) {
        const n = rng.int(100, 999);
        const d = rng.int(3, 9);
        if (n % d !== 0) return { kind: 'plain', n, d };
      }
    }
    const m = rng.int(5, 9);
    return {
      kind: 'combine',
      m,
      r1: rng.int(2, m - 1),
      r2: rng.int(2, m - 1),
      form: rng.pick(['sum', 'product', 'double', 'square'] as const),
    };
  },
  render(params) {
    const prompt =
      params.kind === 'plain'
        ? `What is the remainder when $${params.n}$ is divided by $${params.d}$?`
        : `When divided by $${params.m}$, $a$ leaves remainder $${params.r1}$ and $b$ leaves remainder $${params.r2}$. What remainder does $${combineTex(params.form)}$ leave when divided by $${params.m}$?`;
    return {
      kind: 'expression',
      prompt: [say(prompt)],
      lead: '\\text{remainder} =',
      keypad: [],
      answer: String(remainderAnswer(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution(params) {
    if (params.kind === 'plain') {
      const { n, d } = params;
      return [
        { text: `The biggest multiple of $${d}$ not over $${n}$ is $${d} \\times ${Math.floor(n / d)} = ${d * Math.floor(n / d)}$.` },
        { tex: stackTex(`${n} = ${d} \\times ${Math.floor(n / d)} + ${n % d}`) },
      ];
    }
    const { m, r1, r2, form } = params;
    const v = combineValue(r1, r2, form);
    return [
      {
        text: `Write $a = ${m}j + ${r1}$ and $b = ${m}k + ${r2}$. Every part with $j$ or $k$ in it is a multiple of $${m}$, so only the remainders matter.`,
      },
      { tex: stackTex(`${combineAt(r1, r2, form)} = ${v} = ${m} \\times ${Math.floor(v / m)} + ${mod(v, m)}`) },
    ];
  },
};

/* ---------- dividend = divisor × quotient + remainder ---------- */

interface DivisionParams {
  d: number;
  q: number;
  r: number;
}

function divisionExpr({ d, q, r }: DivisionParams): Expr {
  return bin('+', bin('*', num(d), num(q)), num(r));
}

const numDivisionReduce: Generator<DivisionParams> = {
  id: 'num-division-reduce',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const d = hard ? rng.int(11, 19) : rng.int(3, 9);
      const q = hard ? rng.int(12, 70) : rng.int(11, 40);
      const r = rng.int(1, d - 1);
      if (d * q + r < 1000) return { d, q, r };
    }
  },
  choices({ d, q, r }) {
    return intOptions(d * q + r, [d * (q + r), d * q, (d + r) * q, d * q - r]);
  },
  render(params) {
    const { d, q, r } = params;
    const expr = divisionExpr(params);
    return {
      kind: 'reduce',
      prompt: [
        say(
          `Dividing a number by $${d}$ gives $${q}$ remainder $${r}$. The line below rebuilds the number: tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      expr,
      banks: {
        r: numBank(d * q + r, [d * (q + r), d * q, d * q - r]),
        'r.l': numBank(d * q, [d + q, d * (q + 1), (d - 1) * q]),
      },
    };
  },
  solution({ d, q, r }) {
    return [
      { text: 'The number is the divisor times the quotient, plus the remainder. Multiply first, then add.' },
      { tex: stackTex(`${d} \\times ${q} + ${r} = ${d * q} + ${r} = ${d * q + r}`) },
      { text: `Check: $${d * q + r} \\div ${d} = ${q}$ remainder $${r}$.` },
    ];
  },
};

/* ================================================================
 * Lesson 4: parity and multiples in algebra
 * ================================================================ */

/** A factor `n + a` as the learner reads it, bracketed unless it is bare `n`. */
function factorTexOf(a: number, v = 'n', coef = 1): string {
  const inner = lin(coef, a, v);
  return a === 0 ? inner : `(${inner})`;
}

/** Multiply out a list of linear factors (coef, a), highest power first. */
function expand(factors: [number, number][]): number[] {
  return factors.reduce<number[]>(
    (acc, [c, a]) => {
      const out = Array(acc.length + 1).fill(0);
      acc.forEach((x, i) => {
        out[i] += x * c;
        out[i + 1] += x * a;
      });
      return out;
    },
    [1],
  );
}

/* ---------- ordering a proof about multiples ---------- */

type MultiplesParams =
  | { family: 'pairParity'; c: number; difficulty: number; picks: number[] }
  | { family: 'triple'; a: number; difficulty: number; picks: number[] }
  | { family: 'oddSquare'; j: number; difficulty: number; picks: number[] };

function pairParityProof(c: number, difficulty: number): Proof {
  const odd = c % 2 === 1;
  const word = odd ? 'odd' : 'even';
  const form = odd ? `2(m + ${(c - 1) / 2}) + 1` : `2(m + ${c / 2})`;
  const middle =
    difficulty >= 2
      ? [
          '$n$ and $n + 1$ are consecutive, so one of them is even.',
          'So $n(n + 1)$ is even: write $n(n + 1) = 2m$ for a whole number $m$.',
        ]
      : ['$n$ and $n + 1$ are consecutive, so one is even, and $n(n + 1) = 2m$ for a whole number $m$.'];
  return {
    claim: `Prove that $n^2 + n + ${c}$ is ${word} for every whole number $n$.`,
    steps: [
      `Factorising, $n^2 + n + ${c} = n(n + 1) + ${c}$.`,
      ...middle,
      `Then $n^2 + n + ${c} = 2m + ${c} = ${form}$${odd ? '' : ', a multiple of $2$'}.`,
      `$m + ${odd ? (c - 1) / 2 : c / 2}$ is a whole number, so $n^2 + n + ${c}$ is ${word}.`,
    ],
    pool: [
      {
        text: '$n$ and $n + 1$ are both even.',
        why: 'Consecutive numbers alternate: one is even and the other odd.',
      },
      {
        text: `Checking $n = 2$: $4 + 2 + ${c} = ${6 + c}$, which is ${word}.`,
        why: 'One example is not a proof.',
      },
      {
        text: `Factorising, $n^2 + n + ${c} = n(n + ${c})$.`,
        why: `$n(n + ${c})$ multiplies out to $n^2 + ${c}n$, not $n^2 + n + ${c}$.`,
      },
    ],
  };
}

/** (n + a)(n + a + 1)(n + a + 2) is a multiple of 6. */
function tripleProof(a: number, difficulty: number): Proof {
  const coefs = expand([
    [1, a],
    [1, a + 1],
    [1, a + 2],
  ]);
  const expr = polyTex(coefs, 'n');
  const factored = `${factorTexOf(a)}${factorTexOf(a + 1)}${factorTexOf(a + 2)}`;
  const middle =
    difficulty >= 2
      ? [
          'Of any three consecutive whole numbers, one is a multiple of $3$.',
          'And at least one of them is even, a multiple of $2$.',
        ]
      : ['Of any three consecutive whole numbers, one is a multiple of $3$ and at least one is even.'];
  return {
    claim: `Prove that $${expr}$ is a multiple of $6$ for every whole number $n$.`,
    steps: [
      `Factorising, $${expr} = ${factored}$.`,
      'That is three consecutive whole numbers multiplied together.',
      ...middle,
      `$2$ and $3$ share no factor, so the product is a multiple of $2 \\times 3 = 6$.`,
    ],
    pool: [
      {
        text: 'Of any three consecutive whole numbers, one is a multiple of $6$.',
        why: '$1$, $2$ and $3$ are consecutive, and none of them is a multiple of $6$.',
      },
      {
        text: `Checking $n = 1$ gives $${coefs.reduce((acc, x) => acc + x, 0)}$, a multiple of $6$.`,
        why: 'One example is not a proof.',
      },
      {
        text: 'So the product is a multiple of $2 + 3 = 5$.',
        why: 'Multiples of $2$ and of $3$ combine by multiplying, into multiples of $6$.',
      },
    ],
  };
}

/** For odd n, n^2 + (8j - 1) is a multiple of 8. */
function oddSquareProof(j: number, difficulty: number): Proof {
  const c = 8 * j - 1;
  const expr = c >= 0 ? `n^2 + ${c}` : `n^2 - ${-c}`;
  const constant = 8 * j;
  const tail = constant === 0 ? '' : ` + ${constant}`;
  const middle =
    difficulty >= 2
      ? [`Then $${expr} = 4k^2 + 4k${tail}$.`, `That is $4k(k + 1)${tail}$.`]
      : [`Then $${expr} = 4k^2 + 4k${tail} = 4k(k + 1)${tail}$.`];
  return {
    claim: `Prove that if $n$ is odd, then $${expr}$ is a multiple of $8$.`,
    steps: [
      '$n$ is odd, so $n = 2k + 1$ for a whole number $k$.',
      ...middle,
      '$k$ and $k + 1$ are consecutive, so $k(k + 1)$ is even and $4k(k + 1)$ is a multiple of $8$.',
      `So $${expr}$ is a multiple of $8$${constant === 0 ? '' : ` plus $${constant}$, itself a multiple of $8$`}.`,
    ],
    pool: [
      { text: '$n$ is odd, so $n = 2k$ for a whole number $k$.', why: '$2k$ is even. An odd number is $2k + 1$.' },
      {
        text: `Then $${expr} = 4k^2 + ${constant + 2}$.`,
        why: 'Squaring $2k + 1$ gives a middle term: $4k^2 + 4k + 1$.',
      },
      {
        text: '$k$ and $k + 1$ are consecutive, so $k(k + 1)$ is a multiple of $4$.',
        why: '$1 \\times 2 = 2$ is not a multiple of $4$: the product is only sure to be even.',
      },
    ],
  };
}

function multiplesProof(params: MultiplesParams): Proof {
  switch (params.family) {
    case 'pairParity':
      return pairParityProof(params.c, params.difficulty);
    case 'triple':
      return tripleProof(params.a, params.difficulty);
    case 'oddSquare':
      return oddSquareProof(params.j, params.difficulty);
  }
}

const numOrderMultiples: Generator<MultiplesParams> = {
  id: 'num-order-multiples',
  sample(rng, difficulty) {
    const family = rng.pick(['pairParity', 'triple', 'oddSquare'] as const);
    const base: MultiplesParams = (() => {
      switch (family) {
        case 'pairParity':
          return { family, c: rng.int(1, 12), difficulty, picks: [] };
        case 'triple':
          return { family, a: rng.int(0, 3), difficulty, picks: [] };
        case 'oddSquare':
          return { family, j: rng.int(0, 4), difficulty, picks: [] };
      }
    })();
    return { ...base, picks: pickDistractors(rng, multiplesProof(base), difficulty) };
  },
  render(params) {
    return orderSlide(multiplesProof(params), params.picks);
  },
  solution(params) {
    return orderSolution(multiplesProof(params), params.picks);
  },
};

/* ---------- the factorised form ---------- */

type FactorisedParams =
  | { family: 'pair'; a: number; extra: number }
  | { family: 'triple'; a: number; extra: number }
  | { family: 'squares'; a: number; extra: number };

function factorisedForm(params: FactorisedParams): {
  expr: string;
  answer: string[];
  slips: string[];
  reason: string;
} {
  const { a } = params;
  switch (params.family) {
    case 'pair':
      return {
        expr: polyTex(expand([[1, a], [1, a + 1]]), 'n'),
        answer: [factorTexOf(a), factorTexOf(a + 1)],
        slips: [factorTexOf(-a), factorTexOf(-a - 1), factorTexOf(a + 2), factorTexOf(a - 1)],
        reason: 'two consecutive whole numbers multiplied, so it is always even',
      };
    case 'triple':
      return {
        expr: polyTex(expand([[1, a], [1, a + 1], [1, a + 2]]), 'n'),
        answer: [factorTexOf(a), factorTexOf(a + 1), factorTexOf(a + 2)],
        slips: [factorTexOf(-a), factorTexOf(a + 3), factorTexOf(a - 1), factorTexOf(-a - 2)],
        reason: 'three consecutive whole numbers multiplied, so it is always a multiple of $6$',
      };
    case 'squares':
      return {
        expr: polyTex([1, 0, -(a * a)], 'n'),
        answer: [factorTexOf(-a), factorTexOf(a)],
        slips: [factorTexOf(-a * a), factorTexOf(a * a), factorTexOf(-a - 1), factorTexOf(a + 1)],
        reason: `two whole numbers $${2 * a}$ apart multiplied: for odd $n$ both are ${a % 2 === 1 ? 'even' : 'odd'}`,
      };
  }
}

/** Whole numbers lo..hi, less those that would put a bare `n` after a bracket. */
function shifts(lo: number, hi: number, skip: number[]): number[] {
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((a) => !skip.includes(a));
}

const numFactorised: Generator<FactorisedParams> = {
  id: 'num-factorised',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const family = hard ? rng.pick(['triple', 'triple', 'squares'] as const) : rng.pick(['pair', 'pair', 'squares'] as const);
    const extra = hard ? 4 : 2;
    switch (family) {
      case 'pair':
        return { family, a: rng.pick(shifts(-8, 9, [-1])), extra };
      case 'triple':
        return { family, a: rng.pick(shifts(-8, 7, [-1, -2])), extra };
      case 'squares':
        return { family, a: rng.int(1, 12), extra };
    }
  },
  render(params) {
    const { expr, answer, slips } = factorisedForm(params);
    return {
      kind: 'tiles',
      prompt: [say(`Factorise $${expr}$ fully, smallest factor first.`)],
      template: `${expr} = ${answer.map((_, i) => `{${i}}`).join('')}`,
      bank: fillBank(answer, slips, 2, params.extra),
      answer,
    };
  },
  solution(params) {
    const { expr, answer, reason } = factorisedForm(params);
    return [
      { tex: stackTex(`${expr} = ${answer.join('')}`) },
      { text: `Multiply out to check. The form shows why it matters: ${reason}.` },
    ];
  },
};

/* ---------- the largest number that always divides ---------- */

type AlwaysParams =
  | { family: 'pair'; a: number; m: number; expanded: boolean }
  | { family: 'triple'; a: number; m: number; expanded: boolean }
  | { family: 'oddSquare'; a: number; m: number; expanded: boolean }
  | { family: 'evenPair'; a: number; m: number; expanded: boolean };

/** `2n` or `(2n + k)`, an even linear factor. */
function evenFactorTex(k: number): string {
  return k === 0 ? '2n' : `(2n + ${k})`;
}

function alwaysExpr(params: AlwaysParams): { tex: string; factored: string; f: (n: number) => number; why: string } {
  const { a, m, expanded } = params;
  const lead = m === 1 ? '' : `${m}`;
  const times = m === 1 ? '' : `, and the $${m}$ in front multiplies that`;
  const shown = (coefs: number[], factored: string) => (expanded ? polyTex(coefs, 'n') : factored);
  switch (params.family) {
    case 'pair': {
      const factored = `${lead}${factorTexOf(a)}${factorTexOf(a + 1)}`;
      return {
        tex: shown(expand([[1, a], [1, a + 1]]).map((x) => x * m), factored),
        factored,
        f: (n) => m * (n + a) * (n + a + 1),
        why: `two consecutive whole numbers multiplied, so one is even${times}`,
      };
    }
    case 'triple': {
      const factored = `${lead}${factorTexOf(a)}${factorTexOf(a + 1)}${factorTexOf(a + 2)}`;
      return {
        tex: shown(expand([[1, a], [1, a + 1], [1, a + 2]]).map((x) => x * m), factored),
        factored,
        f: (n) => m * (n + a) * (n + a + 1) * (n + a + 2),
        why: `three consecutive whole numbers multiplied, so one is a multiple of $3$ and one is even${times}`,
      };
    }
    case 'oddSquare': {
      const b = 2 * a + 1;
      return {
        tex: expanded ? polyTex([4, 4 * b, b * b - 1], 'n') : `(2n + ${b})^2 - 1`,
        factored: `${evenFactorTex(b - 1)}${evenFactorTex(b + 1)}`,
        f: (n) => (2 * n + b) ** 2 - 1,
        why: 'two consecutive even numbers multiplied, so one is a multiple of $4$ and the other of $2$',
      };
    }
    case 'evenPair': {
      const factored = `${evenFactorTex(2 * a)}${evenFactorTex(2 * a + 2)}`;
      return {
        tex: shown([4, 4 * (2 * a + 1), 4 * a * (a + 1)], factored),
        factored,
        f: (n) => (2 * n + 2 * a) * (2 * n + 2 * a + 2),
        why: 'two consecutive even numbers multiplied, so one is a multiple of $4$ and the other of $2$',
      };
    }
  }
}

/** The largest number dividing f(n) for every n, found by taking the gcd of f(1..40). */
function alwaysDivisor(f: (n: number) => number): number {
  let g = 0;
  for (let n = 1; n <= 40; n += 1) g = gcd(g, f(n));
  return g;
}

const DIVISOR_LADDER = [2, 3, 4, 6, 8, 10, 12, 16, 18, 24, 30, 36];

const numAlwaysDivides: Generator<AlwaysParams> = {
  id: 'num-always-divides',
  sample(rng, difficulty) {
    const expanded = difficulty >= 2;
    const family = rng.pick(['pair', 'triple', 'oddSquare', 'evenPair'] as const);
    switch (family) {
      case 'pair':
        return { family, a: rng.int(0, 5), m: rng.pick([1, 3, 5]), expanded };
      case 'triple':
        return { family, a: rng.int(0, 3), m: rng.pick([1, 5]), expanded };
      case 'oddSquare':
        return { family, a: rng.int(0, 3), m: 1, expanded };
      case 'evenPair':
        return { family, a: rng.int(0, 3), m: 1, expanded };
    }
  },
  render(params) {
    const { tex, f } = alwaysExpr(params);
    const g = alwaysDivisor(f);
    const at = DIVISOR_LADDER.indexOf(g);
    const others = DIVISOR_LADDER.filter((x) => x !== g)
      .map((x) => ({ x, gap: Math.abs(DIVISOR_LADDER.indexOf(x) - (at === -1 ? 4 : at)) }))
      .sort((p, q) => p.gap - q.gap || p.x - q.x)
      .slice(0, 3)
      .map(({ x }) => String(x));
    return choiceSlide(
      [say(`What is the largest whole number that divides $${tex}$ for **every** whole number $n$?`)],
      String(g),
      others,
    );
  },
  solution(params) {
    const { tex, factored, f, why } = alwaysExpr(params);
    const g = alwaysDivisor(f);
    // The fewest first values whose HCF is already g, so the claim is shown rather than asserted.
    const values: number[] = [];
    for (let n = 1, h = 0; h !== g; n += 1) {
      values.push(f(n));
      h = gcd(h, f(n));
    }
    const list = (xs: string[]) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
    return [
      { text: `$${tex === factored ? tex : `${tex} = ${factored}`}$: ${why}.` },
      {
        text:
          values.length === 1
            ? `So it is always a multiple of $${g}$, and at $n = 1$ it is $${g}$ itself, so nothing bigger works.`
            : `So it is always a multiple of $${g}$. Nothing bigger works: for $n$ from $1$ to $${values.length}$ it is ${list(values.map((v) => `$${v}$`))}, whose HCF is $${g}$.`,
      },
    ];
  },
};

/* ---------- a difference of squares, one step at a time ---------- */

interface SquaresParams {
  c: 1 | 2;
  a: number;
  b: number;
  op: '+' | '-';
}

function squareOf(c: number, a: number): number[] {
  return [c * c, 2 * c * a, a * a];
}

function combined({ c, a, b, op }: SquaresParams): number[] {
  const p = squareOf(c, a);
  const q = squareOf(c, b);
  return p.map((x, i) => (op === '+' ? x + q[i] : x - q[i]));
}

function contentOf(coefs: number[]): number {
  return coefs.reduce((acc, x) => gcd(acc, x), 0);
}

const numParitySteps: Generator<SquaresParams> = {
  id: 'num-parity-steps',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const params: SquaresParams = {
        c: hard ? 2 : 1,
        a: rng.int(2, 9),
        b: rng.int(1, 8),
        op: hard ? rng.pick(['+', '-'] as const) : '-',
      };
      if (params.b >= params.a) continue;
      if (contentOf(combined(params)) < 2) continue;
      return params;
    }
  },
  render(params) {
    const { c, a, b, op } = params;
    const v = c === 1 ? 'n' : 'k';
    const sa = squareOf(c, a);
    const sb = squareOf(c, b);
    const total = combined(params);
    const g = contentOf(total);
    const inner = total.map((x) => x / g);
    const bracket = (coefs: number[]) => `(${polyTex(coefs, v)})`;
    const slipsA = [bracket([sa[0], 0, sa[2]]), bracket([sa[0], sa[1] / 2, sa[2]]), bracket([sa[0], sa[1], 2 * a])];
    const slipsB = [bracket([sb[0], 0, sb[2]]), bracket([sb[0], sb[1] / 2, sb[2]]), bracket([sb[0], sb[1], 2 * b])];
    const signSlip = op === '-' ? [sa[0] - sb[0], sa[1] + sb[1], sa[2] + sb[2]] : [sa[0] + sb[0], sa[1] - sb[1], sa[2] - sb[2]];
    const factored = `${g}(${polyTex(inner, v)})`;
    const half = g % 2 === 0 && g > 2 ? `${g / 2}(${polyTex(total.map((x) => x / (g / 2)), v)})` : `${g * 2}(${polyTex(total, v)})`;
    return {
      kind: 'steps',
      prompt: [
        say(
          `Show that $(${lin(c, a, v)})^2 ${op} (${lin(c, b, v)})^2$ is always a multiple of $${g}$. Tap the part you would do **next**, then choose what it becomes.`,
        ),
      ],
      start: [`(${lin(c, a, v)})^2`, op, `(${lin(c, b, v)})^2`],
      reductions: [
        { span: [0, 1], value: bracket(sa), bank: stepBank(bracket(sa), ...slipsA) },
        { span: [2, 3], value: bracket(sb), bank: stepBank(bracket(sb), ...slipsB) },
        {
          span: [0, 3],
          operator: 1,
          value: polyTex(total, v),
          bank: stepBank(polyTex(total, v), polyTex(signSlip, v), polyTex(total.map((x, i) => (i === 2 ? x + 2 : x)), v)),
        },
        {
          span: [0, 1],
          value: factored,
          bank: stepBank(factored, half, `${g}(${polyTex(total.map((x, i) => (i === 0 ? x / g : x)), v)})`),
        },
      ],
    };
  },
  solution(params) {
    const { c, a, b, op } = params;
    const v = c === 1 ? 'n' : 'k';
    const total = combined(params);
    const g = contentOf(total);
    return [
      { tex: stackTex(`(${lin(c, a, v)})^2 = ${polyTex(squareOf(c, a), v)}`) },
      { tex: stackTex(`(${lin(c, b, v)})^2 = ${polyTex(squareOf(c, b), v)}`) },
      { text: op === '-' ? 'Subtracting changes the sign of every term of the second.' : 'Adding, collect the like terms.' },
      { tex: stackTex(`${polyTex(total, v)} = ${g}(${polyTex(total.map((x) => x / g), v)})`) },
      { text: `The bracket is a whole number, so the whole thing is a multiple of $${g}$.` },
    ];
  },
};

/* ================================================================
 * Lesson 5: rational and irrational numbers
 * ================================================================ */

interface Classified {
  tex: string;
  why: string;
  hard?: boolean;
}

const IRRATIONAL: Classified[] = [
  { tex: '\\sqrt{2}', why: '$2$ is not a square number' },
  { tex: '\\sqrt{3}', why: '$3$ is not a square number' },
  { tex: '\\sqrt{5}', why: '$5$ is not a square number' },
  { tex: '\\sqrt{7}', why: '$7$ is not a square number' },
  { tex: '\\sqrt{10}', why: '$10$ is not a square number' },
  { tex: '\\pi', why: 'its digits never end and never repeat' },
  { tex: '2\\pi', why: 'a whole number times $\\pi$ is irrational' },
  { tex: '1 + \\sqrt{2}', why: 'a rational number plus an irrational one is irrational', hard: true },
  { tex: '3 - \\sqrt{5}', why: 'a rational number minus an irrational one is irrational', hard: true },
  { tex: '\\frac{\\sqrt{3}}{2}', why: 'an irrational number halved is still irrational', hard: true },
  { tex: '0.1010010001\\ldots', why: 'its digits never end and never repeat', hard: true },
  { tex: '\\sqrt{12}', why: '$12$ is not a square number', hard: true },
];

const RATIONAL: Classified[] = [
  { tex: '\\sqrt{16}', why: 'it is $4$' },
  { tex: '\\sqrt{49}', why: 'it is $7$' },
  { tex: '0.\\dot{3}', why: 'it is $\\frac{1}{3}$' },
  { tex: '0.125', why: 'it is $\\frac{1}{8}$' },
  { tex: '-5', why: 'it is $\\frac{-5}{1}$' },
  { tex: '\\frac{7}{3}', why: 'it is a fraction of whole numbers' },
  { tex: '\\frac{22}{7}', why: 'it is a fraction of whole numbers, only close to $\\pi$', hard: true },
  { tex: '3.14', why: 'it is $\\frac{314}{100}$, only close to $\\pi$', hard: true },
  { tex: '(\\sqrt{3})^2', why: 'it is $3$', hard: true },
  { tex: '\\sqrt{0.25}', why: 'it is $0.5 = \\frac{1}{2}$', hard: true },
  { tex: '0.1\\dot{6}', why: 'it is $\\frac{1}{6}$: a recurring decimal', hard: true },
  { tex: '\\sqrt{\\tfrac{9}{4}}', why: 'it is $\\frac{3}{2}$', hard: true },
];

interface RationalParams {
  target: 'rational' | 'irrational';
  pick: number;
  others: number[];
}

const numRationalChoice: Generator<RationalParams> = {
  id: 'num-rational-choice',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const target = hard ? 'rational' : 'irrational';
    const [yes, no] = target === 'irrational' ? [IRRATIONAL, RATIONAL] : [RATIONAL, IRRATIONAL];
    const yesPool = yes.map((c, i) => ({ c, i })).filter(({ c }) => (hard ? true : !c.hard));
    const noPool = no.map((c, i) => ({ c, i })).filter(({ c }) => (hard ? true : !c.hard));
    return {
      target,
      pick: rng.pick(yesPool).i,
      others: rng.sample(noPool, 3).map(({ i }) => i).sort((a, b) => a - b),
    };
  },
  render({ target, pick, others }) {
    const [yes, no] = target === 'irrational' ? [IRRATIONAL, RATIONAL] : [RATIONAL, IRRATIONAL];
    return choiceSlide(
      [say(`Which of these is **${target}**?`)],
      yes[pick].tex,
      others.map((i) => no[i].tex),
    );
  },
  solution({ target, pick, others }) {
    const [yes, no] = target === 'irrational' ? [IRRATIONAL, RATIONAL] : [RATIONAL, IRRATIONAL];
    const other = target === 'irrational' ? 'rational' : 'irrational';
    return [
      { text: 'A rational number is a fraction of two whole numbers. Every terminating or recurring decimal is one.' },
      { text: `$${yes[pick].tex}$ is ${target}: ${yes[pick].why}.` },
      ...others.map((i) => ({ text: `$${no[i].tex}$ is ${other}: ${no[i].why}.` })),
    ];
  },
};

/* ---------- which fractions terminate ---------- */

interface TerminatingParams {
  answer: [number, number];
  others: [number, number][];
}

/** True when n has no prime factor but 2 and 5. */
function onlyTwosAndFives(n: number): boolean {
  let m = n;
  while (m % 2 === 0) m /= 2;
  while (m % 5 === 0) m /= 5;
  return m === 1;
}

function lowest([top, den]: [number, number]): [number, number] {
  const g = gcd(top, den);
  return [top / g, den / g];
}

const fracTex = ([top, den]: [number, number]) => `\\frac{${top}}{${den}}`;

const numTerminating: Generator<TerminatingParams> = {
  id: 'num-terminating',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const topFor = (den: number) => {
      for (;;) {
        const top = rng.int(1, den - 1);
        if (gcd(top, den) === 1) return top;
      }
    };
    for (;;) {
      let answer: [number, number];
      const others: [number, number][] = [];
      if (!hard) {
        const den = rng.pick([4, 5, 8, 16, 20, 25, 40]);
        answer = [topFor(den), den];
        for (const d of rng.sample([3, 6, 7, 9, 11, 12, 15, 30], 3)) others.push([topFor(d), d]);
      } else {
        // The answer hides its 2s and 5s behind a common factor; the traps
        // carry a 2 or a 5 but also something else, or cancel to a 3.
        const den = rng.pick([4, 5, 8, 20]);
        const k = rng.pick([3, 7, 9]);
        const top = topFor(den);
        answer = [top * k, den * k];
        const mixed = rng.pick([12, 14, 15, 24, 35]);
        others.push([topFor(mixed), mixed]);
        const [t, d] = rng.pick([[1, 3], [2, 3], [1, 6], [5, 6], [2, 9], [4, 9]] as const);
        const j = rng.pick([2, 4, 5]);
        others.push([t * j, d * j]);
        const odd = rng.pick([7, 9, 11, 13]);
        others.push([topFor(odd), odd]);
      }
      const all = [answer, ...others];
      const values = new Set(all.map(([t, d]) => t / d));
      if (all.some(([, d]) => d >= 100) || values.size !== 4) continue;
      return { answer, others };
    }
  },
  render({ answer, others }) {
    return choiceSlide(
      [say('Which of these fractions is a **terminating** decimal?')],
      fracTex(answer),
      others.map(fracTex),
    );
  },
  solution({ answer, others }) {
    const why = (f: [number, number]) => {
      const low = lowest(f);
      const shown = low[1] === f[1] ? `$${fracTex(f)}$` : `$${fracTex(f)} = ${fracTex(low)}$`;
      if (onlyTwosAndFives(low[1])) {
        return `${shown}: the denominator is $${productTex(factorise(low[1]))}$, only $2$s and $5$s, so it terminates.`;
      }
      const other = factorise(low[1]).find(([p]) => p !== 2 && p !== 5) as PrimePower;
      return `${shown}: the denominator has a factor $${other[0]}$, so it recurs.`;
    };
    return [
      { text: 'In lowest terms, a fraction terminates exactly when its denominator has no prime factor but $2$ and $5$.' },
      { text: why(answer) },
      ...others.map((f) => ({ text: why(f) })),
    ];
  },
};

/* ---------- recurring decimals ---------- */

interface Fraction {
  num: number;
  den: number;
}

/** The digits after the point: those before the repeat, and the repeating block. */
export function expansion({ num: top, den }: Fraction): { pre: string; period: string } {
  const digits: number[] = [];
  const seen = new Map<number, number>();
  let r = top % den;
  while (r !== 0 && !seen.has(r)) {
    seen.set(r, digits.length);
    r *= 10;
    digits.push(Math.floor(r / den));
    r %= den;
  }
  if (r === 0) return { pre: digits.join(''), period: '' };
  const start = seen.get(r) as number;
  return { pre: digits.slice(0, start).join(''), period: digits.slice(start).join('') };
}

/** `\dot{4}\dot{5}`, `\dot{6}`, `\dot{1}4285\dot{7}`. */
function dotted(period: string): string {
  if (period === '') return '';
  if (period.length === 1) return `\\dot{${period}}`;
  return `\\dot{${period[0]}}${period.slice(1, -1)}\\dot{${period[period.length - 1]}}`;
}

/** The digits after `0.` as the learner writes them. */
function afterPoint(pre: string, period: string): string {
  return `${pre}${dotted(period)}`;
}

/** The value of 0.pre(period), for checking a distractor really differs. */
function decimalValue(pre: string, period: string): number {
  const q = pre.length;
  if (period === '') return Number(pre || '0') / 10 ** q;
  const p = period.length;
  return (Number(pre + period) - Number(pre || '0')) / (10 ** q * (10 ** p - 1));
}

const EASY_DENS = [3, 9, 11, 33];
const HARD_DENS = [6, 12, 15, 18, 22, 27, 30, 37, 45, 90];

function sampleFraction(rng: Rng, difficulty: number): Fraction {
  const hard = difficulty >= 2;
  for (;;) {
    const den = rng.pick(hard ? HARD_DENS : EASY_DENS);
    const top = rng.int(1, den - 1);
    if (gcd(top, den) !== 1) continue;
    const { pre, period } = expansion({ num: top, den });
    if (period === '' || pre.length > 2 || pre.length + period.length > 3) continue;
    if (!hard && pre.length > 0) continue;
    return { num: top, den };
  }
}

const numDecimalTiles: Generator<Fraction & { extra: number }> = {
  id: 'num-decimal-tiles',
  sample(rng, difficulty) {
    return { ...sampleFraction(rng, difficulty), extra: difficulty >= 2 ? 4 : 3 };
  },
  render({ num: top, den, extra }) {
    const { pre, period } = expansion({ num: top, den });
    const value = decimalValue(pre, period);
    const answer = afterPoint(pre, period);
    const rev = period.split('').reverse().join('');
    const candidates: [string, string][] = [
      [pre, rev],
      [pre + period, ''],
      ['', pre + period],
      [pre, period + period[0]],
      [pre.slice(0, -1), pre.slice(-1) + period],
      [`0${pre}`, period],
      [pre, String((Number(period[0]) + 1) % 10) + period.slice(1)],
    ];
    const slips = candidates
      .filter(([a, b]) => a + b !== '' && Math.abs(decimalValue(a, b) - value) > 1e-9)
      .map(([a, b]) => afterPoint(a, b));
    return {
      kind: 'tiles',
      prompt: [say(`Write $${top} \\div ${den}$ as a decimal, with dots over the first and last digits that repeat.`)],
      template: `${top} \\div ${den} = 0.{0}`,
      bank: fillBank([answer], slips, 2, extra),
      answer: [answer],
    };
  },
  solution({ num: top, den }) {
    const { pre, period } = expansion({ num: top, den });
    return [
      { text: `Divide $${top}$ by $${den}$: the remainders start to repeat, so the digits do too.` },
      {
        text: `$${top} \\div ${den} = 0.${pre}${period.repeat(3)}\\ldots$, where ${period.length === 1 ? `the $${period}$ repeats` : `the block $${period}$ repeats`}${pre ? ` after $${pre}$` : ''}.`,
      },
      { tex: stackTex(`${top} \\div ${den} = 0.${afterPoint(pre, period)}`) },
    ];
  },
};

/** The working of 0.pre(period) = D / M, from subtracting two multiples. */
function recurringWork({ num: top, den }: Fraction) {
  const { pre, period } = expansion({ num: top, den });
  const q = pre.length;
  const p = period.length;
  const big = 10 ** (q + p);
  const small = 10 ** q;
  const bigInt = Number(pre + period);
  const smallInt = Number(pre || '0');
  return {
    pre,
    period,
    big,
    small,
    bigTex: `${bigInt}.${dotted(period)}`,
    smallTex: `${smallInt}.${dotted(period)}`,
    d: bigInt - smallInt,
    m: big - small,
  };
}

const numRecurringSteps: Generator<Fraction> = {
  id: 'num-recurring-steps',
  sample: sampleFraction,
  render(fraction) {
    const w = recurringWork(fraction);
    const g = gcd(w.d, w.m);
    const x = (k: number) => (k === 1 ? 'x' : `${k}x`);
    const frac = (a: number, b: number) => `x = \\frac{${a}}{${b}}`;
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [
      { span: [0, 3], operator: 1, value: x(w.m), bank: stepBank(x(w.m), x(w.big + w.small), x(w.big), x(w.m + 1)) },
      {
        span: [2, 5],
        operator: 3,
        value: String(w.d),
        bank: stepBank(String(w.d), String(w.d + 1), String(Number(w.pre + w.period) + Number(w.pre || '0')), String(w.d - 1)),
      },
      { span: [0, 3], operator: 1, value: frac(w.d, w.m), bank: stepBank(frac(w.d, w.m), frac(w.m, w.d), frac(w.d, w.big)) },
    ];
    if (g > 1) {
      reductions.push({
        span: [0, 1],
        value: frac(w.d / g, w.m / g),
        bank: stepBank(frac(w.d / g, w.m / g), frac(w.d / g, w.m), frac(w.d, w.m / g), frac(w.m / g, w.d / g)),
      });
    }
    return {
      kind: 'steps',
      prompt: [
        say(
          `$x = 0.${afterPoint(w.pre, w.period)}$. Multiplying by $${w.big}$${w.small > 1 ? ` and by $${w.small}$` : ''} lines up the repeating digits, so subtracting clears them. Tap the part you would do **next**, then choose what it becomes.`,
        ),
      ],
      start: [x(w.big), '-', x(w.small), '=', w.bigTex, '-', w.smallTex],
      reductions,
    };
  },
  solution(fraction) {
    const w = recurringWork(fraction);
    const g = gcd(w.d, w.m);
    return [
      { tex: stackTex(`${w.big}x = ${w.bigTex},\\quad ${w.small === 1 ? '' : w.small}x = ${w.smallTex}`) },
      { text: 'The digits after the point are the same in both, so subtracting leaves a whole number:' },
      { tex: stackTex(`${w.m}x = ${w.d}`) },
      { tex: stackTex(`x = \\frac{${w.d}}{${w.m}}${g > 1 ? ` = \\frac{${w.d / g}}{${w.m / g}}` : ''}`) },
    ];
  },
};

const numRecurring: Generator<Fraction> = {
  id: 'num-recurring',
  sample: sampleFraction,
  render({ num: top, den }) {
    const { pre, period } = expansion({ num: top, den });
    return {
      kind: 'expression',
      prompt: [say(`Write $0.${afterPoint(pre, period)}$ as a fraction in its simplest form.`)],
      lead: `0.${afterPoint(pre, period)} =`,
      keypad: [{ insert: '/' }],
      answer: `((${top})/(${den}))`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution(fraction) {
    const w = recurringWork(fraction);
    const g = gcd(w.d, w.m);
    return [
      { text: `Let $x = 0.${afterPoint(w.pre, w.period)}$. Multiply so the repeating digits line up, and subtract:` },
      { tex: stackTex(`${w.big}x - ${w.small === 1 ? '' : w.small}x = ${w.bigTex} - ${w.smallTex}`) },
      { tex: stackTex(`${w.m}x = ${w.d}`) },
      { tex: stackTex(`x = \\frac{${w.d}}{${w.m}}${g > 1 ? ` = \\frac{${w.d / g}}{${w.m / g}}` : ''}`) },
    ];
  },
};

export const numberDivisibilityGenerators = [
  numIsPrime,
  numFactorise,
  numFactorReduce,
  numFactorCount,
  numHcfLcmTiles,
  numLcmTree,
  numHcf,
  numHcfFlow,
  numDivisible,
  numDivisFlow,
  numRemainder,
  numDivisionReduce,
  numOrderMultiples,
  numFactorised,
  numAlwaysDivides,
  numParitySteps,
  numRationalChoice,
  numDecimalTiles,
  numRecurringSteps,
  numTerminating,
  numRecurring,
];

/** The order generators, for the reducer harness in `proofOrder.test.ts`. */
export const numberDivisibilityOrders = [numOrderMultiples];
