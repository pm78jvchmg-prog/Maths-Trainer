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
import { vectorSvg } from '../figures';
import { ALGEBRA_KEYS } from './calculus';
import {
  bankOf,
  columnTex,
  distinctOptions,
  nonZero,
  signedChoices,
  signedOffer,
  VECTOR_TEMPLATE,
} from './vectorFormat';

/** Magnitudes are surds. */
const SURD_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'sqrt(' }];

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
  // The sign is the whole of what goes wrong here: the scalar product is set
  // to zero and the term carrying k moves across, so an answer with the right
  // size and the wrong sign is the standard slip.
  choices: ({ a, b, t }) => signedChoices(-a * t, [a * t, a * b * t, -b * t]),
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

/* ---------- shapes added by roadmap batch A10 ---------- */

interface NotationParams {
  x: number;
  y: number;
  toColumn: boolean;
}

/**
 * The two ways of writing the same vector.
 *
 * Worth asking on its own because every later question arrives in whichever
 * notation its author preferred, and a learner who reads only one of them
 * stalls on the translation rather than on the vectors.
 */
const notation: Generator<NotationParams> = {
  id: 'vec-notation',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 12 : 8;
    return {
      x: nonZero(rng.int(-span, span), 3),
      y: nonZero(rng.int(-span, span), -5),
      toColumn: rng.pick([true, false]),
    };
  },
  render: ({ x, y, toColumn }): Slide => {
    const write = toColumn ? columnTex : ijTex;
    const offered = distinctOptions([
      { id: 'same', label: write(x, y), tex: true },
      // The components read in the wrong order, the second sign dropped, and
      // the first sign dropped: the three ways a translation goes wrong.
      { id: 'swapped', label: write(y, x), tex: true },
      { id: 'sign-j', label: write(x, -y), tex: true },
      { id: 'sign-i', label: write(-x, y), tex: true },
    ]);
    const turn = (Math.abs(x) + Math.abs(y)) % offered.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: toColumn
            ? `Which column vector is $${ijTex(x, y)}$?`
            : `Which of these is $${columnTex(x, y)}$ written with $\\mathbf{i}$ and $\\mathbf{j}$?`,
        },
      ],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'same',
    };
  },
  solution: ({ x, y, toColumn }) => [
    {
      text: 'The column form and the $\\mathbf{i}$, $\\mathbf{j}$ form are the same object written two ways. The top entry is the $\\mathbf{i}$ component and the bottom entry is the $\\mathbf{j}$ component.',
    },
    { tex: `${columnTex(x, y)} = ${ijTex(x, y)}` },
    {
      text: toColumn
        ? `So $${ijTex(x, y)}$ stacks up as $${columnTex(x, y)}$ — across on top, up underneath.`
        : `So $${columnTex(x, y)}$ reads as $${ijTex(x, y)}$ — the top entry goes with $\\mathbf{i}$.`,
    },
    {
      text: 'Writing them in the wrong order is the usual slip, and it gives a genuinely different vector unless the two components happen to be equal.',
    },
    {
      text: `A sign belongs to its component, not to the whole vector: $${ijTex(x, -y)}$ points somewhere else entirely.`,
    },
  ],
};

interface JourneyParams {
  mover: number;
  e1: number;
  n1: number;
  e2: number;
  n2: number;
}

/** How a leg of a journey reads in words. */
function legText(east: number, north: number): string {
  const across = `${Math.abs(east)} km ${east < 0 ? 'west' : 'east'}`;
  const up = `${Math.abs(north)} km ${north < 0 ? 'south' : 'north'}`;
  return `${across} and ${up}`;
}

const MOVERS = ['A walker', 'A drone', 'A cyclist', 'A boat', 'A delivery van'];

/**
 * A displacement built from two legs described in words.
 *
 * `vec-add` asks the same arithmetic from two column vectors already written
 * down. The work this one adds is the part a learner actually meets first:
 * turning "3 km west" into a negative first component, and noticing that the
 * total is a single vector rather than a distance walked.
 */
const journey: Generator<JourneyParams> = {
  id: 'vec-journey',
  choices: ({ e1, n1, e2, n2 }) =>
    options(
      { tex: columnTex(e1 + e2, n1 + n2) },
      // Both legs treated as distances, so every direction reads positive.
      { tex: columnTex(Math.abs(e1) + Math.abs(e2), Math.abs(n1) + Math.abs(n2)) },
      // The second leg subtracted rather than added.
      { tex: columnTex(e1 - e2, n1 - n2) },
      // Across and up swapped.
      { tex: columnTex(n1 + n2, e1 + e2) },
    ),
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 12 : 8;
    return {
      mover: rng.int(0, MOVERS.length - 1),
      e1: nonZero(rng.int(-span, span), 4),
      n1: nonZero(rng.int(-span, span), 3),
      e2: nonZero(rng.int(-span, span), -2),
      n2: nonZero(rng.int(-span, span), 5),
    };
  },
  render: ({ mover, e1, n1, e2, n2 }) => {
    const x = e1 + e2;
    const y = n1 + n2;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${MOVERS[mover]} travels ${legText(e1, n1)}, then ${legText(e2, n2)}. Give the components of the total displacement, east first.`,
        },
      ],
      template: VECTOR_TEMPLATE,
      bank: bankOf(
        [`${x}`, `${y}`],
        // Distances added regardless of direction, and one leg subtracted.
        [
          `${Math.abs(e1) + Math.abs(e2)}`,
          `${Math.abs(n1) + Math.abs(n2)}`,
          `${e1 - e2}`,
          `${n1 - n2}`,
        ],
      ),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: ({ e1, n1, e2, n2 }) => [
    {
      text: 'West is the negative of east and south is the negative of north, so each leg becomes a vector before anything is added.',
    },
    { tex: `${columnTex(e1, n1)} \\quad \\text{then} \\quad ${columnTex(e2, n2)}` },
    { tex: `${columnTex(e1, n1)} + ${columnTex(e2, n2)} = ${columnTex(e1 + e2, n1 + n2)}` },
    {
      text: `The displacement is $${ijTex(e1 + e2, n1 + n2)}$ — where the journey ended up relative to where it began, not how far was travelled.`,
    },
    {
      text: `Adding the distances instead would give $${columnTex(Math.abs(e1) + Math.abs(e2), Math.abs(n1) + Math.abs(n2))}$, which is a different quantity: distance has no direction, so the two legs cannot cancel.`,
    },
  ],
};

interface ComponentParams {
  x: number;
  y: number;
  span: number;
}

/**
 * Reading a component off a drawn vector.
 *
 * The only question in this course that starts from a picture, and it asks
 * *where* the component is rather than what arithmetic produces it — which is
 * the thing a learner who has only ever seen the column form cannot do.
 */
const component: Generator<ComponentParams> = {
  id: 'vec-component',
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 8 : 6;
    return {
      x: nonZero(rng.int(-reach, reach), 3),
      y: nonZero(rng.int(-reach, reach), 4),
      span: reach + 1,
    };
  },
  render: ({ x, y, span }): Slide => ({
    kind: 'slider',
    prompt: [
      {
        kind: 'prose',
        text: 'The arrow is a vector drawn from the origin. Slide to its $\\mathbf{i}$ component — how far it reaches across.',
      },
    ],
    min: -(span - 1),
    max: span - 1,
    step: 1,
    answer: x,
    readout: '\\mathbf{i}\\text{ component} = {v}',
    figure: {
      svg: vectorSvg(x, y, { span, drop: true, label: 'A vector drawn from the origin' }),
      xMin: -span,
      xMax: span,
    },
  }),
  solution: ({ x, y }) => [
    {
      text: 'The $\\mathbf{i}$ component is how far the arrow reaches across, counted along the horizontal axis. The dashed line drops from the tip to the place to read.',
    },
    { tex: `${columnTex(x, y)} = ${ijTex(x, y)}` },
    {
      text: `It reaches ${Math.abs(x)} to the ${x < 0 ? 'left' : 'right'}, so the $\\mathbf{i}$ component is $${x}$.`,
    },
    {
      text: `Reading the height instead gives $${y}$, which is the $\\mathbf{j}$ component. The vector has no position, so only the arrow's shape matters — the same arrow drawn elsewhere has the same components.`,
    },
  ],
};

interface ScalarKParams {
  x: number;
  y: number;
  k: number;
}

/**
 * The scalar hiding between two parallel vectors.
 *
 * `vec-parallel` asks which vector is a multiple; this asks what the multiple
 * is, which is the form the skill takes in every later question — a point
 * dividing a line, a resultant force, a direction vector scaled to a length.
 */
const scalarK: Generator<ScalarKParams> = {
  id: 'vec-scalar-k',
  choices: ({ k }) =>
    options(
      { tex: `${k}`, answer: `${k}` },
      { tex: `${-k}`, answer: `${-k}` },
      { tex: `${k * k}`, answer: `${k * k}` },
      { tex: `\\frac{1}{${k}}`, answer: `1/(${k})` },
    ),
  sample: (rng, difficulty) => ({
    x: nonZero(rng.int(difficulty > 1 ? -9 : 1, 9), 3),
    y: nonZero(rng.int(difficulty > 1 ? -9 : -7, 9), -2),
    // Never 1 or -1: the scalar and its reciprocal would then be the same
    // option, leaving the question with two answers to choose between.
    k: rng.pick(difficulty > 1 ? [-6, -5, -4, -3, -2, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6]),
  }),
  render: ({ x, y, k }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'These two vectors are parallel. Find the scalar that takes the first to the second.',
      },
    ],
    lead: `${columnTex(k * x, k * y)} = k ${columnTex(x, y)} \\implies k =`,
    keypad: [],
    answer: `${k}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ x, y, k }) => [
    {
      text: 'One component is enough to find the scalar, because the *same* multiple has to work for both.',
    },
    { tex: `k \\times ${x} = ${k * x} \\implies k = \\frac{${k * x}}{${x}} = ${k}` },
    { tex: `k \\times ${y} = ${k * y} \\implies k = \\frac{${k * y}}{${y}} = ${k}` },
    {
      text: 'The second component is the check. If the two answers disagree, the vectors are not parallel at all and there is no such scalar.',
    },
    {
      text:
        k < 0
          ? `Here $k = ${k}$ is negative, so the second vector points the opposite way along the same line. That is still parallel.`
          : `Here $k = ${k}$, so the second vector is ${k} times as long and points the same way.`,
    },
  ],
};

interface UnitParams {
  x: number;
  y: number;
}

/**
 * The scalar that shrinks a vector to length one.
 *
 * Asked as "find k" rather than "write down the unit vector" because the
 * checker grades scalars: a unit vector is a vector, and a typed answer that
 * evaluates to one comes back indeterminate. See `vectorFormat.ts`.
 */
const unitScalar: Generator<UnitParams> = {
  id: 'vec-unit',
  choices: ({ x, y }) => {
    const sq = x * x + y * y;
    return options(
      { tex: `\\frac{1}{\\sqrt{${sq}}}`, answer: `1/sqrt(${sq})` },
      { tex: `\\sqrt{${sq}}`, answer: `sqrt(${sq})` },
      { tex: `\\frac{1}{${sq}}`, answer: `1/${sq}` },
      { tex: `\\frac{1}{${Math.abs(x) + Math.abs(y)}}`, answer: `1/${Math.abs(x) + Math.abs(y)}` },
    );
  },
  sample: (rng, difficulty) => {
    // Difficulty 1 draws from the Pythagorean triples, so the magnitude is
    // whole and the answer is a plain fraction. Difficulty 2 lets the surd
    // stand, which is what an exam question does.
    if (difficulty <= 1) {
      const [a, b] = rng.pick(MAGNITUDE_TRIPLES);
      return { x: rng.pick([a, -a]), y: rng.pick([b, -b]) };
    }
    return {
      x: nonZero(rng.int(-9, 9), 2),
      y: nonZero(rng.int(-9, 9), -6),
    };
  },
  render: ({ x, y }) => {
    const sq = x * x + y * y;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Find the positive scalar $k$ for which $k${columnTex(x, y)}$ has magnitude 1. Leave a surd in the answer if it does not simplify.`,
        },
      ],
      lead: 'k =',
      keypad: SURD_KEYS,
      answer: `1/sqrt(${sq})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ x, y }) => {
    const sq = x * x + y * y;
    const size = Math.sqrt(sq);
    const whole = Number.isInteger(size);
    return [
      {
        text: 'Scaling multiplies the length by the scalar, so the scalar that lands on length 1 is one over the length the vector already has.',
      },
      { tex: `\\left| ${columnTex(x, y)} \\right| = \\sqrt{${x * x} + ${y * y}} = \\sqrt{${sq}}${whole ? ` = ${size}` : ''}` },
      { tex: `k = \\frac{1}{\\sqrt{${sq}}}${whole ? ` = \\frac{1}{${size}}` : ''}` },
      {
        text: whole
          ? `So $k = \\frac{1}{${size}}$, and $k${columnTex(x, y)} = ${columnTex(x / size, y / size)}$, which has length 1.`
          : `$${sq}$ is not a perfect square, so $\\frac{1}{\\sqrt{${sq}}}$ is the exact answer. A decimal would be a rounded one.`,
      },
      {
        text: 'The result is called a **unit vector**: same direction, length one. It is how a direction gets written down without a length attached to it.',
      },
    ];
  },
};

interface DistanceParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/**
 * The distance between two points, which is the magnitude of one minus the
 * other.
 *
 * The subtraction is the whole of the difficulty: a learner who reaches
 * straight for Pythagoras on the two position vectors gets the distance from
 * the origin to something that is not either point.
 */
const distance: Generator<DistanceParams> = {
  id: 'vec-distance',
  choices: ({ ax, ay, bx, by }) => {
    const sq = (bx - ax) ** 2 + (by - ay) ** 2;
    return options(
      { tex: `\\sqrt{${sq}}`, answer: `sqrt(${sq})` },
      // The components added rather than subtracted.
      { tex: `\\sqrt{${(bx + ax) ** 2 + (by + ay) ** 2}}`, answer: `sqrt(${(bx + ax) ** 2 + (by + ay) ** 2})` },
      { tex: `${sq}`, answer: `${sq}` },
      { tex: `${Math.abs(bx - ax) + Math.abs(by - ay)}`, answer: `${Math.abs(bx - ax) + Math.abs(by - ay)}` },
    );
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 11 : 7;
    for (let tries = 0; tries < 40; tries += 1) {
      const ax = rng.int(-span, span);
      const ay = rng.int(-span, span);
      const bx = rng.int(-span, span);
      const by = rng.int(-span, span);
      if (bx !== ax && by !== ay) return { ax, ay, bx, by };
    }
    return { ax: 1, ay: 2, bx: 4, by: 6 };
  },
  render: ({ ax, ay, bx, by }) => {
    const sq = (bx - ax) ** 2 + (by - ay) ** 2;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$A$ is the point $(${ax}, ${ay})$ and $B$ is the point $(${bx}, ${by})$. Find the distance $AB$ exactly, leaving a surd if it does not simplify.`,
        },
      ],
      lead: 'AB =',
      keypad: SURD_KEYS,
      answer: `sqrt(${sq})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ ax, ay, bx, by }) => {
    const dx = bx - ax;
    const dy = by - ay;
    const sq = dx * dx + dy * dy;
    const size = Math.sqrt(sq);
    return [
      {
        text: 'Find the vector from $A$ to $B$ first — destination minus start — and then take its magnitude.',
      },
      { tex: `\\overrightarrow{AB} = ${columnTex(bx, by)} - ${columnTex(ax, ay)} = ${columnTex(dx, dy)}` },
      { tex: `AB = \\sqrt{\\left(${dx}\\right)^{2} + \\left(${dy}\\right)^{2}} = \\sqrt{${sq}}${Number.isInteger(size) ? ` = ${size}` : ''}` },
      {
        text: 'Taking $A$ minus $B$ instead gives the vector pointing the other way, but the same distance — both components change sign and the squaring removes it.',
      },
      {
        text: 'Reaching for Pythagoras on the coordinates without subtracting first measures from the origin, which is not what was asked.',
      },
    ];
  },
};

interface AngleParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/**
 * The cosine of the angle between two vectors.
 *
 * Asked as a cosine rather than as an angle in degrees because the exact value
 * is what the scalar product gives, and rounding to a whole number of degrees
 * would either accept a wrong method or reject a right one.
 */
const angleBetween: Generator<AngleParams> = {
  id: 'vec-angle',
  choices: ({ ax, ay, bx, by }) => {
    const dot = ax * bx + ay * by;
    const sa = ax * ax + ay * ay;
    const sb = bx * bx + by * by;
    return options(
      { tex: `\\frac{${dot}}{\\sqrt{${sa}}\\sqrt{${sb}}}`, answer: `${dot}/(sqrt(${sa})*sqrt(${sb}))` },
      // The magnitudes left squared, which is the common slip.
      { tex: `\\frac{${dot}}{${sa} \\times ${sb}}`, answer: `${dot}/(${sa}*${sb})` },
      { tex: `\\frac{${dot}}{${sa} + ${sb}}`, answer: `${dot}/(${sa}+${sb})` },
      { tex: `\\frac{${-dot}}{\\sqrt{${sa}}\\sqrt{${sb}}}`, answer: `${-dot}/(sqrt(${sa})*sqrt(${sb}))` },
    );
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 8 : 5;
    for (let tries = 0; tries < 60; tries += 1) {
      const ax = nonZero(rng.int(-span, span), 2);
      const ay = nonZero(rng.int(-span, span), 3);
      const bx = nonZero(rng.int(-span, span), -1);
      const by = nonZero(rng.int(-span, span), 4);
      // A zero dot product would make three of the four options agree, and
      // the question it asks is better served by a perpendicular check.
      if (ax * bx + ay * by !== 0) return { ax, ay, bx, by };
    }
    return { ax: 2, ay: 3, bx: -1, by: 4 };
  },
  render: ({ ax, ay, bx, by }) => {
    const dot = ax * bx + ay * by;
    const sa = ax * ax + ay * ay;
    const sb = bx * bx + by * by;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$\\theta$ is the angle between ${`$${columnTex(ax, ay)}$`} and ${`$${columnTex(bx, by)}$`}. Find $\\cos\\theta$ exactly.`,
        },
      ],
      lead: '\\cos\\theta =',
      keypad: SURD_KEYS,
      answer: `${dot}/(sqrt(${sa})*sqrt(${sb}))`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ ax, ay, bx, by }) => {
    const dot = ax * bx + ay * by;
    const sa = ax * ax + ay * ay;
    const sb = bx * bx + by * by;
    return [
      {
        text: 'The scalar product carries the angle: $\\mathbf{a} \\cdot \\mathbf{b} = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta$. Rearranged, the cosine is the scalar product over the two magnitudes.',
      },
      { tex: `\\mathbf{a} \\cdot \\mathbf{b} = \\left(${ax}\\right)\\left(${bx}\\right) + \\left(${ay}\\right)\\left(${by}\\right) = ${dot}` },
      { tex: `|\\mathbf{a}| = \\sqrt{${sa}} \\qquad |\\mathbf{b}| = \\sqrt{${sb}}` },
      { tex: `\\cos\\theta = \\frac{${dot}}{\\sqrt{${sa}}\\sqrt{${sb}}}` },
      {
        text:
          dot < 0
            ? 'The scalar product is negative, so the cosine is too and the angle is obtuse. The sign alone answers "are these pointing roughly the same way?" without any arithmetic.'
            : 'The scalar product is positive, so the angle is acute. The sign alone answers "are these pointing roughly the same way?" without any arithmetic.',
      },
      {
        text: 'Forgetting the square roots is the usual mistake, and it shows up immediately: a cosine cannot be outside $-1$ to $1$.',
      },
    ];
  },
};

type MethodRoute = 'magnitude' | 'angle' | 'scale' | 'combine';

interface MethodParams {
  route: MethodRoute;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  k: number;
}

/**
 * Which tool a vector question calls for.
 *
 * Choosing the method is a skill the other widgets cannot ask about: a
 * `choice` slide asking "which method?" gets a lucky guess a quarter of the
 * time, and an answer box only ever grades the arithmetic that came after the
 * choice was already made.
 */
const method: Generator<MethodParams> = {
  id: 'vec-method',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 9 : 6;
    return {
      route: rng.pick(['magnitude', 'angle', 'scale', 'combine'] as const),
      ax: nonZero(rng.int(-span, span), 3),
      ay: nonZero(rng.int(-span, span), -4),
      bx: nonZero(rng.int(-span, span), 5),
      by: nonZero(rng.int(-span, span), 2),
      k: nonZero(rng.int(2, 6), 3),
    };
  },
  render: ({ route, ax, ay, bx, by, k }): Slide => {
    const a = columnTex(ax, ay);
    const b = columnTex(bx, by);
    const subject =
      route === 'magnitude'
        ? `\\text{How long is } ${a} \\text{?}`
        : route === 'angle'
          ? `\\text{What angle is there between } ${a} \\text{ and } ${b} \\text{?}`
          : route === 'scale'
            ? `\\text{What is } ${k}${a} \\text{?}`
            : `\\text{What is } ${a} + ${b} \\text{?}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Work down the questions to decide how you would answer this. Each answer chooses what gets asked next.',
        },
      ],
      subject,
      steps: [
        {
          id: 'kind',
          ask: 'Is the answer a number or a vector?',
          branches: [
            { label: 'A number', to: 'number' },
            { label: 'A vector', to: 'vector' },
          ],
        },
        {
          id: 'number',
          ask: 'Does it involve one vector or two?',
          branches: [
            { label: 'One', outcome: 'Use Pythagoras: the magnitude is $\\sqrt{x^{2} + y^{2}}$.' },
            {
              label: 'Two',
              outcome: 'Use the scalar product: $\\mathbf{a} \\cdot \\mathbf{b} = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta$.',
            },
          ],
        },
        {
          id: 'vector',
          ask: 'Does it involve one vector or two?',
          branches: [
            { label: 'One', outcome: 'Multiply every component by the scalar.' },
            { label: 'Two', outcome: 'Combine them component by component.' },
          ],
        },
      ],
      answer:
        route === 'magnitude'
          ? ['A number', 'One']
          : route === 'angle'
            ? ['A number', 'Two']
            : route === 'scale'
              ? ['A vector', 'One']
              : ['A vector', 'Two'],
    };
  },
  solution: ({ route, ax, ay, bx, by, k }) => {
    if (route === 'magnitude') {
      const sq = ax * ax + ay * ay;
      return [
        {
          text: 'A length is a single number, and it comes from one vector, so this is Pythagoras on the components.',
        },
        { tex: `\\left| ${columnTex(ax, ay)} \\right| = \\sqrt{${ax * ax} + ${ay * ay}} = \\sqrt{${sq}}` },
        {
          text: 'The signs disappear in the squaring, which is why a magnitude can never come out negative.',
        },
      ];
    }
    if (route === 'angle') {
      const dot = ax * bx + ay * by;
      return [
        {
          text: 'An angle is a number and it needs both vectors, which is exactly what the scalar product is for.',
        },
        { tex: `${columnTex(ax, ay)} \\cdot ${columnTex(bx, by)} = ${dot}` },
        {
          text: `Divide by the two magnitudes to get $\\cos\\theta$. The sign of $${dot}$ already says whether the angle is acute or obtuse.`,
        },
      ];
    }
    if (route === 'scale') {
      return [
        {
          text: 'Multiplying by a number leaves a vector, built from one vector, so every component is multiplied.',
        },
        { tex: `${k}${columnTex(ax, ay)} = ${columnTex(k * ax, k * ay)}` },
        {
          text: 'Scaling only the top component is the characteristic error — a scalar has to reach both.',
        },
      ];
    }
    return [
      {
        text: 'Adding two vectors gives a vector, and the two components never interact.',
      },
      { tex: `${columnTex(ax, ay)} + ${columnTex(bx, by)} = ${columnTex(ax + bx, ay + by)}` },
      {
        text: 'Tops with tops and bottoms with bottoms. There is no cross term anywhere in vector addition.',
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
  notation,
  journey,
  component,
  scalarK,
  unitScalar,
  distance,
  angleBetween,
  method,
] as unknown as Generator<unknown>[];
