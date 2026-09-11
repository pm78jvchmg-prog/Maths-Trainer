/**
 * Vectors and Matrices.
 *
 * Two engine constraints shape every question here, and both are worth knowing
 * before editing this file.
 *
 * 1. **The checker grades scalars.** `evaluateAt` treats anything that is not a
 *    number or a complex number as a domain hole, so a typed answer that
 *    evaluates to a vector or a matrix comes back `indeterminate` rather than
 *    correct. So nothing here asks for one. Answers are either a scalar — a
 *    magnitude, a dot product, a determinant — or a set of components placed as
 *    tiles.
 *
 * 2. **A tiles template is split into independent TeX fragments**, one per
 *    literal segment between the blanks, and each is rendered on its own. A
 *    `\begin{pmatrix}` that opened before a blank and closed after it would be
 *    two invalid fragments, and KaTeX runs with `throwOnError: false`, so the
 *    learner would see red error text rather than a matrix.
 *
 *    Hence the labelled-component templates — `\mathbf{i}: \; {0}` — rather
 *    than bracketed column vectors. The question itself still shows proper
 *    column-vector and matrix notation, because a prompt is one whole TeX
 *    string and can use any environment it likes.
 *
 * Every tile is a plain signed number, deliberately: one vocabulary, so a
 * learner cannot be marked wrong for placing a correctly-valued tile that was
 * formatted for the other slot.
 */
import type { Generator, KeypadKey, Slide } from '../types';
import { options } from '../choiceVariant';
import { ALGEBRA_KEYS } from './calculus';

/** Magnitudes are surds. */
const SURD_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'sqrt(' }];

function nonZero(value: number, fallback: number): number {
  return value === 0 ? fallback : value;
}

/** A tile bank keeping its answers with multiplicity. See quadratics.ts. */
function bankOf(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  return [...answer, ...[...new Set(distractors)].filter((t) => !needed.has(t))].sort();
}

/** Choice options with no two rendering the same label. */
function distinctOptions<T extends { label: string }>(options: T[]): T[] {
  const seen = new Set<string>();
  return options.filter((option) => (seen.has(option.label) ? false : (seen.add(option.label), true)));
}

/** A column vector. Safe inside a prompt, which is one whole TeX string. */
function columnTex(x: number, y: number): string {
  return `\\begin{pmatrix} ${x} \\\\ ${y} \\end{pmatrix}`;
}

/** A 2x2 matrix, likewise for prompts only. */
function matrixTex(a: number, b: number, c: number, d: number): string {
  return `\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix}`;
}

/** The component template used by every vector answer. */
const VECTOR_TEMPLATE = `\\mathbf{i}: \\; {0} \\qquad \\mathbf{j}: \\; {1}`;

/** The entry template used by every 2x2 matrix answer, read row by row. */
const MATRIX_TEMPLATE =
  `\\text{row } 1: \\; {0} \\quad {1} \\qquad \\text{row } 2: \\; {2} \\quad {3}`;

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

/* ---------- Level 2: matrices ---------- */

interface MatrixPairParams {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
  subtract: boolean;
}

function sampleMatrixPair(
  rng: Parameters<Generator<MatrixPairParams>['sample']>[0],
  span: number,
): MatrixPairParams {
  return {
    a: nonZero(rng.int(-span, span), 2),
    b: nonZero(rng.int(-span, span), 3),
    c: nonZero(rng.int(-span, span), -1),
    d: nonZero(rng.int(-span, span), 4),
    e: nonZero(rng.int(-span, span), 5),
    f: nonZero(rng.int(-span, span), -2),
    g: nonZero(rng.int(-span, span), 3),
    h: nonZero(rng.int(-span, span), 1),
    subtract: rng.pick([true, false]),
  };
}

/** Adding or subtracting two 2x2 matrices. */
const addMatrices: Generator<MatrixPairParams> = {
  id: 'mat-add',
  choices: (p) => {
    const sign = p.subtract ? -1 : 1;
    return options(
      { tex: matrixTex(p.a + sign * p.e, p.b + sign * p.f, p.c + sign * p.g, p.d + sign * p.h) },
      { tex: matrixTex(p.a - sign * p.e, p.b - sign * p.f, p.c - sign * p.g, p.d - sign * p.h) },
      { tex: matrixTex(p.a * p.e, p.b * p.f, p.c * p.g, p.d * p.h) },
      { tex: matrixTex(p.a + sign * p.e, p.b + sign * p.f, p.c - sign * p.g, p.d - sign * p.h) },
    );
  },
  sample: (rng, difficulty) => sampleMatrixPair(rng, difficulty > 1 ? 12 : 8),
  render: (p) => {
    const sign = p.subtract ? -1 : 1;
    const entries = [p.a + sign * p.e, p.b + sign * p.f, p.c + sign * p.g, p.d + sign * p.h];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work out the four entries of the result.' },
        {
          kind: 'display',
          tex: `${matrixTex(p.a, p.b, p.c, p.d)} ${p.subtract ? '-' : '+'} ${matrixTex(p.e, p.f, p.g, p.h)}`,
        },
      ],
      template: MATRIX_TEMPLATE,
      bank: bankOf(
        entries.map(String),
        // The other operation throughout, which is the only mistake this
        // question really admits.
        [p.a - sign * p.e, p.b - sign * p.f, p.c - sign * p.g, p.d - sign * p.h].map(String),
      ),
      answer: entries.map(String),
    };
  },
  solution: (p) => {
    const sign = p.subtract ? -1 : 1;
    const op = p.subtract ? '-' : '+';
    return [
      {
        text: 'Matrices add and subtract entry by entry. Each position in the answer depends only on the same position in the two originals.',
      },
      {
        tex: `${p.a} ${op} \\left(${p.e}\\right) = ${p.a + sign * p.e} \\qquad ${p.b} ${op} \\left(${p.f}\\right) = ${p.b + sign * p.f}`,
      },
      {
        tex: `${p.c} ${op} \\left(${p.g}\\right) = ${p.c + sign * p.g} \\qquad ${p.d} ${op} \\left(${p.h}\\right) = ${p.d + sign * p.h}`,
      },
      {
        tex: `${matrixTex(p.a, p.b, p.c, p.d)} ${op} ${matrixTex(p.e, p.f, p.g, p.h)} = ${matrixTex(p.a + sign * p.e, p.b + sign * p.f, p.c + sign * p.g, p.d + sign * p.h)}`,
      },
      {
        text: 'This only works when the two matrices are the same shape, since every entry needs a partner. Two matrices of different shapes cannot be added at all.',
      },
      {
        text: 'Multiplication, in the next lesson, is nothing like this. That it is *not* entry by entry is the thing most worth remembering about it.',
      },
    ];
  },
};

interface MatrixCombineParams extends MatrixPairParams {
  p: number;
  q: number;
}

/** A scalar combination of two matrices. */
const combineMatrices: Generator<MatrixCombineParams> = {
  id: 'mat-combine',
  choices: (m) =>
    options(
      { tex: matrixTex(m.p * m.a + m.q * m.e, m.p * m.b + m.q * m.f, m.p * m.c + m.q * m.g, m.p * m.d + m.q * m.h) },
      { tex: matrixTex(m.a + m.e, m.b + m.f, m.c + m.g, m.d + m.h) },
      { tex: matrixTex(m.p * m.a + m.e, m.p * m.b + m.f, m.p * m.c + m.g, m.p * m.d + m.h) },
      { tex: matrixTex(m.p * m.a + m.q * m.e, m.p * m.b + m.q * m.f, m.c, m.d) },
    ),
  sample: (rng, difficulty) => ({
    ...sampleMatrixPair(rng, difficulty > 1 ? 8 : 6),
    p: nonZero(rng.int(difficulty > 1 ? -5 : 2, 5), 2),
    q: nonZero(rng.int(difficulty > 1 ? -5 : -4, 5), -3),
  }),
  render: (m) => {
    const entries = [
      m.p * m.a + m.q * m.e,
      m.p * m.b + m.q * m.f,
      m.p * m.c + m.q * m.g,
      m.p * m.d + m.q * m.h,
    ];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work out the four entries of the result.' },
        {
          kind: 'display',
          tex: `${m.p === 1 ? '' : m.p}${matrixTex(m.a, m.b, m.c, m.d)} ${m.q < 0 ? '-' : '+'} ${Math.abs(m.q) === 1 ? '' : Math.abs(m.q)}${matrixTex(m.e, m.f, m.g, m.h)}`,
        },
      ],
      template: MATRIX_TEMPLATE,
      bank: bankOf(
        entries.map(String),
        // Scaling only the first matrix, and forgetting both scalars.
        [m.p * m.a + m.e, m.a + m.q * m.e, m.a + m.e, m.d + m.h].map(String),
      ),
      answer: entries.map(String),
    };
  },
  solution: (m) => [
    {
      text: 'A scalar multiplies every entry of a matrix — all four of them, not just the first row.',
    },
    { tex: `${m.p}${matrixTex(m.a, m.b, m.c, m.d)} = ${matrixTex(m.p * m.a, m.p * m.b, m.p * m.c, m.p * m.d)}` },
    { tex: `${m.q}${matrixTex(m.e, m.f, m.g, m.h)} = ${matrixTex(m.q * m.e, m.q * m.f, m.q * m.g, m.q * m.h)}` },
    {
      tex: `= ${matrixTex(m.p * m.a + m.q * m.e, m.p * m.b + m.q * m.f, m.p * m.c + m.q * m.g, m.p * m.d + m.q * m.h)}`,
    },
    {
      text: 'Scale both matrices fully before adding anything. Adding first and scaling afterwards gives a different answer unless the two scalars happen to be equal.',
    },
  ],
};

/** Multiplying two 2x2 matrices. */
const multiplyMatrices: Generator<MatrixPairParams> = {
  id: 'mat-multiply',
  choices: (p) =>
    options(
      { tex: matrixTex(p.a * p.e + p.b * p.g, p.a * p.f + p.b * p.h, p.c * p.e + p.d * p.g, p.c * p.f + p.d * p.h) },
      // Entry by entry, which is the error this lesson exists to remove.
      { tex: matrixTex(p.a * p.e, p.b * p.f, p.c * p.g, p.d * p.h) },
      // Columns of the first paired with rows of the second.
      { tex: matrixTex(p.a * p.e + p.c * p.f, p.b * p.e + p.d * p.f, p.a * p.g + p.c * p.h, p.b * p.g + p.d * p.h) },
      { tex: matrixTex(p.e * p.a + p.f * p.c, p.e * p.b + p.f * p.d, p.g * p.a + p.h * p.c, p.g * p.b + p.h * p.d) },
    ),
  sample: (rng, difficulty) => sampleMatrixPair(rng, difficulty > 1 ? 8 : 5),
  render: (p) => {
    const entries = [
      p.a * p.e + p.b * p.g,
      p.a * p.f + p.b * p.h,
      p.c * p.e + p.d * p.g,
      p.c * p.f + p.d * p.h,
    ];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work out the four entries of the product.' },
        {
          kind: 'display',
          tex: `${matrixTex(p.a, p.b, p.c, p.d)} ${matrixTex(p.e, p.f, p.g, p.h)}`,
        },
      ],
      template: MATRIX_TEMPLATE,
      bank: bankOf(
        entries.map(String),
        // Entry-by-entry multiplication, which is the error this question
        // exists to catch, plus one row-column pairing taken the wrong way.
        [p.a * p.e, p.b * p.f, p.c * p.g, p.d * p.h, p.a * p.e + p.b * p.f].map(String),
      ),
      answer: entries.map(String),
    };
  },
  solution: (p) => [
    {
      text: 'Matrix multiplication is not entry by entry. Each entry of the product pairs a *row* of the first matrix with a *column* of the second, multiplying across and adding.',
    },
    {
      text: 'The entry in row 1, column 1 uses row 1 of the first matrix and column 1 of the second.',
    },
    {
      tex: `\\left(${p.a}\\right)\\left(${p.e}\\right) + \\left(${p.b}\\right)\\left(${p.g}\\right) = ${p.a * p.e + p.b * p.g}`,
    },
    {
      tex: `\\left(${p.a}\\right)\\left(${p.f}\\right) + \\left(${p.b}\\right)\\left(${p.h}\\right) = ${p.a * p.f + p.b * p.h}`,
    },
    {
      tex: `\\left(${p.c}\\right)\\left(${p.e}\\right) + \\left(${p.d}\\right)\\left(${p.g}\\right) = ${p.c * p.e + p.d * p.g}`,
    },
    {
      tex: `\\left(${p.c}\\right)\\left(${p.f}\\right) + \\left(${p.d}\\right)\\left(${p.h}\\right) = ${p.c * p.f + p.d * p.h}`,
    },
    {
      text: 'Row of the first, column of the second, every time. Saying that out loud as you go is what stops the two being crossed over.',
    },
    {
      text: 'Order matters: the product the other way round is usually a different matrix. Matrix multiplication is not commutative, which is the biggest difference between it and ordinary arithmetic.',
    },
  ],
};

interface MatrixVectorParams {
  a: number;
  b: number;
  c: number;
  d: number;
  x: number;
  y: number;
}

/** A matrix acting on a vector. */
const matrixTimesVector: Generator<MatrixVectorParams> = {
  id: 'mat-vector',
  choices: ({ a, b, c, d, x, y }) =>
    options(
      { tex: columnTex(a * x + b * y, c * x + d * y) },
      { tex: columnTex(a * x + c * y, b * x + d * y) },
      { tex: columnTex(a * x, d * y) },
      { tex: columnTex(c * x + d * y, a * x + b * y) },
    ),
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 9 : 6;
    return {
      a: nonZero(rng.int(-span, span), 2),
      b: nonZero(rng.int(-span, span), 1),
      c: nonZero(rng.int(-span, span), -3),
      d: nonZero(rng.int(-span, span), 4),
      x: nonZero(rng.int(-span, span), 5),
      y: nonZero(rng.int(-span, span), -2),
    };
  },
  render: ({ a, b, c, d, x, y }) => {
    const top = a * x + b * y;
    const bottom = c * x + d * y;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work out the components of the result.' },
        { kind: 'display', tex: `${matrixTex(a, b, c, d)} ${columnTex(x, y)}` },
      ],
      template: VECTOR_TEMPLATE,
      bank: bankOf(
        [`${top}`, `${bottom}`],
        // Taking columns instead of rows, and multiplying entry by entry.
        [`${a * x + c * y}`, `${b * x + d * y}`, `${a * x}`, `${d * y}`],
      ),
      answer: [`${top}`, `${bottom}`],
    };
  },
  solution: ({ a, b, c, d, x, y }) => [
    {
      text: 'Each component of the answer comes from one *row* of the matrix, multiplied across the vector and added.',
    },
    { tex: `\\left(${a}\\right)\\left(${x}\\right) + \\left(${b}\\right)\\left(${y}\\right) = ${a * x + b * y}` },
    { tex: `\\left(${c}\\right)\\left(${x}\\right) + \\left(${d}\\right)\\left(${y}\\right) = ${c * x + d * y}` },
    { tex: `${matrixTex(a, b, c, d)} ${columnTex(x, y)} = ${columnTex(a * x + b * y, c * x + d * y)}` },
    {
      text: 'Using the columns instead of the rows is the standard error, and it gives a plausible-looking wrong answer. Rows of the matrix, every time.',
    },
    {
      text: 'A matrix acting on a vector is a *transformation* of the plane: it moves every point at once, and the matrix is a complete description of how.',
    },
  ],
};

/* ---------- Level 3: determinants and inverses ---------- */

interface SquareParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

/** The determinant of a 2x2 matrix. */
const determinant: Generator<SquareParams> = {
  id: 'mat-determinant',
  choices: ({ a, b, c, d }) =>
    options(
      { tex: `${a * d - b * c}`, answer: `${a * d - b * c}` },
      { tex: `${b * c - a * d}`, answer: `${b * c - a * d}` },
      { tex: `${a * d + b * c}`, answer: `${a * d + b * c}` },
      { tex: `${a * b - c * d}`, answer: `${a * b - c * d}` },
    ),
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 11 : 8;
    return {
      a: nonZero(rng.int(-span, span), 3),
      b: nonZero(rng.int(-span, span), 2),
      c: nonZero(rng.int(-span, span), -1),
      d: nonZero(rng.int(-span, span), 5),
    };
  },
  render: ({ a, b, c, d }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Find the determinant. The answer may be negative.' }],
    lead: `\\det ${matrixTex(a, b, c, d)} =`,
    keypad: [],
    answer: `${a * d - b * c}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, c, d }) => [
    {
      text: 'The determinant of a two-by-two matrix is the product of the leading diagonal minus the product of the other one.',
    },
    { tex: `\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc` },
    {
      tex: `\\left(${a}\\right)\\left(${d}\\right) - \\left(${b}\\right)\\left(${c}\\right) = ${a * d} - \\left(${b * c}\\right) = ${a * d - b * c}`,
    },
    {
      text: 'Work out each product with its sign before subtracting. Two negatives meeting in the subtraction is where this goes wrong most often.',
    },
    {
      text: 'The determinant is the factor by which the matrix scales area. A determinant of 2 doubles every area; a negative one reflects as well as scaling.',
    },
  ],
};

interface SingularParams {
  c: number;
  d: number;
  t: number;
}

/** Finding the value that makes a matrix singular. */
const singular: Generator<SingularParams> = {
  id: 'mat-singular-k',
  choices: ({ c, d, t }) => {
    const b = d * t;
    const k = c * t;
    return options(
      { tex: `${k}`, answer: `${k}` },
      { tex: `${-k}`, answer: `${-k}` },
      { tex: `${b * c}`, answer: `${b * c}` },
      { tex: `${k + d}`, answer: `${k + d}` },
    );
  },
  sample: (rng, difficulty) => ({
    c: nonZero(rng.int(difficulty > 1 ? -9 : 1, 9), 2),
    d: rng.int(1, difficulty > 1 ? 9 : 6),
    t: nonZero(rng.int(difficulty > 1 ? -5 : 1, 5), 3),
  }),
  render: ({ c, d, t }) => {
    // b is a multiple of d, so k = bc/d stays a whole number.
    const b = d * t;
    const k = c * t;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Find the value of $k$ for which this matrix has no inverse.`,
        },
      ],
      lead: `\\begin{pmatrix} k & ${b} \\\\ ${c} & ${d} \\end{pmatrix} \\implies k =`,
      keypad: [],
      answer: `${k}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ c, d, t }) => {
    const b = d * t;
    const k = c * t;
    return [
      {
        text: 'A matrix has no inverse exactly when its determinant is zero. Such a matrix is called **singular**.',
      },
      { tex: `\\det = k\\left(${d}\\right) - \\left(${b}\\right)\\left(${c}\\right) = 0` },
      { tex: `${d}k = ${b * c} \\implies k = \\frac{${b * c}}{${d}} = ${k}` },
      {
        text: `So $k = ${k}$ makes the determinant zero. Every other value of $k$ gives an invertible matrix.`,
      },
      {
        text: 'Geometrically a singular matrix collapses the plane onto a line, so area becomes zero — and a collapse cannot be undone, which is why no inverse exists.',
      },
    ];
  },
};

/**
 * The inverse of a 2x2 matrix, asked as the adjugate.
 *
 * The determinant is stated in the prompt and only the four entries are asked
 * for. Putting the determinant in a blank would need `\frac{1}{{0}}`, whose
 * literal fragments are `\frac{1}{` and `}` — neither valid on its own.
 */
const inverse: Generator<SquareParams> = {
  id: 'mat-inverse',
  choices: ({ a, b, c, d }) =>
    options(
      { tex: matrixTex(d, -b, -c, a) },
      // All four swapped, and the diagonal negated instead: the two ways the
      // recipe is misremembered.
      { tex: matrixTex(a, -b, -c, d) },
      { tex: matrixTex(-d, b, c, -a) },
      { tex: matrixTex(d, b, c, a) },
    ),
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 9 : 6;
    for (let tries = 0; tries < 40; tries += 1) {
      const a = nonZero(rng.int(-span, span), 3);
      const b = nonZero(rng.int(-span, span), 1);
      const c = nonZero(rng.int(-span, span), 2);
      const d = nonZero(rng.int(-span, span), 4);
      if (a * d - b * c !== 0) return { a, b, c, d };
    }
    return { a: 3, b: 1, c: 2, d: 4 };
  },
  render: ({ a, b, c, d }) => {
    const det = a * d - b * c;
    const entries = [`${d}`, `${-b}`, `${-c}`, `${a}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `This matrix has determinant $${det}$, so its inverse is $\\frac{1}{${det}}$ times another matrix. Give the four entries of that matrix.`,
        },
        { kind: 'display', tex: matrixTex(a, b, c, d) },
      ],
      template: MATRIX_TEMPLATE,
      bank: bankOf(entries, [`${a}`, `${b}`, `${c}`, `${d}`, `${-a}`, `${-d}`]),
      answer: entries,
    };
  },
  solution: ({ a, b, c, d }) => {
    const det = a * d - b * c;
    return [
      {
        text: 'The inverse of a two-by-two matrix follows a fixed recipe: swap the two entries on the leading diagonal, change the sign of the other two, and divide everything by the determinant.',
      },
      {
        tex: `\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}^{-1} = \\frac{1}{ad - bc}\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}`,
      },
      { tex: `\\frac{1}{${det}}${matrixTex(d, -b, -c, a)}` },
      {
        text: `So the $${a}$ and the $${d}$ trade places, while the $${b}$ and the $${c}$ keep their places and change sign. Swapping all four, or negating the diagonal instead, are the two ways this is misremembered.`,
      },
      {
        text: `Check by multiplying: the product of a matrix and its inverse is the identity, $\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}$. That check is worth doing the first few times.`,
      },
    ];
  },
};

interface SystemParams {
  a: number;
  b: number;
  c: number;
  d: number;
  x: number;
  y: number;
}

/** Solving a pair of linear equations, which is a matrix equation. */
const solveSystem: Generator<SystemParams> = {
  id: 'mat-solve',
  choices: ({ a, b, c, d, x, y }) => {
    const p = a * x + b * y;
    const q = c * x + d * y;
    return options(
      { tex: `x = ${x} \\quad y = ${y}` },
      { tex: `x = ${y} \\quad y = ${x}` },
      { tex: `x = ${-x} \\quad y = ${-y}` },
      { tex: `x = ${p} \\quad y = ${q}` },
    );
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 7 : 5;
    for (let tries = 0; tries < 40; tries += 1) {
      const a = nonZero(rng.int(-span, span), 2);
      const b = nonZero(rng.int(-span, span), 3);
      const c = nonZero(rng.int(-span, span), 1);
      const d = nonZero(rng.int(-span, span), -2);
      if (a * d - b * c !== 0) {
        return {
          a,
          b,
          c,
          d,
          // The solution is chosen first, so it is always a whole number.
          x: nonZero(rng.int(-8, 8), 3),
          y: nonZero(rng.int(-8, 8), -4),
        };
      }
    }
    return { a: 2, b: 3, c: 1, d: -2, x: 3, y: -4 };
  },
  render: ({ a, b, c, d, x, y }) => {
    const p = a * x + b * y;
    const q = c * x + d * y;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Solve the pair of equations.' },
        {
          kind: 'display',
          tex: `${matrixTex(a, b, c, d)} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = ${columnTex(p, q)}`,
        },
      ],
      template: `x = {0} \\qquad y = {1}`,
      bank: bankOf([`${x}`, `${y}`], [`${-x}`, `${-y}`, `${p}`, `${q}`]),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: ({ a, b, c, d, x, y }) => {
    const p = a * x + b * y;
    const q = c * x + d * y;
    const det = a * d - b * c;
    return [
      {
        text: 'A pair of simultaneous equations is a single matrix equation, and multiplying both sides by the inverse solves it in one step.',
      },
      { tex: `\\mathbf{M}\\mathbf{v} = \\mathbf{u} \\implies \\mathbf{v} = \\mathbf{M}^{-1}\\mathbf{u}` },
      { tex: `\\mathbf{M}^{-1} = \\frac{1}{${det}}${matrixTex(d, -b, -c, a)}` },
      {
        tex: `\\mathbf{v} = \\frac{1}{${det}}${matrixTex(d, -b, -c, a)} ${columnTex(p, q)} = ${columnTex(x, y)}`,
      },
      {
        text: `So $x = ${x}$ and $y = ${y}$. Substituting back into the original equations is the check, and it catches an arithmetic slip immediately.`,
      },
      {
        text: 'The method needs the determinant to be non-zero. A singular matrix means the two equations either describe the same line or two parallel lines, so there is no single solution to find.',
      },
    ];
  },
};

export const vectorGenerators = [
  addVectors,
  combineVectors,
  magnitude,
  dotProduct,
  perpendicular,
  parallel,
  addMatrices,
  combineMatrices,
  multiplyMatrices,
  matrixTimesVector,
  determinant,
  singular,
  inverse,
  solveSystem,
] as unknown as Generator<unknown>[];
