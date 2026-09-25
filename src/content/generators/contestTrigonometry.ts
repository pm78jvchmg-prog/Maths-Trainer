/**
 * Contest Math, level 20: Trigonometry.
 *
 * Five lessons: the trigonometric functions, the law of cosines, the law of
 * sines, identities, and roots of unity. Level 4 already met the two special
 * right triangles and the area of a triangle with a 30° or 150° angle, so
 * these go further, and each question turns on one idea: a triple gives every
 * ratio at once and the quadrant gives the sign; whole turns change nothing;
 * sin²x pairs with sin²(90° − x) to make 1; cos 60° = 1/2 and cos 120° = −1/2
 * turn the law of cosines into whole numbers; a parallelogram's cosines
 * cancel; a/sin A is the circle's diameter; the height decides how many
 * triangles two sides and an angle make; squaring sin θ + cos θ; dividing by
 * cos θ; a sin x + b cos x reaches √(a² + b²); and z^n − 1 factorised over
 * the n-th roots of unity.
 *
 * Every answer is exact. A surd is typed with the `√(` key and a fraction with
 * `/`, graded by value like any typed answer.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { ChoiceOption, Generator, KeypadKey, SolutionStep } from '../types';
import { FRACTION_KEYS, fracAnswer, fracTex, gcd, num, numberBank, numberOptions, say, show, typed } from './contestMath';
import { options } from '../choiceVariant';

/** The keypad for an exact answer: a square root and a fraction. */
const EXACT_KEYS: KeypadKey[] = [...FRACTION_KEYS, { insert: 'sqrt(', label: '√(' }];

/* ================================================================
 * Exact values: c√r / d
 * ================================================================ */

/** The number c√r / d, with r square-free and the fraction in lowest terms. */
interface Surd {
  c: number;
  r: number;
  d: number;
}

function mk(c: number, r = 1, d = 1): Surd {
  if (c === 0) return { c: 0, r: 1, d: 1 };
  let top = c;
  let rad = r;
  for (let s = Math.floor(Math.sqrt(rad)); s >= 2; s -= 1) {
    while (rad % (s * s) === 0) {
      top *= s;
      rad /= s * s;
    }
  }
  let bottom = d;
  if (bottom < 0) {
    top = -top;
    bottom = -bottom;
  }
  const g = gcd(top, bottom) || 1;
  return { c: top / g, r: rad, d: bottom / g };
}

const sv = (x: Surd) => (x.c * Math.sqrt(x.r)) / x.d;
const neg = (x: Surd) => mk(-x.c, x.r, x.d);
const mul = (x: Surd, y: Surd) => mk(x.c * y.c, x.r * y.r, x.d * y.d);
/** x ÷ y, the root cleared from the bottom. */
const div = (x: Surd, y: Surd) => mk(x.c * y.d, x.r * y.r, x.d * y.c * y.r);
const isWhole = (x: Surd) => x.r === 1 && x.d === 1;

function sTex(x: Surd): string {
  if (x.c === 0) return '0';
  const sign = x.c < 0 ? '-' : '';
  const a = Math.abs(x.c);
  if (x.r === 1) return x.d === 1 ? `${sign}${a}` : `${sign}\\frac{${a}}{${x.d}}`;
  const root = `${a === 1 ? '' : a}\\sqrt{${x.r}}`;
  return x.d === 1 ? `${sign}${root}` : `${sign}\\frac{${root}}{${x.d}}`;
}

function sAns(x: Surd): string {
  if (x.r === 1) return fracAnswer(x.c, x.d);
  const sign = x.c < 0 ? '-' : '';
  const a = Math.abs(x.c);
  const body = `${a === 1 ? '' : `${a}*`}sqrt(${x.r})`;
  return x.d === 1 ? `${sign}${body}` : `${sign}${body}/${x.d}`;
}

/** As plain text for a figure: `6√2`. Whole-number coefficients only. */
function sText(x: Surd): string {
  const a = Math.abs(x.c);
  return x.r === 1 ? `${a}` : `${a === 1 ? '' : a}√${x.r}`;
}

const same = (x: number, y: number) => Math.abs(x - y) < 1e-9;

/**
 * Four options: the answer and the first three slips worth something
 * different, topped up with neighbours of the answer. A length question passes
 * `positive` so no slip is zero or negative.
 */
function surdOptions(correct: Surd, slips: Surd[], positive = true): ChoiceOption[] {
  const seen = [sv(correct)];
  const picked: Surd[] = [];
  const pool = [...slips, ...[1, -1, 2, -2, 3, -3, 4, 5].map((j) => mk(correct.c + j, correct.r, correct.d))];
  for (const s of pool) {
    if (picked.length === 3) break;
    const v = sv(s);
    if (!Number.isFinite(v) || (positive && v <= 0)) continue;
    if (seen.some((w) => same(w, v))) continue;
    seen.push(v);
    picked.push(s);
  }
  picked.sort((x, y) => sv(x) - sv(y));
  return options({ tex: sTex(correct), answer: sAns(correct) }, ...picked.map((s) => ({ tex: sTex(s), answer: sAns(s) })));
}

/** An answer in whole degrees, with slips topped up from the special angles. */
function degreeOptions(correct: number, slips: number[]): ChoiceOption[] {
  const picked: number[] = [];
  for (const v of [...slips, 30, 45, 60, 90, 120, 135, 150]) {
    if (picked.length === 3) break;
    if (v <= 0 || v >= 180 || v === correct || picked.includes(v) || !Number.isInteger(v)) continue;
    picked.push(v);
  }
  picked.sort((x, y) => x - y);
  return options({ tex: `${correct}^\\circ`, answer: num(correct) }, ...picked.map((v) => ({ tex: `${v}^\\circ`, answer: num(v) })));
}

/** A bank of exact values: the answers (a value needed twice offered twice), then spares, sorted by value. */
function surdBank(answer: Surd[], slips: Surd[], spare = 3): string[] {
  const out = [...answer];
  const taken = new Set(answer.map(sTex));
  let extras = 0;
  for (const s of slips) {
    if (extras === spare) break;
    if (!Number.isFinite(sv(s)) || taken.has(sTex(s))) continue;
    taken.add(sTex(s));
    out.push(s);
    extras += 1;
  }
  return out.sort((x, y) => sv(x) - sv(y) || sTex(x).localeCompare(sTex(y))).map(sTex);
}

/* ================================================================
 * The special angles
 * ================================================================ */

type Fn = 'sin' | 'cos' | 'tan';

/** sin of 0, 30, 45, 60 and 90 degrees. */
const SIN_FIRST: Record<number, Surd> = {
  0: mk(0),
  30: mk(1, 1, 2),
  45: mk(1, 2, 2),
  60: mk(1, 3, 2),
  90: mk(1),
};

/** The angle's own turn, 0 to 359. */
const turn = (deg: number) => ((deg % 360) + 360) % 360;

/** The acute angle to the horizontal axis. */
function reference(deg: number): number {
  const t = turn(deg);
  if (t <= 90) return t;
  if (t <= 180) return 180 - t;
  if (t <= 270) return t - 180;
  return 360 - t;
}

const QUADRANT = ['first', 'second', 'third', 'fourth'];
const quadrantOf = (deg: number) => Math.floor(turn(deg) / 90);

function exactSin(deg: number): Surd {
  const t = turn(deg);
  const v = SIN_FIRST[reference(t)];
  return t > 180 ? neg(v) : v;
}

function exactCos(deg: number): Surd {
  const t = turn(deg);
  const v = SIN_FIRST[90 - reference(t)];
  return t > 90 && t < 270 ? neg(v) : v;
}

function exact(fn: Fn, deg: number): Surd {
  if (fn === 'sin') return exactSin(deg);
  if (fn === 'cos') return exactCos(deg);
  return div(exactSin(deg), exactCos(deg));
}

/* ================================================================
 * Figures
 * ================================================================ */

type Pt = [number, number];

const f1 = (v: number) => v.toFixed(1);
const plus = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const minus = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const rad = (deg: number) => (deg * Math.PI) / 180;
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

function outline(pts: Pt[]): string {
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${f1(x)} ${f1(y)}`).join(' ') + ' Z';
  return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" />`;
}

const text = (p: Pt, value: string, size = 13) =>
  `<text x="${f1(p[0])}" y="${f1(p[1])}" font-size="${size}" fill="currentColor" text-anchor="middle" dominant-baseline="middle">${value}</text>`;

/** An arc at `v` between the rays towards `a` and `b`, its label out along the bisector far enough to clear both rays. */
function angleMark(v: Pt, a: Pt, b: Pt, label: string): string {
  const u1 = unit(v, a);
  const u2 = unit(v, b);
  const r = 16;
  const s = plus(v, scale(u1, r));
  const e = plus(v, scale(u2, r));
  const cross = u1[0] * u2[1] - u1[1] * u2[0];
  const mid = unit([0, 0], plus(u1, u2));
  const half = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))) / 2;
  // A wide angle has room close in, and a flat triangle has little room further out.
  const R = half > rad(50) ? 26 : Math.min(60, Math.max(30, 14 / Math.sin(half)));
  return [
    `<path d="M ${f1(s[0])} ${f1(s[1])} A ${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${f1(e[0])} ${f1(e[1])}" fill="none" stroke="currentColor" stroke-width="1.5" />`,
    text(plus(v, scale(mid, R)), label, 12),
  ].join('');
}

/** A label beside the middle of side ab, on the side away from `inside`. */
function sideLabel(a: Pt, b: Pt, value: string, inside: Pt, gap = 14): string {
  const mid = scale(plus(a, b), 0.5);
  const along = unit(a, b);
  let across: Pt = [-along[1], along[0]];
  const toInside = minus(inside, mid);
  if (across[0] * toInside[0] + across[1] * toInside[1] > 0) across = scale(across, -1);
  return text(plus(mid, scale(across, gap)), value);
}

/** A vertex letter, pushed out from `centre` past the corner. */
const letter = (p: Pt, name: string, centre: Pt, gap = 13) =>
  text(plus(p, scale(unit(centre, p), gap)), name, 13);

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

const centroid = (pts: Pt[]): Pt => scale(pts.reduce((s, p) => plus(s, p), [0, 0] as Pt), 1 / pts.length);

/** Distance from p to the segment ab. */
function toSegment(p: Pt, a: Pt, b: Pt): number {
  const ab = minus(b, a);
  const len2 = ab[0] * ab[0] + ab[1] * ab[1] || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / len2));
  return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]);
}

/** A label beside the point `t` of the way along ab, on whichever side is further from every other line. */
function lineLabel(a: Pt, b: Pt, t: number, value: string, lines: [Pt, Pt][], gap = 12): string {
  const at = plus(a, scale(minus(b, a), t));
  const along = unit(a, b);
  const across: Pt = [-along[1], along[0]];
  const candidates = [plus(at, scale(across, gap)), plus(at, scale(across, -gap))];
  const clearance = (p: Pt) => Math.min(...lines.map(([u, v]) => toSegment(p, u, v)));
  const best = clearance(candidates[0]) >= clearance(candidates[1]) ? candidates[0] : candidates[1];
  return text(best, value);
}

/**
 * A triangle ABC drawn to scale from its three sides, AB along the bottom.
 * `sides` labels BC, CA, AB (null for none); `angles` labels A, B, C.
 */
function triangleSvg(
  sides: [number, number, number],
  labels: (string | null)[],
  angles: (string | null)[],
  aria: string,
): string {
  const [a, b, c] = sides;
  const ax = (b * b + c * c - a * a) / (2 * c);
  const ay = Math.sqrt(Math.max(0, b * b - ax * ax));
  const [A, B, C] = fit([[0, 0], [c, 0], [ax, ay]], 230, 140, 35, 24);
  const mid = centroid([A, B, C]);
  const out = [svgOpen(188, aria), outline([A, B, C])];
  const pairs: [Pt, Pt][] = [[B, C], [C, A], [A, B]];
  pairs.forEach(([p, q], i) => {
    const value = labels[i];
    if (value) out.push(sideLabel(p, q, value, mid));
  });
  const corners: [Pt, Pt, Pt][] = [[A, B, C], [B, C, A], [C, A, B]];
  corners.forEach(([v, p, q], i) => {
    const value = angles[i];
    if (value) out.push(angleMark(v, p, q, value));
  });
  out.push(letter(A, 'A', mid), letter(B, 'B', mid), letter(C, 'C', mid), '</svg>');
  return out.join('');
}

/* ================================================================
 * Pythagorean triples
 * ================================================================ */

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

/* ================================================================
 * Lesson 1: Trigonometric Functions
 * ================================================================ */

/* ---------- one ratio gives the others ---------- */

interface OtherRatioParams {
  t: number;
  /** The longer leg is opposite θ. */
  flip: boolean;
  given: Fn;
  asked: Fn;
  /** θ between 90° and 180°. */
  obtuse: boolean;
}

function ratioValues({ t, flip, obtuse }: OtherRatioParams): Record<Fn, Surd> {
  const [x, y, h] = TRIPLES[t];
  const opp = flip ? y : x;
  const adj = flip ? x : y;
  const s = obtuse ? -1 : 1;
  return { sin: mk(opp, 1, h), cos: mk(s * adj, 1, h), tan: mk(s * opp, 1, adj) };
}

const fnTex = (fn: Fn) => `\\${fn}\\theta`;
const FNS: Fn[] = ['sin', 'cos', 'tan'];

const cmOtherRatio: Generator<OtherRatioParams> = {
  id: 'cm-tr-other-ratio',
  sample(rng, difficulty) {
    const given = rng.pick(FNS);
    return {
      t: rng.int(0, TRIPLES.length - 1),
      flip: rng.next() < 0.5,
      given,
      asked: rng.pick(FNS.filter((f) => f !== given)),
      obtuse: difficulty >= 2,
    };
  },
  render(p) {
    const v = ratioValues(p);
    return typed(
      [
        say(p.obtuse ? 'The angle $\\theta$ is between $90^\\circ$ and $180^\\circ$, and' : 'The angle $\\theta$ is acute, and'),
        show(`${fnTex(p.given)} = ${sTex(v[p.given])}`),
        say(`Find $${fnTex(p.asked)}$.`),
      ],
      sAns(v[p.asked]),
      `${fnTex(p.asked)} =`,
      FRACTION_KEYS,
    );
  },
  choices(p) {
    const v = ratioValues(p);
    const right = v[p.asked];
    const others = FNS.filter((f) => f !== p.asked).map((f) => v[f]);
    return surdOptions(right, [neg(right), div(mk(1), right), ...others, ...others.map(neg)], false);
  },
  solution(p) {
    const [x, y, h] = TRIPLES[p.t];
    const opp = p.flip ? y : x;
    const adj = p.flip ? x : y;
    const v = ratioValues(p);
    const steps: SolutionStep[] = [];
    if (p.given === 'sin') {
      steps.push(
        { text: `Draw a right triangle with the opposite side ${opp} and the hypotenuse ${h}. The adjacent side is` },
        { tex: `\\sqrt{${h}^{2} - ${opp}^{2}} = ${adj}` },
      );
    } else if (p.given === 'cos') {
      steps.push(
        { text: `Draw a right triangle with the adjacent side ${adj} and the hypotenuse ${h}${p.obtuse ? ', leaving the sign aside' : ''}. The opposite side is` },
        { tex: `\\sqrt{${h}^{2} - ${adj}^{2}} = ${opp}` },
      );
    } else {
      steps.push(
        { text: `Draw a right triangle with the opposite side ${opp} and the adjacent side ${adj}${p.obtuse ? ', leaving the sign aside' : ''}. The hypotenuse is` },
        { tex: `\\sqrt{${opp}^{2} + ${adj}^{2}} = ${h}` },
      );
    }
    if (p.obtuse) {
      steps.push({ text: 'Between $90^\\circ$ and $180^\\circ$ the point on the unit circle is up and to the left: the sine is positive, and the cosine and the tangent are negative.' });
    }
    steps.push({ tex: `${fnTex(p.asked)} = ${sTex(v[p.asked])}` });
    return steps;
  },
};

/* ---------- big and negative angles ---------- */

const BASES = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330];

interface BigAngleParams {
  fn: Fn;
  base: number;
  turns: number;
}

const angleArg = (deg: number) => (deg < 0 ? `(${deg}^\\circ)` : ` ${deg}^\\circ`);

const FN_NAME: Record<Fn, string> = { sin: 'sine', cos: 'cosine', tan: 'tangent' };

/** `1110 - 3 \\times 360 = 30`: the whole turns taken off. */
function turnsTex(theta: number, base: number): string {
  const k = (theta - base) / 360;
  return k > 0 ? `${theta} - ${k} \\times 360 = ${base}` : `${theta} + ${-k} \\times 360 = ${base}`;
}

/** `\\sin 210^\\circ = -\\sin 30^\\circ = -\\frac{1}{2}`, with the words before it. */
function quadrantSteps(fn: Fn, base: number): SolutionStep[] {
  const alpha = reference(base);
  const value = exact(fn, base);
  const sign = sv(value) < 0 ? '-' : '';
  if (alpha === base) {
    return [
      { text: `$${base}^\\circ$ is in the first quadrant, where every ratio is positive:` },
      { tex: `\\${fn} ${base}^\\circ = ${sTex(value)}` },
    ];
  }
  return [
    {
      text: `$${base}^\\circ$ is in the ${QUADRANT[quadrantOf(base)]} quadrant, $${alpha}^\\circ$ from the horizontal axis, where the ${FN_NAME[fn]} is ${sign ? 'negative' : 'positive'}:`,
    },
    { tex: `\\${fn} ${base}^\\circ = ${sign}\\${fn} ${alpha}^\\circ = ${sTex(value)}` },
  ];
}

const cmBigAngle: Generator<BigAngleParams> = {
  id: 'cm-tr-big-angle',
  sample(rng, difficulty) {
    return {
      fn: rng.pick(FNS),
      base: rng.pick(BASES),
      turns: difficulty >= 2 ? rng.pick([-3, -2, -1, 3, 4, 5]) : rng.pick([1, 2]),
    };
  },
  render({ fn, base, turns }) {
    const theta = base + 360 * turns;
    return typed(
      [say(`Find the exact value of $\\${fn}${angleArg(theta)}$.`)],
      sAns(exact(fn, base)),
      `\\${fn}${angleArg(theta)} =`,
      EXACT_KEYS,
    );
  },
  choices({ fn, base }) {
    const v = exact(fn, base);
    const alpha = reference(base);
    const pool = FNS.map((f) => exact(f, alpha));
    return surdOptions(v, [neg(v), ...pool, ...pool.map(neg)], false);
  },
  solution({ fn, base, turns }) {
    const theta = base + 360 * turns;
    return [
      { text: 'A whole turn of $360^\\circ$ comes back to the same point on the unit circle, so take whole turns off:' },
      { tex: turnsTex(theta, base) },
      ...quadrantSteps(fn, base),
    ];
  },
};

/* ---------- sin² pairs with cos² ---------- */

interface SquareSumParams {
  s: number;
  fn: 'sin' | 'cos';
  /** The first angle is m steps up; the last is m steps short of 90°, or 90° itself. */
  m: number;
  toNinety: boolean;
}

function squareSum({ s, fn, m, toNinety }: SquareSumParams) {
  const start = m * s;
  const end = toNinety ? 90 : 90 - m * s;
  const count = (end - start) / s + 1;
  const paired = toNinety ? count - 1 : count;
  const last = toNinety ? (fn === 'sin' ? 1 : 0) : 0;
  return { start, end, count, paired, last, total: paired / 2 + last };
}

const cmSquareSum: Generator<SquareSumParams> = {
  id: 'cm-tr-square-sum',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const toNinety = rng.next() < 0.5;
        const p: SquareSumParams = { s: rng.pick([1, 2, 3, 5]), fn: rng.pick(['sin', 'cos'] as const), m: toNinety ? 1 : rng.int(0, 3), toNinety };
        return p;
      }
      const p: SquareSumParams = { s: rng.pick([5, 6, 9, 10, 15, 18]), fn: rng.pick(['sin', 'cos'] as const), m: rng.int(0, 2), toNinety: false };
      if (squareSum(p).count >= 5) return p;
    }
  },
  render(p) {
    const { start, end, total } = squareSum(p);
    const term = (deg: number) => `\\${p.fn}^{2} ${deg}^\\circ`;
    return typed(
      [
        say(`The angles go up in steps of $${p.s}^\\circ$. Find the sum.`),
        show(`${term(start)} + ${term(start + p.s)} + \\cdots + ${term(end)}`),
      ],
      total,
      '\\text{sum} =',
    );
  },
  choices(p) {
    const { count, total } = squareSum(p);
    return numberOptions(total, [count, total - 0.5, total + 0.5, total + 1], 1, 0);
  },
  solution(p) {
    const { count, paired, last, total, end } = squareSum(p);
    const f = `\\${p.fn}`;
    const other = p.fn === 'sin' ? '\\cos' : '\\sin';
    const steps: SolutionStep[] = [
      { text: 'Pair each angle with the one that makes $90^\\circ$ with it. Each pair adds to $1$:' },
      { tex: `${f}^{2} x + ${f}^{2}(90^\\circ - x) = ${f}^{2} x + ${other}^{2} x = 1` },
    ];
    if (p.toNinety) {
      steps.push(
        { text: `Leave the last term, $${f}^{2} 90^\\circ = ${last}$, aside. The other ${paired} terms run from $${p.s}^\\circ$ to $${end - p.s}^\\circ$ and pair up.` },
      );
    } else {
      steps.push({ text: `There are ${count} terms, and they pair up round $45^\\circ$.` });
    }
    const pairs = Math.floor(paired / 2);
    if (paired % 2 === 1) {
      steps.push(
        { text: `The middle term is $${f}^{2} 45^\\circ = \\tfrac{1}{2}$, and the other ${paired - 1} make ${pairs} pairs:` },
        { tex: p.toNinety ? `${pairs} + \\tfrac{1}{2} + ${last} = ${num(total)}` : `${pairs} + \\tfrac{1}{2} = ${num(total)}` },
      );
    } else {
      steps.push(
        { text: `They make ${pairs} pairs:` },
        { tex: p.toNinety ? `${pairs} + ${last} = ${num(total)}` : `\\text{sum} = ${pairs}` },
      );
    }
    return steps;
  },
};

/* ---------- a table of exact values ---------- */

interface ExactTableParams {
  bases: number[];
  turns: number[];
}

const SPECIAL_VALUES: Surd[] = [mk(1, 1, 2), mk(1, 2, 2), mk(1, 3, 2)].flatMap((v) => [v, neg(v)]);

const cmExactTable: Generator<ExactTableParams> = {
  id: 'cm-tr-exact-table',
  sample(rng, difficulty) {
    const bases = rng.sample(BASES.filter((b) => b > 90), 3).sort((x, y) => x - y);
    return { bases, turns: bases.map(() => (difficulty >= 2 ? rng.pick([-2, -1, 1, 2]) : 0)) };
  },
  render({ bases, turns }) {
    const answer = bases.flatMap((b) => [exactSin(b), exactCos(b)]);
    const slips = [...answer.map(neg), ...SPECIAL_VALUES, mk(1), mk(-1), mk(0)];
    return {
      kind: 'table',
      prompt: [say('Fill in the exact values.')],
      columns: ['\\theta', '\\sin\\theta', '\\cos\\theta'],
      rows: bases.map((b, i) => [`${b + 360 * turns[i]}^\\circ`, null, null]),
      bank: surdBank(answer, slips, 3),
      answer: answer.map(sTex),
    };
  },
  solution({ bases, turns }) {
    const steps: SolutionStep[] = [
      { text: 'Find each angle’s distance from the horizontal axis, then give it the sign of its quadrant: the sine is positive above the axis, the cosine to the right of it.' },
    ];
    bases.forEach((b, i) => {
      const theta = b + 360 * turns[i];
      if (turns[i] !== 0) steps.push({ tex: turnsTex(theta, b) });
      steps.push({ tex: `\\sin ${b}^\\circ = ${sTex(exactSin(b))}, \\qquad \\cos ${b}^\\circ = ${sTex(exactCos(b))}` });
    });
    return steps;
  },
};

/* ================================================================
 * Lesson 2: Law of Cosines
 * ================================================================ */

/** Whole triangles with a 60° angle (sign −1) or a 120° angle (sign +1) between sides a < b, opposite c. */
function eisenstein(sign: 1 | -1, max: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = 1; a <= max; a += 1) {
    for (let b = a + 1; b <= max; b += 1) {
      const sq = a * a + b * b + sign * a * b;
      const c = Math.round(Math.sqrt(sq));
      if (c * c === sq) out.push([a, b, c]);
    }
  }
  return out;
}

/** Sides no more than four to one, so the drawing is not a sliver. */
const SIXTY = eisenstein(-1, 40).filter(([a, b]) => b <= 4 * a);
const ONE_TWENTY = eisenstein(1, 40).filter(([a, b]) => b <= 4 * a);

/* ---------- the third side ---------- */

interface CosSideParams {
  ab: number;
  ac: number;
  bc: number;
  angle: 60 | 120;
}

const cmCosSide: Generator<CosSideParams> = {
  id: 'cm-tr-cos-side',
  sample(rng, difficulty) {
    const angle = difficulty >= 2 ? 120 : 60;
    const [a, b, c] = rng.pick(angle === 60 ? SIXTY : ONE_TWENTY);
    const flip = rng.next() < 0.5;
    return { ab: flip ? b : a, ac: flip ? a : b, bc: c, angle };
  },
  render({ ab, ac, bc, angle }) {
    return typed(
      [
        say(`In triangle $ABC$, $AB = ${ab}$, $AC = ${ac}$ and $\\angle A = ${angle}^\\circ$. Find $BC$.`),
        { kind: 'diagram', svg: triangleSvg([bc, ac, ab], ['?', `${ac}`, `${ab}`], [`${angle}°`, null, null], `Triangle ABC with AB ${ab}, AC ${ac} and a ${angle} degree angle at A`) },
      ],
      bc,
      'BC =',
    );
  },
  choices({ ab, ac, bc, angle }) {
    const squares = ab * ab + ac * ac;
    const wrongSign = angle === 60 ? squares + ab * ac : squares - ab * ac;
    return surdOptions(mk(bc), [mk(1, squares), mk(1, wrongSign), mk(ab + ac)]);
  },
  solution({ ab, ac, bc, angle }) {
    return [
      { text: 'The law of cosines, with the angle between the two sides you know:' },
      { tex: `BC^{2} = ${ab}^{2} + ${ac}^{2} - 2 \\times ${ab} \\times ${ac} \\cos ${angle}^\\circ` },
      {
        text: angle === 60
          ? 'Since $\\cos 60^\\circ = \\tfrac{1}{2}$, the last term is just the product of the two sides, taken off:'
          : 'Since $\\cos 120^\\circ = -\\tfrac{1}{2}$, the last term is the product of the two sides, added:',
      },
      { tex: `BC^{2} = ${ab * ab} + ${ac * ac} ${angle === 60 ? '-' : '+'} ${ab * ac} = ${bc * bc}` },
      { tex: `BC = ${bc}` },
    ];
  },
};

/* ---------- the angle from the sides ---------- */

interface Identity {
  angle: number;
  /** k in (a + b + c)(a + b − c) = k ab. */
  k: string;
  /** a² + b² − c² as a multiple of ab. */
  rest: string;
  cos: string;
}

const IDENTITIES: Identity[] = [
  { angle: 60, k: '3', rest: '', cos: '\\frac{1}{2}' },
  { angle: 120, k: '', rest: '-', cos: '-\\frac{1}{2}' },
  { angle: 90, k: '2', rest: '0', cos: '0' },
  { angle: 45, k: '(2 + \\sqrt{2})', rest: '\\sqrt{2}\\,', cos: '\\frac{\\sqrt{2}}{2}' },
  { angle: 135, k: '(2 - \\sqrt{2})', rest: '-\\sqrt{2}\\,', cos: '-\\frac{\\sqrt{2}}{2}' },
  { angle: 30, k: '(2 + \\sqrt{3})', rest: '\\sqrt{3}\\,', cos: '\\frac{\\sqrt{3}}{2}' },
  { angle: 150, k: '(2 - \\sqrt{3})', rest: '-\\sqrt{3}\\,', cos: '-\\frac{\\sqrt{3}}{2}' },
];

/** The vertex asked about, and the two sides round it. */
const VERTICES: [string, string, string, string][] = [
  ['C', 'c', 'a', 'b'],
  ['A', 'a', 'b', 'c'],
  ['B', 'b', 'a', 'c'],
];

type CosAngleParams =
  | { kind: 'sides'; a: number; b: number; c: number; angle: number }
  | { kind: 'identity'; which: number; vertex: number; order: boolean };

const cmCosAngle: Generator<CosAngleParams> = {
  id: 'cm-tr-cos-angle',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      return { kind: 'identity', which: rng.int(0, IDENTITIES.length - 1), vertex: rng.int(0, 2), order: rng.next() < 0.5 };
    }
    const angle = rng.pick([60, 120]);
    const [a, b, c] = rng.pick(angle === 60 ? SIXTY : ONE_TWENTY);
    return { kind: 'sides', a, b, c, angle };
  },
  render(p) {
    if (p.kind === 'sides') {
      const sorted = [p.a, p.b, p.c].sort((x, y) => x - y);
      return typed(
        [
          say(`A triangle has sides $${sorted[0]}$, $${sorted[1]}$ and $${sorted[2]}$. Find the angle opposite the side of length $${p.c}$, in degrees.`),
          { kind: 'diagram', svg: triangleSvg([p.a, p.b, p.c], [`${p.a}`, `${p.b}`, `${p.c}`], [null, null, '?'], `A triangle with sides ${p.a}, ${p.b} and ${p.c}, the angle opposite ${p.c} marked`) },
        ],
        p.angle,
        '\\text{angle} =',
      );
    }
    const [V, opp, s1, s2] = VERTICES[p.vertex];
    const id = IDENTITIES[p.which];
    const sum = `(${s1} + ${s2} + ${opp})`;
    const diff = `(${s1} + ${s2} - ${opp})`;
    return typed(
      [
        say('The sides $a$, $b$, $c$ of triangle $ABC$ are opposite the angles $A$, $B$, $C$, and'),
        show(`${p.order ? sum + diff : diff + sum} = ${id.k}${s1}${s2}`),
        say(`Find $\\angle ${V}$, in degrees.`),
      ],
      id.angle,
      `\\angle ${V} =`,
    );
  },
  choices(p) {
    const angle = p.kind === 'sides' ? p.angle : IDENTITIES[p.which].angle;
    return degreeOptions(angle, [180 - angle, 90, angle / 2, 2 * angle]);
  },
  solution(p) {
    if (p.kind === 'sides') {
      const { a, b, c, angle } = p;
      const top = a * a + b * b - c * c;
      return [
        { text: `Turn the law of cosines round to give the cosine of the angle $\\theta$ opposite $${c}$:` },
        { tex: `\\cos\\theta = \\frac{${a}^{2} + ${b}^{2} - ${c}^{2}}{2 \\times ${a} \\times ${b}}` },
        { tex: `\\cos\\theta = ${top < 0 ? '-' : ''}\\frac{${Math.abs(top)}}{${2 * a * b}} = ${fracTex(top, 2 * a * b)}` },
        { tex: `\\theta = ${angle}^\\circ` },
      ];
    }
    const [V, opp, s1, s2] = VERTICES[p.vertex];
    const id = IDENTITIES[p.which];
    const rest = id.rest === '0' ? '0' : `${id.rest}${s1}${s2}`;
    return [
      { text: 'The two brackets are a sum and a difference, so they multiply to a difference of two squares:' },
      { tex: `(${s1} + ${s2})^{2} - ${opp}^{2} = ${id.k}${s1}${s2}` },
      { text: `Take $2${s1}${s2}$ from both sides:` },
      { tex: `${s1}^{2} + ${s2}^{2} - ${opp}^{2} = ${rest}` },
      { text: 'That is the top of the law of cosines:' },
      { tex: `\\cos ${V} = \\frac{${s1}^{2} + ${s2}^{2} - ${opp}^{2}}{2${s1}${s2}} = ${id.cos}` },
      { tex: `\\angle ${V} = ${id.angle}^\\circ` },
    ];
  },
};

/* ---------- the working, as a table ---------- */

interface CosTableParams {
  a: number;
  b: number;
  c: number;
}

const cmCosTable: Generator<CosTableParams> = {
  id: 'cm-tr-cos-table',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(2, 10);
      const b = rng.int(a, 11);
      const c = rng.int(b + 1, 12);
      if (c >= a + b || a === b) continue;
      const top = a * a + b * b - c * c;
      if (top === 0 || (difficulty >= 2) !== top < 0) continue;
      return { a, b, c };
    }
  },
  render({ a, b, c }) {
    const top = a * a + b * b - c * c;
    const answer: [string, number][] = [
      [num(a * a + b * b), a * a + b * b],
      [num(c * c), c * c],
      [num(2 * a * b), 2 * a * b],
      [fracTex(top, 2 * a * b), top / (2 * a * b)],
    ];
    const slips: [string, number][] = [
      [fracTex(-top, 2 * a * b), -top / (2 * a * b)],
      [fracTex(top, a * b), top / (a * b)],
      [num(a * b), a * b],
      [num((a + b) * (a + b)), (a + b) * (a + b)],
    ];
    const tokens = answer.map(([t]) => t);
    const spares: [string, number][] = [];
    for (const s of slips) {
      if (spares.length === 3) break;
      if (tokens.includes(s[0]) || spares.some(([t]) => t === s[0])) continue;
      spares.push(s);
    }
    return {
      kind: 'table',
      prompt: [
        say(`Triangle $ABC$ has sides $a = ${a}$, $b = ${b}$ and $c = ${c}$, each opposite the angle of the same letter. Fill in the working for $\\cos C$.`),
        show('\\cos C = \\frac{a^{2} + b^{2} - c^{2}}{2ab}'),
      ],
      columns: ['\\text{quantity}', '\\text{value}'],
      rows: [
        ['a^{2} + b^{2}', null],
        ['c^{2}', null],
        ['2ab', null],
        ['\\cos C', null],
      ],
      bank: [...answer, ...spares].sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0])).map(([t]) => t),
      answer: tokens,
    };
  },
  solution({ a, b, c }) {
    const top = a * a + b * b - c * c;
    return [
      { tex: `a^{2} + b^{2} = ${a * a} + ${b * b} = ${a * a + b * b}` },
      { tex: `c^{2} = ${c * c}, \\qquad 2ab = ${2 * a * b}` },
      { tex: `\\cos C = \\frac{${a * a + b * b} - ${c * c}}{${2 * a * b}} = ${fracTex(top, 2 * a * b)}` },
      {
        text: top < 0
          ? 'The cosine is negative, so $C$ is obtuse: $c^{2}$ is more than $a^{2} + b^{2}$.'
          : 'The cosine is positive, so $C$ is acute: $c^{2}$ is less than $a^{2} + b^{2}$.',
      },
    ];
  },
};

/* ---------- a parallelogram's diagonals, and a median ---------- */

/** Parallelograms with whole sides a ≤ b and whole diagonals p < q, not too flat to draw. */
const PARALLELOGRAMS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (let a = 2; a <= 14; a += 1) {
    for (let b = a; b <= 14; b += 1) {
      for (let p = b - a + 1; p < a + b; p += 1) {
        const sq = 2 * (a * a + b * b) - p * p;
        const q = Math.round(Math.sqrt(sq));
        if (q * q !== sq || q <= p || q >= a + b) continue;
        const cosA = (a * a + b * b - p * p) / (2 * a * b);
        if (Math.abs(cosA) > 0.75) continue;
        out.push([a, b, p, q]);
      }
    }
  }
  return out;
})();

/** Triangles with whole sides b ≠ c round A, whole BC = a, and a whole median AM. */
const MEDIANS: [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (let b = 3; b <= 16; b += 1) {
    for (let c = b + 1; c <= 16; c += 1) {
      for (let a = c - b + 1; a < b + c; a += 1) {
        const sq = 2 * b * b + 2 * c * c - a * a;
        if (sq % 4 !== 0) continue;
        const m = Math.round(Math.sqrt(sq / 4));
        if (4 * m * m !== sq) continue;
        const cosB = (a * a + c * c - b * b) / (2 * a * c);
        const cosC = (a * a + b * b - c * c) / (2 * a * b);
        if (cosB < -0.5 || cosC < -0.5 || cosB > 0.95 || cosC > 0.95) continue;
        out.push([a, b, c, m]);
      }
    }
  }
  return out;
})();

type ParallelogramParams =
  | { kind: 'diagonal'; a: number; b: number; given: number; other: number }
  | { kind: 'median'; a: number; b: number; c: number; m: number };

function parallelogramSvg(a: number, b: number, d: number): string {
  const cosA = (a * a + b * b - d * d) / (2 * a * b);
  const sinA = Math.sqrt(1 - cosA * cosA);
  const [A, B, C, D] = fit([[0, 0], [b, 0], [b + a * cosA, a * sinA], [a * cosA, a * sinA]], 230, 140, 35, 24);
  const mid = centroid([A, B, C, D]);
  const lines: [Pt, Pt][] = [[A, B], [B, C], [C, D], [D, A], [A, C], [B, D]];
  return [
    svgOpen(188, `A parallelogram with sides ${a} and ${b}, one diagonal ${d} and the other marked`),
    outline([A, B, C, D]),
    seg(B, D),
    seg(A, C, DASHED),
    sideLabel(A, B, `${b}`, mid),
    sideLabel(D, A, `${a}`, mid),
    lineLabel(B, D, 0.22, `${d}`, lines),
    lineLabel(A, C, 0.78, '?', lines),
    letter(A, 'A', mid),
    letter(B, 'B', mid),
    letter(C, 'C', mid),
    letter(D, 'D', mid),
    '</svg>',
  ].join('');
}

function medianSvg(a: number, b: number, c: number): string {
  const x = (a * a + c * c - b * b) / (2 * a);
  const y = Math.sqrt(Math.max(0, c * c - x * x));
  const [B, C, A] = fit([[0, 0], [a, 0], [x, y]], 230, 140, 35, 24);
  const M = scale(plus(B, C), 0.5);
  const mid = centroid([A, B, C]);
  const lines: [Pt, Pt][] = [[A, B], [B, C], [C, A], [A, M]];
  return [
    svgOpen(188, `Triangle ABC with AB ${c}, AC ${b}, BC ${a} and the median from A to the midpoint M of BC`),
    outline([A, B, C]),
    seg(A, M, DASHED),
    sideLabel(A, B, `${c}`, mid),
    sideLabel(C, A, `${b}`, mid),
    sideLabel(B, M, num(a / 2), mid),
    sideLabel(M, C, num(a / 2), mid),
    lineLabel(A, M, 0.45, '?', lines),
    letter(A, 'A', mid),
    letter(B, 'B', mid),
    letter(C, 'C', mid),
    text(plus(M, [0, 14]), 'M', 13),
    '</svg>',
  ].join('');
}

const cmParallelogram: Generator<ParallelogramParams> = {
  id: 'cm-tr-parallelogram',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const [a, b, c, m] = rng.pick(MEDIANS);
      const flip = rng.next() < 0.5;
      return { kind: 'median', a, b: flip ? c : b, c: flip ? b : c, m };
    }
    const [a, b, p, q] = rng.pick(PARALLELOGRAMS);
    return rng.next() < 0.5 ? { kind: 'diagonal', a, b, given: p, other: q } : { kind: 'diagonal', a, b, given: q, other: p };
  },
  render(p) {
    if (p.kind === 'median') {
      return typed(
        [
          say(`In triangle $ABC$, $AB = ${p.c}$, $AC = ${p.b}$ and $BC = ${p.a}$, and $M$ is the midpoint of $BC$. Find $AM$.`),
          { kind: 'diagram', svg: medianSvg(p.a, p.b, p.c) },
        ],
        p.m,
        'AM =',
      );
    }
    return typed(
      [
        say(`A parallelogram has sides $${p.a}$ and $${p.b}$, and one diagonal $${p.given}$. How long is the other diagonal?`),
        { kind: 'diagram', svg: parallelogramSvg(p.a, p.b, p.given) },
      ],
      p.other,
      'AC =',
    );
  },
  choices(p) {
    if (p.kind === 'median') {
      const { a, b, c, m } = p;
      return surdOptions(mk(m), [mk(b + c, 1, 2), mk(a, 1, 2), mk(1, 2 * (b * b + c * c), 2)]);
    }
    const { a, b, given, other } = p;
    return surdOptions(mk(other), [mk(given), mk(1, a * a + b * b), mk(1, 2 * (a * a + b * b))]);
  },
  solution(p) {
    if (p.kind === 'median') {
      const { a, b, c, m } = p;
      return [
        { text: `Double the median: carry $AM$ on past $M$ to $A'$ with $MA' = AM$. The diagonals of $ABA'C$ cut each other in half, so it is a parallelogram with sides $${c}$ and $${b}$ and diagonals $BC$ and $AA' = 2AM$.` },
        { text: 'The squares of a parallelogram’s diagonals add to the squares of its four sides:' },
        { tex: `(2AM)^{2} + ${a}^{2} = 2(${c}^{2} + ${b}^{2})` },
        { tex: `4AM^{2} = ${2 * (b * b + c * c)} - ${a * a} = ${4 * m * m}` },
        { tex: `AM^{2} = ${m * m}` },
        { tex: `AM = ${m}` },
      ];
    }
    const { a, b, given, other } = p;
    return [
      { text: 'Neighbouring angles of a parallelogram add to $180^\\circ$, so their cosines are opposite. The law of cosines on each diagonal:' },
      { tex: `BD^{2} = ${a}^{2} + ${b}^{2} - 2 \\times ${a} \\times ${b} \\cos A` },
      { tex: `AC^{2} = ${a}^{2} + ${b}^{2} + 2 \\times ${a} \\times ${b} \\cos A` },
      { text: 'Adding them cancels the cosines:' },
      { tex: `AC^{2} + ${given}^{2} = 2(${a}^{2} + ${b}^{2}) = ${2 * (a * a + b * b)}` },
      { tex: `AC^{2} = ${2 * (a * a + b * b)} - ${given * given} = ${other * other}` },
      { tex: `AC = ${other}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Law of Sines
 * ================================================================ */

/* ---------- a/sin A is the diameter ---------- */

interface CircumParams {
  a: number;
  A: number;
}

function circumSvg(a: number, A: number): string {
  const R = 78;
  const O: Pt = [150, 104];
  const at = (deg: number): Pt => [O[0] + R * Math.cos(rad(deg)), O[1] - R * Math.sin(rad(deg))];
  // An obtuse A sits on the short arc between B and C, so it goes in the middle of it, clear of both.
  const PA = at(A > 90 ? 90 : 110);
  const PB = at(-90 - A);
  const PC = at(-90 + A);
  const mid = scale(plus(PB, PC), 0.5);
  const toA = unit(mid, PA);
  const side = A < 90 ? plus(mid, scale(toA, 14)) : plus(mid, scale(toA, -14));
  const out = [
    svgOpen(208, `Triangle ABC with its corners on a circle, BC ${a} and angle A ${A} degrees`),
    `<circle cx="${O[0]}" cy="${O[1]}" r="${R}" fill="none" stroke="currentColor" stroke-width="1.5" />`,
    `<circle cx="${O[0]}" cy="${O[1]}" r="2.5" fill="currentColor" />`,
    outline([PA, PB, PC]),
    text(side, `${a}`),
    letter(PA, 'A', O, 14),
    letter(PB, 'B', O, 14),
    letter(PC, 'C', O, 14),
  ];
  if (A <= 90) out.push(angleMark(PA, PB, PC, `${A}°`));
  out.push('</svg>');
  return out.join('');
}

const cmCircumradius: Generator<CircumParams> = {
  id: 'cm-tr-circumradius',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const A = rng.pick([45, 135, 60, 120]);
      const step = A === 45 || A === 135 ? 2 : 3;
      return { A, a: step * rng.int(2, 11) };
    }
    const A = rng.pick([30, 150, 90]);
    return { A, a: A === 90 ? 2 * rng.int(2, 15) : rng.int(3, 20) };
  },
  render({ a, A }) {
    return typed(
      [
        say(`The corners of triangle $ABC$ lie on a circle. $BC = ${a}$ and $\\angle A = ${A}^\\circ$. Find the radius of the circle.`),
        { kind: 'diagram', svg: circumSvg(a, A) },
      ],
      sAns(div(mk(a), mul(mk(2), exactSin(A)))),
      'R =',
      A === 30 || A === 150 || A === 90 ? [] : EXACT_KEYS,
    );
  },
  choices({ a, A }) {
    const twoR = div(mk(a), exactSin(A));
    const R = mul(twoR, mk(1, 1, 2));
    const slips = [twoR];
    if (A !== 90) slips.push(mul(div(mk(a), exactCos(A)), mk(A > 90 ? -1 : 1, 1, 2)));
    slips.push(mk(a), mk(a, 1, 2));
    return surdOptions(R, slips);
  },
  solution({ a, A }) {
    const s = exactSin(A);
    const twoR = div(mk(a), s);
    const R = mul(twoR, mk(1, 1, 2));
    const steps: SolutionStep[] = [
      { text: 'By the law of sines, each side over the sine of the angle opposite it is the diameter of the circle:' },
      { tex: '2R = \\frac{BC}{\\sin A}' },
    ];
    if (A > 90) steps.push({ tex: `\\sin ${A}^\\circ = \\sin ${180 - A}^\\circ = ${sTex(s)}` });
    else steps.push({ tex: `\\sin ${A}^\\circ = ${sTex(s)}` });
    const over = s.r === 1 ? '' : ` = \\frac{${a * s.d}}{${sTex(mk(s.c, s.r))}}`;
    steps.push({ tex: `2R = ${a} \\div ${sTex(s)}${over} = ${sTex(twoR)}` }, { tex: `R = ${sTex(R)}` });
    return steps;
  },
};

/* ---------- a side from two angles ---------- */

/** sin of the angles used here, as n√r / 2. */
const SINE_ANGLES = [30, 45, 60, 90, 120, 135];

interface SineSideParams {
  A: number;
  B: number;
  /** BC = k√r_A, so the root cancels. */
  k: number;
  /** Difficulty 2 shows ∠C rather than ∠B. */
  showC: boolean;
}

const sideA = ({ A, k }: SineSideParams) => mk(k, exactSin(A).r);
const sideB = (p: SineSideParams) => div(mul(sideA(p), exactSin(p.B)), exactSin(p.A));

const cmSineSide: Generator<SineSideParams> = {
  id: 'cm-tr-sine-side',
  sample(rng, difficulty) {
    for (;;) {
      const A = rng.pick(SINE_ANGLES);
      const B = rng.pick(SINE_ANGLES);
      if (A === B || A + B > 150) continue;
      const k = (A === 90 ? 2 : 1) * rng.int(2, 9);
      const p = { A, B, k, showC: difficulty >= 2 };
      if (sideB(p).d !== 1) continue;
      return p;
    }
  },
  render(p) {
    const { A, B, showC } = p;
    const C = 180 - A - B;
    const a = sideA(p);
    const known = showC ? `$\\angle A = ${A}^\\circ$, $\\angle C = ${C}^\\circ$` : `$\\angle A = ${A}^\\circ$, $\\angle B = ${B}^\\circ$`;
    const sa = Math.sin(rad(A));
    const sb = Math.sin(rad(B));
    const sc = Math.sin(rad(C));
    return typed(
      [
        say(`In triangle $ABC$, ${known} and $BC = ${sTex(a)}$. Find $AC$.`),
        {
          kind: 'diagram',
          svg: triangleSvg([sa, sb, sc], [sText(a), '?', null], [`${A}°`, showC ? null : `${B}°`, showC ? `${C}°` : null], `Triangle ABC with BC ${sText(a)} and the angles marked`),
        },
      ],
      sAns(sideB(p)),
      'AC =',
      EXACT_KEYS,
    );
  },
  choices(p) {
    const a = sideA(p);
    const b = sideB(p);
    const flipped = div(mul(a, exactSin(p.A)), exactSin(p.B));
    return surdOptions(b, [flipped, a, mul(b, mk(2))]);
  },
  solution(p) {
    const { A, B, showC } = p;
    const a = sideA(p);
    const steps: SolutionStep[] = [];
    if (showC) {
      steps.push({ text: '$AC$ is opposite $B$, so find $\\angle B$ first:' }, { tex: `\\angle B = 180^\\circ - ${A}^\\circ - ${180 - A - B}^\\circ = ${B}^\\circ` });
    }
    steps.push(
      { text: 'By the law of sines, each side is in proportion to the sine of the angle opposite it:' },
      { tex: `\\frac{AC}{\\sin ${B}^\\circ} = \\frac{BC}{\\sin ${A}^\\circ}` },
      { tex: `AC = BC \\times \\sin ${B}^\\circ \\div \\sin ${A}^\\circ` },
      { tex: `AC = ${sTex(a)} \\times ${sTex(exactSin(B))} \\div ${sTex(exactSin(A))} = ${sTex(sideB(p))}` },
    );
    return steps;
  },
};

/* ---------- how many triangles: side, side, angle ---------- */

interface SsaParams {
  A: number;
  /** AC. */
  b: number;
  /** BC, opposite A. */
  a: number;
  /** Difficulty 2 asks for the product of the two possible AB. */
  product: boolean;
}

function ssaCount({ A, a, b }: SsaParams): number {
  if (A >= 90) return a > b ? 1 : 0;
  const h = b * Math.sin(rad(A));
  if (same(a, h)) return 1;
  if (a < h) return 0;
  return a < b ? 2 : 1;
}

const cmSsa: Generator<SsaParams> = {
  id: 'cm-tr-ssa',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      for (;;) {
        const A = rng.pick([30, 45, 60]);
        const b = rng.int(6, 20);
        const a = rng.int(2, b - 1);
        const p = { A, b, a, product: true };
        if (ssaCount(p) === 2) return p;
      }
    }
    const want = rng.pick([0, 1, 2, 2]);
    for (;;) {
      const A = rng.pick([30, 30, 45, 60, 120, 150]);
      const b = A === 30 ? 2 * rng.int(3, 10) : rng.int(5, 20);
      const a = rng.int(2, b + 5);
      const p = { A, b, a, product: false };
      if (ssaCount(p) === want) return p;
    }
  },
  render(p) {
    const { A, a, b } = p;
    if (p.product) {
      return typed(
        [
          say(`Two different triangles $ABC$ have $\\angle A = ${A}^\\circ$, $AC = ${b}$ and $BC = ${a}$. Find the product of the two possible lengths of $AB$.`),
        ],
        b * b - a * a,
        '\\text{product} =',
      );
    }
    return typed(
      [say(`A triangle $ABC$ is to have $\\angle A = ${A}^\\circ$, $AC = ${b}$ and $BC = ${a}$. How many different triangles fit?`)],
      ssaCount(p),
      '\\text{triangles} =',
    );
  },
  choices(p) {
    if (p.product) {
      const { a, b } = p;
      return numberOptions(b * b - a * a, [a * b, b * b + a * a, a * a, b * b], 1, 1);
    }
    return numberOptions(ssaCount(p), [2, 1, 0], 1, 0);
  },
  solution(p) {
    const { A, a, b } = p;
    const s = exactSin(A);
    const h = mul(mk(b), s);
    const hTex = isWhole(h) ? sTex(h) : `${sTex(h)} \\approx ${num(Number(sv(h).toFixed(2)))}`;
    if (p.product) {
      const twoCos = mul(mk(2 * b), exactCos(A));
      return [
        { text: 'The law of cosines at $A$, with $AB = x$:' },
        { tex: `${a}^{2} = ${b}^{2} + x^{2} - 2 \\times ${b} \\times x \\cos ${A}^\\circ` },
        { text: 'That is a quadratic in $x$, and its two roots are the two possible lengths:' },
        { tex: `x^{2} - ${sTex(twoCos)}\\,x + ${b * b - a * a} = 0` },
        { text: 'The product of the roots of a quadratic is its constant term:' },
        { tex: `${b}^{2} - ${a}^{2} = ${b * b - a * a}` },
      ];
    }
    if (A >= 90) {
      return [
        { text: `With $\\angle A$ obtuse, the side opposite it must be the longest, so $BC$ must be longer than $AC$.` },
        { text: a > b ? `$${a} > ${b}$, so there is exactly one triangle.` : `$${a} \\le ${b}$, so there is no such triangle.` },
      ];
    }
    const n = ssaCount(p);
    const steps: SolutionStep[] = [
      { text: 'Put $A$ and $C$ down and draw the line from $A$ at the given angle. $B$ is on that line, at a distance $BC$ from $C$. The nearest the line comes to $C$ is the height' },
      { tex: `h = ${b} \\sin ${A}^\\circ = ${hTex}` },
    ];
    if (n === 0) steps.push({ text: `$BC = ${a}$ is shorter than that, so it cannot reach the line: no triangle.` });
    else if (a >= b) steps.push({ text: `$BC = ${a}$ is at least $AC = ${b}$, so of the places where it meets the line, only one is beyond $A$; any other is at or behind $A$, where there is no triangle with that angle. One triangle.` });
    else if (same(a, sv(h))) steps.push({ text: `$BC$ is exactly the height, so it meets the line once, at a right angle: one triangle.` });
    else steps.push({ text: `$BC = ${a}$ is longer than the height but shorter than $AC = ${b}$, so it can swing to meet the line in two places, both beyond $A$: two triangles.` });
    return steps;
  },
};

/* ---------- every side from the circle ---------- */

const ANGLE_SETS = [
  [30, 60, 90],
  [30, 30, 120],
  [45, 45, 90],
];

interface SineTableParams {
  angles: number[];
  /** R = k√rootR. */
  k: number;
  rootR: number;
}

const cmSineTable: Generator<SineTableParams> = {
  id: 'cm-tr-sine-table',
  sample(rng, difficulty) {
    const angles = rng.shuffle(rng.pick(ANGLE_SETS));
    if (difficulty >= 2) return { angles, k: rng.int(1, 6), rootR: rng.pick([2, 3]) };
    return { angles, k: rng.int(2, 12), rootR: 1 };
  },
  render({ angles, k, rootR }) {
    const R = mk(k, rootR);
    const sides = angles.map((A) => mul(mul(mk(2), R), exactSin(A)));
    const slips = [R, mul(R, mk(2)), mul(R, mk(1, 2)), mul(R, mk(1, 3)), mul(R, mk(1, 1, 2)), mul(R, mk(2, 3))];
    return {
      kind: 'table',
      prompt: [say(`The corners of triangle $ABC$ lie on a circle of radius $${sTex(R)}$. Fill in the lengths of its sides.`)],
      columns: ['\\text{side}', '\\text{opposite angle}', '\\text{length}'],
      rows: [
        ['BC', `${angles[0]}^\\circ`, null],
        ['CA', `${angles[1]}^\\circ`, null],
        ['AB', `${angles[2]}^\\circ`, null],
      ],
      bank: surdBank(sides, slips, 3),
      answer: sides.map(sTex),
    };
  },
  solution({ angles, k, rootR }) {
    const R = mk(k, rootR);
    const twoR = mul(mk(2), R);
    return [
      { text: 'By the law of sines, each side is the diameter times the sine of the angle opposite it:' },
      { tex: `2R = ${sTex(twoR)}` },
      ...angles.map((A, i) => ({
        tex: `${['BC', 'CA', 'AB'][i]} = ${sTex(twoR)} \\times ${sTex(exactSin(A))} = ${sTex(mul(twoR, exactSin(A)))}`,
      })),
    ];
  },
};

/* ================================================================
 * Lesson 4: Trigonometric Identities
 * ================================================================ */

/* ---------- square the sum ---------- */

interface SumProductParams {
  m: number;
  n: number;
  /** sin θ − cos θ rather than sin θ + cos θ. */
  diff: boolean;
  /** Difficulty 2 asks for tan θ + 1/tan θ. */
  tanCot: boolean;
}

/** sin θ cos θ as a fraction [top, bottom]. */
function sinCos({ m, n, diff }: SumProductParams): [number, number] {
  return diff ? [n * n - m * m, 2 * n * n] : [m * m - n * n, 2 * n * n];
}

const cmSumProduct: Generator<SumProductParams> = {
  id: 'cm-tr-sum-product',
  sample(rng, difficulty) {
    for (;;) {
      const n = rng.int(2, 9);
      const m = rng.int(1, 2 * n);
      if (gcd(m, n) !== 1 || m === n || m * m >= 2 * n * n) continue;
      return { m, n, diff: rng.next() < 0.5, tanCot: difficulty >= 2 };
    }
  },
  render(p) {
    const [top, bottom] = sinCos(p);
    const lhs = `\\sin\\theta ${p.diff ? '-' : '+'} \\cos\\theta = ${fracTex(p.m, p.n)}`;
    if (p.tanCot) {
      return typed(
        [say('An angle $\\theta$ has'), show(lhs), say('Find $\\tan\\theta + \\dfrac{1}{\\tan\\theta}$.')],
        fracAnswer(bottom, top),
        '\\tan\\theta + \\frac{1}{\\tan\\theta} =',
        FRACTION_KEYS,
      );
    }
    return typed(
      [say('An angle $\\theta$ has'), show(lhs), say('Find $\\sin\\theta\\cos\\theta$.')],
      fracAnswer(top, bottom),
      '\\sin\\theta\\cos\\theta =',
      FRACTION_KEYS,
    );
  },
  choices(p) {
    const [top, bottom] = sinCos(p);
    const { m, n } = p;
    const right = p.tanCot ? mk(bottom, 1, top) : mk(top, 1, bottom);
    const slips = p.tanCot
      ? [mk(-bottom, 1, top), mk(bottom, 1, 2 * top), mk(2 * n * n, 1, m * m), mk(top, 1, bottom)]
      : [mk(-top, 1, bottom), mk(m * m, 1, 2 * n * n), mk(2 * top, 1, bottom), mk(m, 1, 2 * n)];
    return surdOptions(right, slips, false);
  },
  solution(p) {
    const { m, n, diff } = p;
    const [top, bottom] = sinCos(p);
    const sign = diff ? '-' : '+';
    const steps: SolutionStep[] = [
      { text: 'Square both sides. The squares of the sine and cosine add to $1$, which leaves only the cross term:' },
      { tex: `(\\sin\\theta ${sign} \\cos\\theta)^{2} = ${fracTex(m * m, n * n)}` },
      { tex: `1 ${sign} 2\\sin\\theta\\cos\\theta = ${fracTex(m * m, n * n)}` },
      { tex: `\\sin\\theta\\cos\\theta = ${fracTex(top, bottom)}` },
    ];
    if (p.tanCot) {
      steps.push(
        { text: 'Over a common denominator, the top is $\\sin^{2}\\theta + \\cos^{2}\\theta = 1$:' },
        { tex: '\\tan\\theta + \\frac{1}{\\tan\\theta} = \\frac{\\sin^{2}\\theta + \\cos^{2}\\theta}{\\sin\\theta\\cos\\theta} = \\frac{1}{\\sin\\theta\\cos\\theta}' },
        { tex: `1 \\div ${fracTex(top, bottom)} = ${fracTex(bottom, top)}` },
      );
    }
    return steps;
  },
};

/* ---------- divide by cos θ ---------- */

interface TanRatioParams {
  u: number;
  v: number;
  /** Difficulty 1: (c0 sin + c1 cos)/(c2 sin + c3 cos). Difficulty 2: c0 sin² + c1 sin cos + c2 cos². */
  c: number[];
  quadratic: boolean;
}

/** `2\\sin\\theta - \\cos\\theta`: whole coefficients, 1 written bare. */
function combo(terms: [number, string][]): string {
  let out = '';
  for (const [k, t] of terms) {
    if (k === 0) continue;
    const size = Math.abs(k) === 1 && t !== '' ? '' : `${Math.abs(k)}`;
    if (out === '') out = `${k < 0 ? '-' : ''}${size}${t}`;
    else out += ` ${k < 0 ? '-' : '+'} ${size}${t}`;
  }
  return out;
}

/** `\\frac{2 - 15}{4 - 3} = -13`: the terms with tan θ put in, then the value. */
function rawFraction(tops: number[], bottoms: number[]): string {
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  const line = (xs: number[]) =>
    xs
      .filter((x) => x !== 0)
      .map((x, i) => (i === 0 ? `${x}` : `${x < 0 ? '-' : '+'} ${Math.abs(x)}`))
      .join(' ') || '0';
  return `\\frac{${line(tops)}}{${line(bottoms)}} = ${fracTex(sum(tops), sum(bottoms))}`;
}

function tanRatioValue({ u, v, c, quadratic }: TanRatioParams): [number, number] {
  if (quadratic) return [c[0] * u * u + c[1] * u * v + c[2] * v * v, u * u + v * v];
  return [c[0] * u + c[1] * v, c[2] * u + c[3] * v];
}

const cmTanRatio: Generator<TanRatioParams> = {
  id: 'cm-tr-tan-ratio',
  sample(rng, difficulty) {
    for (;;) {
      const v = rng.int(1, 4);
      const u = rng.int(1, 5);
      if (gcd(u, v) !== 1 || u === v) continue;
      const quadratic = difficulty >= 2;
      const c = quadratic
        ? [rng.int(0, 3), rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]), rng.int(0, 3)]
        : [rng.int(1, 4), rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]), rng.int(1, 4), rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])];
      const [top, bottom] = tanRatioValue({ u, v, c, quadratic });
      if (top === 0 || bottom === 0) continue;
      if (!quadratic && c[0] * c[3] === c[1] * c[2]) continue;
      if (quadratic && c[0] === 0 && c[2] === 0) continue;
      return { u, v, c, quadratic };
    }
  },
  render(p) {
    const [top, bottom] = tanRatioValue(p);
    const s = '\\sin\\theta';
    const k = '\\cos\\theta';
    const expr = p.quadratic
      ? combo([[p.c[0], '\\sin^{2}\\theta'], [p.c[1], `${s}${k}`], [p.c[2], '\\cos^{2}\\theta']])
      : `\\frac{${combo([[p.c[0], s], [p.c[1], k]])}}{${combo([[p.c[2], s], [p.c[3], k]])}}`;
    return typed(
      [say(`$\\tan\\theta = ${fracTex(p.u, p.v)}$. Find the value of`), show(expr)],
      fracAnswer(top, bottom),
      '\\text{value} =',
      FRACTION_KEYS,
    );
  },
  choices(p) {
    const [top, bottom] = tanRatioValue(p);
    const { u, v, c } = p;
    const slips = p.quadratic
      ? [mk(c[0] * u * u + c[1] * u * v + c[2] * v * v, 1, v * v), mk(c[0] + c[1] + c[2], 1, 2), mk(-top, 1, bottom), mk(top, 1, 2 * bottom)]
      : [mk(c[0] + c[1], 1, c[2] + c[3]), mk(bottom, 1, top), mk(c[0] * u + c[1] * v, 1, c[2] * v + c[3] * u), mk(-top, 1, bottom)];
    return surdOptions(mk(top, 1, bottom), slips, false);
  },
  solution(p) {
    const t = fracTex(p.u, p.v);
    const { c, u, v } = p;
    if (p.quadratic) {
      const expr = combo([[c[0], '\\tan^{2}\\theta'], [c[1], '\\tan\\theta'], [c[2], '']]) || '0';
      return [
        { text: 'Write it over $\\sin^{2}\\theta + \\cos^{2}\\theta$, which is $1$, then divide top and bottom by $\\cos^{2}\\theta$:' },
        { tex: `\\frac{${expr}}{\\tan^{2}\\theta + 1}` },
        { text: `Put in $\\tan\\theta = ${t}$${p.v === 1 ? '' : ` and multiply top and bottom by $${p.v * p.v}$`}:` },
        { tex: rawFraction([c[0] * u * u, c[1] * u * v, c[2] * v * v], [u * u, v * v]) },
      ];
    }
    return [
      { text: 'Divide the top and the bottom by $\\cos\\theta$. Each $\\sin\\theta$ becomes $\\tan\\theta$ and each $\\cos\\theta$ becomes $1$:' },
      { tex: `\\frac{${combo([[c[0], '\\tan\\theta'], [c[1], '']])}}{${combo([[c[2], '\\tan\\theta'], [c[3], '']])}}` },
      { text: `Put in $\\tan\\theta = ${t}$${p.v === 1 ? '' : ` and multiply top and bottom by $${p.v}$`}:` },
      { tex: rawFraction([c[0] * u, c[1] * v], [c[2] * u, c[3] * v]) },
    ];
  },
};

/* ---------- a sin x + b cos x ---------- */

interface MaxValueParams {
  a: number;
  b: number;
  R: number;
  /** A constant added, and whether the smallest value is asked for. */
  shift: number;
  least: boolean;
  sinFirst: boolean;
}

const cmMaxValue: Generator<MaxValueParams> = {
  id: 'cm-tr-max-value',
  sample(rng, difficulty) {
    for (;;) {
      const [x, y, z] = rng.pick(TRIPLES.slice(0, 4));
      const k = rng.int(1, 3);
      if (k * z > 60) continue;
      const flip = rng.next() < 0.5;
      const a = k * (flip ? y : x);
      const b = k * (flip ? x : y) * rng.sign();
      if (difficulty >= 2) {
        return { a, b, R: k * z, shift: rng.int(3, 30), least: rng.next() < 0.6, sinFirst: rng.next() < 0.5 };
      }
      return { a, b, R: k * z, shift: 0, least: false, sinFirst: rng.next() < 0.5 };
    }
  },
  render(p) {
    const wave = p.sinFirst ? combo([[p.a, '\\sin x'], [p.b, '\\cos x']]) : combo([[p.b, '\\cos x'], [p.a, '\\sin x']]);
    const expr = p.shift ? `${p.shift} ${wave.startsWith('-') ? '- ' + wave.slice(1) : '+ ' + wave}` : wave;
    const answer = p.least ? p.shift - p.R : p.shift + p.R;
    return typed(
      [say(`What is the ${p.least ? 'smallest' : 'largest'} value of this, as $x$ varies?`), show(expr)],
      answer,
      `\\text{${p.least ? 'smallest' : 'largest'}} =`,
    );
  },
  choices(p) {
    const { a, b, R, shift, least } = p;
    const sum = Math.abs(a) + Math.abs(b);
    const answer = least ? shift - R : shift + R;
    const slips = least ? [shift - sum, shift + R, -R, shift - Math.max(Math.abs(a), Math.abs(b))] : [shift + sum, shift + Math.max(Math.abs(a), Math.abs(b)), shift + R * R, shift + R + 1];
    return numberOptions(answer, slips, 1, -1000);
  },
  solution(p) {
    const { a, b, R, shift, least } = p;
    const aa = Math.abs(a);
    const bb = Math.abs(b);
    const steps: SolutionStep[] = [
      { text: 'Take out the length of the vector of coefficients:' },
      { tex: `\\sqrt{${aa}^{2} + ${bb}^{2}} = ${R}` },
      { tex: `${combo([[a, '\\sin x'], [b, '\\cos x']])} = ${R}\\left(\\tfrac{${a}}{${R}}\\sin x ${b < 0 ? '-' : '+'} \\tfrac{${bb}}{${R}}\\cos x\\right)` },
      { text: `The two fractions are the cosine and sine of one angle $\\alpha$, since their squares add to $1$. So the bracket is $\\sin(x ${b < 0 ? '-' : '+'} \\alpha)$, which runs from $-1$ to $1$, and the wave runs from $${-R}$ to $${R}$.` },
    ];
    if (shift) {
      steps.push({ text: `Adding $${shift}$ moves the whole range up:` }, { tex: least ? `${shift} - ${R} = ${shift - R}` : `${shift} + ${R} = ${shift + R}` });
    }
    return steps;
  },
};

/* ---------- double angles, as a table ---------- */

interface DoubleTableParams {
  t: number;
  flip: boolean;
  given: Fn;
  obtuse: boolean;
}

function doubleValues(p: DoubleTableParams) {
  const v = ratioValues({ ...p, asked: p.given });
  const [x, y, h] = TRIPLES[p.t];
  const opp = p.flip ? y : x;
  const adj = p.flip ? x : y;
  return { v, sin2: mul(mk(2), mul(v.sin, v.cos)), cos2: mk(adj * adj - opp * opp, 1, h * h) };
}

const cmDoubleTable: Generator<DoubleTableParams> = {
  id: 'cm-tr-double-table',
  sample(rng, difficulty) {
    return { t: rng.int(0, 4), flip: rng.next() < 0.5, given: rng.pick(FNS), obtuse: difficulty >= 2 };
  },
  render(p) {
    const { v, sin2, cos2 } = doubleValues(p);
    const answer = [v.sin, v.cos, sin2, cos2];
    const rows: (string | null)[][] = [
      ['\\sin\\theta', null],
      ['\\cos\\theta', null],
      ['\\sin 2\\theta', null],
      ['\\cos 2\\theta', null],
    ];
    const blanks = answer.filter((_, i) => !(p.given === 'sin' && i === 0) && !(p.given === 'cos' && i === 1));
    if (p.given === 'sin') rows[0][1] = sTex(v.sin);
    if (p.given === 'cos') rows[1][1] = sTex(v.cos);
    const slips = [neg(sin2), neg(cos2), mul(v.sin, v.cos), neg(v.cos), mul(mk(2), v.sin), neg(v.sin)];
    return {
      kind: 'table',
      prompt: [
        say(p.obtuse ? 'The angle $\\theta$ is between $90^\\circ$ and $180^\\circ$, and' : 'The angle $\\theta$ is acute, and'),
        show(`${fnTex(p.given)} = ${sTex(v[p.given])}`),
        say('Fill in the table.'),
      ],
      columns: ['\\text{ratio}', '\\text{value}'],
      rows,
      bank: surdBank(blanks, slips, 3),
      answer: blanks.map(sTex),
    };
  },
  solution(p) {
    const { v, sin2, cos2 } = doubleValues(p);
    const [x, y, h] = TRIPLES[p.t];
    return [
      { text: `The sides of the right triangle are the triple $${x}, ${y}, ${h}$, which gives $\\sin\\theta$ and $\\cos\\theta$${p.obtuse ? ', the cosine negative between $90^\\circ$ and $180^\\circ$' : ''}:` },
      { tex: `\\sin\\theta = ${sTex(v.sin)}, \\qquad \\cos\\theta = ${sTex(v.cos)}` },
      { tex: `\\sin 2\\theta = 2\\sin\\theta\\cos\\theta = ${sTex(sin2)}` },
      { tex: `\\cos 2\\theta = \\cos^{2}\\theta - \\sin^{2}\\theta = ${sTex(cos2)}` },
    ];
  },
};

/* ================================================================
 * Lesson 5: Roots of Unity
 * ================================================================ */

/* ---------- common roots ---------- */

interface CommonRootsParams {
  exps: number[];
}

const cmCommonRoots: Generator<CommonRootsParams> = {
  id: 'cm-tr-common-roots',
  sample(rng, difficulty) {
    const count = difficulty >= 2 ? 3 : 2;
    for (;;) {
      const exps = Array.from({ length: count }, () => rng.int(4, 60));
      if (new Set(exps).size < count) continue;
      const g = exps.reduce((x, y) => gcd(x, y));
      if (g < 2 || exps.includes(g)) continue;
      if (count === 3 && gcd(exps[0], exps[1]) === g && gcd(exps[1], exps[2]) === g && gcd(exps[0], exps[2]) === g) continue;
      return { exps: exps.sort((x, y) => x - y) };
    }
  },
  render({ exps }) {
    const eqs = exps.map((n) => `$z^{${n}} = 1$`);
    const list = eqs.length === 2 ? `${eqs[0]} and ${eqs[1]}` : `${eqs[0]}, ${eqs[1]} and ${eqs[2]}`;
    return typed([say(`How many complex numbers $z$ satisfy ${eqs.length === 2 ? 'both' : 'all three of'} ${list}?`)], exps.reduce((x, y) => gcd(x, y)), '\\text{solutions} =');
  },
  choices({ exps }) {
    const g = exps.reduce((x, y) => gcd(x, y));
    const pair = gcd(exps[0], exps[1]);
    return numberOptions(g, [pair, 1, exps[0], 2 * g, g - 1], 1, 1);
  },
  solution({ exps }) {
    const g = exps.reduce((x, y) => gcd(x, y));
    const list = exps.join(', ');
    return [
      { text: `If $z^{m} = 1$ and $z^{n} = 1$, then $z$ to any whole combination of $m$ and $n$ is $1$ too, and the highest common factor is one of those combinations. So the common solutions are the solutions of $z^{g} = 1$:` },
      { tex: `\\gcd(${list}) = ${g}` },
      { text: `Each of the ${g} solutions of $z^{${g}} = 1$ works, since every exponent is a multiple of ${g}.` },
    ];
  },
};

/* ---------- counting roots by where they sit ---------- */

interface UnityCountParams {
  n: number;
  /** z^n = −1 rather than 1. */
  minus: boolean;
}

function unityCounts({ n, minus }: UnityCountParams): number[] {
  let real = 0;
  let right = 0;
  let upper = 0;
  for (let k = 0; k < n; k += 1) {
    // The angle is top / n degrees; work in whole numbers to decide exactly.
    const top = ((minus ? 180 : 0) + 360 * k) % (360 * n);
    if (top % (180 * n) === 0) real += 1;
    if (top < 90 * n || top > 270 * n) right += 1;
    if (top > 0 && top < 180 * n) upper += 1;
  }
  return [real, right, upper];
}

const cmUnityCountTable: Generator<UnityCountParams> = {
  id: 'cm-tr-unity-count-table',
  sample(rng, difficulty) {
    return { n: rng.int(5, 40), minus: difficulty >= 2 };
  },
  render(p) {
    const counts = unityCounts(p);
    return {
      kind: 'table',
      prompt: [say(`Sort the solutions of $z^{${p.n}} = ${p.minus ? '-1' : '1'}$. How many are there of each kind?`)],
      columns: ['\\text{solutions}', '\\text{how many}'],
      rows: [
        ['\\text{real}', null],
        ['\\text{real part} > 0', null],
        ['\\text{imaginary part} > 0', null],
      ],
      bank: numberBank(counts, [counts[1] + 1, counts[2] + 1, counts[1] - 1, Math.floor(p.n / 2), 2], 3),
      answer: counts.map(num),
    };
  },
  solution(p) {
    const { n, minus } = p;
    const [real, right, upper] = unityCounts(p);
    const top = Math.floor((n - 1) / (minus ? 2 : 4));
    const steps: SolutionStep[] = minus
      ? [
          { text: `The solutions sit evenly round the unit circle at the angles $\\frac{180^\\circ \\times j}{${n}}$ for the odd numbers $j$, half a step round from where the solutions of $z^{${n}} = 1$ sit.` },
          { text: `Real: ${real === 1 ? `$-1$ is a solution, since ${n} is odd, and $1$ never is` : `neither $1$ nor $-1$ is a solution, since ${n} is even`}, so ${real}.` },
          { text: 'Real part above $0$: the angle is strictly between $-90^\\circ$ and $90^\\circ$, so' },
          { tex: `|j| < \\frac{${n}}{2}` },
          { text: `The odd numbers from $-${top % 2 === 1 ? top : top - 1}$ to $${top % 2 === 1 ? top : top - 1}$: ${right} of them.` },
        ]
      : [
          { text: `The solutions sit evenly round the unit circle at the angles $\\frac{360^\\circ \\times k}{${n}}$, starting at $1$.` },
          { text: `Real: ${real === 2 ? `$1$ and $-1$, since ${n} is even` : `only $1$, since ${n} is odd`}, so ${real}.` },
          { text: 'Real part above $0$: the angle is strictly between $-90^\\circ$ and $90^\\circ$, so' },
          { tex: `|k| < \\frac{${n}}{4}` },
          { text: `That is $k = 0$ and $k = \\pm 1$ up to $\\pm ${top}$: ${right} of them.` },
        ];
    steps.push(
      { text: 'Imaginary part above $0$: leave out the real ones, and the rest pair off above and below the axis:' },
      { tex: `(${n} - ${real}) \\div 2 = ${upper}` },
    );
    return steps;
  },
};

/* ---------- the polygon of the roots ---------- */

interface PolygonParams {
  n: number;
  /** |z|² = k (for n = 3, |z| = k). */
  k: number;
  minus: boolean;
}

/** Whole bases to draw from: z^n = base^power gives |z|² = base. */
const POLYGON_SIZES: Record<number, number[]> = {
  3: [1, 2, 3, 4, 5, 6],
  4: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  6: [1, 2, 3, 4, 5, 6],
  8: [1, 2, 3],
  12: [1, 2, 3],
};

/** The constant c in z^n = ±c. */
function polygonConstant({ n, k }: PolygonParams): number {
  return n === 3 ? k ** 3 : k ** (n / 2);
}

/** |z|². */
const radiusSquared = ({ n, k }: PolygonParams) => (n === 3 ? k * k : k);

/** The area of the polygon: n/2 · r² · sin(360°/n). */
function polygonArea(p: PolygonParams): Surd {
  return mul(mk(p.n * radiusSquared(p), 1, 2), exactSin(360 / p.n));
}

const cmRootPolygon: Generator<PolygonParams> = {
  id: 'cm-tr-root-polygon',
  sample(rng, difficulty) {
    const n = rng.pick([3, 4, 4, 6, 8, 12]);
    return { n, k: rng.pick(POLYGON_SIZES[n]), minus: difficulty >= 2 };
  },
  render(p) {
    const c = polygonConstant(p);
    return typed(
      [say(`The ${p.n} solutions of $z^{${p.n}} = ${p.minus ? '-' : ''}${c}$ are the corners of a polygon in the complex plane. Find its area.`)],
      sAns(polygonArea(p)),
      '\\text{area} =',
      EXACT_KEYS,
    );
  },
  choices(p) {
    const area = polygonArea(p);
    const r2 = radiusSquared(p);
    return surdOptions(area, [mk(p.n * r2, 1, 2), mul(area, mk(2)), mul(area, mk(1, 1, 2)), mul(mk(p.n * polygonConstant(p), 1, 2), exactSin(360 / p.n))]);
  },
  solution(p) {
    const { n } = p;
    const c = polygonConstant(p);
    const r2 = radiusSquared(p);
    const angle = 360 / n;
    return [
      { text: 'Every solution has the same size, found by taking sizes of both sides:' },
      { tex: `|z|^{${n}} = ${c}` },
      { tex: `|z|^{2} = ${r2}` },
      { text: `${p.minus ? 'The minus sign only turns the solutions round the origin; it does not change their size. ' : ''}The ${n} solutions are spread evenly round that circle, so the polygon is ${n} triangles from the centre, each with two sides $|z|$ and $${angle}^\\circ$ between them:` },
      { tex: `\\text{area} = ${n} \\times \\tfrac{1}{2} \\times ${r2} \\times \\sin ${angle}^\\circ` },
      { tex: `= ${fracTex(n * r2, 2)} \\times ${sTex(exactSin(angle))} = ${sTex(polygonArea(p))}` },
    ];
  },
};

/* ---------- the product over the roots ---------- */

interface UnityProductParams {
  n: number;
  a: number;
}

const unityProduct = ({ n, a }: UnityProductParams) => (a === 1 ? n : (a ** n - 1) / (a - 1));

/** The first-quadrant name of ω: `\\cos 72^\\circ + i\\sin 72^\\circ`. */
function omegaTex(n: number): string {
  const angle = 360 / n;
  const arg = Number.isInteger(angle) ? `${angle}^\\circ` : `\\frac{360^\\circ}{${n}}`;
  return `\\omega = \\cos ${arg} + i\\sin ${arg}`;
}

const cmUnityProduct: Generator<UnityProductParams> = {
  id: 'cm-tr-unity-product',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      for (;;) {
        const n = rng.pick([5, 6, 7, 8, 9, 10, 12]);
        const a = rng.pick([1, -1, 2, -2, 3]);
        if (a === 3 && n > 8) continue;
        return { n, a };
      }
    }
    const pool: Record<number, number[]> = {
      3: [-5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9],
      4: [-4, -3, -2, 2, 3, 4, 5, 6],
      5: [-3, -2, 2, 3, 4],
      6: [2, 3],
    };
    const n = rng.pick([3, 3, 4, 4, 5, 6]);
    return { n, a: rng.pick(pool[n]) };
  },
  render({ n, a }) {
    const factor = (k: number) => `(${a} - \\omega${k === 1 ? '' : `^{${k}}`})`;
    const product = n <= 4 ? Array.from({ length: n - 1 }, (_, i) => factor(i + 1)).join('') : `${factor(1)}${factor(2)}\\cdots${factor(n - 1)}`;
    return typed([say('Let'), show(omegaTex(n)), say('Find the value of'), show(product)], unityProduct({ n, a }), '\\text{value} =');
  },
  choices(p) {
    const { n, a } = p;
    const value = unityProduct(p);
    const slips = a === 1 ? [0, 1, n - 1, n + 1] : [a ** n - 1, a ** (n - 1), a ** n, value + a ** n];
    return numberOptions(value, slips, 1, -100000);
  },
  solution(p) {
    const { n, a } = p;
    const value = unityProduct(p);
    const steps: SolutionStep[] = [
      { text: `The powers $${n === 3 ? '1, \\omega, \\omega^{2}' : n === 4 ? '1, \\omega, \\omega^{2}, \\omega^{3}' : `1, \\omega, \\omega^{2}, \\ldots, \\omega^{${n - 1}}`}$ are the ${n} solutions of $z^{${n}} = 1$, so they are the roots of $z^{${n}} - 1$:` },
      { tex: `z^{${n}} - 1 = (z - 1)(z - \\omega)\\cdots(z - \\omega^{${n - 1}})` },
      { text: 'Divide by $z - 1$:' },
      { tex: `(z - \\omega)\\cdots(z - \\omega^{${n - 1}}) = 1 + z + \\cdots + z^{${n - 1}}` },
    ];
    if (a === 1) {
      steps.push({ text: `Put $z = 1$: each of the ${n} terms on the right is $1$.` }, { tex: `\\text{value} = ${n}` });
    } else {
      const base = a < 0 ? `(${a})` : `${a}`;
      steps.push(
        { text: `Put $z = ${a}$. The right side is a geometric series:` },
        { tex: `\\frac{${base}^{${n}} - 1}{${base} - 1} = ${a === 2 ? `${a ** n} - 1` : `\\frac{${a ** n - 1}}{${a - 1}}`} = ${value}` },
      );
    }
    return steps;
  },
};

export const contestTrigonometryGenerators = [
  cmOtherRatio,
  cmBigAngle,
  cmSquareSum,
  cmExactTable,
  cmCosSide,
  cmCosAngle,
  cmCosTable,
  cmParallelogram,
  cmCircumradius,
  cmSineSide,
  cmSsa,
  cmSineTable,
  cmSumProduct,
  cmTanRatio,
  cmMaxValue,
  cmDoubleTable,
  cmCommonRoots,
  cmUnityCountTable,
  cmRootPolygon,
  cmUnityProduct,
] as Generator<unknown>[];

