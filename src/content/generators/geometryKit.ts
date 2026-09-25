/**
 * Figures and shared pieces for the Geometry course.
 *
 * The owner's rule for this course is that every diagram labels the sides and
 * angles its question needs, so the helpers here all take a label: an angle is
 * drawn as a shaded wedge with its size written in it (`65°`), and the angle
 * asked for is drawn in the accent colour and named `x`. A figure is drawn to
 * its own numbers, never to a stock picture, so a 40° angle looks like 40°.
 *
 * Angles are given in degrees, measured anticlockwise from east as in a maths
 * textbook; the SVG's y axis runs down, which `dir` takes care of. Lines use
 * `currentColor` and shading the theme's `plot-shade`, so a figure reads in
 * either theme. Labels are plain SVG text (KaTeX cannot render inside SVG).
 */
import type { Block, ChoiceOption, Slide } from '../types';

export type Pt = [number, number];

export const f1 = (v: number) => v.toFixed(1);
export const plus = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
export const minus = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
export const times = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
export const rad = (deg: number) => (deg * Math.PI) / 180;

/** The unit vector at `deg` anticlockwise from east, in SVG coordinates. */
export const dir = (deg: number): Pt => [Math.cos(rad(deg)), -Math.sin(rad(deg))];

/** The point `r` from `v` in direction `deg`. */
export const toward = (v: Pt, deg: number, r: number): Pt => plus(v, times(dir(deg), r));

/** The direction from `a` to `b`, in degrees anticlockwise from east, in [0, 360). */
export function heading(a: Pt, b: Pt): number {
  const d = (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI;
  return (d + 360) % 360;
}

export function unit(from: Pt, to: Pt): Pt {
  const [dx, dy] = minus(to, from);
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

export const centroid = (pts: Pt[]): Pt => times(pts.reduce((s, p) => plus(s, p), [0, 0] as Pt), 1 / pts.length);

/** The degree sign after a number, as a figure writes it. */
export const deg = (n: number) => `${n}°`;

export const svgOpen = (height: number, label: string) =>
  `<svg viewBox="0 0 300 ${Math.round(height)}" width="100%" role="img" aria-label="${label}">`;

export const SVG_CLOSE = '</svg>';

export const seg = (a: Pt, b: Pt, extra = '') =>
  `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="currentColor" stroke-width="2" stroke-linecap="round"${extra} />`;

export const DASHED = ' stroke-dasharray="5 4"';

export function outline(pts: Pt[], extra = ''): string {
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${f1(x)} ${f1(y)}`).join(' ') + ' Z';
  return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"${extra} />`;
}

/** Text centred on `p`. An unknown is set in italics, as a letter in algebra is. */
export function text(p: Pt, value: string, size = 13, anchor = 'middle'): string {
  const italic = /^[a-z]$/.test(value) ? ' font-style="italic"' : '';
  return `<text x="${f1(p[0])}" y="${f1(p[1])}" font-size="${size}" fill="currentColor" text-anchor="${anchor}" dominant-baseline="middle"${italic}>${value}</text>`;
}

/**
 * Half the width and half the height a label takes up, estimated from its
 * length (the figure font sets a digit at about 0.55 em). Used to keep a label
 * clear of the lines beside it however long it is: "8 cm" and "31.5π cm" need
 * different distances from the same side.
 */
export function labelHalf(value: string, size = 13): Pt {
  return [0.29 * size * [...value].length, 0.5 * size];
}

/** How far a label centred on a point reaches from it in the unit direction `n`. */
export function reach(value: string, n: Pt, size = 13): number {
  const [hw, hh] = labelHalf(value, size);
  return hw * Math.abs(n[0]) + hh * Math.abs(n[1]);
}

export const dot = (p: Pt, r = 3) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="currentColor" />`;

export interface AngleOptions {
  /** Radius of the wedge. */
  r?: number;
  /** How far out the label sits along the bisector; by default further for a thin angle. */
  R?: number;
  /** The angle asked for: drawn in the accent colour, unshaded. */
  unknown?: boolean;
  /** Draw a 90° angle as the small square instead of a wedge. */
  square?: boolean;
}

/**
 * How far along the bisector an angle's label sits: far enough that the text
 * clears the wedge's arc, and (for an angle under 180°) both arms. A fixed
 * distance put a wide label such as "121°" on the arc when the bisector ran
 * across the page, and on an arm when the angle was thin. Pushing out for a
 * thin angle is capped, so its label never drifts far from the corner.
 */
function labelDistance(label: string, from: number, sweep: number, r: number): number {
  const base = sweep < 30 ? r + 26 : sweep < 55 ? r + 18 : r + 14;
  if (!label) return base;
  const arc = r + 5 + reach(label, dir(from + sweep / 2));
  if (sweep >= 180) return Math.max(base, arc);
  const arms = (Math.max(reach(label, dir(from + 90)), reach(label, dir(from + sweep + 90))) + 3) / Math.sin(rad(sweep / 2));
  return Math.max(base, arc, Math.min(arms, base + 22));
}

/**
 * The angle at `v` swept anticlockwise from direction `from` through `sweep`
 * degrees, shaded, with `label` written along its bisector.
 */
export function angle(v: Pt, from: number, sweep: number, label: string, o: AngleOptions = {}): string {
  const r = o.r ?? (sweep < 40 ? 26 : 20);
  const mid = from + sweep / 2;
  const R = o.R ?? labelDistance(label, from, sweep, r);
  const at = toward(v, mid, R);
  const cls = o.unknown ? ' class="plot-accent"' : '';
  if (o.square && Math.abs(sweep - 90) < 1e-9) {
    const s = 11;
    const p = toward(v, from, s);
    const q = toward(v, from + 90, s);
    const c = plus(p, times(dir(from + 90), s));
    return `<g${cls}><path d="M ${f1(p[0])} ${f1(p[1])} L ${f1(c[0])} ${f1(c[1])} L ${f1(q[0])} ${f1(q[1])}" fill="none" stroke="currentColor" stroke-width="1.5" />${label ? text(toward(v, mid, 30), label) : ''}</g>`;
  }
  const s = toward(v, from, r);
  const e = toward(v, from + sweep, r);
  const large = sweep > 180 ? 1 : 0;
  // Anticlockwise on the page is sweep-flag 0, because SVG's y runs down.
  const arc = `M ${f1(s[0])} ${f1(s[1])} A ${r} ${r} 0 ${large} 0 ${f1(e[0])} ${f1(e[1])}`;
  const wedge = o.unknown ? '' : `<path class="plot-shade" d="M ${f1(v[0])} ${f1(v[1])} L ${f1(s[0])} ${f1(s[1])} A ${r} ${r} 0 ${large} 0 ${f1(e[0])} ${f1(e[1])} Z" />`;
  return `<g${cls}>${wedge}<path d="${arc}" fill="none" stroke="currentColor" stroke-width="1.5" />${text(at, label)}</g>`;
}

/** The interior angle of a polygon at vertex `v`, between its neighbours `a` and `b`, however the polygon runs. */
export function cornerAngle(a: Pt, v: Pt, b: Pt, label: string, o: AngleOptions = {}): string {
  const ha = heading(v, a);
  const hb = heading(v, b);
  let sweep = (hb - ha + 360) % 360;
  let from = ha;
  if (sweep > 180) {
    from = hb;
    sweep = 360 - sweep;
  }
  return angle(v, from, sweep, label, o);
}

/** `count` tick marks across the middle of a side, marking equal lengths. */
export function ticks(a: Pt, b: Pt, count: number): string {
  const mid = times(plus(a, b), 0.5);
  const along = unit(a, b);
  const across: Pt = [-along[1], along[0]];
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const c = plus(mid, times(along, (i - (count - 1) / 2) * 5));
    out.push(seg(plus(c, times(across, 6)), plus(c, times(across, -6)), ' stroke-width="1.5"'));
  }
  return out.join('');
}

/** `count` arrowheads on a line from `a` to `b`, the mark for parallel lines. */
export function parallelArrows(a: Pt, b: Pt, count: number, at = 0.5): string {
  const along = unit(a, b);
  const across: Pt = [-along[1], along[0]];
  const base = plus(a, times(minus(b, a), at));
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const tip = plus(base, times(along, i * 7));
    const back = plus(tip, times(along, -7));
    out.push(
      `<path d="M ${f1(back[0] + across[0] * 5)} ${f1(back[1] + across[1] * 5)} L ${f1(tip[0])} ${f1(tip[1])} L ${f1(back[0] - across[0] * 5)} ${f1(back[1] - across[1] * 5)}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />`,
    );
  }
  return out.join('');
}

/**
 * Where a label beside the middle of side ab goes, on the side away from
 * `inside`: `gap` out from the side, or further when the text is wide enough
 * to reach back over the line (a long label beside an upright side).
 */
export function sideLabelAt(a: Pt, b: Pt, value: string, inside: Pt, gap = 14, clear = 5): Pt {
  const mid = times(plus(a, b), 0.5);
  const along = unit(a, b);
  let across: Pt = [-along[1], along[0]];
  const toInside = minus(inside, mid);
  if (across[0] * toInside[0] + across[1] * toInside[1] > 0) across = times(across, -1);
  return plus(mid, times(across, Math.max(gap, clear + reach(value, across))));
}

/** A label beside the middle of side ab, on the side away from `inside`. */
export function sideLabel(a: Pt, b: Pt, value: string, inside: Pt, gap = 14, clear = 5): string {
  return text(sideLabelAt(a, b, value, inside, gap, clear), value);
}

/** Points scaled and centred into a box `w` by `h` with its corner at (x0, y0). Keeps SVG orientation. */
export function fit(points: Pt[], w: number, h: number, x0: number, y0: number): Pt[] {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const k = Math.min(w / (maxX - minX || 1), h / (maxY - minY || 1));
  const offX = x0 + (w - (maxX - minX) * k) / 2;
  const offY = y0 + (h - (maxY - minY) * k) / 2;
  return points.map(([x, y]) => [offX + (x - minX) * k, offY + (y - minY) * k]);
}

/**
 * The corners of a polygon with these interior angles, walked anticlockwise
 * from the origin along east. Side lengths are chosen to close the shape: all
 * but the last two are `sides`, and the last two are solved for. Returns
 * undefined when that needs a side that is too short or negative, so a caller
 * can try other lengths.
 */
export function polygonFromAngles(angles: number[], sides: number[]): Pt[] | undefined {
  const n = angles.length;
  // Direction of side i (from corner i to corner i+1); corner 0 is at the origin.
  const headings: number[] = [0];
  for (let i = 1; i < n; i += 1) headings.push(headings[i - 1] + (180 - angles[i]));
  const pts: Pt[] = [[0, 0]];
  for (let i = 0; i < n - 2; i += 1) pts.push(toward(pts[i], headings[i], sides[i]));
  // Solve p + s·d(n-2) + t·d(n-1) = origin.
  const p = pts[n - 2];
  const d1 = dir(headings[n - 2]);
  const d2 = dir(headings[n - 1]);
  const det = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(det) < 1e-6) return undefined;
  const rx = -p[0];
  const ry = -p[1];
  const s = (rx * d2[1] - ry * d2[0]) / det;
  const t = (d1[0] * ry - d1[1] * rx) / det;
  const shortest = Math.min(...sides.slice(0, n - 2));
  if (s < 0.45 * shortest || t < 0.45 * shortest) return undefined;
  const longest = Math.max(...sides.slice(0, n - 2));
  if (s > 2.2 * longest || t > 2.2 * longest) return undefined;
  pts.push(toward(p, headings[n - 2], s));
  return pts;
}

/**
 * The corners of a triangle with angles A, B at the ends of its base, apex
 * last, in SVG orientation with the base along the bottom.
 */
export function triangleFromAngles(A: number, B: number): Pt[] {
  const C = 180 - A - B;
  // Base 1; side from A to apex by the sine rule.
  const b = Math.sin(rad(B)) / Math.sin(rad(C));
  return [[0, 0], [1, 0], toward([0, 0], A, b)];
}

/* ================================================================
 * Choice slides with worded options
 * ================================================================ */

/**
 * A native choice slide from options, turned by a hash of their labels so the
 * answer is not always first yet one question always renders one way (the
 * same rule the derived `+choice` slides follow).
 */
export function choiceSlide(prompt: Block[], opts: ChoiceOption[], tex = true): Slide {
  let hash = 0;
  for (const option of opts) {
    for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
  }
  const turn = Math.abs(hash) % opts.length;
  const ordered = [...opts.slice(turn), ...opts.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    // A worded option longer than a word is plain text, so it wraps; one TeX text box cannot.
    options: ordered.map((o, i) => ({ id: `opt${i}`, label: o.tex, tex })),
    correctId: `opt${ordered.findIndex((o) => o.correct)}`,
  };
}

/** A word as a TeX option label. */
export const word = (w: string) => `\\text{${w}}`;
