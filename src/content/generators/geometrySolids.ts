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
import { type Pt, DASHED, SVG_CLOSE, centroid, dot, f1, fit, labelHalf, minus, plus, seg, sideLabelAt, svgOpen, text, times } from './geometryKit';
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

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Room kept between a label and any line or other label. */
const LABEL_PAD = 3;

/** Whether point p is inside the convex polygon `poly` (either winding). */
function inside(p: Pt, poly: Pt[]): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(cross) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

/** Points along an ellipse, as a polyline a label can be kept clear of. */
function ellipseLine(c: Pt, R: number, ry: number, from = 0, to = 2 * Math.PI): [Pt, Pt][] {
  const pts: Pt[] = Array.from({ length: 33 }, (_, i) => {
    const t = from + ((to - from) * i) / 32;
    return [c[0] + R * Math.cos(t), c[1] + ry * Math.sin(t)];
  });
  return pts.slice(1).map((p, i) => [pts[i], p]);
}

/**
 * The labels of one figure, each put at the first of its candidate spots that
 * sits inside the picture and clear of every line and every label before it.
 * A solid crowds its lines together at a corner or an apex, and a label that
 * is only offset from its own edge lands on the next one.
 */
class Labels {
  private lines: [Pt, Pt][] = [];
  private boxes: [Pt, Pt][] = [];
  private height: number;

  constructor(height: number) {
    this.height = height;
  }

  line(a: Pt, b: Pt) {
    this.lines.push([a, b]);
  }

  curve(segs: [Pt, Pt][]) {
    this.lines.push(...segs);
  }

  /** Whether a label box centred at `c` fits here, and inside `within` if given. */
  fits(c: Pt, half: Pt, within?: Pt[]): boolean {
    const [hx, hy] = half;
    if (c[0] - hx < 2 || c[0] + hx > 298 || c[1] - hy < 2 || c[1] + hy > this.height - 2) return false;
    if (within) {
      const m = LABEL_PAD;
      const corners: Pt[] = [
        [c[0] - hx - m, c[1] - hy - m],
        [c[0] + hx + m, c[1] - hy - m],
        [c[0] - hx - m, c[1] + hy + m],
        [c[0] + hx + m, c[1] + hy + m],
      ];
      if (!corners.every((p) => inside(p, within))) return false;
    }
    for (const [a, b] of this.lines) {
      const n = Math.max(2, Math.ceil(dist(a, b) / 4));
      for (let i = 0; i <= n; i += 1) {
        const [x, y] = lerp(a, b, i / n);
        if (Math.abs(x - c[0]) < hx + LABEL_PAD && Math.abs(y - c[1]) < hy + LABEL_PAD) return false;
      }
    }
    for (const [bc, bh] of this.boxes) {
      if (Math.abs(bc[0] - c[0]) < hx + bh[0] + LABEL_PAD && Math.abs(bc[1] - c[1]) < hy + bh[1] + LABEL_PAD) return false;
    }
    return true;
  }

  /** The label at its first spot that fits, or the first spot if none does. */
  put(value: string, spots: Pt[], within?: Pt[], size = 13): string {
    const half = labelHalf(value, size);
    const c = spots.find((s) => this.fits(s, half, within)) ?? spots[0];
    this.boxes.push([c, half]);
    return text(c, value, size);
  }

  /** Beside edge ab on the side away from `away`: its middle first, then along it and further out. */
  edge(a: Pt, b: Pt, value: string, away: Pt): string {
    const mid = lerp(a, b, 0.5);
    const off = minus(sideLabelAt(a, b, value, away, 14), mid);
    const len = Math.hypot(off[0], off[1]) || 1;
    const spots: Pt[] = [];
    for (const extra of [0, 5, 10, 16, 22]) {
      for (const t of [0.5, 0.4, 0.6, 0.3, 0.7]) spots.push(plus(lerp(a, b, t), times(off, (len + extra) / len)));
    }
    return this.put(value, spots);
  }

  /** Inside `region`, as near `target` as fits. */
  within(value: string, region: Pt[], target: Pt): string {
    const xs = region.map((p) => p[0]);
    const ys = region.map((p) => p[1]);
    const spots: Pt[] = [];
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) {
      for (let y = Math.min(...ys); y <= Math.max(...ys); y += 2) spots.push([x, y]);
    }
    spots.sort((p, q) => dist(p, target) - dist(q, target));
    // A little wider than the estimate first: squeezed between two lines, a label that only just fits reads as touching them.
    const half = labelHalf(value);
    const roomy: Pt = [half[0] + 3, half[1] + 1];
    const c = spots.find((s) => this.fits(s, roomy, region)) ?? spots.find((s) => this.fits(s, half, region)) ?? target;
    this.boxes.push([c, half]);
    return text(c, value);
  }
}

/** A solid from its corners and edges, fitted into the figure. Returns the page points too. */
function solid(verts: P3[], edges: [number, number, boolean][], box: [number, number, number, number], height: number, label: string) {
  const pts = fit(verts.map(project), ...box);
  const parts = [svgOpen(height, label)];
  const labels = new Labels(height);
  for (const [i, j, hidden] of edges) {
    parts.push(seg(pts[i], pts[j], hidden ? `${DASHED} opacity="0.7"` : ''));
    labels.line(pts[i], pts[j]);
  }
  return { pts, parts, labels, middle: centroid(pts) };
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
  const { pts, parts, labels: place, middle } = solid(verts, edges, [190, 130, 45, 25], 185, 'A cuboid');
  if (labels.l) parts.push(place.edge(pts[0], pts[1], labels.l, middle));
  if (labels.h) parts.push(place.edge(pts[5], pts[7], labels.h, middle));
  if (labels.w) parts.push(place.edge(pts[1], pts[5], labels.w, middle));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/**
 * A prism whose end is a right-angled triangle, `a` across and `b` up, `L`
 * long. `area` shades the end and writes its area beside it instead of its sides.
 *
 * Drawn to a tamed shape rather than to scale: an end 2 by 10 is a sliver
 * with no room for a label, and 25 long on an end of 3 runs off as a rod. The
 * labels carry the sizes.
 */
export function prismSvg(a: number, b: number, L: number, labels: { a?: string; b?: string; c?: string; L?: string; area?: string }): string {
  const tall = clamp(b / a, 0.5, 1.6);
  const [da, db] = tall * a >= b ? [b / tall, b] : [a, a * tall];
  const dL = clamp(L, 0.7 * Math.max(da, db), 2.5 * Math.max(da, db));
  const verts: P3[] = [
    [0, 0, 0],
    [da, 0, 0],
    [0, db, 0],
    [0, 0, dL],
    [da, 0, dL],
    [0, db, dL],
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
  // An area label sits left of the end, so the solid moves right to make room for it.
  const box: [number, number, number, number] = labels.area ? [180, 130, 100, 25] : [200, 130, 45, 25];
  const { pts, parts, labels: place, middle } = solid(verts, edges, box, 185, 'A triangular prism');
  if (labels.area) {
    // The end is shaded, and its area written beside it with a leader into the shading: the
    // hidden edges cross the end, and a label on it lands on one of them.
    const end = [pts[0], pts[1], pts[2]];
    parts.splice(1, 0, `<polygon points="${end.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ')}" class="plot-shade" stroke="none" />`);
    const into = plus(pts[0], plus(times(minus(pts[1], pts[0]), 0.2), times(minus(pts[2], pts[0]), 0.45)));
    const [hw] = labelHalf(labels.area);
    const at: Pt = [pts[0][0] - 12 - hw, into[1]];
    parts.push(seg([at[0] + hw + 3, at[1]], into), dot(into, 2.5), place.put(labels.area, [at]));
  }
  if (labels.a) parts.push(place.edge(pts[0], pts[1], labels.a, middle));
  if (labels.b) parts.push(place.edge(pts[0], pts[2], labels.b, pts[1]));
  // The sloping side's label goes on the matching back edge, above the solid, clear of the end's labels.
  if (labels.c) parts.push(place.edge(pts[4], pts[5], labels.c, middle));
  if (labels.L) parts.push(place.edge(pts[1], pts[4], labels.L, middle));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/**
 * A square-based pyramid, base `s`, with its slant height or its vertical
 * height dashed in. Its height is drawn between 0.7 and 1 base whatever it
 * is, so the dashed line always has room beside it for its label.
 */
export function pyramidSvg(s: number, H: number, labels: { s?: string; slant?: string; height?: string }): string {
  const dH = clamp(H / s, 0.7, 1) * s;
  const verts: P3[] = [
    [0, 0, 0],
    [s, 0, 0],
    [s, 0, s],
    [0, 0, s],
    [s / 2, dH, s / 2],
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
  const { pts, parts, labels: place, middle } = solid(verts, edges, [180, 140, 60, 20], 185, 'A square-based pyramid');
  if (labels.slant) {
    parts.push(seg(pts[4], pts[5], DASHED));
    place.line(pts[4], pts[5]);
  }
  if (labels.height) {
    parts.push(seg(pts[4], pts[6], DASHED), dot(pts[6], 2.5));
    place.line(pts[4], pts[6]);
    place.line(minus(pts[6], [3, 0]), plus(pts[6], [3, 0]));
  }
  if (labels.s) parts.push(place.edge(pts[0], pts[1], labels.s, middle));
  if (labels.slant) {
    // On the front face, right of the dashed line, low down where the face is widest.
    const [hw] = labelHalf(labels.slant);
    parts.push(place.within(labels.slant, [pts[4], pts[5], pts[1]], plus(lerp(pts[5], pts[4], 0.3), [hw + 6, 0])));
  }
  if (labels.height) {
    const [hw] = labelHalf(labels.height);
    parts.push(place.within(labels.height, [pts[0], pts[1], pts[2], pts[4]], plus(lerp(pts[6], pts[4], 0.2), [-hw - 6, 0])));
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

/**
 * A cylinder standing up, its radius or diameter on the top and its height
 * down the right. Never drawn narrower than 0.3 of its height across the
 * radius, so a 1 cm radius still reads as a cylinder rather than a line.
 */
export function cylinderSvg(r: number, h: number, labels: { radius?: string; diameter?: string; height?: string }): string {
  const scaled = roundScale(r, h);
  const R = Math.max(scaled.R, 0.3 * scaled.H);
  const H = scaled.H;
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

/**
 * A cone standing on its base, with its radius, slant side and dashed height
 * as asked. Drawn between 0.55 and 0.8 of its height across the radius, so a
 * flat cone keeps room inside for the height's label and a thin one does not
 * shrink to a spike.
 */
export function coneSvg(r: number, h: number, labels: { radius?: string; diameter?: string; slant?: string; height?: string }): string {
  const scaled = roundScale(r, h);
  const ratio = clamp(scaled.R / scaled.H, 0.55, 0.8);
  // A thin cone widens at its fitted height; a flat one grows taller at its fitted width.
  const R = ratio * scaled.H > scaled.R ? ratio * scaled.H : scaled.R;
  const H = R / ratio;
  const apex: Pt = [150, 22];
  const base: Pt = [150, 22 + H];
  const height = base[1] + R * 0.3 + 26;
  const left: Pt = [base[0] - R, base[1]];
  const right: Pt = [base[0] + R, base[1]];
  const parts = [svgOpen(height, 'A cone'), ellipse(base, R, false)];
  parts.push(seg(apex, left), seg(apex, right));
  const place = new Labels(height);
  place.line(apex, left);
  place.line(apex, right);
  place.curve(ellipseLine(base, R, R * 0.3));
  // Below the base ellipse, clear of its front edge.
  const under = base[1] + R * 0.3 + 12;
  if (labels.radius) {
    parts.push(dot(base, 2.5), seg(base, right, DASHED), place.put(labels.radius, [[base[0] + R / 2, under]]));
    place.line(base, right);
  }
  if (labels.diameter) {
    parts.push(seg(left, right, DASHED), place.put(labels.diameter, [[base[0], under]]));
    place.line(left, right);
  }
  if (labels.height) {
    parts.push(seg(apex, base, DASHED));
    place.line(apex, base);
  }
  if (labels.slant) parts.push(place.edge(apex, right, labels.slant, base));
  if (labels.height) {
    // Inside the cone, left of the dashed line, as low as the back of the base allows.
    const [hw] = labelHalf(labels.height);
    parts.push(place.within(labels.height, [apex, left, right], [base[0] - hw - 6, (apex[1] + base[1]) / 2 + H / 6]));
  }
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/**
 * A sphere (or a hemisphere, cut flat on top) with its radius or diameter
 * drawn. The label sits above the back of the ellipse, since a label on the
 * line itself runs into the dashed back edge.
 */
export function sphereSvg(labels: { radius?: string; diameter?: string }, hemi = false): string {
  const R = 80;
  const ry = R * 0.3;
  const c: Pt = [150, hemi ? 58 : 108];
  const parts = [svgOpen(c[1] + R + 12, hemi ? 'A hemisphere' : 'A sphere')];
  if (hemi) {
    parts.push(`<path d="M ${c[0] - R} ${c[1]} A ${R} ${R} 0 0 0 ${c[0] + R} ${c[1]}" fill="none" stroke="currentColor" stroke-width="2" />`, ellipse(c, R, true));
  } else {
    parts.push(`<circle cx="${c[0]}" cy="${c[1]}" r="${R}" fill="none" stroke="currentColor" stroke-width="2" />`, ellipse(c, R, false));
  }
  const over = c[1] - ry - 11;
  if (labels.radius) parts.push(dot(c, 2.5), seg(c, [c[0] + R, c[1]]), text([c[0] + R / 2, over], labels.radius));
  if (labels.diameter) parts.push(dot(c, 2.5), seg([c[0] - R, c[1]], [c[0] + R, c[1]]), text([c[0], over], labels.diameter));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** The net of a cuboid: a cross of six rectangles, front face in the middle. */
export function cuboidNetSvg(l: number, w: number, h: number, labels: { l: string; w: string; h: string }): string {
  // Across: side, front, side, back; up the middle: top above the front, bottom below.
  const across = [w, l, w, l];
  const total = 2 * (l + w);
  const tall = h + 2 * w;
  // 220 across leaves room at each end for the labels beside the net.
  const k = Math.min(220 / total, 170 / tall);
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
  parts.push(text([x0 - 6, y0 + (w + h / 2) * k], labels.h, 13, 'end'));
  parts.push(text([fx + l * k + 8, y0 + (w / 2) * k], labels.w, 13, 'start'));
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
      prompt: [diagram(cuboidFigure(p)), say('Fill in the area of one front, one top and one side face, then the total surface area, in\u00a0cm².')],
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
    if (p.kind === 'cuboid') return typed([diagram(cuboidFigure(p)), say('Find the surface area of the cuboid, in\u00a0cm².')], cuboidSA(p), 'A =');
    if (p.kind === 'cube') return typed([diagram(cuboidSvg(p.l, p.l, p.l, { l: cm(p.l) })), say('Find the surface area of the cube, in\u00a0cm².')], 6 * p.l * p.l, 'A =');
    return typed([diagram(cuboidSvg(p.l, p.l, p.l, { l: 'x' })), say(`A cube has a surface area of $${cm2(6 * p.l * p.l)}.$ Find the length of an edge, $x$, in\u00a0cm.`)], p.l, 'x =');
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
  { text: 'The three rectangles round the sides are the perimeter of an end times the length:' },
  { tex: `${p.a} + ${p.b} + ${p.c} = ${p.a + p.b + p.c}` },
  { tex: `${p.a + p.b + p.c} \\times ${p.L} = ${(p.a + p.b + p.c) * p.L}` },
  { tex: `A = ${p.a * p.b} + ${(p.a + p.b + p.c) * p.L} = ${prismSA(p)}` },
];

const geoPrismSA: Generator<PrismParams> = {
  id: 'geo-prism-sa',
  sample: samplePrism,
  render(p) {
    const extra = p.hideC ? ' The ends are right-angled triangles.' : '';
    return typed([diagram(prismFigure(p)), say(`Find the surface area of the prism, in\u00a0cm².${extra}`)], prismSA(p), 'A =');
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
      prompt: [diagram(prismFigure(p)), say('Work out the surface area in\u00a0cm²: the two ends, the perimeter of an end, the sides, then the total.')],
      // The bracket is braced so a narrow screen breaks the line after the first +, never inside it.
      expression: `2 \\times \\tfrac{1}{2} \\times ${p.a} \\times ${p.b} + {(${p.a} + ${p.b} + ${p.c})} \\times ${p.L}`,
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
      prompt: [diagram(cylFigure(p)), say('Find the total surface area of the cylinder in\u00a0cm². Leave $\\pi$ in the answer.')],
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
        [diagram(cylinderSvg(r, h, { radius: cm(r), height: 'x' })), say(`The curved surface of the cylinder has an area of $${piTex(2 * r * h)}\\text{ cm}^2.$ Find its height $x$, in\u00a0cm.`)],
        h,
        'x =',
      );
    }
    return {
      kind: 'expression',
      prompt: [diagram(cylinderSvg(r, h, { radius: cm(r), height: cm(h) })), say('Find the area of the curved surface only, in\u00a0cm². Leave $\\pi$ in the answer.')],
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
    return typed([diagram(pyramidSvg(p.s, p.H, labels)), say(`Find the surface area of the square-based pyramid, in\u00a0cm².${extra}`)], pyrSA(p), 'A =');
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
      prompt: [diagram(coneFigure(p)), say(`Find the ${p.total ? 'total surface area' : 'area of the curved surface'} of the cone in\u00a0cm². Leave $\\pi$ in the answer.`)],
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
      prompt: [diagram(coneFigure(p)), say(`Fill in the curved surface $C$, then the total surface area $A$, in\u00a0cm².${lead}`)],
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
