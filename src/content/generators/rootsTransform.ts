/**
 * Polynomials level 9: transforming the roots.
 *
 * Level 4 built a cubic whose roots are 2α or α + 1 by working out the new
 * sums of the roots. This level does it by substitution: if the new root is
 * y = f(α), solve for α = g(y) and the new equation is p(g(x)) = 0, cleared of
 * fractions. Scaling the roots by k multiplies the coefficients, highest
 * first, by 1, k, k², k³; shifting them is p(x - k), expanded with the
 * binomial pattern; reciprocal roots reverse the coefficients; squared roots
 * come from the sums of the squares, or from x → √x once the odd powers are
 * on one side and squared. The last lesson chooses the substitution and uses
 * a transformed equation to find a value without the roots.
 *
 * The starting polynomials are drawn from small whole coefficients, all
 * non-zero, so their roots are usually not whole: that is the point, since
 * the method never needs them. Every transformation of a polynomial with
 * whole coefficients has whole coefficients, so nothing is filtered for
 * being a fraction; only the values in the last lesson are fractions.
 * `rootsTransform.test.ts` checks each claimed equation against the defining
 * identity (k^n p(x/k), p(x - k), x^n p(k/x), ±p(√x)p(-√x)) at sample points.
 *
 * Polynomials are held highest power first, as in `polynomials.ts`.
 */
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import {
  addPoly,
  chain,
  coefMark,
  factor,
  fillBank,
  fracAnswer,
  intOptions,
  linTex,
  mulPoly,
  nonZero,
  numberBank,
  overLead,
  polyAnswer,
  polyTex,
  scalePoly,
  signedNum,
  signedPolyTex,
  signedTerm,
  stepBank,
  turned,
  valueAt,
  type Poly,
} from './polynomials';
import { termTex } from './calculus';
import { fracTex, say } from './format';

/* ---------- shared ---------- */

const GREEK = ['\\alpha', '\\beta', '\\gamma'];

/**
 * "$a$ and $b$" or "$a,$ $b,$ $c$ and $d$". Each comma sits inside its maths,
 * so a line never breaks between a value and the comma after it.
 */
function mathList(items: (string | number)[]): string {
  if (items.length === 1) return `$${items[0]}$`;
  const head = items.slice(0, -1).map((t, i, all) => (i < all.length - 1 ? `$${t},$` : `$${t}$`));
  return `${head.join(' ')} and $${items[items.length - 1]}$`;
}

/** "$α$ and $β$" or "$α,$ $β$ and $γ$", each root passed through `f`. */
function rootNames(n: number, f: (g: string) => string = (g) => g): string {
  return mathList(GREEK.slice(0, n).map(f));
}

/** A substitution as inline TeX, braced so a line cannot break at the arrow. */
const to = (label: string): string => `{x \\to ${label}}`;

/** The multipliers 1, k, k², (k³) as a list, powers written as powers. */
function multipliers(k: number, n: number): string {
  return mathList([1, k, ...Array.from({ length: n - 1 }, (_, j) => powerOf(k, j + 2))]);
}

/** Twice a product, each factor bracketed: 2(-3)(-1). Shorter than a row of times signs. */
const twice = (...factors: number[]): string => `2${factors.map((v) => `(${v})`).join('')}`;

/** Small whole coefficients below a given lead, none of them zero. */
function samplePoly(rng: Rng, n: number, lead: number, max: number): Poly {
  return [lead, ...Array.from({ length: n }, () => nonZero(rng, max))];
}

/** True when p is a whole multiple of q, so both have the same roots. */
function proportional(p: Poly, q: Poly): boolean {
  return p.length === q.length && p.every((c, i) => c * q[0] === q[i] * p[0]);
}

/** The same roots with the leading coefficient made positive. */
const positive = (p: Poly): Poly => (p[0] < 0 ? scalePoly(p, -1) : p);

/** The name of a coefficient as the learner reads it. */
function coefWords(power: number): string {
  if (power === 0) return 'constant term';
  return power === 1 ? 'coefficient of $x$' : `coefficient of $x^{${power}}$`;
}

/** The same name as TeX, for an expression slide's lead. */
function coefLead(power: number): string {
  if (power === 0) return '\\text{constant term} =';
  return power === 1 ? '\\text{coefficient of } x =' : `\\text{coefficient of } x^{${power}} =`;
}

/** k times a root: 2α, -α, -3α. */
const timesRoot = (k: number) => (g: string) => `${coefMark(k)}${g}`;

/** x/k as the substitution for roots kα: x/2, -x/3, and x or -x. */
function xOver(k: number): string {
  if (k === 1) return 'x';
  if (k === -1) return '-x';
  return k > 0 ? `\\frac{x}{${k}}` : `-\\frac{x}{${-k}}`;
}

/** k over something: 2/x, -1/α. */
function over(k: number, below: string): string {
  return `${k < 0 ? '-' : ''}\\frac{${Math.abs(k)}}{${below}}`;
}

/** A coefficient in front of a bracket, with its sign: "+ 3", "- ", "+ ". */
function bracketCoef(c: number): string {
  return c > 0 ? `+ ${coefMark(c)}` : `- ${coefMark(-c)}`;
}

const powerOf = (k: number, e: number): string => `${factor(String(k))}^{${e}}`;

/** Roots multiplied by k: k^n p(x/k), so coefficient i is times k^i. */
const scaleRoots = (p: Poly, k: number): Poly => p.map((c, i) => c * k ** i);

/** Roots divided by m: p(mx), so coefficient i is times m^(n - i). */
const shrinkRoots = (p: Poly, m: number): Poly => p.map((c, i) => c * m ** (p.length - 1 - i));

/** (x - k)^e. */
function bracketPower(k: number, e: number): Poly {
  let out: Poly = [1];
  for (let j = 0; j < e; j += 1) out = mulPoly(out, [1, -k]);
  return out;
}

/** Roots increased by k: p(x - k). */
function shiftRoots(p: Poly, k: number): Poly {
  const n = p.length - 1;
  return p.reduce<Poly>((acc, c, i) => addPoly(acc, scalePoly(bracketPower(k, n - i), c)), [0]);
}

/** Roots k/α: x^n p(k/x), the coefficients reversed and then times 1, k, k², ... */
const recipRoots = (p: Poly, k = 1): Poly => [...p].reverse().map((c, j) => c * k ** j);

/** Roots squared, for a monic quadratic or cubic, by the substitution x → √x. */
function squareRoots(p: Poly): Poly {
  if (p.length === 3) {
    const [, b, c] = p;
    return [1, 2 * c - b * b, c * c];
  }
  const [, b, c, d] = p;
  return [1, 2 * c - b * b, c * c - 2 * b * d, -d * d];
}

/** Roots 1/(α + k): x^n p((1 - kx)/x). */
function comboRoots(p: Poly, k: number): Poly {
  const n = p.length - 1;
  return p.reduce<Poly>((acc, c, i) => {
    let term: Poly = [c];
    for (let j = 0; j < n - i; j += 1) term = mulPoly(term, [-k, 1]);
    return addPoly(acc, [...term, ...Array(i).fill(0)]);
  }, [0]);
}

/** Every coefficient after the first as a tile, with its sign. */
const restTiles = (q: Poly): string[] => q.slice(1).map((c, i) => signedTerm(c, q.length - 2 - i));

/** Every coefficient as a tile, the first unsigned. */
const allTiles = (q: Poly): string[] => [termTex(q[0], q.length - 1), ...restTiles(q)];

/** The leading term as a tiles template fragment, with no braces round the power. */
const leadFragment = (a: number, n: number): string => `${coefMark(a)}x^${n}`;

/** A tiles template for the rest of a polynomial of degree n. */
const blanks = (n: number, from = 0): string =>
  Array.from({ length: n }, (_, j) => `{${from + j}}`).join(' ');

/** label = (minus) top/bottom = the value in lowest terms, the middle left out when it adds nothing. */
function ratioLine(label: string, top: number, bottom: number, minus: boolean): string {
  // Over 1 there is nothing to divide, and -(12) = -12 only adds a line.
  const raw = bottom === 1 ? fracTex(minus ? -top : top, 1) : overLead(top, bottom, minus);
  const value = fracTex(minus ? -top : top, bottom);
  // The value on a line of its own: a long label with both on one line is wider than a phone.
  return raw === value ? `${label} = ${value}` : chain(`&${label}`, `=\\;&${raw}`, `=\\;&${value}`);
}

/** Polynomial options for a choice: the right one and the slips that are really wrong. */
function polyOptions(q: Poly, slips: Poly[]): ChoiceOption[] {
  const wrong = slips.filter((v) => !proportional(v, q));
  return options(
    { tex: `${polyTex(q)} = 0`, answer: polyAnswer(q) },
    ...wrong.map((v) => ({ tex: `${polyTex(v)} = 0`, answer: polyAnswer(v) })),
  ).slice(0, 4);
}

/** Lines of working for p(x - k): each bracket multiplied out, then the total. */
function shiftWorking(p: Poly, k: number): SolutionStep[] {
  const n = p.length - 1;
  const lines: string[] = [];
  p.forEach((c, i) => {
    const e = n - i;
    if (e === 0) return;
    const bracket = `(${linTex(k)})${e > 1 ? `^{${e}}` : ''}`;
    const s = scalePoly(bracketPower(k, e), c);
    if (e === 3) {
      // Four terms after a bracket and its coefficient are wider than a phone: break after the x² term.
      lines.push(`${coefMark(c)}${bracket} &= ${polyTex([s[0], s[1], 0, 0])}`, `&\\quad ${signedPolyTex([s[2], s[3]])}`);
    } else lines.push(`${coefMark(c)}${bracket} &= ${polyTex(s)}`);
  });
  return [
    { text: `Substitute $${to(linTex(k))}$ and multiply out each bracket:` },
    { tex: chain(...lines) },
    { text: `Adding, with the constant $${p[n]}$:` },
    { tex: `${polyTex(shiftRoots(p, k))} = 0` },
  ];
}

/** Lines of working for k^n p(x/k): each coefficient times its power of k. */
function scaleWorking(p: Poly, k: number): SolutionStep[] {
  const n = p.length - 1;
  const q = scaleRoots(p, k);
  const lines = p.slice(1).map((c, j) => `${factor(String(c))} \\times ${j === 0 ? factor(String(k)) : powerOf(k, j + 1)} &= ${q[j + 1]}`);
  return [
    {
      text: `An old root is the new one divided by $${k}$, so substitute $${to(xOver(k))}$ and multiply through by $${powerOf(k, n)}$. The coefficients, highest first, are multiplied by ${multipliers(k, n)}:`,
    },
    { tex: chain(...lines) },
    { tex: `${polyTex(q)} = 0` },
  ];
}

/* ================================================================
 * Lesson 1: scaling the roots
 * ================================================================ */

interface ScaleParams {
  p: Poly;
  k: number;
}

function sampleScale(rng: Rng, difficulty: number, cubicOnly: boolean): ScaleParams {
  for (;;) {
    const hard = difficulty > 1;
    const n = cubicOnly || hard ? 3 : rng.pick([2, 3]);
    const lead = hard ? rng.pick([1, 2, 3, -1, -2]) : 1;
    const p = samplePoly(rng, n, lead, hard ? 4 : 5);
    const k = hard ? rng.pick([2, -2, 3, -3]) : rng.pick([2, 3, -2, -1]);
    if (scaleRoots(p, k).some((c) => Math.abs(c) > 200)) continue;
    return { p, k };
  }
}

/** The equation with roots kα, coefficient by coefficient. */
const polyTrScaleTiles: Generator<ScaleParams> = {
  id: 'poly-tr-scale-tiles',
  sample: (rng, difficulty) => sampleScale(rng, difficulty, false),
  choices: ({ p, k }) => {
    const q = scaleRoots(p, k);
    const n = p.length - 1;
    return polyOptions(q, [
      p.map((c, i) => (i === 0 ? c : c * k)),
      p.map((c, i) => c * k ** (n - i)),
      q.map((c, i) => (i % 2 === 1 ? -c : c)),
      p.map((c, i) => c * Math.abs(k) ** i),
    ]);
  },
  render: ({ p, k }): Slide => {
    const n = p.length - 1;
    const q = scaleRoots(p, k);
    const answer = restTiles(q);
    return {
      kind: 'tiles',
      prompt: [
        say(
          `${rootNames(n)} are the roots of $${polyTex(p)} = 0$. Find the equation with roots ${rootNames(n, timesRoot(k))}, keeping the leading coefficient $${p[0]}$.`,
        ),
      ],
      template: `${leadFragment(p[0], n)} ${blanks(n)} = 0`,
      bank: fillBank(answer, [
        ...answer.map((_, j) => signedTerm(-q[j + 1], n - 1 - j)),
        ...p.slice(1).map((c, j) => signedTerm(c * k, n - 1 - j)),
        ...p.slice(1).map((c, j) => signedTerm(c * k ** (n - 1 - j), n - 1 - j)),
      ]),
      answer,
    };
  },
  solution: ({ p, k }) => scaleWorking(p, k),
};

/** The powers of k and the new coefficients they give, for roots kα. */
const polyTrScaleTree: Generator<ScaleParams> = {
  id: 'poly-tr-scale-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const p = samplePoly(rng, 3, hard ? rng.pick([2, -1, 3, -2]) : 1, hard ? 4 : 5);
      const k = hard ? rng.pick([2, -2, 3, -3]) : rng.pick([2, 3, -2]);
      if (scaleRoots(p, k).some((c) => Math.abs(c) > 200)) continue;
      return { p, k };
    }
  },
  render: ({ p, k }): Slide => {
    const q = scaleRoots(p, k);
    const values = [q[1], k * k, q[2], k ** 3, q[3]];
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${polyTex(p)} = 0$ has roots ${rootNames(3)}. The equation with roots ${rootNames(3, timesRoot(k))} keeps the leading coefficient and multiplies the others by $${k}$, $${powerOf(k, 2)}$ and $${powerOf(k, 3)}$.`,
        ),
        say(`Top row: the new coefficient of $x^{2}$, and $${powerOf(k, 2)}$. Then the new coefficient of $x$, and $${powerOf(k, 3)}$. Last, the new constant.`),
      ],
      expression: `${polyTex(p)} = 0`,
      nodes: [
        { id: 'b', from: [] },
        { id: 'k2', from: [] },
        { id: 'c', from: ['k2'] },
        { id: 'k3', from: ['k2'] },
        { id: 'd', from: ['k3'] },
      ],
      bank: numberBank(values, [-q[1], -q[2], -q[3], p[2] * k, p[3] * k * k, -k * k], String, 2),
      answer: values.map(String),
    };
  },
  solution: ({ p, k }) => scaleWorking(p, k),
};

interface ScaleValueParams {
  p: Poly;
  /** Roots kα when `over` is false, roots α/k when it is true. */
  k: number;
  over: boolean;
  power: number;
}

function scaleValueQ({ p, k, over: shrink }: ScaleValueParams): Poly {
  return shrink ? shrinkRoots(p, k) : scaleRoots(p, k);
}

/** One coefficient of the equation with roots kα, or of p(kx) for roots α/k. */
const polyTrScaleValue: Generator<ScaleValueParams> = {
  id: 'poly-tr-scale-value',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const shrink = hard && rng.chance(0.5);
    const p = samplePoly(rng, 3, hard ? rng.pick([1, 2, -2, 3]) : 1, hard ? 4 : 5);
    if (shrink) return { p, k: rng.pick([2, 3]), over: true, power: rng.pick([3, 2, 1]) };
    return { p, k: hard ? rng.pick([2, -2, 3, -3]) : rng.pick([2, 3, -2, -1]), over: false, power: rng.pick([2, 1, 0]) };
  },
  choices: (params) => {
    const { p, k, power } = params;
    const q = scaleValueQ(params);
    const c = p[3 - power];
    return intOptions(q[3 - power], [c * k, c * k ** power, c * k ** (3 - power), -q[3 - power], c]);
  },
  render: (params): Slide => {
    const { p, k, over: shrink, power } = params;
    const q = scaleValueQ(params);
    const prompt = shrink
      ? `${rootNames(3)} are the roots of $${polyTex(p)} = 0$. The equation with roots ${rootNames(3, (g) => `\\frac{${g}}{${k}}`)} is $p(${k}x) = 0$. Find the ${coefWords(power)} in $p(${k}x)$.`
      : `${rootNames(3)} are the roots of $${polyTex(p)} = 0$. The equation with roots ${rootNames(3, timesRoot(k))} has the same leading coefficient. Find its ${coefWords(power)}.`;
    return {
      kind: 'expression',
      prompt: [say(prompt)],
      lead: coefLead(power),
      keypad: [],
      answer: String(q[3 - power]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { p, k, over: shrink, power } = params;
    const q = scaleValueQ(params);
    const c = p[3 - power];
    if (shrink) {
      return [
        { text: `An old root is $${k}$ times a new one, so substitute $${to(`${k}x`)}$. The term in $${power === 1 ? 'x' : `x^{${power}}`}$ picks up $${power === 1 ? k : `${k}^{${power}}`}$:` },
        { tex: `${factor(String(c))} \\times ${power === 1 ? k : `${k}^{${power}}`} = ${q[3 - power]}` },
      ];
    }
    const e = 3 - power;
    return [
      { text: `Substitute $${to(xOver(k))}$ and multiply through by $${powerOf(k, 3)}$. The coefficients, highest first, are multiplied by ${multipliers(k, 3)}, so the ${coefWords(power)} is multiplied by $${e === 1 ? k : powerOf(k, e)}$:` },
      { tex: `${factor(String(c))} \\times ${e === 1 ? factor(String(k)) : powerOf(k, e)} = ${q[3 - power]}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: shifting the roots
 * ================================================================ */

interface ShiftParams {
  p: Poly;
  /** New roots α + k, from p(x - k). */
  k: number;
}

/** The new root α + k as the learner reads it. */
const plusK = (k: number) => (g: string) => `${g} ${signedNum(k)}`;

/** p(x - k) multiplied out one bracket at a time, then collected. */
const polyTrShiftSteps: Generator<ShiftParams> = {
  id: 'poly-tr-shift-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const p = samplePoly(rng, hard ? 3 : 2, 1, hard ? 4 : 5);
    const k = hard ? rng.pick([1, 2, -1, -2]) : rng.pick([1, 2, 3, -1, -2, -3]);
    return { p, k };
  },
  render: ({ p, k }): Slide => {
    const n = p.length - 1;
    const q = shiftRoots(p, k);
    const lin = linTex(k);
    const start: string[] = [];
    const reductions: { span: [number, number]; value: string; bank: string[] }[] = [];
    // The top bracket, (x - k)^n, with its slips: the sign of k, and the
    // binomial numbers left out.
    const top = bracketPower(k, n);
    start.push(`(${lin})^{${n}}`);
    const topSlips =
      n === 3
        ? [bracketPower(-k, 3), [1, -k, k * k, -(k ** 3)], [1, -3 * k, 3 * k * k, k ** 3]]
        : [bracketPower(-k, 2), [1, 0, k * k], [1, -k, k * k]];
    reductions.push({ span: [0, 1], value: polyTex(top), bank: stepBank(polyTex(top), ...topSlips.map(polyTex)) });
    // Each lower bracket with its coefficient.
    for (let i = 1; i < n; i += 1) {
      const c = p[i];
      const e = n - i;
      start.push(`${bracketCoef(c)}(${lin})${e > 1 ? `^{${e}}` : ''}`);
      const value = signedPolyTex(scalePoly(bracketPower(k, e), c));
      const slips =
        e === 2
          ? [scalePoly(bracketPower(-k, 2), c), [c, 0, -c * k * k], [c, -2 * c * k, k * k]]
          : [[c, c * k], [c, -k], [c, -c * k + 1]];
      reductions.push({ span: [i, i + 1], value, bank: stepBank(value, ...slips.map(signedPolyTex)) });
    }
    start.push(signedNum(p[n]), '= 0');
    const whole = `${polyTex(q)} = 0`;
    const wrong = [shiftRoots(p, -k), addPoly(q, [1]), addPoly(q, [-1])];
    reductions.push({
      span: [0, n + 2],
      value: whole,
      bank: stepBank(whole, ...wrong.map((v) => `${polyTex(v)} = 0`)),
    });
    return {
      kind: 'steps',
      prompt: [
        say(
          `$${polyTex(p)} = 0$ has roots ${rootNames(n)}. Substituting $${to(lin)}$ gives the equation below, with roots ${rootNames(n, plusK(k))}. Tap the part you would work out **next**, then choose what it comes to.`,
        ),
      ],
      start,
      reductions,
    };
  },
  solution: ({ p, k }) => shiftWorking(p, k),
};

function sampleShift(rng: Rng, difficulty: number): ShiftParams {
  for (;;) {
    const hard = difficulty > 1;
    const p = samplePoly(rng, hard ? 3 : 2, hard ? rng.pick([1, 2]) : 1, hard ? 4 : 5);
    const k = hard ? rng.pick([1, -1, 2, -2]) : rng.pick([1, 2, 3, -1, -2, -3]);
    const q = shiftRoots(p, k);
    if (q.some((c) => c === 0 || Math.abs(c) > 200)) continue;
    return { p, k };
  }
}

/** The equation with roots α + k, coefficient by coefficient. */
const polyTrShiftTiles: Generator<ShiftParams> = {
  id: 'poly-tr-shift-tiles',
  sample: sampleShift,
  choices: ({ p, k }) => {
    const q = shiftRoots(p, k);
    const n = p.length - 1;
    return polyOptions(q, [
      shiftRoots(p, -k),
      q.map((c, i) => (i === n ? -c : c)),
      q.map((c, i) => (i === 1 ? -c : c)),
    ]);
  },
  render: ({ p, k }): Slide => {
    const n = p.length - 1;
    const q = shiftRoots(p, k);
    const answer = restTiles(q);
    const wrongWay = shiftRoots(p, -k);
    return {
      kind: 'tiles',
      prompt: [
        say(`${rootNames(n)} are the roots of $${polyTex(p)} = 0$. Find the equation with roots ${rootNames(n, plusK(k))}.`),
      ],
      template: `${leadFragment(p[0], n)} ${blanks(n)} = 0`,
      bank: fillBank(answer, [
        ...answer.map((_, j) => signedTerm(-q[j + 1], n - 1 - j)),
        ...restTiles(wrongWay).filter((_, j) => wrongWay[j + 1] !== 0),
      ]),
      answer,
    };
  },
  solution: ({ p, k }) => shiftWorking(p, k),
};

interface ShiftValueParams extends ShiftParams {
  power: number;
}

/** One coefficient of p(x - k); the constant term is p(-k). */
const polyTrShiftValue: Generator<ShiftValueParams> = {
  id: 'poly-tr-shift-value',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const n = hard ? 3 : rng.pick([2, 3]);
    const p = samplePoly(rng, n, hard ? rng.pick([1, 2, -1]) : 1, hard ? 4 : 5);
    const k = hard ? rng.pick([1, -1, 2, -2, 3]) : rng.pick([1, 2, 3, -1, -2, -3]);
    return { p, k, power: hard ? rng.pick([2, 1, 0]) : 0 };
  },
  choices: ({ p, k, power }) => {
    const n = p.length - 1;
    const value = shiftRoots(p, k)[n - power];
    return intOptions(value, [shiftRoots(p, -k)[n - power], p[n - power], -value, valueAt(p, k)]);
  },
  render: ({ p, k, power }): Slide => {
    const n = p.length - 1;
    return {
      kind: 'expression',
      prompt: [
        say(`${rootNames(n)} are the roots of $${polyTex(p)} = 0$. Find the ${coefWords(power)} in the equation with roots ${rootNames(n, plusK(k))}.`),
      ],
      lead: coefLead(power),
      keypad: [],
      answer: String(shiftRoots(p, k)[n - power]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ p, k, power }) => {
    const n = p.length - 1;
    const value = shiftRoots(p, k)[n - power];
    if (power === 0) {
      const terms = p.map((c, i) => c * (-k) ** (n - i));
      return [
        { text: `The new equation is $p(${linTex(k)}) = 0$. Its constant term is its value at $x = 0$, which is $p(${-k})$:` },
        { tex: chain(`p(${-k}) &= ${terms[0]} ${terms.slice(1).map(signedNum).join(' ')}`, `&= ${value}`) },
      ];
    }
    return [...shiftWorking(p, k), { text: `The ${coefWords(power)} is $${value}$.` }];
  },
};

/* ================================================================
 * Lesson 3: reciprocal roots
 * ================================================================ */

interface RecipParams {
  p: Poly;
  /** New roots k/α. */
  k: number;
}

/** k/α as the learner reads it. */
const kOver = (k: number) => (g: string) => over(k, g);

/** The equation with roots 1/α (or k/α), every coefficient placed. */
const polyTrRecipTiles: Generator<RecipParams> = {
  id: 'poly-tr-recip-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const n = hard ? 3 : rng.pick([2, 3]);
      const p = samplePoly(rng, n, hard ? rng.pick([1, 2, -1]) : rng.pick([1, 2, 3]), hard ? 4 : 5);
      const k = hard ? rng.pick([2, -1, 3, -2]) : 1;
      const q = recipRoots(p, k);
      if (p[n] < 0 || proportional(p, q) || q.some((c) => Math.abs(c) > 200)) continue;
      return { p, k };
    }
  },
  choices: ({ p, k }) => {
    const q = recipRoots(p, k);
    return polyOptions(q, [
      q.map((c, i) => (i % 2 === 1 ? -c : c)),
      k === 1 ? p : recipRoots(p, 1),
      p.map((c, i) => c * k ** i),
    ]);
  },
  render: ({ p, k }): Slide => {
    const n = p.length - 1;
    const q = recipRoots(p, k);
    const answer = allTiles(q);
    return {
      kind: 'tiles',
      prompt: [
        say(`${rootNames(n)} are the roots of $${polyTex(p)} = 0$. Find the equation with roots ${rootNames(n, kOver(k))}.`),
      ],
      template: `${blanks(n + 1)} = 0`,
      bank: fillBank(answer, [
        ...restTiles(q).map((_, j) => signedTerm(-q[j + 1], n - 1 - j)),
        // p's own leading tile only when it cannot start minus the answer.
        ...(p[0] > 0 ? allTiles(p) : restTiles(p)),
        ...(k === 1 ? [] : allTiles(recipRoots(p, 1))),
      ]),
      answer,
    };
  },
  solution: ({ p, k }) => {
    const n = p.length - 1;
    const q = recipRoots(p, k);
    const reversed = recipRoots(p, 1);
    return [
      {
        text: `A new root $y = ${over(k, '\\alpha')}$ means $\\alpha = ${over(k, 'y')}$, so substitute $${to(over(k, 'x'))}$ and multiply through by $x^{${n}}$. The coefficients come out in reverse order${k === 1 ? '' : `, then multiplied by ${multipliers(k, n)}`}:`,
      },
      ...(k === 1 ? [] : [{ tex: `${polyTex(reversed)}` }]),
      { tex: `${polyTex(q)} = 0` },
    ];
  },
};

/** Reversed coefficients, then the powers of k, for roots k/α. */
const polyTrRecipTree: Generator<RecipParams> = {
  id: 'poly-tr-recip-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const p = samplePoly(rng, 3, hard ? rng.pick([2, -1, 3, -2]) : 1, hard ? 4 : 5);
      const k = hard ? rng.pick([2, -2, 3, -3]) : rng.pick([2, 3, -2]);
      if (recipRoots(p, k).some((c) => Math.abs(c) > 200)) continue;
      return { p, k };
    }
  },
  render: ({ p, k }): Slide => {
    const q = recipRoots(p, k);
    const values = [q[0], q[1], k * k, q[2], k ** 3, q[3]];
    return {
      kind: 'tree',
      prompt: [
        say(
          `$p(x) = ${polyTex(p)}$ has roots ${rootNames(3)}. For roots ${rootNames(3, kOver(k))}, substitute $${to(over(k, 'x'))}$ and multiply by $x^{3}$: the coefficients reverse, then are multiplied by ${multipliers(k, 3)}.`,
        ),
        say(`Top row: the new coefficients of $x^{3}$ and $x^{2}$, and $${powerOf(k, 2)}$. Then the new coefficient of $x$, and $${powerOf(k, 3)}$. Last, the new constant.`),
      ],
      expression: `x^{3}p\\left(${over(k, 'x')}\\right) = 0`,
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: [] },
        { id: 'k2', from: [] },
        { id: 'c', from: ['k2'] },
        { id: 'k3', from: ['k2'] },
        { id: 'd', from: ['k3'] },
      ],
      bank: numberBank(values, [p[0], p[1] * k, p[2] * k * k, -q[1], -q[2], -q[3]], String, 2),
      answer: values.map(String),
    };
  },
  solution: ({ p, k }) => {
    const q = recipRoots(p, k);
    const reversed = recipRoots(p, 1);
    return [
      { text: 'Reversed, the coefficients are:' },
      { tex: reversed.join(',\\;\\; ') },
      { text: `Times ${multipliers(k, 3)} in turn:` },
      {
        tex: chain(
          `&${reversed[1]} \\times ${factor(String(k))} = ${q[1]}`,
          `&${factor(String(reversed[2]))} \\times ${k * k} = ${q[2]}`,
          `&${factor(String(reversed[3]))} \\times ${factor(String(k ** 3))} = ${q[3]}`,
        ),
      },
      { tex: `${polyTex(q)} = 0` },
    ];
  },
};

interface RecipValueParams {
  p: Poly;
  ask: number;
}

/** What is asked, for two roots or three. */
const RECIP_LABELS: Record<number, string[]> = {
  2: ['\\frac{1}{\\alpha} + \\frac{1}{\\beta}', '\\frac{1}{\\alpha\\beta}'],
  3: [
    '\\frac{1}{\\alpha} + \\frac{1}{\\beta} + \\frac{1}{\\gamma}',
    '\\frac{1}{\\alpha\\beta} + \\frac{1}{\\beta\\gamma} + \\frac{1}{\\gamma\\alpha}',
    '\\frac{1}{\\alpha\\beta\\gamma}',
  ],
};

/** The sum, pair sum or product of the roots of the reversed equation, as a fraction [top, bottom]. */
function recipValue(p: Poly, ask: number): [number, number] {
  const q = recipRoots(p, 1);
  const sign = ask % 2 === 0 ? -1 : 1;
  return [sign * q[ask + 1], q[0]];
}

/** Σ1/α, Σ1/(αβ) or 1/(αβγ), read off the equation with reciprocal roots. */
const polyTrRecipValue: Generator<RecipValueParams> = {
  id: 'poly-tr-recip-value',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const n = hard ? 3 : rng.pick([2, 3]);
    const p = samplePoly(rng, n, hard ? rng.pick([1, 2, 3, -2]) : 1, hard ? 5 : 6);
    return { p, ask: hard ? rng.int(0, 2) : 0 };
  },
  render: ({ p, ask }): Slide => {
    const n = p.length - 1;
    const [top, bottom] = recipValue(p, ask);
    return {
      kind: 'expression',
      prompt: [
        say(`${rootNames(n)} are the roots of $${polyTex(p)} = 0$. Use the equation with roots ${rootNames(n, kOver(1))} to find this value.`),
      ],
      lead: `${RECIP_LABELS[n][ask]} =`,
      keypad: [],
      answer: fracAnswer(top, bottom),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ p, ask }) => {
    const n = p.length - 1;
    const q = recipRoots(p, 1);
    const which = ['sum of its roots', n === 2 ? 'product of its roots' : 'sum of its roots in pairs', 'product of its roots'][ask];
    const rule = ['-\\frac{b}{a}', '\\frac{c}{a}', '-\\frac{d}{a}'][ask];
    return [
      { text: 'Substituting ${x \\to \\frac{1}{x}}$ reverses the coefficients:' },
      { tex: `${polyTex(q)} = 0` },
      { text: `Its roots are the reciprocals, so the value asked for is the ${which}, $${rule}$:` },
      { tex: ratioLine(RECIP_LABELS[n][ask], q[ask + 1], q[0], ask % 2 === 0) },
    ];
  },
};

/* ================================================================
 * Lesson 4: squared roots
 * ================================================================ */

interface MonicParams {
  p: Poly;
}

function sampleMonic(rng: Rng, difficulty: number): MonicParams {
  const hard = difficulty > 1;
  return { p: samplePoly(rng, hard ? 3 : 2, 1, hard ? 4 : 6) };
}

/** The old sums, then the sums of the squares, then (for two roots) the new coefficients. */
const polyTrSquareSumsTree: Generator<MonicParams> = {
  id: 'poly-tr-square-sums-tree',
  sample: sampleMonic,
  render: ({ p }): Slide => {
    if (p.length === 3) {
      const [, b, c] = p;
      const s = -b;
      const S = s * s - 2 * c;
      const values = [s, c, S, c * c, -S, c * c];
      return {
        kind: 'tree',
        prompt: [
          say(
            `$\\alpha$ and $\\beta$ are the roots of the equation below. Top row: $\\alpha + \\beta$ and $\\alpha\\beta$. Then $\\alpha^{2} + \\beta^{2}$, which is $(\\alpha + \\beta)^{2} - 2\\alpha\\beta$, and $\\alpha^{2}\\beta^{2}$.`,
          ),
          say('Last, the equation with roots $\\alpha^{2}$ and $\\beta^{2}$ is $x^{2} + Bx + C = 0$: fill in $B$, then $C$.'),
        ],
        expression: `${polyTex(p)} = 0`,
        nodes: [
          { id: 's', from: [] },
          { id: 'p', from: [] },
          { id: 'S', from: ['s', 'p'] },
          { id: 'P', from: ['p'] },
          { id: 'B', from: ['S'] },
          { id: 'C', from: ['P'] },
        ],
        bank: numberBank(values, [b, -c, s * s + 2 * c, 2 * c, S + 4 * c], String, 2),
        answer: values.map(String),
      };
    }
    const [, b, c, d] = p;
    const [s1, s2, s3] = [-b, c, -d];
    const values = [s1, s2, s3, s1 * s1 - 2 * s2, s2 * s2 - 2 * s1 * s3, s3 * s3];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${rootNames(3)} are the roots of the equation below. Top row: $\\Sigma\\alpha$, $\\Sigma\\alpha\\beta$ and $\\alpha\\beta\\gamma$. Underneath, the same for the squared roots:`,
        ),
        say('$\\Sigma\\alpha^{2} = (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta$, then $\\Sigma\\alpha^{2}\\beta^{2} = (\\Sigma\\alpha\\beta)^{2} - 2\\alpha\\beta\\gamma\\Sigma\\alpha$, then $(\\alpha\\beta\\gamma)^{2}$.'),
      ],
      expression: `${polyTex(p)} = 0`,
      nodes: [
        { id: 's1', from: [] },
        { id: 's2', from: [] },
        { id: 's3', from: [] },
        { id: 'S1', from: ['s1', 's2'] },
        { id: 'S2', from: ['s1', 's2', 's3'] },
        { id: 'S3', from: ['s3'] },
      ],
      bank: numberBank(values, [b, -c, d, s1 * s1 + 2 * s2, s2 * s2 + 2 * s1 * s3, -s3 * s3], String, 2),
      answer: values.map(String),
    };
  },
  solution: ({ p }) => {
    const q = squareRoots(p);
    if (p.length === 3) {
      const [, b, c] = p;
      const s = -b;
      return [
        { tex: chain(`\\alpha + \\beta &= ${s}`, `\\alpha\\beta &= ${c}`) },
        { tex: chain(`\\alpha^{2} + \\beta^{2} &= ${factor(String(s))}^{2} - ${twice(c)}`, `&= ${s * s - 2 * c}`, `\\alpha^{2}\\beta^{2} &= ${factor(String(c))}^{2} = ${c * c}`) },
        { text: 'Minus the sum, then the product:' },
        { tex: `${polyTex(q)} = 0` },
      ];
    }
    const [, b, c, d] = p;
    const [s1, s2, s3] = [-b, c, -d];
    const f = (v: number) => factor(String(v));
    return [
      { tex: chain(`\\Sigma\\alpha &= ${s1}`, `\\Sigma\\alpha\\beta &= ${s2}`, `\\alpha\\beta\\gamma &= ${s3}`) },
      {
        tex: chain(
          `\\Sigma\\alpha^{2} &= ${f(s1)}^{2} - ${twice(s2)} = ${s1 * s1 - 2 * s2}`,
          `\\Sigma\\alpha^{2}\\beta^{2} &= ${f(s2)}^{2} - ${twice(s3, s1)}`,
          `&= ${s2 * s2 - 2 * s1 * s3}`,
          `(\\alpha\\beta\\gamma)^{2} &= ${f(s3)}^{2} = ${s3 * s3}`,
        ),
      },
      { text: 'Minus, plus, minus:' },
      { tex: `${polyTex(q)} = 0` },
    ];
  },
};

/** The line after squaring, with x written for x², multiplied out. */
const polyTrSquareSubSteps: Generator<MonicParams> = {
  id: 'poly-tr-square-sub-steps',
  sample: sampleMonic,
  render: ({ p }): Slide => {
    const q = squareRoots(p);
    const whole = `${polyTex(q)} = 0`;
    if (p.length === 3) {
      const [, b, c] = p;
      const lhs = [1, 2 * c, c * c];
      const wrong = [
        [1, 2 * c + b * b, c * c],
        [1, b * b - 2 * c, c * c],
        [1, 2 * c - Math.abs(b), c * c],
      ];
      return {
        kind: 'steps',
        prompt: [
          say(
            `$${polyTex(p)} = 0$ has roots $\\alpha$ and $\\beta$. Moved to $x^{2} ${signedNum(c)} = ${termTex(-b, 1)}$, squared, and with $x$ written for $x^{2}$, it becomes the line below, whose roots are $\\alpha^{2}$ and $\\beta^{2}$. Tap the part you would work out **next**, then choose what it comes to.`,
          ),
        ],
        start: [`(${linTex(-c)})^{2}`, '=', termTex(b * b, 1)],
        reductions: [
          { span: [0, 1], value: polyTex(lhs), bank: stepBank(polyTex(lhs), polyTex([1, c, c * c]), polyTex([1, 0, c * c]), polyTex([1, 2 * c, 2 * c])) },
          { span: [0, 3], value: whole, bank: stepBank(whole, ...wrong.map((v) => `${polyTex(v)} = 0`)) },
        ],
      };
    }
    const [, b, c, d] = p;
    const lhs = [1, 2 * c, c * c, 0];
    const rhs = [b * b, 2 * b * d, d * d];
    const wrong = [
      [1, 2 * c + b * b, c * c + 2 * b * d, -d * d],
      [1, 2 * c - b * b, c * c - 2 * b * d, d * d],
      [1, 2 * c - b * b, c * c + 2 * b * d, -d * d],
    ];
    return {
      kind: 'steps',
      prompt: [
        say(
          `$${polyTex(p)} = 0$ has roots ${rootNames(3)}. Moved to $x(x^{2} ${signedNum(c)}) = ${polyTex([-b, 0, -d])}$, squared, and with $x$ written for $x^{2}$, it becomes the line below, whose roots are the squares. Tap the part you would work out **next**, then choose what it comes to.`,
        ),
      ],
      start: [`x(${linTex(-c)})^{2}`, '=', `(${polyTex([-b, -d])})^{2}`],
      reductions: [
        {
          span: [0, 1],
          value: polyTex(lhs),
          bank: stepBank(polyTex(lhs), polyTex([1, c, c * c, 0]), polyTex([1, 2 * c, c * c]), polyTex([1, 2 * c, 2 * c, 0])),
        },
        {
          span: [2, 3],
          value: polyTex(rhs),
          bank: stepBank(polyTex(rhs), polyTex([b * b, 0, d * d]), polyTex([b * b, b * d, d * d]), polyTex([b * b, 2 * b * d, 2 * d])),
        },
        { span: [0, 3], value: whole, bank: stepBank(whole, ...wrong.map((v) => `${polyTex(v)} = 0`)) },
      ],
    };
  },
  solution: ({ p }) => {
    const q = squareRoots(p);
    if (p.length === 3) {
      const [, b, c] = p;
      return [
        { text: 'Keep the odd power on one side, square, and write $x$ for $x^{2}$:' },
        {
          tex: chain(
            `x^{2} ${signedNum(c)} &= ${termTex(-b, 1)}`,
            `(x^{2} ${signedNum(c)})^{2} &= ${termTex(b * b, 2)}`,
            `(${linTex(-c)})^{2} &= ${termTex(b * b, 1)}`,
          ),
        },
        { text: 'Multiply out and collect on one side:' },
        { tex: chain(`${polyTex([1, 2 * c, c * c])} &= ${termTex(b * b, 1)}`, `${polyTex(q)} &= 0`) },
      ];
    }
    const [, b, c, d] = p;
    return [
      { text: 'Keep the odd powers on one side, square, and write $x$ for $x^{2}$:' },
      {
        tex: chain(
          `x(x^{2} ${signedNum(c)}) &= ${polyTex([-b, 0, -d])}`,
          `x(${linTex(-c)})^{2} &= (${polyTex([-b, -d])})^{2}`,
        ),
      },
      { text: 'Multiply out both sides:' },
      { tex: chain(`&${polyTex([1, 2 * c, c * c, 0])}`, `=\\;&${polyTex([b * b, 2 * b * d, d * d])}`) },
      { text: 'Collect on one side:' },
      { tex: `${polyTex(q)} = 0` },
    ];
  },
};

interface SquareValueParams extends MonicParams {
  power: number;
}

/** One coefficient of the equation with squared roots. */
const polyTrSquareValue: Generator<SquareValueParams> = {
  id: 'poly-tr-square-value',
  sample: (rng, difficulty) => {
    const { p } = sampleMonic(rng, difficulty);
    return { p, power: difficulty > 1 ? rng.pick([2, 1]) : rng.pick([1, 0]) };
  },
  choices: ({ p, power }) => {
    const n = p.length - 1;
    const value = squareRoots(p)[n - power];
    const [, b, c] = p;
    const d = p[3] ?? 0;
    const slips =
      n - power === 1
        ? [b * b - 2 * c, 2 * c + b * b, -value, 2 * c - b]
        : n === 3 && power === 1
          ? [c * c + 2 * b * d, -value, c * c - b * d, c * c]
          : [-value, 2 * c, c];
    return intOptions(value, slips);
  },
  render: ({ p, power }): Slide => {
    const n = p.length - 1;
    return {
      kind: 'expression',
      prompt: [
        say(
          `${rootNames(n)} are the roots of $${polyTex(p)} = 0$. The equation with roots ${rootNames(n, (g) => `${g}^{2}`)} has leading coefficient $1$. Find its ${coefWords(power)}.`,
        ),
      ],
      lead: coefLead(power),
      keypad: [],
      answer: String(squareRoots(p)[n - power]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ p, power }) => {
    const n = p.length - 1;
    const value = squareRoots(p)[n - power];
    const [, b, c] = p;
    const f = (v: number) => factor(String(v));
    if (n === 2) {
      return power === 1
        ? [
            { tex: chain(`\\alpha + \\beta &= ${-b}`, `\\alpha\\beta &= ${c}`) },
            { tex: `\\alpha^{2} + \\beta^{2} = ${f(-b)}^{2} - ${twice(c)} = ${b * b - 2 * c}` },
            { text: `The coefficient of $x$ is minus the sum of the new roots: $${value}$.` },
          ]
        : [
            { tex: `\\alpha\\beta = ${c}` },
            { text: `The constant is the product of the new roots, $\\alpha^{2}\\beta^{2} = ${f(c)}^{2} = ${value}$.` },
          ];
    }
    const d = p[3];
    const [s1, s2, s3] = [-b, c, -d];
    return power === 2
      ? [
          { tex: chain(`\\Sigma\\alpha &= ${s1}`, `\\Sigma\\alpha\\beta &= ${s2}`) },
          { tex: `\\Sigma\\alpha^{2} = ${f(s1)}^{2} - ${twice(s2)} = ${s1 * s1 - 2 * s2}` },
          { text: `The coefficient of $x^{2}$ is minus the sum of the new roots: $${value}$.` },
        ]
      : [
          { tex: chain(`\\Sigma\\alpha &= ${s1}`, `\\Sigma\\alpha\\beta &= ${s2}`, `\\alpha\\beta\\gamma &= ${s3}`) },
          { tex: chain(`\\Sigma\\alpha^{2}\\beta^{2} &= ${f(s2)}^{2} - ${twice(s3, s1)}`, `&= ${value}`) },
          { text: `The coefficient of $x$ is the sum of the new roots in pairs: $${value}$.` },
        ];
  },
};

/* ================================================================
 * Lesson 5: choosing a substitution
 * ================================================================ */

type SubType = 'scale' | 'shift' | 'recip' | 'square' | 'combo';

interface SubFlowParams {
  p: Poly;
  type: SubType;
  k: number;
}

interface Sub {
  /** The substitution's right-hand side: x → this. */
  label: string;
  /** The roots it gives, written in α. */
  root: string;
}

function comboLabel(k: number): string {
  return `\\frac{1 ${k > 0 ? '-' : '+'} ${coefMark(Math.abs(k))}x}{x}`;
}

/** The right substitution and two wrong ones, each with the roots it gives. */
function subsFor({ type, k }: SubFlowParams): Sub[] {
  const recip: Sub = { label: '\\frac{1}{x}', root: '\\frac{1}{\\alpha}' };
  switch (type) {
    case 'scale':
      return [
        { label: xOver(k), root: `${coefMark(k)}\\alpha` },
        { label: `${coefMark(k)}x`, root: `${k < 0 ? '-' : ''}\\frac{\\alpha}{${Math.abs(k)}}` },
        { label: linTex(k), root: `\\alpha ${signedNum(k)}` },
      ];
    case 'shift':
      return [
        { label: linTex(k), root: `\\alpha ${signedNum(k)}` },
        { label: linTex(-k), root: `\\alpha ${signedNum(-k)}` },
        recip,
      ];
    case 'recip':
      return [recip, { label: '-x', root: '-\\alpha' }, { label: 'x^{2}', root: '\\pm\\sqrt{\\alpha}' }];
    case 'square':
      return [{ label: '\\sqrt{x}', root: '\\alpha^{2}' }, { label: 'x^{2}', root: '\\pm\\sqrt{\\alpha}' }, recip];
    case 'combo':
      return [
        { label: comboLabel(k), root: `\\frac{1}{\\alpha ${signedNum(k)}}` },
        { label: `\\frac{1}{${linTex(k)}}`, root: `\\frac{1}{\\alpha} ${signedNum(k)}` },
        recip,
      ];
  }
}

/** The new equation, leading coefficient positive, and the slips offered beside it. */
function subEquations({ p, type, k }: SubFlowParams): { q: Poly; slips: Poly[] } {
  const n = p.length - 1;
  switch (type) {
    case 'scale': {
      const q = scaleRoots(p, k);
      return { q, slips: [p.map((c, i) => (i === 0 ? c : c * k)), q.map((c, i) => (i % 2 === 1 ? -c : c))] };
    }
    case 'shift': {
      const q = shiftRoots(p, k);
      return { q, slips: [shiftRoots(p, -k), q.map((c, i) => (i === n ? -c : c))] };
    }
    case 'recip': {
      const q = positive(recipRoots(p, 1));
      return { q, slips: [q.map((c, i) => (i % 2 === 1 ? -c : c)), p] };
    }
    case 'square': {
      const q = squareRoots(p);
      const [, b, c, d] = p;
      return { q, slips: [[1, b * b - 2 * c, c * c - 2 * b * d, -d * d], [1, 2 * c - b * b, c * c + 2 * b * d, -d * d]] };
    }
    case 'combo': {
      const q = positive(comboRoots(p, k));
      return { q, slips: [positive(comboRoots(p, -k)), shiftRoots(recipRoots(p, 1), k)] };
    }
  }
}

/** Which substitution gives the roots asked for, then which equation it gives. */
const polyTrSubFlow: Generator<SubFlowParams> = {
  id: 'poly-tr-sub-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const p = samplePoly(rng, hard ? 3 : 2, 1, hard ? 3 : 5);
      const type: SubType = rng.pick(hard ? ['shift', 'recip', 'square', 'combo', 'combo'] : ['scale', 'shift', 'recip']);
      const k =
        type === 'scale'
          ? rng.pick([2, 3, -2])
          : type === 'shift'
            ? rng.pick([1, 2, 3, -1, -2, -3])
            : type === 'combo'
              ? rng.pick([1, -1])
              : 1;
      const params = { p, type, k };
      const { q } = subEquations(params);
      // A root at -k has no 1/(α + k); a zero leading term has lost a root.
      if (q.length !== p.length || q.some((c) => Math.abs(c) > 99)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { p } = params;
    const n = p.length - 1;
    const [right, ...wrongs] = subsFor(params);
    const { q, slips } = subEquations(params);
    const key = `${polyTex(p)}|${right.label}`;
    const subBranches = [
      { label: `$x \\to ${right.label}$`, to: 'eq' },
      ...wrongs.map((w) => ({
        label: `$x \\to ${w.label}$`,
        outcome: `That gives roots $${w.root}$: the new root is what $x$ must be for the substitution to land on $\\alpha$.`,
      })),
    ];
    const good = `$${polyTex(q)} = 0$`;
    const seen = new Set([good]);
    const eqBranches: { label: string; outcome: string }[] = [
      { label: good, outcome: `Right: its roots are ${rootNames(n, (g) => right.root.replace(/\\alpha/g, g))}.` },
    ];
    for (const slip of slips.map(positive)) {
      const label = `$${polyTex(slip)} = 0$`;
      if (proportional(slip, q) || seen.has(label)) continue;
      seen.add(label);
      eqBranches.push({ label, outcome: 'Not quite: substitute again and multiply out one term at a time, watching the signs.' });
    }
    if (eqBranches.length < 2) {
      const extra = addPoly(q, [1]);
      eqBranches.push({ label: `$${polyTex(extra)} = 0$`, outcome: 'Not quite: check the constant term.' });
    }
    const target = right.root;
    return {
      kind: 'flow',
      prompt: [
        say(`${rootNames(n)} are the roots of the equation below. Find the equation whose roots are ${rootNames(n, (g) => target.replace(/\\alpha/g, g))}.`),
      ],
      subject: `${polyTex(p)} = 0`,
      steps: [
        { id: 'sub', ask: `Which substitution gives roots $${target}$?`, branches: turned(subBranches, key) },
        { id: 'eq', ask: 'Which equation does it give?', branches: turned(eqBranches, `${key}|eq`) },
      ],
      answer: [`$x \\to ${right.label}$`, good],
    };
  },
  solution: (params) => {
    const { p, type, k } = params;
    const [right] = subsFor(params);
    const { q } = subEquations(params);
    const n = p.length - 1;
    const first: SolutionStep = {
      text: `A new root $y = ${right.root}$ means $\\alpha = ${right.label.replace(/x/g, 'y')}$, so substitute $${to(right.label)}$.`,
    };
    switch (type) {
      case 'scale':
        return [first, ...scaleWorking(p, k).slice(1)];
      case 'shift':
        return [first, ...shiftWorking(p, k)];
      case 'recip':
        return [first, { text: `Multiplying by $x^{${n}}$ reverses the coefficients${q[0] === p[n] ? '' : ', and multiplying by $-1$ makes the leading one positive'}:` }, { tex: `${polyTex(q)} = 0` }];
      case 'square':
        return [
          first,
          { text: 'Keep the odd powers on one side, square, and write $x$ for $x^{2}$:' },
          { tex: `x(${linTex(-p[2])})^{2} = (${polyTex([-p[1], -p[3]])})^{2}` },
          { tex: `${polyTex(q)} = 0` },
        ];
      case 'combo': {
        const raw = comboRoots(p, k);
        return [
          first,
          { text: `Multiply through by $x^{${n}}$, so each term of $p$ becomes a power of $(${k > 0 ? '1 - x' : '1 + x'})$ times a power of $x$, and collect:` },
          { tex: `${polyTex(raw)} = 0` },
          ...(raw[0] < 0 ? [{ text: 'Times $-1$:' }, { tex: `${polyTex(q)} = 0` }] : []),
        ];
      }
    }
  },
};

interface UsingParams {
  p: Poly;
  k: number;
  /** 0: Σ 1/(α + k); 1: Σ (α + k)(β + k); 2: the product (α + k)(β + k)(γ + k). */
  ask: number;
}

/** The value asked for from the shifted equation's coefficients, as [top, bottom]. */
function usingValue({ p, k, ask }: UsingParams): [number, number] {
  const q = shiftRoots(p, k);
  const n = p.length - 1;
  if (ask === 0) return [-q[n - 1], q[n]];
  if (ask === 1) return [q[2], q[0]];
  return [-q[3], q[0]];
}

function usingLabel({ p, k, ask }: UsingParams): string {
  const s = signedNum(k);
  if (p.length === 3) return `\\frac{1}{\\alpha ${s}} + \\frac{1}{\\beta ${s}}`;
  if (ask === 0) return `\\Sigma\\frac{1}{\\alpha ${s}}`;
  if (ask === 1) return `\\Sigma(\\alpha ${s})(\\beta ${s})`;
  return `(\\alpha ${s})(\\beta ${s})(\\gamma ${s})`;
}

/** A value of the roots found from a transformed equation, without the roots. */
const polyTrUsingValue: Generator<UsingParams> = {
  id: 'poly-tr-using-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const p = samplePoly(rng, hard ? 3 : 2, hard ? rng.pick([1, 2]) : 1, hard ? 4 : 5);
      const k = rng.pick([1, 2, -1, -2]);
      const params = { p, k, ask: hard ? rng.int(0, 2) : 0 };
      const [top, bottom] = usingValue(params);
      if (bottom === 0 || top === 0) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { p, k } = params;
    const n = p.length - 1;
    const [top, bottom] = usingValue(params);
    return {
      kind: 'expression',
      prompt: [
        say(`${rootNames(n)} are the roots of $${polyTex(p)} = 0$. Use the equation with roots ${rootNames(n, plusK(k))} to find this value.`),
      ],
      lead: `${usingLabel(params)} =`,
      keypad: [],
      answer: fracAnswer(top, bottom),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { p, k, ask } = params;
    const n = p.length - 1;
    const q = shiftRoots(p, k);
    const tail: SolutionStep[] =
      ask === 0
        ? [
            { text: `Its roots are ${rootNames(n, plusK(k))}. The sum of their reciprocals is the sum of the roots${n === 2 ? '' : ' in pairs'} over their product, which comes to minus the coefficient of $x$ over the constant:` },
            { tex: ratioLine(usingLabel(params), q[n - 1], q[n], true) },
          ]
        : ask === 1
          ? [
              { text: 'The sum of its roots in pairs is $\\frac{c}{a}$:' },
              { tex: ratioLine(usingLabel(params), q[2], q[0], false) },
            ]
          : [
              { text: 'The product of its roots is $-\\frac{d}{a}$:' },
              { tex: ratioLine(usingLabel(params), q[3], q[0], true) },
            ];
    return [...shiftWorking(p, k), ...tail];
  },
};

export const rootsTransformGenerators = [
  polyTrScaleTiles,
  polyTrScaleTree,
  polyTrScaleValue,
  polyTrShiftSteps,
  polyTrShiftTiles,
  polyTrShiftValue,
  polyTrRecipTiles,
  polyTrRecipTree,
  polyTrRecipValue,
  polyTrSquareSumsTree,
  polyTrSquareSubSteps,
  polyTrSquareValue,
  polyTrSubFlow,
  polyTrUsingValue,
] as Generator<unknown>[];
