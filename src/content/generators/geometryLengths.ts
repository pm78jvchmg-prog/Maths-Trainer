/**
 * Geometry, level 3: Lengths.
 *
 * Perimeters of triangles, rectangles and L-shapes; the radius, diameter and
 * circumference of a circle; and arcs as a fraction of the circumference (the
 * owner's second inspiration screenshot). Every figure is drawn to its own
 * lengths and labels each one the question needs, in cm. Circle answers are
 * left in terms of $\pi$, typed with the π key, so every answer is exact.
 */
import type { ChoiceOption, Generator, KeypadKey, Slide } from '../types';
import { options } from '../choiceVariant';
import { num, numberBank, numberOptions, say, typed } from './contestMath';
import { type Pt, DASHED, SVG_CLOSE, angle, centroid, choiceSlide, dot, f1, fit, outline, seg, sideLabel, svgOpen, text, ticks, toward } from './geometryKit';

const diagram = (svg: string) => ({ kind: 'diagram' as const, svg });
const cm = (v: number) => `${num(v)} cm`;

export const PI_KEYS: KeypadKey[] = [{ insert: 'pi', label: 'π' }];

/** `k` lots of π as the learner reads it: `12\pi`, `\pi`, `2.5\pi`. */
export const piTex = (k: number) => (k === 1 ? '\\pi' : `${num(k)}\\pi`);
/** The same for mathjs. */
const piAns = (k: number) => `${num(k)}*pi`;
/** `k` lots of π as SVG text. */
const piText = (k: number) => (k === 1 ? 'π' : `${num(k)}π`);

/** Four options that are multiples of π: the answer and three distinct slips. */
function piOptions(k: number, slips: number[]): ChoiceOption[] {
  const seen = new Set([num(k)]);
  const picked: number[] = [];
  for (const v of [...slips, k + 1, k * 2, k + 2, k * 3, k + 3]) {
    if (picked.length === 3) break;
    if (!(v > 0) || seen.has(num(v))) continue;
    seen.add(num(v));
    picked.push(v);
  }
  return options({ tex: piTex(k), answer: piAns(k) }, ...picked.sort((a, b) => a - b).map((v) => ({ tex: piTex(v), answer: piAns(v) })));
}

/* ================================================================
 * Figures
 * ================================================================ */

/** A triangle with sides a (left), b (right) and base c, drawn to scale. */
function trianglePts(a: number, b: number, c: number): Pt[] {
  // Apex from the base's left end: x by the cosine rule, y up.
  const x = (a * a + c * c - b * b) / (2 * c);
  const y = Math.sqrt(Math.max(a * a - x * x, 0));
  return fit([[0, 0], [c, 0], [x, -y]], 210, 140, 45, 22);
}

export function triangleSidesSvg(a: number, b: number, c: number, labels: [string, string, string], tick = false): string {
  const [p, q, r] = trianglePts(a, b, c);
  const inside = centroid([p, q, r]);
  const parts = [svgOpen(190, 'A triangle with its sides labelled'), outline([p, q, r])];
  if (labels[0]) parts.push(sideLabel(p, r, labels[0], inside, 22));
  if (labels[1]) parts.push(sideLabel(q, r, labels[1], inside, 22));
  if (labels[2]) parts.push(sideLabel(p, q, labels[2], inside, 14));
  if (tick) parts.push(ticks(p, r, 1), ticks(q, r, 1));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** A rectangle w by h drawn to scale, with labels on its bottom and left sides. */
export function rectSvg(w: number, h: number, bottom: string, left: string): string {
  const [a, , c] = fit([[0, 0], [w, 0], [w, -h], [0, -h]], 190, 120, 70, 22);
  const pts: Pt[] = [a, [c[0], a[1]], c, [a[0], c[1]]];
  const inside = centroid(pts);
  const parts = [svgOpen(170, 'A rectangle'), outline(pts)];
  if (bottom) parts.push(sideLabel(pts[0], pts[1], bottom, inside, 14));
  // Far enough out to clear the side, however long the label.
  if (left) parts.push(sideLabel(pts[3], pts[0], left, inside, 10 + 3.4 * left.length));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

export interface LShape {
  /** Full width and height. */
  W: number;
  H: number;
  /** The notch cut from the top right: a across, b down. */
  a: number;
  b: number;
}

type LSide = 'W' | 'H' | 't' | 'r' | 'a' | 'b';

const lLength = (s: LShape, side: LSide) =>
  side === 'W' ? s.W : side === 'H' ? s.H : side === 't' ? s.W - s.a : side === 'r' ? s.H - s.b : side === 'a' ? s.a : s.b;

/** An L-shape drawn to scale, each side labelled from `labels` (missing sides bare). */
export function lShapeSvg(s: LShape, labels: Partial<Record<LSide, string>>): string {
  const raw: Pt[] = [[0, 0], [s.W, 0], [s.W, -(s.H - s.b)], [s.W - s.a, -(s.H - s.b)], [s.W - s.a, -s.H], [0, -s.H]];
  const pts = fit(raw, 180, 150, 70, 25);
  const inside = centroid([pts[0], pts[1], pts[5]]);
  const sides: [LSide, Pt, Pt, number][] = [
    ['W', pts[0], pts[1], 14],
    ['r', pts[1], pts[2], 26],
    ['a', pts[2], pts[3], 14],
    ['b', pts[3], pts[4], 26],
    ['t', pts[4], pts[5], 14],
    ['H', pts[5], pts[0], 30],
  ];
  const parts = [svgOpen(200, 'An L-shape'), outline(pts)];
  for (const [side, p, q, gap] of sides) {
    const label = labels[side];
    // The notch's own sides face into the cut-out, so they are labelled from the shape's inside out.
    if (label) parts.push(sideLabel(p, q, label, side === 'a' || side === 'b' ? pts[0] : inside, gap));
  }
  parts.push(SVG_CLOSE);
  return parts.join('');
}

const C0: Pt = [150, 112];
const R0 = 84;

/** A circle with its radius or its diameter drawn and labelled. */
export function circleSvg(show: 'r' | 'd', label: string): string {
  const parts = [svgOpen(215, 'A circle'), `<circle cx="${C0[0]}" cy="${C0[1]}" r="${R0}" fill="none" stroke="currentColor" stroke-width="2" />`, dot(C0)];
  if (show === 'r') {
    const end = toward(C0, 20, R0);
    parts.push(seg(C0, end), text(toward(toward(C0, 20, R0 / 2), 110, 13), label));
  } else {
    const a = toward(C0, 200, R0);
    const b = toward(C0, 20, R0);
    parts.push(seg(a, b), text(toward(C0, 110, 16), label, 13));
  }
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** A semicircle (or quarter circle) of radius `r` with its radius labelled. */
export function partCircleSvg(kind: 'semi' | 'quarter', label: string): string {
  if (kind === 'semi') {
    const c: Pt = [150, 150];
    const R = 110;
    return [
      svgOpen(180, 'A semicircle'),
      `<path d="M ${c[0] - R} ${c[1]} A ${R} ${R} 0 0 1 ${c[0] + R} ${c[1]} Z" fill="none" stroke="currentColor" stroke-width="2" />`,
      dot(c),
      seg(c, [c[0] + R, c[1]], DASHED),
      text([c[0] + R / 2, c[1] + 16], label),
      SVG_CLOSE,
    ].join('');
  }
  const c: Pt = [85, 185];
  const R = 150;
  return [
    svgOpen(210, 'A quarter circle'),
    `<path d="M ${c[0] + R} ${c[1]} A ${R} ${R} 0 0 0 ${c[0]} ${c[1] - R} L ${c[0]} ${c[1]} Z" fill="none" stroke="currentColor" stroke-width="2" />`,
    angle(c, 0, 90, '', { square: true }),
    text([c[0] + R / 2, c[1] + 16], label),
    SVG_CLOSE,
  ].join('');
}

/**
 * A sector of angle `theta` in its faint whole circle, the arc in the accent
 * colour. Labels: the angle at the centre, a radius, and the arc.
 */
export function sectorSvg(theta: number, o: { angle: string; radius?: string; arc?: string; unknownAngle?: boolean }): string {
  const C: Pt = [150, 118];
  const R = 90;
  const start = 90 - theta / 2;
  const a = toward(C, start, R);
  const b = toward(C, start + theta, R);
  const large = theta > 180 ? 1 : 0;
  const parts = [
    svgOpen(235, `A sector of ${theta} degrees`),
    `<circle cx="${C[0]}" cy="${C[1]}" r="${R}" fill="none" stroke="currentColor" stroke-width="1" opacity="0.35"${DASHED} />`,
    `<path class="plot-shade" d="M ${C[0]} ${C[1]} L ${f1(a[0])} ${f1(a[1])} A ${R} ${R} 0 ${large} 0 ${f1(b[0])} ${f1(b[1])} Z" />`,
    seg(C, a),
    seg(C, b),
    `<path class="plot-accent" d="M ${f1(a[0])} ${f1(a[1])} A ${R} ${R} 0 ${large} 0 ${f1(b[0])} ${f1(b[1])}" fill="none" stroke="currentColor" stroke-width="3.5" />`,
    angle(C, start, theta, o.angle, { unknown: o.unknownAngle, r: theta < 60 ? 24 : 18 }),
    dot(C),
  ];
  if (o.radius) {
    // Along the first radius, outside the sector; inside it when the sector
    // leaves too thin a gap outside.
    const mid = toward(C, start, R * 0.6);
    const off = toward(mid, theta > 250 ? start + 90 : start - 90, 13);
    parts.push(text(off, o.radius));
  }
  if (o.arc) {
    const at = toward(C, 90, R + 14);
    parts.push(`<g class="plot-accent">${text(at, o.arc)}</g>`);
  }
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/* ================================================================
 * Lesson 1: Perimeters
 * ================================================================ */

/* ---------- perimeter of a triangle or rectangle ---------- */

interface PerimParams {
  shape: 'tri' | 'iso' | 'rect';
  /** Triangle: left, right, base. Isosceles: leg, leg, base. Rectangle: width, height, 0. */
  s: [number, number, number];
}

/** Every angle of the triangle at least 25 degrees, so it draws as a triangle. */
function wellShaped(a: number, b: number, c: number): boolean {
  if (a + b <= c || a + c <= b || b + c <= a) return false;
  const angleAt = (opp: number, x: number, y: number) => (Math.acos((x * x + y * y - opp * opp) / (2 * x * y)) * 180) / Math.PI;
  return Math.min(angleAt(a, b, c), angleAt(b, a, c), angleAt(c, a, b)) >= 25;
}

const perimOf = ({ shape, s }: PerimParams) => (shape === 'rect' ? 2 * (s[0] + s[1]) : s[0] + s[1] + s[2]);

function perimSvg(p: PerimParams): string {
  const [x, y, z] = p.s;
  if (p.shape === 'rect') return rectSvg(x, y, cm(x), cm(y));
  if (p.shape === 'iso') return triangleSidesSvg(x, y, z, [cm(x), '', cm(z)], true);
  return triangleSidesSvg(x, y, z, [cm(x), cm(y), cm(z)]);
}

const geoPerimPoly: Generator<PerimParams> = {
  id: 'geo-perim-poly',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        if (rng.int(0, 1)) {
          const w = rng.int(4, 15);
          const h = rng.int(2, 11);
          if (w === h) continue;
          return { shape: 'rect', s: [w, h, 0] };
        }
        const leg = rng.int(4, 14);
        const base = rng.int(3, 16);
        if (base === leg || !wellShaped(leg, leg, base)) continue;
        return { shape: 'iso', s: [leg, leg, base] };
      }
      const s: [number, number, number] = [rng.int(3, 14), rng.int(3, 14), rng.int(4, 15)];
      if (new Set(s).size < 3 || !wellShaped(...s)) continue;
      return { shape: 'tri', s };
    }
  },
  render(p) {
    return typed([diagram(perimSvg(p)), say('Find the perimeter, in cm.')], perimOf(p), '\\text{perimeter} =');
  },
  choices(p) {
    const P = perimOf(p);
    const [x, y, z] = p.s;
    return numberOptions(P, p.shape === 'rect' ? [x + y, x * y, 2 * x + y] : p.shape === 'iso' ? [x + z, 2 * z + x, x * 3] : [P - 2, x * y, P + 4], 1, 1);
  },
  solution(p) {
    const [x, y, z] = p.s;
    if (p.shape === 'rect') {
      return [
        { text: 'A rectangle has two lengths and two widths:' },
        { tex: `${x} + ${y} + ${x} + ${y} = ${perimOf(p)}` },
      ];
    }
    if (p.shape === 'iso') {
      return [
        { text: `The marks show the two sloping sides are equal, both $${x}$ cm. Add all three sides:` },
        { tex: `${x} + ${x} + ${z} = ${perimOf(p)}` },
      ];
    }
    return [{ text: 'The perimeter is all the sides added up:' }, { tex: `${x} + ${y} + ${z} = ${perimOf(p)}` }];
  },
};

/* ---------- a missing side from the perimeter ---------- */

interface RectMissingParams {
  shape: 'rect' | 'iso';
  /** Rectangle: [known side, missing side]. Isosceles: [leg, base]. */
  s: [number, number];
  /** Isosceles only: the base is asked (true) or a leg (false). */
  askBase: boolean;
}

const missingPerim = ({ shape, s }: RectMissingParams) => (shape === 'rect' ? 2 * (s[0] + s[1]) : 2 * s[0] + s[1]);
const missingAnswer = ({ shape, s, askBase }: RectMissingParams) => (shape === 'rect' ? s[1] : askBase ? s[1] : s[0]);

const geoRectMissing: Generator<RectMissingParams> = {
  id: 'geo-rect-missing',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const leg = rng.int(4, 15);
        const base = rng.int(3, 16);
        if (base === leg || !wellShaped(leg, leg, base)) continue;
        return { shape: 'iso', s: [leg, base], askBase: rng.int(0, 1) === 1 };
      }
      const known = rng.int(3, 16);
      const missing = rng.int(2, 12);
      if (known === missing) continue;
      return { shape: 'rect', s: [known, missing], askBase: false };
    }
  },
  render(p) {
    const P = missingPerim(p);
    const [x, y] = p.s;
    const svg =
      p.shape === 'rect'
        ? rectSvg(x, y, cm(x), 'x')
        : triangleSidesSvg(x, x, y, p.askBase ? [cm(x), '', 'x'] : ['x', '', cm(y)], true);
    return typed([diagram(svg), say(`The perimeter is $${P}$ cm. Find $x$.`)], missingAnswer(p), 'x =');
  },
  choices(p) {
    const P = missingPerim(p);
    const [x, y] = p.s;
    const ans = missingAnswer(p);
    if (p.shape === 'rect') return numberOptions(ans, [P - x, P / 2, P - 2 * x], 1, 1);
    return numberOptions(ans, p.askBase ? [P - x, (P - x) / 2] : [P - y, P / 2 - y, P / 3], 1, 1);
  },
  solution(p) {
    const P = missingPerim(p);
    const [x, y] = p.s;
    if (p.shape === 'rect') {
      return [
        { text: 'One length and one width make half the perimeter:' },
        { tex: `${x} + x = ${P} \\div 2 = ${P / 2}` },
        { tex: `x = ${P / 2} - ${x} = ${y}` },
      ];
    }
    if (p.askBase) {
      return [
        { text: 'Take the two equal sides away from the perimeter:' },
        { tex: `x = ${P} - ${x} - ${x} = ${y}` },
      ];
    }
    return [
      { text: 'Take the base away, and the two equal sides share what is left:' },
      { tex: `2x = ${P} - ${y} = ${P - y}` },
      { tex: `x = ${P - y} \\div 2 = ${x}` },
    ];
  },
};

/* ---------- L-shapes ---------- */

interface LParams extends LShape {
  /** Which two sides are missing: the notch (a, b) or the bottom and right (W, r). */
  missing: 'notch' | 'outer';
}

const L_GIVEN: Record<LParams['missing'], LSide[]> = { notch: ['W', 'H', 't', 'r'], outer: ['t', 'a', 'H', 'b'] };
const L_ASKED: Record<LParams['missing'], [LSide, LSide]> = { notch: ['a', 'b'], outer: ['W', 'r'] };

function sampleL(rng: { int(a: number, b: number): number }, missing: LParams['missing']): LParams {
  for (;;) {
    const W = rng.int(6, 14);
    const H = rng.int(5, 12);
    const a = rng.int(2, W - 3);
    const b = rng.int(2, H - 2);
    const lengths = (['W', 'H', 't', 'r', 'a', 'b'] as LSide[]).map((side) => lLength({ W, H, a, b }, side));
    // The two asked lengths differ, so a table of them has no repeated tile.
    const [p, q] = L_ASKED[missing].map((side) => lLength({ W, H, a, b }, side));
    if (p === q || lengths.some((v) => v < 2)) continue;
    return { W, H, a, b, missing };
  }
}

const lPerim = (s: LShape) => 2 * (s.W + s.H);

function lLabels(p: LParams, asked: [string, string]): Partial<Record<LSide, string>> {
  const out: Partial<Record<LSide, string>> = {};
  for (const side of L_GIVEN[p.missing]) out[side] = cm(lLength(p, side));
  const [s1, s2] = L_ASKED[p.missing];
  if (asked[0]) out[s1] = asked[0];
  if (asked[1]) out[s2] = asked[1];
  return out;
}

function lMissingSteps(p: LParams, names: [string, string]) {
  if (p.missing === 'notch') {
    return [
      { text: `The top and ${names[0]} together are as wide as the bottom:` },
      { tex: `${names[0]} = ${p.W} - ${p.W - p.a} = ${p.a}` },
      { text: `The right side and ${names[1]} together are as tall as the left:` },
      { tex: `${names[1]} = ${p.H} - ${p.H - p.b} = ${p.b}` },
    ];
  }
  return [
    { text: `The bottom, ${names[0]}, is as wide as the top and the step together:` },
    { tex: `${names[0]} = ${p.W - p.a} + ${p.a} = ${p.W}` },
    { text: `The right side, ${names[1]}, is the left side's height less the step:` },
    { tex: `${names[1]} = ${p.H} - ${p.b} = ${p.H - p.b}` },
  ];
}

const allSides = (p: LShape) => (['W', 'r', 'a', 'b', 't', 'H'] as LSide[]).map((side) => lLength(p, side));

const geoLShapeSides: Generator<LParams> = {
  id: 'geo-lshape-sides',
  sample(rng, difficulty) {
    return sampleL(rng, difficulty >= 2 ? 'outer' : 'notch');
  },
  render(p): Slide {
    const [s1, s2] = L_ASKED[p.missing].map((side) => lLength(p, side));
    const P = lPerim(p);
    return {
      kind: 'table',
      prompt: [diagram(lShapeSvg(p, lLabels(p, ['a', 'b']))), say('All corners are right angles. Fill in the missing sides and the perimeter, in cm.')],
      columns: ['\\text{Side}', '\\text{Length}'],
      rows: [
        ['a', null],
        ['b', null],
        ['\\text{Perimeter}', null],
      ],
      bank: numberBank([s1, s2, P], [p.W + p.H, P - 2, s1 + s2, p.W * p.H - p.a * p.b], 3, 1, 1),
      answer: [s1, s2, P].map(num),
    };
  },
  solution(p) {
    return [...lMissingSteps(p, ['a', 'b']), { text: 'Then add all six sides:' }, { tex: `${allSides(p).join(' + ')} = ${lPerim(p)}` }];
  },
};

const geoPerimLShape: Generator<LParams> = {
  id: 'geo-perim-lshape',
  sample(rng, difficulty) {
    return sampleL(rng, difficulty >= 2 ? 'outer' : 'notch');
  },
  render(p) {
    return typed([diagram(lShapeSvg(p, lLabels(p, ['', '']))), say('All corners are right angles. Find the perimeter, in cm.')], lPerim(p), '\\text{perimeter} =');
  },
  choices(p) {
    const P = lPerim(p);
    const given = L_GIVEN[p.missing].map((side) => lLength(p, side));
    return numberOptions(P, [given.reduce((x, y) => x + y, 0), P - 2 * p.a, P + 2 * p.b, P - 4], 1, 1);
  },
  solution(p) {
    return [...lMissingSteps(p, ['the step across', 'the step down']), { text: 'Then add all six sides:' }, { tex: `${allSides(p).join(' + ')} = ${lPerim(p)}` }];
  },
};

/* ================================================================
 * Lesson 2: Circumference
 * ================================================================ */

interface CircleParams {
  r: number;
  /** Which length the figure gives. */
  given: 'r' | 'd';
}

const geoCircRd: Generator<CircleParams> = {
  id: 'geo-circ-rd',
  sample(rng, difficulty) {
    const r = difficulty >= 2 ? rng.int(1, 15) + 0.5 : rng.int(2, 20);
    return { r, given: rng.pick(['r', 'd'] as const) };
  },
  render({ r, given }) {
    const value = given === 'r' ? r : 2 * r;
    return typed(
      [diagram(circleSvg(given, cm(value))), say(`Find the ${given === 'r' ? 'diameter' : 'radius'}, in cm.`)],
      given === 'r' ? 2 * r : r,
      given === 'r' ? 'd =' : 'r =',
    );
  },
  choices({ r, given }) {
    return given === 'r' ? numberOptions(2 * r, [r / 2, r * 4, r + 2], 1, 0.5) : numberOptions(r, [4 * r, 2 * r * 2, r / 2, r - 1], 1, 0.5);
  },
  solution({ r, given }) {
    if (given === 'r') return [{ text: 'The diameter goes right across, through the centre: two radii.' }, { tex: `d = 2 \\times ${num(r)} = ${num(2 * r)}` }];
    return [{ text: 'The radius goes from the centre to the edge: half the diameter.' }, { tex: `r = ${num(2 * r)} \\div 2 = ${num(r)}` }];
  },
};

const geoCircumference: Generator<CircleParams> = {
  id: 'geo-circumference',
  sample(rng, difficulty) {
    const r = difficulty >= 2 ? rng.int(1, 15) + 0.5 : rng.int(2, 20);
    return { r, given: rng.pick(['r', 'd'] as const) };
  },
  render({ r, given }): Slide {
    const value = given === 'r' ? r : 2 * r;
    return {
      kind: 'expression',
      prompt: [diagram(circleSvg(given, cm(value))), say('Find the circumference in cm. Leave $\\pi$ in the answer.')],
      lead: 'C =',
      keypad: PI_KEYS,
      answer: piAns(2 * r),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices({ r }) {
    return piOptions(2 * r, [r, r * r, 4 * r]);
  },
  solution({ r, given }) {
    if (given === 'd') return [{ text: 'With the diameter, use $C = \\pi d$:' }, { tex: `C = \\pi \\times ${num(2 * r)} = ${piTex(2 * r)}` }];
    return [{ text: 'With the radius, use $C = 2\\pi r$:' }, { tex: `C = 2 \\times \\pi \\times ${num(r)} = ${piTex(2 * r)}` }];
  },
};

interface CircBackParams {
  r: number;
  ask: 'r' | 'd';
}

const geoCircBack: Generator<CircBackParams> = {
  id: 'geo-circ-back',
  sample(rng, difficulty) {
    const r = difficulty >= 2 ? rng.int(1, 15) + 0.5 : rng.int(2, 20);
    return { r, ask: rng.pick(['r', 'd'] as const) };
  },
  render({ r, ask }) {
    return typed(
      [say(`A circle has a circumference of $${piTex(2 * r)}$ cm. Find its ${ask === 'r' ? 'radius' : 'diameter'}, in cm.`)],
      ask === 'r' ? r : 2 * r,
      ask === 'r' ? 'r =' : 'd =',
    );
  },
  choices({ r, ask }) {
    return ask === 'r' ? numberOptions(r, [2 * r, r / 2, 4 * r], 1, 0.5) : numberOptions(2 * r, [r, 4 * r, r / 2], 1, 0.5);
  },
  solution({ r, ask }) {
    const steps = [{ text: 'The circumference is $\\pi d$, so the number in front of $\\pi$ is the diameter:' }, { tex: `\\pi d = ${piTex(2 * r)} \\qquad d = ${num(2 * r)}` }];
    if (ask === 'd') return steps;
    return [...steps, { text: 'The radius is half of it:' }, { tex: `r = ${num(2 * r)} \\div 2 = ${num(r)}` }];
  },
};

/* ---------- semicircles and quarter circles ---------- */

interface PartParams {
  kind: 'semi' | 'quarter';
  r: number;
}

/** The curved part's multiple of π and the straight part. */
const partPieces = ({ kind, r }: PartParams): [number, number] => (kind === 'semi' ? [r, 2 * r] : [r / 2, 2 * r]);

const geoSemiPerim: Generator<PartParams> = {
  id: 'geo-semi-perim',
  sample(rng, difficulty) {
    return difficulty >= 2 ? { kind: 'quarter', r: 2 * rng.int(1, 30) } : { kind: 'semi', r: rng.int(2, 30) };
  },
  render(p): Slide {
    const [k, straight] = partPieces(p);
    const slips = [2 * p.r, p.r, 4 * p.r, k * 2, p.r / 4, straight + p.r].filter((v) => Number.isInteger(v));
    return {
      kind: 'tiles',
      prompt: [diagram(partCircleSvg(p.kind, cm(p.r))), say(`Find the perimeter of this ${p.kind === 'semi' ? 'semicircle' : 'quarter circle'}, in cm.`)],
      template: 'P = {0}\\pi + {1}',
      bank: numberBank([k, straight], slips, 3, 1, 1),
      answer: [num(k), num(straight)],
    };
  },
  solution(p) {
    const [k, straight] = partPieces(p);
    if (p.kind === 'semi') {
      return [
        { text: 'The curved edge is half the circumference:' },
        { tex: `\\tfrac{1}{2} \\times 2\\pi \\times ${p.r} = ${piTex(k)}` },
        { text: 'The straight edge is the diameter:' },
        { tex: `2 \\times ${p.r} = ${straight}` },
        { tex: `P = ${piTex(k)} + ${straight}` },
      ];
    }
    return [
      { text: 'The curved edge is a quarter of the circumference:' },
      { tex: `\\tfrac{1}{4} \\times 2\\pi \\times ${p.r} = ${piTex(k)}` },
      { text: 'The two straight edges are both radii:' },
      { tex: `${p.r} + ${p.r} = ${straight}` },
      { tex: `P = ${piTex(k)} + ${straight}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Arc Length
 * ================================================================ */

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/** A fraction in lowest terms as TeX. */
function fracTex(top: number, bottom: number): string {
  const g = gcd(top, bottom);
  const [p, q] = [top / g, bottom / g];
  return q === 1 ? String(p) : `\\frac{${p}}{${q}}`;
}

/** Angles that are a whole-degree fraction of a turn with one of these denominators. */
function anglesOver(denominators: number[]): number[] {
  const out = new Set<number>();
  for (const q of denominators) for (let p = 1; p < q; p += 1) if (gcd(p, q) === 1) out.add((360 * p) / q);
  return [...out].sort((a, b) => a - b);
}

const FRACTION_ANGLES = anglesOver([2, 3, 4, 5, 6, 8, 9, 10, 12]);
const FRACTION_ANGLES_2 = anglesOver([5, 8, 9, 10, 12, 15, 18, 20, 24]).filter((t) => 360 % t !== 0);

interface FractionParams {
  theta: number;
}

const geoArcFraction: Generator<FractionParams> = {
  id: 'geo-arc-fraction',
  sample(rng, difficulty) {
    return { theta: rng.pick(difficulty >= 2 ? FRACTION_ANGLES_2 : FRACTION_ANGLES) };
  },
  render({ theta }) {
    const right = theta / 360;
    const slips: [number, number][] = [
      [theta, 180],
      [360 - theta, 360],
      [theta, 100],
      [theta + 30, 360],
      [theta - 30, 360],
      [theta + 45, 360],
    ];
    const seen = new Set([right]);
    const wrong: string[] = [];
    for (const [p, q] of slips) {
      if (wrong.length === 3 || p <= 0) continue;
      const v = p / q;
      if ([...seen].some((s) => Math.abs(s - v) < 1e-9)) continue;
      seen.add(v);
      wrong.push(fracTex(p, q));
    }
    const opts: ChoiceOption[] = [{ tex: fracTex(theta, 360), correct: true }, ...wrong.map((tex) => ({ tex }))];
    return choiceSlide([diagram(sectorSvg(theta, { angle: `${theta}°` })), say('What fraction of the whole circle is the shaded sector?')], opts);
  },
  solution({ theta }) {
    return [
      { text: 'A whole turn is $360^\\circ$, so the sector is this fraction of the circle:' },
      { tex: `\\frac{${theta}}{360} = ${fracTex(theta, 360)}` },
    ];
  },
};

interface ArcParams {
  theta: number;
  r: number;
}

const ARC_ANGLES = [30, 45, 60, 90, 120, 135, 150, 180, 210, 240, 270, 300];
const ARC_ANGLES_2 = [20, 36, 40, 72, 80, 100, 108, 140, 144, 160, 200, 216, 225, 252, 288, 315, 320];

/** The arc's multiple of π: θ/360 of 2πr. */
const arcK = ({ theta, r }: ArcParams) => (theta * r) / 180;

function sampleArc(rng: { int(a: number, b: number): number; pick<T>(xs: readonly T[]): T }, difficulty: number): ArcParams {
  for (;;) {
    const theta = rng.pick(difficulty >= 2 ? ARC_ANGLES_2 : ARC_ANGLES);
    const r = rng.int(2, 20);
    const k = arcK({ theta, r });
    // A whole number of π, or a half at the harder level.
    if (difficulty >= 2 ? (2 * k) % 1 !== 0 : k % 1 !== 0) continue;
    if (k === 2 * r) continue;
    return { theta, r };
  }
}

function arcWorking({ theta, r }: ArcParams) {
  return [
    { text: 'The whole circumference is $2\\pi r$:' },
    { tex: `2 \\times \\pi \\times ${r} = ${piTex(2 * r)}` },
    { text: `The arc is $\\frac{${theta}}{360}$ of it:` },
    { tex: `\\frac{${theta}}{360} \\times ${piTex(2 * r)} = ${piTex(arcK({ theta, r }))}` },
  ];
}

const geoArcLength: Generator<ArcParams> = {
  id: 'geo-arc-length',
  sample: sampleArc,
  render(p): Slide {
    return {
      kind: 'expression',
      prompt: [diagram(sectorSvg(p.theta, { angle: `${p.theta}°`, radius: cm(p.r), arc: 'x' })), say('Find the arc length $x$ in cm. Leave $\\pi$ in the answer.')],
      lead: 'x =',
      keypad: PI_KEYS,
      answer: piAns(arcK(p)),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices(p) {
    const k = arcK(p);
    return piOptions(k, [k / 2, 2 * k, 2 * p.r, (p.theta * p.r * p.r) / 360]);
  },
  solution: arcWorking,
};

const geoArcAngle: Generator<ArcParams> = {
  id: 'geo-arc-angle',
  sample: sampleArc,
  render(p) {
    return typed(
      [diagram(sectorSvg(p.theta, { angle: 'x', unknownAngle: true, radius: cm(p.r), arc: `${piText(arcK(p))} cm` })), say('Find the angle $x$.')],
      p.theta,
      'x =',
    );
  },
  choices(p) {
    return numberOptions(p.theta, [360 - p.theta, p.theta / 2, 2 * p.theta, 180 - p.theta], 5, 1);
  },
  solution(p) {
    const k = arcK(p);
    return [
      { text: 'The whole circumference is' },
      { tex: `2 \\times \\pi \\times ${p.r} = ${piTex(2 * p.r)}` },
      { text: 'The arc is this fraction of it:' },
      { tex: `${piTex(k)} \\div ${piTex(2 * p.r)} = ${fracTex(p.theta, 360)}` },
      { text: 'The angle is the same fraction of $360^\\circ$:' },
      { tex: `x = ${fracTex(p.theta, 360)} \\times 360 = ${p.theta}` },
    ];
  },
};

const geoSectorPerim: Generator<ArcParams> = {
  id: 'geo-sector-perim',
  sample: sampleArc,
  render(p): Slide {
    const k = arcK(p);
    const slips = [2 * k, p.r, k + p.r, 4 * p.r, 2 * p.r + 2].filter((v) => Number.isInteger(2 * v));
    return {
      kind: 'tiles',
      prompt: [diagram(sectorSvg(p.theta, { angle: `${p.theta}°`, radius: cm(p.r) })), say('Find the perimeter of the sector, in cm.')],
      template: 'P = {0}\\pi + {1}',
      bank: numberBank([k, 2 * p.r], slips, 3, 1, 1),
      answer: [num(k), num(2 * p.r)],
    };
  },
  solution(p) {
    return [...arcWorking(p), { text: 'Add the two straight edges, both radii:' }, { tex: `P = ${piTex(arcK(p))} + ${p.r} + ${p.r} = ${piTex(arcK(p))} + ${2 * p.r}` }];
  },
};

export const geometryLengthsGenerators = [
  geoPerimPoly,
  geoRectMissing,
  geoLShapeSides,
  geoPerimLShape,
  geoCircRd,
  geoCircumference,
  geoCircBack,
  geoSemiPerim,
  geoArcFraction,
  geoArcLength,
  geoArcAngle,
  geoSectorPerim,
];
