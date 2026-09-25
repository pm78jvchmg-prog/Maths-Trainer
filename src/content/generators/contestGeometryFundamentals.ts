/**
 * Contest Math, level 4: Geometry Fundamentals.
 *
 * Five lessons: measures, angle hunting, angles in polygons, the special
 * right triangles, and making a right triangle where there is none. Level 1
 * already asked for a regular polygon's sides, angles in a ratio, clock hands
 * and the tilted square, so these go further: a parallel line drawn through a
 * bend, a chain of isosceles triangles, the turning that sums a star's tips,
 * the angle a side subtends from any corner, the diagonal products of a
 * divided rectangle, and a perpendicular dropped to turn an awkward triangle
 * into two right ones.
 *
 * Lengths that are not whole are exact surds, typed with the `√(` key
 * (`5√(3)`), and graded by value like any typed answer.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { gcd, num, numberBank, numberOptions, say, typed } from './contestMath';
import { options } from '../choiceVariant';

/** The keypad for an exact length: digits and a square root. */
const SURD_KEYS: KeypadKey[] = [{ insert: 'sqrt(', label: '√(' }];

/* ================================================================
 * Figures
 * ================================================================ */

type Pt = [number, number];

const f1 = (v: number) => v.toFixed(1);
const plus = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const times = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const minus = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
function unit(from: Pt, to: Pt): Pt {
  const [dx, dy] = minus(to, from);
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

const svgOpen = (height: number, label: string) =>
  `<svg viewBox="0 0 300 ${Math.round(height)}" width="100%" role="img" aria-label="${label}">`;

const seg = (a: Pt, b: Pt, extra = '') =>
  `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="currentColor" stroke-width="2"${extra} />`;

const DASHED = ' stroke-dasharray="5 4"';

function outline(pts: Pt[], extra = ''): string {
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${f1(x)} ${f1(y)}`).join(' ') + ' Z';
  return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2"${extra} />`;
}

function shade(pts: Pt[]): string {
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${f1(x)} ${f1(y)}`).join(' ') + ' Z';
  return `<path class="plot-shade" d="${d}" />`;
}

const text = (p: Pt, value: string, anchor = 'middle', size = 13) =>
  `<text x="${f1(p[0])}" y="${f1(p[1])}" font-size="${size}" fill="currentColor" text-anchor="${anchor}" dominant-baseline="middle">${value}</text>`;

/** An arc at `v` between the rays towards `a` and `b`, with its label out along the bisector. */
function angleMark(v: Pt, a: Pt, b: Pt, label: string, r = 16, R = 32): string {
  const u1 = unit(v, a);
  const u2 = unit(v, b);
  const s = plus(v, times(u1, r));
  const e = plus(v, times(u2, r));
  const cross = u1[0] * u2[1] - u1[1] * u2[0];
  const mid = unit([0, 0], plus(u1, u2));
  return [
    `<path d="M ${f1(s[0])} ${f1(s[1])} A ${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${f1(e[0])} ${f1(e[1])}" fill="none" stroke="currentColor" stroke-width="1.5" />`,
    text(plus(v, times(mid, R)), label, 'middle', 12),
  ].join('');
}

/** The small square marking a right angle at `v`. */
function rightMark(v: Pt, a: Pt, b: Pt, size = 11): string {
  const p = plus(v, times(unit(v, a), size));
  const q = plus(v, times(unit(v, b), size));
  const c = plus(p, times(unit(v, b), size));
  return `<path d="M ${f1(p[0])} ${f1(p[1])} L ${f1(c[0])} ${f1(c[1])} L ${f1(q[0])} ${f1(q[1])}" fill="none" stroke="currentColor" stroke-width="1.5" />`;
}

/** `count` tick marks across the middle of a side, for equal lengths. */
function ticks(a: Pt, b: Pt, count: number): string {
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

/** A label beside the middle of side ab, on the side away from `inside`. */
function sideLabel(a: Pt, b: Pt, value: string, inside: Pt, gap = 14): string {
  const mid = times(plus(a, b), 0.5);
  const along = unit(a, b);
  let across: Pt = [-along[1], along[0]];
  const toInside = minus(inside, mid);
  if (across[0] * toInside[0] + across[1] * toInside[1] > 0) across = times(across, -1);
  return text(plus(mid, times(across, gap)), value);
}

/** Points scaled and centred into a box `w` by `h` with its corner at (x0, y0); y is flipped. */
function fit(points: Pt[], w: number, h: number, x0: number, y0: number): Pt[] {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const k = Math.min(w / (maxX - minX || 1), h / (maxY - minY || 1));
  const offX = x0 + (w - (maxX - minX) * k) / 2;
  const offY = y0 + (h - (maxY - minY) * k) / 2;
  return points.map(([x, y]) => [offX + (x - minX) * k, offY + (maxY - y) * k]);
}

const centroid = (pts: Pt[]): Pt => times(pts.reduce((s, p) => plus(s, p), [0, 0] as Pt), 1 / pts.length);

/* ================================================================
 * Surds
 * ================================================================ */

/** c√r with c and r whole; r = 1 is a plain whole number. */
type Surd = [number, number];

function surdTex([c, r]: Surd): string {
  if (r === 1) return num(c);
  return c === 1 ? `\\sqrt{${r}}` : `${num(c)}\\sqrt{${r}}`;
}

function surdAnswer([c, r]: Surd): string {
  if (r === 1) return num(c);
  return c === 1 ? `sqrt(${r})` : `${num(c)}*sqrt(${r})`;
}

/** As plain text for a figure: `5√3`. */
function surdText([c, r]: Surd): string {
  if (r === 1) return num(c);
  return c === 1 ? `√${r}` : `${num(c)}√${r}`;
}

const surdValue = ([c, r]: Surd) => c * Math.sqrt(r);

/**
 * Four options: the answer and the first three slips worth something
 * different, topped up with the next and previous multiples of the same root.
 */
function surdOptions(correct: Surd, slips: Surd[]): ChoiceOption[] {
  const seen = [surdValue(correct)];
  const picked: Surd[] = [];
  const [c, r] = correct;
  const pool: Surd[] = [...slips, [c + 1, r], [c - 1, r], [c + 2, r], [c - 2, r], [c + 3, r]];
  for (const s of pool) {
    if (picked.length === 3) break;
    if (s[0] <= 0 || !Number.isInteger(s[0])) continue;
    const v = surdValue(s);
    if (seen.some((w) => Math.abs(w - v) < 1e-9)) continue;
    seen.push(v);
    picked.push(s);
  }
  picked.sort((x, y) => surdValue(x) - surdValue(y));
  return options(
    { tex: surdTex(correct), answer: surdAnswer(correct) },
    ...picked.map((s) => ({ tex: surdTex(s), answer: surdAnswer(s) })),
  );
}

/** A tiles bank of surds: the answers, then spare slips, sorted by value. */
function surdBank(answer: Surd[], slips: Surd[], spare = 3): string[] {
  const out = [...answer];
  const seen = answer.map(surdValue);
  let extras = 0;
  for (const s of slips) {
    if (extras === spare) break;
    if (s[0] <= 0) continue;
    const v = surdValue(s);
    if (seen.some((w) => Math.abs(w - v) < 1e-9)) continue;
    seen.push(v);
    out.push(s);
    extras += 1;
  }
  return out.sort((x, y) => surdValue(x) - surdValue(y)).map(surdTex);
}

/* ================================================================
 * Pythagorean triples
 * ================================================================ */

/** Primitive triples, shorter leg first. A table, not Math.hypot: the table is the check. */
const PRIMITIVE: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [12, 35, 37],
  [9, 40, 41],
];

/** Every multiple of a primitive triple with hypotenuse at most `max`. */
function scaledTriples(max: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const [a, b, c] of PRIMITIVE) {
    for (let k = 1; k * c <= max; k += 1) out.push([k * a, k * b, k * c]);
  }
  return out;
}

/* ================================================================
 * Lesson 1: Measures
 * ================================================================ */

/* ---------- tiling a floor: count along each side ---------- */

interface FloorParams {
  /** Floor sides in centimetres. */
  a: number;
  b: number;
  /** Tile side in centimetres. */
  s: number;
}

const metres = (cm: number) => num(cm / 100);

const cmFloorTiles: Generator<FloorParams> = {
  id: 'cm-floor-tiles',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      for (;;) {
        const s = rng.pick([15, 30, 40, 60]);
        const a = s * rng.int(5, 20);
        const b = s * rng.int(5, 20);
        if (a > 900 || b > 700 || a === b) continue;
        if (a % 100 === 0 && b % 100 === 0) continue;
        return { a, b, s };
      }
    }
    for (;;) {
      const a = 100 * rng.int(2, 9);
      const b = 100 * rng.int(2, 7);
      if (a !== b) return { a, b, s: rng.pick([10, 20, 25, 50]) };
    }
  },
  render({ a, b, s }) {
    return typed(
      [
        say(`A floor $${metres(a)}$ m by $${metres(b)}$ m is covered with square tiles of side $${s}$ cm, with no gaps and no overlaps.`),
        say('How many tiles are used?'),
      ],
      (a / s) * (b / s),
      '\\text{tiles} =',
    );
  },
  choices({ a, b, s }) {
    const k1 = a / s;
    const k2 = b / s;
    const count = k1 * k2;
    return numberOptions(count, [(a * b) / (100 * s * s), (a * b) / (100 * s), 2 * (k1 + k2), count + Math.min(k1, k2)], Math.min(k1, k2), 5);
  },
  solution({ a, b, s }) {
    return [
      { text: `Work in centimetres: the floor is ${a} cm by ${b} cm. Count the tiles along each side:` },
      { tex: `${a} \\div ${s} = ${a / s}` },
      { tex: `${b} \\div ${s} = ${b / s}` },
      { text: 'The tiles make a grid, so multiply:' },
      { tex: `${a / s} \\times ${b / s} = ${(a / s) * (b / s)}` },
      { text: 'Converting the area instead is where it goes wrong: a square metre is $100 \\times 100 = 10\\,000$ square centimetres, not $100$.' },
    ];
  },
};

/* ---------- a rectangle cut into four ---------- */

interface FourParams {
  w: [number, number];
  h: [number, number];
  /** The region not shown: 0 top left, 1 top right, 2 bottom left, 3 bottom right. */
  missing: number;
  /** Difficulty 2 asks for the whole rectangle. */
  whole: boolean;
}

const fourAreas = ({ w, h }: FourParams) => [w[0] * h[0], w[1] * h[0], w[0] * h[1], w[1] * h[1]];

/** The two regions on the other diagonal from the missing one, and the one opposite it. */
function fourPartners(missing: number): { pair: [number, number]; opposite: number } {
  const opposite = 3 - missing;
  const pair = [0, 1, 2, 3].filter((i) => i !== missing && i !== opposite) as [number, number];
  return { pair, opposite };
}

function fourSvg(p: FourParams): string {
  const areas = fourAreas(p);
  const W = 240;
  const H = 150;
  const dw = W * (0.3 + (0.4 * p.w[0]) / (p.w[0] + p.w[1]));
  const dh = H * (0.3 + (0.4 * p.h[0]) / (p.h[0] + p.h[1]));
  const x0 = 30;
  const y0 = 12;
  const centres: Pt[] = [
    [x0 + dw / 2, y0 + dh / 2],
    [x0 + dw + (W - dw) / 2, y0 + dh / 2],
    [x0 + dw / 2, y0 + dh + (H - dh) / 2],
    [x0 + dw + (W - dw) / 2, y0 + dh + (H - dh) / 2],
  ];
  const corners: Pt[][] = [
    [[x0, y0], [x0 + dw, y0], [x0 + dw, y0 + dh], [x0, y0 + dh]],
    [[x0 + dw, y0], [x0 + W, y0], [x0 + W, y0 + dh], [x0 + dw, y0 + dh]],
    [[x0, y0 + dh], [x0 + dw, y0 + dh], [x0 + dw, y0 + H], [x0, y0 + H]],
    [[x0 + dw, y0 + dh], [x0 + W, y0 + dh], [x0 + W, y0 + H], [x0 + dw, y0 + H]],
  ];
  return [
    svgOpen(H + 24, 'A rectangle cut into four smaller rectangles, three of their areas marked'),
    shade(corners[p.missing]),
    outline([[x0, y0], [x0 + W, y0], [x0 + W, y0 + H], [x0, y0 + H]]),
    seg([x0 + dw, y0], [x0 + dw, y0 + H]),
    seg([x0, y0 + dh], [x0 + W, y0 + dh]),
    ...centres.map((c, i) => text(c, i === p.missing ? '?' : `${areas[i]}`, 'middle', 15)),
    '</svg>',
  ].join('');
}

const fourAnswer = (p: FourParams) => {
  const areas = fourAreas(p);
  return p.whole ? areas.reduce((t, v) => t + v, 0) : areas[p.missing];
};

const cmFourRectangles: Generator<FourParams> = {
  id: 'cm-four-rectangles',
  sample(rng, difficulty) {
    const hi = difficulty >= 2 ? 12 : 9;
    for (;;) {
      const p: FourParams = {
        w: [rng.int(2, hi), rng.int(2, hi)],
        h: [rng.int(2, hi), rng.int(2, hi)],
        missing: rng.int(0, 3),
        whole: difficulty >= 2,
      };
      if (new Set(fourAreas(p)).size < 4) continue;
      return p;
    }
  },
  render(p) {
    return typed(
      [
        say('A rectangle is cut into four smaller rectangles by one straight cut across and one straight cut down. Three of their areas are marked, in cm².'),
        { kind: 'diagram', svg: fourSvg(p) },
        say(p.whole ? 'What is the area of the whole rectangle?' : 'What is the area of the shaded rectangle?'),
      ],
      fourAnswer(p),
      '\\text{area} =',
    );
  },
  choices(p) {
    const areas = fourAreas(p);
    const { pair, opposite } = fourPartners(p.missing);
    const additive = areas[pair[0]] + areas[pair[1]] - areas[opposite];
    const given = areas.reduce((t, v) => t + v, 0) - areas[p.missing];
    if (p.whole) {
      return numberOptions(fourAnswer(p), [given + additive, given, given + areas[opposite], given + Math.max(...areas)], 1, 1);
    }
    return numberOptions(
      areas[p.missing],
      [additive, (areas[pair[0]] * areas[opposite]) / areas[pair[1]], (areas[pair[1]] * areas[opposite]) / areas[pair[0]], areas[opposite]],
      1,
      1,
    );
  },
  solution(p) {
    const areas = fourAreas(p);
    const { pair, opposite } = fourPartners(p.missing);
    const product = areas[pair[0]] * areas[pair[1]];
    const steps: SolutionStep[] = [
      { text: 'Rectangles side by side share a height, so their areas are in the ratio of their widths. Both rows are cut at the same place, so the two rows are in the same ratio.' },
      { text: 'That makes the products across the two diagonals equal. Call the missing area $x$:' },
      { tex: `x \\times ${areas[opposite]} = ${areas[pair[0]]} \\times ${areas[pair[1]]}` },
      { tex: `x = ${product} \\div ${areas[opposite]} = ${areas[p.missing]}` },
    ];
    if (p.whole) {
      steps.push({ text: 'Add the four pieces:' }, { tex: `${areas.join(' + ')} = ${fourAnswer(p)}` });
    }
    return steps;
  },
};

/* ---------- a square cut into strips ---------- */

interface StripParams {
  k: number;
  /** Each strip is m wide, so the square's side is k m. */
  m: number;
  ask: 'perimeter' | 'area';
}

const stripSide = ({ k, m }: { k: number; m: number }) => k * m;
const stripPerimeter = ({ k, m }: { k: number; m: number }) => 2 * m * (k + 1);

function stripSvg(k: number): string {
  const size = 150;
  const x0 = 75;
  const y0 = 10;
  const w = size / k;
  const parts = [svgOpen(size + 20, `A square cut into ${k} equal strips`), shade([[x0, y0], [x0 + w, y0], [x0 + w, y0 + size], [x0, y0 + size]])];
  parts.push(outline([[x0, y0], [x0 + size, y0], [x0 + size, y0 + size], [x0, y0 + size]]));
  for (let i = 1; i < k; i += 1) parts.push(seg([x0 + i * w, y0], [x0 + i * w, y0 + size]));
  parts.push('</svg>');
  return parts.join('');
}

const cmStripSquare: Generator<StripParams> = {
  id: 'cm-strip-square',
  sample(rng, difficulty) {
    return {
      k: rng.int(2, difficulty >= 2 ? 8 : 6),
      m: rng.int(1, difficulty >= 2 ? 6 : 10),
      ask: difficulty >= 2 ? 'area' : 'perimeter',
    };
  },
  render(p) {
    const s = stripSide(p);
    return typed(
      [
        say(`A square is cut into ${p.k} identical strips, as shown. Each strip has a perimeter of ${stripPerimeter(p)} cm.`),
        { kind: 'diagram', svg: stripSvg(p.k) },
        say(p.ask === 'area' ? 'What is the area of the square, in cm²?' : 'What is the perimeter of the square, in cm?'),
      ],
      p.ask === 'area' ? s * s : 4 * s,
      p.ask === 'area' ? '\\text{area} =' : '\\text{perimeter} =',
    );
  },
  choices(p) {
    const s = stripSide(p);
    const P = stripPerimeter(p);
    if (p.ask === 'area') {
      const guessSide = P / 4;
      return numberOptions(s * s, [guessSide * guessSide, (P / 2) ** 2, s * p.m, (s + p.m) ** 2], 1, 1);
    }
    return numberOptions(4 * s, [P, p.k * P, 2 * P, 4 * (s + p.m)], 4, 4);
  },
  solution(p) {
    const s = stripSide(p);
    const P = stripPerimeter(p);
    const steps: SolutionStep[] = [
      { text: `Call the square’s side $s$. Each strip is $s$ long and $s \\div ${p.k}$ wide, and half its perimeter is one of each:` },
      { tex: `s + \\frac{s}{${p.k}} = ${P / 2}` },
      { tex: `\\frac{${p.k + 1}s}{${p.k}} = ${P / 2}` },
      { tex: `s = ${P / 2} \\times ${p.k} \\div ${p.k + 1} = ${s}` },
    ];
    if (p.ask === 'area') steps.push({ tex: `\\text{area} = ${s}^2 = ${s * s}` });
    else steps.push({ tex: `\\text{perimeter} = 4 \\times ${s} = ${4 * s}` });
    return steps;
  },
};

interface StripTilesParams {
  k: number;
  m: number;
}

const cmStripSquareTiles: Generator<StripTilesParams> = {
  id: 'cm-strip-square-tiles',
  sample(rng, difficulty) {
    return difficulty >= 2 ? { k: rng.int(3, 8), m: rng.int(2, 6) } : { k: rng.int(2, 5), m: rng.int(2, 9) };
  },
  render(p) {
    const s = stripSide(p);
    const half = s + p.m;
    const P = stripPerimeter(p);
    const slips = [P / 4, p.m, 4 * s, half * half, s * p.m, half + p.m].filter((v) => Number.isInteger(v));
    return {
      kind: 'tiles',
      prompt: [
        say(`A square is cut into ${p.k} identical strips. Each strip has a perimeter of ${P} cm.`),
        { kind: 'diagram', svg: stripSvg(p.k) },
        say('Fill in the working for the area of the square.'),
      ],
      template: '\\text{half perimeter} = {0}, \\quad \\text{side} = {1}, \\quad \\text{area} = {2}',
      bank: numberBank([half, s, s * s], slips, 3),
      answer: [num(half), num(s), num(s * s)],
    };
  },
  solution(p) {
    const s = stripSide(p);
    const P = stripPerimeter(p);
    return [
      { text: `Half a strip’s perimeter is one long side and one short side, $s$ and $s \\div ${p.k}$:` },
      { tex: `${P} \\div 2 = ${P / 2}` },
      { text: `That is $${p.k + 1}$ widths of a strip, and the side is $${p.k}$ of them:` },
      { tex: `${P / 2} \\div ${p.k + 1} \\times ${p.k} = ${s}` },
      { tex: `\\text{area} = ${s}^2 = ${s * s}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Angle Hunting
 * ================================================================ */

/* ---------- a bend between two parallel lines ---------- */

interface BendParams {
  /** Difficulty 1: angles at the top and bottom lines. Difficulty 2: α, β, γ of a double bend. */
  a: number;
  b: number;
  c: number;
  double: boolean;
}

const bendAnswer = (p: BendParams) => (p.double ? p.b + p.c : p.a + p.b);

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Parallel-line chevrons at x on the line y. */
const chevron = (x: number, y: number) => `<path d="M ${x - 4} ${y - 5} L ${x + 3} ${y} L ${x - 4} ${y + 5}" fill="none" stroke="currentColor" stroke-width="1.5" />`;

function bendSvg(p: BendParams): string {
  const top = 30;
  const bottom = 180;
  const parts = [
    svgOpen(200, 'Two parallel lines with a bent path between them'),
    seg([10, top], [290, top]),
    seg([10, bottom], [290, bottom]),
    chevron(270, top),
    chevron(270, bottom),
  ];
  if (!p.double) {
    const d = (bottom - top) / (Math.tan(rad(p.a)) + Math.tan(rad(p.b)));
    const P: Pt = [150 + d / 2, top + d * Math.tan(rad(p.a))];
    const A: Pt = [P[0] - d, top];
    const B: Pt = [P[0] - d, bottom];
    parts.push(
      seg(A, P),
      seg(P, B),
      angleMark(A, [A[0] + 40, top], P, `${p.a}°`, 18, 38),
      angleMark(B, [B[0] + 40, bottom], P, `${p.b}°`, 18, 38),
      angleMark(P, A, B, 'x', 16, 30),
    );
  } else {
    const tans = [p.a, p.b, p.c].map((v) => Math.tan(rad(v)));
    const d = (bottom - top) / (tans[0] + tans[1] + tans[2]);
    const A: Pt = [150 - d / 2, top];
    const P: Pt = [A[0] + d, top + d * tans[0]];
    const Q: Pt = [A[0], P[1] + d * tans[1]];
    const B: Pt = [A[0] + d, bottom];
    parts.push(
      seg(A, P),
      seg(P, Q),
      seg(Q, B),
      angleMark(A, [A[0] + 40, top], P, `${p.a}°`, 18, 38),
      angleMark(P, A, Q, `${p.a + p.b}°`, 16, 36),
      angleMark(Q, P, B, 'x', 16, 30),
      angleMark(B, [B[0] - 40, bottom], Q, `${p.c}°`, 18, 38),
    );
  }
  parts.push('</svg>');
  return parts.join('');
}

const cmParallelBend: Generator<BendParams> = {
  id: 'cm-parallel-bend',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { a: rng.int(25, 65), b: rng.int(25, 65), c: rng.int(25, 65), double: true };
    return { a: rng.int(20, 70), b: rng.int(20, 70), c: 0, double: false };
  },
  render(p) {
    return typed(
      [
        say(p.double ? 'The two horizontal lines are parallel, and a path zigzags between them.' : 'The two horizontal lines are parallel.'),
        { kind: 'diagram', svg: bendSvg(p) },
        say('How many degrees is the angle marked $x$?'),
      ],
      bendAnswer(p),
      'x =',
    );
  },
  choices(p) {
    if (p.double) {
      const P = p.a + p.b;
      return numberOptions(bendAnswer(p), [P + p.a - p.c, p.a + p.c, 180 - bendAnswer(p), P + p.c], 5, 5);
    }
    return numberOptions(p.a + p.b, [180 - p.a - p.b, Math.abs(p.a - p.b), 360 - p.a - p.b, 180 - Math.abs(p.a - p.b)], 5, 5);
  },
  solution(p) {
    if (p.double) {
      return [
        { text: 'Draw a line through each bend, parallel to the other two.' },
        { text: `At the first bend, the $${p.a + p.b}^\\circ$ splits into a part alternate to the $${p.a}^\\circ$ at the top line (a Z shape) and the rest:` },
        { tex: `${p.a + p.b} - ${p.a} = ${p.b}` },
        { text: `At the second bend, $x$ splits into that same $${p.b}^\\circ$ (alternate again) and a part alternate to the $${p.c}^\\circ$ at the bottom line:` },
        { tex: `x = ${p.b} + ${p.c} = ${p.b + p.c}` },
      ];
    }
    return [
      { text: 'Draw a third line through the bend, parallel to the other two. It splits $x$ into two parts.' },
      { text: 'The upper part and the top angle are alternate angles (a Z shape), and so are the lower part and the bottom angle:' },
      { tex: `x = ${p.a} + ${p.b} = ${p.a + p.b}` },
    ];
  },
};

/* ---------- a chain of isosceles triangles ---------- */

type ChainAsk = 'DBC' | 'BDC' | 'ABD' | 'ADB';

interface ChainParams {
  /** The apex angle at A. */
  a: number;
  ask: ChainAsk;
}

const chainBase = (a: number) => (180 - a) / 2;

function chainValue(a: number, ask: ChainAsk): number {
  const base = chainBase(a);
  if (ask === 'DBC') return a;
  if (ask === 'BDC') return base;
  if (ask === 'ABD') return base - a;
  return 180 - base;
}

function chainPoints(a: number): { A: Pt; B: Pt; C: Pt; D: Pt } {
  const height = 150;
  const half = height * Math.tan(rad(a / 2));
  const A: Pt = [150, 18];
  const B: Pt = [150 - half, 18 + height];
  const C: Pt = [150 + half, 18 + height];
  // BD = BC makes DC = 2 BC cos C.
  const bc = 2 * half;
  const ac = Math.hypot(half, height);
  const dc = 2 * bc * Math.cos(rad(chainBase(a)));
  const D = plus(C, times(minus(A, C), dc / ac));
  return { A, B, C, D };
}

function chainSvg(a: number, ask?: ChainAsk): string {
  const { A, B, C, D } = chainPoints(a);
  const mid = centroid([A, B, C]);
  const off = (p: Pt, d = 12) => plus(p, times(unit(mid, p), d));
  const parts = [
    svgOpen(190, 'Triangle ABC with AB equal to AC, and a point D on AC with BD equal to BC'),
    outline([A, B, C]),
    seg(B, D),
    ticks(A, B, 1),
    ticks(A, C, 1),
    ticks(B, D, 2),
    ticks(B, C, 2),
    angleMark(A, B, C, `${a}°`, 20, 44),
    text(off(A), 'A'),
    text(off(B), 'B'),
    text(off(C), 'C'),
    text(plus(D, times(unit(B, D), 12)), 'D'),
  ];
  if (ask === 'DBC') parts.push(angleMark(B, D, C, '?', 22, 40));
  if (ask === 'BDC') parts.push(angleMark(D, B, C, '?', 14, 28));
  if (ask === 'ABD') parts.push(angleMark(B, A, D, '?', 26, 46));
  if (ask === 'ADB') parts.push(angleMark(D, A, B, '?', 14, 28));
  parts.push('</svg>');
  return parts.join('');
}

const chainSetup = (a: number) =>
  `In triangle $ABC$, $AB = AC$ and $\\angle BAC = ${a}^\\circ$. The point $D$ lies on $AC$ with $BD = BC$.`;

const cmIsoscelesChain: Generator<ChainParams> = {
  id: 'cm-isosceles-chain',
  sample(rng, difficulty) {
    const a = 2 * rng.int(10, 29);
    return { a, ask: difficulty >= 2 ? rng.pick(['ABD', 'ADB'] as const) : rng.pick(['DBC', 'BDC'] as const) };
  },
  render({ a, ask }) {
    return typed(
      [say(chainSetup(a)), { kind: 'diagram', svg: chainSvg(a, ask) }, say(`How many degrees is $\\angle ${ask}$?`)],
      chainValue(a, ask),
      '\\text{angle} =',
    );
  },
  choices({ a, ask }) {
    const base = chainBase(a);
    return numberOptions(chainValue(a, ask), [base, a, base - a, 180 - base, 180 - 2 * a, 2 * a], 2, 2);
  },
  solution({ a, ask }) {
    const base = chainBase(a);
    const steps: SolutionStep[] = [
      { text: '$AB = AC$, so the base angles of $ABC$ are equal:' },
      { tex: `\\angle ABC = \\angle ACB = (180 - ${a}) \\div 2 = ${base}` },
      { text: '$BD = BC$, so triangle $DBC$ is isosceles too, with its equal angles at $D$ and $C$:' },
      { tex: `\\angle BDC = \\angle BCD = ${base}` },
    ];
    if (ask === 'BDC') return steps;
    if (ask === 'ADB') {
      steps.push({ text: '$A$, $D$ and $C$ are on a straight line:' }, { tex: `\\angle ADB = 180 - ${base} = ${180 - base}` });
      return steps;
    }
    steps.push({ text: 'The third angle of $DBC$:' }, { tex: `\\angle DBC = 180 - 2 \\times ${base} = ${a}` });
    if (ask === 'DBC') steps.push({ text: 'the same as the angle at $A$.' });
    else steps.push({ text: '$\\angle ABD$ is what is left of $\\angle ABC$:' }, { tex: `\\angle ABD = ${base} - ${a} = ${base - a}` });
    return steps;
  },
};

interface ChainTilesParams {
  a: number;
  /** The last blank: what is left of the angle at B, or the angle on the line at D. */
  last: 'ABD' | 'ADB';
}

const cmIsoscelesChainTiles: Generator<ChainTilesParams> = {
  id: 'cm-isosceles-chain-tiles',
  sample(rng) {
    for (;;) {
      const a = 2 * rng.int(10, 29);
      const last = rng.pick(['ABD', 'ADB'] as const);
      // At 36° the angle at A and ∠ABD are equal, and a bank cannot hold one tile twice.
      if (a === 36 && last === 'ABD') continue;
      return { a, last };
    }
  },
  render({ a, last }) {
    const base = chainBase(a);
    const third = chainValue(a, last);
    return {
      kind: 'tiles',
      prompt: [say(chainSetup(a)), { kind: 'diagram', svg: chainSvg(a) }, say('Fill in the angles.')],
      template: `\\angle ABC = {0}^\\circ, \\quad \\angle DBC = {1}^\\circ, \\quad \\angle ${last} = {2}^\\circ`,
      bank: numberBank([base, a, third], [180 - base, base - a, 180 - 2 * a, 2 * a, base + a, 90 - a], 3, 2, 1),
      answer: [num(base), num(a), num(third)],
    };
  },
  solution({ a, last }) {
    const base = chainBase(a);
    const steps: SolutionStep[] = [
      { text: '$AB = AC$, so the base angles are equal:' },
      { tex: `\\angle ABC = (180 - ${a}) \\div 2 = ${base}` },
      { text: `$BD = BC$, so $\\angle BDC = \\angle BCD = ${base}^\\circ$, and the third angle of $DBC$ is` },
      { tex: `\\angle DBC = 180 - 2 \\times ${base} = ${a}` },
    ];
    if (last === 'ABD') steps.push({ tex: `\\angle ABD = ${base} - ${a} = ${base - a}` });
    else steps.push({ text: '$A$, $D$ and $C$ are on a straight line:' }, { tex: `\\angle ADB = 180 - ${base} = ${180 - base}` });
    return steps;
  },
};

/* ---------- an isosceles triangle: which angle is the given one? ---------- */

interface CasesParams {
  t: number;
  ask: 'largest' | 'smallest';
  /** Which of two wordings. */
  wording: number;
}

const CASES_WORDINGS = [
  (t: number, ask: string) => `An isosceles triangle has an angle of $${t}^\\circ$. How many degrees is the ${ask} angle the triangle could possibly have?`,
  (t: number, ask: string) =>
    `One angle of an isosceles triangle is $${t}^\\circ$. How ${ask === 'largest' ? 'big' : 'small'} could its ${ask} angle possibly be, in degrees?`,
];

const cmIsoscelesCases: Generator<CasesParams> = {
  id: 'cm-isosceles-cases',
  sample(rng, difficulty) {
    const wording = rng.int(0, CASES_WORDINGS.length - 1);
    if (difficulty >= 2) return { t: rng.int(61, 89), ask: 'smallest', wording };
    return { t: rng.int(5, 58), ask: 'largest', wording };
  },
  render({ t, ask, wording }) {
    return typed(
      [say(CASES_WORDINGS[wording](t, ask))],
      180 - 2 * t,
      '\\text{angle} =',
    );
  },
  choices({ t }) {
    return numberOptions(180 - 2 * t, [(180 - t) / 2, t, 180 - t, 2 * t], 2, 1);
  },
  solution({ t, ask }) {
    const apexCase = (180 - t) / 2;
    return [
      { text: `The $${t}^\\circ$ angle could be the one between the equal sides, or one of the equal pair. Try both.` },
      { text: 'Between the equal sides: the other two share what is left.' },
      { tex: `(180 - ${t}) \\div 2 = ${num(apexCase)}` },
      { text: 'One of the equal pair: there are two of them.' },
      { tex: `180 - 2 \\times ${t} = ${180 - 2 * t}` },
      {
        text: `The triangles are $${t}^\\circ, ${num(apexCase)}^\\circ, ${num(apexCase)}^\\circ$ and $${t}^\\circ, ${t}^\\circ, ${180 - 2 * t}^\\circ$, so the ${ask} angle possible is $${180 - 2 * t}^\\circ$.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 3: Polygon Angle Hunting
 * ================================================================ */

/* ---------- the tips of a star ---------- */

interface StarParams {
  /** Difficulty 1: five tip angles of an irregular five-pointed star, `unknown` hidden. */
  tips: number[];
  unknown: number;
  /** Difficulty 2: a regular star joining every k-th of n points. */
  n: number;
  k: number;
}

/** Regular stars whose tip angle is whole: n points, each joined to the one k along. */
const REGULAR_STARS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let n = 5; n <= 45; n += 1) {
    for (let k = 2; 2 * k < n; k += 1) {
      if (gcd(n, k) === 1 && (360 * k) % n === 0) out.push([n, k]);
    }
  }
  return out;
})();

const starTip = (n: number, k: number) => 180 - (360 * k) / n;

function pentagramSvg(p: StarParams): string {
  const centre: Pt = [150, 108];
  const R = 95;
  const pts: Pt[] = [0, 1, 2, 3, 4].map((i) => [centre[0] + R * Math.cos(rad(-90 + 72 * i)), centre[1] + R * Math.sin(rad(-90 + 72 * i))]);
  const order = [0, 2, 4, 1, 3];
  const parts = [svgOpen(205, 'A five-pointed star with its tip angles marked'), outline(order.map((i) => pts[i]))];
  pts.forEach((tip, i) => {
    const at = plus(tip, times(unit(tip, centre), 40));
    parts.push(text(at, i === p.unknown ? 'x' : `${p.tips[i]}°`, 'middle', 12));
  });
  parts.push('</svg>');
  return parts.join('');
}

function regularStarSvg(n: number, k: number): string {
  const centre: Pt = [150, 100];
  const R = 90;
  const pts: Pt[] = Array.from({ length: n }, (_, i) => [centre[0] + R * Math.cos(rad(-90 + (360 * i) / n)), centre[1] + R * Math.sin(rad(-90 + (360 * i) / n))]);
  const order = Array.from({ length: n }, (_, i) => pts[(i * k) % n]);
  const parts = [svgOpen(200, `A regular star joining every point to the one ${k} along, of ${n} points`), outline(order)];
  for (const p of pts) parts.push(`<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="2.5" fill="currentColor" />`);
  parts.push('</svg>');
  return parts.join('');
}

const starAnswer = (p: StarParams) => (p.n === 5 && p.tips.length === 5 ? p.tips[p.unknown] : starTip(p.n, p.k));

const cmStarTips: Generator<StarParams> = {
  id: 'cm-star-tips',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const [n, k] = rng.pick(REGULAR_STARS);
      return { tips: [], unknown: -1, n, k };
    }
    for (;;) {
      const given = [0, 1, 2, 3].map(() => rng.int(15, 45));
      const rest = 180 - given.reduce((t, v) => t + v, 0);
      if (rest < 15 || rest > 60) continue;
      const unknown = rng.int(0, 4);
      const tips = [...given.slice(0, unknown), rest, ...given.slice(unknown)];
      return { tips, unknown, n: 5, k: 2 };
    }
  },
  render(p) {
    if (p.tips.length === 0) {
      const prompt = [
        say(`${p.n} points are spaced evenly round a circle. A regular star is drawn by joining each point to the one ${p.k} places further round, until the path closes.`),
      ];
      if (p.n <= 12) prompt.push({ kind: 'diagram', svg: regularStarSvg(p.n, p.k) });
      prompt.push(say('How many degrees is the angle at each tip of the star?'));
      return typed(prompt, starAnswer(p), '\\text{angle} =');
    }
    return typed(
      [
        say('Four tip angles of this five-pointed star are marked. The drawing is not to scale.'),
        { kind: 'diagram', svg: pentagramSvg(p) },
        say('How many degrees is the angle marked $x$?'),
      ],
      starAnswer(p),
      'x =',
    );
  },
  choices(p) {
    if (p.tips.length === 0) {
      const { n, k } = p;
      return numberOptions(starTip(n, k), [180 - 360 / n, (360 * k) / n, (180 * (n - 2)) / n, 180 - (180 * k) / n], 5, 1);
    }
    const others = p.tips.reduce((t, v) => t + v, 0) - p.tips[p.unknown];
    return numberOptions(starAnswer(p), [360 - others, 36, starAnswer(p) + 36, 72], 5, 1);
  },
  solution(p) {
    if (p.tips.length === 0) {
      const { n, k } = p;
      const turn = (360 * k) / n;
      return [
        { text: `Walk the star’s path. Joining points ${k} places along, you go round the centre ${k} times before the path closes, so you turn through $${k} \\times 360^\\circ$ in all.` },
        { text: `That turning is shared equally between the ${n} tips:` },
        { tex: `${k * 360} \\div ${n} = ${turn}` },
        { text: 'At each tip you turn through $180^\\circ$ less the tip angle:' },
        { tex: `\\text{tip} = 180 - ${turn} = ${starTip(n, k)}` },
      ];
    }
    const others = p.tips.filter((_, i) => i !== p.unknown);
    const sum = others.reduce((t, v) => t + v, 0);
    return [
      { text: 'Walk round the star. At each tip you turn through $180^\\circ$ less the tip angle, and you go round the centre twice, $720^\\circ$:' },
      { tex: '5 \\times 180 - \\text{tips} = 720' },
      { tex: '\\text{tips} = 900 - 720 = 180' },
      { text: 'Any five-pointed star’s tips add to $180^\\circ$, however it is drawn:' },
      { tex: `x = 180 - (${others.join(' + ')})` },
      { tex: `x = 180 - ${sum} = ${180 - sum}` },
    ];
  },
};

/* ---------- the angle a side subtends from a corner ---------- */

const POLYGON_NAMES: Record<number, string> = {
  5: 'pentagon',
  6: 'hexagon',
  8: 'octagon',
  9: 'nonagon',
  10: 'decagon',
  12: 'dodecagon',
};

const LETTERS = 'ABCDEFGHIJKL';

interface SeenParams {
  n: number;
  /** ∠V_i A V_j, 1 <= i < j <= n - 1. */
  i: number;
  j: number;
}

const seenAngle = ({ n, i, j }: SeenParams) => ((j - i) * 180) / n;

function seenSvg({ n, i, j }: SeenParams): string {
  const centre: Pt = [150, 108];
  const R = 88;
  const pts: Pt[] = Array.from({ length: n }, (_, v) => [centre[0] + R * Math.cos(rad(-90 + (360 * v) / n)), centre[1] + R * Math.sin(rad(-90 + (360 * v) / n))]);
  const parts = [svgOpen(215, `A regular polygon with ${n} sides and two lines drawn from A`), outline(pts)];
  parts.push(seg(pts[0], pts[i]), seg(pts[0], pts[j]));
  parts.push(angleMark(pts[0], pts[i], pts[j], '?', 20, 40));
  pts.forEach((p, v) => parts.push(text(plus(p, times(unit(centre, p), 12)), LETTERS[v], 'middle', 12)));
  parts.push('</svg>');
  return parts.join('');
}

const cmPolygonSeenAngle: Generator<SeenParams> = {
  id: 'cm-polygon-seen-angle',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      for (;;) {
        const n = rng.pick([5, 6, 8, 9, 10, 12]);
        const m = rng.int(2, n - 3);
        if ((180 * m) % n !== 0) continue;
        const i = rng.int(1, n - 1 - m);
        return { n, i, j: i + m };
      }
    }
    const n = rng.pick([5, 6, 9, 10, 12]);
    const i = rng.int(1, n - 2);
    return { n, i, j: i + 1 };
  },
  render(p) {
    const name = LETTERS.slice(0, p.n);
    return typed(
      [
        say(`$${name}$ is a regular ${POLYGON_NAMES[p.n]}.`),
        { kind: 'diagram', svg: seenSvg(p) },
        say(`How many degrees is $\\angle ${LETTERS[p.i]}A${LETTERS[p.j]}$?`),
      ],
      seenAngle(p),
      '\\text{angle} =',
    );
  },
  choices(p) {
    const { n } = p;
    const m = p.j - p.i;
    const interior = 180 - 360 / n;
    return numberOptions(seenAngle(p), [(360 * m) / n, 180 / n, interior, interior / 2, seenAngle(p) + 180 / n], 5, 1);
  },
  solution(p) {
    const { n } = p;
    const m = p.j - p.i;
    const sides = Array.from({ length: m }, (_, s) => `$${LETTERS[p.i + s]}${LETTERS[p.i + s + 1]}$`);
    const spanned = sides.length === 1 ? sides[0] : `${sides.slice(0, -1).join(', ')} and ${sides[sides.length - 1]}`;
    const steps: SolutionStep[] = [
      { text: 'The corners of a regular polygon all lie on one circle. Each side takes up an equal share of the angle at the centre:' },
      { tex: `360 \\div ${n} = ${num(360 / n)}` },
      { text: 'An angle at the circle is half the angle at the centre on the same side, so from any other corner each side is seen at' },
      { tex: `${num(360 / n)} \\div 2 = ${num(180 / n)}` },
    ];
    if (m === 1) steps.push({ text: `$\\angle ${LETTERS[p.i]}A${LETTERS[p.j]}$ looks across the one side ${spanned}, so it is $${num(180 / n)}^\\circ$.` });
    else steps.push({ text: `$\\angle ${LETTERS[p.i]}A${LETTERS[p.j]}$ looks across ${m} sides, ${spanned}:` }, { tex: `${m} \\times ${num(180 / n)} = ${num(seenAngle(p))}` });
    return steps;
  },
};

/* ---------- all but one angle of a polygon ---------- */

interface MissingParams {
  n: number;
  /** The missing interior angle. */
  m: number;
  ask: 'sides' | 'angle';
}

const missingSum = ({ n, m }: { n: number; m: number }) => (n - 2) * 180 - m;

const cmMissingAngle: Generator<MissingParams> = {
  id: 'cm-missing-angle',
  sample(rng, difficulty) {
    return { n: rng.int(5, difficulty >= 2 ? 16 : 12), m: rng.int(20, 175), ask: difficulty >= 2 ? 'angle' : 'sides' };
  },
  render(p) {
    return typed(
      [
        say(`All but one of the interior angles of a convex polygon add up to $${missingSum(p)}^\\circ$.`),
        say(p.ask === 'sides' ? 'How many sides does the polygon have?' : 'How many degrees is the remaining angle?'),
      ],
      p.ask === 'sides' ? p.n : p.m,
      p.ask === 'sides' ? '\\text{sides} =' : '\\text{angle} =',
    );
  },
  choices(p) {
    if (p.ask === 'sides') return numberOptions(p.n, [p.n - 1, p.n + 1, p.n - 2, p.n + 2], 1, 3);
    return numberOptions(p.m, [180 - p.m, p.m + 180, 360 - p.m, p.m + 10], 5, 1);
  },
  solution(p) {
    const S = missingSum(p);
    const q = Math.floor(S / 180);
    const r = S - 180 * q;
    return [
      { text: 'Every angle of a convex polygon is less than $180^\\circ$, so the full angle sum is the first multiple of $180$ above the total:' },
      { tex: `${S} = ${q} \\times 180 + ${r}` },
      { tex: `\\text{full sum} = ${q + 1} \\times 180 = ${(q + 1) * 180}` },
      { text: 'A polygon with $n$ sides has angles adding to $(n - 2) \\times 180^\\circ$:' },
      { tex: `n - 2 = ${q + 1}` },
      { tex: `n = ${p.n}` },
      { text: 'The missing angle is what is left:' },
      { tex: `${(q + 1) * 180} - ${S} = ${p.m}` },
    ];
  },
};

const cmMissingAngleTiles: Generator<{ n: number; m: number }> = {
  id: 'cm-missing-angle-tiles',
  sample(rng) {
    return { n: rng.int(5, 14), m: rng.int(20, 175) };
  },
  render(p) {
    const full = (p.n - 2) * 180;
    return {
      kind: 'tiles',
      prompt: [
        say(`All but one of the interior angles of a convex polygon add up to $${missingSum(p)}^\\circ$.`),
        say('Fill in the full angle sum, the number of sides and the missing angle.'),
      ],
      template: '\\text{full sum} = {0}^\\circ, \\quad \\text{sides} = {1}, \\quad \\text{missing} = {2}^\\circ',
      bank: numberBank([full, p.n, p.m], [full - 180, full + 180, p.n - 1, p.n + 1, 180 - p.m], 3, 1, 1),
      answer: [num(full), num(p.n), num(p.m)],
    };
  },
  solution(p) {
    const S = missingSum(p);
    const full = (p.n - 2) * 180;
    return [
      { text: 'Each angle is under $180^\\circ$, so the full sum is the first multiple of $180$ above the total:' },
      { tex: `\\text{full sum} = ${full}` },
      { tex: `n - 2 = ${full} \\div 180 = ${p.n - 2}` },
      { tex: `n = ${p.n}` },
      { tex: `\\text{missing} = ${full} - ${S} = ${p.m}` },
    ];
  },
};

/* ---------- regular polygons meeting at a point ---------- */

/** Regular polygons that fill the space round a point, every interior angle whole. */
const MEETINGS: number[][] = [
  [3, 8, 24],
  [3, 9, 18],
  [3, 10, 15],
  [3, 12, 12],
  [4, 5, 20],
  [4, 6, 12],
  [4, 8, 8],
  [5, 5, 10],
  [6, 6, 6],
  [3, 3, 4, 12],
  [3, 3, 6, 6],
  [3, 4, 4, 6],
  [4, 4, 4, 4],
  [3, 3, 3, 3, 6],
  [3, 3, 3, 4, 4],
  [3, 3, 3, 3, 3, 3],
];

const interiorOf = (n: number) => 180 - 360 / n;

const SHAPE_NAMES: Record<number, [string, string]> = {
  3: ['an equilateral triangle', 'equilateral triangles'],
  4: ['a square', 'squares'],
  5: ['a regular pentagon', 'regular pentagons'],
  6: ['a regular hexagon', 'regular hexagons'],
  8: ['a regular octagon', 'regular octagons'],
  9: ['a regular nonagon', 'regular nonagons'],
  10: ['a regular decagon', 'regular decagons'],
};

const COUNT_WORDS = ['', 'one', 'two', 'three', 'four', 'five'];

function shapeList(sides: number[]): string {
  const groups: string[] = [];
  for (const n of [...new Set(sides)].sort((a, b) => a - b)) {
    const count = sides.filter((s) => s === n).length;
    const [one, many] = SHAPE_NAMES[n] ?? [`a regular ${n}-sided polygon`, `regular ${n}-sided polygons`];
    groups.push(count === 1 ? one : `${COUNT_WORDS[count]} ${many}`);
  }
  return groups.length === 1 ? groups[0] : `${groups.slice(0, -1).join(', ')} and ${groups[groups.length - 1]}`;
}

const MEET_CONTEXTS = [
  (list: string) => `Regular polygons fit together round a point with no gaps and no overlaps: ${list}, and one more regular polygon. How many sides does the last one have?`,
  (list: string) => `At one corner of a tiled floor, ${list} meet one other regular polygon, filling the space round the point exactly. How many sides does the other polygon have?`,
  (list: string) => `A mosaic has ${list} and one more regular polygon meeting at a point, with no gaps between them. How many sides does that polygon have?`,
];

interface MeetParams {
  config: number;
  missing: number;
  context: number;
}

const meetGiven = ({ config, missing }: MeetParams) => MEETINGS[config].filter((_, i) => i !== missing);
const meetAnswer = ({ config, missing }: MeetParams) => MEETINGS[config][missing];

const cmPolygonsMeet: Generator<MeetParams> = {
  id: 'cm-polygons-meet',
  sample(rng, difficulty) {
    const pool = MEETINGS.map((c, i) => ({ c, i })).filter(({ c }) => (difficulty >= 2 ? c.length >= 4 || Math.max(...c) >= 15 : c.length === 3));
    const { c, i } = rng.pick(pool);
    return { config: i, missing: rng.int(0, c.length - 1), context: rng.int(0, MEET_CONTEXTS.length - 1) };
  },
  render(p) {
    return typed([say(MEET_CONTEXTS[p.context](shapeList(meetGiven(p))))], meetAnswer(p), '\\text{sides} =');
  },
  choices(p) {
    const n = meetAnswer(p);
    return numberOptions(n, [2 * n, n / 2, n + 2, n - 2, n + 1, n - 1], 1, 3);
  },
  solution(p) {
    const given = meetGiven(p);
    const n = meetAnswer(p);
    const gap = 360 - given.reduce((t, s) => t + interiorOf(s), 0);
    const steps: SolutionStep[] = [{ text: 'A regular polygon with $k$ sides has interior angles of $180^\\circ - 360^\\circ \\div k$:' }];
    for (const s of [...new Set(given)].sort((a, b) => a - b)) {
      steps.push({ tex: `k = ${s}: \\quad 180 - ${360 / s} = ${interiorOf(s)}` });
    }
    steps.push(
      { text: 'The angles round the point make $360^\\circ$, so the last polygon’s angle is' },
      { tex: `360 - (${given.map(interiorOf).join(' + ')}) = ${gap}` },
      { text: 'Its exterior angle is' },
      { tex: `180 - ${gap} = ${180 - gap}` },
      { text: 'and the exterior angles add to $360^\\circ$:' },
      { tex: `360 \\div ${180 - gap} = ${n}` },
    );
    return steps;
  },
};

/* ================================================================
 * Lesson 4: Special Right Triangles
 * ================================================================ */

/* ---------- the 30-60-90 triangle ---------- */

type SixtyMode = 'short-long' | 'short-hyp' | 'hyp-short' | 'hyp-long' | 'long-short' | 'long-hyp';

interface SixtyParams {
  u: number;
  mode: SixtyMode;
}

/** Short leg, long leg, hypotenuse. The long-leg modes give it as the whole number 3u. */
function sixtySides({ u, mode }: SixtyParams): { short: Surd; long: Surd; hyp: Surd } {
  if (mode.startsWith('long')) return { short: [u, 3], long: [3 * u, 1], hyp: [2 * u, 3] };
  return { short: [u, 1], long: [u, 3], hyp: [2 * u, 1] };
}

type Side = 'short' | 'long' | 'hyp';
const sixtyGiven = (mode: SixtyMode) => mode.split('-')[0] as Side;
const sixtyAsked = (mode: SixtyMode) => mode.split('-')[1] as Side;

function sixtySvg(labels: Record<Side, string>): string {
  const C: Pt = [55, 160];
  const B: Pt = [55 + 190, 160];
  const A: Pt = [55, 160 - 190 / Math.sqrt(3)];
  const inside = centroid([A, B, C]);
  return [
    svgOpen(190, 'A right-angled triangle with angles of 30 and 60 degrees'),
    outline([A, B, C]),
    rightMark(C, A, B),
    angleMark(B, A, C, '30°', 26, 48),
    angleMark(A, B, C, '60°', 18, 34),
    sideLabel(A, C, labels.short, inside),
    sideLabel(C, B, labels.long, inside),
    sideLabel(A, B, labels.hyp, inside),
    '</svg>',
  ].join('');
}

const SIDE_WORDS: Record<Side, string> = { short: 'shorter leg', long: 'longer leg', hyp: 'hypotenuse' };

const cmThirtySixty: Generator<SixtyParams> = {
  id: 'cm-thirty-sixty',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { u: rng.int(2, 20), mode: rng.pick(['long-short', 'long-hyp'] as const) };
    return { u: rng.int(2, 20), mode: rng.pick(['short-long', 'short-hyp', 'hyp-short', 'hyp-long'] as const) };
  },
  render(p) {
    const sides = sixtySides(p);
    const given = sixtyGiven(p.mode);
    const asked = sixtyAsked(p.mode);
    const labels: Record<Side, string> = { short: '', long: '', hyp: '' };
    labels[given] = surdText(sides[given]);
    labels[asked] = '?';
    return typed(
      [
        say(`The ${SIDE_WORDS[given]} of this triangle is ${surdText(sides[given])}.`),
        { kind: 'diagram', svg: sixtySvg(labels) },
        say(`Find the exact length of the ${SIDE_WORDS[asked]}.`),
      ],
      surdAnswer(sides[asked]),
      '\\text{length} =',
      SURD_KEYS,
    );
  },
  choices(p) {
    const sides = sixtySides(p);
    const ans = sides[sixtyAsked(p.mode)];
    const [c, r] = ans;
    const others = (['short', 'long', 'hyp'] as Side[]).filter((s) => s !== sixtyAsked(p.mode)).map((s) => sides[s]);
    return surdOptions(ans, [[c, r === 1 ? 3 : 1], [c, 2], [2 * c, r], ...others]);
  },
  solution(p) {
    const { u, mode } = p;
    const sides = sixtySides(p);
    const steps: SolutionStep[] = [
      { text: 'A $30^\\circ$-$60^\\circ$-$90^\\circ$ triangle is half an equilateral triangle, so its sides, shortest first, are in the ratio' },
      { tex: '1 : \\sqrt{3} : 2' },
      { text: 'The shorter leg is opposite the $30^\\circ$ angle.' },
    ];
    if (mode === 'short-long') steps.push({ tex: `\\text{longer leg} = ${u} \\times \\sqrt{3} = ${surdTex(sides.long)}` });
    if (mode === 'short-hyp') steps.push({ tex: `\\text{hypotenuse} = 2 \\times ${u} = ${2 * u}` });
    if (mode === 'hyp-short') steps.push({ tex: `\\text{shorter leg} = ${2 * u} \\div 2 = ${u}` });
    if (mode === 'hyp-long') {
      steps.push({ tex: `\\text{shorter leg} = ${2 * u} \\div 2 = ${u}` }, { tex: `\\text{longer leg} = ${u} \\times \\sqrt{3} = ${surdTex(sides.long)}` });
    }
    if (mode === 'long-short' || mode === 'long-hyp') {
      steps.push(
        { text: 'Divide the longer leg by $\\sqrt{3}$. Multiplying top and bottom by $\\sqrt{3}$ clears the root from the bottom:' },
        { tex: `\\frac{${3 * u}}{\\sqrt{3}} = \\frac{${3 * u}\\sqrt{3}}{3}` },
        { tex: `\\text{shorter leg} = ${surdTex(sides.short)}` },
      );
      if (mode === 'long-hyp') steps.push({ tex: `\\text{hypotenuse} = 2 \\times ${surdTex(sides.short)} = ${surdTex(sides.hyp)}` });
    }
    return steps;
  },
};

interface SixtyTilesParams {
  u: number;
  /** Difficulty 2 gives the longer leg; difficulty 1 the hypotenuse. */
  fromLong: boolean;
}

const cmThirtySixtyTiles: Generator<SixtyTilesParams> = {
  id: 'cm-thirty-sixty-tiles',
  sample(rng, difficulty) {
    return { u: rng.int(2, 34), fromLong: difficulty >= 2 };
  },
  render({ u, fromLong }) {
    if (fromLong) {
      const answer: Surd[] = [[u, 3], [2 * u, 3]];
      return {
        kind: 'tiles',
        prompt: [
          say(`The longer leg of this triangle is ${3 * u}.`),
          { kind: 'diagram', svg: sixtySvg({ short: '?', long: `${3 * u}`, hyp: '?' }) },
          say('Fill in the exact lengths of the other two sides.'),
        ],
        template: '\\text{shorter leg} = {0}, \\quad \\text{hypotenuse} = {1}',
        bank: surdBank(answer, [[u, 1], [2 * u, 1], [3 * u, 3], [u, 2], [6 * u, 1]]),
        answer: answer.map(surdTex),
      };
    }
    const answer: Surd[] = [[u, 1], [u, 3]];
    return {
      kind: 'tiles',
      prompt: [
        say(`The hypotenuse of this triangle is ${2 * u}.`),
        { kind: 'diagram', svg: sixtySvg({ short: '?', long: '?', hyp: `${2 * u}` }) },
        say('Fill in the exact lengths of the two legs.'),
      ],
      template: '\\text{shorter leg} = {0}, \\quad \\text{longer leg} = {1}',
      bank: surdBank(answer, [[2 * u, 3], [u, 2], [2 * u, 2], [3 * u, 1]]),
      answer: answer.map(surdTex),
    };
  },
  solution({ u, fromLong }) {
    if (fromLong) {
      return [
        { text: 'The sides are in the ratio $1 : \\sqrt{3} : 2$, so the shorter leg is the longer leg divided by $\\sqrt{3}$:' },
        { tex: `\\frac{${3 * u}}{\\sqrt{3}} = \\frac{${3 * u}\\sqrt{3}}{3} = ${surdTex([u, 3])}` },
        { tex: `\\text{hypotenuse} = 2 \\times ${surdTex([u, 3])} = ${surdTex([2 * u, 3])}` },
      ];
    }
    return [
      { text: 'The sides are in the ratio $1 : \\sqrt{3} : 2$, so the shorter leg is half the hypotenuse:' },
      { tex: `${2 * u} \\div 2 = ${u}` },
      { tex: `\\text{longer leg} = ${u} \\times \\sqrt{3} = ${surdTex([u, 3])}` },
    ];
  },
};

/* ---------- the square's diagonal ---------- */

interface DiagonalParams {
  mode: 'side' | 'diagonal' | 'area';
  v: number;
}

function squareSvg(sideLabel_: string, diagLabel: string): string {
  const x0 = 85;
  const y0 = 15;
  const s = 130;
  const A: Pt = [x0, y0];
  const B: Pt = [x0 + s, y0];
  const C: Pt = [x0 + s, y0 + s];
  const D: Pt = [x0, y0 + s];
  const parts = [svgOpen(165, 'A square with one diagonal drawn'), outline([A, B, C, D]), seg(A, C)];
  if (sideLabel_) parts.push(text([x0 + s / 2, y0 + s + 14], sideLabel_));
  if (diagLabel) parts.push(text([x0 + s / 2 + 16, y0 + s / 2 - 12], diagLabel));
  parts.push('</svg>');
  return parts.join('');
}

const cmSquareDiagonal: Generator<DiagonalParams> = {
  id: 'cm-square-diagonal',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { mode: 'area', v: rng.int(3, 40) };
    return rng.chance(0.5) ? { mode: 'side', v: rng.int(2, 20) } : { mode: 'diagonal', v: 2 * rng.int(2, 20) };
  },
  render({ mode, v }) {
    if (mode === 'side') {
      return typed(
        [say(`A square has sides of length ${v}.`), { kind: 'diagram', svg: squareSvg(`${v}`, '?') }, say('Find the exact length of its diagonal.')],
        surdAnswer([v, 2]),
        '\\text{diagonal} =',
        SURD_KEYS,
      );
    }
    if (mode === 'diagonal') {
      return typed(
        [say(`A square has a diagonal of length ${v}.`), { kind: 'diagram', svg: squareSvg('?', `${v}`) }, say('Find the exact length of its side.')],
        surdAnswer([v / 2, 2]),
        '\\text{side} =',
        SURD_KEYS,
      );
    }
    return typed(
      [say(`A square has a diagonal of ${v} cm.`), { kind: 'diagram', svg: squareSvg('', `${v}`) }, say('What is its area, in cm²?')],
      (v * v) / 2,
      '\\text{area} =',
      SURD_KEYS,
    );
  },
  choices({ mode, v }) {
    if (mode === 'side') return surdOptions([v, 2], [[2 * v, 1], [v, 3], [v, 1], [2 * v, 2]]);
    if (mode === 'diagonal') return surdOptions([v / 2, 2], [[v / 2, 1], [v, 2], [v / 2, 3]]);
    return numberOptions((v * v) / 2, [v * v, (v * v) / 4, 2 * v, 4 * v], 1, 1);
  },
  solution({ mode, v }) {
    if (mode === 'side') {
      return [
        { text: 'The diagonal cuts the square into two right triangles with two equal legs. By Pythagoras:' },
        { tex: `d^2 = ${v}^2 + ${v}^2 = ${2 * v * v}` },
        { tex: `d = \\sqrt{${2 * v * v}} = ${surdTex([v, 2])}` },
      ];
    }
    if (mode === 'diagonal') {
      return [
        { text: 'The diagonal is the hypotenuse of a right triangle whose legs are two sides $s$:' },
        { tex: `2s^2 = ${v}^2 = ${v * v}` },
        { tex: `s^2 = ${(v * v) / 2}` },
        { tex: `s = \\sqrt{${(v * v) / 2}} = ${surdTex([v / 2, 2])}` },
      ];
    }
    return [
      { text: 'The area is $s^2$, and Pythagoras gives $s^2$ straight away, with no root to take:' },
      { tex: `2s^2 = ${v}^2 = ${v * v}` },
      { tex: `s^2 = ${v * v} \\div 2 = ${num((v * v) / 2)}` },
    ];
  },
};

/* ---------- the equilateral triangle's height and area ---------- */

interface EquilateralParams {
  mode: 'height' | 'side' | 'area' | 'perimeter';
  /** Half the side. */
  t: number;
}

const cmEquilateralHeight: Generator<EquilateralParams> = {
  id: 'cm-equilateral-height',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { mode: rng.pick(['area', 'perimeter'] as const), t: rng.int(2, 20) };
    return { mode: rng.pick(['height', 'side'] as const), t: rng.int(2, 20) };
  },
  render({ mode, t }) {
    if (mode === 'height') {
      return typed([say(`An equilateral triangle has sides of length ${2 * t}. Find the exact height of the triangle.`)], surdAnswer([t, 3]), '\\text{height} =', SURD_KEYS);
    }
    if (mode === 'side') {
      return typed([say(`An equilateral triangle has a height of $${surdTex([t, 3])}$. How long is each side?`)], surdAnswer([2 * t, 1]), '\\text{side} =', SURD_KEYS);
    }
    const given = mode === 'area' ? `sides of length ${2 * t}` : `a perimeter of ${6 * t}`;
    return typed([say(`An equilateral triangle has ${given}. Find its exact area.`)], surdAnswer([t * t, 3]), '\\text{area} =', SURD_KEYS);
  },
  choices({ mode, t }) {
    if (mode === 'height') return surdOptions([t, 3], [[2 * t, 3], [t, 2], [t, 1]]);
    if (mode === 'side') return surdOptions([2 * t, 1], [[t, 1], [t, 3], [2 * t, 3], [3 * t, 1]]);
    return surdOptions([t * t, 3], [[2 * t * t, 3], [2 * t * t, 1], [t * t, 2], [4 * t * t, 3]]);
  },
  solution({ mode, t }) {
    const steps: SolutionStep[] = [];
    if (mode === 'perimeter') steps.push({ text: 'All three sides are equal:' }, { tex: `\\text{side} = ${6 * t} \\div 3 = ${2 * t}` });
    if (mode === 'side') {
      steps.push(
        { text: 'The height cuts the triangle into two $30^\\circ$-$60^\\circ$-$90^\\circ$ triangles. The height is the longer leg, half the side the shorter one, in the ratio $\\sqrt{3} : 1$:' },
        { tex: `\\text{half the side} = ${surdTex([t, 3])} \\div \\sqrt{3} = ${t}` },
        { tex: `\\text{side} = 2 \\times ${t} = ${2 * t}` },
      );
      return steps;
    }
    steps.push(
      { text: `The height meets the base at its midpoint, making a right triangle with hypotenuse ${2 * t} and base ${t}:` },
      { tex: `h^2 = ${2 * t}^2 - ${t}^2 = ${3 * t * t}` },
      { tex: `h = \\sqrt{${3 * t * t}} = ${surdTex([t, 3])}` },
    );
    if (mode !== 'height') steps.push({ tex: `\\text{area} = \\tfrac{1}{2} \\times ${2 * t} \\times ${surdTex([t, 3])} = ${surdTex([t * t, 3])}` });
    return steps;
  },
};

/* ---------- Pythagorean triples in disguise ---------- */

interface TripleParams {
  tri: number;
  k: number;
  ask: 'hyp' | 'leg';
  /** For a leg: which leg is given, 0 or 1. */
  given: number;
}

const cmTripleScale: Generator<TripleParams> = {
  id: 'cm-triple-scale',
  sample(rng, difficulty) {
    for (;;) {
      const tri = rng.int(0, PRIMITIVE.length - 1);
      const k = rng.int(2, 12);
      if (k * PRIMITIVE[tri][2] > (difficulty >= 2 ? 150 : 120)) continue;
      return { tri, k, ask: difficulty >= 2 ? 'leg' : 'hyp', given: rng.int(0, 1) };
    }
  },
  render({ tri, k, ask, given }) {
    const [a, b, c] = PRIMITIVE[tri].map((v) => v * k);
    if (ask === 'hyp') {
      return typed([say(`A right-angled triangle has shorter sides of ${a} and ${b}. How long is its hypotenuse?`)], c, '\\text{hypotenuse} =', SURD_KEYS);
    }
    const leg = given === 0 ? a : b;
    return typed([say(`A right-angled triangle has a hypotenuse of ${c} and one other side of ${leg}. How long is the third side?`)], given === 0 ? b : a, '\\text{side} =', SURD_KEYS);
  },
  choices({ tri, k, ask, given }) {
    const [a, b, c] = PRIMITIVE[tri].map((v) => v * k);
    if (ask === 'hyp') return numberOptions(c, [a + b, c + k, c - k, b + k], k, 1);
    const leg = given === 0 ? a : b;
    const other = given === 0 ? b : a;
    return numberOptions(other, [c - leg, other + k, other - k, c + leg - other], k, 1);
  },
  solution({ tri, k, ask, given }) {
    const [a0, b0, c0] = PRIMITIVE[tri];
    const [a, b, c] = [a0, b0, c0].map((v) => v * k);
    if (ask === 'hyp') {
      return [
        { text: `Both sides are multiples of ${k}:` },
        { tex: `${a} = ${k} \\times ${a0}, \\quad ${b} = ${k} \\times ${b0}` },
        { text: `and $${a0}, ${b0}, ${c0}$ is a Pythagorean triple:` },
        { tex: `${a0}^2 + ${b0}^2 = ${a0 * a0 + b0 * b0} = ${c0}^2` },
        { text: 'So the hypotenuse is the same multiple of the last number:' },
        { tex: `${k} \\times ${c0} = ${c}` },
      ];
    }
    const [leg, leg0, other, other0] = given === 0 ? [a, a0, b, b0] : [b, b0, a, a0];
    return [
      { text: `Both sides are multiples of ${k}:` },
      { tex: `${c} = ${k} \\times ${c0}, \\quad ${leg} = ${k} \\times ${leg0}` },
      { text: `and $${a0}, ${b0}, ${c0}$ is a Pythagorean triple:` },
      { tex: `${c0}^2 - ${leg0}^2 = ${c0 * c0 - leg0 * leg0} = ${other0}^2` },
      { tex: `${k} \\times ${other0} = ${other}` },
    ];
  },
};

/* ================================================================
 * Lesson 5: Creating Right Triangles
 * ================================================================ */

/** Right triangles as [half-base, height, slant]: every scaled triple, both ways round. */
const HALVES: [number, number, number][] = scaledTriples(50).flatMap(([p, q, r]) => [
  [p, q, r],
  [q, p, r],
]);

/* ---------- an isosceles triangle or a rhombus ---------- */

interface IsoAreaParams {
  m: number;
  h: number;
  a: number;
  rhombus: boolean;
}

function isoSvg({ m, h, a, rhombus }: IsoAreaParams): string {
  if (rhombus) {
    const [L, T, R, B] = fit([[-m, 0], [0, h], [m, 0], [0, -h]], 240, 150, 30, 12);
    const inside = centroid([L, T, R, B]);
    return [
      svgOpen(175, 'A rhombus with one diagonal drawn'),
      outline([L, T, R, B]),
      seg(L, R, DASHED),
      sideLabel(L, T, `${a}`, inside),
      text([(L[0] + R[0]) / 2, L[1] - 10], `${2 * m}`),
      '</svg>',
    ].join('');
  }
  const [L, T, R] = fit([[-m, 0], [0, h], [m, 0]], 240, 150, 30, 12);
  const inside = centroid([L, T, R]);
  return [
    svgOpen(185, 'An isosceles triangle'),
    outline([L, T, R]),
    ticks(L, T, 1),
    ticks(T, R, 1),
    sideLabel(L, T, `${a}`, inside, 18),
    sideLabel(T, R, `${a}`, inside, 18),
    sideLabel(L, R, `${2 * m}`, inside),
    '</svg>',
  ].join('');
}

const isoAnswer = (p: IsoAreaParams) => (p.rhombus ? 2 * p.m * p.h : p.m * p.h);

const cmIsoscelesArea: Generator<IsoAreaParams> = {
  id: 'cm-isosceles-area',
  sample(rng, difficulty) {
    const [m, h, a] = rng.pick(HALVES.filter(([, , r]) => r <= (difficulty >= 2 ? 50 : 40)));
    return { m, h, a, rhombus: difficulty >= 2 };
  },
  render(p) {
    const setup = p.rhombus
      ? `A rhombus has sides of ${p.a} cm and one diagonal of ${2 * p.m} cm.`
      : `A triangle has sides of ${p.a} cm, ${p.a} cm and ${2 * p.m} cm.`;
    return typed([say(setup), { kind: 'diagram', svg: isoSvg(p) }, say('What is its area, in cm²?')], isoAnswer(p), '\\text{area} =');
  },
  choices(p) {
    const { m, h, a } = p;
    if (p.rhombus) return numberOptions(2 * m * h, [4 * m * h, a * a, 2 * m * a, m * h], 2, 1);
    return numberOptions(m * h, [m * a, 2 * m * h, 2 * m * a, m * (a - m)], 2, 1);
  },
  solution(p) {
    const { m, h, a } = p;
    if (p.rhombus) {
      return [
        { text: `The diagonals of a rhombus cross at right angles and cut each other in half. That makes four right triangles, each with hypotenuse ${a} and one leg ${m}:` },
        { tex: `${a}^2 - ${m}^2 = ${a * a - m * m} = ${h}^2` },
        { text: `So half the other diagonal is ${h}, and the whole of it is ${2 * h}. The area is half the product of the diagonals:` },
        { tex: `\\text{area} = \\tfrac{1}{2} \\times ${2 * m} \\times ${2 * h} = ${2 * m * h}` },
      ];
    }
    return [
      { text: `Drop a perpendicular from the top corner. In an isosceles triangle it cuts the base in half, making two right triangles with hypotenuse ${a} and base ${m}:` },
      { tex: `h^2 = ${a}^2 - ${m}^2 = ${a * a - m * m}` },
      { tex: `h = ${h}` },
      { tex: `\\text{area} = \\tfrac{1}{2} \\times ${2 * m} \\times ${h} = ${m * h}` },
    ];
  },
};

/* ---------- an isosceles trapezium ---------- */

interface TrapParams {
  o: number;
  h: number;
  l: number;
  p: number;
  ask: 'height' | 'area';
}

const trapArea = ({ o, h, p }: TrapParams) => (p + o) * h;

function trapSvg({ o, h, l, p }: TrapParams): string {
  const q = p + 2 * o;
  const [BL, BR, TR, TL] = fit([[0, 0], [q, 0], [o + p, h], [o, h]], 250, 130, 25, 22);
  const inside = centroid([BL, BR, TR, TL]);
  return [
    svgOpen(180, 'An isosceles trapezium'),
    outline([BL, BR, TR, TL]),
    ticks(BL, TL, 1),
    ticks(BR, TR, 1),
    sideLabel(TL, TR, `${p}`, inside),
    sideLabel(BL, BR, `${q}`, inside),
    sideLabel(BL, TL, `${l}`, inside, 16),
    sideLabel(TR, BR, `${l}`, inside, 16),
    '</svg>',
  ].join('');
}

const cmTrapeziumArea: Generator<TrapParams> = {
  id: 'cm-trapezium-area',
  sample(rng, difficulty) {
    const [o, h, l] = rng.pick(HALVES.filter(([, , r]) => r <= 30));
    return { o, h, l, p: rng.int(2, 20), ask: difficulty >= 2 ? 'area' : 'height' };
  },
  render(t) {
    const q = t.p + 2 * t.o;
    return typed(
      [
        say(`An isosceles trapezium has parallel sides of ${t.p} cm and ${q} cm, and two slanted sides of ${t.l} cm each.`),
        { kind: 'diagram', svg: trapSvg(t) },
        say(t.ask === 'area' ? 'What is its area, in cm²?' : 'What is its height, in cm?'),
      ],
      t.ask === 'area' ? trapArea(t) : t.h,
      t.ask === 'area' ? '\\text{area} =' : '\\text{height} =',
    );
  },
  choices(t) {
    const q = t.p + 2 * t.o;
    if (t.ask === 'height') return numberOptions(t.h, [t.l - t.o, t.l, t.o, q - t.p], 1, 1);
    return numberOptions(trapArea(t), [(t.p + t.o) * t.l, (t.p + q) * t.h, q * t.h, t.p * t.h], 1, 1);
  },
  solution(t) {
    const q = t.p + 2 * t.o;
    const steps: SolutionStep[] = [
      { text: 'Drop a perpendicular from each end of the top side. Between them is a rectangle, and they cut off equal pieces at each end of the bottom:' },
      { tex: `(${q} - ${t.p}) \\div 2 = ${t.o}` },
      { text: `Each end is a right triangle with hypotenuse ${t.l} and base ${t.o}:` },
      { tex: `h^2 = ${t.l}^2 - ${t.o}^2 = ${t.h * t.h}` },
      { tex: `h = ${t.h}` },
    ];
    if (t.ask === 'area') {
      steps.push({ text: 'The area is the mean of the parallel sides times the height:' }, { tex: `\\tfrac{1}{2}(${t.p} + ${q}) \\times ${t.h} = ${trapArea(t)}` });
    }
    return steps;
  },
};

/* ---------- two sides and a 30° or 150° angle ---------- */

interface WideParams {
  a: number;
  b: number;
  obtuse: boolean;
}

function wideSvg({ a, b, obtuse }: WideParams): string {
  const theta = rad(obtuse ? 150 : 30);
  const [P, Q, R] = fit([[0, 0], [a, 0], [b * Math.cos(theta), b * Math.sin(theta)]], 250, 120, 25, 18);
  const inside = centroid([P, Q, R]);
  return [
    svgOpen(165, `A triangle with sides ${a} and ${b} and the angle between them marked`),
    outline([P, Q, R]),
    angleMark(P, Q, R, obtuse ? '150°' : '30°', 16, obtuse ? 30 : 42),
    sideLabel(P, Q, `${a}`, inside),
    sideLabel(P, R, `${b}`, inside),
    '</svg>',
  ].join('');
}

const cmWideAngle: Generator<WideParams> = {
  id: 'cm-wide-angle',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(4, 20);
      const b = 2 * rng.int(2, 10);
      if (a === b || ((a * b) / 2) % 2 !== 0) continue;
      return { a, b, obtuse: difficulty >= 2 };
    }
  },
  render(p) {
    return typed(
      [
        say(`Two sides of a triangle are ${p.a} cm and ${p.b} cm, and the angle between them is $${p.obtuse ? 150 : 30}^\\circ$.`),
        { kind: 'diagram', svg: wideSvg(p) },
        say('What is the area of the triangle, in cm²?'),
      ],
      (p.a * p.b) / 4,
      '\\text{area} =',
    );
  },
  choices({ a, b }) {
    return numberOptions((a * b) / 4, [(a * b) / 2, a * b, (a * b) / 8, a + b], 1, 1);
  },
  solution({ a, b, obtuse }) {
    const steps: SolutionStep[] = [{ text: `Take the side of ${a} as the base, and drop a perpendicular to it from the far end of the side of ${b}.` }];
    if (obtuse) {
      steps.push(
        { text: 'The angle is obtuse, so the perpendicular lands outside the triangle, on the base extended. The angle there, outside the triangle, is' },
        { tex: '180 - 150 = 30' },
      );
    }
    steps.push(
      { text: `The perpendicular makes a $30^\\circ$-$60^\\circ$-$90^\\circ$ triangle with hypotenuse ${b}. The height is its shorter leg, half the hypotenuse:` },
      { tex: `h = ${b} \\div 2 = ${b / 2}` },
      { tex: `\\text{area} = \\tfrac{1}{2} \\times ${a} \\times ${b / 2} = ${(a * b) / 4}` },
    );
    return steps;
  },
};

/* ---------- a triangle glued from two right triangles ---------- */

interface Glued {
  /** Sides: a on the left, b on the right, c the base, a > b. */
  a: number;
  b: number;
  c: number;
  /** The foot of the height cuts c into x (next to a) and y (next to b). */
  x: number;
  y: number;
  h: number;
}

/** Every triangle made of two right triangles from the table standing back to back on a common height. */
const GLUED: Glued[] = (() => {
  const legs = scaledTriples(85).flatMap(([p, q, r]) => [
    { h: p, x: q, s: r },
    { h: q, x: p, s: r },
  ]);
  const out: Glued[] = [];
  for (const one of legs) {
    for (const two of legs) {
      if (one.h !== two.h || one.s <= two.s) continue;
      const c = one.x + two.x;
      if (c > 85 || c === one.s || c === two.s) continue;
      out.push({ a: one.s, b: two.s, c, x: one.x, y: two.x, h: one.h });
    }
  }
  return out;
})();

const gluedMax = (g: Glued) => Math.max(g.a, g.b, g.c);

/** `flip` draws the side a on the right and names the sides the other way round. */
function gluedSvg(g: Glued, flip: boolean): string {
  const [L, R, T] = fit([[0, 0], [g.c, 0], [flip ? g.y : g.x, g.h]], 240, 140, 30, 16);
  const inside = centroid([L, R, T]);
  return [
    svgOpen(185, `A triangle with sides ${g.a}, ${g.b} and ${g.c}`),
    outline([L, R, T]),
    sideLabel(L, T, `${flip ? g.b : g.a}`, inside, 16),
    sideLabel(T, R, `${flip ? g.a : g.b}`, inside, 16),
    sideLabel(L, R, `${g.c}`, inside),
    '</svg>',
  ].join('');
}

const gluedSides = (g: Glued, flip: boolean) => (flip ? `${g.b} cm, ${g.a} cm and ${g.c} cm` : `${g.a} cm, ${g.b} cm and ${g.c} cm`);

function gluedPool(difficulty: number, keep: (g: Glued) => boolean = () => true): number[] {
  return GLUED.map((g, index) => ({ g, index }))
    .filter(({ g }) => keep(g) && (difficulty >= 2 ? gluedMax(g) > 30 : gluedMax(g) <= 50))
    .map(({ index }) => index);
}

function gluedSteps(g: Glued): SolutionStep[] {
  return [
    { text: `Drop the height $h$ onto the side of ${g.c}. It cuts that side into $x$, next to the side of ${g.a}, and $y$, next to the side of ${g.b}, so $x + y = ${g.c}$.` },
    { text: 'Both right triangles have the same height:' },
    { tex: `${g.a}^2 - x^2 = ${g.b}^2 - y^2` },
    { tex: `x^2 - y^2 = ${g.a * g.a} - ${g.b * g.b} = ${g.a * g.a - g.b * g.b}` },
    { text: `A difference of two squares is $(x + y)(x - y)$, and $x + y = ${g.c}$:` },
    { tex: `x - y = ${g.a * g.a - g.b * g.b} \\div ${g.c} = ${g.x - g.y}` },
    { tex: `x = ${g.x}, \\quad y = ${g.y}` },
    { tex: `h^2 = ${g.a}^2 - ${g.x}^2 = ${g.h * g.h}` },
    { tex: `h = ${g.h}` },
  ];
}

interface GluedParams {
  index: number;
  flip: boolean;
  ask: 'height' | 'area';
}

const cmGluedTriangles: Generator<GluedParams> = {
  id: 'cm-glued-triangles',
  sample(rng, difficulty) {
    return { index: rng.pick(gluedPool(difficulty)), flip: rng.chance(0.5), ask: difficulty >= 2 ? 'area' : 'height' };
  },
  render({ index, flip, ask }) {
    const g = GLUED[index];
    return typed(
      [
        say(`A triangle has sides of ${gluedSides(g, flip)}.`),
        { kind: 'diagram', svg: gluedSvg(g, flip) },
        say(ask === 'area' ? 'What is its area, in cm²?' : `How far is the opposite corner from the side of ${g.c} cm? That is, what is the height onto that side?`),
      ],
      ask === 'area' ? (g.c * g.h) / 2 : g.h,
      ask === 'area' ? '\\text{area} =' : '\\text{height} =',
    );
  },
  choices({ index, ask }) {
    const g = GLUED[index];
    if (ask === 'area') return numberOptions((g.c * g.h) / 2, [g.c * g.h, (g.a * g.b) / 2, (g.c * g.b) / 2, (g.c * g.a) / 2], 2, 1);
    return numberOptions(g.h, [g.x, g.y, (g.a + g.b) / 2, g.a - g.y], 1, 1);
  },
  solution({ index, ask }) {
    const g = GLUED[index];
    const steps = gluedSteps(g);
    if (ask === 'area') steps.push({ tex: `\\text{area} = \\tfrac{1}{2} \\times ${g.c} \\times ${g.h} = ${num((g.c * g.h) / 2)}` });
    return steps;
  },
};

const cmGluedTrianglesTable: Generator<{ index: number; flip: boolean }> = {
  id: 'cm-glued-triangles-table',
  sample(rng, difficulty) {
    const pool = gluedPool(difficulty, (g) => {
      const values = [g.x, g.y, g.h, (g.c * g.h) / 2];
      return new Set(values).size === 4 && Number.isInteger(values[3]);
    });
    return { index: rng.pick(pool), flip: rng.chance(0.5) };
  },
  render({ index, flip }): Slide {
    const g = GLUED[index];
    const area = (g.c * g.h) / 2;
    return {
      kind: 'table',
      prompt: [
        say(`A triangle has sides of ${gluedSides(g, flip)}. The height onto the side of ${g.c} cm cuts it into two pieces.`),
        { kind: 'diagram', svg: gluedSvg(g, flip) },
        say('Fill in the table.'),
      ],
      columns: ['\\text{Length or area}', '\\text{Value}'],
      rows: [
        [`\\text{piece next to the side of } ${g.a}`, null],
        [`\\text{piece next to the side of } ${g.b}`, null],
        ['\\text{height}', null],
        ['\\text{area}', null],
      ],
      bank: numberBank([g.x, g.y, g.h, area], [g.x - g.y, g.c * g.h, (g.a + g.b) / 2, g.c - g.h, g.a - g.x].filter((v) => Number.isInteger(v)), 3, 1, 1),
      answer: [g.x, g.y, g.h, area].map(num),
    };
  },
  solution({ index }) {
    const g = GLUED[index];
    return [...gluedSteps(g), { tex: `\\text{area} = \\tfrac{1}{2} \\times ${g.c} \\times ${g.h} = ${num((g.c * g.h) / 2)}` }];
  },
};

export const contestGeometryFundamentalsGenerators = [
  cmFloorTiles,
  cmFourRectangles,
  cmStripSquare,
  cmStripSquareTiles,
  cmParallelBend,
  cmIsoscelesChain,
  cmIsoscelesChainTiles,
  cmIsoscelesCases,
  cmStarTips,
  cmPolygonSeenAngle,
  cmMissingAngle,
  cmMissingAngleTiles,
  cmPolygonsMeet,
  cmThirtySixty,
  cmThirtySixtyTiles,
  cmSquareDiagonal,
  cmEquilateralHeight,
  cmTripleScale,
  cmIsoscelesArea,
  cmTrapeziumArea,
  cmWideAngle,
  cmGluedTriangles,
  cmGluedTrianglesTable,
];
