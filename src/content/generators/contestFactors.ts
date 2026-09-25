/**
 * Contest Math, level 16: Finding and Counting Factors.
 *
 * A step on from Level 10 (`contestFactorization.ts`), which already counts
 * divisors, adds them, reads the HCF and LCM off two factorisations and uses
 * HCF × LCM = a × b. Here each question turns on a less obvious use of the
 * same factorisation:
 *
 * - Prime Factorization: the largest k for which N is a perfect k-th power is
 *   the HCF of its powers; the smallest number with a given digit product
 *   packs the primes into the largest digits; unique factorisation lets the
 *   powers on each side be matched as equations; a root is read off halved
 *   (or thirded) powers without multiplying anything out.
 * - GCD/LCM: a common divisor divides the difference (and, for 2^m − 1, the
 *   exponents run Euclid's algorithm themselves); the pairs with a given LCM
 *   are counted a prime at a time, 2e + 1 each; a gcd and a sum leave a
 *   coprime split; equal remainders make a shifted multiple of the LCM.
 * - Counting Factors: divisors pair up d with N/d, so only squares have an
 *   odd count and the product of the divisors is N to half the count; the
 *   divisors of N² pair around N; a divisor that is a multiple of m is m
 *   times a divisor of N/m.
 *
 * Every answer is a whole number. Shared helpers are in `contestMath.ts`.
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
const tau = (f: Factors) => f.reduce((t, [, e]) => t * (e + 1), 1);
const product = (values: number[]) => values.reduce((t, v) => t * v, 1);
const gcdAll = (values: number[]) => values.reduce((t, v) => gcd(t, v), 0);
const powerOf = (f: Factors, p: number) => f.find(([q]) => q === p)?.[1] ?? 0;

/** Several factorisations multiplied: powers of a shared prime add. */
function merge(...parts: Factors[]): Factors {
  const out = new Map<number, number>();
  for (const [p, e] of parts.flat()) out.set(p, (out.get(p) ?? 0) + e);
  return [...out.entries()].filter(([, e]) => e > 0).sort((x, y) => x[0] - y[0]);
}

/** A factorisation with every power multiplied by k. */
const scale = (f: Factors, k: number): Factors => f.map(([p, e]): [number, number] => [p, e * k]);

/** `count` distinct primes from `pool`, smallest first, each with a power from 1 to `maxExp`. */
function randomFactors(rng: Rng, pool: number[], count: number, maxExp: number): Factors {
  return rng
    .sample(pool, count)
    .sort((a, b) => a - b)
    .map((p): [number, number] => [p, rng.int(1, maxExp)]);
}

/** "2, 3 and 5". */
function listText(items: (string | number)[]): string {
  if (items.length === 1) return `${items[0]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** `(3 + 1)(2 + 1)` */
const choicesTex = (f: Factors) => f.map(([, e]) => `(${e} + 1)`).join('');

/* ================================================================
 * Lesson 1: Prime Factorization
 * ================================================================ */

/* ---------- the largest k for which N is a perfect k-th power ---------- */

interface PerfectPowerParams {
  /** [base, exponent]; the bases are primes at difficulty 1. */
  terms: [number, number][];
}

const PP_BASES = [4, 6, 8, 9, 10, 12, 18, 20, 24, 25, 27, 45, 50];

const ppFactors = (terms: [number, number][]) => merge(...terms.map(([b, e]) => scale(factorise(b), e)));
const ppTex = (terms: [number, number][]) => terms.map(([b, e]) => powTex(b, e)).join(' \\times ');
const ppComposite = (terms: [number, number][]) => terms.some(([b]) => !isPrime(b));

const cmFcPerfectPower: Generator<PerfectPowerParams> = {
  id: 'cm-fc-perfect-power',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const bases = rng.sample(PP_BASES, rng.int(2, 3)).sort((a, b) => a - b);
        const terms = bases.map((b): [number, number] => [b, rng.int(2, 9)]);
        const f = ppFactors(terms);
        const g = gcdAll(f.map(([, e]) => e));
        if (f.length < 2 || g < 2 || g > 12) continue;
        // The trap is reading the powers before factorising, so it must mislead.
        if (g === gcdAll(terms.map(([, e]) => e))) continue;
        if (Math.max(...f.map(([, e]) => e)) > 40) continue;
        return { terms };
      }
      const primes = rng.sample([2, 3, 5, 7], rng.int(2, 3)).sort((a, b) => a - b);
      const g = rng.int(2, 6);
      // Every power at least twice g, so the smallest power is never the answer.
      const parts = primes.map(() => rng.int(2, 6));
      if (gcdAll(parts) !== 1 || Math.max(...parts) * g > 30) continue;
      return { terms: primes.map((p, i): [number, number] => [p, parts[i] * g]) };
    }
  },
  render({ terms }) {
    const f = ppFactors(terms);
    return typed(
      [say('$N$ can be written as $m^{k}$, with $m$ and $k$ whole numbers. What is the largest possible $k$?'), show(`N = ${ppTex(terms)}`)],
      gcdAll(f.map(([, e]) => e)),
      'k =',
    );
  },
  choices({ terms }) {
    const f = ppFactors(terms);
    const exps = f.map(([, e]) => e);
    const g = gcdAll(exps);
    return numberOptions(g, [gcdAll(terms.map(([, e]) => e)), Math.min(...exps), 2, g * 2], 1, 1);
  },
  solution({ terms }) {
    const f = ppFactors(terms);
    const exps = f.map(([, e]) => e);
    const g = gcdAll(exps);
    const steps: SolutionStep[] = [];
    if (ppComposite(terms)) {
      steps.push({ text: 'Write each base as primes, then add the powers of each prime:' });
      for (const [b, e] of terms) {
        if (!isPrime(b)) steps.push({ tex: `${powTex(b, e)} = ${factorsTex(scale(factorise(b), e))}` });
      }
      steps.push({ tex: `N = ${factorsTex(f)}` });
    }
    steps.push(
      { text: 'For $N = m^{k}$, every power of a prime in $N$ must be a multiple of $k$. So the largest $k$ is the HCF of the powers:' },
      { tex: `\\text{HCF}(${exps.join(', ')}) = ${g}` },
      { tex: `N = (${factorsTex(scale(f, 1 / g))})^{${g}}` },
    );
    const shown = gcdAll(terms.map(([, e]) => e));
    if (ppComposite(terms) && shown !== g) {
      steps.push({ text: `The powers as first written have HCF ${shown}; only the prime powers count.` });
    }
    return steps;
  },
};

/* ---------- the smallest number with a given digit product ---------- */

interface DigitProductParams {
  p: number;
}

/** Digits taken out largest first; null when a prime above 7 is left. */
function packDigits(p: number, digits = [9, 8, 7, 6, 5, 4, 3, 2]): number[] | null {
  let rest = p;
  const out: number[] = [];
  for (const d of digits) {
    while (rest % d === 0) {
      out.push(d);
      rest /= d;
    }
  }
  return rest === 1 ? out : null;
}

const ascending = (digits: number[]) => Number([...digits].sort((a, b) => a - b).join(''));
const descending = (digits: number[]) => Number([...digits].sort((a, b) => b - a).join(''));
const primeDigits = (p: number) => factorise(p).flatMap(([q, e]) => Array.from({ length: e }, () => q));

function sampleDigitProduct(rng: Rng, difficulty: number): number {
  for (;;) {
    const p =
      difficulty >= 2
        ? 2 ** rng.int(0, 8) * 3 ** rng.int(0, 6) * 5 ** rng.int(0, 2) * 7 ** rng.int(0, 2)
        : 2 ** rng.int(0, 6) * 3 ** rng.int(0, 4) * 5 ** rng.int(0, 1) * 7 ** rng.int(0, 1);
    const digits = packDigits(p);
    if (!digits) continue;
    if (difficulty >= 2) {
      if (p < 1000 || p > 200000 || digits.length < 4 || digits.length > 7) continue;
      // The twist: a leftover 2 and 3, or two 2s, have to be packed as 6 or 4.
      if (!digits.some((d) => d === 6 || d === 4)) continue;
    } else if (p < 60 || p > 1000 || digits.length < 3) {
      continue;
    }
    // Some prime has to pair up, or the digits are just the primes.
    if (ascending(primeDigits(p)) === ascending(digits)) continue;
    return p;
  }
}

const cmFcDigitProduct: Generator<DigitProductParams> = {
  id: 'cm-fc-digit-product',
  sample: (rng, difficulty) => ({ p: sampleDigitProduct(rng, difficulty) }),
  render({ p }) {
    return typed(
      [say(`What is the smallest positive whole number whose digits multiply to give ${p}?`)],
      ascending(packDigits(p) as number[]),
      '\\text{number} =',
    );
  },
  choices({ p }) {
    const digits = packDigits(p) as number[];
    const primes = primeDigits(p);
    // No 6 or 4: a leftover 2 and 3 kept as two digits.
    const noSix = packDigits(p, [9, 8, 7, 5, 3, 2]) as number[];
    const slips = [descending(digits), ascending(noSix)];
    if (primes.length <= 8) slips.push(ascending(primes));
    const sorted = [...digits].sort((a, b) => a - b);
    slips.push(Number([sorted[1], sorted[0], ...sorted.slice(2)].join('')));
    return numberOptions(ascending(digits), slips, 1, 1);
  },
  solution({ p }) {
    const digits = packDigits(p) as number[];
    const primes = primeDigits(p);
    const steps: SolutionStep[] = [
      { tex: `${p} = ${factorTex(p)}` },
      {
        text: 'Fewer digits make a smaller number, so pack the primes into digits as large as possible: take out 9s first, then 8s, and so on down.',
      },
      { tex: `${p} = ${[...digits].sort((a, b) => b - a).join(' \\times ')}` },
      { text: 'Then put the smallest digit first:' },
      { tex: `\\text{number} = ${ascending(digits)}` },
    ];
    if (primes.length <= 8) {
      steps.push({ text: `Using the primes as digits, ${ascending(primes)}, takes more digits and gives a larger number.` });
    }
    return steps;
  },
};

/* ---------- matching the powers of each prime ---------- */

interface ExponentMatchParams {
  b1: number;
  b2: number;
  a: number;
  b: number;
}

/** One base a prime power, so one prime pins a letter down at once. */
const EM_EASY: [number, number][] = [
  [4, 6], [8, 6], [9, 6], [27, 6], [4, 12], [8, 12], [9, 12], [4, 18], [8, 18], [27, 18],
  [4, 10], [8, 10], [25, 10], [9, 15], [25, 15], [4, 14], [49, 14], [8, 24], [9, 24],
];
/** Both bases composite: the two equations have to be solved together. */
const EM_HARD: [number, number][] = [
  [6, 12], [6, 18], [12, 18], [6, 24], [18, 24], [10, 20], [10, 50], [20, 50], [15, 45], [12, 54], [24, 36], [6, 54], [14, 28],
];

interface PrimeEquation {
  p: number;
  alpha: number;
  beta: number;
  total: number;
}

function emEquations({ b1, b2, a, b }: ExponentMatchParams): PrimeEquation[] {
  const f1 = factorise(b1);
  const f2 = factorise(b2);
  const primes = [...new Set([...f1, ...f2].map(([p]) => p))].sort((x, y) => x - y);
  return primes.map((p) => {
    const alpha = powerOf(f1, p);
    const beta = powerOf(f2, p);
    return { p, alpha, beta, total: alpha * a + beta * b };
  });
}

const emTex = (params: ExponentMatchParams) =>
  `${params.b1}^{a} \\times ${params.b2}^{b} = ${emEquations(params)
    .map(({ p, total }) => powTex(p, total))
    .join(' \\times ')}`;

/** `2a`, `a`, or nothing for a zero coefficient. */
const term = (c: number, v: string) => (c === 0 ? '' : c === 1 ? v : `${c}${v}`);
const lhsTex = (alpha: number, beta: number) => [term(alpha, 'a'), term(beta, 'b')].filter(Boolean).join(' + ');

function sampleExponentMatch(rng: Rng, difficulty: number): ExponentMatchParams {
  for (;;) {
    const [b1, b2] = rng.pick(difficulty >= 2 ? EM_HARD : EM_EASY);
    const a = rng.int(1, difficulty >= 2 ? 9 : 8);
    const b = rng.int(1, difficulty >= 2 ? 9 : 8);
    if (a === b) continue;
    const params = { b1, b2, a, b };
    const eqs = emEquations(params);
    if (eqs.length !== 2) continue;
    if (eqs[0].alpha * eqs[1].beta === eqs[1].alpha * eqs[0].beta) continue;
    if (Math.max(...eqs.map((e) => e.total)) > 40) continue;
    return params;
  }
}

function exponentMatchSteps(params: ExponentMatchParams): SolutionStep[] {
  const { b1, b2, a, b } = params;
  const eqs = emEquations(params);
  const steps: SolutionStep[] = [
    { tex: `${b1} = ${factorTex(b1)}, \\qquad ${b2} = ${factorTex(b2)}` },
    { text: 'A number has only one prime factorisation, so the powers of each prime must match on the two sides:' },
  ];
  for (const e of eqs) {
    steps.push({ text: `Powers of ${e.p}:` }, { tex: `${lhsTex(e.alpha, e.beta)} = ${e.total}` });
  }
  const single = eqs.find((e) => e.alpha === 0 || e.beta === 0);
  // Which letter the one-letter equation (or the elimination) finds first.
  let first: 'a' | 'b';
  if (single) {
    first = single.alpha === 0 ? 'b' : 'a';
    const c = single.alpha === 0 ? single.beta : single.alpha;
    if (c !== 1) steps.push({ tex: `${first} = ${single.total} \\div ${c} = ${first === 'a' ? a : b}` });
    else steps.push({ text: `So $${first} = ${first === 'a' ? a : b}$.` });
  } else {
    first = 'a';
    const [e1, e2] = eqs;
    let det = e1.alpha * e2.beta - e2.alpha * e1.beta;
    let [top, bottom, sTop, sBottom] = [e1, e2, e2.beta, e1.beta];
    if (det < 0) {
      det = -det;
      [top, bottom, sTop, sBottom] = [e2, e1, e1.beta, e2.beta];
    }
    const times = (s: number) => (s === 1 ? '' : `${s} times `);
    steps.push(
      { text: `Take ${times(sBottom)}the equation for the ${bottom.p}s from ${times(sTop)}the one for the ${top.p}s, so $b$ cancels:` },
      { tex: `${term(det, 'a')} = ${det * a}` },
    );
    if (det !== 1) steps.push({ tex: `a = ${a}` });
  }
  const known = first === 'a' ? a : b;
  const other = first === 'a' ? 'b' : 'a';
  const otherValue = first === 'a' ? b : a;
  const use = eqs.find((e) => (other === 'b' ? e.beta : e.alpha) !== 0) as PrimeEquation;
  const cKnown = first === 'a' ? use.alpha : use.beta;
  const cOther = first === 'a' ? use.beta : use.alpha;
  steps.push(
    { text: `Put $${first} = ${known}$ into the equation for the ${use.p}s:` },
    { tex: cKnown === 0 ? `${term(cOther, other)} = ${use.total}` : `${cKnown * known} + ${term(cOther, other)} = ${use.total}` },
  );
  if (cOther !== 1) steps.push({ tex: `${term(cOther, other)} = ${use.total - cKnown * known}` });
  steps.push({ tex: `${other} = ${otherValue}` });
  return steps;
}

const cmFcExponentMatch: Generator<ExponentMatchParams> = {
  id: 'cm-fc-exponent-match',
  sample: sampleExponentMatch,
  render(params) {
    return typed(
      [say('Whole numbers $a$ and $b$ satisfy'), show(emTex(params)), say('What is $a + b$?')],
      params.a + params.b,
      'a + b =',
    );
  },
  choices(params) {
    const eqs = emEquations(params);
    const [e1, e2] = eqs;
    // Reading the powers on the right as a and b, or one of them alone.
    return numberOptions(params.a + params.b, [e1.total + e2.total, e1.total, e2.total], 1, 1);
  },
  solution(params) {
    return [...exponentMatchSteps(params), { tex: `a + b = ${params.a} + ${params.b} = ${params.a + params.b}` }];
  },
};

const cmFcExponentMatchTiles: Generator<ExponentMatchParams> = {
  id: 'cm-fc-exponent-match-tiles',
  sample: sampleExponentMatch,
  render(params) {
    const eqs = emEquations(params);
    return {
      kind: 'tiles',
      prompt: [say('Find the whole numbers $a$ and $b$.'), show(emTex(params))],
      template: 'a = {0}, \\quad b = {1}',
      bank: numberBank([params.a, params.b], [...eqs.map((e) => e.total), params.a + params.b], 3, 1, 1),
      answer: [num(params.a), num(params.b)],
    };
  },
  solution: exponentMatchSteps,
};

/* ---------- a root read off the powers, as a table ---------- */

interface RootTableParams {
  factors: number[];
  /** 2 for a square root, 3 for a cube root. */
  root: 2 | 3;
}

const RT_POOL = [6, 8, 10, 12, 14, 15, 18, 20, 21, 24, 27, 28, 30, 35, 40, 42, 45, 48, 50, 54, 60, 63, 75];

const rtFactors = (factors: number[]) => merge(...factors.map(factorise));
const rtRootTex = (root: 2 | 3) => (root === 2 ? '\\sqrt{N}' : '\\sqrt[3]{N}');
const rtValue = ({ factors, root }: RootTableParams) => valueOf(scale(rtFactors(factors), 1 / root));

const cmFcRootTable: Generator<RootTableParams> = {
  id: 'cm-fc-root-table',
  sample(rng, difficulty) {
    const root = difficulty >= 2 ? 3 : 2;
    for (;;) {
      const factors = rng.sample(RT_POOL, rng.int(3, 4)).sort((a, b) => a - b);
      const f = rtFactors(factors);
      if (f.some(([, e]) => e % root !== 0)) continue;
      if (f.length < 2) continue;
      const value = rtValue({ factors, root });
      if (value > 20000) continue;
      return { factors, root };
    }
  },
  render(params) {
    const { factors, root } = params;
    const f = rtFactors(factors);
    const value = rtValue(params);
    const rootTex = rtRootTex(root);
    const answer = [...f.flatMap(([, e]) => [e, e / root]), value];
    const [p0, e0] = f[0];
    const pLast = f[f.length - 1][0];
    return {
      kind: 'table',
      prompt: [
        say(
          root === 2
            ? '$N$ is a perfect square. Fill in the power of each prime in $N$ and in $\\sqrt{N}$, then $\\sqrt{N}$ itself.'
            : '$N$ is a perfect cube. Fill in the power of each prime in $N$ and in its cube root, then the cube root itself.',
        ),
        show(`N = ${factors.join(' \\times ')}`),
      ],
      columns: ['\\text{prime}', '\\text{in } N', `\\text{in } ${rootTex}`],
      rows: [...f.map(([p]): (string | null)[] => [`${p}`, null, null]), [rootTex, '', null]],
      bank: numberBank(answer, [value * pLast, value / p0, e0 + 1, (e0 / root) * 2 + 1], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution(params) {
    const { factors, root } = params;
    const f = rtFactors(factors);
    return [
      { text: 'Never multiply out. Factorise each number and add the powers of each prime:' },
      { tex: factors.map((n) => `${n} = ${factorTex(n)}`).join(', \\qquad ') },
      { tex: `N = ${factorsTex(f)}` },
      { text: root === 2 ? 'Halve each power for the square root:' : 'Divide each power by 3 for the cube root:' },
      { tex: `${rtRootTex(root)} = ${factorsTex(scale(f, 1 / root))} = ${rtValue(params)}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: GCD/LCM
 * ================================================================ */

/* ---------- a common divisor divides the difference ---------- */

type EuclidParams = { kind: 'close'; a: number; d: number } | { kind: 'power'; base: number; m: number; n: number };

const divisorsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);

function euclidAnswer(p: EuclidParams): number {
  if (p.kind === 'close') return gcd(p.a, p.a + p.d);
  return p.base ** gcd(p.m, p.n) - 1;
}

const cmFcEuclid: Generator<EuclidParams> = {
  id: 'cm-fc-euclid',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const base = rng.pick([2, 2, 3]);
        const g = rng.int(2, base === 2 ? 12 : 7);
        const [s, t] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10], 2).sort((x, y) => y - x);
        if (gcd(s, t) !== 1) continue;
        const [m, n] = [g * s, g * t];
        if (m > (base === 2 ? 60 : 40)) continue;
        return { kind: 'power', base, m, n };
      }
      const d = rng.int(20, 99);
      if (isPrime(d)) continue;
      const g = rng.pick(divisorsOf(d).filter((x) => x > 2 && x < d));
      const k = rng.int(Math.ceil(1000 / g), Math.floor(9000 / g));
      if (gcd(k, d / g) !== 1) continue;
      return { kind: 'close', a: g * k, d };
    }
  },
  render(p) {
    if (p.kind === 'power') {
      return typed(
        [say(`What is the greatest common divisor of $${p.base}^{${p.m}} - 1$ and $${p.base}^{${p.n}} - 1$?`)],
        euclidAnswer(p),
        '\\gcd =',
      );
    }
    return typed([say(`What is the greatest common divisor of ${p.a} and ${p.a + p.d}?`)], euclidAnswer(p), '\\gcd =');
  },
  choices(p) {
    const answer = euclidAnswer(p);
    if (p.kind === 'power') {
      const g = gcd(p.m, p.n);
      const once = p.base ** (p.m - p.n) - 1;
      return numberOptions(answer, [p.base ** g, once <= 100000 ? once : g, g, p.base ** g + 1], 1, 1);
    }
    const others = divisorsOf(p.d).filter((x) => x > 1 && x !== answer);
    return numberOptions(answer, [p.d, 1, ...others.reverse()], 1, 1);
  },
  solution(p) {
    const answer = euclidAnswer(p);
    if (p.kind === 'power') {
      const { base: B, m, n } = p;
      const g = gcd(m, n);
      return [
        { text: 'A common divisor of two numbers also divides the first minus any multiple of the second:' },
        { tex: `(${B}^{${m}} - 1) - ${B}^{${m - n}}(${B}^{${n}} - 1)` },
        { tex: `= ${B}^{${m - n}} - 1` },
        { text: 'So the exponents can be taken from each other just as in Euclid’s algorithm, and the answer is the gcd of the exponents:' },
        { tex: `\\gcd(${m}, ${n}) = ${g}` },
        { tex: `${B}^{${g}} - 1 = ${answer}` },
      ];
    }
    const b = p.a + p.d;
    const r = p.a % p.d;
    return [
      { text: 'A common divisor of two numbers also divides their difference:' },
      { tex: `${b} - ${p.a} = ${p.d}` },
      { tex: `\\gcd(${p.a}, ${b}) = \\gcd(${p.a}, ${p.d})` },
      { text: `Do it again: take as many ${p.d}s from ${p.a} as will go, and only the remainder matters:` },
      { tex: `${p.a} = ${Math.floor(p.a / p.d)} \\times ${p.d} + ${r}` },
      { tex: `\\gcd(${p.d}, ${r}) = ${answer}` },
      { text: `Answering ${p.d}, the difference itself, forgets to check it divides ${p.a}.` },
    ];
  },
};

/* ---------- counting the pairs with a given LCM ---------- */

interface LcmPairsParams {
  f: Factors;
  /** Count pairs a ≤ b rather than ordered pairs. */
  unordered: boolean;
}

const pairsTotal = (f: Factors) => product(f.map(([, e]) => 2 * e + 1));

function sampleLcmFactors(rng: Rng, count: number, maxExp: number, maxN: number): Factors {
  for (;;) {
    const f = randomFactors(rng, [2, 3, 5, 7], count, maxExp);
    if (valueOf(f) > maxN || valueOf(f) < 12) continue;
    if (f.every(([, e]) => e === 1)) continue;
    return f;
  }
}

const cmFcLcmPairs: Generator<LcmPairsParams> = {
  id: 'cm-fc-lcm-pairs',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { f: sampleLcmFactors(rng, rng.int(2, 3), 3, 5000), unordered: true };
    return { f: sampleLcmFactors(rng, 2, 4, 3000), unordered: false };
  },
  render({ f, unordered }) {
    const N = valueOf(f);
    const T = pairsTotal(f);
    return typed(
      [
        say(
          unordered
            ? `How many pairs of positive whole numbers $a \\le b$ have lowest common multiple ${N}?`
            : `How many ordered pairs $(a, b)$ of positive whole numbers have lowest common multiple ${N}?`,
        ),
      ],
      unordered ? (T + 1) / 2 : T,
      '\\text{pairs} =',
    );
  },
  choices({ f, unordered }) {
    const T = pairsTotal(f);
    const t = tau(f);
    if (unordered) return numberOptions((T + 1) / 2, [T, (T - 1) / 2, t], 1, 1);
    return numberOptions(T, [t, t * t, (T + 1) / 2, T - 1], 1, 1);
  },
  solution({ f, unordered }) {
    const N = valueOf(f);
    const T = pairsTotal(f);
    const steps: SolutionStep[] = [
      { tex: `${N} = ${factorsTex(f)}` },
      {
        text: 'Take one prime at a time. If its power in the LCM is $e$, then $a$ and $b$ each take it $0$ to $e$ times, and at least one takes all $e$: $e + 1$ pairs with $a$ at $e$, $e + 1$ with $b$ at $e$, less the one counted twice, $2e + 1$.',
      },
      { tex: f.map(([, e]) => `(2 \\times ${e} + 1)`).join('') },
      { tex: `${f.map(([, e]) => 2 * e + 1).join(' \\times ')} = ${T}` },
    ];
    if (unordered) {
      steps.push(
        { text: `That counts ordered pairs. Only $a = b = ${N}$ has the two equal, and the other ${T - 1} come in swapped twos:` },
        { tex: `\\frac{${T} - 1}{2} + 1 = ${(T + 1) / 2}` },
      );
    }
    return steps;
  },
};

const cmFcLcmPairsTable: Generator<LcmPairsParams> = {
  id: 'cm-fc-lcm-pairs-table',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { f: sampleLcmFactors(rng, 3, 3, 20000), unordered: false };
    return { f: sampleLcmFactors(rng, 2, 4, 3000), unordered: false };
  },
  render({ f }) {
    const N = valueOf(f);
    const T = pairsTotal(f);
    const answer = [...f.flatMap(([, e]) => [e, 2 * e + 1]), T];
    return {
      kind: 'table',
      prompt: [
        say(`Count the ordered pairs $(a, b)$ with lowest common multiple ${N}. For each prime, fill in its power $e$ in ${N} and its number of pairs of powers. Then the total.`),
      ],
      columns: ['\\text{prime}', '\\text{power } e', '\\text{pairs}'],
      rows: [...f.map(([p]): (string | null)[] => [`${p}`, null, null]), ['\\text{total}', '', null]],
      bank: numberBank(answer, [tau(f), f[0][1] + 1, 2 * f[0][1], T - 1], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution({ f }) {
    const N = valueOf(f);
    return [
      { tex: `${N} = ${factorsTex(f)}` },
      { text: 'A prime with power $e$ in the LCM: one of $a$ and $b$ takes all $e$, the other $0$ to $e$, and the pair with both at $e$ is counted once, so $2e + 1$ pairs of powers:' },
      ...f.map(([p, e]): SolutionStep => ({ tex: `${p}: \\; 2 \\times ${e} + 1 = ${2 * e + 1}` })),
      { tex: `${f.map(([, e]) => 2 * e + 1).join(' \\times ')} = ${pairsTotal(f)}` },
    ];
  },
};

/* ---------- a gcd and a sum leave a coprime split ---------- */

interface GcdSumParams {
  g: number;
  m: number;
}

/** x from 1 to below m/2 sharing no factor with m. */
const coprimeHalves = (m: number) => Array.from({ length: Math.ceil(m / 2) - 1 }, (_, i) => i + 1).filter((x) => gcd(x, m) === 1);

const cmFcGcdSum: Generator<GcdSumParams> = {
  id: 'cm-fc-gcd-sum',
  sample(rng, difficulty) {
    for (;;) {
      const m = difficulty >= 2 ? rng.int(12, 60) : rng.int(6, 24);
      const g = difficulty >= 2 ? rng.int(2, 20) : rng.int(2, 15);
      if (isPrime(m) || g * m > (difficulty >= 2 ? 1000 : 300)) continue;
      const count = coprimeHalves(m).length;
      if (count < (difficulty >= 2 ? 3 : 2)) continue;
      return { g, m };
    }
  },
  render({ g, m }) {
    return typed(
      [say(`How many pairs of positive whole numbers $a < b$ have $a + b = ${g * m}$ and $\\gcd(a, b) = ${g}$?`)],
      coprimeHalves(m).length,
      '\\text{pairs} =',
    );
  },
  choices({ m }) {
    const answer = coprimeHalves(m).length;
    return numberOptions(answer, [Math.ceil(m / 2) - 1, 2 * answer, answer + 1], 1, 1);
  },
  solution({ g, m }) {
    const xs = coprimeHalves(m);
    return [
      { text: `Both are multiples of ${g}: write $a = ${g}x$ and $b = ${g}y$, where $x$ and $y$ share no factor, or the gcd would be larger than ${g}.` },
      { tex: `x + y = ${g * m} \\div ${g} = ${m}` },
      { text: `A factor of $x$ and ${m} also divides $y = ${m} - x$, so $x$ must share no factor with ${m}. With $x < y$:` },
      { tex: `x = ${xs.join(', ')}` },
      { text: `That is ${xs.length} pairs. Counting every split with $x < y$, ${Math.ceil(m / 2) - 1}, forgets the gcd.` },
    ];
  },
};

/* ---------- equal remainders: a shifted multiple of the LCM ---------- */

interface RemainderParams {
  divs: number[];
  /** The remainder left by every divisor; 0 means each leaves one less than itself. */
  r: number;
  p: number;
}

function remainderAnswer({ divs, r, p }: RemainderParams): { L: number; k: number; N: number } {
  const L = divs.reduce((t, d) => lcm(t, d), 1);
  for (let k = 1; ; k += 1) {
    const N = r > 0 ? L * k + r : L * k - 1;
    if (N % p === 0) return { L, k, N };
  }
}

const cmFcRemainderLcm: Generator<RemainderParams> = {
  id: 'cm-fc-remainder-lcm',
  sample(rng, difficulty) {
    for (;;) {
      const divs = rng.sample([2, 3, 4, 5, 6, 8, 9, 10, 12], 3).sort((a, b) => a - b);
      const L = divs.reduce((t, d) => lcm(t, d), 1);
      if (L < 20 || L > 360) continue;
      // No divisor may divide another, or it adds nothing to the LCM.
      if (divs.some((x) => divs.some((y) => y !== x && y % x === 0))) continue;
      const p = rng.pick([7, 11, 13]);
      const r = difficulty >= 2 ? 0 : rng.int(1, divs[0] - 1);
      // A remainder that is itself a multiple of p would be the answer.
      if (r > 0 && r % p === 0) continue;
      const { k } = remainderAnswer({ divs, r, p });
      // k = 1 would make the trap, the LCM shifted, the answer.
      if (k < 2) continue;
      return { divs, r, p };
    }
  },
  render(params) {
    const { divs, r, p } = params;
    const { N } = remainderAnswer(params);
    const text =
      r > 0
        ? `A whole number leaves remainder ${r} when divided by ${listText(divs)}, and is a multiple of ${p}. What is the smallest such number?`
        : `A whole number leaves remainder ${divs[0] - 1} when divided by ${divs[0]}, ${divs[1] - 1} when divided by ${divs[1]} and ${divs[2] - 1} when divided by ${divs[2]}. It is also a multiple of ${p}. What is the smallest such number?`;
    return typed([say(text)], N, 'N =');
  },
  choices(params) {
    const { divs, r } = params;
    const { L, N } = remainderAnswer(params);
    const prod = product(divs);
    const slips = r > 0 ? [L + r, prod + r, N + L] : [L - 1, prod - 1, N + L];
    return numberOptions(N, slips, 1, 1);
  },
  solution(params) {
    const { divs, r, p } = params;
    const { L, k, N } = remainderAnswer(params);
    const values = Array.from({ length: k }, (_, i) => (r > 0 ? L * (i + 1) + r : L * (i + 1) - 1));
    const shift = r > 0 ? `${L}k + ${r}` : `${L}k - 1`;
    return [
      {
        text:
          r > 0
            ? `Take ${r} away and the number divides exactly by ${listText(divs)}, so it is ${r} more than a multiple of their LCM:`
            : 'Each remainder is one less than its divisor, so $N + 1$ divides exactly by all three: $N$ is one less than a multiple of their LCM.',
      },
      { tex: `\\text{LCM}(${divs.join(', ')}) = ${L}` },
      { tex: `N = ${shift}` },
      { text: `Try $k = 1, 2, 3, \\ldots$ until $N$ is a multiple of ${p}:` },
      { tex: values.length <= 6 ? values.join(', ') : `${values.slice(0, 3).join(', ')}, \\ldots, ${N}` },
      { tex: `${N} = ${p} \\times ${N / p}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Counting Factors
 * ================================================================ */

/* ---------- an odd number of divisors, or exactly three ---------- */

interface FewDivisorsParams {
  M: number;
  kind: 'odd' | 'three';
}

const primesUpTo = (n: number) => Array.from({ length: Math.max(0, n - 1) }, (_, i) => i + 2).filter(isPrime);

function fewAnswer({ M, kind }: FewDivisorsParams): number {
  const s = Math.floor(Math.sqrt(M));
  return kind === 'odd' ? s : primesUpTo(s).length;
}

const cmFcFewDivisors: Generator<FewDivisorsParams> = {
  id: 'cm-fc-few-divisors',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { M: rng.int(100, 1500), kind: 'three' };
    return { M: rng.int(40, 999), kind: 'odd' };
  },
  render(p) {
    const what = p.kind === 'odd' ? 'an odd number of' : 'exactly 3';
    return typed([say(`How many of the whole numbers from 1 to ${p.M} have ${what} positive divisors?`)], fewAnswer(p), '\\text{count} =');
  },
  choices(p) {
    const answer = fewAnswer(p);
    const s = Math.floor(Math.sqrt(p.M));
    if (p.kind === 'odd') return numberOptions(answer, [Math.ceil(p.M / 2), s - 1, s + 1], 1, 1);
    return numberOptions(answer, [s, answer + 1, answer - 1], 1, 1);
  },
  solution(p) {
    const s = Math.floor(Math.sqrt(p.M));
    const squareLine = `${s}^2 = ${s * s} \\le ${p.M} < ${(s + 1) ** 2} = ${s + 1}^2`;
    if (p.kind === 'odd') {
      return [
        { text: 'Divisors pair up, $d$ with $n \\div d$. The count is odd only when a divisor pairs with itself, $d \\times d = n$, so $n$ is a perfect square.' },
        { tex: squareLine },
        { text: `So the squares $1^2$ to $${s}^2$: ${s} numbers.` },
      ];
    }
    const primes = primesUpTo(s);
    const lines: SolutionStep[] =
      primes.length <= 7
        ? [{ tex: primes.join(', ') }]
        : [{ tex: primes.slice(0, 6).join(', ') }, { tex: primes.slice(6).join(', ') }];
    return [
      {
        text: `An odd count of divisors means a square. The square of a prime $p$ has just $1$, $p$ and $p^2$. If the square root is not prime, it has a divisor other than 1 and itself, a fourth divisor. So count the primes $p$ with $p^2 \\le ${p.M}$:`,
      },
      { tex: squareLine },
      { text: `The primes up to ${s}:` },
      ...lines,
      { text: `That is ${primes.length} numbers. Counting every square, ${s}, lets in 1 and squares such as 16 and 36 with more divisors.` },
    ];
  },
};

/* ---------- the product of all the divisors ---------- */

interface DivisorProductParams {
  f: Factors;
  /** Difficulty 2: ask the power of 2 in the product rather than k in N^k. */
  exponent: boolean;
}

const cmFcDivisorProduct: Generator<DivisorProductParams> = {
  id: 'cm-fc-divisor-product',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const rest = randomFactors(rng, [3, 5, 7], rng.int(1, 2), 3);
        const f: Factors = [[2, rng.int(2, 6)], ...rest];
        if (f.every(([, e]) => e % 2 === 0) || tau(f) > 60) continue;
        return { f, exponent: true };
      }
      const N = rng.int(12, 300);
      const f = factorise(N);
      if (f.every(([, e]) => e % 2 === 0) || tau(f) < 6 || tau(f) > 24) continue;
      return { f, exponent: false };
    }
  },
  render({ f, exponent }) {
    const t = tau(f);
    if (exponent) {
      const letters = ['x', 'y', 'z'];
      const form = f.map(([p], i) => `${p}^{${letters[i]}}`).join(' \\times ');
      return typed(
        [say(`The product of all the positive divisors of $N$ is $${form}$. What is $x$?`), show(`N = ${factorsTex(f)}`)],
        (f[0][1] * t) / 2,
        'x =',
      );
    }
    return typed(
      [say(`The product of all the positive divisors of ${valueOf(f)} is $${valueOf(f)}^{k}$. What is $k$?`)],
      t / 2,
      'k =',
    );
  },
  choices({ f, exponent }) {
    const t = tau(f);
    if (exponent) {
      const a = f[0][1];
      return numberOptions((a * t) / 2, [a * t, (a * (a + 1)) / 2, t / 2], 1, 1);
    }
    return numberOptions(t / 2, [t, t - 1, t / 2 - 1], 1, 1);
  },
  solution({ f, exponent }) {
    const t = tau(f);
    const N = valueOf(f);
    const steps: SolutionStep[] = [];
    const name = exponent ? 'N' : `${N}`;
    if (!exponent) steps.push({ tex: `${N} = ${factorsTex(f)}` });
    steps.push(
      { tex: `\\text{divisors} = ${choicesTex(f)} = ${t}` },
      {
        text: `Pair each divisor $d$ with $${name} \\div d$: each pair multiplies to $${name}$, and $${name}$ is not a square, so no divisor pairs with itself. ${t} divisors make ${t / 2} pairs:`,
      },
      { tex: `\\text{product} = ${name}^{${t / 2}}` },
    );
    if (exponent) {
      steps.push(
        { tex: `= ${factorsTex(scale(f, t / 2))}` },
        { tex: `x = ${f[0][1]} \\times ${t / 2} = ${(f[0][1] * t) / 2}` },
      );
    } else {
      steps.push({ text: `Counting every divisor, ${t}, multiplies each pair in twice.` });
    }
    return steps;
  },
};

/* ---------- divisors of N² below N ---------- */

interface SquarePairsParams {
  f: Factors;
  /** Difficulty 2: those below N that do not divide N. */
  notDividing: boolean;
}

const cmFcSquarePairs: Generator<SquarePairsParams> = {
  id: 'cm-fc-square-pairs',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const f = randomFactors(rng, [2, 3, 5, 7], rng.int(2, 3), 5);
        if (tau(scale(f, 2)) > 200 || tau(f) < 6) continue;
        return { f, notDividing: true };
      }
      const f = randomFactors(rng, [2, 3, 5, 7], rng.int(2, 3), 3);
      const N = valueOf(f);
      if (N < 12 || N > 400) continue;
      return { f, notDividing: false };
    }
  },
  render({ f, notDividing }) {
    const T2 = tau(scale(f, 2));
    const below = (T2 - 1) / 2;
    if (notDividing) {
      return typed(
        [say('How many positive divisors of $N^2$ are less than $N$ but do not divide $N$?'), show(`N = ${factorsTex(f)}`)],
        below - (tau(f) - 1),
        '\\text{count} =',
      );
    }
    const N = valueOf(f);
    return typed([say(`How many positive divisors of $${N}^2$ are less than ${N}?`)], below, '\\text{count} =');
  },
  choices({ f, notDividing }) {
    const T2 = tau(scale(f, 2));
    const below = (T2 - 1) / 2;
    const t = tau(f);
    if (notDividing) {
      const answer = below - (t - 1);
      return numberOptions(answer, [below, T2 - t, answer + 1], 1, 1);
    }
    return numberOptions(below, [t - 1, T2 - 1, (T2 + 1) / 2], 1, 1);
  },
  solution({ f, notDividing }) {
    const f2 = scale(f, 2);
    const T2 = tau(f2);
    const below = (T2 - 1) / 2;
    const N = valueOf(f);
    const name = notDividing ? 'N' : `${N}`;
    const steps: SolutionStep[] = [
      { tex: `${notDividing ? 'N' : N}^2 = ${factorsTex(f2)}` },
      { tex: `\\text{divisors} = ${choicesTex(f2)} = ${T2}` },
      {
        text: `Pair $d$ with $${name}^2 \\div d$: one of each pair is below $${name}$ and one above, except $${name}$ itself, which pairs with itself.`,
      },
      { tex: `\\frac{${T2} - 1}{2} = ${below}` },
    ];
    if (notDividing) {
      const t = tau(f);
      steps.push(
        { text: `Every divisor of $N$ other than $N$ is among these. $N$ has $${choicesTex(f)} = ${t}$ divisors, so take off ${t - 1}:` },
        { tex: `${below} - ${t - 1} = ${below - (t - 1)}` },
      );
    }
    return steps;
  },
};

/* ---------- divisors of N that are multiples of m ---------- */

interface MultipleDivisorsParams {
  /** N as base^power; power 1 when N is shown as a plain number. */
  base: number;
  power: number;
  m: number;
}

const mdN = (p: MultipleDivisorsParams): Factors => scale(factorise(p.base), p.power);
const mdQuotient = (p: MultipleDivisorsParams): Factors => {
  const m = factorise(p.m);
  return mdN(p).map(([q, e]): [number, number] => [q, e - powerOf(m, q)]);
};
const mdNTex = (p: MultipleDivisorsParams) => (p.power === 1 ? `${p.base}` : `${p.base}^{${p.power}}`);

function sampleMultipleDivisors(rng: Rng, difficulty: number): MultipleDivisorsParams {
  for (;;) {
    let base: number;
    let power: number;
    if (difficulty >= 2) {
      base = rng.pick([6, 10, 12, 15, 18, 20, 24, 30]);
      power = rng.int(3, 6);
    } else {
      base = 2 ** rng.int(1, 5) * 3 ** rng.int(1, 3) * 5 ** rng.int(0, 2);
      power = 1;
      if (base < 200 || base > 10000) continue;
    }
    const N = valueOf(mdN({ base, power, m: 1 }));
    const candidates = Array.from({ length: 495 }, (_, i) => i + 6).filter(
      (d) => N % d === 0 && d !== N && factorise(d).length >= 2,
    );
    if (candidates.length === 0) continue;
    const m = rng.pick(candidates);
    const params = { base, power, m };
    const q = mdQuotient(params);
    if (tau(q) < 4 || tau(q) > 80) continue;
    return params;
  }
}

const cmFcMultipleDivisors: Generator<MultipleDivisorsParams> = {
  id: 'cm-fc-multiple-divisors',
  sample: sampleMultipleDivisors,
  render(p) {
    const N = mdNTex(p);
    return typed(
      [say(`How many positive divisors of $${N}$ are multiples of ${p.m}?`)],
      tau(mdQuotient(p)),
      '\\text{count} =',
    );
  },
  choices(p) {
    const tN = tau(mdN(p));
    const tm = tau(factorise(p.m));
    const answer = tau(mdQuotient(p));
    const ratio = tN % tm === 0 ? tN / tm : tN - tm;
    return numberOptions(answer, [ratio, tN - tm, tN, answer + 1], 1, 1);
  },
  solution(p) {
    const f = mdN(p);
    const q = mdQuotient(p);
    const steps: SolutionStep[] = [];
    if (p.power > 1) steps.push({ tex: `${mdNTex(p)} = (${factorTex(p.base)})^{${p.power}} = ${factorsTex(f)}` });
    else steps.push({ tex: `${p.base} = ${factorsTex(f)}` });
    steps.push(
      { tex: `${p.m} = ${factorTex(p.m)}` },
      {
        text: `A divisor that is a multiple of ${p.m} is ${p.m} times a divisor of $${mdNTex(p)} \\div ${p.m}$, and every such product divides $${mdNTex(p)}$:`,
      },
      { tex: `${mdNTex(p)} \\div ${p.m} = ${factorsTex(q.filter(([, e]) => e > 0))}` },
      { tex: `${choicesTex(q.filter(([, e]) => e > 0))} = ${tau(q)}` },
    );
    return steps;
  },
};

const cmFcMultipleDivisorsTable: Generator<MultipleDivisorsParams> = {
  id: 'cm-fc-multiple-divisors-table',
  sample: sampleMultipleDivisors,
  render(p) {
    const f = mdN(p);
    const m = factorise(p.m);
    const q = mdQuotient(p);
    const answer = [...f.flatMap(([prime, e]) => [powerOf(m, prime), e - powerOf(m, prime) + 1]), tau(q)];
    return {
      kind: 'table',
      prompt: [
        say('Count the divisors of $N$ that are multiples of $m$. For each prime, fill in the least power such a divisor can have, and its number of choices of power. Then the total.'),
        show(`N = ${factorsTex(f)}, \\qquad m = ${factorTex(p.m)}`),
      ],
      columns: ['\\text{prime}', '\\text{least power}', '\\text{choices}'],
      rows: [...f.map(([prime]): (string | null)[] => [`${prime}`, null, null]), ['\\text{total}', '', null]],
      bank: numberBank(answer, [f[0][1] + 1, tau(f), f[0][1] - powerOf(m, f[0][0]), tau(q) + 1], 3, 1, 0),
      answer: answer.map(num),
    };
  },
  solution(p) {
    const f = mdN(p);
    const m = factorise(p.m);
    const q = mdQuotient(p);
    return [
      { text: 'A multiple of $m$ takes each prime at least as often as $m$ does, and at most as often as $N$ does:' },
      ...f.map(([prime, e]): SolutionStep => {
        const low = powerOf(m, prime);
        const n = e - low + 1;
        return { tex: `${prime}: \\; ${low} \\text{ to } ${e}, \\; ${n} \\text{ choice${n === 1 ? '' : 's'}}` };
      }),
      { tex: `${q.map(([, e]) => e + 1).join(' \\times ')} = ${tau(q)}` },
    ];
  },
};

export const contestFactorsGenerators = [
  cmFcPerfectPower,
  cmFcDigitProduct,
  cmFcExponentMatch,
  cmFcExponentMatchTiles,
  cmFcRootTable,
  cmFcEuclid,
  cmFcLcmPairs,
  cmFcLcmPairsTable,
  cmFcGcdSum,
  cmFcRemainderLcm,
  cmFcFewDivisors,
  cmFcDivisorProduct,
  cmFcSquarePairs,
  cmFcMultipleDivisors,
  cmFcMultipleDivisorsTable,
];
