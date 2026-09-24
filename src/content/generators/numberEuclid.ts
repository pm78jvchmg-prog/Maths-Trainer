/**
 * Number & Proof, level 5: Euclid's Algorithm.
 *
 * The HCF by repeated division, then the same run read backwards: each
 * remainder is a combination of the two numbers above it, so back-substituting
 * writes the HCF as ax + by. From there, ax + by = c has whole-number
 * solutions exactly when the HCF divides c, one comes from scaling the
 * backwards run, and the rest follow from it by steps of b/h and a/h.
 *
 * Every question is built outward from its answer: a run starts from its HCF
 * and its quotients and is multiplied up, so it is whole at every step, and a
 * solution of ax + by = c is chosen before c is worked out from it. Every
 * number the learner meets is under 1000. A line such as 4 = 24 - 2 x 10, or
 * a pair (x, y), is a *form*, so it goes through tiles, a table, an order or
 * a choice; only a single whole number (a quotient, a remainder, an HCF, one
 * of x and y, a count) is typed (PITFALLS 3.4).
 *
 * Nothing here is calculus, so no slide declares `source` and the oracle
 * tests do not apply. `numberEuclid.test.ts` re-runs the algorithm from the
 * numbers each prompt states and holds every quoted quotient, remainder, HCF
 * and solution to it instead. The shared helpers come from `numberProof.ts`.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { bin, num, valueOf, type Expr } from '../expr';
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
import { treeBank } from './parametricImplicit';

/* ---------- the run ---------- */

/** One line of a run: a = q x b + r. */
export interface Division {
  a: number;
  b: number;
  q: number;
  r: number;
}

/** Euclid's algorithm on a and b: every division, down to the one leaving 0. */
export function runOf(a: number, b: number): Division[] {
  const out: Division[] = [];
  let [x, y] = [a, b];
  while (y > 0) {
    const q = Math.floor(x / y);
    const r = x - q * y;
    out.push({ a: x, b: y, q, r });
    [x, y] = [y, r];
  }
  return out;
}

/**
 * The pair a run of these quotients ends on h from: the last division leaves
 * 0, so it multiplies back up from (h, 0). Returns [a, b].
 */
export function buildUp(h: number, qs: readonly number[]): [number, number] {
  let lo = 0;
  let hi = h;
  for (let i = qs.length - 1; i >= 0; i -= 1) [lo, hi] = [hi, qs[i] * hi + lo];
  return [hi, lo];
}

interface RunParams {
  h: number;
  qs: number[];
}

const pairOf = ({ h, qs }: RunParams): [number, number] => buildUp(h, qs);

/**
 * A run of so many divisions ending on HCF h. The last quotient is at least 2,
 * since the number above h is a multiple of it bigger than it.
 */
function sampleRun(
  rng: Rng,
  divisions: readonly number[],
  hs: readonly number[],
  maxA: number,
  accept: (params: RunParams) => boolean = () => true,
): RunParams {
  for (;;) {
    const m = rng.pick(divisions);
    const h = rng.pick(hs);
    const qs = Array.from({ length: m }, (_, i) => (i === m - 1 ? rng.int(2, 4) : rng.int(1, i === 0 ? 5 : 3)));
    const [a, b] = buildUp(h, qs);
    if (a >= maxA || b < 10) continue;
    const params = { h, qs };
    if (accept(params)) return params;
  }
}

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** A run at difficulty 1 (three divisions, under 300) or 2 (four or five, under 1000). */
const runAt = (rng: Rng, difficulty: number, accept?: (params: RunParams) => boolean) =>
  difficulty >= 2
    ? sampleRun(rng, [4, 5], range(1, 16), 1000, accept)
    : sampleRun(rng, [3], range(2, 12), 300, accept);

const lineTex = ({ a, b, q, r }: Division) => `${a} = ${q} \\times ${b} + ${r}`;

/** The run as the learner writes it, one division to a line. */
function runTex(run: Division[]): string {
  return `\\begin{aligned} ${run.map(({ a, b, q, r }) => `${a} &= ${q} \\times ${b} + ${r}`).join(' \\\\ ')} \\end{aligned}`;
}

/** `k \times n`, or just `n` when k is 1. */
const times = (k: number, n: number) => (k === 1 ? `${n}` : `${k} \\times ${n}`);

/** uP + vQ with the positive term first: `2 \times 91 - 3 \times 56`. */
export function comboTex(u: number, P: number, v: number, Q: number): string {
  const [[k1, n1], [k2, n2]] = u >= 0 || v < 0 ? [[u, P], [v, Q]] : [[v, Q], [u, P]];
  const head = k1 < 0 ? `-${times(-k1, n1)}` : times(k1, n1);
  return `${head} ${k2 < 0 ? '-' : '+'} ${times(Math.abs(k2), n2)}`;
}

/** h = uP + vQ, one line of the backwards run. */
export interface Combo {
  u: number;
  P: number;
  v: number;
  Q: number;
}

/**
 * The run worked backwards. The first line rearranges the division whose
 * remainder is the HCF; each after it puts in the remainder the line before
 * used, until the last is over a and b, giving h = ax + by with x = u, y = v.
 */
export function backLines(run: Division[]): Combo[] {
  const top = run.length - 2;
  let u = 1;
  let v = -run[top].q;
  const lines: Combo[] = [{ u, P: run[top].a, v, Q: run[top].b }];
  for (let j = top - 1; j >= 0; j -= 1) {
    [u, v] = [v, u - v * run[j].q];
    lines.push({ u, P: run[j].a, v, Q: run[j].b });
  }
  return lines;
}

/** x and y with ax + by = HCF, from the backwards run. */
export function bezout(a: number, b: number): [number, number] {
  const lines = backLines(runOf(a, b));
  const { u, v } = lines[lines.length - 1];
  return [u, v];
}

/** `r = a - q \times b`, a division rearranged for its remainder. */
const rearrangedTex = ({ a, b, q, r }: Division) => `${r} = ${a} - ${times(q, b)}`;

function runSolution(run: Division[]): SolutionStep[] {
  const h = run[run.length - 1].b;
  return [
    { text: 'Divide, then divide the divisor by the remainder, until the remainder is $0$:' },
    { tex: runTex(run) },
    { text: `The last remainder that is not $0$ is $${h}$, so that is the HCF.` },
  ];
}

/* ---------- banks and options ---------- */

/** Numbers near a value, for topping up a bank whose slips collided. */
function near(value: number, count: number): number[] {
  const out: number[] = [];
  for (let gap = 1; out.length < count; gap += 1) out.push(value + gap, value - gap);
  return out.slice(0, count);
}

/** Six distinct whole values under 1000 for a reduce node, the right one among them. */
function numBank(correct: number, slips: number[]): string[] {
  const seen = new Set([correct]);
  const out = [correct];
  for (const value of [...slips, ...near(correct, 10)]) {
    if (out.length >= 6) break;
    if (!Number.isInteger(value) || value < 0 || value >= 1000 || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out.sort((x, y) => x - y).map(String);
}

/** Four whole-number options: the answer and the first three distinct slips. */
function intOptions(correct: number, slips: number[], min = 0): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of [...slips, ...near(correct, 12)]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || value < min || value >= 1000 || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  return options(
    { tex: String(correct), answer: String(correct) },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: String(value), answer: String(value) })),
  );
}

/** A pair (s, t) of these values, from different places, other than `pair`, with as + bt = c. */
function otherSolution(values: number[], pair: [number, number], a: number, b: number, c: number): boolean {
  for (let i = 0; i < values.length; i += 1) {
    for (let j = 0; j < values.length; j += 1) {
      if (i === j) continue;
      const [s, t] = [values[i], values[j]];
      if (a * s + b * t === c && !(s === pair[0] && t === pair[1])) return true;
    }
  }
  return false;
}

/**
 * Tiles for an answer holding a solution `pair` of ax + by = c: the slips,
 * less any that would let another pair of tiles solve it as well, since the
 * tiles are graded by the one pair they name.
 */
function soleBank(answer: string[], pair: [number, number], a: number, b: number, c: number, slips: number[]): string[] {
  const chosen: number[] = [];
  const given = answer.map(Number);
  for (const value of [...slips, ...pair.flatMap((p) => near(p, 6))]) {
    if (chosen.length >= 4) break;
    if (!Number.isInteger(value) || Math.abs(value) >= 1000) continue;
    if (given.includes(value) || chosen.includes(value)) continue;
    if (otherSolution([...given, ...chosen, value], pair, a, b, c)) continue;
    chosen.push(value);
  }
  return fillBank(answer, chosen.map(String), 2);
}

/* ================================================================
 * Lesson 1: the algorithm
 * ================================================================ */

interface DivideParams {
  a: number;
  b: number;
  want: 'q' | 'r';
}

const eucDivide: Generator<DivideParams> = {
  id: 'euc-divide',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const b = hard ? rng.int(40, 160) : rng.int(12, 60);
      const q = rng.int(2, hard ? 9 : 6);
      const r = rng.int(1, b - 1);
      const a = q * b + r;
      if (a >= (hard ? 1000 : 300)) continue;
      return { a, b, want: rng.pick(['q', 'r'] as const) };
    }
  },
  render({ a, b, want }) {
    return {
      kind: 'expression',
      prompt: [
        say(`Divide $${a}$ by $${b}$, writing it as $${a} = q \\times ${b} + r$ with $0 \\le r < ${b}$.`),
        say(want === 'q' ? 'What is the quotient $q$?' : 'What is the remainder $r$?'),
      ],
      lead: want === 'q' ? 'q =' : 'r =',
      keypad: [],
      answer: String(want === 'q' ? Math.floor(a / b) : a % b),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution({ a, b }) {
    const q = Math.floor(a / b);
    return [
      { text: `$${b}$ goes into $${a}$ $${q}$ times: $${q} \\times ${b} = ${q * b}$, and one more, $${q * b} + ${b}$, would pass $${a}$.` },
      { tex: stackTex(`r = ${a} - ${q * b} = ${a - q * b}`) },
      { tex: stackTex(lineTex({ a, b, q, r: a - q * b })) },
    ];
  },
};

const eucRunTable: Generator<RunParams> = {
  id: 'euc-run-table',
  sample: (rng, difficulty) => runAt(rng, difficulty),
  render(params) {
    const run = runOf(...pairOf(params));
    const answer = run.flatMap(({ q, r }) => [String(q), String(r)]);
    const slips = run.flatMap(({ b, q, r }) => [q + 1, q - 1, r + b, r - 1]);
    return {
      kind: 'table',
      prompt: [
        say('Each row is one division, $a = q \\times b + r$, and the next row divides $b$ by $r$.'),
        say('Fill in every quotient $q$ and remainder $r$.'),
      ],
      columns: ['a', 'b', 'q', 'r'],
      rows: run.map(({ a, b }) => [String(a), String(b), null, null]),
      bank: treeBank(answer.map(Number), slips.filter((value) => value >= 0)),
      answer,
    };
  },
  solution(params) {
    return runSolution(runOf(...pairOf(params)));
  },
};

const eucHcf: Generator<RunParams> = {
  id: 'euc-hcf',
  sample: (rng, difficulty) => runAt(rng, difficulty),
  render(params) {
    const [a, b] = pairOf(params);
    return {
      kind: 'expression',
      prompt: [say(`Use Euclid's algorithm to find the HCF of $${a}$ and $${b}$.`)],
      lead: `\\text{HCF}(${a}, ${b}) =`,
      keypad: [],
      answer: String(params.h),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution(params) {
    return runSolution(runOf(...pairOf(params)));
  },
};

/* ---------- why HCF(a, b) = HCF(b, r) ---------- */

interface WhyParams {
  d: Division;
  difficulty: number;
  picks: number[];
}

function whyProof({ d, difficulty }: WhyParams): Proof {
  const { a, b, q, r } = d;
  const qn = q === 1 ? 'n' : `${q}n`;
  const qdn = q === 1 ? 'dn' : `${q}dn`;
  const middle =
    difficulty >= 2
      ? [
          `Rearranging the division, $${r} = ${a} - ${times(q, b)} = dm - ${qdn}$.`,
          `So $${r} = d(m - ${qn})$, a multiple of $d$: every common factor of $${a}$ and $${b}$ divides $${r}$.`,
        ]
      : [`Then $${r} = ${a} - ${times(q, b)} = d(m - ${qn})$, so every common factor of $${a}$ and $${b}$ divides $${r}$.`];
  return {
    claim: `$${lineTex(d)}$. Prove that $${a}$ and $${b}$ have exactly the same common factors as $${b}$ and $${r}$, so the same HCF.`,
    steps: [
      `Let $d$ divide both $${a}$ and $${b}$, so $${a} = dm$ and $${b} = dn$ for whole numbers $m$ and $n$.`,
      ...middle,
      `The other way round, if $d$ divides $${b}$ and $${r}$, it divides $${times(q, b)} + ${r} = ${a}$ too.`,
      'So the two pairs share exactly the same common factors, and the largest of them, the HCF, is the same.',
    ],
    pool: [
      {
        text: `Rearranging the division, $${r} = ${a} + ${times(q, b)}$.`,
        why: `Taking $${times(q, b)}$ from both sides of $${lineTex(d)}$ leaves $${r} = ${a} - ${times(q, b)}$.`,
      },
      {
        text: `So $d$ divides the quotient, $${q}$, as well.`,
        why: 'Nothing in the proof makes $d$ a factor of the quotient, and the proof never needs it.',
      },
      {
        text: `The HCF of $${a}$ and $${b}$ is $${gcd(a, b)}$, and it divides $${r}$.`,
        why: 'That checks one common factor; the proof has to cover every one.',
      },
    ],
  };
}

const eucOrderHcf: Generator<WhyParams> = {
  id: 'euc-order-hcf',
  sample(rng, difficulty) {
    const run = runOf(...pairOf(runAt(rng, difficulty)));
    const d = run[0];
    const base: WhyParams = { d, difficulty, picks: [] };
    return { ...base, picks: pickDistractors(rng, whyProof(base), difficulty) };
  },
  render: (params) => orderSlide(whyProof(params), params.picks),
  solution: (params) => orderSolution(whyProof(params), params.picks),
};

/* ---------- which pair has the same HCF ---------- */

interface SameParams {
  d: Division;
  shown: boolean;
}

/** Pairs a learner might carry on with instead of (b, r), whose HCF is different. */
function samePairSlips({ a, b, q, r }: Division): [number, number][] {
  const h = gcd(a, b);
  const candidates: [number, number][] = [
    [a, r],
    [q, r],
    [b, q],
    [a, q],
    [b, r + 1],
    [b + r, b - r],
  ];
  return candidates.filter(([s, t]) => s > 0 && t > 0 && s !== t && gcd(s, t) !== h);
}

const eucSameHcf: Generator<SameParams> = {
  id: 'euc-same-hcf',
  sample(rng, difficulty) {
    for (;;) {
      const run = runOf(...pairOf(runAt(rng, difficulty)));
      const d = run[0];
      if (samePairSlips(d).length < 3) continue;
      return { d, shown: difficulty < 2 };
    }
  },
  render({ d, shown }) {
    const { a, b, r } = d;
    const pairTex = ([s, t]: [number, number]) => `(${s}, ${t})`;
    return choiceSlide(
      [
        say(
          shown
            ? `$${lineTex(d)}$. Which pair has the same HCF as $${a}$ and $${b}$, so Euclid's algorithm can carry on with it?`
            : `Which pair has the same HCF as $${a}$ and $${b}$, so Euclid's algorithm can carry on with it after one division?`,
        ),
      ],
      pairTex([b, r]),
      samePairSlips(d).slice(0, 3).map(pairTex),
    );
  },
  solution({ d }) {
    const { a, b, q, r } = d;
    return [
      { tex: stackTex(lineTex(d)) },
      {
        text: `Any number dividing $${a}$ and $${b}$ divides $${r} = ${a} - ${times(q, b)}$, and any number dividing $${b}$ and $${r}$ divides $${a}$. So $(${b}, ${r})$ has the same common factors, and the same HCF, $${gcd(a, b)}$.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 2: reading a run
 * ================================================================ */

const eucRemainderTree: Generator<RunParams> = {
  id: 'euc-remainder-tree',
  sample: (rng, difficulty) => runAt(rng, difficulty),
  render(params) {
    const [a, b] = pairOf(params);
    const run = runOf(a, b);
    const answer = run.map(({ r }) => r);
    const slips = run.flatMap(({ b: by, q, r }) => [q, r + by, r + 1]);
    return {
      kind: 'tree',
      prompt: [
        say(
          `The first remainder comes from dividing $${a}$ by $${b}$; each one after that comes from the two numbers above it. Fill in every remainder, down to $0$.`,
        ),
      ],
      expression: `\\text{HCF}(${a}, ${b})`,
      nodes: run.map((_, i) => ({
        id: `r${i + 1}`,
        from: i === 0 ? [] : i === 1 ? ['r1'] : [`r${i - 1}`, `r${i}`],
      })),
      bank: treeBank(answer, slips.filter((value) => !answer.includes(value))),
      answer: answer.map(String),
    };
  },
  solution(params) {
    const run = runOf(...pairOf(params));
    return [
      ...run.map((d, i) => ({
        text: `$${d.a} \\div ${d.b}$ leaves $${d.r}$${i === 0 ? '' : `, dividing the ${i === 1 ? 'second number' : 'remainder two above'} by the one above`}.`,
      })),
      { text: `The remainders run ${run.map(({ r }) => `$${r}$`).join(', ')}, and the HCF is the last one before $0$, $${params.h}$.` },
    ];
  },
};

const eucCount: Generator<RunParams> = {
  id: 'euc-count',
  sample: (rng, difficulty) =>
    difficulty >= 2 ? sampleRun(rng, [4, 5, 6], range(1, 12), 1000) : sampleRun(rng, [3, 4], range(1, 9), 300),
  choices({ qs }) {
    const m = qs.length;
    return intOptions(m, [m - 1, m + 1, m + 2], 1);
  },
  render(params) {
    const [a, b] = pairOf(params);
    return {
      kind: 'expression',
      prompt: [
        say(
          `How many divisions does Euclid's algorithm take for $${a}$ and $${b}$? Count the last one, the one that leaves $0$.`,
        ),
      ],
      lead: '\\text{divisions} =',
      keypad: [],
      answer: String(params.qs.length),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution(params) {
    const run = runOf(...pairOf(params));
    return [
      { tex: runTex(run) },
      { text: `That is $${run.length}$ divisions, and the HCF is $${params.h}$.` },
    ];
  },
};

/* ---------- a run with a slip ---------- */

interface SlipParams extends RunParams {
  at: number;
  delta: number;
}

/** The run with the remainder at line `at` knocked by `delta`, carried on faithfully from there. */
function slipped({ h, qs, at, delta }: SlipParams): Division[] {
  const run = runOf(...buildUp(h, qs));
  const bad = { ...run[at], r: run[at].r + delta };
  return [...run.slice(0, at), bad, ...runOf(bad.b, bad.r)];
}

const eucSlip: Generator<SlipParams> = {
  id: 'euc-slip',
  sample(rng, difficulty) {
    for (;;) {
      const run = runAt(rng, difficulty);
      const m = run.qs.length;
      const at = rng.int(0, m - 3);
      const delta = rng.pick(difficulty >= 2 ? [1, -1, 2, -2, 10, -10] : [1, -1, 10, -10]);
      const line = runOf(...pairOf(run))[at];
      const r = line.r + delta;
      if (r < 1 || r >= line.b) continue;
      const params = { ...run, at, delta };
      const lines = slipped(params);
      if (lines.length < 3 || lines.length > 6) continue;
      if (new Set(lines.map(lineTex)).size !== lines.length) continue;
      return params;
    }
  },
  render(params) {
    const lines = slipped(params);
    const [a, b] = pairOf(params);
    return choiceSlide(
      [
        say(
          `One line of this run for the HCF of $${a}$ and $${b}$ has a slip in it, and every line after it carries on from the slip. Which line is wrong?`,
        ),
        { kind: 'display', tex: runTex(lines) },
      ],
      lineTex(lines[params.at]),
      lines.filter((_, i) => i !== params.at).map(lineTex),
    );
  },
  solution(params) {
    const lines = slipped(params);
    const bad = lines[params.at];
    const right = bad.a - bad.q * bad.b;
    return [
      { text: 'Multiply each line back out and check it:' },
      { tex: stackTex(`${times(bad.q, bad.b)} + ${bad.r} = ${bad.q * bad.b + bad.r}`) },
      {
        text: `That is not $${bad.a}$: the remainder should be $${bad.a} - ${bad.q * bad.b} = ${right}$. Every line after it divides the wrong numbers, so the HCF it ends on is not to be trusted.`,
      },
    ];
  },
};

/* ---------- reading the end of a run ---------- */

const STOP = {
  right: 'At the first remainder of $0$',
  one: 'At the first quotient of $1$',
  three: 'After three divisions, always',
};
const COPRIME = {
  yes: 'Coprime: their only common factor is $1$',
  no: 'Not coprime: they share a factor bigger than $1$',
};

const eucReadFlow: Generator<RunParams> = {
  id: 'euc-read-flow',
  sample: (rng, difficulty) =>
    difficulty >= 2
      ? sampleRun(rng, [4, 5], [1, 1, 1, ...range(2, 12)], 1000)
      : sampleRun(rng, [3], [1, 1, ...range(2, 9)], 300),
  render(params) {
    const [a, b] = pairOf(params);
    const run = runOf(a, b);
    const { h } = params;
    const last = run[run.length - 1];
    const above = run[run.length - 2];
    const values = [...new Set([h, last.q, above.a, above.q, h === 1 ? 2 : 1])].slice(0, 4).map((v) => `$${v}$`);
    return {
      kind: 'flow',
      prompt: [say(`Euclid's algorithm for $${a}$ and $${b}$ ran like this. Each answer chooses what gets asked next.`)],
      subject: runTex(run),
      steps: [
        {
          id: 'stop',
          ask: 'Where does the run stop?',
          branches: [STOP.right, STOP.one, STOP.three].map((label) => ({ label, to: 'hcf' })),
        },
        {
          id: 'hcf',
          ask: 'So the HCF is',
          branches: turned(values, `${a}|${b}`).map((label) => ({ label, to: 'coprime' })),
        },
        {
          id: 'coprime',
          ask: `So $${a}$ and $${b}$ are`,
          branches: [
            { label: COPRIME.yes, outcome: h === 1 ? 'That is the answer.' : `They share $${h}$.` },
            { label: COPRIME.no, outcome: h === 1 ? 'Their HCF is $1$.' : 'That is the answer.' },
          ],
        },
      ],
      answer: [STOP.right, `$${h}$`, h === 1 ? COPRIME.yes : COPRIME.no],
    };
  },
  solution({ h }) {
    return [
      { text: 'The run stops at the first remainder of $0$, and the HCF is the remainder just before it, which is also the last divisor.' },
      {
        text:
          h === 1
            ? 'Here that is $1$, so the two numbers share no factor but $1$: they are coprime.'
            : `Here that is $${h}$, so both numbers are multiples of $${h}$ and are not coprime.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 3: backwards
 * ================================================================ */

interface RearrangeParams {
  d: Division;
}

const eucRearrange: Generator<RearrangeParams> = {
  id: 'euc-rearrange',
  sample(rng, difficulty) {
    for (;;) {
      const run = runOf(...pairOf(runAt(rng, difficulty)));
      // Not the last line, whose remainder is 0, nor one too small to leave
      // room for slips; at difficulty 2, a line from the middle of the run.
      const lines = run.slice(difficulty >= 2 ? 1 : 0, -1).filter(({ b, r }) => b >= 8 && r >= 2);
      if (lines.length > 0) return { d: rng.pick(lines) };
    }
  },
  render({ d }) {
    const { a, b, q, r } = d;
    const answer = [String(r), String(a), String(q)];
    // A tile that would make a second true line, such as r + b = a - (q - 1)b,
    // is left out: the tiles are graded by the one line they name.
    const chosen: number[] = [];
    const another = (values: number[]) =>
      values.some((x, i) =>
        values.some((y, j) =>
          values.some((z, k) => i !== j && j !== k && i !== k && x === y - z * b && !(x === r && y === a && z === q)),
        ),
      );
    for (const value of [q + 1, q - 1, a - b, r + b, b, a + b, r + 1, q + 2, a + 1, a - 1, r + 2, q + 3, a + 2]) {
      if (chosen.length >= 4 || value <= 0 || [r, a, q, ...chosen].includes(value)) continue;
      if (another([r, a, q, ...chosen, value])) continue;
      chosen.push(value);
    }
    return {
      kind: 'tiles',
      prompt: [say(`Rearrange $${lineTex(d)}$ to give the remainder, as the first step of working backwards.`)],
      template: `{0} = {1} - {2} \\times ${b}`,
      bank: fillBank(answer, chosen.map(String), 2),
      answer,
    };
  },
  solution({ d }) {
    const { a, b, q, r } = d;
    return [
      { text: `Take $${q} \\times ${b}$ from both sides:` },
      { tex: stackTex(`${r} = ${a} - ${q} \\times ${b}`) },
    ];
  },
};

/* ---------- the extended table ---------- */

interface TableRow {
  q?: number;
  r: number;
  x: number;
  y: number;
}

/** Each remainder as xa + yb: every row is the one two up, less q times the one above. */
function extendedRows(a: number, b: number): TableRow[] {
  const rows: TableRow[] = [
    { r: a, x: 1, y: 0 },
    { r: b, x: 0, y: 1 },
  ];
  for (const { q, r } of runOf(a, b).slice(0, -1)) {
    const [two, one] = rows.slice(-2);
    rows.push({ q, r, x: two.x - q * one.x, y: two.y - q * one.y });
  }
  return rows;
}

const eucBackTable: Generator<RunParams> = {
  id: 'euc-back-table',
  sample: (rng, difficulty) =>
    difficulty >= 2 ? sampleRun(rng, [4], range(1, 16), 1000) : sampleRun(rng, [3], range(1, 12), 300),
  render(params) {
    const [a, b] = pairOf(params);
    const rows = extendedRows(a, b);
    const answer = rows.slice(2).flatMap(({ x, y }) => [x, y]);
    const slips = rows.slice(2).flatMap((row, i) => {
      const [two, one] = [rows[i], rows[i + 1]];
      return [-row.x, -row.y, two.x + row.q! * one.x, two.y + row.q! * one.y];
    });
    return {
      kind: 'table',
      prompt: [
        say(`Every number in the $r$ column is $${a}x + ${b}y$. Each new row is the row two above it, take $q$ times the row above.`),
        say('Fill in $x$ and $y$.'),
      ],
      columns: ['q', 'r', 'x', 'y'],
      rows: rows.map((row, i) => (i < 2 ? ['', String(row.r), String(row.x), String(row.y)] : [String(row.q), String(row.r), null, null])),
      bank: treeBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution(params) {
    const [a, b] = pairOf(params);
    const rows = extendedRows(a, b);
    const last = rows[rows.length - 1];
    return [
      ...rows.slice(2).map((row, i) => {
        const [two, one] = [rows[i], rows[i + 1]];
        return {
          text: `$${row.r}$: $x = ${two.x} - ${row.q} \\times ${one.x < 0 ? `(${one.x})` : one.x} = ${row.x}$ and $y = ${two.y} - ${row.q} \\times ${one.y < 0 ? `(${one.y})` : one.y} = ${row.y}$.`,
        };
      }),
      { text: `The last row is the HCF: $${last.r} = ${comboTex(last.x, a, last.y, b)}$.` },
    ];
  },
};

/* ---------- back-substitution, as a proof to order ---------- */

interface BackParams {
  run: RunParams;
  picks: number[];
}

function backProof({ run: params }: BackParams): Proof {
  const [a, b] = pairOf(params);
  const { h } = params;
  const run = runOf(a, b);
  const lines = backLines(run);
  const top = run.length - 2;
  const start = run[top];
  const steps = [
    `From $${lineTex(start)}$: $${h} = ${comboTex(1, start.a, -start.q, start.b)}$.`,
    ...lines.slice(1).map((line, k) => {
      const d = run[top - 1 - k];
      return `Put in $${rearrangedTex(d)}$: $${h} = ${comboTex(line.u, line.P, line.v, line.Q)}$.`;
    }),
  ];
  const { u: x, v: y } = lines[lines.length - 1];
  steps.push(`So $${h} = ${a}x + ${b}y$ with $x = ${x}$ and $y = ${y}$.`);
  // The first substitution with the bracket's second sign left alone.
  const first = lines[1];
  const d = run[top - 1];
  const wrong = { ...first, v: -first.v };
  const final = run[run.length - 1];
  return {
    claim: `The HCF of $${a}$ and $${b}$ is $${h}$. Work Euclid's algorithm backwards to write $${h} = ${a}x + ${b}y$.`,
    steps,
    pool: [
      {
        text: `From $${lineTex(start)}$: $${h} = ${start.a} + ${times(start.q, start.b)}$.`,
        why: `Taking $${times(start.q, start.b)}$ from both sides leaves $${h} = ${comboTex(1, start.a, -start.q, start.b)}$.`,
      },
      {
        text: `Put in $${rearrangedTex(d)}$: $${h} = ${comboTex(wrong.u, wrong.P, wrong.v, wrong.Q)}$.`,
        why: `The bracket is taken away, so both its terms change sign; this line does not come to $${h}$.`,
      },
      {
        text: `From $${lineTex(final)}$: $${h} = ${final.a} \\div ${final.q}$.`,
        why: 'That last division leaves $0$. The working starts from the line above it, whose remainder is the HCF.',
      },
    ],
  };
}

const eucBackOrder: Generator<BackParams> = {
  id: 'euc-back-order',
  sample(rng, difficulty) {
    // Three substitutions' worth of lines at difficulty 2, two at 1.
    const run = difficulty >= 2 ? sampleRun(rng, [5], range(1, 12), 1000) : sampleRun(rng, [4], range(1, 8), 400);
    const base: BackParams = { run, picks: [] };
    return { ...base, picks: pickDistractors(rng, backProof(base), difficulty) };
  },
  render: (params) => orderSlide(backProof(params), params.picks),
  solution: (params) => orderSolution(backProof(params), params.picks),
};

/* ---------- one unknown from the other ---------- */

interface FindParams extends RunParams {
  want: 'x' | 'y';
}

/** Every product ax and by under 1000, so the working stays in range. */
const smallProducts = (params: RunParams) => {
  const [a, b] = pairOf(params);
  const [x, y] = bezout(a, b);
  return Math.abs(a * x) < 1000 && Math.abs(b * y) < 1000;
};

const eucFindY: Generator<FindParams> = {
  id: 'euc-find-y',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    const run = hard
      ? sampleRun(rng, [4, 5], range(1, 12), 1000, smallProducts)
      : sampleRun(rng, [3], range(1, 9), 300, smallProducts);
    return { ...run, want: hard ? rng.pick(['x', 'y'] as const) : 'y' };
  },
  render(params) {
    const [a, b] = pairOf(params);
    const [x, y] = bezout(a, b);
    const other = params.want === 'y' ? `x = ${x}` : `y = ${y}`;
    return {
      kind: 'expression',
      prompt: [
        say(`Working Euclid's algorithm backwards gave a solution of $${a}x + ${b}y = ${params.h}$ with $${other}$.`),
        say(`Find $${params.want}$.`),
      ],
      lead: `${params.want} =`,
      keypad: [],
      answer: String(params.want === 'y' ? y : x),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution(params) {
    const [a, b] = pairOf(params);
    const [x, y] = bezout(a, b);
    const { h } = params;
    if (params.want === 'y') {
      return [
        { tex: stackTex(`${a} \\times ${x < 0 ? `(${x})` : x} = ${a * x}`) },
        { tex: stackTex(`${b}y = ${h} - ${a * x < 0 ? `(${a * x})` : a * x} = ${b * y}`) },
        { tex: stackTex(`y = ${b * y} \\div ${b} = ${y}`) },
      ];
    }
    return [
      { tex: stackTex(`${b} \\times ${y < 0 ? `(${y})` : y} = ${b * y}`) },
      { tex: stackTex(`${a}x = ${h} - ${b * y < 0 ? `(${b * y})` : b * y} = ${a * x}`) },
      { tex: stackTex(`x = ${a * x} \\div ${a} = ${x}`) },
    ];
  },
};

/* ---------- checking a backwards line ---------- */

/** kn as a node: the number alone when k is 1. */
const termExpr = (k: number, n: number): Expr => (k === 1 ? num(n) : bin('*', num(k), num(n)));

function checkExpr(params: RunParams): Expr {
  const [a, b] = pairOf(params);
  const [x, y] = bezout(a, b);
  return x > 0 ? bin('-', termExpr(x, a), termExpr(-y, b)) : bin('-', termExpr(y, b), termExpr(-x, a));
}

function checkBanks(expr: Expr): Record<string, string[]> {
  const banks: Record<string, string[]> = {};
  const walk = (node: Expr, path: string) => {
    if (node.kind !== 'binary') return;
    const [l, r] = [valueOf(node.left), valueOf(node.right)];
    banks[path] =
      node.op === '*' ? numBank(l * r, [l * (r + 1), (l + 1) * r, l * r + 10, l + r]) : numBank(l - r, [l + r, l - r + 10, r - l]);
    walk(node.left, `${path}.l`);
    walk(node.right, `${path}.r`);
  };
  walk(expr, 'r');
  return banks;
}

const eucCheckReduce: Generator<RunParams> = {
  id: 'euc-check-reduce',
  sample: (rng, difficulty) =>
    difficulty >= 2
      ? sampleRun(rng, [4], range(1, 9), 1000, smallProducts)
      : sampleRun(rng, [3], range(1, 9), 300, smallProducts),
  choices(params) {
    const expr = checkExpr(params);
    if (expr.kind !== 'binary') throw new Error('euc-check-reduce: not a difference');
    const [l, r] = [valueOf(expr.left), valueOf(expr.right)];
    return intOptions(params.h, [l + r > 999 ? params.h + 10 : l + r, params.h + 10, params.h * 2], 0);
  },
  render(params) {
    const [a, b] = pairOf(params);
    const expr = checkExpr(params);
    return {
      kind: 'reduce',
      prompt: [
        say(
          `Working Euclid's algorithm backwards for $${a}$ and $${b}$ gave the line below, which should come to their HCF. Tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      expr,
      banks: checkBanks(expr),
    };
  },
  solution(params) {
    const [a, b] = pairOf(params);
    const [x, y] = bezout(a, b);
    return [
      { text: 'Both products first, then the difference:' },
      { tex: stackTex(`${comboTex(x, a, y, b)} = ${Math.max(a * x, b * y)} - ${Math.abs(Math.min(a * x, b * y))} = ${params.h}`) },
      { text: `That is the HCF of $${a}$ and $${b}$, so the backwards run checks out.` },
    ];
  },
};

/* ================================================================
 * Lesson 4: ax + by = c
 * ================================================================ */

interface SolvableParams {
  pairs: [number, number][];
  cs: number[];
}

/** An equation's TeX. */
const eqTex = (a: number, b: number, c: number) => `${a}x + ${b}y = ${c}`;

const eucSolvable: Generator<SolvableParams> = {
  id: 'euc-solvable',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      // One pair, four right-hand sides: only one a multiple of the HCF.
      for (;;) {
        const h = rng.int(2, 9);
        const [m, n] = [rng.int(2, 12), rng.int(2, 12)];
        if (m === n || gcd(m, n) !== 1) continue;
        const [a, b] = [h * m, h * n];
        if (a >= 100 || b >= 100) continue;
        const good = h * rng.int(2, Math.floor(99 / h));
        const bad = rng.sample(range(10, 99).filter((c) => c % h !== 0 && c !== good), 3);
        return { pairs: [[a, b]], cs: [good, ...bad] };
      }
    }
    // One right-hand side, four pairs: only one with an HCF dividing it.
    for (;;) {
      const c = rng.int(20, 99);
      const pairs: [number, number][] = [];
      let solvable = 0;
      for (let tries = 0; tries < 200 && pairs.length < 4; tries += 1) {
        const h = rng.int(2, 12);
        const [m, n] = [rng.int(2, 9), rng.int(2, 9)];
        if (m === n || gcd(m, n) !== 1 || h * m >= 100 || h * n >= 100) continue;
        const fits = c % h === 0;
        if (fits && solvable === 1) continue;
        if (pairs.some(([s, t]) => s === h * m && t === h * n)) continue;
        if (fits) solvable += 1;
        pairs.push([h * m, h * n]);
      }
      if (pairs.length === 4 && solvable === 1) return { pairs, cs: [c] };
    }
  },
  render({ pairs, cs }) {
    const eqs =
      pairs.length === 1 ? cs.map((c) => eqTex(pairs[0][0], pairs[0][1], c)) : pairs.map(([a, b]) => eqTex(a, b, cs[0]));
    const solvable = (i: number) =>
      pairs.length === 1 ? cs[i] % gcd(...pairs[0]) === 0 : cs[0] % gcd(...pairs[i]) === 0;
    const right = eqs.findIndex((_, i) => solvable(i));
    return choiceSlide(
      [say('Which of these equations has whole-number solutions for $x$ and $y$?')],
      eqs[right],
      eqs.filter((_, i) => i !== right),
    );
  },
  solution({ pairs, cs }) {
    if (pairs.length === 1) {
      const [a, b] = pairs[0];
      const h = gcd(a, b);
      return [
        { text: `$${a}x + ${b}y$ is always a multiple of the HCF, $${h}$, so the right side has to be one too.` },
        { text: `Of ${cs.map((c) => `$${c}$`).join(', ')}, only $${cs.find((c) => c % h === 0)}$ is a multiple of $${h}$.` },
      ];
    }
    return [
      { text: 'The left side is always a multiple of the HCF of its two numbers, so that HCF has to divide the right side.' },
      ...pairs.map(([a, b]) => {
        const h = gcd(a, b);
        return { text: `HCF$(${a}, ${b}) = ${h}$, which ${cs[0] % h === 0 ? 'divides' : 'does not divide'} $${cs[0]}$.` };
      }),
    ];
  },
};

interface FlowParams {
  a: number;
  b: number;
  c: number;
}

const SOLVABLE = {
  yes: 'Yes, so there are whole-number solutions',
  no: 'No, so there are no whole-number solutions',
};

const eucSolvableFlow: Generator<FlowParams> = {
  id: 'euc-solvable-flow',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const { h, qs } = hard ? sampleRun(rng, [3, 4], range(2, 15), 400) : sampleRun(rng, [2, 3], range(2, 9), 120);
      const [a, b] = buildUp(h, qs);
      const k = rng.int(2, 9);
      const c = rng.chance(0.5) ? h * k : h * k + rng.int(1, h - 1);
      if (c >= 1000) continue;
      return { a, b, c };
    }
  },
  render({ a, b, c }) {
    const h = gcd(a, b);
    const values = [...new Set([h, h * 2, Math.min(a, b), h === 1 ? 2 : 1, a - b])]
      .filter((v) => v > 0)
      .slice(0, 4)
      .map((v) => `$${v}$`);
    const ways = [`$${c} \\div ${h}$`, `$${c} \\times ${h}$`, `$${c} - ${h}$`];
    return {
      kind: 'flow',
      prompt: [say(`Does $${eqTex(a, b, c)}$ have whole-number solutions? Each answer chooses what gets asked next.`)],
      subject: eqTex(a, b, c),
      steps: [
        {
          id: 'hcf',
          ask: `First, the HCF of $${a}$ and $${b}$ is`,
          branches: turned(values, `${a}|${b}|${c}`).map((label) => ({ label, to: 'divides' })),
        },
        {
          id: 'divides',
          ask: `Does it divide $${c}$?`,
          branches: [
            { label: SOLVABLE.yes, to: 'scale' },
            { label: SOLVABLE.no, outcome: c % h === 0 ? `It does: $${c} = ${c / h} \\times ${h}$.` : 'That is the answer.' },
          ],
        },
        {
          id: 'scale',
          ask: 'To find one, multiply the backwards line for the HCF by',
          branches: turned(ways, `${c}|${h}`).map((label) => ({
            label,
            outcome: label === ways[0] ? 'That is the answer.' : 'That does not turn the HCF into the right side.',
          })),
        },
      ],
      answer: c % h === 0 ? [`$${h}$`, SOLVABLE.yes, ways[0]] : [`$${h}$`, SOLVABLE.no],
    };
  },
  solution({ a, b, c }) {
    const h = gcd(a, b);
    return [
      { tex: runTex(runOf(Math.max(a, b), Math.min(a, b))) },
      { text: `So the HCF is $${h}$, and $${a}x + ${b}y$ is always a multiple of it.` },
      {
        text:
          c % h === 0
            ? `$${c} = ${c / h} \\times ${h}$, so there are solutions: write $${h} = ${a}x + ${b}y$ from the backwards run, then multiply it by $${c / h}$.`
            : `$${c}$ is not a multiple of $${h}$, so no whole numbers $x$ and $y$ can make it.`,
      },
    ];
  },
};

/* ---------- scaling the backwards run ---------- */

interface ScaleParams extends RunParams {
  k: number;
  line: boolean;
}

function scaled(params: ScaleParams) {
  const [a, b] = pairOf(params);
  const [x, y] = bezout(a, b);
  return { a, b, x, y, c: params.h * params.k, X: x * params.k, Y: y * params.k };
}

const eucScale: Generator<ScaleParams> = {
  id: 'euc-scale',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const run = hard ? sampleRun(rng, [3, 4], range(1, 9), 500) : sampleRun(rng, [3], range(1, 6), 200);
      const k = rng.int(2, hard ? 9 : 5);
      const params = { ...run, k, line: hard };
      const { a, b, X, Y, c } = scaled(params);
      if (c >= 1000 || Math.abs(X) >= 100 || Math.abs(Y) >= 100) continue;
      if (otherSolution([X, Y], [X, Y], a, b, c)) continue;
      return params;
    }
  },
  render(params) {
    const { a, b, x, y, c, X, Y } = scaled(params);
    const { h } = params;
    const answer = [String(X), String(Y)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          params.line
            ? `Working Euclid's algorithm backwards gave $${h} = ${comboTex(x, a, y, b)}$.`
            : `Working Euclid's algorithm backwards gave $${eqTex(a, b, h)}$ with $x = ${x}$ and $y = ${y}$.`,
        ),
        say(`Scale it to find a solution of $${eqTex(a, b, c)}$.`),
      ],
      template: 'x = {0},\\quad y = {1}',
      bank: soleBank(answer, [X, Y], a, b, c, [x, y, -X, -Y, Y, X + params.k, y * c, X + b, Y - a]),
      answer,
    };
  },
  solution(params) {
    const { a, b, x, y, c, X, Y } = scaled(params);
    const { h, k } = params;
    return [
      { text: `$${c} = ${k} \\times ${h}$, so multiply the whole line by $${k}$:` },
      { tex: stackTex(`${a} \\times ${x < 0 ? `(${X})` : X} + ${b} \\times ${y < 0 ? `(${Y})` : Y} = ${c}`) },
      { text: `So $x = ${X}$ and $y = ${Y}$ is one solution.` },
    ];
  },
};

/* ---------- a story with one answer ---------- */

interface Story {
  text: (a: number, b: number, c: number) => string;
  lead: string;
}

const STORIES: Story[] = [
  {
    text: (a, b, c) =>
      `A post office has only $${a}$p and $${b}$p stamps. A parcel needs exactly $${c}$p, with at least one of each stamp on it. How many $${a}$p stamps go on it?`,
    lead: '\\text{stamps} =',
  },
  {
    text: (a, b, c) =>
      `A machine takes only $${a}$p and $${b}$p coins and gives no change. To pay exactly $${c}$p with at least one of each coin, how many $${a}$p coins go in?`,
    lead: '\\text{coins} =',
  },
  {
    text: (a, b, c) =>
      `Eggs come in full boxes of $${a}$ and full boxes of $${b}$. An order for exactly $${c}$ eggs uses both sizes. How many boxes of $${a}$ does it use?`,
    lead: '\\text{boxes} =',
  },
];

interface StoryParams {
  a: number;
  b: number;
  x: number;
  y: number;
  story: number;
}

/** Every (x, y) with both parts positive and ax + by = c. */
function positiveSolutions(a: number, b: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  for (let x = 1; a * x < c; x += 1) {
    const rest = c - a * x;
    if (rest % b === 0) out.push([x, rest / b]);
  }
  return out;
}

const eucStamps: Generator<StoryParams> = {
  id: 'euc-stamps',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const a = hard ? rng.int(7, 30) : rng.int(3, 11);
      const b = hard ? rng.int(7, 30) : rng.int(3, 11);
      if (a === b || (!hard && gcd(a, b) !== 1)) continue;
      const x = rng.int(1, hard ? 12 : 6);
      const y = rng.int(1, hard ? 12 : 6);
      const c = a * x + b * y;
      if (c >= (hard ? 1000 : 100) || positiveSolutions(a, b, c).length !== 1) continue;
      // A story someone could solve by eye is no test of the method.
      if (hard ? c < 100 : c < 30) continue;
      return { a, b, x, y, story: rng.int(0, STORIES.length - 1) };
    }
  },
  render({ a, b, x, y, story }) {
    const c = a * x + b * y;
    return {
      kind: 'expression',
      prompt: [say(STORIES[story].text(a, b, c))],
      lead: STORIES[story].lead,
      keypad: [],
      answer: String(x),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution({ a, b, x, y }) {
    const c = a * x + b * y;
    const h = gcd(a, b);
    return [
      { text: `It is $${eqTex(a, b, c)}$ with $x$ and $y$ both at least $1$.` },
      {
        text: `Try $x = 1, 2, 3, \\dots$ until $${c} - ${a}x$ is a multiple of $${b}$: at $x = ${x}$, $${c} - ${a * x} = ${b * y} = ${b} \\times ${y}$.`,
      },
      {
        text: `Every other solution moves $x$ by $${b / h}$ and $y$ by $${a / h}$ the other way, which makes one of them $0$ or less, so $x = ${x}$ is the only answer.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 5: all the solutions
 * ================================================================ */

interface FamilyParams {
  h: number;
  m: number;
  n: number;
  x0: number;
  y0: number;
}

/** a = hm, b = hn, and one solution (x0, y0) of ax + by = c. */
function family({ h, m, n, x0, y0 }: FamilyParams) {
  const [a, b] = [h * m, h * n];
  return { a, b, c: a * x0 + b * y0 };
}

function sampleFamily(rng: Rng, difficulty: number, accept: (params: FamilyParams) => boolean = () => true): FamilyParams {
  const hard = difficulty >= 2;
  for (;;) {
    const h = hard ? rng.int(2, 6) : 1;
    const m = rng.int(3, hard ? 12 : 15);
    const n = rng.int(3, hard ? 12 : 15);
    if (m === n || gcd(m, n) !== 1) continue;
    const x0 = rng.int(-9, 9);
    const y0 = rng.int(-9, 9);
    if (x0 === 0 || y0 === 0) continue;
    const params = { h, m, n, x0, y0 };
    const { a, b, c } = family(params);
    // a(b/h), the amount one step moves the left side by, is quoted too.
    if (a >= 100 || b >= 100 || c <= 0 || c >= 1000 || a * n >= 1000) continue;
    if (accept(params)) return params;
  }
}

const eucGeneral: Generator<FamilyParams> = {
  id: 'euc-general',
  sample: (rng, difficulty) =>
    sampleFamily(rng, difficulty, (params) => {
      const { a, b, c } = family(params);
      const { m, n, x0, y0 } = params;
      return !otherSolution([x0, n, y0, m], [x0, y0], a, b, c);
    }),
  render(params) {
    const { a, b, c } = family(params);
    const { m, n, x0, y0 } = params;
    const answer = [String(x0), String(n), String(y0), String(m)];
    return {
      kind: 'tiles',
      prompt: [
        say(`One solution of $${eqTex(a, b, c)}$ is $x = ${x0}$, $y = ${y0}$.`),
        say('Write every whole-number solution, with $t$ any whole number.'),
      ],
      template: 'x = {0} + {1}t,\\quad y = {2} - {3}t',
      bank: soleBank(answer, [x0, y0], a, b, c, [b, a, -x0, -y0, x0 + n, y0 + m, m + n]),
      answer,
    };
  },
  solution(params) {
    const { a, b, c } = family(params);
    const { h, m, n, x0, y0 } = params;
    return [
      {
        text: `Adding $${n}$ to $x$ adds $${a} \\times ${n} = ${a * n}$, and taking $${m}$ from $y$ takes off $${b} \\times ${m} = ${b * m}$: the same, so $${c}$ is unchanged.`,
      },
      ...(h > 1 ? [{ text: `The steps are $${b} \\div ${h}$ and $${a} \\div ${h}$, the smallest that balance, so no solution is missed.` }] : []),
      { tex: stackTex(`x = ${x0} + ${n}t,\\quad y = ${y0} - ${m}t`) },
    ];
  },
};

const eucListTable: Generator<FamilyParams & { from: number }> = {
  id: 'euc-list-table',
  sample(rng, difficulty) {
    const from = difficulty >= 2 ? rng.int(-2, -1) : 0;
    const params = sampleFamily(rng, difficulty, ({ h, m, n, x0, y0 }) => {
      const ts = range(from, from + 3);
      return ts.every((t) => Math.abs(x0 + n * t) < 100 && Math.abs(y0 - m * t) < 100) && h * n < 100;
    });
    return { ...params, from };
  },
  render(params) {
    const { a, b, c } = family(params);
    const { m, n, x0, y0, from } = params;
    const ts = range(from, from + 3);
    const answer = ts.filter((t) => t !== 0).flatMap((t) => [x0 + n * t, y0 - m * t]);
    const slips = ts.filter((t) => t !== 0).flatMap((t) => [x0 + m * t, y0 - n * t, y0 + m * t, x0 - n * t]);
    return {
      kind: 'table',
      prompt: [
        say(`$x = ${x0}$, $y = ${y0}$ solves $${eqTex(a, b, c)}$, and every solution is $x = ${x0} + ${n}t$, $y = ${y0} - ${m}t$.`),
        say('Fill in the solutions for these values of $t$.'),
      ],
      columns: ['t', 'x', 'y'],
      rows: ts.map((t) => (t === 0 ? [String(t), String(x0), String(y0)] : [String(t), null, null])),
      bank: treeBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution(params) {
    const { a, b } = family(params);
    const { m, n, x0, y0, from } = params;
    return [
      { text: `Each step of $t$ adds $${n}$ to $x$ and takes $${m}$ from $y$.` },
      ...range(from, from + 3)
        .filter((t) => t !== 0)
        .map((t) => ({ text: `$t = ${t}$: $x = ${x0 + n * t}$, $y = ${y0 - m * t}$, and $${a} \\times ${x0 + n * t < 0 ? `(${x0 + n * t})` : x0 + n * t} + ${b} \\times ${y0 - m * t < 0 ? `(${y0 - m * t})` : y0 - m * t}$ is still the right side.` })),
    ];
  },
};

/** The smallest positive x in any solution: x0 moved by steps of n. */
const smallestX = ({ n, x0 }: FamilyParams) => mod(x0, n) || n;

const eucSmallest: Generator<FamilyParams> = {
  id: 'euc-smallest',
  sample: (rng, difficulty) =>
    sampleFamily(rng, difficulty, (params) => params.x0 !== smallestX(params) && params.n >= 4),
  render(params) {
    const { a, b, c } = family(params);
    const { x0, y0 } = params;
    return {
      kind: 'expression',
      prompt: [
        say(`One solution of $${eqTex(a, b, c)}$ is $x = ${x0}$, $y = ${y0}$.`),
        say('What is the smallest positive whole number $x$ in any whole-number solution?'),
      ],
      lead: 'x =',
      keypad: [],
      answer: String(smallestX(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution(params) {
    const { a, b } = family(params);
    const { h, n, m, x0, y0 } = params;
    const best = smallestX(params);
    const t = (best - x0) / n;
    return [
      { text: `Solutions move $x$ in steps of $${h > 1 ? `${b} \\div ${h} = ` : ''}${n}$ and $y$ in steps of $${h > 1 ? `${a} \\div ${h} = ` : ''}${m}$.` },
      { text: `${t > 0 ? 'Add' : 'Take'} $${n}$ ${t > 0 ? 'to' : 'from'} $${x0}$ ${Math.abs(t) === 1 ? 'once' : `$${Math.abs(t)}$ times`}: $x = ${best}$, $y = ${y0 - m * t}$.` },
      { text: `One more step down would make $x = ${best - n}$, which is not positive.` },
    ];
  },
};

interface CountParams {
  h: number;
  m: number;
  n: number;
  x0: number;
  y0: number;
  hint: boolean;
}

/** Solutions with both parts positive, counted from the one with the smallest positive x. */
const positiveCount = ({ m, y0 }: CountParams) => Math.floor((y0 - 1) / m) + 1;

const eucCountPositive: Generator<CountParams> = {
  id: 'euc-count-positive',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const h = hard ? rng.int(1, 4) : 1;
      const m = rng.int(2, 9);
      const n = rng.int(2, 9);
      if (m === n || gcd(m, n) !== 1) continue;
      const count = rng.int(1, hard ? 5 : 3);
      // x0 is the smallest positive x, y0 the y beside it.
      const x0 = rng.int(1, n);
      const y0 = m * (count - 1) + rng.int(1, m);
      const c = h * (m * x0 + n * y0);
      if (c >= 1000) continue;
      return { h, m, n, x0, y0, hint: !hard };
    }
  },
  choices(params) {
    const count = positiveCount(params);
    return intOptions(count, [count + 1, count - 1, count + 2], 0);
  },
  render(params) {
    const { h, m, n, x0, y0, hint } = params;
    const [a, b] = [h * m, h * n];
    const c = a * x0 + b * y0;
    // The hint is a solution off to one side, so it still takes stepping.
    const [hx, hy] = [x0 - n, y0 + m];
    return {
      kind: 'expression',
      prompt: [
        say(
          hint
            ? `One solution of $${eqTex(a, b, c)}$ is $x = ${hx}$, $y = ${hy}$. How many solutions have $x$ and $y$ both positive whole numbers?`
            : `How many solutions of $${eqTex(a, b, c)}$ have $x$ and $y$ both positive whole numbers?`,
        ),
      ],
      lead: '\\text{solutions} =',
      keypad: [],
      answer: String(positiveCount(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution(params) {
    const { h, m, n, x0, y0 } = params;
    const [a, b] = [h * m, h * n];
    const count = positiveCount(params);
    const list = range(0, count - 1).map((t) => `(${x0 + n * t}, ${y0 - m * t})`);
    return [
      { text: `The smallest positive $x$ is $${x0}$, with $y = ${y0}$. Each step adds $${n}$ to $x$ and takes $${m}$ from $y$${h > 1 ? `, since $${b} \\div ${h} = ${n}$ and $${a} \\div ${h} = ${m}$` : ''}.` },
      { text: `$y$ stays positive for ${count === 1 ? 'that one only' : `$${count}$ of them`}: ${list.map((p) => `$${p}$`).join(', ')}.` },
      { text: `The next would have $y = ${y0 - m * count}$, which is not positive.` },
    ];
  },
};

/* ---------- which pair is another solution ---------- */

const eucAnother: Generator<FamilyParams> = {
  id: 'euc-another',
  sample: (rng, difficulty) => sampleFamily(rng, difficulty),
  render(params) {
    const { a, b, c } = family(params);
    const { h, m, n, x0, y0 } = params;
    const pairTex = (x: number, y: number) => `x = ${x},\\ y = ${y}`;
    const slips: [number, number][] = [
      [x0 + m, y0 - n],
      [x0 + n, y0 + m],
      [x0 + 1, y0 - 1],
      [x0 - n, y0 - m],
      [x0 + b, y0 + a],
      [x0 + h, y0 - h],
    ];
    const wrong = slips.filter(([x, y]) => a * x + b * y !== c).map(([x, y]) => pairTex(x, y));
    return choiceSlide(
      [
        say(`$x = ${x0}$, $y = ${y0}$ solves $${eqTex(a, b, c)}$.`),
        say('Which of these is another solution?'),
      ],
      pairTex(x0 + n, y0 - m),
      [...new Set(wrong)].slice(0, 3),
    );
  },
  solution(params) {
    const { a, b, c } = family(params);
    const { h, m, n, x0, y0 } = params;
    return [
      {
        text: `Moving $x$ up by $${n}$${h > 1 ? ` ($${b} \\div ${h}$)` : ''} and $y$ down by $${m}$${h > 1 ? ` ($${a} \\div ${h}$)` : ''} adds $${a * n}$ and takes off $${b * m}$, the same amount.`,
      },
      { tex: stackTex(`${a} \\times ${x0 + n < 0 ? `(${x0 + n})` : x0 + n} + ${b} \\times ${y0 - m < 0 ? `(${y0 - m})` : y0 - m} = ${c}`) },
    ];
  },
};

export const numberEuclidGenerators = [
  eucDivide,
  eucRunTable,
  eucHcf,
  eucOrderHcf,
  eucSameHcf,
  eucRemainderTree,
  eucCount,
  eucSlip,
  eucReadFlow,
  eucRearrange,
  eucBackTable,
  eucBackOrder,
  eucFindY,
  eucCheckReduce,
  eucSolvable,
  eucSolvableFlow,
  eucScale,
  eucStamps,
  eucGeneral,
  eucListTable,
  eucSmallest,
  eucCountPositive,
  eucAnother,
];

/** The order generators, for the reducer harness in `proofOrder.test.ts`. */
export const numberEuclidOrders = [eucOrderHcf, eucBackOrder];

/** The arithmetic behind the slides, for `numberEuclid.test.ts`. */
export const euclidTesting = { runOf, buildUp, backLines, bezout, positiveSolutions, extendedRows };
