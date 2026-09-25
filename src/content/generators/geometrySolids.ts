/**
 * Geometry, level 7: Surface Area, and the solids level 8 draws too.
 *
 * Solids are drawn in oblique projection: the front face true to size, depth
 * running up and to the right at half scale, and every edge hidden behind the
 * solid dashed. Round solids (cylinders, cones, spheres) are drawn with an
 * ellipse for each circle, its back half dashed. Every figure labels the
 * lengths its question needs; the unknown is `x`.
 */
import type { Generator, Slide } from '../types';
import { num, numberBank, numberOptions, say, typed } from './contestMath';
import { type Pt, DASHED, SVG_CLOSE, centroid, dot, f1, fit, seg, sideLabel, svgOpen, text } from './geometryKit';
import { PI_KEYS, piAns, piOptions, piTex } from './geometryLengths';

const diagram = (svg: string) => ({ kind: 'diagram' as const, svg });
export const cm = (v: number) => `${num(v)} cm`;
/** Square centimetres in TeX, kept on one line with the number. */
export const cm2 = (v: number) => `${num(v)}\\text{ cm}^2`;

type Rng = Parameters<Generator<unknown>['sample']>[0];

/* ================================================================
 * Figures
 * ================================================================ */

type P3 = [number, number, number];

/** Oblique projection: x across, y up, z back and to the right at half scale. */
const project = ([x, y, z]: P3): Pt => [x + 0.5 * z * Math.cos(Math.PI / 6), -(y + 0.5 * z * Math.sin(Math.PI / 6))];

interface SolidLabel {
  from: number;
  to: number;
  text: string;
  /** A point the label keeps away from; the figure's middle by default. */
  away?: Pt;
}

/** A solid from its corners and edges, fitted into the figure. Returns the page points too. */
function solid(verts: P3[], edges: [number, number, boolean][], box: [number, number, number, number], height: number, label: string) {
  const pts = fit(verts.map(project), ...box);
  const parts = [svgOpen(height, label)];
  for (const [i, j, hidden] of edges) parts.push(seg(pts[i], pts[j], hidden ? `${DASHED} stroke-width="1.5" opacity="0.7"` : ''));
  return { pts, parts, middle: centroid(pts) };
}

function place(parts: string[], pts: Pt[], middle: Pt, labels: SolidLabel[]) {
  for (const l of labels) if (l.text) parts.push(sideLabel(pts[l.from], pts[l.to], l.text, l.away ?? middle, 14));
}

/** A cuboid `l` across, `h` up and `w` deep, labels on a front bottom edge, a back upright edge and a bottom depth edge. */
export function cuboidSvg(l: number, w: number, h: number, labels: { l?: string; w?: string; h?: string }): string {
  // Corner i has x from bit 0, y from bit 1, z from bit 2.
  const verts: P3[] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i & 1 ? l : 0, i & 2 ? h : 0, i & 4 ? w : 0]);
  const edges: [number, number, boolean][] = [];
  for (let i = 0; i < 8; i += 1) {
    for (const bit of [1, 2, 4]) {
      const j = i | bit;
      // The back bottom left corner (4) is behind the solid.
      if (j !== i) edges.push([i, j, i === 4 || j === 4]);
    }
  }
  const { pts, parts, middle } = solid(verts, edges, [190, 130, 45, 25], 185, 'A cuboid');
  place(parts, pts, middle, [
    { from: 0, to: 1, text: labels.l ?? '' },
    { from: 5, to: 7, text: labels.h ?? '' },
    { from: 1, to: 5, text: labels.w ?? '' },
  ]);
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/**
 * A prism whose end is a right-angled triangle, `a` across and `b` up, `L`
 * long. `area` writes the end's area on its face instead of its sides.
 */
export function prismSvg(a: number, b: number, L: number, labels: { a?: string; b?: string; c?: string; L?: string; area?: string }): string {
  const verts: P3[] = [
    [0, 0, 0],
    [a, 0, 0],
    [0, b, 0],
    [0, 0, L],
    [a, 0, L],
    [0, b, L],
  ];
  const edges: [number, number, boolean][] = [
    [0, 1, false],
    [1, 2, false],
    [2, 0, false],
    [1, 4, false],
    [2, 5, false],
    [4, 5, false],
    [0, 3, true],
    [3, 4, true],
    [3, 5, true],
  ];
  const { pts, parts, middle } = solid(verts, edges, [200, 130, 45, 25], 185, 'A triangular prism');
  const front = centroid([pts[0], pts[1], pts[2]]);
  place(parts, pts, middle, [
    { from: 0, to: 1, text: labels.a ?? '' },
    { from: 0, to: 2, text: labels.b ?? '', away: pts[1] },
    // The sloping side's label goes on the matching back edge, above the solid, clear of the end's labels.
    { from: 4, to: 5, text: labels.c ?? '' },
    { from: 1, to: 4, text: labels.L ?? '' },
  ]);
  if (labels.area) parts.push(text([front[0] - 4, front[1] + 6], labels.area, 12));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** A square-based pyramid, base `s`, with its slant height or its vertical height dashed in. */
export function pyramidSvg(s: number, H: number, labels: { s?: string; slant?: string; height?: string }): string {
  const verts: P3[] = [
    [0, 0, 0],
    [s, 0, 0],
    [s, 0, s],
    [0, 0, s],
    [s / 2, H, s / 2],
    [s / 2, 0, 0],
    [s / 2, 0, s / 2],
  ];
  const edges: [number, number, boolean][] = [
    [0, 1, false],
    [1, 2, false],
    [2, 3, true],
    [3, 0, true],
    [0, 4, false],
    [1, 4, false],
    [2, 4, false],
    [3, 4, true],
  ];
  const { pts, parts, middle } = solid(verts, edges, [180, 140, 60, 20], 185, 'A square-based pyramid');
  place(parts, pts, middle, [{ from: 0, to: 1, text: labels.s ?? '' }]);
  if (labels.slant) {
    parts.push(seg(pts[4], pts[5], DASHED));
    // Beside the dashed line, halfway up, on the side away from the front-left edge.
    const mid: Pt = [(pts[4][0] + pts[5][0]) / 2, (pts[4][1] + pts[5][1]) / 2];
    parts.push(text([mid[0] + 8 + 3.4 * labels.slant.length, mid[1] + 10], labels.slant));
  }
  if (labels.height) {
    parts.push(seg(pts[4], pts[6], DASHED), dot(pts[6], 2.5));
    parts.push(text([pts[6][0] - 8 - 3.6 * labels.height.length, (pts[4][1] + pts[6][1]) / 2], labels.height));
  }
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** Pixel sizes for a round solid `r` wide and `h` tall, fitted into the figure. */
function roundScale(r: number, h: number): { R: number; H: number } {
  const k = Math.min(150 / (2 * r), 130 / h);
  return { R: r * k, H: h * k };
}

/** An ellipse for a circle seen at a slant: back half dashed unless `whole`. */
function ellipse(c: Pt, R: number, whole: boolean): string {
  const ry = R * 0.3;
  const front = `<path d="M ${f1(c[0] - R)} ${f1(c[1])} A ${f1(R)} ${f1(ry)} 0 0 0 ${f1(c[0] + R)} ${f1(c[1])}" fill="none" stroke="currentColor" stroke-width="2" />`;
  const back = `<path d="M ${f1(c[0] - R)} ${f1(c[1])} A ${f1(R)} ${f1(ry)} 0 0 1 ${f1(c[0] + R)} ${f1(c[1])}" fill="none" stroke="currentColor" stroke-width="${whole ? 2 : 1.5}"${whole ? '' : `${DASHED} opacity="0.7"`} />`;
  return front + back;
}

/** A cylinder standing up, its radius or diameter on the top and its height down the right. */
export function cylinderSvg(r: number, h: number, labels: { radius?: string; diameter?: string; height?: string }): string {
  const { R, H } = roundScale(r, h);
  const top: Pt = [150, 36 + R * 0.3];
  const bottom: Pt = [150, top[1] + H];
  const parts = [svgOpen(bottom[1] + R * 0.3 + 12, 'A cylinder'), ellipse(top, R, true), ellipse(bottom, R, false)];
  parts.push(seg([top[0] - R, top[1]], [bottom[0] - R, bottom[1]]), seg([top[0] + R, top[1]], [bottom[0] + R, bottom[1]]));
  // Above the top ellipse, clear of its back edge.
  const over = top[1] - R * 0.3 - 9;
  if (labels.radius) parts.push(dot(top, 2.5), seg(top, [top[0] + R, top[1]]), text([top[0] + R / 2, over], labels.radius));
  if (labels.diameter) parts.push(seg([top[0] - R, top[1]], [top[0] + R, top[1]]), text([top[0], over], labels.diameter));
  if (labels.height) parts.push(text([bottom[0] + R + 10 + 3.4 * labels.height.length, (top[1] + bottom[1]) / 2], labels.height));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** A cone standing on its base, with its radius, slant side and dashed height as asked. */
export function coneSvg(r: number, h: number, labels: { radius?: string; diameter?: string; slant?: string; height?: string }): string {
  const { R, H } = roundScale(r, h);
  const apex: Pt = [150, 22];
  const base: Pt = [150, 22 + H];
  const parts = [svgOpen(base[1] + R * 0.3 + 26, 'A cone'), ellipse(base, R, false)];
  parts.push(seg(apex, [base[0] - R, base[1]]), seg(apex, [base[0] + R, base[1]]));
  // Below the base ellipse, clear of its front edge.
  const under = base[1] + R * 0.3 + 12;
  if (labels.radius) parts.push(dot(base, 2.5), seg(base, [base[0] + R, base[1]], DASHED), text([base[0] + R / 2, under], labels.radius));
  if (labels.diameter) parts.push(seg([base[0] - R, base[1]], [base[0] + R, base[1]], DASHED), text([base[0], under], labels.diameter));
  if (labels.slant) parts.push(sideLabel(apex, [base[0] + R, base[1]], labels.slant, base, 14));
  if (labels.height) {
    parts.push(seg(apex, base, DASHED));
    parts.push(text([base[0] - 8 - 3.6 * labels.height.length, (apex[1] + base[1]) / 2], labels.height));
  }
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** A sphere (or a hemisphere, cut flat on top) with its radius or diameter drawn. */
export function sphereSvg(labels: { radius?: string; diameter?: string }, hemi = false): string {
  const R = 80;
  const c: Pt = [150, hemi ? 40 : 100];
  const parts = [svgOpen(hemi ? 140 : 200, hemi ? 'A hemisphere' : 'A sphere')];
  if (hemi) {
    parts.push(`<path d="M ${c[0] - R} ${c[1]} A ${R} ${R} 0 0 0 ${c[0] + R} ${c[1]}" fill="none" stroke="currentColor" stroke-width="2" />`, ellipse(c, R, true));
  } else {
    parts.push(`<circle cx="${c[0]}" cy="${c[1]}" r="${R}" fill="none" stroke="currentColor" stroke-width="2" />`, ellipse(c, R, false));
  }
  if (labels.radius) parts.push(dot(c, 2.5), seg(c, [c[0] + R, c[1]]), text([c[0] + R / 2, c[1] - 10], labels.radius));
  if (labels.diameter) parts.push(dot(c, 2.5), seg([c[0] - R, c[1]], [c[0] + R, c[1]]), text([c[0], c[1] - 10], labels.diameter));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** The net of a cuboid: a cross of six rectangles, front face in the middle. */
export function cuboidNetSvg(l: number, w: number, h: number, labels: { l: string; w: string; h: string }): string {
  // Across: side, front, side, back; up the middle: top above the front, bottom below.
  const across = [w, l, w, l];
  const total = 2 * (l + w);
  const tall = h + 2 * w;
  const k = Math.min(250 / total, 170 / tall);
  const x0 = 150 - (total * k) / 2;
  const y0 = 20;
  const parts = [svgOpen(tall * k + 40, 'The net of a cuboid')];
  const rect = (x: number, y: number, rw: number, rh: number, shade = false) =>
    `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(rw)}" height="${f1(rh)}" fill="none"${shade ? ' class="plot-shade"' : ''} stroke="currentColor" stroke-width="2" />`;
  let x = x0;
  for (const [i, a] of across.entries()) {
    parts.push(rect(x, y0 + w * k, a * k, h * k, i === 1));
    x += a * k;
  }
  const fx = x0 + w * k;
  parts.push(rect(fx, y0, l * k, w * k), rect(fx, y0 + (w + h) * k, l * k, w * k));
  parts.push(text([fx + (l * k) / 2, y0 + (w + h / 2) * k], 'front', 12));
  parts.push(text([fx + (l * k) / 2, y0 + tall * k + 12], labels.l));
  parts.push(text([fx - 6 - 3.4 * labels.h.length - (w * k) - 0, y0 + (w + h / 2) * k], labels.h));
  parts.push(text([fx + l * k + 8 + 3.4 * labels.w.length, y0 + (w / 2) * k], labels.w));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/* ================================================================
 * Lesson 1: Surface Area
 * ================================================================ */

/* ---------- faces, edges and corners ---------- */

type SolidKind = 'cuboid' | 'prism' | 'pyramid';
type Count = 'faces' | 'edges' | 'vertices';

const COUNTS: Record<SolidKind, Record<Count, number>> = {
  cuboid: { faces: 6, edges: 12, vertices: 8 },
  prism: { faces: 5, edges: 9, vertices: 6 },
  pyramid: { faces: 5, edges: 8, vertices: 5 },
};

const SOLID_NAME: Record<SolidKind, string> = { cuboid: 'cuboid', prism: 'triangular prism', pyramid: 'square-based pyramid' };

interface CountParams {
  kind: SolidKind;
  ask: Count;
  /** Drawing sizes, so the same question can be drawn several ways. */
  dims: [number, number, number];
}

function countFigure({ kind, dims: [p, q, r] }: CountParams): string {
  if (kind === 'cuboid') return cuboidSvg(p, q, r, {});
  if (kind === 'prism') return prismSvg(p, r, q + 2, {});
  return pyramidSvg(p, r + 1, {});
}

const geoSolidCount: Generator<CountParams> = {
  id: 'geo-solid-count',
  sample(rng, difficulty) {
    const kinds: SolidKind[] = difficulty >= 2 ? ['prism', 'pyramid'] : ['cuboid', 'prism', 'pyramid'];
    return { kind: rng.pick(kinds), ask: rng.pick(['faces', 'edges', 'vertices'] as const), dims: [rng.int(3, 6), rng.int(2, 5), rng.int(2, 5)] };
  },
  render(p) {
    const what = p.ask === 'vertices' ? 'vertices (corners)' : p.ask;
    return typed([diagram(countFigure(p)), say(`How many ${what} does this ${SOLID_NAME[p.kind]} have?`)], COUNTS[p.kind][p.ask], 'n =');
  },
  choices(p) {
    const c = COUNTS[p.kind];
    const n = c[p.ask];
    return numberOptions(n, [c.faces, c.edges, c.vertices, n + 1, n - 1], 1, 1);
  },
  solution(p) {
    const lines: Record<SolidKind, string> = {
      cuboid: 'A cuboid has 6 faces (front, back, top, bottom and two sides), 12 edges and 8 vertices.',
      prism: 'A triangular prism has 5 faces (two triangles and three rectangles), 9 edges (three on each end and three joining them) and 6 vertices.',
      pyramid: 'A square-based pyramid has 5 faces (the square and four triangles), 8 edges (four round the base and four up to the top) and 5 vertices.',
    };
    return [{ text: lines[p.kind] }];
  },
};

/* ---------- a cuboid face by face ---------- */

interface CuboidParams {
  l: number;
  w: number;
  h: number;
}

const faces = ({ l, w, h }: CuboidParams) => [l * h, l * w, w * h];
const cuboidSA = (p: CuboidParams) => 2 * faces(p).reduce((s, v) => s + v, 0);

function sampleCuboid(rng: Rng, big: boolean): CuboidParams {
  for (;;) {
    const l = rng.int(3, big ? 15 : 10);
    const w = rng.int(2, big ? 9 : 6);
    const h = rng.int(2, big ? 12 : 8);
    if (new Set([l, w, h]).size < 3 || new Set(faces({ l, w, h })).size < 3) continue;
    return { l, w, h };
  }
}

const cuboidFigure = (p: CuboidParams) => cuboidSvg(p.l, p.w, p.h, { l: cm(p.l), w: cm(p.w), h: cm(p.h) });

const geoCuboidFaces: Generator<CuboidParams> = {
  id: 'geo-cuboid-faces',
  sample(rng, difficulty) {
    return sampleCuboid(rng, difficulty >= 2);
  },
  render(p): Slide {
    const [f, t, s] = faces(p);
    const answers = [f, t, s, cuboidSA(p)];
    return {
      kind: 'table',
      prompt: [diagram(cuboidFigure(p)), say('Fill in the area of one front, one top and one side face, then the total surface area, in cm².')],
      columns: ['\\text{Face}', '\\text{Area}'],
      rows: [
        ['\\text{Front}', null],
        ['\\text{Top}', null],
        ['\\text{Side}', null],
        ['\\text{Total}', null],
      ],
      bank: numberBank(answers, [f + t + s, p.l * p.w * p.h, 2 * (p.l + p.w + p.h)], 3, 1, 1),
      answer: answers.map(num),
    };
  },
  solution(p) {
    const [f, t, s] = faces(p);
    return [
      { tex: `\\text{front} = ${p.l} \\times ${p.h} = ${f}` },
      { tex: `\\text{top} = ${p.l} \\times ${p.w} = ${t}` },
      { tex: `\\text{side} = ${p.w} \\times ${p.h} = ${s}` },
      { text: 'Each face has a matching one opposite, so double the sum:' },
      { tex: `2 \\times (${f} + ${t} + ${s}) = ${cuboidSA(p)}` },
    ];
  },
};

interface SAParams extends CuboidParams {
  kind: 'cuboid' | 'cube' | 'cubeBack';
}

const geoCuboidSA: Generator<SAParams> = {
  id: 'geo-cuboid-sa',
  sample(rng, difficulty) {
    if (difficulty < 2) return { ...sampleCuboid(rng, false), kind: 'cuboid' };
    const a = rng.int(2, 20);
    return { l: a, w: a, h: a, kind: rng.pick(['cube', 'cubeBack'] as const) };
  },
  render(p) {
    if (p.kind === 'cuboid') return typed([diagram(cuboidFigure(p)), say('Find the surface area of the cuboid, in cm².')], cuboidSA(p), 'A =');
    if (p.kind === 'cube') return typed([diagram(cuboidSvg(p.l, p.l, p.l, { l: cm(p.l) })), say('Find the surface area of the cube, in cm².')], 6 * p.l * p.l, 'A =');
    return typed([diagram(cuboidSvg(p.l, p.l, p.l, { l: 'x' })), say(`A cube has a surface area of $${cm2(6 * p.l * p.l)}$. Find the length of an edge, $x$, in cm.`)], p.l, 'x =');
  },
  choices(p) {
    if (p.kind === 'cubeBack') return numberOptions(p.l, [p.l * p.l, (6 * p.l * p.l) / 6 / 2, p.l + 1], 1, 1);
    if (p.kind === 'cube') return numberOptions(6 * p.l * p.l, [p.l ** 3, 4 * p.l * p.l, 6 * p.l], 1, 1);
    const half = faces(p).reduce((s, v) => s + v, 0);
    return numberOptions(cuboidSA(p), [half, p.l * p.w * p.h, 3 * half], 1, 1);
  },
  solution(p) {
    if (p.kind === 'cuboid') {
      const [f, t, s] = faces(p);
      return [{ text: 'Front, top and side, each twice:' }, { tex: `${p.l} \\times ${p.h} = ${f} \\qquad ${p.l} \\times ${p.w} = ${t} \\qquad ${p.w} \\times ${p.h} = ${s}` }, { tex: `2 \\times (${f} + ${t} + ${s}) = ${cuboidSA(p)}` }];
    }
    if (p.kind === 'cube') return [{ text: 'Six equal square faces:' }, { tex: `6 \\times ${p.l}^2 = 6 \\times ${p.l * p.l} = ${6 * p.l * p.l}` }];
    return [{ text: 'Divide by six for one face, then take the square root for its side:' }, { tex: `${6 * p.l * p.l} \\div 6 = ${p.l * p.l}` }, { tex: `x = \\sqrt{${p.l * p.l}} = ${p.l}` }];
  },
};

/* ================================================================
 * Lesson 2: Surface Area Shortcut
 * ================================================================ */

interface PrismParams {
  a: number;
  b: number;
  c: number;
  L: number;
  /** Leave the sloping side for the learner to find (harder). */
  hideC: boolean;
}

const PRISM_ENDS: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [6, 8, 10],
  [8, 6, 10],
  [5, 12, 13],
  [12, 5, 13],
  [9, 12, 15],
  [12, 9, 15],
];

const prismSA = ({ a, b, c, L }: PrismParams) => a * b + (a + b + c) * L;

function samplePrism(rng: Rng, difficulty: number): PrismParams {
  const [a, b, c] = rng.pick(PRISM_ENDS);
  return { a, b, c, L: rng.int(4, 20), hideC: difficulty >= 2 };
}

const prismFigure = (p: PrismParams) => prismSvg(p.a, p.b, p.L, { a: cm(p.a), b: cm(p.b), c: p.hideC ? '' : cm(p.c), L: cm(p.L) });

const prismSteps = (p: PrismParams) => [
  ...(p.hideC ? [{ text: 'First the sloping side, by Pythagoras:' }, { tex: `\\sqrt{${p.a}^2 + ${p.b}^2} = \\sqrt{${p.a * p.a + p.b * p.b}} = ${p.c}` }] : []),
  { text: 'The two triangle ends make one rectangle:' },
  { tex: `2 \\times \\tfrac{1}{2} \\times ${p.a} \\times ${p.b} = ${p.a * p.b}` },
  { text: 'The three rectangles round the sides are the perimeter times the length:' },
  { tex: `(${p.a} + ${p.b} + ${p.c}) \\times ${p.L} = ${p.a + p.b + p.c} \\times ${p.L} = ${(p.a + p.b + p.c) * p.L}` },
  { tex: `A = ${p.a * p.b} + ${(p.a + p.b + p.c) * p.L} = ${prismSA(p)}` },
];

const geoPrismSA: Generator<PrismParams> = {
  id: 'geo-prism-sa',
  sample: samplePrism,
  render(p) {
    const extra = p.hideC ? ' The ends are right-angled triangles.' : '';
    return typed([diagram(prismFigure(p)), say(`Find the surface area of the prism, in cm².${extra}`)], prismSA(p), 'A =');
  },
  choices(p) {
    return numberOptions(prismSA(p), [(p.a * p.b) / 2 + (p.a + p.b + p.c) * p.L, (p.a + p.b + p.c) * p.L, p.a * p.b * p.L], 1, 1);
  },
  solution: prismSteps,
};

const geoShortcutTree: Generator<PrismParams> = {
  id: 'geo-shortcut-tree',
  sample(rng, difficulty) {
    for (;;) {
      const p = { ...samplePrism(rng, 1), L: rng.int(difficulty >= 2 ? 11 : 3, difficulty >= 2 ? 25 : 12) };
      const answers = [p.a * p.b, p.a + p.b + p.c, (p.a + p.b + p.c) * p.L, prismSA(p)];
      if (new Set(answers).size === 4) return p;
    }
  },
  render(p): Slide {
    const perim = p.a + p.b + p.c;
    const answers = [p.a * p.b, perim, perim * p.L, prismSA(p)];
    return {
      kind: 'tree',
      prompt: [diagram(prismFigure(p)), say('Work out the surface area in cm²: the two ends, the perimeter of an end, the sides, then the total.')],
      expression: `2 \\times \\tfrac{1}{2} \\times ${p.a} \\times ${p.b} + (${p.a} + ${p.b} + ${p.c}) \\times ${p.L}`,
      nodes: [
        { id: 'ends', from: [] },
        { id: 'perimeter', from: [] },
        { id: 'sides', from: ['perimeter'] },
        { id: 'total', from: ['ends', 'sides'] },
      ],
      bank: numberBank(answers, [(p.a * p.b) / 2, perim + p.L, p.a * p.b * p.L], 3, 1, 1),
      answer: answers.map(num),
    };
  },
  solution: prismSteps,
};

/* ---------- cylinders ---------- */

interface CylParams {
  r: number;
  h: number;
  given: 'r' | 'd';
}

function sampleCyl(rng: Rng, difficulty: number): CylParams {
  for (;;) {
    const r = rng.int(1, 10);
    const h = rng.int(2, 15);
    if (h > 5 * r || 2 * r > 4 * h || r === h) continue;
    return { r, h, given: difficulty >= 2 ? 'd' : 'r' };
  }
}

export const cylFigure = ({ r, h, given }: CylParams, height = cm(h)) =>
  cylinderSvg(r, h, given === 'r' ? { radius: cm(r), height } : { diameter: cm(2 * r), height });

const halveFirst = ({ r, given }: CylParams) => (given === 'd' ? [{ text: 'Halve the diameter for the radius:' }, { tex: `r = ${2 * r} \\div 2 = ${r}` }] : []);

const geoCylinderSA: Generator<CylParams> = {
  id: 'geo-cylinder-sa',
  sample: sampleCyl,
  render(p): Slide {
    return {
      kind: 'expression',
      prompt: [diagram(cylFigure(p)), say('Find the total surface area of the cylinder in cm². Leave $\\pi$ in the answer.')],
      lead: 'A =',
      keypad: PI_KEYS,
      answer: piAns(2 * p.r * p.r + 2 * p.r * p.h),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices({ r, h }) {
    return piOptions(2 * r * r + 2 * r * h, [2 * r * h, r * r + 2 * r * h, r * r * h]);
  },
  solution(p) {
    const { r, h } = p;
    return [
      ...halveFirst(p),
      { text: 'Two circles, and the curved side, which unrolls to a rectangle $2\\pi r$ long and $h$ high:' },
      { tex: `2 \\times \\pi \\times ${r}^2 = ${piTex(2 * r * r)}` },
      { tex: `2 \\times \\pi \\times ${r} \\times ${h} = ${piTex(2 * r * h)}` },
      { tex: `A = ${piTex(2 * r * r)} + ${piTex(2 * r * h)} = ${piTex(2 * r * r + 2 * r * h)}` },
    ];
  },
};

interface CurvedParams {
  r: number;
  h: number;
  back: boolean;
}

const geoCylinderCurved: Generator<CurvedParams> = {
  id: 'geo-cylinder-curved',
  sample(rng, difficulty) {
    const { r, h } = sampleCyl(rng, 1);
    return { r, h, back: difficulty >= 2 };
  },
  render({ r, h, back }): Slide {
    if (back) {
      return typed(
        [diagram(cylinderSvg(r, h, { radius: cm(r), height: 'x' })), say(`The curved surface of the cylinder has an area of $${piTex(2 * r * h)}\\text{ cm}^2$. Find its height $x$, in cm.`)],
        h,
        'x =',
      );
    }
    return {
      kind: 'expression',
      prompt: [diagram(cylinderSvg(r, h, { radius: cm(r), height: cm(h) })), say('Find the area of the curved surface only, in cm². Leave $\\pi$ in the answer.')],
      lead: 'A =',
      keypad: PI_KEYS,
      answer: piAns(2 * r * h),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices({ r, h, back }) {
    if (back) return numberOptions(h, [2 * r * h, r * h, h * 2], 1, 1);
    return piOptions(2 * r * h, [r * h, r * r * h, 2 * r * r + 2 * r * h]);
  },
  solution({ r, h, back }) {
    if (back) return [{ text: 'The curved surface is $2\\pi r h$. With $r$ known:' }, { tex: `2 \\times ${r} \\times x = ${2 * r * h}` }, { tex: `x = ${2 * r * h} \\div ${2 * r} = ${h}` }];
    return [{ text: 'The curved surface unrolls to a rectangle $2\\pi r$ long and $h$ high:' }, { tex: `2 \\times \\pi \\times ${r} \\times ${h} = ${piTex(2 * r * h)}` }];
  },
};

/* ================================================================
 * Lesson 3: Pyramids and Cones
 * ================================================================ */

interface PyrParams {
  s: number;
  l: number;
  /** The vertical height, labelled instead of the slant height at the harder level. */
  H: number;
  useH: boolean;
}

/** Right-angled triangles as [one short side, the other, hypotenuse], either way round, hypotenuse at most 40. */
const RIGHT_TRIS: [number, number, number][] = (
  [
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
  ] as [number, number, number][]
).flatMap(([a, b, c]) =>
  Array.from({ length: Math.floor(40 / c) }, (_, i) => i + 1).flatMap((k): [number, number, number][] => [
    [a * k, b * k, c * k],
    [b * k, a * k, c * k],
  ]),
);

const pyrSA = ({ s, l }: PyrParams) => s * s + 2 * s * l;

const geoPyramidSA: Generator<PyrParams> = {
  id: 'geo-pyramid-sa',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const [half, H, l] = rng.pick(RIGHT_TRIS);
      return { s: 2 * half, l, H, useH: true };
    }
    for (;;) {
      const s = rng.int(2, 14);
      const l = rng.int(3, 15);
      if (l <= s / 2 + 1) continue;
      return { s, l, H: Math.sqrt(l * l - (s * s) / 4), useH: false };
    }
  },
  render(p) {
    const labels = p.useH ? { s: cm(p.s), height: cm(p.H) } : { s: cm(p.s), slant: cm(p.l) };
    const extra = p.useH ? ' Find the slant height of a triangle first.' : '';
    return typed([diagram(pyramidSvg(p.s, p.H, labels)), say(`Find the surface area of the square-based pyramid, in cm².${extra}`)], pyrSA(p), 'A =');
  },
  choices(p) {
    return numberOptions(pyrSA(p), [p.s * p.s + 4 * p.s * p.l, 2 * p.s * p.l, p.s * p.s + p.s * p.l], 1, 1);
  },
  solution(p) {
    const first = p.useH
      ? [{ text: 'The slant height is the hypotenuse of a triangle with the height and half the base:' }, { tex: `\\sqrt{${p.s / 2}^2 + ${p.H}^2} = \\sqrt{${p.l * p.l}} = ${p.l}` }]
      : [];
    return [
      ...first,
      { text: 'The square base, and four triangles each half the base times the slant height:' },
      { tex: `${p.s}^2 = ${p.s * p.s}` },
      { tex: `4 \\times \\tfrac{1}{2} \\times ${p.s} \\times ${p.l} = ${2 * p.s * p.l}` },
      { tex: `A = ${p.s * p.s} + ${2 * p.s * p.l} = ${pyrSA(p)}` },
    ];
  },
};

interface ConeParams {
  r: number;
  l: number;
  h: number;
  /** Curved surface only (easier) or the whole surface. */
  total: boolean;
  /** Give the vertical height instead of the slant (tiles, harder). */
  useH: boolean;
  /** Label the diameter rather than the radius. */
  diam?: boolean;
}

function sampleCone(rng: Rng): ConeParams {
  for (;;) {
    const r = rng.int(2, 12);
    const l = rng.int(r + 2, 20);
    return { r, l, h: Math.sqrt(l * l - r * r), total: false, useH: false };
  }
}

const coneFigure = (p: ConeParams) => {
  const across = p.diam ? { diameter: cm(2 * p.r) } : { radius: cm(p.r) };
  return coneSvg(p.r, p.h, p.useH ? { ...across, height: cm(p.h) } : { ...across, slant: cm(p.l) });
};

const geoConeSA: Generator<ConeParams> = {
  id: 'geo-cone-sa',
  sample(rng, difficulty) {
    return { ...sampleCone(rng), total: difficulty >= 2 };
  },
  render(p): Slide {
    const k = p.total ? p.r * p.l + p.r * p.r : p.r * p.l;
    return {
      kind: 'expression',
      prompt: [diagram(coneFigure(p)), say(`Find the ${p.total ? 'total surface area' : 'area of the curved surface'} of the cone in cm². Leave $\\pi$ in the answer.`)],
      lead: 'A =',
      keypad: PI_KEYS,
      answer: piAns(k),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices(p) {
    const k = p.total ? p.r * p.l + p.r * p.r : p.r * p.l;
    return piOptions(k, p.total ? [p.r * p.l, 2 * p.r * p.l + p.r * p.r, p.r * p.l + 2 * p.r * p.r] : [2 * p.r * p.l, p.r * p.r, p.r * p.r * p.l]);
  },
  solution(p) {
    const curved = [{ text: 'The curved surface is $\\pi r l$:' }, { tex: `\\pi \\times ${p.r} \\times ${p.l} = ${piTex(p.r * p.l)}` }];
    if (!p.total) return curved;
    return [...curved, { text: 'Add the circle on the bottom:' }, { tex: `\\pi \\times ${p.r}^2 = ${piTex(p.r * p.r)}` }, { tex: `A = ${piTex(p.r * p.l)} + ${piTex(p.r * p.r)} = ${piTex(p.r * p.l + p.r * p.r)}` }];
  },
};

const geoConeTiles: Generator<ConeParams> = {
  id: 'geo-cone-tiles',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      for (;;) {
        const [r, h, l] = rng.pick(RIGHT_TRIS);
        // A cone that stands up, with a small enough base to read.
        if (r > 16 || h < 0.6 * r) continue;
        return { r, h, l, total: true, useH: true, diam: rng.int(0, 1) === 1 };
      }
    }
    return { ...sampleCone(rng), total: true };
  },
  render(p): Slide {
    const answers = [p.r * p.l, p.r * p.l + p.r * p.r];
    const lead = p.useH ? ' Find the slant height first.' : '';
    return {
      kind: 'tiles',
      prompt: [diagram(coneFigure(p)), say(`Fill in the curved surface $C$, then the total surface area $A$, in cm².${lead}`)],
      template: 'C = {0}\\pi \\qquad A = {1}\\pi',
      bank: numberBank(answers, [p.r * p.r, 2 * p.r * p.l, p.r * p.l + 2 * p.r * p.r, p.r + p.l].filter(Number.isInteger), 3, 1, 1),
      answer: answers.map(num),
    };
  },
  solution(p) {
    const halve = p.diam ? [{ text: 'Halve the diameter for the radius:' }, { tex: `r = ${2 * p.r} \\div 2 = ${p.r}` }] : [];
    const first = p.useH ? [...halve, { text: 'The slant height, by Pythagoras:' }, { tex: `l = \\sqrt{${p.r}^2 + ${p.h}^2} = \\sqrt{${p.l * p.l}} = ${p.l}` }] : [];
    return [
      ...first,
      { tex: `C = \\pi r l = \\pi \\times ${p.r} \\times ${p.l} = ${piTex(p.r * p.l)}` },
      { tex: `\\pi r^2 = \\pi \\times ${p.r}^2 = ${piTex(p.r * p.r)}` },
      { tex: `A = ${piTex(p.r * p.l)} + ${piTex(p.r * p.r)} = ${piTex(p.r * p.l + p.r * p.r)}` },
    ];
  },
};

export const geometrySolidsGenerators = [geoSolidCount, geoCuboidFaces, geoCuboidSA, geoPrismSA, geoShortcutTree, geoCylinderSA, geoCylinderCurved, geoPyramidSA, geoConeSA, geoConeTiles];
