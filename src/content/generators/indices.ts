/**
 * Exponents and Radicals.
 *
 * Index laws first, with a variable base and whole-number powers; then roots
 * and fractional indices; then surds.
 *
 * One constraint shapes every generator here. The checker probes a real-domain
 * expression at points drawn from ±[0.35, 2.6], so roughly half of them are
 * negative, and it needs eight usable points out of twenty-four to reach a
 * verdict. An answer containing `sqrt(x)` is undefined at every negative point,
 * which leaves about twelve — close enough to the floor that a draw
 * occasionally falls under it and comes back `indeterminate`.
 *
 * So the split is deliberate: anything with a variable in it keeps whole-number
 * exponents, and every question about roots uses numeric bases, where the
 * expression is a constant and all twenty-four points are usable. It also
 * happens to be how the topic is taught.
 */
import type { Generator, KeypadKey } from '../types';
import { ALGEBRA_KEYS, termTex } from './calculus';
import type { Rng } from '../../engine/rng';

/** Index work needs the algebra keys plus a root. */
const SURD_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'sqrt(' }];

/** Numbers whose square root does not simplify, for the surd questions. */
const SURD_FREE: number[] = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Every whole-number root worth asking about, as `base = root^den`.
 *
 * Derived rather than listed because the variety floor needs a wide pool: a
 * lesson may ask this generator ten times and the re-draw that avoids a repeat
 * has to have somewhere to go. The per-root ceilings keep the base a number a
 * learner recognises — 400 is a reasonable square, 20736 is not.
 */
const ROOT_CEILING: Record<number, number> = { 2: 20, 3: 10, 4: 6, 5: 4, 6: 3 };

const ROOTS: { base: number; den: number; root: number }[] = Object.keys(ROOT_CEILING)
  .map(Number)
  .flatMap((den) =>
    Array.from({ length: ROOT_CEILING[den] - 1 }, (_, idx) => {
      const root = idx + 2;
      return { base: Math.pow(root, den), den, root };
    }),
  );

/** Bases and exponents giving a whole-number fractional-index answer. */
const FRACTIONAL: FractionalParams[] = ROOTS.flatMap(({ base, den, root }) =>
  [1, 2, 3]
    // Lowest terms only — otherwise the displayed fraction cancels and the
    // question asked is not the one intended. Capped so the answer stays a
    // number the learner can check rather than a curiosity.
    .filter((num) => gcd(num, den) === 1 && Math.pow(root, num) <= 1000)
    .map((num) => ({ base, num, den, root, value: Math.pow(root, num) })),
);

/** A power of x as it is written by hand: x, x^{5}, x^{-2}. */
function powerTex(n: number): string {
  if (n === 1) return 'x';
  return `x^{${n}}`;
}

/** The same power in a form mathjs parses without ambiguity. */
function powerAnswer(n: number): string {
  return `x^(${n})`;
}

/** A non-zero integer in a range, avoiding the degenerate x^0 cases. */
function nonZeroInt(rng: Rng, min: number, max: number): number {
  const n = rng.int(min, max);
  return n === 0 ? max : n;
}

/* ---------- Level 1: the index laws ---------- */

interface PairParams {
  a: number;
  b: number;
}

/** x^a times x^b: add the powers. */
const multiplyPowers: Generator<PairParams> = {
  id: 'idx-multiply',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 12 : 9),
    b: rng.int(2, difficulty > 1 ? 12 : 9),
  }),
  render: ({ a, b }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Write as a single power of $x$.' }],
    lead: `${powerTex(a)} \\times ${powerTex(b)} =`,
    keypad: ALGEBRA_KEYS,
    answer: powerAnswer(a + b),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b }) => [
    {
      text: `Multiplying powers of the same base adds the exponents, because $${powerTex(a)}$ is $a$ copies of $x$ and $${powerTex(b)}$ is $b$ more.`,
    },
    { tex: `${powerTex(a)} \\times ${powerTex(b)} = x^{${a} + ${b}} = ${powerTex(a + b)}` },
    {
      text: 'The base must be the same for this to work. $x^{3} \\times y^{4}$ does not combine at all.',
    },
  ],
};

/** x^a over x^b: subtract the powers. */
const dividePowers: Generator<PairParams> = {
  id: 'idx-divide',
  sample: (rng, difficulty) => {
    const b = rng.int(2, difficulty > 1 ? 9 : 7);
    // Difficulty 2 allows the result to go negative, which is the real test.
    const a = difficulty > 1 ? rng.int(2, 14) : b + rng.int(1, 7);
    return { a, b };
  },
  render: ({ a, b }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Write as a single power of $x$.' }],
    lead: `\\frac{${powerTex(a)}}{${powerTex(b)}} =`,
    keypad: ALGEBRA_KEYS,
    answer: a === b ? '1' : powerAnswer(a - b),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b }) => [
    { text: 'Dividing powers of the same base subtracts the exponents.' },
    { tex: `\\frac{${powerTex(a)}}{${powerTex(b)}} = x^{${a} - ${b}} = ${a === b ? '1' : powerTex(a - b)}` },
    {
      text:
        a - b < 0
          ? `A negative exponent is not an error — it means a reciprocal, so $${powerTex(a - b)}$ is $\\frac{1}{${powerTex(b - a)}}$.`
          : 'Subtract in the order written: top exponent minus bottom. Reversing it flips the sign of the answer.',
    },
  ],
};

/** (x^a)^b: multiply the powers. */
const powerOfPower: Generator<PairParams> = {
  id: 'idx-power-of-power',
  sample: (rng, difficulty) => ({
    a: nonZeroInt(rng, difficulty > 1 ? -6 : 2, difficulty > 1 ? 8 : 9),
    b: rng.int(2, difficulty > 1 ? 7 : 5),
  }),
  render: ({ a, b }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Write as a single power of $x$.' }],
    lead: `\\left(${powerTex(a)}\\right)^{${b}} =`,
    keypad: ALGEBRA_KEYS,
    answer: powerAnswer(a * b),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b }) => [
    {
      text: `Raising a power to a power multiplies the exponents: $${powerTex(a)}$ appears $${b}$ times, and each contributes $${a}$.`,
    },
    { tex: `\\left(${powerTex(a)}\\right)^{${b}} = x^{${a} \\times ${b}} = ${powerTex(a * b)}` },
    {
      text: `This is the law most often confused with the first one. Multiplying *powers* adds; a power *of* a power multiplies. $x^{2} \\times x^{3}$ is $x^{5}$, but $\\left(x^{2}\\right)^{3}$ is $x^{6}$.`,
    },
  ],
};

interface CoefficientParams {
  c: number;
  d: number;
  a: number;
  b: number;
}

/** Coefficients multiply while the powers add. */
const multiplyTerms: Generator<CoefficientParams> = {
  id: 'idx-multiply-terms',
  sample: (rng, difficulty) => ({
    c: rng.int(2, difficulty > 1 ? 9 : 6),
    d: rng.int(2, difficulty > 1 ? 9 : 6),
    a: rng.int(1, difficulty > 1 ? 8 : 5),
    b: rng.int(1, difficulty > 1 ? 8 : 5),
  }),
  render: ({ c, d, a, b }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Simplify.' }],
    lead: `${termTex(c, a)} \\times ${termTex(d, b)} =`,
    keypad: ALGEBRA_KEYS,
    answer: `(${c * d}) * x^(${a + b})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ c, d, a, b }) => [
    {
      text: 'The numbers and the powers are handled separately: multiply the coefficients, add the exponents.',
    },
    {
      tex: `${c} \\times ${d} = ${c * d} \\qquad x^{${a}} \\times x^{${b}} = x^{${a + b}}`,
    },
    { tex: `${termTex(c, a)} \\times ${termTex(d, b)} = ${termTex(c * d, a + b)}` },
    {
      text: `The coefficients are multiplied, not added. Writing $${c + d}$ instead of $${c * d}$ is the usual slip.`,
    },
  ],
};

/** A negative index means a reciprocal. */
const negativeIndex: Generator<{ a: number; c: number }> = {
  id: 'idx-negative',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 9 : 7),
    c: rng.int(1, difficulty > 1 ? 9 : 6),
  }),
  render: ({ a, c }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Rewrite without a negative index, as a fraction.' },
    ],
    lead: `${termTex(c, -a)} =`,
    keypad: ALGEBRA_KEYS,
    answer: `(${c}) / x^(${a})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, c }) => [
    {
      text: 'A negative exponent means one over the positive power. The sign of the exponent has nothing to do with the sign of the answer.',
    },
    { tex: `${termTex(c, -a)} = \\frac{${c}}{x^{${a}}}` },
    {
      text: `Note the coefficient stays on top. $${termTex(c, -a)}$ is $\\frac{${c}}{x^{${a}}}$, not $\\frac{1}{${c}x^{${a}}}$ — only the $x$ carried the negative index.`,
    },
  ],
};

/* ---------- Level 2: roots and fractional indices ---------- */

interface FractionalParams {
  base: number;
  num: number;
  den: number;
  /** The den-th root of base, so the solution need not recompute it. */
  root: number;
  value: number;
}

/**
 * Evaluating a fractional index.
 *
 * The answer is the number, not the expression rewritten: `base^(num/den)` is
 * numerically equal to the question, so a checker that probes values would
 * accept the question typed straight back.
 */
const fractionalIndex: Generator<FractionalParams> = {
  id: 'idx-fractional',
  sample: (rng, difficulty) => {
    const simple = FRACTIONAL.filter((f) => f.num === 1);
    return rng.pick(difficulty > 1 ? FRACTIONAL : simple);
  },
  render: ({ base, num, den, value }) => {
    const exponent = num === 1 ? `\\frac{1}{${den}}` : `\\frac{${num}}{${den}}`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Evaluate. The answer is a whole number.' }],
      lead: `${base}^{${exponent}} =`,
      keypad: [],
      answer: `${value}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ base, num, den, root, value }) => {
    const name = den === 2 ? 'square root' : den === 3 ? 'cube root' : `${den}th root`;
    return [
      {
        text: `The bottom of the fraction is a root and the top is a power. Take the ${name} first — the numbers stay small that way.`,
      },
      { tex: `\\sqrt[${den}]{${base}} = ${root}` },
      ...(num === 1 ? [] : [{ tex: `${root}^{${num}} = ${value}` } as const]),
      {
        text: `So the answer is $${value}$. Doing the power first gives the same result but a far larger intermediate number, which is why the root goes first by habit.`,
      },
    ];
  },
};

interface SurdParams {
  k: number;
  m: number;
}

/** Simplifying a surd by pulling out the largest square factor. */
const simplifySurd: Generator<SurdParams> = {
  id: 'rad-simplify',
  sample: (rng, difficulty) => ({
    k: rng.int(2, difficulty > 1 ? 9 : 6),
    m: rng.pick(difficulty > 1 ? SURD_FREE : SURD_FREE.slice(0, 8)),
  }),
  render: ({ k, m }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Simplify the surd.' }],
    lead: `\\sqrt{${k * k * m}} =`,
    keypad: SURD_KEYS,
    answer: `(${k}) * sqrt(${m})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ k, m }) => [
    {
      text: `Look for the largest square number that divides $${k * k * m}$. Here it is $${k * k}$.`,
    },
    {
      tex: `\\sqrt{${k * k * m}} = \\sqrt{${k * k}} \\times \\sqrt{${m}} = ${k}\\sqrt{${m}}`,
    },
    {
      text: `Only the square factor comes out, and it comes out as its root: $${k * k}$ becomes $${k}$, not $${k * k}$. What is left under the root, $${m}$, has no square factors, so it cannot be simplified further.`,
    },
  ],
};

/** Multiplying two surds and simplifying the result. */
const multiplySurds: Generator<{ a: number; b: number }> = {
  id: 'rad-multiply',
  sample: (rng, difficulty) => {
    const pool = difficulty > 1 ? [2, 3, 5, 6, 7, 8, 10, 12, 14, 15, 18, 20] : [2, 3, 5, 6, 7, 8];
    return { a: rng.pick(pool), b: rng.pick(pool) };
  },
  render: ({ a, b }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Simplify.' }],
    lead: `\\sqrt{${a}} \\times \\sqrt{${b}} =`,
    keypad: SURD_KEYS,
    answer: `sqrt(${a * b})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b }) => [
    { text: 'Roots multiply straight across: the product of the roots is the root of the product.' },
    { tex: `\\sqrt{${a}} \\times \\sqrt{${b}} = \\sqrt{${a} \\times ${b}} = \\sqrt{${a * b}}` },
    {
      text: 'This works for multiplication and division, and for nothing else. $\\sqrt{a} + \\sqrt{b}$ is emphatically not $\\sqrt{a + b}$ — try it with $9$ and $16$.',
    },
  ],
};

/* ---------- Level 3: working with surds ---------- */

interface SurdSumParams {
  p: number;
  q: number;
  m: number;
}

/** Surds with the same root add like terms. */
const addSurds: Generator<SurdSumParams> = {
  id: 'rad-add',
  sample: (rng, difficulty) => ({
    p: rng.int(2, difficulty > 1 ? 12 : 9),
    q: rng.int(2, difficulty > 1 ? 12 : 9),
    m: rng.pick(difficulty > 1 ? SURD_FREE : SURD_FREE.slice(0, 8)),
  }),
  render: ({ p, q, m }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Simplify.' }],
    lead: `${p}\\sqrt{${m}} + ${q}\\sqrt{${m}} =`,
    keypad: SURD_KEYS,
    answer: `(${p + q}) * sqrt(${m})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ p, q, m }) => [
    {
      text: `Treat $\\sqrt{${m}}$ as you would treat $x$: these are like terms, so add the coefficients and leave the root alone.`,
    },
    { tex: `${p}\\sqrt{${m}} + ${q}\\sqrt{${m}} = ${p + q}\\sqrt{${m}}` },
    {
      text: `The root does not change. Writing $\\sqrt{${2 * m}}$ would be adding the insides, which is the same error as claiming $x + x = x^{2}$.`,
    },
  ],
};

/**
 * Rationalising a denominator.
 *
 * A choice slide rather than a typed expression, and deliberately so: the
 * rationalised form is *equal* to the question, so a checker comparing values
 * cannot tell the two apart and would accept the question typed back
 * unchanged. The skill here is recognising the right written form, which is
 * exactly what a choice slide grades. The distractors are the three standard
 * slips — multiplying only the bottom, only the top, and multiplying
 * everything underneath.
 */
const rationalise: Generator<{ c: number; m: number }> = {
  id: 'rad-rationalise',
  // c starts at 2: with c = 1 the "flipped" distractor collapses onto the
  // correct answer and the slide would offer the right option twice.
  sample: (rng, difficulty) => ({
    c: rng.int(2, difficulty > 1 ? 12 : 9),
    m: rng.pick(difficulty > 1 ? SURD_FREE : SURD_FREE.slice(0, 8)),
  }),
  render: ({ c, m }) => {
    const options = [
      { id: 'rationalised', label: `\\frac{${c}\\sqrt{${m}}}{${m}}`, tex: true },
      { id: 'bottom-only', label: `\\frac{${c}}{${m}}`, tex: true },
      { id: 'top-only', label: `\\frac{${c}\\sqrt{${m}}}{\\sqrt{${m}}}`, tex: true },
      { id: 'all-under', label: `\\frac{\\sqrt{${m}}}{${c * m}}`, tex: true },
    ];
    // Rotated by the question's own numbers, so the answer is not always first
    // yet the same question always looks the same — a shuffle drawn from the
    // rng would make one question read as two to the deck de-duplicator.
    const turn = (c + m) % options.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which of these is $\\frac{${c}}{\\sqrt{${m}}}$ with a rational denominator?`,
        },
      ],
      options: [...options.slice(turn), ...options.slice(0, turn)],
      correctId: 'rationalised',
    };
  },
  solution: ({ c, m }) => [
    {
      text: 'Multiply top and bottom by the root. That is multiplying by one, so the value does not change — only how it is written.',
    },
    {
      tex: `\\frac{${c}}{\\sqrt{${m}}} \\times \\frac{\\sqrt{${m}}}{\\sqrt{${m}}} = \\frac{${c}\\sqrt{${m}}}{${m}}`,
    },
    {
      text: `The denominator becomes $${m}$ because $\\sqrt{${m}} \\times \\sqrt{${m}} = ${m}$ by definition. A whole number underneath is easier to work with and easier to compare, which is the whole reason for doing this.`,
    },
  ],
};

interface IndexEquationParams {
  base: number;
  power: number;
}

/**
 * Bases paired with every power whose value stays under a cap.
 *
 * Pairing this way rather than drawing base and power independently is what
 * keeps the right-hand side readable: 2^12 is fine to show, 12^8 is not, and a
 * single shared ceiling on the power would have to be set by the largest base.
 */
function equationPairs(bases: number[], cap: number): IndexEquationParams[] {
  return bases.flatMap((base) => {
    const out: IndexEquationParams[] = [];
    for (let power = 2; Math.pow(base, power) <= cap; power += 1) out.push({ base, power });
    return out;
  });
}

const EQUATION_EASY = equationPairs([2, 3, 4, 5, 6, 7, 10], 10_000);
const EQUATION_HARD = equationPairs([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 200_000);

/** Solving b^n = value by matching powers. */
const indexEquation: Generator<IndexEquationParams> = {
  id: 'idx-equation',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? EQUATION_HARD : EQUATION_EASY),
  render: ({ base, power }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Solve for $n$. Both sides can be written as powers of $${base}$.`,
      },
    ],
    lead: `${base}^{n} = ${Math.pow(base, power)} \\implies n =`,
    keypad: [],
    answer: `${power}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ base, power }) => [
    {
      text: `Write the right-hand side as a power of $${base}$ and the equation becomes a comparison of exponents.`,
    },
    { tex: `${base}^{n} = ${Math.pow(base, power)} = ${base}^{${power}}` },
    {
      text: `Since the bases match, the exponents must match, so $n = ${power}$. This trick only works when both sides share a base — when they do not, you need logarithms, which is the next course.`,
    },
  ],
};

export const indicesGenerators = [
  multiplyPowers,
  dividePowers,
  powerOfPower,
  multiplyTerms,
  negativeIndex,
  fractionalIndex,
  simplifySurd,
  multiplySurds,
  addSurds,
  rationalise,
  indexEquation,
] as unknown as Generator<unknown>[];
