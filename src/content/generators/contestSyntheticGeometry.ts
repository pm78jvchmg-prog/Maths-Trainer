/**
 * Contest Math, level 18: Synthetic Geometry.
 *
 * Seven lessons, each a step past Levels 4 to 6: Pythagoras used where no
 * right triangle is drawn (a point inside a rectangle, a snapped pole, a box
 * unfolded flat), triangle areas from three sides (Heron) and from a point
 * inside (the incircle), similar triangles found by an angle rather than a
 * parallel line, the angle bisector theorem and the incentre, the power of a
 * point, cyclic quadrilaterals (angles on one arc, Ptolemy, Brahmagupta), and
 * tangents to circles.
 *
 * Every answer is exact: a whole number, a terminating decimal, a fraction
 * typed with `/`, or a surd typed with the `√(` key. Shared helpers are in
 * `contestMath.ts`; the figure helpers below are this level's own.
 */
import type { ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { FRACTION_KEYS, fracAnswer, fracTex, gcd, num, numberBank, numberOptions, say, typed } from './contestMath';
import { options } from '../choiceVariant';

/** The keypad for an exact length: digits and a square root. */
const SURD_KEYS: KeypadKey[] = [{ insert: 'sqrt(', label: '√(' }];

const isSquare = (n: number): boolean => {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
};
const iroot = (n: number) => Math.round(Math.sqrt(n));
/** At most two decimal places, so a typed answer is short and exact. */
const twoPlaces = (x: number) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-9;

/** numberOptions with any slip that does not end within two decimal places dropped, so no option reads 12.923077. */
const tidyOptions = (correct: number, slips: number[], step = 1, min = 0) =>
  numberOptions(correct, slips.map((x) => (twoPlaces(x) ? x : NaN)), step, min);

/* ================================================================
 * Surds and fractions as options
 * ================================================================ */

/** c√r with c and r whole; r = 1 is a plain whole number. */
type Surd = [number, number];

/** √n with the square factors pulled out. */
function surd(n: number): Surd {
  let c = 1;
  let r = n;
  for (let f = 2; f * f <= r; f += 1) {
    while (r % (f * f) === 0) {
      r /= f * f;
      c *= f;
    }
  }
  return [c, r];
}

function surdTex([c, r]: Surd): string {
  if (r === 1) return num(c);
  return c === 1 ? `\\sqrt{${r}}` : `${num(c)}\\sqrt{${r}}`;
}

function surdAnswer([c, r]: Surd): string {
  if (r === 1) return num(c);
  return c === 1 ? `sqrt(${r})` : `${num(c)}*sqrt(${r})`;
}

const surdValue = ([c, r]: Surd) => c * Math.sqrt(r);

/** `\\sqrt{38}` written out, or `\\sqrt{50} = 5\\sqrt{2}`, or `\\sqrt{49} = 7`. */
function rootSteps(n: number): string {
  const s = surd(n);
  return s[0] === 1 ? `\\sqrt{${n}}` : `\\sqrt{${n}} = ${surdTex(s)}`;
}

/** Four options: the answer and the first three slips worth something different, topped up with nearby multiples. */
function surdOptions(correct: Surd, slips: Surd[]): ChoiceOption[] {
  const seen = [surdValue(correct)];
  const picked: Surd[] = [];
  const [c, r] = correct;
  const pool: Surd[] = [...slips, [c + 1, r], [c * 2, r], [c + 2, r], [c + 3, r]];
  for (const s of pool) {
    if (picked.length === 3) break;
    if (!(s[0] > 0) || !Number.isInteger(s[0]) || !(s[1] >= 1)) continue;
    const v = surdValue(s);
    if (seen.some((w) => Math.abs(w - v) < 1e-9)) continue;
    seen.push(v);
    picked.push(s);
  }
  picked.sort((x, y) => surdValue(x) - surdValue(y));
  return options({ tex: surdTex(correct), answer: surdAnswer(correct) }, ...picked.map((s) => ({ tex: surdTex(s), answer: surdAnswer(s) })));
}

type Frac = [number, number];

/** Four fraction options, the slips first, topped up with near misses, sorted by value. */
function fracOptions(correct: Frac, slips: Frac[]): ChoiceOption[] {
  const val = ([p, q]: Frac) => p / q;
  const seen = [val(correct)];
  const picked: Frac[] = [];
  const [p, q] = correct;
  const pool: Frac[] = [...slips, [q, p], [p + 1, q], [p, q + 1], [p + q, q], [2 * p, q]];
  for (const s of pool) {
    if (picked.length === 3) break;
    if (!(s[0] > 0 && s[1] > 0) || !Number.isInteger(s[0]) || !Number.isInteger(s[1])) continue;
    const v = val(s);
    if (seen.some((w) => Math.abs(w - v) < 1e-9)) continue;
    seen.push(v);
    picked.push(s);
  }
  picked.sort((x, y) => val(x) - val(y));
  return options(
    { tex: fracTex(p, q), answer: fracAnswer(p, q) },
    ...picked.map(([a, b]) => ({ tex: fracTex(a, b), answer: fracAnswer(a, b) })),
  );
}

/** Angle options in degrees: slips outside 1 to 179 are dropped. */
const angleOptions = (correct: number, slips: number[]) => tidyOptions(correct, slips.filter((v) => v > 0 && v < 180), 1, 1);

/* ================================================================
 * Figures. Plain SVG text only (KaTeX cannot render inside SVG), and
 * `currentColor` throughout so a figure reads in either theme. Model
 * coordinates have y upwards; `frame` fits them into a 300-wide box.
 * ================================================================ */

type Pt = [number, number];

const f1 = (v: number) => v.toFixed(1);
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (r: number, deg: number): Pt => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];
const dot2 = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];

function dir(from: Pt, to: Pt): Pt {
  const d = dist(from, to) || 1;
  return [(to[0] - from[0]) / d, (to[1] - from[1]) / d];
}

const centroid = (pts: Pt[]): Pt => mul(pts.reduce((s, p) => add(s, p), [0, 0] as Pt), 1 / pts.length);

/** Distance from p to the segment ab. */
function segDist(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const len2 = dot2(ab, ab) || 1;
  const t = Math.max(0, Math.min(1, dot2(sub(p, a), ab) / len2));
  return dist(p, add(a, mul(ab, t)));
}

/** The foot of the perpendicular from p to the line ab. */
function foot(p: Pt, a: Pt, b: Pt): Pt {
  const ab = sub(b, a);
  const t = dot2(sub(p, a), ab) / (dot2(ab, ab) || 1);
  return add(a, mul(ab, t));
}

interface Frame {
  at: (p: Pt) => Pt;
  k: number;
  height: number;
}

/** Fit model points (y up) into the 300-wide frame, `pad` pixels clear on every side. */
function frame(pts: Pt[], maxH = 210, pad = 28): Frame {
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

function svg(height: number, label: string, body: string[]): string {
  return [`<svg viewBox="0 0 300 ${Math.round(height)}" width="100%" role="img" aria-label="${label}">`, ...body, '</svg>'].join('');
}

const seg = (a: Pt, b: Pt, dashed = false, width = 2) =>
  `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="currentColor" stroke-width="${width}"${dashed ? ' stroke-dasharray="5 4"' : ''} />`;

const pathOf = (pts: Pt[]) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${f1(x)} ${f1(y)}`).join(' ') + ' Z';

const outline = (pts: Pt[]) => `<path d="${pathOf(pts)}" fill="none" stroke="currentColor" stroke-width="2" />`;

const shade = (pts: Pt[]) => `<path class="plot-shade" d="${pathOf(pts)}" />`;

const ring = (c: Pt, r: number, dashed = false) =>
  `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="none" stroke="currentColor" stroke-width="${dashed ? 1.5 : 2}"${dashed ? ' stroke-dasharray="5 4"' : ''} />`;

const dot = (p: Pt, r = 3) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="currentColor" />`;

const txt = (p: Pt, text: string, anchor: 'start' | 'middle' | 'end' = 'middle', size = 13) =>
  `<text x="${f1(p[0])}" y="${f1(p[1])}" font-size="${size}" fill="currentColor" text-anchor="${anchor}" dominant-baseline="middle">${text}</text>`;

/** Where `vtx` puts a letter. */
const vtxAt = (p: Pt, from: Pt, gap = 13) => add(p, mul(dir(from, p), gap));

/** A letter beside point p, pushed away from `from`. */
const vtx = (p: Pt, name: string, from: Pt, gap = 13) => txt(vtxAt(p, from, gap), name);

/** How far a label's centre must sit from a line to clear it, for text of `len` characters. */
const clearance = (n: Pt, len: number) => 7 + Math.abs(n[0]) * 3.6 * len + Math.abs(n[1]) * 3;

/**
 * A label beside segment ab, at fraction `t` along it, on whichever side is
 * further from the `avoid` segments.
 */
function beside(a: Pt, b: Pt, text: string, avoid: [Pt, Pt][] = [], t = 0.5): string {
  return txt(besidePt(a, b, text, avoid, t), text);
}

/** Where `beside` puts its label. */
function besidePt(a: Pt, b: Pt, text: string, avoid: [Pt, Pt][] = [], t = 0.5): Pt {
  const m = lerp(a, b, t);
  const d = dir(a, b);
  const n: Pt = [-d[1], d[0]];
  const gap = clearance(n, text.length);
  const c1 = add(m, mul(n, gap));
  const c2 = add(m, mul(n, -gap));
  const score = (c: Pt) => (avoid.length ? Math.min(...avoid.map(([p, q]) => segDist(c, p, q))) : 0);
  return score(c1) >= score(c2) ? c1 : c2;
}

/** A label beside segment ab, at whichever point along it and side of it is furthest from the `avoid` segments. */
function besideClear(a: Pt, b: Pt, text: string, avoid: [Pt, Pt][]): string {
  let best: Pt = lerp(a, b, 0.5);
  let bestScore = -1;
  for (const t of [0.25, 0.35, 0.45, 0.55, 0.65, 0.75]) {
    const c = besidePt(a, b, text, avoid, t);
    const score = Math.min(...avoid.map(([p, q]) => segDist(c, p, q)));
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return txt(best, text);
}

/** A label beside segment ab on the side away from `inside`. */
function outside(a: Pt, b: Pt, text: string, inside: Pt): string {
  const m = lerp(a, b, 0.5);
  const d = dir(a, b);
  let n: Pt = [-d[1], d[0]];
  if (dot2(n, sub(inside, m)) > 0) n = mul(n, -1);
  return txt(add(m, mul(n, clearance(n, text.length))), text);
}

/** A label for a chord of a circle, outside the circle beyond the chord's arc. */
function chordLabel(a: Pt, b: Pt, text: string, o: Pt, r: number): string {
  const m = lerp(a, b, 0.5);
  const out = dir(o, m);
  return txt(add(o, mul(out, r + 6 + clearance(out, text.length))), text);
}

/** A letter beside point p, in the widest gap between the lines from p to `ends`. */
function gapLetter(p: Pt, ends: Pt[], name: string, gap = 13): string {
  const dirs = ends.map((e) => (Math.atan2(e[1] - p[1], e[0] - p[0]) * 180) / Math.PI).sort((a, b) => a - b);
  let bestMid = 0;
  let bestGap = -1;
  dirs.forEach((t, i) => {
    const next = i === dirs.length - 1 ? dirs[0] + 360 : dirs[i + 1];
    if (next - t > bestGap) {
      bestGap = next - t;
      bestMid = (t + next) / 2;
    }
  });
  // Far enough out that a letter about 7 across clears the lines either side.
  const out = Math.min(30, Math.max(gap, 7 / Math.sin(((bestGap / 2) * Math.PI) / 180)));
  return txt(add(p, polar(out, bestMid)), name, 'middle', 12);
}

/** An arc at v between the rays towards a and b, with its label out along the bisector. */
function angleMark(v: Pt, a: Pt, b: Pt, label: string, r = 16, R = 31): string {
  const u1 = dir(v, a);
  const u2 = dir(v, b);
  const s = add(v, mul(u1, r));
  const e = add(v, mul(u2, r));
  const cross = u1[0] * u2[1] - u1[1] * u2[0];
  const mid = dir([0, 0], add(u1, u2));
  return [
    `<path d="M ${f1(s[0])} ${f1(s[1])} A ${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${f1(e[0])} ${f1(e[1])}" fill="none" stroke="currentColor" stroke-width="1.5" />`,
    label ? txt(add(v, mul(mid, R)), label, 'middle', 12) : '',
  ].join('');
}

/** The small square marking a right angle at v. */
function rightMark(v: Pt, a: Pt, b: Pt, size = 9): string {
  const p = add(v, mul(dir(v, a), size));
  const q = add(v, mul(dir(v, b), size));
  const c = add(p, mul(dir(v, b), size));
  return `<path d="M ${f1(p[0])} ${f1(p[1])} L ${f1(c[0])} ${f1(c[1])} L ${f1(q[0])} ${f1(q[1])}" fill="none" stroke="currentColor" stroke-width="1.5" />`;
}

/* ---------- labels kept clear of everything drawn ---------- */

/** Half the width and half the height of a label's letters at `size`. */
const halfBox = (text: string, size = 13): Pt => [0.31 * size * text.length + 1.5, 0.36 * size + 1];

/** How far the box of half-size h centred at c stands from the segment ab: 0 when they touch. */
function boxGap(c: Pt, h: Pt, a: Pt, b: Pt): number {
  const [x0, x1, y0, y1] = [c[0] - h[0], c[0] + h[0], c[1] - h[1], c[1] + h[1]];
  // Liang-Barsky: does ab cross the box?
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      t0 = Math.max(t0, r);
    } else {
      if (r < t0) return false;
      t1 = Math.min(t1, r);
    }
    return true;
  };
  if (clip(-dx, a[0] - x0) && clip(dx, x1 - a[0]) && clip(-dy, a[1] - y0) && clip(dy, y1 - a[1])) return 0;
  const toBox = (p: Pt) => Math.hypot(Math.max(0, x0 - p[0], p[0] - x1), Math.max(0, y0 - p[1], p[1] - y1));
  const corners: Pt[] = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
  return Math.min(toBox(a), toBox(b), ...corners.map((q) => segDist(q, a, b)));
}

/**
 * What a figure has drawn so far, as short segments (a circle or an arc as
 * chords, a label as the four sides of its box), so each new label can go
 * wherever it stands clearest of all of it and of the edge of the frame.
 */
export class Clearance {
  private segs: [Pt, Pt][] = [];
  private height: number;
  /** The least room any label placed so far was left with: below 0, one touches something. */
  worst = Infinity;

  constructor(height: number) {
    this.height = height;
  }

  line(...pts: Pt[]): this {
    for (let i = 0; i + 1 < pts.length; i += 1) this.segs.push([pts[i], pts[i + 1]]);
    return this;
  }

  loop(pts: Pt[]): this {
    return this.line(...pts, pts[0]);
  }

  circle(c: Pt, r: number): this {
    return this.loop(Array.from({ length: 60 }, (_, i) => add(c, polar(r, i * 6))));
  }

  /** The arc `angleMark` draws at v, radius r. */
  arc(v: Pt, a: Pt, b: Pt, r: number): this {
    const t1 = Math.atan2(a[1] - v[1], a[0] - v[0]);
    let t2 = Math.atan2(b[1] - v[1], b[0] - v[0]);
    if (t2 - t1 > Math.PI) t2 -= 2 * Math.PI;
    if (t1 - t2 > Math.PI) t2 += 2 * Math.PI;
    return this.line(...Array.from({ length: 9 }, (_, i): Pt => add(v, [r * Math.cos(t1 + ((t2 - t1) * i) / 8), r * Math.sin(t1 + ((t2 - t1) * i) / 8)])));
  }

  box(c: Pt, text: string, size = 13): this {
    const [w, h] = halfBox(text, size);
    return this.loop([add(c, [-w, -h]), add(c, [w, -h]), add(c, [w, h]), add(c, [-w, h])]);
  }

  /**
   * How far a label at c stands from everything drawn and from the frame's
   * edge. Once that is known to be no more than `floor` it stops looking, and
   * a segment whose bounding box is already further off than the best so far
   * is skipped: samplers lay a figure out many times to reject a crowded one.
   */
  gap(c: Pt, text: string, size = 13, floor = -Infinity): number {
    const h = halfBox(text, size);
    const [x0, x1, y0, y1] = [c[0] - h[0], c[0] + h[0], c[1] - h[1], c[1] + h[1]];
    let best = Math.min(x0, 300 - x1, y0, this.height - y1);
    for (const [a, b] of this.segs) {
      if (best <= floor) return best;
      const ox = Math.max(0, Math.min(a[0], b[0]) - x1, x0 - Math.max(a[0], b[0]));
      const oy = Math.max(0, Math.min(a[1], b[1]) - y1, y0 - Math.max(a[1], b[1]));
      if (ox >= best || oy >= best) continue;
      best = Math.min(best, boxGap(c, h, a, b));
    }
    return best;
  }

  /** The first spot at least `want` clear, or failing that the clearest; drawn, and kept clear of from now on. */
  put(spots: Pt[], text: string, size = 13, want = 3.5): string {
    let best = spots[0];
    let bestGap = -Infinity;
    for (const s of spots) {
      // A spot matters only if it beats the clearest so far, which is short of `want`.
      const g = this.gap(s, text, size, bestGap);
      if (g >= want) {
        best = s;
        bestGap = g;
        break;
      }
      if (g > bestGap) {
        bestGap = g;
        best = s;
      }
    }
    this.worst = Math.min(this.worst, bestGap);
    this.box(best, text, size);
    return txt(best, text, 'middle', size);
  }
}

/** Spots on rings round p, nearest first, each ring starting from the direction `from` → p. */
export function ringSpots(p: Pt, from: Pt, radii = [12, 15, 19, 24]): Pt[] {
  const start = Math.atan2(p[1] - from[1], p[0] - from[0]);
  const out: Pt[] = [];
  for (const r of radii) {
    for (let i = 0; i < 16; i += 1) {
      const k = i === 0 ? 0 : (i % 2 === 1 ? 1 : -1) * Math.ceil(i / 2);
      const t = start + (k * Math.PI) / 8;
      out.push(add(p, [r * Math.cos(t), r * Math.sin(t)]));
    }
  }
  return out;
}

/** Spots either side of segment ab for a label `text`, the middle first, then further along each way. */
export function sideSpots(a: Pt, b: Pt, text: string, prefer?: Pt, ts = [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78]): Pt[] {
  const d = dir(a, b);
  let n: Pt = [-d[1], d[0]];
  // The preferred side first: away from `prefer` when it is given.
  if (prefer && dot2(n, sub(prefer, lerp(a, b, 0.5))) > 0) n = mul(n, -1);
  const out: Pt[] = [];
  for (const extra of [0, 4, 9]) {
    const gap = clearance(n, text.length) + extra;
    for (const t of ts) {
      const m = lerp(a, b, t);
      out.push(add(m, mul(n, gap)), add(m, mul(n, -gap)));
    }
  }
  return out;
}

/** Model coordinates of a triangle with `base` along the x-axis from L to R and apex T: |TL| = left, |TR| = right. */
function placeTriangle(base: number, left: number, right: number): [Pt, Pt, Pt] {
  const x = (base * base + left * left - right * right) / (2 * base);
  const y = Math.sqrt(Math.max(0, left * left - x * x));
  return [[0, 0], [base, 0], [x, y]];
}

/** The smallest angle of a triangle with these sides, in degrees. */
function smallestAngle(a: number, b: number, c: number): number {
  const angle = (opp: number, s: number, t: number) => (Math.acos((s * s + t * t - opp * opp) / (2 * s * t)) * 180) / Math.PI;
  return Math.min(angle(a, b, c), angle(b, a, c), angle(c, a, b));
}

const validTriangle = (a: number, b: number, c: number) => a < b + c && b < a + c && c < a + b;

/* ================================================================
 * Lesson 1: The Pythagorean Theorem
 * ================================================================ */

/* ---------- a point inside a rectangle (the British flag theorem) ---------- */

interface FlagParams {
  a: number;
  b: number;
  c: number;
  /** Difficulty 2: PB = PD, both asked; `b` is unused. */
  equal: boolean;
}

const flagB2 = (p: FlagParams) => (p.equal ? (p.a * p.a + p.c * p.c) / 2 : p.b * p.b);
const flagSquare = (p: FlagParams) => (p.equal ? flagB2(p) : p.a * p.a + p.c * p.c - p.b * p.b);

/**
 * Where P sits: x and u split the width, y and v the height, with PA² = x² + y²,
 * PB² = u² + y², PC² = u² + v², PD² = x² + v². y is chosen to keep P well inside.
 */
function flagLayout(a2: number, b2: number, c2: number) {
  const lo = Math.sqrt(Math.max(0, b2 - c2));
  const hi = Math.sqrt(Math.min(a2, b2));
  let best = { x: 1, u: 1, y: 1, v: 1, score: 0 };
  if (hi <= lo) return best;
  for (let i = 1; i < 40; i += 1) {
    const y = lo + ((hi - lo) * i) / 40;
    const x = Math.sqrt(a2 - y * y);
    const u = Math.sqrt(b2 - y * y);
    const v = Math.sqrt(c2 - b2 + y * y);
    const w = x + u;
    const h = y + v;
    const aspect = w / h;
    const score = aspect < 0.6 || aspect > 1.8 ? 0 : Math.min(x, u, y, v) / Math.max(w, h);
    if (score > best.score) best = { x, u, y, v, score };
  }
  return best;
}

function flagSvg(p: FlagParams): string {
  const L = flagLayout(p.a * p.a, flagB2(p), p.c * p.c);
  const W = L.x + L.u;
  const H = L.y + L.v;
  const F = frame([[0, 0], [W, H]], 205, 30);
  const A = F.at([0, 0]);
  const B = F.at([W, 0]);
  const C = F.at([W, H]);
  const D = F.at([0, H]);
  const P = F.at([L.x, L.y]);
  const O = F.at([W / 2, H / 2]);
  const corners: [Pt, string, string][] = [
    [A, 'A', `${p.a}`],
    [B, 'B', p.equal ? 'x' : `${p.b}`],
    [C, 'C', `${p.c}`],
    [D, 'D', p.equal ? 'x' : '?'],
  ];
  const parts = [outline([A, B, C, D])];
  const room = new Clearance(F.height).loop([A, B, C, D]);
  for (const [Q] of corners) {
    parts.push(seg(P, Q, true, 1.5));
    room.line(P, Q);
  }
  for (const [Q, name] of corners) parts.push(vtx(Q, name, O, 14));
  // Each length sits beside its own line, wherever the other lines and the sides leave it most room.
  for (const [Q, , len] of corners) parts.push(room.put(sideSpots(P, Q, len, undefined, [0.55, 0.45, 0.65, 0.35, 0.75]), len));
  parts.push(dot(P), room.put(ringSpots(P, O, [11, 14, 18]), 'P', 12));
  return svg(F.height, 'A rectangle ABCD with a point P inside joined to the four corners', parts);
}

const cmSgBritishFlag: Generator<FlagParams> = {
  id: 'cm-sg-british-flag',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const a = rng.int(1, 13);
        const c = rng.int(1, 13);
        if (a === c || (a + c) % 2 !== 0) continue;
        const p: FlagParams = { a, b: 0, c, equal: true };
        if (flagLayout(a * a, flagB2(p), c * c).score < 0.2) continue;
        return p;
      }
      const a = rng.int(2, 11);
      const b = rng.int(2, 11);
      const c = rng.int(2, 11);
      if (a === b || b === c || a === c) continue;
      const d2 = a * a + c * c - b * b;
      if (d2 < 4 || d2 > 160 || d2 === b * b) continue;
      const p: FlagParams = { a, b, c, equal: false };
      if (flagLayout(a * a, b * b, c * c).score < 0.2) continue;
      return p;
    }
  },
  render(p) {
    const ans = surd(flagSquare(p));
    const given = p.equal ? `$PA = ${p.a}$, $PC = ${p.c}$ and $PB = PD$` : `$PA = ${p.a}$, $PB = ${p.b}$ and $PC = ${p.c}$`;
    return typed(
      [say(`$P$ is a point inside rectangle $ABCD$, with ${given}.`), { kind: 'diagram', svg: flagSvg(p) }, say(`How long is $${p.equal ? 'PB' : 'PD'}$? Give an exact answer.`)],
      surdAnswer(ans),
      p.equal ? 'PB =' : 'PD =',
      SURD_KEYS,
    );
  },
  choices(p) {
    const ans = surd(flagSquare(p));
    const { a, b, c } = p;
    if (p.equal) {
      return surdOptions(ans, [[(a + c) / 2, 1], surd(a * a + c * c), surd(a * c), surd(Math.abs(c * c - a * a))]);
    }
    return surdOptions(ans, [[a + c - b, 1], surd(Math.abs(a * a + b * b - c * c)), surd(Math.abs(b * b + c * c - a * a)), surd(a * a + b * b + c * c)]);
  },
  solution(p) {
    const { a, b, c } = p;
    const steps: SolutionStep[] = [
      { text: 'Drop perpendiculars from $P$ to the sides. They cut the width into $w_{1}$ and $w_{2}$ and the height into $h_{1}$ and $h_{2}$, and each distance to a corner is a hypotenuse:' },
      { tex: 'PA^{2} = w_{1}^{2} + h_{1}^{2}, \\qquad PC^{2} = w_{2}^{2} + h_{2}^{2}' },
      { tex: 'PB^{2} = w_{2}^{2} + h_{1}^{2}, \\qquad PD^{2} = w_{1}^{2} + h_{2}^{2}' },
      { text: 'Each pair of opposite corners uses all four pieces once, so' },
      { tex: 'PA^{2} + PC^{2} = PB^{2} + PD^{2}' },
    ];
    if (p.equal) {
      const t = flagB2(p);
      steps.push(
        { text: 'With $PB = PD = x$:' },
        { tex: `${a}^{2} + ${c}^{2} = 2x^{2}` },
        { tex: `x^{2} = ${a * a + c * c} \\div 2 = ${t}` },
        { tex: `x = ${rootSteps(t)}` },
        { text: `The average of $${a}$ and $${c}$ is the trap: the rule is about squares.` },
      );
      return steps;
    }
    const d2 = flagSquare(p);
    steps.push(
      { tex: `${a}^{2} + ${c}^{2} = ${b}^{2} + PD^{2}` },
      { tex: `PD^{2} = ${a * a} + ${c * c} - ${b * b} = ${d2}` },
      { tex: `PD = ${rootSteps(d2)}` },
    );
    if (a + c - b > 0) steps.push({ text: `Adding and taking away the lengths themselves, $${a} + ${c} - ${b} = ${a + c - b}$, is the trap: the rule is about squares.` });
    return steps;
  },
};

/* ---------- a snapped pole, or a rope from a flagpole ---------- */

/** Primitive triples, shorter leg first. A table, not Math.hypot: the table is the check. */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [12, 35, 37],
  [9, 40, 41],
];

interface PoleParams {
  /** Pole: the height of the break. Rope: the height of the pole. */
  x: number;
  /** How far from the foot the tip, or the rope's end, touches the ground. */
  d: number;
  /** The slanted side: the fallen part, or the taut rope. */
  hyp: number;
  rope: boolean;
}

const poleHeight = (p: PoleParams) => p.x + p.hyp;
const ropeExtra = (p: PoleParams) => p.hyp - p.x;

function samplePole(rng: { pick<T>(items: readonly T[]): T; int(a: number, b: number): number }, rope: boolean, tiles: boolean): PoleParams {
  for (;;) {
    const [s, t, h] = rng.pick(TRIPLES);
    const k = rng.int(1, 8);
    const swap = rng.int(0, 1) === 1;
    const p: PoleParams = { x: (swap ? t : s) * k, d: (swap ? s : t) * k, hyp: h * k, rope };
    if (!rope && poleHeight(p) > 72) continue;
    if (rope && (p.x > 60 || p.d > 60 || ropeExtra(p) > 20)) continue;
    if (tiles) {
      const tokens = rope ? [ropeExtra(p), p.d * p.d, p.x] : [p.d * p.d, poleHeight(p), p.x];
      if (new Set(tokens).size < 3) continue;
    }
    return p;
  }
}

function poleSvg(p: PoleParams): string {
  const h = poleHeight(p);
  const top = p.rope ? p.x : h;
  const F = frame([[0, 0], [0, top], [p.d, 0], [-0.08 * p.d, 0], [1.1 * p.d, 0]], 205, 30);
  const G = F.at([0, 0]);
  const T = F.at([p.d, 0]);
  const X = F.at([0, p.x]);
  const parts = [seg(F.at([-0.08 * p.d, 0]), F.at([1.1 * p.d, 0]), false, 1.5), seg(G, X, false, 3), seg(X, T), rightMark(G, X, T), dot(T, 2.5)];
  parts.push(txt(add(lerp(G, X, 0.5), [-8, 0]), '?', 'end'), txt(add(lerp(G, T, 0.5), [0, 15]), `${p.d}`));
  if (p.rope) {
    parts.push(beside(X, T, `? + ${ropeExtra(p)}`, [[G, X], [G, T]]));
  } else {
    parts.push(seg(X, F.at([0, h]), true, 1.5));
  }
  return svg(
    F.height,
    p.rope ? 'A flagpole with a taut rope from its top to the ground' : 'A snapped pole whose top part has folded over to touch the ground',
    parts,
  );
}

function poleSolution(p: PoleParams): SolutionStep[] {
  const { x, d } = p;
  if (p.rope) {
    const e = ropeExtra(p);
    return [
      { text: `Let the pole be $x$ m tall. The rope is $x + ${e}$, and pulled tight it is the hypotenuse of a right triangle with the pole and the ground:` },
      { tex: `(x + ${e})^{2} = x^{2} + ${d}^{2}` },
      { tex: `x^{2} + ${2 * e}x + ${e * e} = x^{2} + ${d * d}` },
      { text: 'The $x^{2}$ on each side cancel, leaving a plain equation:' },
      { tex: `${2 * e}x = ${d * d} - ${e * e} = ${d * d - e * e}` },
      { tex: `x = ${x}` },
    ];
  }
  const h = poleHeight(p);
  return [
    { text: `Let the break be $x$ m up. The fallen part is what is left of the pole, $${h} - x$, and it is the hypotenuse of a right triangle with the standing part and the ground:` },
    { tex: `x^{2} + ${d}^{2} = (${h} - x)^{2}` },
    { tex: `x^{2} + ${d * d} = ${h * h} - ${2 * h}x + x^{2}` },
    { text: 'The $x^{2}$ on each side cancel, leaving a plain equation:' },
    { tex: `${2 * h}x = ${h * h} - ${d * d} = ${h * h - d * d}` },
    { tex: `x = ${x}` },
  ];
}

function polePrompt(p: PoleParams): string {
  if (p.rope) {
    return `A rope hangs from the top of a flagpole, with ${ropeExtra(p)} m of it lying on the ground. Pulled tight, its end touches the ground ${p.d} m from the foot of the pole.`;
  }
  return `A pole ${poleHeight(p)} m tall snaps, and the top part folds over, still joined at the break. Its tip touches the ground ${p.d} m from the foot.`;
}

const cmSgBrokenPole: Generator<PoleParams> = {
  id: 'cm-sg-broken-pole',
  sample: (rng, difficulty) => samplePole(rng, difficulty >= 2, false),
  render(p) {
    return typed(
      [say(polePrompt(p)), { kind: 'diagram', svg: poleSvg(p) }, say(p.rope ? 'How tall is the flagpole, in metres?' : 'How high up is the break, in metres?')],
      p.x,
      p.rope ? '\\text{height} =' : '\\text{break} =',
    );
  },
  choices(p) {
    if (p.rope) return tidyOptions(p.x, [p.hyp, p.d, p.d - ropeExtra(p), p.d + ropeExtra(p)], 1, 1);
    const h = poleHeight(p);
    return tidyOptions(p.x, [p.hyp, h / 2, p.d, h - p.d], 1, 1);
  },
  solution: poleSolution,
};

const cmSgPoleTiles: Generator<PoleParams> = {
  id: 'cm-sg-pole-tiles',
  sample: (rng, difficulty) => samplePole(rng, difficulty >= 2, true),
  render(p): Slide {
    const { x, d } = p;
    if (p.rope) {
      const e = ropeExtra(p);
      const answer = [e, d * d, x];
      return {
        kind: 'tiles',
        prompt: [say(`${polePrompt(p)} Let the pole be $x$ m tall.`), { kind: 'diagram', svg: poleSvg(p) }, say('Fill in the equation, then solve it.')],
        // `^2`, not `^{2}`: a braced digit is a blank in a template.
        template: '(x + {0})^2 = x^2 + {1} \\quad x = {2}',
        bank: numberBank(answer, [d, 2 * e, p.hyp, d - e, e * e], 3, 1, 1),
        answer: answer.map(num),
      };
    }
    const h = poleHeight(p);
    const answer = [d * d, h, x];
    return {
      kind: 'tiles',
      prompt: [say(`${polePrompt(p)} Let the break be $x$ m up.`), { kind: 'diagram', svg: poleSvg(p) }, say('Fill in the equation, then solve it.')],
      template: 'x^2 + {0} = ({1} - x)^2 \\quad x = {2}',
      bank: numberBank(answer, [d, 2 * h, p.hyp, h - d, h / 2], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution: poleSolution,
};

/* ---------- unfold a box, or unroll a cylinder ---------- */

/**
 * Boxes a ≤ b ≤ c whose shortest surface path corner to corner is whole:
 * (a + b)² + c² a perfect square. No edge under a fifth of the longest, so
 * the drawing keeps its depth.
 */
const BOXES: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (let c = 2; c <= 24; c += 1) {
    for (let s = 2; s <= 2 * c; s += 1) {
      if (!isSquare(s * s + c * c)) continue;
      const L = iroot(s * s + c * c);
      if (L > 40) continue;
      for (let a = Math.max(1, s - c); 2 * a <= s; a += 1) {
        const b = s - a;
        if (a < 0.2 * c || b > c) continue;
        out.push([a, b, c, L]);
      }
    }
  }
  return out;
})();

/** Strings wound n times round a cylinder of circumference C and height H, whole length L. */
const CYLINDERS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (const [s, t, h] of TRIPLES) {
    for (let k = 1; k <= 6; k += 1) {
      for (const [w, H] of [[s * k, t * k], [t * k, s * k]]) {
        for (const n of [2, 3, 4]) {
          if (w % n !== 0 || w / n < 2 || H > 48 || h * k > 60) continue;
          out.push([n, w / n, H, h * k]);
        }
      }
    }
  }
  return out;
})();

interface UnfoldParams {
  cylinder: boolean;
  /** Index into BOXES or CYLINDERS. */
  i: number;
}

function boxSvg(a: number, b: number, c: number): string {
  const K: Pt = polar(0.6 * a, 32);
  const F0: Pt = [0, 0];
  const F1: Pt = [c, 0];
  const F2: Pt = [c, b];
  const F3: Pt = [0, b];
  const [B0, B1, B2, B3] = [F0, F1, F2, F3].map((p) => add(p, K));
  const F = frame([F0, F1, F2, F3, B0, B1, B2, B3], 190, 30);
  const [f0, f1, f2, f3, b0, b1, b2, b3] = [F0, F1, F2, F3, B0, B1, B2, B3].map(F.at);
  const mid = F.at(centroid([F0, F2, B0, B2]));
  return svg(F.height, 'A box with corner A at the front bottom left and G at the back top right', [
    outline([f0, f1, f2, f3]),
    seg(f1, b1),
    seg(f2, b2),
    seg(f3, b3),
    seg(b1, b2),
    seg(b2, b3),
    seg(f0, b0, true, 1.2),
    seg(b0, b1, true, 1.2),
    seg(b0, b3, true, 1.2),
    txt(add(lerp(f0, f1, 0.5), [0, 15]), `${c}`),
    txt(add(lerp(f0, f3, 0.5), [-9, 0]), `${b}`, 'end'),
    txt(add(lerp(f1, b1, 0.5), [9, 6]), `${a}`, 'start'),
    dot(f0),
    dot(b2),
    vtx(f0, 'A', mid, 14),
    vtx(b2, 'G', mid, 14),
  ]);
}

function cylinderSvg(n: number, H: number): string {
  const cx = 150;
  const rx = 50;
  const ry = 12;
  const top = 28;
  const bottom = 188;
  const ellipse = (y: number, dashedBack: boolean) =>
    dashedBack
      ? `<path d="M ${cx - rx} ${y} A ${rx} ${ry} 0 0 0 ${cx + rx} ${y}" fill="none" stroke="currentColor" stroke-width="2" /><path d="M ${cx - rx} ${y} A ${rx} ${ry} 0 0 1 ${cx + rx} ${y}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 4" />`
      : `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="currentColor" stroke-width="2" />`;
  // The string: n turns, the front half solid and the back half faint.
  const front: string[] = [];
  const back: string[] = [];
  const steps = 48 * n;
  for (let i = 0; i < steps; i += 1) {
    const t0 = (i / steps) * 2 * Math.PI * n;
    const t1 = ((i + 1) / steps) * 2 * Math.PI * n;
    const at = (t: number): Pt => [cx + rx * Math.sin(t), bottom - (t / (2 * Math.PI * n)) * (bottom - top) + ry * Math.cos(t)];
    const [p, q] = [at(t0), at(t1)];
    const piece = `M ${f1(p[0])} ${f1(p[1])} L ${f1(q[0])} ${f1(q[1])}`;
    (Math.cos((t0 + t1) / 2) >= 0 ? front : back).push(piece);
  }
  return svg(218, `A cylinder with a string wound ${n} times round it from bottom to top`, [
    ellipse(top, false),
    ellipse(bottom, true),
    seg([cx - rx, top], [cx - rx, bottom]),
    seg([cx + rx, top], [cx + rx, bottom]),
    `<path d="${back.join(' ')}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.4" />`,
    `<path d="${front.join(' ')}" fill="none" stroke="currentColor" stroke-width="2.5" />`,
    seg([cx - rx - 22, top], [cx - rx - 22, bottom], false, 1),
    seg([cx - rx - 27, top], [cx - rx - 17, top], false, 1),
    seg([cx - rx - 27, bottom], [cx - rx - 17, bottom], false, 1),
    txt([cx - rx - 30, (top + bottom) / 2], `${H}`, 'end'),
  ]);
}

const cmSgUnfold: Generator<UnfoldParams> = {
  id: 'cm-sg-unfold',
  sample(rng, difficulty) {
    const cylinder = difficulty >= 2;
    return { cylinder, i: rng.int(0, (cylinder ? CYLINDERS : BOXES).length - 1) };
  },
  render(p) {
    if (p.cylinder) {
      const [n, C, H, L] = CYLINDERS[p.i];
      return typed(
        [
          say(`A string is wound ${n} times round a cylinder, climbing evenly from the bottom to the top. The cylinder is ${H} cm tall and ${C} cm round.`),
          { kind: 'diagram', svg: cylinderSvg(n, H) },
          say('How long is the string, in centimetres?'),
        ],
        L,
        '\\text{string} =',
      );
    }
    const [a, b, c, L] = BOXES[p.i];
    return typed(
      [
        say(`A box measures $${a} \\times ${b} \\times ${c}$. An ant walks over the outside of the box from corner $A$ to the opposite corner $G$.`),
        { kind: 'diagram', svg: boxSvg(a, b, c) },
        say('How long is the shortest path it can take?'),
      ],
      L,
      '\\text{path} =',
    );
  },
  choices(p) {
    if (p.cylinder) {
      const [n, C, H, L] = CYLINDERS[p.i];
      return tidyOptions(L, [n * C + H, n * H, C + H * n], 1, 1);
    }
    const [a, b, c, L] = BOXES[p.i];
    return tidyOptions(L, [a + b + c, c + b], 1, 1);
  },
  solution(p) {
    if (p.cylinder) {
      const [n, C, H, L] = CYLINDERS[p.i];
      return [
        { text: 'Cut the cylinder straight down one side and unroll it into a rectangle. Each turn of the string crosses the width once, so unroll it $n$ times side by side and the whole string is one straight line:' },
        { tex: `\\text{width} = ${n} \\times ${C} = ${n * C}` },
        { tex: `\\text{string} = \\sqrt{${n * C}^{2} + ${H}^{2}}` },
        { tex: `\\text{string} = \\sqrt{${n * C * n * C + H * H}} = ${L}` },
        { text: `Going round and then up, $${n * C} + ${H}$, is the trap: the string climbs as it goes round.` },
      ];
    }
    const [a, b, c, L] = BOXES[p.i];
    const others: [number, number, number][] = [
      [a, c, b],
      [b, c, a],
    ];
    return [
      { text: 'Unfold the two faces the ant crosses so they lie flat. The path becomes the diagonal of a rectangle, and there are three ways to pair the edges:' },
      { tex: `\\sqrt{(${a} + ${b})^{2} + ${c}^{2}} = ${L}` },
      ...others.map(([s1, s2, t]) => {
        const v = (s1 + s2) ** 2 + t * t;
        return { tex: `\\sqrt{(${s1} + ${s2})^{2} + ${t}^{2}} = ${isSquare(v) ? iroot(v) : `\\sqrt{${v}}`}` };
      }),
      { text: `The shortest puts the two shorter edges together, so the path is $${L}$. Walking along the edges, $${a + b + c}$, is longer.` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Triangle Areas
 * ================================================================ */

/**
 * Scalene triangles, not right-angled, with whole sides and a whole area,
 * a ≤ b ≤ c. A table, not a search: the table is the check.
 */
const HERON: [number, number, number, number][] = [
  [4, 13, 15, 24],
  [7, 15, 20, 42],
  [8, 26, 30, 96],
  [9, 10, 17, 36],
  [10, 17, 21, 84],
  [10, 35, 39, 168],
  [11, 13, 20, 66],
  [11, 25, 30, 132],
  [12, 17, 25, 90],
  [12, 39, 45, 216],
  [13, 14, 15, 84],
  [13, 20, 21, 126],
  [13, 30, 37, 180],
  [13, 37, 40, 240],
  [13, 40, 45, 252],
  [14, 30, 40, 168],
  [15, 26, 37, 156],
  [15, 28, 41, 126],
  [15, 34, 35, 252],
  [15, 37, 44, 264],
  [16, 25, 39, 120],
  [17, 25, 26, 204],
  [17, 25, 28, 210],
  [17, 28, 39, 210],
  [17, 39, 44, 330],
  [17, 40, 41, 336],
  [18, 20, 34, 144],
  [19, 20, 37, 114],
  [20, 34, 42, 336],
  [22, 26, 40, 264],
  [25, 29, 36, 360],
  [25, 34, 39, 420],
  [25, 39, 40, 468],
  [26, 28, 30, 336],
  [26, 40, 42, 504],
  [39, 42, 45, 756],
  [15, 41, 52, 234],
  [16, 52, 60, 384],
  [20, 37, 51, 306],
  [21, 41, 50, 420],
  [21, 45, 60, 378],
  [24, 34, 50, 360],
  [25, 39, 56, 420],
  [29, 35, 48, 504],
];

const heronS = ([a, b, c]: [number, number, number, number]) => (a + b + c) / 2;

/** Rows wide enough to draw: no angle under 12 degrees. */
const HERON_DRAWN = HERON.map((_, i) => i).filter((i) => smallestAngle(HERON[i][0], HERON[i][1], HERON[i][2]) >= 12);

/** The triangle with its longest side c as the base, b on the left and a on the right. */
function heronFrame(a: number, b: number, c: number, extra: Pt[] = []) {
  const [L, R, T] = placeTriangle(c, b, a);
  const F = frame([L, R, T, ...extra], 200, 30);
  return { F, L: F.at(L), R: F.at(R), T: F.at(T), model: [L, R, T] as [Pt, Pt, Pt] };
}

function heronSvg(i: number): string {
  const [a, b, c] = HERON[i];
  const { F, L, R, T } = heronFrame(a, b, c);
  const G = centroid([L, R, T]);
  return svg(F.height, `A triangle with sides ${a}, ${b} and ${c}`, [outline([L, R, T]), outside(L, R, `${c}`, G), outside(L, T, `${b}`, G), outside(R, T, `${a}`, G)]);
}

function heronSteps(i: number): SolutionStep[] {
  const [a, b, c, A] = HERON[i];
  const s = heronS(HERON[i]);
  return [
    { text: 'Heron’s formula, with $s$ half the perimeter:' },
    { tex: '\\text{area} = \\sqrt{s(s - a)(s - b)(s - c)}' },
    { tex: `s = (${a} + ${b} + ${c}) \\div 2 = ${s}` },
    { tex: `\\text{area} = \\sqrt{${s} \\times ${s - a} \\times ${s - b} \\times ${s - c}}` },
    { tex: `\\text{area} = \\sqrt{${s * (s - a) * (s - b) * (s - c)}} = ${A}` },
  ];
}

/* ---------- Heron's formula ---------- */

interface HeronParams {
  i: number;
  /** Difficulty 2 asks the shortest height instead of the area. */
  height: boolean;
}

const shortestHeight = (i: number) => (2 * HERON[i][3]) / HERON[i][2];

const cmSgHeron: Generator<HeronParams> = {
  id: 'cm-sg-heron',
  sample(rng, difficulty) {
    for (;;) {
      const i = rng.pick(HERON_DRAWN);
      if (difficulty >= 2 && !twoPlaces(shortestHeight(i))) continue;
      return { i, height: difficulty >= 2 };
    }
  },
  render(p) {
    const [a, b, c, A] = HERON[p.i];
    return typed(
      [say(`A triangle has sides $${a}$, $${b}$ and $${c}$.`), { kind: 'diagram', svg: heronSvg(p.i) }, say(p.height ? 'How long is its shortest height?' : 'What is its area?')],
      p.height ? shortestHeight(p.i) : A,
      p.height ? 'h =' : '\\text{area} =',
    );
  },
  choices(p) {
    const [a, b, c, A] = HERON[p.i];
    if (p.height) return tidyOptions(shortestHeight(p.i), [(2 * A) / a, A / c, (2 * A) / b], 1, 0.1);
    return tidyOptions(A, [(a * b) / 2, 2 * A, (b * c) / 2], 1, 1);
  },
  solution(p) {
    const [a, , c, A] = HERON[p.i];
    const steps = heronSteps(p.i);
    if (!p.height) {
      steps.push({ text: `Taking half of two sides, as if the triangle had a right angle, is the trap: it has none.` });
      return steps;
    }
    steps.push(
      { text: 'Area is half a side times the height onto it, and the area is the same whichever side is used. So the longest side has the shortest height:' },
      { tex: `h = 2 \\times ${A} \\div ${c} = ${num(shortestHeight(p.i))}` },
      { text: `The height onto the side $${a}$ is the longest one, $${fracTex(2 * A, a)}$.` },
    );
    return steps;
  },
};

/* ---------- Heron's working as a table ---------- */

interface HeronTableParams {
  i: number;
  height: boolean;
}

function heronTableValues(p: HeronTableParams): number[] {
  const [a, b, c, A] = HERON[p.i];
  const s = heronS(HERON[p.i]);
  return p.height ? [s - a, s - b, s - c, A, shortestHeight(p.i)] : [s, s - a, s - b, s - c, A];
}

const cmSgHeronTable: Generator<HeronTableParams> = {
  id: 'cm-sg-heron-table',
  sample(rng, difficulty) {
    for (;;) {
      const p = { i: rng.pick(HERON_DRAWN), height: difficulty >= 2 };
      if (p.height && !twoPlaces(shortestHeight(p.i))) continue;
      const values = heronTableValues(p);
      if (new Set(values).size < values.length) continue;
      return p;
    }
  },
  render(p): Slide {
    const [a, b, c, A] = HERON[p.i];
    const s = heronS(HERON[p.i]);
    const values = heronTableValues(p);
    const labels = p.height ? ['s - a', 's - b', 's - c', '\\text{area}', 'h'] : ['s', 's - a', 's - b', 's - c', '\\text{area}'];
    return {
      kind: 'table',
      prompt: [
        say(
          p.height
            ? `A triangle has sides $a = ${a}$, $b = ${b}$ and $c = ${c}$, so $s = ${s}$. Fill in Heron’s working, and the height $h$ onto the side $c$.`
            : `A triangle has sides $a = ${a}$, $b = ${b}$ and $c = ${c}$. Fill in Heron’s working, with $s$ half the perimeter.`,
        ),
      ],
      columns: ['\\text{step}', '\\text{value}'],
      rows: labels.map((label) => [label, null]),
      bank: numberBank(values, [a + b + c, 2 * A, s + a, A / c, (a * b) / 2], 3, 1, 0.1),
      answer: values.map(num),
    };
  },
  solution(p) {
    const [, , c, A] = HERON[p.i];
    const steps = heronSteps(p.i);
    if (p.height) steps.push({ text: 'Area is half the base times the height:' }, { tex: `h = 2 \\times ${A} \\div ${c} = ${num(shortestHeight(p.i))}` });
    return steps;
  },
};

/* ---------- the incircle, and any point inside ---------- */

interface InradiusParams {
  i: number;
  /** Difficulty 2: distances from a point inside to sides a and b; 0 for the incircle. */
  d1: number;
  d2: number;
}

const inradius = (i: number) => HERON[i][3] / heronS(HERON[i]);
const thirdDistance = ({ i, d1, d2 }: InradiusParams) => {
  const [a, b, c, A] = HERON[i];
  return (2 * A - a * d1 - b * d2) / c;
};

function inradiusSvg(p: InradiusParams): string {
  const [a, b, c, A] = HERON[p.i];
  const { F, L, R, T, model } = heronFrame(a, b, c);
  const G = centroid([L, R, T]);
  const parts = [outline([L, R, T]), outside(L, R, `${c}`, G), outside(L, T, `${b}`, G), outside(R, T, `${a}`, G)];
  if (p.d1 === 0) {
    // Incentre: sides weight the opposite corners. L is opposite a, R opposite b, T opposite c.
    const P = F.at(mul(add(add(mul(model[0], a), mul(model[1], b)), mul(model[2], c)), 1 / (a + b + c)));
    const r = inradius(p.i) * F.k;
    const Q: Pt = [P[0], P[1] + r];
    parts.push(ring(P, r), dot(P, 2.5), seg(P, Q, false, 1.5), txt(add(lerp(P, Q, 0.5), [7, 0]), 'r', 'start', 12));
    return svg(F.height, 'A triangle with the circle inside it touching all three sides', parts);
  }
  // Barycentric weights a·d1, b·d2, c·d3 on the corners opposite those sides.
  const d3 = thirdDistance(p);
  const total = 2 * A;
  const P = F.at(mul(add(add(mul(model[0], a * p.d1), mul(model[1], b * p.d2)), mul(model[2], c * d3)), 1 / total));
  const sides: [Pt, Pt, string][] = [
    [R, T, `${p.d1}`],
    [L, T, `${p.d2}`],
    [L, R, '?'],
  ];
  const feet = sides.map(([U, V]) => foot(P, U, V));
  parts.push(dot(P, 2.5));
  sides.forEach(([U, V, label], j) => {
    const Q = feet[j];
    parts.push(seg(P, Q, true, 1.5), rightMark(Q, P, U, 6));
    const avoid = feet.filter((_, k) => k !== j).map((X) => [P, X] as [Pt, Pt]);
    parts.push(beside(P, Q, label, [...avoid, [U, V]]));
  });
  return svg(F.height, 'A triangle with a point inside and its distances to the three sides', parts);
}

const cmSgInradius: Generator<InradiusParams> = {
  id: 'cm-sg-inradius',
  sample(rng, difficulty) {
    for (;;) {
      const i = rng.pick(HERON_DRAWN);
      if (difficulty < 2) {
        if (!twoPlaces(inradius(i))) continue;
        return { i, d1: 0, d2: 0 };
      }
      const [a, b, c, A] = HERON[i];
      if (A > 800 || c * c >= a * a + b * b) continue;
      const ha = (2 * A) / a;
      const hb = (2 * A) / b;
      const hc = (2 * A) / c;
      const d1 = rng.int(1, Math.floor(ha * 0.6));
      const d2 = rng.int(1, Math.floor(hb * 0.6));
      const p = { i, d1, d2 };
      const d3 = thirdDistance(p);
      if (!twoPlaces(d3) || d1 < 0.2 * ha || d2 < 0.2 * hb || d3 < 0.2 * hc) continue;
      if (d3 === d1 || d3 === d2) continue;
      return p;
    }
  },
  render(p) {
    const [a, b, c, A] = HERON[p.i];
    if (p.d1 === 0) {
      return typed(
        [say(`A triangle has sides $${a}$, $${b}$ and $${c}$.`), { kind: 'diagram', svg: inradiusSvg(p) }, say('What is the radius $r$ of the circle inside it that touches all three sides?')],
        inradius(p.i),
        'r =',
      );
    }
    return typed(
      [
        say(`A triangle has sides $${a}$, $${b}$ and $${c}$, and area $${A}$. A point inside it is $${p.d1}$ from the side $${a}$ and $${p.d2}$ from the side $${b}$.`),
        { kind: 'diagram', svg: inradiusSvg(p) },
        say(`How far is the point from the side $${c}$?`),
      ],
      thirdDistance(p),
      'd =',
    );
  },
  choices(p) {
    const [a, b, c, A] = HERON[p.i];
    if (p.d1 === 0) {
      const s = heronS(HERON[p.i]);
      return tidyOptions(inradius(p.i), [A / (a + b + c), (2 * A) / s, (a + b - c) / 2], 1, 0.1);
    }
    const d3 = thirdDistance(p);
    return tidyOptions(d3, [(2 * A) / c - p.d1 - p.d2, (A - a * p.d1 - b * p.d2) / c, (p.d1 + p.d2) / 2], 1, 0.1);
  },
  solution(p) {
    const [a, b, c, A] = HERON[p.i];
    if (p.d1 === 0) {
      const s = heronS(HERON[p.i]);
      return [
        { text: 'Join the centre to the three corners. That cuts the triangle into three triangles, each with a side as its base and $r$ as its height, so the area is $r$ times half the perimeter:' },
        { tex: '\\text{area} = \\frac{1}{2}ar + \\frac{1}{2}br + \\frac{1}{2}cr = rs' },
        ...heronSteps(p.i).slice(2),
        { tex: `r = ${A} \\div ${s} = ${num(inradius(p.i))}` },
      ];
    }
    const d3 = thirdDistance(p);
    return [
      { text: 'Join the point to the three corners. That cuts the triangle into three triangles, each with a side as its base and the distance to that side as its height, and together they make the whole:' },
      { tex: `\\frac{1}{2}(${a} \\times ${p.d1} + ${b} \\times ${p.d2} + ${c}d) = ${A}` },
      { tex: `${a * p.d1} + ${b * p.d2} + ${c}d = ${2 * A}` },
      { tex: `${c}d = ${2 * A - a * p.d1 - b * p.d2}` },
      { tex: `d = ${num(d3)}` },
    ];
  },
};

/* ---------- each side extended past its end ---------- */

interface ExtendParams {
  S: number;
  k: number;
}

const extendedArea = ({ S, k }: ExtendParams) => (1 + 3 * k * (k + 1)) * S;

function extendSvg(k: number): string {
  const A: Pt = [0, 0];
  const B: Pt = [5, 0];
  const C: Pt = [1.8, 3.4];
  const B2 = add(B, mul(sub(B, A), k));
  const C2 = add(C, mul(sub(C, B), k));
  const A2 = add(A, mul(sub(A, C), k));
  const F = frame([A, B, C, A2, B2, C2], 215, 26);
  const [a, b, c, a2, b2, c2] = [A, B, C, A2, B2, C2].map(F.at);
  const big = centroid([a2, b2, c2]);
  return svg(F.height, 'Triangle ABC with each side extended to make a larger triangle', [
    shade([a, b, c]),
    outline([a2, b2, c2]),
    seg(a, b2),
    seg(b, c2),
    seg(c, a2),
    vtx(a2, "A'", big),
    vtx(b2, "B'", big),
    vtx(c2, "C'", big),
    gapLetter(a, [b, c, a2, b2], 'A', 11),
    gapLetter(b, [a, b2, c, c2], 'B', 11),
    gapLetter(c, [b, c2, a, a2], 'C', 11),
  ]);
}

const cmSgExtendedSides: Generator<ExtendParams> = {
  id: 'cm-sg-extended-sides',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { S: rng.int(2, 25), k: rng.int(2, 3) };
    return { S: rng.int(2, 40), k: 1 };
  },
  render(p) {
    const how = p.k === 1 ? 'its own length' : `${p.k} times its own length`;
    return typed(
      [
        say(`Triangle $ABC$ has area $${p.S}$. Extend $AB$ past $B$ to $B'$, $BC$ past $C$ to $C'$ and $CA$ past $A$ to $A'$, each by ${how}.`),
        { kind: 'diagram', svg: extendSvg(p.k) },
        say("What is the area of triangle $A'B'C'$?"),
      ],
      extendedArea(p),
      '\\text{area} =',
    );
  },
  choices(p) {
    const { S, k } = p;
    return tidyOptions(extendedArea(p), [(2 * k + 1) ** 2 * S, 3 * k * (k + 1) * S, (k + 1) ** 2 * S, (1 + 3 * k) * S], 1, 1);
  },
  solution(p) {
    const { S, k } = p;
    const one = k * S;
    const two = k * k * S;
    return [
      { text: "Write $[XYZ]$ for the area of triangle $XYZ$. Split $A'B'C'$ into $ABC$ and three outside triangles, and cut the one at $B$ with the line $B'C$." },
      {
        text:
          k === 1
            ? "Triangles $BB'C$ and $ABC$ share the height from $C$, and $BB' = AB$:"
            : `Triangles $BB'C$ and $ABC$ share the height from $C$, and $BB'$ is ${k} times $AB$:`,
      },
      { tex: k === 1 ? `[BB'C] = [ABC] = ${S}` : `[BB'C] = ${k} \\times ${S} = ${one}` },
      {
        text:
          k === 1
            ? "Triangles $B'CC'$ and $B'BC$ share the height from $B'$, and $CC' = BC$:"
            : `Triangles $B'CC'$ and $B'BC$ share the height from $B'$, and $CC'$ is ${k} times $BC$:`,
      },
      { tex: k === 1 ? `[B'CC'] = [B'BC] = ${S}` : `[B'CC'] = ${k} \\times ${one} = ${two}` },
      { tex: `[BB'C'] = ${one} + ${two} = ${one + two}` },
      { text: 'The corners at $C$ and $A$ give two more outside triangles of the same area, the same way:' },
      { tex: `[A'B'C'] = ${S} + 3 \\times ${one + two} = ${extendedArea(p)}` },
      { text: `Scaling the triangle, to get $${(2 * k + 1) ** 2 * S}$, is the trap: $A'B'C'$ is not the same shape as $ABC$.` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Similar Triangles
 * ================================================================ */

/* ---------- a square inside a triangle ---------- */

interface SquareParams {
  b: number;
  h: number;
  /** Difficulty 2: a right triangle with legs b and h, the square in the right-angled corner. */
  corner: boolean;
}

const squareSide = ({ b, h }: SquareParams) => (b * h) / (b + h);

function squareSvg(p: SquareParams): string {
  const { b, h } = p;
  const s = squareSide(p);
  const f = p.corner ? 0 : [0.36, 0.5, 0.62][(b + 2 * h) % 3];
  const L: Pt = [0, 0];
  const R: Pt = [b, 0];
  const T: Pt = [f * b, h];
  const x0 = (f * b * s) / h;
  const sq: Pt[] = [
    [x0, 0],
    [x0 + s, 0],
    [x0 + s, s],
    [x0, s],
  ];
  const F = frame(p.corner ? [L, R, T] : [L, R, T, [1.2 * b, 0]], 205, 30);
  const [l, r, t] = [L, R, T].map(F.at);
  const q = sq.map(F.at);
  const parts = [shade(q), outline(q), outline([l, r, t]), txt(centroid(q), '?'), txt(add(lerp(l, r, 0.5), [0, 15]), `${b}`)];
  if (p.corner) {
    parts.push(txt(add(lerp(l, t, 0.5), [-9, 0]), `${h}`, 'end'));
  } else {
    // The height as a dimension line clear of the triangle, so a narrow apex never crowds it.
    const x = r[0] + 16;
    parts.push(
      seg([t[0] + 6, t[1]], [x - 5, t[1]], true, 1),
      seg([x, t[1]], [x, r[1]], false, 1.2),
      seg([x - 5, t[1]], [x + 5, t[1]], false, 1.2),
      seg([x - 5, r[1]], [x + 5, r[1]], false, 1.2),
      txt([x + 8, (t[1] + r[1]) / 2], `${h}`, 'start'),
    );
  }
  return svg(F.height, p.corner ? 'A right triangle with a square in its right-angled corner' : 'A triangle with a square standing on its base', parts);
}

const cmSgInscribedSquare: Generator<SquareParams> = {
  id: 'cm-sg-inscribed-square',
  sample(rng, difficulty) {
    const corner = difficulty >= 2;
    for (;;) {
      const b = rng.int(3, corner ? 40 : 80);
      const h = rng.int(3, corner ? 40 : 80);
      const s = squareSide({ b, h, corner });
      if (!Number.isInteger(s) || s < 2 || b === h) continue;
      const ratio = h / b;
      if (corner ? ratio < 0.3 || ratio > 3 : ratio < 0.35 || ratio > 1.5) continue;
      return { b, h, corner };
    }
  },
  render(p) {
    const setup = p.corner
      ? `A right triangle has legs $${p.b}$ and $${p.h}$. A square sits in its right-angled corner, with its far corner on the hypotenuse.`
      : `A triangle has base $${p.b}$ and height $${p.h}$. A square stands on the base, with its top corners on the other two sides.`;
    return typed([say(setup), { kind: 'diagram', svg: squareSvg(p) }, say('How long is a side of the square?')], squareSide(p), 's =');
  },
  choices(p) {
    const { b, h } = p;
    return tidyOptions(squareSide(p), [h / 2, b / 2, (b + h) / 4, Math.min(b, h) / 2], 1, 1);
  },
  solution(p) {
    const { b, h } = p;
    const s = squareSide(p);
    return [
      {
        text: p.corner
          ? `Call the side $s$. Above the square is a small right triangle with legs $s$ and $${h} - s$. Its sides are parallel to the big triangle’s, so the two are similar:`
          : `Call the side $s$. Above the square is a small triangle with base $s$ and height $${h} - s$. Its base is parallel to the big triangle’s, so the two are similar:`,
      },
      { tex: `\\frac{s}{${b}} = \\frac{${h} - s}{${h}}` },
      { tex: `${h}s = ${b * h} - ${b}s` },
      { tex: `${b + h}s = ${b * h}` },
      { tex: `s = ${s}` },
      { text: 'So in general' },
      { tex: 's = \\frac{bh}{b + h}' },
      { text: `Taking half the height, $${num(h / 2)}$, is the trap.` },
    ];
  },
};

/* ---------- similar triangles from one pair of equal angles ---------- */

/** p/q for AB : AC. AD = kp², AC = kq², AB = kpq. */
const ANGLE_RATIOS: [number, number][] = [
  [1, 2],
  [2, 3],
  [3, 4],
  [3, 5],
  [4, 5],
  [4, 7],
  [5, 7],
  [5, 8],
  [5, 6],
];

interface AngleSimParams {
  k: number;
  p: number;
  q: number;
  /** Difficulty 2 gives AB and AD and asks DC. */
  back: boolean;
}

const angleSim = ({ k, p, q }: AngleSimParams) => ({ ad: k * p * p, ac: k * q * q, ab: k * p * q, dc: k * (q * q - p * p) });

/**
 * Triangle ABC with D on AC and BD drawn, the equal angles ABD and ACB marked.
 * `bc` fixes the third side; without it angle A is drawn at 62 degrees.
 */
function angleSimSvg(ab: number, ac: number, ad: number, labels: { ab?: string; ad?: string; dc?: string; bc?: string }, bc?: number): string {
  const Am: Pt = [0, 0];
  const Cm: Pt = [ac, 0];
  const Bm: Pt = bc === undefined ? polar(ab, 62) : placeTriangle(ac, ab, bc)[2];
  const Dm: Pt = [ad, 0];
  const F = frame([Am, Bm, Cm], 205, 30);
  const [A, B, C, D] = [Am, Bm, Cm, Dm].map(F.at);
  const G = centroid([A, B, C]);
  const parts = [outline([A, B, C]), seg(B, D), angleMark(B, A, D, '', 18), angleMark(C, A, B, '', 18), vtx(A, 'A', G, 13), vtx(B, 'B', G, 13), vtx(C, 'C', G, 13)];
  const room = new Clearance(F.height).loop([A, B, C]).line(B, D).arc(B, A, D, 18).arc(C, A, B, 18);
  for (const [X, name] of [[A, 'A'], [B, 'B'], [C, 'C']] as [Pt, string][]) room.box(vtxAt(X, G, 13), name);
  parts.push(room.put(ringSpots(D, add(D, [0, 10]), [12, 15, 19, 24]).filter((q) => q[1] < D[1] - 4), 'D', 12));
  const below = (X: Pt, Y: Pt, label: string) => room.put([0.5, 0.4, 0.6, 0.3, 0.7].map((t) => add(lerp(X, Y, t), [0, 15])), label);
  if (labels.ad) parts.push(below(A, D, labels.ad));
  if (labels.dc) parts.push(below(D, C, labels.dc));
  if (labels.ab) parts.push(room.put(sideSpots(A, B, labels.ab, G), labels.ab));
  if (labels.bc) parts.push(room.put(sideSpots(B, C, labels.bc, G), labels.bc));
  return svg(F.height, 'Triangle ABC with D on AC, and angle ABD marked equal to angle ACB', parts);
}

const cmSgAngleSimilar: Generator<AngleSimParams> = {
  id: 'cm-sg-angle-similar',
  sample(rng, difficulty) {
    for (;;) {
      const [p, q] = rng.pick(ANGLE_RATIOS);
      const k = rng.int(1, 12);
      if (k * q * q > 64) continue;
      return { k, p, q, back: difficulty >= 2 };
    }
  },
  render(s) {
    const { ad, ab, dc, ac } = angleSim(s);
    const given = s.back ? `$AB = ${ab}$ and $AD = ${ad}$` : `$AD = ${ad}$ and $DC = ${dc}$`;
    return typed(
      [
        say(`In triangle $ABC$, the point $D$ on $AC$ makes $\\angle ABD = \\angle ACB$, with ${given}.`),
        { kind: 'diagram', svg: angleSimSvg(ab, ac, ad, s.back ? { ab: `${ab}`, ad: `${ad}`, dc: '?' } : { ab: '?', ad: `${ad}`, dc: `${dc}` }) },
        say(`How long is $${s.back ? 'DC' : 'AB'}$?`),
      ],
      s.back ? dc : ab,
      s.back ? 'DC =' : 'AB =',
    );
  },
  choices(s) {
    const { ad, ab, dc, ac } = angleSim(s);
    if (s.back) return tidyOptions(dc, [ac, ab - ad, (ab * ab) / dc, ab + ad], 1, 1);
    return tidyOptions(ab, [Math.sqrt(ad * dc), (ad + ac) / 2, dc, ac / 2], 1, 1);
  },
  solution(s) {
    const { ad, ab, dc, ac } = angleSim(s);
    const steps: SolutionStep[] = [
      { text: 'Triangles $ABD$ and $ACB$ share the angle at $A$, and $\\angle ABD = \\angle ACB$, so they are similar, matching $A$ to $A$, $B$ to $C$ and $D$ to $B$:' },
      { tex: '\\frac{AB}{AC} = \\frac{AD}{AB}' },
      { tex: 'AB^{2} = AD \\times AC' },
    ];
    if (s.back) {
      steps.push({ tex: `${ab}^{2} = ${ad} \\times AC` }, { tex: `AC = ${ab * ab} \\div ${ad} = ${ac}` }, { tex: `DC = ${ac} - ${ad} = ${dc}` });
      return steps;
    }
    steps.push(
      { tex: `AC = ${ad} + ${dc} = ${ac}` },
      { tex: `AB^{2} = ${ad} \\times ${ac} = ${ab * ab}` },
      { tex: `AB = ${ab}` },
      { text: 'Using $DC$ in place of the whole of $AC$ is the trap.' },
    );
    return steps;
  },
};

/* ---------- the same similar pair, the matching and two lengths ---------- */

interface AngleTilesParams extends AngleSimParams {
  /** BC = m·q, so BD = m·p. */
  m: number;
}

const CORRESPONDENCES = ['ABC', 'ACB', 'CBA'];

const cmSgAngleSimilarTiles: Generator<AngleTilesParams> = {
  id: 'cm-sg-angle-similar-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const [p, q] = rng.pick(ANGLE_RATIOS);
      const k = rng.int(1, 10);
      const m = rng.int(1, 12);
      const s = { k, p, q, m, back: difficulty >= 2 };
      const { ad, ab, dc, ac } = angleSim(s);
      const bc = m * q;
      if (ac > 64 || bc > 64 || !validTriangle(ab, bc, ac)) continue;
      if (smallestAngle(ab, bc, ac) < 22) continue;
      const bd = m * p;
      const numbers = s.back ? [dc, bd] : [ab, bd];
      if (numbers[0] === numbers[1] || numbers.includes(ad) || numbers.includes(bc)) continue;
      return s;
    }
  },
  render(s): Slide {
    const { ad, ab, dc, ac } = angleSim(s);
    const bc = s.m * s.q;
    const bd = s.m * s.p;
    const given = s.back ? `$AB = ${ab}$, $AD = ${ad}$ and $BC = ${bc}$` : `$AD = ${ad}$, $DC = ${dc}$ and $BC = ${bc}$`;
    const numbers = s.back ? [dc, bd] : [ab, bd];
    const slips = s.back ? [ac, ab - ad, (bc * ad) / ab, bc - ad] : [Math.sqrt(ad * dc), dc, (bc * ad) / ac, bc - dc];
    const bank = numberBank(numbers, slips, 3, 1, 1).filter((t) => Number.isInteger(Number(t)));
    return {
      kind: 'tiles',
      prompt: [
        say(`In triangle $ABC$, the point $D$ on $AC$ makes $\\angle ABD = \\angle ACB$, with ${given}.`),
        {
          kind: 'diagram',
          svg: angleSimSvg(ab, ac, ad, s.back ? { ab: `${ab}`, ad: `${ad}`, bc: `${bc}` } : { ad: `${ad}`, dc: `${dc}`, bc: `${bc}` }, bc),
        },
        say('Match the triangles corner to corner, then fill in the lengths.'),
      ],
      template: `\\triangle ABD \\sim \\triangle {0} \\quad ${s.back ? 'DC' : 'AB'} = {1} \\quad BD = {2}`,
      bank: [...CORRESPONDENCES, ...bank],
      answer: ['ACB', num(numbers[0]), num(numbers[1])],
    };
  },
  solution(s) {
    const { ad, ab, dc, ac } = angleSim(s);
    const bc = s.m * s.q;
    const bd = s.m * s.p;
    const steps: SolutionStep[] = [
      { text: 'The angle at $A$ is shared, $B$ in $ABD$ has the angle that $C$ has in $ABC$, so $D$ matches $B$:' },
      { tex: '\\triangle ABD \\sim \\triangle ACB' },
      { tex: '\\frac{AB}{AC} = \\frac{AD}{AB} = \\frac{BD}{CB}' },
    ];
    if (s.back) steps.push({ tex: `AC = ${ab * ab} \\div ${ad} = ${ac}` }, { tex: `DC = ${ac} - ${ad} = ${dc}` });
    else steps.push({ tex: `AB^{2} = ${ad} \\times ${ac} = ${ab * ab}` }, { tex: `AB = ${ab}` });
    steps.push({ tex: `BD = ${bc} \\times \\frac{${ab}}{${ac}} = ${bd}` });
    return steps;
  },
};

/* ---------- a parallel line, and the trapezium it leaves ---------- */

interface ParallelAreaParams {
  m: number;
  n: number;
  u: number;
  /** Difficulty 2 gives both areas and asks AD : DB. */
  ratio: boolean;
}

const smallArea = ({ m, u }: ParallelAreaParams) => m * m * u;
const trapArea = ({ m, n, u }: ParallelAreaParams) => ((m + n) ** 2 - m * m) * u;

function parallelAreaSvg(p: ParallelAreaParams): string {
  const A: Pt = [150, 24];
  const B: Pt = [36, 196];
  const C: Pt = [270, 196];
  const t = p.m / (p.m + p.n);
  const D = lerp(A, B, t);
  const E = lerp(A, C, t);
  return svg(222, 'Triangle ABC cut by a line DE parallel to BC', [
    shade([A, D, E]),
    outline([A, B, C]),
    seg(D, E),
    txt(add(A, [0, -12]), 'A'),
    txt(add(B, [-9, 4]), 'B', 'end'),
    txt(add(C, [9, 4]), 'C', 'start'),
    txt(add(D, [-9, 0]), 'D', 'end'),
    txt(add(E, [9, 0]), 'E', 'start'),
    txt(add(centroid([A, D, E]), [0, 4]), p.ratio ? `${smallArea(p)}` : '?'),
    txt(centroid([D, B, C, E]), `${trapArea(p)}`),
  ]);
}

const cmSgParallelArea: Generator<ParallelAreaParams> = {
  id: 'cm-sg-parallel-area',
  sample(rng, difficulty) {
    for (;;) {
      const m = rng.int(1, 6);
      const n = rng.int(1, 6);
      if (gcd(m, n) !== 1) continue;
      const t = m / (m + n);
      if (t < 0.3 || t > 0.8) continue;
      const u = rng.int(1, 8);
      const p = { m, n, u, ratio: difficulty >= 2 };
      if (trapArea(p) > 400) continue;
      return p;
    }
  },
  render(p) {
    if (p.ratio) {
      return typed(
        [
          say(`$DE$ is parallel to $BC$. Triangle $ADE$ has area $${smallArea(p)}$, and the trapezium $DBCE$ has area $${trapArea(p)}$.`),
          { kind: 'diagram', svg: parallelAreaSvg(p) },
          say('What is $\\frac{AD}{DB}$?'),
        ],
        fracAnswer(p.m, p.n),
        '\\frac{AD}{DB} =',
        FRACTION_KEYS,
      );
    }
    return typed(
      [
        say(`$DE$ is parallel to $BC$, and $AD : DB = ${p.m} : ${p.n}$. The trapezium $DBCE$ has area $${trapArea(p)}$.`),
        { kind: 'diagram', svg: parallelAreaSvg(p) },
        say('What is the area of triangle $ADE$?'),
      ],
      smallArea(p),
      '\\text{area} =',
    );
  },
  choices(p) {
    const { m, n } = p;
    const T = trapArea(p);
    if (p.ratio) return fracOptions([m, n], [[m, m + n], [m * m, n * n], [smallArea(p), T]]);
    return tidyOptions(smallArea(p), [(T * m * m) / (n * n), (T * m) / (m + n), (T * m) / n, m * p.u], 1, 1);
  },
  solution(p) {
    const { m, n, u } = p;
    const whole = (m + n) ** 2;
    const diff = whole - m * m;
    if (p.ratio) {
      const X = smallArea(p);
      const Y = trapArea(p);
      return [
        { text: 'Triangle $ADE$ is similar to triangle $ABC$, so its area is the length ratio squared:' },
        { tex: `[ABC] = ${X} + ${Y} = ${X + Y}` },
        { tex: `[ADE] : [ABC] = ${X} : ${X + Y}` },
        ...(X === m * m ? [] : [{ tex: `= ${m * m} : ${whole}` }]),
        { text: 'Lengths go by the square roots:' },
        { tex: `AD : AB = ${m} : ${m + n}` },
        { tex: `AD : DB = ${m} : ${n}` },
        { text: `Using the areas themselves, $\\frac{${X}}{${Y}}$, is the trap.` },
      ];
    }
    return [
      { text: `$DE$ is parallel to $BC$, so triangle $ADE$ is similar to triangle $ABC$ with $AD : AB = ${m} : ${m + n}$. Areas go by the square:` },
      { tex: `[ADE] : [ABC] = ${m * m} : ${whole}` },
      { text: `The trapezium is the difference, $${whole} - ${m * m} = ${diff}$ parts:` },
      { tex: `1 \\text{ part} = ${trapArea(p)} \\div ${diff} = ${u}` },
      { tex: `[ADE] = ${m * m} \\times ${u} = ${smallArea(p)}` },
      { text: `Comparing $AD$ with $DB$ instead of with the whole of $AB$ is the trap.` },
    ];
  },
};

/* ================================================================
 * Lesson 4: The Angle Bisector Theorem
 * ================================================================ */

/**
 * Triangles with a = BC, b = CA, c = AB (c < b) whose bisector from A splits
 * BC into whole pieces BD and DC and has a whole length AD. A table, not a
 * search: the table is the check. Flipping swaps b with c and BD with DC.
 */
const BISECTOR: [number, number, number, number, number, number][] = [
  [7, 8, 6, 3, 4, 6],
  [14, 16, 12, 6, 8, 12],
  [17, 27, 24, 8, 9, 24],
  [18, 15, 12, 8, 10, 10],
  [18, 35, 28, 8, 10, 30],
  [21, 18, 9, 7, 14, 8],
  [21, 22, 11, 7, 14, 12],
  [21, 24, 18, 9, 12, 18],
  [25, 21, 14, 10, 15, 12],
  [25, 33, 22, 10, 15, 24],
  [28, 27, 15, 10, 18, 15],
  [28, 32, 24, 12, 16, 24],
  [33, 28, 16, 12, 21, 14],
  [34, 54, 48, 16, 18, 48],
  [35, 40, 30, 15, 20, 30],
  [36, 30, 24, 16, 20, 20],
  [37, 50, 24, 12, 25, 30],
  [38, 60, 35, 14, 24, 42],
  [39, 45, 20, 12, 27, 24],
  [39, 56, 35, 15, 24, 40],
  [42, 36, 18, 14, 28, 16],
  [42, 44, 22, 14, 28, 24],
  [42, 48, 15, 10, 32, 20],
  [42, 48, 36, 18, 24, 36],
  [43, 54, 32, 16, 27, 36],
  [44, 39, 13, 11, 33, 12],
  [44, 42, 14, 11, 33, 15],
  [48, 36, 28, 21, 27, 21],
  [49, 56, 42, 21, 28, 42],
  [50, 42, 28, 20, 30, 24],
  [51, 38, 19, 17, 34, 12],
  [52, 45, 20, 16, 36, 18],
  [52, 54, 50, 25, 27, 45],
  [52, 57, 19, 13, 39, 24],
  [54, 45, 36, 24, 30, 30],
  [55, 56, 21, 15, 40, 24],
  [56, 40, 24, 21, 35, 15],
  [56, 54, 30, 20, 36, 30],
  [58, 60, 27, 18, 40, 30],
];

/** Rows wide enough to draw: no angle under 16 degrees. */
// No sliver, and angle A at most 115 degrees: past that AD is too short to carry its label clear of the angle marks.
const BISECTOR_DRAWN = BISECTOR.map((_, i) => i).filter((i) => {
  const [a, b, c] = BISECTOR[i];
  return smallestAngle(a, b, c) >= 16 && (b * b + c * c - a * a) / (2 * b * c) >= Math.cos((115 * Math.PI) / 180);
});

interface BisRow {
  a: number;
  b: number;
  c: number;
  bd: number;
  dc: number;
  ad: number;
}

function bisRow(i: number, flip: boolean): BisRow {
  const [a, b, c, bd, dc, ad] = BISECTOR[i];
  return flip ? { a, b: c, c: b, bd: dc, dc: bd, ad } : { a, b, c, bd, dc, ad };
}

const incentreAI = ({ a, b, c, ad }: BisRow) => (ad * (b + c)) / (a + b + c);

interface BisLabels {
  ab?: string;
  ac?: string;
  bc?: string;
  bd?: string;
  dc?: string;
  ad?: string;
  incentre?: boolean;
}

/** An arc at v from ray a to ray b with a small tick across its middle: one of a pair of equal angles. */
function tickedArc(v: Pt, a: Pt, b: Pt, r = 20): string {
  const mid = dir([0, 0], add(dir(v, a), dir(v, b)));
  return angleMark(v, a, b, '', r) + seg(add(v, mul(mid, r - 4)), add(v, mul(mid, r + 4)), false, 1.5);
}

/** Triangle ABC with B left, C right, the bisector AD, and optionally the incentre I. */
function bisectorSvg(a: number, b: number, c: number, L: BisLabels): string {
  const [Bm, Cm, Am] = placeTriangle(a, c, b);
  const bd = (a * c) / (b + c);
  const Dm: Pt = [bd, 0];
  const F = frame([Am, Bm, Cm], 200, 30);
  const [A, B, C, D] = [Am, Bm, Cm, Dm].map(F.at);
  const G = centroid([A, B, C]);
  const parts = [outline([A, B, C]), seg(A, D), tickedArc(A, B, D), tickedArc(A, D, C), vtx(A, 'A', G), txt(add(B, [-9, 4]), 'B', 'end'), txt(add(C, [9, 4]), 'C', 'start')];
  const room = new Clearance(F.height).loop([A, B, C]).line(A, D).arc(A, B, D, 20).arc(A, D, C, 20).arc(A, B, C, 24);
  room.box(vtxAt(A, G), 'A').box(add(B, [-13, 4]), 'B').box(add(C, [13, 4]), 'C');
  const I = F.at(mul(add(add(mul(Am, a), mul(Bm, b)), mul(Cm, c)), 1 / (a + b + c)));
  if (L.incentre) {
    parts.push(seg(B, I, true, 1.5), dot(I, 2.5));
    room.line(B, I);
  }
  // D above BC, in a gap beside the bisector: below, it would read as part of a length.
  parts.push(room.put(ringSpots(D, add(D, [0, 10]), [12, 15, 19, 24]).filter((q) => q[1] < D[1] - 4), 'D', 12));
  const below = (X: Pt, Y: Pt, label: string) => room.put([0.5, 0.4, 0.6, 0.3, 0.7].map((t) => add(lerp(X, Y, t), [0, 15])), label);
  if (L.bd) parts.push(below(B, D, L.bd));
  if (L.dc) parts.push(below(D, C, L.dc));
  if (L.bc) parts.push(below(B, C, L.bc));
  if (L.ab) parts.push(room.put(sideSpots(A, B, L.ab, G), L.ab));
  if (L.ac) parts.push(room.put(sideSpots(A, C, L.ac, G), L.ac));
  if (L.ad) parts.push(room.put(sideSpots(A, D, L.ad, undefined, [0.55, 0.45, 0.65, 0.4, 0.7]), L.ad));
  if (L.incentre) parts.push(room.put(ringSpots(I, B, [10, 13, 16]), 'I', 12));
  return svg(F.height, 'Triangle ABC with the bisector of angle A meeting BC at D', parts);
}

/* ---------- where the bisector meets the far side ---------- */

interface SplitParams {
  a: number;
  b: number;
  c: number;
  /** Difficulty 2 gives BD, DC and the perimeter, and asks AB. */
  perimeter: boolean;
}

const splitBD = ({ a, b, c }: SplitParams) => (a * c) / (b + c);

const cmSgBisectorSplit: Generator<SplitParams> = {
  id: 'cm-sg-bisector-split',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(5, 30);
      const b = rng.int(4, 30);
      const c = rng.int(4, 30);
      if (b === c || !validTriangle(a, b, c) || smallestAngle(a, b, c) < 22) continue;
      if ((a * c) % (b + c) !== 0) continue;
      const bd = (a * c) / (b + c);
      if (2 * bd === a) continue;
      return { a, b, c, perimeter: difficulty >= 2 };
    }
  },
  render(p) {
    const bd = splitBD(p);
    const dc = p.a - bd;
    if (p.perimeter) {
      return typed(
        [
          say(`The bisector of angle $A$ in triangle $ABC$ meets $BC$ at $D$, with $BD = ${bd}$ and $DC = ${dc}$. The perimeter of the triangle is $${p.a + p.b + p.c}$.`),
          { kind: 'diagram', svg: bisectorSvg(p.a, p.b, p.c, { ab: '?', bd: `${bd}`, dc: `${dc}` }) },
          say('How long is $AB$?'),
        ],
        p.c,
        'AB =',
      );
    }
    return typed(
      [
        say(`In triangle $ABC$, $AB = ${p.c}$, $AC = ${p.b}$ and $BC = ${p.a}$. The bisector of angle $A$ meets $BC$ at $D$.`),
        { kind: 'diagram', svg: bisectorSvg(p.a, p.b, p.c, { ab: `${p.c}`, ac: `${p.b}`, bd: '?' }) },
        say('How long is $BD$?'),
      ],
      bd,
      'BD =',
    );
  },
  choices(p) {
    const { a, b, c } = p;
    const bd = splitBD(p);
    if (p.perimeter) return tidyOptions(c, [(b + c) / 2, b, (a + b + c) / 3, bd + (b + c - a) / 2], 1, 1);
    return tidyOptions(bd, [a / 2, a - bd, (a * c) / b, c - bd], 1, 1);
  },
  solution(p) {
    const { a, b, c } = p;
    const bd = splitBD(p);
    const dc = a - bd;
    const steps: SolutionStep[] = [
      { text: 'The bisector from $A$ splits $BC$ in the ratio of the two sides next to $A$:' },
      { tex: 'BD : DC = AB : AC' },
    ];
    if (p.perimeter) {
      steps.push(
        { tex: `AB : AC = ${bd} : ${dc}` },
        { text: 'The two sides together are the perimeter less $BC$:' },
        { tex: `AB + AC = ${a + b + c} - ${a} = ${b + c}` },
        { tex: `AB = ${b + c} \\times \\frac{${bd}}{${a}} = ${c}` },
      );
      return steps;
    }
    steps.push(
      { tex: `BD : DC = ${c} : ${b}` },
      { tex: `BD = ${a} \\times \\frac{${c}}{${b + c}} = ${bd}` },
      { text: `$D$ is not the midpoint: halving $BC$, to get $${num(a / 2)}$, is the trap.` },
    );
    return steps;
  },
};

/* ---------- the bisector's length ---------- */

interface BisLengthParams {
  i: number;
  flip: boolean;
  /** Difficulty 2 gives AB, AC and AD, and asks BC. */
  back: boolean;
}

const cmSgBisectorLength: Generator<BisLengthParams> = {
  id: 'cm-sg-bisector-length',
  sample(rng, difficulty) {
    return { i: rng.pick(BISECTOR_DRAWN), flip: rng.int(0, 1) === 1, back: difficulty >= 2 };
  },
  render(p) {
    const r = bisRow(p.i, p.flip);
    if (p.back) {
      return typed(
        [
          say(`In triangle $ABC$, $AB = ${r.c}$ and $AC = ${r.b}$. The bisector of angle $A$ meets $BC$ at $D$, and $AD = ${r.ad}$.`),
          { kind: 'diagram', svg: bisectorSvg(r.a, r.b, r.c, { ab: `${r.c}`, ac: `${r.b}`, ad: `${r.ad}`, bc: '?' }) },
          say('How long is $BC$?'),
        ],
        r.a,
        'BC =',
      );
    }
    return typed(
      [
        say(`In triangle $ABC$, $AB = ${r.c}$, $AC = ${r.b}$ and $BC = ${r.a}$. The bisector of angle $A$ meets $BC$ at $D$.`),
        { kind: 'diagram', svg: bisectorSvg(r.a, r.b, r.c, { ab: `${r.c}`, ac: `${r.b}`, bc: `${r.a}`, ad: '?' }) },
        say('How long is $AD$?'),
      ],
      r.ad,
      'AD =',
    );
  },
  choices(p) {
    const r = bisRow(p.i, p.flip);
    if (p.back) return tidyOptions(r.a, [r.b + r.c - r.ad, 2 * r.ad, (r.b + r.c) / 2, Math.sqrt(r.b * r.b + r.c * r.c - r.ad * r.ad)], 1, 1);
    return tidyOptions(r.ad, [Math.sqrt(r.b * r.c), (r.b + r.c) / 2, Math.sqrt(r.b * r.c - r.bd * r.bd), r.a / 2], 1, 1);
  },
  solution(p) {
    const r = bisRow(p.i, p.flip);
    const bc = r.b * r.c;
    const steps: SolutionStep[] = [
      { text: 'The bisector’s length comes from one rule (Stewart’s theorem, worked through for a bisector):' },
      { tex: 'AD^{2} = AB \\times AC - BD \\times DC' },
    ];
    if (p.back) {
      const s = r.b + r.c;
      steps.push(
        { text: `The bisector splits $BC$ in the ratio $${r.c} : ${r.b}$, so write $BD = ${r.c}t$ and $DC = ${r.b}t$:` },
        { tex: `${r.ad}^{2} = ${bc} - ${bc}t^{2}` },
        { tex: `${bc}t^{2} = ${bc} - ${r.ad * r.ad} = ${bc - r.ad * r.ad}` },
        { tex: `t^{2} = ${fracTex(bc - r.ad * r.ad, bc)}` },
        { tex: `t = ${fracTex(r.a, s)}` },
        { tex: `BC = ${s} \\times ${fracTex(r.a, s)} = ${r.a}` },
      );
      return steps;
    }
    steps.push(
      { text: 'First split $BC$ in the ratio $AB : AC$:' },
      { tex: `BD = ${r.a} \\times \\frac{${r.c}}{${r.b + r.c}} = ${r.bd}, \\qquad DC = ${r.dc}` },
      { tex: `AD^{2} = ${r.c} \\times ${r.b} - ${r.bd} \\times ${r.dc}` },
      { tex: `AD^{2} = ${bc} - ${r.bd * r.dc} = ${r.ad * r.ad}` },
      { tex: `AD = ${r.ad}` },
    );
    return steps;
  },
};

/* ---------- the incentre on the bisector ---------- */

interface IncentreParams {
  a: number;
  b: number;
  c: number;
  /** Difficulty 2: AD is given (a BISECTOR row) and AI is asked; 0 at difficulty 1. */
  ad: number;
}

const cmSgIncentreRatio: Generator<IncentreParams> = {
  id: 'cm-sg-incentre-ratio',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const r = bisRow(rng.pick(BISECTOR_DRAWN), rng.int(0, 1) === 1);
        const ai = incentreAI(r);
        if (!twoPlaces(ai)) continue;
        return { a: r.a, b: r.b, c: r.c, ad: r.ad };
      }
      const a = rng.int(4, 20);
      const b = rng.int(4, 20);
      const c = rng.int(4, 20);
      if (b === c || !validTriangle(a, b, c) || smallestAngle(a, b, c) < 25) continue;
      return { a, b, c, ad: 0 };
    }
  },
  render(p) {
    const { a, b, c } = p;
    if (p.ad > 0) {
      return typed(
        [
          say(`In triangle $ABC$, $AB = ${c}$, $AC = ${b}$ and $BC = ${a}$. The angle bisectors meet at $I$, and $AI$ extended meets $BC$ at $D$, with $AD = ${p.ad}$.`),
          { kind: 'diagram', svg: bisectorSvg(a, b, c, { ab: `${c}`, ac: `${b}`, bc: `${a}`, incentre: true }) },
          say('How long is $AI$?'),
        ],
        incentreAI({ ...p, bd: 0, dc: 0 }),
        'AI =',
      );
    }
    return typed(
      [
        say(`In triangle $ABC$, $AB = ${c}$, $AC = ${b}$ and $BC = ${a}$. The angle bisectors meet at $I$, and $AI$ extended meets $BC$ at $D$.`),
        { kind: 'diagram', svg: bisectorSvg(a, b, c, { ab: `${c}`, ac: `${b}`, bc: `${a}`, incentre: true }) },
        say('What is $\\frac{AI}{ID}$?'),
      ],
      fracAnswer(b + c, a),
      '\\frac{AI}{ID} =',
      FRACTION_KEYS,
    );
  },
  choices(p) {
    const { a, b, c } = p;
    if (p.ad > 0) {
      const ai = incentreAI({ ...p, bd: 0, dc: 0 });
      return tidyOptions(ai, [p.ad / 2, p.ad - ai, (p.ad * c) / (b + c), (p.ad * 2) / 3], 1, 0.1);
    }
    return fracOptions([b + c, a], [[c, b], [a, b + c], [b + c, a + b + c], [a + b + c, a]]);
  },
  solution(p) {
    const { a, b, c } = p;
    const steps: SolutionStep[] = [
      { text: '$BI$ bisects angle $B$ of triangle $ABD$, so it splits $AD$ in the ratio of the two sides next to $B$:' },
      { tex: 'AI : ID = BA : BD' },
      { text: 'and $BD$ comes from the bisector at $A$:' },
      { tex: `BD = ${a} \\times \\frac{${c}}{${b + c}} = ${fracTex(a * c, b + c)}` },
      { tex: `\\frac{AI}{ID} = ${c} \\div ${fracTex(a * c, b + c)} = ${fracTex(b + c, a)}` },
    ];
    if (p.ad > 0) {
      const ai = incentreAI({ ...p, bd: 0, dc: 0 });
      const g = gcd(b + c, a);
      const [u, v] = [(b + c) / g, a / g];
      steps.push(
        { text: `So $AI : ID = ${u} : ${v}$, and $AI$ is $${u}$ of the $${u + v}$ parts of $AD$:` },
        { tex: `AI = ${p.ad} \\times \\frac{${u}}{${u + v}} = ${num(ai)}` },
      );
    } else {
      steps.push({ text: 'In general' }, { tex: 'AI : ID = (AB + AC) : BC' }, { text: `The bisector ratio $${c} : ${b}$ is the trap: that splits $BC$, not $AD$.` });
    }
    return steps;
  },
};

/* ---------- the bisector's pieces as tiles ---------- */

interface BisTilesParams {
  i: number;
  flip: boolean;
  /** Difficulty 2 asks AI in place of DC. */
  withI: boolean;
}

const bisTileValues = (p: BisTilesParams) => {
  const r = bisRow(p.i, p.flip);
  return p.withI ? [r.bd, r.ad, incentreAI(r)] : [r.bd, r.dc, r.ad];
};

const cmSgBisectorTiles: Generator<BisTilesParams> = {
  id: 'cm-sg-bisector-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const p = { i: rng.pick(BISECTOR_DRAWN), flip: rng.int(0, 1) === 1, withI: difficulty >= 2 };
      const values = bisTileValues(p);
      if (p.withI && !twoPlaces(values[2])) continue;
      if (new Set(values).size < 3) continue;
      return p;
    }
  },
  render(p): Slide {
    const r = bisRow(p.i, p.flip);
    const values = bisTileValues(p);
    return {
      kind: 'tiles',
      prompt: [
        say(`In triangle $ABC$, $AB = ${r.c}$, $AC = ${r.b}$ and $BC = ${r.a}$. The bisector of angle $A$ meets $BC$ at $D$${p.withI ? ', and the angle bisectors meet at $I$' : ''}.`),
        { kind: 'diagram', svg: bisectorSvg(r.a, r.b, r.c, { ab: `${r.c}`, ac: `${r.b}`, bc: `${r.a}`, incentre: p.withI }) },
        say('Fill in the lengths.'),
      ],
      template: p.withI ? 'BD = {0} \\quad AD = {1} \\quad AI = {2}' : 'BD = {0} \\quad DC = {1} \\quad AD = {2}',
      bank: numberBank(values, [r.a / 2, r.b + r.c - r.ad, r.ad / 2, r.dc + 1, r.c - r.bd], 3, 1, 1),
      answer: values.map(num),
    };
  },
  solution(p) {
    const r = bisRow(p.i, p.flip);
    const steps: SolutionStep[] = [
      { text: 'The bisector splits $BC$ in the ratio $AB : AC$:' },
      { tex: `BD = ${r.a} \\times \\frac{${r.c}}{${r.b + r.c}} = ${r.bd}, \\qquad DC = ${r.dc}` },
      { text: 'Then the bisector’s length:' },
      { tex: 'AD^{2} = AB \\times AC - BD \\times DC' },
      { tex: `AD^{2} = ${r.b * r.c} - ${r.bd * r.dc} = ${r.ad * r.ad}` },
      { tex: `AD = ${r.ad}` },
    ];
    if (p.withI) {
      steps.push(
        { text: '$I$ cuts $AD$ in the ratio' },
        { tex: `(AB + AC) : BC = ${r.b + r.c} : ${r.a}` },
        { tex: `AI = ${r.ad} \\times \\frac{${r.b + r.c}}{${r.a + r.b + r.c}} = ${num(incentreAI(r))}` },
      );
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 5: Power of a Point
 * ================================================================ */

/** Solve for P from P·u1 = r1 and P·u2 = r2. */
function solve2(u1: Pt, u2: Pt, r1: number, r2: number): Pt {
  const det = u1[0] * u2[1] - u1[1] * u2[0];
  return [(r1 * u2[1] - u1[1] * r2) / det, (u1[0] * r2 - r1 * u2[0]) / det];
}

/** Where lines ab and cd cross. */
function crossing(a: Pt, b: Pt, c: Pt, d: Pt): Pt {
  const r = sub(b, a);
  const s = sub(d, c);
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / (r[0] * s[1] - r[1] * s[0]);
  return add(a, mul(r, t));
}

/** Pairs x ≤ y with x·y = n, each between lo and hi. */
function factorPairs(n: number, lo: number, hi: number): [number, number][] {
  const out: [number, number][] = [];
  for (let x = lo; x * x <= n; x += 1) {
    if (n % x === 0 && n / x <= hi) out.push([x, n / x]);
  }
  return out;
}

/* ---------- two chords crossing ---------- */

interface ChordsParams {
  ap: number;
  pb: number;
  cp: number;
  pd: number;
  /** Difficulty 2 gives the whole of CD and asks the longer part CP. */
  whole: boolean;
}

function chordsSvg(p: ChordsParams): string {
  const u1 = polar(1, 18);
  const u2 = polar(1, 102);
  const Pm = solve2(u1, u2, (p.ap - p.pb) / 2, (p.cp - p.pd) / 2);
  const R = Math.sqrt(p.ap * p.pb + dot2(Pm, Pm));
  const F = frame([[-R, -R], [R, R]], 215, 26);
  const O = F.at([0, 0]);
  const A = F.at(sub(Pm, mul(u1, p.ap)));
  const B = F.at(add(Pm, mul(u1, p.pb)));
  const C = F.at(sub(Pm, mul(u2, p.cp)));
  const D = F.at(add(Pm, mul(u2, p.pd)));
  const P = F.at(Pm);
  const parts = [ring(O, R * F.k), seg(A, B), seg(C, D), dot(P, 2.5)];
  const room = new Clearance(F.height).circle(O, R * F.k).line(A, B).line(C, D);
  for (const [X, name] of [[A, 'A'], [B, 'B'], [C, 'C'], [D, 'D']] as [Pt, string][]) {
    parts.push(vtx(X, name, O, 12));
    room.box(vtxAt(X, O, 12), name);
  }
  const labels: [Pt, string][] = [
    [A, `${p.ap}`],
    [B, `${p.pb}`],
    [C, p.whole ? '?' : `${p.cp}`],
    [D, p.whole ? '' : '?'],
  ];
  // The shortest pieces first, while they still have room beside them.
  labels.sort((x, y) => dist(P, x[0]) - dist(P, y[0]));
  for (const [X, label] of labels) if (label) parts.push(room.put(sideSpots(P, X, label, O, [0.55, 0.45, 0.65, 0.35, 0.75]), label));
  parts.push(room.put(ringSpots(P, O, [11, 14, 18]), 'P', 12));
  return svg(F.height, 'Two chords AB and CD of a circle crossing at P', parts);
}

const cmSgChords: Generator<ChordsParams> = {
  id: 'cm-sg-chords',
  sample(rng, difficulty) {
    for (;;) {
      const n = rng.int(12, 120);
      const pairs = factorPairs(n, 2, 20).filter(([x, y]) => y / x <= 5);
      if (pairs.length < 2) continue;
      const [first, second] = rng.sample(pairs, 2);
      const [ap, pb] = rng.int(0, 1) ? first : [first[1], first[0]];
      if (difficulty >= 2) {
        const [pd, cp] = second;
        if (cp === pd) continue;
        return { ap, pb, cp, pd, whole: true };
      }
      const [cp, pd] = rng.int(0, 1) ? second : [second[1], second[0]];
      return { ap, pb, cp, pd, whole: false };
    }
  },
  render(p) {
    if (p.whole) {
      return typed(
        [
          say(`Chords $AB$ and $CD$ of a circle cross at $P$, with $AP = ${p.ap}$ and $PB = ${p.pb}$. The chord $CD$ is $${p.cp + p.pd}$ long, and $CP$ is longer than $PD$.`),
          { kind: 'diagram', svg: chordsSvg(p) },
          say('How long is $CP$?'),
        ],
        p.cp,
        'CP =',
      );
    }
    return typed(
      [
        say(`Chords $AB$ and $CD$ of a circle cross at $P$, with $AP = ${p.ap}$, $PB = ${p.pb}$ and $CP = ${p.cp}$.`),
        { kind: 'diagram', svg: chordsSvg(p) },
        say('How long is $PD$?'),
      ],
      p.pd,
      'PD =',
    );
  },
  choices(p) {
    const { ap, pb, cp, pd } = p;
    if (p.whole) return tidyOptions(cp, [pd, (cp + pd) / 2, ap + pb - pd, Math.max(ap, pb)], 1, 1);
    return tidyOptions(pd, [ap + pb - cp, (ap * cp) / pb, (pb * cp) / ap, ap + pb], 1, 1);
  },
  solution(p) {
    const { ap, pb, cp, pd } = p;
    const n = ap * pb;
    const steps: SolutionStep[] = [
      { text: 'Triangles $APC$ and $DPB$ are similar: the angles at $P$ are vertically opposite, and $\\angle CAB = \\angle CDB$ because they stand on the same arc $CB$. So' },
      { tex: 'AP \\times PB = CP \\times PD' },
    ];
    if (p.whole) {
      const L = cp + pd;
      steps.push(
        { tex: `CP \\times PD = ${ap} \\times ${pb} = ${n}` },
        { text: `With $PD = ${L} - CP$:` },
        { tex: `CP(${L} - CP) = ${n}` },
        { tex: `CP^{2} - ${L}CP + ${n} = 0` },
        { tex: `(CP - ${cp})(CP - ${pd}) = 0` },
        { text: `So the parts are $${cp}$ and $${pd}$, and the longer one is $CP = ${cp}$.` },
      );
      return steps;
    }
    steps.push({ tex: `${ap} \\times ${pb} = ${cp} \\times PD` }, { tex: `PD = ${n} \\div ${cp} = ${pd}` });
    return steps;
  },
};

/* ---------- from a point outside: two secants, or a secant and a tangent ---------- */

interface SecantParams {
  pa: number;
  pb: number;
  /** The second secant; for a tangent, pc = pd = the tangent length. */
  pc: number;
  pd: number;
  tangent: boolean;
}

function secantSvg(p: SecantParams): string {
  const n = p.pa * p.pb;
  const m1 = (p.pa + p.pb) / 2;
  let Om: Pt = [m1, 0];
  let R = 1;
  let u1 = polar(1, 25);
  let u2 = polar(1, -25);
  if (p.tangent) {
    const d = m1 / Math.cos(rad(25));
    Om = [d, 0];
    R = Math.sqrt(d * d - n);
  } else {
    const m2 = (p.pc + p.pd) / 2;
    for (const alpha of [28, 24, 20, 16, 12, 8]) {
      u1 = polar(1, alpha);
      u2 = polar(1, -alpha);
      Om = [(m1 + m2) / (2 * Math.cos(rad(alpha))), (m1 - m2) / (2 * Math.sin(rad(alpha)))];
      const r2 = dot2(Om, Om) - n;
      if (r2 > (0.2 * Math.max(p.pb, p.pd)) ** 2) {
        R = Math.sqrt(r2);
        break;
      }
    }
  }
  const Tm: Pt = p.tangent ? mul(polar(1, -(Math.asin(R / dist([0, 0], Om)) * 180) / Math.PI), p.pc) : [0, 0];
  const F = frame([[0, 0], [Om[0] - R, Om[1] - R], [Om[0] + R, Om[1] + R]], 210, 26);
  const P = F.at([0, 0]);
  const O = F.at(Om);
  const A = F.at(mul(u1, p.pa));
  const B = F.at(mul(u1, p.pb));
  const parts = [ring(O, R * F.k), seg(P, B), dot(P, 2.5), txt(add(P, [-8, 0]), 'P', 'end')];
  const room = new Clearance(F.height).circle(O, R * F.k).line(P, B).box(add(P, [-12, 0]), 'P');
  // A chord's length goes inside the circle, towards the centre.
  const inward = (X: Pt, Y: Pt) => {
    const m = lerp(X, Y, 0.5);
    return add(m, sub(m, O));
  };
  if (p.tangent) {
    const T = F.at(Tm);
    parts.push(seg(P, T), dot(T, 2.5));
    room.line(P, T);
    parts.push(room.put(ringSpots(T, O), 'T'), room.put(ringSpots(B, O), 'B'), room.put(ringSpots(A, O), 'A'));
    parts.push(room.put(sideSpots(P, T, `${p.pc}`, B), `${p.pc}`), room.put(sideSpots(P, A, `${p.pa}`, T), `${p.pa}`), room.put(sideSpots(A, B, '?', inward(A, B)), '?'));
    return svg(F.height, 'A tangent PT and a line through P cutting the circle at A and B', parts);
  }
  const C = F.at(mul(u2, p.pc));
  const D = F.at(mul(u2, p.pd));
  parts.push(seg(P, D));
  room.line(P, D);
  parts.push(room.put(ringSpots(B, O), 'B'), room.put(ringSpots(D, O), 'D'), room.put(ringSpots(A, O), 'A'), room.put(ringSpots(C, O), 'C'));
  parts.push(room.put(sideSpots(P, A, `${p.pa}`, D), `${p.pa}`), room.put(sideSpots(P, C, `${p.pc}`, B), `${p.pc}`));
  parts.push(room.put(sideSpots(A, B, `${p.pb - p.pa}`, inward(A, B)), `${p.pb - p.pa}`), room.put(sideSpots(C, D, '?', inward(C, D)), '?'));
  return svg(F.height, 'Two lines from a point P outside a circle, cutting it at A and B, and at C and D', parts);
}

const cmSgSecants: Generator<SecantParams> = {
  id: 'cm-sg-secants',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const pt = rng.int(3, 40);
        const pa = rng.int(2, pt - 1);
        if ((pt * pt) % pa !== 0) continue;
        const pb = (pt * pt) / pa;
        // PB at most 4 times PA keeps A clear of P in the figure.
        if (pb > 100 || pb - pa < 2 || pb > 4 * pa) continue;
        return { pa, pb, pc: pt, pd: pt, tangent: true };
      }
      const n = rng.int(12, 200);
      const pairs = factorPairs(n, 2, 30).filter(([x, y]) => y - x >= 2 && y / x <= 4 && x / y <= 0.7);
      if (pairs.length < 2) continue;
      const [[pa, pb], [pc, pd]] = rng.sample(pairs, 2);
      return { pa, pb, pc, pd, tangent: false };
    }
  },
  render(p) {
    const ab = p.pb - p.pa;
    if (p.tangent) {
      return typed(
        [
          say(`From a point $P$ outside a circle, $PT$ touches the circle at $T$, and a line cuts it at $A$ and then $B$. $PT = ${p.pc}$ and $PA = ${p.pa}$.`),
          { kind: 'diagram', svg: secantSvg(p) },
          say('How long is $AB$?'),
        ],
        ab,
        'AB =',
      );
    }
    return typed(
      [
        say(`From a point $P$ outside a circle, one line cuts the circle at $A$ and then $B$, another at $C$ and then $D$. $PA = ${p.pa}$, $AB = ${ab}$ and $PC = ${p.pc}$.`),
        { kind: 'diagram', svg: secantSvg(p) },
        say('How long is $CD$?'),
      ],
      p.pd - p.pc,
      'CD =',
    );
  },
  choices(p) {
    const ab = p.pb - p.pa;
    if (p.tangent) return tidyOptions(ab, [p.pb, p.pc - p.pa, (p.pc * p.pc) / ab, p.pc], 1, 1);
    const cd = p.pd - p.pc;
    return tidyOptions(cd, [(p.pa * ab) / p.pc, p.pd, (p.pb * p.pc) / p.pa - p.pc, ab + p.pa - p.pc], 1, 1);
  },
  solution(p) {
    const ab = p.pb - p.pa;
    const n = p.pa * p.pb;
    if (p.tangent) {
      const t = p.pc;
      return [
        { text: 'A tangent is a line whose two meeting points with the circle have come together, so the rule for two lines from $P$ becomes' },
        { tex: 'PT^{2} = PA \\times PB' },
        { tex: `${t}^{2} = ${p.pa} \\times PB` },
        { tex: `PB = ${t * t} \\div ${p.pa} = ${p.pb}` },
        { tex: `AB = ${p.pb} - ${p.pa} = ${ab}` },
      ];
    }
    return [
      { text: 'Triangles $PAD$ and $PCB$ are similar: they share the angle at $P$, and $\\angle PDA = \\angle PBC$ stand on the same arc $AC$. So, with both lengths on each line measured from $P$,' },
      { tex: 'PA \\times PB = PC \\times PD' },
      { tex: `PB = ${p.pa} + ${ab} = ${p.pb}` },
      { tex: `${p.pa} \\times ${p.pb} = ${p.pc} \\times PD` },
      { tex: `PD = ${n} \\div ${p.pc} = ${p.pd}` },
      { tex: `CD = ${p.pd} - ${p.pc} = ${p.pd - p.pc}` },
      { text: 'Multiplying the outside part by the chord, $PA \\times AB$, is the trap.' },
    ];
  },
};

/* ---------- power from the radius and the distance to the centre ---------- */

interface PowerRadiusParams {
  r: number;
  d: number;
  /** Difficulty 1: a chord through P with parts pa and pb. Difficulty 2 (0, 0): the shortest chord. */
  pa: number;
  pb: number;
}

function powerRadiusSvg(p: PowerRadiusParams): string {
  const { r, d } = p;
  const F = frame([[-r, -r], [r, r]], 215, 26);
  const O = F.at([0, 0]);
  const P = F.at([d, 0]);
  const parts = [ring(O, r * F.k), seg(O, P, false, 1.5), dot(O, 2.5), dot(P, 2.5)];
  const room = new Clearance(F.height).circle(O, r * F.k).line(O, P);
  const blocked: number[] = [0];
  let A: Pt | null = null;
  let B: Pt | null = null;
  if (p.pa > 0) {
    const ux = (p.pa - p.pb) / (2 * d);
    const u: Pt = [ux, Math.sqrt(1 - ux * ux)];
    const Am = sub([d, 0], mul(u, p.pa));
    const Bm = add([d, 0], mul(u, p.pb));
    A = F.at(Am);
    B = F.at(Bm);
    blocked.push((Math.atan2(Am[1], Am[0]) * 180) / Math.PI, (Math.atan2(Bm[1], Bm[0]) * 180) / Math.PI);
    parts.push(seg(A, B));
    room.line(A, B);
  }
  // A radius drawn where nothing else is.
  const gap = (t: number) => Math.min(...blocked.map((b) => Math.abs((((t - b) % 360) + 540) % 360 - 180)));
  const angle = [135, 225, 180, 90, 270, 45, 315].reduce((best, t) => (gap(t) > gap(best) ? t : best));
  const Q = F.at(polar(r, angle));
  parts.push(seg(O, Q, false, 1.5));
  room.line(O, Q);
  if (A && B) parts.push(room.put(ringSpots(A, O), 'A'), room.put(ringSpots(B, O), 'B'));
  parts.push(room.put(ringSpots(P, O, [11, 14, 18]), 'P', 12));
  if (A && B) {
    parts.push(room.put(sideSpots(P, B, '?', O), '?'), room.put(sideSpots(P, A, `${p.pa}`, O), `${p.pa}`));
  }
  parts.push(room.put(sideSpots(O, Q, `${r}`), `${r}`), room.put(sideSpots(O, P, `${d}`), `${d}`));
  parts.push(room.put(ringSpots(O, P, [11, 14, 18]), 'O', 12));
  return svg(F.height, 'A circle with centre O and a point P inside it', parts);
}

const cmSgPowerRadius: Generator<PowerRadiusParams> = {
  id: 'cm-sg-power-radius',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const [s, t, h] = rng.pick(TRIPLES.slice(0, 5));
        const k = rng.int(1, 10);
        const r = h * k;
        if (r > 50) continue;
        const d = (rng.int(0, 1) ? s : t) * k;
        if (d > 0.85 * r) continue;
        return { r, d, pa: 0, pb: 0 };
      }
      const r = rng.int(4, 20);
      const d = rng.int(1, r - 1);
      const pairs = factorPairs(r * r - d * d, 2, 2 * r).filter(([x, y]) => x !== y && y - x <= 1.8 * d && x / y >= 0.35);
      if (pairs.length === 0) continue;
      const [x, y] = rng.pick(pairs);
      const [pa, pb] = rng.int(0, 1) ? [x, y] : [y, x];
      return { r, d, pa, pb };
    }
  },
  render(p) {
    if (p.pa === 0) {
      return typed(
        [say(`A circle has centre $O$ and radius $${p.r}$, and the point $P$ is $${p.d}$ from $O$.`), { kind: 'diagram', svg: powerRadiusSvg(p) }, say('How long is the shortest chord through $P$?')],
        2 * Math.sqrt(p.r * p.r - p.d * p.d),
        '\\text{chord} =',
      );
    }
    return typed(
      [
        say(`A circle has centre $O$ and radius $${p.r}$. The point $P$ is $${p.d}$ from $O$, and a chord $AB$ through $P$ has $PA = ${p.pa}$.`),
        { kind: 'diagram', svg: powerRadiusSvg(p) },
        say('How long is $PB$?'),
      ],
      p.pb,
      'PB =',
    );
  },
  choices(p) {
    const { r, d } = p;
    if (p.pa === 0) {
      const h = Math.sqrt(r * r - d * d);
      return tidyOptions(2 * h, [2 * r, h, 2 * (r - d), r + d], 1, 1);
    }
    return tidyOptions(p.pb, [2 * r - p.pa, r + d - p.pa, (r * r) / p.pa, r - d], 1, 1);
  },
  solution(p) {
    const { r, d } = p;
    const n = r * r - d * d;
    if (p.pa === 0) {
      const h = Math.sqrt(n);
      return [
        { text: 'The further a chord is from $O$, the shorter it is. No chord through $P$ is further from $O$ than $OP$, and the chord at right angles to $OP$ is exactly that far, with $P$ as its midpoint. Half of it is a leg of a right triangle with hypotenuse $r$:' },
        { tex: `\\text{half}^{2} = ${r}^{2} - ${d}^{2} = ${n}` },
        { tex: `\\text{half} = ${h}` },
        { tex: `\\text{chord} = 2 \\times ${h} = ${2 * h}` },
        { text: `The same number comes from the power of $P$: the two halves multiply to $(${r} - ${d})(${r} + ${d}) = ${n}$.` },
      ];
    }
    return [
      { text: 'The diameter through $P$ is a chord through $P$ too, and its parts are $r - OP$ and $r + OP$. Every chord through $P$ has the same product of parts:' },
      { tex: `PA \\times PB = (${r} - ${d})(${r} + ${d}) = ${n}` },
      { tex: `PB = ${n} \\div ${p.pa} = ${p.pb}` },
    ];
  },
};

/* ---------- three chords through one point, as a table ---------- */

interface PowerTableParams {
  n: number;
  /** Each chord's two pieces, A side first. */
  rows: [number, number][];
  /** Difficulty 2 gives the radius and OP instead of a whole row. */
  r: number;
  d: number;
}

/** Signed directions for chords through P = (d, 0), spread as far apart as the pieces allow. */
function chordAngles(rows: [number, number][], d: number): number[] | null {
  const base = rows.map(([p, q]) => {
    const c = (p - q) / (2 * d);
    return Math.abs(c) > 1 ? NaN : (Math.acos(c) * 180) / Math.PI;
  });
  if (base.some((v) => Number.isNaN(v))) return null;
  let best: number[] | null = null;
  let bestGap = -1;
  for (let mask = 0; mask < 8; mask += 1) {
    const angles = base.map((t, i) => ((mask >> i) & 1 ? -t : t));
    let gap = 180;
    for (let i = 0; i < 3; i += 1) {
      for (let j = i + 1; j < 3; j += 1) {
        const diff = Math.abs(angles[i] - angles[j]) % 180;
        gap = Math.min(gap, diff, 180 - diff);
      }
    }
    if (gap > bestGap) {
      bestGap = gap;
      best = angles;
    }
  }
  return bestGap >= 24 ? best : null;
}

/** The model distance OP used to draw a difficulty 1 table: the first that spreads the chords. */
function tableDistance(rows: [number, number][]): number | null {
  const least = Math.max(...rows.map(([p, q]) => Math.abs(p - q))) / 2;
  for (const f of [1.15, 1.4, 1.8, 2.3, 3]) {
    const d = least * f + 0.5;
    if (chordAngles(rows, d)) return d;
  }
  return null;
}

function powerTableSvg(p: PowerTableParams): string {
  const d = p.d > 0 ? p.d : tableDistance(p.rows)!;
  const R = Math.sqrt(p.n + d * d);
  const angles = chordAngles(p.rows, d)!;
  const F = frame([[-R, -R], [R, R]], 215, 26);
  const O = F.at([0, 0]);
  const P = F.at([d, 0]);
  const parts = [ring(O, R * F.k), dot(P, 2.5)];
  const room = new Clearance(F.height).circle(O, R * F.k);
  const names = ['AB', 'CD', 'EF'];
  const ends: [Pt, string][] = [];
  p.rows.forEach(([x, y], i) => {
    const u = polar(1, angles[i]);
    const X = F.at(sub([d, 0], mul(u, x)));
    const Y = F.at(add([d, 0], mul(u, y)));
    ends.push([X, names[i][0]], [Y, names[i][1]]);
    parts.push(seg(X, Y));
    room.line(X, Y);
  });
  for (const [X, name] of ends) parts.push(room.put(ringSpots(X, O), name));
  parts.push(room.put(ringSpots(P, O, [11, 14, 18]), 'P', 12));
  return svg(F.height, 'Three chords AB, CD and EF of a circle through one point P', parts);
}

const cmSgPowerTable: Generator<PowerTableParams> = {
  id: 'cm-sg-power-table',
  sample(rng, difficulty) {
    for (;;) {
      let n: number;
      let r = 0;
      let d = 0;
      if (difficulty >= 2) {
        r = rng.int(5, 15);
        d = rng.int(2, r - 1);
        n = r * r - d * d;
      } else {
        n = rng.int(12, 96);
      }
      const pairs = factorPairs(n, 2, 40).filter(([x, y]) => x !== y && y / x <= 8);
      if (pairs.length < 3) continue;
      const rows = rng.sample(pairs, 3).map(([x, y]) => (rng.int(0, 1) ? [x, y] : [y, x]) as [number, number]);
      if (difficulty >= 2 ? !chordAngles(rows, d) : !tableDistance(rows)) continue;
      const p = { n, rows, r, d };
      const blanks = powerTableAnswer(p);
      if (new Set(blanks).size < blanks.length) continue;
      return p;
    }
  },
  render(p): Slide {
    const names = ['AB', 'CD', 'EF'];
    const given = p.r > 0;
    // Difficulty 1 gives the first row whole; difficulty 2 gives one piece of each.
    const rows = p.rows.map(([x, y], i) => {
      if (!given && i === 0) return [names[i], num(x), num(y)];
      return i === 1 ? [names[i], null, num(y)] : [names[i], num(x), null];
    });
    const answer = powerTableAnswer(p);
    const slips = p.rows.flatMap(([x, y]) => [x + y, Math.abs(y - x), Math.round(p.n / 2)]);
    return {
      kind: 'table',
      prompt: [
        say(
          given
            ? `A circle has radius $${p.r}$, and $P$ is $${p.d}$ from its centre. The chords $AB$, $CD$ and $EF$ all pass through $P$, which cuts each into two pieces. Fill in the missing pieces.`
            : 'The chords $AB$, $CD$ and $EF$ of a circle all pass through $P$, which cuts each into two pieces. Fill in the missing pieces.',
        ),
        { kind: 'diagram', svg: powerTableSvg(p) },
      ],
      columns: ['\\text{chord}', '\\text{one piece}', '\\text{other piece}'],
      rows,
      bank: numberBank(answer, slips, 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution(p) {
    const steps: SolutionStep[] = [{ text: 'Every chord through $P$ has the same product of pieces, the power of $P$:' }];
    if (p.r > 0) steps.push({ tex: `(${p.r} - ${p.d})(${p.r} + ${p.d}) = ${p.n}` });
    else steps.push({ tex: `${p.rows[0][0]} \\times ${p.rows[0][1]} = ${p.n}` });
    p.rows.forEach(([x, y], i) => {
      if (p.r === 0 && i === 0) return;
      steps.push({ tex: i === 1 ? `${p.n} \\div ${y} = ${x}` : `${p.n} \\div ${x} = ${y}` });
    });
    return steps;
  },
};

function powerTableAnswer(p: PowerTableParams): number[] {
  return p.rows.flatMap(([x, y], i) => {
    if (p.r === 0 && i === 0) return [];
    return i === 1 ? [x] : [y];
  });
}

/* ================================================================
 * Lesson 6: Cyclic Quadrilaterals
 * ================================================================ */

/**
 * A, B, C, D on a unit circle with arcs AB = 2α, BC = 2β, CD = 2γ, DA = 2δ
 * (in degrees, α + β + γ + δ = 180), so each is the angle any other corner
 * sees that arc at. AB is centred at the bottom.
 */
function cyclicPts(al: number, be: number, ga: number): [Pt, Pt, Pt, Pt] {
  const a = 270 - al;
  return [polar(1, a), polar(1, a + 2 * al), polar(1, a + 2 * al + 2 * be), polar(1, a + 2 * al + 2 * be + 2 * ga)];
}

type Mark = [vertex: number, from: number, to: number, label: string];

/** The cyclic quadrilateral with both diagonals, and angles marked at corners (0 to 3 for A to D). */
function cyclicSvg(al: number, be: number, ga: number, marks: Mark[], crossMark?: string): string {
  return cyclicLayout(al, be, ga, marks, crossMark).svg;
}

/** Whether every angle's value finds a clear spot in the figure. */
const cyclicFits = (al: number, be: number, ga: number, marks: Mark[], crossMark?: string) => cyclicLayout(al, be, ga, marks, crossMark).worst >= 1;

function cyclicLayout(al: number, be: number, ga: number, marks: Mark[], crossMark?: string): { svg: string; worst: number } {
  const model = cyclicPts(al, be, ga);
  const F = frame([[-1, -1], [1, 1]], 215, 26);
  const O = F.at([0, 0]);
  const V = model.map(F.at);
  const parts = [ring(O, F.k), outline(V), seg(V[0], V[2], false, 1.5), seg(V[1], V[3], false, 1.5)];
  const room = new Clearance(F.height).circle(O, F.k).loop(V).line(V[0], V[2]).line(V[1], V[3]);
  ['A', 'B', 'C', 'D'].forEach((name, i) => {
    parts.push(vtx(V[i], name, O, 12));
    room.box(vtxAt(V[i], O, 12), name);
  });
  const X = crossing(V[0], V[2], V[1], V[3]);
  const angles: [Pt, Pt, Pt, string, number][] = marks.map(([v, a, b, label]) => [V[v], V[a], V[b], label, 15]);
  if (crossMark !== undefined) angles.push([X, V[0], V[1], crossMark, 13]);
  for (const [v, a, b, , r] of angles) {
    parts.push(angleMark(v, a, b, '', r));
    room.arc(v, a, b, r);
  }
  if (crossMark !== undefined) parts.push(room.put(ringSpots(X, sub(X, add(dir(X, V[2]), dir(X, V[3]))), [12, 15, 18]), 'X', 12));
  // Each value out along its angle's bisector, as far as it needs to go to clear both arms.
  for (const [v, a, b, label, r] of angles) {
    const u1 = dir(v, a);
    const u2 = dir(v, b);
    const spread = Math.acos(Math.max(-1, Math.min(1, dot2(u1, u2))));
    const spots: Pt[] = [];
    for (let R = r + 11; R <= 84; R += 3) {
      for (const f of [0.5, 0.42, 0.58, 0.34, 0.66]) {
        const t = Math.atan2(u1[1], u1[0]);
        const cross = u1[0] * u2[1] - u1[1] * u2[0];
        const along = t + (cross > 0 ? 1 : -1) * spread * f;
        spots.push(add(v, [R * Math.cos(along), R * Math.sin(along)]));
      }
    }
    parts.push(room.put(spots, label, 12));
  }
  return { svg: svg(F.height, 'A quadrilateral ABCD with its corners on a circle, and both diagonals', parts), worst: room.worst };
}

const deg = (v: number) => `${v}°`;

/* ---------- angles on the same arc, and opposite angles ---------- */

interface CyclicAnglesParams {
  /** ∠CAD, the angle on arc CD. */
  p: number;
  /** Difficulty 1: ∠ABD (arc DA). Difficulty 2: ∠ACB (arc AB). */
  q: number;
  /** A free arc half, to place the corners. */
  free: number;
  cross: boolean;
}

/** The arcs and marks to draw: crossing, α = q (arc AB), β = free, γ = p (arc CD); otherwise γ = p, δ = q, α = free. */
function cyclicAnglesFigure({ p, q, free, cross }: CyclicAnglesParams): [number, number, number, Mark[], string?] {
  if (cross) return [q, free, p, [[0, 2, 3, deg(p)], [2, 0, 1, deg(q)]], '?'];
  return [free, 180 - p - q - free, p, [[0, 2, 3, deg(p)], [1, 0, 3, deg(q)], [3, 0, 2, '?']]];
}

const cmSgCyclicAngles: Generator<CyclicAnglesParams> = {
  id: 'cm-sg-cyclic-angles',
  sample(rng, difficulty) {
    for (;;) {
      const p = rng.int(25, 65);
      const q = rng.int(25, 65);
      const rest = 180 - p - q;
      if (rest < 50) continue;
      if (difficulty >= 2 && p + q === 90) continue;
      const free = rng.int(25, rest - 25);
      const s = { p, q, free, cross: difficulty >= 2 };
      if (!cyclicFits(...cyclicAnglesFigure(s))) continue;
      return s;
    }
  },
  render(s) {
    const { p, q } = s;
    const rest = 180 - p - q;
    if (s.cross) {
      // α = q (arc AB), γ = p (arc CD), β = free, δ = the rest.
      return typed(
        [
          say(`$ABCD$ is a cyclic quadrilateral whose diagonals cross at $X$, with $\\angle CAD = ${p}^\\circ$ and $\\angle ACB = ${q}^\\circ$.`),
          { kind: 'diagram', svg: cyclicSvg(...cyclicAnglesFigure(s)) },
          say('How many degrees is $\\angle AXB$?'),
        ],
        p + q,
        '\\angle AXB =',
      );
    }
    // γ = p (arc CD), δ = q (arc DA), α = free, β = the rest.
    return typed(
      [
        say(`$ABCD$ is a cyclic quadrilateral with $\\angle CAD = ${p}^\\circ$ and $\\angle ABD = ${q}^\\circ$.`),
        { kind: 'diagram', svg: cyclicSvg(...cyclicAnglesFigure(s)) },
        say('How many degrees is $\\angle ADC$?'),
      ],
      rest,
      '\\angle ADC =',
    );
  },
  choices(s) {
    const { p, q } = s;
    if (s.cross) return angleOptions(p + q, [180 - p - q, 2 * p, 2 * q]);
    return angleOptions(180 - p - q, [180 - q, 180 - p, p + q, 90 - q]);
  },
  solution(s) {
    const { p, q } = s;
    if (s.cross) {
      return [
        { text: '$\\angle ADB$ and $\\angle ACB$ stand on the same arc $AB$, so they are equal:' },
        { tex: `\\angle ADB = ${q}^\\circ` },
        { text: '$\\angle AXB$ is an exterior angle of triangle $AXD$, so it is the sum of the two interior angles opposite it:' },
        { tex: `\\angle AXB = \\angle XAD + \\angle XDA` },
        { tex: `\\angle AXB = ${p}^\\circ + ${q}^\\circ = ${p + q}^\\circ` },
      ];
    }
    return [
      { text: '$\\angle DBC$ and $\\angle DAC$ stand on the same arc $DC$, so they are equal:' },
      { tex: `\\angle DBC = ${p}^\\circ` },
      { tex: `\\angle ABC = ${q}^\\circ + ${p}^\\circ = ${p + q}^\\circ` },
      { text: 'Opposite angles of a cyclic quadrilateral add to $180^\\circ$:' },
      { tex: `\\angle ADC = 180^\\circ - ${p + q}^\\circ = ${180 - p - q}^\\circ` },
    ];
  },
};

/* ---------- a table of angles round a cyclic quadrilateral ---------- */

interface CyclicTableParams {
  a1: number;
  a2: number;
  a3: number;
  /** Difficulty 2 starts from ∠BAC, ∠CAD and ∠ADB. */
  alt: boolean;
}

/** The arc halves α, β, γ, δ. */
function tableArcs({ a1, a2, a3, alt }: CyclicTableParams): [number, number, number, number] {
  // Difficulty 1: δ = ∠ABD, γ = ∠DBC, β = ∠BAC. Difficulty 2: β = ∠BAC, γ = ∠CAD, α = ∠ADB.
  return alt ? [a3, a1, a2, 180 - a1 - a2 - a3] : [180 - a1 - a2 - a3, a3, a2, a1];
}

function tableMarks(p: CyclicTableParams): Mark[] {
  return p.alt
    ? [[0, 1, 2, deg(p.a1)], [0, 2, 3, deg(p.a2)], [3, 0, 1, deg(p.a3)]]
    : [[1, 0, 3, deg(p.a1)], [1, 3, 2, deg(p.a2)], [0, 1, 2, deg(p.a3)]];
}

function cyclicTableValues(p: CyclicTableParams): number[] {
  const [al, be, ga, de] = tableArcs(p);
  return p.alt ? [be, ga, al, de + ga] : [de, ga, be, al + be];
}

const cmSgCyclicTable: Generator<CyclicTableParams> = {
  id: 'cm-sg-cyclic-table',
  sample(rng, difficulty) {
    for (;;) {
      const p = { a1: rng.int(25, 60), a2: rng.int(25, 60), a3: rng.int(25, 60), alt: difficulty >= 2 };
      const arcs = tableArcs(p);
      if (arcs.some((v) => v < 25) || !cyclicFits(arcs[0], arcs[1], arcs[2], tableMarks(p))) continue;
      const values = cyclicTableValues(p);
      if (new Set(values).size < values.length) continue;
      return p;
    }
  },
  render(p): Slide {
    const [al, be, ga] = tableArcs(p);
    const values = cyclicTableValues(p);
    const given = p.alt
      ? `$\\angle BAC = ${p.a1}^\\circ$, $\\angle CAD = ${p.a2}^\\circ$ and $\\angle ADB = ${p.a3}^\\circ$`
      : `$\\angle ABD = ${p.a1}^\\circ$, $\\angle DBC = ${p.a2}^\\circ$ and $\\angle BAC = ${p.a3}^\\circ$`;
    const labels = p.alt ? ['\\angle BDC', '\\angle DBC', '\\angle ACB', '\\angle ABC'] : ['\\angle ACD', '\\angle CAD', '\\angle BDC', '\\angle ADC'];
    const bank = numberBank(values, [180 - p.a1, 180 - p.a3, p.a1 + p.a3, 180 - p.a2 - p.a3], 3, 1, 1);
    return {
      kind: 'table',
      prompt: [say(`$ABCD$ is a cyclic quadrilateral with ${given}. Fill in the angles.`), { kind: 'diagram', svg: cyclicSvg(al, be, ga, tableMarks(p)) }],
      columns: ['\\text{angle}', '\\text{size}'],
      rows: labels.map((label) => [label, null]),
      bank: bank.map((t) => `${t}^\\circ`),
      answer: values.map((v) => `${v}^\\circ`),
    };
  },
  solution(p) {
    const values = cyclicTableValues(p);
    if (p.alt) {
      return [
        { text: 'Angles standing on the same arc are equal:' },
        { tex: `\\angle BDC = \\angle BAC = ${values[0]}^\\circ` },
        { tex: `\\angle DBC = \\angle DAC = ${values[1]}^\\circ` },
        { tex: `\\angle ACB = \\angle ADB = ${values[2]}^\\circ` },
        { text: 'Opposite angles add to $180^\\circ$, and $\\angle ADC$ is made of $\\angle ADB$ and $\\angle BDC$:' },
        { tex: `\\angle ABC = 180^\\circ - (${p.a3}^\\circ + ${p.a1}^\\circ)` },
        { tex: `= ${values[3]}^\\circ` },
      ];
    }
    return [
      { text: 'Angles standing on the same arc are equal:' },
      { tex: `\\angle ACD = \\angle ABD = ${values[0]}^\\circ` },
      { tex: `\\angle CAD = \\angle CBD = ${values[1]}^\\circ` },
      { tex: `\\angle BDC = \\angle BAC = ${values[2]}^\\circ` },
      { text: 'Opposite angles add to $180^\\circ$, and $\\angle ABC$ is made of $\\angle ABD$ and $\\angle DBC$:' },
      { tex: `\\angle ADC = 180^\\circ - (${p.a1}^\\circ + ${p.a2}^\\circ)` },
      { tex: `= ${values[3]}^\\circ` },
    ];
  },
};

/* ---------- Ptolemy's theorem ---------- */

/** Legs of right triangles on a hypotenuse whose only primes are 2 and 5, so BD always terminates. */
const DIAMETER_LEGS: [number, [number, number][]][] = [
  [5, [[3, 4]]],
  [10, [[6, 8]]],
  [20, [[12, 16]]],
  [25, [[7, 24], [15, 20]]],
  [40, [[24, 32]]],
  [50, [[14, 48], [30, 40]]],
  [65, [[25, 60], [39, 52], [33, 56]]],
  [85, [[36, 77], [40, 75], [51, 68]]],
];

interface PtolemyParams {
  /** Difficulty 1: PB and PC round an equilateral triangle. */
  m: number;
  n: number;
  /** Difficulty 2: AC = c a diameter, AB = x1, BC = y1, CD = x2, DA = y2. */
  c: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const ptolemyBD = ({ c, x1, y1, x2, y2 }: PtolemyParams) => (x1 * x2 + y1 * y2) / c;

function ptolemySvg(p: PtolemyParams): string {
  const F = frame([[-1, -1], [1, 1]], 215, 30);
  const O = F.at([0, 0]);
  const R = F.k;
  if (p.c === 0) {
    const s = Math.sqrt(p.m * p.m + p.n * p.n + p.m * p.n);
    const Rreal = s / Math.sqrt(3);
    const theta = (2 * Math.asin(p.m / (2 * Rreal)) * 180) / Math.PI;
    const [A, B, C, P] = [90, 210, 330, 210 + theta].map((t) => F.at(polar(1, t)));
    return svg(F.height, 'An equilateral triangle ABC in a circle, with P on the arc BC', [
      ring(O, R),
      outline([A, B, C]),
      seg(P, B, false, 1.5),
      seg(P, C, false, 1.5),
      seg(P, A, true, 1.5),
      ...[[A, 'A'], [B, 'B'], [C, 'C'], [P, 'P']].map(([X, name]) => vtx(X as Pt, name as string, O, 12)),
      chordLabel(P, B, `${p.m}`, O, R),
      chordLabel(P, C, `${p.n}`, O, R),
      beside(A, P, '?', [[A, B], [A, C]], 0.45),
    ]);
  }
  const tB = 180 - (2 * Math.asin(p.x1 / p.c) * 180) / Math.PI;
  const tD = 180 + (2 * Math.asin(p.y2 / p.c) * 180) / Math.PI;
  const [A, B, C, D] = [180, tB, 0, tD].map((t) => F.at(polar(1, t)));
  return svg(F.height, 'A quadrilateral ABCD in a circle, with the diagonal AC a diameter', [
    ring(O, R),
    outline([A, B, C, D]),
    seg(A, C, false, 1.5),
    seg(B, D, true, 1.5),
    ...[[A, 'A'], [B, 'B'], [C, 'C'], [D, 'D']].map(([X, name]) => vtx(X as Pt, name as string, O, 12)),
    chordLabel(A, B, `${p.x1}`, O, R),
    chordLabel(B, C, `${p.y1}`, O, R),
    chordLabel(C, D, `${p.x2}`, O, R),
    chordLabel(D, A, `${p.y2}`, O, R),
    besideClear(A, C, `${p.c}`, [[B, D], [A, B], [B, C], [C, D], [D, A]]),
    besideClear(B, D, '?', [[A, C], [A, B], [B, C], [C, D], [D, A]]),
  ]);
}

const cmSgPtolemy: Generator<PtolemyParams> = {
  id: 'cm-sg-ptolemy',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty < 2) {
        const m = rng.int(2, 15);
        const n = rng.int(2, 15);
        if (m === n || Math.max(m, n) > 4 * Math.min(m, n)) continue;
        return { m, n, c: 0, x1: 0, y1: 0, x2: 0, y2: 0 };
      }
      const [c, legs] = rng.pick(DIAMETER_LEGS);
      const orient = (l: [number, number]): [number, number] => (rng.int(0, 1) ? l : [l[1], l[0]]);
      const [x1, y1] = orient(rng.pick(legs));
      const [x2, y2] = orient(rng.pick(legs));
      // Not a rectangle, where BD is just the other diameter, nor a kite, where BD is twice a height.
      if ((x1 === x2 && y1 === y2) || (x1 === y2 && y1 === x2)) continue;
      // BD to at most one decimal place.
      if (((x1 * x2 + y1 * y2) * 10) % c !== 0) continue;
      return { m: 0, n: 0, c, x1, y1, x2, y2 };
    }
  },
  render(p) {
    if (p.c === 0) {
      return typed(
        [
          say(`$ABC$ is an equilateral triangle, and $P$ is on the arc $BC$ of the circle through its corners, with $PB = ${p.m}$ and $PC = ${p.n}$.`),
          { kind: 'diagram', svg: ptolemySvg(p) },
          say('How long is $PA$?'),
        ],
        p.m + p.n,
        'PA =',
      );
    }
    return typed(
      [
        say(`$ABCD$ is a cyclic quadrilateral with $AB = ${p.x1}$, $BC = ${p.y1}$, $CD = ${p.x2}$ and $DA = ${p.y2}$. Its diagonal $AC$ is a diameter, $${p.c}$ long.`),
        { kind: 'diagram', svg: ptolemySvg(p) },
        say('How long is the diagonal $BD$?'),
      ],
      ptolemyBD(p),
      'BD =',
    );
  },
  choices(p) {
    if (p.c === 0) {
      const { m, n } = p;
      return tidyOptions(m + n, [2 * Math.max(m, n), Math.abs(m - n), m * n, Math.max(m, n) + 1], 1, 1);
    }
    const bd = ptolemyBD(p);
    return tidyOptions(bd, [p.c, Math.round(((p.x1 * p.y2 + p.y1 * p.x2) / p.c) * 10) / 10, (p.x1 + p.x2 + p.y1 + p.y2) / 2], 1, 0.1);
  },
  solution(p) {
    if (p.c === 0) {
      const { m, n } = p;
      return [
        { text: 'Ptolemy’s theorem: in a cyclic quadrilateral, the product of the diagonals is the sum of the products of opposite sides. Going round $ABPC$, with $s$ the side of the triangle:' },
        { tex: 'PA \\times BC = PB \\times AC + PC \\times AB' },
        { tex: `PA \\times s = ${m}s + ${n}s` },
        { tex: `PA = ${m} + ${n} = ${m + n}` },
      ];
    }
    const sum = p.x1 * p.x2 + p.y1 * p.y2;
    return [
      { text: 'Ptolemy’s theorem: the product of the diagonals is the sum of the products of opposite sides.' },
      { tex: 'AC \\times BD = AB \\times CD + BC \\times DA' },
      { tex: `${p.c} \\times BD = ${p.x1} \\times ${p.x2} + ${p.y1} \\times ${p.y2}` },
      { tex: `${p.c} \\times BD = ${sum}` },
      { tex: `BD = ${sum} \\div ${p.c} = ${num(ptolemyBD(p))}` },
      { text: 'Taking the diagonals as equal, as in a rectangle, is the trap.' },
    ];
  },
};

/* ---------- Brahmagupta's formula ---------- */

/**
 * Cyclic quadrilaterals with whole sides and a whole area, sides in order
 * round the shape. Found by exact whole-number arithmetic: the area squared
 * is the product (s - a)(s - b)(s - c)(s - d), tested for being a square.
 */
const BRAHMA: [number, number, number, number, number][] = [];
/** Those with a circle inside as well (a + c = b + d), where the area is √(abcd). */
const BICENTRIC: [number, number, number, number, number][] = [];
for (let a = 2; a <= 20; a += 1) {
  for (let b = 2; b <= 20; b += 1) {
    for (let c = 2; c <= 20; c += 1) {
      for (let d = 2; d <= 20; d += 1) {
        const twice = a + b + c + d;
        if (twice % 2 !== 0) continue;
        const s = twice / 2;
        if (Math.max(a, b, c, d) >= s || Math.max(a, b, c, d) > 3.5 * Math.min(a, b, c, d)) continue;
        const sq = (s - a) * (s - b) * (s - c) * (s - d);
        if (!isSquare(sq)) continue;
        const area = iroot(sq);
        if (a + c === b + d) {
          if (area <= 300) BICENTRIC.push([a, b, c, d, area]);
          continue;
        }
        // One of each shape up to turning and flipping: a smallest, b ≤ d.
        if (a > Math.min(b, c, d) || b > d || new Set([a, b, c, d]).size < 4 || area > 250) continue;
        if (((a + c) * (b + d)) / 4 === area) continue;
        BRAHMA.push([a, b, c, d, area]);
      }
    }
  }
}

/** Corners of the cyclic quadrilateral with sides AB = a, BC = b, CD = c, DA = d, and its circle. */
function cyclicFromSides(a: number, b: number, c: number, d: number) {
  const cosB = (a * a + b * b - c * c - d * d) / (2 * (a * b + c * d));
  const Bm: Pt = [0, 0];
  const Am: Pt = [a, 0];
  const Cm: Pt = polar(b, (Math.acos(cosB) * 180) / Math.PI);
  const e = dist(Am, Cm);
  const u = dir(Am, Cm);
  let n: Pt = [-u[1], u[0]];
  if (dot2(n, sub(Bm, Am)) > 0) n = mul(n, -1);
  const along = (e * e + d * d - c * c) / (2 * e);
  const Dm = add(add(Am, mul(u, along)), mul(n, Math.sqrt(Math.max(0, d * d - along * along))));
  // The circle through A, B and C.
  const D2 = 2 * (Am[0] * (Bm[1] - Cm[1]) + Bm[0] * (Cm[1] - Am[1]) + Cm[0] * (Am[1] - Bm[1]));
  const sq = (p: Pt) => dot2(p, p);
  const Om: Pt = [
    (sq(Am) * (Bm[1] - Cm[1]) + sq(Bm) * (Cm[1] - Am[1]) + sq(Cm) * (Am[1] - Bm[1])) / D2,
    (sq(Am) * (Cm[0] - Bm[0]) + sq(Bm) * (Am[0] - Cm[0]) + sq(Cm) * (Bm[0] - Am[0])) / D2,
  ];
  return { A: Am, B: Bm, C: Cm, D: Dm, O: Om, R: dist(Om, Am) };
}

function brahmaSvg(sides: [number, number, number, number], labels: string[]): string {
  const q = cyclicFromSides(...sides);
  const F = frame([[q.O[0] - q.R, q.O[1] - q.R], [q.O[0] + q.R, q.O[1] + q.R]], 215, 30);
  const O = F.at(q.O);
  const V = [q.A, q.B, q.C, q.D].map(F.at);
  const parts = [ring(O, q.R * F.k, true), outline(V)];
  ['A', 'B', 'C', 'D'].forEach((name, i) => parts.push(vtx(V[i], name, O, 12)));
  const inside = centroid(V);
  labels.forEach((label, i) => {
    // Inside the quadrilateral: outside it the label would sit on the circle, which runs close to every side.
    const m = lerp(V[i], V[(i + 1) % 4], 0.5);
    if (label) parts.push(outside(V[i], V[(i + 1) % 4], label, add(m, sub(m, inside))));
  });
  return svg(F.height, 'A quadrilateral ABCD with its corners on a circle', parts);
}

interface BrahmaParams {
  i: number;
  /** Difficulty 2 draws from BICENTRIC, starting the given sides at corner `turn`. */
  bicentric: boolean;
  turn: number;
}

function brahmaSides(p: BrahmaParams): [number, number, number, number, number] {
  if (!p.bicentric) return BRAHMA[p.i];
  const [a, b, c, d, area] = BICENTRIC[p.i];
  const s = [a, b, c, d];
  return [s[p.turn % 4], s[(p.turn + 1) % 4], s[(p.turn + 2) % 4], s[(p.turn + 3) % 4], area];
}

const cmSgBrahmagupta: Generator<BrahmaParams> = {
  id: 'cm-sg-brahmagupta',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { i: rng.int(0, BICENTRIC.length - 1), bicentric: true, turn: rng.int(0, 3) };
    return { i: rng.int(0, BRAHMA.length - 1), bicentric: false, turn: 0 };
  },
  render(p) {
    const [a, b, c, d, area] = brahmaSides(p);
    if (p.bicentric) {
      return typed(
        [
          say(`$ABCD$ has a circle through its four corners and another circle touching its four sides. $AB = ${a}$, $BC = ${b}$ and $CD = ${c}$.`),
          { kind: 'diagram', svg: brahmaSvg([a, b, c, d], [`${a}`, `${b}`, `${c}`, '']) },
          say('What is the area of $ABCD$?'),
        ],
        area,
        '\\text{area} =',
      );
    }
    return typed(
      [
        say(`A cyclic quadrilateral $ABCD$ has $AB = ${a}$, $BC = ${b}$, $CD = ${c}$ and $DA = ${d}$.`),
        { kind: 'diagram', svg: brahmaSvg([a, b, c, d], [`${a}`, `${b}`, `${c}`, `${d}`]) },
        say('What is its area?'),
      ],
      area,
      '\\text{area} =',
    );
  },
  choices(p) {
    const [a, b, c, d, area] = brahmaSides(p);
    return tidyOptions(area, [((a + c) * (b + d)) / 4, 2 * area, a * c, b * d], 1, 1);
  },
  solution(p) {
    const [a, b, c, d, area] = brahmaSides(p);
    if (p.bicentric) {
      return [
        { text: 'A circle touches all four sides, so opposite sides add to the same total:' },
        { tex: `DA = ${a} + ${c} - ${b} = ${d}` },
        { text: 'Half the perimeter is then $AB + CD$, so $s - a$ is the side opposite $a$, and so on round. Brahmagupta’s formula becomes' },
        { tex: '\\text{area} = \\sqrt{abcd}' },
        { tex: `\\text{area} = \\sqrt{${a} \\times ${b} \\times ${c} \\times ${d}}` },
        { tex: `\\text{area} = \\sqrt{${a * b * c * d}} = ${area}` },
      ];
    }
    const s = (a + b + c + d) / 2;
    return [
      { text: 'Brahmagupta’s formula gives the area $K$ of a cyclic quadrilateral, with $s$ half the perimeter:' },
      { tex: 'K = \\sqrt{(s - a)(s - b)(s - c)(s - d)}' },
      { tex: `s = (${a} + ${b} + ${c} + ${d}) \\div 2 = ${s}` },
      { tex: `K = \\sqrt{${s - a} \\times ${s - b} \\times ${s - c} \\times ${s - d}}` },
      { tex: `K = \\sqrt{${(s - a) * (s - b) * (s - c) * (s - d)}} = ${area}` },
      { text: `Averaging opposite sides and multiplying, $${num(((a + c) * (b + d)) / 4)}$, is the trap: that is only right for a rectangle.` },
    ];
  },
};

/* ================================================================
 * Lesson 7: Circles
 * ================================================================ */

/** Tangent lengths t from each corner of a polygon round a circle of radius r: Σ atan(t/r) = π. */
function incircleRadius(t: number[]): number {
  let lo = 1e-3;
  let hi = 1e3;
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    const total = t.reduce((s, x) => s + Math.atan(x / mid), 0);
    if (total > Math.PI) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Corners of a quadrilateral round a circle (centre at the origin) with tangent lengths t, AB at the bottom. */
function tangentialQuad(t: number[]): { r: number; V: Pt[]; touch: Pt[] } {
  const r = incircleRadius(t);
  const half = t.map((x) => (Math.atan(x / r) * 180) / Math.PI);
  const V: Pt[] = [];
  const touch: Pt[] = [];
  let angle = 270 - half[0];
  for (let i = 0; i < 4; i += 1) {
    V.push(polar(Math.hypot(r, t[i]), angle));
    touch.push(polar(r, angle + half[i]));
    angle += half[i] + half[(i + 1) % 4];
  }
  return { r, V, touch };
}

function tangentialSvg(t: number[], labels: string[]): string {
  const q = tangentialQuad(t);
  const F = frame(q.V, 210, 30);
  const O = F.at([0, 0]);
  const V = q.V.map(F.at);
  const parts = [ring(O, q.r * F.k), outline(V), ...q.touch.map((p) => dot(F.at(p), 2))];
  ['A', 'B', 'C', 'D'].forEach((name, i) => parts.push(vtx(V[i], name, O, 12)));
  labels.forEach((label, i) => {
    if (label) parts.push(outside(V[i], V[(i + 1) % 4], label, O));
  });
  return svg(F.height, 'A quadrilateral ABCD with a circle inside touching all four sides', parts);
}

/** Least interior angle of the tangential quadrilateral, in degrees. */
const leastCorner = (t: number[]) => {
  const r = incircleRadius(t);
  return Math.min(...t.map((x) => (2 * Math.atan(r / x) * 180) / Math.PI));
};

/* ---------- equal tangents: Pitot, and a trapezium ---------- */

interface PitotParams {
  /** Tangent lengths from A, B, C, D; empty for the trapezium. */
  t: number[];
  /** Difficulty 2: the parallel sides of an isosceles trapezium. */
  a: number;
  b: number;
}

const pitotSides = (t: number[]) => [t[0] + t[1], t[1] + t[2], t[2] + t[3], t[3] + t[0]];
const trapRadius = ({ a, b }: PitotParams) => Math.sqrt(a * b) / 2;

function trapeziumSvg(a: number, b: number): string {
  const h = Math.sqrt(a * b);
  const pts: Pt[] = [
    [-b / 2, 0],
    [b / 2, 0],
    [a / 2, h],
    [-a / 2, h],
  ];
  const F = frame(pts, 205, 30);
  const V = pts.map(F.at);
  const O = F.at([0, h / 2]);
  return svg(F.height, 'An isosceles trapezium with a circle inside touching all four sides', [
    outline(V),
    ring(O, (h / 2) * F.k),
    dot(O, 2.5),
    seg(O, F.at([0, 0]), true, 1.5),
    txt(add(lerp(O, F.at([0, 0]), 0.5), [7, 0]), 'r', 'start', 12),
    txt(add(lerp(V[0], V[1], 0.5), [0, 15]), `${b}`),
    txt(add(lerp(V[2], V[3], 0.5), [0, -12]), `${a}`),
  ]);
}

const cmSgPitot: Generator<PitotParams> = {
  id: 'cm-sg-pitot',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const a = rng.int(1, 30);
        const b = rng.int(a + 1, 64);
        if (!isSquare(a * b) || b > 9 * a) continue;
        return { t: [], a, b };
      }
      const t = [rng.int(1, 9), rng.int(1, 9), rng.int(1, 9), rng.int(1, 9)];
      if (leastCorner(t) < 40) continue;
      const [ab, bc, cd, da] = pitotSides(t);
      if (new Set([ab, bc, cd, da]).size < 4) continue;
      return { t, a: 0, b: 0 };
    }
  },
  render(p) {
    if (p.t.length === 0) {
      return typed(
        [
          say(`An isosceles trapezium has parallel sides $${p.a}$ and $${p.b}$, and a circle inside it touches all four sides.`),
          { kind: 'diagram', svg: trapeziumSvg(p.a, p.b) },
          say('What is the radius $r$ of the circle?'),
        ],
        trapRadius(p),
        'r =',
      );
    }
    const [ab, bc, cd] = pitotSides(p.t);
    return typed(
      [
        say(`Quadrilateral $ABCD$ has a circle inside it touching all four sides, with $AB = ${ab}$, $BC = ${bc}$ and $CD = ${cd}$.`),
        { kind: 'diagram', svg: tangentialSvg(p.t, [`${ab}`, `${bc}`, `${cd}`, '?']) },
        say('How long is $DA$?'),
      ],
      pitotSides(p.t)[3],
      'DA =',
    );
  },
  choices(p) {
    if (p.t.length === 0) {
      const r = trapRadius(p);
      return tidyOptions(r, [2 * r, (p.a + p.b) / 4, (p.b - p.a) / 2, (p.a + p.b) / 2], Number.isInteger(r) ? 1 : 0.5, 0.5);
    }
    const [ab, bc, cd, da] = pitotSides(p.t);
    return tidyOptions(da, [(ab + bc + cd) / 3, bc + cd - ab, ab + bc - cd, bc], 1, 1);
  },
  solution(p) {
    if (p.t.length === 0) {
      const { a, b } = p;
      const slant = (a + b) / 2;
      const cut = (b - a) / 2;
      const h = Math.sqrt(a * b);
      return [
        { text: 'The two tangents from a corner are equal, so opposite sides add to the same total. The slanted sides are equal, so each is half of $a + b$:' },
        { tex: `\\text{slant} = (${a} + ${b}) \\div 2 = ${num(slant)}` },
        { text: 'Drop perpendiculars from the ends of the short side. Each cuts off' },
        { tex: `(${b} - ${a}) \\div 2 = ${num(cut)}` },
        { text: 'and the height, which is the circle’s diameter, comes from Pythagoras:' },
        { tex: `h^{2} = ${num(slant)}^{2} - ${num(cut)}^{2} = ${a * b}` },
        { tex: `h = ${h}` },
        { tex: `r = ${h} \\div 2 = ${num(h / 2)}` },
      ];
    }
    const [ab, bc, cd, da] = pitotSides(p.t);
    return [
      { text: 'The two tangents from a corner to the circle are equal. Call them $w$, $x$, $y$ and $z$ from $A$, $B$, $C$ and $D$:' },
      { tex: 'AB = w + x, \\qquad BC = x + y' },
      { tex: 'CD = y + z, \\qquad DA = z + w' },
      { text: 'So $AB + CD$ and $BC + DA$ are both $w + x + y + z$:' },
      { tex: `DA = ${ab} + ${cd} - ${bc} = ${da}` },
    ];
  },
};

/* ---------- tangent lengths as a table ---------- */

interface TangentTableParams {
  /** Difficulty 1: triangle sides a = BC, b = CA, c = AB. */
  a: number;
  b: number;
  c: number;
  /** Difficulty 2: the quadrilateral's tangent lengths from A, B, C, D. */
  t: number[];
}

function tangentTriangleSvg(a: number, b: number, c: number): string {
  const [Am, Bm, Cm] = placeTriangle(c, b, a);
  const F = frame([Am, Bm, Cm], 205, 30);
  const [A, B, C] = [Am, Bm, Cm].map(F.at);
  const I = mul(add(add(mul(A, a), mul(B, b)), mul(C, c)), 1 / (a + b + c));
  const s = (a + b + c) / 2;
  const r = (Math.sqrt(s * (s - a) * (s - b) * (s - c)) / s) * F.k;
  const G = centroid([A, B, C]);
  return svg(F.height, 'Triangle ABC with the circle inside it touching all three sides', [
    outline([A, B, C]),
    ring(I, r),
    ...[foot(I, A, B), foot(I, B, C), foot(I, C, A)].map((X) => dot(X, 2.5)),
    vtx(A, 'A', G),
    vtx(B, 'B', G),
    vtx(C, 'C', G),
    outside(A, B, `${c}`, G),
    outside(B, C, `${a}`, G),
    outside(C, A, `${b}`, G),
  ]);
}

function tangentTableValues(p: TangentTableParams): number[] {
  if (p.t.length === 0) {
    const s = (p.a + p.b + p.c) / 2;
    return [s - p.a, s - p.b, s - p.c];
  }
  return [p.t[1], p.t[2], p.t[3], p.t[3] + p.t[0]];
}

const cmSgTangentTable: Generator<TangentTableParams> = {
  id: 'cm-sg-tangent-table',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const t = [rng.int(1, 9), rng.int(1, 9), rng.int(1, 9), rng.int(1, 9)];
        if (leastCorner(t) < 40) continue;
        const p = { a: 0, b: 0, c: 0, t };
        const values = tangentTableValues(p);
        if (new Set([...values, t[0]]).size < 5) continue;
        return p;
      }
      const a = rng.int(4, 20);
      const b = rng.int(4, 20);
      const c = rng.int(4, 20);
      if ((a + b + c) % 2 !== 0 || new Set([a, b, c]).size < 3 || !validTriangle(a, b, c) || smallestAngle(a, b, c) < 25) continue;
      return { a, b, c, t: [] };
    }
  },
  render(p): Slide {
    const values = tangentTableValues(p);
    if (p.t.length === 0) {
      const { a, b, c } = p;
      const s = (a + b + c) / 2;
      return {
        kind: 'table',
        prompt: [
          say(`Triangle $ABC$ has $BC = ${a}$, $CA = ${b}$ and $AB = ${c}$, and a circle inside it touches all three sides. $t_{A}$ is the length of the tangent from $A$ to the circle, and so on. Fill them in.`),
          { kind: 'diagram', svg: tangentTriangleSvg(a, b, c) },
        ],
        columns: ['\\text{tangent}', '\\text{length}'],
        rows: [['t_{A}', null], ['t_{B}', null], ['t_{C}', null]],
        bank: numberBank(values, [s, a / 2, b / 2, c / 2, s - values[0]], 3, 1, 1),
        answer: values.map(num),
      };
    }
    const [ab, bc, cd] = pitotSides(p.t);
    return {
      kind: 'table',
      prompt: [
        say(`Quadrilateral $ABCD$ has a circle inside it touching all four sides, with $AB = ${ab}$, $BC = ${bc}$ and $CD = ${cd}$. The tangent from $A$ to the circle is $t_{A} = ${p.t[0]}$. Fill in the other tangents and $DA$.`),
        { kind: 'diagram', svg: tangentialSvg(p.t, [`${ab}`, `${bc}`, `${cd}`, '']) },
      ],
      columns: ['\\text{length}', '\\text{value}'],
      rows: [['t_{B}', null], ['t_{C}', null], ['t_{D}', null], ['DA', null]],
      bank: numberBank(values, [ab - bc + cd, ab + p.t[0], bc - p.t[0], cd - p.t[0]], 3, 1, 1),
      answer: values.map(num),
    };
  },
  solution(p) {
    const values = tangentTableValues(p);
    if (p.t.length === 0) {
      const { a, b, c } = p;
      const s = (a + b + c) / 2;
      return [
        { text: 'The two tangents from a corner are equal, so each side is made of two tangents:' },
        { tex: `t_{A} + t_{B} = ${c}, \\qquad t_{B} + t_{C} = ${a}, \\qquad t_{C} + t_{A} = ${b}` },
        { text: 'Adding all three counts every tangent twice:' },
        { tex: `t_{A} + t_{B} + t_{C} = (${a} + ${b} + ${c}) \\div 2` },
        { tex: `= ${s}` },
        { text: 'Take off the side made of the other two:' },
        { tex: `t_{A} = ${s} - ${a} = ${values[0]}` },
        { tex: `t_{B} = ${s} - ${b} = ${values[1]}` },
        { tex: `t_{C} = ${s} - ${c} = ${values[2]}` },
      ];
    }
    const [ab, bc, cd] = pitotSides(p.t);
    return [
      { text: 'Walk round the corners: each side is two tangents, so take off the one you know.' },
      { tex: `t_{B} = ${ab} - ${p.t[0]} = ${values[0]}` },
      { tex: `t_{C} = ${bc} - ${values[0]} = ${values[1]}` },
      { tex: `t_{D} = ${cd} - ${values[1]} = ${values[2]}` },
      { tex: `DA = ${values[2]} + ${p.t[0]} = ${values[3]}` },
    ];
  },
};

/* ---------- two parallel chords ---------- */

/**
 * Half-chords and distances (p, x) with p² + x² = r², whole, for every radius
 * up to 65 that has any. Found by exact whole-number arithmetic.
 */
const CHORD_LEGS: [number, [number, number][]][] = [];
for (let r = 5; r <= 65; r += 1) {
  const legs: [number, number][] = [];
  for (let p = 1; p < r; p += 1) if (isSquare(r * r - p * p)) legs.push([p, iroot(r * r - p * p)]);
  if (legs.length >= 2) CHORD_LEGS.push([r, legs]);
}

interface ParallelChordsParams {
  r: number;
  /** Half-chord and distance from the centre, the shorter chord first. */
  p: number;
  x: number;
  q: number;
  y: number;
  same: boolean;
}

const chordGap = ({ x, y, same }: ParallelChordsParams) => (same ? Math.abs(x - y) : x + y);

function parallelChordsSvg(s: ParallelChordsParams): string {
  const { r, p, x, q, y } = s;
  const F = frame([[-r, -r], [r, r]], 215, 26);
  const O = F.at([0, 0]);
  const y2 = s.same ? y : -y;
  const P1 = F.at([-p, x]);
  const P2 = F.at([p, x]);
  const Q1 = F.at([-q, y2]);
  const Q2 = F.at([q, y2]);
  const dimX = 0.45 * Math.min(p, q);
  const top = F.at([dimX, x]);
  const bottom = F.at([dimX, y2]);
  // Each chord's length sits outside the circle, level with the chord.
  const left = O[0] - r * F.k - 7;
  return svg(F.height, s.same ? 'A circle with two parallel chords on the same side of the centre' : 'A circle with two parallel chords on opposite sides of the centre', [
    ring(O, r * F.k),
    seg(P1, P2),
    seg(Q1, Q2),
    dot(O, 2.5),
    txt(add(O, [-9, 0]), 'O', 'end', 12),
    seg(top, bottom, true, 1.2),
    txt(add(lerp(top, bottom, 0.5), [6, 0]), `${chordGap(s)}`, 'start'),
    seg([left + 3, P1[1]], P1, true, 1),
    seg([left + 3, Q1[1]], Q1, true, 1),
    txt([left, P1[1]], `${2 * p}`, 'end', 12),
    txt([left, Q1[1]], `${2 * q}`, 'end', 12),
  ]);
}

const cmSgParallelChords: Generator<ParallelChordsParams> = {
  id: 'cm-sg-parallel-chords',
  sample(rng, difficulty) {
    const same = difficulty >= 2;
    for (;;) {
      const [r, legs] = rng.pick(CHORD_LEGS);
      const [[p, x], [q, y]] = rng.sample(legs, 2);
      if (p >= q) continue;
      const s = { r, p, x, q, y, same };
      if (Math.max(x, y) > 0.95 * r || chordGap(s) < 0.17 * r) continue;
      return s;
    }
  },
  render(s) {
    return typed(
      [
        say(`Two parallel chords of a circle are $${2 * s.p}$ and $${2 * s.q}$ long, and $${chordGap(s)}$ apart, on ${s.same ? 'the same side' : 'opposite sides'} of the centre.`),
        { kind: 'diagram', svg: parallelChordsSvg(s) },
        say('What is the radius of the circle?'),
      ],
      s.r,
      'r =',
    );
  },
  choices(s) {
    const g = chordGap(s);
    return tidyOptions(s.r, [s.p + s.q, Math.sqrt(s.p * s.p + (g / 2) ** 2), g, s.q + g / 2], 1, 1);
  },
  solution(s) {
    const { p, q, x } = s;
    const g = chordGap(s);
    const rhs = q * q + g * g - p * p;
    return [
      {
        text: s.same
          ? `The shorter chord is further from the centre. Say it is $x$ from the centre, so the $${2 * q}$ chord is $x - ${g}$ from it. Half of each chord, its distance from the centre and a radius make a right triangle:`
          : `Say the $${2 * p}$ chord is $x$ from the centre, so the $${2 * q}$ chord is $${g} - x$ from it. Half of each chord, its distance from the centre and a radius make a right triangle:`,
      },
      { tex: s.same ? `${p}^{2} + x^{2} = ${q}^{2} + (x - ${g})^{2}` : `${p}^{2} + x^{2} = ${q}^{2} + (${g} - x)^{2}` },
      { tex: s.same ? `${p * p} + x^{2} = ${q * q} + x^{2} - ${2 * g}x + ${g * g}` : `${p * p} + x^{2} = ${q * q} + ${g * g} - ${2 * g}x + x^{2}` },
      { tex: `${2 * g}x = ${rhs}` },
      { tex: `x = ${x}` },
      { tex: `r^{2} = ${p}^{2} + ${x}^{2} = ${s.r * s.r}` },
      { tex: `r = ${s.r}` },
    ];
  },
};

/* ---------- the angle between two tangents ---------- */

interface TangentAngleParams {
  x: number;
  minor: boolean;
}

function tangentAngleSvg(p: TangentAngleParams): string {
  const half = p.x / 2;
  const dP = 1 / Math.sin(rad(half));
  const Am = polar(1, 90 - half);
  const Bm = polar(1, -(90 - half));
  // On the shorter arc C sits off the line OP, leaving the gap in front of P for the angle there.
  const Cm = polar(1, p.minor ? 0.4 * (90 - half) : 196);
  const F = frame([[-1, -1], [1, 1], [dP, 0]], p.minor ? 240 : 205, 28);
  const [O, A, B, C, P] = [[0, 0] as Pt, Am, Bm, Cm, [dP, 0] as Pt].map(F.at);
  const room = new Clearance(F.height).circle(O, F.k).line(A, P, B).line(A, C, B).arc(P, A, B, 10).arc(C, A, B, 13);
  room.box(add(P, [13, 0]), 'P');
  const parts = [ring(O, F.k), seg(P, A), seg(P, B), seg(C, A, false, 1.5), seg(C, B, false, 1.5), dot(O, 2), txt(add(P, [9, 0]), 'P', 'start')];
  parts.push(angleMark(P, A, B, '', 10), angleMark(C, A, B, '', 13));
  // Each angle's value out along its bisector, as close in as it fits; the value at P before C's letter, which has more choice.
  const along = (v: Pt, toward: Pt, from: number) => Array.from({ length: 16 }, (_, i) => add(v, mul(dir(v, toward), from + 2 * i)));
  parts.push(room.put(ringSpots(A, O), 'A'), room.put(ringSpots(B, O), 'B'), room.put(along(P, O, 20), deg(p.x), 12));
  parts.push(room.put(ringSpots(C, O, [12, 15, 19]), 'C', 13, 7), room.put(along(C, p.minor ? O : P, 25), '?', 12));
  return svg(F.height, 'Two tangents from P touching a circle at A and B, and a point C on the circle', parts);
}

const cmSgTangentAngle: Generator<TangentAngleParams> = {
  id: 'cm-sg-tangent-angle',
  sample(rng, difficulty) {
    const minor = difficulty >= 2;
    // Past 80 degrees the gap in front of P, on the shorter arc's side, is too narrow to carry the angle's value and C.
    return { x: minor ? 2 * rng.int(16, 40) : 2 * rng.int(20, 60), minor };
  },
  render(p) {
    return typed(
      [
        say(`$PA$ and $PB$ touch a circle at $A$ and $B$, and $\\angle APB = ${p.x}^\\circ$. $C$ is a point on the ${p.minor ? 'shorter' : 'longer'} arc $AB$.`),
        { kind: 'diagram', svg: tangentAngleSvg(p) },
        say('How many degrees is $\\angle ACB$?'),
      ],
      p.minor ? 90 + p.x / 2 : 90 - p.x / 2,
      '\\angle ACB =',
    );
  },
  choices(p) {
    const { x } = p;
    if (p.minor) return angleOptions(90 + x / 2, [90 - x / 2, 180 - x, 180 - x / 2, x]);
    return angleOptions(90 - x / 2, [x / 2, 180 - x, x, 90 + x / 2]);
  },
  solution(p) {
    const { x } = p;
    const steps: SolutionStep[] = [
      { text: 'A tangent is at right angles to the radius to its point of contact, so with $O$ the centre, $OAPB$ has two right angles:' },
      { tex: `\\angle AOB = 360^\\circ - 90^\\circ - 90^\\circ - ${x}^\\circ` },
      { tex: `= ${180 - x}^\\circ` },
      { text: 'An angle at the circle is half the angle at the centre standing on the same arc. From the longer arc:' },
      { tex: `${180 - x}^\\circ \\div 2 = ${90 - x / 2}^\\circ` },
    ];
    if (p.minor) {
      steps.push(
        { text: 'A point on the shorter arc makes a cyclic quadrilateral with $A$, $B$ and a point on the longer arc, so its angle is the other part of $180^\\circ$:' },
        { tex: `\\angle ACB = 180^\\circ - ${90 - x / 2}^\\circ = ${90 + x / 2}^\\circ` },
      );
    } else {
      steps.push({ text: `So $\\angle ACB = ${90 - x / 2}^\\circ$. Halving $${x}^\\circ$ is the trap: the angle at the centre is $180^\\circ - ${x}^\\circ$, not $${x}^\\circ$.` });
    }
    return steps;
  },
};

export const contestSyntheticGeometryGenerators = [
  cmSgBritishFlag,
  cmSgBrokenPole,
  cmSgPoleTiles,
  cmSgUnfold,
  cmSgHeron,
  cmSgHeronTable,
  cmSgInradius,
  cmSgExtendedSides,
  cmSgInscribedSquare,
  cmSgAngleSimilar,
  cmSgAngleSimilarTiles,
  cmSgParallelArea,
  cmSgBisectorSplit,
  cmSgBisectorLength,
  cmSgIncentreRatio,
  cmSgBisectorTiles,
  cmSgChords,
  cmSgSecants,
  cmSgPowerRadius,
  cmSgPowerTable,
  cmSgCyclicAngles,
  cmSgCyclicTable,
  cmSgPtolemy,
  cmSgBrahmagupta,
  cmSgPitot,
  cmSgTangentTable,
  cmSgParallelChords,
  cmSgTangentAngle,
];
