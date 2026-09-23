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
 * chords cut off by a line.
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
        [qTex(neg(m1)), qTex(inv(m1)), String(p.cy + value(mul(m2, q(p.cx)))), String(-c), String(p.cy - value(mul(m1, q(p.cx))))],
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
];
