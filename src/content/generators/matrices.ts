/**
 * Matrices: arithmetic, a matrix acting on a vector, the determinant and the
 * inverse.
 *
 * Shared formatters and the engine constraints they exist for live in
 * `vectorFormat.ts`, alongside the vector generators these grew out of.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
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
import { fracTex } from './parametricImplicit';

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
      // One image with its sign lost. Also the one option not made of the same
      // four numbers, which keeps the derived rotation from favouring two slots.
      { tex: matrixTex(-a, b, -c, d) },
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
      // P itself, as though nothing had moved it.
      { tex: pairTex(x, y) },
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
      // A minus on both sines.
      { tex: m(cos, -sin, -sin, cos) },
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
    // From every label as well as the entries: for an enlargement the entries
    // alone always came to a multiple of four, which pinned the answer first.
    const turn =
      Math.abs(offered.reduce((hash, option) => hash * 31 + option.label.length, Math.abs(m[0]) + Math.abs(m[3]))) %
      offered.length;
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
          text: `A $${p}$ by $${q}$ rectangle is transformed by this matrix, whose determinant is positive. Its new area is its old area times the determinant. Tap the part you would work out **next**, then choose what it comes to.`,
        },
        { kind: 'display', tex: `\\mathbf{M} = ${texOf(m)}` },
      ],
      // Rectangle first, as the line reads left to right. With the determinant
      // first the rectangle's product loses its brackets, and "(det) x 3 x 3"
      // invites multiplying by the first 3 alone, which is not a piece.
      expr: bin('*', bin('*', num(p), num(q)), bin('-', bin('*', num(a), num(d)), bin('*', num(b), num(c)))),
      banks: {
        'r.l': signedOffer(p * q, p + q, p * q + 1, 2 * (p + q)),
        'r.r.l': signedOffer(leading, a + d, -leading, Math.abs(leading) + 1),
        'r.r.r': signedOffer(other, b + c, -other, Math.abs(other) + 1),
        'r.r': signedOffer(det, leading + other, other - leading, -det),
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

/* ---------- Level 7: composing transformations (roadmap batch B18) ---------- */

/**
 * The matrix for "n, then m": the product mn.
 *
 * Read right to left, because the matrix nearest the point acts on it first.
 * Every question in this level turns on that one convention, so it is written
 * down once, here, and every generator goes through it.
 */
function mul(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
  ];
}

const sameMatrix = (m: Matrix, n: Matrix) => m.every((value, idx) => value === n[idx]);

/** Entry by entry: the slip every product question here is built to catch. */
const entrywise = (m: Matrix, n: Matrix): Matrix => [m[0] * n[0], m[1] * n[1], m[2] * n[2], m[3] * n[3]];

const negated = (m: Matrix): Matrix => [-m[0], -m[1], -m[2], -m[3]];

/** Which of the seven standard transformations a matrix is, if any. */
function standardKeyOf(m: Matrix): Standard | undefined {
  return STANDARD_KEYS.find((key) => sameMatrix(STANDARD[key].matrix, m));
}

const STANDARDS: Transform[] = STANDARD_KEYS.map((key) => ({ kind: 'standard', key }));

/** Small scalings, kept small so a composition still fits on the grid. */
const SCALINGS: Transform[] = [
  { kind: 'enlarge', k: 2 },
  { kind: 'enlarge', k: 3 },
  { kind: 'enlarge', k: -2 },
  { kind: 'stretch-x', k: 2 },
  { kind: 'stretch-x', k: 3 },
  { kind: 'stretch-y', k: 2 },
  { kind: 'stretch-y', k: 3 },
];

/** Every transformation this level composes by name. */
const COMPOSABLE: Transform[] = [...STANDARDS, ...SCALINGS];

/** Shears have no name among the standard ones, so they are only ever shown. */
const SHEARS: Matrix[] = [
  [1, 1, 0, 1],
  [1, -1, 0, 1],
  [1, 2, 0, 1],
  [1, -2, 0, 1],
  [1, 0, 1, 1],
  [1, 0, -1, 1],
  [1, 0, 2, 1],
  [1, 0, -2, 1],
];

/** Every unordered pair of distinct items, split by whether the two commute. */
function splitPairs<T>(items: readonly T[], matrix: (item: T) => Matrix): { agree: [T, T][]; clash: [T, T][] } {
  const agree: [T, T][] = [];
  const clash: [T, T][] = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const [p, q] = [matrix(items[i]), matrix(items[j])];
      (sameMatrix(mul(p, q), mul(q, p)) ? agree : clash).push([items[i], items[j]]);
    }
  }
  return { agree, clash };
}

const NAMED_PAIRS = splitPairs(COMPOSABLE, matrixOf);
const MOVE_PAIRS = splitPairs(COMPOSABLE.map(matrixOf), (m) => m);
const SHOWN_PAIRS = splitPairs([...COMPOSABLE.map(matrixOf), ...SHEARS], (m) => m);

/** Letters a question may call its matrices by. */
const LETTERS = ['A', 'B', 'C', 'M', 'N', 'P', 'Q', 'R', 'S', 'T'];

const bold = (word: string) => `\\mathbf{${word}}`;
const inverseOfLetter = (letter: string) => `${bold(letter)}^{-1}`;
const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * A choice slide's options, turned by a hash of every label.
 *
 * The same idea as the rotation `choiceVariant` applies, for the native choice
 * slides of this level, so the answer is not always first and one question
 * still renders one way. The prompt goes in as a salt: several of these
 * questions offer the same few labels in every draw, and a hash of the labels
 * alone would then pin the answer to one or two slots.
 */
function turned<T extends { label: string }>(offered: T[], salt: string): T[] {
  let hash = 17;
  for (const text of [salt, ...offered.map((option) => option.label)]) {
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 37 + text.charCodeAt(i)) | 0;
    }
  }
  const turn = Math.abs(hash) % offered.length;
  return [...offered.slice(turn), ...offered.slice(0, turn)];
}

/**
 * Choose which three slips a derived choice slide offers, so that the answer
 * lands in the slot `target` asks for.
 *
 * `choiceVariant` turns the options by a hash of their labels, which is fine
 * while every draw offers different labels. Two questions here offer only a
 * handful of label sets — the seven standard matrices, or angles that are all
 * multiples of 90 — and there the hash put the answer in one or two slots
 * nearly every time. So this mirrors that hash, tries each run of three
 * consecutive slips, and keeps the first whose turn lands the answer on
 * `target`. Failing that it tries runs of two, since four labels of the same
 * make can fix the parity of the hash and so rule out half the slots; failing
 * that, the first three. The target comes from the question's own parameters,
 * so one question still renders one way.
 */
function aimedOptions(correct: ChoiceOption, slips: ChoiceOption[], target: number): ChoiceOption[] {
  const tried: ChoiceOption[][] = [];
  for (const count of [3, 2]) {
    for (let start = 0; start < Math.max(1, slips.length); start += 1) {
      const picked = [...slips.slice(start), ...slips.slice(0, start)].slice(0, count);
      const offered = options(correct, ...picked);
      tried.push(offered);
      let hash = 0;
      for (const option of offered) {
        for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
      }
      const turn = Math.abs(hash) % offered.length;
      if ((offered.length - turn) % offered.length === target % offered.length) return offered;
    }
  }
  return tried[0];
}

/** A point off both axes and off both diagonals, so every image is distinct. */
function offAxisPoint(
  rng: Parameters<Generator<unknown>['sample']>[0],
  span: number,
): [number, number] {
  for (let tries = 0; tries < 40; tries += 1) {
    const x = nonZero(rng.int(-span, span), 2);
    const y = nonZero(rng.int(-span, span), -1);
    if (Math.abs(x) !== Math.abs(y)) return [x, y];
  }
  return [2, -1];
}

/** The same sentence three ways: `first` is applied, then `second`. */
function thenSentence(first: string, second: string, phrase: number): string {
  return [
    `$${bold(first)}$ is applied first, then $${bold(second)}$.`,
    `A point is transformed by $${bold(first)}$, and the result by $${bold(second)}$.`,
    `$${bold(second)}$ is applied after $${bold(first)}$.`,
  ][phrase % 3];
}

/** The two matrices of a question, one per display, in alphabetical order. */
function namedDisplays(pairs: [string, Matrix][]): Block[] {
  return [...pairs]
    .sort(([p], [q]) => p.localeCompare(q))
    .map(([letter, m]) => ({ kind: 'display', tex: `${bold(letter)} = ${texOf(m)}` }) as const);
}

/* ----- a product is a composition ----- */

interface ComposeMatrixParams {
  first: Matrix;
  second: Matrix;
  /** The letters of the matrix applied first and the one applied second. */
  names: [string, string];
  phrase: number;
}

/**
 * The single matrix for one transformation followed by another.
 *
 * The words give the order of events and the answer has to reverse it: the
 * first transformation is written on the right. Every draw is a pair whose
 * product changes with the order, so writing them left to right as read is
 * always marked wrong.
 */
const composeMatrix: Generator<ComposeMatrixParams> = {
  id: 'mat-compose-matrix',
  choices: ({ first, second }) =>
    options(
      { tex: texOf(mul(second, first)) },
      // Multiplied in the order they are read, entry by entry, and added.
      { tex: texOf(mul(first, second)) },
      { tex: texOf(entrywise(second, first)) },
      { tex: texOf([first[0] + second[0], first[1] + second[1], first[2] + second[2], first[3] + second[3]]) },
    ),
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 4 : 3;
    for (let tries = 0; tries < 60; tries += 1) {
      const first = sampleTransform(rng, span, true);
      const second = sampleTransform(rng, span, true);
      if (sameMatrix(mul(second, first), mul(first, second))) continue;
      const [p, q] = rng.sample(LETTERS, 2);
      return { first, second, names: [p, q], phrase: rng.int(0, 2) };
    }
    return { first: [1, 2, 0, 1], second: [0, -1, 1, 0], names: ['A', 'B'], phrase: 0 };
  },
  render: ({ first, second, names, phrase }) => {
    const [f, s] = names;
    const answer = mul(second, first);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `${thenSentence(f, s, phrase)} Find the single matrix that does both.` },
        ...namedDisplays([
          [f, first],
          [s, second],
        ]),
      ],
      template: MATRIX_TEMPLATE,
      bank: bankOf(answer.map(String), [...mul(first, second), entrywise(second, first)[0]].map(String)),
      answer: answer.map(String),
    };
  },
  solution: ({ first, second, names }) => {
    const [f, s] = names;
    const answer = mul(second, first);
    return [
      {
        text: `The matrix applied first sits on the right, next to the point it acts on. So $${bold(f)}$ then $${bold(s)}$ is the product $${bold(s + f)}$.`,
      },
      { tex: `${bold(s + f)} = ${texOf(second)} ${texOf(first)}` },
      { tex: `= ${texOf(answer)}` },
      {
        text: `Each entry pairs a row of $${bold(s)}$ with a column of $${bold(f)}$: row 1 with column 1 gives the top-left entry, $${answer[0]}$.`,
      },
      {
        text: `Multiplying in the order the words are read gives $${bold(f + s)}$ instead, which here is $${texOf(mul(first, second))}$: a different transformation, $${bold(s)}$ first and then $${bold(f)}$.`,
      },
    ];
  },
};

interface ComposePointParams {
  first: Matrix;
  second: Matrix;
  names: [string, string];
  x: number;
  y: number;
  phrase: number;
}

/**
 * A point moved by one matrix, then by another, one stage at a time.
 *
 * Both stages are asked for, so the answer shows the order the transformations
 * happen in. The single-matrix question comes after this one in the lesson:
 * this is what that product is a shortcut for.
 */
const composePoint: Generator<ComposePointParams> = {
  id: 'mat-compose-point',
  sample: (rng, difficulty) => {
    const pool = COMPOSABLE.map(matrixOf);
    for (let tries = 0; tries < 60; tries += 1) {
      const first = difficulty > 1 ? sampleTransform(rng, 2, true) : rng.pick(pool);
      const second = difficulty > 1 ? sampleTransform(rng, 2, true) : rng.pick(pool);
      if (sameMatrix(mul(second, first), mul(first, second))) continue;
      const [x, y] = offAxisPoint(rng, difficulty > 1 ? 3 : 2);
      const [p, q] = rng.sample(LETTERS, 2);
      return { first, second, names: [p, q], x, y, phrase: rng.int(0, 2) };
    }
    return { first: [0, -1, 1, 0], second: [1, 0, 0, -1], names: ['A', 'B'], x: 2, y: 1, phrase: 0 };
  },
  render: ({ first, second, names, x, y, phrase }) => {
    const [f, s] = names;
    const [px, py] = apply(first, x, y);
    const [qx, qy] = apply(second, px, py);
    const wrong = apply(first, ...apply(second, x, y));
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${thenSentence(f, s, phrase)} Follow the point $P(${x}, ${y})$: give $P'$, where $${bold(f)}$ sends it, and then $P''$, where $${bold(s)}$ sends $P'$.`,
        },
        ...namedDisplays([
          [f, first],
          [s, second],
        ]),
      ],
      // No brackets round the pairs: the two pairs do not fit on one line at
      // phone width, and a bracket would be left stranded on the wrong one.
      template: `P': \\; {0}, \\; {1} \\qquad P'': \\; {2}, \\; {3}`,
      bank: bankOf([px, py, qx, qy].map(String), [...wrong, ...apply(second, x, y)].map(String)),
      answer: [px, py, qx, qy].map(String),
    };
  },
  solution: ({ first, second, names, x, y }) => {
    const [f, s] = names;
    const [px, py] = apply(first, x, y);
    const [qx, qy] = apply(second, px, py);
    return [
      { text: `$${bold(f)}$ acts first, so multiply $P$ by it.` },
      { tex: `${texOf(first)} ${columnTex(x, y)} = ${columnTex(px, py)}` },
      { text: `Then $${bold(s)}$ acts on that result, not on $P$.` },
      { tex: `${texOf(second)} ${columnTex(px, py)} = ${columnTex(qx, qy)}` },
      {
        text: `So $P'' = ${pairTex(qx, qy)}$. The single matrix $${bold(s + f)}$, with the first one on the right, sends $P$ straight there: $${bold(s + f)} = ${texOf(mul(second, first))}$.`,
      },
    ];
  },
};

/** The transformations a composition may start with: named ones, and shears. */
const FIRST_MOVES: Matrix[] = COMPOSABLE.map(matrixOf);
const FIRST_MOVES_WIDE: Matrix[] = [...FIRST_MOVES, ...SHEARS];

interface ComposeSlideParams {
  first: Matrix;
  second: Standard;
  phrase: number;
  basis: 'i' | 'j';
  axis: 'x' | 'y';
}

/**
 * Where i or j ends up after two transformations, found on the picture.
 *
 * The figure shows the unit square after the first one, arrows and all; the
 * second is named in words, with its mirror line drawn when it is a
 * reflection. So the learner applies the second to the arrow tip in front of
 * them, which is the composition done the way it happens: first, then second.
 *
 * Only a non-zero coordinate is asked, since the handle rests at zero.
 */
const composeSlide: Generator<ComposeSlideParams> = {
  id: 'mat-compose-slide',
  sample: (rng, difficulty) => {
    const first = rng.pick(difficulty > 1 ? FIRST_MOVES_WIDE : FIRST_MOVES);
    const second = rng.pick(STANDARD_KEYS);
    const basis = rng.pick(['i', 'j'] as const);
    const final = mul(STANDARD[second].matrix, first);
    const tip = basis === 'i' ? [final[0], final[2]] : [final[1], final[3]];
    const axis = rng.pick((['x', 'y'] as const).filter((_, k) => tip[k] !== 0));
    return { first, second, phrase: rng.int(0, STANDARD[second].phrases.length - 1), basis, axis };
  },
  render: ({ first, second, phrase, basis, axis }): Slide => {
    const final = mul(STANDARD[second].matrix, first);
    const tip = basis === 'i' ? [final[0], final[2]] : [final[1], final[3]];
    const span = spanFor(...first, first[0] + first[1], first[2] + first[3], ...final);
    const mirror = STANDARD[second].mirror;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The shaded shape is the unit square after a first transformation, and the arrows show where $\\mathbf{i}$ and $\\mathbf{j}$ are now. Next comes ${STANDARD[second].phrases[phrase]}${mirror ? ', whose mirror line is dashed' : ''}. Slide to the $${axis}$-coordinate of where $\\mathbf{${basis}}$ finally lands.`,
        },
      ],
      min: -(span - 1),
      max: span - 1,
      step: 1,
      answer: axis === 'x' ? tip[0] : tip[1],
      readout: `${axis}\\text{-coordinate of } \\mathbf{${basis}} = {v}`,
      figure: {
        svg: transformGridSvg({
          span,
          image: first,
          square: true,
          arrows: [
            { x: first[0], y: first[2], label: 'i', accent: true },
            { x: first[1], y: first[3], label: 'j' },
          ],
          mirror,
          label: 'The unit square after the first transformation, with arrows showing where i and j are now',
        }),
        xMin: -span,
        xMax: span,
        axis,
      },
    };
  },
  solution: ({ first, second, phrase, basis, axis }) => {
    const m = STANDARD[second].matrix;
    const now = basis === 'i' ? [first[0], first[2]] : [first[1], first[3]];
    const final = mul(m, first);
    const tip = basis === 'i' ? [final[0], final[2]] : [final[1], final[3]];
    return [
      { text: `After the first transformation the $\\mathbf{${basis}}$ arrow ends at $${pairTex(now[0], now[1])}$. Read it off the picture.` },
      { text: `The second transformation is ${STANDARD[second].phrases[phrase]}, with matrix $${texOf(m)}$. Apply it to that tip.` },
      { tex: `${texOf(m)} ${columnTex(now[0], now[1])} = ${columnTex(tip[0], tip[1])}` },
      { text: `So $\\mathbf{${basis}}$ finally lands at $${pairTex(tip[0], tip[1])}$, and its $${axis}$-coordinate is $${axis === 'x' ? tip[0] : tip[1]}$.` },
      { text: 'The whole journey is one matrix, the second times the first, and its columns are where $\\mathbf{i}$ and $\\mathbf{j}$ end up:' },
      { tex: `${texOf(m)} ${texOf(first)}` },
      { tex: `= ${texOf(final)}` },
    ];
  },
};

interface ComposeOrderParams {
  /** The letters in the order their transformations happen. */
  applied: string[];
  phrase: number;
}

/**
 * Which product is "this, then that" — the convention on its own, no entries.
 *
 * Three steps at difficulty 2, where writing the letters as read is wrong in a
 * way that is easier to see: the whole word has to be reversed, not just its
 * ends swapped.
 */
const composeOrder: Generator<ComposeOrderParams> = {
  id: 'mat-compose-order',
  sample: (rng, difficulty) => ({
    applied: rng.sample(LETTERS, difficulty > 1 && rng.chance(0.5) ? 3 : 2),
    phrase: rng.int(0, 2),
  }),
  render: ({ applied, phrase }): Slide => {
    const [p, q, r] = applied;
    const sentence =
      r === undefined
        ? [
            `$${bold(p)}$ is applied first, then $${bold(q)}$.`,
            `$${bold(q)}$ is applied after $${bold(p)}$.`,
            `A shape is transformed by $${bold(p)}$, followed by $${bold(q)}$.`,
          ][phrase]
        : [
            `$${bold(p)}$ is applied first, then $${bold(q)}$, then $${bold(r)}$.`,
            `A shape is transformed by $${bold(p)}$, $${bold(q)}$ and $${bold(r)}$, in that order.`,
            `$${bold(r)}$ is applied after $${bold(q)}$, which is applied after $${bold(p)}$.`,
          ][phrase];
    const offered =
      r === undefined
        ? [
            { id: 'right', label: bold(q + p), tex: true },
            { id: 'read', label: bold(p + q), tex: true },
            { id: 'sum', label: `${bold(p)} + ${bold(q)}`, tex: true },
            { id: 'either', label: `\\text{either, as } ${bold(p + q)} = ${bold(q + p)}`, tex: true },
          ]
        : [
            { id: 'right', label: bold(r + q + p), tex: true },
            { id: 'read', label: bold(p + q + r), tex: true },
            { id: 'ends', label: bold(r + p + q), tex: true },
            { id: 'middle', label: bold(q + r + p), tex: true },
          ];
    const question = `${sentence} Which single matrix does all of it?`;
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: question }],
      options: turned(offered, question),
      correctId: 'right',
    };
  },
  solution: ({ applied }) => {
    const word = [...applied].reverse().join('');
    return [
      {
        text: 'A matrix acts on the point to its right, so the one applied first has to be nearest the point: on the far right.',
      },
      { tex: `${bold(word)}\\,\\mathbf{v}` },
      {
        text: `Reading that from the point outwards gives ${applied.map((letter) => `$${bold(letter)}$`).join(', then ')}, which is the order they happen in. So the product is $${bold(word)}$, the letters of the story reversed.`,
      },
      {
        text: `Writing them in the order they happen, $${bold(applied.join(''))}$, describes the steps the other way round, and matrix products usually change when the order does.`,
      },
    ];
  },
};

/* ----- order matters ----- */

const SAME = '\\text{same}';
const DIFFERENT = '\\text{different}';

interface CommuteTreeParams {
  a: Matrix;
  b: Matrix;
}

/**
 * Both products of a pair, and whether they agree.
 *
 * Half the draws commute and half do not, so the bottom of the tree cannot be
 * guessed from the lesson's title. Difficulty 2 lets a shear in, which has no
 * name to reason from and has to be multiplied out.
 */
const commuteTree: Generator<CommuteTreeParams> = {
  id: 'mat-commute-tree',
  sample: (rng, difficulty) => {
    const pairs = difficulty > 1 ? SHOWN_PAIRS : MOVE_PAIRS;
    const [p, q] = rng.pick(rng.chance(0.5) ? pairs.agree : pairs.clash);
    return rng.chance(0.5) ? { a: p, b: q } : { a: q, b: p };
  },
  render: ({ a, b }): Slide => {
    const ab = mul(a, b);
    const ba = mul(b, a);
    const agree = sameMatrix(ab, ba);
    const answer = [texOf(ab), texOf(ba), agree ? SAME : DIFFERENT];
    const extras = [
      agree ? DIFFERENT : SAME,
      texOf(entrywise(a, b)),
      texOf(negated(ab)),
      texOf([a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]]),
    ].filter((token, idx, all) => !answer.includes(token) && all.indexOf(token) === idx);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Work out $\\mathbf{AB}$ and $\\mathbf{BA}$ on the top row, then say underneath whether the order made a difference.',
        },
        ...namedDisplays([
          ['A', a],
          ['B', b],
        ]),
      ],
      expression: '\\mathbf{AB} \\overset{?}{=} \\mathbf{BA}',
      nodes: [
        { id: 'ab', from: [] },
        { id: 'ba', from: [] },
        { id: 'same', from: ['ab', 'ba'] },
      ],
      bank: [...answer, ...extras.slice(0, 3)].sort(),
      answer,
    };
  },
  solution: ({ a, b }) => {
    const ab = mul(a, b);
    const ba = mul(b, a);
    const agree = sameMatrix(ab, ba);
    return [
      { text: '$\\mathbf{AB}$ is $\\mathbf{B}$ first, then $\\mathbf{A}$. $\\mathbf{BA}$ is the other way round.' },
      { tex: `\\mathbf{AB} = ${texOf(ab)}` },
      { tex: `\\mathbf{BA} = ${texOf(ba)}` },
      {
        text: agree
          ? 'They are the same, so for this pair the order does not matter. That is the exception: two rotations, an enlargement with anything, and two stretches along the axes are the usual pairs that agree.'
          : 'They are different, so doing these two transformations in the other order moves points somewhere else. That is the normal state of affairs for matrices.',
      },
    ];
  },
};

interface OrderPointParams {
  a: Transform;
  b: Transform;
  pa: number;
  pb: number;
  x: number;
  y: number;
}

/** One point under both orders of the same two transformations. */
const orderPoint: Generator<OrderPointParams> = {
  id: 'mat-order-point',
  sample: (rng, difficulty) => {
    const pool = difficulty > 1 ? COMPOSABLE : STANDARDS;
    const [a, b] = rng.sample(pool, 2);
    const scaled = a.kind !== 'standard' || b.kind !== 'standard';
    const [x, y] = offAxisPoint(rng, scaled ? 2 : 4);
    return { a, b, pa: rng.int(0, phraseCount(a) - 1), pb: rng.int(0, phraseCount(b) - 1), x, y };
  },
  render: ({ a, b, pa, pb, x, y }) => {
    const [ma, mb] = [matrixOf(a), matrixOf(b)];
    const ab = apply(mul(ma, mb), x, y);
    const ba = apply(mul(mb, ma), x, y);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$\\mathbf{A}$ is ${phraseOf(a, pa)}, and $\\mathbf{B}$ is ${phraseOf(b, pb)}. Where does $P(${x}, ${y})$ go under $\\mathbf{AB}$, and where under $\\mathbf{BA}$?`,
        },
      ],
      template: `\\mathbf{AB}: \\; {0}, \\; {1} \\qquad \\mathbf{BA}: \\; {2}, \\; {3}`,
      bank: bankOf([...ab, ...ba].map(String), [...apply(ma, x, y), ...apply(mb, x, y)].map(String)),
      answer: [...ab, ...ba].map(String),
    };
  },
  solution: ({ a, b, pa, pb, x, y }) => {
    const [ma, mb] = [matrixOf(a), matrixOf(b)];
    const ab = apply(mul(ma, mb), x, y);
    const ba = apply(mul(mb, ma), x, y);
    const viaB = apply(mb, x, y);
    const viaA = apply(ma, x, y);
    return [
      { text: `Write down both matrices: $\\mathbf{A} = ${texOf(ma)}$ for ${phraseOf(a, pa)}, and $\\mathbf{B} = ${texOf(mb)}$ for ${phraseOf(b, pb)}.` },
      { text: '$\\mathbf{AB}$ does $\\mathbf{B}$ first, so multiply by $\\mathbf{B}$ and then by $\\mathbf{A}$.' },
      { tex: `(${x}, ${y}) \\to (${viaB[0]}, ${viaB[1]}) \\to (${ab[0]}, ${ab[1]})` },
      { text: '$\\mathbf{BA}$ does $\\mathbf{A}$ first.' },
      { tex: `(${x}, ${y}) \\to (${viaA[0]}, ${viaA[1]}) \\to (${ba[0]}, ${ba[1]})` },
      {
        text:
          ab[0] === ba[0] && ab[1] === ba[1]
            ? 'The two routes arrive at the same place, so this pair can be done in either order.'
            : 'The two routes arrive at different places: the order changed the answer.',
      },
    ];
  },
};

interface CommuteWhichParams {
  /** True asks for the pair that agrees, false for the pair that does not. */
  askSame: boolean;
  right: [Transform, Transform];
  wrong: [Transform, Transform][];
}

/** A pair of transformations as a choice label reads it. */
const pairName = ([p, q]: [Transform, Transform]) => `${nameOf(p)}, and ${lowerFirst(nameOf(q))}`;

/**
 * Which pair can be done in either order — or which cannot.
 *
 * No numbers to multiply, so it asks for the reasoning the lesson teaches:
 * turns combine with turns, an enlargement combines with anything, and a
 * reflection usually cares what came before it.
 */
const commuteWhich: Generator<CommuteWhichParams> = {
  id: 'mat-commute-which',
  sample: (rng) => {
    const askSame = rng.chance(0.5);
    const [yes, no] = askSame ? [NAMED_PAIRS.agree, NAMED_PAIRS.clash] : [NAMED_PAIRS.clash, NAMED_PAIRS.agree];
    return { askSame, right: rng.pick(yes), wrong: rng.sample(no, 3) };
  },
  render: ({ askSame, right, wrong }): Slide => ({
    kind: 'choice',
    prompt: [
      {
        kind: 'prose',
        text: askSame
          ? 'Which pair of transformations gives the same result whichever one is done first?'
          : 'Which pair of transformations gives a different result depending on which one is done first?',
      },
    ],
    options: turned(
      [
        { id: 'right', label: pairName(right), tex: false },
        ...wrong.map((pair, idx) => ({ id: `other${idx}`, label: pairName(pair), tex: false })),
      ],
      `${askSame}`,
    ),
    correctId: 'right',
  }),
  solution: ({ askSame, right }) => {
    const [p, q] = right.map(matrixOf);
    return [
      { text: 'Multiply the two matrices both ways round and compare.' },
      { tex: `${texOf(p)} ${texOf(q)}` },
      { tex: `= ${texOf(mul(p, q))}` },
      { text: 'The other way round:' },
      { tex: `${texOf(q)} ${texOf(p)}` },
      { tex: `= ${texOf(mul(q, p))}` },
      {
        text: askSame
          ? 'For this pair the two products agree. Turns about the same point combine the same way in either order, an enlargement about $O$ commutes with everything, and so does a half turn.'
          : 'For this pair the two products differ. A reflection is the usual culprit: it reverses the sense of a turn, so which comes first changes where things end up.',
      },
    ];
  },
};

/* ----- composing the standard matrices ----- */

interface ComposeStandardParams {
  first: Transform;
  second: Transform;
  pf: number;
  ps: number;
}

/** The single matrix for two named transformations in turn. */
const composeStandard: Generator<ComposeStandardParams> = {
  id: 'mat-compose-standard',
  choices: ({ first, second }) => {
    const [f, s] = [matrixOf(first), matrixOf(second)];
    const product = mul(s, f);
    return options(
      { tex: texOf(product) },
      // The wrong way round, every sign flipped, one step forgotten, and the
      // product read by rows. Seven of the standard pairs commute, so the
      // spares keep four options on the slide when the first slip is no slip.
      { tex: texOf(mul(f, s)) },
      { tex: texOf(negated(product)) },
      { tex: texOf(f) },
      { tex: texOf(s) },
      { tex: texOf([product[0], product[2], product[1], product[3]]) },
    ).slice(0, 4);
  },
  sample: (rng, difficulty) => {
    const pool = difficulty > 1 ? COMPOSABLE : STANDARDS;
    const first = rng.pick(pool);
    const second = rng.pick(pool);
    return { first, second, pf: rng.int(0, phraseCount(first) - 1), ps: rng.int(0, phraseCount(second) - 1) };
  },
  render: ({ first, second, pf, ps }) => {
    const [f, s] = [matrixOf(first), matrixOf(second)];
    const answer = mul(s, f);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Find the single matrix for ${phraseOf(first, pf)}, followed by ${phraseOf(second, ps)}.`,
        },
      ],
      template: MATRIX_TEMPLATE,
      bank: bankOf(answer.map(String), [...mul(f, s), ...negated(answer)].map(String)),
      answer: answer.map(String),
    };
  },
  solution: ({ first, second, pf, ps }) => {
    const [f, s] = [matrixOf(first), matrixOf(second)];
    const answer = mul(s, f);
    const named = standardKeyOf(answer);
    return [
      { text: `Write down each matrix from where $\\mathbf{i}$ and $\\mathbf{j}$ go: $${texOf(f)}$ for ${phraseOf(first, pf)}, and $${texOf(s)}$ for ${phraseOf(second, ps)}.` },
      { text: 'The first one goes on the right.' },
      { tex: `${texOf(s)} ${texOf(f)}` },
      { tex: `= ${texOf(answer)}` },
      {
        text: sameMatrix(answer, [1, 0, 0, 1])
          ? 'That is the identity: the second transformation undoes the first, and every point ends where it started.'
          : named
            ? `Its columns say where $\\mathbf{i}$ and $\\mathbf{j}$ end up, and they are the columns of one of the standard matrices: the pair together is a single ${lowerFirst(STANDARD[named].name)}.`
            : 'Its columns say where $\\mathbf{i}$ and $\\mathbf{j}$ end up after both steps, which is a quick check on the multiplication.',
      },
    ];
  },
};

interface ComposeNameParams {
  first: Standard;
  second: Standard;
  pf: number;
  ps: number;
}

/**
 * Naming the single transformation two standard ones make together.
 *
 * The figure is the product's image of the unit square, so there are two
 * routes to the name: multiply the matrices, or read the arrows. Pairs that
 * cancel to the identity are left out; there is nothing to name.
 */
const composeName: Generator<ComposeNameParams> = {
  id: 'mat-compose-name',
  sample: (rng) => {
    for (let tries = 0; tries < 40; tries += 1) {
      const first = rng.pick(STANDARD_KEYS);
      const second = rng.pick(STANDARD_KEYS);
      if (!standardKeyOf(mul(STANDARD[second].matrix, STANDARD[first].matrix))) continue;
      return {
        first,
        second,
        pf: rng.int(0, STANDARD[first].phrases.length - 1),
        ps: rng.int(0, STANDARD[second].phrases.length - 1),
      };
    }
    return { first: 'refl-x', second: 'refl-y', pf: 0, ps: 0 };
  },
  render: ({ first, second, pf, ps }): Slide => {
    const product = mul(STANDARD[second].matrix, STANDARD[first].matrix);
    const key = standardKeyOf(product) as Standard;
    const backwards = standardKeyOf(mul(STANDARD[first].matrix, STANDARD[second].matrix));
    const others = [backwards, ...CONFUSED_WITH[key], first, second].filter(
      (other, idx, all): other is Standard => other !== undefined && other !== key && all.indexOf(other) === idx,
    );
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${upperFirst(STANDARD[first].phrases[pf])}, followed by ${STANDARD[second].phrases[ps]}, is a single transformation. The figure shows the dashed unit square and its image after both. Which transformation is it?`,
        },
        {
          kind: 'diagram',
          svg: transformGridSvg({
            span: 2,
            image: product,
            square: true,
            arrows: [
              { x: product[0], y: product[2], label: 'i', accent: true },
              { x: product[1], y: product[3], label: 'j' },
            ],
            maxWidth: 220,
            label: 'The unit square and its image after both transformations, with the images of i and j drawn as arrows',
          }),
        },
      ],
      options: turned(
        [
          { id: 'right', label: STANDARD[key].name, tex: false },
          ...others.slice(0, 3).map((other) => ({ id: other, label: STANDARD[other].name, tex: false })),
        ],
        `${first} ${second} ${pf} ${ps}`,
      ),
      correctId: 'right',
    };
  },
  solution: ({ first, second }) => {
    const [f, s] = [STANDARD[first].matrix, STANDARD[second].matrix];
    const product = mul(s, f);
    const key = standardKeyOf(product) as Standard;
    return [
      { text: 'Multiply, with the first transformation on the right.' },
      { tex: `${texOf(s)} ${texOf(f)}` },
      { tex: `= ${texOf(product)}` },
      { tex: columnsLine(product) },
      {
        text: `Those are the columns of the ${lowerFirst(STANDARD[key].name)}, which the picture confirms: follow the $\\mathbf{i}$ arrow and see where it has gone.`,
      },
      {
        text: `A useful check without multiplying: two reflections make a rotation, and a rotation with a reflection makes a reflection.`,
      },
    ];
  },
};

/** Mirror lines through the origin, by their angle to the positive x-axis. */
const MIRROR_ANGLES_AXES = [0, 45, 90, 135];
const MIRROR_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150];

function mirrorPhrase(angle: number): string {
  switch (angle) {
    case 0:
      return 'the $x$-axis';
    case 90:
      return 'the $y$-axis';
    case 45:
      return 'the line $y = x$';
    case 135:
      return 'the line $y = -x$';
    default:
      return `the line through $O$ at $${angle}^\\circ$ to the positive $x$-axis`;
  }
}

/** An angle in degrees, turned into the range 0 to 360. */
const turnOf = (degrees: number) => ((degrees % 360) + 360) % 360;

interface ReflectPairParams {
  /** The first mirror's angle, then the second's. */
  from: number;
  to: number;
  phrase: number;
}

/**
 * Two reflections make a rotation: through twice the angle from the first
 * mirror to the second.
 *
 * Difficulty 1 keeps to the four mirrors with standard matrices, so the answer
 * can be checked by multiplying; difficulty 2 adds lines at 30 and 60 degrees
 * to the axes, where the rule is the only practical route.
 */
const reflectPair: Generator<ReflectPairParams> = {
  id: 'mat-reflect-pair',
  choices: ({ from, to, phrase }) => {
    const angle = turnOf(2 * (to - from));
    // The wrong order and the forgotten doubling always, then near misses
    // chosen by the wording. At difficulty 1 every answer is a multiple of 90,
    // and a fixed list offered so few label sets that the rotation choiceVariant
    // hashes from them put the answer in the same two slots every time.
    const near = [turnOf(angle + 90), turnOf(angle + 180), turnOf(angle - 90), turnOf(from - to)];
    const slips = [
      360 - angle,
      turnOf(to - from),
      ...near.slice(phrase),
      ...near.slice(0, phrase),
    ].filter(
      (value, idx, all) => value !== angle && value !== 0 && all.indexOf(value) === idx,
    );
    return aimedOptions(
      { tex: `${angle}^\\circ`, answer: `${angle}` },
      slips.map((value) => ({ tex: `${value}^\\circ`, answer: `${value}` })),
      from / 15 + to / 15 + phrase,
    );
  },
  sample: (rng, difficulty) => {
    const [from, to] = rng.sample(difficulty > 1 ? MIRROR_ANGLES : MIRROR_ANGLES_AXES, 2);
    return { from, to, phrase: rng.int(0, 2) };
  },
  render: ({ from, to, phrase }) => {
    const [first, second] = [mirrorPhrase(from), mirrorPhrase(to)];
    const sentence = [
      `A shape is reflected in ${first}, and then in ${second}.`,
      `Reflection in ${second} is applied after reflection in ${first}.`,
      `The plane is reflected in ${first}, followed by ${second}.`,
    ][phrase];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${sentence} Together they make a single rotation about $O$. Through what angle, anticlockwise? Give it in degrees, between $0$ and $360$.`,
        },
      ],
      lead: '\\text{angle} =',
      keypad: [],
      answer: `${turnOf(2 * (to - from))}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ from, to }) => {
    const raw = 2 * (to - from);
    const angle = turnOf(raw);
    return [
      {
        text: 'Two reflections in lines through $O$ make a rotation about $O$, through twice the angle from the first mirror to the second.',
      },
      { text: `The first mirror is at $${from}^\\circ$ to the $x$-axis and the second at $${to}^\\circ$.` },
      { tex: `2 \\times \\left(${to}^\\circ - ${from}^\\circ\\right) = ${raw}^\\circ` },
      raw === angle
        ? { text: `So the rotation is $${angle}^\\circ$ anticlockwise.` }
        : { text: `Turned into the range $0^\\circ$ to $360^\\circ$, that is $${angle}^\\circ$ anticlockwise.` },
      {
        text: `The order matters: reflecting in the other order turns the other way, by $${turnOf(-raw)}^\\circ$ anticlockwise. Forgetting to double gives $${turnOf(to - from)}^\\circ$.`,
      },
    ];
  },
};

interface ComposeLocateParams {
  first: Standard;
  second: Standard;
  pf: number;
  ps: number;
  x: number;
  y: number;
  axis: 'x' | 'y';
}

/**
 * A point given two standard transformations in turn, placed on the grid.
 *
 * The first mirror is drawn when there is one, so the first step can be
 * pictured; the second has to be carried out in the head or by multiplying,
 * which is the composition.
 */
const composeLocate: Generator<ComposeLocateParams> = {
  id: 'mat-compose-locate',
  sample: (rng, difficulty) => {
    const first = rng.pick(STANDARD_KEYS);
    const second = rng.pick(STANDARD_KEYS.filter((key) => key !== first));
    const [x, y] = offAxisPoint(rng, difficulty > 1 ? 4 : 3);
    return {
      first,
      second,
      pf: rng.int(0, STANDARD[first].phrases.length - 1),
      ps: rng.int(0, STANDARD[second].phrases.length - 1),
      x,
      y,
      axis: rng.pick(['x', 'y'] as const),
    };
  },
  render: ({ first, second, pf, ps, x, y, axis }): Slide => {
    const [fx, fy] = apply(mul(STANDARD[second].matrix, STANDARD[first].matrix), x, y);
    const span = spanFor(x, y, fx, fy);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `$P(${x}, ${y})$ is given ${STANDARD[first].phrases[pf]}, followed by ${STANDARD[second].phrases[ps]}. Slide to the $${axis}$-coordinate of where it ends up.`,
        },
      ],
      min: -(span - 1),
      max: span - 1,
      step: 1,
      answer: axis === 'x' ? fx : fy,
      readout: `${axis}\\text{-coordinate of } P'' = {v}`,
      figure: {
        svg: transformGridSvg({
          span,
          marks: [{ x, y, label: 'P' }],
          mirror: STANDARD[first].mirror,
          label: 'The point P on a grid',
        }),
        xMin: -span,
        xMax: span,
        axis,
      },
    };
  },
  solution: ({ first, second, pf, ps, x, y, axis }) => {
    const [f, s] = [STANDARD[first].matrix, STANDARD[second].matrix];
    const [mx, my] = apply(f, x, y);
    const [fx, fy] = apply(s, mx, my);
    return [
      { text: `First, ${STANDARD[first].phrases[pf]}.` },
      { tex: `${texOf(f)} ${columnTex(x, y)} = ${columnTex(mx, my)}` },
      { text: `Then ${STANDARD[second].phrases[ps]}, applied to that point.` },
      { tex: `${texOf(s)} ${columnTex(mx, my)} = ${columnTex(fx, fy)}` },
      { text: `So the point ends at $${pairTex(fx, fy)}$, and its $${axis}$-coordinate is $${axis === 'x' ? fx : fy}$.` },
      { text: `In one step, the single matrix is $${texOf(mul(s, f))}$, the second times the first.` },
    ];
  },
};

/* ----- undoing a transformation ----- */

/** An entry that is a whole number or a unit fraction, as TeX. */
function entryTex(value: number): string {
  if (Number.isInteger(value)) return `${value === 0 ? 0 : value}`;
  return `${value < 0 ? '-' : ''}\\frac{1}{${Math.round(1 / Math.abs(value))}}`;
}

const entriesTex = (m: readonly number[]) =>
  `\\begin{pmatrix} ${entryTex(m[0])} & ${entryTex(m[1])} \\\\ ${entryTex(m[2])} & ${entryTex(m[3])} \\end{pmatrix}`;

/** The transformation that undoes a named one, still as a matrix. */
function undoMatrix(t: Transform): [number, number, number, number] {
  switch (t.kind) {
    case 'standard': {
      const [a, b, c, d] = STANDARD[t.key].matrix;
      // Every one of the seven has determinant 1 or -1, and is undone by its transpose.
      return [a, c, b, d];
    }
    case 'enlarge':
      return [1 / t.k, 0, 0, 1 / t.k];
    case 'stretch-x':
      return [1 / t.k, 0, 0, 1];
    case 'stretch-y':
      return [1, 0, 0, 1 / t.k];
    case 'stretch-xy':
      return [1 / t.k, 0, 0, 1 / t.q];
  }
}

/** The undoing transformation in words. */
function undoWords(t: Transform): string {
  switch (t.kind) {
    case 'standard':
      if (t.key === 'rot90' || t.key === 'rot270') return 'the same quarter turn the other way';
      if (t.key === 'rot180') return 'another half turn';
      return 'the same reflection again: reflecting twice puts everything back';
    case 'enlarge':
      return `an enlargement of scale factor $\\frac{1}{${t.k}}$`;
    case 'stretch-x':
    case 'stretch-y':
      return `a stretch in the same direction with scale factor $\\frac{1}{${t.k}}$`;
    case 'stretch-xy':
      return 'stretches by the reciprocal factors';
  }
}

interface UndoMatrixParams {
  t: Transform;
  phrase: number;
}

/**
 * The inverse of a named transformation, written down without the formula.
 *
 * The point is that it can be: a rotation is undone by turning back, a
 * reflection by itself, a scaling by the reciprocal factor.
 */
const undoMatrixGen: Generator<UndoMatrixParams> = {
  id: 'mat-undo-matrix',
  choices: ({ t, phrase }) => {
    const inv = undoMatrix(t);
    const m = matrixOf(t);
    const wrong: (readonly number[])[] =
      t.kind === 'standard'
        ? [m, negated(m), ...CONFUSED_WITH[t.key].map((other) => [...STANDARD[other].matrix])]
        : [m, inv.map((v) => -v), [inv[3], 0, 0, inv[0]], [1, 0, 0, 1]];
    const target = t.kind === 'standard' ? STANDARD_KEYS.indexOf(t.key) + phrase : Math.abs(inv[0] * 60) + phrase + t.kind.length;
    return aimedOptions(
      { tex: entriesTex(inv) },
      options({ tex: entriesTex(inv) }, ...wrong.map((w) => ({ tex: entriesTex(w) }))).slice(1),
      Math.round(target),
    );
  },
  sample: (rng, difficulty) => {
    const pool: Transform[] = [
      ...STANDARDS,
      ...[2, 3, 4, 5].map((k): Transform => ({ kind: 'enlarge', k })),
      ...[2, 3, 4].flatMap((k): Transform[] => [
        { kind: 'stretch-x', k },
        { kind: 'stretch-y', k },
      ]),
      ...(difficulty > 1 ? [-2, -3, -4].map((k): Transform => ({ kind: 'enlarge', k })) : []),
    ];
    const t = rng.pick(pool);
    return { t, phrase: rng.int(0, phraseCount(t) - 1) };
  },
  render: ({ t, phrase }) => {
    const answer = undoMatrix(t).map(entryTex);
    const m = matrixOf(t);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Without using the inverse formula, write down the matrix that undoes ${phraseOf(t, phrase)}.`,
        },
      ],
      template: MATRIX_TEMPLATE,
      bank: bankOf(answer, [...m.map(entryTex), ...undoMatrix(t).map((v) => entryTex(-v))]),
      answer,
    };
  },
  solution: ({ t, phrase }) => {
    const inv = undoMatrix(t);
    return [
      { text: `To undo ${phraseOf(t, phrase)}, do ${undoWords(t)}.` },
      { text: 'Write that down from where $\\mathbf{i}$ and $\\mathbf{j}$ go, as for any transformation.' },
      { tex: `${texOf(matrixOf(t))}^{-1} = ${entriesTex(inv)}` },
      {
        text: 'Check by multiplying the two together: undoing a transformation leaves every point where it was, so the product is the identity, $\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}$.',
      },
    ];
  },
};

interface InverseOrderParams {
  /** The letters as the product is written. */
  letters: string[];
  phrase: number;
}

/** The inverse of a product: the inverses, in the reverse order. */
const inverseOrder: Generator<InverseOrderParams> = {
  id: 'mat-inverse-order',
  choices: ({ letters }) => {
    const reversed = [...letters].reverse();
    return options(
      { tex: reversed.map(inverseOfLetter).join('') },
      { tex: letters.map(inverseOfLetter).join('') },
      { tex: bold(reversed.join('')) },
      // One step undone and the rest forgotten. Its letters are not the same
      // as the other options', which is what keeps the rotation choiceVariant
      // hashes from the labels off a single slot: with every option a
      // rearrangement of the same letters it put the answer third every time.
      { tex: inverseOfLetter(letters[0]) },
    );
  },
  sample: (rng, difficulty) => ({
    letters: rng.sample(LETTERS, difficulty > 1 && rng.chance(0.5) ? 3 : 2),
    phrase: rng.int(0, 2),
  }),
  render: ({ letters, phrase }) => {
    const word = letters.join('');
    const answer = [...letters].reverse().map(inverseOfLetter);
    const sentence = [
      `$${bold(word)}$ applies $${bold(letters[letters.length - 1])}$ first. Which product of inverses undoes it?`,
      `Every matrix in $${bold(word)}$ has an inverse. Write $(${bold(word)})^{-1}$ in terms of those inverses.`,
      `A shape is transformed by $${bold(word)}$. Which product of inverses brings it back?`,
    ][phrase];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: sentence }],
      template: `(${bold(word)})^{-1} = ${answer.map((_, idx) => `{${idx}}`).join(' ')}`,
      bank: [...answer, ...letters.map(bold)].sort(),
      answer,
    };
  },
  solution: ({ letters }) => {
    const word = letters.join('');
    const reversed = [...letters].reverse();
    return [
      {
        text: `$${bold(word)}$ does ${reversed.map((letter) => `$${bold(letter)}$`).join(', then ')}. To undo it, undo the last step first, like taking off shoes before socks.`,
      },
      { tex: `(${bold(word)})^{-1} = ${reversed.map(inverseOfLetter).join('')}` },
      {
        text: `Check by multiplying: the inverses meet their own matrices in the middle, and each pair cancels to the identity.`,
      },
      { tex: `${bold(word)}\\,${reversed.map(inverseOfLetter).join('')} = \\mathbf{I}` },
    ];
  },
};

/** A matrix with determinant 1 or -1, and so an inverse with whole entries. */
function sampleUnimodular(rng: Parameters<Generator<unknown>['sample']>[0], span: number): Matrix {
  for (let tries = 0; tries < 400; tries += 1) {
    const m: Matrix = [rng.int(-span, span), rng.int(-span, span), rng.int(-span, span), rng.int(-span, span)];
    if (Math.abs(detOf(m)) === 1 && m.some((v) => Math.abs(v) > 1)) return m;
  }
  return [2, 1, 1, 1];
}

/** The inverse of a matrix with determinant 1 or -1. */
function unitInverse(m: Matrix): Matrix {
  const det = detOf(m);
  return [det * m[3] + 0, -det * m[1] + 0, -det * m[2] + 0, det * m[0] + 0];
}

interface InverseTreeParams {
  a: Matrix;
  b: Matrix;
  names: [string, string];
}

/**
 * The inverse of a product, built from the inverses of its parts.
 *
 * Determinants of 1 or -1 only, so both inverses and their product have whole
 * entries, and pairs that commute are left out, so the product taken in the
 * wrong order is always a wrong tile.
 */
const inverseTree: Generator<InverseTreeParams> = {
  id: 'mat-inverse-tree',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 3 : 2;
    for (let tries = 0; tries < 60; tries += 1) {
      const a = sampleUnimodular(rng, span);
      const b = sampleUnimodular(rng, span);
      if (sameMatrix(mul(a, b), mul(b, a))) continue;
      const [p, q] = rng.sample(LETTERS, 2);
      return { a, b, names: [p, q] };
    }
    return { a: [2, 1, 1, 1], b: [1, 2, 0, 1], names: ['A', 'B'] };
  },
  render: ({ a, b, names }): Slide => {
    const [p, q] = names;
    const [ai, bi] = [unitInverse(a), unitInverse(b)];
    const answer = [texOf(bi), texOf(ai), texOf(mul(bi, ai))];
    const extras = [
      texOf(mul(ai, bi)),
      texOf([b[3], b[1], b[2], b[0]]),
      texOf(b),
      texOf(negated(mul(bi, ai))),
    ].filter((token, idx, all) => !answer.includes(token) && all.indexOf(token) === idx);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Both matrices have determinant $1$ or $-1$, so their inverses have whole entries. Fill the tree: the two inverses on the top row, in the order written, then their product.`,
        },
        ...namedDisplays([
          [p, a],
          [q, b],
        ]),
      ],
      expression: `(${bold(p + q)})^{-1} = ${inverseOfLetter(q)}${inverseOfLetter(p)}`,
      nodes: [
        { id: 'right', from: [] },
        { id: 'left', from: [] },
        { id: 'product', from: ['right', 'left'] },
      ],
      bank: [...answer, ...extras.slice(0, 3)].sort(),
      answer,
    };
  },
  solution: ({ a, b, names }) => {
    const [p, q] = names;
    const [ai, bi] = [unitInverse(a), unitInverse(b)];
    return [
      { text: 'Swap the leading diagonal, change the signs of the other two, and divide by the determinant, which here is $1$ or $-1$.' },
      { tex: `${inverseOfLetter(q)} = ${texOf(bi)}` },
      { tex: `${inverseOfLetter(p)} = ${texOf(ai)}` },
      { text: `$${bold(p + q)}$ does $${bold(q)}$ first, so undoing it starts by undoing $${bold(p)}$: the product is $${inverseOfLetter(q)}${inverseOfLetter(p)}$, with $${inverseOfLetter(p)}$ on the right.` },
      { tex: `${texOf(bi)} ${texOf(ai)}` },
      { tex: `= ${texOf(mul(bi, ai))}` },
      {
        text: `The other order gives $${texOf(mul(ai, bi))}$, which undoes $${bold(q + p)}$ instead.`,
      },
    ];
  },
};

interface UndoPointParams {
  moves: { t: Transform; phrase: number }[];
  x: number;
  y: number;
  axis: 'x' | 'y';
}

/**
 * Where a point started, from where it ended up.
 *
 * The starting point is drawn first and the image computed from it, so undoing
 * always lands on the grid even through a scaling. With two moves, the last
 * one is undone first.
 */
const undoPoint: Generator<UndoPointParams> = {
  id: 'mat-undo-point',
  sample: (rng, difficulty) => {
    const first = rng.pick(COMPOSABLE);
    const moves =
      difficulty > 1 ? [first, rng.pick(STANDARDS.filter((t) => !sameMatrix(matrixOf(t), matrixOf(first))))] : [first];
    const scaled = moves.some((t) => t.kind !== 'standard');
    const [x, y] = offAxisPoint(rng, scaled ? 2 : 4);
    return {
      moves: moves.map((t) => ({ t, phrase: rng.int(0, phraseCount(t) - 1) })),
      x,
      y,
      axis: rng.pick(['x', 'y'] as const),
    };
  },
  render: ({ moves, x, y, axis }): Slide => {
    const total = moves.reduce<Matrix>((m, move) => mul(matrixOf(move.t), m), [1, 0, 0, 1]);
    const [px, py] = apply(total, x, y);
    const span = spanFor(x, y, px, py);
    const last = moves[moves.length - 1].t;
    const story =
      moves.length === 1
        ? `The point $P$ is given ${phraseOf(moves[0].t, moves[0].phrase)}`
        : `The point $P$ is given ${phraseOf(moves[0].t, moves[0].phrase)}, followed by ${phraseOf(moves[1].t, moves[1].phrase)},`;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${story} and lands at $P'(${px}, ${py})$. Slide to the $${axis}$-coordinate of where $P$ started.`,
        },
      ],
      min: -(span - 1),
      max: span - 1,
      step: 1,
      answer: axis === 'x' ? x : y,
      readout: `${axis}\\text{-coordinate of } P = {v}`,
      figure: {
        svg: transformGridSvg({
          span,
          marks: [{ x: px, y: py, label: "P'" }],
          mirror: last.kind === 'standard' ? STANDARD[last.key].mirror : undefined,
          label: "The image P' on a grid",
        }),
        xMin: -span,
        xMax: span,
        axis,
      },
    };
  },
  solution: ({ moves, x, y, axis }) => {
    const total = moves.reduce<Matrix>((m, move) => mul(matrixOf(move.t), m), [1, 0, 0, 1]);
    const [px, py] = apply(total, x, y);
    const undo = [...moves].reverse();
    const steps = undo.map(({ t, phrase }) => `undo ${phraseOf(t, phrase)} with ${undoWords(t)}`);
    return [
      {
        text:
          moves.length === 1
            ? `Work backwards from $P'$: ${steps[0]}.`
            : `Work backwards from $P'$, last step first: ${steps[0]}; then ${steps[1]}.`,
      },
      // The undoing matrices multiply in the order they act: the last move's
      // undoing acts first, so it sits on the right.
      { tex: `${entriesTex(undo.reduce<Matrix>((m, { t }) => mul(undoMatrix(t), m), [1, 0, 0, 1]))} ${columnTex(px, py)} = ${columnTex(x, y)}` },
      { text: `So $P$ was $${pairTex(x, y)}$, and its $${axis}$-coordinate is $${axis === 'x' ? x : y}$.` },
      { text: `Check by doing the moves forwards from $${pairTex(x, y)}$: they should land on $${pairTex(px, py)}$.` },
    ];
  },
};

/* ----- area under a composition ----- */

interface ComposeDetParams {
  a: Matrix;
  b: Matrix;
  names: [string, string];
  ask: 'product' | 'reverse' | 'square';
}

/**
 * The determinant of a product, from the two determinants.
 *
 * Asked both ways round and as a square, so that "multiply the determinants"
 * is learned as the rule rather than "multiply the matrices, then find it".
 */
const composeDet: Generator<ComposeDetParams> = {
  id: 'mat-compose-det',
  choices: ({ a, b, ask }) => {
    const [da, db] = [detOf(a), ask === 'square' ? detOf(a) : detOf(b)];
    return signedChoices(da * db, [da + db, -da * db, detOf(entrywise(a, ask === 'square' ? a : b))]);
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 4 : 3;
    const [p, q] = rng.sample(LETTERS, 2);
    return {
      a: sampleTransform(rng, span, true),
      b: sampleTransform(rng, span, true),
      names: [p, q],
      ask: rng.pick(['product', 'reverse', 'square'] as const),
    };
  },
  render: ({ a, b, names, ask }) => {
    const [p, q] = names;
    const asked = ask === 'square' ? `${bold(p)}^2` : ask === 'product' ? bold(p + q) : bold(q + p);
    const answer = ask === 'square' ? detOf(a) ** 2 : detOf(a) * detOf(b);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `Find $\\det\\left(${asked}\\right)$ without multiplying the matrices together.` },
        ...(ask === 'square'
          ? [{ kind: 'display', tex: `${bold(p)} = ${texOf(a)}` } as const]
          : namedDisplays([
              [p, a],
              [q, b],
            ])),
      ],
      lead: `\\det\\left(${asked}\\right) =`,
      keypad: [],
      answer: `${answer}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, names, ask }) => {
    const [p, q] = names;
    const [da, db] = [detOf(a), detOf(b)];
    const [x0, x1, x2, x3] = a;
    return [
      { text: 'Each transformation scales area by its determinant, so doing one after the other multiplies the two factors.' },
      { tex: `\\det ${bold(p)} = \\left(${x0}\\right)\\left(${x3}\\right) - \\left(${x1}\\right)\\left(${x2}\\right)` },
      { tex: `= ${da}` },
      ask === 'square'
        ? { tex: `\\det\\left(${bold(p)}^2\\right) = \\left(${da}\\right)^2 = ${da * da}` }
        : {
            tex: `\\det ${bold(q)} = \\left(${b[0]}\\right)\\left(${b[3]}\\right) - \\left(${b[1]}\\right)\\left(${b[2]}\\right)`,
          },
      ...(ask === 'square' ? [] : [{ tex: `= ${db}` }]),
      ...(ask === 'square'
        ? []
        : [{ tex: `\\det\\left(${ask === 'product' ? bold(p + q) : bold(q + p)}\\right) = ${da} \\times \\left(${db}\\right) = ${da * db}` }]),
      {
        text: 'The order of the product does not matter here, even though the product itself usually changes: the determinants are ordinary numbers, and those commute.',
      },
    ];
  },
};

interface ComposeAreaParams {
  a: Matrix;
  b: Matrix;
  area: number;
}

/** A matrix with a positive determinant, for the area questions. */
function samplePositive(rng: Parameters<Generator<unknown>['sample']>[0], span: number): Matrix {
  for (let tries = 0; tries < 60; tries += 1) {
    const m: Matrix = [
      nonZero(rng.int(-span, span), 2),
      rng.int(-span, span),
      rng.int(-span, span),
      nonZero(rng.int(-span, span), 3),
    ];
    if (detOf(m) > 0 && detOf(m) <= 12) return m;
  }
  return [2, 1, 1, 3];
}

/**
 * The area after two transformations, one piece at a time.
 *
 * Two determinants, each waiting on its two diagonals, then their product,
 * then the original area. Positive determinants only, so the line holds the
 * area itself with no size to take at the end.
 */
const composeArea: Generator<ComposeAreaParams> = {
  id: 'mat-compose-area',
  choices: ({ a, b, area }) => {
    const [da, db] = [detOf(a), detOf(b)];
    return signedChoices(da * db * area, [(da + db) * area, da * db, da * area + db]);
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 4 : 3;
    return { a: samplePositive(rng, span), b: samplePositive(rng, span), area: rng.int(2, difficulty > 1 ? 6 : 4) };
  },
  render: ({ a, b, area }): Slide => {
    const [da, db] = [detOf(a), detOf(b)];
    const det = (m: Matrix) => bin('-', bin('*', num(m[0]), num(m[3])), bin('*', num(m[1]), num(m[2])));
    const diagonals = (m: Matrix, path: string) => ({
      [`${path}.l`]: signedOffer(m[0] * m[3], m[0] + m[3], -m[0] * m[3], Math.abs(m[0] * m[3]) + 1),
      [`${path}.r`]: signedOffer(m[1] * m[2], m[1] + m[2], -m[1] * m[2], Math.abs(m[1] * m[2]) + 1),
      [path]: signedOffer(detOf(m), m[0] * m[3] + m[1] * m[2], -detOf(m), m[1] * m[2] - m[0] * m[3]),
    });
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `A shape of area $${area}$ is transformed by $\\mathbf{A}$ and then by $\\mathbf{B}$, both with positive determinants. Its final area is $\\det\\mathbf{A} \\times \\det\\mathbf{B} \\times ${area}$. Tap the part you would work out **next**, then choose what it comes to.`,
        },
        ...namedDisplays([
          ['A', a],
          ['B', b],
        ]),
      ],
      expr: bin('*', bin('*', det(a), det(b)), num(area)),
      banks: {
        ...diagonals(a, 'r.l.l'),
        ...diagonals(b, 'r.l.r'),
        'r.l': signedOffer(da * db, da + db, da * db + 1, -da * db),
        r: signedOffer(da * db * area, (da + db) * area, da * db + area, da * area),
      },
    };
  },
  solution: ({ a, b, area }) => {
    const [da, db] = [detOf(a), detOf(b)];
    return [
      { text: 'Each determinant needs its two diagonals first; the two determinants can be done in either order.' },
      { tex: `\\det\\mathbf{A} = ${a[0] * a[3]} - \\left(${a[1] * a[2]}\\right) = ${da}` },
      { tex: `\\det\\mathbf{B} = ${b[0] * b[3]} - \\left(${b[1] * b[2]}\\right) = ${db}` },
      { tex: `${da} \\times ${db} \\times ${area} = ${da * db * area}` },
      {
        text: `Together the two transformations scale area by $${da * db}$, which is $\\det\\left(\\mathbf{BA}\\right)$. Adding the determinants instead, $${da + db}$, is the slip: scale factors multiply.`,
      },
    ];
  },
};

interface ComposeOrientationParams {
  first: Transform;
  second: Transform;
  pf: number;
  ps: number;
  area: number;
}

/**
 * What two named transformations do to a shape's area and its orientation.
 *
 * Reflections are drawn often, because two of them together is the case that
 * catches people: each turns the shape over, and together they turn it back.
 */
const composeOrientation: Generator<ComposeOrientationParams> = {
  id: 'mat-compose-orientation',
  sample: (rng) => {
    const first = rng.pick(COMPOSABLE);
    const second = rng.pick(COMPOSABLE);
    return {
      first,
      second,
      pf: rng.int(0, phraseCount(first) - 1),
      ps: rng.int(0, phraseCount(second) - 1),
      area: rng.int(2, 9),
    };
  },
  render: ({ first, second, pf, ps, area }): Slide => {
    const [df, ds] = [detOf(matrixOf(first)), detOf(matrixOf(second))];
    const right = Math.abs(df * ds) * area;
    const added = (Math.abs(df) + Math.abs(ds)) * area;
    const wrong = added === right ? right + area : added;
    const kept = df * ds > 0;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `A triangle of area $${area}$ is given ${phraseOf(first, pf)}, followed by ${phraseOf(second, ps)}. Which describes the final image?`,
        },
      ],
      options: turned(
        [
          { id: kept ? 'right' : 'size', label: `Area ${right}, the same way round`, tex: false },
          { id: kept ? 'sign' : 'right', label: `Area ${right}, turned over`, tex: false },
          { id: 'kept', label: `Area ${wrong}, the same way round`, tex: false },
          { id: 'flipped', label: `Area ${wrong}, turned over`, tex: false },
        ],
        `${pf} ${ps} ${area} ${nameOf(first)} ${nameOf(second)}`,
      ),
      correctId: 'right',
    };
  },
  solution: ({ first, second, pf, ps, area }) => {
    const [f, s] = [matrixOf(first), matrixOf(second)];
    const [df, ds] = [detOf(f), detOf(s)];
    return [
      { text: `The determinants: $${df}$ for ${phraseOf(first, pf)}, and $${ds}$ for ${phraseOf(second, ps)}.` },
      { tex: `\\det(\\text{both}) = ${df} \\times \\left(${ds}\\right) = ${df * ds}` },
      { tex: `\\text{area} = ${Math.abs(df * ds)} \\times ${area} = ${Math.abs(df * ds) * area}` },
      {
        text:
          df * ds > 0
            ? df < 0
              ? 'Both transformations turn the shape over, so together they turn it back: the combined determinant is positive.'
              : 'The combined determinant is positive, so the image is the same way round.'
            : 'The combined determinant is negative, so the image is turned over: exactly one of the two transformations flips it.',
      },
    ];
  },
};

interface DetMissingParams {
  da: number;
  db: number;
  names: [string, string];
  reverse: boolean;
}

/** A missing determinant, from the determinant of a product. */
const detMissing: Generator<DetMissingParams> = {
  id: 'mat-det-missing',
  choices: ({ da, db }) => signedChoices(db, [da * db - da, -db, da * db * da, da * db + da]),
  sample: (rng, difficulty) => {
    const [p, q] = rng.sample(LETTERS, 2);
    return {
      da: difficulty > 1 ? rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]) : rng.int(2, 6),
      db: nonZero(rng.int(-7, 7), -3),
      names: [p, q],
      reverse: rng.chance(0.5),
    };
  },
  render: ({ da, db, names, reverse }) => {
    const [p, q] = names;
    const product = reverse ? bold(q + p) : bold(p + q);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$\\det${bold(p)} = ${da}$ and $\\det\\left(${product}\\right) = ${da * db}$. Find $\\det${bold(q)}$.`,
        },
      ],
      lead: `\\det${bold(q)} =`,
      keypad: [],
      answer: `${db}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ da, db, names, reverse }) => {
    const [p, q] = names;
    const product = reverse ? bold(q + p) : bold(p + q);
    return [
      { text: `The determinant of a product is the product of the determinants, whichever way round the product is taken.` },
      { tex: `\\det\\left(${product}\\right) = \\det${bold(p)} \\times \\det${bold(q)}` },
      { tex: `${da * db} = ${da} \\times \\det${bold(q)}` },
      { tex: `\\det${bold(q)} = \\frac{${da * db}}{${da}} = ${db}` },
      {
        text: db < 0
          ? `The sign matters: $${bold(q)}$ turns shapes over, ${da > 0 ? `and $${bold(p)}$ does not, so the product does too` : `and so does $${bold(p)}$, so in the product the two flips cancel`}.`
          : `So $${bold(q)}$ scales area by $${db}$.`,
      },
    ];
  },
};

/* ---------- Level 9: systems of equations (roadmap batch B27) ---------- */

/**
 * A 3x3 matrix, row by row.
 *
 * Every question before this level is about a 2x2, and `matrixTex` in
 * `vectorFormat.ts` is 2x2 only and shared with Vectors, so the 3x3 helpers
 * live here. `gridTex` above already renders any rectangular matrix.
 *
 * Long arithmetic in a worked solution goes in a prose line as inline maths,
 * which wraps, rather than in a display, which does not: the *Show me* panel
 * holds only about twenty characters of display maths on a phone.
 */
type Grid = number[][];
type SampleRng = Parameters<Generator<unknown>['sample']>[0];

const UNKNOWNS = ['x', 'y', 'z'];
const ORDINALS = ['first', 'second', 'third'];

/** A column of numbers or letters, for prompts only. */
function stackTex(values: (number | string)[]): string {
  return `\\begin{pmatrix} ${values.join(' \\\\ ')} \\end{pmatrix}`;
}

/** Any grid of numbers or letters, for a matrix with a `k` in it. */
function cellsTex(rows: (number | string)[][]): string {
  return `\\begin{pmatrix} ${rows.map((row) => row.join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
}

const UNKNOWNS_TEX = stackTex(UNKNOWNS);

/** A negative number in brackets, for a product written out. */
const br = (n: number) => (n < 0 ? `(${n})` : `${n}`);

/** ` + 3` or ` - 3`, and nothing at all for zero. */
const signedTex = (n: number) => (n === 0 ? '' : n < 0 ? ` - ${-n}` : ` + ${n}`);

/** A pair of numbers multiplied, then summed: `(2)(3) + (-1)(4)`. */
const productsTex = (left: number[], right: number[]) =>
  left.map((value, idx) => `(${value})(${right[idx]})`).join(' + ');

const dot = (left: number[], right: number[]) =>
  left.reduce((sum, value, idx) => sum + value * right[idx], 0);

/** What is left once row `r` and column `c` are crossed out, read row by row. */
function minorGridAt(m: Grid, r: number, c: number): [number, number, number, number] {
  const rows = [0, 1, 2].filter((i) => i !== r);
  const cols = [0, 1, 2].filter((j) => j !== c);
  return [m[rows[0]][cols[0]], m[rows[0]][cols[1]], m[rows[1]][cols[0]], m[rows[1]][cols[1]]];
}

function minorAt(m: Grid, r: number, c: number): number {
  const [a, b, p, q] = minorGridAt(m, r, c);
  return a * q - b * p;
}

/** A minor along the first row, which is the only row this level expands along. */
const minorOf = (m: Grid, c: number) => minorAt(m, 0, c);

/** Expansion along the first row, with the signs going + - +. */
function det3(m: Grid): number {
  return m[0][0] * minorOf(m, 0) - m[0][1] * minorOf(m, 1) + m[0][2] * minorOf(m, 2);
}

const timesVector = (m: Grid, v: number[]) => m.map((row) => dot(row, v));
const transposed = (m: Grid): Grid => [0, 1, 2].map((c) => m.map((row) => row[c]));
const copyGrid = (m: Grid): Grid => m.map((row) => [...row]);

/** The adjugate: the transposed matrix of cofactors. */
function adjugate(m: Grid): Grid {
  return [0, 1, 2].map((r) => [0, 1, 2].map((c) => ((r + c) % 2 === 0 ? 1 : -1) * minorAt(m, c, r)));
}

/** `2x - y + 3z`, with zero terms left out and a coefficient of one left bare. */
function termsTex(coeffs: number[], names: string[]): string {
  let out = '';
  coeffs.forEach((c, idx) => {
    if (c === 0) return;
    const size = Math.abs(c) === 1 ? '' : `${Math.abs(c)}`;
    out += out === '' ? `${c < 0 ? '-' : ''}${size}${names[idx]}` : ` ${c < 0 ? '-' : '+'} ${size}${names[idx]}`;
  });
  return out === '' ? '0' : out;
}

/** One equation, its terms written in `order`. */
function equationTex(coeffs: number[], rhs: number | string, order: number[] = coeffs.map((_, i) => i)): string {
  return `${termsTex(
    order.map((i) => coeffs[i]),
    order.map((i) => UNKNOWNS[i]),
  )} = ${rhs}`;
}

/** Equations stacked and lined up on their equals signs. */
function systemTex(lines: string[]): string {
  return `\\begin{aligned} ${lines.map((line) => line.replace(' = ', ' &= ')).join(' \\\\ ')} \\end{aligned}`;
}

/** `y = 3x - 2`, the form a line's gradient and intercept are read from. */
function lineTex(m: number, c: number): string {
  return `${m === 1 ? '' : m === -1 ? '-' : m}x${signedTex(c)}`;
}

/** A 3x3 of whole numbers, none of them zero unless `zeros` asks for some. */
function drawGrid(rng: SampleRng, span: number, zeros = 0): Grid {
  const m = [0, 1, 2].map(() => [0, 1, 2].map(() => nonZero(rng.int(-span, span), rng.pick([1, 2, -1]))));
  for (let i = 0; i < zeros; i += 1) m[rng.int(0, 2)][rng.int(0, 2)] = 0;
  return m;
}

/** A 3x3 with a non-zero determinant. */
function drawInvertible(rng: SampleRng, span: number, zeros: number): Grid {
  for (let tries = 0; tries < 40; tries += 1) {
    const m = drawGrid(rng, span, zeros);
    if (det3(m) !== 0) return m;
  }
  return [
    [2, 1, -1],
    [1, 3, 2],
    [-1, 1, 1],
  ];
}

/**
 * A native choice slide whose answer sits in a slot the question's own
 * numbers choose.
 *
 * Several questions here offer labels of one fixed make — "No solutions",
 * "Infinitely many" — and a rotation hashed from the labels alone would then
 * pin the answer to a slot or two. Hashing the parameters as well spreads it
 * over all four, and one question still renders one way.
 */
function slotted(right: string, wrong: string[], salt: string, tex = true) {
  const others = [...new Set(wrong)].filter((label) => label !== right).slice(0, 3);
  let hash = 7;
  for (let i = 0; i < salt.length; i += 1) hash = (hash * 31 + salt.charCodeAt(i)) | 0;
  // Mixed before it is reduced: salts that are all digits and commas leave
  // the low bits of a plain string hash lopsided, which favoured two slots.
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 13), 0x45d9f3b);
  hash ^= hash >>> 16;
  const at = Math.abs(hash) % (others.length + 1);
  const labels = [...others.slice(0, at), right, ...others.slice(at)];
  return {
    options: labels.map((label, idx) => ({ id: `opt${idx}`, label, tex })),
    correctId: `opt${at}`,
  };
}

/* ----- three equations, one matrix equation ----- */

const IDENTITY = [0, 1, 2];
const inOrder = (order: number[]) => order.every((value, idx) => value === idx);

interface SysReadParams {
  m: Grid;
  b: number[];
  row: number;
  /** The order each equation's terms are written in. */
  orders: number[][];
}

/**
 * A row of the matrix and an entry of b, read off a written system.
 *
 * The two slips are the ones this question exists for: an unknown missing
 * from an equation still needs its 0 in the matrix, and at difficulty 2 the
 * terms are written out of order, so reading coefficients left to right puts
 * them in the wrong columns.
 */
const sysRead: Generator<SysReadParams> = {
  id: 'mat-sys-read',
  sample: (rng, difficulty) => {
    const m = drawGrid(rng, difficulty > 1 ? 9 : 6);
    const row = rng.int(0, 2);
    if (rng.chance(0.7)) m[row][rng.int(0, 2)] = 0;
    const orders = [0, 1, 2].map((i) => {
      if (difficulty < 2) return IDENTITY;
      if (i !== row) return rng.chance(0.5) ? IDENTITY : rng.shuffle(IDENTITY);
      const order = rng.shuffle(IDENTITY);
      return inOrder(order) ? [2, 0, 1] : order;
    });
    return { m, b: [0, 1, 2].map(() => nonZero(rng.int(-15, 15), 7)), row, orders };
  },
  render: ({ m, b, row, orders }) => {
    const answer = [...m[row], b[row]].map(String);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Write this system as $\\mathbf{A}\\mathbf{x} = \\mathbf{b}$, with the unknowns in the order $x, y, z$. Fill in the ${ORDINALS[row]} row of $\\mathbf{A}$ and the ${ORDINALS[row]} entry of $\\mathbf{b}$.`,
        },
        { kind: 'display', tex: systemTex(m.map((coeffs, i) => equationTex(coeffs, b[i], orders[i]))) },
      ],
      template: `\\text{row: } {0} \\; {1} \\; {2} \\quad \\mathbf{b}\\text{: } {3}`,
      bank: bankOf(answer, [
        ...m[row].map((c) => `${-c}`),
        `${-b[row]}`,
        // A missing unknown read as a coefficient of one.
        m[row].includes(0) ? '1' : `${m[(row + 1) % 3][0]}`,
      ]),
      answer,
    };
  },
  solution: ({ m, b, row, orders }) => [
    {
      text: `Rewrite the ${ORDINALS[row]} equation with its unknowns in the order $x, y, z$, and a $0$ for any unknown it leaves out.`,
    },
    { tex: equationTex(m[row], b[row], orders[row]) },
    { tex: `${m[row].map((c, i) => `${i === 0 ? c : `${c < 0 ? '-' : '+'} ${Math.abs(c)}`}${UNKNOWNS[i]}`).join(' ')} = ${b[row]}` },
    {
      text: `The coefficients in that order are the row, $${m[row].join(', \\; ')}$, and the number on the right, $${b[row]}$, is the entry of $\\mathbf{b}$.`,
    },
    {
      text: 'Reading the coefficients in the order they happen to be written, or skipping a missing unknown instead of writing $0$, puts numbers in the wrong columns.',
    },
  ],
};

interface SysBackParams {
  m: Grid;
  b: number[];
  row: number;
}

/** The other direction: one equation read back out of a matrix equation. */
const sysBack: Generator<SysBackParams> = {
  id: 'mat-sys-back',
  sample: (rng, difficulty) => ({
    m: drawGrid(rng, difficulty > 1 ? 9 : 5, difficulty > 1 ? 1 : 0),
    b: [0, 1, 2].map(() => nonZero(rng.int(-12, 12), -4)),
    row: rng.int(0, 2),
  }),
  render: ({ m, b, row }): Slide => {
    const { options: offered, correctId } = slotted(
      equationTex(m[row], b[row]),
      [
        // A column read as if it were a row.
        equationTex(transposed(m)[row], b[row]),
        // The right-hand side of a different row.
        equationTex(m[row], b[(row + 1) % 3]),
        // The coefficients paired with the unknowns the wrong way round.
        equationTex([...m[row]].reverse(), b[row]),
        equationTex(m[row], -b[row]),
      ],
      `${m.flat().join(',')}|${b.join(',')}|${row}`,
    );
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Which equation does the ${ORDINALS[row]} row of this matrix equation say?` },
        // Two displays: a 3x3 beside two columns overruns a phone.
        { kind: 'display', tex: `${gridTex(m)} ${UNKNOWNS_TEX}` },
        { kind: 'display', tex: `= ${stackTex(b)}` },
      ],
      options: offered,
      correctId,
    };
  },
  solution: ({ m, b, row }) => [
    {
      text: `Row ${row + 1} of the matrix multiplies the column of unknowns: its first entry goes with $x$, its second with $y$ and its third with $z$.`,
    },
    { text: `$${m[row].map((c, i) => `${br(c)}${UNKNOWNS[i]}`).join(' + ')} = ${b[row]}$` },
    { tex: equationTex(m[row], b[row]) },
    {
      text: 'The right-hand side is the same row of $\\mathbf{b}$. Reading a column of the matrix instead of a row is the usual slip.',
    },
  ],
};

interface SysVectorParams {
  m: Grid;
  v: number[];
}

/** A 3x3 matrix times a column: the left-hand side of three equations at once. */
const sysVector: Generator<SysVectorParams> = {
  id: 'mat-sys-vector',
  choices: ({ m, v }) => {
    const right = timesVector(m, v);
    return options(
      { tex: stackTex(right) },
      // Columns instead of rows, the diagonal only, and upside down.
      { tex: stackTex(timesVector(transposed(m), v)) },
      { tex: stackTex(m.map((row, i) => row[i] * v[i])) },
      { tex: stackTex([...right].reverse()) },
      { tex: stackTex(right.map((value) => -value)) },
    ).slice(0, 4);
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 6 : 4;
    return {
      m: drawGrid(rng, span, difficulty > 1 ? 2 : 1),
      v: [0, 1, 2].map(() => nonZero(rng.int(-span, span), 2)),
    };
  },
  render: ({ m, v }) => {
    const answer = timesVector(m, v).map(String);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Work out the three entries of the product, top to bottom.' },
        { kind: 'display', tex: `${gridTex(m)} ${stackTex(v)}` },
      ],
      template: `({0}, \\; {1}, \\; {2})`,
      bank: bankOf(answer, [...timesVector(transposed(m), v), ...m.map((row, i) => row[i] * v[i])].map(String)),
      answer,
    };
  },
  solution: ({ m, v }) => {
    const out = timesVector(m, v);
    return [
      {
        text: 'Each entry of the answer is one *row* of the matrix times the column: multiply pair by pair across, and add.',
      },
      ...m.map((row, i) => ({ text: `Row ${i + 1}: $${productsTex(row, v)} = ${out[i]}$` })),
      { tex: `= ${stackTex(out)}` },
      {
        text: 'Using the columns of the matrix instead of the rows is the standard slip, exactly as with a 2 by 2.',
      },
    ];
  },
};

interface SysRhsParams {
  m: Grid;
  /** The solution, chosen first. */
  s: number[];
  row: number;
}

/** A missing right-hand side, from a solution the system is known to have. */
const sysRhs: Generator<SysRhsParams> = {
  id: 'mat-sys-rhs',
  choices: ({ m, s, row }) => {
    const right = dot(m[row], s);
    return signedChoices(right, [
      dot(m[row], [...s].reverse()),
      -right,
      dot(m[row], [s[0], s[1], -s[2]]),
      m[row][0] + m[row][1] + m[row][2],
    ]);
  },
  sample: (rng, difficulty) => ({
    m: drawGrid(rng, difficulty > 1 ? 7 : 4, 1),
    s: [0, 1, 2].map(() => nonZero(rng.int(-5, 5), 3)),
    row: rng.int(0, 2),
  }),
  render: ({ m, s, row }) => {
    const b = timesVector(m, s);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `This system has the solution $x = ${s[0]}$, $y = ${s[1]}$, $z = ${s[2]}$. Find the missing number $k$.`,
        },
        { kind: 'display', tex: systemTex(m.map((coeffs, i) => equationTex(coeffs, i === row ? 'k' : b[i]))) },
      ],
      lead: 'k =',
      keypad: [],
      answer: `${b[row]}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ m, s, row }) => {
    const value = dot(m[row], s);
    return [
      {
        text: `A solution makes every equation true, so substitute it into the ${ORDINALS[row]} equation: the left-hand side is then $k$.`,
      },
      { text: `$${productsTex(m[row], s)} = ${value}$` },
      { tex: `k = ${value}` },
      {
        text: 'In matrix terms this is one row of $\\mathbf{A}\\mathbf{x}$: multiplying the solution by $\\mathbf{A}$ gives back $\\mathbf{b}$.',
      },
    ];
  },
};

/* ----- the 3x3 determinant ----- */

/** Expanding along the first row, each minor worked out on its own line. */
function expansionSteps(m: Grid): SolutionStep[] {
  const [p, q, r] = m[0];
  const minors = [0, 1, 2].map((c) => minorOf(m, c));
  return [
    {
      text: 'Each entry of the first row times its minor, with the signs going $+ \\; - \\; +$ along the row.',
    },
    { tex: `${p}M_1 - ${br(q)}M_2 + ${br(r)}M_3` },
    ...minors.map((minor, c) => {
      const [a, b, e, f] = minorGridAt(m, 0, c);
      return { text: `$M_${c + 1} = (${a})(${f}) - (${b})(${e}) = ${minor}$` };
    }),
    {
      text: `$(${p})(${minors[0]}) - (${q})(${minors[1]}) + (${r})(${minors[2]}) = ${det3(m)}$`,
    },
    { text: 'The minus on the middle term is the step most often dropped.' },
  ];
}

interface SysMinorParams {
  m: Grid;
  col: number;
}

/** One minor: the 2x2 left once a row and a column are crossed out. */
const sysMinor: Generator<SysMinorParams> = {
  id: 'mat-sys-minor',
  choices: ({ m, col }) => {
    const right = minorOf(m, col);
    const [a, b, c, d] = minorGridAt(m, 0, col);
    return signedChoices(right, [-right, a * d + b * c, minorOf(m, (col + 1) % 3), a * b - c * d]);
  },
  sample: (rng, difficulty) => ({ m: drawGrid(rng, difficulty > 1 ? 9 : 5), col: rng.int(0, 2) }),
  render: ({ m, col }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Cross out the first row and column ${col + 1}. The determinant of what is left is $M_${col + 1}$, the minor of the entry $${m[0][col]}$. Find it.`,
      },
      { kind: 'display', tex: `\\mathbf{A} = ${gridTex(m)}` },
    ],
    lead: `M_${col + 1} =`,
    keypad: [],
    answer: `${minorOf(m, col)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ m, col }) => {
    const [a, b, c, d] = minorGridAt(m, 0, col);
    return [
      {
        text: `Delete row 1 and column ${col + 1}. The four entries left, kept in their places, make a 2 by 2 matrix.`,
      },
      { tex: `M_${col + 1} = \\begin{vmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{vmatrix}` },
      { text: `$(${a})(${d}) - (${b})(${c}) = ${a * d} - ${br(b * c)} = ${a * d - b * c}$` },
      { text: 'Leading diagonal minus the other one, exactly as for any 2 by 2 determinant.' },
    ];
  },
};

interface SysDetParams {
  m: Grid;
}

/** The whole 3x3 determinant, typed. */
const sysDet: Generator<SysDetParams> = {
  id: 'mat-sys-det',
  choices: ({ m }) => {
    const right = det3(m);
    return signedChoices(right, [
      // Every sign a plus, the sign flipped, and the first term alone.
      m[0][0] * minorOf(m, 0) + m[0][1] * minorOf(m, 1) + m[0][2] * minorOf(m, 2),
      -right,
      m[0][0] * minorOf(m, 0),
      m[0][0] * m[1][1] * m[2][2],
    ]);
  },
  sample: (rng, difficulty) => ({ m: drawGrid(rng, difficulty > 1 ? 5 : 3, difficulty > 1 ? 1 : 2) }),
  render: ({ m }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find the determinant by expanding along the first row.' },
      { kind: 'display', tex: `\\mathbf{A} = ${gridTex(m)}` },
    ],
    lead: '\\det \\mathbf{A} =',
    keypad: [],
    answer: `${det3(m)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ m }) => expansionSteps(m),
};

/**
 * The same expansion as a tree: three minors, three signed terms, one sum.
 *
 * The middle row is where the sign pattern lives, so a learner who drops the
 * minus on the middle term places a value that is visibly not on offer in the
 * right place — the bank holds it, but the sum underneath then disagrees.
 */
const sysDetTree: Generator<SysDetParams> = {
  id: 'mat-sys-det-tree',
  sample: (rng, difficulty) => ({ m: drawGrid(rng, difficulty > 1 ? 4 : 3, 1) }),
  render: ({ m }): Slide => {
    const [p, q, r] = m[0];
    const minors = [0, 1, 2].map((c) => minorOf(m, c));
    const terms = [p * minors[0], -q * minors[1], r * minors[2]];
    const answer = [...minors, ...terms, det3(m)].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Top row: the three minors, left to right. Middle row: each one times its entry, with the signs $+ \\; - \\; +$. Bottom: the determinant.',
        },
        { kind: 'display', tex: `\\mathbf{A} = ${gridTex(m)}` },
      ],
      expression: `${p}M_1 - ${br(q)}M_2 + ${br(r)}M_3`,
      nodes: [
        { id: 'm1', from: [] },
        { id: 'm2', from: [] },
        { id: 'm3', from: [] },
        { id: 't1', from: ['m1'] },
        { id: 't2', from: ['m2'] },
        { id: 't3', from: ['m3'] },
        { id: 'det', from: ['t1', 't2', 't3'] },
      ],
      bank: bankOf(
        answer,
        // The middle sign dropped, both in its term and in the total.
        [q * minors[1], terms[0] + q * minors[1] + terms[2], -minors[0]].map(String),
      ),
      answer,
    };
  },
  solution: ({ m }) => expansionSteps(m),
};

type ZeroRelation = 'equal' | 'zero' | 'multiple' | 'sum';

interface SysZeroParams {
  right: Grid;
  wrong: Grid[];
  relation: ZeroRelation;
  /** Row `j` is built from row `i` (and, for a sum, the third row too). */
  i: number;
  j: number;
  t: number;
}

/**
 * Which matrix is singular, spotted from its rows rather than expanded.
 *
 * The three wrong options are the right one with a single entry of the
 * dependent row nudged, so the relation between the rows is the only thing
 * that tells them apart.
 */
const sysDetZero: Generator<SysZeroParams> = {
  id: 'mat-sys-det-zero',
  sample: (rng, difficulty) => {
    const relation = rng.pick<ZeroRelation>(difficulty > 1 ? ['multiple', 'sum'] : ['equal', 'zero', 'multiple']);
    const [i, j] = rng.sample([0, 1, 2], 2);
    const k = 3 - i - j;
    const t = relation === 'multiple' ? rng.pick(difficulty > 1 ? [-3, -2, 2, 3] : [2, 3]) : 1;
    // Nudging an entry of the tied row changes the determinant by its
    // cofactor, so a draw whose other two rows are themselves tied has no
    // wrong options to offer. Draw again until all three exist.
    let right: Grid = [];
    let wrong: Grid[] = [];
    for (let tries = 0; tries < 40 && wrong.length < 3; tries += 1) {
      const g = drawGrid(rng, difficulty > 1 ? 6 : 4);
      const built =
        relation === 'equal'
          ? [...g[i]]
          : relation === 'zero'
            ? [0, 0, 0]
            : relation === 'multiple'
              ? g[i].map((value) => t * value)
              : g[i].map((value, c) => value + g[k][c]);
      right = g.map((row, idx) => (idx === j ? built : [...row]));
      wrong = [0, 1, 2].map((c) => {
        const w = copyGrid(right);
        w[j][c] += rng.pick([1, -1]);
        return w;
      });
      wrong = wrong.filter((w) => det3(w) !== 0);
    }
    return { right, wrong, relation, i, j, t };
  },
  render: ({ right, wrong }): Slide => {
    const { options: offered, correctId } = slotted(
      gridTex(right),
      wrong.map(gridTex),
      [right, ...wrong].map((m) => m.flat().join(',')).join('|'),
    );
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: 'Which of these matrices has determinant zero? Look at how the rows are related before expanding anything.',
        },
      ],
      options: offered,
      correctId,
    };
  },
  solution: ({ right, wrong, relation, i, j, t }) => {
    const k = 3 - i - j;
    const relationText = {
      equal: `Row ${j + 1} is the same as row ${i + 1}.`,
      zero: `Row ${j + 1} is all zeros.`,
      multiple: `Row ${j + 1} is $${t}$ times row ${i + 1}.`,
      sum: `Row ${j + 1} is row ${i + 1} and row ${k + 1} added together.`,
    }[relation];
    return [
      {
        text: 'A determinant is zero exactly when one row can be built from the others: the matrix then flattens space, and the volume it scales by is zero.',
      },
      { text: relationText },
      { tex: `\\det ${gridTex(right)} = 0` },
      {
        text: `Each of the other three changes one entry of that row, which breaks the tie. Their determinants are $${wrong.map(det3).join('$, $')}$.`,
      },
    ];
  },
};

type RuleKind = 'scale' | 'swap' | 'row' | 'transpose' | 'swapScale';

interface SysRuleParams {
  d: number;
  k: number;
  rule: RuleKind;
  rows: [number, number];
}

function ruleValue({ d, k, rule }: SysRuleParams): number {
  return {
    scale: k ** 3 * d,
    swap: -d,
    row: k * d,
    transpose: d,
    swapScale: -(k ** 3) * d,
  }[rule];
}

/**
 * What a change to a 3x3 matrix does to its determinant, without expanding.
 *
 * Scaling the whole matrix is the one to watch: each of the three rows is
 * scaled, so the determinant goes up by the cube of the factor, not by the
 * factor once.
 */
const sysDetRule: Generator<SysRuleParams> = {
  id: 'mat-sys-det-rule',
  choices: (p) => {
    const right = ruleValue(p);
    return signedChoices(right, [p.k * p.d, p.k ** 3 * p.d, -right, p.d, 3 * p.k * p.d]);
  },
  sample: (rng, difficulty) => {
    const [r1, r2] = rng.sample([1, 2, 3], 2).sort();
    return {
      d: nonZero(rng.int(-9, 9), 4),
      k: difficulty > 1 ? rng.pick([-3, -2, 2, 3]) : rng.int(2, 3),
      rule: rng.pick<RuleKind>(
        difficulty > 1 ? ['scale', 'swapScale', 'row', 'transpose', 'scale'] : ['scale', 'swap', 'row', 'scale'],
      ),
      rows: [r1, r2],
    };
  },
  render: (p) => {
    const { d, k, rule, rows } = p;
    const given = `$\\mathbf{A}$ is a $3 \\times 3$ matrix with $\\det \\mathbf{A} = ${d}$.`;
    const asked = {
      scale: { text: `Find the determinant of $${k}\\mathbf{A}$.`, lead: `\\det(${k}\\mathbf{A}) =` },
      swap: { text: `$\\mathbf{B}$ is $\\mathbf{A}$ with rows ${rows[0]} and ${rows[1]} swapped.`, lead: '\\det \\mathbf{B} =' },
      row: { text: `$\\mathbf{B}$ is $\\mathbf{A}$ with row ${rows[0]} multiplied by $${k}$.`, lead: '\\det \\mathbf{B} =' },
      transpose: { text: 'Find the determinant of its transpose.', lead: '\\det(\\mathbf{A}^{T}) =' },
      swapScale: {
        text: `$\\mathbf{B}$ is $${k}\\mathbf{A}$ with rows ${rows[0]} and ${rows[1]} swapped.`,
        lead: '\\det \\mathbf{B} =',
      },
    }[rule];
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${given} ${asked.text}` }],
      lead: asked.lead,
      keypad: [],
      answer: `${ruleValue(p)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const { d, k, rule } = p;
    const value = ruleValue(p);
    const cube = `${br(k)}^3`;
    const lines: Record<RuleKind, SolutionStep[]> = {
      scale: [
        {
          text: `Multiplying the matrix by $${k}$ multiplies all three of its rows by $${k}$, and each row scales the determinant once.`,
        },
        { tex: `${cube} \\times ${br(d)} = ${value}` },
      ],
      swap: [
        { text: 'Swapping two rows changes the sign of the determinant and nothing else.' },
        { tex: `-${br(d)} = ${value}` },
      ],
      row: [
        { text: `Multiplying one row by $${k}$ multiplies the determinant by $${k}$, once.` },
        { tex: `${k} \\times ${br(d)} = ${value}` },
      ],
      transpose: [
        {
          text: 'A matrix and its transpose have the same determinant: expanding down the first column gives the same number as along the first row.',
        },
        { tex: `\\det(\\mathbf{A}^{T}) = ${d}` },
      ],
      swapScale: [
        { text: `Scaling by $${k}$ multiplies the determinant by $${cube}$, and the swap then changes its sign.` },
        { text: `$-${cube} \\times ${br(d)} = ${value}$` },
      ],
    };
    return [
      ...lines[rule],
      {
        text: 'Scaling a whole 3 by 3 matrix by $k$ scales the determinant by $k^3$, not by $k$. That is the rule most often misapplied.',
      },
    ];
  },
};

/* ----- when the determinant is zero ----- */

type LinesRoute = 'cross' | 'same' | 'parallel';

interface SysLinesParams {
  route: LinesRoute;
  /** The two lines as y = mx + c, and the multiple each equation is written as. */
  m: number;
  c: number;
  m2: number;
  c2: number;
  s: number;
  t: number;
}

/** A line y = mx + c, written as `s` times `-mx + y = c`. */
const lineEquation = (m: number, c: number, s: number) => equationTex([-s * m, s], s * c);

/**
 * How many solutions two equations have, decided by what their lines look
 * like.
 *
 * `mat-method` walks the same question through the determinant; this one
 * walks it through the picture, which is where "none" and "infinitely many"
 * come from.
 */
const sysLines: Generator<SysLinesParams> = {
  id: 'mat-sys-lines',
  sample: (rng, difficulty) => {
    const route = rng.pick<LinesRoute>(['cross', 'same', 'parallel']);
    const multiples = difficulty > 1 ? [-3, -2, -1, 2, 3, 4] : [1, 2, 3];
    const [s, t] = rng.sample(multiples, 2);
    const m = nonZero(rng.int(-4, 4), 2);
    const c = rng.int(-6, 6);
    const m2 = route === 'cross' ? (m + nonZero(rng.int(-3, 3), 1) || -m) : m;
    const c2 = route === 'same' ? c : route === 'parallel' ? c + nonZero(rng.int(-4, 4), 3) : rng.int(-6, 6);
    return { route, m, c, m2, c2, s, t };
  },
  render: ({ route, m, c, m2, c2, s, t }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Each equation is a straight line. Work down the questions to decide how many solutions the pair has.',
      },
    ],
    subject: systemTex([lineEquation(m, c, s), lineEquation(m2, c2, t)]),
    steps: [
      {
        id: 'gradient',
        ask: 'Rearrange each equation as $y = mx + c$. Do the two lines have the same gradient?',
        branches: [
          { label: 'No', outcome: 'The lines cross at exactly one point: one solution.' },
          { label: 'Yes', to: 'intercept' },
        ],
      },
      {
        id: 'intercept',
        ask: 'Do they also cross the $y$-axis at the same place?',
        branches: [
          { label: 'Yes', outcome: 'They are the same line: infinitely many solutions.' },
          { label: 'No', outcome: 'They are parallel and never meet: no solutions.' },
        ],
      },
    ],
    answer: route === 'cross' ? ['No'] : route === 'same' ? ['Yes', 'Yes'] : ['Yes', 'No'],
  }),
  solution: ({ route, m, c, m2, c2 }) => [
    { text: 'Divide each equation through and rearrange it as $y = mx + c$.' },
    { tex: `y = ${lineTex(m, c)}` },
    { tex: `y = ${lineTex(m2, c2)}` },
    {
      text:
        route === 'cross'
          ? `The gradients, $${m}$ and $${m2}$, differ, so the lines cross exactly once and there is one solution.`
          : route === 'same'
            ? 'Same gradient and same intercept: the two equations are one line written twice, and every point on it is a solution.'
            : `Same gradient, $${m}$, but different intercepts: the lines are parallel, never meet, and nothing solves both.`,
    },
  ],
};

interface SysConsistentParams {
  u: number;
  v: number;
  c: number;
  s: number;
  t: number;
}

/**
 * The right-hand side that turns "no solutions" into "infinitely many".
 *
 * Both equations are multiples of one left-hand side, so the determinant is
 * zero whatever q is; q decides only whether the two agree.
 */
const sysConsistent: Generator<SysConsistentParams> = {
  id: 'mat-sys-consistent',
  choices: ({ c, s, t }) => signedChoices(t * c, [s * c, t * s * c, c, -t * c]),
  sample: (rng, difficulty) => {
    const u = nonZero(rng.int(-5, 5), 2);
    let v = nonZero(rng.int(-5, 5), 3);
    if (Math.abs(u) === Math.abs(v)) v = v > 0 ? v + 1 : v - 1;
    const [s, t] = difficulty > 1 ? rng.sample([-3, -2, 2, 3, 4], 2) : [1, rng.pick([-3, -2, 2, 3, 4])];
    return { u, v, c: nonZero(rng.int(-6, 6), 5), s, t };
  },
  render: ({ u, v, c, s, t }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'For which value of $q$ does this system have infinitely many solutions?' },
      { kind: 'display', tex: systemTex([equationTex([s * u, s * v], s * c), equationTex([t * u, t * v], 'q')]) },
    ],
    lead: 'q =',
    keypad: [],
    answer: `${t * c}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ u, v, c, s, t }) => {
    const base = termsTex([u, v], UNKNOWNS);
    return [
      {
        text: `Both left-hand sides are multiples of $${base}$: the first is $${s}$ times it and the second $${t}$ times it. So the determinant is zero, and there is never exactly one solution.`,
      },
      {
        text:
          s === 1
            ? `The first equation says $${base} = ${c}$.`
            : `The first equation says $${base} = ${s * c} \\div ${br(s)} = ${c}$.`,
      },
      { text: `The second then needs $q = ${t} \\times ${br(c)} = ${t * c}$ to say the same thing.` },
      {
        text: 'With that value the two equations are one line and every point on it is a solution. Any other value makes them contradict each other, and there are none.',
      },
    ];
  },
};

interface SysLineFormParams {
  m: number;
  c: number;
  s: number;
  t: number;
}

/** Infinitely many solutions, written as the one line they all lie on. */
const sysLineForm: Generator<SysLineFormParams> = {
  id: 'mat-sys-line-form',
  sample: (rng, difficulty) => {
    const [s, t] = difficulty > 1 ? rng.sample([-3, -2, 2, 3, 4, 5], 2) : [1, rng.pick([-2, 2, 3])];
    return { m: nonZero(rng.int(-5, 5), 3), c: rng.int(-9, 9), s, t };
  },
  render: ({ m, c, s, t }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'These two equations describe the same line, so the system has infinitely many solutions. Write that line in the form $y = mx + c$.',
      },
      { kind: 'display', tex: systemTex([lineEquation(m, c, s), lineEquation(m, c, t)]) },
    ],
    lead: 'y =',
    keypad: [{ insert: 'x', tex: true }],
    answer: `${m}*x + (${c})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ m, c, s, t }) => [
    {
      text:
        s === 1
          ? 'Rearrange the first equation to leave $y$ on its own.'
          : `Divide the first equation by $${s}$ and rearrange to leave $y$ on its own.`,
    },
    { tex: `y = ${lineTex(m, c)}` },
    {
      text: `The second divided by $${t}$ gives the same line. Every point on it solves both equations, which is what infinitely many solutions looks like.`,
    },
  ],
};

type CountRoute = 'unique' | 'same' | 'none';

interface SysCountParams {
  route: CountRoute;
  u: number;
  v: number;
  c: number;
  s: number;
  t: number;
  /** The second row and right-hand side, for the draw that has one solution. */
  e: number;
  f: number;
  g: number;
  /** How far off agreement the right-hand side is, for the draw with none. */
  miss: number;
}

function countRows({ route, u, v, c, s, t, e, f, g, miss }: SysCountParams): number[][] {
  if (route === 'unique') return [[s * u, s * v, s * c], [e, f, g]];
  return [
    [s * u, s * v, s * c],
    [t * u, t * v, t * c + (route === 'none' ? miss : 0)],
  ];
}

const COUNT_LABELS: Record<CountRoute, string> = {
  unique: 'Exactly one solution',
  same: 'Infinitely many solutions',
  none: 'No solutions',
};

/** The same decision as a pick-one, asked of a matrix equation. */
const sysCount: Generator<SysCountParams> = {
  id: 'mat-sys-count',
  sample: (rng, difficulty) => {
    const route = rng.pick<CountRoute>(['unique', 'same', 'none']);
    const u = nonZero(rng.int(-5, 5), 2);
    const v = nonZero(rng.int(-5, 5), -3);
    const [s, t] = difficulty > 1 ? rng.sample([-3, -2, 2, 3, 4], 2) : [1, rng.pick([-2, 2, 3, 4])];
    let e = nonZero(rng.int(-6, 6), 1);
    const f = nonZero(rng.int(-6, 6), 4);
    // Keep the one-solution draw genuinely invertible.
    if (s * u * f - s * v * e === 0) e += 1;
    return {
      route,
      u,
      v,
      c: rng.int(-6, 6),
      s,
      t,
      e,
      f,
      g: rng.int(-12, 12),
      miss: nonZero(rng.int(-3, 3), 1),
    };
  },
  render: (p): Slide => {
    const [[a, b, r1], [c, d, r2]] = countRows(p);
    const { options: offered, correctId } = slotted(
      COUNT_LABELS[p.route],
      [...Object.values(COUNT_LABELS), 'Exactly two solutions'],
      `${a},${b},${c},${d},${r1},${r2}`,
      false,
    );
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'How many solutions does this system have?' },
        {
          kind: 'display',
          tex: `${matrixTex(a, b, c, d)} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = ${columnTex(r1, r2)}`,
        },
      ],
      options: offered,
      correctId,
    };
  },
  solution: (p) => {
    const [[a, b, r1], [c, d, r2]] = countRows(p);
    const det = a * d - b * c;
    const steps: SolutionStep[] = [
      { text: `Start with the determinant: $(${a})(${d}) - (${b})(${c}) = ${det}$.` },
    ];
    if (p.route === 'unique') {
      return [
        ...steps,
        { text: 'It is not zero, so the matrix has an inverse and there is exactly one solution.' },
        { text: 'Two straight lines can never meet at exactly two points: they cross once, never, or all the way along.' },
      ];
    }
    // In lowest terms with the sign out front, and bracketed when negative after a times sign.
    const ratio = fracTex(p.t, p.s);
    return [
      ...steps,
      {
        text: `It is zero: the second row is $${ratio}$ times the first. Now check the right-hand side against the same multiple.`,
      },
      { text: `$${br(r1)} \\times ${ratio.startsWith('-') ? `\\left(${ratio}\\right)` : ratio} = ${(r1 * p.t) / p.s}$, against $${r2}$.` },
      {
        text:
          p.route === 'same'
            ? 'They agree, so the two equations are one line and there are infinitely many solutions.'
            : 'They disagree, so the equations contradict each other: parallel lines, and no solutions.',
      },
    ];
  },
};

/* ----- solving three equations ----- */

/** A with column `col` swapped for b: the matrix on top in Cramer's rule. */
const replaceColumn = (m: Grid, col: number, b: number[]): Grid =>
  m.map((row, i) => row.map((value, j) => (j === col ? b[i] : value)));

interface SysSwapParams {
  m: Grid;
  b: number[];
  col: number;
}

/** Which matrix Cramer's rule puts on top for a given unknown. */
const sysCramerSwap: Generator<SysSwapParams> = {
  id: 'mat-sys-cramer-swap',
  sample: (rng, difficulty) => ({
    m: drawGrid(rng, difficulty > 1 ? 9 : 5),
    b: [0, 1, 2].map(() => nonZero(rng.int(-9, 9), 6)),
    col: rng.int(0, 2),
  }),
  render: ({ m, b, col }): Slide => {
    const name = UNKNOWNS[col];
    const { options: offered, correctId } = slotted(
      gridTex(replaceColumn(m, col, b)),
      [
        // A row replaced instead of a column, the neighbouring column, and b upside down.
        gridTex(m.map((row, i) => (i === col ? [...b] : [...row]))),
        gridTex(replaceColumn(m, (col + 1) % 3, b)),
        gridTex(replaceColumn(m, col, [...b].reverse())),
      ],
      `${m.flat().join(',')}|${b.join(',')}|${col}`,
    );
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `By Cramer's rule, $${name} = \\frac{\\det \\mathbf{A}_${name}}{\\det \\mathbf{A}}$. Which matrix is $\\mathbf{A}_${name}$?`,
        },
        { kind: 'display', tex: `\\mathbf{A} = ${gridTex(m)}` },
        { kind: 'display', tex: `\\mathbf{b} = ${stackTex(b)}` },
      ],
      options: offered,
      correctId,
    };
  },
  solution: ({ m, b, col }) => {
    const name = UNKNOWNS[col];
    return [
      {
        text: `Column ${col + 1} of $\\mathbf{A}$ holds the coefficients of $${name}$. Replace that column, and only that column, by $\\mathbf{b}$.`,
      },
      { tex: `\\mathbf{A}_${name} = ${gridTex(replaceColumn(m, col, b))}` },
      {
        text: `Then $${name} = \\frac{\\det \\mathbf{A}_${name}}{\\det \\mathbf{A}}$. The other two unknowns work the same way, each with its own column replaced.`,
      },
    ];
  },
};

interface SysCramerParams {
  m: Grid;
  /** The solution, chosen first so every determinant divides out exactly. */
  s: number[];
  col: number;
}

/** One unknown of a 3x3 system by Cramer's rule, with det A given. */
const sysCramer: Generator<SysCramerParams> = {
  id: 'mat-sys-cramer',
  choices: ({ m, s, col }) =>
    signedChoices(s[col], [det3(m) * s[col], -s[col], s[(col + 1) % 3], s[(col + 2) % 3]]),
  sample: (rng, difficulty) => ({
    m: drawInvertible(rng, difficulty > 1 ? 3 : 2, difficulty > 1 ? 1 : 2),
    s: [0, 1, 2].map(() => nonZero(rng.int(-5, 5), -2)),
    col: rng.int(0, 2),
  }),
  render: ({ m, s, col }) => {
    const b = timesVector(m, s);
    const name = UNKNOWNS[col];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$\\det \\mathbf{A} = ${det3(m)}$. Use Cramer's rule to find $${name}$.`,
        },
        // Two displays: a 3x3 beside two columns overruns a phone.
        { kind: 'display', tex: `${gridTex(m)} ${UNKNOWNS_TEX}` },
        { kind: 'display', tex: `= ${stackTex(b)}` },
      ],
      lead: `${name} =`,
      keypad: [],
      answer: `${s[col]}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ m, s, col }) => {
    const b = timesVector(m, s);
    const top = replaceColumn(m, col, b);
    const name = UNKNOWNS[col];
    const minors = [0, 1, 2].map((c) => minorOf(top, c));
    return [
      { text: `Replace column ${col + 1}, the $${name}$ column, by the right-hand side.` },
      { tex: `\\mathbf{A}_${name} = ${gridTex(top)}` },
      {
        text: `Expand along the first row: the minors are $${minors.join('$, $')}$, so $\\det \\mathbf{A}_${name} = (${top[0][0]})(${minors[0]}) - (${top[0][1]})(${minors[1]}) + (${top[0][2]})(${minors[2]}) = ${det3(top)}$.`,
      },
      { tex: `${name} = \\frac{${det3(top)}}{${det3(m)}} = ${s[col]}` },
      { text: 'Substituting back into any one equation is a quick check.' },
    ];
  },
};

interface SysInverseParams {
  /** A^-1 is n divided by k. */
  n: Grid;
  k: number;
  b: number[];
}

/**
 * A lower and an upper unitriangular matrix multiplied: determinant 1, so its
 * inverse has whole entries too, which is what lets difficulty 2 put a
 * fraction in front of the inverse and still land on a whole solution.
 */
function drawUnimodular(rng: SampleRng): Grid {
  for (let tries = 0; tries < 60; tries += 1) {
    const [p, q, r, u, v, w] = [0, 0, 0, 0, 0, 0].map(() => rng.int(-2, 2));
    const lower = [
      [1, 0, 0],
      [p, 1, 0],
      [q, r, 1],
    ];
    const upper = [
      [1, u, v],
      [0, 1, w],
      [0, 0, 1],
    ];
    const n = lower.map((row) => [0, 1, 2].map((c) => dot(row, upper.map((line) => line[c]))));
    const inverse = adjugate(n);
    const flat = [...n.flat(), ...inverse.flat()];
    if (Math.max(...flat.map(Math.abs)) <= 5 && n.flat().filter((x) => x === 0).length <= 3) return n;
  }
  return [
    [1, 1, 0],
    [1, 2, 1],
    [0, 1, 2],
  ];
}

/** The solution a question's inverse and right-hand side lead to. */
const inverseSolution = ({ n, k, b }: SysInverseParams) => timesVector(n, b).map((value) => value / k);

/** x = A^-1 b, with the inverse handed over rather than worked out. */
const sysInverse: Generator<SysInverseParams> = {
  id: 'mat-sys-inverse',
  choices: (p) => {
    const right = inverseSolution(p);
    const across = timesVector(transposed(p.n), p.b).map((value) => value / p.k);
    return options(
      { tex: stackTex(right) },
      ...(across.every(Number.isInteger) ? [{ tex: stackTex(across) }] : []),
      { tex: stackTex(right.map((value) => -value)) },
      { tex: stackTex([...right].reverse()) },
      { tex: stackTex(p.b) },
    ).slice(0, 4);
  },
  sample: (rng, difficulty) => {
    if (difficulty < 2) {
      return {
        n: drawInvertible(rng, 3, 2),
        k: 1,
        b: [0, 1, 2].map(() => nonZero(rng.int(-4, 4), 1)),
      };
    }
    const n = drawUnimodular(rng);
    const k = rng.pick([2, 3]);
    const solution = [0, 1, 2].map(() => nonZero(rng.int(-5, 5), 2));
    // n has determinant 1, so its adjugate is its inverse.
    const b = timesVector(adjugate(n), solution).map((value) => k * value);
    return { n, k, b };
  },
  render: (p) => {
    const answer = inverseSolution(p).map(String);
    const across = timesVector(transposed(p.n), p.b).map((value) => value / p.k);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'The inverse of $\\mathbf{A}$ is given. Solve $\\mathbf{A}\\mathbf{x} = \\mathbf{b}$.' },
        { kind: 'display', tex: `\\mathbf{A}^{-1} = ${p.k > 1 ? `\\frac{1}{${p.k}}` : ''}${gridTex(p.n)}` },
        { kind: 'display', tex: `\\mathbf{b} = ${stackTex(p.b)}` },
      ],
      template: `x = {0} \\qquad y = {1} \\qquad z = {2}`,
      bank: bankOf(answer, [...across.filter(Number.isInteger), ...answer.map((value) => -Number(value))].map(String)),
      answer,
    };
  },
  solution: (p) => {
    const { n, k, b } = p;
    const product = timesVector(n, b);
    const right = inverseSolution(p);
    return [
      {
        text: 'Multiply both sides of $\\mathbf{A}\\mathbf{x} = \\mathbf{b}$ by $\\mathbf{A}^{-1}$ on the left: $\\mathbf{x} = \\mathbf{A}^{-1}\\mathbf{b}$.',
      },
      ...n.map((row, i) => ({ text: `Row ${i + 1}: $${productsTex(row, b)} = ${product[i]}$` })),
      ...(k > 1 ? [{ text: `Then divide each by $${k}$.` }] : []),
      { tex: `\\mathbf{x} = ${stackTex(right)}` },
      { text: 'The inverse goes on the left of $\\mathbf{b}$: $\\mathbf{b}\\mathbf{A}^{-1}$ is not even defined for a column.' },
    ];
  },
};

interface SysBackSubParams {
  /** Upper triangular: a, b, c on the first row, d, e on the second, f alone. */
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  s: number[];
  /** Which unknown the typed form asks for. */
  ask: number;
}

function backSubRows({ a, b, c, d, e, f, s }: SysBackSubParams): { coeffs: number[]; rhs: number }[] {
  return [
    { coeffs: [a, b, c], rhs: dot([a, b, c], s) },
    { coeffs: [0, d, e], rhs: dot([0, d, e], s) },
    { coeffs: [0, 0, f], rhs: f * s[2] },
  ];
}

function sampleBackSub(rng: SampleRng, difficulty: number): SysBackSubParams {
  const lead = () => rng.pick(difficulty > 1 ? [-4, -3, -2, 2, 3, 4] : [1, 2, 3, -1]);
  const other = () => nonZero(rng.int(-4, 4), 1);
  return {
    a: lead(),
    b: other(),
    c: other(),
    d: lead(),
    e: other(),
    f: lead(),
    s: [0, 1, 2].map(() => nonZero(rng.int(-6, 6), 2)),
    ask: difficulty > 1 ? 0 : rng.int(0, 1),
  };
}

function backSubSteps(p: SysBackSubParams): SolutionStep[] {
  const { a, b, c, d, e, f, s } = p;
  const [first, second, third] = backSubRows(p);
  return [
    { text: 'The system is already triangular, so start at the bottom and work up.' },
    { text: `$${termsTex([f], ['z'])} = ${third.rhs}$, so $z = ${s[2]}$.` },
    {
      text: `Put that into the middle equation: $${termsTex([d], ['y'])} + (${e})(${s[2]}) = ${second.rhs}$, so $${termsTex([d], ['y'])} = ${second.rhs - e * s[2]}$ and $y = ${s[1]}$.`,
    },
    {
      text: `Then the top one: $${termsTex([a], ['x'])} + (${b})(${s[1]}) + (${c})(${s[2]}) = ${first.rhs}$, so $${termsTex([a], ['x'])} = ${first.rhs - b * s[1] - c * s[2]}$ and $x = ${s[0]}$.`,
    },
    {
      text: 'Elimination on a full system aims for exactly this staircase shape, because from there each equation has only one new unknown in it.',
    },
  ];
}

const backSubPrompt = (p: SysBackSubParams, lead: string): Block[] => [
  { kind: 'prose', text: lead },
  { kind: 'display', tex: systemTex(backSubRows(p).map(({ coeffs, rhs }) => equationTex(coeffs, rhs))) },
];

/** A triangular system, solved from the bottom up. */
const sysBackSub: Generator<SysBackSubParams> = {
  id: 'mat-sys-back-sub',
  sample: sampleBackSub,
  render: (p) => ({
    kind: 'expression',
    prompt: backSubPrompt(p, `Solve this system by working up from the last equation. Find $${UNKNOWNS[p.ask]}$.`),
    lead: `${UNKNOWNS[p.ask]} =`,
    keypad: [],
    answer: `${p.s[p.ask]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: backSubSteps,
};

/** The same, as a tree: z feeds y, and both feed x. */
const sysBackSubTree: Generator<SysBackSubParams> = {
  id: 'mat-sys-back-sub-tree',
  sample: sampleBackSub,
  render: (p): Slide => {
    const [, second, third] = backSubRows(p);
    const answer = [p.s[2], p.s[1], p.s[0]].map(String);
    return {
      kind: 'tree',
      prompt: backSubPrompt(p, 'Solve from the bottom up: $z$ first, then $y$ using $z$, then $x$ using both.'),
      expression: 'z \\;\\to\\; y \\;\\to\\; x',
      nodes: [
        { id: 'z', from: [] },
        { id: 'y', from: ['z'] },
        { id: 'x', from: ['y', 'z'] },
      ],
      // The right-hand sides left undivided, and a sign slip on each.
      bank: bankOf(answer, [third.rhs, second.rhs - p.e * p.s[2], ...answer.map((value) => -Number(value))].map(String)),
      answer,
    };
  },
  solution: backSubSteps,
};

/* ----- systems with a parameter ----- */

/** A 3x3 with `k` standing in for the first-row entry in column `col`. */
function withK(m: Grid, col: number): (number | string)[][] {
  return m.map((row, i) => row.map((value, j) => (i === 0 && j === col ? 'k' : value)));
}

/** det = C k + R, where C is the entry's cofactor and R the rest. */
function detInK(m: Grid, col: number): { C: number; R: number } {
  const zeroed = copyGrid(m);
  zeroed[0][col] = 0;
  return { C: (col === 1 ? -1 : 1) * minorOf(m, col), R: det3(zeroed) };
}

interface SysParamParams {
  /** The entry at [0][col] is ignored: `k` stands there. */
  m: Grid;
  col: number;
}

function paramSteps({ m, col }: SysParamParams): SolutionStep[] {
  const { C, R } = detInK(m, col);
  const entries = m[0].map((value, j) => (j === col ? 'k' : `(${value})`));
  const minors = [0, 1, 2].map((c) => minorOf(m, c));
  return [
    { text: 'Expand along the first row, keeping $k$ as a letter.' },
    {
      text: `$${entries[0]}(${minors[0]}) - ${entries[1]}(${minors[1]}) + ${entries[2]}(${minors[2]})$`,
    },
    { tex: `\\det \\mathbf{A} = ${C === 1 ? '' : C === -1 ? '-' : C}k${signedTex(R)}` },
  ];
}

/** The determinant of a 3x3 with a letter in it, as an expression in k. */
const sysParamDet: Generator<SysParamParams> = {
  id: 'mat-sys-param-det',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 40; tries += 1) {
      const m = drawGrid(rng, difficulty > 1 ? 5 : 3, difficulty > 1 ? 0 : 1);
      const col = rng.int(0, 2);
      const { C, R } = detInK(m, col);
      if (C !== 0 && R !== 0) return { m, col };
    }
    return { m: [[0, 1, 2], [1, 3, 0], [2, 1, 1]], col: 0 };
  },
  render: ({ m, col }) => {
    const { C, R } = detInK(m, col);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Find the determinant of $\\mathbf{A}$ in terms of $k$.' },
        { kind: 'display', tex: `\\mathbf{A} = ${cellsTex(withK(m, col))}` },
      ],
      lead: '\\det \\mathbf{A} =',
      keypad: [{ insert: 'k', tex: true }],
      answer: `(${C})*k + (${R})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => [
    ...paramSteps(p),
    { text: 'Only the term with $k$ in it depends on $k$, so the determinant is always a straight-line function of it.' },
  ],
};

/** The value of k that makes the matrix singular. */
const sysParamK: Generator<SysParamParams> = {
  id: 'mat-sys-param-k',
  choices: ({ m, col }) => {
    const { C, R } = detInK(m, col);
    const k = -R / C;
    return signedChoices(k, [-k, R, C, -R]);
  },
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 80; tries += 1) {
      const m = drawGrid(rng, difficulty > 1 ? 5 : 3, difficulty > 1 ? 0 : 1);
      const col = rng.int(0, 2);
      const { C, R } = detInK(m, col);
      if (C !== 0 && R !== 0 && R % C === 0 && Math.abs(R / C) <= 12) return { m, col };
    }
    return { m: [[0, 1, 2], [1, 1, 0], [0, 1, 1]], col: 0 };
  },
  render: ({ m, col }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'For which value of $k$ does $\\mathbf{A}\\mathbf{x} = \\mathbf{b}$ fail to have a unique solution?',
      },
      { kind: 'display', tex: `\\mathbf{A} = ${cellsTex(withK(m, col))}` },
    ],
    lead: 'k =',
    keypad: [],
    answer: `${-detInK(m, col).R / detInK(m, col).C}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => {
    const { C, R } = detInK(p.m, p.col);
    return [
      { text: 'A unique solution needs an inverse, so find where the determinant is zero.' },
      ...paramSteps(p),
      { tex: `${C}k = ${-R} \\implies k = ${-R / C}` },
      { text: 'At any other value of $k$ the determinant is not zero and there is exactly one solution.' },
    ];
  },
};

interface SysWhichParams {
  quadratic: boolean;
  /** The values of k that make the determinant zero; one for a linear draw. */
  roots: number[];
  /** Linear: [[k, b], [c, d]]. Quadratic: [[k, q], [r, k + s]]. */
  entries: number[];
}

function whichMatrix({ quadratic, entries }: SysWhichParams): string {
  if (!quadratic) {
    const [b, c, d] = entries;
    return cellsTex([
      ['k', b],
      [c, d],
    ]);
  }
  const [q, r, s] = entries;
  return cellsTex([
    ['k', q],
    [r, `k${signedTex(s)}`],
  ]);
}

/** Which values of k leave exactly one solution: every value but the roots. */
const sysParamWhich: Generator<SysWhichParams> = {
  id: 'mat-sys-param-which',
  sample: (rng, difficulty) => {
    if (difficulty < 2) {
      const d = rng.int(1, 5);
      const t = nonZero(rng.int(-4, 4), 2);
      const c = nonZero(rng.int(-6, 6), 3);
      return { quadratic: false, roots: [c * t], entries: [d * t, c, d] };
    }
    for (let tries = 0; tries < 40; tries += 1) {
      const [k1, k2] = rng.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], 2).sort((x, y) => x - y);
      // Roots of opposite sign and equal size would make "k is neither of
      // these" and "k is neither of their negatives" the same statement.
      if (k1 + k2 === 0) continue;
      const product = -k1 * k2;
      const divisors = [1, 2, 3, 4, 5, 6].filter((n) => product % n === 0 && Math.abs(product / n) <= 9);
      if (divisors.length === 0) continue;
      const q = rng.pick(divisors) * rng.sign();
      return { quadratic: true, roots: [k1, k2], entries: [q, product / q, -(k1 + k2)] };
    }
    return { quadratic: true, roots: [-2, 3], entries: [2, 3, -1] };
  },
  render: (p): Slide => {
    const { roots } = p;
    const right = roots.map((k) => `k \\neq ${k}`).join(' \\text{ and } ');
    const { options: offered, correctId } = slotted(
      right,
      [
        roots.map((k) => `k = ${k}`).join(' \\text{ or } '),
        roots.map((k) => `k \\neq ${-k}`).join(' \\text{ and } '),
        '\\text{every value of } k',
      ],
      `${p.entries.join(',')}|${roots.join(',')}`,
    );
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: 'For which values of $k$ does $\\mathbf{A}\\mathbf{x} = \\mathbf{b}$ have exactly one solution?',
        },
        { kind: 'display', tex: `\\mathbf{A} = ${whichMatrix(p)}` },
      ],
      options: offered,
      correctId,
    };
  },
  solution: (p) => {
    const { quadratic, roots, entries } = p;
    if (!quadratic) {
      const [b, c, d] = entries;
      return [
        { text: 'Exactly one solution needs a non-zero determinant.' },
        { text: `$\\det \\mathbf{A} = ${d}k - (${b})(${c}) = ${d === 1 ? '' : d}k${signedTex(-b * c)}$` },
        { text: `That is zero only at $k = ${roots[0]}$, so every other value of $k$ gives exactly one solution.` },
      ];
    }
    const [q, r, s] = entries;
    const [k1, k2] = roots;
    return [
      { text: 'Exactly one solution needs a non-zero determinant.' },
      {
        text: `$\\det \\mathbf{A} = k(k${signedTex(s)}) - (${q})(${r}) = k^2${s === 0 ? '' : `${s < 0 ? ' -' : ' +'} ${Math.abs(s) === 1 ? '' : Math.abs(s)}k`}${signedTex(-q * r)}$`,
      },
      { tex: `= (k${signedTex(-k1)})(k${signedTex(-k2)})` },
      {
        text: `That is zero at $k = ${k1}$ and at $k = ${k2}$. Every other value of $k$ gives exactly one solution, so both have to be ruled out.`,
      },
    ];
  },
};

interface SysOutcomeParams {
  c: number;
  d: number;
  t: number;
  q0: number;
}

/** First the k that makes the system singular, then the q that rescues it. */
const sysParamOutcome: Generator<SysOutcomeParams> = {
  id: 'mat-sys-param-outcome',
  sample: (rng, difficulty) => ({
    c: nonZero(rng.int(-6, 6), 2),
    d: difficulty > 1 ? nonZero(rng.int(-5, 5), 3) : rng.int(1, 5),
    t: rng.pick(difficulty > 1 ? [-4, -3, -2, 2, 3, 4] : [2, 3, 4]),
    q0: nonZero(rng.int(-9, 9), 4),
  }),
  render: ({ c, d, t, q0 }) => {
    const answer = [`${c * t}`, `${q0}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Find the value of $k$ that stops this system having a unique solution. Then find the value of $q$ that gives it infinitely many solutions rather than none.',
        },
        {
          kind: 'display',
          tex: systemTex([`kx${d * t < 0 ? ' -' : ' +'} ${Math.abs(d * t) === 1 ? '' : Math.abs(d * t)}y = ${t * q0}`, equationTex([c, d], 'q')]),
        },
      ],
      template: `k = {0} \\qquad q = {1}`,
      bank: bankOf(answer, [`${-c * t}`, `${t * q0}`, `${t * t * q0}`, `${c}`, `${-q0}`]),
      answer,
    };
  },
  solution: ({ c, d, t, q0 }) => [
    { text: `The determinant is $${d}k - (${d * t})(${c})$, which is zero when $k = ${c * t}$.` },
    {
      text: `At that value the first left-hand side is $${t}$ times the second: $${c * t}x + ${br(d * t)}y = ${t}(${termsTex([c, d], UNKNOWNS)})$.`,
    },
    {
      text: `So the equations agree only if $${t * q0} = ${t}q$, which gives $q = ${q0}$. Any other $q$ makes them contradict each other.`,
    },
  ],
};

/* ---------- Level 11: invariant lines and points (roadmap batch B36) ---------- */

/**
 * Every matrix here is built outward from its answer. Pick the gradients m1
 * and m2 the two invariant lines through the origin should have, a non-zero
 * t and any a, and
 *
 *   M = (a, t; -t m1 m2, a + t(m1 + m2))
 *
 * sends (1, m) to (a + tm)(1, m) for both of them, because substituting
 * y = mx leaves t(m - m1)(m - m2) = 0. So the gradients, the factor each
 * line's points are multiplied by and every entry are whole. Choosing a so
 * that one factor is 1 makes that line a line of invariant points.
 *
 * It is PDP^-1 with (1, m1) and (1, m2) as the columns of P, but the level is
 * about lines: eigenvalues stay on the roadmap's reserve bench, and nothing a
 * learner reads calls them that.
 */
interface Invariant {
  m: Matrix;
  /** The gradients of the two invariant lines through O. */
  g: [number, number];
  /** What each line's points are multiplied by: M(1, g) = s(1, g). */
  s: [number, number];
}

function invariantMatrix(a: number, t: number, m1: number, m2: number): Invariant {
  return { m: [a, t, -t * m1 * m2, a + t * (m1 + m2)], g: [m1, m2], s: [a + t * m1, a + t * m2] };
}

/**
 * Two invariant lines through O with whole gradients and non-zero factors.
 *
 * `unit` pins one line's factor to 1, making it a line of invariant points;
 * otherwise neither factor is 1, so the origin is the only invariant point.
 */
function drawInvariant(rng: SampleRng, difficulty: number, unit: 'none' | 'first' | 'second' = 'none'): Invariant {
  const wide = difficulty > 1;
  const cap = wide ? 12 : 8;
  for (let tries = 0; tries < 200; tries += 1) {
    const t = rng.pick(wide ? [-3, -2, -1, 1, 2, 3] : [-2, -1, 1, 2]);
    const m1 = rng.int(wide ? -4 : -3, wide ? 4 : 3);
    const m2 = m1 + nonZero(rng.int(wide ? -3 : -2, wide ? 3 : 2), 1);
    const a = unit === 'first' ? 1 - t * m1 : unit === 'second' ? 1 - t * m2 : rng.int(-4, 4);
    const inv = invariantMatrix(a, t, m1, m2);
    if (inv.m.some((v) => Math.abs(v) > cap) || inv.s.includes(0)) continue;
    if (unit === 'none' && inv.s.includes(1)) continue;
    return inv;
  }
  if (unit === 'first') return invariantMatrix(0, 1, 1, 2);
  if (unit === 'second') return invariantMatrix(3, -1, 1, 2);
  return invariantMatrix(3, 1, 1, -1);
}

/** `3x`, `-x`, `x`: a gradient in front of its letter, and nothing for zero. */
function slopeTex(m: number, v = 'x'): string {
  return m === 0 ? '' : `${m === 1 ? '' : m === -1 ? '-' : m}${v}`;
}

/** A line as the learner reads it: `y = 3x - 2`, `y = -x`, `y = 4`. */
function yLine(m: number, c = 0): string {
  const slope = slopeTex(m);
  return slope === '' ? `y = ${c}` : `y = ${slope}${signedTex(c)}`;
}

/** The same line in mathjs syntax, for an answer. Never displayed. */
const yAnswer = (m: number, c = 0) => `(${m})*x + (${c})`;

/** `y = 3x + c`: every line of one gradient, the intercept left as a letter. */
function familyTex(m: number): string {
  const slope = slopeTex(m);
  return slope === '' ? 'y = c' : `y = ${slope} + c`;
}

/** `2 - 3m`: a number and a multiple of a letter. */
function linTex(p: number, q: number, v: string): string {
  if (q === 0) return `${p}`;
  const term = `${Math.abs(q) === 1 ? '' : Math.abs(q)}${v}`;
  if (p === 0) return `${q < 0 ? '-' : ''}${term}`;
  return `${p} ${q < 0 ? '-' : '+'} ${term}`;
}

/** `3m^2 - 2m + 5`, highest power first, zero terms left out. */
function polyTex(coeffs: number[], v: string): string {
  const top = coeffs.length - 1;
  let out = '';
  coeffs.forEach((c, idx) => {
    if (c === 0) return;
    const power = top - idx;
    const name = power === 0 ? '' : power === 1 ? v : `${v}^${power}`;
    const size = Math.abs(c) === 1 && name !== '' ? '' : `${Math.abs(c)}`;
    out += out === '' ? `${c < 0 ? '-' : ''}${size}${name}` : ` ${c < 0 ? '-' : '+'} ${size}${name}`;
  });
  return out === '' ? '0' : out;
}

/** `M (x, y) = (x', y')`, worked out. */
function mapsTex(m: Matrix, x: number, y: number): string {
  const [u, v] = apply(m, x, y);
  return `${texOf(m)} ${columnTex(x, y)} = ${columnTex(u, v)}`;
}

/** The matrix with 1 taken off each diagonal entry. */
const minusI = (m: Matrix): Matrix => [m[0] - 1, m[1], m[2], m[3] - 1];

const M_TEX = (m: Matrix) => `\\mathbf{M} = ${texOf(m)}`;

/**
 * The right option and three slips, turned by a number from the question.
 *
 * `choiceVariant` places the answer by hashing the option labels, and slips
 * that differ from the answer only by a sign hash alike, which piled the
 * answer into one or two slots. Which slips are kept, and in what order,
 * varying with the question spreads it out again.
 */
function upToFour(key: number, correct: Omit<ChoiceOption, 'correct'>, ...slips: Omit<ChoiceOption, 'correct'>[]) {
  const turn = Math.abs(key) % slips.length;
  return options(correct, ...slips.slice(turn), ...slips.slice(0, turn)).slice(0, 4);
}

/* ----- invariant points ----- */

interface InvPointWhichParams {
  inv: Invariant;
  k: number;
}

/**
 * Which point stays put, tested by multiplying.
 *
 * One distractor is always on the *other* invariant line: it stays on its
 * line through O but moves along it, which is the distinction the last
 * lesson of the level is about. The rest are near misses, and every one is
 * checked against the line of invariant points rather than trusted.
 */
const invPointWhich: Generator<InvPointWhichParams> = {
  id: 'mat-inv-point-which',
  sample: (rng, difficulty) => ({
    inv: drawInvariant(rng, difficulty, 'first'),
    k: nonZero(rng.int(-3, 3), 2),
  }),
  render: ({ inv, k }): Slide => {
    const [m1, m2] = inv.g;
    const wrong = [
      [k, k * m2],
      [k, k * m1 + 1],
      [k * m1, k],
      [-k, k * m1],
      [k + 1, k * m1 - 1],
    ]
      .filter(([x, y]) => y !== m1 * x)
      .map(([x, y]) => pairTex(x, y));
    const { options: offered, correctId } = slotted(pairTex(k, k * m1), wrong, `${inv.m.join(',')}|${k}`);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Which of these points is invariant under $\\mathbf{M}$?' },
        { kind: 'display', tex: M_TEX(inv.m) },
      ],
      options: offered,
      correctId,
    };
  },
  solution: ({ inv, k }) => {
    const [m1, m2] = inv.g;
    const s2 = inv.s[1];
    return [
      { text: 'A point is invariant when $\\mathbf{M}$ sends it to itself. Multiply each one by $\\mathbf{M}$ and look for the one that comes back unchanged.' },
      { tex: mapsTex(inv.m, k, k * m1) },
      { text: `So $${pairTex(k, k * m1)}$ stays exactly where it is.` },
      {
        text: `The trap is $${pairTex(k, k * m2)}$. It lands on $${pairTex(s2 * k, s2 * k * m2)}$: on the same line through $O$, but $${s2}$ times as far out. It moves, so it is not invariant.`,
      },
    ];
  },
};

interface InvPointSliderParams {
  inv: Invariant;
  x0: number;
}

/**
 * The missing coordinate of an invariant point, found from one row of Mp = p.
 *
 * The line of invariant points is never y = 0 here, so the answer is never
 * zero, where the handle rests.
 */
const invPointSlider: Generator<InvPointSliderParams> = {
  id: 'mat-inv-point-slider',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 60; tries += 1) {
      const inv = drawInvariant(rng, difficulty, 'first');
      const x0 = nonZero(rng.int(-3, 3), 1);
      const y0 = inv.g[0] * x0;
      if (y0 !== 0 && Math.abs(y0) <= 7) return { inv, x0 };
    }
    return { inv: invariantMatrix(-1, 1, 2, 3), x0: 2 };
  },
  render: ({ inv, x0 }): Slide => {
    const y0 = inv.g[0] * x0;
    const span = spanFor(x0, y0);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The point $(${x0}, \\; y)$ is invariant under $\\mathbf{M}$. The dot marks $x = ${x0}$ on the axis. Slide to $y$.`,
        },
        { kind: 'display', tex: M_TEX(inv.m) },
      ],
      min: -(span - 1),
      max: span - 1,
      step: 1,
      answer: y0,
      readout: 'y = {v}',
      figure: {
        svg: transformGridSvg({
          span,
          marks: [{ x: x0, y: 0 }],
          label: `Squared paper with a dot at x = ${x0} on the x-axis`,
        }),
        xMin: -span,
        xMax: span,
        axis: 'y',
      },
    };
  },
  solution: ({ inv, x0 }) => {
    const [a, b] = inv.m;
    const y0 = inv.g[0] * x0;
    return [
      { text: `Invariant means $\\mathbf{M}$ sends $(${x0}, y)$ to itself. The top row of that multiplication has to give back the $x$-coordinate, $${x0}$.` },
      { tex: `${a}(${x0}) ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}y = ${x0}` },
      { text: Math.abs(b) === 1 ? `So $y = ${y0}$.` : `So $${b}y = ${x0 - a * x0}$, and $y = ${y0}$.` },
      { text: 'Check it with the whole multiplication:' },
      { tex: mapsTex(inv.m, x0, y0) },
    ];
  },
};

type PointRoute = 'identity' | 'line' | 'origin';

interface InvPointFlowParams {
  m: Matrix;
}

/** The standard matrices with a line of fixed points, for variety beside the built ones. */
function drawFixedLine(rng: SampleRng): Matrix {
  const s = nonZero(rng.int(-4, 4), 2);
  const k = rng.pick([-3, -2, 2, 3, 4]);
  return rng.pick<Matrix>([
    STANDARD['refl-x'].matrix,
    STANDARD['refl-y'].matrix,
    STANDARD['refl-yx'].matrix,
    STANDARD['refl-ynx'].matrix,
    [1, s, 0, 1],
    [1, 0, s, 1],
    [k, 0, 0, 1],
    [1, 0, 0, k],
  ]);
}

/** A matrix with det(M - I) not zero, so the origin is its only invariant point. */
function drawOriginOnly(rng: SampleRng, difficulty: number): Matrix {
  const span = difficulty > 1 ? 6 : 4;
  for (let tries = 0; tries < 60; tries += 1) {
    const m: Matrix = [rng.int(-span, span), rng.int(-span, span), rng.int(-span, span), rng.int(-span, span)];
    if (detOf(minusI(m)) !== 0 && detOf(m) !== 0) return m;
  }
  return [2, 1, 1, 3];
}

function pointRoute(m: Matrix): PointRoute {
  if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1) return 'identity';
  return detOf(minusI(m)) === 0 ? 'line' : 'origin';
}

/** Whether a matrix has a line of invariant points, decided by det(M - I). */
const invPointFlow: Generator<InvPointFlowParams> = {
  id: 'mat-inv-point-flow',
  sample: (rng, difficulty) => {
    const r = rng.next();
    if (r < 0.06) return { m: [1, 0, 0, 1] };
    if (r < 0.53) return { m: rng.chance(0.35) ? drawFixedLine(rng) : drawInvariant(rng, difficulty, 'first').m };
    return { m: rng.chance(0.3) ? drawInvariant(rng, difficulty).m : drawOriginOnly(rng, difficulty) };
  },
  render: ({ m }): Slide => {
    const route = pointRoute(m);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Work down the questions to find which points $\\mathbf{M}$ leaves where they are.' }],
      subject: M_TEX(m),
      steps: [
        {
          id: 'identity',
          ask: 'Is $\\mathbf{M}$ the identity matrix?',
          branches: [
            { label: 'Yes', outcome: 'Every point in the plane is invariant.' },
            { label: 'No', to: 'det' },
          ],
        },
        {
          id: 'det',
          ask: 'Work out $\\det(\\mathbf{M} - \\mathbf{I})$. Is it zero?',
          branches: [
            { label: 'Yes', outcome: 'A whole line of points through $O$ is invariant.' },
            { label: 'No', outcome: 'Only the origin is invariant.' },
          ],
        },
      ],
      answer: route === 'identity' ? ['Yes'] : route === 'line' ? ['No', 'Yes'] : ['No', 'No'],
    };
  },
  solution: ({ m }) => {
    const route = pointRoute(m);
    if (route === 'identity') {
      return [{ text: 'The identity sends every point to itself, so every point is invariant. That is the only matrix for which this is true.' }];
    }
    const n = minusI(m);
    return [
      { text: 'An invariant point solves $(\\mathbf{M} - \\mathbf{I})\\mathbf{p} = \\mathbf{0}$. Subtract 1 from each diagonal entry.' },
      { tex: `\\mathbf{M} - \\mathbf{I} = ${texOf(n)}` },
      { text: `$\\det(\\mathbf{M} - \\mathbf{I}) = (${n[0]})(${n[3]}) - (${n[1]})(${n[2]}) = ${detOf(n)}$.` },
      {
        text:
          route === 'line'
            ? 'It is zero, so the two equations are the same line through $O$, and every point on it is invariant.'
            : 'It is not zero, so $\\mathbf{M} - \\mathbf{I}$ has an inverse and the only solution is $\\mathbf{p} = \\mathbf{0}$: the origin alone.',
      },
    ];
  },
};

interface InvPointDetParams {
  m: Matrix;
}

function samplePointDet(rng: SampleRng, difficulty: number): InvPointDetParams {
  if (rng.chance(0.3)) return { m: drawInvariant(rng, difficulty, 'first').m };
  const span = difficulty > 1 ? 7 : 5;
  const m: Matrix = [
    rng.int(-span + 1, span),
    nonZero(rng.int(-span, span), 2),
    nonZero(rng.int(-span, span), -3),
    rng.int(-span + 1, span),
  ];
  return { m };
}

function pointDetSteps(m: Matrix): SolutionStep[] {
  const n = minusI(m);
  const det = detOf(n);
  return [
    { text: 'Subtract 1 from each entry on the leading diagonal, and leave the other two alone.' },
    { tex: `\\mathbf{M} - \\mathbf{I} = ${texOf(n)}` },
    { text: `Then $(${n[0]})(${n[3]}) - (${m[1]})(${m[2]}) = ${n[0] * n[3]} - ${br(m[1] * m[2])} = ${det}$.` },
    {
      text:
        det === 0
          ? 'It is zero, so $\\mathbf{M}$ has a whole line of invariant points through the origin.'
          : 'It is not zero, so the origin is the only invariant point.',
    },
  ];
}

/** det(M - I), the number that decides whether there is a line of invariant points. */
const invPointDet: Generator<InvPointDetParams> = {
  id: 'mat-inv-point-det',
  choices: ({ m }) => {
    const [a, b, c, d] = m;
    return signedChoices((a - 1) * (d - 1) - b * c, [
      a * d - b * c,
      (a - 1) * (d - 1) + b * c,
      (a + 1) * (d + 1) - b * c,
      a * d - b * c - 1,
    ]);
  },
  sample: samplePointDet,
  render: ({ m }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find $\\det(\\mathbf{M} - \\mathbf{I})$.' },
      { kind: 'display', tex: M_TEX(m) },
    ],
    lead: '\\det(\\mathbf{M} - \\mathbf{I}) =',
    keypad: [],
    answer: `${detOf(minusI(m))}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ m }) => pointDetSteps(m),
};

/** The same determinant as a tree: the two diagonal entries, their product, bc, the difference. */
const invPointDetTree: Generator<InvPointDetParams> = {
  id: 'mat-inv-point-det-tree',
  sample: samplePointDet,
  render: ({ m }): Slide => {
    const [a, b, c, d] = m;
    const product = (a - 1) * (d - 1);
    const answer = [a - 1, d - 1, b * c, product, product - b * c].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Top row: the two diagonal entries of $\\mathbf{M} - \\mathbf{I}$, then $bc$. Next, the product of the diagonal. Bottom: $\\det(\\mathbf{M} - \\mathbf{I})$.',
        },
        { kind: 'display', tex: M_TEX(m) },
      ],
      expression: `(${a} - 1)(${d} - 1) - (${b})(${c})`,
      nodes: [
        { id: 'a', from: [] },
        { id: 'd', from: [] },
        { id: 'bc', from: [] },
        { id: 'ad', from: ['a', 'd'] },
        { id: 'det', from: ['ad', 'bc'] },
      ],
      bank: bankOf(answer, [a + 1, d + 1, -b * c, product + b * c, a * d].map(String)),
      answer,
    };
  },
  solution: ({ m }) => pointDetSteps(m),
};

interface InvPointLineParams {
  inv: Invariant;
}

/** The line of invariant points, read from the top row of M - I. */
const invPointLine: Generator<InvPointLineParams> = {
  id: 'mat-inv-point-line',
  choices: ({ inv }) => {
    const [m1, m2] = inv.g;
    return upToFour(
      inv.m[0] + 3 * inv.m[1] + 7 * inv.m[2],
      { tex: yLine(m1), answer: yAnswer(m1) },
      { tex: yLine(m2), answer: yAnswer(m2) },
      { tex: yLine(-m1), answer: yAnswer(-m1) },
      { tex: yLine(m1 + 1), answer: yAnswer(m1 + 1) },
      { tex: yLine(-m2), answer: yAnswer(-m2) },
      { tex: yLine(m1 - 1), answer: yAnswer(m1 - 1) },
    );
  },
  sample: (rng, difficulty) => ({ inv: drawInvariant(rng, difficulty, 'first') }),
  render: ({ inv }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: '$\\mathbf{M}$ has a line of invariant points through the origin. Find its equation.' },
      { kind: 'display', tex: M_TEX(inv.m) },
    ],
    lead: 'y =',
    keypad: [{ insert: 'x', tex: true }],
    answer: yAnswer(inv.g[0]),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ inv }) => {
    const n = minusI(inv.m);
    const m1 = inv.g[0];
    return [
      { text: 'An invariant point solves $(\\mathbf{M} - \\mathbf{I})\\mathbf{p} = \\mathbf{0}$.' },
      { tex: `\\mathbf{M} - \\mathbf{I} = ${texOf(n)}` },
      { text: `The top row says $${termsTex([n[0], n[1]], ['x', 'y'])} = 0$, which rearranges to $${yLine(m1)}$.` },
      { text: `The bottom row, $${termsTex([n[2], n[3]], ['x', 'y'])} = 0$, is the same line: with a zero determinant the two rows always agree.` },
      { text: 'Check a point on it:' },
      { tex: mapsTex(inv.m, 1, m1) },
    ];
  },
};

/* ----- invariant lines through the origin ----- */

interface InvLineWhichParams {
  inv: Invariant;
  pick: 0 | 1;
}

/** Which of four lines through O is invariant: tested by where (1, m) goes. */
const invLineWhich: Generator<InvLineWhichParams> = {
  id: 'mat-inv-line-which',
  sample: (rng, difficulty) => ({ inv: drawInvariant(rng, difficulty), pick: rng.pick([0, 1] as const) }),
  render: ({ inv, pick }): Slide => {
    const right = inv.g[pick];
    const other = inv.g[1 - pick];
    const wrong = [-right, right + other, -other, right + 1, right - 1, 2 * right, right + 2, right - 2]
      .filter((w) => w !== right && w !== other)
      .map((w) => yLine(w));
    const { options: offered, correctId } = slotted(yLine(right), wrong, `${inv.m.join(',')}|${pick}`);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Which of these lines is invariant under $\\mathbf{M}$?' },
        { kind: 'display', tex: M_TEX(inv.m) },
      ],
      options: offered,
      correctId,
    };
  },
  solution: ({ inv, pick }) => {
    const g = inv.g[pick];
    const s = inv.s[pick];
    const miss = [-g, g + inv.g[1 - pick], g + 1, g - 1].find((w) => w !== g && w !== inv.g[1 - pick]) ?? g - 1;
    const [p, q] = apply(inv.m, 1, miss);
    return [
      { text: 'The line $y = mx$ is invariant when $\\mathbf{M}$ sends $(1, m)$, a point on it, back onto it: to a multiple of $(1, m)$.' },
      { tex: mapsTex(inv.m, 1, g) },
      { text: `That is $${s}$ times $${pairTex(1, g)}$, so $${yLine(g)}$ maps onto itself.` },
      {
        text: `Against that, $(1, ${miss})$ goes to $${pairTex(p, q)}$, and $${q} \\neq ${miss} \\times ${br(p)}$, so $${yLine(miss)}$ is turned onto a different line.`,
      },
    ];
  },
};

interface InvLineStretchParams {
  inv: Invariant;
  pick: 0 | 1;
}

/**
 * The factor points on an invariant line are multiplied by, dragged to on
 * the picture: the arrow is (1, m), and its image lies along the same line.
 */
const invLineStretch: Generator<InvLineStretchParams> = {
  id: 'mat-inv-line-stretch',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 60; tries += 1) {
      const inv = drawInvariant(rng, difficulty);
      const pick = rng.pick([0, 1] as const);
      if (Math.abs(inv.s[pick]) <= 6 && Math.abs(inv.g[pick]) <= 5) return { inv, pick };
    }
    return { inv: invariantMatrix(3, 1, 1, -1), pick: 0 };
  },
  render: ({ inv, pick }): Slide => {
    const g = inv.g[pick];
    const s = inv.s[pick];
    const span = spanFor(s, g);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The line $${yLine(g)}$ is invariant under $\\mathbf{M}$, and the arrow ends at $(1, ${g})$, a point on it. Its image is on the same line. Slide to the image's $x$-coordinate.`,
        },
        { kind: 'display', tex: M_TEX(inv.m) },
      ],
      min: -(span - 1),
      max: span - 1,
      step: 1,
      answer: s,
      readout: `x\\text{-coordinate of the image} = {v}`,
      figure: {
        svg: transformGridSvg({
          span,
          arrows: [{ x: 1, y: g, label: 'v', accent: true }],
          label: `Squared paper with an arrow from the origin to (1, ${g})`,
        }),
        xMin: -span,
        xMax: span,
        axis: 'x',
      },
    };
  },
  solution: ({ inv, pick }) => {
    const g = inv.g[pick];
    const s = inv.s[pick];
    return [
      { text: `Multiply $(1, ${g})$ by $\\mathbf{M}$.` },
      { tex: mapsTex(inv.m, 1, g) },
      {
        text: `That is $${s}$ times $(1, ${g})$, so the image's $x$-coordinate is $${s}$. Every point on $${yLine(g)}$ is multiplied by $${s}$: ${s < 0 ? 'it is sent through $O$ to the other side, still on the line' : s === 1 ? 'nothing moves' : 'it slides along the line, away from or towards $O$'}.`,
      },
    ];
  },
};

interface InvLineQuadParams {
  inv: Invariant;
}

/** The quadratic in m, expanded from c + dm = m(a + bm). */
const invLineQuad: Generator<InvLineQuadParams> = {
  id: 'mat-inv-line-quad',
  choices: ({ inv }) => {
    const [a, b, c, d] = inv.m;
    const as = (p: number, q: number, r: number) => `(${p})*m^2 + (${q})*m + (${r})`;
    return upToFour(
      a + 3 * b + 7 * c + 11 * d,
      { tex: polyTex([b, a - d, -c], 'm'), answer: as(b, a - d, -c) },
      { tex: polyTex([b, d - a, -c], 'm'), answer: as(b, d - a, -c) },
      { tex: polyTex([b, a - d, c], 'm'), answer: as(b, a - d, c) },
      { tex: polyTex([c, a - d, -b], 'm'), answer: as(c, a - d, -b) },
      { tex: polyTex([b, a + d, -c], 'm'), answer: as(b, a + d, -c) },
    );
  },
  sample: (rng, difficulty) => ({ inv: drawInvariant(rng, difficulty) }),
  render: ({ inv }) => {
    const [a, b, c, d] = inv.m;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$\\mathbf{M}$ sends $(1, m)$ to $(${linTex(a, b, 'm')}, \\; ${linTex(c, d, 'm')})$. The line $y = mx$ is invariant when the second is $m$ times the first. Expand and simplify:`,
        },
        { kind: 'display', tex: M_TEX(inv.m) },
      ],
      lead: `m(${linTex(a, b, 'm')}) - (${linTex(c, d, 'm')}) =`,
      keypad: [{ insert: 'm', tex: true }, { insert: '^' }],
      answer: `(${b})*m^2 + (${a - d})*m + (${-c})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ inv }) => {
    const [a, b, c, d] = inv.m;
    const [m1, m2] = inv.g;
    return [
      { text: `Expand the bracket: $m(${linTex(a, b, 'm')}) = ${polyTex([b, a, 0], 'm')}$.` },
      { text: `Take away $${linTex(c, d, 'm')}$ and collect like terms:` },
      { tex: polyTex([b, a - d, -c], 'm') },
      {
        text: `Set to zero, it factorises as $${b === 1 ? '' : b === -1 ? '-' : b}(m${signedTex(-m1)})(m${signedTex(-m2)}) = 0$, so the invariant lines through $O$ are $${yLine(m1)}$ and $${yLine(m2)}$.`,
      },
    ];
  },
};

/** Both gradients, from the quadratic solved. */
const invLineGradients: Generator<InvLineQuadParams> = {
  id: 'mat-inv-line-gradients',
  sample: (rng, difficulty) => ({ inv: drawInvariant(rng, difficulty) }),
  render: ({ inv }) => {
    const [m1, m2] = inv.g;
    const answer = [m1, m2].map(String);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Find the gradients of the two invariant lines through the origin.' },
        { kind: 'display', tex: M_TEX(inv.m) },
      ],
      template: 'm = {0} \\quad \\text{or} \\quad m = {1}',
      bank: bankOf(answer, [-m1, -m2, m1 + m2, inv.s[0]].map(String)),
      answer,
      unordered: true,
    };
  },
  solution: ({ inv }) => {
    const [a, b, c, d] = inv.m;
    const [m1, m2] = inv.g;
    return [
      { text: `$(1, m)$ goes to $(${linTex(a, b, 'm')}, \\; ${linTex(c, d, 'm')})$. For $y = mx$ to be invariant the second must be $m$ times the first:` },
      { tex: `${linTex(c, d, 'm')} = m(${linTex(a, b, 'm')})` },
      { tex: `${polyTex([b, a - d, -c], 'm')} = 0` },
      { text: `That factorises as $${b === 1 ? '' : b === -1 ? '-' : b}(m${signedTex(-m1)})(m${signedTex(-m2)}) = 0$, so $m = ${m1}$ or $m = ${m2}$.` },
      { text: `The invariant lines through $O$ are $${yLine(m1)}$ and $${yLine(m2)}$.` },
    ];
  },
};

/* ----- the standard transformations ----- */

interface NamedParams {
  t: Transform;
  phrase: number;
}

function drawTransform(rng: SampleRng, difficulty: number): Transform {
  const kind = rng.pick(['standard', 'standard', 'enlarge', 'stretch-x', 'stretch-y', 'stretch-xy'] as const);
  const top = difficulty > 1 ? 6 : 4;
  switch (kind) {
    case 'standard':
      return { kind: 'standard', key: rng.pick(STANDARD_KEYS) };
    case 'enlarge':
      return { kind: 'enlarge', k: rng.pick(difficulty > 1 ? [-4, -3, -2, 2, 3, 4, 5] : [-2, 2, 3, 4]) };
    case 'stretch-x':
      return { kind: 'stretch-x', k: rng.int(2, top) };
    case 'stretch-y':
      return { kind: 'stretch-y', k: rng.int(2, top) };
    case 'stretch-xy': {
      const [k, q] = rng.sample([2, 3, 4, 5], 2);
      return { kind: 'stretch-xy', k, q };
    }
  }
}

function drawNamed(rng: SampleRng, difficulty: number): NamedParams {
  const t = drawTransform(rng, difficulty);
  return { t, phrase: rng.int(0, phraseCount(t) - 1) };
}

/** A phrase at the start of a sentence. */
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type LineSet = 'every' | 'none' | 'axes' | 'x-axis' | 'y-axis' | 'diagonals' | 'y=x' | 'y=-x';

const LINE_SET: Record<LineSet, string> = {
  every: '\\text{Every line through } O',
  none: '\\text{No line through } O',
  axes: '\\text{The } x\\text{-axis and the } y\\text{-axis}',
  'x-axis': '\\text{Only the } x\\text{-axis}',
  'y-axis': '\\text{Only the } y\\text{-axis}',
  diagonals: 'y = x \\text{ and } y = -x',
  'y=x': '\\text{Only } y = x',
  'y=-x': '\\text{Only } y = -x',
};

/** The invariant lines through O, and the answers each transformation is mistaken for. */
function lineSetOf(t: Transform): { right: LineSet; wrong: LineSet[]; why: string } {
  if (t.kind === 'enlarge') {
    return {
      right: 'every',
      wrong: ['none', 'axes', 'diagonals'],
      why: `An enlargement about $O$ moves every point straight along its own line through $O$${t.k < 0 ? ', through $O$ and out the other side' : ''}. So every line through $O$ maps onto itself.`,
    };
  }
  if (t.kind === 'stretch-x' || t.kind === 'stretch-y') {
    const along = t.kind === 'stretch-x' ? 'x' : 'y';
    const fixed = t.kind === 'stretch-x' ? 'y' : 'x';
    return {
      right: 'axes',
      wrong: t.kind === 'stretch-x' ? ['y-axis', 'x-axis', 'every'] : ['x-axis', 'y-axis', 'every'],
      why: `The $${along}$-axis is stretched along itself, and the $${fixed}$-axis does not move at all, so both are invariant. Any other line through $O$ has its gradient changed.`,
    };
  }
  if (t.kind === 'stretch-xy') {
    return {
      right: 'axes',
      wrong: ['every', 'none', 'diagonals'],
      why: 'Each axis is stretched along itself, so both are invariant. A line between them has its gradient changed, because the two scale factors differ.',
    };
  }
  switch (t.key) {
    case 'rot90':
    case 'rot270':
      return {
        right: 'none',
        wrong: ['every', 'diagonals', 'axes'],
        why: 'A quarter turn swings every line through $O$ round by $90^\\circ$, onto a different line. None lands on itself.',
      };
    case 'rot180':
      return {
        right: 'every',
        wrong: ['none', 'axes', 'diagonals'],
        why: 'A half turn sends $(x, y)$ to $(-x, -y)$, which is on the same line through $O$. Every line through $O$ is invariant, turned end to end.',
      };
    case 'refl-x':
    case 'refl-y': {
      const mirror = t.key === 'refl-x' ? 'x' : 'y';
      const across = t.key === 'refl-x' ? 'y' : 'x';
      return {
        right: 'axes',
        wrong: [t.key === 'refl-x' ? 'x-axis' : 'y-axis', 'every', 'none'],
        why: `The mirror, the $${mirror}$-axis, stays put. The $${across}$-axis is perpendicular to it and is flipped end to end onto itself. Every other line through $O$ is turned to a new angle.`,
      };
    }
    case 'refl-yx':
    case 'refl-ynx': {
      const mirror = t.key === 'refl-yx' ? 'y = x' : 'y = -x';
      const across = t.key === 'refl-yx' ? 'y = -x' : 'y = x';
      return {
        right: 'diagonals',
        wrong: [t.key === 'refl-yx' ? 'y=x' : 'y=-x', 'axes', 'none'],
        why: `The mirror, $${mirror}$, stays put. The line $${across}$ is perpendicular to it and is flipped end to end onto itself. Every other line through $O$ changes angle.`,
      };
    }
  }
}

/** Which lines through O a named transformation leaves invariant. */
const invStdLines: Generator<NamedParams> = {
  id: 'mat-inv-std-lines',
  sample: drawNamed,
  render: ({ t, phrase }): Slide => {
    const { right, wrong } = lineSetOf(t);
    const { options: offered, correctId } = slotted(
      LINE_SET[right],
      wrong.map((key) => LINE_SET[key]),
      `${nameOf(t)}|${phrase}`,
    );
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which lines through the origin are invariant under ${phraseOf(t, phrase)}?` }],
      options: offered,
      correctId,
    };
  },
  solution: ({ t, phrase }) => [
    { text: 'A line through $O$ is invariant when every point on it lands back on the same line. It does not have to stay where it is.' },
    { text: lineSetOf(t).why },
    { text: `As a check, the matrix of ${phraseOf(t, phrase)} is $${texOf(matrixOf(t))}$, and it sends $(1, 1)$ to $${pairTex(...apply(matrixOf(t), 1, 1))}$.` },
  ],
};

type PointSet = 'origin' | 'all' | 'x-axis' | 'y-axis' | 'y=x' | 'y=-x';

const POINT_SET: Record<PointSet, string> = {
  origin: '\\text{Only the origin}',
  all: '\\text{Every point}',
  'x-axis': '\\text{Every point on the } x\\text{-axis}',
  'y-axis': '\\text{Every point on the } y\\text{-axis}',
  'y=x': '\\text{Every point on } y = x',
  'y=-x': '\\text{Every point on } y = -x',
};

/** The invariant points, and what each transformation's are mistaken for. */
function pointSetOf(t: Transform): { right: PointSet; wrong: PointSet[]; why: string } {
  if (t.kind === 'enlarge') {
    return {
      right: 'origin',
      wrong: ['all', 'x-axis', 'y=x'],
      why: `Every point except $O$ ends up $${t.k}$ times as far from $O$, so only the centre stays put.`,
    };
  }
  if (t.kind === 'stretch-x' || t.kind === 'stretch-y') {
    const fixed = t.kind === 'stretch-x' ? 'y' : 'x';
    const coord = t.kind === 'stretch-x' ? 'x' : 'y';
    return {
      right: t.kind === 'stretch-x' ? 'y-axis' : 'x-axis',
      wrong: [t.kind === 'stretch-x' ? 'x-axis' : 'y-axis', 'origin', 'all'],
      why: `The stretch multiplies every $${coord}$-coordinate by $${t.k}$. A point is left alone only when its $${coord}$-coordinate is $0$, which is every point on the $${fixed}$-axis.`,
    };
  }
  if (t.kind === 'stretch-xy') {
    return {
      right: 'origin',
      wrong: ['x-axis', 'y-axis', 'all'],
      why: 'Both coordinates are multiplied by something other than 1, so a point stays put only when both are $0$.',
    };
  }
  switch (t.key) {
    case 'rot90':
    case 'rot270':
    case 'rot180':
      return {
        right: 'origin',
        wrong: t.key === 'rot180' ? ['all', 'x-axis', 'y-axis'] : ['all', 'y=x', 'x-axis'],
        why: 'A rotation about $O$ moves every point round the centre, so the centre is the only point that stays put.',
      };
    case 'refl-x':
    case 'refl-y':
    case 'refl-yx':
    case 'refl-ynx': {
      const right: PointSet =
        t.key === 'refl-x' ? 'x-axis' : t.key === 'refl-y' ? 'y-axis' : t.key === 'refl-yx' ? 'y=x' : 'y=-x';
      const twin: PointSet =
        t.key === 'refl-x' ? 'y-axis' : t.key === 'refl-y' ? 'x-axis' : t.key === 'refl-yx' ? 'y=-x' : 'y=x';
      return {
        right,
        wrong: [twin, 'origin', 'all'],
        why: 'A point on the mirror is its own reflection, so every point of the mirror line is invariant. The perpendicular line is invariant as a line, but its points swap sides, so they are not invariant points.',
      };
    }
  }
}

/** The invariant points of a named transformation: a point, a line, or everything. */
const invStdPoints: Generator<NamedParams> = {
  id: 'mat-inv-std-points',
  sample: drawNamed,
  render: ({ t, phrase }): Slide => {
    const { right, wrong } = pointSetOf(t);
    const { options: offered, correctId } = slotted(
      POINT_SET[right],
      wrong.map((key) => POINT_SET[key]),
      `${nameOf(t)}|${phrase}|points`,
    );
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which points are invariant under ${phraseOf(t, phrase)}?` }],
      options: offered,
      correctId,
    };
  },
  solution: ({ t, phrase }) => {
    const m = matrixOf(t);
    return [
      { text: 'An invariant point is one that does not move at all.' },
      { text: pointSetOf(t).why },
      { text: `In matrix terms, ${phraseOf(t, phrase)} has matrix $${texOf(m)}$, and $\\det(\\mathbf{M} - \\mathbf{I}) = ${detOf(minusI(m))}$.` },
    ];
  },
};

interface StdImageParams extends NamedParams {
  m: number;
}

/**
 * The image of y = mx under a named transformation.
 *
 * Drawn so the image's gradient is whole: the direction (1, m) goes to (p, q)
 * with p dividing q.
 */
const invStdImage: Generator<StdImageParams> = {
  id: 'mat-inv-std-image',
  choices: ({ t, m }) => {
    const [p, q] = apply(matrixOf(t), 1, m);
    const n = q / p;
    return upToFour(
      3 * m + 7 * n + p,
      { tex: yLine(n), answer: yAnswer(n) },
      { tex: yLine(m), answer: yAnswer(m) },
      { tex: yLine(-n), answer: yAnswer(-n) },
      { tex: yLine(-m), answer: yAnswer(-m) },
      { tex: yLine(n + 1), answer: yAnswer(n + 1) },
      { tex: yLine(n - 1), answer: yAnswer(n - 1) },
      { tex: yLine(2 * n), answer: yAnswer(2 * n) },
    );
  },
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 100; tries += 1) {
      const named = drawNamed(rng, difficulty);
      const m = nonZero(rng.int(difficulty > 1 ? -5 : -3, difficulty > 1 ? 5 : 3), 1);
      const [p, q] = apply(matrixOf(named.t), 1, m);
      if (p !== 0 && q % p === 0 && Math.abs(q / p) <= 12) return { ...named, m };
    }
    return { t: { kind: 'standard', key: 'refl-x' }, phrase: 0, m: 2 };
  },
  render: ({ t, phrase, m }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `Find the image of the line $${yLine(m)}$ under ${phraseOf(t, phrase)}.` }],
    lead: 'y =',
    keypad: [{ insert: 'x', tex: true }],
    answer: yAnswer(apply(matrixOf(t), 1, m)[1] / apply(matrixOf(t), 1, m)[0]),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ t, m }) => {
    const matrix = matrixOf(t);
    const [p, q] = apply(matrix, 1, m);
    const n = q / p;
    return [
      { text: `The line goes through $O$ and $(1, ${m})$. A linear transformation keeps $O$ where it is, so only $(1, ${m})$ needs mapping.` },
      { tex: mapsTex(matrix, 1, m) },
      { text: `The image goes through $O$ and $${pairTex(p, q)}$, so its gradient is $${q} \\div ${br(p)} = ${n}$: the line $${yLine(n)}$.` },
      {
        text:
          n === m
            ? 'That is the line we started with, so it is invariant.'
            : `That is not $${yLine(m)}$, so this line is not invariant.`,
      },
    ];
  },
};

type StdFlowParams = { m: Matrix };

/** The branch labels the invariant-line sorting flow takes for a matrix. */
function stdFlowPath([a, b, c, d]: Matrix): string[] {
  if (b === 0 && c === 0) return a === d ? ['Yes', 'Yes'] : ['Yes', 'No'];
  if (a !== 0 || d !== 0) return ['No', 'No'];
  if (b === c) return ['No', 'Yes', 'Yes'];
  return b === -c ? ['No', 'Yes', 'No', 'Yes'] : ['No', 'Yes', 'No', 'No'];
}

/** Sorting a matrix by where its zeros sit, to the lines through O it keeps. */
const invStdFlow: Generator<StdFlowParams> = {
  id: 'mat-inv-std-flow',
  sample: (rng, difficulty) => {
    const route = rng.pick(['every', 'axes', 'diagonals', 'none', 'quadratic'] as const);
    const k = rng.pick([-4, -3, -2, -1, 2, 3, 4, 5]);
    const j = nonZero(rng.int(-4, 5), 2);
    switch (route) {
      case 'every':
        return { m: [k, 0, 0, k] };
      case 'axes':
        return { m: [k, 0, 0, k === j ? -k : j] };
      case 'diagonals':
        return { m: [0, k, k, 0] };
      case 'none':
        return { m: [0, k, -k, 0] };
      case 'quadratic':
        return { m: drawInvariant(rng, difficulty).m };
    }
  },
  render: ({ m }): Slide => ({
    kind: 'flow',
    prompt: [{ kind: 'prose', text: 'Work down the questions to find which lines through the origin $\\mathbf{M}$ leaves invariant.' }],
    subject: M_TEX(m),
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
          { label: 'Yes', outcome: 'An enlargement: every line through $O$ is invariant.' },
          { label: 'No', outcome: 'A stretch along the axes: the two axes are invariant.' },
        ],
      },
      {
        id: 'lead',
        ask: 'Are both entries on the leading diagonal zero?',
        branches: [
          { label: 'Yes', to: 'same' },
          { label: 'No', outcome: 'No shortcut: set up the quadratic in $m$ and solve it.' },
        ],
      },
      {
        id: 'same',
        ask: 'Are the other two entries equal?',
        branches: [
          { label: 'Yes', outcome: 'The lines $y = x$ and $y = -x$ are invariant.' },
          { label: 'No', to: 'opposite' },
        ],
      },
      {
        id: 'opposite',
        ask: 'Are they equal and opposite?',
        branches: [
          { label: 'Yes', outcome: 'A turn through $90^\\circ$: no line through $O$ is invariant.' },
          { label: 'No', outcome: 'No shortcut: set up the quadratic in $m$ and solve it.' },
        ],
      },
    ],
    answer: stdFlowPath(m),
  }),
  solution: ({ m }) => {
    const [a, b, c, d] = m;
    const path = stdFlowPath(m).join(',');
    const verdict =
      path === 'Yes,Yes'
        ? `$\\mathbf{M}$ is $${a}$ times the identity, which sends $(1, m)$ to $(${a}, ${a}m)$ for every $m$: every line through $O$ is invariant.`
        : path === 'Yes,No'
          ? `$(1, 0)$ goes to $(${a}, 0)$ and $(0, 1)$ to $(0, ${d})$, so both axes map onto themselves. Any other direction is scaled by different amounts across and up, so it turns.`
          : path === 'No,Yes,Yes'
            ? `$(1, 1)$ goes to $(${b}, ${b})$ and $(1, -1)$ to $(${-b}, ${b})$, so $y = x$ and $y = -x$ both map onto themselves.`
            : path === 'No,Yes,No,Yes'
              ? `This is a turn through $90^\\circ$ combined with a scaling, so every direction is swung round a quarter turn and no line through $O$ survives. The quadratic $${polyTex([b, 0, -c], 'm')} = 0$ has no real solutions.`
              : `No pattern of zeros settles it, so substitute $(1, m)$ and solve: $${polyTex([b, a - d, -c], 'm')} = 0$ gives the gradients of the invariant lines.`;
    return [{ text: 'Where the zeros sit decides whether a shortcut applies, so look for them first.' }, { text: verdict }];
  },
};

/* ----- lines that miss the origin ----- */

interface OffsetCoeffsParams {
  m: Matrix;
  g: number;
  /** Which coordinate of the image is asked: one per question, since four blanks wrap on a phone. */
  row: 0 | 1;
}

/**
 * One coordinate of the image of a general point (x, gx + c), collected into
 * x terms and c terms. The other coordinate's two numbers sit in the bank.
 */
const invOffsetCoeffs: Generator<OffsetCoeffsParams> = {
  id: 'mat-inv-offset-coeffs',
  sample: (rng, difficulty) => ({
    m: rng.chance(0.5) ? drawInvariant(rng, difficulty).m : drawOriginOnly(rng, difficulty),
    g: nonZero(rng.int(-3, 3), 1),
    row: rng.pick([0, 1] as const),
  }),
  render: ({ m, g, row }) => {
    const [a, b, c, d] = m;
    const rows = [
      [a + b * g, b],
      [c + d * g, d],
    ];
    const answer = rows[row].map(String);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `A point on the line $${familyTex(g)}$ is $(x, \\; ${slopeTex(g)} + c)$. Its image under $\\mathbf{M}$ is $(x', y')$. Find $${row === 0 ? "x'" : "y'"}$, collecting the $x$ terms and the $c$ terms.`,
        },
        { kind: 'display', tex: M_TEX(m) },
      ],
      template: `${row === 0 ? "x'" : "y'"} = {0}x + {1}c`,
      // The other row, the matrix read by rows instead of columns, and the
      // gradient not multiplied through.
      bank: bankOf(
        answer,
        [...rows[1 - row], row === 0 ? a + c * g : b + d * g, row === 0 ? c : b, row === 0 ? a + g : c + g].map(String),
      ),
      answer,
    };
  },
  solution: ({ m, g, row }) => {
    const [a, b, c, d] = m;
    return [
      { text: `Multiply $(x, \\; ${slopeTex(g)} + c)$ by $\\mathbf{M}$. The ${row === 0 ? 'top' : 'bottom'} row gives $${row === 0 ? "x'" : "y'"}$.` },
      { text: `$x' = ${a}x + ${br(b)}(${slopeTex(g)} + c) = ${a + b * g}x + ${br(b)}c$` },
      { text: `$y' = ${c}x + ${br(d)}(${slopeTex(g)} + c) = ${c + d * g}x + ${br(d)}c$` },
      {
        text: `For the line to be invariant, $y' = ${g}x' + c$ has to hold for every $x$. The $x$ terms give the same condition on the gradient as before, and the $c$ terms give $${d}c = ${g * b}c + c$.`,
      },
    ];
  },
};

interface OffsetImageParams {
  inv: Invariant;
  pick: 0 | 1;
  k: number;
}

/**
 * The image of a line parallel to an invariant line: the same gradient, and
 * the intercept multiplied by the *other* line's factor.
 *
 * About a third are drawn with that factor 1, so the line maps to itself.
 */
const invOffsetImage: Generator<OffsetImageParams> = {
  id: 'mat-inv-offset-image',
  choices: ({ inv, pick, k }) => {
    const g = inv.g[pick];
    const [own, other] = [inv.s[pick], inv.s[1 - pick]];
    return upToFour(
      inv.m[0] + 3 * inv.m[1] + 5 * k,
      { tex: yLine(g, k * other), answer: yAnswer(g, k * other) },
      { tex: yLine(g, k), answer: yAnswer(g, k) },
      { tex: yLine(g, k * own), answer: yAnswer(g, k * own) },
      { tex: yLine(g, -k * other), answer: yAnswer(g, -k * other) },
      { tex: yLine(g, k + other), answer: yAnswer(g, k + other) },
    );
  },
  sample: (rng, difficulty) => {
    const pick = rng.pick([0, 1] as const);
    const unit = rng.chance(0.35) ? (pick === 0 ? 'second' : 'first') : 'none';
    return { inv: drawInvariant(rng, difficulty, unit), pick, k: nonZero(rng.int(-5, 5), 2) };
  },
  render: ({ inv, pick, k }) => {
    const g = inv.g[pick];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$${yLine(g)}$ is an invariant line of $\\mathbf{M}$. Find the image of the parallel line $${yLine(g, k)}$.`,
        },
        { kind: 'display', tex: M_TEX(inv.m) },
      ],
      lead: 'y =',
      keypad: [{ insert: 'x', tex: true }],
      answer: yAnswer(g, k * inv.s[1 - pick]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ inv, pick, k }) => {
    const g = inv.g[pick];
    const other = inv.s[1 - pick];
    const [u, v] = apply(inv.m, 0, k);
    return [
      { text: `Parallel lines stay parallel, and lines of gradient $${g}$ keep that gradient, so the image is $${familyTex(g)}$ for some $c$. One point settles it: map $(0, ${k})$.` },
      { tex: mapsTex(inv.m, 0, k) },
      { text: `So $${v} = ${g} \\times ${br(u)} + c$, which gives $c = ${v - g * u}$. The image is $${yLine(g, k * other)}$.` },
      {
        text:
          other === 1
            ? 'That is the line we started with, so it is invariant, and so is every other line of this gradient.'
            : `That is a different line: the intercept was multiplied by $${other}$, so only the line through $O$ with this gradient is invariant.`,
      },
    ];
  },
};

interface OffsetFlowParams {
  inv: Invariant;
  w: number;
}

function offsetPath({ inv, w }: OffsetFlowParams): string[] {
  const at = inv.g.indexOf(w);
  if (at < 0) return ['No'];
  return inv.s[1 - at] === 1 ? ['Yes', 'Yes'] : ['Yes', 'No'];
}

/** Which lines of one gradient are invariant: none, only the one through O, or all of them. */
const invOffsetFlow: Generator<OffsetFlowParams> = {
  id: 'mat-inv-offset-flow',
  sample: (rng, difficulty) => {
    const route = rng.pick(['every', 'only', 'neither'] as const);
    if (route === 'every') {
      const inv = drawInvariant(rng, difficulty, 'second');
      return { inv, w: inv.g[0] };
    }
    const inv = drawInvariant(rng, difficulty, route === 'only' ? 'none' : rng.pick(['none', 'first'] as const));
    if (route === 'only') return { inv, w: rng.pick(inv.g) };
    const spare = [-3, -2, -1, 0, 1, 2, 3].filter((w) => !inv.g.includes(w));
    return { inv, w: rng.pick(spare) };
  },
  render: (p): Slide => {
    const { inv, w } = p;
    const [, b, , d] = inv.m;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Which of the lines $${familyTex(w)}$ are invariant under $\\mathbf{M}$?` }],
      subject: M_TEX(inv.m),
      steps: [
        {
          id: 'grad',
          ask: `Does $\\mathbf{M}$ send $(1, ${w})$ to a multiple of itself?`,
          branches: [
            { label: 'Yes', to: 'const' },
            { label: 'No', outcome: 'None of them: no line with this gradient is invariant.' },
          ],
        },
        {
          id: 'const',
          ask: `Comparing constant terms gives $c(${d} - ${br(b)} \\times ${br(w)} - 1) = 0$. Is the bracket zero?`,
          branches: [
            { label: 'Yes', outcome: 'All of them, whatever $c$ is.' },
            { label: 'No', outcome: 'Only $c = 0$: the one through the origin.' },
          ],
        },
      ],
      answer: offsetPath(p),
    };
  },
  solution: (p) => {
    const { inv, w } = p;
    const [, b, , d] = inv.m;
    const [u, v] = apply(inv.m, 1, w);
    const path = offsetPath(p).join(',');
    if (path === 'No') {
      return [
        { tex: mapsTex(inv.m, 1, w) },
        { text: `$${pairTex(u, v)}$ is not a multiple of $(1, ${w})$, so even $${yLine(w)}$ is turned to a new gradient. No line of gradient $${w}$ is invariant.` },
      ];
    }
    return [
      { tex: mapsTex(inv.m, 1, w) },
      { text: `That is a multiple of $(1, ${w})$, so the direction survives and $${yLine(w)}$ is invariant.` },
      { text: `For the rest, the constant terms need $c(${d} - ${br(b * w)} - 1) = 0$, and the bracket is $${d - b * w - 1}$.` },
      {
        text:
          path === 'Yes,Yes'
            ? 'It is zero, so the equation holds for every $c$: every line of this gradient maps onto itself.'
            : 'It is not zero, so $c$ must be $0$: only the line through the origin is invariant.',
      },
    ];
  },
};

/* ----- lines as sets: families, and sorting ----- */

/** A line: y = mx + c, or x = c when `vertical`. */
interface LineSpec {
  vertical: boolean;
  m: number;
  c: number;
}

const lineSpecTex = (l: LineSpec) => (l.vertical ? `x = ${l.c}` : yLine(l.m, l.c));

function pointsOf(l: LineSpec): [number, number][] {
  return l.vertical
    ? [
        [l.c, 0],
        [l.c, 1],
      ]
    : [
        [0, l.c],
        [1, l.m + l.c],
      ];
}

const onLine = (l: LineSpec, [x, y]: [number, number]) => (l.vertical ? x === l.c : y === l.m * x + l.c);

type Verdict = 'fixed' | 'moves' | 'off';

/** Two points pin a line down, and a linear map keeps straight lines straight. */
function verdictOf(m: Matrix, l: LineSpec): Verdict {
  const points = pointsOf(l);
  const images = points.map(([x, y]) => apply(m, x, y));
  if (images.every(([u, v], i) => u === points[i][0] && v === points[i][1])) return 'fixed';
  return images.every((image) => onLine(l, image)) ? 'moves' : 'off';
}

type Family = 'horizontal' | 'vertical' | 'through-o' | 'rising' | 'falling';

const FAMILIES: readonly Family[] = ['horizontal', 'vertical', 'through-o', 'rising', 'falling'];

const FAMILY_TEX: Record<Family, string> = {
  horizontal: '\\text{Every line } y = c',
  vertical: '\\text{Every line } x = c',
  'through-o': '\\text{Every line through } O',
  rising: '\\text{Every line } y = x + c',
  falling: '\\text{Every line } y = -x + c',
};

/** A handful of lines from each family, enough to catch one that moves. */
function familyLines(family: Family): LineSpec[] {
  const cs = [-2, 0, 1, 3];
  switch (family) {
    case 'horizontal':
      return cs.map((c) => ({ vertical: false, m: 0, c }));
    case 'vertical':
      return cs.map((c) => ({ vertical: true, m: 0, c }));
    case 'rising':
      return cs.map((c) => ({ vertical: false, m: 1, c }));
    case 'falling':
      return cs.map((c) => ({ vertical: false, m: -1, c }));
    case 'through-o':
      return [
        ...[0, 1, -1, 2].map((m) => ({ vertical: false, m, c: 0 })),
        { vertical: true, m: 0, c: 0 },
      ];
  }
}

const familyHolds = (m: Matrix, family: Family) => familyLines(family).every((l) => verdictOf(m, l) !== 'off');

type Move = { kind: 'named'; t: Transform; phrase: number } | { kind: 'shear'; axis: 'x' | 'y'; s: number };

function moveMatrix(move: Move): Matrix {
  if (move.kind === 'named') return matrixOf(move.t);
  return move.axis === 'x' ? [1, move.s, 0, 1] : [1, 0, move.s, 1];
}

function movePhrase(move: Move): string {
  if (move.kind === 'named') return phraseOf(move.t, move.phrase);
  return move.axis === 'x'
    ? `a shear with the $x$-axis fixed, sending $(0, 1)$ to $(${move.s}, 1)$`
    : `a shear with the $y$-axis fixed, sending $(1, 0)$ to $(1, ${move.s})$`;
}

function drawMove(rng: SampleRng, difficulty: number): Move {
  if (rng.chance(0.3)) {
    return { kind: 'shear', axis: rng.pick(['x', 'y'] as const), s: nonZero(rng.int(-4, 4), 2) };
  }
  return { kind: 'named', ...drawNamed(rng, difficulty) };
}

interface OffsetFamilyParams {
  m: Matrix;
  /** Which of the four wrong families is left off the options. */
  drop: number;
}

/**
 * Which family of parallel lines survives, line by line.
 *
 * Only matrices with exactly one such family are drawn, which the families
 * themselves check: each candidate is tested on a few of its lines.
 */
const invOffsetFamily: Generator<OffsetFamilyParams> = {
  id: 'mat-inv-offset-family',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 60; tries += 1) {
      const m = moveMatrix(drawMove(rng, difficulty));
      if (FAMILIES.filter((family) => familyHolds(m, family)).length === 1) return { m, drop: rng.int(0, 3) };
    }
    return { m: [1, 2, 0, 1], drop: 0 };
  },
  render: ({ m, drop }): Slide => {
    const right = FAMILIES.find((family) => familyHolds(m, family)) ?? 'horizontal';
    const wrong = FAMILIES.filter((family) => family !== right).filter((_, idx) => idx !== drop);
    const { options: offered, correctId } = slotted(
      FAMILY_TEX[right],
      wrong.map((family) => FAMILY_TEX[family]),
      `${m.join(',')}|${drop}`,
    );
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Which of these families of lines is invariant under $\\mathbf{M}$, every line in it?' },
        { kind: 'display', tex: M_TEX(m) },
      ],
      options: offered,
      correctId,
    };
  },
  solution: ({ m, drop }) => {
    const right = FAMILIES.find((family) => familyHolds(m, family)) ?? 'horizontal';
    const sample = familyLines(right).find((l) => l.c !== 0) ?? familyLines(right)[1];
    const [p0, p1] = pointsOf(sample);
    const wrongFamily = FAMILIES.filter((family) => family !== right).filter((_, idx) => idx !== drop)[0];
    const miss = familyLines(wrongFamily).find((l) => verdictOf(m, l) === 'off') ?? familyLines(wrongFamily)[0];
    const bad = pointsOf(miss).find(([x, y]) => !onLine(miss, apply(m, x, y))) ?? pointsOf(miss)[0];
    return [
      { text: `Take one line from the family, say $${lineSpecTex(sample)}$, and map two of its points.` },
      { tex: mapsTex(m, p0[0], p0[1]) },
      { tex: mapsTex(m, p1[0], p1[1]) },
      { text: `Both images are back on $${lineSpecTex(sample)}$, and the same happens whatever the constant, so every line of the family is invariant.` },
      {
        text: `Against that, $${lineSpecTex(miss)}$ fails: its point $${pairTex(bad[0], bad[1])}$ goes to $${pairTex(...apply(m, bad[0], bad[1]))}$, which is off the line.`,
      },
    ];
  },
};

/* ----- a line of invariant points, or an invariant line ----- */

type SortRoute = 'fixed' | 'moves' | 'off';

interface SortWhichParams {
  inv: Invariant;
  w: number;
}

function sortRoute({ inv, w }: SortWhichParams): SortRoute {
  const at = inv.g.indexOf(w);
  if (at < 0) return 'off';
  return inv.s[at] === 1 ? 'fixed' : 'moves';
}

const SORT_TEX: Record<SortRoute, string> = {
  fixed: '\\text{A line of invariant points}',
  moves: '\\text{An invariant line whose points move}',
  off: '\\text{Not an invariant line}',
};

/** One line, sorted by where (1, m) goes: back to itself, along the line, or off it. */
const invSortWhich: Generator<SortWhichParams> = {
  id: 'mat-inv-sort-which',
  sample: (rng, difficulty) => {
    const route = rng.pick(['fixed', 'moves', 'off'] as const);
    const inv = drawInvariant(rng, difficulty, route === 'moves' && rng.chance(0.4) ? 'none' : 'first');
    if (route === 'fixed') return { inv, w: inv.g[0] };
    if (route === 'moves') return { inv, w: inv.s[0] === 1 ? inv.g[1] : rng.pick(inv.g) };
    return { inv, w: rng.pick([-3, -2, -1, 0, 1, 2, 3].filter((w) => !inv.g.includes(w))) };
  },
  render: (p): Slide => {
    const right = sortRoute(p);
    const { options: offered, correctId } = slotted(
      SORT_TEX[right],
      (['fixed', 'moves', 'off'] as const).filter((r) => r !== right).map((r) => SORT_TEX[r]),
      `${p.inv.m.join(',')}|${p.w}`,
    );
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `What is the line $${yLine(p.w)}$ to $\\mathbf{M}$?` },
        { kind: 'display', tex: M_TEX(p.inv.m) },
      ],
      options: offered,
      correctId,
    };
  },
  solution: (p) => {
    const route = sortRoute(p);
    const [u, v] = apply(p.inv.m, 1, p.w);
    return [
      { text: `Map $(1, ${p.w})$, a point on the line.` },
      { tex: mapsTex(p.inv.m, 1, p.w) },
      {
        text:
          route === 'fixed'
            ? 'It comes back to itself. So does every multiple of it, so every point on the line stays put: a line of invariant points.'
            : route === 'moves'
              ? `It lands on $${u}$ times itself: still on the line, but moved. The line is invariant, and its points slide along it, so it is not a line of invariant points.`
              : `$${pairTex(u, v)}$ is not on $${yLine(p.w)}$, so the line is turned somewhere else. It is not invariant at all.`,
      },
    ];
  },
};

interface SortFlowParams {
  move: Move;
  line: LineSpec;
}

/**
 * A named transformation and a line, sorted geometrically.
 *
 * The verdict is computed from the matrix rather than tabulated, and the
 * sample aims at each of the three verdicts equally, so a learner cannot
 * learn that the answer is usually "no".
 */
const invSortFlow: Generator<SortFlowParams> = {
  id: 'mat-inv-sort-flow',
  sample: (rng, difficulty) => {
    const target = rng.pick(['fixed', 'moves', 'off'] as const);
    for (let tries = 0; tries < 400; tries += 1) {
      const move = drawMove(rng, difficulty);
      const line: LineSpec = rng.chance(0.3)
        ? { vertical: true, m: 0, c: rng.int(-3, 3) }
        : { vertical: false, m: rng.int(-2, 2), c: rng.chance(0.4) ? 0 : nonZero(rng.int(-3, 3), 2) };
      if (verdictOf(moveMatrix(move), line) === target) return { move, line };
    }
    return { move: { kind: 'shear', axis: 'x', s: 2 }, line: { vertical: false, m: 0, c: 0 } };
  },
  render: ({ move, line }): Slide => {
    const verdict = verdictOf(moveMatrix(move), line);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `The transformation is ${movePhrase(move)}. Work down the questions to say what it does to the line.` }],
      subject: lineSpecTex(line),
      steps: [
        {
          id: 'onto',
          ask: 'Does the line map onto itself?',
          branches: [
            { label: 'Yes', to: 'still' },
            { label: 'No', outcome: 'It is not an invariant line.' },
          ],
        },
        {
          id: 'still',
          ask: 'Does every point on it stay exactly where it is?',
          branches: [
            { label: 'Yes', outcome: 'A line of invariant points.' },
            { label: 'No', outcome: 'An invariant line: its points move along it.' },
          ],
        },
      ],
      answer: verdict === 'off' ? ['No'] : verdict === 'fixed' ? ['Yes', 'Yes'] : ['Yes', 'No'],
    };
  },
  solution: ({ move, line }) => {
    const m = moveMatrix(move);
    const verdict = verdictOf(m, line);
    const [p0, p1] = pointsOf(line);
    const [i0, i1] = [apply(m, p0[0], p0[1]), apply(m, p1[0], p1[1])];
    return [
      { text: `${capital(movePhrase(move))} has matrix $${texOf(m)}$. Map two points of $${lineSpecTex(line)}$.` },
      { text: `$${pairTex(p0[0], p0[1])} \\to ${pairTex(i0[0], i0[1])}$ and $${pairTex(p1[0], p1[1])} \\to ${pairTex(i1[0], i1[1])}$.` },
      {
        text:
          verdict === 'fixed'
            ? 'Both come back to themselves, and the points between follow, so every point of the line stays put: a line of invariant points.'
            : verdict === 'moves'
              ? 'Both images are on the line, so it maps onto itself, but the points have moved along it: an invariant line, not a line of invariant points.'
              : 'At least one image is off the line, so the line is moved somewhere else: it is not invariant.',
      },
    ];
  },
};

interface ShearSliderParams {
  axis: 'x' | 'y';
  s: number;
  x0: number;
  y0: number;
}

/**
 * A shear slides each point along its line parallel to the fixed axis, by
 * an amount in proportion to how far it is from that axis.
 */
const invShearSlider: Generator<ShearSliderParams> = {
  id: 'mat-inv-shear-slider',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 80; tries += 1) {
      const axis = rng.pick(['x', 'y'] as const);
      const s = nonZero(rng.int(difficulty > 1 ? -3 : -2, difficulty > 1 ? 3 : 2), 1);
      const x0 = rng.int(-4, 4);
      const y0 = rng.int(-4, 4);
      const moved = axis === 'x' ? x0 + s * y0 : y0 + s * x0;
      const across = axis === 'x' ? y0 : x0;
      if (across !== 0 && moved !== 0 && Math.abs(moved) <= 7) return { axis, s, x0, y0 };
    }
    return { axis: 'x', s: 2, x0: 1, y0: 2 };
  },
  render: ({ axis, s, x0, y0 }): Slide => {
    const m: Matrix = axis === 'x' ? [1, s, 0, 1] : [1, 0, s, 1];
    const [x1, y1] = apply(m, x0, y0);
    const span = spanFor(x0, y0, x1, y1);
    const along = axis === 'x' ? `y = ${y0}` : `x = ${x0}`;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `$\\mathbf{M}$ is a shear, and its fixed axis is dashed. $P = ${pairTex(x0, y0)}$ moves along the invariant line $${along}$. Slide to the $${axis}$-coordinate of its image.`,
        },
        { kind: 'display', tex: M_TEX(m) },
      ],
      min: -(span - 1),
      max: span - 1,
      step: 1,
      answer: axis === 'x' ? x1 : y1,
      readout: `${axis}\\text{-coordinate of } P' = {v}`,
      figure: {
        svg: transformGridSvg({
          span,
          marks: [{ x: x0, y: y0, label: 'P' }],
          mirror: axis === 'x' ? 'x-axis' : 'y-axis',
          label: `Squared paper with the point P at (${x0}, ${y0}) and the ${axis}-axis dashed`,
        }),
        xMin: -span,
        xMax: span,
        axis,
      },
    };
  },
  solution: ({ axis, s, x0, y0 }) => {
    const m: Matrix = axis === 'x' ? [1, s, 0, 1] : [1, 0, s, 1];
    const [x1, y1] = apply(m, x0, y0);
    const across = axis === 'x' ? y0 : x0;
    return [
      { tex: mapsTex(m, x0, y0) },
      {
        text: `The ${axis === 'x' ? '$y$' : '$x$'}-coordinate is unchanged, so $P$ stays on its line and slides $${s} \\times ${br(across)} = ${s * across}$ along it, to $${pairTex(x1, y1)}$.`,
      },
      {
        text: `Every line parallel to the $${axis}$-axis is invariant in this way. Points on the $${axis}$-axis itself are $0$ away from it and do not move at all: it is a line of invariant points.`,
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
  composeMatrix,
  composePoint,
  composeSlide,
  composeOrder,
  commuteTree,
  orderPoint,
  commuteWhich,
  composeStandard,
  composeName,
  reflectPair,
  composeLocate,
  undoMatrixGen,
  inverseOrder,
  inverseTree,
  undoPoint,
  composeDet,
  composeArea,
  composeOrientation,
  detMissing,
  sysRead,
  sysBack,
  sysVector,
  sysRhs,
  sysMinor,
  sysDet,
  sysDetTree,
  sysDetZero,
  sysDetRule,
  sysLines,
  sysConsistent,
  sysLineForm,
  sysCount,
  sysCramerSwap,
  sysCramer,
  sysInverse,
  sysBackSub,
  sysBackSubTree,
  sysParamDet,
  sysParamK,
  sysParamWhich,
  sysParamOutcome,
  invPointWhich,
  invPointSlider,
  invPointFlow,
  invPointDet,
  invPointDetTree,
  invPointLine,
  invLineWhich,
  invLineStretch,
  invLineQuad,
  invLineGradients,
  invStdLines,
  invStdPoints,
  invStdImage,
  invStdFlow,
  invOffsetCoeffs,
  invOffsetImage,
  invOffsetFlow,
  invOffsetFamily,
  invSortWhich,
  invSortFlow,
  invShearSlider,
] as unknown as Generator<unknown>[];
