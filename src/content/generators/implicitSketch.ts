/**
 * Implicit Curves and their Sketches (pi-l11, Parametric & Implicit Basics).
 *
 * Reading the shape of a curve off its equation without plotting it:
 * symmetry (replace y with -y, x with -x, or both), where it meets the axes,
 * where it can go (a square is never negative), where its tangents are flat
 * or vertical, and putting those together to match an equation to a sketch.
 *
 * Every curve is built backwards from whole numbers, so every crossing, bound
 * and tangent point the learner meets is whole: intercepts from chosen roots,
 * ellipses from chosen semi-axes, tangent points from a chosen line and a
 * chosen coordinate. `implicitSketch.test.ts` checks each answer against the
 * equation the learner actually reads, parsed back from the slide's TeX.
 *
 * As everywhere, `*Tex` is what the learner reads and `answer` is what mathjs
 * grades; the two are never the same string.
 */
import type { Block, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { fracTex } from './format';
import {
  OPERATOR_KEYS,
  coef,
  mix,
  numberBank,
  numberChoices,
  pair,
  polyTex,
  signed,
  spaced,
  steered,
  treeBank,
  turned,
  xyAt,
  xyTex,
  type Term,
} from './parametricImplicit';

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });
const diagram = (svg: string): Block => ({ kind: 'diagram', svg });

const DYDX = '\\frac{dy}{dx}';

/** How wide a TeX string reads, roughly: commands and markup stripped. */
const visible = (tex: string): number => tex.replace(/\\[a-z]+/g, ' ').replace(/[{}^_]/g, '').length;

/** An equation as displays: split after its third term when too wide for a phone. */
function equationBlocks(terms: Term[], rhs: number): Block[] {
  const whole = `${xyTex(terms)} = ${rhs}`;
  if (visible(whole) <= 26 || terms.length < 4) return [display(whole)];
  const rest = xyTex(terms.slice(3));
  return [display(xyTex(terms.slice(0, 3))), display(`${rest.startsWith('-') ? `- ${rest.slice(1)}` : `+ ${rest}`} = ${rhs}`)];
}

/** Solution steps with a line that only repeats the one before it dropped. */
const unrepeated = (steps: SolutionStep[]): SolutionStep[] =>
  steps.filter((step, i) => i === 0 || step.text !== undefined || step.tex !== steps[i - 1].tex);

/** "an x" but "a y". */
const withLetter = (letter: string): string => `${letter === 'x' ? 'an' : 'a'} $${letter}$`;

/** Whether an equation has real points at all: G changes sign somewhere on a grid. */
function hasPoints(terms: Term[], rhs: number): boolean {
  let below = false;
  let above = false;
  for (let x = -6; x <= 6; x += 0.25) {
    for (let y = -6; y <= 6; y += 0.25) {
      const g = xyAt(terms, x, y) - rhs;
      if (g <= 0) below = true;
      if (g >= 0) above = true;
      if (below && above) return true;
    }
  }
  return false;
}

/** Terms by falling degree, then falling power of x. */
const sortTerms = (terms: Term[]): Term[] => [...terms].sort((s, t) => t.a + t.b - (s.a + s.b) || t.a - s.a);

/** A number as the SVG writes it, with a proper minus sign. */
const svgNumber = (n: number): string => (n < 0 ? `−${-n}` : `${n}`);

/* ---------- Drawing ---------- */

/** One traced stretch of a curve. */
export interface Piece {
  f: (t: number) => [number, number];
  tMin: number;
  tMax: number;
}

/** A dot, with an optional plain-text number set beside it, away from the origin. */
export interface Mark {
  x: number;
  y: number;
  text?: string;
}

/** The inside of one square panel, `size` wide, showing -span..span on both axes. */
function panelParts(pieces: Piece[], marks: Mark[], span: number, size: number): string[] {
  const sx = (v: number) => ((size * (v + span)) / (2 * span)).toFixed(1);
  const sy = (v: number) => ((size * (span - v)) / (2 * span)).toFixed(1);
  const clamp = (v: number) => Math.max(-span, Math.min(span, v));
  const parts = [
    `<line x1="0" y1="${sy(0)}" x2="${size}" y2="${sy(0)}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    `<line x1="${sx(0)}" y1="0" x2="${sx(0)}" y2="${size}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
  ];
  const SAMPLES = 160;
  for (const { f, tMin, tMax } of pieces) {
    const points: string[] = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const [x, y] = f(tMin + ((tMax - tMin) * i) / SAMPLES);
      points.push(`${i === 0 ? 'M' : 'L'} ${sx(clamp(x))},${sy(clamp(y))}`);
    }
    parts.push(`<path fill="none" stroke="currentColor" stroke-width="2" d="${points.join(' ')}" />`);
  }
  for (const { x, y, text } of marks) {
    parts.push(`<circle cx="${sx(x)}" cy="${sy(y)}" r="3.5" fill="currentColor" />`);
    if (text === undefined) continue;
    const onX = y === 0 && x !== 0;
    const at = onX
      ? { x: Number(sx(x)) + (x > 0 ? 6 : -6), y: Number(sy(0)) + 17, anchor: x > 0 ? 'start' : 'end' }
      : { x: Number(sx(x)) + 6, y: Number(sy(y)) + (y > 0 ? -6 : 17), anchor: 'start' };
    parts.push(
      `<text x="${at.x.toFixed(1)}" y="${at.y.toFixed(1)}" font-size="15" text-anchor="${at.anchor}" fill="currentColor">${text}</text>`,
    );
  }
  return parts;
}

/** Curves in several pieces (a hyperbola's two branches) on square axes. */
export function curvesSvg(pieces: Piece[], opts: { span: number; marks?: Mark[]; label: string }): string {
  const SIZE = 220;
  return [
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" role="img" aria-label="${opts.label}">`,
    ...panelParts(pieces, opts.marks ?? [], opts.span, SIZE),
    '</svg>',
  ].join('');
}

/* ---------- The four standard curves ---------- */

export type Conic =
  | { shape: 'circle'; r: number }
  | { shape: 'ellipse'; a: number; b: number }
  | { shape: 'hyperbola'; a: number; b: number }
  /** y^2 = kx when `axis` is x, x^2 = ky when it is y. */
  | { shape: 'parabola'; k: number; axis: 'x' | 'y' };

/** Every sketch is drawn on -7..7. */
export const SKETCH_SPAN = 7;

export function conicTex(c: Conic): string {
  switch (c.shape) {
    case 'circle':
      return `x^{2} + y^{2} = ${c.r * c.r}`;
    case 'ellipse':
      return `\\frac{x^{2}}{${c.a * c.a}} + \\frac{y^{2}}{${c.b * c.b}} = 1`;
    case 'hyperbola':
      return `\\frac{x^{2}}{${c.a * c.a}} - \\frac{y^{2}}{${c.b * c.b}} = 1`;
    case 'parabola':
      return c.axis === 'x' ? `y^{2} = ${coef(c.k)}x` : `x^{2} = ${coef(c.k)}y`;
  }
}

/** The curve as traced pieces, kept inside the window. */
export function conicPieces(c: Conic, span = SKETCH_SPAN): Piece[] {
  switch (c.shape) {
    case 'circle':
      return [{ f: (t) => [c.r * Math.cos(t), c.r * Math.sin(t)], tMin: 0, tMax: 2 * Math.PI }];
    case 'ellipse':
      return [{ f: (t) => [c.a * Math.cos(t), c.b * Math.sin(t)], tMin: 0, tMax: 2 * Math.PI }];
    case 'hyperbola': {
      const top = Math.min(Math.acosh(span / c.a), Math.asinh(span / c.b));
      return [1, -1].map((side) => ({
        f: (u: number): [number, number] => [side * c.a * Math.cosh(u), c.b * Math.sinh(u)],
        tMin: -top,
        tMax: top,
      }));
    }
    case 'parabola': {
      const reach = Math.min(span, Math.sqrt(span * Math.abs(c.k)));
      const f = (s: number): [number, number] => (c.axis === 'x' ? [(s * s) / c.k, s] : [s, (s * s) / c.k]);
      return [{ f, tMin: -reach, tMax: reach }];
    }
  }
}

/** Where the curve meets the axes, labelled. */
function conicMarks(c: Conic): Mark[] {
  const onX = (v: number): Mark[] => [
    { x: v, y: 0, text: svgNumber(v) },
    { x: -v, y: 0, text: svgNumber(-v) },
  ];
  const onY = (v: number): Mark[] => [
    { x: 0, y: v, text: svgNumber(v) },
    { x: 0, y: -v, text: svgNumber(-v) },
  ];
  switch (c.shape) {
    case 'circle':
      return [...onX(c.r), ...onY(c.r)];
    case 'ellipse':
      return [...onX(c.a), ...onY(c.b)];
    case 'hyperbola':
      return onX(c.a);
    case 'parabola':
      return [{ x: 0, y: 0 }];
  }
}

const SHAPE_WORDS: Record<Conic['shape'], string> = {
  circle: 'A circle',
  ellipse: 'An ellipse',
  hyperbola: 'A hyperbola in two branches',
  parabola: 'A parabola',
};

/** A plain-words description for the picture's label. */
function conicLabel(c: Conic): string {
  switch (c.shape) {
    case 'circle':
      return `A circle centred at the origin, meeting both axes at plus and minus ${c.r}`;
    case 'ellipse':
      return `An ellipse centred at the origin, meeting the x-axis at plus and minus ${c.a} and the y-axis at plus and minus ${c.b}`;
    case 'hyperbola':
      return `A hyperbola in two branches, opening left and right, meeting the x-axis at plus and minus ${c.a}`;
    case 'parabola':
      return c.axis === 'x'
        ? `A parabola through the origin, opening to the ${c.k > 0 ? 'right' : 'left'}`
        : `A parabola through the origin, opening ${c.k > 0 ? 'upwards' : 'downwards'}`;
  }
}

/** One of the standard curves, drawn with its axis crossings labelled. */
export function sketchSvg(c: Conic): string {
  return curvesSvg(conicPieces(c), { span: SKETCH_SPAN, marks: conicMarks(c), label: conicLabel(c) });
}

/** The size of one panel of a grid, and the gap between panels. */
export const GRID_PANEL = 220;
export const GRID_GAP = 16;
export const GRID_LETTERS = ['A', 'B', 'C', 'D'] as const;

/** Four sketches in a two-by-two grid, lettered A to D in reading order. */
export function sketchGridSvg(conics: Conic[]): string {
  const whole = 2 * GRID_PANEL + GRID_GAP;
  const parts = [
    `<svg viewBox="0 0 ${whole} ${whole}" width="100%" role="img" aria-label="Four sketches: ${conics
      .map((c, i) => `${GRID_LETTERS[i]}, ${conicLabel(c).replace(/^A /, 'a ').replace(/^An /, 'an ')}`)
      .join('; ')}">`,
  ];
  conics.forEach((c, i) => {
    const ox = (i % 2) * (GRID_PANEL + GRID_GAP);
    const oy = Math.floor(i / 2) * (GRID_PANEL + GRID_GAP);
    parts.push(
      `<g data-panel="${GRID_LETTERS[i]}" transform="translate(${ox},${oy})">`,
      `<rect x="0.5" y="0.5" width="${GRID_PANEL - 1}" height="${GRID_PANEL - 1}" fill="none" stroke="currentColor" stroke-width="1" opacity="0.35" rx="6" />`,
      ...panelParts(conicPieces(c), conicMarks(c), SKETCH_SPAN, GRID_PANEL),
      `<text x="10" y="24" font-size="20" font-weight="bold" fill="currentColor">${GRID_LETTERS[i]}</text>`,
      '</g>',
    );
  });
  parts.push('</svg>');
  return parts.join('');
}

/* ---------- Symmetry ---------- */

/** Monomials x^a y^b a symmetry question may use. */
const MONOMIALS: [number, number][] = [
  [2, 0],
  [0, 2],
  [1, 0],
  [0, 1],
  [3, 0],
  [0, 3],
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
  [4, 0],
  [0, 4],
  [3, 1],
  [1, 3],
];

export type AxisSymmetry = 'x' | 'y' | 'both' | 'neither';

/** Symmetric in the x-axis when every power of y is even, the y-axis when every power of x is. */
export function symmetryOf(terms: Term[]): AxisSymmetry {
  const inX = terms.every((t) => t.b % 2 === 0);
  const inY = terms.every((t) => t.a % 2 === 0);
  return inX && inY ? 'both' : inX ? 'x' : inY ? 'y' : 'neither';
}

/** y replaced with -y: odd powers of y change sign. */
export const flipY = (terms: Term[]): Term[] => terms.map((t) => ({ ...t, c: t.b % 2 === 1 ? -t.c : t.c }));
/** x replaced with -x. */
export const flipX = (terms: Term[]): Term[] => terms.map((t) => ({ ...t, c: t.a % 2 === 1 ? -t.c : t.c }));

/** Terms from a pool, until `exact` accepts them; the first coefficient positive. */
function sampleTerms(
  rng: Rng,
  difficulty: number,
  allowed: (a: number, b: number) => boolean,
  exact: (terms: Term[]) => boolean,
  size: number,
): Term[] {
  const pool = MONOMIALS.filter(([a, b]) => allowed(a, b) && (difficulty >= 2 || a + b <= 3));
  for (;;) {
    const n = difficulty >= 2 ? rng.pick([3, 3, 4]) : 3;
    const picked = rng.sample(pool, Math.min(n, pool.length));
    if (!picked.some(([a]) => a > 0) || !picked.some(([, b]) => b > 0)) continue;
    const terms = sortTerms(picked.map(([a, b]) => ({ c: 0, a, b }))).map((t, i) => ({
      ...t,
      c: rng.int(1, size) * (i === 0 ? 1 : rng.sign()),
    }));
    if (exact(terms)) return terms;
  }
}

export interface SymmetryParams {
  terms: Term[];
  rhs: number;
}

function sampleSymmetry(rng: Rng, difficulty: number): SymmetryParams {
  const want = rng.pick(['x', 'y', 'both', 'neither'] as const);
  const allowed = (a: number, b: number) =>
    want === 'x' ? b % 2 === 0 : want === 'y' ? a % 2 === 0 : want === 'both' ? a % 2 === 0 && b % 2 === 0 : true;
  for (;;) {
    const terms = sampleTerms(rng, difficulty, allowed, (t) => symmetryOf(t) === want, difficulty >= 2 ? 5 : 4);
    const rhs = rng.int(1, 12) * (difficulty >= 2 ? rng.sign() : 1);
    // A curve with no points has nothing to be symmetric.
    if (hasPoints(terms, rhs)) return { terms, rhs };
  }
}

const SYMMETRY_WORDS: Record<AxisSymmetry, string> = {
  x: 'The x-axis only',
  y: 'The y-axis only',
  both: 'Both axes',
  neither: 'Neither axis',
};

const sameTerms = (s: Term[], t: Term[]) => s.every((term, i) => term.c === t[i].c);

function symmetrySolution({ terms, rhs }: SymmetryParams): SolutionStep[] {
  const y = flipY(terms);
  const x = flipX(terms);
  const sym = symmetryOf(terms);
  return [
    { text: 'Replace $y$ with $-y$. Odd powers of $y$ change sign; even powers do not.', tex: `${xyTex(y)} = ${rhs}` },
    {
      text: sameTerms(y, terms)
        ? 'That is the same equation, so the curve is symmetric in the $x$-axis.'
        : 'That is a different equation, so there is no symmetry in the $x$-axis.',
    },
    { text: 'Replace $x$ with $-x$.', tex: `${xyTex(x)} = ${rhs}` },
    {
      text: sameTerms(x, terms)
        ? 'That is the same equation, so the curve is symmetric in the $y$-axis.'
        : 'That is a different equation, so there is no symmetry in the $y$-axis.',
    },
    {
      text:
        sym === 'both'
          ? 'Symmetric in both axes.'
          : sym === 'neither'
            ? 'Symmetric in neither axis.'
            : `Symmetric in the $${sym}$-axis only.`,
    },
  ];
}

/**
 * Which axes a curve is symmetric in, read off the powers.
 *
 * Native choice with the four answers in a fixed order, as for the tangent
 * kinds: each is right a quarter of the time, so the order teaches nothing.
 */
const iskSymmetry: Generator<SymmetryParams> = {
  id: 'isk-symmetry',
  sample: sampleSymmetry,
  render: ({ terms, rhs }): Slide => ({
    kind: 'choice',
    prompt: [prose('Which axes is this curve symmetric in?'), ...equationBlocks(terms, rhs)],
    options: (['x', 'y', 'both', 'neither'] as const).map((id) => ({ id, label: SYMMETRY_WORDS[id] })),
    correctId: symmetryOf(terms),
  }),
  solution: symmetrySolution,
};

/**
 * The same question as three decisions: what y -> -y gives, what x -> -x
 * gives, and what that says. The wrong equation offered at each step is the
 * sign slip for that step: an odd power left alone, or an even one turned over.
 */
const iskSymmetryFlow: Generator<SymmetryParams> = {
  id: 'isk-symmetry-flow',
  sample: sampleSymmetry,
  render: (params): Slide => {
    const { terms, rhs } = params;
    const salt = mix(rhs, ...terms.flatMap((t) => [t.c, t.a, t.b]));
    const eq = (ts: Term[]) => `$${xyTex(ts)} = ${rhs}$`;
    const step = (letter: 'x' | 'y') => {
      const power = (t: Term) => (letter === 'y' ? t.b : t.a);
      const right = letter === 'y' ? flipY(terms) : flipX(terms);
      const odd = terms.find((t) => power(t) % 2 === 1);
      const even = terms.find((t) => power(t) > 0 && power(t) % 2 === 0);
      const slip = odd
        ? terms
        : terms.map((t) => ({ ...t, c: power(t) > 0 ? -t.c : t.c }));
      const n = odd ? power(odd) : power(even!);
      const fact = odd
        ? `An odd power of $${letter}$ changes sign: $(-${letter})${n === 1 ? '' : `^{${n}}`} = -${letter}${n === 1 ? '' : `^{${n}}`}$.`
        : `An even power of $${letter}$ keeps its sign: $(-${letter})^{${n}} = ${letter}^{${n}}$.`;
      return { right, slip, fact };
    };
    const y = step('y');
    const x = step('x');
    const sameY = sameTerms(y.right, terms);
    const sameX = sameTerms(x.right, terms);
    const xFact = sameY
      ? 'Replacing $y$ with $-y$ left the equation the same, so the curve is symmetric in the $x$-axis.'
      : 'Replacing $y$ with $-y$ changed the equation, so the curve is not symmetric in the $x$-axis.';
    const yFact = sameX
      ? 'Replacing $x$ with $-x$ left the equation the same, so the curve is symmetric in the $y$-axis.'
      : 'Replacing $x$ with $-x$ changed the equation, so the curve is not symmetric in the $y$-axis.';
    const sym = symmetryOf(terms);
    const verdicts: { id: AxisSymmetry; label: string }[] = [
      { id: 'x', label: 'The $x$-axis only' },
      { id: 'y', label: 'The $y$-axis only' },
      { id: 'both', label: 'Both axes' },
      { id: 'neither', label: 'Neither axis' },
    ];
    const rightVerdict = verdicts.find((v) => v.id === sym)!.label;
    return {
      kind: 'flow',
      prompt: [prose('Test this curve for symmetry in each axis.'), ...equationBlocks(terms, rhs)],
      subject: `${xyTex(terms)} = ${rhs}`,
      steps: [
        {
          id: 'y',
          ask: 'Replace $y$ with $-y$ and simplify. Which equation do you get?',
          branches: turned(
            [
              { label: eq(y.right), to: 'x' },
              { label: eq(y.slip), outcome: y.fact },
            ],
            salt % 2,
          ),
        },
        {
          id: 'x',
          ask: 'Now replace $x$ with $-x$ in the original. Which equation do you get?',
          branches: turned(
            [
              { label: eq(x.right), to: 'verdict' },
              { label: eq(x.slip), outcome: x.fact },
            ],
            (salt >>> 2) % 2,
          ),
        },
        {
          id: 'verdict',
          ask: 'So the curve is symmetric in',
          branches: verdicts.map((v) => {
            if (v.id === sym) return { label: v.label, outcome: `Symmetric in ${v.label.toLowerCase()}.` };
            const claimsX = v.id === 'x' || v.id === 'both';
            return { label: v.label, outcome: claimsX !== sameY ? xFact : yFact };
          }),
        },
      ],
      answer: [eq(y.right), eq(x.right), rightVerdict],
    };
  },
  solution: symmetrySolution,
};

export type MirrorKind = 'x' | 'y' | 'origin';

export interface MirrorParams {
  terms: Term[];
  rhs: number;
  p: number;
  q: number;
  kind: MirrorKind;
}

/** The point the curve's one symmetry sends (p, q) to. */
export function mirrorOf({ p, q, kind }: MirrorParams): [number, number] {
  return kind === 'x' ? [p, -q] : kind === 'y' ? [-p, q] : [-p, -q];
}

/** The three images of (p, q): in the x-axis, the y-axis and the origin. */
const images = (p: number, q: number): [number, number][] => [
  [p, -q],
  [-p, q],
  [-p, -q],
];

const MIRROR_WORDS: Record<MirrorKind, string> = {
  x: 'The same equation, since only even powers of $y$ appear: the curve is symmetric in the $x$-axis.',
  y: 'The same equation, since only even powers of $x$ appear: the curve is symmetric in the $y$-axis.',
  origin:
    'The same equation, since every term has an even total power: the curve has half-turn symmetry about the origin.',
};

/**
 * A point on a curve with exactly one symmetry, and the other point that
 * symmetry forces. The two images the curve does not have are checked to be
 * off it, so the answer is the only one of the three that must be on it.
 */
const iskMirrorPoint: Generator<MirrorParams> = {
  id: 'isk-mirror-point',
  sample: (rng, difficulty) => {
    const kind = rng.pick(['x', 'y', 'origin'] as const);
    const allowed = (a: number, b: number) =>
      kind === 'x' ? b % 2 === 0 : kind === 'y' ? a % 2 === 0 : (a + b) % 2 === 0;
    const exact = (terms: Term[]) =>
      kind === 'x'
        ? symmetryOf(terms) === 'x'
        : kind === 'y'
          ? symmetryOf(terms) === 'y'
          : terms.some((t) => t.a % 2 === 1);
    const reach = difficulty >= 2 ? 3 : 2;
    for (;;) {
      const terms = sampleTerms(rng, difficulty, allowed, exact, 3);
      const p = rng.int(1, reach) * rng.sign();
      const q = rng.int(1, reach) * rng.sign();
      const rhs = xyAt(terms, p, q);
      if (rhs === 0 || Math.abs(rhs) > 60) continue;
      const params = { terms, rhs, p, q, kind };
      const [mx, my] = mirrorOf(params);
      const others = images(p, q).filter(([x, y]) => x !== mx || y !== my);
      if (others.some(([x, y]) => xyAt(terms, x, y) === rhs)) continue;
      return params;
    }
  },
  choices: (params) => {
    const { terms, rhs, p, q } = params;
    const [mx, my] = mirrorOf(params);
    const candidates: [number, number][] = [...images(p, q), [q, p], [-q, -p], [q, -p], [p + 1, q], [p, q + 1]];
    const wrong = candidates.filter(
      ([x, y], i) =>
        (x !== mx || y !== my) &&
        (x !== p || y !== q) &&
        xyAt(terms, x, y) !== rhs &&
        candidates.findIndex(([s, t]) => s === x && t === y) === i,
    );
    const asOption = ([x, y]: [number, number]) => ({ tex: pair(x, y) });
    return steered(options(asOption([mx, my]), ...wrong.slice(0, 3).map(asOption)), mix(p, q, rhs), wrong.slice(3).map(asOption));
  },
  render: (params): Slide => {
    const { terms, rhs, p, q } = params;
    const [mx, my] = mirrorOf(params);
    return {
      kind: 'tiles',
      prompt: [
        prose(`This curve passes through $${pair(p, q)}$.`),
        ...equationBlocks(terms, rhs),
        prose('Use its symmetry. Which other point must be on it?'),
      ],
      template: '({0}, {1})',
      bank: numberBank([mx, my], [p, q, -mx, -my, q, p]),
      answer: [`${mx}`, `${my}`],
    };
  },
  solution: (params) => {
    const { terms, rhs, p, q, kind } = params;
    const [mx, my] = mirrorOf(params);
    const moved = kind === 'x' ? flipY(terms) : kind === 'y' ? flipX(terms) : flipX(flipY(terms));
    return [
      {
        text: kind === 'x' ? 'Replace $y$ with $-y$.' : kind === 'y' ? 'Replace $x$ with $-x$.' : 'Replace $x$ with $-x$ and $y$ with $-y$.',
        tex: `${xyTex(moved)} = ${rhs}`,
      },
      { text: MIRROR_WORDS[kind] },
      { text: `So $${pair(p, q)}$ on the curve means $${pair(mx, my)}$ is on it too.` },
    ];
  },
};

/* ---------- Meeting the axes ---------- */

/**
 * a x^2 + b xy + c y^2 + d x + e y = k, built from its crossings: y = 0 gives
 * a (x - r1)(x - r2) = 0 and x = 0 gives c (y - s1)(y - s2) = 0, which share
 * a constant only when a r1 r2 = c s1 s2.
 */
export interface AxisCurveParams {
  a: number;
  b: number;
  c: number;
  r: [number, number];
  s: [number, number];
  axis: 'x' | 'y';
}

export function axisCurveTerms({ a, b, c, r, s }: AxisCurveParams): { terms: Term[]; rhs: number } {
  const terms = [
    { c: a, a: 2, b: 0 },
    { c: b, a: 1, b: 1 },
    { c: c, a: 0, b: 2 },
    { c: -a * (r[0] + r[1]), a: 1, b: 0 },
    { c: -c * (s[0] + s[1]), a: 0, b: 1 },
  ].filter((t) => t.c !== 0);
  return { terms, rhs: -a * r[0] * r[1] };
}

function sampleAxisCurve(rng: Rng, difficulty: number): AxisCurveParams {
  const hard = difficulty >= 2;
  for (;;) {
    const a = hard ? rng.pick([1, 1, 2]) : 1;
    const c = rng.pick(hard ? [1, 2, 3] : [1, 2]);
    const b = rng.int(1, 3) * rng.sign();
    const r1 = rng.int(-5, 5);
    const r2 = rng.int(-5, 5);
    if (r1 === 0 || r2 === 0 || r1 >= r2) continue;
    const product = a * r1 * r2;
    const found: [number, number][] = [];
    for (let s1 = -6; s1 <= 6; s1 += 1) {
      for (let s2 = s1 + 1; s2 <= 6; s2 += 1) {
        if (s1 !== 0 && s2 !== 0 && c * s1 * s2 === product) found.push([s1, s2]);
      }
    }
    if (found.length === 0) continue;
    return { a, b, c, r: [r1, r2], s: rng.pick(found), axis: rng.pick(['x', 'y'] as const) };
  }
}

/** The quadratic left on the asked axis: its leading coefficient, linear coefficient, roots and letter. */
function onAxis(params: AxisCurveParams): { lead: number; linear: number; roots: [number, number]; v: 'x' | 'y'; other: 'x' | 'y' } {
  const { a, c, r, s, axis } = params;
  return axis === 'x'
    ? { lead: a, linear: -a * (r[0] + r[1]), roots: r, v: 'x', other: 'y' }
    : { lead: c, linear: -c * (s[0] + s[1]), roots: s, v: 'y', other: 'x' };
}

const orTex = (v: string, [lo, hi]: [number, number]): string => `${v} = ${lo} \\text{ or } ${v} = ${hi}`;

function axisSolution(params: AxisCurveParams): SolutionStep[] {
  const { lead, linear, roots, v, other } = onAxis(params);
  const { rhs } = axisCurveTerms(params);
  return [
    {
      text: `On the $${v}$-axis, $${other} = 0$, so every term with ${withLetter(other)} in it vanishes.`,
      tex: `${polyTex([lead, linear, 0], v)} = ${rhs}`,
    },
    { tex: `${polyTex([lead, linear, -rhs], v)} = 0` },
    { text: 'Factorise.', tex: `${coef(lead)}(${v} ${signed(-roots[0])})(${v} ${signed(-roots[1])}) = 0` },
    { tex: orTex(v, roots) },
  ];
}

/** Where the curve meets one axis: both crossings placed. */
const iskIntercepts: Generator<AxisCurveParams> = {
  id: 'isk-intercepts',
  sample: sampleAxisCurve,
  choices: (params) => {
    const { roots, v, lead, linear } = onAxis(params);
    const other = params.axis === 'x' ? params.s : params.r;
    const key = ([p, q]: [number, number]) => `${Math.min(p, q)},${Math.max(p, q)}`;
    const sets: [number, number][] = [
      [-roots[1], -roots[0]],
      other,
      [0, -linear / lead],
      [roots[0], -roots[1]],
      [-roots[0], roots[1]],
      [2 * roots[0], 2 * roots[1]],
      [roots[0] - 1, roots[1] + 1],
    ];
    const seen = new Set([key(roots)]);
    const wrong: [number, number][] = [];
    for (const [p, q] of sets) {
      if (!Number.isInteger(p) || !Number.isInteger(q) || p === q || seen.has(key([p, q]))) continue;
      seen.add(key([p, q]));
      wrong.push([Math.min(p, q), Math.max(p, q)]);
    }
    const asOption = (set: [number, number]) => ({ tex: orTex(v, set) });
    return steered(options(asOption(roots), ...wrong.slice(0, 3).map(asOption)), mix(...roots, ...other), wrong.slice(3).map(asOption));
  },
  render: (params): Slide => {
    const { terms, rhs } = axisCurveTerms(params);
    const { roots, v } = onAxis(params);
    const otherRoots = params.axis === 'x' ? params.s : params.r;
    return {
      kind: 'tiles',
      prompt: [prose(`Where does this curve meet the $${v}$-axis?`), ...equationBlocks(terms, rhs)],
      template: `${v} = {0} \\text{ or } ${v} = {1}`,
      bank: numberBank([...roots], [-roots[0], -roots[1], ...otherRoots, rhs]),
      answer: roots.map(String),
      unordered: true,
    };
  },
  solution: axisSolution,
};

/** Where a value of the axis variable really puts the left side. */
function leftAt(params: AxisCurveParams, value: number): number {
  const { lead, linear } = onAxis(params);
  return lead * value * value + linear * value;
}

/**
 * Meeting an axis as three decisions: which coordinate is zero, the equation
 * that leaves, and its roots.
 */
const iskMeetFlow: Generator<AxisCurveParams> = {
  id: 'isk-meet-flow',
  sample: sampleAxisCurve,
  render: (params): Slide => {
    const { terms, rhs } = axisCurveTerms(params);
    const { lead, linear, roots, v, other } = onAxis(params);
    const otherRoots = params.axis === 'x' ? params.s : params.r;
    const salt = mix(params.a, params.b, params.c, ...params.r, ...params.s);
    const left = polyTex([lead, linear, 0], v);
    const eqRight = `$${left} = ${rhs}$`;
    const eqWrong: { label: string; outcome: string }[] = [];
    const dropped = `$${coef(lead)}${v}^{2} = ${rhs}$`;
    if (linear !== 0) {
      eqWrong.push({
        label: dropped,
        outcome: `Only the terms with ${withLetter(other)} in them vanish, so the $${polyTex([linear, 0], v)}$ stays.`,
      });
    }
    const kept = `$${polyTex([lead, linear + params.b, 0], v)} = ${rhs}$`;
    if (kept !== dropped && kept !== eqRight) {
      eqWrong.push({ label: kept, outcome: `With $${other} = 0$ the $xy$ term is $0$ too, so it vanishes.` });
    }
    const key = ([p, q]: [number, number]) => `${Math.min(p, q)},${Math.max(p, q)}`;
    const wrongSets = [
      [-roots[1], -roots[0]],
      [roots[0], -roots[1]],
      [-roots[0], roots[1]],
      [roots[0] - 1, roots[1] + 1],
    ]
      .map(([p, q]) => [Math.min(p, q), Math.max(p, q)] as [number, number])
      .filter((set, i, all) => set[0] !== set[1] && key(set) !== key(roots) && all.findIndex((o) => key(o) === key(set)) === i)
      .slice(0, 2);
    const orLabel = ([lo, hi]: [number, number]) => `$${v} = ${lo}$ or $${v} = ${hi}$`;
    return {
      kind: 'flow',
      prompt: [prose(`Find where this curve meets the $${v}$-axis.`), ...equationBlocks(terms, rhs)],
      subject: `\\text{the } ${v}\\text{-axis}`,
      steps: [
        {
          id: 'zero',
          ask: `Which coordinate is zero on the $${v}$-axis?`,
          branches: turned(
            [
              { label: `$${other} = 0$`, to: 'eq' },
              {
                label: `$${v} = 0$`,
                outcome: `Putting $${v} = 0$ finds where it meets the $${other}$-axis instead, at $${other} = ${otherRoots[0]}$ and $${other} = ${otherRoots[1]}$.`,
              },
            ],
            salt % 2,
          ),
        },
        {
          id: 'eq',
          ask: `Put $${other} = 0$. Which equation is left?`,
          branches: turned([{ label: eqRight, to: 'solve' }, ...eqWrong], (salt >>> 2) % (eqWrong.length + 1)),
        },
        {
          id: 'solve',
          ask: 'Solve it. Where does the curve meet the axis?',
          branches: turned(
            [
              { label: orLabel(roots), outcome: `It meets the $${v}$-axis at $${v} = ${roots[0]}$ and $${v} = ${roots[1]}$.` },
              ...wrongSets.map((set) => {
                const bad = set.find((value) => leftAt(params, value) !== rhs)!;
                return {
                  label: orLabel(set),
                  outcome: `Put $${v} = ${bad}$ back in: $${left}$ comes to $${leftAt(params, bad)}$, not $${rhs}$.`,
                };
              }),
            ],
            (salt >>> 4) % (wrongSets.length + 1),
          ),
        },
      ],
      answer: [`$${other} = 0$`, eqRight, orLabel(roots)],
    };
  },
  solution: axisSolution,
};

export type Crossings = 2 | 1 | 0;

/**
 * a x^2 + b xy + c y^2 + d x + e y = k, where the asked axis is crossed
 * twice, touched once, or missed. The other axis is always crossed twice,
 * which also proves the curve has real points at all.
 */
export interface CountParams {
  terms: Term[];
  rhs: number;
  axis: 'x' | 'y';
  count: Crossings;
}

/** The quadratic on the asked axis: lead v^2 + linear v = rhs. */
function countQuadratic({ terms, axis }: CountParams): [number, number] {
  const find = (a: number, b: number) => terms.find((t) => t.a === a && t.b === b)?.c ?? 0;
  return axis === 'x' ? [find(2, 0), find(1, 0)] : [find(0, 2), find(0, 1)];
}

const COUNT_WORDS: Record<Crossings, string> = { 2: 'Twice', 1: 'Once, touching it', 0: 'Not at all' };

const iskAxisCount: Generator<CountParams> = {
  id: 'isk-axis-count',
  sample: (rng, difficulty) => {
    for (;;) {
      const count = rng.pick([2, 1, 0] as const);
      const axis = rng.pick(['x', 'y'] as const);
      const lead = rng.int(1, difficulty >= 2 ? 3 : 2);
      let linear: number;
      let rhs: number;
      if (count === 2) {
        const s1 = rng.int(-4, 4);
        const s2 = rng.int(-4, 4);
        if (s1 >= s2) continue;
        linear = -lead * (s1 + s2);
        rhs = -lead * s1 * s2;
      } else if (count === 1) {
        const s = rng.int(1, 4) * rng.sign();
        linear = -2 * lead * s;
        rhs = -lead * s * s;
      } else {
        const s = rng.int(-3, 3);
        const m = rng.int(1, 4);
        linear = -2 * lead * s;
        rhs = -lead * (s * s + m);
      }
      const otherLead = rng.int(1, 3);
      const otherLinear = rng.int(-6, 6);
      if (otherLinear * otherLinear + 4 * otherLead * rhs <= 0) continue;
      const b = rng.int(1, 3) * rng.sign();
      const [xx, x, yy, y] = axis === 'x' ? [lead, linear, otherLead, otherLinear] : [otherLead, otherLinear, lead, linear];
      const terms = [
        { c: xx, a: 2, b: 0 },
        { c: b, a: 1, b: 1 },
        { c: yy, a: 0, b: 2 },
        { c: x, a: 1, b: 0 },
        { c: y, a: 0, b: 1 },
      ].filter((t) => t.c !== 0);
      return { terms, rhs, axis, count };
    }
  },
  render: (params): Slide => ({
    kind: 'choice',
    prompt: [prose(`How many times does this curve meet the $${params.axis}$-axis?`), ...equationBlocks(params.terms, params.rhs)],
    options: ([2, 1, 0] as const).map((n) => ({ id: `${n}`, label: COUNT_WORDS[n] })),
    correctId: `${params.count}`,
  }),
  solution: (params) => {
    const [lead, linear] = countQuadratic(params);
    const v = params.axis;
    const other = v === 'x' ? 'y' : 'x';
    const disc = linear * linear + 4 * lead * params.rhs;
    return [
      { text: `On the $${v}$-axis, $${other} = 0$.`, tex: `${polyTex([lead, linear, 0], v)} = ${params.rhs}` },
      { tex: `${polyTex([lead, linear, -params.rhs], v)} = 0` },
      {
        text: 'Work out the discriminant, $b^{2} - 4ac$.',
        tex: `${linear < 0 ? `(${linear})` : linear}^{2} - 4 \\times ${lead} \\times ${-params.rhs < 0 ? `(${-params.rhs})` : -params.rhs} = ${disc}`,
      },
      {
        text:
          disc > 0
            ? 'Positive: two roots, so the curve crosses the axis twice.'
            : disc === 0
              ? 'Zero: one repeated root, so the curve touches the axis once.'
              : 'Negative: no real roots, so the curve never meets the axis.',
      },
    ];
  },
};

/* ---------- Where the curve can go ---------- */

const gcd = (m: number, n: number): number => (n === 0 ? Math.abs(m) : gcd(n, m % n));

/** p x^2 + q y^2 = r with semi-axes A along x and B along y. */
export interface BoundsParams {
  A: number;
  B: number;
  axis: 'x' | 'y';
}

export function boundsEquation({ A, B }: BoundsParams): { p: number; q: number; r: number } {
  const g = gcd(A * A, B * B);
  return { p: (B * B) / g, q: (A * A) / g, r: (A * A * B * B) / g };
}

const boundsTex = (params: BoundsParams): string => {
  const { p, q, r } = boundsEquation(params);
  return `${coef(p)}x^{2} + ${coef(q)}y^{2} = ${r}`;
};

const betweenTex = (v: string, n: number): string => `${-n} \\le ${v} \\le ${n}`;

const iskBounds: Generator<BoundsParams> = {
  id: 'isk-bounds',
  sample: (rng, difficulty) => {
    for (;;) {
      const top = difficulty >= 2 ? 6 : 5;
      const A = rng.int(1, top);
      const B = rng.int(1, top);
      if (A !== B) return { A, B, axis: rng.pick(['x', 'y'] as const) };
    }
  },
  choices: (params) => {
    const n = params.axis === 'x' ? params.A : params.B;
    const m = params.axis === 'x' ? params.B : params.A;
    const { r } = boundsEquation(params);
    const wrong = [m, n * n, r, 2 * n].filter((v, i, all) => v !== n && all.indexOf(v) === i);
    const asOption = (v: number) => ({ tex: betweenTex(params.axis, v) });
    return steered(options(asOption(n), ...wrong.slice(0, 3).map(asOption)), mix(params.A, params.B), wrong.slice(3).map(asOption));
  },
  render: (params): Slide => {
    const v = params.axis;
    const n = v === 'x' ? params.A : params.B;
    const m = v === 'x' ? params.B : params.A;
    const { r } = boundsEquation(params);
    return {
      kind: 'tiles',
      prompt: [prose(`Between which values does $${v}$ lie on this curve?`), display(boundsTex(params))],
      template: `{0} \\le ${v} \\le {1}`,
      bank: numberBank([-n, n], [m, -m, n * n, r]),
      answer: [`${-n}`, `${n}`],
    };
  },
  solution: (params) => {
    const v = params.axis;
    const w = v === 'x' ? 'y' : 'x';
    const n = v === 'x' ? params.A : params.B;
    const { p, q, r } = boundsEquation(params);
    const own = v === 'x' ? p : q;
    return unrepeated([
      { text: `$${coef(v === 'x' ? q : p)}${w}^{2}$ is a square times a positive number, so it is never negative. That leaves at most $${r}$ for the other term.` },
      { tex: `${coef(own)}${v}^{2} \\le ${r}` },
      { tex: `${v}^{2} \\le ${n * n}` },
      { tex: betweenTex(v, n) },
    ]);
  },
};

/**
 * w^2 = m (h - v) or w^2 = m (v - h): a parabola reaching only one side of
 * v = h, and the question is where it stops.
 */
export interface FurthestParams {
  v: 'x' | 'y';
  most: boolean;
  m: number;
  h: number;
}

/** The right-hand side, the number first when v is subtracted: `12 - 3x`, `3x - 12`. */
const furthestRight = ({ v, most, m, h }: FurthestParams): string =>
  most ? `${m * h} - ${coef(m)}${v}` : polyTex([m, -m * h], v);

export function furthestTex(params: FurthestParams): string {
  return `${params.v === 'x' ? 'y' : 'x'}^{2} = ${furthestRight(params)}`;
}

const iskFurthest: Generator<FurthestParams> = {
  id: 'isk-furthest',
  sample: (rng, difficulty) => {
    for (;;) {
      const h = rng.int(-6, 6);
      if (h === 0) continue;
      return { v: rng.pick(['x', 'y'] as const), most: rng.chance(0.5), m: rng.int(1, difficulty >= 2 ? 6 : 4), h };
    }
  },
  choices: ({ m, h, v, most }) => numberChoices(h, [m * h, -h, -m * h], mix(m, h, v === 'x' ? 1 : 2, most ? 1 : 0)),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`What is the ${params.most ? 'largest' : 'smallest'} value of $${params.v}$ on this curve?`),
      display(furthestTex(params)),
    ],
    lead: `${params.v} =`,
    keypad: [],
    answer: `${params.h}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { v, most, m, h } = params;
    const w = v === 'x' ? 'y' : 'x';
    return unrepeated([
      { text: `$${w}^{2}$ is never negative, so the right-hand side cannot be either.`, tex: `${furthestRight(params)} \\ge 0` },
      { tex: most ? `${coef(m)}${v} \\le ${m * h}` : `${coef(m)}${v} \\ge ${m * h}` },
      { tex: `${v} ${most ? '\\le' : '\\ge'} ${h}` },
      { text: `So the ${most ? 'largest' : 'smallest'} value is $${v} = ${h}$, where $${w} = 0$.` },
    ]);
  },
};

/**
 * y^2 = (x - alpha)(x - beta), which lives outside the roots, or
 * y^2 = (x - alpha)(beta - x), which lives between them.
 */
export interface GapParams {
  alpha: number;
  beta: number;
  closed: boolean;
}

const factorTex = (root: number): string => (root === 0 ? 'x' : `(x ${signed(-root)})`);

export function gapTex({ alpha, beta, closed }: GapParams): string {
  if (closed) return `y^{2} = (x ${signed(-alpha)})(${beta} - x)`;
  const [first, second] = alpha === 0 ? [alpha, beta] : beta === 0 ? [beta, alpha] : [alpha, beta];
  return `y^{2} = ${factorTex(first)}${factorTex(second)}`;
}

export const gapSet = ({ alpha, beta, closed }: GapParams): string =>
  closed ? `[${alpha},${beta}]` : `(-inf,${alpha}]|[${beta},inf)`;

const iskGapLine: Generator<GapParams> = {
  id: 'isk-gap-line',
  sample: (rng, difficulty) => {
    for (;;) {
      const alpha = rng.int(-5, 5);
      const beta = rng.int(-5, 5);
      if (alpha >= beta) continue;
      const closed = difficulty >= 2 && rng.chance(0.5);
      if (closed && (alpha === 0 || beta <= 0)) continue;
      return { alpha, beta, closed };
    }
  },
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [prose('Shade the values of $x$ where this curve has points.'), display(gapTex(params))],
    min: -6,
    max: 6,
    step: 1,
    answer: gapSet(params),
  }),
  solution: (params) => {
    const { alpha, beta, closed } = params;
    const right = gapTex(params).replace('y^{2} = ', '');
    return [
      { text: '$y^{2}$ is never negative, so the right-hand side must not be.', tex: `${right} \\ge 0` },
      { text: `It is zero at $x = ${alpha}$ and $x = ${beta}$.` },
      {
        text: closed
          ? `Between them both brackets are positive; outside, one is negative.`
          : `Between them one bracket is negative; outside, both have the same sign.`,
        tex: closed ? `${alpha} \\le x \\le ${beta}` : `x \\le ${alpha} \\quad \\text{or} \\quad x \\ge ${beta}`,
      },
    ];
  },
};

/* ---------- Flat and vertical tangents on p x^2 + q xy + r y^2 = c ---------- */

/**
 * The tangents are horizontal where 2px + qy = 0 and vertical where
 * qx + 2ry = 0. Horizontal: y = m x with m = -2p/q, then (p + qm + rm^2) x^2 = c.
 * Vertical: x = k y with k = -2r/q, then (pk^2 + qk + r) y^2 = c. The
 * multiplier and the coordinate u are whole, so c is chosen as S u^2.
 */
export interface FlatParams {
  p: number;
  q: number;
  r: number;
  horizontal: boolean;
  u: number;
}

export function flatValues({ p, q, r, horizontal, u }: FlatParams): {
  slope: number;
  first: number;
  second: number;
  S: number;
  c: number;
  point: [number, number];
} {
  if (horizontal) {
    const m = (-2 * p) / q;
    const S = p + q * m + r * m * m;
    return { slope: m, first: q * m, second: r * m * m, S, c: S * u * u, point: [u, m * u] };
  }
  const k = (-2 * r) / q;
  const S = p * k * k + q * k + r;
  return { slope: k, first: p * k * k, second: q * k, S, c: S * u * u, point: [k * u, u] };
}

const flatTerms = ({ p, q, r }: FlatParams): Term[] => [
  { c: p, a: 2, b: 0 },
  { c: q, a: 1, b: 1 },
  { c: r, a: 0, b: 2 },
];

const linTex = (u: number, v: number): string => xyTex([
  { c: u, a: 1, b: 0 },
  { c: v, a: 0, b: 1 },
]);

const gradientTex = ({ p, q, r }: FlatParams): string =>
  `${DYDX} = -\\frac{${linTex(2 * p, q)}}{${linTex(q, 2 * r)}}`;

function sampleFlat(rng: Rng, difficulty: number): FlatParams {
  const hard = difficulty >= 2;
  for (;;) {
    const p = rng.int(1, hard ? 3 : 2);
    const r = rng.int(1, hard ? 3 : 2);
    const q = rng.pick([1, 2, 3, 4, 6]) * rng.sign();
    const horizontal = rng.chance(0.5);
    const u = rng.int(1, hard ? 3 : 2);
    const params = { p, q, r, horizontal, u };
    if (horizontal ? (2 * p) % q !== 0 : (2 * r) % q !== 0) continue;
    const { slope, S, c } = flatValues(params);
    if (S <= 0 || c > 90) continue;
    // The other part of the gradient must not vanish there too.
    if (horizontal ? q + 2 * r * slope === 0 : 2 * p * slope + q === 0) continue;
    return params;
  }
}

/** v = (top / bottom) w, as the learner reads it. */
function lineTex(v: string, w: string, top: number, bottom: number): string {
  const m = fracTex(top, bottom);
  return m === '1' ? `${v} = ${w}` : m === '-1' ? `${v} = -${w}` : m === '0' ? `${v} = 0` : `${v} = ${m}${w}`;
}

function flatSolution(params: FlatParams): SolutionStep[] {
  const { p, q, r, horizontal, u } = params;
  const { slope, S, c, point } = flatValues(params);
  const [v, w] = horizontal ? ['y', 'x'] : ['x', 'y'];
  return [
    { text: 'The gradient of this curve is', tex: gradientTex(params) },
    {
      text: horizontal ? 'Horizontal: the top is zero.' : 'Vertical: the bottom is zero.',
      tex: `${horizontal ? linTex(2 * p, q) : linTex(q, 2 * r)} = 0`,
    },
    { tex: lineTex(v, w, slope, 1) },
    { text: `Put it into the curve's equation.`, tex: `${coef(S)}${w}^{2} = ${c}` },
    { tex: `${w} = \\pm ${u}` },
    { text: `So the points are $${pair(...point)}$ and $${pair(-point[0] + 0, -point[1] + 0)}$.` },
  ];
}

const lineKeys = (w: string): KeypadKey[] => [spaced(w), ...OPERATOR_KEYS];

/**
 * The line through the origin that the horizontal (or vertical) tangents lie
 * on: the top (or bottom) of the gradient set to zero.
 */
const iskFlatLine: Generator<FlatParams> = {
  id: 'isk-flat-line',
  sample: sampleFlat,
  choices: (params) => {
    const { p, q, r, horizontal } = params;
    const [v, w] = horizontal ? ['y', 'x'] : ['x', 'y'];
    const right: [number, number] = horizontal ? [-2 * p, q] : [-2 * r, q];
    const candidates: [number, number][] = horizontal
      ? [
          [2 * p, q],
          [-q, 2 * r],
          [-p, q],
          [-q, 2 * p],
          [q, 2 * r],
        ]
      : [
          [2 * r, q],
          [-q, 2 * p],
          [-r, q],
          [-q, 2 * r],
          [q, 2 * p],
        ];
    const same = ([a, b]: [number, number], [c, d]: [number, number]) => a * d === b * c;
    const kept: [number, number][] = [];
    for (const cand of candidates) {
      if (same(cand, right) || kept.some((k) => same(k, cand))) continue;
      kept.push(cand);
    }
    const asOption = ([top, bottom]: [number, number]) => ({
      tex: lineTex(v, w, top, bottom),
      answer: `(${top})/(${bottom})*${w}`,
    });
    return steered(options(asOption(right), ...kept.slice(0, 3).map(asOption)), mix(p, q, r, horizontal ? 1 : 0), kept.slice(3).map(asOption));
  },
  render: (params): Slide => {
    const { horizontal, slope } = { ...params, ...flatValues(params) };
    const [v, w] = horizontal ? ['y', 'x'] : ['x', 'y'];
    return {
      kind: 'expression',
      prompt: [
        prose('On this curve'),
        display(`${xyTex(flatTerms(params))} = ${flatValues(params).c}`),
        prose(
          `the ${horizontal ? 'horizontal' : 'vertical'} tangents touch it on one straight line through the origin. Which line?`,
        ),
      ],
      lead: `${v} =`,
      keypad: lineKeys(w),
      answer: `(${slope})*${w}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => flatSolution(params).slice(0, 3),
};

/**
 * Substituting the line into the curve as a tree: the square's multiplier
 * from the xy term and from the other squared term, their total with the
 * first, then the square and the coordinate.
 */
const iskSubTree: Generator<FlatParams> = {
  id: 'isk-sub-tree',
  sample: sampleFlat,
  render: (params): Slide => {
    const { p, q, r, horizontal, u } = params;
    const { slope, first, second, S, c } = flatValues(params);
    const [v, w] = horizontal ? ['y', 'x'] : ['x', 'y'];
    const inside = `${coef(slope)}${w}`;
    const qPart = `${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}`;
    const expression = horizontal
      ? `${coef(p)}x^{2} ${qPart}x(${inside}) + ${coef(r)}(${inside})^{2} = ${c}`
      : `${coef(p)}(${inside})^{2} ${qPart}(${inside})y + ${coef(r)}y^{2} = ${c}`;
    const answer = horizontal ? [first, second, S, u * u, u] : [first, second, S, u * u, u];
    return {
      kind: 'tree',
      prompt: [
        prose(`The ${horizontal ? 'horizontal' : 'vertical'} tangents of`),
        display(`${xyTex(flatTerms(params))} = ${c}`),
        prose(
          `lie on $${lineTex(v, w, slope, 1)}$. Putting that in gives the line below. Top row: the $${w}^{2}$ from the ${horizontal ? '$xy$ term and the $y^{2}$ term' : '$x^{2}$ term and the $xy$ term'}. Then the total number of $${w}^{2}$, then $${w}^{2}$, then the positive $${w}$.`,
        ),
      ],
      expression,
      nodes: [
        { id: 'one', from: [] },
        { id: 'two', from: [] },
        { id: 'S', from: ['one', 'two'] },
        { id: 'sq', from: ['S'] },
        { id: 'w', from: ['sq'] },
      ],
      bank: treeBank(answer, [-first, -second, S - (horizontal ? p : r), c, -u, 2 * u]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { p, r, horizontal } = params;
    const { first, second, S, c } = flatValues(params);
    const w = horizontal ? 'x' : 'y';
    const own = horizontal ? p : r;
    return unrepeated([
      {
        text: `Multiply out each term: they give $${coef(first)}${w}^{2}$ and $${coef(second)}${w}^{2}$.`,
        tex: horizontal
          ? `${own} ${signed(first)} ${signed(second)} = ${S}`
          : `${first} ${signed(second)} ${signed(own)} = ${S}`,
      },
      { tex: `${coef(S)}${w}^{2} = ${c}` },
      { tex: `${w}^{2} = ${c / S}` },
      { tex: `${w} = ${Math.sqrt(c / S)}` },
    ]);
  },
};

/** The tangent point on the positive side, placed as a pair. */
const iskFlatPoints: Generator<FlatParams> = {
  id: 'isk-flat-points',
  sample: sampleFlat,
  choices: (params) => {
    const { p, q, r, u } = params;
    const { point, slope, c } = flatValues(params);
    const [X, Y] = point;
    const onCurve = ([x, y]: [number, number]) => xyAt(flatTerms(params), x, y) === c;
    const wrong: [number, number][] = [
      [X, -Y],
      [Y, X],
      [-Y, -X],
      [u, slope],
      [X + 1, Y],
      [X, Y + 1],
    ].filter(
      ([x, y], i, all) =>
        (x !== X || y !== Y) && !onCurve([x, y]) && all.findIndex(([s, t]) => s === x && t === y) === i,
    ) as [number, number][];
    const asOption = ([x, y]: [number, number]) => ({ tex: pair(x, y) });
    return steered(options(asOption([X, Y]), ...wrong.slice(0, 3).map(asOption)), mix(p, q, r, u), wrong.slice(3).map(asOption));
  },
  render: (params): Slide => {
    const { horizontal, u } = params;
    const { point, slope, c } = flatValues(params);
    const [X, Y] = point;
    return {
      kind: 'tiles',
      prompt: [
        prose('This curve'),
        display(`${xyTex(flatTerms(params))} = ${c}`),
        prose('has gradient'),
        display(gradientTex(params)),
        prose(
          horizontal
            ? 'Find the point with $x > 0$ where its tangent is horizontal.'
            : 'Find the point with $y > 0$ where its tangent is vertical.',
        ),
      ],
      template: '({0}, {1})',
      bank: numberBank([X, Y], [-X, -Y, slope, u * u, c]),
      answer: [`${X}`, `${Y}`],
    };
  },
  solution: flatSolution,
};

/* ---------- Putting a sketch together ---------- */

export interface MatchParams {
  /** The curve drawn or named, first; then the three others offered. */
  conics: Conic[];
  /** Where the answer sits among the four, in the order shown. */
  slot: number;
}

/** The curve, and three others that differ from it in a way a sketch shows. */
function sampleMatch(rng: Rng): Conic[] {
  for (;;) {
    const shape = rng.pick(['circle', 'ellipse', 'hyperbola', 'parabola'] as const);
    const a = rng.int(2, 5);
    const b = rng.int(2, 5);
    const k = rng.int(1, 4) * rng.sign();
    if (a === b) continue;
    switch (shape) {
      case 'circle':
        return [
          { shape, r: a },
          { shape, r: b },
          { shape: 'ellipse', a, b },
          { shape: 'hyperbola', a, b },
        ];
      case 'ellipse':
        return [
          { shape, a, b },
          { shape, a: b, b: a },
          { shape: 'circle', r: a },
          { shape: 'hyperbola', a, b },
        ];
      case 'hyperbola':
        return [
          { shape, a, b },
          { shape, a: b, b: a },
          { shape: 'ellipse', a, b },
          { shape: 'parabola', k, axis: 'x' },
        ];
      case 'parabola':
        return [
          { shape, k, axis: 'x' },
          { shape, k: -k, axis: 'x' },
          { shape, k, axis: 'y' },
          rng.chance(0.5) ? { shape: 'ellipse', a, b } : { shape: 'hyperbola', a, b },
        ];
    }
  }
}

/** The four in the order shown: the answer moved to `slot`, the rest in turn. */
export function shown({ conics, slot }: MatchParams): Conic[] {
  const [answer, ...rest] = conics;
  return [...rest.slice(0, slot), answer, ...rest.slice(slot)];
}

function matchSample(rng: Rng): MatchParams {
  const conics = sampleMatch(rng);
  const slot = mix(...conics.map((c) => (c.shape === 'parabola' ? c.k * 7 : c.shape === 'circle' ? c.r : c.a * 10 + c.b))) % 4;
  return { conics, slot };
}

/** Why a sketch is the curve: symmetry, crossings, extent. */
function matchSolution({ conics }: MatchParams): SolutionStep[] {
  const c = conics[0];
  const tex = conicTex(c);
  switch (c.shape) {
    case 'circle':
      return [
        { text: 'Only squares appear, so it is symmetric in both axes.', tex },
        { text: 'Put $y = 0$, then $x = 0$.', tex: `x = \\pm ${c.r} \\qquad y = \\pm ${c.r}` },
        { text: `The same distance, $${c.r}$, in every direction from the origin: a circle.` },
      ];
    case 'ellipse':
      return [
        { text: 'Only squares appear, so it is symmetric in both axes.', tex },
        { text: 'Put $y = 0$, then $x = 0$.', tex: `x = \\pm ${c.a} \\quad y = \\pm ${c.b}` },
        { text: `An oval, ${c.a > c.b ? 'wider than it is tall' : 'taller than it is wide'}: $${betweenTex('x', c.a)}$ and $${betweenTex('y', c.b)}$.` },
      ];
    case 'hyperbola':
      return [
        { text: 'Only squares appear, so it is symmetric in both axes.', tex },
        { text: 'Put $y = 0$: it meets the $x$-axis here.', tex: `x = \\pm ${c.a}` },
        { text: 'Put $x = 0$: $y^{2}$ would be negative, so it never meets the $y$-axis.' },
        {
          text: `And $\\frac{x^{2}}{${c.a * c.a}} = 1 + \\frac{y^{2}}{${c.b * c.b}} \\ge 1$, so nothing lies between: two branches, opening left and right.`,
        },
      ];
    case 'parabola':
      return [
        { text: 'Only $y$ is squared, so it is symmetric in the $x$-axis only.', tex },
        { text: 'Put $y = 0$: it meets the axes only at the origin.' },
        {
          text: `$x = \\frac{y^{2}}{${c.k}}$ and $y^{2} \\ge 0$, so $x ${c.k > 0 ? '\\ge' : '\\le'} 0$: it opens to the ${c.k > 0 ? 'right' : 'left'}.`,
        },
      ];
  }
}

/** A sketch, and the equation it shows. */
const iskMatch: Generator<MatchParams> = {
  id: 'isk-match',
  sample: (rng) => matchSample(rng),
  render: (params): Slide => {
    const four = shown(params);
    return {
      kind: 'choice',
      prompt: [prose('Which equation does this sketch show?'), diagram(sketchSvg(params.conics[0]))],
      options: four.map((c, i) => ({ id: `eq${i}`, label: conicTex(c), tex: true })),
      correctId: `eq${params.slot}`,
    };
  },
  solution: matchSolution,
};

/** An equation, and the sketch among four that shows it. */
const iskMatchSketch: Generator<MatchParams> = {
  id: 'isk-match-sketch',
  sample: (rng) => matchSample(rng),
  render: (params): Slide => ({
    kind: 'choice',
    prompt: [prose('Which sketch shows this curve?'), display(conicTex(params.conics[0])), diagram(sketchGridSvg(shown(params)))],
    options: GRID_LETTERS.map((letter) => ({ id: letter, label: `Sketch ${letter}` })),
    correctId: GRID_LETTERS[params.slot],
  }),
  solution: matchSolution,
};

export interface SketchFlowParams {
  conic: Conic;
}

/**
 * A sketch built one fact at a time: symmetry, where it meets the x-axis,
 * which x it reaches, then which shape that makes. Every wrong branch ends
 * on the fact about this curve that rules it out.
 */
const iskSketchFlow: Generator<SketchFlowParams> = {
  id: 'isk-sketch-flow',
  sample: (rng) => {
    for (;;) {
      const shape = rng.pick(['circle', 'ellipse', 'hyperbola', 'parabola'] as const);
      const a = rng.int(2, 6);
      const b = rng.int(2, 6);
      if (a === b && shape !== 'circle') continue;
      const conic: Conic =
        shape === 'circle'
          ? { shape, r: a }
          : shape === 'parabola'
            ? { shape, k: rng.int(1, 6) * rng.sign(), axis: 'x' }
            : { shape, a, b };
      return { conic };
    }
  },
  render: ({ conic }): Slide => {
    const tex = conicTex(conic);
    const salt = mix(
      conic.shape.length,
      conic.shape === 'parabola' ? conic.k : conic.shape === 'circle' ? conic.r : conic.a * 10 + conic.b,
    );
    const isParabola = conic.shape === 'parabola';
    const a = conic.shape === 'circle' ? conic.r : conic.shape === 'parabola' ? 0 : conic.a;
    const k = conic.shape === 'parabola' ? conic.k : 1;

    const symRight = isParabola ? 'The $x$-axis only' : 'Both axes';
    const symFact = isParabola
      ? '$x$ is not squared, so replacing $x$ with $-x$ changes the equation: no symmetry in the $y$-axis. $y$ appears only squared, so there is symmetry in the $x$-axis.'
      : '$x$ and $y$ appear only squared, so replacing either with its negative leaves the equation the same: symmetric in both axes.';
    const symBranches = ['Both axes', 'The $x$-axis only', 'The $y$-axis only'].map((label) =>
      label === symRight ? { label, to: 'meet' } : { label, outcome: symFact },
    );

    const meetRight = isParabola ? 'At the origin only' : `At $x = \\pm ${a}$`;
    const meetFact = isParabola
      ? 'Put $y = 0$: then $x = 0$, so it meets the $x$-axis only at the origin.'
      : conic.shape === 'circle'
        ? `Put $y = 0$: $x^{2} = ${a * a}$, so $x = \\pm ${a}$.`
        : `Put $y = 0$: $\\frac{x^{2}}{${a * a}} = 1$, so $x = \\pm ${a}$.`;
    const meetLabels = isParabola
      ? ['At the origin only', `At $x = \\pm ${Math.abs(k)}$`, 'It never meets it']
      : [`At $x = \\pm ${a}$`, `At $x = \\pm ${a * a}$`, 'At the origin only'];
    const meetBranches = meetLabels.map((label) => (label === meetRight ? { label, to: 'reach' } : { label, outcome: meetFact }));

    const between = `$${betweenTex('x', a || 2)}$`;
    const outside = `$x \\le ${-(a || 2)}$ or $x \\ge ${a || 2}$`;
    const side = isParabola ? `$x ${k > 0 ? '\\ge' : '\\le'} 0$` : '$x \\ge 0$';
    const reachRight =
      conic.shape === 'hyperbola' ? outside : isParabola ? side : between;
    const reachFact =
      conic.shape === 'hyperbola'
        ? `$\\frac{x^{2}}{${a * a}} = 1 + \\frac{y^{2}}{${conic.b * conic.b}}$, which is at least $1$, so $x^{2} \\ge ${a * a}$.`
        : conic.shape === 'ellipse'
          ? `$\\frac{x^{2}}{${a * a}} = 1 - \\frac{y^{2}}{${conic.b * conic.b}}$, which is at most $1$, so $x^{2} \\le ${a * a}$.`
          : conic.shape === 'circle'
            ? `$x^{2} = ${a * a} - y^{2}$, which is at most $${a * a}$, so $x^{2} \\le ${a * a}$.`
            : `$x = \\frac{y^{2}}{${k}}$ and $y^{2} \\ge 0$, so $x ${k > 0 ? '\\ge' : '\\le'} 0$.`;
    const reachLabels = isParabola
      ? [side, `$${betweenTex('x', Math.abs(k))}$`, `$x ${k > 0 ? '\\le' : '\\ge'} 0$`]
      : [between, outside, side];
    const reachBranches = reachLabels.map((label) => (label === reachRight ? { label, to: 'shape' } : { label, outcome: reachFact }));

    const closed = conic.shape === 'circle' || conic.shape === 'ellipse';
    const shapeFact = (chosen: Conic['shape']): string => {
      if (chosen === 'circle') {
        return conic.shape === 'ellipse'
          ? `A circle has equal numbers under $x^{2}$ and $y^{2}$; here they are $${conic.a * conic.a}$ and $${conic.b * conic.b}$.`
          : 'A circle is closed, but this curve runs off for ever.';
      }
      if (chosen === 'ellipse') {
        return conic.shape === 'circle'
          ? `The numbers under $x^{2}$ and $y^{2}$ are equal, so it is a circle of radius $${a}$.`
          : 'An ellipse is closed, but this curve runs off for ever.';
      }
      if (chosen === 'hyperbola') {
        return closed
          ? 'It is closed: both $x$ and $y$ stay between bounds, so nothing runs off in branches.'
          : 'A hyperbola has two branches; this curve is one piece, all on one side of the $y$-axis.';
      }
      return closed
        ? 'A parabola runs off for ever; this curve stays between bounds.'
        : `It meets the $x$-axis twice, at $x = \\pm ${a}$, with nothing between: two branches, not one.`;
    };
    const shapeBranches = (['circle', 'ellipse', 'hyperbola', 'parabola'] as const).map((s) =>
      s === conic.shape
        ? { label: SHAPE_WORDS[s], outcome: `It is ${SHAPE_WORDS[s].toLowerCase()}.` }
        : { label: SHAPE_WORDS[s], outcome: shapeFact(s) },
    );

    return {
      kind: 'flow',
      prompt: [prose('Build a sketch of this curve one fact at a time.'), display(tex)],
      subject: tex,
      steps: [
        { id: 'sym', ask: 'Which axes is it symmetric in?', branches: turned(symBranches, salt % 3) },
        { id: 'meet', ask: 'Where does it meet the $x$-axis?', branches: turned(meetBranches, (salt >>> 2) % 3) },
        { id: 'reach', ask: 'Which values of $x$ does it reach?', branches: turned(reachBranches, (salt >>> 4) % 3) },
        { id: 'shape', ask: 'So the sketch is', branches: turned(shapeBranches, (salt >>> 6) % 4) },
      ],
      answer: [symRight, meetRight, reachRight, SHAPE_WORDS[conic.shape]],
    };
  },
  solution: ({ conic }) => matchSolution({ conics: [conic], slot: 0 }),
};

export const implicitSketchGenerators = [
  iskSymmetry,
  iskSymmetryFlow,
  iskMirrorPoint,
  iskIntercepts,
  iskMeetFlow,
  iskAxisCount,
  iskBounds,
  iskFurthest,
  iskGapLine,
  iskFlatLine,
  iskSubTree,
  iskFlatPoints,
  iskMatch,
  iskMatchSketch,
  iskSketchFlow,
] as Generator<unknown>[];

