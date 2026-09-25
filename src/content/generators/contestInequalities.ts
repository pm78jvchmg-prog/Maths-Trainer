/**
 * Contest Math, level 13: Inequalities.
 *
 * Three lessons. Basic inequalities: dividing by a negative turns the sign
 * round, integers are counted between the two ends (and a square has two
 * roots), a square is never negative, and a range is found from its corners.
 * AM-GM: a fixed product makes the sum least when the two parts are equal, and
 * a fixed sum makes the product greatest the same way. Cauchy-Schwarz: a
 * linear expression on a circle, a sum of squares on a line, and the
 * fractions form (Titu) with a fixed denominator sum.
 *
 * Every answer is exact; the Cauchy-Schwarz least values are fractions typed
 * with the `/` key. Shared helpers are in `contestMath.ts`.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { canonicalSet } from '../numberLine';
import { windowFor } from './numberLine';
import { FRACTION_KEYS, fracAnswer, fracTex, num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ---------- shared pieces ---------- */

type Op = '<' | '<=' | '>' | '>=';

const OP_TEX: Record<Op, string> = { '<': '<', '<=': '\\le', '>': '>', '>=': '\\ge' };
const FLIP: Record<Op, Op> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };

/** A polynomial's terms written the way a learner reads them: `x^2 - 8x + 21`. */
function termsTex(terms: [number, string][]): string {
  let out = '';
  for (const [coef, name] of terms) {
    if (coef === 0) continue;
    const size = Math.abs(coef);
    const body = name === '' ? `${size}` : `${size === 1 ? '' : size}${name}`;
    if (out === '') out = coef < 0 ? `-${body}` : body;
    else out += coef < 0 ? ` - ${body}` : ` + ${body}`;
  }
  return out === '' ? '0' : out;
}

/** `3x` or `x`: a positive coefficient in front of a letter. */
const coefTex = (k: number, name: string) => `${k === 1 ? '' : k}${name}`;

/** Fraction options, compared in lowest terms, positive, topped up with neighbours. */
function fractionOptions(top: number, bottom: number, slips: [number, number][]): ChoiceOption[] {
  const key = (p: number, q: number) => fracAnswer(p, q);
  const seen = new Set([key(top, bottom)]);
  const picked: [number, number][] = [];
  const near: [number, number][] = [
    [top + bottom, bottom],
    [2 * top, bottom],
    [top, 2 * bottom],
    [top + 2 * bottom, bottom],
  ];
  for (const [p, q] of [...slips, ...near]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(p) || !Number.isInteger(q) || p <= 0 || q <= 0) continue;
    if (seen.has(key(p, q))) continue;
    seen.add(key(p, q));
    picked.push([p, q]);
  }
  picked.sort((x, y) => x[0] / x[1] - y[0] / y[1]);
  return options(
    { tex: fracTex(top, bottom), answer: fracAnswer(top, bottom) },
    ...picked.map(([p, q]) => ({ tex: fracTex(p, q), answer: fracAnswer(p, q) })),
  );
}

/* ================================================================
 * Lesson 1: Basic Inequalities
 * ================================================================ */

/* ---------- the sign flip, drawn on a number line ---------- */

interface FlipParams {
  /** Difficulty 1: p - mx op nx + q. Difficulty 2: lo lowOp p - mx highOp hi. */
  double: boolean;
  p: number;
  m: number;
  n: number;
  q: number;
  op: Op;
  k1: number;
  k2: number;
  lowOp: '<' | '<=';
  highOp: '<' | '<=';
  min: number;
  max: number;
}

const flipLeft = (p: FlipParams) => `${p.p} - ${coefTex(p.m, 'x')}`;

const cmInFlip: Generator<FlipParams> = {
  id: 'cm-in-flip',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      for (;;) {
        const m = rng.int(2, 5);
        const k1 = rng.int(-5, 2);
        const k2 = k1 + rng.int(2, 6);
        const p = rng.int(1, 20);
        const lowOp = rng.pick<'<' | '<='>(['<', '<=']);
        const highOp = rng.pick<'<' | '<='>(['<', '<=']);
        if (p - m * k1 === 0 || p - m * k2 === 0) continue;
        return { double: true, p, m, n: 0, q: 0, op: '<', k1, k2, lowOp, highOp, ...windowFor(rng, k1, k2, 10, 1) };
      }
    }
    for (;;) {
      const m = rng.int(1, 5);
      const n = rng.int(1, 4);
      const k = rng.int(-5, 5);
      const q = rng.pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const p = q + (m + n) * k;
      if (p < 1 || p > 40) continue;
      const op = rng.pick<Op>(['<', '<=', '>', '>=']);
      return { double: false, p, m, n, q, op, k1: k, k2: k, lowOp: '<', highOp: '<', ...windowFor(rng, k, k, 10, 2) };
    }
  },
  render(p) {
    if (p.double) {
      const lo = p.p - p.m * p.k2;
      const hi = p.p - p.m * p.k1;
      const answer = `${p.highOp === '<=' ? '[' : '('}${p.k1},${p.k2}${p.lowOp === '<=' ? ']' : ')'}`;
      return {
        kind: 'numberLine',
        prompt: [say('Shade every $x$ that satisfies'), show(`${lo} ${OP_TEX[p.lowOp]} ${flipLeft(p)} ${OP_TEX[p.highOp]} ${hi}`)],
        min: p.min,
        max: p.max,
        step: 1,
        answer: canonicalSet(answer) ?? answer,
      };
    }
    const solved = FLIP[p.op];
    const k = p.k1;
    const answer =
      solved === '>' || solved === '>='
        ? `${solved === '>' ? '(' : '['}${k},inf)`
        : `(-inf,${k}${solved === '<' ? ')' : ']'}`;
    return {
      kind: 'numberLine',
      prompt: [say('Solve, then shade the solution set.'), show(`${flipLeft(p)} ${OP_TEX[p.op]} ${termsTex([[p.n, 'x'], [p.q, '']])}`)],
      min: p.min,
      max: p.max,
      step: 1,
      answer: canonicalSet(answer) ?? answer,
    };
  },
  solution(p) {
    if (p.double) {
      const lo = p.p - p.m * p.k2;
      const hi = p.p - p.m * p.k1;
      const low = OP_TEX[p.lowOp];
      const high = OP_TEX[p.highOp];
      return [
        { text: `Take ${p.p} from all three parts:` },
        { tex: `${lo - p.p} ${low} -${coefTex(p.m, 'x')} ${high} ${hi - p.p}` },
        { text: `Divide all three by $-${p.m}$. Dividing by a negative turns both signs round:` },
        { tex: `${p.k2} ${OP_TEX[FLIP[p.lowOp]]} x ${OP_TEX[FLIP[p.highOp]]} ${p.k1}` },
        { text: 'Read from the smaller end:' },
        { tex: `${p.k1} ${high} x ${low} ${p.k2}` },
        {
          text: `So the dot at ${p.k1} is ${p.highOp === '<=' ? 'filled' : 'hollow'}, the dot at ${p.k2} is ${p.lowOp === '<=' ? 'filled' : 'hollow'}, and the stretch between them is shaded.`,
        },
      ];
    }
    const k = p.k1;
    const s = p.m + p.n;
    const solved = FLIP[p.op];
    return [
      { text: `Take ${coefTex(p.n, 'x')} and ${p.p} from both sides:` },
      { tex: `-${coefTex(s, 'x')} ${OP_TEX[p.op]} ${p.q - p.p}` },
      { text: `Divide by $-${s}$. Dividing by a negative turns the sign round:` },
      { tex: `x ${OP_TEX[solved]} ${k}` },
      {
        text: `The dot at ${k} is ${solved === '<' || solved === '>' ? 'hollow' : 'filled'}, and the shading runs ${solved === '>' || solved === '>=' ? 'right' : 'left'}.`,
      },
    ];
  },
};

/* ---------- counting the integers in between ---------- */

interface CountParams {
  squares: boolean;
  /** Linear: L < mx + c < U. */
  m: number;
  c: number;
  lo: number;
  hi: number;
}

const firstAbove = (value: number) => Math.floor(value) + 1;
const lastBelow = (value: number) => Math.ceil(value) - 1;

/** The positive whole numbers whose squares lie strictly between lo and hi. */
function rootsBetween(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let k = 1; k * k < hi; k += 1) if (k * k > lo) out.push(k);
  return out;
}

function integerCount(p: CountParams): number {
  if (p.squares) return 2 * rootsBetween(p.lo, p.hi).length;
  return lastBelow((p.hi - p.c) / p.m) - firstAbove((p.lo - p.c) / p.m) + 1;
}

const cmInCountIntegers: Generator<CountParams> = {
  id: 'cm-in-count-integers',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      for (;;) {
        const lo = rng.int(1, 80);
        const hi = rng.chance(0.4) ? rng.int(5, 22) ** 2 : rng.int(lo + 20, 450);
        if (hi <= lo) continue;
        const roots = rootsBetween(lo, hi);
        if (roots.length < 2 || roots.length > 12) continue;
        return { squares: true, m: 0, c: 0, lo, hi };
      }
    }
    for (;;) {
      const m = rng.int(2, 6);
      const c = rng.pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const lo = rng.int(-20, 10);
      const hi = lo + rng.int(12, 60);
      const p = { squares: false, m, c, lo, hi };
      const count = integerCount(p);
      if (count < 3 || count > 25) continue;
      return p;
    }
  },
  render(p) {
    if (p.squares) {
      return typed([say('How many integers $n$ satisfy this?'), show(`${p.lo} < n^2 < ${p.hi}`)], integerCount(p), '\\text{integers} =');
    }
    return typed(
      [say('How many integers $x$ satisfy this?'), show(`${p.lo} < ${termsTex([[p.m, 'x'], [p.c, '']])} < ${p.hi}`)],
      integerCount(p),
      '\\text{integers} =',
    );
  },
  choices(p) {
    const count = integerCount(p);
    if (p.squares) return numberOptions(count, [count / 2, count + 1, count - 1, count + 2], 1, 1);
    return numberOptions(count, [Math.round((p.hi - p.lo) / p.m), count + 1, count - 1], 1, 1);
  },
  solution(p) {
    const count = integerCount(p);
    if (p.squares) {
      const roots = rootsBetween(p.lo, p.hi);
      const a = roots[0];
      const b = roots[roots.length - 1];
      return [
        { text: `The squares between ${p.lo} and ${p.hi} are those of ${a} up to ${b}:` },
        { tex: `${a}^2 = ${a * a}, \\qquad ${b}^2 = ${b * b}` },
        { text: `That is ${roots.length} positive values of $n$, and each has a negative twin with the same square:` },
        { tex: `2 \\times ${roots.length} = ${count}` },
      ];
    }
    const first = firstAbove((p.lo - p.c) / p.m);
    const last = lastBelow((p.hi - p.c) / p.m);
    return [
      { text: `${p.c > 0 ? 'Take away' : 'Add'} ${Math.abs(p.c)} all along:` },
      { tex: `${p.lo - p.c} < ${p.m}x < ${p.hi - p.c}` },
      { text: `Divide by ${p.m}:` },
      { tex: `${fracTex(p.lo - p.c, p.m)} < x < ${fracTex(p.hi - p.c, p.m)}` },
      { text: `So the integers run from ${first} to ${last}:` },
      { tex: `${last} - ${first < 0 ? `(${first})` : first} + 1 = ${count}` },
    ];
  },
};

/* ---------- a square is never negative ---------- */

interface SquareParams {
  twoVars: boolean;
  a: number;
  b: number;
  c: number;
}

const leastValue = ({ twoVars, a, b, c }: SquareParams) => c - a * a - (twoVars ? b * b : 0);

const squareExpr = (p: SquareParams) =>
  p.twoVars
    ? termsTex([[1, 'x^2'], [1, 'y^2'], [-2 * p.a, 'x'], [-2 * p.b, 'y'], [p.c, '']])
    : termsTex([[1, 'x^2'], [-2 * p.a, 'x'], [p.c, '']]);

const shifted = (name: string, h: number) => `(${name} ${h > 0 ? '-' : '+'} ${Math.abs(h)})^2`;

const NONZERO6 = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];

const cmInSquareMin: Generator<SquareParams> = {
  id: 'cm-in-square-min',
  sample(rng, difficulty) {
    for (;;) {
      const twoVars = difficulty >= 2;
      const a = twoVars ? rng.pick(NONZERO6) : rng.pick([...NONZERO6, -9, -8, -7, 7, 8, 9]);
      const b = twoVars ? rng.pick(NONZERO6) : 0;
      const c = rng.int(-20, 60);
      const p = { twoVars, a, b, c };
      if (c === 0 || leastValue(p) === 0 || leastValue(p) === c) continue;
      return p;
    }
  },
  render(p) {
    return typed(
      [say(`What is the least value of this, for real ${p.twoVars ? '$x$ and $y$' : '$x$'}?`), show(squareExpr(p))],
      leastValue(p),
      '\\text{least} =',
    );
  },
  choices(p) {
    const v = leastValue(p);
    return numberOptions(v, [p.c, v + 2 * p.a * p.a, -(p.a * p.a) - p.b * p.b, v - 1], 1, -Infinity);
  },
  solution(p) {
    const v = leastValue(p);
    const constant = p.twoVars ? `${p.a * p.a} + ${p.b * p.b}` : `${p.a * p.a}`;
    const squares = p.twoVars ? `${shifted('x', p.a)} + ${shifted('y', p.b)}` : shifted('x', p.a);
    return [
      { text: 'Complete the square. The square brings in an extra' },
      { tex: p.twoVars ? `${Math.abs(p.a)}^2 + ${Math.abs(p.b)}^2 = ${p.a * p.a + p.b * p.b}` : `${Math.abs(p.a)}^2 = ${p.a * p.a}` },
      { text: 'so take it off again:' },
      { tex: `${squareExpr(p)} = ${squares} ${v < 0 ? '-' : '+'} ${Math.abs(v)}` },
      { text: `A square is never negative, and it is 0 at ${p.twoVars ? `$x = ${p.a}$, $y = ${p.b}$` : `$x = ${p.a}$`}. So the least value is` },
      { tex: `${p.c} - ${p.twoVars ? `(${constant})` : constant} = ${v}` },
    ];
  },
};

/* ---------- a range from its corners ---------- */

interface BoundsParams {
  product: boolean;
  a: number;
  b: number;
  c: number;
  d: number;
}

function boundsOf({ product, a, b, c, d }: BoundsParams): [number, number] {
  if (!product) return [a - d, b - c];
  const corners = [a * c, a * d, b * c, b * d];
  return [Math.min(...corners), Math.max(...corners)];
}

const cmInBounds: Generator<BoundsParams> = {
  id: 'cm-in-bounds',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const a = rng.int(-8, 2);
        const b = rng.int(a + 2, 8);
        const c = rng.int(-8, 2);
        const d = rng.int(c + 2, 8);
        const p = { product: true, a, b, c, d };
        const [lo, hi] = boundsOf(p);
        if (a >= 0 && c >= 0) continue;
        if (lo === a * c && hi === b * d) continue;
        if (lo === hi || [a, b, c, d].includes(0)) continue;
        return p;
      }
      const a = rng.int(-9, 10);
      const b = rng.int(a + 2, 14);
      const c = rng.int(-9, 10);
      const d = rng.int(c + 2, 14);
      return { product: false, a, b, c, d };
    }
  },
  render(p) {
    const [lo, hi] = boundsOf(p);
    const what = p.product ? 'xy' : 'x - y';
    return {
      kind: 'tiles',
      prompt: [
        say('Real numbers $x$ and $y$ satisfy'),
        show(`${p.a} \\le x \\le ${p.b}, \\qquad ${p.c} \\le y \\le ${p.d}`),
        say(`Fill in the least and greatest values of $${what}$.`),
      ],
      template: `{0} \\le ${what} \\le {1}`,
      bank: numberBank([lo, hi], p.product ? [p.a * p.c, p.b * p.d, p.a * p.b, p.c * p.d] : [p.a - p.c, p.b - p.d, p.a + p.c, p.b + p.d], 3, 1, -Infinity),
      answer: [num(lo), num(hi)],
    };
  },
  solution(p) {
    const [lo, hi] = boundsOf(p);
    if (!p.product) {
      return [
        { text: '$x - y$ is least with $x$ as small as it can be and $y$ as large:' },
        { tex: `${p.a} - ${p.d < 0 ? `(${p.d})` : p.d} = ${lo}` },
        { text: 'and greatest the other way round:' },
        { tex: `${p.b} - ${p.c < 0 ? `(${p.c})` : p.c} = ${hi}` },
      ];
    }
    const br = (v: number) => (v < 0 ? `(${v})` : `${v}`);
    return [
      { text: 'With negatives about, the ends do not simply multiply end to end. Try all four corners:' },
      { tex: `${br(p.a)} \\times ${br(p.c)} = ${p.a * p.c}, \\qquad ${br(p.a)} \\times ${br(p.d)} = ${p.a * p.d}` },
      { tex: `${br(p.b)} \\times ${br(p.c)} = ${p.b * p.c}, \\qquad ${br(p.b)} \\times ${br(p.d)} = ${p.b * p.d}` },
      { text: `The least is ${lo} and the greatest ${hi}.` },
    ];
  },
};

/* ================================================================
 * Lesson 2: AM-GM
 * ================================================================ */

/* ---------- ax + b/x, and (x + p)(x + q)/x ---------- */

interface AmGmParams {
  twist: boolean;
  /** Difficulty 1: ax + b/x with b = a x0^2. */
  a: number;
  x0: number;
  /** Difficulty 2: (x + p)(x + q)/x with pq = s^2. */
  p: number;
  q: number;
}

const amgmB = (p: AmGmParams) => p.a * p.x0 * p.x0;
const rootPQ = (p: AmGmParams) => Math.round(Math.sqrt(p.p * p.q));
const amgmLeast = (p: AmGmParams) => (p.twist ? 2 * rootPQ(p) + p.p + p.q : 2 * p.a * p.x0);

/** Pairs p < q up to 36 with pq a perfect square. */
const SQUARE_PAIRS: [number, number][] = [];
for (let p = 1; p <= 36; p += 1) {
  for (let q = p + 1; q <= 36; q += 1) {
    const s = Math.round(Math.sqrt(p * q));
    if (s * s === p * q) SQUARE_PAIRS.push([p, q]);
  }
}

const cmInAmgmMin: Generator<AmGmParams> = {
  id: 'cm-in-amgm-min',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const [p, q] = rng.pick(SQUARE_PAIRS);
      return rng.chance(0.5) ? { twist: true, a: 0, x0: 0, p, q } : { twist: true, a: 0, x0: 0, p: q, q: p };
    }
    for (;;) {
      const a = rng.int(1, 6);
      const x0 = rng.int(2, 9);
      if (a * x0 * x0 > 300) continue;
      return { twist: false, a, x0, p: 0, q: 0 };
    }
  },
  render(p) {
    const expr = p.twist ? `\\frac{(x + ${p.p})(x + ${p.q})}{x}` : `${coefTex(p.a, 'x')} + \\frac{${amgmB(p)}}{x}`;
    return typed([say('What is the least value of this for positive $x$?'), show(expr)], amgmLeast(p), '\\text{least} =');
  },
  choices(p) {
    const v = amgmLeast(p);
    if (p.twist) return numberOptions(v, [2 * rootPQ(p), (1 + p.p) * (1 + p.q), p.p + p.q + rootPQ(p)], 1, 1);
    return numberOptions(v, [p.a + amgmB(p), p.a * p.x0, v + p.a], 1, 1);
  },
  solution(p) {
    if (p.twist) {
      const s = rootPQ(p);
      return [
        { text: 'Multiply out and split over $x$:' },
        { tex: `\\frac{x^2 + ${p.p + p.q}x + ${p.p * p.q}}{x} = x + \\frac{${p.p * p.q}}{x} + ${p.p + p.q}` },
        { text: `The product of $x$ and $\\frac{${p.p * p.q}}{x}$ is fixed, so AM-GM gives` },
        { tex: `x + \\frac{${p.p * p.q}}{x} \\ge 2\\sqrt{${p.p * p.q}} = ${2 * s}` },
        { text: `with equality at $x = ${s}$. Add the ${p.p + p.q} back on:` },
        { tex: `${2 * s} + ${p.p + p.q} = ${amgmLeast(p)}` },
      ];
    }
    const b = amgmB(p);
    return [
      { text: `The product of $${coefTex(p.a, 'x')}$ and $\\frac{${b}}{x}$ is always ${p.a * b}, so AM-GM gives` },
      { tex: `${coefTex(p.a, 'x')} + \\frac{${b}}{x} \\ge 2\\sqrt{${p.a * b}}` },
      { tex: `2\\sqrt{${p.a * b}} = 2 \\times ${p.a * p.x0} = ${amgmLeast(p)}` },
      { text: `Equality needs the two parts equal, $${coefTex(p.a, 'x')} = \\frac{${b}}{x}$, which is at $x = ${p.x0}$. Trying $x = 1$ gives ${p.a + b}, which is not the least.` },
    ];
  },
};

/* ---------- a fixed product: the closer pair has the smaller sum ---------- */

interface ProductParams {
  n: number;
}

/** The factor pairs a ≤ b of n, the closest (up to) four. */
function factorPairs(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 1; a * a <= n; a += 1) if (n % a === 0) out.push([a, n / a]);
  return out.slice(-4);
}

const cmInProductTable: Generator<ProductParams> = {
  id: 'cm-in-product-table',
  sample(rng, difficulty) {
    for (;;) {
      const n = difficulty >= 2 ? rng.int(120, 600) : rng.int(24, 120);
      if (factorPairs(n).length < 4) continue;
      return { n };
    }
  },
  render({ n }) {
    const pairs = factorPairs(n);
    const sums = pairs.map(([a, b]) => a + b);
    const [ca, cb] = pairs[pairs.length - 1];
    return {
      kind: 'table',
      prompt: [
        say(`Whole numbers $a \\le b$ multiply to ${n}. Fill in each sum $a + b$.`),
      ],
      columns: ['a', 'b', 'a + b'],
      rows: pairs.map(([a, b]) => [`${a}`, `${b}`, null]),
      bank: numberBank(sums, [2 * ca, 2 * cb, ca * 2 + 1], 3),
      answer: sums.map(num),
    };
  },
  solution({ n }) {
    const pairs = factorPairs(n);
    const [ca, cb] = pairs[pairs.length - 1];
    return [
      ...pairs.map(([a, b]) => ({ tex: `${a} + ${b} = ${a + b}` })),
      { text: `The sums shrink as the pair closes up, and ${ca} and ${cb} are the closest, so ${ca + cb} is the least: AM-GM says $a + b \\ge 2\\sqrt{${n}}$, with equality only if $a = b$.` },
    ];
  },
};

/* ---------- a fixed area: least fence ---------- */

interface PenParams {
  wall: boolean;
  t: number;
}

const penArea = ({ wall, t }: PenParams) => (wall ? 2 * t * t : t * t);

const cmInPenTiles: Generator<PenParams> = {
  id: 'cm-in-pen-tiles',
  sample(rng, difficulty) {
    return { wall: difficulty >= 2, t: rng.int(difficulty >= 2 ? 2 : 3, difficulty >= 2 ? 28 : 30) };
  },
  render(p) {
    const area = penArea(p);
    if (p.wall) {
      return {
        kind: 'tiles',
        prompt: [
          say(`A rectangular pen of area ${area} m² is built against a long wall, so only three sides need fence. The two sides that meet the wall are $x$ m long.`),
          say('Fill in the $x$ that uses the least fence, and that least length in metres.'),
        ],
        template: 'x = {0}, \\qquad \\text{fence} = {1}',
        bank: numberBank([p.t, 4 * p.t], [2 * p.t, 3 * p.t, p.t * p.t, 4 * p.t + 2], 3),
        answer: [num(p.t), num(4 * p.t)],
      };
    }
    return {
      kind: 'tiles',
      prompt: [
        say(`A rectangle has area ${area} cm², and its perimeter is as small as it can be.`),
        say('Fill in the length of each side and the perimeter, in cm.'),
      ],
      template: '\\text{side} = {0}, \\qquad \\text{perimeter} = {1}',
      bank: numberBank([p.t, 4 * p.t], [2 * p.t, area, 2 * (area + 1), 2 * p.t + 2], 3),
      answer: [num(p.t), num(4 * p.t)],
    };
  },
  solution(p) {
    const area = penArea(p);
    if (p.wall) {
      return [
        { text: `The side along the wall is $\\frac{${area}}{x}$, so the fence is` },
        { tex: `2x + \\frac{${area}}{x}` },
        { text: `The product of $2x$ and $\\frac{${area}}{x}$ is fixed at ${2 * area}, so AM-GM gives` },
        { tex: `2x + \\frac{${area}}{x} \\ge 2\\sqrt{${2 * area}} = ${4 * p.t}` },
        { text: 'with equality when the two parts are equal:' },
        { tex: `2x = \\frac{${area}}{x}` },
        { tex: `x^2 = ${p.t * p.t}` },
        { tex: `x = ${p.t}` },
      ];
    }
    return [
      { text: `With sides $x$ and $\\frac{${area}}{x}$, the perimeter is` },
      { tex: `2\\left(x + \\frac{${area}}{x}\\right)` },
      { text: 'AM-GM on the bracket:' },
      { tex: `x + \\frac{${area}}{x} \\ge 2\\sqrt{${area}} = ${2 * p.t}` },
      { text: `Equality when $x = \\frac{${area}}{x}$, so a square of side ${p.t}. The perimeter is` },
      { tex: `4 \\times ${p.t} = ${4 * p.t}` },
    ];
  },
};

/* ---------- a fixed sum: greatest product ---------- */

interface SumParams {
  /** 0: two numbers with a sum; 1: a rectangle's perimeter; 2: three sides against a wall. */
  kind: 0 | 1 | 2;
  k: number;
}

const sumTotal = ({ kind, k }: SumParams) => (kind === 0 ? 2 * k : 4 * k);
const sumBest = ({ kind, k }: SumParams) => (kind === 2 ? 2 * k * k : k * k);

const cmInFixedSum: Generator<SumParams> = {
  id: 'cm-in-fixed-sum',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { kind: 2, k: rng.int(3, 30) };
    return rng.chance(0.5) ? { kind: 0, k: rng.int(5, 40) } : { kind: 1, k: rng.int(3, 30) };
  },
  render(p) {
    const total = sumTotal(p);
    if (p.kind === 0) {
      return typed([say(`Two positive numbers add up to ${total}. What is the greatest their product can be?`)], sumBest(p), '\\text{product} =');
    }
    if (p.kind === 1) {
      return typed([say(`A rectangle has perimeter ${total} cm. What is the greatest area it can have, in cm²?`)], sumBest(p), '\\text{area} =');
    }
    return typed(
      [say(`${total} m of fence makes three sides of a rectangular pen; a long wall is the fourth. What is the greatest area it can enclose, in m²?`)],
      sumBest(p),
      '\\text{area} =',
    );
  },
  choices(p) {
    const v = sumBest(p);
    const total = sumTotal(p);
    if (p.kind === 2) {
      const third = (total / 3) ** 2;
      return numberOptions(v, [third, p.k * p.k, 4 * p.k * p.k, v - 2], 1, 1);
    }
    return numberOptions(v, [v - 1, (total / 2) ** 2, total * 2, v - 4], 1, 1);
  },
  solution(p) {
    const total = sumTotal(p);
    if (p.kind === 2) {
      return [
        { text: `With the two sides at the wall $x$ and the side facing it $y$:` },
        { tex: `2x + y = ${total}` },
        { text: 'AM-GM on $2x$ and $y$, whose sum is fixed:' },
        { tex: `2x \\times y \\le \\left(\\tfrac{${total}}{2}\\right)^2 = ${(total / 2) ** 2}` },
        { tex: `xy \\le ${sumBest(p)}` },
        { text: `Equality at $2x = y = ${total / 2}$, so $x = ${p.k}$ and the pen is twice as long as it is deep. Treating the ${total} m as a full perimeter gives a square of area ${p.k * p.k}, the trap.` },
      ];
    }
    const half = total / 2;
    const pair = p.kind === 0 ? 'the two numbers' : 'a length and a width';
    const steps: SolutionStep[] = [];
    if (p.kind === 1) steps.push({ text: `A length and a width make half the perimeter, ${half}.` });
    steps.push(
      { text: `For ${pair} adding to ${half}, AM-GM gives` },
      { tex: `xy \\le \\left(\\tfrac{${half}}{2}\\right)^2 = ${sumBest(p)}` },
      { text: `with equality when both are ${p.k}.` },
    );
    return steps;
  },
};

/* ================================================================
 * Lesson 3: Cauchy-Schwarz
 * ================================================================ */

/** Coefficients whose squares add to a square: [..., root]. */
const PAIRS: [number, number, number][] = [
  [3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [12, 16, 20], [20, 21, 29],
];
const TRIPLES: [number, number, number, number][] = [
  [1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11], [3, 4, 12, 13], [2, 5, 14, 15], [2, 10, 11, 15],
];

const VARS = ['x', 'y', 'z'];
const linearTex = (coefs: number[]) => coefs.map((c, i) => coefTex(c, VARS[i])).join(' + ');
const squaresTex = (n: number) => VARS.slice(0, n).map((v) => `${v}^2`).join(' + ');
const coefSquares = (coefs: number[]) => coefs.map((c) => `${c}^2`).join(' + ');

/** A random order of the coefficients, the root last. */
function pickCoefs(rng: Rng, three: boolean): { coefs: number[]; root: number } {
  const row = three ? rng.pick(TRIPLES) : rng.pick(PAIRS);
  const coefs = rng.shuffle(row.slice(0, -1));
  return { coefs, root: row[row.length - 1] };
}

/* ---------- greatest of px + qy on a circle ---------- */

interface CsMaxParams {
  coefs: number[];
  root: number;
  r: number;
}

const cmInCsMax: Generator<CsMaxParams> = {
  id: 'cm-in-cs-max',
  sample(rng, difficulty) {
    const { coefs, root } = pickCoefs(rng, difficulty >= 2);
    return { coefs, root, r: rng.int(2, 9) };
  },
  render({ coefs, r }) {
    const names = coefs.length === 3 ? '$x$, $y$ and $z$' : '$x$ and $y$';
    return typed(
      [say(`Real numbers ${names} satisfy`), show(`${squaresTex(coefs.length)} = ${r * r}`), say('What is the greatest value of'), show(linearTex(coefs))],
      r * rootOf(coefs),
      '\\text{greatest} =',
    );
  },
  choices({ coefs, root, r }) {
    const sum = coefs.reduce((s, c) => s + c, 0);
    return numberOptions(root * r, [sum * r, Math.max(...coefs) * r, root * r * r, root + r], 1, 1);
  },
  solution({ coefs, root, r }) {
    const sq = coefs.reduce((s, c) => s + c * c, 0);
    return [
      { text: 'Cauchy-Schwarz:' },
      { tex: `(${linearTex(coefs)})^2 \\le (${coefSquares(coefs)})(${squaresTex(coefs.length)})` },
      { tex: `(${linearTex(coefs)})^2 \\le ${sq} \\times ${r * r}` },
      { tex: `${linearTex(coefs)} \\le ${root} \\times ${r} = ${root * r}` },
      { text: `Equality when ${coefs.length === 3 ? '$x : y : z$' : '$x : y$'} is $${coefs.join(' : ')}$, which a point on the ${coefs.length === 3 ? 'sphere' : 'circle'} can do. Adding the coefficients, ${coefs.reduce((s, c) => s + c, 0) * r}, needs every variable to be ${r} at once, which is off it.` },
    ];
  },
};

function rootOf(coefs: number[]): number {
  return Math.round(Math.sqrt(coefs.reduce((s, c) => s + c * c, 0)));
}

/* ---------- where the greatest is reached, as a table ---------- */

interface CsTableParams {
  coefs: number[];
  root: number;
  m: number;
}

const cmInCsTable: Generator<CsTableParams> = {
  id: 'cm-in-cs-table',
  sample(rng, difficulty) {
    for (;;) {
      const { coefs, root } = pickCoefs(rng, difficulty >= 2);
      const m = rng.int(1, 6);
      if (root * m > 30) continue;
      return { coefs, root, m };
    }
  },
  render({ coefs, root, m }) {
    const values = [...coefs.map((c) => c * m), root * root * m];
    const sum = coefs.reduce((s, c) => s + c, 0);
    const names = coefs.length === 3 ? '$x$, $y$ and $z$' : '$x$ and $y$';
    return {
      kind: 'table',
      prompt: [
        say(`Real numbers ${names} satisfy`),
        show(`${squaresTex(coefs.length)} = ${(root * m) ** 2}`),
        say(`Fill in where $${linearTex(coefs)}$ is greatest, and that greatest value.`),
      ],
      columns: ['\\text{at the greatest}', '\\text{value}'],
      rows: [...VARS.slice(0, coefs.length).map((v) => [v, null]), [linearTex(coefs), null]],
      bank: numberBank(values, [root * m, sum * m, root * root, m * (root * root + 1)], 3),
      answer: values.map(num),
    };
  },
  solution({ coefs, root, m }) {
    const n = coefs.length;
    return [
      { text: `Equality in Cauchy-Schwarz needs the variables in step with the coefficients, so write each as $\\lambda$ times its coefficient:` },
      { tex: VARS.slice(0, n).map((v, i) => `${v} = ${coefTex(coefs[i], '\\lambda')}`).join(', \\qquad ') },
      { tex: `(${coefSquares(coefs)})\\lambda^2 = ${(root * m) ** 2}` },
      { tex: `${root * root}\\lambda^2 = ${(root * m) ** 2}` },
      { tex: `\\lambda = ${m}` },
      { text: `So ${VARS.slice(0, n).map((v, i) => `$${v} = ${coefs[i] * m}$`).join(', ')}, and the greatest value is` },
      { tex: `${root * root} \\times ${m} = ${root * root * m}` },
    ];
  },
};

/* ---------- least of x^2 + y^2 on a line ---------- */

interface CsMinParams {
  coefs: number[];
  k: number;
}

const csMinSq = ({ coefs }: CsMinParams) => coefs.reduce((s, c) => s + c * c, 0);

const cmInCsMin: Generator<CsMinParams> = {
  id: 'cm-in-cs-min',
  sample(rng, difficulty) {
    for (;;) {
      const n = difficulty >= 2 ? 3 : 2;
      const coefs = Array.from({ length: n }, () => rng.int(1, 6));
      if (new Set(coefs).size < 2) continue;
      if (coefs.reduce((s, c) => s + c, 0) > 13) continue;
      const k = rng.int(2, 20);
      if ((k * k) / csMinSq({ coefs, k }) > 60) continue;
      return { coefs, k };
    }
  },
  render(p) {
    const names = p.coefs.length === 3 ? '$x$, $y$ and $z$' : '$x$ and $y$';
    return typed(
      [say(`Real numbers ${names} satisfy`), show(`${linearTex(p.coefs)} = ${p.k}`), say('What is the least value of'), show(squaresTex(p.coefs.length))],
      fracAnswer(p.k * p.k, csMinSq(p)),
      '\\text{least} =',
      FRACTION_KEYS,
    );
  },
  choices(p) {
    const n = p.coefs.length;
    const sum = p.coefs.reduce((s, c) => s + c, 0);
    return fractionOptions(p.k * p.k, csMinSq(p), [
      [n * p.k * p.k, sum * sum],
      [p.k * p.k, sum * sum],
      [p.k, csMinSq(p)],
    ]);
  },
  solution(p) {
    const sq = csMinSq(p);
    const n = p.coefs.length;
    const sum = p.coefs.reduce((s, c) => s + c, 0);
    const equal = VARS.slice(0, n).join(' = ');
    return [
      { text: 'Cauchy-Schwarz, with the line’s coefficients:' },
      { tex: `(${linearTex(p.coefs)})^2 \\le (${coefSquares(p.coefs)})(${squaresTex(n)})` },
      { tex: `${p.k}^2 \\le ${sq}(${squaresTex(n)})` },
      { tex: `${squaresTex(n)} \\ge ${fracTex(p.k * p.k, sq)}` },
      { text: `Equality when ${n === 3 ? '$x : y : z$' : '$x : y$'} is $${p.coefs.join(' : ')}$, which the line allows. Setting $${equal}$ is the trap: it gives $${fracTex(n * p.k * p.k, sum * sum)}$, which is more.` },
    ];
  },
};

/* ---------- Titu: a^2/x + b^2/y with x + y fixed ---------- */

interface TituParams {
  nums: number[];
  s: number;
}

const tituTop = ({ nums }: TituParams) => nums.reduce((t, a) => t + a, 0) ** 2;
const tituLeast = (p: TituParams) => tituTop(p) / p.s;

const cmInTitu: Generator<TituParams> = {
  id: 'cm-in-titu',
  sample(rng, difficulty) {
    for (;;) {
      const n = difficulty >= 2 ? 3 : 2;
      const nums = Array.from({ length: n }, () => rng.int(1, difficulty >= 2 ? 5 : 7));
      if (new Set(nums).size < 2) continue;
      const top = nums.reduce((t, a) => t + a, 0) ** 2;
      const divisors: number[] = [];
      for (let s = 2; s <= 40; s += 1) if (top % s === 0 && top / s >= 2) divisors.push(s);
      if (divisors.length === 0) continue;
      return { nums, s: rng.pick(divisors) };
    }
  },
  render(p) {
    const n = p.nums.length;
    const expr = p.nums.map((a, i) => `\\frac{${a * a}}{${VARS[i]}}`).join(' + ');
    const names = n === 3 ? '$x$, $y$ and $z$' : '$x$ and $y$';
    return typed(
      [say(`Positive ${names} satisfy`), show(`${VARS.slice(0, n).join(' + ')} = ${p.s}`), say('What is the least value of'), show(expr)],
      tituLeast(p),
      '\\text{least} =',
    );
  },
  choices(p) {
    const n = p.nums.length;
    const squares = p.nums.reduce((t, a) => t + a * a, 0);
    const sum = p.nums.reduce((t, a) => t + a, 0);
    // Splitting the total evenly is the trap, and it is rarely whole, so the
    // options are fractions: the answer stays whole beside it.
    return fractionOptions(tituTop(p), p.s, [
      [n * squares, p.s],
      [sum, 1],
      [squares, p.s],
    ]);
  },
  solution(p) {
    const n = p.nums.length;
    const sum = p.nums.reduce((t, a) => t + a, 0);
    const squares = p.nums.reduce((t, a) => t + a * a, 0);
    const expr = p.nums.map((a, i) => `\\frac{${a}^2}{${VARS[i]}}`).join(' + ');
    return [
      { text: 'Write each top as a square. The fractions form of Cauchy-Schwarz gives' },
      { tex: `${expr} \\ge \\frac{(${p.nums.join(' + ')})^2}{${VARS.slice(0, n).join(' + ')}}` },
      { tex: `\\frac{${sum}^2}{${p.s}} = ${tituLeast(p)}` },
      { text: `Equality when ${n === 3 ? '$x : y : z$' : '$x : y$'} is $${p.nums.join(' : ')}$. Splitting ${p.s} evenly gives $${fracTex(n * squares, p.s)}$, which is more.` },
    ];
  },
};

export const contestInequalitiesGenerators = [
  cmInFlip,
  cmInCountIntegers,
  cmInSquareMin,
  cmInBounds,
  cmInAmgmMin,
  cmInProductTable,
  cmInPenTiles,
  cmInFixedSum,
  cmInCsMax,
  cmInCsTable,
  cmInCsMin,
  cmInTitu,
];
