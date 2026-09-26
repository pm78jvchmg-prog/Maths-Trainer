/**
 * Vectors, level 14: Unit Vectors and i, j Notation (`vm-l14`).
 *
 * Writing a vector with i and j (and k), its magnitude as an exact surd, its
 * direction as an angle from the positive x axis, and the unit vector that
 * points the same way. Small numbers throughout: the level sits in Vectors
 * Basics.
 *
 * Two engine facts shape the questions, as in `vectorFormat.ts`: a typed
 * answer must be a scalar, so a vector answer goes through tiles or a choice;
 * and a tiles template is split into separate TeX fragments, so its blanks sit
 * after labels rather than inside a bracket.
 *
 * Angles are never typed to the nearest degree. A rounded angle is picked from
 * four options, each a whole number of degrees apart from the others by far
 * more than the rounding, and a draw whose angle sits near a half degree is
 * refused, so the option and a calculator can never disagree. The typed angle
 * questions use only vectors along an axis or a diagonal, whose angles are
 * exact.
 */
import type { ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { bin, num, pow, root } from '../expr';
import { options } from '../choiceVariant';
import { hashSeed } from '../../engine/rng';
import { vectorSvg } from '../figures';
import { fracTex, gcd, surdParts, surdTex } from './format';
import { bankOf, columnTex, VECTOR_TEMPLATE } from './vectorFormat';

type V2 = [number, number];
type V3 = [number, number, number];

const UNITS = ['\\mathbf{i}', '\\mathbf{j}', '\\mathbf{k}'];

/** Exact magnitudes: a root, a fraction bar and brackets. */
const SURD_KEYS: KeypadKey[] = [
  { insert: 'sqrt(', label: '√(' },
  { insert: '/' },
  { insert: '(' },
  { insert: ')' },
];

/** The component template for a three-dimensional answer. */
const VECTOR3_TEMPLATE = `\\mathbf{i}: \\; {0} \\qquad \\mathbf{j}: \\; {1} \\qquad \\mathbf{k}: \\; {2}`;

/** The template for writing a vector as a column, top entry first. */
const COLUMN_TEMPLATE = `\\text{top}: \\; {0} \\qquad \\text{bottom}: \\; {1}`;

/**
 * A vector in i, j (, k) form: `3\mathbf{i} - \mathbf{j}`, `-2\mathbf{k}`.
 * A zero component is left out and a coefficient of one is not written.
 */
export function vecTex(c: readonly number[]): string {
  const terms: string[] = [];
  c.forEach((n, at) => {
    if (n === 0) return;
    const body = `${Math.abs(n) === 1 ? '' : Math.abs(n)}${UNITS[at]}`;
    terms.push(terms.length === 0 ? `${n < 0 ? '-' : ''}${body}` : `${n < 0 ? '-' : '+'} ${body}`);
  });
  return terms.length ? terms.join(' ') : '\\mathbf{0}';
}

/** The same vector with each component over `den`, each fraction in lowest terms. */
export function fracVecTex(c: readonly number[], den: number): string {
  const terms: string[] = [];
  c.forEach((n, at) => {
    if (n === 0) return;
    const g = gcd(Math.abs(n), den) || 1;
    const p = Math.abs(n) / g;
    const q = den / g;
    const size = q === 1 ? (p === 1 ? '' : `${p}`) : `\\frac{${p}}{${q}}`;
    const body = `${size}${UNITS[at]}`;
    terms.push(terms.length === 0 ? `${n < 0 ? '-' : ''}${body}` : `${n < 0 ? '-' : '+'} ${body}`);
  });
  return terms.length ? terms.join(' ') : '\\mathbf{0}';
}

/** A three-component column vector, for prompts and options only. */
function column3(c: readonly number[]): string {
  return `\\begin{pmatrix} ${c[0]} \\\\ ${c[1]} \\\\ ${c[2]} \\end{pmatrix}`;
}

/**
 * Named vectors one to a line. Stacked rather than set side by side, because
 * two three-dimensional vectors on one line run past a phone's width.
 */
function givens(...rows: [string, string][]): string {
  return `\\begin{gathered} ${rows.map(([name, value]) => `${name} = ${value}`).join(' \\\\ ')} \\end{gathered}`;
}

/** A number inside working, bracketed when negative: `(-3)`. */
const br = (n: number) => (n < 0 ? `(${n})` : `${n}`);

/** `p\mathbf{a}` as a coefficient in front of a letter: `2\mathbf{a}`, `-\mathbf{b}`. */
function scaledName(p: number, name: string, first: boolean): string {
  const size = Math.abs(p) === 1 ? '' : `${Math.abs(p)}`;
  if (first) return `${p < 0 ? '-' : ''}${size}${name}`;
  return `${p < 0 ? '-' : '+'} ${size}${name}`;
}

const same = (u: readonly number[], v: readonly number[]) => u.every((n, at) => n === v[at]);

/** A non-zero whole number in [-span, span]. */
function nz(rng: { int(a: number, b: number): number }, span: number): number {
  const n = rng.int(1, span);
  return rng.int(0, 1) === 0 ? n : -n;
}

/* ---------- where the answer sits in a choice ---------- */

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
 * Derived choice options ordered so that, after `choiceVariant` rotates them,
 * the right one lands at `salt % length`: spread by the question, not stuck
 * where the hash of one family of labels happens to put it.
 */
function steered(opts: ChoiceOption[], salt: number): ChoiceOption[] {
  const target = salt % opts.length;
  for (const order of permutations(opts)) {
    const at = (order.findIndex((o) => o.correct) - rotationOf(order) + order.length) % order.length;
    if (at === target) return order;
  }
  return opts;
}

/** A native choice slide's options, labels unique, the answer at `salt % length`. */
function placeAnswer(correct: string, wrong: string[], salt: number) {
  const seen = new Set([correct]);
  const rest: { id: string; label: string; tex: boolean }[] = [];
  wrong.forEach((label, at) => {
    if (seen.has(label)) return;
    seen.add(label);
    rest.push({ id: `w${at}`, label, tex: true });
  });
  const at = salt % (rest.length + 1);
  return [...rest.slice(0, at), { id: 'right', label: correct, tex: true }, ...rest.slice(at)];
}

/* ---------- Pythagorean triples and quadruples ---------- */

/** Legs and hypotenuse, both orders, primitive and a few multiples. */
const TRIPLES: V3[] = [
  [3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17],
  [7, 24, 25], [24, 7, 25], [6, 8, 10], [8, 6, 10], [9, 12, 15], [12, 9, 15],
  [10, 24, 26], [24, 10, 26], [12, 16, 20], [16, 12, 20], [15, 20, 25], [20, 15, 25],
  [20, 21, 29], [21, 20, 29], [9, 40, 41], [40, 9, 41], [18, 24, 30], [24, 18, 30],
  [15, 36, 39], [36, 15, 39], [12, 35, 37], [35, 12, 37],
];

/** The small triples, for questions a learner does in their head. */
const SMALL_TRIPLES = TRIPLES.filter(([, , c]) => c <= 17);

/** Primitive triples only: a unit vector's fractions come out in lowest terms. */
const PRIMITIVE_TRIPLES = TRIPLES.filter(([a, b]) => gcd(a, b) === 1);

/** x^2 + y^2 + z^2 = d^2, all whole. */
const QUADRUPLES: [number, number, number, number][] = [
  [1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11],
  [6, 6, 7, 11], [3, 4, 12, 13], [2, 5, 14, 15], [2, 10, 11, 15],
];

/** A quadruple's three legs in a random order with random signs, and its length. */
function drawQuadruple(rng: Parameters<Generator['sample']>[0], small: boolean): { v: V3; d: number } {
  const [a, b, c, d] = rng.pick(small ? QUADRUPLES.slice(0, 5) : QUADRUPLES);
  const legs = rng.shuffle([a, b, c]).map((n) => (rng.chance(0.5) ? n : -n));
  return { v: [legs[0], legs[1], legs[2]], d };
}

/* ======================= Lesson 1: i and j ======================= */

interface WriteParams {
  x: number;
  y: number;
  /** Written with the j term first, `2\mathbf{j} - 3\mathbf{i}`. */
  jFirst: boolean;
}

/** A component that is often zero or one, since those are the forms that trip. */
function awkward(rng: Parameters<Generator['sample']>[0], span: number): number {
  const roll = rng.int(0, 5);
  if (roll === 0) return 0;
  if (roll === 1) return rng.pick([1, -1]);
  return nz(rng, span);
}

function sampleWrite(rng: Parameters<Generator['sample']>[0], difficulty: number): WriteParams {
  const span = difficulty > 1 ? 9 : 6;
  for (let tries = 0; tries < 40; tries += 1) {
    const x = awkward(rng, span);
    const y = awkward(rng, span);
    if (x === 0 && y === 0) continue;
    return { x, y, jFirst: x !== 0 && y !== 0 && rng.chance(0.35) };
  }
  return { x: 3, y: -1, jFirst: false };
}

/** The vector as the prompt writes it, j term first when asked. */
function writtenTex({ x, y, jFirst }: WriteParams): string {
  if (!jFirst) return vecTex([x, y]);
  const j = `${Math.abs(y) === 1 ? '' : Math.abs(y)}\\mathbf{j}`;
  const i = `${Math.abs(x) === 1 ? '' : Math.abs(x)}\\mathbf{i}`;
  return `${y < 0 ? '-' : ''}${j} ${x < 0 ? '-' : '+'} ${i}`;
}

function writeSolution({ x, y, jFirst }: WriteParams): SolutionStep[] {
  return [
    {
      text: 'The number in front of $\\mathbf{i}$ goes on top and the number in front of $\\mathbf{j}$ goes underneath.',
    },
    ...(jFirst
      ? [{ text: `The $\\mathbf{j}$ term is written first here, but the order of adding does not matter: $${writtenTex({ x, y, jFirst })} = ${vecTex([x, y])}$.` }]
      : []),
    ...(x === 0 || y === 0
      ? [{ text: `There is no $${x === 0 ? '\\mathbf{i}' : '\\mathbf{j}'}$ term, so that component is $0$.` }]
      : []),
    ...(Math.abs(x) === 1 || Math.abs(y) === 1
      ? [{ text: 'A letter on its own has a coefficient of one: $\\mathbf{j}$ means $1\\mathbf{j}$ and $-\\mathbf{j}$ means $-1\\mathbf{j}$.' }]
      : []),
    { tex: `${vecTex([x, y])} = ${columnTex(x, y)}` },
  ];
}

/** From i, j form to a column vector, placed as tiles. */
const toColumn: Generator<WriteParams> = {
  id: 'vunit-to-column',
  choices: (params) => {
    const { x, y } = params;
    const right = columnTex(x, y);
    const wrong = [columnTex(y, x), columnTex(x, -y), columnTex(-x, y), columnTex(-x, -y), columnTex(x + y, 0)]
      .filter((tex) => tex !== right)
      .filter((tex, at, all) => all.indexOf(tex) === at)
      .slice(0, 3);
    return steered(options({ tex: right }, ...wrong.map((tex) => ({ tex }))), saltOf(params));
  },
  sample: sampleWrite,
  render: (params): Slide => {
    const { x, y } = params;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write this vector as a column vector.' },
        { kind: 'display', tex: writtenTex(params) },
      ],
      template: COLUMN_TEMPLATE,
      bank: bankOf([`${x}`, `${y}`], [`${-x}`, `${-y}`, '0', '1']),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: writeSolution,
};

/** From a column vector to i, j form, as a choice. */
const toIj: Generator<WriteParams> = {
  id: 'vunit-to-ij',
  sample: (rng, difficulty) => ({ ...sampleWrite(rng, difficulty), jFirst: false }),
  render: (params): Slide => {
    const { x, y } = params;
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which of these is $${columnTex(x, y)}$ written with $\\mathbf{i}$ and $\\mathbf{j}$?` }],
      options: placeAnswer(
        vecTex([x, y]),
        [vecTex([y, x]), vecTex([x, -y]), vecTex([-x, y]), vecTex([-x, -y]), vecTex([x + 1, y])]
          .filter((label, at, all) => label !== vecTex([x, y]) && all.indexOf(label) === at)
          .slice(0, 3),
        saltOf(params),
      ),
      correctId: 'right',
    };
  },
  solution: ({ x, y }) => [
    { text: 'The top entry is the $\\mathbf{i}$ component and the bottom entry is the $\\mathbf{j}$ component.' },
    { tex: `${columnTex(x, y)} = ${x}\\mathbf{i} ${y < 0 ? '-' : '+'} ${Math.abs(y)}\\mathbf{j}` },
    ...(x === 0 || y === 0 || Math.abs(x) === 1 || Math.abs(y) === 1
      ? [{ text: `A zero term is left out and a coefficient of one is not written, so this is $${vecTex([x, y])}$.` }]
      : [{ text: `So it is $${vecTex([x, y])}$.` }]),
  ],
};

interface ReadParams {
  x: number;
  y: number;
  span: number;
}

/** Reading the j component off a drawn arrow. */
const readJ: Generator<ReadParams> = {
  id: 'vunit-read-j',
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 8 : 6;
    return { x: nz(rng, reach), y: nz(rng, reach), span: reach + 1 };
  },
  render: ({ x, y, span }): Slide => ({
    kind: 'slider',
    prompt: [
      {
        kind: 'prose',
        text: 'The arrow is a vector drawn from the origin. Slide to its $\\mathbf{j}$ component: how far it reaches up or down.',
      },
    ],
    min: -(span - 1),
    max: span - 1,
    step: 1,
    answer: y,
    readout: '\\mathbf{j}\\text{ component} = {v}',
    figure: {
      svg: vectorSvg(x, y, { span, label: 'A vector drawn from the origin' }),
      xMin: -span,
      xMax: span,
      axis: 'y',
    },
  }),
  solution: ({ x, y }) => [
    { text: 'The $\\mathbf{j}$ component is how far the arrow reaches up, counted on the vertical axis. Down counts as negative.' },
    { text: `The tip is ${Math.abs(y)} ${y < 0 ? 'below' : 'above'} the origin, so the $\\mathbf{j}$ component is $${y}$.` },
    { tex: `${columnTex(x, y)} = ${vecTex([x, y])}` },
    { text: `Reading across instead gives $${x}$, the $\\mathbf{i}$ component.` },
  ],
};

interface CombineParams {
  p: number;
  q: number;
  a: V2;
  b: V2;
}

const combined = ({ p, q, a, b }: CombineParams): V2 => [p * a[0] + q * b[0], p * a[1] + q * b[1]];

function combineTex({ p, q }: CombineParams): string {
  return `${scaledName(p, '\\mathbf{a}', true)} ${scaledName(q, '\\mathbf{b}', false)}`;
}

/** Scalar multiples and sums worked in i, j form. */
const combine: Generator<CombineParams> = {
  id: 'vunit-combine',
  choices: (params) => {
    const { p, q, a, b } = params;
    const right = combined(params);
    const wrong: V2[] = [
      [p * a[0] + b[0], p * a[1] + b[1]],
      [p * a[0] - q * b[0], p * a[1] - q * b[1]],
      [a[0] + q * b[0], a[1] + q * b[1]],
      [p * a[0] + q * b[1], p * a[1] + q * b[0]],
      [right[0] + 1, right[1] - 1],
    ];
    const kept = wrong.filter((w, at) => !same(w, right) && wrong.findIndex((v) => same(v, w)) === at).slice(0, 3);
    return steered(options({ tex: vecTex(right) }, ...kept.map((w) => ({ tex: vecTex(w) }))), saltOf(params));
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 6 : 5;
    const draw = (): V2 => {
      const v: V2 = [awkward(rng, span), awkward(rng, span)];
      return v[0] === 0 && v[1] === 0 ? [2, -1] : v;
    };
    return {
      p: difficulty > 1 ? rng.pick([2, 3, 4, -2, -3]) : rng.pick([1, 2, 3]),
      q: difficulty > 1 ? rng.pick([1, -1, 2, -2, 3, -3]) : rng.pick([1, -1, 2, -2]),
      a: draw(),
      b: draw(),
    };
  },
  render: (params): Slide => {
    const { a, b } = params;
    const [x, y] = combined(params);
    const { p, q } = params;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Find $${combineTex(params)}$ in $\\mathbf{i}$, $\\mathbf{j}$ form, where` },
        { kind: 'display', tex: givens(['\\mathbf{a}', vecTex(a)], ['\\mathbf{b}', vecTex(b)]) },
      ],
      template: VECTOR_TEMPLATE,
      bank: bankOf(
        [`${x}`, `${y}`],
        [`${p * a[0] + b[0]}`, `${p * a[1] + b[1]}`, `${p * a[0] - q * b[0]}`, `${p * a[1] - q * b[1]}`],
      ),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: (params) => {
    const { p, q, a, b } = params;
    const [x, y] = combined(params);
    return [
      { text: 'Multiply each vector by its number, then collect the $\\mathbf{i}$ terms and the $\\mathbf{j}$ terms separately.' },
      { tex: `\\mathbf{i}: \\; ${p} \\times ${br(a[0])} + ${br(q)} \\times ${br(b[0])} = ${x}` },
      { tex: `\\mathbf{j}: \\; ${p} \\times ${br(a[1])} + ${br(q)} \\times ${br(b[1])} = ${y}` },
      { tex: `${combineTex(params)} = ${vecTex([x, y])}` },
      { text: 'A number in front multiplies both components, and a minus sign in front of a vector changes the sign of both.' },
    ];
  },
};

interface MissingParams {
  a: V2;
  c: V2;
}

/** a + b = c with b to find: b = c - a. */
const missing: Generator<MissingParams> = {
  id: 'vunit-missing',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 9 : 6;
    for (let tries = 0; tries < 40; tries += 1) {
      const a: V2 = [nz(rng, span), awkward(rng, span)];
      const c: V2 = [awkward(rng, span), nz(rng, span)];
      const b = [c[0] - a[0], c[1] - a[1]];
      if (b[0] !== 0 || b[1] !== 0) return { a, c };
    }
    return { a: [3, -2], c: [5, 4] };
  },
  render: ({ a, c }): Slide => {
    const b = [c[0] - a[0], c[1] - a[1]];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Find $\\mathbf{b}$, where' },
        { kind: 'display', tex: givens(['\\mathbf{a}', vecTex(a)], ['\\mathbf{a} + \\mathbf{b}', vecTex(c)]) },
      ],
      template: VECTOR_TEMPLATE,
      bank: bankOf([`${b[0]}`, `${b[1]}`], [`${c[0] + a[0]}`, `${c[1] + a[1]}`, `${a[0] - c[0]}`, `${a[1] - c[1]}`]),
      answer: [`${b[0]}`, `${b[1]}`],
    };
  },
  solution: ({ a, c }) => {
    const b = [c[0] - a[0], c[1] - a[1]];
    return [
      { text: 'Take $\\mathbf{a}$ from both sides: $\\mathbf{b} = (\\mathbf{a} + \\mathbf{b}) - \\mathbf{a}$. Subtract component by component.' },
      { tex: `\\mathbf{i}: \\; ${c[0]} - ${br(a[0])} = ${b[0]}` },
      { tex: `\\mathbf{j}: \\; ${c[1]} - ${br(a[1])} = ${b[1]}` },
      { tex: `\\mathbf{b} = ${vecTex(b)}` },
      { text: `Check: $${vecTex(a)}$ plus $${vecTex(b)}$ is $${vecTex(c)}$.` },
    ];
  },
};

/* ======================= Lesson 2: magnitude ======================= */

interface MagParams {
  x: number;
  y: number;
}

/** |xi + yj| exactly. */
const magnitude: Generator<MagParams> = {
  id: 'vunit-mag',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 12 : 7;
    for (let tries = 0; tries < 40; tries += 1) {
      const x = difficulty > 1 ? nz(rng, span) : awkward(rng, span);
      const y = nz(rng, span);
      if (x !== 0 || y !== 0) return { x, y };
    }
    return { x: 2, y: -5 };
  },
  render: ({ x, y }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Find the magnitude exactly. Leave a surd if it does not come out whole.' }],
    lead: `\\left| ${vecTex([x, y])} \\right| =`,
    keypad: SURD_KEYS,
    answer: `sqrt(${x * x + y * y})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ x, y }) => {
    const n = x * x + y * y;
    const shown = surdTex(n);
    return [
      { text: 'Square each component, add, and take the square root.' },
      { tex: `\\left| ${vecTex([x, y])} \\right| = \\sqrt{${br(x)}^2 + ${br(y)}^2}` },
      { tex: `= \\sqrt{${x * x} + ${y * y}} = \\sqrt{${n}}${shown === `\\sqrt{${n}}` ? '' : ` = ${shown}`}` },
      { text: 'Squaring removes the signs, so a magnitude is never negative.' },
    ];
  },
};

interface MagStepsParams {
  a: number;
  b: number;
  c: number;
}

/** Four whole options: the right one, then the nearest slips. */
function offer(correct: number, ...near: number[]): string[] {
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
  return out.sort((p, q) => p - q).map(String);
}

/**
 * The magnitude one piece at a time. Components positive, because the tree
 * writes a numeric power's base bare and `-3^{2}` would read as minus nine.
 */
const magnitudeSteps: Generator<MagStepsParams> = {
  id: 'vunit-mag-steps',
  sample: (rng) => {
    const [a, b, c] = rng.pick(TRIPLES);
    return { a, b, c };
  },
  render: ({ a, b, c }): Slide => {
    const sum = a * a + b * b;
    return {
      kind: 'reduce',
      prompt: [
        { kind: 'prose', text: 'Find the magnitude one piece at a time. Tap the part you would do **next**, then choose what it comes to.' },
        { kind: 'display', tex: `\\left| ${vecTex([a, b])} \\right| = \\sqrt{${a}^2 + ${b}^2}` },
      ],
      expr: root(bin('+', pow(num(a), num(2)), pow(num(b), num(2)))),
      banks: {
        'r.a.l': offer(a * a, 2 * a, a, a * a + 2),
        'r.a.r': offer(b * b, 2 * b, b, b * b + 2),
        'r.a': offer(sum, (a + b) * (a + b), Math.abs(a * a - b * b), sum + 10),
        r: offer(c, a + b, sum, c + 1),
      },
    };
  },
  solution: ({ a, b, c }) => [
    { text: 'Everything under the root is settled first: the two squares, then their sum. Only then is the root taken.' },
    { tex: `\\sqrt{${a}^2 + ${b}^2} = \\sqrt{${a * a} + ${b * b}}` },
    { tex: `= \\sqrt{${a * a + b * b}} = ${c}` },
    { text: `Rooting the squares separately gives $${a} + ${b} = ${a + b}$, which is wrong: a root does not split over a sum.` },
  ],
};

interface MagKParams {
  a: number;
  b: number;
  c: number;
  /** Whether the unknown is the i component. */
  kFirst: boolean;
  /** The sign of the known component. */
  s: number;
}

function magKTex({ b, kFirst, s }: MagKParams): string {
  return kFirst ? `k\\mathbf{i} ${s < 0 ? '-' : '+'} ${b}\\mathbf{j}` : `${s * b}\\mathbf{i} + k\\mathbf{j}`;
}

/** A missing component from a known magnitude. */
const magnitudeK: Generator<MagKParams> = {
  id: 'vunit-mag-k',
  sample: (rng, difficulty) => {
    const [a, b, c] = rng.pick(difficulty > 1 ? TRIPLES : SMALL_TRIPLES);
    return { a, b, c, kFirst: rng.chance(0.5), s: rng.pick([1, -1]) };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `$k$ is positive and this vector has magnitude $${params.c}$. Find $k$.` },
      { kind: 'display', tex: `\\left| ${magKTex(params)} \\right| = ${params.c}` },
    ],
    lead: 'k =',
    keypad: [],
    answer: `${params.a}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, c, s }) => [
    { text: 'Write the magnitude with Pythagoras and square both sides to lose the root.' },
    { tex: `k^2 + ${br(s * b)}^2 = ${c}^2` },
    { tex: `k^2 = ${c * c} - ${b * b} = ${a * a}` },
    { tex: `k = ${a}` },
    { text: `$k$ is positive, so $-${a}$ is left out.` },
  ],
};

interface SurdParams {
  x: number;
  y: number;
}

/** A magnitude in simplest surd form: \sqrt{45} = 3\sqrt{5}. */
const surdForm: Generator<SurdParams> = {
  id: 'vunit-surd',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 12 : 8;
    for (let tries = 0; tries < 200; tries += 1) {
      const x = nz(rng, span);
      const y = nz(rng, span);
      const { k, m } = surdParts(x * x + y * y);
      if (k > 1 && m > 1) return { x, y };
    }
    return { x: 6, y: 3 };
  },
  render: (params): Slide => {
    const { x, y } = params;
    const { k, m } = surdParts(x * x + y * y);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Find the magnitude, as a surd in its simplest form.' },
        { kind: 'display', tex: `\\left| ${vecTex([x, y])} \\right|` },
      ],
      options: placeAnswer(
        `${k}\\sqrt{${m}}`,
        // The factors crossed, the square not rooted, and one too many.
        [
          Number.isInteger(Math.sqrt(k)) ? `\\sqrt{${k * m}}` : `${m}\\sqrt{${k}}`,
          `${k * k}\\sqrt{${m}}`,
          `${k + 1}\\sqrt{${m}}`,
        ].filter((label) => label !== `${k}\\sqrt{${m}}`),
        saltOf(params),
      ),
      correctId: 'right',
    };
  },
  solution: ({ x, y }) => {
    const n = x * x + y * y;
    const { k, m } = surdParts(n);
    return [
      { tex: `\\sqrt{${br(x)}^2 + ${br(y)}^2} = \\sqrt{${n}}` },
      { text: `The largest square that divides $${n}$ is $${k * k}$.` },
      { tex: `\\sqrt{${n}} = \\sqrt{${k * k} \\times ${m}}` },
      { tex: `= \\sqrt{${k * k}} \\times \\sqrt{${m}} = ${k}\\sqrt{${m}}` },
      { text: `$${m}$ has no square factor left, so this is the simplest form.` },
    ];
  },
};

interface DistanceParams {
  a: V2;
  b: V2;
}

/** The distance between two points given as position vectors in i, j form. */
const distance: Generator<DistanceParams> = {
  id: 'vunit-distance',
  choices: (params) => {
    const { a, b } = params;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const n = dx * dx + dy * dy;
    const added = (a[0] + b[0]) ** 2 + (a[1] + b[1]) ** 2;
    const candidates: [string, string, number][] = [
      [surdTex(added), `sqrt(${added})`, Math.sqrt(added)],
      [`${n}`, `${n}`, n],
      [`${Math.abs(dx) + Math.abs(dy)}`, `${Math.abs(dx) + Math.abs(dy)}`, Math.abs(dx) + Math.abs(dy)],
      [surdTex(n + 2 * Math.abs(dx)), `sqrt(${n + 2 * Math.abs(dx)})`, Math.sqrt(n + 2 * Math.abs(dx))],
    ];
    const values = [Math.sqrt(n)];
    const kept: { tex: string; answer: string }[] = [];
    for (const [tex, answer, value] of candidates) {
      if (kept.length === 3) break;
      if (value === 0 || values.some((v) => Math.abs(v - value) < 1e-9)) continue;
      values.push(value);
      kept.push({ tex, answer });
    }
    return steered(options({ tex: surdTex(n), answer: `sqrt(${n})` }, ...kept), saltOf(params));
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 8 : 5;
    for (let tries = 0; tries < 40; tries += 1) {
      const a: V2 = [rng.int(-span, span), rng.int(-span, span)];
      const b: V2 = [rng.int(-span, span), rng.int(-span, span)];
      if (b[0] !== a[0] && b[1] !== a[1]) return { a, b };
    }
    return { a: [2, 1], b: [5, -3] };
  },
  render: ({ a, b }): Slide => {
    const n = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: '$A$ and $B$ have these position vectors. Find the distance $AB$ exactly.' },
        { kind: 'display', tex: givens(['\\mathbf{a}', vecTex(a)], ['\\mathbf{b}', vecTex(b)]) },
      ],
      lead: 'AB =',
      keypad: SURD_KEYS,
      answer: `sqrt(${n})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b }) => {
    const d: V2 = [b[0] - a[0], b[1] - a[1]];
    const n = d[0] * d[0] + d[1] * d[1];
    const shown = surdTex(n);
    return [
      { text: 'Find $\\overrightarrow{AB}$ first, destination minus start, then its magnitude.' },
      { tex: `\\overrightarrow{AB} = \\mathbf{b} - \\mathbf{a} = ${vecTex(d)}` },
      { tex: `AB = \\sqrt{${br(d[0])}^2 + ${br(d[1])}^2}` },
      { tex: `= \\sqrt{${n}}${shown === `\\sqrt{${n}}` ? '' : ` = ${shown}`}` },
      { text: 'Taking the magnitudes of $\\mathbf{a}$ and $\\mathbf{b}$ themselves measures from the origin, which is a different question.' },
    ];
  },
};

/* ======================= Lesson 3: direction ======================= */

interface TanParams {
  a: number;
  b: number;
  /** Any quadrant, asking for the acute angle with the x axis. */
  general: boolean;
}

/** The acute angle a vector makes with the x axis, in degrees, unrounded. */
const acuteOf = (a: number, b: number) => (Math.atan(Math.abs(b) / Math.abs(a)) * 180) / Math.PI;

/** True when the angle is clear of a rounding boundary, so the nearest degree is certain. */
const clearOfHalf = (deg: number) => Math.abs((deg % 1) - 0.5) > 0.05;

/** A first-quadrant vector, or with difficulty 2 a signed one; never at 45 degrees. */
function sampleDirection(rng: Parameters<Generator['sample']>[0], difficulty: number): { a: number; b: number } {
  for (let tries = 0; tries < 80; tries += 1) {
    const a = rng.int(1, 9);
    const b = rng.int(1, 9);
    if (a === b || !clearOfHalf(acuteOf(a, b))) continue;
    if (difficulty <= 1) return { a, b };
    return { a: rng.chance(0.5) ? a : -a, b: rng.chance(0.5) ? b : -b };
  }
  return { a: 3, b: 4 };
}

/** tan of the angle with i (first quadrant), or of the acute angle with the x axis. */
const tangent: Generator<TanParams> = {
  id: 'vunit-tan',
  choices: (params) => {
    const A = Math.abs(params.a);
    const B = Math.abs(params.b);
    return steered(
      options(
        { tex: fracTex(B, A), answer: `${B}/${A}` },
        { tex: fracTex(A, B), answer: `${A}/${B}` },
        { tex: fracTex(-B, A), answer: `-${B}/${A}` },
        { tex: fracTex(-A, B), answer: `-${A}/${B}` },
      ),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => ({ ...sampleDirection(rng, difficulty), general: difficulty > 1 }),
  render: ({ a, b, general }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: general
          ? `$\\alpha$ is the acute angle between $${vecTex([a, b])}$ and the $x$ axis. Find $\\tan\\alpha$.`
          : `$\\theta$ is the angle between $${vecTex([a, b])}$ and $\\mathbf{i}$. Find $\\tan\\theta$.`,
      },
    ],
    lead: general ? '\\tan\\alpha =' : '\\tan\\theta =',
    keypad: [{ insert: '/' }],
    answer: `${Math.abs(b)}/${Math.abs(a)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, general }) => {
    const A = Math.abs(a);
    const B = Math.abs(b);
    const angle = general ? '\\alpha' : '\\theta';
    const simpler = fracTex(B, A) === `\\frac{${B}}{${A}}` ? '' : ` = ${fracTex(B, A)}`;
    return [
      {
        text: general
          ? `Draw the right-angled triangle from the sizes of the components: $${A}$ across and $${B}$ up or down. The signs only say which way; the acute angle uses the sizes.`
          : `Draw the right-angled triangle: $${A}$ across along $\\mathbf{i}$, then $${B}$ up. The side across is next to the angle and the side up is opposite it.`,
      },
      { tex: `\\tan${angle} = \\frac{\\text{opposite}}{\\text{adjacent}} = \\frac{${B}}{${A}}${simpler}` },
      { text: `Upside down, $${fracTex(A, B)}$, is the tangent of the angle with the $y$ axis instead.` },
    ];
  },
};

interface AngleParams {
  a: number;
  b: number;
}

/** The angle anticlockwise from the positive x axis, 0 to 360, unrounded. */
const fullAngle = (a: number, b: number) => {
  const deg = (Math.atan2(b, a) * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
};

/** Which rule turns the acute angle into the full one. */
function quadrantRule(a: number, b: number): string {
  if (a > 0 && b > 0) return '\\theta = \\alpha';
  if (a < 0 && b > 0) return '\\theta = 180^\\circ - \\alpha';
  if (a < 0 && b < 0) return '\\theta = 180^\\circ + \\alpha';
  return '\\theta = 360^\\circ - \\alpha';
}

/** The angle to the nearest degree, from four whole-degree options. */
const angleChoice: Generator<AngleParams> = {
  id: 'vunit-angle',
  sample: sampleDirection,
  render: (params): Slide => {
    const { a, b } = params;
    const alpha = Math.round(acuteOf(a, b));
    const right = Math.round(fullAngle(a, b));
    const firstQuadrant = a > 0 && b > 0;
    const pool = firstQuadrant
      ? [90 - alpha, 180 - alpha, 360 - alpha]
      : [alpha, 180 - alpha, 180 + alpha, 360 - alpha].filter((deg) => deg !== right);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Find the angle from the positive $x$ axis to $${vecTex([a, b])}$, measured anticlockwise, to the nearest degree.` },
      ],
      options: placeAnswer(`${right}^\\circ`, pool.map((deg) => `${deg}^\\circ`), saltOf(params)),
      correctId: 'right',
    };
  },
  solution: ({ a, b }) => {
    const A = Math.abs(a);
    const B = Math.abs(b);
    const alpha = acuteOf(a, b);
    return [
      { text: 'First the acute angle with the $x$ axis, from the sizes of the components.' },
      { tex: `\\tan\\alpha = \\frac{${B}}{${A}}` },
      { tex: `\\alpha = \\tan^{-1}(\\tfrac{${B}}{${A}}) = ${alpha.toFixed(1)}^\\circ` },
      {
        text: `The vector points ${a > 0 ? 'right' : 'left'} and ${b > 0 ? 'up' : 'down'}, so $${quadrantRule(a, b)}$.`,
      },
      { tex: `\\theta = ${fullAngle(a, b).toFixed(1)}^\\circ \\approx ${Math.round(fullAngle(a, b))}^\\circ` },
    ];
  },
};

/** Which quadrant rule applies, walked as a decision. */
const quadrantFlow: Generator<AngleParams> = {
  id: 'vunit-quadrant-flow',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 12 : 9;
    return { a: nz(rng, span), b: nz(rng, span) };
  },
  render: ({ a, b }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: '$\\theta$ is the angle from the positive $x$ axis, anticlockwise, and $\\alpha$ the acute angle with the $x$ axis. Which rule gives $\\theta$?',
      },
    ],
    subject: vecTex([a, b]),
    steps: [
      {
        id: 'across',
        ask: 'Does the vector point right or left?',
        branches: [
          { label: 'Right', to: 'right' },
          { label: 'Left', to: 'left' },
        ],
      },
      {
        id: 'right',
        ask: 'Does it point up or down?',
        branches: [
          { label: 'Up', outcome: 'First quadrant: $\\theta = \\alpha$.' },
          { label: 'Down', outcome: 'Fourth quadrant: $\\theta = 360^\\circ - \\alpha$.' },
        ],
      },
      {
        id: 'left',
        ask: 'Does it point up or down?',
        branches: [
          { label: 'Up', outcome: 'Second quadrant: $\\theta = 180^\\circ - \\alpha$.' },
          { label: 'Down', outcome: 'Third quadrant: $\\theta = 180^\\circ + \\alpha$.' },
        ],
      },
    ],
    answer: [a > 0 ? 'Right' : 'Left', b > 0 ? 'Up' : 'Down'],
  }),
  solution: ({ a, b }) => [
    { text: `The $\\mathbf{i}$ component is $${a}$, so the vector points ${a > 0 ? 'right' : 'left'}. The $\\mathbf{j}$ component is $${b}$, so it points ${b > 0 ? 'up' : 'down'}.` },
    { tex: quadrantRule(a, b) },
    { text: 'Sketching the vector first makes the quadrant obvious, and the rule then follows from where it sits.' },
  ],
};

interface AxisParams {
  k: number;
  /** One of eight directions, 45 degrees apart, anticlockwise from i; never 0. */
  dir: number;
}

const DIRECTIONS: V2[] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/** Vectors along an axis or a diagonal, whose angles are exact. */
const axisAngle: Generator<AxisParams> = {
  id: 'vunit-axis-angle',
  sample: (rng, difficulty) => ({ k: rng.int(1, difficulty > 1 ? 12 : 8), dir: rng.int(1, 7) }),
  render: ({ k, dir }): Slide => {
    const [u, v] = DIRECTIONS[dir];
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `Find the angle from the positive $x$ axis to $${vecTex([k * u, k * v])}$, measured anticlockwise, in degrees.` },
      ],
      lead: '\\theta =',
      keypad: [],
      answer: `${45 * dir}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ k, dir }) => {
    const [u, v] = DIRECTIONS[dir];
    const a = k * u;
    const b = k * v;
    if (u === 0 || v === 0) {
      return [
        { text: `$${vecTex([a, b])}$ lies along the ${u === 0 ? '$y$' : '$x$'} axis, pointing ${u > 0 ? 'right' : u < 0 ? 'left' : v > 0 ? 'up' : 'down'}.` },
        { text: 'Anticlockwise from the positive $x$ axis: up is $90^\\circ$, left is $180^\\circ$ and down is $270^\\circ$.' },
        { tex: `\\theta = ${45 * dir}^\\circ` },
      ];
    }
    return [
      { text: 'The two components are the same size, so the acute angle with the $x$ axis is $45^\\circ$.' },
      { tex: `\\tan\\alpha = \\frac{${k}}{${k}} = 1 \\implies \\alpha = 45^\\circ` },
      { text: `It points ${a > 0 ? 'right' : 'left'} and ${b > 0 ? 'up' : 'down'}, so $${quadrantRule(a, b)}$.` },
      { tex: `\\theta = ${45 * dir}^\\circ` },
    ];
  },
};

/* ======================= Lesson 4: unit vectors ======================= */

interface HatParams {
  a: number;
  b: number;
  c: number;
}

/** A triple with signs: the vector and its whole magnitude. */
function sampleTriple(rng: Parameters<Generator['sample']>[0], difficulty: number): HatParams {
  const [a, b, c] = rng.pick(difficulty > 1 ? TRIPLES : SMALL_TRIPLES);
  return { a: rng.chance(0.5) ? a : -a, b: rng.chance(0.5) ? b : -b, c };
}

/** The unit vector of a vector with a whole magnitude, placed as fraction tiles. */
const hat: Generator<HatParams> = {
  id: 'vunit-hat',
  choices: (params) => {
    const { a, b, c } = params;
    const s = Math.abs(a) + Math.abs(b);
    const recip = `${fracTex(c, a)}\\mathbf{i} ${b < 0 ? '-' : '+'} ${fracTex(c, Math.abs(b))}\\mathbf{j}`;
    return steered(
      options(
        { tex: fracVecTex([a, b], c) },
        { tex: fracVecTex([a, b], s) },
        { tex: recip },
        { tex: fracVecTex([a, -b], c) },
      ),
      saltOf(params),
    );
  },
  sample: sampleTriple,
  render: ({ a, b, c }): Slide => {
    const s = Math.abs(a) + Math.abs(b);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Find the unit vector in the direction of this vector.' },
        { kind: 'display', tex: vecTex([a, b]) },
      ],
      template: VECTOR_TEMPLATE,
      bank: bankOf(
        [fracTex(a, c), fracTex(b, c)],
        [fracTex(c, a), fracTex(-a, c), fracTex(-b, c), fracTex(a, s), fracTex(b, s)],
      ),
      answer: [fracTex(a, c), fracTex(b, c)],
    };
  },
  solution: ({ a, b, c }) => [
    { text: 'Find the magnitude, then divide each component by it.' },
    { tex: `\\left| ${vecTex([a, b])} \\right| = \\sqrt{${a * a} + ${b * b}}` },
    { tex: `= \\sqrt{${c * c}} = ${c}` },
    { tex: `\\hat{\\mathbf{v}} = \\frac{1}{${c}}(${vecTex([a, b])})` },
    { tex: `= ${fracVecTex([a, b], c)}` },
    { text: 'Check: the components squared add up to exactly 1.' },
    { tex: `\\frac{${a * a}}{${c * c}} + \\frac{${b * b}}{${c * c}} = 1` },
  ],
};

/** Which of four vectors has length one. */
const isUnit: Generator<HatParams> = {
  id: 'vunit-is-unit',
  sample: (rng) => {
    const [a, b, c] = rng.pick(PRIMITIVE_TRIPLES);
    return { a: rng.chance(0.5) ? a : -a, b: rng.chance(0.5) ? b : -b, c };
  },
  render: (params): Slide => {
    const { a, b, c } = params;
    const s = Math.abs(a) + Math.abs(b);
    const swapped = `${fracTex(a, Math.abs(b))}\\mathbf{i} ${b < 0 ? '-' : '+'} ${fracTex(Math.abs(b), Math.abs(a))}\\mathbf{j}`;
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: 'Which of these is a unit vector?' }],
      options: placeAnswer(fracVecTex([a, b], c), [fracVecTex([a, b], s), fracVecTex([a, b], c * c), swapped], saltOf(params)),
      correctId: 'right',
    };
  },
  solution: ({ a, b, c }) => [
    { text: 'A unit vector has magnitude 1, so its components squared add up to exactly 1.' },
    { tex: `\\frac{${Math.abs(a)}^2}{${c}^2} + \\frac{${Math.abs(b)}^2}{${c}^2}` },
    { tex: `= \\frac{${a * a}}{${c * c}} + \\frac{${b * b}}{${c * c}} = 1` },
    { text: `So $${fracVecTex([a, b], c)}$ is the unit vector. It is $${vecTex([a, b])}$ divided by its magnitude, $${c}$.` },
  ],
};

interface HatKParams {
  x: number;
  y: number;
}

/** The scalar 1/|v| for a vector whose magnitude is a surd. */
const hatK: Generator<HatKParams> = {
  id: 'vunit-hat-k',
  choices: (params) => {
    const n = params.x * params.x + params.y * params.y;
    const s = Math.abs(params.x) + Math.abs(params.y);
    return steered(
      options(
        { tex: `\\frac{1}{${surdTex(n)}}`, answer: `1/sqrt(${n})` },
        { tex: surdTex(n), answer: `sqrt(${n})` },
        { tex: `\\frac{1}{${n}}`, answer: `1/${n}` },
        { tex: `\\frac{1}{${s}}`, answer: `1/${s}` },
      ),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 9 : 5;
    for (let tries = 0; tries < 80; tries += 1) {
      const x = nz(rng, span);
      const y = nz(rng, span);
      if (surdParts(x * x + y * y).m > 1) return { x, y };
    }
    return { x: 2, y: 1 };
  },
  render: ({ x, y }): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `The unit vector in the direction of $${vecTex([x, y])}$ is $k(${vecTex([x, y])})$, with $k$ positive. Find $k$ exactly.` },
    ],
    lead: 'k =',
    keypad: SURD_KEYS,
    answer: `1/sqrt(${x * x + y * y})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ x, y }) => {
    const n = x * x + y * y;
    const shown = surdTex(n);
    return [
      { text: 'Dividing by the magnitude is multiplying by one over it, so $k$ is one over the magnitude.' },
      { tex: `\\left| ${vecTex([x, y])} \\right| = \\sqrt{${x * x} + ${y * y}}` },
      { tex: `= \\sqrt{${n}}${shown === `\\sqrt{${n}}` ? '' : ` = ${shown}`}` },
      { tex: `k = \\frac{1}{${shown}}` },
      { tex: `\\hat{\\mathbf{v}} = \\frac{1}{${shown}}(${vecTex([x, y])})` },
    ];
  },
};

interface ScaleParams {
  a: number;
  b: number;
  c: number;
  /** The magnitude asked for is t times the vector's own. */
  t: number;
}

/** A vector of a given magnitude in the direction of another. */
const scaleTo: Generator<ScaleParams> = {
  id: 'vunit-scale-to',
  choices: (params) => {
    const { a, b, c, t } = params;
    const m = t * c;
    return steered(
      options(
        { tex: vecTex([t * a, t * b]) },
        { tex: vecTex([m * a, m * b]) },
        { tex: vecTex([-t * a, -t * b]) },
        { tex: vecTex([t * b, t * a]) },
      ),
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const { a, b, c } = sampleTriple(rng, 1);
    return { a, b, c, t: rng.int(2, difficulty > 1 ? 6 : 4) };
  },
  render: ({ a, b, c, t }): Slide => {
    const m = t * c;
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Find the vector of magnitude $${m}$ in the same direction as $${vecTex([a, b])}$.` }],
      template: VECTOR_TEMPLATE,
      bank: bankOf([`${t * a}`, `${t * b}`], [`${m * a}`, `${m * b}`, `${-t * a}`, `${-t * b}`]),
      answer: [`${t * a}`, `${t * b}`],
    };
  },
  solution: ({ a, b, c, t }) => {
    const m = t * c;
    return [
      { text: 'Make a unit vector, then multiply it by the magnitude wanted.' },
      { tex: `\\left| ${vecTex([a, b])} \\right| = ${c}` },
      { tex: `${m} \\times \\frac{1}{${c}}(${vecTex([a, b])})` },
      { tex: `= ${t}(${vecTex([a, b])}) = ${vecTex([t * a, t * b])}` },
      { text: `Multiplying by $${m}$ without dividing by $${c}$ first gives a vector ${c} times too long.` },
    ];
  },
};

/* ======================= Lesson 5: three dimensions ======================= */

interface Column3Params {
  v: V3;
}

/** From i, j, k form to a column, as a choice. */
const column3Choice: Generator<Column3Params> = {
  id: 'vunit-3d-column',
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 9 : 6;
    const v: V3 = [nz(rng, span), nz(rng, span), nz(rng, span)];
    // Often one component missing, or a lone letter.
    const roll = rng.int(0, 3);
    if (roll === 0) v[rng.int(0, 2)] = 0;
    if (roll === 1) v[rng.int(0, 2)] = rng.pick([1, -1]);
    return { v };
  },
  render: (params): Slide => {
    const { v } = params;
    const [x, y, z] = v;
    // The terms that are there, pushed up with the zero left at the bottom.
    const present = v.filter((n) => n !== 0);
    const squashed = [...present, 0, 0, 0].slice(0, 3);
    const wrong = [
      column3(squashed),
      column3([x, z, y]),
      column3([x, y, -z]),
      column3([-x, y, z]),
      column3([z, y, x]),
    ].filter((tex, at, all) => tex !== column3(v) && all.indexOf(tex) === at);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which column vector is $${vecTex(v)}$?` }],
      options: placeAnswer(column3(v), wrong.slice(0, 3), saltOf(params)),
      correctId: 'right',
    };
  },
  solution: ({ v }) => [
    { text: 'Top is the $\\mathbf{i}$ component, middle the $\\mathbf{j}$ component and bottom the $\\mathbf{k}$ component.' },
    ...(v.includes(0)
      ? [{ text: 'A missing letter means that component is $0$, and the $0$ still takes its place in the column.' }]
      : []),
    { tex: `${vecTex(v)} = ${column3(v)}` },
  ],
};

interface Add3Params {
  p: number;
  q: number;
  a: V3;
  b: V3;
}

const combined3 = ({ p, q, a, b }: Add3Params): V3 => [
  p * a[0] + q * b[0],
  p * a[1] + q * b[1],
  p * a[2] + q * b[2],
];

/** Adding and scaling in three dimensions. */
const add3: Generator<Add3Params> = {
  id: 'vunit-3d-add',
  choices: (params) => {
    const { p, q, a, b } = params;
    const right = combined3(params);
    const wrong: V3[] = [
      combined3({ p, q: -q, a, b }),
      combined3({ p: 1, q: q < 0 ? -1 : 1, a, b }),
      [right[0], right[2], right[1]],
      [right[0], right[1], -right[2]],
    ];
    const kept = wrong.filter((w, at) => !same(w, right) && wrong.findIndex((u) => same(u, w)) === at).slice(0, 3);
    return steered(options({ tex: vecTex(right) }, ...kept.map((w) => ({ tex: vecTex(w) }))), saltOf(params));
  },
  sample: (rng, difficulty) => {
    const span = difficulty > 1 ? 6 : 5;
    const draw = (): V3 => {
      const v: V3 = [nz(rng, span), nz(rng, span), nz(rng, span)];
      if (rng.chance(0.3)) v[rng.int(0, 2)] = 0;
      return v;
    };
    return {
      p: difficulty > 1 ? rng.pick([1, 2, 3]) : 1,
      q: difficulty > 1 ? rng.pick([1, -1, 2, -2]) : rng.pick([1, -1]),
      a: draw(),
      b: draw(),
    };
  },
  render: (params): Slide => {
    const { p, q, a, b } = params;
    const r = combined3(params);
    const slip = combined3({ p, q: -q, a, b });
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Find $${scaledName(p, '\\mathbf{a}', true)} ${scaledName(q, '\\mathbf{b}', false)}$, where` },
        { kind: 'display', tex: givens(['\\mathbf{a}', vecTex(a)], ['\\mathbf{b}', vecTex(b)]) },
      ],
      template: VECTOR3_TEMPLATE,
      bank: bankOf(r.map(String), slip.map(String)),
      answer: r.map(String),
    };
  },
  solution: (params) => {
    const { p, q, a, b } = params;
    const r = combined3(params);
    const line = (at: number) =>
      `${UNITS[at]}: \\; ${p === 1 ? '' : `${p} \\times `}${br(a[at])} ${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : `${Math.abs(q)} \\times `}${br(b[at])} = ${r[at]}`;
    return [
      { text: 'Exactly as in two dimensions: each component on its own, with $\\mathbf{k}$ as a third.' },
      { tex: line(0) },
      { tex: line(1) },
      { tex: line(2) },
      { tex: `= ${vecTex(r)}` },
    ];
  },
};

interface Mag3Params {
  v: V3;
}

/** |xi + yj + zk| exactly. */
const magnitude3: Generator<Mag3Params> = {
  id: 'vunit-3d-mag',
  sample: (rng, difficulty) => {
    if (difficulty <= 1 || rng.chance(0.4)) return { v: drawQuadruple(rng, difficulty <= 1).v };
    for (let tries = 0; tries < 40; tries += 1) {
      const v: V3 = [nz(rng, 6), nz(rng, 6), rng.int(-6, 6)];
      if (surdParts(v[0] ** 2 + v[1] ** 2 + v[2] ** 2).m > 1) return { v };
    }
    return { v: [1, -2, 3] };
  },
  render: ({ v }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Find the magnitude exactly.' }],
    lead: `\\left| ${vecTex(v)} \\right| =`,
    keypad: SURD_KEYS,
    answer: `sqrt(${v[0] ** 2 + v[1] ** 2 + v[2] ** 2})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ v }) => {
    const n = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
    const shown = surdTex(n);
    return [
      { text: 'Pythagoras with a third component: square all three, add, then root.' },
      { tex: `\\sqrt{${br(v[0])}^2 + ${br(v[1])}^2 + ${br(v[2])}^2}` },
      { tex: `= \\sqrt{${v[0] ** 2} + ${v[1] ** 2} + ${v[2] ** 2}}` },
      { tex: `= \\sqrt{${n}}${shown === `\\sqrt{${n}}` ? '' : ` = ${shown}`}` },
    ];
  },
};

/** The same magnitude as a tree: three squares, their sum, the root. */
const magnitude3Tree: Generator<Mag3Params> = {
  id: 'vunit-3d-mag-tree',
  sample: (rng, difficulty) => ({ v: drawQuadruple(rng, difficulty <= 1).v }),
  render: ({ v }): Slide => {
    const squares = v.map((n) => n * n);
    const sum = squares[0] + squares[1] + squares[2];
    const d = Math.round(Math.sqrt(sum));
    const answer = [...squares.map(String), `${sum}`, `${d}`];
    const slips = [
      ...v.map((n) => `${2 * Math.abs(n)}`),
      `${Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2])}`,
      `${sum + 2}`,
      `${d + 1}`,
    ];
    const needed = new Set(answer);
    const extras = slips.filter((t, at) => !needed.has(t) && slips.indexOf(t) === at);
    return {
      kind: 'tree',
      prompt: [{ kind: 'prose', text: `Fill the tree to find the magnitude of $${vecTex(v)}$: the three squares, their sum, then the root.` }],
      expression: `\\sqrt{${br(v[0])}^2 + ${br(v[1])}^2 + ${br(v[2])}^2}`,
      nodes: [
        { id: 'x', from: [] },
        { id: 'y', from: [] },
        { id: 'z', from: [] },
        { id: 'sum', from: ['x', 'y', 'z'] },
        { id: 'root', from: ['sum'] },
      ],
      bank: [...answer, ...extras].sort((p, q) => Number(p) - Number(q)),
      answer,
    };
  },
  solution: ({ v }) => {
    const n = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
    return [
      { text: 'Square each component; the signs go.' },
      { tex: `${v[0] ** 2}, \\quad ${v[1] ** 2}, \\quad ${v[2] ** 2}` },
      { tex: `${v[0] ** 2} + ${v[1] ** 2} + ${v[2] ** 2} = ${n}` },
      { tex: `\\sqrt{${n}} = ${Math.round(Math.sqrt(n))}` },
    ];
  },
};

/** The unit vector in three dimensions, over a whole magnitude. */
const hat3: Generator<{ v: V3; d: number }> = {
  id: 'vunit-3d-hat',
  sample: (rng, difficulty) => drawQuadruple(rng, difficulty <= 1),
  render: ({ v, d }): Slide => {
    const s = Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]);
    const answer = v.map((n) => fracTex(n, d));
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Find the unit vector in the direction of this vector.' },
        { kind: 'display', tex: vecTex(v) },
      ],
      template: VECTOR3_TEMPLATE,
      bank: bankOf(answer, [fracTex(d, v[0]), ...v.map((n) => fracTex(-n, d)), ...v.map((n) => fracTex(n, s))]),
      answer,
    };
  },
  solution: ({ v, d }) => [
    { text: 'Find the magnitude, then divide every component by it.' },
    { tex: `\\sqrt{${v[0] ** 2} + ${v[1] ** 2} + ${v[2] ** 2}} = \\sqrt{${d * d}} = ${d}` },
    { tex: `\\hat{\\mathbf{v}} = \\frac{1}{${d}}(${vecTex(v)})` },
    { tex: `= ${fracVecTex(v, d)}` },
  ],
};

interface Scale3Params {
  v: V3;
  d: number;
  /** The magnitude asked for is t times the vector's own. */
  t: number;
}

/** A vector of a given magnitude in the direction of a 3D vector. */
const scale3: Generator<Scale3Params> = {
  id: 'vunit-3d-scale',
  sample: (rng, difficulty) => ({ ...drawQuadruple(rng, true), t: rng.int(2, difficulty > 1 ? 5 : 3) }),
  render: ({ v, d, t }): Slide => {
    const m = t * d;
    const answer = v.map((n) => `${t * n}`);
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Find the vector of magnitude $${m}$ in the same direction as $${vecTex(v)}$.` }],
      template: VECTOR3_TEMPLATE,
      bank: bankOf(answer, [...v.map((n) => `${m * n}`), ...v.map((n) => `${-t * n}`)]),
      answer,
    };
  },
  solution: ({ v, d, t }) => {
    const m = t * d;
    return [
      { text: 'Find the magnitude, make the unit vector, then multiply by the magnitude wanted.' },
      { tex: `\\left| ${vecTex(v)} \\right| = \\sqrt{${d * d}} = ${d}` },
      { tex: `${m} \\times \\frac{1}{${d}}(${vecTex(v)})` },
      { tex: `= ${t}(${vecTex(v)})` },
      { tex: `= ${vecTex(v.map((n) => t * n))}` },
    ];
  },
};

export const vectorUnitGenerators = [
  toColumn,
  toIj,
  readJ,
  combine,
  missing,
  magnitude,
  magnitudeSteps,
  magnitudeK,
  surdForm,
  distance,
  tangent,
  angleChoice,
  quadrantFlow,
  axisAngle,
  hat,
  isUnit,
  hatK,
  scaleTo,
  column3Choice,
  add3,
  magnitude3,
  magnitude3Tree,
  hat3,
  scale3,
] as Generator<unknown>[];
