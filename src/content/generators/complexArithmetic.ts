/**
 * Complex Numbers, Level 2: multiplication, conjugates and division.
 */
import type { Generator, KeypadKey } from '../types';
import { I_KEY, coeffTex, complexTex, complexAnswer, mulComplex, nonZero } from './format';
import { options } from '../choiceVariant';

/** Division answers are fractions, so the learner needs a divide key. */
const DIVIDE_KEYS: KeypadKey[] = [{ insert: '/' }, ...I_KEY];

/* ---------- Multiplication by FOIL ---------- */

interface MulParams { a: number; b: number; c: number; d: number }

export const complexMultiply: Generator<MulParams> = {
  id: 'complex-multiply',
  // Forgetting that i^2 = -1 turns the subtraction back into an addition,
  // which is the error this question is for.
  choices: ({ a, b, c, d }) => {
    const [re, im] = mulComplex(a, b, c, d);
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    return options(
      opt(re, im),
      opt(a * c + b * d, im),
      opt(re, a * d - b * c),
      opt(a * c, b * d),
    );
  },
  sample: (rng, difficulty) => {
    const span = difficulty >= 2 ? 7 : 4;
    return {
      a: nonZero(rng, span), b: nonZero(rng, span),
      c: nonZero(rng, span), d: nonZero(rng, span),
    };
  },
  render: ({ a, b, c, d }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Expand $(${complexTex(a, b)})(${complexTex(c, d)})$.` },
    ],
    lead: `(${complexTex(a, b)})(${complexTex(c, d)}) =`,
    keypad: I_KEY,
    answer: complexAnswer(...mulComplex(a, b, c, d)),
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ a, b, c, d }) => [
    {
      text: 'Expand as you would any pair of brackets.',
      tex: `${a}\\cdot${c} + ${a}\\cdot${coeffTex(d)} + ${coeffTex(b)}\\cdot${c} + ${coeffTex(b)}\\cdot${coeffTex(d)}`,
    },
    {
      text: 'The last term carries $i^2$, which is $-1$ — that is what turns it real.',
      tex: `${coeffTex(b)} \\cdot ${coeffTex(d)} = ${b * d}i^2 = ${-(b * d)}`,
    },
    {
      text: 'Collect the real and imaginary parts.',
      tex: complexTex(...mulComplex(a, b, c, d)),
    },
  ],
};

/* ---------- Conjugates ---------- */

interface ConjParams { a: number; b: number; askProduct: boolean }

export const complexConjugate: Generator<ConjParams> = {
  id: 'complex-conjugate',
  choices: ({ a, b, askProduct }) => {
    if (askProduct) {
      return options(
        { tex: `${a * a + b * b}`, answer: `${a * a + b * b}` },
        { tex: `${a * a - b * b}`, answer: `${a * a - b * b}` },
        { tex: complexTex(a * a, 2 * a * b), answer: complexAnswer(a * a, 2 * a * b) },
        { tex: `${2 * (a * a + b * b)}`, answer: `${2 * (a * a + b * b)}` },
      );
    }
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    return options(opt(a, -b), opt(-a, b), opt(-a, -b), opt(b, a));
  },
  sample: (rng, difficulty) => ({
    a: nonZero(rng, difficulty >= 2 ? 8 : 5),
    b: nonZero(rng, difficulty >= 2 ? 8 : 5),
    // At higher difficulty, sometimes ask for z times its conjugate instead.
    askProduct: difficulty >= 2 && rng.chance(0.5),
  }),
  render: ({ a, b, askProduct }) =>
    askProduct
      ? {
          kind: 'expression',
          prompt: [
            {
              kind: 'prose',
              text: `Let $z = ${complexTex(a, b)}$. What is $z\\overline{z}$?`,
            },
          ],
          lead: `z\\overline{z} =`,
          keypad: I_KEY,
          answer: `${a * a + b * b}`,
          domain: 'complex',
          mode: 'exact',
        }
      : {
          kind: 'expression',
          prompt: [
            { kind: 'prose', text: `What is the conjugate of $${complexTex(a, b)}$?` },
          ],
          lead: `\\overline{${complexTex(a, b)}} =`,
          keypad: I_KEY,
          answer: complexAnswer(a, -b),
          domain: 'complex',
          mode: 'exact',
        },
  solution: ({ a, b, askProduct }) =>
    askProduct
      ? [
          {
            text: 'Multiplying by the conjugate is a difference of two squares.',
            tex: `(${complexTex(a, b)})(${complexTex(a, -b)}) = ${a}^2 - (${coeffTex(b)})^2`,
          },
          {
            text: 'Since $i^2 = -1$, that second term flips sign and the result is real.',
            tex: `${a * a} + ${b * b} = ${a * a + b * b}`,
          },
        ]
      : [
          {
            text: 'The conjugate keeps the real part and flips the sign of the imaginary part.',
            tex: `\\overline{${complexTex(a, b)}} = ${complexTex(a, -b)}`,
          },
        ],
};

/* ---------- Division ---------- */

interface DivParams { p: number; q: number; c: number; d: number }

/** numerator = quotient x divisor, so the division comes out exact. */
const numeratorOf = ({ p, q, c, d }: DivParams): [number, number] => mulComplex(p, q, c, d);

export const complexDivide: Generator<DivParams> = {
  id: 'complex-divide',
  choices: ({ p, q }) => {
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    return options(opt(p, q), opt(q, p), opt(p, -q), opt(-p, q));
  },
  sample: (rng, difficulty) => {
    // Choose the *quotient* first, then build a numerator that divides exactly.
    // Sampling a numerator instead would usually give an ugly fraction, which
    // tests arithmetic stamina rather than understanding of the method.
    const span = difficulty >= 2 ? 5 : 3;
    return {
      p: nonZero(rng, span),
      q: nonZero(rng, span),
      c: nonZero(rng, 3),
      d: nonZero(rng, 3),
    };
  },
  render: (params) => {
    const { p, q, c, d } = params;
    const [a, b] = numeratorOf(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Simplify $\\dfrac{${complexTex(a, b)}}{${complexTex(c, d)}}$ into the form $a + bi$.`,
        },
      ],
      lead: `\\dfrac{${complexTex(a, b)}}{${complexTex(c, d)}} =`,
      keypad: DIVIDE_KEYS,
      answer: complexAnswer(p, q),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { p, q, c, d } = params;
    const [a, b] = numeratorOf(params);
    const modulus = c * c + d * d;
    return [
      {
        text: 'Multiply top and bottom by the conjugate of the denominator. That makes the denominator real.',
        tex: `\\dfrac{${complexTex(a, b)}}{${complexTex(c, d)}} \\times \\dfrac{${complexTex(c, -d)}}{${complexTex(c, -d)}}`,
      },
      {
        text: 'The denominator becomes the sum of two squares.',
        tex: `(${complexTex(c, d)})(${complexTex(c, -d)}) = ${modulus}`,
      },
      {
        text: 'Expanding the numerator and dividing through gives:',
        tex: complexTex(p, q),
      },
    ];
  },
};

/* ---------- Powers of i ---------- */

interface PowerParams { n: number }

const I_CYCLE = ['1', 'i', '-1', '-i'];

export const powersOfI: Generator<PowerParams> = {
  id: 'powers-of-i',
  sample: (rng, difficulty) => ({ n: rng.int(2, difficulty >= 2 ? 80 : 34) }),
  render: ({ n }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `What is $i^{${n}}$?` }],
    lead: `i^{${n}} =`,
    keypad: I_KEY,
    answer: I_CYCLE[n % 4],
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ n }) => [
    {
      text: 'Powers of $i$ repeat every four steps.',
      tex: 'i^1 = i,\\quad i^2 = -1,\\quad i^3 = -i,\\quad i^4 = 1',
    },
    {
      text: `So only the remainder on division by 4 matters. Here $${n} = 4 \\times ${Math.floor(n / 4)} + ${n % 4}$.`,
      tex: `i^{${n}} = i^{${n % 4}} = ${I_CYCLE[n % 4]}`,
    },
  ],
};

export const arithmeticGenerators = [
  complexMultiply,
  complexConjugate,
  complexDivide,
  powersOfI,
];
