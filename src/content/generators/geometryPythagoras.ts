/**
 * Geometry, level 6: Pythagoras' Geometry.
 *
 * Pythagoras' theorem stated and used, never proved (the owner's rule for this
 * Fundamentals course): the hypotenuse from the two shorter sides, a shorter
 * side from the hypotenuse, whole-number triples and their multiples, answers
 * left as square roots, the two special right triangles, and ladders,
 * rectangle diagonals and the distance between two points. Every figure is
 * drawn to its own lengths, marks its right angle, and labels each side the
 * question needs.
 */
import type { ChoiceOption, Generator, KeypadKey, Slide } from '../types';
import { options } from '../choiceVariant';
import { num, numberBank, numberOptions, say, typed } from './contestMath';
import { type Pt, DASHED, SVG_CLOSE, centroid, choiceSlide, cornerAngle, dot, f1, fit, outline, seg, sideLabel, svgOpen, text, ticks } from './geometryKit';

const diagram = (svg: string) => ({ kind: 'diagram' as const, svg });
const cm = (v: number) => `${num(v)} cm`;
const m = (v: number) => `${num(v)} m`;

/** The square-root key, for answers left as a root. */
export const ROOT_KEYS: KeypadKey[] = [{ insert: 'sqrt(', label: '√(' }];

type Rng = Parameters<Generator<unknown>['sample']>[0];

/** `k√r` in TeX, `√r` when k is 1. */
const surdTex = (k: number, r: number) => (k === 1 ? `\\sqrt{${r}}` : `${num(k)}\\sqrt{${r}}`);
/** `k√r` for mathjs. */
const surdAns = (k: number, r: number) => `${num(k)}*sqrt(${r})`;
/** `k√r` as figure text. */
const surdText = (k: number, r: number) => `${k === 1 ? '' : num(k)}√${r}`;
const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));
/** A square root in TeX, written as the whole number when it is one. */
const rootTex = (n: number) => (isSquare(n) ? `${Math.sqrt(n)}` : `\\sqrt{${n}}`);

/* ================================================================
 * Triples
 * ================================================================ */

type Triple = [number, number, number];

const BASES: Triple[] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [12, 35, 37],
  [9, 40, 41],
];

/** A multiple of one of the first `bases` triples with a hypotenuse at most `maxC`, legs in either order. */
function pickTriple(rng: Rng, bases: number, maxC: number): Triple {
  for (;;) {
    const [a, b, c] = BASES[rng.int(0, bases - 1)];
    const k = rng.int(1, Math.max(1, Math.floor(maxC / c)));
    if (c * k > maxC) continue;
    return rng.int(0, 1) === 1 ? [a * k, b * k, c * k] : [b * k, a * k, c * k];
  }
}

/* ================================================================
 * Figures
 * ================================================================ */

/** Which corner holds the right angle: bottom-left, bottom-right, top-left, top-right. */
export type Corner = 0 | 1 | 2 | 3;

export interface RightTriLabels {
  /** The side along the page. */
  a?: string;
  /** The upright side. */
  b?: string;
  /** The hypotenuse. */
  c?: string;
  /** The angles at the far end of `a` and the far end of `b`. */
  angles?: [string, string];
  /** Tick both shorter sides as equal. */
  equal?: boolean;
}

/** A right-angled triangle with sides `a` across and `b` upright, drawn to scale, right angle squared. */
export function rightTriSvg(a: number, b: number, corner: Corner, labels: RightTriLabels): string {
  const sx = corner === 0 || corner === 2 ? 1 : -1;
  const sy = corner < 2 ? -1 : 1;
  const [R, A, B] = fit([[0, 0], [sx * a, 0], [0, sy * b]], 190, 125, 55, 28);
  const inside = centroid([R, A, B]);
  const parts = [svgOpen(182, 'A right-angled triangle'), outline([R, A, B]), cornerAngle(A, R, B, '', { square: true })];
  if (labels.equal) parts.push(ticks(R, A, 1), ticks(R, B, 1));
  const clear = labels.equal ? 11 : 5;
  if (labels.a) parts.push(sideLabel(R, A, labels.a, inside, 14, clear));
  if (labels.b) parts.push(sideLabel(R, B, labels.b, inside, 14, clear));
  if (labels.c) parts.push(sideLabel(A, B, labels.c, inside, 14));
  if (labels.angles) {
    if (labels.angles[0]) parts.push(cornerAngle(R, A, B, labels.angles[0]));
    if (labels.angles[1]) parts.push(cornerAngle(R, B, A, labels.angles[1]));
  }
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** A ladder leaning on a wall: its foot `foot` out from the wall, reaching `height` up it. */
export function ladderSvg(foot: number, height: number, labels: { foot?: string; height?: string; ladder?: string }): string {
  const [W, F, T] = fit([[0, 0], [-foot, 0], [0, -height]], 150, 135, 70, 20);
  const inside = centroid([W, F, T]);
  const parts = [svgOpen(180, 'A ladder leaning against a wall')];
  // Ground and wall run on past the triangle.
  parts.push(seg([F[0] - 25, F[1]], [W[0] + 30, W[1]]));
  parts.push(`<rect x="${f1(W[0])}" y="${f1(T[1] - 15)}" width="10" height="${f1(W[1] - T[1] + 15)}" class="plot-shade" stroke="currentColor" stroke-width="1.5" />`);
  parts.push(seg(F, T, ' stroke-width="4"'));
  parts.push(cornerAngle(F, W, T, '', { square: true }));
  if (labels.foot) parts.push(sideLabel(F, W, labels.foot, inside, 14));
  if (labels.height) parts.push(sideLabel(W, T, labels.height, inside, 24));
  if (labels.ladder) parts.push(sideLabel(F, T, labels.ladder, inside, 16));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/** A rectangle w by h with its diagonal from bottom-left to top-right. */
export function rectDiagSvg(w: number, h: number, labels: { bottom?: string; right?: string; diag?: string }): string {
  const [a, , c] = fit([[0, 0], [w, 0], [w, -h], [0, -h]], 190, 120, 55, 22);
  const pts: Pt[] = [a, [c[0], a[1]], c, [a[0], c[1]]];
  const [p0, p1, p2] = pts;
  const inside = centroid(pts);
  const parts = [svgOpen(170, 'A rectangle with a diagonal'), outline(pts), seg(p0, p2, DASHED), cornerAngle(p0, p1, p2, '', { square: true })];
  if (labels.bottom) parts.push(sideLabel(p0, p1, labels.bottom, inside, 14));
  if (labels.right) parts.push(sideLabel(p1, p2, labels.right, inside, 10 + 3.4 * labels.right.length));
  // The diagonal's label sits on the side away from the corner it cuts off.
  if (labels.diag) parts.push(sideLabel(p0, p2, labels.diag, p1, 12));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

const pointName = (name: string, [x, y]: Pt) => `${name}(${num(x)}, ${num(y)})`;

/** Two points on a coordinate grid, with the dashed steps across and up between them. */
export function pointsSvg(P: Pt, Q: Pt): string {
  const xs = [P[0], Q[0], 0];
  const ys = [P[1], Q[1], 0];
  const x0 = Math.min(...xs) - 1;
  const x1 = Math.max(...xs) + 1;
  const y0 = Math.min(...ys) - 1;
  const y1 = Math.max(...ys) + 1;
  const u = Math.min(220 / (x1 - x0), 150 / (y1 - y0));
  const left = 150 - ((x1 - x0) * u) / 2;
  const top = 22;
  const at = ([x, y]: Pt): Pt => [left + (x - x0) * u, top + (y1 - y) * u];
  const parts = [svgOpen(top + (y1 - y0) * u + 22, 'Two points on a grid')];
  for (let x = x0; x <= x1; x += 1) parts.push(`<line x1="${f1(at([x, 0])[0])}" y1="${f1(at([0, y1])[1])}" x2="${f1(at([x, 0])[0])}" y2="${f1(at([0, y0])[1])}" stroke="currentColor" stroke-width="1" opacity="${x === 0 ? 0.9 : 0.2}" />`);
  for (let y = y0; y <= y1; y += 1) parts.push(`<line x1="${f1(at([x0, 0])[0])}" y1="${f1(at([0, y])[1])}" x2="${f1(at([x1, 0])[0])}" y2="${f1(at([0, y])[1])}" stroke="currentColor" stroke-width="1" opacity="${y === 0 ? 0.9 : 0.2}" />`);
  const C: Pt = [Q[0], P[1]];
  const [p, q, c] = [at(P), at(Q), at(C)];
  parts.push(seg(p, c, DASHED), seg(c, q, DASHED), seg(p, q), cornerAngle(p, c, q, '', { square: true }));
  parts.push(dot(p, 4), dot(q, 4));
  // Each name sits above or below its point, on the side away from the other.
  const below = (a: Pt, b: Pt) => a[1] < b[1];
  parts.push(text([p[0], p[1] + (below(P, Q) ? 16 : -14)], pointName('A', P), 13));
  parts.push(text([q[0], q[1] + (below(Q, P) ? 16 : -14)], pointName('B', Q), 13));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/* ================================================================
 * Lesson 1: The Pythagorean Theorem
 * ================================================================ */

interface HypParams {
  a: number;
  b: number;
  c: number;
  corner: Corner;
}

function sampleHyp(rng: Rng, difficulty: number): HypParams {
  const [a, b, c] = difficulty >= 2 ? pickTriple(rng, 5, 60) : pickTriple(rng, 3, 30);
  return { a, b, c, corner: rng.int(0, difficulty >= 2 ? 3 : 1) as Corner };
}

const hypSteps = ({ a, b, c }: HypParams) => [
  { text: 'Square the two shorter sides and add:' },
  { tex: `c^2 = ${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${c * c}` },
  { text: 'Then take the square root:' },
  { tex: `c = \\sqrt{${c * c}} = ${c}` },
];

const geoPythHyp: Generator<HypParams> = {
  id: 'geo-pyth-hyp',
  sample: sampleHyp,
  render(p) {
    return typed([diagram(rightTriSvg(p.a, p.b, p.corner, { a: cm(p.a), b: cm(p.b), c: 'c' })), say('Find the hypotenuse $c$, in cm.')], p.c, 'c =');
  },
  choices({ a, b, c }) {
    return numberOptions(c, [a + b, Math.max(a, b) + 1, c + 2], 1, 1);
  },
  solution: hypSteps,
};

interface WhichParams {
  letters: [string, string, string];
  a: number;
  b: number;
  corner: Corner;
}

const LETTER_SETS: [string, string, string][] = [
  ['p', 'q', 'r'],
  ['x', 'y', 'z'],
  ['d', 'e', 'f'],
  ['k', 'm', 'n'],
  ['s', 't', 'u'],
  ['u', 'v', 'w'],
];
const SHAPES: [number, number][] = [
  [4, 3],
  [3, 4],
  [5, 2.5],
  [2.5, 5],
  [5, 4],
  [4, 5],
];

const geoPythWhich: Generator<WhichParams> = {
  id: 'geo-pyth-which',
  sample(rng, difficulty) {
    const letters = rng.shuffle([...rng.pick(LETTER_SETS)]) as [string, string, string];
    const [a, b] = rng.pick(SHAPES);
    return { letters, a, b, corner: (difficulty >= 2 ? rng.int(2, 3) : rng.int(0, 1)) as Corner };
  },
  render({ letters: [p, q, r], a, b, corner }) {
    const opts: ChoiceOption[] = [
      { tex: `${p}^2 + ${q}^2 = ${r}^2`, correct: true },
      { tex: `${p}^2 + ${r}^2 = ${q}^2` },
      { tex: `${q}^2 + ${r}^2 = ${p}^2` },
      { tex: `${p} + ${q} = ${r}` },
    ];
    return choiceSlide([diagram(rightTriSvg(a, b, corner, { a: p, b: q, c: r })), say('Which equation is true for this right-angled triangle?')], opts);
  },
  solution({ letters: [p, q, r] }) {
    return [
      { text: `The hypotenuse is the side opposite the right angle, here $${r}$. Its square is the sum of the squares of the other two:` },
      { tex: `${p}^2 + ${q}^2 = ${r}^2` },
    ];
  },
};

const geoPythTiles: Generator<HypParams> = {
  id: 'geo-pyth-tiles',
  sample: sampleHyp,
  render(p): Slide {
    const { a, b, c } = p;
    return {
      kind: 'tiles',
      prompt: [diagram(rightTriSvg(a, b, p.corner, { a: cm(a), b: cm(b), c: 'c' })), say('Find $c^2$, then the hypotenuse $c$ in cm.')],
      template: 'c^2 = {0} \\qquad c = {1}',
      bank: numberBank([c * c, c], [a + b, (a + b) ** 2, a * a + b, c + 1, c * c - 1], 3, 1, 1),
      answer: [num(c * c), num(c)],
    };
  },
  solution: hypSteps,
};

/* ================================================================
 * Lesson 2: Pythagorean Triples
 * ================================================================ */

const isTriple = (s: number[]) => {
  const [x, y, z] = [...s].sort((p, q) => p - q);
  return x * x + y * y === z * z;
};

interface CheckParams {
  /** The right set first, then three that are not. Each as listed. */
  sets: number[][];
}

const geoTripleCheck: Generator<CheckParams> = {
  id: 'geo-triple-check',
  sample(rng, difficulty) {
    const big = difficulty >= 2;
    const list = (t: number[]) => (big ? rng.shuffle([...t]) : [...t].sort((p, q) => p - q));
    const right = pickTriple(rng, big ? 4 : 3, big ? 60 : 30);
    const sets = [list(right)];
    const seen = new Set([[...right].sort((p, q) => p - q).join()]);
    while (sets.length < 4) {
      const t = [...pickTriple(rng, big ? 4 : 3, big ? 60 : 30)];
      t[rng.int(0, 2)] += rng.pick([-2, -1, 1, 2]);
      const k = [...t].sort((p, q) => p - q).join();
      if (t.some((v) => v < 2) || isTriple(t) || seen.has(k)) continue;
      seen.add(k);
      sets.push(list(t));
    }
    return { sets };
  },
  render({ sets }) {
    const opts: ChoiceOption[] = sets.map((s, i) => ({ tex: s.join(',\\ '), correct: i === 0 }));
    return choiceSlide([say('Which three lengths make a right-angled triangle?')], opts);
  },
  solution({ sets }) {
    const [x, y, z] = [...sets[0]].sort((p, q) => p - q);
    return [
      { text: 'Square the two shorter lengths and add. Only this set gives the square of the longest:' },
      { tex: `${x}^2 + ${y}^2 = ${x * x} + ${y * y} = ${z * z}` },
      { tex: `${z}^2 = ${z * z}` },
    ];
  },
};

interface ScaleParams {
  base: number;
  k: number;
  /** Which side is asked: the hypotenuse, or the first or second shorter side. */
  ask: 0 | 1 | 2;
  swap: boolean;
  corner: Corner;
}

const scaled = ({ base, k, swap }: ScaleParams): Triple => {
  const [a, b, c] = BASES[base];
  return swap ? [b * k, a * k, c * k] : [a * k, b * k, c * k];
};

const geoTripleScale: Generator<ScaleParams> = {
  id: 'geo-triple-scale',
  sample(rng, difficulty) {
    for (;;) {
      const base = rng.int(0, 2);
      const k = rng.int(2, 10);
      if (BASES[base][2] * k > 100) continue;
      return { base, k, ask: difficulty >= 2 ? (rng.int(0, 1) as 0 | 1) : 2, swap: rng.int(0, 1) === 1, corner: rng.int(0, 3) as Corner };
    }
  },
  render(p) {
    const [a, b, c] = scaled(p);
    const lab = (i: number, v: number) => (p.ask === i ? 'x' : cm(v));
    return typed([diagram(rightTriSvg(a, b, p.corner, { a: lab(0, a), b: lab(1, b), c: lab(2, c) })), say('Find $x$, in cm.')], [a, b, c][p.ask], 'x =');
  },
  choices(p) {
    const [a, b, c] = scaled(p);
    const ans = [a, b, c][p.ask];
    return numberOptions(ans, p.ask === 2 ? [a + b, c + p.k] : [c - (p.ask === 0 ? b : a), ans + p.k], 1, 1);
  },
  solution(p) {
    const t = [...BASES[p.base]];
    const [a, b, c] = scaled(p);
    const known = [a, b, c].filter((_, i) => i !== p.ask);
    const unit = p.swap ? [t[1], t[0], t[2]] : t;
    const knownUnit = unit.filter((_, i) => i !== p.ask);
    return [
      { text: `The sides are $${p.k}$ times the triple $${t.join(',\\ ')}$:` },
      { tex: `${known[0]} = ${p.k} \\times ${knownUnit[0]} \\qquad ${known[1]} = ${p.k} \\times ${knownUnit[1]}` },
      { tex: `x = ${p.k} \\times ${unit[p.ask]} = ${[a, b, c][p.ask]}` },
    ];
  },
};

interface TableParams {
  base: number;
  ks: number[];
  /** Per row, which column is blank. */
  blank: number[];
}

const geoTripleTable: Generator<TableParams> = {
  id: 'geo-triple-table',
  sample(rng, difficulty) {
    const base = difficulty >= 2 ? rng.int(1, 2) : 0;
    const ks = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 3).sort((p, q) => p - q);
    return { base, ks, blank: ks.map(() => rng.int(0, 2)) };
  },
  render({ base, ks, blank }): Slide {
    const t = BASES[base];
    const answers = ks.map((k, i) => t[blank[i]] * k);
    return {
      kind: 'table',
      prompt: [say(`Each row is a multiple of the triple $${t.join(',\\ ')}$. Fill in the gaps.`)],
      columns: ['a', 'b', 'c'],
      rows: ks.map((k, i) => t.map((v, j) => (j === blank[i] ? null : num(v * k)))),
      bank: numberBank(answers, ks.flatMap((k, i) => [t[blank[i]] * k + 1, t[(blank[i] + 1) % 3] * k + t[blank[i]]]), 3, 1, 1),
      answer: answers.map(num),
    };
  },
  solution({ base, ks, blank }) {
    const t = BASES[base];
    return ks.map((k, i) => {
      const j = (blank[i] + 1) % 3;
      return { tex: `${t[j] * k} \\div ${t[j]} = ${k} \\qquad ${k} \\times ${t[blank[i]]} = ${t[blank[i]] * k}` };
    });
  },
};

/* ================================================================
 * Lesson 3: Squares and Roots
 * ================================================================ */

interface LegParams extends HypParams {
  /** Whether the upright side (true) or the side across (false) is asked. */
  askB: boolean;
}

const geoPythLeg: Generator<LegParams> = {
  id: 'geo-pyth-leg',
  sample(rng, difficulty) {
    return { ...sampleHyp(rng, difficulty), askB: rng.int(0, 1) === 1 };
  },
  render(p) {
    const labels = p.askB ? { a: cm(p.a), b: 'x', c: cm(p.c) } : { a: 'x', b: cm(p.b), c: cm(p.c) };
    return typed([diagram(rightTriSvg(p.a, p.b, p.corner, labels)), say('Find $x$, in cm.')], p.askB ? p.b : p.a, 'x =');
  },
  choices(p) {
    const known = p.askB ? p.a : p.b;
    const ans = p.askB ? p.b : p.a;
    return numberOptions(ans, [p.c - known, p.c + known, ans + 2], 1, 1);
  },
  solution(p) {
    const known = p.askB ? p.a : p.b;
    const ans = p.askB ? p.b : p.a;
    return [
      { text: 'The hypotenuse is the longest side, so take the square of the other side away from its square:' },
      { tex: `x^2 = ${p.c}^2 - ${known}^2 = ${p.c * p.c} - ${known * known} = ${ans * ans}` },
      { tex: `x = \\sqrt{${ans * ans}} = ${ans}` },
    ];
  },
};

interface TreeParams {
  a: number;
  b: number;
  c: number;
  /** Work out a shorter side (true) rather than the hypotenuse. */
  back: boolean;
}

const geoPythTree: Generator<TreeParams> = {
  id: 'geo-pyth-tree',
  sample(rng, difficulty) {
    const [a, b, c] = pickTriple(rng, 4, 40);
    return { a, b, c, back: difficulty >= 2 };
  },
  render({ a, b, c, back }): Slide {
    const answers = back ? [c * c, a * a, b * b, b] : [a * a, b * b, c * c, c];
    return {
      kind: 'tree',
      prompt: [
        say(
          back
            ? `A right-angled triangle has a hypotenuse of $${c}\\text{ cm}$ and a shorter side of $${a}\\text{ cm}$. Work out the other side: the two squares, the difference, then its square root.`
            : `A right-angled triangle has shorter sides of $${a}\\text{ cm}$ and $${b}\\text{ cm}$. Work out the hypotenuse: the two squares, the sum, then its square root.`,
        ),
      ],
      expression: back ? `\\sqrt{${c}^2 - ${a}^2}` : `\\sqrt{${a}^2 + ${b}^2}`,
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'combined', from: ['first', 'second'] },
        { id: 'root', from: ['combined'] },
      ],
      bank: numberBank(answers, [2 * a, 2 * (back ? c : b), back ? c - a : a + b, back ? c * c + a * a : c * c - 1], 3, 1, 1),
      answer: answers.map(num),
    };
  },
  solution({ a, b, c, back }) {
    if (back) return [{ tex: `${c}^2 = ${c * c} \\qquad ${a}^2 = ${a * a}` }, { tex: `${c * c} - ${a * a} = ${b * b}` }, { tex: `\\sqrt{${b * b}} = ${b}` }];
    return [{ tex: `${a}^2 = ${a * a} \\qquad ${b}^2 = ${b * b}` }, { tex: `${a * a} + ${b * b} = ${c * c}` }, { tex: `\\sqrt{${c * c}} = ${c}` }];
  },
};

interface SurdParams {
  /** The two sides given: shorter sides, or (back) hypotenuse then a shorter side. */
  x: number;
  y: number;
  back: boolean;
  corner: Corner;
}

const surdN = ({ x, y, back }: SurdParams) => (back ? x * x - y * y : x * x + y * y);

/** Four square-root options by value, the answer first. */
function rootOptions(n: number, slips: number[]): ChoiceOption[] {
  const seen = new Set([n]);
  const picked: number[] = [];
  for (const v of [...slips, n + 1, n - 1, n + 2, 2 * n]) {
    if (picked.length === 3) break;
    if (!(v > 0) || seen.has(v)) continue;
    seen.add(v);
    picked.push(v);
  }
  return options({ tex: rootTex(n), answer: `sqrt(${n})` }, ...picked.sort((p, q) => p - q).map((v) => ({ tex: rootTex(v), answer: `sqrt(${v})` })));
}

const geoPythSurd: Generator<SurdParams> = {
  id: 'geo-pyth-surd',
  sample(rng, difficulty) {
    for (;;) {
      const back = difficulty >= 2;
      const x = rng.int(back ? 3 : 1, back ? 12 : 9);
      const y = rng.int(1, back ? x - 1 : 9);
      const p: SurdParams = { x, y, back, corner: rng.int(0, 3) as Corner };
      if (x === y || isSquare(surdN(p))) continue;
      return p;
    }
  },
  render(p): Slide {
    const n = surdN(p);
    // Drawn to its real lengths: the shorter sides are y and the root.
    const [a, b] = p.back ? [p.y, Math.sqrt(n)] : [p.x, p.y];
    const labels = p.back ? { a: cm(p.y), b: 'x', c: cm(p.x) } : { a: cm(p.x), b: cm(p.y), c: 'x' };
    return typed([diagram(rightTriSvg(a, b, p.corner, labels)), say('Find $x$, in cm. Leave it as a square root.')], `sqrt(${n})`, 'x =', ROOT_KEYS);
  },
  choices(p) {
    const n = surdN(p);
    return rootOptions(n, p.back ? [p.x * p.x + p.y * p.y, (p.x - p.y) ** 2] : [(p.x + p.y) ** 2, Math.abs(p.x * p.x - p.y * p.y)]);
  },
  solution(p) {
    const n = surdN(p);
    const line = p.back ? `x^2 = ${p.x}^2 - ${p.y}^2 = ${p.x * p.x} - ${p.y * p.y} = ${n}` : `x^2 = ${p.x}^2 + ${p.y}^2 = ${p.x * p.x} + ${p.y * p.y} = ${n}`;
    return [{ tex: line }, { text: `$${n}$ is not a square number, so leave the answer as a root:` }, { tex: `x = \\sqrt{${n}}` }];
  },
};

/* ================================================================
 * Lesson 4: Special Right Triangles
 * ================================================================ */

interface HalfSquareParams {
  k: number;
  /** leg: find the hypotenuse from a side; fromSurd: a side from a hypotenuse of k√2; fromWhole: a side from a whole hypotenuse. */
  ask: 'leg' | 'fromSurd' | 'fromWhole';
  corner: Corner;
}

const geoSpecial45: Generator<HalfSquareParams> = {
  id: 'geo-special-45',
  sample(rng, difficulty) {
    if (difficulty < 2) return { k: rng.int(1, 20), ask: 'leg', corner: rng.int(0, 1) as Corner };
    const ask = rng.pick(['fromSurd', 'fromWhole'] as const);
    return { k: ask === 'fromWhole' ? 2 * rng.int(1, 15) : rng.int(2, 20), ask, corner: rng.int(0, 3) as Corner };
  },
  render({ k, ask, corner }) {
    const angles: [string, string] = ['45°', '45°'];
    if (ask === 'leg') {
      return typed([diagram(rightTriSvg(1, 1, corner, { a: cm(k), c: 'x', angles, equal: true })), say('Find the hypotenuse $x$, in cm. Leave $\\sqrt{2}$ in the answer.')], surdAns(k, 2), 'x =', ROOT_KEYS);
    }
    const hyp = ask === 'fromSurd' ? `${surdText(k, 2)} cm` : cm(k);
    const answer = ask === 'fromSurd' ? num(k) : `sqrt(${(k * k) / 2})`;
    const say2 = ask === 'fromSurd' ? 'Find the side $x$, in cm.' : 'Find the side $x$, in cm. Leave it as a square root.';
    return typed([diagram(rightTriSvg(1, 1, corner, { a: 'x', c: hyp, angles, equal: true })), say(say2)], answer, 'x =', ROOT_KEYS);
  },
  choices({ k, ask }) {
    if (ask === 'leg') return options({ tex: surdTex(k, 2), answer: surdAns(k, 2) }, { tex: num(k) }, { tex: surdTex(k, 3), answer: surdAns(k, 3) }, { tex: num(2 * k) });
    if (ask === 'fromSurd') return options({ tex: num(k) }, { tex: num(2 * k) }, { tex: surdTex(k, 2), answer: surdAns(k, 2) }, { tex: surdTex(k, 3), answer: surdAns(k, 3) });
    const h2 = (k * k) / 2;
    return options({ tex: rootTex(h2), answer: `sqrt(${h2})` }, { tex: num(k / 2) }, { tex: num(k) }, { tex: rootTex(2 * k * k), answer: `sqrt(${2 * k * k})` });
  },
  solution({ k, ask }) {
    if (ask === 'leg') return [{ text: 'Half a square: the two shorter sides are equal, and' }, { tex: `x^2 = ${k}^2 + ${k}^2 = ${2 * k * k}` }, { tex: `x = ${surdTex(k, 2)}` }];
    if (ask === 'fromSurd') return [{ text: 'The hypotenuse of half a square is a side times $\\sqrt{2}$, so the side is the number in front of $\\sqrt{2}$:' }, { tex: `x = ${k}` }];
    return [{ text: 'The two shorter sides are equal, so their squares are half the square of the hypotenuse:' }, { tex: `x^2 + x^2 = ${k}^2 = ${k * k}` }, { tex: `x^2 = ${k * k} \\div 2 = ${(k * k) / 2}` }, { tex: `x = \\sqrt{${(k * k) / 2}}` }];
  },
};

interface HalfTriParams {
  s: number;
  /** Given side and asked side. */
  given: 'short' | 'hyp';
  ask: 'short' | 'hyp' | 'long';
  corner: Corner;
}

/** Half an equilateral triangle, short side s across the page (so 30° at the top end of the long side). */
function halfTriSvg(corner: Corner, labels: { short?: string; long?: string; hyp?: string }): string {
  return rightTriSvg(1, Math.sqrt(3), corner, { a: labels.short, b: labels.long, c: labels.hyp, angles: ['60°', '30°'] });
}

const halfTriValue = (s: number, side: HalfTriParams['ask']) => (side === 'short' ? s : side === 'hyp' ? 2 * s : s * Math.sqrt(3));

const geoSpecial30: Generator<HalfTriParams> = {
  id: 'geo-special-30',
  sample(rng, difficulty) {
    const s = rng.int(2, 20);
    const corner = rng.int(0, 3) as Corner;
    if (difficulty >= 2) return { s, given: rng.pick(['short', 'hyp'] as const), ask: 'long', corner };
    const given = rng.pick(['short', 'hyp'] as const);
    return { s, given, ask: given === 'short' ? 'hyp' : 'short', corner };
  },
  render({ s, given, ask, corner }) {
    const labels: { short?: string; long?: string; hyp?: string } = { [given]: cm(halfTriValue(s, given)), [ask]: 'x' };
    const answer = ask === 'long' ? surdAns(s, 3) : num(halfTriValue(s, ask));
    const tail = ask === 'long' ? ' Leave $\\sqrt{3}$ in the answer.' : '';
    return typed([diagram(halfTriSvg(corner, labels)), say(`This is half an equilateral triangle. Find $x$, in cm.${tail}`)], answer, 'x =', ask === 'long' ? ROOT_KEYS : []);
  },
  choices({ s, ask }) {
    if (ask === 'long') return options({ tex: surdTex(s, 3), answer: surdAns(s, 3) }, { tex: surdTex(s, 2), answer: surdAns(s, 2) }, { tex: num(2 * s) }, { tex: num(s) });
    return numberOptions(halfTriValue(s, ask), ask === 'hyp' ? [s + s / 2, 3 * s, s] : [2 * s, s + 1, s / 2], 1, 1);
  },
  solution({ s, given, ask }) {
    const first =
      given === 'hyp' ? [{ text: 'The shortest side, opposite $30^\\circ$, is half the hypotenuse:' }, { tex: `${2 * s} \\div 2 = ${s}` }] : [];
    if (ask === 'hyp') return [{ text: 'The hypotenuse is twice the shortest side, opposite $30^\\circ$:' }, { tex: `x = 2 \\times ${s} = ${2 * s}` }];
    if (ask === 'short') return [...first.slice(0, 1), { tex: `x = ${2 * s} \\div 2 = ${s}` }];
    return [...first, { text: 'The longer side is the shortest side times $\\sqrt{3}$:' }, { tex: `x = ${surdTex(s, 3)}` }];
  },
};

interface HalfTilesParams {
  s: number;
  /** Given the short side (fill hypotenuse and long side) or the long side (fill short side and hypotenuse). */
  fromLong: boolean;
  corner: Corner;
}

const geoSpecialTiles: Generator<HalfTilesParams> = {
  id: 'geo-special-tiles',
  sample(rng, difficulty) {
    return { s: rng.int(2, 30), fromLong: difficulty >= 2, corner: rng.int(0, 3) as Corner };
  },
  render({ s, fromLong, corner }): Slide {
    const labels = fromLong ? { short: 'a', long: `${surdText(s, 3)} cm`, hyp: 'c' } : { short: cm(s), long: 'b', hyp: 'c' };
    const answers = fromLong ? [s, 2 * s] : [2 * s, s];
    return {
      kind: 'tiles',
      prompt: [diagram(halfTriSvg(corner, labels)), say(fromLong ? 'This is half an equilateral triangle. Fill in the other two sides, in cm.' : 'This is half an equilateral triangle. Fill in the hypotenuse and the longer side, in cm.')],
      template: fromLong ? 'a = {0} \\qquad c = {1}' : 'c = {0} \\qquad b = {1}\\sqrt3',
      bank: numberBank(answers, [3 * s, s + 2, 2 * s + 1, s * s].filter((v) => v !== s && v !== 2 * s), 3, 1, 1),
      answer: answers.map(num),
    };
  },
  solution({ s, fromLong }) {
    if (fromLong) return [{ text: 'The longer side is the shortest side times $\\sqrt{3}$, so the shortest side is the number in front:' }, { tex: `a = ${s}` }, { text: 'The hypotenuse is twice the shortest side:' }, { tex: `c = 2 \\times ${s} = ${2 * s}` }];
    return [{ text: 'The hypotenuse is twice the shortest side:' }, { tex: `c = 2 \\times ${s} = ${2 * s}` }, { text: 'The longer side is the shortest side times $\\sqrt{3}$:' }, { tex: `b = ${surdTex(s, 3)}` }];
  },
};

/* ================================================================
 * Lesson 5: Applications
 * ================================================================ */

interface LadderParams {
  foot: number;
  height: number;
  len: number;
  ask: 'foot' | 'height' | 'len';
}

/** Ladder triangles as [foot, height, length]: steep, as a ladder stands. */
const LADDERS_EASY: [number, number, number][] = [
  ...[1, 1.5, 2, 2.5, 3, 3.5, 4].map((k): [number, number, number] => [3 * k, 4 * k, 5 * k]),
  [2.5, 6, 6.5],
  [5, 12, 13],
  [4, 7.5, 8.5],
  [8, 15, 17],
];
const LADDERS_HARD: [number, number, number][] = [
  ...[4.5, 5, 5.5, 6].map((k): [number, number, number] => [3 * k, 4 * k, 5 * k]),
  [3.5, 12, 12.5],
  [7, 24, 25],
  [7.5, 18, 19.5],
  [10, 24, 26],
  [12, 22.5, 25.5],
  [4.5, 20, 20.5],
];

const geoLadder: Generator<LadderParams> = {
  id: 'geo-ladder',
  sample(rng, difficulty) {
    const [foot, height, len] = rng.pick(difficulty >= 2 ? LADDERS_HARD : LADDERS_EASY);
    return { foot, height, len, ask: rng.pick(['foot', 'height', 'len'] as const) };
  },
  render(p) {
    const labels = { foot: p.ask === 'foot' ? 'x' : m(p.foot), height: p.ask === 'height' ? 'x' : m(p.height), ladder: p.ask === 'len' ? 'x' : m(p.len) };
    const what = p.ask === 'foot' ? 'how far the foot of the ladder is from the wall' : p.ask === 'height' ? 'how far up the wall the ladder reaches' : 'the length of the ladder';
    return typed([diagram(ladderSvg(p.foot, p.height, labels)), say(`A ladder leans against a wall on level ground. Find ${what}, $x$, in metres.`)], p[p.ask], 'x =');
  },
  choices(p) {
    const ans = p[p.ask];
    const slips = p.ask === 'len' ? [p.foot + p.height, ans + 1] : [p.len - (p.ask === 'foot' ? p.height : p.foot), ans + 1];
    return numberOptions(ans, slips, 0.5, 0.5);
  },
  solution(p) {
    if (p.ask === 'len') {
      return [
        { text: 'The ladder is the hypotenuse:' },
        { tex: `x^2 = ${num(p.foot)}^2 + ${num(p.height)}^2 = ${num(p.foot ** 2)} + ${num(p.height ** 2)} = ${num(p.len ** 2)}` },
        { tex: `x = \\sqrt{${num(p.len ** 2)}} = ${num(p.len)}` },
      ];
    }
    const other = p.ask === 'foot' ? p.height : p.foot;
    return [
      { text: 'The ladder is the hypotenuse, so take away:' },
      { tex: `x^2 = ${num(p.len)}^2 - ${num(other)}^2 = ${num(p.len ** 2)} - ${num(other ** 2)} = ${num(p[p.ask] ** 2)}` },
      { tex: `x = \\sqrt{${num(p[p.ask] ** 2)}} = ${num(p[p.ask])}` },
    ];
  },
};

interface DiagParams {
  w: number;
  h: number;
  d: number;
  ask: 'd' | 'w' | 'h';
}

const RECTS: Triple[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k): Triple => [3 * k, 4 * k, 5 * k]),
  [5, 12, 13],
  [10, 24, 26],
  [15, 36, 39],
  [8, 15, 17],
  [16, 30, 34],
  [7, 24, 25],
  [20, 21, 29],
];

const geoDiagonal: Generator<DiagParams> = {
  id: 'geo-diagonal',
  sample(rng, difficulty) {
    const [a, b, d] = rng.pick(RECTS);
    const [w, h] = rng.int(0, 1) === 1 ? [a, b] : [b, a];
    return { w, h, d, ask: difficulty >= 2 ? rng.pick(['w', 'h'] as const) : 'd' };
  },
  render(p) {
    const labels = { bottom: p.ask === 'w' ? 'x' : cm(p.w), right: p.ask === 'h' ? 'x' : cm(p.h), diag: p.ask === 'd' ? 'x' : cm(p.d) };
    const what = p.ask === 'd' ? 'Find the length of the diagonal, $x$, in cm.' : 'Find $x$, in cm.';
    return typed([diagram(rectDiagSvg(p.w, p.h, labels)), say(what)], p[p.ask], 'x =');
  },
  choices(p) {
    const ans = p[p.ask];
    return numberOptions(ans, p.ask === 'd' ? [p.w + p.h, ans + 1] : [p.d - (p.ask === 'w' ? p.h : p.w), ans + 2], 1, 1);
  },
  solution(p) {
    if (p.ask === 'd') {
      return [
        { text: 'The diagonal is the hypotenuse of the right-angled triangle it cuts off:' },
        { tex: `x^2 = ${p.w}^2 + ${p.h}^2 = ${p.w * p.w} + ${p.h * p.h} = ${p.d * p.d}` },
        { tex: `x = \\sqrt{${p.d * p.d}} = ${p.d}` },
      ];
    }
    const other = p.ask === 'w' ? p.h : p.w;
    return [
      { text: 'The diagonal is the hypotenuse, so take away:' },
      { tex: `x^2 = ${p.d}^2 - ${other}^2 = ${p.d * p.d} - ${other * other} = ${p[p.ask] ** 2}` },
      { tex: `x = \\sqrt{${p[p.ask] ** 2}} = ${p[p.ask]}` },
    ];
  },
};

interface DistParams {
  A: Pt;
  B: Pt;
}

const STEPS: [number, number][] = [
  [3, 4],
  [4, 3],
  [6, 8],
  [8, 6],
  [5, 12],
  [12, 5],
];

function sampleDist(rng: Rng, difficulty: number): DistParams {
  for (;;) {
    const [dx, dy] = rng.pick(difficulty >= 2 ? STEPS : STEPS.slice(0, 4));
    if (difficulty < 2) {
      const A: Pt = [rng.int(0, 12 - dx), rng.int(0, 12 - dy)];
      return { A, B: [A[0] + dx, A[1] + dy] };
    }
    const sx = rng.pick([1, -1]);
    const sy = rng.pick([1, -1]);
    const A: Pt = [rng.int(-8, 8), rng.int(-8, 8)];
    const B: Pt = [A[0] + sx * dx, A[1] + sy * dy];
    if (Math.abs(B[0]) > 8 || Math.abs(B[1]) > 8) continue;
    // At least one negative coordinate, or it is the easier question again.
    if (Math.min(A[0], A[1], B[0], B[1]) >= 0) continue;
    return { A, B };
  }
}

const distParts = ({ A, B }: DistParams) => {
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  return { dx, dy, d: Math.sqrt(dx * dx + dy * dy) };
};

/** `b - a` with a negative `a` bracketed. */
const minusTex = (b: number, a: number) => `${b} - ${a < 0 ? `(${a})` : a}`;

const distStem = ({ A, B }: DistParams) => `Find the distance from $${pointName('A', A)}$ to $${pointName('B', B)}$.`;

const geoDistance: Generator<DistParams> = {
  id: 'geo-distance',
  sample: sampleDist,
  render(p) {
    return typed([diagram(pointsSvg(p.A, p.B)), say(distStem(p))], distParts(p).d, 'AB =');
  },
  choices(p) {
    const { dx, dy, d } = distParts(p);
    return numberOptions(d, [Math.abs(dx) + Math.abs(dy), d + 2, d - 1], 1, 1);
  },
  solution(p) {
    const { dx, dy, d } = distParts(p);
    return [
      { text: 'The steps across and up are the differences in the coordinates:' },
      { tex: `${minusTex(p.B[0], p.A[0])} = ${dx} \\qquad ${minusTex(p.B[1], p.A[1])} = ${dy}` },
      { text: 'They are the shorter sides of a right-angled triangle, and $AB$ is its hypotenuse:' },
      { tex: `AB^2 = ${dx < 0 ? `(${dx})` : dx}^2 + ${dy < 0 ? `(${dy})` : dy}^2 = ${dx * dx} + ${dy * dy} = ${d * d}` },
      { tex: `AB = \\sqrt{${d * d}} = ${d}` },
    ];
  },
};

const geoDistanceTree: Generator<DistParams> = {
  id: 'geo-dist-tree',
  sample: sampleDist,
  render(p): Slide {
    const { dx, dy, d } = distParts(p);
    const answers = [dx, dy, dx * dx, dy * dy, d * d, d];
    return {
      kind: 'tree',
      prompt: [say(`${distStem(p)} Top row: the steps across and up. Then their squares, the sum, and its square root.`)],
      expression: `\\sqrt{(${minusTex(p.B[0], p.A[0])})^2 + (${minusTex(p.B[1], p.A[1])})^2}`,
      nodes: [
        { id: 'across', from: [] },
        { id: 'up', from: [] },
        { id: 'across2', from: ['across'] },
        { id: 'up2', from: ['up'] },
        { id: 'sum', from: ['across2', 'up2'] },
        { id: 'root', from: ['sum'] },
      ],
      bank: numberBank(answers, [Math.abs(dx) + Math.abs(dy), 2 * Math.abs(dx), d + 1], 3, 1, -200),
      answer: answers.map(num),
    };
  },
  solution(p) {
    const { dx, dy, d } = distParts(p);
    return [
      { tex: `${minusTex(p.B[0], p.A[0])} = ${dx} \\qquad ${minusTex(p.B[1], p.A[1])} = ${dy}` },
      { tex: `${dx < 0 ? `(${dx})` : dx}^2 = ${dx * dx} \\qquad ${dy < 0 ? `(${dy})` : dy}^2 = ${dy * dy}` },
      { tex: `${dx * dx} + ${dy * dy} = ${d * d}` },
      { tex: `\\sqrt{${d * d}} = ${d}` },
    ];
  },
};

export const geometryPythagorasGenerators = [
  geoPythHyp,
  geoPythWhich,
  geoPythTiles,
  geoTripleCheck,
  geoTripleScale,
  geoTripleTable,
  geoPythLeg,
  geoPythTree,
  geoPythSurd,
  geoSpecial45,
  geoSpecial30,
  geoSpecialTiles,
  geoLadder,
  geoDiagonal,
  geoDistance,
  geoDistanceTree,
];
