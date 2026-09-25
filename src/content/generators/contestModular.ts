/**
 * Contest Math, level 17: Modular Arithmetic.
 *
 * Four lessons, one idea under all of them: only the remainder matters, so
 * replace a number by its remainder as early as possible. System of
 * Congruences solves two or three remainder conditions at once, by listing
 * the numbers that pass the larger divisor, or, when every remainder is the
 * same distance short of its divisor, with one LCM. Fractions divides modulo
 * a prime (add the modulus until the division comes out), divides the modulus
 * too when it shares a factor, and reads far digits of a repeating decimal.
 * Units Digit takes the exponent itself modulo 4 for a tower, adds powers a
 * block of ten at a time, and finds last two digits from a power ending in 01.
 * Euler's Theorem counts the numbers coprime to n and cuts a huge exponent
 * down modulo p - 1 or φ(n).
 *
 * Every answer is a whole number. Level 1 asks the last digit of a single
 * power and Level 9 the last digit of a sum of two, so the units digit here
 * starts from towers and long sums; Level 11's digital root is the remainder
 * on dividing by 9 and is not asked again.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { factorTex, factorise, gcd, lcm, num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ================================================================
 * Shared pieces
 * ================================================================ */

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** a^e on dividing by n, for an exponent below 2^31. */
function powMod(a: number, e: number, n: number): number {
  let result = 1 % n;
  let base = mod(a, n);
  let rest = e;
  while (rest > 0) {
    if (rest & 1) result = (result * base) % n;
    base = (base * base) % n;
    rest >>= 1;
  }
  return result;
}

const pmod = (n: number) => `\\pmod{${n}}`;

/** `a^{e}`, a first power written bare and a zeroth power as 1. */
const powTex = (a: number | string, e: number) => (e === 0 ? '1' : e === 1 ? `${a}` : `${a}^{${e}}`);

/** 1st, 2nd, 3rd, 11th, 22nd, 100th. */
function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
}

/** "4, 6 and 10". */
function listText(items: (string | number)[]): string {
  if (items.length === 1) return `${items[0]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** `x = q \\times d + r` written as the division it is. */
const divisionTex = (x: number, d: number) => `${x} = ${d} \\times ${Math.floor(x / d)} + ${x % d}`;

/** Four digit options: the answer and three distinct slips, topped up with other digits. */
function digitOptions(correct: number, slips: number[]): ChoiceOption[] {
  const picked: number[] = [];
  for (const value of [...slips, correct + 5, correct + 1, correct - 1, correct + 2, correct - 2, correct + 3]) {
    if (picked.length === 3) break;
    const d = mod(value, 10);
    if (d === correct || picked.includes(d)) continue;
    picked.push(d);
  }
  return options(
    { tex: `${correct}`, answer: `${correct}` },
    ...picked.sort((a, b) => a - b).map((d) => ({ tex: `${d}`, answer: `${d}` })),
  );
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Four options for a pair of last digits, labelled `07` but typed and graded as 7. */
function lastTwoOptions(correct: number, slips: number[]): ChoiceOption[] {
  const picked: number[] = [];
  for (const value of [...slips, correct + 10, correct - 10, correct + 20, correct - 20, correct + 2, correct - 2]) {
    if (picked.length === 3) break;
    const d = mod(value, 100);
    if (d === correct || picked.includes(d)) continue;
    picked.push(d);
  }
  return options(
    { tex: pad2(correct), answer: `${correct}` },
    ...picked.sort((a, b) => a - b).map((d) => ({ tex: pad2(d), answer: `${d}` })),
  );
}

/** The x from 1 to p - 1 with a·x leaving 1 on dividing by p, and how many p's were added to 1 to reach a·x. */
function inverseOf(a: number, p: number): { x: number; k: number } {
  for (let x = 1; x < p; x += 1) if ((a * x) % p === 1) return { x, k: (a * x - 1) / p };
  throw new Error(`${a} has no inverse modulo ${p}`);
}

/** The smallest positive N meeting every condition N ≡ rems[i] (mod mods[i]). */
function smallestSolution(mods: number[], rems: number[]): number {
  const limit = mods.reduce((t, m) => t * m, 1);
  for (let n = 1; n <= limit; n += 1) if (mods.every((m, i) => n % m === rems[i])) return n;
  throw new Error('no solution');
}

/** `N \\equiv 2 \\pmod{5}, \\qquad N \\equiv 3 \\pmod{7}`: stacks on a phone. */
const systemTex = (mods: number[], rems: number[]) => mods.map((m, i) => `N \\equiv ${rems[i]} ${pmod(m)}`).join(', \\qquad ');

/** The numbers from `start` stepping by `step` up to and including `end`. */
function steps(start: number, step: number, end: number): number[] {
  const out: number[] = [];
  for (let v = start; v <= end; v += step) out.push(v);
  return out;
}

/* ================================================================
 * Lesson 1: System of Congruences
 * ================================================================ */

/* ---------- replace N by its remainder ---------- */

interface ShiftParams {
  m: number;
  r: number;
  a: number;
  b: number;
  /** Difficulty 2: N^2 + aN + b rather than aN + b. */
  square: boolean;
}

const shiftRaw = ({ r, a, b, square }: ShiftParams) => (square ? r * r + a * r + b : a * r + b);
const shiftTex = ({ a, b, square }: ShiftParams) => (square ? `N^{2} + ${a}N + ${b}` : `${a}N + ${b}`);

const cmMdRemainderShift: Generator<ShiftParams> = {
  id: 'cm-md-remainder-shift',
  sample(rng, difficulty) {
    for (;;) {
      const p: ShiftParams = {
        m: rng.int(5, 13),
        r: 0,
        a: rng.int(2, 9),
        b: rng.int(1, difficulty >= 2 ? 12 : 20),
        square: difficulty >= 2,
      };
      p.r = rng.int(2, p.m - 1);
      if (p.a % p.m === 0 || shiftRaw(p) < 2 * p.m) continue;
      return p;
    }
  },
  render(p) {
    return typed(
      [
        say(`When $N$ is divided by ${p.m}, the remainder is ${p.r}.`),
        show(shiftTex(p)),
        say(`What remainder does this leave when divided by ${p.m}?`),
      ],
      mod(shiftRaw(p), p.m),
      '\\text{remainder} =',
    );
  },
  choices(p) {
    const { m, r, a, b } = p;
    const raw = shiftRaw(p);
    const slips = p.square
      ? [raw, mod(r * r + a * r, m), mod(2 * r + a * r + b, m), mod(r * r + b, m)]
      : [raw, mod(a * r, m), mod(r + b, m), r];
    const answer = mod(raw, m);
    // Apart from the unreduced trap, every option is a possible remainder, nearest first.
    const others = Array.from({ length: m }, (_, i) => i).sort((x, y) => Math.abs(x - answer) - Math.abs(y - answer) || x - y);
    return numberOptions(answer, [raw, ...slips.slice(1).filter((v) => v < m), ...others], 1, 0);
  },
  solution(p) {
    const { m, r, a, b } = p;
    const raw = shiftRaw(p);
    const put = p.square ? `${r}^{2} + ${a} \\times ${r} + ${b}` : `${a} \\times ${r} + ${b}`;
    return [
      { text: `$N$ is a multiple of ${m} plus ${r}, and the multiple of ${m} leaves nothing behind, whatever it is multiplied by. So put ${r} in place of $N$:` },
      { tex: `${shiftTex(p)} \\equiv ${put} ${pmod(m)}` },
      { tex: `${put} = ${raw}` },
      { tex: divisionTex(raw, m) },
      { text: `The remainder is ${mod(raw, m)}. Stopping at ${raw} is the trap: a remainder is always less than ${m}.` },
    ];
  },
};

/* ---------- two or three conditions: list and check ---------- */

interface SieveParams {
  mods: number[];
  rems: number[];
}

const SIEVE_POOL = [3, 4, 5, 7, 8, 9, 11];

/** The largest divisor's list, then (for three) the two largest combined. */
function sieveWork({ mods, rems }: SieveParams) {
  const order = mods.map((_, i) => i).sort((i, j) => mods[j] - mods[i]);
  const [big, next, last] = order;
  const pairMods = [mods[big], mods[next]];
  const pairRems = [rems[big], rems[next]];
  const pair = smallestSolution(pairMods, pairRems);
  const pairList = steps(rems[big], mods[big], pair);
  if (last === undefined) return { big, next, pair, pairList, finalList: pairList, last };
  const step = mods[big] * mods[next];
  const n = smallestSolution(mods, rems);
  return { big, next, pair, pairList, finalList: steps(pair, step, n), last, step };
}

const cmMdCrtSieve: Generator<SieveParams> = {
  id: 'cm-md-crt-sieve',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const mods = rng.sample(SIEVE_POOL, 3);
        if (gcd(mods[0], mods[1]) > 1 || gcd(mods[0], mods[2]) > 1 || gcd(mods[1], mods[2]) > 1) continue;
        if (mods[0] * mods[1] * mods[2] > 400) continue;
        const rems = mods.map((m) => rng.int(1, m - 1));
        const w = sieveWork({ mods, rems });
        const n = smallestSolution(mods, rems);
        if (w.pairList.length < 2 || w.pairList.length > 6 || w.finalList.length < 2 || w.finalList.length > 6) continue;
        if (n <= Math.max(...mods)) continue;
        return { mods, rems };
      }
      const mods = [rng.int(3, 12), rng.int(3, 12)];
      if (mods[0] === mods[1] || gcd(mods[0], mods[1]) > 1 || mods[0] * mods[1] > 90) continue;
      const rems = mods.map((m) => rng.int(1, m - 1));
      const w = sieveWork({ mods, rems });
      if (w.pairList.length < 2 || w.pairList.length > 6) continue;
      if (w.pair <= Math.max(...mods)) continue;
      return { mods, rems };
    }
  },
  render({ mods, rems }) {
    return typed(
      [say('What is the smallest positive whole number $N$ with'), show(systemTex(mods, rems))],
      smallestSolution(mods, rems),
      'N =',
    );
  },
  choices({ mods, rems }) {
    const n = smallestSolution(mods, rems);
    const product = mods.reduce((t, m) => t * m, 1);
    const biggest = Math.max(...mods);
    return numberOptions(n, [n + product, n + biggest, n + Math.min(...mods), n - biggest], 1, 1);
  },
  solution(p) {
    const { mods, rems } = p;
    const w = sieveWork(p);
    const out: SolutionStep[] = [
      { text: `List the numbers that leave ${rems[w.big]} on dividing by ${mods[w.big]}, the ${mods.length === 2 ? 'larger' : 'largest'} divisor, so the list is short:` },
      { tex: `${w.pairList.join(', ')}, \\ldots` },
      { text: `Check each on dividing by ${mods[w.next]}. The first to leave ${rems[w.next]} is ${w.pair}:` },
      { tex: divisionTex(w.pair, mods[w.next]) },
    ];
    if (w.last === undefined) {
      out.push({ text: `Any other number that works differs from ${w.pair} by a multiple of both divisors, ${mods[0] * mods[1]}, so ${w.pair} is the smallest.` });
      return out;
    }
    const n = smallestSolution(mods, rems);
    out.push(
      { text: `Numbers meeting both of those conditions step up by ${mods[w.big]} × ${mods[w.next]} = ${w.step}. Check them on dividing by ${mods[w.last]}:` },
      { tex: `${w.finalList.join(', ')}, \\ldots` },
      { tex: divisionTex(n, mods[w.last]) },
      { text: `So $N = ${n}$.` },
    );
    return out;
  },
};

/* ---------- the same search as a table ---------- */

interface CrtTableParams {
  /** The larger divisor, whose numbers are listed. */
  m: number;
  r: number;
  n: number;
  s: number;
}

const crtTableN = ({ m, r, n, s }: CrtTableParams) => smallestSolution([m, n], [r, s]);

const cmMdCrtTable: Generator<CrtTableParams> = {
  id: 'cm-md-crt-table',
  sample(rng, difficulty) {
    for (;;) {
      const m = difficulty >= 2 ? rng.int(8, 13) : rng.int(5, 9);
      const n = difficulty >= 2 ? rng.int(5, 9) : rng.int(3, 7);
      if (n >= m || gcd(m, n) > 1) continue;
      const p: CrtTableParams = { m, r: rng.int(1, m - 1), n, s: rng.int(1, n - 1) };
      const rows = (crtTableN(p) - p.r) / m + 1;
      if (rows < (difficulty >= 2 ? 4 : 3) || rows > (difficulty >= 2 ? 6 : 5)) continue;
      return p;
    }
  },
  render(p) {
    const { m, r, n, s } = p;
    const N = crtTableN(p);
    const listed = steps(r, m, N);
    const answer = [...listed.map((v) => v % n), N];
    return {
      kind: 'table',
      prompt: [
        say('Find the smallest positive whole number $N$ with'),
        show(systemTex([m, n], [r, s])),
        say(`The numbers that leave ${r} on dividing by ${m} are listed. Fill in the remainder each leaves on dividing by ${n}, then $N$.`),
      ],
      columns: ['\\text{number}', `\\text{remainder on} \\div ${n}`],
      rows: [...listed.map((v): (string | null)[] => [`${v}`, null]), ['\\text{smallest } N', null]],
      bank: numberBank(answer, [N + m * n, N + m, N - n], 3, 1, 0),
      answer: answer.map(num),
    };
  },
  solution(p) {
    const { m, r, n, s } = p;
    const N = crtTableN(p);
    const listed = steps(r, m, N);
    return [
      { text: `Divide each listed number by ${n}:` },
      ...listed.map((v): SolutionStep => ({ tex: divisionTex(v, n) })),
      { text: `${N} is the first to leave ${s}. Any other answer differs from it by a multiple of ${m * n}, so $N = ${N}$.` },
    ];
  },
};

/* ---------- every remainder the same distance short ---------- */

interface GapParams {
  mods: number[];
  /** `short`: each remainder is `gap` less than its divisor. `same`: each remainder is `gap`. */
  kind: 'short' | 'same';
  gap: number;
  /** Difficulty 2 counts the numbers from 1 to `bound`; 0 asks for the smallest. */
  bound: number;
}

const gapLcm = (mods: number[]) => mods.reduce((t, m) => lcm(t, m), 1);
const gapRems = ({ mods, kind, gap }: GapParams) => mods.map((m) => (kind === 'short' ? m - gap : gap));

function gapCount({ mods, kind, gap, bound }: GapParams, step = gapLcm(mods)): number {
  return kind === 'short' ? Math.floor((bound + gap) / step) : Math.floor((bound - gap) / step) + 1;
}

const gapAnswer = (p: GapParams) => (p.bound === 0 ? gapLcm(p.mods) - p.gap : gapCount(p));

const lcmTex = (mods: number[]) => {
  const L = gapLcm(mods);
  const factored = factorTex(L);
  return factored === `${L}` ? `\\text{LCM}(${mods.join(', ')}) = ${L}` : `\\text{LCM}(${mods.join(', ')}) = ${factored} = ${L}`;
};

const cmMdSameGap: Generator<GapParams> = {
  id: 'cm-md-same-gap',
  sample(rng, difficulty) {
    for (;;) {
      const mods = rng.sample([2, 3, 4, 5, 6, 8, 9, 10, 12], 3).sort((a, b) => a - b);
      const L = gapLcm(mods);
      const product = mods[0] * mods[1] * mods[2];
      if (product === L || mods.some((m) => L === m)) continue;
      if (difficulty >= 2) {
        const kind = rng.pick(['short', 'same'] as const);
        const gap = rng.int(1, Math.min(3, mods[0] - 1));
        if (kind === 'short' && mods[0] - gap < 1) continue;
        const p: GapParams = { mods, kind, gap, bound: rng.pick([100, 200, 300, 500, 1000]) };
        if (L > 150 || gapCount(p) < 3 || gapCount(p) > 30) continue;
        return p;
      }
      if (L > 180 || mods[0] < 3) continue;
      return { mods, kind: 'short', gap: rng.int(1, Math.min(3, mods[0] - 1)), bound: 0 };
    }
  },
  render(p) {
    const system = show(systemTex(p.mods, gapRems(p)));
    if (p.bound === 0) return typed([say('What is the smallest positive whole number $N$ with'), system], gapAnswer(p), 'N =');
    return typed([say(`How many whole numbers $N$ from 1 to ${p.bound} have`), system], gapAnswer(p), '\\text{count} =');
  },
  choices(p) {
    const L = gapLcm(p.mods);
    const product = p.mods.reduce((t, m) => t * m, 1);
    if (p.bound === 0) return numberOptions(L - p.gap, [product - p.gap, L + p.gap, 2 * L - p.gap, L], 1, 1);
    const count = gapCount(p);
    return numberOptions(count, [gapCount(p, product), count + (p.kind === 'same' ? -1 : 1), Math.floor(p.bound / L), count - 1], 1, 0);
  },
  solution(p) {
    const L = gapLcm(p.mods);
    const product = p.mods.reduce((t, m) => t * m, 1);
    const out: SolutionStep[] = [];
    if (p.kind === 'short') {
      out.push({ text: `Each remainder is ${p.gap} short of its divisor, so $N + ${p.gap}$ divides exactly by ${listText(p.mods)}: it is a common multiple of them.` });
    } else {
      out.push({ text: `Each remainder is ${p.gap}, so $N - ${p.gap}$ divides exactly by ${listText(p.mods)}: it is a common multiple of them (0 included).` });
    }
    out.push({ tex: lcmTex(p.mods) });
    if (p.bound === 0) {
      out.push(
        { tex: `N = ${L} - ${p.gap} = ${L - p.gap}` },
        { text: `Multiplying the divisors gives ${product}, a common multiple but not the least, so ${product - p.gap} is the trap.` },
      );
      return out;
    }
    const count = gapCount(p);
    if (p.kind === 'short') {
      out.push(
        { text: `So $N$ is one of ${L - p.gap}, ${2 * L - p.gap}, ${3 * L - p.gap}, and so on, each ${L} more than the last:` },
        { tex: `${L} \\times ${count} - ${p.gap} = ${L * count - p.gap} \\le ${p.bound}` },
        { tex: `${L} \\times ${count + 1} - ${p.gap} = ${L * (count + 1) - p.gap} > ${p.bound}` },
        { text: `There are ${count}.` },
      );
    } else {
      out.push(
        { text: `So $N$ is one of ${p.gap}, ${L + p.gap}, ${2 * L + p.gap}, and so on: ${p.gap} itself counts, as 0 lots of ${L} plus ${p.gap}.` },
        { tex: `${L} \\times ${count - 1} + ${p.gap} = ${L * (count - 1) + p.gap} \\le ${p.bound}` },
        { tex: `${L} \\times ${count} + ${p.gap} = ${L * count + p.gap} > ${p.bound}` },
        { text: `The lots of ${L} run from 0 to ${count - 1}, so there are ${count}.` },
      );
    }
    return out;
  },
};

/* ================================================================
 * Lesson 2: Fractions
 * ================================================================ */

/* ---------- one over a, modulo a prime ---------- */

interface InverseParams {
  a: number;
  p: number;
}

function sampleInverse(rng: Rng, difficulty: number, minK: number, maxK: number): InverseParams {
  for (;;) {
    const p = difficulty >= 2 ? rng.pick([19, 23, 29, 31, 37, 41, 43]) : rng.pick([7, 11, 13, 17]);
    const a = rng.int(2, p - 2);
    const { k } = inverseOf(a, p);
    if (k < minK || k > maxK) continue;
    return { a, p };
  }
}

function inverseSteps(start: number, a: number, p: number): SolutionStep[] {
  const target = steps(start, p, start + p * a).find((v) => v % a === 0)!;
  const list = steps(start, p, target);
  return [
    { text: `Add ${p}s to ${start} until the total divides exactly by ${a}:` },
    { tex: list.join(', ') },
    { tex: `${target} \\div ${a} = ${target / a}` },
  ];
}

const cmMdInverse: Generator<InverseParams> = {
  id: 'cm-md-inverse',
  sample: (rng, difficulty) => sampleInverse(rng, difficulty, 1, difficulty >= 2 ? 6 : 4),
  render({ a, p }) {
    return typed(
      [say(`Which whole number $x$ from 1 to ${p - 1} has`), show(`${a}x \\equiv 1 ${pmod(p)}`)],
      inverseOf(a, p).x,
      'x =',
    );
  },
  choices({ a, p }) {
    const { x } = inverseOf(a, p);
    return numberOptions(x, [p - x, a, p - a, x + 1], 1, 1);
  },
  solution({ a, p }) {
    const { x, k } = inverseOf(a, p);
    return [
      { text: `$${a}x$ must be 1 more than a multiple of ${p}. Those numbers are 1 plus some ${p}s.` },
      ...inverseSteps(1, a, p),
      { text: 'Check:' },
      { tex: `${a} \\times ${x} = ${a * x} = ${p} \\times ${k} + 1` },
      { text: `So $x = ${x}$, which plays the part of $\\frac{1}{${a}}$ when dividing by ${p}.` },
    ];
  },
};

/* ---------- the same search as a table ---------- */

const cmMdInverseTable: Generator<InverseParams> = {
  id: 'cm-md-inverse-table',
  sample(rng, difficulty) {
    for (;;) {
      const p = difficulty >= 2 ? rng.pick([29, 31, 37, 41, 43, 47]) : rng.pick([7, 11, 13, 17, 19, 23, 29]);
      const a = rng.int(2, p - 2);
      const { k } = inverseOf(a, p);
      if (k < (difficulty >= 2 ? 3 : 2) || k > 5) continue;
      return { a, p };
    }
  },
  render({ a, p }) {
    const { x, k } = inverseOf(a, p);
    const totals = Array.from({ length: k + 1 }, (_, i) => 1 + p * i);
    const answer = [...totals, x];
    return {
      kind: 'table',
      prompt: [
        say(`Find $x$ from 1 to ${p - 1} with`),
        show(`${a}x \\equiv 1 ${pmod(p)}`),
        say(`Add ${p}s to 1 until the total divides exactly by ${a}. Fill in each total, then $x$.`),
      ],
      columns: ['k', `1 + ${p}k`],
      rows: [...totals.map((_, i): (string | null)[] => [`${i}`, null]), ['x', null]],
      bank: numberBank(answer, [1 + p * (k + 1), p - x, x + 1], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution({ a, p }) {
    const { x, k } = inverseOf(a, p);
    return [
      ...inverseSteps(1, a, p),
      { tex: `${a} \\times ${x} = ${a * x} = ${p} \\times ${k} + 1` },
      { text: `So $x = ${x}$.` },
    ];
  },
};

/* ---------- a x ≡ b ---------- */

interface LinearParams {
  a: number;
  b: number;
  n: number;
  /** The factor a, b and n share; 1 at difficulty 1. */
  d: number;
}

/** The solution of the divided congruence, the modulus it lives in, and every solution below n. */
function linearWork({ a, b, n, d }: LinearParams) {
  const m = n / d;
  const a1 = a / d;
  const b1 = b / d;
  let x0 = 0;
  for (let x = 0; x < m; x += 1) if ((a1 * x) % m === b1 % m) x0 = x;
  const all = steps(x0, m, n - 1);
  return { m, a1, b1, x0, all, sum: all.reduce((t, v) => t + v, 0) };
}

const cmMdLinear: Generator<LinearParams> = {
  id: 'cm-md-linear',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const d = rng.pick([2, 3]);
        const m = rng.pick([5, 7, 11]);
        const a1 = rng.int(2, m - 1);
        const b1 = rng.int(1, m - 1);
        const p: LinearParams = { a: a1 * d, b: b1 * d, n: m * d, d };
        if (b1 % a1 === 0 || gcd(p.a, p.n) !== d) continue;
        const w = linearWork(p);
        const k = (a1 * w.x0 - b1) / m;
        if (w.x0 === 0 || k < 1 || k > 4) continue;
        return p;
      }
      const n = rng.pick([7, 11, 13]);
      const a = rng.int(2, n - 2);
      const b = rng.int(2, n - 1);
      if (b % a === 0 || b === a) continue;
      const p: LinearParams = { a, b, n, d: 1 };
      const k = (a * linearWork(p).x0 - b) / n;
      if (k < 1 || k > 4) continue;
      return p;
    }
  },
  render(p) {
    const w = linearWork(p);
    const system = show(`${p.a}x \\equiv ${p.b} ${pmod(p.n)}`);
    if (p.d === 1) return typed([say('What is the smallest positive whole number $x$ with'), system], w.x0, 'x =');
    return typed([say(`Find every whole number $x$ from 0 to ${p.n - 1} with`), system, say('What do they add up to?')], w.sum, '\\text{sum} =');
  },
  choices(p) {
    const w = linearWork(p);
    if (p.d === 1) {
      const n = p.n;
      return numberOptions(w.x0, [n - w.x0, mod(p.a * p.b, n), mod(p.b - p.a, n), inverseOf(p.a, n).x], 1, 1);
    }
    return numberOptions(w.sum, [w.x0, w.x0 * p.d, w.sum + w.m, w.sum - w.m], 1, 1);
  },
  solution(p) {
    const w = linearWork(p);
    const out: SolutionStep[] = [];
    if (p.d > 1) {
      out.push(
        { text: `${p.a}, ${p.b} and ${p.n} share the factor ${p.d}, so ${p.a} has no partner that makes 1. Divide all three by ${p.d}, the modulus too:` },
        { tex: `${w.a1}x \\equiv ${w.b1} ${pmod(w.m)}` },
      );
    }
    out.push({ text: `$${w.a1}x$ is ${w.b1} plus a multiple of ${w.m}.` }, ...inverseSteps(w.b1, w.a1, w.m));
    if (p.d === 1) {
      out.push({ text: `So $x = ${w.x0}$.` });
      return out;
    }
    out.push(
      { text: `So $x$ leaves ${w.x0} on dividing by ${w.m}. From 0 to ${p.n - 1} that gives ${p.d} answers, not one:` },
      { tex: `${w.all.join(' + ')} = ${w.sum}` },
    );
    return out;
  },
};

/* ---------- a far digit of a repeating decimal ---------- */

interface DecimalParams {
  a: number;
  q: number;
  pos: number;
}

/** The digits of a/q before the repeating block, and the block. */
function expansion(a: number, q: number): { pre: number[]; block: number[] } {
  const seen = new Map<number, number>();
  const digits: number[] = [];
  let rem = a % q;
  while (!seen.has(rem)) {
    seen.set(rem, digits.length);
    rem *= 10;
    digits.push(Math.floor(rem / q));
    rem %= q;
  }
  const start = seen.get(rem)!;
  return { pre: digits.slice(0, start), block: digits.slice(start) };
}

function digitAt(a: number, q: number, pos: number): number {
  const { pre, block } = expansion(a, q);
  if (pos <= pre.length) return pre[pos - 1];
  return block[(pos - pre.length - 1) % block.length];
}

function decimalTex(a: number, q: number): string {
  const { pre, block } = expansion(a, q);
  const repeats = Math.ceil(12 / block.length);
  return `\\frac{${a}}{${q}} = 0.${pre.join('')}${Array.from({ length: repeats }, () => block.join('')).join('')}\\ldots`;
}

const cmMdDecimalDigit: Generator<DecimalParams> = {
  id: 'cm-md-decimal-digit',
  sample(rng, difficulty) {
    for (;;) {
      const q = difficulty >= 2 ? rng.pick([14, 26, 28, 35, 65, 74]) : rng.pick([7, 13, 27, 37, 41]);
      const a = rng.int(1, q - 1);
      if (gcd(a, q) !== 1) continue;
      const { pre, block } = expansion(a, q);
      if (new Set(block).size < 2 || (difficulty >= 2) !== pre.length > 0) continue;
      const pos = rng.int(25, 250);
      // At difficulty 2 the shift must matter: ignoring the lead-in digits has to land on another digit.
      if (difficulty >= 2 && block[(pos - 1) % block.length] === digitAt(a, q, pos)) continue;
      return { a, q, pos };
    }
  },
  render({ a, q, pos }) {
    return typed(
      [show(decimalTex(a, q)), say(`What is the ${ordinal(pos)} digit after the decimal point?`)],
      digitAt(a, q, pos),
      '\\text{digit} =',
    );
  },
  choices({ a, q, pos }) {
    const { block } = expansion(a, q);
    return digitOptions(digitAt(a, q, pos), [
      block[(pos - 1) % block.length],
      digitAt(a, q, pos + 1),
      digitAt(a, q, pos - 1),
      block[block.length - 1],
    ]);
  },
  solution({ a, q, pos }) {
    const { pre, block } = expansion(a, q);
    const L = block.length;
    const answer = digitAt(a, q, pos);
    const out: SolutionStep[] = [];
    let place = pos;
    if (pre.length > 0) {
      const lead = pre.length === 1 ? `The first digit, ${pre[0]}, comes` : `The first ${pre.length} digits, ${pre.join('')}, come`;
      out.push(
        { text: `${lead} before the repeating starts. After that the block ${block.join('')} repeats every ${L} digits, so count places in the repeating part:` },
        { tex: `${pos} - ${pre.length} = ${pos - pre.length}` },
      );
      place = pos - pre.length;
    } else {
      out.push({ text: `The block ${block.join('')} repeats every ${L} digits. Divide the place by ${L}:` });
    }
    out.push({ tex: divisionTex(place, L) });
    const r = place % L;
    out.push({
      text:
        r === 0
          ? `A remainder of 0 means that digit ends a block, so it is the last digit of the block: ${answer}.`
          : `So it is place ${r} in the block: ${answer}.`,
    });
    return out;
  },
};

/* ================================================================
 * Lesson 3: Units Digit
 * ================================================================ */

/* ---------- the last digit of a tower ---------- */

interface TowerParams {
  a: number;
  b: number;
  c: number;
}

/** Last digits of u^1 to u^4, for u ending in 2, 3, 7 or 8. */
const cycle4 = (a: number) => [1, 2, 3, 4].map((e) => powMod(a, e, 10));
const towerRem = ({ b, c }: TowerParams) => powMod(b, c, 4);
const towerAnswer = (p: TowerParams) => cycle4(p.a)[(towerRem(p) + 3) % 4];
const towerTex = ({ a, b, c }: TowerParams) => `${a}^{${b}^{${c}}}`;

function sampleTower(rng: Rng, difficulty: number): TowerParams {
  if (difficulty >= 2) {
    return { a: rng.pick([2, 3, 7, 8, 12, 13, 17, 18, 22, 23, 27, 28]), b: rng.pick([3, 7, 11]), c: rng.int(2, 12) };
  }
  return { a: rng.pick([2, 3, 7, 8]), b: rng.pick([2, 4, 5, 6, 9]), c: rng.int(2, 9) };
}

function towerSolution(p: TowerParams): SolutionStep[] {
  const { a, b, c } = p;
  const u = a % 10;
  const cycle = cycle4(a);
  const r = towerRem(p);
  const out: SolutionStep[] = [
    { text: a >= 10 ? `Only the last digit of ${a} matters. Powers of ${u} end in` : `Powers of ${a} end in` },
    { tex: `${cycle.join(', ')}, \\ldots` },
    { text: `That repeats every 4, so what counts is the remainder when the power $${b}^{${c}}$ is divided by 4.` },
  ];
  if (b % 2 === 0) {
    out.push(
      { text: `$${b}^{2} = ${b * b}$ divides exactly by 4, so every higher power of ${b} does too:` },
      { tex: `${b}^{${c}} \\equiv 0 ${pmod(4)}` },
    );
  } else if (b % 4 === 1) {
    out.push({ text: `${b} leaves 1 on dividing by 4, so every power of ${b} does too:` }, { tex: `${b}^{${c}} \\equiv 1^{${c}} = 1 ${pmod(4)}` });
  } else {
    out.push(
      { text: `${b} leaves 3 on dividing by 4, which is 1 short, so treat it as $-1$:` },
      { tex: `${b}^{${c}} \\equiv (-1)^{${c}} = ${c % 2 === 0 ? '1' : '-1'} ${pmod(4)}` },
    );
    if (c % 2 === 1) out.push({ text: '$-1$ is 1 short of 4, a remainder of 3.' });
  }
  out.push({
    text:
      r === 0
        ? `A remainder of 0 lands on the 4th place in the cycle: the last digit is ${towerAnswer(p)}.`
        : `Remainder ${r} is place ${r} in the cycle: the last digit is ${towerAnswer(p)}.`,
  });
  return out;
}

const cmMdTower: Generator<TowerParams> = {
  id: 'cm-md-tower',
  sample: sampleTower,
  render(p) {
    return typed([say('What is the last digit of this number?'), show(towerTex(p))], towerAnswer(p), '\\text{last digit} =');
  },
  choices(p) {
    const { a, b, c } = p;
    const at = (e: number) => powMod(a, e === 0 ? 4 : e, 10);
    return digitOptions(towerAnswer(p), [at((b * c) % 4), at(b % 4), 1, at(c % 4), a % 10]);
  },
  solution: towerSolution,
};

const cmMdTowerTable: Generator<TowerParams> = {
  id: 'cm-md-tower-table',
  sample: sampleTower,
  render(p) {
    const cycle = cycle4(p.a);
    const answer = [...cycle, towerAnswer(p)];
    return {
      kind: 'table',
      prompt: [say(`Fill in the last digit of each power of ${p.a}, then the last digit of $${towerTex(p)}$.`)],
      columns: ['\\text{power}', '\\text{last digit}'],
      rows: [...[1, 2, 3, 4].map((e): (string | null)[] => [powTex(p.a, e), null]), [towerTex(p), null]],
      bank: numberBank(answer, [0, 1, 5, 9, 3, 7], 3, 1, 0),
      answer: answer.map(num),
    };
  },
  solution: towerSolution,
};

/* ---------- the last digit of a long sum of powers ---------- */

interface PowerSumParams {
  /** Full blocks of ten. */
  m: number;
  /** Numbers past the last full block; 0 at difficulty 1. */
  r: number;
  k: number;
}

/** The last digits of 1^k, 2^k, … , 10^k. */
const blockDigits = (k: number) => Array.from({ length: 10 }, (_, i) => powMod(i + 1, k, 10));
const blockSum = (k: number) => blockDigits(k).reduce((t, v) => t + v, 0);
const partialSum = ({ r, k }: PowerSumParams) => blockDigits(k).slice(0, r).reduce((t, v) => t + v, 0);
const powerSumAnswer = (p: PowerSumParams) => (p.m * blockSum(p.k) + partialSum(p)) % 10;

const cmMdPowerSum: Generator<PowerSumParams> = {
  id: 'cm-md-power-sum',
  sample(rng, difficulty) {
    const k = rng.int(12, 99);
    if (difficulty >= 2) return { m: rng.int(1, 9), r: rng.int(1, 9), k };
    return { m: rng.int(2, 9), r: 0, k };
  },
  render(p) {
    const n = 10 * p.m + p.r;
    return typed(
      [say('What is the last digit of this sum?'), show(`1^{${p.k}} + 2^{${p.k}} + 3^{${p.k}} + \\cdots + ${n}^{${p.k}}`)],
      powerSumAnswer(p),
      '\\text{last digit} =',
    );
  },
  choices(p) {
    const n = 10 * p.m + p.r;
    const S = blockSum(p.k);
    return digitOptions(powerSumAnswer(p), [p.m * 45 + partialSum(p), p.r > 0 ? p.m * S : S, powMod(n, p.k, 10), S + partialSum(p)]);
  },
  solution(p) {
    const { m, r, k } = p;
    const e = k % 4 === 0 ? 4 : k % 4;
    const digits = blockDigits(k);
    const S = blockSum(k);
    const P = partialSum(p);
    const out: SolutionStep[] = [
      { text: `The last digit of a power depends only on the last digit of the base, so 1 to 10, 11 to 20, and so on each give the same last digits.` },
      {
        text: `Last digits of powers repeat every 4 (or every 2, or never change), and ${k} leaves ${k % 4} on dividing by 4, so each ends like the same number to the power ${e}. One block of ten gives`,
      },
      { tex: `${digits.join(' + ')} = ${S}` },
    ];
    if (r === 0) {
      out.push({ text: `There are ${m} blocks:` }, { tex: `${m} \\times ${S} = ${m * S}` }, { text: `The last digit is ${powerSumAnswer(p)}.` });
      return out;
    }
    out.push({ text: `There ${m === 1 ? 'is 1 full block' : `are ${m} full blocks`} up to ${10 * m}, then 1 to ${r} again from ${10 * m + 1} to ${10 * m + r}:` });
    if (r >= 2) out.push({ tex: `${digits.slice(0, r).join(' + ')} = ${P}` });
    out.push({ tex: `${m} \\times ${S} + ${P} = ${m * S + P}` }, { text: `The last digit is ${powerSumAnswer(p)}.` });
    return out;
  },
};

/* ---------- the last two digits of a power ---------- */

interface LastTwoParams {
  base: number;
  n: number;
}

/** Last two digits of base^1, base^2, … up to the first that is 01. */
function lastTwoCycle(base: number): number[] {
  const out = [base % 100];
  while (out[out.length - 1] !== 1) out.push((out[out.length - 1] * base) % 100);
  return out;
}

const cmMdLastTwo: Generator<LastTwoParams> = {
  id: 'cm-md-last-two',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { base: rng.pick([7, 43, 57, 93, 49, 99]), n: rng.int(20, 999) };
    return { base: 10 * rng.int(1, 9) + 1, n: rng.int(12, 99) };
  },
  render({ base, n }) {
    return typed([say(`What are the last two digits of $${base}^{${n}}$?`)], powMod(base, n, 100), '\\text{last two digits} =');
  },
  choices({ base, n }) {
    const answer = powMod(base, n, 100);
    if (base % 10 === 1 && base < 100) {
      const t = (base - 1) / 10;
      return lastTwoOptions(answer, [base, 10 * mod(t + n, 10) + 1, 10 * (n % 10) + 1, 10 * mod(t * n + 1, 10) + 1]);
    }
    const cycle = lastTwoCycle(base);
    return lastTwoOptions(answer, [...cycle, powMod(base, n % 10, 100)]);
  },
  solution({ base, n }) {
    const answer = powMod(base, n, 100);
    if (base % 10 === 1 && base <= 91) {
      const tens = base - 1;
      return [
        { text: `Write ${base} as ${tens} + 1 and multiply out $(${tens} + 1)^{${n}}$. Every term but the last two holds $${tens}^{2}$ or a higher power, a multiple of 100, so` },
        { tex: `(${tens} + 1)^{${n}} \\equiv 1 + ${n} \\times ${tens} ${pmod(100)}` },
        { tex: `1 + ${n} \\times ${tens} = ${1 + n * tens}` },
        { text: `The last two digits are ${pad2(answer)}.` },
      ];
    }
    const cycle = lastTwoCycle(base);
    const L = cycle.length;
    const out: SolutionStep[] = [{ text: 'Find the last two digits of the first few powers, keeping only the last two digits each time:' }];
    for (let i = 1; i < L; i += 1) {
      const product = cycle[i - 1] * base;
      const lhs = i === 1 ? `${base}^{2}` : `${pad2(cycle[i - 1])} \\times ${base}`;
      out.push({ tex: product < 100 ? `${lhs} = ${product}` : `${lhs} = ${product} \\to ${pad2(product % 100)}` });
    }
    const r = n % L;
    out.push(
      { text: `$${base}^{${L}}$ ends in 01, so the last two digits repeat every ${L} powers. Divide the power by ${L}:` },
      { tex: divisionTex(n, L) },
      {
        text:
          r === 0
            ? `So $${base}^{${n}}$ ends like $${base}^{${L}}$, in 01.`
            : r === 1
              ? `So $${base}^{${n}}$ ends like ${base} itself, in ${pad2(answer)}.`
              : `So $${base}^{${n}}$ ends like $${base}^{${r}}$, in ${pad2(answer)}.`,
      },
    );
    return out;
  },
};

/* ================================================================
 * Lesson 4: Euler's Theorem
 * ================================================================ */

/* ---------- Euler's phi ---------- */

interface PhiParams {
  n: number;
}

const phiOf = (n: number) => factorise(n).reduce((t, [p]) => (t / p) * (p - 1), n);

const cmMdPhi: Generator<PhiParams> = {
  id: 'cm-md-phi',
  sample(rng, difficulty) {
    for (;;) {
      const count = difficulty >= 2 ? 3 : 2;
      const primes = rng.sample(difficulty >= 2 ? [2, 3, 5, 7, 11] : [2, 3, 5, 7, 11, 13], count).sort((a, b) => a - b);
      const n = primes.reduce((t, p) => t * p ** rng.int(1, p <= 3 ? 4 : 2), 1);
      if (n < (difficulty >= 2 ? 60 : 20) || n > (difficulty >= 2 ? 2000 : 300)) continue;
      return { n };
    }
  },
  render({ n }) {
    return typed([say(`How many of the whole numbers from 1 to ${n} share no factor greater than 1 with ${n}?`)], phiOf(n), '\\text{count} =');
  },
  choices({ n }) {
    const primes = factorise(n).map(([p]) => p);
    const takeEach = n - primes.reduce((t, p) => t + n / p, 0);
    const firstOnly = (n / primes[0]) * (primes[0] - 1);
    return numberOptions(phiOf(n), [takeEach, n - 1, firstOnly, phiOf(n) * 2], 1, 1);
  },
  solution({ n }) {
    const primes = factorise(n).map(([p]) => p);
    const fractions = primes.map((p) => `\\frac{${p - 1}}{${p}}`).join(' \\times ');
    return [
      { tex: `${n} = ${factorTex(n)}` },
      { text: `A number shares a factor with ${n} exactly when it is a multiple of ${listText(primes).replace(/ and (\d+)$/, ' or $1')}. Of the numbers 1 to ${n}, the non-multiples of ${primes[0]} are $\\frac{${primes[0] - 1}}{${primes[0]}}$ of them, and each further prime keeps the same share of what is left:` },
      { tex: `\\varphi(${n}) = ${n} \\times ${fractions}` },
      { tex: `\\varphi(${n}) = ${phiOf(n)}` },
      { text: 'Taking away the multiples of each prime separately takes away the numbers divisible by two of them twice; the fractions count each number once.' },
    ];
  },
};

/* ---------- powers of a round a cycle, as a table ---------- */

interface CycleParams {
  a: number;
  p: number;
  N: number;
}

function orderOf(a: number, p: number): number {
  let v = a % p;
  let d = 1;
  while (v !== 1) {
    v = (v * a) % p;
    d += 1;
  }
  return d;
}

const cmMdCycleTable: Generator<CycleParams> = {
  id: 'cm-md-cycle-table',
  sample(rng, difficulty) {
    for (;;) {
      const p = difficulty >= 2 ? rng.pick([13, 19, 31, 37, 43, 61, 73]) : rng.pick([7, 11, 13]);
      const a = rng.int(2, Math.min(p - 2, 10));
      const d = orderOf(a, p);
      if (d < 3 || d > 6) continue;
      const N = difficulty >= 2 ? rng.int(100, 999) : rng.int(30, 200);
      return { a, p, N };
    }
  },
  render({ a, p, N }) {
    const d = orderOf(a, p);
    const rems = Array.from({ length: d }, (_, i) => powMod(a, i + 1, p));
    const answer = [...rems, powMod(a, N, p)];
    return {
      kind: 'table',
      prompt: [say(`Fill in the remainder when each power of ${a} is divided by ${p}, until it comes back to 1. Then the remainder of $${a}^{${N}}$.`)],
      columns: ['\\text{power}', `\\text{remainder on} \\div ${p}`],
      rows: [...rems.map((_, i): (string | null)[] => [powTex(a, i + 1), null]), [`${a}^{${N}}`, null]],
      bank: numberBank(answer, [p - 1, powMod(a, N % p, p), a * a], 3, 1, 0),
      answer: answer.map(num),
    };
  },
  solution({ a, p, N }) {
    const d = orderOf(a, p);
    const out: SolutionStep[] = [{ text: `Multiply each remainder by ${a} and divide by ${p} again:` }];
    let v = a % p;
    for (let i = 2; i <= d; i += 1) {
      const product = v * a;
      out.push({
        tex: product < p ? `${v} \\times ${a} = ${product}` : `${v} \\times ${a} = ${product} = ${p} \\times ${Math.floor(product / p)} + ${product % p}`,
      });
      v = product % p;
    }
    const r = N % d;
    out.push(
      { text: `$${a}^{${d}}$ leaves 1, so the remainders repeat every ${d} powers (and ${d} divides ${p - 1}, as Fermat's little theorem says it must). Divide the power by ${d}:` },
      { tex: divisionTex(N, d) },
      {
        text:
          r === 0
            ? `A remainder of 0 ends a cycle, so $${a}^{${N}}$ leaves 1.`
            : `So $${a}^{${N}}$ leaves the same as $${powTex(a, r)}$: ${powMod(a, N, p)}.`,
      },
    );
    return out;
  },
};

/* ---------- a huge power, by Fermat or Euler ---------- */

interface FermatParams {
  a: number;
  N: number;
  n: number;
}

const COMPOSITE_MODULI = [9, 10, 14, 15, 16, 18, 20, 21, 22, 25, 26, 28];

const cmMdFermat: Generator<FermatParams> = {
  id: 'cm-md-fermat',
  sample(rng, difficulty) {
    for (;;) {
      const n = difficulty >= 2 ? rng.pick(COMPOSITE_MODULI) : rng.pick([7, 11, 13]);
      const a = rng.int(2, 40);
      const a1 = a % n;
      if (gcd(a, n) !== 1 || a1 === 1 || a1 === n - 1) continue;
      const N = rng.int(100, 999);
      const r = N % phiOf(n);
      if (a1 ** r > 5000) continue;
      return { a, N, n };
    }
  },
  render({ a, N, n }) {
    return typed([say(`What is the remainder when $${a}^{${N}}$ is divided by ${n}?`)], powMod(a, N, n), '\\text{remainder} =');
  },
  choices({ a, N, n }) {
    const prime = phiOf(n) === n - 1;
    const slips = prime ? [powMod(a, N % n, n), mod(a * N, n), 1] : [powMod(a, N % (n - 1), n), powMod(a, N % n, n), 1];
    return numberOptions(powMod(a, N, n), slips, 1, 0);
  },
  solution({ a, N, n }) {
    const phi = phiOf(n);
    const a1 = a % n;
    const r = N % phi;
    const value = a1 ** r;
    const answer = powMod(a, N, n);
    const out: SolutionStep[] = [];
    if (a >= n) out.push({ text: `${a} leaves ${a1} on dividing by ${n}, so work with ${a1}:` }, { tex: `${a} \\equiv ${a1} ${pmod(n)}` });
    if (phi === n - 1) {
      out.push({ text: `${n} is prime and does not divide ${a1}, so by Fermat's little theorem` });
    } else {
      out.push(
        { text: `${a1} shares no factor with ${n}. Of the numbers 1 to ${n}, ${phi} share no factor with ${n}:` },
        { tex: `\\varphi(${n}) = ${phi}` },
        { text: "So by Euler's theorem" },
      );
    }
    out.push(
      { tex: `${a1}^{${phi}} \\equiv 1 ${pmod(n)}` },
      { text: `Take as many ${phi}s out of the power as possible:` },
      { tex: divisionTex(N, phi) },
      { tex: r === 0 ? `${a}^{${N}} \\equiv 1^{${Math.floor(N / phi)}} = 1 ${pmod(n)}` : `${a}^{${N}} \\equiv 1^{${Math.floor(N / phi)}} \\times ${powTex(a1, r)} ${pmod(n)}` },
    );
    if (value >= n) out.push({ tex: `${powTex(a1, r)} = ${value} = ${n} \\times ${Math.floor(value / n)} + ${answer}` });
    out.push({ text: `The remainder is ${answer}.` });
    return out;
  },
};

/* ---------- a tower, remainder on dividing by a prime ---------- */

interface EulerTowerParams {
  a: number;
  b: number;
  c: number;
  p: number;
}

const eulerTowerExp = ({ b, c, p }: EulerTowerParams) => powMod(b, c, p - 1);
const eulerTowerAnswer = (t: EulerTowerParams) => powMod(t.a, eulerTowerExp(t), t.p);

const cmMdEulerTower: Generator<EulerTowerParams> = {
  id: 'cm-md-euler-tower',
  sample(rng, difficulty) {
    for (;;) {
      const p = difficulty >= 2 ? rng.pick([11, 13]) : rng.pick([5, 7]);
      const t: EulerTowerParams = { a: rng.int(2, p - 2), b: rng.int(2, 9), c: rng.int(2, 9), p };
      if (t.a ** eulerTowerExp(t) > 5000) continue;
      // The trap of reducing the exponent by p rather than p - 1 must land somewhere else.
      if (powMod(t.a, powMod(t.b, t.c, p), p) === eulerTowerAnswer(t)) continue;
      return t;
    }
  },
  render(t) {
    return typed(
      [say(`What is the remainder when this number is divided by ${t.p}?`), show(`${t.a}^{${t.b}^{${t.c}}}`)],
      eulerTowerAnswer(t),
      '\\text{remainder} =',
    );
  },
  choices(t) {
    const { a, b, c, p } = t;
    return numberOptions(eulerTowerAnswer(t), [powMod(a, powMod(b, c, p), p), powMod(a, b * c, p), 1, powMod(a, powMod(c, b, p - 1), p)], 1, 0);
  },
  solution(t) {
    const { a, b, c, p } = t;
    const m = p - 1;
    const e = eulerTowerExp(t);
    const answer = eulerTowerAnswer(t);
    const rems = Array.from({ length: c }, (_, i) => powMod(b, i + 1, m));
    const out: SolutionStep[] = [
      { text: `${p} is prime and does not divide ${a}, so by Fermat's little theorem` },
      { tex: `${a}^{${m}} \\equiv 1 ${pmod(p)}` },
      { text: `The remainders of powers of ${a} repeat every ${m}, so find what $${b}^{${c}}$ leaves on dividing by ${m}. The powers of ${b}, from the first to the ${ordinal(c)}, leave` },
      { tex: rems.join(', ') },
    ];
    if (e === 0) {
      out.push({ text: `$${b}^{${c}}$ is a whole number of ${m}s, so the power ends a full cycle: the remainder is 1.` });
      return out;
    }
    out.push({ tex: `${a}^{${b}^{${c}}} \\equiv ${powTex(a, e)} ${pmod(p)}` });
    const value = a ** e;
    if (value >= p) out.push({ tex: `${powTex(a, e)} = ${value} = ${p} \\times ${Math.floor(value / p)} + ${answer}` });
    out.push({ text: `The remainder is ${answer}.` });
    return out;
  },
};

export const contestModularGenerators = [
  cmMdRemainderShift,
  cmMdCrtSieve,
  cmMdCrtTable,
  cmMdSameGap,
  cmMdInverse,
  cmMdInverseTable,
  cmMdLinear,
  cmMdDecimalDigit,
  cmMdTower,
  cmMdTowerTable,
  cmMdPowerSum,
  cmMdLastTwo,
  cmMdPhi,
  cmMdCycleTable,
  cmMdFermat,
  cmMdEulerTower,
];
