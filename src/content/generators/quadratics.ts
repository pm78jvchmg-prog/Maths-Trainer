/**
 * Quadratics.
 *
 * Nearly every question here is a `tiles` slide, and that is a deliberate
 * consequence of how answers are graded. The checker compares *values*, so it
 * cannot tell `(x + 3)(x - 5)` from `x^2 - 2x - 15` — they are the same
 * function. Every question in this topic asks the learner to rewrite an
 * expression into an equal one, so a typed expression slide would accept the
 * question copied straight back.
 *
 * Tiles grade the *form* instead, which is the actual skill: the blanks are the
 * numbers that had to be worked out, and the bank holds the standard wrong
 * answers alongside the right ones. Where an answer genuinely is a new number —
 * a discriminant, a root, a line of symmetry — a typed slide is used.
 *
 * Note what the templates here do *not* contain. A tiles template is split on
 * `{n}` and each literal piece between the blanks is rendered as TeX on its
 * own, so two things are forbidden: braces around a digit anywhere — `x^{2}`
 * would have its `{2}` taken for a blank marker — and `\left` or `\right`
 * spanning a blank, which leaves each half unmatched and renders as an error.
 * Hence `x^2` and plain parentheses. Both forms render identically.
 */
import type { Generator, KeypadKey, Slide } from '../types';
import { options } from '../choiceVariant';
import { ALGEBRA_KEYS } from './calculus';

/** Roots can be surds, so the formula questions need a root key. */
const SURD_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'sqrt(' }];

/** A non-zero integer, for sampling where 0 would make a degenerate question. */
function nonZero(value: number, fallback: number): number {
  return value === 0 ? fallback : value;
}

/**
 * A signed term as a tile: "+ 6x", "- 15", "- x".
 *
 * The sign is part of the tile rather than the template, because which sign a
 * term carries is half of what is being tested.
 */
function signedTile(value: number, variable = ''): string {
  const size = Math.abs(value);
  const body = variable && size === 1 ? variable : `${size}${variable}`;
  return `${value < 0 ? '-' : '+'} ${body}`;
}

/** A linear factor as a tile: "3x + 2", "x - 4". */
function factorTile(coefficient: number, constant: number): string {
  const front = coefficient === 1 ? 'x' : `${coefficient}x`;
  return `${front} ${constant < 0 ? '-' : '+'} ${Math.abs(constant)}`;
}

/**
 * A tile bank: every answer tile, plus distractors that are not already answers.
 *
 * The answers are kept with their multiplicity rather than de-duplicated. A
 * perfect-square trinomial factorises into two identical brackets, and that
 * answer needs two identical tiles to place — de-duplicating the whole bank
 * leaves the question unanswerable.
 *
 * Sorted rather than shuffled so the order is deterministic and carries no
 * information: a bank built answers-first would give the game away, and a
 * shuffle drawn from the rng would make one question render two ways and defeat
 * the deck de-duplicator.
 */
function bankOf(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  const extras = [...new Set(distractors)].filter((token) => !needed.has(token));
  return [...answer, ...extras].sort();
}

/** x^2 + bx + c, written the way it appears on the page. */
function quadraticTex(a: number, b: number, c: number): string {
  const lead = a === 1 ? 'x^{2}' : `${a}x^{2}`;
  const middle = b === 0 ? '' : ` ${signedTile(b, 'x')}`;
  const tail = c === 0 ? '' : ` ${signedTile(c)}`;
  return `${lead}${middle}${tail}`;
}

function isPerfectSquare(n: number): boolean {
  if (n < 0) return false;
  const root = Math.round(Math.sqrt(n));
  return root * root === n;
}

/* ---------- Level 1: expanding and factorising ---------- */

interface PairParams {
  p: number;
  q: number;
}

/** Expanding (x + p)(x + q). */
const expandBrackets: Generator<PairParams> = {
  id: 'quad-expand',
  // Swapping the sum and the product is the slip this question exists to catch.
  choices: ({ p, q }) =>
    options(
      { tex: quadraticTex(1, p + q, p * q), answer: `x^2 + (${p + q})*x + (${p * q})` },
      { tex: quadraticTex(1, p * q, p + q), answer: `x^2 + (${p * q})*x + (${p + q})` },
      { tex: quadraticTex(1, p + q, -p * q), answer: `x^2 + (${p + q})*x + (${-p * q})` },
      { tex: quadraticTex(1, -(p + q), p * q), answer: `x^2 + (${-(p + q)})*x + (${p * q})` },
    ),
  sample: (rng, difficulty) => ({
    p: nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), 3),
    q: nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), -4),
  }),
  render: ({ p, q }) => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'Expand and simplify.' },
      { kind: 'display', tex: `\\left(x ${signedTile(p)}\\right)\\left(x ${signedTile(q)}\\right)` },
    ],
    template: `x^2 {0} {1}`,
    // The distractors are the two standard slips — adding where you should
    // multiply and the reverse — plus both sign flips.
    bank: bankOf([signedTile(p + q, 'x'), signedTile(p * q)], [
      signedTile(p * q, 'x'),
      signedTile(p + q),
      signedTile(-(p + q), 'x'),
      signedTile(-p * q),
    ]),
    answer: [signedTile(p + q, 'x'), signedTile(p * q)],
  }),
  solution: ({ p, q }) => [
    {
      text: 'Multiply every term in the first bracket by every term in the second — four products in all.',
    },
    {
      tex: `x \\times x = x^{2} \\qquad x \\times \\left(${q}\\right) = ${q}x \\qquad \\left(${p}\\right) \\times x = ${p}x \\qquad \\left(${p}\\right)\\left(${q}\\right) = ${p * q}`,
    },
    {
      tex: `\\left(x ${signedTile(p)}\\right)\\left(x ${signedTile(q)}\\right) = ${quadraticTex(1, p + q, p * q)}`,
    },
    {
      text: `The two $x$ terms combine, so the middle coefficient is the *sum* $${p} + \\left(${q}\\right) = ${p + q}$ while the constant is the *product* $${p * q}$. Swapping those two is the error worth guarding against, and it is the same pair of numbers either way.`,
    },
  ],
};

/** Factorising x^2 + bx + c, the reverse of the above. */
const factorise: Generator<PairParams> = {
  id: 'quad-factorise',
  choices: ({ p, q }) =>
    options(
      { tex: `\\left(x ${signedTile(p)}\\right)\\left(x ${signedTile(q)}\\right)`, answer: `(x + (${p})) * (x + (${q}))` },
      { tex: `\\left(x ${signedTile(p)}\\right)\\left(x ${signedTile(q + 1)}\\right)`, answer: `(x + (${p})) * (x + (${q + 1}))` },
      { tex: `\\left(x ${signedTile(p + q)}\\right)\\left(x ${signedTile(p * q)}\\right)`, answer: `(x + (${p + q})) * (x + (${p * q}))` },
      // Flipping both signs only changes the factorisation while the two roots
      // are not each other's negatives; at q = -p it is the same pair commuted.
      ...(q === -p
        ? []
        : [{ tex: `\\left(x ${signedTile(-p)}\\right)\\left(x ${signedTile(-q)}\\right)`, answer: `(x + (${-p})) * (x + (${-q}))` }]),
    ),
  sample: (rng, difficulty) => ({
    p: nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), 2),
    q: nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), -5),
  }),
  render: ({ p, q }) => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'Factorise.' },
      { kind: 'display', tex: quadraticTex(1, p + q, p * q) },
    ],
    template: `(x {0})(x {1})`,
    bank: bankOf([signedTile(p), signedTile(q)], [
      signedTile(-p),
      signedTile(-q),
      signedTile(p + q),
      signedTile(p * q),
    ]),
    answer: [signedTile(p), signedTile(q)],
    unordered: true,
  }),
  solution: ({ p, q }) => [
    {
      text: `Look for two numbers that multiply to the constant, $${p * q}$, and add to the coefficient of $x$, $${p + q}$.`,
    },
    { tex: `${p} \\times \\left(${q}\\right) = ${p * q} \\qquad ${p} + \\left(${q}\\right) = ${p + q}` },
    {
      tex: `${quadraticTex(1, p + q, p * q)} = \\left(x ${signedTile(p)}\\right)\\left(x ${signedTile(q)}\\right)`,
    },
    {
      text:
        p * q < 0
          ? 'A negative constant means the two numbers have opposite signs, which narrows the search immediately. The larger of the two carries the sign of the middle coefficient.'
          : `A positive constant means both numbers share a sign, and the middle coefficient says which: both ${p + q < 0 ? 'negative' : 'positive'} here.`,
    },
    {
      text: 'Start from the constant rather than the middle term. It usually has fewer factor pairs, so there is less to check.',
    },
  ],
};

interface DifferenceParams {
  k: number;
  m: number;
}

/** The difference of two squares. */
const differenceOfSquares: Generator<DifferenceParams> = {
  id: 'quad-difference-squares',
  choices: ({ k, m }) =>
    options(
      { tex: `\\left(${factorTile(k, -m)}\\right)\\left(${factorTile(k, m)}\\right)`, answer: `((${k})*x + (${-m})) * ((${k})*x + (${m}))` },
      { tex: `\\left(${factorTile(k, -(m * m))}\\right)\\left(${factorTile(k, m * m)}\\right)`, answer: `((${k})*x + (${-(m * m)})) * ((${k})*x + (${m * m}))` },
      { tex: `\\left(${factorTile(k, -m)}\\right)^{2}`, answer: `((${k})*x + (${-m}))^2` },
      { tex: `\\left(${factorTile(k * k, -m)}\\right)\\left(${factorTile(k * k, m)}\\right)`, answer: `((${k * k})*x + (${-m})) * ((${k * k})*x + (${m}))` },
    ),
  sample: (rng, difficulty) => ({
    k: difficulty > 1 ? rng.int(2, 6) : rng.int(1, 3),
    m: rng.int(2, difficulty > 1 ? 12 : 11),
  }),
  render: ({ k, m }) => {
    const lead = k === 1 ? 'x^{2}' : `${k * k}x^{2}`;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Factorise.' },
        { kind: 'display', tex: `${lead} - ${m * m}` },
      ],
      template: `({0})({1})`,
      bank: bankOf([factorTile(k, -m), factorTile(k, m)], [
        factorTile(k, -(m * m)),
        factorTile(k, m * m),
        factorTile(k * k, -m),
        factorTile(k * k, m),
      ]),
      answer: [factorTile(k, -m), factorTile(k, m)],
      unordered: true,
    };
  },
  solution: ({ k, m }) => {
    const lead = k === 1 ? 'x^{2}' : `${k * k}x^{2}`;
    const front = k === 1 ? 'x' : `${k}x`;
    return [
      {
        text: 'A difference of two squares factorises into a sum and a difference of their roots, with no middle term to find.',
      },
      { tex: 'a^{2} - b^{2} = \\left(a - b\\right)\\left(a + b\\right)' },
      {
        text: `Here $${lead}$ is the square of $${front}$ and $${m * m}$ is the square of $${m}$.`,
      },
      {
        tex: `${lead} - ${m * m} = \\left(${factorTile(k, -m)}\\right)\\left(${factorTile(k, m)}\\right)`,
      },
      {
        text: `Both factors carry the *root*, $${m}$, not the original $${m * m}$. Expanding checks it: the two middle terms cancel exactly, which is what leaves no $x$ term behind.`,
      },
    ];
  },
};

interface CoefficientParams {
  p: number;
  q: number;
  s: number;
}

/** Factorising ax^2 + bx + c, where a is greater than 1. */
const factoriseWithCoefficient: Generator<CoefficientParams> = {
  id: 'quad-factorise-coefficient',
  choices: ({ p, q, s }) =>
    options(
      { tex: `\\left(${factorTile(p, q)}\\right)\\left(${factorTile(1, s)}\\right)`, answer: `((${p})*x + (${q})) * (x + (${s}))` },
      { tex: `\\left(${factorTile(p, s)}\\right)\\left(${factorTile(1, q)}\\right)`, answer: `((${p})*x + (${s})) * (x + (${q}))` },
      // Flipping both constants gives the same product whenever the middle
      // coefficient ps + q is zero: (px + q)(x + s) then equals (px - q)(x - s).
      ...(p * s + q === 0
        ? []
        : [{ tex: `\\left(${factorTile(p, -q)}\\right)\\left(${factorTile(1, -s)}\\right)`, answer: `((${p})*x + (${-q})) * (x + (${-s}))` }]),
      { tex: `\\left(${factorTile(p, q)}\\right)\\left(${factorTile(1, s + 1)}\\right)`, answer: `((${p})*x + (${q})) * (x + (${s + 1}))` },
      // Moving the coefficient to the other bracket changes the product only
      // while the two constants differ; at q = s it is the same product.
      ...(q === s
        ? []
        : [{ tex: `\\left(${factorTile(1, q)}\\right)\\left(${factorTile(p, s)}\\right)`, answer: `(x + (${q})) * ((${p})*x + (${s}))` }]),
    ),
  sample: (rng, difficulty) => ({
    p: rng.int(2, difficulty > 1 ? 6 : 4),
    q: nonZero(rng.int(difficulty > 1 ? -7 : -5, difficulty > 1 ? 7 : 5), 3),
    s: nonZero(rng.int(difficulty > 1 ? -7 : -5, difficulty > 1 ? 7 : 5), -2),
  }),
  render: ({ p, q, s }) => {
    // (px + q)(x + s) = p x^2 + (ps + q) x + qs
    const a = p;
    const b = p * s + q;
    const c = q * s;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Factorise.' },
        { kind: 'display', tex: quadraticTex(a, b, c) },
      ],
      template: `({0})({1})`,
      bank: bankOf([factorTile(p, q), factorTile(1, s)], [
        factorTile(p, s),
        factorTile(1, q),
        factorTile(p, -q),
        factorTile(1, -s),
      ]),
      answer: [factorTile(p, q), factorTile(1, s)],
      unordered: true,
    };
  },
  solution: ({ p, q, s }) => {
    const b = p * s + q;
    const c = q * s;
    return [
      {
        text: `With a coefficient on $x^{2}$ the two brackets are no longer symmetric, so the middle term is no longer a simple sum. One bracket must start with $${p}x$ and the other with $x$, because $${p}$ is prime to the factorisation.`,
      },
      {
        text: `The constants still multiply to $${c}$, but each gets multiplied by the other bracket's $x$ coefficient on the way to the middle term.`,
      },
      {
        tex: `\\left(${factorTile(p, q)}\\right)\\left(${factorTile(1, s)}\\right) = ${quadraticTex(p, b, c)}`,
      },
      {
        text: `Check the middle term by expanding: $${p} \\times \\left(${s}\\right) + \\left(${q}\\right) = ${b}$. Getting the two constants the right way round is the whole difficulty — swapping them gives a different middle term, so expanding to check is not optional here.`,
      },
    ];
  },
};

/* ---------- Level 2: solving ---------- */

interface RootParams {
  r: number;
  t: number;
}

/** Solving by factorising. */
const solveByFactorising: Generator<RootParams> = {
  id: 'quad-solve-factorise',
  choices: ({ r, t }) =>
    options(
      { tex: `x = ${r} \\quad \\text{or} \\quad x = ${t}` },
      { tex: `x = ${-r} \\quad \\text{or} \\quad x = ${-t}` },
      { tex: `x = ${r} \\quad \\text{or} \\quad x = ${-t}` },
      { tex: `x = ${r + t} \\quad \\text{or} \\quad x = ${r * t}` },
    ),
  sample: (rng, difficulty) => {
    const r = nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), 2);
    let t = nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), -3);
    if (t === r) t = r > 0 ? r - 1 || -1 : r + 1 || 1;
    return { r, t };
  },
  render: ({ r, t }) => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'Solve the equation.' },
      { kind: 'display', tex: `${quadraticTex(1, -(r + t), r * t)} = 0` },
    ],
    template: `x = {0} \\quad \\text{or} \\quad x = {1}`,
    bank: bankOf([`${r}`, `${t}`], [`${-r}`, `${-t}`, `${r + t}`, `${r * t}`]),
    answer: [`${r}`, `${t}`],
    unordered: true,
  }),
  solution: ({ r, t }) => [
    {
      text: `Factorise first. Two numbers multiplying to $${r * t}$ and adding to $${-(r + t)}$ are $${-r}$ and $${-t}$.`,
    },
    {
      tex: `${quadraticTex(1, -(r + t), r * t)} = \\left(x ${signedTile(-r)}\\right)\\left(x ${signedTile(-t)}\\right) = 0`,
    },
    {
      text: 'If a product is zero then one of its factors is zero. That is the step that turns a factorised quadratic into two linear equations, and it works only because the right-hand side is zero.',
    },
    { tex: `x ${signedTile(-r)} = 0 \\implies x = ${r} \\qquad x ${signedTile(-t)} = 0 \\implies x = ${t}` },
    {
      text: `Note the signs reverse: a factor of $\\left(x ${signedTile(-r)}\\right)$ gives a root of $${r}$. Reading the roots straight off the brackets without flipping the sign is the standard mistake.`,
    },
  ],
};

interface SquareParams {
  p: number;
  q: number;
}

/** Completing the square. */
const completeSquare: Generator<SquareParams> = {
  id: 'quad-complete-square',
  choices: ({ p, q }) =>
    options(
      { tex: `\\left(x ${signedTile(p)}\\right)^{2} ${signedTile(q)}`, answer: `(x + (${p}))^2 + (${q})` },
      { tex: `\\left(x ${signedTile(2 * p)}\\right)^{2} ${signedTile(q)}`, answer: `(x + (${2 * p}))^2 + (${q})` },
      { tex: `\\left(x ${signedTile(p)}\\right)^{2} ${signedTile(p * p + q)}`, answer: `(x + (${p}))^2 + (${p * p + q})` },
      { tex: `\\left(x ${signedTile(-p)}\\right)^{2} ${signedTile(q)}`, answer: `(x + (${-p}))^2 + (${q})` },
    ),
  sample: (rng, difficulty) => ({
    p: nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), 3),
    q: nonZero(rng.int(difficulty > 1 ? -9 : -9, 9), -4),
  }),
  render: ({ p, q }) => {
    const b = 2 * p;
    const c = p * p + q;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write in completed-square form.' },
        { kind: 'display', tex: quadraticTex(1, b, c) },
      ],
      template: `(x {0})^2 {1}`,
      bank: bankOf([signedTile(p), signedTile(q)], [
        signedTile(b),
        signedTile(-p),
        signedTile(c),
        signedTile(-q),
      ]),
      answer: [signedTile(p), signedTile(q)],
    };
  },
  solution: ({ p, q }) => {
    const b = 2 * p;
    const c = p * p + q;
    return [
      {
        text: `Halve the coefficient of $x$ and put it inside the bracket: half of $${b}$ is $${p}$.`,
      },
      { tex: `\\left(x ${signedTile(p)}\\right)^{2} = ${quadraticTex(1, b, p * p)}` },
      {
        text: `That bracket has produced a constant of $${p * p}$, but the original has $${c}$. The difference, $${c} - ${p * p} = ${q}$, is what has to be added on outside.`,
      },
      { tex: `${quadraticTex(1, b, c)} = \\left(x ${signedTile(p)}\\right)^{2} ${signedTile(q)}` },
      {
        text: `Forgetting to subtract the $${p * p}$ is the characteristic error, and it always shows up as an answer that is wrong by exactly that amount. Expanding the bracket back is the check.`,
      },
    ];
  },
};

interface FormulaParams {
  a: number;
  b: number;
  c: number;
}

/**
 * The quadratic formula, where the roots are genuinely irrational.
 *
 * The discriminant is deliberately not a perfect square: if it were, the
 * equation would factorise and the formula would be the long way round. Only
 * the larger root is asked for, so the answer is a single number and the check
 * is one evaluation rather than a probe.
 */
const quadraticFormula: Generator<FormulaParams> = {
  id: 'quad-formula',
  choices: ({ a, b, c }) => {
    const d = b * b - 4 * a * c;
    return options(
      { tex: `\\frac{${-b} + \\sqrt{${d}}}{${2 * a}}`, answer: `((${-b}) + sqrt(${d})) / (2 * (${a}))` },
      { tex: `\\frac{${b} + \\sqrt{${d}}}{${2 * a}}`, answer: `((${b}) + sqrt(${d})) / (2 * (${a}))` },
      { tex: `\\frac{${-b} - \\sqrt{${d}}}{${2 * a}}`, answer: `((${-b}) - sqrt(${d})) / (2 * (${a}))` },
      { tex: `${-b} + \\frac{\\sqrt{${d}}}{${2 * a}}`, answer: `(${-b}) + sqrt(${d}) / (2 * (${a}))` },
    );
  },
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 60; tries += 1) {
      const a = difficulty > 1 ? rng.int(2, 4) : 1;
      const b = nonZero(rng.int(-9, 9), 3);
      const c = nonZero(rng.int(-9, 9), -5);
      const discriminant = b * b - 4 * a * c;
      if (discriminant > 0 && !isPerfectSquare(discriminant)) return { a, b, c };
    }
    return { a: 1, b: 3, c: -5 };
  },
  render: ({ a, b, c }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Give the larger root exactly, leaving any surd in your answer.',
      },
    ],
    lead: `${quadraticTex(a, b, c)} = 0 \\implies x =`,
    keypad: SURD_KEYS,
    answer: `((${-b}) + sqrt(${b * b - 4 * a * c})) / (2 * (${a}))`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, c }) => {
    const discriminant = b * b - 4 * a * c;
    return [
      {
        text: 'The formula solves every quadratic, whether or not it factorises.',
      },
      { tex: 'x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}' },
      {
        tex: `a = ${a} \\qquad b = ${b} \\qquad c = ${c}`,
      },
      { tex: `b^{2} - 4ac = \\left(${b}\\right)^{2} - 4\\left(${a}\\right)\\left(${c}\\right) = ${discriminant}` },
      {
        tex: `x = \\frac{${-b} \\pm \\sqrt{${discriminant}}}{${2 * a}}`,
      },
      {
        text: `$${discriminant}$ is not a perfect square, so the roots are irrational and the equation does not factorise with whole numbers. Taking the $+$ branch gives the larger root, since $a$ is positive.`,
      },
      {
        text: 'Substitute $b$ into the formula with its own sign attached, brackets and all. A negative $b$ becoming positive in $-b$ is where most slips happen.',
      },
    ];
  },
};

/** The discriminant as a number. */
const discriminant: Generator<FormulaParams> = {
  id: 'quad-discriminant',
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty > 1 ? 5 : 3),
    b: nonZero(rng.int(-9, 9), 4),
    c: nonZero(rng.int(-9, 9), -3),
  }),
  render: ({ a, b, c }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find the discriminant $b^{2} - 4ac$.' },
      { kind: 'display', tex: `${quadraticTex(a, b, c)} = 0` },
    ],
    lead: 'b^{2} - 4ac =',
    keypad: [],
    answer: `${b * b - 4 * a * c}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, c }) => [
    { text: `Read the three coefficients off with their signs: $a = ${a}$, $b = ${b}$, $c = ${c}$.` },
    {
      tex: `b^{2} - 4ac = \\left(${b}\\right)^{2} - 4\\left(${a}\\right)\\left(${c}\\right) = ${b * b} - \\left(${4 * a * c}\\right) = ${b * b - 4 * a * c}`,
    },
    {
      text: `Squaring $b$ always gives a positive number, whatever the sign of $b$. So $\\left(${b}\\right)^{2} = ${b * b}$${b < 0 ? ', not a negative number' : ''}.`,
    },
    {
      text:
        c < 0
          ? `With $c$ negative, $-4ac$ comes out positive, so the discriminant is larger than $b^{2}$. Two sign changes in a row is where this goes wrong.`
          : 'Subtract $4ac$ as a single quantity, working out its sign before subtracting rather than during.',
    },
  ],
};

interface RootCountParams {
  a: number;
  b: number;
  c: number;
}

/** How many real roots, read off the sign of the discriminant. */
const rootCount: Generator<RootCountParams> = {
  id: 'quad-root-count',
  sample: (rng, difficulty) => {
    const a = rng.int(1, difficulty > 1 ? 4 : 2);
    const form = rng.pick(['two', 'one', 'none'] as const);
    if (form === 'one') {
      const r = nonZero(rng.int(-5, 5), 2);
      return { a, b: -2 * a * r, c: a * r * r };
    }
    const b = nonZero(rng.int(-9, 9), 5);
    if (form === 'none') {
      return { a, b, c: Math.floor((b * b) / (4 * a)) + 1 + rng.int(0, 5) };
    }
    return { a, b, c: Math.ceil((b * b) / (4 * a)) - 1 - rng.int(0, 5) };
  },
  render: ({ a, b, c }): Slide => {
    // Derived from the discriminant rather than from the sampled intent, so the
    // stated answer cannot drift from the equation actually shown.
    const d = b * b - 4 * a * c;
    const options = [
      { id: 'two', label: 'Two distinct real roots' },
      { id: 'one', label: 'Exactly one real root' },
      { id: 'none', label: 'No real roots' },
    ];
    const turn = (a + Math.abs(b) + Math.abs(c)) % options.length;
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'How many real roots does this equation have?' },
        { kind: 'display', tex: `${quadraticTex(a, b, c)} = 0` },
      ],
      options: [...options.slice(turn), ...options.slice(0, turn)],
      correctId: d > 0 ? 'two' : d === 0 ? 'one' : 'none',
    };
  },
  solution: ({ a, b, c }) => {
    const d = b * b - 4 * a * c;
    return [
      {
        text: 'The number of real roots is decided entirely by the sign of the discriminant, because it sits under a square root in the formula.',
      },
      { tex: `b^{2} - 4ac = \\left(${b}\\right)^{2} - 4\\left(${a}\\right)\\left(${c}\\right) = ${d}` },
      {
        text:
          d > 0
            ? `A positive discriminant means the square root is a real non-zero number, so the $\\pm$ produces two different answers. The curve crosses the $x$-axis twice.`
            : d === 0
              ? `A discriminant of exactly zero makes the $\\pm$ irrelevant: both branches give the same value. The curve touches the $x$-axis at one point rather than crossing it, and the quadratic is a perfect square.`
              : `A negative discriminant means the square root has no real value, so there are no real roots. The curve sits entirely above or entirely below the $x$-axis and never meets it.`,
      },
      {
        text: 'The size of the discriminant says nothing — only its sign. Computing it and then stopping to think about the sign is the whole method.',
      },
    ];
  },
};

/* ---------- Level 3: quadratic graphs ---------- */

interface VertexParams {
  p: number;
  q: number;
}

/** The turning point, which means completing the square first. */
const turningPoint: Generator<VertexParams> = {
  id: 'quad-turning-point',
  choices: ({ p, q }) =>
    options(
      { tex: `\\left(${-p}, ${q}\\right)` },
      { tex: `\\left(${p}, ${q}\\right)` },
      { tex: `\\left(${-p}, ${-q}\\right)` },
      { tex: `\\left(${q}, ${-p}\\right)` },
    ),
  sample: (rng, difficulty) => ({
    p: nonZero(rng.int(difficulty > 1 ? -8 : -6, difficulty > 1 ? 8 : 6), 2),
    q: nonZero(rng.int(-9, 9), -5),
  }),
  render: ({ p, q }) => {
    const b = 2 * p;
    const c = p * p + q;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Give the coordinates of the turning point of $y = ${quadraticTex(1, b, c)}$.`,
        },
      ],
      template: `({0}, {1})`,
      bank: bankOf([`${-p}`, `${q}`], [`${p}`, `${-q}`, `${c}`, `${b}`]),
      answer: [`${-p}`, `${q}`],
    };
  },
  solution: ({ p, q }) => {
    const b = 2 * p;
    const c = p * p + q;
    return [
      { text: 'Complete the square. The turning point can then be read straight off.' },
      { tex: `${quadraticTex(1, b, c)} = \\left(x ${signedTile(p)}\\right)^{2} ${signedTile(q)}` },
      {
        text: `A square is never negative, so the smallest the bracket can be is zero, which happens when $x = ${-p}$. There $y = ${q}$.`,
      },
      { tex: `\\text{turning point} = \\left(${-p}, ${q}\\right)` },
      {
        text: `The $x$ coordinate is the *negative* of the number inside the bracket: $\\left(x ${signedTile(p)}\\right)^{2}$ has its minimum at $x = ${-p}$, not $x = ${p}$. The $y$ coordinate is the constant outside, unchanged.`,
      },
    ];
  },
};

interface SymmetryParams {
  a: number;
  b: number;
  c: number;
}

/** The line of symmetry. */
const lineOfSymmetry: Generator<SymmetryParams> = {
  id: 'quad-symmetry',
  choices: ({ a, b }) =>
    options(
      { tex: `x = \\frac{${-b}}{${2 * a}}`, answer: `(${-b}) / (2 * (${a}))` },
      { tex: `x = \\frac{${b}}{${2 * a}}`, answer: `(${b}) / (2 * (${a}))` },
      { tex: `x = \\frac{${-b}}{${a}}`, answer: `(${-b}) / (${a})` },
      { tex: `x = \\frac{${b}}{${a}}`, answer: `(${b}) / (${a})` },
      // Inverting the fraction lands back on the answer whenever b = ±2a.
      ...(b * b === 4 * a * a
        ? []
        : [{ tex: `x = \\frac{${-2 * a}}{${b}}`, answer: `(${-2 * a}) / (${b})` }]),
    ),
  sample: (rng, difficulty) => ({
    a: difficulty > 1 ? rng.int(2, 5) : 1,
    b: difficulty > 1 ? nonZero(rng.int(-9, 9), 4) : 2 * nonZero(rng.int(-4, 4), 3),
    c: nonZero(rng.int(-9, 9), -2),
  }),
  render: ({ a, b, c }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `The curve $y = ${quadraticTex(a, b, c)}$ has a vertical line of symmetry. Give the $x$ value it passes through.`,
      },
    ],
    lead: 'x =',
    keypad: ALGEBRA_KEYS,
    answer: `(${-b}) / (2 * (${a}))`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b }) => [
    {
      text: 'A parabola is symmetric about the vertical line through its turning point, and completing the square puts that value in plain sight.',
    },
    { tex: 'x = -\\frac{b}{2a}' },
    { tex: `x = -\\frac{${b}}{2 \\times ${a}} = ${-b}/${2 * a}` },
    {
      text: 'The two roots, when they exist, sit at equal distances either side of this line. That is often the quickest way to find a second root once the first is known.',
    },
    {
      text: 'Keep the sign of $b$ attached when substituting. A negative $b$ gives a positive line of symmetry, and the double negative is where this usually goes wrong.',
    },
  ],
};

/**
 * The line of symmetry, found by dragging rather than by writing.
 *
 * Same sampling as `quad-symmetry` at difficulty 1, so the axis is always a
 * whole number in range — a slider whose answer sits between two steps is
 * unanswerable, not hard.
 *
 * The point of the shape is that it asks a different question from its typed
 * sibling. `quad-symmetry` asks the learner to evaluate -b/2a; this asks them
 * to say where the line *is*, which is the thing the formula is for and the
 * thing a learner who has only memorised the formula cannot do.
 */
const symmetrySlider: Generator<FormulaParams> = {
  id: 'quad-symmetry-slider',
  sample: (rng) => ({
    a: 1,
    b: 2 * nonZero(rng.int(-4, 4), 3),
    c: nonZero(rng.int(-9, 9), -2),
  }),
  render: ({ a, b, c }): Slide => ({
    kind: 'slider',
    prompt: [
      {
        kind: 'prose',
        text: `Slide to the line of symmetry of $y = ${quadraticTex(a, b, c)}$.`,
      },
    ],
    min: -5,
    max: 5,
    step: 1,
    answer: -b / (2 * a),
    readout: 'x = {v}',
  }),
  solution: ({ a, b }) => [
    {
      text: 'The line of symmetry runs vertically through the turning point, and its position depends only on $a$ and $b$ — moving $c$ slides the whole curve up or down without moving the line.',
    },
    { tex: 'x = -\\frac{b}{2a}' },
    { tex: `x = -\\frac{${b}}{2 \\times ${a}} = ${-b / (2 * a)}` },
    {
      text: `Here $b = ${b}$, so the line sits at $x = ${-b / (2 * a)}$. A negative $b$ puts it on the positive side, which is the sign slip to watch for.`,
    },
  ],
};

/** Building a quadratic from its roots. */
const fromRoots: Generator<RootParams> = {
  id: 'quad-from-roots',
  sample: (rng, difficulty) => {
    const r = nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), 4);
    let t = nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), -2);
    if (t === r) t = r > 0 ? r - 1 || -1 : r + 1 || 1;
    return { r, t };
  },
  render: ({ r, t }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `A curve crosses the $x$-axis at $x = ${r}$ and $x = ${t}$, and the coefficient of $x^{2}$ is 1. Write its equation in the form $x^{2} + bx + c$.`,
      },
    ],
    lead: 'y =',
    keypad: ALGEBRA_KEYS,
    answer: `(x - (${r})) * (x - (${t}))`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ r, t }) => [
    {
      text: `A root at $x = ${r}$ means $\\left(x ${signedTile(-r)}\\right)$ is a factor, because that bracket is zero exactly there.`,
    },
    { tex: `y = \\left(x ${signedTile(-r)}\\right)\\left(x ${signedTile(-t)}\\right)` },
    { tex: `y = ${quadraticTex(1, -(r + t), r * t)}` },
    {
      text: `The signs flip going from root to factor: a root of $${r}$ gives a factor of $\\left(x ${signedTile(-r)}\\right)$. This is the reverse of the step used when solving, and it trips people in exactly the same place.`,
    },
    {
      text: 'Any multiple of this would have the same roots, which is why the question has to fix the coefficient of $x^{2}$ before the answer is unique.',
    },
  ],
};

export const quadraticsGenerators = [
  expandBrackets,
  factorise,
  differenceOfSquares,
  factoriseWithCoefficient,
  solveByFactorising,
  completeSquare,
  quadraticFormula,
  discriminant,
  rootCount,
  turningPoint,
  lineOfSymmetry,
  symmetrySlider,
  fromRoots,
] as unknown as Generator<unknown>[];
