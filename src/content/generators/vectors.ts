/**
 * Vectors: components, scalar multiples, magnitude and the scalar product.
 *
 * Shared formatters and the engine constraints they exist for live in
 * `vectorFormat.ts`; the matrix half of the old combined file is now
 * `matrices.ts`.
 */
import type { Generator, KeypadKey, Slide } from '../types';
import { bin, num, pow, root } from '../expr';
import { options } from '../choiceVariant';
import { ALGEBRA_KEYS } from './calculus';
import {
  bankOf,
  columnTex,
  nonZero,
  signedChoices,
  signedOffer,
  VECTOR_TEMPLATE,
} from './vectorFormat';

/** Magnitudes are surds. */
const SURD_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'sqrt(' }];

/** Choice options with no two rendering the same label. */
function distinctOptions<T extends { label: string }>(options: T[]): T[] {
  const seen = new Set<string>();
  return options.filter((option) => (seen.has(option.label) ? false : (seen.add(option.label), true)));
}

/** A vector in i, j form, for prose and solutions. */
function ijTex(x: number, y: number): string {
  const first = x === 1 ? '\\mathbf{i}' : x === -1 ? '-\\mathbf{i}' : `${x}\\mathbf{i}`;
  const size = Math.abs(y);
  const second = `${y < 0 ? '-' : '+'} ${size === 1 ? '' : size}\\mathbf{j}`;
  return `${first} ${second}`;
}

/* ---------- Level 1: vectors ---------- */

interface TwoVectorParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  subtract: boolean;
}

/** Adding or subtracting two vectors, component by component. */
const addVectors: Generator<TwoVectorParams> = {
  id: 'vec-add',
  // A vector is not a scalar, so these options carry no `answer` and the
  // wrongness check is skipped; each distractor is a different vector by
  // construction, since no sampled component is ever zero.
  choices: ({ ax, ay, bx, by, subtract }) => {
    const x = subtract ? ax - bx : ax + bx;
    const y = subtract ? ay - by : ay + by;
    return options(
      { tex: columnTex(x, y) },
      { tex: columnTex(subtract ? ax + bx : ax - bx, subtract ? ay + by : ay - by) },
      { tex: columnTex(y, x) },
      { tex: columnTex(x, subtract ? ay + by : ay - by) },
    );
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 12 : 8;
    return {
      ax: nonZero(rng.int(-span, span), 3),
      ay: nonZero(rng.int(-span, span), -2),
      bx: nonZero(rng.int(-span, span), 5),
      by: nonZero(rng.int(-span, span), 4),
      subtract: rng.pick([true, false]),
    };
  },
  render: ({ ax, ay, bx, by, subtract }) => {
    const x = subtract ? ax - bx : ax + bx;
    const y = subtract ? ay - by : ay + by;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work out the components of the result.' },
        {
          kind: 'display',
          tex: `${columnTex(ax, ay)} ${subtract ? '-' : '+'} ${columnTex(bx, by)}`,
        },
      ],
      template: VECTOR_TEMPLATE,
      bank: bankOf(
        [`${x}`, `${y}`],
        // The standard slips: the other operation, and the components crossed.
        [`${subtract ? ax + bx : ax - bx}`, `${subtract ? ay + by : ay - by}`, `${ax}`, `${by}`],
      ),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: ({ ax, ay, bx, by, subtract }) => {
    const x = subtract ? ax - bx : ax + bx;
    const y = subtract ? ay - by : ay + by;
    const op = subtract ? '-' : '+';
    return [
      {
        text: 'Vectors add and subtract component by component. The top entries combine with each other and the bottom entries with each other, and the two calculations never interact.',
      },
      { tex: `${ax} ${op} \\left(${bx}\\right) = ${x}` },
      { tex: `${ay} ${op} \\left(${by}\\right) = ${y}` },
      { tex: `${columnTex(ax, ay)} ${op} ${columnTex(bx, by)} = ${columnTex(x, y)}` },
      {
        text: `Written with unit vectors that is $${ijTex(x, y)}$. The two notations describe the same object — a column vector is just the i, j form stacked vertically.`,
      },
      {
        text: 'Bracket each component before combining it. A negative entry being subtracted is where the sign goes wrong, and the bracket removes the risk.',
      },
    ];
  },
};

interface CombineParams {
  p: number;
  q: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** A linear combination, p times one vector plus q times another. */
const combineVectors: Generator<CombineParams> = {
  id: 'vec-scalar-combine',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 9 : 6;
    return {
      p: nonZero(rng.int(difficulty > 1 ? -5 : 2, 5), 2),
      q: nonZero(rng.int(difficulty > 1 ? -5 : -4, 5), -3),
      ax: nonZero(rng.int(-span, span), 2),
      ay: nonZero(rng.int(-span, span), 5),
      bx: nonZero(rng.int(-span, span), -1),
      by: nonZero(rng.int(-span, span), 3),
    };
  },
  render: ({ p, q, ax, ay, bx, by }) => {
    const x = p * ax + q * bx;
    const y = p * ay + q * by;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work out the components of the result.' },
        {
          kind: 'display',
          tex: `${p === 1 ? '' : p}${columnTex(ax, ay)} ${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}${columnTex(bx, by)}`,
        },
      ],
      template: VECTOR_TEMPLATE,
      bank: bankOf(
        [`${x}`, `${y}`],
        // Multiplying only the first component of each vector, and forgetting
        // the scalars altogether.
        [`${p * ax + bx}`, `${ax + q * bx}`, `${ax + bx}`, `${ay + by}`],
      ),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: ({ p, q, ax, ay, bx, by }) => [
    {
      text: 'A scalar multiplies *every* component, so scale each vector first and then add.',
    },
    { tex: `${p}${columnTex(ax, ay)} = ${columnTex(p * ax, p * ay)}` },
    { tex: `${q}${columnTex(bx, by)} = ${columnTex(q * bx, q * by)}` },
    { tex: `${columnTex(p * ax, p * ay)} + ${columnTex(q * bx, q * by)} = ${columnTex(p * ax + q * bx, p * ay + q * by)}` },
    {
      text: 'Multiplying only the top component is the characteristic error. A scalar changes the length of the whole vector, so it has to reach both entries.',
    },
    {
      text: 'A negative scalar reverses the direction as well as scaling it, which is why every sign has to be carried through rather than dealt with at the end.',
    },
  ],
};

interface VectorParams {
  x: number;
  y: number;
}

/** The magnitude, by Pythagoras. */
const magnitude: Generator<VectorParams> = {
  id: 'vec-magnitude',
  choices: ({ x, y }) => {
    const sq = x * x + y * y;
    return options(
      { tex: `\\sqrt{${sq}}`, answer: `sqrt(${sq})` },
      { tex: `${Math.abs(x) + Math.abs(y)}`, answer: `${Math.abs(x) + Math.abs(y)}` },
      { tex: `${sq}`, answer: `${sq}` },
      { tex: `\\sqrt{${Math.abs(x * x - y * y)}}`, answer: `sqrt(${Math.abs(x * x - y * y)})` },
    );
  },
  sample: (rng, difficulty) => ({
    x: nonZero(rng.int(difficulty > 1 ? -12 : -9, difficulty > 1 ? 12 : 9), 3),
    y: nonZero(rng.int(difficulty > 1 ? -12 : -9, difficulty > 1 ? 12 : 9), 4),
  }),
  render: ({ x, y }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Find the magnitude, exactly. Leave a surd in the answer if it does not simplify.',
      },
    ],
    lead: `\\left| ${columnTex(x, y)} \\right| =`,
    keypad: SURD_KEYS,
    answer: `sqrt(${x * x + y * y})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ x, y }) => {
    const square = x * x + y * y;
    const root = Math.sqrt(square);
    const exact = Number.isInteger(root);
    return [
      {
        text: 'The components are the two shorter sides of a right-angled triangle and the vector is its hypotenuse, so the magnitude comes from Pythagoras.',
      },
      { tex: `\\left| \\mathbf{v} \\right| = \\sqrt{x^{2} + y^{2}}` },
      {
        tex: `\\sqrt{\\left(${x}\\right)^{2} + \\left(${y}\\right)^{2}} = \\sqrt{${x * x} + ${y * y}} = \\sqrt{${square}}${exact ? ` = ${root}` : ''}`,
      },
      {
        text: exact
          ? `This one comes out whole: $\\sqrt{${square}} = ${root}$.`
          : `$${square}$ is not a perfect square, so $\\sqrt{${square}}$ is the exact answer. A decimal would be a rounded one.`,
      },
      {
        text: 'Both components are squared, so both signs disappear. A magnitude can never be negative, which is a useful check on the arithmetic.',
      },
    ];
  },
};

interface MagnitudeStepsParams {
  a: number;
  b: number;
  c: number;
}

/**
 * Legs of Pythagorean triples, both orders, so the magnitude under the root
 * always comes out whole. The same primitive-and-multiple family as
 * `modulus`'s table in the complex numbers course
 * (`src/content/generators/complexPlane.ts`) — two unrelated topics, the same
 * underlying arithmetic.
 */
const MAGNITUDE_TRIPLES: [number, number, number][] = [
  [3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13],
  [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [9, 12, 15], [12, 9, 15],
  [20, 21, 29], [21, 20, 29], [10, 24, 26], [24, 10, 26], [12, 16, 20],
  [16, 12, 20], [15, 20, 25], [20, 15, 25], [9, 40, 41], [40, 9, 41],
  [12, 35, 37], [35, 12, 37], [16, 30, 34], [30, 16, 34],
];

/**
 * The magnitude, reduced one piece at a time.
 *
 * A root is a bracket: everything underneath it has to be settled before the
 * root itself can be taken, and the usual slip is rooting the two squares
 * separately — $\sqrt{a^2} + \sqrt{b^2} = a + b$ — which looks entirely
 * reasonable right up until it is checked against the real answer. The tree
 * makes that slip impossible to reach by tapping: the root node is only
 * offered once its argument has collapsed to a single number, so there is no
 * button that takes a root before the sum underneath it is settled.
 *
 * Legs are kept positive so a squared leaf never needs a negative base:
 * `toTex` renders a numeric power's base bare, with no bracket, so a base of
 * $-3$ would come out as the literal TeX `-3^{2}`, which reads as $-9$.
 */
const magnitudeSteps: Generator<MagnitudeStepsParams> = {
  id: 'vec-magnitude-steps',
  // The same three slips as a learner might make with no working at all:
  // rooting separately, forgetting the root, and doubling the sum instead of
  // squaring each part.
  choices: ({ a, b, c }) => {
    const wrong = [a + b, a * a + b * b, 2 * (a + b)];
    const seen = new Set([c]);
    const picked: number[] = [];
    for (const value of wrong) {
      if (picked.length === 3) break;
      if (!Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
      seen.add(value);
      picked.push(value);
    }
    for (let step = 1; picked.length < 3; step += 1) {
      for (const candidate of [c + step, c - step]) {
        if (picked.length === 3) break;
        if (candidate <= 0 || seen.has(candidate)) continue;
        seen.add(candidate);
        picked.push(candidate);
      }
    }
    return options(
      { tex: `${c}` },
      ...picked.sort((x, y) => x - y).map((value) => ({ tex: `${value}` })),
    );
  },
  sample: (rng) => {
    const [a, b, c] = rng.pick(MAGNITUDE_TRIPLES);
    return { a, b, c };
  },
  render: ({ a, b, c }): Slide => {
    const expr = root(bin('+', pow(num(a), num(2)), pow(num(b), num(2))));
    const aSq = a * a;
    const bSq = b * b;
    const sum = aSq + bSq;

    /** Four whole-number options: the right one, then the nearest slips. */
    const offer = (correct: number, ...near: number[]) => {
      const seen = new Set<number>([correct]);
      const out = [correct];
      for (const value of near) {
        if (out.length >= 4) break;
        if (!Number.isInteger(value) || value < 0 || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
      }
      for (let step = 1; out.length < 4; step += 1) {
        for (const candidate of [correct + step, correct - step]) {
          if (out.length >= 4) break;
          if (candidate < 0 || seen.has(candidate)) continue;
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
          text: 'Find the magnitude, one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
        { kind: 'display', tex: `\\left| \\begin{pmatrix} ${a} \\\\ ${b} \\end{pmatrix} \\right|` },
      ],
      expr,
      banks: {
        // a^2: doubling instead of squaring is the slip.
        'r.a.l': offer(aSq, 2 * a, a, aSq + 2),
        // b^2, the same slip on the other component.
        'r.a.r': offer(bSq, 2 * b, b, bSq + 2),
        // The sum under the root: squaring the sum instead of summing the
        // squares, and the difference of the two squares.
        'r.a': offer(sum, (a + b) * (a + b), a + b, Math.abs(aSq - bSq)),
        // The root itself: rooting the two squares separately, or forgetting
        // the root altogether.
        r: offer(c, a + b, sum, 2 * (a + b)),
      },
    };
  },
  solution: ({ a, b, c }) => {
    const aSq = a * a;
    const bSq = b * b;
    const sum = aSq + bSq;
    return [
      {
        text: 'A root is a bracket: everything underneath it has to be settled before the root itself can be taken.',
      },
      {
        tex: `\\left| \\begin{pmatrix} ${a} \\\\ ${b} \\end{pmatrix} \\right| = \\sqrt{${a}^{2} + ${b}^{2}} = \\sqrt{${aSq} + ${bSq}}`,
      },
      { tex: `= \\sqrt{${sum}} = ${c}` },
      {
        text: `Rooting the two squares separately and adding would give $${a} + ${b} = ${a + b}$ — close enough to look plausible, and wrong, because $\\sqrt{x} + \\sqrt{y}$ is not $\\sqrt{x + y}$.`,
      },
    ];
  },
};

interface DotParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** The dot product. */
const dotProduct: Generator<DotParams> = {
  id: 'vec-dot',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 11 : 8;
    return {
      ax: nonZero(rng.int(-span, span), 3),
      ay: nonZero(rng.int(-span, span), 2),
      bx: nonZero(rng.int(-span, span), -4),
      by: nonZero(rng.int(-span, span), 6),
    };
  },
  render: ({ ax, ay, bx, by }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Find the scalar product. The answer may be negative.' }],
    lead: `${columnTex(ax, ay)} \\cdot ${columnTex(bx, by)} =`,
    keypad: [],
    answer: `${ax * bx + ay * by}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ ax, ay, bx, by }) => [
    {
      text: 'Multiply the matching components and then add the two products. The result is a single number, not a vector — which is why it is called the *scalar* product.',
    },
    { tex: `\\left(${ax}\\right)\\left(${bx}\\right) + \\left(${ay}\\right)\\left(${by}\\right)` },
    { tex: `= ${ax * bx} + \\left(${ay * by}\\right) = ${ax * bx + ay * by}` },
    {
      text: 'Adding the products is the step most often missed: the answer is one number, so stopping with two is stopping halfway.',
    },
    {
      text:
        ax * bx + ay * by === 0
          ? 'A scalar product of zero means the two vectors are perpendicular, which is the single most useful fact about it.'
          : 'The sign carries meaning too. Positive means the vectors point broadly the same way, negative means broadly opposite, and zero means exactly perpendicular.',
    },
  ],
};

interface PerpendicularParams {
  a: number;
  b: number;
  t: number;
}

/**
 * Finding the missing component that makes two vectors perpendicular.
 *
 * The second vector's first component is built as a multiple of b, so the
 * answer is a whole number rather than a fraction.
 */
const perpendicular: Generator<PerpendicularParams> = {
  id: 'vec-perpendicular-k',
  sample: (rng, difficulty) => ({
    a: nonZero(rng.int(difficulty > 1 ? -9 : 1, 9), 3),
    b: rng.int(1, difficulty > 1 ? 9 : 6),
    t: nonZero(rng.int(difficulty > 1 ? -4 : 1, 4), 2),
  }),
  render: ({ a, b, t }) => {
    const cx = b * t;
    const k = -a * t;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Find the value of $k$ that makes these two vectors perpendicular.`,
        },
      ],
      lead: `${columnTex(a, b)} \\quad \\begin{pmatrix} ${cx} \\\\ k \\end{pmatrix} \\implies k =`,
      keypad: [],
      answer: `${k}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, t }) => {
    const cx = b * t;
    const k = -a * t;
    return [
      {
        text: 'Two vectors are perpendicular exactly when their scalar product is zero, so set it to zero and solve.',
      },
      { tex: `\\left(${a}\\right)\\left(${cx}\\right) + \\left(${b}\\right)k = 0` },
      { tex: `${a * cx} + ${b}k = 0 \\implies k = \\frac{${-a * cx}}{${b}} = ${k}` },
      {
        text: `Check it: $\\left(${a}\\right)\\left(${cx}\\right) + \\left(${b}\\right)\\left(${k}\\right) = ${a * cx} + ${b * k} = 0$.`,
      },
      {
        text: 'Perpendicularity is the scalar product being zero, not the vectors being negatives of each other. Those are opposite directions, whose scalar product is as negative as it can get.',
      },
    ];
  },
};

interface ParallelParams {
  x: number;
  y: number;
  k: number;
}

/** Which vector is parallel to a given one. */
const parallel: Generator<ParallelParams> = {
  id: 'vec-parallel',
  sample: (rng, difficulty) => ({
    x: nonZero(rng.int(difficulty > 1 ? -8 : 1, 8), 3),
    y: nonZero(rng.int(difficulty > 1 ? -8 : -6, 8), -2),
    k: nonZero(rng.int(difficulty > 1 ? -4 : 2, 4), 2),
  }),
  render: ({ x, y, k }): Slide => {
    const options = distinctOptions([
      { id: 'scaled', label: ijTex(k * x, k * y), tex: true },
      { id: 'one-component', label: ijTex(k * x, y), tex: true },
      { id: 'swapped', label: ijTex(y, x), tex: true },
      { id: 'flipped', label: ijTex(k * x, -k * y), tex: true },
    ]);
    const turn = (Math.abs(x) + Math.abs(y) + Math.abs(k)) % options.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which of these vectors is parallel to $${ijTex(x, y)}$?`,
        },
      ],
      options: [...options.slice(turn), ...options.slice(0, turn)],
      correctId: 'scaled',
    };
  },
  solution: ({ x, y, k }) => [
    {
      text: 'Two vectors are parallel when one is a scalar multiple of the other — the *same* multiple applied to every component.',
    },
    { tex: `${k}\\left(${ijTex(x, y)}\\right) = ${ijTex(k * x, k * y)}` },
    {
      text: `So $${ijTex(k * x, k * y)}$ is parallel, because both components were multiplied by $${k}$.`,
    },
    {
      text: 'Scaling only one component changes the direction, so the result is not parallel. The test is whether the ratio of the components is unchanged.',
    },
    {
      text:
        k < 0
          ? 'A negative multiple points the opposite way along the same line. That still counts as parallel — direction is reversed but the line is the same.'
          : 'Swapping the two components gives a different direction entirely, and is never parallel unless the components happened to be equal.',
    },
  ],
};

interface DotStepsParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/**
 * A scalar product, one piece at a time.
 *
 * `vec-dot` asks for the number and grades it; this asks for the order, and the
 * order is the whole of what goes wrong. $a_x b_x + a_y b_y$ has two
 * multiplications and one addition, and a learner who adds first has not made
 * an arithmetic mistake — they have read the formula as though the sum bound
 * tighter than the products.
 *
 * Components are allowed to be negative, because a dot product that is never
 * negative teaches that two vectors always point roughly the same way.
 */
const dotSteps: Generator<DotStepsParams> = {
  id: 'vec-dot-steps',
  choices: ({ ax, ay, bx, by }) =>
    signedChoices(ax * bx + ay * by, [
      // The two components added before either product is taken.
      (ax + ay) * (bx + by),
      // The products subtracted, as a determinant would.
      ax * bx - ay * by,
      // The components added pairwise instead of multiplied.
      ax + bx + ay + by,
    ]),
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 7 : 5;
    const draw = () => nonZero(rng.int(-span, span), rng.int(1, span));
    return { ax: draw(), ay: draw(), bx: draw(), by: draw() };
  },
  render: ({ ax, ay, bx, by }): Slide => {
    const expr = bin('+', bin('*', num(ax), num(bx)), bin('*', num(ay), num(by)));
    const first = ax * bx;
    const second = ay * by;
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'Find the scalar product, one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
        {
          kind: 'display',
          tex: `${columnTex(ax, ay)} \\cdot ${columnTex(bx, by)}`,
        },
      ],
      expr,
      banks: {
        // The first product. Adding the pair instead of multiplying it, and
        // dropping the sign, are the two slips worth offering together.
        'r.l': signedOffer(first, ax + bx, -first, Math.abs(first)),
        'r.r': signedOffer(second, ay + by, -second, Math.abs(second)),
        // The sum. Subtracting is what a determinant does, and the two are
        // written similarly enough to be confused.
        r: signedOffer(first + second, first - second, second - first, first * second),
      },
    };
  },
  solution: ({ ax, ay, bx, by }) => {
    const first = ax * bx;
    const second = ay * by;
    return [
      {
        text: 'Multiply the matching components, then add. Both products are settled before the addition can touch either of them.',
      },
      {
        tex: `${columnTex(ax, ay)} \\cdot ${columnTex(bx, by)} = \\left(${ax}\\right)\\left(${bx}\\right) + \\left(${ay}\\right)\\left(${by}\\right)`,
      },
      { tex: `= ${first} + \\left(${second}\\right) = ${first + second}` },
      {
        text: `The result is a number, not a vector — that is what "scalar" product means. Adding the components first would give $${(ax + ay) * (bx + by)}$, which is a different quantity altogether.`,
      },
    ];
  },
};

export const vectorGenerators = [
  addVectors,
  combineVectors,
  magnitude,
  magnitudeSteps,
  dotProduct,
  perpendicular,
  parallel,
  dotSteps,
] as unknown as Generator<unknown>[];
