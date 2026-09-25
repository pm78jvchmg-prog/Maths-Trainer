/**
 * Reduction formulae (Further Integration, level 9).
 *
 * Four families, each a relation between I_n and an I with a smaller index:
 *
 * - `I_n = ∫ x^n e^{kx} dx = (1/k) x^n e^{kx} - (n/k) I_{n-1}`, by parts.
 * - `I_n = ∫_0^∞ x^n e^{-kx} dx = (n/k) I_{n-1}`, the same by parts with the
 *   boundary term gone; also with e^{-x/k}, where it is `nk I_{n-1}`.
 * - `I_n = ∫_0^{π/2} sin^n x dx = ((n - 1)/n) I_{n-2}`, and the same for cos.
 * - `I_n = ∫ x^m (ln x)^n dx = x^{m+1}(ln x)^n/(m + 1) - (n/(m + 1)) I_{n-1}`.
 *
 * Typed antiderivatives declare their integrand, so the sweep differentiates
 * the answer back; the sine values declare limits, so it checks them by
 * quadrature. The improper values cannot be given to quadrature, so
 * `integralKit.test.ts` integrates them itself.
 */
import type { Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { EXP_KEYS, ALGEBRA_KEYS } from './calculus';
import {
  FRACTION_KEYS,
  PI_KEYS,
  choiceList,
  coefTex,
  drawUntil,
  expTex,
  fadd,
  fmul,
  frac,
  fracAns,
  fracTex,
  fval,
  joinTerm,
  leadTerm,
  mix,
  piAns,
  piTex,
  placed,
  powTex,
  prose,
  tokenBank,
  turned,
  type Frac,
} from './integralKit';

const EXP_C_KEYS: KeypadKey[] = [...EXP_KEYS, { insert: 'C' }];
const LN_C_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'ln(' }, { insert: 'C' }];

/** A signed coefficient as one tile: `- \frac{5}{3}`, `+ 2`. */
function signedTok(f: Frac): string {
  return `${f.n < 0 ? '-' : '+'} ${fracTex(frac(Math.abs(f.n), f.d))}`;
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/* ---------- x^n e^{kx} ---------- */

export interface ExpParams {
  n: number;
  k: number;
}

/** I_N written in terms of I_{idx}, with the two coefficients given. */
function expRelation(N: number, k: number, first: Frac, second: Frac, idx = N - 1): string {
  return `I_{${N}} = ${leadTerm(first, `${powTex(N)}${expTex(k)}`)}${joinTerm(second, `I_{${idx}}`)}`;
}

function expSolution({ n, k }: ExpParams): SolutionStep[] {
  return [
    {
      text: `By parts with $u = ${powTex(n)}$ and $\\frac{dv}{dx} = ${expTex(k)}$, so $\\frac{du}{dx} = ${leadTerm(frac(n), powTex(n - 1))}$ and $v = ${leadTerm(frac(1, k), expTex(k))}$.`,
    },
    { tex: `I_{${n}} = ${leadTerm(frac(1, k), `${powTex(n)}${expTex(k)}`)} - \\int ${leadTerm(frac(n, k), `${powTex(n - 1)}${expTex(k)}`)} \\, dx` },
    { text: `The integral left is $I_{${n - 1}}$ with $${fracTex(frac(n, k))}$ in front.` },
    { tex: expRelation(n, k, frac(1, k), frac(-n, k)) },
  ];
}

const expRelationChoice: Generator<ExpParams> = {
  id: 'int-red-exp-relation',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { n: rng.int(3, 9), k: rng.pick([1, 2, 3, 4, 5, -1, -2, -3, -4, -5]) }
      : { n: rng.int(2, 7), k: rng.int(1, 5) },
  render: ({ n, k }): Slide => ({
    kind: 'choice',
    prompt: [
      prose(`Here $I_{m} = \\int x^{m}${expTex(k)} \\, dx$. Which line is true?`),
    ],
    ...placed(
      [
        expRelation(n, k, frac(1, k), frac(-n, k)),
        // Sign flipped, the k left undivided, e^{kx} differentiated rather than
        // integrated, n - 1 brought down, and the index stepped up.
        expRelation(n, k, frac(1, k), frac(n, k)),
        expRelation(n, k, frac(1, k), frac(-n)),
        expRelation(n, k, frac(k), frac(-n * k)),
        expRelation(n, k, frac(1, k), frac(-(n - 1), k)),
        expRelation(n, k, frac(1, k), frac(-n, k), n + 1),
      ],
      mix(n, k),
    ),
  }),
  solution: expSolution,
};

const expTiles: Generator<ExpParams> = {
  id: 'int-red-exp-tiles',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { n: rng.int(3, 9), k: rng.pick([2, 3, 4, 5, -2, -3, -4, -5]) }
      : { n: rng.int(2, 9), k: rng.int(2, 5) },
  render: ({ n, k }): Slide => {
    const answer = [fracTex(frac(1, k)), signedTok(frac(-n, k))];
    return {
      kind: 'tiles',
      prompt: [prose(`Here $I_{m} = \\int x^{m}${expTex(k)} \\, dx$. Complete the reduction formula.`)],
      template: `I_${n} = {0} x^${n} ${expTex(k)} {1} I_${n - 1}`,
      bank: tokenBank(
        answer,
        [
          fracTex(frac(k)),
          fracTex(frac(n, k)),
          signedTok(frac(n, k)),
          signedTok(frac(-n)),
          signedTok(frac(-(n - 1), k)),
        ],
        4,
      ),
      answer,
    };
  },
  solution: expSolution,
};

/** The coefficients of the polynomial P with ∫ c x^n e^{kx} dx = e^{kx} P(x), highest power first. */
export function expAntiCoefficients(c: number, n: number, k: number, slip?: 'sign' | 'k' | 'fact'): Frac[] {
  return Array.from({ length: n + 1 }, (_, j) => {
    const sign = slip === 'sign' ? 1 : (-1) ** j;
    const falling = slip === 'fact' ? 1 : factorial(n) / factorial(n - j);
    const den = slip === 'k' ? k : k ** (j + 1);
    return frac(c * sign * falling, den);
  });
}

function polyInTex(coefficients: Frac[], body: (power: number) => string): string {
  const top = coefficients.length - 1;
  let out = '';
  coefficients.forEach((coefficient, j) => {
    if (coefficient.n === 0) return;
    out += out === '' ? leadTerm(coefficient, body(top - j)) : joinTerm(coefficient, body(top - j));
  });
  return out;
}

function polyInAns(coefficients: Frac[], body: (power: number) => string): string {
  const top = coefficients.length - 1;
  return coefficients.map((coefficient, j) => `${fracAns(coefficient)}*${body(top - j)}`).join(' + ');
}

export interface ExpFullParams extends ExpParams {
  c: number;
}

const expAnswerOf = (p: ExpFullParams, slip?: 'sign' | 'k' | 'fact') =>
  `e^((${p.k})*x)*(${polyInAns(expAntiCoefficients(p.c, p.n, p.k, slip), (q) => `x^(${q})`)})`;

const expTexOf = (p: ExpFullParams, slip?: 'sign' | 'k' | 'fact') =>
  `${expTex(p.k)}\\left(${polyInTex(expAntiCoefficients(p.c, p.n, p.k, slip), (q) => powTex(q))}\\right) + C`;

const expFull: Generator<ExpFullParams> = {
  id: 'int-red-exp-full',
  sample: (rng, difficulty) => {
    const k = rng.pick([1, 2, 3, 4, -1, -2, -3, -4, 5, -5]);
    return difficulty > 1
      ? { n: rng.int(2, 3), k: Math.abs(k) === 5 ? 2 : k, c: rng.int(1, 2) }
      : { n: rng.int(1, 2), k, c: rng.int(1, 3) };
  },
  choices: (p) =>
    choiceList(
      { tex: expTexOf(p), answer: expAnswerOf(p) },
      { tex: expTexOf(p, 'sign'), answer: expAnswerOf(p, 'sign') },
      { tex: expTexOf(p, 'k'), answer: expAnswerOf(p, 'k') },
      { tex: expTexOf(p, 'fact'), answer: expAnswerOf(p, 'fact') },
      {
        tex: `${leadTerm(frac(p.c, p.k), `${powTex(p.n)}${expTex(p.k)}`)} + C`,
        answer: `(${p.c}/${p.k})*x^(${p.n})*e^((${p.k})*x)`,
      },
    ),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose('Use the reduction formula to integrate.')],
    lead: `\\int ${p.c === 1 ? '' : p.c}${powTex(p.n)}${expTex(p.k)} \\, dx =`,
    keypad: EXP_C_KEYS,
    answer: expAnswerOf(p),
    integrand: `(${p.c})*x^(${p.n})*e^((${p.k})*x)`,
    domain: 'real',
    mode: 'upToConstant',
  }),
  solution: ({ n, k, c }) => {
    const steps: SolutionStep[] = [
      { text: `With $I_{m} = \\int x^{m}${expTex(k)} \\, dx$ the formula is $I_{m} = ${leadTerm(frac(1, k), `x^{m}${expTex(k)}`)}${joinTerm(frac(-1, k), 'mI_{m-1}')}$, and $I_{0} = ${leadTerm(frac(1, k), expTex(k))}$.` },
    ];
    for (let m = 1; m <= n; m += 1) {
      steps.push({ tex: `I_{${m}} = ${expTex(k)}\\left(${polyInTex(expAntiCoefficients(1, m, k), (q) => powTex(q))}\\right)` });
    }
    if (c !== 1) steps.push({ text: `Multiply by $${c}$.` });
    steps.push({ tex: expTexOf({ n, k, c }) });
    return steps;
  },
};

/* ---------- ∫_0^∞ x^n e^{-kx} dx ---------- */

export interface GammaParams {
  /** `times`: e^{-kx}. `over`: e^{-x/k}. */
  form: 'times' | 'over';
  k: number;
  n: number;
}

const gammaExp = ({ form, k }: Pick<GammaParams, 'form' | 'k'>): string =>
  form === 'times' ? expTex(-k) : `e^{-x/${k}}`;

/** The multiplier from I_{n-1} to I_n. */
export const gammaStep = ({ form, k }: Pick<GammaParams, 'form' | 'k'>, n: number): Frac =>
  form === 'times' ? frac(n, k) : frac(n * k);

/** I_n, from I_0 = 1/k (or k) and the step. */
export function gammaValue(p: GammaParams, n = p.n): Frac {
  let value = p.form === 'times' ? frac(1, p.k) : frac(p.k);
  for (let m = 1; m <= n; m += 1) value = fmul(value, gammaStep(p, m));
  return value;
}

/** The integrand for mathjs, so a test can integrate it independently. */
export const gammaIntegrand = ({ form, k, n }: GammaParams): string =>
  `x^(${n})*e^(-x${form === 'times' ? `*${k}` : `/${k}`})`;

/** The multiplier in general: `\frac{m}{2}`, `m`, `3m`. */
const gammaRule = ({ form, k }: Pick<GammaParams, 'form' | 'k'>): string =>
  form === 'over' ? `${k}m` : k === 1 ? 'm' : `\\frac{m}{${k}}`;

const gammaIntegral = (p: GammaParams, index: string | number = p.n): string =>
  `\\int_{0}^{\\infty} x^{${index}}${gammaExp(p)} \\, dx`;

function sampleGamma(rng: { int(a: number, b: number): number; pick<T>(xs: T[]): T }, lo: number, hi: number, cap: number): GammaParams {
  return drawUntil(
    () => {
      const form = rng.pick<'times' | 'over'>(['times', 'over']);
      return { form, k: form === 'times' ? rng.int(1, 6) : rng.int(2, 6), n: rng.int(lo, hi) };
    },
    (p) => Math.max(Math.abs(gammaValue(p).n), gammaValue(p).d) <= cap,
    { form: 'times', k: 2, n: lo },
  );
}

function gammaSolution(p: GammaParams): SolutionStep[] {
  const steps: SolutionStep[] = [
    { text: `By parts the boundary term is $0$ at both ends, which leaves $I_{m} = ${gammaRule(p)}I_{m-1}$.` },
    { text: `Start from $I_{0} = \\int_{0}^{\\infty} ${gammaExp(p)} \\, dx = ${fracTex(gammaValue(p, 0))}$.` },
  ];
  for (let m = 1; m <= p.n; m += 1) {
    steps.push({ tex: `I_{${m}} = ${fracTex(gammaStep(p, m))} \\times ${fracTex(gammaValue(p, m - 1))} = ${fracTex(gammaValue(p, m))}` });
  }
  return steps;
}

const gammaRelation: Generator<GammaParams> = {
  id: 'int-red-gamma-relation',
  sample: (rng, difficulty) => sampleGamma(rng, difficulty > 1 ? 4 : 2, difficulty > 1 ? 9 : 7, 1e12),
  render: (p): Slide => {
    const { n, k, form } = p;
    const rel = (f: Frac) => `I_{${n}} = ${coefTex(f) || ''}I_{${n - 1}}`;
    const right = gammaStep(p, n);
    return {
      kind: 'choice',
      prompt: [prose(`Here $I_{m} = \\int_{0}^{\\infty} x^{m}${gammaExp(p)} \\, dx$. Which relation holds?`)],
      ...placed(
        [
          rel(right),
          // The k on the wrong side, the n dropped, and n - 1 brought down.
          rel(form === 'times' ? frac(n * k) : frac(n, k)),
          rel(form === 'times' ? frac(1, k) : frac(k)),
          rel(form === 'times' ? frac(n - 1, k) : frac((n - 1) * k)),
          rel(frac(n)),
          rel(frac(n + 1, form === 'times' ? k : 1)),
        ],
        mix(n, k, form.length),
      ),
    };
  },
  solution: (p) => [
    { text: `By parts with $u = x^{${p.n}}$ and $\\frac{dv}{dx} = ${gammaExp(p)}$, so $v = ${leadTerm(p.form === 'times' ? frac(-1, p.k) : frac(-p.k), gammaExp(p))}$.` },
    { text: 'At both ends the term outside the integral is $0$: at $0$ because of the $x$, at infinity because the exponential wins.' },
    { tex: `I_{${p.n}} = ${coefTex(gammaStep(p, p.n))}I_{${p.n - 1}}` },
  ],
};

const gammaTree: Generator<GammaParams> = {
  id: 'int-red-gamma-tree',
  sample: (rng, difficulty) => sampleGamma(rng, difficulty > 1 ? 3 : 2, difficulty > 1 ? 5 : 4, 60000),
  render: (p): Slide => {
    const values = Array.from({ length: p.n + 1 }, (_, m) => gammaValue(p, m));
    const answer = values.map(fracTex);
    // The next value on, the step taken as n + 1, and I_0 read the other way up.
    const extras = [
      fracTex(fmul(values[p.n], gammaStep(p, p.n + 1))),
      fracTex(fmul(values[p.n - 1], gammaStep(p, p.n + 1))),
      fracTex(frac(values[0].d, values[0].n)),
      fracTex(fadd(values[p.n], frac(1))),
    ];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Here $I_{m} = \\int_{0}^{\\infty} x^{m}${gammaExp(p)} \\, dx$, so $I_{m} = ${gammaRule(p)}I_{m-1}$. Start from $I_{0}$ and work up.`,
        ),
      ],
      expression: `I_{${p.n}}`,
      nodes: values.map((_, m) => ({ id: `i${m}`, from: m === 0 ? [] : [`i${m - 1}`] })),
      bank: tokenBank(answer, extras),
      answer,
    };
  },
  solution: gammaSolution,
};

const gammaTyped: Generator<GammaParams> = {
  id: 'int-red-gamma-value',
  sample: (rng, difficulty) => sampleGamma(rng, difficulty > 1 ? 3 : 2, difficulty > 1 ? 6 : 4, difficulty > 1 ? 1e6 : 5000),
  render: (p): Slide => {
    const v = gammaValue(p);
    return {
      kind: 'expression',
      prompt: [prose('Find this integral exactly, using a reduction formula.')],
      lead: `${gammaIntegral(p)} =`,
      keypad: v.d === 1 ? [] : FRACTION_KEYS,
      answer: `${fval(v)}`,
      alsoAccepts: [fracAns(v)],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: gammaSolution,
};

/* ---------- powers of sine and cosine ---------- */

export interface WallisParams {
  fn: 'sin' | 'cos';
  n: number;
}

/** ∫_0^{π/2} sin^n x dx: a fraction, and whether it carries π. */
export function wallis(n: number): { f: Frac; pi: boolean } {
  let f = n % 2 === 0 ? frac(1, 2) : frac(1);
  for (let j = n % 2 === 0 ? 2 : 3; j <= n; j += 2) f = fmul(f, frac(j - 1, j));
  return { f, pi: n % 2 === 0 };
}

const wallisTex = ({ f, pi }: { f: Frac; pi: boolean }): string => (pi ? piTex(f) : fracTex(f));
const wallisNumber = ({ f, pi }: { f: Frac; pi: boolean }): number => fval(f) * (pi ? Math.PI : 1);

const trigPow = (fn: string, n: number | string): string => (n === 1 ? `\\${fn} x` : `\\${fn}^{${n}} x`);
const halfPi = '\\frac{\\pi}{2}';
const wallisIntegral = (fn: string, n: number | string, c = 1): string =>
  `\\int_{0}^{${halfPi}} ${c === 1 ? '' : c}${trigPow(fn, n)} \\, dx`;

export interface WallisTilesParams extends WallisParams {
  steps: number;
  back: boolean;
}

/** The ratio I_n / I_{n - 2s}. */
function wallisRatio(n: number, steps: number): Frac {
  let f = frac(1);
  for (let j = 0; j < steps; j += 1) f = fmul(f, frac(n - 2 * j - 1, n - 2 * j));
  return f;
}

const wallisTiles: Generator<WallisTilesParams> = {
  id: 'int-red-wallis-tiles',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const steps = difficulty > 1 ? rng.int(2, 3) : 1;
        return { fn: rng.pick<'sin' | 'cos'>(['sin', 'cos']), n: rng.int(2, 9), steps, back: rng.chance(0.5) };
      },
      ({ n, steps }) => n - 2 * steps >= 0,
      { fn: 'sin', n: 6, steps: difficulty > 1 ? 2 : 1, back: false },
    ),
  render: ({ fn, n, steps, back }): Slide => {
    const m = n - 2 * steps;
    const r = wallisRatio(n, steps);
    const right = back ? frac(r.d, r.n) : r;
    const flip = back ? r : frac(r.d, r.n);
    const oneStep = back ? frac(n, n - 1) : frac(n - 1, n);
    const answer = [fracTex(right)];
    return {
      kind: 'tiles',
      prompt: [prose(`Here $I_{m} = ${wallisIntegral(fn, 'm')}$. Complete the line.`)],
      template: back ? `I_${m} = {0} I_${n}` : `I_${n} = {0} I_${m}`,
      bank: tokenBank(answer, [fracTex(flip), fracTex(oneStep), fracTex(frac(n - 2, n)), fracTex(frac(n, n + 1)), fracTex(frac(n - 1, n - 2 || 1))]),
      answer,
    };
  },
  solution: ({ fn, n, steps, back }) => {
    const m = n - 2 * steps;
    const factors = Array.from({ length: steps }, (_, j) => `\\frac{${n - 2 * j - 1}}{${n - 2 * j}}`);
    const r = wallisRatio(n, steps);
    const out: SolutionStep[] = [
      { text: `For $\\${fn}^{m} x$ from $0$ to $${halfPi}$, $I_{m} = \\frac{m - 1}{m}I_{m-2}$. Step down from $I_{${n}}$ to $I_{${m}}$:` },
      { tex: `I_{${n}} = ${factors.join(' \\cdot ')} I_{${m}}${steps > 1 ? ` = ${fracTex(r)}I_{${m}}` : ''}` },
    ];
    if (back) out.push({ text: 'Turn it round:' }, { tex: `I_{${m}} = ${fracTex(frac(r.d, r.n))}I_{${n}}` });
    return out;
  },
};

export interface WallisValueParams extends WallisParams {
  c: number;
}

const wallisValueOf = ({ n, c }: WallisValueParams) => {
  const w = wallis(n);
  return { f: fmul(w.f, frac(c)), pi: w.pi };
};

function wallisChain(fn: string, n: number): SolutionStep[] {
  const start = n % 2;
  const out: SolutionStep[] = [
    { text: `Use $I_{m} = \\frac{m - 1}{m}I_{m-2}$ down to $I_{${start}} = ${wallisTex(wallis(start))}$.` },
  ];
  const factors = [];
  for (let j = n; j > start; j -= 2) factors.push(`\\frac{${j - 1}}{${j}}`);
  out.push({ tex: `${wallisIntegral(fn, n)} = ${factors.join(' \\cdot ')} \\cdot ${start === 0 ? halfPi : '1'}` });
  out.push({ tex: `= ${wallisTex(wallis(n))}` });
  return out;
}

const wallisTyped: Generator<WallisValueParams> = {
  id: 'int-red-wallis-value',
  sample: (rng, difficulty) => ({
    fn: rng.pick<'sin' | 'cos'>(['sin', 'cos']),
    n: difficulty > 1 ? rng.int(5, 10) : rng.int(2, 6),
    c: rng.int(1, 4),
  }),
  render: (p): Slide => {
    const v = wallisValueOf(p);
    return {
      kind: 'expression',
      prompt: [prose('Find this integral exactly.')],
      lead: `${wallisIntegral(p.fn, p.n, p.c)} =`,
      keypad: v.pi ? PI_KEYS : FRACTION_KEYS,
      answer: `${wallisNumber(v)}`,
      alsoAccepts: [v.pi ? piAns(v.f) : fracAns(v.f)],
      integrand: `${p.c}*${p.fn}(x)^${p.n}`,
      limits: [0, Math.PI / 2],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const out = wallisChain(p.fn, p.n);
    if (p.c !== 1) out.push({ text: `Times $${p.c}$:` }, { tex: `${wallisTex(wallisValueOf(p))}` });
    return out;
  },
};

const wallisTree: Generator<WallisValueParams> = {
  id: 'int-red-wallis-tree',
  sample: (rng, difficulty) => ({
    fn: rng.pick<'sin' | 'cos'>(['sin', 'cos']),
    n: difficulty > 1 ? rng.int(5, 8) : rng.int(3, 6),
    c: rng.int(2, 6),
  }),
  render: (p): Slide => {
    const start = p.n % 2;
    const chain: number[] = [];
    for (let m = start; m <= p.n; m += 2) chain.push(m);
    const answer = [...chain.map((m) => wallisTex(wallis(m))), wallisTex(wallisValueOf(p))];
    const last = wallis(p.n);
    // The last step taken upside down, and the value with its π put in or left out.
    const extras = [
      wallisTex({ f: fmul(wallis(p.n - 2).f, frac(p.n, p.n - 1)), pi: last.pi }),
      wallisTex({ f: fmul(last.f, frac(p.c)), pi: !last.pi }),
      wallisTex({ f: fmul(last.f, frac(p.c + 1)), pi: last.pi }),
    ];
    return {
      kind: 'tree',
      prompt: [
        prose(`Here $I_{m} = ${wallisIntegral(p.fn, 'm')}$. Fill in each $I$ from $I_{${start}}$ up to $I_{${p.n}}$, then the integral.`),
      ],
      expression: wallisIntegral(p.fn, p.n, p.c),
      nodes: [
        ...chain.map((m, j) => ({ id: `i${m}`, from: j === 0 ? [] : [`i${chain[j - 1]}`] })),
        { id: 'total', from: [`i${p.n}`] },
      ],
      bank: tokenBank(answer, extras),
      answer,
    };
  },
  solution: (p) => [...wallisChain(p.fn, p.n), { text: `Times $${p.c}$:` }, { tex: wallisTex(wallisValueOf(p)) }],
};

/* ---------- x^m (ln x)^n ---------- */

export interface LogParams {
  m: number;
  n: number;
}

const lnPow = (n: number): string => (n === 0 ? '' : n === 1 ? '\\ln x' : `(\\ln x)^{${n}}`);

function logRelation(m: number, N: number, first: Frac, second: Frac, lnPower = N): string {
  return `I_{${N}} = ${leadTerm(first, `${powTex(m + 1)}${lnPower === 1 ? '\\ln x' : lnPow(lnPower)}`)}${joinTerm(second, `I_{${N - 1}}`)}`;
}

function logSolution({ m, n }: LogParams): SolutionStep[] {
  return [
    {
      text: `By parts with $u = ${lnPow(n)}$ and $\\frac{dv}{dx} = ${powTex(m) || '1'}$, so $\\frac{du}{dx} = ${n === 1 ? '\\frac{1}{x}' : `\\frac{${n}${lnPow(n - 1)}}{x}`}$ and $v = ${leadTerm(frac(1, m + 1), powTex(m + 1))}$.`,
    },
    { text: `The $x^{${m + 1}}$ over $x$ leaves $${powTex(m) || '1'}$, so the integral left is $I_{${n - 1}}$ with $${fracTex(frac(n, m + 1))}$ in front.` },
    { tex: logRelation(m, n, frac(1, m + 1), frac(-n, m + 1)) },
  ];
}

const logRelationChoice: Generator<LogParams> = {
  id: 'int-red-log-relation',
  sample: (rng, difficulty) => ({ m: rng.int(difficulty > 1 ? 1 : 0, difficulty > 1 ? 8 : 6), n: rng.int(2, difficulty > 1 ? 7 : 5) }),
  render: ({ m, n }): Slide => ({
    kind: 'choice',
    prompt: [prose(`Here $I_{k} = \\int ${powTex(m)}(\\ln x)^{k} \\, dx$. Which line is true?`)],
    ...placed(
      [
        logRelation(m, n, frac(1, m + 1), frac(-n, m + 1)),
        // Sign flipped, the n dropped, the m + 1 left undivided, and m for m + 1.
        logRelation(m, n, frac(1, m + 1), frac(n, m + 1)),
        logRelation(m, n, frac(1, m + 1), frac(-1, m + 1)),
        logRelation(m, n, frac(1, m + 1), frac(-n)),
        logRelation(m, n, frac(1, m + 1), frac(-n, m + 1), n - 1),
        ...(m > 0 ? [logRelation(m, n, frac(1, m), frac(-n, m))] : []),
      ],
      mix(m, n),
    ),
  }),
  solution: logSolution,
};

const logTiles: Generator<LogParams> = {
  id: 'int-red-log-tiles',
  sample: (rng, difficulty) => ({ m: rng.int(1, difficulty > 1 ? 8 : 6), n: rng.int(2, difficulty > 1 ? 8 : 6) }),
  render: ({ m, n }): Slide => {
    const answer = [fracTex(frac(1, m + 1)), signedTok(frac(-n, m + 1))];
    return {
      kind: 'tiles',
      prompt: [prose(`Here $I_{k} = \\int ${powTex(m)}(\\ln x)^{k} \\, dx$. Complete the reduction formula.`)],
      template: `I_${n} = {0} x^${m + 1} (\\ln x)^${n} {1} I_${n - 1}`,
      bank: tokenBank(answer, [fracTex(frac(1, m)), fracTex(frac(m + 1)), signedTok(frac(n, m + 1)), signedTok(frac(-n)), signedTok(frac(-n, m))], 4),
      answer,
    };
  },
  solution: logSolution,
};

export interface LogFullParams extends LogParams {
  c: number;
}

/** The coefficients of the polynomial in ln x, highest power first, times x^{m+1}. */
export function logAntiCoefficients(c: number, m: number, n: number, slip?: 'sign' | 'once'): Frac[] {
  return Array.from({ length: n + 1 }, (_, j) =>
    frac(c * (slip === 'sign' ? 1 : (-1) ** j) * (factorial(n) / factorial(n - j)), slip === 'once' ? m + 1 : (m + 1) ** (j + 1)),
  );
}

const logAnswerOf = (p: LogFullParams, slip?: 'sign' | 'once') =>
  `x^(${p.m + 1})*(${polyInAns(logAntiCoefficients(p.c, p.m, p.n, slip), (q) => `log(x)^(${q})`)})`;

const logTexOf = (p: LogFullParams, slip?: 'sign' | 'once') =>
  `${powTex(p.m + 1)}\\left(${polyInTex(logAntiCoefficients(p.c, p.m, p.n, slip), lnPow)}\\right) + C`;

const logFull: Generator<LogFullParams> = {
  id: 'int-red-log-full',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { m: rng.pick([-3, -2, 1, 2, 3, 4, 5]), n: rng.int(2, 3), c: rng.int(1, 2) }
      : { m: rng.int(0, 5), n: rng.int(1, 2), c: rng.int(1, 3) },
  choices: (p) =>
    choiceList(
      { tex: logTexOf(p), answer: logAnswerOf(p) },
      { tex: logTexOf(p, 'sign'), answer: logAnswerOf(p, 'sign') },
      { tex: logTexOf(p, 'once'), answer: logAnswerOf(p, 'once') },
      {
        tex: `${leadTerm(frac(p.c, p.m + 1), `${powTex(p.m + 1)}${lnPow(p.n)}`)} + C`,
        answer: `(${p.c}/${p.m + 1})*x^(${p.m + 1})*log(x)^(${p.n})`,
      },
    ),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose('Use the reduction formula to integrate, for $x > 0$.')],
    lead: `\\int ${p.c === 1 ? '' : p.c}${p.m === 0 ? '' : powTex(p.m)}${lnPow(p.n)} \\, dx =`,
    keypad: LN_C_KEYS,
    answer: logAnswerOf(p),
    integrand: `(${p.c})*x^(${p.m})*log(x)^(${p.n})`,
    domain: 'positive',
    mode: 'upToConstant',
  }),
  solution: (p) => {
    const steps: SolutionStep[] = [
      {
        text: `With $I_{k} = \\int ${powTex(p.m)}(\\ln x)^{k} \\, dx$, $I_{k} = ${leadTerm(frac(1, p.m + 1), `${powTex(p.m + 1)}(\\ln x)^{k}`)} - \\frac{k}{${p.m + 1}}I_{k-1}$, and $I_{0} = ${leadTerm(frac(1, p.m + 1), powTex(p.m + 1))}$.`,
      },
    ];
    for (let k = 1; k <= p.n; k += 1) {
      steps.push({ tex: `I_{${k}} = ${powTex(p.m + 1)}\\left(${polyInTex(logAntiCoefficients(1, p.m, k), lnPow)}\\right)` });
    }
    if (p.c !== 1) steps.push({ text: `Multiply by $${p.c}$.` });
    steps.push({ tex: logTexOf(p) });
    return steps;
  },
};

/* ---------- choosing the parts ---------- */

export interface PartsFlowParams {
  type: 'exp' | 'log' | 'trig';
  n: number;
  k: number;
}

const partsFlow: Generator<PartsFlowParams> = {
  id: 'int-red-parts-flow',
  sample: (rng, difficulty) => {
    const type = rng.pick<PartsFlowParams['type']>(['exp', 'log', 'trig']);
    const hi = difficulty > 1 ? 9 : 6;
    return {
      type,
      n: rng.int(type === 'trig' ? 3 : 2, hi),
      k: type === 'exp' ? rng.pick([2, 3, 4, 5, -2, -3]) : type === 'log' ? rng.int(1, 5) : rng.int(0, 1),
    };
  },
  render: ({ type, n, k }): Slide => {
    const salt = mix(n, k, type.length);
    const fn = k === 0 ? 'sin' : 'cos';
    const subject =
      type === 'exp'
        ? `\\int x^{${n}}${expTex(k)} \\, dx`
        : type === 'log'
          ? `\\int ${powTex(k)}(\\ln x)^{${n}} \\, dx`
          : wallisIntegral(fn, n);
    const uRight = type === 'exp' ? powTex(n) : type === 'log' ? lnPow(n) : trigPow(fn, n - 1);
    const uWrong =
      type === 'exp'
        ? [expTex(k), `x^{${n}}${expTex(k)}`]
        : type === 'log'
          ? [powTex(k), `\\ln x`]
          : [`\\${fn} x`, trigPow(fn === 'sin' ? 'cos' : 'sin', n - 1)];
    const whyU =
      type === 'exp'
        ? 'Not quite: differentiating the power of $x$ is what brings its index down.'
        : type === 'log'
          ? 'Not quite: $\\ln x$ has no easy integral, so its power is the part to differentiate.'
          : `Not quite: split off one $\\${fn} x$ to integrate, and differentiate the rest.`;
    const rightRel =
      type === 'exp'
        ? expRelation(n, k, frac(1, k), frac(-n, k))
        : type === 'log'
          ? logRelation(k, n, frac(1, k + 1), frac(-n, k + 1))
          : `I_{${n}} = ${fracTex(frac(n - 1, n))}I_{${n - 2}}`;
    const wrongRel =
      type === 'exp'
        ? [expRelation(n, k, frac(1, k), frac(n, k)), expRelation(n, k, frac(1, k), frac(-n))]
        : type === 'log'
          ? [logRelation(k, n, frac(1, k + 1), frac(n, k + 1)), logRelation(k, n, frac(1, k + 1), frac(-n))]
          : [`I_{${n}} = ${fracTex(frac(n, n - 1))}I_{${n - 2}}`, `I_{${n}} = ${fracTex(frac(n - 1, n))}I_{${n - 1}}`];
    const whyRel = 'Not quite: check the sign and what is divided by what in the working.';
    return {
      kind: 'flow',
      prompt: [prose('Set up a reduction formula for this integral, one choice at a time.')],
      subject,
      steps: [
        {
          id: 'u',
          ask: 'Which part do you call $u$, the part to differentiate?',
          branches: turned(
            [{ label: `$${uRight}$`, to: 'rel' }, ...uWrong.map((tex) => ({ label: `$${tex}$`, outcome: whyU }))],
            salt,
          ),
        },
        {
          id: 'rel',
          ask: 'Which relation comes out?',
          branches: turned(
            [
              { label: `$${rightRel}$`, outcome: 'Yes: each use lowers the index until a plain integral is left.' },
              ...wrongRel.map((tex) => ({ label: `$${tex}$`, outcome: whyRel })),
            ],
            salt + 1,
          ),
        },
      ],
      answer: [`$${uRight}$`, `$${rightRel}$`],
    };
  },
  solution: ({ type, n, k }) => {
    if (type === 'exp') return expSolution({ n, k });
    if (type === 'log') return logSolution({ m: k, n });
    const fn = k === 0 ? 'sin' : 'cos';
    return [
      { text: `Write $\\${fn}^{${n}} x = ${trigPow(fn, n - 1)} \\cdot \\${fn} x$ and take $u = ${trigPow(fn, n - 1)}$.` },
      { text: `By parts, then $${fn === 'sin' ? '\\cos' : '\\sin'}^{2} x = 1 - \\${fn}^{2} x$, the $I_{${n}}$ terms collect:` },
      { tex: `${n}I_{${n}} = ${n - 1}I_{${n - 2}}` },
      { tex: `I_{${n}} = ${fracTex(frac(n - 1, n))}I_{${n - 2}}` },
    ];
  },
};

/** This level's generators by name, for `integralKit.test.ts`. */
export const reductionByName = {
  expRelationChoice,
  expTiles,
  expFull,
  gammaRelation,
  gammaTree,
  gammaTyped,
  wallisTiles,
  wallisTyped,
  wallisTree,
  logRelationChoice,
  logTiles,
  logFull,
  partsFlow,
};

export const reductionGenerators = Object.values(reductionByName) as unknown as Generator<unknown>[];
