/**
 * Vectors, level 17 (`vm-l17`): distances from lines and planes.
 *
 * Every question is built outward from the answer, as the line and plane
 * generators in `vectors.ts` are. A foot of the perpendicular is chosen first,
 * at a whole value of `t`, and the point is put a whole perpendicular step away
 * from it, so `t`, the foot and the perpendicular vector are all whole. The
 * distance is then the length of that step, a surd at worst.
 *
 * Where a formula divides by a length (`|n|`, `|d|`, `|d_1 x d_2|`), the
 * vector is one of the Pythagorean quadruples, `(1, 2, 2)` of length 3 and
 * `(2, 3, 6)` of length 7 in any order and signs, or `(0, 3, 4)` of length 5,
 * or a pair of directions whose cross product happens to have a whole length.
 * So every answer is a whole number, a simple fraction or a surd, and is typed
 * exactly.
 *
 * The notation follows the rest of the course: a line is `r = a + t d` as one
 * display with no name in front (two three-component columns leave no room),
 * a plane is `\Pi: 2x - y + 2z = 5` or its scalar-product form, and a point
 * is `P(4, 1, 4)`.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide } from '../types';
import { options } from '../choiceVariant';
import { hashSeed } from '../../engine/rng';
import { gcd } from './format';
import { bankOf, signedChoices, solvedForTex } from './vectorFormat';

type Vec = number[];
type Draw = Parameters<Generator['sample']>[0];

const AXES = ['x', 'y', 'z'];

/* ---------- vector helpers, copied from vectors.ts (not exported there) ---------- */

function colTex(v: Vec): string {
  return `\\begin{pmatrix} ${v.join(' \\\\ ')} \\end{pmatrix}`;
}

function columnOf(entries: string[]): string {
  return `\\begin{pmatrix} ${entries.join(' \\\\ ')} \\end{pmatrix}`;
}

const plus = (u: Vec, v: Vec): Vec => u.map((x, i) => x + v[i]);
const minus = (u: Vec, v: Vec): Vec => u.map((x, i) => x - v[i]);
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

function wholeRoot(n: number): number | undefined {
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : undefined;
}

/** `r = a + t d`, as one whole TeX string. */
function lineTex(a: Vec, b: Vec, param = 't'): string {
  return `\\mathbf{r} = ${colTex(a)} + ${param}${colTex(b)}`;
}

/** `c + k t` as written by hand: `3 - 2t`, `t`, `-4 + t`. */
function affTex(c: number, k: number, sym: string): string {
  if (k === 0) return `${c}`;
  const size = Math.abs(k) === 1 ? '' : `${Math.abs(k)}`;
  if (c === 0) return `${k < 0 ? '-' : ''}${size}${sym}`;
  return `${c} ${k < 0 ? '-' : '+'} ${size}${sym}`;
}

/** A number following an operator, bracketed when it is negative. */
function paren(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

function point3Tex(v: Vec): string {
  return `\\left(${v.join(', ')}\\right)`;
}

/** `a + 2b`, `a - b`: a multiple of a vector added on, signed as written. */
function addMultipleTex(first: string, k: number, second: string): string {
  const size = Math.abs(k) === 1 ? '' : `${Math.abs(k)}`;
  return `${first} ${k < 0 ? '-' : '+'} ${size}${second}`;
}

/** `2x - y + 3z`, dropping any term with a zero coefficient. */
function linearTex(n: Vec): string {
  let out = '';
  n.forEach((c, i) => {
    if (c === 0) return;
    const size = Math.abs(c) === 1 ? '' : `${Math.abs(c)}`;
    out += out === '' ? `${c < 0 ? '-' : ''}${size}${AXES[i]}` : ` ${c < 0 ? '-' : '+'} ${size}${AXES[i]}`;
  });
  return out;
}

type PlaneForm = 'cartesian' | 'vector';

function planeTex(n: Vec, d: number, form: PlaneForm): string {
  return form === 'cartesian' ? `${linearTex(n)} = ${d}` : `\\mathbf{r} \\cdot ${colTex(n)} = ${d}`;
}

/** The plane as a display. Braced, so a leading minus after the colon reads as a sign. */
function planeDisplay(n: Vec, d: number, form: PlaneForm, name = '\\Pi'): Block {
  return { kind: 'display', tex: `${name}\\colon \\; {${planeTex(n, d, form)}}` };
}

/** A stable number from the question's own values, for placing its answer. */
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

/** Options ordered so the rotation lands the answer at `salt % length`. See vectors.ts. */
function steered(opts: ChoiceOption[], salt: number): ChoiceOption[] {
  const target = salt % opts.length;
  for (const order of permutations(opts)) {
    const at = (order.findIndex((o) => o.correct) - rotationOf(order) + order.length) % order.length;
    if (at === target) return order;
  }
  return opts;
}

/** A tree bank keeping its answers with multiplicity and at least two spares. */
function treeBank(answer: string[], candidates: string[]): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  for (const candidate of candidates) {
    if (extras.length >= 4) break;
    if (needed.has(candidate) || extras.includes(candidate)) continue;
    extras.push(candidate);
  }
  return [...answer, ...extras].sort();
}

/** The three component calculations of `u x v`, two lines each, for worked solutions. */
function crossSteps(u: Vec, v: Vec): { tex: string }[] {
  const n = crossOf(u, v);
  return [0, 1, 2].flatMap((i) => {
    const j = (i + 1) % 3;
    const k = (i + 2) % 3;
    return [
      { tex: `${AXES[i]}\\colon \\; {${u[j]}(${v[k]}) - ${paren(u[k])}(${v[j]})}` },
      { tex: `= ${u[j] * v[k]} - ${paren(u[k] * v[j])} = ${n[i]}` },
    ];
  });
}

/**
 * `1(t - 3) + 2(2t - 1) - (2t - 2) = rhs`: a fixed vector dotted with a column
 * in `t`. Three bracketed terms and the right-hand side run off a phone on one
 * line, so the third term starts a second line.
 */
function dotRowLines(c: Vec, entries: string[], rhs: number): { tex: string }[] {
  const terms: string[] = [];
  c.forEach((k, i) => {
    if (k === 0) return;
    const size = Math.abs(k) === 1 ? '' : `${Math.abs(k)}`;
    const sign = k < 0 ? '-' : terms.length === 0 ? '' : '+';
    terms.push(terms.length === 0 ? `${sign}${size}(${entries[i]})` : `${sign} ${size}(${entries[i]})`);
  });
  if (terms.length < 3) return [{ tex: `${terms.join(' ')} = ${rhs}` }];
  return [{ tex: terms.slice(0, 2).join(' ') }, { tex: `${terms.slice(2).join(' ')} = ${rhs}` }];
}

/** `n . p` as the products, then their sum: two lines, so neither runs off a phone. */
function dotLines(u: Vec, v: Vec, name: string): { tex: string }[] {
  const terms = u
    .map((x, i) => `${paren(x)}(${v[i]})`)
    .join(' + ');
  // The name on a line of its own: with three bracketed products beside it the
  // line is wider than a phone.
  return [{ tex: name }, { tex: `= ${terms}` }, { tex: `= ${dotOf(u, v)}` }];
}

/* ---------- exact lengths ---------- */

/** `p \sqrt{r} / q`, with the square factors of `r` taken out and `p / q` in lowest terms. */
interface Exact {
  p: number;
  q: number;
  r: number;
}

function exact(p: number, q: number, r = 1): Exact {
  let outside = Math.abs(p);
  let inside = r;
  for (let f = 2; f * f <= inside; f += 1) {
    while (inside % (f * f) === 0) {
      inside /= f * f;
      outside *= f;
    }
  }
  const g = gcd(outside, Math.abs(q)) || 1;
  return { p: outside / g, q: Math.abs(q) / g, r: inside };
}

const exactValue = ({ p, q, r }: Exact) => (p * Math.sqrt(r)) / q;

function exactTex({ p, q, r }: Exact): string {
  const top = r === 1 ? `${p}` : `${p === 1 ? '' : p}\\sqrt{${r}}`;
  return q === 1 ? top : `\\frac{${top}}{${q}}`;
}

function exactAnswer({ p, q, r }: Exact): string {
  const top = r === 1 ? `${p}` : `${p}*sqrt(${r})`;
  return q === 1 ? top : `(${top})/${q}`;
}

/** `\sqrt{n}` as a surd, simplified. */
const rootOf = (n: number) => exact(1, 1, n);

/**
 * Four options by value: the right one and the first three slips worth a
 * different amount, padded with near neighbours. Placed by the question's salt.
 */
function exactChoices(correct: Exact, slips: Exact[], salt: number): ChoiceOption[] {
  const values = [exactValue(correct)];
  const picked: Exact[] = [];
  const offer = (e: Exact) => {
    const v = exactValue(e);
    if (picked.length >= 3 || !(v > 0) || !Number.isFinite(v)) return;
    if (values.some((x) => Math.abs(x - v) < 1e-9)) return;
    values.push(v);
    picked.push(e);
  };
  slips.forEach(offer);
  for (let step = 1; picked.length < 3 && step < 20; step += 1) {
    offer(exact(correct.p + step * correct.q, correct.q, correct.r));
    offer(exact(correct.p * correct.q + step, correct.q * correct.q, correct.r));
  }
  const opt = (e: Exact) => ({ tex: exactTex(e), answer: exactAnswer(e) });
  return steered(options(opt(correct), ...picked.map(opt)), salt);
}

/** Distances are fractions or surds. */
const LENGTH_KEYS: KeypadKey[] = [{ insert: '/' }, { insert: 'sqrt(' }];
const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

/** The coordinate row a point or a vector is placed into. */
const ROW_TEMPLATE = '( {0} , \\; {1} , \\; {2} )';

/* ---------- direction pools ---------- */

/** Every ordering and sign pattern of `base`, without repeats. */
function signedPerms(base: Vec): Vec[] {
  const seen = new Set<string>();
  const out: Vec[] = [];
  for (const order of permutations(base)) {
    for (let mask = 0; mask < 8; mask += 1) {
      const v = order.map((x, i) => ((mask >> i) & 1 ? -x : x));
      const key = v.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

/** Length 3. */
const DIRS_3 = signedPerms([1, 2, 2]);
/** Length 7. */
const DIRS_7 = signedPerms([2, 3, 6]);
/** Length 5, with a zero component. */
const DIRS_5 = signedPerms([0, 3, 4]);

const lengthOf = (v: Vec) => wholeRoot(dotOf(v, v)) ?? Math.sqrt(dotOf(v, v));

/* ================================================================== */
/* Lesson 1 and 2: the foot of the perpendicular to a line           */
/* ================================================================== */

interface FootParams {
  /** The line's point. */
  a: Vec;
  /** The line's direction. */
  d: Vec;
  /** The value of `t` at the foot. */
  t: number;
  /** From the foot out to P, perpendicular to `d`. */
  w: Vec;
}

/**
 * A line and a point off it, built from the foot. `whole` draws the direction
 * from the quadruples, so `|d|` is whole for the cross-product formula.
 */
function sampleFoot(rng: Draw, difficulty: number, whole: boolean): FootParams {
  const ts = difficulty > 1 ? [-3, -2, -1, 1, 2, 3] : [-2, -1, 1, 2];
  for (let tries = 0; tries < 400; tries += 1) {
    const d = whole ? rng.pick(difficulty > 1 ? [...DIRS_3, ...DIRS_7] : DIRS_3) : vec3(rng, -3, 3);
    if (nonZeroCount(d) < (difficulty > 1 ? 2 : 3)) continue;
    let w: Vec | undefined;
    for (let inner = 0; inner < 200 && !w; inner += 1) {
      const cand = vec3(rng, -3, 3);
      if (nonZeroCount(cand) >= 2 && dotOf(cand, d) === 0) w = cand;
    }
    if (!w) continue;
    const t = rng.pick(ts);
    const a = vec3(rng, -4, 4);
    const F = plus(a, scaled(t, d));
    const P = plus(F, w);
    if ([...F, ...P].some((x) => Math.abs(x) > 12)) continue;
    return { a, d, t, w };
  }
  return { a: [1, 0, 2], d: [1, 2, 2], t: 1, w: [2, -1, 0] };
}

function footValues({ a, d, t, w }: FootParams) {
  const F = plus(a, scaled(t, d));
  const P = plus(F, w);
  const ap = minus(a, P);
  return { F, P, ad: dotOf(ap, d), dd: dotOf(d, d), ap };
}

function footPrompt(params: FootParams, text: string): Block[] {
  const { a, d } = params;
  const { P } = footValues(params);
  return [
    { kind: 'prose', text },
    { kind: 'display', tex: lineTex(a, d) },
    { kind: 'display', tex: `P${point3Tex(P)}` },
  ];
}

function footSolution(params: FootParams) {
  const { a, d, t } = params;
  const { F, ad, dd, ap } = footValues(params);
  const entries = ap.map((x, i) => affTex(x, d[i], 't'));
  return [
    {
      text: 'A general point $R$ of the line is $\\mathbf{a} + t\\mathbf{d}$. The vector from $P$ to it is that point minus $\\mathbf{p}$:',
    },
    { tex: `\\overrightarrow{PR} = ${columnOf(entries)}` },
    { text: 'At the foot, $\\overrightarrow{PR}$ is perpendicular to the line, so its scalar product with $\\mathbf{d}$ is zero:' },
    ...dotRowLines(d, entries, 0),
    { tex: `${affTex(ad, dd, 't')} = 0` },
    { tex: solvedForTex(dd, 't', -ad, `t = ${t}`) },
    { text: `Put $t = ${t}$ back into the line for the foot:` },
    { tex: `${addMultipleTex(colTex(a), t, colTex(d))} = ${colTex(F)}` },
    { text: `So the foot of the perpendicular is $${point3Tex(F)}$.` },
  ];
}

/** The value of `t` at the foot of the perpendicular. */
const footT: Generator<FootParams> = {
  id: 'vdist-foot-t',
  choices: (params) => {
    const { t } = params;
    const { ad, dd } = footValues(params);
    // The sign of the dot product kept, the division left out, and d . d itself.
    return steered(signedChoices(t, [-t, ad, dd, t + 1]), saltOf(params));
  },
  sample: (rng, difficulty) => sampleFoot(rng, difficulty, false),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: footPrompt(params, 'Find the value of $t$ at the foot of the perpendicular from $P$ to the line.'),
    lead: 't =',
    keypad: [],
    answer: `${params.t}`,
    domain: 'real',
    mode: 'exact',
  }),
  // Up to t, without the foot the question did not ask for.
  solution: (params) => footSolution(params).slice(0, -3),
};

/** The foot itself, placed as coordinate tiles. */
const footPoint: Generator<FootParams> = {
  id: 'vdist-foot-point',
  sample: (rng, difficulty) => sampleFoot(rng, difficulty, false),
  render: (params): Slide => {
    const { a, d, t } = params;
    const { F } = footValues(params);
    const behind = plus(a, scaled(-t, d));
    return {
      kind: 'tiles',
      prompt: footPrompt(params, 'Find the foot of the perpendicular from $P$ to the line.'),
      template: ROW_TEMPLATE,
      // The point reached with the sign of t slipped, and t itself.
      bank: bankOf(F.map(String), [`${behind[0]}`, `${behind[1]}`, `${behind[2]}`, `${t}`]),
      answer: F.map(String),
    };
  },
  solution: footSolution,
};

/** The same foot as working: the two scalar products, `t`, then the point. */
const footTree: Generator<FootParams> = {
  id: 'vdist-foot-tree',
  sample: (rng, difficulty) => sampleFoot(rng, difficulty, false),
  render: (params): Slide => {
    const { a, d, t } = params;
    const { F, ad, dd } = footValues(params);
    const answer = [`${ad}`, `${dd}`, `${t}`, point3Tex(F)];
    return {
      kind: 'tree',
      prompt: footPrompt(
        params,
        'Find the foot of the perpendicular from $P$: the two scalar products, then $t$, then the foot.',
      ),
      expression: '(\\mathbf{a} - \\mathbf{p}) \\cdot \\mathbf{d} + t \\, \\mathbf{d} \\cdot \\mathbf{d} = 0',
      nodes: [
        { id: 'ad', from: [] },
        { id: 'dd', from: [] },
        { id: 't', from: ['ad', 'dd'] },
        { id: 'foot', from: ['t'] },
      ],
      bank: treeBank(answer, [
        `${-ad}`,
        `${-t}`,
        point3Tex(plus(a, scaled(-t, d))),
        `${dd + 1}`,
        `${t + 1}`,
        point3Tex(plus(a, scaled(t + 1, d))),
      ]),
      answer,
    };
  },
  solution: footSolution,
};

/** The perpendicular vector from P to the foot, as tiles. */
const footVector: Generator<FootParams> = {
  id: 'vdist-foot-vector',
  sample: (rng, difficulty) => sampleFoot(rng, difficulty, false),
  render: (params): Slide => {
    const { w } = params;
    const { F } = footValues(params);
    const pf = scaled(-1, w);
    return {
      kind: 'tiles',
      prompt: [
        ...footPrompt(params, `The foot of the perpendicular from $P$ to the line is $F${point3Tex(F)}$. Find $\\overrightarrow{PF}$.`),
      ],
      template: ROW_TEMPLATE,
      // P minus F, the wrong way round.
      bank: bankOf(pf.map(String), [...w.map(String), `${F[0]}`]),
      answer: pf.map(String),
    };
  },
  solution: (params) => {
    const { w, d } = params;
    const { F, P } = footValues(params);
    const pf = scaled(-1, w);
    return [
      { text: 'The journey from $P$ to $F$ is destination minus start:' },
      { tex: `\\overrightarrow{PF} = ${colTex(F)} - ${colTex(P)}` },
      { tex: `= ${colTex(pf)}` },
      { text: 'A check that $F$ really is the foot: $\\overrightarrow{PF}$ is perpendicular to the direction.' },
      ...dotLines(pf, d, '\\overrightarrow{PF} \\cdot \\mathbf{d}'),
    ];
  },
};

/** The distance from P to the line: the length of PF. */
function pointLineSolution(params: FootParams, viaFoot = true) {
  const { w, d } = params;
  const { P } = footValues(params);
  const pf = scaled(-1, w);
  const n = dotOf(w, w);
  const via = viaFoot ? footSolution(params) : [];
  const ap = minus(P, params.a);
  const cross = crossOf(ap, d);
  const len = lengthOf(d);
  return [
    ...via,
    { text: 'The distance is the length of $\\overrightarrow{PF}$:' },
    { tex: `\\overrightarrow{PF} = ${colTex(pf)}` },
    { tex: `\\left|\\overrightarrow{PF}\\right| = \\sqrt{${pf.map((x) => `${paren(x)}^2`).join(' + ')}}` },
    { tex: `= \\sqrt{${n}}${exactTex(rootOf(n)) === `\\sqrt{${n}}` ? '' : ` = ${exactTex(rootOf(n))}`}` },
    ...(Number.isInteger(len)
      ? [
          {
            text: `Or by the formula: $\\overrightarrow{AP} = ${point3Tex(ap)}$ and $\\overrightarrow{AP} \\times \\mathbf{d} = ${point3Tex(cross)}$, of length $${exactTex(rootOf(dotOf(cross, cross)))}$. Divided by $|\\mathbf{d}| = ${len}$ that is $${exactTex(rootOf(n))}$ again.`,
          },
        ]
      : []),
  ];
}

/** The slips a point-to-line distance invites. */
function pointLineSlips(params: FootParams): Exact[] {
  const { w, d, a } = params;
  const { P } = footValues(params);
  const n = dotOf(w, w);
  const ap = minus(P, a);
  const cross = crossOf(ap, d);
  return [
    // No square root, the distance to the line's point A, and |AP x d| undivided.
    exact(n, 1),
    rootOf(dotOf(ap, ap)),
    rootOf(dotOf(cross, cross)),
    exact(1, 1, n + 1),
  ];
}

/** The shortest distance from a point to a line, exactly. */
const pointLine: Generator<FootParams> = {
  id: 'vdist-point-line',
  choices: (params) => exactChoices(rootOf(dotOf(params.w, params.w)), pointLineSlips(params), saltOf(params)),
  sample: (rng, difficulty) => sampleFoot(rng, difficulty, true),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: footPrompt(params, 'Find the shortest distance from $P$ to the line, exactly.'),
    lead: '\\text{distance} =',
    keypad: LENGTH_KEYS,
    answer: exactAnswer(rootOf(dotOf(params.w, params.w))),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => pointLineSolution(params),
};

/** `AP x d`, placed as tiles, for the formula route. */
const apCross: Generator<FootParams> = {
  id: 'vdist-ap-cross',
  sample: (rng, difficulty) => sampleFoot(rng, difficulty, true),
  render: (params): Slide => {
    const { a, d } = params;
    const { P } = footValues(params);
    const ap = minus(P, a);
    const n = crossOf(ap, d);
    return {
      kind: 'tiles',
      prompt: footPrompt(
        params,
        '$A$ is the point $\\mathbf{a}$ on the line and $\\mathbf{d}$ its direction. Work out $\\overrightarrow{AP} \\times \\mathbf{d}$.',
      ),
      template: ROW_TEMPLATE,
      // The product the wrong way round, and the middle sign slipped.
      bank: bankOf(n.map(String), [`${-n[0]}`, `${-n[1]}`, `${-n[2]}`, `${ap[0] * d[0]}`]),
      answer: n.map(String),
    };
  },
  solution: (params) => {
    const { a, d } = params;
    const { P } = footValues(params);
    const ap = minus(P, a);
    return [
      { text: 'First the journey from $A$ to $P$, destination minus start:' },
      { tex: `\\overrightarrow{AP} = ${colTex(P)} - ${colTex(a)}` },
      { tex: `= ${colTex(ap)}` },
      { text: 'Then the cross product with $\\mathbf{d}$, one component at a time:' },
      ...crossSteps(ap, d),
      { tex: `\\overrightarrow{AP} \\times \\mathbf{d} = ${colTex(crossOf(ap, d))}` },
    ];
  },
};

/** The formula route as a tree: AP, the cross product, its length, |d|, the distance. */
const lineCrossTree: Generator<FootParams> = {
  id: 'vdist-line-cross-tree',
  sample: (rng, difficulty) => sampleFoot(rng, difficulty, true),
  render: (params): Slide => {
    const { a, d, w } = params;
    const { P } = footValues(params);
    const ap = minus(P, a);
    const n = crossOf(ap, d);
    const top = rootOf(dotOf(n, n));
    const len = lengthOf(d);
    const dist = rootOf(dotOf(w, w));
    const answer = [colTex(ap), colTex(n), exactTex(top), `${len}`, exactTex(dist)];
    return {
      kind: 'tree',
      prompt: footPrompt(
        params,
        'Find the distance from $P$ to the line by the formula: $\\overrightarrow{AP}$, the cross product, its length, $|\\mathbf{d}|$, then the distance.',
      ),
      expression: '\\frac{\\left|\\overrightarrow{AP} \\times \\mathbf{d}\\right|}{|\\mathbf{d}|}',
      nodes: [
        { id: 'ap', from: [] },
        { id: 'cross', from: ['ap'] },
        { id: 'top', from: ['cross'] },
        { id: 'len', from: [] },
        { id: 'dist', from: ['top', 'len'] },
      ],
      bank: treeBank(answer, [
        colTex(minus(a, P)),
        colTex(scaled(-1, n)),
        `${dotOf(n, n)}`,
        `${len * len}`,
        exactTex(exact(dotOf(w, w), 1)),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, d, w } = params;
    const { P } = footValues(params);
    const ap = minus(P, a);
    const n = crossOf(ap, d);
    const S = dotOf(n, n);
    const len = lengthOf(d);
    return [
      { tex: `\\overrightarrow{AP} = ${colTex(P)} - ${colTex(a)}` },
      { tex: `= ${colTex(ap)}` },
      ...crossSteps(ap, d),
      { tex: `\\left|\\overrightarrow{AP} \\times \\mathbf{d}\\right| = \\sqrt{${S}} = ${exactTex(rootOf(S))}` },
      { tex: `|\\mathbf{d}| = \\sqrt{${dotOf(d, d)}} = ${len}` },
      { tex: `\\text{distance} = \\frac{${exactTex(rootOf(S))}}{${len}} = ${exactTex(rootOf(dotOf(w, w)))}` },
    ];
  },
};

/* ================================================================== */
/* Lesson 3: a point and a plane                                      */
/* ================================================================== */

interface PointPlaneParams {
  n: Vec;
  p: Vec;
  d: number;
  form: PlaneForm;
}

function samplePointPlane(rng: Draw, difficulty: number): PointPlaneParams {
  const pool = difficulty > 1 ? [...DIRS_3, ...DIRS_7, ...DIRS_5] : DIRS_3;
  for (let tries = 0; tries < 300; tries += 1) {
    const n = rng.pick(pool);
    const p = vec3(rng, -5, 5);
    if (nonZeroCount(p) < 2) continue;
    const len = lengthOf(n);
    const np = dotOf(n, p);
    let d: number;
    if (difficulty > 1) {
      // Now and then the plane through the origin.
      d = rng.chance(0.2) ? 0 : np - rng.int(-20, 20);
    } else {
      d = np - (rng.chance(0.5) ? 1 : -1) * rng.int(1, 4) * len;
    }
    if (np - d === 0 || Math.abs(d) > 40) continue;
    return { n, p, d, form: difficulty > 1 && rng.chance(0.5) ? 'vector' : 'cartesian' };
  }
  return { n: [2, -1, 2], p: [3, 1, -2], d: 10, form: 'cartesian' };
}

const pointPlaneDistance = ({ n, p, d }: PointPlaneParams) => exact(dotOf(n, p) - d, lengthOf(n));

function pointPlanePrompt({ n, p, d, form }: PointPlaneParams, text: string): Block[] {
  return [{ kind: 'prose', text }, planeDisplay(n, d, form), { kind: 'display', tex: `P${point3Tex(p)}` }];
}

function pointPlaneSolution({ n, p, d, form }: PointPlaneParams) {
  const np = dotOf(n, p);
  const len = lengthOf(n);
  return [
    {
      text: `${form === 'cartesian' ? 'Read the normal off the coefficients' : 'The normal is the vector in the equation'}: $\\mathbf{n} = ${point3Tex(n)}$ and $d = ${d}$.`,
    },
    { tex: '\\text{distance} = \\frac{|\\mathbf{n} \\cdot \\mathbf{p} - d|}{|\\mathbf{n}|}' },
    ...dotLines(n, p, '\\mathbf{n} \\cdot \\mathbf{p}'),
    { tex: `\\mathbf{n} \\cdot \\mathbf{p} - d = ${np} - ${paren(d)} = ${np - d}` },
    { tex: `|\\mathbf{n}| = \\sqrt{${dotOf(n, n)}} = ${len}` },
    { tex: `\\text{distance} = \\frac{${Math.abs(np - d)}}{${len}}${exact(np - d, len).q === len ? '' : ` = ${exactTex(exact(np - d, len))}`}` },
    {
      text: 'The modulus keeps the distance positive. The sign of $\\mathbf{n} \\cdot \\mathbf{p} - d$ only says which side of the plane $P$ is on.',
    },
  ];
}

function pointPlaneSlips({ n, p, d }: PointPlaneParams): Exact[] {
  const np = dotOf(n, p);
  const len = lengthOf(n);
  return [
    // No division, the sign of d slipped, d left out, and |n| squared.
    exact(np - d, 1),
    exact(np + d, len),
    exact(np, len),
    exact(np - d, len * len),
  ];
}

/** The distance from a point to a plane. */
const pointPlane: Generator<PointPlaneParams> = {
  id: 'vdist-point-plane',
  choices: (params) => exactChoices(pointPlaneDistance(params), pointPlaneSlips(params), saltOf(params)),
  sample: samplePointPlane,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: pointPlanePrompt(params, 'Find the distance from $P$ to the plane $\\Pi$.'),
    lead: '\\text{distance} =',
    keypad: FRACTION_KEYS,
    answer: exactAnswer(pointPlaneDistance(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: pointPlaneSolution,
};

/** The formula as a tree: n . p, then minus d, |n|, the distance. */
const planeFormulaTree: Generator<PointPlaneParams> = {
  id: 'vdist-plane-formula-tree',
  sample: samplePointPlane,
  render: (params): Slide => {
    const { n, p, d } = params;
    const np = dotOf(n, p);
    const len = lengthOf(n);
    const answer = [`${np}`, `${np - d}`, `${len}`, exactTex(pointPlaneDistance(params))];
    return {
      kind: 'tree',
      prompt: pointPlanePrompt(
        params,
        'Find the distance from $P$ to $\\Pi$: $\\mathbf{n} \\cdot \\mathbf{p}$, then minus $d$, then $|\\mathbf{n}|$, then the distance.',
      ),
      expression: '\\frac{|\\mathbf{n} \\cdot \\mathbf{p} - d|}{|\\mathbf{n}|}',
      nodes: [
        { id: 'np', from: [] },
        { id: 'diff', from: ['np'] },
        { id: 'len', from: [] },
        { id: 'dist', from: ['diff', 'len'] },
      ],
      bank: treeBank(answer, [
        `${np + d}`,
        `${d - np}`,
        `${len * len}`,
        exactTex(exact(np + d, len)),
        exactTex(exact(np - d, len * len)),
        `${np + 1}`,
      ]),
      answer,
    };
  },
  solution: pointPlaneSolution,
};

interface OriginParams {
  n: Vec;
  d: number;
  form: PlaneForm;
}

/** The distance of a plane from the origin. */
const originPlane: Generator<OriginParams> = {
  id: 'vdist-origin-plane',
  choices: (params) => {
    const { n, d } = params;
    const len = lengthOf(n);
    return exactChoices(
      exact(d, len),
      // No division, |n| squared, and upside down.
      [exact(d, 1), exact(d, len * len), exact(len, d)],
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const pool = difficulty > 1 ? [...DIRS_3, ...DIRS_7, ...DIRS_5] : DIRS_3;
    const base = rng.pick(pool);
    // A normal with a common factor at the harder level: |2n| is 2|n|.
    const m = difficulty > 1 && rng.chance(0.3) ? 2 : 1;
    const n = scaled(m, base);
    const len = lengthOf(n);
    const d = difficulty > 1 ? (rng.chance(0.5) ? 1 : -1) * rng.int(1, 30) : (rng.chance(0.5) ? 1 : -1) * rng.int(1, 5) * len;
    return { n, d, form: difficulty > 1 && rng.chance(0.5) ? 'vector' : 'cartesian' };
  },
  render: ({ n, d, form }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Find the distance of the plane $\\Pi$ from the origin.' }, planeDisplay(n, d, form)],
    lead: '\\text{distance} =',
    keypad: FRACTION_KEYS,
    answer: exactAnswer(exact(d, lengthOf(n))),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, d }) => {
    const len = lengthOf(n);
    const e = exact(d, len);
    return [
      { text: 'At the origin $\\mathbf{p} = \\mathbf{0}$, so $\\mathbf{n} \\cdot \\mathbf{p} = 0$ and the formula comes down to:' },
      { tex: '\\text{distance} = \\frac{|d|}{|\\mathbf{n}|}' },
      { tex: `|\\mathbf{n}| = \\sqrt{${n.map((x) => x * x).join(' + ')}} = ${len}` },
      { tex: `\\text{distance} = \\frac{${Math.abs(d)}}{${len}}${e.q === len && e.p === Math.abs(d) ? '' : ` = ${exactTex(e)}`}` },
    ];
  },
};

interface OriginGivenParams {
  n: Vec;
  /** The plane's constant, positive: the answer. */
  d: number;
}

/**
 * The formula backwards: a plane with its constant unknown, at a given distance
 * from the origin, so `d = distance x |n|`.
 */
const originGiven: Generator<OriginGivenParams> = {
  id: 'vdist-origin-given',
  choices: (params) => {
    const { n, d } = params;
    const len = lengthOf(n);
    // Not multiplied back, multiplied by |n| squared, the sign lost, one |n| too many.
    return steered(signedChoices(d, [d / len, d * len, -d, d + len]), saltOf(params));
  },
  sample: (rng, difficulty) => {
    const pool = difficulty > 1 ? [...DIRS_3, ...DIRS_7, ...DIRS_5] : DIRS_3;
    const n = rng.pick(pool);
    const len = lengthOf(n);
    const d = difficulty > 1 ? rng.int(1, 30) : rng.int(1, 6) * len;
    return { n, d };
  },
  render: ({ n, d }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `The plane $\\Pi$ is a distance $${exactTex(exact(d, lengthOf(n)))}$ from the origin, and $d > 0$. Find $d$.`,
      },
      { kind: 'display', tex: `\\Pi\\colon \\; {${linearTex(n)} = d}` },
    ],
    lead: 'd =',
    keypad: [],
    answer: `${d}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, d }) => {
    const len = lengthOf(n);
    const dist = exactTex(exact(d, len));
    return [
      { text: 'The distance of a plane from the origin is $|d|$ over $|\\mathbf{n}|$, with the normal read off the coefficients.' },
      { tex: `|\\mathbf{n}| = \\sqrt{${n.map((x) => x * x).join(' + ')}} = ${len}` },
      { tex: `\\frac{d}{${len}} = ${dist}` },
      { tex: `d = ${dist} \\times ${len} = ${d}` },
    ];
  },
};

/* ================================================================== */
/* Lesson 4: parallel planes, the foot on a plane, the mirror image  */
/* ================================================================== */

interface ParallelPlanesParams {
  n: Vec;
  d1: number;
  d2: number;
  /** The second plane is written with its whole equation times this. */
  k: number;
  form: PlaneForm;
}

const parallelDistance = ({ n, d1, d2 }: ParallelPlanesParams) => exact(d1 - d2, lengthOf(n));

/** The distance between two parallel planes. */
const parallelPlanes: Generator<ParallelPlanesParams> = {
  id: 'vdist-parallel-planes',
  choices: (params) => {
    const { n, d1, d2, k } = params;
    const len = lengthOf(n);
    return exactChoices(
      parallelDistance(params),
      // The second constant not scaled back, the constants added, no division.
      [exact(d1 - k * d2, len), exact(d1 + d2, len), exact(d1 - d2, 1), exact(d1 - d2, len * len)],
      saltOf(params),
    );
  },
  sample: (rng, difficulty) => {
    const pool = difficulty > 1 ? [...DIRS_3, ...DIRS_7, ...DIRS_5] : DIRS_3;
    for (let tries = 0; tries < 200; tries += 1) {
      const n = rng.pick(pool);
      const len = lengthOf(n);
      const d1 = rng.int(-15, 15);
      const gap = difficulty > 1 ? rng.int(1, 25) : rng.int(1, 5) * len;
      const d2 = d1 + (rng.chance(0.5) ? gap : -gap);
      if (d1 === 0 || d2 === 0 || Math.abs(d2) > 30) continue;
      const k = difficulty > 1 ? rng.pick([1, 2, 3]) : 1;
      return { n, d1, d2, k, form: difficulty > 1 && rng.chance(0.4) ? 'vector' : 'cartesian' };
    }
    return { n: [1, 2, 2], d1: 3, d2: 15, k: 1, form: 'cartesian' };
  },
  render: ({ n, d1, d2, k, form }): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'The planes $\\Pi_1$ and $\\Pi_2$ are parallel. Find the distance between them.' },
      planeDisplay(n, d1, form, '\\Pi_1'),
      planeDisplay(scaled(k, n), k * d2, form, '\\Pi_2'),
    ],
    lead: '\\text{distance} =',
    keypad: FRACTION_KEYS,
    answer: exactAnswer(exact(d1 - d2, lengthOf(n))),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, d1, d2, k, form }) => {
    const len = lengthOf(n);
    const e = exact(d1 - d2, len);
    return [
      ...(k === 1
        ? [{ text: 'The two planes have the same normal, so they can be compared directly.' }]
        : [
            { text: `The second equation is $${k}$ times one with the same normal as the first. Divide it through by $${k}$:` },
            { tex: `\\Pi_2\\colon \\; {${planeTex(n, d2, form)}}` },
          ]),
      { tex: '\\text{distance} = \\frac{|d_1 - d_2|}{|\\mathbf{n}|}' },
      { tex: `|\\mathbf{n}| = \\sqrt{${dotOf(n, n)}} = ${len}` },
      { tex: `\\frac{|${d1} - ${paren(d2)}|}{${len}} = \\frac{${Math.abs(d1 - d2)}}{${len}}${e.q === len && e.p === Math.abs(d1 - d2) ? '' : ` = ${exactTex(e)}`}` },
    ];
  },
};

interface MirrorParams {
  n: Vec;
  /** The foot, on the plane. */
  F: Vec;
  /** The step along the normal from P to the foot. */
  lam: number;
  form: PlaneForm;
}

function sampleMirror(rng: Draw, difficulty: number): MirrorParams {
  const lams = difficulty > 1 ? [-3, -2, -1, 1, 2, 3] : [-2, -1, 1, 2];
  for (let tries = 0; tries < 300; tries += 1) {
    const n = vec3(rng, difficulty > 1 ? -3 : -2, difficulty > 1 ? 3 : 2);
    if (nonZeroCount(n) < 2) continue;
    const F = vec3(rng, -4, 4);
    const lam = rng.pick(lams);
    const P = minus(F, scaled(lam, n));
    const Q = plus(F, scaled(lam, n));
    if ([...P, ...Q].some((x) => Math.abs(x) > 12)) continue;
    return { n, F, lam, form: difficulty > 1 && rng.chance(0.5) ? 'vector' : 'cartesian' };
  }
  return { n: [1, 2, 2], F: [1, 2, 2], lam: -2, form: 'cartesian' };
}

function mirrorValues({ n, F, lam }: MirrorParams) {
  const P = minus(F, scaled(lam, n));
  return { P, Q: plus(F, scaled(lam, n)), d: dotOf(n, F), np: dotOf(n, P), nn: dotOf(n, n) };
}

function mirrorPrompt(params: MirrorParams, text: string): Block[] {
  const { n, form } = params;
  const { P, d } = mirrorValues(params);
  return [{ kind: 'prose', text }, planeDisplay(n, d, form), { kind: 'display', tex: `P${point3Tex(P)}` }];
}

function mirrorSolution(params: MirrorParams, image: boolean) {
  const { n, lam, F } = params;
  const { P, Q, d, np, nn } = mirrorValues(params);
  const entries = P.map((x, i) => affTex(x, n[i], '\\lambda'));
  return [
    { text: 'The perpendicular from $P$ runs along the normal:' },
    { tex: `\\mathbf{r} = ${colTex(P)} + \\lambda${colTex(n)}` },
    { text: 'Its general point into the plane\'s equation:' },
    ...dotRowLines(n, entries, d),
    { tex: `${affTex(np, nn, '\\lambda')} = ${d}` },
    { tex: solvedForTex(nn, '\\lambda', d - np, `\\lambda = ${lam}`) },
    { tex: `${addMultipleTex(colTex(P), lam, colTex(n))} = ${colTex(F)}` },
    { text: `So the foot is $${point3Tex(F)}$.` },
    ...(image
      ? [
          { text: `The image is as far again beyond the foot, at $\\lambda = 2 \\times ${paren(lam)} = ${2 * lam}$:` },
          { tex: `${addMultipleTex(colTex(P), 2 * lam, colTex(n))} = ${colTex(Q)}` },
          { text: `So the mirror image is $${point3Tex(Q)}$. Check: the foot is the midpoint of $P$ and its image.` },
        ]
      : []),
  ];
}

/** The foot of the perpendicular from a point to a plane. */
const planeFoot: Generator<MirrorParams> = {
  id: 'vdist-plane-foot',
  sample: sampleMirror,
  render: (params): Slide => {
    const { F } = params;
    const { P, Q } = mirrorValues(params);
    const wrong = minus(P, minus(F, P));
    return {
      kind: 'tiles',
      prompt: mirrorPrompt(params, 'Find the foot of the perpendicular from $P$ to the plane $\\Pi$.'),
      template: ROW_TEMPLATE,
      // The image instead, and a step the wrong way.
      bank: bankOf(F.map(String), [`${Q[0]}`, `${Q[2]}`, `${wrong[1]}`]),
      answer: F.map(String),
    };
  },
  solution: (params) => mirrorSolution(params, false),
};

/** The mirror image of a point in a plane. */
const reflectPoint: Generator<MirrorParams> = {
  id: 'vdist-reflect',
  sample: sampleMirror,
  render: (params): Slide => {
    const { F, n, lam } = params;
    const { Q } = mirrorValues(params);
    const over = plus(Q, scaled(lam, n));
    return {
      kind: 'tiles',
      prompt: mirrorPrompt(params, 'Find the mirror image of $P$ in the plane $\\Pi$.'),
      template: ROW_TEMPLATE,
      // The foot instead, and one step too many.
      bank: bankOf(Q.map(String), [`${F[0]}`, `${F[1]}`, `${over[2]}`]),
      answer: Q.map(String),
    };
  },
  solution: (params) => mirrorSolution(params, true),
};

/** The whole route as a tree: n . p and n . n, lambda, the foot, the image. */
const mirrorTree: Generator<MirrorParams> = {
  id: 'vdist-mirror-tree',
  sample: sampleMirror,
  render: (params): Slide => {
    const { F, n, lam } = params;
    const { P, Q, np, nn } = mirrorValues(params);
    const answer = [`${np}`, `${nn}`, `${lam}`, point3Tex(F), point3Tex(Q)];
    return {
      kind: 'tree',
      prompt: mirrorPrompt(
        params,
        'Put $\\mathbf{r} = \\mathbf{p} + \\lambda\\mathbf{n}$ into $\\Pi$. Find the two scalar products, $\\lambda$, the foot, then the image of $P$.',
      ),
      expression: '\\mathbf{n} \\cdot \\mathbf{p} + \\lambda \\, \\mathbf{n} \\cdot \\mathbf{n} = d',
      nodes: [
        { id: 'np', from: [] },
        { id: 'nn', from: [] },
        { id: 'lam', from: ['np', 'nn'] },
        { id: 'foot', from: ['lam'] },
        { id: 'image', from: ['foot'] },
      ],
      bank: treeBank(answer, [
        `${-lam}`,
        point3Tex(minus(P, scaled(lam, n))),
        point3Tex(plus(Q, scaled(lam, n))),
        `${-np}`,
        `${nn + 1}`,
        `${lam + 1}`,
      ]),
      answer,
    };
  },
  solution: (params) => mirrorSolution(params, true),
};

/* ================================================================== */
/* Lesson 5: skew lines and parallel lines                            */
/* ================================================================== */

interface SkewParams {
  a: Vec;
  d1: Vec;
  c: Vec;
  d2: Vec;
}

function sampleSkew(rng: Draw, difficulty: number): SkewParams {
  const reach = difficulty > 1 ? 3 : 2;
  for (let tries = 0; tries < 5000; tries += 1) {
    const d1 = vec3(rng, -reach, reach);
    const d2 = vec3(rng, -reach, reach);
    if (nonZeroCount(d1) < 2 || nonZeroCount(d2) < 2) continue;
    const n = crossOf(d1, d2);
    if (nonZeroCount(n) < 2) continue;
    const len = wholeRoot(dotOf(n, n));
    if (len === undefined || len > 15) continue;
    const a = vec3(rng, -4, 4);
    const c = vec3(rng, -4, 4);
    const dot = dotOf(minus(c, a), n);
    if (dot === 0) continue;
    if (difficulty === 1 && dot % len !== 0) continue;
    return { a, d1, c, d2 };
  }
  return { a: [1, 0, 2], d1: [1, -2, 0], c: [2, 1, -1], d2: [1, 0, 1] };
}

function skewValues({ a, d1, c, d2 }: SkewParams) {
  const n = crossOf(d1, d2);
  const ca = minus(c, a);
  const len = lengthOf(n);
  const dot = dotOf(ca, n);
  return { n, ca, len, dot, dist: exact(dot, len) };
}

function skewPrompt({ a, d1, c, d2 }: SkewParams, text: string): Block[] {
  return [
    { kind: 'prose', text },
    { kind: 'display', tex: lineTex(a, d1, '\\lambda') },
    { kind: 'display', tex: lineTex(c, d2, '\\mu') },
  ];
}

function skewSolution(params: SkewParams) {
  const { d1, d2 } = params;
  const { n, ca, len, dot, dist } = skewValues(params);
  return [
    { text: 'First the common perpendicular, $\\mathbf{n} = \\mathbf{d}_1 \\times \\mathbf{d}_2$:' },
    ...crossSteps(d1, d2),
    { tex: `\\mathbf{n} = ${colTex(n)} \\qquad |\\mathbf{n}| = \\sqrt{${dotOf(n, n)}} = ${len}` },
    { text: 'Then the journey between the two given points:' },
    { tex: `\\mathbf{c} - \\mathbf{a} = ${colTex(ca)}` },
    ...dotLines(ca, n, '(\\mathbf{c} - \\mathbf{a}) \\cdot \\mathbf{n}'),
    { tex: '\\text{distance} = \\frac{|(\\mathbf{c} - \\mathbf{a}) \\cdot \\mathbf{n}|}{|\\mathbf{n}|}' },
    { tex: `= \\frac{${Math.abs(dot)}}{${len}}${dist.q === len && dist.p === Math.abs(dot) ? '' : ` = ${exactTex(dist)}`}` },
  ];
}

/** The common perpendicular of two skew lines, `d1 x d2`, as tiles. */
const commonNormal: Generator<SkewParams> = {
  id: 'vdist-common-normal',
  sample: sampleSkew,
  render: (params): Slide => {
    const { d1, d2 } = params;
    const n = crossOf(d1, d2);
    return {
      kind: 'tiles',
      prompt: skewPrompt(
        params,
        'Find $\\mathbf{n} = \\mathbf{d}_1 \\times \\mathbf{d}_2$, a vector perpendicular to both lines.',
      ),
      template: ROW_TEMPLATE,
      // The product the wrong way round, and matching components multiplied.
      bank: bankOf(n.map(String), [`${-n[0]}`, `${-n[1]}`, `${-n[2]}`, `${d1[0] * d2[0]}`]),
      answer: n.map(String),
    };
  },
  solution: (params) => {
    const { d1, d2 } = params;
    return [
      { text: 'The directions are the vectors multiplying $\\lambda$ and $\\mu$. Cross them, one component at a time:' },
      ...crossSteps(d1, d2),
      { tex: `\\mathbf{n} = ${colTex(crossOf(d1, d2))}` },
    ];
  },
};

function skewSlips(params: SkewParams): Exact[] {
  const { a, c } = params;
  const { n, len, dot, ca } = skewValues(params);
  return [
    // No division, |n| squared, the points added, the middle sign slipped.
    exact(dot, 1),
    exact(dot, len * len),
    exact(dotOf(plus(c, a), n), len),
    exact(dotOf(ca, [n[0], -n[1], n[2]]), len),
  ];
}

/** The shortest distance between two skew lines. */
const skewDistance: Generator<SkewParams> = {
  id: 'vdist-skew-distance',
  choices: (params) => exactChoices(skewValues(params).dist, skewSlips(params), saltOf(params)),
  sample: sampleSkew,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: skewPrompt(params, 'The two lines are skew. Find the shortest distance between them.'),
    lead: '\\text{distance} =',
    keypad: FRACTION_KEYS,
    answer: exactAnswer(skewValues(params).dist),
    domain: 'real',
    mode: 'exact',
  }),
  solution: skewSolution,
};

/** The same distance as a tree: c - a and n, the scalar product, |n|, the distance. */
const skewTree: Generator<SkewParams> = {
  id: 'vdist-skew-tree',
  sample: sampleSkew,
  render: (params): Slide => {
    const { a, c } = params;
    const { n, ca, len, dot, dist } = skewValues(params);
    const answer = [colTex(ca), colTex(n), `${dot}`, `${len}`, exactTex(dist)];
    return {
      kind: 'tree',
      prompt: skewPrompt(
        params,
        'Find the shortest distance: $\\mathbf{c} - \\mathbf{a}$, $\\mathbf{n} = \\mathbf{d}_1 \\times \\mathbf{d}_2$, their scalar product, $|\\mathbf{n}|$, then the distance.',
      ),
      expression: '\\frac{|(\\mathbf{c} - \\mathbf{a}) \\cdot \\mathbf{n}|}{|\\mathbf{n}|}',
      nodes: [
        { id: 'ca', from: [] },
        { id: 'n', from: [] },
        { id: 'dot', from: ['ca', 'n'] },
        { id: 'len', from: ['n'] },
        { id: 'dist', from: ['dot', 'len'] },
      ],
      bank: treeBank(answer, [
        colTex(minus(a, c)),
        colTex(scaled(-1, n)),
        `${-dot}`,
        `${len * len}`,
        exactTex(exact(dot, len * len)),
        `${dot + 1}`,
      ]),
      answer,
    };
  },
  solution: skewSolution,
};

interface ParallelLinesParams extends FootParams {
  /** The second line's direction is this multiple of the first's. */
  k: number;
}

/** The distance between two parallel lines: a point of one to the other line. */
const parallelLines: Generator<ParallelLinesParams> = {
  id: 'vdist-parallel-lines',
  choices: (params) => exactChoices(rootOf(dotOf(params.w, params.w)), pointLineSlips(params), saltOf(params)),
  sample: (rng, difficulty) => ({
    ...sampleFoot(rng, difficulty, true),
    k: rng.pick(difficulty > 1 ? [-2, -1, 2, 3] : [1, 2]),
  }),
  render: (params): Slide => {
    const { a, d, k } = params;
    const { P } = footValues(params);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'The two lines are parallel. Find the distance between them, exactly.' },
        { kind: 'display', tex: lineTex(a, d, '\\lambda') },
        { kind: 'display', tex: lineTex(P, scaled(k, d), '\\mu') },
      ],
      lead: '\\text{distance} =',
      keypad: LENGTH_KEYS,
      answer: exactAnswer(rootOf(dotOf(params.w, params.w))),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { P } = footValues(params);
    const { a, d, t, w } = params;
    const ad = dotOf(minus(a, P), d);
    const dd = dotOf(d, d);
    const entries = minus(a, P).map((x, i) => affTex(x, d[i], '\\lambda'));
    const n = dotOf(w, w);
    return [
      {
        text: `The directions are multiples of each other, so $\\mathbf{d}_1 \\times \\mathbf{d}_2 = \\mathbf{0}$ and the skew-line formula fails. Instead, take the point $C${point3Tex(P)}$ of the second line and find its distance from the first.`,
      },
      { tex: `\\overrightarrow{CR} = ${columnOf(entries)}` },
      ...dotRowLines(d, entries, 0),
      { tex: `${affTex(ad, dd, '\\lambda')} = 0` },
      { tex: solvedForTex(dd, '\\lambda', -ad, `\\lambda = ${t}`) },
      { tex: `\\overrightarrow{CF} = ${colTex(scaled(-1, w))}` },
      { tex: `\\left|\\overrightarrow{CF}\\right| = \\sqrt{${n}}${exactTex(rootOf(n)) === `\\sqrt{${n}}` ? '' : ` = ${exactTex(rootOf(n))}`}` },
    ];
  },
};

export const vectorDistancesGenerators = [
  footT,
  footPoint,
  footTree,
  footVector,
  pointLine,
  apCross,
  lineCrossTree,
  pointPlane,
  planeFormulaTree,
  originPlane,
  originGiven,
  parallelPlanes,
  planeFoot,
  reflectPoint,
  mirrorTree,
  commonNormal,
  skewDistance,
  skewTree,
  parallelLines,
];
