/**
 * Question generators for the Complex Numbers course.
 *
 * Every generator draws its parameters from a seeded RNG, then derives both the
 * expected answer and the worked solution from those same parameters. Nothing
 * is hard-coded, so replaying a lesson gives fresh numbers, and the "Show me"
 * steps always describe the question actually on screen.
 */
import type { Generator, KeypadKey } from '../types';
import { coeffTex, complexTex } from './format';

/** The imaginary unit, offered as a key on every keypad in this course. */
const I_KEY: KeypadKey[] = [{ insert: 'i', tex: true }];

const coeff = coeffTex;

/* ---------- i squared ---------- */

interface SquareParams { k: number }

export const imaginarySquare: Generator<SquareParams> = {
  id: 'imaginary-square',
  sample: (rng, difficulty) => ({ k: rng.int(2, difficulty >= 2 ? 12 : 6) }),
  render: ({ k }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `If $i = \\sqrt{-1}$, what is $${k}i^2$?` }],
    lead: `${k}i^2 =`,
    keypad: I_KEY,
    answer: `${-k}`,
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ k }) => [
    { text: 'Squaring $i$ gives $-1$ by definition.', tex: 'i^2 = -1' },
    { text: 'So multiply that by the coefficient.', tex: `${k}i^2 = ${k} \\times (-1) = ${-k}` },
  ],
};

/* ---------- Adding and subtracting imaginary terms ---------- */

interface SumParams { a: number; b: number; subtract: boolean }

export const imaginarySum: Generator<SumParams> = {
  id: 'imaginary-sum',
  sample: (rng, difficulty) => {
    const top = difficulty >= 2 ? 14 : 9;
    const a = rng.int(2, top);
    const b = rng.int(2, top);
    const subtract = difficulty >= 2 ? rng.chance(0.5) : false;
    return { a, b, subtract };
  },
  render: ({ a, b, subtract }) => {
    const total = subtract ? a - b : a + b;
    const op = subtract ? '-' : '+';
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `What is $${a}i ${op} ${b}i$?` }],
      lead: `${a}i ${op} ${b}i =`,
      keypad: I_KEY,
      answer: total === 0 ? '0' : coeff(total),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: ({ a, b, subtract }) => {
    const total = subtract ? a - b : a + b;
    const op = subtract ? '-' : '+';
    return [
      {
        text: 'Imaginary terms combine like terms in algebra: the $i$ comes along for the ride.',
        tex: `${a}i ${op} ${b}i = (${a} ${op} ${b})i`,
      },
      { text: 'Work out the coefficient.', tex: `(${a} ${op} ${b})i = ${total === 0 ? '0' : coeff(total)}` },
    ];
  },
};

/* ---------- Multiplying two imaginary terms ---------- */

interface ProductParams { a: number; b: number }

export const imaginaryProduct: Generator<ProductParams> = {
  id: 'imaginary-product',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty >= 2 ? 9 : 5),
    b: rng.int(2, difficulty >= 2 ? 9 : 5),
  }),
  render: ({ a, b }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `What is $${a}i \\times ${b}i$?` }],
    lead: `${a}i \\times ${b}i =`,
    keypad: I_KEY,
    answer: `${-(a * b)}`,
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ a, b }) => [
    {
      text: 'Multiply the coefficients and the $i$ terms separately.',
      tex: `${a}i \\times ${b}i = (${a} \\times ${b})(i \\times i) = ${a * b}i^2`,
    },
    {
      text: 'Then replace $i^2$ with $-1$ — this is why the answer comes out real.',
      tex: `${a * b}i^2 = ${a * b} \\times (-1) = ${-(a * b)}`,
    },
  ],
};

/* ---------- Square roots of negative numbers ---------- */

interface RootParams { n: number }

export const sqrtNegative: Generator<RootParams> = {
  id: 'sqrt-negative',
  sample: (rng, difficulty) => ({ n: rng.int(2, difficulty >= 2 ? 12 : 7) }),
  render: ({ n }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `What is $\\sqrt{-${n * n}}$?` }],
    lead: `\\sqrt{-${n * n}} =`,
    keypad: I_KEY,
    answer: `${n}i`,
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ n }) => [
    { text: 'Split the negative out as a factor of $-1$.', tex: `\\sqrt{-${n * n}} = \\sqrt{${n * n}} \\times \\sqrt{-1}` },
    { text: 'The square root of $-1$ is $i$.', tex: `= ${n} \\times i = ${n}i` },
  ],
};

/* ---------- Does it have real solutions? ---------- */

interface RealParams { value: number; hasReal: boolean }

export const realSolutions: Generator<RealParams> = {
  id: 'real-solutions',
  sample: (rng) => {
    // Mix in positives so the answer is not always "no" — otherwise the pattern
    // can be learned without the idea behind it.
    const hasReal = rng.chance(0.4);
    const magnitude = rng.int(1, 9);
    return { value: hasReal ? magnitude : -magnitude, hasReal };
  },
  render: ({ value }) => ({
    kind: 'choice',
    prompt: [
      { kind: 'prose', text: 'Does this equation have any real solutions?' },
      { kind: 'display', tex: `x^2 = ${value}` },
    ],
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
    ],
    correctId: value >= 0 ? 'yes' : 'no',
  }),
  solution: ({ value }) =>
    value >= 0
      ? [
          {
            text: 'A real number squared is never negative, and here the right-hand side is not negative.',
            tex: `x = \\pm\\sqrt{${value}}`,
          },
        ]
      : [
          {
            text: 'Squaring any real number gives something at or above zero, so it can never equal a negative.',
            tex: `x^2 \\geq 0 \\text{ for all real } x`,
          },
          { text: `There is no real $x$ with $x^2 = ${value}$.` },
        ],
};

/* ---------- Both roots, as tiles ---------- */

interface RootsParams { n: number; bank: string[] }

export const bothRoots: Generator<RootsParams> = {
  id: 'both-roots',
  sample: (rng) => {
    const n = rng.int(2, 6);
    const distractors = [1, 2, 3, 4, 5, 6, 7]
      .filter((d) => d !== n)
      .slice(0, 4)
      .flatMap((d) => [`${d}`, `-${d}`]);
    const bank = rng.shuffle([`${n}`, `-${n}`, ...rng.sample(distractors, 4)]);
    return { n, bank };
  },
  render: ({ n, bank }) => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'Give both solutions to the equation.' },
      { kind: 'display', tex: `x^2 = ${n * n}` },
    ],
    template: `x = {0} \\text{ or } x = {1}`,
    bank,
    answer: [`-${n}`, `${n}`],
    unordered: true,
  }),
  solution: ({ n }) => [
    {
      text: 'Take the square root of both sides, remembering that squaring removes a minus sign.',
      tex: `x = \\pm\\sqrt{${n * n}} = \\pm ${n}`,
    },
    { text: 'Both values satisfy the equation.', tex: `(-${n})^2 = ${n * n} \\quad\\text{and}\\quad ${n}^2 = ${n * n}` },
  ],
};

/* ---------- Adding complex numbers ---------- */

interface AddParams { a: number; b: number; c: number; d: number }

export const complexAdd: Generator<AddParams> = {
  id: 'complex-add',
  sample: (rng, difficulty) => {
    const span = difficulty >= 2 ? 9 : 6;
    const draw = () => rng.int(1, span) * (difficulty >= 2 ? rng.sign() : 1);
    return { a: draw(), b: draw(), c: draw(), d: draw() };
  },
  render: ({ a, b, c, d }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `What is $(${complexTex(a, b)}) + (${complexTex(c, d)})$?`,
      },
    ],
    lead: `(${complexTex(a, b)}) + (${complexTex(c, d)}) =`,
    keypad: I_KEY,
    answer: `${a + c} + (${b + d})*i`,
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ a, b, c, d }) => [
    {
      text: 'Add the real parts and the imaginary parts separately.',
      tex: `(${a} + ${c}) + (${b} + ${d})i`,
    },
    { text: 'Which simplifies to:', tex: complexTex(a + c, b + d) },
  ],
};

/* ---------- Identifying the real part ---------- */

interface PartParams { a: number; b: number; wantReal: boolean; options: number[] }

export const complexPart: Generator<PartParams> = {
  id: 'complex-part',
  sample: (rng) => {
    const a = rng.int(1, 9) * rng.sign();
    const b = rng.int(1, 9) * rng.sign();
    const wantReal = rng.chance(0.5);
    const target = wantReal ? a : b;

    // Distractors that punish the common mistakes: reading the wrong component,
    // and losing the sign.
    const candidates = [wantReal ? b : a, -target, target + 1];
    const options = new Set<number>([target]);
    for (const value of candidates) {
      if (options.size < 3) options.add(value);
    }
    // Shuffled in `sample`, not `render`, so the answer is not always first.
    return { a, b, wantReal, options: rng.shuffle([...options]) };
  },
  render: ({ a, b, wantReal, options }) => ({
    kind: 'choice',
    prompt: [
      {
        kind: 'prose',
        text: `What is the ${wantReal ? 'real' : 'imaginary'} part of $${complexTex(a, b)}$?`,
      },
    ],
    options: options.map((value) => ({ id: `${value}`, label: `${value}` })),
    correctId: `${wantReal ? a : b}`,
  }),
  solution: ({ a, b, wantReal }) => [
    {
      text: 'A complex number is written $a + bi$: $a$ is the real part and $b$ is the imaginary part.',
      tex: `${complexTex(a, b)}`,
    },
    {
      text: wantReal
        ? `So the real part is $${a}$. Note it is the number without the $i$.`
        : `So the imaginary part is $${b}$ — the coefficient of $i$, not $${b}i$ itself.`,
    },
  ],
};

export const complexGenerators = [
  imaginarySquare,
  imaginarySum,
  imaginaryProduct,
  sqrtNegative,
  realSolutions,
  bothRoots,
  complexAdd,
  complexPart,
];
