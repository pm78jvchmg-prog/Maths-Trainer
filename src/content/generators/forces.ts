/**
 * Forces and Newton's Laws generators.
 *
 * Every number a learner is asked for is exact. Two things make that possible
 * with forces at angles and g = 9.8:
 *
 * - Angles come from Pythagorean triples. An angle with tan = 3/4 has sine 0.6
 *   and cosine 0.8, one with tan = 7/24 has 0.28 and 0.96, so resolving a
 *   force, or a weight on a slope, gives a terminating decimal. No question
 *   ever needs a rounded sine.
 * - Magnitudes come from a table of triples (PITFALLS 3.11), never from
 *   `Math.hypot` rounded back to a whole number. `forces.test.ts` recomputes
 *   every answer with `Math.hypot`, `Math.atan2` and `m * a` of its own, which
 *   is what makes the table a check rather than a copy.
 *
 * Where a quotient could fail to terminate (a tension over a cosine of 0.6, an
 * acceleration over a total mass of 3), the draw is repeated until it does, at
 * four decimal places. Values are written by `fmt`, so there is no float dust.
 *
 * A vector answer, and anything else that asks for a form (both components, an
 * equation of motion), goes through tiles, a tree, a table or a choice: the
 * checker compares values (PITFALLS 3.4), so `expression` is kept for a single
 * number. Units live in the prose, never in a template or a readout.
 *
 * The force-diagram widget is a separate batch. Nothing here depends on it:
 * the pictures are plain SVG from `arrowsSvg` below, drawn in prompts and teach
 * slides as diagram blocks.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg, vectorSvg } from '../figures';
import { fmt } from './numericalMethods';
import { mix, stepBank, steered } from './parametricImplicit';

/* ================================================================
 * Shared helpers
 * ================================================================ */

/** g, in m s^-2. Stated in the prose of every question that uses it. */
export const G = 9.8;

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });
const picture = (svg: string): Block => ({ kind: 'diagram', svg });

const G_NOTE = 'Take $g = 9.8\\text{ m s}^{-2}$.';
const ACC = '\\text{ m s}^{-2}';

/** Lines of working stacked in one display and aligned on their `&`. */
const aligned = (...lines: string[]): string => `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;

/** Whether a value is an exact decimal of at most `dp` places. */
export function exact(value: number, dp = 4): boolean {
  const scaled = value * 10 ** dp;
  return Number.isFinite(value) && Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** `+ 3` or `- 3`: a number following another term. */
export const signed = (v: number): string => (v < 0 ? `- ${fmt(-v)}` : `+ ${fmt(v)}`);

/**
 * A number standing first. A negative is spelled the way `signed` spells it,
 * since TeX draws `-3` and `- 3` alike and a bank holding both would show two
 * identical tiles.
 */
export const bare = (v: number): string => (v < 0 ? signed(v) : fmt(v));

/** A number after an operator: negatives are bracketed. */
const paren = (v: number): string => (v < 0 ? `(${fmt(v)})` : fmt(v));

/** A square, bracketed when negative. */
const sq = (v: number): string => `${paren(v)}^{2}`;

/** `a i + b j` as the learner reads it. */
export function ijTex(a: number, b: number): string {
  const coef = (v: number) => (v === 1 ? '' : v === -1 ? '-' : fmt(v));
  const i = a === 0 ? '' : `${coef(a)}\\mathbf{i}`;
  if (b === 0) return i || '0';
  const size = Math.abs(b) === 1 ? '' : fmt(Math.abs(b));
  if (!i) return `${b < 0 ? '-' : ''}${size}\\mathbf{j}`;
  return `${i} ${b < 0 ? '-' : '+'} ${size}\\mathbf{j}`;
}

/** A force in newtons, bracketed: `(3\mathbf{i} - 4\mathbf{j})\text{ N}`. */
const forceTex = (a: number, b: number): string => `(${ijTex(a, b)})\\text{ N}`;

/** A nonzero whole number in `[lo, hi]` by size, either sign. */
function sizeSign(rng: Rng, lo: number, hi: number): number {
  return rng.int(lo, hi) * rng.sign();
}

/** The same draw again until it passes: every sampler here is a rejection loop. */
function until<T>(draw: () => T, ok: (value: T) => boolean): T {
  for (let i = 0; i < 10_000; i += 1) {
    const value = draw();
    if (ok(value)) return value;
  }
  throw new Error('forces: no draw passed its filter');
}

/* ---------- Angles ---------- */

/**
 * An angle from a right-angled triangle with whole sides: opposite, adjacent
 * and hypotenuse. Its sine, cosine and tangent are then exact fractions, and
 * with these four the sine and cosine are exact decimals too.
 */
export interface Angle {
  o: number;
  a: number;
  h: number;
}

export const A34: Angle = { o: 3, a: 4, h: 5 };
export const A43: Angle = { o: 4, a: 3, h: 5 };
export const A724: Angle = { o: 7, a: 24, h: 25 };
export const A247: Angle = { o: 24, a: 7, h: 25 };

export const sinOf = (t: Angle): number => t.o / t.h;
export const cosOf = (t: Angle): number => t.a / t.h;

/**
 * What the learner is told about the angle. The easy form hands over the sine
 * and the cosine; the hard form gives only the tangent, so the learner draws
 * the triangle themselves.
 */
function angleFacts(t: Angle, hard: boolean, sym = '\\alpha'): string {
  return hard
    ? `$\\tan${sym} = \\tfrac{${t.o}}{${t.a}}$`
    : `$\\sin${sym} = ${fmt(sinOf(t))}$ and $\\cos${sym} = ${fmt(cosOf(t))}$`;
}

/** The solution line that turns a tangent into a sine and a cosine. */
function angleStep(t: Angle, hard: boolean, sym = '\\alpha'): SolutionStep[] {
  if (!hard) return [];
  return [
    {
      text: `A triangle with opposite $${t.o}$ and adjacent $${t.a}$ has hypotenuse $${t.h}$, so $\\sin${sym} = \\tfrac{${t.o}}{${t.h}} = ${fmt(sinOf(t))}$ and $\\cos${sym} = \\tfrac{${t.a}}{${t.h}} = ${fmt(cosOf(t))}$.`,
    },
  ];
}

/* ---------- Pythagorean triples ---------- */

const PRIMITIVE: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [12, 35, 37],
  [9, 40, 41],
  [28, 45, 53],
  [11, 60, 61],
];

/** Every multiple of a primitive triple with hypotenuse up to `most`. */
function triplesUpTo(most: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const [p, q, r] of PRIMITIVE) {
    for (let k = 1; k * r <= most; k += 1) out.push([k * p, k * q, k * r]);
  }
  return out;
}

/** Legs and hypotenuse. A lookup, not `Math.hypot` rounded back (PITFALLS 3.11). */
export const TRIPLES = triplesUpTo(65);
const EASY_TRIPLES = triplesUpTo(20);

/* ---------- Banks and options ---------- */

/**
 * A bank of numbers for a tree or a table: every answer value (as a multiset),
 * then distinct distractors, topped up from either side of the answers, sorted.
 */
export function valueBank(answer: number[], distractors: number[], spare = 3): string[] {
  const taken = new Set(answer.map(fmt));
  const extras: string[] = [];
  const add = (v: number) => {
    if (!Number.isFinite(v) || extras.length >= spare) return;
    const key = fmt(v);
    if (taken.has(key) || extras.includes(key)) return;
    extras.push(key);
  };
  for (const v of distractors) add(v);
  for (let step = 1; extras.length < spare; step += 1) {
    for (const v of answer) {
      add(v + step);
      add(v - step);
    }
  }
  return [...answer.map(fmt), ...extras].sort((x, y) => Number(x) - Number(y));
}

/** A tiles bank: the answer's tokens, then distinct extras, in a stable order. */
function tileBank(answer: string[], extras: string[], spare = 4): string[] {
  const out = [...answer];
  const seen = new Set(answer);
  for (const token of extras) {
    if (out.length - answer.length >= spare) break;
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out.sort((x, y) => x.localeCompare(y, 'en', { numeric: true }));
}

/**
 * Options for a numeric answer: the slips given, then near misses. A slip
 * that does not terminate is dropped rather than printed to six places, and a
 * negative near miss is never offered for a quantity that cannot be negative.
 */
function valueChoices(correct: number, wrong: number[], salt: number): ChoiceOption[] {
  const seen = new Set([fmt(correct)]);
  const ok = (v: number) => Number.isFinite(v) && exact(v, 4) && !seen.has(fmt(v)) && (correct < 0 || v > 0);
  const picked: number[] = [];
  for (const v of wrong) {
    if (picked.length === 3 || !ok(v)) continue;
    seen.add(fmt(v));
    picked.push(v);
  }
  const unit = Number.isInteger(correct) ? 1 : 0.1;
  const spare: number[] = [];
  for (let step = 1; picked.length + spare.length < 7; step += 1) {
    for (const v of [correct + step * unit, correct - step * unit]) {
      if (!ok(v)) continue;
      seen.add(fmt(v));
      if (picked.length < 3) picked.push(v);
      else spare.push(v);
    }
  }
  const as = (v: number) => ({ tex: fmt(v), answer: fmt(v) });
  return steered(options(as(correct), ...picked.map(as)), salt, spare.map(as));
}

/** The rotation `choiceVariant` gives a derived slide, reused for native ones (PITFALLS 3.10). */
function rotation(opts: ChoiceOption[]): number {
  let hash = 0;
  for (const option of opts) {
    for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % opts.length;
}

/** A multiple-choice slide, its options ordered by a hash of their labels, never shuffled. */
function choiceSlide(prompt: Block[], opts: ChoiceOption[], tex = true): Slide {
  const turn = rotation(opts);
  const ordered = [...opts.slice(turn), ...opts.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/** A typed number: the base keypad already holds the digits, minus and the point. */
function typed(prompt: Block[], lead: string, value: number): Slide {
  return { kind: 'expression', prompt, lead, keypad: [], answer: fmt(value), domain: 'real', mode: 'exact' };
}

/* ================================================================
 * Pictures
 * ================================================================ */

type Pt = [number, number];

export interface Arrow {
  from?: Pt;
  to: Pt;
  /** A letter drawn beyond the head. Plain SVG text: KaTeX cannot go in an SVG. */
  name?: string;
  /** Drawn in the text colour and faint, for a force that is only part of the story. */
  faint?: boolean;
}

/**
 * Arrows on a square, to-scale picture, with an optional grid, surfaces and a
 * particle.
 *
 * Square and unpadded like `vectorSvg`, for the same reason: a slider marker
 * is placed as a fraction of the picture's width, so -span has to sit on the
 * left edge exactly for the marker to line up with an arrow's head.
 */
export function arrowsSvg(
  arrows: Arrow[],
  opts: { span: number; grid?: boolean; axes?: boolean; lines?: [Pt, Pt][]; dot?: Pt; label: string },
): string {
  const { span, grid = false, axes = true } = opts;
  const SIZE = 220;
  const unit = SIZE / (2 * span);
  const X = (v: number) => SIZE / 2 + v * unit;
  const Y = (v: number) => SIZE / 2 - v * unit;
  const f = (v: number) => v.toFixed(1);
  const parts = [`<svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" role="img" aria-label="${opts.label}">`];

  if (grid) {
    for (let i = -span + 1; i <= span - 1; i += 1) {
      parts.push(
        `<line x1="${f(X(i))}" y1="0" x2="${f(X(i))}" y2="${SIZE}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
        `<line x1="0" y1="${f(Y(i))}" x2="${SIZE}" y2="${f(Y(i))}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
      );
    }
  }
  if (axes) {
    parts.push(
      `<line x1="0" y1="${f(Y(0))}" x2="${SIZE}" y2="${f(Y(0))}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
      `<line x1="${f(X(0))}" y1="0" x2="${f(X(0))}" y2="${SIZE}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    );
  }
  for (const [a, b] of opts.lines ?? []) {
    parts.push(
      `<line x1="${f(X(a[0]))}" y1="${f(Y(a[1]))}" x2="${f(X(b[0]))}" y2="${f(Y(b[1]))}" stroke="currentColor" stroke-width="2" stroke-linecap="round" />`,
    );
  }
  if (opts.dot) {
    parts.push(`<circle cx="${f(X(opts.dot[0]))}" cy="${f(Y(opts.dot[1]))}" r="5" fill="currentColor" />`);
  }
  for (const arrow of arrows) {
    const [x0, y0] = arrow.from ?? [0, 0];
    const [x1, y1] = arrow.to;
    if (x0 === x1 && y0 === y1) continue;
    const look = arrow.faint ? 'stroke="currentColor" opacity="0.5"' : 'class="plot-accent" stroke="currentColor"';
    // The screen's y runs downward, hence the minus.
    const angle = Math.atan2(-(y1 - y0), x1 - x0);
    const tipX = X(x1);
    const tipY = Y(y1);
    const head = (turn: number) =>
      `<line x1="${f(tipX)}" y1="${f(tipY)}" x2="${f(tipX - 11 * Math.cos(angle + turn))}" y2="${f(tipY - 11 * Math.sin(angle + turn))}" ${look} stroke-width="2.5" stroke-linecap="round" />`;
    parts.push(
      `<line x1="${f(X(x0))}" y1="${f(Y(y0))}" x2="${f(tipX)}" y2="${f(tipY)}" ${look} stroke-width="2.5" />`,
      head(0.4),
      head(-0.4),
    );
    if (arrow.name) {
      const clamp = (v: number) => Math.min(SIZE - 9, Math.max(9, v));
      parts.push(
        `<text x="${f(clamp(tipX + 14 * Math.cos(angle)))}" y="${f(clamp(tipY + 14 * Math.sin(angle)))}" fill="currentColor" font-size="15" font-style="italic" text-anchor="middle" dominant-baseline="central">${arrow.name}</text>`,
      );
    }
  }
  parts.push('</svg>');
  return parts.join('');
}

/**
 * A particle on a slope rising to the right at the angle `t`, with the forces
 * on it: weight, normal reaction, and optionally friction up the slope and a
 * pull along or across it.
 */
export function slopeSvg(t: Angle, extra: { friction?: boolean; pull?: 'along' | 'across' } = {}): string {
  const c = cosOf(t);
  const s = sinOf(t);
  const low: Pt = [-5.2 * c, -5.2 * s];
  const high: Pt = [5.2 * c, 5.2 * s];
  const arrows: Arrow[] = [
    { to: [0, -3.6], name: 'W' },
    { to: [-3 * s, 3 * c], name: 'R' },
  ];
  if (extra.friction) arrows.push({ to: [-2.4 * c, -2.4 * s], name: 'F', faint: true });
  if (extra.pull === 'along') arrows.push({ to: [3 * c, 3 * s], name: 'P' });
  if (extra.pull === 'across') arrows.push({ to: [3.2, 0], name: 'P' });
  return arrowsSvg(arrows, {
    span: 6,
    axes: false,
    lines: [
      [low, high],
      [low, [high[0], low[1]]],
    ],
    dot: [0, 0],
    label: 'A particle on a slope, with its weight straight down and the normal reaction at right angles to the slope',
  });
}

/** A particle hanging on a string held aside by a horizontal force. */
export function hangingSvg(t: Angle): string {
  const s = sinOf(t);
  const c = cosOf(t);
  const top: Pt = [-4.6 * s, 4.6 * c];
  return arrowsSvg(
    [
      { to: [-2.8 * s, 2.8 * c], name: 'T' },
      { to: [3.2, 0], name: 'P' },
      { to: [0, -3.4], name: 'W' },
    ],
    {
      span: 5,
      axes: false,
      lines: [
        [top, [0, 0]],
        [
          [top[0] - 1.6, top[1]],
          [top[0] + 1.6, top[1]],
        ],
      ],
      dot: [0, 0],
      label: 'A particle on a string from a ceiling, pulled sideways by a horizontal force, with its weight straight down',
    },
  );
}

/* ================================================================
 * Level 1, lesson 1: a force as a vector
 * ================================================================ */

interface MagnitudeParams {
  a: number;
  b: number;
  r: number;
  find: 'r' | 'a';
}

/** Expression: the magnitude of a i + b j, or, run backwards, a missing component. */
const magnitude: Generator<MagnitudeParams> = {
  id: 'force-magnitude',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [p, q, r] = rng.pick(hard ? TRIPLES.filter(([, , h]) => h > 20) : EASY_TRIPLES);
    const [x, y] = rng.chance(0.5) ? [p, q] : [q, p];
    return { a: x * rng.sign(), b: y * rng.sign(), r, find: hard && rng.chance(0.6) ? 'a' : 'r' };
  },
  render: ({ a, b, r, find }) =>
    find === 'r'
      ? typed([say(`A force $\\mathbf{F} = ${forceTex(a, b)}$. Find its magnitude, in newtons.`)], '|\\mathbf{F}| =', r)
      : typed(
          [
            say(
              `The force $\\mathbf{F} = (p\\mathbf{i} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\mathbf{j})\\text{ N}$ has magnitude $${r}\\text{ N}$, and $p ${a < 0 ? '<' : '>'} 0$. Find $p$.`,
            ),
          ],
          'p =',
          a,
        ),
  solution: ({ a, b, r, find }) =>
    find === 'r'
      ? [
          { text: 'The components are at right angles, so Pythagoras gives the magnitude:' },
          { tex: `|\\mathbf{F}| = \\sqrt{${sq(a)} + ${sq(b)}} = \\sqrt{${a * a + b * b}} = ${r}` },
        ]
      : [
          { text: 'Pythagoras, run backwards:' },
          { tex: `p^{2} + ${sq(b)} = ${r}^{2}` },
          { tex: `p^{2} = ${r * r} - ${b * b} = ${a * a}` },
          { text: `So $p = \\pm ${Math.abs(a)}$, and $p ${a < 0 ? '<' : '>'} 0$ leaves $p = ${a}$.` },
        ],
  choices: ({ a, b, r, find }) =>
    find === 'r'
      ? valueChoices(r, [Math.abs(a) + Math.abs(b), a * a + b * b, Math.abs(Math.abs(a) - Math.abs(b))], mix(a, b, r))
      : valueChoices(a, [-a, (r - Math.abs(b)) * Math.sign(a), (r * r - b * b) * Math.sign(a)], mix(a, b, r, 1)),
};

interface IjTilesParams {
  a: number;
  b: number;
  x0: number;
  y0: number;
}

const IJ_TEMPLATE = '\\mathbf{F} = ({0}\\mathbf{i} {1}\\mathbf{j})';

/** Tiles: a force drawn on squared paper, written in i, j form. */
const ijTiles: Generator<IjTilesParams> = {
  id: 'force-ij-tiles',
  sample: (rng, difficulty) => {
    if (difficulty < 2) return { a: sizeSign(rng, 2, 5), b: sizeSign(rng, 2, 5), x0: 0, y0: 0 };
    return until(
      () => ({ a: sizeSign(rng, 2, 6), b: sizeSign(rng, 2, 6), x0: rng.int(-5, 5), y0: rng.int(-5, 5) }),
      ({ a, b, x0, y0 }) => (x0 !== 0 || y0 !== 0) && Math.abs(x0 + a) <= 6 && Math.abs(y0 + b) <= 6,
    );
  },
  render: ({ a, b, x0, y0 }) => {
    const moved = x0 !== 0 || y0 !== 0;
    const answer = [bare(a), signed(b)];
    const extras = [bare(b), signed(a), bare(-a), signed(-b)];
    if (moved) extras.unshift(bare(x0 + a), signed(y0 + b));
    return {
      kind: 'tiles',
      prompt: [
        say(
          moved
            ? 'The force acts along the arrow, from its tail to its head, and the arrow does not start at the origin. Write the force in $\\mathbf{i}$, $\\mathbf{j}$ form. Each square is $1\\text{ N}$.'
            : 'Write the force drawn in $\\mathbf{i}$, $\\mathbf{j}$ form. Each square is $1\\text{ N}$.',
        ),
        picture(
          arrowsSvg([{ from: [x0, y0], to: [x0 + a, y0 + b] }], {
            span: 7,
            grid: true,
            label: 'A force drawn as an arrow on squared paper',
          }),
        ),
      ],
      template: IJ_TEMPLATE,
      bank: tileBank(answer, extras),
      answer,
    };
  },
  solution: ({ a, b, x0, y0 }) => [
    {
      text: `Count squares from the tail to the head: $${Math.abs(a)}$ to the ${a < 0 ? 'left' : 'right'} and $${Math.abs(b)}$ ${b < 0 ? 'down' : 'up'}.${x0 !== 0 || y0 !== 0 ? ' Where the arrow starts makes no difference.' : ''}`,
    },
    { tex: `\\mathbf{F} = ${forceTex(a, b)}` },
  ],
};

interface DirectionParams {
  a: number;
  b: number;
}

/** Degrees, to one decimal place. */
const deg1 = (radians: number): number => Math.round(((radians * 180) / Math.PI) * 10) / 10;
const degTex = (v: number): string => `${fmt(v)}^{\\circ}`;

/** Choice: the angle between a i + b j and the unit vector i. */
const direction: Generator<DirectionParams> = {
  id: 'force-direction',
  sample: (rng, difficulty) =>
    until(
      () =>
        difficulty < 2
          ? { a: rng.int(1, 8), b: rng.int(1, 8) }
          : { a: sizeSign(rng, 1, 8), b: sizeSign(rng, 1, 8) },
      ({ a, b }) => Math.abs(a) !== Math.abs(b) && (difficulty < 2 || a < 0 || b < 0),
    ),
  render: ({ a, b }) => {
    const acute = Math.atan(Math.abs(b) / Math.abs(a));
    const theta = a > 0 ? acute : Math.PI - acute;
    const right = deg1(theta);
    const wrong = [deg1(Math.PI / 2 - acute), deg1(Math.PI - theta), deg1(Math.PI / 2 + acute), deg1(acute)];
    return choiceSlide(
      [
        say(
          `$\\mathbf{F} = ${forceTex(a, b)}$. Find the angle between $\\mathbf{F}$ and the unit vector $\\mathbf{i}$, to one decimal place.`,
        ),
        picture(vectorSvg(a, b, { span: 9, label: 'The force drawn from the origin' })),
      ],
      options({ tex: degTex(right) }, ...wrong.map((v) => ({ tex: degTex(v) }))),
    );
  },
  solution: ({ a, b }) => {
    const acute = deg1(Math.atan(Math.abs(b) / Math.abs(a)));
    const steps: SolutionStep[] = [
      { text: `Draw the right-angled triangle under the arrow: $${Math.abs(a)}$ along and $${Math.abs(b)}$ ${b < 0 ? 'down' : 'up'}.` },
      { tex: `\\tan\\phi = \\frac{${Math.abs(b)}}{${Math.abs(a)}}, \\quad \\phi = ${degTex(acute)}` },
    ];
    if (a < 0) {
      steps.push({
        text: `That is the angle with $-\\mathbf{i}$, since the force points left. The angle with $\\mathbf{i}$ is $180^{\\circ} - ${degTex(acute)} = ${degTex(deg1(Math.PI - Math.atan(Math.abs(b) / Math.abs(a))))}$.`,
      });
    } else if (b < 0) {
      steps.push({ text: 'The force points below $\\mathbf{i}$, but the angle between them is the same size.' });
    }
    return steps;
  },
};

interface ComponentSliderParams {
  x: number;
  y: number;
  ask: 'i' | 'j';
  /** For the hard form: the magnitude and the angle it was built from. */
  mag: number;
  t: Angle;
}

/** Slider: the i or j component of a force, drawn to scale. */
const componentSlider: Generator<ComponentSliderParams> = {
  id: 'force-component-slider',
  sample: (rng, difficulty) => {
    const ask = rng.pick<'i' | 'j'>(['i', 'j']);
    if (difficulty < 2) return { x: sizeSign(rng, 1, 6), y: sizeSign(rng, 1, 6), ask, mag: 0, t: A34 };
    const k = rng.int(1, 3);
    const t = rng.pick([A34, A43]);
    const mag = 5 * k;
    return { x: rng.sign() * mag * cosOf(t), y: rng.sign() * mag * sinOf(t), ask, mag, t };
  },
  render: ({ x, y, ask, mag, t }) => {
    const hard = mag > 0;
    const span = hard ? 16 : 7;
    const where = `${y < 0 ? 'down' : 'up'} and to the ${x < 0 ? 'left' : 'right'}`;
    return {
      kind: 'slider',
      prompt: [
        say(
          hard
            ? `A force of $${mag}\\text{ N}$ acts ${where}, at an angle $\\alpha$ to the horizontal, where ${angleFacts(t, false)}. Slide the line to its $\\mathbf{${ask}}$ component, in newtons, with right and up positive.`
            : `Slide the line to the $\\mathbf{${ask}}$ component of the force drawn, in newtons. Each square is $1\\text{ N}$.`,
        ),
      ],
      min: -(span - 1),
      max: span - 1,
      step: hard ? 1 : 0.5,
      answer: ask === 'i' ? x : y,
      readout: `\\mathbf{${ask}}\\text{ component} = {v}`,
      figure: {
        svg: arrowsSvg([{ to: [x, y] }], { span, grid: !hard, label: 'A force drawn from the origin' }),
        xMin: -span,
        xMax: span,
        axis: ask === 'i' ? 'x' : 'y',
      },
    };
  },
  solution: ({ x, y, ask, mag, t }) => {
    const value = ask === 'i' ? x : y;
    if (mag === 0) {
      return [{ text: `Count the squares ${ask === 'i' ? 'across' : 'up or down'} from the tail to the head: the $\\mathbf{${ask}}$ component is $${fmt(value)}$.` }];
    }
    const trig = ask === 'i' ? '\\cos' : '\\sin';
    return [
      { text: `The ${ask === 'i' ? 'horizontal' : 'vertical'} side of the triangle is $${mag}${trig}\\alpha$:` },
      { tex: `${mag} \\times ${fmt(ask === 'i' ? cosOf(t) : sinOf(t))} = ${fmt(Math.abs(value))}` },
      { text: `It points ${ask === 'i' ? (x < 0 ? 'left' : 'right') : y < 0 ? 'down' : 'up'}, so the component is $${fmt(value)}$.` },
    ];
  },
};

interface FromMagnitudeParams {
  u: number;
  v: number;
  h: number;
  k: number;
  scale: number;
}

/** Tiles: a force of given size in the direction of a given vector. */
const fromMagnitude: Generator<FromMagnitudeParams> = {
  id: 'force-from-magnitude',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [p, q, h] = rng.pick(hard ? PRIMITIVE.slice(0, 5) : PRIMITIVE.slice(0, 3));
    const [u, v] = rng.chance(0.5) ? [p, q] : [q, p];
    return { u: u * rng.sign(), v: v * rng.sign(), h, k: rng.int(2, hard ? 5 : 4), scale: hard ? rng.int(2, 3) : 1 };
  },
  render: ({ u, v, h, k, scale }) => {
    const mag = k * h;
    const answer = [bare(k * u), signed(k * v)];
    const extras = [bare(mag * u * scale), signed(mag * v * scale), bare(k * v), signed(k * u), bare(-k * u), signed(-k * v), bare(k * u * scale)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `A force of magnitude $${mag}\\text{ N}$ acts in the direction of $${ijTex(scale * u, scale * v)}$. Write the force in $\\mathbf{i}$, $\\mathbf{j}$ form.`,
        ),
      ],
      template: IJ_TEMPLATE,
      bank: tileBank(answer, extras),
      answer,
    };
  },
  solution: ({ u, v, h, k, scale }) => [
    { text: 'Find the length of the direction vector, then scale it to the right size.' },
    { tex: `|${ijTex(scale * u, scale * v)}| = \\sqrt{${sq(scale * u)} + ${sq(scale * v)}} = ${scale * h}` },
    { text: `The force is $${k * h}\\text{ N}$, which is $\\tfrac{${k * h}}{${scale * h}}$ of that vector:` },
    { tex: `\\mathbf{F} = \\frac{${k * h}}{${scale * h}}(${ijTex(scale * u, scale * v)}) = ${forceTex(k * u, k * v)}` },
  ],
};

/* ================================================================
 * Level 1, lesson 2: resultants
 * ================================================================ */

/** A list of forces F_1, F_2, ... in i, j form, one per line. */
function forceList(forces: Pt[], name = 'F'): string {
  return aligned(...forces.map(([a, b], i) => `\\mathbf{${name}}_{${i + 1}} &= ${ijTex(a, b)}`));
}

const sum = (forces: Pt[]): Pt => [forces.reduce((t, [a]) => t + a, 0), forces.reduce((t, [, b]) => t + b, 0)];

interface ResultantParams {
  forces: Pt[];
}

/** Tiles: the resultant of two or three forces in i, j form. */
const resultantTiles: Generator<ResultantParams> = {
  id: 'force-resultant-tiles',
  sample: (rng, difficulty) =>
    until(
      () => ({ forces: Array.from({ length: difficulty > 1 ? 3 : 2 }, (): Pt => [sizeSign(rng, 1, 9), sizeSign(rng, 1, 9)]) }),
      ({ forces }) => {
        const [x, y] = sum(forces);
        return Math.abs(x) >= 2 && Math.abs(y) >= 2 && forces.every(([a, b]) => Math.abs(a) !== 1 || Math.abs(b) !== 1);
      },
    ),
  render: ({ forces }) => {
    const [x, y] = sum(forces);
    const last = forces[forces.length - 1];
    const answer = [bare(x), signed(y)];
    const extras = [bare(x - 2 * last[0]), signed(y - 2 * last[1]), bare(y), signed(x), bare(-x), signed(-y)];
    return {
      kind: 'tiles',
      prompt: [say('Find the resultant $\\mathbf{R}$ of these forces, in newtons.'), show(forceList(forces))],
      template: '\\mathbf{R} = ({0}\\mathbf{i} {1}\\mathbf{j})',
      bank: tileBank(answer, extras),
      answer,
    };
  },
  solution: ({ forces }) => {
    const [x, y] = sum(forces);
    return [
      { text: 'Add the $\\mathbf{i}$ parts, then the $\\mathbf{j}$ parts:' },
      { tex: `${forces.map(([a]) => paren(a)).join(' + ')} = ${fmt(x)}` },
      { tex: `${forces.map(([, b]) => paren(b)).join(' + ')} = ${fmt(y)}` },
      { tex: `\\mathbf{R} = ${forceTex(x, y)}` },
    ];
  },
};

interface ResultantTreeParams {
  forces: Pt[];
  r: number;
}

/** Tree: the resultant's components, then its magnitude. */
const resultantTree: Generator<ResultantTreeParams> = {
  id: 'force-resultant-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return until(
      () => {
        const [p, q, r] = rng.pick(hard ? TRIPLES.filter(([, , h]) => h <= 30) : EASY_TRIPLES.filter(([, , h]) => h <= 15));
        const [x, y] = rng.chance(0.5) ? [p * rng.sign(), q * rng.sign()] : [q * rng.sign(), p * rng.sign()];
        const given = Array.from({ length: hard ? 2 : 1 }, (): Pt => [sizeSign(rng, 1, 9), sizeSign(rng, 1, 9)]);
        const [gx, gy] = sum(given);
        return { forces: [...given, [x - gx, y - gy] as Pt], r };
      },
      ({ forces }) => forces.every(([a, b]) => a !== 0 && b !== 0 && Math.abs(a) <= 15 && Math.abs(b) <= 15),
    );
  },
  render: ({ forces, r }) => {
    const [x, y] = sum(forces);
    const [a, b] = forces;
    const answer = [x, y, r];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Find the resultant $\\mathbf{R}$ of these forces, in newtons. Top row: its $\\mathbf{i}$ and $\\mathbf{j}$ components. Underneath: its magnitude.',
        ),
        show(forceList(forces)),
      ],
      expression: `\\mathbf{R} = ${forces.map((_, i) => `\\mathbf{F}_{${i + 1}}`).join(' + ')}`,
      nodes: [
        { id: 'x', from: [] },
        { id: 'y', from: [] },
        { id: 'r', from: ['x', 'y'] },
      ],
      bank: valueBank(answer, [Math.abs(x) + Math.abs(y), x * x + y * y, a[0] - b[0], a[1] - b[1]]),
      answer: answer.map(fmt),
    };
  },
  solution: ({ forces, r }) => {
    const [x, y] = sum(forces);
    return [
      { tex: `\\mathbf{R} = ${forceTex(x, y)}` },
      { tex: `|\\mathbf{R}| = \\sqrt{${sq(x)} + ${sq(y)}} = \\sqrt{${x * x + y * y}} = ${r}` },
    ];
  },
};

interface ParallelParams {
  f1: Pt;
  f2: Pt;
  /** The known component of the third force. */
  known: number;
  /** 'i' or 'j' for a resultant along an axis; a direction vector otherwise. */
  target: 'i' | 'j' | Pt;
}

/** The unknown in F_3 that makes the resultant point the stated way. */
export function parallelAnswer({ f1, f2, known, target }: ParallelParams): number {
  const [sx, sy] = sum([f1, f2]);
  if (target === 'i') return -sy;
  if (target === 'j') return -sx;
  const [u, v] = target;
  // (sx + p) / (sy + known) = u / v
  return (u * (sy + known)) / v - sx;
}

/** Expression: a missing component that makes the resultant parallel to a given vector. */
const parallel: Generator<ParallelParams> = {
  id: 'force-parallel',
  sample: (rng, difficulty) => {
    const force = (): Pt => [sizeSign(rng, 1, 9), sizeSign(rng, 1, 9)];
    if (difficulty < 2) {
      return until(
        () => ({ f1: force(), f2: force(), known: sizeSign(rng, 1, 6), target: rng.pick<'i' | 'j'>(['i', 'j']) }),
        (p) => parallelAnswer(p) !== 0,
      );
    }
    return until(
      (): ParallelParams => {
        const u = sizeSign(rng, 1, 4);
        const v = sizeSign(rng, 1, 4);
        const f1 = force();
        const f2 = force();
        // The resultant's j part is a multiple of v, so the unknown is whole.
        const t = sizeSign(rng, 1, 3);
        return { f1, f2, known: v * t - f1[1] - f2[1], target: [u, v] };
      },
      (p) => {
        const [u, v] = p.target as Pt;
        const ans = parallelAnswer(p);
        return Math.abs(u) !== Math.abs(v) && p.known !== 0 && Math.abs(p.known) <= 20 && Number.isInteger(ans) && ans !== 0 && Math.abs(ans) <= 30;
      },
    );
  },
  render: (params) => {
    const { f1, f2, known, target } = params;
    const axis = typeof target === 'string';
    const third = axis
      ? target === 'i'
        ? `(${fmt(known)}\\mathbf{i} + q\\mathbf{j})`
        : `(p\\mathbf{i} ${signed(known)}\\mathbf{j})`
      : `(p\\mathbf{i} ${signed(known)}\\mathbf{j})`;
    const along = axis ? `$\\mathbf{${target}}$` : `$${ijTex(target[0], target[1])}$`;
    const unknown = target === 'i' ? 'q' : 'p';
    return typed(
      [
        say(
          `Three forces act on a particle: $\\mathbf{F}_1 = ${forceTex(...f1)}$, $\\mathbf{F}_2 = ${forceTex(...f2)}$ and $\\mathbf{F}_3 = ${third}\\text{ N}$. Their resultant is parallel to ${along}. Find $${unknown}$.`,
        ),
      ],
      `${unknown} =`,
      parallelAnswer(params),
    );
  },
  solution: (params) => {
    const { f1, f2, known, target } = params;
    const [sx, sy] = sum([f1, f2]);
    const ans = parallelAnswer(params);
    if (target === 'i') {
      return [
        { text: 'Parallel to $\\mathbf{i}$ means no $\\mathbf{j}$ part at all:' },
        { tex: `${paren(f1[1])} + ${paren(f2[1])} + q = 0, \\quad q = ${fmt(ans)}` },
      ];
    }
    if (target === 'j') {
      return [
        { text: 'Parallel to $\\mathbf{j}$ means no $\\mathbf{i}$ part at all:' },
        { tex: `${paren(f1[0])} + ${paren(f2[0])} + p = 0, \\quad p = ${fmt(ans)}` },
      ];
    }
    const [u, v] = target;
    return [
      { text: 'Add the forces first:' },
      { tex: `\\mathbf{R} = (${fmt(sx)} + p)\\mathbf{i} ${signed(sy + known)}\\mathbf{j}` },
      { text: `Parallel to $${ijTex(u, v)}$ means the parts are in the same ratio:` },
      { tex: aligned(`\\frac{${fmt(sx)} + p}{${fmt(sy + known)}} &= \\frac{${u}}{${v}}`, `${fmt(sx)} + p &= ${fmt((u * (sy + known)) / v)}`, `p &= ${fmt(ans)}`) },
    ];
  },
  choices: (params) => {
    const { f1, f2, known, target } = params;
    const ans = parallelAnswer(params);
    const [sx, sy] = sum([f1, f2]);
    if (typeof target === 'string') {
      const [one, two] = target === 'i' ? [f1[1], f2[1]] : [f1[0], f2[0]];
      return valueChoices(ans, [-ans, one - two, two - one, -one], mix(ans, one, two));
    }
    const [u, v] = target;
    return valueChoices(ans, [(v * (sy + known)) / u - sx, (u * (sy + known)) / v + sx, -ans], mix(ans, u, v, sx));
  },
};

interface ResultantSliderParams {
  forces: Pt[];
  ask: 'i' | 'j';
}

/** Slider: a component of the resultant of forces drawn on squared paper. */
const resultantSlider: Generator<ResultantSliderParams> = {
  id: 'force-resultant-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({
        forces: Array.from({ length: difficulty > 1 ? 3 : 2 }, (): Pt => [sizeSign(rng, 1, 6), sizeSign(rng, 1, 6)]),
        ask: rng.pick<'i' | 'j'>(['i', 'j']),
      }),
      ({ forces, ask }) => {
        const [x, y] = sum(forces);
        const value = ask === 'i' ? x : y;
        return value !== 0 && Math.abs(value) <= 7 && Math.abs(x) <= 8 && Math.abs(y) <= 8;
      },
    ),
  render: ({ forces, ask }) => {
    const [x, y] = sum(forces);
    return {
      kind: 'slider',
      prompt: [
        say(
          `The forces drawn act on a particle at the origin. Slide the line to the $\\mathbf{${ask}}$ component of their resultant, in newtons. Each square is $1\\text{ N}$.`,
        ),
      ],
      min: -7,
      max: 7,
      step: 0.5,
      answer: ask === 'i' ? x : y,
      readout: `\\mathbf{${ask}}\\text{ component} = {v}`,
      figure: {
        svg: arrowsSvg(
          forces.map((to) => ({ to })),
          { span: 8, grid: true, label: `${forces.length} forces drawn from the origin on squared paper` },
        ),
        xMin: -8,
        xMax: 8,
        axis: ask === 'i' ? 'x' : 'y',
      },
    };
  },
  solution: ({ forces, ask }) => {
    const parts = forces.map(([a, b]) => (ask === 'i' ? a : b));
    return [
      { text: `Read each force's $\\mathbf{${ask}}$ component off the grid, then add them:` },
      { tex: `${parts.map(paren).join(' + ')} = ${fmt(parts.reduce((t, v) => t + v, 0))}` },
    ];
  },
};

interface PerpendicularParams {
  p: number;
  q: number;
  r: number;
  find: 'r' | 'q';
}

/** Expression: two forces at right angles, their resultant or the missing one. */
const perpendicular: Generator<PerpendicularParams> = {
  id: 'force-perpendicular',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [a, b, r] = rng.pick(hard ? TRIPLES : TRIPLES.filter(([, , h]) => h <= 40));
    const [p, q] = rng.chance(0.5) ? [a, b] : [b, a];
    return { p, q, r, find: hard && rng.chance(0.6) ? 'q' : 'r' };
  },
  render: ({ p, q, r, find }) =>
    find === 'r'
      ? typed(
          [say(`Two forces of $${p}\\text{ N}$ and $${q}\\text{ N}$ act on a particle at right angles to each other. Find the magnitude of their resultant, in newtons.`)],
          'R =',
          r,
        )
      : typed(
          [say(`Two forces act on a particle at right angles to each other. One is $${p}\\text{ N}$ and their resultant is $${r}\\text{ N}$. Find the other force, in newtons.`)],
          'Q =',
          q,
        ),
  solution: ({ p, q, r, find }) =>
    find === 'r'
      ? [
          { text: 'At right angles, the two forces and the resultant make a right-angled triangle:' },
          { tex: `R = \\sqrt{${p}^{2} + ${q}^{2}} = \\sqrt{${p * p + q * q}} = ${r}` },
        ]
      : [
          { text: 'The resultant is the hypotenuse:' },
          { tex: `Q = \\sqrt{${r}^{2} - ${p}^{2}} = \\sqrt{${r * r - p * p}} = ${q}` },
        ],
  choices: ({ p, q, r, find }) =>
    find === 'r'
      ? valueChoices(r, [p + q, p * p + q * q, Math.abs(p - q)], mix(p, q, r))
      : valueChoices(q, [r - p, r * r - p * p, r + p], mix(p, q, r, 2)),
};

/* ================================================================
 * Level 1, lesson 3: resolving
 * ================================================================ */

interface ResolveParams {
  F: number;
  t: Angle;
  fromVertical: boolean;
  hard: boolean;
}

/** The horizontal and vertical parts of a force at an angle. */
export function resolved({ F, t, fromVertical }: ResolveParams): [number, number] {
  const along = F * cosOf(t);
  const across = F * sinOf(t);
  return fromVertical ? [across, along] : [along, across];
}

/** Tiles: horizontal and vertical components of a force at an angle. */
const resolveTiles: Generator<ResolveParams> = {
  id: 'force-resolve-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      F: rng.int(4, hard ? 60 : 30),
      t: rng.pick(hard ? [A34, A43, A724, A247] : [A34, A43]),
      fromVertical: hard && rng.chance(0.5),
      hard,
    };
  },
  render: (params) => {
    const { F, t, fromVertical, hard } = params;
    const [x, y] = resolved(params);
    const drawn: Pt = [4.2 * (fromVertical ? sinOf(t) : cosOf(t)), 4.2 * (fromVertical ? cosOf(t) : sinOf(t))];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `A force of $${F}\\text{ N}$ acts at an angle $\\alpha$ to the ${fromVertical ? 'vertical' : 'horizontal'}, where ${angleFacts(t, hard)}. Find its horizontal part ($\\rightarrow$) and its vertical part ($\\uparrow$), in newtons.`,
        ),
        picture(arrowsSvg([{ to: drawn, name: 'F' }], { span: 5, label: 'A force at an angle, drawn from the origin' })),
      ],
      template: '\\rightarrow\\; {0} \\qquad \\uparrow\\; {1}',
      bank: tileBank([fmt(x), fmt(y)], [fmt(F), fmt((F * t.o) / t.a), fmt((F * t.a) / t.o), fmt(F / 2)].filter((s) => exact(Number(s), 3))),
      answer: [fmt(x), fmt(y)],
    };
  },
  solution: (params) => {
    const { F, t, fromVertical, hard } = params;
    const [x, y] = resolved(params);
    return [
      ...angleStep(t, hard),
      {
        text: fromVertical
          ? 'The angle is measured from the vertical, so the vertical side is next to it and takes the cosine.'
          : 'The side next to the angle takes the cosine, the side opposite it the sine.',
      },
      { tex: `\\rightarrow\\; ${F}\\${fromVertical ? 'sin' : 'cos'}\\alpha = ${F} \\times ${fmt(fromVertical ? sinOf(t) : cosOf(t))} = ${fmt(x)}` },
      { tex: `\\uparrow\\; ${F}\\${fromVertical ? 'cos' : 'sin'}\\alpha = ${F} \\times ${fmt(fromVertical ? cosOf(t) : sinOf(t))} = ${fmt(y)}` },
    ];
  },
};

type TrigCase = 'hh' | 'hv' | 'vh' | 'vv' | 'wAlong' | 'wInto' | 'ropeAlong' | 'ropeAcross' | 'pushAlong' | 'pushInto';

interface WhichTrigParams {
  scene: TrigCase;
  P: number;
  sym: string;
}

const TRIG_SCENES: Record<TrigCase, { text: (P: number, sym: string) => string; trig: 'cos' | 'sin' }> = {
  hh: { text: (P, s) => `A force of $${P}\\text{ N}$ acts at an angle $${s}$ above the horizontal. Which is its horizontal component?`, trig: 'cos' },
  hv: { text: (P, s) => `A force of $${P}\\text{ N}$ acts at an angle $${s}$ above the horizontal. Which is its vertical component?`, trig: 'sin' },
  vh: { text: (P, s) => `A force of $${P}\\text{ N}$ acts at an angle $${s}$ to the vertical. Which is its horizontal component?`, trig: 'sin' },
  vv: { text: (P, s) => `A force of $${P}\\text{ N}$ acts at an angle $${s}$ to the vertical. Which is its vertical component?`, trig: 'cos' },
  wAlong: {
    text: (P, s) => `A particle of weight $${P}\\text{ N}$ rests on a slope inclined at $${s}$ to the horizontal. Which is the part of its weight acting down the slope?`,
    trig: 'sin',
  },
  wInto: {
    text: (P, s) => `A particle of weight $${P}\\text{ N}$ rests on a slope inclined at $${s}$ to the horizontal. Which is the part of its weight pressing into the slope?`,
    trig: 'cos',
  },
  ropeAlong: {
    text: (P, s) => `A rope pulls a box up a slope with a tension of $${P}\\text{ N}$, at an angle $${s}$ above the slope. Which is the part of the tension along the slope?`,
    trig: 'cos',
  },
  ropeAcross: {
    text: (P, s) => `A rope pulls a box up a slope with a tension of $${P}\\text{ N}$, at an angle $${s}$ above the slope. Which is the part of the tension at right angles to the slope?`,
    trig: 'sin',
  },
  pushAlong: {
    text: (P, s) => `A horizontal force of $${P}\\text{ N}$ pushes a box on a slope inclined at $${s}$ to the horizontal. Which is the part of the force up the slope?`,
    trig: 'cos',
  },
  pushInto: {
    text: (P, s) => `A horizontal force of $${P}\\text{ N}$ pushes a box on a slope inclined at $${s}$ to the horizontal. Which is the part of the force pressing into the slope?`,
    trig: 'sin',
  },
};

/** Choice: sine or cosine, for a component named in words. */
const whichTrig: Generator<WhichTrigParams> = {
  id: 'force-which-trig',
  sample: (rng, difficulty) => ({
    scene: rng.pick<TrigCase>(difficulty > 1 ? ['vh', 'vv', 'wAlong', 'wInto', 'ropeAlong', 'ropeAcross', 'pushAlong', 'pushInto'] : ['hh', 'hv', 'vh', 'vv']),
    P: rng.int(5, 60),
    sym: rng.pick(['\\theta', '\\alpha', '\\beta']),
  }),
  render: ({ scene, P, sym }) => {
    const { text, trig } = TRIG_SCENES[scene];
    const other = trig === 'cos' ? 'sin' : 'cos';
    return choiceSlide(
      [say(text(P, sym))],
      options(
        { tex: `${P}\\${trig}${sym}` },
        { tex: `${P}\\${other}${sym}` },
        { tex: `${P}\\tan${sym}` },
        { tex: `\\frac{${P}}{\\${trig}${sym}}` },
      ),
    );
  },
  solution: ({ scene, P, sym }) => {
    const { trig } = TRIG_SCENES[scene];
    const slope = scene.startsWith('w');
    return [
      {
        text: slope
          ? `The weight is vertical and the slope is at $${sym}$ to the horizontal, so the weight makes $${sym}$ with the line at right angles to the slope. The part along the slope is opposite that angle.`
          : `The side of the triangle next to the angle takes the cosine; the side opposite takes the sine.`,
      },
      { tex: `${P}\\${trig}${sym}` },
    ];
  },
};

interface ResolveTableParams {
  /** Forces at an angle: magnitude, angle, and which way along each axis. */
  angled: { F: number; t: Angle; sx: number; sy: number }[];
  /** One force along an axis, given in the table. */
  axis: Pt;
  hard: boolean;
}

const componentsOf = ({ F, t, sx, sy }: ResolveTableParams['angled'][number]): Pt => [sx * F * cosOf(t), sy * F * sinOf(t)];

/** Table: the components of each force, then of the total. */
const resolveTable: Generator<ResolveTableParams> = {
  id: 'force-resolve-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const one = (t: Angle) => ({ F: t.h * rng.int(1, t.h === 5 ? 6 : 2), t, sx: rng.sign(), sy: rng.sign() });
    const angled = hard ? [one(rng.pick([A34, A43])), one(rng.pick([A724, A247]))] : [one(rng.pick([A34, A43]))];
    const size = rng.int(2, 15);
    const axis = rng.pick<Pt>([
      [size, 0],
      [-size, 0],
      [0, size],
      [0, -size],
    ]);
    return { angled, axis, hard };
  },
  render: ({ angled, axis, hard }) => {
    const parts = angled.map(componentsOf);
    const [tx, ty] = sum([...parts, axis]);
    const way = (sx: number, sy: number) => `${sy < 0 ? 'below' : 'above'} the horizontal, pointing ${sx < 0 ? 'left' : 'right'}`;
    const syms = ['\\alpha', '\\beta'];
    const described = angled.map(
      ({ F, sx, sy }, i) => `$\\mathbf{F}_{${i + 1}}$ is $${F}\\text{ N}$ at $${syms[i]}$ ${way(sx, sy)}`,
    );
    const axisName = axis[0] > 0 ? 'right' : axis[0] < 0 ? 'left' : axis[1] > 0 ? 'up' : 'down';
    const n = angled.length + 1;
    described.push(`$\\mathbf{F}_{${n}}$ is $${fmt(Math.abs(axis[0] + axis[1]))}\\text{ N}$ ${axisName === 'up' || axisName === 'down' ? `straight ${axisName}` : `to the ${axisName}`}`);
    const facts = angled.map(({ t }, i) => angleFacts(t, hard, syms[i])).join(', and ');
    const answer = [...parts.flat(), tx, ty];
    const slips = [...parts.flatMap(([a, b]) => [b, a, -a, -b]), tx - 2 * axis[0], ty - 2 * axis[1]];
    return {
      kind: 'table',
      prompt: [
        say(`${described.join('; ')}. Here ${facts}.`),
        say('Fill in the horizontal ($\\rightarrow$) and vertical ($\\uparrow$) components of each force, then of the total, in newtons. Right and up are positive.'),
      ],
      columns: ['\\text{force}', '\\rightarrow', '\\uparrow'],
      rows: [
        ...angled.map((_, i) => [`\\mathbf{F}_{${i + 1}}`, null, null]),
        [`\\mathbf{F}_{${n}}`, fmt(axis[0]), fmt(axis[1])],
        ['\\text{total}', null, null],
      ],
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: ({ angled, axis, hard }) => {
    const syms = ['\\alpha', '\\beta'];
    const parts = angled.map(componentsOf);
    const [tx, ty] = sum([...parts, axis]);
    return [
      ...angled.flatMap(({ t }, i) => angleStep(t, hard, syms[i])),
      ...angled.map(({ F, t }, i) => ({
        tex: `\\mathbf{F}_{${i + 1}}: \\; ${F} \\times ${fmt(cosOf(t))} = ${fmt(Math.abs(parts[i][0]))}, \\quad ${F} \\times ${fmt(sinOf(t))} = ${fmt(Math.abs(parts[i][1]))}`,
      })),
      { text: 'Give each part the sign of its direction, then add down each column:' },
      { tex: `\\rightarrow\\; ${[...parts, axis].map(([a]) => paren(a)).join(' + ')} = ${fmt(tx)}` },
      { tex: `\\uparrow\\; ${[...parts, axis].map(([, b]) => paren(b)).join(' + ')} = ${fmt(ty)}` },
    ];
  },
};

interface NetParams {
  T: number;
  t: Angle;
  /** Resistance, for the easy form. */
  Q: number;
  /** The second rope, pulling the other way, for the hard form. */
  U: number;
  u: Angle;
}

/** Steps: the net horizontal force from a rope at an angle and a force against it. */
const netSteps: Generator<NetParams> = {
  id: 'force-net-steps',
  sample: (rng, difficulty) => {
    const t = rng.pick([A34, A43, A724, A247]);
    if (difficulty < 2) return { T: 5 * rng.int(2, 16), t, Q: rng.int(3, 40), U: 0, u: t };
    return until(
      () => ({ T: 5 * rng.int(2, 16), t, Q: 0, U: 5 * rng.int(2, 16), u: rng.pick([A34, A43, A724, A247]) }),
      ({ T, U }) => T !== U,
    );
  },
  render: ({ T, t, Q, U, u }) => {
    const c = cosOf(t);
    const v1 = T * c;
    if (U === 0) {
      const net = v1 - Q;
      return {
        kind: 'steps',
        prompt: [
          say(
            `A box on horizontal ground is pulled by a rope with tension $${T}\\text{ N}$ at an angle $\\alpha$ above the horizontal, where $\\cos\\alpha = ${fmt(c)}$. Friction of $${Q}\\text{ N}$ acts against it. Work out the net horizontal force, in newtons: tap the part to do next, then choose what it comes to.`,
          ),
        ],
        start: [fmt(T), '\\times', fmt(c), '-', fmt(Q)],
        reductions: [
          { span: [0, 3], operator: 1, value: fmt(v1), bank: stepBank(fmt(v1), fmt(T * sinOf(t)), fmt(T)) },
          { span: [0, 3], operator: 1, value: fmt(net), bank: stepBank(fmt(net), fmt(v1 + Q), fmt(Q - v1), fmt(T - Q)) },
        ],
      };
    }
    const d = cosOf(u);
    const v2 = U * d;
    const net = v1 - v2;
    return {
      kind: 'steps',
      prompt: [
        say(
          `Two ropes pull a crate across horizontal ground. One, with tension $${T}\\text{ N}$, pulls to the right at $\\alpha$ above the horizontal; the other, with tension $${U}\\text{ N}$, pulls to the left at $\\beta$ above it. Here $\\cos\\alpha = ${fmt(c)}$ and $\\cos\\beta = ${fmt(d)}$. Work out the net force to the right, in newtons: tap the part to do next, then choose what it comes to.`,
        ),
      ],
      start: [fmt(T), '\\times', fmt(c), '-', fmt(U), '\\times', fmt(d)],
      reductions: [
        { span: [0, 3], operator: 1, value: fmt(v1), bank: stepBank(fmt(v1), fmt(T * sinOf(t)), fmt(T)) },
        { span: [2, 5], operator: 3, value: fmt(v2), bank: stepBank(fmt(v2), fmt(U * sinOf(u)), fmt(U)) },
        { span: [0, 3], operator: 1, value: fmt(net), bank: stepBank(fmt(net), fmt(v1 + v2), fmt(-net), fmt(T - U)) },
      ],
    };
  },
  solution: ({ T, t, Q, U, u }) => {
    const v1 = T * cosOf(t);
    if (U === 0) {
      return [
        { text: 'Only the horizontal part of the tension pulls the box along:' },
        { tex: `${T}\\cos\\alpha = ${T} \\times ${fmt(cosOf(t))} = ${fmt(v1)}` },
        { tex: `${fmt(v1)} - ${Q} = ${fmt(v1 - Q)}` },
        ...(v1 < Q ? [{ text: 'A negative answer means the net force points the other way.' }] : []),
      ];
    }
    const v2 = U * cosOf(u);
    return [
      { text: 'Take the horizontal part of each tension, right as positive:' },
      { tex: `${T} \\times ${fmt(cosOf(t))} = ${fmt(v1)}, \\quad ${U} \\times ${fmt(cosOf(u))} = ${fmt(v2)}` },
      { tex: `${fmt(v1)} - ${fmt(v2)} = ${fmt(v1 - v2)}` },
      ...(v1 < v2 ? [{ text: 'A negative answer means the net force points to the left.' }] : []),
    ];
  },
};

/* ================================================================
 * Level 1, lesson 4: equilibrium on level ground
 * ================================================================ */

interface WeightParams {
  m: number;
  find: 'W' | 'm';
}

/** Expression: weight from mass, or mass from weight. */
const weight: Generator<WeightParams> = {
  id: 'force-weight',
  sample: (rng, difficulty) => {
    if (difficulty < 2) return { m: rng.chance(0.2) ? rng.int(0, 4) + 0.5 : rng.int(1, 25), find: 'W' };
    return { m: rng.int(1, 60) / 2, find: rng.chance(0.7) ? 'm' : 'W' };
  },
  render: ({ m, find }) =>
    find === 'W'
      ? typed([say(`A particle has mass $${fmt(m)}\\text{ kg}$. Find its weight, in newtons. ${G_NOTE}`)], 'W =', G * m)
      : typed([say(`A particle has weight $${fmt(G * m)}\\text{ N}$. Find its mass, in kilograms. ${G_NOTE}`)], 'm =', m),
  solution: ({ m, find }) =>
    find === 'W'
      ? [{ text: 'Weight is mass times $g$:' }, { tex: `W = mg = ${fmt(m)} \\times 9.8 = ${fmt(G * m)}` }]
      : [{ text: 'Weight is mass times $g$, so divide by $g$:' }, { tex: `m = \\frac{W}{g} = \\frac{${fmt(G * m)}}{9.8} = ${fmt(m)}` }],
  choices: ({ m, find }) =>
    find === 'W'
      ? valueChoices(G * m, [10 * m, m, G + m], mix(m * 2, 1))
      : valueChoices(m, [G * m * G, (G * m) / 10, G * m - G], mix(m * 2, 2)),
};

interface NormalParams {
  m: number;
  P: number;
  t: Angle;
  push: boolean;
  hard: boolean;
}

/** The normal reaction under a pull above, or a push below, the horizontal. */
export const normalOf = ({ m, P, t, push }: NormalParams): number => G * m + (push ? 1 : -1) * P * sinOf(t);

/** Tree: weight, the vertical part of a force at an angle, then the normal reaction. */
const normalTree: Generator<NormalParams> = {
  id: 'force-normal-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return until(
      () => ({ m: rng.int(2, 12), P: rng.int(5, 60), t: rng.pick(hard ? [A34, A43, A724, A247] : [A34, A43]), push: hard && rng.chance(0.5), hard }),
      (p) => normalOf(p) > 1,
    );
  },
  render: (params) => {
    const { m, P, t, push, hard } = params;
    const W = G * m;
    const V = P * sinOf(t);
    const R = normalOf(params);
    return {
      kind: 'tree',
      prompt: [
        say(
          `A box of mass $${m}\\text{ kg}$ rests on horizontal ground. A force of $${P}\\text{ N}$ ${push ? 'pushes on it' : 'pulls on it'} at an angle $\\alpha$ ${push ? 'below' : 'above'} the horizontal, where ${angleFacts(t, hard)}. ${G_NOTE}`,
        ),
        say(`Top row: the weight, and the vertical part of the ${push ? 'push' : 'pull'}. Underneath: the normal reaction $R$. All in newtons.`),
      ],
      expression: '\\text{resolve vertically}',
      nodes: [
        { id: 'w', from: [] },
        { id: 'v', from: [] },
        { id: 'r', from: ['w', 'v'] },
      ],
      bank: valueBank([W, V, R], [push ? W - V : W + V, P * cosOf(t), m, P]),
      answer: [W, V, R].map(fmt),
    };
  },
  solution: (params) => {
    const { m, P, t, push, hard } = params;
    const V = P * sinOf(t);
    return [
      ...angleStep(t, hard),
      { tex: `W = ${m} \\times 9.8 = ${fmt(G * m)}, \\quad ${P}\\sin\\alpha = ${fmt(V)}` },
      {
        text: push
          ? 'The push has a downward part, so the ground has to push back harder than the weight alone:'
          : 'The pull has an upward part, which takes some of the weight off the ground:',
      },
      { tex: push ? `R = ${fmt(G * m)} + ${fmt(V)} = ${fmt(normalOf(params))}` : `R + ${fmt(V)} = ${fmt(G * m)}, \\quad R = ${fmt(normalOf(params))}` },
    ];
  },
};

interface EquilibriumFlowParams {
  forces: Pt[];
}

/** Flow: check each direction in turn for a resultant. */
const equilibriumFlow: Generator<EquilibriumFlowParams> = {
  id: 'force-equilibrium-flow',
  sample: (rng, difficulty) => {
    const count = difficulty > 1 ? 4 : 3;
    return until(
      () => {
        const forces = Array.from({ length: count - 1 }, (): Pt => [sizeSign(rng, 1, 9), sizeSign(rng, 1, 9)]);
        const [x, y] = sum(forces);
        const verdict = rng.pick(['eq', 'x', 'y', 'both']);
        const nudge = () => sizeSign(rng, 1, 3);
        const last: Pt = [-x + (verdict === 'x' || verdict === 'both' ? nudge() : 0), -y + (verdict === 'y' || verdict === 'both' ? nudge() : 0)];
        return { forces: [...forces, last] };
      },
      ({ forces }) => forces.every(([a, b]) => a !== 0 && b !== 0 && Math.abs(a) <= 20 && Math.abs(b) <= 20),
    );
  },
  render: ({ forces }) => {
    const [x, y] = sum(forces);
    return {
      kind: 'flow',
      prompt: [say('A particle is acted on by these forces, in newtons. Is it in equilibrium? Check one direction at a time.')],
      subject: forceList(forces),
      steps: [
        {
          id: 'i',
          ask: 'Do the $\\mathbf{i}$ components add up to $0$?',
          branches: [
            { label: 'Yes', to: 'j' },
            { label: 'No', outcome: 'Not in equilibrium: the resultant has an $\\mathbf{i}$ part.' },
          ],
        },
        {
          id: 'j',
          ask: 'Do the $\\mathbf{j}$ components add up to $0$?',
          branches: [
            { label: 'Yes', outcome: 'In equilibrium: the resultant is zero.' },
            { label: 'No', outcome: 'Not in equilibrium: the resultant has a $\\mathbf{j}$ part.' },
          ],
        },
      ],
      answer: x !== 0 ? ['No'] : y !== 0 ? ['Yes', 'No'] : ['Yes', 'Yes'],
    };
  },
  solution: ({ forces }) => {
    const [x, y] = sum(forces);
    return [
      { tex: `\\mathbf{i}: \\; ${forces.map(([a]) => paren(a)).join(' + ')} = ${fmt(x)}` },
      { tex: `\\mathbf{j}: \\; ${forces.map(([, b]) => paren(b)).join(' + ')} = ${fmt(y)}` },
      { text: x === 0 && y === 0 ? 'Both are zero, so the resultant is zero: equilibrium.' : 'A resultant that is not zero means the particle is not in equilibrium.' },
    ];
  },
};

interface EquilibriumTilesParams {
  forces: Pt[];
  /** A mass whose weight also acts, for the hard form; 0 for none. */
  m: number;
}

/** The force that balances the others (and the weight, where there is one). */
export function balancing({ forces, m }: EquilibriumTilesParams): Pt {
  const [x, y] = sum(forces);
  return [-x, -(y - G * m)];
}

/** Tiles: the missing force that keeps a particle in equilibrium. */
const equilibriumTiles: Generator<EquilibriumTilesParams> = {
  id: 'force-equilibrium-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return until(
      () => ({
        forces: Array.from({ length: 2 }, (): Pt => [sizeSign(rng, 1, 12), sizeSign(rng, 1, 12)]),
        m: hard ? rng.int(1, 6) : 0,
      }),
      (p) => {
        const [a, b] = balancing(p);
        return Math.abs(a) >= 2 && Math.abs(b) >= 2;
      },
    );
  },
  render: (params) => {
    const { forces, m } = params;
    const [a, b] = balancing(params);
    const [x, y] = sum(forces);
    const answer = [bare(a), signed(b)];
    const extras = [bare(x), signed(y), signed(-y), bare(b), signed(a), signed(y + G * m), signed(-y - G * m)];
    const names = m > 0 ? '$\\mathbf{F}_1$, $\\mathbf{F}_2$, its weight and a third force $\\mathbf{F}_3$' : '$\\mathbf{F}_1$, $\\mathbf{F}_2$ and a third force $\\mathbf{F}_3$';
    return {
      kind: 'tiles',
      prompt: [
        say(
          `${m > 0 ? `A particle of mass $${m}\\text{ kg}$` : 'A particle'} is in equilibrium under ${names}, with $\\mathbf{j}$ pointing up.${m > 0 ? ` ${G_NOTE}` : ''} Find $\\mathbf{F}_3$, in newtons.`,
        ),
        show(forceList(forces)),
      ],
      template: '\\mathbf{F}_3 = ({0}\\mathbf{i} {1}\\mathbf{j})',
      bank: tileBank(answer, extras),
      answer,
    };
  },
  solution: (params) => {
    const { forces, m } = params;
    const [a, b] = balancing(params);
    const [x, y] = sum(forces);
    return [
      { text: 'In equilibrium the forces add to zero, so the missing one is minus the sum of the rest.' },
      ...(m > 0 ? [{ tex: `\\text{weight} = -${fmt(G * m)}\\mathbf{j}` }] : []),
      { tex: `\\mathbf{F}_1 + \\mathbf{F}_2${m > 0 ? ' + \\text{weight}' : ''} = ${ijTex(x, y - G * m)}` },
      { tex: `\\mathbf{F}_3 = ${forceTex(a, b)}` },
    ];
  },
};

interface HangingParams {
  m: number;
  t: Angle;
  find: 'T' | 'P';
  hard: boolean;
}

/** Tension and the horizontal force, for a string at the angle `t` to the vertical. */
export function hangingForces({ m, t }: HangingParams): { T: number; P: number } {
  return { T: (G * m) / cosOf(t), P: (G * m * sinOf(t)) / cosOf(t) };
}

/** Expression: a particle on a string held aside by a horizontal force. */
const hanging: Generator<HangingParams> = {
  id: 'force-hanging',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return until(
      (): HangingParams => ({
        m: rng.int(1, 25),
        t: rng.pick(hard ? [A34, A43, A724, A247] : [A34, A43]),
        find: hard ? rng.pick<'T' | 'P'>(['T', 'P']) : 'T',
        hard,
      }),
      (p) => {
        const { T, P } = hangingForces(p);
        return exact(T) && exact(P);
      },
    );
  },
  render: (params) => {
    const { m, t, find, hard } = params;
    const { T, P } = hangingForces(params);
    return typed(
      [
        say(
          `A particle of mass $${m}\\text{ kg}$ hangs on a light string. A horizontal force $P$ holds it still, with the string at an angle $\\alpha$ to the vertical, where ${angleFacts(t, hard)}. ${G_NOTE} Find ${find === 'T' ? 'the tension $T$ in the string' : 'the size of $P$'}, in newtons.`,
        ),
        picture(hangingSvg(t)),
      ],
      `${find} =`,
      find === 'T' ? T : P,
    );
  },
  solution: (params) => {
    const { m, t, find, hard } = params;
    const { T, P } = hangingForces(params);
    return [
      ...angleStep(t, hard),
      { text: 'Resolve vertically: the upward part of the tension holds up the weight.' },
      { tex: `T\\cos\\alpha = ${fmt(G * m)}, \\quad T = \\frac{${fmt(G * m)}}{${fmt(cosOf(t))}} = ${fmt(T)}` },
      ...(find === 'P'
        ? [
            { text: 'Resolve horizontally: $P$ balances the sideways part of the tension.' },
            { tex: `P = T\\sin\\alpha = ${fmt(T)} \\times ${fmt(sinOf(t))} = ${fmt(P)}` },
          ]
        : []),
    ];
  },
  choices: (params) => {
    const { m, t, find } = params;
    const { T, P } = hangingForces(params);
    const W = G * m;
    return find === 'T'
      ? valueChoices(T, [W * cosOf(t), W / sinOf(t), W, W * sinOf(t)], mix(m, t.o, 1))
      : valueChoices(P, [(W * t.a) / t.o, W * sinOf(t), W * cosOf(t), T], mix(m, t.o, 2));
  },
};

/* ================================================================
 * Level 1, lesson 5: slopes and friction
 * ================================================================ */

interface SlopeParams {
  m: number;
  t: Angle;
  hard: boolean;
}

/** Tiles: a weight split along and into a slope. */
const slopeTiles: Generator<SlopeParams> = {
  id: 'force-slope-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { m: hard ? rng.int(2, 30) / 2 : rng.int(1, 15), t: rng.pick(hard ? [A34, A43, A724, A247] : [A34, A43]), hard };
  },
  render: ({ m, t, hard }) => {
    const along = G * m * sinOf(t);
    const into = G * m * cosOf(t);
    return {
      kind: 'tiles',
      prompt: [
        say(
          `A particle of mass $${fmt(m)}\\text{ kg}$ rests on a slope inclined at $\\alpha$ to the horizontal, where ${angleFacts(t, hard)}. ${G_NOTE} Split its weight into the part down the slope ($\\parallel$) and the part pressing into it ($\\perp$), in newtons.`,
        ),
        picture(slopeSvg(t)),
      ],
      template: '\\parallel\\; {0} \\qquad \\perp\\; {1}',
      bank: tileBank([fmt(along), fmt(into)], [fmt(G * m), fmt(m * sinOf(t)), fmt(m * cosOf(t)), fmt((G * m * t.o) / t.a)].filter((s) => exact(Number(s), 4))),
      answer: [fmt(along), fmt(into)],
    };
  },
  solution: ({ m, t, hard }) => [
    ...angleStep(t, hard),
    { text: 'The weight makes the angle $\\alpha$ with the line at right angles to the slope, so the part down the slope takes the sine:' },
    { tex: `\\parallel\\; ${fmt(G * m)}\\sin\\alpha = ${fmt(G * m)} \\times ${fmt(sinOf(t))} = ${fmt(G * m * sinOf(t))}` },
    { tex: `\\perp\\; ${fmt(G * m)}\\cos\\alpha = ${fmt(G * m)} \\times ${fmt(cosOf(t))} = ${fmt(G * m * cosOf(t))}` },
  ],
};

interface HoldParams {
  m: number;
  t: Angle;
  /** Which way the holding force acts. */
  pull: 'along' | 'across';
  find: 'P' | 'R';
  hard: boolean;
}

/** The holding force and the normal reaction on a smooth slope. */
export function holdForces({ m, t, pull }: HoldParams): { P: number; R: number } {
  const W = G * m;
  if (pull === 'along') return { P: W * sinOf(t), R: W * cosOf(t) };
  const P = (W * sinOf(t)) / cosOf(t);
  return { P, R: W * cosOf(t) + P * sinOf(t) };
}

/** Expression: the force holding a particle still on a smooth slope, or the reaction. */
const slopeHold: Generator<HoldParams> = {
  id: 'force-slope-hold',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return until(
      (): HoldParams => ({
        m: rng.int(1, 15),
        t: rng.pick(hard ? [A34, A43, A724, A247] : [A34, A43]),
        pull: hard ? 'across' : 'along',
        find: rng.pick<'P' | 'R'>(['P', 'P', 'R']),
        hard,
      }),
      (p) => {
        const { P, R } = holdForces(p);
        return exact(P) && exact(R);
      },
    );
  },
  render: (params) => {
    const { m, t, pull, find, hard } = params;
    const { P, R } = holdForces(params);
    return typed(
      [
        say(
          `A particle of mass $${m}\\text{ kg}$ is held still on a smooth slope inclined at $\\alpha$ to the horizontal, where ${angleFacts(t, hard)}, by a force $P$ acting ${pull === 'along' ? 'up the slope, parallel to it' : 'horizontally'}. ${G_NOTE} Find ${find === 'P' ? '$P$' : 'the normal reaction $R$'}, in newtons.`,
        ),
        picture(slopeSvg(t, { pull })),
      ],
      `${find} =`,
      find === 'P' ? P : R,
    );
  },
  solution: (params) => {
    const { m, t, pull, find, hard } = params;
    const W = G * m;
    const { P, R } = holdForces(params);
    if (pull === 'along') {
      return [
        { text: 'Resolve along the slope and at right angles to it:' },
        { tex: find === 'P' ? `P = ${fmt(W)}\\sin\\alpha = ${fmt(P)}` : `R = ${fmt(W)}\\cos\\alpha = ${fmt(R)}` },
      ];
    }
    return [
      ...angleStep(t, hard),
      { text: 'Along the slope, the part of $P$ up the slope balances the part of the weight down it:' },
      { tex: `P\\cos\\alpha = ${fmt(W)}\\sin\\alpha, \\quad P = ${fmt(P)}` },
      ...(find === 'R'
        ? [
            { text: 'At right angles to the slope, both the weight and $P$ press into it:' },
            { tex: `R = ${fmt(W)}\\cos\\alpha + ${fmt(P)}\\sin\\alpha = ${fmt(R)}` },
          ]
        : []),
    ];
  },
  choices: (params) => {
    const { m, t, pull, find } = params;
    const W = G * m;
    const { P, R } = holdForces(params);
    const salt = mix(m, t.o, pull === 'along' ? 1 : 2, find === 'P' ? 1 : 2);
    if (find === 'P') return valueChoices(P, pull === 'along' ? [W * cosOf(t), W, W / sinOf(t)] : [W * sinOf(t), W * cosOf(t), (W * t.a) / t.o], salt);
    return valueChoices(R, pull === 'along' ? [W * sinOf(t), W, W / cosOf(t)] : [W * cosOf(t), W, W * cosOf(t) - P * sinOf(t)], salt);
  },
};

interface FrictionParams {
  m: number;
  mu: number;
  P: number;
  /** The angle of the pull above the horizontal; undefined for a horizontal pull. */
  t?: Angle;
  hard: boolean;
}

const MUS = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5];

/** R, the greatest friction, the push along the ground, and the friction that actually acts. */
export function frictionOf({ m, mu, P, t }: FrictionParams): { R: number; max: number; push: number; F: number } {
  const R = G * m - (t ? P * sinOf(t) : 0);
  const max = mu * R;
  const push = t ? P * cosOf(t) : P;
  return { R, max, push, F: Math.min(push, max) };
}

/** A pull that lands on one side of the greatest friction or exactly on it. */
function sampleFriction(rng: Rng, hard: boolean): FrictionParams {
  return until(
    (): FrictionParams => {
      const m = rng.int(2, 20);
      const mu = rng.pick(MUS);
      const t = hard ? rng.pick([A34, A43]) : undefined;
      const side = rng.pick(['over', 'under', 'equal']);
      if (side === 'equal') {
        // push = mu R, solved for P.
        const P = t ? (mu * G * m) / (cosOf(t) + mu * sinOf(t)) : mu * G * m;
        return { m, mu, P, t, hard };
      }
      const { max } = frictionOf({ m, mu, P: 0, t: undefined, hard });
      const P = Math.max(1, Math.round(max * (side === 'over' ? rng.float(1.2, 1.8) : rng.float(0.3, 0.8))));
      return { m, mu, P, t, hard };
    },
    (p) => {
      const { R, max, push } = frictionOf(p);
      return R > 0 && exact(p.P, 3) && exact(max, 4) && exact(push, 4) && (Math.abs(push - max) < 1e-9 || Math.abs(push - max) > 0.5);
    },
  );
}

/** Flow: the greatest friction, then whether the pull beats it. */
const frictionFlow: Generator<FrictionParams> = {
  id: 'force-friction-flow',
  sample: (rng, difficulty) => sampleFriction(rng, difficulty > 1),
  render: (params) => {
    const { m, mu, P, t } = params;
    const { max, push } = frictionOf(params);
    const slips = (t ? [mu * G * m, mu * (G * m + P * sinOf(t)), mu * m] : [mu * m, G * m, mu * P]).filter((v) => fmt(v) !== fmt(max) && exact(v, 4));
    const labels = [...new Set([max, ...slips].map(fmt))].slice(0, 3).sort((x, y) => Number(x) - Number(y));
    const cmp = Math.abs(push - max) < 1e-9 ? 'They are equal' : push > max ? 'It is bigger' : 'It is smaller';
    return {
      kind: 'flow',
      prompt: [
        say(
          `A box of mass $${m}\\text{ kg}$ rests on rough horizontal ground, with $\\mu = ${fmt(mu)}$. A force of $${fmt(P)}\\text{ N}$ pulls it ${t ? `at an angle $\\alpha$ above the horizontal, where ${angleFacts(t, false)}` : 'horizontally'}. ${G_NOTE} Does it move?`,
        ),
      ],
      subject: 'F \\le \\mu R',
      steps: [
        {
          id: 'max',
          ask: 'What is the greatest friction the ground can give, $\\mu R$, in newtons?',
          branches: labels.map((label) => ({ label: `$${label}$`, to: 'cmp' })),
        },
        {
          id: 'cmp',
          ask: `Compare the ${t ? 'horizontal part of the pull' : 'pull'} with $\\mu R$.`,
          branches: [
            { label: 'It is bigger', outcome: 'So the box slides, and friction takes its greatest value.' },
            { label: 'It is smaller', outcome: 'So the box stays still, and friction only matches the pull.' },
            { label: 'They are equal', outcome: 'So the box is in limiting equilibrium: on the point of sliding.' },
          ],
        },
      ],
      answer: [`$${fmt(max)}$`, cmp],
    };
  },
  solution: (params) => {
    const { m, mu, P, t } = params;
    const { R, max, push } = frictionOf(params);
    return [
      t
        ? { tex: `R = ${fmt(G * m)} - ${fmt(P)}\\sin\\alpha = ${fmt(R)}` }
        : { tex: `R = ${m} \\times 9.8 = ${fmt(R)}` },
      { tex: `\\mu R = ${fmt(mu)} \\times ${fmt(R)} = ${fmt(max)}` },
      ...(t ? [{ tex: `${fmt(P)}\\cos\\alpha = ${fmt(push)}` }] : []),
      { text: `The ${t ? 'horizontal part of the pull' : 'pull'} is $${fmt(push)}$, which is ${compareWords(push, max)} $${fmt(max)}$.` },
    ];
  },
};

function compareWords(push: number, max: number): string {
  return Math.abs(push - max) < 1e-9 ? 'exactly' : push > max ? 'more than' : 'less than';
}

/** Tree: the normal reaction, the greatest friction, then the friction that acts. */
const frictionTree: Generator<FrictionParams> = {
  id: 'force-friction-tree',
  sample: (rng, difficulty) => sampleFriction(rng, difficulty > 1),
  render: (params) => {
    const { m, mu, P, t } = params;
    const { R, max, F } = frictionOf(params);
    const answer = [R, max, F];
    return {
      kind: 'tree',
      prompt: [
        say(
          `A box of mass $${m}\\text{ kg}$ rests on rough horizontal ground, with $\\mu = ${fmt(mu)}$. A force of $${fmt(P)}\\text{ N}$ pulls it ${t ? `at an angle $\\alpha$ above the horizontal, where ${angleFacts(t, false)}` : 'horizontally'}. ${G_NOTE}`,
        ),
        say('Top row: the normal reaction $R$. Then the greatest friction $\\mu R$. Then the friction that actually acts. All in newtons.'),
      ],
      expression: 'F \\le \\mu R',
      nodes: [
        { id: 'r', from: [] },
        { id: 'max', from: ['r'] },
        { id: 'f', from: ['max'] },
      ],
      bank: valueBank(answer, [G * m, mu * m, P, t ? mu * G * m : mu * P, max === F ? P : max + 1].filter((v) => exact(v, 4))),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { m, mu, P, t } = params;
    const { R, max, push, F } = frictionOf(params);
    return [
      t ? { tex: `R = ${fmt(G * m)} - ${fmt(P)}\\sin\\alpha = ${fmt(R)}` } : { tex: `R = ${m} \\times 9.8 = ${fmt(R)}` },
      { tex: `\\mu R = ${fmt(mu)} \\times ${fmt(R)} = ${fmt(max)}` },
      {
        text:
          push > max
            ? `The ${t ? 'horizontal part of the pull' : 'pull'}, $${fmt(push)}$, is more than that, so the box slides and friction is at its greatest: $${fmt(F)}$.`
            : `The ${t ? 'horizontal part of the pull' : 'pull'} is only $${fmt(push)}$, so friction matches it and the box stays still: $F = ${fmt(F)}$.`,
      },
    ];
  },
};

interface LimitingParams {
  m: number;
  mu: number;
  t: Angle;
  mode: 'down' | 'up' | 'mu';
  hard: boolean;
}

/** The force up a rough slope that leaves a particle on the point of moving. */
export function limitingForce({ m, mu, t, mode }: LimitingParams): number {
  const W = G * m;
  return mode === 'up' ? W * (sinOf(t) + mu * cosOf(t)) : W * (sinOf(t) - mu * cosOf(t));
}

/** Expression: limiting equilibrium on a rough slope, for P or for mu. */
const limitingSlope: Generator<LimitingParams> = {
  id: 'force-limiting-slope',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return until(
      (): LimitingParams => ({
        m: rng.int(2, 15),
        mu: rng.pick(MUS),
        t: rng.pick(hard ? [A34, A43, A247] : [A34, A43]),
        mode: hard ? rng.pick<'up' | 'mu'>(['up', 'mu']) : 'down',
        hard,
      }),
      (p) => limitingForce(p) > 0 && exact(limitingForce(p)),
    );
  },
  render: (params) => {
    const { m, mu, t, mode, hard } = params;
    const P = limitingForce(params);
    const scene = `A particle of mass $${m}\\text{ kg}$ rests on a rough slope inclined at $\\alpha$ to the horizontal, where ${angleFacts(t, hard)}.`;
    if (mode === 'mu') {
      return typed(
        [
          say(
            `${scene} A force of $${fmt(P)}\\text{ N}$ acting up the slope, parallel to it, leaves the particle on the point of sliding down. ${G_NOTE} Find the coefficient of friction $\\mu$.`,
          ),
          picture(slopeSvg(t, { friction: true, pull: 'along' })),
        ],
        '\\mu =',
        mu,
      );
    }
    return typed(
      [
        say(
          `${scene} The coefficient of friction is $${fmt(mu)}$. ${G_NOTE} Find the force $P$, acting up the slope and parallel to it, that leaves the particle on the point of ${mode === 'up' ? 'moving up the slope' : 'sliding down the slope'}.`,
        ),
        picture(slopeSvg(t, { friction: true, pull: 'along' })),
      ],
      'P =',
      P,
    );
  },
  solution: (params) => {
    const { m, mu, t, mode, hard } = params;
    const W = G * m;
    const R = W * cosOf(t);
    const P = limitingForce(params);
    const steps: SolutionStep[] = [...angleStep(t, hard), { tex: `R = ${fmt(W)}\\cos\\alpha = ${fmt(R)}` }];
    if (mode === 'up') {
      steps.push(
        { text: 'About to move up, so friction acts down the slope at its greatest, $\\mu R$:' },
        { tex: `P = ${fmt(W)}\\sin\\alpha + ${fmt(mu)} \\times ${fmt(R)} = ${fmt(W * sinOf(t))} + ${fmt(mu * R)} = ${fmt(P)}` },
      );
    } else if (mode === 'down') {
      steps.push(
        { text: 'About to slide down, so friction acts up the slope at its greatest, $\\mu R$, helping $P$:' },
        { tex: `P + ${fmt(mu)} \\times ${fmt(R)} = ${fmt(W)}\\sin\\alpha` },
        { tex: `P = ${fmt(W * sinOf(t))} - ${fmt(mu * R)} = ${fmt(P)}` },
      );
    } else {
      steps.push(
        { text: 'About to slide down, so friction acts up the slope at its greatest, $\\mu R$:' },
        { tex: `${fmt(P)} + \\mu \\times ${fmt(R)} = ${fmt(W * sinOf(t))}` },
        { tex: `\\mu = \\frac{${fmt(W * sinOf(t) - P)}}{${fmt(R)}} = ${fmt(mu)}` },
      );
    }
    return steps;
  },
};

/* ================================================================
 * Level 2, lesson 1: F = ma
 * ================================================================ */

/** Accelerations that keep F = ma in exact decimals. */
const A_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6];

interface FmaParams {
  kind: 'a' | 'F' | 'm' | 'Pa' | 'P' | 'R' | 'T';
  m: number;
  a: number;
  R: number;
}

/** The pushing force (or tension) that goes with an acceleration and a resistance. */
export const fmaForce = ({ kind, m, a, R }: FmaParams): number => (kind === 'T' ? m * (G + a) : m * a + R);

/** Expression: one of F, m and a from the other two, then with a resistance or a lift. */
const fma: Generator<FmaParams> = {
  id: 'force-fma',
  sample: (rng, difficulty) => {
    const a = rng.pick(A_VALUES);
    if (difficulty < 2) return { kind: rng.pick<FmaParams['kind']>(['a', 'F', 'm']), m: rng.int(1, 20), a, R: 0 };
    return { kind: rng.pick<FmaParams['kind']>(['Pa', 'P', 'R', 'T']), m: rng.int(2, 40), a, R: rng.int(5, 60) };
  },
  render: (params) => {
    const { kind, m, a, R } = params;
    const F = m * a;
    const P = fmaForce(params);
    const acc = `$${fmt(a)}${ACC}$`;
    switch (kind) {
      case 'a':
        return typed([say(`A resultant force of $${fmt(F)}\\text{ N}$ acts on a particle of mass $${m}\\text{ kg}$. Find its acceleration, in $\\text{m s}^{-2}$.`)], 'a =', a);
      case 'F':
        return typed([say(`A particle of mass $${m}\\text{ kg}$ accelerates at ${acc}. Find the resultant force on it, in newtons.`)], 'F =', F);
      case 'm':
        return typed([say(`A resultant force of $${fmt(F)}\\text{ N}$ gives a particle an acceleration of ${acc}. Find its mass, in kilograms.`)], 'm =', m);
      case 'Pa':
        return typed(
          [say(`A box of mass $${m}\\text{ kg}$ is pushed across a floor by a horizontal force of $${fmt(P)}\\text{ N}$, against a resistance of $${R}\\text{ N}$. Find its acceleration, in $\\text{m s}^{-2}$.`)],
          'a =',
          a,
        );
      case 'P':
        return typed(
          [say(`A box of mass $${m}\\text{ kg}$ is pushed across a floor by a horizontal force $P$, against a resistance of $${R}\\text{ N}$. It accelerates at ${acc}. Find $P$, in newtons.`)],
          'P =',
          P,
        );
      case 'R':
        return typed(
          [say(`A box of mass $${m}\\text{ kg}$ is pushed across a floor by a horizontal force of $${fmt(P)}\\text{ N}$ and accelerates at ${acc}. Find the resistance to its motion, in newtons.`)],
          'R =',
          R,
        );
      case 'T':
        return typed(
          [say(`A crate of mass $${m}\\text{ kg}$ is lifted by a vertical rope and accelerates upwards at ${acc}. ${G_NOTE} Find the tension in the rope, in newtons.`)],
          'T =',
          P,
        );
    }
  },
  solution: (params) => {
    const { kind, m, a, R } = params;
    const F = m * a;
    const P = fmaForce(params);
    switch (kind) {
      case 'a':
        return [{ text: 'Newton\'s second law, $F = ma$, divided through by $m$:' }, { tex: `a = \\frac{${fmt(F)}}{${m}} = ${fmt(a)}` }];
      case 'F':
        return [{ tex: `F = ma = ${m} \\times ${fmt(a)} = ${fmt(F)}` }];
      case 'm':
        return [{ tex: `m = \\frac{F}{a} = \\frac{${fmt(F)}}{${fmt(a)}} = ${m}` }];
      case 'Pa':
        return [{ text: 'The resultant force is the push minus the resistance:' }, { tex: `${fmt(P)} - ${R} = ${m}a, \\quad a = \\frac{${fmt(F)}}{${m}} = ${fmt(a)}` }];
      case 'P':
        return [{ tex: `P - ${R} = ${m} \\times ${fmt(a)}` }, { tex: `P = ${fmt(F)} + ${R} = ${fmt(P)}` }];
      case 'R':
        return [{ tex: `${fmt(P)} - R = ${m} \\times ${fmt(a)} = ${fmt(F)}` }, { tex: `R = ${fmt(P)} - ${fmt(F)} = ${R}` }];
      case 'T':
        return [
          { text: 'The resultant force upwards is the tension minus the weight:' },
          { tex: `T - ${m} \\times 9.8 = ${m} \\times ${fmt(a)}` },
          { tex: `T = ${fmt(G * m)} + ${fmt(F)} = ${fmt(P)}` },
        ];
    }
  },
  choices: (params) => {
    const { kind, m, a, R } = params;
    const F = m * a;
    const P = fmaForce(params);
    const salt = mix(m, a * 2, R, kind.length, kind.charCodeAt(0));
    switch (kind) {
      case 'a':
        return valueChoices(a, [F * m, F - m, m / F], salt);
      case 'F':
        return valueChoices(F, [m + a, m / a, a / m], salt);
      case 'm':
        return valueChoices(m, [F * a, F - a], salt);
      case 'Pa':
        return valueChoices(a, [P / m, (P + R) / m, (P - R) * m], salt);
      case 'P':
        return valueChoices(P, [F, F - R, R], salt);
      case 'R':
        return valueChoices(R, [P + F, F, P], salt);
      case 'T':
        return valueChoices(P, [F, G * m, m * (G - a)], salt);
    }
  },
};

interface ResistanceParams {
  m: number;
  a: number;
  r1: number;
  r2: number;
  car: boolean;
}

/** Tree: total resistance, the resultant force, then the acceleration. */
const resistanceTree: Generator<ResistanceParams> = {
  id: 'force-resistance-tree',
  sample: (rng, difficulty) => {
    if (difficulty < 2) return { m: rng.int(5, 40), a: rng.pick(A_VALUES), r1: rng.int(2, 30), r2: rng.int(1, 15), car: false };
    return until(
      (): ResistanceParams => ({
        m: 100 * rng.int(6, 15),
        a: rng.pick([-0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]),
        r1: 50 * rng.int(2, 12),
        r2: 50 * rng.int(1, 8),
        car: true,
      }),
      ({ m, a, r1, r2 }) => m * a + r1 + r2 > 0,
    );
  },
  render: ({ m, a, r1, r2, car }) => {
    const total = r1 + r2;
    const net = m * a;
    const P = net + total;
    return {
      kind: 'tree',
      prompt: [
        say(
          car
            ? `A car of mass $${m}\\text{ kg}$ moves along a straight, level road with a driving force of $${fmt(P)}\\text{ N}$. Road resistance is $${r1}\\text{ N}$ and air resistance $${r2}\\text{ N}$.`
            : `A sledge of mass $${m}\\text{ kg}$ is pulled across level snow by a horizontal rope with tension $${fmt(P)}\\text{ N}$. Friction is $${r1}\\text{ N}$ and air resistance $${r2}\\text{ N}$.`,
        ),
        say(`Top row: the total resistance. Then the resultant force forwards. Then the acceleration, in $\\text{m s}^{-2}$${car ? ', negative if it is slowing down' : ''}.`),
      ],
      expression: '\\text{forwards: } ma',
      nodes: [
        { id: 'tot', from: [] },
        { id: 'net', from: ['tot'] },
        { id: 'a', from: ['net'] },
      ],
      bank: valueBank([total, net, a], [P + total, (P + total) / m, P / m, r1 - r2, -a].filter((v) => exact(v, 4))),
      answer: [total, net, a].map(fmt),
    };
  },
  solution: ({ m, a, r1, r2 }) => {
    const total = r1 + r2;
    const P = m * a + total;
    return [
      { tex: `${r1} + ${r2} = ${total}` },
      { tex: `${fmt(P)} - ${total} = ${fmt(m * a)}` },
      { tex: `a = \\frac{${fmt(m * a)}}{${m}} = ${fmt(a)}` },
      ...(a < 0 ? [{ text: 'The resistances beat the driving force, so the acceleration is backwards: the car is slowing down.' }] : []),
    ];
  },
};

interface FmaSliderParams {
  m: number;
  a: number;
  R: number;
}

/** Slider: the acceleration a resultant force gives a mass, on the line F = ma. */
const fmaSlider: Generator<FmaSliderParams> = {
  id: 'force-fma-slider',
  sample: (rng, difficulty) => ({
    m: rng.int(2, 12),
    a: rng.int(1, 11) / 2,
    R: difficulty > 1 ? rng.int(3, 30) : 0,
  }),
  render: ({ m, a, R }) => {
    const F = m * a;
    return {
      kind: 'slider',
      prompt: [
        say(
          R > 0
            ? `A horizontal force of $${fmt(F + R)}\\text{ N}$ pushes a block of mass $${m}\\text{ kg}$ against a resistance of $${R}\\text{ N}$. The line is $F = ${m}a$. Slide to the block's acceleration, in $\\text{m s}^{-2}$.`
            : `A resultant force of $${fmt(F)}\\text{ N}$ acts on a block of mass $${m}\\text{ kg}$. The line is $F = ${m}a$. Slide to the block's acceleration, in $\\text{m s}^{-2}$.`,
        ),
      ],
      min: 0,
      max: 6,
      step: 0.25,
      answer: a,
      readout: 'a = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 6,
          yMin: 0,
          yMax: 6.5 * m,
          curves: [{ f: (x) => m * x }],
          label: `The straight line F = ${m}a through the origin, with acceleration along the bottom`,
        }),
        ...markerWindow(0, 6),
        axis: 'x',
      },
    };
  },
  solution: ({ m, a, R }) => [
    ...(R > 0 ? [{ tex: `F = ${fmt(m * a + R)} - ${R} = ${fmt(m * a)}` }] : []),
    { tex: `a = \\frac{F}{m} = \\frac{${fmt(m * a)}}{${m}} = ${fmt(a)}` },
    { text: 'The line is steeper for a heavier block: the same force gives it less acceleration.' },
  ],
};

interface FmaIjParams {
  m: number;
  a: Pt;
  /** The first of two forces, for the hard form. */
  f1?: Pt;
}

const A_PARTS = [0.5, 1.5, 2, 2.5, 3, 4, 5];

/** Tiles: F = ma with F a vector. */
const fmaIj: Generator<FmaIjParams> = {
  id: 'force-fma-ij',
  sample: (rng, difficulty) => {
    const a: Pt = [rng.pick(A_PARTS) * rng.sign(), rng.pick(A_PARTS) * rng.sign()];
    if (difficulty < 2) return { m: rng.pick([2, 4, 6, 8]), a };
    return { m: rng.pick([2, 3, 4, 5, 6, 8, 10]), a, f1: [sizeSign(rng, 1, 12), sizeSign(rng, 1, 12)] };
  },
  render: ({ m, a, f1 }) => {
    const F: Pt = [m * a[0], m * a[1]];
    const answer = [bare(a[0]), signed(a[1])];
    const extras = [bare(F[0]), signed(F[1]), bare(a[1]), signed(a[0]), bare(-a[0]), signed(-a[1])];
    if (f1) extras.unshift(bare(f1[0] / m), signed(f1[1] / m));
    const forces = f1 ? [f1, [F[0] - f1[0], F[1] - f1[1]] as Pt] : [F];
    return {
      kind: 'tiles',
      prompt: [
        say(
          f1
            ? `Two forces act on a particle of mass $${m}\\text{ kg}$. Find its acceleration, in $\\text{m s}^{-2}$.`
            : `A single force $\\mathbf{F} = ${forceTex(...F)}$ acts on a particle of mass $${m}\\text{ kg}$. Find its acceleration, in $\\text{m s}^{-2}$.`,
        ),
        ...(f1 ? [show(forceList(forces))] : []),
      ],
      template: '\\mathbf{a} = ({0}\\mathbf{i} {1}\\mathbf{j})',
      bank: tileBank(answer, extras.filter((s) => exact(Number(s.replace(/[+ ]/g, '')), 3))),
      answer,
    };
  },
  solution: ({ m, a, f1 }) => {
    const F: Pt = [m * a[0], m * a[1]];
    return [
      ...(f1 ? [{ text: 'Add the forces to get the resultant:' }, { tex: `\\mathbf{F} = ${forceTex(...F)}` }] : []),
      { text: '$\\mathbf{F} = m\\mathbf{a}$ works with vectors too: divide each component by the mass.' },
      { tex: `\\mathbf{a} = \\frac{1}{${m}}(${ijTex(...F)}) = ${ijTex(...a)}` },
    ];
  },
};

interface Newton1Params {
  thing: string;
  D: number;
  R: number;
  v: number;
  /** Forces and a velocity in i, j form, for the hard form. */
  forces?: Pt[];
  vel?: Pt;
}

const MOVERS = ['car', 'cyclist', 'boat', 'train', 'lorry', 'sledge', 'trolley', 'bus'];

/** Flow: is the resultant zero, and if not which way does it accelerate? */
const newton1Flow: Generator<Newton1Params> = {
  id: 'force-newton1-flow',
  sample: (rng, difficulty) => {
    const thing = rng.pick(MOVERS);
    if (difficulty < 2) {
      const R = 10 * rng.int(5, 90);
      const scene = rng.pick(['steady', 'rest', 'faster', 'slower']);
      const v = scene === 'rest' ? 0 : rng.int(2, 30);
      const D = scene === 'faster' ? R + 10 * rng.int(1, 20) : scene === 'slower' ? R - 10 * rng.int(1, 4) : R;
      return { thing, D, R, v: scene === 'faster' && rng.chance(0.3) ? 0 : v };
    }
    return until(
      (): Newton1Params => {
        const two = Array.from({ length: 2 }, (): Pt => [sizeSign(rng, 1, 9), sizeSign(rng, 1, 9)]);
        const [x, y] = sum(two);
        const zero = rng.chance(0.5);
        const last: Pt = zero ? [-x, -y] : [-x + sizeSign(rng, 1, 4), -y + (rng.chance(0.5) ? sizeSign(rng, 1, 4) : 0)];
        const moving = rng.chance(0.6);
        return { thing, D: 0, R: 0, v: 0, forces: [...two, last], vel: moving ? [sizeSign(rng, 1, 6), sizeSign(rng, 1, 6)] : [0, 0] };
      },
      ({ forces }) => forces!.every(([a, b]) => a !== 0 && b !== 0),
    );
  },
  render: ({ thing, D, R, v, forces, vel }) => {
    const moving = vel ? vel[0] !== 0 || vel[1] !== 0 : v > 0;
    const zero = forces ? sum(forces).every((c) => c === 0) : D === R;
    const hard = forces !== undefined;
    const way = hard
      ? [
          { label: 'The way the resultant points', outcome: 'Yes: the acceleration is always in the direction of the resultant force.' },
          { label: 'The way it is moving', outcome: 'Not necessarily: the acceleration follows the resultant force, not the velocity.' },
          { label: 'Against the resultant', outcome: 'No: the acceleration is in the direction of the resultant force.' },
        ]
      : [
          { label: 'Forwards', outcome: 'The resultant points forwards, so it speeds up.' },
          { label: 'Backwards', outcome: 'The resultant points backwards, so it slows down.' },
        ];
    return {
      kind: 'flow',
      prompt: [
        say(
          hard
            ? `A particle ${moving ? `is moving with velocity $(${ijTex(...vel!)})\\text{ m s}^{-1}$` : 'is at rest'}. The forces below, in newtons, act on it. What happens next?`
            : `A ${thing} ${v > 0 ? `is moving forwards at $${v}\\text{ m s}^{-1}$` : 'is at rest'}. A forward force of $${D}\\text{ N}$ acts on it, against resistances of $${R}\\text{ N}$ in total. What happens next?`,
        ),
      ],
      subject: hard ? forceList(forces!) : `\\text{forwards } ${D}\\text{ N}, \\; \\text{backwards } ${R}\\text{ N}`,
      steps: [
        {
          id: 'zero',
          ask: 'Is the resultant force zero?',
          branches: [
            { label: 'Yes', to: 'moving' },
            { label: 'No', to: 'way' },
          ],
        },
        {
          id: 'moving',
          ask: 'Is it moving already?',
          branches: [
            { label: 'Yes', outcome: 'So it carries on at a constant velocity: same speed, same direction.' },
            { label: 'No', outcome: 'So it stays at rest.' },
          ],
        },
        { id: 'way', ask: 'Which way does it accelerate?', branches: way },
      ],
      answer: zero ? ['Yes', moving ? 'Yes' : 'No'] : ['No', hard ? 'The way the resultant points' : D > R ? 'Forwards' : 'Backwards'],
    };
  },
  solution: ({ D, R, v, forces }) => {
    if (forces) {
      const [x, y] = sum(forces);
      return [
        { tex: `\\mathbf{R} = ${ijTex(x, y)}` },
        {
          text:
            x === 0 && y === 0
              ? "The resultant is zero, so by Newton's first law the velocity does not change."
              : 'The resultant is not zero, so the particle accelerates in the direction of the resultant.',
        },
      ];
    }
    return [
      { tex: `\\text{resultant forwards} = ${D} - ${R} = ${D - R}` },
      {
        text:
          D === R
            ? `No resultant force means no change in velocity: Newton's first law. ${v > 0 ? 'It keeps its speed.' : 'It stays still.'}`
            : `The resultant is ${D > R ? 'forwards' : 'backwards'}, and it accelerates the way the resultant points.`,
      },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 2: connected particles
 * ================================================================ */

interface TowingParams {
  M: number;
  m: number;
  a: number;
  rc: number;
  rt: number;
}

/** Tree: the resultant on car and trailer, their acceleration, then the tension. */
const towingTree: Generator<TowingParams> = {
  id: 'force-towing-tree',
  sample: (rng, difficulty) =>
    until(
      (): TowingParams => ({
        M: 100 * rng.int(8, 15),
        m: difficulty > 1 ? 50 * rng.int(4, 14) : 100 * rng.int(2, 6),
        a: difficulty > 1 ? rng.pick([-0.75, -0.5, -0.25, 0.35, 0.45, 0.65]) : rng.pick([0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]),
        rc: 50 * rng.int(2, 10),
        rt: 50 * rng.int(1, 6),
      }),
      ({ M, m, a, rc, rt }) => (M + m) * a + rc + rt > 0 && m * a + rt > 0 && exact((M + m) * a, 3),
    ),
  render: ({ M, m, a, rc, rt }) => {
    const net = (M + m) * a;
    const D = net + rc + rt;
    const T = m * a + rt;
    return {
      kind: 'tree',
      prompt: [
        say(
          `A car of mass $${M}\\text{ kg}$ tows a trailer of mass $${m}\\text{ kg}$ along a straight, level road. The driving force is $${fmt(D)}\\text{ N}$; resistances are $${rc}\\text{ N}$ on the car and $${rt}\\text{ N}$ on the trailer.`,
        ),
        say(
          `Top row: the resultant force on car and trailer together, in newtons. Then their acceleration, in $\\text{m s}^{-2}$${a < 0 ? ' (negative: they are slowing down)' : ''}. Then the tension in the tow bar.`,
        ),
      ],
      expression: '\\text{together, then the trailer}',
      nodes: [
        { id: 'net', from: [] },
        { id: 'a', from: ['net'] },
        { id: 't', from: ['a'] },
      ],
      bank: valueBank([net, a, T], [D - rc, net / M, m * a, m * a - rt, D / (M + m)].filter((v) => exact(v, 4))),
      answer: [net, a, T].map(fmt),
    };
  },
  solution: ({ M, m, a, rc, rt }) => {
    const net = (M + m) * a;
    const D = net + rc + rt;
    return [
      { text: 'Treat car and trailer as one body: the tow bar is internal, so it drops out.' },
      { tex: `${fmt(D)} - ${rc} - ${rt} = ${fmt(net)} = ${M + m}a, \\quad a = ${fmt(a)}` },
      { text: 'Then the trailer alone: only the tension and its resistance act along the road.' },
      { tex: `T - ${rt} = ${m} \\times ${paren(a)}, \\quad T = ${fmt(m * a + rt)}` },
    ];
  },
};

interface PulleyParams {
  m1: number;
  m2: number;
  setup: 'hang' | 'table';
  mu: number;
  find: 'a' | 'T';
}

/** Acceleration and tension for two particles joined over a smooth pulley. */
export function pulleyOf({ m1, m2, setup, mu }: PulleyParams): { a: number; T: number } {
  if (setup === 'hang') return { a: (G * (m1 - m2)) / (m1 + m2), T: (2 * G * m1 * m2) / (m1 + m2) };
  const a = (G * (m2 - mu * m1)) / (m1 + m2);
  return { a, T: m1 * a + mu * G * m1 };
}

/** A pulley picture: two particles either side of the wheel, or one on a table and one over the edge. */
export function pulleySvg(setup: 'hang' | 'table'): string {
  const parts = ['<svg viewBox="0 0 220 160" width="100%" role="img" aria-label="'];
  if (setup === 'hang') {
    parts.push(
      'Two particles, A and B, hanging on either side of a pulley">',
      '<line x1="110" y1="4" x2="110" y2="30" stroke="currentColor" stroke-width="2" />',
      '<circle cx="110" cy="36" r="18" fill="none" stroke="currentColor" stroke-width="2" />',
      '<line x1="92" y1="36" x2="92" y2="110" stroke="currentColor" stroke-width="1.5" />',
      '<line x1="128" y1="36" x2="128" y2="80" stroke="currentColor" stroke-width="1.5" />',
      '<rect x="78" y="110" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" />',
      '<rect x="116" y="80" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" />',
      '<text x="92" y="124" fill="currentColor" font-size="14" font-style="italic" text-anchor="middle" dominant-baseline="central">A</text>',
      '<text x="128" y="92" fill="currentColor" font-size="14" font-style="italic" text-anchor="middle" dominant-baseline="central">B</text>',
    );
  } else {
    parts.push(
      'Particle A on a table, joined by a string over a pulley at the edge to particle B hanging below">',
      '<line x1="10" y1="60" x2="170" y2="60" stroke="currentColor" stroke-width="2" />',
      '<line x1="170" y1="60" x2="170" y2="156" stroke="currentColor" stroke-width="2" />',
      '<rect x="60" y="30" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" />',
      '<circle cx="180" cy="52" r="10" fill="none" stroke="currentColor" stroke-width="2" />',
      '<line x1="90" y1="42" x2="180" y2="42" stroke="currentColor" stroke-width="1.5" />',
      '<line x1="190" y1="52" x2="190" y2="100" stroke="currentColor" stroke-width="1.5" />',
      '<rect x="177" y="100" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" />',
      '<text x="75" y="45" fill="currentColor" font-size="14" font-style="italic" text-anchor="middle" dominant-baseline="central">A</text>',
      '<text x="190" y="113" fill="currentColor" font-size="14" font-style="italic" text-anchor="middle" dominant-baseline="central">B</text>',
    );
  }
  parts.push('</svg>');
  return parts.join('');
}

function pulleyScene({ m1, m2, setup, mu }: PulleyParams): string {
  return setup === 'hang'
    ? `Particles $A$ and $B$, of masses $${fmt(m1)}\\text{ kg}$ and $${fmt(m2)}\\text{ kg}$, hang on the ends of a light inextensible string passing over a smooth pulley, and are released from rest.`
    : `Particle $A$, of mass $${fmt(m1)}\\text{ kg}$, rests on a ${mu > 0 ? `rough horizontal table, with $\\mu = ${fmt(mu)}$` : 'smooth horizontal table'}. A light inextensible string from $A$ passes over a smooth pulley at the edge to particle $B$, of mass $${fmt(m2)}\\text{ kg}$, which hangs freely. They are released from rest.`;
}

/** Expression: the acceleration or the tension of two particles joined over a pulley. */
const pulley: Generator<PulleyParams> = {
  id: 'force-pulley',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return until(
      (): PulleyParams => {
        const setup = rng.pick<'hang' | 'table'>(['hang', 'table']);
        const find = hard && rng.chance(0.7) ? 'T' : 'a';
        return {
          m1: rng.int(1, 12),
          m2: rng.int(1, 12),
          setup,
          mu: hard && setup === 'table' && find === 'a' ? rng.pick(MUS) : 0,
          find,
        };
      },
      (p) => {
        const { a, T } = pulleyOf(p);
        return a > 0 && exact(a) && exact(T) && (p.setup === 'table' || p.m1 > p.m2);
      },
    );
  },
  render: (params) => {
    const { a, T } = pulleyOf(params);
    return typed(
      [
        say(`${pulleyScene(params)} ${G_NOTE} Find ${params.find === 'a' ? 'their acceleration, in $\\text{m s}^{-2}$' : 'the tension in the string, in newtons'}.`),
        picture(pulleySvg(params.setup)),
      ],
      `${params.find} =`,
      params.find === 'a' ? a : T,
    );
  },
  solution: (params) => {
    const { m1, m2, setup, mu, find } = params;
    const { a, T } = pulleyOf(params);
    const steps: SolutionStep[] =
      setup === 'hang'
        ? [
            { text: '$A$ is heavier, so it moves down. One equation for each particle:' },
            { tex: aligned(`A: \\; ${fmt(G * m1)} - T &= ${fmt(m1)}a`, `B: \\; T - ${fmt(G * m2)} &= ${fmt(m2)}a`) },
            { text: 'Add them, and $T$ drops out:' },
            { tex: `${fmt(G * (m1 - m2))} = ${fmt(m1 + m2)}a, \\quad a = ${fmt(a)}` },
          ]
        : [
            { text: `One equation for each particle${mu > 0 ? `; friction on $A$ is $\\mu R = ${fmt(mu)} \\times ${fmt(G * m1)} = ${fmt(mu * G * m1)}$` : ''}:` },
            { tex: aligned(`A: \\; T${mu > 0 ? ` - ${fmt(mu * G * m1)}` : ''} &= ${fmt(m1)}a`, `B: \\; ${fmt(G * m2)} - T &= ${fmt(m2)}a`) },
            { text: 'Add them, and $T$ drops out:' },
            { tex: `${fmt(G * m2 - mu * G * m1)} = ${fmt(m1 + m2)}a, \\quad a = ${fmt(a)}` },
          ];
    if (find === 'T') {
      steps.push(
        { text: 'Put $a$ back into either equation:' },
        { tex: setup === 'hang' ? `T = ${fmt(G * m2)} + ${fmt(m2)} \\times ${fmt(a)} = ${fmt(T)}` : `T = ${fmt(m1)} \\times ${fmt(a)} = ${fmt(T)}` },
      );
    }
    return steps;
  },
  choices: (params) => {
    const { m1, m2, setup, mu, find } = params;
    const { a, T } = pulleyOf(params);
    const salt = mix(m1, m2, setup === 'hang' ? 1 : 2, mu * 100, find === 'a' ? 1 : 2);
    if (find === 'a') {
      return setup === 'hang'
        ? valueChoices(a, [G * (m1 - m2), (G * (m1 - m2)) / m1, (G * m2) / (m1 + m2), G], salt)
        : valueChoices(a, [(G * m2) / m1, G, (G * (m2 + mu * m1)) / (m1 + m2), (G * m2) / (m1 + m2)], salt);
    }
    return valueChoices(T, [G * m2, G * m1, G * Math.abs(m1 - m2), m1 * a], salt);
  },
};

interface PulleyTilesParams {
  m1: number;
  m2: number;
  setup: 'hang' | 'table';
  mu: number;
}

/** Tiles: one equation of motion for each particle. */
const pulleyTiles: Generator<PulleyTilesParams> = {
  id: 'force-pulley-tiles',
  sample: (rng, difficulty) =>
    difficulty < 2
      ? until(
          (): PulleyTilesParams => ({ m1: rng.int(2, 15), m2: rng.int(1, 14), setup: 'hang', mu: 0 }),
          ({ m1, m2 }) => m1 > m2,
        )
      : until(
          (): PulleyTilesParams => ({ m1: rng.int(2, 15), m2: rng.int(1, 12), setup: 'table', mu: rng.pick(MUS) }),
          ({ m1, m2, mu }) => m2 > mu * m1,
        ),
  render: (params) => {
    const { m1, m2, setup, mu } = params;
    const hang = setup === 'hang';
    const answer = hang ? [fmt(G * m1), fmt(m1), fmt(G * m2), fmt(m2)] : [fmt(mu * G * m1), fmt(m1), fmt(G * m2), fmt(m2)];
    const extras = hang
      ? [fmt(m1 + m2), fmt(G * (m1 - m2)), fmt(G * (m1 + m2)), fmt(m1 - m2)]
      : [fmt(G * m1), fmt(mu * m1), fmt(m1 + m2), fmt(mu * G * m2)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `${pulleyScene({ ...params, find: 'a' })} ${G_NOTE} Complete the equation of motion for $A$, then for $B$, with forces in newtons and $a$ the acceleration of each.`,
        ),
        picture(pulleySvg(setup)),
      ],
      template: hang ? '{0} - T = {1}a, \\qquad T - {2} = {3}a' : 'T - {0} = {1}a, \\qquad {2} - T = {3}a',
      bank: tileBank(answer, extras),
      answer,
    };
  },
  solution: ({ m1, m2, setup, mu }) =>
    setup === 'hang'
      ? [
          { text: '$A$ is heavier and moves down: its weight wins against the tension. $B$ moves up: the tension wins against its weight.' },
          { tex: aligned(`A: \\; ${fmt(G * m1)} - T &= ${m1}a`, `B: \\; T - ${fmt(G * m2)} &= ${m2}a`) },
        ]
      : [
          { text: `$A$ is pulled along by the tension against friction $\\mu R = ${fmt(mu)} \\times ${fmt(G * m1)}$. $B$ falls: its weight wins against the tension.` },
          { tex: aligned(`A: \\; T - ${fmt(mu * G * m1)} &= ${m1}a`, `B: \\; ${fmt(G * m2)} - T &= ${m2}a`) },
        ],
};

interface TowBarParams {
  M: number;
  m: number;
  a: number;
  r: number;
}

/** Steps: the tension in a tow bar, or the driving force of car and trailer together. */
const towBarSteps: Generator<TowBarParams> = {
  id: 'force-tow-bar-steps',
  sample: (rng, difficulty) => ({
    M: difficulty > 1 ? 100 * rng.int(8, 16) : 0,
    m: 50 * rng.int(4, 16),
    a: rng.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 1, 1.2, 1.5]),
    r: difficulty > 1 ? 50 * rng.int(4, 18) : 25 * rng.int(2, 16),
  }),
  render: ({ M, m, a, r }) => {
    if (M === 0) {
      const ma = m * a;
      return {
        kind: 'steps',
        prompt: [
          say(
            `A trailer of mass $${m}\\text{ kg}$ is towed with acceleration $${fmt(a)}${ACC}$, against a resistance of $${r}\\text{ N}$. The tension $T$ in the tow bar satisfies $T - ${r} = ${m} \\times ${fmt(a)}$. Work out $T$, in newtons: tap the part to do next, then choose what it comes to.`,
          ),
        ],
        start: [fmt(m), '\\times', fmt(a), '+', fmt(r)],
        reductions: [
          { span: [0, 3], operator: 1, value: fmt(ma), bank: stepBank(fmt(ma), fmt(m + a), fmt(m * (a + 1)), fmt(ma * 10)) },
          { span: [0, 3], operator: 1, value: fmt(ma + r), bank: stepBank(fmt(ma + r), fmt(ma - r), fmt(m * (a + r))) },
        ],
      };
    }
    const total = M + m;
    const prod = total * a;
    return {
      kind: 'steps',
      prompt: [
        say(
          `A car of mass $${M}\\text{ kg}$ tows a trailer of mass $${m}\\text{ kg}$ with acceleration $${fmt(a)}${ACC}$, against resistances of $${r}\\text{ N}$ in total. The driving force $D$ satisfies $D - ${r} = (${M} + ${m}) \\times ${fmt(a)}$. Work out $D$, in newtons: tap the part to do next, then choose what it comes to.`,
        ),
      ],
      start: [`(${M}`, '+', `${m})`, '\\times', fmt(a), '+', fmt(r)],
      reductions: [
        { span: [0, 3], operator: 1, value: fmt(total), bank: stepBank(fmt(total), fmt(M - m), fmt(M), fmt(total + 100)) },
        { span: [0, 3], operator: 1, value: fmt(prod), bank: stepBank(fmt(prod), fmt(M * a + m), fmt(M * a), fmt(total + a)) },
        { span: [0, 3], operator: 1, value: fmt(prod + r), bank: stepBank(fmt(prod + r), fmt(prod - r), fmt(M * a + r)) },
      ],
    };
  },
  solution: ({ M, m, a, r }) =>
    M === 0
      ? [
          { text: 'Along the road, the tension pulls the trailer forwards and the resistance holds it back:' },
          { tex: `T = ${m} \\times ${fmt(a)} + ${r} = ${fmt(m * a)} + ${r} = ${fmt(m * a + r)}` },
        ]
      : [
          { text: 'For car and trailer together the tow bar is internal, so only the driving force and the resistances count:' },
          { tex: `D = ${M + m} \\times ${fmt(a)} + ${r} = ${fmt((M + m) * a)} + ${r} = ${fmt((M + m) * a + r)}` },
        ],
};

/* ================================================================
 * Level 2, lesson 3: motion on a slope
 * ================================================================ */

interface SlopeMotionParams {
  m: number;
  t: Angle;
  mu: number;
  /** The pull up the slope; 0 for a particle released from rest. */
  P: number;
  a: number;
  hard: boolean;
}

/** Acceleration down (released) or up (pulled) the slope, with friction where mu > 0. */
export function slopeAcceleration({ m, t, mu, P }: SlopeMotionParams): number {
  const W = G * m;
  const friction = mu * W * cosOf(t);
  return P === 0 ? (W * sinOf(t) - friction) / m : (P - W * sinOf(t) - friction) / m;
}

/** A particle released on a slope, or pulled up it with a nice acceleration. */
function sampleSlopeMotion(rng: Rng, hard: boolean, pulledShare = 0.5): SlopeMotionParams {
  return until(
    (): SlopeMotionParams => {
      const m = rng.int(2, 12);
      const t = rng.pick(hard ? [A34, A43, A724, A247] : [A34, A43]);
      const mu = hard ? rng.pick(MUS) : 0;
      if (rng.chance(pulledShare)) {
        const a = rng.pick(A_VALUES);
        const P = m * a + G * m * (sinOf(t) + mu * cosOf(t));
        return { m, t, mu, P, a, hard };
      }
      return { m, t, mu, P: 0, a: G * (sinOf(t) - mu * cosOf(t)), hard };
    },
    (p) => p.a > 0 && exact(p.P, 4) && exact(p.a, 4),
  );
}

function slopeMotionScene({ m, t, mu, P, hard }: SlopeMotionParams): string {
  const surface = mu > 0 ? `a rough slope, with $\\mu = ${fmt(mu)}$,` : 'a smooth slope';
  return P === 0
    ? `A particle of mass $${m}\\text{ kg}$ is released from rest on ${surface} inclined at $\\alpha$ to the horizontal, where ${angleFacts(t, hard)}.`
    : `A particle of mass $${m}\\text{ kg}$ is pulled up ${surface} inclined at $\\alpha$ to the horizontal, where ${angleFacts(t, hard)}, by a force of $${fmt(P)}\\text{ N}$ parallel to the slope.`;
}

/** Expression: the acceleration of a particle on a slope. */
const slopeAccel: Generator<SlopeMotionParams> = {
  id: 'force-slope-accel',
  sample: (rng, difficulty) => sampleSlopeMotion(rng, difficulty > 1),
  render: (params) =>
    typed(
      [
        say(`${slopeMotionScene(params)} ${G_NOTE} Find its acceleration ${params.P === 0 ? 'down' : 'up'} the slope, in $\\text{m s}^{-2}$.`),
        picture(slopeSvg(params.t, { friction: params.mu > 0, pull: params.P > 0 ? 'along' : undefined })),
      ],
      'a =',
      slopeAcceleration(params),
    ),
  solution: (params) => {
    const { m, t, mu, P, hard } = params;
    const W = G * m;
    const R = W * cosOf(t);
    const a = slopeAcceleration(params);
    const friction = mu * R;
    return [
      ...angleStep(t, hard),
      ...(mu > 0 ? [{ tex: `R = ${fmt(W)}\\cos\\alpha = ${fmt(R)}, \\quad F = \\mu R = ${fmt(friction)}` }] : []),
      {
        tex:
          P === 0
            ? `${fmt(W)}\\sin\\alpha${mu > 0 ? ` - ${fmt(friction)}` : ''} = ${m}a`
            : `${fmt(P)} - ${fmt(W)}\\sin\\alpha${mu > 0 ? ` - ${fmt(friction)}` : ''} = ${m}a`,
      },
      { tex: `a = \\frac{${fmt(m * a)}}{${m}} = ${fmt(a)}` },
      ...(P === 0 && mu === 0 ? [{ text: 'The mass cancels: every particle slides down a smooth slope with $g\\sin\\alpha$.' }] : []),
    ];
  },
  choices: (params) => {
    const { m, t, mu, P } = params;
    const a = slopeAcceleration(params);
    const W = G * m;
    const salt = mix(m, t.o, mu * 100, Math.round(P * 100));
    return P === 0
      ? valueChoices(a, [G * cosOf(t), G, G * (sinOf(t) + mu * cosOf(t)), G * sinOf(t)], salt)
      : valueChoices(a, [P / m, (P - W * sinOf(t)) / m, (P + W * sinOf(t)) / m, (P - W) / m], salt);
  },
};

/** Tree: R, friction, the resultant along the slope, then the acceleration. */
const slopeTree: Generator<SlopeMotionParams> = {
  id: 'force-slope-tree',
  sample: (rng, difficulty) =>
    until(
      () => sampleSlopeMotion(rng, true, difficulty > 1 ? 1 : 0),
      (p) => p.mu > 0,
    ),
  render: (params) => {
    const { m, t, mu, P } = params;
    const W = G * m;
    const R = W * cosOf(t);
    const F = mu * R;
    const a = slopeAcceleration(params);
    const net = m * a;
    const answer = [R, F, net, a];
    return {
      kind: 'tree',
      prompt: [
        say(`${slopeMotionScene({ ...params, hard: false })} ${G_NOTE}`),
        say(
          `Top row: the normal reaction $R$. Then the friction, at its greatest since the particle is moving. Then the resultant force ${P === 0 ? 'down' : 'up'} the slope. Then the acceleration. Forces in newtons, the acceleration in $\\text{m s}^{-2}$.`,
        ),
      ],
      expression: 'F = \\mu R',
      nodes: [
        { id: 'r', from: [] },
        { id: 'f', from: ['r'] },
        { id: 'net', from: ['f'] },
        { id: 'a', from: ['net'] },
      ],
      bank: valueBank(answer, [W, W * sinOf(t), mu * W, net + 2 * F, G * sinOf(t)].filter((v) => exact(v, 4))),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { m, t, mu, P } = params;
    const W = G * m;
    const R = W * cosOf(t);
    const F = mu * R;
    const a = slopeAcceleration(params);
    return [
      { tex: `R = ${fmt(W)} \\times ${fmt(cosOf(t))} = ${fmt(R)}` },
      { tex: `F = ${fmt(mu)} \\times ${fmt(R)} = ${fmt(F)}` },
      {
        tex:
          P === 0
            ? `${fmt(W)} \\times ${fmt(sinOf(t))} - ${fmt(F)} = ${fmt(m * a)}`
            : `${fmt(P)} - ${fmt(W)} \\times ${fmt(sinOf(t))} - ${fmt(F)} = ${fmt(m * a)}`,
      },
      { tex: `a = \\frac{${fmt(m * a)}}{${m}} = ${fmt(a)}` },
    ];
  },
};

interface SlopeFlowParams {
  m: number;
  t: Angle;
  mu: number;
  /** A push up the slope, for the hard form; 0 for none. */
  P: number;
}

const SLOPE_MUS = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.8, 0.9, 1];

/** Which way it would go without friction, how hard, and the greatest friction. */
export function slopeTendency({ m, t, mu, P }: SlopeFlowParams): { dir: 'up' | 'down'; push: number; max: number } {
  const along = G * m * sinOf(t);
  return { dir: P > along ? 'up' : 'down', push: Math.abs(P - along), max: mu * G * m * cosOf(t) };
}

/** Flow: does a particle on a rough slope move, and which way? */
const slopeFlow: Generator<SlopeFlowParams> = {
  id: 'force-slope-flow',
  sample: (rng, difficulty) =>
    until(
      (): SlopeFlowParams => {
        const m = rng.int(2, 15);
        const t = rng.pick([A34, A43]);
        const mu = rng.pick(SLOPE_MUS);
        if (difficulty < 2) return { m, t, mu, P: 0 };
        const W = G * m;
        const sign = rng.sign();
        const side = rng.pick(['over', 'under', 'equal']);
        const factor = side === 'equal' ? 1 : side === 'over' ? rng.float(1.3, 1.9) : rng.float(0.2, 0.7);
        const raw = W * sinOf(t) + sign * factor * mu * W * cosOf(t);
        return { m, t, mu, P: side === 'equal' ? raw : Math.round(raw) };
      },
      (p) => {
        const { push, max } = slopeTendency(p);
        return (difficulty < 2 || p.P > 0) && exact(p.P, 4) && exact(push, 4) && (Math.abs(push - max) < 1e-9 || Math.abs(push - max) > 0.5) && push > 0;
      },
    ),
  render: (params) => {
    const { m, t, mu, P } = params;
    const { dir, push, max } = slopeTendency(params);
    const W = G * m;
    const labels = [...new Set([max, mu * W, mu * W * sinOf(t), W * cosOf(t)].filter((v) => exact(v, 4)).map(fmt))]
      .slice(0, 3)
      .sort((x, y) => Number(x) - Number(y));
    const cmp = Math.abs(push - max) < 1e-9 ? 'They are equal' : push > max ? 'It is bigger' : 'It is smaller';
    const hard = P > 0;
    const steps = [
      ...(hard
        ? [
            {
              id: 'dir',
              ask: 'Without friction, which way would the particle move?',
              branches: [
                { label: 'Up the slope', to: 'max' },
                { label: 'Down the slope', to: 'max' },
              ],
            },
          ]
        : []),
      {
        id: 'max',
        ask: 'What is the greatest friction, $\\mu R$, in newtons?',
        branches: labels.map((label) => ({ label: `$${label}$`, to: 'cmp' })),
      },
      {
        id: 'cmp',
        ask: hard
          ? 'Compare the resultant of $P$ and $mg\\sin\\alpha$ with $\\mu R$.'
          : 'Compare the pull down the slope, $mg\\sin\\alpha$, with $\\mu R$.',
        branches: [
          { label: 'It is bigger', outcome: 'So friction cannot hold it: the particle slides.' },
          { label: 'It is smaller', outcome: 'So friction holds it: the particle stays at rest, with friction less than $\\mu R$.' },
          { label: 'They are equal', outcome: 'So the particle is in limiting equilibrium: on the point of moving.' },
        ],
      },
    ];
    return {
      kind: 'flow',
      prompt: [
        say(
          `A particle of mass $${m}\\text{ kg}$ is placed at rest on a rough slope inclined at $\\alpha$ to the horizontal, where ${angleFacts(t, false)}, with $\\mu = ${fmt(mu)}$.${hard ? ` A force $P$ of $${fmt(P)}\\text{ N}$ pushes it up the slope, parallel to it.` : ''} ${G_NOTE} Does it move?`,
        ),
      ],
      subject: 'F \\le \\mu R',
      steps,
      answer: [...(hard ? [dir === 'up' ? 'Up the slope' : 'Down the slope'] : []), `$${fmt(max)}$`, cmp],
    };
  },
  solution: (params) => {
    const { m, t, P } = params;
    const { dir, push, max } = slopeTendency(params);
    const W = G * m;
    return [
      { tex: `R = ${fmt(W)}\\cos\\alpha = ${fmt(W * cosOf(t))}, \\quad \\mu R = ${fmt(max)}` },
      { tex: `mg\\sin\\alpha = ${fmt(W * sinOf(t))}` },
      ...(P > 0 ? [{ text: `$P$ is ${dir === 'up' ? 'bigger' : 'smaller'}, so without friction it would move ${dir} the slope, pushed by $${fmt(push)}\\text{ N}$.` }] : []),
      { text: `Friction can give at most $${fmt(max)}$, and the particle is pushed with $${fmt(push)}$: ${compareWords(push, max)} $\\mu R$.` },
    ];
  },
};

interface SlopeSliderParams {
  t: Angle;
  dir: 'down' | 'up';
  /** mu as a whole number of sixths (for tan 4/3) or of eighths (for tan 3/4). */
  parts: number;
  hard: boolean;
}

/** Every case whose acceleration lands on a multiple of 0.98, the slider's lattice. */
const SLOPE_SLIDER_CASES: Omit<SlopeSliderParams, 'hard'>[] = [
  ...[0, 1, 2, 3, 4, 5].map((parts) => ({ t: A34, dir: 'down' as const, parts })),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((parts) => ({ t: A34, dir: 'up' as const, parts })),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((parts) => ({ t: A43, dir: 'down' as const, parts })),
  ...[1, 2, 3, 4, 5, 6].map((parts) => ({ t: A43, dir: 'up' as const, parts })),
];

/** mu for a slider case: eighths on the shallow slope, sixths on the steep one. */
export const sliderMu = ({ t, parts }: Pick<SlopeSliderParams, 't' | 'parts'>): number => parts / (t === A34 ? 8 : 6);

function sliderMuTex(params: Pick<SlopeSliderParams, 't' | 'parts'>): string {
  const mu = sliderMu(params);
  if (params.t === A34) return fmt(mu);
  if (Number.isInteger(mu)) return fmt(mu);
  const g = gcdOf(params.parts, 6);
  return `\\tfrac{${params.parts / g}}{${6 / g}}`;
}

function gcdOf(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcdOf(b, a % b);
}

/** The size of the acceleration: down the slope when released, the deceleration when sent up it. */
export const sliderAcceleration = (params: Pick<SlopeSliderParams, 't' | 'dir' | 'parts'>): number => {
  const mu = sliderMu(params);
  return G * (sinOf(params.t) + (params.dir === 'up' ? 1 : -1) * mu * cosOf(params.t));
};

/** Slider: the acceleration on a slope, read against mu. */
const slopeSlider: Generator<SlopeSliderParams> = {
  id: 'force-slope-slider',
  sample: (rng, difficulty) => ({ ...rng.pick(SLOPE_SLIDER_CASES), hard: difficulty > 1 }),
  render: (params) => {
    const { t, dir, hard } = params;
    const smooth = params.parts === 0;
    const surface = smooth ? 'a smooth slope' : `a rough slope with $\\mu = ${sliderMuTex(params)}$`;
    const s = sinOf(t);
    const c = cosOf(t);
    return {
      kind: 'slider',
      prompt: [
        say(
          dir === 'down'
            ? `A particle slides down ${surface}, inclined at $\\alpha$ to the horizontal, where ${angleFacts(t, hard)}. ${G_NOTE} Slide the line to its acceleration, in $\\text{m s}^{-2}$.`
            : `A particle is sent up ${surface}, inclined at $\\alpha$ to the horizontal, where ${angleFacts(t, hard)}. ${G_NOTE} While it moves up, it slows down: slide the line to the size of its deceleration, in $\\text{m s}^{-2}$.`,
        ),
        say(`The graph shows how that ${dir === 'down' ? 'acceleration' : 'deceleration'} would change with $\\mu$ on this slope.`),
      ],
      min: 0,
      max: 14,
      step: 0.14,
      answer: sliderAcceleration(params),
      readout: dir === 'down' ? 'a = {v}' : '\\text{deceleration} = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 1.25,
          yMin: 0,
          yMax: 14,
          curves: [{ f: (x) => Math.max(0, G * (s + (dir === 'up' ? 1 : -1) * x * c)) }],
          label: `The ${dir === 'down' ? 'acceleration' : 'deceleration'} against the coefficient of friction, a straight line`,
        }),
        ...markerWindow(0, 14, 'y'),
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { t, dir, hard } = params;
    const mu = sliderMu(params);
    const a = sliderAcceleration(params);
    return [
      ...angleStep(t, hard),
      {
        text:
          dir === 'down'
            ? 'Down the slope, gravity pulls with $mg\\sin\\alpha$ and friction holds back with $\\mu mg\\cos\\alpha$. The mass cancels:'
            : 'Going up, gravity and friction both act down the slope, so both slow it. The mass cancels:',
      },
      { tex: `a = 9.8(${fmt(sinOf(t))} ${dir === 'up' ? '+' : '-'} ${sliderMuTex(params)} \\times ${fmt(cosOf(t))}) = ${fmt(a)}` },
      ...(mu === 0 ? [] : [{ text: `On the graph, that is the height of the line at $\\mu = ${sliderMuTex(params)}$.` }]),
    ];
  },
};

/* ================================================================
 * Level 2, lesson 4: Newton's third law
 * ================================================================ */

const RESTING = ['book', 'box', 'vase', 'laptop', 'parcel', 'suitcase', 'plant pot', 'bag'];
const SUPPORTS = ['table', 'shelf', 'floor', 'bench', 'desk'];
const HANGING = ['lamp', 'sign', 'bucket', 'basket', 'picture', 'bird feeder'];
const HOLDERS = ['string', 'rope', 'chain', 'cable', 'wire'];

type PairKind = 'restWeight' | 'restContact' | 'hangTension' | 'hangWeight' | 'motion';

interface PairParams {
  kind: PairKind;
  thing: string;
  holder: string;
  m: number;
  /** Which of the moving scenes, for kind 'motion'. */
  scene: number;
  P: number;
}

/** A force in words, a Newton's third law partner, and three believable wrong answers. */
interface PairScene {
  given: string;
  partner: string;
  slips: string[];
}

const N = (v: number): string => `${fmt(v)} N`;

/** Scenes with something moving, where the two forces do not balance anything. */
const MOTION_SCENES: ((P: number, m: number) => PairScene)[] = [
  (P) => ({
    given: `A swimmer pushes the water backwards with a force of ${N(P)}.`,
    partner: `The water pushes the swimmer forwards with ${N(P)}`,
    slips: [`The water pushes the swimmer backwards with ${N(P)}`, `The swimmer pushes the water forwards with ${N(P)}`, `The water pushes the swimmer forwards with less than ${N(P)}`],
  }),
  (P) => ({
    given: `A car's tyres push backwards on the road with a force of ${N(P)}.`,
    partner: `The road pushes forwards on the tyres with ${N(P)}`,
    slips: [`The road pushes backwards on the tyres with ${N(P)}`, `The tyres push forwards on the road with ${N(P)}`, `The road pushes forwards on the tyres with more than ${N(P)}`],
  }),
  (P) => ({
    given: `A rocket's engine pushes its exhaust gas downwards with a force of ${N(P)}.`,
    partner: `The gas pushes the rocket upwards with ${N(P)}`,
    slips: [`The Earth pulls the rocket downwards with ${N(P)}`, `The gas pushes the rocket downwards with ${N(P)}`, `The gas pushes the rocket upwards with less than ${N(P)}`],
  }),
  (P) => ({
    given: `A skater pushes on a wall with a force of ${N(P)}.`,
    partner: `The wall pushes back on the skater with ${N(P)}`,
    slips: ['The wall pushes back with no force, since it does not move', `The skater's skates push on the ice with ${N(P)}`, `The wall pushes back on the skater with less than ${N(P)}`],
  }),
  (P) => ({
    given: `A tow rope pulls a barge forwards with a force of ${N(P)}.`,
    partner: `The barge pulls the rope backwards with ${N(P)}`,
    slips: [`The water holds the barge back with ${N(P)}`, `The barge pulls the rope forwards with ${N(P)}`, `The barge pulls the rope backwards with less than ${N(P)}`],
  }),
  (P) => ({
    given: `A hammer hits a nail with a force of ${N(P)}.`,
    partner: `The nail pushes back on the hammer with ${N(P)}`,
    slips: [`The nail pushes back on the hammer with less than ${N(P)}`, `The wood pushes back on the nail with ${N(P)}`, `The hammer's handle pushes on the head with ${N(P)}`],
  }),
  (P) => ({
    given: `A magnet pulls a steel pin towards it with a force of ${N(P)}.`,
    partner: `The pin pulls the magnet towards it with ${N(P)}`,
    slips: [`The pin pulls the magnet towards it with less than ${N(P)}`, `The magnet pushes the pin away with ${N(P)}`, `The Earth pulls the pin down with ${N(P)}`],
  }),
  (P, m) => ({
    given: `In a lift accelerating upwards, the floor pushes up on a ${m} kg passenger with a force of ${N(P)}.`,
    partner: `The passenger pushes down on the floor with ${N(P)}`,
    slips: [`The Earth pulls the passenger down with ${N(P)}`, `The passenger pushes down on the floor with ${N(G * m)}`, `The passenger pulls the Earth up with ${N(P)}`],
  }),
];

export function pairScene({ kind, thing, holder, m, scene, P }: PairParams): PairScene {
  const W = N(G * m);
  switch (kind) {
    case 'restWeight':
      return {
        given: `A ${m} kg ${thing} rests on a ${holder}. The Earth pulls the ${thing} down with its weight, ${W}.`,
        partner: `The ${thing} pulls the Earth up with ${W}`,
        slips: [`The ${holder} pushes the ${thing} up with ${W}`, `The ${thing} pushes the ${holder} down with ${W}`, `The ${thing} pulls the Earth down with ${W}`],
      };
    case 'restContact':
      return {
        given: `A ${m} kg ${thing} rests on a ${holder}. The ${holder} pushes up on the ${thing} with ${W}.`,
        partner: `The ${thing} pushes down on the ${holder} with ${W}`,
        slips: [`The Earth pulls the ${thing} down with ${W}`, `The ${thing} pulls the Earth up with ${W}`, `The ${holder} pushes down on the ${thing} with ${W}`],
      };
    case 'hangTension':
      return {
        given: `A ${m} kg ${thing} hangs at rest from a ${holder}. The ${holder} pulls up on the ${thing} with ${W}.`,
        partner: `The ${thing} pulls down on the ${holder} with ${W}`,
        slips: [`The Earth pulls the ${thing} down with ${W}`, `The ${thing} pulls the Earth up with ${W}`, `The ${holder} pulls down on the ${thing} with ${W}`],
      };
    case 'hangWeight':
      return {
        given: `A ${m} kg ${thing} hangs at rest from a ${holder}. The Earth pulls the ${thing} down with its weight, ${W}.`,
        partner: `The ${thing} pulls the Earth up with ${W}`,
        slips: [`The ${holder} pulls up on the ${thing} with ${W}`, `The ${thing} pulls down on the ${holder} with ${W}`, `The ${thing} pulls the Earth down with ${W}`],
      };
    case 'motion':
      return MOTION_SCENES[scene](P, m);
  }
}

function samplePair(rng: Rng, hard: boolean): PairParams {
  const kind = hard ? 'motion' : rng.pick<PairKind>(['restWeight', 'restContact', 'hangTension', 'hangWeight']);
  const hangs = kind === 'hangTension' || kind === 'hangWeight';
  const m = rng.int(1, 30) / (rng.chance(0.3) ? 2 : 1);
  const scene = rng.int(0, MOTION_SCENES.length - 1);
  // The lift scene needs the floor to push harder than the weight.
  const P = scene === MOTION_SCENES.length - 1 ? m * (G + rng.pick([0.5, 1, 1.2, 2])) : 10 * rng.int(2, 150);
  return { kind, thing: rng.pick(hangs ? HANGING : RESTING), holder: rng.pick(hangs ? HOLDERS : SUPPORTS), m, scene, P };
}

/** Choice, in words: the Newton's third law partner of a force. */
const pairChoice: Generator<PairParams> = {
  id: 'force-pair-choice',
  sample: (rng, difficulty) => samplePair(rng, difficulty > 1),
  render: (params) => {
    const { given, partner, slips } = pairScene(params);
    return choiceSlide(
      [say(`${given} Which force pairs with it under Newton's third law?`)],
      options({ tex: partner }, ...slips.map((tex) => ({ tex }))),
      false,
    );
  },
  solution: (params) => {
    const { partner } = pairScene(params);
    return [
      { text: 'A third-law partner acts on the other object, is the same kind of force, and is equal in size and opposite in direction.' },
      { text: `${partner}.` },
      { text: 'A force that balances this one acts on the same object, so it is never its partner.' },
    ];
  },
};

type PairFlowCase = 'pair' | 'same' | 'kind';

interface PairFlowParams extends PairParams {
  verdict: PairFlowCase;
}

/** Two forces in words, as a pair, as two forces on one object, or as two kinds of force. */
function pairFlowForces(params: PairFlowParams): [string, string] {
  const { verdict, thing, holder, m, P } = params;
  const W = N(G * m);
  if (params.kind === 'motion') {
    const on = `The water pushes the swimmer forwards with ${N(P)}`;
    if (verdict === 'pair') return [`The swimmer pushes the water backwards with ${N(P)}`, on];
    if (verdict === 'same') return [on, `Drag from the water holds the swimmer back with ${N(P)}`];
    return [`The Earth pulls the swimmer down with ${W}`, `The swimmer pushes the water backwards with ${N(P)}`];
  }
  const hangs = params.kind === 'hangTension' || params.kind === 'hangWeight';
  const up = hangs ? `The ${holder} pulls up on the ${thing} with ${W}` : `The ${holder} pushes up on the ${thing} with ${W}`;
  const down = hangs ? `The ${thing} pulls down on the ${holder} with ${W}` : `The ${thing} pushes down on the ${holder} with ${W}`;
  const weight = `The Earth pulls the ${thing} down with ${W}`;
  if (verdict === 'pair') return params.kind === 'restWeight' || params.kind === 'hangWeight' ? [weight, `The ${thing} pulls the Earth up with ${W}`] : [up, down];
  if (verdict === 'same') return [weight, up];
  return [weight, down];
}

/** Flow: are two forces a Newton's third law pair? */
const pairFlow: Generator<PairFlowParams> = {
  id: 'force-pair-flow',
  sample: (rng, difficulty) => ({ ...samplePair(rng, difficulty > 1), P: 10 * rng.int(2, 150), verdict: rng.pick<PairFlowCase>(['pair', 'same', 'kind']) }),
  render: (params) => {
    const [a, b] = pairFlowForces(params);
    const { thing, holder, m } = params;
    const scene =
      params.kind === 'motion'
        ? `A ${m} kg swimmer is moving through the water.`
        : `A ${m} kg ${thing} ${params.kind === 'hangTension' || params.kind === 'hangWeight' ? 'hangs at rest from a' : 'rests on a'} ${holder}.`;
    return {
      kind: 'flow',
      prompt: [say(`${scene} Force A: ${a}. Force B: ${b}. Are A and B a Newton's third law pair?`)],
      subject: '\\text{Force A and force B}',
      steps: [
        {
          id: 'objects',
          ask: 'Do the two forces act on different objects?',
          branches: [
            { label: 'Yes', to: 'kind' },
            { label: 'No', outcome: 'Not a pair: both act on the same object, so at most they balance each other.' },
          ],
        },
        {
          id: 'kind',
          ask: 'Are they the same kind of force: both gravity, or both contact?',
          branches: [
            { label: 'Yes', to: 'size' },
            { label: 'No', outcome: 'Not a pair: the two forces of a pair are always the same kind.' },
          ],
        },
        {
          id: 'size',
          ask: 'Are they equal in size and opposite in direction?',
          branches: [
            { label: 'Yes', outcome: "A Newton's third law pair." },
            { label: 'No', outcome: 'Not a pair.' },
          ],
        },
      ],
      answer: params.verdict === 'pair' ? ['Yes', 'Yes', 'Yes'] : params.verdict === 'same' ? ['No'] : ['Yes', 'No'],
    };
  },
  solution: (params) => {
    const [a, b] = pairFlowForces(params);
    const why =
      params.verdict === 'pair'
        ? 'They act on different objects, are the same kind of force, and are equal and opposite: a pair.'
        : params.verdict === 'same'
          ? 'Both act on the same object. Forces that balance on one object are never a third-law pair.'
          : 'They act on different objects, but one is gravity and the other a contact force, so they cannot be a pair.';
    return [{ text: `A: ${a}. B: ${b}.` }, { text: why }];
  },
};

interface PushParams {
  m1: number;
  m2: number;
  a: number;
  r1: number;
  r2: number;
}

/** The push on A, and the contact force between the boxes. */
export function pushForces({ m1, m2, a, r1, r2 }: PushParams): { P: number; R: number } {
  return { P: (m1 + m2) * a + r1 + r2, R: m2 * a + r2 };
}

function samplePush(rng: Rng, hard: boolean): PushParams {
  return { m1: rng.int(1, 12), m2: rng.int(1, 12), a: rng.pick(A_VALUES), r1: hard ? rng.int(1, 20) : 0, r2: hard ? rng.int(1, 20) : 0 };
}

function pushScene(params: PushParams): string {
  const { m1, m2, r1 } = params;
  const { P } = pushForces(params);
  return `Two boxes, $A$ of mass $${m1}\\text{ kg}$ and $B$ of mass $${m2}\\text{ kg}$, sit side by side on a ${r1 > 0 ? 'rough' : 'smooth'} horizontal floor${r1 > 0 ? `, with resistances of $${params.r1}\\text{ N}$ on $A$ and $${params.r2}\\text{ N}$ on $B$` : ''}. A horizontal force of $${fmt(P)}\\text{ N}$ pushes $A$, and $A$ pushes $B$ along in front of it.`;
}

/** Tree: the acceleration, then the force of A on B and of B on A. */
const pushTree: Generator<PushParams> = {
  id: 'force-push-tree',
  sample: (rng, difficulty) => samplePush(rng, difficulty > 1),
  render: (params) => {
    const { m1, a } = params;
    const { P, R } = pushForces(params);
    return {
      kind: 'tree',
      prompt: [
        say(pushScene(params)),
        say('Top row: their acceleration, in $\\text{m s}^{-2}$. Then the force $A$ exerts on $B$. Then the force $B$ exerts on $A$. Forces in newtons.'),
      ],
      expression: '\\text{A on B, then B on A}',
      nodes: [
        { id: 'a', from: [] },
        { id: 'ab', from: ['a'] },
        { id: 'ba', from: ['ab'] },
      ],
      bank: valueBank([a, R, R], [m1 * a, P, P - R, P / 2].filter((v) => exact(v, 4))),
      answer: [a, R, R].map(fmt),
    };
  },
  solution: (params) => {
    const { m1, m2, a, r1, r2 } = params;
    const { P, R } = pushForces(params);
    return [
      { text: 'Both boxes together: the force between them is internal and drops out.' },
      { tex: `${fmt(P)}${r1 > 0 ? ` - ${r1} - ${r2}` : ''} = ${m1 + m2}a, \\quad a = ${fmt(a)}` },
      { text: `$B$ alone: the only force pushing it forwards is $A$.` },
      { tex: `R${r2 > 0 ? ` - ${r2}` : ''} = ${m2} \\times ${fmt(a)}, \\quad R = ${fmt(R)}` },
      { text: "By Newton's third law, $B$ pushes back on $A$ with the same force, in the opposite direction." },
    ];
  },
};

/** Expression: the force between two boxes pushed along together. */
const contact: Generator<PushParams> = {
  id: 'force-contact',
  sample: (rng, difficulty) => samplePush(rng, difficulty > 1),
  render: (params) => typed([say(`${pushScene(params)} Find the force between the boxes, in newtons.`)], 'R =', pushForces(params).R),
  solution: (params) => {
    const { m1, m2, a, r1, r2 } = params;
    const { P, R } = pushForces(params);
    return [
      { text: 'First the acceleration of both boxes together:' },
      { tex: `${fmt(P)}${r1 > 0 ? ` - ${r1} - ${r2}` : ''} = ${m1 + m2}a, \\quad a = ${fmt(a)}` },
      { text: 'Then $B$ alone, pushed by $A$:' },
      { tex: `R${r2 > 0 ? ` - ${r2}` : ''} = ${m2} \\times ${fmt(a)}, \\quad R = ${fmt(R)}` },
    ];
  },
  choices: (params) => {
    const { m1, m2, a, r1, r2 } = params;
    const { P, R } = pushForces(params);
    return valueChoices(R, r1 > 0 ? [m2 * a, m1 * a + r1, P - r2] : [m1 * a, P, P / 2], mix(m1, m2, a * 2, r1, r2));
  },
};

/* ================================================================
 * Level 2, lesson 5: lifts
 * ================================================================ */

const LIFT_A = [0.2, 0.5, 0.8, 1, 1.2, 1.5, 2, 2.5];

/** A lift's motion in words, and the sign of its acceleration with up positive. */
const LIFT_MOTIONS: { words: string; sign: number }[] = [
  { words: 'moving upwards and speeding up', sign: 1 },
  { words: 'moving upwards and slowing down', sign: -1 },
  { words: 'moving downwards and speeding up', sign: -1 },
  { words: 'moving downwards and slowing down', sign: 1 },
];

interface LiftParams {
  m: number;
  /** Upwards positive. */
  a: number;
  find: 'R' | 'a';
  /** Which of `LIFT_MOTIONS` describes it, or -1 for plain "accelerating upwards". */
  motion: number;
}

function liftWords({ a, motion }: Pick<LiftParams, 'a' | 'motion'>): string {
  const size = `$${fmt(Math.abs(a))}${ACC}$`;
  return motion < 0
    ? `accelerating ${a > 0 ? 'upwards' : 'downwards'} at ${size}`
    : `${LIFT_MOTIONS[motion].words}, with an acceleration of size ${size}`;
}

/** Expression: the reaction on a passenger in a lift, or the lift's acceleration. */
const lift: Generator<LiftParams> = {
  id: 'force-lift',
  sample: (rng, difficulty) => {
    const m = 5 * rng.int(8, 20);
    const size = rng.pick(LIFT_A);
    if (difficulty < 2) return { m, a: size * rng.sign(), find: 'R', motion: -1 };
    const motion = rng.int(0, LIFT_MOTIONS.length - 1);
    return { m, a: size * LIFT_MOTIONS[motion].sign, find: rng.pick<'R' | 'a'>(['R', 'a']), motion };
  },
  render: ({ m, a, find, motion }) => {
    const R = m * (G + a);
    return find === 'R'
      ? typed(
          [say(`A passenger of mass $${m}\\text{ kg}$ stands in a lift ${liftWords({ a, motion })}. ${G_NOTE} Find the reaction $R$ of the floor on the passenger, in newtons.`)],
          'R =',
          R,
        )
      : typed(
          [
            say(
              `A passenger of mass $${m}\\text{ kg}$ stands on scales in a lift. The scales read $${fmt(R)}\\text{ N}$. ${G_NOTE} Find the lift's acceleration, in $\\text{m s}^{-2}$, taking upwards as positive.`,
            ),
          ],
          'a =',
          a,
        );
  },
  solution: ({ m, a, find, motion }) => {
    const R = m * (G + a);
    const steps: SolutionStep[] = [];
    if (motion >= 0) {
      steps.push({
        text: `${LIFT_MOTIONS[motion].words[0].toUpperCase()}${LIFT_MOTIONS[motion].words.slice(1)} means the acceleration points ${a > 0 ? 'up' : 'down'}: $a = ${fmt(a)}$ with up positive.`,
      });
    }
    steps.push({ text: 'Upwards, the resultant force on the passenger is $R - mg$:' });
    if (find === 'R') {
      steps.push({ tex: `R - ${fmt(G * m)} = ${m} \\times ${paren(a)}, \\quad R = ${fmt(R)}` });
    } else {
      steps.push({ tex: `${fmt(R)} - ${fmt(G * m)} = ${m}a` }, { tex: `a = ${fmt(R - G * m)} \\div ${m} = ${fmt(a)}` });
      steps.push({ text: a > 0 ? 'Positive: the acceleration is upwards.' : 'Negative: the acceleration is downwards.' });
    }
    return steps;
  },
  choices: ({ m, a, find }) => {
    const R = m * (G + a);
    return find === 'R'
      ? valueChoices(R, [m * (G - a), G * m, m * Math.abs(a)], mix(m, a * 10, 1))
      : valueChoices(a, [-a, R / m, (R - G * m) / G], mix(m, a * 10, 2));
  },
};

const LIFT_FLOW_MOTIONS: { words: string; acc: 'Upwards' | 'Downwards' | 'Not accelerating' }[] = [
  { words: 'moving upwards and speeding up', acc: 'Upwards' },
  { words: 'moving upwards at a steady speed', acc: 'Not accelerating' },
  { words: 'moving upwards and slowing down', acc: 'Downwards' },
  { words: 'moving downwards and speeding up', acc: 'Downwards' },
  { words: 'moving downwards at a steady speed', acc: 'Not accelerating' },
  { words: 'moving downwards and slowing down', acc: 'Upwards' },
  { words: 'standing still at a floor', acc: 'Not accelerating' },
];

interface LiftFlowParams {
  m: number;
  motion: number;
  size: number;
  hard: boolean;
}

/** Flow: which way the lift accelerates, then how the reaction compares with the weight. */
const liftFlow: Generator<LiftFlowParams> = {
  id: 'force-lift-flow',
  sample: (rng, difficulty) => ({ m: 5 * rng.int(8, 20), motion: rng.int(0, LIFT_FLOW_MOTIONS.length - 1), size: rng.pick(LIFT_A), hard: difficulty > 1 }),
  render: ({ m, motion, size, hard }) => {
    const { words, acc } = LIFT_FLOW_MOTIONS[motion];
    const moving = acc !== 'Not accelerating';
    const sign = acc === 'Upwards' ? 1 : acc === 'Downwards' ? -1 : 0;
    const R = m * (G + sign * size);
    const cmp = sign > 0 ? 'More than their weight' : sign < 0 ? 'Less than their weight' : 'Equal to their weight';
    const values = [m * (G + size), m * (G - size), G * m].map(fmt).sort((x, y) => Number(x) - Number(y));
    const toValue = hard ? { to: 'value' } : null;
    const end = (label: string, outcome: string) => (toValue ? { label, ...toValue } : { label, outcome });
    return {
      kind: 'flow',
      prompt: [
        say(
          `A passenger of mass $${m}\\text{ kg}$ stands in a lift that is ${words}${hard && moving ? `, with an acceleration of size $${fmt(size)}${ACC}$` : ''}.${hard && !moving ? ` A moment later it will change speed at $${fmt(size)}${ACC}$, but not yet.` : ''}${hard ? ` ${G_NOTE}` : ''} How hard does the floor push on the passenger?`,
        ),
      ],
      subject: 'R - mg = ma',
      steps: [
        {
          id: 'acc',
          ask: 'Which way is the lift accelerating?',
          branches: ['Upwards', 'Downwards', 'Not accelerating'].map((label) => ({ label, to: 'cmp' })),
        },
        {
          id: 'cmp',
          ask: 'So the floor pushes up on the passenger with a force $R$ that is',
          branches: [
            end('More than their weight', 'The resultant force is upwards, so $R$ beats the weight.'),
            end('Less than their weight', 'The resultant force is downwards, so the weight beats $R$.'),
            end('Equal to their weight', 'No acceleration, no resultant: $R$ equals the weight.'),
          ],
        },
        ...(hard
          ? [
              {
                id: 'value',
                ask: 'Which is $R$, in newtons?',
                branches: values.map((v) => ({ label: `$${v}$`, outcome: `$R = ${v}\\text{ N}$.` })),
              },
            ]
          : []),
      ],
      answer: [acc, cmp, ...(hard ? [`$${fmt(R)}$`] : [])],
    };
  },
  solution: ({ m, motion, size, hard }) => {
    const { words, acc } = LIFT_FLOW_MOTIONS[motion];
    const sign = acc === 'Upwards' ? 1 : acc === 'Downwards' ? -1 : 0;
    const steps: SolutionStep[] = [
      {
        text:
          sign === 0
            ? `A lift ${words} has no acceleration, whatever its speed.`
            : `A lift ${words} has its acceleration pointing ${sign > 0 ? 'up' : 'down'}: the direction it is speeding up in, or against the direction it is slowing down in.`,
      },
    ];
    if (hard) steps.push({ tex: `R = ${m}(9.8 ${sign > 0 ? `+ ${fmt(size)}` : sign < 0 ? `- ${fmt(size)}` : ''}) = ${fmt(m * (G + sign * size))}` });
    return steps;
  },
};

interface LiftTableParams {
  m: number;
  a1: number;
  a3: number;
  down: boolean;
  hard: boolean;
}

/** The three stages' accelerations, up positive. */
export const liftStages = ({ a1, a3, down }: LiftTableParams): [number, number, number] => (down ? [-a1, 0, a3] : [a1, 0, -a3]);

/** Table: the reaction at each stage of a lift's journey. */
const liftTable: Generator<LiftTableParams> = {
  id: 'force-lift-table',
  sample: (rng, difficulty) => ({
    m: 5 * rng.int(8, 20),
    a1: rng.pick(LIFT_A),
    a3: rng.pick(LIFT_A),
    down: difficulty > 1 && rng.chance(0.6),
    hard: difficulty > 1,
  }),
  render: (params) => {
    const { m, a1, a3, down, hard } = params;
    const stages = liftStages(params);
    const Rs = stages.map((a) => m * (G + a));
    const names = ['\\text{start}', '\\text{middle}', '\\text{end}'];
    const answer = hard ? stages.flatMap((a, i) => [a, Rs[i]]) : Rs;
    return {
      kind: 'table',
      prompt: [
        say(
          `A passenger of mass $${m}\\text{ kg}$ stands in a lift that ${down ? 'goes down' : 'goes up'}: it speeds up at $${fmt(a1)}${ACC}$, moves at a steady speed, then slows down at $${fmt(a3)}${ACC}$ until it stops. ${G_NOTE}`,
        ),
        say(`Taking upwards as positive, fill in ${hard ? 'the acceleration $a$ and ' : ''}the reaction $R$ of the floor at each stage: ${hard ? '$a$ in $\\text{m s}^{-2}$, ' : ''}$R$ in newtons.`),
      ],
      columns: ['\\text{stage}', 'a', 'R'],
      rows: names.map((name, i) => [name, hard ? null : fmt(stages[i]), null]),
      bank: valueBank(answer, [m * (G - stages[0]), m * (G - stages[2]), -stages[0], -stages[2], m * stages[0]]),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => {
    const { m, down } = params;
    const stages = liftStages(params);
    return [
      {
        text: down
          ? 'Going down, speeding up means a downward acceleration and slowing down an upward one.'
          : 'Going up, speeding up means an upward acceleration and slowing down a downward one.',
      },
      ...stages.map((a, i) => ({ tex: `\\text{${['start', 'middle', 'end'][i]}}: \\; R = ${m}(9.8 ${signed(a)}) = ${fmt(m * (G + a))}` })),
    ];
  },
};

const LIFT_SLIDER_A = [-3.8, -2.8, -1.8, -0.8, 0.2, 1.2, 2.2, 3.2];

/** Slider: the reading on scales in a lift, against the line R = m(g + a). */
const liftSlider: Generator<LiftParams> = {
  id: 'force-lift-slider',
  sample: (rng, difficulty) => {
    const m = 10 * rng.int(4, 8);
    const a = rng.pick(LIFT_SLIDER_A);
    if (difficulty < 2) return { m, a, find: 'R', motion: -1 };
    const motion = rng.pick([0, 1, 2, 3].filter((i) => LIFT_MOTIONS[i].sign === Math.sign(a)));
    return { m, a, find: 'R', motion };
  },
  render: ({ m, a, motion }) => ({
    kind: 'slider',
    prompt: [
      say(
        `A passenger of mass $${m}\\text{ kg}$ stands on bathroom scales in a lift ${liftWords({ a, motion })}. ${G_NOTE} Slide the line to the reading on the scales, in newtons.`,
      ),
      say('The graph shows the reading against the lift\'s acceleration, upwards positive; the dashed line is the passenger\'s weight.'),
    ],
    // The window runs from a = -4.8 to a = 4.2, where g + a is 5 and 14, so
    // the line fills it corner to corner whatever the mass.
    min: 5 * m,
    max: 14 * m,
    step: 10,
    answer: m * (G + a),
    readout: 'R = {v}',
    figure: {
      svg: plotSvg({
        xMin: -4.8,
        xMax: 4.2,
        yMin: 5 * m,
        yMax: 14 * m,
        curves: [{ f: (x) => m * (G + x) }],
        horizontals: [G * m],
        label: `The reading on the scales, a straight line rising with the acceleration, and a dashed line at the weight`,
      }),
      ...markerWindow(5 * m, 14 * m, 'y'),
      axis: 'y',
    },
  }),
  solution: ({ m, a, motion }) => [
    ...(motion >= 0 ? [{ text: `That motion means the acceleration points ${a > 0 ? 'up' : 'down'}: $a = ${fmt(a)}$.` }] : []),
    { text: 'The scales read the force they push up with, $R$:' },
    { tex: `R - ${fmt(G * m)} = ${m} \\times ${paren(a)}, \\quad R = ${fmt(m * (G + a))}` },
    { text: a > 0 ? 'More than the weight: the passenger feels heavier.' : 'Less than the weight: the passenger feels lighter.' },
  ],
};

interface CableParams {
  M: number;
  m: number;
  a: number;
  motion: number;
}

/** Tree: g + a, then the cable tension and the reaction on the passenger. */
const cableTree: Generator<CableParams> = {
  id: 'force-cable-tree',
  sample: (rng, difficulty) => {
    const size = rng.pick(LIFT_A);
    const M = 50 * rng.int(6, 18);
    const m = 5 * rng.int(8, 20);
    if (difficulty < 2) return { M, m, a: size * rng.sign(), motion: -1 };
    const motion = rng.int(0, LIFT_MOTIONS.length - 1);
    return { M, m, a: size * LIFT_MOTIONS[motion].sign, motion };
  },
  render: ({ M, m, a, motion }) => {
    const ga = G + a;
    const T = (M + m) * ga;
    const R = m * ga;
    return {
      kind: 'tree',
      prompt: [
        say(`A lift of mass $${M}\\text{ kg}$ carries a passenger of mass $${m}\\text{ kg}$. The lift is ${liftWords({ a, motion })}. ${G_NOTE}`),
        say('Top row: $g + a$, with upwards positive. Then the tension in the lift cable, and the reaction of the floor on the passenger, both in newtons.'),
      ],
      expression: 'T - (M + m)g = (M + m)a',
      nodes: [
        { id: 'ga', from: [] },
        { id: 't', from: ['ga'] },
        { id: 'r', from: ['ga'] },
      ],
      bank: valueBank([ga, T, R], [G - a, (M + m) * (G - a), M * ga, m * (G - a), m * a]),
      answer: [ga, T, R].map(fmt),
    };
  },
  solution: ({ M, m, a, motion }) => {
    const ga = G + a;
    return [
      ...(motion >= 0 ? [{ text: `That motion means the acceleration points ${a > 0 ? 'up' : 'down'}: $a = ${fmt(a)}$.` }] : []),
      { tex: `g + a = 9.8 + ${paren(a)} = ${fmt(ga)}` },
      { text: 'Lift and passenger together, pulled up by the cable:' },
      { tex: `T = (${M} + ${m}) \\times ${fmt(ga)} = ${fmt((M + m) * ga)}` },
      { text: 'The passenger alone, pushed up by the floor:' },
      { tex: `R = ${m} \\times ${fmt(ga)} = ${fmt(m * ga)}` },
    ];
  },
};

/* ================================================================
 * Registration
 * ================================================================ */

/** Every generator by name, typed, for `forces.test.ts`. */
/* ---------- Fitting a phone ---------- */

/**
 * Roughly how many characters wide a line of TeX renders, counting a fraction
 * as its wider half and a function name as its letters. Copied from Series
 * Expansions, which took it from Trig Identities: only good enough to tell a
 * line that fits a phone from one that would scroll sideways.
 */
function texWidth(tex: string): number {
  let s = tex;
  for (;;) {
    const next = s.replace(/\\d?t?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, a: string, b: string) => `${a.length > b.length ? a : b}xx`);
    if (next === s) break;
    s = next;
  }
  return s
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\(left|right)/g, 'x')
    .replace(/\\(,|;|!)/g, '')
    .replace(/\\qquad/g, 'xxxx')
    .replace(/\\quad/g, 'xx')
    .replace(/\\([a-zA-Z]+)/g, (_m, w: string) => (w.length > 3 ? 'xx' : w))
    .replace(/[=+]| - /g, 'xx')
    .replace(/[{}\s^_]/g, '').length;
}

/** The widest line, by `texWidth`, that sits on a 393-pixel screen without scrolling. */
const FIT = 22;

/** Splits at `sep` wherever it is outside every bracket and brace. */
function splitTop(tex: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < tex.length; i += 1) {
    const ch = tex[i];
    if (ch === '{' || ch === '(') depth += 1;
    else if (ch === '}' || ch === ')') depth -= 1;
    else if (depth === 0 && tex.startsWith(sep, i)) {
      out.push(tex.slice(start, i).trim());
      start = i + sep.length;
      i += sep.length - 1;
    }
  }
  out.push(tex.slice(start).trim());
  return out;
}

/** Packs pieces greedily into lines no wider than `limit`, joined by `join`. */
function pack(pieces: string[], join: string, limit: number): string[] {
  const lines: string[] = [];
  for (const piece of pieces) {
    const last = lines.length - 1;
    if (last >= 0 && texWidth(`${lines[last]}${join}${piece}`) <= limit) lines[last] = `${lines[last]}${join}${piece}`;
    else lines.push(piece);
  }
  return lines;
}

/**
 * Breaks a long run of terms before an operator: a sum before a plus or
 * minus first, and only a piece still too wide after that inside a product,
 * so `a \times b + c \times d` never splits `c` from `d`.
 */
function breakTerms(tex: string, limit = FIT - 5, groups: string[][] = [[' + ', ' - '], [' \\times ']]): string[] {
  if (texWidth(tex) <= limit || groups.length === 0) return [tex];
  let terms = [tex];
  for (const op of groups[0]) {
    terms = terms.flatMap((term) => {
      const [head, ...tail] = splitTop(term, op);
      return [head, ...tail.map((t) => `${op.trim()} ${t}`)];
    });
  }
  return pack(terms, ' ', limit).flatMap((line) => breakTerms(line, limit, groups.slice(1)));
}

/** One `L = R1 = R2` chain as aligned rows, each `=` under the last. */
function chainRows(tex: string): string[] {
  const [lhs, ...rhs] = splitTop(tex, ' = ');
  const pieces = (side: string, lead: string, limit = FIT - 5) =>
    breakTerms(side, limit).map((piece, j) => (j === 0 ? `${lead}${piece}` : `& \\quad {} ${piece}`));
  if (rhs.length === 0) return pieces(tex, '& ', FIT);
  // A short left-hand side shares the first row, so that row has less room.
  const beside = Math.max(8, FIT - 3 - texWidth(lhs));
  if (texWidth(tex) <= FIT) return [`${lhs} &= ${rhs.join(' = ')}`];
  const own = texWidth(lhs) > FIT / 2 || (rhs.length === 1 && breakTerms(rhs[0]).length === 1);
  return [...(own ? pieces(lhs, '& ', FIT) : []), ...rhs.flatMap((side, i) => (i === 0 && !own ? pieces(side, `${lhs} &= `, beside) : pieces(side, '&= ')))];
}

/**
 * A fraction whose top is too wide, with the top stacked over two or more
 * lines. A limit's numerator is a whole sum of series, and a fraction cannot
 * be broken at its equals sign.
 */
function stackFractions(tex: string): string {
  let out = '';
  let i = 0;
  while (i < tex.length) {
    if (!tex.startsWith('\\frac{', i)) {
      out += tex[i];
      i += 1;
      continue;
    }
    const top = braced(tex, i + 5);
    const bottom = braced(tex, top.end);
    const rows = texWidth(top.body) > FIT - 4 ? breakTerms(top.body, FIT - 6) : [top.body];
    const body = rows.length > 1 ? `\\begin{gathered} ${rows.join(' \\\\ ')} \\end{gathered}` : top.body;
    out += `\\frac{${body}}{${bottom.body}}`;
    i = bottom.end;
  }
  return out;
}

/** The body of the `{...}` group opening at `open`, and where it ends. */
function braced(tex: string, open: number): { body: string; end: number } {
  let depth = 0;
  for (let i = open; i < tex.length; i += 1) {
    if (tex[i] === '{') depth += 1;
    if (tex[i] === '}') {
      depth -= 1;
      if (depth === 0) return { body: tex.slice(open + 1, i), end: i + 1 };
    }
  }
  return { body: tex.slice(open + 1), end: tex.length };
}

/**
 * A line of working too wide for a phone, stacked: a list one group of items
 * per row, a chain of equals signs one per row, and a long sum broken before a
 * plus or minus. A line that already fits is left alone.
 */
function fit(tex: string): string {
  if (tex.includes('\\begin') || texWidth(tex) <= FIT) return tex;
  // A list of values: as many to a row as fit.
  if (splitTop(tex, ', \\;').length > 1 && !tex.includes(' = ')) {
    const rows = pack(splitTop(tex, ', \\;'), ', \\; ', FIT);
    return `\\begin{gathered} ${rows.map((row, i) => (i < rows.length - 1 ? `${row},` : row)).join(' \\\\ ')} \\end{gathered}`;
  }
  const rows = splitTop(tex, ', \\quad').flatMap((part) => chainRows(part));
  const stacked = rows.map((row) => (texWidth(row) > FIT ? stackFractions(row) : row));
  return stacked.length === 1 && !stacked[0].includes('&') ? stacked[0] : `\\begin{aligned} ${stacked.join(' \\\\ ')} \\end{aligned}`;
}

/** The same generator, with every display and every line of working fitted to a phone. */
function fitted<P>(generator: Generator<P>): Generator<P> {
  return {
    ...generator,
    render: (params) => {
      const slide = generator.render(params);
      if (!('prompt' in slide)) return slide;
      return {
        ...slide,
        ...(slide.kind === 'flow' ? { subject: fit(slide.subject) } : {}),
        ...(slide.kind === 'tree' ? { expression: fit(slide.expression) } : {}),
        prompt: slide.prompt.map((block): Block => (block.kind === 'display' ? { ...block, tex: fit(block.tex) } : block)),
      };
    },
    solution: (params) => generator.solution(params).map((step) => (step.tex ? { ...step, tex: fit(step.tex) } : step)),
  };
}

export const forcesByName = {
  magnitude,
  ijTiles,
  direction,
  componentSlider,
  fromMagnitude,
  resultantTiles,
  resultantTree,
  parallel,
  resultantSlider,
  perpendicular,
  resolveTiles,
  whichTrig,
  resolveTable,
  netSteps,
  weight,
  normalTree,
  equilibriumFlow,
  equilibriumTiles,
  hanging,
  slopeTiles,
  slopeHold,
  frictionFlow,
  frictionTree,
  limitingSlope,
  fma,
  resistanceTree,
  fmaSlider,
  fmaIj,
  newton1Flow,
  towingTree,
  pulley,
  pulleyTiles,
  towBarSteps,
  slopeAccel,
  slopeTree,
  slopeFlow,
  slopeSlider,
  pairChoice,
  pairFlow,
  pushTree,
  contact,
  lift,
  liftFlow,
  liftTable,
  liftSlider,
  cableTree,
};

export const forcesGenerators = Object.values(forcesByName).map((generator) => fitted(generator as Generator<never>));
