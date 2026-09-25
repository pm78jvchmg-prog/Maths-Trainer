/**
 * Geometry, level 4: Scaling.
 *
 * Similar shapes: the same angles, and every length multiplied by one scale
 * factor. Finding the scale factor, a missing side, an angle that does not
 * change, a perimeter that scales like a length, and map scales. Every figure
 * draws both shapes to scale side by side, with each length and angle the
 * question needs labelled on it.
 */
import type { ChoiceOption, Generator, Slide } from '../types';
import { num, numberBank, numberOptions, say, typed } from './contestMath';
import { type Pt, SVG_CLOSE, centroid, choiceSlide, cornerAngle, labelHalf, outline, sideLabelAt, svgOpen, text, triangleFromAngles } from './geometryKit';
import { rectSvg } from './geometryLengths';

const diagram = (svg: string) => ({ kind: 'diagram' as const, svg });
const cm = (v: number) => `${num(v)} cm`;

/* ================================================================
 * Figures
 * ================================================================ */

/** A triangle with base 1 from the origin, apex above, from its three sides (left, right, base). */
export function unitFromSides(a: number, b: number, c: number): Pt[] {
  const x = (a * a + c * c - b * b) / (2 * c);
  const y = Math.sqrt(Math.max(a * a - x * x, 0));
  return [[0, 0], [1, 0], [x / c, -y / c]];
}

export interface TriLabels {
  /** Left side, right side, base. Empty leaves a side bare. */
  sides?: [string, string, string];
  /** Bottom-left, bottom-right and top corners. */
  angles?: [string, string, string];
  /** A side or corner drawn in the accent colour. */
  unknownAngle?: number;
}

/** Where each side label of a triangle goes, and the label. */
function sideLabels(pts: Pt[], l: TriLabels): [Pt, string][] {
  const [p, q, r] = pts;
  const inside = centroid(pts);
  const out: [Pt, string][] = [];
  if (l.sides) {
    const [left, right, base] = l.sides;
    if (left) out.push([sideLabelAt(p, r, left, inside, 22), left]);
    if (right) out.push([sideLabelAt(q, r, right, inside, 22), right]);
    if (base) out.push([sideLabelAt(p, q, base, inside, 13), base]);
  }
  return out;
}

/** The left and right edges of a triangle with its side labels. */
function xExtent(pts: Pt[], l: TriLabels): [number, number] {
  const xs = pts.map((p) => p[0]);
  let lo = Math.min(...xs);
  let hi = Math.max(...xs);
  for (const [at, value] of sideLabels(pts, l)) {
    const hw = labelHalf(value)[0];
    lo = Math.min(lo, at[0] - hw);
    hi = Math.max(hi, at[0] + hw);
  }
  return [lo, hi];
}

function labelTriangle(pts: Pt[], l: TriLabels): string[] {
  const [p, q, r] = pts;
  const out = [outline(pts)];
  for (const [at, value] of sideLabels(pts, l)) out.push(text(at, value));
  if (l.angles) {
    const corners: [Pt, Pt, Pt][] = [
      [r, p, q],
      [p, q, r],
      [q, r, p],
    ];
    l.angles.forEach((label, i) => {
      if (label) out.push(cornerAngle(...corners[i], label, { unknown: l.unknownAngle === i, r: 16 }));
    });
  }
  return out;
}

/**
 * A triangle and its copy scaled by `k`, side by side on one baseline and to
 * one scale, so a copy twice the size looks twice the size.
 */
export function similarSvg(unit: Pt[], k: number, first: TriLabels, second: TriLabels): string {
  const h = -Math.min(...unit.map((p) => p[1]));
  const minX = Math.min(...unit.map((p) => p[0]));
  const w = Math.max(...unit.map((p) => p[0])) - minX;
  // The side labels are laid out with the shapes, not after them: a label
  // outside the first triangle's left side ran off the edge of the figure,
  // and one in the gap between the triangles ran into the second.
  const top = 20;
  let s = Math.min(250 / (w * (1 + k)), 170 / (h * Math.max(1, k)), 150);
  for (;;) {
    const base = top + h * s * Math.max(1, k);
    const one = unit.map(([x, y]): Pt => [(x - minX) * s, base + y * s]);
    const [lo1, hi1] = xExtent(one, first);
    const probe = unit.map(([x, y]): Pt => [(x - minX) * s * k, base + y * s * k]);
    const [lo2, hi2] = xExtent(probe, second);
    // Clear space between the first figure's right edge and the second's left, labels included.
    const shift = Math.max(s * w + 30, hi1 + 16 - lo2);
    const width = shift + hi2 - lo1;
    if (width > 292 && s > 10) {
      s *= 0.94;
      continue;
    }
    const dx = (300 - width) / 2 - lo1;
    const place = (pts: Pt[], x: number) => pts.map(([px, py]): Pt => [px + x, py]);
    return [
      svgOpen(base + 28, 'Two similar triangles'),
      ...labelTriangle(place(one, dx), first),
      ...labelTriangle(place(probe, dx + shift), second),
      SVG_CLOSE,
    ].join('');
  }
}

/** A shape for side questions: whole sides that make a well-shaped triangle. */
function sideTriple(rng: { int(a: number, b: number): number }, lo: number, hi: number): [number, number, number] {
  for (;;) {
    const t: [number, number, number] = [rng.int(lo, hi), rng.int(lo, hi), rng.int(lo, hi)];
    const [a, b, c] = t;
    if (new Set(t).size < 3 || a + b <= c || a + c <= b || b + c <= a) continue;
    const cos = [(b * b + c * c - a * a) / (2 * b * c), (a * a + c * c - b * b) / (2 * a * c), (a * a + b * b - c * c) / (2 * a * b)];
    // Every angle between 30 and 120 degrees.
    if (cos.some((v) => v > Math.cos(Math.PI / 6) || v < -0.5)) continue;
    // The base is the longest side, so the triangle stands on it.
    if (c < a || c < b) continue;
    return t;
  }
}

/* ================================================================
 * Lesson 1: Scaling Shapes
 * ================================================================ */

/* ---------- the scale factor ---------- */

interface FactorParams {
  /** Left, right, base of the first triangle. */
  t: [number, number, number];
  k: number;
}

const INT_K = [2, 3];
const HALF_K = [1.5, 2.5, 0.5];

/** Sides that stay whole (or a half at worst) after scaling. */
function sampleFactor(rng: Parameters<Generator<unknown>['sample']>[0], difficulty: number): FactorParams {
  for (;;) {
    const k = rng.pick(difficulty >= 2 ? HALF_K : INT_K);
    const t = sideTriple(rng, 2, difficulty >= 2 ? 16 : 9);
    // Halves only on a side that is even, so every scaled length is whole.
    if (!Number.isInteger(k) && t.some((v) => v % 2 !== 0)) continue;
    return { t, k };
  }
}

const geoScaleFactor: Generator<FactorParams> = {
  id: 'geo-scale-factor',
  sample: sampleFactor,
  render({ t, k }) {
    const [a, b, c] = t;
    const svg = similarSvg(unitFromSides(a, b, c), k, { sides: [cm(a), '', cm(c)] }, { sides: [cm(a * k), '', cm(c * k)] });
    return typed([diagram(svg), say('The triangles are similar. Find the scale factor from the left one to the right one.')], k, 'k =');
  },
  choices({ t, k }) {
    const [, , c] = t;
    return numberOptions(k, [c * k - c, 1 / k, k + 1, k * 2].filter((v) => Number.isInteger(4 * v)), 0.5, 0.25);
  },
  solution({ t, k }) {
    const [a, , c] = t;
    return [
      { text: 'Divide a length on the right-hand triangle by the matching length on the left:' },
      { tex: `k = ${num(c * k)} \\div ${c} = ${num(k)}` },
      { text: 'The other pair agrees:' },
      { tex: `${num(a * k)} \\div ${a} = ${num(k)}` },
    ];
  },
};

/* ---------- which rectangle is similar ---------- */

interface WhichParams {
  w: number;
  h: number;
  k: number;
  /** Amount added to both sides in the "same increase" distractor. */
  add: number;
}

const geoSimilarWhich: Generator<WhichParams> = {
  id: 'geo-similar-which',
  sample(rng, difficulty) {
    for (;;) {
      const k = rng.pick(difficulty >= 2 ? HALF_K : INT_K);
      const w = rng.int(2, 12);
      const h = rng.int(2, 12);
      if (w === h || (!Number.isInteger(k) && (w % 2 || h % 2))) continue;
      const add = rng.int(1, 6);
      return { w, h, k, add };
    }
  },
  render({ w, h, k, add }) {
    const dims = (x: number, y: number) => `${num(x)} cm by ${num(y)} cm`;
    const wrong: [number, number][] = [
      [w + add, h + add],
      [w * k, h * k + (k < 1 ? 1 : add)],
      [w * k + 1, h * k],
      [w * k, h],
      [w + add + 1, h + add],
      [w * k + 2, h * k + 1],
      [w * k - 1, h * k + 2],
    ];
    const ratio = w / h;
    // "15 cm by 32 cm" reads as its area too, so no two options share one.
    const areas = new Set([num(w * k * h * k)]);
    const picked: [number, number][] = [];
    for (const [x, y] of wrong) {
      if (picked.length === 3) break;
      if (x <= 0 || y <= 0 || Math.abs(x / y - ratio) < 1e-9 || areas.has(num(x * y))) continue;
      areas.add(num(x * y));
      picked.push([x, y]);
    }
    const opts: ChoiceOption[] = [{ tex: dims(w * k, h * k), correct: true }, ...picked.map(([x, y]) => ({ tex: dims(x, y) }))];
    return choiceSlide([diagram(rectSvg(w, h, cm(w), cm(h))), say('Which rectangle is similar to this one?')], opts, false);
  },
  solution({ w, h, k, add }) {
    return [
      { text: 'A similar rectangle multiplies both sides by the same scale factor:' },
      { tex: `${w} \\times ${num(k)} = ${num(w * k)} \\qquad ${h} \\times ${num(k)} = ${num(h * k)}` },
      { text: `Adding $${add}\\text{ cm}$ to both sides does not keep the shape: the long side grows by a smaller share than the short one.` },
    ];
  },
};

/* ---------- a table of scaled sides ---------- */

const geoScaleTable: Generator<FactorParams> = {
  id: 'geo-scale-table',
  sample: sampleFactor,
  render({ t, k }): Slide {
    const scaled = t.map((v) => v * k);
    const letters = ['a', 'b', 'c'];
    return {
      kind: 'table',
      prompt: [
        diagram(similarSvg(unitFromSides(...t), k, { sides: t.map((v, i) => `${letters[i]} = ${v}`) as [string, string, string] }, {})),
        say(`The triangle is scaled by $${num(k)}$. Fill in the new lengths, in cm.`),
      ],
      columns: ['\\text{Side}', '\\text{Old}', '\\text{New}'],
      rows: t.map((v, i) => [letters[i], String(v), null]),
      bank: numberBank(scaled, [...t.map((v) => v + k), ...t.map((v) => v * (k + 1))], 3, 0.5, 0.5),
      answer: scaled.map(num),
    };
  },
  solution({ t, k }) {
    return [{ text: `Multiply every length by $${num(k)}$:` }, ...t.map((v, i) => ({ tex: `${'abc'[i]}: \\quad ${v} \\times ${num(k)} = ${num(v * k)}` }))];
  },
};

/* ---------- angles do not scale ---------- */

interface AngleParams {
  A: number;
  B: number;
  k: number;
  /** Which corner of the second triangle is asked: one that is labelled on the first (0, 1), or the third (2). */
  ask: number;
}

const geoSimilarAngle: Generator<AngleParams> = {
  id: 'geo-similar-angle',
  sample(rng, difficulty) {
    for (;;) {
      const A = rng.int(7, 16) * 5;
      const B = rng.int(7, 16) * 5;
      const C = 180 - A - B;
      if (C < 30 || C > 110 || A === B) continue;
      // Scale factors near 1 keep the first triangle big enough to hold two angle labels.
      return { A, B, k: rng.pick([1.5, 2]), ask: difficulty >= 2 ? 2 : rng.int(0, 1) };
    }
  },
  render({ A, B, k, ask }) {
    const unit = triangleFromAngles(A, B);
    // The two known angles go on the larger triangle and x on the smaller.
    // The other way round, a tall triangle drawn at 1/k of the width left its
    // two labelled corners too close together for "65°" and "75°" to fit.
    const known: [string, string, string] = [`${A}°`, `${B}°`, ''];
    const asked: [string, string, string] = ['', '', ''];
    asked[ask] = 'x';
    const svg = similarSvg(unit, k, { angles: asked, unknownAngle: ask }, { angles: known });
    return typed([diagram(svg), say('The triangles are similar. Find $x$.')], [A, B, 180 - A - B][ask], 'x =');
  },
  choices({ A, B, k, ask }) {
    const x = [A, B, 180 - A - B][ask];
    return numberOptions(x, [x * k, 180 - x, ask === 2 ? A + B : 180 - A - B, x + 10], 5, 1);
  },
  solution({ A, B, ask }) {
    if (ask === 2) {
      return [
        { text: 'Similar triangles have the same angles. The third angle of the larger triangle is' },
        { tex: `180 - ${A} - ${B} = ${180 - A - B}` },
        { text: 'and the matching corner of the smaller one has the same angle.' },
      ];
    }
    return [{ text: `Scaling changes lengths, never angles, so $x$ equals the matching angle: $${[A, B][ask]}^\\circ$.` }];
  },
};

/* ================================================================
 * Lesson 2: Scaling Lengths
 * ================================================================ */

interface SideParams extends FactorParams {
  /** Which side of the pair is unknown: on the scaled triangle (true) or the first (false). */
  onScaled: boolean;
}

function sampleSide(rng: Parameters<Generator<unknown>['sample']>[0], difficulty: number): SideParams {
  // At the easier level multiply; at the harder, divide half the time.
  return { ...sampleFactor(rng, difficulty), onScaled: difficulty >= 2 ? rng.int(0, 1) === 1 : true };
}

function sideFigure({ t, k, onScaled }: SideParams): string {
  const [a, , c] = t;
  const first: [string, string, string] = [onScaled ? cm(a) : 'x', '', cm(c)];
  const second: [string, string, string] = [onScaled ? 'x' : cm(a * k), '', cm(c * k)];
  return similarSvg(unitFromSides(...t), k, { sides: first }, { sides: second });
}

const sideAnswer = ({ t, k, onScaled }: SideParams) => (onScaled ? t[0] * k : t[0]);

function sideSolution({ t, k, onScaled }: SideParams) {
  const [a, , c] = t;
  const steps = [{ text: 'The bases give the scale factor:' }, { tex: `k = ${num(c * k)} \\div ${c} = ${num(k)}` }];
  if (onScaled) return [...steps, { text: 'Multiply the matching side by it:' }, { tex: `x = ${a} \\times ${num(k)} = ${num(a * k)}` }];
  return [...steps, { text: 'Going back to the first triangle, divide by it:' }, { tex: `x = ${num(a * k)} \\div ${num(k)} = ${a}` }];
}

const geoSimilarSide: Generator<SideParams> = {
  id: 'geo-similar-side',
  sample: sampleSide,
  render(p) {
    return typed([diagram(sideFigure(p)), say('The triangles are similar. Find $x$, in cm.')], sideAnswer(p), 'x =');
  },
  choices(p) {
    const [a, , c] = p.t;
    const x = sideAnswer(p);
    return numberOptions(x, [a + (c * p.k - c), p.onScaled ? a / p.k : a * p.k * p.k, x + p.k, x * 2], 1, 0.5);
  },
  solution: sideSolution,
};

const geoSimilarTiles: Generator<SideParams> = {
  id: 'geo-similar-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const p = sampleSide(rng, difficulty);
      if (p.k === sideAnswer(p)) continue;
      return p;
    }
  },
  render(p): Slide {
    const x = sideAnswer(p);
    const [a, , c] = p.t;
    return {
      kind: 'tiles',
      prompt: [diagram(sideFigure(p)), say('The triangles are similar. Find the scale factor, then $x$ in cm.')],
      template: 'k = {0} \\qquad x = {1}',
      // Slips that end in a quarter at worst, never 0.333333.
      bank: numberBank([p.k, x], [c * p.k - c, a + c * p.k - c, 1 / p.k, x * p.k, p.k + 1].filter((v) => Number.isInteger(4 * v)), 3, 0.5, 0.25),
      answer: [num(p.k), num(x)],
    };
  },
  solution: sideSolution,
};

/* ---------- perimeters scale like lengths ---------- */

interface PerimScaleParams {
  P: number;
  k: number;
  back: boolean;
}

const geoScalePerim: Generator<PerimScaleParams> = {
  id: 'geo-scale-perim',
  sample(rng, difficulty) {
    for (;;) {
      const k = rng.pick(difficulty >= 2 ? [2, 3, 4, 5, 1.5, 2.5] : [2, 3, 4, 5, 10]);
      const P = rng.int(6, 40);
      if (!Number.isInteger(P * k)) continue;
      return { P, k, back: difficulty >= 2 && rng.int(0, 1) === 1 };
    }
  },
  render({ P, k, back }) {
    if (back) {
      return typed([say(`A shape is enlarged by a scale factor of $${num(k)}$. The new shape has a perimeter of $${num(P * k)}\\text{ cm}$. What was the perimeter of the original, in cm?`)], P, 'P =');
    }
    return typed([say(`A shape with a perimeter of $${P}\\text{ cm}$ is enlarged by a scale factor of $${num(k)}$. Find the new perimeter, in cm.`)], P * k, 'P =');
  },
  choices({ P, k, back }) {
    return back ? numberOptions(P, [P * k * k, P * k - k, P * k / 2], 1, 1) : numberOptions(P * k, [P + k, P * k * k, P * 2], 1, 1);
  },
  solution({ P, k, back }) {
    if (back) return [{ text: 'Every length, and so the perimeter, was multiplied by the scale factor. Divide to go back:' }, { tex: `${num(P * k)} \\div ${num(k)} = ${P}` }];
    return [{ text: 'Every side is multiplied by the scale factor, so the perimeter is too:' }, { tex: `${P} \\times ${num(k)} = ${num(P * k)}` }];
  },
};

/* ---------- map scales ---------- */

interface MapParams {
  /** Kilometres for each centimetre on the map. */
  per: number;
  cm: number;
  back: boolean;
}

const geoMapScale: Generator<MapParams> = {
  id: 'geo-map-scale',
  sample(rng, difficulty) {
    return { per: rng.pick([2, 3, 4, 5, 10, 20, 25, 50]), cm: rng.int(2, 15), back: difficulty >= 2 };
  },
  render({ per, cm: d, back }) {
    if (back) {
      return typed([say(`On a map, $1\\text{ cm}$ stands for $${per}\\text{ km}$. Two towns are $${per * d}\\text{ km}$ apart. How far apart are they on the map, in cm?`)], d, '\\text{map} =');
    }
    return typed([say(`On a map, $1\\text{ cm}$ stands for $${per}\\text{ km}$. Two towns are $${d}\\text{ cm}$ apart on the map. How far apart are they really, in km?`)], per * d, '\\text{distance} =');
  },
  choices({ per, cm: d, back }) {
    return back ? numberOptions(d, [per * d * per, per + d, d * 10], 1, 1) : numberOptions(per * d, [per + d, per * d * 10, per * (d + 1)], per, 1);
  },
  solution({ per, cm: d, back }) {
    if (back) return [{ text: `Each $${per}\\text{ km}$ is $1\\text{ cm}$ on the map, so divide:` }, { tex: `${per * d} \\div ${per} = ${d}` }];
    return [{ text: `Each centimetre is $${per}\\text{ km}$, so multiply:` }, { tex: `${d} \\times ${per} = ${per * d}` }];
  },
};

export const geometryScalingGenerators = [
  geoScaleFactor,
  geoSimilarWhich,
  geoScaleTable,
  geoSimilarAngle,
  geoSimilarSide,
  geoSimilarTiles,
  geoScalePerim,
  geoMapScale,
];
