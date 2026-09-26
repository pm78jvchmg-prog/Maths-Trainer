/**
 * Vectors, level 13 (`vm-l13`): Adding and Subtracting Vectors.
 *
 * Level 1 taught the arithmetic in columns. This level is the picture behind
 * it, at GCSE higher with small whole numbers: reading an arrow on squared
 * paper, equal and negative vectors, the triangle law and the parallelogram,
 * `b - a` as the arrow from one tip to the other, several vectors combined,
 * an unknown vector solved for, and unknown scalars found from two component
 * equations.
 *
 * Every figure here is drawn by `gridSvg`, square and to scale, one grid unit
 * per square. It maps the window `[0, cols] x [0, rows]` onto the whole
 * picture with no inset, which is what lets a slider marker, placed as a
 * fraction of the picture's width or height, line up with a grid line: the
 * sliders declare `xMin: 0` and `xMax` as the window's width or height.
 *
 * Column-vector answers are placed as tiles into `COLUMN_TEMPLATE`, labelled
 * top and bottom, because a template is split into independent TeX fragments
 * at each blank and a `pmatrix` cannot span one (see `vectorFormat.ts`).
 */
import type { ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { ALGEBRA_KEYS } from './calculus';
import { plusMinus, surdAnswer, surdTex } from './format';
import { bankOf, columnTex, signedChoices } from './vectorFormat';

/** A column-vector answer, top entry then bottom. */
export const COLUMN_TEMPLATE = '\\text{top: } {0} \\quad \\text{bottom: } {1}';

const SURD_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'sqrt(' }];

const bold = (letter: string) => `\\mathbf{${letter}}`;
const arrowTex = (from: string, to: string) => `\\overrightarrow{${from}${to}}`;

/** Whole numbers from lo to hi, skipping zero. */
function nonZeroInt(rng: Rng, lo: number, hi: number): number {
  for (;;) {
    const n = rng.int(lo, hi);
    if (n !== 0) return n;
  }
}

/** A signed coefficient in front of a letter: `2\mathbf{a}`, `-\mathbf{a}`. */
function coefTex(c: number, body: string): string {
  if (c === 1) return body;
  if (c === -1) return `-${body}`;
  return `${c}${body}`;
}

/** A sum of terms written as by hand: `2\mathbf{a} - 3\mathbf{b} + \mathbf{c}`. */
export function sumTex(terms: [number, string][]): string {
  let out = '';
  for (const [c, body] of terms) {
    if (c === 0) continue;
    if (out === '') out = coefTex(c, body);
    else out += c < 0 ? ` - ${coefTex(-c, body)}` : ` + ${coefTex(c, body)}`;
  }
  return out === '' ? '\\mathbf{0}' : out;
}

/** `(-3)` for a negative, `5` for a positive: a number safe after an operator. */
const br = (n: number) => (n < 0 ? `\\left(${n}\\right)` : `${n}`);

/** Tile bank for a tree: the answer with multiplicity and at least three spares. */
function treeBank(answer: string[], distractors: string[]): string[] {
  const needed = new Map<string, number>();
  for (const token of answer) needed.set(token, (needed.get(token) ?? 0) + 1);
  const extras = [...new Set(distractors)].filter((token) => !needed.has(token));
  for (let offset = 1; extras.length < 3 && offset <= 20; offset += 1) {
    for (const token of answer) {
      for (const candidate of [`${Number(token) + offset}`, `${Number(token) - offset}`]) {
        if (!needed.has(candidate) && !extras.includes(candidate)) extras.push(candidate);
      }
    }
  }
  return [...answer, ...extras.slice(0, 4)].sort((x, y) => Number(x) - Number(y));
}

/**
 * Four column-vector options: the right one and up to three slips, dropping any
 * slip that lands on the right vector or on another slip, and padding with a
 * near miss so there are always four.
 */
function columnOptions(correct: [number, number], slips: [number, number][]): ChoiceOption[] {
  const key = ([x, y]: [number, number]) => `${x},${y}`;
  const seen = new Set([key(correct)]);
  const picked: [number, number][] = [];
  const pads: [number, number][] = [
    [correct[0] + 1, correct[1]],
    [correct[0], correct[1] - 1],
    [correct[0] - 1, correct[1] + 1],
  ];
  for (const v of [...slips, ...pads]) {
    if (picked.length === 3) break;
    if (seen.has(key(v))) continue;
    seen.add(key(v));
    picked.push(v);
  }
  return options({ tex: columnTex(...correct) }, ...picked.map((v) => ({ tex: columnTex(...v) })));
}

/* ---------- the figure ---------- */

export interface GridArrow {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Label, plain text; lower-case letters are set bold, as vectors are. */
  name?: string;
  /** `main` is the accent colour, `second` plain, `result` the accent dashed. */
  style?: 'main' | 'second' | 'result';
  /** A point the label is pushed away from, in grid units. */
  away?: [number, number];
  /** Leave the head off: a side of a shape rather than a vector. */
  plain?: boolean;
}

export interface GridDot {
  x: number;
  y: number;
  name: string;
  /** A point the name is pushed away from, in grid units. */
  away?: [number, number];
}

const UNIT = 20;

/**
 * Arrows on squared paper, to scale, the window `[0, cols] x [0, rows]` mapped
 * onto the whole picture. `grid: false` draws the same thing as a sketch.
 */
export function gridSvg(opts: {
  cols: number;
  rows: number;
  arrows: GridArrow[];
  dots?: GridDot[];
  grid?: boolean;
  label: string;
}): string {
  const { cols, rows, grid = true } = opts;
  const W = cols * UNIT;
  const H = rows * UNIT;
  const sx = (v: number) => v * UNIT;
  const sy = (v: number) => H - v * UNIT;
  const f = (v: number) => v.toFixed(1);
  const clampX = (v: number) => Math.min(W - 8, Math.max(8, v));
  const clampY = (v: number) => Math.min(H - 5, Math.max(14, v));

  // A sketch has no squares to count, so it need not fill the phone.
  const cap = grid ? '' : ` style="max-width: ${Math.round(W * 1.4)}px"`;
  const parts = [`<svg viewBox="0 0 ${W} ${H}" width="100%"${cap} role="img" aria-label="${opts.label}">`];
  if (grid) {
    for (let i = 1; i < cols; i += 1) {
      parts.push(
        `<line x1="${f(sx(i))}" y1="0" x2="${f(sx(i))}" y2="${H}" stroke="currentColor" stroke-width="0.6" opacity="0.2" />`,
      );
    }
    for (let j = 1; j < rows; j += 1) {
      parts.push(
        `<line x1="0" y1="${f(sy(j))}" x2="${W}" y2="${f(sy(j))}" stroke="currentColor" stroke-width="0.6" opacity="0.2" />`,
      );
    }
  }

  const labels: string[] = [];
  for (const arrow of opts.arrows) {
    const style = arrow.style ?? 'main';
    const accent = style === 'second' ? '' : ' class="plot-accent"';
    const dash = style === 'result' ? ' stroke-dasharray="6 4"' : '';
    const X0 = sx(arrow.x0);
    const Y0 = sy(arrow.y0);
    const X1 = sx(arrow.x1);
    const Y1 = sy(arrow.y1);
    parts.push(
      `<line x1="${f(X0)}" y1="${f(Y0)}" x2="${f(X1)}" y2="${f(Y1)}"${accent} stroke="currentColor" stroke-width="2.5"${dash} />`,
    );
    const angle = Math.atan2(Y1 - Y0, X1 - X0);
    if (!arrow.plain) {
      for (const turn of [0.4, -0.4]) {
        parts.push(
          `<line x1="${f(X1)}" y1="${f(Y1)}" x2="${f(X1 - 11 * Math.cos(angle + turn))}" y2="${f(Y1 - 11 * Math.sin(angle + turn))}"${accent} stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />`,
        );
      }
    }
    if (arrow.name) {
      const mx = (X0 + X1) / 2;
      const my = (Y0 + Y1) / 2;
      let nx = Math.sin(angle);
      let ny = -Math.cos(angle);
      if (arrow.away) {
        const ax = sx(arrow.away[0]) - mx;
        const ay = sy(arrow.away[1]) - my;
        if (nx * ax + ny * ay > 0) {
          nx = -nx;
          ny = -ny;
        }
      }
      const gap = arrow.name.length > 2 ? 22 : 13;
      const text = arrow.name.replace(/[a-z]/g, (m) => `<tspan font-weight="bold">${m}</tspan>`);
      labels.push(
        `<text x="${f(clampX(mx + gap * nx))}" y="${f(clampY(my + gap * ny + 5))}" font-size="15" font-family="serif" text-anchor="middle" fill="currentColor">${text}</text>`,
      );
    }
  }
  for (const dot of opts.dots ?? []) {
    const X = sx(dot.x);
    const Y = sy(dot.y);
    let dx = 0;
    let dy = -1;
    if (dot.away) {
      const ax = X - sx(dot.away[0]);
      const ay = Y - sy(dot.away[1]);
      const len = Math.hypot(ax, ay) || 1;
      dx = ax / len;
      dy = ay / len;
    }
    parts.push(`<circle cx="${f(X)}" cy="${f(Y)}" r="3.5" fill="currentColor" />`);
    labels.push(
      `<text x="${f(clampX(X + 13 * dx))}" y="${f(clampY(Y + 13 * dy + 5))}" font-size="14" font-style="italic" font-family="serif" text-anchor="middle" fill="currentColor">${dot.name}</text>`,
    );
  }
  parts.push(...labels, '</svg>');
  return parts.join('');
}

/**
 * Where to start a shape, given its points relative to the start, so every
 * point sits at least one square inside a `cols` by `rows` window. Undefined
 * when the shape is too wide or tall to fit.
 */
function fit(rng: Rng, points: [number, number][], cols: number, rows: number): [number, number] | undefined {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const loX = 1 - Math.min(...xs);
  const hiX = cols - 1 - Math.max(...xs);
  const loY = 1 - Math.min(...ys);
  const hiY = rows - 1 - Math.max(...ys);
  if (loX > hiX || loY > hiY) return undefined;
  return [rng.int(loX, hiX), rng.int(loY, hiY)];
}

/* ---------- Lesson 1: vectors on a grid ---------- */

interface ArrowParams {
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  name: string;
}

const ARROW_COLS = 10;
const ARROW_ROWS = 8;

function sampleArrow(rng: Rng, difficulty: number, names: string[]): ArrowParams {
  const reachX = difficulty > 1 ? 7 : 5;
  const reachY = difficulty > 1 ? 6 : 4;
  for (;;) {
    const dx = nonZeroInt(rng, -reachX, reachX);
    const dy = nonZeroInt(rng, -reachY, reachY);
    // Equal sizes would make the swapped-components slip the same vector
    // drawn a different way round, which is too subtle to be the point here.
    if (Math.abs(dx) === Math.abs(dy)) continue;
    const start = fit(rng, [[0, 0], [dx, dy]], ARROW_COLS, ARROW_ROWS);
    if (!start) continue;
    return { x0: start[0], y0: start[1], dx, dy, name: rng.pick(names) };
  }
}

function arrowFigure({ x0, y0, dx, dy, name }: ArrowParams): string {
  return gridSvg({
    cols: ARROW_COLS,
    rows: ARROW_ROWS,
    arrows: [{ x0, y0, x1: x0 + dx, y1: y0 + dy, name }],
    label: `A vector ${name} drawn as an arrow on squared paper`,
  });
}

function countingSteps(dx: number, dy: number): SolutionStep[] {
  return [
    {
      text: `From the tail to the head the arrow goes ${Math.abs(dx)} square${Math.abs(dx) === 1 ? '' : 's'} ${dx > 0 ? 'right' : 'left'}, so the top entry is $${dx}$${dx < 0 ? ': left is negative' : ''}.`,
    },
    {
      text: `It goes ${Math.abs(dy)} square${Math.abs(dy) === 1 ? '' : 's'} ${dy > 0 ? 'up' : 'down'}, so the bottom entry is $${dy}$${dy < 0 ? ': down is negative' : ''}.`,
    },
  ];
}

/** Read a column vector off an arrow drawn on squared paper. */
const readArrow: Generator<ArrowParams> = {
  id: 'vadd-read-arrow',
  choices: ({ dx, dy }) => columnOptions([dx, dy], [[dy, dx], [-dx, dy], [dx, -dy], [-dx, -dy]]),
  sample: (rng, difficulty) => sampleArrow(rng, difficulty, ['a', 'b', 'p', 'q', 'u', 'v']),
  render: (params): Slide => {
    const { dx, dy, name } = params;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Write $${bold(name)}$ as a column vector.` },
        { kind: 'diagram', svg: arrowFigure(params) },
      ],
      template: COLUMN_TEMPLATE,
      bank: bankOf([`${dx}`, `${dy}`], [`${-dx}`, `${-dy}`, `${dy}`, `${dx}`]),
      answer: [`${dx}`, `${dy}`],
    };
  },
  solution: ({ dx, dy, name }) => [
    { text: 'Count squares from the tail of the arrow to its head: across first, then up.' },
    ...countingSteps(dx, dy),
    { tex: `${bold(name)} = ${columnTex(dx, dy)}` },
    { text: 'Swapping the two entries is the usual slip: across always goes on top.' },
  ],
};

interface ArrowSliderParams extends ArrowParams {
  part: 'top' | 'bottom';
}

/** Slide to one entry of an arrow drawn on squared paper. */
const arrowSlider: Generator<ArrowSliderParams> = {
  id: 'vadd-arrow-slider',
  sample: (rng, difficulty) => ({
    // Never v: the readout marks the value with {v}, which \mathbf{v} contains.
    ...sampleArrow(rng, difficulty, ['a', 'b', 'p', 'u', 'w']),
    part: rng.pick(['top', 'bottom'] as const),
  }),
  render: (params): Slide => {
    const { x0, y0, dx, dy, name, part } = params;
    const top = part === 'top';
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: top
            ? `Slide to the top entry of $${bold(name)}$: how far across it goes. The line starts at the tail.`
            : `Slide to the bottom entry of $${bold(name)}$: how far up it goes, negative for down. The line starts level with the tail.`,
        },
      ],
      min: -8,
      max: 8,
      step: 1,
      answer: top ? dx : dy,
      readout: top ? `\\text{top entry of } ${bold(name)} = {v}` : `\\text{bottom entry of } ${bold(name)} = {v}`,
      figure: {
        svg: arrowFigure(params),
        xMin: 0,
        xMax: top ? ARROW_COLS : ARROW_ROWS,
        axis: top ? 'x' : 'y',
        origin: top ? x0 : y0,
      },
    };
  },
  solution: ({ dx, dy, name, part }) => [
    ...countingSteps(dx, dy),
    { tex: `${bold(name)} = ${columnTex(dx, dy)}` },
    {
      text:
        part === 'top'
          ? `The top entry is $${dx}$: the line lands on the head when it has moved ${Math.abs(dx)} to the ${dx > 0 ? 'right' : 'left'}.`
          : `The bottom entry is $${dy}$: the line lands level with the head when it has moved ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}.`,
    },
  ],
};

interface EqualArrowsParams {
  dx: number;
  dy: number;
  ask: 'equal' | 'negative';
  /** The variant drawn in each candidate cell, p to t. */
  cells: Variant[];
}

type Variant = 'same' | 'negative' | 'swapped' | 'flipTop' | 'flipBottom';

const VARIANTS: Variant[] = ['same', 'negative', 'swapped', 'flipTop', 'flipBottom'];
const CANDIDATES = ['p', 'q', 'r', 's', 't'];

function variantOf(dx: number, dy: number, variant: Variant): [number, number] {
  switch (variant) {
    case 'same':
      return [dx, dy];
    case 'negative':
      return [-dx, -dy];
    case 'swapped':
      return [dy, dx];
    case 'flipTop':
      return [-dx, dy];
    case 'flipBottom':
      return [dx, -dy];
  }
}

/**
 * Which arrow is equal to a, or which is -a, among five drawn around it.
 *
 * The five are the vector itself, its negative, its entries swapped and each
 * entry's sign changed alone, each placed in a cell of its own, so every
 * wrong one is a slip someone makes counting squares.
 */
const equalArrows: Generator<EqualArrowsParams> = {
  id: 'vadd-equal-arrows',
  sample: (rng, difficulty) => {
    const sizes: [number, number][] = [
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 3],
      [3, 1],
      [3, 2],
    ];
    const [sx, sy] = rng.pick(sizes);
    return {
      dx: sx * rng.sign(),
      dy: sy * rng.sign(),
      ask: difficulty > 1 ? rng.pick(['equal', 'negative'] as const) : rng.pick(['equal', 'equal', 'negative'] as const),
      cells: rng.shuffle(VARIANTS),
    };
  },
  render: ({ dx, dy, ask, cells }): Slide => {
    const CELL = 5;
    const place = (cell: number, vx: number, vy: number, name: string, style: GridArrow['style']): GridArrow => {
      const cx = (cell % 3) * CELL;
      const cy = (cell < 3 ? 1 : 0) * CELL;
      const x0 = cx + Math.floor((CELL - vx) / 2);
      const y0 = cy + Math.floor((CELL - vy) / 2);
      return { x0, y0, x1: x0 + vx, y1: y0 + vy, name, style };
    };
    const arrows = [place(0, dx, dy, 'a', 'main')];
    cells.forEach((variant, i) => {
      const [vx, vy] = variantOf(dx, dy, variant);
      arrows.push(place(i + 1, vx, vy, CANDIDATES[i], 'second'));
    });
    const want: Variant = ask === 'equal' ? 'same' : 'negative';
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: ask === 'equal' ? `Which arrow is equal to $${bold('a')}$?` : `Which arrow is $-${bold('a')}$?`,
        },
        {
          kind: 'diagram',
          svg: gridSvg({ cols: 15, rows: 10, arrows, label: 'Six arrows on squared paper, labelled a, p, q, r, s and t' }),
        },
      ],
      options: CANDIDATES.map((letter, i) => ({ id: `opt${i}`, label: bold(letter), tex: true })),
      correctId: `opt${cells.indexOf(want)}`,
    };
  },
  solution: ({ dx, dy, ask, cells }) => {
    const want: Variant = ask === 'equal' ? 'same' : 'negative';
    const letter = CANDIDATES[cells.indexOf(want)];
    const swapped = CANDIDATES[cells.indexOf('swapped')];
    return [
      { text: `Count $${bold('a')}$ first.` },
      { tex: `${bold('a')} = ${columnTex(dx, dy)}` },
      ask === 'equal'
        ? {
            text: 'Equal vectors have the same entries: the same length and the same direction. Where the arrow is drawn does not matter.',
          }
        : { text: 'The negative has the same length and points the opposite way, so both entries change sign.' },
      { tex: `${ask === 'equal' ? bold('a') : `-${bold('a')}`} = ${columnTex(...variantOf(dx, dy, want))}` },
      { text: `That is arrow $${bold(letter)}$.` },
      {
        text: `Arrow $${bold(swapped)}$ is $${columnTex(dy, dx)}$: the entries swapped, which points somewhere else.`,
      },
    ];
  },
};

interface ReverseParams {
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  names: [string, string];
}

const POINT_PAIRS: [string, string][] = [
  ['P', 'Q'],
  ['A', 'B'],
  ['M', 'N'],
  ['S', 'T'],
  ['C', 'D'],
];

/** From the arrow PQ on squared paper, the vector QP. */
const reverse: Generator<ReverseParams> = {
  id: 'vadd-reverse',
  choices: ({ dx, dy }) => columnOptions([-dx, -dy], [[dx, dy], [-dy, -dx], [-dx, dy], [dx, -dy]]),
  sample: (rng, difficulty) => {
    const { x0, y0, dx, dy } = sampleArrow(rng, difficulty, ['a']);
    return { x0, y0, dx, dy, names: rng.pick(POINT_PAIRS) };
  },
  render: ({ x0, y0, dx, dy, names: [P, Q] }): Slide => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: `The arrow is $${arrowTex(P, Q)}$. Write $${arrowTex(Q, P)}$ as a column vector.` },
      {
        kind: 'diagram',
        svg: gridSvg({
          cols: ARROW_COLS,
          rows: ARROW_ROWS,
          arrows: [{ x0, y0, x1: x0 + dx, y1: y0 + dy }],
          dots: [
            { x: x0, y: y0, name: P, away: [x0 + dx, y0 + dy] },
            { x: x0 + dx, y: y0 + dy, name: Q, away: [x0, y0] },
          ],
          label: `An arrow from ${P} to ${Q} on squared paper`,
        }),
      },
    ],
    template: COLUMN_TEMPLATE,
    bank: bankOf([`${-dx}`, `${-dy}`], [`${dx}`, `${dy}`, `${-dy}`, `${-dx}`]),
    answer: [`${-dx}`, `${-dy}`],
  }),
  solution: ({ dx, dy, names: [P, Q] }) => [
    { text: `Read $${arrowTex(P, Q)}$ first, from $${P}$ to $${Q}$.` },
    ...countingSteps(dx, dy),
    { tex: `${arrowTex(P, Q)} = ${columnTex(dx, dy)}` },
    {
      text: `$${arrowTex(Q, P)}$ is the same journey backwards: the same length, the opposite direction. Both entries change sign.`,
    },
    { tex: `${arrowTex(Q, P)} = -${arrowTex(P, Q)} = ${columnTex(-dx, -dy)}` },
  ],
};

/* ---------- Lesson 2: the triangle law ---------- */

interface TriangleParams {
  x0: number;
  y0: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

const TRI_COLS = 12;
const TRI_ROWS = 10;

function sampleTriangle(rng: Rng, difficulty: number): TriangleParams {
  const reach = difficulty > 1 ? 5 : 4;
  for (;;) {
    const ax = rng.int(-reach, reach);
    const ay = rng.int(-reach, reach);
    const bx = rng.int(-reach, reach);
    const by = rng.int(-reach, reach);
    if ((ax === 0 && ay === 0) || (bx === 0 && by === 0)) continue;
    // Not parallel, or there is no triangle; and a resultant with both entries
    // non-zero, so neither slider answer is the handle's resting place.
    if (ax * by - ay * bx === 0) continue;
    if (ax + bx === 0 || ay + by === 0) continue;
    const start = fit(rng, [[0, 0], [ax, ay], [ax + bx, ay + by]], TRI_COLS, TRI_ROWS);
    if (!start) continue;
    return { x0: start[0], y0: start[1], ax, ay, bx, by };
  }
}

function triangleFigure({ x0, y0, ax, ay, bx, by }: TriangleParams): string {
  const centre: [number, number] = [x0 + (2 * ax + bx) / 3, y0 + (2 * ay + by) / 3];
  return gridSvg({
    cols: TRI_COLS,
    rows: TRI_ROWS,
    arrows: [
      { x0, y0, x1: x0 + ax, y1: y0 + ay, name: 'a', style: 'main', away: centre },
      { x0: x0 + ax, y0: y0 + ay, x1: x0 + ax + bx, y1: y0 + ay + by, name: 'b', style: 'second', away: centre },
    ],
    label: 'Vector a, then vector b drawn from the head of a, on squared paper',
  });
}

function triangleSteps({ ax, ay, bx, by }: TriangleParams): SolutionStep[] {
  return [
    { text: 'Read each arrow by counting squares, across then up.' },
    { tex: `${bold('a')} = ${columnTex(ax, ay)} \\qquad ${bold('b')} = ${columnTex(bx, by)}` },
    {
      text: '$\\mathbf{b}$ starts where $\\mathbf{a}$ ends, so $\\mathbf{a} + \\mathbf{b}$ is the single arrow from the tail of $\\mathbf{a}$ to the head of $\\mathbf{b}$. Add the entries.',
    },
    { tex: `${columnTex(ax, ay)} + ${columnTex(bx, by)} = ${columnTex(ax + bx, ay + by)}` },
  ];
}

/** a + b read from a head-to-tail diagram. */
const headToTail: Generator<TriangleParams> = {
  id: 'vadd-head-to-tail',
  choices: ({ ax, ay, bx, by }) =>
    columnOptions([ax + bx, ay + by], [[ax - bx, ay - by], [ay + by, ax + bx], [bx - ax, by - ay]]),
  sample: sampleTriangle,
  render: (params): Slide => {
    const { ax, ay, bx, by } = params;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write $\\mathbf{a} + \\mathbf{b}$ as a column vector.' },
        { kind: 'diagram', svg: triangleFigure(params) },
      ],
      template: COLUMN_TEMPLATE,
      bank: bankOf([`${ax + bx}`, `${ay + by}`], [`${ax - bx}`, `${ay - by}`, `${bx - ax}`, `${by - ay}`]),
      answer: [`${ax + bx}`, `${ay + by}`],
    };
  },
  solution: (params) => [
    ...triangleSteps(params),
    {
      text: 'Counting straight from the tail of $\\mathbf{a}$ to the head of $\\mathbf{b}$ gives the same answer, which is the triangle law.',
    },
  ],
};

interface ResultantSliderParams extends TriangleParams {
  part: 'top' | 'bottom';
}

/** Slide to one entry of a + b on the head-to-tail picture. */
const resultantSlider: Generator<ResultantSliderParams> = {
  id: 'vadd-resultant-slider',
  sample: (rng, difficulty) => ({ ...sampleTriangle(rng, difficulty), part: rng.pick(['top', 'bottom'] as const) }),
  render: (params): Slide => {
    const { x0, y0, ax, ay, bx, by, part } = params;
    const top = part === 'top';
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: top
            ? 'Slide to the top entry of $\\mathbf{a} + \\mathbf{b}$. The line starts at the tail of $\\mathbf{a}$.'
            : 'Slide to the bottom entry of $\\mathbf{a} + \\mathbf{b}$. The line starts level with the tail of $\\mathbf{a}$.',
        },
      ],
      min: -10,
      max: 10,
      step: 1,
      answer: top ? ax + bx : ay + by,
      readout: top
        ? '\\text{top entry of } \\mathbf{a} + \\mathbf{b} = {v}'
        : '\\text{bottom entry of } \\mathbf{a} + \\mathbf{b} = {v}',
      figure: {
        svg: triangleFigure(params),
        xMin: 0,
        xMax: top ? TRI_COLS : TRI_ROWS,
        axis: top ? 'x' : 'y',
        origin: top ? x0 : y0,
      },
    };
  },
  solution: (params) => [
    ...triangleSteps(params),
    {
      text:
        params.part === 'top'
          ? `The top entry is $${params.ax + params.bx}$: the line reaches the head of $\\mathbf{b}$ there.`
          : `The bottom entry is $${params.ay + params.by}$: the line is level with the head of $\\mathbf{b}$ there.`,
    },
  ],
};

/* The parallelogram: V0 to V1 is u, V0 to V3 is v, V2 = V0 + u + v. */

interface ParallelogramParams {
  set: number;
  ux: number;
  uy: number;
  vx: number;
  vy: number;
  from: number;
  to: number;
}

const PARALLELOGRAMS: { verts: [string, string, string, string]; vecs: [string, string] }[] = [
  { verts: ['O', 'A', 'C', 'B'], vecs: ['a', 'b'] },
  { verts: ['P', 'Q', 'R', 'S'], vecs: ['a', 'b'] },
  { verts: ['O', 'A', 'C', 'B'], vecs: ['p', 'q'] },
  { verts: ['A', 'B', 'C', 'D'], vecs: ['p', 'q'] },
  { verts: ['K', 'L', 'M', 'N'], vecs: ['u', 'v'] },
  { verts: ['P', 'Q', 'R', 'S'], vecs: ['u', 'v'] },
];

/** Each vertex as (how many u, how many v) from V0. */
const CORNER: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

function segmentCoefs(from: number, to: number): [number, number] {
  return [CORNER[to][0] - CORNER[from][0], CORNER[to][1] - CORNER[from][1]];
}

/** A combination of the two named vectors, positive term first. */
function comboTex(cu: number, cv: number, u: string, v: string): string {
  if (cu < 0 && cv > 0) return sumTex([[cv, bold(v)], [cu, bold(u)]]);
  return sumTex([[cu, bold(u)], [cv, bold(v)]]);
}

const SUM_SEGMENTS: [number, number][] = [
  [0, 2],
  [2, 0],
  [1, 2],
  [2, 1],
  [3, 2],
  [2, 3],
  [1, 0],
  [3, 0],
];
const DIFF_SEGMENTS: [number, number][] = [
  [1, 3],
  [3, 1],
];

function sampleParallelogram(rng: Rng, segments: [number, number][]): ParallelogramParams {
  for (;;) {
    const ux = rng.int(3, 6);
    const uy = rng.int(-2, 2);
    const vx = rng.int(-2, 3);
    const vy = rng.int(3, 5);
    if (ux * vy - uy * vx === 0) continue;
    const [from, to] = rng.pick(segments);
    return { set: rng.int(0, PARALLELOGRAMS.length - 1), ux, uy, vx, vy, from, to };
  }
}

function parallelogramFigure({ set, ux, uy, vx, vy }: ParallelogramParams): string {
  const { verts, vecs } = PARALLELOGRAMS[set];
  const xs = [0, ux, ux + vx, vx];
  const ys = [0, uy, uy + vy, vy];
  const ox = 1 - Math.min(...xs);
  const oy = 1 - Math.min(...ys);
  const cols = Math.max(...xs) + ox + 1;
  const rows = Math.max(...ys) + oy + 1;
  const pt = (i: number): [number, number] => [xs[i] + ox, ys[i] + oy];
  const centre: [number, number] = [ox + (ux + vx) / 2, oy + (uy + vy) / 2];
  const side = (i: number, j: number, extra: Partial<GridArrow> = {}): GridArrow => ({
    x0: pt(i)[0],
    y0: pt(i)[1],
    x1: pt(j)[0],
    y1: pt(j)[1],
    away: centre,
    ...extra,
  });
  return gridSvg({
    cols,
    rows,
    grid: false,
    arrows: [
      side(1, 2, { plain: true, style: 'second' }),
      side(3, 2, { plain: true, style: 'second' }),
      side(0, 1, { name: vecs[0], style: 'main' }),
      side(0, 3, { name: vecs[1], style: 'main' }),
    ],
    dots: [0, 1, 2, 3].map((i) => ({ x: pt(i)[0], y: pt(i)[1], name: verts[i], away: centre })),
    label: `Parallelogram ${verts.join('')} with ${vecs[0]} and ${vecs[1]} along two sides from ${verts[0]}`,
  });
}

function parallelogramChoices({ set, from, to }: ParallelogramParams): ChoiceOption[] {
  const { vecs } = PARALLELOGRAMS[set];
  const [cu, cv] = segmentCoefs(from, to);
  const key = (c: [number, number]) => `${c[0]},${c[1]}`;
  const seen = new Set([key([cu, cv])]);
  const picked: [number, number][] = [];
  const candidates: [number, number][] = [
    [-cu, -cv],
    [cv, cu],
    [-cv, -cu],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (const c of candidates) {
    if (picked.length === 3) break;
    if ((c[0] === 0 && c[1] === 0) || seen.has(key(c))) continue;
    seen.add(key(c));
    picked.push(c);
  }
  return options(
    { tex: comboTex(cu, cv, vecs[0], vecs[1]) },
    ...picked.map((c) => ({ tex: comboTex(c[0], c[1], vecs[0], vecs[1]) })),
  );
}

function parallelogramRender(params: ParallelogramParams): Slide {
  const { verts, vecs } = PARALLELOGRAMS[params.set];
  const offered = [...parallelogramChoices(params)].sort((x, y) => x.tex.localeCompare(y.tex));
  return {
    kind: 'choice',
    prompt: [
      {
        kind: 'prose',
        text: `$${verts.join('')}$ is a parallelogram with $${arrowTex(verts[0], verts[1])} = ${bold(vecs[0])}$ and $${arrowTex(verts[0], verts[3])} = ${bold(vecs[1])}$. Find $${arrowTex(verts[params.from], verts[params.to])}$.`,
      },
      { kind: 'diagram', svg: parallelogramFigure(params) },
    ],
    // Listed in a fixed order by label, never shuffled, and never with the
    // answer first: the order depends only on which combinations are offered.
    options: offered.map((option, i) => ({ id: `opt${i}`, label: option.tex, tex: true })),
    correctId: `opt${offered.findIndex((option) => option.correct)}`,
  };
}

function parallelogramSolution(params: ParallelogramParams): SolutionStep[] {
  const { verts, vecs } = PARALLELOGRAMS[params.set];
  const [u, v] = vecs;
  const [cu, cv] = segmentCoefs(params.from, params.to);
  const F = verts[params.from];
  const T = verts[params.to];
  const route = (() => {
    // Walk from `from` to `to` along the sides: u-steps first, then v-steps.
    const [fu, fv] = CORNER[params.from];
    const mid = CORNER.findIndex(([a, b]) => a === fu + cu && b === fv);
    return mid === params.from || mid === params.to ? undefined : verts[mid];
  })();
  const steps: SolutionStep[] = [
    {
      text: `Opposite sides of a parallelogram are equal vectors: $${arrowTex(verts[3], verts[2])} = ${bold(u)}$ and $${arrowTex(verts[1], verts[2])} = ${bold(v)}$. Going against an arrow gives its negative.`,
    },
  ];
  if (route) {
    steps.push(
      { text: `Go from $${F}$ to $${T}$ along the sides, through $${route}$.` },
      { tex: `${arrowTex(F, T)} = ${arrowTex(F, route)} + ${arrowTex(route, T)}` },
      { tex: `${arrowTex(F, T)} = ${coefTex(cu, bold(u))} + ${cv < 0 ? `\\left(${coefTex(cv, bold(v))}\\right)` : coefTex(cv, bold(v))}` },
    );
  } else {
    steps.push({ text: `$${F}$ to $${T}$ is along one side of the parallelogram.` });
  }
  steps.push({ tex: `${arrowTex(F, T)} = ${comboTex(cu, cv, u, v)}` });
  return steps;
}

/** A side or the diagonal through V0 of a parallelogram, in terms of u and v. */
const parallelogramSum: Generator<ParallelogramParams> = {
  id: 'vadd-parallelogram-sum',
  sample: (rng) => sampleParallelogram(rng, SUM_SEGMENTS),
  render: parallelogramRender,
  solution: parallelogramSolution,
};

/** The other diagonal of a parallelogram: v - u or u - v. */
const parallelogramDiff: Generator<ParallelogramParams> = {
  id: 'vadd-parallelogram-diff',
  sample: (rng) => sampleParallelogram(rng, DIFF_SEGMENTS),
  render: parallelogramRender,
  solution: (params) => {
    const { verts, vecs } = PARALLELOGRAMS[params.set];
    const [u, v] = vecs;
    const F = verts[params.from];
    const T = verts[params.to];
    const [cu, cv] = segmentCoefs(params.from, params.to);
    return [
      { text: `Go from $${F}$ back to $${verts[0]}$, then out to $${T}$. Going back along an arrow is its negative.` },
      { tex: `${arrowTex(F, T)} = ${arrowTex(F, verts[0])} + ${arrowTex(verts[0], T)}` },
      { tex: `${arrowTex(F, T)} = ${coefTex(cu, bold(u))} + ${cv < 0 ? `\\left(${coefTex(cv, bold(v))}\\right)` : coefTex(cv, bold(v))}` },
      { tex: `${arrowTex(F, T)} = ${comboTex(cu, cv, u, v)}` },
      {
        text: `Check the order: it is the vector you arrive along minus the one you left along, head end minus tail end. The other way round, $${comboTex(-cu, -cv, u, v)}$, points from $${T}$ to $${F}$.`,
      },
    ];
  },
};

interface LengthParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** |a + b| from two column vectors. */
const resultantLength: Generator<LengthParams> = {
  id: 'vadd-resultant-length',
  choices: ({ ax, ay, bx, by }) => {
    const n = (ax + bx) ** 2 + (ay + by) ** 2;
    const A = ax * ax + ay * ay;
    const B = bx * bx + by * by;
    const D = (ax - bx) ** 2 + (ay - by) ** 2;
    const sumTexOf = (p: number, q: number) => {
      const P = surdTex(p);
      const Q = surdTex(q);
      if (!P.includes('sqrt') && !Q.includes('sqrt')) return `${Number(P) + Number(Q)}`;
      return `${P} + ${Q}`;
    };
    const candidates: { tex: string; answer: string; value: number }[] = [
      { tex: sumTexOf(A, B), answer: `sqrt(${A}) + sqrt(${B})`, value: Math.sqrt(A) + Math.sqrt(B) },
      { tex: `${Math.abs(ax + bx) + Math.abs(ay + by)}`, answer: `${Math.abs(ax + bx) + Math.abs(ay + by)}`, value: Math.abs(ax + bx) + Math.abs(ay + by) },
      { tex: surdTex(D), answer: surdAnswer(D), value: Math.sqrt(D) },
    ];
    const values = [Math.sqrt(n)];
    const kept = candidates.filter((c) => {
      if (values.some((v) => Math.abs(v - c.value) < 1e-9)) return false;
      values.push(c.value);
      return true;
    });
    return options({ tex: surdTex(n), answer: surdAnswer(n) }, ...kept.map(({ tex, answer }) => ({ tex, answer })));
  },
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 6 : 4;
    for (;;) {
      const ax = rng.int(-reach, reach);
      const ay = rng.int(-reach, reach);
      const bx = rng.int(-reach, reach);
      const by = rng.int(-reach, reach);
      if ((ax === 0 && ay === 0) || (bx === 0 && by === 0)) continue;
      if (ax * by - ay * bx === 0) continue;
      if (ax + bx === 0 || ay + by === 0) continue;
      return { ax, ay, bx, by };
    }
  },
  render: ({ ax, ay, bx, by }): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find the length of $\\mathbf{a} + \\mathbf{b}$. Leave a square root exact.' },
      { kind: 'display', tex: `${bold('a')} = ${columnTex(ax, ay)} \\qquad ${bold('b')} = ${columnTex(bx, by)}` },
    ],
    lead: '\\left| \\mathbf{a} + \\mathbf{b} \\right| =',
    keypad: SURD_KEYS,
    answer: surdAnswer((ax + bx) ** 2 + (ay + by) ** 2),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ ax, ay, bx, by }) => {
    const sx = ax + bx;
    const sy = ay + by;
    const n = sx * sx + sy * sy;
    return [
      { text: 'Add first, then find the length of the one vector that comes out.' },
      { tex: `${bold('a')} + ${bold('b')} = ${columnTex(sx, sy)}` },
      { tex: `\\left| ${bold('a')} + ${bold('b')} \\right| = \\sqrt{${br(sx)}^{2} + ${br(sy)}^{2}}` },
      { tex: `= \\sqrt{${sx * sx} + ${sy * sy}}` },
      { tex: surdTex(n) === `\\sqrt{${n}}` ? `= \\sqrt{${n}}` : `= \\sqrt{${n}} = ${surdTex(n)}` },
      {
        text: 'Adding the two lengths instead gives a longer answer: two sides of a triangle are always longer than the third.',
      },
    ];
  },
};

/* ---------- Lesson 3: subtracting vectors ---------- */

interface PairParams {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

function samplePair(rng: Rng, difficulty: number): PairParams {
  const reach = difficulty > 1 ? 9 : 6;
  for (;;) {
    const ax = nonZeroInt(rng, -reach, reach);
    const ay = nonZeroInt(rng, -reach, reach);
    const bx = nonZeroInt(rng, -reach, reach);
    const by = nonZeroInt(rng, -reach, reach);
    // At least one negative entry in b, which is where the sign slips live.
    if (bx > 0 && by > 0) continue;
    if (ax === bx || ay === by) continue;
    return { ax, ay, bx, by };
  }
}

/** a - b as a + (-b), worked as a tree. */
const minusTree: Generator<PairParams> = {
  id: 'vadd-minus-tree',
  sample: samplePair,
  render: ({ ax, ay, bx, by }): Slide => {
    const answer = [`${-bx}`, `${-by}`, `${ax - bx}`, `${ay - by}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Fill the tree: the top and bottom entries of $-\\mathbf{b}$, then the top and bottom entries of $\\mathbf{a} - \\mathbf{b}$.',
        },
        { kind: 'display', tex: `${bold('a')} = ${columnTex(ax, ay)} \\qquad ${bold('b')} = ${columnTex(bx, by)}` },
      ],
      expression: '\\mathbf{a} - \\mathbf{b} = \\mathbf{a} + \\left(-\\mathbf{b}\\right)',
      nodes: [
        { id: 'nbx', from: [] },
        { id: 'nby', from: [] },
        { id: 'rx', from: ['nbx'] },
        { id: 'ry', from: ['nby'] },
      ],
      bank: treeBank(answer, [`${bx}`, `${by}`, `${ax + bx}`, `${ay + by}`]),
      answer,
    };
  },
  solution: ({ ax, ay, bx, by }) => [
    { text: 'Subtracting $\\mathbf{b}$ is adding its negative. Change the sign of both entries of $\\mathbf{b}$ first.' },
    { tex: `-${bold('b')} = ${columnTex(-bx, -by)}` },
    { text: 'Then add, entry by entry.' },
    { tex: `${ax} + ${br(-bx)} = ${ax - bx}` },
    { tex: `${ay} + ${br(-by)} = ${ay - by}` },
    { tex: `${bold('a')} - ${bold('b')} = ${columnTex(ax - bx, ay - by)}` },
  ],
};

interface SlipParams extends PairParams {
  order: 'a-b' | 'b-a';
  slip: 'none' | 'top' | 'bottom' | 'both';
  who: string;
}

const SLIP_LABELS: [SlipParams['slip'], string][] = [
  ['none', '\\text{All correct}'],
  ['top', '\\text{Top entry wrong}'],
  ['bottom', '\\text{Bottom entry wrong}'],
  ['both', '\\text{Both entries wrong}'],
];

function slipWork({ ax, ay, bx, by, order, slip }: SlipParams) {
  const right: [number, number] = order === 'a-b' ? [ax - bx, ay - by] : [bx - ax, by - ay];
  // The slip for a - b is adding instead; for b - a it is subtracting the
  // wrong way round.
  const wrong: [number, number] = order === 'a-b' ? [ax + bx, ay + by] : [ax - bx, ay - by];
  const shown: [number, number] = [
    slip === 'top' || slip === 'both' ? wrong[0] : right[0],
    slip === 'bottom' || slip === 'both' ? wrong[1] : right[1],
  ];
  return { right, shown };
}

/** Is someone's a - b right? Which entry went wrong? */
const spotSlip: Generator<SlipParams> = {
  id: 'vadd-spot-slip',
  sample: (rng, difficulty) => {
    const pair = samplePair(rng, difficulty);
    return {
      ...pair,
      order: rng.pick(['a-b', 'b-a'] as const),
      slip: rng.pick(['none', 'top', 'bottom', 'both'] as const),
      who: rng.pick(['Ali', 'Sam', 'Priya', 'Jon', 'Mia']),
    };
  },
  render: (params): Slide => {
    const { ax, ay, bx, by, order, slip, who } = params;
    const { shown } = slipWork(params);
    const lhs = order === 'a-b' ? `${bold('a')} - ${bold('b')}` : `${bold('b')} - ${bold('a')}`;
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `${who} works out $${lhs}$. Is it right?` },
        { kind: 'display', tex: `${bold('a')} = ${columnTex(ax, ay)} \\qquad ${bold('b')} = ${columnTex(bx, by)}` },
        { kind: 'display', tex: `${lhs} = ${columnTex(...shown)}` },
      ],
      options: SLIP_LABELS.map(([, label], i) => ({ id: `opt${i}`, label, tex: true })),
      correctId: `opt${SLIP_LABELS.findIndex(([id]) => id === slip)}`,
    };
  },
  solution: (params) => {
    const { ax, ay, bx, by, order, slip, who } = params;
    const { right, shown } = slipWork(params);
    const lhs = order === 'a-b' ? `${bold('a')} - ${bold('b')}` : `${bold('b')} - ${bold('a')}`;
    const [p, q, r, s] = order === 'a-b' ? [ax, bx, ay, by] : [bx, ax, by, ay];
    return [
      { text: 'Work it out entry by entry, bracketing each number being taken away.' },
      { tex: `${p} - ${br(q)} = ${right[0]}` },
      { tex: `${r} - ${br(s)} = ${right[1]}` },
      { tex: `${lhs} = ${columnTex(...right)}` },
      {
        text:
          slip === 'none'
            ? `${who}'s answer matches, so it is all correct.`
            : `${who} wrote $${columnTex(...shown)}$, so ${slip === 'both' ? 'both entries are' : `the ${slip} entry is`} wrong. ${order === 'a-b' ? 'The slip was adding those entries instead of taking them away.' : 'The slip was taking those entries away the wrong way round, as in $\\mathbf{a} - \\mathbf{b}$.'}`,
      },
    ];
  },
};

interface TipParams {
  x0: number;
  y0: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  reverse: boolean;
}

/** a and b drawn from O; the arrow from the head of a to the head of b is b - a. */
const tipToTip: Generator<TipParams> = {
  id: 'vadd-tip-to-tip',
  choices: ({ ax, ay, bx, by, reverse }) => {
    const [x, y] = reverse ? [ax - bx, ay - by] : [bx - ax, by - ay];
    return columnOptions([x, y], [[-x, -y], [ax + bx, ay + by], [y, x]]);
  },
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 5 : 4;
    for (;;) {
      const ax = rng.int(-reach, reach);
      const ay = rng.int(-reach, reach);
      const bx = rng.int(-reach, reach);
      const by = rng.int(-reach, reach);
      if ((ax === 0 && ay === 0) || (bx === 0 && by === 0)) continue;
      if (ax * by - ay * bx === 0) continue;
      if (ax === bx || ay === by) continue;
      const start = fit(rng, [[0, 0], [ax, ay], [bx, by]], 12, 10);
      if (!start) continue;
      return { x0: start[0], y0: start[1], ax, ay, bx, by, reverse: rng.chance(0.4) };
    }
  },
  render: ({ ax, ay, bx, by, reverse }): Slide => {
    // Cropped to the triangle: a sketch, not squared paper.
    const x0 = 1 - Math.min(0, ax, bx);
    const y0 = 1 - Math.min(0, ay, by);
    const cols = Math.max(0, ax, bx) - Math.min(0, ax, bx) + 2;
    const rows = Math.max(0, ay, by) - Math.min(0, ay, by) + 2;
    const A: [number, number] = [x0 + ax, y0 + ay];
    const B: [number, number] = [x0 + bx, y0 + by];
    const centre: [number, number] = [(x0 + A[0] + B[0]) / 3, (y0 + A[1] + B[1]) / 3];
    const [from, to] = reverse ? [B, A] : [A, B];
    const [x, y] = reverse ? [ax - bx, ay - by] : [bx - ax, by - ay];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$${arrowTex('O', 'A')} = ${bold('a')}$ and $${arrowTex('O', 'B')} = ${bold('b')}$. Write $${reverse ? arrowTex('B', 'A') : arrowTex('A', 'B')}$ as a column vector.`,
        },
        { kind: 'display', tex: `${bold('a')} = ${columnTex(ax, ay)} \\qquad ${bold('b')} = ${columnTex(bx, by)}` },
        {
          kind: 'diagram',
          svg: gridSvg({
            cols,
            rows,
            grid: false,
            arrows: [
              { x0, y0, x1: A[0], y1: A[1], name: 'a', style: 'main', away: centre },
              { x0, y0, x1: B[0], y1: B[1], name: 'b', style: 'second', away: centre },
              { x0: from[0], y0: from[1], x1: to[0], y1: to[1], style: 'result' },
            ],
            dots: [
              { x: x0, y: y0, name: 'O', away: centre },
              { x: A[0], y: A[1], name: 'A', away: centre },
              { x: B[0], y: B[1], name: 'B', away: centre },
            ],
            label: `Vectors a and b drawn from O to A and B, with a dashed arrow from ${reverse ? 'B to A' : 'A to B'}`,
          }),
        },
      ],
      template: COLUMN_TEMPLATE,
      bank: bankOf([`${x}`, `${y}`], [`${-x}`, `${-y}`, `${ax + bx}`, `${ay + by}`]),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: ({ ax, ay, bx, by, reverse }) => {
    const [F, T] = reverse ? ['B', 'A'] : ['A', 'B'];
    const [f, t] = reverse ? ['b', 'a'] : ['a', 'b'];
    const [fx, fy, tx, ty] = reverse ? [bx, by, ax, ay] : [ax, ay, bx, by];
    return [
      { text: `Go from $${F}$ back to $O$, then out to $${T}$.` },
      { tex: `${arrowTex(F, T)} = -${bold(f)} + ${bold(t)} = ${bold(t)} - ${bold(f)}` },
      { text: 'Head end minus tail end, entry by entry.' },
      { tex: `${tx} - ${br(fx)} = ${tx - fx}` },
      { tex: `${ty} - ${br(fy)} = ${ty - fy}` },
      { tex: `${arrowTex(F, T)} = ${columnTex(tx - fx, ty - fy)}` },
    ];
  },
};

/* ---------- Lesson 4: combining several vectors ---------- */

interface CombineParams {
  p: number;
  q: number;
  r: number;
  a: [number, number];
  b: [number, number];
  c: [number, number];
  part: 'top' | 'bottom';
}

function combineValue({ p, q, r, a, b, c }: CombineParams): [number, number] {
  return [p * a[0] + q * b[0] + r * c[0], p * a[1] + q * b[1] + r * c[1]];
}

function combineTex({ p, q, r }: CombineParams): string {
  return sumTex([
    [p, bold('a')],
    [q, bold('b')],
    [r, bold('c')],
  ]);
}

function sampleCombine(rng: Rng, difficulty: number): CombineParams {
  const entry = () => nonZeroInt(rng, -5, 5);
  return {
    p: rng.pick(difficulty > 1 ? [-3, -2, 2, 3, 4] : [2, 3]),
    q: rng.pick(difficulty > 1 ? [-4, -3, -2, 2, 3] : [-3, -2, 2, 3]),
    r: rng.pick(difficulty > 1 ? [-2, -1, 1, 2] : [-1, 1]),
    a: [entry(), entry()],
    b: [entry(), entry()],
    c: [entry(), entry()],
    part: rng.pick(['top', 'bottom'] as const),
  };
}

const vectorsLine = ({ a, b, c }: CombineParams) =>
  `${bold('a')} = ${columnTex(...a)} \\qquad ${bold('b')} = ${columnTex(...b)} \\qquad ${bold('c')} = ${columnTex(...c)}`;

function combineSteps(params: CombineParams): SolutionStep[] {
  const { p, q, r, a, b, c } = params;
  const [x, y] = combineValue(params);
  return [
    { text: 'Scale each vector first, multiplying both of its entries.' },
    { tex: `${coefTex(p, bold('a'))} = ${columnTex(p * a[0], p * a[1])}` },
    { tex: `${coefTex(q, bold('b'))} = ${columnTex(q * b[0], q * b[1])}` },
    { tex: `${coefTex(r, bold('c'))} = ${columnTex(r * c[0], r * c[1])}` },
    { text: 'Then add the three, top entries together and bottom entries together.' },
    { tex: `${p * a[0]} + ${br(q * b[0])} + ${br(r * c[0])} = ${x}` },
    { tex: `${p * a[1]} + ${br(q * b[1])} + ${br(r * c[1])} = ${y}` },
  ];
}

/** 2a - 3b + c and the like, from three column vectors. */
const combine: Generator<CombineParams> = {
  id: 'vadd-combine',
  choices: (params) => {
    const { p, q, r, a, b, c } = params;
    const [x, y] = combineValue(params);
    return columnOptions(
      [x, y],
      [
        [x - 2 * q * b[0], y - 2 * q * b[1]],
        // c left unscaled
        [p * a[0] + q * b[0] + c[0], p * a[1] + q * b[1] + c[1]],
        [Math.sign(p) * a[0] + Math.sign(q) * b[0] + Math.sign(r) * c[0], Math.sign(p) * a[1] + Math.sign(q) * b[1] + Math.sign(r) * c[1]],
        [y, x],
      ],
    );
  },
  sample: sampleCombine,
  render: (params): Slide => {
    const { p, q, r, a, b, c } = params;
    const [x, y] = combineValue(params);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Work out $${combineTex(params)}$ as a column vector.` },
        { kind: 'display', tex: vectorsLine(params) },
      ],
      template: COLUMN_TEMPLATE,
      bank: bankOf(
        [`${x}`, `${y}`],
        [`${x - 2 * q * b[0]}`, `${y - 2 * q * b[1]}`, `${a[0] + b[0] + c[0]}`, `${p * a[1] + q * b[1] - r * c[1]}`],
      ),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: (params) => [
    ...combineSteps(params),
    { tex: `${combineTex(params)} = ${columnTex(...combineValue(params))}` },
  ],
};

/** One entry of a three-vector combination, typed. */
const combineEntry: Generator<CombineParams> = {
  id: 'vadd-combine-entry',
  sample: sampleCombine,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Find the ${params.part} entry of $${combineTex(params)}$.` },
      { kind: 'display', tex: vectorsLine(params) },
    ],
    lead: `\\text{${params.part} entry} =`,
    keypad: [],
    answer: `${combineValue(params)[params.part === 'top' ? 0 : 1]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { p, q, r, a, b, c, part } = params;
    const i = part === 'top' ? 0 : 1;
    const value = combineValue(params)[i];
    return [
      { text: `Only the ${part} entries are needed. Multiply each by its number, then add.` },
      { tex: `${p} \\times ${br(a[i])} = ${p * a[i]}` },
      { tex: `${q} \\times ${br(b[i])} = ${q * b[i]}` },
      { tex: `${r} \\times ${br(c[i])} = ${r * c[i]}` },
      { tex: `${p * a[i]} + ${br(q * b[i])} + ${br(r * c[i])} = ${value}` },
      { text: 'Keep each sign with its number through the multiplying, rather than saving it for the end.' },
    ];
  },
};

interface SolveParams {
  form: 'a+x=b' | 'x+a=b' | 'x-a=b';
  a: [number, number];
  b: [number, number];
}

function solveValue({ form, a, b }: SolveParams): [number, number] {
  return form === 'x-a=b' ? [b[0] + a[0], b[1] + a[1]] : [b[0] - a[0], b[1] - a[1]];
}

const SOLVE_TEX: Record<SolveParams['form'], string> = {
  'a+x=b': '\\mathbf{a} + \\mathbf{x} = \\mathbf{b}',
  'x+a=b': '\\mathbf{x} + \\mathbf{a} = \\mathbf{b}',
  'x-a=b': '\\mathbf{x} - \\mathbf{a} = \\mathbf{b}',
};

/** Solve a + x = b, or x - a = b, for the vector x. */
const solveX: Generator<SolveParams> = {
  id: 'vadd-solve-x',
  choices: (params) => {
    const { a, b } = params;
    const [x, y] = solveValue(params);
    const other: [number, number] = params.form === 'x-a=b' ? [b[0] - a[0], b[1] - a[1]] : [b[0] + a[0], b[1] + a[1]];
    return columnOptions([x, y], [other, [-x, -y], [y, x]]);
  },
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 9 : 6;
    for (;;) {
      const a: [number, number] = [nonZeroInt(rng, -reach, reach), nonZeroInt(rng, -reach, reach)];
      const b: [number, number] = [nonZeroInt(rng, -reach, reach), nonZeroInt(rng, -reach, reach)];
      const form = rng.pick(['a+x=b', 'x+a=b', 'x-a=b'] as const);
      const [x, y] = solveValue({ form, a, b });
      if (x === 0 || y === 0) continue;
      return { form, a, b };
    }
  },
  render: (params): Slide => {
    const { a, b } = params;
    const [x, y] = solveValue(params);
    const other = params.form === 'x-a=b' ? [b[0] - a[0], b[1] - a[1]] : [b[0] + a[0], b[1] + a[1]];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Find the vector $\\mathbf{x}$.' },
        { kind: 'display', tex: SOLVE_TEX[params.form] },
        { kind: 'display', tex: `${bold('a')} = ${columnTex(...a)} \\qquad ${bold('b')} = ${columnTex(...b)}` },
      ],
      template: COLUMN_TEMPLATE,
      bank: bankOf([`${x}`, `${y}`], [`${other[0]}`, `${other[1]}`, `${-x}`, `${-y}`]),
      answer: [`${x}`, `${y}`],
    };
  },
  solution: (params) => {
    const { form, a, b } = params;
    const [x, y] = solveValue(params);
    const plus = form === 'x-a=b';
    return [
      {
        text: plus
          ? 'Undo the subtraction: add $\\mathbf{a}$ to both sides.'
          : 'Undo the addition: take $\\mathbf{a}$ from both sides.',
      },
      { tex: `${bold('x')} = ${bold('b')} ${plus ? '+' : '-'} ${bold('a')}` },
      { tex: `${b[0]} ${plus ? '+' : '-'} ${br(a[0])} = ${x}` },
      { tex: `${b[1]} ${plus ? '+' : '-'} ${br(a[1])} = ${y}` },
      { tex: `${bold('x')} = ${columnTex(x, y)}` },
      { text: `Check: put it back in. ${plus ? 'Taking away' : 'Adding'} $\\mathbf{a}$ should give $\\mathbf{b}$.` },
    ];
  },
};

interface ScaledParams {
  k: number;
  minus: boolean;
  x: [number, number];
  a: [number, number];
}

function scaledB({ k, minus, x, a }: ScaledParams): [number, number] {
  const s = minus ? -1 : 1;
  return [k * x[0] + s * a[0], k * x[1] + s * a[1]];
}

/** Solve 2x + a = b for x, as a tree: 2x first, then x. */
const scaledTree: Generator<ScaledParams> = {
  id: 'vadd-scaled-x-tree',
  sample: (rng, difficulty) => ({
    k: rng.pick(difficulty > 1 ? [2, 3, 4] : [2, 3]),
    minus: rng.chance(0.4),
    x: [nonZeroInt(rng, -5, 5), nonZeroInt(rng, -5, 5)],
    a: [nonZeroInt(rng, -6, 6), nonZeroInt(rng, -6, 6)],
  }),
  render: (params): Slide => {
    const { k, minus, x, a } = params;
    const b = scaledB(params);
    const answer = [`${k * x[0]}`, `${k * x[1]}`, `${x[0]}`, `${x[1]}`];
    const s = minus ? -1 : 1;
    // The sign slip: moving a across without changing its sign.
    const slip = [b[0] + s * a[0], b[1] + s * a[1]];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Solve for $\\mathbf{x}$. Fill the tree: the top and bottom entries of $${k}\\mathbf{x}$, then of $\\mathbf{x}$.`,
        },
        { kind: 'display', tex: `${bold('a')} = ${columnTex(...a)} \\qquad ${bold('b')} = ${columnTex(...b)}` },
      ],
      expression: `${k}\\mathbf{x} ${minus ? '-' : '+'} \\mathbf{a} = \\mathbf{b}`,
      nodes: [
        { id: 'kx', from: [] },
        { id: 'ky', from: [] },
        { id: 'x', from: ['kx'] },
        { id: 'y', from: ['ky'] },
      ],
      bank: treeBank(answer, [`${slip[0]}`, `${slip[1]}`, `${-x[0]}`, `${-x[1]}`]),
      answer,
    };
  },
  solution: (params) => {
    const { k, minus, x, a } = params;
    const b = scaledB(params);
    return [
      {
        text: minus
          ? `Add $\\mathbf{a}$ to both sides, then divide every entry by ${k}.`
          : `Take $\\mathbf{a}$ from both sides, then divide every entry by ${k}.`,
      },
      { tex: `${k}${bold('x')} = ${bold('b')} ${minus ? '+' : '-'} ${bold('a')}` },
      { tex: `${k}${bold('x')} = ${columnTex(b[0], b[1])} ${minus ? '+' : '-'} ${columnTex(a[0], a[1])} = ${columnTex(k * x[0], k * x[1])}` },
      { tex: `${bold('x')} = ${columnTex(x[0], x[1])}` },
      { text: `Check: ${k} times that, ${minus ? 'minus' : 'plus'} $\\mathbf{a}$, gives $\\mathbf{b}$.` },
    ];
  },
};

/* ---------- Lesson 5: equal vectors and unknowns ---------- */

type TopForm = 'ak' | 'k+b' | 'ak+b';
type BottomForm = 'm+d' | 'cm' | 'cm+d';

interface MatchParams {
  k: number;
  m: number;
  a: number;
  b: number;
  c: number;
  d: number;
  top: TopForm;
  bottom: BottomForm;
  split: boolean;
}

function topExprTex({ a, b, top }: MatchParams): string {
  if (top === 'ak') return `${a}k`;
  if (top === 'k+b') return `k ${plusMinus(b)}`;
  return `${a}k ${plusMinus(b)}`;
}
function topValue({ k, a, b, top }: MatchParams): number {
  if (top === 'ak') return a * k;
  if (top === 'k+b') return k + b;
  return a * k + b;
}
function bottomExprTex({ c, d, bottom }: MatchParams): string {
  if (bottom === 'm+d') return `m ${plusMinus(d)}`;
  if (bottom === 'cm') return `${c}m`;
  return `${c}m ${plusMinus(d)}`;
}
function bottomValue({ m, c, d, bottom }: MatchParams): number {
  if (bottom === 'm+d') return m + d;
  if (bottom === 'cm') return c * m;
  return c * m + d;
}

function matchEquation(params: MatchParams): string {
  const T = topValue(params);
  const B = bottomValue(params);
  const top = topExprTex(params);
  const bottom = bottomExprTex(params);
  return params.split
    ? `\\begin{pmatrix} ${top} \\\\ ${B} \\end{pmatrix} = \\begin{pmatrix} ${T} \\\\ ${bottom} \\end{pmatrix}`
    : `\\begin{pmatrix} ${top} \\\\ ${bottom} \\end{pmatrix} = \\begin{pmatrix} ${T} \\\\ ${B} \\end{pmatrix}`;
}

/** The wrong k from moving the constant across without changing its sign. */
function matchSlips(params: MatchParams): [number, number] {
  const { k, m, a, b, c, d, top, bottom } = params;
  const T = topValue(params);
  const B = bottomValue(params);
  const kSlip = top === 'ak' ? -k : top === 'k+b' ? T + b : (T + b) % a === 0 ? (T + b) / a : -k;
  const mSlip = bottom === 'cm' ? -m : bottom === 'm+d' ? B + d : (B + d) % c === 0 ? (B + d) / c : -m;
  return [kSlip, mSlip];
}

/** Two equal vectors with unknowns in their entries: find k and m. */
const matchEntries: Generator<MatchParams> = {
  id: 'vadd-match-entries',
  choices: (params) => {
    const { k, m } = params;
    const [ks, ms] = matchSlips(params);
    const label = (p: number, q: number) => `k = ${p}, \\; m = ${q}`;
    return options(
      { tex: label(k, m) },
      { tex: label(m, k) },
      { tex: label(ks, m) },
      { tex: label(k, ms) },
      { tex: label(ks, ms) },
      { tex: label(k + 1, m) },
    ).slice(0, 4);
  },
  sample: (rng, difficulty) => {
    for (;;) {
      const params: MatchParams = {
        k: nonZeroInt(rng, -4, 7),
        m: nonZeroInt(rng, -5, 8),
        a: rng.int(2, 5),
        b: nonZeroInt(rng, -9, 9),
        c: rng.int(2, 4),
        d: nonZeroInt(rng, -8, 8),
        top: difficulty > 1 ? rng.pick(['ak+b', 'ak+b', 'k+b'] as const) : rng.pick(['ak', 'k+b'] as const),
        bottom: difficulty > 1 ? rng.pick(['cm+d', 'cm', 'm+d'] as const) : rng.pick(['m+d', 'cm'] as const),
        split: rng.chance(0.5),
      };
      if (params.k === params.m) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { k, m } = params;
    const [ks, ms] = matchSlips(params);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'These two vectors are equal. Find $k$ and $m$.' },
        { kind: 'display', tex: matchEquation(params) },
      ],
      template: 'k = {0} \\qquad m = {1}',
      bank: bankOf([`${k}`, `${m}`], [`${ks}`, `${ms}`, `${-k}`, `${-m}`, `${k + 1}`, `${m - 1}`]),
      answer: [`${k}`, `${m}`],
    };
  },
  solution: (params) => {
    const { k, m, a, b, c, d, top, bottom } = params;
    const T = topValue(params);
    const B = bottomValue(params);
    const topLines =
      top === 'ak'
        ? [`${a}k = ${T}`, `k = ${k}`]
        : top === 'k+b'
          ? [`k ${plusMinus(b)} = ${T}`, `k = ${T} ${plusMinus(-b)} = ${k}`]
          : [`${a}k ${plusMinus(b)} = ${T}`, `${a}k = ${T - b}`, `k = ${k}`];
    const bottomLines =
      bottom === 'cm'
        ? [`${c}m = ${B}`, `m = ${m}`]
        : bottom === 'm+d'
          ? [`m ${plusMinus(d)} = ${B}`, `m = ${B} ${plusMinus(-d)} = ${m}`]
          : [`${c}m ${plusMinus(d)} = ${B}`, `${c}m = ${B - d}`, `m = ${m}`];
    return [
      { text: 'Equal vectors have equal entries, so the tops match and the bottoms match. That is two ordinary equations.' },
      { text: 'Top entries:' },
      ...topLines.map((tex) => ({ tex })),
      { text: 'Bottom entries:' },
      ...bottomLines.map((tex) => ({ tex })),
    ];
  },
};

interface ScalarUnknownParams {
  k: number;
  u: [number, number];
  v: [number, number];
  minus: boolean;
}

function scalarUnknownW({ k, u, v, minus }: ScalarUnknownParams): [number, number] {
  const s = minus ? -1 : 1;
  return [k * u[0] + s * v[0], k * u[1] + s * v[1]];
}

/** k u + v = w: find the scalar k. */
const scalarUnknown: Generator<ScalarUnknownParams> = {
  id: 'vadd-scalar-unknown',
  choices: (params) => {
    const { k, u, v, minus } = params;
    const w = scalarUnknownW(params);
    const s = minus ? -1 : 1;
    // Moving v across without changing its sign; forgetting v altogether.
    const slip = (w[0] + s * v[0]) / u[0];
    const forgot = w[0] / u[0];
    return signedChoices(k, [slip, forgot, -k]);
  },
  sample: (rng, difficulty) => ({
    k: nonZeroInt(rng, difficulty > 1 ? -5 : 2, 6),
    u: [nonZeroInt(rng, -5, 5), nonZeroInt(rng, -5, 5)],
    v: [nonZeroInt(rng, -7, 7), nonZeroInt(rng, -7, 7)],
    minus: difficulty > 1 && rng.chance(0.5),
  }),
  render: (params): Slide => {
    const { k, u, v, minus } = params;
    const w = scalarUnknownW(params);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Find the number $k$.' },
        { kind: 'display', tex: `k${columnTex(...u)} ${minus ? '-' : '+'} ${columnTex(...v)} = ${columnTex(...w)}` },
      ],
      lead: 'k =',
      keypad: [],
      answer: `${k}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { k, u, v, minus } = params;
    const w = scalarUnknownW(params);
    const op = minus ? '-' : '+';
    const undo = minus ? '+' : '-';
    return [
      { text: 'Match the top entries: that is one equation in $k$.' },
      { tex: `${u[0]}k ${op} ${br(v[0])} = ${w[0]}` },
      { tex: `${u[0]}k = ${w[0]} ${undo} ${br(v[0])} = ${u[0] * k}` },
      { tex: `k = \\frac{${u[0] * k}}{${u[0]}} = ${k}` },
      { text: 'Check with the bottom entries: the same $k$ has to work there too.' },
      { tex: `${u[1]} \\times ${br(k)} ${op} ${br(v[1])} = ${w[1]}` },
    ];
  },
};

interface PQParams {
  a: [number, number];
  b: [number, number];
  p: number;
  q: number;
}

function pqC({ a, b, p, q }: PQParams): [number, number] {
  return [p * a[0] + q * b[0], p * a[1] + q * b[1]];
}

/** `2p + 3q`, `-p - q`: one side of a component equation. */
function pqSideTex(cp: number, cq: number): string {
  return sumTex([
    [cp, 'p'],
    [cq, 'q'],
  ]);
}

function pqTiles(params: PQParams): Slide {
  const { a, b, p, q } = params;
  const c = pqC(params);
  return {
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'Find the numbers $p$ and $q$.' },
      { kind: 'display', tex: `p${columnTex(...a)} + q${columnTex(...b)} = ${columnTex(...c)}` },
    ],
    template: 'p = {0} \\qquad q = {1}',
    bank: bankOf([`${p}`, `${q}`], [`${q}`, `${p}`, `${-p}`, `${-q}`]),
    answer: [`${p}`, `${q}`],
  };
}

function pqChoices({ p, q }: PQParams): ChoiceOption[] {
  const label = (x: number, y: number) => `p = ${x}, \\; q = ${y}`;
  return options({ tex: label(p, q) }, { tex: label(q, p) }, { tex: label(-p, q) }, { tex: label(p, -q) }, { tex: label(-p, -q) }).slice(
    0,
    4,
  );
}

/** p a + q b = c where one entry of a is zero, so one equation gives q at once. */
const pqEasy: Generator<PQParams> = {
  id: 'vadd-pq-easy',
  choices: pqChoices,
  sample: (rng, difficulty) => {
    for (;;) {
      const zeroTop = rng.chance(0.5);
      const lead = nonZeroInt(rng, -4, 4);
      const a: [number, number] = zeroTop ? [0, lead] : [lead, 0];
      const b: [number, number] = [nonZeroInt(rng, -4, 4), nonZeroInt(rng, -4, 4)];
      const p = nonZeroInt(rng, difficulty > 1 ? -4 : 1, 5);
      const q = nonZeroInt(rng, difficulty > 1 ? -4 : 1, 5);
      if (p === q) continue;
      return { a, b, p, q };
    }
  },
  render: pqTiles,
  solution: (params) => {
    const { a, b, p, q } = params;
    const c = pqC(params);
    // The row where a has its zero gives q alone.
    const zero = a[0] === 0 ? 0 : 1;
    const other = 1 - zero;
    const rowName = (i: number) => (i === 0 ? 'Top' : 'Bottom');
    return [
      { text: 'Multiply out and match entries: one equation from the tops, one from the bottoms.' },
      { text: `${rowName(zero)} entries: the first vector has a zero there, so only $q$ appears.` },
      { tex: `${pqSideTex(0, b[zero])} = ${c[zero]}` },
      { tex: `q = ${q}` },
      { text: `${rowName(other)} entries, with $q = ${q}$ put in:` },
      { tex: `${pqSideTex(a[other], b[other])} = ${c[other]}` },
      { tex: `${coefTex(a[other], 'p')} + ${br(b[other] * q)} = ${c[other]}` },
      { tex: `${coefTex(a[other], 'p')} = ${a[other] * p} \\implies p = ${p}` },
    ];
  },
};

/** p a + q b = c in general: two simultaneous equations. */
const pq: Generator<PQParams> = {
  id: 'vadd-pq',
  choices: pqChoices,
  sample: (rng, difficulty) => {
    for (;;) {
      const a: [number, number] = [nonZeroInt(rng, -3, 4), nonZeroInt(rng, -3, 4)];
      const b: [number, number] = [nonZeroInt(rng, -3, 4), nonZeroInt(rng, -3, 4)];
      if (a[0] * b[1] - a[1] * b[0] === 0) continue;
      const p = nonZeroInt(rng, difficulty > 1 ? -4 : 1, 5);
      const q = nonZeroInt(rng, difficulty > 1 ? -4 : 1, 5);
      if (p === q) continue;
      return { a, b, p, q };
    }
  },
  render: pqTiles,
  solution: (params) => {
    const { a, b, p, q } = params;
    const c = pqC(params);
    const [m1, m2] = [a[1], a[0]];
    const same = m1 === m2;
    const coefQ = same ? b[0] - b[1] : b[0] * m1 - b[1] * m2;
    const rhs = same ? c[0] - c[1] : c[0] * m1 - c[1] * m2;
    const steps: SolutionStep[] = [
      { text: 'Match the tops and the bottoms: two equations in $p$ and $q$.' },
      { tex: `${pqSideTex(a[0], b[0])} = ${c[0]}` },
      { tex: `${pqSideTex(a[1], b[1])} = ${c[1]}` },
    ];
    if (same) {
      steps.push({ text: 'Both have the same number of $p$, so take the second from the first.' });
    } else {
      steps.push(
        {
          text: `Multiply the first by $${m1}$ and the second by $${m2}$, so both have $${coefTex(a[0] * a[1], 'p')}$. Then take the second from the first.`,
        },
        { tex: `${pqSideTex(a[0] * m1, b[0] * m1)} = ${c[0] * m1}` },
        { tex: `${pqSideTex(a[1] * m2, b[1] * m2)} = ${c[1] * m2}` },
      );
    }
    steps.push(
      { tex: `${coefTex(coefQ, 'q')} = ${rhs} \\implies q = ${q}` },
      { text: `Put $q = ${q}$ back into the first equation.` },
      { tex: `${coefTex(a[0], 'p')} + ${br(b[0] * q)} = ${c[0]}` },
      { tex: `${coefTex(a[0], 'p')} = ${a[0] * p} \\implies p = ${p}` },
    );
    return steps;
  },
};

export const vectorAddingGenerators = [
  readArrow,
  arrowSlider,
  equalArrows,
  reverse,
  headToTail,
  resultantSlider,
  parallelogramSum,
  resultantLength,
  minusTree,
  spotSlip,
  tipToTip,
  parallelogramDiff,
  combine,
  combineEntry,
  solveX,
  scaledTree,
  matchEntries,
  scalarUnknown,
  pqEasy,
  pq,
] as Generator<unknown>[];
