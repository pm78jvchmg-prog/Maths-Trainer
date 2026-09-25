/**
 * Contest Math, level 5: Similarity and Scaling.
 *
 * Five lessons: similar triangles cut off by a parallel line or crossing in
 * an hourglass, scaling areas and volumes by a percentage or a map scale,
 * the three similar triangles under the altitude of a right triangle and
 * areas compared through a shared height, similarity used to measure things
 * (shadows, a mirror, crossed wires), and coordinate geometry. The idea in
 * each is to find the pair of similar triangles, or the shared height, and
 * compare the right lengths: the whole side and not the piece left over.
 *
 * Level 2 already asks the plain length, area and volume ratios
 * (`cm-scale-factor`, `cm-scale-tiles`, `cm-midpoint-triangles`); these go
 * further. Shared helpers are in `contestMath.ts`.
 */
import type { Generator, SolutionStep } from '../types';
import { gcd, num, numberBank, numberOptions, say, typed } from './contestMath';

/* ================================================================
 * Figures. Plain SVG text only (KaTeX cannot render inside SVG), and
 * `currentColor` throughout so a figure reads in either theme.
 * ================================================================ */

const f1 = (v: number) => v.toFixed(1);

function svg(height: number, label: string, body: string[]): string {
  return [`<svg viewBox="0 0 300 ${height}" width="100%" role="img" aria-label="${label}">`, ...body, '</svg>'].join('');
}

const seg = (x1: number, y1: number, x2: number, y2: number, dashed = false) =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="currentColor" stroke-width="2"${dashed ? ' stroke-dasharray="5 4"' : ''} />`;

const thin = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="currentColor" stroke-width="1" stroke-opacity="0.25" />`;

const txt = (x: number, y: number, text: string, anchor: 'start' | 'middle' | 'end' = 'middle', size = 13) =>
  `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" fill="currentColor" text-anchor="${anchor}" dominant-baseline="middle">${text}</text>`;

const pathOf = (pts: [number, number][]) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${f1(x)} ${f1(y)}`).join(' ') + ' Z';

const shade = (pts: [number, number][]) => `<path class="plot-shade" d="${pathOf(pts)}" />`;

const outline = (pts: [number, number][]) => `<path d="${pathOf(pts)}" fill="none" stroke="currentColor" stroke-width="2" />`;

const dot = (x: number, y: number) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="currentColor" />`;

/** Between two points, `t` of the way from the first. */
const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** A fraction for a solution line: `\\frac{2}{5}` in lowest terms, or a whole number. */
function frac(top: number, bottom: number): string {
  const g = gcd(top, bottom) || 1;
  return bottom / g === 1 ? `${top / g}` : `\\tfrac{${top / g}}{${bottom / g}}`;
}

/** `50\\,000` for large numbers, as a scale is printed. */
function big(n: number): string {
  return n >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : String(n);
}

/** A point in TeX: `(3, -2)`. */
const pt = (x: number, y: number) => `(${x}, ${y})`;

/* ================================================================
 * Lesson 1: Similarity
 * ================================================================ */

/* ---------- a line parallel to one side ---------- */

interface CutParams {
  ad: number;
  db: number;
  bc: number;
  /** Difficulty 1 asks DE; difficulty 2 gives DE and asks DB. */
  ask: 'DE' | 'DB';
}

const cutDE = ({ ad, db, bc }: CutParams) => (bc * ad) / (ad + db);

function cutSvg(p: CutParams): string {
  const A: [number, number] = [150, 22];
  const B: [number, number] = [40, 185];
  const C: [number, number] = [260, 185];
  const t = p.ad / (p.ad + p.db);
  const D = lerp(A, B, t);
  const E = lerp(A, C, t);
  const midAD = lerp(A, D, 0.5);
  const midDB = lerp(D, B, 0.5);
  return svg(212, 'A triangle ABC with a line DE parallel to BC', [
    shade([A, D, E]),
    outline([A, B, C]),
    seg(D[0], D[1], E[0], E[1]),
    txt(A[0], A[1] - 12, 'A'),
    txt(B[0] - 10, B[1] + 4, 'B', 'end'),
    txt(C[0] + 10, C[1] + 4, 'C', 'start'),
    txt(D[0] - 8, D[1], 'D', 'end'),
    txt(E[0] + 8, E[1], 'E', 'start'),
    txt(midAD[0] - 10, midAD[1], `${p.ad}`, 'end'),
    txt(midDB[0] - 10, midDB[1], p.ask === 'DB' ? '?' : `${p.db}`, 'end'),
    txt(150, 203, `${p.bc}`),
    txt(150, D[1] - 9, p.ask === 'DE' ? '?' : `${cutDE(p)}`),
  ]);
}

const cmParallelCut: Generator<CutParams> = {
  id: 'cm-parallel-cut',
  sample(rng, difficulty) {
    for (;;) {
      const ad = rng.int(2, 12);
      const db = rng.int(2, 12);
      if (ad === db) continue;
      const s = ad + db;
      const bc = (s / gcd(ad, s)) * rng.int(1, 6);
      if (bc < 6 || bc > 48) continue;
      return { ad, db, bc, ask: difficulty >= 2 ? 'DB' : 'DE' };
    }
  },
  render(p) {
    const de = cutDE(p);
    const given = p.ask === 'DE' ? `$AD = ${p.ad}$, $DB = ${p.db}$ and $BC = ${p.bc}$` : `$AD = ${p.ad}$, $DE = ${de}$ and $BC = ${p.bc}$`;
    return typed(
      [say(`$DE$ is parallel to $BC$, with ${given}.`), { kind: 'diagram', svg: cutSvg(p) }, say(`How long is $${p.ask}$?`)],
      p.ask === 'DE' ? de : p.db,
      `${p.ask} =`,
    );
  },
  choices(p) {
    const s = p.ad + p.db;
    if (p.ask === 'DE') return numberOptions(cutDE(p), [(p.bc * p.ad) / p.db, (p.bc * p.db) / s, p.bc - p.db, p.bc - s], 1, 1);
    return numberOptions(p.db, [s, (p.ad * cutDE(p)) / p.bc, p.bc - cutDE(p), s + p.ad], 1, 1);
  },
  solution(p) {
    const s = p.ad + p.db;
    const de = cutDE(p);
    const steps: SolutionStep[] = [
      { text: 'With $DE$ parallel to $BC$, triangle $ADE$ has the same angles as triangle $ABC$, so the two are similar. Compare with the **whole** side $AB$, not with $DB$:' },
    ];
    if (p.ask === 'DE') {
      steps.push(
        { tex: `AB = ${p.ad} + ${p.db} = ${s}` },
        { tex: `\\frac{DE}{BC} = \\frac{AD}{AB} = ${frac(p.ad, s)}` },
        { tex: `DE = ${p.bc} \\times ${frac(p.ad, s)} = ${de}` },
      );
    } else {
      steps.push(
        { tex: `\\frac{AB}{AD} = \\frac{BC}{DE} = ${frac(p.bc, de)}` },
        { tex: `AB = ${p.ad} \\times ${frac(p.bc, de)} = ${s}` },
        { tex: `DB = ${s} - ${p.ad} = ${p.db}` },
      );
    }
    return steps;
  },
};

/* ---------- similar triangles, side by side, as a table ---------- */

interface SimTableParams {
  base: [number, number, number];
  p: number;
  q: number;
  /** The row where both sides are given. */
  pair: number;
  /** Difficulty 2: the row whose small side is blank and large side given. */
  back: number | null;
}

const SIDE_NAMES = ['\\text{shortest}', '\\text{middle}', '\\text{longest}'];

const cmSimilarTable: Generator<SimTableParams> = {
  id: 'cm-similar-table',
  sample(rng, difficulty) {
    for (;;) {
      const x = rng.int(2, 8);
      const y = rng.int(x + 1, 9);
      const z = rng.int(y + 1, 11);
      if (x + y <= z) continue;
      const p = rng.int(1, 3);
      const q = rng.int(p + 1, 5);
      if (gcd(p, q) !== 1 || z * q > 50) continue;
      const pair = rng.int(0, 2);
      const back = difficulty >= 2 ? [0, 1, 2].filter((i) => i !== pair)[rng.int(0, 1)] : null;
      return { base: [x, y, z], p, q, pair, back };
    }
  },
  render(s) {
    const small = s.base.map((v) => v * s.p);
    const large = s.base.map((v) => v * s.q);
    const rows = [0, 1, 2].map((i) => {
      if (i === s.pair) return [SIDE_NAMES[i], num(small[i]), num(large[i])];
      if (i === s.back) return [SIDE_NAMES[i], null, num(large[i])];
      return [SIDE_NAMES[i], num(small[i]), null];
    });
    const answer = [0, 1, 2].filter((i) => i !== s.pair).map((i) => (i === s.back ? small[i] : large[i]));
    // The additive slip: add the difference the given pair shows, instead of scaling.
    const diff = large[s.pair] - small[s.pair];
    const slips = [0, 1, 2].filter((i) => i !== s.pair).flatMap((i) => (i === s.back ? [large[i] - diff, large[i] * s.p] : [small[i] + diff, small[i] * s.q]));
    return {
      kind: 'table',
      prompt: [say('These two triangles are similar, with the sides listed in the same order. Fill in the missing sides.')],
      columns: ['\\text{Side}', '\\text{Small}', '\\text{Large}'],
      rows,
      bank: numberBank(answer, slips, 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution(s) {
    const small = s.base.map((v) => v * s.p);
    const large = s.base.map((v) => v * s.q);
    const i = s.pair;
    const steps: SolutionStep[] = [
      { text: `The ${['shortest', 'middle', 'longest'][i]} sides give the scale factor from small to large:` },
      { tex: `${large[i]} \\div ${small[i]} = ${frac(s.q, s.p)}` },
    ];
    for (const j of [0, 1, 2].filter((k) => k !== i)) {
      if (j === s.back) steps.push({ text: 'Going from large to small, divide by it:' }, { tex: `${large[j]} \\div ${frac(s.q, s.p)} = ${small[j]}` });
      else steps.push({ tex: `${small[j]} \\times ${frac(s.q, s.p)} = ${large[j]}` });
    }
    steps.push({ text: `Adding ${large[i] - small[i]} to each side is the trap: similar shapes multiply, they do not add.` });
    return steps;
  },
};

/* ---------- the hourglass: two parallel sides, crossing lines ---------- */

interface HourglassParams {
  ab: number;
  cd: number;
  /** A multiplier: AX = ab·unit, XD = cd·unit. */
  unit: number;
  /** Difficulty 1 gives AX and asks XD; difficulty 2 gives AD and asks AX. */
  whole: boolean;
}

function hourglassSvg(p: HourglassParams): string {
  const top = 28;
  const bottom = 178;
  const k = 220 / Math.max(p.ab, p.cd);
  const wa = p.ab * k;
  const wc = p.cd * k;
  const A: [number, number] = [150 - wa / 2, top];
  const B: [number, number] = [150 + wa / 2, top];
  const C: [number, number] = [150 - wc / 2, bottom];
  const D: [number, number] = [150 + wc / 2, bottom];
  const X: [number, number] = [150, top + ((bottom - top) * p.ab) / (p.ab + p.cd)];
  const mAX = lerp(A, X, 0.5);
  const mXD = lerp(X, D, 0.5);
  const parts = [
    seg(A[0], A[1], B[0], B[1]),
    seg(C[0], C[1], D[0], D[1]),
    seg(A[0], A[1], D[0], D[1]),
    seg(B[0], B[1], C[0], C[1]),
    txt(A[0] - 6, A[1] - 8, 'A', 'end'),
    txt(B[0] + 6, B[1] - 8, 'B', 'start'),
    txt(C[0] - 6, C[1] + 8, 'C', 'end'),
    txt(D[0] + 6, D[1] + 8, 'D', 'start'),
    txt(X[0] + 14, X[1], 'X', 'start'),
    txt(150, top - 12, `${p.ab}`),
    txt(150, bottom + 14, `${p.cd}`),
  ];
  if (p.whole) {
    parts.push(txt(mXD[0] + 10, mXD[1] - 4, `AD = ${(p.ab + p.cd) * p.unit}`, 'start'), txt(mAX[0] - 10, mAX[1] + 4, '?', 'end'));
  } else {
    parts.push(txt(mAX[0] - 10, mAX[1] + 4, `${p.ab * p.unit}`, 'end'), txt(mXD[0] + 10, mXD[1] - 4, '?', 'start'));
  }
  return svg(205, 'Parallel segments AB and CD joined by crossing lines AD and BC, meeting at X', parts);
}

const cmHourglass: Generator<HourglassParams> = {
  id: 'cm-hourglass',
  sample(rng, difficulty) {
    for (;;) {
      const ab = rng.int(2, 15);
      const cd = rng.int(2, 15);
      if (ab === cd || gcd(ab, cd) !== 1) continue;
      const unit = rng.int(1, difficulty >= 2 ? 4 : 3);
      if ((ab + cd) * unit > 60) continue;
      return { ab, cd, unit, whole: difficulty >= 2 };
    }
  },
  render(p) {
    const given = p.whole ? `$AD = ${(p.ab + p.cd) * p.unit}$` : `$AX = ${p.ab * p.unit}$`;
    return typed(
      [
        say(`$AB$ is parallel to $CD$, with $AB = ${p.ab}$ and $CD = ${p.cd}$. The lines $AD$ and $BC$ cross at $X$, and ${given}.`),
        { kind: 'diagram', svg: hourglassSvg(p) },
        say(`How long is $${p.whole ? 'AX' : 'XD'}$?`),
      ],
      p.whole ? p.ab * p.unit : p.cd * p.unit,
      p.whole ? 'AX =' : 'XD =',
    );
  },
  choices(p) {
    const ax = p.ab * p.unit;
    if (!p.whole) return numberOptions(p.cd * p.unit, [(ax * p.ab) / p.cd, ax + p.cd - p.ab, p.cd + p.unit, ax * p.cd], 1, 1);
    const ad = (p.ab + p.cd) * p.unit;
    return numberOptions(ax, [ad / 2, p.cd * p.unit, ad - p.ab, (ad * p.ab) / p.cd], 1, 1);
  },
  solution(p) {
    const ax = p.ab * p.unit;
    const xd = p.cd * p.unit;
    const steps: SolutionStep[] = [
      { text: 'The angles at $X$ are vertically opposite, and $AB$ parallel to $CD$ makes the alternate angles equal. So triangles $ABX$ and $DCX$ are similar, with' },
      { tex: `AX : XD = AB : CD = ${p.ab} : ${p.cd}` },
    ];
    if (p.whole) {
      steps.push(
        { text: `Share $AD$ in that ratio, ${p.ab + p.cd} parts:` },
        { tex: `1 \\text{ part} = ${(p.ab + p.cd) * p.unit} \\div ${p.ab + p.cd} = ${p.unit}` },
        { tex: `AX = ${p.ab} \\times ${p.unit} = ${ax}` },
      );
    } else {
      steps.push({ tex: `XD = ${ax} \\times ${frac(p.cd, p.ab)} = ${xd}` });
    }
    return steps;
  },
};

/* ---------- perimeters of similar triangles ---------- */

interface PerimParams {
  base: [number, number, number];
  k: number;
  /** Difficulty 1 gives the large perimeter and asks a side; 2 gives how much longer the longest side is and asks the perimeter. */
  ask: 'shortest' | 'longest' | 'perimeter';
}

const cmSimilarPerimeter: Generator<PerimParams> = {
  id: 'cm-similar-perimeter',
  sample(rng, difficulty) {
    for (;;) {
      const x = rng.int(3, 9);
      const y = rng.int(x + 1, 11);
      const z = rng.int(y + 1, 13);
      if (x + y <= z) continue;
      const k = rng.int(2, difficulty >= 2 ? 5 : 6);
      if ((x + y + z) * k > 150) continue;
      return { base: [x, y, z], k, ask: difficulty >= 2 ? 'perimeter' : rng.pick(['shortest', 'longest'] as const) };
    }
  },
  render(p) {
    const [x, y, z] = p.base;
    const P = x + y + z;
    if (p.ask === 'perimeter') {
      return typed(
        [
          say(`A triangle has sides ${x}, ${y} and ${z}. A similar triangle is larger, and its longest side is ${z * p.k - z} longer than the first triangle’s longest side.`),
          say('What is the perimeter of the larger triangle?'),
        ],
        P * p.k,
        '\\text{perimeter} =',
      );
    }
    return typed(
      [say(`A triangle has sides ${x}, ${y} and ${z}. A similar triangle has a perimeter of ${P * p.k}.`), say(`How long is its ${p.ask} side?`)],
      (p.ask === 'shortest' ? x : z) * p.k,
      `\\text{${p.ask}} =`,
    );
  },
  choices(p) {
    const [x, y, z] = p.base;
    const P = x + y + z;
    if (p.ask === 'perimeter') {
      const d = z * p.k - z;
      return numberOptions(P * p.k, [P + d, P + 3 * d, z * p.k * 3, P * (p.k + 1)], 1, 1);
    }
    const side = p.ask === 'shortest' ? x : z;
    const other = p.ask === 'shortest' ? z : x;
    return numberOptions(side * p.k, [(P * p.k) / 3, side + P * p.k - P, other * p.k, side * p.k + p.k], 1, 1);
  },
  solution(p) {
    const [x, y, z] = p.base;
    const P = x + y + z;
    if (p.ask === 'perimeter') {
      return [
        { text: 'The larger longest side is' },
        { tex: `${z} + ${z * p.k - z} = ${z * p.k}` },
        { text: 'so the scale factor is' },
        { tex: `${z * p.k} \\div ${z} = ${p.k}` },
        { text: 'Every side is multiplied by it, so the perimeter is too. Adding the difference once is the trap:' },
        { tex: `(${x} + ${y} + ${z}) \\times ${p.k} = ${P * p.k}` },
      ];
    }
    const side = p.ask === 'shortest' ? x : z;
    return [
      { text: 'Every side is multiplied by the scale factor, so the perimeter is too:' },
      { tex: `${x} + ${y} + ${z} = ${P}` },
      { tex: `${P * p.k} \\div ${P} = ${p.k}` },
      { tex: `${side} \\times ${p.k} = ${side * p.k}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Scaling
 * ================================================================ */

/* ---------- a percentage on every length ---------- */

interface PercentScaleParams {
  pct: number;
  up: boolean;
  shape: number;
  /** 2 for an area, 3 for a volume. */
  power: 2 | 3;
}

const FLAT = [
  { what: 'the radius of a circle', of: 'area', are: false },
  { what: 'each side of a square', of: 'area', are: false },
  { what: 'the length and the width of a rectangle', of: 'area', are: true },
  { what: 'every side of a triangle', of: 'area', are: false },
];

const SOLID = [
  { what: 'each edge of a cube', of: 'volume', are: false },
  { what: 'the radius of a sphere', of: 'volume', are: false },
  { what: 'the radius and the height of a cylinder', of: 'volume', are: true },
];

/** A decimal with at most two places, so a slip never prints as 1.527273. */
const clean = (v: number) => Number.isFinite(v) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-9;

/** The new size as a percentage of the old: 1.2² → 144. */
const nowPercent = ({ pct, up, power }: PercentScaleParams) => (up ? 100 + pct : 100 - pct) ** power / 100 ** (power - 1);

const percentChange = (p: PercentScaleParams) => Math.abs(nowPercent(p) - 100);

const cmScalePercent: Generator<PercentScaleParams> = {
  id: 'cm-scale-percent',
  sample(rng, difficulty) {
    const up = rng.chance(0.5);
    const power = difficulty >= 2 ? 3 : 2;
    // A cut stays small enough that the naive answer (power × pct) is still a percentage.
    const pct = 10 * rng.int(1, up ? 10 : power === 2 ? 5 : 3);
    return { pct, up, power, shape: rng.int(0, (power === 2 ? FLAT : SOLID).length - 1) };
  },
  render(p) {
    const s = (p.power === 2 ? FLAT : SOLID)[p.shape];
    const verb = p.up ? 'increase' : 'decrease';
    return typed(
      [say(`${s.what[0].toUpperCase()}${s.what.slice(1)} ${s.are ? 'are' : 'is'} ${p.up ? 'increased' : 'decreased'} by ${p.pct}%.`), say(`By what percentage does its ${s.of} ${verb}?`)],
      percentChange(p),
      `\\text{${verb} (\\%)} =`,
    );
  },
  choices(p) {
    const now = nowPercent(p);
    const answer = percentChange(p);
    const slips = [p.power * p.pct, p.pct, now, p.up ? answer - p.power * p.pct : 100 - p.pct];
    return numberOptions(answer, slips.filter((v) => v > 0 && v !== answer), Number.isInteger(answer) ? 1 : 0.1, 0.01);
  },
  solution(p) {
    const f = (p.up ? 100 + p.pct : 100 - p.pct) / 100;
    const kind = p.power === 2 ? 'area' : 'volume';
    return [
      { text: `Every length is multiplied by ${num(f)}, so the ${kind} is multiplied by its ${p.power === 2 ? 'square' : 'cube'}:` },
      { tex: `${num(f)}^${p.power} = ${num(nowPercent(p) / 100)}` },
      { text: `The ${kind} is now ${num(nowPercent(p))}% of what it was, a${p.up ? ' rise' : ' fall'} of` },
      { tex: p.up ? `${num(nowPercent(p))} - 100 = ${num(percentChange(p))}` : `100 - ${num(nowPercent(p))} = ${num(percentChange(p))}` },
      { text: `percent. ${p.power * p.pct}% is the trap: the ${p.pct}% ${p.power === 2 ? 'is applied twice, and each time to a new size' : 'is applied three times, each time to a new size'}.` },
    ];
  },
};

/* ---------- weight goes with volume ---------- */

interface StatueParams {
  context: number;
  /** Heights small : large = p : q. */
  p: number;
  q: number;
  /** A size unit: heights are p·size and q·size. */
  size: number;
  /** Weights are p³·unit and q³·unit. */
  unit: number;
}

const FIGURES = [
  { things: 'solid bronze statues', one: 'statue', len: 'm', mass: 'kg', sizes: [1, 2], units: [10, 20, 25, 40, 50] },
  { things: 'solid chocolate rabbits', one: 'rabbit', len: 'cm', mass: 'g', sizes: [3, 4, 5, 6], units: [5, 10, 15, 20, 25] },
  { things: 'solid wooden figures', one: 'figure', len: 'cm', mass: 'g', sizes: [5, 6, 8, 10], units: [4, 6, 8, 10, 12] },
];

const cmStatueWeight: Generator<StatueParams> = {
  id: 'cm-statue-weight',
  sample(rng, difficulty) {
    for (;;) {
      const context = rng.int(0, FIGURES.length - 1);
      const c = FIGURES[context];
      const p = difficulty >= 2 ? rng.int(2, 4) : 1;
      const q = difficulty >= 2 ? rng.int(p + 1, 5) : rng.int(2, 4);
      if (gcd(p, q) !== 1) continue;
      return { context, p, q, size: rng.pick(c.sizes), unit: rng.pick(c.units) };
    }
  },
  render(s) {
    const c = FIGURES[s.context];
    const small = s.p * s.size;
    const large = s.q * s.size;
    // Difficulty 1 goes down from the large one; difficulty 2 goes up from the small one.
    const down = s.p === 1;
    const known = down ? `The ${large} ${c.len} tall one weighs ${s.q ** 3 * s.unit} ${c.mass}.` : `The ${small} ${c.len} tall one weighs ${s.p ** 3 * s.unit} ${c.mass}.`;
    return typed(
      [say(`Two ${c.things} have the same shape. One is ${small} ${c.len} tall and the other ${large} ${c.len} tall.`), say(`${known} How much does the other weigh, in ${c.mass === 'kg' ? 'kilograms' : 'grams'}?`)],
      down ? s.unit : s.q ** 3 * s.unit,
      `\\text{${c.mass}} =`,
    );
  },
  choices(s) {
    const down = s.p === 1;
    if (down) {
      const W = s.q ** 3 * s.unit;
      return numberOptions(s.unit, [W / s.q, W / s.q ** 2, W / (3 * s.q)], s.unit, 1);
    }
    const w = s.p ** 3 * s.unit;
    return numberOptions(s.q ** 3 * s.unit, [(w * s.q) / s.p, (w * s.q ** 2) / s.p ** 2, (w * s.q ** 3) / s.p], s.unit, 1);
  },
  solution(s) {
    const c = FIGURES[s.context];
    const down = s.p === 1;
    const steps: SolutionStep[] = [
      { text: 'Weight goes with volume, and volume scales by the cube of the length ratio:' },
      { tex: s.size === 1 ? `\\text{heights } ${s.p} : ${s.q}` : `\\text{heights } ${s.p * s.size} : ${s.q * s.size} = ${s.p} : ${s.q}` },
      { tex: `\\text{weights } ${s.p ** 3} : ${s.q ** 3}` },
    ];
    if (down) steps.push({ tex: `${s.q ** 3 * s.unit} \\div ${s.q ** 3} = ${s.unit}` });
    else steps.push({ tex: `${s.p ** 3 * s.unit} \\times ${frac(s.q ** 3, s.p ** 3)} = ${s.q ** 3 * s.unit}` });
    steps.push({ text: `So the other ${c.one} weighs ${down ? s.unit : s.q ** 3 * s.unit} ${c.mass}.` });
    return steps;
  },
};

/* ---------- areas on a map ---------- */

interface MapParams {
  /** The scale is 1 : scale. */
  scale: number;
  /** Area on the map in cm². */
  mapArea: number;
  /** Difficulty 2 goes from the ground back to the map. */
  back: boolean;
}

// Not 1 : 100 000, where a centimetre is a kilometre and the square changes nothing.
const MAP_SCALES = [10000, 20000, 25000, 50000, 200000, 250000];

/** Kilometres one map centimetre stands for. */
const kmPerCm = (scale: number) => scale / 100000;

const realArea = ({ scale, mapArea }: MapParams) => Number((mapArea * kmPerCm(scale) ** 2).toFixed(6));

const PLACES = ['lake', 'forest', 'park', 'farm', 'marsh'];

const cmMapArea: Generator<MapParams> = {
  id: 'cm-map-area',
  sample(rng, difficulty) {
    for (;;) {
      const scale = rng.pick(MAP_SCALES);
      const mapArea = rng.int(2, 40);
      const p = { scale, mapArea, back: difficulty >= 2 };
      const area = realArea(p);
      if (area < 0.1 || area > 200) continue;
      return p;
    }
  },
  render(p) {
    const place = PLACES[(p.mapArea + p.scale / 10000) % PLACES.length];
    const intro = say(`A map has a scale of $1 : ${big(p.scale)}$.`);
    if (p.back) {
      return typed(
        [intro, say(`A ${place} has a real area of $${num(realArea(p))}\\text{ km}^2$. What area does it cover on the map, in $\\text{cm}^2$?`)],
        p.mapArea,
        '\\text{cm}^2 =',
      );
    }
    return typed(
      [intro, say(`A ${place} covers $${p.mapArea}\\text{ cm}^2$ on the map. What is its real area, in $\\text{km}^2$?`)],
      realArea(p),
      '\\text{km}^2 =',
    );
  },
  choices(p) {
    const r = kmPerCm(p.scale);
    if (p.back) {
      const K = realArea(p);
      return numberOptions(p.mapArea, [K / r, K * r, p.mapArea * 10, p.mapArea * 100], 1, 1);
    }
    const area = realArea(p);
    return numberOptions(area, [p.mapArea * r, area * 10, area / 10, area * 100], r * r, 0.001);
  },
  solution(p) {
    const r = kmPerCm(p.scale);
    const steps: SolutionStep[] = [
      { text: `1 cm on the map is ${big(p.scale).replace(/\\,/g, ' ')} cm on the ground, which is ${num(r)} km. So 1 cm² on the map stands for` },
      { tex: `${num(r)}^2 = ${num(r * r)}\\text{ km}^2` },
    ];
    if (p.back) steps.push({ text: 'Going back, divide by it:' }, { tex: `${num(realArea(p))} \\div ${num(r * r)} = ${p.mapArea}` });
    else steps.push({ tex: `${p.mapArea} \\times ${num(r * r)} = ${num(realArea(p))}` });
    steps.push({ text: `Using ${num(r)} instead of ${num(r * r)} is the trap: an area is two lengths, so the scale is applied twice.` });
    return steps;
  },
};

/* ---------- a map scale, worked through as tiles ---------- */

interface MapTilesParams {
  /** Metres one map centimetre stands for. */
  metres: number;
  mapArea: number;
}

const cmMapTiles: Generator<MapTilesParams> = {
  id: 'cm-map-tiles',
  sample(rng, difficulty) {
    const metres = difficulty >= 2 ? rng.pick([20, 25, 40, 50]) : rng.pick([5, 10, 20]);
    return { metres, mapArea: rng.int(2, difficulty >= 2 ? 9 : 15) };
  },
  render({ metres, mapArea }) {
    const sq = metres * metres;
    return {
      kind: 'tiles',
      prompt: [
        say(`A plan has a scale of $1 : ${big(metres * 100)}$, and a garden covers $${mapArea}\\text{ cm}^2$ on it.`),
        say('Fill in what the plan stands for on the ground, in metres and square metres.'),
      ],
      template: `1\\text{ cm:}\\ {0} \\quad 1\\text{ cm}^2\\text{:}\\ {1} \\quad \\text{garden:}\\ {2}`,
      bank: numberBank([metres, sq, mapArea * sq], [metres * 100, mapArea * metres, 2 * metres, sq * 10], 3),
      answer: [num(metres), num(sq), num(mapArea * sq)],
    };
  },
  solution({ metres, mapArea }) {
    return [
      { text: `1 cm on the plan is ${metres * 100} cm on the ground:` },
      { tex: `${metres * 100}\\text{ cm} = ${metres}\\text{ m}` },
      { text: 'A square centimetre on the plan is a square with that side on the ground:' },
      { tex: `${metres} \\times ${metres} = ${metres * metres}` },
      { tex: `${mapArea} \\times ${metres * metres} = ${mapArea * metres * metres}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Exploring Similarity
 * ================================================================ */

/* ---------- the altitude to the hypotenuse ---------- */

/** Right triangles whose altitude cuts the hypotenuse into whole pieces: legs s, t, hypotenuse r, all times m. */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [6, 8, 10],
  [8, 6, 10],
  [5, 12, 13],
  [12, 5, 13],
];

interface AltitudeParams {
  m: number;
  s: number;
  t: number;
  /** The hypotenuse's multiplier when the legs are asked, or 0 when only CD is. */
  r: number;
  ask: 'CD' | 'AC' | 'BC' | 'DB';
}

/** AD, DB, CD, AC, BC. */
function altitude({ m, s, t, r }: AltitudeParams) {
  return { ad: m * s * s, db: m * t * t, cd: m * s * t, ac: m * s * r, bc: m * t * r };
}

function altitudeSvg(p: AltitudeParams, labels: { ad: string; db: string; cd: string }): string {
  const { ad, db } = altitude(p);
  const A: [number, number] = [30, 172];
  const B: [number, number] = [270, 172];
  const x = 30 + (240 * ad) / (ad + db);
  const h = (240 * Math.sqrt(ad * db)) / (ad + db);
  const C: [number, number] = [x, 172 - h];
  const D: [number, number] = [x, 172];
  return svg(200, 'A right triangle ABC with the altitude CD drawn to the hypotenuse AB', [
    outline([A, B, C]),
    seg(C[0], C[1], D[0], D[1], true),
    `<path d="M ${f1(x)} 162 L ${f1(x + 10)} 162 L ${f1(x + 10)} 172" fill="none" stroke="currentColor" stroke-width="1" />`,
    txt(A[0] - 6, A[1] + 6, 'A', 'end'),
    txt(B[0] + 6, B[1] + 6, 'B', 'start'),
    txt(C[0], C[1] - 10, 'C'),
    txt(D[0], D[1] + 13, 'D'),
    txt((A[0] + x) / 2, 187, labels.ad),
    txt((x + B[0]) / 2, 187, labels.db),
    txt(x - 6, 172 - h / 2, labels.cd, 'end'),
  ]);
}

const cmAltitudeHyp: Generator<AltitudeParams> = {
  id: 'cm-altitude-hyp',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty < 2) {
        const s = rng.int(1, 6);
        const t = rng.int(1, 6);
        const m = rng.int(1, 6);
        if (s === t || gcd(s, t) !== 1 || m * s * s > 120 || m * t * t > 120) continue;
        return { m, s, t, r: 0, ask: 'CD' };
      }
      const [s, t, r] = rng.pick(TRIPLES);
      const m = rng.int(1, 8);
      if (m * s * s > 200 || m * t * t > 200) continue;
      return { m, s, t, r, ask: rng.pick(['AC', 'BC', 'DB'] as const) };
    }
  },
  render(p) {
    const v = altitude(p);
    const given = p.ask === 'DB' ? `$AD = ${v.ad}$ and $CD = ${v.cd}$` : `$AD = ${v.ad}$ and $DB = ${v.db}$`;
    const labels = {
      ad: `${v.ad}`,
      db: p.ask === 'DB' ? '?' : `${v.db}`,
      cd: p.ask === 'CD' ? '?' : p.ask === 'DB' ? `${v.cd}` : '',
    };
    return typed(
      [
        say(`Triangle $ABC$ has a right angle at $C$, and $CD$ is perpendicular to $AB$, with ${given}.`),
        { kind: 'diagram', svg: altitudeSvg(p, labels) },
        say(`How long is $${p.ask}$?`),
      ],
      v[p.ask.toLowerCase() as 'cd' | 'ac' | 'bc' | 'db'],
      `${p.ask} =`,
    );
  },
  choices(p) {
    const v = altitude(p);
    if (p.ask === 'CD') return numberOptions(v.cd, [(v.ad + v.db) / 2, v.db - v.ad, v.cd + p.m, v.cd * 2], 1, 1);
    if (p.ask === 'DB') return numberOptions(v.db, [v.cd * 2 - v.ad, v.cd, v.cd - v.ad, v.ad + v.cd], 1, 1);
    const right = p.ask === 'AC' ? v.ac : v.bc;
    const other = p.ask === 'AC' ? v.bc : v.ac;
    return numberOptions(right, [other, v.cd, v.ad + v.db, right + p.m], 1, 1);
  },
  solution(p) {
    const v = altitude(p);
    const intro = { text: 'The altitude splits $ABC$ into two triangles, $ACD$ and $CBD$. Each shares an angle with $ABC$ and has a right angle, so all three are similar.' };
    if (p.ask === 'CD' || p.ask === 'DB') {
      const steps: SolutionStep[] = [intro, { text: 'From $ACD$ and $CBD$, $AD : CD = CD : DB$, so' }, { tex: 'CD^2 = AD \\times DB' }];
      if (p.ask === 'CD') steps.push({ tex: `CD^2 = ${v.ad} \\times ${v.db} = ${v.cd * v.cd}` }, { tex: `CD = ${v.cd}` });
      else steps.push({ tex: `${v.cd}^2 = ${v.ad} \\times DB` }, { tex: `DB = ${v.cd * v.cd} \\div ${v.ad} = ${v.db}` });
      return steps;
    }
    const piece = p.ask === 'AC' ? 'AD' : 'DB';
    const pv = p.ask === 'AC' ? v.ad : v.db;
    const leg = p.ask === 'AC' ? v.ac : v.bc;
    return [
      intro,
      { text: `From $${p.ask === 'AC' ? 'ACD' : 'CBD'}$ and $ABC$, $${piece} : ${p.ask} = ${p.ask} : AB$, so` },
      { tex: `${p.ask}^2 = ${piece} \\times AB` },
      { tex: `AB = ${v.ad} + ${v.db} = ${v.ad + v.db}` },
      { tex: `${p.ask}^2 = ${pv} \\times ${v.ad + v.db} = ${leg * leg}` },
      { tex: `${p.ask} = ${leg}` },
    ];
  },
};

/* ---------- all three lengths from the altitude, as tiles ---------- */

interface AltTilesParams {
  m: number;
  s: number;
  t: number;
  r: number;
  /** Difficulty 2 gives AD and CD, so DB comes first. */
  fromCD: boolean;
}

const cmAltitudeTiles: Generator<AltTilesParams> = {
  id: 'cm-altitude-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const [s, t, r] = rng.pick(TRIPLES);
      const m = rng.int(1, 12);
      if (m * s * s > 200 || m * t * t > 200) continue;
      return { m, s, t, r, fromCD: difficulty >= 2 };
    }
  },
  render(p) {
    const v = altitude({ ...p, ask: 'CD' });
    const first = p.fromCD ? v.db : v.cd;
    return {
      kind: 'tiles',
      prompt: [
        say(`Triangle $ABC$ has a right angle at $C$, and $CD$ is perpendicular to $AB$, with $AD = ${v.ad}$ and ${p.fromCD ? `$CD = ${v.cd}$` : `$DB = ${v.db}$`}.`),
        say('Fill in the missing lengths.'),
      ],
      template: `${p.fromCD ? 'DB' : 'CD'} = {0}, \\quad AC = {1}, \\quad BC = {2}`,
      bank: numberBank([first, v.ac, v.bc], [v.ad + v.db, Math.abs(v.db - v.ad), v.ac + p.m, v.cd * 2], 3, 1, 1),
      answer: [num(first), num(v.ac), num(v.bc)],
    };
  },
  solution(p) {
    const v = altitude({ ...p, ask: 'CD' });
    const ab = v.ad + v.db;
    return [
      { text: 'The three triangles are similar, which gives three rules:' },
      { tex: 'CD^2 = AD \\times DB' },
      p.fromCD ? { tex: `DB = ${v.cd * v.cd} \\div ${v.ad} = ${v.db}` } : { tex: `CD^2 = ${v.ad} \\times ${v.db} = ${v.cd * v.cd}` },
      { tex: `AB = ${v.ad} + ${v.db} = ${ab}` },
      { tex: `AC^2 = AD \\times AB = ${v.ad} \\times ${ab} = ${v.ac * v.ac}` },
      { tex: `BC^2 = DB \\times AB = ${v.db} \\times ${ab} = ${v.bc * v.bc}` },
      { text: `So $CD = ${v.cd}$, $AC = ${v.ac}$ and $BC = ${v.bc}$.` },
    ];
  },
};

/* ---------- triangles sharing a height ---------- */

interface SharedParams {
  /** BD : DC. */
  m: number;
  n: number;
  /** AE : EB, difficulty 2 only (0 otherwise). */
  r: number;
  s: number;
  unit: number;
}

const sharedTotal = ({ m, n, r, s, unit }: SharedParams) => (m + n) * (r > 0 ? r + s : 1) * unit;
const areaABD = (p: SharedParams) => (sharedTotal(p) * p.m) / (p.m + p.n);
const areaEBD = (p: SharedParams) => (areaABD(p) * p.s) / (p.r + p.s);

function sharedSvg(p: SharedParams): string {
  const A: [number, number] = [110, 22];
  const B: [number, number] = [30, 172];
  const C: [number, number] = [270, 172];
  const D = lerp(B, C, p.m / (p.m + p.n));
  const parts = [];
  if (p.r > 0) {
    const E = lerp(A, B, p.r / (p.r + p.s));
    parts.push(shade([E, B, D]), outline([A, B, C]), seg(A[0], A[1], D[0], D[1]), seg(E[0], E[1], D[0], D[1]), txt(E[0] - 8, E[1], 'E', 'end'));
  } else {
    parts.push(shade([A, B, D]), outline([A, B, C]), seg(A[0], A[1], D[0], D[1]));
  }
  parts.push(txt(A[0], A[1] - 11, 'A'), txt(B[0] - 6, B[1] + 6, 'B', 'end'), txt(C[0] + 6, C[1] + 6, 'C', 'start'), txt(D[0], D[1] + 14, 'D'));
  return svg(198, 'Triangle ABC with a point D on BC joined to A', parts);
}

const cmSharedHeight: Generator<SharedParams> = {
  id: 'cm-shared-height',
  sample(rng, difficulty) {
    for (;;) {
      const m = rng.int(1, 5);
      const n = rng.int(1, 5);
      if (m === n || gcd(m, n) !== 1) continue;
      if (difficulty < 2) return { m, n, r: 0, s: 0, unit: rng.int(2, 15) };
      const r = rng.int(1, 4);
      const s = rng.int(1, 4);
      if (r === s || gcd(r, s) !== 1) continue;
      const unit = rng.int(1, 4);
      if ((m + n) * (r + s) * unit > 200) continue;
      return { m, n, r, s, unit };
    }
  },
  render(p) {
    const lines = [`In triangle $ABC$, $D$ is on $BC$ with $BD : DC = ${p.m} : ${p.n}$`];
    if (p.r > 0) lines.push(`, and $E$ is on $AB$ with $AE : EB = ${p.r} : ${p.s}$`);
    return typed(
      [
        say(`${lines.join('')}. The area of $ABC$ is ${sharedTotal(p)}.`),
        { kind: 'diagram', svg: sharedSvg(p) },
        say(`What is the area of the shaded triangle $${p.r > 0 ? 'EBD' : 'ABD'}$?`),
      ],
      p.r > 0 ? areaEBD(p) : areaABD(p),
      '\\text{area} =',
    );
  },
  choices(p) {
    const T = sharedTotal(p);
    if (p.r > 0) return numberOptions(areaEBD(p), [areaABD(p), (areaABD(p) * p.r) / (p.r + p.s), (T * p.s) / (p.r + p.s), T / 4], 1, 1);
    return numberOptions(areaABD(p), [(T * p.m) / p.n, T / 2, (T * p.n) / (p.m + p.n), T / p.m], 1, 1);
  },
  solution(p) {
    const T = sharedTotal(p);
    const steps: SolutionStep[] = [
      { text: 'Triangles $ABD$ and $ABC$ have the same height, from $A$ down to $BC$. So their areas compare like their bases, $BD : BC$:' },
      { tex: `[ABD] = ${T} \\times ${frac(p.m, p.m + p.n)} = ${areaABD(p)}` },
    ];
    if (p.r > 0) {
      steps.push(
        { text: 'Triangles $EBD$ and $ABD$ have the same height, from $D$ to the line $AB$. So compare their bases, $EB : AB$:' },
        { tex: `[EBD] = ${areaABD(p)} \\times ${frac(p.s, p.r + p.s)} = ${areaEBD(p)}` },
      );
    }
    return steps;
  },
};

/* ---------- the diagonals of a trapezium ---------- */

interface TrapParams {
  a: number;
  b: number;
  /** Lengths are a·len and b·len; the ratio is what matters. */
  len: number;
  /** [ABX] = a²·u. */
  u: number;
  whole: boolean;
}

const trapAreas = ({ a, b, u }: TrapParams) => ({ top: a * a * u, bottom: b * b * u, side: a * b * u, whole: (a + b) ** 2 * u });

function trapSvg(p: TrapParams): string {
  const k = 210 / p.b;
  const wa = p.a * k;
  const top = 30;
  const bottom = 170;
  const A: [number, number] = [150 - wa / 2, top];
  const B: [number, number] = [150 + wa / 2, top];
  const C: [number, number] = [255, bottom];
  const D: [number, number] = [45, bottom];
  const X: [number, number] = [150, top + ((bottom - top) * p.a) / (p.a + p.b)];
  return svg(200, 'A trapezium ABCD with AB parallel to DC and its diagonals crossing at X', [
    p.whole ? shade([A, B, C, D]) : shade([D, C, X]),
    outline([A, B, C, D]),
    seg(A[0], A[1], C[0], C[1]),
    seg(B[0], B[1], D[0], D[1]),
    txt(A[0] - 6, A[1] - 6, 'A', 'end'),
    txt(B[0] + 6, B[1] - 6, 'B', 'start'),
    txt(C[0] + 6, C[1] + 6, 'C', 'start'),
    txt(D[0] - 6, D[1] + 6, 'D', 'end'),
    txt(X[0], X[1] - 12, 'X'),
    txt(150, top - 13, `${p.a * p.len}`),
    txt(150, bottom + 15, `${p.b * p.len}`),
  ]);
}

const cmTrapezium: Generator<TrapParams> = {
  id: 'cm-trapezium',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(1, 4);
      const b = rng.int(a + 1, 6);
      if (gcd(a, b) !== 1) continue;
      const u = rng.int(1, difficulty >= 2 ? 6 : 10);
      const len = rng.int(1, 3);
      if ((a + b) ** 2 * u > 250) continue;
      return { a, b, len, u, whole: difficulty >= 2 };
    }
  },
  render(p) {
    const v = trapAreas(p);
    return typed(
      [
        say(`$ABCD$ is a trapezium with $AB$ parallel to $DC$, $AB = ${p.a * p.len}$ and $DC = ${p.b * p.len}$. Its diagonals cross at $X$, and triangle $ABX$ has area ${v.top}.`),
        { kind: 'diagram', svg: trapSvg(p) },
        say(p.whole ? 'What is the area of the whole trapezium?' : 'What is the area of triangle $DCX$?'),
      ],
      p.whole ? v.whole : v.bottom,
      '\\text{area} =',
    );
  },
  choices(p) {
    const v = trapAreas(p);
    if (p.whole) return numberOptions(v.whole, [v.top + v.bottom, v.top + v.bottom + v.side, 2 * (v.top + v.bottom), v.whole + v.side], 1, 1);
    return numberOptions(v.bottom, [(v.top * p.b) / p.a, v.top + (p.b - p.a) * p.len, v.side, (v.top * p.b ** 3) / p.a ** 3], 1, 1);
  },
  solution(p) {
    const v = trapAreas(p);
    const steps: SolutionStep[] = [
      { text: 'With $AB$ parallel to $DC$, triangles $ABX$ and $CDX$ are similar (an hourglass). The scale factor is' },
      { tex: `DC \\div AB = ${frac(p.b, p.a)}` },
      { text: 'Areas scale by its square:' },
      { tex: `[DCX] = ${v.top} \\times ${frac(p.b * p.b, p.a * p.a)} = ${v.bottom}` },
    ];
    if (p.whole) {
      steps.push(
        { text: 'Triangles $ABX$ and $ADX$ share the height from $A$, and their bases $BX : XD$ are in the same ratio, so' },
        { tex: `[ADX] = ${v.top} \\times ${frac(p.b, p.a)} = ${v.side}` },
        { text: 'and $[BCX]$ is the same. Add the four pieces:' },
        { tex: `${v.top} + ${v.bottom} + ${v.side} + ${v.side} = ${v.whole}` },
      );
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 4: Applying Similarity
 * ================================================================ */

/* ---------- shadows ---------- */

interface ShadowParams {
  /** Difficulty 1: post height and shadow, and j with the tall shadow j·shadow. */
  h: number;
  s: number;
  j: number;
  /** Difficulty 2: person height in tenths of a metre, distance from the lamp post. */
  d: number;
  lamp: boolean;
  thing: number;
}

const TALL = ['tree', 'flagpole', 'church spire', 'crane', 'lighthouse'];

/** Lamp height for the lamp-post version. */
const lampHeight = ({ h, s, d }: ShadowParams) => (h * (d + s)) / (10 * s);

function lampSvg(p: ShadowParams): string {
  const H = lampHeight(p);
  const span = p.d + p.s;
  const k = Math.min(230 / span, 150 / H);
  const g = 175;
  const x0 = 35;
  const px = x0 + p.d * k;
  const tip = x0 + span * k;
  const ph = (p.h / 10) * k;
  return svg(205, 'A lamp post, a person standing some way from it, and the person’s shadow', [
    seg(15, g, 290, g),
    seg(x0, g, x0, g - H * k),
    `<circle cx="${f1(x0)}" cy="${f1(g - H * k)}" r="5" fill="currentColor" />`,
    seg(px, g, px, g - ph),
    seg(x0, g - H * k, tip, g, true),
    txt(x0 + (p.d * k) / 2, g + 14, `${p.d} m`),
    txt(px + (p.s * k) / 2, g + 14, `${p.s} m`),
    txt(px + 6, g - ph / 2, `${num(p.h / 10)} m`, 'start'),
    txt(x0 - 6, g - (H * k) / 2, '?', 'end'),
  ]);
}

const cmShadowHeight: Generator<ShadowParams> = {
  id: 'cm-shadow-height',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty < 2) {
        const h = rng.int(1, 5);
        const s = rng.int(1, 6);
        if (h === s || gcd(h, s) !== 1) continue;
        return { h, s, j: rng.int(2, 9), d: 0, lamp: false, thing: rng.int(0, TALL.length - 1) };
      }
      const h = rng.pick([12, 15, 16, 18, 20]);
      const s = rng.int(1, 5);
      const d = rng.int(1, 12);
      if (d === s) continue;
      const H = lampHeight({ h, s, d, j: 0, lamp: true, thing: 0 });
      if (!Number.isInteger(H * 10) || H > 12) continue;
      return { h, s, j: 0, d, lamp: true, thing: 0 };
    }
  },
  render(p) {
    if (p.lamp) {
      return typed(
        [
          say(`Jo is ${num(p.h / 10)} m tall and stands ${p.d} m from a lamp post. The lamp at its top casts her shadow, which is ${p.s} m long.`),
          { kind: 'diagram', svg: lampSvg(p) },
          say('How tall is the lamp post, in metres?'),
        ],
        lampHeight(p),
        '\\text{height} =',
      );
    }
    const thing = TALL[p.thing];
    return typed(
      [say(`At the same moment, a ${p.h} m post casts a ${p.s} m shadow and a ${thing} casts a ${p.s * p.j} m shadow.`), say(`How tall is the ${thing}, in metres?`)],
      p.h * p.j,
      '\\text{height} =',
    );
  },
  choices(p) {
    if (p.lamp) {
      const H = lampHeight(p);
      const h = p.h / 10;
      return numberOptions(H, [(h * p.d) / p.s, (h * (p.d + p.s)) / p.d, h + p.d, H + 1].filter(clean), 0.5, 0.1);
    }
    const tall = p.s * p.j;
    return numberOptions(p.h * p.j, [(tall * p.s) / p.h, p.h + tall - p.s, tall, p.h * p.j + p.h], 1, 1);
  },
  solution(p) {
    if (p.lamp) {
      const h = p.h / 10;
      const H = lampHeight(p);
      return [
        { text: 'The ray from the lamp passes over Jo’s head to the tip of her shadow. Jo and her shadow make a small triangle, and the post and the whole ground to the tip make a similar large one.' },
        { text: 'The large triangle’s base is the distance to Jo plus the shadow:' },
        { tex: `${p.d} + ${p.s} = ${p.d + p.s}` },
        { tex: `\\frac{\\text{post}}{${num(h)}} = \\frac{${p.d + p.s}}{${p.s}}` },
        { tex: `\\text{post} = ${num(h)} \\times ${p.d + p.s} \\div ${p.s} = ${num(H)}` },
      ];
    }
    const thing = TALL[p.thing];
    return [
      { text: 'The sun’s rays are parallel, so every upright thing makes the same shape of triangle with its shadow. Its shadow is' },
      { tex: `${p.s * p.j} \\div ${p.s} = ${p.j}` },
      { text: `times the post’s, so the ${thing} is ${p.j} times as tall:` },
      { tex: `${p.h} \\times ${p.j} = ${p.h * p.j}` },
    ];
  },
};

/* ---------- a mirror on the ground ---------- */

interface MirrorParams {
  /** Eye height in tenths of a metre. */
  eye: number;
  /** Distance from the person to the mirror. */
  a: number;
  /** The building is j times as tall as the eyes, and j times as far from the mirror. */
  j: number;
  askDistance: boolean;
}

const building = ({ eye, j }: MirrorParams) => (eye * j) / 10;

function mirrorSvg(p: MirrorParams): string {
  const b = p.a * p.j;
  const H = building(p);
  const e = p.eye / 10;
  const span = p.a + b;
  const k = Math.min(250 / span, 140 / H);
  const g = 172;
  const px = 25;
  const mx = px + p.a * k;
  const bx = mx + b * k;
  return svg(200, 'A person, a mirror on the ground, and a building, with the line of sight bouncing off the mirror', [
    seg(10, g, 292, g),
    seg(px, g, px, g - e * k),
    `<rect x="${f1(bx)}" y="${f1(g - H * k)}" width="12" height="${f1(H * k)}" fill="none" stroke="currentColor" stroke-width="2" />`,
    seg(px, g - e * k, mx, g, true),
    seg(mx, g, bx, g - H * k, true),
    `<rect x="${f1(mx - 7)}" y="${f1(g - 2)}" width="14" height="4" fill="currentColor" />`,
    txt((px + mx) / 2, g + 14, p.askDistance ? '?' : `${p.a} m`),
    txt((mx + bx) / 2, g + 14, `${b} m`),
    txt(px + 5, g - (e * k) / 2 - 8, `${num(e)} m`, 'start', 12),
    txt(bx + 16, g - (H * k) / 2, p.askDistance ? `${num(H)} m` : '?', 'start'),
  ]);
}

const cmMirrorHeight: Generator<MirrorParams> = {
  id: 'cm-mirror-height',
  sample(rng, difficulty) {
    for (;;) {
      const eye = rng.pick([14, 15, 16, 18, 20]);
      const a = rng.int(1, 5);
      const j = rng.int(3, 15);
      if (building({ eye, a, j, askDistance: false }) > 25 || a * j > 60) continue;
      return { eye, a, j, askDistance: difficulty >= 2 };
    }
  },
  render(p) {
    const b = p.a * p.j;
    const e = num(p.eye / 10);
    if (p.askDistance) {
      return typed(
        [
          say(`A building is ${num(building(p))} m tall. A mirror lies flat on the ground ${b} m from it. Ali’s eyes are ${e} m above the ground.`),
          { kind: 'diagram', svg: mirrorSvg(p) },
          say('How far from the mirror must Ali stand, on the other side, to see the top of the building in it?'),
        ],
        p.a,
        '\\text{metres} =',
      );
    }
    return typed(
      [
        say(`A mirror lies flat on the ground ${b} m from a building. Ali’s eyes are ${e} m above the ground, and standing ${p.a} m from the mirror he just sees the top of the building in it.`),
        { kind: 'diagram', svg: mirrorSvg(p) },
        say('How tall is the building, in metres?'),
      ],
      building(p),
      '\\text{height} =',
    );
  },
  choices(p) {
    const b = p.a * p.j;
    const e = p.eye / 10;
    if (p.askDistance) return numberOptions(p.a, [p.j, p.a * 2, p.a + 1, p.a + 2], 1, 1);
    return numberOptions(building(p), [e + b - p.a, b, e * b, building(p) + e].filter(clean), 0.5, 0.1);
  },
  solution(p) {
    const b = p.a * p.j;
    const e = num(p.eye / 10);
    const H = num(building(p));
    const steps: SolutionStep[] = [
      { text: 'Light leaves a mirror at the same angle it arrives. So Ali’s triangle (eyes, feet, mirror) and the building’s triangle (top, foot, mirror) have the same angles and are similar:' },
    ];
    if (p.askDistance) {
      steps.push(
        { tex: `\\frac{\\text{distance}}{${e}} = \\frac{${b}}{${H}}` },
        { tex: `\\text{distance} = ${e} \\times ${b} \\div ${H} = ${p.a}` },
      );
    } else {
      steps.push({ tex: `\\frac{\\text{height}}{${e}} = \\frac{${b}}{${p.a}} = ${p.j}` }, { tex: `\\text{height} = ${e} \\times ${p.j} = ${H}` });
    }
    return steps;
  },
};

/* ---------- crossed wires between two poles ---------- */

interface PolesParams {
  a: number;
  b: number;
  gap: number;
  /** Difficulty 2 gives the crossing height and one pole, and asks the other. */
  askPole: boolean;
}

const crossing = ({ a, b }: PolesParams) => (a * b) / (a + b);

function polesSvg(p: PolesParams, labels: { a: string; b: string; h: string }): string {
  const k = 140 / Math.max(p.a, p.b);
  const g = 172;
  const L = 60;
  const R = 240;
  const h = crossing(p);
  const x = L + ((R - L) * p.b) / (p.a + p.b);
  // Where the two wires meet: from (L, top a) to (R, g) and from (R, top b) to (L, g).
  return svg(200, 'Two upright poles with a wire from the top of each to the foot of the other', [
    seg(20, g, 280, g),
    seg(L, g, L, g - p.a * k),
    seg(R, g, R, g - p.b * k),
    seg(L, g - p.a * k, R, g, true),
    seg(R, g - p.b * k, L, g, true),
    thin(x, g, x, g - h * k),
    dot(x, g - h * k),
    txt(L - 8, g - (p.a * k) / 2, labels.a, 'end'),
    txt(R + 8, g - (p.b * k) / 2, labels.b, 'start'),
    txt(x + 6, g - (h * k) / 2 + 6, labels.h, 'start'),
    txt(150, g + 15, `${p.gap} m`),
  ]);
}

const cmCrossedPoles: Generator<PolesParams> = {
  id: 'cm-crossed-poles',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(2, 30);
      const b = rng.int(2, 40);
      if (a === b || !Number.isInteger(crossing({ a, b, gap: 0, askPole: false }))) continue;
      const gap = rng.int(3, 30);
      return { a, b, gap, askPole: difficulty >= 2 };
    }
  },
  render(p) {
    const h = crossing(p);
    if (p.askPole) {
      return typed(
        [
          say(`Two upright poles stand ${p.gap} m apart, and one is ${p.a} m tall. A wire runs from the top of each pole to the foot of the other, and the wires cross ${h} m above the ground.`),
          { kind: 'diagram', svg: polesSvg(p, { a: `${p.a} m`, b: '?', h: `${h} m` }) },
          say('How tall is the other pole, in metres?'),
        ],
        p.b,
        '\\text{height} =',
      );
    }
    return typed(
      [
        say(`Two upright poles, ${p.a} m and ${p.b} m tall, stand ${p.gap} m apart. A wire runs from the top of each pole to the foot of the other.`),
        { kind: 'diagram', svg: polesSvg(p, { a: `${p.a} m`, b: `${p.b} m`, h: '?' }) },
        say('How high above the ground do the wires cross, in metres?'),
      ],
      h,
      '\\text{height} =',
    );
  },
  choices(p) {
    const h = crossing(p);
    if (p.askPole) return numberOptions(p.b, [p.a - h, 2 * h, p.a + h, (p.a * h) / (p.a + h), 2 * h - p.a], 1, 1);
    return numberOptions(h, [(p.a + p.b) / 2, (p.a + p.b) / 4, p.gap / 2, Math.min(p.a, p.b) / 2], 1, 1);
  },
  solution(p) {
    const h = crossing(p);
    const steps: SolutionStep[] = [
      { text: `Say the wires cross $x$ m from the ${p.a} m pole. Each wire makes a pair of similar triangles with the pole it starts from:` },
      { tex: `\\frac{h}{${p.a}} = \\frac{${p.gap} - x}{${p.gap}}` },
      { tex: `\\frac{h}{${p.b}} = \\frac{x}{${p.gap}}` },
      { text: 'Add them, and the distance cancels:' },
      { tex: `\\frac{h}{${p.a}} + \\frac{h}{${p.b}} = 1` },
    ];
    if (p.askPole) {
      steps.push(
        { tex: `\\frac{1}{b} = \\frac{1}{${h}} - \\frac{1}{${p.a}} = \\frac{1}{${p.b}}` },
        { tex: `b = ${p.b}` },
      );
    } else {
      steps.push(
        { tex: `\\frac{1}{h} = \\frac{1}{${p.a}} + \\frac{1}{${p.b}} = \\frac{1}{${h}}` },
        { tex: `h = ${h}` },
        { text: `The ${p.gap} m between the poles never mattered.` },
      );
    }
    return steps;
  },
};

/* ---------- a table of shadows ---------- */

interface ShadowTableParams {
  /** Height : shadow = p : q. */
  p: number;
  q: number;
  /** Size multipliers for the stick and the three objects. */
  v: [number, number, number, number];
  /** Which of the three objects has its height given (else its shadow). */
  heightGiven: [boolean, boolean, boolean];
}

const OBJECTS = ['\\text{stick}', '\\text{wall}', '\\text{tree}', '\\text{mast}'];

function shadowCells({ p, q, v, heightGiven }: ShadowTableParams) {
  const rows: (string | null)[][] = [[OBJECTS[0], num(p * v[0]), num(q * v[0])]];
  const answer: number[] = [];
  const slips: number[] = [];
  for (let i = 1; i <= 3; i += 1) {
    const h = p * v[i];
    const s = q * v[i];
    if (heightGiven[i - 1]) {
      rows.push([OBJECTS[i], num(h), null]);
      answer.push(s);
      slips.push((h * p) / q, h + (q - p) * v[0]);
    } else {
      rows.push([OBJECTS[i], null, num(s)]);
      answer.push(h);
      slips.push((s * q) / p, s - (q - p) * v[0]);
    }
  }
  return { rows, answer, slips };
}

const cmShadowTable: Generator<ShadowTableParams> = {
  id: 'cm-shadow-table',
  sample(rng, difficulty) {
    for (;;) {
      let p: number;
      let q: number;
      if (difficulty >= 2) {
        p = rng.int(2, 5);
        q = rng.int(2, 7);
      } else if (rng.chance(0.5)) {
        p = 1;
        q = rng.int(2, 4);
      } else {
        p = rng.int(2, 4);
        q = 1;
      }
      if (p === q || gcd(p, q) !== 1) continue;
      const v = [rng.int(1, 3), rng.int(1, 6), rng.int(2, 9), rng.int(3, 12)] as [number, number, number, number];
      if (new Set(v.slice(1)).size < 3) continue;
      const params = { p, q, v, heightGiven: [rng.chance(0.5), rng.chance(0.5), rng.chance(0.5)] as [boolean, boolean, boolean] };
      const { answer } = shadowCells(params);
      if (new Set(answer).size < 3 || Math.max(p, q) * v[3] > 60) continue;
      return params;
    }
  },
  render(s) {
    const { rows, answer, slips } = shadowCells(s);
    return {
      kind: 'table',
      prompt: [say('All four shadows were measured at the same moment on a sunny day. Fill in the missing heights and shadow lengths, in metres.')],
      columns: ['\\text{Object}', '\\text{Height}', '\\text{Shadow}'],
      rows,
      bank: numberBank(answer, slips.filter((v) => Number.isInteger(v)), 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution(s) {
    const { p, q, v } = s;
    const steps: SolutionStep[] = [
      { text: 'The sun’s rays are parallel, so every height and its shadow are in the same ratio as the stick’s:' },
      { tex: v[0] === 1 ? `\\text{height} : \\text{shadow} = ${p} : ${q}` : `\\text{height} : \\text{shadow} = ${p * v[0]} : ${q * v[0]} = ${p} : ${q}` },
    ];
    for (let i = 1; i <= 3; i += 1) {
      const name = ['wall', 'tree', 'mast'][i - 1];
      steps.push(
        s.heightGiven[i - 1]
          ? { tex: `\\text{${name}: } ${p * v[i]} \\times ${frac(q, p)} = ${q * v[i]}` }
          : { tex: `\\text{${name}: } ${q * v[i]} \\times ${frac(p, q)} = ${p * v[i]}` },
      );
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 5: Coordinate Geometry
 * ================================================================ */

/* ---------- distance between two points ---------- */

const PYTH: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [6, 8, 10],
  [8, 6, 10],
  [8, 15, 17],
  [15, 8, 17],
  [9, 12, 15],
  [12, 9, 15],
];

interface DistanceParams {
  x: number;
  y: number;
  dx: number;
  dy: number;
  d: number;
  /** Difficulty 2 hides the second point's y and asks for it. */
  findY: boolean;
}

const cmCoordDistance: Generator<DistanceParams> = {
  id: 'cm-coord-distance',
  sample(rng, difficulty) {
    const [a, b, d] = rng.pick(PYTH);
    return { x: rng.int(-6, 9), y: rng.int(-6, 9), dx: a * rng.sign(), dy: b * (difficulty >= 2 ? 1 : rng.sign()), d, findY: difficulty >= 2 };
  },
  render(p) {
    const x2 = p.x + p.dx;
    const y2 = p.y + p.dy;
    if (p.findY) {
      return typed(
        [say(`The points $${pt(p.x, p.y)}$ and $(${x2}, k)$ are ${p.d} units apart, and $k > ${p.y}$.`), say('Find $k$.')],
        y2,
        'k =',
      );
    }
    return typed([say(`How far apart are the points $${pt(p.x, p.y)}$ and $${pt(x2, y2)}$?`)], p.d, '\\text{distance} =');
  },
  choices(p) {
    const a = Math.abs(p.dx);
    const b = Math.abs(p.dy);
    if (p.findY) return numberOptions(p.y + p.dy, [p.y + p.d, p.y - p.dy, p.y + a, p.dy], 1, -Infinity);
    return numberOptions(p.d, [a + b, a * a + b * b, Math.max(a, b) + 1, p.d + 1], 1, 1);
  },
  solution(p) {
    const a = Math.abs(p.dx);
    const b = Math.abs(p.dy);
    if (p.findY) {
      return [
        { text: `Across, the points are ${a} apart. Draw the right triangle with the ${p.d}-unit line as its longest side:` },
        { tex: `${a}^2 + \\text{up}^2 = ${p.d}^2` },
        { tex: `\\text{up}^2 = ${p.d * p.d} - ${a * a} = ${b * b}` },
        { tex: `\\text{up} = ${b}` },
        { text: `Since $k > ${p.y}$, go up rather than down:` },
        { tex: `k = ${p.y} + ${b} = ${p.y + b}` },
      ];
    }
    return [
      { text: `Across, the points are ${a} apart, and up and down ${b} apart. The distance is the longest side of that right triangle:` },
      { tex: `${a}^2 + ${b}^2 = ${a * a + b * b}` },
      { tex: `\\sqrt{${a * a + b * b}} = ${p.d}` },
    ];
  },
};

/* ---------- the fourth corner of a parallelogram ---------- */

interface ParaParams {
  A: [number, number];
  B: [number, number];
  C: [number, number];
  /** Difficulty 2 gives A, B and the centre, and asks C and D. */
  centre: boolean;
}

const fourth = ({ A, B, C }: ParaParams): [number, number] => [A[0] + C[0] - B[0], A[1] + C[1] - B[1]];

const cmParallelogramVertex: Generator<ParaParams> = {
  id: 'cm-parallelogram-vertex',
  sample(rng, difficulty) {
    for (;;) {
      const A: [number, number] = [rng.int(-5, 6), rng.int(-5, 6)];
      const B: [number, number] = [rng.int(-5, 8), rng.int(-5, 8)];
      const C: [number, number] = [rng.int(-5, 9), rng.int(-5, 9)];
      const cross = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      if (cross === 0) continue;
      const p = { A, B, C, centre: difficulty >= 2 };
      const D = fourth(p);
      if (difficulty >= 2) {
        // The centre is the midpoint of AC, so A + C must be even in both coordinates.
        if ((A[0] + C[0]) % 2 !== 0 || (A[1] + C[1]) % 2 !== 0) continue;
        if (new Set([C[0], C[1], D[0], D[1]]).size < 4) continue;
      } else if (D[0] === D[1]) continue;
      return p;
    }
  },
  render(p) {
    const D = fourth(p);
    if (p.centre) {
      const M = [(p.A[0] + p.C[0]) / 2, (p.A[1] + p.C[1]) / 2];
      return {
        // A table rather than tiles: two points of blanks run past a phone's width on one line.
        kind: 'table',
        prompt: [
          say(`$ABCD$ is a parallelogram with $A = ${pt(p.A[0], p.A[1])}$ and $B = ${pt(p.B[0], p.B[1])}$. Its diagonals cross at $${pt(M[0], M[1])}$.`),
          say('Find $C$ and $D$.'),
        ],
        columns: ['\\text{point}', 'x', 'y'],
        rows: [
          ['C', null, null],
          ['D', null, null],
        ],
        bank: numberBank(
          [p.C[0], p.C[1], D[0], D[1]],
          [2 * p.A[0] - M[0], 2 * p.A[1] - M[1], M[0] + p.A[0], M[1] + p.A[1], M[0] + p.B[0], M[1] + p.B[1]],
          3,
          1,
          -Infinity,
        ),
        answer: [p.C[0], p.C[1], D[0], D[1]].map(num),
      };
    }
    const wrong = [p.B[0] + p.C[0] - p.A[0], p.B[1] + p.C[1] - p.A[1], p.A[0] + p.B[0] - p.C[0], p.A[1] + p.B[1] - p.C[1]];
    return {
      kind: 'tiles',
      prompt: [
        say(`$ABCD$ is a parallelogram, its corners in that order round the shape, with $A = ${pt(p.A[0], p.A[1])}$, $B = ${pt(p.B[0], p.B[1])}$ and $C = ${pt(p.C[0], p.C[1])}$.`),
        say('Find $D$.'),
      ],
      template: 'D = ({0}, {1})',
      bank: numberBank([D[0], D[1]], wrong, 3, 1, -Infinity),
      answer: [num(D[0]), num(D[1])],
    };
  },
  solution(p) {
    const D = fourth(p);
    if (p.centre) {
      const M = [(p.A[0] + p.C[0]) / 2, (p.A[1] + p.C[1]) / 2];
      return [
        { text: 'The diagonals of a parallelogram cut each other in half, so the centre is the midpoint of $AC$ and of $BD$. From $A$ to the centre, then the same again:' },
        { tex: `C = 2 \\times ${pt(M[0], M[1])} - ${pt(p.A[0], p.A[1])} = ${pt(p.C[0], p.C[1])}` },
        { tex: `D = 2 \\times ${pt(M[0], M[1])} - ${pt(p.B[0], p.B[1])} = ${pt(D[0], D[1])}` },
      ];
    }
    return [
      { text: 'The diagonals $AC$ and $BD$ share a midpoint, so' },
      { tex: 'A + C = B + D' },
      { tex: 'D = A + C - B' },
      { tex: `x: ${p.A[0]} + ${p.C[0] < 0 ? `(${p.C[0]})` : p.C[0]} - ${p.B[0] < 0 ? `(${p.B[0]})` : p.B[0]} = ${D[0]}` },
      { tex: `y: ${p.A[1]} + ${p.C[1] < 0 ? `(${p.C[1]})` : p.C[1]} - ${p.B[1] < 0 ? `(${p.B[1]})` : p.B[1]} = ${D[1]}` },
    ];
  },
};

/* ---------- three points on a line ---------- */

interface LineParams {
  x1: number;
  y1: number;
  /** Gradient rise / run, in lowest terms. */
  rise: number;
  run: number;
  /** The x-steps are run·u and run·w. */
  u: number;
  w: number;
}

const lineK = ({ y1, rise, u, w }: LineParams) => y1 + rise * (u + w);

const cmCollinear: Generator<LineParams> = {
  id: 'cm-collinear',
  sample(rng, difficulty) {
    for (;;) {
      const x1 = rng.int(-5, 6);
      const y1 = rng.int(-6, 8);
      if (difficulty < 2) {
        const run = rng.int(1, 5);
        const rise = rng.int(-9, 9);
        if (rise === 0) continue;
        return { x1, y1, rise, run, u: 1, w: 1 };
      }
      const run = rng.int(1, 4);
      const rise = rng.int(-6, 6);
      const u = rng.int(1, 3);
      const w = rng.int(1, 4);
      if (rise === 0 || gcd(Math.abs(rise), run) !== 1 || u === w || (run === 1 && u === 1)) continue;
      return { x1, y1, rise, run, u, w };
    }
  },
  render(p) {
    const x2 = p.x1 + p.run * p.u;
    const y2 = p.y1 + p.rise * p.u;
    const x3 = x2 + p.run * p.w;
    return typed(
      [say(`The points $${pt(p.x1, p.y1)}$, $${pt(x2, y2)}$ and $(${x3}, k)$ lie on one straight line.`), say('Find $k$.')],
      lineK(p),
      'k =',
    );
  },
  choices(p) {
    const y2 = p.y1 + p.rise * p.u;
    const k = lineK(p);
    return numberOptions(k, [2 * y2 - p.y1, y2 + p.run * p.w, y2 + p.rise, p.y1 + p.rise * p.w, -k], 1, -Infinity);
  },
  solution(p) {
    const x2 = p.x1 + p.run * p.u;
    const y2 = p.y1 + p.rise * p.u;
    const x3 = x2 + p.run * p.w;
    const k = lineK(p);
    const up = (v: number) => (v < 0 ? `(${v})` : `${v}`);
    if (p.u === p.w) {
      return [
        { text: `From $x = ${p.x1}$ to $${x2}$ and from $${x2}$ to $${x3}$ are equal steps of ${p.run}, so the line climbs the same amount on each:` },
        { tex: `${y2} - ${up(p.y1)} = ${p.rise * p.u}` },
        { tex: `k = ${y2} + ${up(p.rise * p.u)} = ${k}` },
      ];
    }
    return [
      { text: 'The gradient between the first two points is' },
      { tex: `\\frac{${y2} - ${up(p.y1)}}{${x2} - ${up(p.x1)}} = ${p.rise < 0 ? '-' : ''}${frac(Math.abs(p.rise), p.run)}` },
      { text: `From $x = ${x2}$ to $x = ${x3}$ is ${p.run * p.w} across, so the line rises` },
      { tex: `${p.run * p.w} \\times ${p.rise < 0 ? '(-' : ''}${frac(Math.abs(p.rise), p.run)}${p.rise < 0 ? ')' : ''} = ${p.rise * p.w}` },
      { tex: `k = ${y2} + ${up(p.rise * p.w)} = ${k}` },
      { text: 'The steps across are not equal, so adding the first rise again is the trap.' },
    ];
  },
};

/* ---------- area from coordinates ---------- */

interface AreaParams {
  pts: [number, number][];
}

/** Twice the signed area, by the shoelace formula. */
function shoelace(pts: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum;
}

const polyArea = ({ pts }: AreaParams) => Math.abs(shoelace(pts)) / 2;

function boxArea(pts: [number, number][]): number {
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

const LETTERS = ['A', 'B', 'C', 'D'];

function gridSvg(pts: [number, number][]): string {
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const x0 = Math.min(0, ...xs) - 1;
  const x1 = Math.max(0, ...xs) + 1;
  const y0 = Math.min(0, ...ys) - 1;
  const y1 = Math.max(0, ...ys) + 1;
  const cell = Math.min(260 / (x1 - x0), 180 / (y1 - y0));
  const left = (300 - cell * (x1 - x0)) / 2;
  const topPad = 10;
  const X = (x: number) => left + (x - x0) * cell;
  const Y = (y: number) => topPad + (y1 - y) * cell;
  const parts: string[] = [];
  for (let x = x0; x <= x1; x += 1) parts.push(x === 0 ? seg(X(x), Y(y0), X(x), Y(y1)).replace('stroke-width="2"', 'stroke-width="1"') : thin(X(x), Y(y0), X(x), Y(y1)));
  for (let y = y0; y <= y1; y += 1) parts.push(y === 0 ? seg(X(x0), Y(y), X(x1), Y(y)).replace('stroke-width="2"', 'stroke-width="1"') : thin(X(x0), Y(y), X(x1), Y(y)));
  const screen = pts.map(([x, y]) => [X(x), Y(y)] as [number, number]);
  parts.push(shade(screen), outline(screen));
  const cx = screen.reduce((s, q) => s + q[0], 0) / screen.length;
  const cy = screen.reduce((s, q) => s + q[1], 0) / screen.length;
  screen.forEach(([x, y], i) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    parts.push(dot(x, y), txt(x + (dx / len) * 12, y + (dy / len) * 12, LETTERS[i]));
  });
  return svg(Math.round(topPad * 2 + (y1 - y0) * cell), 'The shape drawn on a square grid', parts);
}

const cmCoordArea: Generator<AreaParams> = {
  id: 'cm-coord-area',
  sample(rng, difficulty) {
    const n = difficulty >= 2 ? 4 : 3;
    for (;;) {
      const raw: [number, number][] = Array.from({ length: n }, () => [rng.int(-3, 8), rng.int(-3, 7)] as [number, number]);
      const cx = raw.reduce((s, q) => s + q[0], 0) / n;
      const cy = raw.reduce((s, q) => s + q[1], 0) / n;
      // Round the shape anticlockwise, so the corners are in order and the shoelace sum is positive.
      const pts = [...raw].sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
      let convex = true;
      for (let i = 0; i < n; i += 1) {
        const [a, b, c] = [pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
        if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 0) convex = false;
      }
      if (!convex) continue;
      const area = polyArea({ pts });
      if (area < 4 || area > 40) continue;
      // An axis-parallel rectangle needs no method at all.
      if (boxArea(pts) === area) continue;
      return { pts };
    }
  },
  render({ pts }) {
    const named = pts.map(([x, y], i) => `$${LETTERS[i]} = ${pt(x, y)}$`);
    const list = named.length === 3 ? `${named[0]}, ${named[1]} and ${named[2]}` : `${named[0]}, ${named[1]}, ${named[2]} and ${named[3]}`;
    return typed(
      [say(`A ${pts.length === 3 ? 'triangle' : 'quadrilateral'} has corners ${list}.`), { kind: 'diagram', svg: gridSvg(pts) }, say('What is its area?')],
      polyArea({ pts }),
      '\\text{area} =',
    );
  },
  choices({ pts }) {
    const area = polyArea({ pts });
    const box = boxArea(pts);
    return numberOptions(area, [2 * area, box, box - area, box / 2], Number.isInteger(area) ? 1 : 0.5, 0.5);
  },
  solution({ pts }) {
    const n = pts.length;
    const b = (v: number) => (v < 0 ? `(${v})` : `${v}`);
    const steps: SolutionStep[] = [{ text: 'Go round the corners in order and, for each corner and the next, work out $x_1 y_2 - x_2 y_1$:' }];
    const terms: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % n];
      terms.push(x1 * y2 - x2 * y1);
      steps.push({ tex: `${LETTERS[i]}${LETTERS[(i + 1) % n]}: ${b(x1)} \\times ${b(y2)} - ${b(x2)} \\times ${b(y1)} = ${x1 * y2 - x2 * y1}` });
    }
    const total = shoelace(pts);
    steps.push(
      { text: 'Add them, and halve:' },
      { tex: `${terms.map((t, i) => (i === 0 ? `${t}` : t < 0 ? `- ${-t}` : `+ ${t}`)).join(' ')} = ${total}` },
      { tex: `\\tfrac{1}{2} \\times ${Math.abs(total)} = ${num(polyArea({ pts }))}` },
    );
    return steps;
  },
};

export const contestSimilarityGenerators = [
  cmParallelCut,
  cmSimilarTable,
  cmHourglass,
  cmSimilarPerimeter,
  cmScalePercent,
  cmStatueWeight,
  cmMapArea,
  cmMapTiles,
  cmAltitudeHyp,
  cmAltitudeTiles,
  cmSharedHeight,
  cmTrapezium,
  cmShadowHeight,
  cmMirrorHeight,
  cmCrossedPoles,
  cmShadowTable,
  cmCoordDistance,
  cmParallelogramVertex,
  cmCollinear,
  cmCoordArea,
];
