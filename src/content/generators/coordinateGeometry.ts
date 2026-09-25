/**
 * Coordinate Geometry.
 *
 * Level 1 is the straight line: the gradient between two points, the line's
 * equation in `y = mx + c` and point-gradient form, the general form
 * `ax + by + c = 0`, parallel and perpendicular lines, and where two lines
 * meet. Level 2 is points and circles: the midpoint and the distance, the
 * perpendicular bisector, the circle `(x - a)^2 + (y - b)^2 = r^2`, reading
 * its centre and radius from the expanded form, and tangents and chords.
 * Level 3 is lines meeting circles: substituting the line into the circle,
 * the discriminant deciding whether it cuts, touches or misses, the tangent
 * condition `k^2 = r^2(1 + m^2)`, the tangents from a point outside, and
 * chords cut off by a line. Level 4 is circle theorems on axes: the angle
 * in a semicircle as two gradients multiplying to -1, a circle from its
 * diameter, the circle through three points, chords and tangents together,
 * and the far end of a diameter with the parallel tangents at its ends.
 * Level 5 is coordinate proof: a quadrilateral named a parallelogram,
 * rectangle, rhombus or square, and a triangle right-angled or isosceles,
 * from gradients and squared lengths, then the proof put in order. Level 6
 * is areas and loci: half base times height on a level side, the box round
 * a triangle and the shoelace, polygons as triangles and a corner from an
 * area, then a locus as an equation, from words and from conditions such as
 * PA = 2PB and PA perpendicular to PB.
 *
 * Every given point is a lattice point, and every question is built outward
 * from its answer — a crossing point, a centre, a whole-number `c` — so the
 * numbers come out whole or as a small fraction by construction rather than
 * by filtering. Distances come from the `TRIPLES` table, never from
 * `Math.hypot` (PITFALLS 3.11).
 *
 * A gradient is held as a fraction (`Q`), reduced with a positive
 * denominator, so `2/4` and `-1/-2` cannot reach a learner as different
 * numbers. It is written `\frac{1}{2}` for the learner and `((1)/(2))` for
 * the grader (PITFALLS 3.3).
 *
 * The checker compares values, so an equation in a named form — `y = mx + c`,
 * `ax + by + c = 0`, a circle's equation — is asked through `tiles`, `steps`,
 * `flow` or `choice`, never typed (PITFALLS 3.4). A coordinate pair cannot be
 * typed either, since mathjs does not read `(3, 4)`: a point is placed as two
 * tiles or picked. `expression` asks one number: a gradient, `c`, `k`, `r^2`.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg, type Curve } from '../figures';
import { sumTex } from './calculus';
import { TRIPLES } from './complexPlane';
import { orderSlide, orderSolution, pickDistractors, type Proof } from './numberProof';

/* ---------- fractions ---------- */

/** A fraction, reduced, with a positive denominator. */
export interface Q {
  n: number;
  d: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

function q(n: number, d = 1): Q {
  const g = gcd(n, d) * (d < 0 ? -1 : 1);
  // `+ 0` turns a -0 numerator into 0, so it prints as "0".
  return { n: n / g + 0, d: d / g };
}

const add = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Q, b: Q): Q => q(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d);
const neg = (a: Q): Q => q(-a.n, a.d);
/** 1/a. Only called on a non-zero gradient. */
const inv = (a: Q): Q => q(a.d, a.n);
/** -1/a: the perpendicular gradient. */
const perp = (a: Q): Q => q(-a.d, a.n);
const same = (a: Q, b: Q): boolean => a.n === b.n && a.d === b.d;
const value = (a: Q): number => a.n / a.d;

/** What the learner reads: 3, -\frac{2}{3}. */
function qTex(v: Q): string {
  if (v.d === 1) return String(v.n);
  return `${v.n < 0 ? '-' : ''}\\frac{${Math.abs(v.n)}}{${v.d}}`;
}

/** What mathjs parses. Never displayed. */
function qAns(v: Q): string {
  return v.d === 1 ? String(v.n) : `((${v.n})/(${v.d}))`;
}

/* ---------- display ---------- */

/** A coefficient on a letter: 3x, -x, \frac{2}{3}x, and "0" for nothing. */
function termOf(v: Q, letter = 'x'): string {
  if (v.n === 0) return '0';
  if (v.d === 1 && Math.abs(v.n) === 1) return v.n < 0 ? `-${letter}` : letter;
  return `${qTex(v)}${letter}`;
}

/** A term that follows another, with its sign in front: "+ 3", "- \frac{1}{2}x". */
function signed(tex: string): string {
  return tex.startsWith('-') ? `- ${tex.slice(1)}` : `+ ${tex}`;
}

/** A whole number following another term: "+ 4", "- 3". */
function signedN(n: number): string {
  return n < 0 ? `- ${-n}` : `+ ${n}`;
}

/** A number as it sits after a minus sign or a times sign: -3 bracketed. */
function paren(n: number): string {
  return n < 0 ? `(${n})` : String(n);
}

/** x - 3, x + 2, or x alone. */
function lin(letter: string, a: number): string {
  if (a === 0) return letter;
  return a > 0 ? `${letter} - ${a}` : `${letter} + ${-a}`;
}

/** The right-hand side of y = mx + c. */
function rhsTex(m: Q, c: Q): string {
  return sumTex([termOf(m), qTex(c)]) || '0';
}

function lineTex(m: Q, c: Q): string {
  return `y = ${rhsTex(m, c)}`;
}

/** ax + by + k, with any zero term left out. */
function generalLhs(a: number, b: number, k: number): string {
  return sumTex([termOf(q(a)), termOf(q(b), 'y'), String(k)]);
}

function generalTex(a: number, b: number, k: number): string {
  return `${generalLhs(a, b, k)} = 0`;
}

function pt(x: number, y: number): string {
  return `(${x}, ${y})`;
}

function named(name: string, x: number, y: number): string {
  return `${name}${pt(x, y)}`;
}

/** (x - a)^2 + (y - b)^2 = r^2, as the learner reads it. */
function circleTex(a: number, b: number, r2: number): string {
  const part = (letter: string, c: number) => (c === 0 ? `${letter}^2` : `(${lin(letter, c)})^2`);
  return `${part('x', a)} + ${part('y', b)} = ${r2}`;
}

/** The same circle multiplied out: x^2 + y^2 - 6x + 4y - 12 = 0, times k. */
function expandedTex(a: number, b: number, r2: number, k = 1): string {
  const f = a * a + b * b - r2;
  const sq = k === 1 ? '' : String(k);
  return `${sumTex([`${sq}x^2`, `${sq}y^2`, termOf(q(-2 * a * k)), termOf(q(-2 * b * k), 'y'), String(f * k)])} = 0`;
}

/**
 * (px - a)^2 + (py - b)^2 worked out, one stage a line, since the whole
 * sum on one line is wider than a phone.
 */
function squaredDistance(px: number, a: number, py: number, b: number): string {
  const dx = px - a;
  const dy = py - b;
  return chain(
    `&(${px} - ${paren(a)})^2 + (${py} - ${paren(b)})^2`,
    `=\\;&${paren(dx)}^2 + ${paren(dy)}^2`,
    `=\\;&${dx * dx} + ${dy * dy} = ${dx * dx + dy * dy}`,
  );
}

/** A long equation as inline maths in prose, which wraps where a display cannot. */
const wrapped = (tex: string): Block => ({ kind: 'prose', text: `$${tex}$` });

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });

function chain(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/* ---------- sampling ---------- */

function nz(rng: Rng, max: number): number {
  return rng.int(1, max) * rng.sign();
}

/** Every lattice vector (x, y) with x^2 + y^2 = n and both parts non-zero. */
function latticeVectors(n: number): [number, number][] {
  const out: [number, number][] = [];
  const top = Math.floor(Math.sqrt(n));
  for (let x = -top; x <= top; x += 1) {
    for (let y = -top; y <= top; y += 1) {
      if (x !== 0 && y !== 0 && x * x + y * y === n) out.push([x, y]);
    }
  }
  return out;
}

/** A Pythagorean triple from the table, legs signed at random. */
function sampleTriple(rng: Rng, maxHyp: number): { dx: number; dy: number; c: number } {
  const [a, b, c] = rng.pick(TRIPLES.filter((row) => row[2] <= maxHyp));
  return { dx: a * rng.sign(), dy: b * rng.sign(), c };
}

/* ---------- banks and options ---------- */

/**
 * A tiles or tree bank: the answer as a multiset, then the slips that differ
 * from every answer token, topped up with whole numbers near `around` until
 * `spare` distractors survive. Sorted, so one question renders one way.
 */
function bank(answer: string[], slips: string[], around: number[], spare = 3): string[] {
  const bare = (token: string) => token.replace(/\s+/g, '');
  const needed = new Set(answer.map(bare));
  const extras: string[] = [];
  const offer = (token: string) => {
    if (extras.length >= 5) return;
    if (needed.has(bare(token)) || extras.some((extra) => bare(extra) === bare(token))) return;
    extras.push(token);
  };
  slips.forEach(offer);
  const centres = around.length > 0 ? around : [0];
  for (let gap = 1; extras.length < spare; gap += 1) {
    for (const v of centres) {
      offer(String(v + gap));
      offer(String(v - gap));
    }
  }
  return [...answer, ...extras].sort();
}

/**
 * A steps bank: the value and its slips, de-duplicated and scattered by hash
 * rather than shuffled, so the same question renders one way.
 */
function stepBank(correct: string, ...slips: string[]): string[] {
  return [...new Set([correct, ...slips])].sort((a, b) => hashSeed(a) - hashSeed(b));
}

/** Four whole-number options: the answer and the first slips that are whole and new. */
function intOptions(correct: number, slips: number[], min = -Infinity): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  const near = [1, -1, 2, -2, 3, -3, 4, -4].map((gap) => correct + gap);
  for (const v of [...slips, ...near]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(v) || v < min || seen.has(v)) continue;
    seen.add(v);
    picked.push(v);
  }
  return options(
    { tex: String(correct), answer: String(correct) },
    ...picked.sort((x, y) => x - y).map((v) => ({ tex: String(v), answer: String(v) })),
  );
}

/** Four fraction options: the answer, the slips that differ from it, then near values. */
function qOptions(correct: Q, slips: Q[]): ChoiceOption[] {
  const out = options(
    { tex: qTex(correct), answer: qAns(correct) },
    ...slips.filter((s) => !same(s, correct)).map((s) => ({ tex: qTex(s), answer: qAns(s) })),
  );
  for (let gap = 1; out.length < 4; gap += 1) {
    for (const s of [add(correct, q(gap)), sub(correct, q(gap))]) {
      if (out.length < 4 && !out.some((o) => o.tex === qTex(s))) out.push({ tex: qTex(s), answer: qAns(s) });
    }
  }
  return out.slice(0, 4);
}

/**
 * Point options: the answer, then candidates that are new and wrong, up to
 * four. A coordinate pair is not an expression, so no `answer` is given.
 */
function pointOptions(
  correct: [number, number],
  candidates: [number, number][],
  wrong: (p: [number, number]) => boolean,
): ChoiceOption[] {
  const out: ChoiceOption[] = [{ tex: pt(...correct), correct: true }];
  for (const p of candidates) {
    if (out.length === 4) break;
    const tex = pt(...p);
    if (!wrong(p) || out.some((o) => o.tex === tex)) continue;
    out.push({ tex });
  }
  return out;
}

/**
 * A native choice slide, the options turned by a hash of their labels so the
 * answer is not always first yet one question renders one way (PITFALLS 3.10).
 */
function choiceSlide(prompt: Block[], opts: ChoiceOption[]): Slide {
  const turn = hashSeed(opts.map((o) => o.tex).join('|')) % opts.length;
  const ordered = [...opts.slice(turn), ...opts.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex: true })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/** Items turned by a hash of `key`, so the right one is not always first. */
function turned<T>(items: T[], key: string): T[] {
  const turn = hashSeed(key) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/** Distinct labels for a flow fork, the first being the right one. */
function forkLabels(values: Q[]): string[] {
  const out: string[] = [];
  for (const v of values) {
    const label = `$${qTex(v)}$`;
    if (!out.includes(label)) out.push(label);
  }
  return out;
}

/* ---------- figures ---------- */

/** A circle to draw: centre (h, k) and r^2. */
export interface CircleShape {
  h: number;
  k: number;
  r2: number;
}

/**
 * `plotSvg` on square axes, with circles drawn in as true SVG circles.
 *
 * `plotSvg` draws `y` as a function of `x`, so a circle would have to be two
 * half-curves, and 160 samples leave both halves pinched where they meet at
 * the sides — the curve is nearly vertical there and the last sample stops
 * short. A `<circle>` has no sides to pinch. It is placed with the same
 * mapping `plotSvg` uses (a 12 px inset on a 280 px wide picture), which is
 * why the axes must span the same in `x` and `y` and `height` must be 280:
 * then one unit is the same length both ways and the radius is one number.
 * The circle goes in before the marks, so a marked point sits on top of it.
 */
export function plotWithCircles(
  options: { xMin: number; xMax: number; yMin: number; yMax: number; curves: Curve[]; marks?: { x: number; y: number; hollow?: boolean }[]; label: string },
  circles: CircleShape[],
): string {
  const svg = plotSvg({ ...options, height: SQUARE, grid: true });
  const pad = 12;
  const unit = (SQUARE - 2 * pad) / (options.xMax - options.xMin);
  const drawn = circles
    .map(
      ({ h, k, r2 }) =>
        `<circle cx="${(pad + (h - options.xMin) * unit).toFixed(1)}" cy="${(pad + (options.yMax - k) * unit).toFixed(1)}" r="${(Math.sqrt(r2) * unit).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2" />`,
    )
    .join('');
  // Marks are the only <circle> elements plotSvg writes, and they come last.
  const at = svg.indexOf('<circle');
  return at < 0 ? svg.replace('</svg>', `${drawn}</svg>`) : `${svg.slice(0, at)}${drawn}${svg.slice(at)}`;
}

/** A line segment from one point to another, for drawing AB. */
function segment(x1: number, y1: number, x2: number, y2: number): Curve {
  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  return {
    f: (x) => (x >= lo - 1e-9 && x <= hi + 1e-9 ? y1 + ((y2 - y1) * (x - x1)) / (x2 - x1) : NaN),
    breaks: true,
    accent: true,
  };
}

/** Square axes on squared paper, the size every figure in this course uses. */
const SQUARE = 280;

/* ================================================================
 * Level 1, lesson 1: the gradient between two points
 * ================================================================ */

interface TwoPoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const riseOf = (p: TwoPoints) => p.y2 - p.y1;
const runOf = (p: TwoPoints) => p.x2 - p.x1;
const gradientOf = (p: TwoPoints): Q => q(riseOf(p), runOf(p));

/**
 * Two points with a whole gradient at difficulty 1, and a fraction that does
 * not reduce to a whole number at difficulty 2.
 */
function sampleGradientPair(rng: Rng, difficulty: number): TwoPoints {
  for (;;) {
    let run: number;
    let rise: number;
    if (difficulty > 1) {
      run = rng.int(2, 6) * rng.sign();
      rise = nz(rng, 8);
      if (rise % run === 0) continue;
    } else {
      run = rng.int(1, 4) * rng.sign();
      rise = run * nz(rng, 4);
    }
    const x1 = rng.int(-6, 6);
    const y1 = rng.int(-6, 6);
    const x2 = x1 + run;
    const y2 = y1 + rise;
    if (Math.abs(x2) > 9 || Math.abs(y2) > 9) continue;
    return { x1, y1, x2, y2 };
  }
}

/** m = (y2 - y1)/(x2 - x1) with the learner's numbers. */
function gradientFormula(p: TwoPoints): string {
  return `\\frac{${p.y2} - ${paren(p.y1)}}{${p.x2} - ${paren(p.x1)}}`;
}

function gradientSolution(p: TwoPoints): SolutionStep[] {
  const m = gradientOf(p);
  const raw = `\\frac{${riseOf(p)}}{${runOf(p)}}`;
  return [
    { text: 'The gradient is the rise over the run, both taken the same way: from $A$ to $B$.' },
    { tex: chain(`m &= ${gradientFormula(p)}`, `&= ${raw}${raw === qTex(m) ? '' : ` = ${qTex(m)}`}`) },
    {
      text:
        m.n > 0
          ? 'It is positive, so the line rises from left to right.'
          : 'It is negative, so the line falls from left to right.',
    },
  ];
}

/** The gradient of the line through two points, typed. */
const coordGradient: Generator<TwoPoints> = {
  id: 'coord-gradient',
  sample: sampleGradientPair,
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the gradient of the line through $${named('A', p.x1, p.y1)}$ and $${named('B', p.x2, p.y2)}$.`)],
    lead: 'm =',
    keypad: [],
    answer: qAns(gradientOf(p)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const m = gradientOf(p);
    return qOptions(m, [neg(m), q(runOf(p), riseOf(p)), q(-runOf(p), riseOf(p)), add(m, q(1))]);
  },
  solution: gradientSolution,
};

/** Rise, run, then their ratio, as a tree. */
const coordRiseRunTree: Generator<TwoPoints> = {
  id: 'coord-rise-run-tree',
  sample: sampleGradientPair,
  render: (p): Slide => {
    const m = gradientOf(p);
    const answer = [String(riseOf(p)), String(runOf(p)), qTex(m)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `From $${named('A', p.x1, p.y1)}$ to $${named('B', p.x2, p.y2)}$. Top row: the rise $y_2 - y_1$ and the run $x_2 - x_1$. Underneath: the gradient, rise over run.`,
        ),
      ],
      expression: `m = ${gradientFormula(p)}`,
      nodes: [
        { id: 'rise', from: [] },
        { id: 'run', from: [] },
        { id: 'm', from: ['rise', 'run'] },
      ],
      bank: bank(
        answer,
        [
          String(-riseOf(p)),
          String(-runOf(p)),
          qTex(q(runOf(p), riseOf(p))),
          qTex(neg(m)),
          String(p.y2 + p.y1),
          String(p.x2 + p.x1),
        ],
        [riseOf(p), runOf(p)],
      ),
      answer,
    };
  },
  solution: gradientSolution,
};

interface SlopeSliderParams {
  px: number;
  py: number;
  m: Q;
  /** How far across the second marked point sits. */
  k: number;
}

/**
 * The gradient as the rise for one step across: the marker starts at P's
 * height, and the learner slides it to where the line crosses the dashed line
 * one to the right of P. Halves at difficulty 2.
 */
const coordGradientSlider: Generator<SlopeSliderParams> = {
  id: 'coord-gradient-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const m = difficulty > 1 ? q(rng.pick([1, 3, 5]) * rng.sign(), 2) : q(nz(rng, 3));
      const k = difficulty > 1 ? rng.pick([2, 4]) : rng.pick([2, 3]);
      const px = rng.int(-5, 1);
      const py = rng.int(-5, 5);
      const rise = (k * m.n) / m.d;
      if (!Number.isInteger(rise) || Math.abs(py + rise) > 5 || px + k > 5) continue;
      if (Math.abs(py + value(m)) > 5) continue;
      return { px, py, m, k };
    }
  },
  render: ({ px, py, m, k }): Slide => {
    const qx = px + k;
    const qy = py + (k * m.n) / m.d;
    return {
      kind: 'slider',
      prompt: [
        say(
          `The line runs through $${named('P', px, py)}$ and $${named('Q', qx, qy)}$. Its gradient is how far it rises for each $1$ across. Slide the marker from $P$'s height to where the line meets the dashed line, one to the right of $P$.`,
        ),
      ],
      min: -4,
      max: 4,
      step: m.d === 1 ? 1 : 0.5,
      answer: value(m),
      readout: 'm = {v}',
      figure: {
        svg: plotSvg({
          xMin: -6,
          xMax: 6,
          yMin: -6,
          yMax: 6,
          height: SQUARE,
          grid: true,
          curves: [{ f: (x) => py + value(m) * (x - px), accent: true }],
          marks: [
            { x: px, y: py },
            { x: qx, y: qy },
          ],
          verticals: [{ x: px + 1 }],
          label: 'A straight line through two marked points, with a dashed line one step right of the first',
        }),
        axis: 'y',
        origin: py,
        ...markerWindow(-6, 6, 'y', SQUARE),
      },
    };
  },
  solution: ({ px, py, m, k }) => {
    const rise = (k * m.n) / m.d;
    return [
      {
        text: `From $P$ to $Q$ the line goes $${k}$ across and ${rise > 0 ? 'rises' : 'falls'} $${Math.abs(rise)}$.`,
      },
      { tex: `m = \\frac{${rise}}{${k}} = ${qTex(m)}` },
      {
        text: `So one to the right of $P$, at $x = ${px + 1}$, the line is at height $${py} ${signed(qTex(m))} = ${qTex(add(q(py), m))}$.`,
      },
    ];
  },
};

interface MissingParams extends TwoPoints {
  m: Q;
  /** Which coordinate of B is the unknown k. */
  ask: 'x' | 'y';
}

/**
 * A missing coordinate from a known gradient. Difficulty 1 hides B's y with a
 * whole gradient; difficulty 2 hides B's x with a fractional one.
 */
const coordMissingCoordinate: Generator<MissingParams> = {
  id: 'coord-missing-coordinate',
  sample: (rng, difficulty) => {
    for (;;) {
      const x1 = rng.int(-5, 5);
      const y1 = rng.int(-5, 5);
      if (difficulty > 1) {
        const d = rng.pick([2, 3]);
        const n = nz(rng, 5);
        if (n % d === 0) continue;
        const t = nz(rng, 2);
        const x2 = x1 + t * d;
        const y2 = y1 + t * n;
        if (Math.abs(x2) > 9 || Math.abs(y2) > 12) continue;
        return { x1, y1, x2, y2, m: q(n, d), ask: 'x' };
      }
      const m = q(nz(rng, 4));
      const dx = nz(rng, 4);
      const x2 = x1 + dx;
      const y2 = y1 + m.n * dx;
      if (Math.abs(x2) > 8 || Math.abs(y2) > 12) continue;
      return { x1, y1, x2, y2, m, ask: 'y' };
    }
  },
  render: (p): Slide => {
    const b = p.ask === 'y' ? `B(${p.x2}, k)` : `B(k, ${p.y2})`;
    return {
      kind: 'expression',
      prompt: [say(`The line through $${named('A', p.x1, p.y1)}$ and $${b}$ has gradient $${qTex(p.m)}$. Find $k$.`)],
      lead: 'k =',
      keypad: [],
      answer: String(p.ask === 'y' ? p.y2 : p.x2),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const run = runOf(p);
    const rise = riseOf(p);
    if (p.ask === 'y') return intOptions(p.y2, [p.y1 - rise, rise, p.y1 + run, p.x1 + rise]);
    return intOptions(p.x2, [p.x1 - run, p.x1 + rise, run, p.y1 + run]);
  },
  solution: (p) => {
    const run = runOf(p);
    const rise = riseOf(p);
    if (p.ask === 'y') {
      return [
        { text: 'Write the gradient from the two points, with $k$ in place of the unknown, and set it equal to the gradient given.' },
        { tex: chain(`\\frac{k - ${paren(p.y1)}}{${p.x2} - ${paren(p.x1)}} &= ${qTex(p.m)}`, `k - ${paren(p.y1)} &= ${qTex(p.m)} \\times ${paren(run)} = ${rise}`, `k &= ${p.y2}`) },
      ];
    }
    return [
      { text: 'Write the gradient from the two points, with $k$ in place of the unknown, and set it equal to the gradient given.' },
      {
        tex: chain(
          `\\frac{${p.y2} - ${paren(p.y1)}}{k - ${paren(p.x1)}} &= ${qTex(p.m)}`,
          `\\frac{${rise}}{k - ${paren(p.x1)}} &= ${qTex(p.m)}`,
          `k - ${paren(p.x1)} &= ${rise} \\div ${qTex(p.m)} = ${run}`,
          `k &= ${p.x2}`,
        ),
      },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 2: y = mx + c and y - y1 = m(x - x1)
 * ================================================================ */

interface PointGradientParams {
  m: Q;
  p: number;
  qy: number;
}

/**
 * A gradient and a point with c whole: a whole gradient at difficulty 1, a
 * fraction at difficulty 2 with x a multiple of its denominator.
 */
function samplePointGradient(rng: Rng, difficulty: number, avoidZeroC = true): PointGradientParams {
  for (;;) {
    let m: Q;
    let p: number;
    if (difficulty > 1) {
      const d = rng.pick([2, 3, 4]);
      const n = nz(rng, 5);
      if (n % d === 0) continue;
      m = q(n, d);
      p = nz(rng, 2) * m.d;
    } else {
      m = q(nz(rng, 5));
      p = nz(rng, 6);
    }
    const qy = rng.int(-8, 8);
    const c = sub(q(qy), mul(m, q(p)));
    if (avoidZeroC && c.n === 0) continue;
    if (qy === 0) continue;
    return { m, p, qy };
  }
}

const interceptOf = ({ m, p, qy }: PointGradientParams): number => value(sub(q(qy), mul(m, q(p))));

/** c in y = mx + c, from a gradient and a point. */
const coordIntercept: Generator<PointGradientParams> = {
  id: 'coord-intercept',
  sample: (rng, difficulty) => samplePointGradient(rng, difficulty),
  render: ({ m, p, qy }): Slide => ({
    kind: 'expression',
    prompt: [
      say(`A line has gradient $${qTex(m)}$ and passes through $${pt(p, qy)}$. Written as $y = mx + c$, what is $c$?`),
    ],
    lead: 'c =',
    keypad: [],
    answer: String(interceptOf({ m, p, qy })),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (params) => {
    const { m, p, qy } = params;
    const mp = value(mul(m, q(p)));
    return intOptions(interceptOf(params), [qy + mp, mp - qy, qy - p, -interceptOf(params)]);
  },
  solution: (params) => {
    const { m, p, qy } = params;
    const mp = value(mul(m, q(p)));
    return [
      { text: `Put the point into $y = ${termOf(m)} + c$: $x = ${p}$ and $y = ${qy}$.` },
      { tex: chain(`${qy} &= ${qTex(m)} \\times ${paren(p)} + c`, `${qy} &= ${mp} + c`, `c &= ${qy} - ${paren(mp)} = ${interceptOf(params)}`) },
      { text: `So the line is $${lineTex(m, q(interceptOf(params)))}$.` },
    ];
  },
};

interface LineTilesParams {
  m: Q;
  c: number;
  /** The points given: one with the gradient, or two. */
  given: { p: number; qy: number } | TwoPoints;
}

/**
 * y = mx + c as two tiles. Difficulty 1 gives the gradient and a point;
 * difficulty 2 gives two points, whose gradient may be a fraction.
 */
const coordLineTiles: Generator<LineTilesParams> = {
  id: 'coord-line-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = samplePointGradient(rng, difficulty);
      const c = interceptOf(base);
      if (value(base.m) === 0) continue;
      if (difficulty > 1) {
        const s = nz(rng, 2);
        const x2 = base.p + s * base.m.d;
        const y2 = base.qy + s * base.m.n;
        if (Math.abs(x2) > 9 || Math.abs(y2) > 12) continue;
        return { m: base.m, c, given: { x1: base.p, y1: base.qy, x2, y2 } };
      }
      return { m: base.m, c, given: { p: base.p, qy: base.qy } };
    }
  },
  render: ({ m, c, given }): Slide => {
    const answer = [termOf(m), signedN(c)];
    const [px, py] = 'p' in given ? [given.p, given.qy] : [given.x1, given.y1];
    return {
      kind: 'tiles',
      prompt: [
        say(
          'p' in given
            ? `Write the equation of the line with gradient $${qTex(m)}$ through $${pt(given.p, given.qy)}$.`
            : `Write the equation of the line through $${named('A', given.x1, given.y1)}$ and $${named('B', given.x2, given.y2)}$.`,
        ),
      ],
      template: 'y = {0} {1}',
      bank: bank(
        answer,
        [termOf(neg(m)), termOf(inv(m)), signedN(-c), signedN(py + value(mul(m, q(px)))), signedN(py)],
        [c],
        2,
      ),
      answer,
    };
  },
  solution: ({ m, c, given }) => {
    const steps: SolutionStep[] = [];
    let px: number;
    let py: number;
    if ('p' in given) {
      [px, py] = [given.p, given.qy];
    } else {
      [px, py] = [given.x1, given.y1];
      steps.push({ text: 'First the gradient, from the two points:' });
      steps.push({ tex: `m = ${gradientFormula(given)} = ${qTex(m)}` });
    }
    steps.push({ text: `Then $c$, from the point $${pt(px, py)}$:` });
    steps.push({ tex: chain(`${py} &= ${qTex(m)} \\times ${paren(px)} + c`, `c &= ${c}`) });
    steps.push({ tex: lineTex(m, q(c)) });
    return steps;
  },
};

type FormCase = 'intercept' | 'point' | 'two' | 'parallel' | 'none';

interface FormFlowParams {
  kind: FormCase;
  m: Q;
  p: number;
  qy: number;
  x2: number;
  y2: number;
  c: number;
}

const FORM_ANSWERS: Record<FormCase, string[]> = {
  intercept: ['Yes', 'Yes'],
  point: ['Yes', 'No'],
  parallel: ['Yes', 'No'],
  two: ['No', 'Yes'],
  none: ['No', 'No'],
};

function formSubject({ kind, m, p, qy, x2, y2, c }: FormFlowParams): string {
  switch (kind) {
    case 'intercept':
      return `\\begin{gathered} \\text{gradient } ${qTex(m)}, \\\\ \\text{through } ${pt(0, qy)} \\end{gathered}`;
    case 'point':
      return `\\begin{gathered} \\text{gradient } ${qTex(m)}, \\\\ \\text{through } ${pt(p, qy)} \\end{gathered}`;
    case 'parallel':
      return `\\begin{gathered} \\text{parallel to } ${lineTex(m, q(c))}, \\\\ \\text{through } ${pt(p, qy)} \\end{gathered}`;
    case 'two':
      return `\\text{through } ${pt(p, qy)} \\text{ and } ${pt(x2, y2)}`;
    default:
      return `\\text{through } ${pt(p, qy)}`;
  }
}

/** Which way into the equation of a line, from what is known about it. */
const coordFormFlow: Generator<FormFlowParams> = {
  id: 'coord-form-flow',
  sample: (rng, difficulty) => {
    const kinds: FormCase[] = difficulty > 1 ? ['intercept', 'point', 'two', 'parallel', 'none'] : ['intercept', 'point', 'two'];
    for (;;) {
      const kind = rng.pick(kinds);
      const m = difficulty > 1 && rng.chance(0.5) ? q(nz(rng, 3), rng.pick([2, 3])) : q(nz(rng, 5));
      const p = nz(rng, 6);
      const qy = rng.int(-8, 8);
      const x2 = nz(rng, 6);
      const y2 = rng.int(-8, 8);
      const c = rng.int(-6, 6);
      if (kind === 'two' && x2 === p) continue;
      if (kind === 'parallel' && value(m) * p + c === qy) continue;
      return { kind, m, p, qy, x2, y2, c };
    }
  },
  render: (params): Slide => ({
    kind: 'flow',
    prompt: [say('Which way into the equation of this line? Each answer decides what is asked next.')],
    subject: formSubject(params),
    steps: [
      {
        id: 'grad',
        ask: 'Do you know the gradient already?',
        branches: [
          { label: 'Yes', to: 'axis' },
          { label: 'No', to: 'two' },
        ],
      },
      {
        id: 'axis',
        ask: 'Is the point you know on the $y$-axis?',
        branches: [
          { label: 'Yes', outcome: 'Then $c$ is its $y$-coordinate: write $y = mx + c$ straight away.' },
          { label: 'No', outcome: 'Use $y - y_1 = m(x - x_1)$ with that point, then tidy it into $y = mx + c$.' },
        ],
      },
      {
        id: 'two',
        ask: 'Do you know two points on the line?',
        branches: [
          { label: 'Yes', outcome: 'Find $m$ from the two points first, then use $y - y_1 = m(x - x_1)$ with either one.' },
          { label: 'No', outcome: 'One point alone does not fix a line: lines of every gradient pass through it.' },
        ],
      },
    ],
    answer: FORM_ANSWERS[params.kind],
  }),
  solution: (params) => {
    const { kind, m, p, qy, x2, y2, c } = params;
    switch (kind) {
      case 'intercept':
        return [
          { text: `The gradient is given, and $${pt(0, qy)}$ is on the $y$-axis, so $c = ${qy}$.` },
          { tex: lineTex(m, q(qy)) },
        ];
      case 'point':
        return [
          { text: `The gradient is given, but $${pt(p, qy)}$ is not on the $y$-axis. Use the point-gradient form:` },
          { tex: `y - ${paren(qy)} = ${qTex(m)}(${lin('x', p)})` },
        ];
      case 'parallel':
        return [
          { text: `Parallel lines have equal gradients, so the gradient is $${qTex(m)}$, the same as $${lineTex(m, q(c))}$.` },
          { text: `The point $${pt(p, qy)}$ is not on the $y$-axis, so use the point-gradient form:` },
          { tex: `y - ${paren(qy)} = ${qTex(m)}(${lin('x', p)})` },
        ];
      case 'two':
        return [
          { text: 'No gradient is given, but two points are. The gradient comes first:' },
          { tex: `m = \\frac{${y2} - ${paren(qy)}}{${x2} - ${paren(p)}} = ${qTex(q(y2 - qy, x2 - p))}` },
          { text: 'Then use $y - y_1 = m(x - x_1)$ with either point.' },
        ];
      default:
        return [
          { text: `Only one point is known, $${pt(p, qy)}$, and no gradient.` },
          { text: 'Lines of every gradient pass through one point, so this is not enough to fix the line.' },
        ];
    }
  },
};

/** From y - y1 = m(x - x1) to y = mx + c: expand the bracket, then move y1 across. */
const coordPointGradientSteps: Generator<PointGradientParams> = {
  id: 'coord-point-gradient-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = samplePointGradient(rng, difficulty, false);
      if (Math.abs(value(params.m)) === 1) continue;
      return params;
    }
  },
  render: ({ m, p, qy }): Slide => {
    const mp = value(mul(m, q(p)));
    const c = qy - mp;
    const expanded = sumTex([termOf(m), String(-mp)]);
    return {
      kind: 'steps',
      prompt: [
        say(
          `The line with gradient $${qTex(m)}$ through $${pt(p, qy)}$, in point-gradient form. Rearrange it into $y = mx + c$: tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      start: [`y ${signedN(-qy)}`, '=', `${qTex(m)}(${lin('x', p)})`],
      reductions: [
        {
          span: [2, 3],
          value: expanded,
          bank: stepBank(
            expanded,
            sumTex([termOf(m), String(-p)]),
            sumTex([termOf(m), String(mp)]),
            sumTex(['x', String(-mp)]),
          ),
        },
        {
          span: [0, 3],
          value: lineTex(m, q(c)),
          bank: stepBank(lineTex(m, q(c)), lineTex(m, q(-mp - qy)), lineTex(m, q(mp + qy)), lineTex(m, q(-mp))),
        },
      ],
    };
  },
  solution: ({ m, p, qy }) => {
    const mp = value(mul(m, q(p)));
    return [
      { text: `Multiply the bracket out: $${qTex(m)}$ times each term inside it.` },
      { tex: `y ${signedN(-qy)} = ${sumTex([termOf(m), String(-mp)])}` },
      { text: `Then ${qy > 0 ? 'add' : 'take away'} $${Math.abs(qy)}$ on both sides to leave $y$ alone.` },
      { tex: lineTex(m, q(qy - mp)) },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 3: the general form ax + by + c = 0
 * ================================================================ */

interface GeneralTilesParams {
  /** The gradient as n/d, and the constant as e/d over the same d. */
  n: number;
  d: number;
  e: number;
}

/** ax + by + k = 0 from y = (n/d)x + e/d, with a positive. */
function toGeneral({ n, d, e }: GeneralTilesParams): [number, number, number] {
  const s = n < 0 ? -1 : 1;
  return [s * n, -s * d, s * e];
}

/** y = mx + c rewritten as ax + by + c = 0 with whole numbers. */
const coordGeneralTiles: Generator<GeneralTilesParams> = {
  id: 'coord-general-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1) {
        const d = rng.pick([2, 3, 4, 5]);
        const n = nz(rng, 6);
        const e = nz(rng, 9);
        if (gcd(n, d) !== 1) continue;
        return { n, d, e };
      }
      return { n: nz(rng, 6), d: 1, e: nz(rng, 9) };
    }
  },
  render: (params): Slide => {
    const { n, d, e } = params;
    const [a, b, k] = toGeneral(params);
    const answer = [termOf(q(a)), signed(termOf(q(b), 'y')), signedN(k)];
    return {
      kind: 'tiles',
      prompt: [
        say('Write this line in the form $ax + by + c = 0$, where $a$, $b$ and $c$ are whole numbers and $a$ is positive.'),
        show(lineTex(q(n, d), q(e, d))),
      ],
      template: '{0} {1} {2} = 0',
      bank: bank(
        answer,
        [signed(termOf(q(-b), 'y')), signedN(-k), termOf(q(d)), signed(termOf(q(a), 'y'))],
        [k],
        2,
      ),
      answer,
    };
  },
  solution: (params) => {
    const { n, d, e } = params;
    const [a, b, k] = toGeneral(params);
    const steps: SolutionStep[] = [];
    if (d > 1) {
      steps.push({ text: `Multiply every term by $${d}$ to clear the fractions:` });
      steps.push({ tex: `${d}y = ${sumTex([termOf(q(n)), String(e)])}` });
    }
    steps.push({ text: `Move everything to one side${n < 0 ? ', the side that leaves the $x$ term positive' : ''}:` });
    steps.push({ tex: generalTex(a, b, k) });
    return steps;
  },
};

interface GeneralParams {
  a: number;
  b: number;
  k: number;
}

/**
 * A line ax + by + k = 0 with a positive. Difficulty 1 keeps the gradient
 * and the intercept whole; difficulty 2 lets both be fractions.
 */
function sampleGeneral(rng: Rng, difficulty: number): GeneralParams {
  for (;;) {
    if (difficulty > 1) {
      const a = rng.int(1, 7);
      const b = rng.int(2, 7) * rng.sign();
      const k = nz(rng, 12);
      if (gcd(a, b) !== 1 || a % b === 0) continue;
      return { a, b, k };
    }
    const m = nz(rng, 4);
    const c = nz(rng, 6);
    const b = rng.int(2, 3) * (m < 0 ? 1 : -1);
    // y = mx + c times b: by = bmx + bc, so bm x - by + bc = 0; a = -bm > 0.
    return { a: -b * m, b, k: -b * c };
  }
}

/** From ax + by + k = 0 to y = mx + c, in two steps. */
const coordMakeYSteps: Generator<GeneralParams> = {
  id: 'coord-make-y-steps',
  sample: sampleGeneral,
  render: ({ a, b, k }): Slide => {
    const by = termOf(q(b), 'y');
    const moved = `${by} = ${sumTex([termOf(q(-a)), String(-k)])}`;
    const result = lineTex(q(-a, b), q(-k, b));
    return {
      kind: 'steps',
      prompt: [say('Rearrange into $y = mx + c$. Tap the part you would do **next**, then choose what it comes to.')],
      start: [generalLhs(a, b, k), '=', '0'],
      reductions: [
        {
          span: [0, 3],
          value: moved,
          bank: stepBank(
            moved,
            `${by} = ${sumTex([termOf(q(a)), String(-k)])}`,
            `${by} = ${sumTex([termOf(q(-a)), String(k)])}`,
            `${by} = ${sumTex([termOf(q(a)), String(k)])}`,
          ),
        },
        {
          span: [0, 1],
          value: result,
          bank: stepBank(result, lineTex(q(-a), q(-k)), lineTex(q(-a, b), q(-k)), lineTex(q(a, b), q(-k, b)), lineTex(q(-b, a), q(-k, b))),
        },
      ],
    };
  },
  solution: ({ a, b, k }) => [
    { text: 'Keep the $y$ term on the left and move the others across, changing their signs.' },
    { tex: `${termOf(q(b), 'y')} = ${sumTex([termOf(q(-a)), String(-k)])}` },
    { text: `Then divide every term by $${b}$.` },
    { tex: lineTex(q(-a, b), q(-k, b)) },
  ],
};

/** The gradient of ax + by + k = 0, typed. */
const coordGeneralGradient: Generator<GeneralParams> = {
  id: 'coord-general-gradient',
  sample: sampleGeneral,
  render: ({ a, b, k }): Slide => ({
    kind: 'expression',
    prompt: [say(`What is the gradient of the line $${generalTex(a, b, k)}$?`)],
    lead: 'm =',
    keypad: [],
    answer: qAns(q(-a, b)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ a, b, k }) => qOptions(q(-a, b), [q(a, b), q(-b, a), q(b, a), q(-k, b)]),
  solution: ({ a, b, k }) => [
    { text: 'Rearrange into $y = mx + c$ and read off the number in front of $x$.' },
    { tex: chain(`${termOf(q(b), 'y')} &= ${sumTex([termOf(q(-a)), String(-k)])}`, `y &= ${rhsTex(q(-a, b), q(-k, b))}`) },
    { text: `So $m = ${qTex(q(-a, b))}$: minus the $x$ coefficient over the $y$ coefficient.` },
  ],
};

interface OnLineParams {
  a: number;
  b: number;
  /** ax + by = r at difficulty 2; y = mx + c written from it at difficulty 1. */
  r: number;
  px: number;
  py: number;
  slope: boolean;
}

function onLine({ a, b, r }: OnLineParams, [x, y]: [number, number]): boolean {
  return a * x + b * y === r;
}

function onLineTex({ a, b, r, slope }: OnLineParams): string {
  // With slope set, b is -1, so ax - y = r is y = ax - r.
  if (slope) return lineTex(q(a), q(-r));
  return `${sumTex([termOf(q(a)), termOf(q(b), 'y')])} = ${r}`;
}

/** Which of four points lies on a line. */
const coordOnLine: Generator<OnLineParams> = {
  id: 'coord-on-line',
  sample: (rng, difficulty) => {
    for (;;) {
      const px = rng.int(-5, 5);
      const py = rng.int(-6, 6);
      if (difficulty > 1) {
        const a = rng.int(1, 6);
        const b = rng.int(2, 6) * rng.sign();
        if (gcd(a, b) !== 1) continue;
        return { a, b, r: a * px + b * py, px, py, slope: false };
      }
      const m = nz(rng, 4);
      const c = py - m * px;
      if (Math.abs(c) > 9) continue;
      return { a: m, b: -1, r: -c, px, py, slope: true };
    }
  },
  render: (params): Slide => {
    const { px, py } = params;
    const opts = pointOptions(
      [px, py],
      [
        [py, px],
        [px, py + 1],
        [px + 1, py],
        [-px, py],
        [px, -py],
        [px - 1, py],
        [px, py - 1],
      ],
      (p) => !onLine(params, p),
    );
    return choiceSlide([say('Which of these points lies on the line?'), show(onLineTex(params))], opts);
  },
  solution: (params) => {
    const { a, b, px, py, slope } = params;
    if (slope) {
      return [
        { text: `A point is on the line when its coordinates make the equation true. Try $${pt(px, py)}$:` },
        { tex: `${a} \\times ${paren(px)} ${signedN(-params.r)} = ${py}` },
        { text: `That is its $y$-coordinate, so $${pt(px, py)}$ is on the line. Each of the others gives a different $y$.` },
      ];
    }
    return [
      { text: `A point is on the line when its coordinates make the equation true. Try $${pt(px, py)}$:` },
      { tex: `${a} \\times ${paren(px)} ${b < 0 ? '-' : '+'} ${Math.abs(b)} \\times ${paren(py)} = ${params.r}` },
      { text: `It balances, so $${pt(px, py)}$ is on the line. None of the other points does.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 4: parallel and perpendicular lines
 * ================================================================ */

interface PerpGradientParams {
  m: Q;
  c: number;
  /** Written as ax + by + k = 0 rather than y = mx + c. */
  general: boolean;
}

/** A gradient that is not ±1, so its perpendicular is not merely its negative. */
function sampleSteep(rng: Rng, difficulty: number): Q {
  for (;;) {
    const m = difficulty > 1 ? q(nz(rng, 5), rng.int(2, 5)) : q(rng.int(2, 5) * rng.sign());
    if (m.d === 1 && Math.abs(m.n) === 1) continue;
    if (difficulty > 1 && m.d === 1) continue;
    return m;
  }
}

/** A line as the learner sees it: y = mx + c, or its general form. */
function perpLineTex({ m, c, general }: PerpGradientParams): string {
  if (!general) return lineTex(m, q(c));
  // y = (n/d)x + c: n x - d y + dc = 0, turned so the x term is positive.
  const s = m.n < 0 ? -1 : 1;
  return generalTex(s * m.n, -s * m.d, s * m.d * c);
}

/** The gradient of a line perpendicular to the one given. */
const coordPerpGradient: Generator<PerpGradientParams> = {
  id: 'coord-perp-gradient',
  sample: (rng, difficulty) => ({ m: sampleSteep(rng, difficulty), c: nz(rng, 8), general: difficulty > 1 }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`What is the gradient of a line perpendicular to $${perpLineTex(params)}$?`)],
    lead: 'm_{\\perp} =',
    keypad: [],
    answer: qAns(perp(params.m)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ m }) => qOptions(perp(m), [inv(m), neg(m), m]),
  solution: (params) => {
    const { m } = params;
    const steps: SolutionStep[] = [];
    if (params.general) {
      steps.push({ text: 'First the gradient of the line itself, by rearranging into $y = mx + c$:' });
      steps.push({ tex: lineTex(m, q(params.c)) });
    }
    steps.push({ text: `Perpendicular gradients multiply to $-1$, so flip $${qTex(m)}$ upside down and change its sign.` });
    steps.push({ tex: `m_{\\perp} = -1 \\div ${qTex(m).startsWith('-') ? `\\left(${qTex(m)}\\right)` : qTex(m)} = ${qTex(perp(m))}` });
    steps.push({ text: `Check: $${qTex(m)} \\times ${qTex(perp(m)).startsWith('-') ? `\\left(${qTex(perp(m))}\\right)` : qTex(perp(m))} = -1$.` });
    return steps;
  },
};

interface PerpLineParams {
  rel: 'parallel' | 'perpendicular';
  /** The gradient of the line given. */
  m: Q;
  c0: number;
  px: number;
  py: number;
}

/** The gradient the answer line has. */
const targetOf = ({ rel, m }: PerpLineParams): Q => (rel === 'parallel' ? m : perp(m));

/**
 * The line through a point parallel (difficulty 1) or perpendicular
 * (difficulty 2) to one given, as y = mx + c in two tiles.
 */
const coordPerpLineTiles: Generator<PerpLineParams> = {
  id: 'coord-perp-line-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const rel = difficulty > 1 ? 'perpendicular' : 'parallel';
      const m = difficulty > 1 ? perp(rng.pick([q(2), q(3), q(1, 2), q(1, 3), q(2, 3), q(3, 2), q(3, 4), q(4)].map((v) => (rng.chance(0.5) ? v : neg(v))))) : q(nz(rng, 5));
      const params = { rel, m, c0: rng.int(-8, 8), px: 0, py: rng.int(-8, 8) } as PerpLineParams;
      const t = targetOf(params);
      params.px = nz(rng, 3) * t.d;
      const c = params.py - value(mul(t, q(params.px)));
      if (c === 0 || (rel === 'parallel' && c === params.c0)) continue;
      if (Math.abs(params.px) > 8) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const t = targetOf(params);
    const { px, py, m, c0 } = params;
    const c = py - value(mul(t, q(px)));
    const answer = [termOf(t), signedN(c)];
    return {
      kind: 'tiles',
      prompt: [say(`Find the line through $${pt(px, py)}$ ${params.rel} to $${lineTex(m, q(c0))}$.`)],
      template: 'y = {0} {1}',
      bank: bank(
        answer,
        [termOf(neg(t)), termOf(m), termOf(inv(t)), signedN(-c), signedN(c0), signedN(py + value(mul(t, q(px))))],
        [c],
        2,
      ),
      answer,
    };
  },
  solution: (params) => {
    const t = targetOf(params);
    const { px, py, m } = params;
    const c = py - value(mul(t, q(px)));
    return [
      {
        text:
          params.rel === 'parallel'
            ? `Parallel lines have the same gradient, so $m = ${qTex(t)}$.`
            : `Perpendicular to a gradient of $${qTex(m)}$ means $m = -1 \\div ${qTex(m).startsWith('-') ? `(${qTex(m)})` : qTex(m)} = ${qTex(t)}$.`,
      },
      { text: `Then $c$, from $${pt(px, py)}$:` },
      { tex: chain(`${py} &= ${qTex(t)} \\times ${paren(px)} + c`, `c &= ${c}`) },
      { tex: lineTex(t, q(c)) },
    ];
  },
};

type Relation = 'Parallel' | 'Perpendicular' | 'Neither';

interface RelationParams {
  m1: Q;
  c1: number;
  m2: Q;
  /** The second line's constant: c in y = mx + c, or k in its general form. */
  c2: number;
  rel: Relation;
  general: boolean;
}

function relationLines({ m1, c1, m2, c2, general }: RelationParams): [string, string] {
  const first = lineTex(m1, q(c1));
  if (!general) return [first, lineTex(m2, q(c2))];
  const s = m2.n < 0 ? -1 : 1;
  return [first, generalTex(s * m2.n, -s * m2.d, c2)];
}

/** Read both gradients, then decide: parallel, perpendicular or neither. */
const coordRelationFlow: Generator<RelationParams> = {
  id: 'coord-relation-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const m1 = difficulty > 1 ? q(nz(rng, 4), rng.int(1, 4)) : rng.chance(0.6) ? q(nz(rng, 4)) : q(rng.sign(), rng.int(2, 3));
      if (Math.abs(m1.n) === m1.d) continue;
      const rel = rng.pick<Relation>(['Parallel', 'Perpendicular', 'Neither']);
      let m2: Q;
      if (rel === 'Parallel') m2 = m1;
      else if (rel === 'Perpendicular') m2 = perp(m1);
      else m2 = rng.pick([neg(m1), inv(m1), add(m1, q(1)), sub(m1, q(1))]);
      if (m2.n === 0) continue;
      if (rel === 'Neither' && (same(m2, m1) || same(m2, perp(m1)))) continue;
      const c1 = rng.int(-7, 7);
      const c2 = nz(rng, 9);
      // Parallel and on top of each other would be one line, not two.
      const s = m2.n < 0 ? -1 : 1;
      const c2Line = difficulty > 1 ? c2 / (s * m2.d) : c2;
      if (rel === 'Parallel' && c1 === c2Line) continue;
      return { m1, c1, m2, c2, rel, general: difficulty > 1 };
    }
  },
  render: (params): Slide => {
    const { m1, m2, rel } = params;
    const [first, second] = relationLines(params);
    const firstLabels = forkLabels([m1, neg(m1), inv(m1), perp(m1)]);
    const secondLabels = forkLabels([m2, neg(m2), inv(m2), perp(m2)]);
    return {
      kind: 'flow',
      prompt: [say('Decide whether these two lines are parallel, perpendicular or neither.')],
      subject: `\\begin{gathered} ${first} \\\\ ${second} \\end{gathered}`,
      steps: [
        {
          id: 'first',
          ask: `What is the gradient of $${first}$?`,
          branches: turned(firstLabels, first).map((label) => ({ label, to: 'second' })),
        },
        {
          id: 'second',
          ask: `And the gradient of $${second}$?`,
          branches: turned(secondLabels, second).map((label) => ({ label, to: 'verdict' })),
        },
        {
          id: 'verdict',
          ask: 'So the two lines are:',
          branches: [
            { label: 'Parallel', outcome: 'Equal gradients: the lines run side by side and never meet.' },
            { label: 'Perpendicular', outcome: 'Gradients multiplying to $-1$: the lines meet at a right angle.' },
            { label: 'Neither', outcome: 'The lines cross, but not at a right angle.' },
          ],
        },
      ],
      answer: [firstLabels[0], secondLabels[0], rel],
    };
  },
  solution: (params) => {
    const { m1, m2, rel } = params;
    const [first, second] = relationLines(params);
    const steps: SolutionStep[] = [
      { text: `$${first}$ has gradient $${qTex(m1)}$.` },
      { text: `$${second}$ has gradient $${qTex(m2)}$.` },
    ];
    if (rel === 'Parallel') steps.push({ text: 'The gradients are equal, so the lines are parallel.' });
    else if (rel === 'Perpendicular') {
      steps.push({ text: `$${qTex(m1)} \\times ${qTex(m2).startsWith('-') ? `(${qTex(m2)})` : qTex(m2)} = -1$, so the lines are perpendicular.` });
    } else {
      steps.push({
        text: `The gradients are different and multiply to $${qTex(mul(m1, m2))}$, not $-1$, so the lines are neither parallel nor perpendicular.`,
      });
    }
    return steps;
  },
};

interface PerpThroughParams extends TwoPoints {
  cx: number;
  cy: number;
}

/** The line through C perpendicular to AB: AB's gradient, the perpendicular one, then c. */
const coordPerpThroughTree: Generator<PerpThroughParams> = {
  id: 'coord-perp-through-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const pair = sampleGradientPair(rng, difficulty);
      const m1 = gradientOf(pair);
      if (Math.abs(m1.n) === m1.d) continue;
      const m2 = perp(m1);
      const cx = nz(rng, 2) * m2.d;
      const cy = rng.int(-7, 7);
      if (Math.abs(cx) > 9) continue;
      const c = cy - value(mul(m2, q(cx)));
      if (c === 0) continue;
      return { ...pair, cx, cy };
    }
  },
  render: (p): Slide => {
    const m1 = gradientOf(p);
    const m2 = perp(m1);
    const c = p.cy - value(mul(m2, q(p.cx)));
    const answer = [qTex(m1), qTex(m2), String(c)];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Find the line through $C$ perpendicular to $AB$, as $y = mx + c$. On top, the gradient of $AB$; under it, the gradient perpendicular to that; last, $c$.',
        ),
      ],
      expression: `\\begin{gathered} ${named('A', p.x1, p.y1)},\\ ${named('B', p.x2, p.y2)} \\\\ ${named('C', p.cx, p.cy)} \\end{gathered}`,
      nodes: [
        { id: 'm1', from: [] },
        { id: 'm2', from: ['m1'] },
        { id: 'c', from: ['m2'] },
      ],
      bank: bank(
        answer,
        // AB's own gradient through C can leave a fraction, so it is written as one.
        [qTex(neg(m1)), qTex(inv(m1)), String(p.cy + value(mul(m2, q(p.cx)))), String(-c), qTex(sub(q(p.cy), mul(m1, q(p.cx))))],
        [c],
      ),
      answer,
    };
  },
  solution: (p) => {
    const m1 = gradientOf(p);
    const m2 = perp(m1);
    const c = p.cy - value(mul(m2, q(p.cx)));
    return [
      { tex: `m_{AB} = ${gradientFormula(p)} = ${qTex(m1)}` },
      { text: `Perpendicular to it: $m = -1 \\div ${qTex(m1).startsWith('-') ? `(${qTex(m1)})` : qTex(m1)} = ${qTex(m2)}$.` },
      { text: `Through $C$: $${p.cy} = ${qTex(m2)} \\times ${paren(p.cx)} + c$, so $c = ${c}$.` },
      { tex: lineTex(m2, q(c)) },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 5: where two lines meet
 * ================================================================ */

interface MeetParams {
  m1: number;
  m2: number;
  x: number;
  y: number;
}

const c1Of = ({ m1, x, y }: MeetParams) => y - m1 * x;
const c2Of = ({ m2, x, y }: MeetParams) => y - m2 * x;
const firstLine = (p: MeetParams) => lineTex(q(p.m1), q(c1Of(p)));
const secondLine = (p: MeetParams) => lineTex(q(p.m2), q(c2Of(p)));

/** Two lines y = mx + c crossing at a lattice point off both axes. */
function sampleMeet(rng: Rng, difficulty: number, reach = 6): MeetParams {
  for (;;) {
    const top = difficulty > 1 ? 5 : 3;
    const m1 = nz(rng, top);
    const m2 = nz(rng, top);
    const x = nz(rng, difficulty > 1 ? 5 : 4);
    const y = nz(rng, reach);
    if (m1 === m2) continue;
    const c1 = y - m1 * x;
    const c2 = y - m2 * x;
    if (Math.abs(c1) > 12 || Math.abs(c2) > 12) continue;
    return { m1, m2, x, y };
  }
}

/** The second line in the general form ax + by = r, for difficulty 2. */
function secondGeneral(p: MeetParams): [number, number, number] {
  // y = m2 x + c2 times a small factor: -m2 x + y = c2, turned to lead positive.
  const s = p.m2 > 0 ? -1 : 1;
  return [s * -p.m2, s, s * c2Of(p)];
}

function secondGeneralTex(p: MeetParams): string {
  const [a, b, r] = secondGeneral(p);
  return `${sumTex([termOf(q(a)), termOf(q(b), 'y')])} = ${r}`;
}

function meetSolution(p: MeetParams): SolutionStep[] {
  return [
    { text: 'Where the lines meet, both give the same $y$. Set the right-hand sides equal:' },
    { tex: chain(`${rhsTex(q(p.m1), q(c1Of(p)))} &= ${rhsTex(q(p.m2), q(c2Of(p)))}`, `${termOf(q(p.m1 - p.m2))} &= ${c2Of(p) - c1Of(p)}`, `x &= ${p.x}`) },
    { text: `Then $y$ from either line: $y = ${p.m1} \\times ${paren(p.x)} ${signedN(c1Of(p))} = ${p.y}$.` },
    { text: `They meet at $${pt(p.x, p.y)}$.` },
  ];
}

/** Set the lines equal, gather, solve for x, then find y. */
const coordMeetTree: Generator<MeetParams> = {
  id: 'coord-meet-tree',
  sample: (rng, difficulty) => sampleMeet(rng, difficulty),
  render: (p): Slide => {
    const coef = p.m1 - p.m2;
    const rhs = c2Of(p) - c1Of(p);
    const answer = [String(coef), String(rhs), String(p.x), String(p.y)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Where do $${firstLine(p)}$ and $${secondLine(p)}$ meet? Set them equal and gather the $x$ terms on the left: on top, the coefficient of $x$ and the number on the right. Then $x$, then $y$.`,
        ),
      ],
      expression: `${rhsTex(q(p.m1), q(c1Of(p)))} = ${rhsTex(q(p.m2), q(c2Of(p)))}`,
      nodes: [
        { id: 'coef', from: [] },
        { id: 'rhs', from: [] },
        { id: 'x', from: ['coef', 'rhs'] },
        { id: 'y', from: ['x'] },
      ],
      bank: bank(answer, [String(p.m1 + p.m2), String(-rhs), String(c1Of(p) + c2Of(p)), String(-p.x), String(-p.y)], [p.x, p.y]),
      answer,
    };
  },
  solution: meetSolution,
};

interface MeetSliderParams extends MeetParams {
  axis: 'x' | 'y';
}

/** Two lines drawn on squared paper; slide to the x (or, at difficulty 2, the y) of the crossing. */
const coordMeetSlider: Generator<MeetSliderParams> = {
  id: 'coord-meet-slider',
  sample: (rng, difficulty) => ({ ...sampleMeet(rng, difficulty, 5), axis: difficulty > 1 ? 'y' : 'x' }),
  render: (p): Slide => {
    const second = p.axis === 'y' ? secondGeneralTex(p) : secondLine(p);
    return {
      kind: 'slider',
      prompt: [
        say(`The lines $${firstLine(p)}$ and $${second}$ are drawn. Slide to the $${p.axis}$-coordinate of the point where they meet.`),
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: p.axis === 'x' ? p.x : p.y,
      readout: `${p.axis} = {v}`,
      figure: {
        svg: plotSvg({
          xMin: -6,
          xMax: 6,
          yMin: -6,
          yMax: 6,
          height: SQUARE,
          grid: true,
          curves: [{ f: (x) => p.m1 * x + c1Of(p), accent: true }, { f: (x) => p.m2 * x + c2Of(p) }],
          label: 'Two straight lines crossing once',
        }),
        axis: p.axis,
        ...markerWindow(-6, 6, p.axis, SQUARE),
      },
    };
  },
  solution: (p) => {
    const steps = meetSolution(p);
    if (p.axis === 'y') {
      steps.unshift({ text: `The second line rearranges to $${secondLine(p)}$.` });
    }
    return steps;
  },
};

interface MeetPointParams extends MeetParams {
  general: boolean;
}

/** Which point is the crossing: the pair, not a single coordinate. */
const coordMeetPoint: Generator<MeetPointParams> = {
  id: 'coord-meet-point',
  sample: (rng, difficulty) => ({ ...sampleMeet(rng, difficulty), general: difficulty > 1 }),
  render: (p): Slide => {
    const onBoth = ([x, y]: [number, number]) => y === p.m1 * x + c1Of(p) && y === p.m2 * x + c2Of(p);
    const opts = pointOptions(
      [p.x, p.y],
      [
        [p.y, p.x],
        [p.x + 1, p.m1 * (p.x + 1) + c1Of(p)],
        [p.x - 1, p.m2 * (p.x - 1) + c2Of(p)],
        [-p.x, p.y],
        [p.x, -p.y],
        [p.x + 2, p.m2 * (p.x + 2) + c2Of(p)],
      ],
      (pair) => !onBoth(pair),
    );
    return choiceSlide(
      [
        say('Where do these two lines meet?'),
        show(`\\begin{gathered} ${firstLine(p)} \\\\ ${p.general ? secondGeneralTex(p) : secondLine(p)} \\end{gathered}`),
      ],
      opts,
    );
  },
  solution: (p) => {
    const steps = meetSolution(p);
    if (p.general) {
      steps.unshift({ text: `Rearranged, the second line is $${secondLine(p)}$.` });
    }
    steps.push({ text: 'A point on only one of the lines is not where they meet: check it in both.' });
    return steps;
  },
};

/** One coordinate of the crossing, typed: y at difficulty 1, x at difficulty 2 with one line in general form. */
const coordMeetY: Generator<MeetPointParams> = {
  id: 'coord-meet-y',
  sample: (rng, difficulty) => ({ ...sampleMeet(rng, difficulty), general: difficulty > 1 }),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        p.general
          ? `Find the $x$-coordinate of the point where $${firstLine(p)}$ meets $${secondGeneralTex(p)}$.`
          : `Find the $y$-coordinate of the point where $${firstLine(p)}$ meets $${secondLine(p)}$.`,
      ),
    ],
    lead: p.general ? 'x =' : 'y =',
    keypad: [],
    answer: String(p.general ? p.x : p.y),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => (p.general ? intOptions(p.x, [p.y, -p.x, c2Of(p) - c1Of(p)]) : intOptions(p.y, [p.x, -p.y, c1Of(p), c2Of(p)])),
  solution: (p) => {
    if (!p.general) return meetSolution(p);
    const [a, b, r] = secondGeneral(p);
    return [
      { text: 'Substitute the first line into the second, in place of $y$:' },
      {
        tex: chain(
          `${termOf(q(a))} ${b < 0 ? '-' : '+'} (${rhsTex(q(p.m1), q(c1Of(p)))}) &= ${r}`,
          `${termOf(q(a + b * p.m1))} ${signedN(b * c1Of(p))} &= ${r}`,
          `x &= ${p.x}`,
        ),
      },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 1: the midpoint and the distance
 * ================================================================ */

interface MidParams extends TwoPoints {
  mx: number;
  my: number;
}

/**
 * Two points with a whole midpoint, built outward from it. Difficulty 2
 * reaches further and into negative numbers.
 */
function sampleMid(rng: Rng, difficulty: number): MidParams {
  for (;;) {
    const mx = difficulty > 1 ? rng.int(-6, 6) : rng.int(1, 6);
    const my = difficulty > 1 ? rng.int(-6, 6) : rng.int(1, 6);
    const hx = nz(rng, difficulty > 1 ? 7 : 4);
    const hy = rng.int(-(difficulty > 1 ? 7 : 4), difficulty > 1 ? 7 : 4);
    const p = { x1: mx - hx, y1: my - hy, x2: mx + hx, y2: my + hy, mx, my };
    if (difficulty === 1 && Math.min(p.x1, p.y1, p.x2, p.y2) < -2) continue;
    if (Math.max(...[p.x1, p.y1, p.x2, p.y2].map(Math.abs)) > 12) continue;
    return p;
  }
}

function midSolution(p: MidParams): SolutionStep[] {
  return [
    { text: 'The midpoint is the average of the two ends: add the $x$-coordinates and halve, then the same for $y$.' },
    { tex: chain(`x &= \\frac{${p.x1} + ${paren(p.x2)}}{2} = ${p.mx}`, `y &= \\frac{${p.y1} + ${paren(p.y2)}}{2} = ${p.my}`) },
    { text: `So $M = ${pt(p.mx, p.my)}$.` },
  ];
}

/** The midpoint of AB as two tiles. */
const coordMidpointTiles: Generator<MidParams> = {
  id: 'coord-midpoint-tiles',
  sample: sampleMid,
  render: (p): Slide => {
    const answer = [String(p.mx), String(p.my)];
    return {
      kind: 'tiles',
      prompt: [say(`Find the midpoint $M$ of $${named('A', p.x1, p.y1)}$ and $${named('B', p.x2, p.y2)}$.`)],
      template: 'M = ({0}, {1})',
      bank: bank(
        answer,
        [String(p.x1 + p.x2), String(p.y1 + p.y2), String((p.x2 - p.x1) / 2), String((p.y2 - p.y1) / 2), String(-p.mx), String(-p.my)],
        [p.mx, p.my],
        2,
      ),
      answer,
    };
  },
  solution: midSolution,
};

interface DistanceParams {
  x1: number;
  y1: number;
  dx: number;
  dy: number;
  c: number;
}

/** Two points a whole distance apart, the legs read from the triples table. */
function sampleDistance(rng: Rng, difficulty: number): DistanceParams {
  for (;;) {
    const { dx, dy, c } = sampleTriple(rng, difficulty > 1 ? 25 : 13);
    const x1 = difficulty > 1 ? rng.int(-8, 8) : rng.int(0, 6);
    const y1 = difficulty > 1 ? rng.int(-8, 8) : rng.int(0, 6);
    if (Math.abs(x1 + dx) > 20 || Math.abs(y1 + dy) > 20) continue;
    if (difficulty === 1 && (x1 + dx < -6 || y1 + dy < -6)) continue;
    return { x1, y1, dx, dy, c };
  }
}

function distanceSolution({ x1, y1, dx, dy, c }: DistanceParams): SolutionStep[] {
  return [
    { text: 'The two changes are the shorter sides of a right-angled triangle, and $AB$ is its hypotenuse. By Pythagoras:' },
    { tex: chain(`\\Delta x &= ${x1 + dx} - ${paren(x1)} = ${dx}`, `\\Delta y &= ${y1 + dy} - ${paren(y1)} = ${dy}`) },
    { tex: chain(`AB^2 &= ${paren(dx)}^2 + ${paren(dy)}^2`, `&= ${dx * dx} + ${dy * dy} = ${c * c}`, `AB &= \\sqrt{${c * c}} = ${c}`) },
  ];
}

/** Change in x and y, their squares, the sum and its root. */
const coordDistanceTree: Generator<DistanceParams> = {
  id: 'coord-distance-tree',
  sample: sampleDistance,
  render: (p): Slide => {
    const { x1, y1, dx, dy, c } = p;
    const answer = [String(dx), String(dy), String(dx * dx), String(dy * dy), String(c * c), String(c)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `The distance from $${named('A', x1, y1)}$ to $${named('B', x1 + dx, y1 + dy)}$. Top row: the change in $x$ and the change in $y$. Then their squares, the total, and its square root.`,
        ),
      ],
      expression: 'AB = \\sqrt{(\\Delta x)^2 + (\\Delta y)^2}',
      nodes: [
        { id: 'dx', from: [] },
        { id: 'dy', from: [] },
        { id: 'dx2', from: ['dx'] },
        { id: 'dy2', from: ['dy'] },
        { id: 'sum', from: ['dx2', 'dy2'] },
        { id: 'root', from: ['sum'] },
      ],
      bank: bank(
        answer,
        [String(-dx), String(-dy), String(2 * dx), String(Math.abs(dx) + Math.abs(dy)), String(2 * x1 + dx), String(c * c - 2 * dx * dy)],
        [c],
      ),
      answer,
    };
  },
  solution: distanceSolution,
};

/** The distance AB, typed. */
const coordDistance: Generator<DistanceParams> = {
  id: 'coord-distance',
  sample: sampleDistance,
  render: ({ x1, y1, dx, dy, c }): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the distance between $${named('A', x1, y1)}$ and $${named('B', x1 + dx, y1 + dy)}$.`)],
    lead: 'AB =',
    keypad: [],
    answer: String(c),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ dx, dy, c }) => intOptions(c, [c * c, Math.abs(dx) + Math.abs(dy), Math.abs(Math.abs(dx) - Math.abs(dy)), c + 1], 1),
  solution: distanceSolution,
};

interface MidSliderParams extends TwoPoints {
  axis: 'x' | 'y';
}

/**
 * A and B drawn; slide to the midpoint's x. Difficulty 2 asks its y, which
 * may be a half.
 */
const coordMidpointSlider: Generator<MidSliderParams> = {
  id: 'coord-midpoint-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const x1 = rng.int(-7, 7);
      const y1 = rng.int(-7, 7);
      const x2 = rng.int(-7, 7);
      const y2 = rng.int(-7, 7);
      if (x1 === x2 || Math.abs(x2 - x1) < 2) continue;
      if (difficulty === 1 && (x1 + x2) % 2 !== 0) continue;
      if (difficulty > 1 && y1 === y2) continue;
      return { x1, y1, x2, y2, axis: difficulty > 1 ? 'y' : 'x' };
    }
  },
  render: (p): Slide => {
    const answer = p.axis === 'x' ? (p.x1 + p.x2) / 2 : (p.y1 + p.y2) / 2;
    return {
      kind: 'slider',
      prompt: [
        say(
          `$${named('A', p.x1, p.y1)}$ and $${named('B', p.x2, p.y2)}$ are drawn. Slide to the $${p.axis}$-coordinate of the midpoint of $AB$.`,
        ),
      ],
      min: -7,
      max: 7,
      step: p.axis === 'x' ? 1 : 0.5,
      answer,
      readout: `${p.axis} = {v}`,
      figure: {
        svg: plotSvg({
          xMin: -8,
          xMax: 8,
          yMin: -8,
          yMax: 8,
          height: SQUARE,
          grid: true,
          curves: [segment(p.x1, p.y1, p.x2, p.y2)],
          marks: [
            { x: p.x1, y: p.y1 },
            { x: p.x2, y: p.y2 },
          ],
          label: 'Two points joined by a line segment',
        }),
        axis: p.axis,
        ...markerWindow(-8, 8, p.axis, SQUARE),
      },
    };
  },
  solution: (p) => {
    const [a, b] = p.axis === 'x' ? [p.x1, p.x2] : [p.y1, p.y2];
    const half = q(a + b, 2);
    return [
      { text: `The midpoint's $${p.axis}$-coordinate is the average of the two ends' $${p.axis}$-coordinates.` },
      { tex: `\\frac{${a} + ${paren(b)}}{2} = \\frac{${a + b}}{2} = ${half.d === 1 ? half.n : (a + b) / 2}` },
    ];
  },
};

interface EndpointParams {
  x1: number;
  y1: number;
  mx: number;
  my: number;
  ask: 'x' | 'y';
}

/** B from A and the midpoint: one coordinate, typed. */
const coordEndpoint: Generator<EndpointParams> = {
  id: 'coord-endpoint',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = sampleMid(rng, difficulty);
      const x1 = p.x1;
      const y1 = p.y1;
      if (x1 === p.mx || y1 === p.my) continue;
      return { x1, y1, mx: p.mx, my: p.my, ask: difficulty > 1 ? 'y' : 'x' };
    }
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `$${named('M', p.mx, p.my)}$ is the midpoint of $AB$, where $${named('A', p.x1, p.y1)}$. Find the $${p.ask}$-coordinate of $B$.`,
      ),
    ],
    lead: `${p.ask}_B =`,
    keypad: [],
    answer: String(p.ask === 'x' ? 2 * p.mx - p.x1 : 2 * p.my - p.y1),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const [a, m] = p.ask === 'x' ? [p.x1, p.mx] : [p.y1, p.my];
    return intOptions(2 * m - a, [(m + a) / 2, m - a, 2 * m + a, m + a]);
  },
  solution: (p) => {
    const [a, m] = p.ask === 'x' ? [p.x1, p.mx] : [p.y1, p.my];
    return [
      { text: `From $A$ to $M$ the $${p.ask}$-coordinate changes by $${m} - ${paren(a)} = ${m - a}$. $B$ is the same step again past $M$.` },
      { tex: `${p.ask}_B = ${m} ${signedN(m - a)} = ${2 * m - a}` },
      { text: `Check: $\\frac{${a} + ${paren(2 * m - a)}}{2} = ${m}$.` },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 2: the perpendicular bisector
 * ================================================================ */

interface BisectorParams {
  mx: number;
  my: number;
  /** The bisector's gradient. */
  mb: Q;
  /** How many steps of (d, -n) from M to B. */
  t: number;
}

/** A and B either side of M, along the direction perpendicular to the bisector. */
function bisectorEnds({ mx, my, mb, t }: BisectorParams): TwoPoints {
  return { x1: mx - t * mb.n, y1: my + t * mb.d, x2: mx + t * mb.n, y2: my - t * mb.d };
}

const bisectorC = ({ mx, my, mb }: BisectorParams): number => my - value(mul(mb, q(mx)));

/**
 * A segment whose perpendicular bisector has a whole c. Difficulty 1 keeps the
 * gradients simple; difficulty 2 lets both be proper fractions.
 */
function sampleBisector(rng: Rng, difficulty: number): BisectorParams {
  const easy = [q(1), q(2), q(3), q(1, 2), q(1, 3)];
  const hard = [q(2, 3), q(3, 2), q(1, 4), q(3, 4), q(4, 3), q(4), q(1, 2), q(2, 5)];
  for (;;) {
    const base = rng.pick(difficulty > 1 ? hard : easy);
    const mb = rng.chance(0.5) ? base : neg(base);
    const t = difficulty > 1 ? rng.pick([1, 2]) : 1;
    const mx = rng.int(-3, 3) * mb.d;
    const my = rng.int(-5, 5);
    const params = { mx, my, mb, t };
    const ends = bisectorEnds(params);
    if (Math.max(...[ends.x1, ends.y1, ends.x2, ends.y2].map(Math.abs)) > 10) continue;
    if (bisectorC(params) === 0) continue;
    return params;
  }
}

/** AB's gradient, then -1 over it: the bisector's gradient. */
const coordBisectorGradientSteps: Generator<BisectorParams> = {
  id: 'coord-bisector-gradient-steps',
  sample: sampleBisector,
  render: (params): Slide => {
    const ends = bisectorEnds(params);
    const mAB = gradientOf(ends);
    const { mb } = params;
    return {
      kind: 'steps',
      prompt: [
        say(
          `$AB$ joins $${named('A', ends.x1, ends.y1)}$ to $${named('B', ends.x2, ends.y2)}$. Its perpendicular bisector meets it at a right angle, so its gradient is $-1$ divided by the gradient of $AB$. Tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: ['-1 \\div', gradientFormula(ends)],
      reductions: [
        {
          span: [1, 2],
          value: qTex(mAB),
          bank: stepBank(qTex(mAB), qTex(neg(mAB)), qTex(inv(mAB)), qTex(perp(mAB))),
        },
        {
          span: [0, 2],
          value: qTex(mb),
          bank: stepBank(qTex(mb), qTex(neg(mb)), qTex(mAB), qTex(neg(mAB))),
        },
      ],
    };
  },
  solution: (params) => {
    const ends = bisectorEnds(params);
    const mAB = gradientOf(ends);
    return [
      { tex: `m_{AB} = ${gradientFormula(ends)} = ${qTex(mAB)}` },
      { text: 'The bisector is perpendicular to $AB$, so its gradient multiplied by $AB$\'s is $-1$:' },
      { tex: `m = -1 \\div ${qTex(mAB).startsWith('-') ? `\\left(${qTex(mAB)}\\right)` : qTex(mAB)} = ${qTex(params.mb)}` },
    ];
  },
};

function bisectorSolution(params: BisectorParams): SolutionStep[] {
  const ends = bisectorEnds(params);
  const { mx, my, mb } = params;
  const c = bisectorC(params);
  return [
    { text: `The bisector passes through the midpoint of $AB$, $M${pt(mx, my)}$.` },
    { text: `$AB$ has gradient $${qTex(gradientOf(ends))}$, so the bisector's gradient is $${qTex(mb)}$.` },
    { tex: chain(`${my} &= ${qTex(mb)} \\times ${paren(mx)} + c`, `c &= ${c}`) },
    { tex: lineTex(mb, q(c)) },
  ];
}

/** The perpendicular bisector as y = mx + c, in two tiles. */
const coordBisectorTiles: Generator<BisectorParams> = {
  id: 'coord-bisector-tiles',
  sample: sampleBisector,
  render: (params): Slide => {
    const ends = bisectorEnds(params);
    const { mx, my, mb } = params;
    const c = bisectorC(params);
    const answer = [termOf(mb), signedN(c)];
    return {
      kind: 'tiles',
      prompt: [
        say(`Find the perpendicular bisector of $AB$, where $${named('A', ends.x1, ends.y1)}$ and $${named('B', ends.x2, ends.y2)}$.`),
      ],
      template: 'y = {0} {1}',
      bank: bank(
        answer,
        [termOf(gradientOf(ends)), termOf(neg(mb)), signedN(-c), signedN(my + value(mul(mb, q(mx)))), signedN(my)],
        [c],
        2,
      ),
      answer,
    };
  },
  solution: bisectorSolution,
};

/** The two things a bisector needs, chosen in turn: the midpoint, then the gradient. */
const coordBisectorFlow: Generator<BisectorParams> = {
  id: 'coord-bisector-flow',
  sample: sampleBisector,
  render: (params): Slide => {
    const ends = bisectorEnds(params);
    const { mx, my, mb } = params;
    const mAB = gradientOf(ends);
    const mids: string[] = [];
    for (const [x, y] of [
      [mx, my],
      [my, mx],
      [ends.x2 - ends.x1, ends.y2 - ends.y1],
      [ends.x1 + ends.x2, ends.y1 + ends.y2],
      [-mx, my],
    ]) {
      const label = `$${pt(x, y)}$`;
      if (!mids.includes(label)) mids.push(label);
    }
    const grads = forkLabels([mb, mAB, neg(mb), neg(mAB)]);
    return {
      kind: 'flow',
      prompt: [say('Build the perpendicular bisector of $AB$ from the two things it needs.')],
      subject: `${named('A', ends.x1, ends.y1)},\\quad ${named('B', ends.x2, ends.y2)}`,
      steps: [
        {
          id: 'mid',
          ask: 'The bisector passes through the midpoint of $AB$. Where is it?',
          branches: turned(mids.slice(0, 4), `${mx},${my}`).map((label) => ({ label, to: 'grad' })),
        },
        {
          id: 'grad',
          ask: 'It crosses $AB$ at a right angle. What is its gradient?',
          branches: turned(grads, `${qTex(mb)}|${mx}`).map((label) => ({
            label,
            outcome: `So the line through that point with gradient ${label} is the bisector.`,
          })),
        },
      ],
      answer: [mids[0], grads[0]],
    };
  },
  solution: bisectorSolution,
};

interface EquidistantParams {
  /** Where P sits on its axis. */
  k: number;
  u: [number, number];
  v: [number, number];
  axis: 'x' | 'y';
}

/** Lattice vectors of a few lengths, for two points equally far from P. */
const EQUAL_LENGTHS = [5, 10, 13, 17, 20, 25, 26, 29].map(latticeVectors);

function equidistantPoints({ k, u, v, axis }: EquidistantParams): TwoPoints {
  const [px, py] = axis === 'x' ? [k, 0] : [0, k];
  return { x1: px + u[0], y1: py + u[1], x2: px + v[0], y2: py + v[1] };
}

/**
 * The point on an axis the same distance from A and B: on the x-axis at
 * difficulty 1, the y-axis at difficulty 2. Built from two lattice vectors of
 * equal length from P, so the answer is whole.
 */
const coordEquidistant: Generator<EquidistantParams> = {
  id: 'coord-equidistant',
  sample: (rng, difficulty) => {
    const axis = difficulty > 1 ? 'y' : 'x';
    for (;;) {
      const vectors = rng.pick(EQUAL_LENGTHS);
      const u = rng.pick(vectors);
      const v = rng.pick(vectors);
      const k = nz(rng, 5);
      // Along the axis the two ends must differ, or every point on it is equally far.
      if (axis === 'x' ? u[0] === v[0] : u[1] === v[1]) continue;
      const params = { k, u, v, axis } as EquidistantParams;
      const ends = equidistantPoints(params);
      if (Math.max(...[ends.x1, ends.y1, ends.x2, ends.y2].map(Math.abs)) > 10) continue;
      if ((axis === 'x' ? ends.y1 : ends.x1) === 0 || (axis === 'x' ? ends.y2 : ends.x2) === 0) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const ends = equidistantPoints(params);
    const where = params.axis === 'x' ? 'P(k, 0)' : 'P(0, k)';
    return {
      kind: 'expression',
      prompt: [
        say(
          `The point $${where}$ on the $${params.axis}$-axis is the same distance from $${named('A', ends.x1, ends.y1)}$ as from $${named('B', ends.x2, ends.y2)}$. Find $k$.`,
        ),
      ],
      lead: 'k =',
      keypad: [],
      answer: String(params.k),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (params) => {
    const ends = equidistantPoints(params);
    const [a, b] = params.axis === 'x' ? [ends.x1, ends.x2] : [ends.y1, ends.y2];
    return intOptions(params.k, [(a + b) / 2, -params.k, a, b]);
  },
  solution: (params) => {
    const ends = equidistantPoints(params);
    const { k, axis } = params;
    const x = axis === 'x';
    const pa = x ? `(k - ${paren(ends.x1)})^2 + ${paren(ends.y1)}^2` : `${paren(ends.x1)}^2 + (k - ${paren(ends.y1)})^2`;
    const pb = x ? `(k - ${paren(ends.x2)})^2 + ${paren(ends.y2)}^2` : `${paren(ends.x2)}^2 + (k - ${paren(ends.y2)})^2`;
    const [a1, b1, a2, b2] = x ? [ends.x1, ends.y1, ends.x2, ends.y2] : [ends.y1, ends.x1, ends.y2, ends.x2];
    return [
      { text: 'Set $PA^2 = PB^2$; squaring both avoids the roots.' },
      { tex: chain(`PA^2 &= ${pa}`, `PB^2 &= ${pb}`) },
      { text: 'Multiply out. The $k^2$ on each side cancels, leaving a linear equation:' },
      { tex: chain(`${termOf(q(-2 * a1), 'k')} ${signedN(a1 * a1 + b1 * b1)} &= ${termOf(q(-2 * a2), 'k')} ${signedN(a2 * a2 + b2 * b2)}`, `${termOf(q(2 * (a2 - a1)), 'k')} &= ${a2 * a2 + b2 * b2 - a1 * a1 - b1 * b1}`, `k &= ${k}`) },
      { text: `So $P$ is $${x ? pt(k, 0) : pt(0, k)}$: it lies on the perpendicular bisector of $AB$.` },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 3: the equation of a circle
 * ================================================================ */

interface CircleParams {
  a: number;
  b: number;
  r2: number;
  /** A point on the circle, where the radius is given that way. */
  through?: [number, number];
}

/** A centre off both axes. */
function sampleCentre(rng: Rng, difficulty: number): [number, number] {
  const top = difficulty > 1 ? 8 : 5;
  return [nz(rng, top), nz(rng, top)];
}

/** A lattice vector of modest length, both parts non-zero. */
function sampleOffset(rng: Rng, top: number): [number, number] {
  return [nz(rng, top), nz(rng, top)];
}

/**
 * The circle's equation as three tiles. Difficulty 1 gives the radius;
 * difficulty 2 a point the circle passes through, so r^2 must be worked out.
 */
const coordCircleTiles: Generator<CircleParams> = {
  id: 'coord-circle-tiles',
  sample: (rng, difficulty) => {
    const [a, b] = sampleCentre(rng, difficulty);
    if (difficulty > 1) {
      const [dx, dy] = sampleOffset(rng, 6);
      return { a, b, r2: dx * dx + dy * dy, through: [a + dx, b + dy] };
    }
    const r = rng.int(2, 9);
    return { a, b, r2: r * r };
  },
  render: ({ a, b, r2, through }): Slide => {
    const answer = [signedN(-a), signedN(-b), String(r2)];
    const r = Math.round(Math.sqrt(r2));
    return {
      kind: 'tiles',
      prompt: [
        say(
          through
            ? `Write the equation of the circle with centre $${named('C', a, b)}$ that passes through $${named('P', ...through)}$.`
            : `Write the equation of the circle with centre $${pt(a, b)}$ and radius $${r}$.`,
        ),
      ],
      template: '(x {0})^2 + (y {1})^2 = {2}',
      bank: bank(
        answer,
        [signedN(a), signedN(b), through ? String(Math.abs(through[0] - a) + Math.abs(through[1] - b)) : String(r), String(2 * r2), String(through ? r2 + 2 : 2 * r)],
        [r2],
        2,
      ),
      answer,
    };
  },
  solution: ({ a, b, r2, through }) => {
    const steps: SolutionStep[] = [
      { text: 'A circle with centre $(a, b)$ and radius $r$ is every point $r$ from the centre:' },
      { tex: '(x - a)^2 + (y - b)^2 = r^2' },
    ];
    if (through) {
      const [dx, dy] = [through[0] - a, through[1] - b];
      steps.push({ text: 'The radius is the distance from the centre to $P$, and only its square is needed:' });
      steps.push({ tex: `r^2 = ${paren(dx)}^2 + ${paren(dy)}^2 = ${r2}` });
    }
    steps.push({ text: `With $a = ${a}$ and $b = ${b}$ the signs in the brackets are the opposite of the centre's:` });
    steps.push({ tex: circleTex(a, b, r2) });
    return steps;
  },
};

interface CentreParams {
  a: number;
  b: number;
  r: number;
  withRadius: boolean;
}

/** Read the centre (and at difficulty 2 the radius) off the equation. */
const coordCentre: Generator<CentreParams> = {
  id: 'coord-centre',
  sample: (rng, difficulty) => {
    const [a, b] = sampleCentre(rng, difficulty);
    return { a, b, r: rng.int(2, 9), withRadius: difficulty > 1 };
  },
  render: ({ a, b, r, withRadius }): Slide => {
    const label = (x: number, y: number, radius?: number) =>
      radius === undefined ? pt(x, y) : `${pt(x, y)},\\ r = ${radius}`;
    const opts: ChoiceOption[] = withRadius
      ? [
          { tex: label(a, b, r), correct: true },
          { tex: label(-a, -b, r) },
          { tex: label(a, b, r * r) },
          { tex: label(-a, -b, r * r) },
        ]
      : [{ tex: label(a, b), correct: true }, { tex: label(-a, -b) }, { tex: label(a, -b) }, { tex: label(-a, b) }];
    return choiceSlide(
      [say(withRadius ? 'What are the centre and radius of this circle?' : 'What is the centre of this circle?'), show(circleTex(a, b, r * r))],
      opts,
    );
  },
  solution: ({ a, b, r, withRadius }) => {
    const steps: SolutionStep[] = [
      { text: 'Compare with $(x - a)^2 + (y - b)^2 = r^2$. Each bracket takes the centre away, so its sign is the opposite:' },
      { tex: chain(`${lin('x', a)} &= x - ${paren(a)}`, `${lin('y', b)} &= y - ${paren(b)}`) },
      { text: `The centre is $${pt(a, b)}$.` },
    ];
    if (withRadius) steps.push({ text: `The right-hand side is $r^2 = ${r * r}$, so the radius is $${r}$, not $${r * r}$.` });
    return steps;
  },
};

interface RadiusParams {
  a: number;
  b: number;
  dx: number;
  dy: number;
  /** A and B are the ends of a diameter, not the centre and a point. */
  diameter: boolean;
}

/**
 * r^2 from the centre and a point on the circle, or at difficulty 2 from the
 * two ends of a diameter.
 */
const coordRadiusSquared: Generator<RadiusParams> = {
  id: 'coord-radius-squared',
  sample: (rng, difficulty) => {
    const [a, b] = sampleCentre(rng, 1);
    const [dx, dy] = sampleOffset(rng, difficulty > 1 ? 5 : 6);
    return { a, b, dx, dy, diameter: difficulty > 1 };
  },
  render: ({ a, b, dx, dy, diameter }): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        diameter
          ? `$AB$ is a diameter of a circle, where $${named('A', a - dx, b - dy)}$ and $${named('B', a + dx, b + dy)}$. Find $r^2$.`
          : `A circle has centre $${named('C', a, b)}$ and passes through $${named('P', a + dx, b + dy)}$. Find $r^2$.`,
      ),
    ],
    lead: 'r^2 =',
    keypad: [],
    answer: String(dx * dx + dy * dy),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ dx, dy, diameter }) => {
    const r2 = dx * dx + dy * dy;
    return intOptions(r2, diameter ? [4 * r2, 2 * r2, Math.abs(dx) + Math.abs(dy)] : [Math.abs(dx) + Math.abs(dy), Math.abs(dx * dx - dy * dy), (dx + dy) * (dx + dy)], 1);
  },
  solution: ({ a, b, dx, dy, diameter }) => {
    const steps: SolutionStep[] = [];
    if (diameter) {
      steps.push({ text: 'The centre is the midpoint of the diameter:' });
      steps.push({ tex: chain(`x &= \\frac{${a - dx} + ${paren(a + dx)}}{2} = ${a}`, `y &= \\frac{${b - dy} + ${paren(b + dy)}}{2} = ${b}`) });
      steps.push({ text: 'The radius runs from the centre to either end, say $B$, so $r^2$ is:' });
    } else {
      steps.push({ text: 'The radius is the distance from the centre to any point on the circle, so $r^2$ is:' });
    }
    steps.push({ tex: squaredDistance(a + dx, a, b + dy, b) });
    return steps;
  },
};

interface OnCircleParams {
  a: number;
  b: number;
  r2: number;
  px: number;
  py: number;
}

/** P's squared distance from the centre, as a tree, to compare with r^2. */
function sampleOnCircle(rng: Rng, difficulty: number): OnCircleParams {
  for (;;) {
    const [a, b] = sampleCentre(rng, difficulty);
    const [dx, dy] = sampleOffset(rng, 5);
    const d2 = dx * dx + dy * dy;
    const r2 = rng.pick([d2, d2, d2 + rng.int(1, 6), d2 - rng.int(1, 6)]);
    if (r2 < 1) continue;
    return { a, b, r2, px: a + dx, py: b + dy };
  }
}

/** Put P into the left-hand side: the two brackets, their squares, the total. */
const coordOnCircleTree: Generator<OnCircleParams> = {
  id: 'coord-on-circle-tree',
  sample: sampleOnCircle,
  render: ({ a, b, r2, px, py }): Slide => {
    const dx = px - a;
    const dy = py - b;
    const answer = [String(dx), String(dy), String(dx * dx), String(dy * dy), String(dx * dx + dy * dy)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Is $${named('P', px, py)}$ on the circle $${circleTex(a, b, r2)}$? Put $P$ into the left-hand side: the two brackets on top, then their squares, then the total to compare with $${r2}$.`,
        ),
      ],
      expression: `(${px} - ${paren(a)})^2 + (${py} - ${paren(b)})^2`,
      nodes: [
        { id: 'dx', from: [] },
        { id: 'dy', from: [] },
        { id: 'dx2', from: ['dx'] },
        { id: 'dy2', from: ['dy'] },
        { id: 'sum', from: ['dx2', 'dy2'] },
      ],
      bank: bank(answer, [String(px + a), String(py + b), String(-dx), String(-dy), String(2 * dx), String(r2)], [dx * dx + dy * dy]),
      answer,
    };
  },
  solution: ({ a, b, r2, px, py }) => {
    const dx = px - a;
    const dy = py - b;
    const total = dx * dx + dy * dy;
    return [
      { tex: squaredDistance(px, a, py, b) },
      {
        text:
          total === r2
            ? `That is exactly $${r2}$, so $P$ is on the circle.`
            : total < r2
              ? `That is less than $${r2}$, so $P$ is inside the circle.`
              : `That is more than $${r2}$, so $P$ is outside the circle.`,
      },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 4: centre and radius from the expanded form
 * ================================================================ */

interface ExpandedParams {
  a: number;
  b: number;
  r2: number;
  /** Every term multiplied by this, to be divided out first. */
  k: number;
}

function sampleExpanded(rng: Rng, difficulty: number, squareRadius: boolean): ExpandedParams {
  for (;;) {
    const [a, b] = sampleCentre(rng, difficulty > 1 ? 2 : 1);
    const r = rng.int(1, 9);
    const r2 = squareRadius ? r * r : rng.int(2, 50);
    // A zero constant is fine, but a circle whose constant is its own r^2
    // would read the same as one through the origin; keep them apart.
    if (a * a + b * b === r2) continue;
    return { a, b, r2, k: difficulty > 1 ? rng.pick([2, 3]) : 1 };
  }
}

/**
 * Completing the square on both letters, as worked-solution lines. Each
 * bracket is inline prose, which wraps; the gathered numbers stack.
 */
function completeSquareSteps(a: number, b: number, r2: number): SolutionStep[] {
  const f = a * a + b * b - r2;
  return [
    {
      text: `Halve each coefficient for its bracket and take the square away again: $x^2 ${signed(termOf(q(-2 * a)))} = (${lin('x', a)})^2 - ${a * a}$ and $y^2 ${signed(termOf(q(-2 * b), 'y'))} = (${lin('y', b)})^2 - ${b * b}$.`,
    },
    { text: 'Put both in and move the numbers across:' },
    { tex: chain(`&(${lin('x', a)})^2 + (${lin('y', b)})^2`, `=\\;&${-f} + ${a * a} + ${b * b}`, `=\\;&${r2}`) },
  ];
}

/** Complete the square on x, then on y, then gather the numbers. */
const coordCompleteSteps: Generator<ExpandedParams> = {
  id: 'coord-complete-steps',
  sample: (rng, difficulty) => ({ ...sampleExpanded(rng, difficulty, false), k: 1 }),
  render: ({ a, b, r2 }): Slide => {
    const f = a * a + b * b - r2;
    const xSquare = (c: number) => `(${lin('x', c)})^2`;
    const ySquare = (c: number) => `(${lin('y', c)})^2`;
    const xDone = `${xSquare(a)} - ${a * a}`;
    const yDone = `${ySquare(b)} - ${b * b}`;
    const result = `${xSquare(a)} + ${ySquare(b)} = ${r2}`;
    return {
      kind: 'steps',
      prompt: [
        say(`Write $${expandedTex(a, b, r2)}$ as $(x - a)^2 + (y - b)^2 = r^2$. The number is already across. Tap the part you would do **next**, then choose what it becomes.`),
      ],
      start: [`x^2 ${signed(termOf(q(-2 * a)))}`, '+', `y^2 ${signed(termOf(q(-2 * b), 'y'))}`, '=', String(-f)],
      reductions: [
        {
          span: [0, 1],
          value: xDone,
          bank: stepBank(xDone, `${xSquare(a)} + ${a * a}`, `${xSquare(2 * a)} - ${4 * a * a}`, `${xSquare(-a)} - ${a * a}`),
        },
        {
          span: [2, 3],
          value: yDone,
          bank: stepBank(yDone, `${ySquare(b)} + ${b * b}`, `${ySquare(2 * b)} - ${4 * b * b}`, `${ySquare(-b)} - ${b * b}`),
        },
        {
          span: [0, 5],
          value: result,
          bank: stepBank(
            result,
            `${xSquare(a)} + ${ySquare(b)} = ${-f - a * a - b * b}`,
            `${xSquare(a)} + ${ySquare(b)} = ${-f + a * a}`,
            `${xSquare(a)} + ${ySquare(b)} = ${-f + b * b}`,
          ),
        },
      ],
    };
  },
  solution: ({ a, b, r2 }) => {
    const f = a * a + b * b - r2;
    return [
      { text: `The number is already across: $x^2 + y^2 ${signed(termOf(q(-2 * a)))} ${signed(termOf(q(-2 * b), 'y'))} = ${-f}$.` },
      ...completeSquareSteps(a, b, r2),
      { text: `So the centre is $${pt(a, b)}$ and $r^2 = ${r2}$.` },
    ];
  },
};

/** Centre and radius read from the expanded form, as three tiles. */
const coordExpandedTiles: Generator<ExpandedParams> = {
  id: 'coord-expanded-tiles',
  sample: (rng, difficulty) => sampleExpanded(rng, difficulty, true),
  render: ({ a, b, r2, k }): Slide => {
    const r = Math.round(Math.sqrt(r2));
    const answer = [String(a), String(b), String(r)];
    return {
      kind: 'tiles',
      prompt: [say('Find the centre $(a, b)$ and the radius $r$ of this circle.'), wrapped(expandedTex(a, b, r2, k))],
      template: '({0}, {1}),\\quad r = {2}',
      bank: bank(answer, [String(-a), String(-b), String(r2), String(-2 * a), String(-2 * b)], [r]),
      answer,
    };
  },
  solution: ({ a, b, r2, k }) => {
    const f = a * a + b * b - r2;
    const steps: SolutionStep[] = [];
    if (k > 1) {
      steps.push({ text: `Divide every term by $${k}$ so that $x^2$ and $y^2$ stand alone: $${expandedTex(a, b, r2)}$.` });
    }
    steps.push({ text: `Move the number across: $x^2 + y^2 ${signed(termOf(q(-2 * a)))} ${signed(termOf(q(-2 * b), 'y'))} = ${-f}$.` });
    steps.push(...completeSquareSteps(a, b, r2));
    steps.push({ text: `The centre is $${pt(a, b)}$ and the radius is $\\sqrt{${r2}} = ${Math.round(Math.sqrt(r2))}$.` });
    return steps;
  },
};

/** r^2 from the expanded form, typed; at difficulty 2 every term is multiplied by 2 or 3. */
const coordExpandedRadius: Generator<ExpandedParams> = {
  id: 'coord-expanded-radius',
  sample: (rng, difficulty) => sampleExpanded(rng, difficulty, false),
  render: ({ a, b, r2, k }): Slide => ({
    kind: 'expression',
    prompt: [say('Find $r^2$ for this circle.'), wrapped(expandedTex(a, b, r2, k))],
    lead: 'r^2 =',
    keypad: [],
    answer: String(r2),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ a, b, r2, k }) => {
    const f = a * a + b * b - r2;
    return intOptions(r2, [a * a + b * b + f, a * a + b * b - k * f, 4 * a * a + 4 * b * b - f, -f], 1);
  },
  solution: ({ a, b, r2, k }) => {
    const f = a * a + b * b - r2;
    const steps: SolutionStep[] = [];
    if (k > 1) {
      steps.push({ text: `Divide every term by $${k}$ first: $${expandedTex(a, b, r2)}$.` });
    }
    steps.push({ text: `Move the number across: $x^2 + y^2 ${signed(termOf(q(-2 * a)))} ${signed(termOf(q(-2 * b), 'y'))} = ${-f}$.` });
    steps.push(...completeSquareSteps(a, b, r2));
    return steps;
  },
};

type Where = 'inside' | 'on' | 'outside';

interface InsideParams extends OnCircleParams {
  expanded: boolean;
}

const COMPARE: Record<Where, string> = {
  inside: 'Less than $r^2$',
  on: 'Equal to $r^2$',
  outside: 'More than $r^2$',
};

function whereOf({ a, b, r2, px, py }: OnCircleParams): Where {
  const d2 = (px - a) ** 2 + (py - b) ** 2;
  return d2 < r2 ? 'inside' : d2 === r2 ? 'on' : 'outside';
}

/** Inside, on or outside: find the centre, then compare the squared distance with r^2. */
const coordInsideFlow: Generator<InsideParams> = {
  id: 'coord-inside-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleOnCircle(rng, 1);
      // A circle through its own centre's mirror would give a zero constant; fine,
      // but keep r^2 away from a^2 + b^2 so the expanded form keeps a number.
      if (difficulty > 1 && params.a ** 2 + params.b ** 2 === params.r2) continue;
      return { ...params, expanded: difficulty > 1 };
    }
  },
  render: (params): Slide => {
    const { a, b, r2, px, py, expanded } = params;
    const centres = [
      [a, b],
      [-a, -b],
      [a, -b],
      [-a, b],
    ].map(([x, y]) => `$${pt(x, y)}$`);
    return {
      kind: 'flow',
      prompt: [say(`Is $${named('P', px, py)}$ inside, on or outside this circle?`)],
      subject: expanded ? expandedTex(a, b, r2) : circleTex(a, b, r2),
      steps: [
        {
          id: 'centre',
          ask: 'Where is the centre?',
          branches: turned(centres, `${a}|${b}|${px}`).map((label) => ({ label, to: 'compare' })),
        },
        {
          id: 'compare',
          ask: 'Work out the squared distance from the centre to $P$. How does it compare with $r^2$?',
          branches: (['inside', 'on', 'outside'] as Where[]).map((w) => ({
            label: COMPARE[w],
            outcome: `So $P$ is ${w === 'on' ? 'on' : w} the circle.`,
          })),
        },
      ],
      answer: [centres[0], COMPARE[whereOf(params)]],
    };
  },
  solution: (params) => {
    const { a, b, r2, px, py, expanded } = params;
    const steps: SolutionStep[] = [];
    if (expanded) {
      steps.push({ text: `Complete the square to find the centre and $r^2$: $${circleTex(a, b, r2)}$.` });
    }
    steps.push({ text: `The centre is $${pt(a, b)}$ and $r^2 = ${r2}$. The squared distance from the centre to $P$:` });
    steps.push({ tex: squaredDistance(px, a, py, b) });
    const w = whereOf(params);
    steps.push({
      text: `${w === 'on' ? 'Equal to' : w === 'inside' ? 'Less than' : 'More than'} $${r2}$, so $P$ is ${w} the circle.`,
    });
    return steps;
  },
};

/* ================================================================
 * Level 2, lesson 5: tangents and chords
 * ================================================================ */

interface TangentParams {
  a: number;
  b: number;
  dx: number;
  dy: number;
}

/** The circle through P = C + (dx, dy), centred at C. */
function tangentCircleTex({ a, b, dx, dy }: TangentParams): string {
  return circleTex(a, b, dx * dx + dy * dy);
}

/**
 * P on a circle, never straight across or straight up from the centre, and
 * never on a diagonal, where the radius and tangent gradients are ±1 and
 * the slips collapse into the answer. Centred at the origin at difficulty 1.
 */
function sampleTangent(rng: Rng, difficulty: number): TangentParams {
  for (;;) {
    const [dx, dy] = sampleOffset(rng, 6);
    if (Math.abs(dx) === Math.abs(dy)) continue;
    const [a, b] = difficulty > 1 ? sampleCentre(rng, 1) : [0, 0];
    return { a, b, dx, dy };
  }
}

function tangentSolution({ a, b, dx, dy }: TangentParams): SolutionStep[] {
  const radius = q(dy, dx);
  return [
    { text: `The radius to $P$ goes from $${pt(a, b)}$ to $${pt(a + dx, b + dy)}$, so its gradient is $\\frac{${dy}}{${dx}}${qTex(radius) === `\\frac{${dy}}{${dx}}` ? '' : ` = ${qTex(radius)}`}$.` },
    { text: 'A tangent meets the radius at a right angle, so its gradient is $-1$ over the radius\'s:' },
    { tex: `m = ${qTex(perp(radius))}` },
  ];
}

/** The gradient of the tangent at P, typed. */
const coordTangentGradient: Generator<TangentParams> = {
  id: 'coord-tangent-gradient',
  sample: sampleTangent,
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      say(`$${named('P', p.a + p.dx, p.b + p.dy)}$ lies on the circle $${tangentCircleTex(p)}$. Find the gradient of the tangent at $P$.`),
    ],
    lead: 'm =',
    keypad: [],
    answer: qAns(q(-p.dx, p.dy)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ dx, dy }) => qOptions(q(-dx, dy), [q(dy, dx), q(-dy, dx), q(dx, dy)]),
  solution: tangentSolution,
};

/** The tangent at P as ax + by + c = 0: coefficients from the radius, the constant from P. */
function tangentGeneral({ a, b, dx, dy }: TangentParams): [number, number, number] {
  const px = a + dx;
  const py = b + dy;
  const k = -(dx * px + dy * py);
  const g = gcd(gcd(dx, dy), k) * (dx < 0 ? -1 : 1);
  return [dx / g, dy / g, k / g + 0];
}

/** The tangent at P in the form ax + by + c = 0, as three tiles. */
const coordTangentTiles: Generator<TangentParams> = {
  id: 'coord-tangent-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = sampleTangent(rng, difficulty);
      if (tangentGeneral(p)[2] === 0) continue;
      return p;
    }
  },
  render: (p): Slide => {
    const [A, B, K] = tangentGeneral(p);
    const answer = [termOf(q(A)), signed(termOf(q(B), 'y')), signedN(K)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `Find the tangent to the circle $${tangentCircleTex(p)}$ at $${named('P', p.a + p.dx, p.b + p.dy)}$, in the form $ax + by + c = 0$ with $a$ positive.`,
        ),
      ],
      template: '{0} {1} {2} = 0',
      bank: bank(
        answer,
        [signed(termOf(q(-B), 'y')), signedN(-K), termOf(q(Math.abs(B))), signed(termOf(q(A), 'y'))],
        [K],
        2,
      ),
      answer,
    };
  },
  solution: (p) => {
    const [A, B, K] = tangentGeneral(p);
    const px = p.a + p.dx;
    const py = p.b + p.dy;
    const m = q(-p.dx, p.dy);
    return [
      ...tangentSolution(p),
      { text: `Through $P$: $y - ${paren(py)} = ${qTex(m)}(x - ${paren(px)})$.` },
      { text: 'Clear the fraction and gather everything on one side, with the $x$ term positive:' },
      { tex: generalTex(A, B, K) },
    ];
  },
};

interface ChordParams {
  a: number;
  b: number;
  r: number;
  /** Half the chord. */
  h: number;
  /** The chord's distance from the centre. */
  d: number;
  ask: 'length' | 'distance';
}

/**
 * The perpendicular from the centre bisects a chord, so the radius, half the
 * chord and the distance from the centre are a right-angled triangle. The
 * three sides come from the triples table.
 */
const coordChord: Generator<ChordParams> = {
  id: 'coord-chord',
  sample: (rng, difficulty) => {
    const [h, d, r] = rng.pick(TRIPLES.filter((row) => row[2] <= (difficulty > 1 ? 30 : 17)));
    const [a, b] = rng.chance(0.3) ? [0, 0] : sampleCentre(rng, 1);
    return { a, b, r, h, d, ask: difficulty > 1 ? 'distance' : 'length' };
  },
  render: ({ a, b, r, h, d, ask }): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        ask === 'length'
          ? `The chord $AB$ of the circle $${circleTex(a, b, r * r)}$ is $${d}$ from the centre. How long is $AB$?`
          : `A chord of length $${2 * h}$ is drawn in the circle $${circleTex(a, b, r * r)}$. How far is it from the centre?`,
      ),
    ],
    lead: ask === 'length' ? 'AB =' : 'd =',
    keypad: [],
    answer: String(ask === 'length' ? 2 * h : d),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ r, h, d, ask }) =>
    ask === 'length' ? intOptions(2 * h, [h, 2 * (r - d), r + d, 2 * d], 1) : intOptions(d, [r - h, 2 * h - r, h, r - 2 * h], 1),
  solution: ({ r, h, d, ask }) => [
    { text: `The radius is $\\sqrt{${r * r}} = ${r}$. The line from the centre perpendicular to the chord cuts it in half.` },
    { text: 'So the radius, half the chord and the distance from the centre make a right-angled triangle, with the radius as hypotenuse:' },
    ask === 'length'
      ? { tex: chain(`\\left(\\tfrac{1}{2}AB\\right)^2 &= ${r}^2 - ${d}^2 = ${r * r - d * d}`, `\\tfrac{1}{2}AB &= ${h}`, `AB &= ${2 * h}`) }
      : { tex: chain(`d^2 &= ${r}^2 - ${h}^2 = ${r * r - h * h}`, `d &= ${d}`) },
  ],
};

interface TangentSliderParams extends TangentParams {
  axis: 'x' | 'y';
}

/** Where the tangent at P crosses the axis being asked about. */
function tangentIntercept({ a, b, dx, dy, axis }: TangentSliderParams): number {
  const px = a + dx;
  const py = b + dy;
  // dx(x - px) + dy(y - py) = 0, at y = 0 or at x = 0.
  return axis === 'x' ? px + (dy * py) / dx : py + (dx * px) / dy;
}

/** Radii whose lattice vectors fit a picture of ±10 with room for the centre to move. */
const TANGENT_VECTORS = [5, 10, 13, 17, 20, 25].flatMap(latticeVectors);

/**
 * The circle and its tangent at P drawn on squared paper; slide to where the
 * tangent crosses the x-axis, or the y-axis at difficulty 2. Draws are kept
 * where that crossing is whole and inside the picture.
 */
const coordTangentSlider: Generator<TangentSliderParams> = {
  id: 'coord-tangent-slider',
  sample: (rng, difficulty) => {
    const axis = difficulty > 1 ? 'y' : 'x';
    for (;;) {
      const [dx, dy] = rng.pick(TANGENT_VECTORS);
      const a = rng.int(-3, 3);
      const b = rng.int(-3, 3);
      const params = { a, b, dx, dy, axis } as TangentSliderParams;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(a) + r > 9.5 || Math.abs(b) + r > 9.5) continue;
      const cross = tangentIntercept(params);
      if (!Number.isInteger(cross) || Math.abs(cross) > 9) continue;
      // Crossing at P itself would make the question one of reading P.
      if ((axis === 'x' ? b + dy : a + dx) === 0) continue;
      return params;
    }
  },
  render: (p): Slide => {
    const px = p.a + p.dx;
    const py = p.b + p.dy;
    const r2 = p.dx * p.dx + p.dy * p.dy;
    const slope = -p.dx / p.dy;
    return {
      kind: 'slider',
      prompt: [
        say(
          `The circle $${circleTex(p.a, p.b, r2)}$ and its tangent at $${named('P', px, py)}$ are drawn. Work out where the tangent crosses the $${p.axis}$-axis, and slide there.`,
        ),
      ],
      min: -9,
      max: 9,
      step: 1,
      answer: tangentIntercept(p),
      readout: `${p.axis} = {v}`,
      figure: {
        svg: plotWithCircles(
          {
            xMin: -10,
            xMax: 10,
            yMin: -10,
            yMax: 10,
            curves: [{ f: (x) => py + slope * (x - px), accent: true }],
            marks: [
              { x: px, y: py },
              { x: p.a, y: p.b, hollow: true },
            ],
            label: 'A circle with a tangent line touching it at one marked point',
          },
          [{ h: p.a, k: p.b, r2 }],
        ),
        axis: p.axis,
        ...markerWindow(-10, 10, p.axis, SQUARE),
      },
    };
  },
  solution: (p) => {
    const px = p.a + p.dx;
    const py = p.b + p.dy;
    const m = q(-p.dx, p.dy);
    const cross = tangentIntercept(p);
    return [
      ...tangentSolution(p),
      { text: `Through $P$: $y - ${paren(py)} = ${qTex(m)}(x - ${paren(px)})$.` },
      p.axis === 'x'
        ? { text: `On the $x$-axis $y = 0$, which gives $x = ${cross}$.` }
        : { text: `On the $y$-axis $x = 0$, which gives $y = ${cross}$.` },
    ];
  },
};

/* ================================================================
 * Level 3: lines meeting circles
 *
 * Built from the meeting points outward, like everything above. A chord is
 * two lattice points of a circle centred at the origin with a whole
 * gradient between them, moved to a lattice centre, so the quadratic that
 * substituting gives factorises and `c` is whole. A tangent is a gradient
 * `m` and a whole `t` with `r^2 = (1 + m^2)t^2`, which makes the tangent
 * condition `k^2 = r^2(1 + m^2)` a perfect square. The tangents from an
 * outside point come from a table of every small case whose two gradients
 * are whole. Nothing is found by rounding a float.
 * ================================================================ */

/** Every lattice point on x^2 + y^2 = n, the ones on the axes included. */
function onCircle(n: number): [number, number][] {
  const out: [number, number][] = [];
  const top = Math.floor(Math.sqrt(n));
  for (let x = -top; x <= top; x += 1) {
    for (let y = -top; y <= top; y += 1) {
      if (x * x + y * y === n) out.push([x, y]);
    }
  }
  return out;
}

/** n x^2 as a learner writes it: x^2, -x^2, 3x^2. */
function sqTerm(n: number, letter = 'x'): string {
  if (n === 1) return `${letter}^2`;
  if (n === -1) return `-${letter}^2`;
  return `${n}${letter}^2`;
}

/** Ax^2 + Bx + C = 0, any zero term left out. */
function quadTex(A: number, B: number, C: number, letter = 'x'): string {
  return `${sumTex([sqTerm(A, letter), termOf(q(B), letter), String(C)])} = 0`;
}

/** "m = -7 or m = 1", the smaller first. */
function eitherTex(letter: string, u: number, v: number): string {
  const [lo, hi] = u < v ? [u, v] : [v, u];
  return `${letter} = ${lo} \\text{ or } ${letter} = ${hi}`;
}

/** m x + c evaluated at x, written out: 2 \times (-3) + 5. */
function lineAt(m: number, c: number, x: number): string {
  return `${m} \\times ${paren(x)}${c === 0 ? '' : ` ${signedN(c)}`}`;
}

/** (x - 3) as a factor, or x alone for a root at zero. */
function factor(root: number): string {
  return root === 0 ? 'x' : `(${lin('x', root)})`;
}

/**
 * A tiles bank of signed tokens (`+ 4`, `- 3x`): the answer, the slips, then
 * signed whole numbers near `around`. Topped up through `signedN` rather than
 * as bare numbers, so no spare can read as an answer tile spelled another way.
 */
function signedBank(answer: string[], slips: string[], around: number[], spare = 2): string[] {
  const bare = (token: string) => token.replace(/\s+/g, '');
  const needed = new Set(answer.map(bare));
  const extras: string[] = [];
  const offer = (token: string) => {
    if (extras.length >= 5) return;
    if (needed.has(bare(token)) || extras.some((extra) => bare(extra) === bare(token))) return;
    extras.push(token);
  };
  slips.forEach(offer);
  for (let gap = 1; extras.length < spare; gap += 1) {
    for (const v of around) {
      if (v + gap !== 0) offer(signedN(v + gap));
      if (v - gap !== 0) offer(signedN(v - gap));
    }
  }
  return [...answer, ...extras].sort();
}

/** A circle centred at (a, b) fits a ±10 picture with half a unit to spare. */
function fits(a: number, b: number, r2: number): boolean {
  const room = (v: number) => 9.5 - Math.abs(v);
  return r2 <= room(a) ** 2 && r2 <= room(b) ** 2;
}

/** The circle on squared paper, its centre marked hollow, for a question to point at. */
function circleFigure(a: number, b: number, r2: number, curves: Curve[], marks: { x: number; y: number; hollow?: boolean }[], label: string): string {
  return plotWithCircles(
    { xMin: -10, xMax: 10, yMin: -10, yMax: 10, curves, marks: [...marks, { x: a, y: b, hollow: true }], label },
    [{ h: a, k: b, r2 }],
  );
}

/**
 * The squared distance from (a, b) to (px, py), one change a line, since
 * the level 2 layout runs off a phone once both coordinates are negative.
 */
function narrowDistance(name: string, px: number, a: number, py: number, b: number): string {
  const dx = px - a;
  const dy = py - b;
  return chain(
    `\\Delta x &= ${px} - ${paren(a)} = ${dx}`,
    `\\Delta y &= ${py} - ${paren(b)} = ${dy}`,
    `${name}^2 &= ${paren(dx)}^2 + ${paren(dy)}^2`,
    `&= ${dx * dx} + ${dy * dy} = ${dx * dx + dy * dy}`,
  );
}

/** The smallest whole number whose square is more than n. */
function rootAbove(n: number): number {
  let top = 0;
  while (top * top <= n) top += 1;
  return top;
}

interface Chord {
  r2: number;
  /** The two lattice points, measured from the centre, the left one first. */
  v1: [number, number];
  v2: [number, number];
  m: number;
  /** How far the line is above the centre, straight up from it. */
  k: number;
}

/** Radii squared whose circles carry lattice points off the axes, small enough to draw. */
const CHORD_RADII = [5, 10, 13, 17, 20, 25, 26, 29];

/** Every chord between two lattice points of those circles with a whole, non-zero gradient up to 3. */
const CHORDS: Chord[] = CHORD_RADII.flatMap((r2) => {
  const points = onCircle(r2);
  return points.flatMap((v1) =>
    points.flatMap((v2): Chord[] => {
      const run = v2[0] - v1[0];
      const rise = v2[1] - v1[1];
      if (run <= 0 || rise % run !== 0) return [];
      const m = rise / run;
      if (m === 0 || Math.abs(m) > 3) return [];
      return [{ r2, v1, v2, m, k: v1[1] - m * v1[0] }];
    }),
  );
});

interface CutParams {
  a: number;
  b: number;
  r2: number;
  m: number;
  c: number;
  /** The meeting points, the left one first. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function placeChord({ r2, v1, v2, m, k }: Chord, a: number, b: number): CutParams {
  return { a, b, r2, m, c: b - m * a + k + 0, x1: a + v1[0], y1: b + v1[1], x2: a + v2[0], y2: b + v2[1] };
}

/**
 * A line meeting a circle at two lattice points: centred at the origin with
 * gradients up to 2 at difficulty 1, moved to a centre up to 4 away with
 * gradients up to 3 at difficulty 2.
 */
function sampleCut(rng: Rng, difficulty: number, keep: (p: CutParams) => boolean = () => true): CutParams {
  const pool = difficulty > 1 ? CHORDS : CHORDS.filter((chord) => chord.r2 <= 25 && Math.abs(chord.m) <= 2);
  for (;;) {
    const [a, b] = difficulty > 1 ? [rng.int(-4, 4), rng.int(-4, 4)] : [0, 0];
    const p = placeChord(rng.pick(pool), a, b);
    if (Math.abs(p.c) > 15 || !keep(p)) continue;
    return p;
  }
}

/**
 * Ax^2 + Bx + C = 0 from putting y = mx + c into (x - a)^2 + (y - b)^2 = r^2,
 * before dividing through.
 */
function substituted({ a, b, r2, m, c }: { a: number; b: number; r2: number; m: number; c: number }): [number, number, number] {
  const k = c - b;
  return [1 + m * m, 2 * m * k - 2 * a, a * a + k * k - r2];
}

const meetLine = (p: { m: number; c: number }) => lineTex(q(p.m), q(p.c));
const meetCircle = (p: { a: number; b: number; r2: number }) => circleTex(p.a, p.b, p.r2);

/** The quadratic once divided through: its roots are the meeting points' x. */
function monicTex({ x1, x2 }: CutParams): string {
  return quadTex(1, -(x1 + x2), x1 * x2);
}

function substituteSolution(p: CutParams): SolutionStep[] {
  const [A, B, C] = substituted(p);
  return [
    { text: `Put $${rhsTex(q(p.m), q(p.c))}$ in place of $y$ in the circle, multiply out and collect everything on one side:` },
    { tex: quadTex(A, B, C) },
    { text: `Divide through by $${A}$:` },
    { tex: monicTex(p) },
  ];
}

function rootsSolution(p: CutParams): SolutionStep[] {
  return [
    { text: `It factorises as $${factor(p.x1)}${factor(p.x2)} = 0$, so $x = ${p.x1}$ or $x = ${p.x2}$.` },
  ];
}

/* ---------- lesson 1: where a line meets a circle ---------- */

/**
 * The line put into the circle and tidied into a quadratic: each bracket
 * multiplied out, everything collected on one side, then divided through. At
 * the origin (difficulty 1) the x bracket is already x^2, so there are three
 * steps rather than four.
 */
const coordSubstituteSteps: Generator<CutParams> = {
  id: 'coord-substitute-steps',
  sample: (rng, difficulty) => sampleCut(rng, difficulty, (p) => p.c !== p.b && (difficulty === 1 || p.a !== 0)),
  render: (p): Slide => {
    const { a, m, r2, x1, x2 } = p;
    const k = p.c - p.b;
    const [A, B, C] = substituted(p);
    const yBracket = sumTex([termOf(q(m)), String(k)]);
    const xPart = sumTex(['x^2', termOf(q(-2 * a)), String(a * a)]);
    const yPart = sumTex([sqTerm(m * m), termOf(q(2 * m * k)), String(k * k)]);
    const collected = quadTex(A, B, C);
    const monic = monicTex(p);
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [];
    if (a !== 0) {
      reductions.push({
        span: [0, 1],
        value: xPart,
        bank: stepBank(
          xPart,
          sumTex(['x^2', termOf(q(2 * a)), String(a * a)]),
          sumTex(['x^2', String(a * a)]),
          sumTex(['x^2', termOf(q(-a)), String(a * a)]),
        ),
      });
    }
    reductions.push(
      {
        span: [2, 3],
        value: yPart,
        bank: stepBank(
          yPart,
          sumTex([sqTerm(m * m), String(k * k)]),
          sumTex([sqTerm(m * m), termOf(q(-2 * m * k)), String(k * k)]),
          sumTex([sqTerm(m * m), termOf(q(m * k)), String(k * k)]),
        ),
      },
      {
        span: [0, 5],
        value: collected,
        bank: stepBank(collected, quadTex(A, B, C + r2), quadTex(A, B, C + 2 * r2), quadTex(A, -B, C)),
      },
      {
        span: [0, 1],
        value: monic,
        bank: stepBank(monic, quadTex(1, x1 + x2, x1 * x2), quadTex(1, -(x1 + x2), -x1 * x2), quadTex(1, B, C)),
      },
    );
    return {
      kind: 'steps',
      prompt: [
        say(
          `The line $${meetLine(p)}$ meets the circle $${meetCircle(p)}$. Putting $${rhsTex(q(m), q(p.c))}$ in place of $y$ gives the equation below. Tidy it into a quadratic in $x$ and divide through by the number in front of $x^2$: tap the part you would do **next**, then choose what it becomes.`,
        ),
      ],
      start: [a === 0 ? 'x^2' : `(${lin('x', a)})^2`, '+', `(${yBracket})^2`, '=', String(r2)],
      reductions,
    };
  },
  solution: (p) => {
    const { a, m } = p;
    const k = p.c - p.b;
    const [A, B, C] = substituted(p);
    const yBracket = sumTex([termOf(q(m)), String(k)]);
    const expanded = [
      ...(a === 0 ? [] : [`&(${lin('x', a)})^2`, `=\\;&${sumTex(['x^2', termOf(q(-2 * a)), String(a * a)])}`]),
      `&(${yBracket})^2`,
      `=\\;&${sumTex([sqTerm(m * m), termOf(q(2 * m * k)), String(k * k)])}`,
    ];
    return [
      { text: 'Multiply out each bracket:' },
      { tex: chain(...expanded) },
      { text: `Add them, and take $${p.r2}$ away to leave $0$ on the right:` },
      { tex: quadTex(A, B, C) },
      { text: `Divide through by $${A}$:` },
      { tex: monicTex(p) },
      { text: `Its roots, $x = ${p.x1}$ and $x = ${p.x2}$, are where the line meets the circle.` },
    ];
  },
};

/** The divided-through quadratic as two tiles: its x coefficient and its number. */
const coordMeetQuadraticTiles: Generator<CutParams> = {
  id: 'coord-meet-quadratic-tiles',
  sample: (rng, difficulty) => sampleCut(rng, difficulty, (p) => p.x1 + p.x2 !== 0 && p.x1 * p.x2 !== 0),
  render: (p): Slide => {
    const s = p.x1 + p.x2;
    const product = p.x1 * p.x2;
    const [A] = substituted(p);
    const answer = [signed(termOf(q(-s))), signedN(product)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `Put $${meetLine(p)}$ into the circle $${meetCircle(p)}$, collect the terms, and divide through by the number in front of $x^2$. Complete the quadratic in $x$.`,
        ),
      ],
      template: 'x^2 {0} {1} = 0',
      bank: signedBank(
        answer,
        [signed(termOf(q(s))), signed(termOf(q(-A * s))), signedN(-product), signedN(A * product)],
        [product],
      ),
      answer,
    };
  },
  solution: (p) => [...substituteSolution(p), ...rootsSolution(p)],
};

/** From the quadratic's roots to the meeting points: each root, then its y from the line. */
const coordRootPointTree: Generator<CutParams> = {
  id: 'coord-root-point-tree',
  sample: (rng, difficulty) => sampleCut(rng, difficulty),
  render: (p): Slide => {
    const answer = [p.x1, p.x2, p.y1, p.y2].map(String);
    return {
      kind: 'tree',
      prompt: [
        say(
          `The line $${meetLine(p)}$ meets the circle $${meetCircle(p)}$ where the quadratic below is zero. Top row: its two roots, the smaller first. Underneath each: the $y$-coordinate the line gives it.`,
        ),
      ],
      expression: monicTex(p),
      nodes: [
        { id: 'x1', from: [] },
        { id: 'x2', from: [] },
        { id: 'y1', from: ['x1'] },
        { id: 'y2', from: ['x2'] },
      ],
      bank: bank(
        answer,
        [
          String(-p.x1),
          String(-p.x2),
          String(p.m * p.x1 - p.c),
          String(p.m * p.x2 - p.c),
          String(p.x1 + p.c),
          String(p.x2 + p.c),
        ],
        [p.y1, p.y2],
      ),
      answer,
    };
  },
  solution: (p) => [
    ...rootsSolution(p),
    { text: 'Put each root into the line, not the circle, for its $y$.' },
    { text: `$x = ${p.x1}$ gives $y = ${lineAt(p.m, p.c, p.x1)} = ${p.y1}$.` },
    { text: `$x = ${p.x2}$ gives $y = ${lineAt(p.m, p.c, p.x2)} = ${p.y2}$.` },
    { text: `The line meets the circle at $${pt(p.x1, p.y1)}$ and $${pt(p.x2, p.y2)}$.` },
  ],
};

interface MeetXParams extends CutParams {
  /** Difficulty 1 names one meeting point and asks the other's x; difficulty 2 asks the larger or smaller x. */
  ask: 'other-of-left' | 'other-of-right' | 'larger' | 'smaller';
}

const meetXAnswer = (p: MeetXParams) => (p.ask === 'other-of-left' || p.ask === 'larger' ? p.x2 : p.x1);

/** One meeting point's x-coordinate, typed. */
const coordMeetCircleX: Generator<MeetXParams> = {
  id: 'coord-meet-circle-x',
  sample: (rng, difficulty) => ({
    ...sampleCut(rng, difficulty),
    ask: difficulty > 1 ? rng.pick(['larger', 'smaller'] as const) : rng.pick(['other-of-left', 'other-of-right'] as const),
  }),
  render: (p): Slide => {
    const given = p.ask === 'other-of-left' ? named('A', p.x1, p.y1) : named('A', p.x2, p.y2);
    return {
      kind: 'expression',
      prompt: [
        say(
          p.ask === 'larger' || p.ask === 'smaller'
            ? `The line $${meetLine(p)}$ meets the circle $${meetCircle(p)}$ at two points. Find the ${p.ask} of their $x$-coordinates.`
            : `The line $${meetLine(p)}$ meets the circle $${meetCircle(p)}$ at $${given}$ and at a second point $B$. Find the $x$-coordinate of $B$.`,
        ),
      ],
      lead: 'x =',
      keypad: [],
      answer: String(meetXAnswer(p)),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const x = meetXAnswer(p);
    const other = x === p.x2 ? p.x1 : p.x2;
    const y = x === p.x2 ? p.y2 : p.y1;
    return intOptions(x, [other, -x, y, -other]);
  },
  solution: (p) => {
    const x = meetXAnswer(p);
    return [
      ...substituteSolution(p),
      ...rootsSolution(p),
      {
        text:
          p.ask === 'larger' || p.ask === 'smaller'
            ? `The ${p.ask} is $x = ${x}$.`
            : `One root is $A$'s, so the other, $x = ${x}$, is $B$'s.`,
      },
    ];
  },
};

/* ---------- lesson 2: cuts, touches or misses ---------- */

type Crossing = 'two' | 'one' | 'none';

interface CrossParams {
  a: number;
  b: number;
  r2: number;
  m: number;
  c: number;
  kind: Crossing;
}

/** A tangent: gradient m and a whole t, with r^2 = (1 + m^2)t^2 and k = ±(1 + m^2)t. */
interface Touch {
  m: number;
  t: number;
}

/** Every gradient ±m with t running 1 to the top given beside it. */
function touches(spec: [number, number][]): Touch[] {
  return spec.flatMap(([m, top]) => [m, -m].flatMap((g) => Array.from({ length: top }, (_, idx) => ({ m: g, t: idx + 1 }))));
}

/** Twenty-six tangent cases for a circle at the origin, enough for the distinct-question floor on their own. */
const TOUCH_EASY = touches([
  [1, 6],
  [2, 4],
  [3, 2],
  [4, 1],
]);
/** Radii that still fit a ±10 picture with the centre moved. */
const TOUCH_SMALL = touches([
  [1, 3],
  [2, 2],
  [3, 1],
]);
const TOUCH_MOVED = touches([
  [1, 4],
  [2, 3],
  [3, 2],
]);

const touchR2 = ({ m, t }: Touch) => (1 + m * m) * t * t;
/** |k| for a tangent: the square root of r^2(1 + m^2). */
const touchK = ({ m, t }: Touch) => (1 + m * m) * t;

/** A line that cuts, touches or misses, a third of the time each. At the origin at difficulty 1. */
function sampleCrossing(rng: Rng, difficulty: number): CrossParams {
  for (;;) {
    const p = drawCrossing(rng, difficulty);
    // Keep c small enough that the quadratic's numbers stay workable by hand.
    if (Math.abs(p.c) <= 12) return p;
  }
}

function drawCrossing(rng: Rng, difficulty: number): CrossParams {
  const kind = rng.pick(['two', 'one', 'none'] as const);
  const [a, b] = difficulty > 1 ? [rng.int(-4, 4), rng.int(-4, 4)] : [0, 0];
  if (kind === 'one') {
    const touch = rng.pick(TOUCH_SMALL);
    const k = touchK(touch) * rng.sign();
    return { a, b, r2: touchR2(touch), m: touch.m, c: b - touch.m * a + k, kind };
  }
  const m = nz(rng, difficulty > 1 ? 3 : 2);
  const r2 = rng.int(2, 20);
  const limit = (1 + m * m) * r2;
  const top = rootAbove(limit);
  for (;;) {
    const k = rng.int(-top - 3, top + 3);
    if (kind === 'two' ? k * k >= limit : k * k <= limit) continue;
    return { a, b, r2, m, c: b - m * a + k, kind };
  }
}

const CROSSING_SIGN: Record<Crossing, string> = { two: 'Positive', one: 'Zero', none: 'Negative' };

const CROSSING_OUTCOME: Record<Crossing, string> = {
  two: 'Two roots, so the line cuts the circle at two points.',
  one: 'One repeated root, so the line touches the circle: it is a tangent.',
  none: 'No real roots, so the line misses the circle.',
};

function discriminantOf(p: CrossParams): number {
  const [A, B, C] = substituted(p);
  return B * B - 4 * A * C;
}

function crossingSolution(p: CrossParams): SolutionStep[] {
  const [A, B, C] = substituted(p);
  const D = discriminantOf(p);
  const kind: Crossing = D > 0 ? 'two' : D === 0 ? 'one' : 'none';
  return [
    { text: `Put $${rhsTex(q(p.m), q(p.c))}$ in place of $y$, multiply out and collect everything on one side:` },
    { tex: quadTex(A, B, C) },
    {
      tex: `\\begin{gathered} b^2 = ${paren(B)}^2 = ${B * B} \\\\ 4ac = 4 \\times ${A} \\times ${paren(C)} = ${4 * A * C} \\end{gathered}`,
    },
    { text: `So $b^2 - 4ac = ${B * B} ${signedN(-4 * A * C)} = ${D}$.` },
    { text: `${CROSSING_SIGN[kind]}: ${CROSSING_OUTCOME[kind].charAt(0).toLowerCase()}${CROSSING_OUTCOME[kind].slice(1)}` },
  ];
}

/** Cut, touch or miss: pick the quadratic substituting gives, then the sign of its discriminant. */
const coordMeetCountFlow: Generator<CrossParams> = {
  id: 'coord-meet-count-flow',
  sample: sampleCrossing,
  render: (p): Slide => {
    const [A, B, C] = substituted(p);
    const right = `$${quadTex(A, B, C)}$`;
    const labels = [...new Set([right, ...[quadTex(A, B, C + p.r2), quadTex(A, -B, C), quadTex(A - 1, B, C)].map((tex) => `$${tex}$`)])];
    return {
      kind: 'flow',
      prompt: [say('Does the line cut, touch or miss the circle? Each answer decides what is asked next.')],
      subject: `\\begin{gathered} ${meetCircle(p)} \\\\ ${meetLine(p)} \\end{gathered}`,
      steps: [
        {
          id: 'quad',
          ask: 'Put the line into the circle and collect the terms. Which quadratic in $x$ do you get?',
          branches: turned(labels, labels.join('|')).map((label) => ({ label, to: 'sign' })),
        },
        {
          id: 'sign',
          ask: 'Work out its discriminant, $b^2 - 4ac$. What sign is it?',
          branches: (['two', 'one', 'none'] as Crossing[]).map((w) => ({ label: CROSSING_SIGN[w], outcome: CROSSING_OUTCOME[w] })),
        },
      ],
      answer: [right, CROSSING_SIGN[p.kind]],
    };
  },
  solution: crossingSolution,
};

interface DiscriminantParams extends CrossParams {
  /** The quadratic is shown at difficulty 1; at difficulty 2 the learner forms it. */
  shown: boolean;
}

/** The discriminant of the quadratic from substituting, typed. */
const coordMeetDiscriminant: Generator<DiscriminantParams> = {
  id: 'coord-meet-discriminant',
  sample: (rng, difficulty) => ({ ...sampleCrossing(rng, difficulty), shown: difficulty === 1 }),
  render: (p): Slide => {
    const [A, B, C] = substituted(p);
    return {
      kind: 'expression',
      prompt: p.shown
        ? [say(`Putting $${meetLine(p)}$ into $${meetCircle(p)}$ and collecting the terms gives the quadratic below. Find its discriminant.`), show(quadTex(A, B, C))]
        : [
            say(
              `Put $${meetLine(p)}$ into $${meetCircle(p)}$ and collect the terms into a quadratic in $x$, without dividing through, so that it starts $${sqTerm(A)}$. Find its discriminant.`,
            ),
          ],
      lead: 'b^2 - 4ac =',
      keypad: [],
      answer: String(discriminantOf(p)),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const [A, B, C] = substituted(p);
    const D = discriminantOf(p);
    return intOptions(D, [B * B + 4 * A * C, B * B - 4 * A * (C + p.r2), -D, B * B - 2 * A * C]);
  },
  solution: crossingSolution,
};

interface WhichLineParams {
  a: number;
  b: number;
  r2: number;
  m: number;
  /** How far each line is above the centre, straight up from it; the first is the answer. */
  ks: number[];
  ask: 'touches' | 'misses';
}

/**
 * Four parallel lines and a circle: which one touches it (difficulty 1) or
 * misses it (difficulty 2)? The tangent condition settles it without
 * solving anything.
 */
const coordWhichLine: Generator<WhichLineParams> = {
  id: 'coord-which-line',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1) {
        const m = nz(rng, 3);
        const r2 = rng.int(5, 20);
        const [a, b] = [rng.int(-3, 3), rng.int(-3, 3)];
        if (!fits(a, b, r2)) continue;
        const limit = (1 + m * m) * r2;
        const top = rootAbove(limit);
        const miss = rng.sign() * (top + rng.int(0, 2));
        const cuts = Array.from({ length: 2 * top - 1 }, (_, idx) => idx - top + 1);
        return { a, b, r2, m, ks: [miss, ...rng.sample(cuts, 3)], ask: 'misses' };
      }
      const touch = rng.pick(TOUCH_SMALL);
      const r2 = touchR2(touch);
      const [a, b] = [rng.int(-2, 2), rng.int(-2, 2)];
      if (!fits(a, b, r2)) continue;
      const K = touchK(touch) * rng.sign();
      const near = [K - 1, K + 1, K - 2, K + 2, -K + 1, -K - 1].filter((k) => k * k !== K * K);
      return { a, b, r2, m: touch.m, ks: [K, ...rng.sample(near, 3)], ask: 'touches' };
    }
  },
  render: ({ a, b, r2, m, ks, ask }): Slide =>
    choiceSlide(
      [
        say(`Which of these lines ${ask} the circle $${circleTex(a, b, r2)}$?`),
        { kind: 'diagram', svg: circleFigure(a, b, r2, [], [], 'The circle drawn on squared paper with its centre marked') },
      ],
      ks.map((k, idx) => ({ tex: lineTex(q(m), q(b - m * a + k)), correct: idx === 0 })),
    ),
  solution: ({ a, b, r2, m, ks, ask }) => {
    const limit = (1 + m * m) * r2;
    const shifted = a !== 0 || b !== 0;
    return [
      {
        text: shifted
          ? `Every line here has gradient $${m}$. Measure each from the centre: $k = ma + c - b$ is how far it is above $${pt(a, b)}$. A line touches when $k^2 = r^2(1 + m^2)$, cuts when $k^2$ is less and misses when it is more.`
          : `Every line here has gradient $${m}$. A line touches when $c^2 = r^2(1 + m^2)$, cuts when $c^2$ is less and misses when it is more.`,
      },
      { tex: `r^2(1 + m^2) = ${r2} \\times ${1 + m * m} = ${limit}` },
      {
        tex: chain(
          ...[...ks].sort((u, v) => u - v).map((k) => `${lineTex(q(m), q(b - m * a + k))}: \\quad ${shifted ? 'k' : 'c'}^2 &= ${k * k}`),
        ),
      },
      { text: `Only $${lineTex(q(m), q(b - m * a + ks[0]))}$ has ${ask === 'touches' ? `exactly $${limit}$` : `more than $${limit}$`}, so it ${ask} the circle.` },
    ];
  },
};

interface TouchPointParams {
  a: number;
  b: number;
  /** From the centre to the point of contact. */
  vx: number;
  vy: number;
  axis: 'x' | 'y';
}

/** Radius vectors whose tangent has a whole gradient up to 4, short enough to draw. */
const TOUCH_VECTORS: [number, number][] = [];
for (let vx = -6; vx <= 6; vx += 1) {
  for (let vy = -6; vy <= 6; vy += 1) {
    if (vx === 0 || vy === 0 || vx % vy !== 0 || Math.abs(vx / vy) > 4 || vx * vx + vy * vy > 45) continue;
    TOUCH_VECTORS.push([vx, vy]);
  }
}

function touchPointLine({ a, b, vx, vy }: TouchPointParams): { m: number; c: number; tx: number; ty: number } {
  const m = -vx / vy;
  const tx = a + vx;
  const ty = b + vy;
  return { m, c: ty - m * tx + 0, tx, ty };
}

/**
 * A tangent drawn against its circle: slide to where it touches, the
 * repeated root of the quadratic, or at difficulty 2 to that point's height.
 */
const coordTouchPointSlider: Generator<TouchPointParams> = {
  id: 'coord-touch-point-slider',
  sample: (rng, difficulty) => {
    const spread = difficulty > 1 ? 5 : 3;
    for (;;) {
      const [vx, vy] = rng.pick(TOUCH_VECTORS);
      const a = rng.int(-spread, spread);
      const b = rng.int(-spread, spread);
      if (!fits(a, b, vx * vx + vy * vy) || Math.abs(a + vx) > 9 || Math.abs(b + vy) > 9) continue;
      return { a, b, vx, vy, axis: difficulty > 1 ? 'y' : 'x' };
    }
  },
  render: (p): Slide => {
    const { m, c, tx, ty } = touchPointLine(p);
    const r2 = p.vx * p.vx + p.vy * p.vy;
    return {
      kind: 'slider',
      prompt: [
        say(
          `The line $${lineTex(q(m), q(c))}$ touches the circle $${circleTex(p.a, p.b, r2)}$. Put the line into the circle: the quadratic has one repeated root, the $x$-coordinate where they touch. Slide to ${p.axis === 'x' ? 'that $x$' : 'the height of the point where they touch'}.`,
        ),
      ],
      min: -9,
      max: 9,
      step: 1,
      answer: p.axis === 'x' ? tx : ty,
      readout: `${p.axis} = {v}`,
      figure: {
        svg: circleFigure(p.a, p.b, r2, [{ f: (x) => m * x + c, accent: true }], [], 'A circle and a straight line touching it'),
        axis: p.axis,
        ...markerWindow(-10, 10, p.axis, SQUARE),
      },
    };
  },
  solution: (p) => {
    const { m, c, tx, ty } = touchPointLine(p);
    const [A, B, C] = substituted({ a: p.a, b: p.b, r2: p.vx * p.vx + p.vy * p.vy, m, c });
    return [
      { text: `Put $${rhsTex(q(m), q(c))}$ in place of $y$ and collect everything on one side:` },
      { tex: quadTex(A, B, C) },
      { text: 'Its discriminant is zero, so its one root is where the two halves of the formula meet:' },
      { tex: `x = -\\frac{b}{2a} = -\\frac{${B}}{${2 * A}} = ${tx}` },
      { text: `The line gives $y = ${lineAt(m, c, tx)} = ${ty}$, so they touch at $${pt(tx, ty)}$.` },
    ];
  },
};

/* ---------- lesson 3: the tangent condition ---------- */

interface TouchParams extends Touch {
  a: number;
  b: number;
  /** Which of the two tangents: +1 the upper, -1 the lower. */
  s: number;
}

/** A tangent case at the origin (difficulty 1) or about a centre off it (difficulty 2). */
function sampleTouch(rng: Rng, difficulty: number, keep: (p: TouchParams) => boolean = () => true): TouchParams {
  for (;;) {
    const touch = rng.pick(difficulty > 1 ? TOUCH_MOVED : TOUCH_EASY);
    const [a, b] = difficulty > 1 ? [rng.int(-4, 4), rng.int(-4, 4)] : [0, 0];
    const p = { ...touch, a, b, s: rng.sign() };
    // Off the origin, the centre must move the lines, or the question is a difficulty 1 one.
    if (difficulty > 1 && b - touch.m * a === 0) continue;
    if (!keep(p)) continue;
    return p;
  }
}

/** Where the line crosses the vertical through the centre, less the centre's own height: b - ma. */
const offsetOf = ({ a, b, m }: TouchParams) => b - m * a;
const touchC = (p: TouchParams) => offsetOf(p) + p.s * touchK(p);

function touchConditionSolution(p: TouchParams): SolutionStep[] {
  const K = touchK(p);
  const r2 = touchR2(p);
  const A = 1 + p.m * p.m;
  if (offsetOf(p) === 0 && p.a === 0 && p.b === 0) {
    return [
      { text: 'Put $y = mx + c$ into the circle: the quadratic touches when its discriminant is zero, which leaves the tangent condition.' },
      { tex: chain(`c^2 &= r^2(1 + m^2)`, `&= ${r2} \\times ${A} = ${K * K}`) },
      { text: `So $c = ${K}$ or $c = -${K}$.` },
    ];
  }
  return [
    { text: `Measure from the centre $${pt(p.a, p.b)}$: the line is $k = ma + c - b$ above it, and it touches when $k^2 = r^2(1 + m^2)$.` },
    { tex: chain(`k^2 &= ${r2} \\times ${A} = ${K * K}`, `k &= \\pm ${K}`) },
    { text: `Then $c = k + b - ma = ${offsetOf(p)} \\pm ${K}$, which is $${offsetOf(p) - K}$ or $${offsetOf(p) + K}$.` },
  ];
}

/** One value of c for which y = mx + c is a tangent, typed. */
const coordTouchC: Generator<TouchParams> = {
  id: 'coord-touch-c',
  sample: (rng, difficulty) => sampleTouch(rng, difficulty),
  render: (p): Slide => {
    const origin = p.a === 0 && p.b === 0;
    const which = origin ? (p.s > 0 ? 'positive' : 'negative') : p.s > 0 ? 'larger' : 'smaller';
    return {
      kind: 'expression',
      prompt: [
        say(
          `The line $y = ${termOf(q(p.m))} + c$ touches the circle $${circleTex(p.a, p.b, touchR2(p))}$. Find the ${which} value of $c$.`,
        ),
      ],
      lead: 'c =',
      keypad: [],
      answer: String(touchC(p)),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const c = touchC(p);
    const K = touchK(p);
    return intOptions(c, [p.s * K, offsetOf(p) - p.s * K, p.s * touchR2(p), p.s * p.t, p.b + p.m * p.a + p.s * K]);
  },
  solution: (p) => [
    ...touchConditionSolution(p),
    { text: `The ${p.a === 0 && p.b === 0 ? (p.s > 0 ? 'positive' : 'negative') : p.s > 0 ? 'larger' : 'smaller'} value is $c = ${touchC(p)}$.` },
  ],
};

/** Both tangents with a given gradient, as two tiles in either order. */
const coordTouchLinesTiles: Generator<TouchParams> = {
  id: 'coord-touch-lines-tiles',
  sample: (rng, difficulty) =>
    sampleTouch(rng, difficulty, (p) => Math.abs(offsetOf(p)) !== touchK(p)),
  render: (p): Slide => {
    const K = touchK(p);
    const off = offsetOf(p);
    const answer = [signedN(off - K), signedN(off + K)];
    const slips =
      off === 0
        ? [touchR2(p), -touchR2(p), p.t, -p.t]
        : [K, -K, p.b + p.m * p.a + K, p.b + p.m * p.a - K];
    const mx = termOf(q(p.m));
    return {
      kind: 'tiles',
      prompt: [
        say(`Find both tangents to the circle $${circleTex(p.a, p.b, touchR2(p))}$ that have gradient $${p.m}$.`),
      ],
      template: `y = ${mx} {0}\\ \\text{or}\\ y = ${mx} {1}`,
      bank: signedBank(answer, slips.filter((v) => v !== 0).map(signedN), [off + K]),
      answer,
      unordered: true,
    };
  },
  solution: (p) => {
    const K = touchK(p);
    const off = offsetOf(p);
    return [
      ...touchConditionSolution(p),
      { tex: `\\begin{gathered} ${lineTex(q(p.m), q(off - K))} \\\\ ${lineTex(q(p.m), q(off + K))} \\end{gathered}` },
    ];
  },
};

interface ConditionParams extends Touch {
  /** The centre is (0, b): at the origin at difficulty 1. */
  b: number;
}

/**
 * From "the discriminant is zero" to the two values of c: square, multiply
 * out, collect (the c^2 terms always leave -4 of them), then root.
 */
const coordTouchConditionSteps: Generator<ConditionParams> = {
  id: 'coord-touch-condition-steps',
  sample: (rng, difficulty) => (difficulty > 1 ? { ...rng.pick(TOUCH_MOVED), b: nz(rng, 5) } : { ...rng.pick(TOUCH_EASY), b: 0 }),
  render: (p): Slide => {
    const { b, m } = p;
    const A = 1 + m * m;
    const r2 = touchR2(p);
    const K = touchK(p);
    const U = b === 0 ? 'c' : `(c ${signedN(-b)})`;
    const first = `${4 * m * m}${U}^2`;
    // Bracketed: it is taken away whole, and without the bracket the line would read as minus its last term.
    const second = `(${4 * A}${U}^2 - ${4 * A * r2})`;
    const squared = `${U}^2 = ${K * K}`;
    const solved = b === 0 ? `c = \\pm ${K}` : `c = ${b} \\pm ${K}`;
    return {
      kind: 'steps',
      prompt: [
        say(
          `The line $y = ${termOf(q(m))} + c$ touches the circle $${circleTex(0, b, r2)}$ when the quadratic that substituting gives has discriminant zero, which is the equation below. Solve it for $c$: tap the part you would do **next**, then choose what it becomes.`,
        ),
      ],
      start: [`(${2 * m}${U})^2`, '-', `${4 * A}(${U}^2 - ${r2})`, '=', '0'],
      reductions: [
        { span: [0, 1], value: first, bank: stepBank(first, `${2 * m * m}${U}^2`, `${4 * Math.abs(m)}${U}^2`, `${-4 * m * m}${U}^2`) },
        {
          span: [2, 3],
          value: second,
          bank: stepBank(second, `(${4 * A}${U}^2 - ${r2})`, `(${4 * A}${U}^2 + ${4 * A * r2})`, `(${4 * A}${U}^2 - ${4 * r2})`),
        },
        { span: [0, 5], value: squared, bank: stepBank(squared, `${U}^2 = ${-K * K}`, `${U}^2 = ${4 * K * K}`, `${U}^2 = ${r2}`) },
        {
          span: [0, 1],
          value: solved,
          bank:
            b === 0
              ? stepBank(solved, `c = ${K}`, `c = \\pm ${K * K}`, `c = \\pm ${r2}`)
              : stepBank(solved, `c = ${-b} \\pm ${K}`, `c = ${b} \\pm ${K * K}`, `c = \\pm ${K}`),
        },
      ],
    };
  },
  solution: (p) => {
    const { b, m } = p;
    const A = 1 + m * m;
    const r2 = touchR2(p);
    const K = touchK(p);
    const U = b === 0 ? 'c' : `(c ${signedN(-b)})`;
    return [
      { text: 'Square the first bracket and multiply out the second:' },
      { tex: chain(`&${4 * m * m}${U}^2 - ${4 * A}${U}^2`, `&\\quad + ${4 * A * r2} = 0`) },
      { text: `The $${U}^2$ terms leave $-4${U}^2$, as they always do. Move it across and divide by $4$:` },
      { tex: `${U}^2 = ${A * r2}` },
      { text: `$${A * r2} = ${K}^2$, so ${b === 0 ? `$c = \\pm ${K}$` : `$c ${signedN(-b)} = \\pm ${K}$ and $c = ${b - K}$ or $c = ${b + K}$`}.` },
    ];
  },
};

/** Run the condition backwards: a tangent and the centre give r^2 = k^2 / (1 + m^2). */
const coordTouchRadiusTree: Generator<TouchParams> = {
  id: 'coord-touch-radius-tree',
  sample: (rng, difficulty) => sampleTouch(rng, difficulty),
  render: (p): Slide => {
    const K = touchK(p);
    const k = p.s * K;
    const c = touchC(p);
    const A = 1 + p.m * p.m;
    const r2 = touchR2(p);
    const origin = p.a === 0 && p.b === 0;
    const answer = [String(k), String(A), String(k * k), String(r2)];
    return {
      kind: 'tree',
      prompt: [
        say(
          origin
            ? `The line $${lineTex(q(p.m), q(c))}$ is a tangent to a circle centred at the origin. Find $r^2$. Top row: the line's $c$, and $1 + m^2$. Then $c^2$, then $r^2 = c^2 \\div (1 + m^2)$.`
            : `The line $${lineTex(q(p.m), q(c))}$ is a tangent to a circle with centre $${named('C', p.a, p.b)}$. Find $r^2$. Top row: $k = ma + c - b$, how far the line is above the centre, and $1 + m^2$. Then $k^2$, then $r^2 = k^2 \\div (1 + m^2)$.`,
        ),
      ],
      expression: origin
        ? `r^2 = \\frac{${paren(c)}^2}{1 + ${paren(p.m)}^2}`
        : `r^2 = \\frac{(${sumTex([`${p.m} \\times ${paren(p.a)}`, String(c), String(-p.b)])})^2}{1 + ${paren(p.m)}^2}`,
      nodes: [
        { id: 'k', from: [] },
        { id: 'A', from: [] },
        { id: 'k2', from: ['k'] },
        { id: 'r2', from: ['k2', 'A'] },
      ],
      bank: bank(answer, [String(-k), String(p.m * p.m), String(2 * r2), String(A * r2), String(k * k * A)], [r2]),
      answer,
    };
  },
  solution: (p) => {
    const k = p.s * touchK(p);
    const A = 1 + p.m * p.m;
    const origin = p.a === 0 && p.b === 0;
    const letter = origin ? 'c' : 'k';
    return [
      {
        text: origin
          ? 'Centred at the origin, the tangent condition is $c^2 = r^2(1 + m^2)$, so $r^2 = c^2 \\div (1 + m^2)$.'
          : `Measured from the centre, the line is $k = ma + c - b = ${sumTex([`${p.m} \\times ${paren(p.a)}`, String(touchC(p)), String(-p.b)])} = ${k}$ above it. The tangent condition is $k^2 = r^2(1 + m^2)$.`,
      },
      { tex: chain(`${letter}^2 &= ${k * k}`, `1 + m^2 &= ${A}`, `r^2 &= \\frac{${k * k}}{${A}} = ${touchR2(p)}`) },
    ];
  },
};

/* ---------- lesson 4: tangents from a point outside ---------- */

interface OutsideParams {
  a: number;
  b: number;
  r: number;
  /** The tangent length. */
  L: number;
  /** From the centre to P. */
  dx: number;
  dy: number;
  expanded: boolean;
}

/**
 * P outside the circle with CP, r and the tangent length a Pythagorean
 * triple from the table, so all three are whole.
 */
function sampleOutside(rng: Rng, difficulty: number, expanded: boolean): OutsideParams {
  const [L, r, h] = rng.pick(TRIPLES.filter((row) => row[2] <= (difficulty > 1 ? 25 : 13)));
  const [dx, dy] = rng.pick(onCircle(h * h));
  const [a, b] = difficulty > 1 || rng.chance(0.7) ? sampleCentre(rng, 1) : [0, 0];
  return { a, b, r, L, dx, dy, expanded };
}

function outsideCircle({ a, b, r, expanded }: OutsideParams): Block {
  return expanded ? wrapped(expandedTex(a, b, r * r)) : show(circleTex(a, b, r * r));
}

function tangentLengthSolution(p: OutsideParams): SolutionStep[] {
  const { a, b, r, L, dx, dy } = p;
  const h2 = dx * dx + dy * dy;
  return [
    ...(p.expanded ? [{ text: `Complete the square first: $${circleTex(a, b, r * r)}$.` }] : []),
    { text: `The radius to the point of contact $T$ meets the tangent at a right angle, so $PT^2 = CP^2 - r^2$. From $C${pt(a, b)}$ to $P$:` },
    { tex: narrowDistance('CP', a + dx, a, b + dy, b) },
    { tex: chain(`PT^2 &= ${h2} - ${r * r} = ${L * L}`, `PT &= ${L}`) },
  ];
}

/** The length of a tangent from P, typed; the circle is expanded at difficulty 2. */
const coordTangentLength: Generator<OutsideParams> = {
  id: 'coord-tangent-length',
  sample: (rng, difficulty) => sampleOutside(rng, difficulty, difficulty > 1),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      say(`$${named('P', p.a + p.dx, p.b + p.dy)}$ lies outside the circle below. Find the length of a tangent from $P$ to the circle.`),
      outsideCircle(p),
    ],
    lead: 'PT =',
    keypad: [],
    answer: String(p.L),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ r, L, dx, dy }) => {
    const h = Math.round(Math.sqrt(dx * dx + dy * dy));
    return intOptions(L, [h, h - r, L * L, h + r], 1);
  },
  solution: tangentLengthSolution,
};

/** The same length worked as a tree: the changes, CP^2, PT^2, PT. */
const coordTangentLengthTree: Generator<OutsideParams> = {
  id: 'coord-tangent-length-tree',
  sample: (rng, difficulty) => sampleOutside(rng, difficulty, false),
  render: (p): Slide => {
    const { a, b, r, L, dx, dy } = p;
    const h2 = dx * dx + dy * dy;
    const answer = [dx, dy, h2, L * L, L].map(String);
    return {
      kind: 'tree',
      prompt: [
        say(
          `How long is a tangent from $${named('P', a + dx, b + dy)}$ to the circle $${circleTex(a, b, r * r)}$? Top row: the changes in $x$ and $y$ from the centre to $P$. Then $CP^2$, then $PT^2 = CP^2 - r^2$, then $PT$.`,
        ),
      ],
      expression: 'PT^2 = CP^2 - r^2',
      nodes: [
        { id: 'dx', from: [] },
        { id: 'dy', from: [] },
        { id: 'cp2', from: ['dx', 'dy'] },
        { id: 'pt2', from: ['cp2'] },
        { id: 'pt', from: ['pt2'] },
      ],
      bank: bank(answer, [String(-dx), String(-dy), String(h2 + r * r), String(r * r), String(L + r)], [L]),
      answer,
    };
  },
  solution: tangentLengthSolution,
};

type Place = 'inside' | 'on' | 'outside';

interface CountParams {
  a: number;
  b: number;
  r2: number;
  px: number;
  py: number;
  expanded: boolean;
}

const placeOf = ({ a, b, r2, px, py }: CountParams): Place => {
  const d2 = (px - a) ** 2 + (py - b) ** 2;
  return d2 < r2 ? 'inside' : d2 === r2 ? 'on' : 'outside';
};

const TANGENT_COUNT: Record<Place, string> = { inside: 'None', on: 'One', outside: 'Two' };

/** How many tangents pass through P: none from inside, one from on the circle, two from outside. */
const coordOutsideCount: Generator<CountParams> = {
  id: 'coord-outside-count',
  sample: (rng, difficulty) => {
    const place = rng.pick(['inside', 'on', 'outside'] as const);
    const r2 = rng.pick(CHORD_RADII);
    const [a, b] = sampleCentre(rng, 1);
    const expanded = difficulty > 1;
    if (place === 'on') {
      const [dx, dy] = rng.pick(onCircle(r2));
      return { a, b, r2, px: a + dx, py: b + dy, expanded };
    }
    for (;;) {
      const dx = rng.int(-7, 7);
      const dy = rng.int(-7, 7);
      const d2 = dx * dx + dy * dy;
      if (d2 === 0 || (place === 'inside' ? d2 >= r2 : d2 <= r2 || d2 > r2 + 30)) continue;
      return { a, b, r2, px: a + dx, py: b + dy, expanded };
    }
  },
  render: (p): Slide => {
    const labels = [TANGENT_COUNT.inside, TANGENT_COUNT.on, TANGENT_COUNT.outside];
    return {
      kind: 'choice',
      prompt: [
        say(`How many tangents to the circle below pass through $${named('P', p.px, p.py)}$?`),
        p.expanded ? wrapped(expandedTex(p.a, p.b, p.r2)) : show(circleTex(p.a, p.b, p.r2)),
      ],
      options: labels.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${labels.indexOf(TANGENT_COUNT[placeOf(p)])}`,
    };
  },
  solution: (p) => {
    const place = placeOf(p);
    const d2 = (p.px - p.a) ** 2 + (p.py - p.b) ** 2;
    return [
      ...(p.expanded ? [{ text: `Complete the square first: $${circleTex(p.a, p.b, p.r2)}$.` }] : []),
      { text: `Compare $CP^2$ with $r^2 = ${p.r2}$. From the centre $${pt(p.a, p.b)}$ to $P$:` },
      { tex: narrowDistance('CP', p.px, p.a, p.py, p.b) },
      {
        text:
          place === 'inside'
            ? `$${d2}$ is less than $${p.r2}$, so $P$ is inside: every line through it cuts the circle, and no tangent passes through it.`
            : place === 'on'
              ? `$${d2}$ is exactly $${p.r2}$, so $P$ is on the circle, and the one tangent there is the one at $P$.`
              : `$${d2}$ is more than $${p.r2}$, so $P$ is outside, and two tangents pass through it.`,
      },
    ];
  },
};

interface FromPoint {
  r2: number;
  /** P measured from the centre. */
  X: number;
  Y: number;
  /** The two tangents' gradients, the smaller first. */
  m1: number;
  m2: number;
}

/**
 * Every small case of a point outside a circle from which both tangents have
 * a whole, non-zero gradient up to 7: the roots of
 * (X^2 - r^2)m^2 - 2XYm + (Y^2 - r^2) = 0, found by trying them all.
 */
const FROM_POINTS: FromPoint[] = [];
for (let r2 = 2; r2 <= 50; r2 += 1) {
  for (let X = -9; X <= 9; X += 1) {
    for (let Y = -9; Y <= 9; Y += 1) {
      const P = X * X - r2;
      if (X * X + Y * Y <= r2 || P === 0) continue;
      const Q = -2 * X * Y;
      const R = Y * Y - r2;
      const D = Q * Q - 4 * P * R;
      let s = 0;
      while (s * s < D) s += 1;
      if (s * s !== D) continue;
      const roots = [(-Q - s) / (2 * P), (-Q + s) / (2 * P)].sort((u, v) => u - v);
      if (roots.some((m) => !Number.isInteger(m) || m === 0 || Math.abs(m) > 7)) continue;
      FROM_POINTS.push({ r2, X, Y, m1: roots[0], m2: roots[1] });
    }
  }
}

interface FromPointParams extends FromPoint {
  a: number;
  b: number;
}

function sampleFromPoint(rng: Rng, difficulty: number, keep: (p: FromPointParams) => boolean): FromPointParams {
  for (;;) {
    const [a, b] = difficulty > 1 ? [nz(rng, 3), nz(rng, 3)] : [0, 0];
    const p = { ...rng.pick(FROM_POINTS), a, b };
    if (keep(p)) return p;
  }
}

/** The tangent through P with gradient m has c = py - m px. */
const fromPointC = (p: FromPointParams, m: number) => p.b + p.Y - m * (p.a + p.X);

/** (P, Q, R) with the first positive, the way a quadratic is tidied. */
function positiveLead([P, Q, R]: [number, number, number]): [number, number, number] {
  return P < 0 ? [-P, -Q + 0, -R + 0] : [P, Q, R];
}

function fromPointPrompt(p: FromPointParams): string {
  const px = p.a + p.X;
  const py = p.b + p.Y;
  const circle = circleTex(p.a, p.b, p.r2);
  return p.a === 0 && p.b === 0
    ? `Every line through $${named('P', px, py)}$ is $y = mx + c$ with $c = ${sumTex([String(py), termOf(q(-px), 'm')])}$. It touches $${circle}$ when $c^2 = r^2(1 + m^2)$, which is the equation below.`
    : `Measured from the centre of $${circle}$, the point $${named('P', px, py)}$ is $${p.X}$ across and $${p.Y}$ up, so a line through $P$ with gradient $m$ is $k = ${sumTex([String(p.Y), termOf(q(-p.X), 'm')])}$ above the centre, and it touches when $k^2 = r^2(1 + m^2)$, the equation below.`;
}

function fromPointSolution(p: FromPointParams): SolutionStep[] {
  const [P, Q, R] = positiveLead([p.X * p.X - p.r2, -2 * p.X * p.Y, p.Y * p.Y - p.r2]);
  const bracket = sumTex([String(p.Y), termOf(q(-p.X), 'm')]);
  return [
    { text: 'A line through $P$ touches when the tangent condition holds:' },
    { tex: `(${bracket})^2 = ${p.r2}(1 + m^2)` },
    { text: 'Multiply out both sides and collect everything on one side:' },
    { tex: quadTex(P, Q, R, 'm') },
    { tex: eitherTex('m', p.m1, p.m2) },
    {
      text: `So the tangents are $${lineTex(q(p.m1), q(fromPointC(p, p.m1)))}$ and $${lineTex(q(p.m2), q(fromPointC(p, p.m2)))}$.`,
    },
  ];
}

/** The gradients of the two tangents from P: the tangent condition as a quadratic in m, solved. */
const coordOutsideGradientSteps: Generator<FromPointParams> = {
  id: 'coord-outside-gradient-steps',
  sample: (rng, difficulty) => sampleFromPoint(rng, difficulty, (p) => p.X !== 0 && p.Y !== 0),
  render: (p): Slide => {
    const { X, Y, r2, m1, m2 } = p;
    const lhs = sumTex([sqTerm(X * X, 'm'), termOf(q(-2 * X * Y), 'm'), String(Y * Y)]);
    const rhs = sumTex([sqTerm(r2, 'm'), String(r2)]);
    const tidy = (lead: number, middle: number, last: number) => quadTex(...positiveLead([lead, middle, last]), 'm');
    const collected = tidy(X * X - r2, -2 * X * Y, Y * Y - r2);
    const roots = eitherTex('m', m1, m2);
    return {
      kind: 'steps',
      prompt: [say(`${fromPointPrompt(p)} Solve it for the gradients of the two tangents: tap the part you would do **next**, then choose what it becomes.`)],
      start: [`(${sumTex([String(Y), termOf(q(-X), 'm')])})^2`, '=', `${r2}(1 + m^2)`],
      reductions: [
        {
          span: [0, 1],
          value: lhs,
          bank: stepBank(
            lhs,
            sumTex([sqTerm(X * X, 'm'), String(Y * Y)]),
            sumTex([sqTerm(X * X, 'm'), termOf(q(2 * X * Y), 'm'), String(Y * Y)]),
            sumTex([sqTerm(X * X, 'm'), termOf(q(-X * Y), 'm'), String(Y * Y)]),
          ),
        },
        {
          span: [2, 3],
          value: rhs,
          bank: stepBank(rhs, sumTex([sqTerm(r2, 'm'), '1']), sumTex(['m^2', String(r2)]), sumTex([sqTerm(r2, 'm'), String(-r2)])),
        },
        {
          span: [0, 3],
          value: collected,
          bank: stepBank(
            collected,
            tidy(X * X - r2, -2 * X * Y, Y * Y + r2),
            tidy(X * X + r2, -2 * X * Y, Y * Y + r2),
            tidy(X * X - r2, 2 * X * Y, Y * Y - r2),
          ),
        },
        {
          span: [0, 1],
          value: roots,
          bank: stepBank(roots, eitherTex('m', -m1, -m2), eitherTex('m', m1, -m2), eitherTex('m', m1 - 1, m2 + 1)),
        },
      ],
    };
  },
  solution: fromPointSolution,
};

/** One of the two tangents from P, the steeper-upward one, as two tiles. */
const coordOutsideTangentTiles: Generator<FromPointParams> = {
  id: 'coord-outside-tangent-tiles',
  sample: (rng, difficulty) => sampleFromPoint(rng, difficulty, (p) => fromPointC(p, p.m2) !== 0),
  render: (p): Slide => {
    const c1 = fromPointC(p, p.m1);
    const c2 = fromPointC(p, p.m2);
    const px = p.a + p.X;
    const py = p.b + p.Y;
    const answer = [termOf(q(p.m2)), signedN(c2)];
    const slips = [termOf(q(p.m1)), termOf(q(-p.m2)), ...[c1, -c2, py + p.m2 * px].filter((v) => v !== 0).map(signedN)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `Two tangents to the circle $${circleTex(p.a, p.b, p.r2)}$ pass through $${named('P', px, py)}$. Write the one with the larger gradient.`,
        ),
      ],
      template: 'y = {0} {1}',
      bank: signedBank(answer, slips, [c2]),
      answer,
    };
  },
  solution: (p) => [
    ...fromPointSolution(p),
    { text: `The larger gradient is $${p.m2}$, which gives $${lineTex(q(p.m2), q(fromPointC(p, p.m2)))}$.` },
  ],
};

/* ---------- lesson 5: chords ---------- */

interface ChordHalfParams {
  a: number;
  b: number;
  /** From the centre to the chord's midpoint M. */
  ux: number;
  uy: number;
  /** Half the chord. */
  h: number;
  /** Difficulty 2 of the r^2 question gives the circle expanded, with its number unknown. */
  expanded: boolean;
}

const halfR2 = ({ ux, uy, h }: ChordHalfParams) => ux * ux + uy * uy + h * h;

/**
 * A chord's midpoint M off the centre, and half the chord whole: r^2 is
 * built as CM^2 + h^2, so nothing is ever rooted but h^2.
 */
function sampleChordHalf(rng: Rng, difficulty: number, expanded = false): ChordHalfParams {
  const top = difficulty > 1 ? 6 : 4;
  const [a, b] = sampleCentre(rng, difficulty > 1 ? 2 : 1);
  return { a, b, ux: nz(rng, top), uy: nz(rng, top), h: difficulty > 1 ? rng.int(2, 8) : rng.int(1, 6), expanded };
}

function chordHalfSolution(p: ChordHalfParams): SolutionStep[] {
  const { a, b, ux, uy, h } = p;
  const d2 = ux * ux + uy * uy;
  return [
    { text: `The perpendicular from the centre meets the chord at its midpoint $M$, so $r^2 = CM^2 + \\left(\\tfrac{1}{2}AB\\right)^2$. From $C${pt(a, b)}$ to $M$:` },
    { tex: narrowDistance('CM', a + ux, a, b + uy, b) },
    { tex: chain(`\\left(\\tfrac{1}{2}AB\\right)^2 &= ${halfR2(p)} - ${d2} = ${h * h}`, `\\tfrac{1}{2}AB &= ${h}`, `AB &= ${2 * h}`) },
  ];
}

/** A chord's length from its midpoint: the changes, CM^2, half the chord squared, the chord. */
const coordChordHalfTree: Generator<ChordHalfParams> = {
  id: 'coord-chord-half-tree',
  sample: (rng, difficulty) => sampleChordHalf(rng, difficulty),
  render: (p): Slide => {
    const { a, b, ux, uy, h } = p;
    const r2 = halfR2(p);
    const d2 = ux * ux + uy * uy;
    const answer = [ux, uy, d2, h * h, 2 * h].map(String);
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${named('M', a + ux, b + uy)}$ is the midpoint of a chord $AB$ of the circle $${circleTex(a, b, r2)}$. How long is $AB$? Top row: the changes in $x$ and $y$ from the centre to $M$. Then $CM^2$, then $\\left(\\tfrac{1}{2}AB\\right)^2 = r^2 - CM^2$, then $AB$.`,
        ),
      ],
      expression: '\\left(\\tfrac{1}{2}AB\\right)^2 = r^2 - CM^2',
      nodes: [
        { id: 'dx', from: [] },
        { id: 'dy', from: [] },
        { id: 'cm2', from: ['dx', 'dy'] },
        { id: 'half2', from: ['cm2'] },
        { id: 'ab', from: ['half2'] },
      ],
      bank: bank(answer, [String(-ux), String(-uy), String(h), String(r2 + d2), String(r2)], [2 * h]),
      answer,
    };
  },
  solution: chordHalfSolution,
};

/**
 * Backwards: a chord's length and midpoint give r^2 (difficulty 1), or the
 * missing number in the expanded circle (difficulty 2).
 */
const coordChordRadius: Generator<ChordHalfParams> = {
  id: 'coord-chord-radius',
  sample: (rng, difficulty) => sampleChordHalf(rng, difficulty, difficulty > 1),
  render: (p): Slide => {
    const { a, b, ux, uy, h, expanded } = p;
    const r2 = halfR2(p);
    const M = named('M', a + ux, b + uy);
    return {
      kind: 'expression',
      prompt: expanded
        ? [
            say(`A chord of length $${2 * h}$ of the circle below has its midpoint at $${M}$. Find $k$.`),
            wrapped(`${sumTex(['x^2', 'y^2', termOf(q(-2 * a)), termOf(q(-2 * b), 'y')])} + k = 0`),
          ]
        : [say(`A chord of length $${2 * h}$ has its midpoint at $${M}$, in a circle with centre $${named('C', a, b)}$. Find $r^2$.`)],
      lead: expanded ? 'k =' : 'r^2 =',
      keypad: [],
      answer: String(expanded ? a * a + b * b - r2 : r2),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const { a, b, ux, uy, h, expanded } = p;
    const d2 = ux * ux + uy * uy;
    const r2 = halfR2(p);
    if (expanded) return intOptions(a * a + b * b - r2, [a * a + b * b + r2, r2, a * a + b * b - d2 - 4 * h * h, -r2]);
    return intOptions(r2, [d2 + 4 * h * h, d2 - h * h, d2 + 2 * h, 4 * h * h], 1);
  },
  solution: (p) => {
    const { a, b, ux, uy, h, expanded } = p;
    const d2 = ux * ux + uy * uy;
    const r2 = halfR2(p);
    return [
      ...(expanded
        ? [{ text: `Halve the coefficients and change their signs: the centre is $C${pt(a, b)}$.` }]
        : []),
      { text: `The perpendicular from the centre meets the chord at its midpoint, so $r^2 = CM^2 + \\left(\\tfrac{1}{2}AB\\right)^2$:` },
      { tex: narrowDistance('CM', a + ux, a, b + uy, b) },
      { tex: `r^2 = ${d2} + ${h}^2 = ${r2}` },
      ...(expanded
        ? [{ text: `Completing the square gives $r^2 = a^2 + b^2 - k$, so $k = ${a * a} + ${b * b} - ${r2} = ${a * a + b * b - r2}$.` }]
        : []),
    ];
  },
};

/** A line cutting a circle at two lattice points whose midpoint is a lattice point too. */
const evenChord = (p: CutParams) => (p.x1 + p.x2) % 2 === 0;

/** The chord's midpoint: half the sum of the roots, then its y from the line, then the point. */
const coordChordMidpointSteps: Generator<CutParams> = {
  id: 'coord-chord-midpoint-steps',
  sample: (rng, difficulty) => sampleCut(rng, difficulty, (p) => evenChord(p) && p.x1 + p.x2 !== 0),
  render: (p): Slide => {
    const xm = (p.x1 + p.x2) / 2;
    const ym = (p.y1 + p.y2) / 2;
    const xStep = `x_M = ${xm}`;
    const yStep = `y_M = ${ym}`;
    const point = `M = ${pt(xm, ym)}`;
    return {
      kind: 'steps',
      prompt: [
        say(
          `The line $${meetLine(p)}$ cuts the circle $${meetCircle(p)}$ at $A$ and $B$. Putting the line into the circle and dividing through gives the quadratic below. Its roots are the $x$-coordinates of $A$ and $B$, and they add to minus its $x$ coefficient. Find the midpoint $M$ of $AB$: tap the part you would do **next**, then choose what it becomes.`,
        ),
        show(monicTex(p)),
      ],
      start: ['x_M = \\frac{x_A + x_B}{2}', ',', `y_M = ${sumTex([termOf(q(p.m), 'x_M'), String(p.c)])}`],
      reductions: [
        { span: [0, 1], value: xStep, bank: stepBank(xStep, `x_M = ${-xm}`, `x_M = ${2 * xm}`, `x_M = ${-2 * xm}`) },
        { span: [2, 3], value: yStep, bank: stepBank(yStep, `y_M = ${p.m * xm - p.c}`, `y_M = ${p.c - p.m * xm}`, `y_M = ${2 * p.m * xm + p.c}`) },
        { span: [0, 3], value: point, bank: stepBank(point, `M = ${pt(ym, xm)}`, `M = ${pt(-xm, ym)}`, `M = ${pt(xm, -ym + 0)}`) },
      ],
    };
  },
  solution: (p) => {
    const s = p.x1 + p.x2;
    const xm = s / 2;
    return [
      { text: `The roots of $${monicTex(p)}$ add to minus its $x$ coefficient: $x_A + x_B = ${s}$.` },
      { tex: `x_M = \\frac{${s}}{2} = ${xm}` },
      { text: `The midpoint is on the line, so $y_M = ${lineAt(p.m, p.c, xm)} = ${(p.y1 + p.y2) / 2}$.` },
      { text: `So $M = ${pt(xm, (p.y1 + p.y2) / 2)}$: the roots are $${p.x1}$ and $${p.x2}$, and $A${pt(p.x1, p.y1)}$ and $B${pt(p.x2, p.y2)}$ are either side of it.` },
    ];
  },
};

interface ChordSliderParams extends CutParams {
  axis: 'x' | 'y';
}

/**
 * The chord drawn in its circle: slide to its midpoint, where the
 * perpendicular from the centre meets it, across (difficulty 1) or up
 * (difficulty 2).
 */
const coordChordSlider: Generator<ChordSliderParams> = {
  id: 'coord-chord-slider',
  sample: (rng, difficulty) => ({
    ...sampleCut(
      rng,
      difficulty,
      (p) => evenChord(p) && fits(p.a, p.b, p.r2) && (p.x1 + p.x2 !== 2 * p.a || p.y1 + p.y2 !== 2 * p.b),
    ),
    axis: difficulty > 1 ? 'y' : 'x',
  }),
  render: (p): Slide => {
    const xm = (p.x1 + p.x2) / 2;
    const ym = (p.y1 + p.y2) / 2;
    return {
      kind: 'slider',
      prompt: [
        say(
          p.axis === 'x'
            ? `The line $${meetLine(p)}$ cuts the circle $${meetCircle(p)}$ at $${named('A', p.x1, p.y1)}$ and $${named('B', p.x2, p.y2)}$. The perpendicular from the centre meets the chord at its midpoint. Slide to the midpoint's $x$-coordinate.`
            : `The line $${meetLine(p)}$ cuts the circle $${meetCircle(p)}$. The perpendicular from the centre meets the chord at its midpoint. Find it, and slide to its height.`,
        ),
      ],
      min: -9,
      max: 9,
      step: 1,
      answer: p.axis === 'x' ? xm : ym,
      readout: `${p.axis} = {v}`,
      figure: {
        svg: circleFigure(
          p.a,
          p.b,
          p.r2,
          [segment(p.x1, p.y1, p.x2, p.y2)],
          [
            { x: p.x1, y: p.y1 },
            { x: p.x2, y: p.y2 },
          ],
          'A circle with a chord drawn across it between two marked points',
        ),
        axis: p.axis,
        ...markerWindow(-10, 10, p.axis, SQUARE),
      },
    };
  },
  solution: (p) => {
    const xm = (p.x1 + p.x2) / 2;
    const ym = (p.y1 + p.y2) / 2;
    return [
      ...(p.axis === 'y' ? [...substituteSolution(p), ...rootsSolution(p)] : []),
      { text: `The perpendicular from the centre bisects the chord, so it meets it at the midpoint of $${pt(p.x1, p.y1)}$ and $${pt(p.x2, p.y2)}$:` },
      { tex: chain(`x_M &= \\frac{${p.x1} + ${paren(p.x2)}}{2} = ${xm}`, `y_M &= \\frac{${p.y1} + ${paren(p.y2)}}{2} = ${ym}`) },
    ];
  },
};

/* ================================================================
 * Level 4: circle theorems on axes
 *
 * The facts are level 2's — a tangent meets the radius square on, the line
 * from the centre to a chord's midpoint meets the chord square on — joined
 * by the angle in a semicircle, and then used together. Every point is a
 * lattice point of a circle from `CHORD_RADII`, found by `onCircle` and moved
 * to a lattice centre, so every gradient is a fraction of whole numbers and
 * every centre and r^2 is whole. A right angle is `mul(m1, m2)` equal to
 * `-1` as fractions, never a float compared with one.
 * ================================================================ */

type Pt = [number, number];

const samePt = (p: Pt, r: Pt): boolean => p[0] === r[0] && p[1] === r[1];

const offsetBy = (a: number, b: number, [x, y]: Pt): Pt => [a + x, b + y];

const namedAt = (name: string, [x, y]: Pt): string => named(name, x, y);

/** The gradient from one point to another, as a fraction. */
const slopeOf = ([x1, y1]: Pt, [x2, y2]: Pt): Q => q(y2 - y1, x2 - x1);

/** Neither straight across nor straight up from each other: a gradient that is a number and not zero. */
const slanted = ([x1, y1]: Pt, [x2, y2]: Pt): boolean => x1 !== x2 && y1 !== y2;

/** (y_2 - y_1)/(x_2 - x_1) with the learner's numbers in. */
const slopeFormula = ([x1, y1]: Pt, [x2, y2]: Pt): string => gradientFormula({ x1, y1, x2, y2 });

/** A fraction as it sits after a times or divide sign: a negative one bracketed. */
function qParen(v: Q): string {
  return v.n < 0 ? `\\left(${qTex(v)}\\right)` : qTex(v);
}

/** The radii a level 4 circle is drawn from: the smaller ones at difficulty 1. */
const radiiFor = (difficulty: number): number[] => (difficulty > 1 ? CHORD_RADII : [5, 10, 13, 25]);

/** The circle's equation as the learner reads it: centred form, or multiplied out. */
function circleShown(a: number, b: number, r2: number, expanded: boolean): string {
  return expanded ? expandedTex(a, b, r2) : circleTex(a, b, r2);
}

/** Where the centre comes from, as the first line of a solution. */
function centreFrom(a: number, b: number, r2: number, expanded: boolean): SolutionStep[] {
  if (!expanded) return [];
  return [{ text: `Complete the square to read the circle: $${circleTex(a, b, r2)}$, so the centre is $${named('C', a, b)}$.` }];
}

interface Diameter {
  a: number;
  b: number;
  /** From the centre to B; A is the same distance the other way. */
  v: Pt;
}

const endA = ({ a, b, v }: Diameter): Pt => [a - v[0], b - v[1]];
const endB = ({ a, b, v }: Diameter): Pt => [a + v[0], b + v[1]];

/** The gradients of AP and BP, worked out, then multiplied. */
function semicircleSolution(A: Pt, B: Pt, P: Pt): SolutionStep[] {
  const m1 = slopeOf(A, P);
  const m2 = slopeOf(B, P);
  return [
    { tex: chain(`m_{AP} &= ${slopeFormula(A, P)} = ${qTex(m1)}`, `m_{BP} &= ${slopeFormula(B, P)} = ${qTex(m2)}`) },
    { text: `Multiplied: $${qTex(m1)} \\times ${qParen(m2)} = ${qTex(mul(m1, m2))}$.` },
  ];
}

/* ---------- lesson 1: the angle in a semicircle ---------- */

interface SemicircleParams extends Diameter {
  r2: number;
  /** From the centre to P. */
  p: Pt;
}

const pointP = ({ a, b, p }: SemicircleParams): Pt => offsetBy(a, b, p);

/**
 * A diameter AB and a point P on the circle, with neither AP nor BP straight
 * across or straight up. Centred at the origin at difficulty 1; moved to a
 * centre up to 4 away, with the larger radii, at difficulty 2.
 */
function sampleSemicircle(rng: Rng, difficulty: number): SemicircleParams {
  for (;;) {
    const r2 = rng.pick(radiiFor(difficulty));
    const points = onCircle(r2);
    const v = rng.pick(points);
    const p = rng.pick(points);
    const [a, b] = difficulty > 1 ? [rng.int(-4, 4), rng.int(-4, 4)] : [0, 0];
    const params = { a, b, r2, v, p };
    const P = pointP(params);
    if (!slanted(endA(params), P) || !slanted(endB(params), P)) continue;
    return params;
  }
}

interface SemicircleTreeParams extends SemicircleParams {
  /** Difficulty 2 gives the circle and A only, so B has to be found first. */
  fromCircle: boolean;
}

/** The gradients of AP and BP, then their product: always -1. */
const coordSemicircleTree: Generator<SemicircleTreeParams> = {
  id: 'coord-semicircle-tree',
  sample: (rng, difficulty) => ({ ...sampleSemicircle(rng, difficulty), fromCircle: difficulty > 1 }),
  render: (params): Slide => {
    const A = endA(params);
    const B = endB(params);
    const P = pointP(params);
    const m1 = slopeOf(A, P);
    const m2 = slopeOf(B, P);
    const answer = [qTex(m1), qTex(m2), '-1'];
    const given = params.fromCircle
      ? `The circle $${circleTex(params.a, params.b, params.r2)}$ has a diameter $AB$ with $${namedAt('A', A)}$, and $${namedAt('P', P)}$ is on the circle.`
      : `$AB$ is a diameter of a circle, with $${namedAt('A', A)}$ and $${namedAt('B', B)}$, and $${namedAt('P', P)}$ is on the circle.`;
    return {
      kind: 'tree',
      prompt: [say(`${given} Top row: the gradients of $AP$ and $BP$. Underneath: their product.`)],
      expression: 'm_{AP} \\times m_{BP}',
      nodes: [
        { id: 'ap', from: [] },
        { id: 'bp', from: [] },
        { id: 'product', from: ['ap', 'bp'] },
      ],
      bank: bank(answer, [qTex(neg(m1)), qTex(inv(m1)), qTex(neg(m2)), qTex(inv(m2)), '1'], [-1]),
      answer,
    };
  },
  solution: (params) => [
    ...(params.fromCircle
      ? [
          {
            text: `The centre $${named('C', params.a, params.b)}$ is the midpoint of the diameter, so $B$ is as far past $C$ as $A$ is short of it: $${namedAt('B', endB(params))}$.`,
          },
        ]
      : []),
    ...semicircleSolution(endA(params), endB(params), pointP(params)),
    { text: 'The product is $-1$, so $AP$ and $BP$ are perpendicular: the angle in a semicircle is a right angle.' },
  ],
};

interface RightAngleParams extends SemicircleParams {
  /** How far P is moved off the circle; [0, 0] leaves it on. */
  off: Pt;
}

/** One step in each of the eight directions. */
const NUDGES: Pt[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];

const movedP = (params: RightAngleParams): Pt => offsetBy(params.off[0], params.off[1], pointP(params));

/**
 * Right angle or not: multiply the gradients of AP and BP, then decide. P is
 * on the circle with diameter AB half the time, and a step off it otherwise.
 */
const coordRightAngleFlow: Generator<RightAngleParams> = {
  id: 'coord-right-angle-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = sampleSemicircle(rng, difficulty);
      const off: Pt = rng.chance(0.5) ? [0, 0] : rng.pick(NUDGES);
      const params = { ...base, off };
      const P = movedP(params);
      if (!slanted(endA(params), P) || !slanted(endB(params), P)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const A = endA(params);
    const B = endB(params);
    const P = movedP(params);
    const m1 = slopeOf(A, P);
    const m2 = slopeOf(B, P);
    const product = mul(m1, m2);
    const right = same(product, q(-1));
    const labels = forkLabels(
      right ? [product, q(1), add(m1, m2), sub(m1, m2), q(0)] : [product, q(-1), neg(product), add(m1, m2), sub(m1, m2)],
    ).slice(0, 4);
    return {
      kind: 'flow',
      prompt: [
        say(
          `$AB$ is a diameter of a circle, with $${namedAt('A', A)}$ and $${namedAt('B', B)}$. Is the angle $APB$ at $${namedAt('P', P)}$ a right angle?`,
        ),
      ],
      subject: 'm_{AP} \\times m_{BP}',
      steps: [
        {
          id: 'product',
          ask: 'Work out the gradients of $AP$ and $BP$ and multiply them. What do you get?',
          branches: turned(labels, labels.join('|')).map((label) => ({ label, to: 'verdict' })),
        },
        {
          id: 'verdict',
          ask: 'So is the angle $APB$ a right angle?',
          branches: [
            { label: 'Yes', outcome: 'So $P$ is on the circle with diameter $AB$.' },
            { label: 'No', outcome: 'So $P$ is not on the circle with diameter $AB$.' },
          ],
        },
      ],
      answer: [labels[0], right ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const P = movedP(params);
    const right = same(mul(slopeOf(endA(params), P), slopeOf(endB(params), P)), q(-1));
    return [
      ...semicircleSolution(endA(params), endB(params), P),
      {
        text: right
          ? 'That is $-1$, so $AP$ and $BP$ are perpendicular and the angle at $P$ is a right angle: $P$ is on the circle with diameter $AB$.'
          : 'That is not $-1$, so the angle at $P$ is not a right angle, and $P$ is not on the circle with diameter $AB$.',
      },
    ];
  },
};

/**
 * The missing coordinate of B, the far end of a diameter: BP is perpendicular
 * to AP, and B's x is given, so its y follows from the gradient.
 */
const coordSemicircleMissing: Generator<SemicircleParams> = {
  id: 'coord-semicircle-missing',
  sample: sampleSemicircle,
  render: (params): Slide => {
    const A = endA(params);
    const B = endB(params);
    return {
      kind: 'expression',
      prompt: [
        say(
          `$${namedAt('A', A)}$ and $B(${B[0]}, k)$ are the ends of a diameter of a circle, and $${namedAt('P', pointP(params))}$ is on the circle. Find $k$.`,
        ),
      ],
      lead: 'k =',
      keypad: [],
      answer: String(B[1]),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (params) => {
    const A = endA(params);
    const B = endB(params);
    const P = pointP(params);
    const m = slopeOf(A, P);
    const run = q(B[0] - P[0]);
    return intOptions(B[1], [value(add(q(P[1]), mul(m, run))), value(sub(q(P[1]), mul(perp(m), run))), -B[1], A[1]]);
  },
  solution: (params) => {
    const A = endA(params);
    const B = endB(params);
    const P = pointP(params);
    const m = slopeOf(A, P);
    const mB = perp(m);
    return [
      { text: 'The angle in a semicircle is a right angle, so $BP$ is perpendicular to $AP$:' },
      { tex: chain(`m_{AP} &= ${slopeFormula(A, P)} = ${qTex(m)}`, `m_{BP} &= -1 \\div ${qParen(m)} = ${qTex(mB)}`) },
      { text: 'Write the gradient of $BP$ with $k$ in it, and solve:' },
      {
        tex: chain(
          `\\frac{k - ${paren(P[1])}}{${B[0]} - ${paren(P[0])}} &= ${qTex(mB)}`,
          `k - ${paren(P[1])} &= ${qTex(mB)} \\times ${paren(B[0] - P[0])}`,
          `&= ${B[1] - P[1]}`,
          `k &= ${B[1]}`,
        ),
      },
    ];
  },
};

interface RightPointParams extends SemicircleParams {
  /** Lattice points a step off the circle, for the wrong options. */
  wrongs: Pt[];
}

/**
 * Which point makes APB a right angle. The wrong options are other points of
 * the circle moved a step off it, so they sit round the circle rather than
 * clustering about the answer.
 */
const coordRightAnglePoint: Generator<RightPointParams> = {
  id: 'coord-right-angle-point',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = sampleSemicircle(rng, difficulty);
      const A = endA(base);
      const B = endB(base);
      const P = pointP(base);
      const others = onCircle(base.r2)
        .map((v) => offsetBy(base.a, base.b, v))
        .filter((X) => !samePt(X, A) && !samePt(X, B) && !samePt(X, P));
      const wrongs: Pt[] = [];
      for (let tries = 0; tries < 30 && wrongs.length < 3; tries += 1) {
        const W = offsetBy(...rng.pick(NUDGES.slice(0, 4)), rng.pick(others));
        const d2 = (W[0] - base.a) ** 2 + (W[1] - base.b) ** 2;
        if (d2 === base.r2 || samePt(W, A) || samePt(W, B) || wrongs.some((X) => samePt(X, W))) continue;
        wrongs.push(W);
      }
      if (wrongs.length < 3) continue;
      return { ...base, wrongs };
    }
  },
  render: (params): Slide =>
    choiceSlide(
      [
        say(
          `$AB$ is a diameter of a circle, with $${namedAt('A', endA(params))}$ and $${namedAt('B', endB(params))}$. Which point $P$ makes the angle $APB$ a right angle?`,
        ),
      ],
      pointOptions(pointP(params), params.wrongs, () => true),
    ),
  solution: (params) => {
    const P = pointP(params);
    return [
      {
        text: `The angle $APB$ is a right angle exactly when $P$ is on the circle with diameter $AB$, which is when the gradients of $AP$ and $BP$ multiply to $-1$. For $${pt(...P)}$:`,
      },
      ...semicircleSolution(endA(params), endB(params), P),
      { text: `The other points are each a step off the circle, and their products are not $-1$.` },
    ];
  },
};

/* ---------- lesson 2: a circle from its diameter ---------- */

interface DiameterParams extends Diameter {
  r2: number;
}

/** A diameter AB about a centre off both axes, neither straight across nor straight up. */
function sampleDiameter(rng: Rng, difficulty: number, keep: (p: DiameterParams) => boolean = () => true): DiameterParams {
  for (;;) {
    const r2 = rng.pick(radiiFor(difficulty));
    const v = rng.pick(latticeVectors(r2));
    const [a, b] = sampleCentre(rng, 1);
    const params = { a, b, r2, v };
    if (!keep(params)) continue;
    return params;
  }
}

/** The centre as the midpoint, then r^2 as a quarter of AB^2. */
function diameterSolution(p: DiameterParams): SolutionStep[] {
  const A = endA(p);
  const B = endB(p);
  const [dx, dy] = [2 * p.v[0], 2 * p.v[1]];
  return [
    { text: 'The centre is the midpoint of the diameter:' },
    { tex: chain(`a &= \\frac{${A[0]} + ${paren(B[0])}}{2} = ${p.a}`, `b &= \\frac{${A[1]} + ${paren(B[1])}}{2} = ${p.b}`) },
    { text: 'The radius is half of $AB$, so $r^2$ is a quarter of $AB^2$:' },
    { tex: chain(`AB^2 &= ${paren(dx)}^2 + ${paren(dy)}^2`, `&= ${4 * p.r2}`, `r^2 &= ${4 * p.r2} \\div 4 = ${p.r2}`) },
  ];
}

/** The circle on a diameter, as three tiles. */
const coordDiameterTiles: Generator<DiameterParams> = {
  id: 'coord-diameter-tiles',
  sample: (rng, difficulty) => sampleDiameter(rng, difficulty),
  render: (p): Slide => {
    const A = endA(p);
    const B = endB(p);
    const answer = [signedN(-p.a), signedN(-p.b), String(p.r2)];
    const slips = [signedN(p.a), signedN(p.b), String(4 * p.r2), String(2 * p.r2)];
    if (A[0] !== 0) slips.push(signedN(-A[0]));
    return {
      kind: 'tiles',
      prompt: [say(`$AB$ is a diameter of a circle, with $${namedAt('A', A)}$ and $${namedAt('B', B)}$. Write the circle's equation.`)],
      template: '(x {0})^2 + (y {1})^2 = {2}',
      bank: bank(answer, slips, [p.r2], 2),
      answer,
    };
  },
  solution: (p) => [...diameterSolution(p), { tex: circleTex(p.a, p.b, p.r2) }],
};

interface DiameterR2Params extends DiameterParams {
  /** Difficulty 2 gives the circle multiplied out, its number unknown. */
  expanded: boolean;
}

/** r^2 of the circle on a diameter; at difficulty 2 the number in its expanded form. */
const coordDiameterR2: Generator<DiameterR2Params> = {
  id: 'coord-diameter-r2',
  sample: (rng, difficulty) => ({
    ...sampleDiameter(rng, difficulty, (p) => p.a * p.a + p.b * p.b !== p.r2),
    expanded: difficulty > 1,
  }),
  render: (p): Slide => {
    const A = namedAt('A', endA(p));
    const B = namedAt('B', endB(p));
    return {
      kind: 'expression',
      prompt: p.expanded
        ? [
            say(`The circle with diameter $AB$, where $${A}$ and $${B}$, is written below. Find $k$.`),
            wrapped(`${sumTex(['x^2', 'y^2', termOf(q(-2 * p.a)), termOf(q(-2 * p.b), 'y')])} + k = 0`),
          ]
        : [say(`$${A}$ and $${B}$ are the ends of a diameter of a circle. Find $r^2$.`)],
      lead: p.expanded ? 'k =' : 'r^2 =',
      keypad: [],
      answer: String(p.expanded ? p.a * p.a + p.b * p.b - p.r2 : p.r2),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const centre = p.a * p.a + p.b * p.b;
    if (p.expanded) return intOptions(centre - p.r2, [centre - 4 * p.r2, centre + p.r2, -p.r2, p.r2]);
    return intOptions(p.r2, [4 * p.r2, 2 * p.r2, 2 * Math.abs(p.v[0]) + 2 * Math.abs(p.v[1])], 1);
  },
  solution: (p) => [
    ...diameterSolution(p),
    ...(p.expanded
      ? [
          {
            text: `Multiplied out, $(x - a)^2 + (y - b)^2 = r^2$ has the number $a^2 + b^2 - r^2$, so $k = ${p.a * p.a} + ${p.b * p.b} - ${p.r2} = ${p.a * p.a + p.b * p.b - p.r2}$.`,
          },
        ]
      : []),
  ],
};

/** The centre, then r^2, then the circle, one tap at a time. */
const coordDiameterSteps: Generator<DiameterParams> = {
  id: 'coord-diameter-steps',
  sample: (rng, difficulty) => sampleDiameter(rng, difficulty),
  render: (p): Slide => {
    const A = endA(p);
    const B = endB(p);
    const centre = `C = ${pt(p.a, p.b)}`;
    const radius = `r^2 = ${p.r2}`;
    const circle = circleTex(p.a, p.b, p.r2);
    return {
      kind: 'steps',
      prompt: [
        say(
          `$AB$ is a diameter of a circle, with $${namedAt('A', A)}$ and $${namedAt('B', B)}$. Find the circle's equation: tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: [
        `C = \\left(\\frac{${A[0]} + ${paren(B[0])}}{2}, \\frac{${A[1]} + ${paren(B[1])}}{2}\\right)`,
        ',',
        'r^2 = \\tfrac{1}{4}AB^2',
      ],
      reductions: [
        {
          span: [0, 1],
          value: centre,
          bank: stepBank(centre, `C = ${pt(A[0] + B[0], A[1] + B[1])}`, `C = ${pt(p.v[0], p.v[1])}`, `C = ${pt(-p.a, -p.b)}`),
        },
        {
          span: [2, 3],
          value: radius,
          bank: stepBank(radius, `r^2 = ${4 * p.r2}`, `r^2 = ${2 * p.r2}`, `r^2 = ${16 * p.r2}`),
        },
        {
          span: [0, 3],
          value: circle,
          bank: stepBank(circle, circleTex(-p.a, -p.b, p.r2), circleTex(p.a, p.b, 4 * p.r2), circleTex(-p.a, -p.b, 4 * p.r2)),
        },
      ],
    };
  },
  solution: (p) => [...diameterSolution(p), { tex: circleTex(p.a, p.b, p.r2) }],
};

interface DiameterSliderParams extends DiameterParams {
  axis: 'x' | 'y';
}

/** The circle and its diameter drawn: slide to the centre, across (difficulty 1) or up (difficulty 2). */
const coordDiameterSlider: Generator<DiameterSliderParams> = {
  id: 'coord-diameter-slider',
  sample: (rng, difficulty) => ({
    ...sampleDiameter(rng, difficulty, (p) => fits(p.a, p.b, p.r2)),
    axis: difficulty > 1 ? 'y' : 'x',
  }),
  render: (p): Slide => {
    const A = endA(p);
    const B = endB(p);
    return {
      kind: 'slider',
      prompt: [
        say(
          `$AB$ is a diameter of the circle drawn, with $${namedAt('A', A)}$ and $${namedAt('B', B)}$. Find the centre, and slide to its ${p.axis === 'x' ? '$x$-coordinate' : 'height'}.`,
        ),
      ],
      min: -9,
      max: 9,
      step: 1,
      answer: p.axis === 'x' ? p.a : p.b,
      readout: `${p.axis} = {v}`,
      figure: {
        svg: plotWithCircles(
          {
            xMin: -10,
            xMax: 10,
            yMin: -10,
            yMax: 10,
            curves: [segment(A[0], A[1], B[0], B[1])],
            marks: [
              { x: A[0], y: A[1] },
              { x: B[0], y: B[1] },
            ],
            label: 'A circle with a diameter drawn across it between two marked points',
          },
          [{ h: p.a, k: p.b, r2: p.r2 }],
        ),
        axis: p.axis,
        ...markerWindow(-10, 10, p.axis, SQUARE),
      },
    };
  },
  solution: (p) => [...diameterSolution(p).slice(0, 2), { text: `So the centre is $${named('C', p.a, p.b)}$.` }],
};

/* ---------- lesson 3: a circle through three points ---------- */

interface ThreeParams {
  a: number;
  b: number;
  r2: number;
  /** From the centre to P, Q and R. */
  u: Pt;
  v: Pt;
  w: Pt;
}

const threeOf = ({ a, b, u, v, w }: ThreeParams): [Pt, Pt, Pt] => [offsetBy(a, b, u), offsetBy(a, b, v), offsetBy(a, b, w)];

/** The perpendicular bisector of the chord XY of a circle centred at (a, b): it runs through the centre. */
function bisectorOf(a: number, b: number, X: Pt, Y: Pt): { m: Q; c: Q } {
  const m = perp(slopeOf(X, Y));
  return { m, c: sub(q(b), mul(m, q(a))) };
}

/** A chord's perpendicular bisector as the learner writes it, including the upright and level ones. */
function bisectorLine(a: number, b: number, X: Pt, Y: Pt): string {
  if (X[1] === Y[1]) return `x = ${(X[0] + Y[0]) / 2}`;
  if (X[0] === Y[0]) return `y = ${(X[1] + Y[1]) / 2}`;
  const { m, c } = bisectorOf(a, b, X, Y);
  return lineTex(m, c);
}

const threeNamed = ([P, Q2, R]: [Pt, Pt, Pt]): string => `$${namedAt('P', P)}$, $${namedAt('Q', Q2)}$ and $${namedAt('R', R)}$`;

/**
 * Three lattice points of a circle about a centre off both axes, with PQ and
 * QR each slanted and each bisector's c whole, so the working stays in whole
 * numbers and small fractions.
 */
function sampleThree(rng: Rng, difficulty: number, keep: (p: ThreeParams) => boolean = () => true): ThreeParams {
  for (;;) {
    const r2 = rng.pick(radiiFor(difficulty));
    const points = onCircle(r2);
    const params = { a: nz(rng, 4), b: nz(rng, 4), r2, u: rng.pick(points), v: rng.pick(points), w: rng.pick(points) };
    const [P, Q2, R] = threeOf(params);
    if (!slanted(P, Q2) || !slanted(Q2, R) || samePt(P, R)) continue;
    if (bisectorOf(params.a, params.b, P, Q2).c.d !== 1 || bisectorOf(params.a, params.b, Q2, R).c.d !== 1) continue;
    if (!keep(params)) continue;
    return params;
  }
}

/** Two bisectors, where they meet, and r^2 from the centre to P. */
function threeSolution(p: ThreeParams): SolutionStep[] {
  const [P, Q2, R] = threeOf(p);
  return [
    { text: 'The centre is on the perpendicular bisector of every chord, so two chords are enough. The bisectors of $PQ$ and $QR$ are' },
    { tex: `\\begin{gathered} ${bisectorLine(p.a, p.b, P, Q2)} \\\\ ${bisectorLine(p.a, p.b, Q2, R)} \\end{gathered}` },
    { text: `They meet at the centre, $${named('C', p.a, p.b)}$. The radius runs from $C$ to any of the points, say $P$:` },
    { tex: narrowDistance('r', P[0], p.a, P[1], p.b) },
  ];
}

/** The perpendicular bisector of PQ, one piece at a time: midpoint, gradient, line. */
const coordThreeBisectorSteps: Generator<ThreeParams> = {
  id: 'coord-three-bisector-steps',
  sample: (rng, difficulty) =>
    sampleThree(rng, difficulty, (p) => {
      const [P, Q2] = threeOf(p);
      const { m, c } = bisectorOf(p.a, p.b, P, Q2);
      const even = (P[0] + Q2[0]) % 2 === 0 && (P[1] + Q2[1]) % 2 === 0;
      return even && c.n !== 0 && (difficulty > 1 ? m.d > 1 : m.d === 1);
    }),
  render: (p): Slide => {
    const [P, Q2, R] = threeOf(p);
    const mid: Pt = [(P[0] + Q2[0]) / 2, (P[1] + Q2[1]) / 2];
    const mPQ = slopeOf(P, Q2);
    const { m, c } = bisectorOf(p.a, p.b, P, Q2);
    const midStep = `M = ${pt(...mid)}`;
    const gradStep = `m = ${qTex(m)}`;
    const line = lineTex(m, c);
    const through = (g: Q) => sub(q(mid[1]), mul(g, q(mid[0])));
    return {
      kind: 'steps',
      prompt: [
        say(
          `${threeNamed([P, Q2, R])} lie on a circle, so its centre is on the perpendicular bisector of $PQ$. Find that bisector: tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: [
        `M = \\left(\\frac{${P[0]} + ${paren(Q2[0])}}{2}, \\frac{${P[1]} + ${paren(Q2[1])}}{2}\\right)`,
        ',',
        `m = -1 \\div ${slopeFormula(P, Q2)}`,
      ],
      reductions: [
        {
          span: [0, 1],
          value: midStep,
          bank: stepBank(
            midStep,
            `M = ${pt(P[0] + Q2[0], P[1] + Q2[1])}`,
            `M = ${pt((Q2[0] - P[0]) / 2, (Q2[1] - P[1]) / 2)}`,
            `M = ${pt(mid[1], mid[0])}`,
          ),
        },
        {
          span: [2, 3],
          value: gradStep,
          bank: stepBank(gradStep, `m = ${qTex(mPQ)}`, `m = ${qTex(neg(m))}`, `m = ${qTex(neg(mPQ))}`),
        },
        {
          span: [0, 3],
          value: line,
          bank: stepBank(line, lineTex(m, neg(c)), lineTex(mPQ, through(mPQ)), lineTex(neg(m), through(neg(m)))),
        },
      ],
    };
  },
  solution: (p) => {
    const [P, Q2] = threeOf(p);
    const mid: Pt = [(P[0] + Q2[0]) / 2, (P[1] + Q2[1]) / 2];
    const mPQ = slopeOf(P, Q2);
    const { m, c } = bisectorOf(p.a, p.b, P, Q2);
    return [
      { text: 'The perpendicular bisector of $PQ$ passes through its midpoint $M$, at a right angle to $PQ$:' },
      { tex: chain(`M &= ${pt(...mid)}`, `m_{PQ} &= ${slopeFormula(P, Q2)} = ${qTex(mPQ)}`, `m &= -1 \\div ${qParen(mPQ)} = ${qTex(m)}`) },
      { tex: chain(`${mid[1]} &= ${qTex(m)} \\times ${paren(mid[0])} + c`, `c &= ${qTex(c)}`) },
      { tex: lineTex(m, c) },
    ];
  },
};

/** The two bisectors given: where they meet, then the centre's y, then r^2. */
const coordCircumcentreTree: Generator<ThreeParams> = {
  id: 'coord-circumcentre-tree',
  sample: (rng, difficulty) =>
    sampleThree(rng, difficulty, (p) => {
      const [P, Q2, R] = threeOf(p);
      const whole = bisectorOf(p.a, p.b, P, Q2).m.d === 1 && bisectorOf(p.a, p.b, Q2, R).m.d === 1;
      return difficulty > 1 ? !whole : whole;
    }),
  render: (p): Slide => {
    const [P, Q2, R] = threeOf(p);
    const answer = [String(p.a), String(p.b), String(p.r2)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${threeNamed([P, Q2, R])} lie on a circle. The perpendicular bisectors of $PQ$ and $QR$ are shown; both pass through its centre $C$. Top row: the $x$-coordinate of $C$, where they meet. Then its $y$-coordinate. Then $r^2 = CP^2$.`,
        ),
      ],
      expression: `\\begin{gathered} ${bisectorLine(p.a, p.b, P, Q2)} \\\\ ${bisectorLine(p.a, p.b, Q2, R)} \\end{gathered}`,
      nodes: [
        { id: 'x', from: [] },
        { id: 'y', from: ['x'] },
        { id: 'r2', from: ['x', 'y'] },
      ],
      bank: bank(answer, [String(-p.a), String(-p.b), String(2 * p.r2), String(P[0] * P[0] + P[1] * P[1])], [p.a, p.b]),
      answer,
    };
  },
  solution: (p) => {
    const [P, Q2, R] = threeOf(p);
    const one = bisectorOf(p.a, p.b, P, Q2);
    const two = bisectorOf(p.a, p.b, Q2, R);
    return [
      { text: 'The centre is on both bisectors, so their right-hand sides are equal there:' },
      { tex: chain(`${rhsTex(one.m, one.c)} &= ${rhsTex(two.m, two.c)}`, `x &= ${p.a}`) },
      { text: `Then $y = ${qTex(one.m)} \\times ${paren(p.a)} ${signed(qTex(one.c))} = ${p.b}$, so the centre is $${named('C', p.a, p.b)}$.` },
      { tex: narrowDistance('CP', P[0], p.a, P[1], p.b) },
    ];
  },
};

/**
 * The circle through three points, as three tiles. At difficulty 1, PQ runs
 * straight across and QR straight up, so the two bisectors are a vertical and
 * a horizontal line; at difficulty 2 both are slanted.
 */
const coordThreePointsTiles: Generator<ThreeParams> = {
  id: 'coord-three-points-tiles',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return sampleThree(rng, difficulty);
    const r2 = rng.pick(radiiFor(1));
    const [x, y] = rng.pick(latticeVectors(r2));
    return { a: nz(rng, 4), b: nz(rng, 4), r2, u: [-x, y], v: [x, y], w: [x, -y] };
  },
  render: (p): Slide => {
    const [P] = threeOf(p);
    const answer = [signedN(-p.a), signedN(-p.b), String(p.r2)];
    return {
      kind: 'tiles',
      prompt: [say(`Find the circle through ${threeNamed(threeOf(p))}.`)],
      template: '(x {0})^2 + (y {1})^2 = {2}',
      bank: bank(answer, [signedN(p.a), signedN(p.b), String(2 * p.r2), String(P[0] * P[0] + P[1] * P[1])], [p.r2], 2),
      answer,
    };
  },
  solution: (p) => [...threeSolution(p), { tex: circleTex(p.a, p.b, p.r2) }],
};

interface ThreeR2Params extends ThreeParams {
  /** Difficulty 1 shows the two bisectors; difficulty 2 only the points. */
  withBisectors: boolean;
}

/** r^2 of the circle through three points. */
const coordThreePointsR2: Generator<ThreeR2Params> = {
  id: 'coord-three-points-r2',
  sample: (rng, difficulty) => ({ ...sampleThree(rng, difficulty), withBisectors: difficulty === 1 }),
  render: (p): Slide => {
    const [P, Q2, R] = threeOf(p);
    return {
      kind: 'expression',
      prompt: p.withBisectors
        ? [
            say(`A circle passes through ${threeNamed([P, Q2, R])}. The perpendicular bisectors of $PQ$ and $QR$ are below. Find $r^2$.`),
            show(`\\begin{gathered} ${bisectorLine(p.a, p.b, P, Q2)} \\\\ ${bisectorLine(p.a, p.b, Q2, R)} \\end{gathered}`),
          ]
        : [say(`A circle passes through ${threeNamed([P, Q2, R])}. Find $r^2$.`)],
      lead: 'r^2 =',
      keypad: [],
      answer: String(p.r2),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const [P] = threeOf(p);
    return intOptions(p.r2, [2 * p.r2, P[0] * P[0] + P[1] * P[1], (P[0] + p.a) ** 2 + (P[1] + p.b) ** 2], 1);
  },
  solution: threeSolution,
};

/* ---------- lesson 4: chords and tangents together ---------- */

type Fact = 'chord' | 'tangent' | 'semicircle';

const FACTS: Record<Fact, string> = {
  chord: 'The line from the centre to the midpoint of a chord is perpendicular to it',
  tangent: 'The tangent is perpendicular to the radius',
  semicircle: 'The angle in a semicircle is a right angle',
};

interface FactParams extends Diameter {
  fact: Fact;
  r2: number;
  /** chord: centre to M; tangent: centre to T; semicircle: centre to P. */
  s: Pt;
  /** Difficulty 2 gives the circle multiplied out. */
  expanded: boolean;
}

/** The gradient that is known: CM, CT, or AP. */
function knownSlope(p: FactParams): Q {
  const S = offsetBy(p.a, p.b, p.s);
  return p.fact === 'semicircle' ? slopeOf(endA(p), S) : slopeOf([p.a, p.b], S);
}

/** Which fact, then the gradient it gives: a chord's, a tangent's, or BP's in a semicircle. */
const coordChordFactFlow: Generator<FactParams> = {
  id: 'coord-chord-fact-flow',
  sample: (rng, difficulty) => {
    const fact = rng.pick(['chord', 'tangent', 'semicircle'] as const);
    const expanded = difficulty > 1;
    if (fact === 'semicircle') {
      const { a, b, r2, v, p } = sampleSemicircle(rng, difficulty);
      return { fact, a, b, r2, v, s: p, expanded };
    }
    const [a, b] = sampleCentre(rng, 1);
    if (fact === 'chord') {
      const s: Pt = [nz(rng, 4), nz(rng, 4)];
      return { fact, a, b, r2: s[0] * s[0] + s[1] * s[1] + rng.int(1, 5) ** 2, v: [0, 0], s, expanded };
    }
    const r2 = rng.pick(radiiFor(difficulty));
    return { fact, a, b, r2, v: [0, 0], s: rng.pick(latticeVectors(r2)), expanded };
  },
  render: (p): Slide => {
    const known = knownSlope(p);
    const answer = perp(known);
    const S = offsetBy(p.a, p.b, p.s);
    const circle = circleShown(p.a, p.b, p.r2, p.expanded);
    const scene: Record<Fact, string> = {
      chord: p.expanded
        ? `$${namedAt('M', S)}$ is the midpoint of a chord $AB$ of the circle $${circle}$. What is the gradient of $AB$?`
        : `$${namedAt('M', S)}$ is the midpoint of a chord $AB$ of a circle with centre $${named('C', p.a, p.b)}$. What is the gradient of $AB$?`,
      tangent: `$${namedAt('T', S)}$ lies on the circle $${circle}$. What is the gradient of the tangent at $T$?`,
      semicircle: `$AB$ is a diameter of a circle, with $${namedAt('A', endA(p))}$, and $${namedAt('P', S)}$ is on the circle. What is the gradient of $BP$?`,
    };
    const subject: Record<Fact, string> = { chord: 'm_{AB}', tangent: 'm_{\\text{tangent}}', semicircle: 'm_{BP}' };
    const labels = forkLabels([answer, known, neg(answer), neg(known)]);
    const facts = turned(Object.values(FACTS), `${p.fact}|${S}|${p.a}|${p.b}`);
    return {
      kind: 'flow',
      prompt: [say(scene[p.fact])],
      subject: subject[p.fact],
      steps: [
        { id: 'fact', ask: 'Which fact gives it?', branches: facts.map((label) => ({ label, to: 'gradient' })) },
        {
          id: 'gradient',
          ask: 'Then what is the gradient?',
          branches: turned(labels, labels.join('|')).map((label) => ({ label, outcome: `So the gradient is ${label}.` })),
        },
      ],
      answer: [FACTS[p.fact], labels[0]],
    };
  },
  solution: (p) => {
    const known = knownSlope(p);
    const S = offsetBy(p.a, p.b, p.s);
    const lead: Record<Fact, SolutionStep[]> = {
      chord: [
        ...centreFrom(p.a, p.b, p.r2, p.expanded),
        { text: 'The line from the centre to the midpoint of a chord meets the chord at a right angle.' },
        { tex: `m_{CM} = ${slopeFormula([p.a, p.b], S)} = ${qTex(known)}` },
      ],
      tangent: [
        ...centreFrom(p.a, p.b, p.r2, p.expanded),
        { text: `The tangent at $T$ is perpendicular to the radius $CT$, from $${named('C', p.a, p.b)}$.` },
        { tex: `m_{CT} = ${slopeFormula([p.a, p.b], S)} = ${qTex(known)}` },
      ],
      semicircle: [
        { text: 'The angle in a semicircle is a right angle, so $BP$ is perpendicular to $AP$.' },
        { tex: `m_{AP} = ${slopeFormula(endA(p), S)} = ${qTex(known)}` },
      ],
    };
    return [...lead[p.fact], { tex: `m = -1 \\div ${qParen(known)} = ${qTex(perp(known))}` }];
  },
};

interface ChordDistanceParams {
  a: number;
  b: number;
  /** From the centre to the chord's midpoint M, of whole length d. */
  u: Pt;
  d: number;
  /** From M to B; A is the other way. */
  w: Pt;
  /** Difficulty 2 gives the circle multiplied out rather than its centre. */
  expanded: boolean;
}

const chordEnds = ({ a, b, u, w }: ChordDistanceParams): [Pt, Pt] => [
  [a + u[0] - w[0], b + u[1] - w[1]],
  [a + u[0] + w[0], b + u[1] + w[1]],
];

const chordR2 = ({ u, w }: ChordDistanceParams): number => u[0] * u[0] + u[1] * u[1] + w[0] * w[0] + w[1] * w[1];

/**
 * How far a chord is from the centre: CM, where M is its midpoint. CM runs
 * straight across or up, or along a 3-4-5 triple from the table at
 * difficulty 2, so the distance is whole without rooting anything but a
 * square.
 */
const coordChordDistance: Generator<ChordDistanceParams> = {
  id: 'coord-chord-distance',
  sample: (rng, difficulty) => {
    const [a, b] = sampleCentre(rng, 1);
    if (difficulty > 1 && rng.chance(0.6)) {
      const [x, y, c] = rng.pick(TRIPLES.filter((row) => row[2] === 5));
      const u: Pt = [x * rng.sign(), y * rng.sign()];
      const t = rng.sign();
      return { a, b, u, d: c, w: [-u[1] * t, u[0] * t], expanded: true };
    }
    const d = rng.int(1, 6);
    const t = rng.int(1, 6) * rng.sign();
    const across = rng.chance(0.5);
    const u: Pt = across ? [0, d * rng.sign()] : [d * rng.sign(), 0];
    return { a, b, u, d, w: across ? [t, 0] : [0, t], expanded: difficulty > 1 };
  },
  render: (p): Slide => {
    const [A, B] = chordEnds(p);
    const where = p.expanded
      ? `the circle $${expandedTex(p.a, p.b, chordR2(p))}$`
      : `a circle with centre $${named('C', p.a, p.b)}$`;
    return {
      kind: 'expression',
      prompt: [say(`$${namedAt('A', A)}$ and $${namedAt('B', B)}$ lie on ${where}. How far is the chord $AB$ from the centre?`)],
      lead: 'd =',
      keypad: [],
      answer: String(p.d),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    // Half the chord: |w|, which is d again for the 3-4-5 chords.
    const half = p.w[0] === 0 || p.w[1] === 0 ? Math.abs(p.w[0] + p.w[1]) : p.d;
    return intOptions(p.d, [p.d * p.d, half, 2 * p.d, p.d + half], 1);
  },
  solution: (p) => {
    const [A, B] = chordEnds(p);
    const M = offsetBy(p.a, p.b, p.u);
    return [
      ...centreFrom(p.a, p.b, chordR2(p), p.expanded),
      { text: 'The perpendicular from the centre to a chord meets it at the chord\'s midpoint $M$, so the distance is $CM$:' },
      { tex: chain(`x_M &= \\frac{${A[0]} + ${paren(B[0])}}{2} = ${M[0]}`, `y_M &= \\frac{${A[1]} + ${paren(B[1])}}{2} = ${M[1]}`) },
      { tex: narrowDistance('CM', M[0], p.a, M[1], p.b) },
      { text: `So $CM = \\sqrt{${p.d * p.d}} = ${p.d}$.` },
    ];
  },
};

type CentreLine = 'y-axis' | 'diagonal';

interface ChordTangentParams {
  /** The centre is (0, t) on the y-axis, or (t, t) on y = x. */
  t: number;
  line: CentreLine;
  r2: number;
  /** From the centre to A and to B. */
  u: Pt;
  v: Pt;
}

const chordTangentCentre = ({ t, line }: ChordTangentParams): Pt => (line === 'y-axis' ? [0, t] : [t, t]);

/** The tangent at A: perpendicular to CA, through A. */
function chordTangentLine(p: ChordTangentParams): { m: Q; c: Q } {
  const C = chordTangentCentre(p);
  const A = offsetBy(C[0], C[1], p.u);
  const m = perp(slopeOf(C, A));
  return { m, c: sub(q(A[1]), mul(m, q(A[0]))) };
}

/**
 * A chord AB of a circle whose centre is known only to lie on a line: the
 * chord's bisector meets that line at the centre, and then the tangent at A
 * is perpendicular to CA. The y-axis at difficulty 1, the line y = x at 2.
 */
const coordChordTangentTiles: Generator<ChordTangentParams> = {
  id: 'coord-chord-tangent-tiles',
  sample: (rng, difficulty) => {
    const line: CentreLine = difficulty > 1 ? 'diagonal' : 'y-axis';
    for (;;) {
      const r2 = rng.pick(radiiFor(difficulty));
      const points = onCircle(r2);
      const params = { t: nz(rng, 4), line, r2, u: rng.pick(points), v: rng.pick(points) };
      const [du, dv] = [params.v[0] - params.u[0], params.v[1] - params.u[1]];
      if (du === 0 && dv === 0) continue;
      // The chord's bisector has to cross the centre's line at one point.
      if (line === 'y-axis' ? dv === 0 : du === -dv) continue;
      if (params.u[0] === 0 || params.u[1] === 0) continue;
      const { c } = chordTangentLine(params);
      if (c.d !== 1 || c.n === 0) continue;
      return params;
    }
  },
  render: (p): Slide => {
    const C = chordTangentCentre(p);
    const A = offsetBy(C[0], C[1], p.u);
    const B = offsetBy(C[0], C[1], p.v);
    const { m, c } = chordTangentLine(p);
    const radius = slopeOf(C, A);
    const answer = [termOf(m), signedN(c.n)];
    const slips = [termOf(radius), termOf(neg(m)), signedN(-c.n)];
    const wrongC = sub(q(A[1]), mul(radius, q(A[0])));
    if (wrongC.d === 1 && wrongC.n !== 0) slips.push(signedN(wrongC.n));
    return {
      kind: 'tiles',
      prompt: [
        say(
          `The circle through $${namedAt('A', A)}$ and $${namedAt('B', B)}$ has its centre on ${p.line === 'y-axis' ? 'the $y$-axis' : 'the line $y = x$'}. Find the tangent to the circle at $A$.`,
        ),
      ],
      template: 'y = {0} {1}',
      bank: signedBank(answer, slips, [c.n]),
      answer,
    };
  },
  solution: (p) => {
    const C = chordTangentCentre(p);
    const [A, B] = [offsetBy(C[0], C[1], p.u), offsetBy(C[0], C[1], p.v)];
    const { m, c } = chordTangentLine(p);
    const onAxis = p.line === 'y-axis';
    const side = ([x, y]: Pt) => (onAxis ? `${paren(x)}^2 + (${y} - t)^2` : `(${x} - t)^2 + (${y} - t)^2`);
    const k = onAxis ? 2 * (B[1] - A[1]) : 2 * (B[0] + B[1] - A[0] - A[1]);
    const rhs = B[0] ** 2 + B[1] ** 2 - A[0] ** 2 - A[1] ** 2;
    return [
      {
        text: `The centre is on the perpendicular bisector of the chord $AB$, so it is as far from $A$ as from $B$. Call it $${onAxis ? 'C(0, t)' : 'C(t, t)'}$ and set $CA^2 = CB^2$; the $t^2$ terms cancel:`,
      },
      { tex: chain(`&${side(A)}`, `&\\quad = ${side(B)}`, `&${termOf(q(k), 't')} = ${rhs}`, `&t = ${p.t}`) },
      {
        text: `So the centre is $${namedAt('C', C)}$. The radius $CA$ has gradient $${qTex(slopeOf(C, A))}$, and the tangent at $A$ is perpendicular to it, with gradient $${qTex(m)}$.`,
      },
      { tex: chain(`${A[1]} &= ${qTex(m)} \\times ${paren(A[0])} + c`, `c &= ${c.n}`) },
      { tex: lineTex(m, c) },
    ];
  },
};

interface MidChordParams {
  a: number;
  b: number;
  /** From the centre to the chord's midpoint M. */
  u: Pt;
  /** Half the chord, for a circle that M is inside. */
  h: number;
  /** Difficulty 2 gives the circle multiplied out rather than its centre. */
  expanded: boolean;
}

/** The chord through M: perpendicular to CM, through M. */
function midChord({ a, b, u }: MidChordParams): { cm: Q; m: Q; c: Q } {
  const cm = q(u[1], u[0]);
  const m = perp(cm);
  return { cm, m, c: sub(q(b + u[1]), mul(m, q(a + u[0]))) };
}

/** The chord with a given midpoint: CM's gradient, the chord's, then its c. */
const coordChordFromMidpointTree: Generator<MidChordParams> = {
  id: 'coord-chord-from-midpoint-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const [a, b] = sampleCentre(rng, 1);
      const top = difficulty > 1 ? 6 : 4;
      const params = { a, b, u: [nz(rng, top), nz(rng, top)] as Pt, h: rng.int(1, 5), expanded: difficulty > 1 };
      if (midChord(params).c.d !== 1) continue;
      return params;
    }
  },
  render: (p): Slide => {
    const M = offsetBy(p.a, p.b, p.u);
    const { cm, m, c } = midChord(p);
    const r2 = p.u[0] ** 2 + p.u[1] ** 2 + p.h * p.h;
    const answer = [qTex(cm), qTex(m), String(c.n)];
    const slips = [qTex(neg(cm)), qTex(inv(cm)), qTex(neg(m)), String(-c.n)];
    const wrongC = sub(q(M[1]), mul(cm, q(M[0])));
    if (wrongC.d === 1) slips.push(String(wrongC.n));
    const where = p.expanded ? `the circle $${expandedTex(p.a, p.b, r2)}$` : `a circle with centre $${named('C', p.a, p.b)}$`;
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${namedAt('M', M)}$ is the midpoint of a chord $AB$ of ${where}. Find the chord's equation. Top row: the gradient of $CM$. Then the gradient of $AB$. Then $c$.`,
        ),
      ],
      expression: 'AB:\\ y = mx + c',
      nodes: [
        { id: 'cm', from: [] },
        { id: 'ab', from: ['cm'] },
        { id: 'c', from: ['ab'] },
      ],
      bank: bank(answer, slips, [c.n]),
      answer,
    };
  },
  solution: (p) => {
    const M = offsetBy(p.a, p.b, p.u);
    const { cm, m, c } = midChord(p);
    const r2 = p.u[0] ** 2 + p.u[1] ** 2 + p.h * p.h;
    return [
      ...centreFrom(p.a, p.b, r2, p.expanded),
      { text: 'The line from the centre to the midpoint of a chord is perpendicular to the chord:' },
      { tex: chain(`m_{CM} &= ${slopeFormula([p.a, p.b], M)} = ${qTex(cm)}`, `m_{AB} &= -1 \\div ${qParen(cm)} = ${qTex(m)}`) },
      { tex: chain(`${M[1]} &= ${qTex(m)} \\times ${paren(M[0])} + c`, `c &= ${c.n}`) },
      { tex: lineTex(m, c) },
    ];
  },
};

/* ---------- lesson 5: putting it together ---------- */

type Theorem = 'semicircle' | 'bisector' | 'tangent' | 'diameter';

const THEOREMS: Record<Theorem, string> = {
  semicircle: 'The angle in a semicircle is a right angle',
  bisector: 'The perpendicular bisector of a chord passes through the centre',
  tangent: 'The tangent is perpendicular to the radius',
  diameter: 'The centre is the midpoint of a diameter',
};

interface TheoremParams {
  theorem: Theorem;
  a: number;
  b: number;
  r2: number;
  /** semicircle: diameter and P; bisector: P, Q, R; tangent: T; diameter: B. */
  u: Pt;
  v: Pt;
  w: Pt;
  expanded: boolean;
}

/** Which fact does the work: from a scene with the learner's numbers in it. */
const coordWhichTheorem: Generator<TheoremParams> = {
  id: 'coord-which-theorem',
  sample: (rng, difficulty) => {
    const theorem = rng.pick(['semicircle', 'bisector', 'tangent', 'diameter'] as const);
    const expanded = difficulty > 1;
    if (theorem === 'semicircle') {
      const { a, b, r2, v, p } = sampleSemicircle(rng, difficulty);
      return { theorem, a, b, r2, u: v, v: p, w: [0, 0], expanded };
    }
    if (theorem === 'bisector') return { theorem, ...sampleThree(rng, difficulty), expanded };
    const [a, b] = sampleCentre(rng, 1);
    const r2 = rng.pick(radiiFor(difficulty));
    return { theorem, a, b, r2, u: rng.pick(latticeVectors(r2)), v: [0, 0], w: [0, 0], expanded };
  },
  render: (p): Slide => {
    const at = (s: Pt) => offsetBy(p.a, p.b, s);
    const circle = circleShown(p.a, p.b, p.r2, p.expanded);
    const scene: Record<Theorem, () => string> = {
      semicircle: () =>
        `$${namedAt('A', endA({ a: p.a, b: p.b, v: p.u }))}$ and $${namedAt('B', at(p.u))}$ are the ends of a diameter of a circle through $${namedAt('P', at(p.v))}$. Which fact says at once what the angle $APB$ is?`,
      bisector: () => `A circle passes through ${threeNamed([at(p.u), at(p.v), at(p.w)])}. Which fact leads to its centre?`,
      tangent: () => `$${namedAt('T', at(p.u))}$ is on the circle $${circle}$. Which fact gives the gradient of the tangent at $T$?`,
      diameter: () => `$${namedAt('A', endA({ a: p.a, b: p.b, v: p.u }))}$ is one end of a diameter $AB$ of the circle $${circle}$. Which fact finds $B$?`,
    };
    const text = scene[p.theorem]();
    const order = turned(['semicircle', 'bisector', 'tangent', 'diameter'] as Theorem[], text);
    return {
      kind: 'choice',
      prompt: [say(text)],
      options: order.map((t, idx) => ({ id: `opt${idx}`, label: THEOREMS[t] })),
      correctId: `opt${order.indexOf(p.theorem)}`,
    };
  },
  solution: (p) => {
    const at = (s: Pt) => offsetBy(p.a, p.b, s);
    const centre = centreFrom(p.a, p.b, p.r2, p.expanded);
    if (p.theorem === 'semicircle') {
      const A = endA({ a: p.a, b: p.b, v: p.u });
      return [
        { text: 'A point on a circle sees a diameter at a right angle, so the angle $APB$ is $90^\\circ$. The gradients show it:' },
        ...semicircleSolution(A, at(p.u), at(p.v)),
      ];
    }
    if (p.theorem === 'bisector') return threeSolution({ a: p.a, b: p.b, r2: p.r2, u: p.u, v: p.v, w: p.w });
    if (p.theorem === 'tangent') {
      const radius = q(p.u[1], p.u[0]);
      return [
        ...centre,
        { text: `The tangent at $T$ is perpendicular to the radius $CT$, whose gradient is $${slopeFormula([p.a, p.b], at(p.u))} = ${qTex(radius)}$.` },
        { tex: `m = -1 \\div ${qParen(radius)} = ${qTex(perp(radius))}` },
      ];
    }
    const A = endA({ a: p.a, b: p.b, v: p.u });
    const B = at(p.u);
    return [
      ...centre,
      { text: `The centre $${named('C', p.a, p.b)}$ is the midpoint of $AB$, so $B$ is as far past $C$ as $A$ is short of it:` },
      { tex: chain(`x_B &= 2 \\times ${paren(p.a)} - ${paren(A[0])} = ${B[0]}`, `y_B &= 2 \\times ${paren(p.b)} - ${paren(A[1])} = ${B[1]}`) },
    ];
  },
};

interface OtherEndParams extends DiameterParams {
  /** Difficulty 2 gives the circle multiplied out. */
  expanded: boolean;
}

/** x_B = 2a - x_A, y_B = 2b - y_A, then the point. */
function otherEndSolution(p: OtherEndParams): SolutionStep[] {
  const A = endA(p);
  const B = endB(p);
  return [
    ...centreFrom(p.a, p.b, p.r2, p.expanded),
    { text: `The centre $${named('C', p.a, p.b)}$ is the midpoint of $AB$, so $B$ is as far past $C$ as $A$ is short of it:` },
    { tex: chain(`x_B &= 2 \\times ${paren(p.a)} - ${paren(A[0])} = ${B[0]}`, `y_B &= 2 \\times ${paren(p.b)} - ${paren(A[1])} = ${B[1]}`) },
    { text: `So $${namedAt('B', B)}$.` },
  ];
}

/** The far end of a diameter, one coordinate at a time. */
const coordOtherEndSteps: Generator<OtherEndParams> = {
  id: 'coord-other-end-steps',
  sample: (rng, difficulty) => ({ ...sampleDiameter(rng, difficulty), expanded: difficulty > 1 }),
  render: (p): Slide => {
    const A = endA(p);
    const B = endB(p);
    const xs = `x_B = ${B[0]}`;
    const ys = `y_B = ${B[1]}`;
    const point = `B = ${pt(...B)}`;
    return {
      kind: 'steps',
      prompt: [
        say(
          `$${namedAt('A', A)}$ is one end of a diameter $AB$ of the circle below. Its centre $C(a, b)$ is the midpoint of $AB$. Find $B$: tap the part you would work out **next**, then choose its value.`,
        ),
        p.expanded ? wrapped(expandedTex(p.a, p.b, p.r2)) : show(circleTex(p.a, p.b, p.r2)),
      ],
      start: ['x_B = 2a - x_A', ',', 'y_B = 2b - y_A'],
      reductions: [
        { span: [0, 1], value: xs, bank: stepBank(xs, `x_B = ${-2 * p.a - A[0]}`, `x_B = ${p.a - A[0]}`, `x_B = ${2 * p.a + A[0]}`) },
        { span: [2, 3], value: ys, bank: stepBank(ys, `y_B = ${-2 * p.b - A[1]}`, `y_B = ${p.b - A[1]}`, `y_B = ${2 * p.b + A[1]}`) },
        {
          span: [0, 3],
          value: point,
          bank: stepBank(point, `B = ${pt(B[1], B[0])}`, `B = ${pt(A[0] + p.a, A[1] + p.b)}`, `B = ${pt(-B[0], -B[1])}`),
        },
      ],
    };
  },
  solution: otherEndSolution,
};

/** The tangent at A: perpendicular to the radius, so its gradient is -v_x / v_y. */
function endTangents(p: DiameterParams): { m: Q; cA: Q; cB: Q } {
  const m = q(-p.v[0], p.v[1]);
  const [A, B] = [endA(p), endB(p)];
  return { m, cA: sub(q(A[1]), mul(m, q(A[0]))), cB: sub(q(B[1]), mul(m, q(B[0]))) };
}

/**
 * The tangents at the two ends of a diameter are parallel: given the one at
 * A, find c for the one at B.
 */
const coordParallelTangent: Generator<OtherEndParams> = {
  id: 'coord-parallel-tangent',
  sample: (rng, difficulty) => ({
    ...sampleDiameter(rng, difficulty, (p) => {
      const { cA, cB } = endTangents(p);
      return cA.d === 1 && cB.d === 1;
    }),
    expanded: difficulty > 1,
  }),
  render: (p): Slide => {
    const { m, cA } = endTangents(p);
    return {
      kind: 'expression',
      prompt: [
        say(
          `$AB$ is a diameter of the circle $${circleShown(p.a, p.b, p.r2, p.expanded)}$. The tangent at $${namedAt('A', endA(p))}$ is $${lineTex(m, cA)}$, and the tangent at $B$ is $y = ${termOf(m)} + c$. Find $c$.`,
        ),
      ],
      lead: 'c =',
      keypad: [],
      answer: String(endTangents(p).cB.n),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const { cA, cB } = endTangents(p);
    return intOptions(cB.n, [-cA.n, 2 * p.b - cA.n, cA.n, cB.n + 2 * (p.b - cB.n)]);
  },
  solution: (p) => {
    const { m, cB } = endTangents(p);
    const B = endB(p);
    return [
      ...otherEndSolution(p).slice(0, -1),
      { text: `Both tangents are perpendicular to the diameter $AB$, so they are parallel: the tangent at $B$ also has gradient $${qTex(m)}$. Through $B$:` },
      { tex: chain(`${B[1]} &= ${qTex(m)} \\times ${paren(B[0])} + c`, `c &= ${cB.n}`) },
    ];
  },
};

interface OtherEndSliderParams extends OtherEndParams {
  axis: 'x' | 'y';
}

/** The circle drawn with A marked: slide to the far end of the diameter, across (difficulty 1) or up (difficulty 2). */
const coordOtherEndSlider: Generator<OtherEndSliderParams> = {
  id: 'coord-other-end-slider',
  sample: (rng, difficulty) => ({
    ...sampleDiameter(rng, difficulty, (p) => fits(p.a, p.b, p.r2)),
    expanded: difficulty > 1,
    axis: difficulty > 1 ? 'y' : 'x',
  }),
  render: (p): Slide => {
    const A = endA(p);
    const B = endB(p);
    return {
      kind: 'slider',
      prompt: [
        say(
          `$${namedAt('A', A)}$ is one end of a diameter $AB$ of the circle $${circleShown(p.a, p.b, p.r2, p.expanded)}$, drawn with its centre. Find $B$, and slide to its ${p.axis === 'x' ? '$x$-coordinate' : 'height'}.`,
        ),
      ],
      min: -9,
      max: 9,
      step: 1,
      answer: p.axis === 'x' ? B[0] : B[1],
      readout: `${p.axis} = {v}`,
      figure: {
        svg: circleFigure(p.a, p.b, p.r2, [], [{ x: A[0], y: A[1] }], 'A circle with its centre and one marked point on it'),
        axis: p.axis,
        ...markerWindow(-10, 10, p.axis, SQUARE),
      },
    };
  },
  solution: otherEndSolution,
};

/* ================================================================
 * Level 5: coordinate proof
 *
 * A quadrilateral or a triangle named from its gradients and its squared
 * lengths. Every figure is built outward from its verdict: a parallelogram
 * ABCD from a vertex A and two lattice vectors u = AB and v = AD, so that
 * C = A + u + v; a rectangle from a vector and a multiple of its
 * perpendicular; a rhombus from two `latticeVectors` of one squared length;
 * a square from a vector and its perpendicular. So every gradient is a
 * fraction of whole numbers, every squared length is whole, and a right
 * angle is `mul(m1, m2)` equal to `q(-1)` as fractions, never a float. A
 * figure that is not the named shape is one with a vertex moved off it, and
 * its verdict is worked out again from the points rather than assumed from
 * the move. No length is ever rooted: a side is compared by its square.
 *
 * No area here: Areas and Loci is the next level. Nothing here is calculus,
 * so no slide declares `source`, `integrand` or `limits` and the oracle in
 * `generators.test.ts` has nothing to check; `coordinateGeometry.test.ts`
 * works every gradient, squared length, midpoint and verdict out again from
 * the vertices each prompt names.
 * ================================================================ */

const plusPt = ([x1, y1]: Pt, [x2, y2]: Pt): Pt => [x1 + x2, y1 + y2];
const minusPt = ([x1, y1]: Pt, [x2, y2]: Pt): Pt => [x1 - x2, y1 - y2];
const scalePt = (k: number, [x, y]: Pt): Pt => [k * x, k * y];
const dotPt = ([x1, y1]: Pt, [x2, y2]: Pt): number => x1 * x2 + y1 * y2;
const crossPt = ([x1, y1]: Pt, [x2, y2]: Pt): number => x1 * y2 - y1 * x2;

/** The squared length from P to R: whole, and never rooted. */
const dist2 = (P: Pt, R: Pt): number => dotPt(minusPt(R, P), minusPt(R, P));

/** Neither straight across nor straight up: a gradient that is a number and not zero. */
const slantedVec = ([x, y]: Pt): boolean => x !== 0 && y !== 0;

/** The shortest lattice step in the same direction. */
function primitive([x, y]: Pt): Pt {
  const g = gcd(x, y);
  return [x / g, y / g];
}

const inReach = (points: Pt[], reach = 9): boolean => points.every(([x, y]) => Math.abs(x) <= reach && Math.abs(y) <= reach);

const midOf = ([x1, y1]: Pt, [x2, y2]: Pt): Pt => [(x1 + x2) / 2, (y1 + y2) / 2];

/** Every turn the same way round, and none straight on: a proper convex polygon. */
function convex(P: Pt[]): boolean {
  const turns = P.map((X, i) => {
    const Y = P[(i + 1) % P.length];
    const Z = P[(i + 2) % P.length];
    return crossPt(minusPt(Y, X), minusPt(Z, Y));
  });
  return turns.every((t) => t > 0) || turns.every((t) => t < 0);
}

/** "$A(1, 2)$, $B(4, 3)$ and $C(5, 6)$", or with a fourth. */
function cornersNamed(points: Pt[], names: string[]): string {
  const parts = points.map((X, i) => `$${namedAt(names[i], X)}$`);
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** m_{AB} &= \frac{..}{..} = .., one line of an aligned block. */
const gradientLine = (label: string, P: Pt, R: Pt): string => `m_{${label}} &= ${slopeFormula(P, R)} = ${qTex(slopeOf(P, R))}`;

/** AB^2 &= 3^2 + 4^2 = 25, one line of an aligned block. */
function lengthLine(label: string, P: Pt, R: Pt): string {
  const [x, y] = minusPt(R, P);
  return `${label}^2 &= ${paren(x)}^2 + ${paren(y)}^2 = ${x * x + y * y}`;
}

/**
 * A corner found as another corner plus a step, one coordinate a line, since
 * both on one line is wider than a phone: x_D &= 3 + (-1) = 2, then y_D.
 */
function stepLines(letter: string, from: Pt, [dx, dy]: Pt): string[] {
  return [`x_${letter} &= ${from[0]} + ${paren(dx)} = ${from[0] + dx}`, `y_${letter} &= ${from[1]} + ${paren(dy)} = ${from[1] + dy}`];
}

/** Two gradients multiplied, with a negative second one bracketed. */
const productTex = (m1: Q, m2: Q): string => `${qTex(m1)} \\times ${qParen(m2)} = ${qTex(mul(m1, m2))}`;

/** A perpendicular pair: the product is -1 as a fraction, not a float near it. */
const perpendicular = (m1: Q, m2: Q): boolean => same(mul(m1, m2), q(-1));

/** "$\frac{1}{2}$ and $-2$": two gradients as one flow branch. */
const pairLabel = ([a, b]: [Q, Q]): string => `$${qTex(a)}$ and $${qTex(b)}$`;

/** Distinct pair labels, the first being the right one. */
function pairLabels(pairs: [Q, Q][]): string[] {
  const out: string[] = [];
  for (const pair of pairs) {
    const label = pairLabel(pair);
    if (!out.includes(label)) out.push(label);
  }
  return out.slice(0, 4);
}

/** Flow branches onward to one step, turned by a hash so the right one is not always first. */
const onward = (labels: string[], to: string) => turned(labels, labels.join('|')).map((label) => ({ label, to }));

/* ---------- quadrilaterals ---------- */

type Four = [Pt, Pt, Pt, Pt];

const QUAD = ['A', 'B', 'C', 'D'];

type QuadName = 'parallelogram' | 'rectangle' | 'rhombus' | 'square';

const ALL_QUADS: QuadName[] = ['parallelogram', 'rectangle', 'rhombus', 'square'];

/** The strongest name a parallelogram with sides AB = u and AD = v earns. */
function nameOf(u: Pt, v: Pt): QuadName {
  const right = dotPt(u, v) === 0;
  const equal = dotPt(u, u) === dotPt(v, v);
  if (right && equal) return 'square';
  if (right) return 'rectangle';
  return equal ? 'rhombus' : 'parallelogram';
}

interface QuadParams {
  A: Pt;
  /** AB. */
  u: Pt;
  /** AD, so C = A + u + v. */
  v: Pt;
  shape: QuadName;
}

const quadOf = ({ A, u, v }: QuadParams): Four => [A, plusPt(A, u), plusPt(A, plusPt(u, v)), plusPt(A, v)];

/** No side straight across or straight up, so all four gradients are numbers and not zero. */
const sidesSlanted = ({ u, v }: QuadParams): boolean => slantedVec(u) && slantedVec(v);

/** Neither diagonal straight across or straight up. */
const diagonalsSlanted = ({ u, v }: QuadParams): boolean => slantedVec(plusPt(u, v)) && slantedVec(minusPt(v, u));

/** The diagonals cross at a lattice point. */
const midWhole = ({ u, v }: QuadParams): boolean => (u[0] + v[0]) % 2 === 0 && (u[1] + v[1]) % 2 === 0;

/**
 * AB and AD for a parallelogram that earns exactly the name asked for:
 * a rhombus from two lattice vectors of one squared length, a rectangle or a
 * square from a vector and a multiple of its perpendicular.
 */
function sampleSides(rng: Rng, shape: QuadName, difficulty: number): [Pt, Pt] {
  const hard = difficulty > 1;
  for (;;) {
    let u: Pt;
    let v: Pt;
    if (shape === 'rhombus') {
      const vectors = latticeVectors(rng.pick(hard ? [17, 20, 25, 34] : [5, 10, 13]));
      [u, v] = [rng.pick(vectors), rng.pick(vectors)];
    } else if (shape === 'parallelogram') {
      const top = hard ? 5 : 3;
      [u, v] = [
        [nz(rng, top), rng.int(-top, top)],
        [rng.int(-top, top), nz(rng, top)],
      ];
    } else {
      const top = hard ? 3 : 2;
      const p = primitive([nz(rng, top), nz(rng, top)]);
      const g = rng.int(1, hard ? 3 : 2);
      const h = shape === 'square' ? g : rng.int(1, hard ? 3 : 2);
      [u, v] = [scalePt(g, p), scalePt(h * rng.sign(), [-p[1], p[0]])];
    }
    if (crossPt(u, v) === 0 || nameOf(u, v) !== shape) continue;
    return rng.chance(0.5) ? [u, v] : [v, u];
  }
}

/** A parallelogram of one of the shapes asked for, every corner within 9 of the origin. */
function sampleQuad(rng: Rng, difficulty: number, shapes: QuadName[], keep: (p: QuadParams) => boolean = () => true): QuadParams {
  const reach = difficulty > 1 ? 6 : 4;
  for (;;) {
    const shape = rng.pick(shapes);
    const [u, v] = sampleSides(rng, shape, difficulty);
    const params = { A: [rng.int(-reach, reach), rng.int(-reach, reach)] as Pt, u, v, shape };
    if (!inReach(quadOf(params)) || !keep(params)) continue;
    return params;
  }
}

/** Both pairs of opposite sides parallel, compared as fractions. */
function parallelSides([A, B, C, D]: Four): boolean {
  return same(slopeOf(A, B), slopeOf(D, C)) && same(slopeOf(A, D), slopeOf(B, C));
}

const A_NAME: Record<QuadName, string> = {
  parallelogram: 'a parallelogram',
  rectangle: 'a rectangle',
  rhombus: 'a rhombus',
  square: 'a square',
};

/** The two tests on the sides that meet at B, worked out, then what they make. */
function nameSolution([A, B, C]: Four, shape: QuadName): SolutionStep[] {
  const [mAB, mBC] = [slopeOf(A, B), slopeOf(B, C)];
  const right = perpendicular(mAB, mBC);
  const equal = dist2(A, B) === dist2(B, C);
  return [
    { text: 'A parallelogram already has its opposite sides equal and parallel, so two sides that meet settle the rest:' },
    { tex: chain(lengthLine('AB', A, B), lengthLine('BC', B, C)) },
    { tex: chain(gradientLine('AB', A, B), gradientLine('BC', B, C)) },
    { text: `Multiplied: $${productTex(mAB, mBC)}$.` },
    {
      text: `${equal ? 'The sides are equal' : 'The sides are not equal'}, and ${right ? 'the product is $-1$, so the angle at $B$ is a right angle' : 'the product is not $-1$, so there is no right angle'}. So $ABCD$ is ${A_NAME[shape]}.`,
    },
  ];
}

/* ---------- lesson 1: parallel sides ---------- */

type SidesVerdict = 'Parallelogram' | 'Trapezium' | 'Neither';

const SIDES_LABEL: Record<SidesVerdict, string> = {
  Parallelogram: 'A parallelogram',
  Trapezium: 'A trapezium',
  Neither: 'Neither',
};

function sidesVerdict([A, B, C, D]: Four): SidesVerdict {
  const one = same(slopeOf(A, B), slopeOf(D, C));
  const two = same(slopeOf(A, D), slopeOf(B, C));
  if (one && two) return 'Parallelogram';
  return one || two ? 'Trapezium' : 'Neither';
}

interface CornersParams {
  P: Four;
}

/**
 * Both pairs of opposite sides by their gradients, then the verdict. D is
 * left alone, moved along a side so one pair stays parallel (a trapezium),
 * or at difficulty 2 moved a step so neither does.
 */
const coordParaFlow: Generator<CornersParams> = {
  id: 'coord-para-flow',
  sample: (rng, difficulty) => {
    const wanted: SidesVerdict[] = difficulty > 1 ? ['Parallelogram', 'Trapezium', 'Neither'] : ['Parallelogram', 'Trapezium'];
    for (;;) {
      const quad = sampleQuad(rng, difficulty, ALL_QUADS, sidesSlanted);
      const [A, B, C, D] = quadOf(quad);
      const verdict = rng.pick(wanted);
      let moved = D;
      if (verdict === 'Trapezium') moved = rng.chance(0.5) ? minusPt(D, primitive(quad.u)) : plusPt(D, primitive(quad.v));
      if (verdict === 'Neither') moved = plusPt(D, rng.pick(NUDGES));
      const P: Four = [A, B, C, moved];
      if (!inReach(P) || !convex(P) || !slanted(A, moved) || !slanted(moved, C)) continue;
      if (sidesVerdict(P) !== verdict) continue;
      return { P };
    }
  },
  render: ({ P }): Slide => {
    const [A, B, C, D] = P;
    const [mAB, mDC, mAD, mBC] = [slopeOf(A, B), slopeOf(D, C), slopeOf(A, D), slopeOf(B, C)];
    const slips = (a: Q, b: Q): [Q, Q][] => [
      [a, b],
      [neg(a), neg(b)],
      [inv(a), inv(b)],
      same(a, b) ? [a, perp(a)] : [a, a],
    ];
    const first = pairLabels(slips(mAB, mDC));
    const second = pairLabels(slips(mAD, mBC));
    return {
      kind: 'flow',
      prompt: [say(`${cornersNamed(P, QUAD)} are the corners of a quadrilateral $ABCD$. Is it a parallelogram?`)],
      subject: 'AB \\parallel DC \\text{ and } AD \\parallel BC\\,?',
      steps: [
        { id: 'ab', ask: 'What are the gradients of $AB$ and $DC$?', branches: onward(first, 'ad') },
        { id: 'ad', ask: 'And the gradients of $AD$ and $BC$?', branches: onward(second, 'verdict') },
        {
          id: 'verdict',
          ask: 'So $ABCD$ is:',
          branches: [
            { label: SIDES_LABEL.Parallelogram, outcome: 'Both pairs of opposite sides are parallel.' },
            { label: SIDES_LABEL.Trapezium, outcome: 'Exactly one pair of opposite sides is parallel.' },
            { label: SIDES_LABEL.Neither, outcome: 'No pair of opposite sides is parallel.' },
          ],
        },
      ],
      answer: [first[0], second[0], SIDES_LABEL[sidesVerdict(P)]],
    };
  },
  solution: ({ P }) => {
    const [A, B, C, D] = P;
    const verdict = sidesVerdict(P);
    const why: Record<SidesVerdict, string> = {
      Parallelogram: 'Both pairs match, so both pairs of opposite sides are parallel: $ABCD$ is a parallelogram.',
      Trapezium: 'One pair matches and the other does not, so exactly one pair of opposite sides is parallel: $ABCD$ is a trapezium.',
      Neither: 'Neither pair matches, so no two opposite sides are parallel: $ABCD$ is neither.',
    };
    return [
      { tex: chain(gradientLine('AB', A, B), gradientLine('DC', D, C)) },
      { tex: chain(gradientLine('AD', A, D), gradientLine('BC', B, C)) },
      { text: why[verdict] },
    ];
  },
};

/** Two steps in each of the eight directions: a move that keeps a midpoint whole. */
const EVEN_NUDGES: Pt[] = NUDGES.map(([x, y]) => [2 * x, 2 * y]);

/** Whether the diagonals share a midpoint, as the line the steps slide ends on. */
const bisectVerdict = (yes: boolean): string => `ABCD \\text{ is ${yes ? '' : 'not '}a parallelogram}`;

/** The midpoint of each diagonal, then whether they are one point. */
const coordParaDiagonalSteps: Generator<CornersParams> = {
  id: 'coord-para-diagonal-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const quad = sampleQuad(rng, difficulty, ALL_QUADS, midWhole);
      const [A, B, C, D] = quadOf(quad);
      const P: Four = [A, B, C, rng.chance(0.4) ? plusPt(D, rng.pick(EVEN_NUDGES)) : D];
      if (!inReach(P) || !convex(P)) continue;
      return { P };
    }
  },
  render: ({ P }): Slide => {
    const [A, B, C, D] = P;
    const [mAC, mBD] = [midOf(A, C), midOf(B, D)];
    const halves = (label: string, X: Pt, Y: Pt) =>
      `M_{${label}} = \\left(\\frac{${X[0]} + ${paren(Y[0])}}{2}, \\frac{${X[1]} + ${paren(Y[1])}}{2}\\right)`;
    const midBank = (label: string, X: Pt, Y: Pt) => {
      const M = midOf(X, Y);
      return stepBank(
        `M_{${label}} = ${pt(...M)}`,
        `M_{${label}} = ${pt(X[0] + Y[0], X[1] + Y[1])}`,
        `M_{${label}} = ${pt((Y[0] - X[0]) / 2, (Y[1] - X[1]) / 2)}`,
        `M_{${label}} = ${pt(M[1], M[0])}`,
      );
    };
    const yes = samePt(mAC, mBD);
    return {
      kind: 'steps',
      prompt: [
        say(
          `${cornersNamed(P, QUAD)} are the corners of a quadrilateral $ABCD$. Do its diagonals bisect each other? Tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: [halves('AC', A, C), ',', halves('BD', B, D)],
      reductions: [
        { span: [0, 1], value: `M_{AC} = ${pt(...mAC)}`, bank: midBank('AC', A, C) },
        { span: [2, 3], value: `M_{BD} = ${pt(...mBD)}`, bank: midBank('BD', B, D) },
        { span: [0, 3], value: bisectVerdict(yes), bank: stepBank(bisectVerdict(yes), bisectVerdict(!yes)) },
      ],
    };
  },
  solution: ({ P }) => {
    const [A, B, C, D] = P;
    const [mAC, mBD] = [midOf(A, C), midOf(B, D)];
    const yes = samePt(mAC, mBD);
    return [
      { text: 'The midpoint of each diagonal is the average of its ends. For $AC$:' },
      { tex: chain(`x &= \\frac{${A[0]} + ${paren(C[0])}}{2} = ${mAC[0]}`, `y &= \\frac{${A[1]} + ${paren(C[1])}}{2} = ${mAC[1]}`) },
      { text: 'And for $BD$:' },
      { tex: chain(`x &= \\frac{${B[0]} + ${paren(D[0])}}{2} = ${mBD[0]}`, `y &= \\frac{${B[1]} + ${paren(D[1])}}{2} = ${mBD[1]}`) },
      { text: `So $M_{AC} = ${pt(...mAC)}$ and $M_{BD} = ${pt(...mBD)}$.` },
      {
        text: yes
          ? 'They are the same point, so the diagonals bisect each other and $ABCD$ is a parallelogram.'
          : 'They are different points, so the diagonals do not bisect each other and $ABCD$ is not a parallelogram.',
      },
    ];
  },
};

interface FourthParams extends QuadParams {
  /** Which corner is asked for: 3 (D) at difficulty 1, any at difficulty 2. */
  missing: number;
}

/** The corner asked for, and its neighbours before and after it and the corner opposite. */
function fourthParts(p: FourthParams): { X: Pt; prev: Pt; next: Pt; opp: Pt; names: string[] } {
  const P = quadOf(p);
  const m = p.missing;
  return {
    X: P[m],
    prev: P[(m + 3) % 4],
    next: P[(m + 1) % 4],
    opp: P[(m + 2) % 4],
    names: [QUAD[(m + 3) % 4], QUAD[(m + 1) % 4], QUAD[(m + 2) % 4]],
  };
}

/** The fourth corner of a parallelogram, as two tiles. */
const coordParaFourthTiles: Generator<FourthParams> = {
  id: 'coord-para-fourth-tiles',
  sample: (rng, difficulty) => ({ ...sampleQuad(rng, difficulty, ALL_QUADS), missing: difficulty > 1 ? rng.int(0, 3) : 3 }),
  render: (p): Slide => {
    const P = quadOf(p);
    const { X, prev, next, opp } = fourthParts(p);
    const letter = QUAD[p.missing];
    const given = [0, 1, 2, 3].filter((i) => i !== p.missing);
    const answer = [String(X[0]), String(X[1])];
    const wrong = [minusPt(plusPt(prev, opp), next), minusPt(plusPt(next, opp), prev), plusPt(prev, next)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `$ABCD$ is a parallelogram, its corners in that order round it, with ${cornersNamed(
            given.map((i) => P[i]),
            given.map((i) => QUAD[i]),
          )}. Find $${letter}$.`,
        ),
      ],
      template: `${letter} = ({0}, {1})`,
      bank: bank(answer, wrong.flatMap(([x, y]) => [String(x), String(y)]), X, 2),
      answer,
    };
  },
  solution: (p) => {
    const { X, prev, next, opp, names } = fourthParts(p);
    const [dx, dy] = minusPt(next, opp);
    return [
      {
        text: `Opposite sides of a parallelogram are equal and parallel, so the step from $${names[2]}$ to $${names[1]}$, which is $${pt(dx, dy)}$, is the same as the step from $${names[0]}$ to $${QUAD[p.missing]}$:`,
      },
      { tex: chain(...stepLines(QUAD[p.missing], prev, [dx, dy])) },
      { text: `So $${namedAt(QUAD[p.missing], X)}$.` },
    ];
  },
};

interface ParallelKParams {
  P: Four;
}

/**
 * AB parallel to DC, with D's height unknown. D is C less a whole number of
 * AB's lattice steps, so k is whole; at difficulty 1 that step is one across,
 * so the gradient is whole too.
 */
const coordParallelK: Generator<ParallelKParams> = {
  id: 'coord-parallel-k',
  sample: (rng, difficulty) => {
    for (;;) {
      const quad = sampleQuad(rng, difficulty, ALL_QUADS, (p) => sidesSlanted(p) && (difficulty > 1 || Math.abs(primitive(p.u)[0]) === 1));
      const [A, B, C] = quadOf(quad);
      const D = minusPt(C, scalePt(rng.int(1, 3), primitive(quad.u)));
      const P: Four = [A, B, C, D];
      if (!inReach(P) || !convex(P)) continue;
      return { P };
    }
  },
  render: ({ P }): Slide => {
    const [A, B, C, D] = P;
    return {
      kind: 'expression',
      prompt: [
        say(
          `In the quadrilateral $ABCD$, $AB$ is parallel to $DC$. ${cornersNamed([A, B, C], ['A', 'B', 'C'])}, and $D(${D[0]}, k)$. Find $k$.`,
        ),
      ],
      lead: 'k =',
      keypad: [],
      answer: String(D[1]),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: ({ P }) => {
    const [A, B, C, D] = P;
    const m = slopeOf(A, B);
    const run = q(D[0] - C[0]);
    return intOptions(D[1], [
      value(sub(q(C[1]), mul(m, run))),
      value(add(q(C[1]), mul(perp(m), run))),
      value(add(q(C[1]), mul(inv(m), run))),
      A[1] + C[1] - B[1],
    ]);
  },
  solution: ({ P }) => {
    const [A, B, C, D] = P;
    const m = slopeOf(A, B);
    return [
      { tex: gradientLine('AB', A, B).replace('&', '') },
      { text: 'Parallel lines have equal gradients, so $DC$ has that gradient too. Write it with $k$ in, and solve:' },
      {
        tex: chain(
          `\\frac{${C[1]} - k}{${C[0]} - ${paren(D[0])}} &= ${qTex(m)}`,
          `${C[1]} - k &= ${qTex(m)} \\times ${paren(C[0] - D[0])} = ${C[1] - D[1]}`,
          `k &= ${D[1]}`,
        ),
      },
    ];
  },
};

interface QuadSliderParams extends QuadParams {
  axis: 'x' | 'y';
}

/** A, B and C drawn with two sides: slide to D, across (difficulty 1) or up (difficulty 2). */
const coordParaSlider: Generator<QuadSliderParams> = {
  id: 'coord-para-slider',
  sample: (rng, difficulty) => ({ ...sampleQuad(rng, difficulty, ALL_QUADS, sidesSlanted), axis: difficulty > 1 ? 'y' : 'x' }),
  render: (p): Slide => {
    const [A, B, C, D] = quadOf(p);
    return {
      kind: 'slider',
      prompt: [
        say(
          `$ABCD$ is a parallelogram with ${cornersNamed([A, B, C], ['A', 'B', 'C'])}, drawn with the sides $AB$ and $BC$. Find $D$, and slide to its ${p.axis === 'x' ? '$x$-coordinate' : 'height'}.`,
        ),
      ],
      min: -9,
      max: 9,
      step: 1,
      answer: p.axis === 'x' ? D[0] : D[1],
      readout: `${p.axis} = {v}`,
      figure: {
        svg: plotWithCircles(
          {
            xMin: -10,
            xMax: 10,
            yMin: -10,
            yMax: 10,
            curves: [segment(A[0], A[1], B[0], B[1]), segment(B[0], B[1], C[0], C[1])],
            marks: [A, B, C].map(([x, y]) => ({ x, y })),
            label: 'Three corners of a parallelogram joined by two of its sides',
          },
          [],
        ),
        axis: p.axis,
        ...markerWindow(-10, 10, p.axis, SQUARE),
      },
    };
  },
  solution: (p) => {
    const [A, B, C, D] = quadOf(p);
    const [dx, dy] = minusPt(A, B);
    return [
      {
        text: `Opposite sides of a parallelogram are equal and parallel, so $D$ is the same step from $C$ as $A$ is from $B$, which is $${pt(dx, dy)}$:`,
      },
      { tex: chain(...stepLines('D', C, [dx, dy])) },
      { text: `So $${namedAt('D', D)}$.` },
    ];
  },
};

/* ---------- lesson 2: right angles ---------- */

/** A labelled product fork and a yes-or-no verdict: the shape of every "is it a ...?" flow here. */
function productFlow(
  prompt: string,
  subject: string,
  ask: string,
  product: Q,
  slips: Q[],
  verdict: { ask: string; yes: string; no: string; right: boolean },
): Slide {
  const labels = forkLabels([product, ...slips]).slice(0, 4);
  return {
    kind: 'flow',
    prompt: [say(prompt)],
    subject,
    steps: [
      { id: 'product', ask, branches: onward(labels, 'verdict') },
      {
        id: 'verdict',
        ask: verdict.ask,
        branches: [
          { label: 'Yes', outcome: verdict.yes },
          { label: 'No', outcome: verdict.no },
        ],
      },
    ],
    answer: [labels[0], verdict.right ? 'Yes' : 'No'],
  };
}

/** Slips for a product of two gradients: the other side of -1, the sum and the difference. */
function productSlips(m1: Q, m2: Q): Q[] {
  const product = mul(m1, m2);
  return same(product, q(-1)) ? [q(1), add(m1, m2), sub(m1, m2), q(0)] : [q(-1), neg(product), add(m1, m2), sub(m1, m2)];
}

/** A parallelogram, and the angle at B by the gradients of AB and BC. */
const coordRectFlow: Generator<QuadParams> = {
  id: 'coord-rect-flow',
  sample: (rng, difficulty) => sampleQuad(rng, difficulty, ALL_QUADS, sidesSlanted),
  render: (p): Slide => {
    const P = quadOf(p);
    const [A, B, C] = P;
    const [mAB, mBC] = [slopeOf(A, B), slopeOf(B, C)];
    return productFlow(
      `$ABCD$ is a parallelogram with ${cornersNamed(P, QUAD)}. Is it a rectangle?`,
      'm_{AB} \\times m_{BC}',
      'Work out the gradients of $AB$ and $BC$ and multiply them. What do you get?',
      mul(mAB, mBC),
      productSlips(mAB, mBC),
      {
        ask: 'So is $ABCD$ a rectangle?',
        yes: 'The angle at $B$ is a right angle, and a parallelogram with one right angle has four.',
        no: 'The angle at $B$ is not a right angle, so no angle is.',
        right: perpendicular(mAB, mBC),
      },
    );
  },
  solution: (p) => {
    const [A, B, C] = quadOf(p);
    const [mAB, mBC] = [slopeOf(A, B), slopeOf(B, C)];
    const right = perpendicular(mAB, mBC);
    return [
      { tex: chain(gradientLine('AB', A, B), gradientLine('BC', B, C)) },
      { text: `Multiplied: $${productTex(mAB, mBC)}$.` },
      {
        text: right
          ? 'That is $-1$, so $AB$ is perpendicular to $BC$. A parallelogram with one right angle has four, so $ABCD$ is a rectangle.'
          : 'That is not $-1$, so the angle at $B$ is not a right angle, and $ABCD$ is not a rectangle.',
      },
    ];
  },
};

/** The two diagonals' changes in x and y, then their squared lengths. */
const coordDiagonalsTree: Generator<QuadParams> = {
  id: 'coord-diagonals-tree',
  sample: (rng, difficulty) => sampleQuad(rng, difficulty, ALL_QUADS),
  render: (p): Slide => {
    const P = quadOf(p);
    const [A, B, C, D] = P;
    const ac = minusPt(C, A);
    const bd = minusPt(D, B);
    const answer = [ac[0], ac[1], dotPt(ac, ac), bd[0], bd[1], dotPt(bd, bd)].map(String);
    return {
      kind: 'tree',
      prompt: [
        say(
          `$ABCD$ is a parallelogram with ${cornersNamed(P, QUAD)}. Top row: the change in $x$ and in $y$ from $A$ to $C$, then from $B$ to $D$. Underneath: $AC^2$ and $BD^2$.`,
        ),
      ],
      expression: 'AC^2 = BD^2 \\,?',
      nodes: [
        { id: 'acx', from: [] },
        { id: 'acy', from: [] },
        { id: 'ac', from: ['acx', 'acy'] },
        { id: 'bdx', from: [] },
        { id: 'bdy', from: [] },
        { id: 'bd', from: ['bdx', 'bdy'] },
      ],
      bank: bank(
        answer,
        [-ac[0], -bd[1], Math.abs(ac[0]) + Math.abs(ac[1]), Math.abs(bd[0]) + Math.abs(bd[1]), 2 * dotPt(ac, ac)].map(String),
        [dotPt(ac, ac), dotPt(bd, bd)],
      ),
      answer,
    };
  },
  solution: (p) => {
    const [A, B, C, D] = quadOf(p);
    const equal = dist2(A, C) === dist2(B, D);
    return [
      { tex: chain(lengthLine('AC', A, C), lengthLine('BD', B, D)) },
      {
        text: equal
          ? 'The diagonals are equal, and a parallelogram with equal diagonals is a rectangle.'
          : 'The diagonals are not equal, so this parallelogram is not a rectangle.',
      },
    ];
  },
};

interface PerpKParams {
  /** The corner with the right angle, and the ends of its two arms; the last one's height is unknown. */
  X: Pt;
  Y: Pt;
  Z: Pt;
}

/** k from the gradient of XZ, which is perpendicular to XY. */
function perpKSolution({ X, Y, Z }: PerpKParams, [x, y, z]: [string, string, string]): SolutionStep[] {
  const m = slopeOf(X, Y);
  const mZ = perp(m);
  return [
    { text: `The angle at $${x}$ is a right angle, so $${x}${z}$ is perpendicular to $${x}${y}$:` },
    { tex: chain(gradientLine(`${x}${y}`, X, Y), `m_{${x}${z}} &= -1 \\div ${qParen(m)} = ${qTex(mZ)}`) },
    { text: `Write the gradient of $${x}${z}$ with $k$ in it, and solve:` },
    {
      tex: chain(
        `\\frac{k - ${paren(X[1])}}{${Z[0]} - ${paren(X[0])}} &= ${qTex(mZ)}`,
        `k - ${paren(X[1])} &= ${qTex(mZ)} \\times ${paren(Z[0] - X[0])} = ${Z[1] - X[1]}`,
        `k &= ${Z[1]}`,
      ),
    },
  ];
}

/** Slips for a height found from a perpendicular gradient: the gradient not turned, turned the wrong way, or flipped only. */
function perpKChoices({ X, Y, Z }: PerpKParams, others: number[]) {
  const m = slopeOf(X, Y);
  const run = q(Z[0] - X[0]);
  return intOptions(Z[1], [
    value(add(q(X[1]), mul(m, run))),
    value(add(q(X[1]), mul(neg(perp(m)), run))),
    value(add(q(X[1]), mul(inv(m), run))),
    ...others,
  ]);
}

/** Difficulty 1 keeps the side through the unknown one step across per rise, so its gradient is whole. */
const wholeArm = (difficulty: number, arm: Pt) => difficulty > 1 || Math.abs(primitive(arm)[0]) === 1;

/** A rectangle's third corner from the right angle at B, with C's height unknown. */
const coordRectK: Generator<QuadParams> = {
  id: 'coord-rect-k',
  sample: (rng, difficulty) => sampleQuad(rng, difficulty, ['rectangle', 'square'], (p) => sidesSlanted(p) && wholeArm(difficulty, p.v)),
  render: (p): Slide => {
    const [A, B, C] = quadOf(p);
    return {
      kind: 'expression',
      prompt: [say(`$ABCD$ is a rectangle with $${namedAt('A', A)}$, $${namedAt('B', B)}$ and $C(${C[0]}, k)$. Find $k$.`)],
      lead: 'k =',
      keypad: [],
      answer: String(C[1]),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const [A, B, C] = quadOf(p);
    return perpKChoices({ X: B, Y: A, Z: C }, [A[1] + C[1] - B[1], -C[1]]);
  },
  solution: (p) => {
    const [A, B, C] = quadOf(p);
    return perpKSolution({ X: B, Y: A, Z: C }, ['B', 'A', 'C']);
  },
};

/* ---------- lesson 3: equal sides ---------- */

/** AB^2 and BC^2 as two tiles: two sides that meet settle all four. */
const coordSideLengthsTiles: Generator<QuadParams> = {
  id: 'coord-side-lengths-tiles',
  sample: (rng, difficulty) => sampleQuad(rng, difficulty, ALL_QUADS),
  render: (p): Slide => {
    const P = quadOf(p);
    const { u, v } = p;
    const answer = [String(dotPt(u, u)), String(dotPt(v, v))];
    return {
      kind: 'tiles',
      prompt: [say(`$ABCD$ is a parallelogram with ${cornersNamed(P, QUAD)}. Find the squared lengths of $AB$ and $BC$.`)],
      template: 'AB^2 = {0}, \\quad BC^2 = {1}',
      bank: bank(
        answer,
        [
          Math.abs(u[0]) + Math.abs(u[1]),
          Math.abs(v[0]) + Math.abs(v[1]),
          dotPt(plusPt(u, v), plusPt(u, v)),
          (u[0] + u[1]) ** 2,
        ].map(String),
        [dotPt(u, u), dotPt(v, v)],
        2,
      ),
      answer,
    };
  },
  solution: (p) => {
    const [A, B, C] = quadOf(p);
    const equal = dist2(A, B) === dist2(B, C);
    return [
      { tex: chain(lengthLine('AB', A, B), lengthLine('BC', B, C)) },
      {
        text: equal
          ? 'They are equal. Opposite sides of a parallelogram are equal as well, so all four sides are: $ABCD$ is a rhombus.'
          : 'They are not equal, so $ABCD$ is not a rhombus.',
      },
    ];
  },
};

/** A parallelogram, and whether its diagonals cross square on. */
const coordRhombusFlow: Generator<QuadParams> = {
  id: 'coord-rhombus-flow',
  sample: (rng, difficulty) => sampleQuad(rng, difficulty, ALL_QUADS, diagonalsSlanted),
  render: (p): Slide => {
    const P = quadOf(p);
    const [A, B, C, D] = P;
    const [mAC, mBD] = [slopeOf(A, C), slopeOf(B, D)];
    return productFlow(
      `$ABCD$ is a parallelogram with ${cornersNamed(P, QUAD)}. Is it a rhombus?`,
      'm_{AC} \\times m_{BD}',
      'Work out the gradients of the diagonals $AC$ and $BD$ and multiply them. What do you get?',
      mul(mAC, mBD),
      productSlips(mAC, mBD),
      {
        ask: 'So is $ABCD$ a rhombus?',
        yes: 'Its diagonals cross at a right angle, and a parallelogram whose diagonals do that is a rhombus.',
        no: 'Its diagonals do not cross at a right angle, so its sides are not all equal.',
        right: perpendicular(mAC, mBD),
      },
    );
  },
  solution: (p) => {
    const [A, B, C, D] = quadOf(p);
    const [mAC, mBD] = [slopeOf(A, C), slopeOf(B, D)];
    const right = perpendicular(mAC, mBD);
    return [
      { tex: chain(gradientLine('AC', A, C), gradientLine('BD', B, D)) },
      { text: `Multiplied: $${productTex(mAC, mBD)}$.` },
      {
        text: right
          ? 'That is $-1$, so the diagonals are perpendicular, and $ABCD$ is a rhombus.'
          : 'That is not $-1$, so the diagonals are not perpendicular, and $ABCD$ is not a rhombus.',
      },
    ];
  },
};

const NAMES: QuadName[] = ['parallelogram', 'rectangle', 'rhombus', 'square'];

/** The most exact name for a parallelogram: one of four, the options turned by a hash. */
const coordNameQuad: Generator<QuadParams> = {
  id: 'coord-name-quad',
  sample: (rng, difficulty) => sampleQuad(rng, difficulty, ALL_QUADS, sidesSlanted),
  render: (p): Slide => {
    const text = `$ABCD$ is a parallelogram with ${cornersNamed(quadOf(p), QUAD)}. What is the most exact name for it?`;
    const order = turned(NAMES, text);
    return {
      kind: 'choice',
      prompt: [say(text)],
      options: order.map((name, idx) => ({ id: `opt${idx}`, label: `${A_NAME[name][0].toUpperCase()}${A_NAME[name].slice(1)}` })),
      correctId: `opt${order.indexOf(p.shape)}`,
    };
  },
  solution: (p) => nameSolution(quadOf(p), p.shape),
};

/** Both tests on the corner B, one tap at a time, then the name they make. */
const coordSquareSteps: Generator<QuadParams> = {
  id: 'coord-square-steps',
  sample: (rng, difficulty) => sampleQuad(rng, difficulty, ALL_QUADS, sidesSlanted),
  render: (p): Slide => {
    const [A, B, C] = quadOf(p);
    const { u, v } = p;
    const [mAB, mBC] = [slopeOf(A, B), slopeOf(B, C)];
    const product = mul(mAB, mBC);
    const square = (label: string, [x, y]: Pt) => `${label}^2 = ${paren(x)}^2 + ${paren(y)}^2`;
    const lengthBank = (label: string, [x, y]: Pt) =>
      stepBank(`${label}^2 = ${x * x + y * y}`, `${label}^2 = ${Math.abs(x) + Math.abs(y)}`, `${label}^2 = ${(x + y) ** 2}`, `${label}^2 = ${x * x + y * y + 1}`);
    const productValue = (v2: Q) => `m_{AB} \\times m_{BC} = ${qTex(v2)}`;
    const called = (name: QuadName) => `ABCD \\text{ is ${A_NAME[name]}}`;
    return {
      kind: 'steps',
      prompt: [
        say(
          `$ABCD$ is a parallelogram with ${cornersNamed(quadOf(p), QUAD)}. Name it as exactly as you can: tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: [square('AB', u), ',', square('BC', v), ',', `m_{AB} \\times m_{BC} = ${qTex(mAB)} \\times ${qParen(mBC)}`],
      reductions: [
        { span: [0, 1], value: `AB^2 = ${dotPt(u, u)}`, bank: lengthBank('AB', u) },
        { span: [2, 3], value: `BC^2 = ${dotPt(v, v)}`, bank: lengthBank('BC', v) },
        {
          span: [4, 5],
          value: productValue(product),
          bank: stepBank(productValue(product), ...productSlips(mAB, mBC).slice(0, 3).map(productValue)),
        },
        { span: [0, 5], value: called(p.shape), bank: stepBank(called(p.shape), ...NAMES.map(called)) },
      ],
    };
  },
  solution: (p) => nameSolution(quadOf(p), p.shape),
};

/* ---------- lesson 4: triangles ---------- */

const TRI = ['P', 'Q', 'R'];

/** The three sides, each named by its ends: PQ, QR, RP. */
const TRI_SIDES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 0],
];

const sideName = ([i, j]: [number, number]): string => `${TRI[i]}${TRI[j]}`;

type TriKind = 'right' | 'isosceles' | 'scalene';

interface TriParams {
  /** The corner the triangle is built from: the right angle, or the apex. */
  V: Pt;
  w1: Pt;
  w2: Pt;
  /** Which of P, Q, R the corner V is. */
  at: number;
  kind: TriKind;
}

/** P, Q and R, with V at `at` and the ends of its two arms after it. */
function triOf({ V, w1, w2, at }: TriParams): [Pt, Pt, Pt] {
  const out: Pt[] = [];
  out[at] = V;
  out[(at + 1) % 3] = plusPt(V, w1);
  out[(at + 2) % 3] = plusPt(V, w2);
  return out as [Pt, Pt, Pt];
}

/** The corner whose two sides satisfy Pythagoras, found from the squared lengths alone; -1 for none. */
function rightCorner(T: Pt[]): number {
  for (let i = 0; i < 3; i += 1) {
    const [Y, Z] = [T[(i + 1) % 3], T[(i + 2) % 3]];
    if (dist2(T[i], Y) + dist2(T[i], Z) === dist2(Y, Z)) return i;
  }
  return -1;
}

/** The corner where two equal sides meet; -1 for none. */
function apexOf(T: Pt[]): number {
  for (let i = 0; i < 3; i += 1) {
    if (dist2(T[i], T[(i + 1) % 3]) === dist2(T[i], T[(i + 2) % 3])) return i;
  }
  return -1;
}

/**
 * A triangle of the kind asked for: right-angled from a vector and a multiple
 * of its perpendicular, isosceles from two lattice vectors of one squared
 * length, scalene with three different sides and no right angle.
 */
function sampleTri(rng: Rng, difficulty: number, kinds: TriKind[], keep: (p: TriParams) => boolean = () => true): TriParams {
  const hard = difficulty > 1;
  const reach = hard ? 6 : 4;
  for (;;) {
    const kind = rng.pick(kinds);
    let w1: Pt;
    let w2: Pt;
    if (kind === 'right') {
      const top = hard ? 3 : 2;
      const p = primitive([nz(rng, top), nz(rng, top)]);
      w1 = scalePt(rng.int(1, hard ? 3 : 2), p);
      w2 = scalePt(rng.int(1, hard ? 3 : 2) * rng.sign(), [-p[1], p[0]]);
    } else if (kind === 'isosceles') {
      const vectors = latticeVectors(rng.pick(hard ? [17, 20, 25, 34] : [5, 10, 13]));
      [w1, w2] = [rng.pick(vectors), rng.pick(vectors)];
    } else {
      const top = hard ? 5 : 3;
      [w1, w2] = [
        [nz(rng, top), rng.int(-top, top)],
        [rng.int(-top, top), nz(rng, top)],
      ];
    }
    if (crossPt(w1, w2) === 0) continue;
    const params = { V: [rng.int(-reach, reach), rng.int(-reach, reach)] as Pt, w1, w2, at: rng.int(0, 2), kind };
    const T = triOf(params);
    if (!inReach(T)) continue;
    const right = rightCorner(T) >= 0;
    const iso = apexOf(T) >= 0;
    if (kind === 'right' && !right) continue;
    if (kind === 'isosceles' && (!iso || right)) continue;
    if (kind === 'scalene' && (iso || right)) continue;
    if (!keep(params)) continue;
    return params;
  }
}

/** The three squared lengths, one line each. */
function triLengths(T: Pt[]): SolutionStep {
  return { tex: chain(...TRI_SIDES.map(([i, j]) => lengthLine(sideName([i, j]), T[i], T[j]))) };
}

/** The two sides at the corner the prompt names, their gradients, then their product. */
const coordTriRightTree: Generator<TriParams> = {
  id: 'coord-tri-right-tree',
  sample: (rng, difficulty) => {
    const p = sampleTri(rng, difficulty, ['right'], (t) => slantedVec(t.w1) && slantedVec(t.w2));
    return difficulty > 1 ? p : { ...p, at: 1 };
  },
  render: (p): Slide => {
    const T = triOf(p);
    const [x, y, z] = [p.at, (p.at + 1) % 3, (p.at + 2) % 3];
    const [m1, m2] = [slopeOf(T[x], T[y]), slopeOf(T[x], T[z])];
    const answer = [qTex(m1), qTex(m2), '-1'];
    const [s1, s2] = [`${TRI[x]}${TRI[y]}`, `${TRI[x]}${TRI[z]}`];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Triangle $PQR$ has ${cornersNamed(T, TRI)}. Show that it is right-angled at $${TRI[x]}$. Top row: the gradients of $${s1}$ and $${s2}$. Underneath: their product.`,
        ),
      ],
      expression: `m_{${s1}} \\times m_{${s2}}`,
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'product', from: ['first', 'second'] },
      ],
      bank: bank(answer, [qTex(neg(m1)), qTex(inv(m1)), qTex(neg(m2)), qTex(inv(m2)), '1'], [-1]),
      answer,
    };
  },
  solution: (p) => {
    const T = triOf(p);
    const [x, y, z] = [p.at, (p.at + 1) % 3, (p.at + 2) % 3];
    const [s1, s2] = [`${TRI[x]}${TRI[y]}`, `${TRI[x]}${TRI[z]}`];
    const [m1, m2] = [slopeOf(T[x], T[y]), slopeOf(T[x], T[z])];
    return [
      { tex: chain(gradientLine(s1, T[x], T[y]), gradientLine(s2, T[x], T[z])) },
      { text: `Multiplied: $${productTex(m1, m2)}$, so $${s1}$ is perpendicular to $${s2}$ and the angle at $${TRI[x]}$ is a right angle.` },
    ];
  },
};

const NOWHERE = 'It has no right angle';

/** Where the right angle is, by Pythagoras on the squared lengths. Difficulty 2 may have none. */
const coordTriVertexChoice: Generator<TriParams> = {
  id: 'coord-tri-vertex-choice',
  sample: (rng, difficulty) => sampleTri(rng, difficulty, difficulty > 1 ? ['right', 'right', 'scalene'] : ['right']),
  render: (p): Slide => {
    const T = triOf(p);
    const text = `Triangle $PQR$ has ${cornersNamed(T, TRI)}. Where is its right angle?`;
    const labels = [...TRI.map((name) => `At ${name}`), NOWHERE];
    const corner = rightCorner(T);
    const order = turned(labels, text);
    const right = corner >= 0 ? labels[corner] : NOWHERE;
    return {
      kind: 'choice',
      prompt: [say(text)],
      options: order.map((label, idx) => ({ id: `opt${idx}`, label })),
      correctId: `opt${order.indexOf(right)}`,
    };
  },
  solution: (p) => {
    const T = triOf(p);
    const corner = rightCorner(T);
    const sides = TRI_SIDES.map(([i, j]) => dist2(T[i], T[j]));
    const longest = sides.indexOf(Math.max(...sides));
    const legs = [0, 1, 2].filter((i) => i !== longest);
    return [
      triLengths(T),
      {
        text:
          corner >= 0
            ? `The two shorter add to the longest: $${sides[legs[0]]} + ${sides[legs[1]]} = ${sides[longest]}$. So by Pythagoras the angle opposite $${sideName(TRI_SIDES[longest])}$, at $${TRI[corner]}$, is a right angle.`
            : `The two shorter add to $${sides[legs[0]] + sides[legs[1]]}$, not $${sides[longest]}$, so Pythagoras fails and there is no right angle.`,
      },
    ];
  },
};

/** "$RP = PQ$": the equal pair at each corner, in the order the corners are named. */
const EQUAL_AT = ['$RP = PQ$', '$PQ = QR$', '$QR = RP$'];

const NO_PAIR = 'None: it is scalene';

/**
 * The three squared lengths, then which two are equal. The wrong triples are
 * the slips: adding the changes, or squaring their sum or difference.
 */
const coordIsoscelesFlow: Generator<TriParams> = {
  id: 'coord-isosceles-flow',
  sample: (rng, difficulty) => sampleTri(rng, difficulty, ['isosceles', 'isosceles', 'scalene']),
  render: (p): Slide => {
    const T = triOf(p);
    const triple = (f: (d: Pt) => number) =>
      TRI_SIDES.map(([i, j]) => `$${sideName([i, j])}^2 = ${f(minusPt(T[j], T[i]))}$`).join(', ');
    const triples = [
      triple(([x, y]) => x * x + y * y),
      triple(([x, y]) => Math.abs(x) + Math.abs(y)),
      triple(([x, y]) => (x + y) ** 2),
      triple(([x, y]) => (x - y) ** 2),
    ].filter((label, idx, all) => all.indexOf(label) === idx);
    const apex = apexOf(T);
    return {
      kind: 'flow',
      prompt: [say(`Triangle $PQR$ has ${cornersNamed(T, TRI)}. Is it isosceles?`)],
      subject: 'PQ^2, \\; QR^2, \\; RP^2',
      steps: [
        { id: 'lengths', ask: 'Work out the squared length of each side. What are they?', branches: onward(triples, 'pair') },
        {
          id: 'pair',
          ask: 'So which two sides are equal?',
          branches: [
            ...EQUAL_AT.map((label, i) => ({ label, outcome: `Isosceles: the equal sides meet at $${TRI[i]}$.` })),
            { label: NO_PAIR, outcome: 'No two sides are the same length.' },
          ],
        },
      ],
      answer: [triples[0], apex >= 0 ? EQUAL_AT[apex] : NO_PAIR],
    };
  },
  solution: (p) => {
    const T = triOf(p);
    const apex = apexOf(T);
    return [
      triLengths(T),
      {
        text:
          apex >= 0
            ? `The two sides from $${TRI[apex]}$ have the same squared length, so they are equal and $PQR$ is isosceles.`
            : 'No two squared lengths match, so no two sides are equal: $PQR$ is scalene.',
      },
    ];
  },
};

/** A right-angled triangle's third corner, its height unknown. */
const coordTriRightK: Generator<TriParams> = {
  id: 'coord-tri-right-k',
  sample: (rng, difficulty) => {
    const p = sampleTri(rng, difficulty, ['right'], (t) => slantedVec(t.w1) && slantedVec(t.w2) && wholeArm(difficulty, t.w2));
    return difficulty > 1 ? p : { ...p, at: 1 };
  },
  render: (p): Slide => {
    const T = triOf(p);
    const z = (p.at + 2) % 3;
    const parts = T.map((X, i) => (i === z ? `$${TRI[i]}(${X[0]}, k)$` : `$${namedAt(TRI[i], X)}$`));
    return {
      kind: 'expression',
      prompt: [say(`Triangle $PQR$ is right-angled at $${TRI[p.at]}$, with ${parts[0]}, ${parts[1]} and ${parts[2]}. Find $k$.`)],
      lead: 'k =',
      keypad: [],
      answer: String(T[z][1]),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const T = triOf(p);
    const [x, y, z] = [p.at, (p.at + 1) % 3, (p.at + 2) % 3];
    return perpKChoices({ X: T[x], Y: T[y], Z: T[z] }, [T[y][1], -T[z][1]]);
  },
  solution: (p) => {
    const T = triOf(p);
    const [x, y, z] = [p.at, (p.at + 1) % 3, (p.at + 2) % 3];
    return perpKSolution({ X: T[x], Y: T[y], Z: T[z] }, [TRI[x], TRI[y], TRI[z]]);
  },
};

/* ---------- lesson 5: writing the proof ---------- */

interface ProofParams {
  quad: QuadParams;
  difficulty: number;
  picks: number[];
}

/**
 * The proof that ABCD is a rectangle (both pairs of sides parallel, then a
 * right angle) or a rhombus (the diagonals bisect each other, then cross
 * square on), with the learner's numbers in. Difficulty 2 takes the first
 * fact in two steps, the second leaning on the first.
 */
function quadProof({ quad, difficulty }: ProofParams): Proof {
  const P = quadOf(quad);
  const [A, B, C, D] = P;
  const claim = `${cornersNamed(P, QUAD)} are the corners of $ABCD$. Prove that it is ${A_NAME[quad.shape]}.`;
  if (quad.shape === 'rectangle') {
    const [mAB, mAD] = [slopeOf(A, B), slopeOf(A, D)];
    const sides =
      difficulty > 1
        ? [
            `$m_{AB} = m_{DC} = ${qTex(mAB)}$, so $AB$ is parallel to $DC$.`,
            `And $m_{AD} = m_{BC} = ${qTex(mAD)}$, so $AD$ is parallel to $BC$ as well.`,
          ]
        : [`$m_{AB} = m_{DC} = ${qTex(mAB)}$ and $m_{AD} = m_{BC} = ${qTex(mAD)}$.`];
    return {
      claim,
      steps: [
        ...sides,
        'So both pairs of opposite sides are parallel, and $ABCD$ is a parallelogram.',
        `In this parallelogram $m_{AB} \\times m_{BC} = ${productTex(mAB, mAD)}$, so the angle at $B$ is a right angle.`,
        'A parallelogram with a right angle is a rectangle.',
      ],
      pool: [
        {
          text: `$m_{AB} \\times m_{DC} = ${qTex(mul(mAB, mAB))}$, so $AB$ is perpendicular to $DC$.`,
          why: '$AB$ and $DC$ are opposite sides: they are parallel, and a product that is not $-1$ shows nothing about a right angle.',
        },
        { text: 'A parallelogram with a right angle is a rhombus.', why: 'A right angle makes a rectangle; a rhombus needs equal sides.' },
        {
          text: `$m_{AB} = m_{BC}$, so $AB$ is parallel to $BC$.`,
          why: `$m_{AB} = ${qTex(mAB)}$ and $m_{BC} = ${qTex(mAD)}$ are different, and two sides meeting at $B$ cannot be parallel.`,
        },
      ],
    };
  }
  const M = midOf(A, C);
  const [mAC, mBD] = [slopeOf(A, C), slopeOf(B, D)];
  const halves =
    difficulty > 1
      ? [`The midpoint of $AC$ is $M_{AC} = ${pt(...M)}$.`, `And the midpoint of $BD$ is the same point, $M_{BD} = ${pt(...M)}$.`]
      : [`The midpoints of $AC$ and $BD$ are one point: $M_{AC} = M_{BD} = ${pt(...M)}$.`];
  return {
    claim,
    steps: [
      ...halves,
      'So the diagonals bisect each other, and $ABCD$ is a parallelogram.',
      `In this parallelogram $m_{AC} \\times m_{BD} = ${productTex(mAC, mBD)}$, so the diagonals are perpendicular.`,
      'A parallelogram with perpendicular diagonals is a rhombus.',
    ],
    pool: [
      { text: 'A parallelogram with perpendicular diagonals is a rectangle.', why: 'Perpendicular diagonals make a rhombus; a rectangle needs a right angle at a corner.' },
      {
        text: `$m_{AC} = m_{BD}$, so the diagonals are parallel.`,
        why: `$m_{AC} = ${qTex(mAC)}$ and $m_{BD} = ${qTex(mBD)}$ are different, and two diagonals that cross cannot be parallel.`,
      },
      {
        text: `$AC^2 = ${dist2(A, C)}$ and $BD^2 = ${dist2(B, D)}$, so the diagonals are equal.`,
        why: 'The squared lengths differ, so the diagonals are not equal; that is why this rhombus is not a square.',
      },
    ],
  };
}

/** Put the proof that ABCD is a rectangle or a rhombus in order. */
const coordProofOrder: Generator<ProofParams> = {
  id: 'coord-proof-order',
  sample: (rng, difficulty) => {
    const shape = rng.pick<QuadName>(['rectangle', 'rhombus']);
    const quad = sampleQuad(rng, difficulty, [shape], shape === 'rectangle' ? sidesSlanted : (p) => diagonalsSlanted(p) && midWhole(p));
    const params = { quad, difficulty, picks: [] as number[] };
    return { ...params, picks: pickDistractors(rng, quadProof(params), difficulty) };
  },
  render: (p) => orderSlide(quadProof(p), p.picks),
  solution: (p) => orderSolution(quadProof(p), p.picks),
};

/** Which point completes a rectangle, a rhombus or a square: D = A + C - B. */
const coordCompleteChoice: Generator<QuadParams> = {
  id: 'coord-complete-choice',
  sample: (rng, difficulty) => sampleQuad(rng, difficulty, ['rectangle', 'rhombus', 'square']),
  render: (p): Slide => {
    const [A, B, C, D] = quadOf(p);
    const candidates: Pt[] = [
      minusPt(plusPt(A, B), C),
      minusPt(plusPt(B, C), A),
      minusPt(scalePt(2, B), D),
      [D[1], D[0]],
      ...NUDGES.map((n) => plusPt(D, n)),
    ];
    return choiceSlide(
      [say(`$${namedAt('A', A)}$, $${namedAt('B', B)}$ and $${namedAt('C', C)}$ are three corners of ${A_NAME[p.shape]} $ABCD$. Which point is $D$?`)],
      pointOptions(D, candidates, (X) => !samePt(X, D)),
    );
  },
  solution: (p) => {
    const P = quadOf(p);
    const [A, B, C, D] = P;
    const [dx, dy] = minusPt(A, B);
    return [
      {
        text: `Every ${p.shape} is a parallelogram, so $D$ is the same step from $C$ as $A$ is from $B$, which is $${pt(dx, dy)}$:`,
      },
      { tex: chain(...stepLines('D', C, [dx, dy])) },
      { text: `So $${namedAt('D', D)}$. A check that it is the right shape:` },
      ...nameSolution(P, p.shape).slice(1),
    ];
  },
};

type SquareTest = 'parallel' | 'right' | 'equal';

const SQUARE_TESTS: Record<SquareTest, string> = {
  parallel: 'Both pairs of opposite sides parallel',
  right: 'A right angle at B',
  equal: 'AB = BC',
};

/** Which of the three tests for a square a quadrilateral passes. */
function squareTests(P: Four): Record<SquareTest, boolean> {
  const [A, B, C] = P;
  return {
    parallel: parallelSides(P),
    right: perpendicular(slopeOf(A, B), slopeOf(B, C)),
    equal: dist2(A, B) === dist2(B, C),
  };
}

/**
 * A figure that fails exactly one test for a square: a rectangle (the sides),
 * a rhombus (the right angle), or at difficulty 2 a square with D moved off
 * it, which keeps the right angle and the equal sides at B.
 */
const coordFailsOneChoice: Generator<CornersParams> = {
  id: 'coord-fails-one-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      const kind = rng.pick<SquareTest>(difficulty > 1 ? ['equal', 'right', 'parallel'] : ['equal', 'right']);
      const shape: QuadName = kind === 'equal' ? 'rectangle' : kind === 'right' ? 'rhombus' : 'square';
      const quad = sampleQuad(rng, difficulty, [shape], sidesSlanted);
      const [A, B, C, D] = quadOf(quad);
      const P: Four = [A, B, C, kind === 'parallel' ? plusPt(D, rng.pick(NUDGES)) : D];
      if (!inReach(P) || !convex(P) || !slanted(A, P[3]) || !slanted(P[3], C)) continue;
      const tests = squareTests(P);
      if (Object.values(tests).filter((pass) => !pass).length !== 1 || tests[kind]) continue;
      return { P };
    }
  },
  render: ({ P }): Slide => {
    const text = `${cornersNamed(P, QUAD)} are the corners of $ABCD$. It passes two of the three tests for a square below. Which does it fail?`;
    const order = turned(['parallel', 'right', 'equal'] as SquareTest[], text);
    const tests = squareTests(P);
    return {
      kind: 'choice',
      prompt: [say(text)],
      options: order.map((test, idx) => ({ id: `opt${idx}`, label: SQUARE_TESTS[test] })),
      correctId: `opt${order.findIndex((test) => !tests[test])}`,
    };
  },
  solution: ({ P }) => {
    const [A, B, C, D] = P;
    const tests = squareTests(P);
    const [mAB, mBC] = [slopeOf(A, B), slopeOf(B, C)];
    const verdict: Record<SquareTest, string> = {
      parallel: 'It has the right angle and the equal sides at $B$, but its opposite sides are not parallel, so it is not even a parallelogram.',
      right: 'It is a parallelogram with equal sides, so a rhombus, but it has no right angle.',
      equal: 'It is a parallelogram with a right angle, so a rectangle, but its sides are not all equal.',
    };
    const failed = (Object.keys(tests) as SquareTest[]).find((test) => !tests[test]) as SquareTest;
    return [
      { tex: chain(gradientLine('AB', A, B), gradientLine('DC', D, C)) },
      { tex: chain(gradientLine('AD', A, D), gradientLine('BC', B, C)) },
      { text: `$m_{AB} \\times m_{BC} = ${productTex(mAB, mBC)}$.` },
      { tex: chain(lengthLine('AB', A, B), lengthLine('BC', B, C)) },
      { text: verdict[failed] },
    ];
  },
};

/* ================================================================
 * Level 6: areas and loci
 *
 * The area of a triangle or a polygon from its corners, and a locus written
 * as an equation. Every corner is a lattice point and every figure is built
 * from its answer: a triangle with a level side from a base and a height
 * whose product is even; a triangle with no side level from the box round
 * it, one corner shared with the box and the other two on its far sides,
 * kept only when `wh - ts` is even so its area is whole; a quadrilateral
 * kept only when its shoelace sum is even. A circle locus has a whole
 * radius, or a lattice point on it. The locus PA = 2PB is built from its
 * centre O and a step w of whole length, with B = O - w and A = O - 4w, so
 * that its radius is 2|w|; the locus PA perpendicular to PB is the circle
 * on AB. No length is ever rooted: a radius is whole by construction or
 * asked as its square.
 *
 * Nothing here is calculus, so no slide declares `source`, `integrand` or
 * `limits` and the oracle in `generators.test.ts` has nothing to check;
 * `coordinateGeometry.test.ts` works every area out again by its own
 * shoelace from the corners each prompt names, and tests every locus
 * against lattice points and the condition as the prompt states it.
 * ================================================================ */

type Tri = [Pt, Pt, Pt];

const ABC = ['A', 'B', 'C'];

/** Twice the signed area of a polygon, by the shoelace: positive when its corners run anticlockwise. */
function shoelace2(P: Pt[]): number {
  return P.reduce((sum, X, i) => sum + crossPt(X, P[(i + 1) % P.length]), 0);
}

/** Half of a whole number, as a decimal: 12, 7.5. */
const halfOf = (twice: number): string => String(twice / 2);

/** The points X, Y, Z placed at `at`, `at + 1` and `at + 2` round A, B, C. */
function placed<T>(items: [T, T, T], at: number): [T, T, T] {
  const out: T[] = [];
  items.forEach((item, i) => {
    out[(at + i) % 3] = item;
  });
  return out as [T, T, T];
}

/**
 * Squared paper from -span to span both ways, with polygons shaded and guide
 * lines dashed. `plotSvg` draws y as a function of x, so it cannot draw a
 * side straight up; the shapes go in as SVG instead, placed with the mapping
 * `plotWithCircles` uses, and before the marks so a corner's dot sits on top.
 */
function shapeFigure(win: Frame, polygons: Pt[][], label: string, dashed: [Pt, Pt][] = [], marks: Pt[] = polygons.flat()): string {
  const svg = plotSvg({
    ...win,
    curves: [],
    marks: marks.map(([x, y]) => ({ x, y })),
    label,
    height: SQUARE,
    grid: true,
  });
  const pad = 12;
  const unit = (SQUARE - 2 * pad) / (win.xMax - win.xMin);
  const sx = (x: number) => (pad + (x - win.xMin) * unit).toFixed(1);
  const sy = (y: number) => (pad + (win.yMax - y) * unit).toFixed(1);
  const drawn = [
    ...dashed.map(
      ([[x1, y1], [x2, y2]]) =>
        `<line x1="${sx(x1)}" y1="${sy(y1)}" x2="${sx(x2)}" y2="${sy(y2)}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.6" />`,
    ),
    ...polygons.map(
      (P) =>
        `<polygon class="plot-accent" points="${P.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')}" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />`,
    ),
  ].join('');
  const at = svg.indexOf('<circle');
  return at < 0 ? svg.replace('</svg>', `${drawn}</svg>`) : `${svg.slice(0, at)}${drawn}${svg.slice(at)}`;
}

const diagram = (svg: string): Block => ({ kind: 'diagram', svg });

/** A square window on squared paper, the same span both ways so a unit is one length. */
interface Frame {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** The ten-either-way window the sliders use, so the marker lines up with `markerWindow`. */
const WIDE: Frame = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

/** A square window round some points with a square or so to spare, so a small shape is drawn large. */
function windowFor(points: Pt[]): Frame {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const half = Math.max(4, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 1.5);
  const size = Math.ceil(2 * half);
  const xMin = Math.floor((Math.min(...xs) + Math.max(...xs)) / 2 - half);
  const yMin = Math.floor((Math.min(...ys) + Math.max(...ys)) / 2 - half);
  return { xMin, xMax: xMin + size, yMin, yMax: yMin + size };
}

/** Twice a triangle's area, by the shoelace, one term a line and the sum after. */
function shoelaceLines(P: Pt[], names: string[]): SolutionStep[] {
  const terms = P.map((X, i) => {
    const Y = P[(i + 1) % P.length];
    return `(${X[0]})(${Y[1]}) - (${Y[0]})(${X[1]}) &= ${crossPt(X, Y)}`;
  });
  const sum = shoelace2(P);
  const sides = P.map((_, i) => `$${names[i]}$ to $${names[(i + 1) % P.length]}$`).join(', ');
  return [
    { text: `Each line is $x_1y_2 - x_2y_1$ for one side, going ${sides}:` },
    // Small, since the widest line of negatives otherwise runs a hair past a phone's width.
    { tex: `{\\small ${chain(...terms)}}` },
    {
      text: `They add to $${sum}$, which is twice the area${sum < 0 ? ' with a minus sign, since the corners run clockwise' : ''}. So the area is $\\tfrac{1}{2} \\times ${Math.abs(sum)} = ${halfOf(Math.abs(sum))}$.`,
    },
  ];
}

/** Distinct number labels for a flow fork, the first being the right one. */
function numberLabels(values: number[]): string[] {
  const out: string[] = [];
  for (const v of values) {
    const label = `$${v}$`;
    if (Number.isFinite(v) && !out.includes(label)) out.push(label);
  }
  return out.slice(0, 4);
}

/** Flow leaves, turned by a hash so the right one is not always first. */
const leaves = (labels: string[], outcome: (label: string) => string) =>
  turned(labels, labels.join('|')).map((label) => ({ label, outcome: outcome(label) }));

/* ---------- lesson 1: base and height ---------- */

interface LevelTriParams {
  /** The ends of the level side, and the third corner. */
  X: Pt;
  Y: Pt;
  Z: Pt;
  /** 'x' when XY runs straight across, 'y' when it runs straight up. */
  along: 'x' | 'y';
  /** Which of A, B, C the corner X is; Y and Z follow it round. */
  at: number;
}

/** Which coordinate changes along the base, and which one the height is measured in. */
const baseAxis = ({ along }: LevelTriParams): number => (along === 'x' ? 0 : 1);
const heightAxis = ({ along }: LevelTriParams): number => (along === 'x' ? 1 : 0);

const baseOf = (p: LevelTriParams): number => Math.abs(p.Y[baseAxis(p)] - p.X[baseAxis(p)]);
const heightOf = (p: LevelTriParams): number => Math.abs(p.Z[heightAxis(p)] - p.X[heightAxis(p)]);
/** The signed height: which side of the base the third corner is on. */
const liftOf = (p: LevelTriParams): number => p.Z[heightAxis(p)] - p.X[heightAxis(p)];

const levelTri = (p: LevelTriParams): Tri => placed([p.X, p.Y, p.Z], p.at);

/** The level side's name, its letters in alphabetical order, and the third corner's. */
function levelNames({ at }: LevelTriParams): { side: string; apex: string } {
  const [x, y, z] = [ABC[at], ABC[(at + 1) % 3], ABC[(at + 2) % 3]];
  return { side: [x, y].sort().join(''), apex: z };
}

/**
 * A triangle with one side level: a base of whole length, a height, and the
 * third corner that far from the base's line. Difficulty 2 may stand the base
 * straight up, lets the third corner overhang the base, and names the corners
 * starting anywhere.
 */
function sampleLevelTri(rng: Rng, difficulty: number, keep: (p: LevelTriParams) => boolean = () => true): LevelTriParams {
  const hard = difficulty > 1;
  const reach = hard ? 7 : 5;
  for (;;) {
    const along = hard && rng.chance(0.5) ? 'y' : 'x';
    const b = rng.int(2, hard ? 8 : 6);
    const h = rng.int(1, hard ? 7 : 5) * rng.sign();
    if ((b * Math.abs(h)) % 2 !== 0) continue;
    const t = hard ? rng.int(-2, b + 2) : rng.int(0, b);
    const dir = rng.sign();
    const X: Pt = [rng.int(-reach, reach), rng.int(-reach, reach)];
    const step = (u: number, v: number): Pt => (along === 'x' ? [X[0] + u, X[1] + v] : [X[0] + v, X[1] + u]);
    const p: LevelTriParams = { X, Y: step(dir * b, 0), Z: step(dir * t, h), along, at: hard ? rng.int(0, 2) : 0 };
    if (!inReach([p.X, p.Y, p.Z], reach) || !keep(p)) continue;
    return p;
  }
}

function levelFigure(p: LevelTriParams): Block {
  const T = levelTri(p);
  return diagram(shapeFigure(windowFor(T), [T], `The triangle with corners ${T.map((X, i) => `${ABC[i]}${pt(...X)}`).join(', ')}`));
}

/** The line the level side lies on: y = 3, or x = -2. */
const baseLine = (p: LevelTriParams): string => (p.along === 'x' ? `y = ${p.X[1]}` : `x = ${p.X[0]}`);

/** Base and height read off the coordinates, then half their product. */
function levelSolution(p: LevelTriParams): SolutionStep[] {
  const { side, apex } = levelNames(p);
  const [i, j] = [baseAxis(p), heightAxis(p)];
  const [b, h] = [baseOf(p), heightOf(p)];
  const letter = ['x', 'y'];
  return [
    {
      text: `Both ends of $${side}$ are on the line $${baseLine(p)}$, so it runs straight ${p.along === 'x' ? 'across' : 'up'}. Take it as the base; the height is how far $${apex}$ is from that line, measured square on to it.`,
    },
    {
      tex: chain(
        `b &= |${p.Y[i]} - ${paren(p.X[i])}| = ${b}`,
        `h &= |${p.Z[j]} - ${paren(p.X[j])}| = ${h}`,
        `\\text{Area} &= \\tfrac{1}{2} \\times ${b} \\times ${h} = ${(b * h) / 2}`,
      ),
    },
    { text: `The base is a change in $${letter[i]}$ and the height a change in $${letter[j]}$: the slanted sides play no part.` },
  ];
}

/** The area of a triangle with a level side, typed. */
const coordTriArea: Generator<LevelTriParams> = {
  id: 'coord-tri-area',
  sample: (rng, difficulty) => sampleLevelTri(rng, difficulty),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`Triangle $ABC$ has ${cornersNamed(levelTri(p), ABC)}. Find its area.`), levelFigure(p)],
    lead: '\\text{Area} =',
    keypad: [],
    answer: String((baseOf(p) * heightOf(p)) / 2),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const [b, h] = [baseOf(p), heightOf(p)];
    return intOptions((b * h) / 2, [b * h, (b * Math.abs(p.Z[heightAxis(p)])) / 2, ((b + 1) * h) / 2, (b * (h + 1)) / 2], 1);
  },
  solution: levelSolution,
};

/** Base, height, then the area, as a tree. */
const coordBaseHeightTree: Generator<LevelTriParams> = {
  id: 'coord-base-height-tree',
  sample: (rng, difficulty) => sampleLevelTri(rng, difficulty),
  render: (p): Slide => {
    const [b, h] = [baseOf(p), heightOf(p)];
    const answer = [b, h, (b * h) / 2].map(String);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Triangle $ABC$ has ${cornersNamed(levelTri(p), ABC)}. Top row: the length of its level side, and the height of the third corner from it. Underneath: the area.`,
        ),
        levelFigure(p),
      ],
      expression: '\\tfrac{1}{2} \\times b \\times h',
      nodes: [
        { id: 'base', from: [] },
        { id: 'height', from: [] },
        { id: 'area', from: ['base', 'height'] },
      ],
      bank: bank(answer, [b + 1, h + 1, b * h, Math.abs(p.Z[heightAxis(p)])].map(String), [b, h, (b * h) / 2], 3),
      answer,
    };
  },
  solution: levelSolution,
};

/** Which half-base-times-height is the area: the slips take a coordinate, or a count of dots, for a length. */
const coordHalfBaseChoice: Generator<LevelTriParams> = {
  id: 'coord-half-base-choice',
  sample: (rng, difficulty) => sampleLevelTri(rng, difficulty),
  render: (p): Slide => {
    const [b, h] = [baseOf(p), heightOf(p)];
    const calc = (x: number, y: number) => `\\tfrac{1}{2} \\times ${x} \\times ${y}`;
    const along = Math.abs(p.Z[baseAxis(p)] - p.X[baseAxis(p)]);
    const slips: [string, number][] = [
      [`${b} \\times ${h}`, 2 * b * h],
      [calc(b, Math.abs(p.Z[heightAxis(p)])), b * Math.abs(p.Z[heightAxis(p)])],
      [calc(b + 1, h), (b + 1) * h],
      [calc(b, along), b * along],
      [calc(b, h + 1), b * (h + 1)],
    ];
    const opts: ChoiceOption[] = [{ tex: calc(b, h), correct: true }];
    for (const [tex, twice] of slips) {
      if (opts.length === 4) break;
      if (twice === b * h || twice === 0 || opts.some((o) => o.tex === tex)) continue;
      opts.push({ tex });
    }
    return choiceSlide([say(`Triangle $ABC$ has ${cornersNamed(levelTri(p), ABC)}. Which of these is its area?`), levelFigure(p)], opts);
  },
  solution: levelSolution,
};

/** A, B on a level line and C's other coordinate unknown: which side, and how far. */
function apexWhere(p: LevelTriParams): string {
  const up = liftOf(p) > 0;
  if (p.along === 'x') return up ? 'above' : 'below';
  return up ? 'to the right of' : 'to the left of';
}

/** C with its unknown coordinate written as k. */
const apexUnknown = (p: LevelTriParams): string => (p.along === 'x' ? `C(${p.Z[0]}, k)` : `C(k, ${p.Z[1]})`);

/** The height from the area, then the corner that far from the base on the side stated. */
function apexSolution(p: LevelTriParams, letter = 'k'): SolutionStep[] {
  const [b, h] = [baseOf(p), heightOf(p)];
  const j = heightAxis(p);
  const area = (b * h) / 2;
  return [
    {
      text: `$AB$ lies on the line $${baseLine(p)}$, so it is level and its length is the base: $b = ${b}$. Put the area into half base times height:`,
    },
    { tex: chain(`\\tfrac{1}{2} \\times ${b} \\times h &= ${area}`, `h &= ${area * 2} \\div ${b} = ${h}`) },
    {
      text: `$C$ is ${apexWhere(p)} $AB$, so ${liftOf(p) > 0 ? 'add' : 'take away'} the height: $${letter} = ${p.X[j]} ${liftOf(p) > 0 ? '+' : '-'} ${h} = ${p.Z[j]}$.`,
    },
  ];
}

/** C's height from the area, typed. Difficulty 2 stands AB straight up and puts C either side. */
const coordApexK: Generator<LevelTriParams> = {
  id: 'coord-apex-k',
  sample: (rng, difficulty) => ({ ...sampleLevelTri(rng, difficulty, (p) => difficulty > 1 || liftOf(p) > 0), at: 0 }),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `$${namedAt('A', p.X)}$ and $${namedAt('B', p.Y)}$ are two corners of triangle $ABC$, and $${apexUnknown(p)}$ lies ${apexWhere(p)} $AB$. The area of $ABC$ is $${(baseOf(p) * heightOf(p)) / 2}$. Find $k$.`,
      ),
    ],
    lead: 'k =',
    keypad: [],
    answer: String(p.Z[heightAxis(p)]),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const j = heightAxis(p);
    const s = Math.sign(liftOf(p));
    const h = heightOf(p);
    return intOptions(p.Z[j], [p.X[j] - s * h, p.X[j] + (s * h) / 2, s * h, p.X[j] + 2 * s * h]);
  },
  solution: (p) => apexSolution(p),
};

/** The same question with the answer dragged: C slides along its dashed line. */
const coordApexSlider: Generator<LevelTriParams> = {
  id: 'coord-apex-slider',
  sample: (rng, difficulty) => ({ ...sampleLevelTri(rng, difficulty, (p) => difficulty > 1 || liftOf(p) > 0), at: 0 }),
  render: (p): Slide => {
    const across = p.along === 'x';
    const axis = across ? 'y' : 'x';
    const guide: [Pt, Pt] = across ? [[p.Z[0], -10], [p.Z[0], 10]] : [[-10, p.Z[1]], [10, p.Z[1]]];
    return {
      kind: 'slider',
      prompt: [
        say(
          `$${namedAt('A', p.X)}$ and $${namedAt('B', p.Y)}$ are drawn. $C$ is on the dashed line $${across ? `x = ${p.Z[0]}` : `y = ${p.Z[1]}`}$, ${apexWhere(p)} $AB$, and triangle $ABC$ has area $${(baseOf(p) * heightOf(p)) / 2}$. Slide to $C$'s ${across ? 'height' : '$x$-coordinate'}.`,
        ),
      ],
      min: -10,
      max: 10,
      step: 1,
      answer: p.Z[heightAxis(p)],
      readout: `${axis} = {v}`,
      figure: {
        svg: shapeFigure(WIDE, [[p.X, p.Y]], 'The side AB, and the dashed line the third corner lies on', [guide]),
        axis,
        ...markerWindow(-10, 10, axis, SQUARE),
      },
    };
  },
  solution: (p) => apexSolution(p, p.along === 'x' ? 'y_C' : 'x_C'),
};

/* ---------- lesson 2: the box and the shoelace ---------- */

interface BoxParams {
  /** The corner the triangle shares with the box round it. */
  P: Pt;
  /** The box's width and height. */
  w: number;
  h: number;
  /** How far up the far side the second corner sits, and along the far top the third. */
  s: number;
  t: number;
  /** Which way the box runs from P. */
  fx: number;
  fy: number;
  /** Which of A, B, C the shared corner is. */
  at: number;
}

/** P, the corner on the far side, the corner on the far top. */
function boxPoints({ P, w, h, s, t, fx, fy }: BoxParams): Tri {
  return [P, [P[0] + fx * w, P[1] + fy * s], [P[0] + fx * t, P[1] + fy * h]];
}

const boxTri = (p: BoxParams): Tri => placed(boxPoints(p), p.at);

/** The box's four corners, going round. */
function boxOf({ P, w, h, fx, fy }: BoxParams): Pt[] {
  return [P, [P[0] + fx * w, P[1]], [P[0] + fx * w, P[1] + fy * h], [P[0], P[1] + fy * h]];
}

/** The legs of the three right-angled corners the box has left over. */
const cornerLegs = ({ w, h, s, t }: BoxParams): [number, number][] => [
  [w, s],
  [w - t, h - s],
  [t, h],
];

/** Twice the area: the box less its corners comes to (wh - ts) / 2. */
const boxArea2 = ({ w, h, s, t }: BoxParams): number => w * h - t * s;

/**
 * A triangle with no side level, drawn from the box round it: one corner at
 * the box's corner and the other two strictly inside its far sides, which is
 * what leaves exactly three right-angled corners to take away.
 */
function sampleBox(rng: Rng, difficulty: number): BoxParams {
  const hard = difficulty > 1;
  const reach = hard ? 7 : 5;
  for (;;) {
    const w = rng.int(2, hard ? 7 : 5);
    const h = rng.int(2, hard ? 7 : 5);
    const s = rng.int(1, h - 1);
    const t = rng.int(1, w - 1);
    if ((w * h - t * s) % 2 !== 0) continue;
    const p: BoxParams = { P: [rng.int(-reach, reach), rng.int(-reach, reach)], w, h, s, t, fx: rng.sign(), fy: rng.sign(), at: rng.int(0, 2) };
    if (!inReach(boxOf(p), reach)) continue;
    return p;
  }
}

function boxFigure(p: BoxParams, withBox: boolean): Block {
  const T = boxTri(p);
  const B = boxOf(p);
  const sides: [Pt, Pt][] = withBox ? B.map((X, i) => [X, B[(i + 1) % 4]]) : [];
  return diagram(shapeFigure(windowFor(B), [T], `The triangle with corners ${T.map((X, i) => `${ABC[i]}${pt(...X)}`).join(', ')}`, sides, T));
}

/** The box, its three corners, and the difference. */
function boxSolution(p: BoxParams): SolutionStep[] {
  const { w, h } = p;
  const B = boxOf(p);
  const xs = [B[0][0], B[2][0]].sort((a, b) => a - b);
  const ys = [B[0][1], B[2][1]].sort((a, b) => a - b);
  const legs = cornerLegs(p);
  const cut = legs.map(([a, b]) => a * b);
  const corners = (cut[0] + cut[1] + cut[2]) / 2;
  return [
    {
      text: `The box round the triangle runs from $x = ${xs[0]}$ to $x = ${xs[1]}$ and from $y = ${ys[0]}$ to $y = ${ys[1]}$: $${w}$ by $${h}$, so its area is $${w * h}$.`,
    },
    { text: 'The triangle leaves three right-angled triangles in the corners of the box, each half of its two legs multiplied:' },
    { tex: chain(...legs.map(([a, b], i) => `T_${i + 1} &= \\tfrac{1}{2} \\times ${a} \\times ${b} = ${halfOf(a * b)}`)) },
    { tex: chain(`\\text{Area} &= ${w * h} - ${halfOf(cut[0])} - ${halfOf(cut[1])} - ${halfOf(cut[2])}`, `&= ${w * h} - ${corners} = ${boxArea2(p) / 2}`) },
  ];
}

const boxPrompt = (p: BoxParams): string => `Triangle $ABC$ has ${cornersNamed(boxTri(p), ABC)}.`;

/** The box less its three corners, one tap at a time. */
const coordBoxSteps: Generator<BoxParams> = {
  id: 'coord-box-steps',
  sample: sampleBox,
  render: (p): Slide => {
    const { w, h } = p;
    const legs = cornerLegs(p);
    const corner = ([a, b]: [number, number]) => `\\tfrac{1}{2} \\times ${a} \\times ${b}`;
    const cut = legs.map(([a, b]) => a * b);
    const area2 = boxArea2(p);
    const called = (v: string) => `\\text{Area} = ${v}`;
    return {
      kind: 'steps',
      prompt: [
        say(`${boxPrompt(p)} Its area is the box round it less three right-angled corners. Tap the part you would work out **next**, then choose its value.`),
        boxFigure(p, true),
      ],
      start: [`${w} \\times ${h}`, '-', corner(legs[0]), '-', corner(legs[1]), '-', corner(legs[2])],
      reductions: [
        { span: [0, 1], value: String(w * h), bank: stepBank(String(w * h), String(w + h), String((w + 1) * (h + 1)), String(2 * (w + h))) },
        ...legs.map(([a, b], i) => ({
          span: [2 + 2 * i, 3 + 2 * i] as [number, number],
          value: halfOf(a * b),
          bank: stepBank(halfOf(a * b), String(a * b), String(a + b), halfOf((a + 1) * b)),
        })),
        {
          span: [0, 7],
          value: called(halfOf(area2)),
          bank: stepBank(called(halfOf(area2)), called(halfOf(cut[0] + cut[1] + cut[2])), called(String(area2)), called(halfOf(area2 + 2))),
        },
      ],
    };
  },
  solution: boxSolution,
};

/** The box, the corners, the area: three forks. */
const coordBoxFlow: Generator<BoxParams> = {
  id: 'coord-box-flow',
  sample: sampleBox,
  render: (p): Slide => {
    const { w, h, s, t } = p;
    const box = w * h;
    const corners = (w * h + t * s) / 2;
    const area = (w * h - t * s) / 2;
    const boxes = numberLabels([box, (w + 1) * (h + 1), 2 * (w + h), w + h]);
    const cuts = numberLabels([corners, w * h + t * s, corners + 1, corners - 1]);
    const areas = numberLabels([area, corners, area * 2, area + 1]);
    return {
      kind: 'flow',
      prompt: [say(`${boxPrompt(p)} Find its area from the box round it.`), boxFigure(p, true)],
      subject: '\\text{Area} = \\text{box} - \\text{corners}',
      steps: [
        { id: 'box', ask: 'What is the area of the box round the triangle?', branches: onward(boxes, 'corners') },
        { id: 'corners', ask: 'What do the three right-angled corners add up to?', branches: onward(cuts, 'area') },
        { id: 'area', ask: 'So what is the area of $ABC$?', branches: leaves(areas, (label) => `So the area of $ABC$ is ${label}.`) },
      ],
      answer: [boxes[0], cuts[0], areas[0]],
    };
  },
  solution: boxSolution,
};

/** The shoelace as a tree: three cross terms, their sum, half its size. */
const coordShoelaceTree: Generator<BoxParams> = {
  id: 'coord-shoelace-tree',
  sample: sampleBox,
  render: (p): Slide => {
    const T = boxTri(p);
    const [A, B, C] = T;
    const terms = [crossPt(A, B), crossPt(B, C), crossPt(C, A)];
    const sum = shoelace2(T);
    const answer = [...terms, sum, Math.abs(sum) / 2].map(String);
    const reversed = [A[0] * B[1] + B[0] * A[1], ...terms.map((c) => -c), -sum, Math.abs(sum), sum / 2];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${boxPrompt(p)} Find its area by the shoelace. Top row: $x_Ay_B - x_By_A$, then $x_By_C - x_Cy_B$, then $x_Cy_A - x_Ay_C$. Next: their sum. Last: the area, half its size.`,
        ),
      ],
      expression: '\\text{Area} = \\tfrac{1}{2}\\lvert \\text{sum} \\rvert',
      nodes: [
        { id: 'ab', from: [] },
        { id: 'bc', from: [] },
        { id: 'ca', from: [] },
        { id: 'sum', from: ['ab', 'bc', 'ca'] },
        { id: 'area', from: ['sum'] },
      ],
      bank: bank(answer, reversed.map(String), [Math.abs(sum) / 2], 3),
      answer,
    };
  },
  solution: (p) => [
    { text: 'Take the corners in order round the triangle, and for each side multiply across and take away:' },
    ...shoelaceLines(boxTri(p), ABC),
    { text: 'The box round it gives the same number, which is the check.' },
  ],
};

/** The area of a triangle with no side level, typed. */
const coordBoxArea: Generator<BoxParams> = {
  id: 'coord-box-area',
  sample: sampleBox,
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`${boxPrompt(p)} None of its sides is level. Find its area.`), boxFigure(p, false)],
    lead: '\\text{Area} =',
    keypad: [],
    answer: halfOf(boxArea2(p)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const { w, h, s, t } = p;
    const area = boxArea2(p) / 2;
    return intOptions(area, [boxArea2(p), w * h, (w * h + t * s) / 2, area + w, (w * h) / 2], 1);
  },
  solution: (p) => [...boxSolution(p), { text: 'The shoelace gives the same, with no box to draw:' }, ...shoelaceLines(boxTri(p), ABC)],
};

/* ---------- lesson 3: polygons ---------- */

/** Four lattice corners, taken in order round a convex quadrilateral whose area is whole. */
function sampleConvexQuad(rng: Rng, difficulty: number, keep: (P: Four) => boolean = () => true): Four {
  const reach = difficulty > 1 ? 7 : 5;
  for (;;) {
    const P = [0, 1, 2, 3].map(() => [rng.int(-reach, reach), rng.int(-reach, reach)] as Pt) as Four;
    if (!convex(P)) continue;
    const twice = Math.abs(shoelace2(P));
    if (twice % 2 !== 0 || twice < 12 || !keep(P)) continue;
    return P;
  }
}

interface SplitParams {
  P: Four;
  /** 0 splits along AC, into ABC and ACD; 1 along BD, into ABD and BCD. */
  cut: number;
}

/** The two triangles a diagonal makes, as corner indices. */
const halvesOf = (cut: number): [number[], number[]] =>
  cut === 0
    ? [
        [0, 1, 2],
        [0, 2, 3],
      ]
    : [
        [0, 1, 3],
        [1, 2, 3],
      ];

const nameOfPart = (idx: number[]): string => idx.map((i) => QUAD[i]).join('');

/** Twice each triangle's area. */
function partAreas2({ P, cut }: SplitParams): [number, number] {
  const [one, two] = halvesOf(cut);
  return [Math.abs(shoelace2(one.map((i) => P[i]))), Math.abs(shoelace2(two.map((i) => P[i])))];
}

function quadFigure(P: Four, diagonal?: [Pt, Pt]): Block {
  return diagram(
    shapeFigure(windowFor(P), [P], `The quadrilateral with corners ${P.map((X, i) => `${QUAD[i]}${pt(...X)}`).join(', ')}`, diagonal ? [diagonal] : []),
  );
}

/** The quadrilateral as two triangles, each by the shoelace. */
function splitSolution(p: SplitParams): SolutionStep[] {
  const [one, two] = halvesOf(p.cut);
  const [a1, a2] = partAreas2(p);
  return [
    { text: `The diagonal splits $ABCD$ into $${nameOfPart(one)}$ and $${nameOfPart(two)}$. By the shoelace, $${nameOfPart(one)}$ first:` },
    ...shoelaceLines(
      one.map((i) => p.P[i]),
      one.map((i) => QUAD[i]),
    ),
    { text: `Then $${nameOfPart(two)}$:` },
    ...shoelaceLines(
      two.map((i) => p.P[i]),
      two.map((i) => QUAD[i]),
    ),
    { text: `So $ABCD$ has area $${a1 / 2} + ${a2 / 2} = ${(a1 + a2) / 2}$.` },
  ];
}

/** Each triangle a diagonal makes, then their sum, as a tree. */
const coordQuadSplitTree: Generator<SplitParams> = {
  id: 'coord-quad-split-tree',
  sample: (rng, difficulty) => {
    const cut = difficulty > 1 ? rng.int(0, 1) : 0;
    const P = sampleConvexQuad(rng, difficulty, (Q) => partAreas2({ P: Q, cut }).every((a) => a % 2 === 0));
    return { P, cut };
  },
  render: (p): Slide => {
    const [one, two] = halvesOf(p.cut);
    const [a1, a2] = partAreas2(p).map((a) => a / 2);
    const answer = [a1, a2, a1 + a2].map(String);
    const diagonal = p.cut === 0 ? 'AC' : 'BD';
    const ends: [Pt, Pt] = p.cut === 0 ? [p.P[0], p.P[2]] : [p.P[1], p.P[3]];
    return {
      kind: 'tree',
      prompt: [
        say(
          `The quadrilateral $ABCD$ has ${cornersNamed(p.P, QUAD)}. The diagonal $${diagonal}$ splits it into triangles $${nameOfPart(one)}$ and $${nameOfPart(two)}$. Top row: their areas. Underneath: the area of $ABCD$.`,
        ),
        quadFigure(p.P, ends),
      ],
      expression: `\\text{area } ${nameOfPart(one)} + \\text{area } ${nameOfPart(two)}`,
      nodes: [
        { id: 'one', from: [] },
        { id: 'two', from: [] },
        { id: 'whole', from: ['one', 'two'] },
      ],
      bank: bank(answer, [2 * a1, 2 * a2, Math.abs(a1 - a2), 2 * (a1 + a2)].map(String), [a1, a2, a1 + a2], 3),
      answer,
    };
  },
  solution: splitSolution,
};

/**
 * A parallelogram's area: twice triangle ABC, which is the shoelace sum left
 * unhalved. Difficulty 1 names all four corners; difficulty 2 names three.
 */
const coordParaArea: Generator<QuadParams & { given: number }> = {
  id: 'coord-para-area',
  sample: (rng, difficulty) => ({ ...sampleQuad(rng, difficulty, ALL_QUADS), given: difficulty > 1 ? 3 : 4 }),
  render: (p): Slide => {
    const P = quadOf(p);
    return {
      kind: 'expression',
      prompt: [say(`$ABCD$ is a parallelogram with ${cornersNamed(P.slice(0, p.given), QUAD)}. Find its area.`)],
      lead: '\\text{Area} =',
      keypad: [],
      answer: String(Math.abs(crossPt(p.u, p.v))),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const area = Math.abs(crossPt(p.u, p.v));
    return intOptions(area, [area / 2, 2 * area, dotPt(p.u, p.u), Math.abs(dotPt(p.u, p.v))], 1);
  },
  solution: (p) => {
    const [A, B, C] = quadOf(p);
    const twice = Math.abs(shoelace2([A, B, C]));
    return [
      { text: 'The diagonal $AC$ cuts a parallelogram into two equal triangles, so its area is twice that of $ABC$. By the shoelace:' },
      ...shoelaceLines([A, B, C], ABC).slice(0, 1),
      { text: `The sum is twice the area of $ABC$, and so it is exactly the area of $ABCD$: $${twice}$.` },
    ];
  },
};

interface ShoelaceQuadParams {
  P: Four;
}

/** A value written after a plus sign: a negative one bracketed. */
const afterPlus = (v: number): string => (v < 0 ? `(${v})` : String(v));

/** The shoelace on a quadrilateral, one term a tap, then the sum, then the area. Difficulty 1 puts A at the origin. */
const coordPolyShoelaceSteps: Generator<ShoelaceQuadParams> = {
  id: 'coord-poly-shoelace-steps',
  sample: (rng, difficulty) => ({
    P: sampleConvexQuad(rng, difficulty, (P) => difficulty > 1 || (P[0][0] === 0 && P[0][1] === 0)),
  }),
  render: ({ P }): Slide => {
    const term = (X: Pt, Y: Pt) => `[(${X[0]})(${Y[1]}) - (${Y[0]})(${X[1]})]`;
    const pairs = P.map((X, i): [Pt, Pt] => [X, P[(i + 1) % 4]]);
    const sum = shoelace2(P);
    return {
      kind: 'steps',
      prompt: [
        say(
          `The quadrilateral $ABCD$ has ${cornersNamed(P, QUAD)}. Find its area by the shoelace: tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: ['\\tfrac{1}{2}\\,\\lvert', ...pairs.flatMap(([X, Y], i) => (i === 0 ? [term(X, Y)] : ['+', term(X, Y)])), '\\rvert'],
      reductions: [
        ...pairs.map(([X, Y], i) => {
          const c = crossPt(X, Y);
          return {
            span: [1 + 2 * i, 2 + 2 * i] as [number, number],
            value: afterPlus(c),
            bank: stepBank(afterPlus(c), afterPlus(X[0] * Y[1] + Y[0] * X[1]), afterPlus(-c), afterPlus(X[0] * X[1] - Y[0] * Y[1]), afterPlus(c + 1)),
          };
        }),
        { span: [1, 8], value: String(sum), bank: stepBank(String(sum), String(-sum), String(sum + 2), String(sum - 2)) },
        {
          span: [0, 3],
          value: String(Math.abs(sum) / 2),
          bank: stepBank(String(Math.abs(sum) / 2), String(Math.abs(sum)), String(Math.abs(sum) / 2 + 1), String(Math.abs(sum) / 2 - 1)),
        },
      ],
    };
  },
  solution: ({ P }) => [
    { text: 'Go round the corners in order, and for each side multiply across and take away:' },
    ...shoelaceLines(P, QUAD),
  ],
};

interface AreaKParams {
  A: Pt;
  B: Pt;
  /** C's known coordinate. */
  c: number;
  /** Where the two answers are centred, and how far either side. */
  k0: number;
  e: number;
  /** Difficulty 2: AB is slanted and k is C's x-coordinate. */
  slanted: boolean;
}

/** How much twice the area changes for each 1 that k moves. */
const kRate = ({ A, B, slanted }: AreaKParams): number => (slanted ? Math.abs(B[1] - A[1]) : Math.abs(B[0] - A[0]));

/**
 * C(c, k), or C(k, c) at difficulty 2, from the area: two answers, one either
 * side of the line through A and B. Built from k0, where C would be on AB,
 * and e, the distance either side, so both answers are whole.
 */
const coordAreaKTiles: Generator<AreaKParams> = {
  id: 'coord-area-k-tiles',
  sample: (rng, difficulty) => {
    const slanted = difficulty > 1;
    for (;;) {
      const A: Pt = [rng.int(-5, 5), rng.int(-5, 5)];
      const B: Pt = slanted ? [A[0] + nz(rng, 4), A[1] + nz(rng, 4)] : [A[0] + nz(rng, 6), A[1]];
      const c = rng.int(-5, 5);
      const [dx, dy] = minusPt(B, A);
      // Where C is on the line AB: its k makes the cross product zero.
      const top = slanted ? dx * (c - A[1]) + dy * A[0] : A[1] * dx;
      const rate = slanted ? dy : dx;
      if (top % rate !== 0) continue;
      const e = rng.int(1, 5);
      const params: AreaKParams = { A, B, c, k0: top / rate, e, slanted };
      if ((kRate(params) * e) % 2 !== 0 || !inReach([B], 9) || Math.abs(params.k0) + e > 12) continue;
      return params;
    }
  },
  render: (p): Slide => {
    const answer = [p.k0 - p.e, p.k0 + p.e].map(String);
    const area = (kRate(p) * p.e) / 2;
    return {
      kind: 'tiles',
      prompt: [
        say(
          `Triangle $ABC$ has $${namedAt('A', p.A)}$, $${namedAt('B', p.B)}$ and $C(${p.slanted ? `k, ${p.c}` : `${p.c}, k`})$, and its area is $${area}$. Find the two values of $k$.`,
        ),
      ],
      template: 'k = {0} \\text{ or } k = {1}',
      bank: bank(answer, [p.k0 - 2 * p.e, p.k0 + 2 * p.e, p.e, -p.e].map(String), [p.k0], 2),
      answer,
      unordered: true,
    };
  },
  solution: (p) => {
    const area = (kRate(p) * p.e) / 2;
    const [k1, k2] = [p.k0 - p.e, p.k0 + p.e];
    if (!p.slanted) {
      const b = kRate(p);
      return [
        { text: `$AB$ lies on the line $y = ${p.A[1]}$, so it is level with length $${b}$. The height of $C$ from it is the gap between $k$ and $${p.A[1]}$:` },
        { tex: chain(`\\tfrac{1}{2} \\times ${b} \\times h &= ${area}`, `h &= ${2 * area} \\div ${b} = ${p.e}`) },
        { text: `$C$ can be that far above $AB$ or that far below it: $k = ${p.A[1]} + ${p.e} = ${k2}$ or $k = ${p.A[1]} - ${p.e} = ${k1}$.` },
      ];
    }
    const [dx, dy] = minusPt(p.B, p.A);
    // Twice the signed area is alpha - dy * k.
    const alpha = dx * (p.c - p.A[1]) + dy * p.A[0];
    const inside = sumTex([String(alpha), termOf(q(-dy), 'k')]);
    return [
      {
        text: `Twice the area is the size of the shoelace sum, which with $A$ as the corner comes to $|(x_B - x_A)(y_C - y_A) - (y_B - y_A)(x_C - x_A)|$. So:`,
      },
      {
        tex: `{\\small ${chain(`${2 * area} &= |(${dx})(${p.c - p.A[1]}) - (${dy})(${lin('k', p.A[0])})|`, `&= |${inside}|`)}}`,
      },
      { text: `So $${inside} = ${2 * area}$ or $${inside} = -${2 * area}$, one for each side of $AB$: $k = ${k1}$ or $k = ${k2}$.` },
    ];
  },
};

/* ---------- lesson 4: a locus as an equation ---------- */

/** "(x - 2)^2 + (y + 1)^2", or x^2 where the centre has a zero coordinate. */
function squaresTex([a, b]: Pt): string {
  const part = (letter: string, c: number) => (c === 0 ? `${letter}^2` : `(${lin(letter, c)})^2`);
  return `${part('x', a)} + ${part('y', b)}`;
}

/** (x - a)^2 + (y - b)^2 multiplied out, times m: 4x^2 + 4y^2 - 8x + 12y + 52. */
function expandedSquares([a, b]: Pt, m = 1, linear = m, constant = m): string {
  const sq = m === 1 ? '' : String(m);
  return sumTex([`${sq}x^2`, `${sq}y^2`, termOf(q(-2 * a * linear)), termOf(q(-2 * b * linear), 'y'), String((a * a + b * b) * constant)]);
}

/** ax + by + k = 0 divided through by its common factor, the first term positive. */
function reducedLine(a: number, b: number, k: number): [number, number, number] {
  const g = gcd(gcd(a, b), k) * ((a || b) < 0 ? -1 : 1);
  return [a / g + 0, b / g + 0, k / g + 0];
}

const lineTexOf = ([a, b, k]: [number, number, number]): string => generalTex(a, b, k);

type LocusKind = 'circle' | 'bisector';

interface LocusOnParams {
  kind: LocusKind;
  /** The centre, or the midpoint of AB. */
  M: Pt;
  /** The step from the centre to the point on it, or from M to B. */
  v: Pt;
  /** The perpendicular step from M along the bisector to the point on it. */
  t: number;
}

const pointOnLocus = ({ kind, M, v, t }: LocusOnParams): Pt => (kind === 'circle' ? plusPt(M, v) : plusPt(M, scalePt(t, primitive([-v[1], v[0]]))));

/** Whether X is on the locus the prompt describes, tested from the condition itself. */
function onLocus({ kind, M, v }: LocusOnParams, X: Pt): boolean {
  return kind === 'circle' ? dist2(M, X) === dotPt(v, v) : dist2(X, minusPt(M, v)) === dist2(X, plusPt(M, v));
}

/** Every lattice step of length 5, with the four along the axes. */
const FIVES: Pt[] = [...latticeVectors(25), [5, 0], [-5, 0], [0, 5], [0, -5]];

/** Which point lies on a circle, or on the set equally far from two points. */
const coordLocusOnChoice: Generator<LocusOnParams> = {
  id: 'coord-locus-on-choice',
  sample: (rng, difficulty) => {
    const kind: LocusKind = difficulty > 1 && rng.chance(0.5) ? 'bisector' : 'circle';
    if (kind === 'circle') return { kind, M: [rng.int(-3, 3), rng.int(-3, 3)], v: rng.pick(FIVES), t: 0 };
    const v: Pt = [nz(rng, 3), rng.int(-3, 3)];
    return { kind, M: [rng.int(-3, 3), rng.int(-3, 3)], v, t: nz(rng, 2) };
  },
  render: (p): Slide => {
    const X = pointOnLocus(p);
    const text =
      p.kind === 'circle'
        ? `$P$ moves so that it is always $5$ from $${namedAt('C', p.M)}$. Which of these points is on the locus of $P$?`
        : `$P$ moves so that it is always as far from $${namedAt('A', minusPt(p.M, p.v))}$ as from $${namedAt('B', plusPt(p.M, p.v))}$. Which of these points is on the locus of $P$?`;
    const [x, y] = minusPt(X, p.M);
    const candidates: Pt[] = [
      plusPt(p.M, [x + 1, y]),
      plusPt(p.M, [x, y - 1]),
      plusPt(p.M, [x - 1, y + 1]),
      plusPt(p.M, [x + y, y]),
      plusPt(p.M, [y + 1, x]),
      plusPt(p.M, primitive(p.v)),
      plusPt(X, [1, 1]),
      plusPt(X, [2, 0]),
      plusPt(X, [0, 2]),
    ];
    return choiceSlide([say(text)], pointOptions(X, candidates, (Y) => !onLocus(p, Y)));
  },
  solution: (p) => {
    const X = pointOnLocus(p);
    if (p.kind === 'circle') {
      const [dx, dy] = minusPt(X, p.M);
      return [
        { text: `The locus is the circle with centre $C$ and radius $5$: a point is on it exactly when its squared distance from $C$ is $25$.` },
        { tex: `CP^2 = ${paren(dx)}^2 + ${paren(dy)}^2 = ${dx * dx + dy * dy}` },
        { text: `So $${pt(...X)}$ is on it. Each of the others is nearer or further than $5$.` },
      ];
    }
    const [A, B] = [minusPt(p.M, p.v), plusPt(p.M, p.v)];
    return [
      { text: 'The locus is the perpendicular bisector of $AB$: a point is on it exactly when its squared distances from $A$ and from $B$ are equal.' },
      { tex: chain(lengthLine('PA', X, A), lengthLine('PB', X, B)) },
      { text: `They match, so $${pt(...X)}$ is on it. For each of the others they differ.` },
    ];
  },
};

interface CircleLocusParams {
  C: Pt;
  /** The radius, at difficulty 1; the point it passes through, at difficulty 2. */
  r: number;
  Q: Pt | null;
}

const locusR2 = ({ C, r, Q }: CircleLocusParams): number => (Q ? dist2(C, Q) : r * r);

/** A fixed distance from a point, written as the circle's equation in tiles. */
const coordLocusCircleTiles: Generator<CircleLocusParams> = {
  id: 'coord-locus-circle-tiles',
  sample: (rng, difficulty) => {
    const C: Pt = [nz(rng, 5), nz(rng, 5)];
    if (difficulty < 2) return { C, r: rng.int(2, 7), Q: null };
    for (;;) {
      const d: Pt = [rng.int(-4, 4), rng.int(-4, 4)];
      if (slantedVec(d)) return { C, r: 0, Q: plusPt(C, d) };
    }
  },
  render: (p): Slide => {
    const [a, b] = p.C;
    const r2 = locusR2(p);
    const answer = [signedN(-a), signedN(-b), String(r2)];
    const [dx, dy] = p.Q ? minusPt(p.Q, p.C) : [p.r, 0];
    const slips = [signedN(a), signedN(b), String(p.Q ? Math.abs(dx) + Math.abs(dy) : p.r), String(p.Q ? r2 + 1 : 2 * p.r)];
    const text = p.Q
      ? `$P$ moves on a circle about $${namedAt('C', p.C)}$ that passes through $${namedAt('Q', p.Q)}$. Write the locus of $P$ as an equation.`
      : `$P$ moves so that it is always $${p.r}$ from $${namedAt('C', p.C)}$. Write the locus of $P$ as an equation.`;
    return {
      kind: 'tiles',
      prompt: [say(text)],
      template: '(x {0})^2 + (y {1})^2 = {2}',
      bank: bank(answer, slips, [r2], 2),
      answer,
    };
  },
  solution: (p) => {
    const r2 = locusR2(p);
    const lead = p.Q
      ? [{ text: `Its radius is $CQ$, so $r^2$ is the squared distance from $C$ to $Q$:` }, { tex: lengthLine('CQ', p.C, p.Q).replace('&', '') }]
      : [{ text: `Every point $${p.r}$ from $C$ makes a circle with centre $C$ and radius $${p.r}$, so $r^2 = ${r2}$.` }];
    return [
      ...lead,
      { text: 'A point $(x, y)$ is on it when its squared distance from the centre is $r^2$:' },
      { tex: circleTex(p.C[0], p.C[1], r2) },
    ];
  },
};

interface TwoPointParams {
  A: Pt;
  B: Pt;
}

/** The locus equally far from A and B, as the working goes: expand, cancel, tidy. */
function equidistantLine({ A, B }: TwoPointParams): { collected: [number, number, number]; reduced: [number, number, number] } {
  const collected: [number, number, number] = [2 * (B[0] - A[0]), 2 * (B[1] - A[1]), dotPt(A, A) - dotPt(B, B)];
  return { collected, reduced: reducedLine(...collected) };
}

/** PA^2 = PB^2 squared out one side at a time, then the squares cancelled. */
const coordLocusBisectorSteps: Generator<TwoPointParams> = {
  id: 'coord-locus-bisector-steps',
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 6 : 4;
    for (;;) {
      const A: Pt = [rng.int(-reach, reach), rng.int(-reach, reach)];
      const B: Pt = [rng.int(-reach, reach), rng.int(-reach, reach)];
      if (samePt(A, B) || (difficulty > 1 && !slanted(A, B))) continue;
      return { A, B };
    }
  },
  render: (p): Slide => {
    const { A, B } = p;
    const { collected, reduced } = equidistantLine(p);
    const expandBank = (X: Pt) =>
      stepBank(expandedSquares(X), expandedSquares([-X[0], -X[1]]), expandedSquares(X, 1, 1, 0), sumTex(['x^2', 'y^2', termOf(q(-X[0])), termOf(q(-X[1]), 'y'), String(dotPt(X, X))]));
    const [a, b, k] = collected;
    const tidy = !(reduced[0] === a && reduced[1] === b && reduced[2] === k);
    return {
      kind: 'steps',
      prompt: [
        say(
          `$P(x, y)$ moves so that it is always as far from $${namedAt('A', A)}$ as from $${namedAt('B', B)}$. Square the distances and simplify to find its locus: tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: [squaresTex(A), '=', squaresTex(B)],
      reductions: [
        { span: [0, 1], value: expandedSquares(A), bank: expandBank(A) },
        { span: [2, 3], value: expandedSquares(B), bank: expandBank(B) },
        {
          span: [0, 3],
          value: generalTex(a, b, k),
          bank: stepBank(generalTex(a, b, k), generalTex(a, b, -k), generalTex(-a, -b, k), generalTex(a / 2, b / 2, k)),
        },
        ...(tidy
          ? [
              {
                span: [0, 1] as [number, number],
                value: lineTexOf(reduced),
                bank: stepBank(lineTexOf(reduced), generalTex(reduced[0], reduced[1], -reduced[2]), generalTex(reduced[0], reduced[1], k), generalTex(-reduced[0], reduced[1], reduced[2])),
              },
            ]
          : []),
      ],
    };
  },
  solution: (p) => {
    const { A, B } = p;
    const { collected, reduced } = equidistantLine(p);
    return [
      { text: '$PA^2 = PB^2$, written with the distance formula and multiplied out:' },
      { tex: chain(`&${squaresTex(A)}`, `=\\;&${expandedSquares(A)}`) },
      { tex: chain(`&${squaresTex(B)}`, `=\\;&${expandedSquares(B)}`) },
      { text: 'Both have $x^2 + y^2$, which cancels, so the locus is a straight line. Take the right side from the left:' },
      { tex: lineTexOf(collected) },
      ...(lineTexOf(reduced) === lineTexOf(collected) ? [] : [{ text: 'Divide through by the common factor:' }, { tex: lineTexOf(reduced) }]),
      { text: 'That is the perpendicular bisector of $AB$.' },
    ];
  },
};

type NameKind = 'circle' | 'bisector' | 'lines';

interface LocusNameParams {
  kind: NameKind;
  /** The centre, the midpoint of AB, or the value c of the line x = c or y = c. */
  M: Pt;
  /** The radius, the distance from the line; for the bisector, the step from M to B. */
  r: number;
  v: Pt;
  axis: 'x' | 'y';
}

const SHAPES: Record<NameKind, string> = { circle: 'A circle', bisector: 'A straight line', lines: 'Two parallel lines' };

/** A line through X with normal n, tidied: n.(P - X) = 0. */
const lineThrough = (n: Pt, X: Pt): [number, number, number] => reducedLine(n[0], n[1], -dotPt(n, X));

/** The locus's equation, then three slips, all as flow labels. */
function locusEquations(p: LocusNameParams): string[] {
  const out: string[] = [];
  const offer = (tex: string) => {
    const label = `$${tex}$`;
    if (!out.includes(label)) out.push(label);
  };
  if (p.kind === 'circle') {
    const [a, b] = p.M;
    offer(circleTex(a, b, p.r * p.r));
    offer(circleTex(a, b, p.r));
    offer(circleTex(-a, -b, p.r * p.r));
    offer(circleTex(-a, -b, p.r));
  } else if (p.kind === 'bisector') {
    const A = minusPt(p.M, p.v);
    offer(lineTexOf(lineThrough(p.v, p.M)));
    offer(lineTexOf(lineThrough([-p.v[1], p.v[0]], p.M)));
    offer(lineTexOf(lineThrough(p.v, A)));
    offer(lineTexOf(lineThrough(p.v, [-p.M[0], -p.M[1]])));
  } else {
    const c = p.axis === 'x' ? p.M[0] : p.M[1];
    const other = p.axis === 'x' ? 'y' : 'x';
    offer(`${p.axis} = ${c - p.r} \\text{ and } ${p.axis} = ${c + p.r}`);
    offer(`${p.axis} = ${-p.r} \\text{ and } ${p.axis} = ${p.r}`);
    offer(`${other} = ${c - p.r} \\text{ and } ${other} = ${c + p.r}`);
    offer(`${p.axis} = ${c - 2 * p.r} \\text{ and } ${p.axis} = ${c + 2 * p.r}`);
  }
  return out.slice(0, 4);
}

/** The condition, in words. */
function locusWords(p: LocusNameParams): string {
  if (p.kind === 'circle') return `$P$ moves so that it is always $${p.r}$ from $${namedAt('C', p.M)}$.`;
  if (p.kind === 'bisector') {
    return `$P$ moves so that it is always as far from $${namedAt('A', minusPt(p.M, p.v))}$ as from $${namedAt('B', plusPt(p.M, p.v))}$.`;
  }
  const c = p.axis === 'x' ? p.M[0] : p.M[1];
  return `$P$ moves so that it is always $${p.r}$ from the line $${p.axis} = ${c}$.`;
}

/** What shape the locus is, then which equation. */
const coordLocusNameFlow: Generator<LocusNameParams> = {
  id: 'coord-locus-name-flow',
  sample: (rng, difficulty) => {
    const kinds: NameKind[] = difficulty > 1 ? ['circle', 'bisector', 'lines'] : ['circle', 'lines'];
    const kind = rng.pick(kinds);
    const M: Pt = [nz(rng, 5), nz(rng, 5)];
    const v: Pt = difficulty > 1 ? [nz(rng, 3), nz(rng, 3)] : [nz(rng, 3), rng.int(-3, 3)];
    return { kind, M, r: rng.int(2, 6), v, axis: rng.chance(0.5) ? 'x' : 'y' };
  },
  render: (p): Slide => {
    const equations = locusEquations(p);
    const shapes = Object.values(SHAPES);
    return {
      kind: 'flow',
      prompt: [say(locusWords(p))],
      subject: '\\text{the locus of } P',
      steps: [
        { id: 'shape', ask: 'What shape is the locus of $P$?', branches: shapes.map((label) => ({ label, to: 'equation' })) },
        { id: 'equation', ask: 'Which is its equation?', branches: leaves(equations, (label) => `So $P$ moves on ${label}.`) },
      ],
      answer: [SHAPES[p.kind], equations[0]],
    };
  },
  solution: (p) => {
    if (p.kind === 'circle') {
      return [
        { text: `Every point $${p.r}$ from $C$ makes a circle with centre $C$ and radius $${p.r}$, so $r^2 = ${p.r * p.r}$:` },
        { tex: circleTex(p.M[0], p.M[1], p.r * p.r) },
      ];
    }
    if (p.kind === 'bisector') {
      const collected = equidistantLine({ A: minusPt(p.M, p.v), B: plusPt(p.M, p.v) }).collected;
      return [
        { text: `Every point as far from $A$ as from $B$ is on the perpendicular bisector of $AB$, a straight line through the midpoint $${pt(...p.M)}$.` },
        { text: 'Set $PA^2 = PB^2$ and multiply out; the $x^2$ and $y^2$ cancel, leaving' },
        { tex: lineTexOf(collected) },
        ...(lineTexOf(reducedLine(...collected)) === lineTexOf(collected) ? [] : [{ text: 'which divides down to' }, { tex: lineTexOf(reducedLine(...collected)) }]),
      ];
    }
    const c = p.axis === 'x' ? p.M[0] : p.M[1];
    return [
      {
        text: `The points $${p.r}$ from the line $${p.axis} = ${c}$ make two lines parallel to it, one on each side: $${p.axis} = ${c} - ${p.r} = ${c - p.r}$ and $${p.axis} = ${c} + ${p.r} = ${c + p.r}$.`,
      },
    ];
  },
};

interface EquidistantSliderParams {
  M: Pt;
  /** The step from M to B, so A = M - u. */
  u: Pt;
  /** How many steps along the bisector P is from M. */
  t: number;
  /** 'x' slides P across a level line; 'y' slides it up a line straight up. */
  axis: 'x' | 'y';
}

const sliderP = ({ M, u, t }: EquidistantSliderParams): Pt => plusPt(M, scalePt(t, primitive([-u[1], u[0]])));

/** P on a dashed line, dragged until it is as far from A as from B. */
const coordLocusEquidistantSlider: Generator<EquidistantSliderParams> = {
  id: 'coord-locus-equidistant-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const params: EquidistantSliderParams = {
        M: [rng.int(-4, 4), rng.int(-4, 4)],
        u: [nz(rng, 3), nz(rng, 3)],
        t: nz(rng, difficulty > 1 ? 2 : 1),
        axis: difficulty > 1 ? 'y' : 'x',
      };
      const { M, u } = params;
      if (inReach([minusPt(M, u), plusPt(M, u), sliderP(params)], 9)) return params;
    }
  },
  render: (p): Slide => {
    const [A, B, P] = [minusPt(p.M, p.u), plusPt(p.M, p.u), sliderP(p)];
    const across = p.axis === 'x';
    const guide: [Pt, Pt] = across ? [[-10, P[1]], [10, P[1]]] : [[P[0], -10], [P[0], 10]];
    return {
      kind: 'slider',
      prompt: [
        say(
          `$${namedAt('A', A)}$ and $${namedAt('B', B)}$ are drawn. $P$ is on the dashed line $${across ? `y = ${P[1]}` : `x = ${P[0]}`}$, and is as far from $A$ as from $B$. Slide to $P$'s ${across ? '$x$-coordinate' : 'height'}.`,
        ),
      ],
      min: -10,
      max: 10,
      step: 1,
      answer: across ? P[0] : P[1],
      readout: `${p.axis} = {v}`,
      figure: {
        svg: shapeFigure(WIDE, [[A, B]], 'The points A and B joined, and the dashed line P lies on', [guide]),
        axis: p.axis,
        ...markerWindow(-10, 10, p.axis, SQUARE),
      },
    };
  },
  solution: (p) => {
    const [A, B, P] = [minusPt(p.M, p.u), plusPt(p.M, p.u), sliderP(p)];
    const i = p.axis === 'x' ? 0 : 1;
    const j = 1 - i;
    const letter = 'k';
    const side = (X: Pt) => `(${lin(letter, X[i])})^2 + ${paren(P[j] - X[j])}^2`;
    const opened = (X: Pt) => sumTex([termOf(q(-2 * X[i]), letter), String(X[i] * X[i] + (P[j] - X[j]) ** 2)]) || '0';
    const rate = 2 * (B[i] - A[i]);
    const rest = B[i] * B[i] + (P[j] - B[j]) ** 2 - A[i] * A[i] - (P[j] - A[j]) ** 2;
    return [
      { text: `Call $P$'s unknown coordinate $k$, and set $PA^2 = PB^2$:` },
      { tex: chain(`&${side(A)}`, `=\\;&${side(B)}`) },
      { text: 'Multiply out; the $k^2$ on each side cancels:' },
      { tex: chain(`${opened(A)} &= ${opened(B)}`, `${termOf(q(rate), letter)} &= ${rest}`, `k &= ${P[i]}`) },
      { text: `So $P = ${pt(...P)}$, on the perpendicular bisector of $AB$ through its midpoint $${pt(...p.M)}$.` },
    ];
  },
};

interface LinesParams {
  /** The line is x = c (or y = c), written at difficulty 2 as m x + mc' = 0. */
  c: number;
  d: number;
  axis: 'x' | 'y';
  m: number;
}

/** A fixed distance from a line: two lines, one either side. */
const coordLocusLinesTiles: Generator<LinesParams> = {
  id: 'coord-locus-lines-tiles',
  sample: (rng, difficulty) => ({ c: nz(rng, 6), d: rng.int(1, 5), axis: rng.chance(0.5) ? 'x' : 'y', m: difficulty > 1 ? rng.pick([2, 3, 4]) : 1 }),
  render: ({ c, d, axis, m }): Slide => {
    const line = m === 1 ? `${axis} = ${c}` : `${m}${axis} ${signedN(-m * c)} = 0`;
    const answer = [c - d, c + d].map(String);
    return {
      kind: 'tiles',
      prompt: [say(`$P$ moves so that it is always $${d}$ from the line $${line}$. Its locus is two lines. Which?`)],
      template: `${axis} = {0} \\text{ and } ${axis} = {1}`,
      bank: bank(answer, [d, -d, -c - d, -c + d, c + 2 * d, c - 2 * d].map(String), [c], 2),
      answer,
      unordered: true,
    };
  },
  solution: ({ c, d, axis, m }) => [
    ...(m === 1 ? [] : [{ text: `First the line itself: $${m}${axis} ${signedN(-m * c)} = 0$ is $${axis} = ${c}$.` }]),
    {
      text: `A point $${d}$ from the line $${axis} = ${c}$ is $${d}$ to one side of it or the other, so the locus is two lines parallel to it: $${axis} = ${c} - ${d} = ${c - d}$ and $${axis} = ${c} + ${d} = ${c + d}$.`,
    },
  ],
};

/* ---------- lesson 5: loci from a condition ---------- */

interface RatioParams {
  /** The centre of the locus, and the step w: B = O - w and A = O - 4w, radius 2|w|. */
  O: Pt;
  w: Pt;
  /** |w|, whole, from the triples table or along an axis. */
  len: number;
}

const ratioA = ({ O, w }: RatioParams): Pt => minusPt(O, scalePt(4, w));
const ratioB = ({ O, w }: RatioParams): Pt => minusPt(O, w);
const ratioR2 = ({ len }: RatioParams): number => 4 * len * len;

/** Axis steps at difficulty 1; difficulty 2 adds the 3-4-5 steps. */
function sampleRatio(rng: Rng, difficulty: number): RatioParams {
  for (;;) {
    const axisStep = difficulty < 2 || rng.chance(0.4);
    let w: Pt;
    let len: number;
    if (axisStep) {
      len = rng.int(1, difficulty > 1 ? 3 : 2);
      w = rng.pick<Pt>([
        [len, 0],
        [-len, 0],
        [0, len],
        [0, -len],
      ]);
    } else {
      const [a, b, c] = rng.pick(TRIPLES.filter((row) => row[2] === 5));
      w = [a * rng.sign(), b * rng.sign()];
      len = c;
    }
    const O: Pt = [nz(rng, 6), nz(rng, 6)];
    const p = { O, w, len };
    if (!inReach([ratioA(p), ratioB(p)], 12)) continue;
    return p;
  }
}

const ratioPrompt = (p: RatioParams): string =>
  `$P(x, y)$ moves so that $PA = 2PB$, with $${namedAt('A', ratioA(p))}$ and $${namedAt('B', ratioB(p))}$.`;

/** 3x^2 + 3y^2 - 6ax - 6by + 3(a^2 + b^2 - r^2) = 0: four times PB^2 less PA^2. */
function collectedRatio(p: RatioParams, m = 3, flipConstant = false): string {
  const [a, b] = p.O;
  const k = m * (a * a + b * b - ratioR2(p)) * (flipConstant ? -1 : 1);
  return `${sumTex([`${m}x^2`, `${m}y^2`, termOf(q(-2 * m * a)), termOf(q(-2 * m * b), 'y'), String(k)])} = 0`;
}

/** The squaring-out and the collecting, then the centre and radius. */
function ratioSolution(p: RatioParams): SolutionStep[] {
  const [A, B] = [ratioA(p), ratioB(p)];
  const [a, b] = p.O;
  return [
    { text: 'Square both sides, so no root is needed: $PA^2 = 4PB^2$. With the distance formula, multiplied out:' },
    { tex: chain(`&${squaresTex(A)}`, `=\\;&${expandedSquares(A)}`) },
    { tex: `{\\small ${chain(`&4\\left[${squaresTex(B)}\\right]`, `=\\;&${expandedSquares(B, 4)}`)}}` },
    { text: `Take the left side from the right: $${collectedRatio(p)}$. Divide by $3$: $${expandedTex(a, b, ratioR2(p))}$.` },
    ...completeSquareSteps(a, b, ratioR2(p)),
    { text: `So the locus is a circle with centre $${pt(a, b)}$ and $r^2 = ${ratioR2(p)}$, radius $${2 * p.len}$.` },
  ];
}

/** PA = 2PB squared out, collected and divided, one tap at a time. */
const coordLocusRatioSteps: Generator<RatioParams> = {
  id: 'coord-locus-ratio-steps',
  sample: sampleRatio,
  render: (p): Slide => {
    const [A, B] = [ratioA(p), ratioB(p)];
    const [a, b] = p.O;
    return {
      kind: 'steps',
      prompt: [say(`${ratioPrompt(p)} Square both sides and simplify: tap the part you would work out **next**, then choose its value.`)],
      start: [squaresTex(A), '=', `4\\left[${squaresTex(B)}\\right]`],
      reductions: [
        {
          span: [0, 1],
          value: expandedSquares(A),
          bank: stepBank(expandedSquares(A), expandedSquares([-A[0], -A[1]]), expandedSquares(A, 1, 1, 0)),
        },
        {
          span: [2, 3],
          value: expandedSquares(B, 4),
          bank: stepBank(expandedSquares(B, 4), expandedSquares(B, 4, 1, 1), expandedSquares(B, 4, 4, 1), expandedSquares([-B[0], -B[1]], 4)),
        },
        {
          span: [0, 3],
          value: collectedRatio(p),
          bank: stepBank(collectedRatio(p), collectedRatio(p, 3, true), collectedRatio(p, 5), collectedRatio({ ...p, O: [-a, -b] })),
        },
        {
          span: [0, 1],
          value: expandedTex(a, b, ratioR2(p)),
          bank: stepBank(expandedTex(a, b, ratioR2(p)), expandedTex(-a, -b, ratioR2(p)), collectedRatio(p, 1, true), expandedTex(a, b, p.len * p.len)),
        },
      ],
    };
  },
  solution: ratioSolution,
};

/** The centre and radius of the PA = 2PB circle, read from its expanded equation. */
const coordLocusCentreTiles: Generator<RatioParams> = {
  id: 'coord-locus-centre-tiles',
  sample: sampleRatio,
  render: (p): Slide => {
    const [a, b] = p.O;
    const r = 2 * p.len;
    const answer = [a, b, r].map(String);
    return {
      kind: 'tiles',
      prompt: [say(`${ratioPrompt(p)} Squared out and simplified, its locus is`), show(expandedTex(a, b, ratioR2(p))), say('Find the centre and radius of this circle.')],
      template: '\\text{centre } ({0}, {1}), \\quad r = {2}',
      bank: bank(answer, [-a, -b, ratioR2(p), p.len, 2 * a, 2 * b].map(String), [r], 2),
      answer,
    };
  },
  solution: (p) => {
    const [a, b] = p.O;
    const B = ratioB(p);
    return [
      ...completeSquareSteps(a, b, ratioR2(p)),
      { text: `So the centre is $${pt(a, b)}$ and $r = ${2 * p.len}$.` },
      { text: `A check: the centre is on the line $AB$, beyond $B$, and the point $${pt(...plusPt(p.O, scalePt(2, p.w)))}$ on the circle is $${6 * p.len}$ from $A$ and $${3 * p.len}$ from $B$.` },
      { text: `Here $B$ is $${pt(...B)}$, one step $${pt(...p.w)}$ back from the centre.` },
    ];
  },
};

/** r^2 of the PA = 2PB circle, typed. */
const coordLocusRatioR2: Generator<RatioParams> = {
  id: 'coord-locus-ratio-r2',
  sample: sampleRatio,
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`${ratioPrompt(p)} Its locus is a circle. Find $r^2$.`)],
    lead: 'r^2 =',
    keypad: [],
    answer: String(ratioR2(p)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const L = p.len * p.len;
    const [a, b] = p.O;
    return intOptions(4 * L, [9 * L, L, 2 * p.len, 16 * L, Math.abs(a * a + b * b - 4 * L)], 1);
  },
  solution: ratioSolution,
};

/** A diameter AB = 2v about its midpoint M, which is a lattice point. */
interface DiameterLocusParams {
  M: Pt;
  v: Pt;
}

function sampleDiameterLocus(rng: Rng, difficulty: number): DiameterLocusParams {
  const top = difficulty > 1 ? 4 : 3;
  for (;;) {
    const v: Pt = [rng.int(-top, top), rng.int(-top, top)];
    if (v[0] === 0 && v[1] === 0) continue;
    const M: Pt = [rng.int(-4, 4), rng.int(-4, 4)];
    if (inReach([minusPt(M, v), plusPt(M, v)], 9)) return { M, v };
  }
}

const perpPrompt = ({ M, v }: DiameterLocusParams): string =>
  `$P$ moves so that $PA$ is perpendicular to $PB$, with $${namedAt('A', minusPt(M, v))}$ and $${namedAt('B', plusPt(M, v))}$.`;

/** What the locus is, where its centre is, and r^2. */
const coordLocusDiameterFlow: Generator<DiameterLocusParams> = {
  id: 'coord-locus-diameter-flow',
  sample: sampleDiameterLocus,
  render: (p): Slide => {
    const { M, v } = p;
    const [A, B] = [minusPt(M, v), plusPt(M, v)];
    const r2 = dotPt(v, v);
    const centres: string[] = [];
    for (const X of [M, plusPt(A, B), v, [M[1], M[0]] as Pt, [M[0], -M[1]] as Pt, plusPt(M, [1, 0])]) {
      const label = `$${pt(...X)}$`;
      if (!centres.includes(label)) centres.push(label);
    }
    const radii = [...new Set([r2, 4 * r2, 2 * r2, r2 + 1])].map((n) => `$r^2 = ${n}$`);
    return {
      kind: 'flow',
      prompt: [say(perpPrompt(p))],
      subject: 'PA \\perp PB',
      steps: [
        {
          id: 'shape',
          ask: 'What is the locus of $P$?',
          branches: ['The circle with diameter $AB$', 'The perpendicular bisector of $AB$', 'The line through $A$ and $B$'].map((label) => ({ label, to: 'centre' })),
        },
        { id: 'centre', ask: 'Where is its centre?', branches: onward(centres.slice(0, 4), 'radius') },
        { id: 'radius', ask: 'And its radius squared?', branches: leaves(radii, (label) => `So ${label}.`) },
      ],
      answer: ['The circle with diameter $AB$', centres[0], radii[0]],
    };
  },
  solution: ({ M, v }) => {
    const [A, B] = [minusPt(M, v), plusPt(M, v)];
    return [
      { text: 'The angle $APB$ is a right angle, so by the angle in a semicircle $P$ is on the circle with diameter $AB$ (every point of it but $A$ and $B$ themselves).' },
      { tex: chain(`x &= \\frac{${A[0]} + ${paren(B[0])}}{2} = ${M[0]}`, `y &= \\frac{${A[1]} + ${paren(B[1])}}{2} = ${M[1]}`) },
      { text: 'The centre is the midpoint of $AB$, and the radius half of $AB$, so $r^2$ is a quarter of $AB^2$:' },
      { tex: `r^2 = \\tfrac{1}{4} \\times ${dist2(A, B)} = ${dotPt(v, v)}` },
    ];
  },
};

/** Any two lattice points; the circle on them needs no lattice midpoint for this form. */
function samplePerpPair(rng: Rng, difficulty: number): TwoPointParams {
  const reach = difficulty > 1 ? 6 : 4;
  for (;;) {
    const A: Pt = [rng.int(-reach, reach), rng.int(-reach, reach)];
    const B: Pt = [rng.int(-reach, reach), rng.int(-reach, reach)];
    // Both sums and the constant non-zero, so every slip below differs from the answer.
    if (A[0] + B[0] === 0 || A[1] + B[1] === 0 || dotPt(A, B) === 0) continue;
    if (!samePt(A, B) && (difficulty < 2 || slanted(A, B))) return { A, B };
  }
}

/** (x - a)(x - c) + (y - b)(y - d) multiplied out, with the slips a sign or a pairing makes. */
function perpEquation(A: Pt, B: Pt, sx = 1, sk = 1, pairing = false): string {
  const k = pairing ? A[0] * A[1] + B[0] * B[1] : dotPt(A, B);
  return `${sumTex(['x^2', 'y^2', termOf(q(-sx * (A[0] + B[0]))), termOf(q(-sx * (A[1] + B[1])), 'y'), String(sk * k)])} = 0`;
}

/** Which equation is the locus PA perpendicular to PB. */
const coordLocusPerpChoice: Generator<TwoPointParams> = {
  id: 'coord-locus-perp-choice',
  sample: samplePerpPair,
  render: ({ A, B }): Slide => {
    const correct = perpEquation(A, B);
    const opts: ChoiceOption[] = [{ tex: correct, correct: true }];
    for (const tex of [perpEquation(A, B, -1), perpEquation(A, B, 1, -1), perpEquation(A, B, 1, 1, true), perpEquation(A, B, -1, -1)]) {
      if (opts.length < 4 && !opts.some((o) => o.tex === tex)) opts.push({ tex });
    }
    return choiceSlide(
      [say(`$P(x, y)$ moves so that $PA$ is perpendicular to $PB$, with $${namedAt('A', A)}$ and $${namedAt('B', B)}$. Which is the equation of its locus?`)],
      opts,
    );
  },
  solution: ({ A, B }) => [
    { text: 'The steps from $P$ to $A$ and from $P$ to $B$ are perpendicular when their gradients multiply to $-1$, which cleared of fractions is' },
    { tex: chain('&(x - x_A)(x - x_B)', '+\\;&(y - y_A)(y - y_B) = 0') },
    { text: 'With the numbers in:' },
    { tex: chain(`&(${lin('x', A[0])})(${lin('x', B[0])})`, `+\\;&(${lin('y', A[1])})(${lin('y', B[1])}) = 0`) },
    { text: 'Multiplied out:' },
    { tex: perpEquation(A, B) },
    { text: 'A circle: the one with diameter $AB$, by the angle in a semicircle.' },
  ],
};

/** The level 5 order generators, for the proof-ordering tests. */
export const coordinateGeometryOrders = [coordProofOrder];

export const coordinateGeometryGenerators = [
  coordGradient,
  coordRiseRunTree,
  coordGradientSlider,
  coordMissingCoordinate,
  coordIntercept,
  coordLineTiles,
  coordFormFlow,
  coordPointGradientSteps,
  coordGeneralTiles,
  coordMakeYSteps,
  coordGeneralGradient,
  coordOnLine,
  coordPerpGradient,
  coordPerpLineTiles,
  coordRelationFlow,
  coordPerpThroughTree,
  coordMeetTree,
  coordMeetSlider,
  coordMeetPoint,
  coordMeetY,
  coordMidpointTiles,
  coordDistanceTree,
  coordDistance,
  coordMidpointSlider,
  coordEndpoint,
  coordBisectorGradientSteps,
  coordBisectorTiles,
  coordBisectorFlow,
  coordEquidistant,
  coordCircleTiles,
  coordCentre,
  coordRadiusSquared,
  coordOnCircleTree,
  coordCompleteSteps,
  coordExpandedTiles,
  coordExpandedRadius,
  coordInsideFlow,
  coordTangentGradient,
  coordTangentTiles,
  coordChord,
  coordTangentSlider,
  coordSubstituteSteps,
  coordMeetQuadraticTiles,
  coordRootPointTree,
  coordMeetCircleX,
  coordMeetCountFlow,
  coordMeetDiscriminant,
  coordWhichLine,
  coordTouchPointSlider,
  coordTouchC,
  coordTouchLinesTiles,
  coordTouchConditionSteps,
  coordTouchRadiusTree,
  coordTangentLength,
  coordTangentLengthTree,
  coordOutsideCount,
  coordOutsideGradientSteps,
  coordOutsideTangentTiles,
  coordChordHalfTree,
  coordChordRadius,
  coordChordMidpointSteps,
  coordChordSlider,
  coordSemicircleTree,
  coordRightAngleFlow,
  coordSemicircleMissing,
  coordRightAnglePoint,
  coordDiameterTiles,
  coordDiameterR2,
  coordDiameterSteps,
  coordDiameterSlider,
  coordThreeBisectorSteps,
  coordCircumcentreTree,
  coordThreePointsTiles,
  coordThreePointsR2,
  coordChordFactFlow,
  coordChordDistance,
  coordChordTangentTiles,
  coordChordFromMidpointTree,
  coordWhichTheorem,
  coordOtherEndSteps,
  coordParallelTangent,
  coordOtherEndSlider,
  coordParaFlow,
  coordParaDiagonalSteps,
  coordParaFourthTiles,
  coordParallelK,
  coordParaSlider,
  coordRectFlow,
  coordDiagonalsTree,
  coordRectK,
  coordSideLengthsTiles,
  coordRhombusFlow,
  coordNameQuad,
  coordSquareSteps,
  coordTriRightTree,
  coordTriVertexChoice,
  coordIsoscelesFlow,
  coordTriRightK,
  coordProofOrder,
  coordCompleteChoice,
  coordFailsOneChoice,
  coordTriArea,
  coordBaseHeightTree,
  coordHalfBaseChoice,
  coordApexK,
  coordApexSlider,
  coordBoxSteps,
  coordBoxFlow,
  coordShoelaceTree,
  coordBoxArea,
  coordQuadSplitTree,
  coordParaArea,
  coordPolyShoelaceSteps,
  coordAreaKTiles,
  coordLocusOnChoice,
  coordLocusCircleTiles,
  coordLocusBisectorSteps,
  coordLocusNameFlow,
  coordLocusEquidistantSlider,
  coordLocusLinesTiles,
  coordLocusRatioSteps,
  coordLocusCentreTiles,
  coordLocusRatioR2,
  coordLocusDiameterFlow,
  coordLocusPerpChoice,
];
