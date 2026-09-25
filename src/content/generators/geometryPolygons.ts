/**
 * Geometry, level 2: Polygons.
 *
 * Three lessons: the angle sum of a polygon, split into triangles from one
 * corner; exterior angles, which add up to 360° for any polygon, and the
 * angles of a regular polygon; and regular polygons meeting round a point
 * (the owner's first inspiration screenshot: three hexagons at 120° each).
 *
 * Every figure is drawn to its own angles and labels the ones the question
 * needs, with the unknown in the accent colour as `x`. Figures come from
 * `geometryKit.ts`.
 */
import type { ChoiceOption, Generator, Slide } from '../types';
import { num, numberBank, numberOptions, say, typed } from './contestMath';
import {
  type Pt,
  DASHED,
  SVG_CLOSE,
  angle,
  centroid,
  choiceSlide,
  cornerAngle,
  deg,
  fit,
  heading,
  outline,
  polygonFromAngles,
  seg,
  svgOpen,
  text,
  toward,
} from './geometryKit';

const diagram = (svg: string) => ({ kind: 'diagram' as const, svg });
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const others = <T>(xs: T[], skip: number[]) => xs.filter((_, i) => !skip.includes(i));

/** Each exterior angle of a regular polygon with `n` sides. */
const extOf = (n: number) => 360 / n;
/** Each interior angle of a regular polygon with `n` sides. */
const intOf = (n: number) => 180 - 360 / n;

/** Side counts whose regular polygon has whole-degree angles, up to 36 sides. */
const REGULAR = [3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36];
const REGULAR_BIG = [8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90];

const NAMES: Record<number, string> = {
  3: 'equilateral triangle',
  4: 'square',
  5: 'regular pentagon',
  6: 'regular hexagon',
  8: 'regular octagon',
};

/** A regular polygon named as the learner reads it: "regular hexagon", "regular 10-sided polygon". */
export const regularName = (n: number) => NAMES[n] ?? `regular ${n}-sided polygon`;

/* ================================================================
 * Figures
 * ================================================================ */

export interface Shape {
  /** Interior angles, corner by corner anticlockwise. */
  angles: number[];
  /** Lengths of all but the last two sides, which close the shape. */
  sides: number[];
}

/** Side lengths that close a polygon with these angles into a sensible shape. */
function sidesFor(rng: { int(a: number, b: number): number }, angles: number[]): number[] | undefined {
  for (let tries = 0; tries < 80; tries += 1) {
    const sides = angles.slice(0, angles.length - 2).map(() => rng.int(4, 8));
    const pts = polygonFromAngles(angles, sides);
    if (!pts) continue;
    // No side much shorter than the others, or two corners' labels crowd together.
    const lengths = pts.map((p, i) => Math.hypot(pts[(i + 1) % pts.length][0] - p[0], pts[(i + 1) % pts.length][1] - p[1]));
    if (Math.min(...lengths) >= 0.6 * Math.max(...lengths)) return sides;
  }
  return undefined;
}

/** A polygon with its interior angles labelled; `labels[i]` empty leaves corner i bare. */
export function polySvg(shape: Shape, labels: string[], unknown: number[] = []): string {
  const pts = fit(polygonFromAngles(shape.angles, shape.sides)!, 220, 160, 40, 20);
  const n = pts.length;
  const parts = [svgOpen(200, `A polygon with ${n} sides`), outline(pts)];
  pts.forEach((v, i) => {
    const square = shape.angles[i] === 90;
    if (!labels[i] && !square) return;
    parts.push(cornerAngle(pts[(i + n - 1) % n], v, pts[(i + 1) % n], labels[i] ?? '', { unknown: unknown.includes(i), square }));
  });
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** A polygon split into triangles by the diagonals from its first corner. */
export function splitSvg(shape: Shape): string {
  const pts = fit(polygonFromAngles(shape.angles, shape.sides)!, 220, 150, 40, 15);
  const parts = [svgOpen(180, `A polygon with ${pts.length} sides split into triangles`), outline(pts)];
  for (let i = 2; i < pts.length - 1; i += 1) parts.push(seg(pts[0], pts[i], DASHED));
  for (let i = 1; i < pts.length - 1; i += 1) parts.push(text(centroid([pts[0], pts[i], pts[i + 1]]), String(i), 13));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** A polygon with each side run on past its corner and the exterior angle there labelled. */
export function extSvg(shape: Shape, labels: string[], unknown = -1): string {
  const pts = fit(polygonFromAngles(shape.angles, shape.sides)!, 170, 120, 65, 50);
  const n = pts.length;
  const parts = [svgOpen(220, `A polygon with ${n} sides and its exterior angles`), outline(pts)];
  pts.forEach((v, i) => {
    const h = heading(pts[(i + n - 1) % n], v);
    parts.push(seg(v, toward(v, h, 42), DASHED));
    parts.push(angle(v, h, 180 - shape.angles[i], labels[i], { unknown: i === unknown, r: 18 }));
  });
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/**
 * A regular polygon with its bottom side run on to the right, so the interior
 * and exterior angles sit side by side at the bottom-right corner.
 */
export function regularSvg(n: number, o: { ext?: string; int?: string; unknown?: 'ext' | 'int' } = {}): string {
  const c: Pt = [140, 102];
  const R = n <= 4 ? 78 : 84;
  const rot = 270 - 180 / n;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i += 1) pts.push(toward(c, rot + (360 * i) / n, R));
  const [v0, v1, v2] = pts;
  const parts = [svgOpen(200, `A regular polygon with ${n} sides`), outline(pts), seg(v1, toward(v1, 0, 62), DASHED)];
  if (o.int) parts.push(cornerAngle(v0, v1, v2, o.int, { unknown: o.unknown === 'int', r: 17 }));
  if (o.ext) parts.push(angle(v1, 0, extOf(n), o.ext, { unknown: o.unknown === 'ext', r: 28 }));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/**
 * Regular polygons sharing one corner, laid round it anticlockwise from
 * `start`, and the gap left over marked `x` when they do not close. `mode`
 * labels each shape's angle at the point, or writes its number of sides in it.
 */
export function tileSvg(ns: number[], start: number, mode: 'angles' | 'sides'): string {
  const V: Pt = [150, 120];
  const parts = [svgOpen(240, 'Regular polygons meeting at a point')];
  const marks: string[] = [];
  let at = start;
  for (const [i, n] of ns.entries()) {
    const s = Math.min(54, 108 * Math.sin(Math.PI / n));
    const pts: Pt[] = [V];
    for (let k = 0; k < n - 1; k += 1) pts.push(toward(pts[k], at + k * extOf(n), s));
    parts.push(outline(pts));
    // Neighbouring wedges alternate in size, so they read as separate angles.
    if (mode === 'angles') marks.push(angle(V, at, intOf(n), deg(intOf(n)), { r: i % 2 ? 20 : 13, R: 34 }));
    else marks.push(text(centroid(pts), String(n), 14));
    at += intOf(n);
  }
  const used = total(ns.map(intOf));
  if (used < 360) marks.push(angle(V, at, 360 - used, 'x', { unknown: true, r: 26 }));
  parts.push(...marks, SVG_CLOSE);
  return parts.join('');
}

/* ================================================================
 * Lesson 1: Angles in Polygons
 * ================================================================ */

/* ---------- the angle sum, in a table ---------- */

interface SumTableParams {
  /** Side counts, one row each. */
  ns: number[];
  /** The last row gives the angle sum and asks for the sides. */
  back: boolean;
}

const sumOf = (n: number) => (n - 2) * 180;

const geoPolySum: Generator<SumTableParams> = {
  id: 'geo-poly-sum',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const ns = rng.sample([5, 6, 7, 8, 9, 10, 11, 12], 2).sort((a, b) => a - b);
        const last = rng.int(7, 20);
        if (ns.includes(last)) continue;
        const answers = [...ns.flatMap((n) => [n - 2, sumOf(n)]), last, last - 2];
        if (new Set(answers).size < answers.length) continue;
        return { ns: [...ns, last], back: true };
      }
      return { ns: rng.sample([4, 5, 6, 7, 8, 9, 10], 3).sort((a, b) => a - b), back: false };
    }
  },
  render({ ns, back }): Slide {
    const rows = ns.map((n, i) => (back && i === ns.length - 1 ? [null, null, `${sumOf(n)}^{\\circ}`] : [String(n), null, null]));
    const answer = ns.flatMap((n, i) => (back && i === ns.length - 1 ? [n, n - 2] : [n - 2, sumOf(n)]));
    return {
      kind: 'table',
      prompt: [say(back ? 'Fill in the table. The last row starts from the angle sum.' : 'Fill in the number of triangles and the angle sum for each polygon.')],
      columns: ['\\text{Sides}', '\\text{Triangles}', '\\text{Angle sum}'],
      rows,
      bank: numberBank(answer, [...ns.map((n) => n * 180), ...ns.map((n) => sumOf(n) + 180), ...ns.map((n) => n - 1)], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution({ ns, back }) {
    return ns.flatMap((n, i) =>
      back && i === ns.length - 1
        ? [
            { text: `An angle sum of $${sumOf(n)}^\\circ$ is this many triangles:` },
            { tex: `${sumOf(n)} \\div 180 = ${n - 2}` },
            { text: 'There are always two more sides than triangles:' },
            { tex: `${n - 2} + 2 = ${n}` },
          ]
        : [{ text: `${n} sides make $${n} - 2 = ${n - 2}$ triangles:` }, { tex: `${n - 2} \\times 180 = ${sumOf(n)}` }],
    );
  },
};

/* ---------- a missing angle in a quadrilateral ---------- */

interface MissingParams extends Shape {
  /** The corners marked x: one, or two equal ones. */
  ask: number[];
}

/** Interior angles for a convex polygon of `n` corners, each in [lo, hi] and a multiple of `step`. */
function convexAngles(rng: { int(a: number, b: number): number }, n: number, lo: number, hi: number, step: number): number[] {
  for (;;) {
    const angles: number[] = [];
    for (let i = 0; i < n - 1; i += 1) angles.push(rng.int(lo / step, hi / step) * step);
    const last = sumOf(n) - total(angles);
    if (last < lo || last > hi) continue;
    angles.push(last);
    return angles;
  }
}

function sampleMissing(rng: Parameters<Generator<unknown>['sample']>[0], n: number, twin: boolean, step: number): MissingParams {
  for (;;) {
    let angles: number[];
    let ask: number[];
    if (twin) {
      const x = rng.int(60 / step, 140 / step) * step;
      const a = rng.int(55 / step, 150 / step) * step;
      const b = sumOf(n) - 2 * x - a;
      if (b < 55 || b > 150 || a === x || b === x) continue;
      const i = rng.int(0, 3);
      const j = (i + rng.pick([1, 2])) % 4;
      angles = [0, 0, 0, 0];
      angles[i] = x;
      angles[j] = x;
      const rest = [0, 1, 2, 3].filter((k) => k !== i && k !== j);
      angles[rest[0]] = a;
      angles[rest[1]] = b;
      ask = [i, j].sort((p, q) => p - q);
    } else {
      angles = convexAngles(rng, n, n === 4 ? 55 : 80, n === 4 ? 150 : 165, step);
      ask = [rng.int(0, n - 1)];
    }
    if (angles.some((a) => a === 180)) continue;
    const sides = sidesFor(rng, angles);
    if (sides) return { angles, sides, ask };
  }
}

function missingSvg(p: MissingParams): string {
  return polySvg(
    p,
    p.angles.map((a, i) => (p.ask.includes(i) ? 'x' : a === 90 ? '' : deg(a))),
    p.ask,
  );
}

function missingSolution(p: MissingParams) {
  const n = p.angles.length;
  const known = others(p.angles, p.ask);
  const s = total(known);
  const x = p.angles[p.ask[0]];
  const name = n === 4 ? 'a quadrilateral' : n === 5 ? 'a pentagon' : 'a hexagon';
  const steps = [
    { text: `The angles in ${name} add up to $${sumOf(n)}^\\circ$. Add the ones you know:` },
    { tex: `${known.join(' + ')} = ${s}` },
  ];
  if (p.ask.length === 2) {
    return [...steps, { text: 'The two angles marked $x$ share what is left:' }, { tex: `2x = ${sumOf(n)} - ${s} = ${sumOf(n) - s}` }, { tex: `x = ${sumOf(n) - s} \\div 2 = ${x}` }];
  }
  return [...steps, { tex: `x = ${sumOf(n)} - ${s} = ${x}` }];
}

const geoQuadMissing: Generator<MissingParams> = {
  id: 'geo-quad-missing',
  sample(rng, difficulty) {
    return sampleMissing(rng, 4, difficulty >= 2, 5);
  },
  render(p) {
    return typed([diagram(missingSvg(p)), say('Find $x$.')], p.angles[p.ask[0]], 'x =');
  },
  choices(p) {
    const s = total(others(p.angles, p.ask));
    const x = p.angles[p.ask[0]];
    return numberOptions(x, [360 - s, 180 - s / 3, 540 - s, (180 - s + 360) / 2, x + 10], 5, 1);
  },
  solution: missingSolution,
};

/* ---------- a missing angle in a pentagon or hexagon ---------- */

const geoPolyMissing: Generator<MissingParams> = {
  id: 'geo-poly-missing',
  sample(rng, difficulty) {
    return sampleMissing(rng, difficulty >= 2 ? 6 : 5, false, difficulty >= 2 ? 1 : 5);
  },
  render(p) {
    return typed([diagram(missingSvg(p)), say('Find $x$.')], p.angles[p.ask[0]], 'x =');
  },
  choices(p) {
    const n = p.angles.length;
    const s = total(others(p.angles, p.ask));
    const x = p.angles[p.ask[0]];
    return numberOptions(x, [sumOf(n) - 180 - s, sumOf(n) + 180 - s, 360 - s + 180 * (n - 3), x + 10], 5, 1);
  },
  solution: missingSolution,
};

/* ---------- sides from the angle sum ---------- */

interface CountParams {
  n: number;
}

const geoPolyCount: Generator<CountParams> = {
  id: 'geo-poly-count',
  sample(rng, difficulty) {
    return { n: difficulty >= 2 ? rng.int(7, 40) : rng.int(5, 30) };
  },
  render({ n }) {
    return typed([say(`The angles inside a polygon add up to $${sumOf(n)}^\\circ$. How many sides does it have?`)], n, '\\text{sides} =');
  },
  choices({ n }) {
    return numberOptions(n, [n - 2, n + 2, n - 1], 1, 3);
  },
  solution({ n }) {
    return [
      { text: 'Each triangle is $180^\\circ$, so count the triangles:' },
      { tex: `${sumOf(n)} \\div 180 = ${n - 2}` },
      { text: 'A polygon has two more sides than triangles:' },
      { tex: `${n - 2} + 2 = ${n}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Exterior and Interior Angles
 * ================================================================ */

/* ---------- exterior angles add up to 360 ---------- */

interface ExtParams extends Shape {
  ask: number;
}

const geoExtSum: Generator<ExtParams> = {
  id: 'geo-ext-sum',
  sample(rng, difficulty) {
    const n = difficulty >= 2 ? rng.pick([5, 6]) : rng.pick([4, 5]);
    const step = difficulty >= 2 ? 1 : 5;
    for (;;) {
      // Exterior angles of 30 to 110 degrees keep every corner open enough to label.
      const angles = convexAngles(rng, n, 70, 150, step);
      const sides = sidesFor(rng, angles);
      if (sides) return { angles, sides, ask: rng.int(0, n - 1) };
    }
  },
  render(p) {
    const ext = p.angles.map((a) => 180 - a);
    return typed([diagram(extSvg(p, ext.map(deg), p.ask)), say('These are the exterior angles of the shape. Find $x$.')], ext[p.ask], 'x =');
  },
  choices(p) {
    const ext = p.angles.map((a) => 180 - a);
    const s = total(others(ext, [p.ask]));
    return numberOptions(ext[p.ask], [180 - ext[p.ask], sumOf(p.angles.length) - s, 180 - s + 180, ext[p.ask] + 10], 5, 1);
  },
  solution(p) {
    const ext = p.angles.map((a) => 180 - a);
    const known = others(ext, [p.ask]);
    const s = total(known);
    return [
      { text: 'The exterior angles of any polygon add up to $360^\\circ$. Add the ones you know:' },
      { tex: `${known.join(' + ')} = ${s}` },
      { tex: `x = 360 - ${s} = ${ext[p.ask]}` },
    ];
  },
};

/* ---------- a regular polygon's angles ---------- */

interface RegParams {
  n: number;
  ask: 'ext' | 'int';
}

function regPrompt({ n, ask }: RegParams, question: string) {
  const which = ask === 'ext' ? 'exterior' : 'interior';
  if (n <= 12) {
    return [
      diagram(regularSvg(n, ask === 'ext' ? { ext: 'x', unknown: 'ext' } : { int: 'x', unknown: 'int' })),
      say(`A regular polygon with ${n} sides. ${question.replace('WHICH', which)}`),
    ];
  }
  return [say(`A regular polygon has ${n} sides. ${question.replace('WHICH', which)}`)];
}

const geoRegAngle: Generator<RegParams> = {
  id: 'geo-reg-angle',
  sample(rng, difficulty) {
    return { n: rng.pick(difficulty >= 2 ? REGULAR_BIG : REGULAR), ask: rng.pick(['ext', 'int'] as const) };
  },
  render(p) {
    return typed(regPrompt(p, 'Find the WHICH angle $x$.'), p.ask === 'ext' ? extOf(p.n) : intOf(p.n), 'x =');
  },
  choices({ n, ask }) {
    if (ask === 'ext') return numberOptions(extOf(n), [intOf(n), 180 / n, 360 / (n - 1), 360 / (n + 1)], 1, 1);
    return numberOptions(intOf(n), [extOf(n), 180 - 180 / n, sumOf(n) / (n + 1), intOf(n) + 10], 1, 1);
  },
  solution({ n, ask }) {
    const steps = [{ text: `The ${n} exterior angles are equal and add up to $360^\\circ$:` }, { tex: `${ask === 'ext' ? 'x' : '\\text{exterior}'} = 360 \\div ${n} = ${extOf(n)}` }];
    if (ask === 'ext') return steps;
    return [...steps, { text: 'An interior and an exterior angle make a straight line:' }, { tex: `x = 180 - ${extOf(n)} = ${intOf(n)}` }];
  },
};

/* ---------- sides from an angle ---------- */

interface RegSidesParams {
  n: number;
  given: 'ext' | 'int';
}

const geoRegSides: Generator<RegSidesParams> = {
  id: 'geo-reg-sides',
  sample(rng, difficulty) {
    return { n: rng.pick(difficulty >= 2 ? REGULAR_BIG : REGULAR), given: rng.pick(['ext', 'int'] as const) };
  },
  render({ n, given }) {
    const value = given === 'ext' ? extOf(n) : intOf(n);
    return typed(
      [say(`Each ${given === 'ext' ? 'exterior' : 'interior'} angle of a regular polygon is $${value}^\\circ$. How many sides does it have?`)],
      n,
      '\\text{sides} =',
    );
  },
  choices({ n, given }) {
    const e = extOf(n);
    return numberOptions(n, given === 'int' ? [intOf(n) / 10, 180 / e, n + 2, n - 2] : [e, 180 / e, n + 2, n * 2], 1, 3);
  },
  solution({ n, given }) {
    const e = extOf(n);
    const first = given === 'int' ? [{ text: 'First the exterior angle, from the straight line:' }, { tex: `180 - ${intOf(n)} = ${e}` }] : [];
    return [...first, { text: 'The exterior angles add up to $360^\\circ$, so count how many fit:' }, { tex: `360 \\div ${e} = ${n}` }];
  },
};

/* ---------- a table of regular polygons ---------- */

type Cell = 'n' | 'ext' | 'int';

interface RegTableParams {
  ns: number[];
  given: Cell[];
}

const cellValue = (n: number, c: Cell) => (c === 'n' ? n : c === 'ext' ? extOf(n) : intOf(n));

const geoRegTable: Generator<RegTableParams> = {
  id: 'geo-reg-table',
  sample(rng, difficulty) {
    for (;;) {
      const ns = rng.sample(REGULAR, 3).sort((a, b) => a - b);
      const given: Cell[] = difficulty >= 2 ? ns.map(() => rng.pick(['n', 'ext', 'int'] as const)) : ['n', 'n', 'n'];
      if (difficulty >= 2 && given.every((c) => c === 'n')) continue;
      const answers = ns.flatMap((n, i) => (['n', 'ext', 'int'] as Cell[]).filter((c) => c !== given[i]).map((c) => cellValue(n, c)));
      if (new Set(answers).size < answers.length) continue;
      return { ns, given };
    }
  },
  render({ ns, given }): Slide {
    const cells: Cell[] = ['n', 'ext', 'int'];
    const rows = ns.map((n, i) => cells.map((c) => (c !== given[i] ? null : c === 'n' ? String(n) : `${cellValue(n, c)}^{\\circ}`)));
    const answer = ns.flatMap((n, i) => cells.filter((c) => c !== given[i]).map((c) => cellValue(n, c)));
    const slips = ns.flatMap((n) => [180 / n, sumOf(n), n + 1]).filter(Number.isInteger);
    return {
      kind: 'table',
      prompt: [say('Fill in the table for these regular polygons.')],
      columns: ['\\text{Sides}', '\\text{Exterior}', '\\text{Interior}'],
      rows,
      bank: numberBank(answer, slips, 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution({ ns, given }) {
    return ns.flatMap((n, i) => {
      const e = extOf(n);
      if (given[i] === 'n') return [{ text: `${n} sides:` }, { tex: `360 \\div ${n} = ${e} \\qquad 180 - ${e} = ${intOf(n)}` }];
      if (given[i] === 'ext') return [{ text: `An exterior angle of $${e}^\\circ$:` }, { tex: `360 \\div ${e} = ${n} \\qquad 180 - ${e} = ${intOf(n)}` }];
      return [{ text: `An interior angle of $${intOf(n)}^\\circ$:` }, { tex: `180 - ${intOf(n)} = ${e} \\qquad 360 \\div ${e} = ${n}` }];
    });
  },
};

/* ================================================================
 * Lesson 3: Polygon Angle Relationships
 * ================================================================ */

/* ---------- which shapes fit round a point ---------- */

interface FitParams {
  right: number[];
  wrong: number[][];
}

const FIT_RIGHT = [[4, 8, 8], [3, 12, 12], [3, 3, 6, 6], [3, 3, 3, 4, 4], [3, 4, 4, 6], [5, 5, 10]];
const FIT_WRONG = [[4, 6, 6], [3, 8, 8], [5, 5, 5], [4, 4, 5], [5, 6, 6], [3, 6, 6], [4, 10, 10], [6, 8, 8], [3, 4, 4, 4]];

const SHORT: Record<number, [string, string]> = {
  3: ['equilateral triangle', 'equilateral triangles'],
  4: ['square', 'squares'],
  5: ['pentagon', 'pentagons'],
  6: ['hexagon', 'hexagons'],
  8: ['octagon', 'octagons'],
  10: ['10-sided polygon', '10-sided polygons'],
  12: ['12-sided polygon', '12-sided polygons'],
};

const COUNT = ['', 'one', 'two', 'three', 'four', 'five', 'six'];

/** A set of regular polygons in words: "one square and two octagons". */
function describe(ns: number[]): string {
  const kinds = [...new Set(ns)];
  const parts = kinds.map((n) => {
    const k = ns.filter((m) => m === n).length;
    return `${COUNT[k]} ${SHORT[n][k === 1 ? 0 : 1]}`;
  });
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const geoTileFit: Generator<FitParams> = {
  id: 'geo-tile-fit',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { right: rng.pick(FIT_RIGHT), wrong: rng.sample(FIT_WRONG, 3) };
    return { right: [rng.pick([3, 4, 6])], wrong: rng.sample([5, 8, 9, 10, 12, 15, 18, 20], 3).map((n) => [n]) };
  },
  render({ right, wrong }) {
    if (right.length === 1) {
      const opts: ChoiceOption[] = [right, ...wrong].map(([n], i) => ({ tex: cap(regularName(n)), correct: i === 0 || undefined }));
      return choiceSlide([say('Copies of which regular polygon fit round a point with no gap?')], opts, false);
    }
    const opts: ChoiceOption[] = [right, ...wrong].map((ns, i) => ({ tex: cap(describe(ns)), correct: i === 0 || undefined }));
    return choiceSlide([say('All the polygons are regular. Which set fits round a point with no gap?')], opts, false);
  },
  solution({ right, wrong }) {
    if (right.length === 1) {
      const n = right[0];
      const w = wrong[0][0];
      return [
        { text: 'Shapes fit round a point when their angles there add up to exactly $360^\\circ$.' },
        { text: `Each angle of the ${regularName(n)} is $${intOf(n)}^\\circ$, and a whole number of them makes $360^\\circ$:` },
        { tex: `360 \\div ${intOf(n)} = ${360 / intOf(n)}` },
        { text: `A ${regularName(w)} has angles of $${intOf(w)}^\\circ$, and $360 \\div ${intOf(w)}$ is not a whole number, so it leaves a gap.` },
      ];
    }
    return [
      { text: 'Add the angle of each shape at the point. The set that fits makes exactly $360^\\circ$:' },
      { tex: `${right.map(intOf).join(' + ')} = 360` },
      ...wrong.slice(0, 1).map((ns) => ({ text: `${cap(describe(ns))} make $${total(ns.map(intOf))}^\\circ$, which is not $360^\\circ$.` })),
    ];
  },
};

/* ---------- the gap left at a point ---------- */

interface GapParams {
  ns: number[];
  start: number;
}

const GAP_SHAPES = [3, 4, 5, 6, 8, 10, 12];

const geoTileGap: Generator<GapParams> = {
  id: 'geo-tile-gap',
  sample(rng, difficulty) {
    for (;;) {
      const ns = difficulty >= 2 ? [rng.pick(GAP_SHAPES), rng.pick(GAP_SHAPES), rng.pick(GAP_SHAPES)] : [rng.pick(GAP_SHAPES), rng.pick(GAP_SHAPES)];
      const gap = 360 - total(ns.map(intOf));
      if (gap < 24 || gap === 180) continue;
      return { ns, start: rng.pick([0, 15, 30, 200, 215]) };
    }
  },
  render({ ns, start }) {
    const gap = 360 - total(ns.map(intOf));
    if (ns.length === 2) return typed([diagram(tileSvg(ns, start, 'angles')), say('Regular polygons meet at a point. Find the gap $x$.')], gap, 'x =');
    return typed(
      [diagram(tileSvg(ns, start, 'sides')), say('Regular polygons meet at a point. The number in each is how many sides it has. Find the gap $x$.')],
      gap,
      'x =',
    );
  },
  choices({ ns }) {
    const used = total(ns.map(intOf));
    return numberOptions(360 - used, [used, 180 - (360 - used), 360 - intOf(ns[0]), 360 - used + 10], 1, 1);
  },
  solution({ ns }) {
    const angles = ns.map(intOf);
    const used = total(angles);
    const first =
      ns.length === 2
        ? []
        : [
            { text: 'First each angle, from its exterior angle:' },
            ...[...new Set(ns)].map((n) => ({ tex: `${n}\\text{ sides:} \\quad 180 - 360 \\div ${n} = ${intOf(n)}` })),
          ];
    return [
      ...first,
      { text: 'The angles round the point add up to $360^\\circ$:' },
      { tex: `${angles.join(' + ')} = ${used}` },
      { tex: `x = 360 - ${used} = ${360 - used}` },
    ];
  },
};

/* ---------- interior and exterior together ---------- */

interface RatioParams {
  form: 'times' | 'more';
  /** Interior is k times the exterior, or k degrees more. */
  k: number;
}

const TIMES = [1, 2, 3, 4, 5, 8, 9, 11, 14, 17];
const MORE_EXT = [3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72];

const ratioExt = ({ form, k }: RatioParams) => (form === 'times' ? 180 / (k + 1) : (180 - k) / 2);

const geoRegRatio: Generator<RatioParams> = {
  id: 'geo-reg-ratio',
  sample(rng) {
    if (rng.int(0, 27) < 10) return { form: 'times', k: rng.pick(TIMES) };
    return { form: 'more', k: 180 - 2 * rng.pick(MORE_EXT) };
  },
  render(p): Slide {
    const e = ratioExt(p);
    const n = 360 / e;
    const stem =
      p.form === 'times'
        ? `Each interior angle of a regular polygon is ${p.k === 1 ? 'equal to' : `${p.k} times`} its exterior angle.`
        : `Each interior angle of a regular polygon is $${p.k}^\\circ$ more than its exterior angle.`;
    const slips = [180 - e, 2 * e, n / 2, n + 2, p.form === 'times' ? 180 / p.k : 180 - p.k].filter((v) => Number.isInteger(v));
    return {
      kind: 'tiles',
      prompt: [say(`${stem} Find the exterior angle, then the number of sides.`)],
      template: '\\text{exterior} = {0}^{\\circ} \\qquad \\text{sides} = {1}',
      bank: numberBank([e, n], slips, 3, 1, 1),
      answer: [num(e), num(n)],
    };
  },
  solution(p) {
    const e = ratioExt(p);
    const n = 360 / e;
    const setUp =
      p.form === 'times'
        ? [
            { text: `Call the exterior angle $x$, so the interior is ${p.k === 1 ? '$x$' : `$${p.k}x$`}. Together they make $180^\\circ$:` },
            { tex: `x + ${p.k === 1 ? 'x' : `${p.k}x`} = 180` },
            { tex: `${p.k + 1}x = 180` },
            { tex: `x = 180 \\div ${p.k + 1} = ${e}` },
          ]
        : [
            { text: `Call the exterior angle $x$, so the interior is $x + ${p.k}$. Together they make $180^\\circ$:` },
            { tex: `x + x + ${p.k} = 180` },
            { tex: `2x = ${180 - p.k}` },
            { tex: `x = ${180 - p.k} \\div 2 = ${e}` },
          ];
    return [...setUp, { text: 'Then the sides:' }, { tex: `360 \\div ${e} = ${n}` }];
  },
};

export const geometryPolygonsGenerators = [
  geoPolySum,
  geoQuadMissing,
  geoPolyMissing,
  geoPolyCount,
  geoExtSum,
  geoRegAngle,
  geoRegSides,
  geoRegTable,
  geoTileFit,
  geoTileGap,
  geoRegRatio,
];
