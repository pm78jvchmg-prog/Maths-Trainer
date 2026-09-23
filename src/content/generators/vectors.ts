/**
 * Vectors: components, scalar multiples, magnitude and the scalar product.
 *
 * Shared formatters and the engine constraints they exist for live in
 * `vectorFormat.ts`; the matrix half of the old combined file is now
 * `matrices.ts`.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide } from '../types';
import { bin, num, pow, root } from '../expr';
import { options } from '../choiceVariant';
import { hashSeed } from '../../engine/rng';
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

/* ---------- Level 4: vector geometry (roadmap batch B8) ---------- */

/*
 * Level 4 moves from vectors as columns of numbers to vectors as the way of
 * saying where points are: position vectors, the vector between two points,
 * a point part-way along a line, three points on one line, the fourth corner
 * of a parallelogram, and finally the same reasoning with no numbers at all.
 *
 * Every answer is still either a scalar or a pair of numbers placed as tiles,
 * for the reason `vectorFormat.ts` gives. The one exception in spirit is the
 * last lesson, where the answer is a combination of the symbols `a` and `b`:
 * that is graded as a scalar expression in two variables, and correctly so —
 * a linear combination of two independent vectors behaves exactly like the
 * same combination of two independent numbers, so `a/2 + b/2` and
 * `(a + b)/2` agree at every probe point exactly when the vectors agree.
 */

/** A point's coordinates, for prompts and options. One whole TeX string. */
function pointTex(x: number, y: number): string {
  return `\\left(${x}, ${y}\\right)`;
}

/**
 * The coordinate template every point answer uses.
 *
 * Plain brackets rather than `\left(`: a tiles template is split at its blanks
 * into separate TeX fragments, and a `\left(` whose `\right)` lives in another
 * fragment renders as red error text.
 */
function pointTemplate(name: string): string {
  return `${name} = ( {0} , \\; {1} )`;
}

/** Point options, as a choice's labels. */
function pointOptions(correct: [number, number], ...wrong: [number, number][]) {
  return options(
    { tex: pointTex(correct[0], correct[1]) },
    ...wrong.map(([x, y]) => ({ tex: pointTex(x, y) })),
  );
}

/** Zero exactly when two vectors are parallel (or either is zero). */
function cross(ux: number, uy: number, vx: number, vy: number): number {
  return ux * vy - uy * vx;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** A fraction in lowest terms with a positive denominator. */
interface Ratio {
  n: number;
  d: number;
}

function ratio(n: number, d: number): Ratio {
  const g = gcd(n, d) || 1;
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g, d: (sign * d) / g };
}

const sameRatio = (p: Ratio, q: Ratio) => p.n === q.n && p.d === q.d;

/** A fraction as the learner reads it: `-\frac{1}{3}`, `2`, never `\frac{2}{1}`. */
function ratioTex({ n, d }: Ratio): string {
  if (d === 1) return `${n}`;
  return `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}`;
}

/** The same fraction for mathjs, bracketed so nothing can bind into it. */
function ratioAnswer({ n, d }: Ratio): string {
  return `(${n}/${d})`;
}

/** One term of a combination, with the sign left to the caller. */
function termTex(size: Ratio, symbol: string): string {
  if (size.n === size.d) return symbol;
  return `${ratioTex(size)}${symbol}`;
}

/**
 * `λa + μb` as it would be written by hand: a coefficient of one is implied, a
 * zero term vanishes, and a negative second term reads as a subtraction.
 */
function combinationTex(lambda: Ratio, mu: Ratio, a = '\\mathbf{a}', b = '\\mathbf{b}'): string {
  const parts: string[] = [];
  if (lambda.n !== 0) {
    parts.push(`${lambda.n < 0 ? '-' : ''}${termTex(ratio(Math.abs(lambda.n), lambda.d), a)}`);
  }
  if (mu.n !== 0) {
    const body = termTex(ratio(Math.abs(mu.n), mu.d), b);
    if (parts.length === 0) parts.push(`${mu.n < 0 ? '-' : ''}${body}`);
    else parts.push(`${mu.n < 0 ? '-' : '+'} ${body}`);
  }
  return parts.length === 0 ? '\\mathbf{0}' : parts.join(' ');
}

/** The same combination for mathjs, in the two symbols the keypad offers. */
function combinationAnswer(lambda: Ratio, mu: Ratio): string {
  return `${ratioAnswer(lambda)}*a + ${ratioAnswer(mu)}*b`;
}

/** Tile tokens, sorted by the value they stand for so the bank reads in order. */
function ratioBank(answer: Ratio[], wrong: Ratio[]): string[] {
  const value = (r: Ratio) => r.n / r.d;
  const needed = new Set(answer.map(ratioTex));
  const extras: Ratio[] = [];
  const seen = new Set<string>();
  const offer = (r: Ratio) => {
    const tex = ratioTex(r);
    if (needed.has(tex) || seen.has(tex)) return;
    seen.add(tex);
    extras.push(r);
  };
  wrong.forEach(offer);
  // Padding for the cases whose slips all land on the answer — a midpoint's
  // two halves, swapped, are the same two halves.
  for (const r of [ratio(1, 1), ratio(-1, 1), ratio(1, 2), ratio(2, 1), ratio(-1, 2)]) {
    if (extras.length >= 3) break;
    offer(r);
  }
  return [...answer, ...extras].sort((p, q) => value(p) - value(q)).map(ratioTex);
}

/** A tree bank keeping its answers with multiplicity and at least two spares. */
function geometryTreeBank(answer: string[], candidates: string[], pad: string[]): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  for (const candidate of [...candidates, ...pad]) {
    if (extras.length >= 4) break;
    if (needed.has(candidate) || extras.includes(candidate)) continue;
    extras.push(candidate);
  }
  return [...answer, ...extras].sort();
}

/**
 * Points on squared paper, with the segment between the first two.
 *
 * Square and to scale like `vectorSvg`, and for the same reason: a slider
 * marker is positioned as a fraction of the picture, so -span has to sit on the
 * left edge exactly. Each label sits beyond its point along the segment, where
 * the line cannot run through it.
 */
function pointsSvg(
  points: { x: number; y: number; name: string }[],
  opts: { span: number; arrow?: boolean; label: string },
): string {
  const { span } = opts;
  const SIZE = 220;
  const unit = SIZE / (2 * span);
  const sx = (v: number) => SIZE / 2 + v * unit;
  const sy = (v: number) => SIZE / 2 - v * unit;
  const f = (v: number) => v.toFixed(1);

  const parts = [
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" role="img" aria-label="${opts.label}">`,
  ];
  for (let i = -span + 1; i <= span - 1; i += 1) {
    parts.push(
      `<line x1="${f(sx(i))}" y1="0" x2="${f(sx(i))}" y2="${SIZE}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
      `<line x1="0" y1="${f(sy(i))}" x2="${SIZE}" y2="${f(sy(i))}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
    );
  }
  parts.push(
    `<line x1="0" y1="${f(sy(0))}" x2="${SIZE}" y2="${f(sy(0))}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    `<line x1="${f(sx(0))}" y1="0" x2="${f(sx(0))}" y2="${SIZE}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
  );

  const [from, to] = points;
  if (from && to) {
    parts.push(
      `<line x1="${f(sx(from.x))}" y1="${f(sy(from.y))}" x2="${f(sx(to.x))}" y2="${f(sy(to.y))}" class="plot-accent" stroke="currentColor" stroke-width="2.5" />`,
    );
    if (opts.arrow) {
      const angle = Math.atan2(-(to.y - from.y), to.x - from.x);
      for (const turn of [0.4, -0.4]) {
        parts.push(
          `<line x1="${f(sx(to.x))}" y1="${f(sy(to.y))}" x2="${f(sx(to.x) - 11 * Math.cos(angle + turn))}" y2="${f(sy(to.y) - 11 * Math.sin(angle + turn))}" class="plot-accent" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />`,
        );
      }
    }
  }

  for (const [idx, point] of points.entries()) {
    const other = points[idx === 0 ? 1 : 0] ?? { x: 0, y: 0 };
    const dx = sx(point.x) - sx(other.x);
    const dy = sy(point.y) - sy(other.y);
    const length = Math.hypot(dx, dy) || 1;
    parts.push(
      `<circle cx="${f(sx(point.x))}" cy="${f(sy(point.y))}" r="3.5" fill="currentColor" />`,
      `<text x="${f(sx(point.x) + (14 * dx) / length)}" y="${f(sy(point.y) + (14 * dy) / length + 4)}" font-size="13" font-style="italic" text-anchor="middle" fill="currentColor">${point.name}</text>`,
    );
  }
  parts.push('</svg>');
  return parts.join('');
}

interface BetweenParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  reverse: boolean;
  given: 'points' | 'vectors';
}

/** Where a between-two-points question starts and where it ends. */
function ends({ ax, ay, bx, by, reverse }: BetweenParams) {
  return reverse
    ? { from: 'B', to: 'A', fx: bx, fy: by, tx: ax, ty: ay }
    : { from: 'A', to: 'B', fx: ax, fy: ay, tx: bx, ty: by };
}

/**
 * The vector from one point to another: destination minus start.
 *
 * Level 1 met `b - a` once, in a teaching slide. Here it is the whole subject,
 * asked both ways round and from both notations, because every later question
 * in the level starts with it.
 */
const between: Generator<BetweenParams> = {
  id: 'vec-between',
  choices: (params) => {
    const { fx, fy, tx, ty } = ends(params);
    const x = tx - fx;
    const y = ty - fy;
    return options(
      { tex: columnTex(x, y) },
      // Start minus destination: the right size, pointing backwards.
      { tex: columnTex(-x, -y) },
      // The two positions added.
      { tex: columnTex(tx + fx, ty + fy) },
      { tex: columnTex(y, x) },
    );
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 9 : 6;
    for (let tries = 0; tries < 40; tries += 1) {
      const ax = rng.int(-span, span);
      const ay = rng.int(-span, span);
      const bx = rng.int(-span, span);
      const by = rng.int(-span, span);
      if (bx === ax || by === ay) continue;
      return {
        ax,
        ay,
        bx,
        by,
        reverse: rng.pick([false, true]),
        given: rng.pick(['points', 'vectors'] as const),
      };
    }
    return { ax: 1, ay: 2, bx: 4, by: -3, reverse: false, given: 'points' };
  },
  render: (params) => {
    const { ax, ay, bx, by, given } = params;
    const { from, to, fx, fy, tx, ty } = ends(params);
    const x = tx - fx;
    const y = ty - fy;
    const setup =
      given === 'points'
        ? `$A$ is the point $${pointTex(ax, ay)}$ and $B$ is the point $${pointTex(bx, by)}$.`
        : `$A$ and $B$ have position vectors $\\mathbf{a} = ${columnTex(ax, ay)}$ and $\\mathbf{b} = ${columnTex(bx, by)}$.`;
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `${setup} Find $\\overrightarrow{${from}${to}}$.` }],
      template: VECTOR_TEMPLATE,
      bank: bankOf([`${x}`, `${y}`], [`${-x}`, `${-y}`, `${tx + fx}`, `${ty + fy}`]),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: (params) => {
    const { from, to, fx, fy, tx, ty } = ends(params);
    const x = tx - fx;
    const y = ty - fy;
    return [
      {
        text: `The vector from $${from}$ to $${to}$ is destination minus start: the position of $${to}$ take away the position of $${from}$.`,
      },
      {
        tex: `\\overrightarrow{${from}${to}} = ${columnTex(tx, ty)} - ${columnTex(fx, fy)} = ${columnTex(x, y)}`,
      },
      {
        text: `Check it by walking: start at $${pointTex(fx, fy)}$, go ${Math.abs(x)} ${x < 0 ? 'left' : 'right'} and ${Math.abs(y)} ${y < 0 ? 'down' : 'up'}, and you arrive at $${pointTex(tx, ty)}$.`,
      },
      {
        text: `Subtracting the other way gives $${columnTex(-x, -y)}$, which is $\\overrightarrow{${to}${from}}$: the same length, pointing back the way it came.`,
      },
    ];
  },
};

interface BetweenSliderParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  part: 'i' | 'j';
}

/**
 * The vector between two drawn points, read off the picture.
 *
 * The marker starts level with $A$ and moves by the value on the slider, so
 * the learner drags until it reaches $B$ and reads how far that was. Counting
 * squares from one point to another is what "destination minus start" means
 * before it is a subtraction.
 */
const betweenSlider: Generator<BetweenSliderParams> = {
  id: 'vec-between-slider',
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 6 : 5;
    const part = rng.pick(['i', 'j'] as const);
    for (let tries = 0; tries < 60; tries += 1) {
      const ax = rng.int(-reach, reach);
      const ay = rng.int(-reach, reach);
      const bx = rng.int(-reach, reach);
      const by = rng.int(-reach, reach);
      if (bx === ax || by === ay) continue;
      return { ax, ay, bx, by, part };
    }
    return { ax: -3, ay: 1, bx: 2, by: 4, part };
  },
  render: ({ ax, ay, bx, by, part }): Slide => {
    const span = 8;
    const across = part === 'i';
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: across
            ? 'The arrow runs from $A$ to $B$. Slide to the $\\mathbf{i}$ component of $\\overrightarrow{AB}$: how far across it goes. The line starts at $A$.'
            : 'The arrow runs from $A$ to $B$. Slide to the $\\mathbf{j}$ component of $\\overrightarrow{AB}$: how far up it goes, negative for down. The line starts level with $A$.',
        },
      ],
      min: -12,
      max: 12,
      step: 1,
      answer: across ? bx - ax : by - ay,
      readout: across
        ? '\\mathbf{i}\\text{ component of } \\overrightarrow{AB} = {v}'
        : '\\mathbf{j}\\text{ component of } \\overrightarrow{AB} = {v}',
      figure: {
        svg: pointsSvg(
          [
            { x: ax, y: ay, name: 'A' },
            { x: bx, y: by, name: 'B' },
          ],
          { span, arrow: true, label: 'An arrow from A to B on squared paper' },
        ),
        xMin: -span,
        xMax: span,
        axis: across ? 'x' : 'y',
        origin: across ? ax : ay,
      },
    };
  },
  solution: ({ ax, ay, bx, by, part }) => {
    const across = part === 'i';
    const value = across ? bx - ax : by - ay;
    return [
      {
        text: `$A$ is at $${pointTex(ax, ay)}$ and $B$ is at $${pointTex(bx, by)}$, so the vector from one to the other is destination minus start.`,
      },
      { tex: `\\overrightarrow{AB} = ${columnTex(bx, by)} - ${columnTex(ax, ay)} = ${columnTex(bx - ax, by - ay)}` },
      {
        text: across
          ? `Across, that is $${bx} - \\left(${ax}\\right) = ${value}$: ${Math.abs(value)} square${Math.abs(value) === 1 ? '' : 's'} to the ${value < 0 ? 'left' : 'right'}.`
          : `Up, that is $${by} - \\left(${ay}\\right) = ${value}$: ${Math.abs(value)} square${Math.abs(value) === 1 ? '' : 's'} ${value < 0 ? 'down' : 'up'}.`,
      },
      {
        text: 'Reading off where $B$ is instead measures from the origin, which answers a different question: the position of $B$, not the journey from $A$.',
      },
    ];
  },
};

interface EndpointParams {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  findStart: boolean;
}

/**
 * A point from another point and the vector between them.
 *
 * The same equation as `vec-between` used the other way: `b = a + AB` going
 * forwards and `a = b - AB` going back. Going back is where the sign slips.
 */
const endpoint: Generator<EndpointParams> = {
  id: 'vec-endpoint',
  choices: ({ ax, ay, dx, dy, findStart }) => {
    const bx = ax + dx;
    const by = ay + dy;
    return findStart
      ? pointOptions([ax, ay], [bx + dx, by + dy], [dx, dy], [ay, ax])
      : pointOptions([bx, by], [ax - dx, ay - dy], [dx, dy], [by, bx]);
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 8 : 5;
    return {
      ax: rng.int(-span, span),
      ay: rng.int(-span, span),
      dx: nonZero(rng.int(-span, span), 3),
      dy: nonZero(rng.int(-span, span), -2),
      findStart: rng.pick([false, true]),
    };
  },
  render: ({ ax, ay, dx, dy, findStart }) => {
    const bx = ax + dx;
    const by = ay + dy;
    const vector = `$\\overrightarrow{AB} = ${columnTex(dx, dy)}$`;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: findStart
            ? `$B$ is the point $${pointTex(bx, by)}$ and ${vector}. Find the coordinates of $A$.`
            : `$A$ is the point $${pointTex(ax, ay)}$ and ${vector}. Find the coordinates of $B$.`,
        },
      ],
      template: pointTemplate(findStart ? 'A' : 'B'),
      bank: findStart
        ? bankOf([`${ax}`, `${ay}`], [`${bx + dx}`, `${by + dy}`, `${dx}`, `${dy}`])
        : bankOf([`${bx}`, `${by}`], [`${ax - dx}`, `${ay - dy}`, `${dx}`, `${dy}`]),
      answer: findStart ? [`${ax}`, `${ay}`] : [`${bx}`, `${by}`],
    };
  },
  solution: ({ ax, ay, dx, dy, findStart }) => {
    const bx = ax + dx;
    const by = ay + dy;
    if (findStart) {
      return [
        {
          text: '$\\overrightarrow{AB}$ is the journey from $A$ to $B$. To get back to $A$, start at $B$ and make that journey in reverse: subtract it.',
        },
        { tex: '\\mathbf{a} = \\mathbf{b} - \\overrightarrow{AB}' },
        { tex: `= ${columnTex(bx, by)} - ${columnTex(dx, dy)} = ${columnTex(ax, ay)}` },
        { text: `So $A$ is $${pointTex(ax, ay)}$.` },
        {
          text: `Check it forwards: $${pointTex(ax, ay)}$ moved by $${columnTex(dx, dy)}$ lands on $${pointTex(bx, by)}$, which is $B$. Adding instead would have walked further on, to $${pointTex(bx + dx, by + dy)}$.`,
        },
      ];
    }
    return [
      {
        text: '$\\overrightarrow{AB}$ is the journey from $A$ to $B$, so $B$ is where you end up after making it from $A$.',
      },
      { tex: '\\mathbf{b} = \\mathbf{a} + \\overrightarrow{AB}' },
      { tex: `= ${columnTex(ax, ay)} + ${columnTex(dx, dy)} = ${columnTex(bx, by)}` },
      { text: `So $B$ is $${pointTex(bx, by)}$.` },
      {
        text: `Subtracting would walk the journey backwards and land on $${pointTex(ax - dx, ay - dy)}$, a point on the far side of $A$.`,
      },
    ];
  },
};

const POINT_NAMES = ['A', 'B', 'C', 'D', 'P', 'Q', 'R', 'S'];

interface DirectionParams {
  p: number;
  q: number;
  r: number;
  phrase: number;
  chain: boolean;
}

/**
 * `q - p` with no numbers in it.
 *
 * The step between the numeric questions and the last lesson's symbolic ones:
 * the rule is the same, but there is nothing to check it against by walking,
 * so it has to be known the right way round.
 */
const direction: Generator<DirectionParams> = {
  id: 'vec-direction',
  sample: (rng, difficulty) => {
    const [p, q, r] = rng.sample([0, 1, 2, 3, 4, 5, 6, 7], 3);
    return {
      p,
      q,
      r,
      phrase: rng.int(0, 2),
      chain: difficulty > 1 && rng.chance(0.5),
    };
  },
  render: ({ p, q, r, phrase, chain }): Slide => {
    const P = POINT_NAMES[p];
    const Q = POINT_NAMES[q];
    const R = POINT_NAMES[r];
    const v = (name: string) => `\\mathbf{${name.toLowerCase()}}`;
    const offered = chain
      ? distinctOptions([
          { id: 'right', label: `${v(R)} - ${v(P)}`, tex: true },
          { id: 'backwards', label: `${v(P)} - ${v(R)}`, tex: true },
          { id: 'last-leg', label: `${v(R)} - ${v(Q)}`, tex: true },
          { id: 'added', label: `${v(P)} + ${v(R)} - 2${v(Q)}`, tex: true },
        ])
      : distinctOptions([
          { id: 'right', label: `${v(Q)} - ${v(P)}`, tex: true },
          { id: 'backwards', label: `${v(P)} - ${v(Q)}`, tex: true },
          { id: 'added', label: `${v(P)} + ${v(Q)}`, tex: true },
          { id: 'midpoint', label: `\\frac{1}{2}\\left(${v(P)} + ${v(Q)}\\right)`, tex: true },
        ]);
    const setup = chain
      ? `$${P}$, $${Q}$ and $${R}$ have position vectors $${v(P)}$, $${v(Q)}$ and $${v(R)}$.`
      : `$${P}$ and $${Q}$ have position vectors $${v(P)}$ and $${v(Q)}$.`;
    const question = chain
      ? [
          `Which is $\\overrightarrow{${P}${Q}} + \\overrightarrow{${Q}${R}}$?`,
          `A journey goes from $${P}$ to $${Q}$ and then on to $${R}$. Which vector is the whole journey?`,
          `Which single vector does the same as $\\overrightarrow{${P}${Q}}$ followed by $\\overrightarrow{${Q}${R}}$?`,
        ][phrase]
      : [
          `Which is $\\overrightarrow{${P}${Q}}$?`,
          `Which vector takes you from $${P}$ to $${Q}$?`,
          `Which is the position of $${Q}$ relative to $${P}$?`,
        ][phrase];
    const turn = (p + q + r + phrase) % offered.length;
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `${setup} ${question}` }],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'right',
    };
  },
  solution: ({ p, q, r, chain }) => {
    const P = POINT_NAMES[p];
    const Q = POINT_NAMES[q];
    const R = POINT_NAMES[r];
    const v = (name: string) => `\\mathbf{${name.toLowerCase()}}`;
    if (chain) {
      return [
        { text: 'Each leg is destination minus start.' },
        {
          tex: `\\overrightarrow{${P}${Q}} + \\overrightarrow{${Q}${R}} = \\left(${v(Q)} - ${v(P)}\\right) + \\left(${v(R)} - ${v(Q)}\\right) = ${v(R)} - ${v(P)}`,
        },
        {
          text: `$${v(Q)}$ cancels: where the journey passed through does not matter, only where it started and where it ended. So the whole journey is $\\overrightarrow{${P}${R}}$.`,
        },
      ];
    }
    return [
      {
        text: `To get from $${P}$ to $${Q}$, go from $${P}$ back to the origin and then out to $${Q}$: that is $-${v(P)}$ followed by $${v(Q)}$.`,
      },
      { tex: `\\overrightarrow{${P}${Q}} = -${v(P)} + ${v(Q)} = ${v(Q)} - ${v(P)}` },
      {
        text: `Destination minus start. $${v(P)} - ${v(Q)}$ is the same journey backwards, $\\overrightarrow{${Q}${P}}$.`,
      },
    ];
  },
};

interface MidpointParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  findEnd: boolean;
}

/**
 * The midpoint, and at difficulty 2 the end reached from a midpoint.
 *
 * Coordinates are drawn with matching parity so every midpoint is whole: a
 * half on a tile is a different question, about fractions.
 */
const midpoint: Generator<MidpointParams> = {
  id: 'vec-midpoint',
  choices: ({ ax, ay, bx, by, findEnd }) => {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    return findEnd
      ? pointOptions([bx, by], [2 * ax - mx, 2 * ay - my], [mx - ax, my - ay], [ax + mx, ay + my])
      : pointOptions([mx, my], [(bx - ax) / 2, (by - ay) / 2], [ax + bx, ay + by], [my, mx]);
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 9 : 6;
    for (let tries = 0; tries < 60; tries += 1) {
      const ax = rng.int(-span, span);
      const ay = rng.int(-span, span);
      const bx = ax + 2 * nonZero(rng.int(-span, span), 2);
      const by = ay + 2 * nonZero(rng.int(-span, span), -3);
      if (Math.abs(bx) > span + 4 || Math.abs(by) > span + 4) continue;
      return { ax, ay, bx, by, findEnd: difficulty > 1 && rng.chance(0.5) };
    }
    return { ax: 1, ay: -2, bx: 5, by: 4, findEnd: false };
  },
  render: ({ ax, ay, bx, by, findEnd }) => {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: findEnd
            ? `$M$ is the midpoint of $AB$. $A$ is $${pointTex(ax, ay)}$ and $M$ is $${pointTex(mx, my)}$. Find the coordinates of $B$.`
            : `$A$ is $${pointTex(ax, ay)}$ and $B$ is $${pointTex(bx, by)}$. Find the coordinates of $M$, the midpoint of $AB$.`,
        },
      ],
      template: pointTemplate(findEnd ? 'B' : 'M'),
      bank: findEnd
        ? bankOf([`${bx}`, `${by}`], [`${2 * ax - mx}`, `${2 * ay - my}`, `${mx - ax}`, `${my - ay}`])
        : bankOf([`${mx}`, `${my}`], [`${(bx - ax) / 2}`, `${(by - ay) / 2}`, `${ax + bx}`, `${ay + by}`]),
      answer: findEnd ? [`${bx}`, `${by}`] : [`${mx}`, `${my}`],
    };
  },
  solution: ({ ax, ay, bx, by, findEnd }) => {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    if (findEnd) {
      return [
        {
          text: '$M$ is halfway, so the journey from $A$ to $M$ is half the journey from $A$ to $B$. Make it twice.',
        },
        { tex: `\\overrightarrow{AM} = ${columnTex(mx, my)} - ${columnTex(ax, ay)} = ${columnTex(mx - ax, my - ay)}` },
        { tex: '\\mathbf{b} = \\mathbf{m} + \\overrightarrow{AM}' },
        { tex: `= ${columnTex(mx, my)} + ${columnTex(mx - ax, my - ay)} = ${columnTex(bx, by)}` },
        {
          text: `Check with the midpoint formula: halfway between $${pointTex(ax, ay)}$ and $${pointTex(bx, by)}$ is $${pointTex(mx, my)}$, which is $M$.`,
        },
      ];
    }
    return [
      {
        text: 'Halfway from $A$ to $B$ is $A$ plus half of $\\overrightarrow{AB}$, which tidies up to the average of the two position vectors.',
      },
      { tex: `\\mathbf{m} = \\mathbf{a} + \\tfrac{1}{2}\\left(\\mathbf{b} - \\mathbf{a}\\right) = \\tfrac{1}{2}\\left(\\mathbf{a} + \\mathbf{b}\\right)` },
      { tex: `\\tfrac{1}{2}\\left(${columnTex(ax, ay)} + ${columnTex(bx, by)}\\right)` },
      { tex: `= \\tfrac{1}{2}${columnTex(ax + bx, ay + by)} = ${columnTex(mx, my)}` },
      {
        text: `Halving $\\overrightarrow{AB}$ alone gives $${pointTex((bx - ax) / 2, (by - ay) / 2)}$, which is how far $M$ is from $A$, not where it is.`,
      },
    ];
  },
};

/** Ratios a point may divide a line in, `AP : PB = m : n`, never 1 : 1. */
const SECTION_PAIRS: Record<1 | 2, [number, number][]> = {
  1: [[1, 2], [2, 1], [1, 3], [3, 1]],
  2: [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [4, 1]],
};

interface SectionParams {
  ax: number;
  ay: number;
  u: number;
  v: number;
  m: number;
  n: number;
}

/**
 * A line split in the ratio m : n. `B - A` is drawn as (m + n) whole steps, so
 * every point on the way is on the grid.
 */
function sampleSection(rng: Parameters<Generator['sample']>[0], difficulty: number): SectionParams {
  const [m, n] = rng.pick(SECTION_PAIRS[difficulty > 1 ? 2 : 1]);
  const span = difficulty > 1 ? 8 : 6;
  return {
    ax: rng.int(-span, span),
    ay: rng.int(-span, span),
    u: nonZero(rng.int(-3, 3), 2),
    v: nonZero(rng.int(-3, 3), -1),
    m,
    n,
  };
}

function sectionSetup({ ax, ay, u, v, m, n }: SectionParams): string {
  const bx = ax + (m + n) * u;
  const by = ay + (m + n) * v;
  return `$A$ is $${pointTex(ax, ay)}$ and $B$ is $${pointTex(bx, by)}$. $P$ lies on $AB$ with $AP : PB = ${m} : ${n}$.`;
}

/** The point dividing a line in a given ratio, as coordinates. */
const section: Generator<SectionParams> = {
  id: 'vec-section',
  choices: ({ ax, ay, u, v, m, n }) =>
    pointOptions(
      [ax + m * u, ay + m * v],
      // The ratio read the wrong way round.
      [ax + n * u, ay + n * v],
      // How far P is from A, rather than where it is.
      [m * u, m * v],
      [ay + m * v, ax + m * u],
    ),
  sample: sampleSection,
  render: (params) => {
    const { ax, ay, u, v, m, n } = params;
    const px = ax + m * u;
    const py = ay + m * v;
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `${sectionSetup(params)} Find the coordinates of $P$.` }],
      template: pointTemplate('P'),
      bank: bankOf([`${px}`, `${py}`], [`${ax + n * u}`, `${ay + n * v}`, `${m * u}`, `${m * v}`]),
      answer: [`${px}`, `${py}`],
    };
  },
  solution: ({ ax, ay, u, v, m, n }) => {
    const total = m + n;
    return [
      {
        text: `$AP : PB = ${m} : ${n}$ cuts $AB$ into ${total} equal parts, and $P$ is ${m} of them along from $A$. So $\\overrightarrow{AP} = \\frac{${m}}{${total}}\\overrightarrow{AB}$.`,
      },
      { tex: `\\overrightarrow{AB} = ${columnTex(total * u, total * v)}` },
      { tex: `\\overrightarrow{AP} = \\frac{${m}}{${total}}${columnTex(total * u, total * v)} = ${columnTex(m * u, m * v)}` },
      { tex: `\\mathbf{p} = \\mathbf{a} + \\overrightarrow{AP} = ${columnTex(ax, ay)} + ${columnTex(m * u, m * v)}` },
      { tex: `= ${columnTex(ax + m * u, ay + m * v)}` },
      {
        text: `Using $\\frac{${n}}{${total}}$ instead reads the ratio from the $B$ end, and lands on $${pointTex(ax + n * u, ay + n * v)}$. The first number in the ratio belongs to the part next to $A$.`,
      },
    ];
  },
};

/** The same point, with the working laid out as a tree. */
const sectionTree: Generator<SectionParams> = {
  id: 'vec-section-tree',
  sample: sampleSection,
  render: (params): Slide => {
    const { ax, ay, u, v, m, n } = params;
    const total = m + n;
    const answer = [
      columnTex(total * u, total * v),
      columnTex(m * u, m * v),
      pointTex(ax + m * u, ay + m * v),
    ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${sectionSetup(params)} Fill the tree: $\\overrightarrow{AB}$ first, then $\\overrightarrow{AP}$, then the point $P$.`,
        },
      ],
      expression: `\\overrightarrow{OP} = \\overrightarrow{OA} + \\frac{${m}}{${total}}\\overrightarrow{AB}`,
      nodes: [
        { id: 'ab', from: [] },
        { id: 'ap', from: ['ab'] },
        { id: 'p', from: ['ap'] },
      ],
      bank: geometryTreeBank(
        answer,
        [
          columnTex(-total * u, -total * v),
          columnTex(n * u, n * v),
          pointTex(ax + n * u, ay + n * v),
          pointTex(m * u, m * v),
        ],
        [columnTex(m * u + 1, m * v), pointTex(ax + m * u, ay + m * v + 1)],
      ),
      answer,
    };
  },
  solution: ({ ax, ay, u, v, m, n }) => {
    const total = m + n;
    return [
      { text: 'Start with the whole journey from $A$ to $B$: destination minus start.' },
      { tex: `\\overrightarrow{AB} = ${columnTex(total * u, total * v)}` },
      { text: `$P$ is ${m} of the ${total} equal parts along, so take $\\frac{${m}}{${total}}$ of it.` },
      { tex: `\\overrightarrow{AP} = ${columnTex(m * u, m * v)}` },
      { text: 'Then start at $A$ and make that journey.' },
      { tex: `P = ${pointTex(ax + m * u, ay + m * v)}` },
    ];
  },
};

type SectionAsk = 'AP-AB' | 'PB-AB' | 'AP-PB' | 'PA-AB';

interface SectionFractionParams {
  m: number;
  n: number;
  ask: SectionAsk;
}

/** Which fraction of which vector each ask is, for a ratio m : n. */
function sectionFraction({ m, n, ask }: SectionFractionParams): Ratio {
  if (ask === 'AP-AB') return ratio(m, m + n);
  if (ask === 'PB-AB') return ratio(n, m + n);
  if (ask === 'AP-PB') return ratio(m, n);
  return ratio(-m, m + n);
}

/**
 * The scalar a ratio turns into.
 *
 * `AP : PB = 2 : 3` is a statement about lengths; `AP = 2/5 AB` is the vector
 * equation every calculation actually uses. The slip is the denominator: 2/3
 * compares the two parts with each other, not a part with the whole.
 */
const sectionFractionGen: Generator<SectionFractionParams> = {
  id: 'vec-section-fraction',
  choices: (params) => {
    const { m, n, ask } = params;
    const right = sectionFraction(params);
    const wrong =
      ask === 'AP-AB'
        ? [ratio(m, n), ratio(n, m + n), ratio(m + n, m)]
        : ask === 'PB-AB'
          ? [ratio(n, m), ratio(m, m + n), ratio(m + n, n)]
          : ask === 'AP-PB'
            ? [ratio(m, m + n), ratio(n, m), ratio(n, m + n)]
            : [ratio(m, m + n), ratio(-n, m + n), ratio(-m, n)];
    return options(
      { tex: ratioTex(right), answer: ratioAnswer(right) },
      ...wrong.map((r) => ({ tex: ratioTex(r), answer: ratioAnswer(r) })),
    );
  },
  sample: (rng, difficulty) => {
    const top = difficulty > 1 ? 5 : 4;
    for (let tries = 0; tries < 60; tries += 1) {
      const m = rng.int(1, top);
      const n = rng.int(1, top);
      if (m === n || gcd(m, n) !== 1) continue;
      const asks: SectionAsk[] =
        difficulty > 1 ? ['AP-AB', 'PB-AB', 'AP-PB', 'PA-AB'] : ['AP-AB', 'PB-AB', 'AP-PB'];
      return { m, n, ask: rng.pick(asks) };
    }
    return { m: 2, n: 3, ask: 'AP-AB' };
  },
  render: (params) => {
    const { m, n, ask } = params;
    const [left, right] =
      ask === 'AP-AB' ? ['AP', 'AB'] : ask === 'PB-AB' ? ['PB', 'AB'] : ask === 'AP-PB' ? ['AP', 'PB'] : ['PA', 'AB'];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$P$ lies on the line segment $AB$, with $AP : PB = ${m} : ${n}$. Find $\\lambda$.`,
        },
      ],
      lead: `\\overrightarrow{${left}} = \\lambda\\,\\overrightarrow{${right}} \\implies \\lambda =`,
      keypad: [{ insert: '/' }],
      answer: ratioAnswer(sectionFraction(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { m, n, ask } = params;
    const total = m + n;
    const right = ratioTex(sectionFraction(params));
    const steps = [
      {
        text: `$AP : PB = ${m} : ${n}$ cuts $AB$ into ${total} equal parts: ${m} between $A$ and $P$, and ${n} between $P$ and $B$.`,
      },
    ];
    if (ask === 'AP-AB') {
      steps.push({ text: `$\\overrightarrow{AP}$ is ${m} parts out of the whole ${total}, so $\\lambda = ${right}$.` });
    } else if (ask === 'PB-AB') {
      steps.push({ text: `$\\overrightarrow{PB}$ is the other ${n} parts out of ${total}, pointing the same way, so $\\lambda = ${right}$.` });
    } else if (ask === 'AP-PB') {
      steps.push({ text: `Here the comparison is part with part, not part with whole: ${m} parts against ${n}, so $\\lambda = ${right}$.` });
    } else {
      steps.push({
        text: `$\\overrightarrow{PA}$ is ${m} parts out of ${total}, but it points from $P$ back towards $A$, against $\\overrightarrow{AB}$. So $\\lambda = ${right}$.`,
      });
    }
    steps.push({
      text: ask === 'AP-PB'
        ? `$\\frac{${m}}{${total}}$ would compare $AP$ with the whole of $AB$, which was not asked.`
        : `$\\frac{${m}}{${n}}$ compares the two parts with each other. A fraction of $\\overrightarrow{AB}$ needs the whole, ${total}, underneath.`,
    });
    return steps;
  },
};

interface RatioSliderParams {
  ax: number;
  ay: number;
  u: number;
  v: number;
  m: number;
  n: number;
  part: 'x' | 'y';
}

const RATIO_SLIDER_PAIRS: Record<1 | 2, [number, number][]> = {
  1: [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1]],
  2: [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]],
};

/**
 * Where on a drawn line the dividing point falls.
 *
 * The point itself is not drawn: the learner works out a coordinate and drags
 * the marker there, and the line on the figure is what they check it against.
 */
const ratioSlider: Generator<RatioSliderParams> = {
  id: 'vec-ratio-slider',
  sample: (rng, difficulty) => {
    const pairs = RATIO_SLIDER_PAIRS[difficulty > 1 ? 2 : 1];
    const part = rng.pick(['x', 'y'] as const);
    for (let tries = 0; tries < 80; tries += 1) {
      const [m, n] = rng.pick(pairs);
      const u = nonZero(rng.int(-3, 3), 2);
      const v = nonZero(rng.int(-3, 3), -1);
      const ax = rng.int(-7, 7);
      const ay = rng.int(-7, 7);
      const bx = ax + (m + n) * u;
      const by = ay + (m + n) * v;
      const answer = part === 'x' ? ax + m * u : ay + m * v;
      // Inside the drawing, and never 0: the handle starts at 0, so an answer
      // of 0 would be marked right untouched.
      if (Math.abs(bx) > 7 || Math.abs(by) > 7 || answer === 0) continue;
      return { ax, ay, u, v, m, n, part };
    }
    return { ax: -5, ay: -4, u: 2, v: 3, m: 1, n: 2, part };
  },
  render: ({ ax, ay, u, v, m, n, part }): Slide => {
    const span = 9;
    const bx = ax + (m + n) * u;
    const by = ay + (m + n) * v;
    const where = m === n ? '$P$ is the midpoint of $AB$.' : `$P$ lies on $AB$ with $AP : PB = ${m} : ${n}$.`;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `$A$ is $${pointTex(ax, ay)}$ and $B$ is $${pointTex(bx, by)}$. ${where} Slide the line to $P$'s $${part}$-coordinate.`,
        },
      ],
      min: -8,
      max: 8,
      step: 1,
      answer: part === 'x' ? ax + m * u : ay + m * v,
      readout: `${part}\\text{-coordinate of } P = {v}`,
      figure: {
        svg: pointsSvg(
          [
            { x: ax, y: ay, name: 'A' },
            { x: bx, y: by, name: 'B' },
          ],
          { span, label: 'The line segment from A to B on squared paper' },
        ),
        xMin: -span,
        xMax: span,
        axis: part === 'x' ? 'x' : 'y',
      },
    };
  },
  solution: ({ ax, ay, u, v, m, n, part }) => {
    const total = m + n;
    return [
      {
        text: `$P$ is ${m} of ${total} equal parts along from $A$, so $\\overrightarrow{AP} = \\frac{${m}}{${total}}\\overrightarrow{AB}$.`,
      },
      { tex: `\\overrightarrow{AB} = ${columnTex(total * u, total * v)} \\implies \\overrightarrow{AP} = ${columnTex(m * u, m * v)}` },
      { tex: `P = ${pointTex(ax, ay)} + ${columnTex(m * u, m * v)} = ${pointTex(ax + m * u, ay + m * v)}` },
      {
        text: `So the $${part}$-coordinate is $${part === 'x' ? ax + m * u : ay + m * v}$. On the picture, the marker crosses the line ${m === n ? 'halfway along it' : `${m} parts of the way from $A$`}.`,
      },
    ];
  },
};

interface LineTestParams {
  points: boolean;
  yes: boolean;
  ax: number;
  ay: number;
  ux: number;
  uy: number;
  k: number;
  ex: number;
  ey: number;
}

/** The second vector (or point) of a line test, nudged off the line when `yes` is false. */
function lineTestSecond({ yes, ux, uy, k, ex, ey }: LineTestParams): [number, number] {
  return yes ? [k * ux, k * uy] : [k * ux + ex, k * uy + ey];
}

/**
 * Parallel vectors and collinear points, as one decision.
 *
 * The two questions share their test — is one vector a scalar multiple of the
 * other? — and differ in one extra condition, which is the thing a learner
 * forgets: two parallel vectors describe collinear points only when they
 * share a point. The tree makes that condition a fork of its own.
 */
const lineTest: Generator<LineTestParams> = {
  id: 'vec-line-test',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 5 : 4;
    const ks = difficulty > 1 ? [-2, -1, 2, 3] : [2, 3];
    for (let tries = 0; tries < 60; tries += 1) {
      const ux = nonZero(rng.int(-span, span), 2);
      const uy = nonZero(rng.int(-span, span), 3);
      const ex = rng.pick([-1, 0, 1]);
      const ey = ex === 0 ? rng.pick([-1, 1]) : rng.pick([-1, 0, 1]);
      const params: LineTestParams = {
        points: rng.chance(0.5),
        yes: rng.chance(0.5),
        ax: rng.int(-4, 4),
        ay: rng.int(-4, 4),
        ux,
        uy,
        k: rng.pick(ks),
        ex,
        ey,
      };
      const [vx, vy] = lineTestSecond(params);
      if (!params.yes && cross(ux, uy, vx, vy) === 0) continue;
      return params;
    }
    return { points: false, yes: true, ax: 0, ay: 0, ux: 2, uy: 3, k: 2, ex: 0, ey: 1 };
  },
  render: (params): Slide => {
    const { points, yes, ax, ay, ux, uy } = params;
    const [vx, vy] = lineTestSecond(params);
    const subject = points
      ? // Two rows: three coordinate pairs on one line overrun a phone.
        `\\begin{gathered} A${pointTex(ax, ay)} \\quad B${pointTex(ax + ux, ay + uy)} \\\\ C${pointTex(ax + vx, ay + vy)} \\end{gathered}`
      : `${columnTex(ux, uy)} \\text{ and } ${columnTex(vx, vy)}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: points
            ? 'Are these three points on one straight line? Work down the questions; each answer chooses what gets asked next.'
            : 'Are these two vectors parallel? Work down the questions; each answer chooses what gets asked next.',
        },
      ],
      subject,
      steps: [
        {
          id: 'what',
          ask: 'What is being compared?',
          branches: [
            { label: 'Two vectors', to: 'vectors' },
            { label: 'Three points', to: 'points' },
          ],
        },
        {
          id: 'vectors',
          ask: 'Is one vector a scalar multiple of the other?',
          branches: [
            { label: 'Yes', outcome: 'Parallel: one is a scalar multiple of the other.' },
            { label: 'No', outcome: 'Not parallel: no single scalar works for both components.' },
          ],
        },
        {
          id: 'points',
          ask: 'Find $\\overrightarrow{AB}$ and $\\overrightarrow{AC}$. Is one a scalar multiple of the other?',
          branches: [
            { label: 'Yes', to: 'share' },
            { label: 'No', outcome: 'Not collinear: the three points do not lie on one line.' },
          ],
        },
        {
          id: 'share',
          ask: 'Do those two vectors share a point?',
          branches: [
            { label: 'Yes', outcome: 'Collinear: parallel, and both pass through $A$.' },
            { label: 'No', outcome: 'Parallel lines, but not the same line.' },
          ],
        },
      ],
      answer: points
        ? ['Three points', yes ? 'Yes' : 'No', ...(yes ? ['Yes'] : [])]
        : ['Two vectors', yes ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const { points, yes, ux, uy, k } = params;
    const [vx, vy] = lineTestSecond(params);
    const first = points ? '\\overrightarrow{AB}' : '\\mathbf{u}';
    const second = points ? '\\overrightarrow{AC}' : '\\mathbf{v}';
    const steps = [
      {
        text: points
          ? 'Three points are collinear when the vectors from one of them to the other two are parallel. Both then start at $A$, so they lie along one line rather than two parallel ones.'
          : 'Two vectors are parallel when one is a scalar multiple of the other: the same multiple for both components.',
      },
      { tex: `${first} = ${columnTex(ux, uy)} \\qquad ${second} = ${columnTex(vx, vy)}` },
    ];
    if (yes) {
      steps.push(
        { tex: `${second} = ${k}${first}` },
        {
          text: points
            ? `The same multiple, $${k}$, works for both components, and both vectors start at $A$. So $A$, $B$ and $C$ are collinear.`
            : `The same multiple, $${k}$, works for both components, so the vectors are parallel${k < 0 ? ', pointing opposite ways' : ''}.`,
        },
      );
    } else {
      steps.push({
        text: `Across, the multiple would be $\\frac{${vx}}{${ux}}$; up, it would be $\\frac{${vy}}{${uy}}$. Those differ, so no single scalar works and ${points ? 'the points are not collinear' : 'the vectors are not parallel'}.`,
      });
    }
    return steps;
  },
};

interface CollinearKParams {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  t: number;
}

/** A missing coordinate that puts three points on one line. */
const collinearK: Generator<CollinearKParams> = {
  id: 'vec-collinear-k',
  choices: ({ ay, dy, t }) =>
    signedChoices(ay + t * dy, [
      // The multiple applied without starting from A.
      t * dy,
      // One step too many along the line.
      ay + (t + 1) * dy,
      // Moved the wrong way along it.
      ay - t * dy,
    ]),
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 6 : 4;
    return {
      ax: rng.int(-span, span),
      ay: rng.int(-span, span),
      dx: nonZero(rng.int(-3, 3), 2),
      dy: nonZero(rng.int(-3, 3), 1),
      t: rng.pick(difficulty > 1 ? [-2, -1, 2, 3, 4] : [2, 3, 4]),
    };
  },
  render: ({ ax, ay, dx, dy, t }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `$A${pointTex(ax, ay)}$, $B${pointTex(ax + dx, ay + dy)}$ and $C\\left(${ax + t * dx}, k\\right)$ lie on one straight line. Find $k$.`,
      },
    ],
    lead: 'k =',
    keypad: [],
    answer: `${ay + t * dy}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ ax, ay, dx, dy, t }) => {
    const cx = ax + t * dx;
    const k = ay + t * dy;
    return [
      {
        text: 'On one line means $\\overrightarrow{AC}$ is a multiple of $\\overrightarrow{AB}$. The across components say which multiple.',
      },
      { tex: `\\overrightarrow{AB} = ${columnTex(dx, dy)} \\qquad \\overrightarrow{AC} = \\begin{pmatrix} ${cx - ax} \\\\ k - ${ay < 0 ? `\\left(${ay}\\right)` : ay} \\end{pmatrix}` },
      { tex: `${cx - ax} = ${t} \\times ${dx < 0 ? `\\left(${dx}\\right)` : dx} \\implies \\overrightarrow{AC} = ${t}\\overrightarrow{AB}` },
      { text: `So the up component of $\\overrightarrow{AC}$ must be $${t}$ times $${dy}$ as well, which is $${t * dy}$.` },
      { tex: `k = ${ay} + ${t * dy < 0 ? `\\left(${t * dy}\\right)` : t * dy} = ${k}` },
    ];
  },
};

interface OnLineParams {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  t: number;
}

/** Which of four points lies on the line through two others. */
const onLine: Generator<OnLineParams> = {
  id: 'vec-on-line',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 5 : 4;
    for (let tries = 0; tries < 40; tries += 1) {
      const dx = nonZero(rng.int(-3, 3), 1);
      const dy = nonZero(rng.int(-3, 3), 2);
      // The swapped distractor would be on the line too if the steps matched.
      if (Math.abs(dx) === Math.abs(dy)) continue;
      return {
        ax: rng.int(-span, span),
        ay: rng.int(-span, span),
        dx,
        dy,
        t: rng.pick(difficulty > 1 ? [-2, -1, 2, 3] : [2, 3]),
      };
    }
    return { ax: 1, ay: 2, dx: 1, dy: 3, t: 2 };
  },
  render: ({ ax, ay, dx, dy, t }): Slide => {
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const candidates = [
      { id: 'on', x: cx, y: cy },
      { id: 'nudged-up', x: cx, y: cy + 1 },
      { id: 'nudged-across', x: cx - 1, y: cy },
      // The steps taken the wrong way round: across by the up step.
      { id: 'swapped', x: ax + t * dy, y: ay + t * dx },
    ].filter((c) => c.id === 'on' || cross(dx, dy, c.x - ax, c.y - ay) !== 0);
    const offered = distinctOptions(
      candidates.map((c) => ({ id: c.id, label: pointTex(c.x, c.y), tex: true })),
    );
    const turn = (Math.abs(ax) + Math.abs(ay) + Math.abs(t)) % offered.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which point lies on the straight line through $A${pointTex(ax, ay)}$ and $B${pointTex(ax + dx, ay + dy)}$?`,
        },
      ],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'on',
    };
  },
  solution: ({ ax, ay, dx, dy, t }) => {
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    return [
      {
        text: 'A point $C$ is on the line through $A$ and $B$ exactly when $\\overrightarrow{AC}$ is a multiple of $\\overrightarrow{AB}$.',
      },
      { tex: `\\overrightarrow{AB} = ${columnTex(dx, dy)}` },
      { tex: `C${pointTex(cx, cy)}: \\quad \\overrightarrow{AC} = ${columnTex(t * dx, t * dy)} = ${t}\\overrightarrow{AB}` },
      {
        text: `The same multiple, $${t}$, works across and up. For each of the other points, the multiple needed across is not the one needed up, so they sit just off the line.`,
      },
    ];
  },
};

const CORNERS = ['A', 'B', 'C', 'D'];

interface FourthVertexParams {
  ax: number;
  ay: number;
  ux: number;
  uy: number;
  wx: number;
  wy: number;
  missing: number;
}

/** A parallelogram's corners in order: A, A + u, A + u + w, A + w. */
function corners({ ax, ay, ux, uy, wx, wy }: FourthVertexParams): [number, number][] {
  return [
    [ax, ay],
    [ax + ux, ay + uy],
    [ax + ux + wx, ay + uy + wy],
    [ax + wx, ay + wy],
  ];
}

function sampleParallelogram(
  rng: Parameters<Generator['sample']>[0],
  difficulty: number,
): FourthVertexParams {
  for (let tries = 0; tries < 60; tries += 1) {
    const ux = rng.int(-5, 5);
    const uy = rng.int(-5, 5);
    const wx = rng.int(-5, 5);
    const wy = rng.int(-5, 5);
    // A flat "parallelogram" is a line, and has no fourth corner to find.
    if (cross(ux, uy, wx, wy) === 0) continue;
    return {
      ax: rng.int(-4, 4),
      ay: rng.int(-4, 4),
      ux,
      uy,
      wx,
      wy,
      missing: difficulty > 1 ? rng.int(0, 3) : 3,
    };
  }
  return { ax: 0, ay: 0, ux: 4, uy: 1, wx: 1, wy: 3, missing: 3 };
}

/**
 * The fourth corner of a parallelogram.
 *
 * Opposite sides of a parallelogram are the same vector, so the missing
 * corner is its neighbour plus the side that runs parallel to it. The slip is
 * pairing the wrong corners, which produces a parallelogram — just not the
 * one called ABCD.
 */
const fourthVertex: Generator<FourthVertexParams> = {
  id: 'vec-fourth-vertex',
  choices: (params) => {
    const v = corners(params);
    const i = params.missing;
    const prev = v[(i + 3) % 4];
    const next = v[(i + 1) % 4];
    const opp = v[(i + 2) % 4];
    return pointOptions(
      v[i],
      [next[0] + opp[0] - prev[0], next[1] + opp[1] - prev[1]],
      [prev[0] + opp[0] - next[0], prev[1] + opp[1] - next[1]],
      [v[i][1], v[i][0]],
    );
  },
  sample: sampleParallelogram,
  render: (params) => {
    const v = corners(params);
    const i = params.missing;
    const known = [1, 2, 3].map((step) => (i + step) % 4).sort((p, q) => p - q);
    const listed = known.map((j) => `$${CORNERS[j]}${pointTex(v[j][0], v[j][1])}$`);
    const prev = v[(i + 3) % 4];
    const next = v[(i + 1) % 4];
    const opp = v[(i + 2) % 4];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$ABCD$ is a parallelogram, lettered in order round the shape, with ${listed[0]}, ${listed[1]} and ${listed[2]}. Find the coordinates of $${CORNERS[i]}$.`,
        },
      ],
      template: pointTemplate(CORNERS[i]),
      bank: bankOf(
        [`${v[i][0]}`, `${v[i][1]}`],
        [
          `${next[0] + opp[0] - prev[0]}`,
          `${next[1] + opp[1] - prev[1]}`,
          `${prev[0] + opp[0] - next[0]}`,
          `${prev[1] + opp[1] - next[1]}`,
        ],
      ),
      answer: [`${v[i][0]}`, `${v[i][1]}`],
    };
  },
  solution: (params) => {
    const v = corners(params);
    const i = params.missing;
    const X = CORNERS[i];
    const P = CORNERS[(i + 3) % 4];
    const N = CORNERS[(i + 1) % 4];
    const O = CORNERS[(i + 2) % 4];
    const prev = v[(i + 3) % 4];
    const opp = v[(i + 2) % 4];
    const side = [opp[0] - v[(i + 1) % 4][0], opp[1] - v[(i + 1) % 4][1]];
    return [
      {
        text: `Opposite sides of a parallelogram are equal and parallel, so they are the same vector. Going round in order, $${P}${X}$ is opposite $${N}${O}$, so $\\overrightarrow{${P}${X}} = \\overrightarrow{${N}${O}}$.`,
      },
      { tex: `\\overrightarrow{${N}${O}} = ${columnTex(opp[0], opp[1])} - ${columnTex(v[(i + 1) % 4][0], v[(i + 1) % 4][1])} = ${columnTex(side[0], side[1])}` },
      { tex: `${X} = ${pointTex(prev[0], prev[1])} + ${columnTex(side[0], side[1])} = ${pointTex(v[i][0], v[i][1])}` },
      {
        text: 'Lettered in order matters: pairing the wrong two sides gives a corner of a different parallelogram, one whose letters do not go round in order.',
      },
    ];
  },
};

/** The fourth corner again, with AB and D's coordinates as separate strands. */
const fourthVertexTree: Generator<FourthVertexParams> = {
  id: 'vec-fourth-vertex-tree',
  sample: (rng) => sampleParallelogram(rng, 1),
  render: (params): Slide => {
    const [a, b, c, d] = corners(params);
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const answer = [`${ux}`, `${uy}`, `${d[0]}`, `${d[1]}`, pointTex(d[0], d[1])];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `$ABCD$ is a parallelogram with $A${pointTex(a[0], a[1])}$, $B${pointTex(b[0], b[1])}$ and $C${pointTex(c[0], c[1])}$. Fill the tree: the two components of $\\overrightarrow{AB}$, then $D$'s coordinates, then the point $D$.`,
        },
      ],
      expression: '\\overrightarrow{DC} = \\overrightarrow{AB} \\implies D = C - \\overrightarrow{AB}',
      nodes: [
        { id: 'ux', from: [] },
        { id: 'uy', from: [] },
        { id: 'dx', from: ['ux'] },
        { id: 'dy', from: ['uy'] },
        { id: 'd', from: ['dx', 'dy'] },
      ],
      bank: geometryTreeBank(
        answer,
        [`${-ux}`, `${-uy}`, `${c[0] + ux}`, `${c[1] + uy}`, pointTex(c[0] + ux, c[1] + uy)],
        [`${d[0] + 1}`, `${d[1] - 1}`, pointTex(d[1], d[0])],
      ),
      answer,
    };
  },
  solution: (params) => {
    const [a, b, c, d] = corners(params);
    return [
      { text: '$DC$ is the side opposite $AB$, so it is the same vector: $\\overrightarrow{DC} = \\overrightarrow{AB}$.' },
      { tex: `\\overrightarrow{AB} = ${columnTex(b[0], b[1])} - ${columnTex(a[0], a[1])} = ${columnTex(b[0] - a[0], b[1] - a[1])}` },
      { text: '$\\overrightarrow{DC}$ ends at $C$, so $D$ is where you start from to make that journey and arrive at $C$: subtract it from $C$.' },
      { tex: `D = ${pointTex(c[0], c[1])} - ${columnTex(b[0] - a[0], b[1] - a[1])} = ${pointTex(d[0], d[1])}` },
      {
        text: `Adding it instead walks on past $C$, to $${pointTex(c[0] + b[0] - a[0], c[1] + b[1] - a[1])}$.`,
      },
    ];
  },
};

type QuadShape = 'parallelogram' | 'trapezium' | 'neither';

interface QuadParams {
  ax: number;
  ay: number;
  ux: number;
  uy: number;
  wx: number;
  wy: number;
  shape: QuadShape;
  k: number;
  ex: number;
  ey: number;
}

/** A, B, C, D for a quadrilateral question. */
function quadCorners({ ax, ay, ux, uy, wx, wy, shape, k, ex, ey }: QuadParams): [number, number][] {
  const dx = ax + wx;
  const dy = ay + wy;
  const [sx, sy] =
    shape === 'parallelogram' ? [ux, uy] : shape === 'trapezium' ? [k * ux, k * uy] : [ux + ex, uy + ey];
  return [
    [ax, ay],
    [ax + ux, ay + uy],
    [dx + sx, dy + sy],
    [dx, dy],
  ];
}

/**
 * Is ABCD a parallelogram? The vector proof, as a decision.
 *
 * One pair of opposite sides equal as vectors is the whole proof — equal
 * vectors are parallel *and* the same length. Parallel alone is a trapezium,
 * which is the case that shows why "equal" and not merely "parallel" is the
 * test.
 */
const quadFlow: Generator<QuadParams> = {
  id: 'vec-quad-flow',
  sample: (rng) => {
    for (let tries = 0; tries < 80; tries += 1) {
      const params: QuadParams = {
        ax: rng.int(-4, 4),
        ay: rng.int(-4, 4),
        ux: rng.int(1, 4),
        uy: rng.int(-2, 2),
        wx: rng.int(-2, 2),
        wy: rng.int(2, 4),
        shape: rng.pick(['parallelogram', 'trapezium', 'neither'] as const),
        k: rng.pick([2, 3]),
        ex: rng.pick([-1, 0, 1]),
        ey: rng.pick([-1, 1]),
      };
      const [a, b, c, d] = quadCorners(params);
      const ab = [b[0] - a[0], b[1] - a[1]];
      const dc = [c[0] - d[0], c[1] - d[1]];
      const ad = [d[0] - a[0], d[1] - a[1]];
      const bc = [c[0] - b[0], c[1] - b[1]];
      if (cross(ab[0], ab[1], ad[0], ad[1]) === 0) continue;
      // "Neither" must be genuinely neither: AB not parallel to DC, and not a
      // trapezium the other way round either, or its outcome would mislead.
      if (params.shape === 'neither') {
        if (cross(ab[0], ab[1], dc[0], dc[1]) === 0) continue;
        if (cross(ad[0], ad[1], bc[0], bc[1]) === 0) continue;
      }
      return params;
    }
    return { ax: 0, ay: 0, ux: 3, uy: 1, wx: 1, wy: 3, shape: 'parallelogram', k: 2, ex: 0, ey: 1 };
  },
  render: (params): Slide => {
    const [a, b, c, d] = quadCorners(params);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Is $ABCD$ a parallelogram? Work down the questions; each answer chooses what gets asked next.',
        },
      ],
      subject: `\\begin{matrix} A${pointTex(a[0], a[1])} & B${pointTex(b[0], b[1])} \\\\ C${pointTex(c[0], c[1])} & D${pointTex(d[0], d[1])} \\end{matrix}`,
      steps: [
        {
          id: 'equal',
          ask: 'Find $\\overrightarrow{AB}$ and $\\overrightarrow{DC}$. Are they equal?',
          branches: [
            { label: 'Yes', outcome: 'A parallelogram: one pair of opposite sides is equal and parallel.' },
            { label: 'No', to: 'parallel' },
          ],
        },
        {
          id: 'parallel',
          ask: 'Is one of them a scalar multiple of the other?',
          branches: [
            { label: 'Yes', outcome: 'A trapezium: $AB$ and $DC$ are parallel but different lengths.' },
            { label: 'No', outcome: 'Not a parallelogram: $AB$ and $DC$ are not even parallel.' },
          ],
        },
      ],
      answer:
        params.shape === 'parallelogram' ? ['Yes'] : params.shape === 'trapezium' ? ['No', 'Yes'] : ['No', 'No'],
    };
  },
  solution: (params) => {
    const [a, b, c, d] = quadCorners(params);
    const ab: [number, number] = [b[0] - a[0], b[1] - a[1]];
    const dc: [number, number] = [c[0] - d[0], c[1] - d[1]];
    const steps = [
      {
        text: 'Opposite sides of a parallelogram are the same vector. So compare $\\overrightarrow{AB}$ with $\\overrightarrow{DC}$, both written in the direction of going round the shape from $A$.',
      },
      { tex: `\\overrightarrow{AB} = ${columnTex(ab[0], ab[1])} \\qquad \\overrightarrow{DC} = ${columnTex(dc[0], dc[1])}` },
    ];
    if (params.shape === 'parallelogram') {
      steps.push({
        text: 'They are equal, so $AB$ and $DC$ are parallel and the same length. That one pair is enough: $ABCD$ is a parallelogram.',
      });
    } else if (params.shape === 'trapezium') {
      steps.push({
        text: `$\\overrightarrow{DC} = ${params.k}\\overrightarrow{AB}$: parallel, but ${params.k} times as long. So $ABCD$ is a trapezium, not a parallelogram.`,
      });
    } else {
      steps.push({
        text: 'No single scalar takes one to the other, so $AB$ and $DC$ are not parallel and $ABCD$ cannot be a parallelogram.',
      });
    }
    return steps;
  },
};

/* ---------- vector paths: a and b with no numbers ---------- */

type PathCase = 'AB' | 'BA' | 'OM' | 'AM' | 'MB' | 'OC' | 'OP' | 'AP' | 'PB' | 'OD';

interface PathParams {
  kind: PathCase;
  m: number;
  n: number;
  name: string;
}

const PATH_NAMES: Record<PathCase, string[]> = {
  AB: ['B'],
  BA: ['A'],
  OM: ['M', 'N', 'X'],
  AM: ['M', 'N', 'X'],
  MB: ['M', 'N', 'X'],
  OC: ['C', 'D', 'E'],
  OP: ['P', 'Q', 'R'],
  AP: ['P', 'Q', 'R'],
  PB: ['P', 'Q', 'R'],
  OD: ['D', 'E', 'F'],
};

function samplePath(rng: Parameters<Generator['sample']>[0], difficulty: number): PathParams {
  const kinds: PathCase[] =
    difficulty > 1
      ? ['AB', 'BA', 'OM', 'AM', 'OC', 'OP', 'AP', 'PB', 'OD']
      : ['AB', 'BA', 'OM', 'AM', 'MB', 'OC', 'OP', 'AP'];
  const kind = rng.pick(kinds);
  const [m, n] = rng.pick(SECTION_PAIRS[difficulty > 1 ? 2 : 1]);
  return { kind, m, n, name: rng.pick(PATH_NAMES[kind]) };
}

/** The vector each case asks for, as coefficients of a and b. */
function pathCoefficients({ kind, m, n }: PathParams): [Ratio, Ratio] {
  const whole = m + n;
  switch (kind) {
    case 'AB':
      return [ratio(-1, 1), ratio(1, 1)];
    case 'BA':
      return [ratio(1, 1), ratio(-1, 1)];
    case 'OM':
      return [ratio(1, 2), ratio(1, 2)];
    case 'AM':
    case 'MB':
      return [ratio(-1, 2), ratio(1, 2)];
    case 'OC':
      return [ratio(1, 1), ratio(1, 1)];
    case 'OP':
      return [ratio(n, whole), ratio(m, whole)];
    case 'AP':
      return [ratio(-m, whole), ratio(m, whole)];
    case 'PB':
      return [ratio(-n, whole), ratio(n, whole)];
    case 'OD':
      return [ratio(-1, 1), ratio(2, 1)];
  }
}

/** The vector asked for, e.g. `\overrightarrow{OM}`. */
function pathTarget({ kind, name }: PathParams): string {
  const [from, to] =
    kind === 'AB' ? ['A', 'B']
    : kind === 'BA' ? ['B', 'A']
    : kind === 'MB' || kind === 'PB' ? [name, 'B']
    : kind === 'AM' || kind === 'AP' ? ['A', name]
    : ['O', name];
  return `\\overrightarrow{${from}${to}}`;
}

/** What the question says about the extra point. */
function pathSetup({ kind, m, n, name }: PathParams): string {
  const base = '$\\overrightarrow{OA} = \\mathbf{a}$ and $\\overrightarrow{OB} = \\mathbf{b}$.';
  switch (kind) {
    case 'AB':
    case 'BA':
      return base;
    case 'OM':
    case 'AM':
    case 'MB':
      return `${base} $${name}$ is the midpoint of $AB$.`;
    case 'OC':
      return `${base} $OA${name}B$ is a parallelogram.`;
    case 'OP':
    case 'AP':
    case 'PB':
      return `${base} $${name}$ lies on $AB$ with $A${name} : ${name}B = ${m} : ${n}$.`;
    case 'OD':
      return `${base} $B$ is the midpoint of $A${name}$.`;
  }
}

/**
 * The triangle OAB with the question's extra point, so the route can be
 * traced with a finger. Fixed proportions rather than the question's numbers,
 * because there are none: the picture is a sketch, as it would be on paper.
 */
function pathSvg(params: PathParams): string {
  const O = { x: 20, y: 150 };
  const A = { x: 220, y: 150 };
  const B = { x: 90, y: 40 };
  const [lambda, mu] = pathCoefficients(params);
  const l = lambda.n / lambda.d;
  const u = mu.n / mu.d;
  const extra = !(params.kind === 'AB' || params.kind === 'BA');
  const X = { x: O.x + l * (A.x - O.x) + u * (B.x - O.x), y: O.y + l * (A.y - O.y) + u * (B.y - O.y) };
  const xs = [O.x, A.x, B.x, ...(extra ? [X.x] : [])];
  const ys = [O.y, A.y, B.y, ...(extra ? [X.y] : [])];
  const pad = 22;
  const left = Math.min(...xs) - pad;
  const top = Math.min(...ys) - pad;
  const width = Math.max(...xs) - left + pad;
  const height = Math.max(...ys) - top + pad;
  const f = (v: number) => v.toFixed(1);
  const line = (p: { x: number; y: number }, q: { x: number; y: number }, extraAttrs = '') =>
    `<line x1="${f(p.x)}" y1="${f(p.y)}" x2="${f(q.x)}" y2="${f(q.y)}" stroke="currentColor" ${extraAttrs} />`;
  const arrow = (p: { x: number; y: number }, q: { x: number; y: number }) => {
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    return [
      line(p, q, 'stroke-width="2" class="plot-accent"'),
      ...[0.45, -0.45].map(
        (turn) =>
          `<line x1="${f(mid.x + 5 * Math.cos(angle))}" y1="${f(mid.y + 5 * Math.sin(angle))}" x2="${f(mid.x + 5 * Math.cos(angle) - 9 * Math.cos(angle + turn))}" y2="${f(mid.y + 5 * Math.sin(angle) - 9 * Math.sin(angle + turn))}" stroke="currentColor" stroke-width="2" class="plot-accent" stroke-linecap="round" />`,
      ),
    ].join('');
  };
  const dot = (p: { x: number; y: number }) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="3" fill="currentColor" />`;
  const label = (p: { x: number; y: number }, text: string, dx: number, dy: number, bold = false) =>
    `<text x="${f(p.x + dx)}" y="${f(p.y + dy)}" font-size="14" ${bold ? 'font-weight="bold"' : 'font-style="italic"'} text-anchor="middle" fill="currentColor">${text}</text>`;

  const parts = [
    `<svg viewBox="${f(left)} ${f(top)} ${f(width)} ${f(height)}" width="100%" style="max-width:280px" role="img" aria-label="Triangle OAB with the point the question describes">`,
    arrow(O, A),
    arrow(O, B),
    line(A, B, 'stroke-width="1.2" opacity="0.7"'),
  ];
  if (params.kind === 'OC') {
    parts.push(line(A, X, 'stroke-width="1.2" stroke-dasharray="4 4" opacity="0.7"'));
    parts.push(line(B, X, 'stroke-width="1.2" stroke-dasharray="4 4" opacity="0.7"'));
  }
  if (params.kind === 'OD') {
    parts.push(line(B, X, 'stroke-width="1.2" stroke-dasharray="4 4" opacity="0.7"'));
  }
  parts.push(
    dot(O),
    dot(A),
    dot(B),
    label(O, 'O', -10, 16),
    label(A, 'A', 10, 16),
    label(B, 'B', -8, -8),
    label({ x: (O.x + A.x) / 2, y: O.y }, 'a', 0, 18, true),
    label({ x: (O.x + B.x) / 2, y: (O.y + B.y) / 2 }, 'b', -12, 0, true),
  );
  if (extra) {
    parts.push(dot(X), label(X, params.name, 12, -6));
  }
  parts.push('</svg>');
  return parts.join('');
}

/** `a` and `b` for the answer box, with the brackets and fractions a combination needs. */
const PATH_KEYS: KeypadKey[] = [
  { insert: 'a', tex: true },
  { insert: 'b', tex: true },
  { insert: '(' },
  { insert: ')' },
  { insert: '/' },
];

/** Worked steps for a path case, shared by every path generator. */
function pathSolution(params: PathParams) {
  const { kind, m, n, name } = params;
  const [lambda, mu] = pathCoefficients(params);
  const target = pathTarget(params);
  const result = combinationTex(lambda, mu);
  const whole = m + n;
  const route: Record<PathCase, { text: string; tex: string }> = {
    AB: {
      text: 'Go from $A$ back to $O$, then out to $B$.',
      tex: `\\overrightarrow{AB} = \\overrightarrow{AO} + \\overrightarrow{OB} = -\\mathbf{a} + \\mathbf{b}`,
    },
    BA: {
      text: 'Go from $B$ back to $O$, then out to $A$.',
      tex: `\\overrightarrow{BA} = \\overrightarrow{BO} + \\overrightarrow{OA} = -\\mathbf{b} + \\mathbf{a}`,
    },
    OM: {
      text: `Go out to $A$, then half of the way along $AB$ to $${name}$.`,
      tex: `\\overrightarrow{O${name}} = \\mathbf{a} + \\tfrac{1}{2}\\left(\\mathbf{b} - \\mathbf{a}\\right)`,
    },
    AM: {
      text: `$${name}$ is halfway from $A$ to $B$, so take half of $\\overrightarrow{AB}$.`,
      tex: `\\overrightarrow{A${name}} = \\tfrac{1}{2}\\overrightarrow{AB} = \\tfrac{1}{2}\\left(\\mathbf{b} - \\mathbf{a}\\right)`,
    },
    MB: {
      text: `$${name}$ is halfway, so the second half of the line is also half of $\\overrightarrow{AB}$, pointing the same way.`,
      tex: `\\overrightarrow{${name}B} = \\tfrac{1}{2}\\overrightarrow{AB} = \\tfrac{1}{2}\\left(\\mathbf{b} - \\mathbf{a}\\right)`,
    },
    OC: {
      text: `In the parallelogram $OA${name}B$, $A${name}$ is opposite $OB$, so it is the vector $\\mathbf{b}$. Go out to $A$, then along $\\mathbf{b}$.`,
      tex: `\\overrightarrow{O${name}} = \\overrightarrow{OA} + \\overrightarrow{A${name}} = \\mathbf{a} + \\mathbf{b}`,
    },
    OP: {
      text: `$${name}$ is ${m} of ${whole} equal parts along from $A$, so go out to $A$ and then $\\frac{${m}}{${whole}}$ of the way along $AB$.`,
      tex: `\\overrightarrow{O${name}} = \\mathbf{a} + \\frac{${m}}{${whole}}\\left(\\mathbf{b} - \\mathbf{a}\\right)`,
    },
    AP: {
      text: `$${name}$ is ${m} of ${whole} equal parts along from $A$.`,
      tex: `\\overrightarrow{A${name}} = \\frac{${m}}{${whole}}\\overrightarrow{AB} = \\frac{${m}}{${whole}}\\left(\\mathbf{b} - \\mathbf{a}\\right)`,
    },
    PB: {
      text: `From $${name}$ there are ${n} of the ${whole} parts left to go to $B$, in the direction of $\\overrightarrow{AB}$.`,
      tex: `\\overrightarrow{${name}B} = \\frac{${n}}{${whole}}\\overrightarrow{AB} = \\frac{${n}}{${whole}}\\left(\\mathbf{b} - \\mathbf{a}\\right)`,
    },
    OD: {
      text: `$B$ is halfway to $${name}$, so the journey from $A$ to $${name}$ is twice $\\overrightarrow{AB}$. Go out to $A$, then twice along $AB$.`,
      tex: `\\overrightarrow{O${name}} = \\mathbf{a} + 2\\left(\\mathbf{b} - \\mathbf{a}\\right)`,
    },
  };
  return [
    {
      text: 'Find a route made of journeys you already know as $\\mathbf{a}$ and $\\mathbf{b}$. Going along a vector backwards is its negative.',
    },
    { text: route[kind].text },
    { tex: route[kind].tex },
    { tex: `${target} = ${result}` },
    {
      text:
        kind === 'OC'
          ? '$\\mathbf{a} + \\mathbf{b}$ is the diagonal of the parallelogram, which is the picture behind adding two vectors.'
          : kind === 'OM' || kind === 'OP' || kind === 'OD'
            ? `Check: the two coefficients add up to 1. Every point on the line through $A$ and $B$ does, just as $\\mathbf{a}$ is $1\\mathbf{a} + 0\\mathbf{b}$.`
            : 'Check: the two coefficients add up to 0. Any vector running along $AB$ does, because it is a multiple of $\\mathbf{b} - \\mathbf{a}$.',
    },
  ];
}

/**
 * The same vector written as its route, before tidying: the form the lesson
 * says is accepted, and the one a learner who stops a step early has typed.
 */
function pathRouteAnswer({ kind, m, n }: PathParams): string {
  const whole = m + n;
  switch (kind) {
    case 'AB':
      return 'b - a';
    case 'BA':
      return 'a - b';
    case 'OM':
      return '(a + b)/2';
    case 'AM':
    case 'MB':
      return '(b - a)/2';
    case 'OC':
      return 'b + a';
    case 'OP':
      return `a + (${m}/${whole})*(b - a)`;
    case 'AP':
      return `(${m}/${whole})*(b - a)`;
    case 'PB':
      return `(${n}/${whole})*(b - a)`;
    case 'OD':
      return 'a + 2*(b - a)';
  }
}

/** Other combinations a slip produces, none equal to the answer. */
function pathSlips([lambda, mu]: [Ratio, Ratio]): [Ratio, Ratio][] {
  const negate = (r: Ratio) => ratio(-r.n, r.d);
  const out: [Ratio, Ratio][] = [];
  for (const candidate of [
    [mu, lambda],
    [negate(lambda), negate(mu)],
    [negate(lambda), mu],
    [lambda, negate(mu)],
  ] as [Ratio, Ratio][]) {
    if (sameRatio(candidate[0], lambda) && sameRatio(candidate[1], mu)) continue;
    if (out.some(([p, q]) => sameRatio(p, candidate[0]) && sameRatio(q, candidate[1]))) continue;
    out.push(candidate);
  }
  return out.slice(0, 3);
}

/**
 * A vector in a shape, written in terms of a and b.
 *
 * The level's other questions have numbers to check against. This one has
 * none, which is the point: a route through the shape is the proof, and it is
 * the form every exam question on vector geometry takes.
 */
const path: Generator<PathParams> = {
  id: 'vec-path',
  choices: (params) => {
    const right = pathCoefficients(params);
    return options(
      { tex: combinationTex(...right), answer: combinationAnswer(...right) },
      ...pathSlips(right).map((slip) => ({ tex: combinationTex(...slip), answer: combinationAnswer(...slip) })),
    );
  },
  sample: samplePath,
  render: (params) => ({
    kind: 'expression',
    prompt: [
      { kind: 'diagram', svg: pathSvg(params) },
      { kind: 'prose', text: `${pathSetup(params)} Find $${pathTarget(params)}$ in terms of $\\mathbf{a}$ and $\\mathbf{b}$.` },
    ],
    lead: `${pathTarget(params)} =`,
    keypad: PATH_KEYS,
    answer: combinationAnswer(...pathCoefficients(params)),
    alsoAccepts: [pathRouteAnswer(params)],
    domain: 'real',
    mode: 'exact',
  }),
  solution: pathSolution,
};

/** The same vector, with its two coefficients placed as tiles. */
const pathCoefficientsGen: Generator<PathParams> = {
  id: 'vec-path-coefficients',
  sample: samplePath,
  render: (params) => {
    const [lambda, mu] = pathCoefficients(params);
    const negate = (r: Ratio) => ratio(-r.n, r.d);
    const { m, n } = params;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'diagram', svg: pathSvg(params) },
        {
          kind: 'prose',
          text: `${pathSetup(params)} Write $${pathTarget(params)}$ as $\\lambda\\mathbf{a} + \\mu\\mathbf{b}$ by placing the two numbers.`,
        },
      ],
      template: '\\lambda: \\; {0} \\qquad \\mu: \\; {1}',
      bank: ratioBank(
        [lambda, mu],
        [negate(lambda), negate(mu), ratio(m, n), ratio(n, m + n), ratio(m, m + n)],
      ),
      answer: [ratioTex(lambda), ratioTex(mu)],
    };
  },
  solution: pathSolution,
};

interface PathTreeParams {
  m: number;
  n: number;
  name: string;
  fromB: boolean;
}

const PATH_TREE_PAIRS: Record<1 | 2, [number, number][]> = {
  1: [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1]],
  2: [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [4, 1]],
};

/**
 * The route to a point on AB, one leg at a time: the whole line, the part of
 * it that is needed, then the journey from O. From either end — starting at B
 * is just as valid, and meeting the same answer by the other route is what
 * makes the answer believable.
 */
const pathTree: Generator<PathTreeParams> = {
  id: 'vec-path-tree',
  sample: (rng, difficulty) => {
    const [m, n] = rng.pick(PATH_TREE_PAIRS[difficulty > 1 ? 2 : 1]);
    return {
      m,
      n,
      name: rng.pick(m === n ? ['M', 'N', 'X'] : ['P', 'Q', 'R']),
      fromB: rng.chance(0.5),
    };
  },
  render: ({ m, n, name, fromB }): Slide => {
    const whole = m + n;
    const along = fromB ? '\\mathbf{a} - \\mathbf{b}' : '\\mathbf{b} - \\mathbf{a}';
    const back = fromB ? '\\mathbf{b} - \\mathbf{a}' : '\\mathbf{a} - \\mathbf{b}';
    const share = ratioTex(ratio(fromB ? n : m, whole));
    const otherShare = ratioTex(ratio(fromB ? m : n, whole));
    const result = combinationTex(ratio(n, whole), ratio(m, whole));
    const swapped = combinationTex(ratio(m, whole), ratio(n, whole));
    const [start, end] = fromB ? ['B', 'A'] : ['A', 'B'];
    const where = m === n ? `$${name}$ is the midpoint of $AB$` : `$${name}$ lies on $AB$ with $A${name} : ${name}B = ${m} : ${n}$`;
    const answer = [along, `${share}\\left(${along}\\right)`, result];
    return {
      kind: 'tree',
      prompt: [
        { kind: 'diagram', svg: pathSvg({ kind: 'OP', m, n, name }) },
        {
          kind: 'prose',
          text: `$\\overrightarrow{OA} = \\mathbf{a}$, $\\overrightarrow{OB} = \\mathbf{b}$, and ${where}. Fill the tree: $\\overrightarrow{${start}${end}}$, then $\\overrightarrow{${start}${name}}$, then $\\overrightarrow{O${name}}$.`,
        },
      ],
      expression: `\\overrightarrow{O${name}} = \\overrightarrow{O${start}} + \\overrightarrow{${start}${name}}`,
      nodes: [
        { id: 'line', from: [] },
        { id: 'part', from: ['line'] },
        { id: 'whole', from: ['part'] },
      ],
      bank: geometryTreeBank(
        answer,
        [back, `${otherShare}\\left(${along}\\right)`, swapped, '\\mathbf{a} + \\mathbf{b}'],
        [`${share}\\left(${back}\\right)`, '\\tfrac{1}{2}\\mathbf{a} - \\mathbf{b}'],
      ),
      answer,
    };
  },
  solution: ({ m, n, name, fromB }) => {
    const whole = m + n;
    const [start, end] = fromB ? ['B', 'A'] : ['A', 'B'];
    const along = fromB ? '\\mathbf{a} - \\mathbf{b}' : '\\mathbf{b} - \\mathbf{a}';
    const share = ratioTex(ratio(fromB ? n : m, whole));
    const startVec = fromB ? '\\mathbf{b}' : '\\mathbf{a}';
    return [
      { text: `The line from $${start}$ to $${end}$ is destination minus start.` },
      { tex: `\\overrightarrow{${start}${end}} = ${along}` },
      {
        text: `$${name}$ is ${fromB ? n : m} of the ${whole} equal parts along from $${start}$, so take $${share}$ of that.`,
      },
      { tex: `\\overrightarrow{${start}${name}} = ${share}\\left(${along}\\right)` },
      { text: `Then start from $O$: out to $${start}$, and along.` },
      {
        tex: `\\overrightarrow{O${name}} = ${startVec} + ${share}\\left(${along}\\right) = ${combinationTex(ratio(n, whole), ratio(m, whole))}`,
      },
    ];
  },
};

interface PathParallelParams {
  r: number;
  s: number;
  k: number;
  j: number;
  phrase: number;
}

/**
 * Spotting a parallel vector written in a and b.
 *
 * The level 1 test — one is a scalar multiple of the other — with symbols in
 * place of components. It is the step every "prove these lines are parallel"
 * question ends on.
 */
const pathParallel: Generator<PathParallelParams> = {
  id: 'vec-path-parallel',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 60; tries += 1) {
      const r = nonZero(rng.int(difficulty > 1 ? -4 : 1, 4), 1);
      const s = nonZero(rng.int(-4, 4), 2);
      // Coprime, so the correct option is the simplest multiple; and not both
      // of size one, where swapping the coefficients would stay parallel.
      if (gcd(r, s) !== 1 || (Math.abs(r) === 1 && Math.abs(s) === 1)) continue;
      const k = rng.pick(difficulty > 1 ? [-3, -2, 2, 3, 4] : [2, 3, 4]);
      const j = rng.pick([1, -1, 2].filter((x) => x !== k));
      return { r, s, k, j, phrase: rng.int(0, 2) };
    }
    return { r: 1, s: 2, k: 3, j: 1, phrase: 0 };
  },
  render: ({ r, s, k, j, phrase }): Slide => {
    const tex = (x: number, y: number) => combinationTex(ratio(x, 1), ratio(y, 1));
    const given = tex(k * r, k * s);
    const candidates = [
      { id: 'parallel', x: j * r, y: j * s },
      { id: 'swapped', x: j * s, y: j * r },
      { id: 'sign', x: j * r, y: -j * s },
      { id: 'one-scaled', x: j * r, y: k * s },
    ].filter((c) => c.id === 'parallel' || cross(r, s, c.x, c.y) !== 0);
    const offered = distinctOptions(candidates.map((c) => ({ id: c.id, label: tex(c.x, c.y), tex: true })));
    const question = [
      `Which of these is parallel to $${given}$?`,
      `$\\overrightarrow{PQ} = ${given}$. $RS$ is parallel to $PQ$. Which of these could $\\overrightarrow{RS}$ be?`,
      `Which of these vectors points along the same line as $${given}$, in either direction?`,
    ][phrase];
    const turn = (Math.abs(r) + Math.abs(s) + Math.abs(k) + phrase) % offered.length;
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: question }],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'parallel',
    };
  },
  solution: ({ r, s, k, j }) => {
    const tex = (x: number, y: number) => combinationTex(ratio(x, 1), ratio(y, 1));
    const scale = ratio(k, j);
    return [
      {
        text: 'Two vectors are parallel when one is a scalar multiple of the other. With $\\mathbf{a}$ and $\\mathbf{b}$ that means the *same* multiple on both coefficients.',
      },
      { tex: `${tex(k * r, k * s)} = ${ratioTex(scale)}\\left(${tex(j * r, j * s)}\\right)` },
      {
        text: `Both coefficients are multiplied by $${ratioTex(scale)}$, so the two are parallel${scale.n < 0 ? ', pointing opposite ways' : ''}.`,
      },
      {
        text: 'Swapping the coefficients, or changing just one of them or just one sign, changes the ratio of $\\mathbf{a}$ to $\\mathbf{b}$, and with it the direction.',
      },
    ];
  },
};

/* ---------- Level 6: lines in vector form ---------- */

/*
 * Level 6 writes a straight line as `r = a + t b`: a point to start from, a
 * direction to travel in, and a parameter saying how far to go. Every question
 * is built outward from the numbers it wants to end on — the point at a given
 * `t`, the crossing of two lines, the `λ` and `μ` that reach it — so every
 * answer is whole without rejecting random lines until one happens to be.
 *
 * Mostly two-dimensional, like level 4, so `columnTex`, the point tiles and
 * squared-paper figures all carry over. The fourth lesson steps into three
 * components for one reason: skew lines. In a plane two lines that are not
 * parallel always cross, so "solve two components, test the third" means
 * nothing until there is a third. `column3Tex` is the one formatter that adds.
 *
 * Answers are still scalars or tiles, for the reason `vectorFormat.ts` gives.
 * A tile may hold a whole column vector: a token is one TeX string, so the
 * `pmatrix` is never split across a blank the way a template's would be.
 */

type Vec = number[];

/** A three-component column vector, for prompts and tiles only. */
function column3Tex(x: number, y: number, z: number): string {
  return `\\begin{pmatrix} ${x} \\\\ ${y} \\\\ ${z} \\end{pmatrix}`;
}

/** A column of two or three components. */
function colTex(v: Vec): string {
  return v.length === 3 ? column3Tex(v[0], v[1], v[2]) : columnTex(v[0], v[1]);
}

/** A column with an unknown among its entries. */
function columnOf(entries: string[]): string {
  return `\\begin{pmatrix} ${entries.join(' \\\\ ')} \\end{pmatrix}`;
}

const plus = (u: Vec, v: Vec): Vec => u.map((x, i) => x + v[i]);
const minus = (u: Vec, v: Vec): Vec => u.map((x, i) => x - v[i]);
const scaled = (k: number, u: Vec): Vec => u.map((x) => k * x);

/** `r = a + t b`, as one whole TeX string. */
function lineTex(a: Vec, b: Vec, param = 't'): string {
  return `\\mathbf{r} = ${colTex(a)} + ${param}${colTex(b)}`;
}

/** `c + k t` as written by hand: `3 - 2t`, `t`, `-4 + \mu`. */
function affTex(c: number, k: number, sym: string): string {
  if (k === 0) return `${c}`;
  const size = Math.abs(k) === 1 ? '' : `${Math.abs(k)}`;
  if (c === 0) return `${k < 0 ? '-' : ''}${size}${sym}`;
  return `${c} ${k < 0 ? '-' : '+'} ${size}${sym}`;
}

/** A number following an operator, bracketed when it is negative. */
function paren(n: number): string {
  return n < 0 ? `\\left(${n}\\right)` : `${n}`;
}

/** `a + 2b`, `a - b`: a multiple of a vector added on, signed as written. */
function addMultipleTex(first: string, k: number, second: string): string {
  const size = Math.abs(k) === 1 ? '' : `${Math.abs(k)}`;
  return `${first} ${k < 0 ? '-' : '+'} ${size}${second}`;
}

/** A stable number from the question's own values, for placing its answer. */
function saltOf(params: unknown): number {
  return hashSeed(JSON.stringify(params));
}

/** Mirrors the rotation `choiceVariant` applies to a derived choice slide. */
function rotationOf(opts: ChoiceOption[]): number {
  let hash = 0;
  for (const option of opts) {
    for (let i = 0; i < option.tex.length; i += 1) {
      hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
    }
  }
  return Math.abs(hash) % opts.length;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, idx) =>
    permutations([...items.slice(0, idx), ...items.slice(idx + 1)]).map((rest) => [item, ...rest]),
  );
}

/**
 * Options ordered so the rotation lands the answer at `salt % length`.
 *
 * The rotation hashes the labels, and these questions offer the same four
 * labels in different orders — "Intersecting", "Skew" and the rest, or four
 * small numbers — so left alone the answer settles in one or two slots, and a
 * learner who noticed would never need to read the question. Trying orders
 * until the rotation puts it where the question's own salt says keeps each
 * question rendering one way while spreading the answer over every slot.
 */
function steered(opts: ChoiceOption[], salt: number): ChoiceOption[] {
  const target = salt % opts.length;
  for (const order of permutations(opts)) {
    const at = (order.findIndex((o) => o.correct) - rotationOf(order) + order.length) % order.length;
    if (at === target) return order;
  }
  return opts;
}

/** A native choice slide's options, with the answer placed at `salt % length`. */
function placeAnswer(
  correct: { id: string; label: string },
  wrong: { id: string; label: string }[],
  salt: number,
) {
  const all = distinctOptions([correct, ...wrong]);
  const rest = all.slice(1);
  const at = salt % all.length;
  return [...rest.slice(0, at), all[0], ...rest.slice(at)].map((option) => ({ ...option, tex: true }));
}

/** A steps bank: distinct tokens in a stable scattered order. */
function scattered(tokens: string[]): string[] {
  return [...new Set(tokens)].sort((p, q) => hashSeed(p) - hashSeed(q));
}

/** The values of `t` for which `a + t b` is inside the square of half-width `span`. */
function tRange(a: Vec, b: Vec, span: number): [number, number] | undefined {
  let lo = -Infinity;
  let hi = Infinity;
  for (const i of [0, 1]) {
    if (b[i] === 0) {
      if (Math.abs(a[i]) > span) return undefined;
      continue;
    }
    const t1 = (-span - a[i]) / b[i];
    const t2 = (span - a[i]) / b[i];
    lo = Math.max(lo, Math.min(t1, t2));
    hi = Math.min(hi, Math.max(t1, t2));
  }
  return lo < hi ? [lo, hi] : undefined;
}

/**
 * Whole lines on squared paper, edge to edge, with named points on them.
 *
 * Square and to scale, like `vectorSvg` and `pointsSvg`, so a slider marker
 * placed as a fraction of the width lands where the maths says. The lines are
 * drawn in the text colour rather than the accent, which belongs to the
 * slider's own marker; a second line is dashed so the two can be told apart
 * without colour. `dots` marks every whole value of the parameter, which is
 * what makes `t` something the learner can count rather than a label.
 */
function linesSvg(
  lines: { a: Vec; b: Vec; dots?: boolean; dashed?: boolean }[],
  points: { at: Vec; name: string }[],
  opts: { span: number; label: string },
): string {
  const { span } = opts;
  const SIZE = 220;
  const unit = SIZE / (2 * span);
  const sx = (v: number) => SIZE / 2 + v * unit;
  const sy = (v: number) => SIZE / 2 - v * unit;
  const f = (v: number) => v.toFixed(1);

  const parts = [
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" role="img" aria-label="${opts.label}">`,
  ];
  for (let i = -span + 1; i <= span - 1; i += 1) {
    parts.push(
      `<line x1="${f(sx(i))}" y1="0" x2="${f(sx(i))}" y2="${SIZE}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
      `<line x1="0" y1="${f(sy(i))}" x2="${SIZE}" y2="${f(sy(i))}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
    );
  }
  parts.push(
    `<line x1="0" y1="${f(sy(0))}" x2="${SIZE}" y2="${f(sy(0))}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    `<line x1="${f(sx(0))}" y1="0" x2="${f(sx(0))}" y2="${SIZE}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
  );

  for (const line of lines) {
    const range = tRange(line.a, line.b, span);
    if (!range) continue;
    const [lo, hi] = range;
    const from = plus(line.a, scaled(lo, line.b));
    const to = plus(line.a, scaled(hi, line.b));
    parts.push(
      `<line x1="${f(sx(from[0]))}" y1="${f(sy(from[1]))}" x2="${f(sx(to[0]))}" y2="${f(sy(to[1]))}" stroke="currentColor" stroke-width="2"${line.dashed ? ' stroke-dasharray="7 5"' : ''} />`,
    );
    if (line.dots) {
      for (let t = Math.ceil(lo); t <= Math.floor(hi); t += 1) {
        const p = plus(line.a, scaled(t, line.b));
        parts.push(`<circle cx="${f(sx(p[0]))}" cy="${f(sy(p[1]))}" r="2.5" fill="currentColor" opacity="0.6" />`);
      }
    }
  }

  // Labels sit off to one side of the first line, where it cannot run
  // through them, and swap sides rather than leave the picture.
  const first = lines[0]?.b ?? [0, 1];
  const length = Math.hypot(first[0], first[1]) || 1;
  const ox = (-14 * first[1]) / length;
  const oy = (-14 * first[0]) / length;
  for (const point of points) {
    const cx = sx(point.at[0]);
    const cy = sy(point.at[1]);
    const inside = (x: number, y: number) => x > 8 && x < SIZE - 8 && y > 14 && y < SIZE - 6;
    const [lx, ly] = inside(cx + ox, cy + oy) ? [cx + ox, cy + oy] : [cx - ox, cy - oy];
    parts.push(
      `<circle cx="${f(cx)}" cy="${f(cy)}" r="4" fill="currentColor" />`,
      `<text x="${f(lx)}" y="${f(ly + 4)}" font-size="13" font-style="italic" text-anchor="middle" fill="currentColor">${point.name}</text>`,
    );
  }
  parts.push('</svg>');
  return parts.join('');
}

interface PointAtParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  k: number;
}

function samplePointAt(rng: Parameters<Generator['sample']>[0], difficulty: number): PointAtParams {
  const span = difficulty > 1 ? 6 : 4;
  const ks = difficulty > 1 ? [-3, -2, -1, 2, 3, 4] : [-1, 2, 3, 4];
  for (let tries = 0; tries < 60; tries += 1) {
    const bx = rng.int(-4, 4);
    const by = rng.int(-4, 4);
    if (bx === 0 && by === 0) continue;
    if (difficulty === 1 && (bx === 0 || by === 0)) continue;
    return { ax: rng.int(-span, span), ay: rng.int(-span, span), bx, by, k: rng.pick(ks) };
  }
  return { ax: 1, ay: 2, bx: 3, by: -1, k: 2 };
}

function pointAtSolution({ ax, ay, bx, by, k }: PointAtParams) {
  const px = ax + k * bx;
  const py = ay + k * by;
  return [
    {
      text: `Put $t = ${k}$ into the equation: start at $\\mathbf{a}$ and add $${k}$ times the direction${k < 0 ? ', which with a negative multiple means going backwards along the line' : ''}.`,
    },
    { tex: `${k}${columnTex(bx, by)} = ${columnTex(k * bx, k * by)}` },
    { tex: `${columnTex(ax, ay)} + ${columnTex(k * bx, k * by)} = ${columnTex(px, py)}` },
    {
      text: `So the point is $${pointTex(px, py)}$. At $t = 0$ the equation gives the starting point itself, and each step of 1 in $t$ moves one whole direction vector along the line.`,
    },
  ];
}

/** The point on a line at a given value of the parameter. */
const linePointAt: Generator<PointAtParams> = {
  id: 'line-point-at',
  sample: samplePointAt,
  render: ({ ax, ay, bx, by, k }): Slide => {
    const px = ax + k * bx;
    const py = ay + k * by;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `The line $\\ell$ has the equation below. Find the point on $\\ell$ where $t = ${k}$.` },
        { kind: 'display', tex: lineTex([ax, ay], [bx, by]) },
      ],
      template: pointTemplate('P'),
      // The two slips: the scalar applied to the start instead of the
      // direction, and the direction taken the wrong way.
      bank: bankOf([`${px}`, `${py}`], [`${k * ax + bx}`, `${k * ay + by}`, `${ax - k * bx}`, `${ay - k * by}`]),
      answer: [`${px}`, `${py}`],
    };
  },
  solution: pointAtSolution,
};

/**
 * The same point with its working laid out: the multiple of the direction
 * first, then the sum. Scaling the whole line, start included, is the slip
 * this makes visible.
 */
const linePointAtSteps: Generator<PointAtParams> = {
  id: 'line-point-at-steps',
  sample: (rng, difficulty) => {
    const params = samplePointAt(rng, difficulty);
    // A multiple of one leaves the first step with nothing to do.
    return Math.abs(params.k) === 1 ? { ...params, k: 2 * params.k } : params;
  },
  render: ({ ax, ay, bx, by, k }): Slide => {
    const size = Math.abs(k);
    const sign = k < 0 ? -1 : 1;
    const px = ax + k * bx;
    const py = ay + k * by;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Put $t = ${k}$ into the equation of $\\ell$ and work out the point: the multiple of the direction first, then the sum.`,
        },
        { kind: 'display', tex: lineTex([ax, ay], [bx, by]) },
      ],
      start: [columnTex(ax, ay), sign < 0 ? '-' : '+', `${size}`, columnTex(bx, by)],
      reductions: [
        {
          span: [2, 4],
          value: columnTex(size * bx, size * by),
          bank: scattered([
            columnTex(size * bx, size * by),
            columnTex(size * bx, by),
            columnTex(bx + size, by + size),
            columnTex(-size * bx, -size * by),
          ]),
        },
        {
          span: [0, 3],
          operator: 1,
          value: columnTex(px, py),
          bank: scattered([
            columnTex(px, py),
            columnTex(ax - k * bx, ay - k * by),
            columnTex(ax + sign * bx, ay + sign * by),
            columnTex(px, py + 1),
          ]),
        },
      ],
    };
  },
  solution: pointAtSolution,
};

interface LineDirectionParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  m: number;
  phrase: number;
}

/** Which vector points along a line: any non-zero multiple of its direction. */
const lineDirection: Generator<LineDirectionParams> = {
  id: 'line-direction',
  sample: (rng, difficulty) => {
    const ms = difficulty > 1 ? [-3, -2, -1, 2, 3] : [-1, 2, 3];
    for (let tries = 0; tries < 80; tries += 1) {
      const bx = nonZero(rng.int(-4, 4), 1);
      const by = nonZero(rng.int(-4, 4), 2);
      // Equal sizes would make the swapped distractor parallel too.
      if (Math.abs(bx) === Math.abs(by)) continue;
      const ax = rng.int(-5, 5);
      const ay = rng.int(-5, 5);
      if (cross(ax, ay, bx, by) === 0) continue;
      return { ax, ay, bx, by, m: rng.pick(ms), phrase: rng.int(0, 1) };
    }
    return { ax: 2, ay: -1, bx: 1, by: 3, m: 2, phrase: 0 };
  },
  render: (params): Slide => {
    const { ax, ay, bx, by, m, phrase } = params;
    const salt = saltOf(params);
    const wrong = [
      { id: 'position', v: [ax, ay] },
      { id: 'sum', v: [ax + bx, ay + by] },
      { id: 'swapped', v: [by, bx] },
      { id: 'one-scaled', v: [m * bx, by] },
    ].filter((w) => cross(bx, by, w.v[0], w.v[1]) !== 0);
    // Three of the four, a different one left out from question to question.
    const dropped = wrong.length > 3 ? (salt >>> 4) % wrong.length : -1;
    const offered = placeAnswer(
      { id: 'direction', label: columnTex(m * bx, m * by) },
      wrong.filter((_, idx) => idx !== dropped).map((w) => ({ id: w.id, label: columnTex(w.v[0], w.v[1]) })),
      salt,
    );
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text:
            phrase === 0
              ? 'Which of these could be a direction vector of the line $\\ell$?'
              : 'A second line runs parallel to $\\ell$. Which of these could be its direction vector?',
        },
        { kind: 'display', tex: lineTex([ax, ay], [bx, by]) },
      ],
      options: offered,
      correctId: 'direction',
    };
  },
  solution: ({ ax, ay, bx, by, m }) => [
    {
      text: 'The direction of a line is the vector multiplied by $t$. Any non-zero multiple of it points along the same line, so it works just as well; a negative multiple points back along it.',
    },
    { tex: `${columnTex(m * bx, m * by)} = ${m}${columnTex(bx, by)}` },
    {
      text: `$${columnTex(ax, ay)}$ is where the line starts, a position rather than a direction. A vector whose components are not in the same ratio as $${bx}$ to $${by}$ points somewhere else.`,
    },
  ],
};

interface TSliderParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  t: number;
}

/**
 * Drag `t` along a drawn line until the marker reaches a point.
 *
 * The dots at each whole `t` are the point of the figure: the parameter is a
 * count of direction vectors from the start, and here it can be counted.
 */
const lineTSlider: Generator<TSliderParams> = {
  id: 'line-t-slider',
  sample: (rng, difficulty) => {
    const ts = difficulty > 1 ? [-4, -3, -2, -1, 1, 2, 3, 4] : [-2, -1, 1, 2, 3];
    for (let tries = 0; tries < 100; tries += 1) {
      // Rightwards, so the marker's position across the figure is `t` in order.
      const bx = rng.int(1, difficulty > 1 ? 3 : 2);
      const by = difficulty > 1 ? rng.int(-3, 3) : nonZero(rng.int(-2, 2), 1);
      const ax = rng.int(-5, 5);
      const ay = rng.int(-5, 5);
      const t = rng.pick(ts);
      if (Math.abs(ax + t * bx) > 7 || Math.abs(ay + t * by) > 7) continue;
      return { ax, ay, bx, by, t };
    }
    return { ax: -2, ay: 1, bx: 1, by: 2, t: 2 };
  },
  render: ({ ax, ay, bx, by, t }): Slide => {
    const span = 8;
    const [lo, hi] = tRange([ax, ay], [bx, by], span) ?? [-6, 6];
    const p = [ax + t * bx, ay + t * by];
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'The line $\\ell$ is drawn with a dot at every whole value of $t$, and $A$ is where $t = 0$. Slide $t$ until the marker passes through $P$.',
        },
        { kind: 'display', tex: lineTex([ax, ay], [bx, by]) },
      ],
      min: Math.max(-6, Math.ceil(lo)),
      max: Math.min(6, Math.floor(hi)),
      step: 1,
      answer: t,
      readout: 't = {v}',
      figure: {
        svg: linesSvg(
          [{ a: [ax, ay], b: [bx, by], dots: true }],
          [
            { at: [ax, ay], name: 'A' },
            { at: p, name: 'P' },
          ],
          { span, label: 'A line on squared paper with a dot at each whole value of t' },
        ),
        // In units of t: the marker for a value sits where the line is at it.
        xMin: (-span - ax) / bx,
        xMax: (span - ax) / bx,
        axis: 'x',
        origin: 0,
      },
    };
  },
  solution: ({ ax, ay, bx, by, t }) => {
    const px = ax + t * bx;
    const py = ay + t * by;
    return [
      {
        text: `$P$ is at $${pointTex(px, py)}$. Getting there from $A$ takes $${t}$ lots of the direction vector, one dot per step${t < 0 ? ', going backwards' : ''}.`,
      },
      { tex: `${columnTex(ax, ay)} + ${paren(t)}${columnTex(bx, by)} = ${columnTex(px, py)}` },
      { text: `Across alone says the same: $${ax} + ${paren(t)} \\times ${bx} = ${px}$.` },
    ];
  },
};

interface SameLineParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  j: number;
  m: number;
  slip: number;
}

/** Another equation of the same line: any point on it, any multiple of its direction. */
const lineSame: Generator<SameLineParams> = {
  id: 'line-same',
  sample: (rng, difficulty) => {
    const ms = difficulty > 1 ? [-2, -1, 2, 3] : [-1, 2];
    const js = difficulty > 1 ? [-2, -1, 1, 2, 3] : [-1, 1, 2];
    for (let tries = 0; tries < 80; tries += 1) {
      const bx = nonZero(rng.int(-3, 3), 1);
      const by = nonZero(rng.int(-3, 3), 2);
      if (Math.abs(bx) === Math.abs(by)) continue;
      const ax = rng.int(-4, 4);
      const ay = rng.int(-4, 4);
      if (cross(ax, ay, bx, by) === 0) continue;
      return { ax, ay, bx, by, j: rng.pick(js), m: rng.pick(ms), slip: rng.int(0, 1) };
    }
    return { ax: 1, ay: 2, bx: 2, by: -1, j: 1, m: 2, slip: 0 };
  },
  render: (params): Slide => {
    const { ax, ay, bx, by, j, m, slip } = params;
    const point = [ax + j * bx, ay + j * by];
    const direction = [m * bx, m * by];
    const offered = placeAnswer(
      { id: 'same', label: lineTex(point, direction, 's') },
      [
        // A point one square off the line: the direction is right.
        { id: 'off-point', label: lineTex([point[0], point[1] + 1], direction, 's') },
        // A direction that is not a multiple: the point is right.
        {
          id: 'off-direction',
          label: lineTex(point, slip === 0 ? [direction[1], direction[0]] : [m * bx, by], 's'),
        },
        // The two roles swapped.
        { id: 'swapped', label: lineTex([bx, by], [ax, ay], 's') },
      ],
      saltOf(params),
    );
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Which of these is also an equation of the line $\\ell$?' },
        { kind: 'display', tex: lineTex([ax, ay], [bx, by]) },
      ],
      options: offered,
      correctId: 'same',
    };
  },
  solution: ({ ax, ay, bx, by, j, m }) => {
    const point = [ax + j * bx, ay + j * by];
    return [
      {
        text: 'An equation of a line needs a point on it and a direction along it. Neither is unique, so one line has many equations.',
      },
      { tex: `${columnTex(point[0], point[1])} = ${addMultipleTex(columnTex(ax, ay), j, columnTex(bx, by))}` },
      { text: `So that starting point is on $\\ell$: it is where $t = ${j}$.` },
      { tex: `${columnTex(m * bx, m * by)} = ${m}${columnTex(bx, by)}` },
      {
        text: 'And that direction is a multiple of the original, so it points along $\\ell$. Each of the other equations starts off the line or heads in a different direction.',
      },
    ];
  },
};

interface ThroughParams {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  mode: 'points' | 'parallel';
  cx: number;
  cy: number;
}

/** Whether `p + s v` is the line through `a` with direction `d`. */
function sameLine(a: Vec, d: Vec, p: Vec, v: Vec): boolean {
  const along = cross(d[0], d[1], v[0], v[1]) === 0 && (v[0] !== 0 || v[1] !== 0);
  return along && cross(d[0], d[1], p[0] - a[0], p[1] - a[1]) === 0;
}

/**
 * An equation of the line through two points, or through a point parallel to
 * another line, assembled from column-vector tiles.
 *
 * Only one pair of tiles in the bank can be right. `B` is never offered, nor
 * any multiple of the direction but the one asked for, because either would
 * make a second correct equation the widget would mark wrong.
 */
const lineThroughTwo: Generator<ThroughParams> = {
  id: 'line-through-two',
  choices: (params) => {
    const { ax, ay, dx, dy, mode, cx, cy } = params;
    const a = [ax, ay];
    const d = [dx, dy];
    const b = [ax + dx, ay + dy];
    const wrong: [Vec, Vec][] =
      mode === 'points'
        ? [
            [a, b],
            [b, a],
            [a, [ax + b[0], ay + b[1]]],
            [a, [dy, dx]],
          ]
        : [
            [[cx, cy], d],
            [a, [cx, cy]],
            [d, a],
            [a, [dy, dx]],
          ];
    const picked = wrong.filter(([p, v]) => !sameLine(a, d, p, v)).slice(0, 3);
    return steered(
      options({ tex: lineTex(a, d) }, ...picked.map(([p, v]) => ({ tex: lineTex(p, v) }))),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 100; tries += 1) {
      const ax = rng.int(-5, 5);
      const ay = rng.int(-5, 5);
      const dx = nonZero(rng.int(-5, 5), 2);
      const dy = nonZero(rng.int(-5, 5), -3);
      if (Math.abs(dx) === Math.abs(dy)) continue;
      // Through the origin, the position vector of A would be a direction too.
      if (cross(ax, ay, dx, dy) === 0) continue;
      if (Math.abs(ax + dx) > 9 || Math.abs(ay + dy) > 9) continue;
      // Parallel lines are the last thing the lesson teaches, so only the
      // harder draws ask for them.
      const mode = difficulty > 1 && rng.chance(0.5) ? 'parallel' : 'points';
      const cx = rng.int(-5, 5);
      const cy = rng.int(-5, 5);
      if (mode === 'parallel' && cross(dx, dy, cx - ax, cy - ay) === 0) continue;
      return { ax, ay, dx, dy, mode, cx, cy };
    }
    return { ax: 1, ay: 2, dx: 3, dy: -1, mode: 'points', cx: 0, cy: 0 };
  },
  render: ({ ax, ay, dx, dy, mode, cx, cy }): Slide => {
    const a = [ax, ay];
    const d = [dx, dy];
    const candidates: Vec[] =
      mode === 'points'
        ? [[2 * ax + dx, 2 * ay + dy], [dy, dx], [-dx, dy], [ax + 1, ay], [dx + 1, dy]]
        : [[cx, cy], [dy, dx], [cx - ax, cy - ay], [-dx, dy], [dx + 1, dy]];
    // A tile that could sit in either blank of a correct equation is not a
    // distractor, whichever blank the learner has in mind.
    const extras = [
      ...new Set(
        candidates
          .filter((v) => !sameLine(a, d, v, d) && !sameLine(a, d, a, v))
          .map((v) => colTex(v)),
      ),
    ]
      .filter((tex) => tex !== colTex(a) && tex !== colTex(d))
      .slice(0, 3);
    return {
      kind: 'tiles',
      prompt:
        mode === 'points'
          ? [
              {
                kind: 'prose',
                text: `Build an equation of the line through $A${pointTex(ax, ay)}$ and $B${pointTex(ax + dx, ay + dy)}$, starting at $A$ and heading along $\\overrightarrow{AB}$.`,
              },
            ]
          : [
              {
                kind: 'prose',
                text: `Build an equation of the line through $A${pointTex(ax, ay)}$ that is parallel to $\\ell$.`,
              },
              { kind: 'display', tex: `\\ell: \\; ${lineTex([cx, cy], d, 's')}` },
            ],
      template: '\\mathbf{r} = {0} + t\\,{1}',
      bank: [colTex(a), colTex(d), ...extras].sort(),
      answer: [colTex(a), colTex(d)],
    };
  },
  solution: ({ ax, ay, dx, dy, mode, cx, cy }) =>
    mode === 'points'
      ? [
          { text: 'A line needs a point and a direction. The point is $A$; the direction is the journey from $A$ to $B$, destination minus start.' },
          { tex: `\\overrightarrow{AB} = ${columnTex(ax + dx, ay + dy)} - ${columnTex(ax, ay)} = ${columnTex(dx, dy)}` },
          { tex: lineTex([ax, ay], [dx, dy]) },
          {
            text: 'Starting at $B$ instead, or heading along $\\overrightarrow{BA}$, gives a different equation of the same line. Using the position of $B$ as the direction does not: that vector points from the origin, not along the line.',
          },
        ]
      : [
          { text: 'Parallel lines point the same way, so the new line can borrow the direction of $\\ell$. Only the starting point changes, to $A$.' },
          { tex: lineTex([ax, ay], [dx, dy]) },
          {
            text: `Keeping $\\ell$'s own starting point $${pointTex(cx, cy)}$ would describe $\\ell$ itself, which does not pass through $A$.`,
          },
        ],
};

interface TwoPointsAtParams {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  k: number;
}

/** A point on the line through two points, the working laid out as a tree. */
const lineTwoPointsAtTree: Generator<TwoPointsAtParams> = {
  id: 'line-two-points-at-tree',
  sample: (rng, difficulty) => {
    const ks = difficulty > 1 ? [-2, -1, 2, 3] : [-1, 2, 3];
    const span = difficulty > 1 ? 5 : 4;
    return {
      ax: rng.int(-span, span),
      ay: rng.int(-span, span),
      dx: nonZero(rng.int(-4, 4), 1),
      dy: nonZero(rng.int(-4, 4), -2),
      k: rng.pick(ks),
    };
  },
  render: ({ ax, ay, dx, dy, k }): Slide => {
    const answer = [columnTex(dx, dy), columnTex(k * dx, k * dy), pointTex(ax + k * dx, ay + k * dy)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `$A${pointTex(ax, ay)}$ and $B${pointTex(ax + dx, ay + dy)}$ lie on the line $\\mathbf{r} = \\mathbf{a} + t\\,\\overrightarrow{AB}$. Fill the tree to find the point where $t = ${k}$.`,
        },
      ],
      expression: addMultipleTex('\\mathbf{a}', k, '\\overrightarrow{AB}'),
      nodes: [
        { id: 'ab', from: [] },
        { id: 'kab', from: ['ab'] },
        { id: 'p', from: ['kab'] },
      ],
      bank: geometryTreeBank(
        answer,
        [
          columnTex(-dx, -dy),
          columnTex(-k * dx, -k * dy),
          pointTex(ax + dx + k * dx, ay + dy + k * dy),
          pointTex(k * dx, k * dy),
        ],
        [columnTex(k * dx + 1, k * dy), pointTex(ax + k * dx, ay + k * dy + 1)],
      ),
      answer,
    };
  },
  solution: ({ ax, ay, dx, dy, k }) => [
    { text: 'The direction is the journey from $A$ to $B$: destination minus start.' },
    { tex: `\\overrightarrow{AB} = ${columnTex(dx, dy)}` },
    { text: `The point where $t = ${k}$ is $${k}$ of those journeys from $A$.` },
    { tex: `${k}\\overrightarrow{AB} = ${columnTex(k * dx, k * dy)}` },
    { tex: `${columnTex(ax, ay)} + ${columnTex(k * dx, k * dy)} = ${columnTex(ax + k * dx, ay + k * dy)}` },
    {
      text: `Starting from $B$ instead lands one whole step further on, at $${pointTex(ax + dx + k * dx, ay + dy + k * dy)}$: that is $t = ${k + 1}$ on this line.`,
    },
  ],
};

interface FindTParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  t: number;
}

/** The value of `t` that reaches a point on the line. */
const lineFindT: Generator<FindTParams> = {
  id: 'line-find-t',
  choices: (params) => {
    const { ax, bx, by, t } = params;
    return steered(
      signedChoices(t, [-t, t * bx, t * by, ax + t * bx, t + 1]),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const ts = difficulty > 1 ? [-4, -3, -2, -1, 2, 3, 4, 5] : [-2, -1, 2, 3, 4];
    for (let tries = 0; tries < 60; tries += 1) {
      const bx = rng.int(-4, 4);
      const by = rng.int(-4, 4);
      if (bx === 0 && by === 0) continue;
      if (difficulty === 1 && (bx === 0 || by === 0)) continue;
      return { ax: rng.int(-6, 6), ay: rng.int(-6, 6), bx, by, t: rng.pick(ts) };
    }
    return { ax: 1, ay: -2, bx: 2, by: 3, t: 2 };
  },
  render: ({ ax, ay, bx, by, t }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `$P${pointTex(ax + t * bx, ay + t * by)}$ lies on the line $\\ell$ below. Find the value of $t$ at $P$.`,
      },
      { kind: 'display', tex: lineTex([ax, ay], [bx, by]) },
    ],
    lead: 't =',
    keypad: [],
    answer: `${t}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ ax, ay, bx, by, t }) => {
    const px = ax + t * bx;
    const py = ay + t * by;
    const useX = bx !== 0;
    const steps = [
      {
        text: useX
          ? 'Set the line equal to $P$ and take one component. Across:'
          : 'The direction has no across component, so every point of the line has the same $x$. Take the up component instead:',
      },
      useX
        ? { tex: `${affTex(ax, bx, 't')} = ${px} \\implies ${bx}t = ${px - ax} \\implies t = ${t}` }
        : { tex: `${affTex(ay, by, 't')} = ${py} \\implies ${by}t = ${py - ay} \\implies t = ${t}` },
    ];
    if (useX && by !== 0) {
      steps.push({
        text: `The other component agrees: $${ay} + ${paren(by)} \\times ${paren(t)} = ${py}$. It always will for a point that is on the line, and checking it is how you would know if it were not.`,
      });
    }
    return steps;
  },
};

interface ContainsParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  k: number;
  delta: number;
  off: 'x' | 'y';
}

function containsTs({ k, delta, off }: ContainsParams): [number, number] {
  return [off === 'x' ? k + delta : k, off === 'y' ? k + delta : k];
}

/**
 * Is a point on the line? Solve each component for `t` and compare.
 *
 * The distractors are the two single-component answers: a learner who solves
 * across and stops has found a `t`, and it is offered.
 */
const lineContains: Generator<ContainsParams> = {
  id: 'line-contains',
  sample: (rng) => ({
    ax: rng.int(-5, 5),
    ay: rng.int(-5, 5),
    bx: nonZero(rng.int(-3, 3), 2),
    by: nonZero(rng.int(-3, 3), -1),
    k: rng.pick([-2, -1, 1, 2, 3]),
    delta: rng.chance(0.5) ? 0 : rng.pick([-2, -1, 1, 2]),
    off: rng.pick(['x', 'y'] as const),
  }),
  render: (params): Slide => {
    const { ax, ay, bx, by, k, delta } = params;
    const [tx, ty] = containsTs(params);
    const px = ax + tx * bx;
    const py = ay + ty * by;
    const yes = (t: number) => `\\text{Yes, at } t = ${t}`;
    const no = '\\text{No, the components disagree}';
    const offered =
      delta === 0
        ? placeAnswer(
            { id: 'yes', label: yes(k) },
            [
              { id: 'negated', label: yes(-k) },
              { id: 'undivided', label: yes(px - ax === k || px - ax === -k ? k + 1 : px - ax) },
              { id: 'no', label: no },
            ],
            saltOf(params),
          )
        : placeAnswer(
            { id: 'no', label: no },
            [
              { id: 'across', label: yes(tx) },
              { id: 'up', label: yes(ty) },
            ],
            saltOf(params),
          );
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Does $P${pointTex(px, py)}$ lie on the line $\\ell$ below?` },
        { kind: 'display', tex: lineTex([ax, ay], [bx, by]) },
      ],
      options: offered,
      correctId: delta === 0 ? 'yes' : 'no',
    };
  },
  solution: (params) => {
    const { ax, ay, bx, by, delta } = params;
    const [tx, ty] = containsTs(params);
    const px = ax + tx * bx;
    const py = ay + ty * by;
    return [
      { text: 'Set the line equal to $P$ and solve each component for $t$ separately.' },
      { tex: `${affTex(ax, bx, 't')} = ${px} \\implies t = ${tx}` },
      { tex: `${affTex(ay, by, 't')} = ${py} \\implies t = ${ty}` },
      delta === 0
        ? { text: `Both components give $t = ${tx}$, so a single value of $t$ reaches $P$ and it is on the line.` }
        : {
            text: `Across needs $t = ${tx}$ but up needs $t = ${ty}$. No single point of the line matches both coordinates, so $P$ is not on it. Solving one component alone would have found a value of $t$ and missed that.`,
          },
    ];
  },
};

interface MissingParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  t: number;
  missing: 'x' | 'y';
}

/** A missing coordinate that puts a point on the line. */
const lineMissingCoord: Generator<MissingParams> = {
  id: 'line-missing-coord',
  choices: (params) => {
    const { ax, ay, bx, by, t, missing } = params;
    const [am, bm, known] = missing === 'y' ? [ay, by, ax + t * bx] : [ax, bx, ay + t * by];
    return steered(
      signedChoices(am + t * bm, [
        // The multiple of the direction without the start.
        t * bm,
        // Moved the wrong way along the line.
        am - t * bm,
        // One step too far.
        am + (t + 1) * bm,
        known,
      ]),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const ts = difficulty > 1 ? [-3, -2, -1, 2, 3, 4] : [-1, 1, 2, 3];
    const reach = difficulty > 1 ? 4 : 3;
    return {
      ax: rng.int(-5, 5),
      ay: rng.int(-5, 5),
      bx: nonZero(rng.int(-reach, reach), 2),
      by: nonZero(rng.int(-reach, reach), -1),
      t: rng.pick(ts),
      missing: rng.pick(['x', 'y'] as const),
    };
  },
  render: ({ ax, ay, bx, by, t, missing }): Slide => {
    const px = ax + t * bx;
    const py = ay + t * by;
    const point = missing === 'y' ? `P\\left(${px}, k\\right)` : `P\\left(k, ${py}\\right)`;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `$${point}$ lies on the line $\\ell$ below. Find $k$.` },
        { kind: 'display', tex: lineTex([ax, ay], [bx, by]) },
      ],
      lead: 'k =',
      keypad: [],
      answer: `${missing === 'y' ? py : px}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ ax, ay, bx, by, t, missing }) => {
    const px = ax + t * bx;
    const py = ay + t * by;
    return missing === 'y'
      ? [
          { text: 'The coordinate you know fixes $t$. Across:' },
          { tex: `${affTex(ax, bx, 't')} = ${px} \\implies t = ${t}` },
          { text: 'The same $t$ gives the other coordinate. Up:' },
          { tex: `k = ${ay} + ${paren(by)} \\times ${paren(t)} = ${py}` },
        ]
      : [
          { text: 'The coordinate you know fixes $t$. Up:' },
          { tex: `${affTex(ay, by, 't')} = ${py} \\implies t = ${t}` },
          { text: 'The same $t$ gives the other coordinate. Across:' },
          { tex: `k = ${ax} + ${paren(bx)} \\times ${paren(t)} = ${px}` },
        ];
  },
};

interface ParallelKParams {
  u: number[];
  m1: number;
  m2: number;
  missing: number;
  a: number[];
  c: number[];
}

/** An unknown component that makes two lines parallel. */
const linesParallelK: Generator<ParallelKParams> = {
  id: 'lines-parallel-k',
  choices: (params) => {
    const { u, m1, m2, missing } = params;
    const k = m1 * u[missing];
    return steered(
      signedChoices(k, [
        // Copied from the other direction.
        m2 * u[missing],
        -k,
        // The multiple the wrong way up.
        m2 * m2 * u[missing],
        k + m1,
      ]),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const dims = difficulty > 1 && rng.chance(0.5) ? 3 : 2;
    const multiples = difficulty > 1 ? [-2, -1, 1, 2, 3] : [1, 2, 3];
    const [m1, m2] = rng.sample(multiples, 2);
    const u = Array.from({ length: dims }, () => nonZero(rng.int(-3, 3), 1));
    return {
      u,
      m1,
      m2,
      missing: rng.int(0, dims - 1),
      a: Array.from({ length: dims }, () => rng.int(-5, 5)),
      c: Array.from({ length: dims }, () => rng.int(-5, 5)),
    };
  },
  render: ({ u, m1, m2, missing, a, c }): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'These two lines are parallel. Find $k$.' },
      {
        kind: 'display',
        tex: `\\mathbf{r} = ${colTex(a)} + \\lambda${columnOf(u.map((x, i) => (i === missing ? 'k' : `${m1 * x}`)))}`,
      },
      { kind: 'display', tex: lineTex(c, scaled(m2, u), '\\mu') },
    ],
    lead: 'k =',
    keypad: [],
    answer: `${m1 * u[missing]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ u, m1, m2, missing }) => {
    const known = missing === 0 ? 1 : 0;
    const factor = ratio(m1, m2);
    return [
      {
        text: 'Parallel lines have directions that are scalar multiples of each other. A component you know on both lines gives the multiple.',
      },
      { tex: `${m1 * u[known]} = ${ratioTex(factor)} \\times ${paren(m2 * u[known])}` },
      { text: `So every component of the first direction is $${ratioTex(factor)}$ times the second's, $k$ included.` },
      { tex: `k = ${ratioTex(factor)} \\times ${paren(m2 * u[missing])} = ${m1 * u[missing]}` },
    ];
  },
};

type Relation = 'same' | 'parallel' | 'meet' | 'skew';

interface RelationParams {
  rel: Relation;
  a: number[];
  b: number[];
  c: number[];
  d: number[];
  m: number;
  j: number;
  lam: number;
  mu: number;
}

const RELATION_LABELS: Record<Relation, string> = {
  same: '\\text{The same line}',
  parallel: '\\text{Parallel, never meeting}',
  meet: '\\text{Intersecting}',
  skew: '\\text{Skew}',
};

/**
 * Two lines in two or three dimensions, drawn from the relation wanted.
 *
 * Parallel and same-line pairs share a direction up to a multiple; crossing
 * pairs are built from their crossing point and the two parameters that reach
 * it; skew pairs are crossing pairs with the second line lifted off in `z`,
 * which leaves the `x` and `y` solution intact and breaks only the third
 * component — exactly the test the lesson teaches.
 */
function sampleRelation(rng: Parameters<Generator['sample']>[0], dims: number, rel: Relation): RelationParams {
  const vec = (lo: number, hi: number) => Array.from({ length: dims }, () => rng.int(lo, hi));
  for (let tries = 0; tries < 200; tries += 1) {
    const b = Array.from({ length: dims }, () => nonZero(rng.int(-3, 3), 1));
    if (rel === 'same' || rel === 'parallel') {
      const m = rng.pick([-2, -1, 2, 3]);
      const j = rng.pick([-2, -1, 1, 2]);
      const a = vec(-4, 4);
      const c = plus(a, scaled(j, b));
      // Every component of the direction is non-zero, so a nudge along one
      // axis is never along the line.
      if (rel === 'parallel') c[rng.int(0, dims - 1)] += rng.pick([-2, -1, 1, 2]);
      if (c.some((x) => Math.abs(x) > 9)) continue;
      return { rel, a, b, c, d: scaled(m, b), m, j, lam: 0, mu: 0 };
    }
    const d = Array.from({ length: dims }, () => nonZero(rng.int(-3, 3), -1));
    // Solvable from x and y alone, which also rules out parallel directions.
    if (cross(b[0], b[1], d[0], d[1]) === 0) continue;
    const p = vec(-4, 4);
    const lam = nonZero(rng.int(-3, 3), 1);
    const mu = nonZero(rng.int(-3, 3), 2);
    const a = minus(p, scaled(lam, b));
    const c = minus(p, scaled(mu, d));
    if (rel === 'skew') c[2] += rng.pick([-2, -1, 1, 2]);
    if ([...a, ...c].some((x) => Math.abs(x) > 9)) continue;
    return { rel, a, b, c, d, m: 0, j: 0, lam, mu };
  }
  return {
    rel: 'meet',
    a: dims === 3 ? [1, 0, 2] : [1, 0],
    b: dims === 3 ? [1, 1, 1] : [1, 1],
    c: dims === 3 ? [0, 1, 2] : [0, 1],
    d: dims === 3 ? [2, 1, 1] : [2, 1],
    m: 0,
    j: 0,
    lam: 1,
    mu: 1,
  };
}

function relationPrompt({ a, b, c, d }: RelationParams, text: string): Block[] {
  return [
    { kind: 'prose', text },
    { kind: 'display', tex: `\\ell_1: \\; ${lineTex(a, b, '\\lambda')}` },
    { kind: 'display', tex: `\\ell_2: \\; ${lineTex(c, d, '\\mu')}` },
  ];
}

/** Working for two lines that cross, or cross in `x` and `y` and not in `z`. */
function crossingWorking(a: Vec, b: Vec, c: Vec, d: Vec, lam: number, mu: number) {
  const names = ['x', 'y', 'z'];
  const steps: { text?: string; tex?: string }[] = [
    { text: 'Set the two lines equal and take the first two components:' },
    { tex: `x: \\; ${affTex(a[0], b[0], '\\lambda')} = ${affTex(c[0], d[0], '\\mu')}` },
    { tex: `y: \\; ${affTex(a[1], b[1], '\\lambda')} = ${affTex(c[1], d[1], '\\mu')}` },
  ];
  if (d[0] === 0 || b[0] === 0) {
    steps.push({
      text: `One of these has only one parameter in it, so it gives that parameter straight away; substituting into the other gives the second. $\\lambda = ${lam}$ and $\\mu = ${mu}$.`,
    });
  } else {
    steps.push({
      text: `Solve the two together, for example by making one parameter the subject of one equation and substituting into the other: $\\lambda = ${lam}$ and $\\mu = ${mu}$.`,
    });
  }
  if (a.length === 3) {
    const z1 = a[2] + lam * b[2];
    const z2 = c[2] + mu * d[2];
    steps.push(
      { text: `Now the ${names[2]} components, with those values:` },
      { tex: `${a[2]} + ${paren(b[2])} \\times ${paren(lam)} = ${z1} \\qquad ${c[2]} + ${paren(d[2])} \\times ${paren(mu)} = ${z2}` },
    );
  }
  return steps;
}

/**
 * How two lines sit: the same line, parallel, crossing, or skew.
 *
 * A decision rather than a calculation, so it is a flow: the direction test
 * comes first because it decides which of the other tests makes sense. The
 * choice form asks for the verdict alone.
 */
const linesRelation: Generator<RelationParams> = {
  id: 'lines-relation',
  choices: (params) =>
    steered(
      options(
        { tex: RELATION_LABELS[params.rel] },
        ...(Object.keys(RELATION_LABELS) as Relation[])
          .filter((rel) => rel !== params.rel)
          .map((rel) => ({ tex: RELATION_LABELS[rel] })),
      ),
      saltOf(params),
    ),
  sample: (rng, difficulty) => {
    const dims = difficulty > 1 && rng.chance(0.65) ? 3 : 2;
    const rel = rng.pick<Relation>(dims === 3 ? ['same', 'parallel', 'meet', 'skew'] : ['same', 'parallel', 'meet']);
    return sampleRelation(rng, dims, rel);
  },
  render: (params): Slide => {
    const { rel, a } = params;
    const three = a.length === 3;
    const answer =
      rel === 'same'
        ? ['Yes', 'Yes']
        : rel === 'parallel'
          ? ['Yes', 'No']
          : three
            ? ['No', 'Three', rel === 'meet' ? 'Yes' : 'No']
            : ['No', 'Two'];
    return {
      kind: 'flow',
      prompt: relationPrompt(
        params,
        'How do these two lines sit relative to each other? Work down the questions; each answer chooses what gets asked next.',
      ),
      subject: '\\ell_1 \\text{ and } \\ell_2',
      steps: [
        {
          id: 'direction',
          ask: 'Is one direction vector a scalar multiple of the other?',
          branches: [
            { label: 'Yes', to: 'point' },
            { label: 'No', to: 'dimension' },
          ],
        },
        {
          id: 'point',
          ask: 'Does the starting point of $\\ell_1$ lie on $\\ell_2$?',
          branches: [
            { label: 'Yes', outcome: 'The same line: parallel, and sharing a point.' },
            { label: 'No', outcome: 'Parallel: the same direction, and they never meet.' },
          ],
        },
        {
          id: 'dimension',
          ask: 'How many components do the vectors have?',
          branches: [
            { label: 'Two', outcome: 'Intersecting: in a plane, lines that are not parallel always cross.' },
            { label: 'Three', to: 'third' },
          ],
        },
        {
          id: 'third',
          ask: 'Solve two components for $\\lambda$ and $\\mu$. Do those values fit the third component as well?',
          branches: [
            { label: 'Yes', outcome: 'Intersecting: one point is on both lines.' },
            { label: 'No', outcome: 'Skew: not parallel, and never meeting.' },
          ],
        },
      ],
      answer,
    };
  },
  solution: ({ rel, a, b, c, d, m, lam, mu }) => {
    if (rel === 'same' || rel === 'parallel') {
      return [
        { text: 'Compare the directions first.' },
        { tex: `${colTex(d)} = ${m}${colTex(b)}` },
        { text: 'One is a multiple of the other, so the lines are parallel, or the same line. Test whether they share a point:' },
        { tex: `${colTex(a)} - ${colTex(c)} = ${colTex(minus(a, c))}` },
        rel === 'same'
          ? { text: 'That is a multiple of the direction, so the start of $\\ell_1$ is on $\\ell_2$. They are the same line, written two ways.' }
          : { text: 'That is not a multiple of the direction, so the start of $\\ell_1$ is off $\\ell_2$. The lines are parallel and never meet.' },
      ];
    }
    const three = a.length === 3;
    return [
      {
        text: `The directions are not multiples of each other: no single scalar turns $${colTex(b)}$ into $${colTex(d)}$. So the lines are not parallel.`,
      },
      ...(three
        ? crossingWorking(a, b, c, d, lam, mu)
        : [{ text: 'In two dimensions that settles it: two lines in a plane that are not parallel always cross.' }]),
      three
        ? rel === 'meet'
          ? { text: 'The third component agrees, so the lines meet.' }
          : { text: 'The third component disagrees. The lines are not parallel and never meet: they are skew, passing one above the other.' }
        : { text: `They cross where $\\lambda = ${lam}$ and $\\mu = ${mu}$.` },
    ];
  },
};

interface ThirdParams {
  a: number[];
  b: number[];
  c: number[];
  d: number[];
  lam: number;
  mu: number;
}

/**
 * Solve two components, then test the third, laid out as a tree: the two
 * parameters on top, each line's `z` beneath its own parameter.
 */
const linesThirdTree: Generator<ThirdParams> = {
  id: 'lines-third-tree',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 200; tries += 1) {
      const b = [nonZero(rng.int(-3, 3), 1), nonZero(rng.int(-3, 3), 2), nonZero(rng.int(-3, 3), -1)];
      // At the first difficulty the second line has no x component, so the x
      // equation gives λ on its own and the pair need no elimination.
      const d =
        difficulty > 1
          ? [nonZero(rng.int(-3, 3), 2), nonZero(rng.int(-3, 3), -1), nonZero(rng.int(-3, 3), 1)]
          : [0, nonZero(rng.int(-3, 3), 1), nonZero(rng.int(-3, 3), 2)];
      if (cross(b[0], b[1], d[0], d[1]) === 0) continue;
      const p = [rng.int(-4, 4), rng.int(-4, 4), rng.int(-4, 4)];
      const lam = nonZero(rng.int(-3, 3), 1);
      const mu = nonZero(rng.int(-3, 3), -1);
      const a = minus(p, scaled(lam, b));
      const c = minus(p, scaled(mu, d));
      if (rng.chance(0.5)) c[2] += rng.pick([-3, -2, -1, 1, 2, 3]);
      if ([...a, ...c].some((x) => Math.abs(x) > 9)) continue;
      return { a, b, c, d, lam, mu };
    }
    return { a: [1, 0, 2], b: [1, 1, 1], c: [2, -1, 3], d: [0, 1, 1], lam: 1, mu: 1 };
  },
  render: (params): Slide => {
    const { a, b, c, d, lam, mu } = params;
    const z1 = a[2] + lam * b[2];
    const z2 = c[2] + mu * d[2];
    const answer = [`${lam}`, `${mu}`, `${z1}`, `${z2}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Solve the $x$ and $y$ components for $\\lambda$ and $\\mu$, then find the $z$ component each line reaches with them. The same value means the lines meet; different values mean they are skew.',
        },
        { kind: 'display', tex: `\\ell_1: \\; ${lineTex(a, b, '\\lambda')}` },
        { kind: 'display', tex: `\\ell_2: \\; ${lineTex(c, d, '\\mu')}` },
      ],
      expression: `z: \\quad ${affTex(a[2], b[2], '\\lambda')} \\quad \\text{and} \\quad ${affTex(c[2], d[2], '\\mu')}`,
      nodes: [
        { id: 'lam', from: [] },
        { id: 'mu', from: [] },
        { id: 'z1', from: ['lam'] },
        { id: 'z2', from: ['mu'] },
      ],
      bank: geometryTreeBank(
        answer,
        [`${-lam}`, `${-mu}`, `${z1 + b[2]}`, `${z2 - d[2]}`],
        // Small values collide with each other; neighbours of each answer
        // keep the bank above two spares whatever they are.
        [lam, mu, z1, z2].flatMap((x) => [`${x + 1}`, `${x - 1}`, `${x + 2}`]),
      ),
      answer,
    };
  },
  solution: ({ a, b, c, d, lam, mu }) => {
    const z1 = a[2] + lam * b[2];
    const z2 = c[2] + mu * d[2];
    return [
      ...crossingWorking(a, b, c, d, lam, mu),
      z1 === z2
        ? { text: `Both lines reach $z = ${z1}$, so the values fit all three components: the lines meet.` }
        : {
            text: `The lines reach $z = ${z1}$ and $z = ${z2}$. The only $\\lambda$ and $\\mu$ that match $x$ and $y$ do not match $z$, so the lines never meet, and they are not parallel: they are skew.`,
          },
    ];
  },
};

interface MeetParams {
  px: number;
  py: number;
  bx: number;
  by: number;
  dx: number;
  dy: number;
  lam: number;
  mu: number;
  ask: 'lambda' | 'mu';
}

/**
 * Two lines in a plane, built from where they cross.
 *
 * At the first difficulty the second line runs straight across or straight
 * up, so one component equation has a single parameter in it. A slider needs
 * the first line heading rightwards, for its marker, and the second line not
 * vertical, or the vertical marker would lie along it.
 */
function sampleMeet(
  rng: Parameters<Generator['sample']>[0],
  difficulty: number,
  slider = false,
): MeetParams {
  for (let tries = 0; tries < 300; tries += 1) {
    const bx = slider ? rng.int(1, 3) : nonZero(rng.int(-3, 3), 1);
    const by = nonZero(rng.int(-3, 3), -1);
    let dx: number;
    let dy: number;
    if (difficulty > 1) {
      dx = nonZero(rng.int(-3, 3), 2);
      dy = nonZero(rng.int(-3, 3), 1);
    } else if (!slider && rng.chance(0.5)) {
      dx = 0;
      dy = nonZero(rng.int(-3, 3), 1);
    } else {
      dx = nonZero(rng.int(-3, 3), 1);
      dy = 0;
    }
    if (cross(bx, by, dx, dy) === 0) continue;
    const px = rng.int(-4, 4);
    const py = rng.int(-4, 4);
    const lam = nonZero(rng.int(-3, 3), 1);
    const mu = nonZero(rng.int(-3, 3), 2);
    const limit = slider ? 7 : 9;
    const ends = [px - lam * bx, py - lam * by, px - mu * dx, py - mu * dy];
    if (ends.some((x) => Math.abs(x) > limit)) continue;
    return { px, py, bx, by, dx, dy, lam, mu, ask: rng.pick(['lambda', 'mu'] as const) };
  }
  return { px: 1, py: 2, bx: 1, by: 1, dx: 2, dy: -1, lam: 1, mu: 1, ask: 'lambda' };
}

function meetLines({ px, py, bx, by, dx, dy, lam, mu }: MeetParams) {
  return {
    a: [px - lam * bx, py - lam * by],
    b: [bx, by],
    c: [px - mu * dx, py - mu * dy],
    d: [dx, dy],
  };
}

function meetDisplays(params: MeetParams) {
  const { a, b, c, d } = meetLines(params);
  return [
    { kind: 'display' as const, tex: `\\ell_1: \\; ${lineTex(a, b, '\\lambda')}` },
    { kind: 'display' as const, tex: `\\ell_2: \\; ${lineTex(c, d, '\\mu')}` },
  ];
}

function meetSolution(params: MeetParams) {
  const { a, b, c, d } = meetLines(params);
  const { px, py, lam, mu } = params;
  return [
    ...crossingWorking(a, b, c, d, lam, mu),
    { text: `Put $\\lambda = ${lam}$ into $\\ell_1$ to find the point:` },
    { tex: `${addMultipleTex(columnTex(a[0], a[1]), lam, columnTex(b[0], b[1]))} = ${columnTex(px, py)}` },
    { text: `$\\mu = ${mu}$ in $\\ell_2$ lands on the same point, $${pointTex(px, py)}$, which checks the working.` },
  ];
}

/** The value of one parameter where two lines cross. */
const linesSolve: Generator<MeetParams> = {
  id: 'lines-solve',
  choices: (params) => {
    const { lam, mu, ask, px, bx, dx } = params;
    const [value, other] = ask === 'lambda' ? [lam, mu] : [mu, lam];
    const { a, c } = meetLines(params);
    return steered(
      signedChoices(value, [other, -value, ask === 'lambda' ? px - a[0] - bx : px - c[0] - dx, value + 1]),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => sampleMeet(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `The lines $\\ell_1$ and $\\ell_2$ meet at one point. Find the value of $${params.ask === 'lambda' ? '\\lambda' : '\\mu'}$ there.`,
      },
      ...meetDisplays(params),
    ],
    // A word in the lead, so the choice form shows more than a lone symbol.
    lead: `\\text{at the crossing, } ${params.ask === 'lambda' ? '\\lambda' : '\\mu'} =`,
    keypad: [],
    answer: `${params.ask === 'lambda' ? params.lam : params.mu}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { a, b, c, d } = meetLines(params);
    return crossingWorking(a, b, c, d, params.lam, params.mu);
  },
};

/** The point where two lines cross, placed as coordinate tiles. */
const linesMeet: Generator<MeetParams> = {
  id: 'lines-meet',
  sample: (rng, difficulty) => sampleMeet(rng, difficulty),
  render: (params): Slide => {
    const { px, py, lam, mu } = params;
    const { a, b, c, d } = meetLines(params);
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: 'Find the point where $\\ell_1$ and $\\ell_2$ meet.' }, ...meetDisplays(params)],
      template: pointTemplate('P'),
      // Each parameter put into the other line's equation.
      bank: bankOf(
        [`${px}`, `${py}`],
        [`${a[0] + mu * b[0]}`, `${a[1] + mu * b[1]}`, `${c[0] + lam * d[0]}`, `${c[1] + lam * d[1]}`],
      ),
      answer: [`${px}`, `${py}`],
    };
  },
  solution: meetSolution,
};

/** Both parameters, then the point from each line: two routes to one place. */
const linesMeetTree: Generator<MeetParams> = {
  id: 'lines-meet-tree',
  sample: (rng, difficulty) => sampleMeet(rng, difficulty),
  render: (params): Slide => {
    const { px, py, lam, mu } = params;
    const { a, b, c, d } = meetLines(params);
    const answer = [`${lam}`, `${mu}`, pointTex(px, py), pointTex(px, py)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Solve for $\\lambda$ and $\\mu$ where the two lines meet, then find the point from each line. Both lines should land on the same point.',
        },
      ],
      expression: `${columnTex(a[0], a[1])} + \\lambda${columnTex(b[0], b[1])} = ${columnTex(c[0], c[1])} + \\mu${columnTex(d[0], d[1])}`,
      nodes: [
        { id: 'lam', from: [] },
        { id: 'mu', from: [] },
        { id: 'p1', from: ['lam'] },
        { id: 'p2', from: ['mu'] },
      ],
      bank: geometryTreeBank(
        answer,
        [`${-lam}`, `${-mu}`, pointTex(a[0] + mu * b[0], a[1] + mu * b[1]), pointTex(c[0] + lam * d[0], c[1] + lam * d[1])],
        [`${lam + 1}`, pointTex(px, py + 1)],
      ),
      answer,
    };
  },
  solution: meetSolution,
};

/** Drag along one line to where the other crosses it. */
const linesMeetSlider: Generator<MeetParams> = {
  id: 'lines-meet-slider',
  sample: (rng, difficulty) => sampleMeet(rng, difficulty, true),
  render: (params): Slide => {
    const span = 8;
    const { a, b, c, d } = meetLines(params);
    const [lo, hi] = tRange(a, b, span) ?? [-6, 6];
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'The solid line is $\\ell_1$, with a dot at every whole value of $\\lambda$ and $A$ where $\\lambda = 0$. The dashed line is $\\ell_2$. Slide $\\lambda$ until the marker passes through the point where they cross.',
        },
        ...meetDisplays(params),
      ],
      min: Math.max(-6, Math.ceil(lo)),
      max: Math.min(6, Math.floor(hi)),
      step: 1,
      answer: params.lam,
      readout: '\\lambda = {v}',
      figure: {
        svg: linesSvg(
          [
            { a, b, dots: true },
            { a: c, b: d, dashed: true },
          ],
          [{ at: a, name: 'A' }],
          { span, label: 'Two lines on squared paper, the first with a dot at each whole value of lambda' },
        ),
        xMin: (-span - a[0]) / b[0],
        xMax: (span - a[0]) / b[0],
        axis: 'x',
        origin: 0,
      },
    };
  },
  solution: meetSolution,
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
  between,
  betweenSlider,
  endpoint,
  direction,
  midpoint,
  section,
  sectionTree,
  sectionFractionGen,
  ratioSlider,
  lineTest,
  collinearK,
  onLine,
  fourthVertex,
  fourthVertexTree,
  quadFlow,
  path,
  pathCoefficientsGen,
  pathTree,
  pathParallel,
  linePointAt,
  linePointAtSteps,
  lineDirection,
  lineTSlider,
  lineSame,
  lineThroughTwo,
  lineTwoPointsAtTree,
  lineFindT,
  lineContains,
  lineMissingCoord,
  linesParallelK,
  linesRelation,
  linesThirdTree,
  linesSolve,
  linesMeet,
  linesMeetTree,
  linesMeetSlider,
] as unknown as Generator<unknown>[];
