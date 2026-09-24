/**
 * Number & Proof, level 6: Modular Arithmetic.
 *
 * Congruence as notation for remainders: a ≡ b (mod n) when n divides a - b,
 * the residue from 0 to n - 1, and a negative number's residue. Then
 * arithmetic on residues (reduce first, then combine), powers (reduce the
 * base, square repeatedly, and use the cycle of residues so that 2^100 comes
 * from 100 modulo the cycle's length), last digits as arithmetic modulo 10
 * and 100, and finally why the digit-sum tests for 3 and 9 work: 10 ≡ 1, so
 * 100a + 10b + c ≡ a + b + c, which is also what casting out nines relies on.
 *
 * Every question is built from its answer: the modulus and the residues are
 * picked first and the numbers multiplied up from them. Every number on the
 * page is under 1000, as in level 5, and a power's value is never written
 * out: powers are reduced as they are multiplied, which also keeps them far
 * inside double precision. A congruence line, a class or a row of a table is
 * a *form*, so it goes through tiles, a table, a tree, steps, an order, a
 * flow or a choice; only a single whole number (a residue, a last digit, the
 * length of a cycle, a digit) is typed (PITFALLS 3.4).
 *
 * Nothing here is calculus, so no slide declares `source` and the oracle
 * tests do not apply. `numberModular.test.ts` reads the numbers each prompt
 * states and holds every residue, last digit and digit sum to its own `%`,
 * re-doing each power by repeated multiplication rather than by the cycle
 * the generator used. The shared helpers come from `numberProof.ts`.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import {
  choiceSlide,
  fillBank,
  gcd,
  mod,
  orderSlide,
  orderSolution,
  pickDistractors,
  say,
  stackTex,
  turned,
  type Proof,
} from './numberProof';
import { stepBank, treeBank } from './parametricImplicit';

/* ---------- shared helpers ---------- */

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** `(mod n)` for prose and displays. Never inside a tiles template, where `{7}` is a blank. */
const pmod = (n: number) => `\\pmod{${n}}`;

/** `(mod n)` for a tiles template: no braces round a number. */
const bmod = (n: number) => `\\ (\\bmod ${n})`;

/** A number in brackets when it is negative, for the middle of a line. */
const paren = (n: number) => (n < 0 ? `(${n})` : `${n}`);

/** The digits of n added up. */
const digitSum = (n: number) => String(Math.abs(n)).split('').reduce((acc, d) => acc + Number(d), 0);

/**
 * The residues of a^1, a^2, ... modulo n up to the point they come back round
 * to a^1. Only called where the powers are purely periodic: a coprime to n,
 * or any base modulo 10.
 */
function cycleOf(a: number, n: number): number[] {
  const first = mod(a, n);
  const out = [first];
  for (let x = (first * first) % n; x !== first; x = (x * first) % n) {
    out.push(x);
    if (out.length > n) throw new Error(`cycleOf: ${a} mod ${n} is not periodic`);
  }
  return out;
}

/** a^e modulo n from its cycle: the e-th residue along it. */
const powerOf = (a: number, e: number, n: number) => {
  const cycle = cycleOf(a, n);
  return cycle[(e - 1) % cycle.length];
};

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

/** Three distinct labels for a flow step, the right one first; slips that collide are skipped. */
function threeLabels(correct: number, slips: number[]): number[] {
  const out = [correct];
  for (const value of [...slips, ...near(correct, 8)]) {
    if (out.length === 3) break;
    if (!Number.isInteger(value) || value < 0 || value >= 1000 || out.includes(value)) continue;
    out.push(value);
  }
  return out;
}

/** A table bank: the answer as a multiset, plus two or three slips none of the answer uses. */
function tableBank(answer: number[], slips: number[], fallbackFrom: number): string[] {
  const extras: number[] = [];
  for (const value of [...slips, ...range(fallbackFrom, fallbackFrom + 6)]) {
    if (extras.length >= 3) break;
    if (!Number.isInteger(value) || value < 0 || value >= 1000 || answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  return [...answer, ...extras].sort((x, y) => x - y).map(String);
}

/** A residue in an expression slide: `keypad: []`, compared exactly. */
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

/** A two-digit ending as it is read: `07`. */
const ending = (n: number) => String(n).padStart(2, '0');

/* ================================================================
 * Lesson 1: congruence mod n
 * ================================================================ */

interface ResidueParams {
  a: number;
  n: number;
}

const congResidue: Generator<ResidueParams> = {
  id: 'cong-residue',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(7, 19) : rng.int(3, 12);
      const r = rng.int(0, n - 1);
      const q = hard ? rng.int(12, 70) : rng.int(3, 18);
      const a = q * n + r;
      if (hard ? a < 200 || a >= 1000 : a < 20 || a >= 200) continue;
      return { a, n };
    }
  },
  choices({ a, n }) {
    const r = a % n;
    return intOptions(r, [Math.floor(a / n), mod(r + 1, n), n - r, mod(r - 1, n)], 0);
  },
  render({ a, n }) {
    return typed(
      [`Find the residue of $${a}$ modulo $${n}$: the number $r$ from $0$ to $${n - 1}$ with $${a} \\equiv r ${pmod(n)}$.`],
      'r =',
      a % n,
    );
  },
  solution({ a, n }) {
    const q = Math.floor(a / n);
    const r = a % n;
    return [
      { text: `The biggest multiple of $${n}$ not over $${a}$ is $${q} \\times ${n} = ${q * n}$.` },
      { tex: stackTex(`${a} = ${q} \\times ${n} + ${r}`) },
      { text: `So $${a} - ${r}$ is a multiple of $${n}$, and $${a} \\equiv ${r} ${pmod(n)}$.` },
    ];
  },
};

const congNegative: Generator<ResidueParams> = {
  id: 'cong-negative',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(6, 15) : rng.int(3, 9);
      const a = hard ? rng.int(61, 400) : rng.int(2, 60);
      if (a % n !== 0) return { a, n };
    }
  },
  choices({ a, n }) {
    const r = mod(-a, n);
    return intOptions(r, [a % n, mod(r + 1, n), Math.ceil(a / n), mod(r - 1, n)], 0);
  },
  render({ a, n }) {
    return typed([`Find the residue of $-${a}$ modulo $${n}$, from $0$ to $${n - 1}$.`], 'r =', mod(-a, n));
  },
  solution({ a, n }) {
    const q = Math.ceil(a / n);
    const r = mod(-a, n);
    return [
      { text: `Go down to the multiple of $${n}$ just below $-${a}$: $-${q} \\times ${n} = -${q * n}$.` },
      { tex: stackTex(`-${a} = -${q * n} + ${r}`) },
      { text: `A residue is never negative, so it is $${r}$, not $-${a % n}$: $-${a} \\equiv ${r} ${pmod(n)}$.` },
    ];
  },
};

/* ---------- which congruence is true ---------- */

interface TrueParams {
  a: number;
  n: number;
  /** The right-hand sides, the true one first. */
  bs: number[];
}

const congLine = (a: number, b: number, n: number) => `${a} \\equiv ${b} ${pmod(n)}`;

const congTrue: Generator<TrueParams> = {
  id: 'cong-true',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(6, 15) : rng.int(4, 12);
      const r = rng.int(1, n - 1);
      const q = hard ? rng.int(10, 40) : rng.int(3, 12);
      const a = q * n + r;
      if (a >= (hard ? 600 : 150)) continue;
      // Difficulty 1 keeps both sides positive; difficulty 2 puts a negative
      // number on the right, where the sign is the usual slip.
      const b = hard ? r - n * rng.int(1, 2) : rng.pick([r, r + n]);
      const slips = hard ? [-r, b + 1, b - 1, n - r, -(n - r) + 1] : [r + 1, r - 1, q, n - r, r + 2];
      const wrong = [...new Set(slips)].filter((s) => s !== b && (hard || s >= 0) && mod(a - s, n) !== 0);
      if (wrong.length < 3) continue;
      return { a, n, bs: [b, ...rng.sample(wrong, 3).sort((x, y) => x - y)] };
    }
  },
  render({ a, n, bs }) {
    return choiceSlide(
      [say('Which of these congruences is true?')],
      congLine(a, bs[0], n),
      bs.slice(1).map((b) => congLine(a, b, n)),
    );
  },
  solution({ a, n, bs }) {
    const [b, ...wrong] = bs;
    return [
      { text: `$a \\equiv b ${pmod(n)}$ exactly when $${n}$ divides $a - b$.` },
      { tex: stackTex(`${a} - ${paren(b)} = ${a - b} = ${(a - b) / n} \\times ${n}`) },
      ...wrong.map((w) => ({ text: `$${a} - ${paren(w)} = ${a - w}$, which is not a multiple of $${n}$.` })),
    ];
  },
};

/* ---------- a table of residues ---------- */

interface ClassParams {
  n: number;
  xs: number[];
}

const congClassTable: Generator<ClassParams> = {
  id: 'cong-class-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(6, 13) : rng.int(4, 9);
      const xs = hard
        ? [...rng.sample(range(101, 999), 3), ...rng.sample(range(-99, -2), 2).filter((x) => x % n !== 0)]
        : rng.sample(range(11, 99), 4);
      if (xs.length < (hard ? 5 : 4)) continue;
      return { n, xs };
    }
  },
  render({ n, xs }) {
    const answer = xs.map((x) => mod(x, n));
    const slips = xs.flatMap((x) => [Math.abs(x) % n, Math.floor(Math.abs(x) / n), mod(x, n) + 1]);
    return {
      kind: 'table',
      prompt: [say(`Write the residue of each number modulo $${n}$, from $0$ to $${n - 1}$.`)],
      columns: ['\\text{number}', `\\text{residue mod } ${n}`],
      rows: xs.map((x) => [String(x), null]),
      bank: treeBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution({ n, xs }) {
    return xs.map((x) => {
      const q = Math.floor(x / n);
      const r = mod(x, n);
      return { tex: stackTex(`${x} = ${q < 0 ? `-${-q * n}` : q * n} + ${r} \\equiv ${r}`) };
    });
  },
};

/* ---------- is it congruent? ---------- */

interface FlowParams {
  a: number;
  b: number;
  n: number;
}

const congFlow: Generator<FlowParams> = {
  id: 'cong-flow',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(7, 19) : rng.int(3, 12);
      const a = hard ? rng.int(100, 500) : rng.int(20, 200);
      const k = rng.int(1, Math.floor((a + (hard ? 60 : 0)) / n));
      let b = a - k * n;
      if (rng.chance(0.5)) b += rng.pick([1, -1, 2]);
      if (b === 0 || (!hard && b < 0) || b < -60) continue;
      return { a, b, n };
    }
  },
  render({ a, b, n }) {
    const holds = mod(a - b, n) === 0;
    const diffs = threeLabels(a - b, [a + b, a - b + 10, a - b - 10]).map((v) => `$${v}$`);
    const yes = holds ? 'Yes' : 'No';
    return {
      kind: 'flow',
      prompt: [say(`Is this congruence true? Each answer chooses what gets asked next.`)],
      subject: congLine(a, b, n),
      steps: [
        {
          id: 'diff',
          ask: 'First, the left side take away the right side is',
          branches: turned(diffs, `${a}|${b}|${n}`).map((label) => ({ label, to: 'multiple' })),
        },
        {
          id: 'multiple',
          ask: `Is that a multiple of $${n}$?`,
          branches: [
            { label: 'Yes', to: 'verdict' },
            { label: 'No', to: 'verdict' },
          ],
        },
        {
          id: 'verdict',
          ask: `So is $${congLine(a, b, n)}$ true?`,
          branches: [
            { label: 'Yes', outcome: holds ? 'That is the answer.' : `$${a - b}$ is not a multiple of $${n}$.` },
            { label: 'No', outcome: holds ? `$${a - b}$ is a multiple of $${n}$.` : 'That is the answer.' },
          ],
        },
      ],
      answer: [`$${a - b}$`, yes, yes],
    };
  },
  solution({ a, b, n }) {
    const d = a - b;
    const holds = mod(d, n) === 0;
    return [
      { tex: stackTex(`${a} - ${paren(b)} = ${d}`) },
      {
        text: holds
          ? `$${d} = ${d / n} \\times ${n}$, a multiple of $${n}$, so the congruence is true.`
          : `$${d}$ leaves remainder $${mod(d, n)}$ on division by $${n}$, so it is not a multiple and the congruence is false.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 2: adding and multiplying mod n
 * ================================================================ */

type Op = '+' | '*';

const opTex = (op: Op) => (op === '*' ? '\\times' : '+');
const apply = (op: Op, x: number, y: number) => (op === '*' ? x * y : x + y);

interface CombineParams {
  n: number;
  nums: number[];
  ops: Op[];
}

/** The residue of the whole line, combined left to right. */
function combineRun({ n, nums, ops }: CombineParams): { residues: number[]; running: number[]; raw: number[] } {
  const residues = nums.map((x) => x % n);
  const running = [residues[0]];
  const raw: number[] = [];
  ops.forEach((op, i) => {
    const value = apply(op, running[i], residues[i + 1]);
    raw.push(value);
    running.push(value % n);
  });
  return { residues, running, raw };
}

const congCombineSteps: Generator<CombineParams> = {
  id: 'cong-combine-steps',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(7, 13) : rng.int(5, 9);
      const count = hard ? 3 : 2;
      const nums = Array.from({ length: count }, () => rng.int(hard ? 100 : 20, hard ? 999 : 199));
      // Combined from the left, so a product may come only first: a + b x c
      // taken left to right would be (a + b) x c.
      const ops: Op[] = hard ? ['*', rng.pick(['+', '*'] as const)] : [rng.pick(['+', '*'] as const)];
      if (nums.some((x) => x % n === 0)) continue;
      return { n, nums, ops };
    }
  },
  render(params) {
    const { n, nums, ops } = params;
    const { residues, running, raw } = combineRun(params);
    const start = nums.flatMap((x, i) => (i === 0 ? [String(x)] : [opTex(ops[i - 1]), String(x)]));
    const reductions = [
      ...nums.map((x, i) => {
        const r = residues[i];
        return {
          span: [2 * i, 2 * i + 1] as [number, number],
          value: String(r),
          bank: stepBank(String(r), String(Math.floor(x / n)), String(mod(r + 1, n)), String(n - r), String(mod(r + 2, n))),
        };
      }),
      ...ops.map((op, i) => {
        const value = running[i + 1];
        const other = op === '*' ? running[i] + residues[i + 1] : running[i] * residues[i + 1];
        return {
          span: [0, 3] as [number, number],
          operator: 1,
          value: String(value),
          bank: stepBank(
            String(value),
            String(raw[i] >= n ? raw[i] : raw[i] + n),
            String(mod(other, n)),
            String(mod(value + 1, n)),
            String(mod(value - 1, n)),
          ),
        };
      }),
    ];
    return {
      kind: 'steps',
      prompt: [
        say(
          `Find the residue of this modulo $${n}$. Reduce each number first, then combine them from the left, reducing as you go: every value you choose is a residue from $0$ to $${n - 1}$.`,
        ),
        say('Tap the part you would do **next**, then choose what it becomes.'),
      ],
      start,
      reductions,
    };
  },
  solution(params) {
    const { n, nums, ops } = params;
    const { residues, running, raw } = combineRun(params);
    return [
      { text: 'Reduce each number first:' },
      ...nums.map((x, i) => ({ tex: stackTex(`${x} \\equiv ${residues[i]} ${pmod(n)}`) })),
      { text: 'Then combine, reducing each result:' },
      ...ops.map((op, i) => ({
        tex: stackTex(`${running[i]} ${opTex(op)} ${residues[i + 1]} = ${raw[i]} \\equiv ${running[i + 1]}`),
      })),
    ];
  },
};

/* ---------- from the residues alone ---------- */

type Form = 'sum' | 'diff' | 'prod' | 'lin' | 'sqsum' | 'sqprod' | 'cube' | 'mix';

const FORMS: Record<Form, { tex: string; at: (r: number, s: number) => string; value: (r: number, s: number) => number }> = {
  sum: { tex: 'a + b', at: (r, s) => `${r} + ${s}`, value: (r, s) => r + s },
  diff: { tex: 'a - b', at: (r, s) => `${r} - ${s}`, value: (r, s) => r - s },
  prod: { tex: 'ab', at: (r, s) => `${r} \\times ${s}`, value: (r, s) => r * s },
  lin: { tex: '3a + 2b', at: (r, s) => `3 \\times ${r} + 2 \\times ${s}`, value: (r, s) => 3 * r + 2 * s },
  sqsum: { tex: 'a^2 + b^2', at: (r, s) => `${r}^2 + ${s}^2`, value: (r, s) => r * r + s * s },
  sqprod: { tex: 'a^2 b', at: (r, s) => `${r}^2 \\times ${s}`, value: (r, s) => r * r * s },
  cube: { tex: 'a^3 - b', at: (r, s) => `${r}^3 - ${s}`, value: (r, s) => r * r * r - s },
  mix: { tex: 'ab + 4a', at: (r, s) => `${r} \\times ${s} + 4 \\times ${r}`, value: (r, s) => r * s + 4 * r },
};

interface ResiduesParams {
  n: number;
  r: number;
  s: number;
  form: Form;
}

const congFromResidues: Generator<ResiduesParams> = {
  id: 'cong-from-residues',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(7, 13) : rng.int(5, 12);
      const r = rng.int(2, n - 1);
      const s = rng.int(2, n - 1);
      const form = rng.pick(hard ? (['sqsum', 'sqprod', 'cube', 'mix'] as const) : (['sum', 'diff', 'prod', 'lin'] as const));
      const raw = FORMS[form].value(r, s);
      // The raw value is written in the solution, so it stays under 1000, and
      // it has to be at least n (or negative) for the reducing to be asked.
      if (Math.abs(raw) >= 1000 || (raw >= 0 && raw < n)) continue;
      return { n, r, s, form };
    }
  },
  choices({ n, r, s, form }) {
    const raw = FORMS[form].value(r, s);
    const answer = mod(raw, n);
    return intOptions(answer, [raw, mod(raw + 1, n), n - answer, Math.abs(raw) % n], 0);
  },
  render({ n, r, s, form }) {
    return typed(
      [
        `$a \\equiv ${r}$ and $b \\equiv ${s} ${pmod(n)}$.`,
        `Find the residue of $${FORMS[form].tex}$ modulo $${n}$.`,
      ],
      '\\text{residue} =',
      mod(FORMS[form].value(r, s), n),
    );
  },
  solution({ n, r, s, form }) {
    const raw = FORMS[form].value(r, s);
    const answer = mod(raw, n);
    return [
      { text: `Only the residues matter, so put $${r}$ for $a$ and $${s}$ for $b$:` },
      { tex: stackTex(`${FORMS[form].at(r, s)} = ${raw}`) },
      {
        text:
          raw < 0
            ? `$${raw}$ is negative, so add $${n}$ until it is not: $${raw} \\equiv ${answer} ${pmod(n)}$.`
            : `$${raw} = ${Math.floor(raw / n)} \\times ${n} + ${answer}$, so the residue is $${answer}$.`,
      },
    ];
  },
};

/* ---------- a table mod n ---------- */

interface OpTableParams {
  n: number;
  op: Op;
  blanks: number[];
}

const tableValues = ({ n, op }: { n: number; op: Op }) => (op === '*' ? range(1, n - 1) : range(0, n - 1));

const congOpTable: Generator<OpTableParams> = {
  id: 'cong-op-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const [n, op] = hard ? rng.pick([[6, '+'], [6, '*'], [7, '*']] as const) : rng.pick([[4, '+'], [4, '*'], [5, '+'], [5, '*']] as const);
    const size = tableValues({ n, op }).length;
    const cells = range(0, size * size - 1);
    return { n, op, blanks: rng.sample(cells, hard ? 7 : 5).sort((x, y) => x - y) };
  },
  render({ n, op, blanks }) {
    const values = tableValues({ n, op });
    const size = values.length;
    const answer = blanks.map((cell) => apply(op, values[Math.floor(cell / size)], values[cell % size]) % n);
    const slips = blanks.map((cell) => apply(op, values[Math.floor(cell / size)], values[cell % size]));
    return {
      kind: 'table',
      prompt: [
        say(
          `Fill in the gaps in this ${op === '*' ? 'multiplication' : 'addition'} table modulo $${n}$. Each entry is the residue of the row number ${op === '*' ? 'times' : 'plus'} the column number.`,
        ),
      ],
      columns: [opTex(op), ...values.map(String)],
      rows: values.map((v, i) => [
        String(v),
        ...values.map((w, j) => (blanks.includes(i * size + j) ? null : String(apply(op, v, w) % n))),
      ]),
      bank: tableBank(answer, slips, n),
      answer: answer.map(String),
    };
  },
  solution({ n, op, blanks }) {
    const values = tableValues({ n, op });
    const size = values.length;
    return [
      { text: `Work out each gap, then take away $${n}$ as often as you can:` },
      ...blanks.map((cell) => {
        const [v, w] = [values[Math.floor(cell / size)], values[cell % size]];
        const raw = apply(op, v, w);
        return { tex: stackTex(`${v} ${opTex(op)} ${w} = ${raw} \\equiv ${raw % n}`) };
      }),
    ];
  },
};

/* ---------- why reducing first works ---------- */

interface ArithOrderParams {
  n: number;
  r: number;
  s: number;
  op: Op;
  difficulty: number;
  picks: number[];
}

function arithProof({ n, r, s, op, difficulty }: ArithOrderParams): Proof {
  const t = apply(op, r, s) % n;
  const wrongT = mod(t + 1, n);
  const define = `Since $a \\equiv ${r} ${pmod(n)}$, $a = ${n}j + ${r}$ for a whole number $j$, and in the same way $b = ${n}k + ${s}$.`;
  const swapped = {
    text: `Since $a \\equiv ${r} ${pmod(n)}$, $a = ${r}j + ${n}$ for a whole number $j$.`,
    why: `That has the two numbers the wrong way round: $a$ is a multiple of $${n}$ plus $${r}$.`,
  };
  const wrongEnd = (lhs: string) => ({
    text: `So $${lhs} \\equiv ${wrongT} ${pmod(n)}$.`,
    why: `What is left over after the multiples of $${n}$ is $${t}$, not $${wrongT}$.`,
  });
  if (op === '+' || difficulty < 2) {
    const u = r + s;
    return {
      claim: `$a \\equiv ${r}$ and $b \\equiv ${s} ${pmod(n)}$. Prove that $a + b \\equiv ${t} ${pmod(n)}$.`,
      steps: [
        define,
        `Adding, $a + b = ${n}j + ${n}k + ${u}$.`,
        `So $a + b = ${n}(j + k) + ${u}$, a multiple of $${n}$ plus $${u}$.`,
        `And $${u} = ${n} + ${t}$, so $a + b = ${n}(j + k + 1) + ${t}$.`,
        `So $a + b \\equiv ${t} ${pmod(n)}$.`,
      ],
      pool: [
        {
          text: `Adding, $a + b = ${n}j + ${u}$.`,
          why: `The $${n}k$ that $b$ brings has gone missing.`,
        },
        swapped,
        wrongEnd('a + b'),
      ],
    };
  }
  const u = r * s;
  const q = Math.floor(u / n);
  return {
    claim: `$a \\equiv ${r}$ and $b \\equiv ${s} ${pmod(n)}$. Prove that $ab \\equiv ${t} ${pmod(n)}$.`,
    steps: [
      define,
      `Multiplying out, $ab = ${n * n}jk + ${n * s}j + ${n * r}k + ${u}$.`,
      `Every term but the last has a factor of $${n}$, so it can be taken out.`,
      `So $ab = ${n}(${n}jk + ${s}j + ${r}k) + ${u}$.`,
      `And $${u} = ${q} \\times ${n} + ${t}$, so $ab$ is a multiple of $${n}$ plus $${t}$.`,
      `So $ab \\equiv ${t} ${pmod(n)}$.`,
    ],
    pool: [
      {
        text: `Multiplying out, $ab = ${n * n}jk + ${u}$.`,
        why: `The cross terms $${n * s}j$ and $${n * r}k$ have been dropped.`,
      },
      swapped,
      wrongEnd('ab'),
    ],
  };
}

const congArithOrder: Generator<ArithOrderParams> = {
  id: 'cong-arith-order',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(5, 12) : rng.int(5, 12);
      const r = rng.int(2, n - 1);
      const s = rng.int(2, n - 1);
      const op: Op = hard ? '*' : '+';
      // The step reducing the leftover needs something to reduce.
      if (apply(op, r, s) < n) continue;
      const base: ArithOrderParams = { n, r, s, op, difficulty, picks: [] };
      return { ...base, picks: pickDistractors(rng, arithProof(base), difficulty) };
    }
  },
  render: (params) => orderSlide(arithProof(params), params.picks),
  solution: (params) => orderSolution(arithProof(params), params.picks),
};

/* ================================================================
 * Lesson 3: powers mod n
 * ================================================================ */

interface PowerParams {
  a: number;
  n: number;
}

/** A base coprime to n whose residue is neither 0 nor 1, and whose cycle length is in [lo, hi]. */
function samplePower(rng: Rng, ns: number[], as: (n: number) => number[], lo: number, hi: number): PowerParams {
  for (;;) {
    const n = rng.pick(ns);
    const a = rng.pick(as(n));
    if (gcd(a, n) !== 1 || mod(a, n) <= 1) continue;
    const length = cycleOf(a, n).length;
    if (length < lo || length > hi) continue;
    return { a, n };
  }
}

interface PowerTableParams extends PowerParams {
  rows: number;
}

const congPowerTable: Generator<PowerTableParams> = {
  id: 'cong-power-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const { a, n } = hard
      ? samplePower(rng, range(7, 19), (m) => range(m + 2, 99), 2, 8)
      : samplePower(rng, range(5, 13), (m) => range(2, m - 1), 2, 6);
    return { a, n, rows: hard ? 8 : 6 };
  },
  render({ a, n, rows }) {
    const ra = mod(a, n);
    const residues = range(1, rows).map((k) => powerOf(a, k, n));
    const hard = a > n;
    const answer = hard ? residues : residues.slice(1);
    const slips = [...residues.slice(0, -1).map((x) => x * ra), a];
    return {
      kind: 'table',
      prompt: [
        say(
          hard
            ? `Fill in the residues of the powers of $${a}$ modulo $${n}$. Reduce $${a}$ first; after that each row is the one above times that residue, reduced.`
            : `Fill in the residues of the powers of $${a}$ modulo $${n}$. Each row is the one above times $${a}$, reduced.`,
        ),
      ],
      columns: ['k', `${a}^k \\bmod ${n}`],
      rows: residues.map((x, i) => [String(i + 1), hard || i > 0 ? null : String(x)]),
      bank: tableBank(answer, slips, n),
      answer: answer.map(String),
    };
  },
  solution({ a, n, rows }) {
    const ra = mod(a, n);
    const residues = range(1, rows).map((k) => powerOf(a, k, n));
    const length = cycleOf(a, n).length;
    return [
      ...(a > n ? [{ tex: stackTex(`${a} \\equiv ${ra} ${pmod(n)}`) }] : []),
      { text: `Each row is the row above times $${ra}$, reduced:` },
      ...residues.slice(0, -1).map((x, i) => ({ tex: stackTex(`${x} \\times ${ra} = ${x * ra} \\equiv ${residues[i + 1]}`) })),
      {
        text:
          length < rows
            ? `The residues come round again after $${length}$ rows, so the cycle has length $${length}$.`
            : `The residues have not yet come round again: the cycle is longer than the table.`,
      },
    ];
  },
};

const cycleList = (a: number, n: number) => cycleOf(a, n).map((x) => `$${x}$`).join(', ');

const congCycle: Generator<PowerParams> = {
  id: 'cong-cycle',
  sample(rng, difficulty) {
    return difficulty >= 2
      ? samplePower(rng, range(11, 29), () => range(2, 60), 3, 10)
      : samplePower(rng, range(5, 13), (m) => range(2, m - 1), 2, 6);
  },
  choices({ a, n }) {
    const length = cycleOf(a, n).length;
    return intOptions(length, [n - 1, length + 1, 2 * length, length - 1], 1);
  },
  render({ a, n }) {
    return typed(
      [
        `The residues of $${a}^1, ${a}^2, ${a}^3, \\dots$ modulo $${n}$ come round again and again in a cycle.`,
        'How many residues are in the cycle?',
      ],
      '\\text{length} =',
      cycleOf(a, n).length,
    );
  },
  solution({ a, n }) {
    const cycle = cycleOf(a, n);
    const ra = mod(a, n);
    return [
      ...(a > n ? [{ text: `Reduce the base first: $${a} \\equiv ${ra} ${pmod(n)}$.` }] : []),
      { text: `Multiply by $${ra}$ and reduce each time: the residues run ${cycleList(a, n)}.` },
      {
        text: `The last of those is $1$, so the next is $${ra}$ again and the cycle repeats. It has length $${cycle.length}$.`,
      },
    ];
  },
};

interface BigPowerParams extends PowerParams {
  e: number;
}

function sampleBig(rng: Rng, difficulty: number): BigPowerParams {
  const hard = difficulty >= 2;
  const { a, n } = hard
    ? samplePower(rng, range(7, 19), () => range(2, 60), 3, 10)
    : samplePower(rng, range(5, 13), (m) => range(2, m - 1), 2, 6);
  return { a, n, e: hard ? rng.int(100, 999) : rng.int(10, 99) };
}

/** The solution for a^e mod n by its cycle, for a coprime to n. */
function bigSolution({ a, n, e }: BigPowerParams): SolutionStep[] {
  const ra = mod(a, n);
  const cycle = cycleOf(a, n);
  const L = cycle.length;
  const s = e % L;
  const answer = powerOf(a, e, n);
  return [
    ...(a > n ? [{ text: `Reduce the base first: $${a} \\equiv ${ra} ${pmod(n)}$.` }] : []),
    { text: `The powers of $${ra}$ modulo $${n}$ run ${cycleList(a, n)}, then repeat, since $${ra}^{${L}} \\equiv 1$.` },
    { tex: stackTex(`${e} = ${Math.floor(e / L)} \\times ${L} + ${s}`) },
    {
      text:
        s === 0
          ? `So $${a}^{${e}}$ is a whole number of cycles: $${a}^{${e}} \\equiv 1 ${pmod(n)}$.`
          : `So $${a}^{${e}} \\equiv ${ra}^{${s}} \\equiv ${answer} ${pmod(n)}$.`,
    },
  ];
}

const congBigPower: Generator<BigPowerParams> = {
  id: 'cong-big-power',
  sample: sampleBig,
  choices({ a, n, e }) {
    const cycle = cycleOf(a, n);
    const L = cycle.length;
    return intOptions(powerOf(a, e, n), [cycle[e % L], cycle[(e - 2 + L) % L], mod(a, n), e % n], 0, n - 1);
  },
  render({ a, n, e }) {
    return typed([`Find the residue of $${a}^{${e}}$ modulo $${n}$.`], '\\text{residue} =', powerOf(a, e, n));
  },
  solution: bigSolution,
};

const congPowerFlow: Generator<BigPowerParams> = {
  id: 'cong-power-flow',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const { a, n } = hard
      ? samplePower(rng, range(7, 17), () => range(2, 50), 3, 8)
      : samplePower(rng, range(5, 11), (m) => range(2, m - 1), 2, 6);
    return { a, n, e: hard ? rng.int(100, 999) : rng.int(20, 99) };
  },
  render({ a, n, e }) {
    const cycle = cycleOf(a, n);
    const L = cycle.length;
    const answer = powerOf(a, e, n);
    const key = `${a}|${n}|${e}`;
    const dollars = (values: number[]) => turned(values.map((v) => `$${v}$`), key);
    return {
      kind: 'flow',
      prompt: [say(`Find this residue from the cycle of powers. Each answer chooses what gets asked next.`)],
      subject: `${a}^{${e}} \\bmod ${n}`,
      steps: [
        {
          id: 'length',
          ask: `How long is the cycle of powers of $${a}$ modulo $${n}$?`,
          branches: dollars(threeLabels(L, [n - 1, L + 1, 2 * L])).map((label) => ({ label, to: 'place' })),
        },
        {
          id: 'place',
          ask: `So only the remainder of $${e}$ on division by the length matters. It is`,
          branches: dollars(threeLabels(e % L, [e % (L + 1), e % n, (e % L) + 1])).map((label) => ({ label, to: 'value' })),
        },
        {
          id: 'value',
          ask: `So $${a}^{${e}}$ leaves`,
          branches: dollars(threeLabels(answer, [cycle[e % L], cycle[(e - 2 + L) % L], mod(a, n)])).map((label) => ({
            label,
            outcome: label === `$${answer}$` ? 'That is the answer.' : `Count along the cycle again: it lands on $${answer}$.`,
          })),
        },
      ],
      answer: [`$${L}$`, `$${e % L}$`, `$${answer}$`],
    };
  },
  solution: bigSolution,
};

/* ---------- repeated squaring ---------- */

interface SquareParams extends PowerParams {
  e: number;
}

/** The powers of two a repeated-squaring run needs for e, largest last. */
const squarings = (e: number) => range(0, Math.floor(Math.log2(e))).map((i) => 2 ** i);

/** a^(2^i) modulo n for each i, by squaring. */
function squaredResidues(a: number, n: number, count: number): number[] {
  const out = [mod(a, n)];
  while (out.length < count) out.push((out[out.length - 1] * out[out.length - 1]) % n);
  return out;
}

const congSquareTree: Generator<SquareParams> = {
  id: 'cong-square-tree',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(13, 31) : rng.int(11, 29);
      const a = hard ? rng.int(n + 2, 99) : rng.int(2, n - 1);
      const e = hard ? rng.int(17, 31) : rng.int(9, 15);
      if (gcd(a, n) !== 1 || mod(a, n) <= 1) continue;
      return { a, n, e };
    }
  },
  render({ a, n, e }) {
    const powers = squarings(e);
    const residues = squaredResidues(a, n, powers.length);
    const used = powers.filter((p) => (e & p) !== 0);
    const answer = [...residues, powerOf(a, e, n)];
    const slips = [...residues.map((x) => x * x).filter((x) => x >= n), a, e % n];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Find $${a}^{${e}}$ modulo $${n}$ by repeated squaring. Each power is the square of the one it comes from, reduced modulo $${n}$, and $${e} = ${[...used].reverse().join(' + ')}$ puts the last one together.`,
        ),
      ],
      expression: `${a}^{${e}} \\bmod ${n}`,
      nodes: [
        ...powers.map((p, i) => ({ id: `p${p}`, from: i === 0 ? [] : [`p${powers[i - 1]}`] })),
        { id: 'all', from: used.map((p) => `p${p}`) },
      ],
      bank: treeBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution({ a, n, e }) {
    const powers = squarings(e);
    const residues = squaredResidues(a, n, powers.length);
    const used = powers.filter((p) => (e & p) !== 0);
    const steps: SolutionStep[] = [
      { tex: stackTex(`${a}^{1} \\equiv ${residues[0]}`) },
      ...residues.slice(1).map((x, i) => ({
        tex: stackTex(`${a}^{${powers[i + 1]}} \\equiv ${residues[i]}^2 = ${residues[i] * residues[i]} \\equiv ${x}`),
      })),
    ];
    let acc = residues[powers.indexOf(used[0])];
    const lines: string[] = [];
    for (const p of used.slice(1)) {
      const x = residues[powers.indexOf(p)];
      lines.push(`${acc} \\times ${x} = ${acc * x} \\equiv ${(acc * x) % n}`);
      acc = (acc * x) % n;
    }
    return [
      ...steps,
      { text: `$${a}^{${e}} = ${used.map((p) => `${a}^{${p}}`).join(' \\times ')}$, so multiply those residues, reducing as you go:` },
      ...lines.map((line) => ({ tex: stackTex(line) })),
    ];
  },
};

/* ================================================================
 * Lesson 4: last digits
 * ================================================================ */

type LastForm = 'ab' | 'abc' | 'sq' | 'abplus';

interface LastParams {
  nums: number[];
  form: LastForm;
}

const LAST: Record<LastForm, { tex: (x: number[]) => string; value: (x: number[]) => number; at: (x: number[]) => string }> = {
  ab: { tex: ([a, b]) => `${a} \\times ${b}`, value: ([a, b]) => a * b, at: ([a, b]) => `${a} \\times ${b}` },
  abc: {
    tex: ([a, b, c]) => `${a} \\times ${b} \\times ${c}`,
    value: ([a, b, c]) => a * b * c,
    at: ([a, b, c]) => `${a} \\times ${b} \\times ${c}`,
  },
  sq: { tex: ([a, b]) => `${a}^2 + ${b}`, value: ([a, b]) => a * a + b, at: ([a, b]) => `${a}^2 + ${b}` },
  abplus: {
    tex: ([a, b, c]) => `${a} \\times ${b} + ${c}`,
    value: ([a, b, c]) => a * b + c,
    at: ([a, b, c]) => `${a} \\times ${b} + ${c}`,
  },
};

const congLastProduct: Generator<LastParams> = {
  id: 'cong-last-product',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const form = hard ? rng.pick(['abc', 'sq', 'abplus'] as const) : 'ab';
      const count = form === 'sq' ? 2 : form === 'ab' ? 2 : 3;
      const nums = Array.from({ length: count }, () => rng.int(hard ? 100 : 12, hard ? 999 : 199));
      if (nums.some((x) => x % 10 <= 1)) continue;
      return { nums, form };
    }
  },
  choices({ nums, form }) {
    const lasts = nums.map((x) => x % 10);
    const answer = LAST[form].value(lasts) % 10;
    return intOptions(answer, [lasts.reduce((x, y) => x + y) % 10, (answer + 1) % 10, lasts[0], (answer + 9) % 10], 0, 9);
  },
  render({ nums, form }) {
    return typed([`What is the last digit of $${LAST[form].tex(nums)}$?`], '\\text{last digit} =', LAST[form].value(nums.map((x) => x % 10)) % 10);
  },
  solution({ nums, form }) {
    const lasts = nums.map((x) => x % 10);
    const raw = LAST[form].value(lasts);
    return [
      { text: 'The last digit is the residue modulo $10$, and everything but the last digits is a multiple of $10$. So only the last digits matter:' },
      { tex: stackTex(`${LAST[form].at(lasts)} = ${raw} \\equiv ${raw % 10} ${pmod(10)}`) },
      { text: `So the last digit is $${raw % 10}$.` },
    ];
  },
};

interface LastPowerParams {
  a: number;
  e: number;
}

const lastCycleList = (a: number) => cycleOf(a, 10).map((x) => `$${x}$`).join(', ');

function lastPowerSolution({ a, e }: LastPowerParams): SolutionStep[] {
  const cycle = cycleOf(a, 10);
  const L = cycle.length;
  const s = e % L;
  return [
    ...(a >= 10 ? [{ text: `Only the last digit of the base matters: $${a} \\equiv ${a % 10} ${pmod(10)}$.` }] : []),
    { text: `The last digits of the powers of $${a % 10}$ run ${lastCycleList(a)}, then repeat.` },
    { tex: stackTex(`${e} = ${Math.floor(e / L)} \\times ${L} + ${s}`) },
    {
      text:
        s === 0
          ? `A whole number of cycles ends on the last one in the cycle, so the last digit is $${cycle[L - 1]}$.`
          : `So $${a}^{${e}}$ ends like $${a % 10}^{${s}}$, in $${cycle[s - 1]}$.`,
    },
  ];
}

const congLastPower: Generator<LastPowerParams> = {
  id: 'cong-last-power',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const a = hard ? rng.int(12, 99) : rng.pick([2, 3, 4, 7, 8, 9]);
      if (![2, 3, 7, 8].includes(a % 10) && hard) continue;
      return { a, e: hard ? rng.int(100, 999) : rng.int(10, 99) };
    }
  },
  choices({ a, e }) {
    const cycle = cycleOf(a, 10);
    const L = cycle.length;
    return intOptions(powerOf(a, e, 10), [cycle[e % L], cycle[(e - 2 + L) % L], a % 10, e % 10], 0, 9);
  },
  render({ a, e }) {
    return typed([`What is the last digit of $${a}^{${e}}$?`], '\\text{last digit} =', powerOf(a, e, 10));
  },
  solution: lastPowerSolution,
};

/** Pairs (x, y) from different places in a bank with 4x + y = e, as `x,y`. */
function quarterSplits(values: number[], e: number): string[] {
  const out = new Set<string>();
  values.forEach((x, i) =>
    values.forEach((y, j) => {
      if (i !== j && 4 * x + y === e) out.add(`${x},${y}`);
    }),
  );
  return [...out];
}

const congLastTiles: Generator<LastPowerParams> = {
  id: 'cong-last-tiles',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const a = hard ? rng.int(12, 99) : rng.pick([2, 3, 7, 8]);
      if (![2, 3, 7, 8].includes(a % 10)) continue;
      const e = hard ? rng.int(100, 999) : rng.int(10, 99);
      // The answer's own tiles must not make a second split, as 4 x 7 + 9
      // does beside 37 = 4 x 9 + 1.
      if (quarterSplits([Math.floor(e / 4), e % 4, powerOf(a, e, 10)], e).length > 1) continue;
      return { a, e };
    }
  },
  render({ a, e }) {
    const cycle = cycleOf(a, 10);
    const [q, s] = [Math.floor(e / 4), e % 4];
    const digit = powerOf(a, e, 10);
    const answer = [String(q), String(s), String(digit)];
    // A split such as 4(q - 1) + (s + 4) is a true line too, and the tiles are
    // graded by the one they name, so a tile making another split is left out.
    const chosen: number[] = [];
    for (const value of [q + 1, q - 1, s + 4, s + 1, s + 2, e % 10, ...cycle, a % 10, q + 2, s + 3]) {
      if (chosen.length >= 4 || value < 0 || answer.includes(String(value)) || chosen.includes(value)) continue;
      if (quarterSplits([q, s, digit, ...chosen, value], e).length > 1) continue;
      chosen.push(value);
    }
    return {
      kind: 'tiles',
      prompt: [
        say(`The last digits of the powers of $${a % 10}$ run ${lastCycleList(a)}, then repeat.`),
        say(`Complete the working for the last digit of $${a}^{${e}}$.`),
      ],
      template: `${e} = 4 \\times {0} + {1}, \\quad \\text{last digit } {2}`,
      bank: fillBank(answer, chosen.map(String), 2),
      answer,
    };
  },
  solution: lastPowerSolution,
};

/* ---------- the last two digits ---------- */

type TwoParams = { kind: 'product'; a: number; b: number } | { kind: 'power'; a: number; e: number };

/** Two-digit endings coprime to 10 whose powers come round within five steps. */
const SHORT_ENDINGS = range(3, 99).filter((x) => gcd(x, 10) === 1 && cycleOf(x, 100).length <= 5 && cycleOf(x, 100).length >= 2);

const twoAnswer = (params: TwoParams) =>
  params.kind === 'product' ? ((params.a % 100) * (params.b % 100)) % 100 : powerOf(params.a, params.e, 100);

const congLastTwo: Generator<TwoParams> = {
  id: 'cong-last-two',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty < 2) {
        const [a, b] = [rng.int(110, 999), rng.int(110, 999)];
        const [x, y] = [a % 100, b % 100];
        if (x < 10 || y < 10 || x * y >= 1000 || x % 10 === 0 || y % 10 === 0) continue;
        return { kind: 'product', a, b };
      }
      const a = 100 * rng.int(0, 9) + rng.pick(SHORT_ENDINGS);
      if (a < 10) continue;
      return { kind: 'power', a, e: rng.int(10, 999) };
    }
  },
  choices(params) {
    const answer = twoAnswer(params);
    return intOptions(answer, [(answer + 10) % 100, answer % 10, (answer + 50) % 100, (answer + 90) % 100], 0, 99);
  },
  render(params) {
    const tex = params.kind === 'product' ? `${params.a} \\times ${params.b}` : `${params.a}^{${params.e}}`;
    return typed(
      [`What number do the last two digits of $${tex}$ make? Write an ending of $07$ as $7$.`],
      '\\text{last two digits} =',
      twoAnswer(params),
    );
  },
  solution(params) {
    const answer = twoAnswer(params);
    if (params.kind === 'product') {
      const [x, y] = [params.a % 100, params.b % 100];
      return [
        { text: 'The last two digits are the residue modulo $100$, so only the last two digits of each number matter:' },
        { tex: stackTex(`${x} \\times ${y} = ${x * y} \\equiv ${answer} ${pmod(100)}`) },
        { text: `So the product ends in $${ending(answer)}$.` },
      ];
    }
    const { a, e } = params;
    const base = a % 100;
    const cycle = cycleOf(base, 100);
    const L = cycle.length;
    const s = e % L;
    return [
      ...(a >= 100 ? [{ text: `Only the last two digits of the base matter: $${a}$ ends in $${ending(base)}$.` }] : []),
      {
        text: `Keep only the last two digits at each step: the powers of $${ending(base)}$ end in ${cycle.map((x) => `$${ending(x)}$`).join(', ')}, then repeat.`,
      },
      { tex: stackTex(`${e} = ${Math.floor(e / L)} \\times ${L} + ${s}`) },
      {
        text:
          s === 0
            ? `A whole number of cycles ends on $${ending(cycle[L - 1])}$, so the answer is $${answer}$.`
            : `So $${a}^{${e}}$ ends like $${ending(base)}^{${s}}$, in $${ending(answer)}$: the answer is $${answer}$.`,
      },
    ];
  },
};

/* ---------- which could be a square ---------- */

interface SquareCheckParams {
  k: number;
  others: number[];
}

/** A number that ends the way no square can, at this difficulty. */
function notSquare(x: number, hard: boolean): boolean {
  const last = x % 10;
  const tens = Math.floor(x / 10) % 10;
  if ([2, 3, 7, 8].includes(last)) return true;
  if (!hard) return false;
  return (last === 5 && tens !== 2) || (last === 0 && tens !== 0);
}

const congLastSquare: Generator<SquareCheckParams> = {
  id: 'cong-last-square',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const k = rng.int(11, 31);
    const nearby = range(k * k - 40, k * k + 40).filter((x) => x >= 100 && x < 1000);
    if (!hard) return { k, others: rng.sample(nearby.filter((x) => notSquare(x, false)), 3).sort((x, y) => x - y) };
    // One of each way to fail: a last digit of 2, 3, 7 or 8; a 5 without a 2
    // before it; a 0 without a 0 before it.
    const one = rng.pick(nearby.filter((x) => notSquare(x, false)));
    const five = rng.pick(range(10, 99).filter((t) => t % 10 !== 2).map((t) => 10 * t + 5));
    const zero = rng.pick(range(10, 99).filter((t) => t % 10 !== 0).map((t) => 10 * t));
    return { k, others: [one, five, zero].sort((x, y) => x - y) };
  },
  render({ k, others }) {
    return choiceSlide(
      [say('One of these is a square number, and the others cannot be. Which is the square? Look at how each one ends.')],
      String(k * k),
      others.map(String),
    );
  },
  solution({ k, others }) {
    return [
      { text: 'The last digit of a square depends only on the last digit of the number squared: $0^2, 1^2, \\dots, 9^2$ end in $0, 1, 4, 9, 6, 5, 6, 9, 4, 1$.' },
      { text: 'So no square ends in $2$, $3$, $7$ or $8$. A square ending in $5$ ends in $25$, and one ending in $0$ ends in $00$.' },
      ...others.map((x) => ({ text: `$${x}$ ends in $${ending(x % 100)}$, so it cannot be a square.` })),
      { text: `$${k * k} = ${k}^2$.` },
    ];
  },
};

/* ================================================================
 * Lesson 5: why the digit-sum tests work
 * ================================================================ */

interface DigitOrderParams {
  N: number;
  m: number;
  difficulty: number;
  picks: number[];
}

const digitsOf = (N: number) => String(N).split('').map(Number);

function digitProof({ N, m, difficulty }: DigitOrderParams): Proof {
  const [a, b, c] = digitsOf(N);
  const S = a + b + c;
  const r = S % m;
  const three = m === 3 ? `, so of $3$ as well` : '';
  const steps = [
    `$${N} = ${a} \\times 100 + ${b} \\times 10 + ${c}$.`,
    `$100 = 99 + 1$ and $10 = 9 + 1$, so $${N} = ${a} \\times 99 + ${b} \\times 9 + ${a} + ${b} + ${c}$.`,
    `$${a} \\times 99 + ${b} \\times 9 = 9(${a} \\times 11 + ${b})$, a multiple of $9$${three}.`,
    `So $${N} \\equiv ${a} + ${b} + ${c} = ${S} ${pmod(m)}$.`,
  ];
  if (difficulty >= 2) {
    steps.push(
      r === 0
        ? `$${S}$ is a multiple of $${m}$, so $${N}$ is too: it passes the test for $${m}$ exactly as its digit sum does.`
        : `$${S}$ leaves remainder $${r}$ on division by $${m}$, so $${N}$ does too: it is not a multiple of $${m}$.`,
    );
  }
  return {
    claim: `Prove that $${N}$ leaves the same remainder as its digit sum, $${a} + ${b} + ${c}$, on division by $${m}$.`,
    steps,
    pool: [
      {
        text: `$10 \\equiv 0 ${pmod(m)}$, so only the last digit, $${c}$, matters.`,
        why: `$10$ leaves remainder $1$ on division by $${m}$, not $0$.`,
      },
      {
        text: `$${a} \\times 99 + ${b} \\times 9 = 9(${a} \\times 11 + ${b}) + 1$.`,
        why: `$${a} \\times 99 + ${b} \\times 9$ is exactly $9(${a} \\times 11 + ${b})$, with nothing over.`,
      },
      {
        text: `So $${N} = ${a} + ${b} + ${c}$.`,
        why: 'The number and its digit sum are congruent, not equal: they differ by a multiple of $9$.',
      },
    ],
  };
}

const congDigitOrder: Generator<DigitOrderParams> = {
  id: 'cong-digit-order',
  sample(rng, difficulty) {
    for (;;) {
      const N = rng.int(111, 999);
      const [, b, c] = digitsOf(N);
      if (b === 0 || c === 0) continue;
      const m = rng.pick([3, 9]);
      const base: DigitOrderParams = { N, m, difficulty, picks: [] };
      return { ...base, picks: pickDistractors(rng, digitProof(base), difficulty) };
    }
  },
  render: (params) => orderSlide(digitProof(params), params.picks),
  solution: (params) => orderSolution(digitProof(params), params.picks),
};

/* ---------- the remainder from the digit sum ---------- */

type DigitResidueParams = { kind: 'one'; N: number; m: number } | { kind: 'product'; N: number; M: number };

const digitResidue = (params: DigitResidueParams) =>
  params.kind === 'one' ? params.N % params.m : ((params.N % 9) * (params.M % 9)) % 9;

/** Digit sums, repeated until one digit is left, as a chain `478 \to 19 \to 10 \to 1`. */
function sumChain(N: number): number[] {
  const out = [N];
  while (out[out.length - 1] >= 10) out.push(digitSum(out[out.length - 1]));
  return out;
}

const congDigitResidue: Generator<DigitResidueParams> = {
  id: 'cong-digit-residue',
  sample(rng, difficulty) {
    if (difficulty < 2) return { kind: 'one', N: rng.int(101, 999), m: rng.pick([3, 9]) };
    for (;;) {
      const [N, M] = [rng.int(101, 999), rng.int(101, 999)];
      if (N % 9 !== 0 && M % 9 !== 0) return { kind: 'product', N, M };
    }
  },
  choices(params) {
    const answer = digitResidue(params);
    const m = params.kind === 'one' ? params.m : 9;
    const slip = params.kind === 'one' ? digitSum(params.N) : ((params.N % 9) + (params.M % 9)) % 9;
    return intOptions(answer, [slip, (answer + 1) % m, m - answer, (answer + 2) % m], 0);
  },
  render(params) {
    const tex = params.kind === 'one' ? `${params.N}` : `${params.N} \\times ${params.M}`;
    const m = params.kind === 'one' ? params.m : 9;
    return typed(
      [`Use digit sums to find the remainder when $${tex}$ is divided by $${m}$.`],
      '\\text{remainder} =',
      digitResidue(params),
    );
  },
  solution(params) {
    const chainTex = (N: number) => sumChain(N).join(' \\to ');
    if (params.kind === 'one') {
      const { N, m } = params;
      return [
        { text: `A number leaves the same remainder as its digit sum on division by $${m}$, so keep adding digits:` },
        { tex: stackTex(chainTex(N)) },
        { text: `$${sumChain(N).pop()} \\equiv ${N % m} ${pmod(m)}$, so the remainder is $${N % m}$.` },
      ];
    }
    const { N, M } = params;
    const [x, y] = [N % 9, M % 9];
    return [
      { text: 'Reduce each number by its digit sum, then multiply the residues:' },
      { tex: stackTex(chainTex(N)) },
      { tex: stackTex(chainTex(M)) },
      { tex: stackTex(`${x} \\times ${y} = ${x * y} \\equiv ${(x * y) % 9} ${pmod(9)}`) },
    ];
  },
};

/* ---------- casting out nines ---------- */

interface CastParams {
  a: number;
  b: number;
  claim: number;
}

const PASS = 'passes the check';
const FAIL = 'fails the check, so it is wrong';

const congCastFlow: Generator<CastParams> = {
  id: 'cong-cast-flow',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const a = rng.int(12, 99);
      const b = rng.int(12, 99);
      const p = a * b;
      if (p >= 1000 || p < 100) continue;
      const digits = String(p).split('');
      const swapped = Number([digits[0], digits[2], digits[1]].join(''));
      const slips = hard ? [p, p + 9, p - 9, swapped, p + 1] : [p, p, p + 1, p - 1, p + 10, p - 10];
      const claim = rng.pick(slips);
      if (claim < 100 || claim >= 1000) continue;
      return { a, b, claim };
    }
  },
  render({ a, b, claim }) {
    const [ra, rb] = [a % 9, b % 9];
    const must = (ra * rb) % 9;
    const got = claim % 9;
    const key = `${a}|${b}|${claim}`;
    const dollars = (values: number[]) => turned(values.map((v) => `$${v}$`), key);
    const passes = must === got;
    return {
      kind: 'flow',
      prompt: [
        say(
          `Someone worked out $${a} \\times ${b} = ${claim}$. Check it by casting out nines, remainders on division by $9$ from digit sums. Each answer chooses what gets asked next.`,
        ),
      ],
      subject: `${a} \\times ${b} = ${claim}`,
      steps: [
        {
          id: 'must',
          ask: `$${a}$ leaves $${ra}$ and $${b}$ leaves $${rb}$. So the product must leave`,
          branches: dollars(threeLabels(must, [(ra + rb) % 9, ra * rb, (must + 1) % 9])).map((label) => ({ label, to: 'got' })),
        },
        {
          id: 'got',
          ask: `The claimed answer, $${claim}$, leaves`,
          branches: dollars(threeLabels(got, [digitSum(claim), (got + 1) % 9, claim % 10])).map((label) => ({
            label,
            to: 'verdict',
          })),
        },
        {
          id: 'verdict',
          ask: 'So the claim',
          branches: [
            {
              label: PASS,
              outcome: passes
                ? claim === a * b
                  ? 'It passes, and it is right.'
                  : 'It passes, yet it is wrong: swapping digits or an error of $9$ leaves the digit sum alone, so casting out nines cannot catch it.'
                : `$${must}$ and $${got}$ differ, so the answer cannot be right.`,
            },
            {
              label: FAIL,
              outcome: passes ? `Both leave $${must}$, so the check finds nothing wrong.` : 'That is the answer.',
            },
          ],
        },
      ],
      answer: [`$${must}$`, `$${got}$`, passes ? PASS : FAIL],
    };
  },
  solution({ a, b, claim }) {
    const [ra, rb] = [a % 9, b % 9];
    const must = (ra * rb) % 9;
    const got = claim % 9;
    return [
      { tex: stackTex(`${a} \\to ${ra}, \\quad ${b} \\to ${rb}`) },
      { tex: stackTex(`${ra} \\times ${rb} = ${ra * rb} \\equiv ${must} ${pmod(9)}`) },
      { tex: stackTex(sumChain(claim).join(' \\to ') + (got === 0 ? ' \\equiv 0' : '')) },
      {
        text:
          must === got
            ? `Both leave $${must}$, so the claim passes the check${claim === a * b ? '' : `, although the right answer is $${a * b}$: a swap of digits or an error of $9$ slips through`}.`
            : `$${must} \\ne ${got}$, so the claim is wrong. The right answer is $${a * b}$.`,
      },
    ];
  },
};

/* ---------- 10 ≡ 1 in a tiles line ---------- */

interface TenParams {
  N: number;
  m: number;
}

/** The right filling of the tiles line: the residues of 100 and 10, then of N. */
const tenAnswer = ({ N, m }: TenParams) => [1, m === 11 ? -1 : 1, N % m];

/**
 * Whether the answer's tiles and these extras can fill the line
 * `N ≡ a x _ + b x _ + c ≡ _` truly in any way but the right one.
 */
function tenClash({ N, m }: TenParams, extras: number[]): boolean {
  const [a, b, c] = digitsOf(N);
  const right = tenAnswer({ N, m });
  const tokens = [...right, ...extras];
  return tokens.some((x, i) =>
    tokens.some((y, j) =>
      tokens.some(
        (z, k) =>
          i !== j &&
          j !== k &&
          i !== k &&
          !(x === right[0] && y === right[1] && z === right[2]) &&
          mod(a * x + b * y + c - N, m) === 0 &&
          mod(z - N, m) === 0,
      ),
    ),
  );
}

const congTenTiles: Generator<TenParams> = {
  id: 'cong-ten-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const N = rng.int(111, 999);
      const [a, b, c] = digitsOf(N);
      const m = difficulty >= 2 ? 11 : 9;
      // A digit that is a multiple of m would let any tile beside it make a
      // true line, so the tiles would stop meaning anything.
      if (c === 0 || a % m === 0 || b % m === 0 || tenClash({ N, m }, [])) continue;
      return { N, m };
    }
  },
  render({ N, m }) {
    const [a, b, c] = digitsOf(N);
    const answer = tenAnswer({ N, m }).map(String);
    // A tile that makes another true line is left out: the line is graded by
    // the one filling it names.
    const chosen: number[] = [];
    for (const value of [0, 10, -1, 2, 100, 9, (N % m) + 1, digitSum(N), mod(N % m - 1, m), a + b + c + 1, ...range(3, 8)]) {
      if (chosen.length >= 4 || answer.includes(String(value)) || chosen.includes(value)) continue;
      if (!tenClash({ N, m }, [...chosen, value])) chosen.push(value);
    }
    return {
      kind: 'tiles',
      prompt: [
        say(`$${N} = ${a} \\times 100 + ${b} \\times 10 + ${c}$.`),
        say(`Replace $100$ and $10$ by their residues modulo $${m}$, then find the residue of $${N}$.`),
      ],
      template: `${N} \\equiv ${a} \\times {0} + ${b} \\times {1} + ${c} \\equiv {2} ${bmod(m)}`,
      bank: fillBank(answer, chosen.map(String), 2),
      answer,
    };
  },
  solution({ N, m }) {
    const [a, b, c] = digitsOf(N);
    if (m === 11) {
      return [
        { text: '$10 = 11 - 1$, so $10 \\equiv -1$ and $100 = 10 \\times 10 \\equiv 1 \\pmod{11}$.' },
        { tex: stackTex(`${N} \\equiv ${a} - ${b} + ${c} = ${a - b + c}`) },
        { text: `$${a - b + c} \\equiv ${N % 11} \\pmod{11}$: the alternating sum of the digits gives the residue.` },
      ];
    }
    return [
      { text: `$10 = 9 + 1$ and $100 = 99 + 1$ both leave $1$ on division by $${m}$.` },
      { tex: stackTex(`${N} \\equiv ${a} + ${b} + ${c} = ${a + b + c}`) },
      { text: `$${a + b + c} \\equiv ${N % m} ${pmod(m)}$.` },
    ];
  },
};

/* ---------- the missing digit ---------- */

interface MissingParams {
  digits: number[];
  hole: number;
  /** The remainder on division by 9 the number is to leave. */
  r: number;
}

/** Digits 0 to 9 that make the number leave r on division by 9. */
const fits = ({ digits, hole, r }: MissingParams) =>
  range(hole === 0 ? 1 : 0, 9).filter((d) => {
    const trial = digits.map((x, i) => (i === hole ? d : x));
    return trial.reduce((s, x) => s + x, 0) % 9 === r;
  });

const shownTex = ({ digits, hole }: MissingParams) => digits.map((d, i) => (i === hole ? '\\square' : String(d))).join('');

const congMissingDigit: Generator<MissingParams> = {
  id: 'cong-missing-digit',
  sample(rng, difficulty) {
    for (;;) {
      const digits = [rng.int(1, 9), rng.int(0, 9), rng.int(0, 9)];
      const hole = rng.int(difficulty >= 2 ? 0 : 1, 2);
      const r = difficulty >= 2 ? rng.int(1, 8) : 0;
      const params = { digits, hole, r };
      const found = fits(params);
      // Exactly one digit fits, and it is the one taken out.
      if (found.length !== 1 || found[0] !== digits[hole]) continue;
      return params;
    }
  },
  choices(params) {
    const answer = params.digits[params.hole];
    const slips = range(0, 9)
      .filter((d) => d !== answer)
      .sort((x, y) => Math.abs(x - answer) - Math.abs(y - answer));
    return intOptions(answer, [(answer + 3) % 9, ...slips], 0, 9);
  },
  render(params) {
    const shown = shownTex(params);
    return typed(
      [
        params.r === 0
          ? `The three-digit number $${shown}$ is divisible by $9$. What is the missing digit?`
          : `The three-digit number $${shown}$ leaves remainder $${params.r}$ when divided by $9$. What is the missing digit?`,
      ],
      '\\square =',
      params.digits[params.hole],
    );
  },
  solution(params) {
    const { digits, hole, r } = params;
    const known = digits.filter((_, i) => i !== hole).reduce((s, x) => s + x, 0);
    const d = digits[hole];
    return [
      { text: `A number leaves the same remainder on division by $9$ as its digit sum. The digits shown add to $${known}$.` },
      {
        text:
          r === 0
            ? `The digit sum has to be a multiple of $9$, and the only digit that makes one is $${d}$: $${known} + ${d} = ${known + d}$.`
            : `The digit sum has to leave $${r}$, and the only digit that does it is $${d}$: $${known} + ${d} = ${known + d} \\equiv ${r} ${pmod(9)}$.`,
      },
      { text: `The number is $${digits.join('')}$.` },
    ];
  },
};

export const numberModularGenerators = [
  congResidue,
  congNegative,
  congTrue,
  congClassTable,
  congFlow,
  congCombineSteps,
  congFromResidues,
  congOpTable,
  congArithOrder,
  congPowerTable,
  congCycle,
  congBigPower,
  congPowerFlow,
  congSquareTree,
  congLastProduct,
  congLastPower,
  congLastTiles,
  congLastTwo,
  congLastSquare,
  congDigitOrder,
  congDigitResidue,
  congCastFlow,
  congTenTiles,
  congMissingDigit,
];

/** The order generators, for the reducer harness in `proofOrder.test.ts`. */
export const numberModularOrders = [congArithOrder, congDigitOrder];

/** The arithmetic behind the slides, for `numberModular.test.ts`. */
export const modularTesting = { cycleOf, powerOf, digitSum, sumChain, SHORT_ENDINGS };
