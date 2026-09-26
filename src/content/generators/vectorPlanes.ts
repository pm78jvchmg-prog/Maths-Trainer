/**
 * Vectors, level 18: angles and intersections of planes (`vplx-*`).
 *
 * Level 8 wrote a plane as `r . n = d` and found where a line meets one;
 * level 12 found the angle between two planes and between a line and a
 * plane. This level puts those together: how two planes meet, the line they
 * meet in, where a line meets a plane and at what angle, and how three planes
 * meet, at a point or not.
 *
 * Every question is built outward from the whole numbers it should end on:
 * the point both planes pass through, the value of `t` where a line meets a
 * plane, the point three planes share, the multiples that write one normal in
 * terms of the other two. Angles are exact: a cosine or a sine as a fraction
 * from vectors of whole length, or a standard angle in whole degrees, graded
 * the way `angle-degrees` grades them.
 *
 * Answers stay scalars or tiles, for the reason `vectorFormat.ts` gives. The
 * helpers from `vectors.ts` that this file needs are not exported there, so
 * the few used are copied below rather than widening that file's surface.
 */
import type { Block, ChoiceOption, Generator, Slide } from '../types';
import { options } from '../choiceVariant';
import { hashSeed } from '../../engine/rng';
import { fracTex, gcd } from './format';
import { bankOf, distinctOptions, signedChoices, solvedForTex } from './vectorFormat';

type Vec = number[];
type Draw = Parameters<Generator['sample']>[0];

const AXES = ['x', 'y', 'z'];

/** A point in space or three components, placed as a row of tiles. */
const ROW_TEMPLATE = '( {0} , \\; {1} , \\; {2} )';

/* ---------- vector arithmetic and formatting (after vectors.ts) ---------- */

function colTex(v: Vec): string {
  return `\\begin{pmatrix} ${v.join(' \\\\ ')} \\end{pmatrix}`;
}

const plus = (u: Vec, v: Vec): Vec => u.map((x, i) => x + v[i]);
const scaled = (k: number, u: Vec): Vec => u.map((x) => k * x);

function crossOf(u: Vec, v: Vec): Vec {
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

function dotOf(u: Vec, v: Vec): number {
  return u.reduce((sum, x, i) => sum + x * v[i], 0);
}

function vec3(rng: Draw, lo: number, hi: number): Vec {
  return [rng.int(lo, hi), rng.int(lo, hi), rng.int(lo, hi)];
}

const nonZeroCount = (v: Vec) => v.filter((x) => x !== 0).length;
const isParallel = (u: Vec, v: Vec) => crossOf(u, v).every((x) => x === 0);
const biggest = (v: Vec) => Math.max(...v.map(Math.abs));

function nonZeroInt(rng: Draw, most: number): number {
  const n = rng.int(1, most);
  return rng.chance(0.5) ? n : -n;
}

function wholeRoot(n: number): number | undefined {
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : undefined;
}

function point3Tex(v: Vec | string[]): string {
  return `\\left(${v.join(', ')}\\right)`;
}

/** `r = a + t b`, as one whole TeX string. */
function lineTex(a: Vec, b: Vec): string {
  return `\\mathbf{r} = ${colTex(a)} + t${colTex(b)}`;
}

/** `c + k t` as written by hand: `3 - 2t`, `t`, `-4 + t`. */
function affTex(c: number, k: number, sym: string): string {
  if (k === 0) return `${c}`;
  const size = Math.abs(k) === 1 ? '' : `${Math.abs(k)}`;
  if (c === 0) return `${k < 0 ? '-' : ''}${size}${sym}`;
  return `${c} ${k < 0 ? '-' : '+'} ${size}${sym}`;
}

/** `3k + 2`, `-k - 5`: an unknown's term first, the order a substitution leaves it in. */
function kFirstTex(c: number, k: number): string {
  const term = k === 1 ? 'k' : k === -1 ? '-k' : `${k}k`;
  return c === 0 ? term : `${term} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
}

/**
 * `2x - y + kz`, as written by hand, dropping a zero coefficient. A string
 * coefficient is an unknown written in front of its letter.
 */
function linearTex(coefs: (number | string)[], names: string[] = AXES): string {
  let out = '';
  coefs.forEach((c, i) => {
    if (typeof c === 'string') {
      out += out === '' ? `${c}${names[i]}` : ` + ${c}${names[i]}`;
      return;
    }
    if (c === 0) return;
    const size = Math.abs(c) === 1 ? '' : `${Math.abs(c)}`;
    out += out === '' ? `${c < 0 ? '-' : ''}${size}${names[i]}` : ` ${c < 0 ? '-' : '+'} ${size}${names[i]}`;
  });
  return out === '' ? '0' : out;
}

function planeTex(n: (number | string)[], d: number | string): string {
  return `${linearTex(n)} = ${d}`;
}

/** A named plane as a display. Braced, so a leading minus reads as a sign. */
function namedPlane(index: number | undefined, n: (number | string)[], d: number | string): Block {
  const name = index === undefined ? '\\Pi' : `\\Pi_${index}`;
  return { kind: 'display', tex: `${name}\\colon \\; {${planeTex(n, d)}}` };
}

/**
 * Values put into `c_1 u + c_2 v + ...` as a learner writes them on paper,
 * `2(3) - k - (-2)`, skipping zero coefficients. An entry that is not a
 * number is a letter and is written straight after its coefficient.
 */
function substituteTex(n: Vec, entries: string[]): string {
  let out = '';
  n.forEach((c, i) => {
    if (c === 0) return;
    const size = Math.abs(c) === 1 ? '' : `${Math.abs(c)}`;
    const entry = entries[i];
    const numeric = !Number.isNaN(Number(entry));
    const value =
      numeric && (size !== '' || (Number(entry) < 0 && (out !== '' || c < 0)) || (c < 0 && out === '' && Number(entry) === 0))
        ? `(${entry})`
        : entry;
    const sign = c < 0 ? '-' : out === '' ? '' : '+';
    out += out === '' ? `${sign}${size}${value}` : ` ${sign} ${size}${value}`;
  });
  return out === '' ? '0' : out;
}

/** A sum of products, `6 - 2 + 12`, from the non-zero ones. */
function productsTex(p: Vec, n: Vec): string {
  const products = n.map((c, i) => c * p[i]).filter((_, i) => n[i] !== 0);
  return products.map((x, i) => (i === 0 ? `${x}` : x < 0 ? `- ${-x}` : `+ ${x}`)).join(' ');
}

/** `p . n` in two lines: the values put in, then the products added. */
function dotLines(p: Vec, n: Vec): { tex: string }[] {
  const count = n.filter((c) => c !== 0).length;
  return [
    { tex: substituteTex(n, p.map(String)) },
    { tex: count > 1 ? `= ${productsTex(p, n)} = ${dotOf(p, n)}` : `= ${dotOf(p, n)}` },
  ];
}

/** `n` divided through by its common factor, first non-zero entry positive. */
function simplest(n: Vec): Vec {
  const g = n.reduce((acc, x) => gcd(acc, x), 0) || 1;
  const lead = n.find((x) => x !== 0) ?? 1;
  return n.map((x) => ((lead < 0 ? -1 : 1) * x) / g);
}

function bracket(x: number): string {
  return x < 0 ? `(${x})` : `${x}`;
}

function paren(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** The three component calculations of `a x b`, for worked solutions. */
function crossSteps(a: Vec, b: Vec): { tex: string }[] {
  const n = crossOf(a, b);
  return [0, 1, 2].flatMap((i) => {
    const j = (i + 1) % 3;
    const k = (i + 2) % 3;
    return [
      { tex: `${AXES[i]}\\colon \\; {${a[j]}(${b[k]}) - ${bracket(a[k])}(${b[j]})}` },
      { tex: `= ${a[j] * b[k]} - ${paren(a[k] * b[j])} = ${n[i]}` },
    ];
  });
}

/* ---------- answer placement (after vectors.ts) ---------- */

function saltOf(params: unknown): number {
  return hashSeed(JSON.stringify(params));
}

/** Mirrors the rotation `choiceVariant` applies to a derived choice slide. */
function rotationOf(opts: ChoiceOption[]): number {
  let hash = 0;
  for (const option of opts) {
    for (let i = 0; i < option.tex.length; i += 1) {
      hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
    }
  }
  return Math.abs(hash) % opts.length;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, idx) =>
    permutations([...items.slice(0, idx), ...items.slice(idx + 1)]).map((rest) => [item, ...rest]),
  );
}

/** Options ordered so the derived slide's rotation lands the answer at `salt % length`. */
function steered(opts: ChoiceOption[], salt: number): ChoiceOption[] {
  const target = salt % opts.length;
  for (const order of permutations(opts)) {
    const at = (order.findIndex((o) => o.correct) - rotationOf(order) + order.length) % order.length;
    if (at === target) return order;
  }
  return opts;
}

/** A native choice slide's options, with the answer placed at `salt % length`. */
function placeAnswer(correct: { id: string; label: string }, wrong: { id: string; label: string }[], salt: number) {
  const all = distinctOptions([correct, ...wrong]);
  const rest = all.slice(1);
  const at = salt % all.length;
  return [...rest.slice(0, at), all[0], ...rest.slice(at)].map((option) => ({ ...option, tex: true }));
}

/** A tree's bank: the answer and up to four distinct spares. */
function treeBank(answer: string[], candidates: string[]): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  for (const candidate of candidates) {
    if (extras.length >= 4) break;
    if (needed.has(candidate) || extras.includes(candidate)) continue;
    extras.push(candidate);
  }
  // Candidates come from the question's own numbers and can all collide
  // with the answer; pad with near-misses of the whole-number values.
  for (let offset = 3; extras.length < 3 && offset <= 20; offset += 1) {
    for (const token of answer) {
      const n = Number(token);
      const candidate = `${n + offset}`;
      if (Number.isNaN(n) || needed.has(candidate) || extras.includes(candidate) || extras.length >= 3) continue;
      extras.push(candidate);
    }
  }
  return [...answer, ...extras].sort();
}

/**
 * A fraction and three wrong ones, no two of the same value. Wrong values
 * come from the slips given, then from nudging the top.
 */
function fractionChoices(correct: [number, number], wrong: [number, number][], salt: number): ChoiceOption[] {
  const value = ([p, q]: [number, number]) => p / q;
  const seen = [value(correct)];
  const picked: [number, number][] = [];
  const consider = (f: [number, number]) => {
    if (picked.length === 3 || f[1] === 0) return;
    if (seen.some((v) => Math.abs(v - value(f)) < 1e-9)) return;
    seen.push(value(f));
    picked.push(f);
  };
  wrong.forEach(consider);
  for (let step = 1; picked.length < 3; step += 1) consider([correct[0] + step, correct[1]]);
  const option = ([p, q]: [number, number]) => ({ tex: fracTex(p, q), answer: `${p}/${q}` });
  return steered(options(option(correct), ...picked.map(option)), salt);
}

/* ---------- exact angles (after vectors.ts) ---------- */

type CosClass = 'half' | 'root2' | 'root3';

const CLASS_ANGLE: Record<CosClass, number> = { half: 60, root2: 45, root3: 30 };

const CLASS_COS: Record<CosClass, string> = {
  half: '\\tfrac{1}{2}',
  root2: '\\tfrac{\\sqrt{2}}{2}',
  root3: '\\tfrac{\\sqrt{3}}{2}',
};

function cosClassOf(u: Vec, v: Vec): CosClass | undefined {
  const dot = dotOf(u, v);
  const product = dotOf(u, u) * dotOf(v, v);
  if (dot === 0) return undefined;
  if (4 * dot * dot === product) return 'half';
  if (2 * dot * dot === product) return 'root2';
  if (4 * dot * dot === 3 * product) return 'root3';
  return undefined;
}

const pairCache = new Map<string, [Vec, Vec][]>();

/** Every ordered pair with entries up to `most`, at least two non-zero, a standard angle apart. */
function standardPairs(cls: CosClass, most: number): [Vec, Vec][] {
  const key = `${cls}:${most}`;
  const cached = pairCache.get(key);
  if (cached) return cached;
  const vectors: Vec[] = [];
  for (let x = -most; x <= most; x += 1) {
    for (let y = -most; y <= most; y += 1) {
      for (let z = -most; z <= most; z += 1) {
        if (nonZeroCount([x, y, z]) >= 2) vectors.push([x, y, z]);
      }
    }
  }
  const out: [Vec, Vec][] = [];
  for (const u of vectors) {
    for (const v of vectors) {
      if (cosClassOf(u, v) === cls) out.push([u, v]);
    }
  }
  pairCache.set(key, out);
  return out;
}

/** `\sqrt{n}`, or the whole number when n is a perfect square. */
function rootTex(n: number): string {
  const r = wholeRoot(n);
  return r === undefined ? `\\sqrt{${n}}` : `${r}`;
}

/** `\sqrt{n}` with its square factors taken out. */
function surdTex(n: number): string {
  let outside = 1;
  let inside = n;
  for (let f = 2; f * f <= inside; f += 1) {
    while (inside % (f * f) === 0) {
      inside /= f * f;
      outside *= f;
    }
  }
  if (inside === 1) return `${outside}`;
  return `${outside === 1 ? '' : outside}\\sqrt{${inside}}`;
}

const wholeCache = new Map<number, Vec[]>();

/** Every vector of whole length up to `longest` with at least two entries non-zero. */
function wholeVectors(longest: number): Vec[] {
  const cached = wholeCache.get(longest);
  if (cached) return cached;
  const out: Vec[] = [];
  for (let x = -longest; x <= longest; x += 1) {
    for (let y = -longest; y <= longest; y += 1) {
      for (let z = -longest; z <= longest; z += 1) {
        const length = wholeRoot(x * x + y * y + z * z);
        if (nonZeroCount([x, y, z]) >= 2 && length !== undefined && length <= longest) out.push([x, y, z]);
      }
    }
  }
  wholeCache.set(longest, out);
  return out;
}

const lengthOf = (v: Vec) => wholeRoot(dotOf(v, v)) ?? 1;

/** Two vectors of whole length, neither parallel nor perpendicular. */
function sampleWholePair(rng: Draw, difficulty: number): [Vec, Vec] {
  const pool = wholeVectors(difficulty > 1 ? 11 : 9);
  for (let tries = 0; tries < 300; tries += 1) {
    const u = rng.pick(pool);
    const v = rng.pick(pool);
    if (dotOf(u, v) === 0 || isParallel(u, v)) continue;
    return [u, v];
  }
  return [
    [1, 2, 2],
    [2, 3, 6],
  ];
}

/* ---------- solving two equations in two unknowns ---------- */

/** `p u + q v = r`. */
type Equation2 = [number, number, number];

function eq2Tex([p, q, r]: Equation2, names: string[]): string {
  return `${linearTex([p, q], names)} = ${r}`;
}

/**
 * Take a multiple of one equation from a multiple of another so the first
 * unknown cancels, with the multipliers kept positive: scale each by the
 * other's coefficient, then add when the signs differ and subtract when they
 * agree.
 */
function eliminate(e1: Equation2, e2: Equation2): { m1: number; m2: number; text: string; result: Equation2 } {
  const g = gcd(e1[0], e2[0]) || 1;
  const m1 = Math.abs(e2[0]) / g;
  const m2 = Math.abs(e1[0]) / g;
  const add = e1[0] * e2[0] < 0;
  const result = e2.map((x, i) => m2 * x + (add ? 1 : -1) * m1 * e1[i]) as Equation2;
  const first = m1 === 1 ? 'the first' : `$${m1}$ times the first`;
  const second = m2 === 1 ? 'the second' : `$${m2}$ times the second`;
  return { m1, m2, text: add ? `Add ${first} to ${second}` : `Take ${first} from ${second}`, result };
}

/**
 * Worked solution of two equations in `names`, whose whole solution is
 * `values`: eliminate the first unknown, find the second, put it back.
 */
function solveTwoSteps(e1: Equation2, e2: Equation2, names: [string, string], values: [number, number]) {
  const [u, v] = names;
  const steps: { text?: string; tex?: string }[] = [];
  // An equation with one unknown missing gives the other straight away.
  const lone = [e1, e2].findIndex((e) => e[0] === 0 || e[1] === 0);
  if (lone >= 0) {
    const eq = lone === 0 ? e1 : e2;
    const other = lone === 0 ? e2 : e1;
    const s = eq[0] === 0 ? 1 : 0;
    const o = 1 - s;
    const entries = s === 0 ? [`${values[0]}`, v] : [u, `${values[1]}`];
    steps.push(
      {
        text: `The ${lone === 0 ? 'first' : 'second'} has no $${names[o]}$, so it gives $${names[s]}$ straight away:`,
      },
      { tex: solvedForTex(eq[s], names[s], eq[2], `${names[s]} = ${values[s]}`) },
    );
    if (other[s] !== 0) {
      steps.push(
        { text: `Put $${names[s]} = ${values[s]}$ into the ${lone === 0 ? 'second' : 'first'}:` },
        { tex: `${substituteTex([other[0], other[1]], entries)} = ${other[2]}` },
      );
    }
    steps.push({ tex: solvedForTex(other[o], names[o], other[2] - other[s] * values[s], `${names[o]} = ${values[o]}`) });
    return steps;
  }
  let found: Equation2;
  {
    const { m1, m2, text, result } = eliminate(e1, e2);
    const scaledShown = [
      ...(m1 !== 1 ? [{ tex: eq2Tex(e1.map((x) => m1 * x) as Equation2, names) }] : []),
      ...(m2 !== 1 ? [{ tex: eq2Tex(e2.map((x) => m2 * x) as Equation2, names) }] : []),
    ];
    if (scaledShown.length > 0) {
      steps.push(
        { text: `${text}, so $${u}$ cancels. ${scaledShown.length > 1 ? 'The multiplied equations:' : 'The multiplied equation:'}` },
        ...scaledShown,
        { text: e1[0] * e2[0] < 0 ? 'Adding:' : 'Subtracting:' },
      );
    } else {
      steps.push({ text: `${text}, so $${u}$ cancels:` });
    }
    found = result;
  }
  steps.push({ tex: solvedForTex(found[1], v, found[2], `${v} = ${values[1]}`) });
  const back = e1[0] !== 0 ? e1 : e2;
  steps.push(
    { text: `Put $${v} = ${values[1]}$ into the ${back === e1 ? 'first' : 'second'}:` },
    { tex: `${substituteTex([back[0], back[1]], [u, `${values[1]}`])} = ${back[2]}` },
    { tex: solvedForTex(back[0], u, back[2] - back[1] * values[1], `${u} = ${values[0]}`) },
  );
  return steps;
}

/* ================= Lesson 1: how two planes meet ================= */

type PairRel = 'line' | 'parallel' | 'same';

interface PlanesFlowParams {
  rel: PairRel;
  n1: Vec;
  d1: number;
  n2: Vec;
  d2: number;
}

/** A normal with no common factor and its first non-zero entry positive. */
function baseNormal(rng: Draw, least: number): Vec {
  for (let tries = 0; tries < 200; tries += 1) {
    const n = vec3(rng, -3, 3);
    if (nonZeroCount(n) < least) continue;
    const s = simplest(n);
    if (s.every((x, i) => x === n[i])) return n;
  }
  return [1, -2, 3];
}

/** `n2 = r n1`, with the ratio read from the first component both have. */
function multipleWorking(n1: Vec, n2: Vec): { tex?: string; text?: string }[] {
  const i = n1.findIndex((x, idx) => x !== 0 && n2[idx] !== 0);
  if (i < 0 || !isParallel(n1, n2)) {
    if (i < 0) {
      return [{ text: 'The non-zero components of the two normals sit in different places, so neither normal is a multiple of the other.' }];
    }
    const ratio = [n2[i], n1[i]] as const;
    const j = [0, 1, 2].find((idx) => n2[idx] * n1[i] !== ratio[0] * n1[idx]) ?? 0;
    return [
      {
        text: `Matching the $${AXES[i]}$ components needs $\\mathbf{n}_2 = ${multipleTex(ratio[0], ratio[1])}\\mathbf{n}_1$. Then the $${AXES[j]}$ component of $\\mathbf{n}_2$ would be $${fracTex(ratio[0] * n1[j], ratio[1])}$, but it is $${n2[j]}$. So $\\mathbf{n}_2$ is not a multiple of $\\mathbf{n}_1$.`,
      },
    ];
  }
  return [{ tex: `\\mathbf{n}_2 = ${multipleTex(n2[i], n1[i])}\\mathbf{n}_1` }];
}

/** The factor in front of a vector: `3`, `-`, `\frac{3}{2}\,`, nothing for one. */
function multipleTex(top: number, bottom: number): string {
  const f = fracTex(top, bottom);
  if (f === '1') return '';
  if (f === '-1') return '-';
  return f.includes('frac') ? `${f}\\,` : f;
}

const vplxPlanesFlow: Generator<PlanesFlowParams> = {
  id: 'vplx-planes-flow',
  sample: (rng, difficulty) => {
    const rel = rng.pick<PairRel>(['line', 'parallel', 'same']);
    for (let tries = 0; tries < 400; tries += 1) {
      if (rel === 'line') {
        const n1 = vec3(rng, -3, 3);
        if (nonZeroCount(n1) < (difficulty > 1 ? 2 : 3)) continue;
        let n2: Vec;
        if (difficulty > 1 && rng.chance(0.5)) {
          // Nearly a multiple: one component nudged, the trap at this level.
          n2 = scaled(rng.pick([2, 3, -2, -1]), n1);
          n2[rng.int(0, 2)] += rng.pick([-1, 1]);
        } else {
          n2 = vec3(rng, -4, 4);
        }
        if (nonZeroCount(n2) < 2 || isParallel(n1, n2) || biggest(n2) > 12) continue;
        return { rel, n1, d1: rng.int(-6, 6), n2, d2: rng.int(-6, 6) };
      }
      const n = baseNormal(rng, difficulty > 1 ? 2 : 3);
      const p = difficulty > 1 ? rng.pick([1, 1, 2, -1]) : 1;
      const q = rng.pick(difficulty > 1 ? [2, 3, -2, -3, 4] : [2, 3, -1, -2]);
      if (p === q) continue;
      const e = rng.int(-4, 4);
      const n1 = scaled(p, n);
      const n2 = scaled(q, n);
      if (biggest(n2) > 12) continue;
      const d2 = rel === 'same' ? q * e : q * e + nonZeroInt(rng, 3);
      return { rel, n1, d1: p * e, n2, d2 };
    }
    return { rel: 'line', n1: [1, 2, -1], d1: 3, n2: [2, -1, 1], d2: 1 };
  },
  render: ({ rel, n1, d1, n2, d2 }): Slide => ({
    kind: 'flow',
    prompt: [
      { kind: 'prose', text: 'How do these two planes meet? Work down the questions; each answer chooses what gets asked next.' },
      namedPlane(1, n1, d1),
      namedPlane(2, n2, d2),
    ],
    subject: `\\mathbf{n}_1 = ${colTex(n1)} \\qquad \\mathbf{n}_2 = ${colTex(n2)}`,
    steps: [
      {
        id: 'normals',
        ask: 'Is $\\mathbf{n}_2$ a multiple of $\\mathbf{n}_1$?',
        branches: [
          { label: 'Yes', to: 'constants' },
          { label: 'No', outcome: 'The planes meet in a line.' },
        ],
      },
      {
        id: 'constants',
        ask: 'Is the whole equation of $\\Pi_2$ that same multiple of the equation of $\\Pi_1$, constant included?',
        branches: [
          { label: 'Yes', outcome: 'They are the same plane.' },
          { label: 'No', outcome: 'They are parallel and never meet.' },
        ],
      },
    ],
    answer: rel === 'line' ? ['No'] : rel === 'same' ? ['Yes', 'Yes'] : ['Yes', 'No'],
  }),
  solution: ({ rel, n1, d1, n2, d2 }) => {
    const steps: { text?: string; tex?: string }[] = [
      {
        text: `Read the normals off the coefficients: $\\mathbf{n}_1 = ${point3Tex(n1)}$ and $\\mathbf{n}_2 = ${point3Tex(n2)}$.`,
      },
      ...multipleWorking(n1, n2),
    ];
    if (rel === 'line') {
      steps.push({ text: 'The planes face different ways, so they cross, and two planes that cross meet in a line.' });
      return steps;
    }
    const i = n1.findIndex((x) => x !== 0);
    const ratio = fracTex(n2[i], n1[i]);
    steps.push(
      { text: 'The planes face the same way. Now the constants: the same multiple of $\\Pi_1$\'s constant is' },
      { tex: `${ratio} \\times ${paren(d1)} = ${fracTex(n2[i] * d1, n1[i])}` },
      {
        text:
          rel === 'same'
            ? `That is $\\Pi_2$'s constant, $${d2}$, so $\\Pi_2$ is $\\Pi_1$ multiplied through: the same plane.`
            : `$\\Pi_2$'s constant is $${d2}$, not that, so the planes are parallel and never meet.`,
      },
    );
    return steps;
  },
};

type UnknownAsk = 'k' | 'd';

interface PlanesUnknownParams {
  ask: UnknownAsk;
  n: Vec;
  e: number;
  q: number;
  pos: number;
  off: number;
}

const unknownAnswer = ({ ask, n, e, q, pos }: PlanesUnknownParams) => (ask === 'k' ? q * n[pos] : q * e);

/** The coefficient that makes two planes parallel, or the constant that makes them one plane. */
const vplxPlanesUnknown: Generator<PlanesUnknownParams> = {
  id: 'vplx-planes-unknown',
  choices: (params) => {
    const { ask, n, e, q, pos } = params;
    const answer = unknownAnswer(params);
    // Not scaled at all, scaled the wrong way, and the sign lost.
    const wrong = ask === 'k' ? [n[pos], -answer, answer + q] : [e, -answer, e + q];
    return steered(signedChoices(answer, wrong), saltOf(params));
  },
  sample: (rng, difficulty) => {
    const ask = rng.pick<UnknownAsk>(['k', 'd']);
    for (let tries = 0; tries < 200; tries += 1) {
      const n = baseNormal(rng, difficulty > 1 ? 2 : 3);
      const q = rng.pick(difficulty > 1 ? [2, 3, 4, -2, -3] : [2, 3, 4]);
      if (biggest(n) * Math.abs(q) > 12) continue;
      const nonZero = [0, 1, 2].filter((i) => n[i] !== 0);
      const pos = rng.pick(nonZero);
      const e = nonZeroInt(rng, 6);
      return { ask, n, e, q, pos, off: nonZeroInt(rng, 3) };
    }
    return { ask, n: [2, -1, 3], e: 1, q: 3, pos: 1, off: 4 };
  },
  render: (params): Slide => {
    const { ask, n, e, q, pos, off } = params;
    const n2: (number | string)[] = n.map((x) => q * x);
    if (ask === 'k') n2[pos] = 'k';
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: ask === 'k' ? 'The two planes are parallel. Find $k$.' : 'The two equations describe the same plane. Find $d$.',
        },
        namedPlane(1, n, e),
        namedPlane(2, n2, ask === 'k' ? q * e + off : 'd'),
      ],
      lead: ask === 'k' ? 'k =' : 'd =',
      keypad: [],
      answer: `${unknownAnswer(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ ask, n, e, q, pos }) => {
    const known = [0, 1, 2].find((i) => n[i] !== 0 && (ask === 'd' || i !== pos)) ?? 0;
    return [
      {
        text:
          ask === 'k'
            ? 'Parallel planes have parallel normals, so $\\mathbf{n}_2$ is a multiple of $\\mathbf{n}_1$. A component with no unknown gives the multiple:'
            : 'The same plane means $\\Pi_2$ is $\\Pi_1$ multiplied through, constant included. The coefficients give the multiple:',
      },
      { tex: `${q * n[known]} \\div ${paren(n[known])} = ${q}` },
      ask === 'k'
        ? { tex: `k = ${q} \\times ${paren(n[pos])} = ${q * n[pos]}` }
        : { tex: `d = ${q} \\times ${paren(e)} = ${q * e}` },
    ];
  },
};

interface PlanesCosParams {
  n1: Vec;
  n2: Vec;
  d1: number;
  d2: number;
}

function cosSteps(u: Vec, v: Vec, names: [string, string], fn: '\\cos' | '\\sin') {
  const dot = dotOf(u, v);
  const mu = lengthOf(u);
  const mv = lengthOf(v);
  return [
    { text: `The scalar product $${names[0]} \\cdot ${names[1]}$:` },
    ...dotLines(v, u),
    { tex: `|${names[0]}| = \\sqrt{${dotOf(u, u)}} = ${mu}` },
    { tex: `|${names[1]}| = \\sqrt{${dotOf(v, v)}} = ${mv}` },
    ...(dot < 0 ? [{ text: 'The scalar product is negative; its modulus gives the acute angle.' }] : []),
    { tex: `${fn}\\theta = \\frac{${Math.abs(dot)}}{${mu} \\times ${mv}} = ${fracTex(Math.abs(dot), mu * mv)}` },
  ];
}

/** The cosine of the acute angle between two planes, as a fraction. */
const vplxPlanesCos: Generator<PlanesCosParams> = {
  id: 'vplx-planes-cos',
  choices: (params) => {
    const { n1, n2 } = params;
    const dot = Math.abs(dotOf(n1, n2));
    const a = lengthOf(n1);
    const b = lengthOf(n2);
    // The lengths left squared, added rather than multiplied, and the sign kept negative.
    return fractionChoices(
      [dot, a * b],
      [
        [dot, dotOf(n1, n1) * dotOf(n2, n2)],
        [dot, a + b],
        [-dot, a * b],
      ],
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const [n1, n2] = sampleWholePair(rng, difficulty);
    return { n1, n2, d1: rng.int(-6, 6), d2: rng.int(-6, 6) };
  },
  render: ({ n1, n2, d1, d2 }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: '$\\theta$ is the acute angle between the planes. Both normals have whole length. Find $\\cos\\theta$ as a fraction.',
      },
      namedPlane(1, n1, d1),
      namedPlane(2, n2, d2),
    ],
    lead: '\\cos\\theta =',
    keypad: [{ insert: '/' }],
    answer: `${Math.abs(dotOf(n1, n2))}/${lengthOf(n1) * lengthOf(n2)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n1, n2 }) => [
    {
      text: `The angle between two planes is the angle between their normals, $\\mathbf{n}_1 = ${point3Tex(n1)}$ and $\\mathbf{n}_2 = ${point3Tex(n2)}$.`,
    },
    ...cosSteps(n1, n2, ['\\mathbf{n}_1', '\\mathbf{n}_2'], '\\cos'),
  ],
};

/* ================= Lesson 2: the line of intersection ================= */

interface MeetPlanesParams {
  n1: Vec;
  n2: Vec;
  P: Vec;
  zero: number;
}

/** The two coordinates left when `zero` is set to zero. */
const freeOf = (zero: number): [number, number] => [0, 1, 2].filter((i) => i !== zero) as [number, number];

/**
 * Two planes meeting in a line, built from a point on both with one
 * coordinate zero. That coordinate's component of `n1 x n2` is non-zero, so
 * setting it to zero leaves two equations with exactly one solution.
 */
function sampleMeetPlanes(rng: Draw, difficulty: number): MeetPlanesParams {
  for (let tries = 0; tries < 500; tries += 1) {
    const n1 = vec3(rng, -3, 3);
    const n2 = vec3(rng, -3, 3);
    const least = difficulty > 1 ? 2 : 3;
    if (nonZeroCount(n1) < least || nonZeroCount(n2) < least || isParallel(n1, n2)) continue;
    const c = crossOf(n1, n2);
    if (difficulty === 1 && nonZeroCount(c) < 3) continue;
    const zero = difficulty > 1 ? rng.int(0, 2) : 2;
    if (c[zero] === 0) continue;
    const [i] = freeOf(zero);
    // The first free unknown in both equations, and a unit in the first at first.
    if (n1[i] === 0 || n2[i] === 0 || (difficulty === 1 && n1[i] !== 1)) continue;
    const P = vec3(rng, -4, 4);
    P[zero] = 0;
    if (nonZeroCount(P) === 0) continue;
    if (Math.abs(dotOf(n1, P)) > 20 || Math.abs(dotOf(n2, P)) > 20) continue;
    return { n1, n2, P, zero };
  }
  return { n1: [1, 2, -1], n2: [2, -1, 1], P: [3, 1, 0], zero: 2 };
}

function meetPrompt({ n1, n2, P }: MeetPlanesParams, text: string): Block[] {
  return [{ kind: 'prose', text }, namedPlane(1, n1, dotOf(n1, P)), namedPlane(2, n2, dotOf(n2, P))];
}

function directionSolution({ n1, n2 }: MeetPlanesParams) {
  return [
    {
      text: `The line lies in both planes, so it is perpendicular to both normals, $\\mathbf{n}_1 = ${point3Tex(n1)}$ and $\\mathbf{n}_2 = ${point3Tex(n2)}$. Their cross product is:`,
    },
    ...crossSteps(n1, n2),
    { tex: `\\mathbf{n}_1 \\times \\mathbf{n}_2 = ${colTex(crossOf(n1, n2))}` },
  ];
}

/** The direction of the line two planes meet in, `n1 x n2`, as three tiles. */
const vplxMeetDirection: Generator<MeetPlanesParams> = {
  id: 'vplx-meet-direction',
  choices: (params) => {
    const { n1, n2 } = params;
    const c = crossOf(n1, n2);
    const wrong: Vec[] = [
      // The middle sign slipped, the product taken component by component,
      // and a sign slipped on the last component.
      [c[0], -c[1], c[2]],
      n1.map((x, i) => x * n2[i]),
      [c[0], c[1], -c[2]],
      [-c[0], c[1], c[2]],
    ];
    return steered(
      options({ tex: colTex(c) }, ...wrong.filter((w) => !w.every((x, i) => x === c[i])).map((w) => ({ tex: colTex(w) }))).slice(0, 4),
      saltOf(params),
    );
  },
  sample: sampleMeetPlanes,
  render: (params): Slide => {
    const { n1, n2 } = params;
    const c = crossOf(n1, n2);
    return {
      kind: 'tiles',
      prompt: meetPrompt(params, 'The planes meet in a line with direction $\\mathbf{n}_1 \\times \\mathbf{n}_2$. Find it.'),
      template: ROW_TEMPLATE,
      bank: bankOf(c.map(String), [`${-c[1]}`, `${-c[0]}`, `${-c[2]}`]),
      answer: c.map(String),
    };
  },
  solution: directionSolution,
};

function pointEquations({ n1, n2, P, zero }: MeetPlanesParams): [Equation2, Equation2, [string, string], [number, number]] {
  const [i, j] = freeOf(zero);
  return [
    [n1[i], n1[j], dotOf(n1, P)],
    [n2[i], n2[j], dotOf(n2, P)],
    [AXES[i], AXES[j]],
    [P[i], P[j]],
  ];
}

function pointSolution(params: MeetPlanesParams) {
  const [e1, e2, names, values] = pointEquations(params);
  return [
    { text: `Put $${AXES[params.zero]} = 0$ into both equations:` },
    { tex: eq2Tex(e1, names) },
    { tex: eq2Tex(e2, names) },
    ...solveTwoSteps(e1, e2, names, values),
    { text: `So $${point3Tex(params.P)}$ is on both planes. Check it in both equations before going on.` },
  ];
}

/** The same point as a tree: the second unknown, then the first, then the point. */
const vplxMeetSolveTree: Generator<MeetPlanesParams> = {
  id: 'vplx-meet-solve-tree',
  sample: sampleMeetPlanes,
  render: (params): Slide => {
    const [e1, e2, names, values] = pointEquations(params);
    const { P, zero } = params;
    const answer = [`${values[1]}`, `${values[0]}`, point3Tex(P)];
    const swapped = [...P];
    const [i, j] = freeOf(zero);
    [swapped[i], swapped[j]] = [P[j], P[i]];
    return {
      kind: 'tree',
      prompt: meetPrompt(
        params,
        `Find a point on both planes with $${AXES[zero]} = 0$: solve for $${names[1]}$, then $${names[0]}$, then write the point.`,
      ),
      expression: `${eq2Tex(e1, names)} \\qquad ${eq2Tex(e2, names)}`,
      nodes: [
        { id: 'second', from: [] },
        { id: 'first', from: ['second'] },
        { id: 'point', from: ['first', 'second'] },
      ],
      bank: treeBank(answer, [
        `${-values[1]}`,
        `${-values[0]}`,
        point3Tex(swapped),
        `${values[1] + 1}`,
        `${values[0] - 1}`,
        `${values[0] + 2}`,
      ]),
      answer,
    };
  },
  solution: pointSolution,
};

/** A point on both planes, one coordinate set to zero, as three tiles. */
const vplxMeetPoint: Generator<MeetPlanesParams> = {
  id: 'vplx-meet-point',
  sample: sampleMeetPlanes,
  render: (params): Slide => {
    const { P, zero } = params;
    const [i, j] = freeOf(zero);
    return {
      kind: 'tiles',
      prompt: meetPrompt(params, `Find the point on both planes with $${AXES[zero]} = 0$.`),
      template: ROW_TEMPLATE,
      bank: bankOf(P.map(String), [`${P[j]}`, `${P[i]}`, `${-P[i]}`, `${-P[j]}`]),
      answer: P.map(String),
    };
  },
  solution: pointSolution,
};

/** Whether `r = a + t b` and `r = p + s v` are one line. */
function sameLine(a: Vec, b: Vec, p: Vec, v: Vec): boolean {
  return isParallel(b, v) && isParallel(plus(p, scaled(-1, a)), b);
}

/** Which line is the one the planes meet in? */
const vplxMeetLine: Generator<MeetPlanesParams> = {
  id: 'vplx-meet-line',
  sample: sampleMeetPlanes,
  render: (params): Slide => {
    const { n1, n2, P, zero } = params;
    const d = simplest(crossOf(n1, n2));
    const c = d;
    // Right direction from a point on one plane only; the right point with a
    // normal, or a slipped cross product, as the direction.
    const nudged = [...P];
    nudged[(zero + 1) % 3] += 1;
    const candidates: [Vec, Vec][] = [
      [P, simplest([c[0], -c[1], c[2]])],
      [P, simplest(n1)],
      [nudged, d],
      [P, simplest([-c[0], c[1], c[2]])],
      [P, simplest(n2)],
      [plus(P, n1), d],
    ];
    const wrong = candidates
      .filter(([a, b]) => nonZeroCount(b) > 0 && !sameLine(P, d, a, b))
      .slice(0, 3)
      .map(([a, b], idx) => ({ id: `slip${idx}`, label: lineTex(a, b) }));
    return {
      kind: 'choice',
      prompt: meetPrompt(params, 'Which is an equation of the line where the planes meet?'),
      options: placeAnswer({ id: 'line', label: lineTex(P, d) }, wrong, saltOf(params)),
      correctId: 'line',
    };
  },
  solution: (params) => {
    const { n1, n2, P } = params;
    const c = crossOf(n1, n2);
    const d = simplest(c);
    return [
      ...directionSolution(params).slice(0, 1),
      { tex: `\\mathbf{n}_1 \\times \\mathbf{n}_2 = ${colTex(c)}` },
      ...(d.every((x, i) => x === c[i]) ? [] : [{ text: `Any multiple will do; divided down, the direction is $${point3Tex(d)}$.` }]),
      { text: `A point on both planes: $${point3Tex(P)}$ satisfies both equations.` },
      { tex: `\\Pi_1\\colon \\; {${substituteTex(n1, P.map(String))} = ${dotOf(n1, P)}}` },
      { tex: `\\Pi_2\\colon \\; {${substituteTex(n2, P.map(String))} = ${dotOf(n2, P)}}` },
      { tex: lineTex(P, d) },
    ];
  },
};

/* ================= Lesson 3: where a line meets a plane, and at what angle ================= */

interface MeetAngleParams {
  a: Vec;
  b: Vec;
  n: Vec;
  t: number;
  cls: CosClass;
}

function sampleMeetAngle(rng: Draw, difficulty: number): MeetAngleParams {
  for (let tries = 0; tries < 300; tries += 1) {
    const cls = rng.pick<CosClass>(difficulty > 1 ? ['half', 'root2', 'root3'] : ['half', 'root2', 'half', 'root3']);
    const [b, n] = rng.pick(standardPairs(cls, difficulty > 1 ? 3 : 2));
    const t = nonZeroInt(rng, difficulty > 1 ? 4 : 3);
    const a = vec3(rng, -4, 4);
    if (nonZeroCount(a) < 2) continue;
    const P = plus(a, scaled(t, b));
    if (biggest(P) > 12) continue;
    return { a, b, n, t, cls };
  }
  return { a: [2, -1, 3], b: [1, 1, 0], n: [0, 1, 1], t: 3, cls: 'root3' };
}

function meetAngleValues({ a, b, n, t, cls }: MeetAngleParams) {
  const P = plus(a, scaled(t, b));
  return { P, d: dotOf(n, P), an: dotOf(a, n), bn: dotOf(b, n), theta: 90 - CLASS_ANGLE[cls] };
}

function meetAnglePrompt(params: MeetAngleParams, text: string): Block[] {
  const { a, b, n } = params;
  return [{ kind: 'prose', text }, { kind: 'display', tex: lineTex(a, b) }, namedPlane(undefined, n, meetAngleValues(params).d)];
}

/** `|b . n| / (|b||n|)` and the standard value it is, without writing a half as a half twice. */
function sinTail(top: number, square: number, cls: CosClass): string {
  const raw = `\\frac{${top}}{${surdTex(square)}}`;
  const root = wholeRoot(square);
  if (root === undefined) return `${raw} = ${CLASS_COS[cls]}`;
  const reduced = fracTex(top, root);
  return reduced === raw ? raw : `${raw} = ${reduced}`;
}

function meetAngleSolution(params: MeetAngleParams) {
  const { a, b, n, t, cls } = params;
  const { P, d, an, bn, theta } = meetAngleValues(params);
  const B = dotOf(b, b);
  const N = dotOf(n, n);
  return [
    { text: 'Both parts start from the scalar products with the normal:' },
    { tex: `\\mathbf{a} \\cdot \\mathbf{n} = ${productsTex(a, n)} = ${an}` },
    { tex: `\\mathbf{b} \\cdot \\mathbf{n} = ${productsTex(b, n)} = ${bn}` },
    { text: 'Where they meet, $\\mathbf{a} \\cdot \\mathbf{n} + t\\,\\mathbf{b} \\cdot \\mathbf{n} = d$:' },
    { tex: `${affTex(an, bn, 't')} = ${d}` },
    { tex: solvedForTex(bn, 't', d - an, `t = ${t}`) },
    { tex: `\\begin{aligned} &${colTex(a)} ${t < 0 ? '-' : '+'} ${Math.abs(t) === 1 ? '' : Math.abs(t)}${colTex(b)} \\\\ &= ${colTex(P)} \\end{aligned}` },
    { text: `The lengths are $|\\mathbf{b}| = ${rootTex(B)}$ and $|\\mathbf{n}| = ${rootTex(N)}$.` },
    { tex: `\\sin\\theta = ${sinTail(Math.abs(bn), B * N, cls)}` },
    { text: `So they meet at $${point3Tex(P)}$, at $\\theta = ${theta}^\\circ$.` },
  ];
}

/** The meeting point and the angle as one tree, both fed by `b . n`. */
const vplxMeetAngleTree: Generator<MeetAngleParams> = {
  id: 'vplx-meet-angle-tree',
  sample: sampleMeetAngle,
  render: (params): Slide => {
    const { a, b, t } = params;
    const { P, an, bn, theta } = meetAngleValues(params);
    const answer = [`${an}`, `${bn}`, `${t}`, `${theta}^\\circ`, point3Tex(P)];
    return {
      kind: 'tree',
      prompt: meetAnglePrompt(
        params,
        'Find $\\mathbf{a} \\cdot \\mathbf{n}$ and $\\mathbf{b} \\cdot \\mathbf{n}$, then $t$ and the acute angle $\\theta$, then the point where the line meets $\\Pi$.',
      ),
      expression: `\\mathbf{a} \\cdot \\mathbf{n} + t\\,\\mathbf{b} \\cdot \\mathbf{n} = d \\qquad \\sin\\theta = \\frac{|\\mathbf{b} \\cdot \\mathbf{n}|}{|\\mathbf{b}| \\, |\\mathbf{n}|}`,
      nodes: [
        { id: 'an', from: [] },
        { id: 'bn', from: [] },
        { id: 't', from: ['an', 'bn'] },
        { id: 'theta', from: ['bn'] },
        { id: 'point', from: ['t'] },
      ],
      bank: treeBank(answer, [
        `${90 - theta === theta ? 60 : 90 - theta}^\\circ`,
        `${-t}`,
        point3Tex(plus(a, scaled(-t, b))),
        `${-bn}`,
        `${an + 1}`,
        `${t + 1}`,
      ]),
      answer,
    };
  },
  solution: meetAngleSolution,
};

/** Point and angle together, from four pairs. */
const vplxMeetAnglePair: Generator<MeetAngleParams> = {
  id: 'vplx-meet-angle-pair',
  sample: sampleMeetAngle,
  render: (params): Slide => {
    const { a, b, t } = params;
    const { P, theta } = meetAngleValues(params);
    // The angle with the normal, or 60 when that is 45 again.
    const slipAngle = 90 - theta === theta ? 60 : 90 - theta;
    // The point reached with t's sign slipped.
    const slipPoint = plus(a, scaled(-t, b));
    const label = (p: Vec, angle: number) => `${point3Tex(p)}, \\; \\theta = ${angle}^\\circ`;
    return {
      kind: 'choice',
      prompt: meetAnglePrompt(params, 'Where does the line meet $\\Pi$, and at what acute angle?'),
      options: placeAnswer(
        { id: 'both', label: label(P, theta) },
        [
          { id: 'angle', label: label(P, slipAngle) },
          { id: 'point', label: label(slipPoint, theta) },
          { id: 'neither', label: label(slipPoint, slipAngle) },
        ],
        saltOf(params),
      ),
      correctId: 'both',
    };
  },
  solution: meetAngleSolution,
};

interface LinePlaneSinParams {
  a: Vec;
  b: Vec;
  n: Vec;
  off: number;
}

/** The sine of the angle between a line and a plane, as a fraction. */
const vplxLinePlaneSin: Generator<LinePlaneSinParams> = {
  id: 'vplx-line-plane-sin',
  choices: (params) => {
    const { b, n } = params;
    const dot = Math.abs(dotOf(b, n));
    const B = lengthOf(b);
    const N = lengthOf(n);
    return fractionChoices(
      [dot, B * N],
      [
        [dot, dotOf(b, b) * dotOf(n, n)],
        [dot, B + N],
        [-dot, B * N],
      ],
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const [b, n] = sampleWholePair(rng, difficulty);
    return { a: vec3(rng, -4, 4), b, n, off: rng.int(-4, 4) };
  },
  render: ({ a, b, n, off }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: '$\\theta$ is the acute angle between the line and $\\Pi$. The direction and the normal have whole length. Find $\\sin\\theta$ as a fraction.',
      },
      { kind: 'display', tex: lineTex(a, b) },
      namedPlane(undefined, n, dotOf(a, n) + off),
    ],
    lead: '\\sin\\theta =',
    keypad: [{ insert: '/' }],
    answer: `${Math.abs(dotOf(b, n))}/${lengthOf(b) * lengthOf(n)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ b, n }) => [
    {
      text: `The line's direction is $\\mathbf{b} = ${point3Tex(b)}$ and the plane's normal is $\\mathbf{n} = ${point3Tex(n)}$. The angle with the plane uses $\\sin$, because the normal is at right angles to the plane.`,
    },
    ...cosSteps(b, n, ['\\mathbf{b}', '\\mathbf{n}'], '\\sin'),
  ],
};

interface InPlaneParams {
  a: Vec;
  b: Vec;
  n: Vec;
  pos: number;
}

/** The coefficient and constant that put a whole line into a plane, as two tiles. */
const vplxLineInPlane: Generator<InPlaneParams> = {
  id: 'vplx-line-in-plane',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 500; tries += 1) {
      const pos = difficulty > 1 ? rng.int(0, 2) : 2;
      const b = vec3(rng, -3, 3);
      if (b[pos] === 0 || (difficulty === 1 && Math.abs(b[pos]) !== 1) || nonZeroCount(b) < 2) continue;
      const n = vec3(rng, -3, 3);
      n[pos] = 0;
      if (nonZeroCount(n) < 2) continue;
      const rest = dotOf(b, n);
      if (rest % b[pos] !== 0) continue;
      n[pos] = -rest / b[pos];
      if (n[pos] === 0 || Math.abs(n[pos]) > 9) continue;
      const a = vec3(rng, -4, 4);
      if (nonZeroCount(a) < 2 || dotOf(a, n) === 0 || Math.abs(dotOf(a, n)) > 25) continue;
      return { a, b, n, pos };
    }
    return { a: [1, 2, 1], b: [2, 1, -1], n: [1, 1, 3], pos: 2 };
  },
  render: ({ a, b, n, pos }): Slide => {
    const shown: (number | string)[] = [...n];
    shown[pos] = 'k';
    const k = n[pos];
    const d = dotOf(a, n);
    const slipped = [...n];
    slipped[pos] = -k;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'The whole line lies in the plane $\\Pi$. Find $k$ and $d$.' },
        { kind: 'display', tex: lineTex(a, b) },
        namedPlane(undefined, shown, 'd'),
      ],
      template: 'k = {0} \\qquad d = {1}',
      bank: bankOf([`${k}`, `${d}`], [`${-k}`, `${dotOf(a, slipped)}`, `${-d}`]),
      answer: [`${k}`, `${d}`],
    };
  },
  solution: ({ a, b, n, pos }) => {
    const entries = n.map((x, i) => (i === pos ? 'k' : `${x}`));
    const rest = dotOf(b, n) - b[pos] * n[pos];
    const put = substituteTex(b, entries);
    const collected = kFirstTex(rest, b[pos]);
    return [
      { text: 'The line runs along the plane, so its direction is perpendicular to the normal, $\\mathbf{b} \\cdot \\mathbf{n} = 0$:' },
      ...(put === collected ? [] : [{ tex: `${put} = 0` }]),
      { tex: `${collected} = 0 \\implies k = ${n[pos]}` },
      { text: `Its starting point $${point3Tex(a)}$ is on the plane too, so $d = \\mathbf{a} \\cdot \\mathbf{n}$:` },
      ...dotLines(a, n),
    ];
  },
};

/* ================= Lesson 4: three planes meeting at a point ================= */

interface DetParams {
  n1: Vec;
  n2: Vec;
  n3: Vec;
  ds: Vec;
}

const detOf = ({ n1, n2, n3 }: { n1: Vec; n2: Vec; n3: Vec }) => dotOf(n1, crossOf(n2, n3));

function threePlanes({ n1, n2, n3 }: { n1: Vec; n2: Vec; n3: Vec }, ds: (number | string)[], k?: number): Block[] {
  const first: (number | string)[] = [...n1];
  if (k !== undefined) first[k] = 'k';
  return [namedPlane(1, first, ds[0]), namedPlane(2, n2, ds[1]), namedPlane(3, n3, ds[2])];
}

function detSolution({ n1, n2, n3 }: { n1: Vec; n2: Vec; n3: Vec }) {
  const c = crossOf(n2, n3);
  return [
    { text: 'The determinant of the normals is $\\mathbf{n}_1 \\cdot (\\mathbf{n}_2 \\times \\mathbf{n}_3)$. First the cross product:' },
    ...crossSteps(n2, n3),
    { text: `Then its scalar product with $\\mathbf{n}_1 = ${point3Tex(n1)}$:` },
    ...dotLines(c, n1),
  ];
}

function sampleDet(rng: Draw, difficulty: number): DetParams {
  const singular = difficulty > 1 && rng.chance(0.25);
  for (let tries = 0; tries < 500; tries += 1) {
    const n1 = vec3(rng, -3, 3);
    const n2 = vec3(rng, -3, 3);
    const least = difficulty > 1 ? 2 : 3;
    if (nonZeroCount(n1) < least || nonZeroCount(n2) < least || isParallel(n1, n2)) continue;
    let n3: Vec;
    if (singular) {
      n3 = plus(scaled(nonZeroInt(rng, 2), n1), scaled(nonZeroInt(rng, 2), n2));
      if (biggest(n3) > 6) continue;
    } else {
      n3 = vec3(rng, -3, 3);
    }
    if (nonZeroCount(n3) < least || isParallel(n3, n1) || isParallel(n3, n2)) continue;
    if (nonZeroCount(crossOf(n2, n3)) < 2) continue;
    if ((detOf({ n1, n2, n3 }) === 0) !== singular) continue;
    return { n1, n2, n3, ds: [rng.int(-6, 6), rng.int(-6, 6), rng.int(-6, 6)] };
  }
  return { n1: [1, 1, 1], n2: [1, -1, 2], n3: [2, 1, -1], ds: [2, -3, 5] };
}

/** The determinant of three planes' normals, as the scalar triple product. */
const vplxDet: Generator<DetParams> = {
  id: 'vplx-det',
  choices: (params) => {
    const { n1, n2, n3 } = params;
    const det = detOf(params);
    const c = crossOf(n2, n3);
    // The middle component of the cross product slipped, and the sign lost.
    return steered(signedChoices(det, [dotOf(n1, [c[0], -c[1], c[2]]), -det, det + 2]), saltOf(params));
  },
  sample: sampleDet,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find the determinant of the three normals, $\\mathbf{n}_1 \\cdot (\\mathbf{n}_2 \\times \\mathbf{n}_3)$.' },
      ...threePlanes(params, params.ds),
    ],
    lead: '\\mathbf{n}_1 \\cdot (\\mathbf{n}_2 \\times \\mathbf{n}_3) =',
    keypad: [],
    answer: `${detOf(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => [
    ...detSolution(params),
    {
      text:
        detOf(params) === 0
          ? 'It is zero, so the planes do not meet at a single point.'
          : 'It is not zero, so the three planes meet at exactly one point.',
    },
  ],
};

/** The same determinant as a tree: the three components of `n2 x n3`, then the scalar product. */
const vplxTripleTree: Generator<DetParams> = {
  id: 'vplx-triple-tree',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 50; tries += 1) {
      const params = sampleDet(rng, difficulty);
      if (nonZeroCount(crossOf(params.n2, params.n3)) === 3) return params;
    }
    return { n1: [1, 1, 1], n2: [1, -1, 2], n3: [2, 1, -1], ds: [2, -3, 5] };
  },
  render: (params): Slide => {
    const { n1, n2, n3, ds } = params;
    const c = crossOf(n2, n3);
    const det = detOf(params);
    const answer = [...c.map(String), `${det}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Find the determinant of the normals: the $x$, $y$ and $z$ components of $\\mathbf{n}_2 \\times \\mathbf{n}_3$, then the scalar product with $\\mathbf{n}_1$.',
        },
        ...threePlanes(params, ds),
      ],
      expression: '\\mathbf{n}_1 \\cdot (\\mathbf{n}_2 \\times \\mathbf{n}_3)',
      nodes: [
        { id: 'cx', from: [] },
        { id: 'cy', from: [] },
        { id: 'cz', from: [] },
        { id: 'det', from: ['cx', 'cy', 'cz'] },
      ],
      bank: treeBank(answer, [
        `${-c[1]}`,
        `${-c[0]}`,
        `${-c[2]}`,
        `${-det}`,
        `${dotOf(n1, [c[0], -c[1], c[2]])}`,
        `${det + 1}`,
        `${det - 1}`,
        `${c[0] + 1}`,
        `${det + 2}`,
        `${det - 2}`,
        `${c[1] + 2}`,
        `${c[2] - 3}`,
      ]),
      answer,
    };
  },
  solution: detSolution,
};

interface ThreePointParams {
  n1: Vec;
  n2: Vec;
  n3: Vec;
  P: Vec;
}

/**
 * Three planes through one whole point, the first with `x` on its own, so
 * taking multiples of it from the other two removes `x` in whole numbers.
 */
function sampleThreePoint(rng: Draw, difficulty: number): ThreePointParams {
  const most = difficulty > 1 ? 9 : 6;
  for (let tries = 0; tries < 800; tries += 1) {
    const n1 = [1, rng.int(-3, 3), rng.int(-3, 3)];
    const n2 = vec3(rng, -3, 3);
    const n3 = vec3(rng, -3, 3);
    if (nonZeroCount(n1) < 2 || nonZeroCount(n2) < 2 || nonZeroCount(n3) < 2) continue;
    if (difficulty === 1 && (n2[0] === 0 || n3[0] === 0)) continue;
    if (detOf({ n1, n2, n3 }) === 0) continue;
    const [e2, e3] = reducedPair(n1, n2, n3, [0, 0, 0]);
    if ([...e2.slice(0, 2), ...e3.slice(0, 2)].some((x) => Math.abs(x) > most)) continue;
    const P = vec3(rng, -3, 3);
    if (nonZeroCount(P) < 2) continue;
    if ([n1, n2, n3].some((n) => Math.abs(dotOf(n, P)) > 20)) continue;
    return { n1, n2, n3, P };
  }
  return { n1: [1, 1, 1], n2: [1, -1, 2], n3: [2, 1, -1], P: [1, 2, -1] };
}

/** `x` taken out of the second and third equations using the first. */
function reducedPair(n1: Vec, n2: Vec, n3: Vec, P: Vec): [Equation2, Equation2] {
  const d1 = dotOf(n1, P);
  const reduce = (n: Vec): Equation2 => [n[1] - n[0] * n1[1], n[2] - n[0] * n1[2], dotOf(n, P) - n[0] * d1];
  return [reduce(n2), reduce(n3)];
}

function removeXText(a: number, which: string): string {
  if (a === 0) return `The ${which} has no $x$ already.`;
  const size = Math.abs(a) === 1 ? 'the first' : `$${Math.abs(a)}$ times the first`;
  return a > 0 ? `Take ${size} from the ${which}.` : `Add ${size} to the ${which}.`;
}

function threePointSolution({ n1, n2, n3, P }: ThreePointParams) {
  const [e2, e3] = reducedPair(n1, n2, n3, P);
  const d1 = dotOf(n1, P);
  return [
    { text: 'The first equation has $x$ on its own. Use it to remove $x$ from the other two.' },
    { text: `${removeXText(n2[0], 'second')} ${removeXText(n3[0], 'third')}` },
    { tex: eq2Tex(e2, ['y', 'z']) },
    { tex: eq2Tex(e3, ['y', 'z']) },
    { text: 'Two equations in $y$ and $z$.' },
    ...solveTwoSteps(e2, e3, ['y', 'z'], [P[1], P[2]]),
    { text: 'Then $x$ from the first equation:' },
    { tex: `${substituteTex(n1, ['x', `${P[1]}`, `${P[2]}`])} = ${d1}` },
    { tex: `x = ${P[0]}` },
    { text: `So the planes meet at $${point3Tex(P)}$. Check it in all three equations.` },
  ];
}

/** The point three planes share, as three tiles. */
const vplxThreePoint: Generator<ThreePointParams> = {
  id: 'vplx-three-point',
  sample: sampleThreePoint,
  render: ({ n1, n2, n3, P }): Slide => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'The three planes meet at a single point. Find it.' },
      ...threePlanes({ n1, n2, n3 }, [n1, n2, n3].map((n) => dotOf(n, P))),
    ],
    template: ROW_TEMPLATE,
    bank: bankOf(P.map(String), [`${-P[0]}`, `${-P[1]}`, `${-P[2]}`, `${P[2]}`, `${P[1]}`]),
    answer: P.map(String),
  }),
  solution: threePointSolution,
};

/** A point on two of the planes only: along the line where those two meet. */
function onTwoOnly(P: Vec, m: Vec, n: Vec, sign: number): Vec {
  return plus(P, scaled(sign, simplest(crossOf(m, n))));
}

/** Which point is on all three planes? Checked by substitution. */
const vplxThreeCheck: Generator<ThreePointParams> = {
  id: 'vplx-three-check',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 50; tries += 1) {
      const params = sampleThreePoint(rng, difficulty);
      const { n1, n2, n3, P } = params;
      const others = [onTwoOnly(P, n1, n2, 1), onTwoOnly(P, n1, n3, -1), onTwoOnly(P, n2, n3, 1)];
      if (others.every((Q) => biggest(Q) <= 9)) return params;
    }
    return { n1: [1, 1, 1], n2: [1, -1, 2], n3: [2, 1, -1], P: [1, 2, -1] };
  },
  render: (params): Slide => {
    const { n1, n2, n3, P } = params;
    const others = [onTwoOnly(P, n1, n2, 1), onTwoOnly(P, n1, n3, -1), onTwoOnly(P, n2, n3, 1)];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Which point lies on all three planes?' },
        ...threePlanes({ n1, n2, n3 }, [n1, n2, n3].map((n) => dotOf(n, P))),
      ],
      options: placeAnswer(
        { id: 'all', label: point3Tex(P) },
        others.map((Q, idx) => ({ id: `two${idx}`, label: point3Tex(Q) })),
        saltOf(params),
      ),
      correctId: 'all',
    };
  },
  solution: ({ n1, n2, n3, P }) => {
    const normals = [n1, n2, n3];
    const others = [onTwoOnly(P, n1, n2, 1), onTwoOnly(P, n1, n3, -1), onTwoOnly(P, n2, n3, 1)];
    const missed = [2, 1, 0];
    return [
      { text: `Put each point into each equation. $${point3Tex(P)}$ satisfies all three:` },
      ...normals.map((n, i) => ({ tex: `\\Pi_${i + 1}\\colon \\; {${substituteTex(n, P.map(String))} = ${dotOf(n, P)}}` })),
      ...others.map((Q, idx) => {
        const m = missed[idx];
        return {
          text: `$${point3Tex(Q)}$ fails $\\Pi_${m + 1}$: it gives $${dotOf(normals[m], Q)}$, not $${dotOf(normals[m], P)}$.`,
        };
      }),
    ];
  },
};

/* ================= Lesson 5: when three planes do not meet at a point ================= */

interface SingularKParams {
  n1: Vec;
  n2: Vec;
  n3: Vec;
  pos: number;
  ds: Vec;
}

const singularRest = ({ n1, n2, n3, pos }: SingularKParams) => {
  const c = crossOf(n2, n3);
  return dotOf(n1, c) - n1[pos] * c[pos];
};

/** The value of `k` that makes the determinant of the normals zero. */
const vplxSingularK: Generator<SingularKParams> = {
  id: 'vplx-singular-k',
  choices: (params) => {
    const k = params.n1[params.pos];
    const c = crossOf(params.n2, params.n3);
    const rest = singularRest(params);
    // The sign lost moving the constant across, and the last step inverted.
    return steered(signedChoices(k, [-k, c[params.pos] / rest, k + 1]), saltOf(params));
  },
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 800; tries += 1) {
      const n2 = vec3(rng, -3, 3);
      const n3 = vec3(rng, -3, 3);
      if (nonZeroCount(n2) < 2 || nonZeroCount(n3) < 2 || isParallel(n2, n3)) continue;
      const c = crossOf(n2, n3);
      const pos = difficulty > 1 ? rng.int(0, 2) : 0;
      if (c[pos] === 0 || (difficulty === 1 && Math.abs(c[pos]) > 2)) continue;
      const n1 = vec3(rng, -3, 3);
      n1[pos] = 0;
      if (nonZeroCount(n1) < 1) continue;
      const rest = dotOf(n1, c);
      if (rest % c[pos] !== 0) continue;
      const k = -rest / c[pos];
      if (k === 0 || Math.abs(k) > 9) continue;
      n1[pos] = k;
      if (isParallel(n1, n2) || isParallel(n1, n3)) continue;
      return { n1, n2, n3, pos, ds: [rng.int(-6, 6), rng.int(-6, 6), rng.int(-6, 6)] };
    }
    return { n1: [2, 1, -1], n2: [1, -1, 2], n3: [2, 1, -1], pos: 0, ds: [3, 1, 4] };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'For one value of $k$ the three planes do not meet at a single point. Find it.' },
      ...threePlanes(params, params.ds, params.pos),
    ],
    lead: 'k =',
    keypad: [],
    answer: `${params.n1[params.pos]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { n1, n2, n3, pos } = params;
    const c = crossOf(n2, n3);
    const entries = n1.map((x, i) => (i === pos ? 'k' : `${x}`));
    const rest = singularRest(params);
    const put = substituteTex(c, entries);
    const collected = kFirstTex(rest, c[pos]);
    return [
      { text: 'They fail to meet at a single point when the determinant of the normals is zero. First $\\mathbf{n}_2 \\times \\mathbf{n}_3$:' },
      ...crossSteps(n2, n3),
      { text: 'Then its scalar product with $\\mathbf{n}_1$, which holds $k$, set to zero:' },
      ...(put === collected ? [] : [{ tex: `${put} = 0` }]),
      { tex: `${collected} = 0 \\implies k = ${n1[pos]}` },
    ];
  },
};

type Config = 'point' | 'three-parallel' | 'two-parallel' | 'sheaf' | 'prism';

interface SheafParams {
  n1: Vec;
  n2: Vec;
  alpha: number;
  beta: number;
  d1: number;
  d2: number;
  off: number;
}

const sheafNormal = ({ n1, n2, alpha, beta }: SheafParams) => plus(scaled(alpha, n1), scaled(beta, n2));
const sheafD = ({ alpha, beta, d1, d2 }: SheafParams) => alpha * d1 + beta * d2;

/**
 * Two normals and the multiples that make a third, `n3 = alpha n1 + beta n2`.
 * At first each normal has a zero where the other does not, so one component
 * gives alpha and another gives beta on their own; later the two come from
 * solving a pair.
 */
function sampleSheaf(rng: Draw, difficulty: number, prism = false): SheafParams {
  for (let tries = 0; tries < 800; tries += 1) {
    const n1 = vec3(rng, -3, 3);
    const n2 = vec3(rng, -3, 3);
    if (difficulty === 1) {
      const i = rng.int(0, 2);
      const j = (i + rng.int(1, 2)) % 3;
      n1[i] = 0;
      n2[j] = 0;
      if (nonZeroCount(n1) < 2 || nonZeroCount(n2) < 2) continue;
    } else if (nonZeroCount(n1) < 2 || nonZeroCount(n2) < 2) {
      continue;
    }
    if (isParallel(n1, n2)) continue;
    const alpha = nonZeroInt(rng, 3);
    const beta = nonZeroInt(rng, 3);
    // Two equal tiles in the bank would say the two answers match.
    if (alpha === beta) continue;
    const params: SheafParams = { n1, n2, alpha, beta, d1: rng.int(-5, 5), d2: rng.int(-5, 5), off: prism ? nonZeroInt(rng, 3) : 0 };
    const n3 = sheafNormal(params);
    if (nonZeroCount(n3) < 2 || biggest(n3) > 9) continue;
    if (difficulty > 1 && pairFor(params) === undefined) continue;
    if (Math.abs(sheafD(params)) > 20) continue;
    return params;
  }
  return { n1: [1, 2, -1], n2: [2, -1, 1], alpha: 2, beta: -1, d1: 1, d2: 3, off: prism ? 5 : 0 };
}

/** Two components whose pair of equations in alpha and beta has one solution. */
function pairFor({ n1, n2 }: SheafParams): [number, number] | undefined {
  const pairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  return pairs.find(([p, q]) => n1[p] * n2[q] - n1[q] * n2[p] !== 0 && n1[p] !== 0 && n1[q] !== 0 && n2[p] !== 0);
}

function comboSolution(params: SheafParams) {
  const { n1, n2, alpha, beta } = params;
  const n3 = sheafNormal(params);
  const lone = (idx: number) => (n1[idx] === 0) !== (n2[idx] === 0);
  const steps: { text?: string; tex?: string }[] = [
    { text: 'Write $\\mathbf{n}_3 = \\alpha\\mathbf{n}_1 + \\beta\\mathbf{n}_2$ one component at a time.' },
  ];
  const direct = [0, 1, 2].filter(lone);
  if (direct.length >= 2) {
    for (const idx of direct.slice(0, 2)) {
      const useAlpha = n2[idx] === 0;
      const coef = useAlpha ? n1[idx] : n2[idx];
      const name = useAlpha ? '\\alpha' : '\\beta';
      steps.push(
        { text: `$${AXES[idx]}$: $\\mathbf{n}_${useAlpha ? 2 : 1}$ has $0$ here, so this one gives $${name}$ alone.` },
        { tex: solvedForTex(coef, name, n3[idx], `${name} = ${useAlpha ? alpha : beta}`) },
      );
    }
  } else {
    const [p, q] = pairFor(params) ?? [0, 1];
    const e1: Equation2 = [n1[p], n2[p], n3[p]];
    const e2: Equation2 = [n1[q], n2[q], n3[q]];
    steps.push(
      { text: `From the $${AXES[p]}$ and $${AXES[q]}$ components:` },
      { tex: eq2Tex(e1, ['\\alpha', '\\beta']) },
      { tex: eq2Tex(e2, ['\\alpha', '\\beta']) },
      ...solveTwoSteps(e1, e2, ['\\alpha', '\\beta'], [alpha, beta]),
    );
  }
  const used = direct.length >= 2 ? direct.slice(0, 2) : (pairFor(params) ?? [0, 1]);
  const r = [0, 1, 2].find((idx) => !used.includes(idx)) ?? 2;
  steps.push(
    { text: `Check with the $${AXES[r]}$ component:` },
    { tex: `${alpha}${bracketed(n1[r])} ${beta < 0 ? '-' : '+'} ${Math.abs(beta)}${bracketed(n2[r])} = ${n3[r]}` },
  );
  return steps;
}

const bracketed = (x: number) => `(${x})`;

function sheafNormals(params: SheafParams): Block {
  const n3 = sheafNormal(params);
  return {
    kind: 'display',
    tex: `\\mathbf{n}_1 = ${colTex(params.n1)} \\qquad \\mathbf{n}_2 = ${colTex(params.n2)} \\qquad \\mathbf{n}_3 = ${colTex(n3)}`,
  };
}

/** The multiples writing the third normal in terms of the other two, as two tiles. */
const vplxCombo: Generator<SheafParams> = {
  id: 'vplx-combo',
  sample: (rng, difficulty) => sampleSheaf(rng, difficulty),
  render: (params): Slide => {
    const { alpha, beta } = params;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'The determinant of these normals is zero and no two are parallel, so $\\mathbf{n}_3 = \\alpha\\mathbf{n}_1 + \\beta\\mathbf{n}_2$. Find $\\alpha$ and $\\beta$.',
        },
        sheafNormals(params),
      ],
      template: '\\alpha = {0} \\qquad \\beta = {1}',
      bank: bankOf([`${alpha}`, `${beta}`], [`${-alpha}`, `${-beta}`, `${alpha + beta}`]),
      answer: [`${alpha}`, `${beta}`],
    };
  },
  solution: comboSolution,
};

function sheafPlanes(params: SheafParams, third: number | string): Block[] {
  return [namedPlane(1, params.n1, params.d1), namedPlane(2, params.n2, params.d2), namedPlane(3, sheafNormal(params), third)];
}

/** The constant that turns three planes into a sheaf. */
const vplxSheafD: Generator<SheafParams> = {
  id: 'vplx-sheaf-d',
  choices: (params) => {
    const { alpha, beta, d1, d2 } = params;
    const d = sheafD(params);
    // The multiples swapped, a sign slipped, and the sign lost.
    return steered(signedChoices(d, [beta * d1 + alpha * d2, alpha * d1 - beta * d2, -d]), saltOf(params));
  },
  sample: (rng, difficulty) => sampleSheaf(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'The three planes share a common line: they form a sheaf. Find $d$.' },
      ...sheafPlanes(params, 'd'),
    ],
    lead: 'd =',
    keypad: [],
    answer: `${sheafD(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { alpha, beta, d1, d2 } = params;
    return [
      ...comboSolution(params),
      { text: 'For a sheaf the constants follow the same rule, $d = \\alpha d_1 + \\beta d_2$:' },
      { tex: `d = ${alpha}(${d1}) ${beta < 0 ? '-' : '+'} ${Math.abs(beta)}(${d2}) = ${sheafD(params)}` },
    ];
  },
};

interface ConfigParams {
  config: Config;
  normals: Vec[];
  ds: Vec;
  /** For a sheaf or a prism, the multiples writing n3. */
  alpha: number;
  beta: number;
}

const CONFIG_OUTCOME: Record<Config, string> = {
  point: 'They meet at a single point.',
  'three-parallel': 'Three parallel planes: no point is on all three.',
  'two-parallel': 'Two parallel planes, each cut by the third in a line: no point is on all three.',
  sheaf: 'A sheaf: all three planes share one line.',
  prism: 'A triangular prism: the planes meet in pairs, in three parallel lines.',
};

const CONFIG_PATH: Record<Config, string[]> = {
  point: ['No'],
  'three-parallel': ['Yes', 'Yes', 'Yes'],
  'two-parallel': ['Yes', 'Yes', 'No'],
  sheaf: ['Yes', 'No', 'Yes'],
  prism: ['Yes', 'No', 'No'],
};

/** How three planes meet, walked as a decision tree. */
const vplxConfigFlow: Generator<ConfigParams> = {
  id: 'vplx-config-flow',
  sample: (rng, difficulty) => {
    const config = rng.pick<Config>(['point', 'three-parallel', 'two-parallel', 'sheaf', 'prism', 'sheaf', 'prism']);
    if (config === 'point') {
      const { n1, n2, n3, ds } = sampleDet(rng, 1);
      return { config, normals: [n1, n2, n3], ds, alpha: 0, beta: 0 };
    }
    if (config === 'sheaf' || config === 'prism') {
      const params = sampleSheaf(rng, difficulty, config === 'prism');
      return {
        config,
        normals: [params.n1, params.n2, sheafNormal(params)],
        ds: [params.d1, params.d2, sheafD(params) + params.off],
        alpha: params.alpha,
        beta: params.beta,
      };
    }
    const n = baseNormal(rng, 2);
    const e = rng.int(-3, 3);
    if (config === 'three-parallel') {
      const [p, q, r] = rng.sample([1, 2, -1, 3, -2], 3);
      // Distinct constants once each is divided back to n: three different planes.
      const [f, g, h] = rng.sample([-3, -2, -1, 0, 1, 2, 3], 3);
      return { config, normals: [scaled(p, n), scaled(q, n), scaled(r, n)], ds: [p * (e + f), q * (e + g), r * (e + h)], alpha: 0, beta: 0 };
    }
    for (let tries = 0; tries < 200; tries += 1) {
      const m = vec3(rng, -3, 3);
      if (nonZeroCount(m) < 2 || isParallel(m, n)) continue;
      const q = rng.pick([2, -1, 3, -2]);
      const which = rng.int(0, 2);
      const normals = [n, scaled(q, n)];
      const ds = [e, q * e + nonZeroInt(rng, 3)];
      normals.splice(which, 0, m);
      ds.splice(which, 0, rng.int(-5, 5));
      return { config, normals, ds, alpha: 0, beta: 0 };
    }
    return { config: 'two-parallel', normals: [n, [1, 1, 1], scaled(2, n)], ds: [e, 1, 2 * e + 1], alpha: 0, beta: 0 };
  },
  render: ({ config, normals, ds }): Slide => ({
    kind: 'flow',
    prompt: [
      { kind: 'prose', text: 'How do these three planes meet? Work down the questions; each answer chooses what gets asked next.' },
      ...normals.map((n, i) => namedPlane(i + 1, n, ds[i])),
    ],
    subject: '\\mathbf{n}_1 \\cdot (\\mathbf{n}_2 \\times \\mathbf{n}_3)',
    steps: [
      {
        id: 'det',
        ask: 'Is the determinant of the normals, $\\mathbf{n}_1 \\cdot (\\mathbf{n}_2 \\times \\mathbf{n}_3)$, zero?',
        branches: [
          { label: 'Yes', to: 'parallel' },
          { label: 'No', outcome: CONFIG_OUTCOME.point },
        ],
      },
      {
        id: 'parallel',
        ask: 'Is any normal a multiple of another?',
        branches: [
          { label: 'Yes', to: 'all' },
          { label: 'No', to: 'consistent' },
        ],
      },
      {
        id: 'all',
        ask: 'Are all three normals multiples of one another?',
        branches: [
          { label: 'Yes', outcome: CONFIG_OUTCOME['three-parallel'] },
          { label: 'No', outcome: CONFIG_OUTCOME['two-parallel'] },
        ],
      },
      {
        id: 'consistent',
        ask: 'Writing $\\mathbf{n}_3 = \\alpha\\mathbf{n}_1 + \\beta\\mathbf{n}_2$, is $d_3 = \\alpha d_1 + \\beta d_2$?',
        branches: [
          { label: 'Yes', outcome: CONFIG_OUTCOME.sheaf },
          { label: 'No', outcome: CONFIG_OUTCOME.prism },
        ],
      },
    ],
    answer: CONFIG_PATH[config],
  }),
  solution: ({ config, normals, ds, alpha, beta }) => {
    const [n1, n2, n3] = normals;
    const det = detOf({ n1, n2, n3 });
    const c = crossOf(n2, n3);
    const steps: { text?: string; tex?: string }[] = [
      { text: `First the determinant. $\\mathbf{n}_2 \\times \\mathbf{n}_3 = ${point3Tex(c)}$, so` },
      { tex: `\\mathbf{n}_1 \\cdot (\\mathbf{n}_2 \\times \\mathbf{n}_3) = ${det}` },
    ];
    if (config === 'point') {
      steps.push({ text: 'Not zero, so the three planes meet at exactly one point.' });
      return steps;
    }
    steps.push({ text: 'Zero, so there is no single meeting point.' });
    if (config === 'three-parallel' || config === 'two-parallel') {
      steps.push({
        text:
          config === 'three-parallel'
            ? 'All three normals are multiples of one normal, and no equation is a multiple of another, constant included, so these are three different parallel planes.'
            : 'Two normals are multiples of each other, and those two equations are not multiples, constant included: two parallel planes. The third normal is not a multiple, so that plane cuts both.',
      });
      return steps;
    }
    const need = alpha * ds[0] + beta * ds[1];
    steps.push(
      { text: 'No two normals are multiples, so write the third from the first two:' },
      { tex: `\\mathbf{n}_3 = ${alpha === 1 ? '' : alpha === -1 ? '-' : alpha}\\mathbf{n}_1 ${beta < 0 ? '-' : '+'} ${Math.abs(beta) === 1 ? '' : Math.abs(beta)}\\mathbf{n}_2` },
      { text: 'Then the same multiples of the constants:' },
      { tex: `\\alpha d_1 + \\beta d_2 = ${alpha}(${ds[0]}) ${beta < 0 ? '-' : '+'} ${Math.abs(beta)}(${ds[1]}) = ${need}` },
      {
        text:
          config === 'sheaf'
            ? `That is $d_3 = ${ds[2]}$: the equations agree, and the planes share a line, a sheaf.`
            : `But $d_3 = ${ds[2]}$: the equations cannot all hold, so the planes meet in pairs only, a triangular prism.`,
      },
    );
    return steps;
  },
};

export const vectorPlanesGenerators = [
  vplxPlanesFlow,
  vplxPlanesUnknown,
  vplxPlanesCos,
  vplxMeetDirection,
  vplxMeetSolveTree,
  vplxMeetPoint,
  vplxMeetLine,
  vplxMeetAngleTree,
  vplxMeetAnglePair,
  vplxLinePlaneSin,
  vplxLineInPlane,
  vplxDet,
  vplxTripleTree,
  vplxThreePoint,
  vplxThreeCheck,
  vplxSingularK,
  vplxCombo,
  vplxSheafD,
  vplxConfigFlow,
];
