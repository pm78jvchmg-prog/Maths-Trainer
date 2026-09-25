/**
 * Geometry, level 5: Areas.
 *
 * Area as squares counted on a grid, rectangles and shapes made of them;
 * triangles, parallelograms and trapezia from a base and a perpendicular
 * height; circles, semicircles and sectors in terms of $\pi$; and how area
 * scales, by the square of the length scale factor. Every figure is drawn to
 * its own lengths, labels each one the question needs, and marks a height
 * with a dashed line and a right-angle square.
 */
import type { ChoiceOption, Generator, Slide } from '../types';
import { num, numberBank, numberOptions, say, typed } from './contestMath';
import { type Pt, DASHED, SVG_CLOSE, centroid, choiceSlide, cornerAngle, f1, fit, labelHalf, outline, seg, sideLabel, sideLabelAt, svgOpen, text } from './geometryKit';
import { PI_KEYS, circleSvg, partCircleSvg, piAns, piOptions, piTex, rectSvg, sectorSvg } from './geometryLengths';

const diagram = (svg: string) => ({ kind: 'diagram' as const, svg });
const cm = (v: number) => `${num(v)} cm`;
/** A number of square centimetres in TeX, kept on one line with its unit. */
const cm2 = (v: number) => `${num(v)}\\text{ cm}^2`;

type Rng = Parameters<Generator<unknown>['sample']>[0];

/* ================================================================
 * Figures
 * ================================================================ */

/** A dashed height from `top` down to `foot` on the base line, with its right-angle square. */
function heightMark(top: Pt, foot: Pt, towards: 1 | -1): string {
  const s = 9;
  const q: Pt = [foot[0] + towards * s, foot[1]];
  const c: Pt = [foot[0] + towards * s, foot[1] - s];
  const p: Pt = [foot[0], foot[1] - s];
  return (
    seg(top, foot, DASHED) +
    `<path d="M ${f1(q[0])} ${f1(q[1])} L ${f1(c[0])} ${f1(c[1])} L ${f1(p[0])} ${f1(p[1])}" fill="none" stroke="currentColor" stroke-width="1.5" />`
  );
}

export interface TriShape {
  b: number;
  h: number;
  /** Where the apex sits above the base, measured from the base's left end; outside [0, b] for an obtuse triangle. */
  p: number;
}

/** A triangle on its base with its perpendicular height dashed in. */
export function triHeightSvg({ b, h, p }: TriShape, baseLabel: string, heightText: string): string {
  const raw: Pt[] = [[0, 0], [b, 0], [p, -h]];
  // 50 clear either side, room for a height label outside the triangle.
  const pts = fit([...raw, [Math.min(0, p), 0], [Math.max(b, p), 0]], 200, 140, 50, 22).slice(0, 3);
  const [A, B, C] = pts;
  const foot: Pt = [C[0], A[1]];
  const inside = centroid(pts);
  const parts = [svgOpen(195, 'A triangle with its height'), outline(pts)];
  // An apex beyond the base needs the base run on, dashed, to meet the height.
  if (foot[0] < A[0]) parts.push(seg(foot, A, DASHED));
  if (foot[0] > B[0]) parts.push(seg(B, foot, DASHED));
  if (Math.abs(foot[0] - A[0]) > 1) parts.push(heightMark(C, foot, foot[0] < A[0] ? 1 : -1));
  // A height that is a side of the triangle still meets the base square.
  else parts.push(cornerAngle(B, A, C, '', { square: true }));
  const base: [Pt, string] = [sideLabelAt(A, B, baseLabel, inside, 14), baseLabel];
  parts.push(text(...base));
  if (Math.abs(foot[0] - A[0]) <= 1) parts.push(sideLabel(A, C, heightText, inside, 14));
  else {
    const run: [Pt, Pt][] = foot[0] < A[0] ? [[foot, A]] : foot[0] > B[0] ? [[B, foot]] : [];
    parts.push(heightLabel(pts, C, foot, heightText, run, [base]));
  }
  parts.push(SVG_CLOSE);
  return parts.join('');
}

export interface QuadShape {
  /** Bottom and top sides (equal for a parallelogram). */
  b: number;
  a: number;
  h: number;
  /** How far the top side's left end sits right of the bottom's. */
  off: number;
}

/** A parallelogram or trapezium on its base with a dashed height from its top-left corner. */
export function quadHeightSvg({ b, a, h, off }: QuadShape, labels: { bottom: string; top?: string; height: string; slant?: string }): string {
  const pts = fit([[0, 0], [b, 0], [off + a, -h], [off, -h]], 220, 130, 40, 25);
  const [P, Q, R, S] = pts;
  const inside = centroid(pts);
  const foot: Pt = [S[0], P[1]];
  // A top leaning past the end of the base has its height land beyond it, so
  // the base runs on, dashed, to meet it.
  const beyond = foot[0] > Q[0] + 1;
  const parts = [svgOpen(190, 'A four-sided shape with its height'), outline(pts)];
  if (beyond) parts.push(seg(Q, foot, DASHED));
  parts.push(heightMark(S, foot, beyond ? -1 : 1));
  const placed: [Pt, string][] = [[sideLabelAt(P, Q, labels.bottom, inside, 14), labels.bottom]];
  if (labels.top) placed.push([sideLabelAt(S, R, labels.top, inside, 14), labels.top]);
  // The sloping sides are equal; when the height crosses the right one, the left one carries the label.
  if (labels.slant) placed.push([beyond ? sideLabelAt(P, S, labels.slant, inside, 16) : sideLabelAt(Q, R, labels.slant, inside, 16), labels.slant]);
  for (const [at, value] of placed) parts.push(text(at, value));
  parts.push(heightLabel(pts, S, foot, labels.height, beyond ? [[Q, foot]] : [], placed));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** How close a line may come to the box a label takes up. */
const LABEL_CLEAR = 4;

/** Whether segment ab passes within LABEL_CLEAR of the box a label centred at `c` takes up. */
function crosses(c: Pt, value: string, a: Pt, b: Pt): boolean {
  const [hw, hh] = labelHalf(value);
  const steps = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
  for (let i = 0; i <= steps; i += 1) {
    const x = a[0] + ((b[0] - a[0]) * i) / steps;
    const y = a[1] + ((b[1] - a[1]) * i) / steps;
    if (Math.abs(x - c[0]) < hw + LABEL_CLEAR && Math.abs(y - c[1]) < hh + LABEL_CLEAR) return true;
  }
  return false;
}

/** Whether `p` lies inside the polygon `pts`. */
function inside(pts: Pt[], [x, y]: Pt): boolean {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Whether two labels, centred at `a` and `b`, come within LABEL_CLEAR of each other. */
function overlaps(a: Pt, av: string, b: Pt, bv: string): boolean {
  const [aw, ah] = labelHalf(av);
  const [bw, bh] = labelHalf(bv);
  return Math.abs(a[0] - b[0]) < aw + bw + LABEL_CLEAR && Math.abs(a[1] - b[1]) < ah + bh + LABEL_CLEAR;
}

/**
 * A dashed height's label: beside the line and as near the middle
 * of the height as it can be, clear of every line and label already drawn.
 * Inside the shape first; a narrow shape has no room there (a parallelogram's
 * label used to sit across its far side), so then outside, beside the height
 * on the side away from the shape. The figure is 300 wide.
 */
function heightLabel(pts: Pt[], top: Pt, foot: Pt, value: string, lines: [Pt, Pt][], labels: [Pt, string][]): string {
  const [hw] = labelHalf(value);
  const edges = [...pts.map((p, i): [Pt, Pt] => [p, pts[(i + 1) % pts.length]]), ...lines, [top, foot] as [Pt, Pt]];
  const at = (side: number, t: number): Pt => [top[0] + side * (hw + 7), top[1] + (foot[1] - top[1]) * t];
  const clear = (c: Pt) =>
    c[0] - hw > 2 && c[0] + hw < 298 && !edges.some(([a, b]) => crosses(c, value, a, b)) && !labels.some(([l, v]) => overlaps(c, value, l, v));
  // Where each line crosses the level y.
  const cuts = (y: number) =>
    edges.flatMap(([a, b]) => (a[1] === b[1] || (y - a[1]) * (y - b[1]) > 0 ? [] : [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1])]));
  // A side of the shape between a label and the height makes it read as that side's length.
  const shielded = (c: Pt) => cuts(c[1]).some((x) => (x - c[0]) * (x - top[0]) < -1);
  const away = top[0] < centroid(pts)[0] ? -1 : 1;
  for (const wantInside of [true, false]) {
    for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
      for (const side of [away, -away]) {
        const c = at(side, t);
        if (inside(pts, c) === wantInside && clear(c) && !shielded(c)) return text(c, value);
      }
    }
  }
  // Too narrow for any of those: the label goes out past the shape on the
  // free side, joined to the height by a thin leader, so it is never read as
  // the length of the side it sits beside.
  const y = (top[1] + foot[1]) / 2;
  const [, hh] = labelHalf(value);
  const xs = [y - hh, y, y + hh].flatMap(cuts);
  for (const side of [away, -away]) {
    const edge = side > 0 ? Math.max(...xs) : Math.min(...xs);
    const c: Pt = [edge + side * (hw + 12), y];
    if (c[0] - hw < 2 || c[0] + hw > 298) continue;
    const end: Pt = [c[0] - side * (hw + 3), y];
    return `<line x1="${f1(top[0])}" y1="${f1(y)}" x2="${f1(end[0])}" y2="${f1(y)}" stroke="currentColor" stroke-width="1" opacity="0.7" />${text(c, value)}`;
  }
  return text(at(1, 0.5), value);
}

/** An L-shape split by a dashed line into two rectangles A and B, sides labelled. */
export function compoundSvg(W: number, H: number, a: number, b: number, labels: { W?: string; H: string; t?: string; r: string; a?: string }): string {
  const raw: Pt[] = [[0, 0], [W, 0], [W, -(H - b)], [W - a, -(H - b)], [W - a, -H], [0, -H]];
  const pts = fit(raw, 180, 140, 70, 25);
  const [p0, p1, p2, p3, p4, p5] = pts;
  const inside = centroid([p0, p1, p5]);
  const parts = [svgOpen(195, 'An L-shape split into two rectangles'), outline(pts), seg(p3, [p3[0], p0[1]], DASHED)];
  parts.push(text(centroid([p0, [p3[0], p0[1]], p4, p5]), 'A', 14), text(centroid([[p3[0], p0[1]], p1, p2, p3]), 'B', 14));
  if (labels.W) parts.push(sideLabel(p0, p1, labels.W, inside, 14));
  parts.push(sideLabel(p1, p2, labels.r, inside, 14));
  if (labels.a) parts.push(sideLabel(p2, p3, labels.a, p0, 12));
  if (labels.t) parts.push(sideLabel(p4, p5, labels.t, inside, 14));
  parts.push(sideLabel(p5, p0, labels.H, inside, 14));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/* ================================================================
 * Lesson 1: Reasoning About Area
 * ================================================================ */

/* ---------- counting squares ---------- */

interface Half {
  x: number;
  y: number;
  /** The cell edge the triangle stands on, and which way its slope runs. */
  edge: 'l' | 'r' | 't' | 'b';
  flip: boolean;
}

interface GridParams {
  cells: [number, number][];
  halves: Half[];
}

const GW = 8;
const GH = 5;
const key = (x: number, y: number) => `${x},${y}`;

function growShape(rng: Rng, n: number): [number, number][] {
  const out: [number, number][] = [[rng.int(2, 5), rng.int(1, 3)]];
  const taken = new Set([key(...out[0])]);
  while (out.length < n) {
    const [x, y] = rng.pick(out);
    const [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]);
    const c: [number, number] = [x + dx, y + dy];
    if (c[0] < 0 || c[0] >= GW || c[1] < 0 || c[1] >= GH || taken.has(key(...c))) continue;
    taken.add(key(...c));
    out.push(c);
  }
  return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

const gridArea = ({ cells, halves }: GridParams) => cells.length + halves.length / 2;

export function gridSvg({ cells, halves }: GridParams): string {
  const u = 32;
  const x0 = (300 - GW * u) / 2;
  const y0 = 10;
  const at = (x: number, y: number): Pt => [x0 + x * u, y0 + y * u];
  const parts = [svgOpen(GH * u + 20, 'A shape on a grid of squares')];
  for (const [x, y] of cells) {
    const [px, py] = at(x, y);
    parts.push(`<rect class="plot-shade" x="${px}" y="${py}" width="${u}" height="${u}" />`);
  }
  for (const h of halves) {
    const [px, py] = at(h.x, h.y);
    const c: Record<string, Pt> = { tl: [px, py], tr: [px + u, py], bl: [px, py + u], br: [px + u, py + u] };
    const corners: Record<Half['edge'], [string, string, string]> = {
      l: ['tl', 'bl', h.flip ? 'tr' : 'br'],
      r: ['tr', 'br', h.flip ? 'tl' : 'bl'],
      t: ['tl', 'tr', h.flip ? 'bl' : 'br'],
      b: ['bl', 'br', h.flip ? 'tl' : 'tr'],
    };
    const [p, q, r] = corners[h.edge].map((k) => c[k]);
    parts.push(`<path class="plot-shade" d="M ${p[0]} ${p[1]} L ${q[0]} ${q[1]} L ${r[0]} ${r[1]} Z" stroke="currentColor" stroke-width="1.5" />`);
  }
  for (let x = 0; x <= GW; x += 1) parts.push(`<line x1="${x0 + x * u}" y1="${y0}" x2="${x0 + x * u}" y2="${y0 + GH * u}" stroke="currentColor" stroke-width="1" opacity="0.3" />`);
  for (let y = 0; y <= GH; y += 1) parts.push(`<line x1="${x0}" y1="${y0 + y * u}" x2="${x0 + GW * u}" y2="${y0 + y * u}" stroke="currentColor" stroke-width="1" opacity="0.3" />`);
  parts.push(SVG_CLOSE);
  return parts.join('');
}

const geoAreaCount: Generator<GridParams> = {
  id: 'geo-area-count',
  sample(rng, difficulty) {
    if (difficulty < 2) return { cells: growShape(rng, rng.int(6, 14)), halves: [] };
    for (;;) {
      const cells = growShape(rng, rng.int(5, 11));
      const taken = new Set(cells.map(([x, y]) => key(x, y)));
      const halves: Half[] = [];
      const want = rng.int(2, 4);
      for (let tries = 0; tries < 60 && halves.length < want; tries += 1) {
        const [x, y] = rng.pick(cells);
        const [dx, dy, edge] = rng.pick([[1, 0, 'l'], [-1, 0, 'r'], [0, 1, 't'], [0, -1, 'b']] as [number, number, Half['edge']][]);
        const c: [number, number] = [x + dx, y + dy];
        if (c[0] < 0 || c[0] >= GW || c[1] < 0 || c[1] >= GH || taken.has(key(...c))) continue;
        taken.add(key(...c));
        halves.push({ x: c[0], y: c[1], edge, flip: rng.int(0, 1) === 1 });
      }
      if (halves.length >= 2) return { cells, halves };
    }
  },
  render(p) {
    return typed([diagram(gridSvg(p)), say('Each small square is $1\\text{ cm}^2$. Find the shaded area, in cm².')], gridArea(p), 'A =');
  },
  choices(p) {
    const A = gridArea(p);
    return numberOptions(A, [p.cells.length + p.halves.length, p.cells.length, A + 1, A - 1], 1, 1);
  },
  solution(p) {
    if (!p.halves.length) return [{ text: `Count the shaded squares: there are ${p.cells.length}, each $1\\text{ cm}^2$.` }, { tex: `A = ${p.cells.length}` }];
    return [
      { text: `There are ${p.cells.length} whole squares and ${p.halves.length} half squares. Two halves make one whole:` },
      { tex: `${p.halves.length} \\div 2 = ${num(p.halves.length / 2)}` },
      { tex: `A = ${p.cells.length} + ${num(p.halves.length / 2)} = ${num(gridArea(p))}` },
    ];
  },
};

/* ---------- rectangles ---------- */

interface RectParams {
  w: number;
  h: number;
  /** Ask the area (false) or a missing side from the area (true). */
  back: boolean;
}

const geoRectArea: Generator<RectParams> = {
  id: 'geo-rect-area',
  sample(rng, difficulty) {
    for (;;) {
      const w = rng.int(3, 15);
      const h = rng.int(2, 12);
      if (w === h) continue;
      return { w, h, back: difficulty >= 2 };
    }
  },
  render({ w, h, back }) {
    if (back) return typed([diagram(rectSvg(w, h, cm(w), 'x')), say(`The area is $${cm2(w * h)}$. Find $x$.`)], h, 'x =');
    return typed([diagram(rectSvg(w, h, cm(w), cm(h))), say('Find the area, in cm².')], w * h, 'A =');
  },
  choices({ w, h, back }) {
    if (back) return numberOptions(h, [w * h - w, (w * h) / 2, w], 1, 1);
    return numberOptions(w * h, [2 * (w + h), w + h, w * h + w], 1, 1);
  },
  solution({ w, h, back }) {
    if (back) return [{ text: 'Area is length times width, so divide the area by the side you know:' }, { tex: `x = ${w * h} \\div ${w} = ${h}` }];
    return [{ text: 'The area of a rectangle is length times width:' }, { tex: `A = ${w} \\times ${h} = ${w * h}` }];
  },
};

/* ---------- a shape made of two rectangles ---------- */

interface CompoundParams {
  W: number;
  H: number;
  a: number;
  b: number;
  /** Whether the step across (a) is given (easier) or found from the full width. */
  findA: boolean;
}

const compoundParts = ({ W, H, a, b }: CompoundParams): [number, number] => [(W - a) * H, a * (H - b)];

const geoAreaCompound: Generator<CompoundParams> = {
  id: 'geo-area-compound',
  sample(rng, difficulty) {
    for (;;) {
      const W = rng.int(6, 14);
      const H = rng.int(5, 12);
      const a = rng.int(2, W - 3);
      const b = rng.int(2, H - 2);
      const [A1, A2] = compoundParts({ W, H, a, b, findA: false });
      if (A1 === A2 || H - b < 2) continue;
      return { W, H, a, b, findA: difficulty >= 2 };
    }
  },
  render(p): Slide {
    const [A1, A2] = compoundParts(p);
    const labels = p.findA
      ? { W: cm(p.W), H: cm(p.H), t: cm(p.W - p.a), r: cm(p.H - p.b) }
      : { H: cm(p.H), t: cm(p.W - p.a), r: cm(p.H - p.b), a: cm(p.a) };
    return {
      kind: 'table',
      prompt: [diagram(compoundSvg(p.W, p.H, p.a, p.b, labels)), say('All corners are right angles. Fill in the area of each rectangle and the total, in cm².')],
      columns: ['\\text{Part}', '\\text{Area}'],
      rows: [
        ['A', null],
        ['B', null],
        ['\\text{Total}', null],
      ],
      bank: numberBank([A1, A2, A1 + A2], [p.W * p.H, p.a * p.H, (p.W - p.a) * (p.H - p.b), 2 * (p.W + p.H)], 3, 1, 1),
      answer: [A1, A2, A1 + A2].map(num),
    };
  },
  solution(p) {
    const [A1, A2] = compoundParts(p);
    const first = p.findA ? [{ text: 'The step across is the full width less the top:' }, { tex: `${p.W} - ${p.W - p.a} = ${p.a}` }] : [];
    return [
      ...first,
      { text: 'Rectangle $A$ is the full height; rectangle $B$ is the lower step:' },
      { tex: `A: \\quad ${p.W - p.a} \\times ${p.H} = ${A1}` },
      { tex: `B: \\quad ${p.a} \\times ${p.H - p.b} = ${A2}` },
      { tex: `\\text{Total} = ${A1} + ${A2} = ${A1 + A2}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Polygon Areas
 * ================================================================ */

function sampleTri(rng: Rng, outside: boolean): TriShape {
  for (;;) {
    const b = rng.int(4, 16);
    const h = rng.int(3, 12);
    if ((b * h) % 2 || b === h) continue;
    const p = outside ? rng.pick([-rng.int(1, 4), b + rng.int(1, 4)]) : rng.pick([0, rng.int(1, b - 1)]);
    return { b, h, p };
  }
}

const geoTriArea: Generator<TriShape> = {
  id: 'geo-tri-area',
  sample(rng, difficulty) {
    return sampleTri(rng, difficulty >= 2);
  },
  render(p) {
    return typed([diagram(triHeightSvg(p, cm(p.b), cm(p.h))), say('Find the area of the triangle, in cm².')], (p.b * p.h) / 2, 'A =');
  },
  choices({ b, h }) {
    return numberOptions((b * h) / 2, [b * h, b + h, (b * h) / 4], 1, 1);
  },
  solution({ b, h }) {
    return [{ text: 'Half the base times the perpendicular height:' }, { tex: `A = \\tfrac{1}{2} \\times ${b} \\times ${h} = ${(b * h) / 2}` }];
  },
};

const geoTriHeight: Generator<TriShape> = {
  id: 'geo-tri-height',
  sample(rng, difficulty) {
    return sampleTri(rng, difficulty >= 2);
  },
  render(p) {
    const A = (p.b * p.h) / 2;
    return typed([diagram(triHeightSvg(p, cm(p.b), 'h')), say(`The triangle's area is $${cm2(A)}$. Find its height $h$.`)], p.h, 'h =');
  },
  choices({ b, h }) {
    const A = (b * h) / 2;
    return numberOptions(h, [A / b, A - b, 2 * h], 1, 1);
  },
  solution({ b, h }) {
    const A = (b * h) / 2;
    return [
      { text: 'Area is half the base times the height, so the base times the height is twice the area:' },
      { tex: `${b} \\times h = 2 \\times ${A} = ${2 * A}` },
      { tex: `h = ${2 * A} \\div ${b} = ${h}` },
    ];
  },
};

/* ---------- parallelograms ---------- */

interface ParaParams extends QuadShape {
  /** The sloping side, labelled as a distractor at the harder level, or 0. */
  slant: number;
}

const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [6, 8, 10],
  [8, 6, 10],
  [5, 12, 13],
  [9, 12, 15],
  [12, 9, 15],
  [8, 15, 17],
  [6, 4.5, 7.5],
];

const geoParaArea: Generator<ParaParams> = {
  id: 'geo-para-area',
  sample(rng, difficulty) {
    for (;;) {
      const b = rng.int(4, 16);
      if (difficulty >= 2) {
        const [off, h, slant] = rng.pick(TRIPLES);
        if (b === h || b === slant || !Number.isInteger(b * h)) continue;
        return { b, a: b, h, off, slant };
      }
      const h = rng.int(3, 11);
      if (b === h) continue;
      return { b, a: b, h, off: rng.int(2, 5), slant: 0 };
    }
  },
  render(p) {
    const svg = quadHeightSvg(p, { bottom: cm(p.b), height: cm(p.h), slant: p.slant ? cm(p.slant) : undefined });
    return typed([diagram(svg), say('Find the area of the parallelogram, in cm².')], p.b * p.h, 'A =');
  },
  choices(p) {
    return numberOptions(p.b * p.h, [p.slant ? p.b * p.slant : p.b + p.h, (p.b * p.h) / 2, 2 * (p.b + p.h)], 1, 1);
  },
  solution(p) {
    const steps = [{ text: 'Base times perpendicular height:' }, { tex: `A = ${p.b} \\times ${num(p.h)} = ${num(p.b * p.h)}` }];
    if (!p.slant) return steps;
    return [{ text: `The sloping side, $${cm(p.slant).replace(' cm', '\\text{ cm}')}$, is not the height and is not used.` }, ...steps];
  },
};

/* ---------- trapezia ---------- */

interface TrapParams extends QuadShape {}

const geoTrapArea: Generator<TrapParams> = {
  id: 'geo-trap-area',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(2, 10);
      const b = a + rng.int(2, difficulty >= 2 ? 12 : 8);
      const h = rng.int(3, difficulty >= 2 ? 14 : 10);
      if (((a + b) * h) % 2 || a + b === ((a + b) * h) / 2) continue;
      if (h === a || h === b) continue;
      return { a, b, h, off: rng.int(1, b - a - 1) };
    }
  },
  render(p): Slide {
    const sum = p.a + p.b;
    const A = (sum * p.h) / 2;
    return {
      kind: 'tiles',
      prompt: [diagram(quadHeightSvg(p, { bottom: cm(p.b), top: cm(p.a), height: cm(p.h) })), say('Find the area of the trapezium: first the two parallel sides added, then the area in cm².')],
      template: 'a + b = {0} \\qquad A = {1}',
      bank: numberBank([sum, A], [sum * p.h, p.a * p.h, p.b * p.h, p.b - p.a, (p.b * p.h) / 2].filter(Number.isInteger), 3, 1, 1),
      answer: [num(sum), num(A)],
    };
  },
  solution(p) {
    const sum = p.a + p.b;
    return [
      { text: 'Add the parallel sides:' },
      { tex: `a + b = ${p.a} + ${p.b} = ${sum}` },
      { text: 'Then half of that times the height:' },
      { tex: `A = \\tfrac{1}{2} \\times ${sum} \\times ${p.h} = ${(sum * p.h) / 2}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Circle Areas
 * ================================================================ */

interface CircleParams {
  r: number;
  given: 'r' | 'd';
}

const geoCircleArea: Generator<CircleParams> = {
  id: 'geo-circle-area',
  sample(rng, difficulty) {
    return { r: difficulty >= 2 ? rng.int(1, 15) + 0.5 : rng.int(2, 20), given: rng.pick(['r', 'd'] as const) };
  },
  render({ r, given }): Slide {
    return {
      kind: 'expression',
      prompt: [diagram(circleSvg(given, cm(given === 'r' ? r : 2 * r))), say('Find the area in cm². Leave $\\pi$ in the answer.')],
      lead: 'A =',
      keypad: PI_KEYS,
      answer: piAns(r * r),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices({ r }) {
    return piOptions(r * r, [2 * r, 4 * r * r, (r * r) / 2]);
  },
  solution({ r, given }) {
    const first = given === 'd' ? [{ text: 'Halve the diameter for the radius:' }, { tex: `r = ${num(2 * r)} \\div 2 = ${num(r)}` }] : [];
    return [...first, { text: 'Area is $\\pi r^2$:' }, { tex: `A = \\pi \\times ${num(r)}^2 = ${piTex(r * r)}` }];
  },
};

interface CircleBackParams {
  r: number;
  ask: 'r' | 'd';
}

const geoCircleBack: Generator<CircleBackParams> = {
  id: 'geo-circle-back',
  sample(rng, difficulty) {
    return { r: difficulty >= 2 ? rng.int(6, 30) : rng.int(2, 15), ask: rng.pick(['r', 'd'] as const) };
  },
  render({ r, ask }) {
    return typed(
      [say(`A circle has an area of $${piTex(r * r)}\\text{ cm}^2$. Find its ${ask === 'r' ? 'radius' : 'diameter'}, in cm.`)],
      ask === 'r' ? r : 2 * r,
      ask === 'r' ? 'r =' : 'd =',
    );
  },
  choices({ r, ask }) {
    return ask === 'r' ? numberOptions(r, [(r * r) / 2, 2 * r, r * r], 1, 1) : numberOptions(2 * r, [r, (r * r) / 2, 4 * r], 1, 1);
  },
  solution({ r, ask }) {
    const steps = [
      { text: 'The number in front of $\\pi$ is $r^2$:' },
      { tex: `r^2 = ${r * r}` },
      { tex: `r = \\sqrt{${r * r}} = ${r}` },
    ];
    if (ask === 'r') return steps;
    return [...steps, { text: 'The diameter is twice the radius:' }, { tex: `d = 2 \\times ${r} = ${2 * r}` }];
  },
};

/* ---------- semicircles and quarter circles ---------- */

interface PartParams {
  kind: 'semi' | 'quarter';
  r: number;
}

const partK = ({ kind, r }: PartParams) => (kind === 'semi' ? (r * r) / 2 : (r * r) / 4);

const geoSemiArea: Generator<PartParams> = {
  id: 'geo-semi-area',
  sample(rng, difficulty) {
    return difficulty >= 2 ? { kind: 'quarter', r: 2 * rng.int(1, 30) } : { kind: 'semi', r: rng.int(2, 30) };
  },
  render(p): Slide {
    const r2 = p.r * p.r;
    return {
      kind: 'tiles',
      prompt: [diagram(partCircleSvg(p.kind, cm(p.r))), say(`Find the area of this ${p.kind === 'semi' ? 'semicircle' : 'quarter circle'}: first $r^2$, then the area in cm².`)],
      template: 'r^2 = {0} \\qquad A = {1}\\pi',
      bank: numberBank([r2, partK(p)], [2 * p.r, r2 * 2, p.kind === 'semi' ? r2 / 4 : r2 / 2, p.r], 3, 1, 1),
      answer: [num(r2), num(partK(p))],
    };
  },
  solution(p) {
    const r2 = p.r * p.r;
    return [
      { text: 'The whole circle would be' },
      { tex: `\\pi \\times ${p.r}^2 = ${piTex(r2)}` },
      { text: `This is ${p.kind === 'semi' ? 'half' : 'a quarter'} of it:` },
      { tex: `A = ${piTex(r2)} \\div ${p.kind === 'semi' ? 2 : 4} = ${piTex(partK(p))}` },
    ];
  },
};

/* ---------- sectors ---------- */

interface SectorParams {
  theta: number;
  r: number;
}

const SECTOR_ANGLES = [30, 36, 40, 45, 60, 72, 90, 120, 135, 144, 150, 180, 210, 240, 270, 300];

const sectorK = ({ theta, r }: SectorParams) => (theta * r * r) / 360;

const geoSectorArea: Generator<SectorParams> = {
  id: 'geo-sector-area',
  sample(rng, difficulty) {
    for (;;) {
      const theta = rng.pick(SECTOR_ANGLES);
      const r = rng.int(2, 20);
      const k = sectorK({ theta, r });
      if (difficulty >= 2 ? !Number.isInteger(2 * k) : !Number.isInteger(k)) continue;
      return { theta, r };
    }
  },
  render(p): Slide {
    return {
      kind: 'expression',
      prompt: [diagram(sectorSvg(p.theta, { angle: `${p.theta}°`, radius: cm(p.r) })), say('Find the area of the sector in cm². Leave $\\pi$ in the answer.')],
      lead: 'A =',
      keypad: PI_KEYS,
      answer: piAns(sectorK(p)),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices(p) {
    const k = sectorK(p);
    return piOptions(k, [(p.theta * p.r) / 180, p.r * p.r, 2 * k]);
  },
  solution(p) {
    return [
      { text: 'The whole circle is' },
      { tex: `\\pi \\times ${p.r}^2 = ${piTex(p.r * p.r)}` },
      { text: `The sector is $\\frac{${p.theta}}{360}$ of it:` },
      { tex: `\\frac{${p.theta}}{360} \\times ${piTex(p.r * p.r)} = ${piTex(sectorK(p))}` },
    ];
  },
};

/* ---------- which formula ---------- */

type FormulaShape = 'circle' | 'semi' | 'triangle' | 'para' | 'trap' | 'rect';

const FORMULA: Record<FormulaShape, string> = {
  circle: 'A = \\pi r^2',
  semi: 'A = \\tfrac{1}{2}\\pi r^2',
  triangle: 'A = \\tfrac{1}{2}bh',
  para: 'A = bh',
  trap: 'A = \\tfrac{1}{2}(a + b)h',
  rect: 'A = lw',
};

const NAME: Record<FormulaShape, string> = {
  circle: 'circle',
  semi: 'semicircle',
  triangle: 'triangle',
  para: 'parallelogram',
  trap: 'trapezium',
  rect: 'rectangle',
};

/** Formulas that are also right for a shape, so never offered as its distractor. */
const ALSO: Partial<Record<FormulaShape, FormulaShape[]>> = { rect: ['para'], para: ['rect'] };

interface FormulaParams {
  shape: FormulaShape;
  wrong: string[];
}

function formulaFigure(shape: FormulaShape): string {
  switch (shape) {
    case 'circle':
      return circleSvg('r', 'r');
    case 'semi':
      return partCircleSvg('semi', 'r');
    case 'triangle':
      return triHeightSvg({ b: 8, h: 5, p: 3 }, 'b', 'h');
    case 'para':
      return quadHeightSvg({ b: 8, a: 8, h: 5, off: 3 }, { bottom: 'b', height: 'h' });
    case 'trap':
      return quadHeightSvg({ b: 9, a: 5, h: 5, off: 2 }, { bottom: 'b', top: 'a', height: 'h' });
    case 'rect':
      return rectSvg(8, 5, 'l', 'w');
  }
}

const WRONG_EXTRA = ['A = 2\\pi r', 'A = 2(l + w)', 'A = (a + b)h'];

const geoAreaFormula: Generator<FormulaParams> = {
  id: 'geo-area-formula',
  sample(rng) {
    const shape = rng.pick(Object.keys(FORMULA) as FormulaShape[]);
    const pool = [...(Object.keys(FORMULA) as FormulaShape[]).filter((s) => s !== shape && !(ALSO[shape] ?? []).includes(s)).map((s) => FORMULA[s]), ...WRONG_EXTRA];
    return { shape, wrong: rng.sample(pool, 3) };
  },
  render({ shape, wrong }) {
    const opts: ChoiceOption[] = [{ tex: FORMULA[shape], correct: true }, ...wrong.map((tex) => ({ tex }))];
    return choiceSlide([diagram(formulaFigure(shape)), say(`Which formula gives the area of this ${NAME[shape]}?`)], opts);
  },
  solution({ shape }) {
    return [{ text: `The area of a ${NAME[shape]} is` }, { tex: FORMULA[shape] }];
  },
};

/* ================================================================
 * Lesson 4: Scaling Areas
 * ================================================================ */

/* ---------- enlarging a rectangle ---------- */

interface EnlargeParams {
  w: number;
  h: number;
  k: number;
}

const geoRectEnlarge: Generator<EnlargeParams> = {
  id: 'geo-rect-enlarge',
  sample(rng, difficulty) {
    for (;;) {
      const w = rng.int(2, 9);
      const h = rng.int(2, 9);
      const k = difficulty >= 2 ? rng.pick([1.5, 2.5, 4]) : rng.pick([2, 3]);
      if (w === h || !Number.isInteger(w * k) || !Number.isInteger(h * k)) continue;
      const answers = [w * k, h * k, w * h * k * k];
      if (new Set(answers).size < 3) continue;
      return { w, h, k };
    }
  },
  render({ w, h, k }): Slide {
    const A = w * h * k * k;
    return {
      kind: 'tiles',
      prompt: [diagram(rectSvg(w, h, `l = ${cm(w)}`, `w = ${cm(h)}`)), say(`The rectangle is enlarged by a scale factor of $${num(k)}$. Fill in the new length, width and area.`)],
      template: 'l = {0} \\quad w = {1} \\quad A = {2}',
      bank: numberBank([w * k, h * k, A], [w * h * k, w * h, w + k, A / 2].filter(Number.isInteger), 3, 1, 1),
      answer: [num(w * k), num(h * k), num(A)],
    };
  },
  solution({ w, h, k }) {
    return [
      { text: `Multiply both sides by $${num(k)}$:` },
      { tex: `l = ${w} \\times ${num(k)} = ${num(w * k)} \\qquad w = ${h} \\times ${num(k)} = ${num(h * k)}` },
      { tex: `A = ${num(w * k)} \\times ${num(h * k)} = ${num(w * h * k * k)}` },
      { text: `The old area was $${w * h}$, so the area has grown $${num(k * k)}$ times: $${num(k)}^2$.` },
    ];
  },
};

/* ---------- the area scale factor ---------- */

interface FactorParams {
  k: number;
  back: boolean;
}

const INT_FACTORS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 20];
const DEC_FACTORS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.5, 3.5, 4.5];

const geoAreaFactor: Generator<FactorParams> = {
  id: 'geo-area-factor',
  sample(rng, difficulty) {
    return { k: rng.pick(difficulty >= 2 ? DEC_FACTORS : INT_FACTORS), back: rng.int(0, 1) === 1 };
  },
  render({ k, back }) {
    if (back) return typed([say(`Two shapes are similar, and the area of one is $${num(k * k)}$ times the area of the other. What is the length scale factor?`)], k, 'k =');
    return typed([say(`Two shapes are similar, with a length scale factor of $${num(k)}$. What is the area scale factor?`)], k * k, '\\text{area factor} =');
  },
  choices({ k, back }) {
    if (back) return numberOptions(k, [(k * k) / 2, k * k, 2 * k].filter((v) => Number.isInteger(100 * v)), k < 1 || !Number.isInteger(k) ? 0.1 : 1, 0.1);
    return numberOptions(k * k, [2 * k, k, k * k * k].filter((v) => Number.isInteger(1000 * v)), k < 1 || !Number.isInteger(k) ? 0.01 : 1, 0.01);
  },
  solution({ k, back }) {
    if (back) return [{ text: 'The area factor is the length factor squared, so take the square root:' }, { tex: `k = \\sqrt{${num(k * k)}} = ${num(k)}` }];
    return [{ text: 'Area is length times length, so the area factor is the length factor squared:' }, { tex: `${num(k)}^2 = ${num(k * k)}` }];
  },
};

/* ---------- areas of similar shapes ---------- */

interface ScaleParams {
  A: number;
  k: number;
  back: boolean;
  shape: 'triangles' | 'pentagons' | 'hexagons' | 'trapezia';
}

const geoAreaScale: Generator<ScaleParams> = {
  id: 'geo-area-scale',
  sample(rng, difficulty) {
    const shape = rng.pick(['triangles', 'pentagons', 'hexagons', 'trapezia'] as const);
    if (difficulty >= 2) {
      for (;;) {
        const k = rng.pick([2, 3, 4, 1.5, 0.5]);
        const A = rng.int(2, 30);
        if (!Number.isInteger(A * k * k)) continue;
        return { A, k, back: rng.int(0, 1) === 1, shape };
      }
    }
    return { A: rng.int(2, 30), k: rng.pick([2, 3, 4]), back: false, shape };
  },
  render({ A, k, back, shape }) {
    const B = A * k * k;
    if (back) {
      return typed(
        [say(`Two similar ${shape}. The second has sides $${num(k)}$ times as long as the first, and an area of $${cm2(B)}$. Find the area of the first, in cm².`)],
        A,
        'A =',
      );
    }
    return typed([say(`Two similar ${shape}. The first has an area of $${cm2(A)}$, and the second has sides $${num(k)}$ times as long. Find the area of the second, in cm².`)], B, 'A =');
  },
  choices({ A, k, back }) {
    const B = A * k * k;
    if (back) return numberOptions(A, [B / k, B * k * k, B - k].filter(Number.isInteger), 1, 1);
    return numberOptions(B, [A * k, A * k * k * k, A + k * k].filter(Number.isInteger), 1, 1);
  },
  solution({ A, k, back }) {
    const f = k * k;
    if (back) return [{ text: 'Areas scale by the length factor squared:' }, { tex: `${num(k)}^2 = ${num(f)}` }, { text: 'Going back, divide:' }, { tex: `${num(A * f)} \\div ${num(f)} = ${A}` }];
    return [{ text: 'Areas scale by the length factor squared:' }, { tex: `${num(k)}^2 = ${num(f)}` }, { tex: `${A} \\times ${num(f)} = ${num(A * f)}` }];
  },
};

/* ---------- a table of factors ---------- */

interface FactorTableParams {
  ks: number[];
  /** Per row, whether the area factor is given (true) or the length factor (false). */
  giveArea: boolean[];
}

const geoAreaTable: Generator<FactorTableParams> = {
  id: 'geo-area-table',
  sample(rng, difficulty) {
    for (;;) {
      const pool = difficulty >= 2 ? [...INT_FACTORS.slice(0, 8), 0.5, 1.5, 2.5, 0.2, 0.3] : INT_FACTORS.slice(0, 10);
      const ks = rng.sample(pool, 3).sort((a, b) => a - b);
      const giveArea = difficulty >= 2 ? ks.map(() => rng.int(0, 1) === 1) : [false, rng.int(0, 1) === 1, false];
      const answers = ks.map((k, i) => (giveArea[i] ? k : k * k));
      if (new Set(answers.map(num)).size < 3) continue;
      return { ks, giveArea };
    }
  },
  render({ ks, giveArea }): Slide {
    const answers = ks.map((k, i) => (giveArea[i] ? k : k * k));
    return {
      kind: 'table',
      prompt: [say('Fill in the table for pairs of similar shapes.')],
      columns: ['\\text{Length factor}', '\\text{Area factor}'],
      rows: ks.map((k, i) => (giveArea[i] ? [null, num(k * k)] : [num(k), null])),
      bank: numberBank(answers, ks.flatMap((k) => [2 * k, k * k * k]).filter((v) => Number.isInteger(1000 * v)), 3, 1, 0.1),
      answer: answers.map(num),
    };
  },
  solution({ ks, giveArea }) {
    return ks.map((k, i) => (giveArea[i] ? { tex: `\\sqrt{${num(k * k)}} = ${num(k)}` } : { tex: `${num(k)}^2 = ${num(k * k)}` }));
  },
};

export const geometryAreasGenerators = [
  geoAreaCount,
  geoRectArea,
  geoAreaCompound,
  geoTriArea,
  geoTriHeight,
  geoParaArea,
  geoTrapArea,
  geoCircleArea,
  geoCircleBack,
  geoSemiArea,
  geoSectorArea,
  geoAreaFormula,
  geoRectEnlarge,
  geoAreaFactor,
  geoAreaScale,
  geoAreaTable,
];

