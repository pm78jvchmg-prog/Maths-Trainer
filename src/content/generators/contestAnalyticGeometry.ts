/**
 * Contest Math, level 19: Analytical Geometry.
 *
 * Four lessons: coordinate geometry, conics, mass points, and geometry with
 * complex numbers. Level 5 already asks the plain distance, midpoint,
 * collinearity and shoelace questions (`cm-coord-*`, `cm-collinear`,
 * `cm-parallelogram-vertex`); these go a step further, and each turns on one
 * idea: reflect a point so a bent path becomes straight, count lattice points
 * with a gcd, find a height as an area worked out twice, add the distances to
 * the foci, balance a triangle with masses, and turn a point with `i`.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import { FRACTION_KEYS, fracAnswer, fracTex, gcd, num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ================================================================
 * Shared pieces
 * ================================================================ */

type P2 = [number, number];
type Frac = [number, number];

/** A point in TeX: `(3, -2)`. */
const pt = (x: number, y: number) => `(${x}, ${y})`;

/** A number squared in TeX, a negative one bracketed: `(-3)^2`. */
const sq = (v: number) => (v < 0 ? `(${v})^2` : `${v}^2`);

/** A number bracketed when negative, for the middle of a sum: `(-4)`. */
const br = (v: number) => (v < 0 ? `(${v})` : `${v}`);

/** ` + 6x`, ` - 4y`, ` + 12`, ` - x`, or nothing for a zero coefficient. */
function term(coef: number, v = ''): string {
  if (coef === 0) return '';
  const size = Math.abs(coef);
  return ` ${coef < 0 ? '-' : '+'} ${size === 1 && v ? '' : size}${v}`;
}

/** A complex number as a textbook writes it: `3 - 4i`, `-i`, `5`, `2i`. */
function cTex(re: number, im: number): string {
  const imOnly = (v: number) => (v === 1 ? 'i' : v === -1 ? '-i' : `${v}i`);
  if (im === 0) return `${re}`;
  if (re === 0) return imOnly(im);
  return `${re} ${im < 0 ? '-' : '+'} ${Math.abs(im) === 1 ? '' : Math.abs(im)}i`;
}

/**
 * Four options for a fraction answer: the answer and the first three slips
 * that are positive, new in value, and whole when the answer is whole, topped
 * up with the answer plus or minus a whole number.
 */
function fracOptions(correct: Frac, slips: Frac[]): ChoiceOption[] {
  const [p, q] = correct;
  const whole = (f: Frac) => f[0] % f[1] === 0;
  const answerWhole = whole(correct);
  const seen = new Set([fracAnswer(p, q)]);
  const picked: Frac[] = [];
  const topUp: Frac[] = [
    [p + q, q],
    [p + 2 * q, q],
    [p - q, q],
    [2 * p, q],
    [p + 3 * q, q],
  ];
  for (const f of [...slips, ...topUp]) {
    if (picked.length === 3) break;
    if (!Number.isFinite(f[0] / f[1]) || f[1] <= 0 || f[0] <= 0) continue;
    if (answerWhole && !whole(f)) continue;
    const key = fracAnswer(f[0], f[1]);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(f);
  }
  return options(
    { tex: fracTex(p, q), answer: fracAnswer(p, q) },
    ...picked.sort((x, y) => x[0] / x[1] - y[0] / y[1]).map((f) => ({ tex: fracTex(f[0], f[1]), answer: fracAnswer(f[0], f[1]) })),
  );
}

/** A ratio in lowest terms. */
function lowest(a: number, b: number): Frac {
  const g = gcd(a, b) || 1;
  return [a / g, b / g];
}

/** The factor a mass is scaled by, in TeX: `\\tfrac{2}{3}`, or `2` when it is whole. */
function massFrac(top: number, bottom: number): string {
  const [p, q] = lowest(top, bottom);
  return q === 1 ? `${p}` : `\\tfrac{${p}}{${q}}`;
}

/** `a : b`, and then `= c : d` when it simplifies. */
function ratioTex(a: number, b: number): string {
  const [x, y] = lowest(a, b);
  return x === a ? `${a} : ${b}` : `${a} : ${b} = ${x} : ${y}`;
}

/** Pythagorean triples, legs first. */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [6, 8, 10],
  [8, 6, 10],
  [5, 12, 13],
  [12, 5, 13],
  [9, 12, 15],
  [12, 9, 15],
  [8, 15, 17],
  [15, 8, 17],
];

/* ================================================================
 * Figures. Plain SVG text only (KaTeX cannot render inside SVG), and
 * `currentColor` throughout so a figure reads in either theme.
 * ================================================================ */

const f1 = (v: number) => v.toFixed(1);

function svg(height: number, label: string, body: string[]): string {
  return [`<svg viewBox="0 0 300 ${Math.round(height)}" width="100%" role="img" aria-label="${label}">`, ...body, '</svg>'].join('');
}

const seg = (a: P2, b: P2, width = 2) =>
  `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="currentColor" stroke-width="${width}" />`;

const thin = (a: P2, b: P2) =>
  `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" />`;

const txt = (x: number, y: number, text: string, anchor: 'start' | 'middle' | 'end' = 'middle', size = 13) =>
  `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" fill="currentColor" text-anchor="${anchor}" dominant-baseline="middle">${text}</text>`;

const pathOf = (pts: P2[]) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${f1(x)} ${f1(y)}`).join(' ') + ' Z';

const shade = (pts: P2[]) => `<path class="plot-shade" d="${pathOf(pts)}" />`;

const outline = (pts: P2[]) => `<path d="${pathOf(pts)}" fill="none" stroke="currentColor" stroke-width="2" />`;

const dot = (p: P2) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="3" fill="currentColor" />`;

const lerp = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Where two lines cross, each given by two points. */
function meet(a: P2, b: P2, c: P2, d: P2): P2 {
  const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den;
  return lerp(a, b, t);
}

/** A label beside the middle of a segment, on the side away from `away`. */
function sideLabel(from: P2, to: P2, text: string, away: P2, gap = 13): string {
  const mid = lerp(from, to, 0.5);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  let nx = -(to[1] - from[1]) / len;
  let ny = (to[0] - from[0]) / len;
  if ((mid[0] + nx - away[0]) ** 2 + (mid[1] + ny - away[1]) ** 2 < (mid[0] - nx - away[0]) ** 2 + (mid[1] - ny - away[1]) ** 2) {
    nx = -nx;
    ny = -ny;
  }
  return txt(mid[0] + nx * gap, mid[1] + ny * gap, text);
}

/** A point's letter, set in the widest gap between the lines leaving it. */
function pointLabel(at: P2, rays: P2[], text: string, gap = 13): string {
  const angles = rays.map((q) => Math.atan2(q[1] - at[1], q[0] - at[0]));
  let best = -Math.PI / 2;
  let bestGap = -1;
  for (let k = 0; k < 36; k += 1) {
    const a = (k / 36) * 2 * Math.PI;
    const clear = Math.min(...angles.map((b) => Math.abs(((a - b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)));
    if (clear > bestGap) {
      bestGap = clear;
      best = a;
    }
  }
  return txt(at[0] + Math.cos(best) * gap, at[1] + Math.sin(best) * gap, text);
}

/** A first-quadrant grid, `xMax` by `yMax`, with points marked and the walls drawn heavy. */
function quadrantSvg(xMax: number, yMax: number, walls: ('x' | 'y')[], marks: { at: P2; label: string }[], label: string): string {
  const cell = Math.min(240 / xMax, 170 / yMax);
  const left = 34;
  const top = 18;
  const X = (x: number) => left + x * cell;
  const Y = (y: number) => top + (yMax - y) * cell;
  const parts: string[] = [];
  for (let x = 1; x <= xMax; x += 1) parts.push(thin([X(x), Y(0)], [X(x), Y(yMax)]));
  for (let y = 1; y <= yMax; y += 1) parts.push(thin([X(0), Y(y)], [X(xMax), Y(y)]));
  parts.push(seg([X(0), Y(0)], [X(xMax), Y(0)], walls.includes('x') ? 4 : 1.5));
  parts.push(seg([X(0), Y(0)], [X(0), Y(yMax)], walls.includes('y') ? 4 : 1.5));
  parts.push(txt(X(xMax) + 10, Y(0), 'x'), txt(X(0), Y(yMax) - 10, 'y'), txt(X(0) - 10, Y(0) + 10, 'O'));
  for (const { at, label: name } of marks) {
    parts.push(dot([X(at[0]), Y(at[1])]), txt(X(at[0]) + 12, Y(at[1]) - 10, name));
  }
  return svg(top + yMax * cell + 26, label, parts);
}

/* ================================================================
 * Lesson 1: Coordinate Geometry
 * ================================================================ */

/* ---------- the shortest walk via a river: reflect ---------- */

interface RiverParams {
  a: P2;
  b: P2;
  h: number;
  /** Difficulty 2: the x-axis and then the y-axis, so two reflections. */
  two: boolean;
}

const riverAcross = ({ a, b, two }: RiverParams) => (two ? a[0] + b[0] : b[0] - a[0]);
const riverUp = ({ a, b }: RiverParams) => a[1] + b[1];

const cmAgRiver: Generator<RiverParams> = {
  id: 'cm-ag-river',
  sample(rng, difficulty) {
    for (;;) {
      const [u, v, h] = rng.pick(TRIPLES);
      if (difficulty < 2) {
        const a1 = rng.int(0, 4);
        const a2 = rng.int(1, v - 1);
        if (a1 + u > 17) continue;
        return { a: [a1, a2], b: [a1 + u, v - a2], h, two: false };
      }
      const a1 = rng.int(1, u - 1);
      const a2 = rng.int(1, v - 1);
      const b1 = u - a1;
      const b2 = v - a2;
      // The straight line from A' to B' must cross the x-axis before the y-axis.
      if (a2 * b1 >= a1 * b2) continue;
      if (Math.max(a1, b1) > 13 || Math.max(a2, b2) > 13) continue;
      return { a: [a1, a2], b: [b1, b2], h, two: true };
    }
  },
  render(p) {
    const [A, B] = [pt(p.a[0], p.a[1]), pt(p.b[0], p.b[1])];
    const route = p.two ? `from $A = ${A}$ to the $x$-axis, then to the $y$-axis, then to $B = ${B}$` : `from $A = ${A}$ to the $x$-axis, then on to $B = ${B}$`;
    const xMax = Math.max(p.a[0], p.b[0]) + 1;
    const yMax = Math.max(p.a[1], p.b[1]) + 1;
    return typed(
      [
        say(`A walker goes ${route}.`),
        { kind: 'diagram', svg: quadrantSvg(xMax, yMax, p.two ? ['x', 'y'] : ['x'], [{ at: p.a, label: 'A' }, { at: p.b, label: 'B' }], 'Points A and B above the axes') },
        say('What is the shortest possible length of the walk?'),
      ],
      p.h,
      '\\text{length} =',
    );
  },
  choices(p) {
    const u = riverAcross(p);
    const v = riverUp(p);
    return numberOptions(p.h, [u + v, p.h + 2, p.h - 1], 1, 1);
  },
  solution(p) {
    const u = riverAcross(p);
    const v = riverUp(p);
    const steps: SolutionStep[] = p.two
      ? [
          { text: `Reflect $A$ in the $x$-axis to $A' = ${pt(p.a[0], -p.a[1])}$ and $B$ in the $y$-axis to $B' = ${pt(-p.b[0], p.b[1])}$. Each bounce then becomes a straight crossing, so the walk is as long as a path from $A'$ to $B'$, shortest when straight.` },
          { text: `From $A'$ to $B'$ is ${p.a[0]} + ${p.b[0]} = ${u} across and ${p.a[1]} + ${p.b[1]} = ${v} up:` },
        ]
      : [
          { text: `Reflect $B$ in the $x$-axis to $B' = ${pt(p.b[0], -p.b[1])}$. From any point $P$ on the axis, $PB = PB'$, so the walk is as long as $A$ to $P$ to $B'$, shortest when straight.` },
          { text: `From $A$ to $B'$ is ${u} across and ${p.a[1]} + ${p.b[1]} = ${v} down:` },
        ];
    steps.push({ tex: `${u}^2 + ${v}^2 = ${p.h * p.h}` }, { tex: `\\sqrt{${p.h * p.h}} = ${p.h}` });
    if (!p.two) steps.push({ text: `Walking straight down, along the axis and up again is ${p.a[1]} + ${u} + ${p.b[1]} = ${u + v}, which is longer.` });
    return steps;
  },
};

/* ---------- lattice points on a segment: a gcd ---------- */

interface LatticeParams {
  x: number;
  y: number;
  dx: number;
  dy: number;
  /** Difficulty 2 counts only the points strictly between the ends. */
  inside: boolean;
}

const latticeG = ({ dx, dy }: LatticeParams) => gcd(dx, Math.abs(dy));
const latticeCount = (p: LatticeParams) => (p.inside ? latticeG(p) - 1 : latticeG(p) + 1);

const cmAgLattice: Generator<LatticeParams> = {
  id: 'cm-ag-lattice',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const g = rng.int(2, hard ? 15 : 12);
      const s = rng.int(1, hard ? 7 : 5);
      const t = rng.int(1, hard ? 7 : 5);
      if (gcd(s, t) !== 1 || s === t) continue;
      const dx = g * s;
      const dy = g * t * (hard ? rng.sign() : 1);
      if (dx > 70 || Math.abs(dy) > 70) continue;
      const x = hard ? rng.int(-20, 10) : rng.int(0, 9);
      const y = hard ? rng.int(-20, 10) : rng.int(0, 9);
      return { x, y, dx, dy, inside: hard };
    }
  },
  render(p) {
    const ends = `$${pt(p.x, p.y)}$ and $${pt(p.x + p.dx, p.y + p.dy)}$`;
    return typed(
      [
        say(`A straight segment joins ${ends}.`),
        say(
          p.inside
            ? 'How many points with whole-number coordinates lie on it strictly between the two ends?'
            : 'How many points with whole-number coordinates lie on it, counting both ends?',
        ),
      ],
      latticeCount(p),
      '\\text{points} =',
    );
  },
  choices(p) {
    const g = latticeG(p);
    const slips = p.inside ? [g + 1, g, p.dx - 1] : [g, p.dx + 1, Math.abs(p.dy) + 1];
    return numberOptions(latticeCount(p), slips, 1, 0);
  },
  solution(p) {
    const g = latticeG(p);
    const ady = Math.abs(p.dy);
    return [
      { text: `The segment goes ${p.dx} across and ${ady} ${p.dy < 0 ? 'down' : 'up'}. The smallest whole step along it divides both, so it is set by their highest common factor:` },
      { tex: `\\gcd(${p.dx}, ${ady}) = ${g}` },
      { text: `One step is ${p.dx / g} across and ${ady / g} ${p.dy < 0 ? 'down' : 'up'}, and it takes ${g} steps to cross the segment.` },
      p.inside
        ? { text: `${g} steps have ${g + 1} points at their ends. Leaving out the two ends of the segment leaves ${g - 1}.` }
        : { text: `${g} steps have one more point than steps: ${g + 1}, counting both ends.` },
    ];
  },
};

/* ---------- Pick's theorem, as a table ---------- */

interface PickParams {
  a: number;
  c: number;
  d: number;
}

const pickArea = ({ a, d }: PickParams) => (a * d) / 2;
const pickB = ({ a, c, d }: PickParams) => a + gcd(c, d) + gcd(Math.abs(a - c), d);
const pickI = (p: PickParams) => pickArea(p) - pickB(p) / 2 + 1;

function pickSvg({ a, c, d }: PickParams): string {
  const cell = Math.min(200 / Math.max(a, c), 150 / d);
  const left = 64;
  const top = 26;
  const X = (x: number) => left + x * cell;
  const Y = (y: number) => top + (d - y) * cell;
  const O: P2 = [X(0), Y(0)];
  const P: P2 = [X(a), Y(0)];
  const Q: P2 = [X(c), Y(d)];
  const parts = [
    seg([X(0), Y(0)], [X(Math.max(a, c)) + 18, Y(0)], 1),
    seg([X(0), Y(0)], [X(0), Y(d) - 14], 1),
    shade([O, P, Q]),
    outline([O, P, Q]),
    dot(O),
    dot(P),
    dot(Q),
    txt(O[0] - 6, O[1] + 14, '(0, 0)', 'end'),
    txt(P[0], P[1] + 16, `(${a}, 0)`),
    c === 0 ? txt(Q[0] - 8, Q[1], `(0, ${d})`, 'end') : txt(Q[0], Q[1] - 14, `(${c}, ${d})`),
  ];
  return svg(top + d * cell + 34, 'A triangle with its corners marked by their coordinates', parts);
}

const cmAgPick: Generator<PickParams> = {
  id: 'cm-ag-pick',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty < 2) {
        const a = rng.int(3, 14);
        const d = rng.int(3, 12);
        if (a === d || gcd(a, d) < 2) continue;
        return { a, c: 0, d };
      }
      const a = rng.int(4, 14);
      const c = rng.int(1, a - 1);
      const d = rng.int(3, 12);
      if (gcd(c, d) < 2 && gcd(a - c, d) < 2) continue;
      const p = { a, c, d };
      if (pickI(p) < 1) continue;
      return p;
    }
  },
  render(p) {
    const corners = `$(0, 0)$, $(${p.a}, 0)$ and $(${p.c}, ${p.d})$`;
    const area = pickArea(p);
    const B = pickB(p);
    const I = pickI(p);
    const naiveB = p.c === 0 ? p.a + p.d + 1 : p.a + 2;
    const naiveI = area - naiveB / 2 + 1;
    const slips = [p.a * p.d, naiveB, naiveI, B + 1, I + 1].filter((v) => Number.isInteger(v));
    return {
      kind: 'table',
      prompt: [
        say(`A triangle has corners ${corners}. Let $B$ be the number of points with whole-number coordinates on its edges, and $I$ the number strictly inside it.`),
        { kind: 'diagram', svg: pickSvg(p) },
        say('Fill in its area, $B$ and $I$.'),
      ],
      columns: ['\\text{quantity}', '\\text{value}'],
      rows: [
        ['\\text{area}', null],
        ['B', null],
        ['I', null],
      ],
      bank: numberBank([area, B, I], slips, 3, 1, 0),
      answer: [num(area), num(B), num(I)],
    };
  },
  solution(p) {
    const area = pickArea(p);
    const B = pickB(p);
    const g1 = gcd(p.c, p.d);
    const g2 = gcd(Math.abs(p.a - p.c), p.d);
    const steps: SolutionStep[] = [
      { text: `The base is ${p.a} and the height ${p.d}:` },
      { tex: `\\text{area} = \\tfrac{1}{2} \\times ${p.a} \\times ${p.d} = ${num(area)}` },
      { text: 'A side going $m$ across and $n$ up is made of $\\gcd(m, n)$ equal whole steps, so it has that many lattice points, counting one end only. Round the three sides:' },
      { tex: `B = ${p.a} + ${g1} + ${g2} = ${B}` },
      { text: 'Pick’s theorem says $\\text{area} = I + \\tfrac{B}{2} - 1$, so' },
      { tex: `I = ${num(area)} - ${num(B / 2)} + 1 = ${num(pickI(p))}` },
    ];
    return steps;
  },
};

/* ---------- a distance to a line: the area worked out twice ---------- */

interface LineDistParams {
  /** The line is v x + u y = c, where (u, v, h) is a Pythagorean triple. */
  u: number;
  v: number;
  h: number;
  c1: number;
  /** Difficulty 2: a second, parallel line. */
  c2: number | null;
}

const PRIMITIVE: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
];

const lineEq = (u: number, v: number, c: number) => `${v}x + ${u}y = ${c}`;

const cmAgLineDistance: Generator<LineDistParams> = {
  id: 'cm-ag-line-distance',
  sample(rng, difficulty) {
    const [u, v, h] = rng.pick(PRIMITIVE);
    if (difficulty < 2) return { u, v, h, c1: rng.int(1, 6) * u * v, c2: null };
    for (;;) {
      const c1 = rng.int(-30, 40);
      const c2 = c1 + rng.sign() * h * rng.int(1, 8);
      if (c1 === 0 || c2 === 0 || Math.abs(c2) > 90) continue;
      return { u, v, h, c1, c2 };
    }
  },
  render(p) {
    if (p.c2 !== null) {
      return typed(
        [say('How far apart are these two parallel lines?'), show(`${lineEq(p.u, p.v, p.c1)}, \\qquad ${lineEq(p.u, p.v, p.c2)}`)],
        Math.abs(p.c1 - p.c2) / p.h,
        '\\text{distance} =',
      );
    }
    const k = p.c1 / (p.u * p.v);
    return typed(
      [say('How far is the origin from this line?'), show(lineEq(p.u, p.v, p.c1))],
      fracAnswer(k * p.u * p.v, p.h),
      '\\text{distance} =',
      FRACTION_KEYS,
    );
  },
  choices(p) {
    if (p.c2 !== null) {
      const w = Math.abs(p.c1 - p.c2) / p.h;
      const sideSlip = Math.abs(Math.abs(p.c1) - Math.abs(p.c2)) / p.h;
      return numberOptions(w, [Math.abs(p.c1 - p.c2), sideSlip, Math.abs(p.c1 + p.c2) / p.h, w + 1], 1, 1);
    }
    const k = p.c1 / (p.u * p.v);
    return fracOptions(
      [k * p.u * p.v, p.h],
      [
        // Forgetting to double the area, doubling it twice, and half the long side.
        [k * p.u * p.v, 2 * p.h],
        [2 * k * p.u * p.v, p.h],
        [k * p.h, 2],
        [k * (p.u + p.v), 2],
      ],
    );
  },
  solution(p) {
    if (p.c2 !== null) {
      const diff = Math.abs(p.c1 - p.c2);
      return [
        { text: `The origin is $\\frac{|c|}{\\sqrt{a^2 + b^2}}$ from the line $ax + by = c$, and the two lines share $a = ${p.v}$ and $b = ${p.u}$:` },
        { tex: `\\sqrt{${p.v}^2 + ${p.u}^2} = ${p.h}` },
        { text: 'Moving from one line to the other changes the right-hand side by' },
        { tex: `|${p.c1} - ${br(p.c2)}| = ${diff}` },
        { tex: `\\text{distance} = \\frac{${diff}}{${p.h}} = ${diff / p.h}` },
        { text: p.c1 * p.c2 < 0 ? 'The right-hand sides have opposite signs, so the lines are on opposite sides of the origin and the two distances add.' : 'The right-hand sides have the same sign, so the lines are on the same side of the origin and the distances subtract.' },
      ];
    }
    const k = p.c1 / (p.u * p.v);
    const X = k * p.u;
    const Y = k * p.v;
    return [
      { text: `The line meets the axes at $(${X}, 0)$ and $(0, ${Y})$. With the origin they make a right triangle of area` },
      { tex: `\\tfrac{1}{2} \\times ${X} \\times ${Y} = ${num((X * Y) / 2)}` },
      { text: 'Its long side is' },
      { tex: `\\sqrt{${X}^2 + ${Y}^2} = ${k * p.h}` },
      { text: 'The distance $d$ from the origin is the height onto that side, so the area is also $\\tfrac{1}{2} \\times$ that side $\\times\\, d$:' },
      { tex: `d = \\frac{${X * Y}}{${k * p.h}} = ${fracTex(k * p.u * p.v, p.h)}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Conics
 * ================================================================ */

/* ---------- an ellipse: the distances to the foci add to 2a ---------- */

interface EllipseParams {
  a: number;
  b: number;
  c: number;
  /** The long axis is the y-axis. */
  tall: boolean;
  /** PF1, or null for the difficulty 2 perimeter question. */
  d: number | null;
}

// (b, c, a). The short axis is at least half the long one: a flatter
// ellipse puts its foci almost on the curve, and their labels on the line.
const ELLIPSE_TRIPLES: [number, number, number][] = [
  ...TRIPLES.filter(([b, , a]) => b / a >= 0.5),
  [24, 7, 25],
  [24, 10, 26],
  [20, 21, 29],
  [21, 20, 29],
  [12, 16, 20],
  [16, 12, 20],
  [15, 20, 25],
  [20, 15, 25],
];

function ellipseEq({ a, b, tall }: EllipseParams): string {
  const [under, over] = tall ? [b * b, a * a] : [a * a, b * b];
  return `\\frac{x^2}{${under}} + \\frac{y^2}{${over}} = 1`;
}

function ellipseSvg(p: EllipseParams): string {
  const { a, b, c, tall } = p;
  const s = tall ? Math.min(125 / b, 110 / a) : 125 / a;
  const rx = (tall ? b : a) * s;
  const ry = (tall ? a : b) * s;
  const cx = 150;
  const cy = 22 + ry;
  // t along the long axis (towards F2), w across it.
  const at = (t: number, w: number): P2 => (tall ? [cx + w * s, cy - t * s] : [cx + t * s, cy - w * s]);
  const t = p.d === null ? 0.35 * a : ((p.d - a) * a) / c;
  const w = b * Math.sqrt(1 - (t * t) / (a * a));
  const F1 = at(-c, 0);
  const F2 = at(c, 0);
  const P = at(t, w);
  const parts = [
    `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="none" stroke="currentColor" stroke-width="2" />`,
    tall ? thin([cx, cy - ry - 8], [cx, cy + ry + 8]) : thin([cx - rx - 8, cy], [cx + rx + 8, cy]),
  ];
  if (p.d === null) parts.push(shade([P, F1, F2]), outline([P, F1, F2]));
  else parts.push(seg(P, F1), seg(P, F2), sideLabel(P, F1, `${p.d}`, F2), sideLabel(P, F2, '?', F1));
  parts.push(dot(F1), dot(F2), dot(P));
  if (tall) parts.push(txt(F1[0] - 10, F1[1], 'F₁', 'end'), txt(F2[0] - 10, F2[1], 'F₂', 'end'));
  else parts.push(txt(F1[0], F1[1] + 15, 'F₁'), txt(F2[0], F2[1] + 15, 'F₂'));
  const out = at(t * 1.12, w * 1.12 + 2);
  const len = Math.hypot(out[0] - P[0], out[1] - P[1]) || 1;
  parts.push(txt(P[0] + ((out[0] - P[0]) / len) * 13, P[1] + ((out[1] - P[1]) / len) * 13, 'P'));
  return svg(cy + ry + 26, 'An ellipse with its foci F1 and F2 and a point P on it', parts);
}

const cmAgEllipse: Generator<EllipseParams> = {
  id: 'cm-ag-ellipse',
  sample(rng, difficulty) {
    for (;;) {
      const [b, c, a] = rng.pick(ELLIPSE_TRIPLES);
      const tall = rng.chance(0.5);
      if (difficulty >= 2) return { a, b, c, tall, d: null };
      const d = rng.int(a - c + 1, a + c - 1);
      // Keep P clear of the ends of the long axis, so the figure reads.
      if (d === a || Math.abs(d - a) > 0.7 * c) continue;
      return { a, b, c, tall, d };
    }
  },
  render(p) {
    const figure = { kind: 'diagram' as const, svg: ellipseSvg(p) };
    if (p.d === null) {
      return typed(
        [say('$F_1$ and $F_2$ are the foci of this ellipse, and $P$ is a point on it, off the line through the foci.'), show(ellipseEq(p)), figure, say('What is the perimeter of triangle $PF_1F_2$?')],
        2 * p.a + 2 * p.c,
        '\\text{perimeter} =',
      );
    }
    return typed(
      [say(`$F_1$ and $F_2$ are the foci of this ellipse. A point $P$ on it is ${p.d} from $F_1$.`), show(ellipseEq(p)), figure, say('How far is $P$ from $F_2$?')],
      2 * p.a - p.d,
      'PF_2 =',
    );
  },
  choices(p) {
    if (p.d === null) return numberOptions(2 * p.a + 2 * p.c, [2 * p.a, 2 * p.a + p.c, 2 * p.a + 2 * p.b, 2 * p.b + 2 * p.c], 1, 1);
    return numberOptions(2 * p.a - p.d, [p.d, 2 * p.b - p.d, p.a, 2 * p.c - p.d], 1, 1);
  },
  solution(p) {
    const axis = p.tall ? 'y' : 'x';
    const steps: SolutionStep[] = [
      { text: `The larger denominator, ${p.a * p.a}, is under $${axis}^2$, so the long axis and the foci are on the $${axis}$-axis, and` },
      { tex: `a = \\sqrt{${p.a * p.a}} = ${p.a}` },
      { text: 'From any point on an ellipse, the distances to the two foci add to the length of the long axis, $2a$:' },
      { tex: `PF_1 + PF_2 = ${2 * p.a}` },
    ];
    if (p.d !== null) {
      steps.push({ tex: `PF_2 = ${2 * p.a} - ${p.d} = ${2 * p.a - p.d}` });
      return steps;
    }
    steps.push(
      { text: 'Each focus is $c$ from the centre, where $c^2 = a^2 - b^2$:' },
      { tex: `c = \\sqrt{${p.a * p.a} - ${p.b * p.b}} = ${p.c}` },
      { tex: `F_1F_2 = 2 \\times ${p.c} = ${2 * p.c}` },
      { tex: `\\text{perimeter} = ${2 * p.a} + ${2 * p.c} = ${2 * p.a + 2 * p.c}` },
      { text: 'Wherever $P$ is on the ellipse, the perimeter is the same.' },
    );
    return steps;
  },
};

/* ---------- a circle's centre and radius, as tiles ---------- */

interface CircleParams {
  h: number;
  k: number;
  r: number;
  /** Difficulty 2 multiplies the whole equation through by this. */
  m: number;
}

function circleEq({ h, k, r, m }: CircleParams): string {
  const lead = m === 1 ? '' : `${m}`;
  return `${lead}x^2 + ${lead}y^2${term(-2 * h * m, 'x')}${term(-2 * k * m, 'y')}${term(m * (h * h + k * k - r * r))} = 0`;
}

/** `(x - 3)^2`, `(y + 2)^2`. */
const shifted = (v: string, c: number) => `(${v}${term(-c)})^2`;

const cmAgCircleCentre: Generator<CircleParams> = {
  id: 'cm-ag-circle-centre',
  sample(rng, difficulty) {
    for (;;) {
      const h = rng.int(1, 8) * rng.sign();
      const k = rng.int(1, 8) * rng.sign();
      const r = rng.int(2, 9);
      if (Math.abs(h) === Math.abs(k) || r === Math.abs(h) || r === Math.abs(k)) continue;
      if (h * h + k * k === r * r) continue;
      return { h, k, r, m: difficulty >= 2 ? rng.int(2, 3) : 1 };
    }
  },
  render(p) {
    return {
      kind: 'tiles',
      prompt: [say('Find the centre and the radius of this circle.'), show(circleEq(p))],
      template: '\\text{centre} = ({0}, {1}), \\quad r = {2}',
      bank: numberBank([p.h, p.k, p.r], [-p.h, -p.k, p.r * p.r, 2 * p.h, 2 * p.k], 3, 1, -Infinity),
      answer: [num(p.h), num(p.k), num(p.r)],
    };
  },
  solution(p) {
    const { h, k, r, m } = p;
    const F = h * h + k * k - r * r;
    const steps: SolutionStep[] = [];
    if (m > 1) steps.push({ text: `Divide through by ${m} first, so $x^2$ and $y^2$ each have a coefficient of 1:` }, { tex: circleEq({ ...p, m: 1 }) });
    steps.push(
      { text: 'Group the $x$ terms and the $y$ terms, with the number on the right:' },
      { tex: `(x^2${term(-2 * h, 'x')}) + (y^2${term(-2 * k, 'y')}) = ${-F}` },
      { text: `Complete each square, adding ${h * h} and ${k * k} to both sides:` },
      { tex: `${shifted('x', h)} + ${shifted('y', k)} = ${-F} + ${h * h} + ${k * k}` },
      { tex: `${shifted('x', h)} + ${shifted('y', k)} = ${r * r}` },
      { text: `So the centre is $${pt(h, k)}$, with the signs turned round from the brackets, and the radius is $\\sqrt{${r * r}} = ${r}$.` },
    );
    return steps;
  },
};

/* ---------- where a circle crosses an axis: the roots' difference ---------- */

interface ChordParams {
  /** The centre's coordinate along the axis that is crossed. */
  h: number;
  /** Its (signed) distance from that axis. */
  k: number;
  /** Half the chord, with (s, |k|, r) a Pythagorean triple. */
  s: number;
  r: number;
  axis: 'x' | 'y';
}

function chordCoefs({ h, k, s, axis }: ChordParams): { D: number; E: number; F: number } {
  const F = h * h - s * s;
  return axis === 'x' ? { D: -2 * h, E: -2 * k, F } : { D: -2 * k, E: -2 * h, F };
}

const chordEq = (p: ChordParams) => {
  const { D, E, F } = chordCoefs(p);
  return `x^2 + y^2${term(D, 'x')}${term(E, 'y')}${term(F)} = 0`;
};

const cmAgCircleChord: Generator<ChordParams> = {
  id: 'cm-ag-circle-chord',
  sample(rng, difficulty) {
    const [s, k, r] = rng.pick(TRIPLES);
    return { h: rng.int(-5, 5), k: k * rng.sign(), s, r, axis: difficulty >= 2 ? 'y' : 'x' };
  },
  render(p) {
    return typed(
      [say(`This circle crosses the $${p.axis}$-axis at two points.`), show(chordEq(p)), say('How far apart are they?')],
      2 * p.s,
      '\\text{distance} =',
    );
  },
  choices(p) {
    const { F } = chordCoefs(p);
    return numberOptions(2 * p.s, [2 * p.r, p.s, p.r, Math.abs(F)], 1, 1);
  },
  solution(p) {
    const other = p.axis === 'x' ? 'y' : 'x';
    const v = p.axis;
    const { D, E, F } = chordCoefs(p);
    const lin = p.axis === 'x' ? D : E;
    return [
      { text: `On the $${v}$-axis, $${other} = 0$, which leaves` },
      { tex: `${v}^2${term(lin, v)}${term(F)} = 0` },
      { text: `Its two roots are where the circle crosses. They add to ${-lin} and multiply to ${F}, so` },
      { tex: `(${v}_1 - ${v}_2)^2 = (${v}_1 + ${v}_2)^2 - 4${v}_1${v}_2` },
      { tex: `(${v}_1 - ${v}_2)^2 = ${sq(-lin)} - 4 \\times ${br(F)} = ${4 * p.s * p.s}` },
      { tex: `${v}_1 - ${v}_2 = ${2 * p.s}` },
      { text: `There is no need to find the centre or the radius: the crossings are $${p.h - p.s}$ and $${p.h + p.s}$, and the diameter ${2 * p.r} is the trap.` },
    ];
  },
};

/* ---------- a parabola: as far from the focus as from the directrix ---------- */

interface ParabolaParams {
  p: number;
  /** Difficulty 1: the coordinate along the axis. Difficulty 2: t, with the point at (p t^2, 2 p t). */
  n: number;
  /** x^2 = 4py rather than y^2 = 4px. */
  up: boolean;
  findCross: boolean;
}

const parabolaEq = ({ p, up }: ParabolaParams) => (up ? `x^2 = ${4 * p}y` : `y^2 = ${4 * p}x`);

const cmAgParabola: Generator<ParabolaParams> = {
  id: 'cm-ag-parabola',
  sample(rng, difficulty) {
    const p = rng.int(1, 6);
    if (difficulty >= 2) return { p, n: rng.int(1, 5), up: rng.chance(0.5), findCross: true };
    return { p, n: rng.int(1, 15), up: rng.chance(0.5), findCross: false };
  },
  render(q) {
    const [along, across] = q.up ? ['y', 'x'] : ['x', 'y'];
    if (q.findCross) {
      const d = q.p * (q.n * q.n + 1);
      const side = q.up ? 'right of the $y$-axis' : 'above the $x$-axis';
      return typed(
        [say(`A point $P$ on this parabola is ${side}, and ${d} from the focus.`), show(parabolaEq(q)), say(`Find the $${across}$-coordinate of $P$.`)],
        2 * q.p * q.n,
        `${across} =`,
      );
    }
    return typed(
      [say(`$P$ is the point on this parabola with $${along} = ${q.n}$ ${q.up ? 'and $x > 0$' : 'and $y > 0$'}.`), show(parabolaEq(q)), say('How far is $P$ from the focus?')],
      q.n + q.p,
      '\\text{distance} =',
    );
  },
  choices(q) {
    if (q.findCross) {
      const d = q.p * (q.n * q.n + 1);
      const y = 2 * q.p * q.n;
      const root = Math.sqrt(4 * q.p * d);
      return numberOptions(y, [d, d - q.p, Number.isInteger(root) ? root : y + 2, y + q.p], 1, 1);
    }
    return numberOptions(q.n + q.p, [q.n, q.n + 4 * q.p, q.n + 2 * q.p, q.n - q.p], 1, 1);
  },
  solution(q) {
    const [along, across] = q.up ? ['y', 'x'] : ['x', 'y'];
    const steps: SolutionStep[] = [
      { text: `Compare with $${across}^2 = 4p${along}$:` },
      { tex: `4p = ${4 * q.p}` },
      { tex: `p = ${q.p}` },
      { text: `So the focus is ${q.p} along the $${along}$-axis from the origin, and the directrix is the line $${along} = -${q.p}$. Every point of a parabola is as far from the focus as from the directrix, and that distance is $${along} + ${q.p}$.` },
    ];
    if (!q.findCross) {
      steps.push({ tex: `${q.n} + ${q.p} = ${q.n + q.p}` });
      return steps;
    }
    const d = q.p * (q.n * q.n + 1);
    const x = q.p * q.n * q.n;
    steps.push(
      { tex: `${along} + ${q.p} = ${d}` },
      { tex: `${along} = ${x}` },
      { text: 'Put that into the equation of the parabola:' },
      { tex: `${across}^2 = ${4 * q.p} \\times ${x} = ${4 * q.p * x}` },
      { tex: `${across} = ${2 * q.p * q.n}` },
    );
    return steps;
  },
};

/* ================================================================
 * Lesson 3: Mass Points
 * ================================================================ */

const TA: P2 = [150, 24];
const TB: P2 = [36, 192];
const TC: P2 = [264, 192];

const cornerLabels = () => [txt(TA[0], TA[1] - 13, 'A'), txt(TB[0] - 9, TB[1] + 6, 'B', 'end'), txt(TC[0] + 9, TC[1] + 6, 'C', 'start')];

/** Two whole parts whose larger is at most three times the smaller. */
function parts(rng: { int(min: number, max: number): number }, top: number): Frac {
  for (;;) {
    const x = rng.int(1, top);
    const y = rng.int(1, top);
    if (gcd(x, y) !== 1 || Math.max(x, y) > 3 * Math.min(x, y)) continue;
    return [x, y];
  }
}

/* ---------- two cevians: AP : PD from the masses ---------- */

interface CevianParams {
  /** BD : DC = m : n and AE : EC = p : q. */
  m: number;
  n: number;
  p: number;
  q: number;
  /** Difficulty 2 asks BP : PE instead of AP : PD. */
  askB: boolean;
}

/** Masses with C = m p: B = n p, A = m q. */
const cevMasses = ({ m, n, p, q }: CevianParams) => ({ A: m * q, B: n * p, C: m * p, D: n * p + m * p, E: m * q + m * p });

const cevRatio = (c: CevianParams): Frac => {
  const w = cevMasses(c);
  return c.askB ? lowest(w.E, w.B) : lowest(w.D, w.A);
};

function cevianSvg({ m, n, p, q }: CevianParams): string {
  const D = lerp(TB, TC, m / (m + n));
  const E = lerp(TA, TC, p / (p + q));
  const P = meet(TA, D, TB, E);
  return svg(222, 'Triangle ABC with D on BC, E on AC, and AD crossing BE at P', [
    outline([TA, TB, TC]),
    seg(TA, D),
    seg(TB, E),
    dot(D),
    dot(E),
    dot(P),
    ...cornerLabels(),
    txt(D[0], D[1] + 15, 'D'),
    pointLabel(E, [TA, TC, TB], 'E'),
    pointLabel(P, [TA, D, TB, E], 'P'),
    sideLabel(TB, D, `${m}`, TA, 15),
    sideLabel(D, TC, `${n}`, TA, 15),
    sideLabel(TA, E, `${p}`, TB),
    sideLabel(E, TC, `${q}`, TB),
  ]);
}

const cevianGiven = ({ m, n, p, q }: CevianParams) =>
  `In triangle $ABC$, $D$ is on $BC$ with $BD : DC = ${m} : ${n}$, and $E$ is on $AC$ with $AE : EC = ${p} : ${q}$. $AD$ and $BE$ cross at $P$.`;

function sampleCevians(rng: { int(min: number, max: number): number }, askB: boolean): CevianParams {
  for (;;) {
    const [m, n] = parts(rng, 5);
    const [p, q] = parts(rng, 5);
    if (m === n && p === q) continue;
    return { m, n, p, q, askB };
  }
}

const cmAgMassCevians: Generator<CevianParams> = {
  id: 'cm-ag-mass-cevians',
  sample(rng, difficulty) {
    return sampleCevians(rng, difficulty >= 2);
  },
  render(c) {
    const [x, y] = cevRatio(c);
    return typed(
      [say(cevianGiven(c)), { kind: 'diagram', svg: cevianSvg(c) }, say(c.askB ? 'Find $\\dfrac{BP}{PE}$.' : 'Find $\\dfrac{AP}{PD}$.')],
      fracAnswer(x, y),
      c.askB ? '\\frac{BP}{PE} =' : '\\frac{AP}{PD} =',
      FRACTION_KEYS,
    );
  },
  choices(c) {
    const w = cevMasses(c);
    const [x, y] = cevRatio(c);
    const slips: Frac[] = c.askB
      ? [
          [y, x],
          [w.E, w.A],
          [c.q + c.p, c.p],
          [c.m + c.n, c.n],
        ]
      : [
          [y, x],
          [w.D, w.B],
          [c.m + c.n, c.m],
          [c.p + c.q, c.q],
        ];
    return fracOptions([x, y], slips);
  },
  solution(c) {
    const w = cevMasses(c);
    const [x, y] = cevRatio(c);
    const steps: SolutionStep[] = [
      { text: `Hang masses on the corners so each cevian's foot is a balance point: mass times distance is the same on both sides. Start with $C$ at ${w.C}.` },
      { text: `$BD : DC = ${c.m} : ${c.n}$, so $B$ needs mass $${w.C} \\times ${massFrac(c.n, c.m)}$:` },
      { tex: `m_B = ${w.B}` },
      { text: `$AE : EC = ${c.p} : ${c.q}$, so $A$ needs mass $${w.C} \\times ${massFrac(c.q, c.p)}$:` },
      { tex: `m_A = ${w.A}` },
    ];
    if (c.askB) {
      steps.push(
        { text: '$E$ carries the masses at $A$ and $C$:' },
        { tex: `m_E = ${w.A} + ${w.C} = ${w.E}` },
        { text: '$P$ balances $B$ against $E$, so the lengths go the other way round from the masses:' },
        { tex: `BP : PE = ${w.E} : ${w.B}` },
      );
    } else {
      steps.push(
        { text: '$D$ carries the masses at $B$ and $C$:' },
        { tex: `m_D = ${w.B} + ${w.C} = ${w.D}` },
        { text: '$P$ balances $A$ against $D$, so the lengths go the other way round from the masses:' },
        { tex: `AP : PD = ${w.D} : ${w.A}` },
      );
    }
    steps.push({ tex: `${c.askB ? '\\frac{BP}{PE}' : '\\frac{AP}{PD}'} = ${fracTex(x, y)}` });
    return steps;
  },
};

/* ---------- the same masses, filled in a table ---------- */

const cmAgMassTable: Generator<CevianParams> = {
  id: 'cm-ag-mass-table',
  sample(rng, difficulty) {
    for (;;) {
      const [m, n] = parts(rng, difficulty >= 2 ? 7 : 4);
      const [p, q] = parts(rng, difficulty >= 2 ? 7 : 4);
      const c = { m, n, p, q, askB: false };
      const w = cevMasses(c);
      if (new Set([w.A, w.B, w.D, w.E]).size < 4) continue;
      return c;
    }
  },
  render(c) {
    const w = cevMasses(c);
    const slips = [(w.C * c.m) / c.n, (w.C * c.p) / c.q, w.A + w.B, w.C * 2, w.D + w.A].filter((v) => Number.isInteger(v) && v > 0);
    return {
      kind: 'table',
      prompt: [
        say(cevianGiven(c)),
        { kind: 'diagram', svg: cevianSvg(c) },
        say(`Put a mass of ${w.C} at $C$. Fill in the masses at $B$ and $A$ that balance at $D$ and at $E$, and the masses $D$ and $E$ carry.`),
      ],
      columns: ['\\text{point}', '\\text{mass}'],
      rows: [
        ['C', `${w.C}`],
        ['B', null],
        ['A', null],
        ['D', null],
        ['E', null],
      ],
      bank: numberBank([w.B, w.A, w.D, w.E], slips, 3, 1, 1),
      answer: [w.B, w.A, w.D, w.E].map(num),
    };
  },
  solution(c) {
    const w = cevMasses(c);
    return [
      { text: `Mass times distance balances on each side, so the heavier mass sits at the nearer end. $BD : DC = ${c.m} : ${c.n}$:` },
      { tex: `m_B = ${w.C} \\times ${massFrac(c.n, c.m)} = ${w.B}` },
      { text: `$AE : EC = ${c.p} : ${c.q}$:` },
      { tex: `m_A = ${w.C} \\times ${massFrac(c.q, c.p)} = ${w.A}` },
      { text: 'A balance point carries the masses at both ends:' },
      { tex: `m_D = ${w.B} + ${w.C} = ${w.D}` },
      { tex: `m_E = ${w.A} + ${w.C} = ${w.E}` },
      { text: `So $AP : PD = ${ratioTex(w.D, w.A)}$ and $BP : PE = ${ratioTex(w.E, w.B)}$.` },
    ];
  },
};

/* ---------- working back from AP : PD to AE : EC ---------- */

interface ReverseParams {
  /** BD : DC = m : n and AP : PD = r : s. */
  m: number;
  n: number;
  r: number;
  s: number;
  /** Difficulty 2 asks BP : PE. */
  askB: boolean;
}

/** Masses with B = n r, C = m r, so D = (m + n) r and A = (m + n) s. */
const revMasses = ({ m, n, r, s }: ReverseParams) => ({ A: (m + n) * s, B: n * r, C: m * r, D: (m + n) * r, E: (m + n) * s + m * r });

const revRatio = (c: ReverseParams): Frac => {
  const w = revMasses(c);
  return c.askB ? lowest(w.E, w.B) : lowest(w.C, w.A);
};

function reverseSvg({ m, n, r, s }: ReverseParams): string {
  const D = lerp(TB, TC, m / (m + n));
  const P = lerp(TA, D, r / (r + s));
  const E = meet(TB, P, TA, TC);
  return svg(222, 'Triangle ABC with D on BC, P on AD, and BP extended to E on AC', [
    outline([TA, TB, TC]),
    seg(TA, D),
    seg(TB, E),
    dot(D),
    dot(E),
    dot(P),
    ...cornerLabels(),
    txt(D[0], D[1] + 15, 'D'),
    pointLabel(E, [TA, TC, TB], 'E'),
    pointLabel(P, [TA, D, TB, E], 'P'),
    sideLabel(TB, D, `${m}`, TA, 15),
    sideLabel(D, TC, `${n}`, TA, 15),
    sideLabel(TA, P, `${r}`, TC, 11),
    sideLabel(P, D, `${s}`, TB, 11),
  ]);
}

const cmAgMassReverse: Generator<ReverseParams> = {
  id: 'cm-ag-mass-reverse',
  sample(rng, difficulty) {
    for (;;) {
      const [m, n] = parts(rng, 5);
      const [r, s] = parts(rng, 5);
      if (m === n && r === s) continue;
      const c = { m, n, r, s, askB: difficulty >= 2 };
      // Keep E clear of the corners so the figure reads.
      const [x, y] = lowest(revMasses(c).C, revMasses(c).A);
      if (Math.max(x, y) > 5 * Math.min(x, y)) continue;
      return c;
    }
  },
  render(c) {
    const [x, y] = revRatio(c);
    return typed(
      [
        say(`In triangle $ABC$, $D$ is on $BC$ with $BD : DC = ${c.m} : ${c.n}$, and $P$ is on $AD$ with $AP : PD = ${c.r} : ${c.s}$. $BP$ is extended to meet $AC$ at $E$.`),
        { kind: 'diagram', svg: reverseSvg(c) },
        say(c.askB ? 'Find $\\dfrac{BP}{PE}$.' : 'Find $\\dfrac{AE}{EC}$.'),
      ],
      fracAnswer(x, y),
      c.askB ? '\\frac{BP}{PE} =' : '\\frac{AE}{EC} =',
      FRACTION_KEYS,
    );
  },
  choices(c) {
    const w = revMasses(c);
    const [x, y] = revRatio(c);
    const slips: Frac[] = c.askB
      ? [
          [y, x],
          [w.E, w.C],
          [c.r + c.s, c.s],
          [w.D, w.B],
        ]
      : [
          [y, x],
          [c.r, c.s],
          [c.m, c.n],
          [w.B, w.A],
        ];
    return fracOptions([x, y], slips);
  },
  solution(c) {
    const w = revMasses(c);
    const [x, y] = revRatio(c);
    const steps: SolutionStep[] = [
      { text: `Balance $BC$ at $D$ first. $BD : DC = ${c.m} : ${c.n}$, so masses of ${w.B} at $B$ and ${w.C} at $C$ will do, and` },
      { tex: `m_D = ${w.B} + ${w.C} = ${w.D}` },
      { text: `$P$ balances $A$ against $D$ with $AP : PD = ${c.r} : ${c.s}$, so $A$ needs mass $${w.D} \\times ${massFrac(c.s, c.r)}$:` },
      { tex: `m_A = ${w.A}` },
    ];
    if (c.askB) {
      steps.push(
        { text: '$E$ is the balance point of $A$ and $C$, so it carries both:' },
        { tex: `m_E = ${w.A} + ${w.C} = ${w.E}` },
        { tex: `BP : PE = ${w.E} : ${w.B}` },
        { tex: `\\frac{BP}{PE} = ${fracTex(x, y)}` },
      );
    } else {
      steps.push(
        { text: '$E$ is the balance point of $A$ and $C$, and the lengths go the other way round from the masses:' },
        { tex: `AE : EC = ${w.C} : ${w.A}` },
        { tex: `\\frac{AE}{EC} = ${fracTex(x, y)}` },
      );
    }
    return steps;
  },
};

/* ---------- three cevians through one point: the third ratio, as tiles ---------- */

interface CevaParams {
  /** BD : DC = m : n, and either AE : EC = p : q (asking AF : FB) or AF : FB = p : q (asking AE : EC). */
  m: number;
  n: number;
  p: number;
  q: number;
  askE: boolean;
}

/** The ratio asked, in lowest terms. */
function cevaRatio({ m, n, p, q, askE }: CevaParams): Frac {
  // Masses: B : C = n : m. Asking F: A : C = q : p, so with C = m p, B = n p and A = m q; AF : FB = B : A.
  // Asking E: A : B = q : p, so with B = n p, C = m p and A = n q; AE : EC = C : A.
  return askE ? lowest(m * p, n * q) : lowest(n * p, m * q);
}

function cevaSvg(c: CevaParams): string {
  const [x, y] = cevaRatio(c);
  const D = lerp(TB, TC, c.m / (c.m + c.n));
  const [ae, ec] = c.askE ? [x, y] : [c.p, c.q];
  const [af, fb] = c.askE ? [c.p, c.q] : [x, y];
  const E = lerp(TA, TC, ae / (ae + ec));
  const F = lerp(TA, TB, af / (af + fb));
  const labels = c.askE ? [sideLabel(TA, F, `${c.p}`, TC), sideLabel(F, TB, `${c.q}`, TC)] : [sideLabel(TA, E, `${c.p}`, TB), sideLabel(E, TC, `${c.q}`, TB)];
  return svg(222, 'Triangle ABC with cevians AD, BE and CF meeting at one point', [
    outline([TA, TB, TC]),
    seg(TA, D),
    seg(TB, E),
    seg(TC, F),
    dot(D),
    dot(E),
    dot(F),
    ...cornerLabels(),
    txt(D[0], D[1] + 15, 'D'),
    pointLabel(E, [TA, TC, TB], 'E'),
    pointLabel(F, [TA, TB, TC], 'F'),
    sideLabel(TB, D, `${c.m}`, TA, 15),
    sideLabel(D, TC, `${c.n}`, TA, 15),
    ...labels,
  ]);
}

const cmAgMassCeva: Generator<CevaParams> = {
  id: 'cm-ag-mass-ceva',
  sample(rng, difficulty) {
    for (;;) {
      const [m, n] = parts(rng, 5);
      const [p, q] = parts(rng, 5);
      const c = { m, n, p, q, askE: difficulty >= 2 };
      const [x, y] = cevaRatio(c);
      if (x === y || Math.max(x, y) > 4 * Math.min(x, y)) continue;
      return c;
    }
  },
  render(c) {
    const [x, y] = cevaRatio(c);
    const given = c.askE ? `$AF : FB = ${c.p} : ${c.q}$` : `$AE : EC = ${c.p} : ${c.q}$`;
    const slips = [c.m + c.n, c.p + c.q, c.m * c.p, c.n * c.q, x + y].filter((v) => v !== x && v !== y);
    return {
      kind: 'tiles',
      prompt: [
        say(`In triangle $ABC$, the lines $AD$, $BE$ and $CF$ meet at one point, with $D$, $E$ and $F$ on $BC$, $CA$ and $AB$. $BD : DC = ${c.m} : ${c.n}$ and ${given}.`),
        { kind: 'diagram', svg: cevaSvg(c) },
        say('Give the third ratio in its simplest form.'),
      ],
      template: c.askE ? 'AE : EC = {0} : {1}' : 'AF : FB = {0} : {1}',
      bank: numberBank([x, y], slips, 2, 1, 1),
      answer: [num(x), num(y)],
    };
  },
  solution(c) {
    if (c.askE) {
      const B = c.n * c.p;
      const C = c.m * c.p;
      const A = c.n * c.q;
      return [
        { text: `$BD : DC = ${c.m} : ${c.n}$, so masses of ${B} at $B$ and ${C} at $C$ balance at $D$.` },
        { text: `$AF : FB = ${c.p} : ${c.q}$, so $A$ needs mass $${B} \\times ${massFrac(c.q, c.p)}$:` },
        { tex: `m_A = ${A}` },
        { text: 'All three cevians pass through the balance point of the whole triangle, so $E$ balances $A$ against $C$:' },
        { tex: `AE : EC = ${ratioTex(C, A)}` },
      ];
    }
    const C = c.m * c.p;
    const B = c.n * c.p;
    const A = c.m * c.q;
    return [
      { text: `$BD : DC = ${c.m} : ${c.n}$, so masses of ${B} at $B$ and ${C} at $C$ balance at $D$.` },
      { text: `$AE : EC = ${c.p} : ${c.q}$, so $A$ needs mass $${C} \\times ${massFrac(c.q, c.p)}$:` },
      { tex: `m_A = ${A}` },
      { text: 'All three cevians pass through the balance point of the whole triangle, so $F$ balances $A$ against $B$:' },
      { tex: `AF : FB = ${ratioTex(B, A)}` },
    ];
  },
};

/* ================================================================
 * Lesson 4: Complex Number Geometry
 * ================================================================ */

/* ---------- turning by 90 degrees is multiplying by i, as a plot ---------- */

interface RotateParams {
  z: P2;
  w: P2;
  /** +1 anticlockwise, -1 clockwise. */
  dir: number;
  /** Difficulty 2: z and w are A and B of a square ABCD, and C or D is asked. */
  square: 'C' | 'D' | null;
}

/** i times (x + yi), or -i times it. */
const turn = ([x, y]: P2, dir: number): P2 => (dir > 0 ? [-y, x] : [y, -x]);

function rotated({ z, w, dir, square }: RotateParams): P2 {
  if (square) {
    // A = z, B = w. D = A + i(B - A), C = B + i(B - A).
    const t = turn([w[0] - z[0], w[1] - z[1]], 1);
    const base = square === 'D' ? z : w;
    return [base[0] + t[0], base[1] + t[1]];
  }
  const t = turn([z[0] - w[0], z[1] - w[1]], dir);
  return [w[0] + t[0], w[1] + t[1]];
}

const onPlane = (q: P2) => Math.abs(q[0]) <= 5 && Math.abs(q[1]) <= 5;

const cmAgRotate: Generator<RotateParams> = {
  id: 'cm-ag-rotate',
  sample(rng, difficulty) {
    for (;;) {
      const z: P2 = [rng.int(-4, 4), rng.int(-4, 4)];
      const w: P2 = [rng.int(-4, 4), rng.int(-4, 4)];
      if (z[0] === w[0] && z[1] === w[1]) continue;
      if (difficulty >= 2) {
        if ((w[0] - z[0]) ** 2 + (w[1] - z[1]) ** 2 < 2) continue;
        const p = { z, w, dir: 1, square: rng.pick(['C', 'D'] as const) };
        const C = rotated({ ...p, square: 'C' });
        const D = rotated({ ...p, square: 'D' });
        if (!onPlane(C) || !onPlane(D)) continue;
        return p;
      }
      if (w[0] === 0 && w[1] === 0) continue;
      const p = { z, w, dir: rng.sign(), square: null };
      if (!onPlane(rotated(p))) continue;
      return p;
    }
  },
  render(p) {
    const answer = rotated(p);
    const prompt = p.square
      ? [
          say(`$ABCD$ is a square, its corners in that order anticlockwise, with $A = ${cTex(p.z[0], p.z[1])}$ and $B = ${cTex(p.w[0], p.w[1])}$.`),
          say(`Tap $${p.square}$.`),
        ]
      : [
          say(`Turn $z = ${cTex(p.z[0], p.z[1])}$ through $90^\\circ$ ${p.dir > 0 ? 'anticlockwise' : 'clockwise'} about $w = ${cTex(p.w[0], p.w[1])}$.`),
          say('Tap where it lands.'),
        ];
    return { kind: 'plot', prompt, range: 5, answer: { re: answer[0], im: answer[1] } };
  },
  solution(p) {
    const answer = rotated(p);
    if (p.square) {
      const side: P2 = [p.w[0] - p.z[0], p.w[1] - p.z[1]];
      const t = turn(side, 1);
      const base = p.square === 'D' ? p.z : p.w;
      return [
        { text: 'The side from $A$ to $B$ is' },
        { tex: `B - A = ${cTex(side[0], side[1])}` },
        { text: `Going round anticlockwise, the next side is that turned through $90^\\circ$ anticlockwise, which is multiplying by $i$:` },
        { tex: `i(${cTex(side[0], side[1])}) = ${cTex(t[0], t[1])}` },
        { text: p.square === 'D' ? '$AD$ is that side, starting from $A$:' : '$BC$ is that side, starting from $B$:' },
        { tex: `${p.square} = (${cTex(base[0], base[1])}) + (${cTex(t[0], t[1])}) = ${cTex(answer[0], answer[1])}` },
      ];
    }
    const rel: P2 = [p.z[0] - p.w[0], p.z[1] - p.w[1]];
    const t = turn(rel, p.dir);
    return [
      { text: 'Move $w$ to the origin, turn, and move back. From $w$ to $z$ is' },
      { tex: `z - w = ${cTex(rel[0], rel[1])}` },
      { text: `Turning $90^\\circ$ ${p.dir > 0 ? 'anticlockwise is multiplying by $i$' : 'clockwise is multiplying by $-i$'}:` },
      { tex: `${p.dir > 0 ? 'i' : '-i'}(${cTex(rel[0], rel[1])}) = ${cTex(t[0], t[1])}` },
      { tex: `(${cTex(t[0], t[1])}) + (${cTex(p.w[0], p.w[1])}) = ${cTex(answer[0], answer[1])}` },
    ];
  },
};

/* ---------- moduli multiply ---------- */

interface ModNum {
  re: number;
  im: number;
  /** |z|^2. */
  r2: number;
}

const WHOLE_MOD: ModNum[] = [
  { re: 3, im: 4, r2: 25 },
  { re: 4, im: -3, r2: 25 },
  { re: -3, im: 4, r2: 25 },
  { re: 6, im: 8, r2: 100 },
  { re: 8, im: -6, r2: 100 },
  { re: 5, im: 12, r2: 169 },
  { re: 12, im: -5, r2: 169 },
  { re: 8, im: 15, r2: 289 },
];

const ROOT_MOD: ModNum[] = [
  { re: 1, im: 2, r2: 5 },
  { re: 2, im: -1, r2: 5 },
  { re: 1, im: 1, r2: 2 },
  { re: 1, im: -1, r2: 2 },
  { re: 2, im: 3, r2: 13 },
  { re: 3, im: -2, r2: 13 },
  { re: 1, im: 3, r2: 10 },
  { re: 3, im: -1, r2: 10 },
  { re: 1, im: 4, r2: 17 },
];

interface ModulusParams {
  z1: ModNum;
  n: number;
  z2: ModNum;
  m: number;
  /** Difficulty 2: z1^n / z2^m, with |z2| a square root. */
  quotient: boolean;
}

const modR = (z: ModNum) => Math.round(Math.sqrt(z.r2));

function modValue(p: ModulusParams): number {
  const top = modR(p.z1) ** p.n;
  return p.quotient ? top / p.z2.r2 ** (p.m / 2) : top * modR(p.z2) ** p.m;
}

const cmAgModulus: Generator<ModulusParams> = {
  id: 'cm-ag-modulus',
  sample(rng, difficulty) {
    for (;;) {
      const z1 = rng.pick(WHOLE_MOD);
      const n = rng.int(2, 3);
      if (difficulty >= 2) {
        const p = { z1, n, z2: rng.pick(ROOT_MOD), m: rng.pick([2, 4]), quotient: true };
        const v = modValue(p);
        if (!Number.isInteger(v) || v <= 1) continue;
        return p;
      }
      const z2 = rng.pick(WHOLE_MOD);
      if (z2 === z1) continue;
      const p = { z1, n, z2, m: 1, quotient: false };
      if (modValue(p) > 100000) continue;
      return p;
    }
  },
  render(p) {
    const a = `(${cTex(p.z1.re, p.z1.im)})^{${p.n}}`;
    const b = `(${cTex(p.z2.re, p.z2.im)})${p.m === 1 ? '' : `^{${p.m}}`}`;
    const tex = p.quotient ? `\\left| \\frac{${a}}{${b}} \\right|` : `\\left| ${a}${b} \\right|`;
    return typed([say('Work out the modulus, without multiplying anything out.'), show(tex)], modValue(p), '\\text{modulus} =');
  },
  choices(p) {
    const r1 = modR(p.z1);
    const v = modValue(p);
    if (p.quotient) {
      return numberOptions(v, [r1 ** p.n / p.z2.r2 ** p.m, r1 ** p.n, v * p.z2.r2, v * 2], 1, 1);
    }
    const r2 = modR(p.z2);
    return numberOptions(v, [r1 ** p.n + r2, p.n * r1 * r2, r1 * r2, r1 ** p.n * r2 * r2], 1, 1);
  },
  solution(p) {
    const r1 = modR(p.z1);
    const steps: SolutionStep[] = [
      { text: 'The modulus of a product is the product of the moduli, so each power can be taken separately.' },
      { tex: `|${cTex(p.z1.re, p.z1.im)}| = \\sqrt{${sq(p.z1.re)} + ${sq(p.z1.im)}} = ${r1}` },
    ];
    if (p.quotient) {
      const bottom = p.z2.r2 ** (p.m / 2);
      steps.push(
        { tex: `|${cTex(p.z2.re, p.z2.im)}|^2 = ${sq(p.z2.re)} + ${sq(p.z2.im)} = ${p.z2.r2}` },
        { text: `The power ${p.m} is even, so the square root never needs working out:` },
        { tex: `|${cTex(p.z2.re, p.z2.im)}|^{${p.m}} = ${p.z2.r2}^{${p.m / 2}} = ${bottom}` },
        { tex: `\\frac{${r1}^{${p.n}}}{${bottom}} = \\frac{${r1 ** p.n}}{${bottom}} = ${modValue(p)}` },
      );
      return steps;
    }
    const r2 = modR(p.z2);
    steps.push(
      { tex: `|${cTex(p.z2.re, p.z2.im)}| = \\sqrt{${sq(p.z2.re)} + ${sq(p.z2.im)}} = ${r2}` },
      { tex: `${r1}^{${p.n}} \\times ${r2} = ${r1 ** p.n} \\times ${r2} = ${modValue(p)}` },
    );
    return steps;
  },
};

/* ---------- how near and far a circle comes to the origin ---------- */

interface ReachParams {
  a: number;
  b: number;
  R: number;
  r: number;
  least: boolean;
}

const reachValue = ({ R, r, least }: ReachParams) => (least ? Math.abs(R - r) : R + r);

const reachEq = ({ a, b, r }: ReachParams) => `|z${term(-a)}${term(-b, 'i')}| = ${r}`;

const cmAgReach: Generator<ReachParams> = {
  id: 'cm-ag-reach',
  sample(rng, difficulty) {
    for (;;) {
      const [u, v, R] = rng.pick(TRIPLES);
      const r = rng.int(1, difficulty >= 2 ? 25 : 15);
      if (r === R) continue;
      return { a: u * rng.sign(), b: v * rng.sign(), R, r, least: difficulty >= 2 };
    }
  },
  render(p) {
    return typed(
      [say('The complex number $z$ satisfies'), show(reachEq(p)), say(p.least ? 'What is the least value $|z|$ can take?' : 'What is the greatest value $|z|$ can take?')],
      reachValue(p),
      '|z| =',
    );
  },
  choices(p) {
    const man = Math.abs(p.a) + Math.abs(p.b);
    if (p.least) return numberOptions(reachValue(p), [p.R + p.r, p.R - p.r, p.r, man - p.r, p.R], 1, 0);
    return numberOptions(reachValue(p), [p.r, p.R, man + p.r, p.R + 2 * p.r], 1, 1);
  },
  solution(p) {
    const steps: SolutionStep[] = [
      { text: `$z$ lies on the circle of radius ${p.r} about $${cTex(p.a, p.b)}$, and $|z|$ is its distance from the origin. The centre is` },
      { tex: `|${cTex(p.a, p.b)}| = \\sqrt{${sq(p.a)} + ${sq(p.b)}} = ${p.R}` },
      { text: 'from the origin. The nearest and farthest points of the circle lie on the line through the origin and the centre.' },
    ];
    if (!p.least) {
      steps.push({ text: 'The farthest is beyond the centre, one radius further out:' }, { tex: `${p.R} + ${p.r} = ${p.R + p.r}` });
    } else if (p.r < p.R) {
      steps.push({ text: 'The origin is outside the circle, so the nearest point is one radius short of the centre:' }, { tex: `${p.R} - ${p.r} = ${p.R - p.r}` });
    } else {
      steps.push(
        { text: 'The radius is longer than the distance to the centre, so the origin is inside the circle. The nearest point is on the far side of the origin from the centre:' },
        { tex: `${p.r} - ${p.R} = ${p.r - p.R}` },
      );
    }
    return steps;
  },
};

/* ---------- areas of shapes made by turning with i ---------- */

interface TurnAreaParams {
  a: number;
  b: number;
  /** Difficulty 2: the square z, iz, -z, -iz rather than the triangle 0, z, iz. */
  square: boolean;
}

const turnArea = ({ a, b, square }: TurnAreaParams) => (square ? 2 * (a * a + b * b) : (a * a + b * b) / 2);

const cmAgTurnArea: Generator<TurnAreaParams> = {
  id: 'cm-ag-turn-area',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(-7, 7);
      const b = rng.int(-7, 7);
      if (a === 0 || b === 0) continue;
      return { a, b, square: difficulty >= 2 };
    }
  },
  render(p) {
    const shape = p.square ? 'the square with corners at $z$, $iz$, $-z$ and $-iz$' : 'the triangle with corners at $0$, $z$ and $iz$';
    return typed([say(`Let $z = ${cTex(p.a, p.b)}$. What is the area of ${shape}?`)], turnArea(p), '\\text{area} =');
  },
  choices(p) {
    const s = p.a * p.a + p.b * p.b;
    const v = turnArea(p);
    const slips = p.square ? [s, 4 * s, s / 2] : [s, Math.abs(p.a * p.b), 2 * s];
    return numberOptions(v, slips, Number.isInteger(v) ? 1 : 0.5, 0.5);
  },
  solution(p) {
    const s = p.a * p.a + p.b * p.b;
    const steps: SolutionStep[] = [
      { text: 'Multiplying by $i$ turns a point $90^\\circ$ about the origin and keeps its distance, so $iz$ is as far from $0$ as $z$ is:' },
      { tex: `|z|^2 = ${sq(p.a)} + ${sq(p.b)} = ${s}` },
    ];
    if (p.square) {
      steps.push(
        { text: 'The four corners are $z$ turned by $90^\\circ$ again and again, so they make a square centred on $0$. Its diagonal runs from $z$ to $-z$, so it is $2|z|$ long, and a square’s area is half its diagonal squared:' },
        { tex: `\\text{area} = \\tfrac{1}{2}(2|z|)^2 = 2|z|^2` },
        { tex: `2 \\times ${s} = ${2 * s}` },
      );
    } else {
      steps.push(
        { text: 'The triangle has a right angle at $0$ and two sides of length $|z|$:' },
        { tex: `\\text{area} = \\tfrac{1}{2}|z|^2` },
        { tex: `\\tfrac{1}{2} \\times ${s} = ${num(s / 2)}` },
      );
    }
    return steps;
  },
};

export const contestAnalyticGeometryGenerators = [
  cmAgRiver,
  cmAgLattice,
  cmAgPick,
  cmAgLineDistance,
  cmAgEllipse,
  cmAgCircleCentre,
  cmAgCircleChord,
  cmAgParabola,
  cmAgMassCevians,
  cmAgMassTable,
  cmAgMassReverse,
  cmAgMassCeva,
  cmAgRotate,
  cmAgModulus,
  cmAgReach,
  cmAgTurnArea,
];
