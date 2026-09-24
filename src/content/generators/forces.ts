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
 * Levels 1 and 2 do not use the force-diagram widget: their pictures are plain
 * SVG from `arrowsSvg` below, drawn in prompts and teach slides as diagram
 * blocks. Level 3 (connected particles on slopes) asks free-body diagrams on
 * the `forces` kind, and draws its set-ups with `rigSvg`. Its answers are whole
 * or a tenth: rather than a rejection loop, each draw comes from a catalogue of
 * every rig that comes out tidy, built once on first use, since with g = 9.8
 * the tidy cases are sparse.
 *
 * Level 5 (momentum and impulse) keeps velocities whole and masses whole or
 * halves, building each velocity after a collision, common velocity or force
 * from the others and drawing again until it is exact. A collision is drawn
 * with `collisionSvg`, the particles before and after, since the `forces`
 * kind shows one box. Nothing in these levels is calculus, so no slide
 * declares `source` and the derivative oracle has nothing to check here:
 * `forces.test.ts` is what checks the answers.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { canonicalForces, type Direction, type ForceArrow, type ForceScene } from '../forces';
import { markerWindow, plotSvg, vectorSvg } from '../figures';
import { fmt } from './numericalMethods';
import { mix, stepBank, steered, turned } from './parametricImplicit';

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
 * Level 3: connected particles on slopes
 * ================================================================ */

/**
 * Two particles on a light inextensible string over a smooth pulley or peg,
 * each on a face of its own: `A` on the left face, `B` on the right. A face is
 * an `Angle`, so one model covers every set-up of the level: a slope with `B`
 * hanging over the top (`B`'s face is `DROP`, straight down), two rough slopes
 * back to back over a peg, and a rough table (`FLAT`) with `B` on a rough slope
 * beyond its edge.
 */
export const FLAT: Angle = { o: 0, a: 1, h: 1 };
export const DROP: Angle = { o: 1, a: 0, h: 1 };

const hangs = (t: Angle): boolean => t.a === 0;
const level = (t: Angle): boolean => t.o === 0;

export interface Rig {
  m1: number;
  m2: number;
  t1: Angle;
  mu1: number;
  t2: Angle;
  mu2: number;
}

export interface RigMotion {
  /** Which particle goes down its face, or neither. */
  falls: 'A' | 'B' | 'none';
  a: number;
  /** NaN at rest with friction on both faces, where the tension is not fixed. */
  T: number;
  /** Each weight's component down its own face. */
  along1: number;
  along2: number;
  R1: number;
  R2: number;
  /** The friction acting: mu R when moving, what the rest needs otherwise. */
  F1: number;
  F2: number;
}

/**
 * Which way a rig moves, its acceleration and the tension. Each face's
 * friction is at most mu R and opposes the motion, so the system moves only
 * when the difference between the two pulls beats both limits together.
 */
export function rigMotion({ m1, m2, t1, mu1, t2, mu2 }: Rig): RigMotion {
  const along1 = G * m1 * sinOf(t1);
  const along2 = G * m2 * sinOf(t2);
  const R1 = G * m1 * cosOf(t1);
  const R2 = G * m2 * cosOf(t2);
  const max1 = mu1 * R1;
  const max2 = mu2 * R2;
  const push = along2 - along1;
  if (Math.abs(push) <= max1 + max2 + 1e-9) {
    // At rest. With friction on one face only, that face takes the whole push.
    const F1 = mu2 === 0 ? Math.abs(push) : mu1 === 0 ? 0 : NaN;
    const F2 = mu1 === 0 ? Math.abs(push) : mu2 === 0 ? 0 : NaN;
    const T = mu2 === 0 ? along2 : mu1 === 0 ? along1 : NaN;
    return { falls: 'none', a: 0, T, along1, along2, R1, R2, F1, F2 };
  }
  const falls = push > 0 ? 'B' : 'A';
  const a = (Math.abs(push) - max1 - max2) / (m1 + m2);
  const T = falls === 'B' ? m1 * a + along1 + max1 : m2 * a + along2 + max2;
  return { falls, a, T, along1, along2, R1, R2, F1: max1, F2: max2 };
}

/** Built once, on first use: the catalogues below are too big to rebuild per draw. */
function once<T>(build: () => T): () => T {
  let memo: { value: T } | undefined;
  return () => (memo ??= { value: build() }).value;
}

const RIG_ANGLES = [A34, A43, A724, A247];
const RIG_MUS = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75];
const range = (lo: number, hi: number, step = 1): number[] =>
  Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);

/** Every force in the working exact to three places. */
const cleanForces = (m: RigMotion): boolean => [m.along1, m.along2, m.R1, m.R2, m.F1, m.F2].every((v) => exact(v, 3));

/** Moving, with an acceleration and a tension that are whole or a tenth. */
const tidyMotion = (m: RigMotion): boolean =>
  m.falls !== 'none' && m.a >= 0.1 && exact(m.a, 1) && exact(m.T, 1) && cleanForces(m);

function rigsOf(masses: number[], faces: [Angle, number, Angle, number][], keep: (m: RigMotion, r: Rig) => boolean): Rig[] {
  const out: Rig[] = [];
  for (const [t1, mu1, t2, mu2] of faces) {
    for (const m1 of masses) {
      for (const m2 of masses) {
        const rig = { m1, m2, t1, mu1, t2, mu2 };
        if (keep(rigMotion(rig), rig)) out.push(rig);
      }
    }
  }
  return out;
}

const hangingFaces = (rough: boolean): [Angle, number, Angle, number][] =>
  RIG_ANGLES.flatMap((t) => (rough ? RIG_MUS : [0]).map((mu): [Angle, number, Angle, number] => [t, mu, DROP, 0]));

const WHOLE = range(1, 20);

/** A on a slope, B hanging: moving, smooth and rough. */
const hangingMoving = [
  // Smooth cases are sparse (the total mass nearly always a multiple of 7), so the masses run further.
  once(() => rigsOf(range(1, 30), hangingFaces(false), tidyMotion)),
  once(() => rigsOf(WHOLE, hangingFaces(true), tidyMotion)),
];
const movingHung = (rough: boolean): Rig[] => hangingMoving[rough ? 1 : 0]();

/** A on a slope, B hanging, at rest: balanced exactly when smooth, held by friction when rough. */
const hangingRest = [
  once(() => rigsOf(WHOLE, hangingFaces(false), (m) => m.falls === 'none' && cleanForces(m) && exact(m.T, 1))),
  once(() =>
    rigsOf(WHOLE, hangingFaces(true), (m) => m.falls === 'none' && m.F1 > 0.5 && cleanForces(m) && exact(m.T, 1) && exact(m.F1, 2)),
  ),
];
const restingHung = (rough: boolean): Rig[] => hangingRest[rough ? 1 : 0]();

/**
 * Two rough faces over a peg: two slopes back to back, or a table with the
 * slope beyond its edge. At difficulty 1 only slopes; the table joins at 2.
 */
const pegFaces = (withTable: boolean): [Angle, number, Angle, number][] =>
  (withTable ? [FLAT, ...RIG_ANGLES] : RIG_ANGLES).flatMap((t1) =>
    RIG_ANGLES.flatMap((t2) => RIG_MUS.flatMap((mu1) => RIG_MUS.map((mu2): [Angle, number, Angle, number] => [t1, mu1, t2, mu2]))),
  );
const PEG_MASSES = range(1, 15);
const pegMoving = [once(() => rigsOf(PEG_MASSES, pegFaces(false), tidyMotion)), once(() => rigsOf(PEG_MASSES, pegFaces(true), tidyMotion))];
const pegRest = once(() =>
  rigsOf(PEG_MASSES, pegFaces(true), (m, r) => {
    if (m.falls !== 'none') return false;
    const push = Math.abs(m.along2 - m.along1);
    return push > 0.5 && [m.along1, m.along2, m.R1, m.R2, r.mu1 * m.R1, r.mu2 * m.R2].every((v) => exact(v, 3));
  }),
);
const movingPeg = (withTable: boolean): Rig[] => pegMoving[withTable ? 1 : 0]();

/** The slope's angle in words: the sine and cosine, or only the tangent. */
function rigScene(rig: Rig, hard: boolean): string {
  const { m1, m2, t1, mu1, t2, mu2 } = rig;
  const A = `Particle $A$, of mass $${fmt(m1)}\\text{ kg}$,`;
  const B = `particle $B$, of mass $${fmt(m2)}\\text{ kg}$`;
  if (hangs(t2)) {
    const surface = mu1 > 0 ? `a rough slope, with $\\mu = ${fmt(mu1)}$,` : 'a smooth slope';
    return `${A} lies on ${surface} inclined at $\\alpha$ to the horizontal, where ${angleFacts(t1, hard)}. A light inextensible string from $A$ runs up the slope, over a smooth pulley at the top, to ${B}, which hangs freely.`;
  }
  const bFace = `${B}, on a rough slope inclined at $\\beta$ to the horizontal, where ${angleFacts(t2, hard, '\\beta')}`;
  const mus = `The coefficient of friction is $${fmt(mu1)}$ for $A$ and $${fmt(mu2)}$ for $B$.`;
  if (level(t1)) {
    return `${A} lies on a rough horizontal table. A light inextensible string from $A$ passes over a smooth peg at the edge of the table to ${bFace}, falling away from the edge. ${mus}`;
  }
  return `Two rough slopes meet at a ridge, with a smooth peg along the top. ${A} lies on one, inclined at $\\alpha$ to the horizontal, where ${angleFacts(t1, hard)}. A light inextensible string from $A$ passes over the peg to ${bFace}. ${mus}`;
}

/** Where the rig's picture puts a particle, and the faces it is drawn from. */
export function rigSvg(t1: Angle, t2: Angle, opts: { gap?: boolean } = {}): string {
  const W = 240;
  const GROUND = 160;
  const L = 104;
  const apex: Pt = [120, 36];
  const f = (v: number) => v.toFixed(1);
  const at = (p: Pt) => `${f(p[0])},${f(p[1])}`;
  // Down each face from the apex, on the screen (y down), and the normal
  // pointing up out of the face.
  const d1: Pt = [-cosOf(t1), sinOf(t1)];
  const n1: Pt = [-sinOf(t1), -cosOf(t1)];
  const d2: Pt = [cosOf(t2), sinOf(t2)];
  const n2: Pt = [sinOf(t2), -cosOf(t2)];
  const along = (d: Pt, n: Pt, s: number, up: number): Pt => [apex[0] + s * d[0] + up * n[0], apex[1] + s * d[1] + up * n[1]];
  const end1 = along(d1, n1, L, 0);
  const end2 = along(d2, n2, L, 0);
  const R = 9;
  const parts = [
    `<svg viewBox="0 0 ${W} 172" width="100%" role="img" aria-label="${
      hangs(t2)
        ? 'Particle A on a slope, joined by a string over a pulley at the top to particle B hanging down the far side'
        : level(t1)
          ? 'Particle A on a table, joined by a string over a peg at its edge to particle B on a slope falling away from the edge'
          : 'Two slopes back to back with a peg at the top, particle A on the left slope and particle B on the right, joined by a string over the peg'
    }">`,
    `<line x1="0" y1="${GROUND}" x2="${W}" y2="${GROUND}" stroke="currentColor" stroke-width="1.5" />`,
    `<polygon points="${at(apex)} ${at(end1)} ${f(end1[0])},${GROUND} ${f(end2[0])},${GROUND} ${at(end2)}" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />`,
  ];
  // Each angle at the foot of its face, against a dashed horizontal running
  // into the block, where no particle sits.
  const angleMark = (t: Angle, foot: Pt, side: -1 | 1, name: string) => {
    if (level(t) || hangs(t)) return;
    const tilt = Math.atan2(t.o, t.a);
    const inward = -side;
    const r = 26;
    const label = tilt < 0.5 ? 62 : 40;
    parts.push(
      `<line x1="${f(foot[0])}" y1="${f(foot[1])}" x2="${f(foot[0] + inward * 70)}" y2="${f(foot[1])}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.6" />`,
      `<path d="M ${f(foot[0] + inward * r)} ${f(foot[1])} A ${r} ${r} 0 0 ${side < 0 ? 0 : 1} ${f(foot[0] + inward * r * Math.cos(tilt))} ${f(foot[1] - r * Math.sin(tilt))}" fill="none" stroke="currentColor" stroke-width="1" opacity="0.6" />`,
      `<text x="${f(foot[0] + inward * label * Math.cos(tilt / 2))}" y="${f(foot[1] - label * Math.sin(tilt / 2))}" fill="currentColor" font-size="13" font-style="italic" text-anchor="middle" dominant-baseline="central">${name}</text>`,
    );
  };
  angleMark(t1, end1, -1, 'α');
  angleMark(t2, end2, 1, 'β');
  // A box sitting on a face, with its letter, and the string from it to the pulley.
  const box = (d: Pt, n: Pt, s: number, name: string): Pt => {
    const c = along(d, n, s, R);
    const corner = (u: number, v: number): Pt => [c[0] + u * R * d[0] + v * R * n[0], c[1] + u * R * d[1] + v * R * n[1]];
    parts.push(
      `<polygon points="${[corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)].map(at).join(' ')}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />`,
      `<text x="${f(c[0])}" y="${f(c[1])}" fill="currentColor" font-size="12" font-style="italic" text-anchor="middle" dominant-baseline="central">${name}</text>`,
    );
    const top = along(d, n, s - R, R);
    const touch = along(d, n, 0, R);
    parts.push(`<line x1="${f(top[0])}" y1="${f(top[1])}" x2="${f(touch[0])}" y2="${f(touch[1])}" stroke="currentColor" stroke-width="1.5" />`);
    return c;
  };
  box(d1, n1, L * 0.62, 'A');
  const b = box(d2, n2, hangs(t2) ? L * 0.42 : L * 0.55, 'B');
  // The string over the top, then the pulley or peg itself.
  const p1 = along(d1, n1, 0, R);
  const p2 = along(d2, n2, 0, R);
  parts.push(`<path d="M ${f(p1[0])} ${f(p1[1])} A ${R} ${R} 0 0 1 ${f(p2[0])} ${f(p2[1])}" fill="none" stroke="currentColor" stroke-width="1.5" />`);
  parts.push(
    hangs(t2)
      ? `<circle cx="${apex[0]}" cy="${apex[1]}" r="${R - 1}" fill="none" stroke="currentColor" stroke-width="2" /><circle cx="${apex[0]}" cy="${apex[1]}" r="1.5" fill="currentColor" />`
      : `<circle cx="${apex[0]}" cy="${apex[1]}" r="4" fill="currentColor" />`,
  );
  if (opts.gap && hangs(t2)) {
    // B's height above the ground, for the string that goes slack.
    const x = b[0] + 20;
    parts.push(
      `<line x1="${f(x)}" y1="${f(b[1] + R)}" x2="${f(x)}" y2="${GROUND}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" />`,
      `<text x="${f(x + 9)}" y="${f((b[1] + R + GROUND) / 2)}" fill="currentColor" font-size="13" font-style="italic" text-anchor="middle" dominant-baseline="central">h</text>`,
    );
  }
  parts.push('</svg>');
  return parts.join('');
}

const rigPicture = (rig: Rig, gap = false): Block => picture(rigSvg(rig.t1, rig.t2, { gap }));

/** Each particle's equation of motion, in its own direction of motion. */
function equationsOf(rig: Rig): [string, string] {
  const m = rigMotion(rig);
  const less = (v: number) => (v > 0 ? ` - ${fmt(v)}` : '');
  if (m.falls === 'A') {
    return [
      `${fmt(m.along1)} - T${less(m.F1)} = ${fmt(rig.m1)}a`,
      `T${less(m.along2)}${less(m.F2)} = ${fmt(rig.m2)}a`,
    ];
  }
  return [`T${less(m.along1)}${less(m.F1)} = ${fmt(rig.m1)}a`, `${fmt(m.along2)} - T${less(m.F2)} = ${fmt(rig.m2)}a`];
}

/** Both equations stacked, A's above B's, each aligned on its equals sign; narrow enough for a phone. */
const pairTex = ([eqA, eqB]: [string, string]): string => aligned(eqA.replace(' = ', ' &= '), eqB.replace(' = ', ' &= '));

/** Which way, the friction, both equations, their sum, a and then T. */
function rigWorking(rig: Rig, hard: boolean, withT = true): SolutionStep[] {
  const m = rigMotion(rig);
  const { m1, m2, t1, t2, mu1, mu2 } = rig;
  const push = Math.abs(m.along2 - m.along1);
  const [eqA, eqB] = equationsOf(rig);
  const down = m.falls === 'B' ? '$B$' : '$A$';
  const up = m.falls === 'B' ? '$A$' : '$B$';
  const steps: SolutionStep[] = [
    ...(level(t1) ? [] : angleStep(t1, hard)),
    ...(hangs(t2) ? [] : angleStep(t2, hard, '\\beta')),
    {
      text: hangs(t2)
        ? `$B$'s weight is $${fmt(m.along2)}\\text{ N}$ and $A$'s weight pulls down the slope with $${fmt(m1)} \\times 9.8 \\times ${fmt(sinOf(t1))} = ${fmt(m.along1)}\\text{ N}$, so ${down} goes down and ${up} goes up.`
        : `Down its own slope, $A$'s weight pulls with $${fmt(m.along1)}\\text{ N}$ and $B$'s with $${fmt(m.along2)}\\text{ N}$, so ${down} goes down and ${up} goes up.`,
    },
  ];
  if (mu1 > 0) steps.push({ tex: `F_{A} = ${fmt(mu1)} \\times ${fmt(m.R1)} = ${fmt(m.F1)}` });
  if (mu2 > 0) steps.push({ tex: `F_{B} = ${fmt(mu2)} \\times ${fmt(m.R2)} = ${fmt(m.F2)}` });
  steps.push(
    { text: `Friction acts against the motion. One equation for each particle in its own direction of motion, $A$'s first:` },
    { tex: pairTex([eqA, eqB]) },
    { text: 'Add them, and $T$ drops out:' },
    { tex: `${fmt(push - m.F1 - m.F2)} = ${fmt(m1 + m2)}a, \\quad a = ${fmt(m.a)}` },
  );
  if (withT) {
    const parts = m.falls === 'B' ? [m1 * m.a, m.along1, m.F1] : [m2 * m.a, m.along2, m.F2];
    steps.push(
      { text: `Put $a$ back into ${m.falls === 'B' ? '$A$' : '$B$'}'s equation:` },
      { tex: `T = ${parts.filter((v) => v > 0).map(fmt).join(' + ')} = ${fmt(m.T)}` },
    );
  }
  return steps;
}

/* ---------- Which way it moves ---------- */

interface InclineWayParams {
  rig: Rig;
  hard: boolean;
}

/** Flow: which way a slope-and-pulley system moves, and with friction whether it moves at all. */
const inclineWay: Generator<InclineWayParams> = {
  id: 'force-incline-way',
  sample: (rng, difficulty) => {
    const rough = difficulty > 1;
    return { rig: rng.pick(rng.chance(rough ? 0.35 : 0.2) ? restingHung(rough) : movingHung(rough)), hard: rough && rng.chance(0.5) };
  },
  render: ({ rig, hard }) => {
    const m = rigMotion(rig);
    const rough = rig.mu1 > 0;
    const equal = Math.abs(m.along2 - m.along1) < 1e-9;
    const cmp = equal ? 'They are equal' : m.along2 > m.along1 ? "$B$'s weight is bigger" : "$B$'s weight is smaller";
    const pulls = [...new Set([m.along1, G * rig.m1 * cosOf(rig.t1), G * rig.m1].map(fmt))].sort((x, y) => Number(x) - Number(y));
    const maxes = [...new Set([rig.mu1 * m.R1, rig.mu1 * G * rig.m1, rig.mu1 * m.along1].map(fmt))].sort((x, y) => Number(x) - Number(y));
    const moves = m.falls !== 'none';
    const steps = [
      {
        id: 'pull',
        ask: "What is the component of $A$'s weight down the slope, in newtons?",
        branches: pulls.map((v) => ({ label: `$${v}$`, to: 'cmp' })),
      },
      {
        id: 'cmp',
        ask: `Compare it with $B$'s weight, $${fmt(m.along2)}\\text{ N}$.`,
        branches: [
          rough
            ? { label: "$B$'s weight is bigger", to: 'max' }
            : { label: "$B$'s weight is bigger", outcome: 'So $B$ falls, pulling $A$ up the slope.' },
          rough
            ? { label: "$B$'s weight is smaller", to: 'max' }
            : { label: "$B$'s weight is smaller", outcome: 'So $A$ slides down the slope, pulling $B$ up.' },
          { label: 'They are equal', outcome: 'So the two pulls balance: neither particle moves.' },
        ],
      },
      ...(rough
        ? [
            {
              id: 'max',
              ask: 'What is the greatest friction on $A$, $\\mu R$, in newtons?',
              branches: maxes.map((v) => ({ label: `$${v}$`, to: 'beat' })),
            },
            {
              id: 'beat',
              ask: 'Is the difference between the two pulls bigger than $\\mu R$?',
              branches: [
                { label: 'Yes, it is bigger', outcome: 'So friction cannot hold it: the system moves, with $\\mu R$ against the motion.' },
                { label: 'No, it is not', outcome: 'So friction holds it: the system stays at rest.' },
              ],
            },
          ]
        : []),
    ];
    return {
      kind: 'flow',
      prompt: [say(`${rigScene(rig, hard)} ${G_NOTE} The particles are released from rest. What happens?`), rigPicture(rig)],
      subject: 'm_{B}g \\text{ against } m_{A}g\\sin\\alpha',
      steps,
      answer: [`$${fmt(m.along1)}$`, cmp, ...(rough && !equal ? [`$${fmt(rig.mu1 * m.R1)}$`, moves ? 'Yes, it is bigger' : 'No, it is not'] : [])],
    };
  },
  solution: ({ rig, hard }) => {
    const m = rigMotion(rig);
    const push = Math.abs(m.along2 - m.along1);
    const steps: SolutionStep[] = [
      ...angleStep(rig.t1, hard),
      { tex: `${fmt(rig.m1)} \\times 9.8 \\times ${fmt(sinOf(rig.t1))} = ${fmt(m.along1)}` },
      { tex: `m_{B}g = ${fmt(rig.m2)} \\times 9.8 = ${fmt(m.along2)}` },
    ];
    if (push < 1e-9) return [...steps, { text: 'The two pulls are equal, so nothing moves and no friction is needed.' }];
    const side = m.along2 > m.along1 ? '$B$ would fall and pull $A$ up the slope' : '$A$ would slide down and pull $B$ up';
    if (rig.mu1 === 0) return [...steps, { text: `The slope is smooth, so ${side}.` }];
    const max = rig.mu1 * m.R1;
    return [
      ...steps,
      { text: `Without friction, ${side}, pushed by $${fmt(push)}\\text{ N}$.` },
      { tex: `R = ${fmt(rig.m1)} \\times 9.8 \\times ${fmt(cosOf(rig.t1))} = ${fmt(m.R1)}, \\quad \\mu R = ${fmt(max)}` },
      { text: `Friction can give at most $${fmt(max)}\\text{ N}$ against a push of $${fmt(push)}\\text{ N}$: ${compareWords(push, max)} $\\mu R$, so ${m.falls === 'none' ? 'it stays at rest' : 'it moves'}.` },
    ];
  },
};

/* ---------- Equations of motion ---------- */

interface RigTilesParams {
  rig: Rig;
  hard: boolean;
}

/** The tiles for both equations: every number in `equationsOf`, in reading order. */
function rigTiles(rig: Rig): { template: string; answer: string[] } {
  const m = rigMotion(rig);
  const answer: string[] = [];
  const blank = (v: number) => {
    answer.push(fmt(v));
    return `{${answer.length - 1}}`;
  };
  const less = (v: number) => (v > 0 ? ` - ${blank(v)}` : '');
  let a: string;
  let b: string;
  if (m.falls === 'A') {
    a = `${blank(m.along1)} - T${less(m.F1)} = ${blank(rig.m1)}a`;
    b = `T${less(m.along2)}${less(m.F2)} = ${blank(rig.m2)}a`;
  } else {
    a = `T${less(m.along1)}${less(m.F1)} = ${blank(rig.m1)}a`;
    b = `${blank(m.along2)} - T${less(m.F2)} = ${blank(rig.m2)}a`;
  }
  return { template: `A: \\; ${a}, \\qquad B: \\; ${b}`, answer };
}

const motionWords = (rig: Rig): string => {
  const m = rigMotion(rig);
  if (hangs(rig.t2)) return m.falls === 'B' ? '$B$ falls and $A$ moves up the slope.' : '$A$ slides down the slope and $B$ rises.';
  return m.falls === 'B' ? '$B$ slides down its slope and pulls $A$ towards the peg.' : '$A$ slides down its slope and pulls $B$ towards the peg.';
};

/** Tiles: the equation of motion for each particle, a slope with B hanging. */
const inclineTiles: Generator<RigTilesParams> = {
  id: 'force-incline-tiles',
  sample: (rng, difficulty) => ({ rig: rng.pick(movingHung(difficulty > 1)), hard: false }),
  render: ({ rig }) => {
    const m = rigMotion(rig);
    const { template, answer } = rigTiles(rig);
    const extras = [m.R1, G * rig.m1, rig.m1 + rig.m2, rig.mu1 * G * rig.m1, Math.abs(m.along2 - m.along1), G * rig.m2 * sinOf(rig.t1)]
      .filter((v) => v > 0 && exact(v, 3))
      .map(fmt);
    return {
      kind: 'tiles',
      prompt: [
        say(`${rigScene(rig, false)} ${G_NOTE} Released from rest, ${motionWords(rig)}`),
        say('Complete the equation of motion for $A$, then for $B$, with forces in newtons and $a$ the acceleration of each.'),
        rigPicture(rig),
      ],
      template,
      bank: tileBank(answer, extras),
      answer,
    };
  },
  solution: ({ rig }) => {
    const m = rigMotion(rig);
    const [eqA, eqB] = equationsOf(rig);
    return [
      { text: `Along the slope, $A$'s weight pulls with $${fmt(rig.m1)} \\times 9.8 \\times ${fmt(sinOf(rig.t1))} = ${fmt(m.along1)}\\text{ N}$; $B$'s whole weight, $${fmt(m.along2)}\\text{ N}$, pulls down.` },
      ...(rig.mu1 > 0 ? [{ tex: `F = \\mu R = ${fmt(rig.mu1)} \\times ${fmt(m.R1)} = ${fmt(m.F1)}` }, { text: 'Friction acts against the way $A$ moves.' }] : []),
      { text: 'Each equation takes the particle\'s own direction of motion as positive, $A$\'s first:' },
      { tex: pairTex([eqA, eqB]) },
    ];
  },
};

/* ---------- The acceleration and the tension ---------- */

interface RigFindParams {
  rig: Rig;
  hard: boolean;
  find: 'a' | 'T';
}

/** The slips: friction forgotten, the slope forgotten, a sign flipped, the tension taken as a weight. */
function rigChoices({ rig, find }: RigFindParams): ChoiceOption[] {
  const m = rigMotion(rig);
  const M = rig.m1 + rig.m2;
  const push = Math.abs(m.along2 - m.along1);
  const salt = mix(rig.m1, rig.m2, rig.t1.o, rig.t2.o, rig.mu1 * 100, rig.mu2 * 100, find === 'a' ? 1 : 2);
  if (find === 'a') {
    return valueChoices(m.a, [push / M, (push + m.F1 + m.F2) / M, (push - m.F1 - m.F2) / (m.falls === 'B' ? rig.m2 : rig.m1), (G * Math.abs(rig.m2 - rig.m1)) / M], salt);
  }
  const heavy = m.falls === 'B' ? m.along2 : m.along1;
  const light = m.falls === 'B' ? rig.m2 : rig.m1;
  return valueChoices(m.T, [heavy, light * m.a + heavy, m.T - m.F1 - m.F2, light * m.a], salt);
}

/** Expression: the acceleration or the tension, a slope with B hanging. */
const incline: Generator<RigFindParams> = {
  id: 'force-incline',
  sample: (rng, difficulty) => {
    const rough = difficulty > 1;
    return { rig: rng.pick(movingHung(rough)), hard: rough && rng.chance(0.5), find: rng.chance(0.5) ? 'T' : 'a' };
  },
  render: ({ rig, hard, find }) => {
    const m = rigMotion(rig);
    return typed(
      [
        say(
          `${rigScene(rig, hard)} ${G_NOTE} The particles are released from rest. Find ${find === 'a' ? 'their acceleration, in $\\text{m s}^{-2}$' : 'the tension in the string, in newtons'}.`,
        ),
        rigPicture(rig),
      ],
      `${find} =`,
      find === 'a' ? m.a : m.T,
    );
  },
  solution: ({ rig, hard, find }) => rigWorking(rig, hard, find === 'T'),
  choices: rigChoices,
};

/* ---------- The system as a whole ---------- */

/** Tree: the resultant on the system (after R and friction when rough), a, then T. */
const inclineSystemTree: Generator<RigTilesParams> = {
  id: 'force-incline-system-tree',
  sample: (rng, difficulty) => {
    const rough = difficulty > 1;
    return { rig: rng.pick(movingHung(rough)), hard: rough && rng.chance(0.5) };
  },
  render: ({ rig, hard }) => {
    const m = rigMotion(rig);
    const rough = rig.mu1 > 0;
    const net = Math.abs(m.along2 - m.along1) - m.F1;
    const answer = rough ? [m.R1, m.F1, net, m.a, m.T] : [net, m.a, m.T];
    const ids = rough ? ['r', 'f', 'net', 'a', 't'] : ['net', 'a', 't'];
    return {
      kind: 'tree',
      prompt: [
        say(`${rigScene(rig, hard)} ${G_NOTE} Released from rest, ${motionWords(rig)}`),
        say(
          `${rough ? "Top row: the normal reaction on $A$. Then the friction on it. Then" : 'Top row:'} the resultant force on the two particles together, along the string. Then their acceleration. Then the tension. Forces in newtons, the acceleration in $\\text{m s}^{-2}$.`,
        ),
      ],
      expression: rough ? 'F = \\mu R, \\; \\text{then } a, T' : '\\text{together, then one alone}',
      nodes: ids.map((id, i) => ({ id, from: i === 0 ? [] : [ids[i - 1]] })),
      bank: valueBank(
        answer,
        [m.along2 + m.along1, m.along2 - m.along1 + m.F1, net / rig.m1, rig.m2 * (G + m.a), m.along1, G * rig.m1].filter((v) => v > 0 && exact(v, 3)),
      ),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rig, hard }) => {
    const m = rigMotion(rig);
    const push = Math.abs(m.along2 - m.along1);
    const net = push - m.F1;
    const light = m.falls === 'B' ? rig.m2 : rig.m1;
    const heavy = m.falls === 'B' ? m.along2 : m.along1;
    return [
      ...angleStep(rig.t1, hard),
      { text: 'Along the string the two particles move as one, so the tension is internal and drops out.' },
      ...(rig.mu1 > 0 ? [{ tex: `R = ${fmt(G * rig.m1)} \\times ${fmt(cosOf(rig.t1))} = ${fmt(m.R1)}, \\quad F = ${fmt(m.F1)}` }] : []),
      { tex: `${fmt(heavy)} - ${fmt(m.falls === 'B' ? m.along1 : m.along2)}${rig.mu1 > 0 ? ` - ${fmt(m.F1)}` : ''} = ${fmt(net)}` },
      { tex: `a = \\frac{${fmt(net)}}{${fmt(rig.m1 + rig.m2)}} = ${fmt(m.a)}` },
      { text: `Then the falling particle alone: its weight less the tension gives it its $ma$.` },
      { tex: `T = ${fmt(heavy)} - ${fmt(light)} \\times ${fmt(m.a)} = ${fmt(m.T)}` },
    ];
  },
};

/* ---------- Holding the system still ---------- */

interface BalanceParams {
  m1: number;
  t: Angle;
  mu: number;
  ask: 'balance' | 'most' | 'least';
  hard: boolean;
}

/** The mass of B that balances A, or the edges of the band friction can hold. */
export function balanceMass({ m1, t, mu, ask }: Pick<BalanceParams, 'm1' | 't' | 'mu' | 'ask'>): number {
  const spread = ask === 'balance' ? 0 : (ask === 'most' ? 1 : -1) * mu * cosOf(t);
  return m1 * (sinOf(t) + spread);
}

const BALANCE_STEP = 0.2;
const BALANCE_MAX = 12;

const balanceCases = [
  once(() =>
    RIG_ANGLES.flatMap((t) => range(1, 20).map((m1): Omit<BalanceParams, 'hard'> => ({ m1, t, mu: 0, ask: 'balance' }))).filter(fitsBalance),
  ),
  once(() =>
    RIG_ANGLES.flatMap((t) =>
      RIG_MUS.flatMap((mu) => range(1, 20).flatMap((m1) => (['most', 'least'] as const).map((ask): Omit<BalanceParams, 'hard'> => ({ m1, t, mu, ask })))),
    ).filter(fitsBalance),
  ),
];

/** On the slider's lattice, inside its track, and with every line of the picture on it. */
function fitsBalance(p: Omit<BalanceParams, 'hard'>): boolean {
  const mass = balanceMass(p);
  const steps = mass / BALANCE_STEP;
  const top = G * p.m1 * (sinOf(p.t) + p.mu * cosOf(p.t));
  return mass >= 0.4 && mass <= BALANCE_MAX - 0.2 && Math.abs(steps - Math.round(steps)) < 1e-9 && top < G * BALANCE_MAX && exact(G * p.m1 * sinOf(p.t), 3);
}

/** Slider: the mass of B that holds A still on a slope, read where two force lines meet. */
const inclineBalance: Generator<BalanceParams> = {
  id: 'force-incline-balance',
  sample: (rng, difficulty) => ({ ...rng.pick(balanceCases[difficulty > 1 ? 1 : 0]()), hard: difficulty > 1 && rng.chance(0.5) }),
  render: (params) => {
    const { m1, t, mu, ask, hard } = params;
    const pull = G * m1 * sinOf(t);
    const max = mu * G * m1 * cosOf(t);
    const surface = mu > 0 ? `a rough slope, with $\\mu = ${fmt(mu)}$,` : 'a smooth slope';
    const want =
      ask === 'balance'
        ? 'Slide to the mass of $B$, in kilograms, that holds both particles at rest.'
        : `Slide to the ${ask === 'most' ? 'greatest' : 'least'} mass of $B$, in kilograms, for which the particles stay at rest.`;
    return {
      kind: 'slider',
      prompt: [
        say(
          `Particle $A$, of mass $${m1}\\text{ kg}$, lies on ${surface} inclined at $\\alpha$ to the horizontal, where ${angleFacts(t, hard)}. A light inextensible string from $A$ runs up the slope, over a smooth pulley at the top, to particle $B$, which hangs freely. ${G_NOTE}`,
        ),
        say(
          `${want} The graph shows $B$'s weight against its mass, and the pull of $A$'s weight down the slope${mu > 0 ? ', with dashed lines that pull plus and minus the most friction can give' : ''}.`,
        ),
      ],
      min: 0,
      max: BALANCE_MAX,
      step: BALANCE_STEP,
      answer: balanceMass(params),
      readout: 'm_{B} = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: BALANCE_MAX,
          yMin: 0,
          yMax: 1.05 * G * BALANCE_MAX,
          curves: [
            { f: (x) => G * x, accent: true },
            { f: () => pull },
            ...(mu > 0 ? [{ f: () => pull + max, dashed: true }, { f: () => pull - max, dashed: true }] : []),
          ],
          label: `B's weight, a line through the origin, against B's mass along the bottom, crossing the level pull of A's weight down the slope${mu > 0 ? ' and two dashed levels either side of it' : ''}`,
        }),
        ...markerWindow(0, BALANCE_MAX),
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { m1, t, mu, ask, hard } = params;
    const pull = G * m1 * sinOf(t);
    const max = mu * G * m1 * cosOf(t);
    const mass = balanceMass(params);
    if (ask === 'balance') {
      return [
        ...angleStep(t, hard),
        { text: 'At rest the tension equals $B$\'s weight, and it must balance $A$\'s pull down the slope:' },
        { tex: `m_{B} \\times 9.8 = ${fmt(G * m1)} \\times ${fmt(sinOf(t))} = ${fmt(pull)}` },
        { tex: `m_{B} = ${fmt(mass)}` },
      ];
    }
    return [
      ...angleStep(t, hard),
      { tex: `R = ${fmt(G * m1)} \\times ${fmt(cosOf(t))} = ${fmt(G * m1 * cosOf(t))}, \\quad \\mu R = ${fmt(max)}` },
      {
        text:
          ask === 'most'
            ? 'At the greatest mass $A$ is about to be pulled up, so friction acts down the slope at its limit:'
            : 'At the least mass $A$ is about to slide down, so friction acts up the slope at its limit:',
      },
      { tex: `m_{B} \\times 9.8 = ${fmt(pull)} ${ask === 'most' ? '+' : '-'} ${fmt(max)} = ${fmt(G * mass)}` },
      { tex: `m_{B} = ${fmt(mass)}` },
      { text: 'On the graph, that is where $B$\'s weight crosses the dashed line.' },
    ];
  },
};

/* ---------- Friction when nothing moves ---------- */

interface RestStepsParams {
  rig: Rig;
  hard: boolean;
}

/** One reduction of a steps slide: collapse the three tokens around `op`. */
interface Collapse {
  op: number;
  value: number;
  wrong: number[];
}

function collapses(moves: Collapse[]): Extract<Slide, { kind: 'steps' }>['reductions'] {
  return moves.map(({ op, value, wrong }) => ({
    span: [op - 1, op + 2] as [number, number],
    operator: op,
    value: fmt(value),
    bank: stepBank(fmt(value), ...wrong.filter((v) => v > 0 && exact(v, 4) && fmt(v) !== fmt(value)).map(fmt)),
  }));
}

/** Steps: the friction holding a slope-and-pulley system at rest, worked out. */
const inclineRestSteps: Generator<RestStepsParams> = {
  id: 'force-incline-rest-steps',
  sample: (rng, difficulty) => ({ rig: rng.pick(restingHung(true)), hard: difficulty > 1 }),
  render: ({ rig, hard }) => {
    const m = rigMotion(rig);
    const { m1, m2, t1 } = rig;
    const s = sinOf(t1);
    const bHeavy = m.along2 > m.along1;
    const Gm1 = G * m1;
    const wrongs = (v: number) => [v * 10, v / 9.8, v + 9.8];
    let start: string[];
    let moves: Collapse[];
    if (bHeavy) {
      start = hard
        ? [fmt(m2), '\\times', '9.8', '-', fmt(m1), '\\times', '9.8', '\\times', fmt(s)]
        : [fmt(m.along2), '-', fmt(m1), '\\times', '9.8', '\\times', fmt(s)];
      moves = [
        ...(hard ? [{ op: 1, value: m.along2, wrong: [m2 + 9.8, m2 * 10, m.along2 + 1] }] : []),
        { op: 3, value: Gm1, wrong: [m1 + 9.8, m1 * 10, Gm1 * s] },
        { op: 3, value: m.along1, wrong: [Gm1 * cosOf(t1), Gm1 + s, ...wrongs(m.along1)] },
        { op: 1, value: m.F1, wrong: [m.along2 + m.along1, m.F1 + 1, m.F1 * 2] },
      ];
    } else {
      start = hard
        ? [fmt(m1), '\\times', '9.8', '\\times', fmt(s), '-', fmt(m2), '\\times', '9.8']
        : [fmt(m1), '\\times', '9.8', '\\times', fmt(s), '-', fmt(m.along2)];
      moves = [
        { op: 1, value: Gm1, wrong: [m1 + 9.8, m1 * 10, Gm1 * s] },
        { op: 1, value: m.along1, wrong: [Gm1 * cosOf(t1), Gm1 + s, ...wrongs(m.along1)] },
        ...(hard ? [{ op: 3, value: m.along2, wrong: [m2 + 9.8, m2 * 10, m.along2 + 1] }] : []),
        { op: 1, value: m.F1, wrong: [m.along2 + m.along1, m.F1 + 1, m.F1 * 2] },
      ];
    }
    return {
      kind: 'steps',
      prompt: [
        say(`${rigScene(rig, hard)} ${G_NOTE} Released from rest, the particles do not move.`),
        say(
          `${bHeavy ? "$B$ would pull $A$ up the slope, so friction on $A$ acts down it" : '$A$ would slide down the slope, so friction on $A$ acts up it'}, and is just what holds it: the difference between the two pulls. Work out the friction, in newtons: tap the part to do next, then choose what it comes to.`,
        ),
      ],
      start,
      reductions: collapses(moves),
    };
  },
  solution: ({ rig, hard }) => {
    const m = rigMotion(rig);
    const bHeavy = m.along2 > m.along1;
    return [
      ...angleStep(rig.t1, hard),
      { text: 'At rest the tension is $B$\'s weight, and along the slope $A$ is in equilibrium:' },
      {
        tex: bHeavy
          ? `F = ${fmt(m.along2)} - ${fmt(G * rig.m1)} \\times ${fmt(sinOf(rig.t1))} = ${fmt(m.along2)} - ${fmt(m.along1)} = ${fmt(m.F1)}`
          : `F = ${fmt(G * rig.m1)} \\times ${fmt(sinOf(rig.t1))} - ${fmt(m.along2)} = ${fmt(m.along1)} - ${fmt(m.along2)} = ${fmt(m.F1)}`,
      },
      { text: `That is below $\\mu R = ${fmt(rig.mu1 * m.R1)}$, which is why nothing moves: friction gives only what is needed.` },
    ];
  },
};

/* ---------- Over a peg ---------- */

interface PegTableParams {
  rig: Rig;
  hard: boolean;
}

/** Table: each particle's pull down its own face, its normal reaction and its greatest friction. */
const pegTable: Generator<PegTableParams> = {
  id: 'force-peg-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const rig = rng.pick(rng.chance(0.3) ? pegRest() : movingPeg(hard));
    return { rig: !hard && level(rig.t1) ? rng.pick(movingPeg(false)) : rig, hard };
  },
  render: ({ rig, hard }) => {
    const m = rigMotion(rig);
    const F1 = rig.mu1 * m.R1;
    const F2 = rig.mu2 * m.R2;
    const cells = [
      [m.along1, m.R1, F1],
      [m.along2, m.R2, F2],
    ];
    // Easy: the reactions are given. Hard: everything, bar a table's zero.
    const blank = (row: number, col: number) => (row === 0 && col === 0 && level(rig.t1) ? false : hard || col !== 1);
    const answer: number[] = [];
    const rows = cells.map((row, r) => [
      r === 0 ? 'A' : 'B',
      ...row.map((v, c) => {
        if (!blank(r, c)) return fmt(v);
        answer.push(v);
        return null;
      }),
    ]);
    const slips = [G * rig.m1, G * rig.m2, G * rig.m1 * sinOf(rig.t2), G * rig.m2 * sinOf(rig.t1), rig.mu1 * G * rig.m1, rig.mu2 * G * rig.m2];
    return {
      kind: 'table',
      prompt: [
        say(`${rigScene(rig, hard)} ${G_NOTE}`),
        say(
          `For each particle fill in the component of its weight down its own ${level(rig.t1) ? 'surface' : 'slope'}, the normal reaction on it, and the most friction can give, $\\mu R$, all in newtons.`,
        ),
        rigPicture(rig),
      ],
      columns: ['', 'mg\\sin\\theta', 'R', '\\mu R'],
      rows,
      bank: valueBank(answer, slips.filter((v) => v > 0 && exact(v, 3) && !answer.some((a) => fmt(a) === fmt(v)))),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rig, hard }) => {
    const m = rigMotion(rig);
    const row = (name: string, mass: number, t: Angle, mu: number, sym: string): SolutionStep[] => [
      { text: `For $${name}$, with weight $${fmt(mass)} \\times 9.8 = ${fmt(G * mass)}\\text{ N}$:` },
      ...(level(t) ? [] : [{ tex: `${fmt(G * mass)}\\sin${sym} = ${fmt(G * mass * sinOf(t))}` }]),
      { tex: level(t) ? `R = ${fmt(G * mass)}` : `R = ${fmt(G * mass)}\\cos${sym} = ${fmt(G * mass * cosOf(t))}` },
      { tex: `\\mu R = ${fmt(mu)} \\times ${fmt(G * mass * cosOf(t))} = ${fmt(mu * G * mass * cosOf(t))}` },
    ];
    return [
      ...(level(rig.t1) ? [] : angleStep(rig.t1, hard)),
      ...angleStep(rig.t2, hard, '\\beta'),
      ...row('A', rig.m1, rig.t1, rig.mu1, '\\alpha'),
      ...row('B', rig.m2, rig.t2, rig.mu2, '\\beta'),
      ...(level(rig.t1) ? [{ text: 'On the table no part of $A$\'s weight acts along its surface.' }] : []),
      { text: `${m.falls === 'none' ? 'Here' : 'In the next step'} these decide whether the particles move and which way.` },
    ];
  },
};

/** Tiles: both equations of motion over a peg. */
const pegTiles: Generator<RigTilesParams> = {
  id: 'force-peg-tiles',
  sample: (rng, difficulty) => ({ rig: rng.pick(movingPeg(difficulty > 1)), hard: false }),
  render: ({ rig }) => {
    const m = rigMotion(rig);
    const { template, answer } = rigTiles(rig);
    const extras = [m.R1, m.R2, G * rig.m1, G * rig.m2, rig.m1 + rig.m2, rig.mu1 * m.along1, rig.mu2 * m.along2]
      .filter((v) => v > 0 && exact(v, 3))
      .map(fmt);
    return {
      kind: 'tiles',
      prompt: [
        say(`${rigScene(rig, false)} ${G_NOTE} Released from rest, ${motionWords(rig)}`),
        say('Complete the equation of motion for $A$, then for $B$, with forces in newtons and $a$ the acceleration of each.'),
        rigPicture(rig),
      ],
      template,
      bank: tileBank(answer, extras),
      answer,
    };
  },
  solution: ({ rig }) => {
    const m = rigMotion(rig);
    const [eqA, eqB] = equationsOf(rig);
    return [
      {
        text: `Down its own ${level(rig.t1) ? 'surface' : 'slope'}, $A$'s weight pulls with $${fmt(m.along1)}\\text{ N}$ and $B$'s with $${fmt(m.along2)}\\text{ N}$.`,
      },
      { tex: `F_{A} = ${fmt(rig.mu1)} \\times ${fmt(m.R1)} = ${fmt(m.F1)}, \\quad F_{B} = ${fmt(rig.mu2)} \\times ${fmt(m.R2)} = ${fmt(m.F2)}` },
      { text: 'Both frictions act against the motion. Each equation takes that particle\'s own direction of motion as positive, $A$\'s first:' },
      { tex: pairTex([eqA, eqB]) },
    ];
  },
};

/** Expression: the acceleration or the tension over a peg. */
const peg: Generator<RigFindParams> = {
  id: 'force-peg',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { rig: rng.pick(movingPeg(hard)), hard: hard && rng.chance(0.5), find: rng.chance(0.5) ? 'T' : 'a' };
  },
  render: ({ rig, hard, find }) => {
    const m = rigMotion(rig);
    return typed(
      [
        say(
          `${rigScene(rig, hard)} ${G_NOTE} The particles are released from rest. Find ${find === 'a' ? 'their acceleration, in $\\text{m s}^{-2}$' : 'the tension in the string, in newtons'}.`,
        ),
        rigPicture(rig),
      ],
      `${find} =`,
      find === 'a' ? m.a : m.T,
    );
  },
  solution: ({ rig, hard, find }) => rigWorking(rig, hard, find === 'T'),
  choices: rigChoices,
};

/** Flow: which way the particles over a peg would go, and whether both frictions together hold them. */
const pegFlow: Generator<InclineWayParams> = {
  id: 'force-peg-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const pick = () => rng.pick(rng.chance(0.4) ? pegRest() : movingPeg(hard));
    return { rig: hard ? pick() : until(pick, (r) => !level(r.t1)), hard };
  },
  render: ({ rig, hard }) => {
    const m = rigMotion(rig);
    const limit = rig.mu1 * m.R1 + rig.mu2 * m.R2;
    const labels = [...new Set([limit, rig.mu1 * m.R1, rig.mu2 * m.R2, rig.mu1 * G * rig.m1 + rig.mu2 * G * rig.m2].filter((v) => v > 0).map(fmt))]
      .slice(0, 3)
      .sort((x, y) => Number(x) - Number(y));
    const way = m.along2 > m.along1 ? '$B$ down its slope' : level(rig.t1) ? '$A$ off the table' : '$A$ down its slope';
    return {
      kind: 'flow',
      prompt: [say(`${rigScene(rig, hard)} ${G_NOTE} The particles are released from rest. What happens?`), rigPicture(rig)],
      subject: '\\mu R_{A} + \\mu R_{B}',
      steps: [
        {
          id: 'way',
          ask: `Down their own ${level(rig.t1) ? 'faces' : 'slopes'}, $A$'s weight pulls with $${fmt(m.along1)}\\text{ N}$ and $B$'s with $${fmt(m.along2)}\\text{ N}$. Without friction, which way would they move?`,
          branches: [
            { label: '$B$ down its slope', to: 'max' },
            { label: level(rig.t1) ? '$A$ off the table' : '$A$ down its slope', to: 'max' },
          ],
        },
        {
          id: 'max',
          ask: 'What is the most friction can give against that, from both particles together, in newtons?',
          branches: labels.map((v) => ({ label: `$${v}$`, to: 'beat' })),
        },
        {
          id: 'beat',
          ask: 'Is the difference between the two pulls bigger than that?',
          branches: [
            { label: 'Yes, it is bigger', outcome: 'So friction cannot hold them: the particles move, with friction at its limit on both.' },
            { label: 'No, it is not', outcome: 'So friction holds them: the particles stay at rest.' },
          ],
        },
      ],
      answer: [way, `$${fmt(limit)}$`, m.falls === 'none' ? 'No, it is not' : 'Yes, it is bigger'],
    };
  },
  solution: ({ rig, hard }) => {
    const m = rigMotion(rig);
    const F1 = rig.mu1 * m.R1;
    const F2 = rig.mu2 * m.R2;
    const push = Math.abs(m.along2 - m.along1);
    return [
      ...(level(rig.t1) ? [] : angleStep(rig.t1, hard)),
      ...angleStep(rig.t2, hard, '\\beta'),
      { text: `The difference between the pulls is $${fmt(push)}\\text{ N}$, towards ${m.along2 > m.along1 ? '$B$\'s side' : '$A$\'s side'}.` },
      { tex: `\\mu R_{A} = ${fmt(rig.mu1)} \\times ${fmt(m.R1)} = ${fmt(F1)}, \\quad \\mu R_{B} = ${fmt(rig.mu2)} \\times ${fmt(m.R2)} = ${fmt(F2)}` },
      { text: 'Both frictions oppose the motion, so together they can hold back' },
      { tex: `${fmt(F1)} + ${fmt(F2)} = ${fmt(F1 + F2)}` },
      { text: `The push of $${fmt(push)}$ is ${compareWords(push, F1 + F2)} that, so ${m.falls === 'none' ? 'nothing moves' : 'the particles move'}.` },
    ];
  },
};

/* ---------- When the string goes slack ---------- */

export interface SlackParams {
  rig: Rig;
  /** How far B falls before it hits the ground. */
  h: number;
  /** A table only: how far A starts from the pulley; 0 on a slope. */
  L: number;
  hard: boolean;
}

export interface SlackMotion {
  a: number;
  /** A's speed when B lands, and its square. */
  v: number;
  v2: number;
  /** A's deceleration once the string is slack. */
  d: number;
  /** How much further A goes before it stops. */
  s: number;
  /** Whether A then slides back down (a slope), or reaches the pulley (a table). */
  back: boolean;
  reaches: boolean;
}

/** B falls h and lands; A carries on with no tension, slowed by gravity along the slope and friction. */
export function slackOf({ rig, h, L }: Omit<SlackParams, 'hard'>): SlackMotion {
  const { a } = rigMotion(rig);
  const v2 = 2 * a * h;
  const d = G * (sinOf(rig.t1) + rig.mu1 * cosOf(rig.t1));
  const s = v2 / (2 * d);
  return {
    a,
    v: Math.sqrt(v2),
    v2,
    d,
    s,
    back: !level(rig.t1) && sinOf(rig.t1) > rig.mu1 * cosOf(rig.t1) + 1e-9,
    reaches: level(rig.t1) && L - h <= s + 1e-9,
  };
}

/** A on a slope (or a rough table) pulled by B, which then lands: speed, slack distance, all tidy. */
const slackCases = [
  once(() => slackBuild(false)),
  once(() => slackBuild(true)),
];

function slackBuild(rough: boolean): Omit<SlackParams, 'hard'>[] {
  const faces: [Angle, number, Angle, number][] = rough
    ? RIG_ANGLES.flatMap((t) => RIG_MUS.map((mu): [Angle, number, Angle, number] => [t, mu, DROP, 0]))
    : [...RIG_ANGLES.map((t): [Angle, number, Angle, number] => [t, 0, DROP, 0]), ...RIG_MUS.map((mu): [Angle, number, Angle, number] => [FLAT, mu, DROP, 0])];
  const out: Omit<SlackParams, 'hard'>[] = [];
  for (const rig of rigsOf(range(1, 15), faces, (m) => m.falls === 'B' && tidyMotion(m))) {
    for (const h of range(0.2, 4, 0.1).map((v) => Math.round(v * 10) / 10)) {
      const probe = slackOf({ rig, h, L: 0 });
      if (!exact(probe.v, 1) || !exact(probe.s, 1) || !exact(probe.d, 3) || probe.s < 0.1) continue;
      // On a table, A starts either well short of reaching the pulley or with room to spare.
      const L = level(rig.t1) ? Math.round((h + probe.s + (mix(rig.m1, rig.m2, h * 10) % 2 === 0 ? 0.5 : -0.3)) * 10) / 10 : 0;
      if (level(rig.t1) && L <= h + 0.1) continue;
      out.push({ rig, h, L });
    }
  }
  return out;
}

function slackScene({ rig, h, L, hard }: SlackParams): string {
  return `${rigScene(rig, hard)} $B$ is $${fmt(h)}\\text{ m}$ above the ground${level(rig.t1) ? `, and $A$ is $${fmt(L)}\\text{ m}$ from the pulley` : ''}. The system is released from rest, and $B$ does not bounce when it lands.`;
}

/** Expression: A's speed when B lands, or how much further A goes after the string goes slack. */
interface SlackFindParams extends SlackParams {
  find: 'v' | 's';
}

const slackSpeed: Generator<SlackFindParams> = {
  id: 'force-slack-speed',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const base = rng.pick(slackCases[hard ? 1 : 0]());
    return { ...base, hard: hard && rng.chance(0.5), find: hard && rng.chance(0.65) ? 's' : 'v' };
  },
  render: (params) => {
    const k = slackOf(params);
    const table = level(params.rig.t1);
    return typed(
      [
        say(
          `${slackScene(params)} ${G_NOTE} ${
            params.find === 'v'
              ? 'Find the speed of $A$ at the moment $B$ hits the ground, in $\\text{m s}^{-1}$.'
              : `Find how much further $A$ moves ${table ? 'along the table' : 'up the slope'} after $B$ hits the ground, in metres.`
          }`,
        ),
        rigPicture(params.rig, true),
      ],
      `${params.find} =`,
      params.find === 'v' ? k.v : k.s,
    );
  },
  solution: (params) => slackWorking(params, params.find === 's'),
  choices: (params) => {
    const k = slackOf(params);
    const salt = mix(params.rig.m1, params.rig.m2, params.rig.t1.o, params.rig.mu1 * 100, params.h * 10, params.find === 'v' ? 1 : 2);
    return params.find === 'v'
      ? valueChoices(k.v, [k.v2, k.a * params.h, Math.sqrt(G * 2 * params.h), k.v * 2], salt)
      : valueChoices(k.s, [k.s + params.h, k.v2 / (2 * k.a), k.v2 / k.d, k.v / k.d], salt);
  },
};

/** The two stages: taut, then slack. */
function slackWorking(params: SlackParams, further: boolean): SolutionStep[] {
  const { rig, h, hard } = params;
  const k = slackOf(params);
  const table = level(rig.t1);
  const steps: SolutionStep[] = [
    ...rigWorking(rig, hard, false),
    { text: `While the string is taut, $B$ falls $${fmt(h)}\\text{ m}$ from rest. With $v^{2} = u^{2} + 2as$:` },
    { tex: `v^{2} = 2 \\times ${fmt(k.a)} \\times ${fmt(h)} = ${fmt(k.v2)}, \\quad v = ${fmt(k.v)}` },
  ];
  if (!further) return steps;
  return [
    ...steps,
    {
      text: table
        ? 'Once $B$ lands the string goes slack. Only friction acts along the table, against $A$\'s motion:'
        : 'Once $B$ lands the string goes slack. Along the slope, gravity and friction both act down it, against $A$\'s motion:',
    },
    { tex: table ? `${fmt(rig.m1)}d = ${fmt(rig.mu1)} \\times ${fmt(G * rig.m1)}, \\quad d = ${fmt(k.d)}` : `d = 9.8(${fmt(sinOf(rig.t1))}${rig.mu1 > 0 ? ` + ${fmt(rig.mu1)} \\times ${fmt(cosOf(rig.t1))}` : ''}) = ${fmt(k.d)}` },
    { text: 'It comes to rest when $v = 0$:' },
    { tex: `0 = ${fmt(k.v2)} - 2 \\times ${fmt(k.d)}s, \\quad s = ${fmt(k.s)}` },
  ];
}

/** Tree: the acceleration, the speed at landing, the deceleration, then the extra distance. */
const slackStagesTree: Generator<SlackParams> = {
  id: 'force-slack-stages-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { ...rng.pick(slackCases[hard ? 1 : 0]()), hard: hard && rng.chance(0.5) };
  },
  render: (params) => {
    const k = slackOf(params);
    const table = level(params.rig.t1);
    const answer = [k.a, k.v, k.d, k.s];
    return {
      kind: 'tree',
      prompt: [
        say(`${slackScene(params)} ${G_NOTE}`),
        say(
          `Top row: the acceleration while the string is taut, and then the speed of $A$ when $B$ lands. Beside them, $A$'s deceleration once the string is slack. Last, how much further $A$ moves ${table ? 'along the table' : 'up the slope'}. Speeds in $\\text{m s}^{-1}$, distances in metres.`,
        ),
      ],
      expression: 'v^{2} = u^{2} + 2as \\text{ twice}',
      nodes: [
        { id: 'a', from: [] },
        { id: 'v', from: ['a'] },
        { id: 'd', from: [] },
        { id: 's', from: ['v', 'd'] },
      ],
      bank: valueBank(
        answer,
        [k.v2, G * sinOf(params.rig.t1), k.s + params.h, k.v2 / (2 * k.a), G * (sinOf(params.rig.t1) - params.rig.mu1 * cosOf(params.rig.t1))].filter(
          (v) => v > 0 && exact(v, 3),
        ),
      ),
      answer: answer.map(fmt),
    };
  },
  solution: (params) => slackWorking(params, true),
};

/** Steps: s = v^2 / 2d, the extra distance once the string is slack. */
const slackDistanceSteps: Generator<SlackParams> = {
  id: 'force-slack-distance-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    // Only a handful of numbers reach the line, so it draws from every set-up to vary them.
    return { ...rng.pick([...slackCases[0](), ...slackCases[1]()]), hard };
  },
  render: (params) => {
    const k = slackOf(params);
    const { h, hard } = params;
    const table = level(params.rig.t1);
    const start = hard
      ? ['2', '\\times', fmt(k.a), '\\times', fmt(h), '\\div', '(2', '\\times', `${fmt(k.d)})`]
      : [fmt(k.v), '\\times', fmt(k.v), '\\div', '(2', '\\times', `${fmt(k.d)})`];
    const moves: Collapse[] = [
      ...(hard ? [{ op: 1, value: 2 * k.a, wrong: [k.a * k.a, 2 + k.a, k.a / 2] }] : []),
      { op: 1, value: k.v2, wrong: [2 * k.v, k.v2 * 2, k.v2 + 1] },
      { op: 3, value: 2 * k.d, wrong: [k.d * k.d, 2 + k.d, k.d / 2] },
      { op: 1, value: k.s, wrong: [k.v2 * 2 * k.d, k.s * 2, k.s + 1, k.s * 4] },
    ];
    const stage = table
      ? 'Once $B$ lands the string goes slack, and friction slows $A$'
      : 'Once $B$ lands the string goes slack, and gravity and friction slow $A$ as it carries on up the slope';
    return {
      kind: 'steps',
      prompt: [
        say(
          hard
            ? `$A$ and $B$ are joined over a pulley, and move with acceleration $${fmt(k.a)}${ACC}$ from rest until $B$ has fallen $${fmt(h)}\\text{ m}$ and lands. ${stage}, with deceleration $${fmt(k.d)}${ACC}$.`
            : `$B$ lands and $A$ is moving at $${fmt(k.v)}\\text{ m s}^{-1}$. ${stage}, with deceleration $${fmt(k.d)}${ACC}$.`,
        ),
        say(
          `From $v^{2} = u^{2} + 2as$ with $v = 0$, the extra distance is $s = ${hard ? '2ah' : 'u^{2}'} \\div 2d$. Work it out, in metres: tap the part to do next, then choose what it comes to.`,
        ),
      ],
      start,
      reductions: collapses(moves),
    };
  },
  solution: (params) => {
    const k = slackOf(params);
    return [
      ...(params.hard ? [{ tex: `u^{2} = 2 \\times ${fmt(k.a)} \\times ${fmt(params.h)} = ${fmt(k.v2)}` }] : [{ tex: `u^{2} = ${fmt(k.v)}^{2} = ${fmt(k.v2)}` }]),
      { text: 'It stops when $v = 0$, so $0 = u^{2} - 2ds$:' },
      { tex: `s = \\frac{${fmt(k.v2)}}{2 \\times ${fmt(k.d)}} = \\frac{${fmt(k.v2)}}{${fmt(2 * k.d)}} = ${fmt(k.s)}` },
    ];
  },
};

/** Flow: after B lands, A's deceleration and extra distance, then whether it slides back or reaches the pulley. */
const slackFlow: Generator<SlackParams> = {
  id: 'force-slack-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    // Easy: a rough table, where the question is the pulley. Hard: a rough slope, where it is sliding back.
    const pool = hard ? slackCases[1]() : slackCases[0]().filter((c) => level(c.rig.t1));
    return { ...rng.pick(pool), hard: hard && rng.chance(0.5) };
  },
  render: (params) => {
    const k = slackOf(params);
    const { rig } = params;
    const table = level(rig.t1);
    const decels = [...new Set([k.d, G * sinOf(rig.t1), G * (sinOf(rig.t1) - rig.mu1 * cosOf(rig.t1)), k.a, G].filter((v) => v > 0 && exact(v, 3)).map(fmt))]
      .slice(0, 3)
      .sort((x, y) => Number(x) - Number(y));
    const dists = [...new Set([k.s, k.s + params.h, k.v2 / k.d, k.s / 2].filter((v) => v > 0 && exact(v, 3)).map(fmt))]
      .slice(0, 3)
      .sort((x, y) => Number(x) - Number(y));
    const last = table
      ? {
          id: 'end',
          ask: `$A$ had $${fmt(params.L)}\\text{ m}$ to go to the pulley, and has already moved $${fmt(params.h)}\\text{ m}$. Does it reach the pulley?`,
          branches: [
            { label: 'Yes, it reaches it', outcome: 'The distance left is no more than how far it slides.' },
            { label: 'No, it stops short', outcome: 'It slides less than the distance left, so it stops on the table.' },
          ],
        }
      : {
          id: 'end',
          ask: 'Once $A$ stops, compare the pull of its weight down the slope with the most friction can give.',
          branches: [
            { label: 'The pull is bigger', outcome: 'So friction cannot hold it: $A$ slides back down the slope.' },
            { label: 'The pull is not bigger', outcome: 'So friction holds it: $A$ stays where it stopped.' },
          ],
        };
    return {
      kind: 'flow',
      prompt: [say(`${slackScene(params)} ${G_NOTE} What happens to $A$ after $B$ lands?`), rigPicture(rig, true)],
      subject: 'T = 0 \\text{ once } B \\text{ lands}',
      steps: [
        {
          id: 'd',
          ask: `$A$ is moving at $${fmt(k.v)}\\text{ m s}^{-1}$ when the string goes slack. What is its deceleration now, in $\\text{m s}^{-2}$?`,
          branches: decels.map((v) => ({ label: `$${v}$`, to: 's' })),
        },
        {
          id: 's',
          ask: 'How much further does it move before it stops, in metres?',
          branches: dists.map((v) => ({ label: `$${v}$`, to: 'end' })),
        },
        last,
      ],
      answer: [
        `$${fmt(k.d)}$`,
        `$${fmt(k.s)}$`,
        table ? (k.reaches ? 'Yes, it reaches it' : 'No, it stops short') : k.back ? 'The pull is bigger' : 'The pull is not bigger',
      ],
    };
  },
  solution: (params) => {
    const k = slackOf(params);
    const { rig } = params;
    const tail: SolutionStep[] = level(rig.t1)
      ? [{ text: `It has $${fmt(params.L)} - ${fmt(params.h)} = ${fmt(params.L - params.h)}\\text{ m}$ left and slides $${fmt(k.s)}\\text{ m}$, so it ${k.reaches ? 'reaches the pulley' : 'stops short of the pulley'}.` }]
      : [
          { tex: `mg\\sin\\alpha = ${fmt(G * rig.m1 * sinOf(rig.t1))}, \\quad \\mu R = ${fmt(rig.mu1 * G * rig.m1 * cosOf(rig.t1))}` },
          { text: k.back ? 'The pull down the slope beats the most friction can give, so $A$ slides back down.' : 'Friction can hold the pull down the slope, so $A$ stays where it stopped.' },
        ];
    return [...slackWorking(params, true), ...tail];
  },
};

/* ---------- Free-body diagrams ---------- */

type PickKind = 'hangB' | 'smooth' | 'rough' | 'roughRest' | 'peg';

interface InclinePickParams {
  kind: PickKind;
  m1: number;
  m2: number;
  angle: number;
  rises: 'left' | 'right';
}

interface PickArrow extends ForceArrow {
  acts: boolean;
  why: string;
}

/** Every candidate arrow on the diagram, which act, and why. */
function pickArrows({ kind, rises }: InclinePickParams): PickArrow[] {
  const W: PickArrow = { id: 'down', label: 'W', acts: true, why: 'The weight always acts, straight down.' };
  if (kind === 'hangB') {
    const side = rises === 'right' ? 'left' : 'right';
    return [
      W,
      { id: 'up', label: 'T', acts: true, why: 'The string pulls $B$ up along itself: the tension $T$.' },
      { id: side, label: 'R', acts: false, why: 'Nothing touches $B$ but the string, so there is no normal reaction.' },
      { id: rises, label: 'F', acts: false, why: 'Nor any friction: $B$ is not on a surface.' },
    ];
  }
  const F: PickArrow =
    kind === 'smooth'
      ? { id: 'downSlope', label: 'F', acts: false, why: 'The slope is smooth, so there is no friction.' }
      : {
          id: 'downSlope',
          label: 'F',
          acts: true,
          why:
            kind === 'roughRest'
              ? 'The string would pull $A$ up the slope, so friction acts down the slope to hold it.'
              : '$A$ moves up the slope, so friction acts down it, against the motion.',
        };
  return [
    W,
    { id: 'outOfSlope', label: 'R', acts: true, why: 'The slope pushes at right angles to its surface: $R$ acts out of the slope.' },
    { id: 'up', label: 'R', acts: false, why: 'A reaction drawn straight up is not at right angles to the slope, so that $R$ is wrong.' },
    {
      id: 'upSlope',
      label: 'T',
      acts: true,
      why: `The string runs up the slope to the ${kind === 'peg' ? 'peg' : 'pulley'}, so the tension pulls $A$ up the slope.`,
    },
    F,
    { id: rises, label: 'T', acts: false, why: 'The string runs along the slope, so the tension is along it, not horizontal.' },
  ];
}

const PICK_STORIES: Record<PickKind, (p: InclinePickParams) => string> = {
  hangB: ({ m1, m2, angle }) =>
    `Particle $A$, of mass $${m1}\\text{ kg}$, is on a smooth slope at $${angle}^{\\circ}$ to the horizontal, joined by a light string over a smooth pulley at the top to particle $B$, of mass $${m2}\\text{ kg}$, which hangs freely. $B$ falls. The diagram shows $B$.`,
  smooth: ({ m1, m2, angle }) =>
    `Particle $A$, of mass $${m1}\\text{ kg}$, is on a smooth slope at $${angle}^{\\circ}$ to the horizontal, joined by a light string over a smooth pulley at the top to particle $B$, of mass $${m2}\\text{ kg}$, which hangs freely. $B$ falls. The diagram shows $A$.`,
  rough: ({ m1, m2, angle }) =>
    `Particle $A$, of mass $${m1}\\text{ kg}$, is on a rough slope at $${angle}^{\\circ}$ to the horizontal, joined by a light string over a smooth pulley at the top to particle $B$, of mass $${m2}\\text{ kg}$, which hangs freely. $B$ falls. The diagram shows $A$.`,
  roughRest: ({ m1, m2, angle }) =>
    `Particle $A$, of mass $${m1}\\text{ kg}$, is on a rough slope at $${angle}^{\\circ}$ to the horizontal, joined by a light string over a smooth pulley at the top to particle $B$, of mass $${m2}\\text{ kg}$, which hangs freely. Without friction $B$ would fall, but the system stays at rest. The diagram shows $A$.`,
  peg: ({ m1, m2, angle }) =>
    `Particle $A$, of mass $${m1}\\text{ kg}$, is on a rough slope at $${angle}^{\\circ}$ to the horizontal. A light string from $A$ runs over a smooth peg at the top to particle $B$, of mass $${m2}\\text{ kg}$, on a steeper rough slope on the far side. $B$ slides down its slope. The diagram shows $A$.`,
};

/** Forces (pick): the forces on one particle of a connected pair. */
const inclinePick: Generator<InclinePickParams> = {
  id: 'force-incline-pick',
  sample: (rng, difficulty) => ({
    kind: rng.pick<PickKind>(difficulty > 1 ? ['rough', 'roughRest', 'peg'] : ['hangB', 'smooth']),
    m1: rng.int(2, 15),
    m2: rng.int(2, 15),
    angle: rng.pick([25, 30, 35, 40]),
    rises: rng.pick(['left', 'right'] as const),
  }),
  render: (params) => {
    const arrows = pickArrows(params);
    const scene: ForceScene = params.kind === 'hangB' ? { surface: 'hanging' } : { surface: 'slope', angle: params.angle, rises: params.rises };
    const letters = [...new Set(arrows.map((a) => a.label))];
    const meaning: Record<string, string> = { W: 'the weight', R: 'a normal reaction', T: 'the tension', F: 'friction' };
    return {
      kind: 'forces',
      mode: 'pick',
      prompt: [
        say(PICK_STORIES[params.kind](params)),
        say(`On the diagram ${letters.map((l) => `$${l}$ is ${meaning[l]}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}. Tap every force that acts on ${params.kind === 'hangB' ? '$B$' : '$A$'}.`),
      ],
      scene,
      arrows: arrows.map(({ id, label }) => ({ id, label })),
      answer: canonicalForces(arrows.filter((a) => a.acts).map((a) => a.id).join('|')),
    };
  },
  solution: (params) => {
    const arrows = pickArrows(params);
    const acting = arrows.filter((a) => a.acts);
    return [
      ...arrows.map((a) => ({ text: a.why })),
      { text: `So ${acting.length} forces act: ${acting.map((a) => `$${a.label}$`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.` },
    ];
  },
};

type FillQuantity = 'W' | 'R' | 'T' | 'F';

interface InclineFillParams {
  rig: Rig;
  rises: 'left' | 'right';
  blanks: FillQuantity[];
}

/** A on the 3-4-5 slope, B hanging and falling: the only slope the diagram can draw at its true angle. */
const fillCases = [
  once(() => rigsOf(range(0.5, 15, 0.5), [[A34, 0, DROP, 0]], (m) => m.falls === 'B' && tidyMotion(m))),
  once(() => rigsOf(range(1, 20), RIG_MUS.map((mu): [Angle, number, Angle, number] => [A34, mu, DROP, 0]), (m) => m.falls === 'B' && tidyMotion(m))),
];

/** 36.9 degrees: tan = 3/4, drawn to one place as the diagram labels it. */
const A34_DEGREES = Math.round((Math.atan2(3, 4) * 1800) / Math.PI) / 10;

function fillValues(rig: Rig): Record<FillQuantity, number> {
  const m = rigMotion(rig);
  return { W: G * rig.m1, R: m.R1, T: m.T, F: m.F1 };
}

/** Forces (fill): the magnitudes of the forces on A as B pulls it up the slope. */
const inclineFill: Generator<InclineFillParams> = {
  id: 'force-incline-fill',
  sample: (rng, difficulty) => {
    const rough = difficulty > 1;
    return {
      rig: rng.pick(fillCases[rough ? 1 : 0]()),
      rises: rng.pick(['left', 'right'] as const),
      blanks: rng.pick<FillQuantity[]>(rough ? [['R', 'F'], ['F', 'T'], ['R', 'F', 'T'], ['W', 'F']] : [['R', 'T'], ['W', 'R'], ['T'], ['W', 'T']]),
    };
  },
  render: ({ rig, rises, blanks }) => {
    const v = fillValues(rig);
    const m = rigMotion(rig);
    const rough = rig.mu1 > 0;
    const order: FillQuantity[] = rough ? ['W', 'R', 'T', 'F'] : ['W', 'R', 'T'];
    const dir: Record<FillQuantity, Direction> = { W: 'down', R: 'outOfSlope', T: 'upSlope', F: 'downSlope' };
    const arrows: ForceArrow[] = order.map((q) => ({ id: dir[q], label: q, ...(blanks.includes(q) ? {} : { given: fmt(v[q]) }) }));
    const answer = order.filter((q) => blanks.includes(q)).map((q) => fmt(v[q]));
    const slips = [m.along1, G * rig.m2, rig.m2 * (G + m.a), rig.mu1 * G * rig.m1, G * rig.m1 * sinOf(A43), m.T - m.F1]
      .filter((x) => x > 0 && exact(x, 3))
      .map(fmt);
    const spare = [...new Set(slips)].filter((t) => !answer.includes(t)).slice(0, 3);
    return {
      kind: 'forces',
      mode: 'fill',
      prompt: [
        say(
          `Particle $A$, of mass $${fmt(rig.m1)}\\text{ kg}$, is pulled up a ${rough ? `rough slope, with $\\mu = ${fmt(rig.mu1)}$,` : 'smooth slope'} inclined at $\\alpha$ to the horizontal, where $\\sin\\alpha = 0.6$ and $\\cos\\alpha = 0.8$, by a string over a smooth pulley at the top to particle $B$, of mass $${fmt(rig.m2)}\\text{ kg}$, which hangs and falls with acceleration $${fmt(m.a)}${ACC}$.`,
        ),
        say(
          `The diagram shows the forces on $A$: $W$ its weight, $R$ the normal reaction, $T$ the tension${rough ? ' and $F$ friction' : ''}. ${G_NOTE} Fill in the missing forces, in newtons.`,
        ),
      ],
      scene: { surface: 'slope', angle: A34_DEGREES, rises },
      arrows,
      bank: [...answer, ...spare].sort((x, y) => Number(x) - Number(y)),
      answer,
    };
  },
  solution: ({ rig }) => {
    const v = fillValues(rig);
    const m = rigMotion(rig);
    return [
      { tex: `W = ${fmt(rig.m1)} \\times 9.8 = ${fmt(v.W)}` },
      { tex: `R = ${fmt(v.W)} \\times 0.8 = ${fmt(v.R)}` },
      ...(rig.mu1 > 0 ? [{ tex: `F = \\mu R = ${fmt(rig.mu1)} \\times ${fmt(v.R)} = ${fmt(v.F)}` }] : []),
      { text: '$B$ alone: its weight less the tension gives it its $ma$, so' },
      { tex: `T = ${fmt(m.along2)} - ${fmt(rig.m2)} \\times ${fmt(m.a)} = ${fmt(v.T)}` },
    ];
  },
};

/* ---------- Checking a tension ---------- */

interface InclineCheckParams {
  rig: Rig;
  slip: 'none' | 'plus' | 'minus';
  hard: boolean;
}

/** The tension a student claims: right, B's equation with the sign slipped, or A's. */
export function claimedTension({ rig, slip }: Pick<InclineCheckParams, 'rig' | 'slip'>): number {
  const m = rigMotion(rig);
  if (slip === 'plus') return rig.m2 * (G + m.a);
  if (slip === 'minus') return m.along1 + m.F1 - rig.m1 * m.a;
  return m.T;
}

/** Flow: check a claimed tension against B's weight and what holds A back. */
const inclineCheck: Generator<InclineCheckParams> = {
  id: 'force-incline-check',
  sample: (rng, difficulty) => {
    const rough = difficulty > 1;
    return until(
      (): InclineCheckParams => ({
        rig: rng.pick(movingHung(rough).filter((r) => rigMotion(r).falls === 'B')),
        slip: rng.pick(['none', 'none', 'plus', 'minus'] as const),
        hard: rough && rng.chance(0.5),
      }),
      (p) => claimedTension(p) > 0.5,
    );
  },
  render: ({ rig, slip, hard }) => {
    const m = rigMotion(rig);
    const claim = claimedTension({ rig, slip });
    const back = m.along1 + m.F1;
    return {
      kind: 'flow',
      prompt: [
        say(`${rigScene(rig, hard)} ${G_NOTE} Released from rest, $B$ falls.`),
        say(`A student finds $a = ${fmt(m.a)}${ACC}$ and $T = ${fmt(claim)}\\text{ N}$. Check the tension.`),
      ],
      subject: `m_{A}g\\sin\\alpha${rig.mu1 > 0 ? ' + F' : ''} < T < m_{B}g`,
      steps: [
        {
          id: 'b',
          ask: `$B$ accelerates downwards. Is the tension less than $B$'s weight, $${fmt(m.along2)}\\text{ N}$?`,
          branches: [
            { label: 'Yes, it is less', to: 'a' },
            { label: 'No, it is not', outcome: 'So the tension is wrong: to accelerate downwards, $B$ must be pulled up by less than its weight.' },
          ],
        },
        {
          id: 'a',
          ask: `$A$ accelerates up the slope. Is the tension more than what holds $A$ back along the slope, $${fmt(back)}\\text{ N}$?`,
          branches: [
            { label: 'Yes, it is more', outcome: 'Both checks pass, so the tension is believable.' },
            { label: 'No, it is not', outcome: 'So the tension is wrong: to accelerate up the slope, $A$ must be pulled harder than it is held back.' },
          ],
        },
      ],
      answer: claim >= m.along2 - 1e-9 ? ['No, it is not'] : claim <= back + 1e-9 ? ['Yes, it is less', 'No, it is not'] : ['Yes, it is less', 'Yes, it is more'],
    };
  },
  solution: ({ rig, slip, hard }) => {
    const m = rigMotion(rig);
    const claim = claimedTension({ rig, slip });
    const back = m.along1 + m.F1;
    return [
      ...angleStep(rig.t1, hard),
      { tex: `m_{B}g = ${fmt(rig.m2)} \\times 9.8 = ${fmt(m.along2)}` },
      {
        tex: `${fmt(G * rig.m1)} \\times ${fmt(sinOf(rig.t1))}${rig.mu1 > 0 ? ` + ${fmt(rig.mu1)} \\times ${fmt(m.R1)}` : ''} = ${fmt(back)}`,
      },
      { text: `So a believable tension sits between $${fmt(back)}$ and $${fmt(m.along2)}$. The claimed $${fmt(claim)}$ ${claim > back && claim < m.along2 ? 'does' : 'does not'}.` },
      {
        text:
          slip === 'plus'
            ? `The slip: $B$'s equation written as $T - m_{B}g = m_{B}a$, as if it were rising. In fact $T = ${fmt(rig.m2)}(9.8 - ${fmt(m.a)}) = ${fmt(m.T)}$.`
            : slip === 'minus'
              ? `The slip: $A$'s equation with $ma$ on the wrong side. In fact $T = ${fmt(back)} + ${fmt(rig.m1)} \\times ${fmt(m.a)} = ${fmt(m.T)}$.`
              : `It is right: $T = ${fmt(rig.m2)}(9.8 - ${fmt(m.a)}) = ${fmt(m.T)}$.`,
      },
    ];
  },
};

/* ================================================================
 * Level 5: momentum and impulse
 * ================================================================ */

/*
 * Along a line a velocity carries a sign: every question says once that right
 * is positive, and a velocity to the left is negative. Masses are whole
 * kilograms or halves and velocities whole metres per second; anything found
 * by dividing (a velocity after a collision, a common velocity, a force from
 * Ft = mv - mu) is drawn again through `until` until it comes out whole or
 * exact. A collision cannot be pictured on the `forces` kind, which draws one
 * box, so `collisionSvg` draws the particles before and after.
 */

const MS = '\\text{ m s}^{-1}';
const KGMS = '\\text{ kg m s}^{-1}';
const NS = '\\text{ N s}';
const RIGHT = 'Take right as positive.';

/** A mass as the prose quotes it; `forces.test.ts` reads masses back in this form. */
const kg = (m: number): string => `$${fmt(m)}\\text{ kg}$`;

/**
 * A velocity along a line in words: the one place its sign becomes a
 * direction. `forces.test.ts` reads velocities back through this phrasing.
 */
function moving(v: number): string {
  return v === 0 ? 'at rest' : `moving ${v < 0 ? 'left' : 'right'} at $${fmt(Math.abs(v))}${MS}$`;
}

/** A vector with its unit: `$(3\mathbf{i} - 2\mathbf{j})\text{ m s}^{-1}$`. */
const vecTex = (a: number, b: number, unit: string): string => `$(${ijTex(a, b)})${unit}$`;

/** A whole mass in kilograms from `lo` to `hi`, or a whole or half one when `hard`. */
const massOf = (rng: Rng, hard: boolean, lo = 1, hi = 8): number => (hard ? rng.int(2 * lo, 2 * hi) / 2 : rng.int(lo, hi));

/** A tile's value: `12`, `- 4`, `+ 3`. */
const tileValue = (token: string): number => Number(token.replace(/[\s+]/g, ''));

/**
 * Whether the answer is the only way to fill the blanks from `bank`. Numbers
 * that happen to make the statement true are a right answer the grade would
 * mark wrong, so a bank that allows them is refused. `after` lists the blanks
 * that follow a term: only a tile with its own sign reads as a term there,
 * since `12` after `8` is not `8 + 12`.
 */
function onlyAnswer(answer: string[], bank: string[], holds: (values: number[]) => boolean, after: number[] = []): boolean {
  const used = bank.map(() => false);
  const pick: string[] = [];
  const walk = (): boolean => {
    if (pick.length === answer.length) return !(holds(pick.map(tileValue)) && pick.some((t, i) => t !== answer[i]));
    for (let i = 0; i < bank.length; i += 1) {
      if (used[i] || (after.includes(pick.length) && !/^[+-]/.test(bank[i]))) continue;
      used[i] = true;
      pick.push(bank[i]);
      const fine = walk();
      pick.pop();
      used[i] = false;
      if (!fine) return false;
    }
    return true;
  };
  return walk();
}

/** The extras that keep the answer the only way to fill the blanks, in the order given. */
function soleExtras(answer: string[], extras: string[], holds: (values: number[]) => boolean, after: number[] = []): string[] {
  const kept: string[] = [];
  for (const token of extras) {
    if (answer.includes(token) || kept.includes(token) || kept.length >= 4) continue;
    if (onlyAnswer(answer, [...answer, ...kept, token], holds, after)) kept.push(token);
  }
  return kept;
}

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/* ---------- Pictures ---------- */

export interface Body {
  name: string;
  mass: number;
  /** Velocity with right positive. A string is an unknown, drawn dashed and labelled with it. */
  v: number | string;
  /** Which way an unknown is drawn: the positive way unless the question says otherwise. */
  dir?: number;
}

export interface MomentumRow {
  title: string;
  bodies: Body[];
  /** Two bodies drawn touching, as before they push apart. */
  touching?: boolean;
}

/**
 * Particles on a line, a row for before and a row for after, each box with
 * its velocity arrow above it. Plain SVG text for letters and speeds, since
 * KaTeX cannot go in an SVG.
 */
export function collisionSvg(rows: MomentumRow[], label: string): string {
  const W = 300;
  const ROW = 96;
  const f = (v: number) => v.toFixed(1);
  const parts = [`<svg viewBox="0 0 ${W} ${ROW * rows.length}" width="100%" role="img" aria-label="${label}">`];
  rows.forEach((row, r) => {
    const floor = r * ROW + 86;
    const top = floor - 30;
    parts.push(
      `<text x="4" y="${r * ROW + 13}" fill="currentColor" font-size="12" opacity="0.7">${row.title}</text>`,
      `<line x1="4" y1="${floor}" x2="${W - 4}" y2="${floor}" stroke="currentColor" stroke-width="1.5" opacity="0.55" />`,
    );
    const widths = row.bodies.map((b) => Math.max(60, 7 * (b.name.length + fmt(b.mass).length + 4) + 12));
    const centres =
      row.bodies.length === 1 ? [W / 2] : row.touching ? [W / 2 - widths[0] / 2, W / 2 + widths[1] / 2] : [95, 205];
    row.bodies.forEach((body, i) => {
      const cx = centres[i];
      const w = widths[i];
      parts.push(
        `<rect x="${f(cx - w / 2)}" y="${top}" width="${w}" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2" />`,
        `<text x="${f(cx)}" y="${top + 15}" fill="currentColor" font-size="13" text-anchor="middle" dominant-baseline="central"><tspan font-style="italic">${body.name}</tspan> ${fmt(body.mass)} kg</text>`,
      );
      const y = top - 14;
      if (body.v === 0) {
        parts.push(`<text x="${f(cx)}" y="${y}" fill="currentColor" font-size="12" text-anchor="middle" opacity="0.7">at rest</text>`);
        return;
      }
      const unknown = typeof body.v === 'string';
      const dir = typeof body.v === 'string' ? (body.dir ?? 1) : Math.sign(body.v);
      const x0 = cx - dir * 18;
      const x1 = cx + dir * 22;
      const look = `class="plot-accent" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"${unknown ? ' stroke-dasharray="5 4"' : ''}`;
      const head = (turn: number) =>
        `<line x1="${f(x1)}" y1="${y}" x2="${f(x1 - dir * 9 * Math.cos(turn))}" y2="${f(y - 9 * Math.sin(turn))}" class="plot-accent" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />`;
      parts.push(`<line x1="${f(x0)}" y1="${y}" x2="${f(x1)}" y2="${y}" ${look} />`, head(0.45), head(-0.45));
      const text =
        typeof body.v === 'string' ? `<tspan font-style="italic">${body.v}</tspan>` : `${fmt(Math.abs(body.v))} m s⁻¹`;
      parts.push(`<text x="${f(cx + dir * 2)}" y="${y - 10}" fill="currentColor" font-size="12" text-anchor="middle">${text}</text>`);
    });
  });
  parts.push('</svg>');
  return parts.join('');
}

/* ---------- Momentum ---------- */

const THINGS = ['trolley', 'ball', 'puck', 'block', 'toy car', 'cart', 'box', 'particle'];

interface MomentumParams {
  thing: string;
  m: number;
  v: number;
  find: 'p' | 'v' | 'm';
}

/** Expression: p = mv along a line, or run backwards for the velocity or the mass. */
const momentum: Generator<MomentumParams> = {
  id: 'force-momentum',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      thing: rng.pick(THINGS),
      m: hard ? rng.int(2, 17) / 2 : rng.int(1, 12),
      v: sizeSign(rng, 1, hard ? 15 : 12),
      find: hard ? rng.pick<MomentumParams['find']>(['p', 'v', 'm']) : 'p',
    };
  },
  render: ({ thing, m, v, find }) => {
    const p = m * v;
    if (find === 'v') {
      return typed(
        [say(`A ${thing} of mass ${kg(m)} has momentum $${fmt(p)}${KGMS}$. ${RIGHT} Find its velocity, in $\\text{m s}^{-1}$.`)],
        'v =',
        v,
      );
    }
    if (find === 'm') {
      return typed(
        [say(`A ${thing} is ${moving(v)}, and its momentum has size $${fmt(Math.abs(p))}${KGMS}$. Find its mass, in kilograms.`)],
        'm =',
        m,
      );
    }
    return typed(
      [say(`A ${thing} of mass ${kg(m)} is ${moving(v)}. ${RIGHT} Find its momentum, in $\\text{kg m s}^{-1}$.`)],
      'p =',
      p,
    );
  },
  solution: ({ m, v, find }) => {
    const p = m * v;
    if (find === 'v') {
      return [
        { text: 'Momentum is mass times velocity, so the velocity is the momentum over the mass:' },
        { tex: `v = \\frac{p}{m} = \\frac{${fmt(p)}}{${fmt(m)}} = ${fmt(v)}` },
        { text: v < 0 ? 'The minus sign says it is moving left.' : 'It is positive, so it is moving right.' },
      ];
    }
    if (find === 'm') {
      return [
        { text: 'The size of the momentum is the mass times the speed, so divide by the speed:' },
        { tex: `m = \\frac{${fmt(Math.abs(p))}}{${fmt(Math.abs(v))}} = ${fmt(m)}` },
      ];
    }
    return [
      { text: 'Momentum is mass times velocity, and the velocity keeps its sign:' },
      { tex: `p = mv = ${fmt(m)} \\times ${paren(v)} = ${fmt(p)}` },
      ...(v < 0 ? [{ text: 'It moves left, so its momentum is negative too.' }] : []),
    ];
  },
  choices: ({ m, v, find }) => {
    const p = m * v;
    const salt = mix(m * 2, v, find.length, find.charCodeAt(0));
    if (find === 'v') return valueChoices(v, [-v, p - m, p * m], salt);
    if (find === 'm') return valueChoices(m, [Math.abs(p * v), Math.abs(p) - Math.abs(v), 2 * m], salt);
    return valueChoices(p, [-p, m + v, m - v], salt);
  },
};

interface MomentumIjParams {
  m: number;
  v: Pt;
  /** For the hard form: the direction it was given in, and the speed. */
  dir: Pt;
  speed: number;
}

/** Tiles: momentum as an i, j vector, from a velocity given as a vector or as a speed and a direction. */
const momentumTiles: Generator<MomentumIjParams> = {
  id: 'force-momentum-tiles',
  sample: (rng, difficulty) => {
    if (difficulty < 2) {
      return { m: rng.int(2, 6), v: [sizeSign(rng, 1, 6), sizeSign(rng, 1, 6)], dir: [0, 0], speed: 0 };
    }
    const [p, q, h] = rng.pick(PRIMITIVE.slice(0, 2));
    const [a, b] = rng.chance(0.5) ? [p, q] : [q, p];
    const dir: Pt = [a * rng.sign(), b * rng.sign()];
    const k = rng.int(1, 2);
    return { m: rng.int(3, 13) / 2, v: [k * dir[0], k * dir[1]], dir, speed: k * h };
  },
  render: ({ m, v, dir, speed }) => {
    const [px, py] = [m * v[0], m * v[1]];
    const answer = [bare(px), signed(py)];
    const extras = [bare(v[0]), signed(v[1]), bare(py), signed(px), bare(-px), signed(-py), bare(m + v[0]), signed(m + v[1])];
    const given =
      speed > 0
        ? `moves at $${fmt(speed)}${MS}$ in the direction of $${ijTex(dir[0], dir[1])}$`
        : `moves with velocity ${vecTex(v[0], v[1], MS)}`;
    return {
      kind: 'tiles',
      prompt: [say(`A particle of mass ${kg(m)} ${given}. Write its momentum in $\\mathbf{i}$, $\\mathbf{j}$ form, in $\\text{kg m s}^{-1}$.`)],
      template: '\\mathbf{p} = ({0}\\mathbf{i} {1}\\mathbf{j})',
      bank: tileBank(answer, soleExtras(answer, extras, ([x, y]) => near(x, px) && near(y, py), [1])),
      answer,
    };
  },
  solution: ({ m, v, dir, speed }) => [
    ...(speed > 0
      ? [
          { text: 'First the velocity: scale the direction to the right speed.' },
          { tex: `|${ijTex(dir[0], dir[1])}| = \\sqrt{${sq(dir[0])} + ${sq(dir[1])}} = ${fmt(Math.hypot(dir[0], dir[1]))}` },
          { tex: `\\mathbf{v} = ${fmt(speed / Math.hypot(dir[0], dir[1]))}(${ijTex(dir[0], dir[1])}) = ${ijTex(v[0], v[1])}` },
        ]
      : []),
    { text: 'Momentum is the mass times the velocity, each component in turn:' },
    { tex: `\\mathbf{p} = m\\mathbf{v} = ${fmt(m)}(${ijTex(v[0], v[1])}) = ${ijTex(m * v[0], m * v[1])}` },
  ],
};

interface MomentumRowParams {
  m: number;
  v: number;
  blank: 'm' | 'v' | 'p';
}

interface MomentumTableParams {
  rows: MomentumRowParams[];
}

/** Table: mass, velocity and momentum for three particles, one quantity missing from each. */
const momentumTable: Generator<MomentumTableParams> = {
  id: 'force-momentum-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const blanks: MomentumRowParams['blank'][] = hard ? turned(['m', 'v', 'p'], rng.int(0, 2)) : ['p', 'p', 'p'];
    return until(
      () => ({
        rows: blanks.map((blank) => ({ m: hard ? rng.int(2, 17) / 2 : rng.int(1, 10), v: sizeSign(rng, 1, 9), blank })),
      }),
      ({ rows }) => new Set(rows.map((r) => `${r.m},${r.v}`)).size === 3 && rows.some((r) => r.v < 0) && rows.some((r) => r.v > 0),
    );
  },
  render: ({ rows }) => {
    const answer: number[] = [];
    const cell = (value: number, blank: boolean) => {
      if (!blank) return fmt(value);
      answer.push(value);
      return null;
    };
    const slips = rows.flatMap(({ m, v }) => [-m * v, m + v]);
    return {
      kind: 'table',
      prompt: [
        say(
          `Each row is a particle moving along a line. ${RIGHT} Masses are in kilograms, velocities in $\\text{m s}^{-1}$ and momenta in $\\text{kg m s}^{-1}$. Fill in the gaps.`,
        ),
      ],
      columns: ['', 'm', 'v', 'p'],
      rows: rows.map(({ m, v, blank }, i) => [
        ['A', 'B', 'C'][i],
        cell(m, blank === 'm'),
        cell(v, blank === 'v'),
        cell(m * v, blank === 'p'),
      ]),
      bank: valueBank(answer, slips),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map(({ m, v, blank }, i): SolutionStep => {
      const name = ['A', 'B', 'C'][i];
      if (blank === 'v') return { tex: `v_{${name}} = \\frac{p}{m} = \\frac{${fmt(m * v)}}{${fmt(m)}} = ${fmt(v)}` };
      if (blank === 'm') return { tex: `m_{${name}} = \\frac{p}{v} = \\frac{${fmt(m * v)}}{${fmt(v)}} = ${fmt(m)}` };
      return { tex: `p_{${name}} = ${fmt(m)} \\times ${paren(v)} = ${fmt(m * v)}` };
    }),
};

interface MomentumSliderParams {
  m: number;
  v: number;
  /** The hard form: another particle, whose momentum shares the total. */
  other?: { m: number; v: number };
}

const V_SPAN = 8;

/** Slider: the velocity at which a particle has a given momentum, on the line p = mv. */
const momentumSlider: Generator<MomentumSliderParams> = {
  id: 'force-momentum-slider',
  sample: (rng, difficulty) => {
    if (difficulty < 2) return { m: rng.int(2, 8), v: sizeSign(rng, 1, V_SPAN - 1) };
    return until(
      () => ({ m: rng.int(3, 12) / 2, v: sizeSign(rng, 1, V_SPAN - 1), other: { m: rng.int(1, 6), v: sizeSign(rng, 1, 9) } }),
      ({ m, v, other }) => m * v + other!.m * other!.v !== 0 && Math.sign(v) !== Math.sign(other!.v),
    );
  },
  render: ({ m, v, other }) => {
    const total = m * v + (other ? other.m * other.v : 0);
    const line = `$p = ${fmt(m)}v$`;
    return {
      kind: 'slider',
      prompt: [
        say(
          other
            ? `Particles $A$ and $B$ move along a line with total momentum $${fmt(total)}${KGMS}$. ${RIGHT} $A$ has mass ${kg(other.m)} and is ${moving(other.v)}. $B$ has mass ${kg(m)}. The line is ${line} for $B$. Slide to $B$'s velocity, in $\\text{m s}^{-1}$.`
            : `A particle of mass ${kg(m)} has momentum $${fmt(total)}${KGMS}$. ${RIGHT} The line is ${line}, with velocity along the bottom. Slide to its velocity, in $\\text{m s}^{-1}$.`,
        ),
      ],
      min: -V_SPAN,
      max: V_SPAN,
      step: 0.5,
      answer: v,
      readout: 'v = {v}',
      figure: {
        svg: plotSvg({
          xMin: -V_SPAN,
          xMax: V_SPAN,
          yMin: -(V_SPAN + 0.5) * m,
          yMax: (V_SPAN + 0.5) * m,
          curves: [{ f: (x) => m * x }],
          horizontals: other ? [] : [total],
          label: `The line p = ${fmt(m)}v through the origin, with velocity along the bottom`,
        }),
        ...markerWindow(-V_SPAN, V_SPAN),
        axis: 'x',
      },
    };
  },
  solution: ({ m, v, other }) => [
    ...(other
      ? [
          { text: `$A$'s momentum is $${fmt(other.m)} \\times ${paren(other.v)} = ${fmt(other.m * other.v)}$, and $B$ has the rest:` },
          { tex: `p_{B} = ${fmt(m * v + other.m * other.v)} ${signed(-other.m * other.v)} = ${fmt(m * v)}` },
        ]
      : []),
    { tex: `v = \\frac{${fmt(m * v)}}{${fmt(m)}} = ${fmt(v)}` },
    { text: `${v < 0 ? 'Negative, so it moves left. ' : ''}On the graph, that is where the line reaches a momentum of $${fmt(m * v)}$.` },
  ],
};

/* ---------- Conservation along a line ---------- */

/** Two particles on a line, $A$ to the left of $B$, before and after they collide. */
export interface Collision {
  mA: number;
  mB: number;
  uA: number;
  uB: number;
  vA: number;
  vB: number;
}

const pBefore = (c: Collision): number => c.mA * c.uA + c.mB * c.uB;

/**
 * Whether a collision could happen: $A$ catches $B$, they do not pass
 * through each other, and no kinetic energy appears from nowhere. Nothing
 * here asks about energy, but a question should not describe the impossible.
 */
const possible = (c: Collision): boolean =>
  c.uA > c.uB && c.vB >= c.vA && c.mA * c.vA ** 2 + c.mB * c.vB ** 2 <= c.mA * c.uA ** 2 + c.mB * c.uB ** 2 + 1e-9;

/**
 * A collision with every velocity whole. Easy: $B$ starts at rest. Hard: $B$
 * moves either way, and a mass may be a half. $B$'s velocity after is built
 * from the rest and the draw repeated until it is whole.
 */
function collisionOf(rng: Rng, hard: boolean, ok: (c: Collision) => boolean = () => true): Collision {
  return until(
    () => {
      const mA = massOf(rng, hard);
      const mB = massOf(rng, hard);
      const uA = rng.int(2, 12);
      const uB = hard ? sizeSign(rng, 1, 8) : 0;
      const vA = rng.int(-8, 10);
      return { mA, mB, uA, uB, vA, vB: (mA * uA + mB * uB - mA * vA) / mB };
    },
    (c) => Number.isInteger(c.vB) && Math.abs(c.vB) <= 12 && c.vA !== c.uA && c.vB > c.vA && possible(c) && ok(c),
  );
}

/** The prose setting a collision up, before; `forces.test.ts` reads masses and velocities from it in order. */
const collisionScene = (c: Collision): string =>
  `Particle $A$, of mass ${kg(c.mA)}, is ${moving(c.uA)}. It collides with particle $B$, of mass ${kg(c.mB)}, which is ${moving(c.uB)} on the same line. ${RIGHT}`;

function collisionPicture(c: Collision, after: { A: number | string; B: number | string }): Block {
  return picture(
    collisionSvg(
      [
        { title: 'Before', bodies: [{ name: 'A', mass: c.mA, v: c.uA }, { name: 'B', mass: c.mB, v: c.uB }] },
        { title: 'After', bodies: [{ name: 'A', mass: c.mA, v: after.A }, { name: 'B', mass: c.mB, v: after.B }] },
      ],
      'Particles A and B before and after the collision, with their velocities',
    ),
  );
}

/** The conservation line with one velocity after unknown, then solved. */
function conservationWorking(c: Collision, find: 'A' | 'B'): SolutionStep[] {
  const before = pBefore(c);
  const known = find === 'B' ? c.mA * c.vA : c.mB * c.vB;
  const mass = find === 'B' ? c.mB : c.mA;
  const answer = find === 'B' ? c.vB : c.vA;
  const unknown = `${fmt(mass)}v_{${find}}`;
  const rhs = find === 'B' ? `${fmt(c.mA)} \\times ${paren(c.vA)} + ${unknown}` : `${unknown} + ${fmt(c.mB)} \\times ${paren(c.vB)}`;
  return [
    { text: 'Total momentum before equals total momentum after:' },
    { tex: `${fmt(c.mA)} \\times ${paren(c.uA)} + ${fmt(c.mB)} \\times ${paren(c.uB)} = ${rhs}` },
    { tex: `${fmt(before)} = ${find === 'B' ? `${fmt(known)} + ${unknown}` : `${unknown} ${signed(known)}`}` },
    { tex: `v_{${find}} = \\frac{${fmt(before)} ${signed(-known)}}{${fmt(mass)}} = ${fmt(answer)}` },
    {
      text:
        answer < 0
          ? `Negative: $${find}$ moves left afterwards.`
          : answer === 0
            ? `$${find}$ is left at rest.`
            : `Positive: $${find}$ moves right afterwards.`,
    },
  ];
}

interface CollideParams {
  c: Collision;
  find: 'A' | 'B';
}

/** Expression: the unknown velocity after a collision along a line. */
const collide: Generator<CollideParams> = {
  id: 'force-collide',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const find = hard && rng.chance(0.5) ? 'A' : 'B';
    return { c: collisionOf(rng, hard, (c) => (find === 'B' ? c.vA : c.vB) !== 0), find };
  },
  render: ({ c, find }) => {
    const other = find === 'B' ? 'A' : 'B';
    return typed(
      [
        say(`${collisionScene(c)} After the collision $${other}$ is ${moving(find === 'B' ? c.vA : c.vB)}.`),
        say(`Find the velocity of $${find}$ after the collision, in $\\text{m s}^{-1}$.`),
        collisionPicture(c, find === 'B' ? { A: c.vA, B: 'v' } : { A: 'v', B: c.vB }),
      ],
      `v_{${find}} =`,
      find === 'B' ? c.vB : c.vA,
    );
  },
  solution: ({ c, find }) => conservationWorking(c, find),
  choices: ({ c, find }) => {
    const answer = find === 'B' ? c.vB : c.vA;
    const mass = find === 'B' ? c.mB : c.mA;
    const known = find === 'B' ? c.mA * c.vA : c.mB * c.vB;
    const unsigned = c.mA * Math.abs(c.uA) + c.mB * Math.abs(c.uB);
    return valueChoices(answer, [-answer, (unsigned - known) / mass, pBefore(c) / mass, (pBefore(c) + known) / mass], mix(c.mA * 2, c.mB * 2, c.uA, c.uB, c.vA));
  },
};

/** The conservation equation as tiles, and the rule it must satisfy. */
function collideTilesOf({ c, find }: CollideParams): { template: string; answer: string[]; holds: (x: number[]) => boolean; after: number[] } {
  const [pA, pB, qA, qB] = [c.mA * c.uA, c.mB * c.uB, c.mA * c.vA, c.mB * c.vB];
  const moving2 = c.uB !== 0;
  if (find === 'B') {
    return moving2
      ? { template: '{0} {1} = {2} {3}v_{B}', answer: [bare(pA), signed(pB), bare(qA), signed(c.mB)], holds: ([a, b, d, m]) => near(a + b, d + m * c.vB), after: [1, 3] }
      : { template: '{0} = {1} {2}v_{B}', answer: [bare(pA), bare(qA), signed(c.mB)], holds: ([a, d, m]) => near(a, d + m * c.vB), after: [2] };
  }
  return moving2
    ? { template: '{0} {1} = {2}v_{A} {3}', answer: [bare(pA), signed(pB), bare(c.mA), signed(qB)], holds: ([a, b, m, d]) => near(a + b, m * c.vA + d), after: [1, 3] }
    : { template: '{0} = {1}v_{A} {2}', answer: [bare(pA), bare(c.mA), signed(qB)], holds: ([a, m, d]) => near(a, m * c.vA + d), after: [2] };
}

function collideExtras({ c, find }: CollideParams): string[] {
  const [pA, pB, qA, qB] = [c.mA * c.uA, c.mB * c.uB, c.mA * c.vA, c.mB * c.vB];
  return find === 'B'
    ? [signed(-pB), bare(-qA), signed(c.mA), bare(c.uA), bare(pA + pB), signed(c.uB), bare(c.vA), signed(qA)]
    : [signed(-pB), signed(-qB), bare(c.mB), bare(c.uA), bare(pA + pB), signed(c.vB), bare(-pA), bare(qA)];
}

/** Tiles: the conservation of momentum equation for a collision, with one velocity after unknown. */
const collideTiles: Generator<CollideParams> = {
  id: 'force-collide-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return until(
      () => {
        const find: CollideParams['find'] = hard && rng.chance(0.5) ? 'A' : 'B';
        return { c: collisionOf(rng, hard, (c) => (find === 'B' ? c.vA : c.vB) !== 0), find };
      },
      (params) => {
        const { answer, holds, after } = collideTilesOf(params);
        return onlyAnswer(answer, answer, holds, after);
      },
    );
  },
  render: (params) => {
    const { c, find } = params;
    const { template, answer, holds, after } = collideTilesOf(params);
    const other = find === 'B' ? 'A' : 'B';
    return {
      kind: 'tiles',
      prompt: [
        say(`${collisionScene(c)} After the collision $${other}$ is ${moving(find === 'B' ? c.vA : c.vB)}.`),
        say(`Complete the equation for $v_{${find}}$, $${find}$'s velocity after, with each momentum worked out in $\\text{kg m s}^{-1}$: total before on the left, total after on the right.`),
        collisionPicture(c, find === 'B' ? { A: c.vA, B: 'v' } : { A: 'v', B: c.vB }),
      ],
      template,
      bank: tileBank(answer, soleExtras(answer, collideExtras(params), holds, after)),
      answer,
    };
  },
  solution: ({ c, find }) => conservationWorking(c, find),
};

/** Tree: each momentum before, the total, the known momentum after, then $B$'s momentum and velocity. */
const collideSumTree: Generator<{ c: Collision }> = {
  id: 'force-collide-sum-tree',
  sample: (rng, difficulty) => ({ c: collisionOf(rng, difficulty > 1, (c) => c.vA !== 0) }),
  render: ({ c }) => {
    const [pA, pB, qA, qB] = [c.mA * c.uA, c.mB * c.uB, c.mA * c.vA, c.mB * c.vB];
    const answer = [pA, pB, qA, pA + pB, qB, c.vB];
    return {
      kind: 'tree',
      prompt: [
        say(`${collisionScene(c)} After the collision $A$ is ${moving(c.vA)}.`),
        say(
          "Find $B$'s velocity after, in $\\text{m s}^{-1}$. Top row: $A$'s momentum before, $B$'s before and $A$'s after. Then the total before, $B$'s momentum after, and its velocity.",
        ),
        collisionPicture(c, { A: c.vA, B: 'v' }),
      ],
      expression: 'm_{A}u_{A} + m_{B}u_{B} = m_{A}v_{A} + m_{B}v_{B}',
      nodes: [
        { id: 'pA', from: [] },
        { id: 'pB', from: [] },
        { id: 'qA', from: [] },
        { id: 'total', from: ['pA', 'pB'] },
        { id: 'qB', from: ['total', 'qA'] },
        { id: 'vB', from: ['qB'] },
      ],
      bank: valueBank(answer, [-pB, pA - pB, pA + pB + qA, qB * c.mB, -qB], 3),
      answer: answer.map(fmt),
    };
  },
  solution: ({ c }) => {
    const [pA, pB, qA, qB] = [c.mA * c.uA, c.mB * c.uB, c.mA * c.vA, c.mB * c.vB];
    return [
      { tex: `p_{A} = ${fmt(c.mA)} \\times ${paren(c.uA)} = ${fmt(pA)}, \\quad p_{B} = ${fmt(c.mB)} \\times ${paren(c.uB)} = ${fmt(pB)}` },
      { tex: `\\text{total} = ${fmt(pA)} ${signed(pB)} = ${fmt(pA + pB)}` },
      { text: `After, $A$ has $${fmt(c.mA)} \\times ${paren(c.vA)} = ${fmt(qA)}$, and $B$ has the rest of the total:` },
      { tex: `${fmt(pA + pB)} ${signed(-qA)} = ${fmt(qB)}` },
      { tex: `v_{B} = \\frac{${fmt(qB)}}{${fmt(c.mB)}} = ${fmt(c.vB)}` },
    ];
  },
};

type Way = 'same' | 'back' | 'stop';

const WAY_LABELS: Record<Way, string> = {
  same: 'Carries on to the right',
  back: 'Bounces back to the left',
  stop: 'It stops',
};

/** Flow: $A$'s momentum after a collision, and whether it carries on, stops or bounces back. */
const collideFlow: Generator<{ c: Collision }> = {
  id: 'force-collide-flow',
  sample: (rng, difficulty) => {
    const way = rng.pick<Way>(['same', 'back', 'stop']);
    return {
      c: collisionOf(rng, difficulty > 1, (c) => c.vB !== 0 && (way === 'stop' ? c.vA === 0 : way === 'back' ? c.vA < 0 : c.vA > 0)),
    };
  },
  render: ({ c }) => {
    const total = pBefore(c);
    const qB = c.mB * c.vB;
    const qA = total - qB;
    const values = (right: number, wrong: number[]) =>
      [...new Set([right, ...wrong].filter((v) => v !== right).map(fmt))]
        .slice(0, 2)
        .concat(fmt(right))
        .sort((x, y) => Number(x) - Number(y));
    const totals = values(total, [c.mA * c.uA - c.mB * c.uB, c.mA * c.uA, total + 1]);
    const afters = values(qA, [total + qB, qB - total, qA + 1]);
    const way: Way = c.vA === 0 ? 'stop' : c.vA < 0 ? 'back' : 'same';
    return {
      kind: 'flow',
      prompt: [
        say(`${collisionScene(c)} After the collision $B$ is ${moving(c.vB)}. What does $A$ do?`),
        collisionPicture(c, { A: 'v', B: c.vB }),
      ],
      subject: 'm_{A}u_{A} + m_{B}u_{B} = m_{A}v_{A} + m_{B}v_{B}',
      steps: [
        {
          id: 'total',
          ask: 'What is the total momentum before the collision, in $\\text{kg m s}^{-1}$?',
          branches: totals.map((v) => ({ label: `$${v}$`, to: 'after' })),
        },
        {
          id: 'after',
          ask: `$B$ leaves with $${fmt(c.mB)} \\times ${paren(c.vB)} = ${fmt(qB)}$. So what momentum does $A$ have after?`,
          branches: afters.map((v) => ({ label: `$${v}$`, to: 'way' })),
        },
        {
          id: 'way',
          ask: 'So which way does $A$ go after the collision?',
          branches: (['same', 'back', 'stop'] as Way[]).map((w) => ({
            label: WAY_LABELS[w],
            outcome:
              w === 'stop'
                ? 'Zero momentum after: $A$ is brought to rest.'
                : w === 'back'
                  ? "Negative momentum after: $A$ bounces back."
                  : 'Positive momentum after: $A$ carries on, slower.',
          })),
        },
      ],
      answer: [`$${fmt(total)}$`, `$${fmt(qA)}$`, WAY_LABELS[way]],
    };
  },
  solution: ({ c }) => [...conservationWorking(c, 'A')],
};

/* ---------- Coalescing and separating ---------- */

interface CoalesceParams {
  c: Collision;
  find: 'v' | 'uB' | 'mB';
}

/**
 * Two particles that coalesce: $A$ catches $B$ and they move on as one,
 * both with velocity `vA = vB`. The common velocity is drawn first and $B$'s
 * velocity before is built from it, drawn again until whole.
 */
function coalescingOf(rng: Rng, hard: boolean, ok: (c: Collision) => boolean = () => true): Collision {
  return until(
    () => {
      const mA = massOf(rng, hard);
      const mB = massOf(rng, hard);
      const uA = rng.int(2, 12);
      const v = rng.int(-6, 9);
      const uB = ((mA + mB) * v - mA * uA) / mB;
      return { mA, mB, uA, uB, vA: v, vB: v };
    },
    (c) => Number.isInteger(c.uB) && Math.abs(c.uB) <= 12 && c.uA > c.uB && c.vA !== 0 && (hard ? c.uB !== 0 : c.uB === 0 || c.uB > 0) && ok(c),
  );
}

const coalesceScene = (c: Collision, knowB: boolean): string =>
  `Particle $A$, of mass ${kg(c.mA)}, is ${moving(c.uA)}. It collides with particle $B$, of mass ${kg(c.mB)}${knowB ? `, which is ${moving(c.uB)} on the same line` : ''}. They coalesce, moving on together as one particle. ${RIGHT}`;

function coalescePicture(c: Collision, before: number | string, after: number | string): Block {
  return picture(
    collisionSvg(
      [
        { title: 'Before', bodies: [{ name: 'A', mass: c.mA, v: c.uA }, { name: 'B', mass: c.mB, v: before }] },
        { title: 'After', bodies: [{ name: 'A+B', mass: c.mA + c.mB, v: after }] },
      ],
      'Particles A and B before they coalesce, then moving on as one',
    ),
  );
}

/** Expression: the common velocity after coalescing, or run backwards for $B$'s velocity or mass. */
const coalesce: Generator<CoalesceParams> = {
  id: 'force-coalesce',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const find = hard ? rng.pick<CoalesceParams['find']>(['v', 'uB', 'mB']) : 'v';
    return { c: coalescingOf(rng, hard, (c) => find !== 'mB' || c.uB !== c.vA), find };
  },
  render: ({ c, find }) => {
    if (find === 'uB') {
      return typed(
        [
          say(`${coalesceScene(c, false)} Afterwards they are ${moving(c.vA)}.`),
          say(`Find $B$'s velocity before the collision, in $\\text{m s}^{-1}$.`),
          coalescePicture(c, 'u', c.vA),
        ],
        'u_{B} =',
        c.uB,
      );
    }
    if (find === 'mB') {
      return typed(
        [
          say(
            `Particle $A$, of mass ${kg(c.mA)}, is ${moving(c.uA)}. It collides with particle $B$, which is ${moving(c.uB)} on the same line, and they coalesce. ${RIGHT} Afterwards they are ${moving(c.vA)}.`,
          ),
          say(`Find the mass of $B$, in kilograms.`),
        ],
        'm_{B} =',
        c.mB,
      );
    }
    return typed(
      [
        say(`${coalesceScene(c, true)}`),
        say(`Find their velocity after the collision, in $\\text{m s}^{-1}$.`),
        coalescePicture(c, c.uB, 'v'),
      ],
      'v =',
      c.vA,
    );
  },
  solution: ({ c, find }) => {
    const before = `${fmt(c.mA)} \\times ${paren(c.uA)} + ${find === 'mB' ? 'm' : fmt(c.mB)} \\times ${find === 'uB' ? 'u_{B}' : paren(c.uB)}`;
    const after = `(${fmt(c.mA)} + ${find === 'mB' ? 'm' : fmt(c.mB)}) \\times ${find === 'v' ? 'v' : paren(c.vA)}`;
    const lines: SolutionStep[] = [
      { text: 'Stuck together they have one velocity, and momentum is conserved:' },
      { tex: `${before} = ${after}` },
    ];
    if (find === 'v') {
      lines.push({ tex: `${fmt(pBefore(c))} = ${fmt(c.mA + c.mB)}v, \\quad v = ${fmt(c.vA)}` });
    } else if (find === 'uB') {
      lines.push(
        { tex: `${fmt(c.mA * c.uA)} + ${fmt(c.mB)}u_{B} = ${fmt((c.mA + c.mB) * c.vA)}` },
        { tex: `u_{B} = \\frac{${fmt((c.mA + c.mB) * c.vA)} ${signed(-c.mA * c.uA)}}{${fmt(c.mB)}} = ${fmt(c.uB)}` },
      );
    } else {
      lines.push(
        { tex: `${fmt(c.mA * c.uA)} ${signed(c.uB)}m = ${fmt(c.mA * c.vA)} ${signed(c.vA)}m` },
        { tex: `m = \\frac{${fmt(c.mA * c.uA)} ${signed(-c.mA * c.vA)}}{${fmt(c.vA)} ${signed(-c.uB)}} = ${fmt(c.mB)}` },
      );
    }
    const v = find === 'uB' ? c.uB : find === 'v' ? c.vA : 0;
    if (v < 0) lines.push({ text: 'Negative, so that is to the left.' });
    return lines;
  },
  choices: ({ c, find }) => {
    const salt = mix(c.mA * 2, c.mB * 2, c.uA, c.uB, find.length);
    if (find === 'uB') return valueChoices(c.uB, [-c.uB, (c.mB * c.vA - c.mA * c.uA) / c.mB, ((c.mA + c.mB) * c.vA + c.mA * c.uA) / c.mB], salt);
    if (find === 'mB') return valueChoices(c.mB, [(c.mA * c.uA) / c.vA - c.mA, c.mA, c.mB * 2], salt);
    return valueChoices(c.vA, [-c.vA, pBefore(c) / c.mB, (c.mA * c.uA - c.mB * c.uB) / (c.mA + c.mB), pBefore(c) / c.mA], salt);
  },
};

/** Steps: the common velocity, one product, sum and quotient at a time. */
const jointSteps: Generator<{ c: Collision }> = {
  id: 'force-joint-steps',
  sample: (rng, difficulty) =>
    ({ c: coalescingOf(rng, difficulty > 1, (c) => (difficulty > 1 ? c.uB < 0 : c.uB > 0)) }),
  render: ({ c }) => {
    const [pA, pB] = [c.mA * c.uA, c.mB * c.uB];
    const M = c.mA + c.mB;
    const bank = (value: number, ...wrong: number[]) =>
      stepBank(fmt(value), ...wrong.filter((v) => Number.isFinite(v) && exact(v, 4) && fmt(v) !== fmt(value)).map(fmt));
    return {
      kind: 'steps',
      prompt: [
        say(`${coalesceScene(c, true)}`),
        say(
          'Their velocity after is the total momentum over their total mass. Work it out: tap the part to do next, then choose what it comes to.',
        ),
        coalescePicture(c, c.uB, 'v'),
      ],
      start: ['(', fmt(c.mA), '\\times', paren(c.uA), '+', fmt(c.mB), '\\times', paren(c.uB), ')', '\\div', fmt(M)],
      reductions: [
        { span: [1, 4], operator: 2, value: fmt(pA), bank: bank(pA, c.mA + c.uA, pA + 1, pA - 1) },
        // Bracketed when negative, so the line never reads `20 + -12`.
        { span: [3, 6], operator: 4, value: paren(pB), bank: bank(pB, -pB, c.mB + c.uB, pB + 1).map((v) => paren(Number(v))) },
        { span: [0, 5], operator: 2, value: fmt(pA + pB), bank: bank(pA + pB, pA - pB, pA + pB + 1, pA + pB - 2) },
        { span: [0, 3], operator: 1, value: fmt(c.vA), bank: bank(c.vA, -c.vA, c.vA + 1, (pA + pB) / c.mA) },
      ],
    };
  },
  solution: ({ c }) => [
    { text: 'Momentum before, all of it carried by the joined particle after:' },
    { tex: `${fmt(c.mA)} \\times ${paren(c.uA)} + ${fmt(c.mB)} \\times ${paren(c.uB)} = ${fmt(c.mA * c.uA)} ${signed(c.mB * c.uB)} = ${fmt(pBefore(c))}` },
    { tex: `v = \\frac{${fmt(pBefore(c))}}{${fmt(c.mA + c.mB)}} = ${fmt(c.vA)}` },
    ...(c.vA < 0 ? [{ text: 'Negative: the joined particle moves left.' }] : []),
  ],
};

/** Two bodies pushed apart from rest: the first moves left, the second right. */
interface Separation {
  m1: number;
  m2: number;
  v1: number;
  v2: number;
}

/** A pair pushed apart from rest, the second's velocity drawn and the first's built from it until whole. */
function separationOf(m1: () => number, m2: () => number, v2: () => number): Separation {
  return until(
    () => {
      const [a, b, v] = [m1(), m2(), v2()];
      return { m1: a, m2: b, v1: (-b * v) / a, v2: v };
    },
    (s) => Number.isInteger(s.v1) && s.v1 !== 0 && s.m1 !== s.m2,
  );
}

interface SeparateTableParams {
  s: Separation;
  /** The hard form asks for the first mass instead of the first velocity. */
  findMass: boolean;
}

/** Table: two particles pushed apart from rest, each one's momentum, and the missing velocity or mass. */
const separateTable: Generator<SeparateTableParams> = {
  id: 'force-separate-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const s = separationOf(
      () => massOf(rng, hard, 1, 10),
      () => massOf(rng, hard, 1, 10),
      () => rng.int(1, 12),
    );
    return { s, findMass: hard && rng.chance(0.5) };
  },
  render: ({ s, findMass }) => {
    const p2 = s.m2 * s.v2;
    const answer = findMass ? [s.m1, -p2, p2] : [s.v1, -p2, p2];
    return {
      kind: 'table',
      prompt: [
        say(
          `Particles $A$ and $B$ rest against each other on a smooth surface, with a compressed spring between them. The spring is released and they move apart along a line, $A$ to the left and $B$ to the right. ${RIGHT}`,
        ),
        say('Masses are in kilograms, velocities in $\\text{m s}^{-1}$ and momenta in $\\text{kg m s}^{-1}$. Fill in the gaps.'),
        picture(
          collisionSvg(
            [
              { title: 'Before', touching: true, bodies: [{ name: 'A', mass: s.m1, v: 0 }, { name: 'B', mass: s.m2, v: 0 }] },
              { title: 'After', bodies: [{ name: 'A', mass: s.m1, v: findMass ? s.v1 : 'v', dir: -1 }, { name: 'B', mass: s.m2, v: s.v2 }] },
            ],
            'Particles A and B at rest together, then moving apart',
          ),
        ),
      ],
      columns: ['', 'm', 'v', 'p'],
      rows: findMass
        ? [
            ['A', null, fmt(s.v1), null],
            ['B', fmt(s.m2), fmt(s.v2), null],
          ]
        : [
            ['A', fmt(s.m1), null, null],
            ['B', fmt(s.m2), fmt(s.v2), null],
          ],
      bank: valueBank(answer, [-s.v1, s.m2, p2 / s.m1 + 1, s.m1 * s.v2]),
      answer: answer.map(fmt),
    };
  },
  solution: ({ s, findMass }) => {
    const p2 = s.m2 * s.v2;
    return [
      { tex: `p_{B} = ${fmt(s.m2)} \\times ${fmt(s.v2)} = ${fmt(p2)}` },
      { text: 'They start at rest, so the total momentum is zero, before and after. $A$ carries the opposite of $B$\'s momentum:' },
      { tex: `p_{A} = ${fmt(-p2)}` },
      findMass
        ? { tex: `m_{A} = \\frac{${fmt(-p2)}}{${fmt(s.v1)}} = ${fmt(s.m1)}` }
        : { tex: `v_{A} = \\frac{${fmt(-p2)}}{${fmt(s.m1)}} = ${fmt(s.v1)}` },
    ];
  },
};

interface SeparateScene {
  /** The first-named body, whose velocity is asked, and the second. */
  names: [string, string];
  /** The same two, named again once introduced. */
  later: [string, string];
  /** How they are set apart. */
  how: string;
}

const SCENES: SeparateScene[] = [
  { names: ['a skater', 'a second skater'], later: ['the first skater', 'the second skater'], how: 'stand together on smooth ice and push off each other' },
  { names: ['a cannon', 'its shell'], later: ['the cannon', 'the shell'], how: 'are at rest, and the cannon fires the shell horizontally' },
  { names: ['a boat', 'a diver'], later: ['the boat', 'the diver'], how: 'are at rest on still water, and the diver jumps horizontally off the back' },
  { names: ['a trolley', 'a second trolley'], later: ['the first trolley', 'the second trolley'], how: 'rest together on a smooth track, and a spring between them is released' },
];

interface SeparateFlowParams {
  scene: number;
  s: Separation;
}

const upper = (s: string): string => s[0].toUpperCase() + s.slice(1);

/** Flow: two bodies pushed apart from rest, which way the first goes and how fast. */
const separateFlow: Generator<SeparateFlowParams> = {
  id: 'force-separate-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const scene = rng.int(0, SCENES.length - 1);
    const draw: [() => number, () => number, () => number][] = [
      [() => 5 * rng.int(8, 18), () => 5 * rng.int(8, 18), () => rng.int(1, hard ? 6 : 4)],
      [() => 50 * rng.int(2, 8), () => rng.int(2, 10), () => 10 * rng.int(5, 25)],
      [() => 10 * rng.int(10, 40), () => 5 * rng.int(10, 18), () => rng.int(2, 6)],
      [() => massOf(rng, hard, 1, 8), () => massOf(rng, hard, 1, 8), () => rng.int(1, 9)],
    ];
    const [m1, m2, v2] = draw[scene];
    return { scene, s: separationOf(m1, m2, v2) };
  },
  render: ({ scene, s }) => {
    const { names, later, how } = SCENES[scene];
    const [first, second] = later;
    const p2 = s.m2 * s.v2;
    const speed = Math.abs(s.v1);
    const labels = (right: number, wrong: number[]) =>
      [...new Set(wrong.filter((v) => Number.isFinite(v) && exact(v, 4) && fmt(v) !== fmt(right)).map(fmt))]
        .slice(0, 2)
        .concat(fmt(right))
        .sort((x, y) => Number(x) - Number(y));
    const speeds = labels(speed, [s.v2, (s.m1 * s.v2) / s.m2, speed + 1, speed * 2]);
    return {
      kind: 'flow',
      prompt: [
        say(
          `${upper(names[0])}, of mass ${kg(s.m1)}, and ${names[1]}, of mass ${kg(s.m2)}, ${how}. Afterwards ${second} is ${moving(s.v2)}. ${RIGHT} What does ${first} do?`,
        ),
      ],
      subject: `0 = ${fmt(s.m1)}v + ${fmt(s.m2)} \\times ${fmt(s.v2)}`,
      steps: [
        {
          id: 'total',
          ask: 'What is the total momentum before they separate, in $\\text{kg m s}^{-1}$?',
          branches: labels(0, [p2, -p2]).map((v) => ({ label: `$${v}$`, to: 'first' })),
        },
        {
          id: 'first',
          ask: `${upper(second)} has momentum $${fmt(s.m2)} \\times ${fmt(s.v2)} = ${fmt(p2)}$. So what momentum does ${first} have?`,
          branches: labels(-p2, [p2, 0]).map((v) => ({ label: `$${v}$`, to: 'speed' })),
        },
        {
          id: 'speed',
          ask: `So how fast does ${first} move, in $\\text{m s}^{-1}$? It goes left, the opposite way.`,
          branches: speeds.map((v) => ({ label: `$${v}$`, outcome: `${upper(first)} moves left at $${v}${MS}$.` })),
        },
      ],
      answer: ['$0$', `$${fmt(-p2)}$`, `$${fmt(speed)}$`],
    };
  },
  solution: ({ scene, s }) => {
    const [first] = SCENES[scene].later;
    const p2 = s.m2 * s.v2;
    return [
      { text: 'Everything starts at rest, so the total momentum is zero before and after:' },
      { tex: `0 = ${fmt(s.m1)}v + ${fmt(p2)}` },
      { tex: `v = \\frac{${fmt(-p2)}}{${fmt(s.m1)}} = ${fmt(s.v1)}` },
      { text: `Negative, so ${first} moves left, at $${fmt(Math.abs(s.v1))}${MS}$.` },
    ];
  },
};

/* ---------- Impulse ---------- */

interface ImpulseParams {
  kind: 'line' | 'wall' | 'rebound' | 'after';
  m: number;
  u: number;
  v: number;
}

/**
 * Expression: impulse as the change in momentum. Easy: along a line, or the
 * size of a wall's impulse on a ball that bounces straight back. Hard: run
 * backwards, for the speed after from the impulse.
 */
const impulse: Generator<ImpulseParams> = {
  id: 'force-impulse',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = hard ? rng.pick<ImpulseParams['kind']>(['line', 'rebound', 'after']) : rng.pick<ImpulseParams['kind']>(['line', 'wall']);
    const m = massOf(rng, true, 0.5, hard ? 6 : 4);
    // A wall gives back no more speed than the ball brings.
    if (kind === 'wall' || kind === 'rebound') {
      const u = rng.int(2, 15);
      return { kind, m, u, v: -rng.int(1, u) };
    }
    return until(
      () => ({ kind, m, u: sizeSign(rng, 1, 12), v: sizeSign(rng, 1, 12) }),
      ({ u, v }) => u !== v,
    );
  },
  render: ({ kind, m, u, v }) => {
    const I = m * (v - u);
    if (kind === 'wall') {
      return typed(
        [
          say(
            `A ball of mass ${kg(m)}, ${moving(u)}, hits a wall at right angles and bounces straight back, ${moving(v)}. Find the size of the impulse the wall gives the ball, in $\\text{N s}$.`,
          ),
        ],
        '|I| =',
        Math.abs(I),
      );
    }
    if (kind === 'rebound') {
      return typed(
        [
          say(
            `A ball of mass ${kg(m)}, ${moving(u)}, hits a wall at right angles and bounces straight back. The wall gives it an impulse of size $${fmt(Math.abs(I))}${NS}$. Find the speed it bounces back at, in $\\text{m s}^{-1}$.`,
          ),
        ],
        'v =',
        -v,
      );
    }
    if (kind === 'after') {
      return typed(
        [
          say(
            `A particle of mass ${kg(m)} is ${moving(u)} when it receives an impulse of $${fmt(Math.abs(I))}${NS}$ to the ${I < 0 ? 'left' : 'right'}. ${RIGHT} Find its velocity afterwards, in $\\text{m s}^{-1}$.`,
          ),
        ],
        'v =',
        v,
      );
    }
    return typed(
      [
        say(
          `A particle of mass ${kg(m)} is ${moving(u)}. A blow leaves it ${moving(v)}. ${RIGHT} Find the impulse of the blow, in $\\text{N s}$.`,
        ),
      ],
      'I =',
      I,
    );
  },
  solution: ({ kind, m, u, v }) => {
    const I = m * (v - u);
    const change = `I = mv - mu = ${fmt(m)} \\times ${paren(v)} - ${fmt(m)} \\times ${paren(u)} = ${fmt(I)}`;
    if (kind === 'rebound') {
      return [
        { text: `With right positive the ball arrives with $${fmt(u)}$ and leaves with $-v$, so the impulse is to the left:` },
        { tex: `-${fmt(Math.abs(I))} = ${fmt(m)}(-v) - ${fmt(m)} \\times ${fmt(u)}` },
        { tex: `${fmt(m)}v = ${fmt(Math.abs(I))} - ${fmt(m * u)} = ${fmt(-m * v)}, \\quad v = ${fmt(-v)}` },
      ];
    }
    if (kind === 'after') {
      return [
        { text: 'The impulse is the change in momentum, so add it to the momentum before:' },
        { tex: `${fmt(m)}v = ${fmt(m * u)} ${signed(I)} = ${fmt(m * v)}` },
        { tex: `v = \\frac{${fmt(m * v)}}{${fmt(m)}} = ${fmt(v)}` },
      ];
    }
    return [
      { text: 'Impulse is the change in momentum, after minus before, with right positive:' },
      { tex: change },
      ...(kind === 'wall'
        ? [{ text: `Its size is $${fmt(Math.abs(I))}\\text{ N s}$, pointing left, away from the wall. The speeds add, since the velocity changes sign.` }]
        : []),
    ];
  },
  choices: ({ kind, m, u, v }) => {
    const I = m * (v - u);
    const salt = mix(m * 2, u, v, kind.length);
    if (kind === 'wall') return valueChoices(Math.abs(I), [m * Math.abs(u + v), m * u, m * Math.abs(v)], salt);
    if (kind === 'rebound') return valueChoices(-v, [Math.abs(I) / m + u, v + 2 * u, Math.abs(I) / m], salt);
    if (kind === 'after') return valueChoices(v, [u - I / m, -v, u + I], salt);
    return valueChoices(I, [-I, m * (v + u), m * (Math.abs(v) - Math.abs(u))], salt);
  },
};

interface BounceParams {
  thing: 'wall' | 'bat' | 'floor';
  m: number;
  u: number;
  v: number;
}

const BOUNCE_THINGS: Record<BounceParams['thing'], string> = {
  wall: 'hits a wall at right angles and bounces straight back',
  bat: 'is hit straight back along its path by a bat',
  floor: 'hits a smooth barrier and rebounds along the same line',
};

/** Tree: momentum before and after a bounce, then the impulse, signs and all. */
const bounceTree: Generator<BounceParams> = {
  id: 'force-bounce-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const thing = rng.pick<BounceParams['thing']>(['wall', 'bat', 'floor']);
    const m = massOf(rng, true, 0.5, hard ? 5 : 3);
    // Hard: the ball arrives from either side, so the impulse's sign has to be worked out.
    const side = hard ? rng.sign() : 1;
    const speed = rng.int(2, 14);
    // A bat can send the ball back faster; a wall or a barrier cannot.
    return { thing, m, u: side * speed, v: -side * rng.int(1, thing === 'bat' ? 16 : speed) };
  },
  render: ({ thing, m, u, v }) => {
    const [pu, pv] = [m * u, m * v];
    const answer = [pu, pv, pv - pu];
    return {
      kind: 'tree',
      prompt: [
        say(`A ball of mass ${kg(m)}, ${moving(u)}, ${BOUNCE_THINGS[thing]}. Afterwards it is ${moving(v)}. ${RIGHT}`),
        say('Find the impulse on the ball, in $\\text{N s}$. Top row: its momentum before and after, in $\\text{kg m s}^{-1}$. Underneath: the impulse.'),
      ],
      expression: 'I = mv - mu',
      nodes: [
        { id: 'before', from: [] },
        { id: 'after', from: [] },
        { id: 'I', from: ['before', 'after'] },
      ],
      bank: valueBank(answer, [-pu, -pv, pv + pu, pu - pv]),
      answer: answer.map(fmt),
    };
  },
  solution: ({ m, u, v }) => [
    { tex: `mu = ${fmt(m)} \\times ${paren(u)} = ${fmt(m * u)}, \\quad mv = ${fmt(m)} \\times ${paren(v)} = ${fmt(m * v)}` },
    { tex: `I = ${fmt(m * v)} - ${paren(m * u)} = ${fmt(m * (v - u))}` },
    { text: `The velocity changes sign, so the sizes add: the impulse points ${v < u ? 'left' : 'right'}, the way the ball is sent.` },
  ],
};

interface ImpulsePairParams {
  c: Collision;
}

/** Tiles: in a collision the impulses on the two particles are equal and opposite, and $B$'s velocity follows. */
const impulsePairTiles: Generator<ImpulsePairParams> = {
  id: 'force-impulse-pair-tiles',
  sample: (rng, difficulty) => ({ c: collisionOf(rng, difficulty > 1, (c) => c.vB !== c.uB) }),
  render: ({ c }) => {
    const IA = c.mA * (c.vA - c.uA);
    const answer = [bare(IA), bare(-IA), bare(c.vB)];
    const extras = [bare(-c.vB), bare(c.mA * c.vA), bare(-IA / c.mB), bare(c.uB - IA / c.mB), bare(c.mA * (c.uA + c.vA)), bare(IA / c.mB)];
    return {
      kind: 'tiles',
      prompt: [
        say(`${collisionScene(c)} After the collision $A$ is ${moving(c.vA)}.`),
        say(
          "Find the impulse on $A$ and the impulse on $B$, in $\\text{N s}$, then $B$'s velocity after, in $\\text{m s}^{-1}$.",
        ),
        collisionPicture(c, { A: c.vA, B: 'v' }),
      ],
      template: 'I_{A} = {0}, \\quad I_{B} = {1}, \\quad v_{B} = {2}',
      bank: tileBank(answer, soleExtras(answer, extras, ([a, b, w]) => near(a, IA) && near(b, -IA) && near(w, c.vB))),
      answer,
    };
  },
  solution: ({ c }) => {
    const IA = c.mA * (c.vA - c.uA);
    return [
      { tex: `I_{A} = ${fmt(c.mA)} \\times ${paren(c.vA)} - ${fmt(c.mA)} \\times ${paren(c.uA)} = ${fmt(IA)}` },
      { text: 'By the third law $B$ gets an equal and opposite impulse:' },
      { tex: `I_{B} = ${fmt(-IA)}` },
      { text: "That is the change in $B$'s momentum:" },
      { tex: `${fmt(c.mB)}v_{B} = ${fmt(c.mB)} \\times ${paren(c.uB)} ${signed(-IA)} = ${fmt(c.mB * c.vB)}, \\quad v_{B} = ${fmt(c.vB)}` },
    ];
  },
};

interface ImpulseSliderParams {
  m: number;
  u: number;
  v: number;
}

/** Slider: the velocity after an impulse, on the line p = mv with the start marked. */
const impulseSlider: Generator<ImpulseSliderParams> = {
  id: 'force-impulse-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return until(
      () => ({ m: hard ? rng.int(3, 8) / 2 : rng.int(2, 5), u: sizeSign(rng, 1, V_SPAN - 1), v: rng.int(-(V_SPAN - 1), V_SPAN - 1) }),
      ({ u, v }) => u !== v && (hard ? Math.sign(u) !== Math.sign(v) : Math.sign(v) === Math.sign(u)),
    );
  },
  render: ({ m, u, v }) => {
    const I = m * (v - u);
    return {
      kind: 'slider',
      prompt: [
        say(
          `A particle of mass ${kg(m)} is ${moving(u)} when it receives an impulse of $${fmt(Math.abs(I))}${NS}$ to the ${I < 0 ? 'left' : 'right'}. ${RIGHT} The line is $p = ${fmt(m)}v$, with the dot where it starts. Slide to its velocity afterwards, in $\\text{m s}^{-1}$.`,
        ),
      ],
      min: -V_SPAN,
      max: V_SPAN,
      step: 0.5,
      answer: v,
      readout: 'v = {v}',
      figure: {
        svg: plotSvg({
          xMin: -V_SPAN,
          xMax: V_SPAN,
          yMin: -(V_SPAN + 0.5) * m,
          yMax: (V_SPAN + 0.5) * m,
          curves: [{ f: (x) => m * x }],
          marks: [{ x: u, y: m * u }],
          label: `The line p = ${fmt(m)}v, with a dot at the starting velocity`,
        }),
        ...markerWindow(-V_SPAN, V_SPAN),
        axis: 'x',
      },
    };
  },
  solution: ({ m, u, v }) => {
    const I = m * (v - u);
    return [
      { text: 'The impulse is the change in momentum, so it moves the momentum along the line by that much:' },
      { tex: `${fmt(m)}v = ${fmt(m)} \\times ${paren(u)} ${signed(I)} = ${fmt(m * v)}` },
      { tex: `v = \\frac{${fmt(m * v)}}{${fmt(m)}} = ${fmt(v)}` },
      ...(Math.sign(u) !== Math.sign(v) && v !== 0 ? [{ text: 'The sign has changed: the impulse was big enough to turn the particle round.' }] : []),
    ];
  },
};

/* ---------- Ft = mv - mu ---------- */

interface FtParams {
  find: 'v' | 'F' | 't';
  m: number;
  u: number;
  v: number;
  t: number;
  F: number;
}

/**
 * A constant force for a time, drawn with both velocities whole and the
 * force exact. Easy: along the motion, speeding up. Hard: either way, so it
 * may slow the particle or turn it round.
 */
function ftOf(rng: Rng, hard: boolean, ok: (p: Omit<FtParams, 'find'>) => boolean = () => true): Omit<FtParams, 'find'> {
  return until(
    () => {
      const m = massOf(rng, hard, 1, 10);
      const u = hard ? sizeSign(rng, 1, 12) : rng.int(0, 10);
      const v = hard ? rng.int(-12, 15) : rng.int(1, 15);
      const t = hard ? rng.int(1, 16) / 2 : rng.int(1, 8);
      return { m, u, v, t, F: (m * (v - u)) / t };
    },
    (p) => p.u !== p.v && exact(p.F, 2) && Math.abs(p.F) <= 60 && (hard || p.v > p.u) && ok(p),
  );
}

const forceWords = (F: number): string => `a constant force of $${fmt(Math.abs(F))}\\text{ N}$ to the ${F < 0 ? 'left' : 'right'}`;

/** Expression: Ft = mv - mu, for the velocity after, the force or the time. */
const ft: Generator<FtParams> = {
  id: 'force-ft',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const find = hard ? rng.pick<FtParams['find']>(['v', 'F', 't']) : rng.pick<FtParams['find']>(['v', 'F']);
    return { find, ...ftOf(rng, hard) };
  },
  render: ({ find, m, u, v, t, F }) => {
    const start = `A particle of mass ${kg(m)} is ${moving(u)}.`;
    if (find === 'F') {
      return typed(
        [say(`${start} A constant force acts on it for $${fmt(t)}\\text{ s}$, after which it is ${moving(v)}. ${RIGHT} Find the force, in newtons.`)],
        'F =',
        F,
      );
    }
    if (find === 't') {
      return typed(
        [say(`${start} ${upper(forceWords(F))} acts on it until it is ${moving(v)}. Find how long the force acts, in seconds.`)],
        't =',
        t,
      );
    }
    return typed(
      [say(`${start} ${upper(forceWords(F))} acts on it for $${fmt(t)}\\text{ s}$. ${RIGHT} Find its velocity afterwards, in $\\text{m s}^{-1}$.`)],
      'v =',
      v,
    );
  },
  solution: ({ find, m, u, v, t, F }) => {
    const law: SolutionStep = { text: 'The impulse of the force is the change in momentum, $Ft = mv - mu$, with right positive:' };
    if (find === 'F') {
      return [
        law,
        { tex: `${fmt(t)}F = ${fmt(m)} \\times ${paren(v)} - ${fmt(m)} \\times ${paren(u)} = ${fmt(m * (v - u))}` },
        { tex: `F = \\frac{${fmt(m * (v - u))}}{${fmt(t)}} = ${fmt(F)}` },
        ...(F < 0 ? [{ text: 'Negative: the force acts to the left.' }] : []),
      ];
    }
    if (find === 't') {
      return [
        law,
        { tex: `${paren(F)} \\times t = ${fmt(m)} \\times ${paren(v)} - ${fmt(m)} \\times ${paren(u)} = ${fmt(m * (v - u))}` },
        { tex: `t = \\frac{${fmt(m * (v - u))}}{${paren(F)}} = ${fmt(t)}` },
      ];
    }
    return [
      law,
      { tex: `${paren(F)} \\times ${fmt(t)} = ${fmt(m)}v - ${fmt(m)} \\times ${paren(u)}` },
      { tex: `${fmt(m)}v = ${fmt(F * t)} ${signed(m * u)} = ${fmt(m * v)}, \\quad v = ${fmt(v)}` },
    ];
  },
  choices: ({ find, m, u, v, t, F }) => {
    const salt = mix(m * 2, u, v, t * 2, find.length);
    if (find === 'F') return valueChoices(F, [-F, m * (v - u) * t, (m * (v + u)) / t, (v - u) / t], salt);
    if (find === 't') return valueChoices(t, [(m * (v + u)) / Math.abs(F), (v - u) / F, t * 2], salt);
    return valueChoices(v, [u + F * t, (F * t) / m, u - (F * t) / m], salt);
  },
};

interface FtFlowParams {
  m: number;
  u: number;
  v: number;
  t: number;
  F: number;
}

const FT_WAYS: Record<Way, string> = {
  same: 'Still moving right, slower',
  back: 'Moving left',
  stop: 'At rest',
};

/** Flow: a force against the motion, its impulse, the change of velocity, and where that leaves the particle. */
const ftFlow: Generator<FtFlowParams> = {
  id: 'force-ft-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const way = rng.pick<Way>(['same', 'back', 'stop']);
    return until(
      () => {
        const m = massOf(rng, hard, 1, 8);
        const u = rng.int(2, 12);
        const v = way === 'stop' ? 0 : way === 'back' ? -rng.int(1, 8) : rng.int(1, u - 1);
        const t = hard ? rng.int(1, 10) / 2 : rng.int(1, 6);
        return { m, u, v, t, F: (m * (v - u)) / t };
      },
      (p) => p.u > 1 && exact(p.F, 2) && p.v < p.u && Math.abs(p.F) <= 60,
    );
  },
  render: ({ m, u, v, t, F }) => {
    const I = F * t;
    const dv = v - u;
    const choose = (right: number, wrong: number[]) =>
      [...new Set(wrong.filter((x) => Number.isFinite(x) && exact(x, 4) && fmt(x) !== fmt(right)).map(fmt))]
        .slice(0, 2)
        .concat(fmt(right))
        .sort((x, y) => Number(x) - Number(y));
    const way: Way = v === 0 ? 'stop' : v < 0 ? 'back' : 'same';
    return {
      kind: 'flow',
      prompt: [
        say(
          `A particle of mass ${kg(m)} is ${moving(u)}. ${upper(forceWords(F))} acts on it for $${fmt(t)}\\text{ s}$, against its motion. ${RIGHT} Where does that leave it?`,
        ),
      ],
      subject: 'Ft = mv - mu',
      steps: [
        {
          id: 'I',
          ask: 'What is the impulse of the force, in $\\text{N s}$?',
          branches: choose(I, [-I, F / t, I - 1]).map((x) => ({ label: `$${x}$`, to: 'dv' })),
        },
        {
          id: 'dv',
          ask: 'So by how much does its velocity change, in $\\text{m s}^{-1}$?',
          branches: choose(dv, [-dv, I * m, dv - 1]).map((x) => ({ label: `$${x}$`, to: 'way' })),
        },
        {
          id: 'way',
          ask: `It started at $${fmt(u)}$. So afterwards it is`,
          branches: (['same', 'stop', 'back'] as Way[]).map((w) => ({
            label: FT_WAYS[w],
            outcome:
              w === 'same'
                ? 'The change is smaller than its speed, so it slows but keeps going.'
                : w === 'stop'
                  ? 'The change takes away exactly its speed.'
                  : 'The change is more than its speed, so it is turned round.',
          })),
        },
      ],
      answer: [`$${fmt(I)}$`, `$${fmt(dv)}$`, FT_WAYS[way]],
    };
  },
  solution: ({ m, u, v, t, F }) => [
    { tex: `Ft = ${paren(F)} \\times ${fmt(t)} = ${fmt(F * t)}` },
    { text: 'That is the change in momentum, so divide by the mass for the change in velocity:' },
    { tex: `v - u = \\frac{${fmt(F * t)}}{${fmt(m)}} = ${fmt(v - u)}` },
    { tex: `v = ${fmt(u)} ${signed(v - u)} = ${fmt(v)}` },
  ],
};

interface ImpulseIjParams {
  kind: 'impulse' | 'force' | 'find';
  m: number;
  u: Pt;
  v: Pt;
  /** For a force: how long it acts. */
  t: number;
}

/** Tiles: impulse in i, j form, from an impulse or a force for a time, or the impulse from two velocities. */
const impulseIjTiles: Generator<ImpulseIjParams> = {
  id: 'force-impulse-ij-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = hard ? rng.pick<ImpulseIjParams['kind']>(['force', 'find']) : 'impulse';
    const comp = () => sizeSign(rng, 1, 8);
    return until(
      () => ({ kind, m: hard ? rng.int(1, 8) / 2 : rng.int(1, 5), u: [comp(), comp()] as Pt, v: [comp(), comp()] as Pt, t: hard ? rng.int(1, 6) / 2 : 1 }),
      ({ m, u, v, t }) => u[0] !== v[0] && u[1] !== v[1] && [0, 1].every((i) => exact((m * (v[i] - u[i])) / t, 2)),
    );
  },
  render: ({ kind, m, u, v, t }) => {
    const I: Pt = [m * (v[0] - u[0]), m * (v[1] - u[1])];
    const start = `A particle of mass ${kg(m)} is moving with velocity ${vecTex(u[0], u[1], MS)}`;
    if (kind === 'find') {
      const answer = [bare(I[0]), signed(I[1])];
      return {
        kind: 'tiles',
        prompt: [say(`${start} when it receives an impulse. Afterwards its velocity is ${vecTex(v[0], v[1], MS)}. Find the impulse, in $\\text{N s}$.`)],
        template: '\\mathbf{I} = ({0}\\mathbf{i} {1}\\mathbf{j})',
        bank: tileBank(
          answer,
          soleExtras(
            answer,
            [bare(-I[0]), signed(-I[1]), bare(v[0] - u[0]), signed(v[1] - u[1]), bare(m * (v[0] + u[0])), signed(m * (v[1] + u[1]))],
            ([x, y]) => near(x, I[0]) && near(y, I[1]),
            [1],
          ),
        ),
        answer,
      };
    }
    const answer = [bare(v[0]), signed(v[1])];
    const cause =
      kind === 'force'
        ? `A constant force ${vecTex(I[0] / t, I[1] / t, '\\text{ N}')} acts on it for $${fmt(t)}\\text{ s}$.`
        : `It receives an impulse of ${vecTex(I[0], I[1], NS)}.`;
    const slip: Pt = kind === 'force' ? [u[0] + I[0] / t / m, u[1] + I[1] / t / m] : [u[0] + I[0], u[1] + I[1]];
    return {
      kind: 'tiles',
      prompt: [say(`${start}. ${cause} Find its velocity afterwards, in $\\text{m s}^{-1}$.`)],
      template: '\\mathbf{v} = ({0}\\mathbf{i} {1}\\mathbf{j})',
      bank: tileBank(
        answer,
        soleExtras(
          answer,
          [bare(slip[0]), signed(slip[1]), bare(u[0] - I[0] / m), signed(u[1] - I[1] / m), bare(v[1]), signed(v[0])].filter((x) => exact(tileValue(x), 4)),
          ([x, y]) => near(x, v[0]) && near(y, v[1]),
          [1],
        ),
      ),
      answer,
    };
  },
  solution: ({ kind, m, u, v, t }) => {
    const I: Pt = [m * (v[0] - u[0]), m * (v[1] - u[1])];
    const change = { tex: `${fmt(m)}\\mathbf{v} = ${fmt(m)}(${ijTex(u[0], u[1])}) + (${ijTex(I[0], I[1])}) = ${ijTex(m * v[0], m * v[1])}` };
    if (kind === 'find') {
      return [
        { text: 'Impulse is the change in momentum, $m\\mathbf{v} - m\\mathbf{u}$, component by component:' },
        { tex: `\\mathbf{I} = ${fmt(m)}(${ijTex(v[0], v[1])}) - ${fmt(m)}(${ijTex(u[0], u[1])}) = ${ijTex(I[0], I[1])}` },
      ];
    }
    return [
      ...(kind === 'force'
        ? [
            { text: 'The impulse of a constant force is $\\mathbf{F}t$:' },
            { tex: `\\mathbf{I} = ${fmt(t)}(${ijTex(I[0] / t, I[1] / t)}) = ${ijTex(I[0], I[1])}` },
          ]
        : []),
      { text: 'The impulse adds to the momentum, $m\\mathbf{v} = m\\mathbf{u} + \\mathbf{I}$:' },
      change,
      { tex: `\\mathbf{v} = ${ijTex(v[0], v[1])}` },
    ];
  },
};

interface FtTableParams {
  m: number;
  /** The velocity at the start and at the end of each stage. */
  vs: number[];
  ts: number[];
}

/** Table: forces acting one after another, each stage's impulse and the velocity it leaves. */
const ftTable: Generator<FtTableParams> = {
  id: 'force-ft-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const stages = hard ? 3 : 2;
    return until(
      () => {
        const m = massOf(rng, hard, 1, 8);
        const vs = [rng.int(0, 6)];
        for (let i = 0; i < stages; i += 1) vs.push(rng.int(-6, 12));
        return { m, vs, ts: Array.from({ length: stages }, () => rng.int(1, hard ? 8 : 5)) };
      },
      ({ m, vs, ts }) =>
        ts.every((t, i) => {
          const F = (m * (vs[i + 1] - vs[i])) / t;
          return vs[i + 1] !== vs[i] && exact(F, 2) && Math.abs(F) <= 40;
        }) && (hard ? vs.some((v) => v < 0) : vs.every((v) => v >= 0)),
    );
  },
  render: ({ m, vs, ts }) => {
    const answer: number[] = [];
    const rows = ts.map((t, i) => {
      const I = m * (vs[i + 1] - vs[i]);
      answer.push(I, vs[i + 1]);
      return [`${i + 1}`, fmt(I / t), fmt(t), null, null];
    });
    return {
      kind: 'table',
      prompt: [
        say(
          `A particle of mass ${kg(m)} starts ${moving(vs[0])}. Constant forces act on it one after another, each for the time shown. ${RIGHT}`,
        ),
        say('For each stage fill in the impulse, $Ft$ in $\\text{N s}$, and the velocity at the end of the stage, in $\\text{m s}^{-1}$. Forces are in newtons and times in seconds.'),
      ],
      columns: ['', 'F', 't', 'Ft', 'v'],
      rows,
      bank: valueBank(answer, ts.flatMap((t, i) => [vs[i] + (m * (vs[i + 1] - vs[i])) / t, -(m * (vs[i + 1] - vs[i]))])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ m, vs, ts }) =>
    ts.flatMap((t, i): SolutionStep[] => {
      const I = m * (vs[i + 1] - vs[i]);
      return [
        { text: `Stage ${i + 1}: the impulse ${i === 0 ? 'changes the momentum it starts with' : 'starts from the velocity the last stage left'}.` },
        { tex: `Ft = ${paren(I / t)} \\times ${fmt(t)} = ${fmt(I)}` },
        { tex: `${fmt(m)}v = ${fmt(m)} \\times ${paren(vs[i])} ${signed(I)} = ${fmt(m * vs[i + 1])}, \\quad v = ${fmt(vs[i + 1])}` },
      ];
    }),
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
  inclineWay,
  inclineTiles,
  incline,
  inclineSystemTree,
  inclineBalance,
  inclineRestSteps,
  pegTable,
  pegTiles,
  peg,
  pegFlow,
  slackSpeed,
  slackStagesTree,
  slackDistanceSteps,
  slackFlow,
  inclinePick,
  inclineFill,
  inclineCheck,
  momentum,
  momentumTiles,
  momentumTable,
  momentumSlider,
  collide,
  collideTiles,
  collideSumTree,
  collideFlow,
  coalesce,
  jointSteps,
  separateTable,
  separateFlow,
  impulse,
  bounceTree,
  impulsePairTiles,
  impulseSlider,
  ft,
  ftFlow,
  impulseIjTiles,
  ftTable,
};

export const forcesGenerators = Object.values(forcesByName).map((generator) => fitted(generator as Generator<never>));
