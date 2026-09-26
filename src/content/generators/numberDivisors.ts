/**
 * Number & Proof, level 11: Divisors and Unique Factorisation.
 *
 * Every whole number above 1 is a product of primes in exactly one way, so
 * questions about divisors are read off the powers rather than worked out by
 * multiplying. The level runs: a divides b exactly when each prime's power in
 * a is at most its power in b, and the quotient's powers are the differences;
 * squares have every power even and cubes every power a multiple of 3, which
 * gives roots and the smallest number to multiply or divide by; the sum of
 * divisors sigma(n) as a product of brackets (1 + p + ... + p^a), since
 * multiplying the brackets out writes each divisor exactly once; perfect,
 * abundant and deficient numbers from sigma(n) - n; and divisors paired d
 * with n / d, which gives the product of the divisors and says that the count
 * is odd exactly when n is a square.
 *
 * Every number written on the page is under 1000. A number bigger than that
 * appears only as its prime factorisation, which is the point of the first two
 * lessons: the powers answer the question without the product being found.
 * Every sigma(n) a slide asks for, and every value in a solution, is under
 * 1000 as well.
 *
 * Nothing here is calculus, so no slide declares `source`.
 * `numberDivisors.test.ts` reads the numbers each prompt states and re-derives
 * every answer by listing divisors one at a time, never by the formulas the
 * generators use.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { choiceSlide, fillBank, orderSlide, orderSolution, pickDistractors, stackTex, turned, type Proof } from './numberProof';
import { say } from './format';
import { treeBank } from './parametricImplicit';

/* ---------- shared helpers ---------- */

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** A prime factorisation: [prime, power] pairs, smallest prime first. Powers may be 0. */
type Factors = [number, number][];

function factorise(n: number): Factors {
  const out: Factors = [];
  let m = n;
  for (let p = 2; p * p <= m; p += 1) {
    if (m % p !== 0) continue;
    let e = 0;
    while (m % p === 0) {
      m /= p;
      e += 1;
    }
    out.push([p, e]);
  }
  if (m > 1) out.push([m, 1]);
  return out;
}

const valueOf = (f: Factors) => f.reduce((acc, [p, e]) => acc * p ** e, 1);

/** The power of p in a factorisation, 0 when p is absent. */
const powerIn = (f: Factors, p: number) => f.find(([q]) => q === p)?.[1] ?? 0;

const sortFactors = (f: Factors): Factors => [...f].filter(([, e]) => e > 0).sort((x, y) => x[0] - y[0]);

/** `p^e`, with no braces for a single-digit power, so it is safe in a tiles template. */
const powTex = (p: number, e: number) => (e === 1 ? `${p}` : e < 10 ? `${p}^${e}` : `${p}^{${e}}`);

/** `2^3 \times 3^2 \times 5`. */
const primeTex = (f: Factors) => sortFactors(f).map(([p, e]) => powTex(p, e)).join(' \\times ') || '1';

const divisorsOf = (n: number) => range(1, n).filter((d) => n % d === 0);
const sigmaOf = (n: number) => divisorsOf(n).reduce((acc, d) => acc + d, 0);
const countOf = (n: number) => divisorsOf(n).length;

/** 1 + p + ... + p^e. */
const bracketValue = (p: number, e: number) => range(0, e).reduce((acc, i) => acc + p ** i, 0);

/** `1 + 2 + 4 + 8`. */
const bracketTex = (p: number, e: number) => range(0, e).map((i) => String(p ** i)).join(' + ');

/** sigma(p^e) worked out: `\sigma(8) = 1 + 2 + 4 + 8`, then `= 15` beneath. */
const bracketLine = (p: number, e: number) =>
  e === 1
    ? `\\sigma(${p}) = 1 + ${p} = ${p + 1}`
    : `\\begin{aligned} \\sigma(${p ** e}) &= ${bracketTex(p, e)} \\\\ &= ${bracketValue(p, e)} \\end{aligned}`;

/** `x`, `x and y`, `x, y and z`. */
const listed = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));

const isPrime = (n: number) => n >= 2 && divisorsOf(n).length === 2;

/** Numbers near a value, for topping up a set of slips that collided. */
function near(value: number, count: number): number[] {
  const out: number[] = [];
  for (let gap = 1; out.length < count; gap += 1) out.push(value + gap, value - gap);
  return out.slice(0, count);
}

/** Four whole-number options: the answer and the first three distinct slips in [min, max]. */
function intOptions(correct: number, slips: number[], min = 1, max = 999): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of [...slips, ...near(correct, 12)]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || value < min || value > max || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  return options(
    { tex: String(correct), answer: String(correct) },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: String(value), answer: String(value) })),
  );
}

/** Three distinct labels for a flow step, the right one first. */
function threeLabels(correct: number, slips: number[]): number[] {
  const out = [correct];
  for (const value of [...slips, ...near(correct, 8)]) {
    if (out.length === 3) break;
    if (!Number.isInteger(value) || value < 1 || value >= 1000 || out.includes(value)) continue;
    out.push(value);
  }
  return out;
}

/** A table bank: the answer as a multiset, plus up to three slips none of the answer uses. */
function tableBank(answer: number[], slips: number[], fallbackFrom: number): string[] {
  const extras: number[] = [];
  for (const value of [...slips, ...range(fallbackFrom, fallbackFrom + 8)]) {
    if (extras.length >= 3) break;
    if (!Number.isInteger(value) || value < 0 || value >= 1000 || answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  return [...answer, ...extras].sort((x, y) => x - y).map(String);
}

/** A whole number typed with `keypad: []`, compared exactly. */
function typed(prompt: string[], lead: string, answer: number) {
  return {
    kind: 'expression' as const,
    prompt: prompt.map(say),
    lead,
    keypad: [],
    answer: String(answer),
    domain: 'real' as const,
    mode: 'exact' as const,
  };
}

/** A random factorisation over `pool`: `count` primes, powers in [lo, hi]. */
function randomFactors(rng: Rng, pool: number[], count: number, lo: number, hi: number): Factors {
  return rng
    .sample(pool, count)
    .sort((x, y) => x - y)
    .map((p) => [p, rng.int(lo, hi)] as [number, number]);
}

/** Does a divide b, read off the powers? */
const dividesBy = (a: Factors, b: Factors) => sortFactors(a).every(([p, e]) => e <= powerIn(b, p));

/* ================================================================
 * Lesson 1: divides, from the powers
 * ================================================================ */

interface DividesParams {
  N: Factors;
  /** The option factorisations, the one that divides N first. */
  opts: Factors[];
}

/** Why a candidate does not divide N, for the worked solution. */
function whyNot(a: Factors, N: Factors): string {
  for (const [p, e] of sortFactors(a)) {
    const f = powerIn(N, p);
    if (f === 0) return `$${primeTex(a)}$: $${p}$ is not a factor of $N$ at all.`;
    if (e > f) return `$${primeTex(a)}$: it has $${powTex(p, e)}$, but $N$ has only $${powTex(p, f)}$.`;
  }
  return '';
}

const dvfDivides: Generator<DividesParams> = {
  id: 'dvf-divides',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const pool = hard ? [2, 3, 5, 7, 11] : [2, 3, 5, 7];
    for (;;) {
      const N = randomFactors(rng, pool, hard ? rng.int(3, 4) : rng.int(2, 3), 1, hard ? 6 : 4);
      const good: Factors = N.map(([p, e]) => [p, rng.int(0, e)]);
      if (sortFactors(good).length < 2 || good.every(([, e], i) => e === N[i][1])) continue;
      // One power pushed past N's, at two different primes, and a prime N lacks.
      const [i, j] = rng.sample(range(0, N.length - 1), 2);
      const over = (k: number, by: number): Factors =>
        good.map(([p, e], idx) => [p, idx === k ? N[k][1] + by : e] as [number, number]);
      const outside = rng.pick([2, 3, 5, 7, 11, 13].filter((p) => powerIn(N, p) === 0));
      const stranger = sortFactors([...good, [outside, rng.int(1, 2)]]);
      const wrong = [over(i, 1), hard ? over(j, rng.int(1, 2)) : over(j, 1), stranger].map(sortFactors);
      const labels = [good, ...wrong].map(primeTex);
      if (new Set(labels).size < 4 || wrong.some((w) => dividesBy(w, N))) continue;
      return { N, opts: [sortFactors(good), ...wrong] };
    }
  },
  render({ N, opts }) {
    return choiceSlide(
      [say(`$N = ${primeTex(N)}$.`), say('Which of these divides $N$?')],
      primeTex(opts[0]),
      opts.slice(1).map(primeTex),
    );
  },
  solution({ N, opts }) {
    return [
      { text: 'A number divides $N$ exactly when each prime’s power in it is at most its power in $N$.' },
      ...opts.slice(1).map((a) => ({ text: whyNot(a, N) })),
      { text: `$${primeTex(opts[0])}$ has every power within $N$’s, so it divides $N$.` },
    ];
  },
};

/* ---------- does a divide b, as a flow ---------- */

type DivCase = 'yes' | 'missing' | 'over';

interface PairParams {
  a: Factors;
  b: Factors;
}

interface FlowParams extends PairParams {
  kind: DivCase;
}

const pairSubject = ({ a, b }: PairParams) => `\\begin{gathered} a = ${primeTex(a)} \\\\ b = ${primeTex(b)} \\end{gathered}`;

const dvfDividesFlow: Generator<FlowParams> = {
  id: 'dvf-divides-flow',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const pool = hard ? [2, 3, 5, 7, 11] : [2, 3, 5, 7];
    for (;;) {
      const kind = rng.pick(['yes', 'missing', 'over'] as const);
      const b = randomFactors(rng, pool, hard ? rng.int(3, 4) : rng.int(2, 3), 1, hard ? 6 : 4);
      let a: Factors = b.map(([p, e]) => [p, rng.int(0, e)]);
      if (kind === 'over') {
        const k = rng.int(0, b.length - 1);
        a[k] = [b[k][0], b[k][1] + rng.int(1, hard ? 2 : 1)];
      }
      if (kind === 'missing') {
        const outside = rng.pick([2, 3, 5, 7, 11, 13].filter((p) => powerIn(b, p) === 0));
        a = [...a, [outside, rng.int(1, 2)]];
      }
      a = sortFactors(a);
      if (a.length < 2 || primeTex(a) === primeTex(b)) continue;
      return { a, b, kind };
    }
  },
  render({ a, b, kind }) {
    const primesOk = kind !== 'missing';
    const divides = kind === 'yes';
    return {
      kind: 'flow',
      prompt: [say('Does $a$ divide $b$? Each answer chooses what gets asked next.')],
      subject: pairSubject({ a, b }),
      steps: [
        {
          id: 'primes',
          ask: 'Does every prime in $a$ appear in $b$?',
          branches: [
            { label: 'Yes', to: 'powers' },
            { label: 'No', to: 'verdict' },
          ],
        },
        {
          id: 'powers',
          ask: 'Is each prime’s power in $a$ at most its power in $b$?',
          branches: [
            { label: 'Yes', to: 'verdict' },
            { label: 'No', to: 'verdict' },
          ],
        },
        {
          id: 'verdict',
          ask: 'So does $a$ divide $b$?',
          branches: [
            { label: 'Yes', outcome: divides ? 'That is the answer.' : 'Look again at the powers of each prime.' },
            { label: 'No', outcome: divides ? 'Every power in $a$ is within $b$’s.' : 'That is the answer.' },
          ],
        },
      ],
      answer: primesOk ? ['Yes', divides ? 'Yes' : 'No', divides ? 'Yes' : 'No'] : ['No', 'No'],
    };
  },
  solution({ a, b, kind }) {
    const lines: SolutionStep[] = sortFactors(a).map(([p, e]) => {
      const f = powerIn(b, p);
      return {
        text:
          f === 0
            ? `$${p}$: in $a$, but not in $b$ at all.`
            : `$${p}$: power $${e}$ in $a$, power $${f}$ in $b$${e > f ? ', too many' : ''}.`,
      };
    });
    return [
      ...lines,
      {
        text:
          kind === 'yes'
            ? 'Every power in $a$ is at most its power in $b$, so $a$ divides $b$.'
            : kind === 'missing'
              ? 'A prime of $a$ is missing from $b$, so $a$ does not divide $b$.'
              : 'One power in $a$ is bigger than in $b$, so $a$ does not divide $b$.',
      },
    ];
  },
};

/* ---------- the quotient's powers ---------- */

/** a dividing b, with b's primes `count` of them and powers in [1, hi]. */
function sampleDividingPair(rng: Rng, pool: number[], count: number, hi: number): PairParams {
  for (;;) {
    const b = randomFactors(rng, pool, count, 1, hi);
    const a: Factors = b.map(([p, e]) => [p, rng.int(0, e)]);
    if (sortFactors(a).length < 2 || a.every(([, e], i) => e === b[i][1])) continue;
    return { a: sortFactors(a), b };
  }
}

const quotientOf = ({ a, b }: PairParams): Factors => b.map(([p, e]) => [p, e - powerIn(a, p)]);

function quotientSolution(params: PairParams, withValue: boolean): SolutionStep[] {
  const { a, b } = params;
  const q = quotientOf(params);
  const steps: SolutionStep[] = [
    { text: '$a$ divides $b$, so take each prime’s power in $a$ from its power in $b$:' },
    ...b.map(([p, e]) => ({ tex: `${p}: \\quad ${e} - ${powerIn(a, p)} = ${e - powerIn(a, p)}` })),
    { tex: `b \\div a = ${primeTex(q)}` },
  ];
  if (withValue) {
    const factors = sortFactors(q).map(([p, e]) => String(p ** e));
    steps.push(
      factors.length > 1
        ? { tex: stackTex(`${factors.join(' \\times ')} = ${valueOf(q)}`) }
        : { text: `That is $${valueOf(q)}$.` },
    );
  }
  return steps;
}

const dvfQuotientTable: Generator<PairParams> = {
  id: 'dvf-quotient-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    return hard ? sampleDividingPair(rng, [2, 3, 5, 7, 11], 4, 7) : sampleDividingPair(rng, [2, 3, 5, 7], 3, 5);
  },
  render(params) {
    const { a, b } = params;
    const answer = quotientOf(params).map(([, e]) => e);
    const slips = b.flatMap(([p, e]) => [e + powerIn(a, p), powerIn(a, p), e]);
    return {
      kind: 'table',
      prompt: [
        say(`$a = ${primeTex(a)}$ and $b = ${primeTex(b)}$.`),
        say('$a$ divides $b$. Fill in the power of each prime in $b \\div a$.'),
      ],
      columns: ['p', '\\text{power in } b \\div a'],
      rows: b.map(([p]) => [String(p), null]),
      bank: tableBank(answer, slips, 0),
      answer: answer.map(String),
    };
  },
  solution: (params) => quotientSolution(params, false),
};

const dvfQuotient: Generator<PairParams> = {
  id: 'dvf-quotient',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const pair = hard ? sampleDividingPair(rng, [2, 3, 5, 7], 3, 6) : sampleDividingPair(rng, [2, 3, 5, 7], rng.int(2, 3), 4);
      const q = valueOf(quotientOf(pair));
      // Difficulty 2 keeps b out of reach of the calculator in one's head.
      if (q < 6 || q > 999 || (hard && valueOf(pair.b) < 1000)) continue;
      if (sortFactors(quotientOf(pair)).length < 2) continue;
      return pair;
    }
  },
  choices(params) {
    const q = quotientOf(params);
    const value = valueOf(q);
    const primes = params.b.map(([p]) => p);
    return intOptions(value, [value * primes[0], value / primes[primes.length - 1], valueOf(params.a), value * primes[1]]);
  },
  render(params) {
    return typed(
      [`$a = ${primeTex(params.a)}$ and $b = ${primeTex(params.b)}$.`, 'Find $b \\div a$ as a number, from the powers.'],
      'b \\div a =',
      valueOf(quotientOf(params)),
    );
  },
  solution: (params) => quotientSolution(params, true),
};

/* ---------- the smallest k for which a divides bk ---------- */

const missingOf = ({ a, b }: PairParams): Factors =>
  sortFactors(a.map(([p, e]) => [p, Math.max(0, e - powerIn(b, p))] as [number, number]));

const dvfMissing: Generator<PairParams> = {
  id: 'dvf-missing',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const pool = hard ? [2, 3, 5, 7, 11] : [2, 3, 5, 7];
    for (;;) {
      const a = randomFactors(rng, pool, hard ? 3 : rng.int(2, 3), 1, hard ? 4 : 3);
      const b = sortFactors(randomFactors(rng, pool, hard ? 3 : 2, 1, 4));
      const k = missingOf({ a, b });
      const shared = a.filter(([p]) => powerIn(b, p) > 0).length;
      // Something shared, something short, and k not simply a itself.
      if (shared === 0 || k.length === 0 || valueOf(k) === valueOf(a) || valueOf(k) > 999) continue;
      if (hard && k.length < 2) continue;
      return { a, b };
    }
  },
  choices(params) {
    const k = valueOf(missingOf(params));
    const bare = missingOf(params).reduce((acc, [p]) => acc * p, 1);
    const whole = valueOf(params.a);
    return intOptions(k, [bare, whole, k * missingOf(params)[0][0], k * params.b[0][0]]);
  },
  render(params) {
    return typed(
      [
        `$a = ${primeTex(params.a)}$ and $b = ${primeTex(params.b)}$.`,
        'Find the smallest whole number $k$ for which $a$ divides $b \\times k$.',
      ],
      'k =',
      valueOf(missingOf(params)),
    );
  },
  solution(params) {
    const { a, b } = params;
    const k = missingOf(params);
    return [
      { text: 'Each prime’s power in $b \\times k$ must reach its power in $a$. $k$ supplies only what $b$ is short of:' },
      ...a.map(([p, e]) => {
        const f = powerIn(b, p);
        return { tex: `${p}: \\quad \\text{need } ${e}, \\ \\text{have } ${f}` };
      }),
      { tex: stackTex(`k = ${primeTex(k)} = ${valueOf(k)}`) },
    ];
  },
};

/* ================================================================
 * Lesson 2: squares and cubes
 * ================================================================ */

interface PowerChoiceParams {
  k: number;
  opts: Factors[];
}

const powerWord = (k: number) => (k === 2 ? 'square' : 'cube');
const isKth = (f: Factors, k: number) => sortFactors(f).every(([, e]) => e % k === 0);

const dvfIsSquare: Generator<PowerChoiceParams> = {
  id: 'dvf-is-square',
  sample(rng, difficulty) {
    const k = difficulty >= 2 ? 3 : 2;
    for (;;) {
      const good = randomFactors(rng, [2, 3, 5, 7, 11], rng.int(2, 3), 1, k === 2 ? 3 : 2).map(
        ([p, e]) => [p, e * k] as [number, number],
      );
      const nudge = (i: number, by: number): Factors => good.map(([p, e], idx) => [p, idx === i ? e + by : e] as [number, number]);
      const [i, j] = rng.sample(range(0, good.length - 1), 2);
      // A cube has a square-looking trap (every power even) and a square a
      // cube-looking one (every power 3).
      const trap: Factors = good.map(([p]) => [p, k === 2 ? 3 : 2 * rng.int(1, 2)] as [number, number]);
      const wrong = [nudge(i, 1), nudge(j, -1), trap];
      const labels = [good, ...wrong].map(primeTex);
      if (new Set(labels).size < 4 || wrong.some((w) => isKth(w, k) || sortFactors(w).length < 2)) continue;
      return { k, opts: [good, ...wrong] };
    }
  },
  render({ k, opts }) {
    return choiceSlide(
      [say(`Which of these is a perfect ${powerWord(k)}?`)],
      primeTex(opts[0]),
      opts.slice(1).map(primeTex),
    );
  },
  solution({ k, opts }) {
    return [
      {
        text:
          k === 2
            ? 'A perfect square has every prime’s power even.'
            : 'A perfect cube has every prime’s power a multiple of $3$.',
      },
      ...opts.slice(1).map((w) => {
        const bad = sortFactors(w).find(([, e]) => e % k !== 0)!;
        return { text: `$${primeTex(w)}$: the power of $${bad[0]}$ is $${bad[1]}$.` };
      }),
      { text: `$${primeTex(opts[0])}$ has powers ${sortFactors(opts[0]).map(([, e]) => `$${e}$`).join(', ')}, so it is a perfect ${powerWord(k)}.` },
    ];
  },
};

interface RootParams {
  k: number;
  /** The root's factorisation. */
  r: Factors;
}

const raised = (r: Factors, k: number): Factors => r.map(([p, e]) => [p, e * k]);
const rootSign = (k: number) => (k === 2 ? '\\sqrt{N}' : '\\sqrt[3]{N}');

const dvfRoot: Generator<RootParams> = {
  id: 'dvf-root',
  sample(rng, difficulty) {
    const k = difficulty >= 2 ? 3 : 2;
    for (;;) {
      const r = randomFactors(rng, [2, 3, 5, 7, 11], rng.int(2, 3), 1, k === 2 ? 4 : 3);
      const value = valueOf(r);
      if (value < 10 || value > 999) continue;
      return { k, r };
    }
  },
  choices({ k, r }) {
    const value = valueOf(r);
    const bare = r.reduce((acc, [p]) => acc * p, 1);
    const shy = valueOf(r.map(([p, e]) => [p, e * k - 1] as [number, number]));
    return intOptions(value, [value * r[0][0], value / r[0][0], bare === value ? value * r[1][0] : bare, shy]);
  },
  render({ k, r }) {
    return typed(
      [`$N = ${primeTex(raised(r, k))}$.`, `Find $${rootSign(k)}$ from the powers.`],
      `${rootSign(k)} =`,
      valueOf(r),
    );
  },
  solution({ k, r }) {
    const factors = r.map(([p, e]) => String(p ** e));
    return [
      { text: `${k === 2 ? 'Halve' : 'Divide by $3$'} every power:` },
      { tex: `${rootSign(k)} = ${primeTex(r)}` },
      factors.length > 1 ? { tex: stackTex(`${factors.join(' \\times ')} = ${valueOf(r)}`) } : { text: `That is $${valueOf(r)}$.` },
    ];
  },
};

/* ---------- the smallest multiplier and divisor ---------- */

interface MakeParams {
  n: number;
  k: number;
}

/** The smallest m with n x m a perfect k-th power. */
const topUp = (n: number, k: number): Factors =>
  sortFactors(factorise(n).map(([p, e]) => [p, (k - (e % k)) % k] as [number, number]));

/** The smallest d with n / d a perfect k-th power. */
const takeOff = (n: number, k: number): Factors => sortFactors(factorise(n).map(([p, e]) => [p, e % k] as [number, number]));

function sampleMake(rng: Rng, k: number, fits: (n: number) => boolean): MakeParams {
  for (;;) {
    const n = rng.int(24, 999);
    const f = factorise(n);
    if (f.length < 2 || !f.some(([, e]) => e >= k) || isKth(f, k) || !fits(n)) continue;
    return { n, k };
  }
}

const dvfPowerTable: Generator<MakeParams> = {
  id: 'dvf-power-table',
  sample(rng, difficulty) {
    const k = difficulty >= 2 ? 3 : 2;
    return sampleMake(rng, k, (n) => valueOf(topUp(n, k)) <= 999 && factorise(n).length <= 3);
  },
  render({ n, k }) {
    const f = factorise(n);
    const answer = f.flatMap(([p, e]) => [e, powerIn(topUp(n, k), p)]);
    return {
      kind: 'table',
      prompt: [
        say(`$${n} \\times k$ is to be a perfect ${powerWord(k)}, with $k$ as small as possible.`),
        say(`Fill in each prime’s power in $${n}$ and in $k$.`),
      ],
      columns: ['p', `\\text{in } ${n}`, '\\text{in } k'],
      rows: f.map(([p]) => [String(p), null, null]),
      bank: tableBank(answer, [k, k + 1, 0, 1, 2, 3, 4], 0),
      answer: answer.map(String),
    };
  },
  solution({ n, k }) {
    const f = factorise(n);
    const m = topUp(n, k);
    return [
      { tex: `${n} = ${primeTex(f)}` },
      {
        text:
          k === 2
            ? 'Each odd power needs one more of its prime to make it even:'
            : 'Each power is topped up to the next multiple of $3$:',
      },
      ...f.map(([p, e]) => ({ tex: `${p}: \\quad ${e} + ${powerIn(m, p)} = ${e + powerIn(m, p)}` })),
      { tex: stackTex(`k = ${primeTex(m)} = ${valueOf(m)}`) },
    ];
  },
};

function makeSolution(n: number, k: number, m: Factors, verb: 'multiply' | 'divide'): SolutionStep[] {
  const f = factorise(n);
  const result: Factors = f.map(([p, e]) => [p, verb === 'multiply' ? e + powerIn(m, p) : e - powerIn(m, p)]);
  const root = valueOf(result.map(([p, e]) => [p, e / k] as [number, number]));
  const sign = verb === 'multiply' ? '\\times' : '\\div';
  return [
    { tex: `${n} = ${primeTex(f)}` },
    {
      text:
        verb === 'multiply'
          ? k === 2
            ? 'Give each odd power one more of its prime:'
            : 'Top each power up to the next multiple of $3$:'
          : k === 2
            ? 'Take one of each prime with an odd power away:'
            : 'Take each power down to the multiple of $3$ below it:',
    },
    { tex: stackTex(`${verb === 'multiply' ? 'k' : 'd'} = ${primeTex(m)} = ${valueOf(m)}`) },
    { text: `Check: every power in $${n} ${sign} ${valueOf(m)}$ is now ${k === 2 ? 'even' : 'a multiple of $3$'}.` },
    { tex: `${n} ${sign} ${valueOf(m)} = ${primeTex(result)}` },
    { text: `That is $${root}^${k}$.` },
  ];
}

const dvfMultiplier: Generator<MakeParams> = {
  id: 'dvf-multiplier',
  sample(rng, difficulty) {
    const k = difficulty >= 2 ? 3 : 2;
    return sampleMake(rng, k, (n) => valueOf(topUp(n, k)) <= 999);
  },
  choices({ n, k }) {
    const m = valueOf(topUp(n, k));
    const odd = factorise(n).filter(([, e]) => e % k !== 0).reduce((acc, [p]) => acc * p, 1);
    return intOptions(m, [odd, n, m * factorise(n)[0][0], valueOf(takeOff(n, k))]);
  },
  render({ n, k }) {
    return typed(
      [`Find the smallest whole number $k$ for which $${n} \\times k$ is a perfect ${powerWord(k)}.`],
      'k =',
      valueOf(topUp(n, k)),
    );
  },
  solution: ({ n, k }) => makeSolution(n, k, topUp(n, k), 'multiply'),
};

const dvfDivide: Generator<MakeParams> = {
  id: 'dvf-divide',
  sample(rng, difficulty) {
    const k = difficulty >= 2 ? 3 : 2;
    return sampleMake(rng, k, (n) => valueOf(takeOff(n, k)) > 1 && n / valueOf(takeOff(n, k)) > 1);
  },
  choices({ n, k }) {
    const d = valueOf(takeOff(n, k));
    return intOptions(d, [valueOf(topUp(n, k)), d * factorise(n)[0][0], n / d, factorise(n).reduce((acc, [p]) => acc * p, 1)]);
  },
  render({ n, k }) {
    return typed(
      [`Find the smallest whole number $d$ for which $${n} \\div d$ is a perfect ${powerWord(k)}.`],
      'd =',
      valueOf(takeOff(n, k)),
    );
  },
  solution: ({ n, k }) => makeSolution(n, k, takeOff(n, k), 'divide'),
};

/* ================================================================
 * Lesson 3: the sum of divisors
 * ================================================================ */

interface NParams {
  n: number;
}

const divisorList = (n: number) => divisorsOf(n).map((d) => `$${d}$`).join(', ');

const dvfSigmaList: Generator<NParams> = {
  id: 'dvf-sigma-list',
  sample(rng, difficulty) {
    for (;;) {
      const n = difficulty >= 2 ? rng.int(61, 150) : rng.int(10, 60);
      if (isPrime(n) || sigmaOf(n) > 999) continue;
      return { n };
    }
  },
  choices({ n }) {
    const s = sigmaOf(n);
    return intOptions(s, [s - n, s - 1, countOf(n), s - 1 - n]);
  },
  render({ n }) {
    return typed([`Find $\\sigma(${n})$, the sum of all the positive divisors of $${n}$.`], `\\sigma(${n}) =`, sigmaOf(n));
  },
  solution({ n }) {
    return [
      { text: `The divisors of $${n}$, $1$ and $${n}$ included, are ${divisorList(n)}.` },
      { text: `They add to $${sigmaOf(n)}$, so $\\sigma(${n}) = ${sigmaOf(n)}$.` },
    ];
  },
};

/** n from `count` primes, sigma(n) and n both under 1000, not every power 1 unless `plain`. */
function sampleSigma(rng: Rng, count: number, plain = true): NParams {
  for (;;) {
    const f = randomFactors(rng, [2, 3, 5, 7, 11, 13], count, 1, 4);
    const n = valueOf(f);
    if (n > 999 || sigmaOf(n) > 999) continue;
    if (!plain && f.every(([, e]) => e === 1)) continue;
    return { n };
  }
}

function sigmaSolution(n: number): SolutionStep[] {
  const f = factorise(n);
  const brackets = f.map(([p, e]) => bracketValue(p, e));
  return [
    { tex: `${n} = ${primeTex(f)}` },
    { text: 'One bracket per prime, from $1$ up to its full power:' },
    ...f.map(([p, e]) => ({ tex: bracketLine(p, e) })),
    { tex: stackTex(`\\sigma(${n}) = ${brackets.join(' \\times ')} = ${sigmaOf(n)}`) },
  ];
}

const dvfSigmaTree: Generator<NParams> = {
  id: 'dvf-sigma-tree',
  sample: (rng, difficulty) => sampleSigma(rng, difficulty >= 2 ? 3 : 2, false),
  render({ n }) {
    const f = factorise(n);
    const brackets = f.map(([p, e]) => bracketValue(p, e));
    const answer = [...brackets, sigmaOf(n)];
    const slips = [
      ...f.map(([p, e]) => p ** (e + 1)),
      ...brackets.map((b) => b - 1),
      brackets.reduce((x, y) => x + y, 0),
      sigmaOf(n) - n,
    ];
    return {
      kind: 'tree',
      prompt: [
        say(`$${n} = ${primeTex(f)}$.`),
        say(
          `From the left, the top boxes hold ${listed(f.map(([p, e]) => `$\\sigma(${p ** e})$`))}; the last box holds $\\sigma(${n})$.`,
        ),
      ],
      expression: `\\sigma(${n})`,
      nodes: [...f.map((_, i) => ({ id: `b${i}`, from: [] })), { id: 'all', from: f.map((_, i) => `b${i}`) }],
      bank: treeBank(answer, slips.filter((x) => x > 0 && x < 1000)),
      answer: answer.map(String),
    };
  },
  solution: ({ n }) => sigmaSolution(n),
};

const dvfSigma: Generator<NParams> = {
  id: 'dvf-sigma',
  sample(rng, difficulty) {
    for (;;) {
      const { n } = sampleSigma(rng, difficulty >= 2 ? 3 : 2, difficulty >= 2);
      if (n >= 30) return { n };
    }
  },
  choices({ n }) {
    const f = factorise(n);
    const s = sigmaOf(n);
    const ends = f.reduce((acc, [p, e]) => acc * (p ** e + 1), 1);
    const added = f.reduce((acc, [p, e]) => acc + bracketValue(p, e), 0);
    return intOptions(s, [s - n, ends, added, countOf(n)]);
  },
  render({ n }) {
    return typed([`Find $\\sigma(${n})$ from the prime factors of $${n}$.`], `\\sigma(${n}) =`, sigmaOf(n));
  },
  solution: ({ n }) => sigmaSolution(n),
};

/* ---------- the grid of divisors: why the brackets multiply ---------- */

interface GridParams {
  p: number;
  a: number;
  q: number;
  b: number;
  /** Blank cells, as row * (b + 1) + column. */
  blanks: number[];
}

const dvfDivisorGrid: Generator<GridParams> = {
  id: 'dvf-divisor-grid',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const [p, q] = rng.sample([2, 3, 5, 7, 11], 2).sort((x, y) => x - y);
      const a = rng.int(1, hard ? 4 : 3);
      const b = rng.int(1, hard ? 3 : 2);
      const n = p ** a * q ** b;
      if (n > 999 || sigmaOf(n) > 999 || a * b < (hard ? 4 : 2)) continue;
      // Only products are blanked: the first row and column are the powers themselves.
      const inner = range(1, a).flatMap((i) => range(1, b).map((j) => i * (b + 1) + j));
      const blanks = rng.sample(inner, Math.min(inner.length, hard ? 5 : 3)).sort((x, y) => x - y);
      return { p, a, q, b, blanks };
    }
  },
  render({ p, a, q, b, blanks }) {
    const n = p ** a * q ** b;
    const cell = (i: number, j: number) => p ** i * q ** j;
    const answer = blanks.map((c) => cell(Math.floor(c / (b + 1)), c % (b + 1)));
    const slips = blanks.flatMap((c) => {
      const [i, j] = [Math.floor(c / (b + 1)), c % (b + 1)];
      return [p ** i + q ** j, p * i * q ** j, p ** i * q * j];
    });
    return {
      kind: 'table',
      prompt: [
        say(`Every divisor of $${n} = ${primeTex([[p, a], [q, b]])}$ is a power of $${p}$ times a power of $${q}$.`),
        say('Fill in the grid of products. Its entries are the divisors, each once.'),
      ],
      columns: ['\\times', ...range(0, b).map((j) => String(q ** j))],
      rows: range(0, a).map((i) => [
        String(p ** i),
        ...range(0, b).map((j) => (blanks.includes(i * (b + 1) + j) ? null : String(cell(i, j)))),
      ]),
      bank: tableBank(answer, slips.filter((x) => x > 1 && !divisorsOf(n).includes(x)), n + 1),
      answer: answer.map(String),
    };
  },
  solution({ p, a, q, b, blanks }) {
    const n = p ** a * q ** b;
    return [
      ...blanks.map((c) => {
        const [i, j] = [Math.floor(c / (b + 1)), c % (b + 1)];
        return { tex: `${p ** i} \\times ${q ** j} = ${p ** i * q ** j}` };
      }),
      { text: `Each row is one term of $(${bracketTex(p, a)})$ and each column one term of $(${bracketTex(q, b)})$.` },
      {
        text: `So adding the whole grid is multiplying the brackets out: $\\sigma(${n}) = ${bracketValue(p, a)} \\times ${bracketValue(q, b)} = ${sigmaOf(n)}$.`,
      },
    ];
  },
};

/* ---------- sigma of a product of numbers sharing no prime ---------- */

interface SplitParams {
  P: number;
  Q: number;
}

const coprime = (x: number, y: number) => factorise(x).every(([p]) => y % p !== 0);

const dvfSigmaTiles: Generator<SplitParams> = {
  id: 'dvf-sigma-tiles',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const P = hard ? rng.int(6, 60) : rng.pick([2, 3, 5, 7]) ** rng.int(1, 4);
      const Q = hard ? rng.int(6, 60) : rng.pick([3, 5, 7, 11, 13]) ** rng.int(1, 2);
      if (P >= Q || !coprime(P, Q) || P * Q > 999 || sigmaOf(P * Q) > 999) continue;
      if (P < 4 && Q < 4) continue;
      if (hard && factorise(P).length < 2 && factorise(Q).length < 2) continue;
      if (!hard && P < 4) continue;
      return { P, Q };
    }
  },
  render({ P, Q }) {
    const n = P * Q;
    const [sp, sq, sn] = [sigmaOf(P), sigmaOf(Q), sigmaOf(n)];
    const answer = [String(sp), String(sq), String(sn)];
    const distractors = [sp + sq, P + 1, Q + 1, sn - n, sp - 1, sq - 1, n + 1].map(String);
    return {
      kind: 'tiles',
      prompt: [
        say(`$${n} = ${P} \\times ${Q}$, and $${P}$ and $${Q}$ share no prime factor.`),
        say(`Fill in $\\sigma$ of each, then $\\sigma(${n})$.`),
      ],
      template: `\\sigma(${P}) = {0}, \\ \\sigma(${Q}) = {1}, \\ \\sigma(${n}) = {2}`,
      bank: fillBank(answer, distractors, 2, 3),
      answer,
    };
  },
  solution({ P, Q }) {
    const n = P * Q;
    return [
      ...[P, Q].flatMap((m) => {
        const f = factorise(m);
        return f.length === 1
          ? [{ tex: bracketLine(f[0][0], f[0][1]) }]
          : [
              { tex: `${m} = ${primeTex(f)}` },
              { tex: stackTex(`\\sigma(${m}) = ${f.map(([p, e]) => bracketValue(p, e)).join(' \\times ')} = ${sigmaOf(m)}`) },
            ];
      }),
      { text: `$${P}$ and $${Q}$ share no prime, so their brackets are separate and the sums multiply:` },
      { tex: stackTex(`\\sigma(${n}) = ${sigmaOf(P)} \\times ${sigmaOf(Q)} = ${sigmaOf(n)}`) },
    ];
  },
};

/* ================================================================
 * Lesson 4: perfect, abundant and deficient
 * ================================================================ */

type Kind = 'Perfect' | 'Abundant' | 'Deficient';

const kindOf = (n: number): Kind => {
  const s = sigmaOf(n) - n;
  return s === n ? 'Perfect' : s > n ? 'Abundant' : 'Deficient';
};

/** n composite (or perfect) in [lo, hi] of the given kind, sigma(n) under 1000. */
function sampleKind(rng: Rng, lo: number, hi: number): NParams {
  const pool = range(lo, hi).filter((n) => !isPrime(n) && sigmaOf(n) <= 999);
  const kind = rng.pick(['Perfect', 'Abundant', 'Deficient'].filter((k) => pool.some((n) => kindOf(n) === k)) as Kind[]);
  // Perfect numbers are rare, so they come up a third as often as the others.
  const chosen = kind === 'Perfect' && rng.chance(0.67) ? rng.pick(['Abundant', 'Deficient'] as Kind[]) : kind;
  return { n: rng.pick(pool.filter((n) => kindOf(n) === chosen)) };
}

const properSolution = (n: number): SolutionStep[] => {
  const s = sigmaOf(n) - n;
  const f = factorise(n);
  const proper = divisorsOf(n).filter((d) => d < n);
  return [
    proper.length <= 8
      ? { text: `The proper divisors of $${n}$ are ${proper.map((d) => `$${d}$`).join(', ')}, which add to $${s}$.` }
      : { tex: stackTex(`\\sigma(${n}) = ${f.map(([p, e]) => bracketValue(p, e)).join(' \\times ')} = ${sigmaOf(n)}`) },
    { tex: stackTex(`\\sigma(${n}) - ${n} = ${s}`) },
    {
      text:
        s === n
          ? `That is exactly $${n}$, so $${n}$ is perfect.`
          : s > n
            ? `$${s} > ${n}$, so $${n}$ is abundant.`
            : `$${s} < ${n}$, so $${n}$ is deficient.`,
    },
  ];
};

const dvfClassify: Generator<NParams> = {
  id: 'dvf-classify',
  sample: (rng, difficulty) => (difficulty >= 2 ? sampleKind(rng, 61, 500) : sampleKind(rng, 6, 60)),
  render({ n }) {
    const kind = kindOf(n);
    return choiceSlide(
      [say(`Is $${n}$ perfect, abundant or deficient?`)],
      kind,
      (['Perfect', 'Abundant', 'Deficient'] as Kind[]).filter((k) => k !== kind),
      true,
    );
  },
  solution: ({ n }) => properSolution(n),
};

const dvfProperSum: Generator<NParams> = {
  id: 'dvf-proper-sum',
  sample(rng, difficulty) {
    for (;;) {
      const n = difficulty >= 2 ? rng.int(100, 500) : rng.int(12, 80);
      if (isPrime(n) || sigmaOf(n) > 999) continue;
      return { n };
    }
  },
  choices({ n }) {
    const s = sigmaOf(n) - n;
    return intOptions(s, [sigmaOf(n), s - 1, s + n, countOf(n)]);
  },
  render({ n }) {
    return typed([`Find the sum of the proper divisors of $${n}$: every divisor except $${n}$ itself.`], `\\sigma(${n}) - ${n} =`, sigmaOf(n) - n);
  },
  solution: ({ n }) => properSolution(n).slice(0, 2),
};

const dvfClassifyFlow: Generator<NParams> = {
  id: 'dvf-classify-flow',
  sample: (rng, difficulty) => (difficulty >= 2 ? sampleKind(rng, 61, 500) : sampleKind(rng, 12, 60)),
  render({ n }) {
    const s = sigmaOf(n);
    const kind = kindOf(n);
    const key = `dvf|${n}`;
    const dollars = (values: number[]) => turned(values.map((v) => `$${v}$`), key);
    return {
      kind: 'flow',
      prompt: [say(`Decide what kind of number $${n}$ is. Each answer chooses what gets asked next.`)],
      subject: `n = ${n}`,
      steps: [
        {
          id: 'sigma',
          ask: `$\\sigma(${n})$ is`,
          branches: dollars(threeLabels(s, [s - n, s - 1, s + 1])).map((label) => ({ label, to: 'proper' })),
        },
        {
          id: 'proper',
          ask: `So the proper divisors of $${n}$ add to`,
          branches: dollars(threeLabels(s - n, [s, s - n - 1, s - n + 1])).map((label) => ({ label, to: 'verdict' })),
        },
        {
          id: 'verdict',
          ask: `So $${n}$ is`,
          branches: (['Perfect', 'Abundant', 'Deficient'] as Kind[]).map((label) => ({
            label,
            outcome: label === kind ? 'That is the answer.' : `Compare $${s - n}$ with $${n}$ again.`,
          })),
        },
      ],
      answer: [`$${s}$`, `$${s - n}$`, kind],
    };
  },
  solution: ({ n }) => properSolution(n),
};

interface AbundantParams {
  nums: number[];
}

const dvfWhichAbundant: Generator<AbundantParams> = {
  id: 'dvf-which-abundant',
  sample(rng, difficulty) {
    const [lo, hi] = difficulty >= 2 ? [50, 150] : [10, 50];
    const pool = range(lo, hi).filter((n) => !isPrime(n) && sigmaOf(n) <= 999);
    const yes = rng.pick(pool.filter((n) => kindOf(n) === 'Abundant'));
    const no = rng.sample(pool.filter((n) => kindOf(n) !== 'Abundant'), 3).sort((x, y) => x - y);
    return { nums: [yes, ...no] };
  },
  render({ nums }) {
    return choiceSlide([say('Which of these numbers is abundant?')], String(nums[0]), nums.slice(1).map(String));
  },
  solution({ nums }) {
    return [
      { text: 'Add the proper divisors of each and compare with the number:' },
      ...[...nums].sort((x, y) => x - y).map((n) => {
        const s = sigmaOf(n) - n;
        return { tex: `${n}: \\quad ${s} ${s > n ? '>' : s === n ? '=' : '<'} ${n}` };
      }),
      { text: `Only $${nums[0]}$ has proper divisors adding to more than itself.` },
    ];
  },
};

/* ---------- 2^k times an odd prime ---------- */

interface TwoPowerParams {
  k: number;
  q: number;
}

const dvfTwoPowerTree: Generator<TwoPowerParams> = {
  id: 'dvf-two-power-tree',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const k = hard ? rng.int(2, 5) : rng.int(1, 4);
      const q = rng.pick(range(3, hard ? 61 : 31).filter(isPrime));
      const n = 2 ** k * q;
      if (n > 999 || sigmaOf(n) > 999) continue;
      return { k, q };
    }
  },
  render({ k, q }) {
    const n = 2 ** k * q;
    const a = 2 ** (k + 1) - 1;
    const answer = [a, q + 1, a * (q + 1), a * (q + 1) - n];
    const slips = [2 ** (k + 1), q, a + q + 1, n, a * (q + 1) + n, 2 ** k - 1];
    return {
      kind: 'tree',
      prompt: [
        say(`$${n} = ${powTex(2, k)} \\times ${q}$.`),
        say(
          `From the left, the top boxes hold $\\sigma(${2 ** k})$ and $\\sigma(${q})$. Below them is $\\sigma(${n})$, and last $\\sigma(${n}) - ${n}$.`,
        ),
      ],
      expression: `\\sigma(${n}) - ${n}`,
      nodes: [
        { id: 'two', from: [] },
        { id: 'odd', from: [] },
        { id: 'all', from: ['two', 'odd'] },
        { id: 'proper', from: ['all'] },
      ],
      bank: treeBank(answer, slips.filter((x) => x > 0 && x < 1000)),
      answer: answer.map(String),
    };
  },
  solution({ k, q }) {
    const n = 2 ** k * q;
    const a = 2 ** (k + 1) - 1;
    const s = a * (q + 1);
    return [
      { tex: bracketLine(2, k) },
      { tex: `\\sigma(${q}) = ${q} + 1 = ${q + 1}` },
      { tex: stackTex(`\\sigma(${n}) = ${a} \\times ${q + 1} = ${s}`) },
      { tex: stackTex(`\\sigma(${n}) - ${n} = ${s - n}`) },
      {
        text:
          s - n === n
            ? `That is $${n}$ itself: $${n}$ is perfect, since $${q} = ${a}$ is prime.`
            : `$${s - n} ${s - n > n ? '>' : '<'} ${n}$, so $${n}$ is ${s - n > n ? 'abundant' : 'deficient'}.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 5: pairing divisors
 * ================================================================ */

interface PairTableParams {
  n: number;
  /** Rows whose left-hand divisor is also blank (difficulty 2). */
  hidden: number[];
}

/** Divisors up to the square root, smallest first. */
const lowDivisors = (n: number) => divisorsOf(n).filter((d) => d * d <= n);

const dvfPairTable: Generator<PairTableParams> = {
  id: 'dvf-pair-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? (rng.chance(0.5) ? rng.int(10, 20) ** 2 : rng.int(100, 400)) : rng.int(24, 240);
      const low = lowDivisors(n);
      if (low.length < (hard ? 5 : 4) || low.length > 6 || (!hard && isSquare(n))) continue;
      const hidden = hard ? rng.sample(range(1, low.length - 1), 2).sort((x, y) => x - y) : [];
      return { n, hidden };
    }
  },
  render({ n, hidden }) {
    const low = lowDivisors(n);
    const answer = low.flatMap((d, i) => (hidden.includes(i) ? [d, n / d] : [n / d]));
    const slips = low.flatMap((d) => [n / d + 1, n / d - 1, d + 1]).filter((x) => !divisorsOf(n).includes(x));
    return {
      kind: 'table',
      prompt: [
        say(`The divisors of $${n}$ in pairs $d$ and $${n} \\div d$. The left column holds every divisor up to $\\sqrt{${n}}$, smallest first.`),
        say('Fill in the gaps.'),
      ],
      columns: ['d', `${n} \\div d`],
      rows: low.map((d, i) => [hidden.includes(i) ? null : String(d), null]),
      bank: tableBank(answer, slips, n),
      answer: answer.map(String),
    };
  },
  solution({ n }) {
    const low = lowDivisors(n);
    return [
      ...low.map((d) => ({ tex: `${d} \\times ${n / d} = ${n}` })),
      {
        text: isSquare(n)
          ? `$${Math.sqrt(n)}$ pairs with itself, so $${n}$ has $${2 * low.length - 1}$ divisors.`
          : `No divisor pairs with itself, so $${n}$ has $${2 * low.length}$ divisors.`,
      },
    ];
  },
};

interface OddCountParams {
  /** Difficulty 1: numbers, the square first. */
  nums: number[];
  /** Difficulty 2: factorisations, the square first. */
  opts: Factors[];
}

const dvfOddCount: Generator<OddCountParams> = {
  id: 'dvf-odd-count',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      for (;;) {
        const m = rng.int(5, 31);
        const others = [m * m - 1, m * m + 1, m * m + m, (m - 1) * m, m * m + 2 * m, m * m - 2].filter(
          (x) => x > 20 && x < 1000 && !isSquare(x),
        );
        if (others.length < 3 || m * m > 999) continue;
        return { nums: [m * m, ...rng.sample(others, 3).sort((x, y) => x - y)], opts: [] };
      }
    }
    for (;;) {
      const good = randomFactors(rng, [2, 3, 5, 7, 11], rng.int(2, 3), 1, 3).map(([p, e]) => [p, 2 * e] as [number, number]);
      const wrong = rng.sample(range(0, good.length - 1).flatMap((i) => [[i, 1], [i, -1]] as const), 3).map(
        ([i, by]) => good.map(([p, e], idx) => [p, idx === i ? e + by : e] as [number, number]),
      );
      if (new Set([good, ...wrong].map(primeTex)).size < 4) continue;
      return { nums: [], opts: [good, ...wrong] };
    }
  },
  render({ nums, opts }) {
    const [correct, ...rest] = nums.length > 0 ? nums.map(String) : opts.map(primeTex);
    return choiceSlide([say('Which of these has an odd number of divisors?')], correct, rest);
  },
  solution({ nums, opts }) {
    if (nums.length > 0) {
      return [
        { text: 'Divisors pair up $d$ with $n \\div d$, and only a square has a divisor paired with itself. So only a square has an odd number of divisors.' },
        { text: `$${nums[0]} = ${Math.sqrt(nums[0])}^2$, and none of ${nums.slice(1).map((x) => `$${x}$`).join(', ')} is a square.` },
      ];
    }
    return [
      { text: 'Only a square has an odd number of divisors, and a square has every power even.' },
      { text: `$${primeTex(opts[0])}$ has every power even. Each of the others has an odd power.` },
      { text: `The count agrees: $${sortFactors(opts[0]).map(([, e]) => `(${e} + 1)`).join('')} = ${sortFactors(opts[0]).reduce((acc, [, e]) => acc * (e + 1), 1)}$, odd.` },
    ];
  },
};

/* ---------- a non-square has an even number of divisors ---------- */

interface PairOrderParams {
  n: number;
  difficulty: number;
  picks: number[];
}

function pairProof({ n }: PairOrderParams): Proof {
  const k = Math.floor(Math.sqrt(n));
  return {
    claim: `Prove that $${n}$ has an even number of divisors.`,
    steps: [
      `Each divisor $d$ of $${n}$ pairs with $${n} \\div d$, which also divides $${n}$.`,
      `A divisor pairs with itself only when $d = ${n} \\div d$, that is $d^2 = ${n}$.`,
      `$${n}$ lies between $${k}^2 = ${k * k}$ and $${k + 1}^2 = ${(k + 1) ** 2}$, so no whole number squares to $${n}$.`,
      `So no divisor pairs with itself: the divisors split into pairs of two different numbers.`,
      `So $${n}$ has an even number of divisors.`,
    ],
    pool: [
      {
        text: `A divisor pairs with itself only when $d = ${n} \\div 2$.`,
        why: `A divisor pairs with itself when $d = ${n} \\div d$, not $${n} \\div 2$.`,
      },
      {
        text: `$${k}^2 = ${k * k}$ is less than $${n}$, so $${n}$ is not a square.`,
        why: `Being above one square rules nothing out; $${n}$ has to sit strictly between two squares next to each other.`,
      },
      {
        text: `So $${n}$ has an odd number of divisors.`,
        why: 'Pairs of two different numbers make an even count.',
      },
    ],
  };
}

const dvfPairOrder: Generator<PairOrderParams> = {
  id: 'dvf-pair-order',
  sample(rng, difficulty) {
    for (;;) {
      const n = difficulty >= 2 ? rng.int(200, 960) : rng.int(20, 199);
      if (isSquare(n)) continue;
      const base: PairOrderParams = { n, difficulty, picks: [] };
      return { ...base, picks: pickDistractors(rng, pairProof(base), difficulty) };
    }
  },
  render: (params) => orderSlide(pairProof(params), params.picks),
  solution: (params) => orderSolution(pairProof(params), params.picks),
};

/* ---------- how many up to M have an odd count ---------- */

interface UptoParams {
  M: number;
}

const dvfUpto: Generator<UptoParams> = {
  id: 'dvf-upto',
  sample(rng, difficulty) {
    return { M: difficulty >= 2 ? rng.int(200, 960) : rng.int(20, 199) };
  },
  choices({ M }) {
    const k = Math.floor(Math.sqrt(M));
    return intOptions(k, [Math.ceil(M / 2), k + 1, k - 1, Math.floor(M / 2)]);
  },
  render({ M }) {
    return typed(
      [`How many of the whole numbers from $1$ to $${M}$ have an odd number of divisors?`],
      '\\text{how many} =',
      Math.floor(Math.sqrt(M)),
    );
  },
  solution({ M }) {
    const k = Math.floor(Math.sqrt(M));
    return [
      { text: 'A number has an odd number of divisors exactly when it is a square.' },
      { tex: `${k}^2 = ${k * k} \\le ${M} < ${(k + 1) ** 2} = ${k + 1}^2` },
      { text: `So the squares $1^2, 2^2, \\dots, ${k}^2$ are the ones: $${k}$ of them.` },
    ];
  },
};

/* ---------- the product of the divisors ---------- */

interface ProductParams {
  n: number;
}

const productRoot = (n: number) => (isSquare(n) ? Math.sqrt(n) : n);
const productPower = (n: number) => (isSquare(n) ? countOf(n) : countOf(n) / 2);

const dvfProductPower: Generator<ProductParams> = {
  id: 'dvf-product-power',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { n: rng.int(2, 31) ** 2 };
    for (;;) {
      const n = rng.int(12, 120);
      if (isSquare(n) || countOf(n) < 4) continue;
      return { n };
    }
  },
  choices({ n }) {
    const t = countOf(n);
    const k = productPower(n);
    return intOptions(k, isSquare(n) ? [Math.floor(t / 2), t - 1, 2 * t, t + 1] : [t, k + 1, k - 1, 2 * t]);
  },
  render({ n }) {
    const root = productRoot(n);
    return typed(
      [`The product of all the divisors of $${n}$ is $${root}^k$. Find $k$.`],
      'k =',
      productPower(n),
    );
  },
  solution({ n }) {
    const f = factorise(n);
    const t = countOf(n);
    const count = { tex: stackTex(`${f.map(([, e]) => `(${e} + 1)`).join('')} = ${t}`) };
    if (!isSquare(n)) {
      return [
        { tex: `${n} = ${primeTex(f)}` },
        { text: 'The number of divisors: add one to each power and multiply.' },
        count,
        { text: `They make $${t / 2}$ pairs $d \\times (${n} \\div d)$, each multiplying to $${n}$.` },
        { text: `So the product is $${n}^{${t / 2}}$, and $k = ${t / 2}$.` },
      ];
    }
    const m = Math.sqrt(n);
    return [
      { tex: `${n} = ${primeTex(f)}` },
      { text: 'The number of divisors: add one to each power and multiply.' },
      count,
      { text: `That is $${(t - 1) / 2}$ pairs each making $${n} = ${m}^2$, and $${m}$ on its own.` },
      { tex: stackTex(`(${m}^2)^{${(t - 1) / 2}} \\times ${m} = ${m}^{${t}}`) },
      { text: `So $k = ${t}$.` },
    ];
  },
};

export const numberDivisorsGenerators = [
  dvfDivides,
  dvfDividesFlow,
  dvfQuotientTable,
  dvfQuotient,
  dvfMissing,
  dvfIsSquare,
  dvfRoot,
  dvfPowerTable,
  dvfMultiplier,
  dvfDivide,
  dvfSigmaList,
  dvfSigmaTree,
  dvfDivisorGrid,
  dvfSigma,
  dvfSigmaTiles,
  dvfClassify,
  dvfProperSum,
  dvfClassifyFlow,
  dvfWhichAbundant,
  dvfTwoPowerTree,
  dvfPairTable,
  dvfOddCount,
  dvfPairOrder,
  dvfUpto,
  dvfProductPower,
];

/** The arithmetic behind the slides, for `numberDivisors.test.ts`. */
export const divisorsTesting = { factorise, valueOf };

/** The order slide here, for `proofOrder.test.ts`, which grades each proof as a learner would. */
export const numberDivisorsOrders = [dvfPairOrder];
