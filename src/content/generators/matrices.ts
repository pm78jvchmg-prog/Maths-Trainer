/**
 * Matrices: arithmetic, a matrix acting on a vector, the determinant and the
 * inverse.
 *
 * Shared formatters and the engine constraints they exist for live in
 * `vectorFormat.ts`, alongside the vector generators these grew out of.
 */
import type { Block, Generator, Slide } from '../types';
import { bin, num } from '../expr';
import { options } from '../choiceVariant';
import {
  bankOf,
  columnTex,
  distinctOptions,
  matrixTex,
  MATRIX_TEMPLATE,
  nonZero,
  signedChoices,
  signedOffer,
  VECTOR_TEMPLATE,
} from './vectorFormat';

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

interface DeterminantStepsParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

/**
 * A determinant, one piece at a time.
 *
 * The same shape as the scalar product with a minus in the middle, and that is
 * exactly why it is worth asking separately: $ad - bc$ read carelessly becomes
 * $ad - b$ times $c$, or the diagonals taken the wrong way round. Both are
 * order mistakes rather than arithmetic ones, and neither is visible in an
 * answer box.
 */
const determinantSteps: Generator<DeterminantStepsParams> = {
  id: 'mat-determinant-steps',
  choices: ({ a, b, c, d }) =>
    signedChoices(a * d - b * c, [
      // The diagonals swapped.
      b * c - a * d,
      // The minus read as a plus.
      a * d + b * c,
      // The rows multiplied instead of the diagonals.
      a * b - c * d,
    ]),
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 7 : 5;
    const draw = () => nonZero(rng.int(-span, span), rng.int(1, span));
    return { a: draw(), b: draw(), c: draw(), d: draw() };
  },
  render: ({ a, b, c, d }): Slide => {
    const expr = bin('-', bin('*', num(a), num(d)), bin('*', num(b), num(c)));
    const leading = a * d;
    const other = b * c;
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'Find the determinant, one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
        { kind: 'display', tex: `\\det ${matrixTex(a, b, c, d)}` },
      ],
      expr,
      banks: {
        'r.l': signedOffer(leading, a + d, -leading, Math.abs(leading)),
        'r.r': signedOffer(other, b + c, -other, Math.abs(other)),
        // The subtraction. Taking it the other way round flips the sign, which
        // matters: the sign of a determinant is what says whether the
        // transformation flips the plane over.
        r: signedOffer(leading - other, other - leading, leading + other, leading * other),
      },
    };
  },
  solution: ({ a, b, c, d }) => {
    const leading = a * d;
    const other = b * c;
    return [
      {
        text: 'Multiply along each diagonal first, then subtract. Leading diagonal minus the other, in that order.',
      },
      { tex: `\\det ${matrixTex(a, b, c, d)} = \\left(${a}\\right)\\left(${d}\\right) - \\left(${b}\\right)\\left(${c}\\right)` },
      { tex: `= ${leading} - \\left(${other}\\right) = ${leading - other}` },
      {
        text: `Taking the diagonals the other way round gives $${other - leading}$, the same size with the opposite sign — and the sign is the part that says whether the transformation turns the plane over.`,
      },
    ];
  },
};

/* ---------- shapes added by roadmap batch A10 ---------- */

/** Any rectangular matrix, for the questions that are about shape. */
function gridTex(rows: number[][]): string {
  return `\\begin{pmatrix} ${rows.map((row) => row.join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
}

/** An order, written the way it is read aloud: rows first. */
function orderTex(rows: number, cols: number): string {
  return `${rows} \\times ${cols}`;
}

interface ShapeParams {
  rows: number;
  cols: number;
  entries: number[];
  row: number;
  col: number;
  asksOrder: boolean;
}

/**
 * The order of a matrix, and which entry sits where.
 *
 * Every other matrix question in this course is a 2x2, which quietly teaches
 * that matrices are 2x2. They are not, and the rules that decide whether an
 * operation is even allowed are rules about shape — so shape is asked about
 * directly, on matrices that are not square.
 */
const shape: Generator<ShapeParams> = {
  id: 'mat-shape',
  sample: (rng, difficulty) => {
    const rows = rng.int(2, 3);
    // Never square: on a square matrix "rows by columns" and "columns by rows"
    // read the same, and the order question would have two right answers.
    const cols = rng.pick((difficulty > 1 ? [2, 3, 4] : [2, 3]).filter((n) => n !== rows));
    const span = difficulty > 1 ? 12 : 9;
    return {
      rows,
      cols,
      entries: Array.from({ length: rows * cols }, () => rng.int(-span, span)),
      row: rng.int(1, rows),
      col: rng.int(1, cols),
      asksOrder: rng.pick([true, false]),
    };
  },
  render: ({ rows, cols, entries, row, col, asksOrder }): Slide => {
    const grid = Array.from({ length: rows }, (_, r) => entries.slice(r * cols, r * cols + cols));
    const tex = gridTex(grid);
    if (asksOrder) {
      const offered = distinctOptions([
        { id: 'order', label: orderTex(rows, cols), tex: true },
        // Columns quoted before rows, which is the one thing to get right.
        { id: 'flipped', label: orderTex(cols, rows), tex: true },
        { id: 'square', label: orderTex(rows, rows), tex: true },
        { id: 'count', label: orderTex(rows * cols, 1), tex: true },
      ]);
      const turn = (rows + cols) % offered.length;
      return {
        kind: 'choice',
        prompt: [
          { kind: 'prose', text: 'What is the order of this matrix?' },
          { kind: 'display', tex },
        ],
        options: [...offered.slice(turn), ...offered.slice(0, turn)],
        correctId: 'order',
      };
    }
    const at = (r: number, c: number) => grid[r - 1]?.[c - 1];
    const wrongWayRound = at(col, row);
    const offered: { id: string; label: string; tex: boolean }[] = distinctOptions(
      [
        { id: 'entry', label: `${at(row, col)}`, tex: true },
        // Row and column read the other way round, where the matrix has such
        // an entry at all.
        wrongWayRound === undefined
          ? undefined
          : { id: 'transposed', label: `${wrongWayRound}`, tex: true },
        { id: 'first', label: `${at(1, 1)}`, tex: true },
        { id: 'last', label: `${at(rows, cols)}`, tex: true },
      ].filter((option): option is { id: string; label: string; tex: boolean } => option !== undefined),
    );
    // Entries repeat, so the three distractors can all collide with the answer
    // and with each other, leaving a question with one option. Pad with
    // near-misses rather than resampling: a bank of neighbouring numbers is
    // what makes the position the thing being asked about.
    for (let step = 1; offered.length < 3 && step <= 6; step += 1) {
      for (const candidate of [at(row, col) + step, at(row, col) - step]) {
        if (offered.length >= 3) break;
        if (offered.some((option) => option.label === `${candidate}`)) continue;
        offered.push({ id: `near${candidate}`, label: `${candidate}`, tex: true });
      }
    }
    const turn = (row + col) % offered.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which number is the entry in row ${row}, column ${col}?`,
        },
        { kind: 'display', tex },
      ],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'entry',
    };
  },
  solution: ({ rows, cols, entries, row, col, asksOrder }) => {
    const grid = Array.from({ length: rows }, (_, r) => entries.slice(r * cols, r * cols + cols));
    if (asksOrder) {
      return [
        {
          text: 'An order is quoted rows first, then columns — the same way an entry is addressed.',
        },
        { tex: `${rows} \\text{ rows}, \\; ${cols} \\text{ columns} \\implies ${orderTex(rows, cols)}` },
        {
          text: `So this is a $${orderTex(rows, cols)}$ matrix. Quoting it the other way round is the standard slip, and it matters: two matrices can only be added when their orders match exactly.`,
        },
        {
          text: 'Shape decides what is allowed before any arithmetic happens. A matrix that is the wrong shape cannot be added at all, whatever its entries are.',
        },
      ];
    }
    return [
      {
        text: 'Entries are addressed row first, then column — count down to the row, then across to the column.',
      },
      { tex: `\\text{row } ${row}: \\; ${grid[row - 1].join(' \\quad ')}` },
      { tex: `\\text{column } ${col} \\text{ of that row} = ${grid[row - 1][col - 1]}` },
      {
        text: `So the entry is $${grid[row - 1][col - 1]}$. Reading across before down gives a different entry entirely unless the matrix happens to be symmetric.`,
      },
    ];
  },
};

interface MissingParams extends MatrixPairParams {
  addend: boolean;
}

/**
 * The matrix that completes an equation.
 *
 * `mat-add` asks what two matrices come to; this asks what is missing, which
 * is the same arithmetic run backwards and the form the operation actually
 * takes once matrices are being solved for rather than evaluated.
 */
const missing: Generator<MissingParams> = {
  id: 'mat-missing',
  choices: (p) => {
    const sign = p.addend ? 1 : -1;
    return options(
      { tex: matrixTex(p.e - sign * p.a, p.f - sign * p.b, p.g - sign * p.c, p.h - sign * p.d) },
      // The two sides subtracted the other way round, and added instead.
      { tex: matrixTex(sign * p.a - p.e, sign * p.b - p.f, sign * p.c - p.g, sign * p.d - p.h) },
      { tex: matrixTex(p.e + sign * p.a, p.f + sign * p.b, p.g + sign * p.c, p.h + sign * p.d) },
      { tex: matrixTex(p.e, p.f, p.g, p.h) },
    );
  },
  sample: (rng, difficulty) => ({
    ...sampleMatrixPair(rng, difficulty > 1 ? 10 : 7),
    addend: rng.pick([true, false]),
  }),
  render: (p) => {
    const sign = p.addend ? 1 : -1;
    const entries = [
      p.e - sign * p.a,
      p.f - sign * p.b,
      p.g - sign * p.c,
      p.h - sign * p.d,
    ];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work out the four entries of the missing matrix.' },
        {
          kind: 'display',
          tex: `${matrixTex(p.a, p.b, p.c, p.d)} ${p.addend ? '+' : '-'} \\mathbf{X} = ${matrixTex(p.e, p.f, p.g, p.h)}`,
        },
      ],
      template: MATRIX_TEMPLATE,
      bank: bankOf(
        entries.map(String),
        // The subtraction taken the other way round, which is the whole of
        // what goes wrong here.
        [sign * p.a - p.e, sign * p.b - p.f, sign * p.c - p.g, sign * p.d - p.h].map(String),
      ),
      answer: entries.map(String),
    };
  },
  solution: (p) => {
    const sign = p.addend ? 1 : -1;
    const entries = [p.e - sign * p.a, p.f - sign * p.b, p.g - sign * p.c, p.h - sign * p.d];
    return [
      {
        text: p.addend
          ? 'Take the known matrix across to the other side, which subtracts it from the answer.'
          : 'The unknown is being subtracted, so it is the first matrix take the answer — the equation rearranges the same way an ordinary one does.',
      },
      {
        tex: p.addend
          ? `\\mathbf{X} = ${matrixTex(p.e, p.f, p.g, p.h)} - ${matrixTex(p.a, p.b, p.c, p.d)}`
          : `\\mathbf{X} = ${matrixTex(p.a, p.b, p.c, p.d)} - ${matrixTex(p.e, p.f, p.g, p.h)}`,
      },
      { tex: `\\mathbf{X} = ${matrixTex(entries[0], entries[1], entries[2], entries[3])}` },
      {
        text: 'Every entry is independent, so this is four ordinary equations solved at once rather than anything new.',
      },
      {
        text: 'Subtracting the other way round gives every entry with its sign flipped, which is the answer to a different question.',
      },
    ];
  },
};

interface EntryParams extends MatrixCombineParams {
  row: number;
  col: number;
}

/** The entry of a combination or a product, by position. */
function entryPrompt(row: number, col: number, expression: string): Block[] {
  return [
    {
      kind: 'prose',
      text: `Find the entry in row ${row}, column ${col} of the result.`,
    },
    { kind: 'display', tex: expression },
  ];
}

/**
 * One entry of a scalar combination.
 *
 * Placing four tiles proves the method; naming one entry proves the addressing,
 * and the two go wrong in different places. A learner who can produce the whole
 * matrix and still cannot say which entry sits in row 2, column 1 will not be
 * able to read a worked solution.
 */
const sumEntry: Generator<EntryParams> = {
  id: 'mat-sum-entry',
  choices: (m) => {
    const value = (r: number, c: number) => {
      const first = [[m.a, m.b], [m.c, m.d]][r - 1][c - 1];
      const second = [[m.e, m.f], [m.g, m.h]][r - 1][c - 1];
      return m.p * first + m.q * second;
    };
    const correct = value(m.row, m.col);
    const first = [[m.a, m.b], [m.c, m.d]][m.row - 1][m.col - 1];
    const second = [[m.e, m.f], [m.g, m.h]][m.row - 1][m.col - 1];
    return signedChoices(correct, [
      // The scalars applied to the wrong matrices, one scalar forgotten, and
      // the entry read from the transposed position.
      m.q * first + m.p * second,
      first + m.q * second,
      value(m.col === 1 ? 1 : 2, m.row === 1 ? 1 : 2),
    ]);
  },
  sample: (rng, difficulty) => ({
    ...sampleMatrixPair(rng, difficulty > 1 ? 9 : 6),
    // Difficulty 1 is a plain sum or difference, so the addition lesson can
    // ask this before scalars have been met; difficulty 2 puts the scalars
    // back for the lesson that teaches them.
    p: difficulty > 1 ? nonZero(rng.int(-5, 5), 2) : 1,
    q: difficulty > 1 ? nonZero(rng.int(-5, 5), -3) : rng.pick([1, -1]),
    row: rng.int(1, 2),
    col: rng.int(1, 2),
  }),
  render: (m) => {
    const first = [[m.a, m.b], [m.c, m.d]][m.row - 1][m.col - 1];
    const second = [[m.e, m.f], [m.g, m.h]][m.row - 1][m.col - 1];
    return {
      kind: 'expression',
      prompt: entryPrompt(
        m.row,
        m.col,
        `${m.p === 1 ? '' : m.p}${matrixTex(m.a, m.b, m.c, m.d)} ${m.q < 0 ? '-' : '+'} ${Math.abs(m.q) === 1 ? '' : Math.abs(m.q)}${matrixTex(m.e, m.f, m.g, m.h)}`,
      ),
      lead: `\\text{row } ${m.row}, \\text{ column } ${m.col} =`,
      keypad: [],
      answer: `${m.p * first + m.q * second}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (m) => {
    const first = [[m.a, m.b], [m.c, m.d]][m.row - 1][m.col - 1];
    const second = [[m.e, m.f], [m.g, m.h]][m.row - 1][m.col - 1];
    return [
      {
        text: 'Adding and scaling happen entry by entry, so one entry of the answer needs only the matching entry of each matrix. There is no need to work out the other three.',
      },
      { tex: `\\text{row } ${m.row}, \\text{ column } ${m.col}: \\quad ${first} \\text{ and } ${second}` },
      {
        tex: `${m.p}\\left(${first}\\right) + \\left(${m.q}\\right)\\left(${second}\\right) = ${m.p * first + m.q * second}`,
      },
      {
        text: 'Row first, then column. Counting across before down lands on a different entry unless the matrix is symmetric.',
      },
      {
        text: 'This is what makes addition cheap and multiplication expensive: there, one entry needs a whole row and a whole column.',
      },
    ];
  },
};

interface ProductEntryParams extends MatrixPairParams {
  row: number;
  col: number;
}

/**
 * One entry of a product.
 *
 * The point of asking for a single entry is that the recipe is visible in it:
 * row of the first, column of the second, multiplied across and added. A
 * learner producing all four at once can get the right answer while thinking
 * the operation is entry by entry, and this question cannot be answered that
 * way at all.
 */
const productEntry: Generator<ProductEntryParams> = {
  id: 'mat-product-entry',
  choices: (p) => {
    const left = [[p.a, p.b], [p.c, p.d]];
    const right = [[p.e, p.f], [p.g, p.h]];
    const value = (r: number, c: number) => left[r - 1][0] * right[0][c - 1] + left[r - 1][1] * right[1][c - 1];
    return signedChoices(value(p.row, p.col), [
      // Entry by entry, which is the error this question exists to expose.
      left[p.row - 1][p.col - 1] * right[p.row - 1][p.col - 1],
      // A column of the first paired with a row of the second.
      left[0][p.row - 1] * right[p.col - 1][0] + left[1][p.row - 1] * right[p.col - 1][1],
      value(p.col, p.row),
    ]);
  },
  sample: (rng, difficulty) => ({
    ...sampleMatrixPair(rng, difficulty > 1 ? 8 : 5),
    row: rng.int(1, 2),
    col: rng.int(1, 2),
  }),
  render: (p) => {
    const left = [[p.a, p.b], [p.c, p.d]];
    const right = [[p.e, p.f], [p.g, p.h]];
    const value = left[p.row - 1][0] * right[0][p.col - 1] + left[p.row - 1][1] * right[1][p.col - 1];
    return {
      kind: 'expression',
      prompt: entryPrompt(
        p.row,
        p.col,
        `${matrixTex(p.a, p.b, p.c, p.d)} ${matrixTex(p.e, p.f, p.g, p.h)}`,
      ),
      lead: `\\text{row } ${p.row}, \\text{ column } ${p.col} =`,
      keypad: [],
      answer: `${value}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const left = [[p.a, p.b], [p.c, p.d]];
    const right = [[p.e, p.f], [p.g, p.h]];
    const value = left[p.row - 1][0] * right[0][p.col - 1] + left[p.row - 1][1] * right[1][p.col - 1];
    return [
      {
        text: `Row ${p.row} of the first matrix, column ${p.col} of the second: multiply them together term by term and add.`,
      },
      {
        tex: `\\text{row } ${p.row} = \\left(${left[p.row - 1][0]}, \\; ${left[p.row - 1][1]}\\right) \\qquad \\text{column } ${p.col} = \\left(${right[0][p.col - 1]}, \\; ${right[1][p.col - 1]}\\right)`,
      },
      {
        tex: `\\left(${left[p.row - 1][0]}\\right)\\left(${right[0][p.col - 1]}\\right) + \\left(${left[p.row - 1][1]}\\right)\\left(${right[1][p.col - 1]}\\right) = ${value}`,
      },
      {
        text: `Multiplying the two matching entries instead would give $${left[p.row - 1][p.col - 1] * right[p.row - 1][p.col - 1]}$. Matrix multiplication is not entry by entry, and that is the one thing most worth remembering about it.`,
      },
      {
        text: 'It is also why the shapes have to agree: a row and a column can only be paired off if they are the same length.',
      },
    ];
  },
};

interface OrderParams {
  m: number;
  n: number;
  q: number;
  mismatch: number;
}

/**
 * Whether a product exists at all, and what shape it comes out.
 *
 * Asked before any entries, because it is the question that comes first in
 * practice: an undefined product has no entries to get wrong, and the rule
 * that decides it — the inner dimensions must agree — is also the reason
 * matrix multiplication does not commute.
 */
const productOrder: Generator<OrderParams> = {
  id: 'mat-order',
  sample: (rng, difficulty) => ({
    m: rng.int(2, difficulty > 1 ? 5 : 4),
    n: rng.int(2, difficulty > 1 ? 5 : 4),
    q: rng.int(2, difficulty > 1 ? 5 : 4),
    // 0 keeps the inner dimensions equal; anything else breaks them by that
    // much, so the product is not defined.
    mismatch: rng.pick([0, 0, 1, 2]),
  }),
  render: ({ m, n, q, mismatch }): Slide => {
    const p = n + mismatch;
    const defined = mismatch === 0;
    const offered = distinctOptions([
      defined
        ? { id: 'order', label: orderTex(m, q), tex: true }
        : { id: 'order', label: '\\text{not defined}', tex: true },
      defined
        ? { id: 'undefined', label: '\\text{not defined}', tex: true }
        : { id: 'outer', label: orderTex(m, q), tex: true },
      { id: 'inner', label: orderTex(n, p), tex: true },
      { id: 'reversed', label: orderTex(q, m), tex: true },
    ]);
    const turn = (m + n + q) % offered.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `$\\mathbf{A}$ is $${orderTex(m, n)}$ and $\\mathbf{B}$ is $${orderTex(p, q)}$. What is the order of $\\mathbf{AB}$?`,
        },
      ],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'order',
    };
  },
  solution: ({ m, n, q, mismatch }) => {
    const p = n + mismatch;
    if (mismatch !== 0) {
      return [
        {
          text: 'Write the two orders side by side. The inner pair has to match, because each entry pairs a row of the first with a column of the second and they must be the same length.',
        },
        { tex: `\\left(${orderTex(m, n)}\\right)\\left(${orderTex(p, q)}\\right)` },
        {
          text: `The inner numbers are $${n}$ and $${p}$, which are not equal, so $\\mathbf{AB}$ does not exist. There is nothing to work out.`,
        },
        {
          text: 'The other order might still be fine. That is why matrix multiplication does not commute — sometimes only one way round is even defined.',
        },
      ];
    }
    return [
      {
        text: 'Write the two orders side by side. The inner pair has to match; the outer pair is the order of the answer.',
      },
      { tex: `\\left(${orderTex(m, n)}\\right)\\left(${orderTex(p, q)}\\right) \\implies ${orderTex(m, q)}` },
      {
        text: `The inner numbers are both $${n}$, so the product exists, and the outer numbers $${m}$ and $${q}$ give its order.`,
      },
      {
        text: 'Taking the outer pair in the wrong order is the usual slip. Rows first, always — the answer has as many rows as the first matrix and as many columns as the second.',
      },
    ];
  },
};

type DetProperty = 'scalar' | 'product' | 'inverse' | 'transpose';

interface DetPropertyParams {
  det: number;
  other: number;
  k: number;
  property: DetProperty;
}

/**
 * What happens to a determinant when the matrix is changed.
 *
 * Every other determinant question here hands over four entries and asks for
 * the arithmetic. These cannot be answered that way — no entries are given —
 * so they ask what the determinant *is*: a scale factor for area, which is why
 * scaling a 2x2 matrix squares it and why the determinant of a product
 * multiplies.
 */
const detProperty: Generator<DetPropertyParams> = {
  id: 'mat-det-property',
  sample: (rng, difficulty) => ({
    det: nonZero(rng.int(difficulty > 1 ? -9 : 2, 9), 3),
    other: nonZero(rng.int(difficulty > 1 ? -7 : 2, 7), -2),
    k: rng.pick(difficulty > 1 ? [-4, -3, -2, 2, 3, 4] : [2, 3, 4]),
    property: rng.pick(['scalar', 'product', 'inverse', 'transpose'] as const),
  }),
  render: ({ det, other, k, property }): Slide => {
    const asked =
      property === 'scalar'
        ? `\\det\\left(${k}\\mathbf{A}\\right)`
        : property === 'product'
          ? '\\det\\left(\\mathbf{AB}\\right)'
          : property === 'inverse'
            ? '\\det\\left(\\mathbf{A}^{-1}\\right)'
            : '\\det\\left(\\mathbf{A}^{T}\\right)';
    const given =
      property === 'product'
        ? `$\\mathbf{A}$ and $\\mathbf{B}$ are $2 \\times 2$ matrices with $\\det \\mathbf{A} = ${det}$ and $\\det \\mathbf{B} = ${other}$.`
        : `$\\mathbf{A}$ is a $2 \\times 2$ matrix with $\\det \\mathbf{A} = ${det}$.`;
    const correct =
      property === 'scalar'
        ? { tex: `${k * k * det}`, answer: `${k * k * det}` }
        : property === 'product'
          ? { tex: `${det * other}`, answer: `${det * other}` }
          : property === 'inverse'
            ? { tex: `\\frac{1}{${det}}`, answer: `1/(${det})` }
            : { tex: `${det}`, answer: `${det}` };
    const wrong =
      property === 'scalar'
        ? [
            { tex: `${k * det}`, answer: `${k * det}` },
            { tex: `${det}`, answer: `${det}` },
            { tex: `${k * k}`, answer: `${k * k}` },
          ]
        : property === 'product'
          ? [
              { tex: `${det + other}`, answer: `${det + other}` },
              { tex: `${det - other}`, answer: `${det - other}` },
              { tex: `${det}`, answer: `${det}` },
            ]
          : property === 'inverse'
            ? [
                { tex: `${det}`, answer: `${det}` },
                { tex: `${-det}`, answer: `${-det}` },
                { tex: `\\frac{1}{${det * det}}`, answer: `1/(${det * det})` },
              ]
            : [
                { tex: `${-det}`, answer: `${-det}` },
                { tex: `\\frac{1}{${det}}`, answer: `1/(${det})` },
                { tex: '0', answer: '0' },
              ];
    const offered = distinctOptions(
      options(correct, ...wrong).map((option, idx) => ({
        id: option.correct ? 'value' : `opt${idx}`,
        label: option.tex,
        tex: true,
      })),
    );
    const turn = (Math.abs(det) + Math.abs(k)) % offered.length;
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `${given} What is $${asked}$?` },
      ],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'value',
    };
  },
  solution: ({ det, other, k, property }) => {
    if (property === 'scalar') {
      return [
        {
          text: 'The determinant is the factor a matrix scales area by. Multiplying a $2 \\times 2$ matrix by a number stretches *both* directions, so the area factor is multiplied twice.',
        },
        { tex: `\\det\\left(k\\mathbf{A}\\right) = k^{2}\\det \\mathbf{A}` },
        { tex: `\\left(${k}\\right)^{2} \\times ${det} = ${k * k * det}` },
        {
          text: `Multiplying the determinant by $${k}$ once gives $${k * det}$, which is the answer for a $1 \\times 1$ matrix and nothing else. The power is the size of the matrix.`,
        },
      ];
    }
    if (property === 'product') {
      return [
        {
          text: 'Applying one transformation after another multiplies their area factors, so the determinant of a product is the product of the determinants.',
        },
        { tex: `\\det\\left(\\mathbf{AB}\\right) = \\det \\mathbf{A} \\times \\det \\mathbf{B}` },
        { tex: `${det} \\times \\left(${other}\\right) = ${det * other}` },
        {
          text: 'This holds whichever way round the product is taken, even though the product itself usually changes — which is a good check when one of them is zero: a singular factor makes the whole product singular.',
        },
      ];
    }
    if (property === 'inverse') {
      return [
        {
          text: 'The inverse undoes the transformation, so it has to undo the stretching too: its area factor is the reciprocal.',
        },
        { tex: `\\mathbf{A}\\mathbf{A}^{-1} = \\mathbf{I} \\implies \\det \\mathbf{A} \\times \\det\\left(\\mathbf{A}^{-1}\\right) = 1` },
        { tex: `\\det\\left(\\mathbf{A}^{-1}\\right) = \\frac{1}{${det}}` },
        {
          text: 'It also says why a singular matrix has no inverse: a determinant of zero would need a reciprocal, and there is not one.',
        },
      ];
    }
    return [
      {
        text: 'Transposing swaps the two diagonals of a $2 \\times 2$ matrix into positions that leave $ad - bc$ exactly as it was.',
      },
      { tex: `\\det ${matrixTex(1, 2, 3, 4)}^{T} = \\det \\begin{pmatrix} 1 & 3 \\\\ 2 & 4 \\end{pmatrix} = -2` },
      { tex: `\\det\\left(\\mathbf{A}^{T}\\right) = \\det \\mathbf{A} = ${det}` },
      {
        text: 'The leading diagonal is untouched and the other two entries swap places, so both products are the same as before.',
      },
    ];
  },
};

type SystemRoute = 'unique' | 'same' | 'none';

interface SystemMethodParams {
  route: SystemRoute;
  a: number;
  b: number;
  c: number;
  d: number;
  t: number;
  p: number;
}

/**
 * What to do with a matrix equation before doing anything to it.
 *
 * `mat-solve` assumes the inverse exists, which is true of every question it
 * asks. Deciding whether it exists — and what the answer means when it does
 * not — is a different skill, and one a typed answer cannot ask about, since
 * the honest answer is sometimes that there is no answer.
 */
const systemMethod: Generator<SystemMethodParams> = {
  id: 'mat-method',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 7 : 5;
    const route = rng.pick(['unique', 'same', 'none'] as const);
    const a = nonZero(rng.int(-span, span), 2);
    const b = nonZero(rng.int(-span, span), 3);
    const t = nonZero(rng.int(difficulty > 1 ? -4 : 2, 4), 2);
    const p = nonZero(rng.int(-span, span), 4);
    if (route === 'unique') {
      for (let tries = 0; tries < 40; tries += 1) {
        const c = nonZero(rng.int(-span, span), 1);
        const d = nonZero(rng.int(-span, span), 4);
        if (a * d - b * c !== 0) return { route, a, b, c, d, t, p };
      }
      return { route, a: 2, b: 3, c: 1, d: 4, t, p };
    }
    // A second row that is a multiple of the first: the determinant is zero
    // either way, and what separates the two cases is the right-hand side.
    return { route, a, b, c: t * a, d: t * b, t, p };
  },
  render: ({ route, a, b, c, d, t, p }): Slide => {
    const q = route === 'unique' ? p + t : route === 'same' ? t * p : t * p + 1;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Work down the questions to decide what this system has. Each answer chooses what gets asked next.',
        },
      ],
      subject: `${matrixTex(a, b, c, d)} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = ${columnTex(p, q)}`,
      steps: [
        {
          id: 'determinant',
          ask: 'Work out the determinant. Is it zero?',
          branches: [
            { label: 'No', outcome: 'The inverse exists: multiply both sides by it for the one solution.' },
            { label: 'Yes', to: 'rows' },
          ],
        },
        {
          id: 'rows',
          ask: 'Is the second equation a multiple of the first, right-hand side included?',
          branches: [
            { label: 'Yes', outcome: 'The two equations say the same thing: a whole line of solutions.' },
            { label: 'No', outcome: 'The two equations contradict each other: no solutions at all.' },
          ],
        },
      ],
      answer: route === 'unique' ? ['No'] : route === 'same' ? ['Yes', 'Yes'] : ['Yes', 'No'],
    };
  },
  solution: ({ route, a, b, c, d, t, p }) => {
    const det = a * d - b * c;
    const q = route === 'unique' ? p + t : route === 'same' ? t * p : t * p + 1;
    if (route === 'unique') {
      return [
        {
          text: 'The determinant decides everything here, so it is always the first thing to work out.',
        },
        { tex: `\\det = \\left(${a}\\right)\\left(${d}\\right) - \\left(${b}\\right)\\left(${c}\\right) = ${det}` },
        {
          text: `It is not zero, so the matrix has an inverse and there is exactly one solution: multiply both sides by $\\mathbf{A}^{-1}$.`,
        },
      ];
    }
    return [
      {
        text: 'The determinant decides everything here, so it is always the first thing to work out.',
      },
      { tex: `\\det = \\left(${a}\\right)\\left(${d}\\right) - \\left(${b}\\right)\\left(${c}\\right) = 0` },
      {
        text: `The second row is $${t}$ times the first, so there is no inverse and the two equations are about the same line. What is left is whether the right-hand side agrees.`,
      },
      {
        tex: `${t} \\times ${p} = ${t * p} \\qquad \\text{against} \\qquad ${q}`,
      },
      {
        text:
          route === 'same'
            ? 'It agrees, so the second equation adds nothing and every point on that line is a solution.'
            : 'It disagrees, so the two equations demand different things of the same combination and nothing satisfies both.',
      },
    ];
  },
};

export const matrixGenerators = [
  addMatrices,
  combineMatrices,
  multiplyMatrices,
  matrixTimesVector,
  determinant,
  singular,
  inverse,
  solveSystem,
  determinantSteps,
  shape,
  missing,
  sumEntry,
  productEntry,
  productOrder,
  detProperty,
  systemMethod,
] as unknown as Generator<unknown>[];
