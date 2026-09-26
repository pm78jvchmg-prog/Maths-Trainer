/**
 * Algebraic Fractions, level 8: factorising to simplify.
 *
 * Level 1 cancels a bracket that is already in view, a number out of a linear
 * top, x^2 - s^2 and a bracket written backwards. This level is about the
 * factorising that has to happen first: a number and a power of x taken out
 * together, a difference of two squares with a number in front of x^2 (and
 * one hiding behind a common factor), a quadratic with a number in front by
 * the ac method, cubics by a common x or by grouping, and all of it used to
 * shrink a product, a quotient or a sum before it is worked out.
 *
 * Every line is held as a `Fac`: a number, a power of x and linear brackets
 * ax + b, each bracket with nothing common to a and b. The question is the
 * product multiplied out; the answer is what is left when the shared factors
 * are divided out of both lines. So every simplified form, and every value at
 * a hole, is whole or a plain fraction by construction.
 *
 * As everywhere in this course the learner never types a fraction or a
 * polynomial (PITFALLS 3.4): forms go through tiles, trees, steps, flows and
 * choices; only numbers are typed.
 */
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { termTex } from './calculus';
import { fracTex as numberTex, gcd, say } from './format';
import { type Poly, mulPoly, polyTex, valueAt } from './polynomials';
import {
  chain,
  contentOf,
  distinct,
  frac,
  nonZero,
  paren,
  polyMath,
  show,
  signed,
  signedTerm,
  stepBank,
  tileBank,
  turned,
} from './algebraicFractions';

/* ================================================================
 * The factor model
 * ================================================================ */

/** ax + b, with a > 0, b not 0, and nothing common to a and b. */
interface Lin {
  a: number;
  b: number;
}

/** k times x^e times its brackets: every factorised line in this level. */
interface Fac {
  k: number;
  e: number;
  lins: Lin[];
}

/** Top and bottom. */
type Fraction = [Fac, Fac];

const linTex = ({ a, b }: Lin): string => `${termTex(a, 1)} ${signed(b)}`;
/** The same bracket with its number's sign turned: the other half of a difference of two squares. */
const flip = ({ a, b }: Lin): Lin => ({ a, b: -b });
const same = (p: Lin, q: Lin): boolean => p.a === q.a && p.b === q.b;
const monic = (b: number): Lin => ({ a: 1, b });
const brackets = (...lins: Lin[]): Fac => ({ k: 1, e: 0, lins });
const isOne = ({ k, e, lins }: Fac): boolean => k === 1 && e === 0 && lins.length === 0;

function expand({ k, e, lins }: Fac): Poly {
  let p: Poly = [k];
  for (const { a, b } of lins) p = mulPoly(p, [a, b]);
  return [...p, ...Array<number>(e).fill(0)];
}

const xTex = (e: number): string => (e === 0 ? '' : e === 1 ? 'x' : `x^{${e}}`);

/** A factorised line as the learner reads it: 3x(2x + 3), (x - 2)(x + 2), 2x - 5, 4. */
function facTex({ k, e, lins }: Fac): string {
  if (k === 1 && e === 0 && lins.length === 1) return linTex(lins[0]);
  const front = `${k === 1 ? '' : k === -1 ? '-' : k}${xTex(e)}`;
  const inside = lins.map((l) => `(${linTex(l)})`).join('');
  if (inside === '' && (front === '' || front === '-')) return `${front}1`;
  return front + inside;
}

const polyOf = (f: Fac): string => polyTex(expand(f));

/** Divide out everything the two lines share: the number, the power of x, the brackets. */
function cancelled([top, bottom]: Fraction): Fraction {
  const g = gcd(top.k, bottom.k);
  let tk = top.k / g;
  let bk = bottom.k / g;
  if (bk < 0) {
    tk = -tk;
    bk = -bk;
  }
  const e = Math.min(top.e, bottom.e);
  const rest = [...bottom.lins];
  const kept: Lin[] = [];
  for (const l of top.lins) {
    const at = rest.findIndex((m) => same(l, m));
    if (at >= 0) rest.splice(at, 1);
    else kept.push(l);
  }
  return [
    { k: tk, e: top.e - e, lins: kept },
    { k: bk, e: bottom.e - e, lins: rest },
  ];
}

/** A fraction as the learner reads it; a bottom of 1 is not written. */
function fractionTex([top, bottom]: Fraction): string {
  return isOne(bottom) ? facTex(top) : frac(facTex(top), facTex(bottom));
}

const expandedTex = ([top, bottom]: Fraction): string => frac(polyOf(top), polyOf(bottom));
const factorisedTex = ([top, bottom]: Fraction): string => frac(facTex(top), facTex(bottom));

const fractionAt = ([top, bottom]: Fraction, x: number): number => valueAt(expand(top), x) / valueAt(expand(bottom), x);

/** For the grader, which only uses it to prove a distractor wrong. Never displayed. */
const fractionMath = ([top, bottom]: Fraction): string => `((${polyMath(expand(top))})/(${polyMath(expand(bottom))}))`;

/* ---------- keeping options apart by value ---------- */

const PROBES = [0.37, 1.93, -2.71];

/**
 * The items whose values differ from every earlier one, the first kept. Two
 * distractors worth the same are a free elimination, and one worth the same as
 * the answer is a second right answer marked wrong.
 */
function byValue<T>(items: T[], value: (item: T, x: number) => number): T[] {
  const seen: number[][] = [];
  return items.filter((item) => {
    const sig = PROBES.map((x) => value(item, x));
    if (sig.some((v) => !Number.isFinite(v))) return false;
    const clash = seen.some((s) => s.every((v, i) => Math.abs(v - sig[i]) < 1e-9 * Math.max(1, Math.abs(v))));
    if (clash) return false;
    seen.push(sig);
    return true;
  });
}

/** Four fraction options, the right one first, no two worth the same. */
function fractionOptions(right: Fraction, wrong: Fraction[]): ChoiceOption[] {
  const kept = byValue([right, ...wrong], fractionAt).slice(0, 4);
  return options(
    { tex: fractionTex(kept[0]), answer: fractionMath(kept[0]) },
    ...kept.slice(1).map((f) => ({ tex: fractionTex(f), answer: fractionMath(f) })),
  );
}

/** Flow branches from factorised lines, the right one first, no two worth the same. */
function facBranches(right: Fac, wrong: Fac[], to: string, key: string) {
  const kept = byValue([right, ...wrong], (f, x) => valueAt(expand(f), x)).slice(0, 4);
  return turned(kept.map((f) => ({ label: `$${facTex(f)}$`, to })), key);
}

/** Flow leaves from fractions, the right one first, no two worth the same. */
function fractionLeaves(right: Fraction, wrong: Fraction[], key: string) {
  const kept = byValue([right, ...wrong], fractionAt).slice(0, 4);
  return turned(
    kept.map((f) => ({ label: `$${fractionTex(f)}$`, outcome: `So it simplifies to $${fractionTex(f)}$.` })),
    key,
  );
}

const facAt = (f: Fac, x: number): number => valueAt(expand(f), x);

/**
 * A top-and-bottom tiles bank: the answer's two tokens and the wrong tops and
 * bottoms, dropping any worth the same as the token it would stand in for.
 */
function simplifyBank([rt, rb]: Fraction, wrong: Fraction[]): string[] {
  const tops = byValue([rt, ...wrong.map((w) => w[0])], facAt).slice(1);
  const bottoms = byValue([rb, ...wrong.map((w) => w[1])], facAt).slice(1);
  return tileBank([facTex(rt), facTex(rb)], [...tops, ...bottoms].map(facTex));
}

/** Wrong fractions, none worth the same as the right one or each other, written by `write`. */
function fractionSlips(right: Fraction, wrong: Fraction[], write: (f: Fraction) => string): string[] {
  return byValue([right, ...wrong], fractionAt).slice(1).map(write);
}

/** The first bracket's sign turned: flipping both halves of a difference of two squares changes nothing. */
const flipFirst = (f: Fac): Fac => ({ ...f, lins: f.lins.map((l, i) => (i === 0 ? flip(l) : l)) });

/* ---------- sampling ---------- */

function sampleLin(rng: Rng, aMin: number, aMax: number, bMax: number): Lin {
  for (;;) {
    const a = rng.int(aMin, aMax);
    const b = nonZero(rng, bMax);
    if (gcd(a, b) === 1) return { a, b };
  }
}

/** Ax - B for a difference of two squares, A and B sharing nothing. */
function dotsLin(rng: Rng, aMin: number, aMax: number, bMax: number): Lin {
  for (;;) {
    const a = rng.int(aMin, aMax);
    const b = rng.int(1, bMax);
    if (gcd(a, b) === 1) return { a, b: -b };
  }
}

/* ---------- exact values at a fractional x ---------- */

type Rational = [number, number];

function reduced([t, b]: Rational): Rational {
  const g = gcd(t, b) || 1;
  const sign = b < 0 ? -1 : 1;
  return [(sign * t) / g, (sign * b) / g];
}

/** p at x = num/den, exactly. */
function ratAt(p: Poly, num: number, den: number): Rational {
  const n = p.length - 1;
  let top = 0;
  p.forEach((c, i) => {
    top += c * num ** (n - i) * den ** i;
  });
  return reduced([top, den ** n]);
}

const ratTex = ([t, b]: Rational): string => numberTex(t, b);

/** x where the bracket is zero, as the learner reads it: 3, -2, \frac{3}{2}. */
const rootTex = ({ a, b }: Lin): string => numberTex(-b, a);

/** "$6$ and $9$", "$6$, $9$ and $12$". */
function listTex(values: number[]): string {
  const parts = values.map((v) => `$${v}$`);
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/* ================================================================
 * Lesson 1: common factors first
 * ================================================================ */

interface HcfParams {
  g: number;
  e: number;
  /** What is left in the bracket: nothing common to its coefficients, and a number term. */
  inner: Poly;
}

const hcfExpr = ({ g, e, inner }: HcfParams): Poly => [...inner.map((c) => c * g), ...Array<number>(e).fill(0)];

/** Take a number and a power of x out of a line. */
const af8HcfTiles: Generator<HcfParams> = {
  id: 'af8-hcf-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const g = rng.int(2, hard ? 8 : 9);
      const e = hard ? rng.int(1, 2) : 1;
      const inner: Poly = hard && rng.chance(0.5) ? [rng.int(1, 4), nonZero(rng, 7), nonZero(rng, 9)] : [rng.int(1, 6), nonZero(rng, 9)];
      if (contentOf(inner) !== 1) continue;
      return { g, e, inner };
    }
  },
  render: (params): Slide => {
    const { g, e, inner } = params;
    const answer = [termTex(g, e), polyTex(inner)];
    const last = inner.length - 1;
    return {
      kind: 'tiles',
      prompt: [say('Take out the highest common factor.'), show(polyTex(hcfExpr(params)))],
      template: '{0}({1})',
      bank: tileBank(answer, [
        String(g),
        termTex(g, e + 1),
        termTex(1, e),
        polyTex([...inner, 0]),
        polyTex(inner.map((c, i) => (i === last ? c * g : c))),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { g, e, inner } = params;
    const expr = hcfExpr(params);
    const sizes = expr.filter((c) => c !== 0).map(Math.abs);
    return [
      { text: `The largest number dividing ${listTex(sizes)} is $${g}$.` },
      {
        text:
          e === 1
            ? 'Every term has an $x$ in it, so $x$ comes out too.'
            : `Every term has at least $x^{${e}}$ in it, the lowest power on show, so $x^{${e}}$ comes out too.`,
      },
      { text: `Divide each term by $${termTex(g, e)}$ to fill the bracket:` },
      { tex: chain(`&${polyTex(expr)}`, `=\\;&${termTex(g, e)}(${polyTex(inner)})`) },
    ];
  },
};

/**
 * Two lines, each a number and a power of x times a bracket. Difficulty 2
 * leaves a number or an x behind on one line.
 */
function sampleHcfFraction(rng: Rng, difficulty: number): Fraction {
  for (;;) {
    const hard = difficulty > 1;
    const g = rng.int(2, hard ? 5 : 6);
    const e = hard ? rng.int(1, 2) : 1;
    const L1 = sampleLin(rng, 1, 4, 9);
    const L2 = sampleLin(rng, 1, 3, 9);
    if (same(L1, L2)) continue;
    let [m, n, et, eb] = [1, 1, 0, 0];
    if (hard) {
      m = rng.int(1, 4);
      n = rng.int(1, 4);
      if (gcd(m, n) !== 1) continue;
      const extra = e === 1 ? rng.int(0, 1) : 0;
      if (rng.chance(0.5)) et = extra;
      else eb = extra;
      if (m === 1 && n === 1 && et + eb === 0) continue;
    }
    return [
      { k: g * m, e: e + et, lins: [L1] },
      { k: g * n, e: e + eb, lins: [L2] },
    ];
  }
}

/** The usual ways of cancelling the common factor wrongly. */
function hcfWrongs([top, bottom]: Fraction): Fraction[] {
  const [rt, rb] = cancelled([top, bottom]);
  const g = gcd(top.k, bottom.k);
  return [
    [{ ...rt, k: rt.k * g }, rb],
    [{ ...rt, e: rt.e + 1 }, rb],
    [{ ...rt, lins: rt.lins.map(flip) }, rb],
    [rt, { ...rb, e: rb.e + 1 }],
    [rt, { ...rb, lins: rb.lins.map(flip) }],
  ];
}

function hcfSolution(fraction: Fraction): SolutionStep[] {
  const [top, bottom] = fraction;
  const shared = facTex({ k: gcd(top.k, bottom.k), e: Math.min(top.e, bottom.e), lins: [] });
  return [
    { text: 'Take the highest common factor out of the top and out of the bottom:' },
    { tex: chain(`&${expandedTex(fraction)}`, `=\\;&${factorisedTex(fraction)}`) },
    { text: `Both lines have the factor $${shared}$, so it cancels:` },
    { tex: fractionTex(cancelled(fraction)) },
  ];
}

/** Simplify a fraction whose lines each have a common factor to take out. */
const af8HcfSimplify: Generator<Fraction> = {
  id: 'af8-hcf-simplify',
  sample: sampleHcfFraction,
  choices: (fraction) => fractionOptions(cancelled(fraction), hcfWrongs(fraction)),
  render: (fraction): Slide => {
    const [rt, rb] = cancelled(fraction);
    const answer = [facTex(rt), facTex(rb)];
    return {
      kind: 'tiles',
      prompt: [say('Simplify fully.'), show(expandedTex(fraction))],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: simplifyBank([rt, rb], hcfWrongs(fraction)),
      answer,
    };
  },
  solution: hcfSolution,
};

/** A factorised line with the common factor taken out wrongly. */
function hcfSlips(f: Fac): Fac[] {
  const [l] = f.lins;
  return [
    { ...f, lins: [flip(l)] },
    { ...f, lins: [{ a: l.a, b: l.b * f.k }] },
    { ...f, e: f.e - 1 },
    { ...f, lins: [{ a: l.a * f.k, b: l.b }] },
  ];
}

/** Take out each line's common factor, then cancel: one decision at a time. */
const af8HcfFlow: Generator<Fraction> = {
  id: 'af8-hcf-flow',
  sample: sampleHcfFraction,
  render: (fraction): Slide => {
    const [top, bottom] = fraction;
    const result = cancelled(fraction);
    const key = expandedTex(fraction);
    return {
      kind: 'flow',
      prompt: [say('Simplify this fraction. Each answer decides what is asked next.')],
      subject: expandedTex(fraction),
      steps: [
        {
          id: 'top',
          ask: 'Take the highest common factor out of the top. Which is it?',
          branches: facBranches(top, hcfSlips(top), 'bottom', `${key}top`),
        },
        {
          id: 'bottom',
          ask: 'And out of the bottom?',
          branches: facBranches(bottom, hcfSlips(bottom), 'left', `${key}bottom`),
        },
        {
          id: 'left',
          ask: 'Cancel what the two lines share. What is left?',
          branches: fractionLeaves(result, hcfWrongs(fraction), `${key}left`),
        },
      ],
      answer: [`$${facTex(top)}$`, `$${facTex(bottom)}$`, `$${fractionTex(result)}$`],
    };
  },
  solution: hcfSolution,
};

/** The value a fraction that cancels x takes at x = 0, from its simplified form. */
function holeAtZero(fraction: Fraction): number {
  const [rt, rb] = cancelled(fraction);
  return valueAt(expand(rt), 0) / valueAt(expand(rb), 0);
}

/**
 * x cancels completely, so the fraction is undefined at 0 and its simplified
 * form is not. Difficulty 2 has numbers left over and x^2 on both lines.
 */
const af8HcfHole: Generator<Fraction> = {
  id: 'af8-hcf-hole',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const g = rng.int(2, 6);
      const e = hard ? rng.int(1, 2) : 1;
      const L1 = sampleLin(rng, 1, 4, 12);
      const L2 = sampleLin(rng, 1, 3, 6);
      if (same(L1, L2)) continue;
      const [m, n] = hard ? [rng.int(1, 4), rng.int(1, 3)] : [1, 1];
      if (gcd(m, n) !== 1) continue;
      const fraction: Fraction = [
        { k: g * m, e, lins: [L1] },
        { k: g * n, e, lins: [L2] },
      ];
      const value = holeAtZero(fraction);
      if (!Number.isInteger(value) || value === 0) continue;
      return fraction;
    }
  },
  render: (fraction): Slide => ({
    kind: 'expression',
    prompt: [
      show(expandedTex(fraction)),
      say('This is undefined at $x = 0$. Simplify it, then give the value the simplified form takes at $x = 0$.'),
    ],
    lead: '\\text{value} =',
    keypad: [],
    answer: String(holeAtZero(fraction)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (fraction) => {
    const [rt, rb] = cancelled(fraction);
    const top = valueAt(expand(rt), 0);
    const bottom = valueAt(expand(rb), 0);
    return [
      ...hcfSolution(fraction),
      { text: 'At $x = 0$ every term with an $x$ in it is zero, which leaves the numbers:' },
      { tex: `${frac(String(top), String(bottom))} = ${holeAtZero(fraction)}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: differences of two squares
 * ================================================================ */

interface DotsParams {
  k: number;
  /** Ax - B. */
  minus: Lin;
}

const dotsPoly = ({ k, minus }: DotsParams): Poly => [k * minus.a * minus.a, 0, -k * minus.b * minus.b];

/** Factorise A^2x^2 - B^2, or k times it with the k to take out first. */
const af8DotsTiles: Generator<DotsParams> = {
  id: 'af8-dots-tiles',
  sample: (rng, difficulty) =>
    difficulty > 1 ? { k: rng.int(2, 5), minus: dotsLin(rng, 1, 4, 9) } : { k: 1, minus: dotsLin(rng, 2, 6, 11) },
  render: (params): Slide => {
    const { k, minus } = params;
    const plus = flip(minus);
    const A = minus.a;
    const B = -minus.b;
    const pair = [linTex(minus), linTex(plus)];
    const answer = k === 1 ? pair : [String(k), ...pair];
    return {
      kind: 'tiles',
      prompt: [say('Factorise fully.'), show(polyTex(dotsPoly(params)))],
      template: k === 1 ? '({0})({1})' : '{0}({1})({2})',
      bank: tileBank(answer, [
        `${termTex(A * A, 1)} - ${B}`,
        `${termTex(A, 1)} - ${B * B}`,
        `${termTex(A, 1)} + ${B * B}`,
        ...(k === 1 ? [] : [String(k * A * A), `${termTex(k * A, 1)} - ${k * B}`]),
      ]),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const { k, minus } = params;
    const A = minus.a;
    const B = -minus.b;
    const inner = polyTex([A * A, 0, -B * B]);
    const pair = `(${linTex(minus)})(${linTex(flip(minus))})`;
    const steps: SolutionStep[] = [];
    if (k > 1) {
      steps.push({ text: `Every coefficient is a multiple of $${k}$, so take it out first:` });
      steps.push({ tex: chain(`&${polyTex(dotsPoly(params))}`, `=\\;&${k}(${inner})`) });
    }
    steps.push({
      // With nothing in front of x^2 there is no (1x)^2 or (x)^2 to write: x^2 is already the square.
      text:
        A === 1
          ? `$x^{2}$ is the square of $x$ and $${B * B} = ${B}^{2}$, so $${inner}$ is a difference of two squares:`
          : `$${termTex(A * A, 2)} = (${termTex(A, 1)})^{2}$ and $${B * B} = ${B}^{2}$, so $${inner}$ is a difference of two squares:`,
    });
    steps.push({ tex: chain(`&${inner}`, `=\\;&${pair}`) });
    if (k > 1) steps.push({ text: `So it is $${k}${pair}$.` });
    return steps;
  },
};

/**
 * A difference of two squares over a line sharing one of its brackets: x
 * times it, a number times it, or (difficulty 2) a monic quadratic.
 * Difficulty 2 also has a number to take out of the top first.
 */
function sampleDotsFraction(rng: Rng, difficulty: number): Fraction {
  for (;;) {
    const hard = difficulty > 1;
    const minus = dotsLin(rng, hard ? 1 : 2, 5, 9);
    const plus = flip(minus);
    const k = hard ? rng.int(2, 4) : 1;
    const shared = rng.chance(0.5) ? minus : plus;
    const other = flip(shared);
    const kind = rng.int(0, hard ? 2 : 1);
    let bottom: Fac;
    if (kind === 0) bottom = { k: rng.int(1, hard ? 4 : 3), e: 1, lins: [shared] };
    else if (kind === 1) bottom = { k: rng.int(2, 5), e: 0, lins: [shared] };
    else {
      // A quadratic bottom only when it is monic, which level 1 taught to factorise.
      if (minus.a !== 1) continue;
      const w = monic(nonZero(rng, 6));
      if (same(w, other) || same(w, shared)) continue;
      bottom = brackets(shared, w);
    }
    const fraction: Fraction = [{ k, e: 0, lins: [minus, plus] }, bottom];
    if (isOne(cancelled(fraction)[1])) continue;
    return fraction;
  }
}

/** The ways of cancelling a difference of two squares wrongly. */
function dotsWrongs(fraction: Fraction): Fraction[] {
  const [top, bottom] = fraction;
  const [rt, rb] = cancelled(fraction);
  const shared = bottom.lins[0];
  return [
    [{ ...rt, lins: [shared] }, rb],
    [{ ...rt, k: -rt.k }, rb],
    [rt, { ...rb, e: rb.e + 1 }],
    [{ ...rt, k: top.k * 2 }, rb],
    [rt, { ...rb, k: rb.k * 2 }],
  ];
}

function dotsSolution(fraction: Fraction): SolutionStep[] {
  const [top, bottom] = fraction;
  const shared = bottom.lins[0];
  const topNote = top.k > 1 ? `Take $${top.k}$ out of the top; what is left is a difference of two squares.` : 'The top is a difference of two squares.';
  const bottomNote =
    bottom.lins.length === 2 ? 'The bottom is a quadratic with two brackets.' : 'The bottom has a common factor to take out.';
  const numbers = gcd(top.k, bottom.k) > 1 ? ` So does the number $${gcd(top.k, bottom.k)}$.` : '';
  return [
    { text: `${topNote} ${bottomNote}` },
    { tex: chain(`&${expandedTex(fraction)}`, `=\\;&${factorisedTex(fraction)}`) },
    { text: `$(${linTex(shared)})$ is on both lines, so it cancels.${numbers}` },
    { tex: fractionTex(cancelled(fraction)) },
  ];
}

/** Simplify a fraction with a difference of two squares on top. */
const af8DotsSimplify: Generator<Fraction> = {
  id: 'af8-dots-simplify',
  sample: sampleDotsFraction,
  choices: (fraction) => fractionOptions(cancelled(fraction), dotsWrongs(fraction)),
  render: (fraction): Slide => {
    const [rt, rb] = cancelled(fraction);
    const answer = [facTex(rt), facTex(rb)];
    return {
      kind: 'tiles',
      prompt: [say('Simplify fully.'), show(expandedTex(fraction))],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: simplifyBank([rt, rb], dotsWrongs(fraction)),
      answer,
    };
  },
  solution: dotsSolution,
};

/** The same simplification one line of working at a time: factorise the top, the bottom, cancel. */
const af8DotsChainSteps: Generator<Fraction> = {
  id: 'af8-dots-chain-steps',
  sample: sampleDotsFraction,
  render: (fraction): Slide => {
    const [top, bottom] = fraction;
    const [minus, plus] = top.lins;
    const bottomOut = polyOf(bottom);
    const firstLine = frac(facTex(top), bottomOut);
    const secondLine = factorisedTex(fraction);
    const result = fractionTex(cancelled(fraction));
    const shared = bottom.lins[0];
    return {
      kind: 'steps',
      prompt: [say('Simplify fully. Tap the line to take the next step, then choose what it becomes.')],
      start: [expandedTex(fraction)],
      reductions: [
        {
          span: [0, 1],
          value: firstLine,
          bank: stepBank(
            firstLine,
            frac(facTex({ ...top, lins: [minus, minus] }), bottomOut),
            frac(facTex({ ...top, lins: [plus, plus] }), bottomOut),
          ),
        },
        {
          span: [0, 1],
          value: secondLine,
          bank: stepBank(
            secondLine,
            frac(facTex(top), facTex({ ...bottom, lins: [flip(shared), ...bottom.lins.slice(1)] })),
            frac(facTex(top), facTex({ ...bottom, e: bottom.e + 1 })),
          ),
        },
        {
          span: [0, 1],
          value: result,
          bank: stepBank(result, ...fractionSlips(cancelled(fraction), dotsWrongs(fraction), fractionTex).slice(0, 3)),
        },
      ],
    };
  },
  solution: dotsSolution,
};

/** Where the shared bracket is zero, and the value the simplified form takes there. */
function dotsHole(fraction: Fraction): number {
  const [rt, rb] = cancelled(fraction);
  const { a, b } = fraction[1].lins[0];
  const [tn, td] = ratAt(expand(rt), -b, a);
  const [bn, bd] = ratAt(expand(rb), -b, a);
  return (tn * bd) / (td * bn);
}

/**
 * A difference of two squares over its own bracket: undefined where that
 * bracket is zero, often at a fraction, and the simplified form's value
 * there. Difficulty 2 leaves x or a second bracket on the bottom.
 */
const af8DotsHole: Generator<Fraction> = {
  id: 'af8-dots-hole',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const minus = dotsLin(rng, hard ? 1 : 2, 5, 9);
      const shared = rng.chance(0.5) ? minus : flip(minus);
      const k = rng.int(1, 3);
      let bottom: Fac;
      if (!hard) bottom = { k: rng.int(1, 3), e: 0, lins: [shared] };
      else if (minus.a === 1 && rng.chance(0.5)) {
        const w = monic(nonZero(rng, 6));
        if (same(w, shared) || same(w, flip(shared))) continue;
        bottom = brackets(shared, w);
      } else bottom = { k: rng.int(1, 4), e: 1, lins: [shared] };
      const fraction: Fraction = [{ k, e: 0, lins: [minus, flip(minus)] }, bottom];
      const value = dotsHole(fraction);
      if (!Number.isInteger(value) || value === 0) continue;
      return fraction;
    }
  },
  render: (fraction): Slide => {
    const shared = fraction[1].lins[0];
    return {
      kind: 'expression',
      prompt: [
        show(expandedTex(fraction)),
        say(
          `This is undefined at $x = ${rootTex(shared)}$, where $${linTex(shared)}$ is zero. Simplify it, then give the value the simplified form takes at $x = ${rootTex(shared)}$.`,
        ),
      ],
      lead: '\\text{value} =',
      keypad: [],
      answer: String(dotsHole(fraction)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (fraction) => {
    const [rt, rb] = cancelled(fraction);
    const shared = fraction[1].lins[0];
    const { a, b } = shared;
    const at = rootTex(shared);
    const topValue = ratAt(expand(rt), -b, a);
    const bottomValue = ratAt(expand(rb), -b, a);
    const steps: SolutionStep[] = [
      ...dotsSolution(fraction),
      ...(a > 1 ? [{ text: `At $x = ${at}$, $${termTex(a, 1)} = ${-b}$.` }] : []),
    ];
    if (isOne(rb)) {
      steps.push({ text: `So $${facTex(rt)}$ is $${dotsHole(fraction)}$ there.` });
    } else {
      const under = ratTex(bottomValue);
      steps.push({ text: `The top, $${facTex(rt)}$, is $${ratTex(topValue)}$ there, and the bottom, $${facTex(rb)}$, is $${under}$:` });
      steps.push({ tex: `${ratTex(topValue)} \\div ${under.startsWith('-') ? `(${under})` : under} = ${dotsHole(fraction)}` });
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 3: quadratics with a number in front
 * ================================================================ */

/** (Px + p)(Rx + r), P at least 2, nothing to take out of either bracket. */
interface NonMonic {
  P: Lin;
  R: Lin;
}

function sampleNonMonic(rng: Rng, hard: boolean): NonMonic {
  for (;;) {
    let P: Lin;
    let R: Lin;
    if (!hard) {
      P = { a: rng.pick([2, 3, 5]), b: nonZero(rng, 5) };
      R = monic(nonZero(rng, 5));
    } else if (rng.chance(0.6)) {
      P = sampleLin(rng, 2, 3, 5);
      R = sampleLin(rng, 2, 3, 5);
    } else {
      P = { a: rng.pick([4, 6]), b: nonZero(rng, 5) };
      R = monic(nonZero(rng, 5));
    }
    if (gcd(P.a, P.b) !== 1 || gcd(R.a, R.b) !== 1 || same(P, R)) continue;
    if (P.a * R.b + P.b * R.a === 0) continue;
    if (P.a < R.a || (P.a === R.a && P.b > R.b)) [P, R] = [R, P];
    return { P, R };
  }
}

const nmPoly = ({ P, R }: NonMonic): Poly => expand(brackets(P, R));
const nmTex = ({ P, R }: NonMonic): string => `(${linTex(P)})(${linTex(R)})`;

/** The two numbers the ac method splits b into, the one beside the x^2 part first. */
const acPair = ({ P, R }: NonMonic): [number, number] => [P.a * R.b, P.b * R.a];

function pairTex(u: number, v: number): string {
  const [lo, hi] = u <= v ? [u, v] : [v, u];
  return `${lo} \\text{ and } ${hi}`;
}

/** Other factor pairs of ac, whose sums miss b: nearest miss first. */
function otherPairs(ac: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  for (let u = -Math.abs(ac); u <= Math.abs(ac); u += 1) {
    if (u === 0 || ac % u !== 0) continue;
    const v = ac / u;
    if (u > v || u + v === b) continue;
    out.push([u, v]);
  }
  return out.sort((x, y) => Math.abs(x[0] + x[1] - b) - Math.abs(y[0] + y[1] - b) || x[0] - y[0]);
}

/** Wrong factorisations, none of them multiplying out to the quadratic. */
function nmSlips(nm: NonMonic): string[] {
  const { P, R } = nm;
  const right = nmPoly(nm).join(',');
  const tries: [Lin, Lin][] = [
    [{ a: P.a, b: R.b }, { a: R.a, b: P.b }],
    [flip(P), flip(R)],
    [flip(P), R],
    [P, flip(R)],
  ];
  return tries
    .filter(([p, r]) => expand(brackets(p, r)).join(',') !== right)
    .map(([p, r]) => `(${linTex(p)})(${linTex(r)})`);
}

function acSolution(nm: NonMonic): SolutionStep[] {
  const { P, R } = nm;
  const [a, b, c] = nmPoly(nm);
  const [m, n] = acPair(nm);
  return [
    { text: `Here $a = ${a}$, $b = ${b}$ and $c = ${c}$, so $ac = ${a * c}$.` },
    { text: `$${m}$ and $${n}$ multiply to $${a * c}$ and add to $${b}$. Split the middle term with them, then factorise in pairs:` },
    {
      tex: chain(
        `&${polyTex(nmPoly(nm))}`,
        `=\\;&${termTex(a, 2)} ${signedTerm(m, 1)} ${signedTerm(n, 1)} ${signed(c)}`,
        `=\\;&${termTex(P.a, 1)}(${linTex(R)}) ${signed(P.b)}(${linTex(R)})`,
        `=\\;&${nmTex(nm)}`,
      ),
    },
  ];
}

/** The ac method as a tree: ac, the pair, the factors. */
const af8AcTree: Generator<NonMonic> = {
  id: 'af8-ac-tree',
  sample: (rng, difficulty) => sampleNonMonic(rng, difficulty > 1),
  render: (nm): Slide => {
    const [a, b, c] = nmPoly(nm);
    const [m, n] = acPair(nm);
    const answer = [String(a * c), pairTex(m, n), nmTex(nm)];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Factorise by the $ac$ method. Top: $ac$. Next: the two numbers that multiply to $ac$ and add to $b$. Last: the factorised form.',
        ),
      ],
      expression: polyTex(nmPoly(nm)),
      nodes: [
        { id: 'ac', from: [] },
        { id: 'pair', from: ['ac'] },
        { id: 'factors', from: ['pair'] },
      ],
      bank: tileBank(answer, [
        String(-a * c),
        String(a + c),
        pairTex(-m, -n),
        ...otherPairs(a * c, b)
          .slice(0, 2)
          .map(([u, v]) => pairTex(u, v)),
        ...nmSlips(nm).slice(0, 2),
      ]),
      answer,
    };
  },
  solution: acSolution,
};

/** Factorise a quadratic with a number in front. */
const af8AcTiles: Generator<NonMonic> = {
  id: 'af8-ac-tiles',
  sample: (rng, difficulty) => sampleNonMonic(rng, difficulty > 1),
  render: (nm): Slide => {
    const { P, R } = nm;
    const answer = [linTex(P), linTex(R)];
    return {
      kind: 'tiles',
      prompt: [say('Factorise.'), show(polyTex(nmPoly(nm)))],
      template: '({0})({1})',
      bank: tileBank(answer, [
        linTex({ a: P.a, b: R.b }),
        linTex({ a: R.a, b: P.b }),
        linTex(flip(P)),
        linTex(flip(R)),
      ]),
      answer,
      unordered: true,
    };
  },
  solution: acSolution,
};

interface AcFraction {
  nm: NonMonic;
  fraction: Fraction;
}

/**
 * A quadratic with a number in front over a line sharing one of its
 * brackets. Difficulty 1's bottom is a common factor times the bracket, or a
 * monic quadratic; difficulty 2's is a difference of two squares or another
 * quadratic with a number in front.
 */
function sampleAcFraction(rng: Rng, difficulty: number): AcFraction {
  for (;;) {
    const hard = difficulty > 1;
    const nm = sampleNonMonic(rng, hard);
    const shareP = rng.chance(0.5);
    const S = shareP ? nm.P : nm.R;
    let bottom: Fac;
    if (!hard) {
      if (S.a > 1) bottom = rng.chance(0.5) ? { k: rng.int(1, 3), e: 1, lins: [S] } : { k: rng.int(2, 4), e: 0, lins: [S] };
      else bottom = brackets(S, monic(nonZero(rng, 6)));
    } else {
      bottom = brackets(S, rng.chance(0.5) ? flip(S) : sampleLin(rng, 2, 3, 5));
    }
    const w = bottom.lins[1];
    if (w && (same(w, S) || same(w, shareP ? nm.R : nm.P))) continue;
    const fraction: Fraction = [brackets(nm.P, nm.R), bottom];
    const [rt, rb] = cancelled(fraction);
    if (rt.lins.length !== 1 || isOne(rb)) continue;
    return { nm, fraction };
  }
}

function acWrongs({ fraction }: AcFraction): Fraction[] {
  const [rt, rb] = cancelled(fraction);
  const shared = fraction[1].lins[0];
  return [
    [brackets(shared), rb],
    [{ ...rt, lins: rt.lins.map(flip) }, rb],
    [rt, rb.lins.length > 0 ? { ...rb, lins: rb.lins.map(flip) } : { ...rb, k: rb.k + 1 }],
    [rt, { ...rb, e: rb.e + 1 }],
  ];
}

function acFractionSolution(params: AcFraction): SolutionStep[] {
  const { nm, fraction } = params;
  const shared = fraction[1].lins[0];
  return [
    ...acSolution(nm),
    { text: 'Factorise the bottom too, then cancel the bracket both lines share:' },
    { tex: chain(`&${factorisedTex(fraction)}`, `=\\;&${fractionTex(cancelled(fraction))}`) },
    { text: `$(${linTex(shared)})$ cancelled; nothing else is on both lines.` },
  ];
}

/** Simplify a fraction with a quadratic with a number in front on top. */
const af8AcSimplify: Generator<AcFraction> = {
  id: 'af8-ac-simplify',
  sample: sampleAcFraction,
  choices: (params) => fractionOptions(cancelled(params.fraction), acWrongs(params)),
  render: (params): Slide => {
    const [rt, rb] = cancelled(params.fraction);
    const answer = [facTex(rt), facTex(rb)];
    return {
      kind: 'tiles',
      prompt: [say('Simplify fully.'), show(expandedTex(params.fraction))],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: simplifyBank([rt, rb], acWrongs(params)),
      answer,
    };
  },
  solution: acFractionSolution,
};

/** The pair, the factors, then what is left after cancelling. */
const af8AcFlow: Generator<AcFraction> = {
  id: 'af8-ac-flow',
  sample: sampleAcFraction,
  render: (params): Slide => {
    const { nm, fraction } = params;
    const [a, b, c] = nmPoly(nm);
    const [m, n] = acPair(nm);
    const key = expandedTex(fraction);
    const pairs = [...new Set([pairTex(m, n), pairTex(-m, -n), ...otherPairs(a * c, b).map(([u, v]) => pairTex(u, v))])].slice(0, 4);
    const factorings = [...new Set([nmTex(nm), ...nmSlips(nm)])].slice(0, 4);
    const result = cancelled(fraction);
    return {
      kind: 'flow',
      prompt: [say('Simplify this fraction. Each answer decides what is asked next.')],
      subject: expandedTex(fraction),
      steps: [
        {
          id: 'pair',
          ask: `For the top, $ac = ${a * c}$ and $b = ${b}$. Which two numbers multiply to $${a * c}$ and add to $${b}$?`,
          branches: turned(
            pairs.map((tex) => ({ label: `$${tex}$`, to: 'top' })),
            `${key}pair`,
          ),
        },
        {
          id: 'top',
          ask: 'Split the middle term with them. How does the top factorise?',
          branches: turned(
            factorings.map((tex) => ({ label: `$${tex}$`, to: 'left' })),
            `${key}top`,
          ),
        },
        {
          id: 'left',
          ask: 'Factorise the bottom and cancel. What is left?',
          branches: fractionLeaves(result, acWrongs(params), `${key}left`),
        },
      ],
      answer: [`$${pairTex(m, n)}$`, `$${nmTex(nm)}$`, `$${fractionTex(result)}$`],
    };
  },
  solution: acFractionSolution,
};

/* ================================================================
 * Lesson 4: grouping and cubics
 * ================================================================ */

interface CubicParams {
  k: number;
  /** kx(x + u)(x + v), u < v. */
  u: number;
  v: number;
}

const cubicFac = ({ k, u, v }: CubicParams): Fac => ({ k, e: 1, lins: [monic(u), monic(v)] });

function sampleCubic(rng: Rng, k: number): CubicParams {
  if (rng.chance(0.5)) {
    const c = rng.int(1, 7);
    return { k, u: -c, v: c };
  }
  const [u, v] = distinct(rng, 2, 7);
  return { k, u: Math.min(u, v), v: Math.max(u, v) };
}

/** A cubic with no number term: x (and a number) out, then the quadratic left. */
const af8CubicTiles: Generator<CubicParams> = {
  id: 'af8-cubic-tiles',
  sample: (rng, difficulty) => sampleCubic(rng, difficulty > 1 ? rng.int(2, 5) : 1),
  render: (params): Slide => {
    const { k, u, v } = params;
    const answer = [termTex(k, 1), linTex(monic(u)), linTex(monic(v))];
    return {
      kind: 'tiles',
      prompt: [say('Factorise fully.'), show(polyOf(cubicFac(params)))],
      template: '{0}({1})({2})',
      bank: tileBank(answer, [
        termTex(k, 2),
        linTex(monic(-u)),
        linTex(monic(-v)),
        linTex(monic(u * v)),
        ...(k > 1 ? [String(k)] : []),
      ]),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const { k, u, v } = params;
    const f = cubicFac(params);
    const quad = polyTex(expand(brackets(monic(u), monic(v))));
    const out = termTex(k, 1);
    return [
      {
        text:
          k === 1
            ? 'There is no number term, so every term has an $x$: take it out.'
            : `Every term has an $x$, and every coefficient is a multiple of $${k}$: take out $${out}$.`,
      },
      {
        text:
          u === -v
            ? `What is left, $${quad}$, is a difference of two squares.`
            : `What is left, $${quad}$, is a quadratic: two numbers that multiply to $${u * v}$ and add to $${u + v}$ are $${u}$ and $${v}$.`,
      },
      { tex: chain(`&${polyOf(f)}`, `=\\;&${out}(${quad})`, `=\\;&${facTex(f)}`) },
    ];
  },
};

interface GroupParams {
  /** (x^2 - c^2)(px + q). */
  c: number;
  p: number;
  q: number;
}

function sampleGroup(rng: Rng, hard: boolean): GroupParams {
  for (;;) {
    const c = rng.int(1, hard ? 4 : 5);
    const p = hard ? rng.int(2, 4) : 1;
    const q = nonZero(rng, hard ? 7 : 6);
    if (gcd(p, q) !== 1 || (p === 1 && Math.abs(q) === c)) continue;
    return { c, p, q };
  }
}

const groupFac = ({ c, p, q }: GroupParams): Fac => brackets(monic(-c), monic(c), { a: p, b: q });
const timesTex = (n: number): string => (n === 1 ? '' : String(n));

/** Four terms factorised in pairs, then the difference of two squares that falls out. */
const af8GroupSteps: Generator<GroupParams> = {
  id: 'af8-group-steps',
  sample: (rng, difficulty) => sampleGroup(rng, difficulty > 1),
  render: (params): Slide => {
    const { c, p, q } = params;
    const L = { a: p, b: q };
    const lin = linTex(L);
    const c2 = c * c;
    const first = `x^{2}(${lin})`;
    const second = `- ${timesTex(c2)}(${lin})`;
    const paired = `(x^{2} - ${c2})(${lin})`;
    const full = `(x - ${c})(x + ${c})(${lin})`;
    return {
      kind: 'steps',
      prompt: [say('Factorise fully by grouping. Tap the part to work on next, then choose what it becomes.')],
      start: [polyTex([p, q, 0, 0]), `- ${termTex(c2 * p, 1)} ${signed(-c2 * q)}`],
      reductions: [
        {
          span: [0, 1],
          value: first,
          bank: stepBank(first, `x^{2}(${linTex(flip(L))})`, `x^{2}(${termTex(p, 1)} ${signed(2 * q)})`),
        },
        {
          span: [1, 2],
          value: second,
          bank: stepBank(
            second,
            `- ${timesTex(c2)}(${linTex(flip(L))})`,
            `+ ${timesTex(c2)}(${linTex(flip(L))})`,
            `- ${timesTex(c2 * p)}(x ${signed(q)})`,
          ),
        },
        {
          span: [0, 2],
          value: paired,
          bank: stepBank(paired, `(x^{2} + ${c2})(${lin})`, `(x^{2} - ${c2})(${linTex(flip(L))})`),
        },
        {
          span: [0, 1],
          value: full,
          bank: stepBank(full, `(x - ${c})^{2}(${lin})`, `(x + ${c})^{2}(${lin})`),
        },
      ],
    };
  },
  solution: (params) => {
    const { c, p, q } = params;
    const lin = linTex({ a: p, b: q });
    const c2 = c * c;
    return [
      { text: `Group the first two terms and the last two. The first pair has $x^{2}$ in common, and the second has $-${c2}$:` },
      {
        tex: chain(
          `&${polyOf(groupFac(params))}`,
          `=\\;&x^{2}(${lin}) - ${timesTex(c2)}(${lin})`,
          `=\\;&(x^{2} - ${c2})(${lin})`,
          `=\\;&(x - ${c})(x + ${c})(${lin})`,
        ),
      },
      { text: `$(${lin})$ is in both pairs, so it comes out. What is left, $x^{2} - ${c2}$, is a difference of two squares.` },
    ];
  },
};

/**
 * A cubic over a quadratic sharing one of its brackets. Difficulty 1's cubic
 * has x in common; difficulty 2's factorises by grouping.
 */
function sampleCubicFraction(rng: Rng, difficulty: number): Fraction {
  for (;;) {
    const hard = difficulty > 1;
    const top = hard ? groupFac(sampleGroup(rng, rng.chance(0.5))) : cubicFac(sampleCubic(rng, 1));
    const S = rng.pick(top.lins);
    let bottom: Fac;
    if (S.a > 1 || (hard && rng.chance(0.4))) bottom = { k: 1, e: 1, lins: [S] };
    else {
      const w = monic(nonZero(rng, 6));
      if (top.lins.some((l) => same(l, w))) continue;
      bottom = brackets(S, w);
    }
    return [top, bottom];
  }
}

function cubicWrongs(fraction: Fraction): Fraction[] {
  const [rt, rb] = cancelled(fraction);
  const shared = fraction[1].lins[0];
  const kept = rt.lins;
  return [
    [{ ...rt, lins: [shared, ...kept.slice(1)] }, rb],
    [{ ...rt, lins: [kept[0], shared] }, rb],
    [flipFirst(rt), rb],
    [rt, rb.lins.length > 0 ? { ...rb, lins: rb.lins.map(flip) } : { ...rb, e: 2 }],
    [{ ...rt, e: rt.e + 1 }, rb],
  ];
}

function cubicSolution(fraction: Fraction): SolutionStep[] {
  const [top, bottom] = fraction;
  const shared = bottom.lins[0];
  return [
    {
      text:
        top.e > 0
          ? 'Take $x$ out of the top and factorise what is left. Factorise the bottom too:'
          : 'Factorise the top by grouping it in pairs. Factorise the bottom too:',
    },
    { tex: chain(`&${expandedTex(fraction)}`, `=\\;&${factorisedTex(fraction)}`) },
    { text: `$(${linTex(shared)})$ is on both lines, so it cancels:` },
    { tex: fractionTex(cancelled(fraction)) },
  ];
}

/** Simplify a cubic over a quadratic. */
const af8CubicSimplify: Generator<Fraction> = {
  id: 'af8-cubic-simplify',
  sample: sampleCubicFraction,
  choices: (fraction) => fractionOptions(cancelled(fraction), cubicWrongs(fraction)),
  render: (fraction): Slide => {
    const [rt, rb] = cancelled(fraction);
    const answer = [facTex(rt), facTex(rb)];
    return {
      kind: 'tiles',
      prompt: [say('Simplify fully.'), show(expandedTex(fraction))],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: simplifyBank([rt, rb], cubicWrongs(fraction)),
      answer,
    };
  },
  solution: cubicSolution,
};

interface CubicHoleParams {
  top: Fac;
  /** The bottom: one monic bracket of the top. */
  S: Lin;
}

function cubicHoleValue({ top, S }: CubicHoleParams): number {
  const [rt] = cancelled([top, brackets(S)]);
  return valueAt(expand(rt), -S.b);
}

/**
 * A cubic over one of its own brackets: the value at the hole. Difficulty 2's
 * cubic factorises by grouping.
 */
const af8CubicHole: Generator<CubicHoleParams> = {
  id: 'af8-cubic-hole',
  sample: (rng, difficulty) => {
    const top = difficulty > 1 ? groupFac(sampleGroup(rng, rng.chance(0.5))) : cubicFac(sampleCubic(rng, 1));
    return { top, S: rng.pick(top.lins.filter((l) => l.a === 1)) };
  },
  render: (params): Slide => {
    const { top, S } = params;
    const at = -S.b;
    return {
      kind: 'expression',
      prompt: [
        show(frac(polyOf(top), linTex(S))),
        say(`This is undefined at $x = ${at}$. Simplify it, then give the value the simplified form takes at $x = ${at}$.`),
      ],
      lead: '\\text{value} =',
      keypad: [],
      answer: String(cubicHoleValue(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { top, S } = params;
    const [rt] = cancelled([top, brackets(S)]);
    const at = -S.b;
    const parts = [...(rt.e > 0 ? [paren(at)] : []), ...rt.lins.map((l) => paren(l.a * at + l.b))];
    return [
      {
        text:
          top.e > 0
            ? 'Take $x$ out of the top and factorise what is left:'
            : 'Factorise the top by grouping it in pairs:',
      },
      { tex: chain(`&${frac(polyOf(top), linTex(S))}`, `=\\;&${frac(facTex(top), linTex(S))}`, `=\\;&${facTex(rt)}`) },
      { text: `Substitute $x = ${at}$ into what is left:` },
      { tex: `${parts.join(' \\times ')} = ${cubicHoleValue(params)}` },
    ];
  },
};

/* ================================================================
 * Lesson 5: simplify, then combine
 * ================================================================ */

interface ComboParams {
  /** (S O)/(T U) times T/S, or divided by S/T: O/U either way. */
  S: Lin;
  O: Lin;
  T: Lin;
  U: Lin;
  divide: boolean;
}

function sampleCombo(rng: Rng, divide: boolean): ComboParams {
  for (;;) {
    let S: Lin;
    let O: Lin;
    if (rng.chance(0.5)) {
      const minus = dotsLin(rng, 2, 4, 7);
      S = rng.chance(0.5) ? minus : flip(minus);
      O = flip(S);
    } else {
      S = sampleLin(rng, 2, 3, 5);
      O = monic(nonZero(rng, 6));
    }
    const T = monic(nonZero(rng, 6));
    const U = rng.chance(0.4) ? flip(T) : monic(nonZero(rng, 6));
    if (same(T, U) || [T, U].some((l) => same(l, S) || same(l, O))) continue;
    return { S, O, T, U, divide };
  }
}

function comboTex({ S, O, T, U, divide }: ComboParams): string {
  const first = expandedTex([brackets(S, O), brackets(T, U)]);
  return divide ? `${first} \\div ${frac(linTex(S), linTex(T))}` : `${first} \\times ${frac(linTex(T), linTex(S))}`;
}

const comboResult = ({ O, U }: ComboParams): Fraction => [brackets(O), brackets(U)];

function comboWrongs({ S, O, T, U }: ComboParams): Fraction[] {
  return [
    [brackets(S), brackets(U)],
    [brackets(O), brackets(T)],
    [brackets(flip(O)), brackets(U)],
    [brackets(O), brackets(flip(U))],
    [brackets(O, T), brackets(U, S)],
  ];
}

function comboSolution(params: ComboParams): SolutionStep[] {
  const { S, O, T, U, divide } = params;
  const first = factorisedTex([brackets(S, O), brackets(T, U)]);
  const steps: SolutionStep[] = [];
  if (divide) steps.push({ text: 'Dividing by a fraction is multiplying by it upside down.' });
  steps.push({ text: 'Factorise the first fraction, so every factor is in view:' });
  steps.push({ tex: chain(`&${first}`, `&\\times ${frac(linTex(T), linTex(S))}`) });
  steps.push({
    text: `$(${linTex(S)})$ and $(${linTex(T)})$ are each on the top once and on the bottom once, so they cancel, leaving $${fractionTex(comboResult(params))}$.`,
  });
  return steps;
}

/** Multiply (difficulty 2: divide) after factorising, placing what is left. */
const af8ComboMultiply: Generator<ComboParams> = {
  id: 'af8-combo-multiply',
  sample: (rng, difficulty) => sampleCombo(rng, difficulty > 1),
  choices: (params) => fractionOptions(comboResult(params), comboWrongs(params)),
  render: (params): Slide => {
    const { S, O, T, U } = params;
    const answer = [linTex(O), linTex(U)];
    return {
      kind: 'tiles',
      prompt: [say('Simplify fully.'), show(comboTex(params))],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: tileBank(answer, [linTex(S), linTex(T), linTex(flip(O)), linTex(flip(U))]),
      answer,
    };
  },
  solution: comboSolution,
};

interface ComboValueParams extends ComboParams {
  x: number;
}

const comboValue = (params: ComboValueParams): number => fractionAt(comboResult(params), params.x);

/** Simplify, then find the value at a whole x. */
const af8ComboValue: Generator<ComboValueParams> = {
  id: 'af8-combo-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const combo = sampleCombo(rng, difficulty > 1);
      const x = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]);
      const params = { ...combo, x };
      if ([combo.S, combo.O, combo.T, combo.U].some((l) => l.a * x + l.b === 0)) continue;
      const value = comboValue(params);
      if (!Number.isInteger(value)) continue;
      return params;
    }
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`Simplify first, then find the value when $x = ${params.x}$.`), show(comboTex(params))],
    lead: '\\text{value} =',
    keypad: [],
    answer: String(comboValue(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { O, U, x } = params;
    return [
      ...comboSolution(params),
      { text: `At $x = ${x}$:` },
      {
        tex: chain(
          `&${frac(`${O.a === 1 ? '' : `${O.a} \\times `}${paren(x)} ${signed(O.b)}`, `${paren(x)} ${signed(U.b)}`)}`,
          `=\\;&${frac(String(O.a * x + O.b), String(U.a * x + U.b))} = ${comboValue(params)}`,
        ),
      },
    ];
  },
};

interface DivideParams {
  S: Lin;
  O: Lin;
  T: Lin;
  U: Lin;
  /** Difficulty 2 divides by kS over xU, both multiplied out; difficulty 1 by S over U. */
  k: number | null;
}

function divideLines({ S, O, T, U, k }: DivideParams) {
  const A: Fac = brackets(S, O);
  const B: Fac = brackets(T, U);
  const C: Fac = k === null ? brackets(S) : { k, e: 0, lins: [S] };
  const D: Fac = k === null ? brackets(U) : { k: 1, e: 1, lins: [U] };
  return { A, B, C, D };
}

const divideResult = ({ O, T, k }: DivideParams): Fraction =>
  k === null ? [brackets(O), brackets(T)] : [{ k: 1, e: 1, lins: [O] }, { k, e: 0, lins: [T] }];

/** Divide one line of working at a time: turn over, factorise, cancel. */
const af8ComboDivideSteps: Generator<DivideParams> = {
  id: 'af8-combo-divide-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const { S, O, T: t, U } = sampleCombo(rng, true);
      const T = hard && rng.chance(0.5) ? sampleLin(rng, 2, 3, 5) : t;
      if (same(T, U) || same(T, S) || same(T, O)) continue;
      return { S, O, T, U, k: hard ? rng.int(2, 4) : null };
    }
  },
  render: (params): Slide => {
    const { A, B, C, D } = divideLines(params);
    const { O, T, U, k } = params;
    const flipped = `\\times ${frac(polyOf(D), polyOf(C))}`;
    const factored = factorisedTex([A, B]);
    const result = fractionTex(divideResult(params));
    const wrongResults = fractionSlips(
      divideResult(params),
      k === null
        ? [
            [brackets(flip(O)), brackets(T)],
            [brackets(O), brackets(U)],
            [brackets(O), brackets(flip(T))],
          ]
        : [
            [{ k: 1, e: 1, lins: [flip(O)] }, { k, e: 0, lins: [T] }],
            [{ k: 1, e: 1, lins: [O] }, { k: 1, e: 0, lins: [T] }],
            [brackets(O), { k, e: 0, lins: [T] }],
          ],
      fractionTex,
    );
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [
      {
        span: [1, 3],
        operator: 1,
        value: flipped,
        bank: stepBank(flipped, `\\times ${frac(polyOf(C), polyOf(D))}`, `\\div ${frac(polyOf(D), polyOf(C))}`),
      },
      {
        span: [0, 1],
        value: factored,
        bank: stepBank(
          factored,
          ...fractionSlips([A, B], [[flipFirst(A), B], [A, flipFirst(B)]], factorisedTex),
        ),
      },
    ];
    if (k !== null) {
      const second = `\\times ${factorisedTex([D, C])}`;
      reductions.push({
        span: [1, 2],
        value: second,
        bank: stepBank(
          second,
          ...fractionSlips([D, C], [[flipFirst(D), C], [D, flipFirst(C)]], (f) => `\\times ${factorisedTex(f)}`),
        ),
      });
    }
    reductions.push({ span: [0, 2], value: result, bank: stepBank(result, ...wrongResults) });
    return {
      kind: 'steps',
      prompt: [say('Divide, and simplify fully. Tap the part you would do **next**, then choose what it becomes.')],
      start: [expandedTex([A, B]), '\\div', expandedTex([C, D])],
      reductions,
    };
  },
  solution: (params) => {
    const { A, B, C, D } = divideLines(params);
    const { S, T, U, k } = params;
    const cancelledTex = k === null ? `$(${linTex(S)})$ and $(${linTex(U)})$ cancel` : `$(${linTex(S)})$ and $(${linTex(U)})$ cancel, and the $x$ and the $${k}$ stay`;
    return [
      { text: 'Turn the second fraction over and multiply:' },
      { tex: chain(`&${expandedTex([A, B])}`, `&\\times ${expandedTex([D, C])}`) },
      { text: 'Factorise every line:' },
      { tex: chain(`&${factorisedTex([A, B])}`, `&\\times ${factorisedTex([D, C])}`) },
      { text: `${cancelledTex}, leaving $${fractionTex(divideResult(params))}$.` },
      ...(T.a > 1 ? [{ text: `The bottom $${polyOf(B)}$ factorises by the $ac$ method.` }] : []),
    ];
  },
};

interface AddParams {
  /** First: (F E)/(D E), which is F/D. */
  F: Lin;
  E: Lin;
  d: number;
  /** Second: k G/(D G), or k x/(D x) when G is null; either is k/D. */
  k: number;
  G: Lin | null;
  minus: boolean;
}

const addTop = ({ F, k, minus }: AddParams): Poly => [F.a, F.b + (minus ? -k : k)];

function addExpression(params: AddParams): string {
  const { F, E, d, k, G, minus } = params;
  const D = monic(d);
  const first = expandedTex([brackets(F, E), brackets(D, E)]);
  const second = G === null ? expandedTex([{ k, e: 1, lins: [] }, { k: 1, e: 1, lins: [D] }]) : expandedTex([{ k, e: 0, lins: [G] }, brackets(D, G)]);
  return `${first} ${minus ? '-' : '+'} ${second}`;
}

/**
 * Two fractions that each simplify onto the same bottom, then add or
 * subtract. Difficulty 2 subtracts, and its first fraction is a difference of
 * two squares over a quadratic with a number in front.
 */
const af8ComboAddTree: Generator<AddParams> = {
  id: 'af8-combo-add-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const d = nonZero(rng, 6);
      const D = monic(d);
      let F: Lin;
      let E: Lin;
      if (hard) {
        const minus = dotsLin(rng, 2, 3, 5);
        F = rng.chance(0.5) ? minus : flip(minus);
        E = flip(F);
      } else {
        F = sampleLin(rng, 2, 3, 5);
        E = monic(nonZero(rng, 6));
      }
      const G = rng.chance(0.4) ? null : monic(nonZero(rng, 6));
      const k = rng.int(1, 6);
      const params = { F, E, d, k, G, minus: hard };
      if (same(E, D) || (G !== null && same(G, D))) continue;
      const top = addTop(params);
      if (valueAt(top, -d) === 0) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { F, E, d, k, G, minus } = params;
    const D = linTex(monic(d));
    const answer = [frac(linTex(F), D), frac(String(k), D), frac(polyTex(addTop(params)), D)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Simplify each fraction, then ${minus ? 'subtract' : 'add'}. Top row: each fraction simplified. Below: the ${minus ? 'difference' : 'sum'} as one fraction.`,
        ),
      ],
      expression: addExpression(params),
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'total', from: ['first', 'second'] },
      ],
      bank: tileBank(answer, [
        frac(linTex(E), D),
        frac(String(k), G === null ? 'x' : linTex(G)),
        frac(polyTex(addTop({ ...params, minus: !minus })), D),
        frac(polyTex(addTop(params)), polyTex([2, 2 * d])),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { F, E, d, k, G, minus } = params;
    const D = monic(d);
    const second: Fraction = G === null ? [{ k, e: 1, lins: [] }, { k: 1, e: 1, lins: [D] }] : [{ k, e: 0, lins: [G] }, brackets(D, G)];
    const shared = G === null ? 'x' : `(${linTex(G)})`;
    return [
      { text: `Factorise the first fraction and cancel $(${linTex(E)})$:` },
      { tex: chain(`&${factorisedTex([brackets(F, E), brackets(D, E)])}`, `=\\;&${frac(linTex(F), linTex(D))}`) },
      { text: `Factorise the second and cancel $${shared}$:` },
      { tex: chain(`&${factorisedTex(second)}`, `=\\;&${frac(String(k), linTex(D))}`) },
      { text: `Both are over $${linTex(D)}$ now, so ${minus ? 'take the second top from the first' : 'add the tops'}:` },
      { tex: frac(polyTex(addTop(params)), linTex(D)) },
    ];
  },
};

export const fractionsLevel8Generators = [
  af8HcfTiles,
  af8HcfSimplify,
  af8HcfFlow,
  af8HcfHole,
  af8DotsTiles,
  af8DotsSimplify,
  af8DotsChainSteps,
  af8DotsHole,
  af8AcTree,
  af8AcTiles,
  af8AcSimplify,
  af8AcFlow,
  af8CubicTiles,
  af8GroupSteps,
  af8CubicSimplify,
  af8CubicHole,
  af8ComboMultiply,
  af8ComboValue,
  af8ComboDivideSteps,
  af8ComboAddTree,
] as Generator<unknown>[];
