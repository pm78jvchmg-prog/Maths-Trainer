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
import type { ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { bin, num, pow, root, valueOf, type Expr } from '../expr';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg, plotFigure } from '../figures';
// Where a slider's handle rests before it is touched. Imported rather than
// restated so a question cannot be built against a rule the widget has moved.
import { defaultSliderValue } from '../../ui/sliderValue';
import { ALGEBRA_KEYS, termTex } from './calculus';
import { coeffTex, gcd, surdAnswer, surdParts, surdTex } from './format';
import type { Rng } from '../../engine/rng';
import { growthGenerators } from './growth';

/** Index work needs the algebra keys plus a root. */
const SURD_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'sqrt(' }];

/** Numbers whose square root does not simplify, for the surd questions. */
const SURD_FREE: number[] = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23];

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
      // Doubled is a*b too when 2(a + b) = ab, at 3 and 6 or 4 and 4.
      ...(2 * (a + b) === a * b ? [] : [{ tex: `${powerTex(a + b)}${powerTex(a + b)}`, answer: powerAnswer(2 * (a + b)) }]),
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
      text: `Multiplying powers of the same base adds the exponents, because $${powerTex(a)}$ is $${a}$ copies of $x$ and $${powerTex(b)}$ is $${b}$ more.`,
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
    // At c = 1 there is no coefficient to drag down, and the warning would read 1/(1x^a).
    ...(c === 1
      ? []
      : [
          {
            text: `Note the coefficient stays on top. $${termTex(c, -a)}$ is $\\frac{${c}}{x^{${a}}}$, not $\\frac{1}{${c}x^{${a}}}$ — only the $x$ carried the negative index.`,
          },
        ]),
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
  // The answer in its simplest form, since the question says simplify. A
  // perfect square or a square factor can make two slips land on one form, so
  // there are more slips than places and the first three distinct ones stay.
  choices: ({ a, b }) => {
    const { k, m } = surdParts(a * b);
    return options(
      { tex: surdTex(a * b), answer: surdAnswer(a * b) },
      ...(a + b === a * b ? [] : [{ tex: surdTex(a + b), answer: surdAnswer(a + b) }]),
      { tex: `${a * b}`, answer: `${a * b}` },
      // The square factor brought out without taking its root.
      ...(k > 1 && m > 1 ? [{ tex: `${k * k}\\sqrt{${m}}`, answer: `${k * k} * sqrt(${m})` }] : []),
      { tex: surdTex(4 * a * b), answer: surdAnswer(4 * a * b) },
      { tex: `${a}\\sqrt{${b}}`, answer: `${a} * sqrt(${b})` },
      { tex: `\\sqrt{${a}}`, answer: `sqrt(${a})` },
    ).slice(0, 4);
  },
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
  solution: ({ a, b }) => {
    const { k, m } = surdParts(a * b);
    // The product can hold a square factor, and the question says simplify.
    // When it is a perfect square outright, the root is a whole number.
    const simplify: SolutionStep[] =
      k === 1
        ? []
        : m === 1
          ? [{ text: `$${a * b}$ is a perfect square:` }, { tex: `\\sqrt{${a * b}} = ${k}` }]
          : [
              { text: `$${a * b}$ has the square factor $${k * k}$, which comes out as its root:` },
              { tex: `\\sqrt{${a * b}} = \\sqrt{${k * k}} \\times \\sqrt{${m}} = ${surdTex(a * b)}` },
            ];
    return [
      { text: 'Roots multiply straight across: the product of the roots is the root of the product.' },
      { tex: `\\sqrt{${a}} \\times \\sqrt{${b}} = \\sqrt{${a} \\times ${b}} = \\sqrt{${a * b}}` },
      ...simplify,
      {
        text: 'This works for multiplication and division, and for nothing else. $\\sqrt{a} + \\sqrt{b}$ is emphatically not $\\sqrt{a + b}$ — try it with $9$ and $16$.',
      },
    ];
  },
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
    const g = gcd(c, m);
    const options = [
      { id: 'rationalised', label: rationalisedTex(c, m), tex: true },
      { id: 'bottom-only', label: m === g ? `${c / g}` : `\\frac{${c / g}}{${m / g}}`, tex: true },
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
      tex: `\\frac{${c}}{\\sqrt{${m}}} \\times \\frac{\\sqrt{${m}}}{\\sqrt{${m}}} = \\frac{${c}\\sqrt{${m}}}{${m}}${gcd(c, m) === 1 ? '' : ` = ${rationalisedTex(c, m)}`}`,
    },
    {
      text: `The denominator becomes $${m}$ because $\\sqrt{${m}} \\times \\sqrt{${m}} = ${m}$ by definition.${gcd(c, m) === 1 ? '' : ` Then $${c}$ and $${m}$ share a factor of $${gcd(c, m)}$, which cancels.`} A whole number underneath is easier to work with and easier to compare, which is the whole reason for doing this.`,
    },
  ],
};

/** c√m over m with the whole numbers cancelled: 11√11/11 is √11, 6√3/3 is 2√3. */
function rationalisedTex(c: number, m: number): string {
  const g = gcd(c, m);
  const top = `${c / g === 1 ? '' : c / g}\\sqrt{${m}}`;
  return m / g === 1 ? top : `\\frac{${top}}{${m / g}}`;
}

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
          text: `The $${d}$ underneath names the root, and the 1 on top leaves it at that — so this is simply ${ROOT_NAMES[d].toLowerCase()} of $${base}$.`,
        },
        { tex: `${base}^{\\frac{1}{${d}}} = ${rootOf(d, base)} = ${root}` },
        {
          text: `A 1 on top is easy to read past. It is the only case where the index does one job rather than two.`,
        },
      ];
    }
    return [
      {
        text: `The $${d}$ underneath names the root and the $${n}$ on top names the power, so this reads as ${ROOT_NAMES[d].toLowerCase()} of $${base}$, then raised to the power $${n}$.`,
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
      figure: plotFigure(plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: span * span,
          curves: [{ f: (x) => x * x }],
          horizontals: [n],
          label: `The curve y equals x squared, with a dashed line at y equals ${n}`,
        })),
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
 * maps exactly onto the 280 units across. The number itself is not marked:
 * the owner found the dot that did so an unexplained grey blob, and took it out.
 */
function powerLineSvg(): string {
  const width = 280;
  const height = 56;
  const axis = 22;
  const x = (v: number) => (((v + 10) / 20) * width).toFixed(1);
  const parts = [
    `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="A line of powers of ten from ten to the minus nine up to ten to the nine">`,
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
  parts.push('</svg>');
  return parts.join('');
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
function powerSlider(id: string, scale: Scale): Generator<Sf> {
  return {
    id,
    sample: (rng, difficulty) => drawSf(rng, scale, difficulty),
    render: (params): Slide => ({
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `Slide to the power of ten that writes $${ordinaryTex(params)}$ in standard form.`,
        },
      ],
      min: -9,
      max: 9,
      step: 1,
      answer: params.n,
      readout: `${frontOf(params.digits)} \\times 10^{{v}}`,
      figure: { svg: powerLineSvg(), xMin: -10, xMax: 10 },
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

/* ---------- Level 5: manipulating surd expressions ---------- */

/*
 * Everything in this level ends in the form p + q√d, and one rule shapes how it
 * is asked. The checker compares values, so a typed expansion would accept the
 * question typed straight back — `3(2 + sqrt(5))` equals its own expansion.
 * Where the form is the skill, the answer is placed as tiles or picked from
 * options. Typed answers here are whole numbers only (a part read off, or a
 * product that comes out rational), on a keypad with no root key, so there is
 * no question to type back.
 */

/** Radicands for the easier draws: small and square-free. */
const FREE_EASY: number[] = SURD_FREE.slice(0, 6);

/** Radicands for the harder draws. */
const FREE_HARD: number[] = SURD_FREE.slice(0, 12);

/** Whole-number answers need digits and a minus sign, and nothing to type a root with. */
const WHOLE_KEYS: KeypadKey[] = [];

/** k√m as it is written by hand: √5, 3√5. */
function kSurd(k: number, m: number): string {
  return k === 1 ? `\\sqrt{${m}}` : `${k}\\sqrt{${m}}`;
}

/** p + q√m as the learner reads it, with the sign folded in: 4 - 3√2, -1 + √7. */
function formTex(p: number, q: number, m: number): string {
  if (q === 0) return `${p}`;
  const surd = kSurd(Math.abs(q), m);
  if (p === 0) return q < 0 ? `-${surd}` : surd;
  return `${p} ${q < 0 ? '-' : '+'} ${surd}`;
}

/**
 * Lines of working stacked in one display and aligned on their `&`. A chain of
 * equals signs on one line runs off a phone screen after about three terms,
 * and a solution panel is narrower than a teaching slide.
 */
function chain(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** The same value for mathjs. Never displayed. */
function formAnswer(p: number, q: number, m: number): string {
  return `(${p}) + (${q}) * sqrt(${m})`;
}

/** `+` or `-` for a sign, as it sits between two terms. */
function signOf(sign: number): string {
  return sign < 0 ? '-' : '+';
}

/** A leading minus for a negative sign, nothing for a positive one. */
function minus(sign: number): string {
  return sign < 0 ? '-' : '';
}

/**
 * A tiles template and answer for p + q√m: the whole number in the first blank,
 * the surd in the second, and the sign between them written into the template.
 */
function formTiles(p: number, q: number, m: number, before = '', after = '') {
  return {
    template: `${before}{0} ${signOf(q)} {1}${after}`,
    answer: [`${p}`, kSurd(Math.abs(q), m)],
  };
}

/** The largest k with k^2 dividing n. */
function squarePart(n: number): number {
  let k = 1;
  for (let f = 2; f * f <= n; f += 1) if (n % (f * f) === 0) k = f;
  return k;
}

/* Expanding a single bracket */

interface ExpandSingleParams {
  /** `number`: a(b ± c√d). `root`: √d(c√d ± b). */
  shape: 'number' | 'root';
  a: number;
  b: number;
  c: number;
  d: number;
  sign: number;
}

/** The expansion as p + q√d. */
function expandSingle({ shape, a, b, c, d, sign }: ExpandSingleParams): { p: number; q: number } {
  return shape === 'number' ? { p: a * b, q: sign * a * c } : { p: c * d, q: sign * b };
}

function expandSingleTex({ shape, a, b, c, d, sign }: ExpandSingleParams): string {
  return shape === 'number'
    ? `${a}(${b} ${signOf(sign)} ${kSurd(c, d)})`
    : `\\sqrt{${d}}(${kSurd(c, d)} ${signOf(sign)} ${b})`;
}

/**
 * One bracket multiplied out, the whole number placed first.
 *
 * Two shapes, because they go wrong in different places. A number outside
 * multiplies both terms and the slip is forgetting the second one; a root
 * outside meets a matching root inside, and the slip is not seeing that
 * √d × √d is the whole number d — which is also what moves that term to the
 * front of the answer.
 */
const expandSingleBracket: Generator<ExpandSingleParams> = {
  id: 'rad-expand-single',
  choices: (params) => {
    const { shape, a, b, c, d, sign } = params;
    const { p, q } = expandSingle(params);
    const right = { tex: formTex(p, q, d), answer: formAnswer(p, q, d) };
    if (shape === 'number') {
      return options(
        right,
        { tex: formTex(a * b, sign * c, d), answer: formAnswer(a * b, sign * c, d) },
        { tex: formTex(b, sign * a * c, d), answer: formAnswer(b, sign * a * c, d) },
        { tex: formTex(a + b, sign * (a + c), d), answer: formAnswer(a + b, sign * (a + c), d) },
      );
    }
    return options(
      right,
      { tex: formTex(c, sign * b, d), answer: formAnswer(c, sign * b, d) },
      { tex: `${c * d} ${signOf(sign)} ${b}`, answer: `(${c * d}) + (${sign * b})` },
      { tex: formTex(c * d * d, sign * b, d), answer: formAnswer(c * d * d, sign * b, d) },
    );
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      shape: rng.chance(hard ? 0.5 : 0.25) ? 'root' : 'number',
      a: rng.int(2, hard ? 9 : 6),
      b: rng.int(1, 9),
      c: rng.int(1, hard ? 5 : 3),
      d: rng.pick(hard ? FREE_HARD : FREE_EASY),
      sign: hard ? rng.sign() : rng.chance(0.3) ? -1 : 1,
    };
  },
  render: (params): Slide => {
    const { shape, a, b, c, d } = params;
    const { p, q } = expandSingle(params);
    const { template, answer } = formTiles(p, q, d);
    const distractors =
      shape === 'number'
        ? [`${b}`, kSurd(c, d), `${a + b}`, kSurd(a + c, d)]
        : [`${c}`, `${c * d * d}`, `\\sqrt{${b * d}}`, `${b}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Expand the bracket and simplify. Put the whole number first.' },
        { kind: 'display', tex: expandSingleTex(params) },
      ],
      template,
      bank: fillBank(answer, distractors),
      answer,
    };
  },
  solution: (params) => {
    const { shape, a, b, c, d, sign } = params;
    const { p, q } = expandSingle(params);
    if (shape === 'number') {
      return [
        { text: `The $${a}$ outside multiplies **both** terms inside the bracket.` },
        { tex: chain(`${a} \\times ${b} &= ${a * b}`, `${a} \\times ${kSurd(c, d)} &= ${kSurd(a * c, d)}`) },
        { tex: `${expandSingleTex(params)} = ${formTex(p, q, d)}` },
        {
          text: `Multiplying only the first term would leave $${formTex(a * b, sign * c, d)}$, which is short by a factor of $${a}$ in the surd.`,
        },
      ];
    }
    return [
      { text: `The $\\sqrt{${d}}$ outside multiplies both terms inside.` },
      {
        tex: chain(
          `\\sqrt{${d}} \\times ${kSurd(c, d)} &= ${c} \\times ${d} = ${c * d}`,
          `\\sqrt{${d}} \\times ${b} &= ${kSurd(b, d)}`,
        ),
      },
      {
        text: `A root times itself is the number underneath, so the first product is a whole number. That is why it goes at the front: $${formTex(p, q, d)}$.`,
      },
    ];
  },
};

/* Deciding what a product of two surd terms comes to */

interface ProductFlowParams {
  route: 'same' | 'square' | 'plain';
  p: number;
  q: number;
  m: number;
  n: number;
}

/** Pairs of different radicands whose product hides a square, and pairs whose product does not. */
const RADICAND_PAIRS = FREE_HARD.flatMap((m) =>
  FREE_HARD.filter((n) => n > m && m * n <= 150).map((n) => ({ m, n })),
);
const SQUARE_PAIRS = RADICAND_PAIRS.filter(({ m, n }) => squarePart(m * n) > 1);
const PLAIN_PAIRS = RADICAND_PAIRS.filter(({ m, n }) => squarePart(m * n) === 1);

/**
 * Multiplying two surd terms: is the result whole, a surd that simplifies, or a
 * surd that stays as it is?
 *
 * Every term of an expansion is one of these products, and the three answers
 * send the term to different places — a whole number joins the other whole
 * numbers, a surd joins the surds. Asked as a decision rather than a sum so the
 * learner says *why* before saying what.
 */
const productFlow: Generator<ProductFlowParams> = {
  id: 'rad-product-flow',
  sample: (rng, difficulty) => {
    const route = rng.pick(['same', 'square', 'plain'] as const);
    const top = difficulty > 1 ? 5 : 3;
    const p = rng.int(1, top);
    const q = rng.int(1, top);
    if (route === 'same') {
      const m = rng.pick(difficulty > 1 ? FREE_HARD : FREE_EASY);
      return { route, p, q, m, n: m };
    }
    const pool = (route === 'square' ? SQUARE_PAIRS : PLAIN_PAIRS).filter(
      ({ m, n }) => difficulty > 1 || m * n <= 42,
    );
    const { m, n } = rng.pick(pool);
    return rng.chance(0.5) ? { route, p, q, m, n } : { route, p, q, m: n, n: m };
  },
  render: ({ route, p, q, m, n }): Slide => {
    const k = squarePart(m * n);
    const r = (m * n) / (k * k);
    const whole = [
      {
        label: `$${m}$`,
        outcome: `So the product is $${p * q} \\times ${m} = ${p * q * m}$, a whole number.`,
      },
      {
        label: `$${m * m}$`,
        outcome: `So the product would be $${p * q} \\times ${m * m} = ${p * q * m * m}$.`,
      },
      {
        label: `$2\\sqrt{${m}}$`,
        outcome: `So the product would be $${kSurd(2 * p * q, m)}$, still a surd.`,
      },
    ];
    // Turned by the question's own numbers, so the right answer is not always
    // the first button.
    const turn = (p + q + m) % whole.length;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Decide what this product comes to. Each answer chooses what gets asked next.',
        },
      ],
      subject: `${kSurd(p, m)} \\times ${kSurd(q, n)}`,
      steps: [
        {
          id: 'same',
          ask: 'Are the numbers under the two roots the same?',
          branches: [
            { label: 'Yes', to: 'whole' },
            { label: 'No', to: 'factor' },
          ],
        },
        {
          id: 'whole',
          ask: `What is $\\sqrt{${m}} \\times \\sqrt{${m}}$?`,
          branches: [...whole.slice(turn), ...whole.slice(0, turn)],
        },
        {
          id: 'factor',
          ask: `Under one root that is $\\sqrt{${m * n}}$. Does $${m * n}$ have a square factor bigger than 1?`,
          branches: [
            {
              label: 'Yes',
              outcome:
                route === 'square'
                  ? `Then take it out: $\\sqrt{${m * n}} = ${kSurd(k, r)}$, so the product is $${kSurd(p * q * k, r)}$.`
                  : `Then look for the largest square dividing $${m * n}$ and take its root outside.`,
            },
            {
              label: 'No',
              outcome:
                route === 'plain'
                  ? `So the product is $${kSurd(p * q, m * n)}$, and it cannot be simplified.`
                  : `Then the product stays as $${kSurd(p * q, m * n)}$.`,
            },
          ],
        },
      ],
      answer: route === 'same' ? ['Yes', `$${m}$`] : route === 'square' ? ['No', 'Yes'] : ['No', 'No'],
    };
  },
  solution: ({ route, p, q, m, n }) => {
    const k = squarePart(m * n);
    const r = (m * n) / (k * k);
    const head = {
      text: `Multiply the whole numbers and the roots separately: $${p} \\times ${q} = ${p * q}$, and $\\sqrt{${m}} \\times \\sqrt{${n}} = \\sqrt{${m * n}}$.`,
    };
    if (route === 'same') {
      return [
        head,
        { tex: `\\sqrt{${m}} \\times \\sqrt{${m}} = \\sqrt{${m * m}} = ${m}` },
        {
          text: `A root times itself is the number underneath, so the product is $${p * q * m}$ — a whole number, with no surd left in it.`,
        },
      ];
    }
    if (route === 'square') {
      return [
        head,
        { text: `$${m * n} = ${k * k} \\times ${r}$, and $${k * k}$ is a square, so it comes out as $${k}$.` },
        {
          tex: chain(`${kSurd(p, m)} \\times ${kSurd(q, n)} &= ${kSurd(p * q, m * n)}`, `&= ${kSurd(p * q * k, r)}`),
        },
      ];
    }
    return [
      head,
      {
        text: `$${m * n}$ has no square factor, so $${kSurd(p * q, m * n)}$ is already as simple as it gets.`,
      },
    ];
  },
};

/* A root times a bracket, where the product simplifies */

interface RootBracketParams {
  /** The square-free part left after simplifying √a × √b. */
  r: number;
  /** What comes out: √a × √b = x√r. */
  x: number;
  /** Which of the two roots carries the r. */
  swap: boolean;
  c: number;
  sign: number;
}

/** Coprime square-free pairs, so r·x is square-free and √(r·x) × √x = x√r. */
const ROOT_BRACKET_PAIRS = [2, 3, 5, 6, 7, 10, 11, 13].flatMap((r) =>
  [2, 3, 5, 6, 7].filter((x) => x !== r && gcd(r, x) === 1).map((x) => ({ r, x })),
);

function rootBracketRoots({ r, x, swap }: RootBracketParams): { a: number; b: number } {
  return swap ? { a: x, b: r * x } : { a: r * x, b: x };
}

/**
 * √a(√b ± c), worked on a tree: each term of the expansion on the top row,
 * and the two together underneath.
 *
 * The product of the roots is chosen to hide a square every time, and the
 * unsimplified product is in the bank — √6 × √3 is √18, and √18 is not
 * finished, so placing it is marked wrong. A separate simplifying row was
 * tried first; its connector had to run past it to reach the answer, and the
 * picture read as three terms feeding one.
 */
const rootBracketTree: Generator<RootBracketParams> = {
  id: 'rad-root-bracket-tree',
  sample: (rng, difficulty) => {
    const pool = ROOT_BRACKET_PAIRS.filter(({ r, x }) => r * x <= (difficulty > 1 ? 70 : 35));
    const { r, x } = rng.pick(pool);
    return {
      r,
      x,
      swap: rng.chance(0.5),
      c: rng.int(2, difficulty > 1 ? 9 : 6),
      sign: difficulty > 1 ? rng.sign() : 1,
    };
  },
  render: (params): Slide => {
    const { r, x, c, sign } = params;
    const { a, b } = rootBracketRoots(params);
    const answer = [
      kSurd(x, r),
      `${minus(sign)}${kSurd(c, a)}`,
      `${kSurd(x, r)} ${signOf(sign)} ${kSurd(c, a)}`,
    ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Multiply $\\sqrt{${a}}$ by each term in the bracket, simplifying each product fully, then put the two terms together underneath.`,
        },
      ],
      expression: `\\sqrt{${a}}(\\sqrt{${b}} ${signOf(sign)} ${c})`,
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'result', from: ['first', 'second'] },
      ],
      bank: fillBank(answer, [
        `\\sqrt{${a * b}}`,
        `\\sqrt{${a + b}}`,
        kSurd(x * x, r),
        kSurd(r, x),
        `${minus(sign)}${kSurd(c, b)}`,
        `${kSurd(x, r)} ${signOf(sign)} ${kSurd(c, b)}`,
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { r, x, c, sign } = params;
    const { a, b } = rootBracketRoots(params);
    return [
      { text: `Multiply $\\sqrt{${a}}$ by each term inside the bracket.` },
      {
        tex: chain(
          `\\sqrt{${a}} \\times \\sqrt{${b}} &= \\sqrt{${a * b}}`,
          `&= \\sqrt{${x * x}} \\times \\sqrt{${r}}`,
          `&= ${kSurd(x, r)}`,
        ),
      },
      { tex: `\\sqrt{${a}} \\times ${c} = ${kSurd(c, a)}` },
      {
        text: `The two surds have different numbers underneath, so they cannot be combined: the answer is $${kSurd(x, r)} ${signOf(sign)} ${kSurd(c, a)}$.`,
      },
    ];
  },
};

/* Expanding two single brackets and collecting */

interface CollectParams {
  a: number;
  b: number;
  c: number;
  s1: number;
  op: number;
  e: number;
  f: number;
  g: number;
  s2: number;
  d: number;
  ask: 'p' | 'q';
}

function collected({ a, b, c, s1, op, e, f, g, s2 }: CollectParams): { p: number; q: number } {
  return { p: a * b + op * e * f, q: s1 * a * c + op * s2 * e * g };
}

function collectTex({ a, b, c, s1, op, e, f, g, s2, d }: CollectParams): string {
  return `${a}(${b} ${signOf(s1)} ${kSurd(c, d)}) ${signOf(op)} ${e}(${f} ${signOf(s2)} ${kSurd(g, d)})`;
}

/**
 * Two brackets expanded and collected, then one part read off.
 *
 * A typed whole number rather than the whole form, because the form typed back
 * as the question would be accepted — see the note at the top of this level.
 * Asking for one part still needs the whole expansion done.
 */
const collectBrackets: Generator<CollectParams> = {
  id: 'rad-collect',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const params: CollectParams = {
        a: rng.int(2, hard ? 6 : 5),
        b: rng.int(1, 9),
        c: rng.int(1, hard ? 4 : 3),
        s1: hard ? rng.sign() : 1,
        op: hard ? rng.sign() : 1,
        e: rng.int(2, hard ? 6 : 5),
        f: rng.int(1, 9),
        g: rng.int(1, hard ? 4 : 3),
        s2: rng.sign(),
        d: rng.pick(hard ? FREE_HARD : FREE_EASY),
        ask: rng.pick(['p', 'q'] as const),
      };
      const { p, q } = collected(params);
      if (p !== 0 && q !== 0) return params;
    }
  },
  render: (params): Slide => {
    const { d, ask } = params;
    const { p, q } = collected(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Expand both brackets and collect like terms, writing the result as $p + q\\sqrt{${d}}$. What is $${ask}$?`,
        },
        { kind: 'display', tex: collectTex(params) },
      ],
      lead: `${ask} =`,
      keypad: WHOLE_KEYS,
      answer: `${ask === 'p' ? p : q}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, b, c, s1, op, e, f, g, s2, d, ask } = params;
    const { p, q } = collected(params);
    return [
      { text: 'Expand each bracket on its own first.' },
      { tex: `${a}(${b} ${signOf(s1)} ${kSurd(c, d)}) = ${formTex(a * b, s1 * a * c, d)}` },
      { tex: `${e}(${f} ${signOf(s2)} ${kSurd(g, d)}) = ${formTex(e * f, s2 * e * g, d)}` },
      ...(op < 0
        ? [{ text: 'The second bracket is being subtracted, so both of its terms change sign.' }]
        : []),
      {
        text: `Whole numbers collect with whole numbers and multiples of $\\sqrt{${d}}$ with each other: $${formTex(p, q, d)}$.`,
      },
      { text: `So $${ask} = ${ask === 'p' ? p : q}$.` },
    ];
  },
};

/* Expanding two brackets */

interface DoubleParams {
  a: number;
  b: number;
  c: number;
  e: number;
  d: number;
  /** The sign inside the second bracket. */
  t: number;
}

/** (a + b√d)(c ± e√d) as p + q√d. */
function expandDouble({ a, b, c, e, d, t }: DoubleParams): { p: number; q: number } {
  return { p: a * c + t * b * e * d, q: t * a * e + b * c };
}

function doubleTex({ a, b, c, e, d, t }: DoubleParams): string {
  return `(${a} + ${kSurd(b, d)})(${c} ${signOf(t)} ${kSurd(e, d)})`;
}

/**
 * Two brackets multiplied out, every term by every term, and collected.
 *
 * The distractors are the three standard slips: dropping the last product,
 * taking √d × √d as 1 rather than d, and losing the sign on one cross term.
 */
const expandDoubleBrackets: Generator<DoubleParams> = {
  id: 'rad-expand-double',
  choices: (params) => {
    const { a, b, c, e, d, t } = params;
    const { p, q } = expandDouble(params);
    const slip = b * c - t * a * e;
    return options(
      { tex: formTex(p, q, d), answer: formAnswer(p, q, d) },
      { tex: formTex(a * c, q, d), answer: formAnswer(a * c, q, d) },
      { tex: formTex(a * c + t * b * e, q, d), answer: formAnswer(a * c + t * b * e, q, d) },
      { tex: formTex(p, slip, d), answer: formAnswer(p, slip, d) },
    );
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const params = {
        a: rng.int(1, hard ? 7 : 6),
        b: hard ? rng.int(1, 3) : 1,
        c: rng.int(1, hard ? 7 : 6),
        e: hard ? rng.int(1, 3) : 1,
        d: rng.pick(hard ? FREE_HARD : FREE_EASY),
        t: rng.sign(),
      };
      const { p, q } = expandDouble(params);
      if (p !== 0 && q !== 0) return params;
    }
  },
  render: (params): Slide => {
    const { a, b, c, e, d, t } = params;
    const { p, q } = expandDouble(params);
    const { template, answer } = formTiles(p, q, d);
    const slip = Math.abs(b * c - t * a * e);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Multiply out the brackets and collect like terms. Put the whole number first.',
        },
        { kind: 'display', tex: doubleTex(params) },
      ],
      template,
      bank: fillBank(answer, [
        `${a * c}`,
        `${a * c + t * b * e}`,
        ...(slip > 0 ? [kSurd(slip, d)] : []),
        kSurd(b * c, d),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, b, c, e, d, t } = params;
    const { p, q } = expandDouble(params);
    const second = t < 0 ? `(-${kSurd(e, d)})` : kSurd(e, d);
    return [
      { text: 'Every term in the first bracket multiplies every term in the second: four products.' },
      {
        tex: chain(
          `${a} \\times ${c} &= ${a * c}`,
          `${a} \\times ${second} &= ${formTex(0, t * a * e, d)}`,
          `${kSurd(b, d)} \\times ${c} &= ${kSurd(b * c, d)}`,
          `${kSurd(b, d)} \\times ${second} &= ${t * b * e * d}`,
        ),
      },
      {
        text: `The last product is whole because $\\sqrt{${d}} \\times \\sqrt{${d}} = ${d}$. Collecting the whole numbers and the surds gives $${formTex(p, q, d)}$.`,
      },
    ];
  },
};

/* Squaring a bracket */

interface SquareParams {
  a: number;
  b: number;
  d: number;
  t: number;
}

/**
 * (a ± b√d)² on a tree: the three parts of the square, then the collected
 * answer.
 *
 * The middle term is its own node because it is the one that goes missing —
 * squaring each term separately is the most common error in the whole level,
 * and it is offered in the bank as a finished answer.
 */
const squareTree: Generator<SquareParams> = {
  id: 'rad-square-tree',
  sample: (rng, difficulty) => ({
    a: rng.int(1, 9),
    b: difficulty > 1 ? rng.int(1, 3) : 1,
    d: rng.pick(difficulty > 1 ? FREE_HARD : FREE_EASY),
    t: rng.sign(),
  }),
  render: ({ a, b, d, t }): Slide => {
    const answer = [
      `${a * a}`,
      `${minus(t)}${kSurd(2 * a * b, d)}`,
      `${b * b * d}`,
      formTex(a * a + b * b * d, 2 * t * a * b, d),
    ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Work out the three parts of the square along the top: the first term squared, twice the product of the terms, and the second term squared. Then collect them.',
        },
      ],
      expression: `(${a} ${signOf(t)} ${kSurd(b, d)})^{2}`,
      nodes: [
        { id: 'first', from: [] },
        { id: 'middle', from: [] },
        { id: 'last', from: [] },
        { id: 'result', from: ['first', 'middle', 'last'] },
      ],
      bank: fillBank(answer, [
        `${b * d}`,
        `${minus(t)}${kSurd(a * b, d)}`,
        `${a * a + b * b * d}`,
        `${b * b * d * d}`,
      ]),
      answer,
    };
  },
  solution: ({ a, b, d, t }) => [
    {
      text: `Squaring a bracket means multiplying it by itself, which gives three parts: the first term squared, twice the product of the terms, and the second term squared.${t < 0 ? ' The minus in the bracket makes the middle part a subtraction.' : ''}`,
    },
    {
      tex: chain(
        `${a}^{2} &= ${a * a}`,
        `2 \\times ${a} \\times ${kSurd(b, d)} &= ${kSurd(2 * a * b, d)}`,
        `(${kSurd(b, d)})^{2} &= ${b * b * d}`,
      ),
    },
    { tex: `(${a} ${signOf(t)} ${kSurd(b, d)})^{2} = ${formTex(a * a + b * b * d, 2 * t * a * b, d)}` },
    {
      text: `Squaring each term on its own gives $${a * a + b * b * d}$ and loses the middle term, $${minus(t)}${kSurd(2 * a * b, d)}$.`,
    },
  ],
};

/* The difference of two squares */

interface ConjugateProductParams {
  /** `number`: (a + b√d)(a - b√d). `root`: (b√d + a)(b√d - a). `roots`: (√m + √n)(√m - √n). */
  shape: 'number' | 'root' | 'roots';
  a: number;
  b: number;
  d: number;
}

function conjugateValue({ shape, a, b, d }: ConjugateProductParams): number {
  if (shape === 'number') return a * a - b * b * d;
  if (shape === 'root') return b * b * d - a * a;
  return d - a;
}

function conjugateProductTex({ shape, a, b, d }: ConjugateProductParams): string {
  if (shape === 'number') return `(${a} + ${kSurd(b, d)})(${a} - ${kSurd(b, d)})`;
  if (shape === 'root') return `(${kSurd(b, d)} + ${a})(${kSurd(b, d)} - ${a})`;
  return `(\\sqrt{${d}} + \\sqrt{${a}})(\\sqrt{${d}} - \\sqrt{${a}})`;
}

/** Non-square numbers for the two-root shape. */
const NON_SQUARES: number[] = Array.from({ length: 29 }, (_, idx) => idx + 2).filter(
  (n) => squarePart(n) ** 2 !== n,
);

/**
 * A bracket times its conjugate: the surd terms cancel and a whole number is
 * left, which is the whole reason conjugates are used to rationalise.
 *
 * Typed as a whole number on a keypad with no root key.
 */
const conjugateProduct: Generator<ConjugateProductParams> = {
  id: 'rad-conjugate-product',
  choices: (params) => {
    const { shape, a, b, d } = params;
    const value = conjugateValue(params);
    const whole = (n: number) => ({ tex: `${n}`, answer: `${n}` });
    // With b = 1 (always, at difficulty 1) "b not squared" is the answer
    // itself, and with a = 1 so can "a not squared" be, so two more slips wait
    // behind them: the root squared to d^2 instead of d, and the subtraction
    // taken the other way round. The first three distinct slips are offered.
    if (shape === 'number') {
      return options(
        whole(value),
        whole(a * a + b * b * d),
        whole(a * a - b * d),
        whole(a - b * b * d),
        whole(a * a - b * b * d * d),
        whole(-value),
      ).slice(0, 4);
    }
    if (shape === 'root') {
      return options(
        whole(value),
        whole(b * b * d + a * a),
        whole(b * d - a * a),
        whole(b * b * d - a),
        whole(b * b * d * d - a * a),
        whole(-value),
      ).slice(0, 4);
    }
    return options(whole(value), whole(d + a), whole(d * d - a * a), whole(a - d));
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const shape = rng.pick(hard ? (['number', 'root', 'roots'] as const) : (['number', 'root'] as const));
    if (shape === 'roots') {
      const [d, a] = rng.sample(NON_SQUARES, 2);
      return { shape, a, b: 1, d };
    }
    return {
      shape,
      a: rng.int(1, hard ? 9 : 7),
      b: hard ? rng.int(1, 3) : 1,
      d: rng.pick(hard ? FREE_HARD : FREE_EASY),
    };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Multiply out and simplify. The answer is a whole number.' }],
    lead: `${conjugateProductTex(params)} =`,
    keypad: WHOLE_KEYS,
    answer: `${conjugateValue(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { shape, a, b, d } = params;
    const [first, second] =
      shape === 'number'
        ? [`${a}`, kSurd(b, d)]
        : shape === 'root'
          ? [kSurd(b, d), `${a}`]
          : [`\\sqrt{${d}}`, `\\sqrt{${a}}`];
    const [firstSq, secondSq] =
      shape === 'number' ? [a * a, b * b * d] : shape === 'root' ? [b * b * d, a * a] : [d, a];
    return [
      {
        text: 'The brackets differ only in the sign between the terms, so the two middle products cancel. What is left is the first term squared minus the second term squared.',
      },
      {
        tex: chain(`&(${first})^{2} - (${second})^{2}`, `&= ${firstSq} - ${secondSq}`, `&= ${firstSq - secondSq}`),
      },
      { text: 'No root survives. That is exactly the property used to clear a root from a denominator.' },
    ];
  },
};

/* Rationalising a binomial denominator */

interface BinomialParams {
  a: number;
  b: number;
  d: number;
  /** The sign inside the denominator: a + t·b√d. */
  t: number;
  /** p = k·|a² - b²d|, so the division comes out whole. */
  k: number;
}

/** Everything a binomial rationalisation passes through, from its parameters. */
function binomial({ a, b, d, t, k }: BinomialParams) {
  const n = a * a - b * b * d;
  const p = k * Math.abs(n);
  const sgn = Math.sign(n);
  return {
    /** The denominator's value once multiplied by its conjugate. */
    n,
    p,
    den: `${a} ${signOf(t)} ${kSurd(b, d)}`,
    conj: `${a} ${signOf(-t)} ${kSurd(b, d)}`,
    /** The numerator after multiplying by the conjugate: pa ∓ pb√d. */
    top: { p: p * a, q: -t * p * b },
    /** The final answer. */
    result: { p: sgn * k * a, q: -t * sgn * k * b },
  };
}

function sampleBinomial(rng: Rng, difficulty: number): BinomialParams {
  const hard = difficulty > 1;
  for (;;) {
    const a = rng.int(2, 7);
    const b = hard ? rng.int(1, 2) : 1;
    const d = rng.pick(hard ? FREE_HARD : FREE_EASY);
    const n = a * a - b * b * d;
    // A denominator of ±1 would make the division a formality, and the easier
    // draws keep it positive so a negative denominator is met on purpose.
    if (Math.abs(n) < 2 || (!hard && n < 0)) continue;
    return { a, b, d, t: rng.sign(), k: rng.int(1, hard ? 4 : 3) };
  }
}

function binomialSolution(params: BinomialParams) {
  const { d } = params;
  const { n, p, den, conj, top, result } = binomial(params);
  return [
    {
      text: `Multiply top and bottom by the conjugate, $${conj}$: the same two terms with the sign between them changed. That is multiplying by 1.`,
    },
    {
      tex: chain(
        `&\\frac{${p}}{${den}} \\times \\frac{${conj}}{${conj}}`,
        `&= \\frac{${formTex(top.p, top.q, d)}}{${n}}`,
      ),
    },
    {
      text: `The bottom is a difference of two squares, $${params.a * params.a} - ${params.b * params.b * d} = ${n}$, so the root has gone.`,
    },
    { text: `Divide both terms on top by $${n}$: $${formTex(result.p, result.q, d)}$.` },
  ];
}

/**
 * Which multiplier clears a two-term denominator?
 *
 * The distractors are the moves that worked before and do not work now: the
 * root alone (enough for a one-term denominator) and the denominator itself,
 * squared or not.
 */
const pickConjugate: Generator<BinomialParams> = {
  id: 'rad-pick-conjugate',
  sample: sampleBinomial,
  render: (params): Slide => {
    const { a, b, d, k } = params;
    const { p, den, conj } = binomial(params);
    const choices = [
      { id: 'conjugate', label: conj, tex: true },
      { id: 'same', label: den, tex: true },
      { id: 'root', label: `\\sqrt{${d}}`, tex: true },
      { id: 'square', label: `(${den})^{2}`, tex: true },
    ];
    const turn = (a + b + d + k) % choices.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `To rationalise the denominator of $\\frac{${p}}{${den}}$, what should the top and bottom both be multiplied by?`,
        },
      ],
      options: [...choices.slice(turn), ...choices.slice(0, turn)],
      correctId: 'conjugate',
    };
  },
  solution: (params) => {
    const { a, b, d } = params;
    const { n, den, conj } = binomial(params);
    return [
      {
        text: `Multiplying by $\\sqrt{${d}}$ alone clears a denominator with one term. Here there are two, and $(${den}) \\times \\sqrt{${d}}$ still has a root in it.`,
      },
      {
        text: `The conjugate, $${conj}$, changes only the sign between the terms. The product is a difference of two squares and the roots cancel:`,
      },
      { tex: chain(`&(${den})(${conj})`, `&= ${a * a} - ${b * b * d} = ${n}`) },
    ];
  },
};

/**
 * The conjugate rationalisation laid out as a tree: the multiplier, what it
 * makes of the bottom and of the top, and the division that finishes it.
 */
const conjugateTree: Generator<BinomialParams> = {
  id: 'rad-conjugate-tree',
  sample: sampleBinomial,
  render: (params): Slide => {
    const { a, b, d, t } = params;
    const { n, p, den, conj, top, result } = binomial(params);
    const answer = [conj, `${n}`, formTex(top.p, top.q, d), formTex(result.p, result.q, d)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Choose what to multiply top and bottom by. Then work out the new bottom and the new top, and divide to finish.',
        },
      ],
      expression: `\\frac{${p}}{${den}}`,
      nodes: [
        { id: 'by', from: [] },
        { id: 'bottom', from: ['by'] },
        { id: 'top', from: ['by'] },
        { id: 'result', from: ['top', 'bottom'] },
      ],
      bank: fillBank(answer, [
        den,
        `\\sqrt{${d}}`,
        `${a * a + b * b * d}`,
        `${a * a - b * d}`,
        formTex(top.p, t * p * b, d),
        formTex(result.p, -result.q, d),
      ]),
      answer,
    };
  },
  solution: binomialSolution,
};

/**
 * A two-term denominator rationalised, the finished form placed as tiles.
 *
 * Tiles rather than typing for the reason `rad-rationalise` is a choice: the
 * rationalised form equals the question, so a typed answer would accept the
 * question copied back.
 */
const binomialRationalise: Generator<BinomialParams> = {
  id: 'rad-binomial-rationalise',
  choices: (params) => {
    const { d } = params;
    const { top, result } = binomial(params);
    return options(
      { tex: formTex(result.p, result.q, d), answer: formAnswer(result.p, result.q, d) },
      { tex: formTex(result.p, -result.q, d), answer: formAnswer(result.p, -result.q, d) },
      { tex: formTex(top.p, top.q, d), answer: formAnswer(top.p, top.q, d) },
      { tex: formTex(result.p, top.q, d), answer: formAnswer(result.p, top.q, d) },
    );
  },
  sample: sampleBinomial,
  render: (params): Slide => {
    const { a, d } = params;
    const { p, den, top, result } = binomial(params);
    const { template, answer } = formTiles(result.p, result.q, d);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Rationalise the denominator and simplify. Put the whole number first.' },
        { kind: 'display', tex: `\\frac{${p}}{${den}}` },
      ],
      template,
      bank: fillBank(answer, [
        `${top.p}`,
        kSurd(Math.abs(top.q), d),
        `${-result.p}`,
        `${a}`,
      ]),
      answer,
    };
  },
  solution: binomialSolution,
};

/** The same rationalisation, worked one line at a time. */
const binomialRationaliseSteps: Generator<BinomialParams> = {
  id: 'rad-binomial-rationalise-steps',
  sample: sampleBinomial,
  render: (params): Slide => {
    const { a, b, d, t } = params;
    const { n, p, den, conj, top, result } = binomial(params);
    const multiplied = `\\frac{${formTex(top.p, top.q, d)}}{${n}}`;
    const finished = formTex(result.p, result.q, d);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: 'Multiplying by the conjugate clears the root from the bottom. Tap the part you would do **next**, then choose what it comes to.',
        },
      ],
      start: [`\\frac{${p}}{${den}}`, '\\times', `\\frac{${conj}}{${conj}}`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: multiplied,
          bank: fillBank(
            [multiplied],
            [
              `\\frac{${formTex(top.p, top.q, d)}}{${a * a + b * b * d}}`,
              `\\frac{${formTex(top.p, t * p * b, d)}}{${n}}`,
              `\\frac{${p}}{${n}}`,
            ],
          ),
        },
        {
          span: [0, 1],
          value: finished,
          bank: fillBank(
            [finished],
            [
              formTex(result.p, top.q, d),
              formTex(top.p, result.q, d),
              formTex(result.p, -result.q, d),
            ],
          ),
        },
      ],
    };
  },
  solution: binomialSolution,
};

/* Equations with surds */

interface SurdEquationParams {
  /**
   * `A`: x√d = kd + f√d. `B`: x√d + kd = f√d. `C`: x√d = x + k(d - 1), which
   * needs a conjugate to finish.
   */
  shape: 'A' | 'B' | 'C';
  d: number;
  f: number;
  k: number;
}

function surdEquationTex({ shape, d, f, k }: SurdEquationParams): string {
  if (shape === 'A') return `x\\sqrt{${d}} = ${k * d} + ${kSurd(f, d)}`;
  if (shape === 'B') return `x\\sqrt{${d}} + ${k * d} = ${kSurd(f, d)}`;
  return `x\\sqrt{${d}} = x + ${k * (d - 1)}`;
}

/** The solution as p + q√d. */
function surdEquationRoot({ shape, f, k }: SurdEquationParams): { p: number; q: number } {
  if (shape === 'A') return { p: f, q: k };
  if (shape === 'B') return { p: f, q: -k };
  return { p: k, q: k };
}

/**
 * Solving a linear equation whose coefficients are surds.
 *
 * The numbers are chosen so each division by √d lands on a whole multiple of
 * √d, and the answer comes out in the form p + q√d with nothing left to cancel.
 */
const surdEquation: Generator<SurdEquationParams> = {
  id: 'rad-surd-equation',
  choices: (params) => {
    const { shape, d, f, k } = params;
    const { p, q } = surdEquationRoot(params);
    const e = shape === 'C' ? k * (d - 1) : k * d;
    const form = (x: number, y: number) => ({ tex: formTex(x, y, d), answer: formAnswer(x, y, d) });
    if (shape === 'C') {
      return options(form(p, q), form(-k, k), form(e, e), {
        tex: `\\frac{${e}}{\\sqrt{${d}}}`,
        answer: `(${e}) / sqrt(${d})`,
      });
    }
    return options(form(p, q), form(p, shape === 'A' ? -k : k), form(f, Math.sign(q) * e), form(k, Math.sign(q) * f));
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      shape: rng.pick(hard ? (['A', 'B', 'C'] as const) : (['A', 'B'] as const)),
      d: rng.pick(hard ? FREE_HARD.slice(0, 8) : FREE_EASY),
      f: rng.int(1, hard ? 9 : 6),
      k: rng.int(1, hard ? 5 : 4),
    };
  },
  render: (params): Slide => {
    const { shape, d, f, k } = params;
    const { p, q } = surdEquationRoot(params);
    const e = shape === 'C' ? k * (d - 1) : k * d;
    const { template, answer } = formTiles(p, q, d, 'x = ');
    const distractors =
      shape === 'C' ? [`${e}`, kSurd(e, d), `${k * (d + 1)}`] : [`${e}`, kSurd(e, d), kSurd(f, d), `${k}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Solve for $x$, giving the answer in the form $a + b\\sqrt{${d}}$.`,
        },
        { kind: 'display', tex: surdEquationTex(params) },
      ],
      template,
      bank: fillBank(answer, distractors),
      answer,
    };
  },
  solution: (params) => {
    const { shape, d, f, k } = params;
    const { p, q } = surdEquationRoot(params);
    if (shape === 'C') {
      const e = k * (d - 1);
      return [
        { text: 'Gather the terms in $x$ on one side, then factorise.' },
        { tex: chain(`x\\sqrt{${d}} - x &= ${e}`, `x(\\sqrt{${d}} - 1) &= ${e}`) },
        {
          text: `Dividing leaves $\\frac{${e}}{\\sqrt{${d}} - 1}$, a two-term denominator. Multiply top and bottom by the conjugate $\\sqrt{${d}} + 1$; the bottom becomes $${d} - 1 = ${d - 1}$.`,
        },
        { tex: chain(`x &= \\frac{${coeffTex(e, `(\\sqrt{${d}} + 1)`)}}{${d - 1}}`, `&= ${formTex(p, q, d)}`) },
      ];
    }
    const e = k * d;
    return [
      ...(shape === 'B'
        ? [{ text: `Subtract $${e}$ from both sides first: $x\\sqrt{${d}} = ${kSurd(f, d)} - ${e}$.` }]
        : []),
      { text: `Divide both terms on the right by $\\sqrt{${d}}$, one at a time.` },
      {
        tex: chain(
          `\\frac{${kSurd(f, d)}}{\\sqrt{${d}}} &= ${f}`,
          `\\frac{${e}}{\\sqrt{${d}}} &= \\frac{${e}\\sqrt{${d}}}{${d}} = ${kSurd(k, d)}`,
        ),
      },
      { text: `So $x = ${formTex(p, q, d)}$.` },
    ];
  },
};

interface DivideSurdParams {
  d: number;
  k: number;
  f: number;
  sign: number;
}

/**
 * Dividing a two-term expression by a root, term by term, as the steps of
 * solving x√d = kd ± f√d.
 *
 * The last stage offers the two terms merged into one, which is the error the
 * line of working exists to stop: k√d and f are not like terms.
 */
const divideSurdSteps: Generator<DivideSurdParams> = {
  id: 'rad-divide-surd-steps',
  sample: (rng, difficulty) => ({
    d: rng.pick(difficulty > 1 ? FREE_HARD.slice(0, 8) : FREE_EASY),
    k: rng.int(1, difficulty > 1 ? 5 : 4),
    f: rng.int(1, difficulty > 1 ? 9 : 6),
    sign: rng.sign(),
  }),
  render: ({ d, k, f, sign }): Slide => {
    const e = k * d;
    const s = signOf(sign);
    const finished = `${kSurd(k, d)} ${s} ${f}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Solving $x\\sqrt{${d}} = ${e} ${s} ${kSurd(f, d)}$ means dividing each term by $\\sqrt{${d}}$. Tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      start: [`\\frac{${e}}{\\sqrt{${d}}}`, s, `\\frac{${kSurd(f, d)}}{\\sqrt{${d}}}`],
      reductions: [
        {
          span: [0, 1],
          value: kSurd(k, d),
          bank: fillBank([kSurd(k, d)], [`${k}`, kSurd(e, d), `${e}`]),
        },
        {
          span: [2, 3],
          value: `${f}`,
          bank: fillBank([`${f}`], [kSurd(f, d), `${f * d}`]),
        },
        {
          span: [0, 3],
          value: finished,
          bank: fillBank(
            [finished],
            sign > 0
              ? [kSurd(k + f, d), `${k + f}`, `${kSurd(k, d)} + ${kSurd(f, d)}`]
              : [`${f} - ${kSurd(k, d)}`, `${kSurd(k, d)} - ${kSurd(f, d)}`, kSurd(k * f, d)],
          ),
        },
      ],
    };
  },
  solution: ({ d, k, f, sign }) => [
    { text: `A fraction with two terms on top splits into two fractions over the same bottom.` },
    {
      tex: `\\frac{${k * d}}{\\sqrt{${d}}} = \\frac{${k * d}\\sqrt{${d}}}{${d}} = ${kSurd(k, d)}`,
    },
    { tex: `\\frac{${kSurd(f, d)}}{\\sqrt{${d}}} = ${f}` },
    {
      text: `So $x = ${kSurd(k, d)} ${signOf(sign)} ${f}$. A surd and a whole number are not like terms, so that is finished.`,
    },
  ],
};

/* Reading off a and b */

interface ReadOffParams {
  shape: 'collect' | 'square' | 'fraction';
  ask: 'a' | 'b';
  p: number;
  q: number;
  s: number;
  t: number;
  d: number;
  /** Only for `fraction`. */
  frac: BinomialParams;
}

function readOffParts(params: ReadOffParams): { a: number; b: number } {
  const { shape, p, q, s, t, d, frac } = params;
  if (shape === 'collect') return { a: p, b: s + t * q };
  if (shape === 'square') return { a: p * p + q * q * d, b: 2 * t * p * q };
  const { result } = binomial(frac);
  return { a: result.p, b: result.q };
}

function readOffTex(params: ReadOffParams): string {
  const { shape, p, q, s, t, d, frac } = params;
  if (shape === 'collect') return `\\sqrt{${s * s * d}} + ${p} ${signOf(t)} ${kSurd(q, d)}`;
  if (shape === 'square') return `(${p} ${signOf(t)} ${kSurd(q, d)})^{2}`;
  const { p: top, den } = binomial(frac);
  return `\\frac{${top}}{${den}}`;
}

/**
 * Put an expression into the form a + b√d, then read off one part.
 *
 * The expression needs one of the earlier lessons' moves first — simplifying a
 * root, squaring a bracket, or clearing a two-term denominator — so reading
 * off is the last step of a real piece of working rather than a lookup.
 */
const readOff: Generator<ReadOffParams> = {
  id: 'rad-read-off',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const frac = sampleBinomial(rng, difficulty);
    for (;;) {
      const shape = rng.pick(
        hard ? (['collect', 'square', 'fraction'] as const) : (['collect', 'square'] as const),
      );
      const d = shape === 'fraction' ? frac.d : rng.pick(hard ? FREE_HARD.slice(0, 8) : FREE_EASY);
      const params: ReadOffParams = {
        shape,
        ask: shape === 'collect' ? 'b' : rng.pick(['a', 'b'] as const),
        p: rng.int(1, hard ? 8 : 6),
        q: rng.int(1, hard ? 3 : 2),
        s: rng.int(2, hard ? 5 : 4),
        t: rng.sign(),
        d,
        frac,
      };
      if (readOffParts(params).b !== 0) return params;
    }
  },
  render: (params): Slide => {
    const { ask, d } = params;
    const parts = readOffParts(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Write this in the form $a + b\\sqrt{${d}}$, where $a$ and $b$ are whole numbers. What is $${ask}$?`,
        },
        { kind: 'display', tex: readOffTex(params) },
      ],
      lead: `${ask} =`,
      keypad: WHOLE_KEYS,
      answer: `${parts[ask]}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { shape, ask, p, q, s, t, d, frac } = params;
    const { a, b } = readOffParts(params);
    const close = { text: `So $a = ${a}$ and $b = ${b}$, and the question asked for $${ask} = ${ask === 'a' ? a : b}$.` };
    if (shape === 'collect') {
      return [
        { text: `Simplify the root first: $\\sqrt{${s * s * d}} = ${kSurd(s, d)}$.` },
        {
          tex: chain(`&${kSurd(s, d)} + ${p} ${signOf(t)} ${kSurd(q, d)}`, `&= ${formTex(a, b, d)}`),
        },
        close,
      ];
    }
    if (shape === 'square') {
      return [
        { text: 'Square the bracket: the first term squared, twice the product, the second term squared.' },
        {
          tex: chain(`&${p * p} ${signOf(t)} ${kSurd(2 * p * q, d)} + ${q * q * d}`, `&= ${formTex(a, b, d)}`),
        },
        close,
      ];
    }
    return [...binomialSolution(frac), close];
  },
};

/* What does an expression need before it is in the form a + b√c? */

interface FormFlowParams {
  route: 'rationalise' | 'simplify' | 'collect' | 'done';
  /** For `rationalise`: one term underneath, or two. */
  single: boolean;
  a: number;
  c: number;
  d: number;
  p: number;
  q: number;
  s: number;
  t: number;
}

function formFlowSubject({ route, single, a, c, d, p, q, s, t }: FormFlowParams): string {
  if (route === 'rationalise') {
    return single ? `${a} + \\frac{${c}}{\\sqrt{${d}}}` : `\\frac{${c}}{${a} + \\sqrt{${d}}}`;
  }
  if (route === 'simplify') return `${a} ${signOf(t)} \\sqrt{${s * s * d}}`;
  if (route === 'collect') return `${kSurd(p, d)} + ${a} ${signOf(t)} ${kSurd(q, d)}`;
  return `${a} ${signOf(t)} ${kSurd(p, d)}`;
}

/**
 * The checks an expression goes through on its way to a + b√c, in the order
 * they are worth doing: a root underneath first, then a square hiding under a
 * root, then like surds to collect.
 */
const formFlow: Generator<FormFlowParams> = {
  id: 'rad-form-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const d = rng.pick(hard ? FREE_HARD.slice(0, 8) : FREE_EASY);
    const a = rng.int(1, 9);
    return {
      route: rng.pick(['rationalise', 'simplify', 'collect', 'done'] as const),
      single: rng.chance(hard ? 0.4 : 0.6),
      a,
      c: rng.int(1, 9),
      d,
      p: rng.int(1, hard ? 6 : 4),
      q: rng.int(1, hard ? 6 : 4),
      s: rng.int(2, hard ? 5 : 3),
      t: rng.sign(),
    };
  },
  render: (params): Slide => {
    const { route, single, a, d } = params;
    const right = single ? `$\\sqrt{${d}}$` : `$${a} - \\sqrt{${d}}$`;
    const wrong = single ? `$${d}$` : `$${a} + \\sqrt{${d}}$`;
    const multipliers = [
      {
        label: right,
        outcome: single
          ? `Then the bottom becomes $${d}$ and the root moves to the top.`
          : `Then the bottom becomes $${a * a} - ${d} = ${a * a - d}$, a whole number.`,
      },
      {
        label: wrong,
        outcome: single
          ? `Then the bottom becomes $${d}\\sqrt{${d}}$, which still holds a root.`
          : `Then the bottom becomes $${formTex(a * a + d, 2 * a, d)}$, which still holds a root.`,
      },
    ];
    // Turned by the question's own numbers, so the right multiplier is not
    // always the first button.
    if ((a + d) % 2 === 1) multipliers.reverse();
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'What does this need before it is in the form $a + b\\sqrt{c}$? Each answer chooses what gets asked next.',
        },
      ],
      subject: formFlowSubject(params),
      steps: [
        {
          id: 'denominator',
          ask: 'Is there a root in a denominator?',
          branches: [
            { label: 'Yes', to: 'multiply' },
            { label: 'No', to: 'square' },
          ],
        },
        {
          id: 'multiply',
          ask: 'What should the top and bottom be multiplied by?',
          branches: multipliers,
        },
        {
          id: 'square',
          ask: 'Does a number under a root have a square factor bigger than 1?',
          branches: [
            { label: 'Yes', outcome: 'Then simplify that root before anything else.' },
            { label: 'No', to: 'like' },
          ],
        },
        {
          id: 'like',
          ask: 'Are there two surd terms with the same number under the root?',
          branches: [
            { label: 'Yes', outcome: 'Then collect them into a single term.' },
            { label: 'No', outcome: 'Then it is already in the form $a + b\\sqrt{c}$.' },
          ],
        },
      ],
      answer:
        route === 'rationalise'
          ? ['Yes', right]
          : route === 'simplify'
            ? ['No', 'Yes']
            : route === 'collect'
              ? ['No', 'No', 'Yes']
              : ['No', 'No', 'No'],
    };
  },
  solution: (params) => {
    const { route, single, a, c, d, p, q, s, t } = params;
    if (route === 'rationalise') {
      return single
        ? [
            { text: `There is a root underneath, so that goes first. Multiply that fraction by $\\frac{\\sqrt{${d}}}{\\sqrt{${d}}}$.` },
            { tex: `\\frac{${c}}{\\sqrt{${d}}} = \\frac{${kSurd(c, d)}}{${d}}` },
          ]
        : [
            {
              text: `There is a two-term denominator, so multiply top and bottom by its conjugate, $${a} - \\sqrt{${d}}$.`,
            },
            { tex: chain(`&(${a} + \\sqrt{${d}})(${a} - \\sqrt{${d}})`, `&= ${a * a} - ${d} = ${a * a - d}`) },
          ];
    }
    if (route === 'simplify') {
      return [
        { text: `No root underneath, but $${s * s * d} = ${s * s} \\times ${d}$ hides a square.` },
        { tex: chain(`\\sqrt{${s * s * d}} &= ${kSurd(s, d)}`, `${formFlowSubject(params)} &= ${a} ${signOf(t)} ${kSurd(s, d)}`) },
      ];
    }
    if (route === 'collect') {
      return [
        { text: `Nothing to rationalise and nothing to simplify, but two multiples of $\\sqrt{${d}}$ to collect.` },
        { tex: chain(`&${formFlowSubject(params)}`, `&= ${formTex(a, p + t * q, d)}`) },
      ];
    }
    return [
      {
        text: `No root underneath, $${d}$ has no square factor, and there is only one surd term. $${a} ${signOf(t)} ${kSurd(p, d)}$ is already in the form, with $a = ${a}$ and $b = ${t * p}$.`,
      },
    ];
  },
};

/* Surds in geometry */

interface PythagParams {
  /** `hyp`: two shorter sides given. `leg`: the longest side and one other. `roots`: shorter sides √x and √y. */
  shape: 'hyp' | 'leg' | 'roots';
  x: number;
  y: number;
}

function isSquare(n: number): boolean {
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

/** The square of the side being found. */
function pythagSquare({ shape, x, y }: PythagParams): number {
  if (shape === 'hyp') return x * x + y * y;
  if (shape === 'leg') return y * y - x * x;
  return x + y;
}

/**
 * Pythagoras with an exact answer. The numbers are drawn so the side is never
 * whole, which is the point: the exact answer is a surd, and a decimal would be
 * a rounded one.
 */
const pythagSurd: Generator<PythagParams> = {
  id: 'rad-pythag',
  choices: (params) => {
    const { shape, x, y } = params;
    const n = pythagSquare(params);
    const right = { tex: surdTex(n), answer: surdAnswer(n) };
    if (shape === 'hyp') {
      return options(
        right,
        { tex: `${x + y}`, answer: `${x + y}` },
        // Simplified like every other option: an unsimplified root such as
        // \sqrt{9} stands out as wrong without any maths being done.
        { tex: surdTex(x + y), answer: surdAnswer(x + y) },
        // At y = x + 1, y^2 - x^2 is x + y: the slip before this one again.
        ...(y !== x && y !== x + 1 ? [{ tex: surdTex(y * y - x * x), answer: surdAnswer(y * y - x * x) }] : []),
      );
    }
    if (shape === 'leg') {
      return options(
        right,
        { tex: surdTex(x * x + y * y), answer: surdAnswer(x * x + y * y) },
        { tex: `${y - x}`, answer: `${y - x}` },
        { tex: `${n}`, answer: `${n}` },
      );
    }
    return options(
      right,
      { tex: `${x + y}`, answer: `${x + y}` },
      { tex: `\\sqrt{${x}} + \\sqrt{${y}}`, answer: `sqrt(${x}) + sqrt(${y})` },
      { tex: surdTex(x * x + y * y), answer: surdAnswer(x * x + y * y) },
    );
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const shape = hard ? rng.pick(['hyp', 'leg', 'roots'] as const) : 'hyp';
    for (;;) {
      if (shape === 'roots') {
        const [x, y] = rng.sample(NON_SQUARES.filter((n) => n <= 20), 2);
        if (!isSquare(x + y)) return { shape, x: Math.min(x, y), y: Math.max(x, y) };
        continue;
      }
      if (shape === 'leg') {
        const y = rng.int(3, 12);
        const x = rng.int(1, y - 1);
        if (!isSquare(y * y - x * x)) return { shape, x, y };
        continue;
      }
      const x = rng.int(1, hard ? 12 : 9);
      const y = rng.int(x, hard ? 12 : 9);
      if (!isSquare(x * x + y * y)) return { shape, x, y };
    }
  },
  render: (params): Slide => {
    const { shape, x, y } = params;
    const n = pythagSquare(params);
    const text =
      shape === 'hyp'
        ? `A right-angled triangle has shorter sides of $${x}$ cm and $${y}$ cm. Find the exact length of the longest side, as a simplified surd.`
        : shape === 'leg'
          ? `A right-angled triangle has a longest side of $${y}$ cm and another side of $${x}$ cm. Find the exact length of the third side, as a simplified surd.`
          : `A right-angled triangle has shorter sides of $\\sqrt{${x}}$ cm and $\\sqrt{${y}}$ cm. Find the exact length of the longest side, as a simplified surd.`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text }],
      lead: shape === 'leg' ? '\\text{third side} =' : '\\text{longest side} =',
      keypad: SURD_KEYS,
      answer: surdAnswer(n),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { shape, x, y } = params;
    const n = pythagSquare(params);
    const working =
      shape === 'hyp'
        ? chain(`${x}^{2} + ${y}^{2} &= ${x * x} + ${y * y}`, `&= ${n}`)
        : shape === 'leg'
          ? chain(`${y}^{2} - ${x}^{2} &= ${y * y} - ${x * x}`, `&= ${n}`)
          : chain(`(\\sqrt{${x}})^{2} + (\\sqrt{${y}})^{2} &= ${x} + ${y}`, `&= ${n}`);
    return [
      {
        text:
          shape === 'leg'
            ? 'The longest side squared is the sum of the other two squared, so the missing side squared is a difference.'
            : 'The longest side squared is the sum of the squares of the other two.',
      },
      { tex: working },
      {
        tex:
          surdTex(n) === `\\sqrt{${n}}`
            ? `\\text{side} = \\sqrt{${n}}`
            : `\\text{side} = \\sqrt{${n}} = ${surdTex(n)}`,
      },
      {
        text: `$${n}$ is not a square number, so the side is not whole. The surd is the exact length; a decimal would be a rounded one.`,
      },
    ];
  },
};

/** Rectangle sides whose diagonal is worth estimating: not whole, and on the figure. */
interface DiagonalParams {
  w: number;
  h: number;
}

/**
 * How long is the diagonal, roughly?
 *
 * Pythagoras gives √(w² + h²), and the question is its size rather than its
 * form — the check that an exact answer is sensible. The figure is the same
 * curve `rad-estimate` uses, with the dashed line at w² + h², so finding the
 * crossing is the estimate.
 */
const diagonalSlider: Generator<DiagonalParams> = {
  id: 'rad-diagonal-slider',
  sample: (rng, difficulty) => {
    const [lo, hi] = difficulty > 1 ? [2, 8] : [1, 6];
    for (;;) {
      const w = rng.int(lo, hi);
      const h = rng.int(lo, hi);
      if (!isSquare(w * w + h * h)) return { w, h };
    }
  },
  render: ({ w, h }): Slide => {
    const n = w * w + h * h;
    const nearest = Math.round(Math.sqrt(n));
    // As in `rad-estimate`: framed around the answer, then widened until the
    // untouched handle does not already sit on it.
    let span = nearest + 3;
    while (defaultSliderValue(1, span, 1) === nearest) span += 1;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `A rectangle measures $${w}$ cm by $${h}$ cm. The curve is $y = x^{2}$, and the dashed line is at $y = ${w}^{2} + ${h}^{2}$. Slide to the whole number of centimetres the diagonal is closest to.`,
        },
      ],
      min: 1,
      max: span,
      step: 1,
      answer: nearest,
      readout: `\\text{diagonal} \\approx {v}`,
      figure: plotFigure(plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: span * span,
          curves: [{ f: (x) => x * x }],
          horizontals: [n],
          label: `The curve y equals x squared, with a dashed line at y equals ${n}`,
        })),
    };
  },
  solution: ({ w, h }) => {
    const n = w * w + h * h;
    const below = Math.floor(Math.sqrt(n));
    const nearest = Math.round(Math.sqrt(n));
    return [
      { text: 'The diagonal cuts the rectangle into two right-angled triangles, so Pythagoras gives its length.' },
      { tex: chain(`\\text{diagonal} &= \\sqrt{${w}^{2} + ${h}^{2}}`, `&= \\sqrt{${n}}`) },
      {
        text: `$${below}^{2} = ${below * below}$ and $${below + 1}^{2} = ${(below + 1) * (below + 1)}$, so $\\sqrt{${n}}$ is between $${below}$ and $${below + 1}$, nearer $${nearest}$.`,
      },
    ];
  },
};

interface PerimeterParams {
  shape: 'rectangle' | 'triangle' | 'square';
  a: number;
  b: number;
  p: number;
  q: number;
  r: number;
  d: number;
}

function perimeterParts({ shape, a, b, p, q, r }: PerimeterParams): { whole: number; surd: number } {
  if (shape === 'rectangle') return { whole: 2 * (a + b), surd: 2 * (p + q) };
  if (shape === 'triangle') return { whole: a + b, surd: p + q + r };
  return { whole: 4 * a, surd: 4 * p };
}

/**
 * An exact perimeter: adding side lengths that are each part whole number,
 * part surd, which is collecting like terms with a shape around it.
 */
const perimeter: Generator<PerimeterParams> = {
  id: 'rad-perimeter',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const params: PerimeterParams = {
        shape: rng.pick(['rectangle', 'triangle', 'square'] as const),
        a: rng.int(1, 9),
        b: rng.int(1, 9),
        p: rng.int(1, hard ? 4 : 3),
        q: rng.int(1, hard ? 4 : 3),
        r: rng.int(1, hard ? 5 : 3),
        d: rng.pick(hard ? FREE_HARD.slice(0, 8) : FREE_EASY),
      };
      if (params.shape !== 'triangle') return params;
      // Three lengths only make a triangle when the longest is shorter than
      // the other two together.
      const root = Math.sqrt(params.d);
      const sides = [params.a + params.p * root, params.b + params.q * root, params.r * root].sort(
        (x, y) => x - y,
      );
      if (sides[2] < sides[0] + sides[1]) return params;
    }
  },
  render: (params): Slide => {
    const { shape, a, b, p, q, r, d } = params;
    const { whole, surd } = perimeterParts(params);
    const sideA = formTex(a, p, d);
    const sideB = formTex(b, q, d);
    const text =
      shape === 'rectangle'
        ? `A rectangle is $${sideA}$ cm long and $${sideB}$ cm wide. Find its exact perimeter, whole number first.`
        : shape === 'triangle'
          ? `A triangle has sides of $${sideA}$ cm, $${sideB}$ cm and $${kSurd(r, d)}$ cm. Find its exact perimeter, whole number first.`
          : `A square has sides of $${sideA}$ cm. Find its exact perimeter, whole number first.`;
    const { template, answer } = formTiles(whole, surd, d, '', ' \\text{ cm}');
    const half =
      shape === 'rectangle'
        ? [`${a + b}`, kSurd(p + q, d)]
        : shape === 'triangle'
          ? [`${a + b + r}`, kSurd(p + q, d)]
          : [`${2 * a}`, kSurd(2 * p, d)];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text }],
      template,
      bank: fillBank(answer, [...half, `${whole + surd}`]),
      answer,
    };
  },
  solution: (params) => {
    const { shape, a, b, p, q, r, d } = params;
    const { whole, surd } = perimeterParts(params);
    // The whole numbers and the surds summed on separate lines, which is both
    // the method and short enough for a phone.
    const sums =
      shape === 'rectangle'
        ? chain(
            `2(${a} + ${b}) &= ${whole}`,
            `2(${kSurd(p, d)} + ${kSurd(q, d)}) &= ${kSurd(surd, d)}`,
          )
        : shape === 'triangle'
          ? chain(
              `&${a} + ${b} = ${whole}`,
              `&${kSurd(p, d)} + ${kSurd(q, d)} + ${kSurd(r, d)}`,
              `&\\quad = ${kSurd(surd, d)}`,
            )
          : chain(`4 \\times ${a} &= ${whole}`, `4 \\times ${kSurd(p, d)} &= ${kSurd(surd, d)}`);
    return [
      {
        text:
          shape === 'rectangle'
            ? 'A rectangle has two of each side, so the perimeter is twice the length plus twice the width.'
            : shape === 'triangle'
              ? 'The perimeter is the three sides added.'
              : 'A square has four equal sides.',
      },
      { tex: sums },
      { tex: `\\text{perimeter} = ${formTex(whole, surd, d)} \\text{ cm}` },
      {
        text: `Whole numbers collect with whole numbers and multiples of $\\sqrt{${d}}$ with each other. They do not combine into $${whole + surd}$ or anything like it.`,
      },
    ];
  },
};

interface AreaParams {
  /** `rectangle`: (a + p√d)(b + q√d). `square`: side a + p√d. `triangle`: base 2c√d, height a + √d. */
  shape: 'rectangle' | 'square' | 'triangle';
  a: number;
  b: number;
  c: number;
  p: number;
  q: number;
  d: number;
}

function areaParts({ shape, a, b, c, p, q, d }: AreaParams): { whole: number; surd: number } {
  if (shape === 'rectangle') return { whole: a * b + p * q * d, surd: a * q + b * p };
  if (shape === 'square') return { whole: a * a + p * p * d, surd: 2 * a * p };
  return { whole: c * d, surd: a * c };
}

/**
 * An exact area: expanding brackets where the brackets are side lengths.
 *
 * The triangle carries a half that the 2 in its base cancels, which is the
 * step most often dropped.
 */
const rectArea: Generator<AreaParams> = {
  id: 'rad-rect-area',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const a = rng.int(1, hard ? 7 : 6);
    let b = rng.int(1, hard ? 7 : 6);
    // Equal sides would be the square shape asked a second way.
    if (b === a) b = a === 1 ? 2 : a - 1;
    return {
      shape: rng.pick(['rectangle', 'square', 'triangle'] as const),
      a,
      b,
      c: rng.int(1, hard ? 4 : 3),
      p: hard ? rng.int(1, 2) : 1,
      q: hard ? rng.int(1, 2) : 1,
      d: rng.pick(hard ? FREE_HARD.slice(0, 8) : FREE_EASY),
    };
  },
  render: (params): Slide => {
    const { shape, a, b, c, p, q, d } = params;
    const { whole, surd } = areaParts(params);
    const text =
      shape === 'rectangle'
        ? `A rectangle is $${formTex(a, p, d)}$ cm long and $${formTex(b, q, d)}$ cm wide. Find its exact area, whole number first.`
        : shape === 'square'
          ? `A square has sides of $${formTex(a, p, d)}$ cm. Find its exact area, whole number first.`
          : `A triangle has a base of $${kSurd(2 * c, d)}$ cm and a perpendicular height of $${formTex(a, 1, d)}$ cm. Find its exact area, whole number first.`;
    const { template, answer } = formTiles(whole, surd, d, '', ' \\text{ cm}^2');
    const distractors =
      shape === 'rectangle'
        ? [`${a * b}`, `${a * b + p * q}`, kSurd(a * q, d)]
        : shape === 'square'
          ? [`${a * a}`, kSurd(a * p, d), `${a * a + p * p}`]
          : [`${2 * c * d}`, kSurd(2 * a * c, d), `${c}`];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text }],
      template,
      bank: fillBank(answer, distractors),
      answer,
    };
  },
  solution: (params) => {
    const { shape, a, b, c, p, q, d } = params;
    const { whole, surd } = areaParts(params);
    if (shape === 'triangle') {
      return [
        { text: 'Area of a triangle is half the base times the height, and the half cancels the 2 in the base.' },
        {
          tex: chain(
            `&\\tfrac{1}{2} \\times ${kSurd(2 * c, d)} \\times (${formTex(a, 1, d)})`,
            `&= ${kSurd(c, d)}(${formTex(a, 1, d)})`,
            `&= ${kSurd(a * c, d)} + ${c} \\times ${d}`,
            `&= ${formTex(whole, surd, d)}`,
          ),
        },
      ];
    }
    const [first, second] =
      shape === 'rectangle' ? [formTex(a, p, d), formTex(b, q, d)] : [formTex(a, p, d), formTex(a, p, d)];
    return [
      {
        text:
          shape === 'rectangle'
            ? 'Area is length times width: multiply every term of one bracket by every term of the other.'
            : 'Area is the side squared, and squaring a bracket gives three parts, the middle one doubled.',
      },
      { tex: chain(`&(${first})(${second})`, `&= ${formTex(whole, surd, d)}`) },
      {
        text: `The surd terms multiply to a whole number, because $\\sqrt{${d}} \\times \\sqrt{${d}} = ${d}$, so it joins the other whole number.`,
      },
    ];
  },
};

/* ---------- Level 6: index equations and substitution ---------- */

/*
 * Two kinds of equation run through this level. In one the unknown sits in the
 * index, as in 8^{x - 1} = 4^{x}, and is solved by writing both sides over one
 * base and equating the indices. In the other the unknown is the base, as in
 * x^{2/3} = 9, and is solved by raising both sides to the reciprocal power.
 *
 * Every answer is a number and every typed answer is a number only, so there
 * is no question to type back. Where an answer can be a fraction the keypad
 * adds the fraction key and nothing else.
 */

/** Numeric answers that may be fractions. */
const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

/** A rational number in lowest terms, the sign carried on top. */
interface Ratio {
  n: number;
  d: number;
}

function ratio(n: number, d = 1): Ratio {
  return reduceFraction(n, d);
}

/** The same, or nothing when the denominator is zero: a slip that has no value. */
function ratioOf(n: number, d: number): Ratio | undefined {
  return d === 0 ? undefined : reduceFraction(n, d);
}

function ratioTex({ n, d }: Ratio): string {
  return fracIndexTex(n, d);
}

/** For mathjs. Never displayed. */
function ratioAnswer({ n, d }: Ratio): string {
  return d === 1 ? `${n}` : `(${n})/(${d})`;
}

function sameRatio(a: Ratio, b: Ratio): boolean {
  return a.n * b.d === b.n * a.d;
}

/**
 * A numeric answer and its slips as options. A slip that lands on the answer,
 * or on another slip, is dropped rather than shown twice.
 */
function ratioOptions(right: Ratio, ...slips: (Ratio | undefined)[]): ChoiceOption[] {
  const kept: Ratio[] = [];
  for (const slip of slips) {
    if (!slip || sameRatio(slip, right) || kept.some((k) => sameRatio(k, slip))) continue;
    kept.push(slip);
  }
  return options(
    { tex: ratioTex(right), answer: ratioAnswer(right) },
    ...kept.slice(0, 3).map((r) => ({ tex: ratioTex(r), answer: ratioAnswer(r) })),
  );
}

/** px + q as it is written by hand: 3x - 3, x, -2x + 1, 5. */
function lin(p: number, q: number): string {
  const head = p === 0 ? '' : p === 1 ? 'x' : p === -1 ? '-x' : `${p}x`;
  if (q === 0) return head || '0';
  if (!head) return `${q}`;
  return `${head} ${q < 0 ? '-' : '+'} ${Math.abs(q)}`;
}

function rootName(n: number): string {
  if (n === 2) return 'square root';
  if (n === 3) return 'cube root';
  return n === 4 ? 'fourth root' : `${n}th root`;
}

/** Lines of working with any line that merely repeats the one above removed. */
function distinctLines(...lines: string[]): string[] {
  return lines.filter((line, idx) => idx === 0 || line.replace(/&/g, '') !== lines[idx - 1].replace(/&/g, ''));
}

/* Unlike bases: both sides rewritten over one base */

interface UnlikeParams {
  /** The common base. */
  r: number;
  /** The left base is r^a, with index px + q. */
  a: number;
  p: number;
  q: number;
  /** The right base is r^b, with index sx + t; s = 0 means a plain number. */
  b: number;
  s: number;
  t: number;
  /** -1 when the right-hand side is a reciprocal, 1/r^b. */
  e: number;
}

/** How far up each base goes: 2^6 = 64, 3^4 = 81, 5^3 = 125. */
const UNLIKE_TOP: Record<number, number> = { 2: 6, 3: 4, 5: 3 };
/** Smaller when both indices carry an x, so the rewritten indices stay short. */
const UNLIKE_TOP_HARD: Record<number, number> = { 2: 5, 3: 3, 5: 2 };

function unlikeRoot({ a, p, q, b, s, t, e }: UnlikeParams): Ratio {
  return ratio(e * b * t - a * q, a * p - e * b * s);
}

/**
 * Difficulty 1 is A^x = B or A^x = 1/B, one index and a number. Difficulty 2
 * puts an x in both indices, or a bracket in the left index against a
 * reciprocal, which is where multiplying out the index starts to matter.
 */
function sampleUnlike(rng: Rng, difficulty: number): UnlikeParams {
  const r = rng.pick([2, 2, 3, 3, 5]);
  if (difficulty <= 1) {
    const top = UNLIKE_TOP[r];
    const a = rng.int(2, top);
    let b = rng.int(1, top - 1);
    if (b >= a) b += 1;
    return { r, a, p: 1, q: 0, b, s: 0, t: 1, e: rng.chance(0.35) ? -1 : 1 };
  }
  const top = UNLIKE_TOP_HARD[r];
  for (;;) {
    const a = rng.int(1, top);
    const b = rng.int(1, top);
    if (a === b) continue;
    const p = rng.int(1, 2);
    const q = rng.int(-3, 3);
    const params: UnlikeParams = rng.chance(0.2)
      ? { r, a, p, q, b, s: 0, t: 1, e: -1 }
      : { r, a, p, q, b, s: rng.int(1, 2), t: rng.int(-3, 3), e: 1 };
    if (a * p === params.e * b * params.s) continue;
    if (q === 0 && params.t === 0) continue;
    const x = unlikeRoot(params);
    if (x.d > 3 || Math.abs(x.n / x.d) > 6) continue;
    return params;
  }
}

function unlikeSides(params: UnlikeParams) {
  const { r, a, p, q, b, s, t, e } = params;
  const A = r ** a;
  const B = r ** b;
  const left = `${A}^{${lin(p, q)}}`;
  const right = s === 0 ? (e < 0 ? `\\frac{1}{${B}}` : `${B}`) : `${B}^{${lin(s, t)}}`;
  return {
    A,
    B,
    left,
    right,
    equation: `${left} = ${right}`,
    leftIndex: lin(a * p, a * q),
    rightIndex: lin(e * b * s, e * b * t),
  };
}

function unlikeSolution(params: UnlikeParams): SolutionStep[] {
  const { r, a, p, b, s, e } = params;
  const { A, B, left, right, leftIndex, rightIndex } = unlikeSides(params);
  const x = unlikeRoot(params);
  const k = a * p - e * b * s;
  const c = e * b * params.t - a * params.q;
  const facts = [
    ...(a > 1 ? [`$${A} = ${r}^{${a}}$`] : []),
    ...(e < 0 ? [`$\\frac{1}{${B}} = ${r}^{-${b}}$`] : b > 1 ? [`$${B} = ${r}^{${b}}$`] : []),
  ];
  const rewrites = [
    ...(a > 1 ? [`${left} &= ${r}^{${leftIndex}}`] : []),
    ...(b > 1 || e < 0 ? [`${right} &= ${r}^{${rightIndex}}`] : []),
  ];
  return [
    {
      text: `Write both sides as powers of $${r}$: ${facts.join(' and ')}.${e < 0 ? ' A reciprocal is a negative index.' : ''}`,
    },
    { tex: chain(...rewrites) },
    { text: 'The bases now match, so the indices must be equal.' },
    {
      tex: chain(
        ...distinctLines(`${leftIndex} &= ${rightIndex}`, ...(k === 1 ? [] : [`${lin(k, 0)} &= ${c}`]), `x &= ${ratioTex(x)}`),
      ),
    },
  ];
}

/** Solving an equation with unlike bases, the answer typed. */
const unlike: Generator<UnlikeParams> = {
  id: 'ieq-unlike',
  choices: (params) => {
    const { a, p, q, b, s, t, e } = params;
    const x = unlikeRoot(params);
    return ratioOptions(
      x,
      // The two powers swapped: 4^x = 8 answered as 2/3.
      ratioOf(e * a * t - b * q, b * p - e * a * s),
      ratio(-x.n, x.d),
      // Only the x term multiplied through.
      ratioOf(e * t - q, a * p - e * b * s),
      ratio(x.n + x.d, x.d),
    );
  },
  sample: sampleUnlike,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Solve by writing both sides as powers of the same number. The answer may be a fraction or negative.',
      },
      { kind: 'display', tex: unlikeSides(params).equation },
    ],
    lead: 'x =',
    keypad: FRACTION_KEYS,
    answer: ratioAnswer(unlikeRoot(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: unlikeSolution,
};

/** Both sides rewritten over the common base, placed rather than typed. */
const unlikeBaseTiles: Generator<UnlikeParams> = {
  id: 'ieq-base-tiles',
  sample: sampleUnlike,
  render: (params): Slide => {
    const { r, a, p, q, b, s, t, e } = params;
    const { equation, leftIndex, rightIndex } = unlikeSides(params);
    const answer = [`${r}^{${leftIndex}}`, `${r}^{${rightIndex}}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Rewrite both sides as powers of $${r}$, multiplying out each index. Nothing needs solving yet.`,
        },
        { kind: 'display', tex: equation },
      ],
      template: '{0} = {1}',
      bank: fillBank(answer, [
        `${r}^{${lin(p, q)}}`,
        `${r}^{${lin(a * p, q)}}`,
        `${r}^{${lin(-e * b * s, -e * b * t)}}`,
        `${r}^{${lin(a * p + 1, a * q)}}`,
        ...(s === 0 ? [] : [`${r}^{${lin(b * s, t)}}`]),
      ]),
      answer,
    };
  },
  solution: unlikeSolution,
};

/** Choosing the base, the power and the equation, one fork at a time. */
const unlikeBaseFlow: Generator<UnlikeParams> = {
  id: 'ieq-base-flow',
  sample: sampleUnlike,
  render: (params): Slide => {
    const { r, a, p, q, b, s, t, e } = params;
    const { A, B, equation, leftIndex, rightIndex } = unlikeSides(params);
    const x = unlikeRoot(params);
    // Ask about whichever side is not already written in the base.
    const [N, k] = a > 1 ? [A, a] : [B, b];
    const baseBranches = [2, 3, 5].map((base) =>
      base === r
        ? { label: `$${base}$`, to: 'power' }
        : { label: `$${base}$`, outcome: `$${N}$ is not a power of $${base}$, so this base cannot make the sides match.` },
    );
    const powers = [
      { label: `$${r}^{${k}}$`, to: 'equate' },
      { label: `$${r}^{${k + 1}}$`, outcome: `That is $${r ** (k + 1)}$, not $${N}$.` },
      k > 1
        ? { label: `$${r}^{${k - 1}}$`, outcome: `That is $${r ** (k - 1)}$, not $${N}$.` }
        : { label: `$${r}^{${k + 2}}$`, outcome: `That is $${r ** (k + 2)}$, not $${N}$.` },
    ];
    const right = `$${leftIndex} = ${rightIndex}$`;
    const raw = `$${lin(p, q)} = ${s === 0 ? (e < 0 ? `\\frac{1}{${B}}` : B) : lin(s, t)}$`;
    const flipped = `$${leftIndex} = ${lin(-e * b * s, -e * b * t)}$`;
    const equations = [
      { label: right, outcome: `Solving it gives $x = ${ratioTex(x)}$.` },
      { label: raw, outcome: 'That compares the indices before the bases match, so it says nothing about $x$.' },
      { label: flipped, outcome: 'Check the sign of the right-hand index.' },
    ].filter((branch, idx, all) => all.findIndex((other) => other.label === branch.label) === idx);
    const turnP = (a + b + r) % powers.length;
    const turnE = (a * 2 + b + (p + q + s + t)) % equations.length;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Work out how to solve this. Each answer chooses what gets asked next.' }],
      subject: equation,
      steps: [
        { id: 'base', ask: 'Both sides are powers of which number?', branches: baseBranches },
        {
          id: 'power',
          ask: `Write $${N}$ as a power of $${r}$.`,
          branches: [...powers.slice(turnP), ...powers.slice(0, turnP)],
        },
        {
          id: 'equate',
          ask: `With both sides written as powers of $${r}$, which equation do the indices give?`,
          branches: [...equations.slice(turnE), ...equations.slice(0, turnE)],
        },
      ],
      answer: [`$${r}$`, `$${r}^{${k}}$`, right],
    };
  },
  solution: unlikeSolution,
};

/** The two indices, then x, on a tree. */
const unlikeEquateTree: Generator<UnlikeParams> = {
  id: 'ieq-equate-tree',
  sample: sampleUnlike,
  render: (params): Slide => {
    const { r, a, p, q, b, s, t, e } = params;
    const { equation, leftIndex, rightIndex } = unlikeSides(params);
    const x = unlikeRoot(params);
    const answer = [leftIndex, rightIndex, `x = ${ratioTex(x)}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Write each side as a power of $${r}$. Top row: the two indices, left side first. Bottom: $x$.`,
        },
      ],
      expression: equation,
      nodes: [
        { id: 'left', from: [] },
        { id: 'right', from: [] },
        { id: 'x', from: ['left', 'right'] },
      ],
      bank: fillBank(answer, [
        lin(p, q),
        lin(a * p, q),
        lin(-e * b * s, -e * b * t),
        ...(s === 0 ? [] : [lin(s, t)]),
        `x = ${ratioTex(ratio(-x.n, x.d))}`,
        `x = ${ratioTex(ratio(x.n + x.d, x.d))}`,
      ]),
      answer,
    };
  },
  solution: unlikeSolution,
};

/* Equations with a fractional index on x */

interface FracEqParams {
  /** x^{p/q} = s^p, so x = s^q. */
  p: number;
  q: number;
  s: number;
  /** A number multiplying the power, divided off first; 1 for none. */
  k: number;
}

/**
 * Every x^{p/q} = c worth asking, with x = s^q kept under 400 and the
 * right-hand side under 256. The square root of a square is capped lower than
 * the rest would allow, or it would be half of every draw.
 */
function fracEqPool(hard: boolean): { p: number; q: number; s: number }[] {
  const out: { p: number; q: number; s: number }[] = [];
  for (const q of hard ? [2, 3, 4] : [2, 3]) {
    for (let p = hard ? -4 : 1; p <= (hard ? 4 : 3); p += 1) {
      if (p === 0 || gcd(Math.abs(p), q) !== 1) continue;
      const cap = p === 1 && q === 2 ? 12 : Infinity;
      for (let s = 2; s <= cap && s ** q <= 400 && s ** Math.abs(p) <= 256; s += 1) out.push({ p, q, s });
    }
  }
  return out;
}

const FRAC_EQ_EASY = fracEqPool(false);
const FRAC_EQ_HARD = fracEqPool(true);

/** s^p, a fraction when p is negative. */
function powerRatio(s: number, p: number): Ratio {
  return p > 0 ? ratio(s ** p) : ratio(1, s ** -p);
}

/** A number ready to take an index: a fraction is bracketed. */
function asBase(value: Ratio): string {
  return value.d === 1 ? `${value.n}` : `\\left(${ratioTex(value)}\\right)`;
}

function sampleFracEq(rng: Rng, difficulty: number, withCoefficient = false): FracEqParams {
  const { p, q, s } = rng.pick(difficulty > 1 ? FRAC_EQ_HARD : FRAC_EQ_EASY);
  return { p, q, s, k: withCoefficient ? rng.int(2, 5) : 1 };
}

function fracEqTex({ p, q, s, k }: FracEqParams): string {
  const c = powerRatio(s, p);
  return `${k === 1 ? '' : k}x^{${fracIndexTex(p, q)}} = ${ratioTex(ratio(k * c.n, c.d))}`;
}

function fracEqSolution({ p, q, s, k }: FracEqParams): SolutionStep[] {
  const c = powerRatio(s, p);
  const index = fracIndexTex(p, q);
  const undo = fracIndexTex(q, p);
  const x = s ** q;
  const explain =
    p === 1
      ? `Here the reciprocal is a whole number, so this is just $${s}^{${q}} = ${x}$.`
      : p === -1
        ? `A negative index turns the fraction over, so this is $${s}^{${q}} = ${x}$.`
        : p > 0
          ? `The ${rootName(p)} of $${c.n}$ is $${s}$, and $${s}^{${q}} = ${x}$.`
          : `A negative index turns the fraction over, and the ${rootName(-p)} of $${c.d}$ is $${s}$. Then $${s}^{${q}} = ${x}$.`;
  return [
    ...(k > 1 ? [{ text: `Divide both sides by $${k}$ first: $x^{${index}} = ${ratioTex(c)}$.` }] : []),
    {
      text: `Raise both sides to the power $${undo}$, the reciprocal of $${index}$. The indices multiply to 1, which leaves $x$.`,
    },
    { tex: chain(`x &= ${asBase(c)}^{${undo}}`, `&= ${x}`) },
    { text: explain },
    ...(p % 2 === 0
      ? [{ text: `$-${x}$ works too, because the even ${Math.abs(p)} on top hides the sign. That is why the question asks for $x > 0$.` }]
      : []),
  ];
}

/** x^{p/q} = c, solved and typed. */
const fracPower: Generator<FracEqParams> = {
  id: 'ieq-frac-power',
  choices: ({ p, q, s }) =>
    ratioOptions(
      ratio(s ** q),
      ratio(s),
      powerRatio(s, p),
      ratio(s ** (q + 1)),
      ratio(s ** q + 1),
    ),
  sample: (rng, difficulty) => sampleFracEq(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: params.p % 2 === 0 ? 'Solve for $x$, where $x > 0$.' : 'Solve for $x$.' },
      { kind: 'display', tex: fracEqTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.s ** params.q}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: fracEqSolution,
};

/** The reciprocal power, then its value, placed. */
const reciprocalTiles: Generator<FracEqParams> = {
  id: 'ieq-reciprocal-tiles',
  sample: (rng, difficulty) => sampleFracEq(rng, difficulty),
  render: (params): Slide => {
    const { p, q, s } = params;
    const c = powerRatio(s, p);
    const base = asBase(c);
    const answer = [`${base}^{${fracIndexTex(q, p)}}`, `${s ** q}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Raise both sides to the reciprocal power, then work out the value.${p % 2 === 0 ? ' Take $x > 0$.' : ''}`,
        },
        { kind: 'display', tex: fracEqTex(params) },
      ],
      template: 'x = {0} = {1}',
      bank: fillBank(answer, [
        `${base}^{${fracIndexTex(p, q)}}`,
        `${base}^{${fracIndexTex(-q, p)}}`,
        `${s}`,
        `${s ** (q + 1)}`,
      ]),
      answer,
    };
  },
  solution: fracEqSolution,
};

/** Dividing off the coefficient and undoing the index, on a tree. */
const undoTree: Generator<FracEqParams> = {
  id: 'ieq-undo-tree',
  sample: (rng, difficulty) => sampleFracEq(rng, difficulty, true),
  render: (params): Slide => {
    const { p, q, s, k } = params;
    const c = powerRatio(s, p);
    const index = fracIndexTex(p, q);
    const answer = [ratioTex(c), fracIndexTex(q, p), `${s ** q}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Top row: what $x^{${index}}$ equals once the $${k}$ is divided off, and the power that undoes $${index}$. Bottom: $x$.${p % 2 === 0 ? ' Take $x > 0$.' : ''}`,
        },
      ],
      expression: fracEqTex(params),
      nodes: [
        { id: 'alone', from: [] },
        { id: 'undo', from: [] },
        { id: 'x', from: ['alone', 'undo'] },
      ],
      bank: fillBank(answer, [
        ratioTex(ratio(k * k * c.n, c.d)),
        fracIndexTex(p, q),
        fracIndexTex(-q, p),
        `${s}`,
        `${s ** (q + 1)}`,
      ]),
      answer,
    };
  },
  solution: fracEqSolution,
};

/* How many solutions: the sign question */

interface SignParams {
  p: number;
  q: number;
  s: number;
  /** Whether the right-hand side is positive. */
  positive: boolean;
}

function signPool(hard: boolean): { p: number; q: number; s: number }[] {
  const out: { p: number; q: number; s: number }[] = [];
  for (const q of [2, 3, 5]) {
    for (let p = hard ? -4 : 1; p <= (hard ? 4 : 3); p += 1) {
      if (p === 0 || gcd(Math.abs(p), q) !== 1) continue;
      for (let s = 2; s <= 5 && s ** q <= 125 && s ** Math.abs(p) <= 125; s += 1) out.push({ p, q, s });
    }
  }
  return out;
}

const SIGN_EASY = signPool(false);
const SIGN_HARD = signPool(true);

/** The number of solutions and what they are, for the worked solution. */
function signSolution({ p, q, s, positive }: SignParams): SolutionStep[] {
  const c = powerRatio(s, p);
  const rhs = ratioTex(positive ? c : ratio(-c.n, c.d));
  const x = s ** q;
  const index = fracIndexTex(p, q);
  if (p % 2 === 0) {
    return positive
      ? [
          { text: `The top of the index, $${Math.abs(p)}$, is even, so $x$ and $-x$ give the same value.` },
          { tex: chain(`x^{${index}} &= ${rhs}`, `x &= \\pm ${x}`) },
          { text: 'Two solutions.' },
        ]
      : [
          { text: `The top of the index, $${Math.abs(p)}$, is even, and an even power is never negative.` },
          { text: `So nothing gives $${rhs}$: there is no solution.` },
        ];
  }
  if (q % 2 === 0) {
    return positive
      ? [
          { text: `The bottom of the index, $${q}$, is even: an even root, which is never negative.` },
          { tex: chain(`x^{${index}} &= ${rhs}`, `x &= ${x}`) },
          { text: `One solution. $-${x}$ has no real ${rootName(q)}, so it cannot work.` },
        ]
      : [
          { text: `The bottom of the index, $${q}$, is even: an even root, which is never negative.` },
          { text: `So nothing gives $${rhs}$: there is no solution.` },
        ];
  }
  return [
    { text: `Both $${Math.abs(p)}$ and $${q}$ are odd, so the sign carries straight through.` },
    { tex: chain(`x^{${index}} &= ${rhs}`, `x &= ${positive ? '' : '-'}${x}`) },
    { text: 'One solution, with the same sign as the right-hand side.' },
  ];
}

/**
 * How many solutions does x^{p/q} = c have?
 *
 * The outcomes on the correct path carry the numbers; a wrong turn reads the
 * rule it has just taken for granted, rather than asserting a solution that
 * this equation does not have.
 */
const signFlow: Generator<SignParams> = {
  id: 'ieq-sign-flow',
  sample: (rng, difficulty) => ({ ...rng.pick(difficulty > 1 ? SIGN_HARD : SIGN_EASY), positive: rng.chance(0.6) }),
  render: (params): Slide => {
    const { p, q, s, positive } = params;
    const c = powerRatio(s, p);
    const rhs = ratioTex(positive ? c : ratio(-c.n, c.d));
    const x = s ** q;
    const evenTop = p % 2 === 0;
    const evenBottom = q % 2 === 0;
    const answer = evenTop
      ? ['Yes', positive ? 'Yes' : 'No']
      : evenBottom
        ? ['No', 'Yes', positive ? 'Yes' : 'No']
        : ['No', 'No'];
    const here = (path: string[]) => path.join() === answer.join();
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'How many real solutions does this have? Each answer chooses what gets asked next.' }],
      subject: `x^{${fracIndexTex(p, q)}} = ${rhs}`,
      steps: [
        {
          id: 'top',
          ask: 'Is the top of the index even?',
          branches: [
            { label: 'Yes', to: 'even-rhs' },
            { label: 'No', to: 'bottom' },
          ],
        },
        {
          id: 'even-rhs',
          ask: 'Is the right-hand side positive?',
          branches: [
            {
              label: 'Yes',
              outcome: here(['Yes', 'Yes'])
                ? `Two solutions, $x = \\pm ${x}$: an even power hides the sign.`
                : 'Then there would be two solutions, one each side of zero.',
            },
            {
              label: 'No',
              outcome: here(['Yes', 'No'])
                ? 'No solution: an even power is never negative.'
                : 'Then there would be no solution, since an even power is never negative.',
            },
          ],
        },
        {
          id: 'bottom',
          ask: 'Is the bottom of the index even?',
          branches: [
            { label: 'Yes', to: 'root-rhs' },
            {
              label: 'No',
              outcome: here(['No', 'No'])
                ? `One solution, $x = ${positive ? '' : '-'}${x}$: odd powers and odd roots keep the sign.`
                : 'Then there would be one solution, with the sign of the right-hand side.',
            },
          ],
        },
        {
          id: 'root-rhs',
          ask: 'Is the right-hand side positive?',
          branches: [
            {
              label: 'Yes',
              outcome: here(['No', 'Yes', 'Yes'])
                ? `One solution, $x = ${x}$: an even root is never negative, so only the positive one works.`
                : 'Then there would be one solution, the positive one.',
            },
            {
              label: 'No',
              outcome: here(['No', 'Yes', 'No'])
                ? 'No solution: an even root is never negative.'
                : 'Then there would be no solution, since an even root is never negative.',
            },
          ],
        },
      ],
      answer,
    };
  },
  solution: signSolution,
};

/* Reading a solution off the graph */

interface CrossForm {
  tex: string;
  P: number;
  Q: number;
}

/** x^{P/Q} written as an index, for lesson 2. */
const INDEX_FORMS: CrossForm[] = [
  [1, 2],
  [3, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
].map(([P, Q]) => ({ tex: `x^{\\frac{${P}}{${Q}}}`, P, Q }));

/** The same powers written with roots, for lesson 5. */
const SURD_FORMS: CrossForm[] = [
  { tex: 'x\\sqrt{x}', P: 3, Q: 2 },
  { tex: '\\sqrt{x^{3}}', P: 3, Q: 2 },
  { tex: 'x^{2}\\sqrt{x}', P: 5, Q: 2 },
  { tex: '\\sqrt[3]{x^{2}}', P: 2, Q: 3 },
  { tex: 'x\\sqrt[3]{x}', P: 4, Q: 3 },
  { tex: '\\sqrt[4]{x^{3}}', P: 3, Q: 4 },
  { tex: '\\sqrt{x}\\sqrt[3]{x}', P: 5, Q: 6 },
];

interface CrossParams {
  form: CrossForm;
  s: number;
  k: number;
}

/** k times a form, as the left-hand side reads. */
function formLhs({ form, k }: { form: CrossForm; k: number }): string {
  return `${k === 1 ? '' : k}${form.tex}`;
}

function formSolution({ form, s, k }: CrossParams, graph = false): SolutionStep[] {
  const { P, Q } = form;
  const c = s ** P;
  const x = s ** Q;
  const closing = graph
    ? ' That is where the dashed line meets the curve.'
    : P % 2 === 0
      ? ` $-${x}$ works too, which is why the question asks for $x > 0$.`
      : '';
  return [
    ...(form.tex.includes('\\sqrt')
      ? [{ text: `A root is a fractional index, so $${form.tex} = x^{${fracIndexTex(P, Q)}}$.` }]
      : []),
    ...(k > 1 ? [{ text: `Divide both sides by $${k}$: $x^{${fracIndexTex(P, Q)}} = ${c}$.` }] : []),
    { text: `Raise both sides to the power $${fracIndexTex(Q, P)}$ to undo the index.` },
    {
      tex: P === 1 ? `x = ${c}^{${Q}} = ${x}` : chain(`x &= ${c}^{${fracIndexTex(Q, P)}}`, `&= ${s}^{${Q}} = ${x}`),
    },
    {
      text: `${P === 1 ? `The index $\\frac{1}{${Q}}$ is a ${rootName(Q)}, and the power $${Q}$ undoes it.` : `The ${rootName(P)} of $${c}$ is $${s}$, and $${s}^{${Q}} = ${x}$.`}${closing}`,
    },
  ];
}

/** Every form, s and k giving a crossing at a whole x no further out than 27. */
function crossPool(forms: CrossForm[]): CrossParams[] {
  return forms.flatMap((form) =>
    [2, 3, 4, 5]
      .filter((s) => s ** form.Q <= 27)
      .flatMap((s) => [1, 2, 3].map((k) => ({ form, s, k }))),
  );
}

const CROSS_EASY = crossPool(INDEX_FORMS);
const CROSS_HARD = crossPool(SURD_FORMS);

/**
 * Solve by sliding to where a curve meets a line.
 *
 * The same equation as the rest of the level, asked about a picture: the
 * learner solves it and finds the answer on the graph, which also shows why a
 * rising curve meets a line once.
 */
const crossSlider: Generator<CrossParams> = {
  id: 'ieq-cross-slider',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? CROSS_HARD : CROSS_EASY),
  render: (params): Slide => {
    const { form, s, k } = params;
    const x = s ** form.Q;
    const height = k * s ** form.P;
    // Framed around the answer, then widened until the untouched handle does
    // not already sit on it.
    let span = x + 4;
    while (defaultSliderValue(0, span, 1) === x) span += 1;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The curve is $y = ${formLhs(params)}$ and the dashed line is $y = ${height}$. Solve $${formLhs(params)} = ${height}$ and slide to the $x$ where they meet.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer: x,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: height * 1.6,
          curves: [{ f: (t) => k * Math.pow(Math.max(t, 0), form.P / form.Q) }],
          horizontals: [height],
          label: `A rising curve, with a dashed line at y equals ${height}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: (params) => formSolution(params, true),
};

/* Hidden quadratics */

interface HiddenParams {
  /** y = b^x. */
  b: number;
  /** The roots in y, u > v. A negative v gives no x. */
  u: number;
  v: number;
  /** How the square term is written: 4^x, 2^{2x} or (2^x)^2. */
  form: 'square' | 'double' | 'bracket';
}

const HIDDEN_POWERS: Record<number, number[]> = { 2: [1, 2, 4, 8, 16], 3: [1, 3, 9, 27], 5: [1, 5, 25] };

/** The x a root in y gives, or undefined for a root that gives none. */
function hiddenX(b: number, y: number): number | undefined {
  const at = HIDDEN_POWERS[b].indexOf(y);
  return at < 0 ? undefined : at;
}

function sampleHidden(rng: Rng, bothValid: boolean, hardForms: boolean): HiddenParams {
  const b = rng.pick([2, 2, 3, 5]);
  const form = hardForms ? rng.pick(['double', 'bracket'] as const) : 'square';
  const powers = HIDDEN_POWERS[b];
  if (bothValid) {
    const [m, n] = rng.sample(powers, 2);
    return { b, u: Math.max(m, n), v: Math.min(m, n), form };
  }
  for (;;) {
    const u = rng.pick(powers);
    const v = -rng.int(1, 6);
    if (u + v !== 0) return { b, u, v, form };
  }
}

/** A term like -5(2^x), with its sign, as it sits after the first term. */
function signedTerm(coefficient: number, body: string): string {
  const size = Math.abs(coefficient);
  const sign = coefficient < 0 ? '-' : '+';
  if (size === 1) return `${sign} ${body}`;
  return `${sign} ${size}${body === 'y' ? 'y' : `(${body})`}`;
}

function hiddenSquare({ b, form }: HiddenParams): string {
  if (form === 'square') return `${b * b}^{x}`;
  return form === 'double' ? `${b}^{2x}` : `(${b}^{x})^{2}`;
}

function hiddenTex(params: HiddenParams): string {
  const { b, u, v } = params;
  const sum = u + v;
  const product = u * v;
  return `${hiddenSquare(params)} ${signedTerm(-sum, `${b}^{x}`)} ${product < 0 ? '-' : '+'} ${Math.abs(product)} = 0`;
}

function quadraticInY({ u, v }: HiddenParams): string {
  const product = u * v;
  return `y^{2} ${signedTerm(-(u + v), 'y')} ${product < 0 ? '-' : '+'} ${Math.abs(product)} = 0`;
}

function factorsInY({ u, v }: HiddenParams): string {
  const factor = (r: number) => `(y ${r < 0 ? '+' : '-'} ${Math.abs(r)})`;
  return `${factor(u)}${factor(v)} = 0`;
}

/** What one root in y says about x, in words. */
function backSubstitute(b: number, y: number): string {
  const x = hiddenX(b, y);
  if (x === undefined) return `$${b}^{x} = ${y}$ has no solution, because a power of $${b}$ is always positive.`;
  if (x === 0) return `$${b}^{x} = 1$ gives $x = 0$, since any number to the power 0 is 1.`;
  return `$${b}^{x} = ${y}$ gives $x = ${x}$.`;
}

function hiddenSolution(params: HiddenParams): SolutionStep[] {
  const { b, u, v, form } = params;
  const spot =
    form === 'square'
      ? `$${b * b}^{x} = (${b}^{2})^{x} = (${b}^{x})^{2}$`
      : form === 'double'
        ? `$${b}^{2x} = (${b}^{x})^{2}$`
        : `$(${b}^{x})^{2}$ is already a square`;
  return [
    { text: `${spot}, so put $y = ${b}^{x}$.` },
    { tex: chain(`${quadraticInY(params).replace(' = 0', ' &= 0')}`, factorsInY(params).replace(' = 0', ' &= 0')) },
    { text: `So $y = ${u}$ or $y = ${v}$. Now go back to $x$.` },
    { text: `${backSubstitute(b, u)} ${backSubstitute(b, v)}` },
  ];
}

/** The quadratic in y, placed term by term. */
const hiddenQuadTiles: Generator<HiddenParams> = {
  id: 'ieq-quad-tiles',
  sample: (rng, difficulty) => sampleHidden(rng, rng.chance(0.5), difficulty > 1),
  render: (params): Slide => {
    const { b, u, v } = params;
    const sum = u + v;
    const product = u * v;
    const middle = signedTerm(-sum, 'y').replace(' ', '');
    const last = `${product < 0 ? '-' : '+'}${Math.abs(product)}`;
    const answer = ['y^{2}', middle, last];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Put $y = ${b}^{x}$ and write this as a quadratic in $y$: the square term, then the $y$ term, then the number.`,
        },
        { kind: 'display', tex: hiddenTex(params) },
      ],
      template: '{0} {1} {2} = 0',
      bank: fillBank(answer, [
        signedTerm(sum, 'y').replace(' ', ''),
        `${product < 0 ? '+' : '-'}${Math.abs(product)}`,
        `${b}y`,
        `y^{${b}}`,
        '2y',
      ]),
      answer,
    };
  },
  solution: hiddenSolution,
};

/** The two roots in y, then the x each gives, on a tree. */
const hiddenTree: Generator<HiddenParams> = {
  id: 'ieq-hidden-tree',
  sample: (rng, difficulty) => sampleHidden(rng, rng.chance(0.5), difficulty > 1),
  render: (params): Slide => {
    const { b, u, v } = params;
    const xToken = (y: number) => {
      const x = hiddenX(b, y);
      return x === undefined ? '\\text{none}' : `x = ${x}`;
    };
    const answer = [`y = ${u}`, `y = ${v}`, xToken(u), xToken(v)];
    const top = hiddenX(b, u) ?? 0;
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Put $y = ${b}^{x}$. Top row: the two roots in $y$, larger first. Bottom row: the $x$ each gives, or none.`,
        },
      ],
      expression: hiddenTex(params),
      nodes: [
        { id: 'y1', from: [] },
        { id: 'y2', from: [] },
        { id: 'x1', from: ['y1'] },
        { id: 'x2', from: ['y2'] },
      ],
      bank: fillBank(answer, [
        `y = ${-u}`,
        `y = ${-v}`,
        `x = ${u}`,
        ...(top === 0 ? [] : [`x = ${-top}`]),
        '\\text{none}',
      ]),
      answer,
    };
  },
  solution: hiddenSolution,
};

interface RejectParams {
  b: number;
  /** The root in y being tested. */
  r: number;
}

const REJECT_POOL: RejectParams[] = [2, 3, 5].flatMap((b) => [
  ...HIDDEN_POWERS[b].concat(b === 5 ? [125] : b === 3 ? [81] : [32, 64]).map((r) => ({ b, r })),
  ...[0, -1, -2, -3, -4, -5, -6, -8, -9].map((r) => ({ b, r })),
]);

/** The power of b a positive root is, or undefined when it is not one. */
function powerOf(b: number, r: number): number | undefined {
  for (let k = 0; b ** k <= r; k += 1) if (b ** k === r) return k;
  return undefined;
}

/** Keep a root, or reject it: back-substituting y = b^x one root at a time. */
const rejectFlow: Generator<RejectParams> = {
  id: 'ieq-reject-flow',
  sample: (rng) => rng.pick(REJECT_POOL),
  render: ({ b, r }): Slide => {
    const k = r > 0 ? powerOf(b, r) : undefined;
    const powers =
      k === undefined
        ? [-1, 0, 1].map((n) => ({
            label: `$${b}^{${n}}$`,
            outcome: `That is $${n < 0 ? `\\frac{1}{${b}}` : b ** n}$, which is positive, not $${r}$.`,
          }))
        : [
            { label: `$${b}^{${k}}$`, outcome: `So $x = ${k}$, and this root is kept.` },
            { label: `$${b}^{${k + 1}}$`, outcome: `That is $${b ** (k + 1)}$, not $${r}$.` },
            k > 0
              ? { label: `$${b}^{${k - 1}}$`, outcome: `That is $${b ** (k - 1)}$, not $${r}$.` }
              : { label: `$${b}^{-1}$`, outcome: `That is $\\frac{1}{${b}}$, not $1$.` },
          ];
    const turn = (b + Math.abs(r)) % powers.length;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `After putting $y = ${b}^{x}$, a quadratic gave $y = ${r}$. Decide what this root means for $x$.`,
        },
      ],
      subject: `${b}^{x} = ${r}`,
      steps: [
        {
          id: 'sign',
          ask: 'Is the right-hand side positive?',
          branches: [
            { label: 'Yes', to: 'power' },
            {
              label: 'No',
              outcome:
                r > 0
                  ? 'Then the root would be rejected.'
                  : `No solution: $${b}^{x}$ is positive for every $x$, so this root is rejected.`,
            },
          ],
        },
        {
          id: 'power',
          ask: `Which power of $${b}$ is $${r}$?`,
          branches: [...powers.slice(turn), ...powers.slice(0, turn)],
        },
      ],
      answer: k === undefined ? ['No'] : ['Yes', `$${b}^{${k}}$`],
    };
  },
  solution: ({ b, r }) => [
    { text: `A power of a positive number is always positive: $${b}^{x} > 0$ for every $x$.` },
    r > 0
      ? { tex: `${b}^{x} = ${r} = ${b}^{${powerOf(b, r)}} \\implies x = ${powerOf(b, r)}` }
      : { text: `So $${b}^{x} = ${r}$ has no solution, and the root $y = ${r}$ is rejected.` },
    {
      text:
        r > 0
          ? 'This root is kept. Check the other root of the quadratic the same way.'
          : 'Rejecting it is not an error in the working: the quadratic had two roots, and only one of them can be a power.',
    },
  ],
};

/** The whole method: substitute, factorise, back-substitute, answer typed. */
const hiddenSolve: Generator<HiddenParams> = {
  id: 'ieq-hidden-solve',
  choices: (params) => {
    const { b, u, v } = params;
    const top = hiddenX(b, u) ?? 0;
    const low = hiddenX(b, v);
    return ratioOptions(ratio(top), ratio(u), ratio(low ?? v), ratio(top + 1), ratio(-top));
  },
  sample: (rng, difficulty) => sampleHidden(rng, difficulty > 1 && rng.chance(0.5), difficulty > 1),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text:
          hiddenX(params.b, params.v) === undefined
            ? 'Solve for $x$.'
            : 'This has two solutions. Give the larger one.',
      },
      { kind: 'display', tex: hiddenTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${hiddenX(params.b, params.u) ?? 0}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: hiddenSolution,
};

/* Substituting into index expressions */

interface EvaluateParams6 {
  /** x = s^n. */
  s: number;
  n: number;
  a: number;
  p1: number;
  b: number;
  p2: number;
  op: number;
}

/** Indices over n in lowest terms, so the fraction shown is the one meant. */
const TOPS: Record<number, number[]> = { 2: [1, 3], 3: [1, 2, 4] };
const LOW_TOPS: Record<number, number[]> = { 2: [-1, -3], 3: [-1, -2] };

function sampleEvaluate(rng: Rng, difficulty: number, withB: boolean): EvaluateParams6 {
  for (;;) {
    const n = rng.pick([2, 2, 3]);
    const s = rng.int(2, n === 2 ? 6 : 3);
    const p1 = rng.pick(TOPS[n]);
    const p2 = rng.pick(difficulty > 1 ? LOW_TOPS[n] : TOPS[n]);
    if (p1 === p2 || s ** p1 > 125 || s ** Math.abs(p2) > 125) continue;
    return { s, n, a: rng.int(2, 5), p1, b: withB ? rng.int(1, 3) : 1, p2, op: rng.sign() };
  }
}

function termTex6(coefficient: number, p: number, n: number): string {
  return `${coefficient === 1 ? '' : coefficient}x^{${fracIndexTex(p, n)}}`;
}

/** s^p as it is written: a power of 1 is left off. */
function powerTex6(s: number, p: number): string {
  return p === 1 ? `${s}` : `${s}^{${p}}`;
}

function evaluateTex6({ n, a, p1, b, p2, op }: EvaluateParams6): string {
  return `${termTex6(a, p1, n)} ${op < 0 ? '-' : '+'} ${termTex6(b, p2, n)}`;
}

function evaluateValue({ s, a, p1, b, p2, op }: EvaluateParams6): Ratio {
  const second = powerRatio(s, p2);
  return ratio(a * s ** p1 * second.d + op * b * second.n, second.d);
}

function evaluateSolution6(params: EvaluateParams6): SolutionStep[] {
  const { s, n, a, p1, b, p2, op } = params;
  const x = s ** n;
  const second = powerRatio(s, p2);
  return [
    { text: `Substitute $x = ${x}$ and work each term out on its own, index first. The ${rootName(n)} of $${x}$ is $${s}$.` },
    {
      tex: chain(
        `${x}^{${fracIndexTex(p1, n)}} &= ${[...new Set([powerTex6(s, p1), `${s ** p1}`])].join(' = ')}`,
        `${x}^{${fracIndexTex(p2, n)}} &= ${[...new Set([p2 > 0 ? powerTex6(s, p2) : `\\frac{1}{${powerTex6(s, -p2)}}`, ratioTex(second)])].join(' = ')}`,
      ),
    },
    {
      tex: `${a} \\times ${s ** p1} ${op < 0 ? '-' : '+'} ${b === 1 ? '' : `${b} \\times `}${ratioTex(second)} = ${ratioTex(evaluateValue(params))}`,
    },
    {
      text: `${p2 < 0 ? 'The negative index made the second term a fraction, not a negative number. ' : ''}The index is dealt with before multiplying: $${a}x^{${fracIndexTex(p1, n)}}$ is $${a}$ times $x^{${fracIndexTex(p1, n)}}$, not $(${a}x)^{${fracIndexTex(p1, n)}}$.`,
    },
  ];
}

/** Evaluate an index expression at a given x, answer typed. */
const evaluateAt: Generator<EvaluateParams6> = {
  id: 'ieq-evaluate',
  choices: (params) => {
    const { s, n, a, p1, b, p2, op } = params;
    const x = s ** n;
    const right = evaluateValue(params);
    const second = powerRatio(s, p2);
    return ratioOptions(
      right,
      evaluateValue({ ...params, op: -op }),
      // A negative index read as a negative number.
      p2 < 0 ? ratio(a * s ** p1 - op * b * s ** -p2) : ratio(a * s ** p1 + op * b * s ** (p2 + 1)),
      // The index read as a multiplier.
      ratioOf(a * x * p1 * n + op * b * x * p2 * n, n * n),
      ratio(right.n + right.d * second.d, right.d * second.d),
    );
  },
  sample: (rng, difficulty) => sampleEvaluate(rng, difficulty, true),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Find the value when $x = ${params.s ** params.n}$.${params.p2 < 0 ? ' The answer may be a fraction.' : ''}`,
      },
    ],
    lead: `${evaluateTex6(params)} =`,
    keypad: FRACTION_KEYS,
    answer: ratioAnswer(evaluateValue(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: evaluateSolution6,
};

/** The same evaluation as a line of working, one piece at a time. */
const termSteps: Generator<EvaluateParams6> = {
  id: 'ieq-term-steps',
  sample: (rng, difficulty) => sampleEvaluate(rng, difficulty, false),
  render: (params): Slide => {
    const { s, n, a, p1, p2, op } = params;
    const x = s ** n;
    const v1 = s ** p1;
    const second = powerRatio(s, p2);
    const sign = op < 0 ? '-' : '+';
    const final = evaluateValue(params);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `With $x = ${x}$, $${evaluateTex6(params)}$ becomes the line below. Tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      start: [`${a}`, '\\times', `${x}^{${fracIndexTex(p1, n)}}`, sign, `${x}^{${fracIndexTex(p2, n)}}`],
      reductions: [
        {
          span: [2, 3],
          value: `${v1}`,
          bank: fillBank(
            [`${v1}`],
            [`${s}`, `${s * n}`, `${s ** (p1 + 1)}`, `${x * p1}`, ...((x * p1) % n === 0 ? [`${(x * p1) / n}`] : [])],
          ),
        },
        {
          span: [4, 5],
          value: ratioTex(second),
          bank: fillBank(
            [ratioTex(second)],
            p2 < 0
              ? [`-${s ** -p2}`, `${s ** -p2}`, `-\\frac{1}{${s ** -p2}}`]
              : [`${s}`, `${s ** (p2 + 1)}`, `\\frac{1}{${s ** p2}}`],
          ),
        },
        {
          span: [0, 3],
          operator: 1,
          value: `${a * v1}`,
          bank: fillBank([`${a * v1}`], [`${a + v1}`, `${a * s}`, `${a * v1 + a}`]),
        },
        {
          span: [0, 3],
          operator: 1,
          value: ratioTex(final),
          bank: fillBank(
            [ratioTex(final)],
            [
              ratioTex(evaluateValue({ ...params, op: -op })),
              ratioTex(ratio(final.n + final.d, final.d)),
              ratioTex(ratio(a * v1 * second.d, 1)),
            ],
          ),
        },
      ],
    };
  },
  solution: evaluateSolution6,
};

interface WholeParams {
  /** `power`: x^{p/q} is whole. `divide`: c x^{-1/2} is whole. */
  mode: 'power' | 'divide';
  p: number;
  q: number;
  c: number;
  right: number;
  wrong: number[];
}

const DIVIDE_BY = [12, 18, 20, 24, 30, 36, 40, 42, 48, 60];

function isPower(x: number, q: number): boolean {
  const root = Math.round(Math.pow(x, 1 / q));
  return root ** q === x;
}

/** Which x makes the expression whole? A native pick-one, options in order. */
const makeWhole: Generator<WholeParams> = {
  id: 'ieq-make-whole',
  sample: (rng, difficulty) => {
    if (difficulty > 1 && rng.chance(0.6)) {
      const c = rng.pick(DIVIDE_BY);
      const roots = [2, 3, 4, 5, 6, 7, 8, 9, 10];
      const t = rng.pick(roots.filter((r) => c % r === 0));
      const badSquares = roots.filter((r) => c % r !== 0).map((r) => r * r);
      const plain = Array.from({ length: 60 }, (_, i) => i + 2).filter((m) => !isPower(m, 2));
      const wrong = [...rng.sample(badSquares, 2), rng.pick(plain)];
      return { mode: 'divide', p: -1, q: 2, c, right: t * t, wrong };
    }
    const q = rng.pick([2, 3]);
    const p = rng.pick(q === 2 ? [1, 3] : [1, 2]);
    const s = rng.int(2, q === 2 ? 10 : 4);
    const right = s ** q;
    const others = Array.from({ length: right + 12 }, (_, i) => i + 2).filter((m) => !isPower(m, q));
    return { mode: 'power', p, q, c: 1, right, wrong: rng.sample(others, 3) };
  },
  render: ({ mode, p, q, c, right, wrong }): Slide => {
    const values = [right, ...wrong].sort((m, n) => m - n);
    const expression = mode === 'divide' ? `${c}x^{-\\frac{1}{2}}` : `x^{${fracIndexTex(p, q)}}`;
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `For which of these values of $x$ is $${expression}$ a whole number?` }],
      options: values.map((value) => ({ id: `x${value}`, label: `x = ${value}`, tex: true })),
      correctId: `x${right}`,
    };
  },
  solution: ({ mode, p, q, c, right, wrong }) => {
    if (mode === 'divide') {
      const t = Math.round(Math.sqrt(right));
      return [
        { text: `$${c}x^{-\\frac{1}{2}} = \\frac{${c}}{\\sqrt{x}}$, so it is whole when $\\sqrt{x}$ is a whole number that divides $${c}$.` },
        { tex: `\\frac{${c}}{\\sqrt{${right}}} = \\frac{${c}}{${t}} = ${c / t}` },
        { text: `The others fail: ${wrong.map((w) => `$${w}$`).join(', ')} either has no whole square root, or its root does not divide $${c}$.` },
      ];
    }
    const s = Math.round(Math.pow(right, 1 / q));
    const kind = q === 2 ? 'square' : 'cube';
    return [
      { text: `$x^{${fracIndexTex(p, q)}}$ is the ${rootName(q)} of $x$${p === 1 ? '' : `, to the power $${p}$`}. That is whole only when $x$ is a perfect ${kind}.` },
      { tex: `${right}^{${fracIndexTex(p, q)}} = ${s}^{${p}} = ${s ** p}` },
      { text: `None of ${wrong.map((w) => `$${w}$`).join(', ')} is a perfect ${kind}, so each of those gives a surd.` },
    ];
  },
};

interface KindParams {
  n: number;
  p: number;
  q: number;
}

/** Whole, fraction or surd? What n^{p/q} turns out to be, decided before working it out. */
const kindFlow: Generator<KindParams> = {
  id: 'ieq-kind-flow',
  sample: (rng, difficulty) => {
    const kind = rng.pick(difficulty > 1 ? (['whole', 'fraction', 'surd'] as const) : (['whole', 'surd'] as const));
    const q = rng.pick([2, 3]);
    const top = rng.pick(q === 2 ? [1, 3] : [1, 2]);
    const p = kind === 'fraction' || (kind === 'surd' && difficulty > 1 && rng.chance(0.4)) ? -top : top;
    if (kind === 'surd') {
      const plain = Array.from({ length: 48 }, (_, i) => i + 2).filter((m) => !isPower(m, q));
      return { n: rng.pick(plain), p, q };
    }
    const s = rng.int(2, q === 2 ? 9 : 4);
    return { n: s ** q, p, q };
  },
  render: ({ n, p, q }): Slide => {
    const perfect = isPower(n, q);
    const answer = !perfect ? ['No'] : p < 0 ? ['Yes', 'Yes'] : ['Yes', 'No'];
    const s = Math.round(Math.pow(n, 1 / q));
    const value = powerRatio(s, p);
    const kind = q === 2 ? 'square' : 'cube';
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Decide what kind of number this is. Each answer chooses what gets asked next.' }],
      subject: `${n}^{${fracIndexTex(p, q)}}`,
      steps: [
        {
          id: 'perfect',
          ask: `Is $${n}$ a perfect ${kind}?`,
          branches: [
            { label: 'Yes', to: 'sign' },
            {
              label: 'No',
              outcome: perfect
                ? 'Then it would be irrational, and left as a surd.'
                : `So its ${rootName(q)} is irrational, and $${n}^{${fracIndexTex(p, q)}}$ is left as a surd.`,
            },
          ],
        },
        {
          id: 'sign',
          ask: 'Is the index negative?',
          branches: [
            {
              label: 'Yes',
              outcome:
                perfect && p < 0 ? `So it is a fraction: $${ratioTex(value)}$.` : 'Then it would be a fraction, one over a whole number.',
            },
            {
              label: 'No',
              outcome: perfect && p > 0 ? `So it is a whole number: $${value.n}$.` : 'Then it would be a whole number.',
            },
          ],
        },
      ],
      answer,
    };
  },
  solution: ({ n, p, q }) => {
    const kind = q === 2 ? 'square' : 'cube';
    if (!isPower(n, q)) {
      return [
        { text: `The bottom of the index, $${q}$, asks for the ${rootName(q)} of $${n}$.` },
        { text: `$${n}$ is not a perfect ${kind}, so that root is irrational, and so is any power of it: $${n}^{${fracIndexTex(p, q)}}$ is a surd.` },
      ];
    }
    const s = Math.round(Math.pow(n, 1 / q));
    return [
      { text: `$${n} = ${s}^{${q}}$ is a perfect ${kind}, so the ${rootName(q)} is $${s}$.` },
      { tex: `${n}^{${fracIndexTex(p, q)}} = ${s}^{${p}} = ${ratioTex(powerRatio(s, p))}` },
      { text: p < 0 ? 'The negative index makes it one over a whole number: a fraction.' : 'A whole number, since both the root and the power are whole.' },
    ];
  },
};

/* Surds and indices together */

/** Surd forms with a positive index, for placing tiles, and the s and k that suit each. */
const TILE_FORMS = { easy: SURD_FORMS.slice(0, 2).concat(SURD_FORMS.slice(3, 5)), hard: SURD_FORMS };

function singleIndexPool(forms: CrossForm[]): CrossParams[] {
  return forms.flatMap((form) =>
    [2, 3, 4, 5, 6]
      .filter((s) => s ** form.Q <= 64 && s ** form.P <= 243)
      .flatMap((s) => [1, 2, 3].map((k) => ({ form, s, k }))),
  );
}

const SINGLE_EASY = singleIndexPool(TILE_FORMS.easy);
const SINGLE_HARD = singleIndexPool(TILE_FORMS.hard);

/** A surd form rewritten as one index, then solved. */
const singleIndexTiles: Generator<CrossParams> = {
  id: 'ieq-single-index-tiles',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? SINGLE_HARD : SINGLE_EASY),
  render: (params): Slide => {
    const { form, s, k } = params;
    const { P, Q } = form;
    const c = s ** P;
    const answer = [`x^{${fracIndexTex(P, Q)}}`, `${s ** Q}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Write the left-hand side as a single power of $x$${k > 1 ? `, divide off the $${k}$,` : ''} and solve. Take $x > 0$.`,
        },
        { kind: 'display', tex: `${formLhs(params)} = ${k * c}` },
      ],
      template: `{0} = ${c} \\implies x = {1}`,
      bank: fillBank(answer, [
        `x^{${fracIndexTex(Q, P)}}`,
        ...((P + 1) % Q === 0 ? [] : [`x^{${fracIndexTex(P + 1, Q)}}`]),
        `x^{${P}}`,
        `${s}`,
        `${s ** (Q + 1)}`,
        `${c * c}`,
      ]),
      answer,
    };
  },
  solution: formSolution,
};

interface SurdBaseParams {
  /** The common base. */
  b: number;
  /** The left base is b^a. */
  a: number;
  /** The right side is b^m times the nth root of b, or one over that. */
  m: number;
  n: number;
  sign: number;
}

/** The right-hand side's index as a single fraction: m + 1/n, signed. */
function surdIndex({ m, n, sign }: SurdBaseParams): Ratio {
  return ratio(sign * (m * n + 1), n);
}

function surdBaseRoot(params: SurdBaseParams): Ratio {
  const e = surdIndex(params);
  return ratio(e.n, e.d * params.a);
}

function surdBaseTex({ b, a, m, n, sign }: SurdBaseParams): string {
  const rootTex = n === 2 ? `\\sqrt{${b}}` : `\\sqrt[${n}]{${b}}`;
  const body = `${m === 0 ? '' : b ** m}${rootTex}`;
  return `${b ** a}^{x} = ${sign < 0 ? `\\frac{1}{${body}}` : body}`;
}

const SURD_BASE_TOP: Record<number, number> = { 2: 3, 3: 3, 5: 2 };
const SURD_LEFT_TOP: Record<number, number> = { 2: 4, 3: 3, 5: 2 };

function sampleSurdBase(rng: Rng, difficulty: number): SurdBaseParams {
  const b = rng.pick([2, 3, 5]);
  return {
    b,
    a: difficulty > 1 ? rng.int(2, SURD_LEFT_TOP[b]) : 1,
    m: rng.int(0, SURD_BASE_TOP[b]),
    n: rng.pick([2, 2, 3]),
    sign: rng.chance(0.3) ? -1 : 1,
  };
}

function surdBaseSolution(params: SurdBaseParams): SolutionStep[] {
  const { b, a, m, n, sign } = params;
  const e = surdIndex(params);
  const x = surdBaseRoot(params);
  const rootIndex = `\\frac{1}{${n}}`;
  return [
    {
      text: `A root is a fractional index: $${n === 2 ? `\\sqrt{${b}}` : `\\sqrt[${n}]{${b}}`} = ${b}^{${rootIndex}}$.${m === 0 ? '' : ` Multiplying by $${b ** m} = ${b}^{${m}}$ adds $${m}$ to the index.`}${sign < 0 ? ' Being underneath a fraction line makes the index negative.' : ''}`,
    },
    ...(m === 0 && sign > 0 ? [] : [{ tex: `${surdBaseTex(params).split(' = ')[1]} = ${b}^{${ratioTex(e)}}` }]),
    ...(a > 1 ? [{ text: `On the left, $${b ** a}^{x} = (${b}^{${a}})^{x} = ${b}^{${a}x}$.` }] : []),
    { tex: chain(`${lin(a, 0)} &= ${ratioTex(e)}`, ...(a > 1 ? [`x &= ${ratioTex(x)}`] : [])) },
  ];
}

/** b^x (or a power of b) equal to a surd, answer typed. */
const surdPower: Generator<SurdBaseParams> = {
  id: 'ieq-surd-power',
  choices: (params) => {
    const { a, m, n, sign } = params;
    const x = surdBaseRoot(params);
    return ratioOptions(
      x,
      // The root read as a power: sqrt(2) taken for 2^2.
      ratio(sign * (m + n), a),
      ratio(-x.n, x.d),
      // The root counted as a whole 1.
      ratio(sign * (m + 1), a),
      a > 1 ? surdIndex(params) : ratio(sign * m, 1),
    );
  },
  sample: sampleSurdBase,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$. The answer may be a fraction or negative.' },
      { kind: 'display', tex: surdBaseTex(params) },
    ],
    lead: 'x =',
    keypad: FRACTION_KEYS,
    answer: ratioAnswer(surdBaseRoot(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: surdBaseSolution,
};

/** Both sides as single powers of b, then x, on a tree. */
const surdBaseTree: Generator<SurdBaseParams> = {
  id: 'ieq-surd-base-tree',
  sample: sampleSurdBase,
  render: (params): Slide => {
    const { b, a, m, n, sign } = params;
    const e = surdIndex(params);
    const x = surdBaseRoot(params);
    const answer = [`${b}^{${lin(a, 0)}}`, `${b}^{${ratioTex(e)}}`, ratioTex(x)];
    return {
      kind: 'tree',
      prompt: [{ kind: 'prose', text: `Top row: each side as a single power of $${b}$. Bottom: $x$.` }],
      expression: surdBaseTex(params),
      nodes: [
        { id: 'left', from: [] },
        { id: 'right', from: [] },
        { id: 'x', from: ['left', 'right'] },
      ],
      bank: fillBank(answer, [
        `${b}^{${lin(a + 1, 0)}}`,
        `${b}^{${ratioTex(ratio(sign * (m + n)))}}`,
        `${b}^{${ratioTex(ratio(-e.n, e.d))}}`,
        ratioTex(ratio(-x.n, x.d)),
        ratioTex(a > 1 ? e : ratio(e.n + e.d, e.d)),
      ]),
      answer,
    };
  },
  solution: surdBaseSolution,
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
  expandSingleBracket,
  productFlow,
  rootBracketTree,
  collectBrackets,
  expandDoubleBrackets,
  squareTree,
  conjugateProduct,
  pickConjugate,
  conjugateTree,
  binomialRationalise,
  binomialRationaliseSteps,
  surdEquation,
  divideSurdSteps,
  readOff,
  formFlow,
  pythagSurd,
  diagonalSlider,
  perimeter,
  rectArea,
  unlike,
  unlikeBaseTiles,
  unlikeBaseFlow,
  unlikeEquateTree,
  fracPower,
  reciprocalTiles,
  undoTree,
  signFlow,
  crossSlider,
  hiddenQuadTiles,
  hiddenTree,
  rejectFlow,
  hiddenSolve,
  evaluateAt,
  termSteps,
  makeWhole,
  kindFlow,
  singleIndexTiles,
  surdPower,
  surdBaseTree,
  ...growthGenerators,
] as unknown as Generator<unknown>[];
