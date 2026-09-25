/**
 * Contest Math, level 9: Fast Problem-Solving.
 *
 * Mental shortcuts that beat long arithmetic. Each question has a slow way
 * (multiply it all out, add it all up) and a fast way that turns on one
 * observation: 25 and 4 make 100, 97 is 3 short of 100, 2^30 and 3^20 are
 * both tenth powers, a 2 and a 5 make a 10, and a chain of operations run
 * backwards undoes itself.
 *
 * Five lessons: Efficiency, Calculations, Exponents, Roots and What's the
 * Number? Level 1 already has the plain difference of squares, the last digit
 * of one power and the alternating sum; the questions here go past those.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { choiceSlide } from './numberProof';
import { num, numberBank, numberOptions, say, show, typed } from './contestMath';
import { options } from '../choiceVariant';

/* ================================================================
 * Small helpers
 * ================================================================ */

/** A whole number from lo to hi that is not a multiple of 10. */
function notRound(rng: Rng, lo: number, hi: number): number {
  for (;;) {
    const n = rng.int(lo, hi);
    if (n % 10 !== 0) return n;
  }
}

/** n written as c√d with d square-free: [c, d]. */
function rootParts(n: number): [number, number] {
  let c = 1;
  let d = n;
  for (let k = 2; k * k <= d; k += 1) {
    while (d % (k * k) === 0) {
      d /= k * k;
      c *= k;
    }
  }
  return [c, d];
}

/** √n in simplest form: `3`, `\\sqrt{5}`, `2\\sqrt{3}`. */
function rootTex(n: number): string {
  const [c, d] = rootParts(n);
  if (d === 1) return `${c}`;
  return c === 1 ? `\\sqrt{${d}}` : `${c}\\sqrt{${d}}`;
}

/** Last digit of base^power, by repeated multiplication of last digits. */
function lastDigitOf(base: number, power: number): number {
  let d = 1;
  for (let i = 0; i < power; i += 1) d = (d * base) % 10;
  return d;
}

/** The cycle of last digits of base, base², …, starting from base itself. */
function cycleOf(base: number): number[] {
  const out: number[] = [];
  let d = base % 10;
  while (!out.includes(d)) {
    out.push(d);
    d = (d * base) % 10;
  }
  return out;
}

/** Four options for a single digit: the answer, the slips that are digits, topped up. */
function digitOptions(correct: number, slips: number[]): ChoiceOption[] {
  const picked: number[] = [];
  for (const value of [...slips, correct + 5, correct + 1, correct - 1, correct + 2, correct - 2, correct + 3]) {
    if (picked.length === 3) break;
    const d = ((value % 10) + 10) % 10;
    if (d === correct || picked.includes(d)) continue;
    picked.push(d);
  }
  return options(
    { tex: `${correct}`, answer: `${correct}` },
    ...picked.sort((a, b) => a - b).map((d) => ({ tex: `${d}`, answer: `${d}` })),
  );
}

/** A steps bank: the value and its slips, distinct, ordered by hash so the order gives nothing away. */
function stepBank(value: string, ...slips: string[]): string[] {
  const out = [...new Set([value, ...slips])].slice(0, 4);
  return out.sort((a, b) => hashSeed(a) - hashSeed(b));
}

/** `+ 5` or `- 5`, for the tail of a line. */
const signed = (v: number) => (v < 0 ? `- ${-v}` : `+ ${v}`);

/* ================================================================
 * Lesson 1: Efficiency
 * ================================================================ */

/* ---------- friendly pairs in a product ---------- */

const FRIENDS = [
  { a: 25, b: 4, p: 100 },
  { a: 125, b: 8, p: 1000 },
  { a: 50, b: 2, p: 100 },
  { a: 20, b: 5, p: 100 },
  { a: 250, b: 4, p: 1000 },
];

/** Orders the three factors can be shown in; the first two keep the pair apart. */
const ORDERS: [number, number, number][] = [
  [0, 1, 2],
  [2, 1, 0],
  [1, 0, 2],
  [0, 2, 1],
  [1, 2, 0],
  [2, 0, 1],
];

interface FriendlyParams {
  pair: number;
  other: number;
  /** The partner is shown as b × m; m = 1 shows it bare. */
  m: number;
  order: number;
}

const friendlyFactors = (p: FriendlyParams): number[] => {
  const f = FRIENDS[p.pair];
  const factors = [f.a, p.other, f.b * p.m];
  return ORDERS[p.order].map((i) => factors[i]);
};

const friendlyAnswer = (p: FriendlyParams) => FRIENDS[p.pair].p * p.other * p.m;

const cmFriendlyProduct: Generator<FriendlyParams> = {
  id: 'cm-friendly-product',
  sample(rng, difficulty) {
    const pair = rng.int(0, FRIENDS.length - 1);
    if (difficulty >= 2) {
      return { pair, other: notRound(rng, 11, 49), m: rng.int(3, 9), order: rng.int(0, ORDERS.length - 1) };
    }
    return { pair, other: notRound(rng, 11, 99), m: 1, order: rng.int(0, 1) };
  },
  render(p) {
    return typed([say('Work it out without a calculator.')], friendlyAnswer(p), `${friendlyFactors(p).join(' \\times ')} =`);
  },
  choices(p) {
    const ans = friendlyAnswer(p);
    const f = FRIENDS[p.pair];
    const slips = [10 * ans, ans / 10, ans + f.p, ans - f.p];
    if (p.m > 1) slips.unshift(f.p * p.other);
    return numberOptions(ans, slips, f.p, 1);
  },
  solution(p) {
    const f = FRIENDS[p.pair];
    const ans = friendlyAnswer(p);
    const steps: SolutionStep[] = [];
    if (p.m > 1) {
      steps.push(
        { text: `Split ${f.b * p.m} so that ${f.a} has its partner ${f.b}:` },
        { tex: `${f.b * p.m} = ${f.b} \\times ${p.m}` },
      );
    }
    steps.push({ text: 'Multiplying works in any order, so put the friendly pair together first:' }, { tex: `${f.a} \\times ${f.b} = ${f.p}` });
    if (p.m > 1) {
      steps.push({ text: 'What is left is small:' }, { tex: `${p.other} \\times ${p.m} = ${p.other * p.m}` }, { tex: `${f.p} \\times ${p.other * p.m} = ${ans}` });
    } else {
      steps.push({ tex: `${f.p} \\times ${p.other} = ${ans}` });
    }
    return steps;
  },
};

/* ---------- split a factor to find the partner, as tiles ---------- */

interface SplitParams {
  pair: number;
  m: number;
}

const cmFriendlySplitTiles: Generator<SplitParams> = {
  id: 'cm-friendly-split-tiles',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      // The pairs that make 1000, with a bigger cofactor.
      return { pair: rng.pick([1, 4]), m: rng.int(3, 24) };
    }
    return { pair: rng.pick([0, 2, 3]), m: rng.int(3, 19) };
  },
  render({ pair, m }) {
    const f = FRIENDS[pair];
    const n = f.b * m;
    const ans = f.a * n;
    return {
      kind: 'tiles',
      prompt: [say(`Work out $${f.a} \\times ${n}$ by splitting ${n} so that ${f.a} meets ${f.b}.`)],
      template: `${f.a} \\times ${n} = ${f.a} \\times ${f.b} \\times {0} = {1}`,
      bank: numberBank([m, ans], [n - f.b, m + 1, ans / 10, 10 * ans, f.p + m], 3, 1, 1),
      answer: [num(m), num(ans)],
    };
  },
  solution({ pair, m }) {
    const f = FRIENDS[pair];
    const n = f.b * m;
    return [
      { text: `${n} is ${f.b} lots of ${m}:` },
      { tex: `${n} = ${f.b} \\times ${m}` },
      { text: `So ${f.a} meets ${f.b}, which makes ${f.p}:` },
      { tex: `${f.a} \\times ${f.b} \\times ${m} = ${f.p} \\times ${m}` },
      { tex: `${f.p} \\times ${m} = ${f.a * n}` },
    ];
  },
};

/* ---------- regroup a sum ---------- */

interface RegroupParams {
  mode: 'pairs' | 'round';
  /** Pairs mode: x1, x2, z, y1, y2 in that order. Round mode: the terms. */
  terms: number[];
  /** Round mode: the hundred each term sits just under. */
  rounds: number[];
}

const regroupTotal = (p: RegroupParams) => p.terms.reduce((t, v) => t + v, 0);

const cmRegroupSum: Generator<RegroupParams> = {
  id: 'cm-regroup-sum',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const rounds = rng.sample([100, 200, 300, 400, 500, 600, 700, 800, 900], 4);
      return { mode: 'round', rounds, terms: rounds.map((r) => r - rng.int(1, 4)) };
    }
    const half = () => {
      const t = rng.pick([100, 200]);
      const x = notRound(rng, t - 89, t - 11);
      return [x, t - x];
    };
    for (;;) {
      const [x1, y1] = half();
      const [x2, y2] = half();
      const terms = [x1, x2, notRound(rng, 11, 99), y1, y2];
      // Five different numbers, so the pairing is never in doubt.
      if (new Set(terms).size === 5) return { mode: 'pairs', terms, rounds: [] };
    }
  },
  render(p) {
    return typed([say('Add these up in your head.'), show(p.terms.join(' + '))], regroupTotal(p), '\\text{sum} =');
  },
  choices(p) {
    const ans = regroupTotal(p);
    if (p.mode === 'round') {
      const big = p.rounds.reduce((t, v) => t + v, 0);
      return numberOptions(ans, [big, 2 * big - ans, ans + 10, ans - 10], 10, 1);
    }
    return numberOptions(ans, [ans + 10, ans - 10, ans + 100, ans - 100], 10, 1);
  },
  solution(p) {
    const ans = regroupTotal(p);
    if (p.mode === 'round') {
      const big = p.rounds.reduce((t, v) => t + v, 0);
      const short = p.rounds.map((r, i) => r - p.terms[i]);
      return [
        { text: 'Each number is just under a whole hundred. Add the hundreds instead:' },
        { tex: `${p.rounds.join(' + ')} = ${big}` },
        { text: `That overshoots by what each number was short of its hundred:` },
        { tex: `${short.join(' + ')} = ${big - ans}` },
        { tex: `${big} - ${big - ans} = ${ans}` },
      ];
    }
    const [x1, x2, z, y1, y2] = p.terms;
    return [
      { text: 'Addition works in any order, so pair the numbers that make whole hundreds:' },
      { tex: `${x1} + ${y1} = ${x1 + y1}` },
      { tex: `${x2} + ${y2} = ${x2 + y2}` },
      { text: `Then add the one left over, ${z}:` },
      { tex: `${x1 + y1} + ${x2 + y2} + ${z} = ${ans}` },
    ];
  },
};

/* ---------- dividing by 5, 25, 125 ---------- */

/** Divide by `by` as multiply by `times`, divide by `ten`. */
const DIVIDERS: Record<number, { times: number; ten: number }> = {
  5: { times: 2, ten: 10 },
  25: { times: 4, ten: 100 },
  125: { times: 8, ten: 1000 },
  250: { times: 4, ten: 1000 },
};

interface DivideParams {
  by: number;
  q: number;
}

const cmDivideQuick: Generator<DivideParams> = {
  id: 'cm-divide-quick',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { by: rng.pick([125, 250]), q: notRound(rng, 11, 199) };
    const by = rng.pick([5, 25]);
    return { by, q: by === 5 ? notRound(rng, 101, 999) : notRound(rng, 21, 399) };
  },
  render({ by, q }) {
    return typed([say('Work it out without a calculator.')], q, `${by * q} \\div ${by} =`);
  },
  choices({ by, q }) {
    const { times } = DIVIDERS[by];
    return numberOptions(q, [10 * q, q / 10, times * q, q + times], 1, 1);
  },
  solution({ by, q }) {
    const { times, ten } = DIVIDERS[by];
    const n = by * q;
    return [
      { text: `${by} is ${ten} divided by ${times}, so dividing by ${by} is multiplying by ${times} and dividing by ${ten}:` },
      { tex: `${by} = ${ten} \\div ${times}` },
      { tex: `${n} \\times ${times} = ${n * times}` },
      { tex: `${n * times} \\div ${ten} = ${q}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Calculations
 * ================================================================ */

/* ---------- two numbers near 100 or 1000 ---------- */

interface NearParams {
  R: number;
  /** a = R − x, or R + x when `above`. */
  x: number;
  above: boolean;
  /** b = R − y. */
  y: number;
}

const nearA = (p: NearParams) => (p.above ? p.R + p.x : p.R - p.x);
const nearB = (p: NearParams) => p.R - p.y;
const nearAnswer = (p: NearParams) => nearA(p) * nearB(p);

const cmNearHundred: Generator<NearParams> = {
  id: 'cm-near-hundred',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { R: rng.pick([100, 1000]), x: rng.int(1, 12), above: true, y: rng.int(2, 12) };
    for (;;) {
      const x = rng.int(2, 12);
      const y = rng.int(2, 12);
      if (x !== y) return { R: 100, x, above: false, y };
    }
  },
  render(p) {
    return typed([say('Work it out without a calculator.')], nearAnswer(p), `${nearA(p)} \\times ${nearB(p)} =`);
  },
  choices(p) {
    const ans = nearAnswer(p);
    const base = (nearA(p) - p.y) * p.R;
    const xy = p.x * p.y;
    const slips = p.above ? [base + xy, base, ans - p.R] : [base - xy, base, base + p.x + p.y];
    return numberOptions(ans, [...slips, ans + p.R], 1, 1);
  },
  solution(p) {
    const a = nearA(p);
    const b = nearB(p);
    const base = (a - p.y) * p.R;
    const xy = p.x * p.y;
    return [
      {
        text: p.above
          ? `${a} is ${p.x} over ${p.R} and ${b} is ${p.y} under. Take ${b}’s ${p.y} off ${a}:`
          : `${a} is ${p.x} under ${p.R} and ${b} is ${p.y} under. Take ${b}’s ${p.y} off ${a}:`,
      },
      { tex: `${a} - ${p.y} = ${a - p.y}` },
      { tex: `${a - p.y} \\times ${p.R} = ${base}` },
      { text: p.above ? 'One is over and one under, so take off the product of the two gaps:' : 'Both are under, so add on the product of the two gaps:' },
      { tex: `${p.x} \\times ${p.y} = ${xy}` },
      { tex: `${base} ${p.above ? '-' : '+'} ${xy} = ${nearAnswer(p)}` },
    ];
  },
};

/* ---------- squares ending in 5, and their cousins ---------- */

interface FiveParams {
  /** The number of tens. */
  t: number;
  /** Units digits u and 10 − u; u = 5 is a square. */
  u: number;
}

const fiveA = (p: FiveParams) => 10 * p.t + p.u;
const fiveB = (p: FiveParams) => 10 * p.t + 10 - p.u;
const fiveAnswer = (p: FiveParams) => fiveA(p) * fiveB(p);

const cmFiveSquare: Generator<FiveParams> = {
  id: 'cm-five-square',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { t: rng.int(1, 19), u: rng.int(1, 4) };
    return { t: rng.int(1, 30), u: 5 };
  },
  render(p) {
    const lead = p.u === 5 ? `${fiveA(p)}^2 =` : `${fiveA(p)} \\times ${fiveB(p)} =`;
    return typed([say('Work it out without a calculator.')], fiveAnswer(p), lead);
  },
  choices(p) {
    const ans = fiveAnswer(p);
    const { t, u } = p;
    const tail = u * (10 - u);
    if (u === 5) return numberOptions(ans, [100 * t * t + 25, 100 * (t + 1) * (t + 1) + 25, ans + 100], 100, 1);
    const slips = [100 * t * (t + 1) + 25, 100 * t * t + tail];
    if (tail < 10) slips.unshift(10 * t * (t + 1) + tail);
    return numberOptions(ans, [...slips, ans + 100], 100, 1);
  },
  solution(p) {
    const { t, u } = p;
    const tail = u * (10 - u);
    const steps: SolutionStep[] = [
      {
        text:
          u === 5
            ? `${fiveA(p)} has ${t} ${t === 1 ? 'ten' : 'tens'} and ends in 5. Multiply the tens by the next number up:`
            : `Both have ${t} ${t === 1 ? 'ten' : 'tens'}, and the units ${u} and ${10 - u} add to 10. Multiply the tens by the next number up:`,
      },
      { tex: `${t} \\times ${t + 1} = ${t * (t + 1)}` },
      { text: 'Then multiply the units digits:' },
      { tex: `${u} \\times ${10 - u} = ${tail}` },
    ];
    steps.push({
      text: tail < 10 ? `The units part fills two places, so write it as 0${tail} after ${t * (t + 1)}:` : `Write it after ${t * (t + 1)}:`,
    });
    steps.push({ tex: u === 5 ? `${fiveA(p)}^2 = ${fiveAnswer(p)}` : `${fiveA(p)} \\times ${fiveB(p)} = ${fiveAnswer(p)}` });
    return steps;
  },
};

/* ---------- a difference of squares around a number ending in 5, as steps ---------- */

interface MidParams {
  /** The midpoint, ending in 5. */
  mid: number;
  k: number;
}

const cmMidSquareSteps: Generator<MidParams> = {
  id: 'cm-mid-square-steps',
  sample(rng, difficulty) {
    const tens = difficulty >= 2 ? rng.int(10, 19) : rng.int(2, 9);
    return { mid: 10 * tens + 5, k: rng.int(1, difficulty >= 2 ? 6 : 4) };
  },
  render({ mid, k }) {
    const a = mid - k;
    const b = mid + k;
    const t = (mid - 5) / 10;
    const M = mid * mid;
    const kk = k * k;
    const P = M - kk;
    const last = [M + kk, P - 100, P + 100, M - k].filter((v) => v !== P);
    return {
      kind: 'steps',
      prompt: [say(`Work out $${a} \\times ${b}$ as a difference of two squares. Tap the line, then choose what it becomes.`)],
      start: [`${a}`, '\\times', `${b}`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: `${mid}^2 - ${k}^2`,
          bank: stepBank(`${mid}^2 - ${k}^2`, `${mid}^2 + ${k}^2`, `${mid}^2 - ${2 * k}^2`, `${a}^2 - ${k}^2`),
        },
        {
          span: [0, 1],
          value: `${M} - ${kk}`,
          bank: stepBank(`${M} - ${kk}`, `${100 * t * t + 25} - ${kk}`, `${M} + ${kk}`, `${100 * (t + 1) * (t + 2) + 25} - ${kk}`),
        },
        { span: [0, 1], value: `${P}`, bank: stepBank(`${P}`, ...last.slice(0, 3).map(String)) },
      ],
    };
  },
  solution({ mid, k }) {
    const t = (mid - 5) / 10;
    const M = mid * mid;
    return [
      { text: `${mid - k} and ${mid + k} sit ${k} either side of ${mid}:` },
      { tex: `${mid - k} \\times ${mid + k} = ${mid}^2 - ${k}^2` },
      { text: `${mid} ends in 5, so multiply its ${t} tens by the next number up and write 25 after:` },
      { tex: `${t} \\times ${t + 1} = ${t * (t + 1)}` },
      { tex: `${mid}^2 = ${M}` },
      { tex: `${M} - ${k * k} = ${M - k * k}` },
    ];
  },
};

/* ---------- the distributive law, both ways ---------- */

interface DistributeParams {
  mode: 'near' | 'common';
  a: number;
  R: number;
  /** Near: the multiplier is R + d (d may be negative). */
  d: number;
  /** Common: a × b ± a × c, with b ± c = R. */
  b: number;
  c: number;
  minus: boolean;
  /** Common: the second product written c × a. */
  swap: boolean;
}

const distributeAnswer = (p: DistributeParams) => (p.mode === 'near' ? p.a * (p.R + p.d) : p.a * p.R);

const cmDistribute: Generator<DistributeParams> = {
  id: 'cm-distribute',
  sample(rng, difficulty) {
    const a = notRound(rng, 13, 99);
    if (difficulty >= 2) {
      const R = rng.pick([100, 100, 1000]);
      const minus = rng.chance(0.4);
      const c = notRound(rng, 11, R === 100 ? 49 : 499);
      const b = minus ? R + c : R - c;
      return { mode: 'common', a, R, d: 0, b, c, minus, swap: rng.chance(0.5) };
    }
    const R = rng.pick([100, 100, 1000]);
    const d = rng.pick([-3, -2, -1, 1, 2, 3]);
    return { mode: 'near', a, R, d, b: 0, c: 0, minus: false, swap: false };
  },
  render(p) {
    const ans = distributeAnswer(p);
    if (p.mode === 'near') return typed([say('Work it out without a calculator.')], ans, `${p.a} \\times ${p.R + p.d} =`);
    const second = p.swap ? `${p.c} \\times ${p.a}` : `${p.a} \\times ${p.c}`;
    return typed([say('Work it out without a calculator.')], ans, `${p.a} \\times ${p.b} ${p.minus ? '-' : '+'} ${second} =`);
  },
  choices(p) {
    const ans = distributeAnswer(p);
    if (p.mode === 'near') return numberOptions(ans, [p.a * (p.R - p.d), p.a * p.R + p.d, p.a * p.R, ans + 100], 1, 1);
    return numberOptions(ans, [p.a * p.b, 10 * ans, ans + p.a, ans - p.a], 1, 1);
  },
  solution(p) {
    const ans = distributeAnswer(p);
    if (p.mode === 'near') {
      const sign = p.d < 0 ? '-' : '+';
      const ad = p.a * Math.abs(p.d);
      return [
        { text: `${p.R + p.d} is ${p.R} ${p.d < 0 ? 'minus' : 'plus'} ${Math.abs(p.d)}, so multiply ${p.a} by each part:` },
        { tex: `${p.a} \\times ${p.R} = ${p.a * p.R}` },
        { tex: `${p.a} \\times ${Math.abs(p.d)} = ${ad}` },
        { tex: `${p.a * p.R} ${sign} ${ad} = ${ans}` },
      ];
    }
    return [
      { text: `Both products have a factor of ${p.a}, so take it out:` },
      { tex: `${p.a} \\times (${p.b} ${p.minus ? '-' : '+'} ${p.c})` },
      { tex: `${p.b} ${p.minus ? '-' : '+'} ${p.c} = ${p.R}` },
      { tex: `${p.a} \\times ${p.R} = ${ans}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Exponents
 * ================================================================ */

/* ---------- compare powers through a common exponent ---------- */

/** [base, exponent] with base^exponent small enough to picture. */
type Atom = [number, number];

const PAIRS: [Atom, Atom][] = [
  [[2, 3], [3, 2]],
  [[2, 5], [5, 2]],
  [[3, 3], [5, 2]],
  [[2, 7], [5, 3]],
  [[2, 10], [10, 3]],
  [[3, 4], [4, 3]],
  [[3, 5], [6, 3]],
  [[5, 3], [11, 2]],
  [[2, 5], [6, 2]],
  [[3, 3], [2, 5]],
];

const POOLS: Atom[][] = [
  [[2, 5], [3, 3], [5, 2], [6, 2]],
  [[2, 7], [5, 3], [11, 2]],
  [[2, 3], [3, 2], [7, 1], [10, 1]],
  [[2, 8], [3, 5], [6, 3], [15, 2]],
  [[2, 10], [10, 3], [31, 2]],
];

interface CompareParams {
  atoms: Atom[];
  k: number;
}

const atomValue = ([b, e]: Atom) => b ** e;
const powerTex = ([b, e]: Atom, k: number) => `${b}^{${e * k}}`;

const cmComparePowers: Generator<CompareParams> = {
  id: 'cm-compare-powers',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const pool = rng.pick(POOLS);
      return { atoms: rng.sample(pool, 3), k: rng.int(3, 15) };
    }
    const pair = rng.pick(PAIRS);
    return { atoms: rng.chance(0.5) ? [pair[0], pair[1]] : [pair[1], pair[0]], k: rng.int(3, 25) };
  },
  render({ atoms, k }) {
    const labels = atoms.map((a) => powerTex(a, k));
    const best = atoms.reduce((b, a, i) => (atomValue(a) > atomValue(atoms[b]) ? i : b), 0);
    const three = atoms.length === 3;
    return choiceSlide(
      [say(three ? 'Which of these is the largest?' : 'Which of these is larger?'), show(labels.join(' \\qquad '))],
      labels[best],
      [...labels.filter((_, i) => i !== best), three ? '\\text{They are all equal}' : '\\text{They are equal}'],
    );
  },
  solution({ atoms, k }) {
    const best = atoms.reduce((b, a, i) => (atomValue(a) > atomValue(atoms[b]) ? i : b), 0);
    const steps: SolutionStep[] = [{ text: `Every exponent is a multiple of ${k}, so write each number as a power with exponent ${k}:` }];
    for (const atom of atoms) {
      const [b, e] = atom;
      steps.push({ tex: e === 1 ? `${b}^{${k}}` : `${powerTex(atom, k)} = (${b}^{${e}})^{${k}} = ${atomValue(atom)}^{${k}}` });
    }
    const order = [...atoms].sort((x, y) => atomValue(y) - atomValue(x));
    steps.push({ text: 'With the same exponent, the bigger base gives the bigger number:' });
    steps.push({ tex: order.map((a) => `${atomValue(a)}^{${k}}`).join(' > ') });
    steps.push({ text: `So $${powerTex(atoms[best], k)}$ is the ${atoms.length === 3 ? 'largest' : 'larger'}.` });
    return steps;
  },
};

/* ---------- digits of 2^a × 5^b ---------- */

/** The shown form: bases of 2 and 5, or 4, 8 and 25 to be rewritten. */
const FORMS = [
  { two: 2, five: 5 },
  { two: 4, five: 5 },
  { two: 8, five: 5 },
  { two: 2, five: 25 },
  { two: 4, five: 25 },
];

const logOf = (base: number, prime: number) => Math.round(Math.log(base) / Math.log(prime));

interface PowerDigitsParams {
  form: number;
  /** Exponents as shown. */
  x: number;
  y: number;
}

function powerDigits(p: PowerDigitsParams) {
  const f = FORMS[p.form];
  const A = p.x * logOf(f.two, 2);
  const B = p.y * logOf(f.five, 5);
  const tens = Math.min(A, B);
  const left = A > B ? 2 ** (A - B) : 5 ** (B - A);
  return { A, B, tens, left, digits: tens + String(left).length };
}

const powerDigitsTex = (p: PowerDigitsParams) => `${FORMS[p.form].two}^{${p.x}} \\times ${FORMS[p.form].five}^{${p.y}}`;

function samplePowerDigits(rng: Rng, difficulty: number, table: boolean): PowerDigitsParams {
  for (;;) {
    const form = difficulty >= 2 ? rng.int(1, FORMS.length - 1) : 0;
    const x = rng.int(3, 40);
    const y = rng.int(3, 40);
    const p = { form, x, y };
    const { A, B, tens, left, digits } = powerDigits(p);
    if (A === B || tens < 6 || tens > 40) continue;
    if (A > B && A - B > 9) continue;
    if (B > A && B - A > 5) continue;
    if (table && new Set([tens, left, digits]).size < 3) continue;
    return p;
  }
}

function powerDigitsSolution(p: PowerDigitsParams): SolutionStep[] {
  const f = FORMS[p.form];
  const { A, B, tens, left, digits } = powerDigits(p);
  const steps: SolutionStep[] = [];
  if (f.two !== 2 || f.five !== 5) {
    steps.push({ text: 'Write every base as a power of 2 or of 5 first:' });
    if (f.two !== 2) steps.push({ tex: `${f.two}^{${p.x}} = 2^{${A}}` });
    if (f.five !== 5) steps.push({ tex: `${f.five}^{${p.y}} = 5^{${B}}` });
  }
  const spare = Math.abs(A - B);
  const leftTex = spare === 1 ? `${left}` : A > B ? `2^{${spare}}` : `5^{${spare}}`;
  steps.push(
    { text: `Each 2 with a 5 makes a 10, and there are ${tens} such pairs:` },
    { tex: `2^{${A}} \\times 5^{${B}} = ${leftTex} \\times 10^{${tens}}` },
    ...(spare === 1 ? [] : [{ tex: `${leftTex} = ${left}` }]),
    { text: `So the number is ${left} followed by ${tens} zeros:` },
    { tex: `${String(left).length} + ${tens} = ${digits}` },
  );
  return steps;
}

const cmPowerDigits: Generator<PowerDigitsParams> = {
  id: 'cm-power-digits',
  sample: (rng, difficulty) => samplePowerDigits(rng, difficulty, false),
  render(p) {
    return typed(
      [say('How many digits does this number have when it is written out in full?'), show(powerDigitsTex(p))],
      powerDigits(p).digits,
      '\\text{digits} =',
    );
  },
  choices(p) {
    const { A, B, tens, digits } = powerDigits(p);
    return numberOptions(digits, [p.x + p.y, A + B, Math.max(A, B), tens, digits + 1], 1, 1);
  },
  solution: powerDigitsSolution,
};

const cmPowerDigitsTable: Generator<PowerDigitsParams> = {
  id: 'cm-power-digits-table',
  sample: (rng, difficulty) => samplePowerDigits(rng, difficulty, true),
  render(p) {
    const { A, B, tens, left, digits } = powerDigits(p);
    return {
      kind: 'table',
      prompt: [say(`Count the digits of $${powerDigitsTex(p)}$: how many 10s it makes, the extra factor left over, and the digits in all.`)],
      columns: ['\\text{part}', '\\text{value}'],
      rows: [
        ['\\text{number of 10s}', null],
        ['\\text{extra factor}', null],
        ['\\text{digits}', null],
      ],
      bank: numberBank([tens, left, digits], [Math.max(A, B), A + B, Math.abs(A - B), digits + 1, 2 * left], 3, 1, 1),
      answer: [num(tens), num(left), num(digits)],
    };
  },
  solution: powerDigitsSolution,
};

/* ---------- last digit of a sum or difference of powers ---------- */

interface UnitsParams {
  a: number;
  m: number;
  b: number;
  n: number;
  minus: boolean;
}

const unitsAnswer = (p: UnitsParams) => {
  const x = lastDigitOf(p.a, p.m);
  const y = lastDigitOf(p.b, p.n);
  return p.minus ? (x - y + 10) % 10 : (x + y) % 10;
};

const UNIT_BASES = [2, 3, 4, 7, 8, 9];

const cmUnitsSum: Generator<UnitsParams> = {
  id: 'cm-units-sum',
  sample(rng, difficulty) {
    for (;;) {
      const [a, b] = rng.sample(UNIT_BASES, 2);
      const m = rng.int(difficulty >= 2 ? 20 : 10, 99);
      const n = rng.int(difficulty >= 2 ? 20 : 10, 99);
      if (difficulty >= 2) {
        // The first power has to be the bigger one, and borrowing has to happen sometimes.
        if (a <= b || m < n) continue;
        return { a, m, b, n, minus: true };
      }
      return { a, m, b, n, minus: false };
    }
  },
  render(p) {
    return typed(
      [say('What is the last digit of this number?'), show(`${p.a}^{${p.m}} ${p.minus ? '-' : '+'} ${p.b}^{${p.n}}`)],
      unitsAnswer(p),
      '\\text{last digit} =',
    );
  },
  choices(p) {
    const x = lastDigitOf(p.a, p.m);
    const y = lastDigitOf(p.b, p.n);
    const slips = p.minus ? [Math.abs(x - y), (x + y) % 10, (p.a - p.b) % 10] : [x, y, (x * y) % 10, (p.a + p.b) % 10];
    return digitOptions(unitsAnswer(p), slips);
  },
  solution(p) {
    const steps: SolutionStep[] = [{ text: 'Only last digits matter. Find the last digit of each power from its cycle:' }];
    for (const [base, power] of [
      [p.a, p.m],
      [p.b, p.n],
    ]) {
      const cycle = cycleOf(base);
      const r = power % cycle.length;
      steps.push({ tex: `${base}: \\; ${cycle.join(', ')}, \\ldots` });
      steps.push({
        text:
          cycle.length === 1
            ? `Every power of ${base} ends in ${cycle[0]}.`
            : `${power} leaves ${r} on dividing by ${cycle.length}, so $${base}^{${power}}$ ends in ${lastDigitOf(base, power)}.`,
      });
    }
    const x = lastDigitOf(p.a, p.m);
    const y = lastDigitOf(p.b, p.n);
    if (p.minus) {
      steps.push(
        x >= y
          ? { text: 'Take the last digits away:' }
          : { text: `${x} is less than ${y}, so the subtraction borrows 10, as in $13 - 7$:` },
        { tex: x >= y ? `${x} - ${y} = ${x - y}` : `${x + 10} - ${y} = ${x + 10 - y}` },
      );
    } else {
      steps.push({ text: 'Add the last digits and keep the last digit of that:' }, { tex: `${x} + ${y} = ${x + y}` });
    }
    steps.push({ text: `The last digit is ${unitsAnswer(p)}.` });
    return steps;
  },
};

/* ================================================================
 * Lesson 4: Roots
 * ================================================================ */

/* ---------- a root between two whole numbers ---------- */

interface BetweenParams {
  mode: 'floor' | 'count';
  lo: number;
  hi: number;
}

const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));
const floorRoot = (n: number) => Math.floor(Math.sqrt(n) + 1e-9);
const betweenAnswer = (p: BetweenParams) => (p.mode === 'floor' ? floorRoot(p.lo) : floorRoot(p.hi) - floorRoot(p.lo));

const cmRootBetween: Generator<BetweenParams> = {
  id: 'cm-root-between',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const lo = rng.int(20, 300);
        const hi = lo + rng.int(150, 700);
        if (isSquare(lo) || isSquare(hi)) continue;
        return { mode: 'count', lo, hi };
      }
      const lo = rng.int(50, 999);
      if (isSquare(lo)) continue;
      return { mode: 'floor', lo, hi: 0 };
    }
  },
  render(p) {
    if (p.mode === 'floor') {
      return typed(
        [say(`$\\sqrt{${p.lo}}$ lies between two whole numbers next to each other. What is the smaller of the two?`)],
        betweenAnswer(p),
        '\\text{smaller} =',
      );
    }
    return typed(
      [say(`How many whole numbers lie between $\\sqrt{${p.lo}}$ and $\\sqrt{${p.hi}}$?`)],
      betweenAnswer(p),
      '\\text{count} =',
    );
  },
  choices(p) {
    const ans = betweenAnswer(p);
    if (p.mode === 'floor') return numberOptions(ans, [ans + 1, ans - 1, Math.round(p.lo / 2)], 1, 1);
    return numberOptions(ans, [ans + 1, ans - 1, floorRoot(p.hi - p.lo)], 1, 1);
  },
  solution(p) {
    const f = floorRoot(p.lo);
    if (p.mode === 'floor') {
      return [
        { text: `Find the squares either side of ${p.lo}:` },
        { tex: `${f}^2 = ${f * f}` },
        { tex: `${f + 1}^2 = ${(f + 1) * (f + 1)}` },
        { text: `${p.lo} is between them, so $\\sqrt{${p.lo}}$ is between ${f} and ${f + 1}. The smaller is ${f}.` },
      ];
    }
    const g = floorRoot(p.hi);
    return [
      { text: `A whole number k lies between the roots when $k^2$ lies between ${p.lo} and ${p.hi}.` },
      { text: 'The first square above the bottom and the last square below the top:' },
      { tex: `${f + 1}^2 = ${(f + 1) * (f + 1)}` },
      { tex: `${g}^2 = ${g * g}` },
      { text: `So k runs from ${f + 1} to ${g}:` },
      { tex: `${g} - ${f + 1} + 1 = ${g - f}` },
    ];
  },
};

/* ---------- a root of a product ---------- */

interface RootProductParams {
  mode: 'pair' | 'four';
  /** Pair: √(c u²) × √(c v²). Four: √(n(n+1)(n+2)(n+3) + 1). */
  c: number;
  u: number;
  v: number;
  n: number;
}

const rootProductAnswer = (p: RootProductParams) => (p.mode === 'pair' ? p.c * p.u * p.v : p.n * p.n + 3 * p.n + 1);
const fourTex = (n: number) => `\\sqrt{${n} \\times ${n + 1} \\times ${n + 2} \\times ${n + 3} + 1}`;

const cmRootProduct: Generator<RootProductParams> = {
  id: 'cm-root-product',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { mode: 'four', c: 0, u: 0, v: 0, n: rng.int(2, 30) };
    for (;;) {
      const u = rng.int(1, 6);
      const v = rng.int(1, 6);
      if (u === v) continue;
      return { mode: 'pair', c: rng.pick([2, 3, 5, 6, 7]), u, v, n: 0 };
    }
  },
  render(p) {
    const ans = rootProductAnswer(p);
    if (p.mode === 'four') return typed([say('Work it out without a calculator.'), show(fourTex(p.n))], ans, '\\text{value} =');
    return typed([say('Work it out without a calculator.')], ans, `\\sqrt{${p.c * p.u * p.u}} \\times \\sqrt{${p.c * p.v * p.v}} =`);
  },
  choices(p) {
    const ans = rootProductAnswer(p);
    if (p.mode === 'four') return numberOptions(ans, [ans + 1, ans - 1, ans + 2, (p.n + 1) * (p.n + 2) + 1], 1, 1);
    return numberOptions(ans, [p.u * p.v, p.c * (p.u + p.v), 2 * ans, ans + p.c], 1, 1);
  },
  solution(p) {
    const ans = rootProductAnswer(p);
    if (p.mode === 'four') {
      const n = p.n;
      const X = n * (n + 3);
      return [
        { text: 'Pair the outside two and the inside two:' },
        { tex: `${n} \\times ${n + 3} = ${X}` },
        { tex: `${n + 1} \\times ${n + 2} = ${X + 2}` },
        { text: `Two numbers 2 apart, plus 1, make the square of the number between them:` },
        { tex: `${X} \\times ${X + 2} + 1 = ${X + 1}^2` },
        { tex: `\\sqrt{${X + 1}^2} = ${ans}` },
      ];
    }
    const a = p.c * p.u * p.u;
    const b = p.c * p.v * p.v;
    return [
      { text: 'Two roots multiply under one root:' },
      { tex: `\\sqrt{${a}} \\times \\sqrt{${b}} = \\sqrt{${a * b}}` },
      { text: `Each number under a root is ${p.c} times a square, so the product holds $${p.c}^2$:` },
      { tex: `${a * b} = ${p.c}^2 \\times ${p.u * p.u} \\times ${p.v * p.v}` },
      { tex: `\\sqrt{${a * b}} = ${p.c} \\times ${p.u} \\times ${p.v} = ${ans}` },
    ];
  },
};

/* ---------- add surds by pulling out squares, as tiles ---------- */

interface SurdSumParams {
  c: number;
  u: number;
  v: number;
  minus: boolean;
}

const surdSumAnswer = (p: SurdSumParams) => (p.minus ? p.u - p.v : p.u + p.v);

const cmSurdSumTiles: Generator<SurdSumParams> = {
  id: 'cm-surd-sum-tiles',
  sample(rng, difficulty) {
    const c = rng.pick([2, 3, 5, 6, 7]);
    for (;;) {
      if (difficulty >= 2) {
        const u = rng.int(5, 12);
        const v = rng.int(2, u - 2);
        return { c, u, v, minus: true };
      }
      const u = rng.int(2, 7);
      const v = rng.int(2, 7);
      if (u === v) continue;
      return { c, u, v, minus: false };
    }
  },
  render(p) {
    const { c, u, v } = p;
    const op = p.minus ? '-' : '+';
    const ans = surdSumAnswer(p);
    return {
      kind: 'tiles',
      prompt: [say('Pull the square factors out of each root, then collect.'), show(`\\sqrt{${u * u * c}} ${op} \\sqrt{${v * v * c}}`)],
      template: `= {0}\\sqrt ${c} ${op} {1}\\sqrt ${c} = {2}\\sqrt ${c}`,
      bank: numberBank([u, v, ans], [u * u, v * v, p.minus ? u + v : Math.abs(u - v), ans + 1], 3, 1, 1),
      answer: [num(u), num(v), num(ans)],
    };
  },
  solution(p) {
    const { c, u, v } = p;
    const op = p.minus ? '-' : '+';
    return [
      { text: `Each number under a root is a square times ${c}:` },
      { tex: `\\sqrt{${u * u * c}} = \\sqrt{${u * u}} \\times \\sqrt{${c}} = ${u}\\sqrt{${c}}` },
      { tex: `\\sqrt{${v * v * c}} = \\sqrt{${v * v}} \\times \\sqrt{${c}} = ${v}\\sqrt{${c}}` },
      { text: `Now they are like terms, so ${p.minus ? 'subtract' : 'add'} the numbers in front:` },
      { tex: `${u}\\sqrt{${c}} ${op} ${v}\\sqrt{${c}} = ${surdSumAnswer(p)}\\sqrt{${c}}` },
    ];
  },
};

/* ---------- a root inside a root ---------- */

interface NestedParams {
  x: number;
  y: number;
  minus: boolean;
}

const pairTex = (x: number, y: number, minus: boolean) => `${rootTex(x)} ${minus ? '-' : '+'} ${rootTex(y)}`;
const pairValue = (x: number, y: number, minus: boolean) => Math.sqrt(x) + (minus ? -1 : 1) * Math.sqrt(y);

/** `2\\sqrt{10}` or `6\\sqrt{2}`: twice the root of xy, simplified. */
const twiceRootTex = (xy: number) => {
  const [c, d] = rootParts(xy);
  return `${2 * c}\\sqrt{${d}}`;
};

const nestedTex = (p: NestedParams) => `\\sqrt{${p.x + p.y} ${p.minus ? '-' : '+'} ${twiceRootTex(p.x * p.y)}}`;

const cmNestedRoot: Generator<NestedParams> = {
  id: 'cm-nested-root',
  sample(rng, difficulty) {
    for (;;) {
      const x = rng.int(3, 15);
      const y = rng.int(1, x - 1);
      if (isSquare(x * y)) continue;
      if (isSquare(x) && isSquare(y)) continue;
      return { x, y, minus: difficulty >= 2 };
    }
  },
  render(p) {
    const { x, y, minus } = p;
    const correct = pairTex(x, y, minus);
    const target = pairValue(x, y, minus);
    const seen = [target];
    const distractors: string[] = [];
    const offer = (tex: string, value: number) => {
      if (distractors.length === 3 || seen.some((s) => Math.abs(s - value) < 1e-6)) return;
      seen.push(value);
      distractors.push(tex);
    };
    // The trap: a root of a sum split as if it were a sum of roots.
    const [c, d] = rootParts(x * y);
    offer(`\\sqrt{${x + y}} ${minus ? '-' : '+'} \\sqrt{${twiceRootTex(x * y)}}`, Math.sqrt(x + y) + (minus ? -1 : 1) * Math.sqrt(2 * c * Math.sqrt(d)));
    // Two roots that are both whole read as a plain number, which gives itself away.
    const offerPair = (a: number, b: number, sign: boolean) => {
      if (!(isSquare(a) && isSquare(b))) offer(pairTex(a, b, sign), pairValue(a, b, sign));
    };
    // The same product, the wrong sum.
    const other = [...Array(x * y).keys()].find((q) => q > 0 && q * q < x * y && q !== y && (x * y) % q === 0);
    if (other !== undefined) offerPair((x * y) / other, other, minus);
    // The same sum, the wrong product.
    if (y > 1) offerPair(x + 1, y - 1, minus);
    offerPair(x, y, !minus);
    offerPair(x + 2, y, minus);
    offerPair(x + 3, y, minus);
    return choiceSlide([say('Which of these is equal to it?'), show(nestedTex(p))], correct, distractors);
  },
  solution(p) {
    const { x, y, minus } = p;
    const op = minus ? '-' : '+';
    return [
      { text: `Look for two numbers that add to ${x + y} and multiply to ${x * y}: they are ${x} and ${y}. Then square $${pairTex(x, y, minus)}$:` },
      { tex: `(${pairTex(x, y, minus)})^2 = ${x} + ${y} ${op} 2\\sqrt{${x * y}}` },
      { tex: `= ${x + y} ${op} ${twiceRootTex(x * y)}` },
      ...(minus ? [{ text: `$\\sqrt{${x}}$ is bigger than $\\sqrt{${y}}$, so the difference is positive, as a square root must be.` }] : []),
      { tex: `${nestedTex(p)} = ${pairTex(x, y, minus)}` },
    ];
  },
};

/* ================================================================
 * Lesson 5: What's the Number?
 * ================================================================ */

/* ---------- run the operations backwards ---------- */

type Op = { kind: 'mul' | 'div' | 'add' | 'sub'; v: number };

interface UndoParams {
  start: number;
  ops: Op[];
}

const applyOp = (value: number, { kind, v }: Op) =>
  kind === 'mul' ? value * v : kind === 'div' ? value / v : kind === 'add' ? value + v : value - v;

const undoOp = (value: number, { kind, v }: Op) =>
  kind === 'mul' ? value / v : kind === 'div' ? value * v : kind === 'add' ? value - v : value + v;

/** Values from the start to the answer, one per operation. */
function chain(p: UndoParams): number[] {
  const out = [p.start];
  for (const op of p.ops) out.push(applyOp(out[out.length - 1], op));
  return out;
}

function phrase({ kind, v }: Op, first: boolean): string {
  if (kind === 'mul') return v === 2 ? (first ? 'double it' : 'double that') : first ? `multiply it by ${v}` : `multiply by ${v}`;
  if (kind === 'div') return v === 2 ? 'halve the result' : `divide by ${v}`;
  return kind === 'add' ? `add ${v}` : `take away ${v}`;
}

const undoTex = ({ kind, v }: Op) => (kind === 'mul' ? `\\div ${v}` : kind === 'div' ? `\\times ${v}` : kind === 'add' ? `- ${v}` : `+ ${v}`);

function sampleUndo(rng: Rng, difficulty: number): UndoParams {
  const shapes: Op['kind'][][] =
    difficulty >= 2
      ? [
          ['mul', 'add', 'div', 'sub'],
          ['add', 'mul', 'sub', 'div'],
          ['sub', 'mul', 'add', 'div'],
          ['mul', 'sub', 'div', 'add'],
        ]
      : [
          ['mul', 'add', 'div'],
          ['add', 'mul', 'sub'],
          ['sub', 'div', 'add'],
          ['mul', 'sub', 'div'],
        ];
  for (;;) {
    const shape = rng.pick(shapes);
    const start = rng.int(3, difficulty >= 2 ? 60 : 30);
    const ops: Op[] = shape.map((kind) => ({
      kind,
      v: kind === 'mul' ? rng.int(2, 6) : kind === 'div' ? rng.int(2, 5) : rng.int(2, 20),
    }));
    const values = chain({ start, ops });
    if (values.some((value) => !Number.isInteger(value) || value <= 0)) continue;
    if (new Set(values).size < values.length) continue;
    return { start, ops };
  }
}

function undoSentence(p: UndoParams): string {
  const parts = p.ops.map((op, i) => phrase(op, i === 0));
  const list = `${parts.slice(0, -1).join(', ')} and then ${parts[parts.length - 1]}`;
  const values = chain(p);
  return `I think of a number, ${list}. The answer is ${values[values.length - 1]}.`;
}

function undoSolution(p: UndoParams): SolutionStep[] {
  const values = chain(p);
  const steps: SolutionStep[] = [{ text: `Start from ${values[values.length - 1]} and undo each step, last first:` }];
  for (let i = p.ops.length - 1; i >= 0; i -= 1) {
    steps.push({ tex: `${values[i + 1]} ${undoTex(p.ops[i])} = ${values[i]}` });
  }
  steps.push({ text: `The number was ${p.start}.` });
  return steps;
}

const cmUndoNumber: Generator<UndoParams> = {
  id: 'cm-undo-number',
  sample: sampleUndo,
  render(p) {
    return typed([say(undoSentence(p)), say('What number did I think of?')], p.start, '\\text{number} =');
  },
  choices(p) {
    const values = chain(p);
    const end = values[values.length - 1];
    // Undoing in the order the steps were done, not last first.
    const wrongOrder = p.ops.reduce((value, op) => undoOp(value, op), end);
    // Doing the steps again instead of undoing them.
    const forward = p.ops.reduce((value, op) => applyOp(value, op), end);
    return numberOptions(p.start, [wrongOrder, forward, values[1], p.start + 1], 1, 1);
  },
  solution: undoSolution,
};

const cmUndoTable: Generator<UndoParams> = {
  id: 'cm-undo-table',
  sample: sampleUndo,
  render(p) {
    const values = chain(p);
    const end = values[values.length - 1];
    const rows: (string | null)[][] = [['\\text{answer}', `${end}`]];
    const answer: number[] = [];
    for (let i = p.ops.length - 1; i >= 0; i -= 1) {
      rows.push([undoTex(p.ops[i]), null]);
      answer.push(values[i]);
    }
    // Slips: each step done forwards instead of undone.
    const slips = p.ops.map((op, i) => applyOp(values[i + 1], op));
    return {
      kind: 'table',
      prompt: [say(undoSentence(p)), say('Undo the steps, last first, to find the number.')],
      columns: ['\\text{undo}', '\\text{number}'],
      rows,
      bank: numberBank(answer, slips.filter((v) => Number.isInteger(v) && v > 0), 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution: undoSolution,
};

/* ---------- the answer that never changes ---------- */

interface AlwaysParams {
  mode: 'short' | 'long';
  /** Short: add a, ×m, add b, ÷m, take away n → a + b/m. */
  a: number;
  m: number;
  b: number;
  /** Long: ×m, add a, ×k, add b, ÷mk, take away n → (ka + b)/mk. */
  k: number;
}

const alwaysAnswer = (p: AlwaysParams) => (p.mode === 'short' ? p.a + p.b / p.m : (p.k * p.a + p.b) / (p.m * p.k));

const addPhrase = (v: number) => (v < 0 ? `take away ${-v}` : `add ${v}`);

/** `2n + 10`, `n + 3`, `6n - 4`. */
function linTex(coef: number, constant: number): string {
  const lead = coef === 1 ? 'n' : `${coef}n`;
  return constant === 0 ? lead : `${lead} ${signed(constant)}`;
}

const cmAlwaysSame: Generator<AlwaysParams> = {
  id: 'cm-always-same',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const m = rng.int(2, 4);
        const k = rng.int(2, 3);
        const a = rng.int(1, 12);
        const R = rng.int(1, 9);
        const b = m * k * R - k * a;
        if (b === 0 || Math.abs(b) > 60) continue;
        return { mode: 'long', a, m, b, k };
      }
      const m = rng.int(2, 5);
      const a = rng.int(2, 15);
      const t = rng.int(1 - a, 12);
      if (t === 0) continue;
      return { mode: 'short', a, m, b: m * t, k: 1 };
    }
  },
  render(p) {
    const steps =
      p.mode === 'short'
        ? [addPhrase(p.a), `multiply by ${p.m}`, addPhrase(p.b), `divide by ${p.m}`]
        : [`multiply it by ${p.m}`, addPhrase(p.a), `multiply by ${p.k}`, addPhrase(p.b), `divide by ${p.m * p.k}`];
    const R = alwaysAnswer(p);
    const slips = p.mode === 'short' ? [p.a, p.a + p.b, R + p.m, R + 1] : [p.a, p.a + p.b, R * p.k, R + 1];
    const numbers = [...new Set(slips.filter((v) => Number.isInteger(v) && v > 0 && v !== R))].slice(0, 2);
    return choiceSlide(
      [
        say(`Think of a number. Then ${steps.join(', ')}, and finally take away the number you first thought of.`),
        say('What is the result?'),
      ],
      `${R}`,
      [...numbers.map(String), '\\text{It depends on the number}'],
    );
  },
  solution(p) {
    const R = alwaysAnswer(p);
    const steps: SolutionStep[] = [{ text: 'Call the number $n$ and follow it through:' }];
    if (p.mode === 'short') {
      steps.push(
        { tex: linTex(1, p.a) },
        { tex: linTex(p.m, p.m * p.a) },
        { tex: linTex(p.m, p.m * p.a + p.b) },
        { tex: linTex(1, p.a + p.b / p.m) },
      );
    } else {
      const { m, k, a, b } = p;
      steps.push(
        { tex: linTex(m, 0) },
        { tex: linTex(m, a) },
        { tex: linTex(m * k, k * a) },
        { tex: linTex(m * k, k * a + b) },
        { tex: linTex(1, R) },
      );
    }
    steps.push({ text: `Taking away $n$ leaves ${R}, whatever $n$ was.` });
    return steps;
  },
};

/* ---------- place value puzzles ---------- */

interface PlaceParams {
  mode: 'reverse' | 'append';
  /** Reverse: the number is 10a + b. */
  a: number;
  b: number;
  /** Append: digit d written on the right of N. */
  N: number;
  d: number;
}

const placeAnswer = (p: PlaceParams) => (p.mode === 'reverse' ? 10 * p.a + p.b : p.N);

const cmPlaceValue: Generator<PlaceParams> = {
  id: 'cm-place-value',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { mode: 'append', a: 0, b: 0, N: rng.int(12, 999), d: rng.int(1, 9) };
    for (;;) {
      const a = rng.int(1, 9);
      const b = rng.int(1, 9);
      if (a !== b) return { mode: 'reverse', a, b, N: 0, d: 0 };
    }
  },
  render(p) {
    if (p.mode === 'append') {
      return typed(
        [say(`Writing the digit ${p.d} on the right-hand end of a whole number makes it ${9 * p.N + p.d} bigger. What was the number?`)],
        p.N,
        '\\text{number} =',
      );
    }
    const change = 9 * Math.abs(p.b - p.a);
    return typed(
      [
        say(`The two digits of a number add to ${p.a + p.b}. Swapping the digits makes the number ${change} ${p.b > p.a ? 'bigger' : 'smaller'}.`),
        say('What is the number?'),
      ],
      placeAnswer(p),
      '\\text{number} =',
    );
  },
  choices(p) {
    if (p.mode === 'append') {
      const k = 9 * p.N + p.d;
      return numberOptions(p.N, [10 * p.N + p.d, Math.round(k / 10), p.N + 1], 1, 1);
    }
    const s = p.a + p.b;
    const near = [
      [p.a + 1, p.b - 1],
      [p.a - 1, p.b + 1],
    ]
      .filter(([x, y]) => x >= 1 && x <= 9 && y >= 0 && y <= 9)
      .map(([x, y]) => 10 * x + y);
    return numberOptions(placeAnswer(p), [10 * p.b + p.a, ...near, 10 * Math.floor(s / 2) + Math.ceil(s / 2)], 1, 10);
  },
  solution(p) {
    if (p.mode === 'append') {
      const k = 9 * p.N + p.d;
      return [
        { text: `Writing ${p.d} on the end of $N$ makes $10N + ${p.d}$, so the increase is` },
        { tex: `10N + ${p.d} - N = 9N + ${p.d}` },
        { tex: `9N + ${p.d} = ${k}` },
        { tex: `9N = ${k - p.d}` },
        { tex: `N = ${p.N}` },
      ];
    }
    const { a, b } = p;
    const up = b > a;
    return [
      { text: 'Write the number as $10a + b$. Swapping the digits gives $10b + a$, and the change is' },
      { tex: up ? '(10b + a) - (10a + b) = 9(b - a)' : '(10a + b) - (10b + a) = 9(a - b)' },
      { tex: up ? `b - a = ${9 * (b - a)} \\div 9 = ${b - a}` : `a - b = ${9 * (a - b)} \\div 9 = ${a - b}` },
      { tex: `a + b = ${a + b}` },
      { text: 'Add the two lines and halve to get the larger digit; the other is what is left:' },
      { tex: up ? `b = (${a + b} + ${b - a}) \\div 2 = ${b}` : `a = (${a + b} + ${a - b}) \\div 2 = ${a}` },
      { tex: up ? `a = ${a + b} - ${b} = ${a}` : `b = ${a + b} - ${a} = ${b}` },
      { text: `The number is ${10 * a + b}.` },
    ];
  },
};

export const contestFastGenerators = [
  cmFriendlyProduct,
  cmFriendlySplitTiles,
  cmRegroupSum,
  cmDivideQuick,
  cmNearHundred,
  cmFiveSquare,
  cmMidSquareSteps,
  cmDistribute,
  cmComparePowers,
  cmPowerDigits,
  cmPowerDigitsTable,
  cmUnitsSum,
  cmRootBetween,
  cmRootProduct,
  cmSurdSumTiles,
  cmNestedRoot,
  cmUndoNumber,
  cmUndoTable,
  cmAlwaysSame,
  cmPlaceValue,
];
