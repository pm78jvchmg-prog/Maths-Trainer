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
import { coeffTex, gcd, plusMinus } from './format';
import {
  bankOf,
  columnTex,
  distinctOptions,
  nonZero,
  signedChoices,
  signedOffer,
  solvedForTex,
  VECTOR_TEMPLATE,
} from './vectorFormat';
import { surdParts } from './format';
import { WORKING_KEYS } from './workingKeys';

/** Magnitudes are surds. */
const SURD_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'sqrt(' }];

/**
 * A vector in i, j form, for prose and solutions. The same as `ijOf`, which
 * also leaves out a zero component: `-2\mathbf{j}`, not `0\mathbf{i} - 2\mathbf{j}`.
 */
function ijTex(x: number, y: number): string {
  return ijOf([x, y]);
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
      {
        tex:
          b === 1
            ? `${a * cx} + k = 0 \\implies k = ${k}`
            : `${a * cx} + ${b}k = 0 \\implies k = \\frac{${-a * cx}}{${b}} = ${k}`,
      },
      {
        text: `Check it: $\\left(${a}\\right)\\left(${cx}\\right) + \\left(${b}\\right)\\left(${k}\\right) = ${a * cx} ${plusMinus(b * k)} = 0$.`,
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
  sample: (rng, difficulty) => {
    const x = nonZero(rng.int(difficulty > 1 ? -8 : 1, 8), 3);
    const drawY = () => nonZero(rng.int(difficulty > 1 ? -8 : -6, 8), -2);
    let y = drawY();
    // Equal sizes would make the swapped distractor the given vector or its
    // negative, both parallel: a second right answer marked wrong.
    while (Math.abs(y) === Math.abs(x)) y = drawY();
    const k = nonZero(rng.int(difficulty > 1 ? -4 : 2, 4), 2);
    // k = 1 would offer the given vector itself as the parallel one.
    return { x, y, k: k === 1 ? -2 : k };
  },
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
    { tex: `${coeffTex(k, `\\left(${ijTex(x, y)}\\right)`)} = ${ijTex(k * x, k * y)}` },
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
      // The magnitude simplified, so a whole one reads 5 rather than the root of 25.
      { tex: `\\frac{1}{${surdTex(sq)}}`, answer: `1/sqrt(${sq})` },
      { tex: surdTex(sq), answer: `sqrt(${sq})` },
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
    // The magnitude with any square factor taken out: 5, or 3\sqrt{5} for \sqrt{45}.
    const mag = surdTex(sq);
    const simpler = mag !== `\\sqrt{${sq}}`;
    return [
      {
        text: 'Scaling multiplies the length by the scalar, so the scalar that lands on length 1 is one over the length the vector already has.',
      },
      { tex: `\\left| ${columnTex(x, y)} \\right| = \\sqrt{${x * x} + ${y * y}} = \\sqrt{${sq}}${simpler ? ` = ${mag}` : ''}` },
      { tex: `k = \\frac{1}{\\sqrt{${sq}}}${simpler ? ` = \\frac{1}{${mag}}` : ''}` },
      {
        text: whole
          ? `So $k = \\frac{1}{${size}}$, and $k${columnTex(x, y)} = ${columnTex(x / size, y / size)}$, which has length 1.`
          : `$${sq}$ is not a perfect square, so $\\frac{1}{${mag}}$ is the exact answer. A decimal would be a rounded one.`,
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

/** \sqrt{n}, followed by its simplest form when a square factor comes out: \sqrt{45} = 3\sqrt{5}. */
function magnitudeTex(n: number): string {
  const simplest = surdTex(n);
  return simplest === `\\sqrt{${n}}` ? simplest : `\\sqrt{${n}} = ${simplest}`;
}

/**
 * dot over the root of `product` in lowest terms: the square factor taken out
 * of the root and cancelled against the top. 15 over \sqrt{45 \times 5} is 1.
 */
function cosineTex(dot: number, product: number): string {
  const { k, m } = surdParts(product);
  const g = gcd(dot, k);
  const top = Math.abs(dot) / g;
  const under = k / g;
  const sign = dot < 0 ? '-' : '';
  if (m === 1) return under === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${under}}`;
  return `${sign}\\frac{${top}}{${under === 1 ? '' : under}\\sqrt{${m}}}`;
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
      { tex: `|\\mathbf{a}| = ${magnitudeTex(sa)} \\qquad |\\mathbf{b}| = ${magnitudeTex(sb)}` },
      { tex: `\\cos\\theta = \\frac{${dot}}{\\sqrt{${sa}}\\sqrt{${sb}}}${surdParts(sa * sb).k === 1 ? '' : ` = ${cosineTex(dot, sa * sb)}`}` },
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
      // Two lines: three columns and an arrow run off a phone.
      { tex: `\\overrightarrow{${from}${to}} = ${columnTex(tx, ty)} - ${columnTex(fx, fy)}` },
      { tex: `= ${columnTex(x, y)}` },
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
        { tex: `${second} = ${coeffTex(k, first)}` },
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
      { tex: `${cx - ax} = ${t} \\times ${dx < 0 ? `\\left(${dx}\\right)` : dx} \\implies \\overrightarrow{AC} = ${coeffTex(t, '\\overrightarrow{AB}')}` },
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
      { tex: `C${pointTex(cx, cy)}: \\quad \\overrightarrow{AC} = ${columnTex(t * dx, t * dy)} = ${coeffTex(t, '\\overrightarrow{AB}')}` },
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
      { tex: `${tex(k * r, k * s)} = ${scale.n < 0 ? '-' : ''}${termTex(ratio(Math.abs(scale.n), scale.d), `\\left(${tex(j * r, j * s)}\\right)`)}` },
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
 * A whole-number slider track over the part of a line the figure shows,
 * trimmed so its handle does not start on the answer.
 *
 * An untouched handle rests at the middle of the track (`defaultSliderValue`
 * in `src/ui/sliderValue.ts`, mirrored here). Whether or not that grades, a
 * marker already sitting on the crossing gives the question away.
 */
function trackAround(lo: number, hi: number, answer: number): [number, number] {
  let min = Math.max(-6, Math.ceil(lo));
  let max = Math.min(6, Math.floor(hi));
  const rest = () => min + Math.round((max - min) / 2);
  for (let tries = 0; tries < 4 && rest() === answer; tries += 1) {
    if (max - 1 > answer) max -= 1;
    else if (min + 1 < answer) min += 1;
  }
  return [min, max];
}

/**
 * Whether a slider along `a + t b` asking for `answer` is worth setting: a
 * track of at least five stops that does not rest on the answer. A steep line
 * crosses the figure in a few steps of `t`, and a two-stop track is a coin
 * toss, so the samplers draw again instead.
 */
function trackUsable(a: Vec, b: Vec, answer: number, span: number): boolean {
  const range = tRange(a, b, span);
  if (!range) return false;
  const [min, max] = trackAround(range[0], range[1], answer);
  return max - min >= 4 && min + Math.round((max - min) / 2) !== answer;
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
      if (!trackUsable([ax, ay], [bx, by], t, 8)) continue;
      return { ax, ay, bx, by, t };
    }
    return { ax: -2, ay: 1, bx: 1, by: 2, t: 2 };
  },
  render: ({ ax, ay, bx, by, t }): Slide => {
    const span = 8;
    const [lo, hi] = tRange([ax, ay], [bx, by], span) ?? [-6, 6];
    const track = trackAround(lo, hi, t);
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
      min: track[0],
      max: track[1],
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
      { tex: `${columnTex(ax, ay)} + ${paren(t)}${columnTex(bx, by)}` },
      { tex: `= ${columnTex(px, py)}` },
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
          { tex: `\\overrightarrow{AB} = ${columnTex(ax + dx, ay + dy)} - ${columnTex(ax, ay)}` },
          { tex: `= ${columnTex(dx, dy)}` },
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
    { tex: `${coeffTex(k, '\\overrightarrow{AB}')} = ${columnTex(k * dx, k * dy)}` },
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
    // `-t = -2`, not `-1t = -2`; and with a coefficient of 1 there is nothing to divide by.
    const solved = (c: number, rhs: number) => (c === 1 ? `t = ${t}` : `${coeffTex(c, 't')} = ${rhs} \\implies t = ${t}`);
    const steps: { text?: string; tex?: string }[] = [
      {
        text: useX
          ? 'Set the line equal to $P$ and take one component. Across:'
          : 'The direction has no across component, so every point of the line has the same $x$. Take the up component instead:',
      },
      useX ? { tex: `${affTex(ax, bx, 't')} = ${px}` } : { tex: `${affTex(ay, by, 't')} = ${py}` },
      useX ? { tex: solved(bx, px - ax) } : { tex: solved(by, py - ay) },
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
    // A component that already reads `t = 2` has nothing left to solve.
    const solve = (c: number, b: number, value: number, t: number) =>
      affTex(c, b, 't') === 't' ? `t = ${t}` : `${affTex(c, b, 't')} = ${value} \\implies t = ${t}`;
    return [
      { text: 'Set the line equal to $P$ and solve each component for $t$ separately.' },
      { tex: solve(ax, bx, px, tx) },
      { tex: solve(ay, by, py, ty) },
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
    // Unlabelled: three-component columns leave no room on a phone for a name
    // in front, so the prose says "first" and "second" instead.
    { kind: 'display', tex: lineTex(a, b, '\\lambda') },
    { kind: 'display', tex: lineTex(c, d, '\\mu') },
  ];
}

/** Working for two lines that cross, or cross in `x` and `y` and not in `z`. */
function crossingWorking(a: Vec, b: Vec, c: Vec, d: Vec, lam: number, mu: number) {
  const names = ['x', 'y', 'z'];
  const steps: { text?: string; tex?: string }[] = [
    { text: 'Set the two lines equal and take the first two components:' },
    { tex: `x\\colon \\; ${affTex(a[0], b[0], '\\lambda')} = ${affTex(c[0], d[0], '\\mu')}` },
    { tex: `y\\colon \\; ${affTex(a[1], b[1], '\\lambda')} = ${affTex(c[1], d[1], '\\mu')}` },
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
      { tex: `${a[2]} + ${paren(b[2])} \\times ${paren(lam)} = ${z1}` },
      { tex: `${c[2]} + ${paren(d[2])} \\times ${paren(mu)} = ${z2}` },
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
      // The directions, since the first fork is about them.
      subject: `\\text{directions } ${colTex(params.b)}, \\; ${colTex(params.d)}`,
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
          ask: 'Does the starting point of the first line lie on the second?',
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
          ? { text: 'That is a multiple of the direction, so the start of the first line is on the second. They are the same line, written two ways.' }
          : { text: 'That is not a multiple of the direction, so the start of the first line is off the second. The lines are parallel and never meet.' },
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
        { kind: 'display', tex: lineTex(a, b, '\\lambda') },
        { kind: 'display', tex: lineTex(c, d, '\\mu') },
      ],
      // Each side braced, so a leading minus after "and" reads as a sign
      // rather than a subtraction.
      expression: `z\\colon \\; {${affTex(a[2], b[2], '\\lambda')}} \\; \\text{and} \\; {${affTex(c[2], d[2], '\\mu')}}`,
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
    if (slider && !trackUsable([ends[0], ends[1]], [bx, by], lam, 8)) continue;
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
      // Two rows: four columns on one line run off a phone.
      expression: `\\begin{gathered} ${columnTex(a[0], a[1])} + \\lambda${columnTex(b[0], b[1])} \\\\ = ${columnTex(c[0], c[1])} + \\mu${columnTex(d[0], d[1])} \\end{gathered}`,
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
    const track = trackAround(lo, hi, params.lam);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'The solid line is $\\ell_1$, with a dot at every whole value of $\\lambda$ and $A$ where $\\lambda = 0$. The dashed line is $\\ell_2$. Slide $\\lambda$ until the marker passes through the point where they cross.',
        },
        ...meetDisplays(params),
      ],
      min: track[0],
      max: track[1],
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

/* ---------- Level 8: planes and the cross product ---------- */

/*
 * Level 8 is three-dimensional throughout. It opens with the cross product,
 * the one operation that makes a vector perpendicular to two others, and then
 * uses it for what it is for: areas, the normal to a plane, and the equation
 * of a plane through three points, closing where a line from level 6 meets a
 * plane.
 *
 * As in level 6, every question is built outward from the numbers it wants
 * to end on: the unknown that makes a component come out, the point a line
 * meets a plane at, the pair of vectors whose cross product has a whole
 * length. Nothing here rejects random draws until one happens to be whole,
 * except the areas, where a whole magnitude is rare enough to sample for and
 * common enough to find within a few dozen tries.
 *
 * Answers stay scalars or tiles for the reason `vectorFormat.ts` gives. A
 * three-component answer is placed as three labelled tiles, `\mathbf{i}`,
 * `\mathbf{j}` and `\mathbf{k}`, the same way a two-component one is; a whole
 * column may also be one tile, as in level 6.
 */

type Draw = Parameters<Generator['sample']>[0];

const AXES = ['x', 'y', 'z'];
const UNITS = ['\\mathbf{i}', '\\mathbf{j}', '\\mathbf{k}'];

/**
 * The component template for a three-component answer, written as a row.
 *
 * Not the labelled `\\mathbf{i}: {0}` form two components use: three labels
 * and three two-digit tiles are wider than a phone, and the row wraps with
 * the last label on one line and its blank on the next.
 */
const CROSS_TEMPLATE = '( {0} , \\; {1} , \\; {2} )';

/**
 * The coordinate template for a point in space: the same row, unnamed. A name
 * in front, `P = (`, pushes the closing bracket onto a line of its own.
 */
const POINT3_TEMPLATE = CROSS_TEMPLATE;

/** `a x b`, each component from the other two, in the cyclic order x, y, z. */
function crossOf(u: Vec, v: Vec): Vec {
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

function dotOf(u: Vec, v: Vec): number {
  return u.reduce((sum, x, i) => sum + x * v[i], 0);
}

function vec3(rng: Draw, lo: number, hi: number): Vec {
  return [rng.int(lo, hi), rng.int(lo, hi), rng.int(lo, hi)];
}

const nonZeroCount = (v: Vec) => v.filter((x) => x !== 0).length;

/** The whole square root of `n`, or undefined when it is not a perfect square. */
function wholeRoot(n: number): number | undefined {
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : undefined;
}

function point3Tex(v: Vec | string[]): string {
  return `\\left(${v.join(', ')}\\right)`;
}

/** `2x - y + 3z`, as written by hand, dropping any term with a zero coefficient. */
function linearTex(n: Vec): string {
  let out = '';
  n.forEach((c, i) => {
    if (c === 0) return;
    const size = Math.abs(c) === 1 ? '' : `${Math.abs(c)}`;
    out += out === '' ? `${c < 0 ? '-' : ''}${size}${AXES[i]}` : ` ${c < 0 ? '-' : '+'} ${size}${AXES[i]}`;
  });
  return out;
}

/** A plane in Cartesian form. */
function planeTex(n: Vec, d: number): string {
  return `${linearTex(n)} = ${d}`;
}

/** A plane in scalar-product form. */
function planeVectorTex(n: Vec, d: number): string {
  return `\\mathbf{r} \\cdot ${colTex(n)} = ${d}`;
}

/**
 * A number in brackets when it is negative, for products written side by
 * side. Plain brackets rather than `\\left(`, whose extra spacing is the
 * difference between a line of working fitting a phone and not.
 */
function bracket(x: number): string {
  return x < 0 ? `(${x})` : `${x}`;
}

/**
 * Values put into `n_x x + n_y y + n_z z` as a learner writes it on paper,
 * `2(3) - k - (-2)`, skipping the terms with a zero coefficient. Short enough
 * to sit on one line of a phone, which the same sum written with a times sign
 * between every pair is not.
 */
function substituteTex(n: Vec, entries: string[]): string {
  let out = '';
  n.forEach((c, i) => {
    if (c === 0) return;
    const size = Math.abs(c) === 1 ? '' : `${Math.abs(c)}`;
    const entry = entries[i];
    const numeric = !Number.isNaN(Number(entry));
    // A zero after a leading bare minus is bracketed too: `-(0)`, never `-0`.
    const value =
      numeric && (size !== '' || Number(entry) < 0 || (c < 0 && out === '' && Number(entry) === 0)) ? `(${entry})` : entry;
    const sign = c < 0 ? '-' : out === '' ? '' : '+';
    out += out === '' ? `${sign}${size}${value}` : ` ${sign} ${size}${value}`;
  });
  return out === '' ? '0' : out;
}

/** The plane as a display, in whichever form the question uses. */
function planeDisplay(n: Vec, d: number, form: 'cartesian' | 'vector'): Block {
  // Braced, so a leading minus after the colon reads as a sign, not a subtraction.
  return { kind: 'display', tex: `\\Pi\\colon \\; {${form === 'cartesian' ? planeTex(n, d) : planeVectorTex(n, d)}}` };
}

/** Whether `m . r = e` and `n . r = d` are one plane: the same equation, rescaled. */
function samePlane(m: Vec, e: number, n: Vec, d: number): boolean {
  return nonZeroCount(m) > 0 && crossOf(m, n).every((x) => x === 0) && m.every((x, i) => x * d === e * n[i]);
}

/** Two vectors side by side. Two three-component columns fit a phone; three do not. */
function pairTex(a: Vec, b: Vec, names = ['\\mathbf{a}', '\\mathbf{b}']): string {
  return `${names[0]} = ${colTex(a)}, \\quad ${names[1]} = ${colTex(b)}`;
}

/** The three component calculations of `a x b`, for worked solutions. */
function crossSteps(a: Vec, b: Vec): { text?: string; tex?: string }[] {
  const n = crossOf(a, b);
  return [0, 1, 2].flatMap((i) => {
    const j = (i + 1) % 3;
    const k = (i + 2) % 3;
    return [
      // The second factor always bracketed, or 2 times 3 would read as 23.
      { tex: `${AXES[i]}\\colon \\; {${a[j]}(${b[k]}) - ${bracket(a[k])}(${b[j]})}` },
      { tex: `= ${a[j] * b[k]} - ${paren(a[k] * b[j])} = ${n[i]}` },
    ];
  });
}

/** `n` divided through by its common factor, first non-zero entry positive. */
function simplest(n: Vec): Vec {
  const g = n.reduce((acc, x) => gcd(acc, x), 0) || 1;
  const lead = n.find((x) => x !== 0) ?? 1;
  return n.map((x) => ((lead < 0 ? -1 : 1) * x) / g);
}

interface CrossParams {
  a: Vec;
  b: Vec;
}

/** Two vectors whose cross product has no zero component, so no entry is free. */
function sampleCross(rng: Draw, difficulty: number): CrossParams {
  const span = difficulty > 1 ? 5 : 3;
  for (let tries = 0; tries < 200; tries += 1) {
    const a = vec3(rng, -span, span);
    const b = vec3(rng, -span, span);
    if (nonZeroCount(crossOf(a, b)) === 3) return { a, b };
  }
  return { a: [1, 2, 3], b: [2, -1, 1] };
}

function crossSolution({ a, b }: CrossParams) {
  return [
    {
      text: 'Each component of $\\mathbf{a} \\times \\mathbf{b}$ is built from the other two components of each vector, cross-multiplied and subtracted, following the cycle $x \\to y \\to z \\to x$.',
    },
    ...crossSteps(a, b),
    { tex: `\\mathbf{a} \\times \\mathbf{b} = ${colTex(crossOf(a, b))}` },
    {
      text: 'The middle component is where a sign usually goes wrong. Following the cycle it is $a_z b_x - a_x b_z$, starting from $z$ rather than from $x$.',
    },
  ];
}

/** The cross product, placed as three component tiles. */
const crossProduct: Generator<CrossParams> = {
  id: 'cross-product',
  choices: (params) => {
    const { a, b } = params;
    const n = crossOf(a, b);
    return steered(
      options(
        { tex: colTex(n) },
        // b x a, the middle sign, and multiplying matching components.
        { tex: colTex(scaled(-1, n)) },
        { tex: colTex([n[0], -n[1], n[2]]) },
        { tex: colTex([a[0] * b[0], a[1] * b[1], a[2] * b[2]]) },
      ),
      saltOf(params),
    );
  },
  sample: sampleCross,
  render: ({ a, b }): Slide => {
    const n = crossOf(a, b);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work out $\\mathbf{a} \\times \\mathbf{b}$.' },
        { kind: 'display', tex: pairTex(a, b) },
      ],
      template: CROSS_TEMPLATE,
      // The slips: the middle sign, adding where the formula subtracts, the
      // whole thing the wrong way round, and matching components multiplied.
      bank: bankOf(
        n.map(String),
        [`${-n[1]}`, `${a[1] * b[2] + a[2] * b[1]}`, `${-n[0]}`, `${a[0] * b[0]}`],
      ),
      answer: n.map(String),
    };
  },
  solution: crossSolution,
};

interface EntryParams extends CrossParams {
  i: number;
}

/**
 * One component of a cross product with its working shown, starting from the
 * formula in letters: which two entries pair up is half of what is being
 * practised, so the line opens as `a_y b_z - a_z b_y` rather than as numbers.
 */
const crossEntrySteps: Generator<EntryParams> = {
  id: 'cross-entry-steps',
  sample: (rng, difficulty) => ({ ...sampleCross(rng, difficulty), i: rng.int(0, 2) }),
  render: ({ a, b, i }): Slide => {
    const j = (i + 1) % 3;
    const k = (i + 2) % 3;
    const p = a[j] * b[k];
    const q = a[k] * b[j];
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `The $${AXES[i]}$ component of $\\mathbf{a} \\times \\mathbf{b}$ is $a_${AXES[j]} b_${AXES[k]} - a_${AXES[k]} b_${AXES[j]}$. Read each product off the vectors, then subtract.`,
        },
        { kind: 'display', tex: pairTex(a, b) },
      ],
      start: [`a_${AXES[j]} b_${AXES[k]}`, '-', `a_${AXES[k]} b_${AXES[j]}`],
      reductions: [
        {
          span: [0, 1],
          value: `${p}`,
          // Matching components, which is the dot product's pattern.
          bank: scattered([`${p}`, `${a[j] * b[j]}`, `${a[k] * b[k]}`, `${-p}`, `${a[j] + b[k]}`]),
        },
        {
          span: [2, 3],
          value: paren(q),
          bank: scattered([paren(q), paren(-q), paren(a[j] * b[j]), paren(a[k] + b[j])]),
        },
        {
          span: [0, 3],
          operator: 1,
          value: `${p - q}`,
          bank: scattered([`${p - q}`, `${p + q}`, `${q - p}`, `${p - q + 1}`]),
        },
      ],
    };
  },
  solution: ({ a, b, i }) => {
    const j = (i + 1) % 3;
    const k = (i + 2) % 3;
    return [
      {
        text: `For the $${AXES[i]}$ component, leave out the $${AXES[i]}$ entries and cross-multiply the other two, in the order the cycle $x \\to y \\to z$ gives.`,
      },
      { tex: `a_${AXES[j]} b_${AXES[k]} = ${a[j]} \\times ${paren(b[k])} = ${a[j] * b[k]}` },
      { tex: `a_${AXES[k]} b_${AXES[j]} = ${a[k]} \\times ${paren(b[j])} = ${a[k] * b[j]}` },
      { tex: `${a[j] * b[k]} - ${paren(a[k] * b[j])} = ${a[j] * b[k] - a[k] * b[j]}` },
    ];
  },
};

type RuleCase = 'swap' | 'scale' | 'scale-second' | 'swap-scale' | 'unit';

interface RuleParams {
  rule: RuleCase;
  n: Vec;
  k: number;
  u: number;
  v: number;
}

/**
 * The algebra of the cross product: the order matters, scalars come out, and
 * the unit vectors go round in a cycle. Each question gives one cross product
 * and asks for a relative of it, so nothing is recomputed from scratch.
 */
const crossRules: Generator<RuleParams> = {
  id: 'cross-rules',
  sample: (rng, difficulty) => {
    const rules: RuleCase[] = difficulty > 1 ? ['swap-scale', 'scale', 'scale-second', 'unit'] : ['swap', 'swap', 'unit'];
    const n = [nonZero(rng.int(-6, 6), 2), nonZero(rng.int(-6, 6), -3), nonZero(rng.int(-6, 6), 1)];
    return {
      rule: rng.pick(rules),
      n,
      k: rng.pick(difficulty > 1 ? [-3, -2, 2, 3, 4] : [2, 3]),
      u: rng.int(0, 2),
      v: rng.int(0, 2),
    };
  },
  render: (params): Slide => {
    const { rule, n, k, u, v } = params;
    const salt = saltOf(params);
    if (rule === 'unit') {
      const self = u === v;
      const w = 3 - u - v;
      const forwards = v === (u + 1) % 3;
      const answer = self ? '\\mathbf{0}' : `${forwards ? '' : '-'}${UNITS[w]}`;
      const wrong = self
        ? [UNITS[u], '1', UNITS[(u + 1) % 3]]
        : [`${forwards ? '-' : ''}${UNITS[w]}`, '\\mathbf{0}', UNITS[u]];
      return {
        kind: 'choice',
        prompt: [{ kind: 'prose', text: `Find $${UNITS[u]} \\times ${UNITS[v]}$.` }],
        options: placeAnswer(
          { id: 'answer', label: answer },
          wrong.map((label, idx) => ({ id: `slip${idx}`, label })),
          salt,
        ),
        correctId: 'answer',
      };
    }
    const target = {
      swap: '\\mathbf{b} \\times \\mathbf{a}',
      scale: `\\left(${k}\\mathbf{a}\\right) \\times \\mathbf{b}`,
      'scale-second': `\\mathbf{a} \\times \\left(${k}\\mathbf{b}\\right)`,
      'swap-scale': `\\left(${k}\\mathbf{b}\\right) \\times \\mathbf{a}`,
    }[rule];
    const factor = { swap: -1, scale: k, 'scale-second': k, 'swap-scale': -k }[rule];
    const answer = scaled(factor, n);
    // The same numbers with the order ignored, the scalar ignored or applied
    // to one component, and the order and scalar both reversed.
    const wrong =
      rule === 'swap'
        ? [n, [n[2], n[1], n[0]], [-n[0], n[1], -n[2]]]
        : [scaled(-factor, n), rule === 'swap-scale' ? scaled(-1, n) : n, [factor * n[0], n[1], n[2]]];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'You are told that' },
        { kind: 'display', tex: `\\mathbf{a} \\times \\mathbf{b} = ${colTex(n)}` },
        { kind: 'prose', text: `Find $${target}$.` },
      ],
      options: placeAnswer(
        { id: 'answer', label: colTex(answer) },
        wrong.map((w, idx) => ({ id: `slip${idx}`, label: colTex(w) })),
        salt,
      ),
      correctId: 'answer',
    };
  },
  solution: ({ rule, n, k, u, v }) => {
    if (rule === 'unit') {
      if (u === v) {
        return [
          { text: 'A vector crossed with itself is the zero vector: it is parallel to itself, and parallel vectors span no area.' },
          { tex: `${UNITS[u]} \\times ${UNITS[u]} = \\mathbf{0}` },
          { text: 'The answer $1$ belongs to the dot product, $\\mathbf{i} \\cdot \\mathbf{i} = 1$, which gives a number rather than a vector.' },
        ];
      }
      const w = 3 - u - v;
      const forwards = v === (u + 1) % 3;
      return [
        { text: 'The unit vectors follow the cycle $\\mathbf{i} \\to \\mathbf{j} \\to \\mathbf{k} \\to \\mathbf{i}$. Going round the cycle gives the third one; going against it gives its negative.' },
        { text: 'So $\\mathbf{i} \\times \\mathbf{j} = \\mathbf{k}$, $\\mathbf{j} \\times \\mathbf{k} = \\mathbf{i}$ and $\\mathbf{k} \\times \\mathbf{i} = \\mathbf{j}$.' },
        { tex: `${UNITS[u]} \\times ${UNITS[v]} = ${forwards ? '' : '-'}${UNITS[w]}` },
      ];
    }
    const factor = { swap: -1, scale: k, 'scale-second': k, 'swap-scale': -k }[rule];
    const steps: { text?: string; tex?: string }[] = [];
    if (rule === 'swap' || rule === 'swap-scale') {
      steps.push({ text: 'Swapping the order of a cross product reverses it: $\\mathbf{b} \\times \\mathbf{a} = -\\left(\\mathbf{a} \\times \\mathbf{b}\\right)$.' });
    }
    if (rule !== 'swap') {
      steps.push({ text: `A scalar on either vector comes outside the whole product, once: it multiplies every component by $${k}$.` });
    }
    steps.push({ tex: `${factor}${colTex(n)} = ${colTex(scaled(factor, n))}` });
    return steps;
  },
};

interface UnknownParams extends CrossParams {
  i: number;
  side: 'a' | 'b';
  pos: number;
}

/** How the unknown entry enters component `i`: `coef * k + rest`. */
function unknownTerms({ a, b, i, side, pos }: UnknownParams): { coef: number; rest: number; value: number } {
  const j = (i + 1) % 3;
  const k = (i + 2) % 3;
  const n = crossOf(a, b)[i];
  const coef = side === 'a' ? (pos === j ? b[k] : -b[j]) : pos === k ? a[j] : -a[k];
  const value = side === 'a' ? a[pos] : b[pos];
  return { coef, rest: n - coef * value, value };
}

/** An unknown entry, found from one component of the cross product. */
const crossUnknown: Generator<UnknownParams> = {
  id: 'cross-unknown',
  choices: (params) => {
    const { coef, rest, value } = unknownTerms(params);
    const n = crossOf(params.a, params.b)[params.i];
    return steered(
      // The component taken the wrong way round, which negates it.
      signedChoices(value, [-value, (-n - rest) / coef, value + 1, n]),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 5 : 3;
    for (let tries = 0; tries < 200; tries += 1) {
      const a = vec3(rng, -span, span);
      const b = vec3(rng, -span, span);
      const i = rng.int(0, 2);
      const side = rng.pick(['a', 'b'] as const);
      const pos = rng.pick([(i + 1) % 3, (i + 2) % 3]);
      const params = { a, b, i, side, pos };
      const { coef, value } = unknownTerms(params);
      if (coef === 0 || value === 0) continue;
      return params;
    }
    return { a: [1, 2, 3], b: [2, -1, 1], i: 2, side: 'a', pos: 1 };
  },
  render: (params): Slide => {
    const { a, b, i, side, pos } = params;
    const entries = (v: Vec, name: 'a' | 'b') => columnOf(v.map((x, idx) => (name === side && idx === pos ? 'k' : `${x}`)));
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `The $${AXES[i]}$ component of $\\mathbf{a} \\times \\mathbf{b}$ is $${crossOf(a, b)[i]}$. Find $k$.`,
        },
        { kind: 'display', tex: `\\mathbf{a} = ${entries(a, 'a')}, \\quad \\mathbf{b} = ${entries(b, 'b')}` },
      ],
      lead: 'k =',
      keypad: [],
      answer: `${unknownTerms(params).value}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, b, i, side, pos } = params;
    const j = (i + 1) % 3;
    const k = (i + 2) % 3;
    const { coef, rest, value } = unknownTerms(params);
    const n = crossOf(a, b)[i];
    const entry = (v: Vec, name: 'a' | 'b', idx: number) =>
      name === side && idx === pos ? 'k' : `(${v[idx]})`;
    return [
      { text: `Write the $${AXES[i]}$ component with $k$ in place: $a_${AXES[j]} b_${AXES[k]} - a_${AXES[k]} b_${AXES[j]}$.` },
      { tex: `${entry(a, 'a', j)}${entry(b, 'b', k)} - ${entry(a, 'a', k)}${entry(b, 'b', j)} = ${n}` },
      { tex: `${affTex(rest, coef, 'k')} = ${n}` },
      { tex: solvedForTex(coef, 'k', n - rest, `k = ${value}`) },
    ];
  },
};

interface PerpParams extends CrossParams {
  m: number;
}

/** Which vector is perpendicular to both: any multiple of the cross product. */
const crossPerpendicular: Generator<PerpParams> = {
  id: 'cross-perpendicular',
  sample: (rng, difficulty) => ({
    ...sampleCross(rng, difficulty > 1 ? 2 : 1),
    m: difficulty > 1 ? rng.pick([1, -1, 2]) : 1,
  }),
  render: (params): Slide => {
    const { a, b, m } = params;
    const n = crossOf(a, b);
    const answer = scaled(m, simplest(n));
    const perpendicular = (w: Vec) => dotOf(w, a) === 0 && dotOf(w, b) === 0;
    const wrong = [
      [n[0], -n[1], n[2]],
      plus(a, b),
      [a[0] * b[0], a[1] * b[1], a[2] * b[2]],
      [n[0], n[1], -n[2]],
      plus(n, [1, 0, 0]),
    ]
      .filter((w) => nonZeroCount(w) > 0 && !perpendicular(w))
      .slice(0, 3);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Which of these vectors is perpendicular to both $\\mathbf{a}$ and $\\mathbf{b}$?' },
        { kind: 'display', tex: pairTex(a, b) },
      ],
      options: placeAnswer(
        { id: 'normal', label: colTex(answer) },
        wrong.map((w, idx) => ({ id: `slip${idx}`, label: colTex(w) })),
        saltOf(params),
      ),
      correctId: 'normal',
    };
  },
  solution: ({ a, b, m }) => {
    const n = crossOf(a, b);
    const answer = scaled(m, simplest(n));
    return [
      { text: 'The cross product is perpendicular to both vectors it is made from.' },
      { tex: `\\mathbf{a} \\times \\mathbf{b} = ${colTex(n)}` },
      {
        text:
          answer.join() === n.join()
            ? 'That is the answer as it stands.'
            : 'Any non-zero multiple points along the same line, so it is perpendicular to both as well. The option offered is this one:',
      },
      ...(answer.join() === n.join() ? [] : [{ tex: `${colTex(answer)}` }]),
      { text: 'Check with the dot product, which is zero for perpendicular vectors. Against $\\mathbf{a}$:' },
      ...dotLines(a, answer),
      { text: 'Against $\\mathbf{b}$:' },
      ...dotLines(b, answer),
    ];
  },
};

interface CheckParams extends CrossParams {
  slip: number;
  m: number;
}

function checkCandidate({ a, b, slip, m }: CheckParams): Vec {
  const n = crossOf(a, b);
  if (slip === 1) return [n[0], -n[1], n[2]];
  if (slip === 2) return [-n[0], n[1], n[2]];
  return scaled(m, n);
}

const PERP_BOTH = '\\text{perpendicular to both}';
const NOT_PERP_BOTH = '\\text{not perpendicular to both}';

/**
 * Is a proposed vector perpendicular to both? Two dot products, then a
 * verdict. Half the candidates are a cross product with one sign slipped,
 * which is how a wrong normal usually arrives, and the dot products are what
 * catch it.
 */
const crossCheckTree: Generator<CheckParams> = {
  id: 'cross-check-tree',
  sample: (rng, difficulty) => ({
    ...sampleCross(rng, difficulty > 1 ? 2 : 1),
    slip: rng.chance(0.5) ? 0 : rng.pick([1, 2]),
    m: rng.pick([1, -1]),
  }),
  render: (params): Slide => {
    const { a, b } = params;
    const c = checkCandidate(params);
    const ca = dotOf(c, a);
    const cb = dotOf(c, b);
    const both = ca === 0 && cb === 0;
    const answer = [`${ca}`, `${cb}`, both ? PERP_BOTH : NOT_PERP_BOTH];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Is $\\mathbf{c}$ perpendicular to both $\\mathbf{a}$ and $\\mathbf{b}$? Work out both dot products, then decide.',
        },
        { kind: 'display', tex: pairTex(a, b) },
        { kind: 'display', tex: `\\mathbf{c} = ${colTex(c)}` },
      ],
      expression: '\\mathbf{c} \\cdot \\mathbf{a} \\quad \\text{and} \\quad \\mathbf{c} \\cdot \\mathbf{b}',
      nodes: [
        { id: 'ca', from: [] },
        { id: 'cb', from: [] },
        { id: 'verdict', from: ['ca', 'cb'] },
      ],
      bank: geometryTreeBank(
        answer,
        [both ? NOT_PERP_BOTH : PERP_BOTH, `${-ca}`, `${-cb}`, '1'],
        [`${ca + 1}`, `${cb + 2}`, `${ca - 2}`],
      ),
      answer,
    };
  },
  solution: (params) => {
    const { a, b } = params;
    const c = checkCandidate(params);
    const ca = dotOf(c, a);
    const cb = dotOf(c, b);
    return [
      { text: 'Perpendicular vectors have a dot product of zero, so test $\\mathbf{c}$ against each vector in turn. First $\\mathbf{c} \\cdot \\mathbf{a}$:' },
      ...dotLines(a, c),
      { text: 'Then $\\mathbf{c} \\cdot \\mathbf{b}$:' },
      ...dotLines(b, c),
      ca === 0 && cb === 0
        ? { text: 'Both are zero, so $\\mathbf{c}$ is perpendicular to both. It is a multiple of $\\mathbf{a} \\times \\mathbf{b}$.' }
        : {
            text: `Both have to be zero, and they are not, so $\\mathbf{c}$ is not perpendicular to both. The cross product itself is $${colTex(crossOf(a, b))}$: $\\mathbf{c}$ has one of its signs the wrong way.`,
          },
    ];
  },
};

interface AreaParams extends CrossParams {
  shape: 'parallelogram' | 'triangle';
  /** A corner, when the question gives points rather than side vectors. */
  from?: Vec;
}

/**
 * Two sides whose cross product has a whole length, and an even one for a
 * triangle, so the area is whole. Roughly one random pair in twenty-five has
 * a whole length and one in eighty an even one, so a few hundred draws always
 * find one.
 */
function sampleArea(rng: Draw, difficulty: number, points: boolean): AreaParams {
  const span = difficulty > 1 ? 4 : 3;
  const shape = rng.pick(['parallelogram', 'triangle'] as const);
  for (let tries = 0; tries < 3000; tries += 1) {
    const a = vec3(rng, -span, span);
    const b = vec3(rng, -span, span);
    const n = crossOf(a, b);
    if (nonZeroCount(n) < 2) continue;
    const r = wholeRoot(dotOf(n, n));
    if (r === undefined || (shape === 'triangle' && r % 2 !== 0)) continue;
    if (!points) return { a, b, shape };
    const from = vec3(rng, -4, 4);
    if ([...plus(from, a), ...plus(from, b)].some((x) => Math.abs(x) > 9)) continue;
    return { a, b, shape, from };
  }
  return { a: [2, 0, 1], b: [0, 2, 2], shape, from: points ? [1, 1, 1] : undefined };
}

function areaOf({ a, b, shape }: AreaParams): { square: number; length: number; area: number } {
  const n = crossOf(a, b);
  const square = dotOf(n, n);
  const length = wholeRoot(square) ?? Math.sqrt(square);
  return { square, length, area: shape === 'triangle' ? length / 2 : length };
}

function areaPrompt({ a, b, shape, from }: AreaParams): Block[] {
  if (from) {
    const B = plus(from, a);
    const other = plus(from, b);
    return [
      {
        kind: 'prose',
        text:
          shape === 'triangle'
            ? `Find the area of the triangle with corners $A${point3Tex(from)}$, $B${point3Tex(B)}$ and $C${point3Tex(other)}$.`
            : `$ABCD$ is a parallelogram with $A${point3Tex(from)}$, $B${point3Tex(B)}$ and $D${point3Tex(other)}$. Find its area.`,
      },
    ];
  }
  return [
    {
      kind: 'prose',
      text:
        shape === 'triangle'
          ? 'A triangle has two of its sides along $\\mathbf{a}$ and $\\mathbf{b}$, from one corner. Find its area.'
          : 'A parallelogram has its sides along $\\mathbf{a}$ and $\\mathbf{b}$, from one corner. Find its area.',
    },
    { kind: 'display', tex: pairTex(a, b) },
  ];
}

function areaSolution(params: AreaParams) {
  const { a, b, shape, from } = params;
  const n = crossOf(a, b);
  const { square, length, area } = areaOf(params);
  const other = shape === 'triangle' ? 'C' : 'D';
  return [
    ...(from
      ? [
          { text: `The two sides from $A$ are the journeys to the neighbouring corners, destination minus start:` },
          { tex: `\\overrightarrow{AB} = ${colTex(a)}` },
          { tex: `\\overrightarrow{A${other}} = ${colTex(b)}` },
        ]
      : []),
    { text: 'The length of the cross product of two sides is the area of the parallelogram they make.' },
    { tex: `\\mathbf{n} = ${from ? `\\overrightarrow{AB} \\times \\overrightarrow{A${other}}` : '\\mathbf{a} \\times \\mathbf{b}'} = ${colTex(n)}` },
    { tex: `\\left|\\mathbf{n}\\right|^2 = ${n.map((x) => x * x).join(' + ')}` },
    { tex: `\\left|\\mathbf{n}\\right| = \\sqrt{${square}} = ${length}` },
    shape === 'triangle'
      ? { text: `A triangle on the same two sides is half the parallelogram, so its area is $\\tfrac{1}{2} \\times ${length} = ${area}$.` }
      : { text: `So the parallelogram has area $${area}$. A triangle on the same two sides would have half that.` },
  ];
}

/** The area of a parallelogram or triangle from the length of a cross product. */
const crossArea: Generator<AreaParams> = {
  id: 'cross-area',
  choices: (params) => {
    const { square, length, area } = areaOf(params);
    const n = crossOf(params.a, params.b);
    return steered(
      signedChoices(area, [
        // No square root, the other shape, and the components simply added.
        square,
        params.shape === 'triangle' ? length : length / 2,
        Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]),
        area + 1,
      ]),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => sampleArea(rng, difficulty, difficulty > 1 && rng.chance(0.5)),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: areaPrompt(params),
    lead: '\\text{area} =',
    keypad: [],
    answer: `${areaOf(params).area}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: areaSolution,
};

/**
 * The same area as working: the cross product, its length squared, then the
 * area. The squared length is its own step because leaving out the square
 * root is the slip it catches.
 */
const crossAreaTree: Generator<AreaParams> = {
  id: 'cross-area-tree',
  sample: (rng, difficulty) => {
    const params = sampleArea(rng, difficulty, false);
    // Triangles come with the harder draws, after the lesson has taught them.
    return difficulty > 1 ? params : { ...params, shape: 'parallelogram' };
  },
  render: (params): Slide => {
    const { a, b, shape } = params;
    const n = crossOf(a, b);
    const { square, length, area } = areaOf(params);
    const answer = [colTex(n), `${square}`, `${area}`];
    const otherShape = shape === 'triangle' ? length : length / 2;
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Find the area of the ${shape} with sides along $\\mathbf{a}$ and $\\mathbf{b}$: the cross product, its length squared, then the area.`,
        },
        { kind: 'display', tex: pairTex(a, b) },
      ],
      expression:
        shape === 'triangle'
          ? '\\text{area} = \\tfrac{1}{2}\\left|\\mathbf{a} \\times \\mathbf{b}\\right|'
          : '\\text{area} = \\left|\\mathbf{a} \\times \\mathbf{b}\\right|',
      nodes: [
        { id: 'n', from: [] },
        { id: 'square', from: ['n'] },
        { id: 'area', from: ['square'] },
      ],
      bank: geometryTreeBank(
        answer,
        [
          colTex([n[0], -n[1], n[2]]),
          ...(Number.isInteger(otherShape) ? [`${otherShape}`] : []),
          `${Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2])}`,
        ],
        [`${square + 1}`, `${area + 1}`, `${area + 2}`],
      ),
      answer,
    };
  },
  solution: areaSolution,
};

/* ---------- the equation of a plane ---------- */

interface PlanePointParams {
  p: Vec;
  n: Vec;
}

/** A point and a normal with the plane's constant non-zero. */
function samplePlanePoint(rng: Draw, difficulty: number): PlanePointParams {
  const span = difficulty > 1 ? 6 : 4;
  const reach = difficulty > 1 ? 5 : 3;
  for (let tries = 0; tries < 200; tries += 1) {
    const p = vec3(rng, -span, span);
    const n = vec3(rng, -reach, reach);
    // Every term present at first; a missing one is a harder read.
    if (nonZeroCount(n) < (difficulty > 1 ? 2 : 3)) continue;
    if (dotOf(p, n) === 0 || nonZeroCount(p) < 2) continue;
    return { p, n };
  }
  return { p: [1, 2, 3], n: [2, -1, 1] };
}

/**
 * `p . n` worked in two lines, the values of `p` put into the terms of `n`
 * and then the products added. One line would run off a phone.
 */
function dotLines(p: Vec, n: Vec): { tex: string }[] {
  const products = n.map((c, i) => c * p[i]).filter((_, i) => n[i] !== 0);
  const sum = products.map((x, i) => (i === 0 ? `${x}` : x < 0 ? `- ${-x}` : `+ ${x}`)).join(' ');
  return [
    { tex: substituteTex(n, p.map(String)) },
    { tex: products.length > 1 ? `= ${sum} = ${dotOf(p, n)}` : `= ${dotOf(p, n)}` },
  ];
}

/** A sign slipped on one term of `p . n`: the first term with something to slip. */
function slippedDot(p: Vec, n: Vec): number {
  const i = [2, 1, 0].find((idx) => p[idx] * n[idx] !== 0) ?? 0;
  return dotOf(p, n) - 2 * p[i] * n[i];
}

/** The constant in `r . n = d`, from a point on the plane. */
const planeD: Generator<PlanePointParams> = {
  id: 'plane-d',
  choices: (params) => {
    const { p, n } = params;
    const d = dotOf(p, n);
    return steered(signedChoices(d, [-d, slippedDot(p, n), dotOf(n, n), d + 1]), saltOf(params));
  },
  sample: samplePlanePoint,
  render: ({ p, n }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `The plane $\\Pi$ passes through $A${point3Tex(p)}$ and is perpendicular to $\\mathbf{n}$. Its equation is $\\mathbf{r} \\cdot \\mathbf{n} = d$. Find $d$.`,
      },
      { kind: 'display', tex: `\\mathbf{n} = ${colTex(n)}` },
    ],
    lead: 'd =',
    keypad: [],
    answer: `${dotOf(p, n)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ p, n }) => [
    { text: 'Every point of the plane has the same dot product with the normal, and $A$ is one of them. So $d$ is $\\mathbf{a} \\cdot \\mathbf{n}$:' },
    ...dotLines(p, n),
    { tex: planeVectorTex(n, dotOf(p, n)) },
  ],
};

/** The Cartesian equation from a point and a normal. */
const planeCartesian: Generator<PlanePointParams> = {
  id: 'plane-cartesian',
  sample: samplePlanePoint,
  render: (params): Slide => {
    const { p, n } = params;
    const d = dotOf(p, n);
    // The constant's sign, the point and normal swapped, a slipped sign.
    const wrong: [Vec, number][] = [
      [n, -d],
      [p, d],
      [n, slippedDot(p, n)],
      [n, d + nonZero(n[0], 1)],
    ];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which is the Cartesian equation of the plane through $A${point3Tex(p)}$ perpendicular to $\\mathbf{n}$?`,
        },
        { kind: 'display', tex: `\\mathbf{n} = ${colTex(n)}` },
      ],
      options: placeAnswer(
        { id: 'plane', label: planeTex(n, d) },
        wrong
          .filter(([m, e]) => !samePlane(m, e, n, d))
          .slice(0, 3)
          .map(([m, e], idx) => ({ id: `slip${idx}`, label: planeTex(m, e) })),
        saltOf(params),
      ),
      correctId: 'plane',
    };
  },
  solution: ({ p, n }) => [
    { text: 'Write $\\mathbf{r}$ as $\\left(x, y, z\\right)$. Then $\\mathbf{r} \\cdot \\mathbf{n}$ is the normal\'s components times $x$, $y$ and $z$, so the normal gives the coefficients.' },
    { tex: `${linearTex(n)} = d` },
    { text: 'The point gives the constant $d$: put $A$ in.' },
    ...dotLines(p, n),
    { tex: planeTex(n, dotOf(p, n)) },
  ],
};

interface PlaneOnParams {
  q: Vec;
  n: Vec;
  off: number;
  form: 'cartesian' | 'vector';
}

/**
 * Does a point lie on the plane? Each option carries a value, so a guess
 * between yes and no is not enough: the learner has to have worked out what
 * the point gives.
 */
const planeOn: Generator<PlaneOnParams> = {
  id: 'plane-on',
  sample: (rng, difficulty) => {
    const { p, n } = samplePlanePoint(rng, difficulty);
    return {
      q: p,
      n,
      off: rng.chance(0.5) ? 0 : rng.pick([-3, -2, -1, 1, 2, 3]),
      form: difficulty > 1 && rng.chance(0.5) ? 'cartesian' : 'vector',
    };
  },
  render: (params): Slide => {
    const { q, n, off, form } = params;
    const value = dotOf(q, n);
    const d = value + off;
    // Braced for the same reason as `planeDisplay`: -7 after words is a sign.
    const yes = (v: number) => `\\text{Yes, it gives } {${v}}`;
    const no = (v: number) => `\\text{No, it gives } {${v}}`;
    const slips = [slippedDot(q, n), -value, value + nonZero(q[0], 1)].filter((v) => v !== value && v !== d);
    const offered =
      off === 0
        ? placeAnswer(
            { id: 'answer', label: yes(value) },
            slips.slice(0, 2).map((v, idx) => ({ id: `slip${idx}`, label: no(v) })),
            saltOf(params),
          )
        : placeAnswer(
            { id: 'answer', label: no(value) },
            [
              { id: 'yes', label: yes(d) },
              ...slips.slice(0, 1).map((v, idx) => ({ id: `slip${idx}`, label: no(v) })),
            ],
            saltOf(params),
          );
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Does $P${point3Tex(q)}$ lie on the plane $\\Pi$?` },
        planeDisplay(n, d, form),
      ],
      options: offered,
      correctId: 'answer',
    };
  },
  solution: ({ q, n, off, form }) => {
    const value = dotOf(q, n);
    return [
      {
        text:
          form === 'cartesian'
            ? 'Put the coordinates of $P$ into the left-hand side and compare with the right.'
            : 'Work out $\\mathbf{p} \\cdot \\mathbf{n}$ and compare it with the constant on the right.',
      },
      ...dotLines(q, n),
      off === 0
        ? { text: `That is $${value}$, the plane's own constant, so $P$ lies on $\\Pi$.` }
        : { text: `That is $${value}$, but the plane needs $${value + off}$, so $P$ is not on $\\Pi$.` },
    ];
  },
};

interface MissingPlaneParams {
  q: Vec;
  n: Vec;
  pos: number;
  form: 'cartesian' | 'vector';
}

/** A missing coordinate that puts a point on a plane. */
const planeMissing: Generator<MissingPlaneParams> = {
  id: 'plane-missing',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 100; tries += 1) {
      const { p, n } = samplePlanePoint(rng, difficulty);
      const pos = rng.int(0, 2);
      if (n[pos] === 0 || p[pos] === 0) continue;
      return { q: p, n, pos, form: difficulty > 1 && rng.chance(0.5) ? 'vector' : 'cartesian' };
    }
    return { q: [1, 2, 3], n: [2, -1, 1], pos: 1, form: 'cartesian' };
  },
  render: ({ q, n, pos, form }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `$P${point3Tex(q.map((x, idx) => (idx === pos ? 'k' : `${x}`)))}$ lies on the plane $\\Pi$. Find $k$.`,
      },
      planeDisplay(n, dotOf(q, n), form),
    ],
    lead: 'k =',
    keypad: [],
    answer: `${q[pos]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ q, n, pos }) => {
    const d = dotOf(q, n);
    const rest = d - n[pos] * q[pos];
    const terms = q.map((x, idx) => (idx === pos ? 'k' : `${x}`));
    return [
      { text: 'A point on the plane satisfies its equation, so substitute its coordinates with $k$ in place.' },
      { tex: `${substituteTex(n, terms)} = ${d}` },
      { tex: `${affTex(rest, n[pos], 'k')} = ${d}` },
      { tex: solvedForTex(n[pos], 'k', d - rest, `k = ${q[pos]}`) },
    ];
  },
};

interface VectorFormParams {
  n: Vec;
  d: number;
}

/**
 * From Cartesian form to `r . n = d`, assembled from a column tile and a
 * number tile. No multiple of the normal but the one asked for is offered,
 * because `r . (-n) = -d` is the same plane and the widget would mark it wrong.
 */
const planeVectorForm: Generator<VectorFormParams> = {
  id: 'plane-vector-form',
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 6 : 4;
    for (let tries = 0; tries < 100; tries += 1) {
      const n = vec3(rng, -reach, reach);
      if (nonZeroCount(n) < (difficulty > 1 ? 2 : 3)) continue;
      return { n, d: nonZero(rng.int(-12, 12), 5) };
    }
    return { n: [2, -1, 3], d: 5 };
  },
  render: ({ n, d }): Slide => {
    const columns = [n.map(Math.abs), [n[0], n[1], d], [n[1], n[2], n[0]], [n[0], n[1], -n[2]]]
      .filter((v) => nonZeroCount(crossOf(v, n)) > 0)
      .map(colTex)
      .filter((tex, idx, all) => all.indexOf(tex) === idx)
      .slice(0, 2);
    const numbers = [-d, d + n[0], n[0] + n[1] + n[2]]
      .filter((v, idx, all) => v !== d && all.indexOf(v) === idx)
      .slice(0, 2)
      .map(String);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write the plane $\\Pi$ in the form $\\mathbf{r} \\cdot \\mathbf{n} = d$.' },
        planeDisplay(n, d, 'cartesian'),
      ],
      template: '\\mathbf{r} \\cdot {0} = {1}',
      bank: [colTex(n), `${d}`, ...columns, ...numbers].sort(),
      answer: [colTex(n), `${d}`],
    };
  },
  solution: ({ n, d }) => [
    { text: 'The coefficients of $x$, $y$ and $z$ are the components of the normal, a missing term being a zero. The constant stays as it is.' },
    { tex: planeVectorTex(n, d) },
    { text: 'Multiplying out $\\mathbf{r} \\cdot \\mathbf{n}$ with $\\mathbf{r} = \\left(x, y, z\\right)$ gives back the Cartesian form, which is the check.' },
  ],
};

/* ---------- a plane through three points ---------- */

interface ThreeParams {
  A: Vec;
  u: Vec;
  v: Vec;
}

/** Three corners built from `A` and the two journeys out of it. */
function sampleThree(rng: Draw, difficulty: number): ThreeParams {
  const reach = difficulty > 1 ? 3 : 2;
  for (let tries = 0; tries < 300; tries += 1) {
    const A = vec3(rng, -4, 4);
    const u = vec3(rng, -reach, reach);
    const v = vec3(rng, -reach, reach);
    const n = crossOf(u, v);
    if (nonZeroCount(n) < (difficulty > 1 ? 2 : 3)) continue;
    if ([...plus(A, u), ...plus(A, v)].some((x) => Math.abs(x) > 9)) continue;
    // A plane through the origin holds the position vectors too, which would
    // make the position-vector slip a right answer and the constant zero.
    if (dotOf(A, n) === 0) continue;
    return { A, u, v };
  }
  return { A: [1, 0, 2], u: [1, 2, -1], v: [2, 1, 1] };
}

function threePoints({ A, u, v }: ThreeParams): string {
  return `$A${point3Tex(A)}$, $B${point3Tex(plus(A, u))}$ and $C${point3Tex(plus(A, v))}$`;
}

function threeNormalSolution({ u, v }: ThreeParams) {
  return [
    { text: 'Two directions in the plane are the journeys from $A$ to the other two points: destination minus start.' },
    { tex: `\\overrightarrow{AB} = ${colTex(u)}` },
    { tex: `\\overrightarrow{AC} = ${colTex(v)}` },
    { text: 'Their cross product is perpendicular to both, so it is a normal to the plane.' },
    ...crossSteps(u, v),
    { tex: `\\mathbf{n} = ${colTex(crossOf(u, v))}` },
  ];
}

function threeSolution(params: ThreeParams) {
  const { A, u, v } = params;
  const n = crossOf(u, v);
  const s = simplest(n);
  return [
    ...threeNormalSolution(params),
    { text: 'Any of the three points gives the constant $d$. Using $A$:' },
    ...dotLines(A, n),
    { tex: planeTex(n, dotOf(A, n)) },
    ...(s.join() === n.join()
      ? []
      : [{ text: `Dividing through by a common factor, or by $-1$, gives the same plane: $${planeTex(s, dotOf(A, s))}$.` }]),
  ];
}

/** The normal of a plane through three points, as `AB x AC`. */
const planeThreeNormal: Generator<ThreeParams> = {
  id: 'plane-three-normal',
  choices: (params) => {
    const { A, u, v } = params;
    const n = crossOf(u, v);
    return steered(
      options(
        { tex: colTex(n) },
        // Position vectors crossed, the middle sign, and AC x AB.
        { tex: colTex(crossOf(A, plus(A, u))) },
        { tex: colTex([n[0], -n[1], n[2]]) },
        { tex: colTex(scaled(-1, n)) },
      ),
      saltOf(params),
    );
  },
  sample: sampleThree,
  render: (params): Slide => {
    const { A, u, v } = params;
    const n = crossOf(u, v);
    const slip = crossOf(A, plus(A, u));
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The plane $\\Pi$ passes through ${threePoints(params)}. Find the normal $\\overrightarrow{AB} \\times \\overrightarrow{AC}$.`,
        },
      ],
      template: CROSS_TEMPLATE,
      bank: bankOf(n.map(String), [`${-n[1]}`, `${slip[0]}`, `${slip[2]}`, `${-n[2]}`]),
      answer: n.map(String),
    };
  },
  solution: threeNormalSolution,
};

/** The plane through three points, the whole route laid out as a tree. */
const planeThreeTree: Generator<ThreeParams> = {
  id: 'plane-three-tree',
  sample: sampleThree,
  render: (params): Slide => {
    const { A, u, v } = params;
    const n = crossOf(u, v);
    const d = dotOf(A, n);
    const answer = [colTex(u), colTex(v), colTex(n), `${d}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Find the plane through ${threePoints(params)}: the two directions from $A$, their cross product, then $d$ from $A$.`,
        },
      ],
      expression: '\\mathbf{r} \\cdot \\left(\\overrightarrow{AB} \\times \\overrightarrow{AC}\\right) = d',
      nodes: [
        { id: 'ab', from: [] },
        { id: 'ac', from: [] },
        { id: 'n', from: ['ab', 'ac'] },
        { id: 'd', from: ['n'] },
      ],
      bank: geometryTreeBank(
        answer,
        [colTex(scaled(-1, u)), colTex([n[0], -n[1], n[2]]), `${-d}`, colTex(plus(A, v))],
        [`${d + 1}`, colTex(minus(v, u))],
      ),
      answer,
    };
  },
  solution: threeSolution,
};

/** Which Cartesian equation is the plane through three points? */
const planeThreeEquation: Generator<ThreeParams> = {
  id: 'plane-three-equation',
  sample: sampleThree,
  render: (params): Slide => {
    const { A, u, v } = params;
    const s = simplest(crossOf(u, v));
    const d = dotOf(A, s);
    const positions = simplest(crossOf(A, plus(A, u)));
    const signSlip = simplest([s[0], -s[1], s[2]]);
    // Position vectors instead of directions; a slipped sign in the normal;
    // the constant from a direction rather than a point, which is always 0.
    const wrong: [Vec, number][] = [
      [positions, dotOf(A, positions)],
      [signSlip, dotOf(A, signSlip)],
      [s, 0],
      [s, -d],
    ];
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which is an equation of the plane through ${threePoints(params)}?` }],
      options: placeAnswer(
        { id: 'plane', label: planeTex(s, d) },
        wrong
          .filter(([m, e]) => nonZeroCount(m) > 0 && !samePlane(m, e, s, d))
          .slice(0, 3)
          .map(([m, e], idx) => ({ id: `slip${idx}`, label: planeTex(m, e) })),
        saltOf(params),
      ),
      correctId: 'plane',
    };
  },
  solution: (params) => [
    ...threeSolution(params),
    { text: 'A last check: $B$ and $C$ should satisfy the equation too.' },
  ],
};

/* ---------- a line meets a plane ---------- */

interface LinePlaneParams {
  a: Vec;
  b: Vec;
  n: Vec;
  t: number;
  form: 'cartesian' | 'vector';
}

/** A line and a plane built from the point where they meet and the `t` that reaches it. */
function sampleLinePlane(rng: Draw, difficulty: number, form?: 'cartesian' | 'vector'): LinePlaneParams {
  const ts = difficulty > 1 ? [-3, -2, -1, 1, 2, 3, 4] : [-2, -1, 1, 2, 3];
  for (let tries = 0; tries < 300; tries += 1) {
    const n = vec3(rng, -3, 3);
    if (nonZeroCount(n) < (difficulty > 1 ? 2 : 3)) continue;
    const b = vec3(rng, -3, 3);
    if (nonZeroCount(b) < 2 || dotOf(b, n) === 0) continue;
    const t = rng.pick(ts);
    const P = vec3(rng, -4, 4);
    const a = minus(P, scaled(t, b));
    if (a.some((x) => Math.abs(x) > 9)) continue;
    return { a, b, n, t, form: form ?? (difficulty > 1 && rng.chance(0.5) ? 'vector' : 'cartesian') };
  }
  return { a: [1, 0, 2], b: [1, 1, 1], n: [1, 2, -1], t: 2, form: form ?? 'cartesian' };
}

function linePlaneValues({ a, b, n, t }: LinePlaneParams) {
  const P = plus(a, scaled(t, b));
  return { P, d: dotOf(P, n), an: dotOf(a, n), bn: dotOf(b, n) };
}

function linePlanePrompt(params: LinePlaneParams, text: string): Block[] {
  const { a, b, n, form } = params;
  return [
    { kind: 'prose', text },
    // Unlabelled: a name in front of two three-component columns runs off a phone.
    { kind: 'display', tex: lineTex(a, b) },
    planeDisplay(n, linePlaneValues(params).d, form),
  ];
}

function linePlaneSolution(params: LinePlaneParams) {
  const { a, b, t } = params;
  const { P, d, an, bn } = linePlaneValues(params);
  return [
    { text: 'Every point of the line is $\\mathbf{a} + t\\mathbf{b}$. Write it as one column in terms of $t$:' },
    { tex: `\\mathbf{r} = ${columnOf(a.map((x, i) => affTex(x, b[i], 't')))}` },
    { text: 'Put it into the plane\'s equation. The terms without $t$ come from $\\mathbf{a} \\cdot \\mathbf{n}$ and the terms in $t$ from $\\mathbf{b} \\cdot \\mathbf{n}$:' },
    { tex: `${affTex(an, bn, 't')} = ${d}` },
    { tex: solvedForTex(bn, 't', d - an, `t = ${t}`) },
    { text: `Put $t = ${t}$ back into the line to find the point.` },
    { tex: `${addMultipleTex(colTex(a), t, colTex(b))} = ${colTex(P)}` },
    { text: `So they meet at $${point3Tex(P)}$.` },
  ];
}

/** The value of `t` where a line meets a plane. */
const linePlaneT: Generator<LinePlaneParams> = {
  id: 'line-plane-t',
  choices: (params) => {
    const { t } = params;
    const { d, an, bn } = linePlaneValues(params);
    return steered(
      // The line's start left out, and its terms moved across with the wrong sign.
      signedChoices(t, [-t, d / bn, (d + an) / bn, t + 1]),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => sampleLinePlane(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: linePlanePrompt(params, 'The line below meets the plane $\\Pi$ at one point. Find the value of $t$ there.'),
    lead: '\\text{where they meet, } t =',
    keypad: [],
    answer: `${params.t}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => linePlaneSolution(params).slice(0, 5),
};

/** The point where a line meets a plane, placed as coordinate tiles. */
const linePlanePoint: Generator<LinePlaneParams> = {
  id: 'line-plane-point',
  sample: (rng, difficulty) => sampleLinePlane(rng, difficulty),
  render: (params): Slide => {
    const { a, b, t } = params;
    const { P } = linePlaneValues(params);
    const behind = minus(a, scaled(t, b));
    return {
      kind: 'tiles',
      prompt: linePlanePrompt(params, 'Find the point where the line below meets the plane $\\Pi$.'),
      template: POINT3_TEMPLATE,
      // The point reached going the wrong way, and the parameter itself.
      bank: bankOf(P.map(String), [`${behind[0]}`, `${behind[2]}`, `${t}`]),
      answer: P.map(String),
    };
  },
  solution: linePlaneSolution,
};

/**
 * The same meeting point through the scalar-product form: `a . n` and
 * `b . n`, then `t`, then the point. Always shown in vector form, so `n` is
 * on the page.
 */
const linePlanePointTree: Generator<LinePlaneParams> = {
  id: 'line-plane-point-tree',
  sample: (rng, difficulty) => sampleLinePlane(rng, difficulty, 'vector'),
  render: (params): Slide => {
    const { a, b, t } = params;
    const { P, d, an, bn } = linePlaneValues(params);
    const answer = [`${an}`, `${bn}`, `${t}`, point3Tex(P)];
    return {
      kind: 'tree',
      prompt: linePlanePrompt(
        params,
        'Find where the line meets $\\Pi$: the dot products of $\\mathbf{a}$ and $\\mathbf{b}$ with the normal, then $t$, then the point.',
      ),
      expression: `\\mathbf{a} \\cdot \\mathbf{n} + t \\, \\mathbf{b} \\cdot \\mathbf{n} = ${d}`,
      nodes: [
        { id: 'an', from: [] },
        { id: 'bn', from: [] },
        { id: 't', from: ['an', 'bn'] },
        { id: 'p', from: ['t'] },
      ],
      bank: geometryTreeBank(
        answer,
        [`${-t}`, point3Tex(plus(a, scaled(t + 1, b))), `${-bn}`, `${-an}`],
        [`${t + 1}`, `${an + 1}`, `${bn + 2}`],
      ),
      answer,
    };
  },
  solution: linePlaneSolution,
};

type LinePlaneRelation = 'meet' | 'parallel' | 'inside';

interface RelationPlaneParams {
  rel: LinePlaneRelation;
  a: Vec;
  b: Vec;
  n: Vec;
  d: number;
  form: 'cartesian' | 'vector';
}

const LINE_PLANE_LABELS: Record<LinePlaneRelation, string> = {
  meet: '\\text{Meets it at one point}',
  parallel: '\\text{Parallel, never meeting}',
  inside: '\\text{Lies in the plane}',
};

/**
 * How a line sits against a plane. A direction along the plane is a cross
 * product of the normal with something else, divided down, which is how the
 * parallel and lying-in cases are built.
 */
const linePlaneRelation: Generator<RelationPlaneParams> = {
  id: 'line-plane-relation',
  choices: (params) =>
    steered(
      options(
        { tex: LINE_PLANE_LABELS[params.rel] },
        ...(Object.keys(LINE_PLANE_LABELS) as LinePlaneRelation[])
          .filter((rel) => rel !== params.rel)
          .map((rel) => ({ tex: LINE_PLANE_LABELS[rel] })),
      ),
      saltOf(params),
    ),
  sample: (rng, difficulty) => {
    const rel = rng.pick<LinePlaneRelation>(['meet', 'parallel', 'inside']);
    const form = difficulty > 1 && rng.chance(0.5) ? 'vector' : 'cartesian';
    for (let tries = 0; tries < 300; tries += 1) {
      const n = vec3(rng, -3, 3);
      if (nonZeroCount(n) < (difficulty > 1 ? 2 : 3)) continue;
      const a = vec3(rng, -4, 4);
      let b: Vec;
      if (rel === 'meet') {
        b = vec3(rng, -3, 3);
        if (dotOf(b, n) === 0) continue;
      } else {
        const e = vec3(rng, -2, 2);
        const raw = crossOf(n, e);
        if (nonZeroCount(raw) === 0) continue;
        b = simplest(raw);
      }
      if (nonZeroCount(b) < 2 || b.some((x) => Math.abs(x) > 6)) continue;
      const d = dotOf(a, n) + (rel === 'parallel' ? rng.pick([-3, -2, -1, 1, 2, 3]) : rel === 'meet' ? rng.int(-3, 3) : 0);
      return { rel, a, b, n, d, form };
    }
    return { rel: 'meet', a: [1, 0, 2], b: [1, 1, 1], n: [1, 2, -1], d: 3, form };
  },
  render: (params): Slide => {
    const { rel, a, b, n, d, form } = params;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'How does the line below sit against the plane $\\Pi$? Work down the questions; each answer chooses what gets asked next.',
        },
        { kind: 'display', tex: lineTex(a, b) },
        planeDisplay(n, d, form),
      ],
      subject: pairTex(b, n, ['\\mathbf{b}', '\\mathbf{n}']),
      steps: [
        {
          id: 'direction',
          ask: 'Is $\\mathbf{b} \\cdot \\mathbf{n}$, the line\'s direction dotted with the plane\'s normal, zero?',
          branches: [
            { label: 'Yes', to: 'point' },
            { label: 'No', outcome: 'The line meets the plane at exactly one point.' },
          ],
        },
        {
          id: 'point',
          ask: 'Does the line\'s starting point satisfy the plane\'s equation?',
          branches: [
            { label: 'Yes', outcome: 'The line lies in the plane.' },
            { label: 'No', outcome: 'The line is parallel to the plane and never meets it.' },
          ],
        },
      ],
      answer: rel === 'meet' ? ['No'] : rel === 'inside' ? ['Yes', 'Yes'] : ['Yes', 'No'],
    };
  },
  solution: ({ rel, a, b, n, d }) => {
    const bn = dotOf(b, n);
    const steps: { text?: string; tex?: string }[] = [
      { text: 'The direction decides first. A line runs along a plane exactly when its direction is perpendicular to the normal, so work out $\\mathbf{b} \\cdot \\mathbf{n}$:' },
      ...dotLines(b, n),
    ];
    if (rel === 'meet') {
      steps.push({ text: `That is $${bn}$, not zero, so the line crosses the plane and meets it at exactly one point.` });
      return steps;
    }
    steps.push(
      { text: 'That is zero, so the line runs parallel to the plane. It is either in the plane or never meets it: test the starting point with $\\mathbf{a} \\cdot \\mathbf{n}$.' },
      ...dotLines(a, n),
      rel === 'inside'
        ? { text: `That is $${d}$, the plane's constant, so the start is on the plane, and so is every other point of the line.` }
        : { text: `The plane needs $${d}$, so the start is off the plane, and the line never reaches it.` },
    );
    return steps;
  },
};

interface ParallelPlaneParams {
  a: Vec;
  b: Vec;
  n: Vec;
  pos: number;
  off: number;
}

/** An unknown in a line's direction that makes it parallel to a plane. */
const linePlaneParallel: Generator<ParallelPlaneParams> = {
  id: 'line-plane-parallel',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 400; tries += 1) {
      const n = vec3(rng, -3, 3);
      if (nonZeroCount(n) < (difficulty > 1 ? 2 : 3)) continue;
      const pos = rng.int(0, 2);
      // A unit coefficient at first, so the unknown is always whole.
      if (n[pos] === 0 || (difficulty === 1 && Math.abs(n[pos]) !== 1)) continue;
      const b = vec3(rng, -4, 4);
      b[pos] = 0;
      const rest = dotOf(b, n);
      if (rest % n[pos] !== 0) continue;
      b[pos] = -rest / n[pos];
      if (b[pos] === 0 || Math.abs(b[pos]) > 12 || nonZeroCount(b) < 2) continue;
      return { a: vec3(rng, -4, 4), b, n, pos, off: rng.pick([-3, -2, -1, 1, 2, 3]) };
    }
    return { a: [1, 0, 2], b: [1, 1, 1], n: [1, -2, 1], pos: 1, off: 2 };
  },
  render: ({ a, b, n, pos, off }): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'The line below is parallel to the plane $\\Pi$. Find $k$.' },
      {
        kind: 'display',
        tex: `\\mathbf{r} = ${colTex(a)} + t${columnOf(b.map((x, i) => (i === pos ? 'k' : `${x}`)))}`,
      },
      planeDisplay(n, dotOf(a, n) + off, 'cartesian'),
    ],
    lead: 'k =',
    keypad: [],
    answer: `${b[pos]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ b, n, pos }) => {
    const rest = dotOf(b, n) - b[pos] * n[pos];
    const terms = b.map((x, i) => (i === pos ? 'k' : `${x}`));
    return [
      { text: 'A line parallel to a plane runs along it, so its direction is perpendicular to the normal: $\\mathbf{b} \\cdot \\mathbf{n} = 0$. The normal is read from the coefficients.' },
      { tex: `${substituteTex(n, terms)} = 0` },
      { tex: `${affTex(rest, n[pos], 'k')} = 0 \\implies k = ${b[pos]}` },
    ];
  },
};

/* ---------- Level 10: vectors in mechanics ---------- */

/*
 * Level 10 gives the vectors of the earlier levels a physical meaning, in two
 * dimensions and in i, j notation throughout: a position that changes with
 * time, a velocity whose length is a speed, constant acceleration, forces
 * that add, and two particles that may or may not collide. It is vector
 * algebra with units attached, not a mechanics course: nothing here needs a
 * force diagram, a slope or friction, which belong to the Mechanics tab.
 *
 * Units live in the prose only. Every answer is a bare number or a pair of
 * components, and every question is built outward from the whole numbers it
 * should end on: the time two particles meet, a speed from a Pythagorean
 * triple, an acceleration the mass divides exactly.
 */

const MPS = '\\mathrm{m\\,s^{-1}}';
const MPS2 = '\\mathrm{m\\,s^{-2}}';
const PARTICLES = ['A particle', 'A boat', 'A drone', 'A puck', 'A model car'];

/** `3i - 2j`, `-j`, `4i`: a vector the way a mechanics text writes it. */
function ijOf([x, y]: Vec): string {
  const term = (c: number, unit: string) => (Math.abs(c) === 1 ? unit : `${Math.abs(c)}${unit}`);
  if (x === 0 && y === 0) return '\\mathbf{0}';
  if (x === 0) return `${y < 0 ? '-' : ''}${term(y, '\\mathbf{j}')}`;
  const first = `${x < 0 ? '-' : ''}${term(x, '\\mathbf{i}')}`;
  if (y === 0) return first;
  return `${first} ${y < 0 ? '-' : '+'} ${term(y, '\\mathbf{j}')}`;
}

/** The same vector in brackets, ready to be multiplied or added to. */
const ijBr = (v: Vec) => `(${ijOf(v)})`;

/**
 * A vector with its unit, held together: inline maths breaks at a top-level
 * plus, and a velocity split over two lines of prose reads as two numbers.
 */
const unitTex = (v: Vec, unit: string) => `{${ijBr(v)} \\; ${unit}}`;

/** `r = (a) + (b)t`: where a particle is after `t` seconds. */
function motionTex(r0: Vec, v: Vec, name = '\\mathbf{r}'): string {
  if (r0[0] === 0 && r0[1] === 0) return `${name} = ${ijBr(v)}t`;
  // A start along one axis needs no brackets: `-7i + (2i - j)t`.
  const start = r0[0] === 0 || r0[1] === 0 ? ijOf(r0) : ijBr(r0);
  return `${name} = ${start} + ${ijBr(v)}t`;
}

/**
 * One component's working on a line of its own, `i: 3 + (-8) = -5`.
 *
 * Solutions are narrower than teaching slides, and a whole vector sum in i, j
 * form runs off a phone; one component per line always fits. The sum is
 * braced so a leading minus after the colon reads as a sign.
 */
function componentLine(unit: 'i' | 'j', sum: string, value: number | string) {
  return { tex: `\\mathbf{${unit}}\\colon \\; {${sum}} = ${value}` };
}

/** Both components of `p + k q`, each on its own line. */
function sumLines(p: Vec, k: number, q: Vec) {
  return (['i', 'j'] as const).map((unit, idx) =>
    componentLine(unit, `${p[idx]} + ${k === 1 ? '' : `${k} \\times `}${paren(q[idx])}`, p[idx] + k * q[idx]),
  );
}

/** A whole vector with neither component zero. */
function vec2(rng: Draw, lo: number, hi: number): Vec {
  return [nonZero(rng.int(lo, hi), hi), nonZero(rng.int(lo, hi), lo)];
}

/** A vector of whole length: a Pythagorean triple's legs, signed or not. */
function tripleVec(rng: Draw, longest: number, signed = true): { v: Vec; c: number } {
  const [a, b, c] = rng.pick(MAGNITUDE_TRIPLES.filter((row) => row[2] <= longest));
  return { v: signed ? [a * rng.sign(), b * rng.sign()] : [a, b], c };
}

/** The vector's two components as tile answers. */
const tilesOf = (v: Vec) => [`${v[0]}`, `${v[1]}`];

/** `\frac{n}{d}` in lowest terms, or a whole number when it divides. */
function fracTex(n: number, d: number): string {
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  const [p, q] = [n / g, d / g];
  return q === 1 ? `${p}` : `\\frac{${p}}{${q}}`;
}

/** The squared-magnitude working, one step to a line. */
function magnitudeLines(v: Vec, c: number) {
  return [
    { tex: `\\sqrt{${paren(v[0])}^2 + ${paren(v[1])}^2}` },
    { tex: `= \\sqrt{${v[0] * v[0]} + ${v[1] * v[1]}} = ${c}` },
  ];
}

/* Lesson 1: position and velocity. */

interface PositionParams {
  who: number;
  r0: Vec;
  v: Vec;
  t: number;
}

function samplePosition(rng: Draw, difficulty: number): PositionParams {
  const span = difficulty > 1 ? 9 : 6;
  const reach = difficulty > 1 ? 5 : 4;
  return {
    who: rng.int(0, PARTICLES.length - 1),
    r0: [rng.int(-span, span), nonZero(rng.int(-span, span), 2)],
    v: vec2(rng, -reach, reach),
    t: rng.int(2, difficulty > 1 ? 8 : 5),
  };
}

function positionPrompt({ who, r0, v }: PositionParams, ask: string): Block[] {
  return [
    {
      kind: 'prose',
      text: `${PARTICLES[who]} starts at the point with position vector $${ijOf(r0)}$ and moves with constant velocity $${unitTex(v, MPS)}$. ${ask}`,
    },
    { kind: 'display', tex: motionTex(r0, v) },
  ];
}

function positionSolution({ r0, v, t }: PositionParams) {
  const p = plus(r0, scaled(t, v));
  return [
    {
      text: 'With a constant velocity the position is the start plus the velocity times the time, $\\mathbf{r} = \\mathbf{r}_0 + \\mathbf{v}t$. Work one component at a time:',
    },
    ...sumLines(r0, t, v),
    {
      text: `So after $${t}$ seconds it is at $${ijOf(p)}$. Each second adds one more lot of the velocity to where it started.`,
    },
  ];
}

/** Where a particle is after a given time, placed as components. */
const mechPosition: Generator<PositionParams> = {
  id: 'mech-position',
  sample: samplePosition,
  render: (params): Slide => {
    const { r0, v, t } = params;
    const p = plus(r0, scaled(t, v));
    return {
      kind: 'tiles',
      prompt: positionPrompt(params, `Find its position vector after $${t}$ seconds.`),
      template: VECTOR_TEMPLATE,
      // The velocity added once instead of t times, and the start left out.
      bank: bankOf(tilesOf(p), [...tilesOf(plus(r0, v)), ...tilesOf(scaled(t, v))]),
      answer: tilesOf(p),
    };
  },
  solution: positionSolution,
};

/** The same position with its working laid out: the displacement, then the sum. */
const mechPositionSteps: Generator<PositionParams> = {
  id: 'mech-position-steps',
  sample: samplePosition,
  render: (params): Slide => {
    const { r0, v, t } = params;
    const moved = scaled(t, v);
    const p = plus(r0, moved);
    return {
      kind: 'steps',
      prompt: positionPrompt(
        params,
        `Work out where it is after $${t}$ seconds: the displacement $\\mathbf{v}t$ first, then add it to the start.`,
      ),
      start: [ijBr(r0), '+', `${t}`, ijBr(v)],
      reductions: [
        {
          span: [2, 4],
          value: ijBr(moved),
          // Only the first component scaled, the time added on, one second too many.
          bank: scattered([
            ijBr(moved),
            ijBr([moved[0], v[1]]),
            ijBr(plus(v, [t, t])),
            ijBr(scaled(t + 1, v)),
          ]),
        },
        {
          span: [0, 3],
          operator: 1,
          value: ijOf(p),
          bank: scattered([ijOf(p), ijOf(minus(r0, moved)), ijOf(plus(r0, v)), ijOf([p[0], p[1] + 1])]),
        },
      ],
    };
  },
  solution: positionSolution,
};

type WhenAsk = 'point' | 'north' | 'east';

interface WhenParams {
  who: number;
  p: Vec;
  v: Vec;
  t: number;
  ask: WhenAsk;
}

const whenStart = ({ p, v, t }: WhenParams): Vec => minus(p, scaled(t, v));

/**
 * When a particle reaches a place: one component of `r0 + vt` set equal to a
 * number. Built from the answer, so the time is always whole.
 */
const mechWhen: Generator<WhenParams> = {
  id: 'mech-when',
  choices: (params) => {
    const { p, v, t, ask } = params;
    const r0 = whenStart(params);
    const idx = ask === 'east' ? 1 : 0;
    // Forgetting the start, and the start's sign flipped.
    const slips = [p[idx] / v[idx], (p[idx] + r0[idx]) / v[idx], t + 1];
    return steered(signedChoices(t, slips.filter((x) => x > 0)), saltOf(params));
  },
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 6 : 4;
    for (let tries = 0; tries < 200; tries += 1) {
      const ask = rng.pick<WhenAsk>(['point', 'north', 'east']);
      const v = vec2(rng, -reach, reach);
      const t = rng.int(difficulty > 1 ? 2 : 1, difficulty > 1 ? 9 : 6);
      const p: Vec = [rng.int(-8, 8), rng.int(-8, 8)];
      if (ask === 'north') p[0] = 0;
      if (ask === 'east') p[1] = 0;
      const r0 = minus(p, scaled(t, v));
      if (r0.some((x) => Math.abs(x) > 20) || (r0[0] === 0 && r0[1] === 0)) continue;
      return { who: rng.int(0, PARTICLES.length - 1), p, v, t, ask };
    }
    return { who: 0, p: [5, 3], v: [2, 1], t: 3, ask: 'point' };
  },
  render: (params): Slide => {
    const { who, p, v, ask } = params;
    const question =
      ask === 'point'
        ? `At what time does it pass through the point with position vector $${ijOf(p)}$?`
        : ask === 'north'
          ? 'With $\\mathbf{i}$ pointing east and $\\mathbf{j}$ north, at what time is it due north or due south of the origin?'
          : 'With $\\mathbf{i}$ pointing east and $\\mathbf{j}$ north, at what time is it due east or due west of the origin?';
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${PARTICLES[who]} moves with constant velocity. Its position vector after $t$ seconds is below, in metres. ${question}`,
        },
        { kind: 'display', tex: motionTex(whenStart(params), v) },
      ],
      lead: '\\text{time } t =',
      keypad: WORKING_KEYS,
      answer: `${params.t}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { p, v, t, ask } = params;
    const r0 = whenStart(params);
    const idx = ask === 'east' ? 1 : 0;
    const unit = idx === 0 ? '\\mathbf{i}' : '\\mathbf{j}';
    const other = 1 - idx;
    const lead =
      ask === 'point'
        ? `Both components have to match at the same moment. The $${unit}$ component gives an equation in $t$:`
        : ask === 'north'
          ? 'Due north or south of the origin means no distance east or west: the $\\mathbf{i}$ component is zero.'
          : 'Due east or west of the origin means no distance north or south: the $\\mathbf{j}$ component is zero.';
    return [
      { text: lead },
      { tex: `${affTex(r0[idx], v[idx], 't')} = ${p[idx]}` },
      { tex: solvedForTex(v[idx], 't', p[idx] - r0[idx], `t = ${t}`) },
      ask === 'point'
        ? {
            text: `The $${other === 0 ? '\\mathbf{i}' : '\\mathbf{j}'}$ component checks it: $${r0[other]} + ${paren(v[other])} \\times ${t} = ${p[other]}$, as it should.`,
          }
        : { text: `So it is there after $${t}$ seconds, at $${ijOf(p)}$.` },
    ];
  },
};

interface TimeSliderParams {
  r0: Vec;
  v: Vec;
  t: number;
}

/**
 * A slider track in seconds from the start, over the part of the path the
 * figure shows, trimmed so the handle does not rest on the answer.
 */
function timeTrack(r0: Vec, v: Vec, t: number): [number, number] | undefined {
  const range = tRange(r0, v, 8);
  if (!range) return undefined;
  const min = Math.max(0, Math.ceil(range[0]));
  let max = Math.min(8, Math.floor(range[1]));
  if (min + Math.round((max - min) / 2) === t && max - 1 > t) max -= 1;
  if (max - min < 4 || min + Math.round((max - min) / 2) === t || t > max) return undefined;
  return [min, max];
}

/**
 * Drag the time until the marker is where the particle is. Its path is drawn
 * with a dot at each whole second from where it starts, but the point asked
 * about is given only as a position vector, so the learner has to find it.
 */
const mechTimeSlider: Generator<TimeSliderParams> = {
  id: 'mech-time-slider',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 300; tries += 1) {
      // Heading rightwards, so the marker's place across the figure is time in order.
      const v: Vec = [rng.int(1, difficulty > 1 ? 3 : 2), difficulty > 1 ? rng.int(-3, 3) : nonZero(rng.int(-2, 2), 1)];
      const r0: Vec = [rng.int(-7, -1), rng.int(-6, 6)];
      const t = rng.int(2, 6);
      const p = plus(r0, scaled(t, v));
      if (p.some((x) => Math.abs(x) > 7)) continue;
      if (!timeTrack(r0, v, t)) continue;
      return { r0, v, t };
    }
    return { r0: [-6, -3], v: [2, 1], t: 3 };
  },
  render: ({ r0, v, t }): Slide => {
    const span = 8;
    const [min, max] = timeTrack(r0, v, t) ?? [0, 6];
    const p = plus(r0, scaled(t, v));
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `A particle starts at $A$ and moves with constant velocity; its path is drawn with a dot at each whole second. Slide $t$ to the time when it is at the point with position vector $${ijOf(p)}$.`,
        },
        { kind: 'display', tex: motionTex(r0, v) },
      ],
      min,
      max,
      step: 1,
      answer: t,
      readout: 't = {v}',
      figure: {
        svg: linesSvg([{ a: r0, b: v, dots: true }], [{ at: r0, name: 'A' }], {
          span,
          label: 'The path of a particle on squared paper, with a dot at each whole second',
        }),
        // In seconds: the marker for a time sits where the particle is then.
        xMin: (-span - r0[0]) / v[0],
        xMax: (span - r0[0]) / v[0],
        axis: 'x',
        origin: 0,
      },
    };
  },
  solution: ({ r0, v, t }) => {
    const p = plus(r0, scaled(t, v));
    return [
      { text: 'Match the $\\mathbf{i}$ component of the position with the point\'s:' },
      { tex: `${affTex(r0[0], v[0], 't')} = ${p[0]} \\implies t = ${t}` },
      {
        text: `The $\\mathbf{j}$ component agrees: $${r0[1]} + ${paren(v[1])} \\times ${t} = ${p[1]}$. On the figure that is $${t}$ dots along from $A$, one per second.`,
      },
    ];
  },
};

interface VelocityFromParams {
  who: number;
  a: Vec;
  v: Vec;
  t1: number;
  k: number;
}

/**
 * A constant velocity from two sightings: the displacement between them over
 * the time between them. At the second difficulty the times are clock times,
 * so the gap has to be worked out too.
 */
const mechVelocityFrom: Generator<VelocityFromParams> = {
  id: 'mech-velocity-from',
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 6 : 4;
    return {
      who: rng.int(0, PARTICLES.length - 1),
      a: [rng.int(-8, 8), nonZero(rng.int(-8, 8), -3)],
      v: vec2(rng, -reach, reach),
      t1: difficulty > 1 ? rng.int(1, 4) : 0,
      k: rng.int(2, 5),
    };
  },
  render: ({ who, a, v, t1, k }): Slide => {
    const b = plus(a, scaled(k, v));
    const moved = minus(b, a);
    const text =
      t1 === 0
        ? `${PARTICLES[who]} moves with constant velocity. It passes the point with position vector $${ijOf(a)}$, and $${k}$ seconds later the point with position vector $${ijOf(b)}$. Find its velocity.`
        : `${PARTICLES[who]} moves with constant velocity. When $t = ${t1}$ it is at the point with position vector $${ijOf(a)}$, and when $t = ${t1 + k}$ at $${ijOf(b)}$. Find its velocity.`;
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `${text} Positions are in metres and times in seconds.` }],
      template: VECTOR_TEMPLATE,
      // The displacement not divided, and the subtraction the wrong way round.
      bank: bankOf(tilesOf(v), [...tilesOf(moved), ...tilesOf(scaled(-1, v))]),
      answer: tilesOf(v),
    };
  },
  solution: ({ a, v, t1, k }) => {
    const b = plus(a, scaled(k, v));
    return [
      {
        text: `Velocity is displacement per second. The displacement is the second position minus the first, and it took $${t1 === 0 ? k : `${t1 + k} - ${t1} = ${k}`}$ seconds.`,
      },
      componentLine('i', `${b[0]} - ${paren(a[0])}`, b[0] - a[0]),
      componentLine('j', `${b[1]} - ${paren(a[1])}`, b[1] - a[1]),
      { text: `Dividing each by $${k}$ gives $\\mathbf{v} = ${ijOf(v)}$, in $${MPS}$.` },
    ];
  },
};

/* Lesson 2: speed and direction. */

interface SpeedParams {
  who: number;
  v: Vec;
  c: number;
  r0?: Vec;
}

/** Speed as the magnitude of a velocity, sometimes read out of a position. */
const mechSpeed: Generator<SpeedParams> = {
  id: 'mech-speed',
  choices: (params) => {
    const { v, c } = params;
    // The components added, the root forgotten, and their difference.
    const slips = [Math.abs(v[0]) + Math.abs(v[1]), c * c, Math.abs(Math.abs(v[0]) - Math.abs(v[1]))];
    return steered(signedChoices(c, slips), saltOf(params));
  },
  sample: (rng, difficulty) => {
    const { v, c } = tripleVec(rng, difficulty > 1 ? 30 : 15);
    const who = rng.int(0, PARTICLES.length - 1);
    if (difficulty > 1 && rng.chance(0.5)) return { who, v, c, r0: [rng.int(-9, 9), nonZero(rng.int(-9, 9), 4)] };
    return { who, v, c };
  },
  render: ({ who, v, c, r0 }): Slide => ({
    kind: 'expression',
    prompt: r0
      ? [
          {
            kind: 'prose',
            text: `The position vector of ${PARTICLES[who].toLowerCase()} after $t$ seconds is below, in metres. Find its speed in $${MPS}$.`,
          },
          { kind: 'display', tex: motionTex(r0, v) },
        ]
      : [
          {
            kind: 'prose',
            text: `${PARTICLES[who]} moves with velocity $${unitTex(v, MPS)}$. Find its speed in $${MPS}$.`,
          },
        ],
    lead: '\\text{speed} =',
    keypad: WORKING_KEYS,
    answer: `${c}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ v, c, r0 }) => [
    ...(r0
      ? [{ text: `The velocity is what multiplies $t$, $${ijOf(v)}$; the starting position plays no part in how fast it goes.` }]
      : []),
    { text: 'Speed is the magnitude of the velocity: its length, with the direction left behind.' },
    ...magnitudeLines(v, c),
    { text: `So the speed is $${c} \\; ${MPS}$. A speed is never negative, whichever way the particle is heading.` },
  ],
};

interface TravelParams {
  who: number;
  v: Vec;
  c: number;
  time: number;
}

/** How far a particle goes: the speed times the time, the speed from a tree. */
const mechDistanceTree: Generator<TravelParams> = {
  id: 'mech-distance-tree',
  sample: (rng, difficulty) => {
    const { v, c } = tripleVec(rng, difficulty > 1 ? 26 : 13);
    return { who: rng.int(0, PARTICLES.length - 1), v, c, time: rng.int(2, difficulty > 1 ? 12 : 6) };
  },
  render: ({ who, v, c, time }): Slide => {
    const answer = [`${v[0] * v[0]}`, `${v[1] * v[1]}`, `${c}`, `${c * time}`];
    const legs = Math.abs(v[0]) + Math.abs(v[1]);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${PARTICLES[who]} moves with constant velocity $${unitTex(v, MPS)}$ for $${time}$ seconds. Square each component, find the speed, then how far it travels in metres.`,
        },
      ],
      expression: `${time} \\times \\sqrt{${paren(v[0])}^2 + ${paren(v[1])}^2}`,
      nodes: [
        { id: 'x2', from: [] },
        { id: 'y2', from: [] },
        { id: 'speed', from: ['x2', 'y2'] },
        { id: 'far', from: ['speed'] },
      ],
      bank: geometryTreeBank(
        answer,
        // The root left off, the components added, and that sum carried through.
        [`${c * c}`, `${legs}`, `${legs * time}`, `${c + time}`],
        [`${c + 1}`, `${c * time + time}`, `${c * time - time}`],
      ),
      answer,
    };
  },
  solution: ({ v, c, time }) => [
    { text: 'The speed is the magnitude of the velocity:' },
    ...magnitudeLines(v, c),
    { text: `At a constant $${c} \\; ${MPS}$ for $${time}$ seconds it covers $${c} \\times ${time} = ${c * time}$ metres.` },
  ],
};

interface SpeedDirectionParams {
  who: number;
  d: Vec;
  c: number;
  k: number;
}

/** A velocity from a speed and a direction: the unit vector, scaled. */
const mechVelocityFromSpeed: Generator<SpeedDirectionParams> = {
  id: 'mech-velocity-from-speed',
  sample: (rng, difficulty) => {
    const { v, c } = tripleVec(rng, difficulty > 1 ? 17 : 13, difficulty > 1 || rng.chance(0.5));
    return { who: rng.int(0, PARTICLES.length - 1), d: v, c, k: rng.int(2, difficulty > 1 ? 6 : 4) };
  },
  render: ({ who, d, c, k }): Slide => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: `${PARTICLES[who]} moves at $${k * c} \\; ${MPS}$ in the direction of $${ijOf(d)}$. Find its velocity.`,
      },
    ],
    template: VECTOR_TEMPLATE,
    // The direction itself, the speed times it with no division, and the components crossed.
    bank: bankOf(tilesOf(scaled(k, d)), [...tilesOf(d), `${k * c * d[0]}`, `${k * d[1] + d[0]}`]),
    answer: tilesOf(scaled(k, d)),
  }),
  solution: ({ d, c, k }) => [
    { text: `The direction $${ijOf(d)}$ has length $${c}$, so dividing by $${c}$ gives a unit vector: length $1$, the same direction.` },
    ...magnitudeLines(d, c),
    {
      text: `A speed of $${k * c}$ is $${k * c}$ of those unit vectors, which is $${k * c} \\div ${c} = ${k}$ lots of $${ijOf(d)}$:`,
    },
    { tex: `\\mathbf{v} = ${k}${ijBr(d)}` },
    { tex: `= ${ijOf(scaled(k, d))}` },
  ],
};

interface HeadingParams {
  who: number;
  v: Vec;
  c: number;
  from?: Vec;
}

/**
 * The direction of motion as the tangent of its angle to `i`. Asked as a
 * tangent rather than in degrees because the exact value is what the
 * components give; the angle between two general vectors is the next level.
 */
const mechHeading: Generator<HeadingParams> = {
  id: 'mech-heading',
  choices: (params) => {
    const [a, b] = params.v;
    const { c } = params;
    return steered(
      options(
        { tex: fracTex(b, a), answer: `${b}/${a}` },
        // Upside down, and the sine and cosine in its place.
        { tex: fracTex(a, b), answer: `${a}/${b}` },
        { tex: fracTex(b, c), answer: `${b}/${c}` },
        { tex: fracTex(a, c), answer: `${a}/${c}` },
      ),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const { v, c } = tripleVec(rng, difficulty > 1 ? 30 : 15, false);
    const who = rng.int(0, PARTICLES.length - 1);
    if (difficulty > 1 && rng.chance(0.5)) return { who, v, c, from: [rng.int(-9, 5), rng.int(-9, 5)] };
    return { who, v, c };
  },
  render: ({ who, v, from }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: from
          ? `${PARTICLES[who]} moves in a straight line from the point with position vector $${ijOf(from)}$ to the point with position vector $${ijOf(plus(from, v))}$. $\\theta$ is the angle between its direction of motion and $\\mathbf{i}$. Find $\\tan\\theta$.`
          : `${PARTICLES[who]} moves with velocity $${unitTex(v, MPS)}$. $\\theta$ is the angle between its direction of motion and $\\mathbf{i}$. Find $\\tan\\theta$.`,
      },
    ],
    lead: '\\tan\\theta =',
    keypad: [{ insert: '/' }],
    answer: `${v[1]}/${v[0]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ v, from }) => [
    ...(from
      ? [{ text: `The direction of motion is the displacement, end minus start: $${ijOf(v)}$.` }]
      : []),
    {
      text: `Drawn as a right-angled triangle, the vector goes $${v[0]}$ along $\\mathbf{i}$ and $${v[1]}$ up $\\mathbf{j}$. The angle with $\\mathbf{i}$ is at the start, so the $\\mathbf{j}$ component is opposite it and the $\\mathbf{i}$ component is next to it.`,
    },
    { tex: `\\tan\\theta = \\frac{${v[1]}}{${v[0]}}${fracTex(v[1], v[0]) === `\\frac{${v[1]}}{${v[0]}}` ? '' : ` = ${fracTex(v[1], v[0])}`}` },
    { text: 'The length of the vector is the hypotenuse, which a tangent does not need.' },
  ],
};

/* Lesson 3: constant acceleration. */

interface SuvatParams {
  who: number;
  u: Vec;
  a: Vec;
  t: number;
}

function sampleSuvat(rng: Draw, difficulty: number): SuvatParams {
  const u: Vec = [rng.int(-6, 6), nonZero(rng.int(-6, 6), 3)];
  return {
    who: rng.int(0, PARTICLES.length - 1),
    u,
    a: vec2(rng, difficulty > 1 ? -5 : -3, difficulty > 1 ? 5 : 3),
    t: rng.int(2, difficulty > 1 ? 8 : 5),
  };
}

function suvatSolution({ u, a, t }: SuvatParams) {
  const v = plus(u, scaled(t, a));
  return [
    { text: 'With constant acceleration, each second adds $\\mathbf{a}$ to the velocity: $\\mathbf{v} = \\mathbf{u} + \\mathbf{a}t$.' },
    ...sumLines(u, t, a),
    { text: `So $\\mathbf{v} = ${ijOf(v)}$, in $${MPS}$.` },
  ];
}

/** The velocity after a time, from `v = u + at`. */
const mechSuvatV: Generator<SuvatParams> = {
  id: 'mech-suvat-v',
  choices: (params) => {
    const { u, a, t } = params;
    const right = plus(u, scaled(t, a));
    const wrong = [plus(u, a), scaled(t, a), minus(u, scaled(t, a)), plus(scaled(t, u), a)].filter(
      (w) => w[0] !== right[0] || w[1] !== right[1],
    );
    const seen = new Set([ijOf(right)]);
    const picked = wrong.filter((w) => (seen.has(ijOf(w)) ? false : (seen.add(ijOf(w)), true))).slice(0, 3);
    return steered(options({ tex: ijOf(right) }, ...picked.map((w) => ({ tex: ijOf(w) }))), saltOf(params));
  },
  sample: sampleSuvat,
  render: ({ who, u, a, t }): Slide => {
    const v = plus(u, scaled(t, a));
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${PARTICLES[who]} has initial velocity $${unitTex(u, MPS)}$ and constant acceleration $${unitTex(a, MPS2)}$. Find its velocity after $${t}$ seconds.`,
        },
      ],
      template: VECTOR_TEMPLATE,
      // The acceleration added once, and the starting velocity forgotten.
      bank: bankOf(tilesOf(v), [...tilesOf(plus(u, a)), ...tilesOf(scaled(t, a))]),
      answer: tilesOf(v),
    };
  },
  solution: suvatSolution,
};

/** The acceleration from two velocities: the change in velocity per second. */
const mechAcceleration: Generator<SuvatParams> = {
  id: 'mech-acceleration',
  sample: sampleSuvat,
  render: ({ who, u, a, t }): Slide => {
    const v = plus(u, scaled(t, a));
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${PARTICLES[who]} moves with constant acceleration. In $${t}$ seconds its velocity changes from $${unitTex(u, MPS)}$ to $${unitTex(v, MPS)}$. Find its acceleration.`,
        },
      ],
      template: VECTOR_TEMPLATE,
      // The change not divided by the time, and the subtraction reversed.
      bank: bankOf(tilesOf(a), [...tilesOf(scaled(t, a)), ...tilesOf(scaled(-1, a))]),
      answer: tilesOf(a),
    };
  },
  solution: ({ u, a, t }) => {
    const v = plus(u, scaled(t, a));
    return [
      { text: 'Rearranging $\\mathbf{v} = \\mathbf{u} + \\mathbf{a}t$ gives $\\mathbf{a} = (\\mathbf{v} - \\mathbf{u}) \\div t$: the change in velocity, per second.' },
      componentLine('i', `(${v[0]} - ${paren(u[0])}) \\div ${t}`, a[0]),
      componentLine('j', `(${v[1]} - ${paren(u[1])}) \\div ${t}`, a[1]),
      { text: `So $\\mathbf{a} = ${ijOf(a)}$, in $${MPS2}$.` },
    ];
  },
};

type ParallelAxis = 'i' | 'j' | 'diagonal';

interface ParallelTimeParams {
  who: number;
  u: Vec;
  a: Vec;
  t: number;
  axis: ParallelAxis;
}

const AXIS_TEX: Record<ParallelAxis, string> = {
  i: '\\mathbf{i}',
  j: '\\mathbf{j}',
  diagonal: '\\mathbf{i} + \\mathbf{j}',
};

/**
 * When an accelerating particle is moving parallel to `i`, `j` or `i + j`.
 * One component of `u + at` is zero, or the two are equal, at a whole time.
 */
const mechParallelTime: Generator<ParallelTimeParams> = {
  id: 'mech-parallel-time',
  choices: (params) => {
    const { u, a, t, axis } = params;
    // The other component's zero, where it has one.
    const other = axis === 'i' ? -u[0] / a[0] : axis === 'j' ? -u[1] / a[1] : t + 2;
    return steered(signedChoices(t, [other, t + 1, t - 1].filter((x) => x > 0)), saltOf(params));
  },
  sample: (rng, difficulty) => {
    const axes: ParallelAxis[] = difficulty > 1 ? ['i', 'j', 'diagonal'] : ['i', 'j'];
    for (let tries = 0; tries < 300; tries += 1) {
      const axis = rng.pick(axes);
      const t = rng.int(1, difficulty > 1 ? 8 : 6);
      const a = vec2(rng, -4, 4);
      let u: Vec;
      if (axis === 'diagonal') {
        if (a[0] === a[1]) continue;
        const k = rng.int(1, 6);
        u = [k - a[0] * t, k - a[1] * t];
      } else {
        const zero = axis === 'i' ? 1 : 0;
        u = [0, 0];
        u[zero] = -a[zero] * t;
        u[1 - zero] = rng.int(-6, 6);
        if (u[1 - zero] + a[1 - zero] * t === 0) continue;
      }
      if (u.some((x) => Math.abs(x) > 20) || (u[0] === 0 && u[1] === 0)) continue;
      return { who: rng.int(0, PARTICLES.length - 1), u, a, t, axis };
    }
    return { who: 0, u: [2, -6], a: [1, 2], t: 3, axis: 'i' };
  },
  render: ({ who, u, a, t, axis }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `${PARTICLES[who]} has initial velocity $${unitTex(u, MPS)}$ and constant acceleration $${unitTex(a, MPS2)}$. At what time, in seconds, is it moving parallel to $${AXIS_TEX[axis]}$?`,
      },
    ],
    lead: '\\text{time } t =',
    keypad: WORKING_KEYS,
    answer: `${t}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ u, a, t, axis }) => {
    const v = plus(u, scaled(t, a));
    const x = affTex(u[0], a[0], 't');
    const y = affTex(u[1], a[1], 't');
    return [
      { text: 'After $t$ seconds the velocity is $\\mathbf{u} + \\mathbf{a}t$, one component at a time:' },
      { tex: `\\mathbf{i}\\colon \\; {${x}}` },
      { tex: `\\mathbf{j}\\colon \\; {${y}}` },
      axis === 'diagonal'
        ? { text: 'Parallel to $\\mathbf{i} + \\mathbf{j}$ means the two components are equal (and positive, or it would be heading the opposite way):' }
        : {
            text: `Parallel to $${AXIS_TEX[axis]}$ means no $${axis === 'i' ? '\\mathbf{j}' : '\\mathbf{i}'}$ component at all:`,
          },
      axis === 'diagonal'
        ? { tex: `${x} = ${y}` }
        : { tex: `${axis === 'i' ? y : x} = 0` },
      { tex: `t = ${t}` },
      { text: `Check: at $t = ${t}$ the velocity is $${ijOf(v)}$.` },
    ];
  },
};

/** The displacement under constant acceleration, as two vectors and their sum. */
const mechDisplacementTree: Generator<SuvatParams> = {
  id: 'mech-displacement-tree',
  sample: (rng, difficulty) => {
    const t = rng.int(2, difficulty > 1 ? 6 : 4);
    // An odd time needs an even acceleration, or half of a t^2 is not whole.
    const a: Vec =
      t % 2 === 0
        ? vec2(rng, -3, 3)
        : [2 * nonZero(rng.int(-2, 2), 1), 2 * nonZero(rng.int(-2, 2), -1)];
    return { who: rng.int(0, PARTICLES.length - 1), u: vec2(rng, -5, 5), a, t };
  },
  render: ({ who, u, a, t }): Slide => {
    const ut = scaled(t, u);
    const half = scaled((t * t) / 2, a);
    const s = plus(ut, half);
    const answer = [ijOf(ut), ijOf(half), ijOf(s)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${PARTICLES[who]} has initial velocity $${unitTex(u, MPS)}$ and constant acceleration $${unitTex(a, MPS2)}$. Find $\\mathbf{u}t$ and $\\tfrac{1}{2}\\mathbf{a}t^2$ when $t = ${t}$, then its displacement in metres.`,
        },
      ],
      expression: '\\mathbf{s} = \\mathbf{u}t + \\tfrac{1}{2}\\mathbf{a}t^2',
      nodes: [
        { id: 'ut', from: [] },
        { id: 'half', from: [] },
        { id: 's', from: ['ut', 'half'] },
      ],
      bank: geometryTreeBank(
        answer,
        // The half forgotten, the square forgotten, and the start's velocity left out.
        [ijOf(scaled(t * t, a)), ijOf(plus(ut, scaled(t * t, a))), ijOf(plus(u, half))],
        [ijOf([s[0] + 1, s[1]]), ijOf([ut[0], ut[1] - 1]), ijOf([half[0] - 1, half[1]])],
      ),
      answer,
    };
  },
  solution: ({ u, a, t }) => {
    const ut = scaled(t, u);
    const half = scaled((t * t) / 2, a);
    return [
      { text: `With $t = ${t}$, $t^2 = ${t * t}$ and half of that is $${(t * t) / 2}$.` },
      { tex: `\\mathbf{u}t = ${t}${ijBr(u)}` },
      { tex: `= ${ijOf(ut)}` },
      { tex: `\\tfrac{1}{2}\\mathbf{a}t^2 = ${(t * t) / 2}${ijBr(a)}` },
      { tex: `= ${ijOf(half)}` },
      ...sumLines(ut, 1, half),
      { text: `So $\\mathbf{s} = ${ijOf(plus(ut, half))}$, in metres, measured from where it started.` },
    ];
  },
};

/* Lesson 4: forces. */

interface ForcesParams {
  forces: Vec[];
}

const forceName = (idx: number) => `\\mathbf{F}_${idx + 1}`;

function forceDisplays(forces: Vec[]): Block[] {
  return forces.map((f, idx) => ({ kind: 'display' as const, tex: `${forceName(idx)} = ${ijOf(f)}` }));
}

const sumOf = (vs: Vec[]): Vec => vs.reduce((acc, v) => plus(acc, v), [0, 0]);

function sumLinesOf(forces: Vec[]) {
  return (['i', 'j'] as const).map((unit, idx) =>
    componentLine(
      unit,
      // Signed terms rather than bracketed ones: three brackets overflow a phone.
      forces.map((f, n) => (n === 0 ? `${f[idx]}` : `${f[idx] < 0 ? '-' : '+'} ${Math.abs(f[idx])}`)).join(' '),
      sumOf(forces)[idx],
    ),
  );
}

/** The resultant of two or three forces, placed as components. */
const mechResultant: Generator<ForcesParams> = {
  id: 'mech-resultant',
  sample: (rng, difficulty) => {
    const count = difficulty > 1 ? 3 : 2;
    for (let tries = 0; tries < 100; tries += 1) {
      const forces = Array.from({ length: count }, () => vec2(rng, difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6));
      const r = sumOf(forces);
      if (r[0] === 0 && r[1] === 0) continue;
      return { forces };
    }
    return { forces: [[3, -2], [4, 5]] };
  },
  render: ({ forces }): Slide => {
    const r = sumOf(forces);
    const [f, g] = forces;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'The forces below, in newtons, act on a particle. Find the resultant force.' },
        ...forceDisplays(forces),
      ],
      template: VECTOR_TEMPLATE,
      // A force subtracted, and the answer's signs flipped.
      bank: bankOf(tilesOf(r), [`${r[0] - 2 * g[0]}`, `${r[1] - 2 * g[1]}`, `${-r[0]}`, `${f[1] * g[1]}`]),
      answer: tilesOf(r),
    };
  },
  solution: ({ forces }) => [
    { text: 'The resultant is the single force with the same effect as all of them together: their vector sum. Add the $\\mathbf{i}$ components, then the $\\mathbf{j}$ components.' },
    ...sumLinesOf(forces),
    { text: `So the resultant is $${ijOf(sumOf(forces))}$ newtons.` },
  ],
};

interface ResultantTreeParams {
  forces: Vec[];
  c: number;
}

/** The resultant's components and then its size, as a tree. */
const mechResultantTree: Generator<ResultantTreeParams> = {
  id: 'mech-resultant-tree',
  sample: (rng, difficulty) => {
    const count = difficulty > 1 ? 3 : 2;
    for (let tries = 0; tries < 300; tries += 1) {
      const { v: r, c } = tripleVec(rng, difficulty > 1 ? 25 : 15);
      const others = Array.from({ length: count - 1 }, () => vec2(rng, -8, 8));
      const last = minus(r, sumOf(others));
      if (last.some((x) => x === 0 || Math.abs(x) > 15)) continue;
      return { forces: [...others, last], c };
    }
    return { forces: [[1, 2], [2, 2]], c: 5 };
  },
  render: ({ forces, c }): Slide => {
    const r = sumOf(forces);
    const answer = [`${r[0]}`, `${r[1]}`, `${c}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'The forces below, in newtons, act on a particle. Find the components of the resultant, then its magnitude.',
        },
        ...forceDisplays(forces),
      ],
      expression: `\\left|${forces.map((_, idx) => forceName(idx)).join(' + ')}\\right|`,
      nodes: [
        { id: 'x', from: [] },
        { id: 'y', from: [] },
        { id: 'size', from: ['x', 'y'] },
      ],
      bank: geometryTreeBank(
        answer,
        // Signs dropped, the components added, and the root left off.
        [`${-r[0]}`, `${-r[1]}`, `${Math.abs(r[0]) + Math.abs(r[1])}`, `${c * c}`],
        [`${c + 1}`, `${r[0] + 1}`, `${r[1] - 1}`],
      ),
      answer,
    };
  },
  solution: ({ forces, c }) => [
    { text: 'Add the forces component by component:' },
    ...sumLinesOf(forces),
    { text: 'The magnitude of the resultant is the length of that vector:' },
    ...magnitudeLines(sumOf(forces), c),
    { text: `So the resultant has magnitude $${c}$ newtons.` },
  ],
};

/** The force that holds a particle in equilibrium: the resultant, reversed. */
const mechEquilibrium: Generator<ForcesParams> = {
  id: 'mech-equilibrium',
  choices: (params) => {
    const [x, y] = sumOf(params.forces);
    return steered(
      options(
        { tex: ijOf([-x, -y]) },
        // The resultant itself, and each component reversed on its own.
        { tex: ijOf([x, y]) },
        { tex: ijOf([-x, y]) },
        { tex: ijOf([x, -y]) },
      ),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const count = difficulty > 1 ? 3 : 2;
    for (let tries = 0; tries < 100; tries += 1) {
      const forces = Array.from({ length: count }, () => vec2(rng, -8, 8));
      const r = sumOf(forces);
      if (r[0] === 0 || r[1] === 0) continue;
      return { forces };
    }
    return { forces: [[3, -2], [4, 5]] };
  },
  render: ({ forces }): Slide => {
    const r = sumOf(forces);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `A particle is in equilibrium under the forces below and one more, $${forceName(forces.length)}$. All are in newtons. Find $${forceName(forces.length)}$.`,
        },
        ...forceDisplays(forces),
      ],
      template: VECTOR_TEMPLATE,
      // The resultant not reversed.
      bank: bankOf(tilesOf(scaled(-1, r)), [...tilesOf(r), `${r[0] + r[1]}`]),
      answer: tilesOf(scaled(-1, r)),
    };
  },
  solution: ({ forces }) => {
    const r = sumOf(forces);
    return [
      { text: 'In equilibrium the resultant of every force is zero, so the missing force cancels the others exactly. First add the ones you have:' },
      ...sumLinesOf(forces),
      {
        text: `The missing force is the reverse of that sum, $${forceName(forces.length)} = ${ijOf(scaled(-1, r))}$, so that adding it brings the total to $\\mathbf{0}$.`,
      },
    ];
  },
};

type FmaAsk = 'acceleration' | 'force';

interface FmaParams {
  forces: Vec[];
  m: number;
  acc: Vec;
  ask: FmaAsk;
}

/**
 * Newton's second law with vectors: the resultant is the mass times the
 * acceleration. Built from the acceleration, so dividing by the mass comes
 * out whole; at the second difficulty it may run backwards, to a force.
 */
const mechFma: Generator<FmaParams> = {
  id: 'mech-fma',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 200; tries += 1) {
      const acc: Vec = [rng.int(-4, 4), rng.int(-4, 4)];
      if (acc[0] === 0 && acc[1] === 0) continue;
      const m = rng.int(2, difficulty > 1 ? 9 : 6);
      const first = vec2(rng, -9, 9);
      const second = minus(scaled(m, acc), first);
      if (second[0] === 0 && second[1] === 0) continue;
      if (second.some((x) => Math.abs(x) > 30)) continue;
      const ask: FmaAsk = difficulty > 1 && rng.chance(0.5) ? 'force' : 'acceleration';
      return { forces: [first, second], m, acc, ask };
    }
    return { forces: [[3, 1], [3, 5]], m: 3, acc: [2, 2], ask: 'acceleration' };
  },
  render: ({ forces, m, acc, ask }): Slide => {
    const r = scaled(m, acc);
    if (ask === 'force') {
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text: `A particle of mass $${m}$ kg moves with acceleration $${unitTex(acc, MPS2)}$ under two forces. One is $\\mathbf{F}_1$ below, in newtons. Find the other, $\\mathbf{F}_2$.`,
          },
          { kind: 'display', tex: `\\mathbf{F}_1 = ${ijOf(forces[0])}` },
        ],
        template: VECTOR_TEMPLATE,
        // The whole of ma, and F1 added rather than taken away.
        bank: bankOf(tilesOf(forces[1]), [...tilesOf(r), ...tilesOf(plus(r, forces[0]))]),
        answer: tilesOf(forces[1]),
      };
    }
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `A particle of mass $${m}$ kg is acted on by the forces below, in newtons, and by nothing else. Find its acceleration.`,
        },
        ...forceDisplays(forces),
      ],
      template: VECTOR_TEMPLATE,
      // The resultant not divided by the mass, and the signs flipped.
      bank: bankOf(tilesOf(acc), [...tilesOf(r), ...tilesOf(scaled(-1, acc))]),
      answer: tilesOf(acc),
    };
  },
  solution: ({ forces, m, acc, ask }) => {
    const r = scaled(m, acc);
    if (ask === 'force') {
      return [
        { text: 'The resultant is the mass times the acceleration, $\\mathbf{F}_1 + \\mathbf{F}_2 = m\\mathbf{a}$:' },
        { tex: `m\\mathbf{a} = ${m}${ijBr(acc)}` },
        { tex: `= ${ijOf(r)}` },
        { text: 'So $\\mathbf{F}_2$ is what is left when $\\mathbf{F}_1$ is taken away from that:' },
        componentLine('i', `${r[0]} - ${paren(forces[0][0])}`, forces[1][0]),
        componentLine('j', `${r[1]} - ${paren(forces[0][1])}`, forces[1][1]),
      ];
    }
    return [
      { text: 'First the resultant, the sum of the forces:' },
      ...sumLinesOf(forces),
      { text: `Then $\\mathbf{F} = m\\mathbf{a}$, so $\\mathbf{a} = \\mathbf{F} \\div m$. Dividing each component by $${m}$:` },
      { tex: `\\mathbf{a} = ${ijOf(acc)}` },
      { text: `That is in $${MPS2}$, and it points the same way as the resultant.` },
    ];
  },
};

interface ForceKParams {
  forces: Vec[];
  pos: number;
  axis: 'i' | 'j' | 'slant';
  dir: Vec;
}

const SLANTS: Vec[] = [
  [1, 2], [2, 1], [1, -1], [1, 1], [3, 1], [1, 3], [2, -1], [1, -2], [3, -2], [2, 3],
];

/** A force written with its `pos` component as the unknown `k`. */
function forceWithK(f: Vec, pos: number): string {
  if (pos === 0) {
    return `k\\mathbf{i} ${f[1] < 0 ? '-' : '+'} ${Math.abs(f[1]) === 1 ? '' : Math.abs(f[1])}\\mathbf{j}`;
  }
  return `${ijOf([f[0], 0])} + k\\mathbf{j}`;
}

/**
 * An unknown component that makes the resultant point a given way. Parallel to
 * `i` or `j` zeroes one component; parallel to a slanted vector puts the
 * components in its ratio.
 */
const mechForceK: Generator<ForceKParams> = {
  id: 'mech-force-k',
  choices: (params) => {
    const k = params.forces[1][params.pos];
    return steered(signedChoices(k, [-k, k + params.forces[0][params.pos], k - 1]), saltOf(params));
  },
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 400; tries += 1) {
      if (difficulty > 1) {
        const dir = rng.pick(SLANTS);
        const s = nonZero(rng.int(-4, 4), 2);
        const first = vec2(rng, -8, 8);
        const second = minus(scaled(s, dir), first);
        if (second.some((x) => x === 0 || Math.abs(x) > 15)) continue;
        return { forces: [first, second], pos: 0, axis: 'slant', dir };
      }
      const axis = rng.pick(['i', 'j'] as const);
      // Parallel to i: no j component, so the unknown is a j component.
      const pos = axis === 'i' ? 1 : 0;
      const forces = [vec2(rng, -8, 8), vec2(rng, -8, 8), vec2(rng, -8, 8)];
      forces[1][pos] = -(forces[0][pos] + forces[2][pos]);
      if (forces[1][pos] === 0 || sumOf(forces)[1 - pos] === 0) continue;
      return { forces, pos, axis, dir: axis === 'i' ? [1, 0] : [0, 1] };
    }
    return { forces: [[3, 2], [-1, -2], [4, 0]], pos: 1, axis: 'i', dir: [1, 0] };
  },
  render: ({ forces, pos, axis, dir }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `The forces below act on a particle, in newtons. Their resultant is parallel to $${axis === 'slant' ? ijOf(dir) : `\\mathbf{${axis}}`}$. Find $k$.`,
      },
      ...forces.map((f, idx) => ({
        kind: 'display' as const,
        tex: `${forceName(idx)} = ${idx === 1 ? forceWithK(f, pos) : ijOf(f)}`,
      })),
    ],
    lead: '\\text{the unknown } k =',
    keypad: WORKING_KEYS,
    answer: `${forces[1][pos]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ forces, pos, axis, dir }) => {
    const k = forces[1][pos];
    const r = sumOf(forces);
    if (axis !== 'slant') {
      const unit = pos === 0 ? 'i' : 'j';
      const known = forces.filter((_, idx) => idx !== 1).map((f) => f[pos]);
      return [
        {
          text: `A resultant parallel to $\\mathbf{${axis}}$ has no $\\mathbf{${unit}}$ component, so the $\\mathbf{${unit}}$ components add to zero:`,
        },
        { tex: `${known[0]} + k + ${paren(known[1])} = 0` },
        { tex: `k = ${k}` },
      ];
    }
    const s = r[1] / dir[1];
    return [
      { text: `Parallel to $${ijOf(dir)}$ means the resultant is a multiple of it, $s${ijBr(dir)}$ for some number $s$. The $\\mathbf{j}$ components have no unknown in them:` },
      { tex: `${forces[0][1]} + ${paren(forces[1][1])} = ${r[1]} = ${coeffTex(dir[1], 's')}` },
      { tex: `s = ${s}` },
      { text: `So the $\\mathbf{i}$ component of the resultant is $${s} \\times ${paren(dir[0])} = ${r[0]}$:` },
      { tex: `${forces[0][0]} + k = ${r[0]} \\implies k = ${k}` },
    ];
  },
};

/* Lesson 5: two particles. */

interface TwoParticleParams {
  a0: Vec;
  va: Vec;
  b0: Vec;
  vb: Vec;
  time: number;
}

function twoDisplays({ a0, va, b0, vb }: { a0: Vec; va: Vec; b0: Vec; vb: Vec }): Block[] {
  return [
    { kind: 'display', tex: motionTex(a0, va, '\\mathbf{r}_A') },
    { kind: 'display', tex: motionTex(b0, vb, '\\mathbf{r}_B') },
  ];
}

/** Where B is seen from A at a given time: `r_B - r_A`. */
const mechRelative: Generator<TwoParticleParams> = {
  id: 'mech-relative',
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 5 : 3;
    for (let tries = 0; tries < 100; tries += 1) {
      const va = vec2(rng, -reach, reach);
      const vb = vec2(rng, -reach, reach);
      if (va[0] === vb[0] && va[1] === vb[1]) continue;
      const a0: Vec = [rng.int(-8, 8), nonZero(rng.int(-8, 8), 1)];
      const b0: Vec = [nonZero(rng.int(-8, 8), -2), rng.int(-8, 8)];
      const time = rng.int(1, difficulty > 1 ? 8 : 5);
      const d = minus(plus(b0, scaled(time, vb)), plus(a0, scaled(time, va)));
      if (d[0] === 0 && d[1] === 0) continue;
      return { a0, va, b0, vb, time };
    }
    return { a0: [1, 2], va: [2, 1], b0: [5, -1], vb: [-1, 3], time: 2 };
  },
  render: (params): Slide => {
    const { a0, va, b0, vb, time } = params;
    const ra = plus(a0, scaled(time, va));
    const rb = plus(b0, scaled(time, vb));
    const d = minus(rb, ra);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Particles $A$ and $B$ move with constant velocities. Their position vectors after $t$ seconds are below, in metres. Find the position vector of $B$ relative to $A$ when $t = ${time}$.`,
        },
        ...twoDisplays(params),
      ],
      template: VECTOR_TEMPLATE,
      // A relative to B instead, and the gap at the start rather than at the time asked.
      bank: bankOf(tilesOf(d), [...tilesOf(scaled(-1, d)), ...tilesOf(minus(b0, a0))]),
      answer: tilesOf(d),
    };
  },
  solution: ({ a0, va, b0, vb, time }) => {
    const ra = plus(a0, scaled(time, va));
    const rb = plus(b0, scaled(time, vb));
    return [
      { text: `First where each one is when $t = ${time}$:` },
      { tex: `\\mathbf{r}_A = ${ijOf(ra)}` },
      { tex: `\\mathbf{r}_B = ${ijOf(rb)}` },
      { text: 'The position of $B$ relative to $A$ is the journey from $A$ to $B$, destination minus start: $\\mathbf{r}_B - \\mathbf{r}_A$.' },
      componentLine('i', `${rb[0]} - ${paren(ra[0])}`, rb[0] - ra[0]),
      componentLine('j', `${rb[1]} - ${paren(ra[1])}`, rb[1] - ra[1]),
    ];
  },
};

interface ApartParams extends TwoParticleParams {
  c: number;
}

/** How far apart two particles are: the relative position, then its length. */
const mechApartTree: Generator<ApartParams> = {
  id: 'mech-apart-tree',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 300; tries += 1) {
      const { v: d, c } = tripleVec(rng, difficulty > 1 ? 25 : 15);
      const va = vec2(rng, -3, 3);
      const vb = vec2(rng, -3, 3);
      if (va[0] === vb[0] && va[1] === vb[1]) continue;
      const time = rng.int(1, difficulty > 1 ? 6 : 4);
      const a0: Vec = [rng.int(-6, 6), rng.int(-6, 6)];
      const b0 = minus(plus(a0, d), scaled(time, minus(vb, va)));
      if (b0.some((x) => Math.abs(x) > 20) || (b0[0] === 0 && b0[1] === 0)) continue;
      if (a0[0] === 0 && a0[1] === 0) continue;
      return { a0, va, b0, vb, time, c };
    }
    return { a0: [1, 2], va: [2, 1], b0: [4, 6], vb: [2, 1], time: 2, c: 5 };
  },
  render: (params): Slide => {
    const { a0, va, b0, vb, time, c } = params;
    const d = minus(plus(b0, scaled(time, vb)), plus(a0, scaled(time, va)));
    const start = minus(b0, a0);
    const answer = [`${d[0]}`, `${d[1]}`, `${c}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Particles $A$ and $B$ have the position vectors below after $t$ seconds, in metres. Find the components of $\\mathbf{r}_B - \\mathbf{r}_A$ when $t = ${time}$, then how far apart they are.`,
        },
        ...twoDisplays(params),
      ],
      expression: `\\left|\\mathbf{r}_B - \\mathbf{r}_A\\right| \\text{ at } t = ${time}`,
      nodes: [
        { id: 'x', from: [] },
        { id: 'y', from: [] },
        { id: 'gap', from: ['x', 'y'] },
      ],
      bank: geometryTreeBank(
        answer,
        // The gap at the start, the subtraction reversed, and the components added.
        [`${start[0]}`, `${start[1]}`, `${-d[0]}`, `${-d[1]}`, `${Math.abs(d[0]) + Math.abs(d[1])}`],
        [`${c + 1}`, `${c * c}`, `${d[0] + 1}`],
      ),
      answer,
    };
  },
  solution: ({ a0, va, b0, vb, time, c }) => {
    const ra = plus(a0, scaled(time, va));
    const rb = plus(b0, scaled(time, vb));
    const d = minus(rb, ra);
    return [
      { text: `When $t = ${time}$, $\\mathbf{r}_A = ${ijOf(ra)}$ and $\\mathbf{r}_B = ${ijOf(rb)}$. Subtract:` },
      componentLine('i', `${rb[0]} - ${paren(ra[0])}`, d[0]),
      componentLine('j', `${rb[1]} - ${paren(ra[1])}`, d[1]),
      { text: 'The distance between them is the length of that vector:' },
      ...magnitudeLines(d, c),
    ];
  },
};

interface MeetParamsMotion {
  p: Vec;
  va: Vec;
  vb: Vec;
  time: number;
}

/**
 * Two particles built from where and when they collide. At the first
 * difficulty they may share one velocity component, so only the other
 * component says when; at the second both do.
 */
function sampleCollision(rng: Draw, difficulty: number): MeetParamsMotion {
  const reach = difficulty > 1 ? 4 : 3;
  for (let tries = 0; tries < 300; tries += 1) {
    const va = vec2(rng, -reach, reach);
    const vb = vec2(rng, -reach, reach);
    const differ = [va[0] !== vb[0], va[1] !== vb[1]];
    if (difficulty > 1 ? !(differ[0] && differ[1]) : !(differ[0] || differ[1])) continue;
    const time = rng.int(1, difficulty > 1 ? 7 : 5);
    const p: Vec = [rng.int(-6, 6), rng.int(-6, 6)];
    const a0 = minus(p, scaled(time, va));
    const b0 = minus(p, scaled(time, vb));
    if ([...a0, ...b0].some((x) => Math.abs(x) > 20)) continue;
    if ((a0[0] === 0 && a0[1] === 0) || (b0[0] === 0 && b0[1] === 0)) continue;
    return { p, va, vb, time };
  }
  return { p: [4, 3], va: [2, 1], vb: [-1, 3], time: 2 };
}

function collisionLines({ p, va, vb, time }: MeetParamsMotion) {
  return { a0: minus(p, scaled(time, va)), va, b0: minus(p, scaled(time, vb)), vb };
}

function collisionSolution(params: MeetParamsMotion) {
  const { a0, b0 } = collisionLines(params);
  const { p, va, vb, time } = params;
  const idx = va[0] !== vb[0] ? 0 : 1;
  const unit = idx === 0 ? '\\mathbf{i}' : '\\mathbf{j}';
  const other = 1 - idx;
  return [
    {
      text: `A collision needs both particles in the same place at the same time, so every component matches for one value of $t$. Set the $${unit}$ components equal:`,
    },
    { tex: `${affTex(a0[idx], va[idx], 't')} = ${affTex(b0[idx], vb[idx], 't')}` },
    { tex: solvedForTex(va[idx] - vb[idx], 't', b0[idx] - a0[idx], `t = ${time}`) },
    {
      text: `The other component has to agree at that same time, and it does: both come to $${p[other]}$. So they collide when $t = ${time}$, at $${ijOf(p)}$.`,
    },
  ];
}

/** When two particles collide. */
const mechMeetTime: Generator<MeetParamsMotion> = {
  id: 'mech-meet-time',
  choices: (params) => {
    const { time } = params;
    const { a0, b0, va, vb } = collisionLines(params);
    // Velocities added rather than subtracted, where that comes out whole.
    const summed = (b0[0] - a0[0]) / (va[0] + vb[0]);
    return steered(signedChoices(time, [summed, time + 1, time - 1].filter((x) => x > 0)), saltOf(params));
  },
  sample: sampleCollision,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Particles $A$ and $B$ move with constant velocities, with position vectors after $t$ seconds as below. They collide. At what time?',
      },
      ...twoDisplays(collisionLines(params)),
    ],
    lead: '\\text{they collide at } t =',
    keypad: WORKING_KEYS,
    answer: `${params.time}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: collisionSolution,
};

/** Where two particles collide, placed as components. */
const mechMeetPoint: Generator<MeetParamsMotion> = {
  id: 'mech-meet-point',
  sample: sampleCollision,
  render: (params): Slide => {
    const lines = collisionLines(params);
    const { p, time } = params;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Particles $A$ and $B$ move with constant velocities, with position vectors after $t$ seconds as below. They collide. Find the position vector of the point where they do.',
        },
        ...twoDisplays(lines),
      ],
      template: VECTOR_TEMPLATE,
      // One second out, and where A started.
      bank: bankOf(tilesOf(p), [...tilesOf(plus(lines.a0, scaled(time + 1, lines.va))), ...tilesOf(lines.a0)]),
      answer: tilesOf(p),
    };
  },
  solution: (params) => [
    ...collisionSolution(params),
    { text: 'Finding the time comes first; the place is either position vector at that time.' },
  ],
};

type CollisionCase = 'collide' | 'miss' | 'never';

interface MeetFlowParams extends MeetParamsMotion {
  kase: CollisionCase;
  off: number;
}

const flowLines = (params: MeetFlowParams) => {
  const lines = collisionLines(params);
  if (params.kase === 'miss') return { ...lines, b0: plus(lines.b0, [0, params.off]) };
  if (params.kase === 'never') return { ...lines, b0: plus(lines.b0, [params.off, 0]) };
  return lines;
};

/**
 * Whether two particles collide, walked as a decision: are they ever level in
 * the i direction, and if so is the j direction level at that same moment?
 * Unlike two lines crossing, being at the same place at different times is not
 * a meeting.
 */
const mechMeetFlow: Generator<MeetFlowParams> = {
  id: 'mech-meet-flow',
  sample: (rng, difficulty) => {
    const kase = rng.pick<CollisionCase>(['collide', 'miss', 'never']);
    for (let tries = 0; tries < 300; tries += 1) {
      // Level across needs one shared velocity component, which the second
      // difficulty's sampler rules out; the first's allows it.
      const base = sampleCollision(rng, kase === 'never' ? 1 : difficulty);
      const { va, vb } = base;
      if (kase === 'never') {
        // Same speed across, so the gap across never closes.
        if (va[0] !== vb[0]) continue;
      } else if (va[0] === vb[0]) continue;
      return { ...base, kase, off: rng.pick([-3, -2, -1, 1, 2, 3]) };
    }
    return { p: [4, 3], va: [2, 1], vb: [-1, 3], time: 2, kase: 'collide', off: 1 };
  },
  render: (params): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Particles $A$ and $B$ move with constant velocities, with position vectors after $t$ seconds as below. Do they collide? Work down the questions; each answer chooses what gets asked next.',
      },
      ...twoDisplays(flowLines(params)),
    ],
    subject: '\\mathbf{r}_A \\text{ and } \\mathbf{r}_B',
    steps: [
      {
        id: 'across',
        ask: 'Is there a time $t \\geq 0$ when their $\\mathbf{i}$ components are equal?',
        branches: [
          { label: 'Yes', to: 'up' },
          { label: 'No', outcome: 'They never collide: they are never level with each other across the page.' },
        ],
      },
      {
        id: 'up',
        ask: 'At that same time, are their $\\mathbf{j}$ components equal as well?',
        branches: [
          { label: 'Yes', outcome: 'They collide at that time.' },
          { label: 'No', outcome: 'They do not collide: one passes the other\'s path at a different time.' },
        ],
      },
    ],
    answer: params.kase === 'collide' ? ['Yes', 'Yes'] : params.kase === 'miss' ? ['Yes', 'No'] : ['No'],
  }),
  solution: (params) => {
    const { a0, va, b0, vb } = flowLines(params);
    const { time, kase } = params;
    const ra = plus(a0, scaled(time, va));
    const rb = plus(b0, scaled(time, vb));
    if (kase === 'never') {
      return [
        {
          text: `Both $\\mathbf{i}$ components grow by $${va[0]}$ every second, from $${a0[0]}$ and $${b0[0]}$. They start apart and move across at the same rate, so they are never equal, and the particles never collide.`,
        },
      ];
    }
    return [
      { text: 'Set the $\\mathbf{i}$ components equal:' },
      { tex: `${affTex(a0[0], va[0], 't')} = ${affTex(b0[0], vb[0], 't')}` },
      { tex: `t = ${time}` },
      { text: `At $t = ${time}$ the $\\mathbf{j}$ components are $${ra[1]}$ for $A$ and $${rb[1]}$ for $B$.` },
      kase === 'collide'
        ? { text: `They agree, so the particles are in the same place at the same time: they collide at $${ijOf(ra)}$.` }
        : { text: 'They differ, so when the particles are level across the page they are apart up it, and they never collide.' },
    ];
  },
};

/* ---------- Level 12: the angle between two vectors ---------- */

/*
 * Level 12 turns the scalar product into an angle, in three dimensions
 * throughout: the scalar product and its sign, the angle itself, perpendicular
 * vectors, then the angle between two lines, between a line and a plane and
 * between two planes, on the forms levels 6 and 8 wrote them in.
 *
 * Every angle asked for in degrees is whole. Those questions draw their two
 * vectors from every pair of small vectors whose cosine is 0, a half, root two
 * over two or root three over two, either sign, so the angle is one the
 * learner can name. Where a question wants the cosine itself, both vectors
 * have whole lengths instead, like (1, 2, 2) and (2, 3, 6), and the answer is
 * a fraction. Degrees stay in the prose and on choice labels: every typed
 * answer is a bare number.
 */

/** `2i - j + 3k`, dropping any zero term. */
function ijkOf(v: Vec): string {
  let out = '';
  v.forEach((c, i) => {
    if (c === 0) return;
    const size = Math.abs(c) === 1 ? '' : `${Math.abs(c)}`;
    out += out === '' ? `${c < 0 ? '-' : ''}${size}${UNITS[i]}` : ` ${c < 0 ? '-' : '+'} ${size}${UNITS[i]}`;
  });
  return out === '' ? '\\mathbf{0}' : out;
}

/** A whole number from -most to most, never zero. */
function nonZeroInt(rng: Draw, most: number): number {
  const n = rng.int(1, most);
  return rng.chance(0.5) ? n : -n;
}

/** A three-component vector with no zero entry. */
const fullVec = (rng: Draw, most: number): Vec => [nonZeroInt(rng, most), nonZeroInt(rng, most), nonZeroInt(rng, most)];

const isParallel = (u: Vec, v: Vec) => crossOf(u, v).every((x) => x === 0);

type VectorForm = 'column' | 'ijk';

/** Two vectors for a prompt: columns side by side, or one i, j, k line each. */
function vectorsShown(a: Vec, b: Vec, form: VectorForm, names = ['\\mathbf{a}', '\\mathbf{b}']): Block[] {
  if (form === 'column') return [{ kind: 'display', tex: pairTex(a, b, names) }];
  return [
    { kind: 'display', tex: `${names[0]} = ${ijkOf(a)}` },
    { kind: 'display', tex: `${names[1]} = ${ijkOf(b)}` },
  ];
}

/** `\sqrt{n}`, or the whole number when n is a perfect square. */
function rootTex(n: number): string {
  const r = wholeRoot(n);
  return r === undefined ? `\\sqrt{${n}}` : `${r}`;
}

/** `\sqrt{n}` with its square factors taken out: `2\sqrt{3}`, `\sqrt{6}`, `4`. */
function surdTex(n: number): string {
  let outside = 1;
  let inside = n;
  for (let f = 2; f * f <= inside; f += 1) {
    while (inside % (f * f) === 0) {
      inside /= f * f;
      outside *= f;
    }
  }
  if (inside === 1) return `${outside}`;
  return `${outside === 1 ? '' : outside}\\sqrt{${inside}}`;
}

type CosClass = 'zero' | 'half' | 'root2' | 'root3';

/** The acute angle, in degrees, whose cosine each class names. */
const CLASS_ANGLE: Record<CosClass, number> = { zero: 90, half: 60, root2: 45, root3: 30 };

/** That cosine, positive, as the learner writes it. */
const CLASS_COS: Record<CosClass, string> = {
  zero: '0',
  half: '\\tfrac{1}{2}',
  root2: '\\tfrac{\\sqrt{2}}{2}',
  root3: '\\tfrac{\\sqrt{3}}{2}',
};

/** Which standard cosine `u . v / (|u||v|)` is, decided in whole numbers. */
function cosClassOf(u: Vec, v: Vec): CosClass | undefined {
  const dot = dotOf(u, v);
  const product = dotOf(u, u) * dotOf(v, v);
  if (dot === 0) return 'zero';
  if (4 * dot * dot === product) return 'half';
  if (2 * dot * dot === product) return 'root2';
  if (4 * dot * dot === 3 * product) return 'root3';
  return undefined;
}

/** The angle between two vectors in degrees: obtuse when the scalar product is negative. */
function angleOf(u: Vec, v: Vec, cls: CosClass): number {
  return dotOf(u, v) < 0 ? 180 - CLASS_ANGLE[cls] : CLASS_ANGLE[cls];
}

const pairCache = new Map<string, [Vec, Vec][]>();

/**
 * Every ordered pair of vectors with entries from -most to most, at least two
 * of them non-zero, whose cosine is in the class named. Built on first use and
 * kept. Drawing from the whole list rather than trying random vectors until
 * one fits is what lets a rare class, root three over two, come up as often
 * as a common one.
 */
function standardPairs(cls: CosClass, most: number): [Vec, Vec][] {
  const key = `${cls}:${most}`;
  const cached = pairCache.get(key);
  if (cached) return cached;
  const vectors: Vec[] = [];
  for (let x = -most; x <= most; x += 1) {
    for (let y = -most; y <= most; y += 1) {
      for (let z = -most; z <= most; z += 1) {
        if (nonZeroCount([x, y, z]) >= 2) vectors.push([x, y, z]);
      }
    }
  }
  const out: [Vec, Vec][] = [];
  for (const u of vectors) {
    for (const v of vectors) {
      if (cosClassOf(u, v) === cls) out.push([u, v]);
    }
  }
  pairCache.set(key, out);
  return out;
}

/** Two vectors a standard angle apart; the class list sets the weights. */
function drawStandard(rng: Draw, classes: CosClass[], most: number): { u: Vec; v: Vec; cls: CosClass } {
  const cls = rng.pick(classes);
  const [u, v] = rng.pick(standardPairs(cls, most));
  return { u, v, cls };
}

const wholeCache = new Map<number, Vec[]>();

/** Every vector of whole length up to `longest` with at least two entries non-zero. */
function wholeVectors(longest: number): Vec[] {
  const cached = wholeCache.get(longest);
  if (cached) return cached;
  const out: Vec[] = [];
  for (let x = -longest; x <= longest; x += 1) {
    for (let y = -longest; y <= longest; y += 1) {
      for (let z = -longest; z <= longest; z += 1) {
        const length = wholeRoot(x * x + y * y + z * z);
        if (nonZeroCount([x, y, z]) >= 2 && length !== undefined && length <= longest) out.push([x, y, z]);
      }
    }
  }
  wholeCache.set(longest, out);
  return out;
}

/** Two vectors of whole length, neither parallel nor perpendicular. */
function sampleWholePair(rng: Draw, difficulty: number): { u: Vec; v: Vec } {
  const pool = wholeVectors(difficulty > 1 ? 15 : 9);
  for (let tries = 0; tries < 200; tries += 1) {
    const u = rng.pick(pool);
    const v = rng.pick(pool);
    if (dotOf(u, v) === 0 || isParallel(u, v)) continue;
    return { u, v };
  }
  return { u: [1, 2, 2], v: [2, 3, 6] };
}

const lengthOf = (v: Vec) => wholeRoot(dotOf(v, v)) ?? 1;

const STANDARD_ANGLES = [30, 45, 60, 90, 120, 135, 150];

/**
 * An angle and three wrong ones, labelled in degrees. The slips come first;
 * the rest are the nearest standard angles, so every option is an angle the
 * question could plausibly have had.
 */
function degreeOptions(correct: number, slips: number[], salt: number): ChoiceOption[] {
  const nearest = [...STANDARD_ANGLES].sort((p, q) => Math.abs(p - correct) - Math.abs(q - correct));
  const picked: number[] = [];
  for (const x of [...slips, ...nearest]) {
    if (picked.length === 3) break;
    if (x === correct || x <= 0 || x >= 180 || picked.includes(x)) continue;
    picked.push(x);
  }
  return steered(
    options(
      { tex: `${correct}^\\circ`, answer: `${correct}` },
      ...picked.map((x) => ({ tex: `${x}^\\circ`, answer: `${x}` })),
    ),
    salt,
  );
}

/**
 * The angle between two vectors of a standard pair, worked one step to a
 * line. With `acute` the scalar product's modulus is used, which is the
 * convention for lines and planes.
 */
function standardAngleSteps(
  u: Vec,
  v: Vec,
  cls: CosClass,
  acute: boolean,
  names: [string, string],
  symbol = '\\theta',
): { text?: string; tex?: string }[] {
  const dot = dotOf(u, v);
  const U = dotOf(u, u);
  const V = dotOf(v, v);
  const shown = acute ? Math.abs(dot) : dot;
  const angle = acute ? CLASS_ANGLE[cls] : angleOf(u, v, cls);
  const cosTex = cls === 'zero' ? '0' : `${shown < 0 ? '-' : ''}${CLASS_COS[cls]}`;
  return [
    { text: `The scalar product $${names[0]} \\cdot ${names[1]}$:` },
    ...dotLines(v, u),
    { text: `The lengths are $${rootTex(U)}$ and $${rootTex(V)}$, and their product is $${surdTex(U * V)}$.` },
    ...(acute && dot < 0
      ? [{ text: 'The scalar product is negative, which gives the obtuse angle. For the acute one, take its modulus.' }]
      : []),
    { tex: cls === 'zero' ? `\\cos${symbol} = 0` : `\\cos${symbol} = \\frac{${shown}}{${surdTex(U * V)}} = ${cosTex}` },
    {
      text:
        `So $${symbol} = ${angle}^\\circ$.` +
        (!acute && dot < 0 ? ' The cosine is negative, so the angle is obtuse.' : ''),
    },
  ];
}

/* Lesson 1: the scalar product in three dimensions. */

interface Dot3Params {
  a: Vec;
  b: Vec;
  form: VectorForm;
}

/** Columns with every entry filled at first; later i, j, k form, with a gap or two. */
function sampleDot3(rng: Draw, difficulty: number): Dot3Params {
  if (difficulty === 1) return { a: fullVec(rng, 6), b: fullVec(rng, 6), form: 'column' };
  const a = fullVec(rng, 9);
  const b = fullVec(rng, 9);
  const gap = rng.int(0, 2);
  a[gap] = 0;
  if (rng.chance(0.5)) b[(gap + rng.int(1, 2)) % 3] = 0;
  return { a, b, form: 'ijk' };
}

function dot3Solution({ a, b, form }: Dot3Params) {
  const dot = dotOf(a, b);
  return [
    ...(form === 'ijk'
      ? [{ text: `A missing term is a zero component: $\\mathbf{a} = ${point3Tex(a)}$ and $\\mathbf{b} = ${point3Tex(b)}$.` }]
      : []),
    { text: 'Multiply matching components, $x$ with $x$, $y$ with $y$ and $z$ with $z$, then add the three products.' },
    ...dotLines(b, a),
    {
      text:
        dot === 0
          ? 'Zero, so the two vectors are perpendicular.'
          : dot > 0
            ? 'It is positive, so the angle between the vectors is acute.'
            : 'It is negative, so the angle between the vectors is obtuse.',
    },
  ];
}

/** The scalar product of two three-dimensional vectors. */
const angleDot3: Generator<Dot3Params> = {
  id: 'angle-dot3',
  // A sign slipped on one product, the whole thing negated, and x and y crossed.
  choices: (params) => {
    const { a, b } = params;
    const dot = dotOf(a, b);
    return steered(signedChoices(dot, [slippedDot(a, b), -dot, dotOf(a, [b[1], b[0], b[2]])]), saltOf(params));
  },
  sample: sampleDot3,
  render: ({ a, b, form }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Find the scalar product. The answer may be negative.' }, ...vectorsShown(a, b, form)],
    lead: '\\mathbf{a} \\cdot \\mathbf{b} =',
    keypad: [],
    answer: `${dotOf(a, b)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: dot3Solution,
};

/** The same scalar product as three products and a sum. */
const angleDot3Tree: Generator<Dot3Params> = {
  id: 'angle-dot3-tree',
  sample: sampleDot3,
  render: ({ a, b, form }): Slide => {
    const products = a.map((x, i) => x * b[i]);
    const dot = dotOf(a, b);
    const answer = [...products.map(String), `${dot}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Find $\\mathbf{a} \\cdot \\mathbf{b}$: the three products of matching components, then their sum.',
        },
        ...vectorsShown(a, b, form),
      ],
      expression: 'a_x b_x + a_y b_y + a_z b_z',
      nodes: [
        { id: 'x', from: [] },
        { id: 'y', from: [] },
        { id: 'z', from: [] },
        { id: 'sum', from: ['x', 'y', 'z'] },
      ],
      bank: geometryTreeBank(
        answer,
        [...products.map((p) => `${-p}`), `${slippedDot(a, b)}`],
        [dot + 1, dot - 1, dot + 2, dot - 2, dot + 3].map(String),
      ),
      answer,
    };
  },
  solution: dot3Solution,
};

type AngleKind = 'acute' | 'obtuse' | 'right';

interface SignParams {
  a: Vec;
  b: Vec;
  kind: AngleKind;
  form: VectorForm;
}

const KIND_LABELS: Record<AngleKind, string> = {
  acute: '\\text{Acute}',
  obtuse: '\\text{Obtuse}',
  right: '\\text{Right angle}',
};

/**
 * Acute, obtuse or right, from the sign of the scalar product alone. The
 * products are kept close to zero so the sign has to be worked out rather
 * than seen at a glance.
 */
const angleSign: Generator<SignParams> = {
  id: 'angle-sign',
  sample: (rng, difficulty) => {
    const kind = rng.pick<AngleKind>(['acute', 'obtuse', 'right']);
    const form: VectorForm = difficulty > 1 && rng.chance(0.5) ? 'ijk' : 'column';
    const most = difficulty > 1 ? 7 : 5;
    for (let tries = 0; tries < 2000; tries += 1) {
      const a = vec3(rng, -most, most);
      const b = vec3(rng, -most, most);
      if (nonZeroCount(a) < 2 || nonZeroCount(b) < 2 || isParallel(a, b)) continue;
      const dot = dotOf(a, b);
      if (Math.abs(dot) > (difficulty > 1 ? 6 : 12)) continue;
      if (kind === 'right' ? dot !== 0 : kind === 'acute' ? dot <= 0 : dot >= 0) continue;
      return { a, b, kind, form };
    }
    return { a: [2, -1, 3], b: [1, 5, 1], kind: 'right', form };
  },
  render: (params): Slide => {
    const { a, b, kind, form } = params;
    const others = (['acute', 'obtuse', 'right'] as AngleKind[]).filter((k) => k !== kind);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Is the angle between $\\mathbf{a}$ and $\\mathbf{b}$ acute, obtuse or a right angle?' },
        ...vectorsShown(a, b, form),
      ],
      options: placeAnswer(
        { id: kind, label: KIND_LABELS[kind] },
        others.map((k) => ({ id: k, label: KIND_LABELS[k] })),
        saltOf(params),
      ),
      correctId: kind,
    };
  },
  solution: ({ a, b, kind }) => [
    {
      text: 'Both lengths are positive, so the scalar product has the same sign as $\\cos\\theta$. Work it out:',
    },
    ...dotLines(b, a),
    {
      text:
        kind === 'right'
          ? 'Zero, so $\\cos\\theta = 0$ and the angle is a right angle.'
          : kind === 'acute'
            ? 'Positive, so $\\cos\\theta > 0$ and the angle is acute.'
            : 'Negative, so $\\cos\\theta < 0$ and the angle is obtuse.',
    },
  ],
};

interface UnknownKParams {
  a: Vec;
  b: Vec;
  /** Where k sits in a, and in b as well on the harder draws (-1 when not). */
  pa: number;
  pb: number;
  k: number;
}

/** `a . b` with k left in: the constant part and the coefficient of k. */
function kSplit({ a, b, pa, pb }: UnknownKParams): { rest: number; coef: number } {
  let rest = 0;
  let coef = 0;
  for (let i = 0; i < 3; i += 1) {
    if (i === pa) coef += b[i];
    else if (i === pb) coef += a[i];
    else rest += a[i] * b[i];
  }
  return { rest, coef };
}

/** The value `a . b` takes with this k. */
const kTarget = (params: UnknownKParams) => {
  const { rest, coef } = kSplit(params);
  return rest + coef * params.k;
};

/** Both vectors with k written in, for a prompt. */
function kPair({ a, b, pa, pb }: UnknownKParams): string {
  const ea = a.map((x, i) => (i === pa ? 'k' : `${x}`));
  const eb = b.map((x, i) => (i === pb ? 'k' : `${x}`));
  return `\\mathbf{a} = ${columnOf(ea)}, \\quad \\mathbf{b} = ${columnOf(eb)}`;
}

/** The three products as written by hand, `2(3) + 4k - 5(1)`. */
function kProductsTex({ a, b, pa, pb }: UnknownKParams): string {
  const terms = [0, 1, 2].map((i) => {
    if (i !== pa && i !== pb) return `${a[i]}(${b[i]})`;
    const c = i === pa ? b[i] : a[i];
    return `${c === 1 ? '' : c === -1 ? '-' : c}k`;
  });
  return terms.join(' + ').replace(/\+ -/g, '- ');
}

/**
 * Two vectors with k in one entry, or in one entry of each on the harder
 * draws, never the same position: the equation stays linear. Built outward
 * from a whole k, so the answer never needs a fraction.
 */
function sampleUnknownK(rng: Draw, difficulty: number, perpendicular: boolean): UnknownKParams {
  for (let tries = 0; tries < 600; tries += 1) {
    const a = fullVec(rng, 5);
    const b = fullVec(rng, 5);
    const pa = rng.int(0, 2);
    const pb = difficulty > 1 ? (pa + rng.int(1, 2)) % 3 : -1;
    const { rest, coef } = kSplit({ a, b, pa, pb, k: 0 });
    if (coef === 0) continue;
    let k: number;
    if (perpendicular) {
      if (rest % coef !== 0) continue;
      k = -rest / coef;
      if (k === 0 || Math.abs(k) > 9) continue;
    } else {
      k = nonZeroInt(rng, 6);
      if (rest + coef * k === 0) continue;
    }
    a[pa] = k;
    if (pb >= 0) b[pb] = k;
    return { a, b, pa, pb, k };
  }
  return { a: [2, 1, 3], b: [-1, 5, -1], pa: 1, pb: -1, k: 1 };
}

function unknownKSolution(params: UnknownKParams, perpendicular: boolean) {
  const { k } = params;
  const { rest, coef } = kSplit(params);
  const target = rest + coef * k;
  return [
    {
      text: perpendicular
        ? 'Perpendicular means the scalar product is zero. Write it out with $k$ left in:'
        : 'Write out the scalar product with $k$ left in, and set it equal to the value given:',
    },
    { tex: `${kProductsTex(params)} = ${target}` },
    { tex: `${affTex(rest, coef, 'k')} = ${target}` },
    { tex: solvedForTex(coef, 'k', target - rest, `k = ${k}`) },
    {
      text: `Check it: with $k = ${k}$ the three products add to $${rest} + ${paren(coef * k)} = ${target}$.`,
    },
  ];
}

/** A missing entry from the value of the scalar product. */
const angleDotK: Generator<UnknownKParams> = {
  id: 'angle-dot-k',
  // Wrong sign; the constant moved across without changing sign.
  choices: (params) => {
    const { rest, coef } = kSplit(params);
    const target = rest + coef * params.k;
    return steered(signedChoices(params.k, [-params.k, (target + rest) / coef, target / coef]), saltOf(params));
  },
  sample: (rng, difficulty) => sampleUnknownK(rng, difficulty, false),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `$\\mathbf{a} \\cdot \\mathbf{b} = ${kTarget(params)}$. Find $k$.` },
      { kind: 'display', tex: kPair(params) },
    ],
    lead: 'k =',
    keypad: [],
    answer: `${params.k}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => unknownKSolution(params, false),
};

type AlgebraAsk = 'sum' | 'difference' | 'plus-minus' | 'with-a' | 'scaled';

interface AlgebraParams {
  ma: number;
  mb: number;
  ab: number;
  ask: AlgebraAsk;
  p: number;
  q: number;
  perpendicular: boolean;
}

function algebraValue({ ma, mb, ab, ask, p, q }: AlgebraParams): number {
  if (ask === 'sum') return ma * ma + 2 * ab + mb * mb;
  if (ask === 'difference') return ma * ma - 2 * ab + mb * mb;
  if (ask === 'plus-minus') return ma * ma - mb * mb;
  if (ask === 'with-a') return ma * ma + p * ab;
  return p * q * ab;
}

function algebraLead({ ask, p, q }: AlgebraParams): string {
  if (ask === 'sum') return '\\left| \\mathbf{a} + \\mathbf{b} \\right|^2 =';
  if (ask === 'difference') return '\\left| \\mathbf{a} - \\mathbf{b} \\right|^2 =';
  if (ask === 'plus-minus') return '(\\mathbf{a} + \\mathbf{b}) \\cdot (\\mathbf{a} - \\mathbf{b}) =';
  if (ask === 'with-a') return `\\mathbf{a} \\cdot (${addMultipleTex('\\mathbf{a}', p, '\\mathbf{b}')}) =`;
  return `(${p}\\mathbf{a}) \\cdot (${q}\\mathbf{b}) =`;
}

/**
 * The rules of the scalar product, with no components at all: lengths and
 * one scalar product given, and an expression built from them to work out.
 * `a . a = |a|^2` is what most of them turn on; `(a + b).(a - b)` does not
 * need the scalar product it is given, which is the point of asking it.
 */
const angleDotAlgebra: Generator<AlgebraParams> = {
  id: 'angle-dot-algebra',
  choices: (params) => {
    const { ma, mb, ab, ask, p, q } = params;
    const value = algebraValue(params);
    const slips: Record<AlgebraAsk, number[]> = {
      // The 2 dropped, the cross terms dropped, the lengths added before squaring.
      sum: [ma * ma + ab + mb * mb, ma * ma + mb * mb, (ma + mb) * (ma + mb)],
      difference: [ma * ma + 2 * ab + mb * mb, ma * ma - ab + mb * mb, (ma - mb) * (ma - mb)],
      'plus-minus': [ma * ma + mb * mb, ma * ma - 2 * ab - mb * mb, mb * mb - ma * ma],
      // |a| where |a|^2 belongs, and the multiple lost.
      'with-a': [ma + p * ab, ma * ma + ab, p * ab],
      scaled: [(p + q) * ab, -p * q * ab, p * ab],
    };
    return steered(signedChoices(value, slips[ask]), saltOf(params));
  },
  sample: (rng, difficulty) => {
    const ma = rng.int(2, 9);
    const mb = rng.int(2, 9);
    const perpendicular = difficulty > 1 && rng.chance(0.4);
    const reach = Math.min(ma * mb - 1, 20);
    const ab = perpendicular ? 0 : nonZeroInt(rng, reach);
    const ask = perpendicular
      ? rng.pick<AlgebraAsk>(['sum', 'difference', 'with-a'])
      : rng.pick<AlgebraAsk>(difficulty > 1 ? ['sum', 'difference', 'plus-minus', 'with-a', 'scaled'] : ['sum', 'plus-minus', 'with-a', 'scaled']);
    return { ma, mb, ab, ask, p: rng.pick([-4, -3, -2, 2, 3, 4]), q: rng.pick([-3, -2, 2, 3]), perpendicular };
  },
  render: (params): Slide => {
    const { ma, mb, ab, perpendicular } = params;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: perpendicular
            ? `$|\\mathbf{a}| = ${ma}$ and $|\\mathbf{b}| = ${mb}$, and $\\mathbf{a}$ is perpendicular to $\\mathbf{b}$. Work out the value below.`
            : `$|\\mathbf{a}| = ${ma}$, $|\\mathbf{b}| = ${mb}$ and $\\mathbf{a} \\cdot \\mathbf{b} = ${ab}$. Work out the value below.`,
        },
      ],
      lead: algebraLead(params),
      keypad: [],
      answer: `${algebraValue(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { ma, mb, ab, ask, p, q, perpendicular } = params;
    const value = algebraValue(params);
    const opening = perpendicular
      ? [{ text: 'Perpendicular vectors have a scalar product of zero, so $\\mathbf{a} \\cdot \\mathbf{b} = 0$.' }]
      : [];
    const square = {
      text: 'A length squared is a vector dotted with itself, $|\\mathbf{v}|^2 = \\mathbf{v} \\cdot \\mathbf{v}$. Multiply out like brackets; $\\mathbf{a} \\cdot \\mathbf{b}$ and $\\mathbf{b} \\cdot \\mathbf{a}$ are equal, so the middle terms combine.',
    };
    if (ask === 'sum' || ask === 'difference') {
      const sign = ask === 'sum' ? '+' : '-';
      return [
        ...opening,
        square,
        { tex: `|\\mathbf{a}|^2 ${sign} 2\\,\\mathbf{a} \\cdot \\mathbf{b} + |\\mathbf{b}|^2` },
        { tex: `= ${ma}^2 ${sign} 2(${ab}) + ${mb}^2` },
        { tex: `= ${value}` },
        ...(perpendicular
          ? [{ text: 'With the middle term gone this is Pythagoras: the two vectors are the sides of a right-angled triangle.' }]
          : []),
      ];
    }
    if (ask === 'plus-minus') {
      return [
        square,
        { tex: '\\mathbf{a} \\cdot \\mathbf{a} - \\mathbf{b} \\cdot \\mathbf{b}' },
        { tex: `= ${ma}^2 - ${mb}^2 = ${value}` },
        {
          text: 'The two cross terms, $-\\mathbf{a} \\cdot \\mathbf{b}$ and $+\\mathbf{b} \\cdot \\mathbf{a}$, cancel, so the scalar product given is not needed at all.',
        },
      ];
    }
    if (ask === 'with-a') {
      return [
        ...opening,
        { text: 'The scalar product shares out over a sum, and $\\mathbf{a} \\cdot \\mathbf{a} = |\\mathbf{a}|^2$:' },
        { tex: `\\mathbf{a} \\cdot \\mathbf{a} ${p < 0 ? '-' : '+'} ${Math.abs(p)}\\,\\mathbf{a} \\cdot \\mathbf{b}` },
        { tex: `= ${ma}^2 + ${paren(p)}(${ab})` },
        { tex: `= ${value}` },
      ];
    }
    return [
      { text: 'Numbers multiplying either vector come outside the scalar product:' },
      { tex: `${p} \\times ${paren(q)} \\times \\mathbf{a} \\cdot \\mathbf{b}` },
      { tex: `= ${p * q}(${ab}) = ${value}` },
    ];
  },
};

/* Lesson 2: the angle itself. */

/**
 * `dotLines`, or the products alone when the substitution would run off a
 * phone: three two-digit entries each side, `-10(-10) + 11(-11) + 2(-2)`,
 * overflow the worked-solution panel.
 */
function fittedDotLines(p: Vec, n: Vec): { tex: string }[] {
  if (substituteTex(n, p.map(String)).length <= 22) return dotLines(p, n);
  const products = n.map((c, i) => c * p[i]).filter((x) => x !== 0);
  const sum = products.map((x, i) => (i === 0 ? `${x}` : x < 0 ? `- ${-x}` : `+ ${x}`)).join(' ');
  return [{ tex: sum }, { tex: `= ${dotOf(p, n)}` }];
}

interface WholePairParams {
  a: Vec;
  b: Vec;
}

function cosSolution({ a, b }: WholePairParams) {
  const dot = dotOf(a, b);
  const ma = lengthOf(a);
  const mb = lengthOf(b);
  return [
    {
      text: 'Rearrange $\\mathbf{a} \\cdot \\mathbf{b} = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta$: the cosine is the scalar product over the two lengths.',
    },
    ...fittedDotLines(b, a),
    { tex: `|\\mathbf{a}| = \\sqrt{${dotOf(a, a)}} = ${ma}` },
    { tex: `|\\mathbf{b}| = \\sqrt{${dotOf(b, b)}} = ${mb}` },
    { tex: `\\cos\\theta = \\frac{${dot}}{${ma} \\times ${mb}} = ${fracTex(dot, ma * mb)}` },
    {
      text:
        dot < 0
          ? 'The cosine is negative, so the angle is obtuse.'
          : 'The cosine is positive, so the angle is acute. Leaving out a square root is the usual slip, and a cosine outside $-1$ to $1$ would show it.',
    },
  ];
}

/** The cosine of the angle between two vectors of whole length. */
const angleCos: Generator<WholePairParams> = {
  id: 'angle-cos',
  choices: (params) => {
    const { a, b } = params;
    const dot = dotOf(a, b);
    const ma = lengthOf(a);
    const mb = lengthOf(b);
    const A = dotOf(a, a);
    const B = dotOf(b, b);
    return steered(
      options(
        { tex: fracTex(dot, ma * mb), answer: `${dot}/${ma * mb}` },
        { tex: fracTex(-dot, ma * mb), answer: `${-dot}/${ma * mb}` },
        // The lengths left squared, and added rather than multiplied.
        { tex: fracTex(dot, A * B), answer: `${dot}/${A * B}` },
        { tex: fracTex(dot, ma + mb), answer: `${dot}/${ma + mb}` },
      ),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const { u, v } = sampleWholePair(rng, difficulty);
    return { a: u, b: v };
  },
  render: ({ a, b }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: '$\\theta$ is the angle between $\\mathbf{a}$ and $\\mathbf{b}$, both of whole length. Find $\\cos\\theta$ as a fraction.',
      },
      { kind: 'display', tex: pairTex(a, b) },
    ],
    lead: '\\cos\\theta =',
    keypad: [{ insert: '/' }],
    answer: `${dotOf(a, b)}/${lengthOf(a) * lengthOf(b)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: cosSolution,
};

/** The same cosine as a tree: the scalar product and both lengths feed the quotient. */
const angleCosTree: Generator<WholePairParams> = {
  id: 'angle-cos-tree',
  sample: (rng, difficulty) => {
    const { u, v } = sampleWholePair(rng, difficulty);
    return { a: u, b: v };
  },
  render: ({ a, b }): Slide => {
    const dot = dotOf(a, b);
    const ma = lengthOf(a);
    const mb = lengthOf(b);
    const answer = [`${dot}`, `${ma}`, `${mb}`, fracTex(dot, ma * mb)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Find $\\cos\\theta$ for the angle between $\\mathbf{a}$ and $\\mathbf{b}$: the scalar product, the two lengths, then the cosine.',
        },
        { kind: 'display', tex: pairTex(a, b) },
      ],
      expression: '\\cos\\theta = \\frac{\\mathbf{a} \\cdot \\mathbf{b}}{|\\mathbf{a}| \\, |\\mathbf{b}|}',
      nodes: [
        { id: 'dot', from: [] },
        { id: 'a', from: [] },
        { id: 'b', from: [] },
        { id: 'cos', from: ['dot', 'a', 'b'] },
      ],
      bank: geometryTreeBank(
        answer,
        [fracTex(-dot, ma * mb), `${dotOf(a, a)}`, `${dotOf(b, b)}`, `${-dot}`],
        [`${ma + 1}`, `${mb + 2}`, `${dot + 1}`, fracTex(dot, ma + mb)],
      ),
      answer,
    };
  },
  solution: cosSolution,
};

interface DegreesParams {
  a: Vec;
  b: Vec;
  cls: CosClass;
}

/** The angle between two vectors, in whole degrees, acute or obtuse. */
const angleDegrees: Generator<DegreesParams> = {
  id: 'angle-degrees',
  // The sign ignored, and the angle confused with its complement.
  choices: (params) => {
    const angle = angleOf(params.a, params.b, params.cls);
    return degreeOptions(angle, [180 - angle, 90 - angle, angle - 90], saltOf(params));
  },
  sample: (rng, difficulty) => {
    const { u, v, cls } = drawStandard(
      rng,
      difficulty > 1
        ? ['half', 'half', 'root2', 'root2', 'root3', 'zero']
        : ['half', 'half', 'root2', 'root2', 'zero'],
      difficulty > 1 ? 3 : 2,
    );
    return { a: u, b: v, cls };
  },
  render: ({ a, b, cls }): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find the angle between $\\mathbf{a}$ and $\\mathbf{b}$, in degrees.' },
      { kind: 'display', tex: pairTex(a, b) },
    ],
    lead: '\\text{angle} =',
    keypad: [],
    answer: `${angleOf(a, b, cls)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, cls }) => standardAngleSteps(a, b, cls, false, ['\\mathbf{a}', '\\mathbf{b}']),
};

type GivenAsk = 'dot' | 'angle' | 'length';

interface GivenParams {
  ask: GivenAsk;
  ma: number;
  mb: number;
  theta: number;
}

const givenDot = ({ ma, mb, theta }: GivenParams) => ((theta === 60 ? 1 : -1) * ma * mb) / 2;
const halfTex = (theta: number) => (theta === 60 ? '\\tfrac{1}{2}' : '-\\tfrac{1}{2}');

/**
 * `a . b = |a||b|cos(theta)` with three of the four quantities given and the
 * fourth to find. The angle is 60 or 120 degrees, so the cosine is a half
 * either way round and the lengths make everything whole.
 */
const angleGiven: Generator<GivenParams> = {
  id: 'angle-given',
  choices: (params) => {
    const { ask, ma, mb, theta } = params;
    const dot = givenDot(params);
    if (ask === 'angle') return degreeOptions(theta, [180 - theta, 30, 150], saltOf(params));
    if (ask === 'dot') return steered(signedChoices(dot, [-dot, ma * mb, 2 * dot]), saltOf(params));
    // The cosine forgotten, and the length found upside down.
    return steered(signedChoices(mb, [mb / 2, 2 * mb, Math.abs(dot) - ma]), saltOf(params));
  },
  sample: (rng, difficulty) => {
    const ask = rng.pick<GivenAsk>(difficulty > 1 ? ['dot', 'angle', 'length'] : ['dot', 'angle']);
    for (let tries = 0; tries < 100; tries += 1) {
      const ma = rng.int(2, 12);
      const mb = rng.int(2, 12);
      if ((ma * mb) % 2 !== 0) continue;
      return { ask, ma, mb, theta: rng.pick([60, 120]) };
    }
    return { ask, ma: 4, mb: 5, theta: 60 };
  },
  render: (params): Slide => {
    const { ask, ma, mb, theta } = params;
    const dot = givenDot(params);
    const text: Record<GivenAsk, string> = {
      dot: `$|\\mathbf{a}| = ${ma}$, $|\\mathbf{b}| = ${mb}$ and the angle between them is $${theta}^\\circ$. Find $\\mathbf{a} \\cdot \\mathbf{b}$.`,
      angle: `$|\\mathbf{a}| = ${ma}$, $|\\mathbf{b}| = ${mb}$ and $\\mathbf{a} \\cdot \\mathbf{b} = ${dot}$. Find the angle between them, in degrees.`,
      length: `$|\\mathbf{a}| = ${ma}$, $\\mathbf{a} \\cdot \\mathbf{b} = ${dot}$ and the angle between them is $${theta}^\\circ$. Find $|\\mathbf{b}|$.`,
    };
    const lead: Record<GivenAsk, string> = {
      dot: '\\mathbf{a} \\cdot \\mathbf{b} =',
      angle: '\\text{angle} =',
      length: '|\\mathbf{b}| =',
    };
    const answer: Record<GivenAsk, number> = { dot, angle: theta, length: mb };
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: text[ask] }],
      lead: lead[ask],
      keypad: [],
      answer: `${answer[ask]}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { ask, ma, mb, theta } = params;
    const dot = givenDot(params);
    const formula = { tex: '\\mathbf{a} \\cdot \\mathbf{b} = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta' };
    if (ask === 'dot') {
      return [
        formula,
        { tex: `= ${ma} \\times ${mb} \\times \\cos ${theta}^\\circ` },
        { tex: `= ${ma * mb} \\times \\left(${halfTex(theta)}\\right) = ${dot}` },
        {
          text: theta === 60 ? 'An acute angle gives a positive scalar product.' : 'An obtuse angle gives a negative scalar product.',
        },
      ];
    }
    if (ask === 'angle') {
      return [
        { text: 'Rearranged, the cosine is the scalar product over the two lengths:' },
        { tex: `\\cos\\theta = \\frac{${dot}}{${ma} \\times ${mb}} = ${halfTex(theta)}` },
        {
          text: `The cosine of $60^\\circ$ is $\\tfrac{1}{2}$, and a negative cosine means the obtuse angle, $180^\\circ - 60^\\circ$. So $\\theta = ${theta}^\\circ$.`,
        },
      ];
    }
    return [
      formula,
      { tex: `${dot} = ${ma} \\times |\\mathbf{b}| \\times \\left(${halfTex(theta)}\\right)` },
      { tex: `${dot} = ${fracTex(theta === 60 ? ma : -ma, 2)}\\,|\\mathbf{b}|` },
      { tex: `|\\mathbf{b}| = ${mb}` },
    ];
  },
};

/* Lesson 3: perpendicular vectors. */

interface WhichPerpParams {
  a: Vec;
  c: Vec;
  slip: Vec;
  turned: Vec;
  form: VectorForm;
}

/**
 * Which of four vectors is perpendicular to a? One has a scalar product of
 * zero; one is that vector with a sign slipped; one is it with its entries
 * turned round; and one is -a, which points exactly the other way and is the
 * wrong idea of perpendicular this question is here to catch.
 */
const anglePerpWhich: Generator<WhichPerpParams> = {
  id: 'angle-perp-which',
  sample: (rng, difficulty) => {
    const form: VectorForm = difficulty > 1 ? 'ijk' : 'column';
    for (let tries = 0; tries < 2000; tries += 1) {
      const a = fullVec(rng, 4);
      const c = vec3(rng, -4, 4);
      if (nonZeroCount(c) < 2 || dotOf(a, c) !== 0) continue;
      const live = [0, 1, 2].filter((i) => a[i] * c[i] !== 0);
      const i = rng.pick(live);
      const slip = c.map((x, idx) => (idx === i ? -x : x));
      const turned = [c[1], c[2], c[0]];
      if (dotOf(a, turned) === 0) continue;
      const labels = [c, slip, turned, scaled(-1, a)].map(ijkOf);
      if (new Set(labels).size !== 4) continue;
      return { a, c, slip, turned, form };
    }
    return { a: [1, 2, 3], c: [1, 1, -1], slip: [-1, 1, -1], turned: [1, -1, 1], form };
  },
  render: (params): Slide => {
    const { a, c, slip, turned, form } = params;
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Which of these vectors is perpendicular to $\\mathbf{a}$?' },
        { kind: 'display', tex: `\\mathbf{a} = ${form === 'column' ? colTex(a) : ijkOf(a)}` },
      ],
      options: placeAnswer(
        { id: 'perpendicular', label: ijkOf(c) },
        [
          { id: 'slip', label: ijkOf(slip) },
          { id: 'turned', label: ijkOf(turned) },
          { id: 'opposite', label: ijkOf(scaled(-1, a)) },
        ],
        saltOf(params),
      ),
      correctId: 'perpendicular',
    };
  },
  solution: ({ a, c, slip, turned }) => [
    {
      text: `Perpendicular means a scalar product of zero, so dot each option with $\\mathbf{a}$. For $${ijkOf(c)}$:`,
    },
    ...dotLines(c, a),
    {
      text: `The other three give $${dotOf(a, slip)}$, $${dotOf(a, turned)}$ and $${-dotOf(a, a)}$. The last of those is $-\\mathbf{a}$, which points exactly the opposite way: that is as far from perpendicular as a direction gets.`,
    },
  ],
};

type Relation3 = 'perpendicular' | 'parallel' | 'acute' | 'obtuse';

interface RelationFlowParams {
  a: Vec;
  b: Vec;
  rel: Relation3;
  form: VectorForm;
}

/**
 * How two vectors sit, walked as a decision: is the scalar product zero, is
 * one a multiple of the other, and which way does the sign go.
 */
const angleRelationFlow: Generator<RelationFlowParams> = {
  id: 'angle-relation-flow',
  sample: (rng, difficulty) => {
    const rel = rng.pick<Relation3>(['perpendicular', 'parallel', 'acute', 'obtuse']);
    const form: VectorForm = difficulty > 1 && rng.chance(0.5) ? 'ijk' : 'column';
    for (let tries = 0; tries < 2000; tries += 1) {
      const a = vec3(rng, -4, 4);
      if (nonZeroCount(a) < 2) continue;
      let b: Vec;
      if (rel === 'parallel') {
        b = scaled(rng.pick([-3, -2, -1, 2, 3]), simplest(a));
        if (b.every((x, i) => x === a[i])) continue;
      } else {
        b = vec3(rng, -4, 4);
        if (nonZeroCount(b) < 2 || isParallel(a, b)) continue;
        const dot = dotOf(a, b);
        if (rel === 'perpendicular' ? dot !== 0 : rel === 'acute' ? dot <= 0 : dot >= 0) continue;
      }
      return { a, b, rel, form };
    }
    return { a: [1, 2, 3], b: [2, 4, 6], rel: 'parallel', form };
  },
  render: ({ a, b, rel, form }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'How do $\\mathbf{a}$ and $\\mathbf{b}$ sit relative to each other? Work down the questions; each answer chooses what gets asked next.',
      },
      ...vectorsShown(a, b, form),
    ],
    subject: '\\mathbf{a} \\text{ and } \\mathbf{b}',
    steps: [
      {
        id: 'dot',
        ask: 'Is $\\mathbf{a} \\cdot \\mathbf{b}$ zero?',
        branches: [
          { label: 'Yes', outcome: 'They are perpendicular.' },
          { label: 'No', to: 'multiple' },
        ],
      },
      {
        id: 'multiple',
        ask: 'Is $\\mathbf{b}$ a multiple of $\\mathbf{a}$?',
        branches: [
          { label: 'Yes', outcome: 'They are parallel.' },
          { label: 'No', to: 'sign' },
        ],
      },
      {
        id: 'sign',
        ask: 'Is $\\mathbf{a} \\cdot \\mathbf{b}$ positive?',
        branches: [
          { label: 'Yes', outcome: 'The angle between them is acute.' },
          { label: 'No', outcome: 'The angle between them is obtuse.' },
        ],
      },
    ],
    answer: rel === 'perpendicular' ? ['Yes'] : rel === 'parallel' ? ['No', 'Yes'] : ['No', 'No', rel === 'acute' ? 'Yes' : 'No'],
  }),
  solution: ({ a, b, rel }) => {
    const ratio = b.find((_, i) => a[i] !== 0)! / a.find((x) => x !== 0)!;
    const verdict: Record<Relation3, string> = {
      perpendicular: 'Zero, so they are perpendicular, and nothing else needs checking.',
      parallel: `Not zero. Each entry of $\\mathbf{b}$ is $${Number.isInteger(ratio) ? ratio : fracTex(b.find((_, i) => a[i] !== 0)!, a.find((x) => x !== 0)!)}$ times the matching entry of $\\mathbf{a}$, so $\\mathbf{b}$ is a multiple of $\\mathbf{a}$ and they are parallel.`,
      acute: 'Not zero, and $\\mathbf{b}$ is not a multiple of $\\mathbf{a}$. The scalar product is positive, so the angle is acute.',
      obtuse: 'Not zero, and $\\mathbf{b}$ is not a multiple of $\\mathbf{a}$. The scalar product is negative, so the angle is obtuse.',
    };
    return [{ text: 'Start with the scalar product:' }, ...dotLines(b, a), { text: verdict[rel] }];
  },
};

/** The k that makes two vectors perpendicular, with k in one or both. */
const anglePerpK: Generator<UnknownKParams> = {
  id: 'angle-perp-k',
  // Wrong sign, and the k found from the constant alone.
  choices: (params) => {
    const { rest, coef } = kSplit(params);
    return steered(signedChoices(params.k, [-params.k, rest / coef, rest]), saltOf(params));
  },
  sample: (rng, difficulty) => sampleUnknownK(rng, difficulty, true),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find the value of $k$ that makes $\\mathbf{a}$ and $\\mathbf{b}$ perpendicular.' },
      { kind: 'display', tex: kPair(params) },
    ],
    lead: 'k =',
    keypad: [],
    answer: `${params.k}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => unknownKSolution(params, true),
};

/** The same k as a tree: the part without k, the coefficient of k, then k. */
const anglePerpKTree: Generator<UnknownKParams> = {
  id: 'angle-perp-k-tree',
  sample: (rng, difficulty) => sampleUnknownK(rng, difficulty, true),
  render: (params): Slide => {
    const { rest, coef } = kSplit(params);
    const { k } = params;
    const answer = [`${rest}`, `${coef}`, `${k}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Make $\\mathbf{a}$ and $\\mathbf{b}$ perpendicular. Split $\\mathbf{a} \\cdot \\mathbf{b}$ into the number without $k$ and the coefficient of $k$, then solve for $k$.',
        },
        { kind: 'display', tex: kPair(params) },
      ],
      expression: '\\mathbf{a} \\cdot \\mathbf{b} = c + mk = 0',
      nodes: [
        { id: 'c', from: [] },
        { id: 'm', from: [] },
        { id: 'k', from: ['c', 'm'] },
      ],
      bank: geometryTreeBank(
        answer,
        [`${-k}`, `${-rest}`, `${-coef}`],
        [k + 1, k - 1, k + 2, rest + 2, coef - 1, rest - 3].map(String),
      ),
      answer,
    };
  },
  solution: (params) => unknownKSolution(params, true),
};

/* Lesson 4: the angle between two lines. */

type DirectionForm = 'vector' | 'point' | 'two';

interface ReadDirectionParams {
  a: Vec;
  d: Vec;
  form: DirectionForm;
}

/**
 * Which vector goes into the scalar product when a line is involved: the
 * direction, read off whichever way the line is written. The start point's
 * numbers are in the bank, since using them is the slip.
 */
const angleLineDirection: Generator<ReadDirectionParams> = {
  id: 'angle-line-direction',
  sample: (rng, difficulty) => {
    const form = rng.pick<DirectionForm>(difficulty > 1 ? ['point', 'two'] : ['vector', 'point']);
    for (let tries = 0; tries < 200; tries += 1) {
      const a = vec3(rng, -5, 5);
      const d = vec3(rng, -4, 4);
      if (nonZeroCount(d) < 2 || nonZeroCount(a) < 2) continue;
      return { a, d, form };
    }
    return { a: [1, -2, 3], d: [2, 1, -1], form };
  },
  render: ({ a, d, form }): Slide => {
    const b = plus(a, d);
    const prompt: Block[] =
      form === 'vector'
        ? [
            {
              kind: 'prose',
              text: 'To find the angle this line makes with another, which vector goes into the scalar product? Place its components.',
            },
            { kind: 'display', tex: lineTex(a, d) },
          ]
        : form === 'point'
          ? [
              {
                kind: 'prose',
                text: 'Every point of a line is below, for some value of $t$. Place the components of the vector that goes into the scalar product when finding the angle it makes with another line.',
              },
              { kind: 'display', tex: `\\left(${a.map((x, i) => affTex(x, d[i], 't')).join(', \\; ')}\\right)` },
            ]
          : [
              {
                kind: 'prose',
                text: `A line passes through $A${point3Tex(a)}$ and $B${point3Tex(b)}$. To find the angle it makes with another line, place the components of $\\overrightarrow{AB}$.`,
              },
            ];
    const tiles = d.map(String);
    return {
      kind: 'tiles',
      prompt,
      template: CROSS_TEMPLATE,
      bank: bankOf(tiles, [...a.map(String), `${-d[0]}`, ...(form === 'two' ? [`${b[1]}`] : [])]),
      answer: tiles,
    };
  },
  solution: ({ a, d, form }) => {
    if (form === 'two') {
      const b = plus(a, d);
      return [
        { text: 'The direction is the journey from $A$ to $B$, end minus start:' },
        ...[0, 1, 2].map((i) => ({ tex: `${AXES[i]}\\colon \\; {${b[i]} - ${bracket(a[i])}} = ${d[i]}` })),
        { text: 'Either point could start the line; neither changes which way it points.' },
      ];
    }
    return [
      {
        text:
          form === 'vector'
            ? 'An angle between lines depends only on which way they point. The direction is the vector multiplying $t$; the other only says where the line starts.'
            : 'The coefficients of $t$ are the direction; the numbers without a $t$ are a point on the line, which plays no part in an angle.',
      },
      { tex: `\\mathbf{d} = ${point3Tex(d)}` },
    ];
  },
};

type AngleSetting = 'lines' | 'line-plane' | 'planes';

interface SettingFlowParams {
  setting: AngleSetting;
  a: Vec;
  c: Vec;
  u: Vec;
  v: Vec;
  off: number;
}

const SETTING_TEXT: Record<AngleSetting, string> = {
  lines: 'You want the acute angle between these two lines.',
  'line-plane': 'You want the acute angle between this line and the plane $\\Pi$.',
  planes: 'You want the acute angle between these two planes.',
};

const SETTING_BRANCH: Record<AngleSetting, string> = {
  lines: 'Two direction vectors',
  'line-plane': 'A direction and a normal',
  planes: 'Two normals',
};

/** The displays for two lines, a line and a plane, or two planes. */
function settingDisplays({ setting, a, c, u, v, off }: SettingFlowParams): Block[] {
  if (setting === 'lines') {
    return [
      { kind: 'display', tex: lineTex(a, u, '\\lambda') },
      { kind: 'display', tex: lineTex(c, v, '\\mu') },
    ];
  }
  if (setting === 'line-plane') return [{ kind: 'display', tex: lineTex(a, u) }, planeDisplay(v, dotOf(a, v) + off, 'cartesian')];
  return [
    { kind: 'display', tex: `\\Pi_1\\colon \\; {${planeTex(u, dotOf(a, u) + off)}}` },
    { kind: 'display', tex: `\\Pi_2\\colon \\; {${planeTex(v, dotOf(c, v))}}` },
  ];
}

/**
 * What goes into the scalar product, and what to do with the angle it gives:
 * two directions or two normals, then the modulus for the acute angle; a
 * direction and a normal, then ninety degrees minus.
 */
const angleSettingFlow: Generator<SettingFlowParams> = {
  id: 'angle-setting-flow',
  sample: (rng, difficulty) => {
    const setting = difficulty > 1 ? rng.pick<AngleSetting>(['lines', 'line-plane', 'planes']) : 'lines';
    const negative = rng.chance(0.5);
    for (let tries = 0; tries < 400; tries += 1) {
      const u = vec3(rng, -3, 3);
      const v = vec3(rng, -3, 3);
      if (nonZeroCount(u) < 2 || nonZeroCount(v) < 2 || isParallel(u, v)) continue;
      const dot = dotOf(u, v);
      if (dot === 0 || (setting !== 'line-plane' && dot < 0 !== negative)) continue;
      return { setting, a: vec3(rng, -4, 4), c: vec3(rng, -4, 4), u, v, off: rng.int(-4, 4) };
    }
    return { setting, a: [1, 0, 2], c: [0, 1, -1], u: [1, 2, 2], v: [2, -1, 2], off: 1 };
  },
  render: (params): Slide => {
    const { setting, u, v } = params;
    const dot = dotOf(u, v);
    return {
      kind: 'flow',
      prompt: [
        { kind: 'prose', text: `${SETTING_TEXT[setting]} Work down the questions; each answer chooses what gets asked next.` },
        ...settingDisplays(params),
      ],
      subject: '\\cos\\theta = \\frac{\\mathbf{p} \\cdot \\mathbf{q}}{|\\mathbf{p}| \\, |\\mathbf{q}|}',
      steps: [
        {
          id: 'which',
          ask: 'Which two vectors are $\\mathbf{p}$ and $\\mathbf{q}$?',
          branches: [
            { label: SETTING_BRANCH.lines, to: 'sign' },
            { label: SETTING_BRANCH['line-plane'], to: 'complement' },
            { label: SETTING_BRANCH.planes, to: 'sign' },
          ],
        },
        {
          id: 'sign',
          ask: 'Is their scalar product negative?',
          branches: [
            { label: 'Yes', outcome: 'Take its modulus, so the angle found is the acute one.' },
            { label: 'No', outcome: 'The angle from the formula is already the acute one.' },
          ],
        },
        {
          id: 'complement',
          ask: 'That gives the angle between the line and the normal. Is it the angle with the plane?',
          branches: [
            { label: 'Yes', outcome: 'Use it as it is.' },
            { label: 'No', outcome: 'Take it from $90^\\circ$ to get the angle with the plane.' },
          ],
        },
      ],
      answer: [SETTING_BRANCH[setting], setting === 'line-plane' ? 'No' : dot < 0 ? 'Yes' : 'No'],
    };
  },
  solution: ({ setting, u, v }) => {
    const dot = dotOf(u, v);
    const which: Record<AngleSetting, string> = {
      lines: 'An angle between lines is the angle between their directions, the vectors multiplying $\\lambda$ and $\\mu$. The start points play no part.',
      'line-plane': "A line against a plane uses the line's direction and the plane's normal, read off the coefficients of $x$, $y$ and $z$.",
      planes: 'An angle between planes is the angle between their normals, read off the coefficients of $x$, $y$ and $z$.',
    };
    return [
      { text: which[setting] },
      ...dotLines(v, u),
      {
        text:
          setting === 'line-plane'
            ? 'The normal is at right angles to the plane, so the formula finds the angle to the normal; the angle to the plane is $90^\\circ$ minus that.'
            : dot < 0
              ? 'The scalar product is negative, which would give the obtuse angle, so take its modulus for the acute one.'
              : 'The scalar product is positive, so the formula already gives the acute angle.',
      },
    ];
  },
};

interface LinesAngleParams {
  a: Vec;
  c: Vec;
  u: Vec;
  v: Vec;
  cls: CosClass;
}

function twoLines({ a, c, u, v }: { a: Vec; c: Vec; u: Vec; v: Vec }): Block[] {
  return [
    { kind: 'display', tex: lineTex(a, u, '\\lambda') },
    { kind: 'display', tex: lineTex(c, v, '\\mu') },
  ];
}

/** The acute angle between two lines, in whole degrees. */
const angleLines: Generator<LinesAngleParams> = {
  id: 'angle-lines',
  // The obtuse angle the raw scalar product gives, and the complement.
  choices: (params) => {
    const acute = CLASS_ANGLE[params.cls];
    return degreeOptions(acute, [180 - acute, 90 - acute], saltOf(params));
  },
  sample: (rng, difficulty) => {
    const { u, v, cls } = drawStandard(
      rng,
      difficulty > 1 ? ['half', 'root2', 'root3', 'zero'] : ['half', 'root2'],
      difficulty > 1 ? 3 : 2,
    );
    // A direction doubled on the harder draws: the same line, and the same angle.
    const scale = difficulty > 1 && rng.chance(0.3) ? 2 : 1;
    return { a: vec3(rng, -4, 4), c: vec3(rng, -4, 4), u, v: scaled(scale, v), cls };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Find the acute angle between the two lines, in degrees.' }, ...twoLines(params)],
    lead: '\\text{angle} =',
    keypad: [],
    answer: `${CLASS_ANGLE[params.cls]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ u, v, cls }) => [
    {
      text: `Only the directions matter: $\\mathbf{d}_1 = ${point3Tex(u)}$ and $\\mathbf{d}_2 = ${point3Tex(v)}$.`,
    },
    ...standardAngleSteps(u, v, cls, true, ['\\mathbf{d}_1', '\\mathbf{d}_2']),
  ],
};

interface LinesCosParams {
  a: Vec;
  c: Vec;
  u: Vec;
  v: Vec;
}

function sampleLinesCos(rng: Draw, difficulty: number): LinesCosParams {
  const { u, v } = sampleWholePair(rng, difficulty);
  return { a: vec3(rng, -4, 4), c: vec3(rng, -4, 4), u, v };
}

function linesCosSolution({ u, v }: LinesCosParams) {
  const dot = dotOf(u, v);
  const mu = lengthOf(u);
  const mv = lengthOf(v);
  return [
    {
      text: `The directions are $\\mathbf{d}_1 = ${point3Tex(u)}$ and $\\mathbf{d}_2 = ${point3Tex(v)}$. Their scalar product:`,
    },
    ...fittedDotLines(v, u),
    { text: `Their lengths are $\\sqrt{${dotOf(u, u)}} = ${mu}$ and $\\sqrt{${dotOf(v, v)}} = ${mv}$.` },
    ...(dot < 0
      ? [{ text: 'The scalar product is negative, which gives the obtuse angle. For the acute one, take its modulus.' }]
      : []),
    { tex: `\\cos\\theta = \\frac{${Math.abs(dot)}}{${mu} \\times ${mv}} = ${fracTex(Math.abs(dot), mu * mv)}` },
  ];
}

/** The cosine of the acute angle between two lines whose directions have whole lengths. */
const angleLinesCos: Generator<LinesCosParams> = {
  id: 'angle-lines-cos',
  sample: sampleLinesCos,
  render: (params): Slide => {
    const { u, v } = params;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Find the cosine of the acute angle between the two lines, as a fraction.' },
        ...twoLines(params),
      ],
      lead: '\\cos\\theta =',
      keypad: [{ insert: '/' }],
      answer: `${Math.abs(dotOf(u, v))}/${lengthOf(u) * lengthOf(v)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: linesCosSolution,
};

/** The same cosine as a tree. The start points' scalar product is in the bank, as the slip. */
const angleLinesCosTree: Generator<LinesCosParams> = {
  id: 'angle-lines-cos-tree',
  sample: sampleLinesCos,
  render: (params): Slide => {
    const { a, c, u, v } = params;
    const dot = dotOf(u, v);
    const mu = lengthOf(u);
    const mv = lengthOf(v);
    const answer = [`${dot}`, `${mu}`, `${mv}`, fracTex(Math.abs(dot), mu * mv)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'The lines have directions $\\mathbf{d}_1$ and $\\mathbf{d}_2$. Find the scalar product of the directions, their lengths, then the cosine of the acute angle.',
        },
        ...twoLines(params),
      ],
      expression: '\\cos\\theta = \\frac{|\\mathbf{d}_1 \\cdot \\mathbf{d}_2|}{|\\mathbf{d}_1| \\, |\\mathbf{d}_2|}',
      nodes: [
        { id: 'dot', from: [] },
        { id: 'd1', from: [] },
        { id: 'd2', from: [] },
        { id: 'cos', from: ['dot', 'd1', 'd2'] },
      ],
      bank: geometryTreeBank(
        answer,
        [fracTex(-Math.abs(dot), mu * mv), `${dotOf(a, c)}`, `${dotOf(u, u)}`, `${-dot}`],
        [`${mu + 1}`, `${mv + 2}`, `${dot + 1}`, fracTex(Math.abs(dot), mu + mv)],
      ),
      answer,
    };
  },
  solution: linesCosSolution,
};

/* Lesson 5: lines and planes. */

interface LinePlaneAngleParams {
  a: Vec;
  b: Vec;
  n: Vec;
  off: number;
  cls: CosClass;
}

function sampleLinePlaneAngle(rng: Draw, difficulty: number): LinePlaneAngleParams {
  const { u, v, cls } = drawStandard(
    rng,
    difficulty > 1 ? ['half', 'root2', 'root3'] : ['half', 'root2'],
    difficulty > 1 ? 3 : 2,
  );
  return { a: vec3(rng, -4, 4), b: u, n: v, off: rng.int(-3, 3), cls };
}

function linePlaneDisplays({ a, b, n, off }: LinePlaneAngleParams): Block[] {
  return [{ kind: 'display', tex: lineTex(a, b) }, planeDisplay(n, dotOf(a, n) + off, 'cartesian')];
}

/** The angle with the plane: ninety degrees minus the angle with the normal. */
const planeAngleOf = (cls: CosClass) => 90 - CLASS_ANGLE[cls];

function linePlaneAngleSolution({ b, n, cls }: LinePlaneAngleParams) {
  const phi = CLASS_ANGLE[cls];
  return [
    {
      text: `First the angle $\\phi$ between the line and the normal, from $\\mathbf{b} = ${point3Tex(b)}$ and $\\mathbf{n} = ${point3Tex(n)}$.`,
    },
    ...standardAngleSteps(b, n, cls, true, ['\\mathbf{b}', '\\mathbf{n}'], '\\phi'),
    {
      text: `The normal is at right angles to the plane, so the line meets the plane at $90^\\circ - ${phi}^\\circ = ${90 - phi}^\\circ$. In one step: $\\sin\\theta = ${CLASS_COS[cls]}$.`,
    },
  ];
}

/** The acute angle between a line and a plane, in whole degrees. */
const angleLinePlane: Generator<LinePlaneAngleParams> = {
  id: 'angle-line-plane',
  // The angle with the normal instead, and its obtuse partners.
  choices: (params) => {
    const theta = planeAngleOf(params.cls);
    return degreeOptions(theta, [90 - theta, 90 + theta, 180 - theta], saltOf(params));
  },
  sample: sampleLinePlaneAngle,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find the acute angle between the line and the plane $\\Pi$, in degrees.' },
      ...linePlaneDisplays(params),
    ],
    lead: '\\text{angle} =',
    keypad: [],
    answer: `${planeAngleOf(params.cls)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: linePlaneAngleSolution,
};

/** The same angle as a tree: the scalar product and two lengths, sine, then the angle. */
const angleLinePlaneTree: Generator<LinePlaneAngleParams> = {
  id: 'angle-line-plane-tree',
  sample: sampleLinePlaneAngle,
  render: (params): Slide => {
    const { b, n, cls } = params;
    const theta = planeAngleOf(cls);
    const dot = dotOf(b, n);
    const B = dotOf(b, b);
    const N = dotOf(n, n);
    const answer = [`${dot}`, rootTex(B), rootTex(N), CLASS_COS[cls], `${theta}`];
    const otherCos = (['half', 'root2', 'root3'] as CosClass[]).filter((x) => x !== cls).map((x) => CLASS_COS[x]);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Find the acute angle between the line and the plane $\\Pi$: the scalar product of the direction and the normal, their lengths, $\\sin\\theta$, then $\\theta$ in degrees.',
        },
        ...linePlaneDisplays(params),
      ],
      expression: '\\sin\\theta = \\frac{|\\mathbf{b} \\cdot \\mathbf{n}|}{|\\mathbf{b}| \\, |\\mathbf{n}|}',
      nodes: [
        { id: 'dot', from: [] },
        { id: 'b', from: [] },
        { id: 'n', from: [] },
        { id: 'sin', from: ['dot', 'b', 'n'] },
        { id: 'theta', from: ['sin'] },
      ],
      bank: geometryTreeBank(
        answer,
        [`${90 - theta}`, `-${CLASS_COS[cls]}`, `${B}`, ...otherCos],
        [`${N}`, `${dot + 1}`, `${-dot}`],
      ),
      answer,
    };
  },
  solution: linePlaneAngleSolution,
};

interface PlanesAngleParams {
  n1: Vec;
  n2: Vec;
  d1: number;
  d2: number;
  cls: CosClass;
}

/** The acute angle between two planes, from their normals, in whole degrees. */
const anglePlanes: Generator<PlanesAngleParams> = {
  id: 'angle-planes',
  choices: (params) => {
    const acute = CLASS_ANGLE[params.cls];
    return degreeOptions(acute, [180 - acute, 90 - acute], saltOf(params));
  },
  sample: (rng, difficulty) => {
    const { u, v, cls } = drawStandard(
      rng,
      difficulty > 1 ? ['half', 'root2', 'root3', 'zero'] : ['half', 'root2'],
      difficulty > 1 ? 3 : 2,
    );
    return { n1: u, n2: v, d1: rng.int(-6, 6), d2: rng.int(-6, 6), cls };
  },
  render: ({ n1, n2, d1, d2, cls }): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find the acute angle between the two planes, in degrees.' },
      { kind: 'display', tex: `\\Pi_1\\colon \\; {${planeTex(n1, d1)}}` },
      { kind: 'display', tex: `\\Pi_2\\colon \\; {${planeTex(n2, d2)}}` },
    ],
    lead: '\\text{angle} =',
    keypad: [],
    answer: `${CLASS_ANGLE[cls]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n1, n2, cls }) => [
    {
      text: `The angle between two planes is the angle between their normals, read off the coefficients: $\\mathbf{n}_1 = ${point3Tex(n1)}$ and $\\mathbf{n}_2 = ${point3Tex(n2)}$.`,
    },
    ...standardAngleSteps(n1, n2, cls, true, ['\\mathbf{n}_1', '\\mathbf{n}_2']),
  ],
};

type SitSetting = 'line' | 'planes';
type SitRelation = 'perpendicular' | 'parallel' | 'neither';

interface SitParams {
  setting: SitSetting;
  rel: SitRelation;
  a: Vec;
  u: Vec;
  n: Vec;
  m: number;
  off: number;
}

const SIT_LABELS: Record<SitSetting, Record<SitRelation, string>> = {
  line: {
    perpendicular: '\\text{Perpendicular to the plane}',
    parallel: '\\text{Parallel to the plane}',
    neither: '\\text{Neither}',
  },
  planes: {
    perpendicular: '\\text{Perpendicular planes}',
    parallel: '\\text{Parallel planes}',
    neither: '\\text{Neither}',
  },
};

/**
 * Perpendicular, parallel or neither, for a line against a plane or for two
 * planes. The trap is the line: it is perpendicular to the plane when its
 * direction is parallel to the normal, and parallel to the plane when its
 * direction is perpendicular to the normal.
 */
const angleLinePlaneKind: Generator<SitParams> = {
  id: 'angle-line-plane-kind',
  sample: (rng, difficulty) => {
    const setting: SitSetting = difficulty > 1 && rng.chance(0.5) ? 'planes' : 'line';
    const rel = rng.pick<SitRelation>(['perpendicular', 'parallel', 'neither']);
    // Which relation needs the two vectors to be multiples of each other.
    const multiple = (setting === 'line') === (rel === 'perpendicular');
    for (let tries = 0; tries < 2000; tries += 1) {
      const n = vec3(rng, -3, 3);
      if (nonZeroCount(n) < 2) continue;
      const m = rng.pick([-2, -1, 2, 3]);
      let u: Vec;
      if (rel !== 'neither' && multiple) {
        u = scaled(m, n);
      } else {
        u = vec3(rng, -3, 3);
        if (nonZeroCount(u) < 2 || isParallel(u, n)) continue;
        if ((rel === 'neither') === (dotOf(u, n) === 0)) continue;
      }
      return { setting, rel, a: vec3(rng, -4, 4), u, n, m, off: nonZeroInt(rng, 4) };
    }
    return { setting, rel: 'neither', a: [1, 0, 2], u: [1, 1, 1], n: [1, 2, -1], m: 2, off: 1 };
  },
  render: (params): Slide => {
    const { setting, rel, a, u, n, m, off } = params;
    const d = dotOf(a, n);
    const others = (['perpendicular', 'parallel', 'neither'] as SitRelation[]).filter((x) => x !== rel);
    const prompt: Block[] =
      setting === 'line'
        ? [
            { kind: 'prose', text: 'Is the line perpendicular to the plane $\\Pi$, parallel to it, or neither?' },
            { kind: 'display', tex: lineTex(a, u) },
            planeDisplay(n, d + off, 'cartesian'),
          ]
        : [
            { kind: 'prose', text: 'Are these two planes perpendicular, parallel, or neither?' },
            { kind: 'display', tex: `\\Pi_1\\colon \\; {${planeTex(n, d)}}` },
            // A parallel pair is never the same plane twice.
            { kind: 'display', tex: `\\Pi_2\\colon \\; {${planeTex(u, rel === 'parallel' ? m * d + off : dotOf(a, u) + off)}}` },
          ];
    return {
      kind: 'choice',
      prompt,
      options: placeAnswer(
        { id: rel, label: SIT_LABELS[setting][rel] },
        others.map((x) => ({ id: x, label: SIT_LABELS[setting][x] })),
        saltOf(params),
      ),
      correctId: rel,
    };
  },
  solution: ({ setting, rel, u, n, m }) => {
    const first = setting === 'line' ? '\\mathbf{b}' : '\\mathbf{n}_2';
    const second = setting === 'line' ? '\\mathbf{n}' : '\\mathbf{n}_1';
    const intro =
      setting === 'line'
        ? `Compare the line's direction $\\mathbf{b} = ${point3Tex(u)}$ with the normal $\\mathbf{n} = ${point3Tex(n)}$.`
        : `Compare the normals, $\\mathbf{n}_1 = ${point3Tex(n)}$ and $\\mathbf{n}_2 = ${point3Tex(u)}$.`;
    if (rel !== 'neither' && (setting === 'line') === (rel === 'perpendicular')) {
      return [
        { text: intro },
        { tex: `${first} = ${coeffTex(m, second)}` },
        {
          text:
            setting === 'line'
              ? 'The direction is a multiple of the normal, so the line runs along the normal: it is perpendicular to the plane.'
              : 'One normal is a multiple of the other, so the planes face the same way: they are parallel.',
        },
      ];
    }
    return [
      { text: `${intro} Neither is a multiple of the other, so test the scalar product:` },
      ...dotLines(u, n),
      {
        text:
          rel === 'neither'
            ? 'It is not zero either, so the answer is neither.'
            : setting === 'line'
              ? 'Zero, so the direction is at right angles to the normal: the line runs parallel to the plane.'
              : 'Zero, so the normals are at right angles, and so are the planes.',
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
  crossProduct,
  crossEntrySteps,
  crossRules,
  crossUnknown,
  crossPerpendicular,
  crossCheckTree,
  crossArea,
  crossAreaTree,
  planeD,
  planeCartesian,
  planeOn,
  planeMissing,
  planeVectorForm,
  planeThreeNormal,
  planeThreeTree,
  planeThreeEquation,
  linePlaneT,
  linePlanePoint,
  linePlanePointTree,
  linePlaneRelation,
  linePlaneParallel,
  mechPosition,
  mechPositionSteps,
  mechWhen,
  mechTimeSlider,
  mechVelocityFrom,
  mechSpeed,
  mechDistanceTree,
  mechVelocityFromSpeed,
  mechHeading,
  mechSuvatV,
  mechAcceleration,
  mechParallelTime,
  mechDisplacementTree,
  mechResultant,
  mechResultantTree,
  mechEquilibrium,
  mechFma,
  mechForceK,
  mechRelative,
  mechApartTree,
  mechMeetTime,
  mechMeetPoint,
  mechMeetFlow,
  angleDot3,
  angleDot3Tree,
  angleSign,
  angleDotK,
  angleDotAlgebra,
  angleCos,
  angleCosTree,
  angleDegrees,
  angleGiven,
  anglePerpWhich,
  angleRelationFlow,
  anglePerpK,
  anglePerpKTree,
  angleLineDirection,
  angleSettingFlow,
  angleLines,
  angleLinesCos,
  angleLinesCosTree,
  angleLinePlane,
  angleLinePlaneTree,
  anglePlanes,
  angleLinePlaneKind,
] as unknown as Generator<unknown>[];
