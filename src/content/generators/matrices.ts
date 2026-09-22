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
import { spanFor, transformGridSvg, type Mirror } from './transformFigure';

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

/* ---------- Level 5: matrices as transformations (roadmap batch B9) ---------- */

type Matrix = readonly [number, number, number, number];

const texOf = (m: Matrix) => matrixTex(m[0], m[1], m[2], m[3]);

/** Where the point (x, y) goes under the matrix. */
function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[1] * y, m[2] * x + m[3] * y];
}

const detOf = (m: Matrix) => m[0] * m[3] - m[1] * m[2];

/** A coordinate pair, for prompts and choice labels only — never a tile. */
function pairTex(x: number, y: number): string {
  return `\\left(${x}, \\; ${y}\\right)`;
}

/**
 * Two components placed as tiles. Plain brackets, not `\left(`: each literal
 * piece of a tiles template is rendered on its own (see `vectorFormat.ts`).
 */
const COORD_TEMPLATE = `x: \\; {0} \\qquad y: \\; {1}`;
const IMAGE_TEMPLATE = `P' = ({0}, \\; {1})`;

/**
 * An invertible 2x2 matrix whose transpose is a different matrix.
 *
 * Both conditions serve the distractors. A singular matrix squashes the unit
 * square flat, so there is no shape to draw; and when b equals c, reading the
 * matrix by rows gives the same answer as reading it by columns, which is the
 * one confusion these questions exist to separate.
 */
function sampleTransform(
  rng: Parameters<Generator<unknown>['sample']>[0],
  span: number,
  allowZero = false,
): Matrix {
  const draw = () => (allowZero ? rng.int(-span, span) : nonZero(rng.int(-span, span), rng.int(1, span)));
  for (let tries = 0; tries < 60; tries += 1) {
    const m: Matrix = [draw(), draw(), draw(), draw()];
    if (detOf(m) !== 0 && m[1] !== m[2]) return m;
  }
  return [2, 1, -1, 3];
}

type Standard = 'rot90' | 'rot180' | 'rot270' | 'refl-x' | 'refl-y' | 'refl-yx' | 'refl-ynx';

const STANDARD_KEYS: readonly Standard[] = ['rot90', 'rot180', 'rot270', 'refl-x', 'refl-y', 'refl-yx', 'refl-ynx'];

/**
 * The seven transformations with a matrix of zeros and ones.
 *
 * `phrases` are the ways a question may say it, in prose — a quarter turn
 * clockwise and a rotation of 270 degrees anticlockwise are the same matrix,
 * and recognising that is part of the skill. `name` is the plain-text form a
 * choice option shows.
 */
const STANDARD: Record<Standard, { matrix: Matrix; phrases: string[]; name: string; mirror?: Mirror }> = {
  rot90: {
    matrix: [0, -1, 1, 0],
    phrases: [
      'a rotation of $90^\\circ$ anticlockwise about the origin',
      'a rotation of $270^\\circ$ clockwise about the origin',
      'a quarter turn anticlockwise about the origin',
    ],
    name: 'Rotation of 90° anticlockwise about O',
  },
  rot180: {
    matrix: [-1, 0, 0, -1],
    phrases: ['a rotation of $180^\\circ$ about the origin', 'a half turn about the origin'],
    name: 'Rotation of 180° about O',
  },
  rot270: {
    matrix: [0, 1, -1, 0],
    phrases: [
      'a rotation of $90^\\circ$ clockwise about the origin',
      'a rotation of $270^\\circ$ anticlockwise about the origin',
      'a quarter turn clockwise about the origin',
    ],
    name: 'Rotation of 90° clockwise about O',
  },
  'refl-x': {
    matrix: [1, 0, 0, -1],
    phrases: ['a reflection in the $x$-axis', 'a reflection in the line $y = 0$'],
    name: 'Reflection in the x-axis',
    mirror: 'x-axis',
  },
  'refl-y': {
    matrix: [-1, 0, 0, 1],
    phrases: ['a reflection in the $y$-axis', 'a reflection in the line $x = 0$'],
    name: 'Reflection in the y-axis',
    mirror: 'y-axis',
  },
  'refl-yx': {
    matrix: [0, 1, 1, 0],
    phrases: ['a reflection in the line $y = x$'],
    name: 'Reflection in the line y = x',
    mirror: 'y=x',
  },
  'refl-ynx': {
    matrix: [0, -1, -1, 0],
    phrases: ['a reflection in the line $y = -x$'],
    name: 'Reflection in the line y = −x',
    mirror: 'y=-x',
  },
};

/** The transformations each one is most often mistaken for, closest first. */
const CONFUSED_WITH: Record<Standard, Standard[]> = {
  rot90: ['rot270', 'refl-yx', 'refl-ynx'],
  rot270: ['rot90', 'refl-ynx', 'refl-yx'],
  rot180: ['refl-x', 'refl-y', 'rot90'],
  'refl-x': ['refl-y', 'rot180', 'refl-yx'],
  'refl-y': ['refl-x', 'rot180', 'refl-ynx'],
  'refl-yx': ['refl-ynx', 'rot90', 'rot270'],
  'refl-ynx': ['refl-yx', 'rot270', 'rot90'],
};

/** Any transformation in this level with a name: the seven above, or a scaling. */
type Transform =
  | { kind: 'standard'; key: Standard }
  | { kind: 'enlarge'; k: number }
  | { kind: 'stretch-x'; k: number }
  | { kind: 'stretch-y'; k: number }
  | { kind: 'stretch-xy'; k: number; q: number };

function matrixOf(t: Transform): Matrix {
  switch (t.kind) {
    case 'standard':
      return STANDARD[t.key].matrix;
    case 'enlarge':
      return [t.k, 0, 0, t.k];
    case 'stretch-x':
      return [t.k, 0, 0, 1];
    case 'stretch-y':
      return [1, 0, 0, t.k];
    case 'stretch-xy':
      return [t.k, 0, 0, t.q];
  }
}

/** How many ways `phraseOf` can say this transformation. */
function phraseCount(t: Transform): number {
  return t.kind === 'standard' ? STANDARD[t.key].phrases.length : 2;
}

/** The transformation in prose, with any maths between dollar signs. */
function phraseOf(t: Transform, variant: number): string {
  const v = variant % phraseCount(t);
  switch (t.kind) {
    case 'standard':
      return STANDARD[t.key].phrases[v];
    case 'enlarge':
      return v === 0
        ? `an enlargement of scale factor $${t.k}$ about the origin`
        : `an enlargement, centre $O$, scale factor $${t.k}$`;
    case 'stretch-x':
      return v === 0
        ? `a stretch parallel to the $x$-axis, scale factor $${t.k}$`
        : `a stretch of scale factor $${t.k}$ in the $x$ direction, with the $y$-axis fixed`;
    case 'stretch-y':
      return v === 0
        ? `a stretch parallel to the $y$-axis, scale factor $${t.k}$`
        : `a stretch of scale factor $${t.k}$ in the $y$ direction, with the $x$-axis fixed`;
    case 'stretch-xy':
      return v === 0
        ? `a stretch of scale factor $${t.k}$ parallel to the $x$-axis together with one of scale factor $${t.q}$ parallel to the $y$-axis`
        : `the stretch that multiplies every $x$-coordinate by $${t.k}$ and every $y$-coordinate by $${t.q}$`;
  }
}

/** A signed number as plain text, with a real minus sign rather than a hyphen. */
const plain = (n: number) => (n < 0 ? `−${-n}` : `${n}`);

/** The transformation as a choice option reads it: plain text, no maths. */
function nameOf(t: Transform): string {
  switch (t.kind) {
    case 'standard':
      return STANDARD[t.key].name;
    case 'enlarge':
      return `Enlargement, scale factor ${plain(t.k)}, centre O`;
    case 'stretch-x':
      return `Stretch parallel to the x-axis, scale factor ${plain(t.k)}`;
    case 'stretch-y':
      return `Stretch parallel to the y-axis, scale factor ${plain(t.k)}`;
    case 'stretch-xy':
      return `Stretches of scale factor ${plain(t.k)} parallel to the x-axis and ${plain(t.q)} parallel to the y-axis`;
  }
}

/** The images of i and j, as a sentence for a worked solution. */
function columnsLine(m: Matrix): string {
  return `\\mathbf{i} \\to ${columnTex(m[0], m[2])} \\qquad \\mathbf{j} \\to ${columnTex(m[1], m[3])}`;
}

/* ----- where i and j land ----- */

interface ColumnImageParams {
  m: Matrix;
  basis: 'i' | 'j';
}

/**
 * Where i or j lands, read straight off the matrix.
 *
 * The idea the whole level stands on: the columns of a matrix are the images
 * of i and j. Reading a row instead is the slip, and it gives an answer that
 * looks every bit as reasonable.
 */
const columnImage: Generator<ColumnImageParams> = {
  id: 'mat-column-image',
  choices: ({ m, basis }) => {
    const [a, b, c, d] = m;
    return basis === 'i'
      ? options(
          { tex: columnTex(a, c) },
          { tex: columnTex(a, b) },
          { tex: columnTex(b, d) },
          { tex: columnTex(c, a) },
        )
      : options(
          { tex: columnTex(b, d) },
          { tex: columnTex(c, d) },
          { tex: columnTex(a, c) },
          { tex: columnTex(d, b) },
        );
  },
  sample: (rng, difficulty) => ({
    m: sampleTransform(rng, difficulty > 1 ? 9 : 5),
    basis: rng.pick(['i', 'j'] as const),
  }),
  render: ({ m, basis }) => {
    const [a, b, c, d] = m;
    const answer = basis === 'i' ? [a, c] : [b, d];
    // Reading along a row, and the other column.
    const slips = basis === 'i' ? [a, b, b, d] : [c, d, a, c];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Where does $\\mathbf{${basis}}$ land under this matrix? Give the components of its image.`,
        },
        { kind: 'display', tex: `\\mathbf{M} = ${texOf(m)}` },
      ],
      template: COORD_TEMPLATE,
      bank: bankOf(answer.map(String), slips.map(String)),
      answer: answer.map(String),
    };
  },
  solution: ({ m, basis }) => {
    const [a, b, c, d] = m;
    const unit = basis === 'i' ? columnTex(1, 0) : columnTex(0, 1);
    const image = basis === 'i' ? columnTex(a, c) : columnTex(b, d);
    const column = basis === 'i' ? 'first' : 'second';
    return [
      {
        text: `The columns of a matrix are where $\\mathbf{i}$ and $\\mathbf{j}$ land: the ${column} column is the image of $\\mathbf{${basis}}$.`,
      },
      { tex: `${texOf(m)} ${unit} = ${image}` },
      {
        text: `Multiplying out shows why: the $1$ in $\\mathbf{${basis}}$ picks out the ${column} column, and the $0$ wipes out the other.`,
      },
      {
        text: `Reading along the ${basis === 'i' ? 'top' : 'bottom'} row instead gives $${basis === 'i' ? columnTex(a, b) : columnTex(c, d)}$, which is the usual slip — rows are for multiplying, columns are for reading off images.`,
      },
    ];
  },
};

interface FromImagesParams {
  m: Matrix;
  asPoints: boolean;
}

/** The matrix, built from where i and j land. */
const fromImages: Generator<FromImagesParams> = {
  id: 'mat-from-images',
  choices: ({ m }) => {
    const [a, b, c, d] = m;
    return options(
      { tex: texOf(m) },
      // The images written as rows, the columns in the wrong order, and the
      // rows in the wrong order.
      { tex: matrixTex(a, c, b, d) },
      { tex: matrixTex(b, a, d, c) },
      { tex: matrixTex(c, d, a, b) },
    );
  },
  sample: (rng, difficulty) => ({
    m: sampleTransform(rng, difficulty > 1 ? 9 : 6),
    asPoints: rng.pick([true, false]),
  }),
  render: ({ m, asPoints }) => {
    const [a, b, c, d] = m;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: asPoints
            ? `A transformation maps the point $(1, 0)$ to $(${a}, ${c})$ and the point $(0, 1)$ to $(${b}, ${d})$. Find its matrix.`
            : `A transformation sends $\\mathbf{i}$ to $${columnTex(a, c)}$ and $\\mathbf{j}$ to $${columnTex(b, d)}$. Find its matrix.`,
        },
      ],
      template: MATRIX_TEMPLATE,
      bank: bankOf([a, b, c, d].map(String), [-a, -d, -b, -c].map(String)),
      answer: [a, b, c, d].map(String),
    };
  },
  solution: ({ m }) => {
    const [a, b, c, d] = m;
    return [
      {
        text: 'The image of $\\mathbf{i}$ is the first column and the image of $\\mathbf{j}$ is the second. Write them in as columns, side by side.',
      },
      { tex: columnsLine(m) },
      { tex: `\\mathbf{M} = ${texOf(m)}` },
      {
        text: `Writing the images in as rows gives $${matrixTex(a, c, b, d)}$, the transpose — a different transformation. Check by multiplying $\\mathbf{M}$ by $${columnTex(1, 0)}$: it should give back $${columnTex(a, c)}$.`,
      },
    ];
  },
};

interface ReadColumnParams {
  m: Matrix;
  row: number;
  col: number;
}

/**
 * An entry of the matrix, read off a picture of what it does.
 *
 * The reverse of drawing the image: the arrows show where i and j land, so the
 * matrix is sitting in the figure as two tips' coordinates. The marker slides
 * across the grid (or up it, for the second row) until it meets the right tip.
 */
const readColumn: Generator<ReadColumnParams> = {
  id: 'mat-read-column',
  sample: (rng, difficulty) => ({
    m: sampleTransform(rng, difficulty > 1 ? 4 : 3, true),
    row: rng.int(1, 2),
    col: rng.int(1, 2),
  }),
  render: ({ m, row, col }): Slide => {
    const [a, b, c, d] = m;
    const span = spanFor(a, b, c, d, a + b, c + d);
    const answer = [[a, b], [c, d]][row - 1][col - 1];
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The shaded shape is the image of the unit square under $\\mathbf{M}$, and the arrows show where $\\mathbf{i}$ and $\\mathbf{j}$ land. Slide to the entry in row ${row}, column ${col} of $\\mathbf{M}$.`,
        },
      ],
      min: -(span - 1),
      max: span - 1,
      step: 1,
      answer,
      readout: `\\text{row } ${row}, \\text{ column } ${col} = {v}`,
      figure: {
        svg: transformGridSvg({
          span,
          image: m,
          square: true,
          arrows: [
            { x: a, y: c, label: 'i', accent: true },
            { x: b, y: d, label: 'j' },
          ],
          label: 'The unit square and its image, with the images of i and j drawn as arrows',
        }),
        xMin: -span,
        xMax: span,
        axis: row === 1 ? 'x' : 'y',
      },
    };
  },
  solution: ({ m, row, col }) => {
    const [a, b, c, d] = m;
    const basis = col === 1 ? 'i' : 'j';
    const tip = col === 1 ? [a, c] : [b, d];
    return [
      {
        text: `Column ${col} of the matrix is where $\\mathbf{${basis}}$ lands, so read the tip of the $\\mathbf{${basis}}$ arrow.`,
      },
      { tex: `\\mathbf{${basis}} \\to ${pairTex(tip[0], tip[1])}` },
      {
        text: `Row ${row} is its ${row === 1 ? '$x$' : '$y$'}-coordinate: $${tip[row - 1]}$. So the whole matrix is $${texOf(m)}$.`,
      },
      {
        text: 'The first row holds the across-coordinates and the second the up-coordinates, which is why the marker slides across for row 1 and up for row 2.',
      },
    ];
  },
};

/* ----- the unit square ----- */

interface SquareCornerParams {
  m: Matrix;
  side: number;
}

/**
 * The corner of the square opposite the origin, after the transformation.
 *
 * It is the one corner that is not a column: it lands at the *sum* of the two
 * columns, which is the parallelogram rule, and the reason the image of a
 * square is always a parallelogram.
 */
const squareCorner: Generator<SquareCornerParams> = {
  id: 'mat-square-corner',
  choices: ({ m, side }) => {
    const [a, b, c, d] = m;
    return options(
      { tex: pairTex(side * (a + b), side * (c + d)) },
      // The rows added instead of the columns, the leading diagonal alone, and
      // the diagonals crossed.
      { tex: pairTex(side * (a + c), side * (b + d)) },
      { tex: pairTex(side * a, side * d) },
      { tex: pairTex(side * (a + d), side * (b + c)) },
    );
  },
  sample: (rng, difficulty) => ({
    m: sampleTransform(rng, difficulty > 1 ? 7 : 5),
    side: difficulty > 1 ? rng.pick([1, 2, 3]) : 1,
  }),
  render: ({ m, side }) => {
    const [a, b, c, d] = m;
    const answer = [side * (a + b), side * (c + d)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The square with corners $(0, 0)$, $(${side}, 0)$, $(${side}, ${side})$ and $(0, ${side})$ is transformed by this matrix. Where does the corner $(${side}, ${side})$ go?`,
        },
        { kind: 'display', tex: `\\mathbf{M} = ${texOf(m)}` },
      ],
      template: `(${side}, ${side}) \\to ({0}, \\; {1})`,
      bank: bankOf(answer.map(String), [side * (a + c), side * (b + d), side * a, side * d].map(String)),
      answer: answer.map(String),
    };
  },
  solution: ({ m, side }) => {
    const [a, b, c, d] = m;
    return [
      {
        text: `The corner $(${side}, ${side})$ is $${side === 1 ? '' : side}\\mathbf{i} + ${side === 1 ? '' : side}\\mathbf{j}$, so it lands on ${side === 1 ? 'the sum of the two columns' : `$${side}$ times the sum of the two columns`}.`,
      },
      { tex: `${texOf(m)} ${columnTex(side, side)} = ${columnTex(side * (a + b), side * (c + d))}` },
      {
        text: `So it goes to $${pairTex(side * (a + b), side * (c + d))}$. The other two corners go to the columns themselves${side === 1 ? '' : `, scaled by $${side}$`}, and the origin stays put.`,
      },
      {
        text: 'Adding along the rows instead gives a point that is not on the image at all. Every corner of the image is built from columns: that is what makes it a parallelogram.',
      },
    ];
  },
};

interface SquareWhichParams {
  m: Matrix;
}

/** Which matrix drew this picture. */
const squareWhich: Generator<SquareWhichParams> = {
  id: 'mat-square-which',
  sample: (rng, difficulty) => ({ m: sampleTransform(rng, difficulty > 1 ? 4 : 3, true) }),
  render: ({ m }): Slide => {
    const [a, b, c, d] = m;
    const span = spanFor(a, b, c, d, a + b, c + d);
    const offered = distinctOptions([
      { id: 'matrix', label: texOf(m), tex: true },
      // The images written as rows, the arrows mixed up, and one sign lost.
      { id: 'transpose', label: matrixTex(a, c, b, d), tex: true },
      { id: 'swapped', label: matrixTex(b, a, d, c), tex: true },
      { id: 'negated', label: matrixTex(-a, b, -c, d), tex: true },
    ]);
    const turn = (Math.abs(a) + Math.abs(b) + Math.abs(c) + Math.abs(d)) % offered.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: 'The shaded shape is the image of the dashed unit square, and the arrows show where $\\mathbf{i}$ and $\\mathbf{j}$ land. Which matrix is it?',
        },
        {
          kind: 'diagram',
          svg: transformGridSvg({
            span,
            image: m,
            square: true,
            arrows: [
              { x: a, y: c, label: 'i', accent: true },
              { x: b, y: d, label: 'j' },
            ],
            maxWidth: 260,
            label: 'The unit square and its image, with the images of i and j drawn as arrows',
          }),
        },
      ],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'matrix',
    };
  },
  solution: ({ m }) => {
    const [a, b, c, d] = m;
    return [
      { text: 'Read the two arrow tips. Each one is a column of the matrix.' },
      { tex: columnsLine(m) },
      { tex: `\\mathbf{M} = ${texOf(m)}` },
      {
        text: `The fourth corner, at $${pairTex(a + b, c + d)}$, is the two columns added — a good check that the picture and the matrix agree. Writing the tips in as rows gives the transpose, which draws a different shape.`,
      },
    ];
  },
};

/* ----- rotations and reflections ----- */

interface StandardParams {
  key: Standard;
  phrase: number;
  others: Standard[];
}

/** The matrix for a named rotation or reflection. */
const standardMatrix: Generator<StandardParams> = {
  id: 'mat-standard',
  sample: (rng) => {
    const key = rng.pick(STANDARD_KEYS);
    return {
      key,
      phrase: rng.int(0, STANDARD[key].phrases.length - 1),
      others: rng.sample(
        STANDARD_KEYS.filter((other) => other !== key),
        3,
      ),
    };
  },
  render: ({ key, phrase, others }): Slide => {
    const offered = [
      { id: 'right', label: texOf(STANDARD[key].matrix), tex: true },
      ...others.map((other) => ({ id: other, label: texOf(STANDARD[other].matrix), tex: true })),
    ];
    const turn = (STANDARD_KEYS.indexOf(key) + phrase) % offered.length;
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which matrix represents ${STANDARD[key].phrases[phrase]}?` }],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'right',
    };
  },
  solution: ({ key, phrase }) => {
    const m = STANDARD[key].matrix;
    return [
      {
        text: `Work out where $\\mathbf{i}$ and $\\mathbf{j}$ go under ${STANDARD[key].phrases[phrase]}. A quick sketch of the two arrows is enough.`,
      },
      { tex: columnsLine(m) },
      { tex: `\\mathbf{M} = ${texOf(m)}` },
      {
        text: 'Those two images are the columns. There is no need to memorise the seven matrices: each one is rebuilt in seconds from where the two unit arrows end up.',
      },
    ];
  },
};

interface StandardImageParams {
  key: Standard;
  phrase: number;
  x: number;
  y: number;
}

/** A point moved by a named rotation or reflection. */
const standardImage: Generator<StandardImageParams> = {
  id: 'mat-standard-image',
  choices: ({ key, x, y }) =>
    options(
      { tex: pairTex(...apply(STANDARD[key].matrix, x, y)) },
      ...CONFUSED_WITH[key].map((other) => ({ tex: pairTex(...apply(STANDARD[other].matrix, x, y)) })),
    ),
  sample: (rng, difficulty) => {
    const key = rng.pick(STANDARD_KEYS);
    const span = difficulty > 1 ? 9 : 6;
    let x = 2;
    let y = 5;
    // Different sizes, both non-zero: then the seven images are seven
    // different points, and no distractor can land on the answer.
    for (let tries = 0; tries < 40; tries += 1) {
      x = nonZero(rng.int(-span, span), 3);
      y = nonZero(rng.int(-span, span), -4);
      if (Math.abs(x) !== Math.abs(y)) break;
    }
    if (Math.abs(x) === Math.abs(y)) y = x > 0 ? x + 1 : x - 1;
    return { key, phrase: rng.int(0, STANDARD[key].phrases.length - 1), x, y };
  },
  render: ({ key, phrase, x, y }) => {
    const answer = apply(STANDARD[key].matrix, x, y);
    const [near, next] = CONFUSED_WITH[key].map((other) => apply(STANDARD[other].matrix, x, y));
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The point $P(${x}, ${y})$ is transformed by ${STANDARD[key].phrases[phrase]}. Where does it go?`,
        },
      ],
      template: IMAGE_TEMPLATE,
      bank: bankOf(answer.map(String), [...near, ...next].map(String)),
      answer: answer.map(String),
    };
  },
  solution: ({ key, phrase, x, y }) => {
    const m = STANDARD[key].matrix;
    const [ix, iy] = apply(m, x, y);
    return [
      { text: `The matrix for ${STANDARD[key].phrases[phrase]} comes from where $\\mathbf{i}$ and $\\mathbf{j}$ go.` },
      { tex: `\\mathbf{M} = ${texOf(m)}` },
      { tex: `${texOf(m)} ${columnTex(x, y)} = ${columnTex(ix, iy)}` },
      {
        text: `So $P'$ is $${pairTex(ix, iy)}$. A sketch is the check: the image should sit where the ${key.startsWith('rot') ? 'turn' : 'mirror'} puts it, the same distance from the origin as $P$.`,
      },
    ];
  },
};

interface LocateParams {
  t: Transform;
  phrase: number;
  x: number;
  y: number;
  axis: 'x' | 'y';
}

/**
 * Where a point lands, found by sliding a marker on the grid.
 *
 * The same question as `mat-standard-image` asked of the picture: the point is
 * drawn, and so is any mirror line, so the move can be pictured before any
 * multiplying happens. Difficulty 1 holds to rotations and reflections;
 * difficulty 2 adds enlargements and stretches, for the lesson that teaches
 * them.
 */
const standardLocate: Generator<LocateParams> = {
  id: 'mat-standard-locate',
  sample: (rng, difficulty) => {
    const scaling = difficulty > 1 && rng.chance(0.5);
    const t: Transform = scaling
      ? rng.pick([
          { kind: 'enlarge', k: rng.pick([-2, 2, 3]) },
          { kind: 'stretch-x', k: rng.pick([2, 3]) },
          { kind: 'stretch-y', k: rng.pick([2, 3]) },
        ] as const)
      : { kind: 'standard', key: rng.pick(STANDARD_KEYS) };
    const span = scaling ? 3 : 4;
    let x = 1;
    let y = 3;
    for (let tries = 0; tries < 40; tries += 1) {
      x = nonZero(rng.int(-span, span), 2);
      y = nonZero(rng.int(-span, span), -3);
      if (Math.abs(x) !== Math.abs(y)) break;
    }
    if (Math.abs(x) === Math.abs(y)) y = x > 0 ? x + 1 : x - 1;
    return { t, phrase: rng.int(0, phraseCount(t) - 1), x, y, axis: rng.pick(['x', 'y'] as const) };
  },
  render: ({ t, phrase, x, y, axis }): Slide => {
    const [ix, iy] = apply(matrixOf(t), x, y);
    const span = spanFor(x, y, ix, iy);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `$P(${x}, ${y})$ is transformed by ${phraseOf(t, phrase)}. Slide to the $${axis}$-coordinate of its image.`,
        },
      ],
      min: -(span - 1),
      max: span - 1,
      step: 1,
      answer: axis === 'x' ? ix : iy,
      readout: `${axis}\\text{-coordinate of } P' = {v}`,
      figure: {
        svg: transformGridSvg({
          span,
          marks: [{ x, y, label: 'P' }],
          mirror: t.kind === 'standard' ? STANDARD[t.key].mirror : undefined,
          label: 'The point P on a grid',
        }),
        xMin: -span,
        xMax: span,
        axis,
      },
    };
  },
  solution: ({ t, phrase, x, y, axis }) => {
    const m = matrixOf(t);
    const [ix, iy] = apply(m, x, y);
    return [
      { text: `Write down the matrix for ${phraseOf(t, phrase)}, from where $\\mathbf{i}$ and $\\mathbf{j}$ go.` },
      { tex: `${texOf(m)} ${columnTex(x, y)} = ${columnTex(ix, iy)}` },
      {
        text: `So $P'$ is $${pairTex(ix, iy)}$, and its $${axis}$-coordinate is $${axis === 'x' ? ix : iy}$.`,
      },
      {
        text: 'The picture is the check. Put your finger on $P$, make the move in your head, and see whether it lands where the arithmetic says.',
      },
    ];
  },
};

/** Angles with exact sines and cosines, in degrees. */
const EXACT_ANGLES = [30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

/** An exact value of a sine or cosine of one of `EXACT_ANGLES`, as TeX. */
function exactTex(value: number): string {
  const size = Math.abs(value);
  const forms: [number, string][] = [
    [0, '0'],
    [1, '1'],
    [0.5, '\\frac{1}{2}'],
    [Math.sqrt(3) / 2, '\\frac{\\sqrt{3}}{2}'],
    [Math.SQRT2 / 2, '\\frac{\\sqrt{2}}{2}'],
  ];
  const form = forms.find(([exact]) => Math.abs(size - exact) < 1e-9)?.[1] ?? size.toFixed(3);
  return value < -1e-9 && form !== '0' ? `-${form}` : form;
}

interface RotationParams {
  turn: number;
  clockwise: boolean;
}

/**
 * The matrix of a rotation through any angle, with exact entries.
 *
 * Clockwise turns are asked on purpose: the formula is written for an
 * anticlockwise angle, so a clockwise one has to be made negative first, and
 * forgetting to is the mistake that swaps the signs of the two sines.
 */
const rotationMatrix: Generator<RotationParams> = {
  id: 'mat-rotation-matrix',
  choices: ({ turn, clockwise }) => {
    const theta = ((clockwise ? -turn : turn) * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const m = (p: number, q: number, r: number, s: number) =>
      `\\begin{pmatrix} ${exactTex(p)} & ${exactTex(q)} \\\\ ${exactTex(r)} & ${exactTex(s)} \\end{pmatrix}`;
    return options(
      { tex: m(cos, -sin, sin, cos) },
      // The turn taken the other way, the sine and cosine swapped, and every
      // sign flipped.
      { tex: m(cos, sin, -sin, cos) },
      { tex: m(sin, -cos, cos, sin) },
      { tex: m(-cos, sin, -sin, -cos) },
    );
  },
  sample: (rng, difficulty) => ({
    turn: rng.pick(EXACT_ANGLES),
    clockwise: rng.chance(difficulty > 1 ? 0.5 : 0.3),
  }),
  render: ({ turn, clockwise }) => {
    const theta = ((clockwise ? -turn : turn) * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const answer = [cos, -sin, sin, cos].map(exactTex);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Find the matrix for a rotation of $${turn}^\\circ$ ${clockwise ? 'clockwise' : 'anticlockwise'} about the origin.`,
        },
      ],
      template: MATRIX_TEMPLATE,
      bank: bankOf(answer, [
        exactTex(sin),
        exactTex(-cos),
        exactTex(Math.abs(cos) > 0.9 || Math.abs(cos) < 0.1 ? 0.5 : Math.abs(sin)),
        '\\frac{\\sqrt{3}}{2}',
      ]),
      answer,
    };
  },
  solution: ({ turn, clockwise }) => {
    const angle = clockwise ? -turn : turn;
    const theta = (angle * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    return [
      {
        text: 'A rotation through $\\theta$ anticlockwise about the origin sends $\\mathbf{i}$ to $(\\cos\\theta, \\sin\\theta)$ and $\\mathbf{j}$ to $(-\\sin\\theta, \\cos\\theta)$.',
      },
      { tex: '\\begin{pmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{pmatrix}' },
      clockwise
        ? { text: `The turn is clockwise, so $\\theta = -${turn}^\\circ$ in the formula.` }
        : { text: `Here $\\theta = ${turn}^\\circ$.` },
      {
        tex: `\\cos\\theta = ${exactTex(cos)} \\qquad \\sin\\theta = ${exactTex(sin)}`,
      },
      {
        tex: `\\begin{pmatrix} ${exactTex(cos)} & ${exactTex(-sin)} \\\\ ${exactTex(sin)} & ${exactTex(cos)} \\end{pmatrix}`,
      },
      {
        text: 'The minus sign always sits on the sine in the top row. Putting it in the bottom row instead gives the rotation the other way round.',
      },
    ];
  },
};

/* ----- enlargements, stretches and naming ----- */

interface ScaleParams {
  t: Transform;
  phrase: number;
}

/** The matrix for an enlargement or a stretch. */
const scaleMatrix: Generator<ScaleParams> = {
  id: 'mat-scale',
  choices: ({ t }) => {
    const m = matrixOf(t);
    const [a, , , d] = m;
    const wrong: Matrix[] =
      t.kind === 'enlarge'
        ? [
            [a, 0, 0, 1],
            [1, 0, 0, a],
            [0, a, a, 0],
          ]
        : t.kind === 'stretch-x'
          ? [
              [1, 0, 0, a],
              [a, 0, 0, a],
              [a, 0, 0, 0],
            ]
          : t.kind === 'stretch-y'
            ? [
                [d, 0, 0, 1],
                [d, 0, 0, d],
                [0, 0, 0, d],
              ]
            : [
                [d, 0, 0, a],
                [0, a, d, 0],
                [a, 0, 0, 1],
              ];
    return options({ tex: texOf(m) }, ...wrong.map((w) => ({ tex: texOf(w) })));
  },
  sample: (rng, difficulty) => {
    const k = rng.int(2, 6);
    const kinds =
      difficulty > 1
        ? (['enlarge', 'stretch-x', 'stretch-y', 'stretch-xy'] as const)
        : (['enlarge', 'stretch-x', 'stretch-y'] as const);
    const kind = rng.pick(kinds);
    const t: Transform =
      kind === 'stretch-xy'
        ? { kind, k, q: rng.pick([2, 3, 4, 5, 6].filter((q) => q !== k)) }
        : kind === 'enlarge' && difficulty > 1 && rng.chance(0.4)
          ? { kind, k: -rng.int(2, 4) }
          : { kind, k };
    return { t, phrase: rng.int(0, 1) };
  },
  render: ({ t, phrase }) => {
    const m = matrixOf(t);
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Find the matrix for ${phraseOf(t, phrase)}.` }],
      template: MATRIX_TEMPLATE,
      bank: bankOf(m.map(String), ['0', '1', `${-m[0]}`, `${m[0] + m[3]}`]),
      answer: m.map(String),
    };
  },
  solution: ({ t, phrase }) => {
    const m = matrixOf(t);
    const said =
      t.kind === 'enlarge'
        ? `Both $\\mathbf{i}$ and $\\mathbf{j}$ are multiplied by $${t.k}$ and keep their directions.`
        : t.kind === 'stretch-x'
          ? `Only the $x$ direction is stretched: $\\mathbf{i}$ is multiplied by $${t.k}$ and $\\mathbf{j}$ is left alone.`
          : t.kind === 'stretch-y'
            ? `Only the $y$ direction is stretched: $\\mathbf{j}$ is multiplied by $${t.k}$ and $\\mathbf{i}$ is left alone.`
            : t.kind === 'stretch-xy'
              ? `Each direction is stretched by its own factor: $\\mathbf{i}$ by $${t.k}$ and $\\mathbf{j}$ by $${t.q}$.`
              : 'Work out where the two unit arrows end up.';
    return [
      { text: `Ask where $\\mathbf{i}$ and $\\mathbf{j}$ go under ${phraseOf(t, phrase)}.` },
      { text: said },
      { tex: columnsLine(m) },
      { tex: `\\mathbf{M} = ${texOf(m)}` },
      {
        text: 'The direction that is left alone keeps its $1$ on the diagonal. Writing $0$ there instead squashes that whole direction flat.',
      },
    ];
  },
};

interface DescribeParams {
  t: Transform;
  others: Transform[];
}

/** Scalings a stretch or enlargement is most easily mistaken for. */
function scalingMixUps(t: Transform): Transform[] {
  switch (t.kind) {
    case 'enlarge':
      return [
        { kind: 'stretch-x', k: t.k },
        { kind: 'stretch-y', k: t.k },
        { kind: 'enlarge', k: -t.k },
      ];
    case 'stretch-x':
      return [
        { kind: 'stretch-y', k: t.k },
        { kind: 'enlarge', k: t.k },
        { kind: 'stretch-x', k: t.k + 1 },
      ];
    case 'stretch-y':
      return [
        { kind: 'stretch-x', k: t.k },
        { kind: 'enlarge', k: t.k },
        { kind: 'stretch-y', k: t.k + 1 },
      ];
    default:
      return [];
  }
}

/** Naming the transformation a matrix represents. */
const describeMatrix: Generator<DescribeParams> = {
  id: 'mat-describe',
  sample: (rng, difficulty) => {
    const kind = rng.pick(['standard', 'standard', 'enlarge', 'stretch-x', 'stretch-y'] as const);
    if (kind === 'standard') {
      const key = rng.pick(STANDARD_KEYS);
      return {
        t: { kind, key },
        others: rng
          .sample(
            STANDARD_KEYS.filter((other) => other !== key),
            3,
          )
          .map((other): Transform => ({ kind: 'standard', key: other })),
      };
    }
    const k =
      kind === 'enlarge' && difficulty > 1 && rng.chance(0.4) ? -rng.int(2, 4) : rng.int(2, 7);
    const t: Transform = { kind, k };
    return { t, others: scalingMixUps(t) };
  },
  render: ({ t, others }): Slide => {
    const offered = distinctOptions([
      { id: 'right', label: nameOf(t), tex: false },
      ...others.map((other, idx) => ({ id: `other${idx}`, label: nameOf(other), tex: false })),
    ]);
    const m = matrixOf(t);
    const turn = (Math.abs(m[0]) + 2 * Math.abs(m[1]) + 3 * Math.abs(m[3])) % offered.length;
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Which transformation does this matrix represent?' },
        { kind: 'display', tex: `\\mathbf{M} = ${texOf(m)}` },
      ],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'right',
    };
  },
  solution: ({ t }) => {
    const m = matrixOf(t);
    return [
      { text: 'Read the columns: they are where $\\mathbf{i}$ and $\\mathbf{j}$ land. Then picture the two arrows.' },
      { tex: columnsLine(m) },
      {
        text:
          t.kind === 'standard'
            ? `Both arrows keep their length of $1$, so this is a rotation or a reflection. Their new positions say which it is: **${STANDARD[t.key].name}**.`
            : t.kind === 'enlarge'
              ? `Both arrows are multiplied by $${t.k}$ and neither turns${t.k < 0 ? ' except to point the opposite way' : ''}, so this is an enlargement of scale factor $${t.k}$ about the origin.`
              : `One arrow is multiplied by $${t.k}$ and the other is unchanged, so this is a stretch in the direction of the arrow that grew: ${nameOf(t).toLowerCase()}.`,
      },
      {
        text: 'A stretch parallel to the $x$-axis moves points across and leaves their heights alone, so it is the $x$ entry that changes. Mixing up the two axes is the commonest slip here.',
      },
    ];
  },
};

type NameCase = 'enlarge' | 'stretch' | 'axis-mirror' | 'diagonal-mirror' | 'quarter' | 'other';

interface NameParams {
  m: Matrix;
}

/**
 * Naming a transformation by working down a decision tree.
 *
 * `mat-describe` asks for the name from four; this asks for the reasoning that
 * gets there, one fork at a time, and it takes in matrices with no standard
 * name at all, which a list of four names cannot.
 */
const nameFlow: Generator<NameParams> = {
  id: 'mat-name',
  sample: (rng) => {
    const which = rng.pick(['enlarge', 'stretch', 'axis-mirror', 'diagonal-mirror', 'quarter', 'other'] as const satisfies readonly NameCase[]);
    switch (which) {
      case 'enlarge': {
        const k = rng.pick([-4, -3, -2, -1, 2, 3, 4, 5]);
        return { m: [k, 0, 0, k] };
      }
      case 'stretch': {
        const k = rng.int(2, 6);
        const q = rng.pick([1, 1, rng.int(2, 6)].filter((v) => v !== k));
        return { m: rng.chance(0.5) ? [k, 0, 0, q] : [q, 0, 0, k] };
      }
      case 'axis-mirror':
        return { m: rng.pick([STANDARD['refl-x'].matrix, STANDARD['refl-y'].matrix]) };
      case 'diagonal-mirror':
        return { m: rng.pick([STANDARD['refl-yx'].matrix, STANDARD['refl-ynx'].matrix]) };
      case 'quarter':
        return { m: rng.pick([STANDARD.rot90.matrix, STANDARD.rot270.matrix]) };
      case 'other': {
        const k = nonZero(rng.int(-3, 3), 2);
        if (rng.chance(0.5)) return { m: rng.pick<Matrix>([[1, k, 0, 1], [1, 0, k, 1]]) };
        return { m: sampleTransform(rng, 4) };
      }
    }
  },
  render: ({ m }): Slide => {
    const [a, b, c, d] = m;
    const offDiagonalZero = b === 0 && c === 0;
    const answer = offDiagonalZero
      ? a === d
        ? ['Yes', 'Yes']
        : a * d === -1 && Math.abs(a) === 1
          ? ['Yes', 'No', 'Yes']
          : ['Yes', 'No', 'No']
      : a === 0 && d === 0
        ? b * c > 0
          ? ['No', 'Yes', 'Yes']
          : ['No', 'Yes', 'No']
        : ['No', 'No'];
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Work down the questions to name the transformation. Each answer chooses what gets asked next.',
        },
      ],
      subject: `\\mathbf{M} = ${texOf(m)}`,
      steps: [
        {
          id: 'off',
          ask: 'Are both entries off the leading diagonal zero?',
          branches: [
            { label: 'Yes', to: 'equal' },
            { label: 'No', to: 'lead' },
          ],
        },
        {
          id: 'equal',
          ask: 'Are the two entries on the leading diagonal equal?',
          branches: [
            { label: 'Yes', outcome: 'An enlargement about the origin, with that entry as the scale factor.' },
            { label: 'No', to: 'mirror' },
          ],
        },
        {
          id: 'mirror',
          ask: 'Is one diagonal entry 1 and the other −1?',
          branches: [
            { label: 'Yes', outcome: 'A reflection in one of the axes.' },
            { label: 'No', outcome: 'A stretch parallel to the axes, by the diagonal entries.' },
          ],
        },
        {
          id: 'lead',
          ask: 'Are both entries on the leading diagonal zero?',
          branches: [
            { label: 'Yes', to: 'sign' },
            { label: 'No', outcome: 'None of the standard ones: find where i and j land and describe that.' },
          ],
        },
        {
          id: 'sign',
          ask: 'Do the other two entries have the same sign?',
          branches: [
            { label: 'Yes', outcome: 'A reflection in the line y = x or y = −x.' },
            { label: 'No', outcome: 'A rotation of 90° about the origin, one way or the other.' },
          ],
        },
      ],
      answer,
    };
  },
  solution: ({ m }) => {
    const [a, b, c, d] = m;
    const verdict =
      b === 0 && c === 0
        ? a === d
          ? `Nothing off the diagonal and the diagonal entries match, so this is an enlargement of scale factor $${a}$ about the origin${a === -1 ? ', which is the same as a half turn' : ''}.`
          : a * d === -1 && Math.abs(a) === 1
            ? `Nothing off the diagonal, and one direction is kept while the other is flipped: a reflection in the ${a === 1 ? '$x$' : '$y$'}-axis.`
            : `Nothing off the diagonal, with different entries on it: $\\mathbf{i}$ is multiplied by $${a}$ and $\\mathbf{j}$ by $${d}$, which is a stretch parallel to the axes.`
        : a === 0 && d === 0
          ? b * c > 0
            ? `Zeros on the diagonal and matching signs off it: $\\mathbf{i}$ and $\\mathbf{j}$ swap places, possibly both reversed, which is a reflection in $y = ${b > 0 ? '' : '-'}x$.`
            : `Zeros on the diagonal and opposite signs off it: $\\mathbf{i}$ turns onto the ${c > 0 ? 'positive' : 'negative'} $y$-axis, which is a quarter turn ${c > 0 ? 'anticlockwise' : 'clockwise'}.`
          : 'Something both on and off the diagonal, so it is not one of the standard shapes. Read the columns and describe what happens to $\\mathbf{i}$ and $\\mathbf{j}$ directly — this family includes the shears.';
    return [
      { text: 'Where the zeros sit decides almost everything, so look for them first.' },
      { tex: `${texOf(m)} \\qquad ${columnsLine(m)}` },
      { text: verdict },
    ];
  },
};

/* ----- area ----- */

interface AreaImageParams {
  m: Matrix;
  area: number;
}

/**
 * The area of an image: the original area times the size of the determinant.
 *
 * Difficulty 1 keeps the determinant positive, for the lesson's first half;
 * difficulty 2 lets it go negative, which is where taking the size of it
 * starts to matter.
 */
const areaImage: Generator<AreaImageParams> = {
  id: 'mat-area-image',
  choices: ({ m, area }) => {
    const det = detOf(m);
    const [a, b, c, d] = m;
    return options(
      { tex: `${Math.abs(det) * area}`, answer: `${Math.abs(det) * area}` },
      { tex: `${det * area}`, answer: `${det * area}` },
      { tex: `${Math.abs(a * d + b * c) * area}`, answer: `${Math.abs(a * d + b * c) * area}` },
      { tex: `${Math.abs(det) + area}`, answer: `${Math.abs(det) + area}` },
      { tex: `${Math.abs(det)}`, answer: `${Math.abs(det)}` },
    ).slice(0, 4);
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 7 : 5;
    for (let tries = 0; tries < 60; tries += 1) {
      const m: Matrix = [
        nonZero(rng.int(-span, span), 3),
        nonZero(rng.int(-span, span), 1),
        nonZero(rng.int(-span, span), 2),
        nonZero(rng.int(-span, span), 4),
      ];
      const det = detOf(m);
      if (det === 0 || (difficulty === 1 && det < 0)) continue;
      return { m, area: rng.int(2, difficulty > 1 ? 12 : 9) };
    }
    return { m: [3, 1, 2, 4], area: 5 };
  },
  render: ({ m, area }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `A shape of area $${area}$ is transformed by this matrix. Find the area of its image.`,
      },
      { kind: 'display', tex: `\\mathbf{M} = ${texOf(m)}` },
    ],
    lead: '\\text{area of image} =',
    keypad: [],
    answer: `${Math.abs(detOf(m)) * area}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ m, area }) => {
    const [a, b, c, d] = m;
    const det = detOf(m);
    return [
      { text: 'The determinant is the factor the matrix scales every area by.' },
      {
        tex: `\\det\\mathbf{M} = \\left(${a}\\right)\\left(${d}\\right) - \\left(${b}\\right)\\left(${c}\\right) = ${det}`,
      },
      { tex: `${Math.abs(det)} \\times ${area} = ${Math.abs(det) * area}` },
      det < 0
        ? {
            text: `The determinant is negative, which means the shape is turned over. Area is never negative, so the factor is its size, $${Math.abs(det)}$.`,
          }
        : {
            text: 'The shape is not given, and it does not need to be: every region in the plane is scaled by the same factor.',
          },
    ];
  },
};

interface AreaStepsParams {
  m: Matrix;
  p: number;
  q: number;
}

/**
 * The area of a transformed rectangle, one piece at a time.
 *
 * Two independent strands — the determinant and the rectangle's own area —
 * meet in one product, and the determinant's subtraction has to wait for both
 * of its diagonals. Kept to positive determinants so the line holds the
 * area itself, with no size to take at the end.
 */
const areaSteps: Generator<AreaStepsParams> = {
  id: 'mat-area-steps',
  choices: ({ m, p, q }) => {
    const [a, b, c, d] = m;
    const det = detOf(m);
    return signedChoices(det * p * q, [(a * d + b * c) * p * q, det + p * q, det * (p + q)]);
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 6 : 4;
    for (let tries = 0; tries < 60; tries += 1) {
      const m: Matrix = [
        nonZero(rng.int(-span, span), 3),
        nonZero(rng.int(-span, span), 1),
        nonZero(rng.int(-span, span), 2),
        nonZero(rng.int(-span, span), 4),
      ];
      if (detOf(m) > 0) return { m, p: rng.int(2, 5), q: rng.int(2, difficulty > 1 ? 7 : 5) };
    }
    return { m: [3, 1, 2, 4], p: 2, q: 3 };
  },
  render: ({ m, p, q }): Slide => {
    const [a, b, c, d] = m;
    const det = detOf(m);
    const leading = a * d;
    const other = b * c;
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `A $${p}$ by $${q}$ rectangle is transformed by this matrix, whose determinant is positive. Its new area is the determinant times its old one. Tap the part you would work out **next**, then choose what it comes to.`,
        },
        { kind: 'display', tex: `\\mathbf{M} = ${texOf(m)}` },
      ],
      expr: bin('*', bin('-', bin('*', num(a), num(d)), bin('*', num(b), num(c))), bin('*', num(p), num(q))),
      banks: {
        'r.l.l': signedOffer(leading, a + d, -leading, Math.abs(leading) + 1),
        'r.l.r': signedOffer(other, b + c, -other, Math.abs(other) + 1),
        'r.l': signedOffer(det, leading + other, other - leading, -det),
        'r.r': signedOffer(p * q, p + q, p * q + 1, 2 * (p + q)),
        r: signedOffer(det * p * q, det + p * q, (leading + other) * p * q, det * (p + q)),
      },
    };
  },
  solution: ({ m, p, q }) => {
    const [a, b, c, d] = m;
    const det = detOf(m);
    return [
      { text: 'Two things are needed, and neither depends on the other: the determinant, and the area of the rectangle.' },
      {
        tex: `\\det\\mathbf{M} = \\left(${a}\\right)\\left(${d}\\right) - \\left(${b}\\right)\\left(${c}\\right) = ${a * d} - \\left(${b * c}\\right) = ${det}`,
      },
      { tex: `${p} \\times ${q} = ${p * q}` },
      { tex: `${det} \\times ${p * q} = ${det * p * q}` },
      {
        text: 'Both diagonals have to be multiplied before the subtraction can happen, but the rectangle can be done at any point — the order between the two strands does not matter.',
      },
    ];
  },
};

interface AreaKParams {
  slot: number;
  entries: Matrix;
  area: number;
}

/**
 * An unknown entry, found from what the matrix does to area.
 *
 * The determinant is linear in any one entry, so fixing the area fixes the
 * entry. Stating the orientation is what makes the answer unique: without it,
 * a determinant of 6 and one of -6 both scale area by 6.
 */
const areaK: Generator<AreaKParams> = {
  id: 'mat-area-k',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 80; tries += 1) {
      const entries: Matrix = [
        nonZero(rng.int(-5, 5), 3),
        nonZero(rng.int(-5, 5), 1),
        nonZero(rng.int(-5, 5), 2),
        nonZero(rng.int(-5, 5), 4),
      ];
      const det = detOf(entries);
      if (det === 0 || (difficulty === 1 && det < 0)) continue;
      return { slot: rng.int(0, 3), entries, area: rng.int(2, 6) };
    }
    return { slot: 0, entries: [3, 1, 2, 4], area: 3 };
  },
  render: ({ slot, entries, area }) => {
    const det = detOf(entries);
    const shown = entries.map((value, idx) => (idx === slot ? 'k' : `${value}`));
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `This matrix maps a shape of area $${area}$ to an image of area $${Math.abs(det) * area}$, ${det > 0 ? 'keeping it the same way round' : 'turning it over'}. Find $k$.`,
        },
        {
          kind: 'display',
          tex: `\\mathbf{M} = \\begin{pmatrix} ${shown[0]} & ${shown[1]} \\\\ ${shown[2]} & ${shown[3]} \\end{pmatrix}`,
        },
      ],
      lead: 'k =',
      keypad: [],
      answer: `${entries[slot]}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ slot, entries, area }) => {
    const [a, b, c, d] = entries;
    const det = detOf(entries);
    const image = Math.abs(det) * area;
    // det = coefficient * k + rest, whichever entry k is.
    const coefficient = [d, -c, -b, a][slot];
    const rest = slot === 0 || slot === 3 ? -b * c : a * d;
    const product =
      slot === 0
        ? `k\\left(${d}\\right) - \\left(${b}\\right)\\left(${c}\\right)`
        : slot === 3
          ? `\\left(${a}\\right)k - \\left(${b}\\right)\\left(${c}\\right)`
          : slot === 1
            ? `\\left(${a}\\right)\\left(${d}\\right) - k\\left(${c}\\right)`
            : `\\left(${a}\\right)\\left(${d}\\right) - \\left(${b}\\right)k`;
    return [
      {
        text: `The area is scaled by $${image} \\div ${area} = ${Math.abs(det)}$. The shape is ${det > 0 ? 'kept the same way round, so the determinant is positive' : 'turned over, so the determinant is negative'}: it is $${det}$.`,
      },
      { tex: `\\det\\mathbf{M} = ${product} = ${det}` },
      { tex: `${coefficient}k ${rest < 0 ? '-' : '+'} ${Math.abs(rest)} = ${det}` },
      { tex: `k = \\frac{${det - rest}}{${coefficient}} = ${entries[slot]}` },
      {
        text: 'Getting the sign of the determinant wrong gives a different $k$ that scales the area correctly but flips the shape when it should not, or the other way round.',
      },
    ];
  },
};

interface OrientationParams {
  m: Matrix;
  area: number;
}

/**
 * What a matrix does to a shape: its area, and whether it is turned over.
 *
 * The two halves of what a determinant says, asked together, so that the sign
 * cannot be ignored and the size cannot be forgotten.
 */
const orientation: Generator<OrientationParams> = {
  id: 'mat-orientation',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 7 : 5;
    for (let tries = 0; tries < 60; tries += 1) {
      const m: Matrix = [
        nonZero(rng.int(-span, span), 3),
        nonZero(rng.int(-span, span), 1),
        nonZero(rng.int(-span, span), 2),
        nonZero(rng.int(-span, span), 4),
      ];
      if (detOf(m) !== 0) return { m, area: rng.int(2, 9) };
    }
    return { m: [1, 3, 2, 4], area: 3 };
  },
  render: ({ m, area }): Slide => {
    const [a, b, c, d] = m;
    const det = detOf(m);
    const right = Math.abs(det) * area;
    const summed = Math.abs(a * d + b * c) * area;
    const wrong = summed === right || summed === 0 ? right + area : summed;
    const kept = 'the same way round';
    const flipped = 'turned over';
    const offered = [
      { id: det > 0 ? 'right' : 'size-only', label: `Area ${right}, ${kept}`, tex: false },
      { id: det < 0 ? 'right' : 'sign-only', label: `Area ${right}, ${flipped}`, tex: false },
      { id: 'kept', label: `Area ${wrong}, ${kept}`, tex: false },
      { id: 'flipped', label: `Area ${wrong}, ${flipped}`, tex: false },
    ];
    const turn = (Math.abs(a) + Math.abs(d)) % offered.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `A triangle of area $${area}$ is transformed by this matrix. Which describes its image?`,
        },
        { kind: 'display', tex: `\\mathbf{M} = ${texOf(m)}` },
      ],
      options: [...offered.slice(turn), ...offered.slice(0, turn)],
      correctId: 'right',
    };
  },
  solution: ({ m, area }) => {
    const [a, b, c, d] = m;
    const det = detOf(m);
    return [
      { text: 'Everything here comes from the determinant: its size scales the area, and its sign says whether the shape is turned over.' },
      {
        tex: `\\det\\mathbf{M} = \\left(${a}\\right)\\left(${d}\\right) - \\left(${b}\\right)\\left(${c}\\right) = ${det}`,
      },
      { tex: `\\text{area} = ${Math.abs(det)} \\times ${area} = ${Math.abs(det) * area}` },
      {
        text:
          det > 0
            ? 'The determinant is positive, so the image is the same way round: going round the corners in order still turns the same way.'
            : 'The determinant is negative, so the image is turned over, like a reflection: going round the corners in order now turns the other way.',
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
  columnImage,
  fromImages,
  readColumn,
  squareCorner,
  squareWhich,
  standardMatrix,
  standardImage,
  standardLocate,
  rotationMatrix,
  scaleMatrix,
  describeMatrix,
  nameFlow,
  areaImage,
  areaSteps,
  areaK,
  orientation,
] as unknown as Generator<unknown>[];
