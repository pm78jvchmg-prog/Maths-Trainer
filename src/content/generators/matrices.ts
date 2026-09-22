/**
 * Matrices: arithmetic, a matrix acting on a vector, the determinant and the
 * inverse.
 *
 * Shared formatters and the engine constraints they exist for live in
 * `vectorFormat.ts`, alongside the vector generators these grew out of.
 */
import type { Generator, Slide } from '../types';
import { bin, num } from '../expr';
import { options } from '../choiceVariant';
import {
  bankOf,
  columnTex,
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
] as unknown as Generator<unknown>[];
