/**
 * Question generators for the Complex Numbers course.
 *
 * Every generator draws its parameters from a seeded RNG, then derives both the
 * expected answer and the worked solution from those same parameters. Nothing
 * is hard-coded, so replaying a lesson gives fresh numbers, and the "Show me"
 * steps always describe the question actually on screen.
 */
import type { Generator } from '../types';
import { I_KEY, coeffTex, complexTex, complexAnswer, distinct, nonZero } from './format';
import { options } from '../choiceVariant';


/* ---------- i squared ---------- */

interface SquareParams { k: number }

export const imaginarySquare: Generator<SquareParams> = {
  id: 'imaginary-square',
  sample: (rng, difficulty) => ({ k: rng.int(2, difficulty >= 2 ? 40 : 30) }),
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
  // The other operation, which is the only thing this question can get wrong.
  choices: ({ a, b, subtract }) => {
    const total = subtract ? a - b : a + b;
    const other = subtract ? a + b : a - b;
    const opt = (n: number) => ({ tex: n === 0 ? '0' : coeffTex(n), answer: n === 0 ? '0' : coeffTex(n) });
    return options(opt(total), opt(other), opt(-total), opt(total + 1));
  },
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
      answer: total === 0 ? '0' : coeffTex(total),
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
      { text: 'Work out the coefficient.', tex: `(${a} ${op} ${b})i = ${total === 0 ? '0' : coeffTex(total)}` },
    ];
  },
};

/* ---------- Multiplying two imaginary terms ---------- */

interface ProductParams { a: number; b: number }

export const imaginaryProduct: Generator<ProductParams> = {
  id: 'imaginary-product',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty >= 2 ? 12 : 9),
    b: rng.int(2, difficulty >= 2 ? 12 : 9),
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
  sample: (rng, difficulty) => ({ n: rng.int(2, difficulty >= 2 ? 30 : 27) }),
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
  sample: (rng, difficulty) => {
    // Mix in positives so the answer is not always "no" — otherwise the pattern
    // can be learned without the idea behind it.
    const hasReal = rng.chance(0.4);
    const magnitude = rng.int(1, difficulty >= 2 ? 40 : 24);
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
  sample: (rng, difficulty) => {
    const n = rng.int(2, difficulty >= 2 ? 9 : 6);
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
    answer: complexAnswer(a + c, b + d),
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
  sample: (rng, difficulty) => {
    const a = rng.int(1, difficulty >= 2 ? 15 : 9) * rng.sign();
    const b = rng.int(1, difficulty >= 2 ? 15 : 9) * rng.sign();
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

/* ---------- Quadratics with complex roots ---------- */

interface QuadraticParams { p: number; q: number }

/** x^2 + bx + c as the learner reads it; b is always even here, c always positive. */
function monicTex(b: number, c: number): string {
  const bx = b === 0 ? '' : b > 0 ? ` + ${b === 1 ? '' : b}x` : ` - ${b === -1 ? '' : -b}x`;
  return `x^2${bx} + ${c}`;
}

export const complexQuadratic: Generator<QuadraticParams> = {
  id: 'complex-quadratic',
  // The three slips: losing the sign of the real part, reading off the other
  // root, and forgetting to halve both parts of (2p ± 2qi)/2.
  choices: ({ p, q }) => {
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    return options(opt(p, q), opt(-p, q), opt(p, -q), opt(2 * p, 2 * q));
  },
  sample: (rng, difficulty) => ({
    p: nonZero(rng, difficulty >= 2 ? 5 : 3),
    q: rng.int(1, difficulty >= 2 ? 6 : 5),
  }),
  render: ({ p, q }) => {
    const b = -2 * p;
    const c = p * p + q * q;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Solve the equation. Give the root with positive imaginary part, in the form $a + bi$.' },
        { kind: 'display', tex: `${monicTex(b, c)} = 0` },
      ],
      lead: 'x =',
      keypad: I_KEY,
      // A quadratic-roots question, not a derivative: no `source` here for
      // the oracle test to differentiate against.
      answer: complexAnswer(p, q),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: ({ p, q }) => {
    const b = -2 * p;
    const c = p * p + q * q;
    const sign = p > 0 ? '-' : '+';
    const abs = Math.abs(p);
    return [
      {
        text: 'Complete the square: half the coefficient of $x$ goes inside the bracket, and what is left over is positive.',
        tex: `${monicTex(b, c)} = (x ${sign} ${abs})^2 + ${q * q}`,
      },
      {
        text: 'A square that equals a negative number has no real solution, but it does have an imaginary one.',
        tex: `(x ${sign} ${abs})^2 = -${q * q} \\quad\\Rightarrow\\quad x ${sign} ${abs} = \\pm ${coeffTex(q)}`,
      },
      {
        text: 'So there are two roots, and they are a conjugate pair — the imaginary parts differ only in sign.',
        tex: `x = ${complexTex(p, q)} \\quad\\text{or}\\quad x = ${complexTex(p, -q)}`,
      },
      {
        text: `The root with positive imaginary part is $${complexTex(p, q)}$. The discriminant is $${b * b} - ${4 * c} = ${b * b - 4 * c}$, negative, which is what said there were no real roots.`,
      },
    ];
  },
};

/* ---------- Square roots of negatives that are not perfect squares ---------- */

interface SurdParams { k: number; m: number; bank: string[] }

/** Square-free radicands, so `k sqrt(m)` is already in lowest terms. */
const SQUARE_FREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23];

/**
 * `sqrt(-72) = 6i sqrt(2)`, assembled from tiles.
 *
 * `sqrt-negative` only ever draws a perfect square, so the $i$ comes out and
 * nothing is left underneath. Most negatives are not perfect squares, and the
 * step that trips people is what survives the root — which is a surd question
 * wearing a complex hat, and is worth asking in its own right.
 *
 * Tiles rather than typing, because the answer has two independent halves and
 * placing them separately says which half went wrong. The coefficient starts
 * at 2: at `k = 1` the answer reads "1i", which nobody writes.
 */
export const imaginarySurd: Generator<SurdParams> = {
  id: 'imaginary-surd',
  sample: (rng, difficulty) => {
    const k = rng.int(2, difficulty >= 2 ? 9 : 6);
    const m = rng.pick(SQUARE_FREE.slice(0, difficulty >= 2 ? SQUARE_FREE.length : 8));
    // Distractors: the radicand left whole, the coefficient squared, and the
    // neighbouring coefficient — the three ways this is usually mis-split.
    const spare = SQUARE_FREE.filter((value) => value !== m).slice(0, 3);
    const bank = rng.shuffle([
      `${k}`,
      `\\sqrt{${m}}`,
      `${k * k}`,
      `${k + 1}`,
      ...spare.slice(0, 2).map((value) => `\\sqrt{${value}}`),
    ]);
    return { k, m, bank };
  },
  render: ({ k, m, bank }) => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'Write this in the form $a i \\sqrt{b}$, with $b$ as small as possible.' },
      { kind: 'display', tex: `\\sqrt{-${k * k * m}}` },
    ],
    template: `\\sqrt{-${k * k * m}} = {0}i{1}`,
    bank,
    answer: [`${k}`, `\\sqrt{${m}}`],
  }),
  solution: ({ k, m }) => [
    {
      text: 'Split the minus sign off first — that is the whole of the complex part.',
      tex: `\\sqrt{-${k * k * m}} = \\sqrt{-1} \\times \\sqrt{${k * k * m}} = i\\sqrt{${k * k * m}}`,
    },
    {
      text: `Now simplify the surd: $${k * k * m} = ${k * k} \\times ${m}$, and $${k * k}$ is a square.`,
      tex: `\\sqrt{${k * k * m}} = \\sqrt{${k * k}} \\times \\sqrt{${m}} = ${k}\\sqrt{${m}}`,
    },
    {
      text: `So $\\sqrt{-${k * k * m}} = ${k}i\\sqrt{${m}}$. Leaving it as $i\\sqrt{${k * k * m}}$ is not wrong, only unfinished.`,
    },
  ],
};

/* ---------- Which route does this equation take? ---------- */

interface MethodParams { value: number; route: 'real' | 'whole' | 'surd' }

/**
 * Deciding what $x^2 = k$ needs, before doing any of it.
 *
 * Every other generator in this lesson hands the learner a method and asks
 * them to run it. Choosing is the separate skill, and it is the one that
 * decides whether $i$ ever gets used outside a lesson with "imaginary" in the
 * title. A `choice` slide asking the same thing is a one-in-three guess;
 * walking the tree makes each fork a reason.
 */
export const rootMethod: Generator<MethodParams> = {
  id: 'root-method',
  sample: (rng, difficulty) => {
    const route = rng.pick(['real', 'whole', 'surd'] as const);
    if (route === 'real') return { value: rng.int(2, difficulty >= 2 ? 90 : 50), route };
    if (route === 'whole') {
      const n = rng.int(2, difficulty >= 2 ? 12 : 9);
      return { value: -n * n, route };
    }
    // A negative whose magnitude is not a square, so the root keeps a surd.
    let m = rng.int(2, difficulty >= 2 ? 90 : 50);
    while (Number.isInteger(Math.sqrt(m))) m = rng.int(2, difficulty >= 2 ? 90 : 50);
    return { value: -m, route };
  },
  render: ({ value, route }) => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Work down the questions to decide what this equation needs. Each answer chooses what gets asked next.',
      },
    ],
    subject: `x^2 = ${value}`,
    steps: [
      {
        id: 'sign',
        ask: 'Is the right-hand side negative?',
        branches: [
          { label: 'No', outcome: 'Take the square root of both sides: two real solutions, $\\pm\\sqrt{k}$.' },
          { label: 'Yes', to: 'square' },
        ],
      },
      {
        id: 'square',
        ask: 'Ignoring the minus sign, is it a perfect square?',
        branches: [
          { label: 'Yes', outcome: 'The solutions are $\\pm ni$, with $n$ a whole number.' },
          { label: 'No', outcome: 'Take the $i$ out and leave the rest as a surd: $\\pm i\\sqrt{m}$.' },
        ],
      },
    ],
    answer: { real: ['No'], whole: ['Yes', 'Yes'], surd: ['Yes', 'No'] }[route],
  }),
  solution: ({ value, route }) => {
    if (route === 'real') {
      return [
        { text: `$${value}$ is positive, so a real number can square to it and nothing imaginary is needed.` },
        { tex: `x = \\pm\\sqrt{${value}}` },
      ];
    }
    if (route === 'whole') {
      const n = Math.round(Math.sqrt(-value));
      return [
        { text: 'The right-hand side is negative, so no real number squares to it. Take the minus out as $i$.' },
        { tex: `x = \\pm\\sqrt{${value}} = \\pm i\\sqrt{${-value}} = \\pm ${coeffTex(n)}` },
        { text: `$${-value}$ is a perfect square, so the answer is whole and the surd disappears.` },
      ];
    }
    return [
      { text: 'The right-hand side is negative, so no real number squares to it. Take the minus out as $i$.' },
      { tex: `x = \\pm\\sqrt{${value}} = \\pm i\\sqrt{${-value}}` },
      {
        text: `$${-value}$ is not a perfect square, so the surd stays. Writing a decimal here loses the exact answer for nothing.`,
      },
    ];
  },
};

/* ---------- Collecting three imaginary terms ---------- */

interface CollectParams { a: number; b: number; c: number; bank: string[] }

/**
 * `3i + 5i - 2i`, collected in two visible stages.
 *
 * `imaginary-sum` asks for one addition and shows nothing of the working.
 * Three terms is where the sign of the last one starts to get lost, and
 * placing both stages separates "added the first pair wrongly" from "took the
 * subtraction as an addition", which a single typed answer cannot.
 */
export const imaginaryCollect: Generator<CollectParams> = {
  id: 'imaginary-collect',
  sample: (rng, difficulty) => {
    const top = difficulty >= 2 ? 12 : 8;
    const a = rng.int(2, top);
    const b = rng.int(2, top);
    // Leaves the final coefficient at 2 or more, so no stage reads "1i" or "0i".
    const c = rng.int(1, a + b - 2);
    const first = a + b;
    const total = first - c;
    const bank = rng.shuffle(distinct([
      `${first}`,
      `${total}`,
      `${a + b + c}`,
      `${a - b + c}`,
      `${total + 1}`,
    ]));
    return { a, b, c, bank };
  },
  render: ({ a, b, c, bank }) => ({
    kind: 'tiles',
    prompt: [{ kind: 'prose', text: 'Collect the terms, one step at a time.' }],
    template: `${a}i + ${b}i - ${c}i = {0}i - ${c}i = {1}i`,
    bank,
    answer: [`${a + b}`, `${a + b - c}`],
  }),
  solution: ({ a, b, c }) => [
    {
      text: 'Imaginary terms collect like terms in algebra — only the coefficients move.',
      tex: `${a}i + ${b}i = ${a + b}i`,
    },
    {
      text: 'Then the subtraction, keeping its sign attached to the term it belongs to.',
      tex: `${a + b}i - ${c}i = ${a + b - c}i`,
    },
    {
      text: `Adding all three instead would give $${a + b + c}i$, which is the usual slip here.`,
    },
  ],
};

/* ---------- The multiplication run backwards ---------- */

interface MissingParams { k: number; b: number }

/**
 * `ki x bi = p`: the product known, one factor missing.
 *
 * `imaginary-product` asks which real number two imaginary terms make. This
 * asks the same fact from the other end, where the $i^2$ has to be undone
 * rather than applied — and the sign is exactly what a learner who has
 * memorised "the answer comes out real" gets wrong.
 */
export const imaginaryMissing: Generator<MissingParams> = {
  id: 'imaginary-missing',
  choices: ({ k }) => {
    const opt = (n: number) => ({ tex: `${n}`, answer: `${n}` });
    // Losing i^2 = -1 flips the sign; the neighbours are there so the wrong
    // sign is not the only alternative on offer.
    return options(opt(k), opt(-k), opt(k + 1), opt(-k - 1));
  },
  sample: (rng, difficulty) => ({
    k: rng.int(2, difficulty >= 2 ? 12 : 9) * (difficulty >= 2 ? rng.sign() : 1),
    b: rng.int(2, difficulty >= 2 ? 12 : 9),
  }),
  render: ({ k, b }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find the real number $k$.' },
      { kind: 'display', tex: `ki \\times ${coeffTex(b)} = ${-k * b}` },
    ],
    lead: 'k =',
    keypad: I_KEY,
    answer: `${k}`,
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ k, b }) => [
    {
      text: 'Multiply the two out with $k$ still in place. The $i^2$ becomes $-1$, which is where the sign turns over.',
      tex: `ki \\times ${coeffTex(b)} = ${b}k\\,i^2 = -${b}k`,
    },
    {
      text: 'Now match that against what the product actually is.',
      tex: `-${b}k = ${-k * b} \\quad\\Rightarrow\\quad k = ${k}`,
    },
    {
      text: `Reading straight off without the $i^2$ would give $k = ${-k}$ — right size, wrong sign.`,
    },
  ],
};

/* ---------- Equating real and imaginary parts ---------- */

interface EquateParams { x: number; y: number; c: number; d: number; bank: string[] }

/**
 * Two real unknowns inside one complex equation.
 *
 * This is the idea the rest of the course leans on without ever asking about
 * it directly: one complex equation is two real ones, because the real and the
 * imaginary parts cannot pay each other's debts. Square roots, polar form and
 * every "find $a$ and $b$" question later are this step.
 */
export const complexEquate: Generator<EquateParams> = {
  id: 'complex-equate',
  sample: (rng, difficulty) => {
    const span = difficulty >= 2 ? 9 : 6;
    const x = nonZero(rng, span);
    let y = nonZero(rng, span);
    // Distinct, so the two blanks never want the same token from the bank.
    if (y === x) y = x > 0 ? -x : -x + 1;
    const c = nonZero(rng, span);
    const d = nonZero(rng, span);
    const bank = rng.shuffle(distinct([
      `${x}`,
      `${y}`,
      `${x + 2 * c}`,
      `${y + 2 * d}`,
      `${-x}`,
    ]));
    return { x, y, c, d, bank };
  },
  render: ({ x, y, c, d, bank }) => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'Find the real numbers $x$ and $y$.' },
      { kind: 'display', tex: `(x + yi) + (${complexTex(c, d)}) = ${complexTex(x + c, y + d)}` },
    ],
    template: `x = {0}, \\quad y = {1}`,
    bank,
    answer: [`${x}`, `${y}`],
  }),
  solution: ({ x, y, c, d }) => [
    {
      text: 'Two complex numbers are equal only when their real parts match *and* their imaginary parts match. So one equation here is really two.',
      tex: `x + ${c} = ${x + c} \\quad\\text{and}\\quad y + ${d} = ${y + d}`,
    },
    { text: 'Each is now an ordinary real equation.', tex: `x = ${x}, \\quad y = ${y}` },
    {
      text: 'There is no way to trade between the two: nothing real can cancel an $i$, which is why the split is allowed at all.',
    },
  ],
};

/* ---------- Subtracting complex numbers ---------- */

export const complexSubtract: Generator<AddParams> = {
  id: 'complex-subtract',
  // The bracket not distributed over the second part, the parts subtracted
  // the wrong way round, and the whole thing added instead.
  choices: ({ a, b, c, d }) => {
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    return options(opt(a - c, b - d), opt(a - c, b + d), opt(c - a, d - b), opt(a + c, b + d));
  },
  sample: (rng, difficulty) => {
    const span = difficulty >= 2 ? 9 : 6;
    const draw = () => rng.int(1, span) * (difficulty >= 2 ? rng.sign() : 1);
    return { a: draw(), b: draw(), c: draw(), d: draw() };
  },
  render: ({ a, b, c, d }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `What is $(${complexTex(a, b)}) - (${complexTex(c, d)})$?` },
    ],
    lead: `(${complexTex(a, b)}) - (${complexTex(c, d)}) =`,
    keypad: I_KEY,
    answer: complexAnswer(a - c, b - d),
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ a, b, c, d }) => [
    {
      text: 'The minus sign belongs to the whole bracket, so it reaches the imaginary part too.',
      tex: `(${complexTex(a, b)}) - (${complexTex(c, d)}) = (${a} - (${c})) + (${b} - (${d}))i`,
    },
    { text: 'Subtract the real parts and the imaginary parts separately.', tex: complexTex(a - c, b - d) },
    {
      text: `Leaving the second bracket's imaginary sign alone would give $${complexTex(a - c, b + d)}$, which is the one mistake this question is for.`,
    },
  ],
};

/* ---------- Conjugate root pairs ---------- */

interface PairParams { p: number; q: number; bank: string[] }

/**
 * One root given, both wanted.
 *
 * A quadratic with real coefficients cannot have a lone complex root: the
 * conjugate has to come too, or the coefficients would not stay real. Asking
 * for the pair rather than for "the conjugate of $z$" puts the fact where it
 * is actually used, and `unordered` keeps it a fact about the pair rather than
 * a guess at which one goes first.
 */
export const rootPair: Generator<PairParams> = {
  id: 'root-pair',
  sample: (rng, difficulty) => {
    const p = nonZero(rng, difficulty >= 2 ? 7 : 5);
    const q = rng.int(1, difficulty >= 2 ? 7 : 5);
    const bank = rng.shuffle(distinct([
      complexTex(p, q),
      complexTex(p, -q),
      complexTex(-p, q),
      complexTex(-p, -q),
      complexTex(q, p),
    ]));
    return { p, q, bank };
  },
  render: ({ p, q, bank }) => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: `A quadratic with real coefficients has $${complexTex(p, q)}$ as one root. Give both of its roots.`,
      },
    ],
    template: `x = {0} \\text{ or } x = {1}`,
    bank,
    answer: [complexTex(p, q), complexTex(p, -q)],
    unordered: true,
  }),
  solution: ({ p, q }) => [
    {
      text: 'Complex roots of a real quadratic always come in conjugate pairs — same real part, opposite imaginary part.',
      tex: `x = ${complexTex(p, q)} \\quad\\text{or}\\quad x = ${complexTex(p, -q)}`,
    },
    {
      text: 'The reason is what happens when you put them back together.',
      tex: `(x - (${complexTex(p, q)}))(x - (${complexTex(p, -q)})) = x^2 - ${2 * p}x + ${p * p + q * q}`,
    },
    {
      text: `Both coefficients came out real. Pairing it with $${complexTex(-p, q)}$ instead would leave an $i$ behind in the middle term.`,
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
  complexQuadratic,
  imaginarySurd,
  rootMethod,
  imaginaryCollect,
  imaginaryMissing,
  complexEquate,
  complexSubtract,
  rootPair,
];
