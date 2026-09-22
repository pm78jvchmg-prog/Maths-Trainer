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
// Where a slider's handle rests before it is touched. Imported rather than
// restated so a question cannot be built against a rule the widget has moved.
import { defaultSliderValue } from '../../ui/sliderValue';
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

/** A root written the way it is read: a square root carries no small 2. */
function rootOf(index: number, radicand: number | string): string {
  return index === 2 ? `\\sqrt{${radicand}}` : `\\sqrt[${index}]{${radicand}}`;
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
 * Every fractional index worth filling in, unit fractions included.
 *
 * Split into two pools rather than one, because the two halves are two
 * different lessons: a 1 on top means "take this root and stop", which is all
 * *Roots as Indices* teaches, and a power on top is what *Powers of Roots*
 * adds. A generator drawing across both would ask the second lesson's question
 * in the first.
 */
const ROOT_FILLS: RootFillParams[] = ROOTS.flatMap(({ base, den, root }) =>
  [1, 2, 3, 4, 5]
    .filter((n) => gcd(n, den) === 1 && Math.pow(root, n) <= 2000)
    .map((n) => ({ base, n, d: den, root, value: Math.pow(root, n) })),
);

/** A 1 on top: the index is a root and nothing else. */
const ROOT_FILLS_UNIT = ROOT_FILLS.filter(({ n }) => n === 1);

/** A genuine power on top, so there is a root *and* a power to place. */
const ROOT_FILLS_POWER = ROOT_FILLS.filter(({ n }) => n > 1);

/** The gentler half of those: a square or a cube on top. */
const ROOT_FILLS_POWER_EASY = ROOT_FILLS_POWER.filter(({ n }) => n <= 3);

/** A root written the way it is read aloud, for the branch labels below. */
const ROOT_NAMES: Record<number, string> = {
  2: 'The square root',
  3: 'The cube root',
  4: 'The fourth root',
  5: 'The fifth root',
};

/**
 * A fractional index rewritten and then evaluated, placed rather than typed.
 *
 * Two blanks again, and the same reason as the index laws above: the first is
 * the index read as a root, the second is that arithmetic done. `idx-fractional`
 * asks only for the number, which a learner can reach by recognising it without
 * ever saying what the bottom of the fraction was for.
 */
const rootFillBase: Omit<Generator<RootFillParams>, 'id' | 'sample'> = {
  render: (params): Slide => {
    const { base, n, d, root, value } = params;
    const unit = n === 1;
    const answer = unit
      ? [rootOf(d, base), `${value}`]
      : [`\\left(${rootOf(d, base)}\\right)^{${n}}`, `${value}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: unit
            ? 'The bottom of the index says which root to take. Place that root, then what it comes to.'
            : 'The bottom of the index is a root and the top is a power. Place the root raised to that power, then what it all comes to.',
        },
        { kind: 'display', tex: `${base}^{\\frac{${n}}{${d}}}` },
      ],
      template: `{0} = {1}`,
      bank: fillBank(
        answer,
        unit
          ? [rootOf(d + 1, base), `${d}`, `${root + 1}`, `${Math.round(base / d)}`]
          : [
              `\\left(${rootOf(n, base)}\\right)^{${d}}`,
              rootOf(d, base),
              `${root}`,
              `${base * n}`,
              `${root * n}`,
            ],
      ),
      answer,
    };
  },
  solution: ({ base, n, d, root, value }) =>
    n === 1
      ? [
          {
            text: `A 1 on top means there is no power to apply — the $${d}$ underneath is the whole instruction.`,
          },
          { tex: `${base}^{\\frac{1}{${d}}} = ${rootOf(d, base)} = ${root}` },
          {
            text: `Read it as a question: what number to the power $${d}$ gives $${base}$? It is $${root}$, because $${root}^{${d}} = ${base}$.`,
          },
        ]
      : [
          {
            text: `The $${d}$ underneath says which root to take, and the $${n}$ on top says what power to raise it to.`,
          },
          { tex: `${rootOf(d, base)} = ${root}` },
          {
            tex: `${base}^{\\frac{${n}}{${d}}} = \\left(${rootOf(d, base)}\\right)^{${n}} = ${root}^{${n}} = ${value}`,
          },
          {
            text: `Taking the power first gives the same $${value}$ by way of $${base}^{${n}}$, a number far larger than anything else on the page — which is why the root goes first by habit.`,
          },
        ],
};

/** A unit fractional index: the root alone. */
const fillRoot: Generator<RootFillParams> = {
  ...rootFillBase,
  id: 'idx-fill-root',
  sample: (rng, difficulty) =>
    rng.pick(difficulty > 1 ? ROOT_FILLS_UNIT : ROOT_FILLS_UNIT.filter(({ d }) => d <= 4)),
};

/** A fractional index with a power on top: the root, then the power. */
const fillFractional: Generator<RootFillParams> = {
  ...rootFillBase,
  id: 'idx-fill-fractional',
  sample: (rng, difficulty) =>
    rng.pick(difficulty > 1 ? ROOT_FILLS_POWER : ROOT_FILLS_POWER_EASY),
};

interface RootRouteParams {
  base: number;
  n: number;
  d: number;
  root: number;
  /** A plain whole-number index, where there is no root to take at all. */
  whole: boolean;
}

/** Roots a four-way fork can actually name, unit fractions first. */
const ROOT_ROUTES = ROOT_FILLS.filter(({ d }) => d <= 5);
const ROOT_ROUTES_EASY = ROOT_ROUTES.filter(({ n }) => n === 1);

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
          { label: ROOT_NAMES[2], to: 'top' },
          { label: ROOT_NAMES[3], to: 'top' },
          { label: ROOT_NAMES[4], to: 'top' },
          { label: ROOT_NAMES[5], to: 'top' },
        ],
      },
      {
        id: 'top',
        ask: 'And what does the number on top tell you to do?',
        branches: [
          {
            label: 'Nothing — it is a 1',
            outcome: 'Take that root of the base, and that is the whole answer.',
          },
          {
            label: 'Raise the root to that power',
            outcome: 'Take the root first, then raise it — the same answer, with far smaller numbers on the way.',
          },
        ],
      },
    ],
    answer: whole
      ? ['A whole number']
      : [
          'A fraction',
          ROOT_NAMES[d],
          n === 1 ? 'Nothing — it is a 1' : 'Raise the root to that power',
        ],
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
    if (n === 1) {
      return [
        {
          text: `The $${d}$ underneath names the root, and the 1 on top leaves it at that — so this is simply the $${d}$th root of $${base}$.`,
        },
        { tex: `${base}^{\\frac{1}{${d}}} = ${rootOf(d, base)} = ${root}` },
        {
          text: `A 1 on top is easy to read past. It is the only case where the index does one job rather than two.`,
        },
      ];
    }
    return [
      {
        text: `The $${d}$ underneath names the root and the $${n}$ on top names the power, so this reads as the $${d}$th root of $${base}$, then raised to the power $${n}$.`,
      },
      { tex: `${rootOf(d, base)} = ${root} \\quad\\text{then}\\quad ${root}^{${n}} = ${Math.pow(root, n)}` },
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
  render: ({ n }): Slide => {
    // The window is built around this question's own answer rather than fixed.
    // A fixed 0-12 span puts the crossing for a small n in the bottom-left
    // corner of an otherwise empty picture, which is the one thing the figure
    // exists to show. Three past the answer leaves the crossing comfortably
    // inside the frame at every n the pool offers.
    const nearest = Math.round(Math.sqrt(n));
    // Then grown until the untouched handle is not already on the answer. A
    // slider seeds its answer with wherever the handle rests, so a track whose
    // middle *is* the answer is marked correct without being dragged — which
    // it was for every n whose root rounds to 4 or 5.
    let span = nearest + 3;
    while (defaultSliderValue(1, span, 1) === nearest) span += 1;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The curve is $y = x^{2}$, and the dashed line is at $y = ${n}$. Slide to the whole number $\\sqrt{${n}}$ is closest to.`,
        },
      ],
      min: 1,
      max: span,
      step: 1,
      answer: nearest,
      readout: `\\sqrt{${n}} \\approx {v}`,
      // The figure covers the slider's own span, so the marker under the handle
      // sits where that value is on the curve.
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: span * span,
          curves: [{ f: (x) => x * x }],
          horizontals: [n],
          label: `The curve y equals x squared, with a dashed line at y equals ${n}`,
        }),
        xMin: 0,
        xMax: span,
      },
    };
  },
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
  // c never equals m, because `\frac{c}{m}` is one of the distractors and at
  // c = m it is a fraction genuinely worth 1 — a learner placing it would be
  // answering the question as asked and still be marked wrong.
  sample: (rng, difficulty) => {
    const m = rng.pick(difficulty > 1 ? SURD_FREE : SURD_FREE.slice(0, 8));
    const c = rng.int(2, difficulty > 1 ? 12 : 9);
    return { c: c === m ? c + 1 : c, m };
  },
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
          text: 'Which fraction worth 1 clears the root from the bottom? Place it, then place what the multiplication leaves.',
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

/* ---------- Level 4: standard form ---------- */

/**
 * A number in standard form, held as its significant figures and its power of
 * ten rather than as a float.
 *
 * `3.2 × 10^5` has to print as exactly "3.2" and "320 000", and a float front
 * number does not: 4.1 × 3 is 12.299999999999999 in binary. Held as the digit
 * string `'32'` with `n = 5`, every number in this level is built with whole
 * number arithmetic and printed by placing a decimal point in a string, so
 * nothing can drift.
 */
interface Sf {
  /** The significant figures, first and last non-zero: `'32'` is the front number 3.2. */
  digits: string;
  /** The power of ten. */
  n: number;
}

/** The front number: `'32'` reads 3.2, `'7'` reads 7. */
function frontOf(digits: string): string {
  return digits.length === 1 ? digits : `${digits[0]}.${digits.slice(1)}`;
}

/** A power of ten as the learner reads it. */
function tenTex(n: number): string {
  return `10^{${n}}`;
}

/** A number in standard form as the learner reads it. */
function sfTex(sf: Sf): string {
  return `${frontOf(sf.digits)} \\times ${tenTex(sf.n)}`;
}

/** The same number in mathjs syntax, used only to prove a distractor wrong. */
function sfAnswer(sf: Sf): string {
  return `${frontOf(sf.digits)}*10^(${sf.n})`;
}

/**
 * The number written out in full, unspaced: `320000`, `0.0045`.
 *
 * The point starts after the first digit and moves `n` places, which is
 * exactly how the lessons describe it.
 */
function plainOf({ digits, n }: Sf): string {
  const point = 1 + n;
  if (point <= 0) return `0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return digits + '0'.repeat(point - digits.length);
  return `${digits.slice(0, point)}.${digits.slice(point)}`;
}

/** Thin spaces between groups of three, the way a long whole number is printed. */
function grouped(whole: string): string {
  if (whole.length <= 4) return whole;
  const groups: string[] = [];
  for (let end = whole.length; end > 0; end -= 3) {
    groups.unshift(whole.slice(Math.max(0, end - 3), end));
  }
  return groups.join('\\,');
}

/** The number written out in full, as the learner reads it: `320\,000`. */
function ordinaryTex(sf: Sf): string {
  const [whole, fraction] = plainOf(sf).split('.');
  return fraction === undefined ? grouped(whole) : `${grouped(whole)}.${fraction}`;
}

/** `10^k` written out, for the worked solutions: `100\,000`. */
function tenPlainTex(k: number): string {
  return grouped(`1${'0'.repeat(k)}`);
}

/**
 * `m × 10^e`, for a positive whole `m`, rewritten in standard form.
 *
 * Trailing zeros of `m` move into the power, so `150 × 10^9` comes back as
 * `1.5 × 10^11`. Every number this level computes goes through here, which is
 * what makes two options with the same value print the same label.
 */
function sfOf(m: number, e: number): Sf {
  let digits = String(m);
  let power = e;
  while (digits.length > 1 && digits.endsWith('0')) {
    digits = digits.slice(0, -1);
    power += 1;
  }
  return { digits, n: power + digits.length - 1 };
}

/** The inverse of `sfOf`: the whole number `m` and power `e` with `sf = m × 10^e`. */
function wholeOf(sf: Sf): { m: number; e: number } {
  return { m: Number(sf.digits), e: sf.n - (sf.digits.length - 1) };
}

/** `m × 10^e` written plainly, for front numbers that are worked on: 3.2 + 0.5. */
function decimalOf(m: number, e: number): string {
  return plainOf(sfOf(m, e));
}

/** `x ± y` for two numbers held as `m × 10^e`, still held that way. */
function combine(
  x: { m: number; e: number },
  y: { m: number; e: number },
  op: '+' | '-',
): { m: number; e: number } {
  const e = Math.min(x.e, y.e);
  const left = x.m * Math.pow(10, x.e - e);
  const right = y.m * Math.pow(10, y.e - e);
  return { m: op === '+' ? left + right : left - right, e };
}

/** A front number's value as `m × 10^e`: 3.2 is 32 × 10^-1. */
function frontValue(digits: string): { m: number; e: number } {
  return { m: Number(digits), e: -(digits.length - 1) };
}

/** Significant figures with no zero at either end: 1 to 3 of them. */
function drawDigits(rng: Rng, figures: number): string {
  if (figures === 1) return `${rng.int(1, 9)}`;
  let digits = `${rng.int(1, 9)}`;
  for (let i = 2; i < figures; i += 1) digits += `${rng.int(0, 9)}`;
  return digits + `${rng.int(1, 9)}`;
}

type Scale = 'large' | 'small';

/**
 * A number to write in or read out of standard form.
 *
 * Difficulty 1 keeps to two significant figures and a middling power, where
 * the only thing to get right is the count of places. Difficulty 2 adds one-
 * and three-figure numbers, where the zeros no longer line up with the power in
 * an obvious way.
 *
 * Kept between 10^-6 and 10^8 because that is where the checker can tell a
 * wrong typed answer from a right one. It compares within a relative 1e-8,
 * floored at an absolute 1e-8: past 10^8 an answer 1 out is inside that, and
 * below 10^-6 two answers a place apart start to be.
 */
function drawSf(rng: Rng, scale: Scale, difficulty: number): Sf {
  const hard = difficulty > 1;
  const digits = drawDigits(rng, hard ? rng.int(1, 3) : 2);
  const n = scale === 'large' ? rng.int(hard ? 2 : 3, hard ? 7 : 6) : -rng.int(hard ? 1 : 2, hard ? 6 : 4);
  return { digits, n };
}

/** "1 place", "3 places". */
function places(k: number): string {
  return k === 1 ? '1 place' : `${k} places`;
}

/**
 * Choice options from standard-form candidates: the answer, then up to three
 * distractors with a different value.
 *
 * De-duplicated by value rather than by label. Every candidate is already in
 * standard form, so two labels match exactly when the values do — and a slip
 * that happens to land on the right answer for this draw is dropped instead of
 * being offered as a second correct option.
 */
function sfOptions(correct: Sf, ...candidates: Sf[]) {
  const key = (sf: Sf) => `${sf.digits}e${sf.n}`;
  const seen = new Set([key(correct)]);
  const wrong: Sf[] = [];
  for (const sf of candidates) {
    if (wrong.length === 3 || seen.has(key(sf))) continue;
    seen.add(key(sf));
    wrong.push(sf);
  }
  return options(
    { tex: sfTex(correct), answer: sfAnswer(correct) },
    ...wrong.map((sf) => ({ tex: sfTex(sf), answer: sfAnswer(sf) })),
  );
}

/* Reading and writing standard form */

/**
 * Standard form to an ordinary number, typed.
 *
 * The keypad is digits and a point only. Checking is by value, so a learner
 * able to type `\times` and `^` could type the question straight back and be
 * marked right; without them the only thing that can be entered is the number
 * written out, which is the skill.
 */
function toOrdinary(id: string, scale: Scale): Generator<Sf> {
  return {
    id,
    // One place too far either way, and the point moved the wrong way entirely.
    choices: (sf) =>
      options(
        { tex: ordinaryTex(sf), answer: plainOf(sf) },
        ...[sf.n + 1, sf.n - 1, -sf.n].map((n) => ({
          tex: ordinaryTex({ ...sf, n }),
          answer: plainOf({ ...sf, n }),
        })),
      ),
    sample: (rng, difficulty) => drawSf(rng, scale, difficulty),
    render: (sf): Slide => ({
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Write this as an ordinary number.' }],
      lead: `${sfTex(sf)} =`,
      keypad: [],
      answer: plainOf(sf),
      domain: 'real',
      mode: 'exact',
    }),
    solution: (sf) => {
      const front = frontOf(sf.digits);
      if (sf.n > 0) {
        return [
          {
            text: `$${tenTex(sf.n)}$ is $${tenPlainTex(sf.n)}$, so multiplying by it moves the decimal point ${places(sf.n)} to the right.`,
          },
          { tex: `${sfTex(sf)} = ${front} \\times ${tenPlainTex(sf.n)} = ${ordinaryTex(sf)}` },
          {
            text: `A quick check: a number with power $${sf.n}$ lies between $${tenTex(sf.n)}$ and $${tenTex(sf.n + 1)}$, and $${ordinaryTex(sf)}$ does.`,
          },
        ];
      }
      const zeros = -sf.n - 1;
      return [
        {
          text: `A negative power divides: $${tenTex(sf.n)}$ is one over $${tenPlainTex(-sf.n)}$, so the decimal point moves ${places(-sf.n)} to the left.`,
        },
        { tex: `${sfTex(sf)} = ${front} \\div ${tenPlainTex(-sf.n)} = ${ordinaryTex(sf)}` },
        {
          text:
            zeros === 0
              ? `With a power of $-1$ the first digit, $${sf.digits[0]}$, lands straight after the point.`
              : `The first digit, $${sf.digits[0]}$, lands ${places(-sf.n)} after the point, so $${zeros}$ zero${zeros === 1 ? '' : 's'} sit between the point and it.`,
        },
      ];
    },
  };
}

/** Large numbers out of standard form. */
const sfToOrdinary = toOrdinary('sf-to-ordinary', 'large');

/** Small numbers out of standard form. */
const sfSmallToOrdinary = toOrdinary('sf-small-to-ordinary', 'small');

/**
 * An ordinary number into standard form, placed rather than typed.
 *
 * Typed, the answer would be checked by value and the question itself would
 * pass. Tiles grade the *form*: the front number and the power go in separate
 * blanks, next to the front number ten times too big and too small and the
 * power one out either way — and the power of the wrong sign, which is what
 * moving the point the wrong way gives.
 */
function writeTiles(id: string, scale: Scale): Generator<Sf> {
  return {
    id,
    sample: (rng, difficulty) => drawSf(rng, scale, difficulty),
    render: (sf): Slide => {
      const answer = [frontOf(sf.digits), tenTex(sf.n)];
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text: 'Write this in standard form: a number at least 1 and less than 10, times a power of ten.',
          },
          { kind: 'display', tex: ordinaryTex(sf) },
        ],
        template: '{0} \\times {1}',
        bank: fillBank(answer, [
          plainOf({ ...sf, n: 1 }),
          plainOf({ ...sf, n: -1 }),
          tenTex(sf.n - 1),
          tenTex(sf.n + 1),
          tenTex(-sf.n),
        ]),
        answer,
      };
    },
    solution: (sf) => {
      const front = frontOf(sf.digits);
      return [
        {
          text: `Put the point after the first digit to get the front number, $${front}$. Then count the places the point has to move to get back to $${ordinaryTex(sf)}$.`,
        },
        { tex: `${ordinaryTex(sf)} = ${sfTex(sf)}` },
        {
          text:
            sf.n > 0
              ? `It moves ${places(sf.n)} to the right, so the power is $${sf.n}$. A power of $${sf.n - 1}$ or $${sf.n + 1}$ would give a number ten times too small or too big.`
              : `It moves ${places(-sf.n)} to the left, so the power is negative: $${sf.n}$. The number is less than 1, and only a negative power makes $${front}$ smaller.`,
        },
      ];
    },
  };
}

/** Large numbers into standard form. */
const sfWriteTiles = writeTiles('sf-write-tiles', 'large');

/** Small numbers into standard form. */
const sfWriteSmallTiles = writeTiles('sf-write-small-tiles', 'small');

/**
 * A line of powers of ten from `10^-9` to `10^9`, for the slider to move along.
 *
 * Drawn edge to edge in its own units, like `vectorSvg`, because the slider
 * places its marker as a fraction of the picture's width: the span -10 to 10
 * maps exactly onto the 280 units across. With `dot`, the number itself is
 * marked where it sits, between its own power and the next — which is the
 * picture of why the power is the tick just below it.
 */
function powerLineSvg(sf: Sf, dot: boolean): string {
  const width = 280;
  const height = 56;
  const axis = 22;
  const x = (v: number) => (((v + 10) / 20) * width).toFixed(1);
  const parts = [
    `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="A line of powers of ten from ten to the minus nine up to ten to the nine${dot ? ', with a dot where the number sits' : ''}">`,
    `<line x1="${x(-9.5)}" y1="${axis}" x2="${x(9.5)}" y2="${axis}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
  ];
  for (let k = -9; k <= 9; k += 1) {
    const major = k % 3 === 0;
    const reach = major ? 6 : 3;
    parts.push(
      `<line x1="${x(k)}" y1="${axis - reach}" x2="${x(k)}" y2="${axis + reach}" stroke="currentColor" stroke-width="1" opacity="0.7" />`,
    );
    if (major) {
      parts.push(
        `<text x="${x(k)}" y="${axis + 24}" text-anchor="middle" font-size="11" fill="currentColor">10<tspan dy="-5" font-size="8">${k < 0 ? '−' : ''}${Math.abs(k)}</tspan></text>`,
      );
    }
  }
  if (dot) {
    const at = sf.n + Math.log10(Number(frontOf(sf.digits)));
    parts.push(`<circle cx="${x(at)}" cy="${axis}" r="4.5" fill="currentColor" />`);
  }
  parts.push('</svg>');
  return parts.join('');
}

interface PowerSliderParams extends Sf {
  /** Mark the number on the line: at difficulty 1 only, as a support to take away. */
  dot: boolean;
}

/**
 * Drag to the power of ten.
 *
 * The front number is given and held in the readout, so the one thing moving
 * is the power, and the readout says back what the learner has written
 * (`3.2 × 10^4`) against the number they were given. The track runs the whole
 * line both ways, so a large number can be given a negative power and a small
 * one a positive power, which are the slips worth being able to make.
 */
function powerSlider(id: string, scale: Scale): Generator<PowerSliderParams> {
  return {
    id,
    sample: (rng, difficulty) => ({ ...drawSf(rng, scale, difficulty), dot: difficulty === 1 }),
    render: (params): Slide => ({
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: params.dot
            ? `Slide to the power of ten that writes $${ordinaryTex(params)}$ in standard form. The dot shows where it sits on the line.`
            : `Slide to the power of ten that writes $${ordinaryTex(params)}$ in standard form.`,
        },
      ],
      min: -9,
      max: 9,
      step: 1,
      answer: params.n,
      readout: `${frontOf(params.digits)} \\times 10^{{v}}`,
      figure: { svg: powerLineSvg(params, params.dot), xMin: -10, xMax: 10 },
    }),
    solution: (params) => {
      const front = frontOf(params.digits);
      return [
        {
          text: `The front number is $${front}$. Count how many places the point moves from $${front}$ to $${ordinaryTex(params)}$.`,
        },
        { tex: `${ordinaryTex(params)} = ${sfTex(params)}` },
        {
          text:
            params.n > 0
              ? `${places(params.n)} to the right, so the power is $${params.n}$. On the line the number sits between $${tenTex(params.n)}$ and $${tenTex(params.n + 1)}$, and the power is always the lower of the two.`
              : `${places(-params.n)} to the left, so the power is $${params.n}$. On the line the number sits between $${tenTex(params.n)}$ and $${tenTex(params.n + 1)}$, and the power is always the lower of the two.`,
        },
      ];
    },
  };
}

/** The power of a large number, dragged to. */
const sfPowerSlider = powerSlider('sf-power-slider', 'large');

/** The power of a small number, dragged to. */
const sfSmallPowerSlider = powerSlider('sf-small-power-slider', 'small');

interface FormParams {
  sf: Sf;
  /** How far the written front number is from standard: 1 is ten times too big. */
  shift: -1 | 0 | 1;
}

/** The number as written in the question: the same value, the front number shifted. */
function shownOf({ sf, shift }: FormParams): { front: string; n: number } {
  return { front: plainOf({ ...sf, n: shift }), n: sf.n - shift };
}

/**
 * Is this in standard form, and if not, which way does the power go?
 *
 * The second half is the one that goes wrong. `34 \times 10^{4}` becomes
 * `3.4 \times 10^{5}`: the front number got smaller, so the power has to get
 * bigger to keep the value — and the instinct is to move both the same way.
 * A choice slide could ask "which is the standard form of this" and be
 * answered by spotting the one front number between 1 and 10; the tree makes
 * the learner say what happens to the power and why.
 */
const sfFormFlow: Generator<FormParams> = {
  id: 'sf-form-flow',
  sample: (rng, difficulty) => ({
    sf: drawSf(rng, difficulty > 1 ? rng.pick(['large', 'small'] as const) : 'large', difficulty),
    shift: rng.pick([-1, 0, 1] as const),
  }),
  render: (params): Slide => {
    const shown = shownOf(params);
    const moved = (n: number) => `So it is $${frontOf(params.sf.digits)} \\times ${tenTex(n)}$.`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Decide whether this is in standard form, and fix it if not. Each answer chooses what gets asked next.',
        },
      ],
      subject: `${shown.front} \\times ${tenTex(shown.n)}`,
      steps: [
        {
          id: 'range',
          ask: 'Is the number in front at least 1 and less than 10?',
          branches: [
            { label: 'Yes', outcome: 'Then it is already in standard form.' },
            { label: 'No, it is 10 or more', to: 'big' },
            { label: 'No, it is less than 1', to: 'small' },
          ],
        },
        {
          id: 'big',
          ask: 'Move the point one place left, so the front number is ten times smaller. What must the power do to keep the value the same?',
          branches: [
            { label: 'Go up by one', outcome: moved(shown.n + 1) },
            { label: 'Go down by one', outcome: moved(shown.n - 1) },
          ],
        },
        {
          id: 'small',
          ask: 'Move the point one place right, so the front number is ten times bigger. What must the power do to keep the value the same?',
          branches: [
            { label: 'Go up by one', outcome: moved(shown.n + 1) },
            { label: 'Go down by one', outcome: moved(shown.n - 1) },
          ],
        },
      ],
      answer:
        params.shift === 0
          ? ['Yes']
          : params.shift === 1
            ? ['No, it is 10 or more', 'Go up by one']
            : ['No, it is less than 1', 'Go down by one'],
    };
  },
  solution: (params) => {
    const shown = shownOf(params);
    const written = `${shown.front} \\times ${tenTex(shown.n)}`;
    if (params.shift === 0) {
      return [
        {
          text: `$${shown.front}$ is at least 1 and less than 10, and it multiplies a power of ten, so $${written}$ is already in standard form.`,
        },
        { tex: `1 \\le ${shown.front} < 10` },
      ];
    }
    if (params.shift === 1) {
      return [
        {
          text: `$${shown.front}$ is 10 or more, so the point moves one place left and the front number becomes ten times smaller.`,
        },
        {
          text: 'To keep the value the same, the power of ten has to make up for it by becoming ten times bigger — up by one.',
        },
        { tex: `${written} = ${frontOf(params.sf.digits)} \\times 10 \\times ${tenTex(shown.n)} = ${sfTex(params.sf)}` },
      ];
    }
    return [
      {
        text: `$${shown.front}$ is less than 1, so the point moves one place right and the front number becomes ten times bigger.`,
      },
      {
        text: 'To keep the value the same, the power of ten has to become ten times smaller — down by one.',
      },
      { tex: `${written} = ${frontOf(params.sf.digits)} \\times 10^{-1} \\times ${tenTex(shown.n)} = ${sfTex(params.sf)}` },
    ];
  },
};

interface AdjustParams {
  sf: Sf;
  /** How many places the written front number is off: 2 is a hundred times too big. */
  shift: number;
}

/**
 * A number not quite in standard form, put right.
 *
 * What multiplying and adding leave behind: `15 \times 10^{10}` from a product,
 * `0.4 \times 10^{5}` from a quotient. Placed rather than typed, because the
 * value is unchanged and only the form is being asked about.
 */
const sfAdjustTiles: Generator<AdjustParams> = {
  id: 'sf-adjust-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      sf: drawSf(rng, hard ? rng.pick(['large', 'small'] as const) : 'large', difficulty),
      shift: rng.pick(hard ? [-2, -1, 1, 2] : [-1, 1]),
    };
  },
  render: ({ sf, shift }): Slide => {
    const shownFront = plainOf({ ...sf, n: shift });
    const answer = [frontOf(sf.digits), tenTex(sf.n)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Rewrite this in standard form, without changing its value.' },
        { kind: 'display', tex: `${shownFront} \\times ${tenTex(sf.n - shift)}` },
      ],
      template: '{0} \\times {1}',
      bank: fillBank(answer, [
        shownFront,
        plainOf({ ...sf, n: -shift }),
        tenTex(sf.n - shift),
        tenTex(sf.n - 2 * shift),
      ]),
      answer,
    };
  },
  solution: ({ sf, shift }) => {
    const shownFront = plainOf({ ...sf, n: shift });
    const k = Math.abs(shift);
    return [
      {
        text:
          shift > 0
            ? `$${shownFront}$ is too big for a front number. Moving the point ${places(k)} left makes it $${frontOf(sf.digits)}$, which is $${tenPlainTex(k)}$ times smaller.`
            : `$${shownFront}$ is too small for a front number. Moving the point ${places(k)} right makes it $${frontOf(sf.digits)}$, which is $${tenPlainTex(k)}$ times bigger.`,
      },
      {
        text:
          shift > 0
            ? `So the power goes up by $${k}$ to make up for it.`
            : `So the power goes down by $${k}$ to make up for it.`,
      },
      { tex: `${shownFront} \\times ${tenTex(sf.n - shift)} = ${sfTex(sf)}` },
    ];
  },
};

/* Multiplying and dividing */

interface ProductParams {
  a: Sf;
  b: Sf;
  op: '*' | '/';
  /** `a × b` or `a ÷ b`, already in standard form. */
  result: Sf;
}

/**
 * Two numbers and their product, all in standard form.
 *
 * Drawn as the two factors and multiplied out in whole numbers; a quotient is
 * the same draw read backwards — the product divided by one factor gives the
 * other — which is what guarantees every division comes out exact. The answer
 * is kept to three significant figures, so the arithmetic stays about the
 * powers rather than long multiplication. Nothing goes below 10^-6, where a
 * distractor a place out sits inside the checker's absolute tolerance (see
 * `drawSf`).
 */
function drawProduct(rng: Rng, difficulty: number, op: '*' | '/'): ProductParams {
  const hard = difficulty > 1;
  const power = () => (hard ? nonZeroInt(rng, -6, 8) : rng.int(2, 7));
  for (;;) {
    const x: Sf = { digits: drawDigits(rng, rng.int(1, 2)), n: power() };
    const y: Sf = { digits: drawDigits(rng, hard ? rng.int(1, 2) : 1), n: power() };
    const wx = wholeOf(x);
    const wy = wholeOf(y);
    const z = sfOf(wx.m * wy.m, wx.e + wy.e);
    if (z.digits.length > 3 || Math.min(x.n, z.n) < -6) continue;
    return op === '*' ? { a: x, b: y, op, result: z } : { a: z, b: y, op, result: x };
  }
}

/** What the front numbers come to before any adjusting: 3 × 5 is 15, 2 ÷ 5 is 0.4. */
function frontCombined({ a, b, op, result }: ProductParams): string {
  const powers = op === '*' ? a.n + b.n : a.n - b.n;
  return plainOf({ digits: result.digits, n: result.n - powers });
}

/** What the powers come to before any adjusting. */
function powerCombined({ a, b, op }: ProductParams): number {
  return op === '*' ? a.n + b.n : a.n - b.n;
}

/** The front numbers added, the slip of treating a product like a sum. */
function frontSum(a: Sf, b: Sf): { m: number; e: number } {
  return combine(frontValue(a.digits), frontValue(b.digits), '+');
}

/** The question as the learner reads it. */
function productTex({ a, b, op }: ProductParams): string {
  return op === '*'
    ? `\\left(${sfTex(a)}\\right) \\times \\left(${sfTex(b)}\\right)`
    : `\\frac{${sfTex(a)}}{${sfTex(b)}}`;
}

/** The worked solution, shared by the tiles and the tree. */
function productSolution(params: ProductParams) {
  const { a, b, op, result } = params;
  const front = frontCombined(params);
  const power = powerCombined(params);
  const adjusted = front !== frontOf(result.digits);
  const steps = [
    {
      text:
        op === '*'
          ? 'Multiplying can be done in any order, so multiply the front numbers together and the powers of ten together. The powers add.'
          : 'Divide the front numbers, and divide the powers of ten. The powers subtract, top minus bottom.',
    },
    {
      tex:
        op === '*'
          ? `${frontOf(a.digits)} \\times ${frontOf(b.digits)} = ${front} \\qquad 10^{${a.n}} \\times 10^{${b.n}} = ${tenTex(power)}`
          : `${frontOf(a.digits)} \\div ${frontOf(b.digits)} = ${front} \\qquad 10^{${a.n}} \\div 10^{${b.n}} = ${tenTex(power)}`,
    },
  ];
  if (!adjusted) {
    return [
      ...steps,
      {
        text: `$${front}$ is already between 1 and 10, so $${sfTex(result)}$ is the answer as it stands.`,
      },
    ];
  }
  return [
    ...steps,
    {
      text:
        result.n > power
          ? `$${front}$ is 10 or more, so it is not in standard form yet. Moving the point one place left makes the front number ten times smaller, and the power goes up by one to make up for it.`
          : `$${front}$ is less than 1, so it is not in standard form yet. Moving the point one place right makes the front number ten times bigger, and the power goes down by one to make up for it.`,
    },
    { tex: `${front} \\times ${tenTex(power)} = ${sfTex(result)}` },
  ];
}

/**
 * Multiplying in standard form, placed.
 *
 * The blanks separate the two things that go wrong: the front number (adding
 * them, or leaving `15` unadjusted) and the power (multiplying the powers, or
 * forgetting the one carried from adjusting).
 */
const sfMultiply: Generator<ProductParams> = {
  id: 'sf-multiply',
  choices: (params) => {
    const { a, b, result } = params;
    const sum = frontSum(a, b);
    return sfOptions(
      result,
      sfOf(sum.m, sum.e + a.n + b.n),
      { digits: result.digits, n: a.n * b.n },
      { digits: result.digits, n: result.n - 1 },
      { digits: result.digits, n: result.n + 1 },
    );
  },
  sample: (rng, difficulty) => drawProduct(rng, difficulty, '*'),
  render: (params): Slide => {
    const { a, b, result } = params;
    const sum = frontSum(a, b);
    const answer = [frontOf(result.digits), tenTex(result.n)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work this out, giving the answer in standard form.' },
        { kind: 'display', tex: productTex(params) },
      ],
      template: '{0} \\times {1}',
      bank: fillBank(answer, [
        frontCombined(params),
        decimalOf(sum.m, sum.e),
        tenTex(a.n * b.n),
        tenTex(powerCombined(params)),
        tenTex(result.n + 1),
      ]),
      answer,
    };
  },
  solution: productSolution,
};

/** Dividing in standard form, placed. */
const sfDivide: Generator<ProductParams> = {
  id: 'sf-divide',
  choices: (params) => {
    const { a, b, result } = params;
    return sfOptions(
      result,
      { digits: result.digits, n: a.n + b.n },
      { digits: result.digits, n: result.n + 1 },
      { digits: result.digits, n: result.n - 1 },
    );
  },
  sample: (rng, difficulty) => drawProduct(rng, difficulty, '/'),
  render: (params): Slide => {
    const { a, b, result } = params;
    const answer = [frontOf(result.digits), tenTex(result.n)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work this out, giving the answer in standard form.' },
        { kind: 'display', tex: productTex(params) },
      ],
      template: '{0} \\times {1}',
      bank: fillBank(answer, [
        frontCombined(params),
        plainOf({ digits: result.digits, n: 1 }),
        tenTex(a.n + b.n),
        tenTex(powerCombined(params)),
        tenTex(result.n + 1),
      ]),
      answer,
    };
  },
  solution: productSolution,
};

/**
 * The same calculation with its working laid out: the front numbers, the
 * powers, and the two brought together.
 *
 * The tiles version asks only for the finished answer, and a learner who has
 * the right answer by luck and a learner who has it by method look the same
 * there. Here the middle row is graded too, so `15` and `10^{10}` have to be
 * placed before `1.5 \times 10^{11}` — and the adjusting step, which is the
 * one that gets forgotten, is a row of its own.
 */
const sfSplitTree: Generator<ProductParams> = {
  id: 'sf-split-tree',
  sample: (rng, difficulty) =>
    drawProduct(rng, difficulty, difficulty > 1 ? rng.pick(['*', '/'] as const) : '*'),
  render: (params): Slide => {
    const { a, b, op, result } = params;
    const front = frontCombined(params);
    const power = powerCombined(params);
    const answer = [front, tenTex(power), sfTex(result)];
    const sum = frontSum(a, b);
    const distractors =
      op === '*'
        ? [
            decimalOf(sum.m, sum.e),
            tenTex(a.n * b.n),
            `${frontOf(result.digits)} \\times ${tenTex(power)}`,
            `${frontOf(result.digits)} \\times ${tenTex(result.n + 1)}`,
            tenTex(power + 1),
          ]
        : [
            tenTex(a.n + b.n),
            plainOf({ digits: result.digits, n: 1 }),
            `${frontOf(result.digits)} \\times ${tenTex(power)}`,
            `${frontOf(result.digits)} \\times ${tenTex(result.n + 1)}`,
            tenTex(power - 1),
          ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text:
            op === '*'
              ? 'Multiply the front numbers on the left and the powers of ten on the right, then bring them together in standard form underneath.'
              : 'Divide the front numbers on the left and the powers of ten on the right, then bring them together in standard form underneath.',
        },
      ],
      expression: productTex(params),
      nodes: [
        { id: 'front', from: [] },
        { id: 'power', from: [] },
        { id: 'result', from: ['front', 'power'] },
      ],
      bank: fillBank(answer, distractors),
      answer,
    };
  },
  solution: productSolution,
};

/* Adding and subtracting */

interface SumParams {
  a: Sf;
  b: Sf;
  op: '+' | '-';
  /** `a ± b`, in standard form. */
  result: Sf;
}

/**
 * Two numbers to add or subtract, the first with the larger power.
 *
 * `gap` is how far apart the powers are, drawn by the caller: a gap of 0 is
 * the easy case where the front numbers combine as they stand. The answer is
 * kept to three significant figures and under 10^8 (see `drawSf`), and a
 * difference is always positive.
 */
function drawSum(rng: Rng, difficulty: number, gap: number): SumParams {
  const hard = difficulty > 1;
  for (;;) {
    const na = hard ? nonZeroInt(rng, -5, 7) : rng.int(3, 6);
    const a: Sf = { digits: drawDigits(rng, 2), n: na };
    const b: Sf = { digits: drawDigits(rng, rng.int(1, 2)), n: na - gap };
    const op = rng.pick(['+', '-'] as const);
    const total = combine(wholeOf(a), wholeOf(b), op);
    if (total.m <= 0) continue;
    const result = sfOf(total.m, total.e);
    if (result.digits.length > 3 || result.n > 7) continue;
    return { a, b, op, result };
  }
}

/** The question as the learner reads it. */
function sumTex({ a, b, op }: SumParams): string {
  return `${sfTex(a)} ${op} ${sfTex(b)}`;
}

/** `b`'s front number once it is written over `a`'s power: 5 × 10^3 is 0.5 × 10^4. */
function rescaled({ a, b }: SumParams): string {
  const w = wholeOf(b);
  return decimalOf(w.m, w.e - a.n);
}

/** The front numbers combined once both share `a`'s power. */
function combinedFront(params: SumParams): string {
  const w = wholeOf(params.result);
  return decimalOf(w.m, w.e - params.a.n);
}

/** The worked solution, shared by every adding and subtracting question. */
function sumSolution(params: SumParams) {
  const { a, b, op, result } = params;
  const word = op === '+' ? 'add' : 'subtract';
  const same = a.n === b.n;
  const combined = combinedFront(params);
  const steps: { text?: string; tex?: string }[] = same
    ? [
        {
          text: `The powers are both $${tenTex(a.n)}$, so the front numbers can be ${op === '+' ? 'added' : 'subtracted'} straight away, like counting ${op === '+' ? 'up' : 'down'} in lots of $${tenTex(a.n)}$.`,
        },
      ]
    : [
        {
          text: `The powers differ, so the front numbers cannot simply be ${op === '+' ? 'added' : 'subtracted'}. Rewrite $${sfTex(b)}$ with the larger power first: its front number becomes smaller to match.`,
        },
        { tex: `${sfTex(b)} = ${rescaled(params)} \\times ${tenTex(a.n)}` },
      ];
  steps.push({
    tex: `${frontOf(a.digits)} \\times ${tenTex(a.n)} ${op} ${rescaled(params)} \\times ${tenTex(a.n)} = ${combined} \\times ${tenTex(a.n)}`,
  });
  if (combined !== frontOf(result.digits)) {
    steps.push({
      text: `$${combined}$ is not between 1 and 10, so ${word}ing has knocked it out of standard form. Adjust it: $${combined} \\times ${tenTex(a.n)} = ${sfTex(result)}$.`,
    });
  }
  steps.push({ text: `Written out in full, that is $${ordinaryTex(result)}$.` });
  return steps;
}

/**
 * Adding or subtracting, typed as an ordinary number.
 *
 * Digits and a point only on the keypad, for the same reason as reading
 * standard form: without `\times` and `^` the question cannot be typed back.
 * The multiple-choice form offers the answer in standard form beside the
 * three slips — the front numbers combined without matching the powers, the
 * powers added as if it were a product, and the power left one out after
 * adjusting.
 */
const sfAdd: Generator<SumParams> = {
  id: 'sf-add',
  choices: (params) => {
    const { a, b, op, result } = params;
    const naive = combine(frontValue(a.digits), frontValue(b.digits), op);
    const slips: Sf[] = [];
    if (naive.m > 0) {
      slips.push(sfOf(naive.m, naive.e + a.n));
      slips.push(sfOf(naive.m, naive.e + a.n + b.n));
    }
    slips.push({ digits: result.digits, n: result.n + 1 }, { digits: result.digits, n: result.n - 1 });
    return sfOptions(result, ...slips);
  },
  sample: (rng, difficulty) => drawSum(rng, difficulty, rng.int(0, difficulty > 1 ? 2 : 1)),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Work this out.' }],
    lead: `${sumTex(params)} =`,
    keypad: [],
    answer: plainOf(params.result),
    domain: 'real',
    mode: 'exact',
  }),
  solution: sumSolution,
};

/** The power as a tiles template can hold it: no braces round a bare number. */
function templatePower(n: number): string {
  return n >= 0 && n <= 9 ? `10^${n}` : `10^{${n}}`;
}

/**
 * Matching the powers, then combining the front numbers, placed.
 *
 * The power of ten is written into the template three times so the learner
 * is only placing front numbers — and the one that has to change, the second,
 * sits beside itself unchanged and ten times the wrong way.
 */
const sfCommonPower: Generator<SumParams> = {
  id: 'sf-common-power',
  sample: (rng, difficulty) => {
    // The template writes the power bare, which only works for one digit. And
    // 1.2 - 0.6 = 0.6 would need the same tile twice, reading as one tile
    // placed in two blanks.
    for (;;) {
      const drawn = drawSum(rng, difficulty, rng.int(1, difficulty > 1 ? 2 : 1));
      if (drawn.a.n <= 9 && combinedFront(drawn) !== rescaled(drawn)) return drawn;
    }
  },
  render: (params): Slide => {
    const { a, b, op } = params;
    const gap = a.n - b.n;
    const power = templatePower(a.n);
    const answer = [frontOf(a.digits), rescaled(params), combinedFront(params)];
    const naive = combine(frontValue(a.digits), frontValue(b.digits), op);
    const bw = frontValue(b.digits);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Write both numbers with the same power of ten, then ${op === '+' ? 'add' : 'subtract'} the front numbers.`,
        },
        { kind: 'display', tex: sumTex(params) },
      ],
      template: `{0} \\times ${power} ${op} {1} \\times ${power} = {2} \\times ${power}`,
      bank: fillBank(answer, [
        frontOf(b.digits),
        decimalOf(bw.m, bw.e + gap),
        ...(naive.m > 0 ? [decimalOf(naive.m, naive.e)] : []),
      ]),
      answer,
    };
  },
  solution: sumSolution,
};

interface SumRouteParams extends SumParams {
  route: 'rewrite' | 'fits' | 'adjust';
}

/**
 * What does this sum need before it can be done?
 *
 * Three routes: the powers differ, so one number is rewritten first; they
 * match and the front numbers combine cleanly; or they match and the result
 * falls out of standard form and needs adjusting. The rewrite route asks
 * which way the front number moves, which is the step that is done backwards.
 */
const sfAddFlow: Generator<SumRouteParams> = {
  id: 'sf-add-flow',
  sample: (rng, difficulty) => {
    const route = rng.pick(['rewrite', 'fits', 'adjust'] as const);
    for (;;) {
      const drawn = drawSum(rng, difficulty, route === 'rewrite' ? rng.int(1, difficulty > 1 ? 2 : 1) : 0);
      if (route === 'rewrite') return { ...drawn, route };
      const fits = combinedFront(drawn) === frontOf(drawn.result.digits);
      if (fits === (route === 'fits')) return { ...drawn, route };
    }
  },
  render: (params): Slide => {
    const { a, b, op, route } = params;
    const gap = a.n - b.n;
    const factor = gap === 2 ? '100' : '10';
    const bw = frontValue(b.digits);
    const combined = combinedFront(params);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Decide what this needs before it can be worked out. Each answer chooses what gets asked next.',
        },
      ],
      subject: sumTex(params),
      steps: [
        {
          id: 'same',
          ask: 'Are the two powers of ten the same?',
          branches: [
            { label: 'Yes', to: 'fits' },
            { label: 'No', to: 'how' },
          ],
        },
        {
          id: 'how',
          ask: `To write $${sfTex(b)}$ with the power $${tenTex(a.n)}$, what happens to its front number?`,
          branches: [
            {
              label: `It is divided by ${factor}`,
              outcome: `It becomes $${rescaled(params)} \\times ${tenTex(a.n)}$, and the front numbers can then be combined.`,
            },
            {
              label: `It is multiplied by ${factor}`,
              outcome: `It becomes $${decimalOf(bw.m, bw.e + Math.max(gap, 1))} \\times ${tenTex(a.n)}$, and the front numbers can then be combined.`,
            },
          ],
        },
        {
          id: 'fits',
          ask: `${op === '+' ? 'Add' : 'Subtract'} the front numbers. Is the result at least 1 and less than 10?`,
          branches: [
            { label: 'Yes', outcome: `Then $${combined} \\times ${tenTex(a.n)}$ is already in standard form.` },
            { label: 'No', outcome: `Then $${combined} \\times ${tenTex(a.n)}$ has to be adjusted into standard form.` },
          ],
        },
      ],
      answer:
        route === 'rewrite'
          ? ['No', `It is divided by ${factor}`]
          : route === 'fits'
            ? ['Yes', 'Yes']
            : ['Yes', 'No'],
    };
  },
  solution: sumSolution,
};

/* Orders of magnitude */

interface CompareParams {
  /** The lower of the two powers in play. */
  p: number;
  /** Front numbers: two under the higher power, two under the lower one. */
  high: [string, string];
  low: [string, string];
  ask: 'largest' | 'smallest';
}

/** Two-figure front numbers in a range, never ending in zero. */
function twoFigures(rng: Rng, min: number, max: number): string {
  for (;;) {
    const value = rng.int(min, max);
    if (value % 10 !== 0) return `${value}`;
  }
}

/**
 * Which is largest, or smallest?
 *
 * Built so that reading the front numbers gives the wrong answer. The largest
 * number has a small front number and the higher power; the biggest front
 * number sits under the lower power. Asked for the smallest, the smallest
 * front number is the trap in the same way.
 */
const sfCompare: Generator<CompareParams> = {
  id: 'sf-compare',
  sample: (rng, difficulty) => {
    const f1 = twoFigures(rng, 11, 29);
    const f2 = twoFigures(rng, 31, 59);
    let g1 = twoFigures(rng, Number(f1) + 1, 69);
    while (g1 === f2) g1 = twoFigures(rng, Number(f1) + 1, 69);
    return {
      p: difficulty > 1 ? rng.int(-6, 6) : rng.int(2, 6),
      high: [f1, f2],
      low: [g1, twoFigures(rng, 71, 99)],
      ask: rng.pick(['largest', 'smallest'] as const),
    };
  },
  render: ({ p, high, low, ask }): Slide => {
    const options = [
      { id: 'high-small', label: sfTex({ digits: high[0], n: p + 1 }), tex: true },
      { id: 'high-big', label: sfTex({ digits: high[1], n: p + 1 }), tex: true },
      { id: 'low-small', label: sfTex({ digits: low[0], n: p }), tex: true },
      { id: 'low-big', label: sfTex({ digits: low[1], n: p }), tex: true },
    ];
    // Turned by the question's own numbers, never by the rng, so one question
    // always renders one way for the deck de-duplicator.
    const turn = (((Number(high[0]) + Number(low[1]) + p) % 4) + 4) % 4;
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which of these numbers is the ${ask}?` }],
      options: [...options.slice(turn), ...options.slice(0, turn)],
      correctId: ask === 'largest' ? 'high-big' : 'low-small',
    };
  },
  solution: ({ p, high, low, ask }) => {
    const answer = ask === 'largest' ? { digits: high[1], n: p + 1 } : { digits: low[0], n: p };
    return [
      {
        text: `Compare the powers first. Anything times $${tenTex(p + 1)}$ is at least $${tenTex(p + 1)}$, and anything times $${tenTex(p)}$ with a front number under 10 is less than that — so the power decides before the front number does.`,
      },
      {
        text:
          ask === 'largest'
            ? `The two with $${tenTex(p + 1)}$ are the big ones, and of those $${frontOf(high[1])}$ is the larger front number.`
            : `The two with $${tenTex(p)}$ are the small ones, and of those $${frontOf(low[0])}$ is the smaller front number.`,
      },
      { tex: `${sfTex(answer)}` },
      {
        text:
          ask === 'largest'
            ? `$${sfTex({ digits: low[1], n: p })}$ has the biggest front number and is still smaller, because its power is lower.`
            : `$${sfTex({ digits: high[0], n: p + 1 })}$ has the smallest front number and is still larger, because its power is higher.`,
      },
    ];
  },
};

interface TimesParams {
  small: Sf;
  big: Sf;
  /** The ratio's front number: 1 when the two front numbers match. */
  k: number;
  gap: number;
}

/**
 * How many times bigger is one number than another?
 *
 * The question an order of magnitude answers. With matching front numbers it
 * is a pure power of ten, one followed by as many zeros as the powers differ
 * by; at difficulty 2 the front numbers differ by a whole factor too. Typed on
 * a digits-only keypad, so the answer has to be written out.
 */
const sfTimesBigger: Generator<TimesParams> = {
  id: 'sf-times-bigger',
  choices: ({ k, gap }) => {
    const value = (g: number) => `${k}${'0'.repeat(g)}`;
    return options(
      { tex: grouped(value(gap)), answer: value(gap) },
      { tex: grouped(value(gap - 1)), answer: value(gap - 1) },
      { tex: grouped(value(gap + 1)), answer: value(gap + 1) },
      { tex: `${gap}`, answer: `${gap}` },
    );
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const small: Sf = {
        digits: drawDigits(rng, rng.int(1, 2)),
        n: hard ? nonZeroInt(rng, -6, 5) : rng.int(2, 5),
      };
      const k = hard ? rng.int(2, 5) : 1;
      const gap = rng.int(hard ? 1 : 2, hard ? 6 : 5);
      const w = wholeOf(small);
      const big = sfOf(w.m * k, w.e + gap);
      // No carry: the bigger number's front number is k times the smaller's.
      if (big.n !== small.n + gap) continue;
      return { small, big, k, gap };
    }
  },
  render: ({ small, big, k, gap }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `How many times larger is $${sfTex(big)}$ than $${sfTex(small)}$?`,
      },
    ],
    lead: `\\frac{${sfTex(big)}}{${sfTex(small)}} =`,
    keypad: [],
    answer: `${k}${'0'.repeat(gap)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ small, big, k, gap }) => [
    { text: 'How many times larger means divide one by the other. Front numbers and powers divide separately.' },
    {
      tex: `${frontOf(big.digits)} \\div ${frontOf(small.digits)} = ${k} \\qquad ${tenTex(big.n)} \\div ${tenTex(small.n)} = ${tenTex(gap)}`,
    },
    {
      text:
        k === 1
          ? `The front numbers match, so the answer is the power of ten alone: $${tenTex(gap)} = ${grouped(`1${'0'.repeat(gap)}`)}$. The powers differ by $${gap}$, which is the number of zeros — not the answer itself.`
          : `So it is $${k} \\times ${tenTex(gap)} = ${grouped(`${k}${'0'.repeat(gap)}`)}$. The powers differ by $${gap}$, which is the number of zeros — not the answer itself.`,
    },
  ],
};

interface EstimateParams {
  a: Sf;
  b: Sf;
  /** Each front number rounded to one significant figure. */
  ra: number;
  rb: number;
  estimate: Sf;
}

/** A two-figure front number that rounds cleanly to one figure, never up to 10. */
function roundable(rng: Rng): string {
  for (;;) {
    const digits = drawDigits(rng, 2);
    // x.5 is a coin toss between two roundings, and 9.5 or more rounds to 10.
    if (digits[1] !== '5' && Math.round(Number(digits) / 10) <= 9) return digits;
  }
}

/**
 * An estimate by rounding each front number to one figure first.
 *
 * What orders of magnitude are for: `3.9 \times 10^{4}` times `2.1 \times
 * 10^{3}` is about `8 \times 10^{7}`, and no exact arithmetic is needed to
 * know it. Placed, because the estimate is an answer about form as much as
 * value.
 */
const sfEstimate: Generator<EstimateParams> = {
  id: 'sf-estimate',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const power = () => (hard ? nonZeroInt(rng, -5, 7) : rng.int(2, 6));
    const a: Sf = { digits: roundable(rng), n: power() };
    const b: Sf = { digits: roundable(rng), n: power() };
    const ra = Math.round(Number(a.digits) / 10);
    const rb = Math.round(Number(b.digits) / 10);
    return { a, b, ra, rb, estimate: sfOf(ra * rb, a.n + b.n) };
  },
  render: ({ a, b, ra, rb, estimate }): Slide => {
    const answer = [frontOf(estimate.digits), tenTex(estimate.n)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Estimate this by rounding each front number to one significant figure. Give the estimate in standard form.',
        },
        { kind: 'display', tex: `\\left(${sfTex(a)}\\right) \\times \\left(${sfTex(b)}\\right)` },
      ],
      template: '{0} \\times {1}',
      bank: fillBank(answer, [
        `${ra * rb}`,
        `${ra + rb}`,
        tenTex(a.n + b.n),
        tenTex(a.n * b.n),
        tenTex(estimate.n + 1),
      ]),
      answer,
    };
  },
  solution: ({ a, b, ra, rb, estimate }) => {
    const steps = [
      {
        text: `Round each front number to one figure: $${frontOf(a.digits)}$ is about $${ra}$ and $${frontOf(b.digits)}$ is about $${rb}$.`,
      },
      {
        tex: `${ra} \\times ${rb} = ${ra * rb} \\qquad ${tenTex(a.n)} \\times ${tenTex(b.n)} = ${tenTex(a.n + b.n)}`,
      },
    ];
    if (ra * rb >= 10) {
      return [
        ...steps,
        {
          text: `$${ra * rb}$ is too big for a front number, so adjust: $${ra * rb} \\times ${tenTex(a.n + b.n)} = ${sfTex(estimate)}$.`,
        },
      ];
    }
    return [
      ...steps,
      {
        text: `So the product is about $${sfTex(estimate)}$. The exact answer will differ a little in the front number; the power is what the estimate is for.`,
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
  fillRoot,
  fillFractional,
  chooseRootRoute,
  matchBase,
  fillSimplifySurd,
  estimateSurd,
  fillRationalise,
  sfToOrdinary,
  sfSmallToOrdinary,
  sfWriteTiles,
  sfWriteSmallTiles,
  sfPowerSlider,
  sfSmallPowerSlider,
  sfFormFlow,
  sfAdjustTiles,
  sfMultiply,
  sfDivide,
  sfSplitTree,
  sfAdd,
  sfCommonPower,
  sfAddFlow,
  sfCompare,
  sfTimesBigger,
  sfEstimate,
] as unknown as Generator<unknown>[];
