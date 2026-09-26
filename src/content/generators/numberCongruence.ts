/**
 * Number & Proof, level 9: Linear Congruences and Inverses.
 *
 * The inverse of a modulo n is the b with ab ≡ 1: read off the row of
 * multiples for a small n, and it exists exactly when HCF(a, n) = 1. For a
 * bigger n, Euclid's algorithm worked backwards (level 5, `numberEuclid.ts`)
 * gives 1 = un + va, and modulo n the un drops out, so v, reduced, is the
 * inverse. Then ax ≡ b is solved by multiplying both sides by the inverse and
 * checked by substituting; when d = HCF(a, n) is not 1 there is no solution
 * unless d divides b, and otherwise a, b and n are divided by d, giving d
 * solutions modulo n. The last lesson is the trap that follows: cancelling a
 * common factor keeps the modulus only when that factor is coprime to it, so
 * 6x ≡ 6 (mod 9) is x ≡ 1 (mod 3), not x ≡ 1 (mod 9); and short stories
 * that come down to a linear congruence.
 *
 * Every number on the page is under 1000, as in levels 5 and 6: a product
 * that a solution quotes is refused at the draw when it would pass that. A
 * congruence, a line of working or a set of solutions is a *form*, so it goes
 * through tiles, a table, an order, a flow or a choice; only a single whole
 * number (an inverse, a solution, a count) is typed (PITFALLS 3.4). Wherever
 * tiles could make a second true line, a tile is refused by comparing the
 * whole-number solutions of the two congruences, not their spelling.
 *
 * Nothing here is calculus, so no slide declares `source`.
 * `numberCongruence.test.ts` reads the numbers each prompt states and checks
 * every inverse, solution and count against a brute-force search of its own.
 */
import type { Block, ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { choiceSlide, fillBank, mod, orderSlide, orderSolution, pickDistractors, stackTex, turned, type Proof } from './numberProof';
import { backLines, buildUp, comboTex, runOf, type Division } from './numberEuclid';
import { gcd, say } from './format';
import { treeBank } from './parametricImplicit';

/* ---------- shared helpers ---------- */

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** `(mod n)` for prose, displays and choice labels. Never inside a tiles template. */
const pmod = (n: number) => `\\pmod{${n}}`;

/** `k \times n`, or just `n` when k is 1. */
const times = (k: number, n: number) => (k === 1 ? `${n}` : `${k} \\times ${n}`);

/** `k \times n` for a signed k, as a term on its own: `43`, `-43`, `-3 \times 43`. */
const termTex = (k: number, n: number) => (k === 1 ? `${n}` : k === -1 ? `-${n}` : `${k} \\times ${n}`);

/** `x ≡ k × b = kb ≡ x`, dropping whichever parts say nothing. */
function multiplyTex(k: number, b: number, x: number): string {
  if (k === 1) return b === x ? `x \\equiv ${b}` : `x \\equiv ${b} \\equiv ${x}`;
  return k * b === x ? `x \\equiv ${k} \\times ${b} = ${x}` : `x \\equiv ${k} \\times ${b} = ${k * b} \\equiv ${x}`;
}

/** `ax`, or `x` when a is 1. */
const xTerm = (a: number) => (a === 1 ? 'x' : `${a}x`);

/** `ax ≡ b (mod n)`. */
const congTex = (a: number, b: number, n: number) => `${xTerm(a)} \\equiv ${b} ${pmod(n)}`;

const hcfTex = (a: number, n: number) => `\\text{HCF}(${a}, ${n})`;

const maths = (tex: string): Block => ({ kind: 'display', tex });

const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** The b from 1 to n - 1 with ab ≡ 1 (mod n). Throws when there is none. */
function inverseOf(a: number, n: number): number {
  const r = mod(a, n);
  for (let b = 1; b < n; b += 1) if ((r * b) % n === 1) return b;
  throw new Error(`inverseOf: ${a} has no inverse modulo ${n}`);
}

/** Every x from 0 to limit - 1 with ax ≡ b (mod n). */
function solutionsOf(a: number, b: number, n: number, limit = n): number[] {
  return range(0, limit - 1).filter((x) => mod(a * x - b, n) === 0);
}

/** Whether two congruences ax ≡ b (mod n) are true for exactly the same whole numbers x. */
function sameSolutions([a1, b1, n1]: number[], [a2, b2, n2]: number[]): boolean {
  if (n1 < 2 || n2 < 2) return false;
  const top = lcm(n1, n2);
  for (let x = 0; x < top; x += 1) {
    if ((mod(a1 * x - b1, n1) === 0) !== (mod(a2 * x - b2, n2) === 0)) return false;
  }
  return true;
}

/**
 * Whether some filling of the blanks from these tokens other than `answer`
 * makes a true line: tokens are used at most once each, as tiles are.
 */
function anotherFilling(tokens: number[], answer: number[], holds: (values: number[]) => boolean): boolean {
  const pick = (chosen: number[]): boolean => {
    if (chosen.length === answer.length) {
      const values = chosen.map((i) => tokens[i]);
      if (values.every((v, j) => v === answer[j])) return false;
      return holds(values);
    }
    for (let i = 0; i < tokens.length; i += 1) {
      if (!chosen.includes(i) && pick([...chosen, i])) return true;
    }
    return false;
  };
  return pick([]);
}

/**
 * Tiles for `answer`: slips that cannot make a second true line, at most
 * four. Undefined when the answer's own tiles already make a second line, as
 * 2x ≡ 1 (mod 3) does with 1x ≡ 2, or fewer than two slips survive: the
 * sampler then draws again.
 */
function soleTiles(answer: number[], slips: number[], holds: (values: number[]) => boolean): string[] | undefined {
  if (anotherFilling(answer, answer, holds)) return undefined;
  const chosen: number[] = [];
  for (const value of slips) {
    if (chosen.length >= 4) break;
    if (!Number.isInteger(value) || value < 0 || value >= 1000) continue;
    if (answer.includes(value) || chosen.includes(value)) continue;
    if (anotherFilling([...answer, ...chosen, value], answer, holds)) continue;
    chosen.push(value);
  }
  return chosen.length < 2 ? undefined : fillBank(answer.map(String), chosen.map(String), 2);
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

/** Three distinct whole numbers in [lo, hi], the right one first, for a flow step. */
function three(correct: number, slips: number[], lo = 0, hi = 999): number[] {
  const out = [correct];
  for (const value of [...slips, ...near(correct, 12)]) {
    if (out.length === 3) break;
    if (!Number.isInteger(value) || value < lo || value > hi || out.includes(value)) continue;
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

/** A whole number in an expression slide: `keypad: []`, compared exactly. */
function typed(prompt: Block[], lead: string, answer: number) {
  return {
    kind: 'expression' as const,
    prompt,
    lead,
    keypad: [],
    answer: String(answer),
    domain: 'real' as const,
    mode: 'exact' as const,
  };
}

/** `$3$, $6$, $2$`: a list the reader's line can wrap in. */
const listTex = (values: number[]) => values.map((v) => `$${v}$`).join(', ');

/* ================================================================
 * Lesson 1: inverses mod n
 * ================================================================ */

interface ModParams {
  a: number;
  n: number;
}

/** The residues of a, 2a, 3a, ..., (n - 1)a modulo n. */
const rowOf = (a: number, n: number) => range(1, n - 1).map((k) => (k * mod(a, n)) % n);

/** The inverse found by going along the row of multiples. */
function rowSolution(a: number, n: number): SolutionStep[] {
  const ra = mod(a, n);
  const inv = inverseOf(a, n);
  const q = Math.floor((ra * inv) / n);
  return [
    ...(a >= n ? [{ tex: stackTex(`${a} \\equiv ${ra} ${pmod(n)}`) }] : []),
    {
      text: `Go along the multiples of $${ra}$ modulo $${n}$, adding $${ra}$ each time and reducing, until you reach $1$: ${listTex(rowOf(a, n).slice(0, inv))}.`,
    },
    { tex: stackTex(`${ra} \\times ${inv} = ${ra * inv} = ${times(q, n)} + 1`) },
    { text: `So $${ra} \\times ${inv} \\equiv 1 ${pmod(n)}$: the inverse is $${inv}$.` },
  ];
}

const lcongInverseRow: Generator<ModParams> = {
  id: 'lcong-inverse-row',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(7, 13) : rng.int(5, 13);
      const a = hard ? rng.int(n + 2, 60) : rng.int(2, n - 2);
      const r = mod(a, n);
      if (gcd(a, n) !== 1 || r <= 1 || r === n - 1) continue;
      return { a, n };
    }
  },
  render({ a, n }) {
    const row = rowOf(a, n);
    const hard = a >= n;
    const answer = hard ? row : row.slice(1);
    return {
      kind: 'table',
      prompt: [
        say(
          hard
            ? `Fill in the multiples of $${a}$ modulo $${n}$. Reduce $${a}$ first; after that each row is the one above plus that residue, reduced.`
            : `Fill in the multiples of $${a}$ modulo $${n}$: each row is the one above plus $${a}$, reduced.`,
        ),
      ],
      columns: ['k', `${a}k \\bmod ${n}`],
      rows: row.map((x, i) => [String(i + 1), hard || i > 0 ? null : String(x)]),
      bank: tableBank(answer, [0, n, hard ? a : n + a], n + 1),
      answer: answer.map(String),
    };
  },
  solution({ a, n }) {
    const ra = mod(a, n);
    const inv = inverseOf(a, n);
    return [
      ...(a >= n ? [{ tex: stackTex(`${a} \\equiv ${ra} ${pmod(n)}`) }] : []),
      { text: `Start at $${ra}$ and add $${ra}$ each time, taking away $${n}$ whenever the total reaches $${n}$ or more:` },
      { text: `${listTex(rowOf(a, n))}.` },
      { text: `The $1$ is in row $${inv}$, so $${a} \\times ${inv} \\equiv 1 ${pmod(n)}$: the inverse of $${a}$ is $${inv}$.` },
    ];
  },
};

const lcongInverse: Generator<ModParams> = {
  id: 'lcong-inverse',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(14, 23) : rng.int(5, 13);
      const a = rng.int(2, n - 2);
      if (gcd(a, n) === 1) return { a, n };
    }
  },
  choices({ a, n }) {
    const inv = inverseOf(a, n);
    return intOptions(inv, [n - inv, a, mod(inv + 1, n), mod(inv - 1, n)], 1, n - 1);
  },
  render({ a, n }) {
    return typed(
      [say(`Find the inverse of $${a}$ modulo $${n}$: the number $b$ from $1$ to $${n - 1}$ with $${a}b \\equiv 1 ${pmod(n)}$.`)],
      'b =',
      inverseOf(a, n),
    );
  },
  solution: ({ a, n }) => rowSolution(a, n),
};

/* ---------- a table of inverses ---------- */

interface InverseTableParams {
  n: number;
  blanks: number[];
}

/** The numbers from 1 to n - 1 that have an inverse modulo n. */
const unitsOf = (n: number) => range(1, n - 1).filter((u) => gcd(u, n) === 1);

const lcongInverseTable: Generator<InverseTableParams> = {
  id: 'lcong-inverse-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const n = hard ? rng.pick([9, 13, 14, 15, 16]) : rng.pick([7, 11]);
    const pool = unitsOf(n).filter((u) => u !== 1);
    const count = hard ? 5 : n === 7 ? 3 : 4;
    return { n, blanks: rng.sample(pool, count).sort((x, y) => x - y) };
  },
  render({ n, blanks }) {
    const units = unitsOf(n);
    const answer = blanks.map((u) => inverseOf(u, n));
    const prime = units.length === n - 1;
    return {
      kind: 'table',
      prompt: [
        say(
          prime
            ? `Fill in the inverse of each number modulo $${n}$.`
            : `Only the numbers whose HCF with $${n}$ is $1$ have an inverse, so only they are listed. Fill in each inverse modulo $${n}$.`,
        ),
      ],
      columns: ['a', `\\text{inverse mod } ${n}`],
      rows: units.map((u) => [String(u), blanks.includes(u) ? null : String(inverseOf(u, n))]),
      bank: tableBank(answer, [0, n, ...blanks.map((u) => n - inverseOf(u, n))], n + 1),
      answer: answer.map(String),
    };
  },
  solution({ n, blanks }) {
    return [
      { text: 'Inverses come in pairs: if $a \\times b \\equiv 1$, each is the inverse of the other.' },
      ...blanks.map((u) => {
        const inv = inverseOf(u, n);
        return { tex: stackTex(`${u} \\times ${inv} = ${u * inv} \\equiv 1`) };
      }),
    ];
  },
};

/* ---------- which has an inverse ---------- */

interface HasParams {
  n: number;
  right: number;
  wrong: number[];
}

const HAS_MODULI = [8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22];

const lcongHasInverse: Generator<HasParams> = {
  id: 'lcong-has-inverse',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(24, 99) : rng.pick(HAS_MODULI);
      const units = range(2, n - 2).filter((c) => gcd(c, n) === 1);
      const others = range(2, n - 1).filter((c) => gcd(c, n) > 1);
      if (units.length === 0 || others.length < 3) continue;
      return { n, right: rng.pick(units), wrong: rng.sample(others, 3).sort((x, y) => x - y) };
    }
  },
  render({ n, right, wrong }) {
    return choiceSlide([say(`Which of these has an inverse modulo $${n}$?`)], String(right), wrong.map(String));
  },
  solution({ n, right, wrong }) {
    return [
      { text: `A number has an inverse modulo $${n}$ exactly when its HCF with $${n}$ is $1$.` },
      ...[right, ...wrong]
        .sort((x, y) => x - y)
        .map((c) => ({ text: `$${hcfTex(c, n)} = ${gcd(c, n)}$` })),
      { text: `Only $${right}$ has HCF $1$ with $${n}$; its inverse is $${inverseOf(right, n)}$.` },
    ];
  },
};

/* ---------- does it have one, and what is it ---------- */

const lcongInverseFlow: Generator<ModParams> = {
  id: 'lcong-inverse-flow',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const want = rng.chance(0.5);
    for (;;) {
      const n = hard ? rng.int(16, 30) : rng.int(6, 15);
      const a = rng.int(2, n - 1);
      if ((gcd(a, n) === 1) === want) return { a, n };
    }
  },
  render({ a, n }) {
    const h = gcd(a, n);
    const key = `${a}|${n}`;
    const hcfLabels = three(h, [h === 1 ? 2 : 1, a, n - a, 2 * h], 1, n).map((v) => `$${v}$`);
    const inv = h === 1 ? inverseOf(a, n) : 0;
    const findValues = h === 1 ? three(inv, [n - inv, a, mod(inv + 1, n)], 1, n - 1) : three(n - a, [a, 1, 2], 1, n - 1);
    return {
      kind: 'flow',
      prompt: [say(`Does $${a}$ have an inverse modulo $${n}$? Each answer chooses what gets asked next.`)],
      subject: `${a}b \\equiv 1 ${pmod(n)}`,
      steps: [
        {
          id: 'hcf',
          ask: `First, the HCF of $${a}$ and $${n}$ is`,
          branches: turned(hcfLabels, key).map((label) => ({ label, to: 'exists' })),
        },
        {
          id: 'exists',
          ask: `So does $${a}$ have an inverse modulo $${n}$?`,
          branches: [
            { label: 'Yes', to: 'find' },
            { label: 'No', outcome: h === 1 ? 'The HCF is $1$, so it does.' : 'That is the answer.' },
          ],
        },
        {
          id: 'find',
          ask: 'Its inverse is',
          branches: turned(findValues, key).map((v) => ({
            label: `$${v}$`,
            outcome:
              h > 1
                ? `Every multiple of $${a}$ and of $${n}$ is a multiple of $${h}$, so nothing makes $${a}b$ one more than a multiple of $${n}$.`
                : v === inv
                  ? 'That is the answer.'
                  : `$${a} \\times ${v} = ${a * v}$, which is not $1$ more than a multiple of $${n}$.`,
          })),
        },
      ],
      answer: h === 1 ? ['$1$', 'Yes', `$${inv}$`] : [`$${h}$`, 'No'],
    };
  },
  solution({ a, n }) {
    const h = gcd(a, n);
    if (h > 1) {
      return [
        { text: `$${hcfTex(a, n)} = ${h}$.` },
        {
          text: `$${a}b$ and every multiple of $${n}$ are multiples of $${h}$, so $${a}b$ is never $1$ more than a multiple of $${n}$: there is no inverse.`,
        },
      ];
    }
    return [{ text: `$${hcfTex(a, n)} = 1$, so there is an inverse.` }, ...rowSolution(a, n)];
  },
};

/* ================================================================
 * Lesson 2: inverses by Euclid
 * ================================================================ */

/** 1 = un + va, from working the run for n and a backwards. */
function bezoutLine(a: number, n: number): { u: number; v: number } {
  const lines = backLines(runOf(n, a));
  const { u, v } = lines[lines.length - 1];
  return { u, v };
}

/**
 * n > a, coprime, whose run for n and a takes one of `lengths` divisions (the
 * last leaving 0), with n from a quarter of `maxN` up to it, and both terms of the backwards line
 * under 1000.
 */
function sampleCoprime(rng: Rng, lengths: number[], maxN: number): ModParams {
  for (;;) {
    const m = rng.pick(lengths);
    const qs = Array.from({ length: m }, (_, i) => (i === m - 1 ? rng.int(2, 5) : rng.int(1, i === 0 ? 9 : 4)));
    const [n, a] = buildUp(1, qs);
    // Not so small that the row of multiples would be quicker than Euclid.
    if (n >= maxN || n < maxN / 4 || a < 3) continue;
    const { u, v } = bezoutLine(a, n);
    if (Math.abs(u * n) >= 1000 || Math.abs(v * a) >= 1000) continue;
    return { a, n };
  }
}

/** The run down to the remainder 1, one division to a line. */
function runTex(divisions: Division[]): string {
  return `\\begin{aligned} ${divisions.map(({ a, b, q, r }) => `${a} &= ${q} \\times ${b} + ${r}`).join(' \\\\ ')} \\end{aligned}`;
}

/** `130 - 129 = 1`: a backwards line multiplied out. */
function lineValue(u: number, P: number, v: number, Q: number): string {
  const [x, y] = [u * P, v * Q];
  return `${Math.max(x, y)} - ${Math.abs(Math.min(x, y))} = ${x + y}`;
}

function euclidSolution({ a, n }: ModParams): SolutionStep[] {
  const run = runOf(n, a);
  const lines = backLines(run);
  const { u, v } = lines[lines.length - 1];
  const inv = mod(v, n);
  return [
    { text: 'Run the algorithm down to the remainder $1$:' },
    { tex: runTex(run.slice(0, -1)) },
    { text: 'Work it backwards, putting in one remainder at a time:' },
    ...lines.map((line) => ({ tex: `1 = ${comboTex(line.u, line.P, line.v, line.Q)}` })),
    {
      text: `Modulo $${n}$ the term in $${n}$ is $\\equiv 0$, so $${v} \\times ${a} \\equiv 1$${v < 0 ? `, and $${v} + ${n} = ${inv}$` : ''}. The inverse is $${inv}$.`,
    },
    { text: `Check: $${lineValue(v, a, u, n)}$.` },
  ];
}

const lcongFromBezout: Generator<ModParams> = {
  id: 'lcong-from-bezout',
  // Three divisions always leave the number beside a positive, four always
  // negative, so difficulty 2 is the one that has to add n.
  sample: (rng, difficulty) => (difficulty >= 2 ? sampleCoprime(rng, [4], 200) : sampleCoprime(rng, [3], 100)),
  render({ a, n }) {
    const { u, v } = bezoutLine(a, n);
    return typed(
      [
        say(`Working Euclid's algorithm backwards for $${n}$ and $${a}$ gave`),
        maths(`1 = ${comboTex(v, a, u, n)}`),
        say(`Find the inverse of $${a}$ modulo $${n}$, from $1$ to $${n - 1}$.`),
      ],
      '\\text{inverse} =',
      mod(v, n),
    );
  },
  solution({ a, n }) {
    const { u, v } = bezoutLine(a, n);
    const inv = mod(v, n);
    return [
      { text: `$${times(Math.abs(u), n)}$ is a multiple of $${n}$, so modulo $${n}$ it is $\\equiv 0$ and drops out:` },
      { tex: `${v} \\times ${a} \\equiv 1 ${pmod(n)}` },
      {
        text:
          v < 0
            ? `$${v}$ is negative, so add $${n}$: $${v} + ${n} = ${inv}$. The inverse is $${inv}$.`
            : `So the inverse of $${a}$ is $${inv}$.`,
      },
    ];
  },
};

/* ---------- the whole method, as steps to order ---------- */

interface OrderParams extends ModParams {
  hard: boolean;
  picks: number[];
}

/**
 * The run and the working back, one step to a line. At difficulty 1 (three
 * divisions) the divisions are steps too; at difficulty 2 the run is longer,
 * so the proof starts from the line leaving 1 (each substitution still names
 * the division it undoes) and closes with a check, keeping it to five or six
 * steps.
 */
function euclidProof({ a, n, hard }: ModParams & { hard: boolean }): Proof {
  const run = runOf(n, a);
  const lines = backLines(run);
  const top = run[run.length - 2];
  const { u, v } = lines[lines.length - 1];
  const inv = mod(v, n);
  const steps = [
    ...(hard ? [] : run.slice(0, -1).map((d) => `Divide: $${d.a} = ${d.q} \\times ${d.b} + ${d.r}$.`)),
    hard
      ? `Rearrange $${top.a} = ${times(top.q, top.b)} + 1$: $1 = ${comboTex(1, top.a, -top.q, top.b)}$.`
      : `Rearrange the last division: $1 = ${comboTex(1, top.a, -top.q, top.b)}$.`,
    ...lines.slice(1).map((line, k) => {
      const d = run[run.length - 3 - k];
      return `Put in $${d.r} = ${d.a} - ${times(d.q, d.b)}$: $1 = ${comboTex(line.u, line.P, line.v, line.Q)}$.`;
    }),
    v < 0
      ? `So $${v} \\times ${a} \\equiv 1 ${pmod(n)}$, and the inverse is $${v} + ${n} = ${inv}$.`
      : `So $${v} \\times ${a} \\equiv 1 ${pmod(n)}$, and the inverse is $${inv}$.`,
    ...(hard ? [`Check: $${inv} \\times ${a} = ${inv * a} = ${times(Math.floor((inv * a) / n), n)} + 1$.`] : []),
  ];
  const first = lines[1];
  const d = run[run.length - 3];
  const pool = [
    {
      text: hard
        ? `Rearrange $${top.a} = ${times(top.q, top.b)} + 1$: $1 = ${top.a} + ${times(top.q, top.b)}$.`
        : `Rearrange the last division: $1 = ${top.a} + ${times(top.q, top.b)}$.`,
      why: `Taking $${times(top.q, top.b)}$ from both sides leaves $1 = ${comboTex(1, top.a, -top.q, top.b)}$.`,
    },
    {
      text: `Put in $${d.r} = ${d.a} - ${times(d.q, d.b)}$: $1 = ${comboTex(first.u, first.P, -first.v, first.Q)}$.`,
      why: 'Multiplied out, that line does not come to $1$: the bracket is taken away, so both its terms change sign.',
    },
  ];
  if (mod(u, n) !== inv) {
    pool.push({
      text: `So the inverse of $${a}$ is $${mod(u, n)}$.`,
      why: `$${u}$ is the number beside $${n}$, and that whole term is $\\equiv 0$; the inverse is the number beside $${a}$.`,
    });
  }
  return {
    claim: hard
      ? `Euclid's algorithm for $${n}$ and $${a}$ ends on the remainder $1$. Work it backwards to find the inverse of $${a}$ modulo $${n}$.`
      : `Use Euclid's algorithm to find the inverse of $${a}$ modulo $${n}$.`,
    steps,
    pool,
  };
}

const lcongEuclidOrder: Generator<OrderParams> = {
  id: 'lcong-euclid-order',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const base = hard ? { ...sampleCoprime(rng, [4, 5], 200), hard } : { ...sampleCoprime(rng, [3], 100), hard };
      // The check quotes the inverse times a, which stays under 1000.
      if (hard && mod(bezoutLine(base.a, base.n).v, base.n) * base.a >= 1000) continue;
      return { ...base, picks: pickDistractors(rng, euclidProof(base), difficulty) };
    }
  },
  render: (params) => orderSlide(euclidProof(params), params.picks),
  solution: (params) => orderSolution(euclidProof(params), params.picks),
};

const lcongEuclidInverse: Generator<ModParams> = {
  id: 'lcong-euclid-inverse',
  sample: (rng, difficulty) => (difficulty >= 2 ? sampleCoprime(rng, [4, 5], 300) : sampleCoprime(rng, [3], 100)),
  choices({ a, n }) {
    const { u, v } = bezoutLine(a, n);
    const inv = mod(v, n);
    return intOptions(inv, [mod(u, n), n - inv, Math.abs(v), inv + 1], 1, n - 1);
  },
  render({ a, n }) {
    return typed(
      [say(`Use Euclid's algorithm to find the inverse of $${a}$ modulo $${n}$, from $1$ to $${n - 1}$.`)],
      '\\text{inverse} =',
      mod(bezoutLine(a, n).v, n),
    );
  },
  solution: euclidSolution,
};

/* ---------- reading the backwards line ---------- */

const lcongReduceFlow: Generator<ModParams> = {
  id: 'lcong-reduce-flow',
  sample: (rng, difficulty) => (difficulty >= 2 ? sampleCoprime(rng, [3, 4, 5], 200) : sampleCoprime(rng, [3, 4], 60)),
  render({ a, n }) {
    const { u, v } = bezoutLine(a, n);
    const inv = mod(v, n);
    const key = `${a}|${n}`;
    const zero = `$${termTex(u, n)} \\equiv 0$`;
    const falseZeros = [u, 1, u + 1, -1, 2]
      .filter((c, i, all) => mod(c, n) !== 0 && all.indexOf(c) === i)
      .slice(0, 2)
      .map((c) => `$${termTex(u, n)} \\equiv ${c}$`);
    const coefs = [v, ...[u, -v, v + 1, v - 1].filter((c) => mod(c - v, n) !== 0)]
      .filter((c, i, all) => all.indexOf(c) === i)
      .slice(0, 3);
    const residues = three(inv, [Math.abs(v), n - inv, mod(u, n), inv + 1], 1, n - 1);
    return {
      kind: 'flow',
      prompt: [
        say(`Working Euclid's algorithm backwards for $${n}$ and $${a}$ gave this line. Each answer chooses what gets asked next.`),
      ],
      subject: `1 = ${comboTex(v, a, u, n)}`,
      steps: [
        {
          id: 'drop',
          ask: `Modulo $${n}$, the term with $${n}$ in it is`,
          branches: turned([zero, ...falseZeros], key).map((label) => ({ label, to: 'coef' })),
        },
        {
          id: 'coef',
          ask: `So $${a}$ times which number is $\\equiv 1 ${pmod(n)}$?`,
          branches: turned(coefs, key).map((c) => ({ label: `$${c}$`, to: 'residue' })),
        },
        {
          id: 'residue',
          ask: `As a number from $1$ to $${n - 1}$, the inverse is`,
          branches: turned(residues, key).map((r) => ({
            label: `$${r}$`,
            outcome: r === inv ? 'That is the answer.' : `$${r}$ is not $\\equiv ${v} ${pmod(n)}$.`,
          })),
        },
      ],
      answer: [zero, `$${v}$`, `$${inv}$`],
    };
  },
  solution({ a, n }) {
    const { u, v } = bezoutLine(a, n);
    const inv = mod(v, n);
    return [
      { text: `$${termTex(u, n)}$ is a multiple of $${n}$, so it is $\\equiv 0$ and drops out, leaving` },
      { tex: `${v} \\times ${a} \\equiv 1 ${pmod(n)}` },
      {
        text:
          v < 0
            ? `$${v}$ is negative; add $${n}$ to bring it into range: $${v} + ${n} = ${inv}$.`
            : `$${v}$ is already between $1$ and $${n - 1}$, so the inverse is $${inv}$.`,
      },
    ];
  },
};

/* ---------- the table with only the y column ---------- */

interface YRow {
  q?: number;
  r: number;
  y: number;
}

/** Each remainder is nx + ay; only y is kept, each row the one two up less q times the one above. */
function yRows(a: number, n: number): YRow[] {
  const rows: YRow[] = [
    { r: n, y: 0 },
    { r: a, y: 1 },
  ];
  for (const { q, r } of runOf(n, a).slice(0, -1)) {
    const [two, one] = rows.slice(-2);
    rows.push({ q, r, y: two.y - q * one.y });
  }
  return rows;
}

const lcongEuclidTable: Generator<ModParams> = {
  id: 'lcong-euclid-table',
  sample: (rng, difficulty) => (difficulty >= 2 ? sampleCoprime(rng, [4, 5], 300) : sampleCoprime(rng, [3, 4], 100)),
  render({ a, n }) {
    const rows = yRows(a, n);
    const answer = rows.slice(2).map(({ y }) => y);
    const slips = rows.slice(2).flatMap((row, i) => [-row.y, rows[i].y + row.q! * rows[i + 1].y]);
    return {
      kind: 'table',
      prompt: [
        say(`Euclid's algorithm for $${n}$ and $${a}$. Each $r$ is $${n}x + ${a}y$, and only $y$ matters modulo $${n}$.`),
        say('Each new $y$ is the $y$ two rows up, take $q$ times the $y$ one row up. Fill in $y$.'),
      ],
      columns: ['q', 'r', 'y'],
      rows: rows.map((row, i) => (i < 2 ? ['', String(row.r), String(row.y)] : [String(row.q), String(row.r), null])),
      bank: treeBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution({ a, n }) {
    const rows = yRows(a, n);
    const last = rows[rows.length - 1];
    const inv = mod(last.y, n);
    return [
      ...rows.slice(2).map((row, i) => ({
        text: `$r = ${row.r}$: $y = ${rows[i].y} - ${row.q} \\times ${rows[i + 1].y < 0 ? `(${rows[i + 1].y})` : rows[i + 1].y} = ${row.y}$`,
      })),
      {
        text: `The last row has $r = 1$, so $${last.y} \\times ${a} \\equiv 1 ${pmod(n)}$${last.y < 0 ? `, and $${last.y} + ${n} = ${inv}$` : ''}: the inverse of $${a}$ is $${inv}$.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 3: solving ax ≡ b (mod n)
 * ================================================================ */

interface SolveParams {
  a: number;
  b: number;
  n: number;
}

/**
 * ax ≡ b with a coprime to n, b not a whole multiple of a (so dividing is no
 * shortcut), and every product the working quotes under 1000.
 */
function sampleSolve(rng: Rng, lo: number, hi: number): SolveParams {
  for (;;) {
    const n = rng.int(lo, hi);
    const a = rng.int(2, n - 1);
    const b = rng.int(1, n - 1);
    if (gcd(a, n) !== 1 || b % a === 0) continue;
    const k = inverseOf(a, n);
    const x = mod(k * b, n);
    if (k * b < n || k * b >= 1000 || a * x >= 1000 || a * k >= 1000) continue;
    return { a, b, n };
  }
}

const solveAt = (rng: Rng, difficulty: number) => (difficulty >= 2 ? sampleSolve(rng, 14, 40) : sampleSolve(rng, 5, 13));

function solveSolution({ a, b, n }: SolveParams): SolutionStep[] {
  const k = inverseOf(a, n);
  const x = mod(k * b, n);
  return [
    { text: `$${a} \\times ${k} = ${a * k} \\equiv 1$, so the inverse of $${a}$ is $${k}$. Multiply both sides by it:` },
    { tex: stackTex(`x \\equiv ${k} \\times ${b} = ${k * b} \\equiv ${x}`) },
    { text: `Check: $${a} \\times ${x} = ${a * x} \\equiv ${b} ${pmod(n)}$.` },
  ];
}

function solveBank({ a, b, n }: SolveParams): string[] | undefined {
  const k = inverseOf(a, n);
  const x = mod(k * b, n);
  // A second tile worth x modulo n would make a second true line.
  const slips = [a * b, mod(a * b, n), mod(x + 1, n), mod(x - 1, n), n - x, k * b + 1, k * b - 1, k + b, b].filter(
    (value) => mod(value - x, n) !== 0,
  );
  return soleTiles([k * b, x], slips, ([p, r]) => p === k * b && mod(r - x, n) === 0);
}

const lcongSolveTiles: Generator<SolveParams> = {
  id: 'lcong-solve-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const params = difficulty >= 2 ? sampleSolve(rng, 14, 30) : sampleSolve(rng, 5, 13);
      if (solveBank(params)) return params;
    }
  },
  render(params) {
    const { a, b, n } = params;
    const k = inverseOf(a, n);
    const x = mod(k * b, n);
    return {
      kind: 'tiles',
      prompt: [say(`The inverse of $${a}$ modulo $${n}$ is $${k}$. Solve $${congTex(a, b, n)}$.`)],
      template: `x \\equiv ${k} \\times ${b} = {0} \\equiv {1}`,
      bank: solveBank(params)!,
      answer: [String(k * b), String(x)],
    };
  },
  solution: solveSolution,
};

const lcongSolve: Generator<SolveParams> = {
  id: 'lcong-solve',
  sample: solveAt,
  choices({ a, b, n }) {
    const k = inverseOf(a, n);
    const x = mod(k * b, n);
    return intOptions(x, [mod(a * b, n), mod(-x, n), k, mod(x + 1, n), b], 0, n - 1);
  },
  render({ a, b, n }) {
    return typed([say(`Solve $${congTex(a, b, n)}$, giving $x$ from $0$ to $${n - 1}$.`)], 'x =', mod(inverseOf(a, n) * b, n));
  },
  solution: solveSolution,
};

/* ---------- checking a candidate ---------- */

interface CheckParams extends SolveParams {
  c: number;
}

const lcongCheckFlow: Generator<CheckParams> = {
  id: 'lcong-check-flow',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const right = rng.chance(0.5);
    for (;;) {
      const n = hard ? rng.int(14, 40) : rng.int(5, 13);
      const a = rng.int(2, n - 1);
      const b = rng.int(1, n - 1);
      if (gcd(a, n) !== 1) continue;
      const x = mod(inverseOf(a, n) * b, n);
      const c = right ? x : rng.int(1, n - 1);
      if (!right && c === x) continue;
      if (a * c < n || a * c >= 1000) continue;
      return { a, b, n, c };
    }
  },
  render({ a, b, n, c }) {
    const product = a * c;
    const r = product % n;
    const holds = r === b;
    const key = `${a}|${b}|${n}|${c}`;
    const products = three(product, [product + a, a + c, product - a], 1);
    const residues = three(r, [mod(r + 1, n), Math.floor(product / n), mod(r - 1, n)], 0, n - 1);
    return {
      kind: 'flow',
      prompt: [say(`Is $x = ${c}$ a solution of this congruence? Each answer chooses what gets asked next.`)],
      subject: congTex(a, b, n),
      steps: [
        {
          id: 'product',
          ask: `First, put $x = ${c}$ in: $${a} \\times ${c}$ is`,
          branches: turned(products, key).map((v) => ({ label: `$${v}$`, to: 'residue' })),
        },
        {
          id: 'residue',
          ask: `Modulo $${n}$, that is`,
          branches: turned(residues, key).map((v) => ({ label: `$${v}$`, to: 'verdict' })),
        },
        {
          id: 'verdict',
          ask: `So is $x = ${c}$ a solution?`,
          branches: [
            { label: 'Yes', outcome: holds ? 'That is the answer.' : `$${r}$ is not $${b}$.` },
            { label: 'No', outcome: holds ? `$${a} \\times ${c} \\equiv ${b}$, so it is.` : 'That is the answer.' },
          ],
        },
      ],
      answer: [`$${product}$`, `$${r}$`, holds ? 'Yes' : 'No'],
    };
  },
  solution({ a, b, n, c }) {
    const product = a * c;
    const r = product % n;
    return [
      { tex: stackTex(`${a} \\times ${c} = ${product} = ${times(Math.floor(product / n), n)} + ${r}`) },
      {
        text:
          r === b
            ? `So $${a} \\times ${c} \\equiv ${b} ${pmod(n)}$: $x = ${c}$ is a solution.`
            : `So $${a} \\times ${c} \\equiv ${r}$, not $${b}$: $x = ${c}$ is not a solution.`,
      },
    ];
  },
};

/* ---------- a constant on the left ---------- */

interface ShiftParams {
  a: number;
  c: number;
  b: number;
  n: number;
}

const lcongShift: Generator<ShiftParams> = {
  id: 'lcong-shift',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = hard ? rng.int(11, 30) : rng.int(5, 13);
      const a = rng.int(2, n - 1);
      const c = hard ? rng.int(n + 1, 90) : rng.int(1, n - 1);
      const b = hard ? rng.int(1, 60) : rng.int(0, n - 1);
      if (gcd(a, n) !== 1 || b === c) continue;
      const b2 = mod(b - c, n);
      if (b2 === 0) continue;
      const k = inverseOf(a, n);
      const x = mod(k * b2, n);
      if (k * b2 >= 1000 || a * x + c >= 1000 || a * k >= 1000) continue;
      return { a, c, b, n };
    }
  },
  render({ a, c, b, n }) {
    const x = mod(inverseOf(a, n) * mod(b - c, n), n);
    return typed([say(`Solve $${a}x + ${c} \\equiv ${b} ${pmod(n)}$, giving $x$ from $0$ to $${n - 1}$.`)], 'x =', x);
  },
  solution({ a, c, b, n }) {
    const b2 = mod(b - c, n);
    const k = inverseOf(a, n);
    const x = mod(k * b2, n);
    return [
      { text: `Take $${c}$ from both sides:` },
      { tex: stackTex(`${a}x \\equiv ${b} - ${c} = ${b - c}`) },
      ...(b - c !== b2 ? [{ tex: stackTex(`${b - c} \\equiv ${b2} ${pmod(n)}`) }] : []),
      { text: `$${a} \\times ${k} = ${a * k} \\equiv 1$, so multiply both sides by $${k}$:` },
      { tex: stackTex(multiplyTex(k, b2, x)) },
      { text: `Check: $${a} \\times ${x} + ${c} = ${a * x + c} \\equiv ${b} ${pmod(n)}$.` },
    ];
  },
};

/* ---------- the method, as steps to order ---------- */

interface SolveOrderParams extends SolveParams {
  picks: number[];
}

function solveProof({ a, b, n }: SolveParams): Proof {
  const k = inverseOf(a, n);
  const kb = k * b;
  const x = mod(kb, n);
  const w = mod(x + 1, n);
  const pool = [
    {
      text: `Divide both sides by $${a}$: $x \\equiv ${b} \\div ${a}$.`,
      why: `$${b} \\div ${a}$ is not a whole number, so it means nothing modulo $${n}$; multiplying by the inverse does the job of dividing.`,
    },
    {
      text: `$${k} \\times ${b} = ${kb} \\equiv ${w}$, so $x \\equiv ${w} ${pmod(n)}$.`,
      why: `$${kb} = ${times(Math.floor(kb / n), n)} + ${x}$, so it is $\\equiv ${x}$.`,
    },
  ];
  if (k !== a) {
    pool.push({
      text: `Multiply both sides by $${a}$: $${a * a}x \\equiv ${a * b}$.`,
      why: `That puts $${a * a}$ in front of $x$, not something $\\equiv 1$.`,
    });
  }
  return {
    claim: `Solve $${congTex(a, b, n)}$.`,
    steps: [
      `$${hcfTex(a, n)} = 1$, so $${a}$ has an inverse modulo $${n}$.`,
      `$${a} \\times ${k} = ${a * k} \\equiv 1$, so the inverse is $${k}$.`,
      `Multiply both sides by $${k}$: $x \\equiv ${k} \\times ${b}$.`,
      `$${k} \\times ${b} = ${kb} \\equiv ${x}$, so $x \\equiv ${x} ${pmod(n)}$.`,
      `Check: $${a} \\times ${x} = ${a * x} \\equiv ${b}$.`,
    ],
    pool,
  };
}

const lcongSolveOrder: Generator<SolveOrderParams> = {
  id: 'lcong-solve-order',
  sample(rng, difficulty) {
    const base = difficulty >= 2 ? sampleSolve(rng, 14, 30) : sampleSolve(rng, 5, 13);
    return { ...base, picks: pickDistractors(rng, solveProof(base), difficulty) };
  },
  render: (params) => orderSlide(solveProof(params), params.picks),
  solution: (params) => orderSolution(solveProof(params), params.picks),
};

/* ================================================================
 * Lesson 4: when the HCF is not 1
 * ================================================================ */

interface HcfParams {
  a: number;
  b: number;
  n: number;
}

/**
 * ax ≡ b (mod n) with d = HCF(a, n) in [dLo, dHi], solvable or not as asked.
 * When solvable, a/d is at least 2, n/d at least 3, and every product the
 * working quotes is under 1000.
 */
function sampleHcf(rng: Rng, nLo: number, nHi: number, solvable: boolean, dHi = 12): HcfParams {
  for (;;) {
    const n = rng.int(nLo, nHi);
    const a = rng.int(2, n - 1);
    const d = gcd(a, n);
    if (d < 2 || d > dHi) continue;
    const m = n / d;
    if (!solvable) {
      const b = rng.int(1, n - 1);
      if (b % d === 0) continue;
      return { a, b, n };
    }
    if (a / d < 2 || m < 3) continue;
    const b = d * rng.int(1, m - 1);
    const k = inverseOf(a / d, m);
    const x0 = mod(k * (b / d), m);
    if (k * (b / d) >= 1000 || x0 === 0) continue;
    return { a, b, n };
  }
}

/** The reduced congruence and its one solution x0 modulo m = n/d. */
function reduced({ a, b, n }: HcfParams) {
  const d = gcd(a, n);
  const [a2, b2, m] = [a / d, b / d, n / d];
  const k = inverseOf(a2, m);
  return { d, a2, b2, m, k, x0: mod(k * b2, m) };
}

function hcfSolution(params: HcfParams): SolutionStep[] {
  const { a, b, n } = params;
  const { d, a2, b2, m, k, x0 } = reduced(params);
  const all = range(0, d - 1).map((i) => x0 + i * m);
  return [
    { text: `$${hcfTex(a, n)} = ${d}$, which divides $${b}$. Divide the whole congruence, modulus too, by $${d}$:` },
    { tex: congTex(a2, b2, m) },
    ...(a2 % m === 1 ? [] : [{ text: `$${a2} \\times ${k} = ${a2 * k} \\equiv 1 ${pmod(m)}$, so multiply both sides by $${k}$:` }]),
    { tex: stackTex(multiplyTex(k, b2, x0)) },
    { text: `So $x \\equiv ${x0} ${pmod(m)}$. From $0$ to $${n - 1}$ that is ${listTex(all)}: $${d}$ solutions.` },
  ];
}

/* ---------- which has solutions ---------- */

interface SolvableParams {
  n: number;
  /** One a and four b's, or four a's and one b; the solvable congruence first. */
  as: number[];
  bs: number[];
}

const lcongSolvable: Generator<SolvableParams> = {
  id: 'lcong-solvable',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      for (;;) {
        const n = rng.int(8, 24);
        const a = rng.int(2, n - 1);
        const d = gcd(a, n);
        if (d < 2) continue;
        const good = d * rng.int(1, Math.floor((n - 1) / d));
        const bad = range(1, n - 1).filter((b) => b % d !== 0);
        if (bad.length < 3) continue;
        return { n, as: [a], bs: [good, ...rng.sample(bad, 3).sort((x, y) => x - y)] };
      }
    }
    for (;;) {
      const n = rng.int(20, 60);
      const b = rng.int(2, n - 1);
      const shared = range(2, n - 1).filter((a) => gcd(a, n) >= 2);
      const good = shared.filter((a) => b % gcd(a, n) === 0);
      const bad = shared.filter((a) => b % gcd(a, n) !== 0);
      if (good.length === 0 || bad.length < 3) continue;
      return { n, as: [rng.pick(good), ...rng.sample(bad, 3).sort((x, y) => x - y)], bs: [b] };
    }
  },
  render({ n, as, bs }) {
    const labels = as.length === 1 ? bs.map((b) => congTex(as[0], b, n)) : as.map((a) => congTex(a, bs[0], n));
    return choiceSlide([say('Which of these congruences has solutions?')], labels[0], labels.slice(1));
  },
  solution({ n, as, bs }) {
    const pairs = as.length === 1 ? bs.map((b) => [as[0], b]) : as.map((a) => [a, bs[0]]);
    return [
      { text: `$ax - b$ has to be a multiple of $${n}$, so the HCF of $a$ and $${n}$ has to divide $b$.` },
      ...pairs.map(([a, b]) => {
        const d = gcd(a, n);
        return { text: `$${congTex(a, b, n)}$: the HCF is $${d}$, which ${b % d === 0 ? 'divides' : 'does not divide'} $${b}$.` };
      }),
    ];
  },
};

/* ---------- solvable, and how many ---------- */

const NO_SOLUTIONS = 'No, so there are no solutions';

const lcongHcfFlow: Generator<HcfParams> = {
  id: 'lcong-hcf-flow',
  sample: (rng, difficulty) =>
    difficulty >= 2 ? sampleHcf(rng, 20, 60, rng.chance(0.5)) : sampleHcf(rng, 6, 24, rng.chance(0.5)),
  render({ a, b, n }) {
    const d = gcd(a, n);
    const solvable = b % d === 0;
    const key = `${a}|${b}|${n}`;
    const hcfs = three(d, [1, a / d, 2 * d, n / d], 1, n);
    const counts = three(d, [1, n / d, d + 1], 1, n);
    return {
      kind: 'flow',
      prompt: [say(`How many solutions from $0$ to $${n - 1}$ does this have? Each answer chooses what gets asked next.`)],
      subject: congTex(a, b, n),
      steps: [
        {
          id: 'hcf',
          ask: `First, the HCF of $${a}$ and $${n}$ is`,
          branches: turned(hcfs, key).map((v) => ({ label: `$${v}$`, to: 'divides' })),
        },
        {
          id: 'divides',
          ask: `Does it divide $${b}$?`,
          branches: [
            { label: 'Yes', to: 'count' },
            { label: NO_SOLUTIONS, outcome: solvable ? `It does: $${b} = ${b / d} \\times ${d}$.` : 'That is the answer.' },
          ],
        },
        {
          id: 'count',
          ask: `So how many solutions are there from $0$ to $${n - 1}$?`,
          branches: turned(counts, key).map((v) => ({
            label: `$${v}$`,
            outcome: solvable
              ? v === d
                ? 'That is the answer.'
                : `Dividing through leaves one solution modulo $${n / d}$, and it comes round $${d}$ times before $${n}$.`
              : `$${d}$ does not divide $${b}$.`,
          })),
        },
      ],
      answer: solvable ? [`$${d}$`, 'Yes', `$${d}$`] : [`$${d}$`, NO_SOLUTIONS],
    };
  },
  solution(params) {
    const { a, b, n } = params;
    const d = gcd(a, n);
    if (b % d !== 0) {
      return [
        { text: `$${hcfTex(a, n)} = ${d}$.` },
        { text: `$${a}x$ and every multiple of $${n}$ are multiples of $${d}$, but $${b}$ is not, so there are no solutions.` },
      ];
    }
    return hcfSolution(params);
  },
};

const lcongCount: Generator<HcfParams> = {
  id: 'lcong-count',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const [lo, hi] = hard ? [20, 90] : [6, 24];
    if (hard && rng.chance(0.2)) {
      for (;;) {
        const n = rng.int(lo, hi);
        const a = rng.int(2, n - 1);
        if (gcd(a, n) === 1) return { a, b: rng.int(1, n - 1), n };
      }
    }
    return sampleHcf(rng, lo, hi, rng.chance(0.6));
  },
  choices({ a, b, n }) {
    const d = gcd(a, n);
    const count = b % d === 0 ? d : 0;
    return intOptions(count, [0, 1, d, n / d, d + 1], 0, n);
  },
  render({ a, b, n }) {
    const d = gcd(a, n);
    return typed(
      [say(`How many solutions from $0$ to $${n - 1}$ does $${congTex(a, b, n)}$ have?`)],
      '\\text{solutions} =',
      b % d === 0 ? d : 0,
    );
  },
  solution(params) {
    const { a, b, n } = params;
    const d = gcd(a, n);
    if (d === 1) {
      return [
        { text: `$${hcfTex(a, n)} = 1$, so $${a}$ has an inverse modulo $${n}$ and there is exactly one solution.` },
        { text: `It is $x = ${mod(inverseOf(a, n) * b, n)}$.` },
      ];
    }
    if (b % d !== 0) {
      return [
        { text: `$${hcfTex(a, n)} = ${d}$, which does not divide $${b}$.` },
        { text: `$${a}x$ and every multiple of $${n}$ are multiples of $${d}$, so there are no solutions: $0$.` },
      ];
    }
    return hcfSolution(params);
  },
};

/* ---------- dividing through ---------- */

function divideBank(params: HcfParams): string[] | undefined {
  const { a, b, n } = params;
  const { d, a2, b2, m } = reduced(params);
  const slips = [a, b, n, d, a2 + 1, b2 + 1, m + 1, 2 * m, b2 + m, a2 + m, m - 1];
  return soleTiles([a2, b2, m], slips, (values) => values[0] > 0 && sameSolutions(values, [a, b, n]));
}

const lcongDivideTiles: Generator<HcfParams> = {
  id: 'lcong-divide-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const params = difficulty >= 2 ? sampleHcf(rng, 20, 90, true) : sampleHcf(rng, 6, 30, true);
      if (divideBank(params)) return params;
    }
  },
  render(params) {
    const { a, b, n } = params;
    const { a2, b2, m } = reduced(params);
    return {
      kind: 'tiles',
      prompt: [say(`Divide $${congTex(a, b, n)}$ through by the HCF of $${a}$ and $${n}$.`)],
      template: `{0}x \\equiv {1} \\ (\\bmod\\ {2})`,
      bank: divideBank(params)!,
      answer: [a2, b2, m].map(String),
    };
  },
  solution(params) {
    const { a, b, n } = params;
    const { d, a2, b2, m } = reduced(params);
    return [
      { text: `$${hcfTex(a, n)} = ${d}$, and it divides $${b}$.` },
      { text: `$${a}x - ${b}$ is a multiple of $${n}$ exactly when $${a2}x - ${b2}$ is a multiple of $${m}$: divide all three by $${d}$.` },
      { tex: congTex(a2, b2, m) },
    ];
  },
};

const lcongHcfSolve: Generator<HcfParams> = {
  id: 'lcong-hcf-solve',
  sample: (rng, difficulty) => (difficulty >= 2 ? sampleHcf(rng, 20, 90, true) : sampleHcf(rng, 6, 30, true)),
  render(params) {
    const { a, b, n } = params;
    return typed([say(`Find the smallest solution $x \\ge 0$ of $${congTex(a, b, n)}$.`)], 'x =', reduced(params).x0);
  },
  solution: hcfSolution,
};

interface AllParams extends HcfParams {
  hint: boolean;
}

const lcongAllTable: Generator<AllParams> = {
  id: 'lcong-all-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const params = hard ? sampleHcf(rng, 12, 90, true, 5) : sampleHcf(rng, 6, 40, true, 5);
    return { ...params, hint: !hard };
  },
  render(params) {
    const { a, b, n, hint } = params;
    const { d, m, x0 } = reduced(params);
    const answer = range(0, d - 1).map((i) => x0 + i * m);
    const slips = range(0, d - 1).flatMap((i) => [x0 + (i + 1) * d, x0 + i * m + 1, x0 + i * m - 1]);
    return {
      kind: 'table',
      prompt: [
        say(
          hint
            ? `$${congTex(a, b, n)}$ divides through to $x \\equiv ${x0} ${pmod(m)}$. Fill in every solution from $0$ to $${n - 1}$, smallest first.`
            : `Fill in every solution of $${congTex(a, b, n)}$ from $0$ to $${n - 1}$, smallest first.`,
        ),
      ],
      columns: ['\\text{solution}', 'x'],
      rows: answer.map((_, i) => [String(i + 1), null]),
      bank: treeBank(answer, slips.filter((v) => v >= 0 && v < n)),
      answer: answer.map(String),
    };
  },
  solution: hcfSolution,
};

/* ================================================================
 * Lesson 5: cancelling safely
 * ================================================================ */

interface CancelParams {
  c: number;
  y: number;
  n: number;
}

/** cx ≡ cy (mod n) is x ≡ y (mod n/g), g = HCF(c, n); y reduced into that. */
function cancelled({ c, y, n }: CancelParams) {
  const g = gcd(c, n);
  const m = n / g;
  return { g, m, r: mod(y, m) };
}

interface SafeParams {
  /** [c, y, n] per option, the one that may be cancelled first. */
  rows: [number, number, number][];
  fixed: 'c' | 'n';
}

const lcongCancelSafe: Generator<SafeParams> = {
  id: 'lcong-cancel-safe',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      for (;;) {
        const c = rng.int(2, 6);
        const y = rng.int(2, 4);
        const moduli = range(c * y + 1, 40);
        const good = moduli.filter((n) => gcd(c, n) === 1);
        const bad = moduli.filter((n) => gcd(c, n) > 1);
        if (good.length === 0 || bad.length < 3) continue;
        const ns = [rng.pick(good), ...rng.sample(bad, 3).sort((p, q) => p - q)];
        return { rows: ns.map((n) => [c, y, n] as [number, number, number]), fixed: 'c' };
      }
    }
    for (;;) {
      const n = rng.int(12, 60);
      const cs = range(2, Math.floor((n - 1) / 2));
      const good = cs.filter((c) => gcd(c, n) === 1);
      const bad = cs.filter((c) => gcd(c, n) > 1);
      if (good.length === 0 || bad.length < 3) continue;
      const chosen = [rng.pick(good), ...rng.sample(bad, 3).sort((p, q) => p - q)];
      return {
        rows: chosen.map((c) => [c, rng.int(2, Math.floor((n - 1) / c)), n] as [number, number, number]),
        fixed: 'n',
      };
    }
  },
  render({ rows, fixed }) {
    const labels = rows.map(([c, y, n]) => congTex(c, c * y, n));
    return choiceSlide(
      [
        say(
          fixed === 'c'
            ? `In which of these can you cancel the $${rows[0][0]}$ from both sides and keep the same modulus?`
            : 'In which of these can you cancel the number in front of $x$ from both sides and keep the same modulus?',
        ),
      ],
      labels[0],
      labels.slice(1),
    );
  },
  solution({ rows }) {
    return [
      { text: 'Cancelling $c$ and keeping the modulus is safe exactly when $c$ has an inverse: when its HCF with the modulus is $1$.' },
      ...[...rows]
        .sort((p, q) => p[2] - q[2] || p[0] - q[0])
        .map(([c, y, n]) => {
          const g = gcd(c, n);
          return {
            text:
              g === 1
                ? `$${congTex(c, c * y, n)}$: $${hcfTex(c, n)} = 1$, so it is $x \\equiv ${y} ${pmod(n)}$.`
                : `$${congTex(c, c * y, n)}$: $${hcfTex(c, n)} = ${g}$, so it is only $x \\equiv ${mod(y, n / g)} ${pmod(n / g)}$.`,
          };
        }),
    ];
  },
};

function sampleCancel(rng: Rng, nLo: number, nHi: number, coprime: boolean, maxRight: number): CancelParams {
  for (;;) {
    const n = rng.int(nLo, nHi);
    const c = rng.int(2, n - 1);
    const g = gcd(c, n);
    if ((g === 1) !== coprime) continue;
    const m = n / g;
    if (m < 3) continue;
    const y = rng.int(2, Math.floor(maxRight / c));
    if (y < 2 || mod(y, m) === 0) continue;
    return { c, y, n };
  }
}

function cancelBank(params: CancelParams): string[] | undefined {
  const { c, y, n } = params;
  const { g, m, r } = cancelled(params);
  const slips = [y, n, c, g, r + 1, m + 1, c * y, 2 * m, r + m, m - 1, n - 1];
  return soleTiles([r, m], slips, ([v, mm]) => sameSolutions([1, v, mm], [c, c * y, n]));
}

const lcongCancelTiles: Generator<CancelParams> = {
  id: 'lcong-cancel-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const params = difficulty >= 2 ? sampleCancel(rng, 20, 90, false, 400) : sampleCancel(rng, 6, 30, false, 99);
      // Difficulty 1 keeps y below the new modulus, so only the modulus changes.
      if (difficulty < 2 && params.y >= cancelled(params).m) continue;
      if (cancelBank(params)) return params;
    }
  },
  render(params) {
    const { c, y, n } = params;
    const { m, r } = cancelled(params);
    return {
      kind: 'tiles',
      prompt: [
        say(`Cancel the $${c}$ from $${congTex(c, c * y, n)}$, writing the right side as a residue of the new modulus.`),
      ],
      template: `x \\equiv {0} \\ (\\bmod\\ {1})`,
      bank: cancelBank(params)!,
      answer: [String(r), String(m)],
    };
  },
  solution(params) {
    const { c, y, n } = params;
    const { g, m, r } = cancelled(params);
    return [
      { text: `$${hcfTex(c, n)} = ${g}$, so $${c}$ has no inverse modulo $${n}$ and the modulus cannot stay.` },
      { text: `$${n}$ divides $${c}(x - ${y})$ exactly when $${m}$ divides $x - ${y}$: divide the modulus by $${g}$.` },
      { tex: stackTex(`x \\equiv ${y}${y === r ? '' : ` \\equiv ${r}`} ${pmod(m)}`) },
    ];
  },
};

const KEEP = (n: number) => `Yes, keep the modulus $${n}$`;
const SPLIT = (n: number) => `No, divide $${n}$ by the HCF`;

const lcongCancelFlow: Generator<CancelParams> = {
  id: 'lcong-cancel-flow',
  sample: (rng, difficulty) =>
    difficulty >= 2 ? sampleCancel(rng, 20, 60, rng.chance(0.5), 300) : sampleCancel(rng, 6, 24, rng.chance(0.5), 99),
  render(params) {
    const { c, y, n } = params;
    const { g, m, r } = cancelled(params);
    const key = `${c}|${y}|${n}`;
    const truth = [c, c * y, n];
    const label = ([v, mm]: number[]) => `$x \\equiv ${v} ${pmod(mm)}$`;
    const right = label([r, m]);
    const others = [
      [y, n],
      [r, g],
      [y, c],
      [mod(r + 1, m), m],
      [mod(c * y, n), n],
      [r + 1, n],
    ]
      .filter(([v, mm]) => mm >= 2 && !sameSolutions([1, v, mm], truth))
      .map(label)
      .filter((l, i, all) => l !== right && all.indexOf(l) === i)
      .slice(0, 2);
    const hcfs = three(g, [g === 1 ? 2 : 1, c, 2 * g], 1, n);
    return {
      kind: 'flow',
      prompt: [say(`Cancel the $${c}$. Each answer chooses what gets asked next.`)],
      subject: congTex(c, c * y, n),
      steps: [
        {
          id: 'hcf',
          ask: `First, the HCF of $${c}$ and $${n}$ is`,
          branches: turned(hcfs, key).map((v) => ({ label: `$${v}$`, to: 'keep' })),
        },
        {
          id: 'keep',
          ask: `So can you cancel $${c}$ and keep the modulus?`,
          branches: [
            { label: KEEP(n), to: 'result' },
            { label: SPLIT(n), to: 'result' },
          ],
        },
        {
          id: 'result',
          ask: 'So the solutions are',
          branches: turned([right, ...others], key).map((l) => ({
            label: l,
            outcome: l === right ? 'That is the answer.' : 'That congruence does not have the same solutions.',
          })),
        },
      ],
      answer: [`$${g}$`, g === 1 ? KEEP(n) : SPLIT(n), right],
    };
  },
  solution(params) {
    const { c, y, n } = params;
    const { g, m, r } = cancelled(params);
    if (g === 1) {
      return [
        { text: `$${hcfTex(c, n)} = 1$, so $${c}$ has an inverse modulo $${n}$: multiplying by it cancels $${c}$ and keeps the modulus.` },
        { tex: stackTex(`x \\equiv ${y}${y === r ? '' : ` \\equiv ${r}`} ${pmod(n)}`) },
      ];
    }
    return [
      { text: `$${hcfTex(c, n)} = ${g}$, so $${c}$ has no inverse modulo $${n}$. Divide the modulus by $${g}$ instead:` },
      { tex: stackTex(`x \\equiv ${y}${y === r ? '' : ` \\equiv ${r}`} ${pmod(m)}`) },
    ];
  },
};

/* ---------- stories ---------- */

type StoryKind = 'ring' | 'packs' | 'clock' | 'shift';

interface Story {
  text: (a: number, n: number, b: number) => string;
  ask: (b: number) => string;
  /** What x counts, for "Which congruence does ... satisfy?". */
  count: string;
  lead: string;
}

const STORIES: Record<StoryKind, Story> = {
  ring: {
    text: (a, n) =>
      `A counter moves $${a}$ squares at a time round a ring of $${n}$ squares, numbered $0$ to $${n - 1}$. It starts on square $0$.`,
    ask: (b) => `After how many moves does it first land on square $${b}$?`,
    count: 'the number of moves $x$',
    lead: '\\text{moves} =',
  },
  packs: {
    text: (a, n, b) =>
      `Cards come in packs of $${a}$. Some packs are dealt into $${n}$ equal piles, and $${b}$ ${b === 1 ? 'card is' : 'cards are'} left over.`,
    ask: () => 'What is the smallest number of packs this could be?',
    count: 'the number of packs $x$',
    lead: '\\text{packs} =',
  },
  clock: {
    text: (a) => `A timer beeps every $${a}$ minutes, starting at $0$ minutes past the hour.`,
    ask: (b) => `After how many beeps does it first beep at $${b}$ minutes past an hour?`,
    count: 'the number of beeps $x$',
    lead: '\\text{beeps} =',
  },
  shift: {
    text: (a) => `A machine runs in cycles of $${a}$ hours, starting at midnight: hour $0$ on a $24$-hour clock.`,
    ask: (b) => `After how many cycles does one first end at hour $${b}$?`,
    count: 'the number of cycles $x$',
    lead: '\\text{cycles} =',
  },
};

interface StoryParams {
  kind: StoryKind;
  a: number;
  b: number;
  n: number;
}

/** The smallest positive x with ax ≡ b (mod n). */
const firstSolution = ({ a, b, n }: StoryParams) => range(1, n).find((x) => mod(a * x - b, n) === 0)!;

function sampleStory(rng: Rng, difficulty: number): StoryParams {
  const hard = difficulty >= 2;
  for (;;) {
    const kind: StoryKind = hard ? rng.pick(['ring', 'packs', 'clock', 'shift'] as const) : rng.pick(['ring', 'packs'] as const);
    let a: number;
    let n: number;
    if (kind === 'ring') {
      n = hard ? rng.int(12, 40) : rng.int(8, 30);
      a = rng.int(2, n - 1);
    } else if (kind === 'packs') {
      n = rng.int(5, 15);
      a = rng.int(6, 40);
    } else if (kind === 'clock') {
      n = 60;
      a = rng.int(7, 55);
    } else {
      n = 24;
      a = rng.int(5, 23);
    }
    const b = rng.int(1, n - 1);
    const g = gcd(a, n);
    if (!hard && g !== 1) continue;
    if (b % g !== 0 || mod(a, n) === 0) continue;
    const params = { kind, a, b, n };
    const x = firstSolution(params);
    // It has to go round at least once, or the answer is b / a by eye.
    if (x < 2 || a * x <= n || a * x >= 1000) continue;
    return params;
  }
}

function storySolution(params: StoryParams): SolutionStep[] {
  const { a, b, n } = params;
  const g = gcd(a, n);
  const [a2, b2, m] = [a / g, b / g, n / g];
  const ra = mod(a2, m);
  const k = inverseOf(ra, m);
  const x = firstSolution(params);
  return [
    { text: `After $x$ of them the total is $${a}x$, and it has to be $${b}$ more than a multiple of $${n}$:` },
    { tex: congTex(a, b, n) },
    ...(g > 1
      ? [
          { text: `$${hcfTex(a, n)} = ${g}$, which divides $${b}$. Divide through by it:` },
          { tex: congTex(a2, b2, m) },
        ]
      : []),
    ...(a2 >= m ? [{ tex: stackTex(`${a2} \\equiv ${ra} ${pmod(m)}`) }] : []),
    ...(ra === 1 ? [] : [{ text: `$${ra} \\times ${k} = ${ra * k} \\equiv 1 ${pmod(m)}$, so multiply both sides by $${k}$:` }]),
    { tex: stackTex(multiplyTex(k, b2, x)) },
    {
      text: `The smallest positive solution is $x = ${x}$. Check: $${a} \\times ${x} = ${a * x} = ${times(Math.floor((a * x) / n), n)} + ${b}$.`,
    },
  ];
}

const lcongStorySetup: Generator<StoryParams> = {
  id: 'lcong-story-setup',
  sample: sampleStory,
  render(params) {
    const { kind, a, b, n } = params;
    const story = STORIES[kind];
    const truth = [a, b, n];
    const wrong = [
      [b, a, n],
      [n, b, a],
      [a, n, b],
      [1, a * b, n],
      [a, b, n + a],
    ]
      .filter(([p, q, mm]) => mm >= 2 && q < 1000 && !sameSolutions([p, q, mm], truth))
      .map(([p, q, mm]) => congTex(p, q, mm))
      .filter((l, i, all) => all.indexOf(l) === i)
      .slice(0, 3);
    return choiceSlide(
      [say(story.text(a, n, b)), say(story.ask(b)), say(`Which congruence does ${story.count} satisfy?`)],
      congTex(a, b, n),
      wrong,
    );
  },
  solution(params) {
    const { a, b, n } = params;
    return [
      { text: `$x$ of them make $${a}x$ in all, and that total is $${b}$ more than a whole number of $${n}$s.` },
      { tex: congTex(a, b, n) },
    ];
  },
};

const lcongStory: Generator<StoryParams> = {
  id: 'lcong-story',
  sample: sampleStory,
  render(params) {
    const { kind, a, b, n } = params;
    const story = STORIES[kind];
    return typed([say(story.text(a, n, b)), say(story.ask(b))], story.lead, firstSolution(params));
  },
  solution: storySolution,
};

export const numberCongruenceGenerators = [
  lcongInverseRow,
  lcongInverse,
  lcongInverseTable,
  lcongHasInverse,
  lcongInverseFlow,
  lcongFromBezout,
  lcongEuclidOrder,
  lcongEuclidInverse,
  lcongReduceFlow,
  lcongEuclidTable,
  lcongSolveTiles,
  lcongSolve,
  lcongCheckFlow,
  lcongShift,
  lcongSolveOrder,
  lcongSolvable,
  lcongHcfFlow,
  lcongCount,
  lcongDivideTiles,
  lcongHcfSolve,
  lcongAllTable,
  lcongCancelSafe,
  lcongCancelTiles,
  lcongCancelFlow,
  lcongStorySetup,
  lcongStory,
];

/** The arithmetic behind the slides, for `numberCongruence.test.ts`. */
export const congruenceTesting = { inverseOf, solutionsOf, sameSolutions, bezoutLine, yRows, firstSolution };

/** The order slides here, for `proofOrder.test.ts`, which grades each proof as a learner would. */
export const numberCongruenceOrders = [lcongEuclidOrder, lcongSolveOrder];
