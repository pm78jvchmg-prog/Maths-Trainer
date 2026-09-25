/**
 * Complex Numbers, Level 2: multiplication, conjugates and division.
 */
import type { Generator, KeypadKey } from '../types';
import { I_KEY, coeffTex, complexTex, complexAnswer, gcd, mulComplex, nonZero } from './format';
import { options } from '../choiceVariant';

/** Division answers are fractions, so the learner needs a divide key. */
const DIVIDE_KEYS: KeypadKey[] = [{ insert: '/' }, ...I_KEY];

/** Wraps a TeX fragment that starts with a minus sign, so it survives being squared. */
const paren = (tex: string): string => (tex.startsWith('-') ? `\\left(${tex}\\right)` : tex);

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
      // Same `\cdoti` hazard as divide-reverse below: a space after `\cdot`.
      tex: `${paren(`${a}`)}\\cdot ${paren(`${c}`)} + ${paren(`${a}`)}\\cdot ${paren(coeffTex(d))} + ${paren(coeffTex(b))}\\cdot ${paren(`${c}`)} + ${paren(coeffTex(b))}\\cdot ${paren(coeffTex(d))}`,
    },
    {
      text: 'The last term carries $i^2$, which is $-1$ — that is what turns it real.',
      tex: `${coeffTex(b)} \\cdot ${coeffTex(d)} = ${coeffTex(b * d, 'i^2')} = ${-(b * d)}`,
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

/* ---------- Conjugates, run backwards ---------- */

interface RecoverParams { a: number; b: number }

/**
 * Given the real part and $z\overline{z}$, recover $z$.
 *
 * `b` starts at 2, not 1: at $b = 1$ the "forgot the root" distractor
 * $(a, b^2)$ *is* the answer, and the slide would offer two right options.
 */
export const conjugateRecover: Generator<RecoverParams> = {
  id: 'conjugate-recover',
  choices: ({ a, b }) => {
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    // The wrong sign, the parts swapped, and the root forgotten. The swap
    // collapses into the answer's label when a = b, and `options()` drops it.
    return options(opt(a, b), opt(a, -b), opt(b, a), opt(a, b * b));
  },
  sample: (rng, difficulty) => ({
    a: difficulty >= 2 ? nonZero(rng, 6) : rng.int(1, 6),
    b: rng.int(2, difficulty >= 2 ? 7 : 6),
  }),
  render: ({ a, b }) => {
    const n = a * a + b * b;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$z$ has real part $${a}$ and $z\\overline{z} = ${n}$. Its imaginary part is positive. What is $z$?`,
        },
      ],
      lead: 'z =',
      keypad: I_KEY,
      answer: complexAnswer(a, b),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: ({ a, b }) => {
    const n = a * a + b * b;
    return [
      {
        text: '$z\\overline{z} = a^2 + b^2$, and the real part is known, so the imaginary part is one subtraction away.',
        tex: `b^2 = ${n} - ${paren(`${a}`)}^2 = ${n} - ${a * a} = ${b * b}`,
      },
      {
        text: 'Two numbers square to that; the question says the imaginary part is positive.',
        tex: `b = ${b}`,
      },
      { tex: `z = ${complexTex(a, b)}` },
      {
        text: `The other number with the same real part and the same $z\\overline{z}$ is the conjugate, $${complexTex(a, -b)}$ — which is why the sign had to be given.`,
      },
    ];
  },
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

/* ---------- Division, run backwards ---------- */

interface DivideReverseParams { p: number; q: number; c: number; d: number }

export const divideReverse: Generator<DivideReverseParams> = {
  id: 'divide-reverse',
  choices: ({ p, q, c, d }) => {
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    // The conjugate used instead of the divisor, i^2 left as +1, and both
    // signs lost. No sum distractor: (p + qi) + (c + di) equals the product at
    // p = q = 1, c = 1, d = -1, and that seed would fail the distractor test.
    return options(
      opt(...mulComplex(p, q, c, d)),
      opt(...mulComplex(p, q, c, -d)),
      opt(p * c + q * d, p * d + q * c),
      opt(-(p * c - q * d), -(p * d + q * c)),
    );
  },
  sample: (rng, difficulty) => {
    const span = difficulty >= 2 ? 5 : 3;
    return {
      p: nonZero(rng, span),
      q: nonZero(rng, span),
      c: nonZero(rng, 3),
      d: nonZero(rng, 3),
    };
  },
  render: ({ p, q, c, d }) => {
    const [zr, zi] = mulComplex(p, q, c, d);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Division undoes multiplication. If' },
        { kind: 'display', tex: `\\dfrac{z}{${complexTex(c, d)}} = ${complexTex(p, q)}` },
        { kind: 'prose', text: 'what is $z$?' },
      ],
      lead: 'z =',
      keypad: I_KEY,
      answer: complexAnswer(zr, zi),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: ({ p, q, c, d }) => {
    const [zr, zi] = mulComplex(p, q, c, d);
    return [
      {
        text: 'Multiply back up: $z$ is the quotient times the divisor.',
        // `\cdot` needs a separator: `\cdot` immediately followed by the bare
        // `i` that coeffTex returns for +-1 concatenates into `\cdoti`, an
        // undefined control sequence KaTeX renders as red error text. The
        // generated-TeX sweep never walks solution(), so nothing here catches it.
        tex: `z = (${complexTex(p, q)})(${complexTex(c, d)}) = ${paren(`${p}`)}\\cdot ${paren(`${c}`)} + ${paren(`${p}`)}\\cdot ${paren(coeffTex(d))} + ${paren(coeffTex(q))}\\cdot ${paren(`${c}`)} + ${paren(coeffTex(q))}\\cdot ${paren(coeffTex(d))}`,
      },
      {
        text: 'The last term carries $i^2 = -1$, which is what turns it real.',
        tex: `z = ${complexTex(zr, zi)}`,
      },
      {
        text: `Check by dividing again — multiply top and bottom by $${complexTex(c, -d)}$ — and $${complexTex(p, q)}$ returns.`,
      },
    ];
  },
};

/* ---------- Which multiplier makes the bottom real? ---------- */

interface WhichMultiplierParams { a: number; b: number; c: number; d: number }

export const divideWhichMultiplier: Generator<WhichMultiplierParams> = {
  id: 'divide-which-multiplier',
  /**
   * The numerator must not make the denominator real either way round.
   *
   * `(c + di)(a - bi)` is real when `ad = bc`, and `(c + di)(a + bi)` is real
   * when `ad = -bc` — so on those draws the numerator or its conjugate answers
   * the question as well as the denominator's conjugate does, and a learner who
   * picks it is marked wrong on a sealed check. Excluding both conditions also
   * subsumes the weaker "numerator is not the denominator or its conjugate",
   * which is what keeps the four labels pairwise distinct.
   */
  sample: (rng, difficulty) => {
    const c = nonZero(rng, 3);
    const d = nonZero(rng, 3);
    const span = difficulty >= 2 ? 5 : 3;
    let a = nonZero(rng, span);
    let b = nonZero(rng, span);
    while (a * d === b * c || a * d === -(b * c)) {
      a = nonZero(rng, span);
      b = nonZero(rng, span);
    }
    return { a, b, c, d };
  },
  render: ({ a, b, c, d }) => {
    // Every option is a fraction equal to 1, so none of them is being compared
    // as an expression and none carries an `answer`.
    const over = (x: number, y: number) => `\\dfrac{${complexTex(x, y)}}{${complexTex(x, y)}}`;
    const labels = [over(c, -d), over(c, d), over(a, -b), over(a, b)];
    const correct = labels[0];
    // Sorted rather than shuffled, so the same question renders one way and
    // the deck de-duplicator can recognise a repeat.
    const ordered = [...labels].sort((x, y) => x.localeCompare(y));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: 'To write this in the form $a + bi$, what do you multiply the top and the bottom by?',
        },
        { kind: 'display', tex: `\\dfrac{${complexTex(a, b)}}{${complexTex(c, d)}}` },
      ],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
      correctId: `opt${ordered.indexOf(correct)}`,
    };
  },
  solution: ({ a, b, c, d }) => [
    {
      text: 'The conjugate of the denominator, and only that, makes the bottom real.',
      tex: `(${complexTex(c, d)})(${complexTex(c, -d)}) = ${c * c + d * d}`,
    },
    {
      text: `Multiplying by the denominator itself squares it and leaves it complex; the numerator's conjugate, $${complexTex(a, -b)}$, clears nothing at all.`,
    },
  ],
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

/* ---------- Squaring ---------- */

interface SquareParams { a: number; b: number }

/**
 * $(a + bi)^2$, which is a special case of the FOIL above and yet the one
 * people get wrong far more often.
 *
 * The reason is that the square of a bracket invites the answer "square each
 * part", and with real numbers that is at least visibly wrong; here $a^2 +
 * b^2 i$ looks like a complex number and passes inspection. Asking it as its
 * own question makes the cross term the subject rather than a detail of a
 * longer expansion.
 */
export const complexSquare: Generator<SquareParams> = {
  id: 'complex-square',
  choices: ({ a, b }) => {
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    // Each part squared on its own, i^2 left as +1, and the cross term
    // counted once instead of twice.
    return options(
      opt(a * a - b * b, 2 * a * b),
      opt(a * a, b * b),
      opt(a * a + b * b, 2 * a * b),
      opt(a * a - b * b, a * b),
    );
  },
  sample: (rng, difficulty) => ({
    a: nonZero(rng, difficulty >= 2 ? 8 : 5),
    b: nonZero(rng, difficulty >= 2 ? 8 : 5),
  }),
  render: ({ a, b }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `Expand $(${complexTex(a, b)})^2$.` }],
    lead: `(${complexTex(a, b)})^2 =`,
    keypad: I_KEY,
    answer: complexAnswer(a * a - b * b, 2 * a * b),
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ a, b }) => [
    {
      text: 'A squared bracket is still two brackets, so the cross term appears twice.',
      tex: `(${complexTex(a, b)})^2 = ${paren(`${a}`)}^2 + 2 \\cdot ${paren(`${a}`)}\\cdot ${paren(coeffTex(b))} + ${paren(coeffTex(b))}^2`,
    },
    {
      text: 'The last term carries $i^2 = -1$, so it lands in the real part with its sign turned over.',
      // For b = 1 the left is already i^2: writing it again would say the same thing twice.
      tex: `${paren(coeffTex(b))}^2 = ${b === 1 ? '' : `${coeffTex(b * b, 'i^2')} = `}${-(b * b)}`,
    },
    {
      text: 'Collect what is left.',
      tex: complexTex(a * a - b * b, 2 * a * b),
    },
    {
      text: `Squaring the two parts separately would give $${complexTex(a * a, b * b)}$ — wrong in both components, and it looks perfectly reasonable.`,
    },
  ],
};

/* ---------- Multiplying by i is a quarter turn ---------- */

/** The grid the plane widget draws, matching every other plane question. */
const PLANE_RANGE = 4;

interface TurnParams { re: number; im: number; clockwise: boolean }

/**
 * What multiplication by $i$ *does*, asked on the plane rather than in
 * symbols.
 *
 * $i(a + bi) = -b + ai$ is one line of algebra and says nothing; watching the
 * point swing a quarter turn about the origin is the fact worth carrying, and
 * it is what makes $i^4 = 1$ obvious later. The answer is a tap, so the
 * learner has to know where the point went, not how to write it down.
 */
export const multiplyByI: Generator<TurnParams> = {
  id: 'multiply-by-i',
  sample: (rng, difficulty) => {
    const draw = () =>
      difficulty < 2 ? rng.int(1, PLANE_RANGE) * rng.sign() : rng.int(-PLANE_RANGE, PLANE_RANGE);
    let re = draw();
    let im = draw();
    while (re === 0 && im === 0) {
      re = draw();
      im = draw();
    }
    return { re, im, clockwise: difficulty >= 2 && rng.chance(0.5) };
  },
  render: ({ re, im, clockwise }) => ({
    kind: 'plot',
    prompt: [
      {
        kind: 'prose',
        text: `Plot $${clockwise ? '-' : ''}iz$, where $z = ${complexTex(re, im)}$.`,
      },
    ],
    range: PLANE_RANGE,
    // i(a + bi) = -b + ai; -i(a + bi) = b - ai.
    answer: clockwise ? { re: im, im: -re } : { re: -im, im: re },
  }),
  solution: ({ re, im, clockwise }) => {
    const [x, y] = clockwise ? [im, -re] : [-im, re];
    return [
      {
        text: 'Multiply out, and remember the $i^2$ in the second term.',
        tex: `${clockwise ? '-' : ''}i(${complexTex(re, im)}) = ${complexTex(x, y)}`,
      },
      {
        text: `The real and imaginary parts have swapped and one of them changed sign. On the plane that is a quarter turn about the origin, ${clockwise ? 'clockwise' : 'anticlockwise'}.`,
      },
      {
        text: 'Four of those turns bring the point back where it started, which is $i^4 = 1$ drawn rather than calculated.',
      },
    ];
  },
};

/* ---------- z plus and minus its conjugate ---------- */

interface ConjSumParams { a: number; b: number; subtract: boolean }

/**
 * $z + \overline{z}$ and $z - \overline{z}$.
 *
 * Both are ways of pulling one component out of a complex number without
 * looking at it: the sum keeps twice the real part and kills the imaginary,
 * and the difference does the reverse. That is the idea behind the conjugate
 * trick in division, and it is easier to see here, where there is no fraction
 * in the way.
 */
export const conjugateSum: Generator<ConjSumParams> = {
  id: 'conjugate-sum',
  choices: ({ a, b, subtract }) => {
    if (subtract) {
      // The i dropped, the subtraction taken the other way round, and the
      // "they cancel" answer that the sum would give.
      return options(
        { tex: coeffTex(2 * b), answer: complexAnswer(0, 2 * b) },
        { tex: `${2 * b}`, answer: `${2 * b}` },
        { tex: coeffTex(-2 * b), answer: complexAnswer(0, -2 * b) },
        { tex: '0', answer: '0' },
      );
    }
    return options(
      { tex: `${2 * a}`, answer: `${2 * a}` },
      { tex: '0', answer: '0' },
      { tex: `${a}`, answer: `${a}` },
      { tex: complexTex(2 * a, 2 * b), answer: complexAnswer(2 * a, 2 * b) },
    );
  },
  sample: (rng, difficulty) => ({
    a: nonZero(rng, difficulty >= 2 ? 9 : 6),
    b: nonZero(rng, difficulty >= 2 ? 9 : 6),
    subtract: rng.chance(0.5),
  }),
  render: ({ a, b, subtract }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Let $z = ${complexTex(a, b)}$. What is $z ${subtract ? '-' : '+'} \\overline{z}$?`,
      },
    ],
    lead: `z ${subtract ? '-' : '+'} \\overline{z} =`,
    keypad: I_KEY,
    answer: subtract ? complexAnswer(0, 2 * b) : `${2 * a}`,
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ a, b, subtract }) => [
    {
      text: 'Write the conjugate out and line the two up.',
      tex: `z = ${complexTex(a, b)}, \\quad \\overline{z} = ${complexTex(a, -b)}`,
    },
    subtract
      ? {
          text: 'Subtracting cancels the real parts and doubles the imaginary one.',
          tex: `z - \\overline{z} = ${coeffTex(2 * b)}`,
        }
      : {
          text: 'Adding cancels the imaginary parts and doubles the real one.',
          tex: `z + \\overline{z} = ${2 * a}`,
        },
    {
      text: subtract
        ? 'So the difference is always purely imaginary, whatever $z$ was — the real part never survives it.'
        : 'So the sum is always real, whatever $z$ was. This is the whole reason multiplying by a conjugate clears an $i$ out of a denominator.',
    },
  ],
};

/* ---------- Reciprocals ---------- */

interface ReciprocalParams { c: number; d: number; bank: string[] }

/**
 * $1/z$ written as $a + bi$, assembled from tiles.
 *
 * The same method as `complex-divide` with the numerator taken away, which is
 * what makes the denominator's job visible: $c^2 + d^2$ is the number
 * everything ends up over, and the imaginary part is the only thing whose sign
 * moves. The template says "minus" out loud so the question is which
 * fractions go where, not whether a sign was noticed.
 *
 * `c` and `d` are coprime, which makes both fractions already in lowest terms:
 * $\gcd(c,\, c^2 + d^2) = \gcd(c,\, d^2)$, so a shared factor is impossible.
 * Without that a learner who simplifies correctly would find no tile to match.
 */
export const reciprocal: Generator<ReciprocalParams> = {
  id: 'reciprocal',
  sample: (rng, difficulty) => {
    const top = difficulty >= 2 ? 9 : 6;
    let c = rng.int(1, top);
    let d = rng.int(1, top);
    while (c === d || gcd(c, d) !== 1) {
      c = rng.int(1, top);
      d = rng.int(1, top);
    }
    const n = c * c + d * d;
    // Distractors are the two ways the denominator gets built wrongly: the
    // parts added rather than squared, and the numerator squared along with
    // them. Nothing here can degenerate into a fraction like 1/1, which an
    // earlier draft offered whenever a part was 1.
    const bank = [
      `\\tfrac{${c}}{${n}}`,
      `\\tfrac{${d}}{${n}}`,
      `\\tfrac{${c}}{${c + d}}`,
      `\\tfrac{${d}}{${c + d}}`,
      `\\tfrac{${c * c}}{${n}}`,
    ];
    return { c, d, bank: rng.shuffle([...new Set(bank)]) };
  },
  render: ({ c, d, bank }) => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'Write the reciprocal in the form $a - bi$, with $a$ and $b$ positive.' },
      { kind: 'display', tex: `z = ${complexTex(c, d)}` },
    ],
    template: `z^{-1} = {0} - {1}i`,
    bank,
    answer: [`\\tfrac{${c}}{${c * c + d * d}}`, `\\tfrac{${d}}{${c * c + d * d}}`],
  }),
  solution: ({ c, d }) => {
    const n = c * c + d * d;
    return [
      {
        text: 'Multiply top and bottom by the conjugate of the denominator — the same move as any other division.',
        tex: `\\dfrac{1}{${complexTex(c, d)}} \\times \\dfrac{${complexTex(c, -d)}}{${complexTex(c, -d)}}`,
      },
      {
        text: 'The bottom becomes the sum of two squares, and the top is just the conjugate.',
        tex: `= \\dfrac{${complexTex(c, -d)}}{${c}^2 + ${d}^2} = \\dfrac{${complexTex(c, -d)}}{${n}}`,
      },
      {
        text: 'Split the fraction across the two parts.',
        tex: `= \\tfrac{${c}}{${n}} - \\tfrac{${d}}{${n}}i`,
      },
      {
        text: `So only the imaginary part changed sign. Note $${n} = |z|^2$ — every reciprocal lands over the square of the modulus.`,
      },
    ];
  },
};

export const arithmeticGenerators = [
  complexMultiply,
  complexConjugate,
  conjugateRecover,
  complexDivide,
  divideReverse,
  divideWhichMultiplier,
  powersOfI,
  complexSquare,
  multiplyByI,
  conjugateSum,
  reciprocal,
];
