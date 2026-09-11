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
import { options } from '../choiceVariant';
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


/* ---------- order of operations ---------- */

interface OrderParams {
  a: number;
  b: number;
  c: number;
  /** Which way round the two operations sit on the line. */
  shape: 'add-times' | 'times-add' | 'sub-times' | 'times-sub';
  op: '\\times' | '\\div';
}

/**
 * Evaluate an expression where the order is the point.
 *
 * Every other `steps` question hands the learner the operation to do next and
 * asks only what it comes to. That grades arithmetic and quietly assumes the
 * harder half: knowing that in `8 + 4 \times 3` the multiplication happens
 * first, and that doing the addition first gives 36 rather than 20 — an answer
 * that is wrong for a reason no amount of careful adding would catch.
 *
 * So both sub-expressions are offered, and the value comes from a bank holding
 * the right answer, the answer the wrong order gives, and slips of the kind
 * that come from the numbers themselves. Choosing the wrong operation collapses
 * it for real: the learner then looks at their own wrong line rather than being
 * stopped at the moment of the mistake, which would give the answer away.
 */
const orderOfOperations: Generator<OrderParams> = {
  id: 'idx-order-of-operations',
  sample: (rng, difficulty) => {
    const top = difficulty > 1 ? 12 : 9;
    const c = rng.int(2, difficulty > 1 ? 9 : 5);
    const b = rng.int(2, top);
    return {
      a: rng.int(2, difficulty > 1 ? 40 : 20),
      b,
      c,
      shape: rng.pick(['add-times', 'times-add', 'sub-times', 'times-sub'] as const),
      // Division only where it comes out whole, so the working stays in
      // integers and the question is about order rather than about fractions.
      op: difficulty > 1 && b % c === 0 ? rng.pick(['\\times', '\\div'] as const) : '\\times',
    };
  },
  render: ({ a, b, c, shape, op }): Slide => {
    const product = op === '\\div' ? b / c : b * c;
    const leading = shape === 'times-add' || shape === 'times-sub';
    const plus = shape === 'add-times' || shape === 'times-add';
    const sign = plus ? '+' : '-';

    // The multiplication sits either after the loose term or before it. Its
    // three tokens collapse to one, and so do the loose term's three, which is
    // what keeps the second line the same length either way round.
    const start = leading
      ? [`${b}`, op, `${c}`, sign, `${a}`]
      : [`${a}`, sign, `${b}`, op, `${c}`];
    // Operator positions: the multiplication sign and the loose +/- sign.
    const productSpan: [number, number] = leading ? [0, 3] : [2, 5];
    const looseSpan: [number, number] = leading ? [2, 5] : [0, 3];
    const productOp = leading ? 1 : 3;
    const looseOp = leading ? 3 : 1;

    // What the wrong order would produce at this stage, so the bank contains
    // the answer a learner who reaches for the loose operation would want.
    const loose = leading ? (plus ? c + a : c - a) : plus ? a + b : a - b;
    const total = leading
      ? plus
        ? product + a
        : product - a
      : plus
        ? a + product
        : a - product;

    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: 'Evaluate this one operation at a time. Tap the part you would do **first**, then choose what it comes to.',
        },
      ],
      start,
      reductions: [
        {
          span: productSpan,
          operator: productOp,
          value: `${product}`,
          decoys: [{ operator: looseOp, span: looseSpan }],
          bank: [...new Set([`${product}`, `${loose}`, `${total}`, `${b + c}`, `${a + b + c}`, `${Math.abs(b - c)}`])],
        },
        {
          span: [0, 3],
          // The sign between the two remaining numbers, not the first of them.
          operator: 1,
          value: `${total}`,
          bank: [...new Set([`${total}`, `${loose}`, `${product}`, `${a + product + 1}`, `${Math.abs(a - product)}`])],
        },
      ],
    };
  },
  solution: ({ a, b, c, shape, op }) => {
    const product = op === '\\div' ? b / c : b * c;
    const leading = shape === 'times-add' || shape === 'times-sub';
    const plus = shape === 'add-times' || shape === 'times-add';
    const sign = plus ? '+' : '-';
    const opName = op === '\\div' ? 'division' : 'multiplication';
    const total = leading
      ? plus
        ? product + a
        : product - a
      : plus
        ? a + product
        : a - product;
    const wrongOrder = leading ? (plus ? c + a : c - a) : plus ? a + b : a - b;
    const wrongTotal = leading ? b * wrongOrder : wrongOrder * c;

    return [
      {
        text: `The ${opName} binds tighter than the ${plus ? 'addition' : 'subtraction'}, so it happens first no matter which side of the expression it sits on.`,
      },
      {
        tex: leading
          ? `${b} ${op} ${c} ${sign} ${a} = ${product} ${sign} ${a} = ${total}`
          : `${a} ${sign} ${b} ${op} ${c} = ${a} ${sign} ${product} = ${total}`,
      },
      {
        text: `Taking the ${plus ? 'addition' : 'subtraction'} first would give $${wrongTotal}$ instead of $${total}$. Nothing about the arithmetic would look wrong along the way, which is exactly why the order has to be decided before any of it is done.`,
      },
    ];
  },
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
  orderOfOperations,
] as unknown as Generator<unknown>[];
