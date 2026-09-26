/**
 * Number & Proof, level 10: Fermat's Little Theorem.
 *
 * The statement a^(p - 1) ≡ 1 (mod p) for a prime p not dividing a, seen in
 * a table of powers and in the row a, 2a, ..., (p - 1)a being 1 to p - 1 in
 * a new order; when it does not apply (p divides a, or the modulus is not
 * prime); cutting a big power down by p - 1; a^(p - 2) as an inverse and
 * a^p ≡ a for every a; the theorem turned round as a test that proves a
 * number composite (and cannot prove one prime, as 341 shows); and Wilson's
 * theorem, (p - 1)! ≡ -1, from pairing each number with its inverse.
 *
 * Every number the learner handles is under 1000. Powers are reduced as they
 * are multiplied, and a repeated-squaring run is only asked modulo a number
 * under 32, so no square in it reaches 1000. A big power is only asked where
 * the exponent left after cutting down by p - 1 is at most five.
 *
 * Nothing here is calculus, so no slide declares `source`.
 * `numberFermat.test.ts` reads the numbers each prompt states and re-does
 * every power one multiplication at a time and every factorial one factor at
 * a time, never by the theorem the generator used.
 */
import type { Block, ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import {
  choiceSlide,
  fillBank,
  isPrime,
  mod,
  orderSlide,
  orderSolution,
  pickDistractors,
  stackTex,
  turned,
  type Proof,
} from './numberProof';
import { gcd, say } from './format';
import { treeBank } from './parametricImplicit';

/* ---------- shared helpers ---------- */

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** `(mod n)` for prose and displays. Never inside a tiles template, where `{7}` is a blank. */
const pmod = (n: number) => `\\pmod{${n}}`;

/** a^e modulo n by repeated squaring. Every product stays under a million. */
function powMod(a: number, e: number, n: number): number {
  let result = 1 % n;
  let base = mod(a, n);
  for (let k = e; k > 0; k = Math.floor(k / 2)) {
    if (k % 2 === 1) result = (result * base) % n;
    base = (base * base) % n;
  }
  return result;
}

/** m! modulo n, one factor at a time. */
function factMod(m: number, n: number): number {
  let out = 1 % n;
  for (let k = 2; k <= m; k += 1) out = (out * k) % n;
  return out;
}

/** The inverse of a modulo a prime p, from Fermat: a^(p - 2). */
const inverseOf = (a: number, p: number) => powMod(a, p - 2, p);

/** How many times a (coprime to n) is multiplied before its powers reach 1. */
function orderOf(a: number, n: number): number {
  let x = mod(a, n);
  for (let k = 1; k <= n; k += 1) {
    if (x === 1) return k;
    x = (x * mod(a, n)) % n;
  }
  throw new Error(`orderOf: ${a} is not a unit modulo ${n}`);
}

/** How many of the powers a^1, a^2, ... modulo n are listed before one repeats. */
function powersBeforeRepeat(a: number, n: number): number {
  const seen = new Set<number>();
  for (let x = mod(a, n); !seen.has(x); x = (x * mod(a, n)) % n) seen.add(x);
  return seen.size;
}

const PRIMES = range(2, 997).filter(isPrime);
const primesIn = (lo: number, hi: number) => PRIMES.filter((p) => p >= lo && p <= hi);
const compositesIn = (lo: number, hi: number) => range(lo, hi).filter((n) => !isPrime(n));

/** Numbers near a value, for topping up a set of slips that collided. */
function near(value: number, count: number): number[] {
  const out: number[] = [];
  for (let gap = 1; out.length < count; gap += 1) out.push(value + gap, value - gap);
  return out.slice(0, count);
}

/** Four whole-number options: the answer and the first three distinct slips in [min, max]. */
function intOptions(correct: number, slips: number[], min: number, max: number): ChoiceOption[] {
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
function threeLabels(correct: number, slips: number[], min = 0): number[] {
  const out = [correct];
  for (const value of [...slips, ...near(correct, 8)]) {
    if (out.length === 3) break;
    if (!Number.isInteger(value) || value < min || value >= 1000 || out.includes(value)) continue;
    out.push(value);
  }
  return out;
}

/** A table bank: the answer as a multiset, plus two or three slips none of the answer uses. */
function tableBank(answer: number[], slips: number[], fallbackFrom: number): string[] {
  const extras: number[] = [];
  for (const value of [...slips, ...range(fallbackFrom, fallbackFrom + 8)]) {
    if (extras.length >= 3) break;
    if (!Number.isInteger(value) || value < 0 || value >= 1000 || answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  return [...answer, ...extras].sort((x, y) => x - y).map(String);
}

/** A whole number typed on an empty keypad, compared exactly. */
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

/** A flow step's labels as TeX, turned by a key so the right one is not always first. */
const dollars = (values: number[], key: string) => turned(values.map((v) => `$${v}$`), key);

/** The line reducing a base bigger than the modulus, when there is one. */
const reduceBase = (a: number, n: number): SolutionStep[] =>
  a >= n ? [{ text: `Reduce the base first: $${a} \\equiv ${mod(a, n)} ${pmod(n)}$.` }] : [];

/** A product and, when it reaches n, its residue: `12 \\equiv 5`, or just `4`. */
const reduced = (raw: number, n: number) => (raw < n ? `${raw}` : `${raw} \\equiv ${raw % n}`);

/** The residue of a^r modulo n for a small r, one multiplication at a time. */
function smallPowerLines(ra: number, r: number, n: number): SolutionStep[] {
  const lines: SolutionStep[] = [];
  let acc = ra;
  for (let k = 2; k <= r; k += 1) {
    const raw = acc * ra;
    lines.push({ tex: stackTex(`${ra}^{${k}} \\equiv ${acc} \\times ${ra} = ${reduced(raw, n)}`) });
    acc = raw % n;
  }
  return lines;
}

/* ---------- repeated squaring, shared by three generators ---------- */

/** The powers of two a repeated-squaring run needs for e, largest last. */
const squarings = (e: number) => range(0, Math.floor(Math.log2(e))).map((i) => 2 ** i);

/** a^(2^i) modulo n for each i, by squaring. */
function squaredResidues(a: number, n: number, count: number): number[] {
  const out = [mod(a, n)];
  while (out.length < count) out.push((out[out.length - 1] * out[out.length - 1]) % n);
  return out;
}

/** The tree slide for a^e modulo n by repeated squaring. */
function squaringTree(a: number, e: number, n: number, lead: Block[]) {
  const powers = squarings(e);
  const residues = squaredResidues(a, n, powers.length);
  const used = powers.filter((p) => (e & p) !== 0);
  const answer = [...residues, powMod(a, e, n)];
  const slips = [...residues.map((x) => x * x).filter((x) => x >= n && x < 1000), mod(a, n) + 1, e % n, n - 1];
  return {
    kind: 'tree' as const,
    prompt: [
      ...lead,
      say(`From the top, the boxes hold ${powers.map((p) => `$${a}^{${p}}$`).join(', ')} and then $${a}^{${e}}$.`),
    ],
    expression: `${a}^{${e}} \\bmod ${n}`,
    nodes: [
      ...powers.map((p, i) => ({ id: `p${p}`, from: i === 0 ? [] : [`p${powers[i - 1]}`] })),
      { id: 'all', from: used.map((p) => `p${p}`) },
    ],
    bank: treeBank(answer, slips),
    answer: answer.map(String),
  };
}

/** `e = 8 + 2 + 1`, largest first. */
const binarySum = (e: number) =>
  squarings(e)
    .filter((p) => (e & p) !== 0)
    .reverse()
    .join(' + ');

/** The worked run of a^e modulo n by repeated squaring. */
function squaringSolution(a: number, e: number, n: number): SolutionStep[] {
  const powers = squarings(e);
  const residues = squaredResidues(a, n, powers.length);
  const used = powers.filter((p) => (e & p) !== 0);
  const steps: SolutionStep[] = [
    { tex: stackTex(`${a}^{1} \\equiv ${residues[0]}`) },
    ...residues.slice(1).map((_, i) => ({
      tex: stackTex(`${a}^{${powers[i + 1]}} ${i === 0 && residues[0] === a ? '=' : `\\equiv ${residues[i]}^2 =`} ${reduced(residues[i] * residues[i], n)}`),
    })),
  ];
  if (used.length === 1) return steps;
  let acc = residues[powers.indexOf(used[0])];
  const lines: string[] = [];
  for (const p of used.slice(1)) {
    const x = residues[powers.indexOf(p)];
    lines.push(`${acc} \\times ${x} = ${reduced(acc * x, n)}`);
    acc = (acc * x) % n;
  }
  return [
    ...steps,
    { text: `$${e} = ${binarySum(e)}$, so multiply those residues, reducing as you go:` },
    ...lines.map((line) => ({ tex: stackTex(line) })),
  ];
}

/* ================================================================
 * Lesson 1: the theorem
 * ================================================================ */

interface PowerTableParams {
  a: number;
  p: number;
}

const fltPowerTable: Generator<PowerTableParams> = {
  id: 'flt-power-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const p = hard ? rng.pick([11, 13]) : rng.pick([5, 7]);
      const a = hard ? rng.int(2, 60) : rng.int(2, 30);
      const r = a % p;
      if (r <= 1 || r === p - 1) continue;
      return { a, p };
    }
  },
  render({ a, p }) {
    const hard = p > 7;
    const residues = range(1, p - 1).map((k) => powMod(a, k, p));
    const given = (k: number) => (k === 1 ? a < p : hard && k % 2 === 1);
    const answer = residues.filter((_, i) => !given(i + 1));
    const slips = [...residues.slice(0, -1).map((x) => x * mod(a, p)), 0, p];
    return {
      kind: 'table',
      prompt: [
        say(
          a > p
            ? `Fill in the residues of the powers of $${a}$ modulo $${p}$. Reduce $${a}$ first, then multiply by that residue and reduce, row by row.`
            : `Fill in the residues of the powers of $${a}$ modulo $${p}$: each row is the one above times $${a}$, reduced.`,
        ),
      ],
      columns: ['k', `${a}^k \\bmod ${p}`],
      rows: residues.map((x, i) => [String(i + 1), given(i + 1) ? String(x) : null]),
      bank: tableBank(answer, slips, p),
      answer: answer.map(String),
    };
  },
  solution({ a, p }) {
    const ra = mod(a, p);
    const residues = range(1, p - 1).map((k) => powMod(a, k, p));
    return [
      ...reduceBase(a, p),
      { text: `Each row is the row above times $${ra}$, reduced:` },
      ...residues.slice(0, -1).map((x) => ({ tex: stackTex(`${x} \\times ${ra} = ${reduced(x * ra, p)}`) })),
      {
        text: `The last row is $${a}^{${p - 1}} \\equiv 1$: $${p}$ is prime and does not divide $${a}$, just as Fermat's little theorem says.`,
      },
    ];
  },
};

/* ---------- which does the theorem give ---------- */

interface TrueParams {
  p: number;
  a: number;
  /** A multiple of p, for a base the theorem does not cover. */
  b: number;
  /** A modulus that is not prime, and a base for it. */
  n: number;
  c: number;
  /** Which three of the four wrong statements are offered. */
  picks: number[];
}

interface Statement {
  base: number;
  power: number;
  modulus: number;
  /** Why the theorem does not give it, for the solution. */
  why: string;
}

const statementTex = ({ base, power, modulus }: { base: number; power: number; modulus: number }) =>
  `${base}^{${power}} \\equiv 1 ${pmod(modulus)}`;

function falseStatements({ p, a, b, n, c }: TrueParams): Statement[] {
  return [
    {
      base: a,
      power: p,
      modulus: p,
      why: `the power has to be $${p - 1}$, one less than $${p}$. In fact $${a}^{${p}} \\equiv ${a % p}$.`,
    },
    {
      base: b,
      power: p - 1,
      modulus: p,
      why: `$${p}$ divides $${b}$, so every power of $${b}$ is $\\equiv 0$.`,
    },
    {
      base: c,
      power: n - 1,
      modulus: n,
      why: `$${n}$ is not prime, so the theorem says nothing. In fact $${c}^{${n - 1}} \\equiv ${powMod(c, n - 1, n)}$.`,
    },
    {
      base: a,
      power: p - 2,
      modulus: p,
      why: `the power has to be $${p - 1}$, one less than $${p}$. In fact $${a}^{${p - 2}} \\equiv ${powMod(a, p - 2, p)}$.`,
    },
  ];
}

const fltTrue: Generator<TrueParams> = {
  id: 'flt-true',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const p = hard ? rng.pick([11, 13, 17, 19, 23]) : rng.pick([5, 7, 11, 13]);
      const a = hard ? rng.int(2, 60) : rng.int(2, p - 1);
      if (a % p <= 1) continue;
      const b = p * rng.int(2, hard ? 4 : 3);
      const n = hard ? rng.pick([15, 21, 25, 27, 33, 35, 39]) : rng.pick([6, 8, 9, 10, 12, 14, 15]);
      const c = rng.int(2, hard ? 20 : n - 1);
      if (c % n === 0 || powMod(c, n - 1, n) === 1) continue;
      const base: TrueParams = { p, a, b, n, c, picks: [] };
      const labels = falseStatements(base).map(statementTex);
      if (new Set(labels).size < labels.length) continue;
      return { ...base, picks: rng.sample([0, 1, 2, 3], 3).sort((x, y) => x - y) };
    }
  },
  render(params) {
    const { p, a, picks } = params;
    const wrong = falseStatements(params);
    return choiceSlide(
      [say("Which of these does Fermat's little theorem give?")],
      statementTex({ base: a, power: p - 1, modulus: p }),
      picks.map((i) => statementTex(wrong[i])),
    );
  },
  solution(params) {
    const { p, a, picks } = params;
    const wrong = falseStatements(params);
    return [
      { text: `$${p}$ is prime and does not divide $${a}$, so the theorem gives $${statementTex({ base: a, power: p - 1, modulus: p })}$.` },
      ...picks.map((i) => ({ text: `Not $${statementTex(wrong[i])}$: ${wrong[i].why}` })),
    ];
  },
};

/* ---------- does it apply ---------- */

type Case = 'applies' | 'divides' | 'composite';

interface ApplyParams {
  a: number;
  n: number;
}

const caseOf = ({ a, n }: ApplyParams): Case => (!isPrime(n) ? 'composite' : a % n === 0 ? 'divides' : 'applies');

/** A base and modulus, the theorem applying or failing either way, at this difficulty. */
function sampleApply(rng: Rng, difficulty: number): ApplyParams {
  const hard = difficulty >= 2;
  const primes = hard ? primesIn(11, 31) : primesIn(5, 13);
  const composites = hard ? [15, 21, 25, 27] : [6, 8, 9, 10, 12, 14, 15];
  for (;;) {
    const kind = rng.pick(['applies', 'applies', 'divides', 'composite'] as const);
    if (kind === 'divides') {
      const n = rng.pick(primes);
      const a = n * rng.int(2, hard ? 4 : 3);
      if (a >= 100) continue;
      return { a, n };
    }
    const n = rng.pick(kind === 'applies' ? primes : composites);
    const a = hard ? rng.int(2, 60) : rng.int(2, 30);
    if (a % n <= 1) continue;
    // A modulus that is not prime is only asked where the power is not 1, so
    // the theorem wrongly applied gives a wrong answer.
    if (kind === 'composite' && powMod(a, n - 1, n) <= 1) continue;
    // At difficulty 1 the powers repeat within six steps, so listing them is quick.
    if (kind === 'composite' && !hard && (a >= n || powersBeforeRepeat(a, n) > 6)) continue;
    return { a, n };
  }
}

const fltApplies: Generator<ApplyParams> = {
  id: 'flt-applies',
  sample(rng, difficulty) {
    for (;;) {
      const params = sampleApply(rng, difficulty);
      // Wider moduli than the typed question, since nothing here is worked out.
      if (difficulty >= 2 && rng.chance(0.3) && caseOf(params) === 'composite') {
        const n = rng.pick([33, 39, 49, 51, 57, 87, 91]);
        const a = rng.int(2, 20);
        if (gcd(a, n) !== 1) continue;
        return { a, n };
      }
      return params;
    }
  },
  render({ a, n }) {
    const kind = caseOf({ a, n });
    const answer =
      kind === 'applies' ? ['Yes', 'No', 'Yes'] : kind === 'divides' ? ['Yes', 'Yes', 'No'] : ['No', 'No'];
    return {
      kind: 'flow',
      prompt: [say("Does Fermat's little theorem say this is $1$? Each answer chooses what gets asked next.")],
      subject: `${a}^{${n - 1}} \\bmod ${n}`,
      steps: [
        {
          id: 'prime',
          ask: `Is $${n}$ prime?`,
          branches: [
            { label: 'Yes', to: 'divides' },
            { label: 'No', to: 'verdict' },
          ],
        },
        {
          id: 'divides',
          ask: `Does $${n}$ divide $${a}$?`,
          branches: [
            { label: 'Yes', to: 'verdict' },
            { label: 'No', to: 'verdict' },
          ],
        },
        {
          id: 'verdict',
          ask: `So does the theorem give $${a}^{${n - 1}} \\equiv 1$?`,
          branches: [
            { label: 'Yes', outcome: `That needs $${n}$ to be prime and not to divide $${a}$.` },
            { label: 'No', outcome: `The theorem gives it whenever $${n}$ is prime and does not divide $${a}$.` },
          ],
        },
      ],
      answer,
    };
  },
  solution({ a, n }) {
    const kind = caseOf({ a, n });
    if (kind === 'composite') {
      return [
        { text: `$${n}$ is not prime, so the theorem does not apply, whatever $${a}$ is.` },
        { text: `Worked out, $${a}^{${n - 1}} \\equiv ${powMod(a, n - 1, n)} ${pmod(n)}$.` },
      ];
    }
    if (kind === 'divides') {
      return [
        { text: `$${n}$ is prime, but $${a} = ${a / n} \\times ${n}$, so $${n}$ divides $${a}$.` },
        { text: `Then every power of $${a}$ is a multiple of $${n}$: $${a}^{${n - 1}} \\equiv 0$, and the theorem does not apply.` },
      ];
    }
    return [
      { text: `$${n}$ is prime and $${a} \\equiv ${a % n}$, so $${n}$ does not divide $${a}$.` },
      { text: `So the theorem applies: $${a}^{${n - 1}} \\equiv 1 ${pmod(n)}$.` },
    ];
  },
};

/* ---------- the residue, whether or not it applies ---------- */

const fltResidue: Generator<ApplyParams> = {
  id: 'flt-residue',
  sample: sampleApply,
  choices({ a, n }) {
    const answer = powMod(a, n - 1, n);
    return intOptions(answer, [1, 0, a % n, n - 1, mod(answer + 1, n)], 0, n - 1);
  },
  render({ a, n }) {
    return typed([`Find the residue of $${a}^{${n - 1}}$ modulo $${n}$.`], 'r =', powMod(a, n - 1, n));
  },
  solution({ a, n }) {
    const kind = caseOf({ a, n });
    if (kind === 'applies') {
      return [
        { text: `$${n}$ is prime and does not divide $${a}$, so Fermat's little theorem applies.` },
        { tex: `${a}^{${n - 1}} \\equiv 1 ${pmod(n)}` },
      ];
    }
    if (kind === 'divides') {
      return [
        { text: `$${n}$ divides $${a} = ${a / n} \\times ${n}$, so every power of $${a}$ is a multiple of $${n}$.` },
        { tex: `${a}^{${n - 1}} \\equiv 0 ${pmod(n)}` },
      ];
    }
    return [
      { text: `$${n}$ is not prime, so the theorem does not apply: work the power out.` },
      ...reduceBase(a, n),
      ...squaringSolution(mod(a, n), n - 1, n),
      { text: `So $${a}^{${n - 1}} \\equiv ${powMod(a, n - 1, n)} ${pmod(n)}$, not $1$.` },
    ];
  },
};

/* ---------- the row a, 2a, ..., (p - 1)a ---------- */

interface RowParams {
  a: number;
  p: number;
  /** The values of k whose entry is blank. */
  blanks: number[];
}

const fltRowTable: Generator<RowParams> = {
  id: 'flt-row-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const p = hard ? rng.pick([11, 13]) : rng.pick([7, 11]);
      const a = hard ? rng.int(2, 40) : rng.int(2, p - 1);
      if (a % p <= 1) continue;
      return { a, p, blanks: rng.sample(range(1, p - 1), hard ? 6 : 4).sort((x, y) => x - y) };
    }
  },
  render({ a, p, blanks }) {
    const answer = blanks.map((k) => (a * k) % p);
    const slips = [0, p, ...blanks.map((k) => a * k), ...blanks.map((k) => a + k)];
    return {
      kind: 'table',
      prompt: [
        say(`Fill in $${a} \\times k$ modulo $${p}$ for each $k$ from $1$ to $${p - 1}$.`),
        say('Then look at which residues the column holds.'),
      ],
      columns: ['k', `${a}k \\bmod ${p}`],
      rows: range(1, p - 1).map((k) => [String(k), blanks.includes(k) ? null : String((a * k) % p)]),
      bank: tableBank(answer, slips, p + 1),
      answer: answer.map(String),
    };
  },
  solution({ a, p, blanks }) {
    return [
      ...blanks.map((k) => ({ tex: stackTex(`${a} \\times ${k} = ${reduced(a * k, p)}`) })),
      {
        text: `The column holds every residue from $1$ to $${p - 1}$ exactly once: the numbers $1$ to $${p - 1}$ in a new order. So both lists have the same product, which is why $${a}^{${p - 1}} \\equiv 1$.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 2: reducing big powers
 * ================================================================ */

interface BigParams {
  a: number;
  p: number;
  e: number;
}

/** A base, prime and big power whose exponent is left at most `top` after cutting down by p - 1. */
function sampleBig(rng: Rng, difficulty: number): BigParams {
  const hard = difficulty >= 2;
  for (;;) {
    const p = hard ? rng.pick([7, 11, 13, 17, 19, 23]) : rng.pick([5, 7, 11, 13]);
    const a = hard ? rng.int(2, 99) : rng.int(2, p - 1);
    if (a % p <= 1) continue;
    const e = hard ? rng.int(100, 999) : rng.int(20, 99);
    if (e % (p - 1) > (hard ? 5 : 4)) continue;
    return { a, p, e };
  }
}

const bigAnswer = ({ a, p, e }: BigParams) => powMod(a, e, p);

function bigSolution({ a, p, e }: BigParams): SolutionStep[] {
  const ra = mod(a, p);
  const q = Math.floor(e / (p - 1));
  const r = e % (p - 1);
  return [
    ...reduceBase(a, p),
    { text: `$${p}$ is prime and does not divide $${a}$, so $${ra}^{${p - 1}} \\equiv 1$. Cut the power down by $${p - 1}$:` },
    { tex: stackTex(`${e} = ${q} \\times ${p - 1} + ${r}`) },
    {
      tex: `\\begin{gathered} ${ra}^{${e}} = (${ra}^{${p - 1}})^{${q}} \\times ${ra}^{${r}} \\\\ \\equiv 1 \\times ${ra}^{${r}} \\end{gathered}`,
    },
    ...(r === 0
      ? [{ text: `$${ra}^{0} = 1$, so the residue is $1$.` }]
      : [...smallPowerLines(ra, r, p), { text: `So the residue is $${bigAnswer({ a, p, e })}$.` }]),
  ];
}

const fltBig: Generator<BigParams> = {
  id: 'flt-big',
  sample: sampleBig,
  choices(params) {
    const { a, p, e } = params;
    const r = e % (p - 1);
    return intOptions(bigAnswer(params), [powMod(a, e % p, p), powMod(a, r + 1, p), a % p, e % p, 1], 0, p - 1);
  },
  render(params) {
    return typed([`Find the residue of $${params.a}^{${params.e}}$ modulo $${params.p}$.`], 'r =', bigAnswer(params));
  },
  solution: bigSolution,
};

const fltBigFlow: Generator<BigParams> = {
  id: 'flt-big-flow',
  sample: sampleBig,
  render(params) {
    const { a, p, e } = params;
    const r = e % (p - 1);
    const answer = bigAnswer(params);
    const key = `${a}|${p}|${e}`;
    const powers = [p - 1, p, p + 1].map((k) => `$${a}^{${k}}$`);
    return {
      kind: 'flow',
      prompt: [say('Find this residue with Fermat. Each answer chooses what gets asked next.')],
      subject: `${a}^{${e}} \\bmod ${p}`,
      steps: [
        {
          id: 'power',
          ask: `Which power of $${a}$ does the theorem make $1$ modulo $${p}$?`,
          branches: turned(powers, key).map((label) => ({ label, to: 'place' })),
        },
        {
          id: 'place',
          ask: `So only the remainder of $${e}$ on division by $${p - 1}$ matters. It is`,
          branches: dollars(threeLabels(r, [e % p, r + 1, e % (p + 1)]), key).map((label) => ({ label, to: 'value' })),
        },
        {
          id: 'value',
          ask: `So $${a}^{${e}}$ leaves`,
          branches: dollars(threeLabels(answer, [powMod(a, e % p, p), powMod(a, r + 1, p), a % p]), key).map((label) => ({
            label,
            outcome: label === `$${answer}$` ? 'That is the answer.' : `Work $${mod(a, p)}^{${r}}$ out again: it leaves $${answer}$.`,
          })),
        },
      ],
      answer: [powers[0], `$${r}$`, `$${answer}$`],
    };
  },
  solution: bigSolution,
};

/** Pairs (x, y) from different places in a bank with m x + y = e, as `x,y`. */
function splits(values: number[], m: number, e: number): string[] {
  const out = new Set<string>();
  values.forEach((x, i) =>
    values.forEach((y, j) => {
      if (i !== j && m * x + y === e) out.add(`${x},${y}`);
    }),
  );
  return [...out];
}

const fltBigTiles: Generator<BigParams> = {
  id: 'flt-big-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const params = sampleBig(rng, difficulty);
      const { p, e } = params;
      const [q, r] = [Math.floor(e / (p - 1)), e % (p - 1)];
      // The answer's own tiles must not make a second split.
      if (splits([q, r, bigAnswer(params)], p - 1, e).length > 1) continue;
      return params;
    }
  },
  render(params) {
    const { a, p, e } = params;
    const m = p - 1;
    const [q, r] = [Math.floor(e / m), e % m];
    const value = bigAnswer(params);
    const answer = [String(q), String(r), String(value)];
    // Another split such as m(q - 1) + (r + m) is a true line too, and tiles
    // are graded by the one they name, so a tile making one is left out.
    const chosen: number[] = [];
    for (const slip of [q + 1, q - 1, e % p, Math.floor(e / p), powMod(a, e % p, p), r + 1, value + 1, a % p, q + 2, q - 2, r + 2, value + 2, ...near(value, 10)]) {
      if (chosen.length >= 4 || slip < 0 || answer.includes(String(slip)) || chosen.includes(slip)) continue;
      if (splits([q, r, value, ...chosen, slip], m, e).length > 1) continue;
      chosen.push(slip);
    }
    return {
      kind: 'tiles',
      prompt: [say(`Complete the working for the residue of $${a}^{${e}}$ modulo $${p}$.`)],
      template: `${e} = ${m} \\times {0} + {1} \\qquad \\text{residue } {2}`,
      bank: fillBank(answer, chosen.map(String), 2),
      answer,
    };
  },
  solution: bigSolution,
};

/* ---------- several exponents at once ---------- */

interface ExpTableParams {
  a: number;
  p: number;
  es: number[];
}

const fltExpTable: Generator<ExpTableParams> = {
  id: 'flt-exp-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const p = hard ? rng.pick([11, 13]) : rng.pick([5, 7]);
      const a = hard ? rng.int(2, 60) : rng.int(2, p - 1);
      if (a % p <= 1) continue;
      const m = p - 1;
      const es = Array.from({ length: 4 }, () => {
        const r = rng.int(0, Math.min(m - 1, 5));
        const q = hard ? rng.int(Math.ceil(100 / m), Math.floor(990 / m)) : rng.int(Math.ceil(12 / m), Math.floor(99 / m));
        return q * m + r;
      });
      if (new Set(es).size < 4 || new Set(es.map((e) => e % m)).size < 3) continue;
      return { a, p, es: es.sort((x, y) => x - y) };
    }
  },
  render({ a, p, es }) {
    const m = p - 1;
    const answer = es.flatMap((e) => [e % m, powMod(a, e, p)]);
    const slips = es.flatMap((e) => [e % p, powMod(a, e % p, p)]);
    return {
      kind: 'table',
      prompt: [
        say(
          `For each power, find the remainder of $e$ on division by $${m}$, then the residue of $${a}^e$ modulo $${p}$.`,
        ),
      ],
      columns: ['e', `e \\bmod ${m}`, `${a}^e \\bmod ${p}`],
      rows: es.map((e) => [String(e), null, null]),
      bank: tableBank(answer, slips, p),
      answer: answer.map(String),
    };
  },
  solution({ a, p, es }) {
    const m = p - 1;
    const ra = mod(a, p);
    return [
      ...reduceBase(a, p),
      { text: `$${p}$ is prime and does not divide $${a}$, so $${ra}^{${m}} \\equiv 1$ and only the remainder on division by $${m}$ matters:` },
      ...es.map((e) => ({
        tex: stackTex(`${e} = ${Math.floor(e / m)} \\times ${m} + ${e % m}, \\quad ${ra}^{${e % m}} \\equiv ${powMod(a, e, p)}`),
      })),
    ];
  },
};

/* ================================================================
 * Lesson 3: inverses from Fermat
 * ================================================================ */

interface InverseParams {
  a: number;
  p: number;
}

interface InversePowerParams extends InverseParams {
  /** The powers offered as wrong answers. */
  ks: number[];
}

const fltInversePower: Generator<InversePowerParams> = {
  id: 'flt-inverse-power',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const p = hard ? rng.pick(primesIn(11, 31)) : rng.pick([5, 7, 11, 13]);
      const a = hard ? rng.int(2, 60) : rng.int(2, p - 1);
      if (a % p <= 1) continue;
      // A power k is wrong when a times a^k is not 1.
      const wrong = [p - 1, p, p - 3, p + 1, 2 * p - 2].filter((k) => k >= 2 && powMod(a, k + 1, p) !== 1);
      if (wrong.length < 3) continue;
      return { a, p, ks: rng.sample(wrong, 3).sort((x, y) => x - y) };
    }
  },
  render({ a, p, ks }) {
    return choiceSlide(
      [say(`$${p}$ is prime. Which of these is an inverse of $${a}$ modulo $${p}$?`)],
      `${a}^{${p - 2}}`,
      ks.map((k) => `${a}^{${k}}`),
    );
  },
  solution({ a, p, ks }) {
    return [
      { text: `$${a} \\times ${a}^{${p - 2}} = ${a}^{${p - 1}}$, and Fermat's little theorem makes that $\\equiv 1 ${pmod(p)}$.` },
      ...ks.map((k) => ({
        text: `$${a} \\times ${a}^{${k}} = ${a}^{${k + 1}} \\equiv ${powMod(a, k + 1, p)}$, not $1$.`,
      })),
    ];
  },
};

function inverseSolution({ a, p }: InverseParams): SolutionStep[] {
  const ra = mod(a, p);
  const inv = inverseOf(a, p);
  return [
    ...reduceBase(a, p),
    { text: `The inverse is $${ra}^{p - 2} = ${ra}^{${p - 2}}$, reduced modulo $${p}$:` },
    ...(p - 2 <= 5 ? smallPowerLines(ra, p - 2, p) : squaringSolution(ra, p - 2, p)),
    { text: `Check: $${ra} \\times ${inv} = ${ra * inv} \\equiv 1 ${pmod(p)}$.` },
  ];
}

const fltInverse: Generator<InverseParams> = {
  id: 'flt-inverse',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const p = hard ? rng.pick([13, 17, 19, 23]) : rng.pick([5, 7, 11]);
      const a = hard ? rng.int(2, 99) : rng.int(2, 30);
      if (a % p <= 1) continue;
      return { a, p };
    }
  },
  choices({ a, p }) {
    const inv = inverseOf(a, p);
    return intOptions(inv, [p - inv, a % p, powMod(a, p - 3, p), inv + 1, inv - 1], 1, p - 1);
  },
  render({ a, p }) {
    return typed(
      [`Find the inverse of $${a}$ modulo $${p}$: the number $x$ from $1$ to $${p - 1}$ with $${a}x \\equiv 1$.`],
      'x =',
      inverseOf(a, p),
    );
  },
  solution: inverseSolution,
};

const fltInverseSquaring: Generator<InverseParams> = {
  id: 'flt-inverse-squaring',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const p = hard ? rng.pick([17, 19, 23, 29, 31]) : rng.pick([11, 13, 17]);
      const a = hard ? rng.int(p + 2, 99) : rng.int(2, p - 2);
      if (a % p <= 1) continue;
      if (squaredResidues(a, p, squarings(p - 2).length).filter((x) => x === 1).length > 1) continue;
      return { a, p };
    }
  },
  render({ a, p }) {
    return squaringTree(a, p - 2, p, [
      say(`Find the inverse of $${a}$ modulo $${p}$ as $${a}^{${p - 2}}$, by repeated squaring: $${p - 2} = ${binarySum(p - 2)}$.`),
    ]);
  },
  solution: inverseSolution,
};

/* ---------- why a^(p - 2) is an inverse ---------- */

interface InverseOrderParams extends InverseParams {
  picks: number[];
}

function inverseProof({ a, p }: InverseParams): Proof {
  return {
    claim: `Prove that $${a}^{${p - 2}}$ is an inverse of $${a}$ modulo $${p}$.`,
    steps: [
      `$${p}$ is prime, and $${p}$ does not divide $${a}$.`,
      `So by Fermat's little theorem, $${a}^{${p - 1}} \\equiv 1 ${pmod(p)}$.`,
      `Multiplying adds the powers: $${a} \\times ${a}^{${p - 2}} = ${a}^{1 + ${p - 2}}$.`,
      `And $1 + ${p - 2} = ${p - 1}$, so $${a} \\times ${a}^{${p - 2}} = ${a}^{${p - 1}}$.`,
      `So $${a} \\times ${a}^{${p - 2}} \\equiv 1 ${pmod(p)}$, and $${a}^{${p - 2}}$ is an inverse of $${a}$.`,
    ],
    pool: [
      {
        text: `So by Fermat's little theorem, $${a}^{${p}} \\equiv 1 ${pmod(p)}$.`,
        why: `The theorem's power is $${p - 1}$, one less than $${p}$.`,
      },
      {
        text: `Multiplying adds the powers: $${a} \\times ${a}^{${p - 2}} = ${a}^{${p - 3}}$.`,
        why: `Multiplying by $${a}$ adds one to the power, so it is $${a}^{${p - 1}}$.`,
      },
      {
        text: `So $${a}^{${p - 2}} \\equiv 1 ${pmod(p)}$.`,
        why: `It is $${a} \\times ${a}^{${p - 2}}$ that is $\\equiv 1$, not $${a}^{${p - 2}}$ on its own.`,
      },
    ],
  };
}

const fltInverseOrder: Generator<InverseOrderParams> = {
  id: 'flt-inverse-order',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const p = hard ? rng.pick([11, 13, 17, 19, 23]) : rng.pick([5, 7, 11, 13]);
    const a = rng.int(2, p - 1);
    return { a, p, picks: pickDistractors(rng, inverseProof({ a, p }), difficulty) };
  },
  render: (params) => orderSlide(inverseProof(params), params.picks),
  solution: (params) => orderSolution(inverseProof(params), params.picks),
};

/* ---------- a^p ≡ a ---------- */

interface PowerPParams {
  a: number;
  p: number;
  /** The power: p, or p + 1. */
  e: number;
}

const powerPAnswer = ({ a, p, e }: PowerPParams) => (e === p ? a % p : ((a % p) * (a % p)) % p);

const fltPowerP: Generator<PowerPParams> = {
  id: 'flt-power-p',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const p = hard ? rng.pick([7, 11, 13, 17, 19]) : rng.pick([5, 7, 11, 13]);
    // Now and then a multiple of p, where a^p ≡ a still holds.
    const a = rng.chance(0.2) ? p * rng.int(2, Math.floor(99 / p)) : rng.int(10, 99);
    return { a, p, e: hard ? p + 1 : p };
  },
  choices(params) {
    const { a, p } = params;
    const answer = powerPAnswer(params);
    return intOptions(answer, [1, 0, a % p, ((a % p) * (a % p)) % p, p - answer, a % (p - 1)], 0, p - 1);
  },
  render(params) {
    return typed([`Find the residue of $${params.a}^{${params.e}}$ modulo $${params.p}$.`], 'r =', powerPAnswer(params));
  },
  solution(params) {
    const { a, p, e } = params;
    const ra = a % p;
    const lines: SolutionStep[] = [
      { text: `For every $a$, $a^{p} \\equiv a ${pmod(p)}$, even when $${p}$ divides $a$.` },
      { tex: stackTex(`${a}^{${p}} \\equiv ${a} \\equiv ${ra}`) },
    ];
    if (e === p) return [...lines, { text: `So the residue is $${ra}$.` }];
    return [
      ...lines,
      { text: `One more power is one more factor of $${a}$:` },
      { tex: `\\begin{gathered} ${a}^{${e}} = ${a}^{${p}} \\times ${a} \\\\ \\equiv ${ra} \\times ${ra} = ${reduced(ra * ra, p)} \\end{gathered}` },
    ];
  },
};

/* ================================================================
 * Lesson 4: spotting composites
 * ================================================================ */

interface TestParams {
  a: number;
  n: number;
}

/**
 * A modulus that is not prime and a base sharing no factor with it. At
 * difficulty 1 the base's powers come back to 1 within six steps, so the
 * cycle from Modular Arithmetic finds the residue by hand.
 */
function sampleTest(rng: Rng, difficulty: number): TestParams {
  const hard = difficulty >= 2;
  for (;;) {
    const n = rng.pick(hard ? [15, 21, 25, 27] : [9, 10, 14, 15, 16, 18, 20, 21, 22, 26, 28]);
    const a = hard ? rng.int(2, 60) : rng.int(2, 12);
    const r = a % n;
    if (gcd(a, n) !== 1 || r <= 1 || r === n - 1) continue;
    if (!hard && orderOf(a, n) > 6) continue;
    if (powMod(a, n - 1, n) === 1) continue;
    return { a, n };
  }
}

function testSolution({ a, n }: TestParams): SolutionStep[] {
  const answer = powMod(a, n - 1, n);
  return [
    ...reduceBase(a, n),
    ...squaringSolution(mod(a, n), n - 1, n),
    {
      text:
        answer === 1
          ? `So $${a}^{${n - 1}} \\equiv 1 ${pmod(n)}$: the test says nothing about $${n}$.`
          : `So $${a}^{${n - 1}} \\equiv ${answer} ${pmod(n)}$. That is not $1$, so $${n}$ is not prime.`,
    },
  ];
}

const fltTestResidue: Generator<TestParams> = {
  id: 'flt-test-residue',
  sample: sampleTest,
  choices({ a, n }) {
    const answer = powMod(a, n - 1, n);
    return intOptions(answer, [1, 0, a % n, n - 1, powMod(a, n, n)], 0, n - 1);
  },
  render({ a, n }) {
    return typed([`Test $${n}$ with base $${a}$: find the residue of $${a}^{${n - 1}}$ modulo $${n}$.`], 'r =', powMod(a, n - 1, n));
  },
  solution: testSolution,
};

const VERDICTS = { composite: 'Not prime', unknown: 'Could be either', prime: 'Prime' } as const;

const OUTCOMES: Record<string, string> = {
  [VERDICTS.composite]: 'Only a residue other than $1$ shows that.',
  [VERDICTS.unknown]: 'A residue of $1$ shows nothing either way.',
  [VERDICTS.prime]: 'This test can never prove a number prime.',
};

const fltTestFlow: Generator<TestParams> = {
  id: 'flt-test-flow',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      if (rng.chance(0.3)) {
        // A prime modulus, where the test passes.
        const n = rng.pick(hard ? [11, 13, 17, 19, 23] : [7, 11, 13]);
        const a = hard ? rng.int(2, 60) : rng.int(2, 12);
        if (a % n <= 1) continue;
        return { a, n };
      }
      if (rng.chance(0.15)) {
        // A modulus that is not prime and still passes: 4^14 ≡ 1 (mod 15).
        const n = rng.pick([15, 21, 25, 28]);
        const a = rng.int(2, hard ? 60 : 20);
        if (gcd(a, n) !== 1 || a % n <= 1 || powMod(a, n - 1, n) !== 1) continue;
        if (!hard && orderOf(a, n) > 6) continue;
        return { a, n };
      }
      return sampleTest(rng, difficulty);
    }
  },
  render({ a, n }) {
    const answer = powMod(a, n - 1, n);
    const verdict = answer === 1 ? VERDICTS.unknown : VERDICTS.composite;
    const key = `${a}|${n}`;
    return {
      kind: 'flow',
      prompt: [say(`Test $${n}$ with base $${a}$. Each answer chooses what gets asked next.`)],
      subject: `${a}^{${n - 1}} \\bmod ${n}`,
      steps: [
        {
          id: 'residue',
          ask: `First, $${a}^{${n - 1}}$ leaves`,
          branches: dollars(threeLabels(answer, [answer === 1 ? a % n : 1, powMod(a, n, n), n - 1]), key).map((label) => ({
            label,
            to: 'verdict',
          })),
        },
        {
          id: 'verdict',
          ask: `So what does this test show about $${n}$?`,
          branches: turned([VERDICTS.composite, VERDICTS.unknown, VERDICTS.prime], key).map((label) => ({
            label,
            outcome: OUTCOMES[label],
          })),
        },
      ],
      answer: [`$${answer}$`, verdict],
    };
  },
  solution({ a, n }) {
    if (isPrime(n)) {
      return [
        ...reduceBase(a, n),
        { text: `$${n}$ is prime and does not divide $${a}$, so by Fermat $${a}^{${n - 1}} \\equiv 1 ${pmod(n)}$.` },
        { text: 'A residue of $1$ is what a prime gives, but some numbers that are not prime give it too, so the test shows nothing either way.' },
      ];
    }
    const lines = testSolution({ a, n });
    return powMod(a, n - 1, n) === 1
      ? [...lines, { text: `$${n}$ is not prime, yet it passes with base $${a}$: a $1$ cannot prove a number prime.` }]
      : lines;
  },
};

/* ---------- what a result shows ---------- */

interface VerdictParams {
  a: number;
  n: number;
}

const VERDICT_OPTIONS = {
  composite: 'It is not prime',
  prime: 'It is prime',
  unknown: 'Nothing: it may or may not be prime',
} as const;

const fltVerdict: Generator<VerdictParams> = {
  id: 'flt-verdict',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const [lo, hi] = hard ? [100, 999] : [20, 99];
    for (;;) {
      const a = rng.pick(hard ? [2, 3, 5] : [2, 3]);
      const want = rng.pick(['pass', 'fail', 'pseudo'] as const);
      const pool =
        want === 'pseudo'
          ? compositesIn(lo, hi).filter((n) => gcd(a, n) === 1 && powMod(a, n - 1, n) === 1)
          : want === 'pass'
            ? primesIn(lo, hi).filter((n) => n % a !== 0)
            : compositesIn(lo, hi).filter((n) => gcd(a, n) === 1 && powMod(a, n - 1, n) !== 1);
      if (pool.length === 0) continue;
      return { a, n: rng.pick(pool) };
    }
  },
  render({ a, n }) {
    const r = powMod(a, n - 1, n);
    return choiceSlide(
      [say(`A calculator gives $${a}^{${n - 1}} \\equiv ${r} ${pmod(n)}$.`), say(`What does that show about $${n}$?`)],
      r === 1 ? VERDICT_OPTIONS.unknown : VERDICT_OPTIONS.composite,
      r === 1 ? [VERDICT_OPTIONS.composite, VERDICT_OPTIONS.prime] : [VERDICT_OPTIONS.unknown, VERDICT_OPTIONS.prime],
      true,
    );
  },
  solution({ a, n }) {
    const r = powMod(a, n - 1, n);
    if (r !== 1) {
      return [
        { text: `If $${n}$ were prime, then, as it does not divide $${a}$, Fermat would give $${a}^{${n - 1}} \\equiv 1$.` },
        { text: `It gives $${r}$ instead, so $${n}$ is not prime, even though no factor of it has been found.` },
      ];
    }
    return [
      { text: `A prime would give $1$, but so do some numbers that are not prime, such as $341$ with base $2$.` },
      {
        text: isPrime(n)
          ? `So the $1$ shows nothing either way. ($${n}$ happens to be prime, but this result alone cannot tell you.)`
          : `So the $1$ shows nothing either way. ($${n}$ is in fact not prime: it is a number that fools this test.)`,
      },
    ];
  },
};

const fltTestSquaring: Generator<TestParams> = {
  id: 'flt-test-squaring',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const n = rng.pick(hard ? [21, 25, 27] : [15, 21, 25, 27]);
      const a = hard ? rng.int(n + 2, 99) : rng.int(2, n - 2);
      if (gcd(a, n) !== 1 || a % n <= 1 || a % n === n - 1) continue;
      if (squaredResidues(a, n, squarings(n - 1).length).filter((x) => x === 1).length > 1) continue;
      return { a, n };
    }
  },
  render({ a, n }) {
    return squaringTree(a, n - 1, n, [
      say(`Test $${n}$ with base $${a}$: find $${a}^{${n - 1}}$ modulo $${n}$ by repeated squaring, with $${n - 1} = ${binarySum(n - 1)}$.`),
    ]);
  },
  solution: testSolution,
};

/* ================================================================
 * Lesson 5: Wilson's theorem
 * ================================================================ */

interface WilsonTableParams {
  p: number;
  blanks: number[];
}

const fltWilsonTable: Generator<WilsonTableParams> = {
  id: 'flt-wilson-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const p = hard ? rng.pick([13, 17, 19]) : rng.pick([7, 11, 13]);
    return { p, blanks: rng.sample(range(2, p - 2), hard ? 6 : 4).sort((x, y) => x - y) };
  },
  render({ p, blanks }) {
    const answer = blanks.map((k) => inverseOf(k, p));
    const slips = [...answer.map((x) => p - x), ...answer.map((x) => x + 1), 0, p];
    return {
      kind: 'table',
      prompt: [say(`Fill in the inverse of each number modulo $${p}$: the number it multiplies with to make $1$.`)],
      columns: ['k', `\\text{inverse mod } ${p}`],
      rows: range(1, p - 1).map((k) => [String(k), blanks.includes(k) ? null : String(inverseOf(k, p))]),
      bank: tableBank(answer, slips, p + 1),
      answer: answer.map(String),
    };
  },
  solution({ p, blanks }) {
    return [
      ...blanks.map((k) => {
        const inv = inverseOf(k, p);
        return { tex: stackTex(`${k} \\times ${inv} = ${k * inv} \\equiv 1`) };
      }),
      { text: `The numbers pair off with their inverses, except $1$ and $${p - 1}$, which are their own.` },
    ];
  },
};

interface WilsonParams {
  p: number;
  /** The factorial asked is (p - k)!. */
  k: number;
}

const wilsonAnswer = ({ p, k }: WilsonParams) => (k === 1 ? p - 1 : k === 2 ? 1 : (p - 1) / 2);

function wilsonSolution({ p, k }: WilsonParams): SolutionStep[] {
  const wilson: SolutionStep[] = [
    { text: `$${p}$ is prime, so by Wilson's theorem:` },
    { tex: stackTex(`${p - 1}! \\equiv -1 \\equiv ${p - 1} ${pmod(p)}`) },
  ];
  if (k === 1) return wilson;
  if (k === 2) {
    return [
      ...wilson,
      { text: `$${p - 1}! = ${p - 1} \\times ${p - 2}!$, and $${p - 1} \\equiv -1$:` },
      { tex: `\\begin{gathered} -1 \\equiv -1 \\times ${p - 2}! \\\\ ${p - 2}! \\equiv 1 \\end{gathered}` },
    ];
  }
  return [
    ...wilson,
    { text: `$${p - 1}! = ${p - 1} \\times ${p - 2} \\times ${p - 3}!$, and $${p - 1} \\times ${p - 2} \\equiv (-1)(-2) = 2$:` },
    { tex: `\\begin{gathered} 2 \\times ${p - 3}! \\equiv -1 \\equiv ${p - 1} \\\\ ${p - 3}! \\equiv ${(p - 1) / 2} \\end{gathered}` },
    { text: `Check: $2 \\times ${(p - 1) / 2} = ${p - 1}$.` },
  ];
}

const fltWilson: Generator<WilsonParams> = {
  id: 'flt-wilson',
  sample(rng, difficulty) {
    if (difficulty < 2) return { p: rng.pick(primesIn(5, 131)), k: 1 };
    return { p: rng.pick(primesIn(11, 997)), k: rng.pick([2, 3]) };
  },
  choices(params) {
    const { p } = params;
    return intOptions(wilsonAnswer(params), [p - 1, 1, 0, (p + 1) / 2, (p - 1) / 2, p - 2], 0, p - 1);
  },
  render(params) {
    const { p, k } = params;
    return typed([`Find the remainder when $${p - k}!$ is divided by $${p}$.`], 'r =', wilsonAnswer(params));
  },
  solution: wilsonSolution,
};

const fltWilsonFlow: Generator<WilsonParams> = {
  id: 'flt-wilson-flow',
  sample(rng, difficulty) {
    return difficulty < 2 ? { p: rng.pick(primesIn(7, 131)), k: 2 } : { p: rng.pick(primesIn(11, 199)), k: 3 };
  },
  render(params) {
    const { p, k } = params;
    const answer = wilsonAnswer(params);
    const key = `${p}|${k}`;
    const whole = {
      id: 'whole',
      ask: `By Wilson's theorem, $${p - 1}!$ leaves`,
      branches: dollars([p - 1, 1, 0], key).map((label) => ({ label, to: 'step' })),
    };
    const step =
      k === 2
        ? {
            id: 'step',
            ask: `$${p - 1}! = ${p - 1} \\times ${p - 2}!$, and $${p - 1}$ is congruent to`,
            branches: turned(['$-1$', '$1$', '$0$'], key).map((label) => ({ label, to: 'value' })),
          }
        : {
            id: 'step',
            ask: `$${p - 1}! = ${p - 1} \\times ${p - 2} \\times ${p - 3}!$, and $${p - 1} \\times ${p - 2} \\equiv (-1)(-2)$, which is`,
            branches: turned(['$2$', '$-2$', '$3$'], key).map((label) => ({ label, to: 'value' })),
          };
    const values = threeLabels(answer, k === 2 ? [p - 1, p - 2] : [(p + 1) / 2, p - 2, p - 3]);
    return {
      kind: 'flow',
      prompt: [say("Find this remainder from Wilson's theorem. Each answer chooses what gets asked next.")],
      subject: `${p - k}! \\bmod ${p}`,
      steps: [
        whole,
        step,
        {
          id: 'value',
          ask: `So $${p - k}!$ leaves`,
          branches: dollars(values, key).map((label) => ({
            label,
            outcome:
              label === `$${answer}$`
                ? 'That is the answer.'
                : k === 2
                  ? `$-1 \\times ${p - 2}! \\equiv -1$, so $${p - 2}! \\equiv 1$.`
                  : `$2 \\times ${p - 3}! \\equiv ${p - 1}$, so $${p - 3}! \\equiv ${answer}$.`,
          })),
        },
      ],
      answer: [`$${p - 1}$`, k === 2 ? '$-1$' : '$2$', `$${answer}$`],
    };
  },
  solution: wilsonSolution,
};

/* ---------- which factorial congruence is true ---------- */

interface Fact {
  f: number;
  r: number;
  m: number;
}

interface WilsonTrueParams {
  correct: Fact;
  wrong: Fact[];
}

const factTex = ({ f, r, m }: Fact) => `${f}! \\equiv ${r} ${pmod(m)}`;
const factHolds = ({ f, r, m }: Fact) => factMod(f, m) === mod(r, m);

const fltWilsonTrue: Generator<WilsonTrueParams> = {
  id: 'flt-wilson-true',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const p = rng.pick(hard ? primesIn(11, 199) : primesIn(7, 97));
      const n = rng.pick(compositesIn(6, hard ? 99 : 30));
      const candidates: Fact[] = hard
        ? [
            { f: p - 1, r: -1, m: p },
            { f: p - 2, r: 1, m: p },
            { f: n - 1, r: 0, m: n },
            { f: n - 1, r: -1, m: n },
            { f: p - 2, r: -1, m: p },
            { f: p, r: -1, m: p },
            { f: p - 1, r: 1, m: p },
            { f: p - 3, r: 1, m: p },
          ]
        : [
            { f: p - 1, r: -1, m: p },
            { f: p - 1, r: 1, m: p },
            { f: p, r: -1, m: p },
            { f: p - 1, r: 0, m: p },
            { f: p - 2, r: -1, m: p },
          ];
      const truths = candidates.filter(factHolds);
      const lies = candidates.filter((fact) => !factHolds(fact));
      const correct = hard ? rng.pick(truths) : candidates[0];
      if (!factHolds(correct) || lies.length < 3) continue;
      return { correct, wrong: rng.sample(lies, 3) };
    }
  },
  render({ correct, wrong }) {
    return choiceSlide([say('Which of these is true?')], factTex(correct), wrong.map(factTex));
  },
  solution({ correct, wrong }) {
    const why = ({ f, m }: Fact): string => {
      if (!isPrime(m)) return `$${m}$ is not prime, so $${f}!$ is a multiple of it: $${f}! \\equiv 0$.`;
      if (f >= m) return `$${f}!$ has $${m}$ as a factor, so it is $\\equiv 0$.`;
      return `In fact $${f}! \\equiv ${factMod(f, m)} ${pmod(m)}$.`;
    };
    return [
      {
        text: `True: $${factTex(correct)}$. ${
          !isPrime(correct.m)
            ? `$${correct.m}$ is not prime, so $${correct.f}!$ is a multiple of it.`
            : correct.f === correct.m - 1
              ? "That is Wilson's theorem."
              : `$${correct.m - 1}! = ${correct.m - 1} \\times ${correct.m - 2}!$ and $${correct.m - 1} \\equiv -1$, so $${correct.m - 2}! \\equiv 1$.`
        }`,
      },
      ...wrong.map((fact) => ({ text: `Not $${factTex(fact)}$: ${why(fact)}` })),
    ];
  },
};

export const numberFermatGenerators = [
  fltPowerTable,
  fltTrue,
  fltApplies,
  fltResidue,
  fltRowTable,
  fltBig,
  fltBigFlow,
  fltBigTiles,
  fltExpTable,
  fltInversePower,
  fltInverse,
  fltInverseSquaring,
  fltInverseOrder,
  fltPowerP,
  fltTestResidue,
  fltTestFlow,
  fltVerdict,
  fltTestSquaring,
  fltWilsonTable,
  fltWilson,
  fltWilsonFlow,
  fltWilsonTrue,
];

export const fermatTesting = { powMod, factMod, inverseOf };

/** The order slide here, for `proofOrder.test.ts`, which grades each proof as a learner would. */
export const numberFermatOrders = [fltInverseOrder];
