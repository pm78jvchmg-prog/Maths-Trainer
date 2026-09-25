/**
 * Contest Math, level 10: Factorization.
 *
 * Five lessons, and one idea under all of them: write the number as a product
 * of prime powers and read the answer off the exponents. Factorization tops
 * exponents up to make a square or a cube, counts the zeros at the end of a
 * product as pairs of 2 and 5, and finds a factor by spotting a nearby square.
 * Number of Divisors counts choices of exponent, one more than each power,
 * and multiplies brackets for the sum. GCD and LCM takes the smaller or larger
 * power of each prime, and uses HCF × LCM = a × b. Factorials count the 5s
 * (or any prime) in n! a multiple at a time. Cryptograms turn letters into
 * place values: AB + BA is 11(A + B), ABCABC is ABC × 1001.
 *
 * Every answer is a whole number. Shared helpers are in `contestMath.ts`;
 * Level 1 already asks the gcd of a sum and a factorial and a single missing
 * digit, so neither is repeated here.
 */
import type { Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { factorTex, factorise, gcd, isPrime, lcm, num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ================================================================
 * Prime powers
 * ================================================================ */

type Factors = [number, number][];

const powTex = (p: number, e: number) => (e === 1 ? `${p}` : `${p}^{${e}}`);
const factorsTex = (f: Factors) => f.map(([p, e]) => powTex(p, e)).join(' \\times ');
const valueOf = (f: Factors) => f.reduce((t, [p, e]) => t * p ** e, 1);
const divisorCount = (f: Factors) => f.reduce((t, [, e]) => t * (e + 1), 1);
const product = (values: number[]) => values.reduce((t, v) => t * v, 1);

/** Two factorisations multiplied: powers of a shared prime add. */
function merge(a: Factors, b: Factors): Factors {
  const out = new Map<number, number>();
  for (const [p, e] of [...a, ...b]) out.set(p, (out.get(p) ?? 0) + e);
  return [...out.entries()].sort((x, y) => x[0] - y[0]);
}

/** `count` distinct primes from `pool`, smallest first, each with a power from 1 to `maxExp(p)`. */
function randomFactors(rng: Rng, pool: number[], count: number, maxExp: (p: number) => number): Factors {
  return rng
    .sample(pool, count)
    .sort((a, b) => a - b)
    .map((p): [number, number] => [p, rng.int(1, maxExp(p))]);
}

/** How many times p divides n!: n/p + n/p² + …, each rounded down. */
function legendre(n: number, p: number): number {
  let count = 0;
  for (let q = p; q <= n; q *= p) count += Math.floor(n / q);
  return count;
}

/** The terms of Legendre's count, one per power of p up to n. */
function legendreTerms(n: number, p: number): number[] {
  const out: number[] = [];
  for (let q = p; q <= n; q *= p) out.push(Math.floor(n / q));
  return out;
}

/** `\lfloor 50/5 \rfloor + \lfloor 50/25 \rfloor = 10 + 2 = 12`. */
function legendreTex(n: number, p: number): string {
  const powers: number[] = [];
  for (let q = p; q <= n; q *= p) powers.push(q);
  const terms = legendreTerms(n, p);
  const floors = powers.map((q) => `\\lfloor ${n}/${q} \\rfloor`).join(' + ');
  if (terms.length === 1) return `${floors} = ${terms[0]}`;
  return `${floors} = ${terms.join(' + ')} = ${legendre(n, p)}`;
}

function nextPrime(n: number): number {
  let m = n + 1;
  while (!isPrime(m)) m += 1;
  return m;
}

function prevPrime(n: number): number {
  let m = n - 1;
  while (m > 2 && !isPrime(m)) m -= 1;
  return m;
}

/** "2, 3 and 5". */
function listText(items: (string | number)[]): string {
  if (items.length === 1) return `${items[0]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/* ================================================================
 * Lesson 1: Factorization
 * ================================================================ */

/* ---------- the smallest multiplier that makes a square or a cube ---------- */

interface PowerUpParams {
  n: number;
  /** 2 for a perfect square, 3 for a perfect cube. */
  power: 2 | 3;
}

/** The extra factor each prime needs to reach the next multiple of `t`. */
const topUpFactors = (f: Factors, t: number): Factors =>
  f.filter(([, e]) => e % t !== 0).map(([p, e]): [number, number] => [p, t - (e % t)]);
const topUp = (f: Factors, t: number) => valueOf(topUpFactors(f, t));
const rootAfter = (f: Factors, t: number) => product(f.map(([p, e]) => p ** Math.ceil(e / t)));
const radical = (f: Factors) => product(f.map(([p]) => p));

const POWER_WORD = { 2: 'square', 3: 'cube' } as const;

function samplePowerUp(rng: Rng, difficulty: number): PowerUpParams {
  const power = difficulty >= 2 ? 3 : 2;
  for (;;) {
    const f = randomFactors(rng, difficulty >= 2 ? [2, 3, 5, 7] : [2, 3, 5, 7, 11], rng.int(2, 3), (p) =>
      p >= 7 ? 2 : difficulty >= 2 ? 5 : 4,
    );
    const n = valueOf(f);
    if (n < 20 || n > (difficulty >= 2 ? 5000 : 3000)) continue;
    const k = topUp(f, power);
    // k = n would mean nothing was already paired up, which is not the idea.
    if (k === 1 || k === n || k > 1500) continue;
    if (rootAfter(f, power) === k) continue;
    // A cube's trap is the square's answer, so the two must differ.
    if (power === 3 && topUp(f, 2) === k) continue;
    return { n, power };
  }
}

function powerUpSolution({ n, power }: PowerUpParams): SolutionStep[] {
  const f = factorise(n);
  const need = topUpFactors(f, power);
  const k = valueOf(need);
  const root = rootAfter(f, power);
  const needTex = factorsTex(need);
  return [
    { text: 'Factorise first:' },
    { tex: `${n} = ${factorTex(n)}` },
    {
      text:
        power === 2
          ? 'In a perfect square every prime appears an even number of times. Each odd power needs one more of its prime:'
          : 'In a perfect cube every power is a multiple of 3. Top each power up to the next multiple of 3:',
    },
    { tex: needTex === `${k}` ? `k = ${k}` : `k = ${needTex} = ${k}` },
    { tex: `${n} \\times ${k} = ${n * k} = ${root}^${power}` },
  ];
}

const cmFzSquareMultiplier: Generator<PowerUpParams> = {
  id: 'cm-fz-square-multiplier',
  sample: samplePowerUp,
  render({ n, power }) {
    return typed(
      [say(`What is the smallest positive whole number $k$ for which $${n} \\times k$ is a perfect ${POWER_WORD[power]}?`)],
      topUp(factorise(n), power),
      'k =',
    );
  },
  choices({ n, power }) {
    const f = factorise(n);
    return numberOptions(topUp(f, power), [radical(f), rootAfter(f, power), power === 3 ? topUp(f, 2) : n, n], 1, 2);
  },
  solution: powerUpSolution,
};

const cmFzSquareMultiplierTiles: Generator<PowerUpParams> = {
  id: 'cm-fz-square-multiplier-tiles',
  sample: samplePowerUp,
  render({ n, power }) {
    const f = factorise(n);
    const k = topUp(f, power);
    const root = rootAfter(f, power);
    const slips = power === 3 ? [topUp(f, 2), rootAfter(f, 2), radical(f)] : [radical(f), rootAfter(f, 2) * 2, n];
    return {
      kind: 'tiles',
      prompt: [
        say(`Multiply ${n} by the smallest whole number that makes a perfect ${POWER_WORD[power]}.`),
        say(`Then fill in the number it is the ${POWER_WORD[power]} of.`),
      ],
      template: `${n} \\times {0} = {1}^${power}`,
      bank: numberBank([k, root], slips, 3, 1, 2),
      answer: [num(k), num(root)],
    };
  },
  solution: powerUpSolution,
};

/* ---------- zeros at the end of a product ---------- */

interface ZerosProductParams {
  /** [base, exponent], smallest base first. */
  terms: [number, number][];
}

const vOf = (base: number, p: number) => factorise(base).find(([q]) => q === p)?.[1] ?? 0;
const countIn = (terms: [number, number][], p: number) => terms.reduce((t, [b, e]) => t + e * vOf(b, p), 0);
const productTex = (terms: [number, number][]) => terms.map(([b, e]) => powTex(b, e)).join(' \\times ');

const ZERO_BASES = [4, 6, 8, 12, 15, 18, 20, 25, 45, 50, 75];

const cmFzZerosProduct: Generator<ZerosProductParams> = {
  id: 'cm-fz-zeros-product',
  sample(rng, difficulty) {
    for (;;) {
      let terms: [number, number][];
      if (difficulty >= 2) {
        terms = rng
          .sample(ZERO_BASES, 3)
          .sort((a, b) => a - b)
          .map((b): [number, number] => [b, rng.int(1, 8)]);
      } else {
        const extra = rng.sample([3, 7], rng.int(1, 2));
        terms = [2, 5, ...extra]
          .sort((a, b) => a - b)
          .map((b): [number, number] => [b, b === 2 || b === 5 ? rng.int(2, 14) : rng.int(1, 6)]);
      }
      const twos = countIn(terms, 2);
      const fives = countIn(terms, 5);
      if (twos === fives || Math.min(twos, fives) < 2 || Math.max(twos, fives) > 40) continue;
      return { terms };
    }
  },
  render({ terms }) {
    return typed(
      [say('How many zeros are there at the end of this number when it is written out in full?'), show(`N = ${productTex(terms)}`)],
      Math.min(countIn(terms, 2), countIn(terms, 5)),
      '\\text{zeros} =',
    );
  },
  choices({ terms }) {
    const twos = countIn(terms, 2);
    const fives = countIn(terms, 5);
    // Counting each base once, not each prime in it: 25^3 as three 5s.
    const naive = Math.min(
      terms.filter(([b]) => b % 2 === 0).reduce((t, [, e]) => t + e, 0),
      terms.filter(([b]) => b % 5 === 0).reduce((t, [, e]) => t + e, 0),
    );
    return numberOptions(Math.min(twos, fives), [twos + fives, Math.max(twos, fives), naive], 1, 1);
  },
  solution({ terms }) {
    const twos = countIn(terms, 2);
    const fives = countIn(terms, 5);
    const steps: SolutionStep[] = [];
    const composite = terms.filter(([b]) => !isPrime(b));
    if (composite.length > 0) {
      steps.push({ text: 'Write each base as primes:' });
      for (const [b, e] of composite) {
        steps.push({ tex: `${powTex(b, e)} = ${factorsTex(factorise(b).map(([p, f]): [number, number] => [p, f * e]))}` });
      }
    }
    const twoParts = terms.filter(([b]) => b % 2 === 0).map(([b, e]) => e * vOf(b, 2));
    const fiveParts = terms.filter(([b]) => b % 5 === 0).map(([b, e]) => e * vOf(b, 5));
    steps.push(
      { text: 'Count the 2s and the 5s:' },
      { tex: twoParts.length > 1 ? `\\text{twos} = ${twoParts.join(' + ')} = ${twos}` : `\\text{twos} = ${twos}` },
      { tex: fiveParts.length > 1 ? `\\text{fives} = ${fiveParts.join(' + ')} = ${fives}` : `\\text{fives} = ${fives}` },
      {
        text: `Each zero at the end is a factor $10 = 2 \\times 5$, so it takes one 2 and one 5. The ${twos < fives ? 'twos' : 'fives'} run out first, so $N$ ends in ${Math.min(twos, fives)} zeros.`,
      },
    );
    return steps;
  },
};

/* ---------- a factor from a nearby square ---------- */

interface NearSquareParams {
  m: number;
  k: number;
}

const cmFzNearSquare: Generator<NearSquareParams> = {
  id: 'cm-fz-near-square',
  sample(rng, difficulty) {
    for (;;) {
      const m = difficulty >= 2 ? rng.int(31, 150) : 10 * rng.int(2, 30);
      if (difficulty >= 2 && m % 10 === 0) continue;
      const k = rng.int(1, difficulty >= 2 ? 8 : 9);
      if (isPrime(m - k) && isPrime(m + k)) return { m, k };
    }
  },
  render({ m, k }) {
    return typed(
      [say(`$${m * m - k * k}$ is the product of two primes. What is the larger of the two?`)],
      m + k,
      '\\text{larger prime} =',
    );
  },
  choices({ m, k }) {
    const below = prevPrime(m + k);
    return numberOptions(m + k, [m - k, nextPrime(m + k), below === m - k ? prevPrime(m - k) : below], 1, 2);
  },
  solution({ m, k }) {
    const n = m * m - k * k;
    return [
      { text: `${n} sits just below the square $${m}^2 = ${m * m}$:` },
      { tex: `${n} = ${m * m} - ${k * k} = ${m}^2 - ${k}^2` },
      { text: 'A difference of two squares factorises:' },
      { tex: `${m}^2 - ${k}^2 = (${m} - ${k})(${m} + ${k})` },
      { tex: `${n} = ${m - k} \\times ${m + k}` },
      { text: `Both are prime, so the larger prime is ${m + k}.` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Number of Divisors
 * ================================================================ */

/* ---------- count the divisors ---------- */

interface DivisorCountParams {
  /** The number is base^power × times; base alone at difficulty 1. */
  base: number;
  power: number;
  times: number;
}

const DIVISOR_BASES = [6, 10, 12, 14, 15, 18, 20, 21, 24, 28, 30, 36, 45];

function divisorFactors({ base, power, times }: DivisorCountParams): Factors {
  const scaled = factorise(base).map(([p, e]): [number, number] => [p, e * power]);
  return times > 1 ? merge(scaled, factorise(times)) : scaled;
}

function divisorTex({ base, power, times }: DivisorCountParams): string {
  if (power === 1) return `${base}`;
  return `${base}^{${power}}${times > 1 ? ` \\times ${times}` : ''}`;
}

const cmFzDivisorCount: Generator<DivisorCountParams> = {
  id: 'cm-fz-divisor-count',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const p: DivisorCountParams = {
          base: rng.pick(DIVISOR_BASES),
          power: rng.int(2, 6),
          times: rng.pick([1, 2, 3, 5, 7, 11]),
        };
        if (divisorCount(divisorFactors(p)) > 300) continue;
        return p;
      }
      const f = randomFactors(rng, [2, 3, 5, 7, 11, 13], rng.int(2, 3), (q) => (q >= 7 ? 2 : 4));
      const n = valueOf(f);
      if (n < 60 || n > 2000 || divisorCount(f) < 8) continue;
      return { base: n, power: 1, times: 1 };
    }
  },
  render(p) {
    return typed(
      [say(`How many positive divisors does $${divisorTex(p)}$ have, counting 1 and the number itself?`)],
      divisorCount(divisorFactors(p)),
      '\\text{divisors} =',
    );
  },
  choices(p) {
    const f = divisorFactors(p);
    const exps = f.map(([, e]) => e);
    // Treating the base as if it were prime: 12^3 read as having 3 + 1 divisors.
    const asPrime = (p.power + 1) * (p.times > 1 ? 2 : 1);
    return numberOptions(
      divisorCount(f),
      [p.power > 1 ? asPrime : product(exps), product(exps), exps.reduce((t, e) => t + e + 1, 0), divisorCount(f) - 2],
      1,
      2,
    );
  },
  solution(p) {
    const f = divisorFactors(p);
    const steps: SolutionStep[] = [];
    if (p.power > 1) {
      steps.push({ text: 'Write it as primes first:' });
      steps.push({ tex: `${powTex(p.base, p.power)} = (${factorTex(p.base)})^{${p.power}}` });
    }
    steps.push(
      { tex: `${divisorTex(p)} = ${factorsTex(f)}` },
      { text: 'A divisor takes each prime from 0 times up to its power here, so each power $e$ gives $e + 1$ choices. Multiply the choices:' },
      { tex: `${f.map(([, e]) => `(${e} + 1)`).join('')} = ${divisorCount(f)}` },
    );
    return steps;
  },
};

/* ---------- the divisor count as a table ---------- */

interface DivisorTableParams {
  n: number;
}

const cmFzDivisorTable: Generator<DivisorTableParams> = {
  id: 'cm-fz-divisor-table',
  sample(rng, difficulty) {
    for (;;) {
      const f =
        difficulty >= 2
          ? randomFactors(rng, [2, 3, 5, 7, 11], 3, (p) => (p >= 7 ? 2 : 4))
          : randomFactors(rng, [2, 3, 5, 7], 2, (p) => (p >= 7 ? 2 : 5));
      const n = valueOf(f);
      if (n < 24 || n > (difficulty >= 2 ? 20000 : 1500)) continue;
      return { n };
    }
  },
  render({ n }) {
    const f = factorise(n);
    const answer = [...f.flatMap(([, e]) => [e, e + 1]), divisorCount(f)];
    const exps = f.map(([, e]) => e);
    return {
      kind: 'table',
      prompt: [
        say(`Count the divisors of ${n}. For each prime, fill in its power in ${n} and how many choices of power a divisor has. Then the total.`),
      ],
      columns: ['\\text{prime}', '\\text{power}', '\\text{choices}'],
      rows: [...f.map(([p]): (string | null)[] => [`${p}`, null, null]), ['\\text{divisors}', '', null]],
      bank: numberBank(answer, [product(exps), exps.reduce((t, e) => t + e + 1, 0), divisorCount(f) + 1], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution({ n }) {
    const f = factorise(n);
    return [
      { tex: `${n} = ${factorTex(n)}` },
      { text: 'Each prime can appear in a divisor from 0 times up to its power, which is one more choice than the power:' },
      ...f.map(([p, e]): SolutionStep => ({ tex: `${p}: \\; 0 \\text{ to } ${e}, \\; ${e + 1} \\text{ choices}` })),
      { tex: `${f.map(([, e]) => e + 1).join(' \\times ')} = ${divisorCount(f)}` },
    ];
  },
};

/* ---------- the sum of the divisors ---------- */

interface DivisorSumParams {
  n: number;
}

const bracketSum = (p: number, e: number) => Array.from({ length: e + 1 }, (_, i) => p ** i).reduce((t, v) => t + v, 0);
const bracketTex = (p: number, e: number) => `(${Array.from({ length: e + 1 }, (_, i) => p ** i).join(' + ')})`;
const sigma = (f: Factors) => product(f.map(([p, e]) => bracketSum(p, e)));

const cmFzDivisorSum: Generator<DivisorSumParams> = {
  id: 'cm-fz-divisor-sum',
  sample(rng, difficulty) {
    for (;;) {
      const f = randomFactors(rng, [2, 3, 5, 7], difficulty >= 2 ? 3 : 2, (p) => (p >= 5 ? 2 : 3));
      const n = valueOf(f);
      if (n < 12 || n > (difficulty >= 2 ? 1500 : 300)) continue;
      return { n };
    }
  },
  render({ n }) {
    return typed([say(`What is the sum of all the positive divisors of ${n}, including 1 and ${n}?`)], sigma(factorise(n)), '\\text{sum} =');
  },
  choices({ n }) {
    const f = factorise(n);
    const s = sigma(f);
    const added = f.reduce((t, [p, e]) => t + bracketSum(p, e), 0);
    return numberOptions(s, [s - n, added, n + 1], 1, 1);
  },
  solution({ n }) {
    const f = factorise(n);
    return [
      { tex: `${n} = ${factorTex(n)}` },
      { text: 'Multiplying out one bracket of powers for each prime gives every divisor exactly once, so the product of the brackets is the sum:' },
      { tex: f.map(([p, e]) => bracketTex(p, e)).join('') },
      { tex: `${f.map(([p, e]) => bracketSum(p, e)).join(' \\times ')} = ${sigma(f)}` },
    ];
  },
};

/* ---------- odd, even and square divisors ---------- */

type SpecialKind = 'odd' | 'even' | 'square';

interface SpecialDivisorParams {
  n: number;
  kind: SpecialKind;
}

function specialCount({ n, kind }: SpecialDivisorParams): number {
  const f = factorise(n);
  const odd = product(f.filter(([p]) => p !== 2).map(([, e]) => e + 1));
  if (kind === 'odd') return odd;
  if (kind === 'even') return divisorCount(f) - odd;
  return product(f.map(([, e]) => Math.floor(e / 2) + 1));
}

const cmFzSpecialDivisors: Generator<SpecialDivisorParams> = {
  id: 'cm-fz-special-divisors',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const f = randomFactors(rng, [2, 3, 5, 7], rng.int(2, 3), () => 7).map(([p, e]): [number, number] => [p, Math.max(e, 2)]);
        const n = valueOf(f);
        if (n > 5e6) continue;
        return { n, kind: 'square' };
      }
      const odd = randomFactors(rng, [3, 5, 7], rng.int(1, 2), (p) => (p === 7 ? 2 : 3));
      const f: Factors = [[2, rng.int(1, 5)], ...odd];
      const n = valueOf(f);
      if (n < 24 || n > 2000 || divisorCount(f) < 8) continue;
      return { n, kind: rng.pick(['odd', 'even'] as const) };
    }
  },
  render(p) {
    if (p.kind === 'square') {
      return typed(
        [say('How many of the positive divisors of $N$ are perfect squares? (1 counts as a perfect square.)'), show(`N = ${factorTex(p.n)}`)],
        specialCount(p),
        '\\text{square divisors} =',
      );
    }
    return typed([say(`How many of the positive divisors of ${p.n} are ${p.kind}?`)], specialCount(p), `\\text{${p.kind} divisors} =`);
  },
  choices(p) {
    const f = factorise(p.n);
    const total = divisorCount(f);
    const answer = specialCount(p);
    if (p.kind === 'square') {
      return numberOptions(
        answer,
        [product(f.map(([, e]) => Math.floor(e / 2))), Math.floor(total / 2), product(f.map(([, e]) => Math.ceil(e / 2) + 1))],
        1,
        1,
      );
    }
    const other = total - answer;
    return numberOptions(answer, [other, total, Math.floor(total / 2)], 1, 1);
  },
  solution(p) {
    const f = factorise(p.n);
    const answer = specialCount(p);
    const odd = f.filter(([q]) => q !== 2);
    const a = f[0][1];
    if (p.kind === 'square') {
      return [
        { text: 'A divisor is a perfect square when every power in it is even. From each power $e$, the even choices are $0, 2, 4, \\ldots$ up to $e$:' },
        ...f.map(([q, e]): SolutionStep => ({ tex: `${q}: \\; ${Array.from({ length: Math.floor(e / 2) + 1 }, (_, i) => 2 * i).join(', ')}` })),
        { tex: `${f.map(([, e]) => Math.floor(e / 2) + 1).join(' \\times ')} = ${answer}` },
      ];
    }
    const oddCount = product(odd.map(([, e]) => e + 1));
    const steps: SolutionStep[] = [
      { tex: `${p.n} = ${factorTex(p.n)}` },
      { text: 'An odd divisor has no 2 in it at all, so only the other primes choose a power:' },
      { tex: odd.length > 1 ? `\\text{odd} = ${odd.map(([, e]) => e + 1).join(' \\times ')} = ${oddCount}` : `\\text{odd} = ${oddCount}` },
    ];
    if (p.kind === 'even') {
      steps.push(
        { text: `An even divisor takes the 2 from 1 to ${a} times, ${a} choices:` },
        { tex: `\\text{even} = ${a} \\times ${oddCount} = ${answer}` },
      );
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 3: GCD and LCM
 * ================================================================ */

/* ---------- HCF × LCM = a × b ---------- */

interface ProductRuleParams {
  g: number;
  x: number;
  y: number;
  /** Ask for the sum of two numbers neither of which is the HCF. */
  sum: boolean;
}

const PRIME_POWERS = [2, 3, 4, 5, 7, 8, 9, 11, 13];

const cmFzHcfLcmProduct: Generator<ProductRuleParams> = {
  id: 'cm-fz-hcf-lcm-product',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const g = rng.int(2, 9);
        const [x, y] = rng.sample(PRIME_POWERS, 2).sort((a, b) => a - b);
        if (gcd(x, y) !== 1 || g * x * y > 1000) continue;
        return { g, x, y, sum: true };
      }
      const g = rng.int(2, 12);
      const x = rng.int(2, 12);
      const y = rng.int(2, 12);
      if (x === y || gcd(x, y) !== 1 || g * x * y > 900) continue;
      return { g, x, y, sum: false };
    }
  },
  render({ g, x, y, sum }) {
    const L = g * x * y;
    if (sum) {
      return typed(
        [say(`Two numbers have HCF ${g} and LCM ${L}. Neither of them is ${g}. What is their sum?`)],
        g * (x + y),
        '\\text{sum} =',
      );
    }
    return typed([say(`Two numbers have HCF ${g} and LCM ${L}. One of them is ${g * x}. What is the other?`)], g * y, '\\text{other} =');
  },
  choices({ g, x, y, sum }) {
    const L = g * x * y;
    if (sum) return numberOptions(g * (x + y), [g + L, x + y, g * (x + y + 1)], 1, 1);
    const a = g * x;
    return numberOptions(g * y, [L / g, L - a, g * L, g * y + g, g * y - g], 1, 1);
  },
  solution({ g, x, y, sum }) {
    const L = g * x * y;
    if (sum) {
      return [
        { text: `Both numbers are multiples of ${g}: write them as $${g}x$ and $${g}y$, where $x$ and $y$ share no factor. Then the LCM is $${g}xy$:` },
        { tex: `xy = ${L} \\div ${g} = ${x * y}` },
        { text: `Neither number is ${g}, so neither $x$ nor $y$ is 1. Sharing no factor, each takes a whole prime power of ${x * y}:` },
        { tex: `${x * y} = ${x} \\times ${y}` },
        { tex: `${g} \\times ${x} + ${g} \\times ${y} = ${g * x} + ${g * y} = ${g * (x + y)}` },
      ];
    }
    const a = g * x;
    return [
      { text: 'The HCF takes the smaller power of each prime and the LCM the larger, so between them they hold every power of both numbers:' },
      { tex: '\\text{HCF} \\times \\text{LCM} = a \\times b' },
      { tex: `${g} \\times ${L} = ${a} \\times b` },
      { tex: `b = ${g * L} \\div ${a} = ${g * y}` },
    ];
  },
};

/* ---------- flashing together: an LCM ---------- */

interface TogetherParams {
  gaps: number[];
  /** Hours in the window, and the hour it starts; 0 asks for the next meeting. */
  hours: number;
  start: number;
}

const cmFzTogether: Generator<TogetherParams> = {
  id: 'cm-fz-together',
  sample(rng, difficulty) {
    for (;;) {
      const gaps = rng.sample(Array.from({ length: difficulty >= 2 ? 35 : 27 }, (_, i) => i + (difficulty >= 2 ? 6 : 4)), 3).sort((a, b) => a - b);
      const L = lcm(lcm(gaps[0], gaps[1]), gaps[2]);
      if (L === gaps[2] || L === lcm(gaps[1], gaps[2])) continue;
      if (difficulty >= 2) {
        const fits = [2, 3, 4, 5, 6, 8, 10, 12].filter((h) => (60 * h) % L === 0 && (60 * h) / L >= 3);
        if (fits.length === 0 || L < 20) continue;
        return { gaps, hours: rng.pick(fits), start: rng.int(6, 9) };
      }
      if (L > 600) continue;
      return { gaps, hours: 0, start: 0 };
    }
  },
  render({ gaps, hours, start }) {
    const L = lcm(lcm(gaps[0], gaps[1]), gaps[2]);
    const [a, b, c] = gaps;
    if (hours > 0) {
      return typed(
        [
          say(`Three buses leave a station every ${a}, ${b} and ${c} minutes. All three leave together at ${start}:00.`),
          say(`From ${start}:00 to ${start + hours}:00, counting both, how many times do all three leave together?`),
        ],
        (60 * hours) / L + 1,
        '\\text{departures} =',
      );
    }
    return typed(
      [say(`Three lights flash every ${a}, ${b} and ${c} seconds. They flash together now. How many seconds until they next flash together?`)],
      L,
      '\\text{seconds} =',
    );
  },
  choices({ gaps, hours }) {
    const [a, b, c] = gaps;
    const L = lcm(lcm(a, b), c);
    if (hours > 0) {
      const k = (60 * hours) / L;
      return numberOptions(k + 1, [k, k - 1, Math.floor((60 * hours) / (a * b * c)) + 1, k + 2], 1, 1);
    }
    return numberOptions(L, [a * b * c, lcm(b, c), lcm(a, b), lcm(a, c)], 1, 1);
  },
  solution({ gaps, hours, start }) {
    const [a, b, c] = gaps;
    const L = lcm(lcm(a, b), c);
    const steps: SolutionStep[] = [
      { text: 'They meet again after the smallest time that is a multiple of all three gaps, the LCM. Take the highest power of each prime:' },
      { tex: `${a} = ${factorTex(a)}, \\quad ${b} = ${factorTex(b)}, \\quad ${c} = ${factorTex(c)}` },
      { tex: `\\text{LCM} = ${factorTex(L)} = ${L}` },
    ];
    if (hours === 0) {
      steps.push({ text: `Multiplying the three gaps, ${a * b * c}, is a time they meet, but not the first.` });
      return steps;
    }
    const k = (60 * hours) / L;
    steps.push(
      { text: `So they leave together every ${L} minutes. ${hours} hours is ${60 * hours} minutes:` },
      { tex: `${60 * hours} \\div ${L} = ${k}` },
      { text: `That is ${k} gaps after ${start}:00, and one more departure than gaps, as ${start}:00 itself counts:` },
      { tex: `${k} + 1 = ${k + 1}` },
    );
    return steps;
  },
};

/* ---------- cutting into equal pieces: an HCF ---------- */

interface PiecesParams {
  g: number;
  /** The lengths are g times these; two for a rectangle, three for ribbons. */
  parts: number[];
}

function largestProperDivisor(n: number): number {
  for (let d = 2; d <= n; d += 1) if (n % d === 0) return n / d;
  return 1;
}

const cmFzPieces: Generator<PiecesParams> = {
  id: 'cm-fz-pieces',
  sample(rng, difficulty) {
    for (;;) {
      const g = rng.int(2, difficulty >= 2 ? 12 : 15);
      if (difficulty >= 2) {
        const parts = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 3).sort((a, b) => a - b);
        if (gcd(gcd(parts[0], parts[1]), parts[2]) !== 1 || g * parts[2] > 150) continue;
        return { g, parts };
      }
      const parts = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 2).sort((a, b) => a - b);
      if (gcd(parts[0], parts[1]) !== 1 || g * parts[1] > 150) continue;
      return { g, parts };
    }
  },
  render({ g, parts }) {
    const lengths = parts.map((v) => g * v);
    if (parts.length === 3) {
      return typed(
        [
          say(`Three ribbons are ${listText(lengths)} cm long. They are all cut into pieces of the same whole number of centimetres, as long as possible, with nothing left over.`),
          say('How many pieces are there?'),
        ],
        parts.reduce((t, v) => t + v, 0),
        '\\text{pieces} =',
      );
    }
    return typed(
      [
        say(`A ${lengths[0]} cm by ${lengths[1]} cm rectangle is cut into equal squares, as large as possible, with nothing left over.`),
        say('How long is the side of each square, in cm?'),
      ],
      g,
      '\\text{side} =',
    );
  },
  choices({ g, parts }) {
    const lengths = parts.map((v) => g * v);
    const smaller = largestProperDivisor(g);
    if (parts.length === 3) {
      const total = lengths.reduce((t, v) => t + v, 0);
      return numberOptions(total / g, [g, total / smaller, (lengths[0] + lengths[1]) / g, total / g + 1], 1, 1);
    }
    return numberOptions(g, [smaller, lengths[1] - lengths[0], lengths[0], 2 * g], 1, 1);
  },
  solution({ g, parts }) {
    const lengths = parts.map((v) => g * v);
    const steps: SolutionStep[] = [
      { text: 'The piece must divide every length exactly, and be as large as possible: that is the HCF. Take the lower power of each shared prime:' },
      { tex: lengths.map((v) => `${v} = ${factorTex(v)}`).join(', \\quad ') },
      { tex: `\\text{HCF} = ${factorTex(g)}${factorise(g).length > 1 || factorise(g)[0][1] > 1 ? ` = ${g}` : ''}` },
    ];
    if (parts.length === 3) {
      steps.push(
        { text: `Each piece is ${g} cm, so each ribbon gives its length over ${g}:` },
        { tex: `${parts.join(' + ')} = ${parts.reduce((t, v) => t + v, 0)}` },
      );
    } else {
      steps.push({ text: `Squares of side ${g} cm fit exactly, ${parts[0]} by ${parts[1]}.` });
    }
    return steps;
  },
};

/* ---------- HCF and LCM from factorisations, as tiles ---------- */

interface HcfLcmTilesParams {
  a: Factors;
  b: Factors;
}

function combine(a: Factors, b: Factors, primes: 'common' | 'all', pick: (x: number, y: number) => number): Factors {
  const ea = new Map(a);
  const eb = new Map(b);
  const all = [...new Set([...ea.keys(), ...eb.keys()])].sort((x, y) => x - y);
  const out: Factors = [];
  for (const p of all) {
    const x = ea.get(p);
    const y = eb.get(p);
    if (x !== undefined && y !== undefined) out.push([p, pick(x, y)]);
    else if (primes === 'all') out.push([p, (x ?? y) as number]);
  }
  return out;
}

const hcfOf = (p: HcfLcmTilesParams) => combine(p.a, p.b, 'common', Math.min);
const lcmOf = (p: HcfLcmTilesParams) => combine(p.a, p.b, 'all', Math.max);

function hcfLcmTokens(p: HcfLcmTilesParams): { right: [string, string]; bank: string[] } {
  const hcf = hcfOf(p);
  const lcmF = lcmOf(p);
  const slips = [
    combine(p.a, p.b, 'all', (x, y) => x + y),
    combine(p.a, p.b, 'all', Math.min),
    combine(p.a, p.b, 'common', Math.max),
  ];
  const seen = new Set<string>();
  const tokens: Factors[] = [];
  for (const f of [hcf, lcmF, ...slips]) {
    const tex = factorsTex(f);
    if (seen.has(tex)) continue;
    seen.add(tex);
    tokens.push(f);
  }
  tokens.sort((x, y) => valueOf(x) - valueOf(y));
  return { right: [factorsTex(hcf), factorsTex(lcmF)], bank: tokens.map(factorsTex) };
}

const cmFzHcfLcmTiles: Generator<HcfLcmTilesParams> = {
  id: 'cm-fz-hcf-lcm-tiles',
  sample(rng, difficulty) {
    const pool = difficulty >= 2 ? [2, 3, 5, 7, 11] : [2, 3, 5, 7];
    const size = difficulty >= 2 ? 3 : 2;
    for (;;) {
      const a = randomFactors(rng, pool, size, () => (difficulty >= 2 ? 5 : 4));
      const b = randomFactors(rng, pool, size, () => (difficulty >= 2 ? 5 : 4));
      const p = { a, b };
      const common = hcfOf(p);
      if (common.length === 0 || common.length === size) continue;
      if (factorsTex(a) === factorsTex(b)) continue;
      if (hcfLcmTokens(p).bank.length < 4) continue;
      return p;
    }
  },
  render(p) {
    const { right, bank } = hcfLcmTokens(p);
    return {
      kind: 'tiles',
      prompt: [say('Fill in the HCF and the LCM of $a$ and $b$.'), show(`a = ${factorsTex(p.a)}`), show(`b = ${factorsTex(p.b)}`)],
      template: '\\text{HCF} = {0}, \\quad \\text{LCM} = {1}',
      bank,
      answer: right,
    };
  },
  solution(p) {
    const hcf = hcfOf(p);
    const lcmF = lcmOf(p);
    const only = lcmF.filter(([q]) => !hcf.some(([r]) => r === q)).map(([q]) => q);
    return [
      { text: `The HCF divides both, so it keeps only the primes they share, ${listText(hcf.map(([q]) => q))}, each to the lower power:` },
      { tex: `\\text{HCF} = ${factorsTex(hcf)}` },
      { text: `The LCM is a multiple of both, so it takes every prime, ${listText(only)} included, each to the higher power:` },
      { tex: `\\text{LCM} = ${factorsTex(lcmF)}` },
    ];
  },
};

/* ================================================================
 * Lesson 4: Factorials
 * ================================================================ */

/* ---------- zeros at the end of n! ---------- */

interface FactorialParams {
  n: number;
}

const cmFzFactorialZeros: Generator<FactorialParams> = {
  id: 'cm-fz-factorial-zeros',
  sample(rng, difficulty) {
    return { n: difficulty >= 2 ? rng.int(125, 999) : rng.int(25, 99) };
  },
  render({ n }) {
    return typed([say(`How many zeros are there at the end of $${n}!$ when it is written out in full?`)], legendre(n, 5), '\\text{zeros} =');
  },
  choices({ n }) {
    const terms = legendreTerms(n, 5);
    return numberOptions(legendre(n, 5), [terms[0], Math.floor(n / 10), terms[0] + (terms[1] ?? 0)], 1, 1);
  },
  solution({ n }) {
    const terms = legendreTerms(n, 5);
    const steps: SolutionStep[] = [
      { text: `Each zero at the end is a $10 = 2 \\times 5$. There are far more 2s than 5s in $${n}!$, so count the 5s.` },
      { text: `Every multiple of 5 up to ${n} gives one 5:` },
      { tex: `${n} \\div 5 \\to ${terms[0]}` },
      { text: 'Every multiple of 25 gives a second one:' },
      { tex: `${n} \\div 25 \\to ${terms[1]}` },
    ];
    if (terms.length > 2) {
      steps.push({ text: 'And every multiple of 125 a third:' }, { tex: `${n} \\div 125 \\to ${terms[2]}` });
    }
    if (terms.length > 3) {
      steps.push({ text: 'And every multiple of 625 a fourth:' }, { tex: `${n} \\div 625 \\to ${terms[3]}` });
    }
    steps.push({ tex: `${terms.join(' + ')} = ${legendre(n, 5)}` });
    return steps;
  },
};

/* ---------- the highest power dividing n! ---------- */

interface FactorialPowerParams {
  n: number;
  base: number;
}

const powerIn = ({ n, base }: FactorialPowerParams) =>
  Math.min(...factorise(base).map(([p, e]) => Math.floor(legendre(n, p) / e)));

const cmFzFactorialPower: Generator<FactorialPowerParams> = {
  id: 'cm-fz-factorial-power',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { n: rng.int(15, 70), base: rng.pick([6, 12, 18]) };
    const base = rng.pick([2, 3]);
    return { n: base === 2 ? rng.int(10, 60) : rng.int(12, 80), base };
  },
  render(p) {
    return typed([say(`What is the largest whole number $k$ for which $${p.base}^k$ divides $${p.n}!$?`)], powerIn(p), 'k =');
  },
  choices(p) {
    const f = factorise(p.base);
    if (f.length === 1) {
      const terms = legendreTerms(p.n, p.base);
      return numberOptions(powerIn(p), [terms[0], terms[0] + (terms[1] ?? 0), powerIn(p) + 1, powerIn(p) - 1], 1, 1);
    }
    return numberOptions(powerIn(p), [Math.floor(p.n / p.base), legendre(p.n, 2), legendre(p.n, 3)], 1, 1);
  },
  solution(p) {
    const f = factorise(p.base);
    if (f.length === 1) {
      return [
        { text: `Count the factors of ${p.base} in $${p.n}!$: one from each multiple of ${p.base}, another from each multiple of ${p.base ** 2}, and so on.` },
        { tex: legendreTex(p.n, p.base) },
      ];
    }
    const counts = f.map(([q, e]) => ({ q, e, v: legendre(p.n, q), k: Math.floor(legendre(p.n, q) / e) }));
    const steps: SolutionStep[] = [
      { tex: `${p.base} = ${factorTex(p.base)}` },
      { text: `Count each prime in $${p.n}!$:` },
      ...counts.map(({ q }): SolutionStep => ({ tex: legendreTex(p.n, q) })),
    ];
    const squared = counts.find(({ e }) => e > 1);
    if (squared) {
      steps.push({
        text: `Each ${p.base} uses ${squared.e} factors of ${squared.q}, so the ${squared.v} factors of ${squared.q} make only $${squared.v} \\div ${squared.e} \\to ${squared.k}$ of them.`,
      });
    }
    steps.push({ text: `The scarcer prime decides: $${p.base}^{${powerIn(p)}}$ divides $${p.n}!$ and no higher power does.` });
    return steps;
  },
};

/* ---------- Legendre's count as a table ---------- */

interface FactorialTableParams {
  n: number;
  p: number;
}

const cmFzFactorialTable: Generator<FactorialTableParams> = {
  id: 'cm-fz-factorial-table',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const p = rng.pick([2, 3, 7]);
      return { p, n: p === 2 ? rng.int(32, 63) : p === 3 ? rng.int(81, 200) : rng.int(49, 200) };
    }
    const p = rng.pick([3, 5]);
    return { p, n: p === 3 ? rng.int(27, 80) : rng.int(25, 124) };
  },
  render({ n, p }) {
    const terms = legendreTerms(n, p);
    const answer = [...terms, legendre(n, p)];
    return {
      kind: 'table',
      prompt: [say(`Count the factors of ${p} in $${n}!$. Fill in how many multiples of each power of ${p} there are from 1 to ${n}, then the total.`)],
      columns: ['\\text{multiples of}', '\\text{how many}'],
      rows: [...terms.map((_, i): (string | null)[] => [`${p ** (i + 1)}`, null]), ['\\text{total}', null]],
      bank: numberBank(answer, [terms[0] + 1, terms[0] - 1, Math.floor(n / (p + 1)), legendre(n, p) - terms[0]], 3, 1, 0),
      answer: answer.map(num),
    };
  },
  solution({ n, p }) {
    const terms = legendreTerms(n, p);
    return [
      { text: `Every multiple of ${p} gives one ${p}, every multiple of ${p * p} a second, and so on:` },
      ...terms.map((t, i): SolutionStep => ({ tex: `${n} \\div ${p ** (i + 1)} \\to ${t}` })),
      { tex: `${terms.join(' + ')} = ${legendre(n, p)}` },
    ];
  },
};

/* ---------- the smallest n! a power divides ---------- */

interface SmallestFactorialParams {
  /** 10 means "ends in at least k zeros", which is a count of 5s. */
  p: number;
  k: number;
}

const primeOf = (p: number) => (p === 10 ? 5 : p);

function smallestFactorial({ p, k }: SmallestFactorialParams): number {
  const q = primeOf(p);
  let n = q;
  while (legendre(n, q) < k) n += q;
  return n;
}

const cmFzFactorialSmallest: Generator<SmallestFactorialParams> = {
  id: 'cm-fz-factorial-smallest',
  sample(rng, difficulty) {
    for (;;) {
      const p = difficulty >= 2 ? rng.pick([2, 10]) : rng.pick([3, 5]);
      const k = p === 2 ? rng.int(8, 40) : p === 10 ? rng.int(6, 30) : p === 3 ? rng.int(5, 20) : rng.int(6, 24);
      if (smallestFactorial({ p, k }) === primeOf(p) * k) continue;
      return { p, k };
    }
  },
  render(p) {
    if (p.p === 10) {
      return typed([say(`What is the smallest $n$ for which $n!$ ends in at least ${p.k} zeros?`)], smallestFactorial(p), 'n =');
    }
    return typed([say(`What is the smallest $n$ for which $${p.p}^{${p.k}}$ divides $n!$?`)], smallestFactorial(p), 'n =');
  },
  choices(p) {
    const q = primeOf(p.p);
    const answer = smallestFactorial(p);
    return numberOptions(answer, [q * p.k, answer - q, answer + q], 1, 1);
  },
  solution(p) {
    const q = primeOf(p.p);
    const answer = smallestFactorial(p);
    const before = answer - q;
    const steps: SolutionStep[] = [];
    if (p.p === 10) steps.push({ text: 'Each zero needs a 5 (2s are plentiful), so count 5s.' });
    steps.push(
      { text: `Only multiples of ${q} bring a factor of ${q}, so the answer is a multiple of ${q}. Guessing $${q} \\times ${p.k} = ${q * p.k}$ forgets that some multiples bring two or more.` },
      { text: `At $n = ${before}$:` },
      { tex: legendreTex(before, q) },
      { text: `At $n = ${answer}$:` },
      { tex: legendreTex(answer, q) },
      { text: `${legendre(before, q)} is short of ${p.k} and ${legendre(answer, q)} is not, so $n = ${answer}$.` },
    );
    return steps;
  },
};

/* ================================================================
 * Lesson 5: Cryptograms
 * ================================================================ */

const LETTERS = ['A', 'B', 'C', 'D'];
const digitsValue = (digits: number[]) => digits.reduce((t, d) => 10 * t + d, 0);

/* ---------- ABC + AB + A: place value ---------- */

interface PlaceParams {
  digits: number[];
}

/** ABC + AB + A (or with D in front of the tail): the sum of every leading block. */
const placeTotal = (digits: number[]) => digits.reduce((t, _, i) => t + digitsValue(digits.slice(0, i + 1)), 0);

const cmFzCryptPlace: Generator<PlaceParams> = {
  id: 'cm-fz-crypt-place',
  sample(rng, difficulty) {
    const length = difficulty >= 2 ? 4 : 3;
    for (;;) {
      const digits = Array.from({ length }, (_, i) => rng.int(i === 0 ? 1 : 0, 9));
      // Unique by the place-value argument, but checked by brute force all the same.
      const target = placeTotal(digits);
      let found = 0;
      for (let v = 10 ** (length - 1); v < 10 ** length; v += 1) {
        if (placeTotal(String(v).split('').map(Number)) === target) found += 1;
      }
      if (found === 1) return { digits };
    }
  },
  render({ digits }) {
    const word = LETTERS.slice(0, digits.length).join('');
    const sum = digits.map((_, i) => word.slice(0, digits.length - i)).join(' + ');
    return typed(
      [
        say('Each letter stands for a digit (two letters may be the same digit), and $A$ is not 0.'),
        show(`${sum} = ${placeTotal(digits)}`),
        say(`What is the number $${word}$?`),
      ],
      digitsValue(digits),
      `${word} =`,
    );
  },
  choices({ digits }) {
    const value = digitsValue(digits);
    const swapped = [...digits];
    [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
    const reversed = [...digits].reverse();
    const low = 10 ** (digits.length - 1);
    return numberOptions(value, [digitsValue(swapped), reversed[0] === 0 ? 0 : digitsValue(reversed), value + 10, value - 10], 1, low);
  },
  solution({ digits }) {
    const total = placeTotal(digits);
    if (digits.length === 3) {
      const [A, B, C] = digits;
      return [
        { text: 'Write each number by place value:' },
        { tex: '(100A + 10B + C) + (10A + B) + A = 111A + 11B + C' },
        { text: '$11B + C$ is at most $99 + 9 = 108$, less than 111, so $A$ is the number of whole 111s in the total:' },
        { tex: `${total} = 111 \\times ${A} + ${total - 111 * A}` },
        { text: '$C$ is at most 9, less than 11, so $B$ is the number of whole 11s in what is left:' },
        { tex: `${11 * B + C} = 11 \\times ${B} + ${C}` },
        { tex: `ABC = ${digitsValue(digits)}` },
      ];
    }
    const [A, B, C, D] = digits;
    const r1 = total - 1111 * A;
    const r2 = r1 - 111 * B;
    return [
      { text: 'Write each number by place value:' },
      { tex: 'ABCD + ABC + AB + A = 1111A + 111B + 11C + D' },
      { text: 'The rest, $111B + 11C + D$, is at most $999 + 99 + 9 = 1107$, less than 1111, so $A$ is the number of 1111s:' },
      { tex: `${total} = 1111 \\times ${A} + ${r1}` },
      { text: 'In the same way, $11C + D$ is at most 108, less than 111:' },
      { tex: `${r1} = 111 \\times ${B} + ${r2}` },
      { tex: `${r2} = 11 \\times ${C} + ${D}` },
      { tex: `ABCD = ${digitsValue(digits)}` },
    ];
  },
};

/* ---------- a number and its reverse ---------- */

interface ReverseParams {
  /** [A, B] for AB + BA, or [A, B, C] for ABC − CBA; the first digit is the larger end. */
  digits: number[];
}

/** Every digit assignment meeting the clues, found by brute force. */
function reverseSolutions(digits: number[]): number[][] {
  const out: number[][] = [];
  if (digits.length === 2) {
    const [A, B] = digits;
    const s = 11 * (A + B);
    for (let a = 1; a <= 9; a += 1) {
      for (let b = 1; b <= 9; b += 1) {
        if (a > b && 10 * a + b + 10 * b + a === s && a * b === A * B) out.push([a, b]);
      }
    }
    return out;
  }
  const [A, B, C] = digits;
  const t = 99 * (A - C);
  for (let a = 1; a <= 9; a += 1) {
    for (let b = 0; b <= 9; b += 1) {
      for (let c = 1; c <= 9; c += 1) {
        const abc = 100 * a + 10 * b + c;
        const cba = 100 * c + 10 * b + a;
        if (abc - cba === t && a * c === A * C && a + b + c === A + B + C) out.push([a, b, c]);
      }
    }
  }
  return out;
}

const cmFzCryptReverse: Generator<ReverseParams> = {
  id: 'cm-fz-crypt-reverse',
  sample(rng, difficulty) {
    for (;;) {
      const digits =
        difficulty >= 2 ? [rng.int(2, 9), rng.int(0, 9), rng.int(1, 8)] : [rng.int(2, 9), rng.int(1, 8)];
      const last = digits[digits.length - 1];
      if (digits[0] <= last) continue;
      if (reverseSolutions(digits).length !== 1) continue;
      return { digits };
    }
  },
  render({ digits }) {
    if (digits.length === 2) {
      const [A, B] = digits;
      return typed(
        [
          say('$A$ and $B$ are different digits, neither 0, with $A$ larger than $B$.'),
          show(`AB + BA = ${11 * (A + B)}`),
          show(`A \\times B = ${A * B}`),
          say('What is the two-digit number $AB$?'),
        ],
        digitsValue(digits),
        'AB =',
      );
    }
    const [A, B, C] = digits;
    return typed(
      [
        say('$A$, $B$ and $C$ are digits, and $A$ and $C$ are not 0.'),
        show(`ABC - CBA = ${99 * (A - C)}`),
        show(`A \\times C = ${A * C}, \\quad A + B + C = ${A + B + C}`),
        say('What is the three-digit number $ABC$?'),
      ],
      digitsValue(digits),
      'ABC =',
    );
  },
  choices({ digits }) {
    const value = digitsValue(digits);
    const reversed = digitsValue([...digits].reverse());
    // Other digits that meet the sum (or the difference) but not the product.
    const near: number[] = [];
    if (digits.length === 2) {
      const [A, B] = digits;
      for (let a = 2; a <= 9; a += 1) {
        const b = A + B - a;
        if (a !== A && b >= 1 && b < a) near.push(10 * a + b);
      }
    } else {
      const [A, B, C] = digits;
      for (let a = 2; a <= 9; a += 1) {
        const c = a - (A - C);
        if (a !== A && c >= 1) near.push(100 * a + 10 * B + c);
      }
    }
    near.sort((x, y) => Math.abs(x - value) - Math.abs(y - value));
    return numberOptions(value, [reversed, ...near], 1, digits.length === 2 ? 10 : 100);
  },
  solution({ digits }) {
    if (digits.length === 2) {
      const [A, B] = digits;
      return [
        { text: 'By place value, the two numbers add to a multiple of 11:' },
        { tex: 'AB + BA = (10A + B) + (10B + A) = 11(A + B)' },
        { tex: `A + B = ${11 * (A + B)} \\div 11 = ${A + B}` },
        { text: `Two digits adding to ${A + B} and multiplying to ${A * B} are ${B} and ${A}. $A$ is the larger:` },
        { tex: `AB = ${10 * A + B}` },
        { tex: `${10 * A + B} + ${10 * B + A} = ${11 * (A + B)}` },
      ];
    }
    const [A, B, C] = digits;
    return [
      { text: 'By place value the middle digits cancel, leaving a multiple of 99:' },
      { tex: 'ABC - CBA = 99A - 99C = 99(A - C)' },
      { tex: `A - C = ${99 * (A - C)} \\div 99 = ${A - C}` },
      { text: `Two digits ${A - C} apart with product ${A * C}: $A = ${A}$ and $C = ${C}$. Then` },
      { tex: `B = ${A + B + C} - ${A} - ${C} = ${B}` },
      { tex: `ABC = ${digitsValue(digits)}` },
    ];
  },
};

/* ---------- ABCABC = ABC × 7 × 11 × 13 ---------- */

interface BlockParams {
  abc: number;
}

const cmFzCryptBlock: Generator<BlockParams> = {
  id: 'cm-fz-crypt-block',
  sample(rng, difficulty) {
    for (;;) {
      const abc = rng.int(100, 999);
      const shared = [7, 11, 13].filter((q) => abc % q === 0);
      if (abc % 10 === 0) continue;
      // Difficulty 2 has one of 7, 11 and 13 twice in the factorisation, the trap.
      if (difficulty >= 2 ? shared.length !== 1 : shared.length !== 0) continue;
      if (factorise(abc).length < 2) continue;
      return { abc };
    }
  },
  render({ abc }) {
    return typed(
      [
        say('Each letter stands for a digit. The six-digit number $ABCABC$ factorises as'),
        show(factorTex(abc * 1001)),
        say('What is $ABC$?'),
      ],
      abc,
      'ABC =',
    );
  },
  choices({ abc }) {
    const d = String(abc).split('').map(Number);
    const rotations = [digitsValue([d[1], d[2], d[0]]), digitsValue([d[2], d[0], d[1]]), digitsValue([d[2], d[1], d[0]])];
    const shared = [7, 11, 13].find((q) => abc % q === 0);
    return numberOptions(abc, shared ? [abc / shared, ...rotations] : rotations, 1, 100);
  },
  solution({ abc }) {
    const shared = [7, 11, 13].find((q) => abc % q === 0);
    const steps: SolutionStep[] = [
      { text: 'Writing a three-digit block twice multiplies it by 1001:' },
      { tex: 'ABCABC = ABC \\times 1000 + ABC = ABC \\times 1001' },
      { tex: '1001 = 7 \\times 11 \\times 13' },
      { text: 'So take one 7, one 11 and one 13 out of the factorisation. What is left is $ABC$:' },
      { tex: `ABC = ${factorTex(abc)} = ${abc}` },
    ];
    if (shared) steps.push({ text: `One ${shared} stays: $ABC$ is itself a multiple of ${shared}, and 1001 takes only one of them.` });
    return steps;
  },
};

/* ---------- two missing digits, a divisor split into coprime parts ---------- */

interface DivisibleParams {
  /** Digits with -1 for A and -2 for B. */
  shape: number[];
  divisor: number;
}

/** [the last-digits test, the digit-sum test] a divisor splits into. */
const SPLITS: Record<number, [number, number]> = { 72: [8, 9], 88: [8, 11], 44: [4, 11], 55: [5, 11] };

const fill = (shape: number[], A: number, B: number) => shape.map((d) => (d === -1 ? A : d === -2 ? B : d));
const shapeTex = (shape: number[]) => shape.map((d) => (d === -1 ? 'A' : d === -2 ? 'B' : `${d}`)).join('');

function divisibleSolutions({ shape, divisor }: DivisibleParams): [number, number][] {
  const out: [number, number][] = [];
  for (let A = shape[0] === -1 ? 1 : 0; A <= 9; A += 1) {
    for (let B = 0; B <= 9; B += 1) {
      if (digitsValue(fill(shape, A, B)) % divisor === 0) out.push([A, B]);
    }
  }
  return out;
}

const cmFzCryptDivisible: Generator<DivisibleParams> = {
  id: 'cm-fz-crypt-divisible',
  sample(rng, difficulty) {
    for (;;) {
      const divisor = difficulty >= 2 ? rng.pick([44, 55]) : rng.pick([72, 88]);
      const shape = Array.from({ length: 5 }, (_, i) => rng.int(i === 0 ? 1 : 0, 9));
      shape[rng.int(0, 1)] = -1;
      shape[4] = -2;
      if (divisibleSolutions({ shape, divisor }).length !== 1) continue;
      return { shape, divisor };
    }
  },
  render(p) {
    const [[A, B]] = divisibleSolutions(p);
    return {
      kind: 'tiles',
      prompt: [
        say(`$A$ and $B$ are digits, and the five-digit number below is a multiple of ${p.divisor}. Find $A$ and $B$.`),
        show(shapeTex(p.shape)),
      ],
      template: 'A = {0}, \\quad B = {1}',
      bank: numberBank([A, B], [(A + 1) % 10, (B + 5) % 10, (A + B) % 10, 9 - A], 3, 1, 0),
      answer: [num(A), num(B)],
    };
  },
  solution(p) {
    const [[A, B]] = divisibleSolutions(p);
    const [last, sumTest] = SPLITS[p.divisor];
    const places = last === 8 ? 3 : last === 4 ? 2 : 1;
    const tail = p.shape.slice(5 - places);
    const candidates = Array.from({ length: 10 }, (_, b) => b).filter((b) => digitsValue(fill(tail, 0, b)) % last === 0);
    const steps: SolutionStep[] = [
      { text: `$${p.divisor} = ${last} \\times ${sumTest}$, and ${last} and ${sumTest} share no factor, so the number passes both tests.` },
    ];
    if (last === 5) {
      steps.push({ text: 'A multiple of 5 ends in 0 or 5:' });
    } else {
      steps.push({
        text: `A multiple of ${last} has its last ${places === 3 ? 'three' : 'two'} digits, here $${shapeTex(tail)}$, making a multiple of ${last}:`,
      });
      steps.push({ tex: candidates.map((b) => digitsValue(fill(tail, 0, b))).join(', \\quad ') });
    }
    steps.push({ tex: `B = ${candidates.join(' \\text{ or } ')}` });
    const signs = p.shape.map((_, i) => (i % 2 === 0 ? 1 : -1));
    if (sumTest === 9) {
      const known = p.shape.reduce((t, d) => t + (d >= 0 ? d : 0), 0);
      steps.push(
        { text: `A multiple of 9 has digits adding to a multiple of 9. With $B = ${B}$ the digits add to` },
        { tex: `${known} + ${B} + A = ${known + B} + A` },
        { text: `Only $A = ${A}$ makes a multiple of 9:` },
        { tex: `${known + B} + ${A} = ${known + A + B}` },
      );
    } else {
      const known = p.shape.reduce((t, d, i) => t + (d >= 0 ? signs[i] * d : 0), 0);
      const aSign = signs[p.shape.indexOf(-1)] > 0 ? '+' : '-';
      steps.push({ text: 'A multiple of 11 has its digits, with signs $+, -, +, \\ldots$ from the left, adding to a multiple of 11:' });
      const start = (a: string) => (known === 0 ? `${aSign === '+' ? '' : '-'}${a}` : `${known} ${aSign} ${a}`);
      steps.push({ tex: `${start('A')} + B` });
      steps.push({
        text:
          candidates.length > 1
            ? `Try each $B$: only $B = ${B}$ leaves a digit $A$ that works, $A = ${A}$:`
            : `With $B = ${B}$, only $A = ${A}$ makes a multiple of 11:`,
      });
      steps.push({ tex: `${start(`${A}`)} + ${B} = ${known + (aSign === '+' ? A : -A) + B}` });
    }
    steps.push({ tex: `${digitsValue(fill(p.shape, A, B))} = ${p.divisor} \\times ${digitsValue(fill(p.shape, A, B)) / p.divisor}` });
    return steps;
  },
};

export const contestFactorizationGenerators = [
  cmFzSquareMultiplier,
  cmFzSquareMultiplierTiles,
  cmFzZerosProduct,
  cmFzNearSquare,
  cmFzDivisorCount,
  cmFzDivisorTable,
  cmFzDivisorSum,
  cmFzSpecialDivisors,
  cmFzHcfLcmProduct,
  cmFzTogether,
  cmFzPieces,
  cmFzHcfLcmTiles,
  cmFzFactorialZeros,
  cmFzFactorialPower,
  cmFzFactorialTable,
  cmFzFactorialSmallest,
  cmFzCryptPlace,
  cmFzCryptReverse,
  cmFzCryptBlock,
  cmFzCryptDivisible,
];

