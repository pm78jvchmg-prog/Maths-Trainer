/**
 * Number & Proof, level 1: Proof, level 3: Logic and Implication, and
 * level 4: Proof by Induction.
 *
 * What a proof is and the four ways this level makes one: direct algebraic
 * proof (even as `2k`, odd as `2k + 1`), proof by exhaustion over remainders,
 * disproof by counterexample, and proof by contradiction — then reading a
 * proof somebody else wrote, to find its missing line, its flaw or its method.
 *
 * Level 2, Divisibility & Primes, is in `numberDivisibility.ts`, level 5,
 * Euclid's Algorithm, in `numberEuclid.ts`, and level 6, Modular Arithmetic,
 * in `numberModular.ts`; all three borrow the helpers here.
 *
 * Two rules from the rest of the library matter more here than anywhere.
 *
 * - The checker compares values (PITFALLS 3.4). `2(k + 3) + 1` and `2k + 7`
 *   are the same function, so a form — which is what a proof is made of —
 *   goes through `tiles`, `order`, `flow` or `choice`. Only numbers are typed.
 * - Every claim a slide calls true is checked by the generator itself, over
 *   a spread of whole numbers, before it is shown: a distractor that happened
 *   to be always odd would make "which of these is always odd?" have two
 *   answers, and nothing downstream would notice.
 *
 * Proof-ordering slides follow `proofOrder.ts`: one accepted order, each step
 * leaning on the one above it, distractors that are false or cannot replace
 * any step, and the bank ordered by `orderBank`, never by the rng.
 */
import type { Block, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { orderBank } from './proofOrder';
import { canonicalPieces, formatSet, type Piece } from '../numberLine';
import { windowFor } from './numberLine';
import { stepBank, treeBank } from './parametricImplicit';
import { coeffTex, gcd, say } from './format';

/* ---------- shared helpers ---------- */

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false;
  return true;
}

/** The smallest prime factor of n, for n at least 2. */
export function smallestFactor(n: number): number {
  for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return d;
  return n;
}

/** A remainder in 0..m - 1, whatever the sign of n. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** `ak + b` as the learner reads it: `k`, `3k`, `2k + 1`, `4k - 3`. */
export function lin(a: number, b: number, v = 'k'): string {
  const head = a === 1 ? v : `${a}${v}`;
  if (b === 0) return head;
  return b > 0 ? `${head} + ${b}` : `${head} - ${-b}`;
}

/**
 * A polynomial in `v`, highest power first: `[4, 4, 6]` is `4k^2 + 4k + 6`.
 * Exponents are single digits, so no braces: safe inside a tiles template.
 */
export function polyTex(coefs: number[], v = 'k'): string {
  const top = coefs.length - 1;
  let out = '';
  coefs.forEach((c, i) => {
    if (c === 0) return;
    const p = top - i;
    const size = Math.abs(c);
    const power = p === 0 ? '' : p === 1 ? v : `${v}^${p}`;
    const body = p === 0 ? `${size}` : `${size === 1 ? '' : size}${power}`;
    if (out === '') out = c < 0 ? `-${body}` : body;
    else out += c < 0 ? ` - ${body}` : ` + ${body}`;
  });
  return out || '0';
}

/** A single term `ck^p` as a tile. */
export function termTex(c: number, p: number, v = 'k'): string {
  return polyTex([c, ...Array(p).fill(0)], v);
}

/**
 * A tiles or tree bank: every token the answer needs, as a multiset, plus the
 * distractors that differ from all of them. Sorted, so one question renders
 * one way (PITFALLS 3.10).
 */
export function fillBank(answer: string[], distractors: string[], spare = 2, limit = Infinity): string[] {
  const bare = (token: string) => token.replace(/\s+/g, '');
  const needed = new Set(answer.map(bare));
  const extras: string[] = [];
  for (const token of distractors) {
    if (needed.has(bare(token)) || extras.some((extra) => bare(extra) === bare(token))) continue;
    if (extras.length < limit) extras.push(token);
  }
  if (extras.length < spare) throw new Error(`fillBank: only ${extras.length} distractor(s) for ${answer.join(', ')}`);
  return [...answer, ...extras].sort();
}

/**
 * A solution line, stacked when it would run off a phone. Worked-solution
 * displays are about 320 px wide at 393, which fits roughly twenty visible
 * characters of maths, counting an operator twice for the space around it;
 * anything longer scrolls sideways. A line of pairs (`a,\quad b`) goes one
 * pair to a row, and a chain `a = b = c` puts each `= ...` on a row of its own.
 */
export function stackTex(tex: string): string {
  const visible = (t: string) => {
    const bare = t.replace(/\\(times|cdot|mid|nmid|ge|le|div)\b/g, 'x').replace(/\\[a-zA-Z]+|[{}\s^_&]/g, '');
    return bare.length + (bare.match(/[+=x<>-]/g) ?? []).length;
  };
  if (visible(tex) <= 20) return tex;
  const pairs = tex.split(/,\\(?:quad|;) /);
  if (pairs.length > 1) return `\\begin{gathered} ${pairs.join(' \\\\ ')} \\end{gathered}`;
  const chain = tex.split(' = ');
  if (chain.length > 1) return `\\begin{aligned} &${chain[0]} \\\\ ${chain.slice(1).map((part) => `&= ${part}`).join(' \\\\ ')} \\end{aligned}`;
  return tex;
}

/** Items turned by a hash of `key`, so the right one is not always first. */
export function turned<T>(items: T[], key: string): T[] {
  const turn = hashSeed(key) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/**
 * A native choice slide. The options are turned by a hash of their labels,
 * so the answer moves about yet one question renders one way. Labels are TeX
 * unless `plain`, which is for sentences with no maths in them.
 */
export function choiceSlide(prompt: Block[], correct: string, distractors: string[], plain = false): Slide {
  const labels = [correct, ...distractors.filter((d, i, all) => d !== correct && all.indexOf(d) === i)];
  // Sorted by hash before turning, so the order the options were drawn in
  // cannot make one question render two ways.
  const sorted = [...labels].sort((a, b) => hashSeed(a) - hashSeed(b));
  const ordered = turned(sorted, sorted.join('|'));
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((label, idx) => ({ id: `opt${idx}`, label, tex: !plain })),
    correctId: `opt${ordered.indexOf(correct)}`,
  };
}

/**
 * The k nearest 0 in -8..8 where `holds` fails, or undefined if it never does.
 * Nearest first, so the counterexample a solution quotes is the easy one.
 */
function firstFailure(holds: (k: number) => boolean): number | undefined {
  for (let size = 0; size <= 8; size += 1) {
    for (const k of size === 0 ? [0] : [size, -size]) if (!holds(k)) return k;
  }
  return undefined;
}

const LETTERS = ['A', 'B', 'C', 'D'];

/* ---------- proof ordering, as in proofOrder.ts ---------- */

export interface Distractor {
  text: string;
  /** Shown in the worked solution only. */
  why: string;
}

export interface Proof {
  claim: string;
  steps: string[];
  pool: Distractor[];
}

export function orderSlide(proof: Proof, picks: number[]): Slide {
  const distractors = picks.map((idx) => proof.pool[idx].text);
  const { steps, answer } = orderBank(proof.steps, distractors);
  const extra =
    distractors.length === 1
      ? 'One step in the bank does not belong.'
      : 'Two steps in the bank do not belong.';
  return {
    kind: 'order',
    prompt: [say(proof.claim), say(`Tap the steps of the proof in order. ${extra}`)],
    steps,
    answer,
  };
}

export function orderSolution(proof: Proof, picks: number[]): SolutionStep[] {
  return [
    { text: 'Each step uses the one before it, so the proof runs:' },
    ...proof.steps.map((text, idx) => ({ text: `${idx + 1}. ${text}` })),
    ...picks.map((idx) => ({
      text: `Not part of it: “${proof.pool[idx].text}” ${proof.pool[idx].why}`,
    })),
  ];
}

export function pickDistractors(rng: Rng, proof: Proof, difficulty: number): number[] {
  const indices = proof.pool.map((_, idx) => idx);
  return rng.sample(indices, difficulty >= 2 ? 2 : 1).sort((a, b) => a - b);
}

/* ================================================================
 * Lesson 1: direct proof
 * ================================================================ */

type Target = 'odd' | 'even' | 'three';

/**
 * Expressions in k that a "which is always …?" question can offer. Each is a
 * shape and a constant; whether it is always odd, even or a multiple of 3 is
 * worked out by evaluating it, never assumed from the shape.
 */
const SHAPES: Record<string, { tex: (c: number) => string; f: (k: number, c: number) => number; hard?: boolean }> = {
  one: { tex: (c) => lin(1, c), f: (k, c) => k + c },
  two: { tex: (c) => lin(2, c), f: (k, c) => 2 * k + c },
  three: { tex: (c) => lin(3, c), f: (k, c) => 3 * k + c },
  four: { tex: (c) => lin(4, c), f: (k, c) => 4 * k + c },
  six: { tex: (c) => lin(6, c), f: (k, c) => 6 * k + c, hard: true },
  twoBracketOne: { tex: (c) => `2(k + ${c}) + 1`, f: (k, c) => 2 * (k + c) + 1 },
  twoBracket: { tex: (c) => `2(k + ${c})`, f: (k, c) => 2 * (k + c) },
  threeBracket: { tex: (c) => `3(k + ${c})`, f: (k, c) => 3 * (k + c), hard: true },
  square: { tex: (c) => polyTex([1, 0, c]), f: (k, c) => k * k + c },
  twoSquare: { tex: (c) => polyTex([2, 0, c]), f: (k, c) => 2 * k * k + c, hard: true },
  consecutive: { tex: (c) => polyTex([1, 1, c]), f: (k, c) => k * k + k + c, hard: true },
  cube: { tex: (c) => polyTex([1, 0, -1, c]), f: (k, c) => k ** 3 - k + c, hard: true },
};

const TARGET_TEST: Record<Target, (v: number) => boolean> = {
  odd: (v) => mod(v, 2) === 1,
  even: (v) => mod(v, 2) === 0,
  three: (v) => mod(v, 3) === 0,
};

const TARGET_WORDS: Record<Target, string> = {
  odd: 'odd',
  even: 'even',
  three: 'a multiple of $3$',
};

interface Pick {
  shape: string;
  c: number;
}

interface AlwaysParams {
  target: Target;
  correct: Pick;
  distractors: Pick[];
}

const pickTex = ({ shape, c }: Pick) => SHAPES[shape].tex(c);
const always = (target: Target, { shape, c }: Pick) =>
  firstFailure((k) => TARGET_TEST[target](SHAPES[shape].f(k, c))) === undefined;

/** Why an always-true pick is always true, in the learner's numbers. */
function alwaysWhy(target: Target, { shape, c }: Pick): string {
  const tex = SHAPES[shape].tex(c);
  if (shape === 'consecutive') {
    return `$k^2 + k = k(k + 1)$ is two consecutive whole numbers multiplied, so it is even; adding $${c}$ makes $${tex}$ ${TARGET_WORDS[target]}.`;
  }
  if (shape === 'cube') {
    return `$k^3 - k = (k - 1)k(k + 1)$ is three consecutive whole numbers multiplied, so it is a multiple of $3$ and even; adding $${c}$ makes $${tex}$ ${TARGET_WORDS[target]}.`;
  }
  if (shape === 'twoSquare') {
    return `$2k^2$ is even for every $k$, so adding $${c}$ makes $${tex}$ ${TARGET_WORDS[target]}.`;
  }
  if (target === 'three') {
    const a = shape === 'threeBracket' ? 3 : shape === 'three' ? 3 : 6;
    const inner = shape === 'threeBracket' ? lin(1, c) : lin(a / 3, c / 3);
    return `$${tex} = 3(${inner})$, three times a whole number, so it is a multiple of $3$ for every $k$.`;
  }
  const odd = target === 'odd';
  if (shape === 'twoBracketOne' || shape === 'twoBracket') {
    return `$${tex}$ is $2 \\times$ a whole number${odd ? ', plus $1$' : ''}, so it is ${target} for every $k$.`;
  }
  const a = shape === 'two' ? 2 : shape === 'four' ? 4 : 6;
  const inner = lin(a / 2, Math.floor(c / 2));
  return `$${tex} = 2(${inner})${odd ? ' + 1' : ''}$, so it is ${target} for every $k$.`;
}

/** Whether two picks are one expression in k, checked at k = 0 to 6. */
const sameRule = (a: Pick, b: Pick): boolean =>
  [0, 1, 2, 3, 4, 5, 6].every((k) => SHAPES[a.shape].f(k, a.c) === SHAPES[b.shape].f(k, b.c));

const prfAlways: Generator<AlwaysParams> = {
  id: 'prf-always',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const target: Target = hard ? rng.pick(['odd', 'even', 'three'] as const) : rng.pick(['odd', 'even'] as const);
    const shapes = Object.keys(SHAPES).filter((key) => hard || !SHAPES[key].hard);
    const draw = (): Pick => ({ shape: rng.pick(shapes), c: rng.int(1, 9) });
    for (;;) {
      const correct = draw();
      if (!always(target, correct)) continue;
      const distractors: Pick[] = [];
      for (let tries = 0; distractors.length < 3 && tries < 60; tries += 1) {
        const pick = draw();
        const tex = pickTex(pick);
        if (always(target, pick)) continue;
        if (tex === pickTex(correct) || distractors.some((d) => pickTex(d) === tex)) continue;
        // Two shapes can write one expression, 2(k + 1) and 2k + 2: offering
        // both hands the learner a free elimination.
        if (distractors.some((d) => sameRule(d, pick))) continue;
        distractors.push(pick);
      }
      if (distractors.length === 3) return { target, correct, distractors };
    }
  },
  render({ target, correct, distractors }) {
    return choiceSlide(
      [say(`Which of these is **always** ${TARGET_WORDS[target]}, whatever whole number $k$ is?`)],
      pickTex(correct),
      distractors.map(pickTex),
    );
  },
  solution({ target, correct, distractors }) {
    return [
      { text: alwaysWhy(target, correct) },
      { text: 'Each of the others fails for at least one $k$, and one failure is enough:' },
      ...distractors.map((pick) => {
        const k = firstFailure((x) => TARGET_TEST[target](SHAPES[pick.shape].f(x, pick.c))) as number;
        return { text: `$${pickTex(pick)}$ at $k = ${k}$ is $${SHAPES[pick.shape].f(k, pick.c)}$.` };
      }),
    ];
  },
};

/* ---------- writing an expression as 2 × whole number (+ 1) ---------- */

interface ParityParams {
  m: number;
  r: 0 | 1;
  c: number;
  square: boolean;
}

/** `3(2k + 1) + 5`, the substitution the learner reads. */
function substituted({ m, r, c, square }: ParityParams): string {
  const n = lin(2, r);
  const base = square ? `(${n})^2` : r === 0 && m > 1 ? `${m} \\times 2k` : `(${n})`;
  const body = square ? (m === 1 ? base : `${m}${base}`) : r === 0 && m > 1 ? base : m === 1 ? n : `${m}${base}`;
  return `${body} + ${c}`;
}

/** The expression in n: `3n + 5` or `2n^2 + 5`. */
function parityExpr({ m, c, square }: ParityParams): string {
  return `${square ? termTex(m, 2, 'n') : termTex(m, 1, 'n')} + ${c}`;
}

/** Coefficients in k after substituting, highest first. */
function parityExpanded({ m, r, c, square }: ParityParams): number[] {
  return square ? [4 * m, 4 * m * r, m * r + c] : [2 * m, m * r + c];
}

/** The parts inside 2( ), and the 0 or 1 left over. */
function parityParts(params: ParityParams): { inside: string[]; t: number } {
  const coefs = parityExpanded(params);
  const s = coefs[coefs.length - 1];
  const q = Math.floor(s / 2);
  const t = s % 2;
  const inside = coefs
    .slice(0, -1)
    .map((c, i) => termTex(c / 2, coefs.length - 1 - i))
    .filter((_, i) => coefs[i] !== 0);
  return { inside: [...inside, String(q)], t };
}

const prfParity: Generator<ParityParams> = {
  id: 'prf-parity',
  sample(rng, difficulty) {
    const square = difficulty >= 2;
    for (;;) {
      const params: ParityParams = { m: rng.int(1, 5), r: rng.pick([0, 1] as const), c: rng.int(1, 9), square };
      const coefs = parityExpanded(params);
      if (coefs[coefs.length - 1] < 2) continue;
      return params;
    }
  },
  render(params) {
    const { inside, t } = parityParts(params);
    const expanded = polyTex(parityExpanded(params));
    const blanks = inside.map((_, i) => `{${i}}`).join(' + ');
    const { r } = params;
    const coefs = parityExpanded(params);
    const s = coefs[coefs.length - 1];
    const top = coefs.length - 1;
    // The undivided terms, a half taken of one term but not the next, and
    // the constant's half off by one.
    const slips = [
      ...coefs.slice(0, -1).map((c, i) => termTex(c, top - i)),
      String(s),
      String(Math.floor(s / 2) + 1),
      termTex(coefs[0] / 2 + 1, top),
      ...(s >= 4 ? [String(Math.floor(s / 2) - 1)] : []),
    ];
    return {
      kind: 'tiles',
      prompt: [
        say(`$n$ is ${r ? 'odd' : 'even'}, so $n = ${lin(2, r)}$ for some whole number $k$.`),
        say(
          `Then $${parityExpr(params)} = ${substituted(params)} = ${expanded}$. Write that as $2 \\times$ a whole number${t ? ', plus $1$' : ''}: it shows $${parityExpr(params)}$ is ${t ? 'odd' : 'even'}.`,
        ),
      ],
      template: `${expanded} = 2(${blanks})${t ? ' + 1' : ''}`,
      bank: fillBank(inside, slips),
      answer: inside,
    };
  },
  solution(params) {
    const { inside, t } = parityParts(params);
    const expanded = polyTex(parityExpanded(params));
    return [
      { text: `Take $2$ out of every term${t ? ', leaving $1$ over from the constant' : ''}:` },
      { tex: stackTex(`${expanded} = 2(${inside.join(' + ')})${t ? ' + 1' : ''}`) },
      {
        text: `$${inside.join(' + ')}$ is a whole number, so $${parityExpr(params)}$ is ${t ? 'odd' : 'even'} whenever $n$ is ${params.r ? 'odd' : 'even'}.`,
      },
    ];
  },
};

/* ---------- deciding parity, one decision at a time ---------- */

interface ParityFlowParams {
  r: 0 | 1;
  m: number;
  c: number;
  quad: boolean;
}

function flowExpr({ m, c, quad }: ParityFlowParams): string {
  return quad ? `n^2 + ${termTex(m, 1, 'n')} + ${c}` : `${termTex(m, 1, 'n')} + ${c}`;
}

/** The expression in k: coefficients, highest first. */
function flowExpanded({ r, m, c, quad }: ParityFlowParams): number[] {
  return quad ? [4, 4 * r + 2 * m, r + m * r + c] : [2 * m, m * r + c];
}

function flowSlips({ r, m, c, quad }: ParityFlowParams): number[][] {
  return quad
    ? [
        [4, 2 * m, r + m * r + c],
        [2, 2 * r + 2 * m, r + m * r + c],
        [4, 4 * r + m, r + r + c],
        [4, 4 * r + 2 * m, m * r + c + 1],
      ]
    : [
        [2 * m, r + c],
        [m, m * r + c],
        [2 * m, m * r + c + 1],
        [2 * m + 1, m * r + c],
      ];
}

const prfParityFlow: Generator<ParityFlowParams> = {
  id: 'prf-parity-flow',
  sample(rng, difficulty) {
    const quad = difficulty >= 2;
    return { r: rng.pick([0, 1] as const), m: rng.int(quad ? 1 : 2, 5), c: rng.int(1, 9), quad };
  },
  render(params) {
    const expr = flowExpr(params);
    const right = polyTex(flowExpanded(params));
    const slips = flowSlips(params)
      .map((coefs) => polyTex(coefs))
      .filter((tex, i, all) => tex !== right && all.indexOf(tex) === i)
      .slice(0, 2);
    const form = `$n = ${lin(2, params.r)}$`;
    const forms = [`$n = 2k + 1$`, `$n = 2k$`, `$n = k + 1$`];
    const constant = flowExpanded(params)[flowExpanded(params).length - 1];
    const parity = constant % 2 === 1 ? 'Odd' : 'Even';
    return {
      kind: 'flow',
      prompt: [
        say(
          `$n$ is ${params.r ? 'odd' : 'even'}. Decide whether $${expr}$ is odd or even. Each answer chooses what gets asked next.`,
        ),
      ],
      subject: expr,
      steps: [
        {
          id: 'form',
          ask: `$n$ is ${params.r ? 'odd' : 'even'}. Which way of writing it do you start from?`,
          branches: turned(forms, expr).map((label) => ({ label, to: 'expand' })),
        },
        {
          id: 'expand',
          ask: `Putting that in, $${expr}$ becomes`,
          branches: turned([right, ...slips], `${expr}|${right}`).map((tex) => ({ label: `$${tex}$`, to: 'parity' })),
        },
        {
          id: 'parity',
          ask: `So $${expr}$ is`,
          branches: [
            { label: 'Even', outcome: 'Even: it is $2 \\times$ a whole number.' },
            { label: 'Odd', outcome: 'Odd: it is $2 \\times$ a whole number, plus $1$.' },
            { label: 'It depends on $k$', outcome: 'Then some values of $k$ would give odd and some even.' },
          ],
        },
      ],
      answer: [form, `$${right}$`, parity],
    };
  },
  solution(params) {
    const expr = flowExpr(params);
    const coefs = flowExpanded(params);
    const s = coefs[coefs.length - 1];
    const half = Math.floor(s / 2);
    // A constant of 1 leaves nothing inside the bracket but the k terms: 2(2k) + 1, not 2(2k + 0) + 1.
    const inside = [...coefs.slice(0, -1).map((c, i) => termTex(c / 2, coefs.length - 1 - i)), ...(half === 0 ? [] : [String(half)])];
    return [
      { text: `$n$ is ${params.r ? 'odd' : 'even'}, so start from $n = ${lin(2, params.r)}$.` },
      { tex: stackTex(`${expr} = ${polyTex(coefs)}`) },
      { tex: stackTex(`= 2(${inside.join(' + ')})${s % 2 ? ' + 1' : ''}`) },
      { text: `So $${expr}$ is ${s % 2 ? 'odd' : 'even'}, whatever whole number $k$ is.` },
    ];
  },
};

/* ---------- a proof, or only examples? ---------- */

type ArgumentKind = 'proof' | 'examples' | 'sameLetter' | 'wrongForm' | 'circular';

interface Claim {
  claim: string;
  arguments: Record<Exclude<ArgumentKind, 'examples'>, string>;
  /** Three worked instances from the draw's numbers. */
  examples: (nums: number[]) => string;
  why: Record<Exclude<ArgumentKind, 'proof'>, string>;
}

const odd = (x: number) => 2 * x + 1;

/**
 * Every argument but `proof` must fail as a proof of its claim. That rules out
 * some tempting claims: for "the difference of two odd numbers is even",
 * writing them as $2a + 1$ and $2b - 1$ is a perfectly good proof, so it
 * cannot be offered as the wrong one.
 */
const PROOF_CLAIMS: Claim[] = [
  {
    claim: 'The sum of two odd numbers is even.',
    arguments: {
      proof: 'Write them as $2a + 1$ and $2b + 1$. Their sum is $2a + 2b + 2 = 2(a + b + 1)$, which is even.',
      sameLetter: 'Write them as $2n + 1$ and $2n + 1$. Their sum is $4n + 2 = 2(2n + 1)$, which is even.',
      wrongForm: 'Write them as $2a$ and $2b$. Their sum is $2(a + b)$, which is even.',
      circular: 'Adding two odd numbers always gives an even number, so their sum is even.',
    },
    examples: ([a, b, c, d, e, f]) =>
      `$${odd(a)} + ${odd(b)} = ${odd(a) + odd(b)}$, $${odd(c)} + ${odd(d)} = ${odd(c) + odd(d)}$ and $${odd(e)} + ${odd(f)} = ${odd(e) + odd(f)}$ are all even, so the claim is true.`,
    why: {
      examples: 'Three examples say nothing about any other pair.',
      sameLetter: 'Using $n$ twice only covers two odd numbers that are equal.',
      wrongForm: '$2a$ and $2b$ are even numbers, not odd ones.',
      circular: 'It assumes what it sets out to prove.',
    },
  },
  {
    claim: 'The sum of an odd number and an even number is odd.',
    arguments: {
      proof: 'Write them as $2a + 1$ and $2b$. Their sum is $2(a + b) + 1$, which is odd.',
      sameLetter: 'Write them as $2n + 1$ and $2n$. Their sum is $4n + 1 = 2(2n) + 1$, which is odd.',
      wrongForm: 'Write them as $2a + 1$ and $2b + 1$. Their sum is $2(a + b + 1)$, which is odd.',
      circular: 'An odd number plus an even number is always odd, so the sum is odd.',
    },
    examples: ([a, b, c, d, e, f]) =>
      `$${odd(a)} + ${2 * b + 2} = ${odd(a) + 2 * b + 2}$, $${odd(c)} + ${2 * d + 2} = ${odd(c) + 2 * d + 2}$ and $${odd(e)} + ${2 * f + 2} = ${odd(e) + 2 * f + 2}$ are all odd, so the claim is true.`,
    why: {
      examples: 'Three examples say nothing about any other pair.',
      sameLetter: 'Using $n$ for both only covers an even number one less than the odd one.',
      wrongForm: '$2b + 1$ is odd, and $2(a + b + 1)$ is even, not odd.',
      circular: 'It assumes what it sets out to prove.',
    },
  },
  {
    claim: 'The product of two odd numbers is odd.',
    arguments: {
      proof: 'Write them as $2a + 1$ and $2b + 1$. Their product is $4ab + 2a + 2b + 1 = 2(2ab + a + b) + 1$, which is odd.',
      sameLetter: 'Write them as $2n + 1$ and $2n + 1$. Their product is $4n^2 + 4n + 1 = 2(2n^2 + 2n) + 1$, which is odd.',
      wrongForm: 'Write them as $2a + 1$ and $2b + 1$. Their product is $4ab + 1 = 2(2ab) + 1$, which is odd.',
      circular: 'Multiplying two odd numbers never gives an even number, so the product is odd.',
    },
    examples: ([a, b, c, d, e, f]) =>
      `$${odd(a)} \\times ${odd(b)} = ${odd(a) * odd(b)}$, $${odd(c)} \\times ${odd(d)} = ${odd(c) * odd(d)}$ and $${odd(e)} \\times ${odd(f)} = ${odd(e) * odd(f)}$ are all odd, so the claim is true.`,
    why: {
      examples: 'Three examples say nothing about any other pair.',
      sameLetter: 'Using $n$ twice only covers an odd number times itself.',
      wrongForm: '$(2a + 1)(2b + 1)$ is $4ab + 2a + 2b + 1$: the middle terms are missing.',
      circular: 'It assumes what it sets out to prove.',
    },
  },
  {
    claim: 'The sum of three consecutive whole numbers is a multiple of $3$.',
    arguments: {
      proof: 'Call them $n$, $n + 1$ and $n + 2$. Their sum is $3n + 3 = 3(n + 1)$, a multiple of $3$.',
      sameLetter: 'Call them $n$, $n$ and $n$. Their sum is $3n$, a multiple of $3$.',
      wrongForm: 'Call them $n$, $n + 2$ and $n + 4$. Their sum is $3n + 6 = 3(n + 2)$, a multiple of $3$.',
      circular: 'Three consecutive whole numbers always add to a multiple of $3$, so this sum is one.',
    },
    examples: ([a, b, c]) =>
      `$${a} + ${a + 1} + ${a + 2} = ${3 * a + 3}$, $${b + 10} + ${b + 11} + ${b + 12} = ${3 * b + 33}$ and $${c + 20} + ${c + 21} + ${c + 22} = ${3 * c + 63}$ are all multiples of $3$, so the claim is true.`,
    why: {
      examples: 'Three examples say nothing about any other three numbers.',
      sameLetter: '$n$, $n$ and $n$ are the same number three times, not consecutive ones.',
      wrongForm: '$n$, $n + 2$ and $n + 4$ go up in twos, so they are not consecutive.',
      circular: 'It assumes what it sets out to prove.',
    },
  },
  {
    claim: 'The square of an even number is a multiple of $4$.',
    arguments: {
      proof: 'An even number is $2k$ for a whole number $k$, and $(2k)^2 = 4k^2$, a multiple of $4$.',
      sameLetter: 'An even number is $2$, and $2^2 = 4$, a multiple of $4$.',
      wrongForm: 'An even number is $2k$ for a whole number $k$, and $(2k)^2 = 2k^2$, which is even.',
      circular: 'Even squares are always multiples of $4$, so this one is.',
    },
    examples: ([a, b, c]) =>
      `$${2 * a + 2}^2 = ${(2 * a + 2) ** 2}$, $${2 * b + 12}^2 = ${(2 * b + 12) ** 2}$ and $${2 * c + 22}^2 = ${(2 * c + 22) ** 2}$ are all multiples of $4$, so the claim is true.`,
    why: {
      examples: 'Three examples say nothing about any other even number.',
      sameLetter: '$2$ is one even number, not every even number.',
      wrongForm: '$(2k)^2$ squares the $2$ as well: it is $4k^2$. And even is not the claim.',
      circular: 'It assumes what it sets out to prove.',
    },
  },
];

/** Claims by index; difficulty 2 drops the odd-plus-even one, whose slips are the easiest to spot. */
const CLAIM_POOL = [0, 1, 2, 3, 4];
const HARD_CLAIMS = [0, 2, 3, 4];

interface ProofOrExampleParams {
  claim: number;
  nums: number[];
  kinds: Exclude<ArgumentKind, 'proof'>[];
}

function argumentText(claim: Claim, kind: ArgumentKind, nums: number[]): string {
  return kind === 'examples' ? claim.examples(nums) : claim.arguments[kind];
}

function lettered({ claim, nums, kinds }: ProofOrExampleParams): { kind: ArgumentKind; text: string }[] {
  const c = PROOF_CLAIMS[claim];
  const all = (['proof', ...kinds] as ArgumentKind[]).map((kind) => ({ kind, text: argumentText(c, kind, nums) }));
  return [...all].sort((a, b) => hashSeed(a.text) - hashSeed(b.text));
}

const prfProofOrExample: Generator<ProofOrExampleParams> = {
  id: 'prf-proof-or-example',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const claim = rng.pick(hard ? HARD_CLAIMS : CLAIM_POOL);
    const nums = Array.from({ length: 6 }, () => rng.int(1, 9));
    const kinds = hard
      ? (['sameLetter', ...rng.sample(['examples', 'wrongForm', 'circular'] as const, 2)] as ProofOrExampleParams['kinds'])
      : rng.sample(['examples', 'sameLetter', 'wrongForm', 'circular'] as const, 3);
    return { claim, nums, kinds };
  },
  render(params) {
    const args = lettered(params);
    const correct = LETTERS[args.findIndex((a) => a.kind === 'proof')];
    return {
      kind: 'choice',
      prompt: [
        say(`Claim: ${PROOF_CLAIMS[params.claim].claim} Which argument **proves** it?`),
        ...args.map((a, i) => say(`**${LETTERS[i]}.** ${a.text}`)),
      ],
      options: LETTERS.map((letter) => ({ id: letter, label: letter, tex: false })),
      correctId: correct,
    };
  },
  solution(params) {
    const args = lettered(params);
    const c = PROOF_CLAIMS[params.claim];
    return [
      {
        text: `${LETTERS[args.findIndex((a) => a.kind === 'proof')]} is the proof: it names the numbers with letters, so it covers every case at once.`,
      },
      ...args
        .map((a, i) => ({ a, i }))
        .filter(({ a }) => a.kind !== 'proof')
        .map(({ a, i }) => ({ text: `${LETTERS[i]}: ${c.why[a.kind as Exclude<ArgumentKind, 'proof'>]}` })),
    ];
  },
};

/* ================================================================
 * Lesson 2: proof by exhaustion
 * ================================================================ */

/** A list of cases `ak + b`, and whether to write ± pairs. */
interface CaseList {
  a: number;
  offsets: number[];
  pm?: boolean;
}

function caseListTex({ a, offsets, pm }: CaseList): string {
  const parts: string[] = [];
  const done = new Set<number>();
  for (const b of offsets) {
    if (done.has(b)) continue;
    if (pm && b > 0 && offsets.includes(-b)) {
      parts.push(`${lin(a, 0)} \\pm ${b}`);
      done.add(-b);
    } else {
      parts.push(lin(a, b));
    }
    done.add(b);
  }
  return `n = ${parts.join(',\\; ')}`;
}

/** Whether the cases between them take in every integer. */
function covers({ a, offsets }: CaseList): boolean {
  for (let n = -40; n <= 40; n += 1) {
    if (!offsets.some((b) => mod(n - b, a) === 0)) return false;
  }
  return true;
}

/** Lists that each miss some integer, none rendering like another. */
function caseDistractors(m: number): CaseList[] {
  const all = Array.from({ length: m }, (_, i) => i);
  const lists: CaseList[] = [
    { a: m, offsets: all.slice(0, -1) },
    { a: m, offsets: all.slice(1) },
    { a: m, offsets: [...all.slice(0, -1), m] },
    { a: m + 1, offsets: all },
    { a: m, offsets: all.map((i) => i * m) },
  ];
  if (m === 2) lists.push({ a: 2, offsets: [-1, 1] }, { a: 2, offsets: [1, 3] });
  if (m >= 4) lists.push({ a: m, offsets: [0, 1, -1], pm: true });
  return lists.filter(
    (list, i) => !covers(list) && lists.findIndex((other) => caseListTex(other) === caseListTex(list)) === i,
  );
}

interface CaseSplitParams {
  m: number;
  pm: boolean;
  distractors: number[];
}

function caseSplitCorrect({ m, pm }: CaseSplitParams): CaseList {
  if (!pm) return { a: m, offsets: Array.from({ length: m }, (_, i) => i) };
  const half = Math.floor(m / 2);
  const offsets = [0];
  for (let b = 1; b <= half; b += 1) {
    if (m % 2 === 0 && b === half) offsets.push(b);
    else offsets.push(b, -b);
  }
  return { a: m, offsets, pm: true };
}

const prfCaseSplit: Generator<CaseSplitParams> = {
  id: 'prf-case-split',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const m = hard ? rng.pick([3, 4, 5]) : rng.pick([2, 3, 4]);
    const pm = hard && m >= 4 && rng.chance(0.6);
    const pool = caseDistractors(m).map((_, idx) => idx);
    return { m, pm, distractors: rng.sample(pool, 3).sort((a, b) => a - b) };
  },
  render(params) {
    const pool = caseDistractors(params.m);
    return choiceSlide(
      [
        say(
          `To prove a claim about every integer $n$ by cases, split $n$ by its remainder on division by $${params.m}$. Which list of cases takes in every integer?`,
        ),
      ],
      caseListTex(caseSplitCorrect(params)),
      params.distractors.map((idx) => caseListTex(pool[idx])),
    );
  },
  solution(params) {
    const { m } = params;
    const remainders = Array.from({ length: m }, (_, i) => i).join(', ');
    const pool = caseDistractors(m);
    return [
      {
        text: `Dividing by $${m}$ leaves remainder ${remainders.replace(/(\d+)/g, '$$$1$$')}, so there are $${m}$ cases, one per remainder.`,
      },
      { tex: stackTex(caseListTex(caseSplitCorrect(params))) },
      ...(params.pm ? [{ text: `$${lin(m, 0)} - 1$ leaves the same remainder as $${lin(m, m - 1)}$, so writing $\\pm$ covers the same cases.` }] : []),
      ...params.distractors.map((idx) => {
        const list = pool[idx];
        let gap = 0;
        for (let n = 1; n < 40; n += 1) {
          if (!list.offsets.some((b) => mod(n - b, list.a) === 0)) {
            gap = n;
            break;
          }
        }
        return { text: `$${caseListTex(list)}$ misses $n = ${gap}$.` };
      }),
    ];
  },
};

/* ---------- one case, written as m × whole number + remainder ---------- */

interface CaseParams {
  m: number;
  r: number;
  a: number;
  c: number;
}

function caseExpr({ a, c }: { a: number; c: number }): string {
  return a === 0 ? `n^2 + ${c}` : `n^2 + ${termTex(a, 1, 'n')} + ${c}`;
}

/** f(mk + r) in k: [m^2, 2mr + am, r^2 + ar + c]. */
function caseExpanded({ m, r, a, c }: CaseParams): number[] {
  return [m * m, 2 * m * r + a * m, r * r + a * r + c];
}

function caseParts(params: CaseParams): { inside: string[]; remainder: number } {
  const [k2, k1, k0] = caseExpanded(params);
  const { m } = params;
  const q = Math.floor(k0 / m);
  const inside = [termTex(k2 / m, 2)];
  if (k1 !== 0) inside.push(termTex(k1 / m, 1));
  if (q !== 0) inside.push(String(q));
  return { inside, remainder: k0 % m };
}

const prfCaseTiles: Generator<CaseParams> = {
  id: 'prf-case-tiles',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const m = hard ? rng.pick([3, 4, 5]) : rng.pick([2, 3]);
    return { m, r: rng.int(0, m - 1), a: hard ? rng.int(1, 3) : 0, c: rng.int(1, 9) };
  },
  render(params) {
    const { m, r } = params;
    const { inside, remainder } = caseParts(params);
    const expanded = caseExpanded(params);
    const answer = [...inside, String(remainder)];
    const blanks = inside.map((_, i) => `{${i}}`).join(' + ');
    return {
      kind: 'tiles',
      prompt: [
        say(`Case $n = ${lin(m, r)}$: $${caseExpr(params)} = ${polyTex(expanded)}$.`),
        say(`Write it as $${m} \\times$ a whole number, plus a remainder from $0$ to $${m - 1}$.`),
      ],
      template: `${caseExpr(params)} = ${m}(${blanks}) + {${inside.length}}`,
      bank: fillBank(answer, [
        termTex(expanded[0], 2),
        ...(expanded[1] ? [termTex(expanded[1], 1)] : []),
        String(Math.floor(expanded[2] / m) + 1),
        String(expanded[2]),
        String((remainder + 1) % m),
        termTex(m + 1, 2),
        termTex(m, 1),
      ]),
      answer,
    };
  },
  solution(params) {
    const { m, r } = params;
    const { inside, remainder } = caseParts(params);
    return [
      { text: `Take $${m}$ out of every term, keeping back what is left of the constant:` },
      { tex: stackTex(`${polyTex(caseExpanded(params))} = ${m}(${inside.join(' + ')}) + ${remainder}`) },
      {
        text: `So when $n = ${lin(m, r)}$, $${caseExpr(params)}$ leaves remainder $${remainder}$ on division by $${m}$.`,
      },
    ];
  },
};

/* ---------- every case at once, as a tree ---------- */

interface CasesTreeParams {
  m: number;
  a: number;
  c: number;
}

const prfCasesTree: Generator<CasesTreeParams> = {
  id: 'prf-cases-tree',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    return {
      m: hard ? 3 : rng.pick([2, 3]),
      a: hard ? rng.int(1, 4) : rng.int(0, 1),
      c: rng.int(1, 9),
    };
  },
  render(params) {
    const { m } = params;
    const rs = Array.from({ length: m }, (_, r) => r);
    const expansions = rs.map((r) => polyTex(caseExpanded({ ...params, r })));
    const remainders = rs.map((r) => String(mod(caseExpanded({ ...params, r })[2], m)));
    const slips = rs.flatMap((r) => {
      const [k2, k1, k0] = caseExpanded({ ...params, r });
      return [polyTex([k2, k1 === 0 ? m : k1 - m * r, k0]), polyTex([k2, k1, k0 + 1])];
    });
    const unusedRemainders = rs.map(String).filter((r) => !remainders.includes(r));
    const expr = caseExpr(params);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Left to right, the cases are ${rs.map((r) => `$n = ${lin(m, r)}$`).join(', ')}. Top row: $${expr}$ in each case. Underneath: the remainder it leaves on division by $${m}$.`,
        ),
      ],
      expression: expr,
      nodes: [
        ...rs.map((r) => ({ id: `e${r}`, from: [] })),
        ...rs.map((r) => ({ id: `r${r}`, from: [`e${r}`] })),
      ],
      bank: fillBank([...expansions, ...remainders], [...unusedRemainders, ...slips]),
      answer: [...expansions, ...remainders],
    };
  },
  solution(params) {
    const { m } = params;
    const rs = Array.from({ length: m }, (_, r) => r);
    const expr = caseExpr(params);
    const remainders = rs.map((r) => mod(caseExpanded({ ...params, r })[2], m));
    const never = rs.filter((r) => !remainders.includes(r));
    return [
      ...rs.map((r) => {
        const { inside, remainder } = caseParts({ ...params, r });
        return {
          text: `$n = ${lin(m, r)}$: $${expr} = ${polyTex(caseExpanded({ ...params, r }))} = ${m}(${inside.join(' + ')}) + ${remainder}$, remainder $${remainder}$.`,
        };
      }),
      {
        text:
          never.length > 0
            ? `Every integer is one of these cases, so $${expr}$ never leaves remainder ${never.map((r) => `$${r}$`).join(' or ')} on division by $${m}$.`
            : `Every integer is one of these cases, and every remainder turns up.`,
      },
    ];
  },
};

/* ---------- only the remainder matters ---------- */

interface RemainderParams {
  m: number;
  r: number;
  shape: 'square' | 'linear' | 'quad' | 'cube';
  a: number;
  c: number;
}

function remainderExpr({ shape, a, c }: RemainderParams): string {
  switch (shape) {
    case 'square':
      return `n^2 + ${c}`;
    case 'linear':
      return `${termTex(a, 1, 'n')} + ${c}`;
    case 'quad':
      return `n^2 + ${termTex(a, 1, 'n')} + ${c}`;
    case 'cube':
      return `n^3 + ${c}`;
  }
}

function remainderValue({ r, shape, a, c }: RemainderParams): number {
  switch (shape) {
    case 'square':
      return r * r + c;
    case 'linear':
      return a * r + c;
    case 'quad':
      return r * r + a * r + c;
    case 'cube':
      return r ** 3 + c;
  }
}

function remainderAt({ r, shape, a, c }: RemainderParams): string {
  switch (shape) {
    case 'square':
      return `${r}^2 + ${c}`;
    case 'linear':
      return `${a} \\times ${r} + ${c}`;
    case 'quad':
      return `${r}^2 + ${a} \\times ${r} + ${c}`;
    case 'cube':
      return `${r}^3 + ${c}`;
  }
}

const prfCaseRemainder: Generator<RemainderParams> = {
  id: 'prf-case-remainder',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const m = hard ? rng.pick([5, 6, 7]) : rng.pick([3, 4, 5]);
    const shape = hard ? rng.pick(['quad', 'cube'] as const) : rng.pick(['square', 'linear'] as const);
    return { m, r: rng.int(1, m - 1), shape, a: rng.int(2, 5), c: rng.int(1, 9) };
  },
  render(params) {
    return {
      kind: 'expression',
      prompt: [
        say(
          `A whole number $n$ leaves remainder $${params.r}$ when divided by $${params.m}$. What remainder does $${remainderExpr(params)}$ leave when divided by $${params.m}$?`,
        ),
      ],
      lead: '\\text{remainder} =',
      keypad: [],
      answer: String(mod(remainderValue(params), params.m)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution(params) {
    const { m, r } = params;
    const v = remainderValue(params);
    return [
      {
        text: `Write $n = ${lin(m, r)}$. Every term with a $k$ in it is a multiple of $${m}$, so only what $${r}$ makes matters.`,
      },
      { tex: stackTex(`${remainderAt(params)} = ${v} = ${m} \\times ${Math.floor(v / m)} + ${mod(v, m)}`) },
      { text: `So the remainder is $${mod(v, m)}$.` },
    ];
  },
};

/* ================================================================
 * Lesson 3: disproof by counterexample
 * ================================================================ */

/** Claims "f(n) is prime", each with its values worked out. */
const PRIME_CLAIMS: { tex: string; at: (n: number) => string; f: (n: number) => number }[] = [
  ...[5, 11, 17].map((c) => ({
    tex: `n^2 + n + ${c}`,
    at: (n: number) => `${n}^2 + ${n} + ${c}`,
    f: (n: number) => n * n + n + c,
  })),
  ...[5, 11, 17].map((c) => ({
    tex: `n^2 - n + ${c}`,
    at: (n: number) => `${n}^2 - ${n} + ${c}`,
    f: (n: number) => n * n - n + c,
  })),
  ...[1, 3, 5, 9, 15].map((c) => ({
    tex: `2^n + ${c}`,
    at: (n: number) => `2^{${n}} + ${c}`,
    f: (n: number) => 2 ** n + c,
  })),
  ...[
    [2, 1],
    [6, 1],
    [6, 5],
    [4, 3],
    [10, 1],
    [10, 3],
  ].map(([a, b]) => ({
    tex: `${a}n + ${b}`,
    at: (n: number) => `${a} \\times ${n} + ${b}`,
    f: (n: number) => a * n + b,
  })),
  ...[1, 3, 5].map((c) => ({
    tex: `2n^2 + ${c}`,
    at: (n: number) => `2 \\times ${n}^2 + ${c}`,
    f: (n: number) => 2 * n * n + c,
  })),
];

/** Windows [lo, hi] holding exactly one failure, every value under 1000. */
function windows(claim: number, width: number[], maxLo: number, cap: number): { lo: number; hi: number; fail: number }[] {
  const { f } = PRIME_CLAIMS[claim];
  const out: { lo: number; hi: number; fail: number }[] = [];
  for (let lo = 1; lo <= maxLo; lo += 1) {
    for (const w of width) {
      const hi = lo + w - 1;
      const ns = Array.from({ length: w }, (_, i) => lo + i);
      if (ns.some((n) => f(n) >= cap)) continue;
      const fails = ns.filter((n) => !isPrime(f(n)));
      if (fails.length === 1) out.push({ lo, hi, fail: fails[0] });
    }
  }
  return out;
}

export function factorTex(v: number): string {
  const p = smallestFactor(v);
  return p === v ? `${v}` : `${p} \\times ${v / p}`;
}

interface CounterParams {
  claim: number;
  lo: number;
  hi: number;
  fail: number;
}

const prfCounter: Generator<CounterParams> = {
  id: 'prf-counter',
  sample(rng, difficulty) {
    // Difficulty 1 keeps to small n and values under 200, where a factor is
    // one a learner spots; difficulty 2 runs wider and higher.
    const hard = difficulty >= 2;
    const width = hard ? [6, 7] : [4, 5];
    for (;;) {
      const claim = rng.int(0, PRIME_CLAIMS.length - 1);
      const options = windows(claim, width, hard ? 20 : 8, hard ? 1000 : 200);
      if (options.length === 0) continue;
      return { claim, ...rng.pick(options) };
    }
  },
  render({ claim, lo, hi, fail }) {
    return {
      kind: 'expression',
      prompt: [
        say(`Claim: $${PRIME_CLAIMS[claim].tex}$ is prime for every whole number $n$ from $${lo}$ to $${hi}$.`),
        say('Exactly one $n$ in that range makes the claim false. Which one?'),
      ],
      lead: 'n =',
      keypad: [],
      answer: String(fail),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution({ claim, lo, hi, fail }) {
    const { at, f } = PRIME_CLAIMS[claim];
    const ns = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    return [
      { text: `Work out each value: ${ns.map((n) => `$${f(n)}$`).join(', ')}.` },
      { tex: stackTex(`${at(fail)} = ${f(fail)} = ${factorTex(f(fail))}`) },
      { text: `$${f(fail)}$ is not prime, so $n = ${fail}$ is a counterexample: one is enough to disprove the claim.` },
    ];
  },
};

/* ---------- which of these is a counterexample? ---------- */

interface PickClaim {
  claim: string;
  counter: string[];
  fine: string[];
  hard?: boolean;
  why: string;
}

const PICK_CLAIMS: PickClaim[] = [
  {
    claim: 'The sum of two prime numbers is even.',
    counter: ['2 + 3', '2 + 5', '2 + 7', '2 + 11', '2 + 13'],
    fine: ['3 + 5', '5 + 7', '3 + 7', '7 + 11', '3 + 11', '5 + 13', '11 + 13'],
    why: 'Only a sum with $2$ in it, the one even prime, can be odd.',
  },
  {
    claim: 'Every odd number greater than $1$ is prime.',
    counter: ['9', '15', '21', '25', '27', '33', '35'],
    fine: ['3', '5', '7', '11', '13', '17', '19', '23'],
    why: 'An odd number with a factor other than $1$ and itself is not prime.',
  },
  {
    claim: 'If $n$ is a multiple of $4$, then $n$ is a multiple of $8$.',
    counter: ['n = 4', 'n = 12', 'n = 20', 'n = 28', 'n = 36'],
    fine: ['n = 8', 'n = 16', 'n = 24', 'n = 32', 'n = 40'],
    why: 'It needs a multiple of $4$ that is not a multiple of $8$.',
  },
  {
    claim: 'Every multiple of $3$ is odd.',
    counter: ['6', '12', '18', '24', '30'],
    fine: ['3', '9', '15', '21', '27'],
    why: 'It needs a multiple of $3$ that is even.',
  },
  {
    claim: '$2^n + 1$ is prime for every positive whole number $n$.',
    counter: ['n = 3', 'n = 5', 'n = 6', 'n = 7'],
    fine: ['n = 1', 'n = 2', 'n = 4', 'n = 8'],
    why: '$2^3 + 1 = 9$, $2^5 + 1 = 33$, $2^6 + 1 = 65$ and $2^7 + 1 = 129$ all have factors; $3$, $5$, $17$ and $257$ are prime.',
  },
  {
    claim: 'If $a^2 > b^2$, then $a > b$.',
    counter: ['a = -3,\\ b = 2', 'a = -5,\\ b = 1', 'a = -4,\\ b = 3', 'a = -6,\\ b = 2'],
    fine: ['a = 3,\\ b = 2', 'a = 5,\\ b = 1', 'a = 4,\\ b = -3', 'a = 6,\\ b = -2'],
    hard: true,
    why: 'A negative $a$ can have the bigger square and still be the smaller number.',
  },
  {
    claim: '$x^2 \\ge x$ for every real number $x$.',
    counter: ['x = \\tfrac{1}{2}', 'x = \\tfrac{1}{3}', 'x = \\tfrac{3}{4}', 'x = 0.2'],
    fine: ['x = 2', 'x = -1', 'x = 0', 'x = 1', 'x = -\\tfrac{1}{2}'],
    hard: true,
    why: 'Between $0$ and $1$, squaring makes a number smaller.',
  },
  {
    claim: 'If $a$ divides $bc$, then $a$ divides $b$ or $a$ divides $c$.',
    counter: ['a = 6,\\ b = 2,\\ c = 3', 'a = 4,\\ b = 2,\\ c = 6', 'a = 10,\\ b = 4,\\ c = 5', 'a = 9,\\ b = 3,\\ c = 6'],
    fine: ['a = 3,\\ b = 6,\\ c = 2', 'a = 5,\\ b = 2,\\ c = 10', 'a = 2,\\ b = 4,\\ c = 3', 'a = 7,\\ b = 7,\\ c = 2'],
    hard: true,
    why: 'It needs $a$ to divide the product while dividing neither factor.',
  },
  {
    claim: 'If $a > b$, then $\\frac{1}{a} < \\frac{1}{b}$.',
    counter: ['a = 1,\\ b = -1', 'a = 2,\\ b = -3', 'a = 3,\\ b = -2', 'a = 5,\\ b = -1'],
    fine: ['a = 3,\\ b = 2', 'a = 5,\\ b = 1', 'a = -1,\\ b = -2', 'a = 4,\\ b = 2'],
    hard: true,
    why: 'When $a$ is positive and $b$ negative, $\\frac{1}{a}$ is the bigger of the two.',
  },
];

interface CounterPickParams {
  claim: number;
  counter: number;
  fine: number[];
}

const prfCounterPick: Generator<CounterPickParams> = {
  id: 'prf-counter-pick',
  sample(rng, difficulty) {
    const pool = PICK_CLAIMS.map((c, i) => ({ c, i })).filter(({ c }) => (difficulty >= 2 ? true : !c.hard));
    const { c, i } = rng.pick(pool);
    return {
      claim: i,
      counter: rng.int(0, c.counter.length - 1),
      fine: rng.sample(c.fine.map((_, j) => j), 3).sort((a, b) => a - b),
    };
  },
  render({ claim, counter, fine }) {
    const c = PICK_CLAIMS[claim];
    return choiceSlide(
      [say(`Claim: ${c.claim}`), say('Which of these is a **counterexample**?')],
      c.counter[counter],
      fine.map((j) => c.fine[j]),
    );
  },
  solution({ claim, counter, fine }) {
    const c = PICK_CLAIMS[claim];
    return [
      { text: c.why },
      { text: `$${c.counter[counter]}$ fits: the claim fails there, and one failure disproves it.` },
      { text: `${fine.map((j) => `$${c.fine[j]}$`).join(', ')}: the claim holds for each of these, so none of them disproves it.` },
    ];
  },
};

/* ---------- testing values, one decision at a time ---------- */

interface CounterFlowParams {
  claim: number;
  held: number;
  fail: number;
  hard: boolean;
}

const prfCounterFlow: Generator<CounterFlowParams> = {
  id: 'prf-counter-flow',
  sample(rng, difficulty) {
    for (;;) {
      const claim = rng.int(0, PRIME_CLAIMS.length - 1);
      const { f } = PRIME_CLAIMS[claim];
      const ns = Array.from({ length: 15 }, (_, i) => i + 1).filter((n) => f(n) < 1000);
      const fails = ns.filter((n) => !isPrime(f(n)));
      if (fails.length === 0) continue;
      const fail = rng.pick(fails.slice(0, 2));
      const held = ns.filter((n) => n < fail && isPrime(f(n)));
      if (held.length === 0) continue;
      return { claim, held: rng.pick(held), fail, hard: difficulty >= 2 };
    }
  },
  render({ claim, held, fail, hard }) {
    const { tex, at, f } = PRIME_CLAIMS[claim];
    const test = (id: string, n: number, next: string) => ({
      id,
      ask: `Try $n = ${n}$: $${at(n)} = ${f(n)}$. Is that prime?`,
      branches: [
        { label: 'Yes', to: next },
        { label: 'No', to: next },
      ],
    });
    const verdict = {
      id: 'verdict',
      ask: 'So the claim is',
      branches: turned(
        [
          { label: `False: $n = ${fail}$ is a counterexample`, outcome: 'One value where it fails is enough to disprove it.' },
          { label: `True: it held at $n = ${held}$`, outcome: 'A value where it holds proves nothing about the others.' },
          { label: 'Not settled: test more values', outcome: 'More testing only helps while no failure has turned up.' },
        ],
        `${tex}|${held}|${fail}`,
      ),
    };
    const opening = {
      id: 'what',
      ask: 'The claim is about every positive whole number. What would disprove it?',
      branches: [
        { label: 'One value where it fails', to: 't1' },
        { label: 'Showing it fails for every $n$', to: 't1' },
        { label: 'Nothing: examples never settle it', to: 't1' },
      ],
    };
    return {
      kind: 'flow',
      prompt: [
        say(`Claim: $${tex}$ is prime for every positive whole number $n$. Test it. Each answer chooses what gets asked next.`),
      ],
      subject: `${tex}`,
      steps: [...(hard ? [opening] : []), test('t1', held, 't2'), test('t2', fail, 'verdict'), verdict],
      answer: [...(hard ? ['One value where it fails'] : []), 'Yes', 'No', `False: $n = ${fail}$ is a counterexample`],
    };
  },
  solution({ claim, held, fail }) {
    const { at, f } = PRIME_CLAIMS[claim];
    return [
      { text: `$n = ${held}$ gives $${f(held)}$, which is prime: the claim holds there, but that proves nothing about other $n$.` },
      { tex: stackTex(`${at(fail)} = ${f(fail)} = ${factorTex(f(fail))}`) },
      { text: `$${f(fail)}$ is not prime, so $n = ${fail}$ is a counterexample and the claim is false.` },
    ];
  },
};

/* ================================================================
 * Lesson 4: proof by contradiction
 * ================================================================ */

/** Whole numbers from 2 to 13 that are not perfect squares, for √p claims. */
const NON_SQUARES = [2, 3, 5, 6, 7, 10, 11, 13];
const SMALL_PRIMES = [2, 3, 5, 7];

type AssumeFamily = 'sqrt' | 'primes' | 'divides' | 'combo' | 'largest' | 'sum';

interface AssumeParams {
  family: AssumeFamily;
  p: number;
  m: number;
  n: number;
  c: number;
}

/** Claim, assumption and three wrong assumptions, as plain sentences. */
function assumeText({ family, p, m, n, c }: AssumeParams): { claim: string; right: string; wrong: string[] } {
  switch (family) {
    case 'sqrt':
      return {
        claim: `$\\sqrt{${p}}$ is irrational.`,
        right: `√${p} is rational.`,
        wrong: [`√${p} is irrational.`, `√${p} is a whole number.`, `${p} is rational.`],
      };
    case 'primes':
      return {
        claim: 'There are infinitely many prime numbers.',
        right: 'There are only finitely many primes.',
        wrong: ['There are infinitely many primes.', 'There are no primes at all.', 'Every whole number is prime.'],
      };
    case 'divides':
      return {
        claim: `If $n^2$ is a multiple of $${p}$, then $n$ is a multiple of $${p}$.`,
        right: `n² is a multiple of ${p}, and n is not.`,
        wrong: [
          `n² is not a multiple of ${p}.`,
          `n is not a multiple of ${p}.`,
          `n is a multiple of ${p}, and n² is not.`,
        ],
      };
    case 'combo':
      return {
        claim: `There are no whole numbers $a$ and $b$ with $${m}a + ${n}b = ${c}$.`,
        right: `There are whole numbers a and b with ${m}a + ${n}b = ${c}.`,
        wrong: [
          `There are no whole numbers a and b with ${m}a + ${n}b = ${c}.`,
          `a and b are not whole numbers.`,
          `${m}a + ${n}b = ${c} for every a and b.`,
        ],
      };
    case 'largest':
      return {
        claim: `There is no largest multiple of $${m}$.`,
        right: `There is a largest multiple of ${m}.`,
        wrong: [`There is no largest multiple of ${m}.`, `There is a smallest multiple of ${m}.`, `No number is a multiple of ${m}.`],
      };
    case 'sum':
      return {
        claim: `If $a + b \\ge ${2 * m}$, then $a \\ge ${m}$ or $b \\ge ${m}$.`,
        right: `a + b ≥ ${2 * m}, and a < ${m} and b < ${m}.`,
        wrong: [`a + b < ${2 * m}.`, `a + b ≥ ${2 * m}, and a < ${m} or b < ${m}.`, `a ≥ ${m} and b ≥ ${m}.`],
      };
  }
}

const prfAssume: Generator<AssumeParams> = {
  id: 'prf-assume',
  sample(rng, difficulty) {
    const family = rng.pick(
      difficulty >= 2
        ? (['divides', 'combo', 'sum', 'sqrt'] as const)
        : (['sqrt', 'primes', 'combo', 'largest'] as const),
    );
    const combo = sampleCombo(rng);
    return {
      family,
      p: family === 'sqrt' ? rng.pick(NON_SQUARES) : rng.pick(SMALL_PRIMES),
      m: family === 'combo' ? combo.m : rng.int(2, 9),
      n: combo.n,
      c: combo.c,
    };
  },
  render(params) {
    const { claim, right, wrong } = assumeText(params);
    return choiceSlide(
      [say(`To prove by contradiction: ${claim}`), say('What do you assume first?')],
      right,
      wrong,
      true,
    );
  },
  solution(params) {
    const { right } = assumeText(params);
    const implication = params.family === 'divides' || params.family === 'sum';
    return [
      {
        text: implication
          ? 'For an "if … then …" claim, the opposite is: the "if" part holds, and the "then" part fails.'
          : 'A proof by contradiction starts from the exact opposite of the claim, and shows that leads somewhere impossible.',
      },
      { text: `So assume: ${right}` },
    ];
  },
};

/* ---------- building the assumption from tiles ---------- */

type NegateFamily = 'sum' | 'product' | 'parity' | 'divides';

interface NegateParams {
  family: NegateFamily;
  m: number;
  c: number;
}

function negation({ family, m, c }: NegateParams): {
  claim: string;
  template: string;
  answer: string[];
  distractors: string[];
} {
  switch (family) {
    case 'sum':
      return {
        claim: `If $a + b \\ge ${2 * m}$, then $a \\ge ${m}$ or $b \\ge ${m}$.`,
        template: `a + b \\ge ${2 * m},\\; a {0} ${m} \\text{ and } b {1} ${m}`,
        answer: ['<', '<'],
        distractors: ['\\ge', '\\le', '>'],
      };
    case 'product':
      return {
        claim: `If $a$ and $b$ are positive and $ab > ${m * m}$, then $a > ${m}$ or $b > ${m}$.`,
        template: `ab > ${m * m},\\; a {0} ${m} \\text{ and } b {1} ${m}`,
        answer: ['\\le', '\\le'],
        distractors: ['<', '>', '\\ge'],
      };
    case 'parity': {
      const odd = c % 2 === 1;
      return {
        claim: `If $n^2 + ${c}$ is even, then $n$ is ${odd ? 'odd' : 'even'}.`,
        template: `n^2 + ${c} \\text{ is } {0} \\text{ and } n \\text{ is } {1}`,
        answer: ['\\text{even}', odd ? '\\text{even}' : '\\text{odd}'],
        distractors: ['\\text{odd}', '\\text{prime}', '\\text{positive}'],
      };
    }
    case 'divides':
      return {
        claim: `If $n^2$ is a multiple of $${m}$, then $n$ is a multiple of $${m}$.`,
        template: `${m} {0} n^2 \\text{ and } ${m} {1} n`,
        answer: ['\\mid', '\\nmid'],
        distractors: ['=', '<', '>'],
      };
  }
}

const prfNegate: Generator<NegateParams> = {
  id: 'prf-negate',
  sample(rng, difficulty) {
    const family = rng.pick(
      difficulty >= 2 ? (['product', 'parity', 'divides'] as const) : (['sum', 'parity', 'product'] as const),
    );
    return {
      family,
      m: family === 'divides' ? rng.pick(SMALL_PRIMES) : rng.int(2, 12),
      c: rng.int(1, 12),
    };
  },
  render(params) {
    const { claim, template, answer, distractors } = negation(params);
    return {
      kind: 'tiles',
      prompt: [
        say(`To prove by contradiction: ${claim}`),
        say(
          `Build the assumption: the "if" part holds and the "then" part fails.${params.family === 'divides' ? ' ($a \\mid b$ means $a$ divides $b$.)' : ''}`,
        ),
      ],
      template,
      bank: fillBank(answer, distractors),
      answer,
    };
  },
  solution(params) {
    const { answer, template } = negation(params);
    const filled = answer.reduce((t, token, i) => t.replace(`{${i}}`, token), template);
    const hint: Record<NegateFamily, string> = {
      sum: `The opposite of "$a \\ge ${params.m}$ or $b \\ge ${params.m}$" is that both are less than $${params.m}$.`,
      product: `The opposite of "$a > ${params.m}$ or $b > ${params.m}$" is that neither is: both are at most $${params.m}$.`,
      parity: 'Keep the "if" part as it is, and take the other parity for $n$.',
      divides: `Keep "$${params.m}$ divides $n^2$", and say $${params.m}$ does not divide $n$.`,
    };
    return [{ text: hint[params.family] }, { tex: stackTex(filled) }];
  },
};

/* ---------- a contradiction, one decision at a time ---------- */

type ContraFamily = 'sqrt' | 'combo' | 'largest' | 'parity';

interface ContraParams {
  family: ContraFamily;
  p: number;
  m: number;
  n: number;
  c: number;
}

/**
 * `ma + nb = c` with no whole-number solution: m and n share exactly the
 * factor g, and c is not a multiple of it. Neither m nor n is g itself, so
 * "c is a multiple of m" can never read the same as "c is a multiple of g".
 */
export function sampleCombo(rng: Rng, gs: number[] = [2, 3, 5]): { m: number; n: number; c: number } {
  for (;;) {
    const g = rng.pick(gs);
    const u = rng.int(2, 6);
    const v = rng.int(2, 7);
    if (u === v || gcd(u, v) !== 1 || g * v >= 40) continue;
    return { m: g * u, n: g * v, c: g * rng.int(0, 4) + rng.int(1, g - 1) };
  }
}

function contraText({ family, p, m, n, c }: ContraParams): {
  claim: string;
  assume: string[];
  lead: string[];
} {
  const g = gcd(m, n);
  switch (family) {
    case 'sqrt':
      return {
        claim: `$\\sqrt{${p}}$ is irrational`,
        assume: [`$\\sqrt{${p}} = \\frac{a}{b}$, with no common factor`, `$\\sqrt{${p}}$ is irrational`, `$\\sqrt{${p}}$ is a whole number`],
        lead: [`$a$ and $b$ are both multiples of $${p}$`, `$a^2 = ${p}b$`, `$\\sqrt{${p}}$ has no last decimal place`],
      };
    case 'combo':
      return {
        claim: `no whole numbers $a$, $b$ have $${m}a + ${n}b = ${c}$`,
        assume: [`Whole numbers $a$, $b$ have $${m}a + ${n}b = ${c}$`, `No whole numbers $a$, $b$ have it`, `$a = 1$ and $b = 1$`],
        lead: [`$${c}$ is a multiple of $${g}$`, `$${c}$ is a multiple of $${m}$`, `$a$ and $b$ are multiples of $${g}$`],
      };
    case 'largest':
      return {
        claim: `there is no largest multiple of $${m}$`,
        assume: [`There is a largest multiple of $${m}$, $N$`, `There is no largest multiple of $${m}$`, `$N$ is not a multiple of $${m}$`],
        lead: [`$N + ${m}$ is a bigger multiple of $${m}$`, `$N - ${m}$ is a smaller multiple of $${m}$`, `$N + 1$ is a multiple of $${m}$`],
      };
    case 'parity': {
      const odd = c % 2 === 1;
      const other = odd ? 'even' : 'odd';
      // c can be 0, and then the expression is n^2, not n^2 + 0.
      const expr = c === 0 ? 'n^2' : `n^2 + ${c}`;
      return {
        claim: `if $${expr}$ is even, then $n$ is ${odd ? 'odd' : 'even'}`,
        assume: [`$${expr}$ is even and $n$ is ${other}`, `$${expr}$ is odd`, `$n$ is ${odd ? 'odd' : 'even'}`],
        lead: [`$${expr}$ is odd`, `$${expr}$ is a multiple of $4$`, `$n = ${c}$`],
      };
    }
  }
}

const prfContraFlow: Generator<ContraParams> = {
  id: 'prf-contra-flow',
  sample(rng, difficulty) {
    const family = rng.pick(
      difficulty >= 2 ? (['sqrt', 'combo', 'parity'] as const) : (['sqrt', 'combo', 'largest', 'parity'] as const),
    );
    const combo = sampleCombo(rng, [2, 3, 5, 7]);
    return {
      family,
      p: rng.pick([2, 3, 5, 7, 11, 13]),
      m: family === 'combo' ? combo.m : rng.int(2, 9),
      n: combo.n,
      c: family === 'combo' ? combo.c : rng.int(0, 12),
    };
  },
  render(params) {
    const { claim, assume, lead } = contraText(params);
    const key = `${claim}|${params.p}`;
    return {
      kind: 'flow',
      prompt: [say(`Prove by contradiction that ${claim}. Each answer chooses what gets asked next.`)],
      subject: '\\text{Proof by contradiction}',
      steps: [
        {
          id: 'assume',
          ask: 'What do you assume?',
          branches: turned(assume, key).map((label) => ({ label, to: 'lead' })),
        },
        {
          id: 'lead',
          ask: 'Working from that, you reach',
          branches: turned(lead, `${key}|lead`).map((label) => ({ label, to: 'so' })),
        },
        {
          id: 'so',
          ask: 'That cannot be true. So',
          branches: [
            { label: 'The assumption is false, and the claim is true', outcome: 'That is a proof by contradiction.' },
            { label: 'The claim is false', outcome: 'The impossible thing came from the assumption, not the claim.' },
            { label: 'Nothing: try an example', outcome: 'An example cannot prove a claim about every case.' },
          ],
        },
      ],
      answer: [assume[0], lead[0], 'The assumption is false, and the claim is true'],
    };
  },
  solution(params) {
    const { family, p, m, n, c } = params;
    const g = gcd(m, n);
    const middle: Record<ContraFamily, string> = {
      sqrt: `Squaring $\\sqrt{${p}} = \\frac{a}{b}$ gives $a^2 = ${p}b^2$, so $${p}$ divides $a$; writing $a = ${p}k$ gives $b^2 = ${p}k^2$, so $${p}$ divides $b$ too. That is a common factor.`,
      combo: `$${m}a + ${n}b = ${g}(${m / g}a + ${n / g}b)$ is a multiple of $${g}$, so $${c}$ would be too. It is not.`,
      largest: `$N + ${m}$ is a multiple of $${m}$ and bigger than $N$, so $N$ was not the largest.`,
      parity: `If $n$ is ${c % 2 === 1 ? 'even, $n = 2k$ and $n^2 + ' + c + ' = 4k^2 + ' + c + '$' : 'odd, $n = 2k + 1$ and $' + (c === 0 ? 'n^2' : 'n^2 + ' + c) + ' = 4k^2 + 4k + ' + (c + 1) + '$'}, which is odd.`,
    };
    const { assume } = contraText(params);
    return [
      { text: `Assume the opposite: ${assume[0]}.` },
      { text: middle[family] },
      { text: 'That contradicts what was assumed, so the assumption is false and the claim is true.' },
    ];
  },
};

/* ---------- ordering a proof by contradiction ---------- */

type ContraOrderParams =
  | { family: 'sqrt'; p: number; difficulty: number; picks: number[] }
  | { family: 'combo'; m: number; n: number; c: number; difficulty: number; picks: number[] }
  | { family: 'largest'; m: number; difficulty: number; picks: number[] }
  | { family: 'primes'; difficulty: number; picks: number[] }
  | { family: 'parity'; c: number; difficulty: number; picks: number[] };

function sqrtProof(p: number, difficulty: number): Proof {
  const open = `Suppose $\\sqrt{${p}} = \\frac{a}{b}$, where $a$ and $b$ are whole numbers with no common factor.`;
  const close = `So $a$ and $b$ share the factor $${p}$: a contradiction, so $\\sqrt{${p}}$ is irrational.`;
  const middle =
    difficulty >= 2
      ? [
          `Squaring both sides, $a^2 = ${p}b^2$, so $a^2$ is a multiple of $${p}$.`,
          `$${p}$ is prime, so $a$ is a multiple of $${p}$ too: write $a = ${p}c$.`,
          `Then $${p * p}c^2 = ${p}b^2$, so $b^2 = ${p}c^2$ and, in the same way, $b$ is a multiple of $${p}$.`,
        ]
      : [
          `Squaring both sides, $a^2 = ${p}b^2$, so $a$ is a multiple of $${p}$: write $a = ${p}c$.`,
          `Then $b^2 = ${p}c^2$, so $b$ is a multiple of $${p}$ too.`,
        ];
  return {
    claim: `Prove that $\\sqrt{${p}}$ is irrational.`,
    steps: [open, ...middle, close],
    pool: [
      {
        text: `Suppose $\\sqrt{${p}}$ is irrational, so it cannot be written as a fraction.`,
        why: 'That assumes the claim. A contradiction proof assumes the opposite.',
      },
      {
        text: `Squaring both sides, $a^2 = ${p}b$.`,
        why: `Squaring $\\frac{a}{b}$ squares the bottom too: $a^2 = ${p}b^2$.`,
      },
      {
        text: `A calculator gives $\\sqrt{${p}} = ${Math.sqrt(p).toFixed(6)}\\dots$, which never repeats.`,
        why: 'Seeing some decimal places cannot show they never repeat.',
      },
      {
        text: 'So $a$ and $b$ are both odd: a contradiction.',
        why: 'Nothing above shows that, and two odd numbers can have no common factor.',
      },
    ],
  };
}

function comboProof(m: number, n: number, c: number, difficulty: number): Proof {
  const g = gcd(m, n);
  const inner = `${m / g === 1 ? '' : m / g}a + ${n / g === 1 ? '' : n / g}b`;
  const open = `Suppose there are whole numbers $a$ and $b$ with $${m}a + ${n}b = ${c}$.`;
  const factor = `Taking out $${g}$, that says $${g}(${inner}) = ${c}$.`;
  const multiple = `$${inner}$ is a whole number, so $${c}$ is a multiple of $${g}$.`;
  const close = `But $${c} = ${g} \\times ${Math.floor(c / g)} + ${c % g}$ is not a multiple of $${g}$: a contradiction, so no such $a$ and $b$ exist.`;
  const steps =
    difficulty >= 2
      ? [open, factor, `$${inner}$ is a whole number, so the left side is a multiple of $${g}$.`, `So $${c}$ is a multiple of $${g}$.`, close]
      : [open, factor, multiple, close];
  return {
    claim: `Prove that there are no whole numbers $a$ and $b$ with $${m}a + ${n}b = ${c}$.`,
    steps,
    pool: [
      {
        text: `Suppose there are no whole numbers $a$ and $b$ with $${m}a + ${n}b = ${c}$.`,
        why: 'That assumes the claim. A contradiction proof assumes the opposite.',
      },
      {
        text: `Taking out $${g}$, that says $${g}(${m / g === 1 ? '' : m / g}a + ${n}b) = ${c}$.`,
        why: `The $b$ term has to be divided by $${g}$ as well: $${n / g === 1 ? '' : n / g}b$.`,
      },
      {
        text: `Trying $a = 1$ and $b = 1$ gives $${m + n}$, not $${c}$.`,
        why: 'One pair is not every pair.',
      },
      {
        text: `So $${c}$ is a multiple of $${m}$.`,
        why: `Nothing shows that: the common factor is $${g}$.`,
      },
    ],
  };
}

function largestProof(m: number, difficulty: number): Proof {
  const open = `Suppose there is a largest multiple of $${m}$, and call it $N$.`;
  const form = `Then $N = ${m}k$ for some whole number $k$.`;
  const next = `So $N + ${m} = ${m}(k + 1)$ is also a multiple of $${m}$.`;
  const close =
    difficulty >= 2
      ? [`$N + ${m}$ is bigger than $N$, so $N$ was not the largest: a contradiction.`, `So there is no largest multiple of $${m}$.`]
      : [`$N + ${m}$ is bigger than $N$: a contradiction, so there is no largest multiple of $${m}$.`];
  return {
    claim: `Prove that there is no largest multiple of $${m}$.`,
    steps: [open, form, next, ...close],
    pool: [
      {
        text: `Suppose there is no largest multiple of $${m}$.`,
        why: 'That assumes the claim. A contradiction proof assumes the opposite.',
      },
      { text: `So $N + 1 = ${m}k + 1$ is also a multiple of $${m}$.`, why: `$${m}k + 1$ leaves remainder $1$, so it is not.` },
      {
        text: `The multiples of $${m}$ go on for ever, so there is no largest.`,
        why: 'That is the claim itself, not a reason for it.',
      },
    ],
  };
}

function primesProof(difficulty: number): Proof {
  const close =
    difficulty >= 2
      ? ['But $N > 1$ has a prime factor, and it is not on the list: a contradiction.', 'So there are infinitely many primes.']
      : ['But $N > 1$ has a prime factor, and it is not on the list: a contradiction, so there are infinitely many primes.'];
  return {
    claim: 'Prove that there are infinitely many prime numbers.',
    steps: [
      'Suppose there are only finitely many primes, $p_1, p_2, \\dots, p_n$.',
      'Let $N = p_1 p_2 \\cdots p_n + 1$.',
      'Dividing $N$ by any $p_i$ leaves remainder $1$, so none of them divides $N$.',
      ...close,
    ],
    pool: [
      { text: 'Suppose there are infinitely many primes.', why: 'That assumes the claim. A contradiction proof assumes the opposite.' },
      { text: 'Let $N = p_1 p_2 \\cdots p_n$.', why: 'Every $p_i$ divides that $N$, so it leads nowhere.' },
      {
        text: 'So $N$ must be prime.',
        why: 'Not necessarily: $N$ may only have a prime factor that is missing from the list.',
      },
    ],
  };
}

function parityProof(c: number, difficulty: number): Proof {
  const odd = c % 2 === 1;
  const want = odd ? 'odd' : 'even';
  const other = odd ? 'even' : 'odd';
  const form = odd ? '2k' : '2k + 1';
  const expanded = odd ? `4k^2 + ${c}` : `4k^2 + 4k + ${c + 1}`;
  const factored = odd ? `2(2k^2 + ${(c - 1) / 2}) + 1` : `2(2k^2 + 2k + ${c / 2}) + 1`;
  const middle =
    difficulty >= 2
      ? [`Then $n^2 + ${c} = ${expanded}$.`, `That is $${factored}$, which is odd.`]
      : [`Then $n^2 + ${c} = ${expanded} = ${factored}$, which is odd.`];
  return {
    claim: `Prove that if $n^2 + ${c}$ is even, then $n$ is ${want}.`,
    steps: [
      `Suppose $n^2 + ${c}$ is even but $n$ is ${other}.`,
      `Then $n = ${form}$ for some whole number $k$.`,
      ...middle,
      `That contradicts $n^2 + ${c}$ being even, so $n$ is ${want}.`,
    ],
    pool: [
      { text: `Suppose $n^2 + ${c}$ is odd.`, why: 'That is not the opposite of the claim: keep the "if" part, deny the "then" part.' },
      {
        text: `Then $n = ${odd ? '2k + 1' : '2k'}$ for some whole number $k$.`,
        why: `That is ${want}, which is what we are proving, not what we assumed.`,
      },
      {
        text: `Checking $n = ${odd ? 3 : 2}$: $n^2 + ${c} = ${(odd ? 9 : 4) + c}$, which is even.`,
        why: 'One example is not a proof.',
      },
    ],
  };
}

function contraProof(params: ContraOrderParams): Proof {
  switch (params.family) {
    case 'sqrt':
      return sqrtProof(params.p, params.difficulty);
    case 'combo':
      return comboProof(params.m, params.n, params.c, params.difficulty);
    case 'largest':
      return largestProof(params.m, params.difficulty);
    case 'primes':
      return primesProof(params.difficulty);
    case 'parity':
      return parityProof(params.c, params.difficulty);
  }
}

const prfOrderContradiction: Generator<ContraOrderParams> = {
  id: 'prf-order-contradiction',
  sample(rng, difficulty) {
    const family = rng.pick(['sqrt', 'combo', 'largest', 'primes', 'parity'] as const);
    const base: ContraOrderParams = (() => {
      switch (family) {
        case 'sqrt':
          return { family, p: rng.pick(SMALL_PRIMES), difficulty, picks: [] };
        case 'combo':
          return { family, ...sampleCombo(rng), difficulty, picks: [] };
        case 'largest':
          return { family, m: rng.int(2, 9), difficulty, picks: [] };
        case 'primes':
          return { family, difficulty, picks: [] };
        case 'parity':
          return { family, c: rng.int(2, 12), difficulty, picks: [] };
      }
    })();
    return { ...base, picks: pickDistractors(rng, contraProof(base), difficulty) };
  },
  render(params) {
    return orderSlide(contraProof(params), params.picks);
  },
  solution(params) {
    return orderSolution(contraProof(params), params.picks);
  },
};

/* ================================================================
 * Lesson 5: reading a proof
 * ================================================================ */

type MissingParams =
  | { family: 'oddSquare'; c: number; line: 1 | 2; extra: number }
  | { family: 'consecutive'; k: number; line: 1 | 2; extra: number }
  | { family: 'diffSquares'; a: number; line: 0 | 1; extra: number };

interface MissingProof {
  claim: string;
  lines: string[];
  template: string;
  answer: string[];
  distractors: string[];
}

function missingProof(params: MissingParams): MissingProof {
  switch (params.family) {
    case 'oddSquare': {
      const { c } = params;
      const s = 1 + c;
      const q = Math.floor(s / 2);
      const t = s % 2;
      const word = t ? 'odd' : 'even';
      const lines = [
        '$n$ is odd, so $n = 2k + 1$ for a whole number $k$.',
        `$n^2 + ${c} = 4k^2 + 4k + ${s}$.`,
        `$= 2(2k^2 + 2k + ${q})${t ? ' + 1' : ''}$.`,
        `$2k^2 + 2k + ${q}$ is a whole number, so $n^2 + ${c}$ is ${word}.`,
      ];
      return params.line === 1
        ? {
            claim: `If $n$ is odd, then $n^2 + ${c}$ is ${word}.`,
            lines,
            template: `n^2 + ${c} = {0} + {1} + {2}`,
            answer: ['4k^2', '4k', String(s)],
            distractors: ['2k^2', '2k', String(c), String(s + 1), '4k^2 + 1'],
          }
        : {
            claim: `If $n$ is odd, then $n^2 + ${c}$ is ${word}.`,
            lines,
            template: `= 2({0} + {1} + {2})${t ? ' + 1' : ''}`,
            answer: ['2k^2', '2k', String(q)],
            distractors: ['4k^2', '4k', String(s), String(q + 1), 'k^2'],
          };
    }
    case 'consecutive': {
      const { k } = params;
      const m = (k - 1) / 2;
      const total = k * m;
      const list = k === 3 ? '$n$, $n + 1$ and $n + 2$' : `$n$, $n + 1$, $\\dots$, $n + ${k - 1}$`;
      const lines = [
        `Call the smallest of the numbers $n$, so they are ${list}.`,
        `Their sum is $${k}n + ${total}$.`,
        `$= ${k}(n + ${m})$.`,
        `$n + ${m}$ is a whole number, so the sum is a multiple of $${k}$.`,
      ];
      const claim = `The sum of any $${k}$ consecutive whole numbers is a multiple of $${k}$.`;
      return params.line === 1
        ? {
            claim,
            lines,
            template: `\\text{Sum} = {0} + {1}`,
            answer: [`${k}n`, String(total)],
            distractors: ['n', String(total - 1), String(k * (k - 1)), `${k - 1}n`],
          }
        : {
            claim,
            lines,
            template: `${k}n + ${total} = ${k}({0} + {1})`,
            answer: ['n', String(m)],
            distractors: [`${k}n`, String(total), String(m + 1), String(k)],
          };
    }
    case 'diffSquares': {
      const { a } = params;
      const lines = [
        `$(n + ${a})^2 = n^2 + ${2 * a}n + ${a * a}$.`,
        `$(n - ${a})^2 = n^2 - ${2 * a}n + ${a * a}$.`,
        `Subtracting, the $n^2$ and $${a * a}$ terms cancel, leaving $${4 * a}n$.`,
        `$n$ is a whole number, so $(n + ${a})^2 - (n - ${a})^2$ is a multiple of $${4 * a}$.`,
      ];
      const claim = `$(n + ${a})^2 - (n - ${a})^2$ is a multiple of $${4 * a}$ for every whole number $n$.`;
      return params.line === 0
        ? {
            claim,
            lines,
            template: `(n + ${a})^2 = {0} + {1} + {2}`,
            answer: ['n^2', `${2 * a}n`, String(a * a)],
            distractors: [coeffTex(a, 'n'), String(2 * a), coeffTex(a * a, 'n'), String(a * a + 1)],
          }
        : {
            claim,
            lines,
            template: `(n - ${a})^2 = {0} - {1} + {2}`,
            answer: ['n^2', `${2 * a}n`, String(a * a)],
            distractors: [coeffTex(a, 'n'), String(2 * a), coeffTex(a * a, 'n'), String(a * a + 1)],
          };
    }
  }
}

const prfMissingLine: Generator<MissingParams> = {
  id: 'prf-missing-line',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const family = rng.pick(['oddSquare', 'consecutive', 'diffSquares'] as const);
    const extra = hard ? 4 : 2;
    switch (family) {
      case 'oddSquare':
        return { family, c: rng.int(1, hard ? 15 : 9), line: rng.pick([1, 2] as const), extra };
      case 'consecutive':
        return { family, k: rng.pick([3, 5, 7, 9]), line: rng.pick([1, 2] as const), extra };
      case 'diffSquares':
        return { family, a: rng.int(hard ? 3 : 1, hard ? 9 : 5), line: rng.pick([0, 1] as const), extra };
    }
  },
  render(params) {
    const proof = missingProof(params);
    const lines = proof.lines.map((line, i) => (i === params.line ? `${i + 1}. …` : `${i + 1}. ${line}`));
    return {
      kind: 'tiles',
      prompt: [
        say(`Claim: ${proof.claim}`),
        ...lines.map(say),
        say(`Line ${params.line + 1} is missing. Build it.`),
      ],
      template: proof.template,
      bank: fillBank(proof.answer, proof.distractors, 2, params.extra),
      answer: proof.answer,
    };
  },
  solution(params) {
    const proof = missingProof(params);
    return [
      { text: `Line ${params.line + 1} has to turn the line above it into the line below it:` },
      { text: proof.lines[params.line] },
      { text: `Then line ${params.line + 2} follows from it.` },
    ];
  },
};

/* ---------- finding the flaw ---------- */

type FlawFamily = 'oddSquare' | 'consecutive' | 'diffSquares' | 'oddSum';

interface FlawParams {
  family: FlawFamily;
  n: number;
  /** Which line is wrong, 0-based. */
  wrong: number;
}

function flawLines({ family, n }: FlawParams): { claim: string; right: string[]; broken: string[]; why: string[] } {
  switch (family) {
    case 'oddSquare': {
      const s = 1 + n;
      const q = Math.floor(s / 2);
      const t = s % 2;
      const word = t ? 'odd' : 'even';
      return {
        claim: `If $n$ is odd, then $n^2 + ${n}$ is ${word}.`,
        right: [
          '$n$ is odd, so $n = 2k + 1$ for a whole number $k$.',
          `Then $n^2 + ${n} = 4k^2 + 4k + ${s}$.`,
          `That is $2(2k^2 + 2k + ${q})${t ? ' + 1' : ''}$.`,
          `$2k^2 + 2k + ${q}$ is a whole number, so $n^2 + ${n}$ is ${word}.`,
        ],
        broken: [
          '$n$ is odd, so $n = 2k$ for a whole number $k$.',
          `Then $n^2 + ${n} = 4k^2 + ${s}$.`,
          `That is $2(2k^2 + 2k + ${q + 1})${t ? ' + 1' : ''}$.`,
          `$2k^2 + 2k + ${q}$ is a whole number, so $n^2 + ${n}$ is ${t ? 'even' : 'odd'}.`,
        ],
        why: [
          '$2k$ is even. An odd number is $2k + 1$.',
          '$(2k + 1)^2 = 4k^2 + 4k + 1$: the middle term is missing.',
          `$2 \\times ${q + 1}$ is $${2 * q + 2}$, not $${2 * q}$.`,
          `$2 \\times$ a whole number${t ? ', plus $1$,' : ''} is ${word}.`,
        ],
      };
    }
    case 'consecutive': {
      const k = n;
      const m = (k - 1) / 2;
      const total = k * m;
      return {
        claim: `The sum of any $${k}$ consecutive whole numbers is a multiple of $${k}$.`,
        right: [
          `Call the smallest $n$, so the numbers are $n$, $n + 1$, $\\dots$, $n + ${k - 1}$.`,
          `Their sum is $${k}n + ${total}$.`,
          `That is $${k}(n + ${m})$.`,
          `$n + ${m}$ is a whole number, so the sum is a multiple of $${k}$.`,
        ],
        broken: [
          `Call the smallest $n$, so the numbers are $n$, $n + 2$, $\\dots$, $n + ${2 * (k - 1)}$.`,
          `Their sum is $${k}n + ${total - 1}$.`,
          `That is $${k}(n + ${total})$.`,
          `$n + ${m}$ is a whole number, so the sum is even.`,
        ],
        why: [
          'Those go up in twos, so they are not consecutive.',
          `$1 + 2 + \\dots + ${k - 1} = ${total}$.`,
          `$${k}(n + ${total})$ is $${k}n + ${k * total}$.`,
          'That does not follow, and the claim is about multiples of $' + k + '$.',
        ],
      };
    }
    case 'diffSquares': {
      const a = n;
      return {
        claim: `$(n + ${a})^2 - (n - ${a})^2$ is a multiple of $${4 * a}$.`,
        right: [
          `$(n + ${a})^2 = n^2 + ${2 * a}n + ${a * a}$.`,
          `$(n - ${a})^2 = n^2 - ${2 * a}n + ${a * a}$.`,
          `Subtracting, the $n^2$ and $${a * a}$ terms cancel, leaving $${4 * a}n$.`,
          `$n$ is a whole number, so the difference is a multiple of $${4 * a}$.`,
        ],
        broken: [
          `$(n + ${a})^2 = n^2 + ${a * a}$.`,
          `$(n - ${a})^2 = n^2 - ${2 * a}n - ${a * a}$.`,
          `Subtracting, the $n^2$ and $${a * a}$ terms cancel, leaving $${2 * a}n$.`,
          `Checking $n = 1$ gives $${(1 + a) ** 2 - (1 - a) ** 2}$, so the difference is a multiple of $${4 * a}$.`,
        ],
        why: [
          `Squaring a bracket gives a middle term: $${2 * a}n$.`,
          `$(-${a})^2 = +${a * a}$.`,
          `$${2 * a}n - (-${2 * a}n) = ${4 * a}n$.`,
          'One example does not prove it for every $n$.',
        ],
      };
    }
    case 'oddSum': {
      const g = 2 * n;
      return {
        claim: `The sum of two odd numbers that differ by $${g}$ is even.`,
        right: [
          'Write the smaller as $2k + 1$, for a whole number $k$.',
          `The larger is $${g}$ more: $2k + ${1 + g}$.`,
          `Their sum is $4k + ${2 + g} = 2(2k + ${1 + n})$.`,
          `$2k + ${1 + n}$ is a whole number, so the sum is even.`,
        ],
        broken: [
          'Write the smaller as $k + 1$, for a whole number $k$.',
          `The larger is $${g}$ more: $2k + ${g}$.`,
          `Their sum is $4k + ${2 + g} = 4(k + ${2 + g})$.`,
          `Checking $1 + ${1 + g} = ${2 + g}$, so the sum is always even.`,
        ],
        why: [
          '$k + 1$ is odd for only half of all $k$. An odd number is $2k + 1$.',
          `$${g}$ more than $2k + 1$ is $2k + ${1 + g}$.`,
          `$4(k + ${2 + g})$ multiplies out to $4k + ${4 * (2 + g)}$.`,
          'One example does not prove it for every pair.',
        ],
      };
    }
  }
}

const prfFindFlaw: Generator<FlawParams> = {
  id: 'prf-find-flaw',
  sample(rng, difficulty) {
    const family = rng.pick(['oddSquare', 'consecutive', 'diffSquares', 'oddSum'] as const);
    const hard = difficulty >= 2;
    const n =
      family === 'consecutive'
        ? rng.pick([3, 5, 7])
        : family === 'oddSquare'
          ? rng.int(1, hard ? 15 : 9)
          : rng.int(hard ? 2 : 1, hard ? 9 : 5);
    return { family, n, wrong: rng.int(hard ? 1 : 0, 3) };
  },
  render(params) {
    const { claim, right, broken } = flawLines(params);
    const lines = right.map((line, i) => (i === params.wrong ? broken[i] : line));
    return {
      kind: 'choice',
      prompt: [
        say(`Claim: ${claim}`),
        ...lines.map((line, i) => say(`**Line ${i + 1}.** ${line}`)),
        say('One line of this proof is wrong. Which?'),
      ],
      options: lines.map((_, i) => ({ id: `line${i}`, label: `Line ${i + 1}`, tex: false })),
      correctId: `line${params.wrong}`,
    };
  },
  solution(params) {
    const { right, why } = flawLines(params);
    return [
      { text: `Line ${params.wrong + 1} is wrong. ${why[params.wrong]}` },
      { text: `It should read: ${right[params.wrong]}` },
    ];
  },
};

/* ---------- choosing a method ---------- */

type Method = 'counter' | 'cases' | 'contra' | 'direct';

interface MethodParams {
  method: Method;
  n: number;
  variant: number;
}

function methodClaim({ method, n, variant }: MethodParams): { claim: string; reason: string } {
  switch (method) {
    case 'counter': {
      const c = PRIME_CLAIMS[n];
      const fail = Array.from({ length: 20 }, (_, i) => i + 1).find((x) => !isPrime(c.f(x))) as number;
      return {
        claim: `$${c.tex}$ is prime for every positive whole number $n$.`,
        reason: `It fails at $n = ${fail}$: $${c.at(fail)} = ${c.f(fail)} = ${factorTex(c.f(fail))}$. One counterexample disproves it.`,
      };
    }
    case 'cases':
      return variant % 2 === 0
        ? {
            claim: `$n^2 + ${n}$ is never a multiple of $3$, for any whole number $n$.`,
            reason: 'It depends on the remainder of $n$ on division by $3$: three cases cover every $n$.',
          }
        : {
            claim: `Every whole number from $${n}$ to $${n + 4}$ has a factor other than $1$ and itself.`,
            reason: 'It is about a short list: check each of the five numbers in turn.',
          };
    case 'contra':
      return variant % 2 === 0
        ? {
            claim: `$\\sqrt{${NON_SQUARES[n % NON_SQUARES.length]}}$ is irrational.`,
            reason: 'Irrational means "not a fraction": suppose it is one, and reach something impossible.',
          }
        : {
            claim: `There is no largest multiple of $${n}$.`,
            reason: 'Suppose there is a largest one and show a bigger one exists.',
          };
    case 'direct':
      return variant % 2 === 0
        ? {
            claim: `The sum of any $${n}$ consecutive whole numbers is a multiple of $${n}$.`,
            reason: `Call them $m$, $m + 1$, $\\dots$, $m + ${n - 1}$ and add: $${n}m + ${(n * (n - 1)) / 2} = ${n}(m + ${(n - 1) / 2})$.`,
          }
        : {
            claim: `$(n + ${n})^2 - (n - ${n})^2$ is a multiple of $${4 * n}$.`,
            reason: `Expand both squares and simplify to $${4 * n}n$.`,
          };
  }
}

/** Claims that fail by n = 12, so "can you find a value?" is a fair ask. */
const EARLY_FAILURES = PRIME_CLAIMS.map((c, i) => ({ c, i }))
  .filter(({ c }) => Array.from({ length: 12 }, (_, n) => n + 1).some((n) => !isPrime(c.f(n))))
  .map(({ i }) => i);

/** Whole numbers whose next five include no prime, for the short-list claims. */
const COMPOSITE_RUNS = [24, 32, 48, 62, 74, 90, 114, 116, 140, 182, 200];

const prfMethodFlow: Generator<MethodParams> = {
  id: 'prf-method-flow',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const method = rng.pick(['counter', 'cases', 'contra', 'direct'] as const);
    const variant = rng.int(0, 1);
    switch (method) {
      case 'counter':
        // The famous-looking quadratics first; every claim fails below 20.
        return { method, n: rng.pick(hard ? EARLY_FAILURES : EARLY_FAILURES.filter((i) => i < 6)), variant };
      case 'cases':
        return variant === 1
          ? { method, n: rng.pick(COMPOSITE_RUNS), variant }
          : { method, n: rng.pick([1, 4, 7, 10, 13, 16, 19]), variant };
      case 'contra':
        return { method, n: variant === 1 ? rng.int(2, 12) : rng.int(0, NON_SQUARES.length - 1), variant };
      case 'direct':
        return { method, n: variant === 0 ? rng.pick([3, 5, 7, 9, 11]) : rng.int(1, 12), variant };
    }
  },
  render(params) {
    const { claim } = methodClaim(params);
    const answer: Record<Method, string[]> = {
      counter: ['Yes', 'Give one counterexample'],
      cases: ['No', 'Yes'],
      contra: ['No', 'No', 'Yes', 'Proof by contradiction'],
      direct: ['No', 'No', 'No', 'Direct proof'],
    };
    return {
      kind: 'flow',
      prompt: [say(`Claim: ${claim}`), say('Choose how to settle it. Each answer chooses what gets asked next.')],
      subject: '\\text{Which method?}',
      steps: [
        {
          id: 'false',
          ask: 'Can you find a value where the claim is false?',
          branches: [
            { label: 'Yes', to: 'give' },
            { label: 'No', to: 'cases' },
          ],
        },
        {
          id: 'give',
          ask: 'So to settle it, you',
          branches: [
            { label: 'Give one counterexample', outcome: 'Disproof by counterexample.' },
            { label: 'Prove it fails for every value', outcome: 'One failure is already enough.' },
            { label: 'Test more values where it holds', outcome: 'Values where it holds never settle it.' },
          ],
        },
        {
          id: 'cases',
          ask: 'Is it about a short list of numbers, or does it hang on the remainder of $n$?',
          branches: [
            { label: 'Yes', outcome: 'Proof by exhaustion: every case in turn.' },
            { label: 'No', to: 'contra' },
          ],
        },
        {
          id: 'contra',
          ask: 'Does it say something is impossible, or "not a fraction", or "no largest"?',
          branches: [
            { label: 'Yes', to: 'contraName' },
            { label: 'No', to: 'directName' },
          ],
        },
        {
          id: 'contraName',
          ask: 'So you would use',
          branches: [
            { label: 'Proof by contradiction', outcome: 'Assume the opposite and reach something impossible.' },
            { label: 'Direct proof', outcome: 'A direct proof has nowhere to start from here.' },
          ],
        },
        {
          id: 'directName',
          ask: 'So you would use',
          branches: [
            { label: 'Direct proof', outcome: 'Start from what you know and work to the claim.' },
            { label: 'Proof by contradiction', outcome: 'There is nothing impossible to aim for here.' },
          ],
        },
      ],
      answer: answer[params.method],
    };
  },
  solution(params) {
    const { reason } = methodClaim(params);
    const name: Record<Method, string> = {
      counter: 'Disproof by counterexample.',
      cases: 'Proof by exhaustion.',
      contra: 'Proof by contradiction.',
      direct: 'Direct proof.',
    };
    return [{ text: name[params.method] }, { text: reason }];
  },
};

/* ================================================================
 * Level 3: Logic and Implication
 *
 * What `P \Rightarrow Q` says and which way it runs, the converse, the
 * contrapositive, necessary against sufficient, and proofs of an
 * "if and only if" one direction at a time.
 *
 * Every statement carries a test (`holds`), and whether one implies another
 * is decided by trying both over a spread of numbers (`breaks`), never read
 * off the shape of the family: a slide that calls an implication true or
 * false has checked it first, and its counterexample is the one it found.
 * ================================================================ */

/** A statement about `x`, or about a whole number `n`, with its negation. */
interface Statement {
  /** TeX the learner reads: `x^2 = 9`, `n \\text{ is a multiple of } 4`. */
  tex: string;
  /** Its negation, written the same way: `x^2 \\ne 9`. */
  neg: string;
  holds: (x: number) => boolean;
}

interface Pair {
  p: Statement;
  q: Statement;
  /** About a whole number `n` rather than a real `x`. */
  whole: boolean;
}

type PairFamily =
  | 'square'
  | 'bigger'
  | 'multiple'
  | 'factor'
  | 'sqLess'
  | 'cube'
  | 'linear'
  | 'shift'
  | 'coprime'
  | 'bigSquare';

interface PairParams {
  family: PairFamily;
  a: number;
  b: number;
  c: number;
}

/** `P \Rightarrow Q` true, its converse false. */
const ONE_WAY: PairFamily[] = ['square', 'bigger', 'multiple', 'factor', 'sqLess'];
/** True both ways. */
const BOTH_WAYS: PairFamily[] = ['cube', 'linear', 'shift'];
/** False both ways. */
const NEITHER_WAY: PairFamily[] = ['coprime', 'bigSquare'];

const eqS = (a: number): Statement => ({ tex: `x = ${a}`, neg: `x \\ne ${a}`, holds: (x) => x === a });
const gtS = (a: number): Statement => ({ tex: `x > ${a}`, neg: `x \\le ${a}`, holds: (x) => x > a });
const ltS = (a: number): Statement => ({ tex: `x < ${a}`, neg: `x \\ge ${a}`, holds: (x) => x < a });
const multS = (m: number): Statement => ({
  tex: `n \\text{ is a multiple of } ${m}`,
  neg: `n \\text{ is not a multiple of } ${m}`,
  holds: (n) => mod(n, m) === 0,
});

/** `(x - 3)(x + 2)`; a root of 0 is written `x` and goes first. */
function rootsTex(a: number, b: number): string {
  const bracket = (r: number) => (r === 0 ? 'x' : `(${lin(1, -r, 'x')})`);
  return b === 0 ? `${bracket(b)}${bracket(a)}` : `${bracket(a)}${bracket(b)}`;
}

/** A number as it sits after `\times`: brackets round a negative. */
const at = (n: number) => (n < 0 ? `(${n})` : `${n}`);

function pairOf({ family, a, b, c }: PairParams): Pair {
  switch (family) {
    case 'square':
      return {
        p: eqS(a),
        q: { tex: `x^2 = ${a * a}`, neg: `x^2 \\ne ${a * a}`, holds: (x) => x * x === a * a },
        whole: false,
      };
    case 'bigger':
      return { p: gtS(a), q: gtS(b), whole: false };
    case 'multiple':
    case 'coprime':
      return { p: multS(a), q: multS(b), whole: true };
    case 'factor': {
      const tex = rootsTex(a, b);
      return {
        p: eqS(a),
        q: { tex: `${tex} = 0`, neg: `${tex} \\ne 0`, holds: (x) => (x - a) * (x - b) === 0 },
        whole: false,
      };
    }
    case 'sqLess':
      return {
        p: { tex: `x^2 < ${a * a}`, neg: `x^2 \\ge ${a * a}`, holds: (x) => x * x < a * a },
        q: ltS(a),
        whole: false,
      };
    case 'cube':
      return {
        p: eqS(a),
        q: { tex: `x^3 = ${a ** 3}`, neg: `x^3 \\ne ${a ** 3}`, holds: (x) => x ** 3 === a ** 3 },
        whole: false,
      };
    case 'linear': {
      // b is the coefficient, c the constant and a the root.
      const left = lin(b, c, 'x');
      const v = b * a + c;
      return {
        p: { tex: `${left} = ${v}`, neg: `${left} \\ne ${v}`, holds: (x) => b * x + c === v },
        q: eqS(a),
        whole: false,
      };
    }
    case 'shift': {
      const left = lin(1, b, 'x');
      return {
        p: gtS(a),
        q: { tex: `${left} > ${a + b}`, neg: `${left} \\le ${a + b}`, holds: (x) => x + b > a + b },
        whole: false,
      };
    }
    case 'bigSquare':
      return {
        p: gtS(a),
        q: { tex: `x^2 > ${b * b}`, neg: `x^2 \\le ${b * b}`, holds: (x) => x * x > b * b },
        whole: false,
      };
  }
}

function samplePair(rng: Rng, family: PairFamily): PairParams {
  const signed = (lo: number, hi: number) => rng.int(lo, hi) * rng.sign();
  switch (family) {
    case 'square':
    case 'cube':
      return { family, a: signed(2, 9), b: 0, c: 0 };
    case 'bigger': {
      const a = rng.int(-3, 9);
      return { family, a, b: a - rng.int(1, 6), c: 0 };
    }
    case 'multiple': {
      const m = rng.pick([2, 3, 4, 5]);
      return { family, a: m * rng.pick([2, 3, 4]), b: m, c: 0 };
    }
    case 'factor': {
      const a = signed(1, 6);
      let b = rng.int(-6, 6);
      while (b === a) b = rng.int(-6, 6);
      return { family, a, b, c: 0 };
    }
    case 'sqLess':
      return { family, a: rng.int(2, 9), b: 0, c: 0 };
    case 'linear':
      return { family, a: signed(1, 9), b: rng.int(2, 6), c: signed(1, 9) };
    case 'shift':
      return { family, a: rng.int(-5, 9), b: signed(1, 9), c: 0 };
    case 'coprime': {
      const [a, b] = rng.sample([2, 3, 5, 7], 2);
      return { family, a, b, c: 0 };
    }
    case 'bigSquare': {
      const a = rng.int(-2, 3);
      return { family, a, b: rng.int(Math.max(2, a + 1), a + 4), c: 0 };
    }
  }
}

/** Values to test a statement at, nearest 0 first; halves too, for a real x. */
function testValues(whole: boolean): number[] {
  const ints = [0];
  for (let k = 1; k <= 40; k += 1) ints.push(k, -k);
  if (whole) return ints;
  return [...ints, ...ints.filter((k) => k < 40).map((k) => k + 0.5)];
}

const WHOLE_TESTS = testValues(true);
const REAL_TESTS = testValues(false);

/** The simplest value making `from` true and `to` false, or undefined if none. */
function breaks(from: Statement, to: Statement, whole: boolean): number | undefined {
  return (whole ? WHOLE_TESTS : REAL_TESTS).find((x) => from.holds(x) && !to.holds(x));
}

const implies = (from: Statement, to: Statement, whole: boolean) => breaks(from, to, whole) === undefined;

/** Why `P \Rightarrow Q` (forward) or `Q \Rightarrow P` holds, for a direction that does. */
function holdsWhy({ family, a, b, c }: PairParams, forward: boolean): string {
  switch (family) {
    case 'square':
      return `squaring $${a}$ gives $${a * a}$`;
    case 'bigger':
      return `every number above $${a}$ is above $${b}$ too`;
    case 'multiple':
      return `$${a} = ${b} \\times ${a / b}$, so every multiple of $${a}$ is a multiple of $${b}$`;
    case 'factor':
      return `$x = ${a}$ makes the bracket $(${lin(1, -a, 'x')})$ zero`;
    case 'sqLess':
      return `$x^2 < ${a * a}$ means $-${a} < x < ${a}$`;
    case 'cube':
      return forward ? `cubing $${a}$ gives $${a ** 3}$` : `$${a ** 3}$ has only one real cube root, $${a}$`;
    case 'linear':
      return forward
        ? `${c > 0 ? `taking away $${c}$` : `adding $${-c}$`} and dividing by $${b}$ gives $x = ${a}$`
        : `putting $x = ${a}$ in gives $${b} \\times ${at(a)} ${c > 0 ? '+' : '-'} ${Math.abs(c)} = ${b * a + c}$`;
    case 'shift':
      return forward
        ? 'adding the same number to both sides keeps an inequality true'
        : 'taking the same number off both sides keeps an inequality true';
    default:
      return 'it holds for every value';
  }
}

/** One direction of a pair: true with its reason, or false with a counterexample. */
function directionText(params: PairParams, forward: boolean): string {
  const { p, q, whole } = pairOf(params);
  const [from, to] = forward ? [p, q] : [q, p];
  const arrow = `$${from.tex} \\Rightarrow ${to.tex}$`;
  const x = breaks(from, to, whole);
  if (x === undefined) return `${arrow} is true: ${holdsWhy(params, forward)}.`;
  return `${arrow} is false: $${whole ? 'n' : 'x'} = ${x}$ makes $${from.tex}$ true but $${to.tex}$ false.`;
}

/** A reminder that `n` is whole, where the statements are about `n`. */
const wholeNote = (whole: boolean) => (whole ? ' Here $n$ is a whole number.' : '');

/**
 * "If P, then Q." in one of several wordings. 0 to 2 put the condition
 * first; 3 and 4 put it second, which is where learners turn it round; 5 is
 * the arrow itself.
 */
function phrase(p: string, q: string, wording: number): string {
  const P = `$${p}$`;
  const Q = `$${q}$`;
  switch (wording) {
    case 0:
      return `If ${P}, then ${Q}.`;
    case 1:
      return `${P} implies ${Q}.`;
    case 2:
      return `Whenever ${P}, ${Q}.`;
    case 3:
      return `${Q} if ${P}.`;
    case 4:
      return `${Q} whenever ${P}.`;
    default:
      return `$${p} \\Rightarrow ${q}$.`;
  }
}

const imp = (a: string, b: string) => `${a} \\Rightarrow ${b}`;
const iff = (a: string, b: string) => `${a} \\Leftrightarrow ${b}`;

/**
 * An implication for a display line. Two sentences in words run past a
 * phone's width on one line, so those stack with the arrow pointing down.
 */
const impDisplay = (a: string, b: string) =>
  `${a}${b}`.includes('\\text')
    ? `\\begin{gathered} ${a} \\\\ \\Downarrow \\\\ ${b} \\end{gathered}`
    : imp(a, b);

/* ---------- which way does the arrow run? ---------- */

interface ArrowParams {
  pair: PairParams;
  flip: boolean;
}

const ARROW = {
  right: '\\Rightarrow\\text{ only}',
  left: '\\Leftarrow\\text{ only}',
  both: '\\Leftrightarrow',
};

const prfArrow: Generator<ArrowParams> = {
  id: 'prf-arrow',
  sample(rng, difficulty) {
    const families = difficulty >= 2 ? [...ONE_WAY, ...BOTH_WAYS] : ONE_WAY;
    return { pair: samplePair(rng, rng.pick(families)), flip: rng.chance(0.5) };
  },
  render({ pair, flip }) {
    const { p, q, whole } = pairOf(pair);
    const [left, right] = flip ? [q, p] : [p, q];
    const rightward = implies(left, right, whole);
    const leftward = implies(right, left, whole);
    const correct = rightward && leftward ? ARROW.both : rightward ? ARROW.right : ARROW.left;
    return choiceSlide(
      [
        say(`Which way does the implication run between these two statements?${wholeNote(whole)}`),
        ...(whole
          ? [
              say(`**Left:** $${left.tex}$`),
              say(`**Right:** $${right.tex}$`),
              { kind: 'display' as const, tex: '\\text{Left} \\quad \\square \\quad \\text{Right}' },
            ]
          : [{ kind: 'display' as const, tex: `${left.tex} \\quad \\square \\quad ${right.tex}` }]),
        say('Choose $\\Leftrightarrow$ only if it runs both ways.'),
      ],
      correct,
      Object.values(ARROW).filter((label) => label !== correct),
    );
  },
  solution({ pair, flip }) {
    const { p, q, whole } = pairOf(pair);
    const [left, right] = flip ? [q, p] : [p, q];
    const rightward = implies(left, right, whole);
    const leftward = implies(right, left, whole);
    const symbol = rightward && leftward ? '\\Leftrightarrow' : rightward ? '\\Rightarrow' : '\\Leftarrow';
    return [
      { text: directionText(pair, true) },
      { text: directionText(pair, false) },
      { text: `So the gap takes $${symbol}$: $${left.tex} ${symbol} ${right.tex}$.` },
    ];
  },
};

/* ---------- what is assumed, what is shown ---------- */

interface ClaimParams {
  pair: PairParams;
  wording: number;
  hard: boolean;
}

const prfAssumeShow: Generator<ClaimParams> = {
  id: 'prf-assume-show',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const families = hard ? [...ONE_WAY, ...BOTH_WAYS] : ONE_WAY;
    return { pair: samplePair(rng, rng.pick(families)), wording: rng.pick(hard ? [3, 4] : [0, 1, 2, 5]), hard };
  },
  render({ pair, wording }) {
    const { p, q, whole } = pairOf(pair);
    const m = (tex: string) => `$${tex}$`;
    const key = `${p.tex}|${q.tex}`;
    return {
      kind: 'flow',
      prompt: [
        say(`Claim: ${phrase(p.tex, q.tex, wording)}${wholeNote(whole)}`),
        say('Plan a direct proof of it. Each answer chooses what gets asked next.'),
      ],
      subject: '\\text{Direct proof}',
      steps: [
        {
          id: 'assume',
          ask: 'You start by assuming',
          branches: turned([m(p.tex), m(q.tex), m(p.neg)], `${key}|assume`).map((label) => ({ label, to: 'show' })),
        },
        {
          id: 'show',
          ask: 'and you have to reach',
          branches: turned([q.tex, p.tex, q.neg], `${key}|show`).map((tex) => ({
            label: m(tex),
            outcome: `The plan ends at $${tex}$.`,
          })),
        },
      ],
      answer: [m(p.tex), m(q.tex)],
    };
  },
  solution({ pair, wording }) {
    const { p, q } = pairOf(pair);
    return [
      { text: `The claim is $${imp(p.tex, q.tex)}$: assume $${p.tex}$, then work to $${q.tex}$.` },
      {
        text:
          wording >= 3 && wording <= 4
            ? `The "if" part comes second in this wording, but it is still the part you assume.`
            : `The part after "if" is what you may assume; the other part is what you must show.`,
      },
    ];
  },
};

/* ---------- writing a sentence as an arrow ---------- */

const prfWriteArrow: Generator<ClaimParams> = {
  id: 'prf-write-arrow',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    return { pair: samplePair(rng, rng.pick(ONE_WAY)), wording: rng.pick(hard ? [3, 4] : [0, 1, 2]), hard };
  },
  render({ pair, wording }) {
    const { p, q, whole } = pairOf(pair);
    const answer = [p.tex, '\\Rightarrow', q.tex];
    return {
      kind: 'tiles',
      prompt: [say(`${phrase(p.tex, q.tex, wording)}${wholeNote(whole)}`), say('Write that with an arrow.')],
      template: '{0} \\quad {1} \\quad {2}',
      bank: fillBank(answer, ['\\Leftrightarrow', q.neg]),
      answer,
    };
  },
  solution({ pair, wording }) {
    const { p, q } = pairOf(pair);
    return [
      {
        text:
          wording >= 3
            ? `The condition is $${p.tex}$, even though it comes second in the sentence. It goes before the arrow:`
            : `The condition, $${p.tex}$, goes before the arrow, and what follows from it after:`,
      },
      { tex: impDisplay(p.tex, q.tex) },
      { text: `Not $\\Leftrightarrow$, which also claims the converse. ${directionText(pair, false)}` },
    ];
  },
};

/* ---------- following an implication to a value ---------- */

interface ValueParams {
  a: number;
  m: number;
  b: number;
  c: number;
  quad: boolean;
}

const valueExpr = ({ m, b, c, quad }: ValueParams) => (quad ? polyTex([1, b, c], 'x') : lin(m, c, 'x'));
const valueOfExpr = ({ a, m, b, c, quad }: ValueParams) => (quad ? a * a + b * a + c : m * a + c);
const signedTail = (n: number) => `${n < 0 ? '-' : '+'} ${Math.abs(n)}`;

const prfImpliesValue: Generator<ValueParams> = {
  id: 'prf-implies-value',
  sample(rng, difficulty) {
    const signed = (lo: number, hi: number) => rng.int(lo, hi) * rng.sign();
    return difficulty >= 2
      ? { a: signed(1, 9), m: 1, b: signed(1, 6), c: signed(1, 12), quad: true }
      : { a: signed(1, 9), m: rng.int(2, 9), b: 0, c: signed(1, 12), quad: false };
  },
  render(params) {
    return {
      kind: 'expression',
      prompt: [say('Fill in the number that makes this implication true.')],
      lead: `x = ${params.a} \\Rightarrow ${valueExpr(params)} =`,
      keypad: [],
      answer: String(valueOfExpr(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution(params) {
    const { a, m, b, c, quad } = params;
    const v = valueOfExpr(params);
    const working = quad
      ? `${at(a)}^2 ${signedTail(b)} \\times ${at(a)} ${signedTail(c)} = ${v}`
      : `${m} \\times ${at(a)} ${signedTail(c)} = ${v}`;
    const other = -b - a;
    return [
      { text: `If $x = ${a}$, put $${a}$ in for $x$:` },
      { tex: stackTex(working) },
      {
        text: !quad
          ? `This one runs both ways too: only $x = ${a}$ gives $${v}$.`
          : other !== a
            ? `The arrow does not run back: $x = ${other}$ gives $${v}$ as well, so $${valueExpr(params)} = ${v}$ does not force $x = ${a}$.`
            : `Here only $x = ${a}$ gives $${v}$, so it runs both ways.`,
      },
    ];
  },
};

/* ================================================================
 * The converse
 * ================================================================ */

const prfConverse: Generator<ClaimParams> = {
  id: 'prf-converse',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const families = hard ? [...ONE_WAY, ...BOTH_WAYS] : ONE_WAY;
    return { pair: samplePair(rng, rng.pick(families)), wording: rng.pick(hard ? [3, 4, 5] : [0, 1, 5]), hard };
  },
  render({ pair, wording, hard }) {
    const { p, q, whole } = pairOf(pair);
    return choiceSlide(
      [say(`Statement: ${phrase(p.tex, q.tex, wording)}${wholeNote(whole)}`), say('Which of these is its **converse**?')],
      imp(q.tex, p.tex),
      [imp(p.neg, q.neg), iff(p.tex, q.tex), ...(hard ? [imp(q.neg, p.neg)] : [])],
    );
  },
  solution({ pair }) {
    const { p, q } = pairOf(pair);
    return [
      { text: `The converse swaps what is assumed and what is shown: $${imp(q.tex, p.tex)}$.` },
      { text: `It need not be true when the statement is. ${directionText(pair, false)}` },
    ];
  },
};

/* ---------- the one value that breaks a converse ---------- */

type CounterFamily = 'square' | 'factor' | 'zero' | 'abs' | 'quad';

interface ConverseCounterParams {
  family: CounterFamily;
  a: number;
  b: number;
}

/** A true `x = a \Rightarrow Q` whose converse fails at exactly one x. */
function converseCase({ family, a, b }: ConverseCounterParams): { q: string; counter: number; check: string } {
  switch (family) {
    case 'square':
      return { q: `x^2 = ${a * a}`, counter: -a, check: `$(${-a})^2 = ${a * a}$` };
    case 'factor': {
      const tex = rootsTex(a, b);
      return {
        q: `${tex} = 0`,
        counter: b,
        check: `$x = ${b}$ makes ${b === 0 ? 'the factor $x$' : `the bracket $(${lin(1, -b, 'x')})$`} zero`,
      };
    }
    case 'zero':
      return { q: `x^2 = ${termTex(a, 1, 'x')}`, counter: 0, check: `$0^2 = 0$ and $${a} \\times 0 = 0$` };
    case 'abs':
      return { q: `|x| = ${Math.abs(a)}`, counter: -a, check: `$|${-a}| = ${Math.abs(a)}$` };
    case 'quad':
      return {
        q: `${polyTex([1, -(a + b), a * b], 'x')} = 0`,
        counter: b,
        check: `$${polyTex([1, -(a + b), a * b], 'x')} = ${rootsTex(a, b)}$, so $x = ${b}$ makes it zero`,
      };
  }
}

const prfCounterConverse: Generator<ConverseCounterParams> = {
  id: 'prf-counter-converse',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const family = rng.pick<CounterFamily>(hard ? ['quad', 'factor', 'square'] : ['square', 'factor', 'zero', 'abs']);
    if (family !== 'factor' && family !== 'quad') {
      return { family, a: rng.int(2, family === 'square' && hard ? 15 : 9) * rng.sign(), b: 0 };
    }
    const top = family === 'quad' ? 7 : 6;
    const a = rng.int(1, top) * rng.sign();
    let b = rng.int(-top, top);
    while (b === a) b = rng.int(-top, top);
    return { family, a, b };
  },
  render(params) {
    const { q } = converseCase(params);
    const p = `x = ${params.a}`;
    return {
      kind: 'expression',
      prompt: [
        say(`$${imp(p, q)}$ is true, but its converse, $${imp(q, p)}$, is false.`),
        say('Which value of $x$ shows the converse is false?'),
      ],
      lead: 'x =',
      keypad: [],
      answer: String(converseCase(params).counter),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution(params) {
    const { q, counter, check } = converseCase(params);
    return [
      { text: `The converse breaks where $${q}$ is true but $x = ${params.a}$ is not.` },
      { text: `$x = ${counter}$: ${check}, yet $${counter} \\ne ${params.a}$.` },
      { text: 'One counterexample is enough to show the converse is false.' },
    ];
  },
};

/* ---------- testing a converse, one decision at a time ---------- */

interface PairOnlyParams {
  pair: PairParams;
}

/** The counterexample to Q ⇒ P, one value where both hold, one where Q fails. */
function converseValues(pair: Pair): { counter?: number; offered: number[] } {
  const { p, q, whole } = pair;
  const values = whole ? WHOLE_TESTS : REAL_TESTS.filter(Number.isInteger);
  const counter = breaks(q, p, whole);
  const both = values.find((x) => p.holds(x) && q.holds(x)) as number;
  const qFalse = values.find((x) => !q.holds(x)) as number;
  const spare = counter ?? (values.find((x) => x !== both && x !== qFalse) as number);
  return { counter, offered: [spare, both, qFalse] };
}

const prfConverseFlow: Generator<PairOnlyParams> = {
  id: 'prf-converse-flow',
  sample(rng, difficulty) {
    const families = difficulty >= 2 ? [...ONE_WAY, ...ONE_WAY, ...BOTH_WAYS] : ONE_WAY;
    return { pair: samplePair(rng, rng.pick(families)) };
  },
  render({ pair }) {
    const built = pairOf(pair);
    const { p, q, whole } = built;
    const v = whole ? 'n' : 'x';
    const converse = `$${imp(q.tex, p.tex)}$`;
    const { counter, offered } = converseValues(built);
    const key = `${p.tex}|${q.tex}`;
    const valueLabel = (x: number) => `$${v} = ${x}$`;
    const describe = (x: number) => {
      const said = (s: Statement) => `$${s.tex}$ is ${s.holds(x) ? 'true' : 'false'}`;
      return `At ${valueLabel(x)}, ${said(q)} and ${said(p)}.`;
    };
    return {
      kind: 'flow',
      prompt: [
        say(`Statement: $${imp(p.tex, q.tex)}$, which is true.${wholeNote(whole)}`),
        say('Test its converse. Each answer chooses what gets asked next.'),
      ],
      subject: imp(p.tex, q.tex),
      steps: [
        {
          id: 'conv',
          ask: 'The converse of this statement is',
          branches: turned([converse, `$${imp(p.neg, q.neg)}$`, `$${iff(p.tex, q.tex)}$`], `${key}|conv`).map(
            (label) => ({ label, to: 'true' }),
          ),
        },
        {
          id: 'true',
          ask: 'Is that converse true?',
          branches: [
            { label: 'Yes', outcome: 'Then the statement runs both ways.' },
            { label: 'No', to: 'counter' },
          ],
        },
        {
          id: 'counter',
          ask: `Which value of $${v}$ shows it is false?`,
          branches: turned(offered, `${key}|counter`).map((x) => ({ label: valueLabel(x), outcome: describe(x) })),
        },
      ],
      answer: counter === undefined ? [converse, 'Yes'] : [converse, 'No', valueLabel(counter)],
    };
  },
  solution({ pair }) {
    const { p, q } = pairOf(pair);
    return [
      { text: `The converse swaps the two sides: $${imp(q.tex, p.tex)}$.` },
      { text: directionText(pair, false) },
    ];
  },
};

/* ---------- every value that breaks a converse, on a number line ---------- */

type LineFamily = 'above' | 'below' | 'square' | 'sqLess';

interface CounterLineParams {
  family: LineFamily;
  a: number;
  b: number;
  closed: boolean;
  min: number;
  max: number;
}

/** The true statement, and the stretch of the line where its converse breaks. */
function lineCase({ family, a, b, closed }: CounterLineParams): {
  p: string;
  q: string;
  notP: string;
  setTex: string;
  piece: Piece;
} {
  const ge = closed ? '\\ge' : '>';
  const le = closed ? '\\le' : '<';
  switch (family) {
    case 'above':
      // x > a (or x >= a) implies x > b, for b < a.
      return {
        p: `x ${ge} ${a}`,
        q: `x > ${b}`,
        notP: `x ${closed ? '<' : '\\le'} ${a}`,
        setTex: `${b} < x ${closed ? '<' : '\\le'} ${a}`,
        piece: { lo: b, hi: a, loClosed: false, hiClosed: !closed },
      };
    case 'below':
      // x < a (or x <= a) implies x < b, for b > a.
      return {
        p: `x ${le} ${a}`,
        q: `x < ${b}`,
        notP: `x ${closed ? '>' : '\\ge'} ${a}`,
        setTex: `${a} ${closed ? '<' : '\\le'} x < ${b}`,
        piece: { lo: a, hi: b, loClosed: !closed, hiClosed: false },
      };
    case 'square':
      // x > a implies x^2 > a^2, for a > 0.
      return {
        p: `x ${ge} ${a}`,
        q: `x^2 ${ge} ${a * a}`,
        notP: `x ${closed ? '<' : '\\le'} ${a}`,
        setTex: `x ${le} -${a}`,
        piece: { lo: -Infinity, hi: -a, loClosed: false, hiClosed: closed },
      };
    case 'sqLess':
      // x^2 < a^2 implies x < a.
      return {
        p: `x^2 ${le} ${a * a}`,
        q: `x ${le} ${a}`,
        notP: `x^2 ${closed ? '>' : '\\ge'} ${a * a}`,
        setTex: `x ${closed ? '<' : '\\le'} -${a}`,
        piece: { lo: -Infinity, hi: -a, loClosed: false, hiClosed: !closed },
      };
  }
}

const prfCounterLine: Generator<CounterLineParams> = {
  id: 'prf-counter-line',
  sample(rng, difficulty) {
    const family = rng.pick<LineFamily>(difficulty >= 2 ? ['square', 'sqLess'] : ['above', 'below']);
    const closed = rng.chance(0.5);
    if (family === 'square' || family === 'sqLess') {
      const a = rng.int(1, 5);
      return { family, a, b: 0, closed, ...windowFor(rng, -a, a, 12, 1) };
    }
    const a = family === 'above' ? rng.int(-3, 7) : rng.int(-6, 4);
    const b = family === 'above' ? a - rng.int(2, 6) : a + rng.int(2, 6);
    return { family, a, b, closed, ...windowFor(rng, Math.min(a, b), Math.max(a, b), 10, 2) };
  },
  render(params) {
    const { p, q, piece } = lineCase(params);
    return {
      kind: 'numberLine',
      prompt: [
        say(`$${imp(p, q)}$ is true. Its converse, $${imp(q, p)}$, is not.`),
        say(`Shade every $x$ that breaks the converse: $${q}$ true, but $${p}$ false.`),
      ],
      min: params.min,
      max: params.max,
      step: 1,
      answer: formatSet(canonicalPieces([piece])),
    };
  },
  solution(params) {
    const { p, q, notP, setTex } = lineCase(params);
    return [
      { text: `The converse breaks where $${q}$ holds and $${p}$ does not, that is where $${notP}$ as well.` },
      { tex: setTex },
      {
        text: 'A filled dot is a value that breaks it; a hollow dot is one that does not. Every $x$ in there is a counterexample.',
      },
    ];
  },
};

/* ================================================================
 * The contrapositive
 * ================================================================ */

const prfContrapositive: Generator<ClaimParams> = {
  id: 'prf-contrapositive',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const families = hard ? [...ONE_WAY, ...BOTH_WAYS] : ONE_WAY;
    return { pair: samplePair(rng, rng.pick(families)), wording: rng.pick(hard ? [1, 3, 4] : [0, 5]), hard };
  },
  render({ pair, wording }) {
    const { p, q, whole } = pairOf(pair);
    const answer = [q.neg, '\\Rightarrow', p.neg];
    return {
      kind: 'tiles',
      prompt: [
        say(`Statement: ${phrase(p.tex, q.tex, wording)}${wholeNote(whole)}`),
        say('Build its **contrapositive**.'),
      ],
      template: '{0} \\quad {1} \\quad {2}',
      bank: fillBank(answer, [p.tex, q.tex, '\\Leftrightarrow']),
      answer,
    };
  },
  solution({ pair }) {
    const { p, q } = pairOf(pair);
    return [
      { text: 'Swap the two sides and negate both:' },
      { tex: impDisplay(q.neg, p.neg) },
      { text: `It is true exactly when the statement is, and here ${directionText(pair, true)}` },
    ];
  },
};

/* ---------- a proof through the contrapositive, in order ---------- */

type ParityShape = 'square' | 'linear';

interface ParityClaim {
  shape: ParityShape;
  /** The coefficient of n in the linear shape: 3, 5 or 7. */
  a: number;
  c: number;
}

const parityWord = (r: number) => (r === 1 ? 'odd' : 'even');
const parityExprTex = ({ shape, a, c }: ParityClaim) => (shape === 'square' ? `n^2 + ${c}` : `${a}n + ${c}`);

/** The expression with n = 2k + r, as coefficients in k. */
const parityCoefs = ({ shape, a, c }: ParityClaim, r: number) =>
  shape === 'square' ? [4, 4 * r, r + c] : [2 * a, a * r + c];

/** Its parity when n has parity r: a is odd, so the same as r + c. */
const parityOf = ({ c }: ParityClaim, r: number) => (r + c) % 2;

/** `2(2k^2 + 2k + 4) + 1`: two times a whole number, plus what is left. */
function parityFactored(coefs: number[]): string {
  const s = coefs[coefs.length - 1];
  const inside = [...coefs.slice(0, -1).map((x) => x / 2), Math.floor(s / 2)];
  return `2(${polyTex(inside)})${s % 2 ? ' + 1' : ''}`;
}

/** An algebra slip in the expansion: `2k` squared as `2k^2`, or the `2` lost. */
function paritySlip(claim: ParityClaim, r: number): string {
  const [first, ...rest] = parityCoefs(claim, r);
  if (claim.shape === 'linear') return polyTex([first / 2, ...rest]);
  return r === 0 ? polyTex([2, 0, claim.c]) : polyTex([4, 0, 1 + claim.c]);
}

type ContraOrderFamily = { family: 'parity'; e: 0 | 1 } & ParityClaim;
type ContraClaim = ContraOrderFamily | { family: 'multiple'; p: number };
type ContraProofParams = ContraClaim & { difficulty: number; picks: number[] };

/** "If E is e, then n is t", t worked out from e so the claim is true. */
function parityClaimParts(claim: ContraOrderFamily) {
  const E = parityExprTex(claim);
  const t = (claim.e + claim.c) % 2;
  return { E, t, r: 1 - t, eBar: 1 - claim.e };
}

function contraClaimText(claim: ContraClaim): string {
  if (claim.family === 'multiple') {
    return `If $n^2$ is not a multiple of $${claim.p}$, then $n$ is not a multiple of $${claim.p}$.`;
  }
  const { E, t } = parityClaimParts(claim);
  return `If $${E}$ is ${parityWord(claim.e)}, then $n$ is ${parityWord(t)}.`;
}

function contraOrderProof(params: ContraProofParams): Proof {
  const hard = params.difficulty >= 2;
  if (params.family === 'multiple') {
    const { p } = params;
    const middle = hard
      ? [
          `Then $n^2 = ${p * p}k^2$.`,
          `That is $${p}(${p}k^2)$, and $${p}k^2$ is a whole number, so $n^2$ is a multiple of $${p}$.`,
        ]
      : [`Then $n^2 = ${p * p}k^2 = ${p}(${p}k^2)$, a multiple of $${p}$.`];
    return {
      claim: `Prove: ${contraClaimText(params)}`,
      steps: [
        `First, prove the contrapositive: if $n$ is a multiple of $${p}$, then so is $n^2$.`,
        `Assume $n$ is a multiple of $${p}$, so $n = ${p}k$ for some whole number $k$.`,
        ...middle,
        'So the contrapositive is true, and a statement and its contrapositive stand or fall together: the claim is true.',
      ],
      pool: [
        {
          text: `First, prove the converse: if $n$ is not a multiple of $${p}$, then neither is $n^2$.`,
          why: 'That is the converse, a different statement: proving it says nothing about the claim.',
        },
        {
          text: `Assume $n^2$ is not a multiple of $${p}$, so $n$ is not one either.`,
          why: 'That assumes what is being proved.',
        },
        { text: `Then $n^2 = ${p}k^2$.`, why: `$(${p}k)^2 = ${p * p}k^2$: the $${p}$ is squared as well.` },
        {
          text: `Checking $n = ${p + 1}$: $n^2 = ${(p + 1) ** 2}$, which is not a multiple of $${p}$.`,
          why: 'One example is not a proof.',
        },
      ],
    };
  }
  const { E, t, r, eBar } = parityClaimParts(params);
  const coefs = parityCoefs(params, r);
  const expanded = polyTex(coefs);
  const factored = parityFactored(coefs);
  const middle = hard
    ? [`Then $${E} = ${expanded}$.`, `That is $${factored}$, which is ${parityWord(eBar)}.`]
    : [`Then $${E} = ${expanded} = ${factored}$, which is ${parityWord(eBar)}.`];
  const sample = r === 1 ? 3 : 4;
  const sampleValue = params.shape === 'square' ? sample * sample + params.c : params.a * sample + params.c;
  return {
    claim: `Prove: ${contraClaimText(params)}`,
    steps: [
      `First, prove the contrapositive: if $n$ is ${parityWord(r)}, then $${E}$ is ${parityWord(eBar)}.`,
      `Assume $n$ is ${parityWord(r)}, so $n = ${lin(2, r)}$ for some whole number $k$.`,
      ...middle,
      'So the contrapositive is true.',
      `A statement and its contrapositive stand or fall together, so if $${E}$ is ${parityWord(params.e)}, $n$ is ${parityWord(t)}.`,
    ],
    pool: [
      {
        text: `First, prove the converse: if $n$ is ${parityWord(t)}, then $${E}$ is ${parityWord(params.e)}.`,
        why: 'That is the converse, a different statement: proving it says nothing about the claim.',
      },
      {
        text: `Assume $${E}$ is ${parityWord(params.e)}, so $${E} = ${params.e ? '2m + 1' : '2m'}$.`,
        why: 'That starts a direct proof, and nothing turns it into a fact about $n$.',
      },
      {
        text: `Then $${E} = ${paritySlip(params, r)}$.`,
        why: `The algebra slips: $n = ${lin(2, r)}$ gives $${E} = ${expanded}$.`,
      },
      {
        text: `Checking $n = ${sample}$: $${E} = ${sampleValue}$, which is ${parityWord(eBar)}.`,
        why: 'One example is not a proof.',
      },
    ],
  };
}

function sampleContraClaim(rng: Rng): ContraClaim {
  if (rng.chance(0.3)) return { family: 'multiple', p: rng.int(2, 12) };
  const shape = rng.pick<ParityShape>(['square', 'linear']);
  return {
    family: 'parity',
    shape,
    a: shape === 'linear' ? rng.pick([3, 5, 7]) : 1,
    c: rng.int(1, 11),
    e: rng.pick([0, 1] as const),
  };
}

const prfOrderContrapositive: Generator<ContraProofParams> = {
  id: 'prf-order-contrapositive',
  sample(rng, difficulty) {
    const base = { ...sampleContraClaim(rng), difficulty, picks: [] };
    return { ...base, picks: pickDistractors(rng, contraOrderProof(base), difficulty) };
  },
  render(params) {
    return orderSlide(contraOrderProof(params), params.picks);
  },
  solution(params) {
    return orderSolution(contraOrderProof(params), params.picks);
  },
};

/* ---------- planning a contrapositive proof ---------- */

const prfContraPlan: Generator<{ claim: ContraClaim }> = {
  id: 'prf-contra-plan',
  sample(rng) {
    return { claim: sampleContraClaim(rng) };
  },
  render({ claim }) {
    const claimText = contraClaimText(claim);
    let start: string;
    let plans: string[];
    let assumes: string[];
    let forms: string[];
    if (claim.family === 'multiple') {
      const { p } = claim;
      start = `$n^2$ not being a multiple of $${p}$`;
      plans = [
        `If $n$ is a multiple of $${p}$, so is $n^2$`,
        `If $n$ is not a multiple of $${p}$, nor is $n^2$`,
        `If $n^2$ is a multiple of $${p}$, so is $n$`,
      ];
      assumes = [
        `$n$ is a multiple of $${p}$`,
        `$n^2$ is a multiple of $${p}$`,
        `$n$ is not a multiple of $${p}$`,
      ];
      forms = [`$n = ${p}k$`, `$n^2 = ${p}k$`, `$n = k + ${p}$`];
    } else {
      const { E, t, r, eBar } = parityClaimParts(claim);
      start = `$${E}$ being ${parityWord(claim.e)}`;
      plans = [
        `If $n$ is ${parityWord(r)}, then $${E}$ is ${parityWord(eBar)}`,
        `If $n$ is ${parityWord(t)}, then $${E}$ is ${parityWord(claim.e)}`,
        `If $${E}$ is ${parityWord(eBar)}, then $n$ is ${parityWord(r)}`,
      ];
      assumes = [`$n$ is ${parityWord(r)}`, `$n$ is ${parityWord(t)}`, `$${E}$ is ${parityWord(eBar)}`];
      forms = [`$n = ${lin(2, r)}$`, `$n = ${lin(2, t)}$`, `$${E} = 2k$`];
    }
    const key = claimText;
    return {
      kind: 'flow',
      prompt: [say(`Claim: ${claimText}`), say('Plan its proof. Each answer chooses what gets asked next.')],
      subject: '\\text{Plan the proof}',
      steps: [
        {
          id: 'which',
          ask: `A direct proof starts from ${start}, which says little about $n$ itself. So prove this instead:`,
          branches: turned(plans, `${key}|which`).map((label) => ({ label, to: 'assume' })),
        },
        {
          id: 'assume',
          ask: 'You start by assuming',
          branches: turned(assumes, `${key}|assume`).map((label) => ({ label, to: 'form' })),
        },
        {
          id: 'form',
          ask: 'and so you write',
          branches: turned(forms, `${key}|form`).map((label) => ({
            label,
            outcome: `The proof goes on from ${label}.`,
          })),
        },
      ],
      answer: [plans[0], assumes[0], forms[0]],
    };
  },
  solution({ claim }) {
    if (claim.family === 'multiple') {
      const { p } = claim;
      return [
        { text: `Prove the contrapositive: if $n$ is a multiple of $${p}$, so is $n^2$.` },
        { text: `Assume that, and write $n = ${p}k$. Then $n^2 = ${p * p}k^2 = ${p}(${p}k^2)$, a multiple of $${p}$.` },
      ];
    }
    const { E, r, eBar } = parityClaimParts(claim);
    const coefs = parityCoefs(claim, r);
    return [
      { text: `Prove the contrapositive: if $n$ is ${parityWord(r)}, then $${E}$ is ${parityWord(eBar)}.` },
      { text: `Assume that, and write $n = ${lin(2, r)}$. Then:` },
      { tex: stackTex(`${E} = ${polyTex(coefs)} = ${parityFactored(coefs)}`) },
      { text: `That is ${parityWord(eBar)}, as the contrapositive says.` },
    ];
  },
};

/* ---------- converse, inverse or contrapositive? ---------- */

type Relative = 'converse' | 'inverse' | 'contrapositive' | 'none';

interface RelativeParams {
  pair: PairParams;
  shown: Relative;
  hard: boolean;
}

const RELATIVE_LABEL: Record<Relative, string> = {
  converse: 'Its converse',
  inverse: 'Its inverse',
  contrapositive: 'Its contrapositive',
  none: 'None of these',
};

function relativeTex(pair: Pair, shown: Relative): string {
  const { p, q } = pair;
  switch (shown) {
    case 'converse':
      return imp(q.tex, p.tex);
    case 'inverse':
      return imp(p.neg, q.neg);
    case 'contrapositive':
      return imp(q.neg, p.neg);
    case 'none':
      return imp(p.tex, q.neg);
  }
}

const prfNameRelative: Generator<RelativeParams> = {
  id: 'prf-name-relative',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const families = hard ? [...ONE_WAY, ...BOTH_WAYS] : ONE_WAY;
    const shown = rng.pick<Relative>(hard ? ['converse', 'inverse', 'contrapositive', 'none'] : ['converse', 'inverse', 'contrapositive']);
    return { pair: samplePair(rng, rng.pick(families)), shown, hard };
  },
  render({ pair, shown, hard }) {
    const built = pairOf(pair);
    const { p, q, whole } = built;
    const labels = (hard ? ['converse', 'inverse', 'contrapositive', 'none'] : ['converse', 'inverse', 'contrapositive']) as Relative[];
    return choiceSlide(
      [
        say(`Statement: $${imp(p.tex, q.tex)}$.${wholeNote(whole)}`),
        say(`What is $${relativeTex(built, shown)}$ to that statement?`),
      ],
      RELATIVE_LABEL[shown],
      labels.filter((label) => label !== shown).map((label) => RELATIVE_LABEL[label]),
      true,
    );
  },
  solution({ pair, shown }) {
    const built = pairOf(pair);
    const line = `$${relativeTex(built, shown)}$`;
    const why: Record<Relative, string> = {
      converse: `${line} swaps the sides and negates neither: the converse. It can be false when the statement is true.`,
      inverse: `${line} negates both sides but keeps them where they were: the inverse. It can be false when the statement is true.`,
      contrapositive: `${line} swaps the sides and negates both: the contrapositive. It is true exactly when the statement is.`,
      none: `${line} negates only one side, which none of the three does.`,
    };
    return [{ text: why[shown] }, { text: `The statement itself: ${directionText(pair, true)}` }];
  },
};

/* ================================================================
 * Necessary and sufficient
 * ================================================================ */

interface CondParams {
  pair: PairParams;
  flip: boolean;
}

type Verdict = 'suff' | 'nec' | 'both' | 'neither';

const VERDICT_LABEL: Record<Verdict, string> = {
  suff: 'Sufficient, not necessary',
  nec: 'Necessary, not sufficient',
  both: 'Necessary and sufficient',
  neither: 'Neither',
};

/** The condition P and the statement Q, and how they stand. */
function condition({ pair, flip }: CondParams) {
  const { p, q, whole } = pairOf(pair);
  const [P, Q] = flip ? [q, p] : [p, q];
  const sufficient = implies(P, Q, whole);
  const necessary = implies(Q, P, whole);
  const verdict: Verdict = sufficient ? (necessary ? 'both' : 'suff') : necessary ? 'nec' : 'neither';
  return { P, Q, whole, sufficient, necessary, verdict };
}

function sampleCondition(rng: Rng, difficulty: number): CondParams {
  const families = difficulty >= 2 ? [...ONE_WAY, ...BOTH_WAYS, ...NEITHER_WAY] : ONE_WAY;
  return { pair: samplePair(rng, rng.pick(families)), flip: rng.chance(0.5) };
}

function conditionSolution(params: CondParams): SolutionStep[] {
  const { P, Q, verdict } = condition(params);
  return [
    { text: `Sufficient means $${imp(P.tex, Q.tex)}$. ${directionText(params.pair, !params.flip)}` },
    { text: `Necessary means $${imp(Q.tex, P.tex)}$. ${directionText(params.pair, params.flip)}` },
    { text: `So $${P.tex}$ is ${VERDICT_LABEL[verdict].toLowerCase()} for $${Q.tex}$.` },
  ];
}

const prfNecSuff: Generator<CondParams> = {
  id: 'prf-nec-suff',
  sample: sampleCondition,
  render(params) {
    const { P, Q, whole, verdict } = condition(params);
    return choiceSlide(
      [
        say(`Condition: $${P.tex}$. Statement: $${Q.tex}$.${wholeNote(whole)}`),
        say('Is the condition **sufficient** for the statement, **necessary** for it, both, or neither?'),
      ],
      VERDICT_LABEL[verdict],
      Object.values(VERDICT_LABEL).filter((label) => label !== VERDICT_LABEL[verdict]),
      true,
    );
  },
  solution: conditionSolution,
};

const prfNecSuffFlow: Generator<CondParams> = {
  id: 'prf-nec-suff-flow',
  sample: sampleCondition,
  render(params) {
    const { P, Q, whole, sufficient, necessary, verdict } = condition(params);
    const yesNo = (to: string) => [
      { label: 'Yes', to },
      { label: 'No', to },
    ];
    return {
      kind: 'flow',
      prompt: [
        say(`Condition: $${P.tex}$. Statement: $${Q.tex}$.${wholeNote(whole)}`),
        say('Sort the condition. Each answer chooses what gets asked next.'),
      ],
      subject: '\\text{Necessary or sufficient?}',
      steps: [
        { id: 'fwd', ask: `Does $${imp(P.tex, Q.tex)}$ hold for every value?`, branches: yesNo('back') },
        { id: 'back', ask: `Does $${imp(Q.tex, P.tex)}$ hold for every value?`, branches: yesNo('name') },
        {
          id: 'name',
          ask: `So, for $${Q.tex}$, the condition $${P.tex}$ is`,
          branches: (Object.keys(VERDICT_LABEL) as Verdict[]).map((key) => ({
            label: VERDICT_LABEL[key],
            outcome: `Sorted as: ${VERDICT_LABEL[key].toLowerCase()}.`,
          })),
        },
      ],
      answer: [sufficient ? 'Yes' : 'No', necessary ? 'Yes' : 'No', VERDICT_LABEL[verdict]],
    };
  },
  solution: conditionSolution,
};

/* ---------- which condition does each number meet? ---------- */

type MeetsFamily = 'gt' | 'lt' | 'eq' | 'ge';

interface MeetsParams {
  family: MeetsFamily;
  a: number;
  xs: number[];
}

function meetsPair(family: MeetsFamily, a: number): { p: Statement; q: Statement } {
  const s = a * a;
  switch (family) {
    case 'gt':
      return { p: { tex: `x^2 > ${s}`, neg: '', holds: (x) => x * x > s }, q: gtS(a) };
    case 'lt':
      return { p: { tex: `x^2 < ${s}`, neg: '', holds: (x) => x * x < s }, q: ltS(a) };
    case 'eq':
      return { p: { tex: `x^2 = ${s}`, neg: '', holds: (x) => x * x === s }, q: eqS(a) };
    case 'ge':
      return {
        p: { tex: `x^2 \\ge ${s}`, neg: '', holds: (x) => x * x >= s },
        q: { tex: `x \\ge ${a}`, neg: '', holds: (x) => x >= a },
      };
  }
}

const MEETS = {
  both: '\\text{both}',
  p: 'P\\text{ only}',
  q: 'Q\\text{ only}',
  neither: '\\text{neither}',
};

function meets(pq: { p: Statement; q: Statement }, x: number): keyof typeof MEETS {
  const p = pq.p.holds(x);
  const q = pq.q.holds(x);
  return p ? (q ? 'both' : 'p') : q ? 'q' : 'neither';
}

const prfMeetsTree: Generator<MeetsParams> = {
  id: 'prf-meets-tree',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const family = rng.pick<MeetsFamily>(hard ? ['gt', 'lt', 'eq', 'ge'] : ['gt', 'lt', 'eq']);
    const a = rng.int(2, 5);
    const pq = meetsPair(family, a);
    const top = hard ? 9 : 7;
    const range = Array.from({ length: 2 * top + 1 }, (_, i) => i - top);
    for (;;) {
      const xs = rng.sample(range, 3).sort((x, y) => x - y);
      const kinds = xs.map((x) => meets(pq, x));
      if (!kinds.includes('p') && !kinds.includes('q')) continue;
      if (new Set(kinds).size < 2) continue;
      return { family, a, xs };
    }
  },
  render({ family, a, xs }) {
    const pq = meetsPair(family, a);
    const squares = xs.map((x) => String(x * x));
    const kinds = xs.map((x) => MEETS[meets(pq, x)]);
    const slips = xs.flatMap((x) => [String(2 * x), ...(x < 0 ? [String(-x * x)] : [])]);
    const answer = [...squares, ...kinds];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Left to right, $x = ${xs[0]}$, $x = ${xs[1]}$ and $x = ${xs[2]}$. Top row: $x^2$. Underneath: which of $P$ and $Q$ that $x$ makes true.`,
        ),
      ],
      expression: `P\\colon ${pq.p.tex} \\quad Q\\colon ${pq.q.tex}`,
      nodes: [...xs.map((_, i) => ({ id: `s${i}`, from: [] })), ...xs.map((_, i) => ({ id: `m${i}`, from: [`s${i}`] }))],
      bank: fillBank(answer, [...Object.values(MEETS), ...slips], 2, 4),
      answer,
    };
  },
  solution({ family, a, xs }) {
    const pq = meetsPair(family, a);
    const word = (b: boolean) => (b ? 'true' : 'false');
    const sufficient = implies(pq.p, pq.q, false);
    const necessary = implies(pq.q, pq.p, false);
    return [
      ...xs.map((x) => ({
        text: `$x = ${x}$: $x^2 = ${x * x}$, so $P$ is ${word(pq.p.holds(x))} and $Q$ is ${word(pq.q.holds(x))}.`,
      })),
      {
        text: `A value meeting $P$ only would show $P$ is not sufficient for $Q$; one meeting $Q$ only, that $P$ is not necessary. Here $P$ is ${sufficient ? '' : 'not '}sufficient and ${necessary ? '' : 'not '}necessary for $Q$.`,
      },
    ];
  },
};

/* ---------- "necessary", "sufficient", "only if", as an arrow ---------- */

type NecWording = 'suff' | 'nec' | 'onlyIf' | 'if';

interface NecArrowParams {
  pair: PairParams;
  wording: NecWording;
}

function necSentence({ pair, wording }: NecArrowParams): { sentence: string; why: string } {
  const { p, q } = pairOf(pair);
  const P = `$${p.tex}$`;
  const Q = `$${q.tex}$`;
  switch (wording) {
    case 'suff':
      return { sentence: `${P} is sufficient for ${Q}.`, why: `"Sufficient" means ${P} is enough to guarantee ${Q}.` };
    case 'nec':
      return {
        sentence: `${Q} is necessary for ${P}.`,
        why: `"Necessary" means ${P} cannot happen without ${Q}, so ${P} brings ${Q} with it.`,
      };
    case 'onlyIf':
      return { sentence: `${P} only if ${Q}.`, why: `"Only if" means ${P} can only happen when ${Q} does.` };
    case 'if':
      return { sentence: `${Q} if ${P}.`, why: `The condition ${P} comes second in the sentence, but it is still the "if" part.` };
  }
}

const prfNecArrow: Generator<NecArrowParams> = {
  id: 'prf-nec-arrow',
  sample(rng, difficulty) {
    const wording = rng.pick<NecWording>(difficulty >= 2 ? ['nec', 'onlyIf', 'if'] : ['suff', 'nec']);
    return { pair: samplePair(rng, rng.pick(ONE_WAY)), wording };
  },
  render(params) {
    const { p, q, whole } = pairOf(params.pair);
    const answer = [p.tex, '\\Rightarrow', q.tex];
    return {
      kind: 'tiles',
      prompt: [say(`${necSentence(params).sentence}${wholeNote(whole)}`), say('Write that as an implication.')],
      template: '{0} \\quad {1} \\quad {2}',
      bank: fillBank(answer, ['\\Leftrightarrow', p.neg]),
      answer,
    };
  },
  solution(params) {
    const { p, q } = pairOf(params.pair);
    return [{ text: necSentence(params).why }, { tex: impDisplay(p.tex, q.tex) }];
  },
};

/* ================================================================
 * If and only if
 * ================================================================ */

type IffOrderParams =
  | { family: 'linear'; m: number; c: number; a: number; difficulty: number; picks: number[] }
  | ({ family: 'parity'; t: 0 | 1; difficulty: number; picks: number[] } & ParityClaim);

function iffOrderProof(params: IffOrderParams): Proof {
  const hard = params.difficulty >= 2;
  if (params.family === 'linear') {
    const { m, c, a } = params;
    const left = lin(m, c, 'x');
    const v = m * a + c;
    const P = `${left} = ${v}`;
    const move = c > 0 ? `Taking away $${c}$` : `Adding $${-c}$`;
    const solve = hard
      ? [`${move} gives $${m}x = ${m * a}$.`, `Dividing by $${m}$ gives $x = ${a}$.`]
      : [`${move} gives $${m}x = ${m * a}$, so $x = ${a}$.`];
    return {
      claim: `Prove that $${iff(P, `x = ${a}`)}$.`,
      steps: [
        `First ($\\Rightarrow$): assume $${P}$.`,
        ...solve,
        `Now ($\\Leftarrow$): assume $x = ${a}$.`,
        `Then $${left} = ${m} \\times ${at(a)} ${signedTail(c)} = ${v}$.`,
        `Both directions hold, so $${iff(P, `x = ${a}`)}$.`,
      ],
      pool: [
        {
          text: `Assume $${P}$ and $x = ${a}$.`,
          why: 'Each direction assumes one side and shows the other, never both at once.',
        },
        {
          text: `${move} gives $${m}x = ${v + c}$.`,
          why: `$${c}$ comes off both sides the same way: $${m}x = ${v - c}$.`,
        },
        { text: `Now ($\\Leftarrow$): assume $${P}$.`, why: `That is the first half again: the second starts from $x = ${a}$.` },
        { text: `So $x^2 = ${a * a}$.`, why: 'True, but no step of the proof needs it.' },
      ],
    };
  }
  const { t } = params;
  const E = parityExprTex(params);
  const e = parityOf(params, t);
  const u = 1 - t;
  const there = parityCoefs(params, t);
  const back = parityCoefs(params, u);
  const firstHalf = hard
    ? [`Then $${E} = ${polyTex(there)}$.`, `That is $${parityFactored(there)}$, which is ${parityWord(e)}.`]
    : [`Then $${E} = ${polyTex(there)} = ${parityFactored(there)}$, which is ${parityWord(e)}.`];
  const sample = t === 1 ? 3 : 4;
  const sampleValue = params.shape === 'square' ? sample * sample + params.c : params.a * sample + params.c;
  const claim = `$n$ is ${parityWord(t)} $\\Leftrightarrow$ $${E}$ is ${parityWord(e)}`;
  return {
    claim: `Prove: ${claim}.`,
    steps: [
      `First ($\\Rightarrow$): assume $n$ is ${parityWord(t)}, so $n = ${lin(2, t)}$.`,
      ...firstHalf,
      `Now ($\\Leftarrow$), by the contrapositive: assume $n$ is ${parityWord(u)}, so $n = ${lin(2, u)}$.`,
      `Then $${E} = ${polyTex(back)} = ${parityFactored(back)}$, which is ${parityWord(1 - e)}.`,
      `So if $${E}$ is ${parityWord(e)}, $n$ is ${parityWord(t)}, and both directions hold.`,
    ],
    pool: [
      {
        text: `Now ($\\Leftarrow$): assume $${E}$ is ${parityWord(e)}, so $n$ is ${parityWord(t)}.`,
        why: 'That assumes what this half has to prove.',
      },
      {
        text: `Assume $n$ is ${parityWord(t)} and $${E}$ is ${parityWord(e)}.`,
        why: 'Each direction assumes one side and shows the other, never both at once.',
      },
      {
        text: `Then $${E} = ${paritySlip(params, t)}$.`,
        why: `The algebra slips: $n = ${lin(2, t)}$ gives $${E} = ${polyTex(there)}$.`,
      },
      {
        text: `Checking $n = ${sample}$: $${E} = ${sampleValue}$, which is ${parityWord(e)}.`,
        why: 'One example is not a proof.',
      },
    ],
  };
}

const prfOrderIff: Generator<IffOrderParams> = {
  id: 'prf-order-iff',
  sample(rng, difficulty) {
    const base: IffOrderParams = rng.chance(0.5)
      ? { family: 'linear', m: rng.int(2, 6), c: rng.int(1, 9) * rng.sign(), a: rng.int(1, 9) * rng.sign(), difficulty, picks: [] }
      : (() => {
          const shape = rng.pick<ParityShape>(['square', 'linear']);
          return {
            family: 'parity' as const,
            shape,
            a: shape === 'linear' ? rng.pick([3, 5, 7]) : 1,
            c: rng.int(1, 11),
            t: rng.pick([0, 1] as const),
            difficulty,
            picks: [],
          };
        })();
    return { ...base, picks: pickDistractors(rng, iffOrderProof(base), difficulty) };
  },
  render(params) {
    return orderSlide(iffOrderProof(params), params.picks);
  },
  solution(params) {
    return orderSolution(iffOrderProof(params), params.picks);
  },
};

/* ---------- which half is which ---------- */

type IffClaim =
  | { kind: 'pair'; pair: PairParams }
  | ({ kind: 'parity'; t: 0 | 1 } & ParityClaim);

/** The two sides of an "if and only if", each with its negation. */
function iffSides(claim: IffClaim): { p: Statement; q: Statement; whole: boolean } {
  if (claim.kind === 'pair') return pairOf(claim.pair);
  const E = parityExprTex(claim);
  const e = parityOf(claim, claim.t);
  const said = (subject: string, r: number): Statement => ({
    tex: `${subject} \\text{ is ${parityWord(r)}}`,
    neg: `${subject} \\text{ is ${parityWord(1 - r)}}`,
    holds: () => true,
  });
  return { p: said('n', claim.t), q: said(E, e), whole: true };
}

function sampleIff(rng: Rng): IffClaim {
  if (rng.chance(0.5)) return { kind: 'pair', pair: samplePair(rng, rng.pick(BOTH_WAYS)) };
  const shape = rng.pick<ParityShape>(['square', 'linear']);
  return {
    kind: 'parity',
    shape,
    a: shape === 'linear' ? rng.pick([3, 5, 7]) : 1,
    c: rng.int(1, 11),
    t: rng.pick([0, 1] as const),
  };
}

interface DirectionParams {
  claim: IffClaim;
  /** The half already written proves P ⇒ Q (fwd) or Q ⇒ P. */
  half: 'fwd' | 'back';
  /** It was written through the contrapositive. */
  contra: boolean;
}

function directionParts({ claim, half, contra }: DirectionParams) {
  const { p, q, whole } = iffSides(claim);
  const [R, S] = half === 'fwd' ? [p, q] : [q, p];
  const [from, to] = contra ? [S.neg, R.neg] : [R.tex, S.tex];
  return { p, q, whole, done: imp(R.tex, S.tex), left: imp(S.tex, R.tex), from, to, R, S };
}

const prfDirectionFlow: Generator<DirectionParams> = {
  id: 'prf-direction-flow',
  sample(rng, difficulty) {
    return {
      claim: sampleIff(rng),
      half: rng.pick(['fwd', 'back'] as const),
      contra: difficulty >= 2 ? rng.chance(0.6) : false,
    };
  },
  render(params) {
    const { p, q, whole, done, left, from, to, R, S } = directionParts(params);
    const m = (tex: string) => `$${tex}$`;
    const key = `${p.tex}|${q.tex}`;
    return {
      kind: 'flow',
      prompt: [
        say(`Claim: $${iff(p.tex, q.tex)}$.${wholeNote(whole)}`),
        say(`The first half of its proof assumes $${from}$ and reaches $${to}$.`),
        say('Each answer chooses what gets asked next.'),
      ],
      subject: '\\text{Which half is done?}',
      steps: [
        {
          id: 'shown',
          ask: 'That half proves',
          branches: turned([m(done), m(left), m(iff(p.tex, q.tex))], `${key}|shown`).map((label) => ({ label, to: 'left' })),
        },
        {
          id: 'left',
          ask: 'Still to prove:',
          branches: [
            ...turned([m(left), m(done)], `${key}|left`).map((label) => ({ label, to: 'start' })),
            { label: 'Nothing: it is done', outcome: 'The proof would end here.' },
          ],
        },
        {
          id: 'start',
          ask: 'To prove that through its contrapositive, you start by assuming',
          branches: turned([R.neg, S.neg, S.tex], `${key}|start`).map((tex) => ({
            label: m(tex),
            outcome: `The second half starts from $${tex}$.`,
          })),
        },
      ],
      answer: [m(done), m(left), m(R.neg)],
    };
  },
  solution(params) {
    const { done, left, from, to, R, S } = directionParts(params);
    return [
      {
        text: params.contra
          ? `Assuming $${from}$ and reaching $${to}$ proves the contrapositive of $${done}$, so it proves $${done}$.`
          : `Assuming $${from}$ and reaching $${to}$ proves $${done}$.`,
      },
      {
        text: `That leaves $${left}$. Through its contrapositive: assume $${R.neg}$ and reach $${S.neg}$.`,
      },
    ];
  },
};

interface HalfParams {
  claim: IffClaim;
  line: 'p' | 'q' | 'np' | 'nq';
}

const prfDirectionChoice: Generator<HalfParams> = {
  id: 'prf-direction-choice',
  sample(rng, difficulty) {
    return { claim: sampleIff(rng), line: rng.pick(difficulty >= 2 ? (['np', 'nq'] as const) : (['p', 'q'] as const)) };
  },
  render({ claim, line }) {
    const { p, q, whole } = iffSides(claim);
    const opening = { p: p.tex, q: q.tex, np: p.neg, nq: q.neg }[line];
    const forward = line === 'p' || line === 'nq';
    const pq = imp(p.tex, q.tex);
    const qp = imp(q.tex, p.tex);
    return choiceSlide(
      [
        say(`A proof of $${iff(p.tex, q.tex)}$ has two halves.${wholeNote(whole)}`),
        say(`One half starts: “Assume $${opening}$.” Which implication is that half proving?`),
      ],
      forward ? pq : qp,
      [forward ? qp : pq],
    );
  },
  solution({ claim, line }) {
    const { p, q } = iffSides(claim);
    const text = {
      p: `Assuming $${p.tex}$, it works towards $${q.tex}$: that proves $${imp(p.tex, q.tex)}$.`,
      q: `Assuming $${q.tex}$, it works towards $${p.tex}$: that proves $${imp(q.tex, p.tex)}$.`,
      np: `Assuming $${p.neg}$, it works towards $${q.neg}$: that is the contrapositive of $${imp(q.tex, p.tex)}$, so it proves that.`,
      nq: `Assuming $${q.neg}$, it works towards $${p.neg}$: that is the contrapositive of $${imp(p.tex, q.tex)}$, so it proves that.`,
    }[line];
    return [{ text }];
  },
};

/* ================================================================
 * Level 4: Proof by Induction
 *
 * Three kinds of claim, each proved from one base case and one step:
 *
 * - a sum: the odd numbers, `1 + 3 + ... + (2n - 1) = n^2`, or the whole
 *   numbers, `1 + 2 + ... + n = \tfrac{1}{2}n(n + 1)`, or a whole multiple of
 *   either. `shift` adds a constant to the right side, which makes a false
 *   claim whose step still works: the reason a base case is needed at all.
 * - divisibility: `b^n + c` is a multiple of `d`, with `d` a factor of
 *   `b - 1`, because `b^{k+1} + c = b(b^k + c) - c(b - 1)`. True exactly when
 *   `d` divides `b + c` too; the classic claims have `c = -1`.
 * - an inequality that only starts to hold at some `n = N`, found by
 *   checking, never assumed.
 *
 * Sequences & Series owns sigma notation and general sums, so the sums here
 * are the two classic ones and their multiples.
 * ================================================================ */

type SumClaim = { kind: 'sum'; series: 'odd' | 'nat'; c: number; shift: number };
type DivClaim = { kind: 'div'; b: number; c: number; d: number };
type IneqShape = 'powLin' | 'factPow' | 'factLin' | 'powSq' | 'factSq';
type IneqClaim = { kind: 'ineq'; shape: IneqShape; b: number; a: number };
type IndClaim = SumClaim | DivClaim | IneqClaim;

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** A multiplier in front of a letter or a bracket: nothing for 1. */
const coefTex = (c: number) => (c === 1 ? '' : `${c}`);

/** `a(k + 1)`, or `k + 1` when a is 1. */
const timesTex = (a: number, inner: string) => (a === 1 ? inner : `${a}(${inner})`);

/** A term in brackets when it has a sign outside any bracket, so it can follow a `+`. */
const bracketed = (t: string) => (/ [+-] /.test(t.replace(/\([^()]*\)/g, '')) ? `(${t})` : t);

/** `v` as an exponent: `n`, `3`, or `{k+1}`. */
const expTex = (v: string) => (v.length > 1 ? `{${v.replace(/ /g, '')}}` : v);

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const upperFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/* ---------- sums ---------- */

const ODD_C = [1, 2, 3, 4, 5, 6, 7, 8, 9];
/** No 2: `2 + 4 + ... + 2n = n(n + 1)` leaves the step nothing to factorise. */
const NAT_C = [1, 3, 4, 5, 6, 7, 8, 9];

function sampleSum(rng: Rng, top = 9): SumClaim {
  const series = rng.pick(['odd', 'nat'] as const);
  const pool = (series === 'odd' ? ODD_C : NAT_C).filter((c) => c <= top);
  return { kind: 'sum', series, c: rng.pick(pool), shift: 0 };
}

const sumTerm = ({ series, c }: SumClaim, r: number) => (series === 'odd' ? c * (2 * r - 1) : c * r);

/** The right side at `n`, shift included. */
const sumRight = ({ series, c, shift }: SumClaim, n: number) =>
  (series === 'odd' ? c * n * n : (c * n * (n + 1)) / 2) + shift;

/** The term at `v + s`, in `v`: `2k + 1` for the odd numbers at `k + 1`. */
function sumTermTex({ series, c }: SumClaim, v: string, s = 0): string {
  if (series === 'odd') return lin(2 * c, 2 * c * s - c, v);
  return s === 0 ? lin(c, 0, v) : timesTex(c, `${v} + ${s}`);
}

/** The first three terms, then the dots and the term at `v + s`. */
function sumLeftTex(claim: SumClaim, v: string, s = 0): string {
  const first = [1, 2, 3].map((r) => sumTerm(claim, r)).join(' + ');
  return `${first} + \\dots + ${bracketed(sumTermTex(claim, v, s))}`;
}

/** Half of c in front of a product: `\tfrac{3}{2}`, `2`, or nothing. */
const halfTex = (c: number) => (c % 2 ? `\\tfrac{${c}}{2}` : coefTex(c / 2));

/** The right side at `v + s`: `n^2`, `3(k + 1)^2`, `\tfrac{1}{2}(k + 1)(k + 2)`. */
function sumRightTex({ series, c, shift }: SumClaim, v: string, s = 0): string {
  const x = s === 0 ? v : `(${v} + ${s})`;
  const main = series === 'odd' ? `${coefTex(c)}${x}^2` : `${halfTex(c)}${x}(${v} + ${s + 1})`;
  return shift === 0 ? main : `${main} ${signedTail(shift)}`;
}

/** `\tfrac{3}{2}k` or `2k`: the whole-number sum's right side over `k + 1`, less its constant. */
const halfK = (c: number) => `${halfTex(c)}k`;
const natInner = (c: number) => `${halfK(c)} + ${c}`;

/** The right side at n = 1, worked: `1^2 = 1`, `\tfrac{3}{2} \times 1 \times 2 = 3`. */
function sumRightAtOne({ series, c }: SumClaim): string {
  if (series === 'odd') return c === 1 ? '1^2 = 1' : `${c} \\times 1^2 = ${c}`;
  return `${c % 2 ? `\\tfrac{${c}}{2}` : c / 2} \\times 1 \\times 2 = ${c}`;
}

/* ---------- divisibility ---------- */

const divisorsOf = (m: number) => Array.from({ length: m - 1 }, (_, i) => i + 2).filter((d) => m % d === 0);

/** `b^n + c` is a multiple of `d`: `c = -1` unless `general`, which draws any true `c` up to 9. */
function sampleDiv(rng: Rng, general: boolean, top = 11): DivClaim {
  const b = rng.int(3, top);
  const d = rng.pick(divisorsOf(b - 1));
  const cs = Array.from({ length: 9 }, (_, i) => i + 1).filter((c) => (b + c) % d === 0);
  if (!general || cs.length === 0 || rng.chance(0.3)) return { kind: 'div', b, c: -1, d };
  return { kind: 'div', b, c: rng.pick(cs), d };
}

/** A claim whose step works but whose base case fails: `d` does not divide `b + c`. */
function sampleFalseDiv(rng: Rng): DivClaim {
  const b = rng.int(3, 9);
  const d = rng.pick(divisorsOf(b - 1));
  const cs = Array.from({ length: 9 }, (_, i) => i + 1).filter((c) => (b + c) % d !== 0);
  return { kind: 'div', b, c: rng.pick(cs), d };
}

const divTex = ({ b, c }: DivClaim, v: string) => `${b}^${expTex(v)} ${signedTail(c)}`;

/** What is left over: `b^{k+1} + c = b(b^k + c) + rest`. */
const divRest = ({ b, c }: DivClaim) => -c * (b - 1);

/* ---------- inequalities ---------- */

const isPow = (shape: IneqShape) => shape === 'powLin' || shape === 'powSq';

function ineqLeft({ shape, b }: IneqClaim, v: string): string {
  if (isPow(shape)) return `${b}^${expTex(v)}`;
  return v.includes(' ') ? `(${v})!` : `${v}!`;
}

function ineqRight({ shape, a }: IneqClaim, v: string): string {
  const compound = v.includes(' ');
  if (shape === 'factPow') return `${a}^${expTex(v)}`;
  if (shape === 'powSq' || shape === 'factSq') return compound ? `(${v})^2` : `${v}^2`;
  if (compound) return timesTex(a, v);
  return /^\d+$/.test(v) ? `${a} \\times ${v}` : `${coefTex(a)}${v}`;
}

const ineqLeftValue = ({ shape, b }: IneqClaim, n: number) => (isPow(shape) ? b ** n : factorial(n));

function ineqRightValue({ shape, a }: IneqClaim, n: number): number {
  if (shape === 'factPow') return a ** n;
  return shape === 'powSq' || shape === 'factSq' ? n * n : a * n;
}

const ineqHolds = (claim: IneqClaim, n: number) => ineqLeftValue(claim, n) > ineqRightValue(claim, n);

/** The smallest N from which the claim holds at every n, checked as far as n = 15. */
function ineqStart(claim: IneqClaim): number {
  let start = 16;
  for (let n = 15; n >= 1 && ineqHolds(claim, n); n -= 1) start = n;
  return start;
}

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

const ineq = (shape: IneqShape, b: number, a: number): IneqClaim => ({ kind: 'ineq', shape, b, a });

/** Each starts at n = 2 or later, and no number in a base case reaches 1000. */
const INEQ_POW = [...range(2, 10).map((a) => ineq('powLin', 2, a)), ...range(3, 9).map((a) => ineq('powLin', 3, a))];
const INEQ_FACT_POW = [ineq('factPow', 1, 2)];
const INEQ_FACT_LIN = range(2, 9).map((a) => ineq('factLin', 1, a));
const INEQ_SQUARES = [ineq('powSq', 2, 1), ineq('factSq', 1, 1)];
const INEQ_ALL = [...INEQ_POW, ...INEQ_FACT_POW, ...INEQ_FACT_LIN, ...INEQ_SQUARES];

/**
 * The same steps with bigger numbers, for the harder draws of
 * `prf-ind-ineq-flow`, so that they are not the difficulty-1 claims again.
 * Base cases move to n = 4, 5, 7 or 8, and still no number in one reaches 1000.
 */
const INEQ_WIDE = [
  ...range(11, 20).map((a) => ineq('powLin', 2, a)),
  ...range(10, 20).map((a) => ineq('powLin', 3, a)),
  ...range(10, 20).map((a) => ineq('factLin', 1, a)),
];

/* ---------- a claim as the learner reads it ---------- */

const startOf = (claim: IndClaim) => (claim.kind === 'ineq' ? ineqStart(claim) : 1);

/** The claim at `v + s`, as prose with inline maths. */
function claimProse(claim: IndClaim, v = 'n', s = 0): string {
  const x = s === 0 ? v : `${v} + ${s}`;
  switch (claim.kind) {
    case 'sum':
      return `$${sumLeftTex(claim, v, s)} = ${sumRightTex(claim, v, s)}$`;
    case 'div':
      return `$${divTex(claim, x)}$ is a multiple of $${claim.d}$`;
    case 'ineq':
      return `$${ineqLeft(claim, x)} > ${ineqRight(claim, x)}$`;
  }
}

const claimLine = (claim: IndClaim, from = startOf(claim)) =>
  `Claim: ${claimProse(claim)} for every whole number $n \\ge ${from}$.`;

/** The base case, starting in lower case: "at $n = 1$ the left side is ...". */
function baseCheck(claim: IndClaim): string {
  switch (claim.kind) {
    case 'sum':
      return `at $n = 1$ the left side is $${sumTerm(claim, 1)}$ and the right side is $${sumRightAtOne(claim)}$`;
    case 'div': {
      const v = claim.b + claim.c;
      return `at $n = 1$, $${divTex(claim, '1')} = ${v} = ${claim.d} \\times ${v / claim.d}$`;
    }
    case 'ineq': {
      const N = ineqStart(claim);
      return `at $n = ${N}$, $${ineqLeft(claim, `${N}`)} = ${ineqLeftValue(claim, N)} > ${ineqRightValue(claim, N)} = ${ineqRight(claim, `${N}`)}$`;
    }
  }
}

function hypothesisLine(claim: IndClaim): string {
  switch (claim.kind) {
    case 'sum':
      return `Assume it holds at $n = k$: $${sumLeftTex(claim, 'k')} = ${sumRightTex(claim, 'k')}$.`;
    case 'div':
      return `Assume $${divTex(claim, 'k')} = ${claim.d}m$ for some whole number $m$.`;
    case 'ineq':
      return `Assume $${ineqLeft(claim, 'k')} > ${ineqRight(claim, 'k')}$ for some whole number $k \\ge ${ineqStart(claim)}$.`;
  }
}

/** The sum's right side at k + 1 before it is tidied: `k^2 + 2k + 1`, `(k + 1)(\tfrac{3}{2}k + 3)`. */
function sumMiddle(claim: SumClaim): string {
  const { series, c, shift } = claim;
  if (series === 'odd') return polyTex([c, 2 * c, c + shift]);
  return `(k + 1)(${natInner(c)})${shift === 0 ? '' : ` ${signedTail(shift)}`}`;
}

function ineqStepLines({ shape, b, a }: IneqClaim): string[] {
  switch (shape) {
    case 'powLin':
      return [
        `Then $${b}^{k+1} = ${b} \\times ${b}^k > ${b * a}k$.`,
        `And $${b * a}k = ${a}k + ${(b - 1) * a}k \\ge ${a}k + ${a} = ${a}(k + 1)$, since $k \\ge 1$.`,
      ];
    case 'factPow':
      return [
        'Then $(k + 1)! = (k + 1) \\times k! > (k + 1) \\times 2^k$.',
        'And $k + 1 > 2$, so $(k + 1) \\times 2^k > 2 \\times 2^k = 2^{k+1}$.',
      ];
    case 'factLin':
      return [
        `Then $(k + 1)! = (k + 1) \\times k! > (k + 1) \\times ${a}k$.`,
        `And $k \\ge 1$, so $(k + 1) \\times ${a}k \\ge ${a}(k + 1)$.`,
      ];
    case 'powSq':
      return [
        'Then $2^{k+1} = 2 \\times 2^k > 2k^2 = k^2 + k^2$.',
        'And $k^2 \\ge 3k > 2k + 1$ once $k \\ge 3$, so $k^2 + k^2 > k^2 + 2k + 1 = (k + 1)^2$.',
      ];
    case 'factSq':
      return [
        'Then $(k + 1)! = (k + 1) \\times k! > (k + 1)k^2$.',
        'And $k^2 \\ge k + 1$ once $k \\ge 2$, so $(k + 1)k^2 \\ge (k + 1)^2$.',
      ];
  }
}

/** The algebra of the step: two lines, or three when `split`. */
function stepLines(claim: IndClaim, split: boolean): string[] {
  switch (claim.kind) {
    case 'sum': {
      const next = bracketed(sumTermTex(claim, 'k', 1));
      const final = sumRightTex(claim, 'k', 1);
      const first = `Then at $n = k + 1$ the sum is $${sumRightTex(claim, 'k')} + ${next}$.`;
      return split
        ? [first, `That is $${sumMiddle(claim)}$.`, `And that is $${final}$, the right side at $n = k + 1$.`]
        : [first, `That is $${sumMiddle(claim)} = ${final}$, the right side at $n = k + 1$.`];
    }
    case 'div': {
      const { b, c, d } = claim;
      const rest = divRest(claim);
      const regroup = `$${divTex(claim, 'k + 1')} = ${b}(${divTex(claim, 'k')}) ${signedTail(rest)}$`;
      const last = `That is $${b}(${d}m) ${signedTail(rest)} = ${d}(${lin(b, rest / d, 'm')})$, a multiple of $${d}$.`;
      return split
        ? [
            `Then $${divTex(claim, 'k + 1')} = ${b} \\times ${b}^k ${signedTail(c)}$.`,
            `That is $${b}(${divTex(claim, 'k')}) ${signedTail(rest)}$.`,
            last,
          ]
        : [`Then ${regroup}.`, last];
    }
    case 'ineq':
      return ineqStepLines(claim);
  }
}

const conclusionLine = (claim: IndClaim) => {
  const N = startOf(claim);
  return `It holds at $n = ${N}$, and whenever it holds at $n = k$ it holds at $n = k + 1$: so it holds for every $n \\ge ${N}$.`;
};

/** The ways a step of this claim's proof gets written wrongly, for an order bank. */
function slipPool(claim: IndClaim): Distractor[] {
  const assumeNext: Distractor = {
    text: `Assume it holds at $n = k + 1$: ${claimProse(claim, 'k', 1)}.`,
    why: 'That assumes what the step has to show.',
  };
  switch (claim.kind) {
    case 'sum': {
      const next = bracketed(sumTermTex(claim, 'k', 1));
      return [
        assumeNext,
        {
          text: `Then at $n = k + 1$ the sum is $${sumRightTex(claim, 'k')} + ${bracketed(sumTermTex(claim, 'k'))}$.`,
          why: `The term added at $n = k + 1$ is $${sumTermTex(claim, 'k', 1)}$, not the one before it.`,
        },
        {
          text: `Then at $n = k + 1$ the sum is $${sumRightTex(claim, 'k', 1)} + ${next}$.`,
          why: `The sum up to $n = k$ is $${sumRightTex(claim, 'k')}$; $${sumRightTex(claim, 'k', 1)}$ is where the step is heading.`,
        },
        { text: 'It also holds at $n = 2$ and at $n = 3$, so it holds for every $n$.', why: 'Checking more values is not a proof.' },
      ];
    }
    case 'div': {
      const { b, c, d } = claim;
      return [
        assumeNext,
        {
          text: `Then $${divTex(claim, 'k + 1')} = ${b}(${divTex(claim, 'k')})$.`,
          why: `$${b}(${divTex(claim, 'k')}) = ${b}^{k+1} ${signedTail(b * c)}$, so something is missing.`,
        },
        {
          text: `Then $${divTex(claim, 'k + 1')} = (${divTex(claim, 'k')}) + ${b}$.`,
          why: `$${b}^{k+1}$ is $${b}$ times $${b}^k$, not $${b}$ more than it.`,
        },
        {
          text: `It also works at $n = 2$: $${divTex(claim, '2')} = ${b * b + c}$, a multiple of $${d}$.`,
          why: 'One more example is not a proof.',
        },
      ];
    }
    case 'ineq': {
      const N = ineqStart(claim);
      const low = N - 1;
      const up = N + 1;
      const pow = isPow(claim.shape);
      return [
        {
          text: `Assume $${ineqLeft(claim, 'k + 1')} > ${ineqRight(claim, 'k + 1')}$ for some whole number $k \\ge ${N}$.`,
          why: 'That assumes what the step has to show.',
        },
        {
          text: `Base case: at $n = ${low}$, $${ineqLeft(claim, `${low}`)} = ${ineqLeftValue(claim, low)} > ${ineqRightValue(claim, low)} = ${ineqRight(claim, `${low}`)}$.`,
          why: `That is false: $${ineqLeftValue(claim, low)} \\le ${ineqRightValue(claim, low)}$. The claim holds for good from $n = ${N}$.`,
        },
        {
          text: `It also holds at $n = ${up}$, since $${ineqLeftValue(claim, up)} > ${ineqRightValue(claim, up)}$.`,
          why: 'One more example is not a proof.',
        },
        pow
          ? {
              text: `Then $${claim.b}^{k+1} = ${claim.b}^k + ${claim.b} > ${ineqRight(claim, 'k')} + ${claim.b}$.`,
              why: `$${claim.b}^{k+1} = ${claim.b} \\times ${claim.b}^k$, not $${claim.b}^k + ${claim.b}$.`,
            }
          : {
              text: `Then $(k + 1)! = k! + 1 > ${ineqRight(claim, 'k')} + 1$.`,
              why: '$(k + 1)! = (k + 1) \\times k!$, not $k! + 1$.',
            },
      ];
    }
  }
}

function inductionProof(claim: IndClaim, split: boolean): Proof {
  return {
    claim: `Prove by induction: ${claimProse(claim)} for every whole number $n \\ge ${startOf(claim)}$.`,
    steps: [`Base case: ${baseCheck(claim)}.`, hypothesisLine(claim), ...stepLines(claim, split), conclusionLine(claim)],
    pool: slipPool(claim),
  };
}

/** Any true claim: a sum, a divisibility or an inequality. */
function sampleClaim(rng: Rng, hard: boolean): IndClaim {
  const kind = rng.pick(['sum', 'div', 'ineq'] as const);
  if (kind === 'sum') return sampleSum(rng, hard ? 9 : 4);
  if (kind === 'div') return sampleDiv(rng, hard);
  return rng.pick(hard ? INEQ_ALL : INEQ_POW);
}

/* ================================================================
 * Lesson 1: the shape of an inductive proof
 * ================================================================ */

/* ---------- the four parts, in order ---------- */

function skeletonProof(claim: IndClaim, hard: boolean): Proof {
  const N = startOf(claim);
  const [first, ...rest] = stepLines(claim, false);
  return {
    claim: `Prove by induction: ${claimProse(claim)} for every whole number $n \\ge ${N}$.`,
    steps: [
      `Base case: ${baseCheck(claim)}.`,
      `Hypothesis: assume it holds at $n = k$, for some $k \\ge ${N}$.`,
      ...(hard
        ? [`Step: ${lowerFirst(first)}`, ...rest]
        : [`Step: from that, show it holds at $n = k + 1$: ${claimProse(claim, 'k', 1)}.`]),
      `Conclusion: it holds for every $n \\ge ${N}$.`,
    ],
    pool: [
      { text: 'Hypothesis: assume it holds at $n = k + 1$.', why: 'The step has to show that; assuming it is circular.' },
      { text: `Check $n = ${N + 1}$ and $n = ${N + 2}$ as well, instead of a step.`, why: 'Checking more values is not a proof.' },
      { text: `Conclusion: it held at $n = ${N}$, so it holds for every $n$.`, why: 'A base case on its own proves one value.' },
      { text: 'Hypothesis: assume it holds for every $n$.', why: 'That assumes the whole claim.' },
    ],
  };
}

interface SkeletonParams {
  claim: IndClaim;
  hard: boolean;
  picks: number[];
}

const prfIndSkeleton: Generator<SkeletonParams> = {
  id: 'prf-ind-skeleton',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const claim = sampleClaim(rng, hard);
    return { claim, hard, picks: pickDistractors(rng, skeletonProof(claim, hard), difficulty) };
  },
  render({ claim, hard, picks }) {
    return orderSlide(skeletonProof(claim, hard), picks);
  },
  solution({ claim, hard, picks }) {
    return [
      { text: 'Every proof by induction has the same four parts: base case, hypothesis, step, conclusion.' },
      ...orderSolution(skeletonProof(claim, hard), picks),
    ];
  },
};

/* ---------- which part is this line? ---------- */

type ProofPart = 'base' | 'hyp' | 'step' | 'end';

const PART_PATH: Record<ProofPart, string[]> = {
  base: ['Yes'],
  hyp: ['No', 'Yes'],
  step: ['No', 'No', 'Towards $n = k + 1$'],
  end: ['No', 'No', 'Drawing it together'],
};

const PART_NAME: Record<ProofPart, string> = {
  base: 'the base case',
  hyp: 'the inductive hypothesis',
  step: 'the inductive step',
  end: 'the conclusion',
};

interface PartParams {
  claim: IndClaim;
  part: ProofPart;
  wording: number;
}

function partLine({ claim, part, wording }: PartParams): string {
  switch (part) {
    case 'base':
      return wording ? `First, ${baseCheck(claim)}.` : `${upperFirst(baseCheck(claim))}.`;
    case 'hyp':
      return wording ? `Suppose the claim is true when $n = k$: ${claimProse(claim, 'k')}.` : hypothesisLine(claim);
    case 'step':
      return stepLines(claim, false)[wording];
    case 'end':
      return wording
        ? `By induction, ${claimProse(claim)} for every whole number $n \\ge ${startOf(claim)}$.`
        : conclusionLine(claim);
  }
}

const prfIndPartFlow: Generator<PartParams> = {
  id: 'prf-ind-part-flow',
  sample(rng, difficulty) {
    return {
      claim: sampleClaim(rng, difficulty >= 2),
      part: rng.pick<ProofPart>(['base', 'hyp', 'step', 'end']),
      wording: rng.int(0, 1),
    };
  },
  render(params) {
    return {
      kind: 'flow',
      prompt: [
        say(claimLine(params.claim)),
        say(`One line of its proof: “${partLine(params)}”`),
        say('Which part of the proof is that line? Each answer chooses what gets asked next.'),
      ],
      subject: '\\text{Which part is it?}',
      steps: [
        {
          id: 'one',
          ask: 'Does the line work with one particular value of $n$?',
          branches: [
            { label: 'Yes', outcome: 'It is the base case.' },
            { label: 'No', to: 'assume' },
          ],
        },
        {
          id: 'assume',
          ask: 'Does it take something as true without showing it?',
          branches: [
            { label: 'Yes', outcome: 'It is the inductive hypothesis.' },
            { label: 'No', to: 'aim' },
          ],
        },
        {
          id: 'aim',
          ask: 'Is it working towards $n = k + 1$, or drawing the proof together?',
          branches: [
            { label: 'Towards $n = k + 1$', outcome: 'It is the inductive step.' },
            { label: 'Drawing it together', outcome: 'It is the conclusion.' },
          ],
        },
      ],
      answer: PART_PATH[params.part],
    };
  },
  solution({ claim, part }) {
    const why: Record<ProofPart, string> = {
      base: `It checks one value, $n = ${startOf(claim)}$, by working out both sides.`,
      hyp: 'It takes the claim at $n = k$ as true without showing it. That is allowed: it is the hypothesis the step builds on.',
      step: 'It starts from the case $n = k$ and works towards the claim at $n = k + 1$.',
      end: 'It puts the base case and the step together to claim every $n$ from the start.',
    };
    return [{ text: `That line is ${PART_NAME[part]}.` }, { text: why[part] }];
  },
};

/* ---------- the claim at n = k + 1 ---------- */

function nextClaimTiles(claim: IndClaim): { template: string; answer: string[]; distractors: string[] } {
  switch (claim.kind) {
    case 'sum':
      return {
        template: `${sumLeftTex(claim, 'k')} + {0} = {1}`,
        answer: [bracketed(sumTermTex(claim, 'k', 1)), sumRightTex(claim, 'k', 1)],
        distractors: [
          bracketed(sumTermTex(claim, 'k', 2)),
          bracketed(sumTermTex(claim, 'k')),
          sumRightTex(claim, 'k'),
          sumRightTex(claim, 'k', 2),
        ],
      };
    case 'div':
      return {
        template: `{0} ${signedTail(claim.c)} \\text{ is a multiple of } {1}`,
        answer: [`${claim.b}^{k+1}`, `${claim.d}`],
        distractors: [`${claim.b}^k`, `${claim.b}(k + 1)`, `${claim.b}`, `${claim.b}^{k+2}`],
      };
    case 'ineq':
      return {
        template: '{0} > {1}',
        answer: [ineqLeft(claim, 'k + 1'), ineqRight(claim, 'k + 1')],
        distractors: [ineqLeft(claim, 'k'), ineqRight(claim, 'k'), `${ineqRight(claim, 'k')} + 1`],
      };
  }
}

const prfIndNextClaim: Generator<{ claim: IndClaim }> = {
  id: 'prf-ind-next-claim',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { claim: sampleClaim(rng, true) };
    return { claim: rng.chance(0.5) ? sampleSum(rng, 9) : rng.pick(INEQ_POW) };
  },
  render({ claim }) {
    const { template, answer, distractors } = nextClaimTiles(claim);
    return {
      kind: 'tiles',
      prompt: [say(claimLine(claim)), say('Write the claim at $n = k + 1$: the line the inductive step has to reach.')],
      template,
      bank: fillBank(answer, distractors),
      answer,
    };
  },
  solution({ claim }) {
    return [
      { text: 'Put $k + 1$ in place of every $n$:' },
      { text: `${upperFirst(claimProse(claim, 'k', 1))}.` },
      {
        text:
          claim.kind === 'sum'
            ? `The left side gains one more term, $${sumTermTex(claim, 'k', 1)}$, and the right side is the formula at $k + 1$.`
            : claim.kind === 'div'
              ? `The power moves up one, and the number it must be a multiple of stays $${claim.d}$.`
              : 'Both sides change: each is the same expression with $k + 1$ in it.',
      },
    ];
  },
};

/* ---------- what a base case and a step prove ---------- */

type CoverSetup = 'full' | 'noBase' | 'checks' | 'gap';

interface CoversParams {
  setup: CoverSetup;
  a: number;
  m: number;
}

const coverGe = (x: number) => `n \\ge ${x}`;
const coverOnly = (xs: number[]) => `n = ${xs.join(', ')} \\text{ only}`;
const COVER_NONE = '\\text{none yet}';

function coverPlan({ setup, a, m }: CoversParams): { text: string; correct: string; distractors: string[] } {
  const checks = range(a, a + m - 1);
  const list = checks.map((x) => `$n = ${x}$`);
  const listText = `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
  switch (setup) {
    case 'full':
      return {
        text: `A proof checks a claim at $n = ${a}$. It then shows that whenever the claim holds at $n = k$, for any $k \\ge ${a}$, it holds at $n = k + 1$.`,
        correct: coverGe(a),
        distractors: [coverGe(a > 1 ? 1 : 2), coverOnly([a]), COVER_NONE],
      };
    case 'noBase':
      return {
        text: `A proof shows that whenever a claim holds at $n = k$, for any $k \\ge ${a}$, it holds at $n = k + 1$. It checks no value of $n$ at all.`,
        correct: COVER_NONE,
        distractors: [coverGe(a), coverGe(a + 1), coverOnly([a])],
      };
    case 'checks':
      return {
        text: `A proof checks a claim at ${listText}, and stops there.`,
        correct: coverOnly(checks),
        distractors: [coverGe(a), coverOnly([a]), COVER_NONE],
      };
    case 'gap':
      return {
        text: `A proof checks a claim at $n = ${a}$. It then shows that whenever the claim holds at $n = k$, for any $k \\ge ${a + 2}$, it holds at $n = k + 1$.`,
        correct: coverOnly([a]),
        distractors: [coverGe(a), coverGe(a + 2), COVER_NONE],
      };
  }
}

const prfIndCovers: Generator<CoversParams> = {
  id: 'prf-ind-covers',
  sample(rng, difficulty) {
    const setups: CoverSetup[] = difficulty >= 2 ? ['full', 'noBase', 'checks', 'gap', 'gap'] : ['full', 'noBase', 'checks'];
    return { setup: rng.pick(setups), a: rng.int(1, 8), m: rng.int(2, 3) };
  },
  render(params) {
    const { text, correct, distractors } = coverPlan(params);
    return choiceSlide([say(text), say('Exactly which whole numbers $n$ does that prove the claim for?')], correct, distractors);
  },
  solution(params) {
    const { setup, a } = params;
    const why: Record<CoverSetup, string> = {
      full: `The base case gives $n = ${a}$. The step, used at $k = ${a}$, gives $n = ${a + 1}$; used again, $n = ${a + 2}$; and so on for good. Nothing reaches the numbers below $${a}$.`,
      noBase: 'The step only passes the claim along. With no first case to start from, it has nothing to pass on, so no value of $n$ is proved yet.',
      checks: 'Each check proves the value it checks and nothing more. Without a step, nothing carries on to the next $n$.',
      gap: `The step only starts at $k = ${a + 2}$, so it cannot use the case $n = ${a}$. Nothing gives $n = ${a + 1}$ or $n = ${a + 2}$, and so nothing after.`,
    };
    return [{ text: why[setup] }, { tex: coverPlan(params).correct }];
  },
};

/* ================================================================
 * Lesson 2: sums
 * ================================================================ */

interface SumOrderParams {
  claim: SumClaim;
  hard: boolean;
  picks: number[];
}

const prfIndOrderSum: Generator<SumOrderParams> = {
  id: 'prf-ind-order-sum',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const claim = sampleSum(rng, hard ? 9 : 5);
    return { claim, hard, picks: pickDistractors(rng, inductionProof(claim, hard), difficulty) };
  },
  render({ claim, hard, picks }) {
    return orderSlide(inductionProof(claim, hard), picks);
  },
  solution({ claim, hard, picks }) {
    return orderSolution(inductionProof(claim, hard), picks);
  },
};

/* ---------- the assumed sum plus the next term, tidied ---------- */

interface SumStepsParams {
  claim: SumClaim;
  hard: boolean;
  wording: number;
}

type Reductions = Extract<Slide, { kind: 'steps' }>['reductions'];

function sumReductions({ claim, hard }: SumStepsParams): { start: string[]; reductions: Reductions } {
  const { series, c } = claim;
  const final = sumRightTex(claim, 'k', 1);
  if (series === 'odd') {
    const next = `(${lin(2 * c, c)})`;
    const expanded = polyTex([c, 2 * c, c]);
    const reductions: Reductions = [
      {
        span: [0, 3],
        operator: 1,
        value: expanded,
        bank: stepBank(expanded, polyTex([c, 2 * c, 2 * c]), polyTex([2 * c, 2 * c, c]), polyTex([c, 2 * c + 1, c])),
      },
      {
        span: [0, 1],
        value: final,
        bank: stepBank(final, `${coefTex(c)}(k + 1)^2 + ${c}`, `${coefTex(c)}(k + 2)^2`, `${coefTex(c)}k(k + 2)`),
      },
    ];
    if (!hard) return { start: [sumRightTex(claim, 'k'), '+', next], reductions };
    return {
      start: [sumRightTex(claim, 'k'), '+', `(${2 * c}(k + 1) - ${c})`],
      reductions: [
        {
          span: [2, 3],
          value: next,
          bank: stepBank(next, `(${lin(2 * c, -c)})`, `(${lin(2 * c, 2 * c)})`, `(${lin(2 * c, 3 * c)})`),
        },
        ...reductions,
      ],
    };
  }
  const factored = `(k + 1)(${natInner(c)})`;
  const reductions: Reductions = [
    {
      span: [0, 3],
      operator: 1,
      value: factored,
      bank: stepBank(factored, `(k + 1)(${halfK(c)})`, `(k + 1)(${halfK(c)} + ${2 * c})`, `k(${natInner(c)})`),
    },
    {
      span: [0, 1],
      value: final,
      bank: stepBank(final, `${halfTex(c)}(k + 1)(k + 3)`, `${halfTex(c)}(k + 1)^2`, `${halfTex(c)}k(k + 2)`),
    },
  ];
  if (!hard) return { start: [sumRightTex(claim, 'k'), '+', c === 1 ? '(k + 1)' : `${c}(k + 1)`], reductions };
  const tidy = timesTex(c, 'k + 1');
  return {
    start: [sumRightTex(claim, 'k'), '+', `(${lin(c, c)})`],
    reductions: [
      { span: [2, 3], value: tidy, bank: stepBank(tidy, `${c}k(k + 1)`, `(k + ${c})`, `${c}(k + ${c})`) },
      ...reductions,
    ],
  };
}

const prfIndSumSteps: Generator<SumStepsParams> = {
  id: 'prf-ind-sum-steps',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    let claim = sampleSum(rng);
    // A hard whole-number sum starts from `(3k + 3)`, which needs a factor to take out.
    while (hard && claim.series === 'nat' && claim.c === 1) claim = sampleSum(rng);
    return { claim, hard, wording: rng.int(0, 1) };
  },
  render(params) {
    const { start, reductions } = sumReductions(params);
    return {
      kind: 'steps',
      prompt: [
        say(claimLine(params.claim)),
        say(
          params.wording
            ? 'Below is the step: the assumed sum plus the next term. Work it into the right side at $n = k + 1$.'
            : 'The step has reached the line below. Simplify it into the right side of the claim at $n = k + 1$.',
        ),
        say('Tap the part to work on next, then choose what it becomes.'),
      ],
      start,
      reductions,
    };
  },
  solution({ claim, hard }) {
    const { series, c } = claim;
    const steps: SolutionStep[] = [];
    if (hard) steps.push({ text: `First tidy the next term: $${series === 'odd' ? `${2 * c}(k + 1) - ${c} = ${lin(2 * c, c)}` : `${lin(c, c)} = ${timesTex(c, 'k + 1')}`}$.` });
    if (series === 'odd') {
      steps.push({ text: 'Multiply out and collect:' });
      steps.push({
        tex: `\\begin{aligned} &${sumRightTex(claim, 'k')} + (${lin(2 * c, c)}) \\\\ &= ${polyTex([c, 2 * c, c])} \\end{aligned}`,
      });
      steps.push({ text: `Take out $${c}$ and the rest is a perfect square: $${sumRightTex(claim, 'k', 1)}$.` });
    } else {
      steps.push({ text: 'Both parts have a factor $(k + 1)$; take it out:' });
      steps.push({
        tex: `\\begin{aligned} &${sumRightTex(claim, 'k')} \\\\ &+ ${bracketed(timesTex(c, 'k + 1'))} \\\\ &= (k + 1)(${natInner(c)}) \\end{aligned}`,
      });
      steps.push({ text: `And $${natInner(c)} = ${halfTex(c)}(k + 2)$, which gives $${sumRightTex(claim, 'k', 1)}$.` });
    }
    steps.push({ text: 'That is the right side of the claim at $n = k + 1$, which is what the step had to reach.' });
    return steps;
  },
};

/* ---------- checking the step with numbers ---------- */

interface SumCheckParams {
  claim: SumClaim;
  k: number;
}

const prfIndSumCheck: Generator<SumCheckParams> = {
  id: 'prf-ind-sum-check',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    return { claim: sampleSum(rng, hard ? 9 : 4), k: hard ? rng.int(4, 7) : rng.int(2, 5) };
  },
  render({ claim, k }) {
    const a = sumRight(claim, k);
    const t = sumTerm(claim, k + 1);
    const s = a + t;
    return {
      kind: 'tree',
      prompt: [
        say(claimLine(claim)),
        say(
          `Check the step at $k = ${k}$: the sum to $n = ${k + 1}$ is the sum to $n = ${k}$ plus the next term. Top row: each part. Underneath: their total.`,
        ),
      ],
      expression: `${sumRightTex(claim, 'k')} + ${bracketed(sumTermTex(claim, 'k', 1))}`,
      nodes: [
        { id: 'a', from: [] },
        { id: 't', from: [] },
        { id: 's', from: ['a', 't'] },
      ],
      bank: treeBank([a, t, s], [sumTerm(claim, k), sumTerm(claim, k + 2), a + sumTerm(claim, k), sumRight(claim, k - 1)]),
      answer: [a, t, s].map(String),
    };
  },
  solution({ claim, k }) {
    const a = sumRight(claim, k);
    const t = sumTerm(claim, k + 1);
    return [
      { text: `At $k = ${k}$ the right side is $${a}$: the sum up to $n = ${k}$.` },
      { text: `The next term is $${sumTermTex(claim, 'n')}$ at $n = ${k + 1}$, which is $${t}$.` },
      { tex: `${a} + ${t} = ${a + t}` },
      { text: `And the right side at $n = ${k + 1}$ is $${sumRight(claim, k + 1)}$ too: the step agrees with the formula.` },
    ];
  },
};

/* ---------- the term the step adds ---------- */

interface NextTermParams {
  claim: SumClaim;
  k: number;
  gap: boolean;
}

const prfIndNextTerm: Generator<NextTermParams> = {
  id: 'prf-ind-next-term',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    return { claim: sampleSum(rng, hard ? 9 : 4), k: hard ? rng.int(4, 12) : rng.int(2, 9), gap: hard && rng.chance(0.5) };
  },
  render({ claim, k, gap }) {
    return {
      kind: 'expression',
      prompt: [
        say(claimLine(claim)),
        say(
          gap
            ? `By how much does the right side grow from $n = ${k}$ to $n = ${k + 1}$?`
            : `Going from $n = ${k}$ to $n = ${k + 1}$, the left side gains one term. What is it?`,
        ),
      ],
      lead: gap ? '\\text{growth} =' : '\\text{next term} =',
      keypad: [],
      answer: String(sumTerm(claim, k + 1)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution({ claim, k, gap }) {
    const t = sumTerm(claim, k + 1);
    if (!gap) {
      return [
        { text: `The terms follow $${sumTermTex(claim, 'n')}$, and the new one is at $n = ${k + 1}$:` },
        { text: `it is $${t}$.` },
      ];
    }
    return [
      { text: `At $n = ${k + 1}$ the right side is $${sumRight(claim, k + 1)}$; at $n = ${k}$ it is $${sumRight(claim, k)}$.` },
      { tex: `${sumRight(claim, k + 1)} - ${sumRight(claim, k)} = ${t}` },
      { text: `That is exactly the next term on the left, $${sumTermTex(claim, 'n')}$ at $n = ${k + 1}$: which is why the step works.` },
    ];
  },
};

/* ================================================================
 * Lesson 3: divisibility
 * ================================================================ */

interface DivOrderParams {
  claim: DivClaim;
  hard: boolean;
  picks: number[];
}

const prfIndOrderDivides: Generator<DivOrderParams> = {
  id: 'prf-ind-order-divides',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const claim = sampleDiv(rng, hard);
    return { claim, hard, picks: pickDistractors(rng, inductionProof(claim, hard), difficulty) };
  },
  render({ claim, hard, picks }) {
    return orderSlide(inductionProof(claim, hard), picks);
  },
  solution({ claim, hard, picks }) {
    return orderSolution(inductionProof(claim, hard), picks);
  },
};

/* ---------- finding the case n = k inside the case n = k + 1 ---------- */

interface RewriteParams {
  claim: DivClaim;
  shape: number;
}

const prfIndRewrite: Generator<RewriteParams> = {
  id: 'prf-ind-rewrite',
  sample(rng, difficulty) {
    return { claim: sampleDiv(rng, difficulty >= 2, 12), shape: rng.int(0, 1) };
  },
  render({ claim, shape }) {
    const { b, c } = claim;
    const rest = signedTail(divRest(claim));
    const lhs = `${b}^{k+1} ${signedTail(c)}`;
    const answer = shape === 0 ? [`${b}`, rest] : [divTex(claim, 'k'), rest];
    const distractors =
      shape === 0
        ? [`${b + 1}`, `${b}^k`, signedTail(-divRest(claim)), signedTail(c), signedTail(b)]
        : [`${b}^k`, divTex(claim, 'k - 1'), signedTail(-divRest(claim)), signedTail(c)];
    return {
      kind: 'tiles',
      prompt: [
        say(claimLine(claim)),
        say(`The step needs the case $n = k$, $${divTex(claim, 'k')}$, to appear inside $${divTex(claim, 'k + 1')}$. Fill in the rewrite.`),
      ],
      template: shape === 0 ? `${lhs} = {0}(${divTex(claim, 'k')}) {1}` : `${lhs} = ${b}({0}) {1}`,
      bank: fillBank(answer, distractors),
      answer,
    };
  },
  solution({ claim }) {
    const { b, c } = claim;
    const rest = divRest(claim);
    return [
      { text: `$${b}^{k+1} = ${b} \\times ${b}^k$, so take $${b}$ lots of $${divTex(claim, 'k')}$ and correct for the difference:` },
      { tex: stackTex(`${b}(${divTex(claim, 'k')}) = ${b}^{k+1} ${signedTail(b * c)}`) },
      { text: `That is $${Math.abs(rest)}$ ${rest > 0 ? 'short of' : 'more than'} $${divTex(claim, 'k + 1')}$, so` },
      { tex: stackTex(`${divTex(claim, 'k + 1')} = ${b}(${divTex(claim, 'k')}) ${signedTail(rest)}`) },
    ];
  },
};

/* ---------- the rewrite, worked into a multiple ---------- */

interface DivStepsParams {
  claim: DivClaim;
  hard: boolean;
}

const prfIndDividesSteps: Generator<DivStepsParams> = {
  id: 'prf-ind-divides-steps',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    return { claim: hard ? sampleDiv(rng, true) : sampleDiv(rng, false, 16), hard };
  },
  render({ claim, hard }) {
    const { b, c, d } = claim;
    const rest = divRest(claim);
    const tail = signedTail(rest);
    const sub = `${b}(${d}m)`;
    const product = `${b * d}m`;
    const done = `${d}(${lin(b, rest / d, 'm')})`;
    const tidy: Reductions = [
      { span: [0, 1], value: product, bank: stepBank(product, `${b + d}m`, `${d}m`, `${b}m`) },
      {
        span: [0, 2],
        operator: 1,
        value: done,
        bank: stepBank(done, `${d}(${lin(b, rest, 'm')})`, `${d}(${lin(b * d, rest / d, 'm')})`, `${d}(${lin(b, -rest / d, 'm')})`),
      },
    ];
    return {
      kind: 'steps',
      prompt: [
        say(claimLine(claim)),
        say(
          `Assume $${divTex(claim, 'k')} = ${d}m$. The step has reached $${divTex(claim, 'k + 1')} = ${b}(${divTex(claim, 'k')}) ${tail}$. Show it is a multiple of $${d}$.`,
        ),
        say('Tap the part to work on next, then choose what it becomes.'),
      ],
      start: hard ? [`${b}(${divTex(claim, 'k')})`, tail] : [sub, tail],
      reductions: hard
        ? [{ span: [0, 1], value: sub, bank: stepBank(sub, `${b}(${d}m ${signedTail(c)})`, `${d}m`, `${b}m`) }, ...tidy]
        : tidy,
    };
  },
  solution({ claim }) {
    const { b, d } = claim;
    const rest = divRest(claim);
    return [
      { text: `The hypothesis says $${divTex(claim, 'k')} = ${d}m$, so put that in:` },
      { tex: stackTex(`${b}(${d}m) ${signedTail(rest)} = ${b * d}m ${signedTail(rest)}`) },
      { text: `Both parts are multiples of $${d}$, so take $${d}$ out:` },
      { tex: `${d}(${lin(b, rest / d, 'm')})` },
      { text: `$${lin(b, rest / d, 'm')}$ is a whole number, so $${divTex(claim, 'k + 1')}$ is a multiple of $${d}$.` },
    ];
  },
};

/* ---------- the quotient ---------- */

interface QuotientParams {
  claim: DivClaim;
  n: number;
  hard: boolean;
}

const prfIndQuotient: Generator<QuotientParams> = {
  id: 'prf-ind-quotient',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const claim = sampleDiv(rng, hard);
      const n = rng.int(hard ? 3 : 2, 6);
      if (claim.b ** n + claim.c < 1000) return { claim, n, hard };
    }
  },
  render({ claim, n, hard }) {
    const { b, c, d } = claim;
    const value = b ** n + c;
    const k = n - 1;
    const m = (b ** k + c) / d;
    return {
      kind: 'expression',
      prompt: hard
        ? [
            say(claimLine(claim)),
            say(
              `At $n = ${k}$, $${divTex(claim, `${k}`)} = ${d} \\times ${m}$. The step writes $${divTex(claim, 'k + 1')} = ${b}(${divTex(claim, 'k')}) ${signedTail(divRest(claim))}$. Use it to find the whole number at $n = ${n}$.`,
            ),
          ]
        : [say(claimLine(claim)), say(`So at $n = ${n}$, $${divTex(claim, `${n}`)} = ${value}$ is $${d}$ times a whole number. Which one?`)],
      lead: `${divTex(claim, `${n}`)} = ${d} \\times`,
      keypad: [],
      answer: String(value / d),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution({ claim, n, hard }) {
    const { b, c, d } = claim;
    const value = b ** n + c;
    if (!hard) {
      return [
        { tex: stackTex(`${divTex(claim, `${n}`)} = ${b ** n} ${signedTail(c)} = ${value}`) },
        { tex: `${value} = ${d} \\times ${value / d}` },
      ];
    }
    const k = n - 1;
    const m = (b ** k + c) / d;
    const rest = divRest(claim);
    return [
      { text: `Put $${divTex(claim, `${k}`)} = ${d} \\times ${m}$ into the step:` },
      { tex: stackTex(`${b}(${d} \\times ${m}) ${signedTail(rest)} = ${d}(${b} \\times ${m} ${signedTail(rest / d)})`) },
      { text: `So the whole number is $${b} \\times ${m} ${signedTail(rest / d)} = ${value / d}$. Check: $${d} \\times ${value / d} = ${value}$.` },
    ];
  },
};

/* ================================================================
 * Lesson 4: inequalities
 * ================================================================ */

interface IneqPickParams {
  claim: IneqClaim;
  wording: number;
}

const ineqStatement = (claim: IneqClaim) => `$${ineqLeft(claim, 'n')} > ${ineqRight(claim, 'n')}$`;

/** Both sides at each n from 1 until the claim has held twice running. */
function ineqTable(claim: IneqClaim): string {
  const N = ineqStart(claim);
  return range(claim.shape === 'powSq' ? 1 : Math.max(1, N - 2), N)
    .map((n) => {
      const l = ineqLeftValue(claim, n);
      const r = ineqRightValue(claim, n);
      return `n = ${n}\\colon\\ ${l} ${l > r ? '>' : l === r ? '=' : '<'} ${r}`;
    })
    .join(',\\quad ');
}

const prfIndBaseChoice: Generator<IneqPickParams> = {
  id: 'prf-ind-base-choice',
  sample(rng, difficulty) {
    const pool = difficulty >= 2 ? INEQ_ALL : [...INEQ_POW, ...INEQ_FACT_POW, ...INEQ_FACT_LIN];
    return { claim: rng.pick(pool), wording: rng.int(0, 1) };
  },
  render({ claim, wording }) {
    const N = ineqStart(claim);
    const wrong = [...new Set([1, N - 1, N + 1, N + 2])].filter((x) => x !== N).slice(0, 3);
    return choiceSlide(
      [
        say(`Claim: ${ineqStatement(claim)} for every whole number $n$ from some point on.`),
        say(
          wording
            ? 'A proof by induction should cover every $n$ from that point. Which value does its base case check?'
            : 'Which value should the base case of a proof by induction check?',
        ),
      ],
      `n = ${N}`,
      wrong.map((x) => `n = ${x}`),
    );
  },
  solution({ claim }) {
    const N = ineqStart(claim);
    return [
      { text: 'Work out both sides for small $n$:' },
      { tex: stackTex(ineqTable(claim)) },
      {
        text:
          claim.shape === 'powSq'
            ? `It holds at $n = 1$, but fails at $n = 2$, $3$ and $4$. It holds for good from $n = ${N}$, so that is the base case.`
            : `It first holds at $n = ${N}$ and the step keeps it true from there, so the base case is $n = ${N}$.`,
      },
    ];
  },
};

interface IneqOrderParams {
  claim: IneqClaim;
  picks: number[];
}

const prfIndOrderInequality: Generator<IneqOrderParams> = {
  id: 'prf-ind-order-inequality',
  sample(rng, difficulty) {
    const claim = rng.pick(difficulty >= 2 ? INEQ_ALL : [...INEQ_POW, ...INEQ_FACT_POW]);
    return { claim, picks: pickDistractors(rng, inductionProof(claim, false), difficulty) };
  },
  render({ claim, picks }) {
    return orderSlide(inductionProof(claim, false), picks);
  },
  solution({ claim, picks }) {
    return orderSolution(inductionProof(claim, false), picks);
  },
};

/* ---------- walking the step of an inequality ---------- */

function ineqWalk(claim: IneqClaim): { split: string[]; after: string; reasons: string[] } {
  const { shape, b, a } = claim;
  const pow = isPow(shape);
  const split = pow
    ? [`$${b} \\times ${b}^k$`, `$${b}^k + ${b}$`, `$${b}^k + 1$`]
    : ['$(k + 1) \\times k!$', '$k! + 1$', '$k \\times k!$'];
  switch (shape) {
    case 'powLin':
      return { split, after: `${b * a}k`, reasons: ['$k \\ge 1$', `$${b}^k > ${a}k$`, `$${a}(k + 1) > ${a}k$`] };
    case 'factPow':
      return { split, after: '(k + 1) \\times 2^k', reasons: ['$k + 1 > 2$', '$k! > 2^k$', '$2^{k+1} > 2^k$'] };
    case 'factLin':
      return { split, after: `(k + 1) \\times ${a}k`, reasons: ['$k \\ge 1$', `$k! > ${a}k$`, '$(k + 1)! > k!$'] };
    case 'powSq':
      return { split, after: '2k^2', reasons: ['$k^2 > 2k + 1$ once $k \\ge 3$', '$2^k > k^2$', '$2k^2 > k^2$'] };
    case 'factSq':
      return { split, after: '(k + 1)k^2', reasons: ['$k^2 \\ge k + 1$ once $k \\ge 2$', '$k! > k^2$', '$k^2 > k$'] };
  }
}

const prfIndIneqFlow: Generator<IneqPickParams> = {
  id: 'prf-ind-ineq-flow',
  // Harder draws take the squares, n! > 2^n, and the other shapes with numbers
  // past any difficulty 1 uses, so only n! > 2^n is ever asked at both.
  sample(rng, difficulty) {
    const pool =
      difficulty >= 2
        ? [...INEQ_WIDE, ...INEQ_FACT_POW, ...INEQ_SQUARES]
        : [...INEQ_POW, ...INEQ_FACT_POW, ...INEQ_FACT_LIN];
    return { claim: rng.pick(pool), wording: rng.int(0, 1) };
  },
  render({ claim, wording }) {
    const { split, after, reasons } = ineqWalk(claim);
    const up = ineqLeft(claim, 'k + 1');
    const target = ineqRight(claim, 'k + 1');
    const key = `${up}|${target}`;
    const hypothesis = `${ineqLeft(claim, 'k')} > ${ineqRight(claim, 'k')}`;
    return {
      kind: 'flow',
      prompt: [
        say(claimLine(claim)),
        say(`Assume $${hypothesis}$. Walk the step to $n = k + 1$. Each answer chooses what gets asked next.`),
      ],
      subject: `${up} > ${target}`,
      steps: [
        {
          id: 'split',
          ask: wording ? `Write $${up}$ using $${ineqLeft(claim, 'k')}$:` : `First, $${up}$ equals`,
          branches: turned(split, `${key}|split`).map((label) => ({ label, to: 'use' })),
        },
        {
          id: 'use',
          ask: `The hypothesis, $${hypothesis}$, makes that`,
          branches: turned([`$> ${after}$`, `$> ${target}$`, `$= ${after}$`], `${key}|use`).map((label) => ({
            label,
            to: 'finish',
          })),
        },
        {
          id: 'finish',
          ask: `Last, $${after} \\ge ${target}$. Why?`,
          branches: turned(reasons, `${key}|finish`).map((label) => ({ label, outcome: `Because ${label}.` })),
        },
      ],
      answer: [split[0], `$> ${after}$`, reasons[0]],
    };
  },
  solution({ claim }) {
    const { split, after, reasons } = ineqWalk(claim);
    return [
      { text: `Split off one factor: $${ineqLeft(claim, 'k + 1')} = ${split[0].slice(1, -1)}$.` },
      { text: `The hypothesis replaces $${ineqLeft(claim, 'k')}$ with something smaller, so the result is $> ${after}$.` },
      { text: `And $${after} \\ge ${ineqRight(claim, 'k + 1')}$ because ${reasons[0]}.` },
      { text: 'The other reasons are true, but none of them gives that last inequality.' },
    ];
  },
};

/* ---------- where the claim starts ---------- */

const prfIndFirstN: Generator<IneqPickParams> = {
  id: 'prf-ind-first-n',
  sample(rng, difficulty) {
    const pool = difficulty >= 2 ? INEQ_ALL : [...INEQ_POW, ...INEQ_FACT_POW, ...INEQ_FACT_LIN];
    return { claim: rng.pick(pool), wording: rng.int(0, 1) };
  },
  render({ claim, wording }) {
    return {
      kind: 'expression',
      prompt: [
        say(`${ineqStatement(claim)} fails for some small $n$, then holds for every $n$ from some point on.`),
        say(wording ? 'From which $n$ is it true for good?' : 'Find the smallest $n$ from which it holds for every larger $n$ too.'),
      ],
      lead: '\\text{from } n =',
      keypad: [],
      answer: String(ineqStart(claim)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution({ claim }) {
    const N = ineqStart(claim);
    return [
      { text: 'Work out both sides for small $n$:' },
      { tex: stackTex(ineqTable(claim)) },
      {
        text: `It holds at $n = ${N}$, and a proof by induction with its base case there shows it keeps holding. So $n = ${N}$.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 5: reading an inductive proof
 * ================================================================ */

type Flaw = 'noBase' | 'assumesNext' | 'wrongBase' | 'sound';

interface ReadParams {
  claim: IndClaim;
  flaw: Flaw;
}

const FLAW_LABEL: Record<Flaw, string> = {
  noBase: 'It never checks a first case.',
  assumesNext: 'Its step assumes what it has to show.',
  wrongBase: 'Its base case is not where the claim starts.',
  sound: 'Nothing: it is a sound proof.',
};

/** The claim as the proof states it, and the proof's lines. */
function readProof({ claim, flaw }: ReadParams): { from: number; lines: string[] } {
  switch (flaw) {
    case 'noBase':
      return {
        from: startOf(claim),
        lines: [
          hypothesisLine(claim),
          ...stepLines(claim, false),
          `So whenever it holds at $n = k$ it holds at $n = k + 1$, and it holds for every $n \\ge ${startOf(claim)}$.`,
        ],
      };
    case 'assumesNext':
      return {
        from: startOf(claim),
        lines: [
          `Base case: ${baseCheck(claim)}.`,
          `Assume it holds at $n = k + 1$: ${claimProse(claim, 'k', 1)}.`,
          'Then it holds at $n = k + 1$, as the step needs.',
          conclusionLine(claim),
        ],
      };
    case 'wrongBase':
      return {
        from: 1,
        lines: [
          `Base case: ${baseCheck(claim)}.`,
          hypothesisLine(claim),
          ...stepLines(claim, false),
          'So it holds for every $n \\ge 1$.',
        ],
      };
    case 'sound':
      return { from: startOf(claim), lines: inductionProof(claim, false).steps };
  }
}

function sampleRead(rng: Rng, difficulty: number): ReadParams {
  const flaw = rng.pick<Flaw>(
    difficulty >= 2 ? ['noBase', 'assumesNext', 'wrongBase', 'sound'] : ['noBase', 'assumesNext', 'wrongBase'],
  );
  if (flaw === 'wrongBase') return { claim: rng.pick(difficulty >= 2 ? INEQ_ALL : INEQ_POW), flaw };
  if (flaw === 'noBase' && rng.chance(0.6)) {
    const claim: IndClaim = rng.chance(0.5)
      ? { ...sampleSum(rng, 5), shift: rng.pick([-3, -2, -1, 1, 2, 3]) }
      : sampleFalseDiv(rng);
    return { claim, flaw };
  }
  return { claim: sampleClaim(rng, difficulty >= 2), flaw };
}

/** Whether the claim as stated is true at its first n: false claims are what a missing base case lets through. */
function firstCase(claim: IndClaim, from: number): { holds: boolean; text: string } {
  switch (claim.kind) {
    case 'sum': {
      const left = sumTerm(claim, 1);
      const right = sumRight(claim, 1);
      return { holds: left === right, text: `At $n = 1$ the left side is $${left}$ and the right side is $${right}$.` };
    }
    case 'div': {
      const v = claim.b + claim.c;
      return {
        holds: v % claim.d === 0,
        text: `At $n = 1$, $${divTex(claim, '1')} = ${v}$, which is ${v % claim.d === 0 ? '' : 'not '}a multiple of $${claim.d}$.`,
      };
    }
    case 'ineq': {
      const l = ineqLeftValue(claim, from);
      const r = ineqRightValue(claim, from);
      return { holds: l > r, text: `At $n = ${from}$, $${ineqLeft(claim, `${from}`)} = ${l}$ and $${ineqRight(claim, `${from}`)} = ${r}$.` };
    }
  }
}

function readSolution(params: ReadParams): SolutionStep[] {
  const { claim, flaw } = params;
  const { from } = readProof(params);
  const first = firstCase(claim, from);
  switch (flaw) {
    case 'noBase':
      return [
        { text: 'The step is fine, but nothing checks a first value, so there is nothing for the step to pass along.' },
        {
          text: first.holds
            ? `The claim happens to be true (${lowerFirst(first.text)}), but this proof never shows it.`
            : `In fact the claim is false: ${lowerFirst(first.text)} A step on its own can "prove" a false claim.`,
        },
      ];
    case 'assumesNext':
      return [
        { text: `It assumes the claim at $n = k + 1$, which is exactly what the step has to show.` },
        { text: 'The hypothesis may only assume the claim at $n = k$.' },
      ];
    case 'wrongBase': {
      if (claim.kind !== 'ineq') throw new Error('prf-ind: a wrong base case is drawn for inequalities only');
      const fails = range(1, startOf(claim)).find((n) => !ineqHolds(claim, n)) ?? 1;
      return [
        { text: `The claim is stated for every $n \\ge 1$, but the base case is at $n = ${startOf(claim)}$.` },
        {
          text: `So the proof covers $n \\ge ${startOf(claim)}$ only, and in fact the claim fails at $n = ${fails}$: $${ineqLeftValue(claim, fails)} \\le ${ineqRightValue(claim, fails)}$.`,
        },
      ];
    }
    case 'sound':
      return [
        { text: `It checks $n = ${from}$, assumes only the case $n = k$, reaches $n = k + 1$, and concludes for every $n \\ge ${from}$.` },
        { text: 'Nothing is missing: it is a sound proof.' },
      ];
  }
}

const prfIndFlaw: Generator<ReadParams> = {
  id: 'prf-ind-flaw',
  sample: sampleRead,
  render(params) {
    const { from, lines } = readProof(params);
    const flaws: Flaw[] = ['noBase', 'assumesNext', 'wrongBase', 'sound'];
    return choiceSlide(
      [say(claimLine(params.claim, from)), ...lines.map(say), say('What, if anything, is wrong with this proof?')],
      FLAW_LABEL[params.flaw],
      flaws.filter((f) => f !== params.flaw).map((f) => FLAW_LABEL[f]),
      true,
    );
  },
  solution: readSolution,
};

const READ_PATH: Record<Flaw, string[]> = {
  noBase: ['No'],
  wrongBase: ['Yes', 'No'],
  assumesNext: ['Yes', 'Yes', 'No'],
  sound: ['Yes', 'Yes', 'Yes'],
};

const prfIndReadFlow: Generator<ReadParams> = {
  id: 'prf-ind-read-flow',
  sample: sampleRead,
  render(params) {
    const { from, lines } = readProof(params);
    return {
      kind: 'flow',
      prompt: [
        say(claimLine(params.claim, from)),
        ...lines.map(say),
        say('Check the proof. Each answer chooses what gets asked next.'),
      ],
      subject: '\\text{Is it a proof?}',
      steps: [
        {
          id: 'base',
          ask: 'Does it check a first case?',
          branches: [
            { label: 'Yes', to: 'where' },
            { label: 'No', outcome: 'Not a proof: the step has nothing to start from.' },
          ],
        },
        {
          id: 'where',
          ask: 'Is that first case the first $n$ the claim is made for?',
          branches: [
            { label: 'Yes', to: 'assume' },
            { label: 'No', outcome: 'Not a proof of this claim: it only covers $n$ from its base case on.' },
          ],
        },
        {
          id: 'assume',
          ask: 'Does the step assume the claim at $n = k$ only?',
          branches: [
            { label: 'Yes', outcome: 'A sound proof.' },
            { label: 'No', outcome: 'Not a proof: it assumes what it has to show.' },
          ],
        },
      ],
      answer: READ_PATH[params.flaw],
    };
  },
  solution: readSolution,
};

/* ---------- testing a claim either side of where it starts ---------- */

interface TestTreeParams {
  claim: IneqClaim;
  x0: number;
}

const TRUE_TILE = '\\text{true}';
const FALSE_TILE = '\\text{false}';

const prfIndTestTree: Generator<TestTreeParams> = {
  id: 'prf-ind-test-tree',
  sample(rng, difficulty) {
    const claim = rng.pick(difficulty >= 2 ? INEQ_ALL : [...INEQ_POW, ...INEQ_FACT_POW]);
    const N = ineqStart(claim);
    // No more than 6! on the page, so a factorial stays under 1000.
    const top = isPow(claim.shape) ? N : Math.min(N, 4);
    const starts = claim.shape === 'powSq' ? [1, 2, 3] : range(Math.max(1, N - 2), Math.max(1, top - 1));
    return { claim, x0: rng.pick(starts) };
  },
  render({ claim, x0 }) {
    const xs = [x0, x0 + 1, x0 + 2];
    const lefts = xs.map((x) => ineqLeftValue(claim, x));
    const verdicts = xs.map((x) => (ineqHolds(claim, x) ? TRUE_TILE : FALSE_TILE));
    const answer = [...lefts.map(String), ...verdicts];
    const slips = [...xs.map((x) => String(ineqRightValue(claim, x))), String(ineqLeftValue(claim, x0 + 3))];
    return {
      kind: 'tree',
      prompt: [
        say(`A proof of this claim puts its base case at $n = ${x0}$. Test the claim at $n = ${x0}$, $${x0 + 1}$ and $${x0 + 2}$.`),
        say(`Top row: $${ineqLeft(claim, 'n')}$. Underneath: is the claim true there?`),
      ],
      expression: `${ineqLeft(claim, 'n')} > ${ineqRight(claim, 'n')}`,
      nodes: [...xs.map((_, i) => ({ id: `l${i}`, from: [] })), ...xs.map((_, i) => ({ id: `v${i}`, from: [`l${i}`] }))],
      bank: fillBank(answer, [TRUE_TILE, FALSE_TILE, ...slips], 2, 4),
      answer,
    };
  },
  solution({ claim, x0 }) {
    const N = ineqStart(claim);
    const xs = [x0, x0 + 1, x0 + 2];
    return [
      ...xs.map((x) => {
        const l = ineqLeftValue(claim, x);
        const r = ineqRightValue(claim, x);
        return { text: `$n = ${x}$: $${ineqLeft(claim, `${x}`)} = ${l}$ and $${ineqRight(claim, `${x}`)} = ${r}$, so it is ${l > r ? 'true' : 'false'}.` };
      }),
      {
        text:
          x0 === N
            ? `It holds at $n = ${x0}$, so a base case there is right.`
            : `The claim holds for good from $n = ${N}$, so a base case at $n = ${x0}$ is ${ineqHolds(claim, x0) ? 'true, but the step cannot start there' : 'false'}.`,
      },
    ];
  },
};

export const numberProofGenerators = [
  prfAlways,
  prfParity,
  prfParityFlow,
  prfProofOrExample,
  prfCaseSplit,
  prfCaseTiles,
  prfCasesTree,
  prfCaseRemainder,
  prfCounter,
  prfCounterPick,
  prfCounterFlow,
  prfAssume,
  prfNegate,
  prfContraFlow,
  prfOrderContradiction,
  prfMissingLine,
  prfFindFlaw,
  prfMethodFlow,
  prfArrow,
  prfAssumeShow,
  prfWriteArrow,
  prfImpliesValue,
  prfConverse,
  prfCounterConverse,
  prfConverseFlow,
  prfCounterLine,
  prfContrapositive,
  prfOrderContrapositive,
  prfContraPlan,
  prfNameRelative,
  prfNecSuff,
  prfNecSuffFlow,
  prfMeetsTree,
  prfNecArrow,
  prfOrderIff,
  prfDirectionFlow,
  prfDirectionChoice,
  prfIndSkeleton,
  prfIndPartFlow,
  prfIndNextClaim,
  prfIndCovers,
  prfIndOrderSum,
  prfIndSumSteps,
  prfIndSumCheck,
  prfIndNextTerm,
  prfIndOrderDivides,
  prfIndRewrite,
  prfIndDividesSteps,
  prfIndQuotient,
  prfIndBaseChoice,
  prfIndOrderInequality,
  prfIndIneqFlow,
  prfIndFirstN,
  prfIndFlaw,
  prfIndReadFlow,
  prfIndTestTree,
];

/** The order generators, for the reducer harness in `proofOrder.test.ts`. */
export const numberProofOrders = [
  prfOrderContradiction,
  prfOrderContrapositive,
  prfOrderIff,
  prfIndSkeleton,
  prfIndOrderSum,
  prfIndOrderDivides,
  prfIndOrderInequality,
];

/** Level 3's statement families, for `numberLogic.test.ts`. */
export const logicTesting = { ONE_WAY, BOTH_WAYS, NEITHER_WAY, samplePair, pairOf, implies, converseCase, lineCase };

/** Level 4's claims, for `numberInduction.test.ts`. */
export const inductionTesting = {
  ODD_C,
  NAT_C,
  INEQ_ALL,
  INEQ_WIDE,
  sumTerm,
  sumRight,
  sumTermTex,
  sumRightTex,
  sumMiddle,
  divisorsOf,
  divTex,
  divRest,
  ineqLeft,
  ineqRight,
  ineqStart,
};
