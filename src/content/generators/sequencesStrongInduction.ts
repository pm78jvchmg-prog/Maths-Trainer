/**
 * Sequences & Series, level 9: Strong Induction and Recurrences.
 *
 * Lesson 1 runs rules that look two terms back, u_{n+2} = au_{n+1} + bu_n,
 * and finds a and b from four terms. Lesson 2 solves them: the characteristic
 * equation x^2 = ax + b, roots p and q, and u_n = Ap^n + Bq^n with A and B
 * from two starting terms. Lesson 3 proves such a closed form by strong
 * induction: two base cases, an assumption at n = k - 1 and n = k, and a step
 * that comes back to the formula because p^2 = ap + b. Lesson 4 is Fibonacci:
 * the sum F_1 + ... + F_n = F_{n+2} - 1, every third term even, and a bound
 * u_n < c^n by strong induction. Lesson 5 is strong induction on amounts:
 * every amount from some N on can be made from two stamps.
 *
 * Every number a learner places or types is whole. Closed forms are built
 * from whole roots p and q (never 1, never p = -q, so the rule keeps both
 * terms) and whole A and B, and the rule is worked out from them, so the
 * characteristic equation always factorises. Four terms given to find a and
 * b are made from whole a and b, so the elimination comes out whole. Stamp
 * pairs have no common factor, and a table of how an amount is made stays
 * below ab, where each amount can be made in one way only.
 *
 * Forms (a characteristic equation, a proof) go through tiles, order, flow or
 * choice, never typed: the checker compares values. Nothing here is calculus,
 * so no slide declares `source`.
 */
import type { Rng } from '../../engine/rng';
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { orderSlide, orderSolution, pickDistractors, type Proof } from './numberProof';

/* ---------- shared ---------- */

/** `+ 4` or `- 4`, for a number written after another. */
function signed(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** A number in brackets when it is negative, for substituting. */
function br(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** Stacked lines of working, aligned. */
function chain(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** `c` in front of a symbol: `u_n`, `-u_n`, `3u_n`; a bare number when there is no symbol. */
function coef(c: number, sym: string): string {
  if (sym === '') return `${c}`;
  if (c === 1) return sym;
  if (c === -1) return `-${sym}`;
  return `${c}${sym}`;
}

/** Terms added as written, `2u_{n+1} - 3u_n`; a zero coefficient drops its term. */
function combo(terms: [number, string][]): string {
  let out = '';
  for (const [c, sym] of terms) {
    if (c === 0) continue;
    if (out === '') out = coef(c, sym);
    else out += c < 0 ? ` - ${coef(-c, sym)}` : ` + ${coef(c, sym)}`;
  }
  return out || '0';
}

/** `c` times something that starts with a digit: `2^k`, `3 \times 2^k`, `-2^k`. */
function mult(c: number, what: string): string {
  if (c === 1) return what;
  if (c === -1) return `-${what}`;
  return `${c} \\times ${what}`;
}

/** Products added as written: `3 \times 2^k + 3^k`, `2^k - 2 \times 3^k`. */
function sumOf(terms: [number, string][]): string {
  let out = '';
  for (const [c, what] of terms) {
    if (c === 0) continue;
    if (out === '') out = mult(c, what);
    else out += c < 0 ? ` - ${mult(-c, what)}` : ` + ${mult(c, what)}`;
  }
  return out || '0';
}

/** A power as written: `3^n`, `2^{k-1}`, `(-1)^{k+1}`. */
function pw(base: number, e: string): string {
  const b = base < 0 ? `(${base})` : `${base}`;
  return e.length === 1 ? `${b}^${e}` : `${b}^{${e}}`;
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
function nativeChoice(labels: string[], salt: number, tex = true): { options: { id: string; label: string; tex: boolean }[]; correctId: string } {
  const kept = [...new Set(labels)];
  return {
    options: turned(
      kept.map((label, i) => ({ id: i === 0 ? 'correct' : `wrong${i}`, label, tex })),
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

/**
 * A bank of whole numbers for a table or a tree: every answer (repeats kept),
 * then up to four distinct distractors, the likeliest slips first, topped up
 * with near misses so at least two remain. Sorted, never shuffled.
 */
function numberBank(answer: number[], slips: number[], most = 4): string[] {
  const extras: number[] = [];
  for (const value of slips) {
    if (extras.length >= most) break;
    if (!Number.isInteger(value) || answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  for (let step = 1; extras.length < 2; step += 1) {
    const top = Math.max(...answer);
    const bottom = Math.min(...answer);
    for (const value of [top + step, bottom - step]) {
      if (extras.length < 2 && !answer.includes(value) && !extras.includes(value)) extras.push(value);
    }
  }
  return [...answer, ...extras].sort((x, y) => x - y).map(String);
}

/** A tiles bank: every answer token plus the distinct distractors, sorted. */
function tileBank(answer: string[], distractors: string[], most = 4): string[] {
  const seen = new Set(answer);
  const extras = distractors.filter((text) => !seen.has(text) && seen.add(text)).slice(0, most);
  return [...answer, ...extras].sort();
}

/** `count` distinct positions from `lo` to `hi`, in order. */
function positions(rng: Rng, lo: number, hi: number, count: number): number[] {
  const all = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return rng.sample(all, count).sort((x, y) => x - y);
}

/** Draws until `ok` holds. */
function drawUntil<T>(draw: () => T, ok: (value: T) => boolean): T {
  for (;;) {
    const value = draw();
    if (ok(value)) return value;
  }
}

/** Times and brackets, so a substitution can be typed rather than done in the head. */
const ARITHMETIC_KEYS: KeypadKey[] = [{ insert: '*', label: '×' }, { insert: '(' }, { insert: ')' }];

/** A whole number typed on the keypad, with a lead naming what it is. */
function typed(prompt: Block[], lead: string, answer: number): Slide {
  return {
    kind: 'expression',
    prompt,
    lead,
    keypad: ARITHMETIC_KEYS,
    answer: `${answer}`,
    domain: 'real',
    mode: 'exact',
  };
}

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

const LIMIT = 1000;

/* ---------- second-order rules ---------- */

/** u_{n+2} = a u_{n+1} + b u_n, from u_1 and u_2. */
interface Two {
  a: number;
  b: number;
  u1: number;
  u2: number;
}

/** The rule as written: `u_{n+2} = 2u_{n+1} + 3u_n`. */
const ruleTex = (a: number, b: number) => `u_{n+2} = ${combo([[a, 'u_{n+1}'], [b, 'u_n']])}`;

/** The rule's right side at the step: `5u_k - 6u_{k-1}`. */
const ruleK = (a: number, b: number) => combo([[a, 'u_k'], [b, 'u_{k-1}']]);

/** u_1 to u_count. */
function twoTerms({ a, b, u1, u2 }: Two, count: number): number[] {
  const out = [u1, u2];
  while (out.length < count) out.push(a * out[out.length - 1] + b * out[out.length - 2]);
  return out;
}

/** The working for one term: `2 \times 7 + 3 \times 2`. */
function ruleSum(a: number, b: number, prev: number, prev2: number): string {
  const first = a === 1 ? `${prev}` : a === -1 ? `-${br(prev)}` : `${a} \\times ${br(prev)}`;
  const second = Math.abs(b) === 1 ? br(prev2) : `${Math.abs(b)} \\times ${br(prev2)}`;
  return `${first} ${b < 0 ? '-' : '+'} ${second}`;
}

const B_EASY = [1, 2, 3];
const B_HARD = [-3, -2, -1, 1, 2, 3, 4];

/** A two-back rule and its starts; the first `rows` terms stay under 1000 and are not all zero. */
function sampleTwo(rng: Rng, hard: boolean, rows: number): Two {
  return drawUntil(
    () =>
      hard
        ? { a: rng.int(1, 4), b: rng.pick(B_HARD), u1: rng.int(-2, 5), u2: rng.int(-2, 6) }
        : { a: rng.int(1, 3), b: rng.pick(B_EASY), u1: rng.int(1, 4), u2: rng.int(1, 5) },
    (t) => {
      const terms = twoTerms(t, rows);
      return terms.every((u) => Math.abs(u) < LIMIT) && new Set(terms).size > 2;
    },
  );
}

/* Lesson 1: rules that look two back */

interface RunParams {
  t: Two;
  blanks: number[];
}

/** Six terms of a two-back rule in a table, the first two given. */
const runTable: Generator<RunParams> = {
  id: 'seq-l9-run-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { t: sampleTwo(rng, hard, 6), blanks: hard ? [2, 3, 4, 5] : positions(rng, 2, 5, 3) };
  },
  render: ({ t, blanks }): Slide => {
    const terms = twoTerms(t, 6);
    const answer: number[] = [];
    const slips: number[] = [];
    const rows = terms.map((u, i) => {
      if (!blanks.includes(i)) return [`${i + 1}`, `${u}`];
      answer.push(u);
      const p1 = terms[i - 1];
      const p2 = terms[i - 2];
      slips.push(t.a * p1 - t.b * p2, t.a * p2 + t.b * p1, p1 + t.b * p2, t.a * p1 + p2);
      return [`${i + 1}`, null];
    });
    return {
      kind: 'table',
      prompt: [prose(`Fill in the terms of $${ruleTex(t.a, t.b)}$, starting from $u_1 = ${t.u1}$ and $u_2 = ${t.u2}$. Each term comes from the two above it.`)],
      columns: ['n', 'u_n'],
      rows,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ t }) => {
    const terms = twoTerms(t, 6);
    return [
      { text: `Put the two terms above into the rule each time, $${ruleTex(t.a, t.b)}$:` },
      { tex: chain(...[2, 3, 4, 5].map((i) => `u_{${i + 1}} &= ${ruleSum(t.a, t.b, terms[i - 1], terms[i - 2])} = ${terms[i]}`)) },
    ];
  },
};

interface NextParams {
  a: number;
  b: number;
  /** The position of the earliest term involved. */
  n: number;
  /** u_n, u_{n+1}, u_{n+2}. */
  x: number;
  y: number;
  z: number;
  /** Find u_n from the two after it, rather than u_{n+2}. */
  back: boolean;
}

/** One term from the two before it, or (difficulty 2) the one before from the two after. */
const nextTerm: Generator<NextParams> = {
  id: 'seq-l9-next-term',
  sample: (rng, difficulty) => {
    const back = difficulty > 1;
    return drawUntil(
      () => {
        const a = rng.int(1, 4);
        const b = back ? rng.pick([-3, -2, -1, 1, 2, 3, 4]) : rng.int(1, 4);
        const x = back ? rng.int(-5, 15) : rng.int(1, 20);
        const y = rng.int(1, 30);
        return { a, b, n: rng.int(3, 8), x, y, z: a * y + b * x, back };
      },
      ({ z, x, y }) => Math.abs(z) < LIMIT && z !== x && z !== y,
    );
  },
  choices: ({ a, b, x, y, z, back }) =>
    back
      ? numberOptions(x, [z - a * y, (z + a * y) / b, -x, y - x])
      : numberOptions(z, [a * y - b * x, a * x + b * y, y + b * x, a * y + x]),
  render: ({ a, b, n, x, y, z, back }): Slide =>
    back
      ? typed(
          [prose(`A sequence follows $${ruleTex(a, b)}$. Given $u_{${n + 1}} = ${y}$ and $u_{${n + 2}} = ${z}$, find $u_{${n}}$.`)],
          `u_{${n}} =`,
          x,
        )
      : typed(
          [prose(`A sequence follows $${ruleTex(a, b)}$. Given $u_{${n}} = ${x}$ and $u_{${n + 1}} = ${y}$, find $u_{${n + 2}}$.`)],
          `u_{${n + 2}} =`,
          z,
        ),
  solution: ({ a, b, n, x, y, z, back }) => {
    if (!back) {
      return [
        { text: `Put $n = ${n}$ into the rule: $u_{${n + 2}}$ comes from $u_{${n + 1}}$ and $u_{${n}}$.` },
        { tex: chain(`u_{${n + 2}} &= ${ruleSum(a, b, y, x)}`, `&= ${z}`) },
      ];
    }
    const lhs = z - a * y;
    return [
      { text: `The rule at $n = ${n}$ links all three terms, with $u_{${n}}$ unknown:` },
      {
        tex: chain(
          `${z} &= ${a === 1 ? '' : `${a} \\times `}${y} ${b < 0 ? '-' : '+'} ${coef(Math.abs(b), `u_{${n}}`)}`,
          `${lhs} &= ${coef(b, `u_{${n}}`)}`,
          `u_{${n}} &= ${x}`,
        ),
      },
    ];
  },
};

type StartsForm = 'one' | 'two' | 'back' | 'skip' | 'three' | 'gap';

interface StartsParams {
  form: StartsForm;
  c: number;
  d: number;
}

const STARTS_ORDER: Record<StartsForm, number> = { one: 1, two: 2, back: 2, skip: 2, three: 3, gap: 3 };

function startsRule({ form, c, d }: StartsParams): string {
  switch (form) {
    case 'one':
      return `u_{n+1} = ${combo([[c, 'u_n'], [d, '']])}`;
    case 'two':
      return `u_{n+2} = ${combo([[c, 'u_{n+1}'], [d, 'u_n']])}`;
    case 'back':
      return `u_n = ${combo([[c, 'u_{n-1}'], [d, 'u_{n-2}']])}`;
    case 'skip':
      return `u_{n+2} = ${combo([[c, 'u_n'], [d, '']])}`;
    case 'three':
      return `u_{n+3} = ${combo([[c, 'u_{n+2}'], [d, 'u_n']])}`;
    case 'gap':
      return `u_{n+3} = ${combo([[c, 'u_{n+1}'], [d, 'u_n']])}`;
  }
}

/** How far back the rule reaches, in words for the solution. */
function startsWhy({ form }: StartsParams): string {
  switch (form) {
    case 'one':
      return 'The rule goes from $u_n$ to $u_{n+1}$: one step back, so one starting term.';
    case 'two':
      return 'The rule goes from $u_n$ to $u_{n+2}$: two steps back, so two starting terms, $u_1$ and $u_2$.';
    case 'back':
      return 'The rule builds $u_n$ from $u_{n-2}$: two steps back, so two starting terms, $u_1$ and $u_2$.';
    case 'skip':
      return 'The rule jumps from $u_n$ to $u_{n+2}$, two steps, even with no $u_{n+1}$ in it: $u_1$ fixes the odd terms and $u_2$ the even ones, so two starting terms.';
    case 'three':
      return 'The rule goes from $u_n$ to $u_{n+3}$: three steps back, so three starting terms, $u_1$, $u_2$ and $u_3$.';
    case 'gap':
      return 'The rule goes from $u_n$ to $u_{n+3}$, three steps, even with no $u_{n+2}$ in it: $u_4$ needs $u_1$, $u_5$ needs $u_2$, $u_6$ needs $u_3$. Three starting terms.';
  }
}

/** How many starting terms a rule needs: the highest index less the lowest. */
const startsChoice: Generator<StartsParams> = {
  id: 'seq-l9-starts',
  sample: (rng, difficulty) => {
    const form = rng.pick<StartsForm>(difficulty > 1 ? ['skip', 'three', 'gap', 'back', 'one'] : ['one', 'two', 'two', 'back']);
    const c = rng.int(1, 5);
    const d = form === 'one' || form === 'skip' ? rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) : rng.int(1, 4);
    return { form, c: form === 'one' || form === 'skip' ? c + 1 : c, d };
  },
  render: (params): Slide => {
    const right = STARTS_ORDER[params.form];
    const labels = [right, ...[1, 2, 3, 4].filter((v) => v !== right)].map(String);
    return {
      kind: 'choice',
      prompt: [prose('How many starting terms must be given to fix every term of this sequence?'), display(startsRule(params))],
      ...nativeChoice(labels, mix(params.form, params.c, params.d)),
    };
  },
  solution: (params) => [{ text: startsWhy(params) }, { text: 'Count how far back the rule reaches: the highest index less the lowest.' }],
};

interface FindAbParams {
  t: Two;
}

/** a and b from four terms, then the fifth. */
const findAb: Generator<FindAbParams> = {
  id: 'seq-l9-find-ab',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      t: drawUntil(
        () => (hard ? { a: rng.int(1, 4), b: rng.pick([-3, -2, -1, 1, 2, 3]), u1: rng.int(1, 4), u2: rng.int(1, 6) } : { a: rng.int(1, 3), b: rng.int(1, 3), u1: rng.int(1, 3), u2: rng.int(1, 5) }),
        (t) => {
          const [u1, u2, u3] = twoTerms(t, 3);
          const terms = twoTerms(t, 5);
          return u2 * u2 !== u1 * u3 && terms.every((u) => Math.abs(u) < LIMIT) && t.a !== t.b;
        },
      ),
    };
  },
  render: ({ t }): Slide => {
    const [u1, u2, u3, u4, u5] = twoTerms(t, 5);
    const answer = [t.a, t.b, u5];
    return {
      kind: 'tree',
      prompt: [prose('These are $u_1$ to $u_4$ of a sequence with $u_{n+2} = au_{n+1} + bu_n$. Find $a$, then $b$, then $u_5$.')],
      expression: `${u1}, \\; ${u2}, \\; ${u3}, \\; ${u4}`,
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: ['a'] },
        { id: 'next', from: ['a', 'b'] },
      ],
      bank: numberBank(answer, [t.b, t.a, -t.b, t.a + 1, t.b * u4 + t.a * u3, u4 + u3]),
      answer: answer.map(String),
    };
  },
  solution: ({ t }) => {
    const [u1, u2, u3, u4, u5] = twoTerms(t, 5);
    const lhs = u1 * u4 - u2 * u3;
    const k = u1 * u3 - u2 * u2;
    return [
      { text: 'Put $n = 1$ and $n = 2$ into the rule:' },
      { tex: chain(`${u3} &= ${combo([[u2, 'a'], [u1, 'b']])}`, `${u4} &= ${combo([[u3, 'a'], [u2, 'b']])}`) },
      { text: `${u1 === u2 ? `Multiply both by $${u1}$` : `Multiply the first by $${u2}$ and the second by $${u1}$`}, so both have $${coef(u1 * u2, 'b')}$, and take the first from the second:` },
      { tex: chain(`${u2 * u3} &= ${combo([[u2 * u2, 'a'], [u1 * u2, 'b']])}`, `${u1 * u4} &= ${combo([[u1 * u3, 'a'], [u1 * u2, 'b']])}`, `${lhs} &= ${coef(k, 'a')}`) },
      { text: `So $a = ${t.a}$. Then the first equation gives $b$:` },
      { tex: chain(`${u3} &= ${u2 * t.a} + ${coef(u1, 'b')}`, `b &= ${t.b}`) },
      { tex: `u_5 = ${ruleSum(t.a, t.b, u4, u3)} = ${u5}` },
    ];
  },
};

/* ---------- closed forms ---------- */

/** u_n = A p^n + B q^n, a solution of u_{n+2} = (p + q)u_{n+1} - pq u_n. */
interface Closed {
  p: number;
  q: number;
  A: number;
  B: number;
}

const ruleA = ({ p, q }: Closed) => p + q;
const ruleB = ({ p, q }: Closed) => -p * q;
const closedAt = ({ p, q, A, B }: Closed, n: number) => A * p ** n + B * q ** n;
const closedTex = ({ p, q, A, B }: Closed, e: string) => sumOf([[A, pw(p, e)], [B, pw(q, e)]]);
const closedRule = (c: Closed) => ruleTex(ruleA(c), ruleB(c));

/**
 * Roots p and q, and A and B. Easier draws keep both roots positive and A, B
 * positive; harder draws allow a negative root and a negative A or B.
 */
function sampleClosed(rng: Rng, hard: boolean, ok: (c: Closed) => boolean): Closed {
  return drawUntil(
    () => {
      const p = rng.pick([2, 3, 4]);
      const q = rng.pick((hard ? [-3, -2, -1, 2, 3, 4] : [3, 4, 5]).filter((v) => v > p || v < 0));
      const sizes = hard ? [-3, -2, -1, 1, 2, 3] : [1, 2, 3];
      // A is never -1, so the formula never opens with a bare -p^n, which reads as (-p)^n.
      return { p, q, A: rng.pick(sizes.filter((v) => v !== -1)), B: rng.pick(sizes) };
    },
    (c) => c.q !== c.p && c.p + c.q !== 0 && ok(c),
  );
}

/** `p^2 = a \times p + b`, the fact the step comes back through. */
function rootFact(root: number, a: number, b: number): string {
  return `${pw(root, '2')} = ${a === 1 ? br(root) : a === -1 ? `-${br(root)}` : `${a} \\times ${br(root)}`} ${signed(b)}`;
}

/* Lesson 2: closed forms */

interface CharParams {
  p: number;
  q: number;
  /** Written as u_{n+2} from u_{n+1}, u_n, or as u_{n+1} from u_n, u_{n-1}. */
  shifted: boolean;
  /** The characteristic equation given in the prompt (difficulty 1). */
  given: boolean;
}

function charRule({ p, q, shifted }: CharParams): string {
  const a = p + q;
  const b = -p * q;
  return shifted ? `u_{n+1} = ${combo([[a, 'u_n'], [b, 'u_{n-1}']])}` : ruleTex(a, b);
}

/** The factor `x - p` as a tile: `-3`, `+2`. */
const factorToken = (root: number) => (root > 0 ? `-${root}` : `+${-root}`);

/** The characteristic equation factorised, as tiles. */
const charTiles: Generator<CharParams> = {
  id: 'seq-l9-char-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const p = rng.int(2, hard ? 6 : 8);
        const q = hard ? rng.int(-5, -1) : rng.int(2, 8);
        return { p: Math.min(p, q), q: Math.max(p, q), shifted: rng.chance(0.5), given: !hard };
      },
      ({ p, q }) => p !== q && p + q !== 0,
    );
  },
  choices: ({ p, q }) => {
    const pair = (x: number, y: number) => `x = ${x} \\text{ or } x = ${y}`;
    const product = p * q;
    // Another pair with the same product, when there is one, else the product and 1.
    const other = [2, 3, 4, 5, 6].find((f) => product % f === 0 && f !== Math.abs(p) && f !== Math.abs(q) && f * f !== Math.abs(product));
    const alt = other === undefined ? [1, product] : [other, product / other];
    return [
      { tex: pair(p, q), correct: true },
      { tex: pair(-q, -p) },
      { tex: pair(Math.min(alt[0], alt[1]), Math.max(alt[0], alt[1])) },
      { tex: pair(p, -q) },
    ].filter((o, i, all) => all.findIndex((x) => x.tex === o.tex) === i);
  },
  render: (params): Slide => {
    const { p, q, given } = params;
    const a = p + q;
    const b = -p * q;
    const answer = [factorToken(p), factorToken(q)];
    const slips = [factorToken(-p), factorToken(-q), factorToken(a), factorToken(-a), factorToken(1), factorToken(-1)];
    return {
      kind: 'tiles',
      prompt: [
        prose('Factorise the characteristic equation of this rule, to find its roots.'),
        display(charRule(params)),
        ...(given ? [prose(`Its characteristic equation is $x^2 = ${combo([[a, 'x'], [b, '']])}$.`)] : []),
      ],
      template: '(x {0})(x {1}) = 0',
      bank: tileBank(answer, slips, 3),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const { p, q, shifted } = params;
    const a = p + q;
    const b = -p * q;
    return [
      { text: `Try $u_n = x^n$ and divide by the lowest power${shifted ? ', $x^{n-1}$' : ', $x^n$'}. The rule becomes:` },
      { tex: chain(`x^2 &= ${combo([[a, 'x'], [b, '']])}`, `${combo([[1, 'x^2'], [-a, 'x'], [-b, '']])} &= 0`, `(x ${signed(-p)})(x ${signed(-q)}) &= 0`) },
      { text: `The roots are $${p}$ and $${q}$: they multiply to $${-b}$ and add to $${a}$.` },
    ];
  },
};

interface CheckParams {
  c: Closed;
  /** The formula shown has a slip that still fits u_1. */
  wrong: boolean;
  rows: number;
}

/** The formula the table tests: the true one, or one that agrees at n = 1 only. */
function shownClosed({ c, wrong }: CheckParams): Closed {
  return wrong ? { ...c, A: c.A + c.q, B: c.B - c.p } : c;
}

/** A closed form tested against the rule: terms from the rule beside the formula's values. */
const closedCheck: Generator<CheckParams> = {
  id: 'seq-l9-closed-check',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const rows = 4;
    return drawUntil(
      () => ({ c: sampleClosed(rng, hard, () => true), wrong: hard && rng.chance(0.5), rows }),
      (params) => {
        const shown = shownClosed(params);
        return (
          shown.A !== 0 &&
          shown.B !== 0 &&
          [1, 2, 3, 4].every((n) => Math.abs(closedAt(params.c, n)) < LIMIT && Math.abs(closedAt(shown, n)) < LIMIT)
        );
      },
    );
  },
  render: (params): Slide => {
    const { c, rows } = params;
    const shown = shownClosed(params);
    const hard = params.wrong || c.q < 0 || c.A < 0 || c.B < 0;
    const answer: number[] = [];
    const slips: number[] = [];
    const cells = Array.from({ length: rows }, (_, i) => {
      const n = i + 1;
      const rule = closedAt(c, n);
      const formula = closedAt(shown, n);
      const ruleBlank = n >= 3;
      const formulaBlank = n >= 3 || (hard && n === 2);
      if (ruleBlank) {
        answer.push(rule);
        slips.push(ruleA(c) * closedAt(c, n - 1) - ruleB(c) * closedAt(c, n - 2), closedAt(c, n - 1) + closedAt(c, n - 2));
      }
      if (formulaBlank) {
        answer.push(formula);
        slips.push(shown.A * shown.p ** n - shown.B * shown.q ** n, shown.A * shown.p ** (n - 1) + shown.B * shown.q ** (n - 1));
      }
      return [`${n}`, ruleBlank ? null : `${rule}`, formulaBlank ? null : `${formula}`];
    });
    return {
      kind: 'table',
      prompt: [
        prose(`Test the claim $u_n = ${closedTex(shown, 'n')}$ for $${closedRule(c)}$, $u_1 = ${closedAt(c, 1)}$, $u_2 = ${closedAt(c, 2)}$. Fill in $u_n$ from the rule, and the claim's value beside it.`),
      ],
      columns: ['n', 'u_n', '\\text{claim}'],
      rows: cells,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { c } = params;
    const shown = shownClosed(params);
    const a = ruleA(c);
    const b = ruleB(c);
    const fits = [1, 2, 3, 4].every((n) => closedAt(c, n) === closedAt(shown, n));
    return [
      { text: 'From the rule:' },
      { tex: chain(...[3, 4].map((n) => `u_${n} &= ${ruleSum(a, b, closedAt(c, n - 1), closedAt(c, n - 2))} = ${closedAt(c, n)}`)) },
      { text: 'From the formula:' },
      { tex: chain(...[2, 3, 4].map((n) => `${closedTex(shown, `${n}`)} &= ${closedAt(shown, n)}`)) },
      {
        text: fits
          ? 'Every row agrees: the claim fits, which is evidence, and strong induction is what proves it.'
          : `The formula agrees at $n = 1$ but not at $n = 2$, where it gives $${closedAt(shown, 2)}$ rather than $${closedAt(c, 2)}$: the claim is false. One base case would have missed it.`,
      },
    ];
  },
};

interface CoeffParams {
  c: Closed;
  /** Start from u_0 and u_1 (difficulty 1) or from u_1 and u_2. */
  zero: boolean;
}

/** A and B from two starting terms, then u_3 from the closed form. */
const coeffs: Generator<CoeffParams> = {
  id: 'seq-l9-coeffs',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { c: sampleClosed(rng, hard, (c) => Math.abs(closedAt(c, 3)) < LIMIT && c.A !== c.B), zero: !hard };
  },
  render: ({ c, zero }): Slide => {
    const s = zero ? 0 : 1;
    const answer = [c.A, c.B, closedAt(c, 3)];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `The rule $${closedRule(c)}$ has characteristic roots $${c.p}$ and $${c.q}$. With $u_${s} = ${closedAt(c, s)}$ and $u_${s + 1} = ${closedAt(c, s + 1)}$, find $A$, then $B$, then $u_3$.`,
        ),
      ],
      expression: `u_n = A \\times ${pw(c.p, 'n')} + B \\times ${pw(c.q, 'n')}`,
      nodes: [
        { id: 'A', from: [] },
        { id: 'B', from: ['A'] },
        { id: 'u3', from: ['A', 'B'] },
      ],
      bank: numberBank(answer, [c.B, c.A, -c.A, -c.B, c.B * c.p ** 3 + c.A * c.q ** 3, closedAt(c, 2)]),
      answer: answer.map(String),
    };
  },
  solution: ({ c, zero }) => {
    const { p, q, A, B } = c;
    const s = zero ? 0 : 1;
    const u = closedAt(c, s);
    const v = closedAt(c, s + 1);
    const first = zero ? 'A + B' : combo([[p, 'A'], [q, 'B']]);
    const second = zero ? combo([[p, 'A'], [q, 'B']]) : combo([[p * p, 'A'], [q * q, 'B']]);
    const scaled = zero ? combo([[q, 'A'], [q, 'B']]) : combo([[p * q, 'A'], [q * q, 'B']]);
    const k = zero ? p - q : p * p - p * q;
    return [
      { text: `Put $n = ${s}$ and $n = ${s + 1}$ into the formula:` },
      { tex: chain(`${first} &= ${u}`, `${second} &= ${v}`) },
      { text: `Multiply the first by $${q}$ and take it from the second, so $B$ goes:` },
      { tex: chain(`${scaled} &= ${q * u}`, `${coef(k, 'A')} &= ${v - q * u}`, `A &= ${A}`) },
      { text: `Then the first equation gives $B = ${B}$.` },
      { tex: `u_3 = ${closedTex(c, '3')} = ${closedAt(c, 3)}` },
    ];
  },
};

interface TermParams {
  c: Closed;
  n: number;
}

/** A far term from the closed form, typed. */
const closedTerm: Generator<TermParams> = {
  id: 'seq-l9-closed-term',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => ({ c: sampleClosed(rng, hard, () => true), n: rng.int(hard ? 5 : 4, hard ? 8 : 6) }),
      ({ c, n }) => Math.abs(closedAt(c, n)) < 20000 && closedAt(c, n) !== 0,
    );
  },
  choices: ({ c, n }) =>
    numberOptions(closedAt(c, n), [
      closedAt(c, n - 1),
      c.A * c.p ** n - c.B * c.q ** n,
      closedAt(c, n + 1),
      (c.A + c.B) * c.p ** n,
    ]),
  render: ({ c, n }): Slide =>
    typed(
      [prose(`The sequence $${closedRule(c)}$ has closed form $u_n = ${closedTex(c, 'n')}$. Find $u_${n}$ from the formula.`)],
      `u_${n} =`,
      closedAt(c, n),
    ),
  solution: ({ c, n }) => [
    { text: `Put $n = ${n}$ into the formula: $${pw(c.p, `${n}`)} = ${c.p ** n}$ and $${pw(c.q, `${n}`)} = ${c.q ** n}$.` },
    { tex: chain(`u_${n} &= ${closedTex(c, `${n}`)}`, `&= ${sumOf([[c.A, br(c.p ** n)], [c.B, br(c.q ** n)]])}`, `&= ${closedAt(c, n)}`) },
  ],
};

/* Lesson 3: strong induction */

interface FlowParams {
  order: number;
  start: number;
  rule: StartsParams;
}

/** The labels a base-case fork offers, one per count, from the first index. */
function baseLabel(start: number, count: number): string {
  const ns = Array.from({ length: count }, (_, i) => start + i);
  if (count === 1) return `$n = ${ns[0]}$ only`;
  if (count === 2) return `$n = ${ns[0]}$ and $n = ${ns[1]}$`;
  return `$n = ${ns[0]}$, $${ns[1]}$ and $${ns[2]}$`;
}

const ASSUME_LABEL = ['$n = k$ only', '$n = k - 1$ and $n = k$', '$n = k - 2$, $k - 1$ and $k$'];

/** Which base cases, then which assumption, for rules one, two or three back. */
const baseFlow: Generator<FlowParams> = {
  id: 'seq-l9-base-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick<StartsForm>(hard ? ['skip', 'three', 'gap', 'two', 'one'] : ['one', 'two', 'two', 'back']);
    const c = rng.int(1, 5);
    const d = form === 'one' || form === 'skip' ? rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) : rng.int(1, 4);
    const rule = { form, c: form === 'one' || form === 'skip' ? c + 1 : c, d };
    return { order: STARTS_ORDER[form], start: form === 'back' ? 1 : rng.int(0, 1), rule };
  },
  render: ({ order, start, rule }): Slide => {
    const salt = mix(startsRule(rule), start);
    const baseAnswer = baseLabel(start, order);
    const assumeRight = ASSUME_LABEL[order - 1];
    const baseBranches = [1, 2, 3].map((count) =>
      count === order
        ? { label: baseLabel(start, count), to: 'assume' }
        : {
            label: baseLabel(start, count),
            outcome:
              count < order
                ? `Too few. The step reaches back ${order} terms, so the first ${order} values have nothing to step back from: each needs a base case of its own.`
                : `More than needed: the step reaches back ${order === 1 ? 'one term' : `${order} terms`}, so ${order === 1 ? 'one base case starts' : `${order} base cases start`} it.`,
          },
    );
    const assumeBranches = [
      ...[1, 2, 3].map((count) =>
        count === order
          ? { label: ASSUME_LABEL[count - 1], outcome: 'Right: the step uses exactly those terms to make $u_{k+1}$.' }
          : {
              label: ASSUME_LABEL[count - 1],
              outcome:
                count < order
                  ? `Not enough: making $u_{k+1}$ uses the ${order} terms before it, so the claim must be assumed for each of them.`
                  : `More than the rule uses: $u_{k+1}$ is made from the ${order === 1 ? 'one term' : `${order} terms`} before it.`,
            },
      ),
      { label: '$n = k + 1$', outcome: 'That assumes what the step has to show.' },
    ];
    return {
      kind: 'flow',
      prompt: [prose(`The sequence starts at $u_${start}$. To prove a formula for $u_n$ by induction, plan the proof.`)],
      subject: startsRule(rule),
      steps: [
        { id: 'base', ask: 'Which base cases are needed?', branches: turned(baseBranches, salt) },
        { id: 'assume', ask: 'To show the claim at $n = k + 1$, what does the step assume?', branches: turned(assumeBranches, salt + 1) },
      ],
      answer: [baseAnswer, assumeRight],
    };
  },
  solution: ({ order, start, rule }) => [
    { text: startsWhy(rule) },
    { text: `So the proof checks ${baseRight(start, order)}, and the step assumes the claim at ${ASSUME_LABEL[order - 1].replace(' only', '')} to reach $n = k + 1$.` },
  ],
};

function baseRight(start: number, order: number): string {
  return baseLabel(start, order).replace(' only', '');
}

interface StepCheckParams {
  c: Closed;
  k: number;
}

/** The step in numbers: the formula at k - 1 and k, then the rule's u_{k+1}. */
const stepCheck: Generator<StepCheckParams> = {
  id: 'seq-l9-step-check',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => ({ c: sampleClosed(rng, hard, () => true), k: rng.int(2, hard ? 5 : 4) }),
      ({ c, k }) => [k - 1, k, k + 1].every((n) => Math.abs(closedAt(c, n)) < LIMIT) && closedAt(c, k - 1) !== closedAt(c, k),
    );
  },
  render: ({ c, k }): Slide => {
    const a = ruleA(c);
    const b = ruleB(c);
    const before = closedAt(c, k - 1);
    const at = closedAt(c, k);
    const answer = [before, at, closedAt(c, k + 1)];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `The claim is $u_n = ${closedTex(c, 'n')}$, and the rule is $u_{n+1} = ${combo([[a, 'u_n'], [b, 'u_{n-1}']])}$. Check the step at $k = ${k}$: the formula at $n = ${k - 1}$, at $n = ${k}$, then $u_{${k + 1}}$ from the rule.`,
        ),
      ],
      expression: `u_{${k + 1}} = ${combo([[a, `u_${k}`], [b, `u_${k - 1}`]])}`,
      nodes: [
        { id: 'before', from: [] },
        { id: 'at', from: [] },
        { id: 'next', from: ['before', 'at'] },
      ],
      bank: numberBank(answer, [a * at - b * before, a * before + b * at, closedAt(c, k - 2), (a + b) * at]),
      answer: answer.map(String),
    };
  },
  solution: ({ c, k }) => {
    const a = ruleA(c);
    const b = ruleB(c);
    return [
      { tex: chain(`u_${k - 1} &= ${closedTex(c, `${k - 1}`)} = ${closedAt(c, k - 1)}`, `u_${k} &= ${closedTex(c, `${k}`)} = ${closedAt(c, k)}`) },
      { text: 'The rule makes the next term from those two:' },
      { tex: chain(`u_{${k + 1}} &= ${ruleSum(a, b, closedAt(c, k), closedAt(c, k - 1))}`, `&= ${closedAt(c, k + 1)}`) },
      { text: `And the formula at $n = ${k + 1}$ gives $${closedAt(c, k + 1)}$ too: the step agrees with the claim.` },
    ];
  },
};

type MissingFlaw = 'base' | 'single' | 'next' | 'none';

const MISSING_FLAWS: MissingFlaw[] = ['base', 'single', 'next', 'none'];

const MISSING_LABEL: Record<MissingFlaw, string> = {
  base: 'A base case is missing',
  single: 'The step uses a case it never assumed',
  next: 'The step assumes what it has to prove',
  none: 'Nothing: the proof is sound',
};

interface MissingParams {
  c: Closed;
  flaw: MissingFlaw;
  /** For a missing base case: the one that was checked. */
  only: number;
}

/** The step's working as line 3 of the proof: the rule, the root facts on a line of their own, the result. */
function stepBlocks(c: Closed): Block[] {
  const a = ruleA(c);
  const b = ruleB(c);
  return [
    prose(`3. Then $u_{k+1} = ${ruleK(a, b)}$. Put in the formula for $u_k$ and $u_{k-1}$, and use`),
    display(`${rootFact(c.p, a, b)} \\qquad ${rootFact(c.q, a, b)}`),
    prose(`to collect the powers into $u_{k+1} = ${closedTex(c, 'k+1')}$.`),
  ];
}

/** Lines 1, 2 and 4 of the proof; line 3 is `stepBlocks`. */
function missingLines({ c, flaw, only }: MissingParams): string[] {
  const u1 = closedAt(c, 1);
  const u2 = closedAt(c, 2);
  const base =
    flaw === 'base'
      ? `Base case: $u_${only} = ${only === 1 ? u1 : u2}$, and the formula gives $${only === 1 ? u1 : u2}$ at $n = ${only}$.`
      : `Base cases: $u_1 = ${u1}$ and $u_2 = ${u2}$, and the formula gives $${u1}$ and $${u2}$ at $n = 1$ and $n = 2$.`;
  const assume =
    flaw === 'single'
      ? 'Assume the formula holds at $n = k$, for some $k \\ge 1$.'
      : flaw === 'next'
        ? `Assume $u_{k+1} = ${closedTex(c, 'k+1')}$, for some $k \\ge 1$.`
        : 'Assume the formula holds at $n = k - 1$ and at $n = k$, for some $k \\ge 2$.';
  return [base, assume, 'So the formula holds for every $n \\ge 1$.'];
}

/** A written strong-induction proof to read: what, if anything, is wrong. */
const missingBase: Generator<MissingParams> = {
  id: 'seq-l9-missing-base',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const flaw = rng.pick(hard ? MISSING_FLAWS : (['base', 'base', 'single', 'none'] as MissingFlaw[]));
    return {
      c: sampleClosed(rng, hard, (c) => Math.abs(closedAt(c, 2)) < LIMIT),
      flaw,
      only: rng.int(1, 2),
    };
  },
  render: (params): Slide => {
    const { c, flaw } = params;
    const [base, assume, conclusion] = missingLines(params);
    const labels = [MISSING_LABEL[flaw], ...MISSING_FLAWS.filter((other) => other !== flaw).map((other) => MISSING_LABEL[other])];
    return {
      kind: 'choice',
      prompt: [
        prose(`A sequence has $u_1 = ${closedAt(c, 1)}$, $u_2 = ${closedAt(c, 2)}$ and`),
        display(closedRule(c)),
        prose('Here is a proof that'),
        display(`u_n = ${closedTex(c, 'n')}`),
        prose(`1. ${base}`),
        prose(`2. ${assume}`),
        ...stepBlocks(c),
        prose(`4. ${conclusion}`),
        prose('What, if anything, is wrong with it?'),
      ],
      ...nativeChoice(labels, mix(closedTex(c, 'n'), flaw, params.only), false),
    };
  },
  solution: ({ c, flaw, only }) => {
    if (flaw === 'base') {
      return [
        { text: `Only $n = ${only}$ is checked. The step builds each case from the two before it, so it needs two to start from: $n = 1$ and $n = 2$ must both be checked.` },
        { text: `Here the formula does give $u_${3 - only} = ${closedAt(c, 3 - only)}$, but the proof never shows it.` },
      ];
    }
    if (flaw === 'single') {
      return [{ text: 'Line 3 uses the formula for $u_{k-1}$ as well as $u_k$, but line 2 only assumed it at $n = k$. For a rule two back, assume it at $n = k - 1$ and $n = k$.' }];
    }
    if (flaw === 'next') {
      return [{ text: 'Line 2 assumes the formula for $u_{k+1}$, which is what the step has to show. It should assume it at $n = k - 1$ and $n = k$.' }];
    }
    return [{ text: 'Every line is right: two base cases, an assumption at $n = k - 1$ and $n = k$, and a step that comes back to the formula at $n = k + 1$.' }];
  },
};

interface StrongOrderParams {
  c: Closed;
  picks: number[];
}

/** A closed form of a two-back rule, proved by strong induction. */
function strongProof(c: Closed): Proof {
  const a = ruleA(c);
  const b = ruleB(c);
  const u1 = closedAt(c, 1);
  const u2 = closedAt(c, 2);
  const aPart = a === 1 ? '' : a === -1 ? '-' : `${a}`;
  const bPart = b < 0 ? `- ${b === -1 ? '' : -b}` : `+ ${b === 1 ? '' : b}`;
  const grouped = (root: number) => `${pw(root, 'k-1')}(${a === 1 ? br(root) : a === -1 ? `-${br(root)}` : `${a} \\times ${br(root)}`} ${signed(b)})`;
  const collected = sumOf([
    [c.A, grouped(c.p)],
    [c.B, grouped(c.q)],
  ]);
  return {
    claim: `Prove that $u_n = ${closedTex(c, 'n')}$ for every $n \\ge 1$, where $${closedRule(c)}$, $u_1 = ${u1}$ and $u_2 = ${u2}$.`,
    steps: [
      `Base cases: $u_1 = ${u1}$ and $u_2 = ${u2}$, and the formula gives $${u1}$ at $n = 1$ and $${u2}$ at $n = 2$.`,
      'Assume the formula holds at $n = k - 1$ and at $n = k$, for some $k \\ge 2$.',
      `Then $u_{k+1} = ${ruleK(a, b)}$, which is $${aPart}(${closedTex(c, 'k')}) ${bPart}(${closedTex(c, 'k-1')})$.`,
      `Collect each power: that is $${collected}$.`,
      `Since $${rootFact(c.p, a, b)}$ and $${rootFact(c.q, a, b)}$, that is $${closedTex(c, 'k+1')}$, the formula at $n = k + 1$.`,
      'It holds at $n = 1$ and $n = 2$, and whenever it holds at two neighbouring values it holds at the next: so it holds for every $n \\ge 1$.',
    ],
    pool: [
      { text: 'Assume the formula holds at $n = k$, for some $k \\ge 1$.', why: 'The step uses $u_{k-1}$ too, so the formula must be assumed at $n = k - 1$ as well.' },
      { text: `Assume $u_{k+1} = ${closedTex(c, 'k+1')}$ for some $k \\ge 1$.`, why: 'That assumes what the step has to show.' },
      { text: `Base case: $u_1 = ${u1}$, and the formula gives $${u1}$ at $n = 1$.`, why: 'One base case is not enough: the step needs two cases to build on.' },
      {
        text: `It also works for $u_3 = ${closedAt(c, 3)}$ and $u_4 = ${closedAt(c, 4)}$, so it holds for every $n$.`,
        why: 'Checking more values is not a proof.',
      },
    ],
  };
}

const orderStrong: Generator<StrongOrderParams> = {
  id: 'seq-l9-order-strong',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const c = sampleClosed(rng, hard, (x) => Math.abs(closedAt(x, 4)) < LIMIT && (hard || (x.A <= 2 && x.B <= 2 && x.q <= 4)));
    return { c, picks: pickDistractors(rng, strongProof(c), difficulty) };
  },
  render: ({ c, picks }) => orderSlide(strongProof(c), picks),
  solution: ({ c, picks }) => orderSolution(strongProof(c), picks),
};

/* Lesson 4: Fibonacci */

/** F_0 = 0, F_1 = F_2 = 1, up to F_22. */
const FIB: number[] = (() => {
  const out = [0, 1];
  while (out.length < 23) out.push(out[out.length - 1] + out[out.length - 2]);
  return out;
})();

/** F_1 + ... + F_n. */
const fibSumTo = (n: number) => FIB[n + 2] - 1;

interface FibTableParams {
  s: number;
  fBlank: number;
  sBlanks: number[];
}

/** Fibonacci numbers and their running totals, the totals one less than a term two on. */
const fibTable: Generator<FibTableParams> = {
  id: 'seq-l9-fib-table',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { s: rng.int(4, 10), fBlank: rng.int(2, 4), sBlanks: [0, ...positions(rng, 1, 4, 2)] }
      : { s: rng.int(1, 7), fBlank: rng.int(2, 4), sBlanks: positions(rng, 1, 4, 2) },
  render: ({ s, fBlank, sBlanks }): Slide => {
    const answer: number[] = [];
    const slips: number[] = [];
    const rows = [0, 1, 2, 3, 4].map((i) => {
      const n = s + i;
      if (i === fBlank) {
        answer.push(FIB[n]);
        slips.push(FIB[n + 1], FIB[n - 1] * 2);
      }
      if (sBlanks.includes(i)) {
        answer.push(fibSumTo(n));
        slips.push(FIB[n + 2], FIB[n + 1] - 1, fibSumTo(n) + FIB[n + 1] - FIB[n]);
      }
      return [`${n}`, i === fBlank ? null : `${FIB[n]}`, sBlanks.includes(i) ? null : `${fibSumTo(n)}`];
    });
    return {
      kind: 'table',
      prompt: [
        prose(
          sBlanks.includes(0)
            ? `$F_n$ is the $n$th Fibonacci number and $S_n = F_1 + \\dots + F_n$. Use $S_n = F_{n+2} - 1$ for the first total; after that, each total is the one above plus the next term.`
            : `$F_n$ is the $n$th Fibonacci number and $S_n = F_1 + \\dots + F_n$. Fill in the table: each total is the one above plus the next term.`,
        ),
      ],
      columns: ['n', 'F_n', 'S_n'],
      rows,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ s, sBlanks }) => {
    const ns = [1, 2, 3, 4].map((i) => s + i);
    return [
      { text: 'Each Fibonacci number is the two above it added.' },
      ...(sBlanks.includes(0) ? [{ text: `The first total: $S_{${s}} = F_{${s + 2}} - 1 = ${FIB[s + 2]} - 1 = ${fibSumTo(s)}$.` }] : []),
      { text: 'Then each total is the one above plus the next term:' },
      { tex: chain(...ns.map((n) => `S_{${n}} &= ${fibSumTo(n - 1)} + ${FIB[n]} = ${fibSumTo(n)}`)) },
      { text: `And each total is one less than the Fibonacci number two on: $S_{${s + 4}} = ${FIB[s + 6]} - 1$.` },
    ];
  },
};

interface FibSumParams {
  m: number;
  n: number;
  /** Find n from the total, rather than the total. */
  which: boolean;
}

const fibSumValue = ({ m, n }: FibSumParams) => FIB[n + 2] - FIB[m + 1];

/** A Fibonacci sum from the identity, or which n gives a total. */
const fibSum: Generator<FibSumParams> = {
  id: 'seq-l9-fib-sum',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const m = rng.int(3, 7);
      return { m, n: rng.int(m + 3, 17), which: false };
    }
    return { m: 1, n: rng.int(4, 18), which: rng.chance(0.5) };
  },
  choices: (params) => {
    const { m, n, which } = params;
    if (which) return numberOptions(n, [n + 2, n + 1, n - 1]);
    return numberOptions(fibSumValue(params), m === 1 ? [FIB[n + 2], FIB[n + 1] - 1, FIB[n + 1]] : [FIB[n + 2] - FIB[m], FIB[n + 2] - 1, FIB[n + 1] - FIB[m + 1]]);
  },
  render: (params): Slide => {
    const { m, n, which } = params;
    if (which) {
      return typed(
        [
          prose(`Use $F_1 + F_2 + \\dots + F_n = F_{n+2} - 1$ and $F_{${n + 2}} = ${FIB[n + 2]}$. Which $n$ gives`),
          display(`F_1 + F_2 + \\dots + F_n = ${fibSumTo(n)}`),
        ],
        'n =',
        n,
      );
    }
    const given = m === 1 ? `$F_{${n + 2}} = ${FIB[n + 2]}$` : `$F_{${n + 2}} = ${FIB[n + 2]}$ and $F_{${m + 1}} = ${FIB[m + 1]}$`;
    return typed(
      [
        prose(`Use $F_1 + F_2 + \\dots + F_n = F_{n+2} - 1$, with ${given}. Find`),
        display(m === 1 ? `F_1 + F_2 + \\dots + F_{${n}}` : `F_{${m}} + F_{${m + 1}} + \\dots + F_{${n}}`),
      ],
      '\\text{sum} =',
      fibSumValue(params),
    );
  },
  solution: (params) => {
    const { m, n, which } = params;
    if (which) {
      return [
        { text: `The total is $F_{n+2} - 1$, and $${fibSumTo(n)} + 1 = ${FIB[n + 2]} = F_{${n + 2}}$.` },
        { text: `So $n + 2 = ${n + 2}$, and $n = ${n}$.` },
      ];
    }
    if (m === 1) return [{ tex: `F_{${n + 2}} - 1 = ${FIB[n + 2]} - 1 = ${fibSumTo(n)}` }];
    return [
      { text: `Take the first $${m - 1}$ terms away from the first $${n}$:` },
      {
        tex: chain(
          `&(F_{${n + 2}} - 1) - (F_{${m + 1}} - 1)`,
          `&= F_{${n + 2}} - F_{${m + 1}}`,
          `&= ${FIB[n + 2]} - ${FIB[m + 1]} = ${fibSumValue(params)}`,
        ),
      },
    ];
  },
};

interface FibEvenParams {
  indices: number[];
  /** Pick the even one, or the odd one. */
  odd: boolean;
}

/** Which Fibonacci number is even (or odd): every third term is even. */
const fibEven: Generator<FibEvenParams> = {
  id: 'seq-l9-fib-even',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const odd = hard && rng.chance(0.5);
    const lo = hard ? 20 : 8;
    const hi = hard ? 99 : 40;
    const all = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const threes = all.filter((i) => i % 3 === 0);
    const others = all.filter((i) => i % 3 !== 0);
    // The answer first, then three of the other kind.
    return odd
      ? { indices: [rng.pick(others), ...rng.sample(threes, 3)], odd }
      : { indices: [rng.pick(threes), ...rng.sample(others, 3)], odd };
  },
  render: ({ indices, odd }): Slide => ({
    kind: 'choice',
    prompt: [prose(`$F_n$ is the $n$th Fibonacci number. Which of these is ${odd ? 'odd' : 'even'}?`)],
    ...nativeChoice(
      indices.map((i) => `F_{${i}}`),
      mix(...indices),
    ),
  }),
  solution: ({ indices, odd }) => [
    { text: 'The terms run odd, odd, even, and repeat: $F_n$ is even exactly when $n$ is a multiple of $3$.' },
    {
      text: odd
        ? `$${indices.slice(1).join('$, $')}$ are multiples of $3$, and $${indices[0]}$ is not: $F_{${indices[0]}}$ is the odd one.`
        : `$${indices[0]} = 3 \\times ${indices[0] / 3}$, and none of $${indices.slice(1).join('$, $')}$ is a multiple of $3$: $F_{${indices[0]}}$ is even.`,
    },
  ],
};

interface BoundParams {
  a: number;
  b: number;
  c: number;
  u1: number;
  u2: number;
  picks: number[];
}

/** u_n < c^n for a two-back rule with positive a, b and ac + b at most c^2. */
function boundProof({ a, b, c, u1, u2 }: BoundParams): Proof {
  const top = a * c + b;
  const rule = `u_{n+2} = ${combo([[a, 'u_{n+1}'], [b, 'u_n']])}`;
  return {
    claim: `The sequence $${rule}$ has $u_1 = ${u1}$ and $u_2 = ${u2}$. Prove that $u_n < ${c}^n$ for every $n \\ge 1$.`,
    steps: [
      `Base cases: $u_1 = ${u1} < ${c}$ and $u_2 = ${u2} < ${c * c}$.`,
      `Assume $u_{k-1} < ${pw(c, 'k-1')}$ and $u_k < ${pw(c, 'k')}$, for some $k \\ge 2$.`,
      `Then $u_{k+1} = ${ruleK(a, b)} < ${sumOf([[a, pw(c, 'k')], [b, pw(c, 'k-1')]])}$.`,
      `That is $${pw(c, 'k-1')}(${a === 1 ? c : `${a} \\times ${c}`} + ${b}) = ${top} \\times ${pw(c, 'k-1')}$.`,
      `And $${top} \\le ${c * c}$, so $u_{k+1} < ${c * c} \\times ${pw(c, 'k-1')} = ${pw(c, 'k+1')}$.`,
      'It holds at $n = 1$ and $n = 2$, and whenever it holds at two neighbouring values it holds at the next: so it holds for every $n \\ge 1$.',
    ],
    pool: [
      { text: `Assume $u_k < ${pw(c, 'k')}$ only, for some $k \\ge 1$.`, why: 'The step uses $u_{k-1}$ too, so it must be assumed at $n = k - 1$ as well.' },
      { text: `Assume $u_{k+1} < ${pw(c, 'k+1')}$ for some $k \\ge 1$.`, why: 'That assumes what the step has to show.' },
      { text: `Base case: $u_1 = ${u1} < ${c}$.`, why: 'One base case is not enough: the step builds on two.' },
      { text: `It also holds for $u_3$ and $u_4$, so it holds for every $n$.`, why: 'Checking more values is not a proof.' },
    ],
  };
}

const orderBound: Generator<BoundParams> = {
  id: 'seq-l9-order-bound',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const base = drawUntil(
      () => {
        const c = hard ? rng.int(2, 4) : rng.int(2, 3);
        const a = hard ? rng.int(1, 3) : 1;
        const b = hard ? rng.int(1, 4) : 1;
        return { a, b, c, u1: rng.int(1, c - 1), u2: rng.int(1, c * c - 1), picks: [] as number[] };
      },
      ({ a, b, c }) => a * c + b <= c * c && (!hard || a + b > 2),
    );
    return { ...base, picks: pickDistractors(rng, boundProof(base), difficulty) };
  },
  render: (params) => orderSlide(boundProof(params), params.picks),
  solution: (params) => orderSolution(boundProof(params), params.picks),
};

/* Lesson 5: building every amount */

/** Stamp pairs with no common factor, smaller first. */
const EASY_PAIRS: [number, number][] = [
  [2, 5], [2, 7], [2, 9], [2, 11], [3, 4], [3, 5], [3, 7], [3, 8], [3, 10], [3, 11], [4, 5], [4, 7], [4, 9], [4, 11], [5, 6],
];
const HARD_PAIRS: [number, number][] = [
  [5, 7], [5, 8], [5, 9], [5, 11], [5, 12], [6, 7], [6, 11], [7, 8], [7, 9], [7, 10], [4, 13], [3, 13], [3, 14], [8, 9],
];
/** Pairs whose smaller stamp is 3 or 4, for the proofs: three or four base cases. */
const PROOF_PAIRS: [number, number][] = [
  [3, 4], [3, 5], [3, 7], [3, 8], [3, 10], [3, 11], [4, 5], [4, 7], [4, 9],
];

/** The largest amount that cannot be made from a and b. */
const frob = (a: number, b: number) => a * b - a - b;

/** How n is made: the most b stamps that still leave a multiple of a. */
function makeUp(n: number, a: number, b: number): [number, number] | undefined {
  for (let y = Math.floor(n / b); y >= 0; y -= 1) {
    if ((n - b * y) % a === 0) return [(n - b * y) / a, y];
  }
  return undefined;
}

/** `13 = 2 \times 4 + 5`. */
function makeTex(n: number, a: number, b: number): string {
  const [x, y] = makeUp(n, a, b) ?? [0, 0];
  const part = (count: number, size: number) => (count === 0 ? [] : [count === 1 ? `${size}` : `${count} \\times ${size}`]);
  return `${n} = ${[...part(x, a), ...part(y, b)].join(' + ')}`;
}

interface StampTableParams {
  a: number;
  b: number;
  start: number;
  blanks: number[];
}

/** How each amount is made, below ab where there is one way only. */
const stampTable: Generator<StampTableParams> = {
  id: 'seq-l9-stamp-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [a, b] = drawUntil(() => rng.pick(hard ? [...HARD_PAIRS, [4, 7], [4, 9]] as [number, number][] : EASY_PAIRS), ([x, y]) => frob(x, y) + 6 <= x * y && x > 2);
    const start = rng.int(frob(a, b) + 1, a * b - 5);
    return { a, b, start, blanks: positions(rng, 0, 9, hard ? 6 : 4) };
  },
  render: ({ a, b, start, blanks }): Slide => {
    const answer: number[] = [];
    const slips: number[] = [];
    const rows = [0, 1, 2, 3, 4].map((i) => {
      const n = start + i;
      const [x, y] = makeUp(n, a, b) ?? [0, 0];
      const cells: (string | null)[] = [`${n}`];
      [x, y].forEach((count, j) => {
        if (blanks.includes(2 * i + j)) {
          answer.push(count);
          slips.push(count + 1, count - 1);
          cells.push(null);
        } else cells.push(`${count}`);
      });
      return cells;
    });
    return {
      kind: 'table',
      prompt: [prose(`Each amount below can be made in exactly one way from ${a}p and ${b}p stamps. Fill in how many of each.`)],
      columns: ['n', `${a}\\text{p}`, `${b}\\text{p}`],
      rows,
      bank: numberBank(answer, [...slips.filter((v) => v >= 0), Math.max(...answer) + 1, Math.max(...answer) + 2]),
      answer: answer.map(String),
    };
  },
  solution: ({ a, b, start }) => [
    { text: `Try the most ${b}p stamps first, and see whether what is left is a multiple of $${a}$:` },
    { tex: chain(...[0, 1, 2, 3, 4].map((i) => makeTex(start + i, a, b).replace(' = ', ' &= '))) },
  ],
};

type Context = 'stamps' | 'points' | 'packs';

interface FrobParams {
  a: number;
  b: number;
  context: Context;
}

function frobPrompt({ a, b, context }: FrobParams): string {
  switch (context) {
    case 'stamps':
      return `Postage is paid with ${a}p and ${b}p stamps only. What is the largest amount, in pence, that cannot be made?`;
    case 'points':
      return `A game scores ${a} or ${b} points a go. What is the largest total that can never be scored?`;
    case 'packs':
      return `Pencils come in packs of ${a} and packs of ${b}. What is the largest number of pencils that cannot be bought exactly?`;
  }
}

/** The largest amount two coprime sizes cannot make, ab - a - b. */
const frobenius: Generator<FrobParams> = {
  id: 'seq-l9-frobenius',
  sample: (rng, difficulty) => {
    const [a, b] = rng.pick(difficulty > 1 ? HARD_PAIRS : EASY_PAIRS);
    return { a, b, context: rng.pick<Context>(['stamps', 'points', 'packs']) };
  },
  choices: ({ a, b }) => numberOptions(frob(a, b), [a * b - a, a * b - b, a * b, frob(a, b) - 1, frob(a, b) + a]),
  render: (params): Slide => typed([prose(frobPrompt(params))], '\\text{largest} =', frob(params.a, params.b)),
  solution: ({ a, b }) => {
    const f = frob(a, b);
    return [
      { text: `For two sizes with no common factor, the largest that cannot be made is $ab - a - b$:` },
      { tex: `${a} \\times ${b} - ${a} - ${b} = ${f}` },
      { text: `Check: the next $${a}$ amounts can all be made, and adding $${a}$ to them reaches every amount after.` },
      { tex: chain(...Array.from({ length: a }, (_, i) => makeTex(f + 1 + i, a, b).replace(' = ', ' &= '))) },
    ];
  },
};

interface BaseCountParams {
  a: number;
  b: number;
  N: number;
  /** Step back by the larger stamp. */
  byBig: boolean;
}

/** `$8, 9, 10$`. */
const run = (from: number, count: number) => `$${Array.from({ length: count }, (_, i) => from + i).join(', ')}$`;

/** How many base cases, and which, for a step back by one stamp. */
const baseCount: Generator<BaseCountParams> = {
  id: 'seq-l9-base-count',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [a, b] = rng.pick(hard ? PROOF_PAIRS.filter(([, y]) => y <= 7) : PROOF_PAIRS);
    return { a, b, N: frob(a, b) + 1 + rng.int(0, 2), byBig: hard && rng.chance(0.5) };
  },
  render: ({ a, b, N, byBig }): Slide => {
    const s = byBig ? b : a;
    const salt = mix(a, b, N, s);
    const countRight = `$${s}$`;
    const listRight = run(N, s);
    const counts = [s, 1, byBig ? a : b].map((count) =>
      count === s
        ? { label: `$${count}$`, to: 'which' }
        : {
            label: `$${count}$`,
            outcome:
              count < s
                ? `Too few. The step makes $k + 1$ from $k + 1 - ${s}$, so the first $${s}$ amounts from $${N}$ have nothing at least $${N}$ to step back to: each needs checking.`
                : `That many would work, but the step only reaches back $${s}$, so $${s}$ base cases are enough.`,
          },
    );
    const lists = [
      { label: listRight, outcome: 'Right: those are the amounts the step cannot reach from anything smaller in the claim.' },
      { label: run(N + 1, s), outcome: `That leaves $${N}$ itself unchecked, and nothing smaller in the claim builds it.` },
      { label: run(N - 1, s), outcome: `The claim starts at $${N}$, so the base cases start there too.` },
    ];
    return {
      kind: 'flow',
      prompt: [
        prose(`Claim: every amount of at least ${N}p can be made from ${a}p and ${b}p stamps. The step makes $k + 1$ by adding one ${s}p stamp to $k + 1 - ${s}$.`),
      ],
      subject: `n \\ge ${N}`,
      steps: [
        { id: 'count', ask: 'How many base cases does the proof need, at the fewest?', branches: turned(counts, salt) },
        { id: 'which', ask: 'Which amounts are they?', branches: turned(lists, salt + 1) },
      ],
      answer: [countRight, listRight],
    };
  },
  solution: ({ a, b, N, byBig }) => {
    const s = byBig ? b : a;
    return [
      { text: `The step reaches back $${s}$, so it needs $${s}$ amounts in a row to start from: ${run(N, s)}.` },
      { text: `From $${N + s}$ on, $k + 1 - ${s}$ is at least $${N}$, so the assumption covers it.` },
      { tex: chain(...Array.from({ length: s }, (_, i) => makeTex(N + i, a, b).replace(' = ', ' &= '))) },
    ];
  },
};

interface StampOrderParams {
  a: number;
  b: number;
  N: number;
  picks: number[];
}

/** Every amount from N on, by strong induction stepping back by the smaller stamp. */
function stampProof({ a, b, N }: StampOrderParams): Proof {
  const bases = Array.from({ length: a }, (_, i) => `$${makeTex(N + i, a, b)}$`);
  const listed = `${bases.slice(0, -1).join(', ')} and ${bases[a - 1]}`;
  return {
    claim: `Prove that every amount of at least ${N}p can be made from ${a}p and ${b}p stamps.`,
    steps: [
      `Base cases: ${listed}.`,
      `Assume every amount from $${N}$ up to $k$ can be made, for some $k \\ge ${N + a - 1}$.`,
      `Then $k + 1 - ${a} = k - ${a - 1}$ is at least $${N}$ and at most $k$, so it can be made.`,
      `Adding one ${a}p stamp to it makes $k + 1$.`,
      `The base cases start it, and each amount follows from the one ${a}p smaller: so every amount of at least ${N}p can be made.`,
    ],
    pool: [
      { text: `Assume only that $k$ can be made, for some $k \\ge ${N}$.`, why: `The step needs $k - ${a - 1}$, not $k$, so every amount up to $k$ must be assumed.` },
      { text: `Base case: $${makeTex(N, a, b)}$.`, why: `One base case is not enough: the step reaches back $${a}$, so $${a}$ amounts in a row are needed.` },
      {
        text: `Then $k + 1 - ${b} = k - ${b - 1}$ is at least $${N}$ and at most $k$, so it can be made.`,
        why: `Not with $k$ as low as $${N + a - 1}$: then $k - ${b - 1}$ is below $${N}$. Stepping back by ${b}p would need $${b}$ base cases.`,
      },
      { text: `Every amount from ${N}p to 60p has been checked, so every amount can be made.`, why: 'Checking values, however many, is not a proof.' },
    ],
  };
}

const orderStamps: Generator<StampOrderParams> = {
  id: 'seq-l9-order-stamps',
  sample: (rng, difficulty) => {
    const [a, b] = rng.pick(difficulty > 1 ? PROOF_PAIRS : PROOF_PAIRS.filter(([x]) => x === 3));
    const base = { a, b, N: frob(a, b) + 1 + rng.int(0, 2), picks: [] as number[] };
    return { ...base, picks: pickDistractors(rng, stampProof(base), difficulty) };
  },
  render: (params) => orderSlide(stampProof(params), params.picks),
  solution: (params): SolutionStep[] => orderSolution(stampProof(params), params.picks),
};

export const sequencesStrongInductionGenerators = [
  runTable,
  nextTerm,
  startsChoice,
  findAb,
  charTiles,
  closedCheck,
  coeffs,
  closedTerm,
  baseFlow,
  stepCheck,
  missingBase,
  orderStrong,
  fibTable,
  fibSum,
  fibEven,
  orderBound,
  stampTable,
  frobenius,
  baseCount,
  orderStamps,
];
