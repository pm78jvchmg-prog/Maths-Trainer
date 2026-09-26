/**
 * Sequences & Series, level 7: harder arithmetic and geometric problems.
 *
 * Lesson 1 finds a sequence from two terms that are not next to each other:
 * subtract for an arithmetic one, divide for a geometric one, where an even
 * power of r has two roots and the question has to say which. Lesson 2 does
 * the same with sums, each S_n turned into 2a + (n - 1)d = 2S_n / n. Lesson 3
 * puts an unknown k into three consecutive terms: the arithmetic mean
 * 2u_2 = u_1 + u_3 is linear, the geometric u_2^2 = u_1u_3 a quadratic with a
 * root the question rules out. Lesson 4 runs the sum to infinity backwards
 * and uses S_2n = S_n(1 + r^n). Lesson 5 is the least n for which a sum or a
 * term passes a value: logs for a geometric series, flipping when ln r < 0,
 * and a quadratic for an arithmetic one.
 *
 * Every question is built backwards from its answer. Two terms or two sums
 * come from a whole a and d (or a and r), so the working is whole all the
 * way; a half-step d appears only with odd positions, where every term asked
 * is whole. Three terms in k start from the valid root and a nice ratio, and
 * the other root is kept only when it is whole and fails the stated
 * condition. Sums to infinity use S = den^2 m, so the quadratic factorises
 * exactly. Every least-n question refuses a draw whose logarithm or root
 * lands within 0.03 of a whole number, so rounding up is always a real step,
 * and the worked solution checks the two sums or terms either side.
 */
import type { Rng } from '../../engine/rng';
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { sumTex, termTex } from './calculus';
import { fracTex, gcd, gcdOrOne } from './format';

/* ---------- shared ---------- */

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });

/** `+ 4` or `- 4`, for a term written after another. */
function signed(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** A number in brackets when it is negative, for substituting. */
function br(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** A fraction in brackets when it is negative. */
function brFrac(p: number, q: number): string {
  const tex = fracTex(p, q);
  return p * q < 0 ? `\\left(${tex}\\right)` : tex;
}

/** Stacked lines of working, aligned. */
function chain(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** Stacked lines of working, centred. */
function gathered(...lines: string[]): string {
  return `\\begin{gathered} ${lines.join(' \\\\ ')} \\end{gathered}`;
}

/** c times a letter, as written by hand: `d`, `-d`, `3d`. */
function times(c: number, letter: string): string {
  return termTex(c, 1).replace(/x$/, letter);
}

/** p v + q in the letter v, zero parts left out. */
function lin(p: number, q: number, v = 'k'): string {
  const text = sumTex([times(p, v), `${q}`]);
  return text === '' ? '0' : text;
}

/** A k^2 + B k + C in the letter v. */
function quad(A: number, B: number, C: number, v = 'k'): string {
  const text = sumTex([termTex(A, 2).replace(/x/, v), times(B, v), `${C}`]);
  return text === '' ? '0' : text;
}

/** A stable number from a question's own values, for turning options. Never the rng (PITFALLS 3.10). */
function mix(...values: (number | string)[]): number {
  let hash = 7;
  for (const value of values) {
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function turned<T>(items: T[], turn: number): T[] {
  const at = turn % items.length;
  return [...items.slice(at), ...items.slice(0, at)];
}

/** A native choice's options, the first label correct, turned by the question's own values. */
function nativeChoice(labels: string[], salt: number): { options: { id: string; label: string; tex: boolean }[]; correctId: string } {
  const kept = [...new Set(labels)];
  return {
    options: turned(
      kept.map((label, i) => ({ id: i === 0 ? 'correct' : `wrong${i}`, label, tex: true })),
      salt,
    ),
    correctId: 'correct',
  };
}

/** The correct number and three wrong ones: the slips first, then near misses. */
function numberOptions(correct: number, slips: number[]): ChoiceOption[] {
  const out: ChoiceOption[] = [{ tex: `${correct}`, answer: `${correct}`, correct: true }];
  const seen = new Set([correct]);
  for (const value of [...slips, correct + 1, correct - 1, correct + 2, correct - 2, correct + 3]) {
    if (out.length === 4) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    out.push({ tex: `${value}`, answer: `${value}` });
  }
  return out;
}

/** The fraction `fracTex` shows, for the grader; the outer brackets matter (PITFALLS 3.3). */
function fracAnswer(p: number, q: number): string {
  return `((${p})/(${q}))`;
}

/** The correct fraction and three wrong ones, no two worth the same. */
function fracOptions(correct: [number, number], slips: [number, number][]): ChoiceOption[] {
  const [p, q] = correct;
  const out: ChoiceOption[] = [{ tex: fracTex(p, q), answer: fracAnswer(p, q), correct: true }];
  const seen = [p / q];
  const extra: [number, number][] = [[p + 1, q], [p - 1, q], [p + 2, q], [p - 2, q]];
  for (const [x, y] of [...slips, ...extra]) {
    if (out.length === 4) break;
    if (y === 0) continue;
    const value = x / y;
    if (seen.some((s) => Math.abs(s - value) < 1e-9)) continue;
    seen.push(value);
    out.push({ tex: fracTex(x, y), answer: fracAnswer(x, y) });
  }
  return out;
}

/**
 * A bank of whole numbers for a table or a tree: every answer (repeats kept),
 * then up to four distinct distractors, topped up with near misses so at
 * least two remain. Sorted by value, never shuffled (PITFALLS 3.10).
 */
function numberBank(answer: number[], slips: number[], most = 4): string[] {
  const extras: number[] = [];
  for (const value of slips) {
    if (extras.length >= most) break;
    if (!Number.isInteger(value) || answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  for (let step = 1; extras.length < 2; step += 1) {
    for (const value of [answer[answer.length - 1] + step, answer[0] - step]) {
      if (extras.length < 2 && !answer.includes(value) && !extras.includes(value)) extras.push(value);
    }
  }
  return [...answer, ...extras].sort((x, y) => x - y).map(String);
}

const NUMBER = /^-?\d+$/;

/** A tiles bank: every answer token (repeats kept) plus the distinct distractors, sorted. */
function tileBank(answer: string[], distractors: string[], most = 5): string[] {
  const look = (text: string) => text.replace(/\s+/g, '');
  const seen = new Set(answer.map(look));
  const extras = distractors.filter((text) => !seen.has(look(text)) && seen.add(look(text))).slice(0, most);
  const all = [...answer, ...extras];
  if (all.every((token) => NUMBER.test(token))) return all.sort((x, y) => Number(x) - Number(y));
  return all.sort();
}

/** Times and brackets on every typed answer, so the learner may type the sum rather than do it. */
const ARITHMETIC_KEYS: KeypadKey[] = [{ insert: '*', label: '×' }, { insert: '(' }, { insert: ')' }];
const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

/** A number typed on the keypad, with a lead naming what it is. */
function typed(prompt: Block[], lead: string, answer: number | string, keypad: KeypadKey[] = []): Slide {
  return {
    kind: 'expression',
    prompt,
    lead,
    keypad: [...ARITHMETIC_KEYS, ...keypad],
    answer: `${answer}`,
    domain: 'real',
    mode: 'exact',
  };
}

/** A value in a check line: `= 1533` when whole, `\approx 1.21` otherwise. */
function approx(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) return `= ${Math.round(value)}`;
  return `\\approx ${Number(value.toPrecision(4))}`;
}

/** Is x far enough from a whole number that rounding it is a real step? */
function offWhole(x: number): boolean {
  const f = x - Math.floor(x);
  return f > 0.03 && f < 0.97;
}

/** A whole number from lo to hi, never 0: a first term of 0 reads as a trick. */
function nonZeroInt(rng: Rng, lo: number, hi: number): number {
  for (;;) {
    const value = rng.int(lo, hi);
    if (value !== 0) return value;
  }
}

/** v / r written with the sign in front: `-\frac{15}{r}`. */
function overR(v: number, below = 'r'): string {
  return v < 0 ? `-\\frac{${-v}}{${below}}` : `\\frac{${v}}{${below}}`;
}

/* ---------- Lesson 1: two terms given ---------- */

interface ApTwoParams {
  a: number;
  /** d = dn / dd, dd 1 or 2. With dd = 2 every position used is odd, so every term is whole. */
  dn: number;
  dd: number;
  p: number;
  q: number;
  k: number;
}

const apAt = ({ a, dn, dd }: ApTwoParams, n: number) => a + ((n - 1) * dn) / dd;

function sampleApTwo(rng: Rng, difficulty: number, halves: boolean): ApTwoParams {
  const hard = difficulty > 1;
  if (hard && halves && rng.chance(0.4)) {
    const dn = rng.pick([-7, -5, -3, -1, 1, 3, 5, 7, 9]);
    const p = rng.pick([3, 5, 7, 9]);
    const q = p + rng.pick([4, 6, 8]);
    const k = q + rng.pick([6, 8, 10, 12, 14, 16, 20]);
    return { a: nonZeroInt(rng, -20, 40), dn, dd: 2, p, q, k };
  }
  const dn = hard ? rng.pick([-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12]) : rng.int(2, 9);
  const p = hard ? rng.int(3, 9) : rng.int(2, 5);
  const q = p + (hard ? rng.int(3, 9) : rng.int(2, 6));
  const k = hard ? rng.int(q + 5, 60) : rng.int(q + 3, 30);
  return { a: hard ? nonZeroInt(rng, -40, 60) : nonZeroInt(rng, -10, 20), dn, dd: 1, p, q, k };
}

function apTwoPrompt(params: ApTwoParams, tail: string): Block[] {
  const { p, q } = params;
  return [say(`An arithmetic sequence has $u_{${p}} = ${apAt(params, p)}$ and $u_{${q}} = ${apAt(params, q)}$. ${tail}`)];
}

function apTwoSolution(params: ApTwoParams, withTerm: boolean): SolutionStep[] {
  const { a, dn, dd, p, q, k } = params;
  const X = apAt(params, p);
  const Y = apAt(params, q);
  const d = fracTex(dn, dd);
  return [
    { text: 'Write both terms with $u_n = a + (n - 1)d$.' },
    { tex: chain(`a + ${times(p - 1, 'd')} &= ${X}`, `a + ${times(q - 1, 'd')} &= ${Y}`) },
    { text: `Take the first from the second. The $a$ cancels, leaving $${q - p}$ steps of $d$.` },
    { tex: chain(`${times(q - p, 'd')} &= ${Y} - ${br(X)} = ${Y - X}`, `d &= ${d}`) },
    { tex: `a = ${X} - ${p - 1} \\times ${dd === 1 ? br(dn) : brFrac(dn, dd)} = ${a}` },
    ...(withTerm
      ? [{ tex: chain(`u_{${k}} &= ${a} + ${k - 1} \\times ${dd === 1 ? br(dn) : brFrac(dn, dd)}`, `&= ${apAt(params, k)}`) }]
      : []),
  ];
}

/** A later term of an arithmetic sequence from two terms some way apart. Harder draws may have a half-step d. */
const apTwo: Generator<ApTwoParams> = {
  id: 'seq-l7-ap-two',
  sample: (rng, difficulty) => sampleApTwo(rng, difficulty, true),
  choices: (params) => {
    const ans = apAt(params, params.k);
    const step = params.dn / params.dd;
    return numberOptions(ans, [ans + step, ans - step, ans + 2 * step, -ans]);
  },
  render: (params): Slide =>
    typed(apTwoPrompt(params, `Find $u_{${params.k}}$.`), `u_{${params.k}} =`, apAt(params, params.k)),
  solution: (params) => apTwoSolution(params, true),
};

/** The same, worked as a tree: the change, the steps, d, a, then the later term. Whole d only. */
const apTwoTree: Generator<ApTwoParams> = {
  id: 'seq-l7-ap-two-tree',
  sample: (rng, difficulty) => sampleApTwo(rng, difficulty, false),
  render: (params): Slide => {
    const { a, dn: d, p, q, k } = params;
    const X = apAt(params, p);
    const Y = apAt(params, q);
    const ans = apAt(params, k);
    const answer = [Y - X, q - p, d, a, ans];
    const slips = [q - p + 1, -d, X - p * d, a + d, ans + d, ans - d, Y + X];
    return {
      kind: 'tree',
      prompt: apTwoPrompt(
        params,
        `Fill the tree: the change from $u_{${p}}$ to $u_{${q}}$, the number of steps between them, then $d$, $a$ and $u_{${k}}$.`,
      ),
      expression: `u_{${p}} = ${X}, \\quad u_{${q}} = ${Y}`,
      nodes: [
        { id: 'change', from: [] },
        { id: 'steps', from: [] },
        { id: 'd', from: ['change', 'steps'] },
        { id: 'a', from: ['d'] },
        { id: 'term', from: ['a', 'd'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => apTwoSolution(params, true),
};

/** What the question says about the sign, when an even power leaves two roots. */
type Told = 'none' | 'positive' | 'negative';

interface GpTwoParams {
  a: number;
  r: number;
  p: number;
  q: number;
  k: number;
  told: Told;
  ask: 'term' | 'first';
}

const gpAt = (a: number, r: number, n: number) => a * r ** (n - 1);

/** a r^(n-1) as written: `a`, `ar`, `ar^{4}`. */
function arPow(n: number): string {
  if (n === 1) return 'a';
  if (n === 2) return 'ar';
  return `ar^{${n - 1}}`;
}

/** r to a power in a substitution: `2`, `(-3)^{4}`. */
function powTex(r: number, e: number): string {
  return e === 1 ? br(r) : `${br(r)}^{${e}}`;
}

const TOLD_TEXT: Record<Told, string> = {
  none: '',
  positive: ' Its common ratio is positive.',
  negative: ' Its common ratio is negative.',
};

function sampleGpTwo(rng: Rng, difficulty: number, ask: 'term' | 'first' | 'any'): GpTwoParams {
  const hard = difficulty > 1;
  for (;;) {
    const r = hard ? rng.pick([2, 3, 4, -2, -3, -4]) : rng.pick([2, 3, 4, 5]);
    const a = hard ? rng.pick([1, 2, 3, 4, 5, 6, -1, -2, -3, -4, -5]) : rng.int(1, 6);
    const p = hard ? rng.int(2, 4) : rng.int(1, 3);
    const gap = hard ? rng.int(2, 4) : rng.int(2, 3);
    const q = p + gap;
    const k = q + rng.int(1, hard ? 4 : 3);
    const told: Told = gap % 2 === 1 ? 'none' : r > 0 ? 'positive' : 'negative';
    const chosen = ask === 'any' ? (hard && rng.chance(0.4) ? 'first' : 'term') : ask;
    if (Math.abs(gpAt(a, r, k)) > 50000 || Math.abs(gpAt(a, r, q)) > 50000) continue;
    return { a, r, p, q, k, told, ask: chosen };
  }
}

function gpTwoPrompt({ a, r, p, q, told }: GpTwoParams, tail: string): Block[] {
  return [say(`A geometric sequence has $u_{${p}} = ${gpAt(a, r, p)}$ and $u_{${q}} = ${gpAt(a, r, q)}$.${TOLD_TEXT[told]} ${tail}`)];
}

function gpTwoSolution(params: GpTwoParams, withTerm: boolean): SolutionStep[] {
  const { a, r, p, q, k } = params;
  const X = gpAt(a, r, p);
  const Y = gpAt(a, r, q);
  const gap = q - p;
  const root =
    gap % 2 === 0
      ? `An even power has two roots, $r = \\pm ${Math.abs(r)}$. The ratio is ${r > 0 ? 'positive' : 'negative'}, so $r = ${r}$.`
      : `An odd power has one real root: $r = ${r}$.`;
  return [
    { text: 'Write both terms with $u_n = ar^{n-1}$ and divide the later by the earlier: the $a$ cancels.' },
    { tex: chain(`${arPow(p)} &= ${X}`, `${arPow(q)} &= ${Y}`) },
    { tex: `r^{${gap}} = \\frac{${Y}}{${X}} = ${Y / X}` },
    { text: root },
    { tex: p === 1 ? `a = u_1 = ${a}` : `a = ${X} \\div ${powTex(r, p - 1)} = ${a}` },
    ...(withTerm ? [{ tex: chain(`u_{${k}} &= ${a} \\times ${powTex(r, k - 1)}`, `&= ${gpAt(a, r, k)}`) }] : []),
  ];
}

/** A later term (or the first) of a geometric sequence from two terms some way apart. */
const gpTwo: Generator<GpTwoParams> = {
  id: 'seq-l7-gp-two',
  sample: (rng, difficulty) => sampleGpTwo(rng, difficulty, 'any'),
  choices: (params) => {
    const { a, r, k, ask } = params;
    const ans = ask === 'term' ? gpAt(a, r, k) : a;
    return numberOptions(ans, [-ans, ans * r, ans / r, ans * Math.abs(r)]);
  },
  render: (params): Slide =>
    params.ask === 'term'
      ? typed(gpTwoPrompt(params, `Find $u_{${params.k}}$.`), `u_{${params.k}} =`, gpAt(params.a, params.r, params.k))
      : typed(gpTwoPrompt(params, 'Find its first term $a$.'), 'a =', params.a),
  solution: (params) => gpTwoSolution(params, params.ask === 'term'),
};

/** The same as a tree: r to the gap, r, a, then the later term. */
const gpTwoTree: Generator<GpTwoParams> = {
  id: 'seq-l7-gp-two-tree',
  sample: (rng, difficulty) => sampleGpTwo(rng, difficulty, 'term'),
  render: (params): Slide => {
    const { a, r, p, q, k } = params;
    const X = gpAt(a, r, p);
    const Y = gpAt(a, r, q);
    const gap = q - p;
    const ans = gpAt(a, r, k);
    const answer = [Y / X, r, a, ans];
    const slips = [-r, Y - X, -a, a * r, ans * r, -ans, r ** (gap - 1), gap];
    return {
      kind: 'tree',
      prompt: gpTwoPrompt(params, `Fill the tree: $r^{${gap}}$, then $r$, $a$ and $u_{${k}}$.`),
      expression: `u_{${p}} = ${X}, \\quad u_{${q}} = ${Y}`,
      nodes: [
        { id: 'power', from: [] },
        { id: 'r', from: ['power'] },
        { id: 'a', from: ['r'] },
        { id: 'term', from: ['a', 'r'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => gpTwoSolution(params, true),
};

type SignTold = 'none' | 'positive' | 'alternate';

interface GpSignParams {
  a: number;
  r: number;
  p: number;
  gap: number;
  told: SignTold;
}

const SIGN_TEXT: Record<SignTold, string> = {
  none: '',
  positive: ' All its terms are positive.',
  alternate: ' Its terms alternate in sign.',
};

/**
 * Which values can r take? An even power leaves r = ±s unless the question
 * rules one out; an odd power leaves one. The slip is not taking the root.
 */
const gpSign: Generator<GpSignParams> = {
  id: 'seq-l7-gp-sign',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const gap = hard ? rng.int(2, 4) : rng.int(2, 3);
      const s = rng.pick([2, 3, 4]);
      let told: SignTold = 'none';
      if (hard && gap % 2 === 0) told = rng.pick(['none', 'positive', 'alternate']);
      const r = told === 'positive' ? s : told === 'alternate' ? -s : s * rng.sign();
      const a = told === 'positive' ? rng.int(1, 6) : rng.int(1, 6) * rng.sign();
      const p = rng.int(1, hard ? 4 : 3);
      if (Math.abs(gpAt(a, r, p + gap)) > 20000) continue;
      return { a, r, p, gap, told };
    }
  },
  render: ({ a, r, p, gap, told }): Slide => {
    const s = Math.abs(r);
    const ratio = r ** gap;
    const plus = `r = ${s} \\text{ only}`;
    const minus = `r = -${s} \\text{ only}`;
    const both = `r = ${s} \\text{ or } r = -${s}`;
    const noRoot = `r = ${ratio} \\text{ only}`;
    let correct: string;
    if (gap % 2 === 1) correct = r > 0 ? plus : minus;
    else correct = told === 'none' ? both : told === 'positive' ? plus : minus;
    const labels = [correct, ...[plus, minus, both, noRoot].filter((label) => label !== correct)];
    const { options, correctId } = nativeChoice(labels, mix(a, r, p, gap, told));
    return {
      kind: 'choice',
      prompt: [
        say(
          `A geometric sequence has $u_{${p}} = ${gpAt(a, r, p)}$ and $u_{${p + gap}} = ${gpAt(a, r, p + gap)}$.${SIGN_TEXT[told]} Which values can its common ratio $r$ take?`,
        ),
      ],
      options,
      correctId,
    };
  },
  solution: ({ a, r, p, gap, told }) => {
    const s = Math.abs(r);
    const X = gpAt(a, r, p);
    const Y = gpAt(a, r, p + gap);
    let verdict: string;
    if (gap % 2 === 1) verdict = `An odd power has one real root, so $r = ${r}$ only.`;
    else if (told === 'none') verdict = `An even power has two roots, $r = ${s}$ or $r = -${s}$, and both fit these two terms: nothing rules either out.`;
    else if (told === 'positive') verdict = `An even power gives $r = \\pm ${s}$, but a negative ratio would make every other term negative. So $r = ${s}$ only.`;
    else verdict = `An even power gives $r = \\pm ${s}$, and terms that alternate in sign need a negative ratio. So $r = -${s}$ only.`;
    return [
      { text: `Divide the later term by the earlier: $${gap}$ steps of $r$ lie between them.` },
      { tex: `r^{${gap}} = \\frac{${Y}}{${X}} = ${Y / X}` },
      { text: verdict },
    ];
  },
};

interface FillParams {
  kind: 'ap' | 'gp';
  a: number;
  /** d for an arithmetic sequence, r for a geometric one. */
  step: number;
  /** The two rows given, 0-based. */
  given: [number, number];
}

function fillTerms({ kind, a, step }: FillParams): number[] {
  const rows = kind === 'ap' ? 6 : 5;
  return Array.from({ length: rows }, (_, i) => (kind === 'ap' ? a + i * step : a * step ** i));
}

/** Two terms some way apart given, every other row of the table filled in. */
const fillTable: Generator<FillParams> = {
  id: 'seq-l7-fill-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    if (hard && rng.chance(0.5)) {
      const given = rng.pick<[number, number]>([[0, 3], [1, 4]]);
      return { kind: 'gp', a: rng.pick([1, 2, 3, 4, 5, -1, -2, -3]), step: rng.pick([2, 3, -2, -3]), given };
    }
    const given = rng.pick<[number, number]>([[0, 3], [1, 4], [1, 5], [0, 4], [2, 5], [1, 3], [0, 2]]);
    const step = hard ? rng.pick([-9, -8, -7, -6, -5, -4, -3, 3, 4, 5, 6, 7, 8, 9, 11, 12]) : rng.int(2, 9);
    return { kind: 'ap', a: hard ? nonZeroInt(rng, -20, 40) : nonZeroInt(rng, -10, 20), step, given };
  },
  render: (params): Slide => {
    const { kind, step, given } = params;
    const terms = fillTerms(params);
    const blanks = terms.map((_, i) => i).filter((i) => !given.includes(i));
    const answer = blanks.map((i) => terms[i]);
    const slips =
      kind === 'ap'
        ? [terms[0] - step, terms[terms.length - 1] + step, terms[1] + 1, terms[2] - 1, terms[0] + 1]
        : [-terms[1], -terms[2], terms[0] * step * step * step * step * step, terms[2] + 1, -terms[0]];
    return {
      kind: 'table',
      prompt: [say(`${kind === 'ap' ? 'An arithmetic' : 'A geometric'} sequence has the two terms shown. Fill in the rest.`)],
      columns: ['n', 'u_n'],
      rows: terms.map((t, i) => [`${i + 1}`, given.includes(i) ? `${t}` : null]),
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { kind, step, given } = params;
    const terms = fillTerms(params);
    const [i, j] = given;
    const X = terms[i];
    const Y = terms[j];
    const gap = j - i;
    if (kind === 'ap') {
      return [
        { text: `From $u_{${i + 1}}$ to $u_{${j + 1}}$ is $${gap}$ steps of $d$.` },
        { tex: chain(`${times(gap, 'd')} &= ${Y} - ${br(X)} = ${Y - X}`, `d &= ${step}`) },
        { text: 'Add $d$ going down the table and take it away going up.' },
        { tex: terms.join(', \\; ') },
      ];
    }
    return [
      { text: `From $u_{${i + 1}}$ to $u_{${j + 1}}$ is $${gap}$ steps of $r$, so divide.` },
      { tex: chain(`r^{${gap}} &= \\frac{${Y}}{${X}} = ${Y / X}`, `r &= ${step}`) },
      { text: 'An odd power has one real root. Multiply by $r$ going down the table and divide going up.' },
      { tex: terms.join(', \\; ') },
    ];
  },
};

/* ---------- Lesson 2: conditions on sums ---------- */

/** 2a + (n - 1)d, the bracket of S_n = n/2 (2a + (n - 1)d). */
const bracket = (a: number, d: number, n: number) => 2 * a + (n - 1) * d;
const apSum = (a: number, d: number, n: number) => (n * bracket(a, d, n)) / 2;

/** n/2 as it is written in front of the bracket: `5` for 10, `\tfrac{7}{2}` for 7. */
function half(n: number): string {
  return n % 2 === 0 ? `${n / 2}` : `\\tfrac{${n}}{2}`;
}

interface SumTilesParams {
  a: number;
  d: number;
  m: number;
  n: number;
  /** Whether the first fact is a sum or a term. */
  first: 'sum' | 'term';
}

/** Each fact as an equation in a and d: a sum as 2a + (n - 1)d = 2S/n, a term as a + (n - 1)d = u. */
const sumTiles: Generator<SumTilesParams> = {
  id: 'seq-l7-sum-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const m = rng.int(3, 8);
    return {
      a: hard ? nonZeroInt(rng, -10, 30) : nonZeroInt(rng, 1, 12),
      d: hard ? rng.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]) : rng.int(1, 8),
      m,
      n: m + rng.int(2, 10),
      first: hard && rng.chance(0.5) ? 'term' : 'sum',
    };
  },
  render: ({ a, d, m, n, first }): Slide => {
    const e1 = first === 'sum' ? bracket(a, d, m) : a + (m - 1) * d;
    const e2 = bracket(a, d, n);
    const fact1 = first === 'sum' ? `S_{${m}} = ${apSum(a, d, m)}` : `u_{${m}} = ${e1}`;
    const answer = [`${m - 1}`, `${e1}`, `${n - 1}`, `${e2}`];
    const S2 = apSum(a, d, n);
    const slips = [`${m}`, `${n}`, `${n + 1}`, `${e2 / 2}`, `${e1 * 2}`, `${S2 / n}`, `${m - 2}`].filter((t) => NUMBER.test(t));
    return {
      kind: 'tiles',
      prompt: [say(`An arithmetic series has $${fact1}$ and $S_{${n}} = ${S2}$. Write each fact as an equation in $a$ and $d$.`)],
      template: `${first === 'sum' ? '2a' : 'a'} + {0}d = {1} \\qquad 2a + {2}d = {3}`,
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: ({ a, d, m, n, first }) => {
    const sumLines = (k: number) => [`${half(k)}(2a + ${times(k - 1, 'd')}) &= ${apSum(a, d, k)}`, `2a + ${times(k - 1, 'd')} &= ${bracket(a, d, k)}`];
    const firstStep: SolutionStep[] =
      first === 'sum'
        ? [{ text: `$S_{${m}}$: multiply by $2$ and divide by $${m}$.` }, { tex: chain(...sumLines(m)) }]
        : [{ text: `$u_{${m}}$ is a term, so it gives its equation directly.` }, { tex: `a + ${times(m - 1, 'd')} = ${a + (m - 1) * d}` }];
    return [
      { text: 'A term is $a + (n - 1)d$. A sum is $\\frac{n}{2}(2a + (n - 1)d)$: clear the $\\frac{n}{2}$ to leave the bracket.' },
      ...firstStep,
      { text: `$S_{${n}}$: multiply by $2$ and divide by $${n}$.` },
      { tex: chain(...sumLines(n)) },
    ];
  },
};

type SumsAsk = 'a' | 'd' | 'term' | 'sum';

interface TwoSumsParams {
  a: number;
  d: number;
  m: number;
  n: number;
  ask: SumsAsk;
  k: number;
}

function sampleTwoSums(rng: Rng, difficulty: number): TwoSumsParams {
  const hard = difficulty > 1;
  const m = rng.int(3, hard ? 10 : 7);
  const n = m + rng.int(2, hard ? 12 : 8);
  return {
    a: hard ? nonZeroInt(rng, -15, 30) : nonZeroInt(rng, 1, 15),
    d: hard ? rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]) : rng.int(1, 7),
    m,
    n,
    ask: hard ? rng.pick<SumsAsk>(['term', 'sum', 'a']) : rng.pick<SumsAsk>(['a', 'd']),
    k: rng.int(n + 1, n + 15),
  };
}

const SUMS_ASK: Record<SumsAsk, (k: number) => [string, string]> = {
  a: () => ['its first term $a$', 'a ='],
  d: () => ['its common difference $d$', 'd ='],
  term: (k) => [`$u_{${k}}$`, `u_{${k}} =`],
  sum: (k) => [`$S_{${k}}$`, `S_{${k}} =`],
};

function sumsAnswer({ a, d, ask, k }: TwoSumsParams): number {
  if (ask === 'a') return a;
  if (ask === 'd') return d;
  if (ask === 'term') return a + (k - 1) * d;
  return apSum(a, d, k);
}

function sumsSlips(params: TwoSumsParams): number[] {
  const { a, d, ask, k } = params;
  if (ask === 'a') return [-a, 2 * a, a + d, a - d];
  if (ask === 'd') return [-d, 2 * d, a, d + 1];
  if (ask === 'term') return [a + k * d, a + (k - 2) * d, -(a + (k - 1) * d)];
  return [apSum(a, d, k - 1), apSum(a, d, k + 1), k * (a + (k - 1) * d)];
}

/** The last line of working: the term or sum asked, from a and d. */
function sumsFinish({ a, d, ask, k }: TwoSumsParams): SolutionStep[] {
  if (ask === 'term') return [{ tex: chain(`u_{${k}} &= ${a} + ${k - 1} \\times ${br(d)}`, `&= ${a + (k - 1) * d}`) }];
  if (ask === 'sum') {
    return [{ tex: chain(`S_{${k}} &= ${half(k)}(${2 * a} + ${k - 1} \\times ${br(d)})`, `&= ${apSum(a, d, k)}`) }];
  }
  return [];
}

function twoSumsSolution(params: TwoSumsParams): SolutionStep[] {
  const { a, d, m, n } = params;
  const e1 = bracket(a, d, m);
  const e2 = bracket(a, d, n);
  return [
    { text: 'Turn each sum into an equation: multiply by $2$ and divide by its number of terms.' },
    { tex: chain(`2a + ${times(m - 1, 'd')} &= ${e1}`, `2a + ${times(n - 1, 'd')} &= ${e2}`) },
    { text: 'Take the first from the second: the $2a$ cancels.' },
    { tex: chain(`${times(n - m, 'd')} &= ${e2 - e1}`, `d &= ${d}`) },
    { tex: chain(`2a &= ${e1} - ${m - 1} \\times ${br(d)} = ${2 * a}`, `a &= ${a}`) },
    ...sumsFinish(params),
  ];
}

/** Two sums of an arithmetic series: find a, d, a later term or a later sum. */
const twoSums: Generator<TwoSumsParams> = {
  id: 'seq-l7-two-sums',
  sample: sampleTwoSums,
  choices: (params) => numberOptions(sumsAnswer(params), sumsSlips(params)),
  render: (params): Slide => {
    const { a, d, m, n, ask, k } = params;
    const [what, lead] = SUMS_ASK[ask](k);
    return typed(
      [say(`An arithmetic series has $S_{${m}} = ${apSum(a, d, m)}$ and $S_{${n}} = ${apSum(a, d, n)}$. Find ${what}.`)],
      lead,
      sumsAnswer(params),
    );
  },
  solution: twoSumsSolution,
};

/** Two sums worked as a tree: each bracket, their difference, d, then a. */
const twoSumsTree: Generator<TwoSumsParams> = {
  id: 'seq-l7-two-sums-tree',
  sample: sampleTwoSums,
  render: (params): Slide => {
    const { a, d, m, n } = params;
    const e1 = bracket(a, d, m);
    const e2 = bracket(a, d, n);
    const answer = [e1, e2, e2 - e1, d, a];
    const slips = [apSum(a, d, m) / m, e1 + e2, -d, 2 * a, a + d, n - m, e2 - e1 + d];
    return {
      kind: 'tree',
      prompt: [
        say(
          `An arithmetic series has $S_{${m}} = ${apSum(a, d, m)}$ and $S_{${n}} = ${apSum(a, d, n)}$. Fill the tree: $2a + ${times(m - 1, 'd')}$ and $2a + ${times(n - 1, 'd')}$ from the sums, their difference, then $d$ and $a$.`,
        ),
      ],
      expression: `S_{${m}} = ${apSum(a, d, m)}, \\quad S_{${n}} = ${apSum(a, d, n)}`,
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'difference', from: ['first', 'second'] },
        { id: 'd', from: ['difference'] },
        { id: 'a', from: ['d'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => twoSumsSolution({ ...params, ask: 'a' }),
};

interface TermSumParams {
  a: number;
  d: number;
  /** The term given. */
  p: number;
  /** The sum given. */
  n: number;
  ask: SumsAsk;
  k: number;
}

/** A term and a sum: double the term's equation so the 2a cancels. */
const termSum: Generator<TermSumParams> = {
  id: 'seq-l7-term-sum',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const p = rng.int(2, hard ? 9 : 6);
      const n = rng.int(5, hard ? 20 : 14);
      if (n - 1 === 2 * (p - 1)) continue;
      return {
        a: hard ? nonZeroInt(rng, -15, 30) : nonZeroInt(rng, 1, 15),
        d: hard ? rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]) : rng.int(1, 7),
        p,
        n,
        ask: hard ? rng.pick<SumsAsk>(['term', 'sum', 'a']) : rng.pick<SumsAsk>(['a', 'd']),
        k: rng.int(n + 1, n + 12),
      };
    }
  },
  choices: (params) => {
    const shaped = { ...params, m: params.p };
    return numberOptions(sumsAnswer(shaped), sumsSlips(shaped));
  },
  render: (params): Slide => {
    const { a, d, p, n, ask, k } = params;
    const [what, lead] = SUMS_ASK[ask](k);
    return typed(
      [say(`An arithmetic series has $u_{${p}} = ${a + (p - 1) * d}$ and $S_{${n}} = ${apSum(a, d, n)}$. Find ${what}.`)],
      lead,
      sumsAnswer({ ...params, m: p }),
    );
  },
  solution: (params) => {
    const { a, d, p, n } = params;
    const X = a + (p - 1) * d;
    const e2 = bracket(a, d, n);
    const c = n - 1 - 2 * (p - 1);
    return [
      { text: 'Write the term and the sum as equations, the sum with its $\\frac{n}{2}$ cleared.' },
      { tex: chain(`a + ${times(p - 1, 'd')} &= ${X}`, `2a + ${times(n - 1, 'd')} &= ${e2}`) },
      { text: 'Double the first, then take it from the second: the $2a$ cancels.' },
      { tex: chain(`2a + ${times(2 * (p - 1), 'd')} &= ${2 * X}`, `${times(c, 'd')} &= ${e2 - 2 * X}`, `d &= ${d}`) },
      { tex: `a = ${X} - ${p - 1} \\times ${br(d)} = ${a}` },
      ...sumsFinish({ ...params, m: p }),
    ];
  },
};

interface FactParams {
  kind: 'term' | 'sum';
  a: number;
  d: number;
  m: number;
  words: boolean;
}

/** Which equation does one fact give? A sum's bracket and a term's a + (n - 1)d, and the slips between them. */
const factEquation: Generator<FactParams> = {
  id: 'seq-l7-fact-equation',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const params: FactParams = {
        kind: hard && rng.chance(0.4) ? 'term' : 'sum',
        a: nonZeroInt(rng, hard ? -10 : 1, 20),
        d: hard ? rng.pick([-4, -3, -2, 2, 3, 4, 5, 6]) : rng.int(1, 6),
        m: rng.int(3, hard ? 20 : 12),
        words: rng.chance(0.5),
      };
      const value = params.kind === 'sum' ? apSum(params.a, params.d, params.m) : params.a + (params.m - 1) * params.d;
      if (value === 0) continue;
      return params;
    }
  },
  render: ({ kind, a, d, m, words }): Slide => {
    const X = kind === 'sum' ? apSum(a, d, m) : a + (m - 1) * d;
    const e = bracket(a, d, m);
    const labels =
      kind === 'sum'
        ? [
            `2a + ${times(m - 1, 'd')} = ${e}`,
            `2a + ${times(m, 'd')} = ${e}`,
            `a + ${times(m - 1, 'd')} = ${X}`,
            `2a + ${times(m - 1, 'd')} = ${fracTex(X, m)}`,
          ]
        : [
            `a + ${times(m - 1, 'd')} = ${X}`,
            `a + ${times(m, 'd')} = ${X}`,
            `2a + ${times(m - 1, 'd')} = ${X}`,
            `a + ${times(m - 2, 'd')} = ${X}`,
          ];
    let fact: string;
    if (kind === 'sum') fact = words ? `The sum of its first $${m}$ terms is $${X}$.` : `It has $S_{${m}} = ${X}$.`;
    else fact = words ? `Its term in position $${m}$ is $${X}$.` : `It has $u_{${m}} = ${X}$.`;
    const { options, correctId } = nativeChoice(labels, mix(kind, a, d, m));
    return {
      kind: 'choice',
      prompt: [say(`An arithmetic series has first term $a$ and common difference $d$. ${fact} Which equation does this give?`)],
      options,
      correctId,
    };
  },
  solution: ({ kind, a, d, m }) => {
    if (kind === 'term') {
      return [
        { text: `A term is $u_n = a + (n - 1)d$. Here $n = ${m}$, so $n - 1 = ${m - 1}$.` },
        { tex: `a + ${times(m - 1, 'd')} = ${a + (m - 1) * d}` },
      ];
    }
    return [
      { text: `A sum is $S_n = \\frac{n}{2}(2a + (n - 1)d)$. Here $n = ${m}$.` },
      { tex: chain(`${half(m)}(2a + ${times(m - 1, 'd')}) &= ${apSum(a, d, m)}`, `2a + ${times(m - 1, 'd')} &= ${bracket(a, d, m)}`) },
      { text: `The second line is the first multiplied by $2$ and divided by $${m}$.` },
    ];
  },
};

/* ---------- Lesson 3: unknowns in consecutive terms ---------- */

interface ApUnknownParams {
  p: [number, number, number];
  q: [number, number, number];
  k: number;
  ask: 'k' | 'd' | 'next';
}

const termAt = (p: number, q: number, k: number) => p * k + q;

function apUnknownValues({ p, q, k }: ApUnknownParams): number[] {
  return [0, 1, 2].map((i) => termAt(p[i], q[i], k));
}

function sampleApUnknown(rng: Rng, difficulty: number): ApUnknownParams {
  const hard = difficulty > 1;
  for (;;) {
    const k = hard ? rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) : rng.int(2, 9);
    const p: [number, number, number] = [rng.int(1, 5), rng.int(1, 5), rng.int(1, 5)];
    const C = 2 * p[1] - p[0] - p[2];
    if (C === 0) continue;
    const q0 = rng.int(-9, 9);
    const q2 = rng.int(-9, 9);
    const twice = (p[0] + p[2] - 2 * p[1]) * k + q0 + q2;
    if (twice % 2 !== 0) continue;
    const q: [number, number, number] = [q0, twice / 2, q2];
    if (Math.abs(q[1]) > 15) continue;
    const params: ApUnknownParams = { p, q, k, ask: hard ? rng.pick(['k', 'd', 'next']) : 'k' };
    const v = apUnknownValues(params);
    if (v[1] === v[0] || v.some((x) => Math.abs(x) > 120)) continue;
    return params;
  }
}

function apUnknownTerms({ p, q }: ApUnknownParams): string {
  return [0, 1, 2].map((i) => lin(p[i], q[i])).join(', \\quad ');
}

/** Solving 2u_2 = u_1 + u_3 for k, line by line. */
function apUnknownWorking(params: ApUnknownParams): SolutionStep[] {
  const { p, q, k } = params;
  const C = 2 * p[1] - p[0] - p[2];
  const R = q[0] + q[2] - 2 * q[1];
  return [
    { text: 'The middle term is the mean of the other two, so $2u_2 = u_1 + u_3$.' },
    {
      tex: chain(
        `2(${lin(p[1], q[1])}) &= ${lin(p[0], q[0])} + ${lin(p[2], q[2])}`,
        `${lin(2 * p[1], 2 * q[1])} &= ${lin(p[0] + p[2], q[0] + q[2])}`,
        `${times(C, 'k')} &= ${R}`,
        `k &= ${k}`,
      ),
    },
  ];
}

function apUnknownAnswer(params: ApUnknownParams): number {
  const v = apUnknownValues(params);
  if (params.ask === 'k') return params.k;
  if (params.ask === 'd') return v[1] - v[0];
  return v[2] + v[1] - v[0];
}

const AP_UNKNOWN_ASK = {
  k: ['Find $k$.', 'k ='],
  d: ['Find the common difference $d$.', 'd ='],
  next: ['Find $u_4$.', 'u_4 ='],
} as const;

/** Three consecutive terms in k of an arithmetic sequence: k, then (harder) d or the next term. */
const apUnknown: Generator<ApUnknownParams> = {
  id: 'seq-l7-ap-unknown',
  sample: sampleApUnknown,
  choices: (params) => {
    const ans = apUnknownAnswer(params);
    const v = apUnknownValues(params);
    const d = v[1] - v[0];
    if (params.ask === 'k') return numberOptions(ans, [-ans, ans + 1, ans - 1]);
    if (params.ask === 'd') return numberOptions(ans, [-d, v[2] - v[0], d + 1]);
    return numberOptions(ans, [v[2] + 2 * d, v[2], ans - 2 * d]);
  },
  render: (params): Slide => {
    const [tail, lead] = AP_UNKNOWN_ASK[params.ask];
    return typed(
      [say(`These are the first three terms of an arithmetic sequence. ${tail}`), show(apUnknownTerms(params))],
      lead,
      apUnknownAnswer(params),
    );
  },
  solution: (params) => {
    const v = apUnknownValues(params);
    const d = v[1] - v[0];
    return [
      ...apUnknownWorking(params),
      ...(params.ask === 'k'
        ? []
        : [
            { text: `With $k = ${params.k}$ the terms are $${v.join(', \\; ')}$.` },
            { tex: chain(`d &= ${v[1]} - ${br(v[0])} = ${d}`, ...(params.ask === 'next' ? [`u_4 &= ${v[2]} ${signed(d)} = ${v[2] + d}`] : [])) },
          ]),
    ];
  },
};

/** The same, used: k, then u_1 and u_2, the difference, and u_4. */
const apUnknownTree: Generator<ApUnknownParams> = {
  id: 'seq-l7-ap-unknown-tree',
  sample: sampleApUnknown,
  render: (params): Slide => {
    const v = apUnknownValues(params);
    const d = v[1] - v[0];
    const answer = [params.k, v[0], v[1], d, v[2] + d];
    const slips = [v[2], -d, params.k + 1, v[2] + 2 * d, -params.k, v[0] + v[2]];
    return {
      kind: 'tree',
      prompt: [
        say(
          'These are the first three terms of an arithmetic sequence. Fill the tree: $k$ from $2u_2 = u_1 + u_3$, then $u_1$ and $u_2$, the common difference $d$, and $u_4$.',
        ),
      ],
      expression: apUnknownTerms(params),
      nodes: [
        { id: 'k', from: [] },
        { id: 'first', from: ['k'] },
        { id: 'second', from: ['k'] },
        { id: 'd', from: ['first', 'second'] },
        { id: 'next', from: ['d'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const v = apUnknownValues(params);
    const d = v[1] - v[0];
    return [
      ...apUnknownWorking(params),
      { text: `With $k = ${params.k}$ the terms are $${v.join(', \\; ')}$.` },
      { tex: chain(`d &= ${v[1]} - ${br(v[0])} = ${d}`, `u_4 &= ${v[2]} ${signed(d)} = ${v[2] + d}`) },
    ];
  },
};

type Cond = 'positive' | 'infinity' | 'negative';

interface GpUnknownParams {
  p: [number, number, number];
  q: [number, number, number];
  /** The root the condition allows, and the one it rules out. */
  k: number;
  other: number;
  cond: Cond;
  ask: 'k' | 'r' | 'sinf';
}

const COND_TEXT: Record<Cond, string> = {
  positive: 'all its terms are positive',
  infinity: 'it has a sum to infinity',
  negative: 'its common ratio is negative',
};

/** Why a root's terms meet the condition, or fail it. */
const COND_HOLDS: Record<Cond, string> = {
  positive: 'every term is positive',
  infinity: '$|r| < 1$ and the sum to infinity exists',
  negative: 'the ratio is negative',
};

const COND_FAILS: Record<Cond, string> = {
  positive: 'not every term is positive',
  infinity: '$|r| > 1$ and there is no sum to infinity',
  negative: 'the ratio is not negative',
};

function gpUnknownValues({ p, q }: GpUnknownParams, k: number): number[] {
  return [0, 1, 2].map((i) => termAt(p[i], q[i], k));
}

function meets(cond: Cond, v: number[]): boolean {
  const r = v[1] / v[0];
  if (cond === 'positive') return v.every((x) => x > 0);
  if (cond === 'infinity') return Math.abs(r) < 1;
  return r < 0;
}

/** Coefficients of (p2 k + q2)^2 - (p1 k + q1)(p3 k + q3) = 0. */
function gpQuadratic({ p, q }: GpUnknownParams): [number, number, number] {
  return [p[1] ** 2 - p[0] * p[2], 2 * p[1] * q[1] - p[0] * q[2] - p[2] * q[0], q[1] ** 2 - q[0] * q[2]];
}

const GP_RATIOS_EASY: [number, number][] = [[2, 1], [3, 1], [1, 2], [3, 2], [2, 3], [1, 3], [3, 4]];
const GP_RATIOS_HARD: [number, number][] = [...GP_RATIOS_EASY, [-2, 1], [-1, 2], [-3, 2], [4, 3], [-2, 3], [-1, 3]];

/**
 * Three terms in k of a geometric sequence, built from the root the question
 * wants: its terms are A, Ar, Ar^2 for a nice r, and the other root is kept
 * only when it is whole, gives a real geometric sequence, and breaks the
 * stated condition.
 */
function sampleGpUnknown(rng: Rng, difficulty: number): GpUnknownParams {
  const hard = difficulty > 1;
  for (;;) {
    const k = hard ? rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]) : rng.int(2, 12);
    const [num, den] = rng.pick(hard ? GP_RATIOS_HARD : GP_RATIOS_EASY);
    const A = den * den * rng.int(1, 4) * (hard && rng.chance(0.3) ? -1 : 1);
    const u = [A, (A * num) / den, (A * num * num) / (den * den)];
    const p: [number, number, number] = [rng.int(0, 3), rng.int(1, 2), rng.int(0, 3)];
    if (p[0] + p[2] === 0) continue;
    const q = u.map((x, i) => x - p[i] * k) as [number, number, number];
    if (q.some((x) => Math.abs(x) > 30)) continue;
    const draft: GpUnknownParams = { p, q, k, other: 0, cond: 'positive', ask: 'k' };
    const [qa, , qc] = gpQuadratic(draft);
    if (qa === 0) continue;
    const other = qc / (qa * k);
    if (!Number.isInteger(other) || other === k || Math.abs(other) > 30) continue;
    const w = gpUnknownValues(draft, other);
    if (w[0] === 0 || w[1] === 0 || Math.abs(w[1]) === Math.abs(w[0]) || w.some((x) => Math.abs(x) > 400)) continue;
    const conds: Cond[] = (hard ? (['positive', 'infinity', 'negative'] as Cond[]) : (['positive', 'infinity'] as Cond[])).filter(
      (c) => meets(c, u) && !meets(c, w),
    );
    if (conds.length === 0) continue;
    const cond = rng.pick(conds);
    const S = (A * den) / (den - num);
    const asks: GpUnknownParams['ask'][] = hard ? ['k', 'r', ...(cond === 'infinity' && Number.isInteger(S) ? ['sinf' as const] : [])] : ['k'];
    return { p, q, k, other, cond, ask: rng.pick(asks) };
  }
}

function gpUnknownTerms({ p, q }: GpUnknownParams): string {
  return [0, 1, 2].map((i) => lin(p[i], q[i])).join(', \\quad ');
}

/** r of the sequence at a root, as [num, den] in lowest terms. */
function ratioAt(params: GpUnknownParams, k: number): [number, number] {
  const v = gpUnknownValues(params, k);
  const g = gcdOrOne(v[1], v[0]);
  const s = v[0] < 0 ? -1 : 1;
  return [(s * v[1]) / g, (s * v[0]) / g];
}

/** The quadratic from u_2^2 = u_1 u_3, factorised, and the root the condition keeps. */
function gpUnknownWorking(params: GpUnknownParams): SolutionStep[] {
  const { p, q, k, other, cond } = params;
  const [A, B, C] = gpQuadratic(params);
  const g = gcd(gcd(A, B), C) * (A < 0 ? -1 : 1);
  const lead = A / g;
  const factored = `${lead === 1 ? '' : lead}(k ${signed(-k)})(k ${signed(-other)})`;
  const u = gpUnknownValues(params, k);
  const w = gpUnknownValues(params, other);
  const [rn, rd] = ratioAt(params, k);
  const [sn, sd] = ratioAt(params, other);
  const t = (i: number) => lin(p[i], q[i]);
  // A lone number or letter needs no brackets: `9(2k - 3)`, `k^2`, not `(9)(2k - 3)`, `(k)^2`.
  const bare = (i: number) => p[i] === 0 || (p[i] === 1 && q[i] === 0);
  const wrap = (i: number) => (bare(i) ? t(i) : `(${t(i)})`);
  // A number goes in front; a lone k beside a number reads as `9k`.
  const [x, y] = p[2] === 0 ? [2, 0] : [0, 2];
  const product = p[x] === 0 && bare(y) ? `${t(x)}${t(y)}` : bare(x) ? `${t(x)}(${t(y)})` : `${wrap(x)}${wrap(y)}`;
  return [
    { text: 'In a geometric sequence the middle term squared is the product of the other two: $u_2^2 = u_1u_3$.' },
    {
      tex: chain(
        `${bare(1) ? t(1) : `(${t(1)})`}^2 &= ${product}`,
        `${quad(p[1] ** 2, 2 * p[1] * q[1], q[1] ** 2)} &= ${quad(p[0] * p[2], p[0] * q[2] + p[2] * q[0], q[0] * q[2])}`,
        `${quad(A / g, B / g, C / g)} &= 0`,
        `${factored} &= 0`,
      ),
    },
    {
      text: `So $k = ${k}$ or $k = ${other}$. With $k = ${other}$ the terms are $${w.join(', \\; ')}$ and $r = ${fracTex(sn, sd)}$, so ${COND_FAILS[cond]}.`,
    },
    { text: `With $k = ${k}$ they are $${u.join(', \\; ')}$ and $r = ${fracTex(rn, rd)}$, which fits. So $k = ${k}$.` },
  ];
}

const GP_UNKNOWN_ASK = {
  k: ['Find $k$.', 'k ='],
  r: ['Find the common ratio $r$.', 'r ='],
  sinf: ['Find its sum to infinity.', 'S_\\infty ='],
} as const;

function gpUnknownPrompt(params: GpUnknownParams, tail: string): Block[] {
  return [say(`These are three consecutive terms of a geometric sequence, and ${COND_TEXT[params.cond]}. ${tail}`), show(gpUnknownTerms(params))];
}

/** Three terms in k of a geometric sequence: the valid root, then (harder) r or the sum to infinity. */
const gpUnknown: Generator<GpUnknownParams> = {
  id: 'seq-l7-gp-unknown',
  sample: sampleGpUnknown,
  choices: (params) => {
    const { k, other, ask } = params;
    if (ask === 'k') return numberOptions(k, [other, -k, -other]);
    const [rn, rd] = ratioAt(params, k);
    const [sn, sd] = ratioAt(params, other);
    if (ask === 'r') return fracOptions([rn, rd], [[sn, sd], [rd, rn], [-rn, rd]]);
    const u = gpUnknownValues(params, k);
    const S = (u[0] * rd) / (rd - rn);
    return numberOptions(S, [(u[0] * rd) / (rd + rn), u[0] + u[1] + u[2], (u[1] * rd) / (rd - rn)]);
  },
  render: (params): Slide => {
    const [tail, lead] = GP_UNKNOWN_ASK[params.ask];
    const prompt = gpUnknownPrompt(params, tail);
    if (params.ask === 'k') return typed(prompt, lead, params.k);
    const [rn, rd] = ratioAt(params, params.k);
    if (params.ask === 'r') return typed(prompt, lead, fracAnswer(rn, rd), FRACTION_KEYS);
    const u = gpUnknownValues(params, params.k);
    return typed(prompt, lead, (u[0] * rd) / (rd - rn));
  },
  solution: (params) => {
    const [rn, rd] = ratioAt(params, params.k);
    const u = gpUnknownValues(params, params.k);
    return [
      ...gpUnknownWorking(params),
      ...(params.ask === 'sinf'
        ? [{ tex: `S_\\infty = \\frac{${u[0]}}{1 - ${brFrac(rn, rd)}} = ${(u[0] * rd) / (rd - rn)}` }]
        : []),
    ];
  },
};

/** Set up u_2^2 = u_1u_3 (or 2u_2 = u_1 + u_3 when easier) and pick the root. */
type MiddleParams = { kind: 'ap'; ap: ApUnknownParams } | { kind: 'gp'; gp: GpUnknownParams };

const middleTiles: Generator<MiddleParams> = {
  id: 'seq-l7-middle-tiles',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { kind: 'gp', gp: { ...sampleGpUnknown(rng, difficulty), ask: 'k' } }
      : { kind: 'ap', ap: { ...sampleApUnknown(rng, 1), ask: 'k' } },
  render: (params): Slide => {
    if (params.kind === 'ap') {
      const { ap } = params;
      const { p, q, k } = ap;
      const answer = [lin(p[1], q[1]), lin(p[0] + p[2], q[0] + q[2]), `${k}`];
      const slips = [lin(p[0], q[0]), lin(p[2], q[2]), lin(p[0] + p[1], q[0] + q[1]), lin(p[0] - p[2], q[0] - q[2]), `${-k}`, `${k + 1}`];
      return {
        kind: 'tiles',
        prompt: [say('These are the first three terms of an arithmetic sequence. Complete $2u_2 = u_1 + u_3$, then find $k$.'), show(apUnknownTerms(ap))],
        template: '2({0}) = {1} \\qquad k = {2}',
        bank: tileBank(answer, slips),
        answer,
      };
    }
    const { gp } = params;
    const { p, q, k, other } = gp;
    const answer = [lin(p[1], q[1]), quad(p[0] * p[2], p[0] * q[2] + p[2] * q[0], q[0] * q[2]), `${k}`];
    const slips = [
      lin(p[0], q[0]),
      lin(p[2], q[2]),
      quad(p[0] * p[2], 0, q[0] * q[2]),
      lin(p[0] + p[2], q[0] + q[2]),
      `${other}`,
      `${-k}`,
    ];
    return {
      kind: 'tiles',
      prompt: gpUnknownPrompt(gp, 'Complete $u_2^2 = u_1u_3$, then give the $k$ the question allows.'),
      template: '({0})^2 = {1} \\qquad k = {2}',
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: (params) => (params.kind === 'ap' ? apUnknownWorking(params.ap) : gpUnknownWorking(params.gp)),
};

/** Which rule links the terms, then which root the condition allows. */
const rootFlow: Generator<GpUnknownParams> = {
  id: 'seq-l7-root-flow',
  sample: (rng, difficulty) => ({ ...sampleGpUnknown(rng, difficulty), ask: 'k' }),
  render: (params): Slide => {
    const { k, other, cond } = params;
    const [lo, hi] = [k, other].sort((x, y) => x - y);
    const u = gpUnknownValues(params, k);
    const w = gpUnknownValues(params, other);
    const [rn, rd] = ratioAt(params, k);
    const [sn, sd] = ratioAt(params, other);
    const outcome = (root: number) =>
      root === k
        ? `With $k = ${k}$ the terms are $${u.join(', \\; ')}$ with $r = ${fracTex(rn, rd)}$, so ${COND_HOLDS[cond]}.`
        : `With $k = ${other}$ the terms are $${w.join(', \\; ')}$ with $r = ${fracTex(sn, sd)}$, so ${COND_FAILS[cond]}.`;
    return {
      kind: 'flow',
      prompt: [say(`These are three consecutive terms of a geometric sequence, and ${COND_TEXT[cond]}.`)],
      subject: gpUnknownTerms(params),
      steps: [
        {
          id: 'rule',
          ask: 'Which equation links the three terms?',
          branches: [
            { label: '$u_2^2 = u_1u_3$', to: 'pick' },
            { label: '$2u_2 = u_1 + u_3$', outcome: 'That is the arithmetic rule: the middle term as a mean. A geometric sequence multiplies, so $u_2^2 = u_1u_3$.' },
            { label: '$u_2 = u_1u_3$', outcome: 'The ratios agree, $\\frac{u_2}{u_1} = \\frac{u_3}{u_2}$, and cross-multiplying squares the middle term: $u_2^2 = u_1u_3$.' },
          ],
        },
        {
          id: 'pick',
          ask: `It solves to $k = ${lo}$ or $k = ${hi}$. Which does the question allow?`,
          branches: [
            { label: `$k = ${lo}$`, outcome: outcome(lo) },
            { label: `$k = ${hi}$`, outcome: outcome(hi) },
            { label: 'Both', outcome: 'Check each root: only one of them meets the condition in the question.' },
          ],
        },
      ],
      answer: ['$u_2^2 = u_1u_3$', `$k = ${k}$`],
    };
  },
  solution: gpUnknownWorking,
};

/* ---------- Lesson 4: geometric conditions ---------- */

const CONVERGING: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 5], [4, 5]];
const CONVERGING_NEG: [number, number][] = [[-1, 2], [-1, 3], [-2, 3], [-1, 4], [-3, 4], [-2, 5], [-3, 5]];

interface InfRatioParams {
  mode: 'given' | 'times';
  num: number;
  den: number;
  /** The first term is m(den - num), the sum to infinity m den. */
  m: number;
}

/** The ratio from the sum to infinity: given with the first term, or as a multiple of it. */
const infRatio: Generator<InfRatioParams> = {
  id: 'seq-l7-inf-ratio',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [num, den] = rng.pick(hard ? [...CONVERGING, ...CONVERGING_NEG] : CONVERGING);
    const whole = (den - num) === 1;
    const mode = rng.chance(0.4) && (hard || whole) ? 'times' : 'given';
    return { mode, num, den, m: rng.int(2, 15) };
  },
  choices: ({ num, den }) => fracOptions([num, den], [[den - num, den], [-num, den], [den, den - num]]),
  render: ({ mode, num, den, m }): Slide => {
    const a = m * (den - num);
    const S = m * den;
    const prompt =
      mode === 'given'
        ? say(`A geometric series has first term $${a}$ and sum to infinity $${S}$. Find its common ratio $r$.`)
        : say(`The sum to infinity of a geometric series is $${fracTex(den, den - num)}$ times its first term. Find its common ratio $r$.`);
    return typed([prompt], 'r =', fracAnswer(num, den), FRACTION_KEYS);
  },
  solution: ({ mode, num, den, m }) => {
    const a = m * (den - num);
    const S = m * den;
    if (mode === 'given') {
      return [{ tex: chain(`\\frac{${a}}{1 - r} &= ${S}`, `1 - r &= ${fracTex(a, S)}`, `r &= ${fracTex(num, den)}`) }];
    }
    const M = fracTex(den, den - num);
    return [
      { text: 'Write the fact with $S_\\infty = \\frac{a}{1 - r}$. The $a$ cancels, so the first term is never needed.' },
      { tex: chain(`\\frac{a}{1 - r} &= ${M}a`, `\\frac{1}{1 - r} &= ${M}`, `1 - r &= ${fracTex(den - num, den)}`, `r &= ${fracTex(num, den)}`) },
    ];
  },
};

interface InfSecondParams {
  /** The ratio of the series asked about. */
  num: number;
  den: number;
  m: number;
  ask: 'r' | 'a';
}

/** S = den^2 m and u_2 = num (den - num) m, so S r(1 - r) = u_2 is m(den r - num)(den r - (den - num)) = 0. */
const infSum = ({ den, m }: InfSecondParams) => den * den * m;
const infSecond = ({ num, den, m }: InfSecondParams) => num * (den - num) * m;
const infFirst = ({ num, den, m }: InfSecondParams) => den * (den - num) * m;

function infSecondWorking(params: InfSecondParams): SolutionStep[] {
  const { num, den } = params;
  const S = infSum(params);
  const v = infSecond(params);
  const [r1, r2]: [number, number][] = [[num, den], [den - num, den]];
  const valid = num < 0 ? `Only $|r| < 1$ gives a sum to infinity, so $r = ${fracTex(num, den)}$.` : 'Both have $|r| < 1$, so both give a series.';
  return [
    { text: `The second term is $ar = ${v}$, so $a = ${overR(v)}$. Put that into $S_\\infty = \\frac{a}{1 - r}$.` },
    {
      tex: chain(
        `${overR(v, 'r(1 - r)')} &= ${S}`,
        `${S}r - ${S}r^2 &= ${v}`,
        `${quad(den * den, -den * den, num * (den - num), 'r')} &= 0`,
        `(${lin(den, -num, 'r')})(${lin(den, num - den, 'r')}) &= 0`,
      ),
    },
    { text: `So $r = ${fracTex(...r1)}$ or $r = ${fracTex(...r2)}$. ${valid}` },
  ];
}

function sampleInf(rng: Rng, difficulty: number, sign: 'negative' | 'any'): InfSecondParams {
  const hard = difficulty > 1;
  const negatives: [number, number][] = hard ? [[-1, 2], [-1, 3], [-2, 3], [-1, 4], [-3, 4], [-2, 5], [-1, 5]] : [[-1, 2], [-1, 3], [-1, 4], [-2, 3], [-1, 5]];
  const positives: [number, number][] = [[1, 3], [1, 4], [1, 5], [2, 5], [1, 6]];
  const pool = sign === 'any' && hard && rng.chance(0.5) ? positives : negatives;
  const [num, den] = rng.pick(pool);
  return { num, den, m: rng.int(1, den > 3 ? 4 : 8), ask: hard && rng.chance(0.5) ? 'a' : 'r' };
}

/** The sum to infinity and the second term: a quadratic in r, keeping the root with |r| < 1. */
const infSecondGen: Generator<InfSecondParams> = {
  id: 'seq-l7-inf-second',
  sample: (rng, difficulty) => sampleInf(rng, difficulty, 'negative'),
  choices: (params) => {
    const { num, den, ask } = params;
    if (ask === 'r') return fracOptions([num, den], [[den - num, den], [-num, den], [num, den - num]]);
    const a = infFirst(params);
    const v = infSecond(params);
    return numberOptions(a, [v, -a, (v * den) / (den - num), a * 2]);
  },
  render: (params): Slide => {
    const prompt = [
      say(
        `A geometric series has sum to infinity $${infSum(params)}$ and second term $${infSecond(params)}$. Find ${params.ask === 'r' ? 'its common ratio $r$' : 'its first term $a$'}.`,
      ),
    ];
    return params.ask === 'r'
      ? typed(prompt, 'r =', fracAnswer(params.num, params.den), FRACTION_KEYS)
      : typed(prompt, 'a =', infFirst(params));
  },
  solution: (params) => [
    ...infSecondWorking(params),
    ...(params.ask === 'a' ? [{ tex: `a = ${infSecond(params)} \\div ${brFrac(params.num, params.den)} = ${infFirst(params)}` }] : []),
  ],
};

/** The same set-up as a walk: which equation, then which root, or both. */
const infFlow: Generator<InfSecondParams> = {
  id: 'seq-l7-inf-flow',
  sample: (rng, difficulty) => ({ ...sampleInf(rng, difficulty, 'any'), ask: 'r' }),
  render: (params): Slide => {
    const { num, den } = params;
    const S = infSum(params);
    const v = infSecond(params);
    const roots: [number, number][] = [[num, den], [den - num, den]];
    roots.sort((x, y) => x[0] / x[1] - y[0] / y[1]);
    const label = ([p, q]: [number, number]) => `$r = ${fracTex(p, q)}$`;
    const say1 = ([p, q]: [number, number]) =>
      Math.abs(p / q) < 1
        ? `With $r = ${fracTex(p, q)}$, $|r| < 1$ and the first term is $${v} \\div ${brFrac(p, q)} = ${(v * q) / p}$.`
        : `With $r = ${fracTex(p, q)}$, $|r| > 1$: the sum to infinity would not exist.`;
    const both = num > 0;
    return {
      kind: 'flow',
      prompt: [say('A geometric series has this sum to infinity and second term. Find its common ratio.')],
      subject: `S_\\infty = ${S}, \\quad u_2 = ${v}`,
      steps: [
        {
          id: 'equation',
          ask: `Put $a = ${overR(v)}$ into $S_\\infty = \\frac{a}{1 - r}$. Which equation does $r$ satisfy?`,
          branches: [
            { label: `$${S}r(1 - r) = ${v}$`, to: 'roots' },
            { label: `$${S}(1 - r) = ${v}$`, outcome: `That takes $${v}$ as the first term. The second term is $ar$, so $a = ${overR(v)}$.` },
            { label: `$${v}r = ${S}(1 - r)$`, outcome: `That multiplies by $r$ where it should divide: $a = ${overR(v)}$ puts $r$ under the $${v}$.` },
          ],
        },
        {
          id: 'roots',
          ask: `It solves to ${label(roots[0])} or ${label(roots[1])}. Which can the series have?`,
          branches: [
            { label: label(roots[0]), outcome: both ? 'The other root has $|r| < 1$ as well, so it gives a series too.' : say1(roots[0]) },
            { label: label(roots[1]), outcome: both ? 'The other root has $|r| < 1$ as well, so it gives a series too.' : say1(roots[1]) },
            {
              label: 'Both',
              outcome: both
                ? `Both have $|r| < 1$: two different series fit, with first terms $${(v * roots[0][1]) / roots[0][0]}$ and $${(v * roots[1][1]) / roots[1][0]}$.`
                : 'One root has $|r| > 1$, and then the series has no sum to infinity.',
            },
          ],
        },
      ],
      answer: [`$${S}r(1 - r) = ${v}$`, both ? 'Both' : label([num, den])],
    };
  },
  solution: infSecondWorking,
};

interface SumRatioParams {
  a: number;
  r: number;
  n: number;
  ask: 'r' | 'a' | 'term';
}

const gpSum = (a: number, r: number, n: number) => (a * (r ** n - 1)) / (r - 1);

function sampleSumRatio(rng: Rng, difficulty: number): SumRatioParams {
  const hard = difficulty > 1;
  for (;;) {
    const n = rng.int(2, hard ? 5 : 4);
    const r = hard ? rng.pick([2, 3, 4, -2, -3]) : rng.pick([2, 3, 4, 5]);
    if (Math.abs(r) ** n > 300) continue;
    return { a: hard ? rng.pick([1, 2, 3, 4, 5, 6, -1, -2, -3]) : rng.int(1, 6), r, n, ask: hard ? rng.pick(['a', 'term']) : 'r' };
  }
}

function sumRatioTold({ r, n }: SumRatioParams): string {
  if (n % 2 === 1) return '';
  return r > 0 ? ' Its common ratio is positive.' : ' Its common ratio is negative.';
}

function sumRatioSolution(params: SumRatioParams): SolutionStep[] {
  const { a, r, n, ask } = params;
  const X = gpSum(a, r, n);
  const Y = gpSum(a, r, 2 * n);
  const root = n % 2 === 0 ? `An even power: $r = \\pm ${Math.abs(r)}$, and the ratio is ${r > 0 ? 'positive' : 'negative'}, so $r = ${r}$.` : `An odd power has one real root: $r = ${r}$.`;
  return [
    { text: `Terms $${n + 1}$ to $${2 * n}$ are the first $${n}$ terms each multiplied by $r^{${n}}$, so $S_{${2 * n}} = S_{${n}}(1 + r^{${n}})$.` },
    { tex: chain(`1 + r^{${n}} &= \\frac{${Y}}{${X}} = ${Y / X}`, `r^{${n}} &= ${r ** n}`) },
    { text: root },
    ...(ask === 'r'
      ? []
      : [
          { tex: chain(`\\frac{a(${powTex(r, n)} - 1)}{${r} - 1} &= ${X}`, `${fracTex(r ** n - 1, r - 1)}a &= ${X}`, `a &= ${a}`) },
          ...(ask === 'term' ? [{ tex: `u_{${n + 1}} = ${a} \\times ${powTex(r, n)} = ${a * r ** n}` }] : []),
        ]),
  ];
}

function sumRatioAsk(ask: SumRatioParams['ask'], n: number): [string, string] {
  if (ask === 'r') return ['Find its common ratio $r$.', 'r ='];
  if (ask === 'a') return ['Find its first term $a$.', 'a ='];
  return [`Find $u_{${n + 1}}$.`, `u_{${n + 1}} =`];
}

function sumRatioAnswer({ a, r, n, ask }: SumRatioParams): number {
  if (ask === 'r') return r;
  if (ask === 'a') return a;
  return a * r ** n;
}

/** S_2n / S_n = 1 + r^n: the ratio from two sums, then a or a term. */
const sumRatio: Generator<SumRatioParams> = {
  id: 'seq-l7-sum-ratio',
  sample: sampleSumRatio,
  choices: (params) => {
    const ans = sumRatioAnswer(params);
    const { a, r, n } = params;
    return numberOptions(ans, [-ans, params.ask === 'r' ? r ** n : a * r ** (n - 1), ans * r, ans + 1]);
  },
  render: (params): Slide => {
    const { a, r, n, ask } = params;
    const [tail, lead] = sumRatioAsk(ask, n);
    return typed(
      [say(`A geometric series has $S_{${n}} = ${gpSum(a, r, n)}$ and $S_{${2 * n}} = ${gpSum(a, r, 2 * n)}$.${sumRatioTold(params)} ${tail}`)],
      lead,
      sumRatioAnswer(params),
    );
  },
  solution: sumRatioSolution,
};

/** The same as a tree: the ratio of the sums, r^n, r, then a. */
const sumRatioTree: Generator<SumRatioParams> = {
  id: 'seq-l7-sum-ratio-tree',
  sample: (rng, difficulty) => ({ ...sampleSumRatio(rng, difficulty), ask: 'a' }),
  render: (params): Slide => {
    const { a, r, n } = params;
    const X = gpSum(a, r, n);
    const Y = gpSum(a, r, 2 * n);
    const answer = [Y / X, r ** n, r, a];
    const slips = [Y - X, r ** n - 1, -r, n, -a, a * r, r * n];
    return {
      kind: 'tree',
      prompt: [
        say(
          `A geometric series has $S_{${n}} = ${X}$ and $S_{${2 * n}} = ${Y}$.${sumRatioTold(params)} Fill the tree: $\\frac{S_{${2 * n}}}{S_{${n}}}$, then $r^{${n}}$, $r$ and $a$.`,
        ),
      ],
      expression: `S_{${n}} = ${X}, \\quad S_{${2 * n}} = ${Y}`,
      nodes: [
        { id: 'quotient', from: [] },
        { id: 'power', from: ['quotient'] },
        { id: 'r', from: ['power'] },
        { id: 'a', from: ['r'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: sumRatioSolution,
};

/* ---------- Lesson 5: the least n ---------- */

type LeastMode = 'sum' | 'grow' | 'decay' | 'last';

interface LeastParams {
  mode: LeastMode;
  a: number;
  num: number;
  den: number;
  /** The value passed. */
  X: number;
}

const GROW_EASY: [number, number][] = [[2, 1], [3, 1]];
const GROW_HARD: [number, number][] = [[3, 2], [6, 5], [11, 10], [5, 4], [2, 1], [3, 1]];
const DECAY: [number, number][] = [[4, 5], [9, 10], [3, 4], [3, 5], [1, 2], [7, 10]];

const rOf = ({ num, den }: LeastParams) => num / den;
const rTex = (params: LeastParams) => `${rOf(params)}`;

/** What r^n (or r^(n-1)) has to pass: a whole number growing, 1/Y decaying. */
function leastTarget(params: LeastParams): number {
  const { mode, a, X } = params;
  const r = rOf(params);
  if (mode === 'sum') return Math.round(1 + (X * (r - 1)) / a);
  return X / a;
}

/** The logarithm quotient, and the n it gives. */
function leastSolve(params: LeastParams): { x: number; n: number } {
  const x = Math.log(leastTarget(params)) / Math.log(rOf(params));
  const { mode } = params;
  if (mode === 'sum') return { x, n: Math.floor(x) + 1 };
  if (mode === 'last') return { x, n: Math.floor(x) + 1 };
  return { x, n: Math.floor(x) + 2 };
}

/** S_n, or u_n, for the check line. */
function leastValue(params: LeastParams, n: number): number {
  const r = rOf(params);
  return params.mode === 'sum' ? (params.a * (r ** n - 1)) / (r - 1) : params.a * r ** (n - 1);
}

function leastPasses(params: LeastParams, n: number): boolean {
  const v = leastValue(params, n);
  return params.mode === 'sum' || params.mode === 'grow' ? v > params.X : params.mode === 'decay' ? v < params.X : v > params.X;
}

function sampleLeast(rng: Rng, difficulty: number, modes: LeastMode[]): LeastParams {
  const hard = difficulty > 1;
  for (;;) {
    const mode = rng.pick(modes);
    let params: LeastParams;
    if (mode === 'sum' || mode === 'grow') {
      const [num, den] = rng.pick(hard ? GROW_HARD : GROW_EASY);
      const big = num / den >= 2;
      const a = big ? rng.int(1, 20) : rng.int(2, 60);
      const Y = big ? rng.int(20, 5000) : rng.int(3, 60);
      const X = mode === 'sum' ? (a * (Y - 1) * den) / (num - den) : a * Y;
      if (!Number.isInteger(X)) continue;
      params = { mode, a, num, den, X };
    } else {
      const [num, den] = rng.pick(DECAY);
      const X = rng.pick([1, 2, 5, 10]);
      params = { mode, a: X * rng.int(10, 600), num, den, X };
    }
    const { x, n } = leastSolve(params);
    if (x < 3 || x > 45 || !offWhole(x) || params.X > 1e7) continue;
    // The logs agree with the terms themselves, checked directly on each side.
    const least = mode !== 'last';
    if (least && !(leastPasses(params, n) && !leastPasses(params, n - 1))) continue;
    if (!least && !(leastPasses(params, n) && !leastPasses(params, n + 1))) continue;
    return params;
  }
}

const LEAST_ASK: Record<LeastMode, (X: number) => string> = {
  sum: (X) => `Find the least $n$ for which $S_n > ${X}$.`,
  grow: (X) => `Find the least $n$ for which $u_n > ${X}$.`,
  decay: (X) => `Find the least $n$ for which $u_n < ${X}$.`,
  last: (X) => `Find the largest $n$ for which $u_n > ${X}$.`,
};

function leastPrompt(params: LeastParams): Block[] {
  const kind = params.mode === 'sum' ? 'series' : 'sequence';
  return [say(`A geometric ${kind} has first term $${params.a}$ and common ratio $${rTex(params)}$. ${LEAST_ASK[params.mode](params.X)}`)];
}

/** The power of r, and what it is compared with: `2^n > 801`, `0.8^{n-1} < \frac{1}{400}`. */
function leastInequality(params: LeastParams): { power: string; sign: string; target: string } {
  const r = rTex(params);
  if (params.mode === 'sum') return { power: `${r}^n`, sign: '>', target: `${leastTarget(params)}` };
  const target = fracTex(params.X, params.a);
  return { power: `${r}^{n-1}`, sign: params.mode === 'decay' ? '<' : '>', target };
}

function leastSolution(params: LeastParams): SolutionStep[] {
  const { mode, a, X } = params;
  const r = rTex(params);
  const { x, n } = leastSolve(params);
  const { power, sign, target } = leastInequality(params);
  const lhs = mode === 'sum' ? 'n' : 'n - 1';
  const growing = mode === 'sum' || mode === 'grow';
  const setUp =
    mode === 'sum'
      ? rOf(params) - 1 === 1
        ? gathered(`${a}(${r}^n - 1) > ${X}`, `${r}^n > ${target}`)
        : gathered(`\\frac{${a}(${r}^n - 1)}{${Number((rOf(params) - 1).toFixed(4))}} > ${X}`, `${r}^n - 1 > ${leastTarget(params) - 1}`, `${r}^n > ${target}`)
      : gathered(`${a} \\times ${power} ${sign} ${X}`, `${power} ${sign} ${target}`);
  const flips = !growing;
  const newSign = flips ? (sign === '>' ? '<' : '>') : sign;
  const lnTarget = target.includes('frac') ? `\\ln\\left(${target}\\right)` : `\\ln ${target}`;
  const name = mode === 'sum' ? 'S' : 'u';
  const before = mode === 'last' ? n + 1 : n - 1;
  const word = mode === 'last' ? 'largest' : 'least';
  return [
    { tex: setUp },
    {
      text: flips
        ? `Take logs. $\\ln ${r}$ is negative, so dividing by it flips the inequality.`
        : `Take logs. $\\ln ${r}$ is positive, so the inequality keeps its direction.`,
    },
    { tex: gathered(`${lhs} ${newSign} \\frac{${lnTarget}}{\\ln ${r}}`, `${lhs} ${newSign} ${x.toFixed(2)}`) },
    {
      text: mode === 'last' ? `The ${word} whole $n$ is $${n}$. Check: $${name}_{${n}} ${approx(leastValue(params, n))}$ is still above $${X}$, and $${name}_{${before}} ${approx(leastValue(params, before))}$ is not.` : `The ${word} whole $n$ is $${n}$. Check: $${name}_{${before}} ${approx(leastValue(params, before))}$ has not yet passed $${X}$, and $${name}_{${n}} ${approx(leastValue(params, n))}$ has.`,
    },
  ];
}

/** The least n for which a geometric sum or term passes a value, by logs. */
const leastGp: Generator<LeastParams> = {
  id: 'seq-l7-least-gp',
  sample: (rng, difficulty) => sampleLeast(rng, difficulty, difficulty > 1 ? ['sum', 'grow', 'decay'] : ['sum', 'grow']),
  choices: (params) => {
    const { x, n } = leastSolve(params);
    return numberOptions(n, [n - 1, n + 1, Math.floor(x), Math.floor(x) + 2]);
  },
  render: (params): Slide => typed(leastPrompt(params), 'n =', leastSolve(params).n),
  solution: leastSolution,
};

/** Rearranged to a power of r against a number, then the least n. */
const logTiles: Generator<LeastParams> = {
  id: 'seq-l7-log-tiles',
  sample: (rng, difficulty) => sampleLeast(rng, difficulty, difficulty > 1 ? ['sum', 'decay'] : ['sum']),
  render: (params): Slide => {
    const { mode, a, X } = params;
    const r = rTex(params);
    const { n } = leastSolve(params);
    const { power, sign, target } = leastInequality(params);
    const answer = [power, target, `${n}`];
    const slips =
      mode === 'sum'
        ? [`${r}^{n-1}`, `${leastTarget(params) - 1}`, `${leastTarget(params) + 1}`, `${n - 1}`, `${n + 1}`]
        : [`${r}^n`, fracTex(a, X), `${n - 1}`, `${n + 1}`];
    return {
      kind: 'tiles',
      prompt: [...leastPrompt(params), say(`Rearrange to a power of $${r}$ against a number, then give $n$.`)],
      template: `{0} ${sign} {1} \\qquad n = {2}`,
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: leastSolution,
};

/** Take logs: which sign is ln r, which way the inequality goes, and which n that makes. */
const flipFlow: Generator<LeastParams> = {
  id: 'seq-l7-flip-flow',
  sample: (rng, difficulty) => sampleLeast(rng, difficulty, difficulty > 1 ? ['grow', 'decay', 'last'] : ['sum', 'decay']),
  render: (params): Slide => {
    const { mode } = params;
    const r = rTex(params);
    const { x, n } = leastSolve(params);
    const { power, sign, target } = leastInequality(params);
    const growing = mode === 'sum' || mode === 'grow';
    const lhs = mode === 'sum' ? 'n' : 'n - 1';
    const newSign = growing ? sign : sign === '>' ? '<' : '>';
    const xs = x.toFixed(2);
    const right = `$${lhs} ${newSign} ${xs}$`;
    const wrong = `$${lhs} ${newSign === '>' ? '<' : '>'} ${xs}$`;
    const least = mode !== 'last';
    const fits = (c: number) => {
      const value = mode === 'sum' ? c : c - 1;
      return newSign === '>' ? value > x : value < x;
    };
    const outcome = (c: number) => {
      if (c === n) return `Yes: $n = ${n}$ is the ${least ? 'least' : 'largest'} whole number that fits.`;
      if (!fits(c)) return mode === 'sum' ? `$n = ${c}$ does not satisfy $n ${newSign} ${xs}$.` : `With $n = ${c}$, $n - 1 = ${c - 1}$, which does not satisfy $n - 1 ${newSign} ${xs}$.`;
      return `$n = ${c}$ fits, but $n = ${n}$ fits too and is ${least ? 'smaller' : 'larger'}.`;
    };
    const candidates = [n - 1, n, n + 1];
    return {
      kind: 'flow',
      prompt: [...leastPrompt(params), say('It comes down to the inequality below.')],
      subject: `${power} ${sign} ${target}`,
      steps: [
        {
          id: 'sign',
          ask: `Take logs of both sides. What sign is $\\ln ${r}$?`,
          branches: [
            { label: 'Positive', to: 'divide' },
            { label: 'Negative', to: 'divide' },
          ],
        },
        {
          id: 'divide',
          ask: `Divide both sides by $\\ln ${r}$. Which inequality follows?`,
          branches: (newSign === '>' ? [right, wrong] : [wrong, right]).map((label) => ({ label, to: 'round' })),
        },
        {
          id: 'round',
          ask: `So which $n$ does the question want?`,
          branches: candidates.map((c) => ({ label: `$n = ${c}$`, outcome: outcome(c) })),
        },
      ],
      answer: [growing ? 'Positive' : 'Negative', right, `$n = ${n}$`],
    };
  },
  solution: leastSolution,
};

interface LeastApParams {
  a: number;
  d: number;
  X: number;
}

/** The positive root of d n^2 + (2a - d) n - 2X = 0. */
function apRoot({ a, d, X }: LeastApParams): number {
  const B = 2 * a - d;
  return (-B + Math.sqrt(B * B + 8 * d * X)) / (2 * d);
}

function sampleLeastAp(rng: Rng, difficulty: number): LeastApParams {
  const hard = difficulty > 1;
  for (;;) {
    const params = {
      a: hard ? nonZeroInt(rng, -20, 40) : nonZeroInt(rng, 1, 20),
      d: hard ? rng.int(2, 15) : rng.int(2, 8),
      X: hard ? rng.int(20, 500) * 10 : rng.int(10, 100) * 10,
    };
    const x = apRoot(params);
    const n = Math.floor(x) + 1;
    if (x < 4 || x > 60 || !offWhole(x)) continue;
    if (!(apSum(params.a, params.d, n) > params.X && apSum(params.a, params.d, n - 1) < params.X)) continue;
    return params;
  }
}

function leastApSolution(params: LeastApParams): SolutionStep[] {
  const { a, d, X } = params;
  const B = 2 * a - d;
  const g = gcd(gcd(d, B), 2 * X);
  const [A1, B1, C1] = [d / g, B / g, (-2 * X) / g];
  const x = apRoot(params);
  const n = Math.floor(x) + 1;
  const disc = B1 * B1 - 4 * A1 * C1;
  const top = B1 === 0 ? `\\sqrt{${disc}}` : `${-B1} + \\sqrt{${disc}}`;
  return [
    {
      tex: gathered(
        `\\tfrac{n}{2}(${2 * a} + ${d}(n - 1)) > ${X}`,
        `n(${lin(d, B, 'n')}) > ${2 * X}`,
        `${quad(A1, B1, C1, 'n')} > 0`,
      ),
    },
    { text: 'The quadratic is negative between its roots and positive beyond the larger one, so find that root.' },
    { tex: gathered(`n = \\frac{${top}}{${2 * A1}}`, `n \\approx ${x.toFixed(2)}`) },
    {
      text: `So the least whole $n$ is $${n}$. Check: $S_{${n - 1}} = ${apSum(a, d, n - 1)}$, not yet above $${X}$, and $S_{${n}} = ${apSum(a, d, n)}$.`,
    },
  ];
}

/** The least n for which an arithmetic sum passes a value: a quadratic inequality, then the next whole n. */
const leastAp: Generator<LeastApParams> = {
  id: 'seq-l7-least-ap',
  sample: sampleLeastAp,
  choices: (params) => {
    const x = apRoot(params);
    const n = Math.floor(x) + 1;
    return numberOptions(n, [n - 1, n + 1, n + 2]);
  },
  render: ({ a, d, X }): Slide =>
    typed([say(`An arithmetic series has first term $${a}$ and common difference $${d}$. Find the least $n$ for which $S_n > ${X}$.`)], 'n =', Math.floor(apRoot({ a, d, X })) + 1),
  solution: leastApSolution,
};

interface LeastTableParams {
  kind: 'ap' | 'gp';
  a: number;
  step: number;
  /** The least n. */
  n: number;
  X: number;
  /** First row's n. */
  from: number;
  /** Row indices (0-3) whose sum is blank. */
  blanks: number[];
}

function tableSum({ kind, a, step }: LeastTableParams, n: number): number {
  return kind === 'ap' ? apSum(a, step, n) : gpSum(a, step, n);
}

/** Running sums near the target: fill the sums, then the least n. */
const leastTable: Generator<LeastTableParams> = {
  id: 'seq-l7-least-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const kind = hard && rng.chance(0.6) ? 'ap' : 'gp';
      const a = kind === 'ap' ? rng.int(1, 30) : rng.int(1, 9);
      const step = kind === 'ap' ? rng.int(2, 12) : rng.pick([2, 3]);
      const n = kind === 'ap' ? rng.int(5, 15) : rng.int(4, step === 3 ? 7 : 10);
      const draft = { kind, a, step, n, X: 0, from: 0, blanks: [] } as LeastTableParams;
      const lo = tableSum(draft, n - 1);
      const hi = tableSum(draft, n);
      if (hi - lo < 4) continue;
      const X = rng.int(lo + 1, hi - 1);
      const from = n - rng.int(1, 2);
      const blanks = rng.sample([0, 1, 2, 3], hard ? 3 : 2).sort((x, y) => x - y);
      return { ...draft, X, from, blanks };
    }
  },
  render: (params): Slide => {
    const { kind, a, step, n, X, from, blanks } = params;
    const ns = [0, 1, 2, 3].map((i) => from + i);
    const sums = ns.map((m) => tableSum(params, m));
    const answer = [...blanks.map((i) => sums[i]), n];
    const term = (m: number) => (kind === 'ap' ? a + (m - 1) * step : a * step ** (m - 1));
    const slips = [n - 1, n + 1, tableSum(params, from - 1), tableSum(params, from + 4), ...blanks.map((i) => term(ns[i]))];
    const first = [1, 2, 3].map(term);
    return {
      kind: 'table',
      prompt: [
        say(`Fill in the sums of this ${kind === 'ap' ? 'arithmetic' : 'geometric'} series, then the least $n$ for which $S_n > ${X}$.`),
        show(`${first.join(' + ')} + \\dots`),
      ],
      columns: ['n', 'S_n'],
      rows: [...ns.map((m, i) => [`${m}`, blanks.includes(i) ? null : `${sums[i]}`]), ['\\text{least } n', null]],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { kind, a, step, n, X, from } = params;
    const ns = [0, 1, 2, 3].map((i) => from + i);
    const line = (m: number) =>
      kind === 'ap'
        ? `S_{${m}} &= ${half(m)}(${2 * a} + ${m - 1} \\times ${step}) = ${tableSum(params, m)}`
        : `S_{${m}} &= ${step === 2 ? `${a}(2^{${m}} - 1)` : `\\frac{${a}(3^{${m}} - 1)}{2}`} = ${tableSum(params, m)}`;
    return [
      { text: kind === 'ap' ? `Here $a = ${a}$ and $d = ${step}$, so $S_n = \\frac{n}{2}(2a + (n - 1)d)$.` : `Here $a = ${a}$ and $r = ${step}$, so $S_n = \\frac{a(r^n - 1)}{r - 1}$.` },
      { tex: chain(...ns.map(line)) },
      { text: `$S_{${n - 1}} = ${tableSum(params, n - 1)}$ is not above $${X}$ and $S_{${n}} = ${tableSum(params, n)}$ is, so the least $n$ is $${n}$.` },
    ];
  },
};

export const sequencesHarderGenerators = [
  apTwo,
  apTwoTree,
  gpTwo,
  gpTwoTree,
  gpSign,
  fillTable,
  sumTiles,
  twoSums,
  twoSumsTree,
  termSum,
  factEquation,
  apUnknown,
  apUnknownTree,
  gpUnknown,
  middleTiles,
  rootFlow,
  infRatio,
  infSecondGen,
  infFlow,
  sumRatio,
  sumRatioTree,
  leastGp,
  logTiles,
  flipFlow,
  leastAp,
  leastTable,
];
