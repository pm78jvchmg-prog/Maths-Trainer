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
import type { Generator, KeypadKey, Slide } from '../types';
import { bin, num, pow, root, valueOf, type Expr } from '../expr';
import { options } from '../choiceVariant';
import { plotSvg } from '../figures';
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
  // Multiplying the exponents instead of adding is the slip this asks about.
  choices: ({ a, b }) =>
    options(
      { tex: powerTex(a + b), answer: powerAnswer(a + b) },
      { tex: powerTex(a * b), answer: powerAnswer(a * b) },
      { tex: powerTex(a + b + 1), answer: powerAnswer(a + b + 1) },
      { tex: `${powerTex(a + b)}${powerTex(a + b)}`, answer: powerAnswer(2 * (a + b)) },
    ),
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
  choices: ({ a, b }) =>
    options(
      { tex: a === b ? '1' : powerTex(a - b), answer: a === b ? '1' : powerAnswer(a - b) },
      { tex: b === a ? '1' : powerTex(b - a), answer: b === a ? '1' : powerAnswer(b - a) },
      { tex: powerTex(a + b), answer: powerAnswer(a + b) },
      { tex: a * b === 0 ? '1' : powerTex(a * b), answer: powerAnswer(a * b) },
    ),
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
  choices: ({ a, b }) =>
    options(
      { tex: powerTex(a * b), answer: powerAnswer(a * b) },
      { tex: powerTex(a + b), answer: powerAnswer(a + b) },
      { tex: powerTex(a * b + 1), answer: powerAnswer(a * b + 1) },
      { tex: powerTex(Math.abs(a - b) || a * b + 2), answer: powerAnswer(Math.abs(a - b) || a * b + 2) },
    ),
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
  choices: ({ c, d, a, b }) =>
    options(
      { tex: termTex(c * d, a + b), answer: `(${c * d}) * x^(${a + b})` },
      { tex: termTex(c + d, a + b), answer: `(${c + d}) * x^(${a + b})` },
      { tex: termTex(c * d, a * b), answer: `(${c * d}) * x^(${a * b})` },
      { tex: termTex(c + d, a * b), answer: `(${c + d}) * x^(${a * b})` },
    ),
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
  // The "dragged the coefficient down with the x" slip is only a slip when
  // there is a coefficient: at c = 1 it *is* the right answer, so it is offered
  // only above 1. Forgetting the reciprocal altogether works at every c.
  choices: ({ a, c }) =>
    options(
      { tex: `\\frac{${c}}{x^{${a}}}`, answer: `(${c}) / x^(${a})` },
      { tex: termTex(c, a), answer: `(${c}) * x^(${a})` },
      { tex: `\\frac{${c}}{x^{${a + 1}}}`, answer: `(${c}) / x^(${a + 1})` },
      ...(c === 1
        ? [{ tex: `-\\frac{1}{x^{${a}}}`, answer: `-1 / x^(${a})` }]
        : [{ tex: `\\frac{1}{${c}x^{${a}}}`, answer: `1 / ((${c}) * x^(${a}))` }]),
    ),
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
  choices: ({ base, num, den, root, value }) =>
    options(
      { tex: `${value}`, answer: `${value}` },
      { tex: `${root}`, answer: `${root}` },
      { tex: `${base * num}`, answer: `${base * num}` },
      { tex: `${Math.round(base / den)}`, answer: `${Math.round(base / den)}` },
    ),
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
  choices: ({ k, m }) =>
    options(
      { tex: `${k}\\sqrt{${m}}`, answer: `(${k}) * sqrt(${m})` },
      { tex: `${k * k}\\sqrt{${m}}`, answer: `(${k * k}) * sqrt(${m})` },
      { tex: `${k}\\sqrt{${k * m}}`, answer: `(${k}) * sqrt(${k * m})` },
      { tex: `${m}\\sqrt{${k}}`, answer: `(${m}) * sqrt(${k})` },
    ),
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
  choices: ({ a, b }) =>
    options(
      { tex: `\\sqrt{${a * b}}`, answer: `sqrt(${a * b})` },
      { tex: `\\sqrt{${a + b}}`, answer: `sqrt(${a + b})` },
      { tex: `${a * b}`, answer: `${a * b}` },
      { tex: `2\\sqrt{${a * b}}`, answer: `2 * sqrt(${a * b})` },
    ),
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
  choices: ({ p, q, m }) =>
    options(
      { tex: `${p + q}\\sqrt{${m}}`, answer: `(${p + q}) * sqrt(${m})` },
      { tex: `${p + q}\\sqrt{${2 * m}}`, answer: `(${p + q}) * sqrt(${2 * m})` },
      { tex: `${p * q}\\sqrt{${m}}`, answer: `(${p * q}) * sqrt(${m})` },
      { tex: `\\sqrt{${m}}`, answer: `sqrt(${m})` },
    ),
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
  choices: ({ base, power }) =>
    options(
      { tex: `${power}`, answer: `${power}` },
      { tex: `${Math.pow(base, power)}`, answer: `${Math.pow(base, power)}` },
      { tex: `${power + 1}`, answer: `${power + 1}` },
      { tex: `${base * power}`, answer: `${base * power}` },
    ),
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

/**
 * A fractional index as it is written inside an exponent.
 *
 * The sign sits outside the fraction — `-\frac{3}{2}`, never `\frac{-3}{2}` —
 * and a fraction that is really a whole number is written as one.
 */
function fracIndexTex(n: number, d: number): string {
  const { n: num, d: den } = reduceFraction(n, d);
  if (den === 1) return `${num}`;
  return `${num < 0 ? '-' : ''}\\frac{${Math.abs(num)}}{${den}}`;
}

/** A fraction in lowest terms, with the sign carried by the numerator. */
function reduceFraction(num: number, den: number): { n: number; d: number } {
  const sign = den < 0 ? -1 : 1;
  const g = gcd(Math.abs(num), Math.abs(den)) || 1;
  return { n: (sign * num) / g, d: (sign * den) / g };
}

/* ---------- Level 2: index form ---------- */

interface IndexFormParams {
  /** Numerator of the index — the power under (or over) the root. */
  p: number;
  /** Denominator of the index — which root it is. */
  q: number;
  /** Which of the three ways the same index gets written. */
  form: 0 | 1 | 2;
}

/**
 * Indices in lowest terms, so the fraction the learner writes is the fraction
 * the question shows. `p/q` cancelling to a whole number would make the answer
 * `x^{2}` for a question that looks like it wants a fraction.
 */
function indexPairs(maxQ: number, maxP: number): { p: number; q: number }[] {
  const out: { p: number; q: number }[] = [];
  for (let q = 2; q <= maxQ; q += 1) {
    for (let p = 1; p <= maxP; p += 1) {
      if (gcd(p, q) === 1) out.push({ p, q });
    }
  }
  return out;
}

const INDEX_EASY = indexPairs(3, 9);
const INDEX_HARD = indexPairs(5, 9);

/**
 * The radical the question shows, in each of the three forms.
 *
 * `x^{1}` is written as `x`, because a power of one under a root reads as a
 * typo rather than as part of the question.
 */
function radicalTex(p: number, q: number, form: number): string {
  const inner = p === 1 ? 'x' : `x^{${p}}`;
  const root = q === 2 ? `\\sqrt{${inner}}` : `\\sqrt[${q}]{${inner}}`;
  if (form === 0) return root;
  if (form === 1) return `\\frac{1}{${root}}`;
  const bare = q === 2 ? '\\sqrt{x}' : `\\sqrt[${q}]{x}`;
  return `\\left(${bare}\\right)^{${p}}`;
}

/**
 * Writing a root as a fractional index.
 *
 * Two things make this question possible, and both are recent.
 *
 * The answer is `x^{p/q}`, which needs a fraction *inside an exponent* — typed
 * flat as `x^1/2` that parses as `(x^1)/2`, so before the answer editor there
 * was no way for a learner to write it at all.
 *
 * And it grades over `positive`. The identity is the textbook one, true for
 * x ≥ 0, but mathjs reads both sides through the principal branch and they
 * disagree at negative x for three powers in every four — probing the whole
 * real line would mark a correct answer wrong for `\sqrt{x^3}` and accept it
 * for `\sqrt{x^5}`, which is worse than not asking.
 *
 * The keypad withholds the root key, which is what stops the question being its
 * own answer: the two sides are equal in value, so a checker that probes values
 * would accept `\sqrt{x^3}` typed straight back. It cannot be typed. This is
 * the same reason `idx-fractional` leaves the keypad bare, and the reason
 * `rad-rationalise` is a choice question rather than this one's sibling —
 * writing its answer needs the root key, and so does writing its question.
 */
const indexForm: Generator<IndexFormParams> = {
  id: 'idx-index-form',
  choices: ({ p, q, form }) => {
    const sign = form === 1 ? -1 : 1;
    return options(
      { tex: `x^{${fracIndexTex(sign * p, q)}}`, answer: `x^((${sign * p})/(${q}))` },
      { tex: `x^{${fracIndexTex(sign * q, p)}}`, answer: `x^((${sign * q})/(${p}))` },
      { tex: `x^{${sign * p * q}}`, answer: `x^(${sign * p * q})` },
      { tex: `x^{${fracIndexTex(-sign * p, q)}}`, answer: `x^((${-sign * p})/(${q}))` },
    );
  },
  sample: (rng, difficulty) => {
    const { p, q } = rng.pick(difficulty > 1 ? INDEX_HARD : INDEX_EASY);
    // Form 2 raises the root to the power, and a power of one makes it the same
    // question as form 0 written more elaborately.
    return { p, q, form: rng.int(0, p === 1 ? 1 : 2) as 0 | 1 | 2 };
  },
  render: ({ p, q, form }) => {
    const sign = form === 1 ? -1 : 1;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Write this as a single power of $x$. Use a fractional index.' },
      ],
      lead: `${radicalTex(p, q, form)} =`,
      // No root key: the answer is equal in value to the question, so a learner
      // able to type the question back would be marked correct for copying it.
      keypad: ALGEBRA_KEYS,
      answer: `x^((${sign * p})/(${q}))`,
      // Fractional indices are defined for a positive base; see samplePoint.
      domain: 'positive',
      mode: 'exact',
    };
  },
  solution: ({ p, q, form }) => {
    const name = q === 2 ? 'square root' : q === 3 ? 'cube root' : `${q}th root`;
    const base = [
      {
        text: `The root tells you the bottom of the index and the power tells you the top. A ${name} is an index of $\\frac{1}{${q}}$.`,
      },
      { tex: `\\sqrt[${q}]{x} = x^{\\frac{1}{${q}}}` },
    ];
    if (form === 1) {
      return [
        ...base,
        { tex: `${radicalTex(p, q, 0)} = x^{\\frac{${p}}{${q}}}` },
        {
          text: 'One over a power is the same power with a negative index, so the fraction keeps its size and changes sign.',
        },
        { tex: `\\frac{1}{x^{\\frac{${p}}{${q}}}} = x^{-\\frac{${p}}{${q}}}` },
      ];
    }
    if (form === 2) {
      return [
        ...base,
        {
          text: `Raising that to a power multiplies the indices, which is the same $\\frac{${p}}{${q}}$ you get by putting the power under the root first.`,
        },
        { tex: `\\left(x^{\\frac{1}{${q}}}\\right)^{${p}} = x^{\\frac{${p}}{${q}}}` },
        {
          text: 'Root first or power first gives the same answer. Root first keeps the numbers smaller, which is why it is the usual habit.',
        },
      ];
    }
    return [
      ...base,
      { tex: `${radicalTex(p, q, 0)} = x^{\\frac{${p}}{${q}}}` },
      {
        text: `The $${p}$ is the power inside the root, so it goes on top; the $${q}$ says which root, so it goes underneath. Swapping them is the slip to watch for.`,
      },
    ];
  },
};


/* ---------- evaluating an expression in the right order ---------- */

interface EvaluateParams {
  /** The power term: base^exponent. */
  base: number;
  exponent: number;
  /** The bracket: left - right, then squared. */
  left: number;
  right: number;
  /** The number under the root; a perfect square. */
  radicand: number;
}

/**
 * Evaluate an expression, choosing the order as well as the arithmetic.
 *
 * The shape is fixed — a power, a squared bracket, and a root, joined by a plus
 * and a times — because what varies has to be the *numbers*, not the reasoning.
 * Every draw asks the same four questions in whatever order the learner picks:
 * which pieces are ready to go, what each comes to, and at the end, that the
 * multiplication is taken before the addition.
 *
 * `banks` is keyed by node path, which stays fixed as the tree collapses. Every
 * node gets one, including the two operators a learner may take too early: the
 * value offered there is what that sub-expression is genuinely worth, so a
 * wrong turn produces a believable line rather than an obviously rejected one.
 */
const evaluateInOrder: Generator<EvaluateParams> = {
  id: 'idx-evaluate-order',
  /**
   * The same expression with no working at all: four options, worked out in
   * the head. Much harder than the reduction, and harder in the right way —
   * the distractors are the answers the three plausible wrong orders give, so
   * arriving at one of them feels like success right up to the moment it is
   * marked wrong.
   */
  choices: ({ base, exponent, left, right, radicand }) => {
    const power = Math.pow(base, exponent);
    const squared = (left - right) * (left - right);
    const rooted = Math.sqrt(radicand);
    const correct = power + squared * rooted;

    // The three wrong orders worth offering, then anything near enough to be
    // worth a second look. Two of these coincide for some draws — and options
    // that collide are dropped, so without padding a question could end up
    // offering two numbers.
    const wrong = [
      (power + squared) * rooted, // addition taken before the multiplication
      power + (left * left - right * right) * rooted, // squares subtracted, not the bracket
      power + squared * radicand, // the root left unrooted
      power * squared * rooted, // the plus read as a times
      correct - power,
      correct + power,
    ];

    const seen = new Set([correct]);
    const picked: number[] = [];
    for (const value of wrong) {
      if (picked.length === 3) break;
      if (!Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
      seen.add(value);
      picked.push(value);
    }
    for (let step = 1; picked.length < 3; step += 1) {
      for (const candidate of [correct + step, correct - step]) {
        if (picked.length === 3) break;
        if (candidate <= 0 || seen.has(candidate)) continue;
        seen.add(candidate);
        picked.push(candidate);
      }
    }

    return options(
      { tex: `${correct}` },
      ...picked.sort((a, b) => a - b).map((value) => ({ tex: `${value}` })),
    );
  },
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 5 : 3);
    const exponent = rng.int(2, base > 3 ? 2 : 3);
    // The bracket squares, so keep its difference small or the line grows huge.
    const right = rng.int(1, difficulty > 1 ? 6 : 4);
    return {
      base,
      exponent,
      left: right + rng.int(1, difficulty > 1 ? 4 : 3),
      right,
      radicand: rng.pick(difficulty > 1 ? [4, 9, 16, 25, 36, 49] : [4, 9, 16, 25]),
    };
  },
  render: ({ base, exponent, left, right, radicand }): Slide => {
    const expr = bin(
      '+',
      pow(num(base), num(exponent)),
      bin('*', pow(bin('-', num(left), num(right)), num(2)), root(num(radicand))),
    );

    const power = Math.pow(base, exponent);
    const gap = left - right;
    const squared = gap * gap;
    const rooted = Math.sqrt(radicand);
    const product = squared * rooted;
    const total = power + product;

    /** Six values: the right one, then the slips these numbers invite. */
    const offer = (correct: number, ...near: number[]) => {
      const seen = new Set<number>([correct]);
      const out = [correct];
      for (const value of near) {
        if (value === correct || seen.has(value) || !Number.isFinite(value)) continue;
        seen.add(value);
        out.push(value);
      }
      // Pad from just above the answer rather than at random, so a learner
      // cannot find the right one by noticing it is the odd number out.
      for (let step = 1; out.length < 6; step += 1) {
        for (const candidate of [correct + step, correct - step]) {
          if (out.length >= 6) break;
          if (candidate <= 0 || seen.has(candidate)) continue;
          seen.add(candidate);
          out.push(candidate);
        }
      }
      return out.sort((a, b) => a - b).map(String);
    };

    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'Work this out one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
      ],
      expr,
      banks: {
        // The power: multiplying the two numbers instead of raising is the slip.
        'r.l': offer(power, base * exponent, base + exponent, exponent),
        // The bracket, and adding instead of subtracting.
        'r.r.l.b': offer(gap, left + right, right - left, left * right),
        // The square, and doubling instead.
        'r.r.l': offer(squared, gap * 2, gap, squared + gap),
        // The root: giving the number back unrooted, or halving it, are the
        // two slips — but half of an odd square is not a whole number, and a
        // fraction in the bank turns this into a question about fractions.
        'r.r.r': offer(rooted, radicand, rooted * 2, radicand - rooted),
        // The multiplication, which is the one that must come before the plus.
        'r.r': offer(product, squared + rooted, product + power),
        // The addition, last.
        r: offer(total, power * product, total - power),
      },
    };
  },
  solution: ({ base, exponent, left, right, radicand }) => {
    const power = Math.pow(base, exponent);
    const gap = left - right;
    const squared = gap * gap;
    const rooted = Math.sqrt(radicand);
    const product = squared * rooted;
    const total = power + product;

    return [
      {
        text: 'Brackets first, then powers and roots, then multiplication, and addition last. Within that, anything already sitting on plain numbers can go in any order — there is no single correct route, only routes that respect precedence.',
      },
      {
        tex: `${base}^{${exponent}} = ${power} \\qquad \\left(${left} - ${right}\\right)^{2} = ${squared} \\qquad \\sqrt{${radicand}} = ${rooted}`,
      },
      { tex: `${power} + ${squared} \\times ${rooted} = ${power} + ${product} = ${total}` },
      {
        text: `The last two steps are where order decides the answer. Taking the addition first would give $${(power + squared) * rooted}$ rather than $${total}$, and every individual sum along the way would have been right.`,
      },
    ];
  },
};


interface SurdEvalParams {
  /** sqrt(a^2 x b) — a perfect square times something that also roots whole. */
  a: number;
  b: number;
  /** The power term added on. */
  base: number;
  exponent: number;
  /** The cube root taken away. */
  cube: number;
}

/**
 * A second shape, with a root over a product and a cube root.
 *
 * The first shape puts its difficulty in the ordering. This one puts it in the
 * roots: `\sqrt{3^2 \times 4}` has to be worked from the inside out, and a cube
 * root sits where a learner's hand reaches for a square one. Same widget, same
 * two forms — walked through a piece at a time, or held in the head.
 */
const evaluateWithRoots: Generator<SurdEvalParams> = {
  id: 'idx-evaluate-roots',
  choices: ({ a, b, base, exponent, cube }) => {
    const rooted = a * Math.round(Math.sqrt(b));
    const power = Math.pow(base, exponent);
    const cubed = Math.round(Math.cbrt(cube));
    const correct = rooted + power - cubed;

    const wrong = [
      a * a * b + power - cubed, // the root ignored altogether
      rooted + base * exponent - cubed, // the power multiplied instead
      rooted + power - cube, // the cube root ignored
      rooted + power + cubed, // the sign of the last term
    ];
    const seen = new Set([correct]);
    const picked: number[] = [];
    for (const value of wrong) {
      if (picked.length === 3) break;
      if (!Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
      seen.add(value);
      picked.push(value);
    }
    for (let step = 1; picked.length < 3; step += 1) {
      for (const candidate of [correct + step, correct - step]) {
        if (picked.length === 3) break;
        if (candidate <= 0 || seen.has(candidate)) continue;
        seen.add(candidate);
        picked.push(candidate);
      }
    }
    return options(
      { tex: `${correct}` },
      ...picked.sort((x, y) => x - y).map((value) => ({ tex: `${value}` })),
    );
  },
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 6 : 4),
    // b is itself a square, so the whole root comes out whole.
    b: rng.pick(difficulty > 1 ? [4, 9, 16, 25] : [4, 9, 16]),
    base: rng.int(2, 3),
    exponent: 2,
    cube: rng.pick(difficulty > 1 ? [8, 27, 64, 125] : [8, 27]),
  }),
  render: ({ a, b, base, exponent, cube }): Slide => {
    const expr = bin(
      '-',
      bin('+', root(bin('*', pow(num(a), num(2)), num(b))), pow(num(base), num(exponent))),
      root(num(cube), 3),
    );

    const inner = a * a * b;
    const rooted = a * Math.round(Math.sqrt(b));
    const power = Math.pow(base, exponent);
    const cubed = Math.round(Math.cbrt(cube));
    const sum = rooted + power;

    const offer = (correct: number, ...near: number[]) => {
      const seen = new Set([correct]);
      const out = [correct];
      for (const value of near) {
        if (out.length >= 6) break;
        if (!Number.isInteger(value) || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
      }
      for (let step = 1; out.length < 6; step += 1) {
        for (const candidate of [correct + step, correct - step]) {
          if (out.length >= 6) break;
          if (candidate <= 0 || seen.has(candidate)) continue;
          seen.add(candidate);
          out.push(candidate);
        }
      }
      return out.sort((x, y) => x - y).map(String);
    };

    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'Work this out one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
      ],
      expr,
      banks: {
        // a^2, inside the root.
        'r.l.l.a.l': offer(a * a, a * 2, a + 2),
        // The product under the root.
        'r.l.l.a': offer(inner, a * a + b, a * b),
        // The root itself.
        'r.l.l': offer(rooted, inner, rooted * 2),
        // The power term.
        'r.l.r': offer(power, base * exponent, base + exponent),
        // The addition.
        'r.l': offer(sum, rooted * power, Math.abs(rooted - power)),
        // The cube root, where reaching for a square root is the slip.
        'r.r': offer(cubed, cube, Math.round(Math.sqrt(cube))),
        // The subtraction, last.
        r: offer(sum - cubed, sum + cubed, cubed - sum),
      },
    };
  },
  solution: ({ a, b, base, exponent, cube }) => {
    const inner = a * a * b;
    const rooted = a * Math.round(Math.sqrt(b));
    const power = Math.pow(base, exponent);
    const cubed = Math.round(Math.cbrt(cube));
    return [
      {
        text: 'A root is a bracket: everything underneath it has to be settled before the root itself can be taken.',
      },
      { tex: `\\sqrt{${a}^{2} \\times ${b}} = \\sqrt{${inner}} = ${rooted}` },
      {
        text: `The small ${3} on the last root makes it a cube root, not a square one. $\\sqrt[3]{${cube}} = ${cubed}$, because $${cubed}^{3} = ${cube}$.`,
      },
      { tex: `${rooted} + ${power} - ${cubed} = ${rooted + power - cubed}` },
    ];
  },
};


interface LawEvalParams {
  base: number;
  /** First index. */
  m: number;
  /** Second index, or the outer power. */
  n: number;
  /** The loose number added or taken away. */
  k: number;
  /** Which index law the line is built around. */
  shape: 'power-of-power' | 'coefficient' | 'divide' | 'multiply';
}

/**
 * Evaluate a line built around one index law.
 *
 * `idx-evaluate-order` asks about precedence with a fixed shape. This asks the
 * same *kind* of question — tap a piece, choose its value — but the shape
 * follows whichever law the lesson has just taught, so the reduction is
 * practice of that law rather than of arithmetic in general.
 *
 * Four shapes, one per lesson that wants one. Each keeps every intermediate
 * value whole: the division has its indices ordered so the quotient is a whole
 * power, and nothing here produces a negative index, because `2^{-3}` is an
 * eighth and a bank of eighths is a question about fractions.
 */
const lawBase: Omit<Generator<LawEvalParams>, 'id' | 'sample'> = {
  choices: ({ base, m, n, k, shape }) => {
    const correct = lawValue(base, m, n, k, shape);
    const wrong = lawSlips(base, m, n, k, shape);
    const seen = new Set([correct]);
    const picked: number[] = [];
    for (const value of wrong) {
      if (picked.length === 3) break;
      if (!Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
      seen.add(value);
      picked.push(value);
    }
    for (let step = 1; picked.length < 3; step += 1) {
      for (const candidate of [correct + step, correct - step]) {
        if (picked.length === 3) break;
        if (candidate <= 0 || seen.has(candidate)) continue;
        seen.add(candidate);
        picked.push(candidate);
      }
    }
    return options(
      { tex: `${correct}` },
      ...picked.sort((x, y) => x - y).map((value) => ({ tex: `${value}` })),
    );
  },
  render: (params): Slide => {
    const { base, m, n, k, shape } = params;
    const expr = lawExpr(base, m, n, k, shape);

    const offer = (correct: number, ...near: number[]) => {
      const seen = new Set([correct]);
      const out = [correct];
      for (const value of near) {
        if (out.length >= 6) break;
        if (!Number.isInteger(value) || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
      }
      for (let step = 1; out.length < 6; step += 1) {
        for (const candidate of [correct + step, correct - step]) {
          if (out.length >= 6) break;
          if (candidate <= 0 || seen.has(candidate)) continue;
          seen.add(candidate);
          out.push(candidate);
        }
      }
      return out.sort((x, y) => x - y).map(String);
    };

    const banks: Record<string, string[]> = {};
    const fill = (path: string, node: Expr, ...near: number[]) => {
      banks[path] = offer(valueOf(node), ...near);
    };

    // Every node gets a bank, keyed by the path it sits at in this shape.
    const walk = (node: Expr, path: string): void => {
      if (node.kind === 'num') return;
      if (node.kind === 'binary') {
        walk(node.left, `${path}.l`);
        walk(node.right, `${path}.r`);
        const l = valueOf(node.left);
        const r = valueOf(node.right);
        fill(path, node, l + r, l - r, l * r, Math.abs(l - r));
        return;
      }
      if (node.kind === 'power') {
        walk(node.base, `${path}.b`);
        walk(node.exponent, `${path}.e`);
        const b = valueOf(node.base);
        const e = valueOf(node.exponent);
        // Multiplying instead of raising is the slip that never goes away.
        fill(path, node, b * e, b + e, b);
        return;
      }
      walk(node.arg, `${path}.a`);
      fill(path, node, valueOf(node.arg));
    };
    walk(expr, 'r');

    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'Work this out one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
      ],
      expr,
      banks,
    };
  },
  solution: ({ base, m, n, k, shape }) => {
    const total = lawValue(base, m, n, k, shape);
    if (shape === 'power-of-power') {
      return [
        { text: 'A power raised to a power multiplies the indices. Work the inside out first and the line becomes arithmetic.' },
        { tex: `\\left(${base}^{${m}}\\right)^{${n}} = ${base}^{${m * n}} = ${Math.pow(base, m * n)}` },
        { tex: `${Math.pow(base, m * n)} - ${k} = ${total}` },
      ];
    }
    if (shape === 'divide') {
      return [
        { text: 'Dividing powers of the same base subtracts the indices, and the subtraction of the loose number waits until that is done.' },
        { tex: `${base}^{${m}} \\div ${base}^{${n}} = ${base}^{${m - n}} = ${Math.pow(base, m - n)}` },
        { tex: `${Math.pow(base, m - n)} + ${k} = ${total}` },
      ];
    }
    if (shape === 'coefficient') {
      return [
        { text: 'The index belongs to the base alone, never to the number in front of it. Take the power first, then multiply.' },
        { tex: `${k} \\times ${base}^{${m}} = ${k} \\times ${Math.pow(base, m)} = ${k * Math.pow(base, m)}` },
        { text: `Multiplying first would give $${Math.pow(k * base, m)}$, which is a different number entirely.` },
      ];
    }
    return [
      { text: 'Multiplying powers of the same base adds the indices, and that has to happen before anything is added on the end.' },
      { tex: `${base}^{${m}} \\times ${base}^{${n}} = ${base}^{${m + n}} = ${Math.pow(base, m + n)}` },
      { tex: `${Math.pow(base, m + n)} + ${k} = ${total}` },
    ];
  },
};

/** The tree for each shape, so render and the value agree by construction. */
function lawExpr(base: number, m: number, n: number, k: number, shape: LawEvalParams['shape']): Expr {
  if (shape === 'power-of-power') {
    return bin('-', pow(pow(num(base), num(m)), num(n)), num(k));
  }
  if (shape === 'divide') {
    return bin('+', bin('/', pow(num(base), num(m)), pow(num(base), num(n))), num(k));
  }
  if (shape === 'coefficient') {
    return bin('*', num(k), pow(num(base), num(m)));
  }
  return bin('+', bin('*', pow(num(base), num(m)), pow(num(base), num(n))), num(k));
}

function lawValue(base: number, m: number, n: number, k: number, shape: LawEvalParams['shape']): number {
  return valueOf(lawExpr(base, m, n, k, shape));
}

/** The numbers the usual mistakes produce, offered alongside the answer. */
function lawSlips(base: number, m: number, n: number, k: number, shape: LawEvalParams['shape']): number[] {
  if (shape === 'power-of-power') {
    return [Math.pow(base, m + n) - k, Math.pow(base, m * n) + k, Math.pow(base, m) * n - k];
  }
  if (shape === 'divide') {
    return [Math.pow(base, m / n) + k, Math.pow(base, m - n) - k, Math.pow(base, m) - Math.pow(base, n) + k];
  }
  if (shape === 'coefficient') {
    return [Math.pow(k * base, m), k * base * m, Math.pow(base, m) + k];
  }
  return [Math.pow(base, m * n) + k, Math.pow(base, m + n) - k, Math.pow(base, m) + Math.pow(base, n) + k];
}


/** Numbers for one shape, chosen so every intermediate value stays whole. */
function sampleLaw(rng: Rng, difficulty: number, shape: LawEvalParams['shape']): LawEvalParams {
  const base = rng.int(2, difficulty > 1 ? 5 : 3);
  if (shape === 'divide') {
    // The larger index first, so the quotient is a whole power.
    const n = rng.int(1, 3);
    return { base, m: n + rng.int(1, difficulty > 1 ? 4 : 3), n, k: rng.int(2, 9), shape };
  }
  if (shape === 'power-of-power') {
    // The product of the two indices is what gets raised, so keep it small.
    return { base: rng.int(2, 3), m: rng.int(2, 3), n: 2, k: rng.int(2, 9), shape };
  }
  return {
    base,
    m: rng.int(2, difficulty > 1 ? 5 : 4),
    n: rng.int(2, difficulty > 1 ? 4 : 3),
    k: rng.int(2, difficulty > 1 ? 12 : 9),
    shape,
  };
}

/**
 * One generator per law, sharing everything but the shape.
 *
 * A lesson asks for the law it has just taught, so the line a learner reduces
 * is built on that law rather than on whichever of the four a draw happened to
 * land on. Everything else — the banks, the distractors, the worked solution —
 * already branches on `shape`, so there is nothing to duplicate.
 */
const lawReduction = (shape: LawEvalParams['shape'], id: string): Generator<LawEvalParams> => ({
  ...lawBase,
  id,
  sample: (rng, difficulty) => sampleLaw(rng, difficulty, shape),
});

const evaluateMultiplyLaw = lawReduction('multiply', 'idx-evaluate-multiply');
const evaluateDivideLaw = lawReduction('divide', 'idx-evaluate-divide');
const evaluatePowerLaw = lawReduction('power-of-power', 'idx-evaluate-power');
const evaluateCoefficientLaw = lawReduction('coefficient', 'idx-evaluate-coefficient');

/* ---------- Shapes beyond typing and picking ---------- */

/**
 * A tiles bank: the answer's tokens, plus distractors that are not among them.
 *
 * Sorted rather than shuffled, for the reason `choiceVariant` rotates instead
 * of drawing from the rng — one question has to render one way, or the deck
 * de-duplicator sees two questions where the learner sees one.
 */
function fillBank(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  const extras = [...new Set(distractors)].filter((token) => !needed.has(token));
  return [...answer, ...extras].sort();
}

/**
 * An index law, filled in rather than typed.
 *
 * Two blanks, and they are deliberately different in kind: the first is the
 * law *applied* — the indices brought together but not worked out — and the
 * second is that arithmetic done. Typing the final power asks only for the
 * answer, and a learner who multiplies the indices instead of adding them
 * writes something that looks just as finished. Placing $x^{5 + 3}$ first
 * makes the step being taught the thing that gets graded.
 *
 * The blanks sit in the template while the question itself sits in the prompt,
 * which is the convention every tiles generator here follows and is not only
 * taste: the widget splits its template on `{0}`, `{1}`, … so any brace round
 * a bare number — `x^{5}`, `\\sqrt{9}`, `\\frac{2}{3}` — would be read as a
 * blank marker and tear the TeX in half.
 */
interface LawFillParams {
  a: number;
  b: number;
  /** Coefficients, read only by the `coefficient` shape. */
  p: number;
  q: number;
  shape: 'multiply' | 'divide' | 'power' | 'coefficient' | 'negative';
}

/** The expression the question is about, as the learner reads it. */
function lawFillSubject({ a, b, p, q, shape }: LawFillParams): string {
  if (shape === 'divide') return `\\frac{x^{${a}}}{x^{${b}}}`;
  if (shape === 'power') return `\\left(x^{${a}}\\right)^{${b}}`;
  if (shape === 'coefficient') return `${p}x^{${a}} \\times ${q}x^{${b}}`;
  if (shape === 'negative') return `\\frac{1}{x^{${a}}} \\times \\frac{1}{x^{${b}}}`;
  return `x^{${a}} \\times x^{${b}}`;
}

/** The law applied, with the arithmetic still to do. */
function lawFillWorking({ a, b, p, q, shape }: LawFillParams): string {
  if (shape === 'divide') return `x^{${a} - ${b}}`;
  if (shape === 'power') return `x^{${a} \\times ${b}}`;
  if (shape === 'coefficient') return `(${p} \\times ${q})x^{${a} + ${b}}`;
  if (shape === 'negative') return `x^{-${a}} \\times x^{-${b}}`;
  return `x^{${a} + ${b}}`;
}

/** The same thing finished. */
function lawFillResult({ a, b, p, q, shape }: LawFillParams): string {
  if (shape === 'divide') return `x^{${a - b}}`;
  if (shape === 'power') return `x^{${a * b}}`;
  if (shape === 'coefficient') return `${p * q}x^{${a + b}}`;
  if (shape === 'negative') return `x^{-${a + b}}`;
  return `x^{${a + b}}`;
}

/**
 * The wrong tiles, which are the standard slips written out.
 *
 * Some of them coincide with the answer for particular numbers — $2 \\times 2$
 * and $2 + 2$ are the same four — and `fillBank` drops those rather than
 * adjusting them, so a bank is occasionally one tile shorter and never offers
 * the right answer twice.
 */
function lawFillDistractors({ a, b, p, q, shape }: LawFillParams): string[] {
  if (shape === 'divide') {
    return [`x^{${b} - ${a}}`, `x^{${b - a}}`, `x^{${a} + ${b}}`, `x^{${a + b}}`];
  }
  if (shape === 'power') {
    return [`x^{${a} + ${b}}`, `x^{${a + b}}`, `x^{${a}}`, `x^{${b}}`];
  }
  if (shape === 'coefficient') {
    return [
      `(${p} + ${q})x^{${a} \\times ${b}}`,
      `${p + q}x^{${a * b}}`,
      `${p * q}x^{${a * b}}`,
      `${p + q}x^{${a + b}}`,
    ];
  }
  if (shape === 'negative') {
    return [`x^{${a}} \\times x^{${b}}`, `x^{${a + b}}`, `x^{-${a * b}}`, `x^{-${a}} + x^{-${b}}`];
  }
  return [`x^{${a} \\times ${b}}`, `x^{${a * b}}`, `x^{${a} - ${b}}`, `x^{${a}}`];
}

/** What the first blank is asking for, said in words above the question. */
const LAW_FILL_PROMPT: Record<LawFillParams['shape'], string> = {
  multiply: 'Fill the first gap with the indices brought together, and the second with that worked out.',
  divide: 'Fill the first gap with the indices brought together, and the second with that worked out.',
  power: 'Fill the first gap with the indices brought together, and the second with that worked out.',
  coefficient:
    'The numbers in front multiply; the indices add. Fill the first gap with that written out, and the second with it worked out.',
  negative:
    'Rewrite each fraction with a negative index in the first gap, then combine them in the second.',
};

function lawFillSolution(params: LawFillParams): { text?: string; tex?: string }[] {
  const { a, b, p, q, shape } = params;
  const subject = lawFillSubject(params);
  const working = lawFillWorking(params);
  const result = lawFillResult(params);
  if (shape === 'divide') {
    return [
      { text: `Dividing powers of the same base subtracts the indices, top one first: $${a} - ${b}$.` },
      { tex: `${subject} = ${working} = ${result}` },
      {
        text: `Taking them the other way round would give $x^{${b - a}}$, which is the reciprocal of the right answer rather than a near miss.`,
      },
    ];
  }
  if (shape === 'power') {
    return [
      {
        text: `The bracket is $${a}$ copies of $x$, and there are $${b}$ of those brackets — so $${a} \\times ${b} = ${a * b}$ copies in all.`,
      },
      { tex: `${subject} = ${working} = ${result}` },
      {
        text: `Adding would give $x^{${a + b}}$. That is the law for a *product* of powers, and this is a power *of* a power.`,
      },
    ];
  }
  if (shape === 'coefficient') {
    return [
      {
        text: `The index belongs to the $x$ alone, so the numbers in front are simply multiplied: $${p} \\times ${q} = ${p * q}$.`,
      },
      { tex: `${subject} = ${working} = ${result}` },
      {
        text: `The indices still add, giving $x^{${a + b}}$. Multiplying them instead would give $x^{${a * b}}$, which is the slip worth watching for once there are two things to do at once.`,
      },
    ];
  }
  if (shape === 'negative') {
    return [
      {
        text: `A reciprocal is a negative index, so $\\frac{1}{x^{${a}}}$ is $x^{-${a}}$ and $\\frac{1}{x^{${b}}}$ is $x^{-${b}}$.`,
      },
      { tex: `${subject} = ${working} = ${result}` },
      {
        text: `Once both are powers of $x$ the ordinary law applies: $-${a} + (-${b}) = -${a + b}$. The answer is smaller than either factor, which is what multiplying two reciprocals should do.`,
      },
    ];
  }
  return [
    {
      text: `Multiplying powers of the same base puts the two piles of copies together: $${a} + ${b} = ${a + b}$.`,
    },
    { tex: `${subject} = ${working} = ${result}` },
    {
      text: `Multiplying the indices instead would give $x^{${a * b}}$, and counting copies is the quickest way to see that it cannot be right.`,
    },
  ];
}

const lawFillBase: Omit<Generator<LawFillParams>, 'id' | 'sample'> = {
  render: (params): Slide => {
    const answer = [lawFillWorking(params), lawFillResult(params)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: LAW_FILL_PROMPT[params.shape] },
        { kind: 'display', tex: lawFillSubject(params) },
      ],
      template: `{0} = {1}`,
      bank: fillBank(answer, lawFillDistractors(params)),
      answer,
    };
  },
  solution: lawFillSolution,
};

/** Numbers for one law-filling shape, kept where the working stays readable. */
function sampleLawFill(rng: Rng, difficulty: number, shape: LawFillParams['shape']): LawFillParams {
  const wide = difficulty > 1;
  if (shape === 'divide') {
    // Difficulty 1 keeps the top index the larger one, so the result is a
    // positive power; difficulty 2 lets it go either way, which is the case
    // the negative-index lesson is built on.
    const b = rng.int(2, wide ? 12 : 7);
    const a = wide ? rng.int(2, 12) : b + rng.int(1, 6);
    return { a: a === b ? a + 1 : a, b, p: 1, q: 1, shape };
  }
  if (shape === 'power') {
    return { a: rng.int(2, wide ? 12 : 9), b: rng.int(2, wide ? 7 : 5), p: 1, q: 1, shape };
  }
  if (shape === 'coefficient') {
    return {
      a: rng.int(2, wide ? 9 : 6),
      b: rng.int(2, wide ? 9 : 6),
      p: rng.int(2, wide ? 12 : 9),
      q: rng.int(2, wide ? 12 : 9),
      shape,
    };
  }
  return { a: rng.int(2, wide ? 12 : 9), b: rng.int(2, wide ? 12 : 9), p: 1, q: 1, shape };
}

/**
 * One generator per law, sharing everything but the shape — the same
 * arrangement `lawReduction` uses above, and for the same reason: a lesson
 * asks about the law it has just taught rather than whichever one a draw
 * happened to land on.
 */
const lawFill = (shape: LawFillParams['shape'], id: string): Generator<LawFillParams> => ({
  ...lawFillBase,
  id,
  sample: (rng, difficulty) => sampleLawFill(rng, difficulty, shape),
});

const fillMultiply = lawFill('multiply', 'idx-fill-multiply');
const fillDivide = lawFill('divide', 'idx-fill-divide');
const fillPower = lawFill('power', 'idx-fill-power');
const fillCoefficient = lawFill('coefficient', 'idx-fill-coefficient');
const fillNegative = lawFill('negative', 'idx-fill-negative');

/* ---------- Choosing a law rather than applying one ---------- */

interface LawRouteParams {
  a: number;
  b: number;
  /** The second base, used only where the two bases differ. */
  other: string;
  route: 'power' | 'different' | 'multiply' | 'divide';
}

/**
 * Which index law does this expression call for?
 *
 * Every other generator in this file hands the learner the law in the lesson
 * title and asks them to run it. Deciding is the separate skill, and it is the
 * one that survives outside a lesson labelled with the answer — a page of
 * mixed expressions is where "add the indices" starts being applied to
 * $\\left(x^{4}\\right)^{3}$.
 *
 * A `choice` slide could ask the same thing and would be a one-in-four guess.
 * Walking the tree makes the learner commit to a reason at each fork, and the
 * first fork is the one that matters: a bracket raised to a power is settled
 * before the question of what the two things are doing to each other arises.
 */
const chooseLaw: Generator<LawRouteParams> = {
  id: 'idx-law-choose',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 12 : 9),
    b: rng.int(2, difficulty > 1 ? 9 : 7),
    other: rng.pick(['y', 't', 'z']),
    route: rng.pick(['power', 'different', 'multiply', 'divide'] as const),
  }),
  render: ({ a, b, other, route }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Work down the questions to decide what can be done here. Each answer chooses what gets asked next.',
      },
    ],
    subject:
      route === 'power'
        ? `\\left(x^{${a}}\\right)^{${b}}`
        : route === 'divide'
          ? `\\frac{x^{${a}}}{x^{${b}}}`
          : route === 'different'
            ? `x^{${a}} \\times ${other}^{${b}}`
            : `x^{${a}} \\times x^{${b}}`,
    steps: [
      {
        id: 'bracket',
        ask: 'Is a power being raised to another power?',
        branches: [
          { label: 'Yes', outcome: 'Multiply the two indices.' },
          { label: 'No', to: 'bases' },
        ],
      },
      {
        id: 'bases',
        ask: 'Are both powers written with the same base?',
        branches: [
          { label: 'Yes', to: 'operation' },
          { label: 'No', outcome: 'No index law applies — it stays exactly as it is.' },
        ],
      },
      {
        id: 'operation',
        ask: 'Are they multiplied or divided?',
        branches: [
          { label: 'Multiplied', outcome: 'Add the indices.' },
          { label: 'Divided', outcome: 'Subtract the bottom index from the top one.' },
        ],
      },
    ],
    answer:
      route === 'power'
        ? ['Yes']
        : route === 'different'
          ? ['No', 'No']
          : route === 'multiply'
            ? ['No', 'Yes', 'Multiplied']
            : ['No', 'Yes', 'Divided'],
  }),
  solution: ({ a, b, other, route }) => {
    if (route === 'power') {
      return [
        {
          text: 'The whole of the first power sits inside a bracket with an index of its own, so this is a power of a power and nothing else needs deciding.',
        },
        { tex: `\\left(x^{${a}}\\right)^{${b}} = x^{${a} \\times ${b}} = x^{${a * b}}` },
        {
          text: `There are $${b}$ brackets, each holding $${a}$ copies of $x$. Adding would give $x^{${a + b}}$, which is far too few.`,
        },
      ];
    }
    if (route === 'different') {
      return [
        {
          text: `The bases are $x$ and $${other}$, and every index law begins by insisting they match.`,
        },
        { tex: `x^{${a}} \\times ${other}^{${b}}` },
        {
          text: `There is no single pile of copies to count, so this cannot be written as one power. It is already as simple as it gets.`,
        },
      ];
    }
    if (route === 'multiply') {
      return [
        {
          text: 'Nothing is bracketed, the bases match, and the two powers are multiplied — so the copies are put together.',
        },
        { tex: `x^{${a}} \\times x^{${b}} = x^{${a + b}}` },
        {
          text: `That is $${a}$ copies followed by $${b}$ more, which is $${a + b}$ of them.`,
        },
      ];
    }
    return [
      {
        text: 'Nothing is bracketed, the bases match, and one power is divided by the other — so copies cancel rather than gather.',
      },
      { tex: `\\frac{x^{${a}}}{x^{${b}}} = x^{${a} - ${b}} = x^{${a - b}}` },
      {
        text: `The order is top index minus bottom one. Reversing it gives $x^{${b - a}}$, and a sign slip here turns the answer upside down.`,
      },
    ];
  },
};

/* ---------- Level 2: roots, filled in and decided about ---------- */

interface RootFillParams {
  base: number;
  n: number;
  d: number;
  /** The d-th root of base, so nothing has to recompute it. */
  root: number;
  value: number;
}

/**
 * Fractional indices whose top is genuinely a power.
 *
 * `FRACTIONAL` above allows a numerator of 1, where the question is only "take
 * the root" and the two-step working this asks for collapses into one. Here
 * the top starts at 2, so there is always a root *and* a power to place.
 */
const ROOT_FILLS: RootFillParams[] = ROOTS.flatMap(({ base, den, root }) =>
  [2, 3, 4, 5]
    .filter((n) => gcd(n, den) === 1 && Math.pow(root, n) <= 2000)
    .map((n) => ({ base, n, d: den, root, value: Math.pow(root, n) })),
);

/** The gentler half: a square or a cube on top, which is most of them. */
const ROOT_FILLS_EASY = ROOT_FILLS.filter(({ n }) => n <= 3);

/** A root written the way it is read aloud, for the branch labels below. */
const ROOT_NAMES: Record<number, string> = {
  2: 'The square root',
  3: 'The cube root',
  4: 'The fourth root',
  5: 'The fifth root',
};

/** Evaluating a fractional index, placed in two steps rather than typed. */
const fillFractional: Generator<RootFillParams> = {
  id: 'idx-fill-fractional',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? ROOT_FILLS : ROOT_FILLS_EASY),
  render: (params): Slide => {
    const { base, n, d, root, value } = params;
    const answer = [`\\left(\\sqrt[${d}]{${base}}\\right)^{${n}}`, `${value}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'The bottom of the index is a root and the top is a power. Place the root being taken, then what it all comes to.',
        },
        { kind: 'display', tex: `${base}^{\\frac{${n}}{${d}}}` },
      ],
      template: `{0} = {1}`,
      bank: fillBank(answer, [
        `\\left(\\sqrt[${n}]{${base}}\\right)^{${d}}`,
        `\\sqrt[${d}]{${base}}`,
        `${root}`,
        `${base * n}`,
        `${root * n}`,
      ]),
      answer,
    };
  },
  solution: ({ base, n, d, root, value }) => [
    {
      text: `The $${d}$ underneath says which root to take, and the $${n}$ on top says what power to raise it to.`,
    },
    { tex: `\\sqrt[${d}]{${base}} = ${root}` },
    { tex: `${base}^{\\frac{${n}}{${d}}} = \\left(\\sqrt[${d}]{${base}}\\right)^{${n}} = ${root}^{${n}} = ${value}` },
    {
      text: `Taking the power first gives the same $${value}$ by way of $${base}^{${n}}$, a number far larger than anything else on the page — which is why the root goes first by habit.`,
    },
  ],
};

interface RootRouteParams {
  base: number;
  n: number;
  d: number;
  root: number;
  /** A plain whole-number index, where there is no root to take at all. */
  whole: boolean;
}

/** Roots and powers that a four-way fork can actually name. */
const ROOT_ROUTES = ROOT_FILLS.filter(({ d }) => d <= 5);
const ROOT_ROUTES_EASY = ROOT_FILLS_EASY.filter(({ d }) => d <= 5);

/**
 * What does this index tell you to do?
 *
 * The companion to `idx-law-choose`, one level on. A fractional index carries
 * two instructions and a habit — which root, which power, and which of them to
 * do first — and a learner who can evaluate $64^{2/3}$ when told to often
 * cannot say what the $3$ underneath was for.
 */
const chooseRootRoute: Generator<RootRouteParams> = {
  id: 'idx-root-flow',
  sample: (rng, difficulty) => {
    const drawn = rng.pick(difficulty > 1 ? ROOT_ROUTES : ROOT_ROUTES_EASY);
    return { ...drawn, whole: rng.int(1, 4) === 1 };
  },
  render: ({ base, n, d, root, whole }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Read the index and decide what it is asking for. Each answer chooses what gets asked next.',
      },
    ],
    subject: whole ? `${root}^{${n}}` : `${base}^{\\frac{${n}}{${d}}}`,
    steps: [
      {
        id: 'index',
        ask: 'What kind of index is it?',
        branches: [
          { label: 'A whole number', outcome: 'Raise the base to that power, and there is nothing else to do.' },
          { label: 'A fraction', to: 'root' },
        ],
      },
      {
        id: 'root',
        ask: 'The bottom of the fraction names a root. Which root is it here?',
        branches: [
          { label: ROOT_NAMES[2], to: 'order' },
          { label: ROOT_NAMES[3], to: 'order' },
          { label: ROOT_NAMES[4], to: 'order' },
          { label: ROOT_NAMES[5], to: 'order' },
        ],
      },
      {
        id: 'order',
        ask: 'Root first or power first? Both reach the same answer — which one keeps the numbers small?',
        branches: [
          { label: 'The root first', outcome: 'Take the root, then raise the result to the number on top.' },
          { label: 'The power first', outcome: 'It works, but it builds a far larger number on the way.' },
        ],
      },
    ],
    answer: whole ? ['A whole number'] : ['A fraction', ROOT_NAMES[d], 'The root first'],
  }),
  solution: ({ base, n, d, root, whole }) => {
    if (whole) {
      return [
        {
          text: `The index $${n}$ is a whole number, so there is no root hiding in it — it is $${n}$ copies of $${root}$ multiplied together.`,
        },
        { tex: `${root}^{${n}} = ${Math.pow(root, n)}` },
        {
          text: 'A fraction underneath is what turns an index into a root. There is no fraction here, so nothing is being undone.',
        },
      ];
    }
    return [
      {
        text: `The $${d}$ underneath names the root and the $${n}$ on top names the power, so this reads as "the $${d}$th root of $${base}$, then raised to the power $${n}$".`,
      },
      { tex: `\\sqrt[${d}]{${base}} = ${root} \\quad\\text{then}\\quad ${root}^{${n}} = ${Math.pow(root, n)}` },
      {
        text: `The other order gives the same answer through $${base}^{${n}}$, which is a number you would not want to write down. Root first, every time.`,
      },
    ];
  },
};

interface MatchBaseParams {
  r: number;
  p: number;
  q: number;
}

/**
 * Both sides of an index equation, rewritten over a common base.
 *
 * `idx-equation` asks for the answer; this asks for the step that gets you
 * there, which is the one a learner skips. Writing $16^{x}$ as $2^{4x}$ is
 * where the equation stops being about $16$ at all.
 */
const MATCH_PAIRS: MatchBaseParams[] = [2, 3, 5, 7, 11].flatMap((r) =>
  [2, 3, 4].flatMap((p) => {
    if (Math.pow(r, p) > 1000) return [];
    const out: MatchBaseParams[] = [];
    for (let q = 2; Math.pow(r, q) <= 1_000_000; q += 1) {
      // Equal indices would make both sides identical, which asks nothing.
      if (q !== p) out.push({ r, p, q });
    }
    return out;
  }),
);

/** The pairs whose equation has a whole-number solution. */
const MATCH_WHOLE = MATCH_PAIRS.filter(({ p, q }) => q % p === 0);

const matchBase: Generator<MatchBaseParams> = {
  id: 'idx-match-base',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? MATCH_PAIRS : MATCH_WHOLE),
  render: (params): Slide => {
    const { r, p, q } = params;
    const answer = [`${r}^{${p}x}`, `${r}^{${q}}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Rewrite both sides as powers of $${r}$. Nothing needs solving yet.`,
        },
        { kind: 'display', tex: `${Math.pow(r, p)}^{x} = ${Math.pow(r, q)}` },
      ],
      template: `{0} = {1}`,
      bank: fillBank(answer, [
        `${r}^{${p} + x}`,
        `${r}^{x}`,
        `${r}^{${q + 1}}`,
        `${Math.pow(r, p)}^{${q}}`,
        `${r}^{${p * q}}`,
      ]),
      answer,
    };
  },
  solution: ({ r, p, q }) => [
    {
      text: `Both $${Math.pow(r, p)}$ and $${Math.pow(r, q)}$ are powers of $${r}$, which is what makes this solvable without logarithms.`,
    },
    { tex: `${Math.pow(r, p)}^{x} = \\left(${r}^{${p}}\\right)^{x} = ${r}^{${p}x}` },
    { tex: `${r}^{${p}x} = ${r}^{${q}} \\implies ${p}x = ${q} \\implies x = ${q % p === 0 ? q / p : `\\frac{${q}}{${p}}`}` },
    {
      text: `Once the bases match, the indices can simply be equated — that is the whole method, and the rewriting above is the only part that takes any thought.`,
    },
  ],
};

/* ---------- Level 3: surds, filled in and estimated ---------- */

/** Pulling the square factor out of a surd, placed rather than typed. */
const fillSimplifySurd: Generator<SurdParams> = {
  id: 'rad-fill-simplify',
  sample: (rng, difficulty) => ({
    k: rng.int(2, difficulty > 1 ? 9 : 6),
    m: rng.pick(difficulty > 1 ? SURD_FREE : SURD_FREE.slice(0, 8)),
  }),
  render: ({ k, m }): Slide => {
    const answer = [`\\sqrt{${k * k}} \\times \\sqrt{${m}}`, `${k}\\sqrt{${m}}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Split the number under the root into its square factor and the rest, then finish it.',
        },
        { kind: 'display', tex: `\\sqrt{${k * k * m}}` },
      ],
      template: `{0} = {1}`,
      bank: fillBank(answer, [
        `\\sqrt{${k}} \\times \\sqrt{${m}}`,
        `\\sqrt{${k * k}} + \\sqrt{${m}}`,
        `${k * k}\\sqrt{${m}}`,
        `${k}\\sqrt{${k * m}}`,
        `${m}\\sqrt{${k}}`,
      ]),
      answer,
    };
  },
  solution: ({ k, m }) => [
    {
      text: `The largest square dividing $${k * k * m}$ is $${k * k}$, and $${k * k * m} \\div ${k * k} = ${m}$.`,
    },
    { tex: `\\sqrt{${k * k * m}} = \\sqrt{${k * k}} \\times \\sqrt{${m}} = ${k}\\sqrt{${m}}` },
    {
      text: `The square factor leaves as its root: $${k * k}$ comes out as $${k}$, not as $${k * k}$. What stays behind, $${m}$, has no square factor left in it.`,
    },
  ],
};

/**
 * Every whole number from 5 up whose square root is worth estimating.
 *
 * Perfect squares are dropped — there is nothing to estimate — and the range
 * is capped where the figure's curve leaves the picture.
 */
const ESTIMABLE: number[] = Array.from({ length: 126 }, (_, idx) => idx + 5).filter((n) => {
  const nearest = Math.round(Math.sqrt(n));
  return nearest * nearest !== n && nearest >= 2 && nearest <= 11;
});

/**
 * How big is this surd?
 *
 * The one question none of the other widgets here can ask. Every other surd
 * generator is about rewriting — $\\sqrt{72}$ into $6\\sqrt{2}$ — and a learner
 * can do all of it fluently while having no idea that the answer is a bit
 * over eight. Dragging to a number, against a curve that shows where the
 * square lands, asks for the size rather than the form.
 */
const estimateSurd: Generator<{ n: number }> = {
  id: 'rad-estimate',
  sample: (rng, difficulty) => ({
    n: rng.pick(difficulty > 1 ? ESTIMABLE : ESTIMABLE.filter((n) => n <= 60)),
  }),
  render: ({ n }): Slide => ({
    kind: 'slider',
    prompt: [
      {
        kind: 'prose',
        text: `The curve is $y = x^{2}$, and the dashed line is at $y = ${n}$. Slide to the whole number $\\sqrt{${n}}$ is closest to.`,
      },
    ],
    min: 1,
    max: 12,
    step: 1,
    answer: Math.round(Math.sqrt(n)),
    readout: `\\sqrt{${n}} \\approx {v}`,
    figure: {
      svg: plotSvg({
        xMin: 0,
        xMax: 12,
        yMin: 0,
        yMax: 150,
        curves: [{ f: (x) => x * x }],
        horizontals: [n],
        label: `The curve y equals x squared, with a dashed line at y equals ${n}`,
      }),
      xMin: 0,
      xMax: 12,
    },
  }),
  solution: ({ n }) => {
    const nearest = Math.round(Math.sqrt(n));
    const below = Math.floor(Math.sqrt(n));
    return [
      {
        text: `Look for the squares either side of $${n}$: $${below}^{2} = ${below * below}$ and $${below + 1}^{2} = ${(below + 1) * (below + 1)}$.`,
      },
      { tex: `${below * below} < ${n} < ${(below + 1) * (below + 1)}` },
      {
        text: `So $\\sqrt{${n}}$ lies between $${below}$ and $${below + 1}$, and it is nearer $${nearest}$ — which is where the dashed line meets the curve.`,
      },
      {
        text: 'Knowing roughly how big a surd is catches an answer that has gone wrong in a way no amount of rewriting will.',
      },
    ];
  },
};

/** Rationalising a denominator, as the multiplication that does it. */
const fillRationalise: Generator<{ c: number; m: number }> = {
  id: 'rad-fill-rationalise',
  sample: (rng, difficulty) => ({
    c: rng.int(2, difficulty > 1 ? 12 : 9),
    m: rng.pick(difficulty > 1 ? SURD_FREE : SURD_FREE.slice(0, 8)),
  }),
  render: ({ c, m }): Slide => {
    const answer = [
      `\\frac{\\sqrt{${m}}}{\\sqrt{${m}}}`,
      `\\frac{${c}\\sqrt{${m}}}{${m}}`,
    ];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Choose what to multiply by — it has to be worth 1, or the value changes — and then what that leaves.',
        },
        { kind: 'display', tex: `\\frac{${c}}{\\sqrt{${m}}}` },
      ],
      template: `\\text{multiply by } {0} \\text{ and get } {1}`,
      bank: fillBank(answer, [
        `\\frac{\\sqrt{${m}}}{${m}}`,
        `\\frac{${m}}{\\sqrt{${m}}}`,
        `\\frac{${c}}{${m}}`,
        `\\frac{${c}\\sqrt{${m}}}{\\sqrt{${m}}}`,
        `\\frac{\\sqrt{${m}}}{${c * m}}`,
      ]),
      answer,
    };
  },
  solution: ({ c, m }) => [
    {
      text: `Multiplying by $\\frac{\\sqrt{${m}}}{\\sqrt{${m}}}$ is multiplying by 1, so it changes how the fraction is written and not what it is worth.`,
    },
    {
      tex: `\\frac{${c}}{\\sqrt{${m}}} \\times \\frac{\\sqrt{${m}}}{\\sqrt{${m}}} = \\frac{${c}\\sqrt{${m}}}{${m}}`,
    },
    {
      text: `The bottom becomes $${m}$ because $\\sqrt{${m}} \\times \\sqrt{${m}} = ${m}$. Multiplying only the denominator would have changed the value — that is why the tile has to be a fraction worth 1 rather than just $\\sqrt{${m}}$.`,
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
  indexForm,
  simplifySurd,
  multiplySurds,
  addSurds,
  rationalise,
  indexEquation,
  evaluateInOrder,
  evaluateWithRoots,
  evaluateMultiplyLaw,
  evaluateDivideLaw,
  evaluatePowerLaw,
  evaluateCoefficientLaw,
  fillMultiply,
  fillDivide,
  fillPower,
  fillCoefficient,
  fillNegative,
  chooseLaw,
  fillFractional,
  chooseRootRoute,
  matchBase,
  fillSimplifySurd,
  estimateSurd,
  fillRationalise,
] as unknown as Generator<unknown>[];
