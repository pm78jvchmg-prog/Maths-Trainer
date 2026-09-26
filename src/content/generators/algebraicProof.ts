/**
 * Number & Proof, level 8: Algebraic Proof.
 *
 * The step after Proof (`np-l1`) and the odd, even and multiples lesson of
 * Divisibility & Primes (`np-l2`): writing a described number as an
 * expression, then expanding, collecting and factorising until a result can
 * be read off. Five lessons: writing numbers in algebra (even `2n`, odd
 * `2n + 1`, consecutive, `r` more than a multiple of `k`), sums of
 * consecutive numbers and which multiple they always are, differences of
 * squares, odd and even products, and "show that" questions, with a faulty
 * line to find at the end.
 *
 * Every number on the page is under 1000 and every typed answer is a single
 * whole number (PITFALLS 3.4); an expression is placed from a bank or picked,
 * never typed. The largest number a linear `An + B` is always a multiple of
 * is the HCF of `A` and `B` (at `n = 0` and `n = 1` it is `B` and `A + B`),
 * which is how every "always a multiple of" here is worked out.
 *
 * Tiles lines are checked for a second true filling from their own bank by
 * `trueFillings`, which reads the filled line as the learner would and
 * compares both sides at several points. `algebraicProof.test.ts` re-derives
 * every answer from the numbers each slide states. The shared helpers come
 * from `numberProof.ts`.
 */
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import {
  choiceSlide,
  fillBank,
  lin,
  mod,
  orderSlide,
  orderSolution,
  pickDistractors,
  polyTex,
  stackTex,
  turned,
  type Proof,
} from './numberProof';
import { gcd, say } from './format';
import { stepBank, treeBank } from './parametricImplicit';

/* ---------- shared helpers ---------- */

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** `an + b` in `n` unless told otherwise (`lin` itself defaults to `k`). */
const linN = (a: number, b: number, v = 'n') => lin(a, b, v);

/** `an + b`, or the bare number when `a` is 0. */
const linTex = (a: number, b: number, v = 'n') => (a === 0 ? String(b) : linN(a, b, v));

/** A term in brackets when it has more than one part, for the middle of a sum. */
const br = (t: string) => (t.includes(' ') ? `(${t})` : t);

/** Terms such as `[[2, 'mn'], [3, 'm'], [-1, '']]`, written `2mn + 3m - 1`. */
function termsTex(parts: [number, string][]): string {
  let out = '';
  for (const [c, v] of parts) {
    if (c === 0) continue;
    const size = Math.abs(c);
    const body = v === '' ? String(size) : `${size === 1 ? '' : size}${v}`;
    if (out === '') out = c < 0 ? `-${body}` : body;
    else out += c < 0 ? ` - ${body}` : ` + ${body}`;
  }
  return out || '0';
}

/** Numbers near a value, for topping up a set of slips that collided. */
function near(value: number, count: number): number[] {
  const out: number[] = [];
  for (let gap = 1; out.length < count; gap += 1) out.push(value + gap, value - gap);
  return out.slice(0, count);
}

/** Four whole-number options: the answer and the first three distinct slips in [min, max]. */
function intOptions(correct: number, slips: number[], min = 0, max = 999): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of [...slips, ...near(correct, 12)]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || value < min || value > max || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  return options(
    { tex: String(correct), answer: String(correct) },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: String(value), answer: String(value) })),
  );
}

/** Three distinct whole-number labels for a flow step, the right one first. */
function threeLabels(correct: number, slips: number[]): number[] {
  const out = [correct];
  for (const value of [...slips, ...near(correct, 8)]) {
    if (out.length === 3) break;
    if (!Number.isInteger(value) || value < 1 || value >= 1000 || out.includes(value)) continue;
    out.push(value);
  }
  return out;
}

/** A single whole number in an expression slide: `keypad: []`, compared exactly. */
function typed(prompt: string[], lead: string, answer: number) {
  return {
    kind: 'expression' as const,
    prompt: prompt.map(say),
    lead,
    keypad: [],
    answer: String(answer),
    domain: 'real' as const,
    mode: 'exact' as const,
  };
}

const TAP = 'Tap the part you would do **next**, then choose what it becomes.';

/* ---------- reading a line the way the learner does ---------- */

/**
 * The value of the polynomial TeX these slides write — whole numbers,
 * one-letter names, `+`, `-`, `\times`, brackets and `^` — at a point, with
 * a number or letter straight after another read as multiplying it, as the
 * learner reads it. So `2n + 5(3)` is `2n + 15`, not `3(2n + 5)`.
 */
function texAt(tex: string, scope: Record<string, number>): number {
  const src = tex.replace(/\\times/g, '*').replace(/\\[,;: ]/g, ' ');
  let at = 0;
  const peek = () => {
    while (src[at] === ' ') at += 1;
    return src[at];
  };
  const fail = (): never => {
    throw new Error(`texAt: cannot read "${tex}"`);
  };
  const atom = (): number => {
    const c = peek();
    if (c === '(' || c === '{') {
      at += 1;
      const v = sum();
      if (peek() !== (c === '(' ? ')' : '}')) fail();
      at += 1;
      return v;
    }
    if (c !== undefined && /[0-9]/.test(c)) {
      let digits = '';
      while (/[0-9]/.test(src[at] ?? '')) digits += src[at++];
      return Number(digits);
    }
    if (c !== undefined && /[a-z]/.test(c)) {
      at += 1;
      const v = scope[c];
      return v === undefined ? fail() : v;
    }
    return fail();
  };
  const power = (): number => {
    const base = atom();
    if (peek() !== '^') return base;
    at += 1;
    return base ** atom();
  };
  const unary = (): number => {
    if (peek() !== '-') return power();
    at += 1;
    return -unary();
  };
  const product = (): number => {
    let v = unary();
    for (;;) {
      const c = peek();
      if (c === '*') {
        at += 1;
        v *= unary();
      } else if (c !== undefined && /[0-9a-z({]/.test(c)) v *= power();
      else return v;
    }
  };
  const sum = (): number => {
    let v = product();
    for (;;) {
      const c = peek();
      if (c === '+') {
        at += 1;
        v += product();
      } else if (c === '-') {
        at += 1;
        v -= product();
      } else return v;
    }
  };
  const v = sum();
  if (peek() !== undefined) fail();
  return v;
}

const POINTS = [
  { m: 2, n: 3 },
  { m: 5, n: -1 },
  { m: -3, n: 4 },
  { m: 7, n: 6 },
  { m: 1, n: 10 },
];

/** Whether two lines of TeX agree at every point. */
const sameValue = (a: string, b: string) =>
  POINTS.every((scope) => Math.abs(texAt(a, scope) - texAt(b, scope)) < 1e-9);

/**
 * How many different fillings of a `left = right` tiles line from its bank
 * make it true, each tile used once. The line is graded by the one filling it
 * names, so any number but 1 is a question with a second right answer.
 */
function trueFillings(template: string, bank: string[], blanks: number): number {
  const [lhs, rhs] = template.split(' = ');
  const found = new Set<string>();
  const walk = (chosen: number[]) => {
    if (chosen.length === blanks) {
      const filled = rhs.replace(/\{(\d+)\}/g, (_, i: string) => bank[chosen[Number(i)]]);
      if (sameValue(lhs, filled)) found.add(chosen.map((i) => bank[i]).join('|'));
      return;
    }
    bank.forEach((_, i) => {
      if (!chosen.includes(i)) walk([...chosen, i]);
    });
  };
  walk([]);
  return found.size;
}

/** A tiles bank for a `left = right` line: slips that would make a second true line are left out. */
function safeBank(template: string, answer: string[], candidates: string[], limit = 4): string[] {
  const chosen: string[] = [];
  for (const token of candidates) {
    if (chosen.length >= limit) break;
    if (answer.includes(token) || chosen.includes(token)) continue;
    if (trueFillings(template, [...answer, ...chosen, token], answer.length) !== 1) continue;
    chosen.push(token);
  }
  return fillBank(answer, chosen, 2);
}

/* ================================================================
 * Lesson 1: writing numbers in algebra
 * ================================================================ */

type WriteKind = 'mult' | 'rem' | 'nextOdd' | 'nextEven' | 'prevOdd' | 'prevEven' | 'remWord';

interface WriteParams {
  kind: WriteKind;
  k: number;
  /** The remainder, or for next/previous the constant in `2n + c`. */
  r: number;
}

interface LinOption {
  a: number;
  b: number;
  tex: string;
}

const opt = (a: number, b: number, tex = linTex(a, b)): LinOption => ({ a, b, tex });

/** What the description asks of the value at n, for checking every option. */
function writeHolds({ kind, k, r }: WriteParams, o: LinOption): boolean {
  return range(0, 10).every((n) => {
    const v = o.a * n + o.b;
    switch (kind) {
      case 'mult':
        return Number.isInteger(v) && mod(v, k) === 0;
      case 'rem':
      case 'remWord':
        return Number.isInteger(v) && mod(v, k) === r;
      case 'nextOdd':
      case 'nextEven':
        return v === 2 * n + r + 2;
      default:
        return v === 2 * n + r - 2;
    }
  });
}

function writeSetup(p: WriteParams): { desc: string; right: LinOption; wrong: LinOption[] } {
  const { kind, k, r } = p;
  const base = linN(2, r);
  let desc: string;
  let right: LinOption;
  let slips: LinOption[];
  switch (kind) {
    case 'mult':
      desc = `a multiple of $${k}$`;
      right = opt(k, 0);
      slips = [opt(1, k), opt(k, 1), opt(1 / k, 0, `\\frac{n}{${k}}`), opt(k + 1, 0)];
      break;
    case 'rem':
    case 'remWord':
      desc =
        kind === 'rem'
          ? `$${r}$ more than a multiple of $${k}$`
          : `a number that leaves remainder $${r}$ when divided by $${k}$`;
      right = opt(k, r);
      slips = [opt(r, k), opt(k, k * r, `${k}(n + ${r})`), opt(k, -r), opt(1, k + r), opt(k + r, 0)];
      break;
    case 'nextOdd':
    case 'nextEven':
      desc = `the next ${kind === 'nextOdd' ? 'odd' : 'even'} number after $${base}$`;
      right = opt(2, r + 2);
      slips = [opt(2, r + 1), opt(2, r - 2), opt(2, r + 4), opt(1, r + 2)];
      break;
    default:
      desc = `the ${kind === 'prevOdd' ? 'odd' : 'even'} number just before $${base}$`;
      right = opt(2, r - 2);
      slips = [opt(2, r - 1), opt(2, r + 2), opt(2, r - 4), opt(1, r - 2)];
  }
  // A slip has to fail the description somewhere, or it is a second answer.
  const seen = new Set([`${right.a}|${right.b}`]);
  const wrong: LinOption[] = [];
  for (const s of slips) {
    const key = `${s.a}|${s.b}`;
    if (wrong.length === 3 || seen.has(key) || s.tex === '0' || writeHolds(p, s)) continue;
    seen.add(key);
    wrong.push(s);
  }
  return { desc, right, wrong };
}

const aprfWrite: Generator<WriteParams> = {
  id: 'aprf-write',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty < 2) {
        const kind = rng.pick(['mult', 'rem', 'rem'] as const);
        const k = kind === 'mult' ? rng.int(2, 12) : rng.int(3, 9);
        const params = { kind, k, r: kind === 'mult' ? 0 : rng.int(1, k - 1) };
        if (writeSetup(params).wrong.length === 3) return params;
        continue;
      }
      const kind = rng.pick(['nextOdd', 'nextEven', 'prevOdd', 'prevEven', 'remWord'] as const);
      if (kind === 'remWord') {
        const k = rng.int(4, 12);
        const params = { kind, k, r: rng.int(1, k - 1) };
        if (writeSetup(params).wrong.length === 3) return params;
        continue;
      }
      const odd = kind === 'nextOdd' || kind === 'prevOdd';
      const r = odd ? rng.pick([-3, -1, 1, 3, 5, 7, 9, 11]) : rng.pick([-2, 0, 2, 4, 6, 8, 10]);
      return { kind, k: 2, r };
    }
  },
  render(params) {
    const { desc, right, wrong } = writeSetup(params);
    return choiceSlide(
      [say(`Which of these is ${desc}, whatever whole number $n$ is?`)],
      right.tex,
      wrong.map((w) => w.tex),
    );
  },
  solution(params) {
    const { kind, k, r } = params;
    const { right } = writeSetup(params);
    const values = [0, 1, 2].map((n) => right.a * n + right.b);
    switch (kind) {
      case 'mult':
        return [
          { text: `A multiple of $${k}$ is $${k}$ times a whole number, so it is $${k}n$.` },
          { text: `Check: $n = 1, 2, 3$ give $${k}, ${2 * k}, ${3 * k}$.` },
        ];
      case 'rem':
      case 'remWord':
        return [
          {
            text:
              kind === 'rem'
                ? `A multiple of $${k}$ is $${k}n$, and $${r}$ more than it is $${right.tex}$.`
                : `Leaving remainder $${r}$ means being $${r}$ more than a multiple of $${k}$: $${right.tex}$.`,
          },
          { text: `Check: $n = 0, 1, 2$ give $${values.join(', ')}$, each $${r}$ more than a multiple of $${k}$.` },
        ];
      default: {
        const next = kind === 'nextOdd' || kind === 'nextEven';
        return [
          {
            text: `${kind.endsWith('Odd') ? 'Odd' : 'Even'} numbers go up in twos, so ${next ? 'add' : 'take away'} $2$:`,
          },
          { tex: stackTex(`${linN(2, r)} ${next ? '+' : '-'} 2 = ${right.tex}`) },
          { text: 'Adding or taking away $1$ would change odd to even, or even to odd.' },
        ];
      }
    }
  },
};

/* ---------- which n gives this number ---------- */

interface FindParams {
  k: number;
  r: number;
  N: number;
}

const aprfFindN: Generator<FindParams> = {
  id: 'aprf-find-n',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const k = hard ? rng.int(3, 9) : rng.int(2, 6);
    const r = hard ? rng.pick([...range(-(k - 1), -1), ...range(1, k - 1)]) : rng.int(0, k - 1);
    const n = hard ? rng.int(12, 60) : rng.int(3, 19);
    return { k, r, N: k * n + r };
  },
  choices({ k, r, N }) {
    const n = (N - r) / k;
    return intOptions(n, [Math.round(N / k), (N + r) / k, n + 1, n - 1, N - r], 0);
  },
  render({ k, r, N }) {
    return typed([`Which whole number $n$ makes $${linTex(k, r)} = ${N}$ true?`], 'n =', (N - r) / k);
  },
  solution({ k, r, N }) {
    const n = (N - r) / k;
    return [
      { tex: stackTex(`${linTex(k, r)} = ${N}`) },
      { text: r === 0 ? `Divide by $${k}$:` : `${r > 0 ? `Take away $${r}$` : `Add $${-r}$`}, then divide by $${k}$:` },
      { tex: `\\begin{gathered} ${k}n = ${N - r} \\\\ n = ${n} \\end{gathered}` },
      { text: `Check: $${k} \\times ${n}${r === 0 ? '' : r > 0 ? ` + ${r}` : ` - ${-r}`} = ${N}$.` },
    ];
  },
};

/* ---------- a table of values ---------- */

interface ListParams {
  k: number;
  r: number;
  /** The first n in the table. */
  s: number;
  /** Two columns of consecutive even or odd numbers, `2n + r` and `2n + r + 2`. */
  two: boolean;
}

function listColumns({ k, r, two }: ListParams): { a: number; b: number }[] {
  return two ? [{ a: 2, b: r }, { a: 2, b: r + 2 }] : [{ a: k, b: r }];
}

const aprfListTable: Generator<ListParams> = {
  id: 'aprf-list-table',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      const k = rng.int(2, 9);
      return { k, r: rng.int(0, k - 1), s: 1, two: false };
    }
    for (;;) {
      const r = rng.int(-1, 10);
      const s = rng.int(1, 4);
      if (2 * s + r < 1) continue;
      return { k: 2, r, s, two: true };
    }
  },
  render(params) {
    const { k, r, s, two } = params;
    const cols = listColumns(params);
    const ns = range(s, s + (two ? 2 : 4));
    const answer: number[] = [];
    const rows = ns.map((n, i) => [
      String(n),
      ...cols.map(({ a, b }) => {
        if (i === 0) return String(a * n + b);
        answer.push(a * n + b);
        return null;
      }),
    ]);
    const slips = ns.flatMap((n) => cols.flatMap(({ a, b }) => [a * n, a * n + b + 1, n + b, a * (n + b)]));
    const word = mod(r, 2) === 1 ? 'odd' : 'even';
    return {
      kind: 'table',
      prompt: [
        say(
          two
            ? `$${linN(2, r)}$ and $${linN(2, r + 2)}$ are consecutive ${word} numbers. Fill in both for each $n$.`
            : r === 0
              ? `Fill in the values of $${k}n$, the multiples of $${k}$.`
              : `Fill in the values of $${linN(k, r)}$: each is $${r}$ more than a multiple of $${k}$.`,
        ),
      ],
      columns: ['n', ...cols.map(({ a, b }) => linTex(a, b))],
      rows,
      bank: treeBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution(params) {
    const { s, two } = params;
    const cols = listColumns(params);
    const ns = range(s, s + (two ? 2 : 4)).slice(1);
    const plus = (b: number) => (b === 0 ? '' : b > 0 ? ` + ${b}` : ` - ${-b}`);
    return [
      { text: 'Put each $n$ into the expression:' },
      ...ns.flatMap((n) =>
        cols.map(({ a, b }) => ({ tex: `${a} \\times ${n}${plus(b)} = ${a * n + b}` })),
      ),
      {
        text: two
          ? 'Each row gives two numbers $2$ apart, so they are next to each other in the list.'
          : `Each value is $${cols[0].a}$ more than the one before.`,
      },
    ];
  },
};

/* ---------- consecutive numbers in tiles ---------- */

type ConsecKind = 'int' | 'even' | 'odd' | 'mult';

interface ConsecParams {
  kind: ConsecKind;
  k: number;
  b: number;
  count: number;
  /** Which term is shown; the rest are blanks. */
  given: number;
}

/** The coefficient of n and the step between terms. */
function stepOf(kind: ConsecKind, k: number): { a: number; d: number } {
  if (kind === 'int') return { a: 1, d: 1 };
  if (kind === 'mult') return { a: k, d: k };
  return { a: 2, d: 2 };
}

const consecWord = (kind: ConsecKind, k: number) =>
  kind === 'int' ? 'whole numbers' : kind === 'mult' ? `multiples of $${k}$` : `${kind} numbers`;

const aprfConsecTiles: Generator<ConsecParams> = {
  id: 'aprf-consec-tiles',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const kind = rng.pick(['int', 'even', 'odd', 'mult'] as const);
    const k = kind === 'mult' ? rng.int(3, 9) : 2;
    const b =
      kind === 'int'
        ? rng.int(-3, 6)
        : kind === 'even'
          ? rng.pick([-2, 0, 2, 4, 6, 8])
          : kind === 'odd'
            ? rng.pick([-3, -1, 1, 3, 5, 7, 9])
            : hard
              ? rng.pick([-k, 0, k])
              : 0;
    return { kind, k, b, count: hard ? 4 : 3, given: hard ? 1 : 0 };
  },
  render({ kind, k, b, count, given }) {
    const { a, d } = stepOf(kind, k);
    const all = range(0, count - 1).map((i) => linTex(a, b + i * d));
    let blank = 0;
    const template = all.map((t, i) => (i === given ? t : `{${blank++}}`)).join(',\\ ');
    const answer = all.filter((_, i) => i !== given);
    const slips = [
      linTex(a, b - d),
      linTex(a, b + count * d),
      ...range(1, count - 1).flatMap((i) => [linTex(a, b + i * d + 1), linTex(a, b + i * d - 1)]),
      linTex(a === 1 ? 2 : 1, b + d),
      linTex(a, b + 2 * count * d),
    ];
    return {
      kind: 'tiles',
      prompt: [say(`Fill in ${count === 3 ? 'three' : 'four'} consecutive ${consecWord(kind, k)} in increasing order.`)],
      template,
      bank: fillBank(answer, slips, 2, 4),
      answer,
    };
  },
  solution({ kind, k, b, count }) {
    const { a, d } = stepOf(kind, k);
    const all = range(0, count - 1).map((i) => linTex(a, b + i * d));
    return [
      {
        text:
          kind === 'int'
            ? 'Consecutive whole numbers go up in ones.'
            : kind === 'mult'
              ? `Consecutive multiples of $${k}$ go up in $${k}$s.`
              : `Consecutive ${kind} numbers go up in twos: adding $1$ would change the parity.`,
      },
      { text: `So the numbers are ${all.map((t) => `$${t}$`).join(', ')}.` },
    ];
  },
};

/* ================================================================
 * Lesson 2: sums of consecutive numbers
 * ================================================================ */

interface SumParams {
  kind: ConsecKind;
  k: number;
  /** The constant in the first term. */
  b: number;
  /** How many terms. */
  c: number;
}

interface SumShape {
  terms: string[];
  /** The constants of the terms, in order. */
  nums: number[];
  a: number;
  d: number;
  A: number;
  B: number;
  g: number;
}

function sumShape({ kind, k, b, c }: SumParams): SumShape {
  const { a, d } = stepOf(kind, k);
  const nums = range(0, c - 1).map((i) => b + i * d);
  const A = c * a;
  const B = nums.reduce((s, x) => s + x, 0);
  return { terms: nums.map((x) => linTex(a, x)), nums, a, d, A, B, g: gcd(A, B) };
}

/** Every sum a difficulty asks about, listed so a draw is uniform over them. */
function sumPool(difficulty: number, maxCount = 9): SumParams[] {
  const out: SumParams[] = [];
  const add = (kind: ConsecKind, k: number, b: number, cs: number[]) => {
    for (const c of cs) if (c <= maxCount) out.push({ kind, k, b, c });
  };
  if (difficulty < 2) {
    add('int', 1, 0, range(3, 7));
    add('even', 2, 0, range(2, 6));
    add('odd', 2, 1, range(2, 6));
    for (const k of range(2, 9)) add('mult', k, 0, [3, 4]);
  } else {
    for (const b of [-1, 3, 5, 7]) add('odd', 2, b, range(3, 6));
    for (const b of [2, 4, 6]) add('even', 2, b, range(3, 6));
    for (const k of range(2, 6)) add('mult', k, 0, [5, 6]);
  }
  // A sum that is a multiple of nothing but 1, or has no constant left to
  // take a factor from, asks nothing.
  return out.filter((p) => {
    const { g, B } = sumShape(p);
    return g >= 2 && B !== 0;
  });
}

const sumLine = (terms: string[]) => terms.map((t, i) => (i === 0 ? t : br(t))).join(' + ');

const aprfSumSteps: Generator<SumParams> = {
  id: 'aprf-sum-steps',
  // At most five terms: the running total takes one term per tap.
  sample: (rng, difficulty) => rng.pick(sumPool(difficulty, 5)),
  render(params) {
    const { kind, k, c } = params;
    const { terms, nums, a, A, B, g } = sumShape(params);
    const start = terms.flatMap((t, i) => (i === 0 ? [br(t)] : ['+', br(t)]));
    // One term at a time, so the part tapped is only ever two terms wide:
    // a whole sum as one tap target runs off a phone.
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = range(1, c - 1).map((i) => {
      const An = a * (i + 1);
      const Bn = nums.slice(0, i + 1).reduce((x, y) => x + y, 0);
      const value = linTex(An, Bn);
      return {
        span: [0, 3] as [number, number],
        operator: 1,
        value,
        bank: stepBank(value, linTex(An, Bn + 1), linTex(An + a, Bn), linTex(An, nums[i])),
      };
    });
    const factored = `${g}(${linTex(A / g, B / g)})`;
    reductions.push({
      span: [0, 1],
      value: factored,
      bank: stepBank(factored, `${g}(${linTex(A / g, B)})`, `${g}(${linTex(A, B / g)})`, `${g}(${linTex(A / g, B / g + 1)})`),
    });
    return {
      kind: 'steps',
      prompt: [
        say(`Show that the sum of these ${c} consecutive ${consecWord(kind, k)} is always a multiple of $${g}$. Add one term at a time, then take out the factor.`),
        say(TAP),
      ],
      start,
      reductions,
    };
  },
  solution(params) {
    const { terms, nums, A, B, g } = sumShape(params);
    return [
      { text: `There are $${terms.length}$ terms in $n$, making $${A}n$. The numbers add to $${nums.join(' + ')} = ${B}$.` },
      { tex: stackTex(`${linTex(A, B)} = ${g}(${linTex(A / g, B / g)})`) },
      { text: `$${linTex(A / g, B / g)}$ is a whole number, so the sum is always a multiple of $${g}$.` },
    ];
  },
};

/* ---------- which multiple is it always ---------- */

function largestSolution(line: string, A: number, B: number): SolutionStep[] {
  const g = gcd(A, B);
  return [
    { tex: stackTex(`${line} = ${linTex(A, B)}`) },
    { text: `The largest number going into both $${A}$ and $${B}$ is $${g}$:` },
    { tex: stackTex(`${linTex(A, B)} = ${g}(${linTex(A / g, B / g)})`) },
    {
      text: `So it is always a multiple of $${g}$. Nothing bigger works: at $n = 0$ it is $${B}$ and at $n = 1$ it is $${A + B}$, and $${g}$ is the largest number going into both.`,
    },
  ];
}

const aprfSumMultiple: Generator<SumParams> = {
  id: 'aprf-sum-multiple',
  sample: (rng, difficulty) => rng.pick(sumPool(difficulty)),
  choices(params) {
    const { A, B, g } = sumShape(params);
    return intOptions(g, [params.c, A, 2 * g, g / 2, B], 2);
  },
  render(params) {
    const { kind, k, c } = params;
    const { terms, g } = sumShape(params);
    return typed(
      [
        `The sum of any ${c} consecutive ${consecWord(kind, k)}, starting at $${terms[0]}$, is always a multiple of which number? Give the largest.`,
      ],
      '\\text{largest} =',
      g,
    );
  },
  solution(params) {
    const { terms, nums, A, B } = sumShape(params);
    return [
      { text: `The numbers are ${terms.map((t) => `$${t}$`).join(', ')}. Their constants add to $${nums.join(' + ')} = ${B}$.` },
      ...largestSolution('\\text{sum}', A, B),
    ];
  },
};

/* ---------- a proof in order ---------- */

interface SumOrderParams extends SumParams {
  picks: number[];
}

function sumProof(p: SumParams): Proof {
  const { kind, k, c } = p;
  const { terms, nums, a, d, A, B, g } = sumShape(p);
  const listed = (ts: string[]) => ts.map((t) => `$${t}$`).join(', ');
  const inner = linTex(A / g, B / g);
  const wrongD = d === 1 ? 2 : 1;
  const wrongTerms = range(0, c - 1).map((i) => linTex(a, p.b + i * wrongD));
  return {
    claim: `Prove that the sum of any ${c} consecutive ${consecWord(kind, k)} is a multiple of $${g}$.`,
    steps: [
      `Let the numbers be ${listed(terms)}, for a whole number $n$.`,
      `The $n$ terms make $${A}n$, and the numbers make $${nums.join(' + ')} = ${B}$.`,
      `So the sum is $${linTex(A, B)}$.`,
      `Taking out $${g}$, the sum is $${g}(${inner})$.`,
      `$${inner}$ is a whole number, so the sum is a multiple of $${g}$.`,
    ],
    pool: [
      {
        text: `Let the numbers be ${listed(wrongTerms)}, for a whole number $n$.`,
        why: `Those go up in ${wrongD === 1 ? 'ones' : 'twos'}, so they are not consecutive ${consecWord(kind, k)}.`,
      },
      {
        text: `So the sum is $${linTex(A, B + d)}$.`,
        why: `The numbers add to $${B}$, not $${B + d}$.`,
      },
      {
        text: `At $n = 1$ the sum is $${A + B}$, a multiple of $${g}$, so the sum always is.`,
        why: 'One value of $n$ is an example, not a proof.',
      },
      {
        text: `Taking out $${g}$, the sum is $${g}(${linTex(A / g, B)})$.`,
        why: `$${g}$ has to come out of both terms: $${B} \\div ${g} = ${B / g}$.`,
      },
    ],
  };
}

function sumOrderPool(): SumParams[] {
  const out: SumParams[] = [];
  for (const c of [3, 4]) out.push({ kind: 'int', k: 1, b: 0, c });
  for (const c of [2, 3, 4]) out.push({ kind: 'even', k: 2, b: 0, c });
  for (const c of [2, 3, 4]) out.push({ kind: 'odd', k: 2, b: 1, c });
  for (const c of [3, 4]) out.push({ kind: 'odd', k: 2, b: -1, c });
  for (const k of range(2, 9)) out.push({ kind: 'mult', k, b: 0, c: 3 });
  return out;
}

const aprfSumOrder: Generator<SumOrderParams> = {
  id: 'aprf-sum-order',
  sample(rng, difficulty) {
    const base = rng.pick(sumOrderPool());
    return { ...base, picks: pickDistractors(rng, sumProof(base), difficulty) };
  },
  render: (params) => orderSlide(sumProof(params), params.picks),
  solution: (params) => orderSolution(sumProof(params), params.picks),
};

/* ---------- always a multiple of m? ---------- */

interface SumFlowParams extends SumParams {
  m: number;
}

const aprfSumFlow: Generator<SumFlowParams> = {
  id: 'aprf-sum-flow',
  sample(rng, difficulty) {
    const pool =
      difficulty < 2
        ? sumPool(1, 6).filter((p) => p.kind !== 'mult' && p.c >= 3)
        : [...sumPool(1, 5).filter((p) => p.c >= 3), ...sumPool(2, 5)];
    for (;;) {
      const base = rng.pick(pool);
      const { A, g } = sumShape(base);
      const yes = range(2, g).filter((x) => g % x === 0);
      const no = [base.c, A, 2 * g, g + 1].filter((x) => x >= 2 && g % x !== 0);
      const m = rng.chance(0.5) ? rng.pick(yes) : rng.pick(no.length > 0 ? no : yes);
      return { ...base, m };
    }
  },
  render(params) {
    const { kind, k, c, b, m } = params;
    const { terms, A, B, g, d } = sumShape(params);
    const holds = g % m === 0;
    const key = `${kind}|${k}|${b}|${c}|${m}`;
    const subject = c > 3 ? `${terms[0]} + \\dots + ${br(terms[c - 1])}` : sumLine(terms);
    const collected = turned([linTex(A, B), linTex(A, c * b), linTex(A, B + d)], key).map((t) => `$${t}$`);
    const factor = turned(threeLabels(g, [A, c, 2 * g, B]), key).map((v) => `$${v}$`);
    const n0 = range(0, m).find((n) => (A * n + B) % m !== 0) ?? 0;
    return {
      kind: 'flow',
      prompt: [
        say(
          `Is the sum of the ${c} consecutive ${consecWord(kind, k)} from $${terms[0]}$ to $${terms[c - 1]}$ always a multiple of $${m}$? Each answer chooses what gets asked next.`,
        ),
      ],
      subject,
      steps: [
        { id: 'collect', ask: 'Adding them gives', branches: collected.map((label) => ({ label, to: 'factor' })) },
        {
          id: 'factor',
          ask: `The largest number going into both $${A}$ and $${B}$ is`,
          branches: factor.map((label) => ({ label, to: 'verdict' })),
        },
        {
          id: 'verdict',
          ask: `So is the sum always a multiple of $${m}$?`,
          branches: [
            {
              label: 'Yes',
              outcome: holds
                ? 'That is the answer.'
                : `$${m}$ does not go into $${g}$. At $n = ${n0}$ the sum is $${A * n0 + B}$, not a multiple of $${m}$.`,
            },
            {
              label: 'No',
              outcome: holds
                ? `$${m}$ goes into $${g}$, and the sum is $${g}$ times a whole number, so it is always a multiple of $${m}$.`
                : 'That is the answer.',
            },
          ],
        },
      ],
      answer: [`$${linTex(A, B)}$`, `$${g}$`, holds ? 'Yes' : 'No'],
    };
  },
  solution(params) {
    const { m } = params;
    const { A, B, g } = sumShape(params);
    const holds = g % m === 0;
    const n0 = range(0, m).find((n) => (A * n + B) % m !== 0) ?? 0;
    return [
      { tex: stackTex(`\\text{sum} = ${linTex(A, B)} = ${g}(${linTex(A / g, B / g)})`) },
      {
        text: holds
          ? `$${m}$ goes into $${g}$, so the sum is always a multiple of $${m}$.`
          : `$${m}$ does not go into $${g}$, so one value is enough to show it fails: at $n = ${n0}$ the sum is $${A * n0 + B}$, which is not a multiple of $${m}$.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 3: differences of squares
 * ================================================================ */

interface SquareTilesParams {
  p: number;
  a: number;
  neg: boolean;
}

const aprfSquareTiles: Generator<SquareTilesParams> = {
  id: 'aprf-square-tiles',
  sample(rng, difficulty) {
    return difficulty < 2
      ? { p: 1, a: rng.int(1, 13), neg: rng.chance(0.5) }
      : { p: rng.pick([2, 3]), a: rng.int(1, 7), neg: rng.chance(0.5) };
  },
  render({ p, a, neg }) {
    const inside = linN(p, neg ? -a : a);
    const lead = p === 1 ? 'n^2' : `${p * p}n^2`;
    const template = `(${inside})^2 = ${lead} ${neg ? '-' : '+'} {0}n + {1}`;
    const answer = [String(2 * p * a), String(a * a)];
    const slips = [p * a, 2 * a, 2 * a * a, a, 2 * p * a + 1, a * a + 1, 2 * p * a * a, 4 * p * a, 2 * p * a + 2, a * a + 2].map(String);
    return {
      kind: 'tiles',
      prompt: [say(`Expand $(${inside})^2$ by filling in the numbers.`)],
      template,
      bank: fillBank(answer, slips, 2, 4),
      answer,
    };
  },
  solution({ p, a, neg }) {
    const inside = linN(p, neg ? -a : a);
    const pn = p === 1 ? 'n' : `${p}n`;
    return [
      { text: `$(${inside})^2 = (${inside})(${inside})$. Multiply every term by every term:` },
      {
        tex: `\\begin{gathered} ${pn} \\times ${pn} = ${p === 1 ? '' : p * p}n^2 \\\\ 2 \\times ${pn} \\times ${a} = ${2 * p * a}n \\\\ ${a} \\times ${a} = ${a * a} \\end{gathered}`,
      },
      { text: `So $(${inside})^2 = ${polyTex([p * p, neg ? -2 * p * a : 2 * p * a, a * a], 'n')}$.${neg ? ' The middle term takes the minus sign; the last term is a square, so it is positive.' : ''}` },
    ];
  },
};

/* ---------- expand, subtract, factorise ---------- */

interface SquareParams {
  /** The difference is (pn + x)^2 - (pn + y)^2. */
  p: number;
  x: number;
  y: number;
}

interface SquareShape {
  X: string;
  Y: string;
  /** The squares of the two sides as the learner reads them. */
  Xsq: string;
  Ysq: string;
  Xexp: string;
  Yexp: string;
  A: number;
  B: number;
  g: number;
  /** A difference of 2n + odd is odd rather than a multiple of anything. */
  odd: boolean;
}

function squareShape({ p, x, y }: SquareParams): SquareShape {
  const X = linN(p, x);
  const Y = linN(p, y);
  const sq = (t: string, c: number) => (c === 0 && p === 1 ? 'n^2' : `(${t})^2`);
  const A = 2 * p * (x - y);
  const B = x * x - y * y;
  return {
    X,
    Y,
    Xsq: sq(X, x),
    Ysq: sq(Y, y),
    Xexp: polyTex([p * p, 2 * p * x, x * x], 'n'),
    Yexp: polyTex([p * p, 2 * p * y, y * y], 'n'),
    A,
    B,
    g: B === 0 ? A : gcd(A, B),
    odd: A === 2 && mod(B, 2) === 1,
  };
}

/** The difference taken all the way: the factorised form, or 2(...) + 1. */
function squareFinal(s: SquareShape): string {
  if (s.B === 0) return `${s.A}n`;
  if (s.odd) return `2(${linN(1, (s.B - 1) / 2)}) + 1`;
  return `${s.g}(${linTex(s.A / s.g, s.B / s.g)})`;
}

function squareStepsPool(difficulty: number): SquareParams[] {
  const out: SquareParams[] = [];
  if (difficulty < 2) {
    for (const a of range(1, 10)) out.push({ p: 1, x: a, y: -a });
    for (const y of range(1, 9)) out.push({ p: 1, x: y + 2, y });
    for (const y of range(1, 9)) out.push({ p: 1, x: y + 1, y });
  } else {
    for (const y of [-1, 1, 3, 5, 7, 9, 11, 13, 15]) out.push({ p: 2, x: y + 2, y });
    for (const y of [2, 4, 6, 8, 10, 12, 14, 16]) out.push({ p: 2, x: y + 2, y });
    for (const a of range(1, 12)) out.push({ p: 2, x: a, y: -a });
  }
  return out;
}

const aprfSquareTree: Generator<SquareParams> = {
  id: 'aprf-square-tree',
  sample: (rng, difficulty) => rng.pick(squareStepsPool(difficulty)),
  render(params) {
    const { p, x, y } = params;
    const s = squareShape(params);
    const collected = linTex(s.A, s.B);
    const last = s.B === 0 ? [] : [squareFinal(s)];
    const answer = [s.Xexp, s.Yexp, collected, ...last];
    const slips = [
      polyTex([p * p, 0, x * x], 'n'),
      polyTex([p * p, 0, y * y], 'n'),
      linTex(2 * p * (x + y), x * x + y * y),
      s.B === 0
        ? linTex(s.A, 2 * x * x)
        : s.odd
          ? `2(${linN(1, (s.B + 1) / 2)}) + 1`
          : `${s.g}(${linTex(s.A / s.g, s.B)})`,
      polyTex([p * p, p * x, x * x], 'n'),
      linTex(s.A, s.B + 2),
    ];
    const extras = slips.filter((t, i) => !answer.includes(t) && slips.indexOf(t) === i).slice(0, 4);
    const then = s.B === 0 ? '' : s.odd ? ', then that written as $2 \\times$ a whole number, plus $1$' : `, then that with $${s.g}$ taken out`;
    return {
      kind: 'tree',
      prompt: [
        say(s.odd ? 'Show that this is always odd.' : `Show that this is always a multiple of $${s.g}$.`),
        say(`Fill in the two squares expanded, their difference${then}.`),
      ],
      expression: `${s.Xsq} - ${s.Ysq}`,
      nodes: [
        { id: 'x', from: [] },
        { id: 'y', from: [] },
        { id: 'd', from: ['x', 'y'] },
        ...(s.B === 0 ? [] : [{ id: 'f', from: ['d'] }]),
      ],
      bank: [...answer, ...extras].sort(),
      answer,
    };
  },
  solution(params) {
    const s = squareShape(params);
    return [
      { tex: stackTex(`${s.Xsq} = ${s.Xexp}`) },
      { tex: stackTex(`${s.Ysq} = ${s.Yexp}`) },
      { text: 'Subtracting changes the sign of every term of the second square, so the $n^2$ terms cancel:' },
      { tex: stackTex(`${s.Xsq} - ${s.Ysq} = ${linTex(s.A, s.B)}`) },
      {
        text:
          s.B === 0
            ? `That is $${s.A} \\times n$, a multiple of $${s.A}$.`
            : s.odd
              ? `$${linTex(s.A, s.B)} = ${squareFinal(s)}$: $2$ times a whole number, plus $1$, so it is odd.`
              : `$${linTex(s.A, s.B)} = ${squareFinal(s)}$, $${s.g}$ times a whole number, so a multiple of $${s.g}$.`,
      },
    ];
  },
};

/* ---------- the largest number that always divides ---------- */

function squareDividesPool(difficulty: number): SquareParams[] {
  const out: SquareParams[] = [];
  if (difficulty < 2) {
    for (const a of range(1, 9)) out.push({ p: 1, x: a, y: -a });
    for (const h of [2, 3, 4]) for (const y of range(0, 6)) out.push({ p: 1, x: y + h, y });
  } else {
    for (const y of [-1, 1, 3, 5, 7, 9, 11, 13]) out.push({ p: 2, x: y + 2, y });
    for (const y of [2, 4, 6, 8, 10, 12]) out.push({ p: 2, x: y + 2, y });
    for (const a of range(1, 9)) out.push({ p: 2, x: a, y: -a });
    for (const y of range(1, 6)) out.push({ p: 2, x: y + 4, y });
  }
  return out;
}

const aprfSquareDivides: Generator<SquareParams> = {
  id: 'aprf-square-divides',
  sample: (rng, difficulty) => rng.pick(squareDividesPool(difficulty)),
  choices(params) {
    const { A, B, g } = squareShape(params);
    return intOptions(g, [A === g ? 2 * g : A, g / 2, 2 * g, B, g + 4], 2);
  },
  render(params) {
    const s = squareShape(params);
    return typed(
      [`What is the largest whole number that always divides $${s.Xsq} - ${s.Ysq}$, whatever whole number $n$ is?`],
      '\\text{largest} =',
      s.g,
    );
  },
  solution(params) {
    const s = squareShape(params);
    const steps: SolutionStep[] = [
      { tex: stackTex(`${s.Xsq} = ${s.Xexp}`) },
      { tex: stackTex(`${s.Ysq} = ${s.Yexp}`) },
    ];
    if (s.B === 0) {
      return [
        ...steps,
        { text: `Subtracting leaves $${s.A}n$, always a multiple of $${s.A}$. At $n = 1$ it is $${s.A}$ itself, so nothing bigger works.` },
      ];
    }
    return [...steps, ...largestSolution(`${s.Xsq} - ${s.Ysq}`, s.A, s.B).slice(1)];
  },
};

/* ---------- a proof in order ---------- */

type SquareOrderKind = 'odd' | 'even' | 'int' | 'sym';

interface SquareOrderParams {
  kind: SquareOrderKind;
  /** The constant in the smaller number, or for `sym` the distance either side. */
  b: number;
  picks: number[];
}

function squareOrderShape({ kind, b }: { kind: SquareOrderKind; b: number }): SquareParams {
  if (kind === 'odd' || kind === 'even') return { p: 2, x: b + 2, y: b };
  if (kind === 'int') return { p: 1, x: b + 1, y: b };
  return { p: 1, x: b, y: -b };
}

function squareProof(params: { kind: SquareOrderKind; b: number }): Proof {
  const { kind, b } = params;
  const sp = squareOrderShape(params);
  const s = squareShape(sp);
  const { p, x, y } = sp;
  const goal = kind === 'int' ? 'odd' : `a multiple of $${s.g}$`;
  const claim =
    kind === 'sym'
      ? `Two numbers are $${b}$ either side of a whole number $n$. Prove that their squares differ by a multiple of $${s.g}$.`
      : `Prove that the squares of two consecutive ${kind === 'int' ? 'whole' : kind} numbers differ by ${kind === 'int' ? 'an odd number' : goal}.`;
  const expand = (xsq: string, xexp: string, ysq: string, yexp: string) =>
    ysq === 'n^2' ? `Expanding, $${xsq} = ${xexp}$.` : `Expanding, $${xsq} = ${xexp}$ and $${ysq} = ${yexp}$.`;
  const intForm = b === 0 ? '2 \\times n + 1' : `2(${linN(1, b)}) + 1`;
  const inner = kind === 'int' ? linN(1, b) : s.B === 0 ? 'n' : linTex(s.A / s.g, s.B / s.g);
  const wrongSecond = kind === 'int' ? linN(1, b + 2) : kind === 'sym' ? linN(1, 2 * b) : linN(2, b + 1);
  return {
    claim,
    steps: [
      kind === 'sym'
        ? `The numbers are $${s.Y}$ and $${s.X}$.`
        : `Let the numbers be $${s.Y}$ and $${s.X}$, for a whole number $n$.`,
      expand(s.Xsq, s.Xexp, s.Ysq, s.Yexp),
      `Subtracting, the difference is $${linTex(s.A, s.B)}$.`,
      kind === 'int'
        ? `So the difference is $${intForm}$.`
        : s.B === 0
          ? `So the difference is $${s.A} \\times n$.`
          : `Taking out $${s.g}$, the difference is $${s.g}(${inner})$.`,
      `$${inner}$ is a whole number, so the difference is ${goal}.`,
    ],
    pool: [
      {
        text:
          kind === 'sym'
            ? `The numbers are $${s.Y}$ and $${wrongSecond}$.`
            : `Let the numbers be $${s.Y}$ and $${wrongSecond}$, for a whole number $n$.`,
        why:
          kind === 'int'
            ? 'Those are two apart, not consecutive.'
            : kind === 'sym'
              ? `$${wrongSecond}$ is $${2 * b}$ above $n$, not $${b}$.`
              : `$${wrongSecond}$ is ${kind === 'odd' ? 'even' : 'odd'}, so the two are not both ${kind}.`,
      },
      {
        text: expand(s.Xsq, polyTex([p * p, 0, x * x], 'n'), s.Ysq, polyTex([p * p, 0, y * y], 'n')),
        why: 'Each square has a middle term: $(a + b)^2 = a^2 + 2ab + b^2$.',
      },
      y === 0
        ? {
            text: `Subtracting, the difference is $${linTex(s.A, s.B + 2)}$.`,
            why: `The numbers left are $${x * x} - 0 = ${s.B}$.`,
          }
        : {
            text: `Subtracting, the difference is $${linTex(2 * p * (x + y), x * x + y * y)}$.`,
            why: 'Taking away the second square changes the sign of every term in it.',
          },
      {
        text: `At $n = 1$ the difference is $${s.A + s.B}$, so it is always ${goal}.`,
        why: 'One value of $n$ is an example, not a proof.',
      },
    ],
  };
}

const aprfSquareOrder: Generator<SquareOrderParams> = {
  id: 'aprf-square-order',
  sample(rng, difficulty) {
    const kind = rng.pick(['odd', 'even', 'int', 'sym'] as const);
    const b =
      kind === 'odd' ? rng.pick([-1, 1, 3, 5]) : kind === 'even' ? rng.pick([0, 2, 4]) : kind === 'int' ? rng.int(0, 3) : rng.int(1, 5);
    const base = { kind, b };
    return { ...base, picks: pickDistractors(rng, squareProof(base), difficulty) };
  },
  render: (params) => orderSlide(squareProof(params), params.picks),
  solution: (params) => orderSolution(squareProof(params), params.picks),
};

/* ================================================================
 * Lesson 4: odd and even products
 * ================================================================ */

interface ProductTilesParams {
  /** `oo` is (2m + a)(2n + b); `sq` is (2n + a)^2. */
  kind: 'oo' | 'sq';
  a: number;
  b: number;
}

/** The product as [[coefficient, name]] terms, and the bracket in 2(bracket) + 1. */
function productShape({ kind, a, b }: ProductTilesParams): { lhs: string; full: string; half: [number, string][] } {
  if (kind === 'sq') {
    const full: [number, string][] = [[4, 'n^2'], [4 * a, 'n'], [a * a, '']];
    return {
      lhs: `(${linN(2, a)})^2`,
      full: termsTex(full),
      half: [[2, 'n^2'], [2 * a, 'n'], [(a * a - 1) / 2, '']],
    };
  }
  return {
    lhs: `(${linN(2, a, 'm')})(${linN(2, b)})`,
    full: termsTex([[4, 'mn'], [2 * b, 'm'], [2 * a, 'n'], [a * b, '']]),
    half: [[2, 'mn'], [b, 'm'], [a, 'n'], [(a * b - 1) / 2, '']],
  };
}

const aprfProductTiles: Generator<ProductTilesParams> = {
  id: 'aprf-product-tiles',
  sample(rng, difficulty) {
    if (difficulty < 2) return { kind: 'oo', a: rng.pick([1, 3, 5, 7, 9, 11]), b: rng.pick([1, 3, 5, 7, 9, 11]) };
    if (rng.chance(0.2)) return { kind: 'sq', a: rng.pick([1, 3, 5, 7, 9]), b: 0 };
    return { kind: 'oo', a: rng.pick([-3, -1, 1, 3, 5, 7]), b: rng.pick([-3, -1, 3, 5, 7]) };
  },
  render(params) {
    const { lhs, half } = productShape(params);
    const template = `${lhs} = 2({0}) + {1}`;
    const answer = [termsTex(half), '1'];
    const bump = (i: number, by: number) => termsTex(half.map(([c, v], j) => [j === i ? c + by : c, v] as [number, string]));
    const doubled = termsTex(half.map(([c, v]) => [2 * c, v] as [number, string]));
    const candidates = [bump(half.length - 1, 1), '0', '2', bump(0, 2), doubled, '-1', bump(1, 1), '3'];
    return {
      kind: 'tiles',
      prompt: [say('Write the product as $2 \\times$ a whole number, plus $1$.')],
      template,
      bank: safeBank(template, answer, candidates),
      answer,
    };
  },
  solution(params) {
    const { lhs, full, half } = productShape(params);
    return [
      { text: 'Multiply out:' },
      { tex: stackTex(`${lhs} = ${full}`) },
      { text: 'Take $2$ out of everything but $1$:' },
      { tex: stackTex(`${full} = 2(${termsTex(half)}) + 1`) },
      { text: 'The bracket is a whole number, so the product is odd.' },
    ];
  },
};

/* ---------- which is always odd / even ---------- */

type ParityClass = 'odd' | 'even' | 'mixed';

interface Candidate {
  tex: string;
  f: (m: number, n: number) => number;
  why: string;
}

interface ParityChoiceParams {
  target: 'odd' | 'even';
  /** Codes for the options, the right one first: `kind:a:b:c`. */
  codes: string[];
}

function candidate(code: string): Candidate {
  const [kind, sa, sb, sc] = code.split(':');
  const [a, b, c] = [Number(sa), Number(sb), Number(sc)];
  const plus = c === 0 ? '' : ` + ${c}`;
  const cWord = c % 2 === 0 ? 'even' : 'odd';
  const swap = c % 2 === 0 ? 'odd' : 'even';
  switch (kind) {
    case 'oo':
      return {
        tex: `(${linN(2, a, 'm')})(${linN(2, b)})${plus}`,
        f: (m, n) => (2 * m + a) * (2 * n + b) + c,
        why: c === 0 ? 'odd times odd is odd.' : `odd times odd is odd, and adding $${c}$, which is ${cWord}, makes it ${swap}.`,
      };
    case 'oe':
      return {
        tex: `2n(${linN(2, a, 'm')})${plus}`,
        f: (m, n) => 2 * n * (2 * m + a) + c,
        why: `$2n$ is even and even times anything is even${c === 0 ? '.' : `; adding $${c}$ makes it ${cWord}.`}`,
      };
    case 'sum':
      return {
        tex: `(${linN(2, a, 'm')}) + (${linN(2, b)})`,
        f: (m, n) => 2 * m + a + 2 * n + b,
        why: 'odd plus odd is even.',
      };
    case 'mix':
      return {
        tex: `m(${linN(2, b)})${plus}`,
        f: (m, n) => m * (2 * n + b) + c,
        why: '$m$ can be odd or even, so the product can be odd or even.',
      };
    case 'mn':
      return {
        tex: `mn + ${c}`,
        f: (m, n) => m * n + c,
        why: '$mn$ is odd when both are odd and even otherwise.',
      };
    case 'cons':
      return {
        tex: `n(n + ${b})${plus}`,
        f: (_m, n) => n * (n + b) + c,
        why:
          b % 2 === 1
            ? `$n$ and $n + ${b}$ are one odd and one even, so $n(n + ${b})$ is even${c === 0 ? '' : `, and adding $${c}$ makes it ${cWord}`}.`
            : `$n$ and $n + ${b}$ are both odd when $n$ is odd, and both even when $n$ is even, so it can be either.`,
      };
    default:
      throw new Error(`candidate: ${code}`);
  }
}

function classOf(cand: Candidate): ParityClass {
  const values = range(0, 5).flatMap((m) => range(0, 5).map((n) => mod(cand.f(m, n), 2)));
  if (values.every((v) => v === 1)) return 'odd';
  if (values.every((v) => v === 0)) return 'even';
  return 'mixed';
}

const fingerprint = (cand: Candidate) => range(0, 4).flatMap((m) => range(0, 4).map((n) => cand.f(m, n))).join(',');

const aprfParityChoice: Generator<ParityChoiceParams> = {
  id: 'aprf-parity-choice',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const odd = () => rng.pick([1, 3, 5, 7]);
    const kinds = hard ? (['oo', 'oe', 'sum', 'mix', 'mn', 'cons', 'cons'] as const) : (['oo', 'oe', 'sum', 'mix', 'mn'] as const);
    const target = rng.pick(['odd', 'even'] as const);
    for (;;) {
      const codes: string[] = [];
      const seen = new Set<string>();
      let right: string | undefined;
      for (let tries = 0; tries < 40 && (codes.length < 3 || right === undefined); tries += 1) {
        const kind = rng.pick(kinds);
        const c = rng.chance(0.5) ? 0 : rng.int(1, 9);
        const b = kind === 'cons' ? rng.int(1, 8) : odd();
        const code = `${kind}:${odd()}:${b}:${kind === 'mn' && c === 0 ? rng.int(1, 9) : c}`;
        const cand = candidate(code);
        const print = fingerprint(cand);
        if (seen.has(print)) continue;
        const hit = classOf(cand) === target;
        if (hit && right === undefined) {
          right = code;
          seen.add(print);
        } else if (!hit && codes.length < 3) {
          codes.push(code);
          seen.add(print);
        }
      }
      if (right !== undefined && codes.length === 3) return { target, codes: [right, ...codes] };
    }
  },
  render({ target, codes }) {
    const [right, ...wrong] = codes.map((code) => candidate(code).tex);
    return choiceSlide([say(`Which of these is always ${target}, whatever whole numbers $m$ and $n$ are?`)], right, wrong);
  },
  solution({ target, codes }) {
    return [
      ...codes.map((code, i) => {
        const cand = candidate(code);
        const verdict = classOf(cand);
        const said = verdict === 'mixed' ? 'not always one or the other' : `always ${verdict}`;
        return { text: `$${cand.tex}$ is ${said}: ${cand.why}${i === 0 ? ` That is the one that is always ${target}.` : ''}` };
      }),
    ];
  },
};

/* ---------- a proof in order ---------- */

interface ProductOrderParams {
  /** `oo`: m and n both odd; `oe`: m odd, n even. */
  kind: 'oo' | 'oe';
  c: number;
  picks: number[];
}

function productProof({ kind, c }: { kind: 'oo' | 'oe'; c: number }): Proof {
  const oo = kind === 'oo';
  const constant = oo ? 1 + c : c;
  const verdict = constant % 2 === 0 ? 'even' : 'odd';
  const opposite = verdict === 'even' ? 'odd' : 'even';
  const q = Math.floor(constant / 2);
  const inner = termsTex(oo ? [[2, 'jk'], [1, 'j'], [1, 'k'], [q, '']] : [[2, 'jk'], [1, 'k'], [q, '']]);
  const factored = `2(${inner})${verdict === 'odd' ? ' + 1' : ''}`;
  const nForm = oo ? '2k + 1' : '2k';
  const mn = oo ? '4jk + 2j + 2k + 1' : '4jk + 2k';
  const total = oo ? `4jk + 2j + 2k + ${constant}` : `4jk + 2k + ${c}`;
  const [m0, n0] = oo ? [3, 5] : [3, 4];
  return {
    claim: `$m$ is odd and $n$ is ${oo ? 'odd' : 'even'}. Prove that $mn + ${c}$ is ${verdict}.`,
    steps: [
      `Let $m = 2j + 1$ and $n = ${nForm}$, for whole numbers $j$ and $k$.`,
      `Multiplying out, $mn = ${mn}$.`,
      `So $mn + ${c} = ${total}$.`,
      `Taking out $2$, $mn + ${c} = ${factored}$.`,
      `$${inner}$ is a whole number, so $mn + ${c}$ is ${verdict}.`,
    ],
    pool: [
      {
        text: `Let $m = 2k + 1$ and $n = ${nForm}$, for a whole number $k$.`,
        why: oo ? 'One letter for both makes $m$ and $n$ the same number.' : 'One letter for both ties $n$ to $m$: it would always be $m - 1$.',
      },
      {
        text: `Multiplying out, $mn = ${oo ? '4jk + 1' : '4jk'}$.`,
        why: oo ? 'The cross terms $2j$ and $2k$ are missing.' : 'The $2k$ from $1 \\times 2k$ is missing.',
      },
      {
        text: `With $m = ${m0}$ and $n = ${n0}$, $mn + ${c} = ${m0 * n0 + c}$, which is ${verdict}, so it always is.`,
        why: 'One pair of numbers is an example, not a proof.',
      },
      {
        text: `$${inner}$ is a whole number, so $mn + ${c}$ is ${opposite}.`,
        why: `$${factored}$ is ${verdict}, not ${opposite}.`,
      },
    ],
  };
}

const aprfProductOrder: Generator<ProductOrderParams> = {
  id: 'aprf-product-order',
  sample(rng, difficulty) {
    const base = { kind: rng.pick(['oo', 'oe'] as const), c: rng.int(1, 12) };
    return { ...base, picks: pickDistractors(rng, productProof(base), difficulty) };
  },
  render: (params) => orderSlide(productProof(params), params.picks),
  solution: (params) => orderSolution(productProof(params), params.picks),
};

/* ---------- odd, even, or it depends ---------- */

interface ParityFlowParams {
  b: number;
  c: number;
}

const ONE_EACH = 'one odd and one even';
const SAME = 'both odd, or both even';
const ALWAYS_EVEN = 'always even';
const ALWAYS_ODD = 'always odd';
const DEPENDS = 'odd for some $n$, even for others';

const parityVerdict = ({ b, c }: ParityFlowParams) => (b % 2 === 0 ? DEPENDS : c % 2 === 0 ? ALWAYS_EVEN : ALWAYS_ODD);

const aprfParityFlow: Generator<ParityFlowParams> = {
  id: 'aprf-parity-flow',
  sample(rng, difficulty) {
    const b = difficulty >= 2 ? rng.int(1, 9) : rng.pick([1, 3, 5, 7, 9]);
    return { b, c: rng.int(0, 9) };
  },
  render(params) {
    const { b, c } = params;
    const subject = polyTex([1, b, c], 'n');
    const verdict = parityVerdict(params);
    const pair = b % 2 === 1 ? ONE_EACH : SAME;
    const factorLabels = turned([`$n(n + ${b})$`, `$n(n - ${b})$`, `$(n + ${b})^2$`], `${b}|${c}`);
    const outcome = (label: string) => {
      if (label === verdict) return 'That is the answer.';
      if (verdict === DEPENDS) return `At $n = 1$ it is $${1 + b + c}$ and at $n = 2$ it is $${4 + 2 * b + c}$: one odd, one even.`;
      return c === 0
        ? `$n(n + ${b})$ is always even.`
        : `$n(n + ${b})$ is always even, so adding $${c}$ makes it ${verdict.replace('always ', '')} every time.`;
    };
    return {
      kind: 'flow',
      prompt: [say('Is this always odd, always even, or neither? Each answer chooses what gets asked next.')],
      subject,
      steps: [
        {
          id: 'factor',
          ask: `First, $${polyTex([1, b, 0], 'n')}$ factorises as`,
          branches: factorLabels.map((label) => ({ label, to: 'pair' })),
        },
        {
          id: 'pair',
          ask: `So $n$ and $n + ${b}$ are`,
          branches: [ONE_EACH, SAME].map((label) => ({ label, to: 'verdict' })),
        },
        {
          id: 'verdict',
          ask: `So $${subject}$ is`,
          branches: [ALWAYS_EVEN, ALWAYS_ODD, DEPENDS].map((label) => ({ label, outcome: outcome(label) })),
        },
      ],
      answer: [`$n(n + ${b})$`, pair, verdict],
    };
  },
  solution(params) {
    const { b, c } = params;
    const subject = polyTex([1, b, c], 'n');
    const factored = `n(n + ${b})${c === 0 ? '' : ` + ${c}`}`;
    return [
      { tex: stackTex(`${subject} = ${factored}`) },
      b % 2 === 1
        ? {
            text: `$${b}$ is odd, so $n$ and $n + ${b}$ are one odd and one even, and their product is even. ${c === 0 ? 'So it is always even.' : `Adding $${c}$ makes it always ${c % 2 === 0 ? 'even' : 'odd'}.`}`,
          }
        : {
            text: `$${b}$ is even, so $n$ and $n + ${b}$ are both odd or both even. At $n = 1$ it is $${1 + b + c}$ and at $n = 2$ it is $${4 + 2 * b + c}$, so it is odd for some $n$ and even for others.`,
          },
    ];
  },
};

/* ================================================================
 * Lesson 5: show that
 * ================================================================ */

interface FactorTilesParams {
  k: number;
  /** The bracket's terms, as [[coefficient, name]]. */
  inner: [number, string][];
}

const aprfFactorTiles: Generator<FactorTilesParams> = {
  id: 'aprf-factor-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const k = rng.int(2, 9);
      if (difficulty < 2) {
        const p = rng.int(1, 5);
        const q = rng.int(1, 9);
        if (gcd(p, q) !== 1 || k * p > 99 || k * q > 99) continue;
        return { k, inner: [[p, 'n'], [q, '']] };
      }
      if (rng.chance(0.5)) {
        const p = rng.int(1, 6);
        const q = rng.int(1, 9);
        if (gcd(p, q) !== 1 || k * p > 99 || k * q > 99) continue;
        return { k, inner: [[p, 'n'], [-q, '']] };
      }
      const [p, q, r] = [rng.int(1, 5), rng.int(1, 5), rng.int(1, 7)];
      if (gcd(gcd(p, q), r) !== 1 || k * Math.max(p, q, r) > 99) continue;
      return { k, inner: [[p, 'm'], [q, 'n'], [r, '']] };
    }
  },
  render({ k, inner }) {
    const full = termsTex(inner.map(([c, v]) => [k * c, v]));
    const template = `${full} = {0}({1})`;
    const answer = [String(k), termsTex(inner)];
    const last = inner.length - 1;
    const tweak = (f: (c: number, i: number) => number) => termsTex(inner.map(([c, v], i) => [f(c, i), v] as [number, string]));
    const candidates = [
      tweak((c, i) => (i === last ? k * c : c)),
      tweak((c, i) => (i === 0 ? k * c : c)),
      tweak((c, i) => (i === last ? c + 1 : c)),
      String(k + 1),
      String(2 * k),
      String(k - 1),
      tweak((c, i) => (i === last ? c - 1 : c)),
    ].filter((t) => t !== '1' && t !== '0');
    return {
      kind: 'tiles',
      prompt: [say(`Show that $${full}$ is always a multiple of $${k}$: take out the factor.`)],
      template,
      bank: safeBank(template, answer, candidates),
      answer,
    };
  },
  solution({ k, inner }) {
    const full = termsTex(inner.map(([c, v]) => [k * c, v]));
    return [
      { text: `Every term is a multiple of $${k}$: ${inner.map(([c, v]) => `$${termsTex([[k * c, v]])} = ${k} \\times ${termsTex([[c, v]])}$`).join(', ')}.` },
      { tex: stackTex(`${full} = ${k}(${termsTex(inner)})`) },
      { text: `The bracket is a whole number, so the expression is always a multiple of $${k}$. Expanding the bracket again is a quick check.` },
    ];
  },
};

/* ---------- which is always a multiple ---------- */

interface Bracketed {
  /** p(qn + r) + s */
  p: number;
  q: number;
  r: number;
  s: number;
}

interface WhichParams {
  k: number;
  /** The right one first. */
  items: Bracketed[];
  bracketed: boolean;
}

const coeffsOf = ({ p, q, r, s }: Bracketed) => ({ A: p * q, B: p * r + s });

function bracketTex(item: Bracketed, bracketed: boolean): string {
  const { A, B } = coeffsOf(item);
  if (!bracketed) return linTex(A, B);
  const { p, q, r, s } = item;
  const tail = s === 0 ? '' : s > 0 ? ` + ${s}` : ` - ${-s}`;
  return `${p}(${linN(q, r)})${tail}`;
}

const aprfWhichMultiple: Generator<WhichParams> = {
  id: 'aprf-which-multiple',
  sample(rng, difficulty) {
    const bracketed = difficulty >= 2;
    const k = rng.int(2, 6);
    const draw = (): Bracketed =>
      bracketed
        ? { p: rng.int(2, 6), q: rng.int(1, 4), r: rng.int(1, 6), s: rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]) }
        : { p: 1, q: rng.int(2, 12), r: rng.int(1, 30), s: 0 };
    const fits = (item: Bracketed) => {
      const { A, B } = coeffsOf(item);
      return A > 0 && B > 0 && A < 100 && B < 100 && A % k === 0 && B % k === 0;
    };
    for (;;) {
      const right = draw();
      if (!fits(right)) continue;
      const wrong: Bracketed[] = [];
      const seen = new Set([JSON.stringify(coeffsOf(right))]);
      // One slip keeps the n-term, one keeps the constant, one neither.
      const wants = [
        (A: number, B: number) => A % k === 0 && B % k !== 0,
        (A: number, B: number) => A % k !== 0 && B % k === 0,
        (A: number, B: number) => A % k !== 0 && B % k !== 0,
      ];
      for (const want of wants) {
        for (let tries = 0; tries < 60; tries += 1) {
          const item = draw();
          const { A, B } = coeffsOf(item);
          const key = JSON.stringify({ A, B });
          if (A <= 0 || B <= 0 || A >= 100 || B >= 100 || seen.has(key) || !want(A, B)) continue;
          seen.add(key);
          wrong.push(item);
          break;
        }
      }
      if (wrong.length === 3) return { k, items: [right, ...wrong], bracketed };
    }
  },
  render({ k, items, bracketed }) {
    const [right, ...wrong] = items.map((item) => bracketTex(item, bracketed));
    return choiceSlide([say(`Which of these is always a multiple of $${k}$?`)], right, wrong);
  },
  solution({ k, items, bracketed }) {
    return items.map((item, i) => {
      const { A, B } = coeffsOf(item);
      const shown = bracketTex(item, bracketed);
      const lead = bracketed ? `${shown} = ${linTex(A, B)}` : shown;
      if (i === 0) return { text: `$${lead} = ${k}(${linTex(A / k, B / k)})$, always a multiple of $${k}$.` };
      const fail = B % k !== 0 ? `$${B}$ is not a multiple of $${k}$, so at $n = 0$ it is not` : `at $n = 1$ it is $${A + B}$, not a multiple of $${k}$`;
      return { text: `$${lead}$: ${fail}.` };
    });
  },
};

/* ---------- expand, collect, factorise ---------- */

interface ShowParams {
  p: number;
  r: number;
  a: number;
  q: number;
  s: number;
  b: number;
  op: '+' | '-';
}

function showShape({ p, r, a, q, s, b, op }: ShowParams) {
  const sign = op === '+' ? 1 : -1;
  const A = p * r + sign * q * s;
  const B = p * a + sign * q * b;
  return { A, B, g: gcd(A, B), first: `${p}(${linN(r, a)})`, second: `${q}(${linN(s, b)})` };
}

const aprfShowSteps: Generator<ShowParams> = {
  id: 'aprf-show-steps',
  sample(rng, difficulty) {
    const op = difficulty >= 2 ? '-' : '+';
    for (;;) {
      const params: ShowParams = {
        p: rng.int(2, 6),
        r: rng.int(1, 3),
        a: rng.int(1, 7),
        q: rng.int(2, 5),
        s: rng.int(1, 3),
        b: rng.int(1, 7),
        op,
      };
      const { A, B, g } = showShape(params);
      if (A <= 0 || B === 0 || g < 2 || Math.abs(B) > 99 || A > 99) continue;
      return params;
    }
  },
  render(params) {
    const { p, r, a, q, s, b, op } = params;
    const { A, B, g, first, second } = showShape(params);
    const e1 = linN(p * r, p * a);
    const e2 = `(${linN(q * s, q * b)})`;
    const collected = linTex(A, B);
    const final = `${g}(${linTex(A / g, B / g)})`;
    const signSlip = op === '-' ? linTex(A, p * a + q * b) : linTex(A, B + 1);
    return {
      kind: 'steps',
      prompt: [say(`Show that this is always a multiple of $${g}$.`), say(TAP)],
      start: [first, op, second],
      reductions: [
        { span: [0, 1], value: e1, bank: stepBank(e1, linN(p * r, a), linN(r, p * a), linN(p * r, p + a)) },
        { span: [2, 3], value: e2, bank: stepBank(e2, `(${linN(q * s, b)})`, `(${linN(s, q * b)})`, `(${linN(q * s, q + b)})`) },
        { span: [0, 3], operator: 1, value: collected, bank: stepBank(collected, signSlip, linTex(A + 1, B), linTex(A, B - 1)) },
        {
          span: [0, 1],
          value: final,
          bank: stepBank(final, `${g}(${linTex(A / g, B)})`, `${g}(${linTex(A, B / g)})`, `${g}(${linTex(A / g, B / g + 1)})`),
        },
      ],
    };
  },
  solution(params) {
    const { p, r, a, q, s, b, op } = params;
    const { A, B, g, first, second } = showShape(params);
    return [
      { tex: stackTex(`${first} = ${linN(p * r, p * a)}`) },
      { tex: stackTex(`${second} = ${linN(q * s, q * b)}`) },
      {
        text:
          op === '-'
            ? 'Taking away the second bracket changes the sign of both its terms. Collecting:'
            : 'Adding, collect the $n$ terms and the numbers:',
      },
      { tex: stackTex(`${linTex(A, B)} = ${g}(${linTex(A / g, B / g)})`) },
      { text: `The bracket is a whole number, so it is always a multiple of $${g}$.` },
    ];
  },
};

/* ---------- find the wrong line ---------- */

type ErrorKind = 'expand' | 'sum' | 'square';

interface FindErrorParams {
  kind: ErrorKind;
  /** Numbers for the proof, read by kind. */
  nums: number[];
  /** Which of lines 1 to 3 is wrong. */
  wrong: number;
}

interface ErrorProof {
  claim: string;
  lines: string[];
  slips: string[];
  whys: string[];
}

function errorProof({ kind, nums }: FindErrorParams): ErrorProof {
  if (kind === 'expand') {
    const [p, r, a, q, s, b] = nums;
    const A = p * r + q * s;
    const B = p * a + q * b;
    const g = gcd(A, B);
    return {
      claim: `Show that $${p}(${linN(r, a)}) + ${q}(${linN(s, b)})$ is always a multiple of $${g}$.`,
      lines: [
        `It equals $${linN(p * r, p * a)} + ${linN(q * s, q * b)}$.`,
        `Collecting, that is $${linTex(A, B)}$.`,
        `Taking out $${g}$, it is $${g}(${linTex(A / g, B / g)})$.`,
        `The bracket is a whole number, so it is a multiple of $${g}$.`,
      ],
      slips: [
        `It equals $${linN(p * r, a)} + ${linN(q * s, q * b)}$.`,
        `Collecting, that is $${linTex(A, B + 1)}$.`,
        `Taking out $${g}$, it is $${g}(${linTex(A / g, B)})$.`,
      ],
      whys: [
        `$${p}(${linN(r, a)})$ multiplies both terms by $${p}$: it is $${linN(p * r, p * a)}$.`,
        `The numbers add to $${p * a} + ${q * b} = ${B}$.`,
        `$${g}(${linTex(A / g, B)})$ expands to $${linTex(A, g * B)}$; the $${B}$ has to be divided by $${g}$ too.`,
      ],
    };
  }
  if (kind === 'sum') {
    const [c] = nums;
    const { terms, A, B, g } = sumShape({ kind: 'int', k: 1, b: 0, c });
    const wrongTerms = range(0, c - 1).map((i) => linTex(1, 2 * i));
    return {
      claim: `Show that the sum of any ${c} consecutive whole numbers is a multiple of $${g}$.`,
      lines: [
        `Let the numbers be ${terms.map((t) => `$${t}$`).join(', ')}.`,
        `Their sum is $${linTex(A, B)}$.`,
        `That is $${g}(${linTex(A / g, B / g)})$.`,
        `The bracket is a whole number, so the sum is a multiple of $${g}$.`,
      ],
      slips: [
        `Let the numbers be ${wrongTerms.map((t) => `$${t}$`).join(', ')}.`,
        `Their sum is $${linTex(A, B - 1)}$.`,
        `That is $${g}(${linTex(A / g, B / g + 1)})$.`,
      ],
      whys: [
        'Those go up in twos, so they are not consecutive.',
        `The numbers add to $${range(0, c - 1).join(' + ')} = ${B}$.`,
        `$${g}(${linTex(A / g, B / g + 1)})$ expands to $${linTex(A, B + g)}$, not $${linTex(A, B)}$.`,
      ],
    };
  }
  const [a] = nums;
  return {
    claim: `Show that $(n + ${a})^2 - (n - ${a})^2$ is always a multiple of $${4 * a}$.`,
    lines: [
      `$(n + ${a})^2 = ${polyTex([1, 2 * a, a * a], 'n')}$`,
      `$(n - ${a})^2 = ${polyTex([1, -2 * a, a * a], 'n')}$`,
      `Subtracting, the difference is $${4 * a}n$.`,
      `That is $${4 * a} \\times n$, a multiple of $${4 * a}$.`,
    ],
    slips: [
      `$(n + ${a})^2 = ${polyTex([1, a, a * a], 'n')}$`,
      `$(n - ${a})^2 = ${polyTex([1, -2 * a, -a * a], 'n')}$`,
      `Subtracting, the difference is $${linTex(4 * a, 2 * a * a)}$.`,
    ],
    whys: [
      `The middle term is $2 \\times ${a} \\times n = ${2 * a}n$.`,
      `The last term is $(-${a})^2 = ${a * a}$, which is positive.`,
      `The $${a * a}$ in each square cancels when you subtract: the difference is $${4 * a}n$.`,
    ],
  };
}

const aprfFindError: Generator<FindErrorParams> = {
  id: 'aprf-find-error',
  sample(rng, difficulty) {
    for (;;) {
      const kind = difficulty >= 2 ? rng.pick(['expand', 'square', 'expand'] as const) : rng.pick(['expand', 'sum'] as const);
      const wrong = rng.int(1, 3);
      if (kind === 'sum') return { kind, nums: [rng.int(3, 7)], wrong };
      if (kind === 'square') return { kind, nums: [rng.int(1, 9)], wrong };
      const nums = [rng.int(2, 5), rng.int(1, 3), rng.int(1, 6), rng.int(2, 5), rng.int(1, 3), rng.int(1, 6)];
      const [p, r, a, q, s, b] = nums;
      if (gcd(p * r + q * s, p * a + q * b) < 2) continue;
      return { kind, nums, wrong };
    }
  },
  render(params) {
    const proof = errorProof(params);
    const lines = proof.lines.map((line, i) => (i + 1 === params.wrong ? proof.slips[i] : line));
    return {
      kind: 'choice',
      prompt: [
        say(proof.claim),
        ...lines.map((line, i) => say(`**Line ${i + 1}:** ${line}`)),
        say('One line is wrong. Which?'),
      ],
      options: lines.map((_, i) => ({ id: `opt${i}`, label: `Line ${i + 1}`, tex: false })),
      correctId: `opt${params.wrong - 1}`,
    };
  },
  solution(params) {
    const proof = errorProof(params);
    const i = params.wrong - 1;
    return [
      { text: `Line ${params.wrong} is wrong. ${proof.whys[i]}` },
      { text: `It should read: ${proof.lines[i]}` },
      { text: 'Every other line follows from the one before it.' },
    ];
  },
};

export const algebraicProofGenerators = [
  aprfWrite,
  aprfFindN,
  aprfListTable,
  aprfConsecTiles,
  aprfSumSteps,
  aprfSumMultiple,
  aprfSumOrder,
  aprfSumFlow,
  aprfSquareTiles,
  aprfSquareTree,
  aprfSquareDivides,
  aprfSquareOrder,
  aprfProductTiles,
  aprfParityChoice,
  aprfProductOrder,
  aprfParityFlow,
  aprfFactorTiles,
  aprfWhichMultiple,
  aprfShowSteps,
  aprfFindError,
];

/** The order generators, for the reducer harness in `proofOrder.test.ts`. */
export const algebraicProofOrders = [aprfSumOrder, aprfSquareOrder, aprfProductOrder];

/** The machinery behind the slides, for `algebraicProof.test.ts`. */
export const algebraicProofTesting = { texAt, trueFillings, sumShape, squareShape, candidate, classOf, errorProof };
