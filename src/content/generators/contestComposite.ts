/**
 * Contest Math, level 6: Composite Figures.
 *
 * Five lessons: areas built from simpler shapes or cut out of them, the
 * lunes and leaves that curved pieces make, circles and squares inscribed in
 * one another, area ratios found by cutting a figure into equal pieces, and
 * solids built from cubes. The idea in each is to see the awkward region as
 * a sum or difference of pieces whose areas are known: a leaf is two quarter
 * circles minus a square, a lune is two semicircles and a triangle minus a
 * semicircle, and a painted cube is corners, edges, faces and a core.
 *
 * Level 2 already asks the square in a circle in a square, a triangle on a
 * rectangle's base and the midpoint triangle; level 5 the shared height and
 * the trapezium's diagonals. These go further.
 *
 * Areas with curves are exact multiples of pi, typed with the `π` key, and
 * graded by value like any typed answer. Shared helpers are in
 * `contestMath.ts`.
 */
import type { ChoiceOption, Generator, KeypadKey, SolutionStep } from '../types';
import { gcd, num, numberBank, numberOptions, say, typed } from './contestMath';
import { options } from '../choiceVariant';

/** Number entry with a pi key. */
const PI_KEYS: KeypadKey[] = [{ insert: 'pi', label: 'π' }];

/** Pi and the fraction key, for an area whose multiple of pi may be a fraction. */
const PI_FRACTION_KEYS: KeypadKey[] = [{ insert: 'pi', label: 'π' }, { insert: '/' }];

/* ================================================================
 * Exact areas with pi: c + (pn / pd)π
 * ================================================================ */

interface PiVal {
  c: number;
  pn: number;
  pd: number;
}

function pv(c: number, pn: number, pd = 1): PiVal {
  const g = gcd(pn, pd) || 1;
  return { c, pn: pn / g, pd: pd / g };
}

/** The pi part's size as a textbook writes it: `\\pi`, `8\\pi`, `\\frac{9\\pi}{2}`. */
function piTerm(pn: number, pd: number): string {
  const size = Math.abs(pn);
  const core = size === 1 ? '\\pi' : `${size}\\pi`;
  return pd === 1 ? core : `\\frac{${core}}{${pd}}`;
}

/** `8\\pi - 16`, `24 + 8\\pi`, `32 - 4\\pi`, `\\frac{9\\pi}{2}`. */
function piTex({ c, pn, pd }: PiVal): string {
  if (pn === 0) return num(c);
  const term = piTerm(pn, pd);
  if (c === 0) return pn > 0 ? term : `-${term}`;
  if (pn > 0) return c > 0 ? `${num(c)} + ${term}` : `${term} - ${num(-c)}`;
  return c > 0 ? `${num(c)} - ${term}` : `-${num(-c)} - ${term}`;
}

/** The grader's copy, in mathjs syntax. Never displayed. */
const piAnswer = ({ c, pn, pd }: PiVal): string => (pn === 0 ? num(c) : `${num(c)} + (${pn}/${pd})*pi`);

const piValue = ({ c, pn, pd }: PiVal): number => c + (pn / pd) * Math.PI;

/**
 * Four options: the answer and the first three slips that are positive and
 * differ in value from everything already offered, topped up with the answer
 * moved by one pi.
 */
function piOptions(correct: PiVal, slips: PiVal[]): ChoiceOption[] {
  const seen = [piValue(correct)];
  const picked: PiVal[] = [];
  const fallback = [pv(correct.c, correct.pn + correct.pd, correct.pd), pv(correct.c, 2 * correct.pn, correct.pd), pv(2 * correct.c, correct.pn, correct.pd), pv(correct.c + 1, correct.pn, correct.pd)];
  for (const slip of [...slips, ...fallback]) {
    if (picked.length === 3) break;
    const value = piValue(slip);
    if (!(value > 0) || seen.some((v) => Math.abs(v - value) < 1e-9)) continue;
    seen.push(value);
    picked.push(slip);
  }
  return options({ tex: piTex(correct), answer: piAnswer(correct) }, ...picked.map((s) => ({ tex: piTex(s), answer: piAnswer(s) })));
}

/** A multiple of pi on its own, for a solution line: `\\tfrac{9}{2}\\pi` reads badly, so `\\frac{9\\pi}{2}`. */
const piOnly = (pn: number, pd = 1): string => piTex(pv(0, pn, pd));


/* ================================================================
 * Figures. Plain SVG text only (KaTeX cannot render inside SVG), and
 * `currentColor` throughout so a figure reads in either theme. Shapes are
 * laid out in model coordinates, y up, and fitted to the 300-wide frame.
 * ================================================================ */

type P2 = [number, number];

const f1 = (v: number) => v.toFixed(1);

function svg(height: number, label: string, body: string[]): string {
  return [`<svg viewBox="0 0 300 ${Math.round(height)}" width="100%" role="img" aria-label="${label}">`, ...body, '</svg>'].join('');
}

interface Frame {
  at: (p: P2) => P2;
  k: number;
  height: number;
}

/** Fit model points (y up) into the frame, `pad` pixels clear on every side. */
function frame(pts: P2[], maxH = 200, pad = 26): Frame {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const k = Math.min((300 - 2 * pad) / w, (maxH - 2 * pad) / h);
  const x0 = (300 - w * k) / 2;
  return { at: ([x, y]) => [x0 + (x - minX) * k, pad + (maxY - y) * k], k, height: h * k + 2 * pad };
}

const seg = (a: P2, b: P2, dashed = false) =>
  `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="currentColor" stroke-width="2"${dashed ? ' stroke-dasharray="5 4"' : ''} />`;

const thin = (a: P2, b: P2) =>
  `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="currentColor" stroke-width="1" stroke-opacity="0.35" />`;

const txt = (p: P2, text: string, dx = 0, dy = 0, anchor: 'start' | 'middle' | 'end' = 'middle', size = 13) =>
  `<text x="${f1(p[0] + dx)}" y="${f1(p[1] + dy)}" font-size="${size}" fill="currentColor" text-anchor="${anchor}" dominant-baseline="middle">${text}</text>`;

const dot = (p: P2) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="3" fill="currentColor" />`;

const ring = (c: P2, r: number, dashed = false) =>
  `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="none" stroke="currentColor" stroke-width="2"${dashed ? ' stroke-dasharray="5 4"' : ''} />`;

const poly = (pts: P2[]) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${f1(x)} ${f1(y)}`).join(' ') + ' Z';

/** A closed path through screen points. */
const outline = (pts: P2[]) => `<path d="${poly(pts)}" fill="none" stroke="currentColor" stroke-width="2" />`;

const shadeD = (d: string) => `<path class="plot-shade" fill-rule="evenodd" d="${d}" />`;

const strokeD = (d: string) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" />`;

/**
 * An SVG arc command (screen coordinates) from the pen's position `from` to
 * `to`, round `centre`, passing through `via`. The flags are worked out from
 * the three points, so no figure sets them by hand.
 */
function arcTo(from: P2, to: P2, centre: P2, r: number, via: P2): string {
  const ang = (p: P2) => Math.atan2(p[1] - centre[1], p[0] - centre[0]);
  const cross = (from[0] - centre[0]) * (via[1] - centre[1]) - (from[1] - centre[1]) * (via[0] - centre[0]);
  const sweep = cross > 0 ? 1 : 0;
  const turn = 2 * Math.PI;
  const raw = sweep ? ang(to) - ang(from) : ang(from) - ang(to);
  const delta = ((raw % turn) + turn) % turn;
  const large = delta > Math.PI + 1e-6 ? 1 : 0;
  return `A ${f1(r)} ${f1(r)} 0 ${large} ${sweep} ${f1(to[0])} ${f1(to[1])}`;
}

const M = (p: P2) => `M ${f1(p[0])} ${f1(p[1])}`;
const L = (p: P2) => `L ${f1(p[0])} ${f1(p[1])}`;

const mid = (a: P2, b: P2): P2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** The point on a circle round `c` of radius `r` at angle `t` (radians, model coordinates). */
const onCircle = (c: P2, r: number, t: number): P2 => [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)];

/** Points round a circle, for fitting a frame round it. */
const circlePts = (c: P2, r: number): P2[] => Array.from({ length: 24 }, (_, i) => onCircle(c, r, (i * Math.PI) / 12));

/* ================================================================
 * Lesson 1: Composites
 * ================================================================ */

/* ---------- a path round a lawn, or two paths across it ---------- */

interface PathParams {
  a: number;
  b: number;
  w: number;
  /** Difficulty 2: two paths crossing the lawn rather than one round it. */
  cross: boolean;
}

const pathArea = ({ a, b, w, cross }: PathParams) => (cross ? w * a + w * b - w * w : (a + 2 * w) * (b + 2 * w) - a * b);

function pathSvg(p: PathParams): string {
  const { a, b, w } = p;
  if (!p.cross) {
    const F = frame([[0, 0], [a + 2 * w, b + 2 * w]], 190);
    const outer = [F.at([0, 0]), F.at([a + 2 * w, 0]), F.at([a + 2 * w, b + 2 * w]), F.at([0, b + 2 * w])];
    const inner = [F.at([w, w]), F.at([w + a, w]), F.at([w + a, w + b]), F.at([w, w + b])];
    return svg(F.height, 'A rectangular lawn with a path of even width all the way round it', [
      shadeD(`${poly(outer)} ${poly(inner)}`),
      outline(outer),
      outline(inner),
      txt(mid(inner[0], inner[1]), `${a} m`, 0, -12),
      txt(mid(inner[1], inner[2]), `${b} m`, -8, 0, 'end'),
      txt(mid(outer[3], outer[2]), `${w} m wide`, 0, -14),
    ]);
  }
  const F = frame([[0, 0], [a, b]], 190, 44);
  const x = a * 0.4;
  const y = b * 0.55;
  const lawn = [F.at([0, 0]), F.at([a, 0]), F.at([a, b]), F.at([0, b])];
  const vert = [F.at([x, 0]), F.at([x + w, 0]), F.at([x + w, b]), F.at([x, b])];
  const horiz = [F.at([0, y]), F.at([a, y]), F.at([a, y + w]), F.at([0, y + w])];
  return svg(F.height, 'A rectangular lawn crossed by two straight paths at right angles', [
    `<path class="plot-shade" d="${poly(vert)}" />`,
    `<path class="plot-shade" d="${poly(horiz)}" />`,
    outline(lawn),
    outline(vert),
    outline(horiz),
    txt(mid(lawn[0], lawn[1]), `${a} m`, 0, 14),
    txt(mid(lawn[0], lawn[3]), `${b} m`, -8, 0, 'end'),
    txt(F.at([x + w, b]), `${w} m`, 6, -12, 'start'),
  ]);
}

const cmGardenPath: Generator<PathParams> = {
  id: 'cm-garden-path',
  sample(rng, difficulty) {
    for (;;) {
      const cross = difficulty >= 2;
      const a = rng.int(cross ? 10 : 5, cross ? 30 : 20);
      const b = rng.int(cross ? 8 : 4, cross ? 24 : 15);
      const w = rng.int(1, 3);
      if (a <= b || (cross && b < 4 * w)) continue;
      return { a, b, w, cross };
    }
  },
  render(p) {
    const setup = p.cross
      ? `A lawn is $${p.a}$ m by $${p.b}$ m. Two straight paths, each $${p.w}$ m wide, cross it at right angles, one along its length and one across it.`
      : `A lawn is $${p.a}$ m by $${p.b}$ m. A path $${p.w}$ m wide runs all the way round the outside of it.`;
    return typed([say(setup), { kind: 'diagram', svg: pathSvg(p) }, say(p.cross ? 'What area do the paths cover, in square metres?' : 'What area does the path cover, in square metres?')], pathArea(p), '\\text{area} =');
  },
  choices(p) {
    const { a, b, w } = p;
    if (p.cross) return numberOptions(pathArea(p), [w * (a + b), w * (a + b) - 2 * w * w, a * b - w * (a + b)], 1, 1);
    return numberOptions(pathArea(p), [2 * w * (a + b), (a + w) * (b + w) - a * b, 2 * w * (a + b) + 2 * w * w], 1, 1);
  },
  solution(p) {
    const { a, b, w } = p;
    if (p.cross) {
      return [
        { text: 'Add the two paths, then take off the square where they cross, which was counted twice:' },
        { tex: `${w} \\times ${a} + ${w} \\times ${b} = ${w * (a + b)}` },
        { tex: `${w * (a + b)} - ${w} \\times ${w} = ${pathArea(p)}` },
        { text: `Answering ${w * (a + b)} counts the crossing twice.` },
      ];
    }
    return [
      { text: `The lawn and path together make a rectangle $${w}$ m bigger on every side, so $${2 * w}$ m longer each way:` },
      { tex: `${a + 2 * w} \\times ${b + 2 * w} = ${(a + 2 * w) * (b + 2 * w)}` },
      { text: 'Take the lawn away and the path is left:' },
      { tex: `${(a + 2 * w) * (b + 2 * w)} - ${a * b} = ${pathArea(p)}` },
      { text: `Four strips along the sides, ${2 * w * (a + b)}, would miss the four corner squares.` },
    ];
  },
};

/* ---------- a square with a corner at the centre of another ---------- */

interface OverlapParams {
  a: number;
  b: number;
  /** The turn of the second square, in degrees; drawing only. */
  turn: number;
  /** Difficulty 2 asks the area the two squares cover together. */
  union: boolean;
}

function overlapSvg(p: OverlapParams): string {
  const h = p.a / 2;
  const t = (p.turn * Math.PI) / 180;
  const u: P2 = [Math.cos(t), Math.sin(t)];
  const v: P2 = [-Math.sin(t), Math.cos(t)];
  const O: P2 = [0, 0];
  const sq = [[-h, -h], [h, -h], [h, h], [-h, h]] as P2[];
  const second: P2[] = [O, [p.b * u[0], p.b * u[1]], [p.b * (u[0] + v[0]), p.b * (u[1] + v[1])], [p.b * v[0], p.b * v[1]]];
  const F = frame([...sq, ...second], 220);
  const tan = Math.tan(t);
  const lap: P2[] = [O, [h, h * tan], [h, h], [-h * tan, h]];
  const farMid = mid(second[1], second[2]);
  return svg(F.height, 'A square with a corner of a second square at its centre', [
    `<path class="plot-shade" d="${poly(lap.map(F.at))}" />`,
    outline(sq.map(F.at)),
    outline(second.map(F.at)),
    dot(F.at(O)),
    txt(F.at([0, -h]), `${p.a}`, 0, 14),
    txt(F.at(farMid), `${p.b}`, 10, 0, 'start'),
  ]);
}

const cmOverlapSquares: Generator<OverlapParams> = {
  id: 'cm-overlap-squares',
  sample(rng, difficulty) {
    const a = 2 * rng.int(2, 12);
    const b = rng.int(a, Math.min(a + 8, Math.floor(1.5 * a)));
    return { a, b, turn: rng.pick([15, 20, 25, 30, 35]), union: difficulty >= 2 };
  },
  render(p) {
    return typed(
      [
        say(`A square has side $${p.a}$. A second square, of side $${p.b}$, has one corner at the centre of the first and is turned at an angle.`),
        { kind: 'diagram', svg: overlapSvg(p) },
        say(p.union ? 'What area do the two squares cover altogether?' : 'What is the area of the overlap?'),
      ],
      p.union ? p.a * p.a + p.b * p.b - (p.a * p.a) / 4 : (p.a * p.a) / 4,
      '\\text{area} =',
    );
  },
  choices(p) {
    const q = (p.a * p.a) / 4;
    if (p.union) return numberOptions(p.a * p.a + p.b * p.b - q, [p.a * p.a + p.b * p.b, p.a * p.a + p.b * p.b - 2 * q, p.a * p.a + p.b * p.b - (p.b * p.b) / 4], p.a / 2, 1);
    return numberOptions(q, [2 * q, q / 2, (p.a * p.b) / 4, (p.b * p.b) / 4], p.a / 2, 1);
  },
  solution(p) {
    const q = (p.a * p.a) / 4;
    const steps: SolutionStep[] = [
      { text: 'Draw the two lines from the centre to the middle of two sides of the first square, one side apart. Turning them together sweeps out the same quarter whatever the angle: the triangle the overlap gains on one side it loses on the other. So the overlap is a quarter of the first square:' },
      { tex: `${p.a}^2 \\div 4 = ${q}` },
    ];
    if (p.union) {
      steps.push(
        { text: 'Add the two squares and take off the overlap, which was counted twice:' },
        { tex: `${p.a * p.a} + ${p.b * p.b} - ${q} = ${p.a * p.a + p.b * p.b - q}` },
      );
    }
    return steps;
  },
};

/* ---------- a window with a round top, or a plate with round ends cut out ---------- */

interface ArchParams {
  /** Difficulty 1: the window's width; difficulty 2: the plate's length. */
  w: number;
  /** Difficulty 1: the rectangle's height; difficulty 2: the plate's width, the cut-outs' diameter. */
  h: number;
  cut: boolean;
}

function archArea(p: ArchParams): PiVal {
  if (p.cut) return pv(p.w * p.h, -(p.h * p.h) / 4);
  return pv(p.w * p.h, (p.w * p.w) / 8);
}

function archSvg(p: ArchParams): string {
  if (!p.cut) {
    const r = p.w / 2;
    const F = frame([[0, 0], [p.w, 0], [p.w, p.h + r], [0, p.h + r]], 210);
    const A = F.at([0, 0]);
    const B = F.at([p.w, 0]);
    const C = F.at([p.w, p.h]);
    const D = F.at([0, p.h]);
    const d = `${M(A)} ${L(B)} ${L(C)} ${arcTo(C, D, F.at([r, p.h]), r * F.k, F.at([r, p.h + r]))} Z`;
    return svg(F.height, 'A window: a rectangle with a semicircle on top', [
      shadeD(d),
      strokeD(d),
      seg(C, D, true),
      txt(mid(A, B), `${p.w}`, 0, 14),
      txt(mid(B, C), `${p.h}`, 8, 0, 'start'),
    ]);
  }
  const r = p.h / 2;
  const F = frame([[0, 0], [p.w, p.h]], 170);
  const A = F.at([0, 0]);
  const B = F.at([p.w, 0]);
  const C = F.at([p.w, p.h]);
  const D = F.at([0, p.h]);
  const d = `${M(A)} ${L(B)} ${arcTo(B, C, F.at([p.w, r]), r * F.k, F.at([p.w - r, r]))} ${L(D)} ${arcTo(D, A, F.at([0, r]), r * F.k, F.at([r, r]))} Z`;
  return svg(F.height, 'A rectangular plate with a semicircle cut from each end', [
    shadeD(d),
    strokeD(d),
    seg(A, D, true),
    seg(B, C, true),
    txt(mid(A, B), `${p.w}`, 0, 14),
    txt(mid(B, C), `${p.h}`, 8, 0, 'start'),
  ]);
}

function archSetup(p: ArchParams): string {
  if (p.cut) return `A plate is a $${p.w}$ by $${p.h}$ rectangle with a semicircle cut from each short end. Each semicircle has the whole short side as its diameter.`;
  return `A window is a rectangle $${p.w}$ wide and $${p.h}$ tall, with a semicircle on top whose diameter is the top side.`;
}

const archSample = (rng: Parameters<Generator<ArchParams>['sample']>[0], difficulty: number): ArchParams => {
  for (;;) {
    if (difficulty >= 2) {
      const h = 2 * rng.int(2, 7);
      const w = rng.int(h + 3, 30);
      return { w, h, cut: true };
    }
    const w = 4 * rng.int(1, 5);
    const h = rng.int(3, 15);
    if (w * h === (w * w) / 8) continue;
    return { w, h, cut: false };
  }
};

function archSolution(p: ArchParams): SolutionStep[] {
  const v = archArea(p);
  if (p.cut) {
    const r = p.h / 2;
    return [
      { text: `The two semicircles cut out make one whole circle, of radius $${r}$:` },
      { tex: `\\pi \\times ${r}^2 = ${piOnly(r * r)}` },
      { tex: `${p.w} \\times ${p.h} = ${p.w * p.h}` },
      { tex: `\\text{area} = ${piTex(v)}` },
    ];
  }
  const r = p.w / 2;
  return [
    { text: `The semicircle has radius $${r}$, half the width, and is half a circle:` },
    { tex: `\\tfrac{1}{2} \\times \\pi \\times ${r}^2 = ${piOnly(r * r, 2)}` },
    { tex: `${p.w} \\times ${p.h} = ${p.w * p.h}` },
    { tex: `\\text{area} = ${piTex(v)}` },
  ];
}

const cmArchArea: Generator<ArchParams> = {
  id: 'cm-arch-area',
  sample: archSample,
  render(p) {
    return typed([say(archSetup(p)), { kind: 'diagram', svg: archSvg(p) }, say('What is its area? Leave $\\pi$ in the answer.')], piAnswer(archArea(p)), '\\text{area} =', PI_KEYS);
  },
  choices(p) {
    const v = archArea(p);
    if (p.cut) {
      const q = (p.h * p.h) / 4;
      return piOptions(v, [pv(v.c, -q / 2), pv(v.c, -2 * q), pv(v.c, -p.h)]);
    }
    const r = p.w / 2;
    return piOptions(v, [pv(v.c, r * r), pv(v.c, (p.w * p.w) / 2), pv(v.c, r)]);
  },
  solution: archSolution,
};

const cmArchTiles: Generator<ArchParams> = {
  id: 'cm-arch-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const p = archSample(rng, difficulty);
      const v = archArea(p);
      if (v.pd === 1 && v.c !== Math.abs(v.pn)) return p;
    }
  },
  render(p) {
    const v = archArea(p);
    const size = Math.abs(v.pn);
    const slips = p.cut ? [size / 2, 2 * size, p.h * p.h, p.w * p.h / 2] : [2 * size, (p.w * p.w) / 2, p.w / 2, p.w * p.h / 2];
    return {
      kind: 'tiles',
      prompt: [say(archSetup(p)), { kind: 'diagram', svg: archSvg(p) }, say('Fill in its area.')],
      template: `\\text{area} = {0} ${p.cut ? '-' : '+'} {1}\\pi`,
      bank: numberBank([v.c, size], slips.filter((s) => Number.isInteger(s)), 3, 1, 1),
      answer: [num(v.c), num(size)],
    };
  },
  solution: archSolution,
};

/* ================================================================
 * Lesson 2: Lunes and Leaves
 * ================================================================ */

/* ---------- the leaf where two quarter circles overlap ---------- */

interface LeafParams {
  s: number;
  /** Difficulty 2 asks the part of the square outside the leaf. */
  outside: boolean;
}

const leafArea = (s: number) => pv(-s * s, s * s, 2);

function leafSvg(p: LeafParams): string {
  const s = p.s;
  const F = frame([[0, 0], [s, s]], 210, 30);
  const A = F.at([0, 0]);
  const B = F.at([s, 0]);
  const C = F.at([s, s]);
  const D = F.at([0, s]);
  const r = s * F.k;
  const nearC = F.at([s / Math.SQRT2, s / Math.SQRT2]);
  const nearA = F.at([s - s / Math.SQRT2, s - s / Math.SQRT2]);
  const leaf = `${M(B)} ${arcTo(B, D, A, r, nearC)} ${arcTo(D, B, C, r, nearA)} Z`;
  const corners = `${M(B)} ${L(C)} ${L(D)} ${arcTo(D, B, A, r, nearC)} Z ${M(D)} ${L(A)} ${L(B)} ${arcTo(B, D, C, r, nearA)} Z`;
  return svg(F.height, 'A square with a quarter circle drawn from each of two opposite corners, overlapping in a leaf', [
    shadeD(p.outside ? corners : leaf),
    outline([A, B, C, D]),
    strokeD(`${M(B)} ${arcTo(B, D, A, r, nearC)}`),
    strokeD(`${M(D)} ${arcTo(D, B, C, r, nearA)}`),
    dot(A),
    dot(C),
    txt(mid(A, B), `${s}`, 0, 14),
  ]);
}

const cmLeaf: Generator<LeafParams> = {
  id: 'cm-leaf',
  sample(rng, difficulty) {
    return { s: rng.int(2, 30), outside: difficulty >= 2 };
  },
  render(p) {
    const v = p.outside ? pv(2 * p.s * p.s, -p.s * p.s, 2) : leafArea(p.s);
    return typed(
      [
        say(`In a square of side $${p.s}$, a quarter circle of radius $${p.s}$ is drawn from each of two opposite corners.`),
        { kind: 'diagram', svg: leafSvg(p) },
        say(p.outside ? 'What is the area of the shaded part, the square outside the leaf? Leave $\\pi$ in the answer.' : 'What is the area of the leaf where they overlap? Leave $\\pi$ in the answer.'),
      ],
      piAnswer(v),
      '\\text{area} =',
      PI_FRACTION_KEYS,
    );
  },
  choices(p) {
    const q = p.s * p.s;
    if (p.outside) return piOptions(pv(2 * q, -q, 2), [pv(q, -q, 4), pv(4 * q, -q), leafArea(p.s)]);
    return piOptions(leafArea(p.s), [pv(0, q, 2), pv(-q / 2, q, 4), pv(-q, q)]);
  },
  solution(p) {
    const q = p.s * p.s;
    const steps: SolutionStep[] = [
      { text: 'Each quarter circle covers the leaf and one of the two corner pieces. Add the two quarter circles and the leaf is counted twice, the rest of the square once, so take the square off:' },
      { tex: `2 \\times \\tfrac{1}{4} \\times \\pi \\times ${p.s}^2 = ${piOnly(q, 2)}` },
      { tex: `\\text{leaf} = ${piTex(leafArea(p.s))}` },
    ];
    if (p.outside) {
      steps.push({ text: 'The shaded part is the square without the leaf:' }, { tex: `${q} - (${piTex(leafArea(p.s))}) = ${piTex(pv(2 * q, -q, 2))}` });
    }
    return steps;
  },
};

/* ---------- the arbelos: a big semicircle less two small ones ---------- */

interface ArbelosParams {
  x: number;
  y: number;
  /** Difficulty 2 gives only the height CD, and the split is for the drawing. */
  h: number;
  fromHeight: boolean;
}

function arbelosArea(p: ArbelosParams): PiVal {
  return p.fromHeight ? pv(0, p.h * p.h, 4) : pv(0, p.x * p.y, 4);
}

function arbelosSvg(p: ArbelosParams): string {
  const n = p.x + p.y;
  const R = n / 2;
  const F = frame([[0, 0], [n, 0], [n, R], [0, R]], 180, 24);
  const A = F.at([0, 0]);
  const B = F.at([n, 0]);
  const C = F.at([p.x, 0]);
  const top = F.at([R, R]);
  const d = `${M(A)} ${arcTo(A, B, F.at([R, 0]), R * F.k, top)} ${arcTo(B, C, F.at([p.x + p.y / 2, 0]), (p.y / 2) * F.k, F.at([p.x + p.y / 2, p.y / 2]))} ${arcTo(C, A, F.at([p.x / 2, 0]), (p.x / 2) * F.k, F.at([p.x / 2, p.x / 2]))} Z`;
  const parts = [shadeD(d), strokeD(d), seg(A, B), txt(A, 'A', -6, 4, 'end'), txt(B, 'B', 6, 4, 'start'), dot(C), txt(C, 'C', 0, 14)];
  if (p.fromHeight) {
    const D = F.at([p.x, Math.sqrt(p.x * p.y)]);
    parts.push(seg(C, D, true), dot(D), txt(D, 'D', 0, -12), txt(mid(C, D), `${p.h}`, 6, 0, 'start'));
  } else {
    parts.push(txt(mid(A, C), `${p.x}`, 0, 14), txt(mid(C, B), `${p.y}`, 0, 14));
  }
  return svg(F.height, 'A semicircle on AB with two smaller semicircles on AC and CB taken out of it', parts);
}

const cmArbelos: Generator<ArbelosParams> = {
  id: 'cm-arbelos',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const h = rng.int(2, 28);
      // Only the height is printed, so any split with x·y = h² draws it truly.
      const x = h * rng.pick([0.5, 0.6, 0.7]);
      return { x, y: (h * h) / x, h, fromHeight: true };
    }
    for (;;) {
      const x = rng.int(2, 20);
      const y = rng.int(2, 20);
      if (x === y || (x * y) % 4 !== 0 || Math.max(x, y) > 3 * Math.min(x, y)) continue;
      return { x, y, h: 0, fromHeight: false };
    }
  },
  render(p) {
    const setup = p.fromHeight
      ? `$C$ is on $AB$. Semicircles are drawn on $AB$, $AC$ and $CB$, all on the same side, and the shaded shape is the big one without the two small ones. The line from $C$ at right angles to $AB$ meets the big semicircle at $D$, with $CD = ${p.h}$.`
      : `$C$ is on $AB$, with $AC = ${p.x}$ and $CB = ${p.y}$. Semicircles are drawn on $AB$, $AC$ and $CB$, all on the same side, and the shaded shape is the big one without the two small ones.`;
    return typed([say(setup), { kind: 'diagram', svg: arbelosSvg(p) }, say('What is the shaded area? Leave $\\pi$ in the answer.')], piAnswer(arbelosArea(p)), '\\text{area} =', PI_FRACTION_KEYS);
  },
  choices(p) {
    if (p.fromHeight) {
      const q = p.h * p.h;
      return piOptions(arbelosArea(p), [pv(0, q, 8), pv(0, q, 2), pv(0, q)]);
    }
    const { x, y } = p;
    return piOptions(arbelosArea(p), [pv(0, x * y, 8), pv(0, x * y, 2), pv(0, x * x + y * y, 8)]);
  },
  solution(p) {
    if (p.fromHeight) {
      return [
        { text: 'The angle $ADB$ is in a semicircle, so it is a right angle, and $DC$ is the altitude of the right triangle $ADB$. So' },
        { tex: `AC \\times CB = CD^2 = ${p.h * p.h}` },
        { text: 'A semicircle on a diameter $d$ has area $\\tfrac{\\pi d^2}{8}$. With $AC = x$ and $CB = y$, the shaded area is' },
        { tex: `\\tfrac{\\pi}{8}\\left((x + y)^2 - x^2 - y^2\\right) = \\tfrac{\\pi}{4} xy` },
        { tex: `\\tfrac{\\pi}{4} \\times ${p.h * p.h} = ${piTex(arbelosArea(p))}` },
      ];
    }
    const { x, y } = p;
    const n = x + y;
    return [
      { text: 'A semicircle on a diameter $d$ has area $\\tfrac{\\pi d^2}{8}$. Take the two small semicircles from the big one:' },
      { tex: `\\tfrac{\\pi}{8}\\left(${n}^2 - ${x}^2 - ${y}^2\\right)` },
      { tex: `= \\tfrac{\\pi}{8} \\times ${n * n - x * x - y * y} = ${piTex(arbelosArea(p))}` },
      { text: `The squares always leave $2 \\times ${x} \\times ${y}$, so the area is $\\tfrac{\\pi}{4} \\times AC \\times CB$.` },
    ];
  },
};

/* ---------- Hippocrates' lunes ---------- */

const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [12, 35, 37],
];

/** Right triangles with legs p, q and hypotenuse c, both ways round, c at most `most`. */
function triangles(most: number, least = 0): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const [a, b, c] of TRIPLES) {
    for (let k = 1; k * c <= most; k += 1) {
      if (k * c < least) continue;
      out.push([k * a, k * b, k * c], [k * b, k * a, k * c]);
    }
  }
  return out;
}

interface LuneParams {
  p: number;
  q: number;
  c: number;
  /** Difficulty 2: an isosceles right triangle, and one lune. */
  iso: boolean;
}

function luneSvg(t: LuneParams, labels: { p: string; q: string; c: string }, shaded: boolean): string {
  // Model: A at the origin, B along the axis, C above with AC = p and BC = q.
  const c = t.iso ? t.p * Math.SQRT2 : t.c;
  const A: P2 = [0, 0];
  const B: P2 = [c, 0];
  const C: P2 = [(t.p * t.p) / c, (t.p * t.q) / c];
  const O: P2 = [c / 2, 0];
  const mAC = mid(A, C);
  const mBC = mid(B, C);
  // Outward normals: away from the triangle.
  const nAC: P2 = [-(C[1] - A[1]) / t.p, (C[0] - A[0]) / t.p];
  const nBC: P2 = [(C[1] - B[1]) / t.q, -(C[0] - B[0]) / t.q];
  const topAC: P2 = [mAC[0] + (nAC[0] * t.p) / 2, mAC[1] + (nAC[1] * t.p) / 2];
  const topBC: P2 = [mBC[0] + (nBC[0] * t.q) / 2, mBC[1] + (nBC[1] * t.q) / 2];
  const half = (centre: P2, r: number, n: P2): P2[] => {
    const t0 = Math.atan2(n[1], n[0]);
    return Array.from({ length: 13 }, (_, i) => onCircle(centre, r, t0 - Math.PI / 2 + (i * Math.PI) / 12));
  };
  const F = frame([...half(mAC, t.p / 2, nAC), ...half(mBC, t.q / 2, nBC), ...half(O, c / 2, [0, 1])], 210, 26);
  const [a, b, cc, o] = [F.at(A), F.at(B), F.at(C), F.at(O)];
  const R = (c / 2) * F.k;
  const G: P2 = [(a[0] + b[0] + cc[0]) / 3, (a[1] + b[1] + cc[1]) / 3];
  /** A side's label, moved off the side towards the middle of the triangle. */
  const toward = (q: P2, d: number): P2 => {
    const len = Math.hypot(G[0] - q[0], G[1] - q[1]) || 1;
    return [q[0] + ((G[0] - q[0]) / len) * d, q[1] + ((G[1] - q[1]) / len) * d];
  };
  const nearAC = F.at(onCircle(O, c / 2, Math.atan2(mAC[1], mAC[0] - c / 2)));
  const nearBC = F.at(onCircle(O, c / 2, Math.atan2(mBC[1], mBC[0] - c / 2)));
  const lune1 = `${M(a)} ${arcTo(a, cc, F.at(mAC), (t.p / 2) * F.k, F.at(topAC))} ${arcTo(cc, a, o, R, nearAC)} Z`;
  const lune2 = `${M(cc)} ${arcTo(cc, b, F.at(mBC), (t.q / 2) * F.k, F.at(topBC))} ${arcTo(b, cc, o, R, nearBC)} Z`;
  const parts = [
    shaded ? shadeD(lune1) : '',
    shaded && !t.iso ? shadeD(lune2) : '',
    strokeD(`${M(a)} ${arcTo(a, cc, F.at(mAC), (t.p / 2) * F.k, F.at(topAC))}`),
    strokeD(`${M(cc)} ${arcTo(cc, b, F.at(mBC), (t.q / 2) * F.k, F.at(topBC))}`),
    strokeD(`${M(a)} ${arcTo(a, b, o, R, F.at([c / 2, c / 2]))}`),
    outline([a, b, cc]),
    txt(a, 'A', -6, 4, 'end'),
    txt(b, 'B', 6, 4, 'start'),
    txt(cc, 'C', 0, 16),
    txt(mid(a, b), labels.c, 0, 14),
    txt(toward(F.at(mAC), 14), labels.p),
    txt(toward(F.at(mBC), 14), labels.q),
  ];
  return svg(F.height, 'A right triangle with semicircles on its three sides, the two lunes shaded', parts.filter(Boolean));
}

const cmLune: Generator<LuneParams> = {
  id: 'cm-lune',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const p = rng.int(2, 30);
      return { p, q: p, c: 0, iso: true };
    }
    const [p, q, c] = rng.pick(triangles(40));
    return { p, q, c, iso: false };
  },
  render(t) {
    const setup = t.iso
      ? `Triangle $ABC$ has a right angle at $C$ and $AC = BC = ${t.p}$. Semicircles are drawn outwards on $AC$ and $BC$, and a semicircle on $AB$ passes through $C$.`
      : `Triangle $ABC$ has a right angle at $C$, with $AC = ${t.p}$ and $BC = ${t.q}$. Semicircles are drawn outwards on $AC$ and $BC$, and a semicircle on $AB$ passes through $C$.`;
    const labels = t.iso ? { p: `${t.p}`, q: `${t.p}`, c: '' } : { p: `${t.p}`, q: `${t.q}`, c: '' };
    return typed(
      [say(setup), { kind: 'diagram', svg: luneSvg(t, labels, true) }, say(t.iso ? 'What is the area of the shaded lune?' : 'What is the total area of the two shaded lunes?')],
      t.iso ? (t.p * t.p) / 4 : (t.p * t.q) / 2,
      '\\text{area} =',
      PI_FRACTION_KEYS,
    );
  },
  choices(t) {
    if (t.iso) {
      const s = t.p * t.p;
      return piOptions(pv(s / 4, 0), [pv(s / 2, 0), pv(0, s, 8), pv(-s / 2, s, 4)]);
    }
    const tri = (t.p * t.q) / 2;
    return piOptions(pv(tri, 0), [pv(0, t.c * t.c, 8), pv(2 * tri, 0), pv(tri, t.c * t.c, 8)]);
  },
  solution(t) {
    if (t.iso) {
      const s = t.p * t.p;
      return [
        { text: 'Draw the semicircle on $BC$ too. The two lunes then total the triangle, because the semicircles on the legs add up to the one on the hypotenuse:' },
        { tex: `AC^2 + BC^2 = AB^2` },
        { text: 'The triangle is symmetric, so the two lunes are equal and one is half the triangle:' },
        { tex: `\\tfrac{1}{2} \\times \\tfrac{1}{2} \\times ${t.p} \\times ${t.p} = ${num(s / 4)}` },
      ];
    }
    const tri = (t.p * t.q) / 2;
    return [
      { text: 'A semicircle on a side $d$ has area $\\tfrac{\\pi d^2}{8}$. By Pythagoras the two small semicircles add up to the big one:' },
      { tex: `${piOnly(t.p * t.p, 8)} + ${piOnly(t.q * t.q, 8)} = ${piOnly(t.c * t.c, 8)}` },
      { text: 'The lunes are the two small semicircles plus the triangle, less the big semicircle, so the $\\pi$ parts cancel:' },
      { tex: `\\text{lunes} = \\tfrac{1}{2} \\times ${t.p} \\times ${t.q} = ${tri}` },
    ];
  },
};

interface LuneTableParams {
  p: number;
  q: number;
  c: number;
  /** Difficulty 2 gives AC and AB, so BC comes from Pythagoras. */
  fromHyp: boolean;
}

const semi = (d: number) => piTex(pv(0, d * d, 8));

const cmLuneTable: Generator<LuneTableParams> = {
  id: 'cm-lune-table',
  sample(rng, difficulty) {
    const [p, q, c] = rng.pick(difficulty >= 2 ? triangles(60, 13) : triangles(40));
    return { p, q, c, fromHyp: difficulty >= 2 };
  },
  render(t) {
    const tri = (t.p * t.q) / 2;
    const names = ['\\text{semicircle on } AC', '\\text{semicircle on } BC', '\\text{semicircle on } AB', '\\text{triangle } ABC', '\\text{two lunes}'];
    const values = [semi(t.p), semi(t.q), semi(t.c), num(tri), num(tri)];
    // Given AB and AC, the triangle row is left out: the lunes are the one place its area appears.
    const shown = t.fromHyp ? [0, 1, 2, 4] : [0, 1, 2, 3, 4];
    const blank = t.fromHyp ? [1, 4] : [0, 1, 2, 4];
    const rows = shown.map((i) => [names[i], blank.includes(i) ? null : values[i]]);
    const answer = blank.map((i) => values[i]);
    const spares = t.fromHyp ? [piTex(pv(0, t.c * t.c - t.p * t.p, 2)), piTex(pv(0, t.p * t.p + t.c * t.c, 8)), num(t.p * t.q)] : [piTex(pv(0, t.p * t.p, 2)), piTex(pv(0, t.c * t.c, 2)), num(t.p * t.q)];
    const bank = [...answer.filter((v, i) => answer.indexOf(v) === i), ...spares.filter((s) => !answer.includes(s))];
    return {
      kind: 'table',
      prompt: [
        say(
          t.fromHyp
            ? `Triangle $ABC$ has a right angle at $C$, with $AC = ${t.p}$ and $AB = ${t.c}$. Semicircles stand outwards on $AC$ and $BC$, and a semicircle on $AB$ passes through $C$, leaving two lunes.`
            : `Triangle $ABC$ has a right angle at $C$, with $AC = ${t.p}$, $BC = ${t.q}$ and $AB = ${t.c}$. Semicircles stand outwards on $AC$ and $BC$, and a semicircle on $AB$ passes through $C$, leaving two lunes.`,
        ),
        { kind: 'diagram', svg: luneSvg({ p: t.p, q: t.q, c: t.c, iso: false }, { p: `${t.p}`, q: t.fromHyp ? '' : `${t.q}`, c: `${t.c}` }, true) },
        say('Fill in the areas.'),
      ],
      columns: ['\\text{piece}', '\\text{area}'],
      rows,
      bank: bank.sort((x, y) => x.localeCompare(y)),
      answer,
    };
  },
  solution(t) {
    const tri = (t.p * t.q) / 2;
    const steps: SolutionStep[] = [{ text: 'A semicircle on a side $d$ has area $\\tfrac{\\pi d^2}{8}$.' }];
    if (t.fromHyp) {
      steps.push(
        { text: 'The semicircle on $BC$ is the one on $AB$ less the one on $AC$, because $BC^2 = AB^2 - AC^2$:' },
        { tex: `${semi(t.c)} - ${semi(t.p)} = ${semi(t.q)}` },
        { tex: `BC = \\sqrt{${t.c}^2 - ${t.p}^2} = ${t.q}` },
      );
    } else {
      steps.push({ tex: `${semi(t.p)} + ${semi(t.q)} = ${semi(t.c)}` });
    }
    steps.push(
      { tex: `\\text{triangle} = \\tfrac{1}{2} \\times ${t.p} \\times ${t.q} = ${tri}` },
      { text: 'The lunes are the two small semicircles and the triangle, less the big semicircle. The semicircles cancel, leaving the triangle:' },
      { tex: `\\text{lunes} = ${tri}` },
    );
    return steps;
  },
};

/* ================================================================
 * Lesson 3: Inscribed Figures
 * ================================================================ */

/* ---------- the circle inside a right triangle ---------- */

interface IncircleParams {
  p: number;
  q: number;
  c: number;
  /** Difficulty 2 asks the area of the triangle outside the circle. */
  outside: boolean;
}

const inradius = ({ p, q, c }: IncircleParams) => (p + q - c) / 2;

function incircleSvg(given: IncircleParams): string {
  // The longer leg along the bottom.
  const t = given.p > given.q ? { ...given, p: given.q, q: given.p } : given;
  const r = inradius(t);
  const F = frame([[0, 0], [t.q, 0], [0, t.p]], 210, 26);
  const C = F.at([0, 0]);
  const B = F.at([t.q, 0]);
  const A = F.at([0, t.p]);
  const O = F.at([r, r]);
  const R = r * F.k;
  const circle = `${M([O[0] - R, O[1]])} ${arcTo([O[0] - R, O[1]], [O[0] + R, O[1]], O, R, [O[0], O[1] - R])} ${arcTo([O[0] + R, O[1]], [O[0] - R, O[1]], O, R, [O[0], O[1] + R])} Z`;
  const parts = [
    t.outside ? shadeD(`${poly([A, B, C])} ${circle}`) : '',
    outline([A, B, C]),
    ring(O, R),
    `<path d="M ${f1(C[0] + 10)} ${f1(C[1])} L ${f1(C[0] + 10)} ${f1(C[1] - 10)} L ${f1(C[0])} ${f1(C[1] - 10)}" fill="none" stroke="currentColor" stroke-width="1" />`,
    txt(mid(C, B), `${t.q}`, 0, 14),
    txt(mid(C, A), `${t.p}`, -8, 0, 'end'),
    txt(mid(A, B), `${t.c}`, 8, -8, 'start'),
  ];
  if (!t.outside) parts.push(dot(O), seg(O, F.at([r, 0]), true), txt(mid(O, F.at([r, 0])), 'r', 6, 0, 'start'));
  return svg(F.height, 'A right triangle with a circle inside it touching all three sides', parts.filter(Boolean));
}

const cmIncircleRight: Generator<IncircleParams> = {
  id: 'cm-incircle-right',
  sample(rng, difficulty) {
    const [p, q, c] = rng.pick(triangles(difficulty >= 2 ? 45 : 60));
    return { p, q, c, outside: difficulty >= 2 };
  },
  render(t) {
    const r = inradius(t);
    const setup = `A right triangle has sides $${t.p}$, $${t.q}$ and $${t.c}$. A circle inside it touches all three sides.`;
    if (t.outside) {
      return typed([say(setup), { kind: 'diagram', svg: incircleSvg(t) }, say('What is the shaded area, the triangle outside the circle? Leave $\\pi$ in the answer.')], piAnswer(pv((t.p * t.q) / 2, -r * r)), '\\text{area} =', PI_KEYS);
    }
    return typed([say(setup), { kind: 'diagram', svg: incircleSvg(t) }, say('What is its radius $r$?')], r, 'r =');
  },
  choices(t) {
    const r = inradius(t);
    const tri = (t.p * t.q) / 2;
    if (t.outside) return piOptions(pv(tri, -r * r), [pv(2 * tri, -r * r), pv(tri, -2 * r), pv(tri, -(r * r) / 2)]);
    return numberOptions(r, [t.c / 2, 2 * r, (t.p * t.q) / (t.p + t.q + t.c), t.p + t.q - t.c + 1], 1, 1);
  },
  solution(t) {
    const r = inradius(t);
    const steps: SolutionStep[] = [
      { text: 'The two tangents from a corner to the circle are equal. At the right angle they are both $r$, with the circle’s centre and the two touching points making a square. So each leg is $r$ plus a tangent from the far corner, and those two tangents make up the hypotenuse:' },
      { tex: `(${t.p} - r) + (${t.q} - r) = ${t.c}` },
      { tex: `2r = ${t.p} + ${t.q} - ${t.c} = ${2 * r}` },
      { tex: `r = ${r}` },
    ];
    if (t.outside) {
      steps.push(
        { tex: `\\text{triangle} = \\tfrac{1}{2} \\times ${t.p} \\times ${t.q} = ${(t.p * t.q) / 2}` },
        { tex: `\\text{circle} = \\pi \\times ${r}^2 = ${piOnly(r * r)}` },
        { tex: `\\text{shaded} = ${piTex(pv((t.p * t.q) / 2, -r * r))}` },
      );
    }
    return steps;
  },
};

/* ---------- a square in a semicircle ---------- */

interface SemiSquareParams {
  /** Difficulty 1: the semicircle's radius; difficulty 2: the square's side. */
  n: number;
  fromSide: boolean;
}

function semiSquareSvg(p: SemiSquareParams): string {
  const s = 2;
  const R = Math.sqrt(5);
  const F = frame([[-R, 0], [R, 0], [R, R], [-R, R]], 170, 24);
  const O = F.at([0, 0]);
  const left = F.at([-R, 0]);
  const right = F.at([R, 0]);
  const sq = [F.at([-s / 2, 0]), F.at([s / 2, 0]), F.at([s / 2, s]), F.at([-s / 2, s])];
  const parts = [
    `<path class="plot-shade" d="${poly(sq)}" />`,
    strokeD(`${M(left)} ${arcTo(left, right, O, R * F.k, F.at([0, R]))} Z`),
    outline(sq),
    dot(O),
  ];
  if (p.fromSide) parts.push(txt(mid(sq[1], sq[2]), `${p.n}`, -8, 0, 'end'));
  else parts.push(seg(O, sq[2], true), txt(mid(O, sq[2]), `${p.n}`, 10, 4, 'start'));
  return svg(F.height, 'A square standing on the diameter of a semicircle, its top corners on the arc', parts);
}

const cmSemicircleSquare: Generator<SemiSquareParams> = {
  id: 'cm-semicircle-square',
  sample(rng, difficulty) {
    return { n: rng.int(2, 30), fromSide: difficulty >= 2 };
  },
  render(p) {
    if (p.fromSide) {
      return typed(
        [
          say(`A square of side $${p.n}$ stands on the diameter of a semicircle, with its two top corners on the arc.`),
          { kind: 'diagram', svg: semiSquareSvg(p) },
          say('What is the area of the semicircle? Leave $\\pi$ in the answer.'),
        ],
        piAnswer(pv(0, 5 * p.n * p.n, 8)),
        '\\text{area} =',
        PI_FRACTION_KEYS,
      );
    }
    return typed(
      [
        say(`A semicircle has radius $${p.n}$. A square stands on its diameter, with its two top corners on the arc.`),
        { kind: 'diagram', svg: semiSquareSvg(p) },
        say('What is the area of the square?'),
      ],
      (4 * p.n * p.n) / 5,
      '\\text{area} =',
    );
  },
  choices(p) {
    const q = p.n * p.n;
    if (p.fromSide) return piOptions(pv(0, 5 * q, 8), [pv(0, q, 2), pv(0, q, 4), pv(0, 5 * q, 4)]);
    return numberOptions((4 * q) / 5, [q / 2, q, (3 * q) / 4, 2 * q]);
  },
  solution(p) {
    const q = p.n * p.n;
    if (p.fromSide) {
      return [
        { text: `By symmetry the square sits in the middle, so the centre is at the middle of its base. From the centre to a top corner is $${num(p.n / 2)}$ across and $${p.n}$ up, and that is a radius:` },
        { tex: `r^2 = ${p.n}^2 + ${num(p.n / 2)}^2 = ${num((5 * q) / 4)}` },
        { tex: `\\tfrac{1}{2} \\pi r^2 = ${piOnly(5 * q, 8)}` },
      ];
    }
    return [
      { text: 'By symmetry the square sits in the middle, so the centre is at the middle of its base. With side $s$, a top corner is $\\tfrac{s}{2}$ across and $s$ up from the centre, and that is a radius:' },
      { tex: `s^2 + \\tfrac{1}{4}s^2 = ${p.n}^2` },
      { tex: `\\tfrac{5}{4}s^2 = ${q}` },
      { tex: `s^2 = ${q} \\times \\tfrac{4}{5} = ${num((4 * q) / 5)}` },
    ];
  },
};

/* ---------- an equilateral triangle between two circles ---------- */

interface TriCirclesParams {
  r: number;
  /** Difficulty 2 gives the big circle's radius instead. */
  fromBig: boolean;
}

function triCirclesSvg(p: TriCirclesParams): string {
  const F = frame(circlePts([0, 0], 2), 200, 16);
  const O = F.at([0, 0]);
  const V = [90, 210, 330].map((d) => F.at(onCircle([0, 0], 2, (d * Math.PI) / 180)));
  const foot = F.at([0, -1]);
  const parts = [ring(O, 2 * F.k), ring(O, F.k), outline(V), dot(O)];
  if (p.fromBig) {
    const E = F.at(onCircle([0, 0], 2, Math.PI / 6));
    parts.push(seg(O, E, true), txt(F.at(onCircle([0, 0], 1.56, Math.PI / 6)), `${2 * p.r}`, 0, -10));
  } else parts.push(seg(O, foot, true), txt(mid(O, foot), `${p.r}`, 6, 0, 'start'));
  return svg(F.height, 'An equilateral triangle with a circle inside touching its sides and a circle outside through its corners', parts);
}

const cmEquilateralCircles: Generator<TriCirclesParams> = {
  id: 'cm-equilateral-circles',
  sample(rng, difficulty) {
    return { r: rng.int(2, 30), fromBig: difficulty >= 2 };
  },
  render(p) {
    const { r } = p;
    const given = p.fromBig ? `The circle through its corners has radius $R = ${2 * r}$.` : `The circle inside it, touching its sides, has radius $${r}$.`;
    return {
      kind: 'tiles',
      prompt: [
        say(`An equilateral triangle has one circle inside it touching its sides and one through its corners. ${given}`),
        { kind: 'diagram', svg: triCirclesSvg(p) },
        say(p.fromBig ? 'Fill in the triangle’s height, the small circle’s radius $r$, and the area of the ring between the circles.' : 'Fill in the triangle’s height, the big circle’s radius $R$, and the area of the ring between the circles.'),
      ],
      template: p.fromBig ? '\\text{height} = {0} \\quad r = {1} \\quad \\text{ring} = {2}\\pi' : '\\text{height} = {0} \\quad R = {1} \\quad \\text{ring} = {2}\\pi',
      bank: numberBank(p.fromBig ? [3 * r, r, 3 * r * r] : [3 * r, 2 * r, 3 * r * r], [4 * r * r, r * r, 4 * r, 2 * r * r, 2 * r], 3, 1, 1),
      answer: p.fromBig ? [num(3 * r), num(r), num(3 * r * r)] : [num(3 * r), num(2 * r), num(3 * r * r)],
    };
  },
  solution(p) {
    const { r } = p;
    return [
      { text: 'Both circles have their centre where the medians cross, which is a third of the way up each median, and in an equilateral triangle the medians are the heights. So the small radius is a third of the height and the big radius two thirds:' },
      p.fromBig ? { tex: `r = ${2 * r} \\div 2 = ${r}` } : { tex: `R = 2 \\times ${r} = ${2 * r}` },
      { tex: `\\text{height} = ${r} + ${2 * r} = ${3 * r}` },
      { tex: `\\text{ring} = \\pi \\times ${2 * r}^2 - \\pi \\times ${r}^2 = ${piOnly(3 * r * r)}` },
    ];
  },
};

/* ---------- a ring from one chord ---------- */

interface RingParams {
  /** Half the chord. */
  m: number;
  /** Difficulty 2 gives the ring's area and asks the chord. */
  back: boolean;
}

function ringSvg(p: RingParams): string {
  const R = 5;
  const r = 3;
  const F = frame(circlePts([0, 0], R), 200, 22);
  const O = F.at([0, 0]);
  const circleD = (rad: number) => {
    const a = [O[0] - rad, O[1]] as P2;
    const b = [O[0] + rad, O[1]] as P2;
    return `${M(a)} ${arcTo(a, b, O, rad, [O[0], O[1] - rad])} ${arcTo(b, a, O, rad, [O[0], O[1] + rad])} Z`;
  };
  const P = F.at([-4, -r]);
  const Q = F.at([4, -r]);
  const T = F.at([0, -r]);
  return svg(F.height, 'Two circles with the same centre, and a chord of the big one touching the small one', [
    shadeD(`${circleD(R * F.k)} ${circleD(r * F.k)}`),
    ring(O, R * F.k),
    ring(O, r * F.k),
    seg(P, Q),
    dot(O),
    dot(T),
    txt(T, p.back ? '?' : `${2 * p.m}`, 0, 14),
  ]);
}

const cmRingChord: Generator<RingParams> = {
  id: 'cm-ring-chord',
  sample(rng, difficulty) {
    return difficulty >= 2 ? { m: rng.int(2, 30), back: true } : { m: rng.int(4, 40) / 2, back: false };
  },
  render(p) {
    const setup = 'Two circles have the same centre. A chord of the big circle just touches the small circle.';
    if (p.back) {
      return typed([say(`${setup} The shaded ring between them has area $${piOnly(p.m * p.m)}$.`), { kind: 'diagram', svg: ringSvg(p) }, say('How long is the chord?')], 2 * p.m, '\\text{chord} =');
    }
    const c = 2 * p.m;
    return typed([say(`${setup} The chord is $${c}$ long.`), { kind: 'diagram', svg: ringSvg(p) }, say('What is the area of the shaded ring? Leave $\\pi$ in the answer.')], piAnswer(pv(0, c * c, 4)), '\\text{area} =', PI_FRACTION_KEYS);
  },
  choices(p) {
    const k = p.m * p.m;
    if (p.back) return numberOptions(2 * p.m, [p.m, k / 2, 4 * p.m, 2 * k], 1, 1);
    const c = 2 * p.m;
    return piOptions(pv(0, c * c, 4), [pv(0, c * c), pv(0, c * c, 2), pv(0, 2 * c)]);
  },
  solution(p) {
    const k = p.m * p.m;
    const steps: SolutionStep[] = [
      { text: 'The radius of the small circle meets the chord at right angles at the touching point, and cuts the chord in half. With big radius $R$ and small radius $r$, Pythagoras gives' },
      { tex: `R^2 - r^2 = (\\tfrac{1}{2}\\text{chord})^2` },
      { text: 'The ring is $\\pi R^2 - \\pi r^2$, so neither radius is needed:' },
    ];
    if (p.back) {
      steps.push({ tex: `(\\tfrac{1}{2}\\text{chord})^2 = ${k}` }, { tex: `\\tfrac{1}{2}\\text{chord} = ${p.m}` }, { tex: `\\text{chord} = ${2 * p.m}` });
    } else {
      steps.push({ tex: `\\pi \\times ${num(p.m)}^2 = ${piOnly(4 * k, 4)}` });
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 4: Ratios Meet Geometry
 * ================================================================ */

/* ---------- a point inside a rectangle ---------- */

interface PointRectParams {
  /** Areas of the triangles on AB, BC, CD, DA. */
  areas: [number, number, number, number];
  ask: number;
  slant: boolean;
}

const SIDE = ['AB', 'BC', 'CD', 'DA'];

function pointRectSvg(p: PointRectParams): string {
  const [a1, , a3, a4] = p.areas;
  const S = a1 + a3;
  const w = 6;
  const h = 4;
  const off = p.slant ? 1.8 : 0;
  const map = ([u, v]: P2): P2 => [u * w + v * off, v * h];
  const x = a4 / S;
  const y = a1 / S;
  const F = frame([map([0, 0]), map([1, 0]), map([1, 1]), map([0, 1])], 200, 24);
  const [A, B, C, D] = ([[0, 0], [1, 0], [1, 1], [0, 1]] as P2[]).map((q) => F.at(map(q)));
  const P = F.at(map([x, y]));
  const centroid = (a: P2, b: P2) => [(a[0] + b[0] + P[0]) / 3, (a[1] + b[1] + P[1]) / 3] as P2;
  const labels = [centroid(A, B), centroid(B, C), centroid(C, D), centroid(D, A)];
  return svg(F.height, `A point P inside ${p.slant ? 'a parallelogram' : 'a rectangle'} ABCD joined to the four corners`, [
    `<path class="plot-shade" d="${poly([A, B, P])}" />`,
    `<path class="plot-shade" d="${poly([C, D, P])}" />`,
    outline([A, B, C, D]),
    seg(P, A),
    seg(P, B),
    seg(P, C),
    seg(P, D),
    dot(P),
    txt(P, 'P', 0, -12),
    txt(A, 'A', -6, 6, 'end'),
    txt(B, 'B', 6, 6, 'start'),
    txt(C, 'C', 6, -6, 'start'),
    txt(D, 'D', -6, -6, 'end'),
    ...labels.map((q, i) => txt(q, i === p.ask ? '?' : `${p.areas[i]}`, 0, 0, 'middle', 12)),
  ]);
}

const cmPointInRectangle: Generator<PointRectParams> = {
  id: 'cm-point-in-rectangle',
  sample(rng, difficulty) {
    for (;;) {
      const S = rng.int(12, 60);
      const a1 = rng.int(Math.ceil(0.3 * S), Math.floor(0.7 * S));
      const a4 = rng.int(Math.ceil(0.3 * S), Math.floor(0.7 * S));
      const areas: [number, number, number, number] = [a1, S - a4, S - a1, a4];
      if (new Set(areas).size < 4) continue;
      return { areas, ask: rng.int(0, 3), slant: difficulty >= 2 };
    }
  },
  render(p) {
    const shape = p.slant ? 'parallelogram' : 'rectangle';
    return typed(
      [
        say(`$P$ is a point inside the ${shape} $ABCD$. Joining $P$ to the four corners cuts it into four triangles, and three of their areas are shown.`),
        { kind: 'diagram', svg: pointRectSvg(p) },
        say(`What is the area of triangle $P${SIDE[p.ask]}$?`),
      ],
      p.areas[p.ask],
      '\\text{area} =',
    );
  },
  choices(p) {
    const opp = p.areas[(p.ask + 2) % 4];
    const adj = p.areas[(p.ask + 1) % 4] + p.areas[(p.ask + 3) % 4];
    return numberOptions(p.areas[p.ask], [opp, adj, Math.round(adj / 2), adj + opp], 1, 1);
  },
  solution(p) {
    const i = p.ask;
    const opp = (i + 2) % 4;
    const n1 = (i + 1) % 4;
    const n2 = (i + 3) % 4;
    const name = (k: number) => `P${SIDE[k]}`;
    return [
      { text: `Triangles $${name(i)}$ and $${name(opp)}$ stand on opposite sides, which are equal and parallel, and their heights add up to the distance between those sides. So together they make half the ${p.slant ? 'parallelogram' : 'rectangle'}, and so do the other two:` },
      { tex: `[${name(i)}] + [${name(opp)}] = [${name(n1)}] + [${name(n2)}]` },
      { tex: `[${name(i)}] = ${p.areas[n1]} + ${p.areas[n2]} - ${p.areas[opp]} = ${p.areas[i]}` },
    ];
  },
};

/* ---------- a triangle cut into bands of equal height ---------- */

interface BandsParams {
  n: number;
  m: number;
  /** The band asked, counted from the apex (difficulty 1). */
  k: number;
  /** Difficulty 2 shades every other band, starting at the apex. */
  alt: boolean;
}

const bandsShaded = ({ n, m, k, alt }: BandsParams) => (alt ? Array.from({ length: n }, (_, i) => i + 1).filter((j) => j % 2 === 1).reduce((t, j) => t + (2 * j - 1) * m, 0) : (2 * k - 1) * m);

function bandsSvg(p: BandsParams): string {
  const F = frame([[0, 0], [8, 0], [4, 6]], 200, 22);
  const apex: P2 = [4, 6];
  const at = (j: number, side: number): P2 => [4 + side * (4 * j) / p.n, 6 - (6 * j) / p.n];
  const parts: string[] = [];
  for (let j = 1; j <= p.n; j += 1) {
    const shaded = p.alt ? j % 2 === 1 : j === p.k;
    if (!shaded) continue;
    const pts = j === 1 ? [apex, at(1, -1), at(1, 1)] : [at(j - 1, -1), at(j, -1), at(j, 1), at(j - 1, 1)];
    parts.push(`<path class="plot-shade" d="${poly(pts.map(F.at))}" />`);
  }
  for (let j = 1; j < p.n; j += 1) parts.push(seg(F.at(at(j, -1)), F.at(at(j, 1))));
  parts.push(outline([F.at(apex), F.at([0, 0]), F.at([8, 0])]));
  if (!p.alt) parts.push(txt(F.at([4, 6 - (6 * (p.k - 0.4)) / p.n]), '?', 0, 0, 'middle', 12));
  return svg(F.height, 'A triangle cut by lines parallel to its base into strips of equal height', parts);
}

const ordinal = (k: number) => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][k - 1];

const cmTriangleBands: Generator<BandsParams> = {
  id: 'cm-triangle-bands',
  sample(rng, difficulty) {
    const n = rng.int(3, 6);
    const m = rng.int(1, Math.floor(360 / (n * n)));
    return { n, m, k: rng.int(2, n), alt: difficulty >= 2 };
  },
  render(p) {
    const T = p.n * p.n * p.m;
    return typed(
      [
        say(`A triangle of area $${T}$ is cut into ${p.n} strips of equal height by lines parallel to its base.`),
        { kind: 'diagram', svg: bandsSvg(p) },
        say(p.alt ? 'Every other strip is shaded, starting at the top. What is the shaded area?' : `What is the area of the ${ordinal(p.k)} strip from the top?`),
      ],
      bandsShaded(p),
      '\\text{area} =',
    );
  },
  choices(p) {
    const T = p.n * p.n * p.m;
    if (p.alt) return numberOptions(bandsShaded(p), [T / 2, (Math.ceil(p.n / 2) * T) / p.n, T - bandsShaded(p)], p.m, 1);
    return numberOptions(bandsShaded(p), [T / p.n, p.k * p.k * p.m, (2 * p.k + 1) * p.m, p.k * p.m], p.m, 1);
  },
  solution(p) {
    const T = p.n * p.n * p.m;
    const steps: SolutionStep[] = [
      { text: `The lines cut off triangles similar to the whole, with sides $\\tfrac{1}{${p.n}}$, $\\tfrac{2}{${p.n}}$, … of it, so areas $1, 4, 9, \\ldots$ times the top one:` },
      { tex: `\\text{top triangle} = ${T} \\div ${p.n}^2 = ${p.m}` },
      { text: 'Each strip is the difference of two squares, so the strips go up in odd numbers $1, 3, 5, \\ldots$ of the top triangle.' },
    ];
    if (p.alt) {
      const odd = Array.from({ length: p.n }, (_, i) => i + 1).filter((j) => j % 2 === 1).map((j) => 2 * j - 1);
      steps.push({ tex: `(${odd.join(' + ')}) \\times ${p.m} = ${bandsShaded(p)}` });
    } else {
      steps.push({ tex: `(${p.k}^2 - ${p.k - 1}^2) \\times ${p.m} = ${2 * p.k - 1} \\times ${p.m} = ${bandsShaded(p)}` });
    }
    return steps;
  },
};

/* ---------- pieces of a regular hexagon ---------- */

const HEX_PIECES: { name: string; sixths: number }[] = [
  { name: '\\text{triangle } ABC', sixths: 1 },
  { name: '\\text{triangle } ABD', sixths: 2 },
  { name: '\\text{triangle } ACE', sixths: 3 },
  { name: '\\text{rectangle } ACDF', sixths: 4 },
  { name: '\\text{pentagon } ABCDE', sixths: 5 },
];

interface HexParams {
  k: number;
  /** Indices into HEX_PIECES, in order. */
  rows: number[];
  /** Difficulty 2 gives triangle ABC instead of the hexagon. */
  fromPiece: boolean;
}

function hexSvg(): string {
  const V = [0, 60, 120, 180, 240, 300].map((d) => onCircle([0, 0], 1, (d * Math.PI) / 180));
  const F = frame(V, 190, 26);
  const S = V.map(F.at);
  const O = F.at([0, 0]);
  const names = ['A', 'B', 'C', 'D', 'E', 'F'];
  return svg(F.height, 'A regular hexagon ABCDEF with its centre joined to each corner', [
    ...S.map((q) => thin(O, q)),
    outline(S),
    ...S.map((q, i) => txt(q, names[i], (q[0] - O[0]) * 0.14, (q[1] - O[1]) * 0.14)),
  ]);
}

const cmHexagonTable: Generator<HexParams> = {
  id: 'cm-hexagon-table',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const drop = rng.int(1, 4);
      const rows = [1, 2, 3, 4].filter((i) => i !== drop);
      return { k: rng.int(2, 40), rows, fromPiece: true };
    }
    const skip = rng.sample([0, 1, 2, 3, 4], 2);
    return { k: rng.int(1, 30), rows: [0, 1, 2, 3, 4].filter((i) => !skip.includes(i)), fromPiece: false };
  },
  render(p) {
    const answer = p.rows.map((i) => HEX_PIECES[i].sixths * p.k);
    const given = p.fromPiece ? `Triangle $ABC$ has area $${p.k}$.` : `It has area $${6 * p.k}$.`;
    const slips = [6 * p.k, 1.5 * p.k, 2.5 * p.k, 4.5 * p.k, 3 * p.k, 2 * p.k, 4 * p.k];
    return {
      kind: 'table',
      prompt: [say(`$ABCDEF$ is a regular hexagon. ${given}`), { kind: 'diagram', svg: hexSvg() }, say('Fill in the areas.')],
      columns: ['\\text{shape}', '\\text{area}'],
      rows: p.rows.map((i) => [HEX_PIECES[i].name, null]),
      bank: numberBank(answer, slips.filter((s) => Number.isInteger(s)), 3, p.k, 1),
      answer: answer.map(num),
    };
  },
  solution(p) {
    const steps: SolutionStep[] = [
      { text: 'Lines from the centre cut the hexagon into six equilateral triangles, and each shape here is a whole number of sixths of it:' },
      p.fromPiece
        ? { text: `Triangle $ABC$ is half the rhombus $ABCO$, which is two of the six, so it is one sixth. The hexagon is $6 \\times ${p.k} = ${6 * p.k}$.` }
        : { tex: `\\tfrac{1}{6} \\times ${6 * p.k} = ${p.k}` },
    ];
    const why: Record<number, string> = {
      0: 'Triangle $ABC$: half of rhombus $ABCO$, one sixth.',
      1: 'Triangle $ABD$: $AD$ is a diameter, and $ABD$ has the same base and height as $ABO$ doubled, two sixths.',
      2: 'Triangle $ACE$: the hexagon less three triangles like $ABC$, three sixths.',
      3: 'Rectangle $ACDF$: the hexagon less triangles $ABC$ and $DEF$, four sixths.',
      4: 'Pentagon $ABCDE$: the hexagon less triangle $DEF$, which is like $ABC$, five sixths.',
    };
    for (const i of p.rows) {
      steps.push({ text: why[i] }, { tex: `${HEX_PIECES[i].sixths} \\times ${p.k} = ${HEX_PIECES[i].sixths * p.k}` });
    }
    return steps;
  },
};

/* ---------- a square cut by a diagonal and a line to a midpoint ---------- */

type CevianRegion = 'ABP' | 'BMP' | 'APD' | 'PMCD';

/** Each region as twelfths of the square. */
const CEVIAN_TWELFTHS: Record<CevianRegion, number> = { ABP: 2, BMP: 1, APD: 4, PMCD: 5 };

interface CevianParams {
  k: number;
  region: CevianRegion;
}

function cevianSvg(p: CevianParams): string {
  const F = frame([[0, 0], [6, 6]], 200, 26);
  const [A, B, C, D] = ([[0, 0], [6, 0], [6, 6], [0, 6]] as P2[]).map(F.at);
  const Mp = F.at([6, 3]);
  const P = F.at([4, 2]);
  const region: Record<CevianRegion, P2[]> = { ABP: [A, B, P], BMP: [B, Mp, P], APD: [A, P, D], PMCD: [P, Mp, C, D] };
  return svg(F.height, 'A square ABCD with M the midpoint of BC, the diagonal BD and the line AM crossing at P', [
    `<path class="plot-shade" d="${poly(region[p.region])}" />`,
    outline([A, B, C, D]),
    seg(B, D),
    seg(A, Mp),
    dot(P),
    dot(Mp),
    txt(A, 'A', -6, 6, 'end'),
    txt(B, 'B', 6, 6, 'start'),
    txt(C, 'C', 6, -6, 'start'),
    txt(D, 'D', -6, -6, 'end'),
    txt(Mp, 'M', 8, 0, 'start'),
    txt(P, 'P', 0, 14),
  ]);
}

const cmSquareCevian: Generator<CevianParams> = {
  id: 'cm-square-cevian',
  sample(rng, difficulty) {
    return { k: rng.int(1, 30), region: difficulty >= 2 ? 'PMCD' : rng.pick(['ABP', 'BMP', 'APD'] as CevianRegion[]) };
  },
  render(p) {
    const what = p.region === 'PMCD' ? 'quadrilateral $PMCD$' : `triangle $${p.region}$`;
    return typed(
      [
        say(`$ABCD$ is a square of area $${12 * p.k}$, and $M$ is the midpoint of $BC$. The line $AM$ crosses the diagonal $BD$ at $P$.`),
        { kind: 'diagram', svg: cevianSvg(p) },
        say(`What is the area of ${what}?`),
      ],
      CEVIAN_TWELFTHS[p.region] * p.k,
      '\\text{area} =',
    );
  },
  choices(p) {
    const S = 12 * p.k;
    const slips = p.region === 'PMCD' ? [S / 2, S / 3, S / 4, (3 * S) / 8] : [S / 4, S / 8, S / 6, S / 3, S / 12];
    return numberOptions(CEVIAN_TWELFTHS[p.region] * p.k, slips, p.k, 1);
  },
  solution(p) {
    const S = 12 * p.k;
    const steps: SolutionStep[] = [
      { text: '$AD$ is parallel to $BM$, so triangles $PAD$ and $PMB$ make an hourglass, with $AD$ twice $BM$. So $P$ is two thirds of the way from $A$ to $M$, and from $D$ to $B$.' },
      { text: `Measured from $AB$, $P$ is then a third of the way up, since $M$ is halfway up and $P$ is two thirds of the way to it.` },
    ];
    if (p.region === 'ABP') steps.push({ tex: `[ABP] = \\tfrac{1}{2} \\times \\text{side} \\times \\tfrac{1}{3}\\,\\text{side} = \\tfrac{1}{6} \\times ${S} = ${2 * p.k}` });
    if (p.region === 'BMP') steps.push({ text: 'Triangle $ABM$ is a quarter of the square, and $PM$ is a third of $AM$:' }, { tex: `[BMP] = \\tfrac{1}{3} \\times \\tfrac{1}{4} \\times ${S} = ${p.k}` });
    if (p.region === 'APD') steps.push({ text: 'Triangle $ABD$ is half the square, and $DP$ is two thirds of $DB$:' }, { tex: `[APD] = \\tfrac{2}{3} \\times \\tfrac{1}{2} \\times ${S} = ${4 * p.k}` });
    if (p.region === 'PMCD') {
      steps.push(
        { text: 'Triangle $BCD$ is half the square. Take off triangle $BMP$, which is a third of triangle $ABM$, a quarter of the square:' },
        { tex: `[BMP] = \\tfrac{1}{3} \\times \\tfrac{1}{4} \\times ${S} = ${p.k}` },
        { tex: `[PMCD] = ${S / 2} - ${p.k} = ${5 * p.k}` },
      );
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 5: Working in 3D
 * ================================================================ */

/** Isometric projection of a point (x, y, z), z up. */
const iso = ([x, y, z]: [number, number, number]): P2 => [(x - y) * Math.cos(Math.PI / 6), (x + y) * 0.5 * -1 + z];

/** A box a × b × c drawn in isometric, with unit grid lines when `grid`. */
function boxParts(a: number, b: number, c: number, F: Frame, grid: boolean): string[] {
  const P = (x: number, y: number, z: number) => F.at(iso([x, y, z]));
  const parts: string[] = [];
  // The faces facing the viewer: the top (z = c) and the two fronts, x = a and y = b.
  if (grid) {
    for (let i = 1; i < a; i += 1) parts.push(thin(P(i, 0, c), P(i, b, c)), thin(P(i, b, 0), P(i, b, c)));
    for (let j = 1; j < b; j += 1) parts.push(thin(P(0, j, c), P(a, j, c)), thin(P(a, j, 0), P(a, j, c)));
    for (let k = 1; k < c; k += 1) parts.push(thin(P(a, 0, k), P(a, b, k)), thin(P(0, b, k), P(a, b, k)));
  }
  parts.push(
    outline([P(0, 0, c), P(a, 0, c), P(a, b, c), P(0, b, c)]),
    outline([P(a, 0, 0), P(a, b, 0), P(a, b, c), P(a, 0, c)]),
    outline([P(0, b, 0), P(a, b, 0), P(a, b, c), P(0, b, c)]),
  );
  return parts;
}

function boxCorners(a: number, b: number, c: number): P2[] {
  const out: P2[] = [];
  for (const x of [0, a]) for (const y of [0, b]) for (const z of [0, c]) out.push(iso([x, y, z]));
  return out;
}

/* ---------- the painted cube ---------- */

interface PaintParams {
  dims: [number, number, number];
  faces: number;
}

/** How many unit cubes have exactly 0, 1, 2 and 3 painted faces. */
function paintCounts([a, b, c]: [number, number, number]): number[] {
  const [x, y, z] = [a - 2, b - 2, c - 2];
  return [x * y * z, 2 * (x * y + y * z + x * z), 4 * (x + y + z), 8];
}

function paintSvg(dims: [number, number, number]): string {
  const [a, b, c] = dims;
  const F = frame(boxCorners(a, b, c), 200, 18);
  return svg(F.height, `A ${a} by ${b} by ${c} block of unit cubes`, boxParts(a, b, c, F, true));
}

const isCube = ([a, b, c]: [number, number, number]) => a === b && b === c;

function paintSetup(dims: [number, number, number]): string {
  const [a, b, c] = dims;
  return isCube(dims)
    ? `A cube of edge $${a}$ is painted on the outside, then cut into $${a * a * a}$ unit cubes.`
    : `A block measuring $${a} \\times ${b} \\times ${c}$ is painted on the outside, then cut into $${a * b * c}$ unit cubes.`;
}

const FACE_WORDS = ['no faces', 'exactly one face', 'exactly two faces', 'three faces'];

const cmPaintedCube: Generator<PaintParams> = {
  id: 'cm-painted-cube',
  sample(rng, difficulty) {
    const faces = rng.int(0, 2);
    if (difficulty >= 2) {
      for (;;) {
        const a = rng.int(3, 8);
        const b = rng.int(a + 1, 9);
        const c = rng.int(b + 1, 10);
        if (a * b * c <= 600) return { dims: [a, b, c], faces };
      }
    }
    const n = rng.int(3, 12);
    return { dims: [n, n, n], faces };
  },
  render(p) {
    return typed(
      [say(paintSetup(p.dims)), { kind: 'diagram', svg: paintSvg(p.dims) }, say(`How many of the unit cubes have ${FACE_WORDS[p.faces]} painted?`)],
      paintCounts(p.dims)[p.faces],
      '\\text{cubes} =',
    );
  },
  choices(p) {
    const [a, b, c] = p.dims;
    const count = paintCounts(p.dims)[p.faces];
    if (p.faces === 0) return numberOptions(count, [(a - 1) * (b - 1) * (c - 1), a * b * c - count - 8, count + 8], 1, 1);
    if (p.faces === 1) return numberOptions(count, [2 * (a * b + b * c + a * c), 2 * ((a - 1) * (b - 1) + (b - 1) * (c - 1) + (a - 1) * (c - 1)), count / 2], 1, 1);
    return numberOptions(count, [4 * (a + b + c), 4 * (a + b + c - 3), 2 * (a + b + c - 6)], 1, 1);
  },
  solution(p) {
    const [a, b, c] = p.dims;
    const count = paintCounts(p.dims)[p.faces];
    const cube = isCube(p.dims);
    const steps: SolutionStep[] = [];
    if (p.faces === 0) {
      steps.push({ text: 'The unpainted cubes are the core left when a layer is peeled off every face, which takes 2 off each edge:' }, { tex: cube ? `(${a} - 2)^3 = ${count}` : `${a - 2} \\times ${b - 2} \\times ${c - 2} = ${count}` });
    } else if (p.faces === 1) {
      steps.push(
        { text: 'One painted face means the middle of a face, away from its edges: each face has a block 2 shorter each way.' },
        cube ? { tex: `6 \\times (${a} - 2)^2 = ${count}` } : { tex: `2 \\times (${a - 2} \\times ${b - 2} + ${b - 2} \\times ${c - 2} + ${a - 2} \\times ${c - 2}) = ${count}` },
      );
    } else {
      steps.push(
        { text: 'Two painted faces means along an edge but not at a corner: each of the 12 edges loses its two corner cubes.' },
        cube ? { tex: `12 \\times (${a} - 2) = ${count}` } : { tex: `4 \\times (${a - 2} + ${b - 2} + ${c - 2}) = ${count}` },
      );
    }
    return steps;
  },
};

interface PaintTableParams {
  dims: [number, number, number];
  /** Which of the rows for 3, 2, 1, 0 faces are blank. */
  blank: number[];
}

const cmPaintedTable: Generator<PaintTableParams> = {
  id: 'cm-painted-table',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const a = rng.int(3, 6);
        const b = rng.int(a + 1, 8);
        const c = rng.int(b + 1, 10);
        const dims: [number, number, number] = [a, b, c];
        if (a * b * c > 400 || new Set(paintCounts(dims)).size < 4) continue;
        return { dims, blank: [1, 2, 3] };
      }
      const n = rng.int(3, 12);
      const dims: [number, number, number] = [n, n, n];
      if (new Set(paintCounts(dims)).size < 4) continue;
      const keep = rng.int(0, 3);
      return { dims, blank: [0, 1, 2, 3].filter((i) => i !== keep) };
    }
  },
  render(p) {
    const counts = paintCounts(p.dims);
    // Rows run from three painted faces down to none.
    const byRow = [counts[3], counts[2], counts[1], counts[0]];
    const [a, b, c] = p.dims;
    const rows: (string | null)[][] = byRow.map((v, i) => [`${3 - i}`, p.blank.includes(i) ? null : num(v)]);
    rows.push(['\\text{total}', num(a * b * c)]);
    const answer = p.blank.map((i) => byRow[i]);
    const slips = [4 * (a + b + c), 2 * (a * b + b * c + a * c), (a - 1) * (b - 1) * (c - 1), 12, 6];
    return {
      kind: 'table',
      prompt: [say(paintSetup(p.dims)), { kind: 'diagram', svg: paintSvg(p.dims) }, say('Fill in how many unit cubes have each number of painted faces.')],
      columns: ['\\text{painted faces}', '\\text{cubes}'],
      rows,
      bank: numberBank(answer, slips, 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution(p) {
    const [a, b, c] = p.dims;
    const [x, y, z] = [a - 2, b - 2, c - 2];
    const counts = paintCounts(p.dims);
    return [
      { text: 'Corners have three painted faces; there are always 8.' },
      { text: 'Two faces: the edges without their corners, 2 shorter than each edge.' },
      { tex: `4 \\times (${x} + ${y} + ${z}) = ${counts[2]}` },
      { text: 'One face: the middle of each face, 2 shorter each way.' },
      { tex: `2 \\times (${x} \\times ${y} + ${y} \\times ${z} + ${x} \\times ${z}) = ${counts[1]}` },
      { text: 'None: the core.' },
      { tex: `${x} \\times ${y} \\times ${z} = ${counts[0]}` },
      { tex: `8 + ${counts[2]} + ${counts[1]} + ${counts[0]} = ${a * b * c}` },
    ];
  },
};

/* ---------- cubes stacked into a tower ---------- */

interface StackParams {
  /** Edge lengths from the bottom up, each smaller than the one below. */
  sides: number[];
}

const stackArea = (sides: number[]) => 6 * sides[0] ** 2 + sides.slice(1).reduce((t, s) => t + 4 * s * s, 0);

function stackSvg(sides: number[]): string {
  const total = sides.reduce((t, s) => t + s, 0);
  const F = frame([[-sides[0] / 2, 0], [sides[0] / 2, total]], 210, 26);
  const parts: string[] = [];
  let y = 0;
  for (const s of sides) {
    const box = [F.at([-s / 2, y]), F.at([s / 2, y]), F.at([s / 2, y + s]), F.at([-s / 2, y + s])];
    parts.push(`<path class="plot-shade" d="${poly(box)}" />`, outline(box), txt(mid(box[1], box[2]), `${s}`, 8, 0, 'start'));
    y += s;
  }
  return svg(F.height, 'Cubes stacked into a tower, each centred on the one below, seen from the front', parts);
}

const cmStackedCubes: Generator<StackParams> = {
  id: 'cm-stacked-cubes',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const a = rng.int(5, 12);
      const b = rng.int(Math.max(3, Math.ceil(a / 2)), a - 1);
      const c = rng.int(Math.max(2, Math.ceil(b / 2)), b - 1);
      return { sides: [a, b, c] };
    }
    const a = rng.int(3, 12);
    return { sides: [a, rng.int(Math.ceil(a / 3), a - 1)] };
  },
  render(p) {
    const list = p.sides.length === 2 ? `$${p.sides[0]}$ and $${p.sides[1]}$` : `$${p.sides[0]}$, $${p.sides[1]}$ and $${p.sides[2]}$`;
    return typed(
      [
        say(`Solid cubes with edges ${list} are stacked on the floor into a tower, largest at the bottom, each centred on the one below and glued in place.`),
        { kind: 'diagram', svg: stackSvg(p.sides) },
        say('What is the surface area of the tower, the bottom included?'),
      ],
      stackArea(p.sides),
      '\\text{area} =',
    );
  },
  choices(p) {
    const sq = p.sides.map((s) => s * s);
    const all = sq.reduce((t, s) => t + 6 * s, 0);
    const once = 6 * sq[0] + sq.slice(1).reduce((t, s) => t + 5 * s, 0);
    return numberOptions(stackArea(p.sides), [all, once, stackArea(p.sides) - sq[0]], 1, 1);
  },
  solution(p) {
    const sq = p.sides.map((s) => s * s);
    const tops = p.sides.map((s) => `${s}^2`).join(' + ');
    return [
      { text: 'Looking down, the tops you see fit together into exactly the bottom cube’s top face, so top and bottom together are two of its faces. The sides are four faces of every cube:' },
      { tex: `2 \\times ${sq[0]} + 4 \\times (${tops})` },
      { tex: `= ${2 * sq[0]} + ${4 * sq.reduce((t, s) => t + s, 0)} = ${stackArea(p.sides)}` },
      { text: `Adding up every cube’s six faces, ${sq.reduce((t, s) => t + 6 * s, 0)}, counts the hidden glued faces too.` },
    ];
  },
};

/* ---------- a cube with a square hole through it ---------- */

interface DrillParams {
  n: number;
  h: number;
  /** Difficulty 2 asks the surface area. */
  surface: boolean;
}

const drillVolume = ({ n, h }: DrillParams) => n * n * n - h * h * n;
const drillSurface = ({ n, h }: DrillParams) => 6 * n * n - 2 * h * h + 4 * h * n;

function drillSvg(p: DrillParams): string {
  const { n, h } = p;
  const F = frame(boxCorners(n, n, n), 200, 22);
  const lo = (n - h) / 2;
  const hi = (n + h) / 2;
  const P = (x: number, y: number, z: number) => F.at(iso([x, y, z]));
  // The hole opens on the front face x = n and runs back along x.
  const hole = [P(n, lo, lo), P(n, hi, lo), P(n, hi, hi), P(n, lo, hi)];
  const exit = [P(0, lo, lo), P(0, hi, lo), P(0, hi, hi), P(0, lo, hi)];
  const face = [P(n, 0, 0), P(n, n, 0), P(n, n, n), P(n, 0, n)];
  return svg(F.height, 'A cube with a square hole straight through it from front to back', [
    shadeD(`${poly(face)} ${poly(hole)}`),
    ...boxParts(n, n, n, F, false),
    outline(hole),
    ...exit.map((q, i) => seg(q, exit[(i + 1) % 4], true)),
    ...hole.map((q, i) => seg(q, exit[i], true)),
    txt(mid(P(n, 0, 0), P(n, n, 0)), `${n}`, 6, 12, 'start'),
    txt(mid(hole[3], hole[2]), `${h}`, 0, -10),
  ]);
}

const cmDrilledCube: Generator<DrillParams> = {
  id: 'cm-drilled-cube',
  sample(rng, difficulty) {
    const n = rng.int(4, 15);
    return { n, h: rng.int(Math.ceil(n / 4), n - 2), surface: difficulty >= 2 };
  },
  render(p) {
    return typed(
      [
        say(`A solid cube of edge $${p.n}$ has a square hole of side $${p.h}$ cut straight through it, from the middle of one face to the middle of the opposite face, with its sides parallel to the cube’s edges.`),
        { kind: 'diagram', svg: drillSvg(p) },
        say(p.surface ? 'What is the surface area of what is left, inside the hole included?' : 'What is the volume of what is left?'),
      ],
      p.surface ? drillSurface(p) : drillVolume(p),
      p.surface ? '\\text{area} =' : '\\text{volume} =',
    );
  },
  choices(p) {
    const { n, h } = p;
    if (p.surface) return numberOptions(drillSurface(p), [6 * n * n - 2 * h * h, 6 * n * n + 4 * h * n, 6 * n * n - h * h + 4 * h * n], 1, 1);
    return numberOptions(drillVolume(p), [n * n * n - h * h, n * n * n - h * h * h, n * n * n - 2 * h * h * n], 1, 1);
  },
  solution(p) {
    const { n, h } = p;
    if (p.surface) {
      return [
        { text: `Two faces each lose a $${h} \\times ${h}$ opening, and the tunnel adds four inside walls, each $${h}$ by $${n}$:` },
        { tex: `6 \\times ${n}^2 - 2 \\times ${h}^2 + 4 \\times ${h} \\times ${n}` },
        { tex: `= ${6 * n * n} - ${2 * h * h} + ${4 * h * n} = ${drillSurface(p)}` },
      ];
    }
    return [
      { text: 'The hole is a square prism running the whole length of the cube:' },
      { tex: `${h}^2 \\times ${n} = ${h * h * n}` },
      { tex: `${n}^3 - ${h * h * n} = ${drillVolume(p)}` },
    ];
  },
};

export const contestCompositeGenerators = [
  cmGardenPath,
  cmOverlapSquares,
  cmArchArea,
  cmArchTiles,
  cmLeaf,
  cmArbelos,
  cmLune,
  cmLuneTable,
  cmIncircleRight,
  cmSemicircleSquare,
  cmEquilateralCircles,
  cmRingChord,
  cmPointInRectangle,
  cmTriangleBands,
  cmHexagonTable,
  cmSquareCevian,
  cmPaintedCube,
  cmPaintedTable,
  cmStackedCubes,
  cmDrilledCube,
];
