/**
 * Inverse trigonometric and hyperbolic integrals (Further Integration,
 * level 11).
 *
 *   ∫ 1/√(a² - x²) dx = arcsin(x/a) + C
 *   ∫ 1/(a² + x²) dx  = (1/a) arctan(x/a) + C
 *   ∫ 1/√(x² + a²) dx = arsinh(x/a) + C = ln(x + √(x² + a²)) + C'
 *   ∫ 1/√(x² - a²) dx = arcosh(x/a) + C, for x > a
 *
 * The checker probes |x| up to 2.6, so an arcsin answer always has a > 2.6b:
 * the root stays real at every sample point. Definite values are written with
 * limits that land on standard angles, or on Pythagorean triples, where
 * arsinh gives the logarithm of a fraction.
 */
import type { Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { ALGEBRA_KEYS } from './calculus';
import {
  FRACTION_KEYS,
  LN_KEYS,
  PI_KEYS,
  choiceList,
  coefTex,
  drawUntil,
  frac,
  fracTex,
  fval,
  gcd,
  mix,
  piAns,
  piTex,
  placed,
  prose,
  tokenBank,
  turned,
  type Frac,
} from './integralKit';

const ASIN_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'asin', fn: 'radians' }, { insert: 'C' }];
const ATAN_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'atan', fn: 'radians' }, { insert: 'C' }];
const HYP_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'sinh(' }, { insert: 'cosh(' }, { insert: 'C' }];

/** bx/a as read: `x`, `2x`, `\frac{x}{3}`, `\frac{2x}{7}`. */
function argTex(b: number, a: number): string {
  const top = b === 1 ? 'x' : `${b}x`;
  return a === 1 ? top : `\\frac{${top}}{${a}}`;
}

/** a² - b²x² or a² + b²x² as read. */
const quadTex = (a: number, b: number, sign: '+' | '-'): string => `${a * a} ${sign} ${b === 1 ? '' : b * b}x^{2}`;

/* ---------- arcsin ---------- */

export interface AsinParams {
  k: number;
  a: number;
  b: number;
}

const asinIntegral = ({ k, a, b }: AsinParams): string => `\\int \\frac{${k}}{\\sqrt{${quadTex(a, b, '-')}}} \\, dx`;
const asinTexOf = ({ k, a, b }: AsinParams, coefficient = frac(k, b), fn = '\\arcsin', arg = argTex(b, a)): string =>
  `${coefTex(coefficient)}${fn}${arg.startsWith('\\frac') ? '' : ' '}${arg} + C`;

function asinSolution({ k, a, b }: AsinParams): SolutionStep[] {
  if (b === 1) {
    return [
      { text: `${k === 1 ? 'This is' : `This is $${k}$ times`} $\\int \\frac{1}{\\sqrt{a^{2} - x^{2}}} \\, dx = \\arcsin\\frac{x}{a}$, with $a = ${a}$.` },
      { tex: asinTexOf({ k, a, b }) },
    ];
  }
  return [
    { text: `Take out the $${b * b}$: $\\sqrt{${quadTex(a, b, '-')}} = ${b}\\sqrt{\\frac{${a * a}}{${b * b}} - x^{2}}$, so $a = ${fracTex(frac(a, b))}$ and there is $\\frac{1}{${b}}$ in front.` },
    { tex: `${fracTex(frac(k, b))}\\arcsin\\left(x \\div ${fracTex(frac(a, b))}\\right) = ${asinTexOf({ k, a, b })}` },
  ];
}

const asinTyped: Generator<AsinParams> = {
  id: 'int-inv-asin-typed',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? drawUntil(
          () => ({ k: rng.int(1, 5), b: rng.int(2, 3), a: rng.int(6, 11) }),
          ({ a, b }) => a > 2.6 * b && gcd(a, b) === 1,
          { k: 1, b: 2, a: 7 },
        )
      : { k: rng.int(1, 5), a: rng.int(3, 9), b: 1 },
  choices: (p) =>
    choiceList(
      { tex: asinTexOf(p), answer: `(${p.k}/${p.b})*asin(${p.b}*x/${p.a})` },
      // Divided by a as arctan is, b taken as a factor instead of a divisor,
      // the arctan result, and the b left out of the arcsin.
      { tex: asinTexOf(p, frac(p.k, p.a * p.b)), answer: `(${p.k}/(${p.a * p.b}))*asin(${p.b}*x/${p.a})` },
      { tex: asinTexOf(p, frac(p.k * p.b)), answer: `(${p.k * p.b})*asin(${p.b}*x/${p.a})` },
      { tex: asinTexOf(p, frac(p.k, p.a * p.b), '\\arctan'), answer: `(${p.k}/(${p.a * p.b}))*atan(${p.b}*x/${p.a})` },
      { tex: asinTexOf(p, frac(p.k, p.b), '\\arcsin', argTex(1, p.a)), answer: `(${p.k}/${p.b})*asin(x/${p.a})` },
    ),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose('Integrate. The keypad writes $\\arcsin$ as $\\sin^{-1}$.')],
    lead: `${asinIntegral(p)} =`,
    keypad: ASIN_KEYS,
    answer: `(${p.k}/${p.b})*asin(${p.b}*x/${p.a})`,
    integrand: `(${p.k})/sqrt(${p.a * p.a} - ${p.b * p.b}*x^2)`,
    domain: 'real',
    mode: 'upToConstant',
  }),
  solution: asinSolution,
};

const asinTiles: Generator<AsinParams> = {
  id: 'int-inv-asin-tiles',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ k: rng.int(1, 3), b: rng.int(2, difficulty > 1 ? 5 : 3), a: rng.int(1, 9) }),
      ({ a, b }) => gcd(a, b) === 1,
      { k: 1, b: 2, a: 3 },
    ),
  render: (p): Slide => {
    const { k, a, b } = p;
    const answer = [fracTex(frac(k, b)), argTex(b, a)];
    return {
      kind: 'tiles',
      prompt: [prose('Complete the integral.'), { kind: 'display', tex: `${asinIntegral(p)} =` }],
      template: '{0} \\arcsin ( {1} ) + C',
      bank: tokenBank(answer, [fracTex(frac(k * b)), fracTex(frac(k, a * b)), argTex(1, a), `\\frac{${a}x}{${b}}`, argTex(b, a * a)], 4),
      answer,
    };
  },
  solution: asinSolution,
};

/** Limits that land on standard angles: lower, upper, and the angle difference as a fraction of π. */
interface AngleSet {
  lo: (a: number) => string;
  hi: (a: number) => string;
  loV: number;
  hiV: number;
  angle: Frac;
}

const half = (a: number): string => (a % 2 === 0 ? `${a / 2}` : `\\frac{${a}}{2}`);
const rootHalf3 = (a: number): string => (a === 2 ? '\\sqrt{3}' : a % 2 === 0 ? `${a / 2}\\sqrt{3}` : `\\frac{${a === 1 ? '' : a}\\sqrt{3}}{2}`);
const overRoot = (a: number, r: number): string => `\\frac{${a}}{\\sqrt{${r}}}`;
const timesRoot3 = (a: number): string => `${a === 1 ? '' : a}\\sqrt{3}`;
const neg = (tex: string): string => `-${tex}`;

const ASIN_SETS: AngleSet[] = [
  { lo: () => '0', hi: half, loV: 0, hiV: 0.5, angle: frac(1, 6) },
  { lo: () => '0', hi: (a) => overRoot(a, 2), loV: 0, hiV: Math.SQRT1_2, angle: frac(1, 4) },
  { lo: (a) => neg(half(a)), hi: half, loV: -0.5, hiV: 0.5, angle: frac(1, 3) },
  { lo: () => '0', hi: rootHalf3, loV: 0, hiV: Math.sqrt(3) / 2, angle: frac(1, 3) },
  { lo: half, hi: rootHalf3, loV: 0.5, hiV: Math.sqrt(3) / 2, angle: frac(1, 6) },
  { lo: (a) => neg(half(a)), hi: () => '0', loV: -0.5, hiV: 0, angle: frac(1, 6) },
];

export interface AngleParams {
  k: number;
  a: number;
  set: number;
}

const asinValueOf = ({ k, set }: AngleParams): Frac => frac(k * ASIN_SETS[set].angle.n, ASIN_SETS[set].angle.d);

const asinValue: Generator<AngleParams> = {
  id: 'int-inv-asin-value',
  sample: (rng, difficulty) => ({ k: rng.int(1, 4), a: rng.int(1, 8), set: difficulty > 1 ? rng.int(0, 5) : rng.pick([0, 1, 2]) }),
  render: (p): Slide => {
    const s = ASIN_SETS[p.set];
    const v = asinValueOf(p);
    return {
      kind: 'expression',
      prompt: [prose('Find this integral exactly.')],
      lead: `\\int_{${s.lo(p.a)}}^{${s.hi(p.a)}} \\frac{${p.k}}{\\sqrt{${p.a * p.a} - x^{2}}} \\, dx =`,
      keypad: PI_KEYS,
      answer: `${fval(v) * Math.PI}`,
      alsoAccepts: [piAns(v)],
      integrand: `${p.k}/sqrt(${p.a * p.a} - x^2)`,
      limits: [s.loV * p.a, s.hiV * p.a],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const s = ASIN_SETS[p.set];
    const k = p.k === 1 ? '' : `${p.k}`;
    return [
      { tex: `= ${k}\\left[\\arcsin\\frac{x}{${p.a}}\\right]_{${s.lo(p.a)}}^{${s.hi(p.a)}}` },
      { text: `Dividing each limit by $${p.a}$ leaves $${fmtRatio(s.loV)}$ and $${fmtRatio(s.hiV)}$, whose arcsines are standard angles.` },
      { tex: `= ${k}\\left(${angleTex(Math.asin(s.hiV))} - ${angleTex(Math.asin(s.loV))}\\right)` },
      { tex: `= ${piTex(asinValueOf(p))}` },
    ];
  },
};

/** A standard sine or tangent value as read. */
function fmtRatio(v: number): string {
  const table: [number, string][] = [
    [0, '0'],
    [0.5, '\\frac{1}{2}'],
    [-0.5, '-\\frac{1}{2}'],
    [Math.SQRT1_2, '\\frac{1}{\\sqrt{2}}'],
    [Math.sqrt(3) / 2, '\\frac{\\sqrt{3}}{2}'],
    [1, '1'],
    [-1, '-1'],
    [Math.sqrt(3), '\\sqrt{3}'],
    [1 / Math.sqrt(3), '\\frac{1}{\\sqrt{3}}'],
  ];
  return table.find(([x]) => Math.abs(x - v) < 1e-9)?.[1] ?? `${v}`;
}

/** An angle that is a multiple of π/12, as read, bracketed if negative. */
function angleTex(radians: number): string {
  const tex = piTex(frac(Math.round((radians * 12) / Math.PI), 12));
  return tex.startsWith('-') ? `\\left(${tex}\\right)` : tex;
}

/* ---------- arctan ---------- */

const atanIntegral = ({ k, a, b }: AsinParams): string => `\\int \\frac{${k}}{${quadTex(a, b, '+')}} \\, dx`;

function atanSolution({ k, a, b }: AsinParams): SolutionStep[] {
  if (b === 1) {
    return [
      { text: `${k === 1 ? 'This is' : `This is $${k}$ times`} $\\int \\frac{1}{a^{2} + x^{2}} \\, dx = \\frac{1}{a}\\arctan\\frac{x}{a}$, with $a = ${a}$.` },
      { tex: asinTexOf({ k, a, b }, frac(k, a), '\\arctan') },
    ];
  }
  return [
    { text: `Take out the $${b * b}$: $${quadTex(a, b, '+')} = ${b * b}\\left(\\frac{${a * a}}{${b * b}} + x^{2}\\right)$, so $a = ${fracTex(frac(a, b))}$.` },
    { tex: `${fracTex(frac(k, b * b))} \\cdot ${fracTex(frac(b, a))}\\arctan\\left(x \\div ${fracTex(frac(a, b))}\\right)` },
    { tex: `= ${asinTexOf({ k, a, b }, frac(k, a * b), '\\arctan')}` },
  ];
}

const atanTyped: Generator<AsinParams> = {
  id: 'int-inv-atan-typed',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? drawUntil(() => ({ k: rng.int(1, 5), b: rng.int(2, 3), a: rng.int(1, 7) }), ({ a, b }) => gcd(a, b) === 1, { k: 1, b: 2, a: 3 })
      : { k: rng.int(1, 5), a: rng.int(1, 9), b: 1 },
  choices: (p) =>
    choiceList(
      { tex: asinTexOf(p, frac(p.k, p.a * p.b), '\\arctan'), answer: `(${p.k}/(${p.a * p.b}))*atan(${p.b}*x/${p.a})` },
      // The 1/a left off, a times instead of divided, and the arcsin result.
      { tex: asinTexOf(p, frac(p.k, p.b), '\\arctan'), answer: `(${p.k}/${p.b})*atan(${p.b}*x/${p.a})` },
      { tex: asinTexOf(p, frac(p.k * p.a, p.b), '\\arctan'), answer: `(${p.k * p.a}/${p.b})*atan(${p.b}*x/${p.a})` },
      // No mathjs form: arcsin(bx/a) leaves the real line inside the probe range.
      { tex: asinTexOf(p, frac(p.k, p.a * p.b), '\\arcsin') },
      { tex: asinTexOf(p, frac(p.k, p.a * p.a), '\\arctan'), answer: `(${p.k}/(${p.a * p.a}))*atan(${p.b}*x/${p.a})` },
    ),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose('Integrate. The keypad writes $\\arctan$ as $\\tan^{-1}$.')],
    lead: `${atanIntegral(p)} =`,
    keypad: ATAN_KEYS,
    answer: `(${p.k}/(${p.a * p.b}))*atan(${p.b}*x/${p.a})`,
    integrand: `(${p.k})/(${p.a * p.a} + ${p.b * p.b}*x^2)`,
    domain: 'real',
    mode: 'upToConstant',
  }),
  solution: atanSolution,
};

const ATAN_SETS: AngleSet[] = [
  { lo: () => '0', hi: (a) => `${a}`, loV: 0, hiV: 1, angle: frac(1, 4) },
  { lo: () => '0', hi: timesRoot3, loV: 0, hiV: Math.sqrt(3), angle: frac(1, 3) },
  { lo: () => '0', hi: (a) => overRoot(a, 3), loV: 0, hiV: 1 / Math.sqrt(3), angle: frac(1, 6) },
  { lo: (a) => `-${a}`, hi: (a) => `${a}`, loV: -1, hiV: 1, angle: frac(1, 2) },
  { lo: (a) => `${a}`, hi: timesRoot3, loV: 1, hiV: Math.sqrt(3), angle: frac(1, 12) },
];

const atanValueOf = ({ k, a, set }: AngleParams): Frac => frac(k * ATAN_SETS[set].angle.n, ATAN_SETS[set].angle.d * a);

function atanValueSolution(p: AngleParams): SolutionStep[] {
  const s = ATAN_SETS[p.set];
  return [
    { tex: `= ${fracTex(frac(p.k, p.a))}\\left[\\arctan\\frac{x}{${p.a}}\\right]_{${s.lo(p.a)}}^{${s.hi(p.a)}}` },
    { text: `Dividing each limit by $${p.a}$ leaves $${fmtRatio(s.loV)}$ and $${fmtRatio(s.hiV)}$, whose arctangents are standard angles.` },
    { tex: `= ${fracTex(frac(p.k, p.a))}\\left(${angleTex(Math.atan(s.hiV))} - ${angleTex(Math.atan(s.loV))}\\right)` },
    { tex: `= ${piTex(atanValueOf(p))}` },
  ];
}

const atanValue: Generator<AngleParams> = {
  id: 'int-inv-atan-value',
  sample: (rng, difficulty) => ({ k: rng.int(1, 4), a: rng.int(1, 8), set: difficulty > 1 ? rng.int(0, 4) : rng.pick([0, 1, 3]) }),
  render: (p): Slide => {
    const s = ATAN_SETS[p.set];
    const v = atanValueOf(p);
    return {
      kind: 'expression',
      prompt: [prose('Find this integral exactly.')],
      lead: `\\int_{${s.lo(p.a)}}^{${s.hi(p.a)}} \\frac{${p.k}}{${p.a * p.a} + x^{2}} \\, dx =`,
      keypad: PI_KEYS,
      answer: `${fval(v) * Math.PI}`,
      alsoAccepts: [piAns(v)],
      integrand: `${p.k}/(${p.a * p.a} + x^2)`,
      limits: [s.loV * p.a, s.hiV * p.a],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: atanValueSolution,
};

const atanSteps: Generator<AngleParams> = {
  id: 'int-inv-atan-steps',
  sample: (rng, difficulty) => ({ k: rng.int(1, 4), a: rng.int(2, 8), set: difficulty > 1 ? rng.int(0, 4) : rng.pick([0, 1, 2]) }),
  render: (p): Slide => {
    const s = ATAN_SETS[p.set];
    const bracket = (coefficient: Frac, fn = '\\arctan') => `\\left[${coefTex(coefficient)}${fn}\\frac{x}{${p.a}}\\right]_{${s.lo(p.a)}}^{${s.hi(p.a)}}`;
    const v = atanValueOf(p);
    const angle = s.angle;
    return {
      kind: 'steps',
      prompt: [prose('Tap the part you would do **next**, then choose what it comes to.')],
      start: [`\\int_{${s.lo(p.a)}}^{${s.hi(p.a)}}`, `\\frac{${p.k}}{${p.a * p.a} + x^{2}}`, '\\, dx'],
      reductions: [
        {
          span: [0, 3],
          value: bracket(frac(p.k, p.a)),
          // The 1/a left off, a times, and the arcsin.
          bank: tokenBank([bracket(frac(p.k, p.a))], [bracket(frac(p.k)), bracket(frac(p.k * p.a)), bracket(frac(p.k, p.a), '\\arcsin')]),
        },
        {
          span: [0, 1],
          value: piTex(v),
          bank: tokenBank(
            [piTex(v)],
            [piTex(frac(p.k * angle.n, angle.d)), piTex(frac(p.k * p.a * angle.n, angle.d)), piTex(frac(p.k * 2 * angle.n, angle.d * p.a)), piTex(frac(p.k, 2 * p.a))],
          ),
        },
      ],
    };
  },
  solution: atanValueSolution,
};

/* ---------- completing the square ---------- */

export interface SquareParams {
  form: 'atan' | 'asin';
  k: number;
  p: number;
  /** atan: a, with the quadratic (x + p)² + a². asin: r, with r² - (x - p)². */
  a: number;
}

const signed = (v: number): string => (v < 0 ? `- ${-v}` : `+ ${v}`);

/** The quadratic as it is set: x² + 2px + q, or c + 2px - x². */
function quadratic({ form, p, a }: SquareParams): string {
  if (form === 'atan') return `x^{2} ${signed(2 * p)}x ${signed(p * p + a * a)}`;
  return `${a * a - p * p} ${signed(2 * p)}x - x^{2}`;
}

/** The completed square as read. */
function completed({ form, p, a }: SquareParams): string {
  if (form === 'atan') return `(x ${signed(p)})^{2} + ${a * a}`;
  return `${a * a} - (x ${signed(-p)})^{2}`;
}

const squareIntegral = (s: SquareParams): string =>
  s.form === 'atan' ? `\\int \\frac{${s.k}}{${quadratic(s)}} \\, dx` : `\\int \\frac{${s.k}}{\\sqrt{${quadratic(s)}}} \\, dx`;

/** The shifted letter over a: `\frac{x + 3}{2}`, or `x + 3` when a = 1. */
const shifted = (shift: number, a: number): string => (a === 1 ? `(x ${signed(shift)})` : `\\frac{x ${signed(shift)}}{${a}}`);

function squareAnswerTex(s: SquareParams, coefficient?: Frac, fn?: string): string {
  const c = coefficient ?? (s.form === 'atan' ? frac(s.k, s.a) : frac(s.k));
  const name = fn ?? (s.form === 'atan' ? '\\arctan' : '\\arcsin');
  const arg = shifted(s.form === 'atan' ? s.p : -s.p, s.a);
  return `${coefTex(c)}${name}${arg.startsWith('(') ? '' : ' '}${arg} + C`;
}

const squareAnswer = (s: SquareParams): string =>
  s.form === 'atan' ? `(${s.k}/${s.a})*atan((x + (${s.p}))/${s.a})` : `(${s.k})*asin((x - (${s.p}))/${s.a})`;

function sampleSquare(rng: { int(a: number, b: number): number; pick<T>(xs: T[]): T }, difficulty: number): SquareParams {
  const form = difficulty > 1 ? rng.pick<'atan' | 'asin'>(['atan', 'asin']) : 'atan';
  if (form === 'atan') return { form, k: rng.int(1, 4), p: rng.pick([1, 2, 3, 4, 5, -1, -2, -3, -4, -5]), a: rng.int(1, 5) };
  return drawUntil(
    () => ({ form, k: rng.int(1, 4), p: rng.pick([1, 2, -1, -2]), a: rng.int(4, 7) }),
    ({ p, a }) => a > 2.7 + Math.abs(p),
    { form, k: 1, p: 1, a: 4 },
  );
}

function squareSolution(s: SquareParams): SolutionStep[] {
  return [
    { text: 'Complete the square first:' },
    { tex: `${quadratic(s)} = ${completed(s)}` },
    {
      text:
        s.form === 'atan'
          ? `Now it is $\\frac{1}{u^{2} + a^{2}}$ with $u = x ${signed(s.p)}$ and $a = ${s.a}$, which gives an arctangent.`
          : `Now it is $\\frac{1}{\\sqrt{a^{2} - u^{2}}}$ with $u = x ${signed(-s.p)}$ and $a = ${s.a}$, which gives an arcsine.`,
    },
    { tex: squareAnswerTex(s) },
  ];
}

const squareTiles: Generator<SquareParams> = {
  id: 'int-inv-square-tiles',
  sample: (rng, difficulty) => sampleSquare(rng, difficulty),
  render: (s): Slide => {
    const size = Math.abs(s.p);
    const answer = s.form === 'atan' ? [`${size}`, `${s.a * s.a}`] : [`${s.a * s.a}`, `${size}`];
    const q = s.p * s.p + s.a * s.a;
    const extras = [2 * size, q - size, q - 2 * size, s.a, size * size + 1, s.a * s.a + size].map(String);
    const template =
      s.form === 'atan'
        ? `x^2 ${s.p < 0 ? '-' : '+'} ${2 * size}x + ${q} = (x ${s.p < 0 ? '-' : '+'} {0})^2 + {1}`
        : `${s.a * s.a - s.p * s.p} ${s.p < 0 ? '-' : '+'} ${2 * size}x - x^2 = {0} - (x ${s.p < 0 ? '+' : '-'} {1})^2`;
    return {
      kind: 'tiles',
      prompt: [prose('Complete the square.')],
      template,
      bank: tokenBank(answer, extras, 3),
      answer,
    };
  },
  solution: (s) => [
    { text: `Half the $x$ coefficient is $${Math.abs(s.p)}$, and its square is $${s.p * s.p}$.` },
    { tex: `${quadratic(s)} = ${completed(s)}` },
  ],
};

const squareTyped: Generator<SquareParams> = {
  id: 'int-inv-square-typed',
  sample: (rng, difficulty) => sampleSquare(rng, difficulty),
  choices: (s) =>
    choiceList(
      { tex: squareAnswerTex(s), answer: squareAnswer(s) },
      ...(s.form === 'atan'
        ? [
            { tex: squareAnswerTex(s, frac(s.k)), answer: `(${s.k})*atan((x + (${s.p}))/${s.a})` },
            { tex: squareAnswerTex({ ...s, p: -s.p }), answer: `(${s.k}/${s.a})*atan((x - (${s.p}))/${s.a})` },
            { tex: squareAnswerTex(s, frac(s.k, s.a * s.a)), answer: `(${s.k}/${s.a * s.a})*atan((x + (${s.p}))/${s.a})` },
          ]
        : [
            { tex: squareAnswerTex(s, frac(s.k, s.a)), answer: `(${s.k}/${s.a})*asin((x - (${s.p}))/${s.a})` },
            { tex: squareAnswerTex({ ...s, p: -s.p }), answer: `(${s.k})*asin((x + (${s.p}))/${s.a})` },
            { tex: squareAnswerTex(s, frac(s.k, s.a), '\\arctan'), answer: `(${s.k}/${s.a})*atan((x - (${s.p}))/${s.a})` },
          ]),
    ),
  render: (s): Slide => ({
    kind: 'expression',
    prompt: [prose(`Complete the square, then integrate. The keypad writes $${s.form === 'atan' ? '\\arctan' : '\\arcsin'}$ as $${s.form === 'atan' ? '\\tan' : '\\sin'}^{-1}$.`)],
    lead: `${squareIntegral(s)} =`,
    keypad: s.form === 'atan' ? ATAN_KEYS : ASIN_KEYS,
    answer: squareAnswer(s),
    integrand: s.form === 'atan' ? `${s.k}/(x^2 + ${2 * s.p}*x + ${s.p * s.p + s.a * s.a})` : `${s.k}/sqrt(${s.a * s.a - s.p * s.p} + ${2 * s.p}*x - x^2)`,
    domain: 'real',
    mode: 'upToConstant',
  }),
  solution: squareSolution,
};

const squareFlow: Generator<SquareParams> = {
  id: 'int-inv-square-flow',
  sample: (rng) => sampleSquare(rng, 2),
  render: (s): Slide => {
    const salt = mix(s.k, s.p, s.a, s.form.length);
    const q = s.p * s.p + s.a * s.a;
    const wrongSquares =
      s.form === 'atan'
        ? [`(x ${signed(s.p)})^{2} + ${q}`, `(x ${signed(2 * s.p)})^{2} ${signed(q - 4 * s.p * s.p)}`]
        : [`${s.a * s.a - s.p * s.p} - (x ${signed(-s.p)})^{2}`, `${s.a * s.a} - (x ${signed(s.p)})^{2}`];
    const wrongForms = [
      ...new Set(
        s.form === 'atan'
          ? [squareAnswerTex(s, undefined, '\\arcsin'), squareAnswerTex(s, frac(s.k)), squareAnswerTex({ ...s, p: -s.p })]
          : [squareAnswerTex(s, frac(s.k, s.a), '\\arctan'), squareAnswerTex(s, frac(s.k, s.a)), squareAnswerTex({ ...s, p: -s.p })],
      ),
    ]
      .filter((tex) => tex !== squareAnswerTex(s))
      .slice(0, 2);
    return {
      kind: 'flow',
      prompt: [prose('Integrate this, one step at a time.')],
      subject: squareIntegral(s),
      steps: [
        {
          id: 'square',
          ask: 'First complete the square. Which is it?',
          branches: turned(
            [
              { label: `$${completed(s)}$`, to: 'form' },
              ...wrongSquares.map((tex) => ({ label: `$${tex}$`, outcome: 'Not quite: expand it back and compare with the original.' })),
            ],
            salt,
          ),
        },
        {
          id: 'form',
          ask: 'Which is the integral?',
          branches: turned(
            [
              { label: `$${squareAnswerTex(s)}$`, outcome: 'Yes: a standard result, with $x$ shifted.' },
              ...wrongForms.map((tex) => ({ label: `$${tex}$`, outcome: 'Not quite: check which standard result the shape matches, and what goes in front.' })),
            ],
            salt + 1,
          ),
        },
      ],
      answer: [`$${completed(s)}$`, `$${squareAnswerTex(s)}$`],
    };
  },
  solution: squareSolution,
};

/* ---------- hyperbolic functions ---------- */

/** e^x = m for these arguments x = ln m, fractions kept small. */
const LN_ARGS: Frac[] = [2, 3, 4, 5, 6, 7, 8, 9].map((n) => frac(n)).concat([frac(3, 2), frac(5, 2), frac(7, 2), frac(4, 3), frac(5, 3), frac(5, 4), frac(7, 4)]);

export interface HypValueParams {
  fn: 'sinh' | 'cosh';
  m: number;
  k: number;
}

const lnTex = (f: Frac): string => (f.d === 1 ? `\\ln ${f.n}` : `\\ln\\frac{${f.n}}{${f.d}}`);

function hypArgTex({ m, k }: Pick<HypValueParams, 'm' | 'k'>): string {
  const f = LN_ARGS[m];
  const inner = `${k === 1 ? '' : k}${lnTex(f)}`;
  return f.d === 1 && k === 1 ? `(${inner})` : `\\left(${inner}\\right)`;
}

/** e^x for x = k ln m. */
const expOf = ({ m, k }: Pick<HypValueParams, 'm' | 'k'>): Frac => frac(LN_ARGS[m].n ** k, LN_ARGS[m].d ** k);

export function hypValue(p: HypValueParams): Frac {
  const e = expOf(p);
  const top = p.fn === 'cosh' ? e.n * e.n + e.d * e.d : e.n * e.n - e.d * e.d;
  return frac(top, 2 * e.n * e.d);
}

const hypTree: Generator<HypValueParams> = {
  id: 'int-hyp-value-tree',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { fn: rng.pick<'sinh' | 'cosh'>(['sinh', 'cosh']), m: rng.int(0, 9), k: rng.pick([1, 2]) }
      : { fn: rng.pick<'sinh' | 'cosh'>(['sinh', 'cosh']), m: rng.int(0, LN_ARGS.length - 1), k: 1 },
  render: (p): Slide => {
    const e = expOf(p);
    const inv = frac(e.d, e.n);
    const sum = p.fn === 'cosh' ? frac(e.n * e.n + e.d * e.d, e.n * e.d) : frac(e.n * e.n - e.d * e.d, e.n * e.d);
    const other = p.fn === 'cosh' ? frac(e.n * e.n - e.d * e.d, e.n * e.d) : frac(e.n * e.n + e.d * e.d, e.n * e.d);
    const answer = [e, inv, sum, hypValue(p)].map(fracTex);
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Use $\\${p.fn} x = \\frac{e^{x} ${p.fn === 'cosh' ? '+' : '-'} e^{-x}}{2}$. Top row: $e^{x}$ and $e^{-x}$. Then the ${p.fn === 'cosh' ? 'sum' : 'difference'}, then halve it.`,
        ),
      ],
      expression: `\\${p.fn}${hypArgTex(p)}`,
      nodes: [
        { id: 'ex', from: [] },
        { id: 'emx', from: [] },
        { id: 'comb', from: ['ex', 'emx'] },
        { id: 'val', from: ['comb'] },
      ],
      bank: tokenBank(answer, [fracTex(other), fracTex(frac(other.n, 2 * other.d)), fracTex(frac(-e.n, e.d)), fracTex(frac(sum.n * 2, sum.d))]),
      answer,
    };
  },
  solution: (p) => {
    const e = expOf(p);
    return [
      { text: `$e^{${p.k === 1 ? '' : p.k}\\ln m} = m^{${p.k}}$, so $e^{x} = ${fracTex(e)}$ and $e^{-x} = ${fracTex(frac(e.d, e.n))}$.` },
      { tex: `\\${p.fn}${hypArgTex(p)} = \\frac{1}{2}\\left(${fracTex(e)} ${p.fn === 'cosh' ? '+' : '-'} ${fracTex(frac(e.d, e.n))}\\right)` },
      { tex: `= ${fracTex(hypValue(p))}` },
    ];
  },
};

export interface HypIntParams {
  a: number;
  b: number;
  k: number;
}

const hypArg = (k: number): string => (k === 1 ? 'x' : `${k}x`);

function hypSum(a: Frac, b: Frac, k: number, first: string, second: string): string {
  const terms: string[] = [];
  if (a.n !== 0) terms.push(`${coefTex(a)}\\${first} ${hypArg(k)}`);
  if (b.n !== 0) {
    const body = `\\${second} ${hypArg(k)}`;
    const size = frac(Math.abs(b.n), b.d);
    terms.push(terms.length === 0 ? `${coefTex(b)}${body}` : `${b.n < 0 ? '-' : '+'} ${coefTex(size)}${body}`);
  }
  return terms.join(' ');
}

const hypIntegrand = ({ a, b, k }: HypIntParams): string => hypSum(frac(a), frac(b), k, 'cosh', 'sinh');
const hypAnswerTex = ({ a, b, k }: HypIntParams, scale = (v: number) => frac(v, k), swapSign = 1): string =>
  `${hypSum(scale(a), frac(swapSign * scale(b).n, scale(b).d), k, 'sinh', 'cosh')} + C`;
const hypAnswer = ({ a, b, k }: HypIntParams, mult = 1 / k, sign = 1): string =>
  `(${a * mult})*sinh(${k}*x) + (${sign * b * mult})*cosh(${k}*x)`;

const hypIntegral: Generator<HypIntParams> = {
  id: 'int-hyp-integral',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { a: rng.pick([1, 2, 3, 4, 6, -2, -3]), b: rng.pick([1, 2, 3, 4, 6, -2, -3]), k: rng.int(2, 4) }
      : rng.chance(0.5)
        ? { a: rng.int(1, 6), b: 0, k: rng.int(1, 4) }
        : { a: 0, b: rng.int(1, 6), k: rng.int(1, 4) },
  choices: (p) =>
    choiceList(
      { tex: hypAnswerTex(p), answer: hypAnswer(p) },
      // k multiplied rather than divided, and the trig habit of a minus sign.
      { tex: hypAnswerTex(p, (v) => frac(v * p.k)), answer: hypAnswer(p, p.k) },
      { tex: hypAnswerTex(p, (v) => frac(v, p.k), -1), answer: hypAnswer(p, 1 / p.k, -1) },
      {
        tex: `${hypSum(frac(-p.a, p.k), frac(p.b, p.k), p.k, 'sinh', 'cosh')} + C`,
        answer: `(${-p.a / p.k})*sinh(${p.k}*x) + (${p.b / p.k})*cosh(${p.k}*x)`,
      },
      { tex: `${hypSum(frac(p.a), frac(p.b), p.k, 'sinh', 'cosh')} + C`, answer: hypAnswer(p, 1) },
    ),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose('Integrate.')],
    lead: `\\int \\left(${hypIntegrand(p)}\\right) dx =`,
    keypad: HYP_KEYS,
    answer: hypAnswer(p),
    integrand: `(${p.a})*cosh(${p.k}*x) + (${p.b})*sinh(${p.k}*x)`,
    domain: 'real',
    mode: 'upToConstant',
  }),
  solution: (p) => [
    { text: `$\\frac{d}{dx}\\sinh ${hypArg(p.k)} = ${p.k === 1 ? '' : p.k}\\cosh ${hypArg(p.k)}$ and $\\frac{d}{dx}\\cosh ${hypArg(p.k)} = ${p.k === 1 ? '' : p.k}\\sinh ${hypArg(p.k)}$, with no minus sign.` },
    { text: p.k === 1 ? 'So each integral swaps cosh and sinh.' : `So each integral swaps cosh and sinh and divides by $${p.k}$.` },
    { tex: hypAnswerTex(p) },
  ],
};

export interface CatenaryParams {
  c: number;
  m: number;
  both: boolean;
}

export const catenaryLength = ({ c, m, both }: CatenaryParams): Frac => frac(c * (m * m - 1) * (both ? 2 : 1), 2 * m);

const catenaryY = (c: number): string => (c === 1 ? '\\cosh x' : `${c}\\cosh\\frac{x}{${c}}`);
const catenaryEnd = (c: number, m: number): string => `${c === 1 ? '' : c}\\ln ${m}`;

const catenary: Generator<CatenaryParams> = {
  id: 'int-hyp-catenary',
  sample: (rng, difficulty) => ({ c: rng.int(1, 6), m: rng.int(2, 6), both: difficulty > 1 && rng.chance(0.6) }),
  render: (p): Slide => {
    const s = catenaryLength(p);
    const end = catenaryEnd(p.c, p.m);
    return {
      kind: 'expression',
      prompt: [prose(`Find the length of $y = ${catenaryY(p.c)}$ from $x = ${p.both ? `-${end}` : '0'}$ to $x = ${end}$.`)],
      lead: 's =',
      keypad: s.d === 1 ? [] : FRACTION_KEYS,
      answer: `${fval(s)}`,
      alsoAccepts: [`(${s.n}/${s.d})`],
      integrand: `sqrt(1 + sinh(x/${p.c})^2)`,
      limits: [p.both ? -p.c * Math.log(p.m) : 0, p.c * Math.log(p.m)],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const end = catenaryEnd(p.c, p.m);
    const arg = p.c === 1 ? 'x' : `\\frac{x}{${p.c}}`;
    return [
      { text: `Here $\\frac{dy}{dx} = \\sinh ${arg}$, and $1 + \\sinh^{2} = \\cosh^{2}$, so the root is $\\cosh ${arg}$.` },
      { tex: `s = ${p.both ? '2' : ''}\\int_{0}^{${end}} \\cosh ${arg} \\, dx = ${p.both ? '2' : ''}\\left[${p.c === 1 ? '' : p.c}\\sinh ${arg}\\right]_{0}^{${end}}` },
      { text: `$\\sinh(\\ln ${p.m}) = \\frac{1}{2}\\left(${p.m} - \\frac{1}{${p.m}}\\right) = ${fracTex(frac(p.m * p.m - 1, 2 * p.m))}$.` },
      { tex: `s = ${fracTex(catenaryLength(p))}` },
    ];
  },
};

/* ---------- inverse hyperbolic integrals ---------- */

/** Pythagorean triples as [p, q, r] with p² + q² = r²; both orientations are listed. */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
  [7, 24, 25],
  [24, 7, 25],
];

export interface ArsinhParams {
  t: number;
  s: number;
  c: number;
}

/** ∫_0^{ps} c/√(x² + (qs)²) dx = c ln((p + r)/q). */
export const arsinhRatio = ({ t }: Pick<ArsinhParams, 't'>): Frac => frac(TRIPLES[t][0] + TRIPLES[t][2], TRIPLES[t][1]);

const arsinhValue: Generator<ArsinhParams> = {
  id: 'int-inv-hyp-value',
  sample: (rng) =>
    drawUntil(
      () => ({ t: rng.int(0, 7), s: rng.int(1, 2), c: rng.int(1, 3) }),
      ({ t, s }) => TRIPLES[t][2] * s <= 30,
      { t: 0, s: 1, c: 1 },
    ),
  render: (p): Slide => {
    const [pp, q] = TRIPLES[p.t];
    const ratio = arsinhRatio(p);
    const a = q * p.s;
    return {
      kind: 'expression',
      prompt: [prose('Find this integral exactly, as a logarithm.')],
      lead: `\\int_{0}^{${pp * p.s}} \\frac{${p.c}}{\\sqrt{x^{2} + ${a * a}}} \\, dx =`,
      keypad: LN_KEYS,
      answer: `${p.c * Math.log(fval(ratio))}`,
      alsoAccepts: [`${p.c}*log(${ratio.n}/${ratio.d})`],
      integrand: `${p.c}/sqrt(x^2 + ${a * a})`,
      limits: [0, pp * p.s],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const [pp, q, r] = TRIPLES[p.t];
    const h = pp * p.s;
    const a = q * p.s;
    const c = p.c === 1 ? '' : `${p.c}`;
    return [
      { tex: `= ${c}\\left[\\ln\\left(x + \\sqrt{x^{2} + ${a * a}}\\right)\\right]_{0}^{${h}}` },
      { text: `At $x = ${h}$ the root is $\\sqrt{${h * h + a * a}} = ${r * p.s}$; at $0$ it is $${a}$.` },
      { tex: `= ${c}\\left(\\ln ${h + r * p.s} - \\ln ${a}\\right)` },
      { tex: `= ${c}${lnTex(arsinhRatio(p))}` },
    ];
  },
};

export interface WhichFormParams {
  form: number;
  a: number;
}

const FORM_INTEGRANDS = [
  (a: number) => `\\frac{1}{\\sqrt{${a * a} - x^{2}}}`,
  (a: number) => `\\frac{1}{${a * a} + x^{2}}`,
  (a: number) => `\\frac{1}{\\sqrt{x^{2} + ${a * a}}}`,
  (a: number) => `\\frac{1}{\\sqrt{x^{2} - ${a * a}}}`,
];

const FORM_ANSWERS = [
  (a: number) => `\\arcsin\\frac{x}{${a}} + C`,
  (a: number) => `\\frac{1}{${a}}\\arctan\\frac{x}{${a}} + C`,
  (a: number) => `\\operatorname{arsinh}\\frac{x}{${a}} + C`,
  (a: number) => `\\operatorname{arcosh}\\frac{x}{${a}} + C`,
];

const whichForm: Generator<WhichFormParams> = {
  id: 'int-inv-hyp-choice',
  sample: (rng) => ({ form: rng.int(0, 3), a: rng.int(2, 9) }),
  render: ({ form, a }): Slide => ({
    kind: 'choice',
    prompt: [prose(`Which is $\\int ${FORM_INTEGRANDS[form](a)} \\, dx$?`)],
    ...placed([FORM_ANSWERS[form](a), ...FORM_ANSWERS.filter((_, i) => i !== form).map((f) => f(a))], mix(form, a)),
  }),
  solution: ({ form, a }) => [
    {
      text: [
        'A root of a number minus $x^{2}$ gives an arcsine.',
        'A number plus $x^{2}$, with no root, gives an arctangent, with $\\frac{1}{a}$ in front.',
        'A root of $x^{2}$ plus a number gives an inverse sinh.',
        'A root of $x^{2}$ minus a number gives an inverse cosh.',
      ][form],
    },
    { tex: `\\int ${FORM_INTEGRANDS[form](a)} \\, dx = ${FORM_ANSWERS[form](a)}` },
  ],
};

export interface HypTreeParams {
  kind: 'sinh' | 'cosh';
  t: number;
  s: number;
}

const hypLogTree: Generator<HypTreeParams> = {
  id: 'int-inv-hyp-tree',
  sample: (rng) =>
    drawUntil(
      () => ({ kind: rng.pick<'sinh' | 'cosh'>(['sinh', 'cosh']), t: rng.int(0, 7), s: rng.int(1, 3) }),
      ({ t, s }) => TRIPLES[t][2] * s <= 30,
      { kind: 'sinh', t: 0, s: 1 },
    ),
  render: ({ kind, t, s }): Slide => {
    const [p, q, r] = TRIPLES[t];
    // arsinh: x from 0 to ps over √(x² + (qs)²). arcosh: x from qs to rs over √(x² - (qs)²).
    const top = kind === 'sinh' ? frac(p, q) : frac(r, q);
    const root = kind === 'sinh' ? frac(r, q) : frac(p, q);
    const sum = frac(top.n * root.d + root.n * top.d, top.d * root.d);
    const value = kind === 'sinh' ? frac(p + r, q) : frac(r + p, q);
    const answer = [fracTex(top), fracTex(root), fracTex(sum), lnTex(value)];
    const a = q * s;
    const expression =
      kind === 'sinh'
        ? `\\int_{0}^{${p * s}} \\frac{dx}{\\sqrt{x^{2} + ${a * a}}}`
        : `\\int_{${a}}^{${r * s}} \\frac{dx}{\\sqrt{x^{2} - ${a * a}}}`;
    return {
      kind: 'tree',
      prompt: [
        prose(
          `This is $\\operatorname{ar${kind}} u$ at $u = ${fracTex(top)}$, and $\\operatorname{ar${kind}} u = \\ln\\left(u + \\sqrt{u^{2} ${kind === 'sinh' ? '+' : '-'} 1}\\right)$. Top row: $u$ and the root. Then their sum, then the value.`,
        ),
      ],
      expression,
      nodes: [
        { id: 'u', from: [] },
        { id: 'root', from: [] },
        { id: 'sum', from: ['u', 'root'] },
        { id: 'value', from: ['sum'] },
      ],
      bank: tokenBank(answer, [fracTex(frac(q, p)), fracTex(frac(q, r)), lnTex(frac(r, q)), lnTex(frac(p + q, q)), fracTex(frac(p + q, q))]),
      answer,
    };
  },
  solution: ({ kind, t, s }) => {
    const [p, q, r] = TRIPLES[t];
    const top = kind === 'sinh' ? frac(p, q) : frac(r, q);
    const root = kind === 'sinh' ? frac(r, q) : frac(p, q);
    return [
      { text: `The integral is $\\operatorname{ar${kind}}\\frac{x}{${q * s}}$ between the limits, and it is $0$ at the lower one, so $u = ${fracTex(top)}$.` },
      { tex: `\\sqrt{\\left(${fracTex(top)}\\right)^{2} ${kind === 'sinh' ? '+' : '-'} 1} = ${fracTex(root)}` },
      { tex: `\\ln\\left(${fracTex(top)} + ${fracTex(root)}\\right) = ${lnTex(frac(p + r, q))}` },
    ];
  },
};

/** This level's generators by name. */
export const inverseByName = {
  asinTyped,
  asinTiles,
  asinValue,
  atanTyped,
  atanValue,
  atanSteps,
  squareTiles,
  squareTyped,
  squareFlow,
  hypTree,
  hypIntegral,
  catenary,
  arsinhValue,
  whichForm,
  hypLogTree,
};

export const inverseIntegralGenerators = Object.values(inverseByName) as unknown as Generator<unknown>[];
