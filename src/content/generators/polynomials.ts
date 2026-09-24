/**
 * Polynomials and the Factor Theorem.
 *
 * Level 1 is arithmetic on polynomials: naming them, adding and subtracting,
 * multiplying a linear by a quadratic, evaluating p(a), and dividing by a
 * linear factor. Level 2 is the two theorems that division leads to — the
 * remainder is p(a), and (x - a) is a factor exactly when p(a) = 0 — and what
 * they are for: finding a factor by trial, factorising a cubic fully and
 * solving it. Level 3 reads a graph off the factors, and level 4 goes from
 * roots back to coefficients through the sums of the roots. Level 5 divides
 * quartics, by a quadratic or twice over, and level 6 solves cubic and quartic
 * inequalities from their sign diagrams. Level 7 models with them: the open
 * box as a cubic, a stated volume solved by the factor theorem, a cubic fitted
 * through its roots and a point, and reading what a model says. Nothing in
 * it is calculus, so no slide declares `source`, `integrand` or `limits`.
 *
 * Everything starts at degree 3, since two brackets and the quadratic formula
 * belong to Quadratics, and top-heavy division and partial fractions belong to
 * Integration and to Algebraic Fractions.
 *
 * Every polynomial that is divided, tested or solved is built outward from
 * small whole roots, or as a divisor times a quotient plus a remainder, so
 * every quotient, remainder and root is whole by construction rather than by
 * filtering. `polynomials.test.ts` checks the division identity independently.
 *
 * A polynomial is held as its coefficients, highest power first:
 * `[1, -2, -5, 6]` is x^3 - 2x^2 - 5x + 6.
 *
 * As everywhere, the learner never types a polynomial: the checker compares
 * values, so a typed "expand this" accepts the question copied back
 * (PITFALLS 3.4). Polynomial answers go through `tiles`, `steps`, `tree`,
 * `flow` or `choice`; only numbers are typed.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { bankFor, bin, num, pow, valueOf, type Expr } from '../expr';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { canonicalPieces, formatSet, type Piece } from '../numberLine';
import { sumTex, termTex } from './calculus';
import { numberLineSvg } from './inequalitiesModulus';
import { windowFor } from './numberLine';

/* ---------- polynomial arithmetic ---------- */

/** Coefficients, highest power first. */
export type Poly = number[];

/** Drops leading zeros, keeping at least the constant. */
function trim(p: Poly): Poly {
  let i = 0;
  while (i < p.length - 1 && p[i] === 0) i += 1;
  return p.slice(i);
}

function padTo(p: Poly, length: number): Poly {
  return [...Array(Math.max(0, length - p.length)).fill(0), ...p];
}

export function addPoly(p: Poly, q: Poly): Poly {
  const n = Math.max(p.length, q.length);
  const a = padTo(p, n);
  const b = padTo(q, n);
  return trim(a.map((c, i) => c + b[i]));
}

export function scalePoly(p: Poly, k: number): Poly {
  return p.map((c) => c * k);
}

export function subPoly(p: Poly, q: Poly): Poly {
  return addPoly(p, scalePoly(q, -1));
}

export function mulPoly(p: Poly, q: Poly): Poly {
  const out = Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => (out[i + j] += a * b)));
  return out;
}

/** The monic polynomial with these roots, times `lead`. */
export function fromRoots(roots: number[], lead = 1): Poly {
  return roots.reduce<Poly>((acc, r) => mulPoly(acc, [1, -r]), [lead]);
}

/** p(x), by nesting. */
export function valueAt(p: Poly, x: number): number {
  return p.reduce((acc, c) => acc * x + c, 0);
}

/** Division by (x - a): the quotient's coefficients and the remainder. */
export function divideBy(p: Poly, a: number): { quotient: Poly; remainder: number } {
  const carries: number[] = [];
  let carry = 0;
  for (const c of p) {
    carry = carry * a + c;
    carries.push(carry);
  }
  return { quotient: carries.slice(0, -1), remainder: carries[carries.length - 1] };
}

/**
 * Long division by a divisor whose leading coefficient is 1, keeping what is
 * left after each step: `stages[i]` starts at the term the next step clears,
 * and the last stage is the remainder.
 */
function longDivision(p: Poly, d: Poly): { quotient: Poly; stages: Poly[] } {
  const n = d.length - 1;
  let rest = [...p];
  const quotient: number[] = [];
  const stages: Poly[] = [];
  for (let i = 0; i + n < p.length; i += 1) {
    const q = rest[i];
    quotient.push(q);
    rest = rest.map((c, j) => (j >= i && j <= i + n ? c - q * d[j - i] : c));
    stages.push(rest.slice(i + 1));
  }
  return { quotient, stages };
}

/**
 * Division by any divisor whose leading coefficient is 1, such as a quadratic
 * factor. The remainder is padded to the divisor's degree, so dividing by a
 * quadratic always leaves [r, s] for rx + s.
 */
export function divideByPoly(p: Poly, d: Poly): { quotient: Poly; remainder: Poly } {
  const n = d.length - 1;
  const { quotient, stages } = longDivision(p, d);
  const left = stages.length > 0 ? stages[stages.length - 1] : padTo(p, n);
  return { quotient, remainder: left.slice(-n) };
}

const degreeOf = (p: Poly): number => p.length - 1;

/** The coefficient of x^k. */
const coefficientOf = (p: Poly, k: number): number => p[p.length - 1 - k] ?? 0;

/* ---------- display ---------- */

/** A polynomial as the learner reads it: 2x^3 - x + 4. */
export function polyTex(p: Poly): string {
  const n = degreeOf(p);
  return sumTex(p.map((c, i) => termTex(c, n - i))) || '0';
}

/** The same with a leading sign always shown, for a piece that follows another. */
function signedPolyTex(p: Poly): string {
  const tex = polyTex(p);
  return tex.startsWith('-') ? `- ${tex.slice(1)}` : `+ ${tex}`;
}

/** x - 3, x + 2, or x for a root of 0. */
function linTex(root: number): string {
  if (root === 0) return 'x';
  return root > 0 ? `x - ${root}` : `x + ${-root}`;
}

/** A signed number as a tile or a trailing term: "+ 4", "- 3". */
function signedNum(n: number): string {
  return n < 0 ? `- ${-n}` : `+ ${n}`;
}

/** One term as a tile: the first unsigned, the rest with their sign in front. */
function signedTerm(c: number, k: number, first = false): string {
  if (first) return termTex(c, k);
  return c < 0 ? `- ${termTex(-c, k)}` : `+ ${termTex(c, k)}`;
}

/** Every non-zero term of p as tiles, in descending order. */
function termTiles(p: Poly): string[] {
  const n = degreeOf(p);
  const out: string[] = [];
  p.forEach((c, i) => {
    if (c !== 0) out.push(signedTerm(c, n - i, out.length === 0));
  });
  return out;
}

/** A number as a factor in a product, bracketed when negative. */
function factor(tex: string): string {
  return tex.startsWith('-') ? `(${tex})` : tex;
}

interface Term {
  c: number;
  k: number;
}

/** Terms in the order given, which need not be descending. */
function termsTex(terms: Term[]): string {
  return sumTex(terms.map(({ c, k }) => termTex(c, k)));
}

/** Terms collected into a polynomial. */
function collect(terms: Term[]): Poly {
  const top = Math.max(...terms.map((t) => t.k));
  const p = Array(top + 1).fill(0);
  for (const { c, k } of terms) p[top - k] += c;
  return trim(p);
}

function chain(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });
/**
 * A long line as inline maths in prose, which wraps between terms where a
 * display cannot: a five-term polynomial is wider than a phone.
 */
const wrapped = (tex: string): Block => say(`$${tex}$`);

const NAMES = ['Constant', 'Linear', 'Quadratic', 'Cubic', 'Quartic', 'Quintic'];

/* ---------- banks and options ---------- */

/**
 * A tiles or tree bank: every token the answer needs, as a multiset, plus the
 * distractors that differ from all of them. Sorted, so one question renders
 * one way.
 */
function fillBank(answer: string[], distractors: string[]): string[] {
  // Compared without spaces, because "- x^{3}" and "-x^{3}" render as the same
  // tile, and one of them being wrong would be a trick rather than a question.
  const bare = (token: string) => token.replace(/\s+/g, '');
  const needed = new Set(answer.map(bare));
  const extras: string[] = [];
  for (const token of distractors) {
    if (needed.has(bare(token)) || extras.some((extra) => bare(extra) === bare(token))) continue;
    extras.push(token);
  }
  return [...answer, ...extras].sort();
}

/**
 * A bank of numbers: the slips first, then values near the answers until at
 * least `spare` distractors survive. Slips built from a question's own
 * numbers collide with its answers far more often than they look like they
 * will, and a tree needs two left over.
 */
function numberBank(answer: number[], slips: number[], show: (n: number) => string = String, spare = 3): string[] {
  const shown = answer.map(show);
  const needed = new Set(shown);
  const extras: string[] = [];
  for (const value of slips) {
    const token = show(value);
    if (!needed.has(token) && !extras.includes(token)) extras.push(token);
  }
  for (const value of answer.flatMap((v) => near(v, 4))) {
    if (extras.length >= spare) break;
    const token = show(value);
    if (!needed.has(token) && !extras.includes(token)) extras.push(token);
  }
  return [...shown, ...extras].sort();
}

/** Numbers near a value, for topping up a bank whose slips collided. */
function near(value: number, count: number): number[] {
  const out: number[] = [];
  for (let gap = 1; out.length < count; gap += 1) out.push(value + gap, value - gap);
  return out.slice(0, count);
}

/**
 * A steps bank: the value and its slips, de-duplicated and scattered by hash
 * rather than shuffled, so the same question renders one way.
 */
function stepBank(value: string, ...slips: string[]): string[] {
  const out = [...new Set([value, ...slips])];
  return out.sort((a, b) => hashSeed(a) - hashSeed(b));
}

/** Six distinct whole values for a reduce node, the right one among them. */
function numBank(correct: number, slips: number[]): string[] {
  const seen = new Set([correct]);
  const out = [correct];
  for (const value of [...slips, ...near(correct, 10)]) {
    if (out.length >= 6) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out.sort((x, y) => x - y).map(String);
}

/**
 * Four whole-number options: the answer and the first three slips that are
 * whole, allowed and distinct, topped up with near numbers.
 */
function intOptions(correct: number, slips: number[], min = -Infinity): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of [...slips, ...near(correct, 12)]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || value < min || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  return options(
    { tex: String(correct), answer: String(correct) },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: String(value), answer: String(value) })),
  );
}

/**
 * A native choice slide, the options turned by a hash of their labels so the
 * answer is not always first yet one question renders one way.
 */
function choiceSlide(prompt: Block[], opts: ChoiceOption[]): Slide {
  const turn = hashSeed(opts.map((o) => o.tex).join('|')) % opts.length;
  const ordered = [...opts.slice(turn), ...opts.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex: true })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/** Flow branches turned by a hash of `key`, so the right one is not always first. */
function turned<T>(items: T[], key: string): T[] {
  const turn = hashSeed(key) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/* ---------- sampling ---------- */

function nonZero(rng: Rng, max: number): number {
  return rng.int(1, max) * rng.sign();
}

/** `count` whole roots in [-max, max], none zero, distinct unless `repeats`. */
function sampleRoots(rng: Rng, count: number, max: number, repeats = false): number[] {
  for (;;) {
    const roots = Array.from({ length: count }, () => nonZero(rng, max));
    if (repeats || new Set(roots).size === count) return roots;
  }
}

/** Whole divisors of n, positive, ascending. */
function divisors(n: number): number[] {
  const size = Math.abs(n);
  const out: number[] = [];
  for (let d = 1; d <= size; d += 1) if (size % d === 0) out.push(d);
  return out;
}

/** ±1, ±2, ... as the learner reads a list of candidates. */
function pmList(values: number[]): string {
  return values.map((v) => `\\pm ${v}`).join(', ');
}

/** Candidates to try for a whole root, in the order a person tries them. */
function trialOrder(constant: number): number[] {
  return divisors(constant).flatMap((d) => [d, -d]);
}

/* ================================================================
 * Level 1, lesson 1: degree, terms and naming
 * ================================================================ */

interface DegreeParams {
  terms: Term[];
}

/**
 * The degree of a polynomial written out of order. At difficulty 2 its two
 * highest terms cancel, so the highest power written is not the degree.
 */
const polyDegree: Generator<DegreeParams> = {
  id: 'poly-degree',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1) {
        const top = rng.int(4, 6);
        const c = nonZero(rng, 7);
        const next = rng.int(2, top - 1);
        const lower = rng.sample(
          Array.from({ length: next }, (_, k) => k),
          rng.int(1, 2),
        );
        const rest = [next, ...lower].map((k) => ({ c: nonZero(rng, 9), k }));
        const terms = rng.shuffle([{ c, k: top }, ...rest, { c: -c, k: top }]);
        return { terms };
      }
      const top = rng.int(3, 5);
      const lower = rng.sample(
        Array.from({ length: top }, (_, k) => k),
        rng.int(2, 3),
      );
      const terms = rng.shuffle([top, ...lower].map((k) => ({ c: nonZero(rng, 9), k })));
      // Written in descending order it would read the degree off the front.
      if (terms[0].k === top) continue;
      return { terms };
    }
  },
  choices: ({ terms }) => {
    const degree = degreeOf(collect(terms));
    const written = Math.max(...terms.map((t) => t.k));
    return intOptions(degree, [written, terms.length, terms[0].k, degree + 1, degree - 1], 0);
  },
  render: ({ terms }): Slide => ({
    kind: 'expression',
    prompt: [say('What is the degree of this polynomial?'), wrapped(`p(x) = ${termsTex(terms)}`)],
    lead: '\\text{degree of } p(x) =',
    keypad: [],
    answer: String(degreeOf(collect(terms))),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ terms }) => {
    const p = collect(terms);
    const degree = degreeOf(p);
    const written = Math.max(...terms.map((t) => t.k));
    if (written !== degree) {
      const top = terms.find((t) => t.k === written)!;
      return [
        {
          text: `The two $x^{${written}}$ terms cancel: $${termTex(top.c, written)} ${signedTerm(-top.c, written)} = 0$.`,
        },
        { text: `$p(x) = ${polyTex(p)}$` },
        { text: `The highest power left is $${termTex(1, degree)}$, so the degree is $${degree}$.` },
      ];
    }
    return [
      { text: 'The degree is the highest power of $x$. The terms are not in order, so check every one.' },
      { text: `$p(x) = ${polyTex(p)}$` },
      { text: `The highest power is $${termTex(1, degree)}$, so the degree is $${degree}$${terms.length === degree ? '' : ` — not the number of terms, which is ${terms.length}`}.` },
    ];
  },
};

interface NameParams {
  terms: Term[];
  /** A term that is not a whole power of x, spliced in at `at`. */
  bad?: { kind: number; m: number; sign: number; at: number };
}

const BAD_TERMS: { tex: (m: number) => string; power: string }[] = [
  { tex: (m) => `\\frac{${m}}{x}`, power: 'x^{-1}' },
  { tex: (m) => `${m}\\sqrt{x}`, power: 'x^{\\frac{1}{2}}' },
  { tex: (m) => `${m}x^{-2}`, power: 'x^{-2}' },
  { tex: (m) => `\\frac{${m}}{x^{2}}`, power: 'x^{-2}' },
  { tex: (m) => `${m}x^{\\frac{1}{2}}`, power: 'x^{\\frac{1}{2}}' },
];

function nameTex({ terms, bad }: NameParams): string {
  const pieces = terms.map(({ c, k }) => termTex(c, k));
  if (bad) {
    const tex = BAD_TERMS[bad.kind].tex(bad.m);
    pieces.splice(bad.at, 0, bad.sign < 0 ? `-${tex}` : tex);
  }
  return sumTex(pieces);
}

const powerLabel = (k: number): string => `$${termTex(1, k)}$`;

/**
 * Is it a polynomial, and what is it called? At difficulty 2 some are not
 * polynomials at all: one term has a negative or fractional power.
 */
const polyNameFlow: Generator<NameParams> = {
  id: 'poly-name-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const top = difficulty > 1 ? rng.int(2, 5) : rng.int(1, 4);
      const lower = rng.sample(
        Array.from({ length: top }, (_, k) => k),
        Math.min(top, rng.int(1, 3)),
      );
      const terms = rng.shuffle([top, ...lower].map((k) => ({ c: nonZero(rng, 9), k })));
      if (terms.length > 1 && terms[0].k === top) continue;
      if (difficulty > 1 && rng.chance(0.5)) {
        return {
          terms,
          bad: { kind: rng.int(0, BAD_TERMS.length - 1), m: rng.int(2, 9), sign: rng.sign(), at: rng.int(0, terms.length) },
        };
      }
      return { terms };
    }
  },
  render: (params): Slide => {
    const degree = degreeOf(collect(params.terms));
    return {
      kind: 'flow',
      prompt: [say('Decide whether this is a polynomial, and if it is, name it. Each answer chooses what gets asked next.')],
      subject: nameTex(params),
      steps: [
        {
          id: 'whole',
          ask: 'Is every power of $x$ here a whole number, $0$ or more?',
          branches: [
            { label: 'Yes', to: 'top' },
            { label: 'No', outcome: 'Then it is not a polynomial: a polynomial only has whole-number powers of $x$.' },
          ],
        },
        {
          id: 'top',
          ask: 'What is its highest power of $x$?',
          branches: [1, 2, 3, 4, 5].map((k) => ({ label: powerLabel(k), to: 'name' })),
        },
        {
          id: 'name',
          ask: 'So what kind of polynomial is it?',
          branches: NAMES.slice(1).map((name, idx) => ({
            label: name,
            outcome: `${name} means the highest power of $x$ is $${idx + 1}$.`,
          })),
        },
      ],
      answer: params.bad ? ['No'] : ['Yes', powerLabel(degree), NAMES[degree]],
    };
  },
  solution: (params) => {
    if (params.bad) {
      const bad = BAD_TERMS[params.bad.kind];
      return [
        { text: `The term $${bad.tex(params.bad.m)}$ is $${params.bad.m}${bad.power}$ written another way.` },
        {
          text: `Its power, $${bad.power.replace('x^', '')}$, is not a whole number of $0$ or more, so $${nameTex(params)}$ is not a polynomial.`,
        },
      ];
    }
    const p = collect(params.terms);
    const degree = degreeOf(p);
    return [
      { text: 'Every power of $x$ is a whole number, so it is a polynomial. In descending order:' },
      { tex: polyTex(p) },
      { text: `The highest power is $${termTex(1, degree)}$, so it is ${NAMES[degree] === 'Linear' ? 'linear' : `a ${NAMES[degree].toLowerCase()}`}.` },
    ];
  },
};

interface CoefficientParams {
  terms: Term[];
  k: number;
}

/**
 * One coefficient, read out of a jumbled polynomial. Difficulty 2 hides it
 * three ways: split across two like terms, missing entirely (so 0), or a bare
 * -x^k whose coefficient is -1.
 */
const polyCoefficient: Generator<CoefficientParams> = {
  id: 'poly-coefficient',
  sample: (rng, difficulty) => {
    for (;;) {
      const top = rng.int(3, 4);
      if (difficulty > 1) {
        const mode = rng.int(0, 2);
        if (mode === 0) {
          const k = rng.int(1, top);
          const others = rng.sample(
            Array.from({ length: top + 1 }, (_, j) => j).filter((j) => j !== k),
            2,
          );
          const c1 = nonZero(rng, 8);
          const c2 = nonZero(rng, 8);
          if (c1 + c2 === 0) continue;
          const terms = rng.shuffle([
            { c: c1, k },
            { c: c2, k },
            ...others.map((j) => ({ c: nonZero(rng, 9), k: j })),
          ]);
          return { terms, k };
        }
        if (mode === 1) {
          const k = rng.int(1, top - 1);
          const present = Array.from({ length: top + 1 }, (_, j) => j).filter((j) => j !== k);
          const terms = rng.shuffle(present.map((j) => ({ c: nonZero(rng, 9), k: j })));
          return { terms, k };
        }
        const k = rng.int(1, top);
        const others = rng.sample(
          Array.from({ length: top + 1 }, (_, j) => j).filter((j) => j !== k),
          rng.int(2, 3),
        );
        const terms = rng.shuffle([{ c: rng.sign(), k }, ...others.map((j) => ({ c: nonZero(rng, 9), k: j }))]);
        return { terms, k };
      }
      const powers = [top, ...rng.sample(Array.from({ length: top }, (_, j) => j), rng.int(2, 3))];
      const terms = rng.shuffle(powers.map((j) => ({ c: nonZero(rng, 9), k: j })));
      return { terms, k: rng.pick(powers) };
    }
  },
  choices: ({ terms, k }) => {
    const p = collect(terms);
    const right = coefficientOf(p, k);
    const piece = terms.find((t) => t.k === k)?.c ?? 1;
    return intOptions(right, [-right, piece, k, coefficientOf(p, k + 1), coefficientOf(p, k - 1)]);
  },
  render: ({ terms, k }): Slide => ({
    kind: 'expression',
    prompt: [
      say(k === 0 ? 'What is the constant term of this polynomial?' : `What is the coefficient of $${termTex(1, k)}$ in this polynomial?`),
      wrapped(`p(x) = ${termsTex(terms)}`),
    ],
    lead: k === 0 ? '\\text{constant term} =' : `\\text{coefficient of } ${termTex(1, k)} =`,
    keypad: [],
    answer: String(coefficientOf(collect(terms), k)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ terms, k }) => {
    const p = collect(terms);
    const right = coefficientOf(p, k);
    const at = terms.filter((t) => t.k === k);
    const steps: SolutionStep[] = [{ text: 'Collect like terms and write it in descending powers:' }, { text: `$p(x) = ${polyTex(p)}$` }];
    if (at.length === 0) {
      steps.push({ text: `There is no $${termTex(1, k)}$ term at all, so its coefficient is $0$.` });
    } else if (at.length > 1) {
      steps.push({ text: `The two $${termTex(1, k)}$ terms make $${at[0].c} ${signedNum(at[1].c)} = ${right}$.` });
    } else if (Math.abs(right) === 1) {
      steps.push({ text: `$${termTex(right, k)}$ means $${right}$ lots of $${termTex(1, k)}$, so the coefficient is $${right}$.` });
    } else {
      steps.push({ text: `The number in front of ${k === 0 ? 'nothing — the constant —' : `$${termTex(1, k)}$`} is $${right}$, sign included.` });
    }
    return steps;
  },
};

interface StandardParams {
  terms: Term[];
}

/** Rewrite a jumbled polynomial in descending powers, collecting like terms. */
const polyStandardTiles: Generator<StandardParams> = {
  id: 'poly-standard-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = [nonZero(rng, 6), nonZero(rng, 9), nonZero(rng, 9), nonZero(rng, 9)];
      const base: Term[] = p.map((c, i) => ({ c, k: 3 - i }));
      let terms = base;
      if (difficulty > 1) {
        const split = rng.int(0, 3);
        const piece = nonZero(rng, 9);
        const rest = base[split].c - piece;
        if (rest === 0 || piece === base[split].c) continue;
        terms = [...base.filter((_, i) => i !== split), { c: piece, k: base[split].k }, { c: rest, k: base[split].k }];
      }
      terms = rng.shuffle(terms);
      if (terms[0].k === 3 && terms[1].k === 2) continue;
      return { terms };
    }
  },
  render: ({ terms }): Slide => {
    const p = collect(terms);
    const answer = termTiles(p);
    const flipped = p.map((c, i) => signedTerm(-c, 3 - i, i === 0));
    const pieces = terms.map(({ c, k }) => signedTerm(c, k));
    return {
      kind: 'tiles',
      prompt: [say('Write $p(x)$ in descending powers of $x$, collecting any like terms.'), wrapped(`p(x) = ${termsTex(terms)}`)],
      template: 'p(x) = {0} {1} {2} {3}',
      bank: fillBank(answer, [...flipped, ...pieces, signedTerm(p[1], 1), signedTerm(p[2], 2)]),
      answer,
    };
  },
  solution: ({ terms }) => {
    const p = collect(terms);
    const steps: SolutionStep[] = [];
    const counts = new Map<number, number>();
    for (const t of terms) counts.set(t.k, (counts.get(t.k) ?? 0) + 1);
    const doubled = [...counts.entries()].find(([, n]) => n > 1)?.[0];
    if (doubled !== undefined) {
      const pair = terms.filter((t) => t.k === doubled);
      steps.push({
        text: `Collect the like terms first: $${termTex(pair[0].c, doubled)} ${signedTerm(pair[1].c, doubled)} = ${termTex(pair[0].c + pair[1].c, doubled)}$.`,
      });
    }
    steps.push({ text: 'Then write the terms from the highest power of $x$ down, each keeping its own sign.' });
    steps.push({ text: `$p(x) = ${polyTex(p)}$` });
    return steps;
  },
};

/* ================================================================
 * Level 1, lesson 2: adding and subtracting
 * ================================================================ */

function sampleCubic(rng: Rng, lead: number, rest: number): Poly {
  return [nonZero(rng, lead), nonZero(rng, rest), nonZero(rng, rest), nonZero(rng, rest)];
}

interface AddParams {
  p: Poly;
  q: Poly;
  minus: boolean;
}

function combined({ p, q, minus }: AddParams): Poly {
  return minus ? subPoly(p, q) : addPoly(p, q);
}

/** (p) + (q), or (p) - (q) at difficulty 2, built term by term. */
const polyAddTiles: Generator<AddParams> = {
  id: 'poly-add-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = sampleCubic(rng, 5, 8);
      const q = sampleCubic(rng, 5, 8);
      const params = { p, q, minus: difficulty > 1 };
      const r = combined(params);
      if (r.length !== 4 || r.some((c) => c === 0)) continue;
      return params;
    }
  },
  choices: (params) => {
    const { p, q, minus } = params;
    const r = combined(params);
    const other = minus ? addPoly(p, q) : subPoly(p, q);
    // Only the first term of the second bracket takes the minus sign.
    const firstOnly = minus ? addPoly(p, [-q[0], q[1], q[2], q[3]]) : addPoly(p, [q[0], q[1], q[2], -q[3]]);
    const constSlip = [...r.slice(0, 3), -r[3]];
    return options(
      { tex: polyTex(r), answer: polyAnswer(r) },
      { tex: polyTex(other), answer: polyAnswer(other) },
      { tex: polyTex(firstOnly), answer: polyAnswer(firstOnly) },
      { tex: polyTex(constSlip), answer: polyAnswer(constSlip) },
    );
  },
  render: (params): Slide => {
    const { p, q, minus } = params;
    const r = combined(params);
    const answer = termTiles(r);
    const other = minus ? addPoly(p, q) : subPoly(p, q);
    return {
      kind: 'tiles',
      prompt: [
        say(minus ? 'Subtract, collecting like terms.' : 'Add, collecting like terms.'),
        // One bracket to a line: side by side, two cubics are wider than a phone.
        show(chain(`&(${polyTex(p)})`, `${minus ? '-' : '+'}\\;&(${polyTex(q)})`)),
      ],
      template: '{0} {1} {2} {3}',
      bank: fillBank(answer, [...termTiles(other), ...r.map((c, i) => signedTerm(-c, 3 - i, i === 0))]),
      answer,
    };
  },
  solution: (params) => {
    const { p, q, minus } = params;
    const r = combined(params);
    const op = minus ? '-' : '+';
    const lines = [3, 2, 1, 0].map((k) => {
      const a = coefficientOf(p, k);
      const b = coefficientOf(q, k);
      return `${termTex(1, k) === '1' ? '\\text{number}' : termTex(1, k)}: &\\;${a} ${op} ${factor(String(b))} = ${coefficientOf(r, k)}`;
    });
    return [
      {
        text: minus
          ? 'Subtracting a bracket subtracts every term in it, so each power of $x$ is first minus second.'
          : 'Add the coefficients of each power of $x$ separately.',
      },
      { tex: chain(...lines) },
      { tex: polyTex(r) },
    ];
  },
};

/** A polynomial for the grader. Never displayed. */
function polyAnswer(p: Poly): string {
  const n = degreeOf(p);
  const terms = p.map((c, i) => (c === 0 ? '' : `(${c})*x^(${n - i})`)).filter(Boolean);
  return terms.length === 0 ? '0' : terms.join(' + ');
}

interface SubtractParams {
  p: Poly;
  q: Poly;
}

/** (p) - (q) in two steps: the minus sign into the bracket, then collect. */
const polySubtractSteps: Generator<SubtractParams> = {
  id: 'poly-subtract-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const size = difficulty > 1 ? 9 : 6;
      const p = sampleCubic(rng, 5, size);
      const q = sampleCubic(rng, 5, size);
      if (difficulty === 1 && q[0] < 0) continue;
      if (p[0] === q[0]) continue;
      return { p, q };
    }
  },
  render: ({ p, q }): Slide => {
    const inside = scalePoly(q, -1);
    const value = signedPolyTex(inside);
    const r = subPoly(p, q);
    return {
      kind: 'steps',
      prompt: [
        say(
          'Take the minus sign into the second bracket first, then collect like terms. Tap the part you would do **next**, then choose what it comes to.',
        ),
      ],
      start: [`(${polyTex(p)})`, '-', `(${polyTex(q)})`],
      reductions: [
        {
          span: [1, 3],
          operator: 1,
          value,
          bank: stepBank(
            value,
            signedPolyTex([-q[0], q[1], q[2], q[3]]),
            signedPolyTex(q),
            signedPolyTex([-q[0], -q[1], -q[2], q[3]]),
          ),
        },
        {
          span: [0, 2],
          value: polyTex(r),
          bank: stepBank(
            polyTex(r),
            polyTex(addPoly(p, q)),
            polyTex(addPoly(p, [-q[0], q[1], q[2], q[3]])),
            polyTex(addPoly(p, [-q[0], -q[1], -q[2], q[3]])),
          ),
        },
      ],
    };
  },
  solution: ({ p, q }) => [
    { text: 'The minus sign in front of a bracket changes the sign of every term inside it, not only the first.' },
    { tex: chain(`&-(${polyTex(q)})`, `=\\;&${polyTex(scalePoly(q, -1))}`) },
    { text: 'Then collect the like terms:' },
    { tex: chain(`&${polyTex(p)}`, `&\\quad ${signedPolyTex(scalePoly(q, -1))}`, `=\\;&${polyTex(subPoly(p, q))}`) },
  ],
};

interface CollectParams {
  p: Poly;
  q: Poly;
  m: number;
  n: number;
  minus: boolean;
  k: number;
}

function comboTex({ m, n, minus }: CollectParams): string {
  return `${m === 1 ? '' : m}p(x) ${minus ? '-' : '+'} ${n === 1 ? '' : n}q(x)`;
}

function comboCoefficient({ p, q, m, n, minus, k }: CollectParams): number {
  return m * coefficientOf(p, k) + (minus ? -1 : 1) * n * coefficientOf(q, k);
}

/**
 * One coefficient of p + q or p - q, and at difficulty 2 of mp ± nq, without
 * writing the whole thing out.
 */
const polyCollectCoefficient: Generator<CollectParams> = {
  id: 'poly-collect-coefficient',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const params = {
        p: sampleCubic(rng, 4, 7),
        q: sampleCubic(rng, 4, 7),
        m: hard ? rng.int(2, 4) : 1,
        n: hard ? rng.int(1, 4) : 1,
        minus: rng.chance(0.5),
        k: rng.int(0, 3),
      };
      if (comboCoefficient(params) === 0) continue;
      return params;
    }
  },
  choices: (params) => {
    const { p, q, m, n, minus, k } = params;
    const sign = minus ? -1 : 1;
    const a = coefficientOf(p, k);
    const b = coefficientOf(q, k);
    return intOptions(comboCoefficient(params), [
      m * a - sign * n * b,
      a + sign * b,
      m * a + sign * b,
      comboCoefficient({ ...params, k: k === 3 ? 2 : k + 1 }),
    ]);
  },
  render: (params): Slide => {
    const { p, q, k } = params;
    const what = k === 0 ? 'the constant term of' : `the coefficient of $${termTex(1, k)}$ in`;
    return {
      kind: 'expression',
      prompt: [wrapped(`p(x) = ${polyTex(p)}`), wrapped(`q(x) = ${polyTex(q)}`), say(`What is ${what} $${comboTex(params)}$?`)],
      lead: k === 0 ? '\\text{constant term} =' : `\\text{coefficient of } ${termTex(1, k)} =`,
      keypad: [],
      answer: String(comboCoefficient(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { p, q, m, n, minus, k } = params;
    const a = coefficientOf(p, k);
    const b = coefficientOf(q, k);
    const piece = k === 0 ? 'constant' : `$${termTex(1, k)}$ coefficient`;
    return [
      { text: `Only the ${piece} of each matters: $${a}$ in $p(x)$ and $${b}$ in $q(x)$.` },
      {
        tex: `${m === 1 ? '' : `${m} \\times `}${factor(String(a))} ${minus ? '-' : '+'} ${n === 1 ? '' : `${n} \\times `}${factor(String(b))} = ${comboCoefficient(params)}`,
      },
      ...(m > 1 || n > 1
        ? [{ text: 'Multiply each coefficient by its own number before adding or subtracting.' }]
        : []),
    ];
  },
};

interface SumDegreeParams {
  p: Poly;
  q: Poly;
  minus: boolean;
}

function randomPoly(rng: Rng, degree: number): Poly {
  const p = [nonZero(rng, 6), ...Array.from({ length: degree }, () => rng.int(-7, 7))];
  // Five terms at most: a full quintic is wider than a phone. The second term
  // is left alone, since whether it cancels is part of the question.
  while (p.filter((c) => c !== 0).length > 5) p[rng.int(2, degree)] = 0;
  return p;
}

/**
 * The degree of a sum or difference: the larger degree, unless the two share
 * a degree and their leading terms cancel.
 */
const polySumDegreeFlow: Generator<SumDegreeParams> = {
  id: 'poly-sum-degree-flow',
  sample: (rng, difficulty) => {
    const minus = difficulty > 1;
    for (;;) {
      const kind = rng.int(0, 2);
      const dp = rng.int(2, 5);
      const p = randomPoly(rng, dp);
      if (kind === 0) {
        const dq = rng.int(1, 5);
        if (dq === dp) continue;
        return { p, q: randomPoly(rng, dq), minus };
      }
      const q = randomPoly(rng, dp);
      if (kind === 1) {
        if ((minus ? p[0] - q[0] : p[0] + q[0]) === 0) continue;
        return { p, q, minus };
      }
      q[0] = minus ? p[0] : -p[0];
      // Exactly one power drops, so the answer is one below.
      if ((minus ? p[1] - q[1] : p[1] + q[1]) === 0) continue;
      return { p, q, minus };
    }
  },
  render: ({ p, q, minus }): Slide => {
    const r = minus ? subPoly(p, q) : addPoly(p, q);
    const same = degreeOf(p) === degreeOf(q);
    const cancels = same && degreeOf(r) < degreeOf(p);
    const expr = `p(x) ${minus ? '-' : '+'} q(x)`;
    const top = Math.max(degreeOf(p), degreeOf(q));
    const offered = [...new Set([degreeOf(r), top, top - 1, Math.min(degreeOf(p), degreeOf(q)), top + 1])]
      .filter((d) => d >= 0)
      .sort((a, b) => a - b);
    const degreeAnswer = `$${degreeOf(r)}$`;
    return {
      kind: 'flow',
      prompt: [
        wrapped(`p(x) = ${polyTex(p)}`),
        wrapped(`q(x) = ${polyTex(q)}`),
        say(`Find the degree of $${expr}$ without working it all out. Each answer chooses what gets asked next.`),
      ],
      subject: expr,
      steps: [
        {
          id: 'same',
          ask: 'Do $p(x)$ and $q(x)$ have the same degree?',
          branches: [
            { label: 'Yes', to: 'cancel' },
            { label: 'No', to: 'degree' },
          ],
        },
        {
          id: 'cancel',
          ask: `Do their leading terms cancel when you ${minus ? 'subtract' : 'add'}?`,
          branches: [
            { label: 'Yes', to: 'degree' },
            { label: 'No', to: 'degree' },
          ],
        },
        {
          id: 'degree',
          ask: `So what is the degree of $${expr}$?`,
          branches: offered.map((d) => ({
            label: `$${d}$`,
            outcome: `Degree $${d}$ means the highest power of $x$ left is $${termTex(1, d)}$.`,
          })),
        },
      ],
      answer: same ? ['Yes', cancels ? 'Yes' : 'No', degreeAnswer] : ['No', degreeAnswer],
    };
  },
  solution: ({ p, q, minus }) => {
    const r = minus ? subPoly(p, q) : addPoly(p, q);
    const dp = degreeOf(p);
    const dq = degreeOf(q);
    if (dp !== dq) {
      return [
        { text: `$p(x)$ has degree $${dp}$ and $q(x)$ has degree $${dq}$.` },
        { text: `The $${termTex(1, Math.max(dp, dq))}$ term has nothing to cancel against, so the degree is $${Math.max(dp, dq)}$.` },
      ];
    }
    const top = minus ? p[0] - q[0] : p[0] + q[0];
    return [
      { text: `Both have degree $${dp}$, so look at the leading terms.` },
      { tex: `${termTex(p[0], dp)} ${minus ? '-' : '+'} ${factor(termTex(q[0], dp))} = ${termTex(top, dp)}` },
      {
        text:
          top === 0
            ? `They cancel, so the degree drops to the next power left: $${degreeOf(r)}$. In full, $${polyTex(r)}$.`
            : `They do not cancel, so the degree stays $${dp}$.`,
      },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 3: a linear times a quadratic
 * ================================================================ */

interface ExpandParams {
  /** (ax + b)(cx^2 + dx + e) */
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}

function expanded({ a, b, c, d, e }: ExpandParams): Poly {
  return mulPoly([a, b], [c, d, e]);
}

function expandTex({ a, b, c, d, e }: ExpandParams): string {
  return `(${polyTex([a, b])})(${polyTex([c, d, e])})`;
}

function sampleExpand(rng: Rng, difficulty: number): ExpandParams {
  for (;;) {
    const hard = difficulty > 1;
    const params = {
      a: hard ? rng.int(1, 3) : 1,
      b: nonZero(rng, hard ? 7 : 6),
      c: hard ? rng.int(1, 3) : 1,
      d: nonZero(rng, hard ? 7 : 6),
      e: nonZero(rng, hard ? 7 : 6),
    };
    if (expanded(params).some((coefficient) => coefficient === 0)) continue;
    return params;
  }
}

/** Expand (ax + b)(cx^2 + dx + e) into four terms. */
const polyExpandTiles: Generator<ExpandParams> = {
  id: 'poly-expand-tiles',
  sample: sampleExpand,
  choices: (params) => {
    const { a, b, c, d, e } = params;
    const r = expanded(params);
    const ends = [a * c, 0, 0, b * e];
    const firstOnly = [a * c, a * d, a * e, b * e];
    const flipped = mulPoly([a, -b], [c, d, e]);
    return options(
      { tex: polyTex(r), answer: polyAnswer(r) },
      { tex: polyTex(ends), answer: polyAnswer(ends) },
      { tex: polyTex(firstOnly), answer: polyAnswer(firstOnly) },
      { tex: polyTex(flipped), answer: polyAnswer(flipped) },
    );
  },
  render: (params): Slide => {
    const { a, b, c, d, e } = params;
    const r = expanded(params);
    const answer = termTiles(r);
    return {
      kind: 'tiles',
      prompt: [say('Expand the brackets and collect like terms.'), show(expandTex(params))],
      template: '{0} {1} {2} {3}',
      bank: fillBank(answer, [
        signedTerm(a * d, 2),
        signedTerm(a * e, 1),
        signedTerm(b * c, 2),
        signedTerm(-b * e, 0),
        signedTerm(a * d - b * c, 2),
        signedTerm(r[1], 1),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, b, c, d, e } = params;
    const ax = termTex(a, 1);
    return [
      {
        text: `Multiply every term of $${polyTex([c, d, e])}$ by each term of $${polyTex([a, b])}$: six products.`,
      },
      {
        tex: chain(
          `\\times\\, ${ax}: &\\;\\; ${polyTex([a * c, a * d, a * e, 0])}`,
          `\\times\\, ${factor(String(b))}: &\\;\\; ${polyTex([b * c, b * d, b * e])}`,
        ),
      },
      { text: 'Then collect the $x^{2}$ terms and the $x$ terms:' },
      { tex: polyTex(expanded(params)) },
    ];
  },
};

/**
 * The two powers made by two products each, worked as strands: the four
 * products on top, each pair collected beneath.
 */
const polyStrandsTree: Generator<ExpandParams> = {
  id: 'poly-strands-tree',
  sample: sampleExpand,
  render: (params): Slide => {
    const { a, b, c, d, e } = params;
    const ax = termTex(a, 1);
    const dx = termTex(d, 1);
    const cx2 = termTex(c, 2);
    const answer = [
      termTex(a * d, 2),
      termTex(b * c, 2),
      termTex(a * e, 1),
      termTex(b * d, 1),
      termTex(a * d + b * c, 2),
      termTex(a * e + b * d, 1),
    ];
    return {
      kind: 'tree',
      prompt: [
        say(
          `The $x^{2}$ term and the $x$ term each come from two products. Top row, left to right: $${ax} \\times ${factor(dx)}$, $${factor(String(b))} \\times ${cx2}$, $${ax} \\times ${factor(String(e))}$ and $${factor(String(b))} \\times ${factor(dx)}$. Underneath, collect each pair: the $x^{2}$ term, then the $x$ term.`,
        ),
      ],
      expression: expandTex(params),
      nodes: [
        { id: 'p1', from: [] },
        { id: 'p2', from: [] },
        { id: 'p3', from: [] },
        { id: 'p4', from: [] },
        { id: 's1', from: ['p1', 'p2'] },
        { id: 's2', from: ['p3', 'p4'] },
      ],
      bank: fillBank(answer, [
        termTex(a * d - b * c, 2),
        termTex(a * e - b * d, 1),
        termTex(a * d + b * c, 1),
        termTex(a * e + b * d, 2),
        termTex(-a * d, 2),
        termTex(-b * d, 1),
        termTex(a * d, 1),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, b, c, d, e } = params;
    const ax = termTex(a, 1);
    return [
      {
        text: `An $x^{2}$ comes from $x$ times $x$, or from a number times $x^{2}$, so there are two products to find, and the same for $x$.`,
      },
      {
        text: `$${ax} \\times ${factor(termTex(d, 1))} ${signedNum(b)} \\times ${termTex(c, 2)} = ${termTex(a * d + b * c, 2)}$`,
      },
      {
        text: `$${ax} \\times ${factor(String(e))} ${signedNum(b)} \\times ${factor(termTex(d, 1))} = ${termTex(a * e + b * d, 1)}$`,
      },
      { text: `So the whole product is $${polyTex(expanded(params))}$.` },
    ];
  },
};

interface ProductCoefParams {
  f: Poly;
  g: Poly;
  k: number;
}

/** The pairs of terms whose product is an x^k term. */
function pairsFor({ f, g, k }: ProductCoefParams): { i: number; j: number; value: number }[] {
  const out: { i: number; j: number; value: number }[] = [];
  for (let i = 0; i <= degreeOf(f); i += 1) {
    const j = k - i;
    if (j < 0 || j > degreeOf(g)) continue;
    out.push({ i, j, value: coefficientOf(f, i) * coefficientOf(g, j) });
  }
  return out;
}

/**
 * One coefficient of a product without expanding it all. Difficulty 1 is a
 * linear times a quadratic; difficulty 2 two quadratics, where x^2 has three
 * products behind it.
 */
const polyProductCoefficient: Generator<ProductCoefParams> = {
  id: 'poly-product-coefficient',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const f = hard ? [rng.int(1, 3), nonZero(rng, 6), nonZero(rng, 6)] : [rng.int(1, 3), nonZero(rng, 7)];
      const g = [rng.int(1, 3), nonZero(rng, 7), nonZero(rng, 7)];
      const k = hard ? rng.int(1, 3) : rng.int(1, 2);
      const params = { f, g, k };
      if (coefficientOf(mulPoly(f, g), k) === 0) continue;
      return params;
    }
  },
  choices: (params) => {
    const pairs = pairsFor(params);
    const right = pairs.reduce((sum, pair) => sum + pair.value, 0);
    const product = mulPoly(params.f, params.g);
    return intOptions(right, [
      pairs[0].value,
      pairs[pairs.length - 1].value,
      pairs[0].value - (right - pairs[0].value),
      coefficientOf(product, params.k + 1),
      coefficientOf(product, params.k - 1),
    ]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(`Without expanding everything, find the coefficient of $${termTex(1, params.k)}$ in`),
      show(`(${polyTex(params.f)})(${polyTex(params.g)})`),
    ],
    lead: `\\text{coefficient of } ${termTex(1, params.k)} =`,
    keypad: [],
    answer: String(coefficientOf(mulPoly(params.f, params.g), params.k)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const pairs = pairsFor(params);
    const right = pairs.reduce((sum, pair) => sum + pair.value, 0);
    const products = pairs.map(
      ({ i, j }) => `${factor(termTex(coefficientOf(params.f, i), i))} \\times ${factor(termTex(coefficientOf(params.g, j), j))}`,
    );
    return [
      { text: `Find every pair of terms, one from each bracket, whose powers add to $${params.k}$.` },
      { tex: chain(...products.map((product, idx) => `${product} &= ${termTex(pairs[idx].value, params.k)}`)) },
      { text: `Together they make $${termTex(right, params.k)}$, so the coefficient is $${right}$.` },
    ];
  },
};

interface TripleParams {
  roots: number[];
}

/** Three brackets, two at a time: (x - r)(x - s) first, then times the third. */
const polyTripleSteps: Generator<TripleParams> = {
  id: 'poly-triple-steps',
  sample: (rng, difficulty) => ({ roots: sampleRoots(rng, 3, difficulty > 1 ? 5 : 3, difficulty > 1) }),
  render: ({ roots }): Slide => {
    const [r, s, t] = roots;
    const quad = fromRoots([r, s]);
    const cubic = fromRoots(roots);
    const quadValue = `(${polyTex(quad)})`;
    return {
      kind: 'steps',
      prompt: [
        say(
          'Multiply two brackets together first, then multiply that by the third. Tap the part you would do **next**, then choose what it comes to.',
        ),
      ],
      start: roots.map((root) => `(${linTex(root)})`),
      reductions: [
        {
          span: [0, 2],
          value: quadValue,
          bank: stepBank(
            quadValue,
            `(${polyTex([1, r + s, r * s])})`,
            `(${polyTex([1, -(r + s), -r * s])})`,
            `(${polyTex([1, r + s, -r * s])})`,
            `(${polyTex([1, -(r + s) + 1, r * s])})`,
          ),
        },
        {
          span: [0, 2],
          value: polyTex(cubic),
          bank: stepBank(
            polyTex(cubic),
            polyTex(fromRoots([r, s, -t])),
            polyTex([...cubic.slice(0, 3), -cubic[3]]),
            polyTex(addPoly(cubic, [0, 0, 1, 0])),
            polyTex(addPoly(cubic, [0, 1, 0, 0])),
          ),
        },
      ],
    };
  },
  solution: ({ roots }) => {
    const [r, s, t] = roots;
    const quad = fromRoots([r, s]);
    return [
      { text: `$(${linTex(r)})(${linTex(s)}) = ${polyTex(quad)}$` },
      { text: `Then every term of $${polyTex(quad)}$ times each term of $(${linTex(t)})$:` },
      {
        tex: chain(
          `\\times\\, x: &\\;\\; ${polyTex([...quad, 0])}`,
          `\\times\\, ${factor(String(-t))}: &\\;\\; ${polyTex(scalePoly(quad, -t))}`,
        ),
      },
      { tex: polyTex(fromRoots(roots)) },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 4: evaluating p(a)
 * ================================================================ */

interface ValueParams {
  p: Poly;
  a: number;
}

/** One term of p(a) as an expression tree: |c| × a^k, signs handled by the caller. */
function termExpr(size: number, k: number, a: number): Expr {
  if (k === 0) return num(size);
  const power = k === 1 ? num(a) : pow(num(a), num(k));
  return size === 1 ? power : bin('*', num(size), power);
}

/** p(a) as an expression the reduce widget can walk. The leading coefficient is positive. */
function valueExpr({ p, a }: ValueParams): Expr {
  const n = degreeOf(p);
  let acc: Expr | undefined;
  p.forEach((c, i) => {
    if (c === 0) return;
    const term = termExpr(Math.abs(c), n - i, a);
    acc = acc === undefined ? term : bin(c < 0 ? '-' : '+', acc, term);
  });
  return acc ?? num(0);
}

/** A bank for every node the learner can tap. */
function reduceBanks(expr: Expr): Record<string, string[]> {
  const banks: Record<string, string[]> = {};
  const walk = (node: Expr, path: string) => {
    if (node.kind === 'num') return;
    if (node.kind === 'power') {
      const base = valueOf(node.base);
      const exponent = valueOf(node.exponent);
      const value = valueOf(node);
      banks[path] = numBank(value, [base * exponent, -value, base ** (exponent - 1), base ** (exponent + 1)]);
      walk(node.base, `${path}.b`);
      walk(node.exponent, `${path}.e`);
      return;
    }
    if (node.kind === 'binary') {
      banks[path] = bankFor(node);
      walk(node.left, `${path}.l`);
      walk(node.right, `${path}.r`);
    }
  };
  walk(expr, 'r');
  return banks;
}

/**
 * p(a) written out term by term, two terms to a line so that it fits a phone:
 * p(-3) = 2(-3)^3 - 4(-3)^2, then + 6(-3) + 8 underneath. A bracketed negative
 * needs no times sign; a bare positive does, or 2 \times 3^3 would read as 23^3.
 */
function substitutedTex(p: Poly, a: number, total?: number, name = 'p'): string {
  const n = degreeOf(p);
  const shown = a < 0 ? `(${a})` : `${a}`;
  const pieces = p
    .map((c, i) => {
      const k = n - i;
      if (c === 0) return '';
      const power = k === 0 ? '' : k === 1 ? shown : `${shown}^{${k}}`;
      const size = Math.abs(c);
      const body = k === 0 ? `${size}` : size === 1 ? power : a < 0 ? `${size}${power}` : `${size} \\times ${power}`;
      return c < 0 ? `-${body}` : body;
    })
    .filter(Boolean);
  const lines: string[] = [];
  for (let i = 0; i < pieces.length; i += 2) {
    const row = sumTex(pieces.slice(i, i + 2));
    lines.push(i === 0 ? `${name}(${a}) &= ${row}` : `&\\quad ${row.startsWith('-') ? `- ${row.slice(1)}` : `+ ${row}`}`);
  }
  if (total !== undefined) lines.push(`&= ${total}`);
  return chain(...lines);
}

function sampleValue(rng: Rng, difficulty: number): ValueParams {
  for (;;) {
    const hard = difficulty > 1;
    const p = [rng.int(1, 3), rng.int(-6, 6), rng.int(-6, 6), nonZero(rng, 9)];
    const a = hard ? rng.pick([-3, -2, -1, 2]) : rng.pick([2, 3]);
    if (Math.abs(valueAt(p, a)) > 150) continue;
    return { p, a };
  }
}

/** Work out p(a) one piece at a time, powers first. */
const polyValueReduce: Generator<ValueParams> = {
  id: 'poly-value-reduce',
  sample: sampleValue,
  choices: ({ p, a }) => {
    const n = degreeOf(p);
    const timesNotPower = p.reduce((sum, c, i) => sum + c * (n - i === 0 ? 1 : a * (n - i)), 0);
    const bracketed = p.reduce((sum, c, i) => sum + (n - i === 0 ? c : (c * a) ** (n - i)), 0);
    return intOptions(valueAt(p, a), [valueAt(p, -a), timesNotPower, bracketed, valueAt(p, a) - 2 * p[n]]);
  },
  render: (params): Slide => {
    const expr = valueExpr(params);
    return {
      kind: 'reduce',
      prompt: [
        say(
          `$p(x) = ${polyTex(params.p)}$, and the line below is $p(${params.a})$. Tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      expr,
      banks: reduceBanks(expr),
    };
  },
  solution: ({ p, a }) => {
    const n = degreeOf(p);
    const powers = p
      .map((c, i) => (c !== 0 && n - i >= 2 ? `${a < 0 ? `(${a})` : a}^{${n - i}} = ${a ** (n - i)}` : ''))
      .filter(Boolean);
    return [
      { text: `Put $${a}$ in place of every $x$. Powers first, then the multiplying, then add and take away from left to right.` },
      { tex: substitutedTex(p, a) },
      ...(powers.length ? [{ tex: chain(...powers.map((line) => `& ${line}`)) }] : []),
      { tex: `p(${a}) = ${valueAt(p, a)}` },
    ];
  },
};

interface ValueSliderParams {
  roots: number[];
  lead: number;
  a: number;
}

const SLIDE_HEIGHT = 14;

function sliderPoly({ roots, lead }: ValueSliderParams): Poly {
  return fromRoots(roots, lead);
}

/** Clamp a curve's values so a steep arm leaves the picture without huge numbers in the SVG. */
function clamped(f: (x: number) => number, limit: number): (x: number) => number {
  return (x) => Math.max(-limit, Math.min(limit, f(x)));
}

/**
 * Slide a line to the height of the curve at x = a. The height is p(a), which
 * the learner works out; the picture shows whether the answer is sensible.
 */
const polyValueSlider: Generator<ValueSliderParams> = {
  id: 'poly-value-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const roots = rng.sample([-3, -2, -1, 0, 1, 2, 3], 3);
      const lead = hard ? rng.sign() : 1;
      const a = hard ? rng.int(-3, 3) : rng.pick([-1, 1, 2]);
      const value = valueAt(fromRoots(roots, lead), a);
      if (value === 0 || Math.abs(value) > 12) continue;
      return { roots, lead, a };
    }
  },
  render: (params): Slide => {
    const p = sliderPoly(params);
    const { a } = params;
    return {
      kind: 'slider',
      prompt: [
        say(
          `The curve is $y = p(x)$, where $p(x) = ${polyTex(p)}$. Slide the line to the height of the curve at the dashed line, $x = ${a}$. That height is $p(${a})$.`,
        ),
      ],
      min: -SLIDE_HEIGHT,
      max: SLIDE_HEIGHT,
      step: 1,
      answer: valueAt(p, a),
      readout: `p(${a}) = {v}`,
      figure: {
        svg: plotSvg({
          xMin: -4,
          xMax: 4,
          yMin: -SLIDE_HEIGHT,
          yMax: SLIDE_HEIGHT,
          curves: [{ f: clamped((x) => valueAt(p, x), 60) }],
          verticals: [{ x: a, dashed: true }],
          label: `The curve y equals p of x, with a dashed line at x equals ${a}`,
        }),
        ...markerWindow(-SLIDE_HEIGHT, SLIDE_HEIGHT, 'y'),
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const p = sliderPoly(params);
    const { a } = params;
    return [
      { text: `The height of $y = p(x)$ at $x = ${a}$ is $p(${a})$, so substitute:` },
      { tex: substitutedTex(p, a, valueAt(p, a)) },
      {
        text: `${valueAt(p, a) > 0 ? 'Positive, so the curve is above' : 'Negative, so the curve is below'} the $x$-axis there, which the picture agrees with.`,
      },
    ];
  },
};

interface SpecialParams {
  p: Poly;
  at: number;
}

/** p(0), p(1) and p(-1): the constant term, the sum of the coefficients, and the alternating sum. */
const polySpecialValue: Generator<SpecialParams> = {
  id: 'poly-special-value',
  sample: (rng, difficulty) => {
    const degree = rng.int(4, 5);
    const p = [nonZero(rng, 5), ...Array.from({ length: degree }, () => rng.int(-9, 9))];
    if (p[degree] === 0) p[degree] = nonZero(rng, 9);
    return { p, at: difficulty > 1 ? rng.pick([1, -1]) : rng.pick([0, 1]) };
  },
  choices: ({ p, at }) => {
    const constant = p[p.length - 1];
    const sizes = p.reduce((sum, c) => sum + Math.abs(c), 0);
    return intOptions(valueAt(p, at), [
      at === 0 ? p[0] : constant,
      valueAt(p, -at),
      at === 0 ? valueAt(p, 1) : sizes,
      -valueAt(p, at),
    ]);
  },
  render: ({ p, at }): Slide => ({
    kind: 'expression',
    prompt: [say(`$p(x) = ${polyTex(p)}$. Find $p(${at})$.`)],
    lead: `p(${at}) =`,
    keypad: [],
    answer: String(valueAt(p, at)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ p, at }) => {
    const n = degreeOf(p);
    if (at === 0) {
      return [
        { text: 'Every term with an $x$ in it is $0$ when $x = 0$, so only the constant term is left.' },
        { tex: `p(0) = ${p[n]}` },
      ];
    }
    if (at === 1) {
      return [
        { text: 'Every power of $1$ is $1$, so $p(1)$ is just the coefficients added up.' },
        { text: `$p(1) = ${sumTex(p.filter((c) => c !== 0).map(String))} = ${valueAt(p, 1)}$` },
      ];
    }
    const signed = p.map((c, i) => ((n - i) % 2 === 0 ? c : -c)).filter((c) => c !== 0);
    return [
      { text: 'An even power of $-1$ is $1$ and an odd power is $-1$, so the odd-power terms change sign.' },
      { text: `$p(-1) = ${sumTex(signed.map(String))} = ${valueAt(p, -1)}$` },
    ];
  },
};

type KPhrasing = 'value' | 'factor' | 'remainder';

interface KParams {
  p: Poly;
  /** Index into p of the coefficient replaced by k. */
  slot: number;
  /** The divisor is (x - a); for 'value', the input. */
  a: number;
  phrasing: KPhrasing;
}

function kPolyTex({ p, slot }: KParams): string {
  const n = degreeOf(p);
  const pieces = p.map((c, i) => {
    if (i !== slot) return termTex(c, n - i);
    const k = n - i;
    return k === 0 ? 'k' : k === 1 ? 'kx' : `kx^{${k}}`;
  });
  return sumTex(pieces);
}

/** Everything in p(a) except the k term, and what k is multiplied by. */
function kParts({ p, slot, a }: KParams): { rest: number; times: number } {
  const n = degreeOf(p);
  const rest = p.reduce((sum, c, i) => (i === slot ? sum : sum + c * a ** (n - i)), 0);
  return { rest, times: a ** (n - slot) };
}

function sampleK(rng: Rng, phrasing: KPhrasing, a: number): KParams {
  for (;;) {
    const slot = rng.int(1, 3);
    let p: Poly;
    if (phrasing === 'factor') {
      p = mulPoly([1, -a], [1, nonZero(rng, 6), nonZero(rng, 8)]);
    } else {
      p = [1, nonZero(rng, 8), nonZero(rng, 8), nonZero(rng, 9)];
    }
    if (p[slot] === 0 || p.some((c, i) => i !== slot && c === 0)) continue;
    return { p, slot, a, phrasing };
  }
}

function kPrompt(params: KParams): string {
  const { a, phrasing } = params;
  const value = valueAt(params.p, a);
  const tex = kPolyTex(params);
  if (phrasing === 'value') return `$p(x) = ${tex}$ and $p(${a}) = ${value}$. Find $k$.`;
  if (phrasing === 'factor') return `$(${linTex(a)})$ is a factor of $p(x) = ${tex}$. Find $k$.`;
  return `When $p(x) = ${tex}$ is divided by $(${linTex(a)})$, the remainder is $${value}$. Find $k$.`;
}

function kChoices(params: KParams): ChoiceOption[] {
  const k = params.p[params.slot];
  const value = valueAt(params.p, params.a);
  const flip = kParts({ ...params, a: -params.a });
  const n = degreeOf(params.p);
  const flat = params.p.reduce((sum, c, i) => (i === params.slot ? sum : sum + c * params.a ** (n - i)), 0);
  return intOptions(k, [
    -k,
    (value - flip.rest) / flip.times,
    (value - flat) / params.a,
    (value + kParts(params).rest) / kParts(params).times,
  ]);
}

function kSolution(params: KParams): SolutionStep[] {
  const { p, slot, a, phrasing } = params;
  const k = p[slot];
  const value = valueAt(p, a);
  const { rest, times } = kParts(params);
  const reason =
    phrasing === 'value'
      ? `Substitute $x = ${a}$ and set the result equal to $${value}$.`
      : phrasing === 'factor'
        ? `By the factor theorem, $p(${a}) = 0$. Substitute and solve.`
        : `By the remainder theorem, the remainder is $p(${a})$, so $p(${a}) = ${value}$.`;
  const kTerm = times === 1 ? 'k' : times === -1 ? '-k' : `${times}k`;
  return [
    { text: reason },
    {
      tex: chain(
        `${rest} ${kTerm.startsWith('-') ? kTerm.replace('-', '- ') : `+ ${kTerm}`} &= ${value}`,
        ...(kTerm === 'k' ? [] : [`${kTerm} &= ${value - rest}`]),
        `k &= ${k}`,
      ),
    },
  ];
}

/**
 * An unknown coefficient from one fact about p. Difficulty 1 gives p(a)
 * outright; difficulty 2 says (x - a) is a factor, so p(a) = 0.
 */
const polyFindK: Generator<KParams> = {
  id: 'poly-find-k',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? sampleK(rng, 'factor', nonZero(rng, 3))
      : sampleK(rng, 'value', rng.pick([-2, -1, 1, 2, 3])),
  choices: kChoices,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(kPrompt(params))],
    lead: 'k =',
    keypad: [],
    answer: String(params.p[params.slot]),
    domain: 'real',
    mode: 'exact',
  }),
  solution: kSolution,
};

/** The same, from a remainder: dividing by (x - a) at difficulty 1, by (x + a) at 2. */
const polyRemainderK: Generator<KParams> = {
  id: 'poly-remainder-k',
  sample: (rng, difficulty) => sampleK(rng, 'remainder', difficulty > 1 ? -rng.int(1, 3) : rng.int(1, 3)),
  choices: kChoices,
  render: polyFindK.render,
  solution: kSolution,
};

/* ================================================================
 * Level 1, lesson 5: dividing by a linear factor
 * ================================================================ */

interface DivideParams {
  a: number;
  /** The quotient, highest power first. */
  q: Poly;
  r: number;
}

function dividend({ a, q, r }: DivideParams): Poly {
  return addPoly(mulPoly([1, -a], q), [r]);
}

/** A running line's term, shown even when its coefficient is 0 so no place goes missing. */
function placeTerm(c: number, k: number): string {
  if (c !== 0) return signedTerm(c, k);
  return k === 0 ? '+ 0' : k === 1 ? '+ 0x' : `+ 0x^{${k}}`;
}

function sampleDivide(rng: Rng, difficulty: number, lead = 1): DivideParams {
  for (;;) {
    const a = nonZero(rng, 4);
    const q = [lead, nonZero(rng, 6), nonZero(rng, 7)];
    const r = difficulty > 1 ? nonZero(rng, 9) : 0;
    const p = dividend({ a, q, r });
    // The leading coefficient is the only one the widget will not show as a
    // placeholder, and a cubic that has lost it is not a cubic.
    if (p.length !== 4) continue;
    return { a, q, r };
  }
}

/**
 * Long division as a line that shrinks: each step takes away (first term ÷ x)
 * copies of (x - a) from the first two terms, leaving the next first term.
 * The quotient is what was taken away; the last value is the remainder.
 */
const polyDivideSteps: Generator<DivideParams> = {
  id: 'poly-divide-steps',
  sample: (rng, difficulty) => sampleDivide(rng, difficulty),
  render: (params): Slide => {
    const { a, q, r } = params;
    const p = dividend(params);
    const [, b, c] = q;
    const first = termTex(b, 2);
    const second = termTex(c, 1);
    return {
      kind: 'steps',
      prompt: [
        say(
          `Divide by $(${linTex(a)})$. Each step takes away enough copies of $(${linTex(a)})$ to clear the first term, which leaves a new first term; what is left at the end is the remainder. Tap the part you would do **next**, then choose what it leaves.`,
        ),
      ],
      start: [termTex(1, 3), placeTerm(p[1], 2), placeTerm(p[2], 1), placeTerm(p[3], 0)],
      reductions: [
        {
          span: [0, 2],
          value: first,
          bank: stepBank(first, termTex(p[1] - a, 2), termTex(p[1], 2), termTex(b, 3), termTex(p[1] + 2 * a, 2)),
        },
        {
          span: [0, 2],
          value: second,
          bank: stepBank(second, termTex(p[2] - a * b, 1), termTex(p[2] + b, 1), termTex(p[2], 1), termTex(c, 2)),
        },
        {
          span: [0, 2],
          value: String(r),
          bank: stepBank(String(r), String(p[3] - a * c), String(p[3]), String(p[3] + c), String(-r)),
        },
      ],
    };
  },
  solution: (params) => {
    const { a, q, r } = params;
    const p = dividend(params);
    const [, b, c] = q;
    const lin = `(${linTex(a)})`;
    return [
      { text: `Clear the first term each time by taking away the right multiple of $${lin}$.` },
      // One step to a line, as prose: a step written out in full is wider than a phone.
      { text: `$x^{3} ${placeTerm(p[1], 2)} - x^{2}${lin} = ${termTex(b, 2)}$` },
      { text: `$${termTex(b, 2)} ${placeTerm(p[2], 1)} - ${factor(termTex(b, 1))}${lin} = ${termTex(c, 1)}$` },
      { text: `$${termTex(c, 1)} ${placeTerm(p[3], 0)} - ${factor(String(c))}${lin} = ${r}$` },
      {
        text: `What was taken away is the quotient, $${polyTex(q)}$, and the remainder is $${r}$.`,
      },
    ];
  },
};

interface SyntheticParams {
  a: number;
  q: Poly;
  r: number;
}

/**
 * Synthetic division as a chain: bring the first coefficient down, then
 * multiply by a and add the next, all the way to the remainder.
 */
const polySyntheticTree: Generator<SyntheticParams> = {
  id: 'poly-synthetic-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const lead = hard ? rng.int(2, 3) : 1;
    const a = nonZero(rng, 3);
    const q = [lead, rng.int(-6, 6), rng.int(-7, 7)];
    const r = rng.chance(0.4) ? 0 : nonZero(rng, 9);
    return { a, q, r };
  },
  render: (params): Slide => {
    const { a, q, r } = params;
    const p = dividend(params);
    const answer = [...q, r].map(String);
    // The same chain run with the sign of a the wrong way round.
    const wrong = divideBy(p, -a);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Synthetic division by $(${linTex(a)})$ uses $${a}$ and the coefficients of $p(x)$. Bring the first coefficient down, then at each step multiply by $${a}$ and add the next coefficient. Fill in from the top: the quotient's coefficients, then the remainder.`,
        ),
        show(`\\begin{array}{r|rrrr} ${a} & ${p.join(' & ')} \\end{array}`),
      ],
      // A fraction rather than a division sign: on one line it is wider than a phone.
      expression: `\\frac{${polyTex(p)}}{${linTex(a)}}`,
      nodes: [
        { id: 'c2', from: [] },
        { id: 'c1', from: ['c2'] },
        { id: 'c0', from: ['c1'] },
        { id: 'rem', from: ['c0'] },
      ],
      bank: numberBank([...q, r], [...wrong.quotient, wrong.remainder, a * q[0], p[1], p[3]]),
      answer,
    };
  },
  solution: (params) => {
    const { a, q, r } = params;
    const p = dividend(params);
    return [
      { text: `Bring down $${p[0]}$, then multiply by $${a}$ and add the next coefficient each time.` },
      {
        tex: chain(
          `${factor(String(q[0]))} \\times ${factor(String(a))} + ${factor(String(p[1]))} &= ${q[1]}`,
          `${factor(String(q[1]))} \\times ${factor(String(a))} + ${factor(String(p[2]))} &= ${q[2]}`,
          `${factor(String(q[2]))} \\times ${factor(String(a))} + ${factor(String(p[3]))} &= ${r}`,
        ),
      },
      { text: `The quotient is $${polyTex(q)}$ and the remainder is $${r}$.` },
    ];
  },
};

/**
 * Build the quotient (and at difficulty 2 the remainder) into
 * p(x) = (x - a)(quotient) + remainder.
 */
const polyQuotientTiles: Generator<DivideParams> = {
  id: 'poly-quotient-tiles',
  sample: (rng, difficulty) => sampleDivide(rng, difficulty, difficulty > 1 ? rng.int(1, 2) : 1),
  render: (params): Slide => {
    const { a, q, r } = params;
    const p = dividend(params);
    const quotient = termTiles(q);
    const answer = r === 0 ? quotient : [...quotient, signedNum(r)];
    const wrong = divideBy(p, -a);
    return {
      kind: 'tiles',
      prompt: [
        say(`Divide $p(x)$ by $(${linTex(a)})$. Fill in the quotient${r === 0 ? '' : ' and the remainder'}.`),
        show(`p(x) = ${polyTex(p)}`),
      ],
      template: `(${linTex(a)})({0} {1} {2})${r === 0 ? '' : ' {3}'}`,
      bank: fillBank(answer, [
        ...termTiles(wrong.quotient).slice(1),
        signedTerm(-q[1], 1),
        signedTerm(-q[2], 0),
        ...(r === 0 ? [] : [signedNum(wrong.remainder), signedNum(-r), signedNum(p[3])]),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, q, r } = params;
    const p = dividend(params);
    return [
      { text: `Divide by $(${linTex(a)})$, by long or synthetic division:` },
      { tex: `\\begin{array}{r|rrrr} ${a} & ${p.join(' & ')} \\\\ & ${q.join(' & ')} & ${r} \\end{array}` },
      { text: `So the quotient is $${polyTex(q)}$ and the remainder is $${r}$.` },
      { text: `$p(x) = (${linTex(a)})(${polyTex(q)})${r === 0 ? '' : ` ${signedNum(r)}`}$` },
    ];
  },
};

/** From divisor, quotient and remainder back to the dividend: which is p(x)? */
const polyRebuild: Generator<DivideParams> = {
  id: 'poly-rebuild',
  sample: (rng, difficulty) => {
    for (;;) {
      const a = difficulty > 1 ? nonZero(rng, 5) : rng.int(1, 5);
      const q = [difficulty > 1 ? rng.int(1, 2) : 1, nonZero(rng, 6), nonZero(rng, 7)];
      const params = { a, q, r: nonZero(rng, 9) };
      if (dividend(params).length !== 4) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { a, q, r } = params;
    const p = dividend(params);
    const otherSign = addPoly(mulPoly([1, a], q), [r]);
    const minusR = addPoly(mulPoly([1, -a], q), [-r]);
    const noR = mulPoly([1, -a], q);
    return choiceSlide(
      [
        say(
          `When $p(x)$ is divided by $(${linTex(a)})$, the quotient is $${polyTex(q)}$ and the remainder is $${r}$. Which is $p(x)$?`,
        ),
      ],
      options(
        { tex: polyTex(p) },
        { tex: polyTex(otherSign) },
        { tex: polyTex(minusR) },
        { tex: polyTex(noR) },
      ),
    );
  },
  solution: (params) => {
    const { a, q, r } = params;
    return [
      { text: 'The dividend is the divisor times the quotient, plus the remainder.' },
      { text: `$p(x) = (${linTex(a)})(${polyTex(q)}) ${signedNum(r)}$` },
      { text: `Expanding the brackets gives $${polyTex(mulPoly([1, -a], q))}$, then ${r < 0 ? `take away $${-r}$` : `add $${r}$`}:` },
      { tex: polyTex(dividend(params)) },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 1: the remainder theorem
 * ================================================================ */

interface RemainderParams {
  p: Poly;
  /** The divisor is (x - a). */
  a: number;
}

function sampleRemainder(rng: Rng, difficulty: number): RemainderParams {
  for (;;) {
    const a = difficulty > 1 ? -rng.int(1, 3) : rng.int(1, 3);
    const p = [rng.int(1, 3), rng.int(-6, 6), rng.int(-6, 6), nonZero(rng, 9)];
    if (Math.abs(valueAt(p, a)) > 120) continue;
    return { p, a };
  }
}

/** The remainder on dividing by (x - a), found as p(a) without dividing. */
const polyRemainder: Generator<RemainderParams> = {
  id: 'poly-remainder',
  sample: sampleRemainder,
  choices: ({ p, a }) => intOptions(valueAt(p, a), [valueAt(p, -a), p[3], valueAt(p, 1), -valueAt(p, a)]),
  render: ({ p, a }): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the remainder when $p(x) = ${polyTex(p)}$ is divided by $(${linTex(a)})$.`)],
    lead: '\\text{remainder} =',
    keypad: [],
    answer: String(valueAt(p, a)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ p, a }) => [
    { text: `By the remainder theorem, dividing by $(${linTex(a)})$ leaves $p(${a})$, since $x = ${a}$ is what makes $${linTex(a)}$ zero.` },
    { tex: substitutedTex(p, a, valueAt(p, a)) },
    { text: `So the remainder is $${valueAt(p, a)}$, with no division needed.` },
  ],
};

/** Up to `count` wrong values of p(v), each different from the real one and from each other. */
function valueSlips(p: Poly, v: number, count: number, withZero: boolean): number[] {
  const right = valueAt(p, v);
  const out: number[] = [];
  const seen = new Set([right]);
  const candidates = [...(withZero ? [0] : []), valueAt(p, -v), right - 2 * p[p.length - 1], ...near(right, 6)];
  for (const value of candidates) {
    if (out.length === count) break;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/**
 * Which value goes in, then what it gives. Dividing by (x + a) at difficulty
 * 2, where the value that goes in is -a.
 */
const polySubstituteFlow: Generator<RemainderParams> = {
  id: 'poly-substitute-flow',
  sample: sampleRemainder,
  render: ({ p, a }): Slide => {
    const inputs = [a, -a, 0];
    const key = `${polyTex(p)}|${a}`;
    return {
      kind: 'flow',
      prompt: [
        say(
          `$p(x) = ${polyTex(p)}$. Find the remainder when it is divided by $(${linTex(a)})$, without dividing. Each answer chooses what gets asked next.`,
        ),
      ],
      subject: `p(x) \\div (${linTex(a)})`,
      steps: [
        {
          id: 'input',
          ask: 'Which value of $x$ do you put into $p(x)$?',
          branches: turned(
            inputs.map((v, i) => ({ label: `$x = ${v}$`, to: `v${i}` })),
            key,
          ),
        },
        ...inputs.map((v, i) => ({
          id: `v${i}`,
          ask: `What is $p(${v})$?`,
          branches: turned(
            [valueAt(p, v), ...valueSlips(p, v, 2, false)].map((value) => ({
              label: `$${value}$`,
              outcome: `That makes the remainder $${value}$.`,
            })),
            `${key}|${v}`,
          ),
        })),
      ],
      answer: [`$x = ${a}$`, `$${valueAt(p, a)}$`],
    };
  },
  solution: ({ p, a }) => [
    { text: `$${linTex(a)}$ is zero when $x = ${a}$, so the remainder is $p(${a})$.` },
    { tex: substitutedTex(p, a, valueAt(p, a)) },
  ],
};

/* ================================================================
 * Level 2, lesson 2: the factor theorem
 * ================================================================ */

interface FactorCheckParams {
  p: Poly;
  a: number;
}

/** Half the time (x - a) is a factor, built in; otherwise p(a) is small and not zero. */
function sampleFactorCheck(rng: Rng, difficulty: number): FactorCheckParams {
  for (;;) {
    const a = difficulty > 1 ? -rng.int(1, 3) : rng.int(1, 3);
    const p = rng.chance(0.5)
      ? mulPoly([1, -a], [rng.int(1, 2), nonZero(rng, 5), nonZero(rng, 8)])
      : [rng.int(1, 2), nonZero(rng, 6), nonZero(rng, 6), nonZero(rng, 9)];
    if (p.some((c) => c === 0) || Math.abs(valueAt(p, a)) > 60) continue;
    return { p, a };
  }
}

/** Is (x - a) a factor? Which value goes in, what it gives, and so what. */
const polyFactorFlow: Generator<FactorCheckParams> = {
  id: 'poly-factor-flow',
  sample: sampleFactorCheck,
  render: ({ p, a }): Slide => {
    const key = `${polyTex(p)}|${a}`;
    const inputs = [a, -a];
    const value = valueAt(p, a);
    return {
      kind: 'flow',
      prompt: [say(`Is $(${linTex(a)})$ a factor of $p(x)$? Each answer chooses what gets asked next.`)],
      subject: `p(x) = ${polyTex(p)}`,
      steps: [
        {
          id: 'input',
          ask: `Which value of $x$ makes $${linTex(a)}$ zero?`,
          branches: turned(
            inputs.map((v, i) => ({ label: `$x = ${v}$`, to: `v${i}` })),
            key,
          ),
        },
        ...inputs.map((v, i) => ({
          id: `v${i}`,
          ask: `What is $p(${v})$?`,
          branches: turned(
            [valueAt(p, v), ...valueSlips(p, v, 2, valueAt(p, v) !== 0)].map((option) => ({
              label: `$${option}$`,
              to: 'verdict',
            })),
            `${key}|${v}`,
          ),
        })),
        {
          id: 'verdict',
          ask: `So is $(${linTex(a)})$ a factor of $p(x)$?`,
          branches: [
            { label: 'Yes', outcome: 'A factor divides exactly: it leaves a remainder of $0$.' },
            { label: 'No', outcome: 'Not a factor: dividing by it would leave a remainder.' },
          ],
        },
      ],
      answer: [`$x = ${a}$`, `$${value}$`, value === 0 ? 'Yes' : 'No'],
    };
  },
  solution: ({ p, a }) => {
    const value = valueAt(p, a);
    return [
      { text: `$${linTex(a)} = 0$ when $x = ${a}$, so work out $p(${a})$.` },
      { tex: substitutedTex(p, a, value) },
      {
        text:
          value === 0
            ? `It is $0$, so by the factor theorem $(${linTex(a)})$ is a factor.`
            : `It is not $0$, so $(${linTex(a)})$ is not a factor: dividing by it leaves $${value}$.`,
      },
    ];
  },
};

interface IsFactorParams {
  roots: number[];
  others: number[];
}

/** Exactly one of four linear brackets is a factor. The decoys include the sign traps. */
const polyIsFactor: Generator<IsFactorParams> = {
  id: 'poly-is-factor',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, difficulty > 1 ? 5 : 3);
      const p = fromRoots(roots);
      const notRoot = (s: number) => s !== 0 && valueAt(p, s) !== 0;
      const traps = [...new Set(roots.map((r) => -r))].filter(notRoot);
      const rest = trialOrder(p[3]).filter((s) => notRoot(s) && !traps.includes(s));
      const pool = [...traps, ...rng.shuffle(rest)];
      if (pool.length < 3) continue;
      return { roots, others: pool.slice(0, 3) };
    }
  },
  render: ({ roots, others }): Slide => {
    const p = fromRoots(roots);
    return choiceSlide(
      [say(`Exactly one of these is a factor of $p(x) = ${polyTex(p)}$. Which one?`)],
      options({ tex: `(${linTex(roots[0])})` }, ...others.map((s) => ({ tex: `(${linTex(s)})` }))),
    );
  },
  solution: ({ roots, others }) => {
    const p = fromRoots(roots);
    const tried = [roots[0], ...others].sort((x, y) => x - y);
    return [
      { text: '$(x - r)$ is a factor exactly when $p(r) = 0$, so test the value that makes each bracket zero.' },
      { tex: chain(...tried.map((s) => `p(${s}) &= ${valueAt(p, s)}`)) },
      { text: `Only $p(${roots[0]})$ is $0$, so $(${linTex(roots[0])})$ is the factor.` },
    ];
  },
};

/** p(a) worked in strands: each term's value, then pairs, then the total. */
const polyFactorTree: Generator<FactorCheckParams> = {
  id: 'poly-factor-tree',
  sample: sampleFactorCheck,
  render: ({ p, a }): Slide => {
    const terms = p.map((c, i) => c * a ** (3 - i));
    const first = terms[0] + terms[1];
    const second = terms[2] + terms[3];
    const answer = [...terms, first, second, first + second].map(String);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Is $(${linTex(a)})$ a factor of $p(x) = ${polyTex(p)}$? Work out $p(${a})$ in pieces. Top row, left to right: the value of each term at $x = ${a}$. Then add them in pairs, then the total. A total of $0$ means it is a factor.`,
        ),
      ],
      expression: substitutedTex(p, a),
      nodes: [
        { id: 't3', from: [] },
        { id: 't2', from: [] },
        { id: 't1', from: [] },
        { id: 't0', from: [] },
        { id: 's1', from: ['t3', 't2'] },
        { id: 's2', from: ['t1', 't0'] },
        { id: 'total', from: ['s1', 's2'] },
      ],
      bank: numberBank(
        [...terms, first, second, first + second],
        [...terms.slice(0, 3).map((t) => -t), p[1] * a * 2, terms[0] - terms[1], -(first + second)],
      ),
      answer,
    };
  },
  solution: ({ p, a }) => {
    const terms = p.map((c, i) => c * a ** (3 - i));
    const total = valueAt(p, a);
    return [
      { text: `Each term at $x = ${a}$:` },
      { tex: `${sumTex(terms.map(String))}` },
      { tex: `p(${a}) = ${terms[0] + terms[1]} ${signedNum(terms[2] + terms[3])} = ${total}` },
      {
        text:
          total === 0
            ? `$p(${a}) = 0$, so $(${linTex(a)})$ is a factor.`
            : `$p(${a}) = ${total}$, not $0$, so $(${linTex(a)})$ is not a factor.`,
      },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 3: finding a factor by trial
 * ================================================================ */

interface RootsParams {
  roots: number[];
}

/** Which list of candidates holds every possible whole root? The divisors of the constant, both signs. */
const polyCandidates: Generator<RootsParams> = {
  id: 'poly-candidates',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, difficulty > 1 ? 5 : 4, difficulty > 1);
      const p = fromRoots(roots);
      const constant = Math.abs(p[3]);
      if (constant > (difficulty > 1 ? 30 : 18) || divisors(constant).length > 6) continue;
      if (p[1] === 0 || p[2] === 0) continue;
      return { roots };
    }
  },
  render: ({ roots }): Slide => {
    const p = fromRoots(roots);
    const own = divisors(p[3]);
    const others = [divisors(p[2]), divisors(p[1]), [1, Math.abs(p[3])]]
      .filter((list) => list.join() !== own.join())
      .map((list) => ({ tex: pmList(list) }));
    return choiceSlide(
      [say(`Which list holds every whole number worth trying as a root of $p(x) = ${polyTex(p)}$?`)],
      options({ tex: pmList(own) }, { tex: own.join(', ') }, ...others).slice(0, 4),
    );
  },
  solution: ({ roots }) => {
    const p = fromRoots(roots);
    return [
      {
        text: `A whole-number root $r$ gives a factor $(x - r)$, and the constants of the factors multiply to make the constant term, $${p[3]}$. So $r$ must divide $${Math.abs(p[3])}$.`,
      },
      { text: `Negative divisors count too, so the list is $${pmList(divisors(p[3]))}$.` },
      { text: `Here the roots turn out to be $${[...roots].sort((x, y) => x - y).join(', ')}$, all on that list.` },
    ];
  },
};

/**
 * Trial and improvement down the list of divisors: work out p at each until
 * one gives zero. Wrong values carry on down the list, so a slip is found out
 * at the end rather than stopped on the spot.
 */
const polyTrialFlow: Generator<RootsParams> = {
  id: 'poly-trial-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, difficulty > 1 ? 6 : 4);
      const p = fromRoots(roots);
      const found = trialOrder(p[3]).findIndex((s) => valueAt(p, s) === 0);
      if (found < 1 || found > (difficulty > 1 ? 4 : 3)) continue;
      return { roots };
    }
  },
  render: ({ roots }): Slide => {
    const p = fromRoots(roots);
    const order = trialOrder(p[3]);
    const found = order.findIndex((s) => valueAt(p, s) === 0);
    const tries = order.slice(0, found + 1);
    return {
      kind: 'flow',
      prompt: [
        say(
          `Find a factor by trial: try the whole numbers that divide $${Math.abs(p[3])}$, in the order $${order.slice(0, 4).join(', ')}, \\dots$, until one gives $0$. Each answer chooses what gets asked next.`,
        ),
      ],
      subject: `p(x) = ${polyTex(p)}`,
      steps: tries.map((s, i) => {
        const right = valueAt(p, s);
        const last = i === found;
        return {
          id: `t${i}`,
          ask: `Try $x = ${s}$. What is $p(${s})$?`,
          branches: turned(
            [right, ...valueSlips(p, s, 2, right !== 0)].map((value) =>
              value === 0
                ? { label: '$0$', outcome: `A value of $0$ makes $(${linTex(s)})$ a factor.` }
                : last
                  ? { label: `$${value}$`, outcome: `A value that is not $0$ means $(${linTex(s)})$ is not a factor.` }
                  : { label: `$${value}$`, to: `t${i + 1}` },
            ),
            `${polyTex(p)}|${s}`,
          ),
        };
      }),
      answer: tries.map((s) => `$${valueAt(p, s)}$`),
    };
  },
  solution: ({ roots }) => {
    const p = fromRoots(roots);
    const order = trialOrder(p[3]);
    const found = order.findIndex((s) => valueAt(p, s) === 0);
    return [
      { text: `The candidates are the divisors of $${Math.abs(p[3])}$, both signs, tried from the smallest.` },
      { tex: chain(...order.slice(0, found + 1).map((s) => `p(${s}) &= ${valueAt(p, s)}`)) },
      { text: `$p(${order[found]}) = 0$, so $(${linTex(order[found])})$ is a factor.` },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 4: factorising a cubic fully
 * ================================================================ */

interface FactoriseParams {
  roots: number[];
  hint: boolean;
}

/** A divisor of the constant that is not a root, for a believable wrong tile. */
function nonRootDivisor(p: Poly): number | undefined {
  return trialOrder(p[p.length - 1]).find((s) => valueAt(p, s) !== 0);
}

/** (x ...)(x ...)(x ...) from a cubic, with one factor given at difficulty 1. */
const polyFactoriseTiles: Generator<FactoriseParams> = {
  id: 'poly-factorise-tiles',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { roots: sampleRoots(rng, 3, 5, true), hint: false }
      : { roots: sampleRoots(rng, 3, 4), hint: true },
  render: ({ roots, hint }): Slide => {
    const p = fromRoots(roots);
    const answer = roots.map((r) => signedNum(-r));
    const decoy = nonRootDivisor(p);
    return {
      kind: 'tiles',
      prompt: [
        say(hint ? `$(${linTex(roots[0])})$ is a factor of $p(x)$. Factorise $p(x)$ fully.` : 'Factorise $p(x)$ fully.'),
        show(`p(x) = ${polyTex(p)}`),
      ],
      template: '(x {0})(x {1})(x {2})',
      bank: numberBank(
        roots.map((r) => -r),
        [...roots, ...(decoy === undefined ? [] : [-decoy])],
        signedNum,
        2,
      ),
      answer,
      unordered: true,
    };
  },
  solution: ({ roots, hint }) => {
    const p = fromRoots(roots);
    const [r] = roots;
    const { quotient } = divideBy(p, r);
    return [
      hint
        ? { text: `Divide by the factor you are given, $(${linTex(r)})$:` }
        : { text: `Try divisors of $${Math.abs(p[3])}$: $p(${r}) = 0$, so $(${linTex(r)})$ is a factor. Divide by it:` },
      { text: `$p(x) = (${linTex(r)})(${polyTex(quotient)})$` },
      { text: 'Then factorise the quadratic:' },
      { tex: `p(x) = ${roots.map((root) => `(${linTex(root)})`).join('')}` },
    ];
  },
};

interface CompareParams {
  a: number;
  r2: number;
  r3: number;
}

function comparePoly({ a, r2, r3 }: CompareParams): Poly {
  return fromRoots([a, r2, r3]);
}

/**
 * Comparing coefficients: with (x - a) known, read b and c of the quadratic
 * factor off the x^2 term and the constant, then its two roots.
 */
const polyCompareTree: Generator<CompareParams> = {
  id: 'poly-compare-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [r2, r3] = sampleRoots(rng, 2, hard ? 5 : 4, hard);
    return { a: nonZero(rng, hard ? 4 : 3), r2, r3 };
  },
  render: (params): Slide => {
    const { a, r2, r3 } = params;
    const p = comparePoly(params);
    const b = -(r2 + r3);
    const c = r2 * r3;
    const low = Math.min(r2, r3);
    const high = Math.max(r2, r3);
    const answer = [b, c, low, high].map(String);
    return {
      kind: 'tree',
      prompt: [
        say(
          `$(${linTex(a)})$ is a factor, so $p(x) = (${linTex(a)})(x^{2} + bx + c)$. Compare coefficients: the top row is $b$, then $c$. Underneath, the two roots of $x^{2} + bx + c = 0$, smaller first.`,
        ),
      ],
      expression: chain(`&${polyTex(p)}`, `=\\;&(${linTex(a)})(x^{2} + bx + c)`),
      nodes: [
        { id: 'b', from: [] },
        { id: 'c', from: [] },
        { id: 'low', from: ['b', 'c'] },
        { id: 'high', from: ['b', 'c'] },
      ],
      bank: numberBank([b, c, low, high], [p[1] - a, -c, p[1], -low, -high, p[3]]),
      answer,
    };
  },
  solution: (params) => {
    const { a, r2, r3 } = params;
    const p = comparePoly(params);
    const b = -(r2 + r3);
    const c = r2 * r3;
    return [
      { text: `Multiplying out, $(${linTex(a)})(x^{2} + bx + c)$ has $x^{2}$ coefficient $b ${signedNum(-a)}$ and constant $${-a}c$.` },
      { tex: chain(`b ${signedNum(-a)} &= ${p[1]} &\\Rightarrow b &= ${b}`, `${-a}c &= ${p[3]} &\\Rightarrow c &= ${c}`) },
      { text: `$${polyTex([1, b, c])} = (${linTex(r2)})(${linTex(r3)})$` },
      { text: `So the quadratic's roots are $${Math.min(r2, r3)}$ and $${Math.max(r2, r3)}$.` },
    ];
  },
};

interface FullParams {
  a: number;
  b: number;
  c: number;
}

/** Whole roots of x^2 + bx + c, or undefined when it does not split over the whole numbers. */
function quadraticRoots(b: number, c: number): [number, number] | undefined {
  const disc = b * b - 4 * c;
  if (disc < 0) return undefined;
  const root = Math.round(Math.sqrt(disc));
  if (root * root !== disc || (b + root) % 2 !== 0) return undefined;
  return [(-b - root) / 2, (-b + root) / 2];
}

/** Three linear brackets, as the learner reads them. */
function bracketsTex(roots: number[]): string {
  return roots.map((r) => `(${linTex(r)})`).join('');
}

/** Sorted roots as brackets, a repeated root written once with its power: (x + 2)^{2}. */
function groupedTex(roots: number[]): string {
  const sorted = [...roots].sort((x, y) => x - y);
  let out = '';
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j < sorted.length && sorted[j] === sorted[i]) j += 1;
    out += `(${linTex(sorted[i])})${j - i > 1 ? `^{${j - i}}` : ''}`;
    i = j;
  }
  return out;
}

/**
 * Factorise fully, given one factor: divide, then decide whether the quadratic
 * splits. Half the time it does not, which is where "fully" stops.
 */
const polyFullFlow: Generator<FullParams> = {
  id: 'poly-full-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const a = nonZero(rng, difficulty > 1 ? 4 : 3);
      if (rng.chance(0.5)) {
        const [r2, r3] = sampleRoots(rng, 2, 5, true);
        return { a, b: -(r2 + r3), c: r2 * r3 };
      }
      const b = nonZero(rng, 5);
      const c = nonZero(rng, 9);
      if (quadraticRoots(b, c) !== undefined) continue;
      return { a, b, c };
    }
  },
  render: ({ a, b, c }): Slide => {
    const q = [1, b, c];
    const p = mulPoly([1, -a], q);
    const key = polyTex(p);
    const split = quadraticRoots(b, c);

    const slips = [divideBy(p, -a).quotient, [1, -b, c], [1, b, -c]];
    const quotients = [q];
    for (const slip of slips) {
      if (quotients.length === 3) break;
      if (quotients.some((seen) => polyTex(seen) === polyTex(slip))) continue;
      quotients.push(slip);
    }

    // Candidate full factorisations, as root multisets.
    const pairs: [number, number][] = split
      ? [split, [-split[0], -split[1]], [-split[0], split[1]], [split[0], -split[1]]]
      : [
          ...divisors(c).flatMap((d) => [
            [-d, -c / d] as [number, number],
            [d, c / d] as [number, number],
          ]),
          // c = -1 has one factor pair either way round; these keep three forms on offer.
          [1, 1] as [number, number],
          [-1, -1] as [number, number],
        ];
    const forms: number[][] = [];
    const seen = new Set<string>();
    for (const [s, t] of pairs) {
      const roots = [a, s, t].sort((x, y) => x - y);
      const id = roots.join(',');
      if (seen.has(id) || forms.length === 3) continue;
      seen.add(id);
      forms.push(roots);
    }
    const right = split ? bracketsTex([a, ...split].sort((x, y) => x - y)) : '';

    return {
      kind: 'flow',
      prompt: [say('Factorise $p(x)$ fully. Each answer chooses what gets asked next.')],
      subject: `p(x) = ${polyTex(p)}`,
      steps: [
        {
          id: 'quotient',
          ask: `$(${linTex(a)})$ is a factor. Dividing $p(x)$ by it leaves which quadratic?`,
          branches: turned(
            quotients.map((quad, i) =>
              i === 0
                ? { label: `$${polyTex(quad)}$`, to: 'split' }
                : {
                    label: `$${polyTex(quad)}$`,
                    outcome: `Check by multiplying back: $(${linTex(a)})(${polyTex(quad)}) = ${polyTex(mulPoly([1, -a], quad))}$.`,
                  },
            ),
            key,
          ),
        },
        {
          id: 'split',
          ask: `Does $${polyTex(q)}$ factorise into brackets with whole numbers?`,
          branches: [
            { label: 'Yes', to: 'form' },
            { label: 'No', outcome: `Then $p(x) = (${linTex(a)})(${polyTex(q)})$ is as far as it goes.` },
          ],
        },
        {
          id: 'form',
          ask: 'Which is $p(x)$ fully factorised?',
          branches: turned(
            forms.map((roots) => ({
              label: `$${bracketsTex(roots)}$`,
              outcome: `That multiplies out to $${polyTex(fromRoots(roots))}$.`,
            })),
            `${key}|form`,
          ),
        },
      ],
      answer: split ? [`$${polyTex(q)}$`, 'Yes', `$${right}$`] : [`$${polyTex(q)}$`, 'No'],
    };
  },
  solution: ({ a, b, c }) => {
    const q = [1, b, c];
    const p = mulPoly([1, -a], q);
    const split = quadraticRoots(b, c);
    const disc = b * b - 4 * c;
    return [
      { text: `Divide by $(${linTex(a)})$:` },
      { tex: chain(`&${polyTex(p)}`, `=\\;&(${linTex(a)})(${polyTex(q)})`) },
      split
        ? { text: `The quadratic splits: $${polyTex(q)} = (${linTex(split[0])})(${linTex(split[1])})$.` }
        : {
            text: `Two whole numbers would have to multiply to $${c}$ and add to $${b}$, and none do: $b^{2} - 4c = ${disc}$ is not a square number. So it stops at two factors.`,
          },
      ...(split ? [{ tex: `p(x) = ${bracketsTex([a, ...split].sort((x, y) => x - y))}` }] : []),
    ];
  },
};

/* ================================================================
 * Level 2, lesson 5: solving a cubic
 * ================================================================ */

/** All three whole roots of a cubic, given one at difficulty 1. */
const polySolveTiles: Generator<FactoriseParams> = {
  id: 'poly-solve-tiles',
  sample: (rng, difficulty) =>
    difficulty > 1 ? { roots: sampleRoots(rng, 3, 5), hint: false } : { roots: sampleRoots(rng, 3, 4), hint: true },
  render: ({ roots, hint }): Slide => {
    const p = fromRoots(roots);
    const answer = roots.map(String);
    const decoy = nonRootDivisor(p);
    return {
      kind: 'tiles',
      prompt: [
        say(hint ? `$x = ${roots[0]}$ is one solution. Find all three.` : 'Solve the equation.'),
        show(`${polyTex(p)} = 0`),
      ],
      template: 'x = {0}, \\; {1}, \\; {2}',
      bank: numberBank(roots, [...roots.map((r) => -r), ...(decoy === undefined ? [] : [decoy])], String, 2),
      answer,
      unordered: true,
    };
  },
  solution: ({ roots, hint }) => {
    const p = fromRoots(roots);
    const [r] = roots;
    const { quotient } = divideBy(p, r);
    return [
      hint
        ? { text: `$x = ${r}$ is a solution, so $(${linTex(r)})$ is a factor.` }
        : { text: `Try divisors of $${Math.abs(p[3])}$: $p(${r}) = 0$, so $(${linTex(r)})$ is a factor.` },
      { tex: `(${linTex(r)})(${polyTex(quotient)}) = 0` },
      { tex: `${bracketsTex(roots)} = 0` },
      { text: `Each bracket can be zero, so $x = ${[...roots].sort((x, y) => x - y).join(',\\ ')}$. The signs flip: $(${linTex(r)})$ gives $x = ${r}$.` },
    ];
  },
};

interface RootSliderParams {
  roots: number[];
  lead: number;
  which: number;
}

const WHICH = ['smallest', 'middle', 'largest'];

/** Solve, then slide to one of the three solutions on the curve. */
const polyRootSlider: Generator<RootSliderParams> = {
  id: 'poly-root-slider',
  sample: (rng, difficulty) => ({
    roots: sampleRoots(rng, 3, 5).sort((x, y) => x - y),
    lead: difficulty > 1 ? rng.sign() : 1,
    which: difficulty > 1 ? rng.int(0, 2) : rng.pick([0, 2]),
  }),
  render: ({ roots, lead, which }): Slide => {
    const p = fromRoots(roots, lead);
    let top = 1;
    for (let i = 0; i <= 80; i += 1) {
      const x = roots[0] + ((roots[2] - roots[0]) * i) / 80;
      top = Math.max(top, Math.abs(valueAt(p, x)));
    }
    const window = Math.ceil(top * 1.3);
    return {
      kind: 'slider',
      prompt: [
        say(`The curve is $y = ${polyTex(p)}$. Solve $${polyTex(p)} = 0$ and slide to the ${WHICH[which]} solution.`),
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: roots[which],
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -6,
          xMax: 6,
          yMin: -window,
          yMax: window,
          curves: [{ f: clamped((x) => valueAt(p, x), window * 3) }],
          label: 'A cubic curve crossing the x-axis three times',
        }),
        ...markerWindow(-6, 6),
      },
    };
  },
  solution: ({ roots, lead, which }) => {
    const p = fromRoots(roots, lead);
    return [
      { text: `Trial finds $p(${roots[0]}) = 0$, and dividing by $(${linTex(roots[0])})$ leaves a quadratic to factorise:` },
      { tex: chain(`&${polyTex(p)}`, `=\\;&${lead < 0 ? '-' : ''}${bracketsTex(roots)}`) },
      { text: `The solutions are $${roots.join(',\\ ')}$, so the ${WHICH[which]} is $x = ${roots[which]}$, where the curve crosses the axis.` },
    ];
  },
};

interface CountParams {
  a: number;
  b: number;
  c: number;
  /** Answer the question as it was built: factorised at difficulty 1, expanded at 2. */
  expanded: boolean;
}

function countOf({ a, b, c }: CountParams): number {
  const split = quadraticRoots(b, c);
  const disc = b * b - 4 * c;
  if (disc < 0) return 1;
  if (!split) return 3;
  return new Set([a, ...split]).size;
}

/**
 * How many different real solutions: three, two when a root repeats, or one
 * when the quadratic factor has none.
 */
const polyCountRoots: Generator<CountParams> = {
  id: 'poly-count-roots',
  sample: (rng, difficulty) => {
    const expanded = difficulty > 1;
    for (;;) {
      const a = nonZero(rng, 4);
      const kind = rng.int(1, 3);
      if (kind === 1) {
        const b = rng.int(-4, 4);
        const c = rng.int(1, 9);
        if (b * b - 4 * c >= 0) continue;
        return { a, b, c, expanded };
      }
      const [r2, r3] =
        kind === 2 ? (rng.chance(0.5) ? [a, nonZero(rng, 5)] : Array(2).fill(nonZero(rng, 5))) : sampleRoots(rng, 2, 5);
      const params = { a, b: -(r2 + r3), c: r2 * r3, expanded };
      if (countOf(params) !== kind) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { a, b, c, expanded } = params;
    const count = countOf(params);
    const prompt = expanded
      ? [say(`$x = ${a}$ is one solution of this equation. How many different real solutions does it have?`), show(`${polyTex(mulPoly([1, -a], [1, b, c]))} = 0`)]
      : [say('How many different real solutions does this equation have?'), show(`(${linTex(a)})(${polyTex([1, b, c])}) = 0`)];
    return choiceSlide(
      prompt,
      options({ tex: String(count) }, ...[1, 2, 3].filter((n) => n !== count).map((n) => ({ tex: String(n) }))),
    );
  },
  solution: (params) => {
    const { a, b, c, expanded } = params;
    const disc = b * b - 4 * c;
    const split = quadraticRoots(b, c);
    return [
      ...(expanded
        ? [
            { text: `$x = ${a}$ is a solution, so divide by $(${linTex(a)})$:` },
            { tex: `(${linTex(a)})(${polyTex([1, b, c])}) = 0` },
          ]
        : []),
      { text: `The bracket gives $x = ${a}$. For the quadratic, $b^{2} - 4c = ${disc}$.` },
      {
        text:
          disc < 0
            ? 'That is negative, so the quadratic has no real solutions: one solution in all.'
            : split && new Set([a, ...split]).size < 3
              ? `Its solutions are $${split[0]}$ and $${split[1]}$, but a value is repeated, so there are ${new Set([a, ...split]).size} different solutions.`
              : `It has two more solutions, different from $${a}$, so three in all.`,
      },
    ];
  },
};

interface SolveFlowParams {
  roots: number[];
  tries: number[];
}

/** The whole method as a path: find a root, divide, solve what is left. */
const polySolveFlow: Generator<SolveFlowParams> = {
  id: 'poly-solve-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, difficulty > 1 ? 5 : 3);
      const p = fromRoots(roots);
      const wrong = trialOrder(p[3]).filter((s) => valueAt(p, s) !== 0);
      if (wrong.length < 2) continue;
      const tries = [roots[0], ...rng.sample(wrong, 2)].sort((x, y) => x - y);
      return { roots, tries };
    }
  },
  render: ({ roots, tries }): Slide => {
    const p = fromRoots(roots);
    const [r] = roots;
    const key = polyTex(p);
    const q = divideBy(p, r).quotient;
    const quotients = [q];
    for (const slip of [divideBy(p, -r).quotient, [1, -q[1], q[2]], [1, q[1], -q[2]]]) {
      if (quotients.length === 3) break;
      if (quotients.some((seen) => polyTex(seen) === polyTex(slip))) continue;
      quotients.push(slip);
    }
    const sets: number[][] = [];
    const seen = new Set<string>();
    for (const set of [roots, [r, -roots[1], -roots[2]], roots.map((x) => -x), [r, roots[1], -roots[2]]]) {
      const sorted = [...set].sort((x, y) => x - y);
      if (seen.has(sorted.join())) continue;
      seen.add(sorted.join());
      sets.push(sorted);
    }
    const setLabel = (set: number[]) => `$x = ${set.join(',\\ ')}$`;
    return {
      kind: 'flow',
      prompt: [say('Solve $p(x) = 0$. Each answer chooses what gets asked next.')],
      subject: `p(x) = ${polyTex(p)}`,
      steps: [
        {
          id: 'root',
          ask: 'Which of these makes $p(x)$ zero?',
          branches: tries.map((s) =>
            s === r
              ? { label: `$x = ${s}$`, to: 'quotient' }
              : { label: `$x = ${s}$`, outcome: `$p(${s}) = ${valueAt(p, s)}$, which is not $0$.` },
          ),
        },
        {
          id: 'quotient',
          ask: `Dividing by $(${linTex(r)})$ leaves which quadratic?`,
          branches: turned(
            quotients.map((quad, i) =>
              i === 0
                ? { label: `$${polyTex(quad)}$`, to: 'solve' }
                : {
                    label: `$${polyTex(quad)}$`,
                    outcome: `Multiplying back, $(${linTex(r)})(${polyTex(quad)}) = ${polyTex(mulPoly([1, -r], quad))}$.`,
                  },
            ),
            key,
          ),
        },
        {
          id: 'solve',
          ask: 'So what are all the solutions?',
          branches: turned(
            sets.map((set) => ({ label: setLabel(set), outcome: `Those are the solutions of $${bracketsTex(set)} = 0$.` })),
            `${key}|solve`,
          ),
        },
      ],
      answer: [`$x = ${r}$`, `$${polyTex(q)}$`, setLabel([...roots].sort((x, y) => x - y))],
    };
  },
  solution: ({ roots }) => {
    const p = fromRoots(roots);
    const [r] = roots;
    const q = divideBy(p, r).quotient;
    return [
      { text: `$p(${r}) = 0$, so $(${linTex(r)})$ is a factor.` },
      { text: `$p(x) = (${linTex(r)})(${polyTex(q)}) = ${bracketsTex(roots)}$` },
      { text: `So $x = ${[...roots].sort((x, y) => x - y).join(',\\ ')}$.` },
    ];
  },
};

/* ================================================================
 * Level 3: polynomial graphs
 *
 * Everything here reads a curve off its factors: where it meets the x-axis,
 * whether it crosses or touches there, where its arms go, and where it cuts
 * the y-axis. So the polynomial is held factorised, as a lead and a list of
 * factors, and only multiplied out when a question asks for that.
 * ================================================================ */

/**
 * One factor of a factorised polynomial. Difficulty 1 writes `x - r`;
 * difficulty 2 also writes `r - x` and `kx - kr`, which have the same root
 * but bring a -1 or a k to the leading coefficient.
 */
interface Factor {
  root: number;
  power: number;
  form: 'plain' | 'reversed' | 'scaled';
  /** The multiplier of a scaled factor, 2 or 3. */
  k?: number;
}

interface Form {
  lead: number;
  factors: Factor[];
}

const plainFactor = (root: number, power = 1): Factor => ({ root, power, form: 'plain' });

/** The factor's own coefficient of x. */
function factorLead(f: Factor): number {
  return f.form === 'reversed' ? -1 : f.form === 'scaled' ? f.k! : 1;
}

function formPoly({ lead, factors }: Form): Poly {
  let p: Poly = [lead];
  for (const f of factors) {
    const c = factorLead(f);
    for (let i = 0; i < f.power; i += 1) p = mulPoly(p, [c, -c * f.root]);
  }
  return p;
}

/** The leading coefficient once every bracket is multiplied out. */
function formLead({ lead, factors }: Form): number {
  return factors.reduce((acc, f) => acc * factorLead(f) ** f.power, lead);
}

const formDegree = (form: Form): number => form.factors.reduce((n, f) => n + f.power, 0);

/** The distinct roots, smallest first. */
const formRoots = (form: Form): number[] => [...new Set(form.factors.map((f) => f.root))].sort((a, b) => a - b);

/** One factor as the learner reads it: (x - 2), (3 - x) or (2x + 4), with its power. */
function factorTex(f: Factor, withPower = true): string {
  const power = withPower && f.power > 1 ? `^{${f.power}}` : '';
  const inner = f.form === 'reversed' ? `${f.root} - x` : f.form === 'scaled' ? `${f.k}x ${signedNum(-f.k! * f.root)}` : linTex(f.root);
  return `(${inner})${power}`;
}

/** A number in front of brackets: nothing for 1, a bare minus for -1. */
function leadTex(lead: number): string {
  return lead === 1 ? '' : lead === -1 ? '-' : String(lead);
}

function formTex(form: Form): string {
  return `${leadTex(form.lead)}${form.factors.map((f) => factorTex(f)).join('')}`;
}

/** Plain roots with powers, in the order given: (x - 2)^2(x + 1). */
function rootsForm(roots: number[], powers: number[], lead = 1): Form {
  return { lead, factors: roots.map((r, i) => plainFactor(r, powers[i])) };
}

/**
 * Writes some factors the other way round at difficulty 2: r - x for a
 * positive root, kx - kr for a single factor. At least one is changed.
 */
function dressed(rng: Rng, factors: Factor[]): Factor[] {
  // A negative root with a power above 1 can be written neither way, so a
  // form made only of those stays as it is.
  if (!factors.some((f) => f.root > 0 || (f.power === 1 && Math.abs(2 * f.root) <= 9))) return factors;
  for (;;) {
    const out = factors.map((f): Factor => {
      if (rng.chance(0.5)) return f;
      if (f.root > 0 && rng.chance(0.5)) return { ...f, form: 'reversed' };
      const k = rng.int(2, 3);
      return f.power === 1 && Math.abs(k * f.root) <= 9 ? { ...f, form: 'scaled', k } : f;
    });
    if (out.some((f) => f.form !== 'plain')) return out;
  }
}

/** Powers for `count` distinct roots, each at most `top`, adding to a degree in [lo, hi]. */
function samplePowers(rng: Rng, count: number, top: number, lo: number, hi: number): number[] {
  for (;;) {
    const powers = Array.from({ length: count }, () => rng.int(1, top));
    const degree = powers.reduce((a, b) => a + b, 0);
    if (degree >= lo && degree <= hi && powers.some((n) => n > 1)) return powers;
  }
}

/** Whether every repeated root sits at least two units from its neighbours, so a touch shows. */
function spaced(roots: number[], powers: number[]): boolean {
  return roots.every((r, i) => powers[i] === 1 || roots.every((s, j) => j === i || Math.abs(r - s) >= 2));
}

/** A number in plain text, with a proper minus sign. */
const plainNum = (n: number): string => (n < 0 ? `−${-n}` : String(n));

/** A number as a factor in a product line: -3 bracketed, 3 bare. */
const productNum = (n: number): string => (n < 0 ? `(${n})` : String(n));

/* ---------- drawing a curve read off its factors ---------- */

const GRAPH_X = 5;
const GRAPH_Y = 3;
/** Six units down 154 px against ten across 256, so a grid square is square. */
const GRAPH_HEIGHT = 178;

/**
 * The vertical scale that puts the tallest bump between the roots at 2.2
 * squares. These pictures are about where a curve meets the axis and which
 * way it goes, never about its height, so the true height is not kept: a
 * cubic's bump is 40 one time and 4 the next, and either way it should fill
 * the picture.
 */
function graphScale(p: Poly, roots: number[]): number {
  const lo = roots[0];
  const hi = roots[roots.length - 1];
  const [from, to] = lo === hi ? [lo - 1.5, lo + 1.5] : [lo, hi];
  let top = 0;
  for (let i = 0; i <= 200; i += 1) top = Math.max(top, Math.abs(valueAt(p, from + ((to - from) * i) / 200)));
  return top / 2.2;
}

/**
 * Whether a curve reads at phone size: both arms leave the picture, so where
 * they go is visible, and every bump between neighbouring roots is tall
 * enough to see which side of the axis it is on.
 */
function readable(p: Poly, roots: number[]): boolean {
  const s = graphScale(p, roots);
  if (!(s > 0)) return false;
  const edge = GRAPH_Y * 1.2;
  if (Math.abs(valueAt(p, -GRAPH_X)) / s < edge || Math.abs(valueAt(p, GRAPH_X)) / s < edge) return false;
  for (let i = 0; i + 1 < roots.length; i += 1) {
    let top = 0;
    for (let j = 1; j < 50; j += 1) top = Math.max(top, Math.abs(valueAt(p, roots[i] + ((roots[i + 1] - roots[i]) * j) / 50)));
    if (top / s < 0.4) return false;
  }
  return true;
}

/**
 * The curve on squared paper with its roots ringed, scaled as `graphScale`
 * says. Always on the grid, which clips the arms at its edge: without it they
 * would run on past the figure and over whatever sits beneath.
 */
function graphSvg(p: Poly, roots: number[], label: string): string {
  const s = graphScale(p, roots);
  return plotSvg({
    xMin: -GRAPH_X,
    xMax: GRAPH_X,
    yMin: -GRAPH_Y,
    yMax: GRAPH_Y,
    height: GRAPH_HEIGHT,
    grid: true,
    curves: [{ f: clamped((x) => valueAt(p, x) / s, GRAPH_Y * 3) }],
    marks: roots.map((x) => ({ x, y: 0 })),
    label,
  });
}

const diagram = (svg: string): Block => ({ kind: 'diagram', svg });

/** A choice between descriptions in words, which are plain text rather than TeX. */
function wordChoice(prompt: Block[], labels: string[], correct: number): Slide {
  return {
    kind: 'choice',
    prompt,
    options: labels.map((label, idx) => ({ id: `opt${idx}`, label })),
    correctId: `opt${correct}`,
  };
}

/** The same with its options turned by a hash of their labels, for a set that changes per question. */
function turnedWordChoice(prompt: Block[], right: string, wrong: string[]): Slide {
  const labels = [right, ...wrong.filter((label, i) => label !== right && wrong.indexOf(label) === i)].slice(0, 4);
  const ordered = turned(labels, labels.join('|'));
  return wordChoice(prompt, ordered, ordered.indexOf(right));
}

/** Where the arms go, in words, for an odd or even degree and a lead's sign. */
const ARMS = ['Down on the left, up on the right', 'Up on the left, down on the right', 'Up on both sides', 'Down on both sides'];

function armsOf(degree: number, lead: number): number {
  return (degree % 2 === 0 ? 2 : 0) + (lead > 0 ? 0 : 1);
}

/**
 * A product of numbers as brackets side by side, the lead in front:
 * 2(-1)(3)(-4). Times signs between four or five factors run off a phone.
 */
function bracketProduct(lead: number, values: { n: number; power: number }[]): string {
  return `${leadTex(lead)}${values.map(({ n, power }) => `(${n})${power > 1 ? `^{${power}}` : ''}`).join('')}`;
}

/** The form at a whole x, bracket by bracket. */
function productAt(form: Form, x: number): string {
  return bracketProduct(
    form.lead,
    form.factors.map((f) => ({ n: factorLead(f) * (x - f.root), power: f.power })),
  );
}

/** The factor-by-factor substitution x = 0, as a product line. */
function zeroProductTex(form: Form): string {
  return productAt(form, 0);
}

/* ================================================================
 * Level 3, lesson 1: roots from the factors
 * ================================================================ */

interface FormParams {
  form: Form;
}

/** Where a factorised cubic, or at difficulty 2 a quartic with a squared factor, meets the x-axis. */
const polyGraphRootsTiles: Generator<FormParams> = {
  id: 'poly-graph-roots-tiles',
  sample: (rng, difficulty) => {
    const roots = sampleRoots(rng, 3, 5);
    if (difficulty > 1) {
      const twice = rng.int(0, 2);
      const factors = dressed(
        rng,
        roots.map((r, i) => plainFactor(r, i === twice ? 2 : 1)),
      );
      return { form: { lead: rng.pick([1, -1, 2, -2]), factors } };
    }
    return { form: { lead: rng.pick([1, 1, -1, 2, 3]), factors: roots.map((r) => plainFactor(r)) } };
  },
  render: ({ form }): Slide => {
    const roots = form.factors.map((f) => f.root);
    const slips = form.factors.flatMap((f) => [-f.root, ...(f.form === 'scaled' ? [f.k! * f.root] : [])]);
    return {
      kind: 'tiles',
      prompt: [say('Where does this curve meet the $x$-axis?'), wrapped(`y = ${formTex(form)}`)],
      template: 'x = {0}, \\; {1}, \\; {2}',
      bank: numberBank(roots, slips, String, 2),
      answer: roots.map(String),
      unordered: true,
    };
  },
  solution: ({ form }) => [
    { text: 'The curve meets the $x$-axis where $y = 0$, and a product is $0$ when one of its factors is.' },
    { tex: chain(...form.factors.map((f) => `${factorTex(f, false)} = 0 &\\;\\Rightarrow\\; x = ${f.root}`)) },
    ...(form.factors.some((f) => f.power > 1)
      ? [{ text: 'A squared factor still gives just one point on the axis.' }]
      : []),
    ...(form.lead !== 1 ? [{ text: `The $${leadTex(form.lead)}$ in front is never $0$, so it adds no point.` }] : []),
  ],
};

interface GraphFormParams {
  roots: number[];
  lead: number;
  /** Offer the same roots upside down, so the arms have to be read too. */
  arms: boolean;
}

const graphEquation = (roots: number[], lead: number): string =>
  `y = ${leadTex(lead)}${bracketsTex([...roots].sort((a, b) => a - b))}`;

/**
 * Which equation fits the drawn cubic? Difficulty 1 is read off where it
 * crosses; difficulty 2 also offers the same roots upside down, so the arms
 * have to be read too.
 */
const polyGraphForm: Generator<GraphFormParams> = {
  id: 'poly-graph-form',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, 4).sort((a, b) => a - b);
      // Either way up at both difficulties; only difficulty 2 offers the
      // same roots the other way up, so only there do the arms decide it.
      const lead = rng.sign();
      if (!readable(fromRoots(roots, lead), roots)) continue;
      return { roots, lead, arms: difficulty > 1 };
    }
  },
  render: ({ roots, lead, arms }): Slide => {
    const negated = roots.map((r) => -r);
    const oneFlipped = [1, 0, 2]
      .map((i) => roots.map((r, j) => (j === i ? -r : r)))
      .filter((set) => new Set(set).size === 3);
    const candidates: [number[], number][] = arms
      ? [[roots, -lead], [negated, lead], [negated, -lead], ...oneFlipped.map((set): [number[], number] => [set, lead])]
      : [[negated, lead], ...oneFlipped.map((set): [number[], number] => [set, lead]), [roots.map((r, j) => (j === 1 ? r + 1 : r)), lead]];
    const opts = options(
      { tex: graphEquation(roots, lead) },
      ...candidates
        .filter(([set]) => new Set(set).size === 3 && set.every((r) => r !== 0))
        .map(([set, l]) => ({ tex: graphEquation(set, l) })),
    ).slice(0, 4);
    return choiceSlide(
      [
        say('Which equation could this curve have? The ringed points are where it crosses the $x$-axis.'),
        diagram(graphSvg(fromRoots(roots, lead), roots, 'A cubic curve on squared paper crossing the x-axis three times')),
      ],
      opts,
    );
  },
  solution: ({ roots, lead }) => [
    { text: `The curve crosses at $x = ${roots.join(',\\ ')}$, so the factors are $${bracketsTex(roots)}$: each root's sign flips inside its bracket.` },
    {
      text:
        lead > 0
          ? 'It rises to the right, so the leading coefficient is positive and there is no minus sign in front.'
          : 'It falls to the right, so the leading coefficient is negative: there is a minus sign in front.',
    },
    { tex: graphEquation(roots, lead) },
  ],
};

interface RootSliderFormParams {
  form: Form;
  which: number;
}

/** Slide to the crossing that one named factor gives. At difficulty 2 the factors are written the other ways round. */
const polyGraphRootSlider: Generator<RootSliderFormParams> = {
  id: 'poly-graph-root-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, 4);
      const lead = difficulty > 1 ? rng.sign() : 1;
      const plain = roots.map((r) => plainFactor(r));
      const form = { lead, factors: difficulty > 1 ? dressed(rng, plain) : plain };
      const which = rng.int(0, 2);
      if (difficulty > 1 && form.factors[which].form === 'plain') continue;
      if (!readable(formPoly(form), formRoots(form))) continue;
      return { form, which };
    }
  },
  render: ({ form, which }): Slide => {
    const f = form.factors[which];
    return {
      kind: 'slider',
      prompt: [
        say(
          `The curve is $y = ${formTex(form)}$, with the points where it crosses the $x$-axis ringed. Slide the line to the one the factor $${factorTex(f)}$ gives.`,
        ),
      ],
      min: -GRAPH_X,
      max: GRAPH_X,
      step: 1,
      answer: f.root,
      readout: 'x = {v}',
      figure: {
        svg: graphSvg(formPoly(form), formRoots(form), 'A cubic curve on squared paper crossing the x-axis at three ringed points'),
        ...markerWindow(-GRAPH_X, GRAPH_X),
      },
    };
  },
  solution: ({ form, which }) => {
    const f = form.factors[which];
    const roots = formRoots(form);
    return [
      { text: `$${factorTex(f)}$ is $0$ when $x = ${f.root}$:` },
      {
        tex:
          f.form === 'scaled'
            ? chain(`${f.k}x ${signedNum(-f.k! * f.root)} &= 0`, `${f.k}x &= ${f.k! * f.root}`, `x &= ${f.root}`)
            : f.form === 'reversed'
              ? chain(`${f.root} - x &= 0`, `x &= ${f.root}`)
              : chain(`${linTex(f.root)} &= 0`, `x &= ${f.root}`),
      },
      { text: `The crossings are at $x = ${roots.join(',\\ ')}$, so it is the ${WHICH[roots.indexOf(f.root)]} of the three.` },
    ];
  },
};

/** Wrong values for a factor's root: the sign flipped, and for kx - kr the number read off the bracket. */
function rootSlips(f: Factor): number[] {
  const out = [-f.root];
  if (f.form === 'scaled') out.push(f.k! * f.root, -f.k! * f.root);
  return out;
}

/** One factor at a time: which value of x makes it zero? A wrong value ends the walk there. */
const polyRootFlow: Generator<FormParams> = {
  id: 'poly-root-flow',
  sample: (rng, difficulty) => {
    const roots = sampleRoots(rng, 3, difficulty > 1 ? 5 : 6);
    const plain = roots.map((r) => plainFactor(r));
    return difficulty > 1
      ? { form: { lead: rng.pick([1, -1, 2]), factors: dressed(rng, plain) } }
      : { form: { lead: 1, factors: plain } };
  },
  render: ({ form }): Slide => {
    const key = formTex(form);
    const sorted = formRoots(form);
    return {
      kind: 'flow',
      prompt: [say('Find where the curve meets the $x$-axis, one factor at a time. Each answer chooses what gets asked next.')],
      subject: `y = ${key}`,
      steps: form.factors.map((f, i) => ({
        id: `f${i}`,
        ask: `Which value of $x$ makes $${factorTex(f)}$ zero?`,
        branches: turned(
          [f.root, ...rootSlips(f)].map((v) => {
            if (v !== f.root) {
              return { label: `$x = ${v}$`, outcome: `At $x = ${v}$ the factor $${factorTex(f)}$ is $${valueAt([factorLead(f), -factorLead(f) * f.root], v)}$, not $0$.` };
            }
            return i + 1 < form.factors.length
              ? { label: `$x = ${v}$`, to: `f${i + 1}` }
              : { label: `$x = ${v}$`, outcome: `So the curve meets the $x$-axis at $x = ${sorted.join(',\\ ')}$.` };
          }),
          `${key}|${i}`,
        ),
      })),
      answer: form.factors.map((f) => `$x = ${f.root}$`),
    };
  },
  solution: ({ form }) => [
    { text: 'Set each factor to $0$ and solve it on its own:' },
    { tex: chain(...form.factors.map((f) => `${factorTex(f)} = 0 &\\;\\Rightarrow\\; x = ${f.root}`)) },
    ...(form.factors.some((f) => f.form !== 'plain')
      ? [{ text: 'However a bracket is written, its root is the value that makes it $0$: $(3 - x)$ gives $3$, and $(2x + 4)$ gives $-2$.' }]
      : [{ text: 'Each sign flips: $(x + 2)$ gives $x = -2$.' }]),
  ],
};

/* ================================================================
 * Level 3, lesson 2: end behaviour
 * ================================================================ */

interface EndsParams {
  /** Written out, highest power first unless `terms` says otherwise. */
  p: Poly;
  /** Written factorised instead, at difficulty 2. */
  form?: Form;
  /** Written in this order instead, so the leading term is not first. */
  terms?: Term[];
}

function endsTex({ p, form, terms }: EndsParams): string {
  if (form) return formTex(form);
  if (terms) return termsTex(terms);
  return polyTex(p);
}

/**
 * A factorised polynomial of degree 3 to 5, with a repeated factor and some
 * factors written the other way round, so the degree has to be counted and
 * the leading coefficient multiplied out.
 */
function sampleEndsForm(rng: Rng, most: number): EndsParams {
  for (;;) {
    const count = rng.int(2, most);
    const roots = sampleRoots(rng, count, 5);
    const powers = samplePowers(rng, count, 3, 3, 5);
    const form = { lead: rng.pick([1, -1, 2, -2]), factors: dressed(rng, rootsForm(roots, powers).factors) };
    if (Math.abs(formLead(form)) > 24) continue;
    return { p: formPoly(form), form };
  }
}

/** A written-out cubic or quartic, every coefficient whole. */
function sampleEndsPoly(rng: Rng): Poly {
  const degree = rng.int(3, 4);
  const p = [nonZero(rng, 4), ...Array.from({ length: degree }, () => rng.int(-6, 6))];
  if (p[degree] === 0) p[degree] = nonZero(rng, 6);
  // Four terms at most, so it fits the box a flow subject sits in.
  while (p.filter((c) => c !== 0).length > 4) p[rng.int(1, degree - 1)] = 0;
  return p;
}

/** The leading coefficient worked out in prose: every number that is not 1, multiplied. */
function leadProduct(form: Form): string {
  const bits = [form.lead, ...form.factors.flatMap((f) => Array<number>(f.power).fill(factorLead(f)))].filter((c) => c !== 1);
  const lead = formLead(form);
  return bits.length > 1 ? `$${bits.map((c) => `(${c})`).join('')} = ${lead}$` : `$${lead}$`;
}

function endsSolution(params: EndsParams): SolutionStep[] {
  const { p, form } = params;
  const degree = degreeOf(p);
  const lead = p[0];
  const steps: SolutionStep[] = [];
  if (form) {
    steps.push({
      text: `Multiplied out, the highest power comes from the $x$ in every bracket: the powers add to $${degree}$, and the leading coefficient is ${leadProduct(form)}.`,
    });
  } else {
    steps.push({ text: `The leading term is $${termTex(lead, degree)}$: degree $${degree}$, leading coefficient $${lead}$.` });
  }
  steps.push({
    text:
      degree % 2 === 1
        ? 'An odd degree sends the two arms opposite ways, like $y = x^{3}$.'
        : 'An even degree sends both arms the same way, like $y = x^{4}$.',
  });
  steps.push({
    text: `The leading coefficient is ${lead > 0 ? 'positive, so the right arm goes up' : 'negative, which turns the picture upside down: the right arm goes down'}. So: ${ARMS[armsOf(degree, lead)].toLowerCase()}.`,
  });
  return steps;
}

/** Odd or even degree, then the sign of the lead, then where the arms point. */
const polyEndsFlow: Generator<EndsParams> = {
  id: 'poly-ends-flow',
  // Two factors at most: a flow subject sits in a box that cannot wrap.
  sample: (rng, difficulty) => (difficulty > 1 ? sampleEndsForm(rng, 2) : { p: sampleEndsPoly(rng) }),
  render: (params): Slide => {
    const degree = degreeOf(params.p);
    const lead = params.p[0];
    return {
      kind: 'flow',
      prompt: [say('Where do the arms of $y = p(x)$ point? Each answer chooses what gets asked next.')],
      subject: `p(x) = ${endsTex(params)}`,
      steps: [
        {
          id: 'parity',
          ask: 'Is the degree of $p(x)$ odd or even?',
          branches: [
            { label: 'Odd', to: 'sign' },
            { label: 'Even', to: 'sign' },
          ],
        },
        {
          id: 'sign',
          ask: 'Is its leading coefficient positive or negative?',
          branches: [
            { label: 'Positive', to: 'arms' },
            { label: 'Negative', to: 'arms' },
          ],
        },
        {
          id: 'arms',
          ask: 'So where do the arms of the curve point?',
          branches: ARMS.map((label) => ({
            label,
            outcome: 'The arms are what the leading term does once $x$ is large, whichever way it goes.',
          })),
        },
      ],
      answer: [degree % 2 === 1 ? 'Odd' : 'Even', lead > 0 ? 'Positive' : 'Negative', ARMS[armsOf(degree, lead)]],
    };
  },
  solution: endsSolution,
};

/** Where y goes at each end, as tiles: plus or minus infinity. */
const polyEndsTiles: Generator<EndsParams> = {
  id: 'poly-ends-tiles',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return sampleEndsForm(rng, 3);
    for (;;) {
      const p = sampleEndsPoly(rng);
      const n = degreeOf(p);
      const terms = rng.shuffle(p.map((c, i) => ({ c, k: n - i })).filter((t) => t.c !== 0));
      if (terms[0].k === n) continue;
      return { p, terms };
    }
  },
  render: (params): Slide => {
    const degree = degreeOf(params.p);
    const lead = params.p[0];
    const infinity = (sign: number) => (sign > 0 ? '+\\infty' : '-\\infty');
    return {
      kind: 'tiles',
      prompt: [wrapped(`p(x) = ${endsTex(params)}`), say('Where does $y = p(x)$ go as $x$ runs off to the right, and to the left?')],
      template: 'x \\to +\\infty\\!: \\; y \\to {0} \\qquad x \\to -\\infty\\!: \\; y \\to {1}',
      // Two of each, since both ends can go the same way.
      bank: ['+\\infty', '+\\infty', '-\\infty', '-\\infty'],
      answer: [infinity(lead), infinity(degree % 2 === 0 ? lead : -lead)],
    };
  },
  solution: (params) => {
    const degree = degreeOf(params.p);
    const lead = params.p[0];
    return [
      ...endsSolution(params).slice(0, 1),
      { text: `For large $x$ only the leading term $${termTex(lead, degree)}$ matters.` },
      {
        tex: chain(
          `x \\to +\\infty\\!: &\\;\\; y \\to ${lead > 0 ? '+' : '-'}\\infty`,
          `x \\to -\\infty\\!: &\\;\\; y \\to ${(degree % 2 === 0 ? lead : -lead) > 0 ? '+' : '-'}\\infty`,
        ),
      },
      {
        text: `A negative $x$ to an ${degree % 2 === 0 ? 'even power is positive, so the left arm goes the same way as the right' : 'odd power stays negative, so the left arm goes the opposite way to the right'}.`,
      },
    ];
  },
};

/** One factor at difficulty 1 written r - x or kx - kr, so the lead in front is not the whole story. */
function dressOne(rng: Rng, factors: Factor[]): Factor[] {
  for (;;) {
    const i = rng.int(0, factors.length - 1);
    const f = factors[i];
    const k = rng.int(2, 3);
    const changed: Factor | undefined =
      f.root > 0 && rng.chance(0.5)
        ? { ...f, form: 'reversed' }
        : Math.abs(k * f.root) <= 9
          ? { ...f, form: 'scaled', k }
          : undefined;
    if (changed) return factors.map((g, j) => (j === i ? changed : g));
  }
}

/** The leading coefficient of a factorised polynomial, where the brackets bring their own. */
const polyLeadCoefficient: Generator<FormParams> = {
  id: 'poly-lead-coefficient',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, 5);
      if (difficulty > 1) {
        const powers = samplePowers(rng, 3, 3, 4, 5);
        const form = { lead: rng.pick([1, -1, 2, -2, 3]), factors: dressed(rng, rootsForm(roots, powers).factors) };
        if (Math.abs(formLead(form)) > 24 || form.factors.filter((f) => f.form !== 'plain').length < 2) continue;
        return { form };
      }
      const form = { lead: rng.pick([1, -1, 2, -2, 3]), factors: dressOne(rng, roots.map((r) => plainFactor(r))) };
      return { form };
    }
  },
  choices: ({ form }) => {
    const right = formLead(form);
    const sizes = form.factors.reduce((acc, f) => acc * Math.abs(factorLead(f)) ** f.power, Math.abs(form.lead));
    return intOptions(right, [-right, form.lead, sizes, -sizes, formDegree(form)]);
  },
  render: ({ form }): Slide => ({
    kind: 'expression',
    prompt: [say('Multiplied out, what is the leading coefficient of this polynomial?'), wrapped(`p(x) = ${formTex(form)}`)],
    lead: '\\text{leading coefficient} =',
    keypad: [],
    answer: String(formLead(form)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ form }) => {
    return [
      { text: 'The leading term is the $x$ term of every bracket multiplied together, times the number in front.' },
      {
        text: `Their coefficients of $x$ are $${form.factors.map((f) => `${factorTex(f, false)} \\to ${factorLead(f)}`).join(',\\; ')}$.`,
      },
      { text: `Multiplied together, that is ${leadProduct(form)}.` },
      ...(form.factors.some((f) => f.form === 'reversed')
        ? [{ text: 'A bracket written $(r - x)$ has $-x$ in it, so it brings a $-1$.' }]
        : []),
    ];
  },
};

interface GraphParams {
  roots: number[];
  powers: number[];
  lead: number;
  /** Offer the curve upside down as well, so the arms have to be read. */
  arms?: boolean;
}

const graphPoly = ({ roots, powers, lead }: GraphParams): Poly => formPoly(rootsForm(roots, powers, lead));

/** Readable spaced roots and powers for a drawn curve. */
function sampleGraph(rng: Rng, count: number, powers: (rng: Rng) => number[], lead: number): GraphParams {
  for (;;) {
    const roots = sampleRoots(rng, count, 4).sort((a, b) => a - b);
    const params = { roots, powers: powers(rng), lead };
    if (!spaced(roots, params.powers) || !readable(graphPoly(params), roots)) continue;
    return params;
  }
}

const ENDS_WORDS = [
  'Odd degree, positive leading coefficient',
  'Odd degree, negative leading coefficient',
  'Even degree, positive leading coefficient',
  'Even degree, negative leading coefficient',
];

/** From a drawn curve, the degree's parity and the lead's sign. Difficulty 2 hides a repeated root in it. */
const polyEndsGraph: Generator<GraphParams> = {
  id: 'poly-ends-graph',
  sample: (rng, difficulty) => {
    const lead = rng.sign();
    if (difficulty > 1) {
      const count = rng.int(2, 3);
      return sampleGraph(rng, count, (r) => samplePowers(r, count, 2, 3, 5), lead);
    }
    const count = rng.int(3, 4);
    return sampleGraph(rng, count, () => Array(count).fill(1), lead);
  },
  render: (params): Slide => {
    const degree = params.powers.reduce((a, b) => a + b, 0);
    return wordChoice(
      [
        say('What does this curve say about its polynomial?'),
        diagram(graphSvg(graphPoly(params), params.roots, 'A polynomial curve on squared paper with its arms leaving the picture')),
      ],
      ENDS_WORDS,
      armsOf(degree, params.lead),
    );
  },
  solution: (params) => {
    const degree = params.powers.reduce((a, b) => a + b, 0);
    const [left, right] = [valueAt(graphPoly(params), -GRAPH_X) > 0, valueAt(graphPoly(params), GRAPH_X) > 0];
    return [
      { text: `The right arm goes ${right ? 'up' : 'down'} and the left arm goes ${left ? 'up' : 'down'}.` },
      {
        text:
          left === right
            ? 'Both arms the same way means an even degree.'
            : 'Arms going opposite ways means an odd degree.',
      },
      { text: `The right arm going ${right ? 'up means a positive' : 'down means a negative'} leading coefficient.` },
      {
        text: `This one is $y = ${formTex(rootsForm(params.roots, params.powers, params.lead))}$, of degree $${degree}$${params.powers.some((n) => n > 1) ? ': the curve only touches at a squared root, so counting crossings would undercount' : ''}.`,
      },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 3: repeated roots
 * ================================================================ */

interface TouchParams {
  form: Form;
  /** The factor whose root is asked about. */
  asked: number;
}

const TOUCH = ['Crosses the axis', 'Touches the axis and turns back', 'Crosses the axis, flattening out as it goes through'];

/** A single root crosses, an even power touches, an odd power of 3 or more crosses flat. */
const touchOf = (power: number): number => (power === 1 ? 0 : power % 2 === 0 ? 1 : 2);

/** What the curve does at one root, read off that root's power. */
const polyTouchCross: Generator<TouchParams> = {
  id: 'poly-touch-cross',
  sample: (rng, difficulty) => {
    const count = rng.int(2, 3);
    const roots = sampleRoots(rng, count, 5);
    if (difficulty > 1) {
      const powers = samplePowers(rng, count, 3, 3, 5);
      const form = { lead: rng.pick([1, -1, 2, -2]), factors: dressed(rng, rootsForm(roots, powers).factors) };
      return { form, asked: rng.int(0, count - 1) };
    }
    const powers = samplePowers(rng, count, 2, 3, 4);
    return { form: rootsForm(roots, powers), asked: rng.int(0, count - 1) };
  },
  render: ({ form, asked }): Slide => {
    const f = form.factors[asked];
    return wordChoice(
      [say(`What does this curve do where it meets the $x$-axis at $x = ${f.root}$?`), wrapped(`y = ${formTex(form)}`)],
      TOUCH,
      touchOf(f.power),
    );
  },
  solution: ({ form, asked }) => {
    const f = form.factors[asked];
    const lines: SolutionStep[] = [
      {
        text: `The root $x = ${f.root}$ comes from $${factorTex(f)}$, so it is repeated ${f.power === 1 ? 'once: a single root' : `${f.power} times`}.`,
      },
    ];
    if (f.power === 1) {
      lines.push({ text: `Near $x = ${f.root}$ that factor changes sign as $x$ passes through, and nothing else does, so the curve crosses.` });
    } else if (f.power % 2 === 0) {
      lines.push({ text: `An even power is never negative, so $${factorTex(f)}$ has the same sign on both sides of $x = ${f.root}$: the curve comes down to the axis and turns back. It touches.` });
    } else {
      lines.push({ text: `An odd power changes sign, so the curve crosses; but a cube is very flat near $0$, like $y = x^{3}$, so it flattens out as it goes through.` });
    }
    return lines;
  },
};

interface SketchParams {
  /** The repeated root, where the curve touches. */
  r: number;
  /** The single root, where it crosses. */
  s: number;
  lead: number;
}

const sketchIntercept = ({ r, s, lead }: SketchParams): number => lead * r * r * -s;

/**
 * The equation of a described cubic sketch: a touch, a crossing, and either
 * the right arm (difficulty 1, lead 1) or the y-intercept, which fixes the
 * number in front (difficulty 2).
 */
const polySketchFormTiles: Generator<SketchParams> = {
  id: 'poly-sketch-form-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const [r, s] = sampleRoots(rng, 2, 5);
      if (Math.abs(r - s) < 2) continue;
      if (difficulty > 1) {
        const params = { r, s, lead: rng.pick([2, -2, 3, -3]) };
        if (Math.abs(sketchIntercept(params)) > 80) continue;
        return params;
      }
      return { r, s, lead: 1 };
    }
  },
  render: (params): Slide => {
    const { r, s, lead } = params;
    const brackets = [linTex(r), linTex(s)];
    const slips = [linTex(-r), linTex(-s), linTex(2 * r), linTex(2 * s)];
    const described = `A cubic touches the $x$-axis at $x = ${r}$ and crosses it at $x = ${s}$`;
    if (lead === 1) {
      return {
        kind: 'tiles',
        prompt: [say(`${described}. It rises to the right. Complete its equation.`)],
        template: 'y = ({0})^2({1})',
        bank: fillBank(brackets, slips),
        answer: brackets,
      };
    }
    const answer = [String(lead), ...brackets];
    return {
      kind: 'tiles',
      prompt: [say(`${described}. It crosses the $y$-axis at $y = ${sketchIntercept(params)}$. Complete its equation.`)],
      template: 'y = {0}({1})^2({2})',
      bank: fillBank(answer, [String(-lead), ...slips]),
      answer,
    };
  },
  solution: (params) => {
    const { r, s, lead } = params;
    const steps: SolutionStep[] = [
      { text: `A touch at $x = ${r}$ is a squared factor, $(${linTex(r)})^{2}$. A crossing at $x = ${s}$ is a single factor, $(${linTex(s)})$.` },
      { text: 'That makes a cubic already: the powers add to $3$.' },
    ];
    if (lead === 1) {
      steps.push({ text: 'Rising to the right means a positive leading coefficient, and nothing more is given, so the number in front is $1$.' });
    } else {
      const monic = r * r * -s;
      steps.push({ text: `Put $x = 0$ into $a(${linTex(r)})^{2}(${linTex(s)})$ and set it equal to the $y$-intercept:` });
      steps.push({ tex: chain(`a \\times ${productNum(-r)}^{2} \\times ${productNum(-s)} &= ${sketchIntercept(params)}`, `${monic}a &= ${sketchIntercept(params)}`, `a &= ${lead}`) });
    }
    steps.push({ tex: `y = ${leadTex(lead)}(${linTex(r)})^{2}(${linTex(s)})` });
    return steps;
  },
};

interface RepeatParams {
  r: number;
  m: number;
  s: number;
  n: number;
  lead: number;
  /** Test points either side of r, with s outside both. */
  t1: number;
  t2: number;
}

function repeatValues({ r, m, s, n, lead, t1, t2 }: RepeatParams) {
  const a1 = (t1 - r) ** m;
  const b1 = (t1 - s) ** n;
  const a2 = (t2 - r) ** m;
  const b2 = (t2 - s) ** n;
  return { a1, b1, a2, b2, p1: lead * a1 * b1, p2: lead * a2 * b2 };
}

const repeatForm = ({ r, m, s, n, lead }: RepeatParams): Form => rootsForm([r, s], [m, n], lead);

/**
 * p either side of a root, worked in strands: each factor's value at a test
 * point, then p there. The same sign both sides means a touch.
 */
const polyRepeatTree: Generator<RepeatParams> = {
  id: 'poly-repeat-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const [r, s] = sampleRoots(rng, 2, 4);
      const m = hard ? rng.int(1, 3) : 2;
      const n = hard ? (m === 1 ? 2 : rng.int(1, 2)) : 1;
      const params = {
        r,
        m,
        s,
        n,
        lead: hard ? rng.sign() : 1,
        t1: r - (hard ? rng.int(1, 2) : 1),
        t2: r + (hard ? rng.int(1, 2) : 1),
      };
      if (params.t1 <= s && s <= params.t2) continue;
      const { p1, p2 } = repeatValues(params);
      if (Math.abs(p1) > 99 || Math.abs(p2) > 99) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { r, m, s, n, lead, t1, t2 } = params;
    const v = repeatValues(params);
    const fa = factorTex(plainFactor(r, m));
    const fb = factorTex(plainFactor(s, n));
    const answer = [v.a1, v.b1, v.a2, v.b2, v.p1, v.p2];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Does the curve touch or cross the $x$-axis at $x = ${r}$? Test a point either side. Top row, left to right: $${fa}$ and $${fb}$ at $x = ${t1}$, then the same at $x = ${t2}$. Underneath, $p(${t1})$ and $p(${t2})$${lead < 0 ? ', minus sign included' : ''}.`,
        ),
      ],
      expression: `p(x) = ${formTex(repeatForm(params))}`,
      nodes: [
        { id: 'a1', from: [] },
        { id: 'b1', from: [] },
        { id: 'a2', from: [] },
        { id: 'b2', from: [] },
        { id: 'p1', from: ['a1', 'b1'] },
        { id: 'p2', from: ['a2', 'b2'] },
      ],
      bank: numberBank(answer, [-v.a1, -v.b1, -v.a2, -v.p1, -v.p2, v.a1 + v.b1, t1 - r, t2 + s]).map(String),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { r, lead, t1, t2 } = params;
    const v = repeatValues(params);
    const same = Math.sign(v.p1) === Math.sign(v.p2);
    const times = (a: number, b: number) => `${lead < 0 ? '-' : ''}(${a})(${b})`;
    return [
      { tex: chain(`p(${t1}) &= ${times(v.a1, v.b1)}`, `&= ${v.p1}`, `p(${t2}) &= ${times(v.a2, v.b2)}`, `&= ${v.p2}`) },
      {
        text: same
          ? `The same sign on both sides of $x = ${r}$: the curve comes to the axis and goes back. It touches.`
          : `The sign changes across $x = ${r}$, so the curve crosses there.`,
      },
      { text: `That matches the power: $x = ${r}$ is repeated ${params.m === 1 ? 'once' : `${params.m} times`}, and ${params.m % 2 === 0 ? 'an even power touches' : 'an odd power crosses'}.` },
    ];
  },
};

/** Which equation fits a drawn curve that touches the axis once? */
const polyTouchGraph: Generator<GraphParams> = {
  id: 'poly-touch-graph',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const count = rng.int(2, 3);
      const at = rng.int(0, count - 1);
      return { ...sampleGraph(rng, count, () => Array.from({ length: count }, (_, i) => (i === at ? 2 : 1)), rng.sign()), arms: true };
    }
    const at = rng.int(0, 1);
    return sampleGraph(rng, 2, () => [at === 0 ? 2 : 1, at === 0 ? 1 : 2], rng.sign());
  },
  render: (params): Slide => {
    const { roots, powers, lead } = params;
    const eq = (rs: number[], ps: number[], l: number) => `y = ${formTex(rootsForm(rs, ps, l))}`;
    const moved = powers.map((_, i) => powers[(i + powers.length - 1) % powers.length]);
    const negated = roots.map((r) => -r).reverse();
    const negatedPowers = [...powers].reverse();
    const flipped = eq(roots, powers, -lead);
    const distractors = [
      ...(params.arms ? [flipped] : []),
      eq(roots, moved, lead),
      eq(negated, negatedPowers, lead),
      ...(roots.length === 2 ? [eq(roots, [1, 1], lead)] : []),
      flipped,
    ];
    return choiceSlide(
      [
        say('Which equation could this curve have? The ringed points are where it meets the $x$-axis.'),
        diagram(graphSvg(graphPoly(params), roots, 'A polynomial curve on squared paper that touches the x-axis at one ringed point')),
      ],
      options({ tex: eq(roots, powers, lead) }, ...distractors.map((tex) => ({ tex }))).slice(0, 4),
    );
  },
  solution: ({ roots, powers, lead }) => {
    const touch = roots[powers.indexOf(2)];
    const crosses = roots.filter((_, i) => powers[i] === 1);
    return [
      { text: `It touches at $x = ${touch}$, so $(${linTex(touch)})$ is squared.` },
      { text: `It crosses at $x = ${crosses.join(',\\ ')}$, so ${crosses.length === 1 ? 'that factor is' : 'those factors are'} single.` },
      {
        text: `The right arm goes ${lead > 0 ? 'up, so there is no minus sign in front' : 'down, so there is a minus sign in front'}.`,
      },
      { tex: `y = ${formTex(rootsForm(roots, powers, lead))}` },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 4: the y-intercept and the sign between roots
 * ================================================================ */

/** Where a factorised curve crosses the y-axis: p(0), bracket by bracket. */
const polyIntercept: Generator<FormParams> = {
  id: 'poly-intercept',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, 5);
      if (difficulty > 1) {
        const twice = rng.int(0, 2);
        const factors = dressed(
          rng,
          roots.map((r, i) => plainFactor(r, i === twice ? 2 : 1)),
        );
        const form = { lead: rng.pick([1, -1, 2, -2]), factors };
        if (Math.abs(valueAt(formPoly(form), 0)) > 99) continue;
        return { form };
      }
      const form = { lead: rng.pick([1, -1, 2, -2, 3]), factors: roots.map((r) => plainFactor(r)) };
      if (Math.abs(valueAt(formPoly(form), 0)) > 60) continue;
      return { form };
    }
  },
  choices: ({ form }) => {
    const c = valueAt(formPoly(form), 0);
    // The sign slip: each root written as it stands rather than as -r.
    const rootsProduct = form.factors.reduce((acc, f) => acc * f.root ** f.power, form.lead);
    return intOptions(c, [-c, rootsProduct, c / form.lead, -rootsProduct]);
  },
  render: ({ form }): Slide => ({
    kind: 'expression',
    prompt: [say('Where does this curve cross the $y$-axis?'), wrapped(`y = ${formTex(form)}`)],
    lead: 'y\\text{-intercept} =',
    keypad: [],
    answer: String(valueAt(formPoly(form), 0)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ form }) => [
    { text: 'The curve crosses the $y$-axis where $x = 0$. Put $x = 0$ into every bracket: each leaves just its number.' },
    { tex: chain(`y &= ${zeroProductTex(form)}`, `&= ${valueAt(formPoly(form), 0)}`) },
    { text: 'There is no need to multiply the brackets out: $p(0)$ is the constant term, and this is the same number.' },
  ],
};

const INTERCEPT_HEIGHT = 14;

/** Slide to where the curve crosses the y-axis, which is p(0) worked out from the factors. */
const polyInterceptSlider: Generator<FormParams> = {
  id: 'poly-intercept-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, 4);
      const plain = roots.map((r) => plainFactor(r));
      const form =
        difficulty > 1
          ? { lead: rng.pick([1, -1, 2, -2]), factors: dressed(rng, plain) }
          : { lead: rng.pick([1, -1]), factors: plain };
      if (Math.abs(valueAt(formPoly(form), 0)) > 12) continue;
      return { form };
    }
  },
  render: ({ form }): Slide => {
    const p = formPoly(form);
    return {
      kind: 'slider',
      prompt: [say(`The curve is $y = ${formTex(form)}$. Slide the line to the height where it crosses the $y$-axis.`)],
      min: -INTERCEPT_HEIGHT,
      max: INTERCEPT_HEIGHT,
      step: 1,
      answer: valueAt(p, 0),
      readout: 'y = {v}',
      figure: {
        svg: plotSvg({
          xMin: -GRAPH_X,
          xMax: GRAPH_X,
          yMin: -INTERCEPT_HEIGHT,
          yMax: INTERCEPT_HEIGHT,
          curves: [{ f: clamped((x) => valueAt(p, x), 60) }],
          verticals: [{ x: 0, dashed: false }],
          marks: formRoots(form).map((x) => ({ x, y: 0 })),
          label: 'A cubic curve with its x-axis crossings ringed and the y-axis drawn',
          // Clipped at the figure's edge, or a steep arm runs on over the readout below.
        }).replace('<svg ', '<svg style="overflow: hidden" '),
        ...markerWindow(-INTERCEPT_HEIGHT, INTERCEPT_HEIGHT, 'y'),
        axis: 'y',
      },
    };
  },
  solution: ({ form }) => {
    const c = valueAt(formPoly(form), 0);
    return [
      { text: 'On the $y$-axis $x = 0$, so put $0$ into each bracket:' },
      { tex: chain(`y &= ${zeroProductTex(form)}`, `&= ${c}`) },
      { text: `${c > 0 ? 'Positive, so the curve crosses above' : 'Negative, so the curve crosses below'} the $x$-axis, which the picture agrees with.` },
    ];
  },
};

interface TestPointParams {
  form: Form;
  t: number;
}

/** p(t) bracket by bracket, then the product, whose sign says which side of the axis the curve is. */
const polyTestPointSteps: Generator<TestPointParams> = {
  id: 'poly-test-point-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const roots = sampleRoots(rng, 3, 4);
      const twice = hard ? rng.int(0, 2) : -1;
      const form = rootsForm(roots, roots.map((_, i) => (i === twice ? 2 : 1)), hard ? rng.pick([1, 2, -2, 3]) : 1);
      const t = rng.int(-4, 4);
      if (roots.includes(t)) continue;
      if (Math.abs(valueAt(formPoly(form), t)) > (hard ? 150 : 60)) continue;
      return { form, t };
    }
  },
  render: ({ form, t }): Slide => {
    const brackets = form.factors.map((f) => `(${t} ${signedNum(-f.root)})${f.power > 1 ? `^{${f.power}}` : ''}`);
    const head = form.lead === 1 ? [] : [String(form.lead), '\\times'];
    const start = [...head, ...brackets.flatMap((b, i) => (i === 0 ? [b] : ['\\times', b]))];
    const values = form.factors.map((f) => (t - f.root) ** f.power);
    const total = valueAt(formPoly(form), t);
    const reductions = form.factors.map((f, i) => {
      const d = t - f.root;
      const at = head.length + 2 * i;
      const value = productNum(values[i]);
      const slips =
        f.power > 1 ? [2 * d, -(d * d), (t + f.root) ** 2] : [-d, t + f.root, 2 * d];
      return { span: [at, at + 1] as [number, number], value, bank: stepBank(value, ...slips.map(productNum)) };
    });
    const sum = values.reduce((a, b) => a + b, 0) * form.lead;
    reductions.push({
      span: [0, start.length],
      value: String(total),
      bank: stepBank(String(total), String(-total), String(sum), String(total + 2 * form.lead * values[0])),
    });
    return {
      kind: 'steps',
      prompt: [
        say(
          `$p(x) = ${formTex(form)}$, and the line below is $p(${t})$. Work out each bracket, then multiply. Tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      start,
      reductions,
    };
  },
  solution: ({ form, t }) => {
    const total = valueAt(formPoly(form), t);
    return [
      { text: `Put $x = ${t}$ into every bracket:` },
      { tex: chain(`p(${t}) &= ${productAt(form, t)}`, `&= ${total}`) },
      { text: `${total > 0 ? 'Positive' : 'Negative'}, so at $x = ${t}$ the curve is ${total > 0 ? 'above' : 'below'} the $x$-axis.` },
    ];
  },
};

interface SignParams {
  form: Form;
  /** The stretch asked about runs from `lo` to the next root, two along. */
  lo: number;
}

/** One whole test point between two roots settles the sign on that whole stretch. */
const polySignFlow: Generator<SignParams> = {
  id: 'poly-sign-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const sorted = sampleRoots(rng, 3, 5).sort((a, b) => a - b);
      const gaps = [0, 1].filter((i) => sorted[i + 1] - sorted[i] === 2);
      if (gaps.length === 0) continue;
      const lo = sorted[rng.pick(gaps)];
      const roots = rng.shuffle(sorted);
      // The subject sits in a box that cannot wrap, so difficulty 2 adds a lead
      // and an r - x, but no squared factor and no kx - kr.
      const base = rootsForm(roots, [1, 1, 1], hard ? rng.pick([-1, 2, 3]) : 1);
      const form = hard ? { ...base, factors: base.factors.map((f) => (f.root > 0 && rng.chance(0.5) ? { ...f, form: 'reversed' as const } : f)) } : base;
      if (Math.abs(valueAt(formPoly(form), lo + 1)) > 150) continue;
      return { form, lo };
    }
  },
  render: ({ form, lo }): Slide => {
    const p = formPoly(form);
    const hi = lo + 2;
    const t = lo + 1;
    const v = valueAt(p, t);
    const roots = formRoots(form);
    const outside = [hi + 1, lo - 1, hi + 2, lo - 2].find((x) => !roots.includes(x))!;
    const key = `${formTex(form)}|${lo}`;
    const flippedFirst = { ...form, factors: form.factors.map((f, i) => (i === 0 ? { ...f, root: -f.root, form: 'plain' as const } : f)) };
    const slips = [-v, v / form.lead, valueAt(formPoly(flippedFirst), t), v + 6 * Math.sign(v)].filter(
      (x, i, all) => Number.isInteger(x) && x !== v && all.indexOf(x) === i,
    );
    return {
      kind: 'flow',
      prompt: [
        say(`Is the curve above or below the $x$-axis between $x = ${lo}$ and $x = ${hi}$? Each answer chooses what gets asked next.`),
      ],
      subject: `y = ${formTex(form)}`,
      steps: [
        {
          id: 'pick',
          ask: `Which whole number is a fair test point for the stretch between $${lo}$ and $${hi}$?`,
          branches: turned(
            [
              { label: `$x = ${t}$`, to: 'value' },
              {
                label: `$x = ${lo}$`,
                outcome: `$x = ${lo}$ is a root, so $y = 0$ there: that says nothing about the sign either side.`,
              },
              {
                label: `$x = ${outside}$`,
                outcome: `$x = ${outside}$ is not between $${lo}$ and $${hi}$, so its sign belongs to another piece of the curve.`,
              },
            ],
            key,
          ),
        },
        {
          id: 'value',
          ask: `What is $y$ at $x = ${t}$?`,
          branches: turned(
            [v, ...slips.slice(0, 2)].map((value) => ({ label: `$${value}$`, to: 'sign' })),
            `${key}|value`,
          ),
        },
        {
          id: 'sign',
          ask: `So between $x = ${lo}$ and $x = ${hi}$, the curve is`,
          branches: [
            { label: 'Above the axis', outcome: 'Above the axis means $y > 0$ all along that stretch.' },
            { label: 'Below the axis', outcome: 'Below the axis means $y < 0$ all along that stretch.' },
          ],
        },
      ],
      answer: [`$x = ${t}$`, `$${v}$`, v > 0 ? 'Above the axis' : 'Below the axis'],
    };
  },
  solution: ({ form, lo }) => {
    const t = lo + 1;
    const v = valueAt(formPoly(form), t);
    return [
      { text: `No root lies strictly between $${lo}$ and $${lo + 2}$, so the curve cannot change sides there: one test point settles it. The only whole number inside is $${t}$.` },
      { tex: chain(`y &= ${productAt(form, t)}`, `&= ${v}`) },
      { text: `${v > 0 ? 'Positive, so the curve is above' : 'Negative, so the curve is below'} the axis all the way from $x = ${lo}$ to $x = ${lo + 2}$.` },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 5: from sketch to formula
 * ================================================================ */

interface FindLeadParams {
  roots: number[];
  powers: number[];
  a: number;
  /** The x of the point given: 0 for the y-intercept. */
  at: number;
}

const monicAt = ({ roots, powers, at }: FindLeadParams): number => roots.reduce((acc, r, i) => acc * (at - r) ** powers[i], 1);

/** The roots in words: where the curve crosses, and where it touches. */
function meetsTex(roots: number[], powers: number[]): string {
  const sorted = roots.map((r, i) => ({ r, n: powers[i] })).sort((a, b) => a.r - b.r);
  const crosses = sorted.filter((x) => x.n === 1).map((x) => x.r);
  const touches = sorted.filter((x) => x.n > 1).map((x) => x.r);
  const list = (xs: number[]) =>
    xs.length === 1 ? `$x = ${xs[0]}$` : `$x = ${xs.slice(0, -1).join('$, $')}$ and $${xs[xs.length - 1]}$`;
  if (touches.length === 0) return `crosses the $x$-axis at ${list(crosses)}`;
  return `touches the $x$-axis at ${list(touches)} and crosses it at ${list(crosses)}`;
}

/** The number in front, from the roots and one more point on the curve. */
const polyFindLead: Generator<FindLeadParams> = {
  id: 'poly-find-lead',
  sample: (rng, difficulty) => {
    const a = rng.pick([1, -1, 2, -2, 3, -3]);
    for (;;) {
      if (difficulty > 1 && rng.chance(0.5)) {
        const [r, s] = sampleRoots(rng, 2, 4);
        if (Math.abs(r - s) < 2) continue;
        const params = { roots: [r, s], powers: rng.chance(0.5) ? [2, 1] : [1, 2], a, at: 0 };
        if (Math.abs(a * monicAt(params)) > 99) continue;
        return params;
      }
      const roots = sampleRoots(rng, 3, 4);
      const at = difficulty > 1 ? rng.int(-3, 3) : 0;
      if (difficulty > 1 && (at === 0 || roots.includes(at))) continue;
      const params = { roots, powers: [1, 1, 1], a, at };
      if (Math.abs(a * monicAt(params)) > (difficulty > 1 ? 150 : 72)) continue;
      return params;
    }
  },
  choices: (params) => {
    const m = monicAt(params);
    const y = params.a * m;
    return intOptions(params.a, [-params.a, y, m, y + m, -m]);
  },
  render: (params): Slide => {
    const { roots, powers, a, at } = params;
    const y = a * monicAt(params);
    const point = at === 0 ? `crosses the $y$-axis at $y = ${y}$` : `passes through the point $(${at}, ${y})$`;
    return {
      kind: 'expression',
      prompt: [
        say(`A cubic ${meetsTex(roots, powers)}, and ${point}. So its equation is`),
        show(`y = a${formTex(rootsForm(roots, powers))}`),
        say('for some number $a$. Find $a$.'),
      ],
      lead: 'a =',
      keypad: [],
      answer: String(a),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { roots, powers, a, at } = params;
    const m = monicAt(params);
    const y = a * m;
    const pieces = bracketProduct(
      1,
      roots.map((r, i) => ({ n: at - r, power: powers[i] })),
    );
    return [
      { text: `Put $x = ${at}$ and $y = ${y}$ into the equation:` },
      { tex: chain(`${y} &= a${pieces}`, `${y} &= ${m}a`, `a &= ${a}`) },
      { text: `So $y = ${formTex(rootsForm(roots, powers, a))}$.` },
    ];
  },
};

interface ExpandFormParams {
  roots: number[];
  powers: number[];
  a: number;
}

/** A sketch's formula expanded: two brackets, then the third, then the number in front. */
const polySketchExpandSteps: Generator<ExpandFormParams> = {
  id: 'poly-sketch-expand-steps',
  sample: (rng, difficulty) => {
    const a = rng.pick([2, -2, 3, -3]);
    if (difficulty > 1) {
      for (;;) {
        const [r, s] = sampleRoots(rng, 2, 4);
        if (Math.abs(r - s) < 2) continue;
        return { roots: [r, s], powers: [2, 1], a };
      }
    }
    return { roots: sampleRoots(rng, 3, 3), powers: [1, 1, 1], a };
  },
  render: ({ roots, powers, a }): Slide => {
    const squared = powers[0] === 2;
    const all = squared ? [roots[0], roots[0], roots[1]] : roots;
    const [r, s, t] = all;
    const quad = fromRoots([r, s]);
    const cubic = fromRoots(all);
    const final = scalePoly(cubic, a);
    const bracket = (p: Poly) => `(${polyTex(p)})`;
    const first = squared
      ? {
          span: [1, 2] as [number, number],
          value: bracket(quad),
          bank: stepBank(bracket(quad), bracket([1, 0, r * r]), bracket([1, -r, r * r]), bracket([1, 2 * r, r * r])),
        }
      : {
          span: [1, 3] as [number, number],
          value: bracket(quad),
          bank: stepBank(bracket(quad), bracket([1, r + s, r * s]), bracket([1, -(r + s), -r * s]), bracket([1, r + s, -r * s])),
        };
    const described = squared
      ? `A cubic touches the $x$-axis at $x = ${r}$, crosses it at $x = ${t}$ and meets the $y$-axis at $y = ${final[3]}$`
      : `A cubic crosses the $x$-axis at $x = ${[...roots].sort((x, y) => x - y).join(', ')}$ and meets the $y$-axis at $y = ${final[3]}$`;
    return {
      kind: 'steps',
      prompt: [
        say(
          `${described}, so its equation is $y = ${formTex(rootsForm(roots, powers, a))}$. Expand it: ${squared ? 'the square' : 'two brackets'} first, then the ${squared ? 'other bracket' : 'third'}, then the $${a}$. Tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      start: [String(a), ...roots.map((root, i) => factorTex(plainFactor(root, powers[i])))],
      reductions: [
        first,
        {
          span: [1, 3],
          value: bracket(cubic),
          bank: stepBank(
            bracket(cubic),
            bracket(fromRoots([r, s, -t])),
            bracket([...cubic.slice(0, 3), -cubic[3]]),
            bracket(addPoly(cubic, [0, 0, 1, 0])),
          ),
        },
        {
          span: [0, 2],
          value: polyTex(final),
          bank: stepBank(
            polyTex(final),
            polyTex([final[0], ...cubic.slice(1)]),
            polyTex(scalePoly(cubic, -a)),
            polyTex([...final.slice(0, 3), cubic[3]]),
          ),
        },
      ],
    };
  },
  solution: ({ roots, powers, a }) => {
    const squared = powers[0] === 2;
    const all = squared ? [roots[0], roots[0], roots[1]] : roots;
    const quad = fromRoots(all.slice(0, 2));
    const cubic = fromRoots(all);
    return [
      { text: `$${squared ? `(${linTex(all[0])})^{2}` : `(${linTex(all[0])})(${linTex(all[1])})`} = ${polyTex(quad)}$` },
      { text: `$(${polyTex(quad)})(${linTex(all[2])}) = ${polyTex(cubic)}$` },
      { text: `Then every term times $${a}$:` },
      { tex: `y = ${polyTex(scalePoly(cubic, a))}` },
      { text: `Check: the constant term is the $y$-intercept, $${a * cubic[3]}$.` },
    ];
  },
};

interface DescribeParams {
  roots: number[];
  powers: number[];
  lead: number;
  /** Say where it meets the y-axis too, at difficulty 2. */
  intercept: boolean;
}

function describeGraph(roots: number[], powers: number[], lead: number, intercept?: number): string {
  const sorted = roots.map((r, i) => ({ r, n: powers[i] })).sort((a, b) => a.r - b.r);
  const meets = sorted.map(({ r, n }, i) => `${i === 0 ? (n > 1 ? 'Touches' : 'Crosses') : n > 1 ? 'touches' : 'crosses'} at x = ${plainNum(r)}`);
  const arm = lead > 0 ? 'rises to the right' : 'falls to the right';
  return `${meets.join(', ')}; ${arm}${intercept === undefined ? '' : `; meets the y-axis at y = ${plainNum(intercept)}`}`;
}

/** Which description fits the curve of a formula: touches, crossings, the right arm, and at difficulty 2 the y-intercept. */
const polyDescribeGraph: Generator<DescribeParams> = {
  id: 'poly-describe-graph',
  sample: (rng, difficulty) => {
    for (;;) {
      const count = rng.int(2, 3);
      const roots = sampleRoots(rng, count, 5);
      if (difficulty > 1) {
        const powers = samplePowers(rng, count, 2, 3, 4);
        const params = { roots, powers, lead: rng.pick([1, -1, 2, -2, 3, -3]), intercept: true };
        if (Math.abs(valueAt(formPoly(rootsForm(roots, powers, params.lead)), 0)) > 99) continue;
        return params;
      }
      const powers = count === 2 ? (rng.chance(0.5) ? [2, 1] : [1, 2]) : [1, 1, 1];
      return { roots, powers, lead: rng.pick([1, -1, 2, -2]), intercept: false };
    }
  },
  render: ({ roots, powers, lead, intercept }): Slide => {
    const c = valueAt(formPoly(rootsForm(roots, powers, lead)), 0);
    const shown = intercept ? c : undefined;
    const moved = powers.every((n) => n === 1) ? powers.map((_, i) => (i === 0 ? 2 : 1)) : powers.map((_, i) => powers[(i + 1) % powers.length]);
    const wrong = [
      ...(intercept ? [describeGraph(roots, powers, lead, -c)] : []),
      describeGraph(roots, moved, lead, shown),
      describeGraph(roots, powers, -lead, shown),
      describeGraph(
        roots.map((r) => -r),
        powers,
        lead,
        shown,
      ),
    ];
    return turnedWordChoice(
      [say('Which description fits the graph of this curve?'), wrapped(`y = ${formTex(rootsForm(roots, powers, lead))}`)],
      describeGraph(roots, powers, lead, shown),
      wrong,
    );
  },
  solution: ({ roots, powers, lead, intercept }) => {
    const form = rootsForm(roots, powers, lead);
    const c = valueAt(formPoly(form), 0);
    return [
      { text: 'A single factor crosses the axis at its root, and a squared factor touches.' },
      {
        text: `The leading coefficient is $${formLead(form)}$, ${lead > 0 ? 'positive, so the right arm rises' : 'negative, so the right arm falls'}.`,
      },
      ...(intercept ? [{ text: 'At $x = 0$:' }, { tex: chain(`y &= ${zeroProductTex(form)}`, `&= ${c}`) }] : []),
      { text: describeGraph(roots, powers, lead, intercept ? c : undefined) + '.' },
    ];
  },
};

/* ================================================================
 * Level 4: roots and coefficients
 *
 * Level 2 went from a polynomial to its roots; this goes the other way. The
 * roots fix the coefficients through their sums: for a quadratic
 * a(x - α)(x - β), α + β = -b/a and αβ = c/a; for a cubic, Σα = -b/a,
 * Σαβ = c/a and αβγ = -d/a, the signs alternating. Every polynomial here is
 * still built outward from small whole roots with `fromRoots`, and every sum
 * is computed from those roots, never read back off the coefficients, so it
 * is whole by construction. Only Σ1/α is a fraction.
 * ================================================================ */

/** The sums of the roots taken one, two and three at a time: [Σα, Σαβ, αβγ]. */
function rootSums(roots: number[]): number[] {
  let sums = [1];
  for (const r of roots) {
    sums = [...sums, 0].map((s, k) => s + (k > 0 ? r * sums[k - 1] : 0));
  }
  return sums.slice(1);
}

/** A leading coefficient: 1 at difficulty 1, and at difficulty 2 one that has to be divided by. */
function sampleLead(rng: Rng, hard: boolean): number {
  return hard ? rng.pick([2, -2, 3, -3, -1]) : 1;
}

/** Every coefficient within `limit`, so the cubic reads comfortably. */
const fits = (p: Poly, limit: number): boolean => p.every((c) => Math.abs(c) <= limit);

/** A coefficient in front of a letter or a bracket: 1 is left off and -1 is a bare minus. */
function coefMark(k: number): string {
  if (k === 1) return '';
  if (k === -1) return '-';
  return String(k);
}

function gcdOf(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcdOf(b, a % b);
}

/** n/d in lowest terms, the sign in front, as the learner reads it. */
function fracTex(n: number, d: number): string {
  const g = gcdOf(n, d) || 1;
  const sign = n * d < 0 ? '-' : '';
  const top = Math.abs(n / g);
  const bottom = Math.abs(d / g);
  return bottom === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${bottom}}`;
}

/** The same for the grader. Never displayed. */
const fracAnswer = (n: number, d: number): string => `(${n})/(${d})`;

/** c/a as a line of working: just c when a is 1, with a minus in front when asked. */
function overLead(c: number, a: number, minus: boolean): string {
  if (a === 1) return minus ? `-(${c})` : String(c);
  return `${minus ? '-' : ''}\\frac{${c}}{${a}}`;
}

/** Roots as a list the learner reads: "-2, 1 and 3". */
function rootList(roots: number[]): string {
  const sorted = [...roots].sort((x, y) => x - y);
  return `$${sorted.slice(0, -1).join(', ')}$ and $${sorted[sorted.length - 1]}$`;
}

const TWO_LABELS = ['\\alpha + \\beta', '\\alpha\\beta'];
const THREE_LABELS = ['\\alpha + \\beta + \\gamma', '\\alpha\\beta + \\beta\\gamma + \\gamma\\alpha', '\\alpha\\beta\\gamma'];
const THREE_ROOTS = '$\\alpha$, $\\beta$ and $\\gamma$';
/** The same three sums in Σ notation, short enough for a line of working on a phone. */
const SIGMA_LABELS = ['\\Sigma\\alpha', '\\Sigma\\alpha\\beta', '\\alpha\\beta\\gamma'];

/** The identities for a quadratic, as a worked-solution line. */
const TWO_IDENTITIES = '\\alpha + \\beta = -\\frac{b}{a}, \\qquad \\alpha\\beta = \\frac{c}{a}';

/** The three identities for a cubic, one to a line, since together they are wider than a phone. */
const THREE_IDENTITIES = chain(
  '\\Sigma\\alpha &= -\\frac{b}{a}',
  '\\Sigma\\alpha\\beta &= \\frac{c}{a}',
  '\\alpha\\beta\\gamma &= -\\frac{d}{a}',
);

interface RootsLeadParams {
  roots: number[];
  lead: number;
}

/** Two distinct whole roots and a lead, the quadratic kept readable. */
function sampleQuadratic(rng: Rng, difficulty: number, ok: (p: Poly, sums: number[]) => boolean = () => true): RootsLeadParams {
  for (;;) {
    const roots = sampleRoots(rng, 2, 5);
    const lead = sampleLead(rng, difficulty > 1);
    const p = fromRoots(roots, lead);
    if (!fits(p, 45) || !ok(p, rootSums(roots))) continue;
    return { roots, lead };
  }
}

/** Three distinct whole roots and a lead, the cubic kept readable. */
function sampleCubicRoots(
  rng: Rng,
  max: number,
  hard: boolean,
  limit: number,
  ok: (p: Poly, sums: number[]) => boolean = () => true,
): RootsLeadParams {
  for (;;) {
    const roots = sampleRoots(rng, 3, max);
    const lead = sampleLead(rng, hard);
    const p = fromRoots(roots, lead);
    if (!fits(p, limit) || !ok(p, rootSums(roots))) continue;
    return { roots, lead };
  }
}

/** A cubic's line of working: which identity, then the numbers. */
function cubicIdentityStep(p: Poly, k: number): string {
  const value = ((k === 1 ? 1 : -1) * p[k + 1]) / p[0];
  return `${SIGMA_LABELS[k]} = ${overLead(p[k + 1], p[0], k !== 1)} = ${value}`;
}

/* ---------- lesson 1: two roots ---------- */

interface QuadAskParams extends RootsLeadParams {
  ask: number;
}

/** α + β or αβ read off a quadratic's coefficients. */
const polyRootsSumProduct: Generator<QuadAskParams> = {
  id: 'poly-roots-sum-product',
  sample: (rng, difficulty) => ({ ...sampleQuadratic(rng, difficulty), ask: rng.int(0, 1) }),
  choices: ({ roots, lead, ask }) => {
    const p = fromRoots(roots, lead);
    const [s, pr] = rootSums(roots);
    return ask === 0
      ? intOptions(s, [-s, p[1], pr, -p[1]])
      : intOptions(pr, [-pr, p[2], -s, s]);
  },
  render: ({ roots, lead, ask }): Slide => {
    const p = fromRoots(roots, lead);
    return {
      kind: 'expression',
      prompt: [
        say(`$\\alpha$ and $\\beta$ are the roots of $${polyTex(p)} = 0$. Find $${TWO_LABELS[ask]}$ from the coefficients, without solving.`),
      ],
      lead: `${TWO_LABELS[ask]} =`,
      keypad: [],
      answer: String(rootSums(roots)[ask]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ roots, lead, ask }) => {
    const p = fromRoots(roots, lead);
    const value = rootSums(roots)[ask];
    return [
      { text: 'For $ax^{2} + bx + c = 0$:' },
      { tex: TWO_IDENTITIES },
      { text: `Here $a = ${p[0]}$, $b = ${p[1]}$ and $c = ${p[2]}$.` },
      { tex: `${TWO_LABELS[ask]} = ${overLead(p[ask + 1], p[0], ask === 0)} = ${value}` },
    ];
  },
};

/** A quadratic built from the sum and product of its roots. */
const polySumProductTiles: Generator<RootsLeadParams> = {
  id: 'poly-sum-product-tiles',
  sample: (rng, difficulty) => sampleQuadratic(rng, difficulty, (_, [s]) => s !== 0),
  render: ({ roots, lead }): Slide => {
    const [s, pr] = rootSums(roots);
    const a = lead;
    const answer = [signedTerm(-a * s, 1), signedNum(a * pr)];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `A quadratic${a === 1 ? ' with leading coefficient $1$' : ` with leading coefficient $${a}$`} has two roots whose sum is $${s}$ and whose product is $${pr}$. Fill in the quadratic.`,
        ),
      ],
      template: `${coefMark(a)}x^2 {0} {1} = 0`,
      bank: fillBank(answer, [
        signedTerm(a * s, 1),
        signedNum(-a * pr),
        signedTerm(-s, 1),
        signedNum(pr),
        signedTerm(a * pr, 1),
        signedNum(-a * s),
      ]),
      answer,
    };
  },
  solution: ({ roots, lead }) => {
    const [s, pr] = rootSums(roots);
    const p = fromRoots(roots, lead);
    return [
      { text: 'Multiplying out $(x - \\alpha)(x - \\beta)$ gives the sum and the product:' },
      { tex: 'x^{2} - (\\alpha + \\beta)x + \\alpha\\beta' },
      { text: `So the $x$ term is minus the sum, $${termTex(-s, 1)}$, and the constant is the product, $${pr}$.` },
      ...(lead === 1 ? [] : [{ text: `Then every term times $${lead}$:` }]),
      { tex: `${polyTex(p)} = 0` },
    ];
  },
};

/** From two roots to the sum and product, then to b and c. */
const polyQuadCoeffsTree: Generator<RootsLeadParams> = {
  id: 'poly-quad-coeffs-tree',
  sample: (rng, difficulty) => sampleQuadratic(rng, difficulty),
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const [s, pr] = rootSums(roots);
    const values = [s, pr, p[1], p[2]];
    return {
      kind: 'tree',
      prompt: [
        say(
          `The roots of $${coefMark(lead)}x^{2} + bx + c = 0$ are $\\alpha = ${roots[0]}$ and $\\beta = ${roots[1]}$. Top row: $\\alpha + \\beta$, then $\\alpha\\beta$. Underneath each, the coefficient it gives: $b = ${coefMark(-lead)}(\\alpha + \\beta)$ and $c = ${coefMark(lead)}\\alpha\\beta$.`,
        ),
      ],
      expression: `${coefMark(lead)}x^{2} + bx + c`,
      nodes: [
        { id: 's', from: [] },
        { id: 'p', from: [] },
        { id: 'b', from: ['s'] },
        { id: 'c', from: ['p'] },
      ],
      bank: numberBank(values, [-s, -pr, -p[1], -p[2], s + pr]),
      answer: values.map(String),
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [s, pr] = rootSums(roots);
    return [
      { tex: chain(`\\alpha + \\beta &= ${roots[0]} ${signedNum(roots[1])} = ${s}`, `\\alpha\\beta &= ${roots[0]} \\times ${factor(String(roots[1]))} = ${pr}`) },
      { text: `$b = ${coefMark(-lead)}(${s}) = ${p[1]}$ and $c = ${coefMark(lead)}(${pr}) = ${p[2]}$.` },
      { tex: `${polyTex(p)} = 0` },
    ];
  },
};

const SIGN_WORDS = ['Both positive', 'Both negative', 'One positive, one negative'];

/** The signs of the roots from the signs of their sum and product, without solving. */
const polyRootSigns: Generator<RootsLeadParams> = {
  id: 'poly-root-signs',
  sample: (rng, difficulty) => sampleQuadratic(rng, difficulty),
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const [s, pr] = rootSums(roots);
    const correct = pr < 0 ? 2 : s > 0 ? 0 : 1;
    return wordChoice(
      [say(`$${polyTex(p)} = 0$ has two whole-number roots. Without solving it, what are their signs?`)],
      SIGN_WORDS,
      correct,
    );
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [s, pr] = rootSums(roots);
    return [
      { tex: `\\alpha\\beta = ${overLead(p[2], p[0], false)} = ${pr}` },
      pr < 0
        ? { text: 'A negative product means the roots have opposite signs.' }
        : { text: `A positive product means the roots have the same sign, and their sum says which: $\\alpha + \\beta = ${overLead(p[1], p[0], true)} = ${s}$.` },
      { text: `So: ${SIGN_WORDS[pr < 0 ? 2 : s > 0 ? 0 : 1].toLowerCase()}. They are $${[...roots].sort((x, y) => x - y).join('$ and $')}$.` },
    ];
  },
};

/* ---------- lesson 2: three roots ---------- */

interface CubicRootsParams {
  roots: number[];
}

/** Σα, the three pair products and their sum, and αβγ, from three given roots. */
const polyCubicSumsTree: Generator<CubicRootsParams> = {
  id: 'poly-cubic-sums-tree',
  sample: (rng, difficulty) => ({ roots: sampleRoots(rng, 3, difficulty > 1 ? 5 : 3) }),
  render: ({ roots }): Slide => {
    const [a, b, c] = roots;
    const [s1, s2, s3] = rootSums(roots);
    const values = [s1, a * b, b * c, c * a, s2, s3];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Top row, left to right: $\\alpha + \\beta + \\gamma$, then $\\alpha\\beta$, $\\beta\\gamma$ and $\\gamma\\alpha$. Underneath: $\\alpha\\beta + \\beta\\gamma + \\gamma\\alpha$, then $\\alpha\\beta\\gamma$, which is $\\alpha\\beta$ times $\\gamma$.',
        ),
      ],
      expression: `\\alpha = ${a},\\;\\; \\beta = ${b},\\;\\; \\gamma = ${c}`,
      nodes: [
        { id: 's1', from: [] },
        { id: 'ab', from: [] },
        { id: 'bc', from: [] },
        { id: 'ca', from: [] },
        { id: 's2', from: ['ab', 'bc', 'ca'] },
        { id: 's3', from: ['ab'] },
      ],
      bank: numberBank(values, [-s1, -s2, -s3, a * b + b * c - c * a, a + b - c], String, 2),
      answer: values.map(String),
    };
  },
  solution: ({ roots }) => {
    const [a, b, c] = roots;
    const [s1, s2, s3] = rootSums(roots);
    const f = (n: number) => factor(String(n));
    return [
      { tex: `\\alpha + \\beta + \\gamma = ${a} ${signedNum(b)} ${signedNum(c)} = ${s1}` },
      { tex: `\\Sigma\\alpha\\beta = ${a * b} ${signedNum(b * c)} ${signedNum(c * a)} = ${s2}` },
      { tex: `\\alpha\\beta\\gamma = ${a} \\times ${f(b)} \\times ${f(c)} = ${s3}` },
      { text: 'These three are what the coefficients of the cubic are made of.' },
    ];
  },
};

interface CubicAskParams extends RootsLeadParams {
  ask: number;
}

/** One of the three sums read off a cubic's coefficients. */
const polyCubicVieta: Generator<CubicAskParams> = {
  id: 'poly-cubic-vieta',
  sample: (rng, difficulty) => ({
    ...sampleCubicRoots(rng, difficulty > 1 ? 5 : 4, difficulty > 1, difficulty > 1 ? 120 : 60),
    ask: rng.int(0, 2),
  }),
  choices: ({ roots, lead, ask }) => {
    const p = fromRoots(roots, lead);
    const sums = rootSums(roots);
    const value = sums[ask];
    return intOptions(value, [-value, p[ask + 1], -p[ask + 1], ...sums.filter((_, k) => k !== ask)]);
  },
  render: ({ roots, lead, ask }): Slide => {
    const p = fromRoots(roots, lead);
    return {
      kind: 'expression',
      prompt: [say(`${THREE_ROOTS} are the roots of $${polyTex(p)} = 0$. Find $${THREE_LABELS[ask]}$ without solving.`)],
      lead: `${THREE_LABELS[ask]} =`,
      keypad: [],
      answer: String(rootSums(roots)[ask]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ roots, lead, ask }) => {
    const p = fromRoots(roots, lead);
    return [
      { text: 'For $ax^{3} + bx^{2} + cx + d = 0$:' },
      { tex: THREE_IDENTITIES },
      { text: `Here $a = ${p[0]}$, $b = ${p[1]}$, $c = ${p[2]}$ and $d = ${p[3]}$.` },
      { tex: cubicIdentityStep(p, ask) },
    ];
  },
};

/** All three sums in turn, each a fork where the slip is the sign. */
const polyVietaFlow: Generator<RootsLeadParams> = {
  id: 'poly-vieta-flow',
  sample: (rng, difficulty) =>
    sampleCubicRoots(rng, difficulty > 1 ? 5 : 4, difficulty > 1, difficulty > 1 ? 120 : 60, (_, [s1, s2]) => s1 !== 0 && s2 !== 0),
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const sums = rootSums(roots);
    const ids = ['sum', 'pairs', 'product'];
    const key = polyTex(p);
    return {
      kind: 'flow',
      prompt: [say('Read the three sums of the roots off the coefficients. Each answer chooses what gets asked next.')],
      subject: `${key} = 0`,
      steps: sums.map((right, k) => {
        const raw = p[k + 1];
        const values = [right, -right, ...(raw !== right && raw !== -right ? [raw] : [])];
        const branches = values.map((value) => {
          if (value === right) {
            return k < 2
              ? { label: `$${value}$`, to: ids[k + 1] }
              : { label: `$${value}$`, outcome: 'Minus, plus, minus: all three sums from the coefficients alone.' };
          }
          return value === raw
            ? { label: `$${value}$`, outcome: `That is the coefficient itself. Divide it by the leading coefficient, $${p[0]}$.` }
            : { label: `$${value}$`, outcome: `That has the wrong sign: the identities go $-\\frac{b}{a}$, $+\\frac{c}{a}$, $-\\frac{d}{a}$.` };
        });
        return { id: ids[k], ask: `What is $${THREE_LABELS[k]}$?`, branches: turned(branches, `${key}|${k}`) };
      }),
      answer: sums.map((value) => `$${value}$`),
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    return [
      { tex: THREE_IDENTITIES },
      { text: `Here $a = ${p[0]}$, $b = ${p[1]}$, $c = ${p[2]}$ and $d = ${p[3]}$:` },
      { tex: chain(...[0, 1, 2].map((k) => cubicIdentityStep(p, k).replace(' = ', ' &= '))) },
    ];
  },
};

/** The three sums placed at once, in Σ notation. */
const polyCubicIdentityTiles: Generator<RootsLeadParams> = {
  id: 'poly-cubic-identity-tiles',
  sample: (rng, difficulty) => sampleCubicRoots(rng, difficulty > 1 ? 5 : 4, difficulty > 1, difficulty > 1 ? 120 : 60),
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const sums = rootSums(roots);
    return {
      kind: 'tiles',
      prompt: [say(`${THREE_ROOTS} are the roots of $${polyTex(p)} = 0$. Fill in the three sums from its coefficients.`)],
      template: '\\Sigma\\alpha = {0}\\quad \\Sigma\\alpha\\beta = {1}\\quad \\alpha\\beta\\gamma = {2}',
      bank: numberBank(sums, [...sums.map((s) => -s), p[1], p[2], p[3]]),
      answer: sums.map(String),
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    return [
      { text: '$\\Sigma\\alpha$ is the sum of the roots and $\\Sigma\\alpha\\beta$ the sum of their products in pairs.' },
      { tex: THREE_IDENTITIES },
      { tex: chain(...[0, 1, 2].map((k) => cubicIdentityStep(p, k).replace(' = ', ' &= '))) },
    ];
  },
};

/* ---------- lesson 3: a cubic from its roots ---------- */

/** The cubic with given roots and lead, built from the three sums. */
const polyRootsToCubicTiles: Generator<RootsLeadParams> = {
  id: 'poly-roots-to-cubic-tiles',
  sample: (rng, difficulty) => sampleCubicRoots(rng, 4, difficulty > 1, 100, (_, [s1, s2]) => s1 !== 0 && s2 !== 0),
  choices: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const variants = [
      fromRoots(roots.map((r) => -r), lead),
      [p[0], p[1], p[2], -p[3]],
      [p[0], p[1], -p[2], p[3]],
    ];
    return options(
      { tex: polyTex(p), answer: polyAnswer(p) },
      ...variants.map((q) => ({ tex: polyTex(q), answer: polyAnswer(q) })),
    );
  },
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const [s1, s2, s3] = rootSums(roots);
    const answer = [signedTerm(p[1], 2), signedTerm(p[2], 1), signedNum(p[3])];
    return {
      kind: 'tiles',
      prompt: [say(`Find the cubic with leading coefficient $${lead}$ and roots ${rootList(roots)}, from the sums of its roots.`)],
      template: `${coefMark(lead)}x^3 {0} {1} {2}`,
      bank: fillBank(answer, [
        signedTerm(-p[1], 2),
        signedTerm(-p[2], 1),
        signedNum(-p[3]),
        ...(lead === 1 ? [] : [signedTerm(-s1, 2), signedTerm(s2, 1), signedNum(-s3)]),
      ]),
      answer,
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [s1, s2, s3] = rootSums(roots);
    return [
      { tex: chain(`\\Sigma\\alpha &= ${s1}`, `\\Sigma\\alpha\\beta &= ${s2}`, `\\alpha\\beta\\gamma &= ${s3}`) },
      { text: 'A monic cubic is $x^{3} - (\\Sigma\\alpha)x^{2} + (\\Sigma\\alpha\\beta)x - \\alpha\\beta\\gamma$, the signs alternating:' },
      { tex: polyTex(fromRoots(roots)) },
      ...(lead === 1 ? [] : [{ text: `Then every term times $${lead}$:` }, { tex: polyTex(p) }]),
    ];
  },
};

interface NewRootsParams {
  roots: number[];
  /** Each root times m, or each root plus m. */
  mode: 'scale' | 'shift';
  m: number;
}

function newRoots({ roots, mode, m }: NewRootsParams): number[] {
  return roots.map((r) => (mode === 'scale' ? m * r : r + m));
}

function newRootsLabel({ mode, m }: NewRootsParams): string {
  const greek = ['\\alpha', '\\beta', '\\gamma'];
  return mode === 'scale'
    ? greek.map((g) => `${coefMark(m)}${g}`).join(', ')
    : greek.map((g) => `${g} ${signedNum(m)}`).join(', ');
}

/** The three new coefficients written in terms of the old sums, one bracket each. */
function newRootsTokens({ roots, mode, m }: NewRootsParams): string[] {
  const [s1, s2, s3] = rootSums(roots).map((v) => factor(String(v)));
  const f = factor(String(m));
  if (mode === 'scale') {
    return ['x^{3}', `- (${f} \\times ${s1})x^{2}`, `+ (${f}^{2} \\times ${s2})x`, `- (${f}^{3} \\times ${s3})`];
  }
  const sign = m > 0 ? '+' : '-';
  return [
    'x^{3}',
    `- (${s1} ${signedNum(3 * m)})x^{2}`,
    `+ (${s2} ${sign} 2 \\times ${s1} + 3)x`,
    `- (${s3} ${sign} ${s2} + ${s1} ${signedNum(m)})`,
  ];
}

/** A cubic whose roots are 2α, 2β, 2γ (or α + 1, ...), from the old sums, coefficient by coefficient. */
const polyNewRootsSteps: Generator<NewRootsParams> = {
  id: 'poly-new-roots-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, 4);
      const params: NewRootsParams =
        difficulty > 1 ? { roots, mode: 'shift', m: rng.pick([1, -1]) } : { roots, mode: 'scale', m: rng.pick([2, -2, 3, -1]) };
      const [s1, s2] = rootSums(roots);
      const q = fromRoots(newRoots(params));
      if (s1 === 0 || s2 === 0 || q.some((c) => c === 0) || !fits(q, 150)) continue;
      return params;
    }
  },
  choices: (params) => {
    const q = fromRoots(newRoots(params));
    const { roots, mode, m } = params;
    const [s1, s2, s3] = rootSums(roots);
    const other =
      mode === 'scale' ? [1, -m * s1, m * s2, -m * s3] : fromRoots(roots.map((r) => r - m));
    const variants = [[q[0], -q[1], q[2], -q[3]], other, [q[0], q[1], q[2], -q[3]]];
    return options(
      { tex: polyTex(q), answer: polyAnswer(q) },
      ...variants.map((v) => ({ tex: polyTex(v), answer: polyAnswer(v) })),
    );
  },
  render: (params): Slide => {
    const { roots, mode, m } = params;
    const p = fromRoots(roots);
    const [s1, s2, s3] = rootSums(roots);
    const q = fromRoots(newRoots(params));
    const start = newRootsTokens(params);
    // The same bracket worked with the change the wrong way: the power of m
    // forgotten, or the shift taken off rather than added.
    const slip =
      mode === 'scale' ? [1, -m * s1, m * s2, -m * s3] : fromRoots(roots.map((r) => r - m));
    const shows = [(c: number) => signedTerm(c, 2), (c: number) => signedTerm(c, 1), (c: number) => signedNum(c)];
    const reductions = [1, 2, 3].map((i) => {
      const show = shows[i - 1];
      const value = show(q[i]);
      const extras = [show(-q[i]), ...(slip[i] !== q[i] && slip[i] !== 0 ? [show(slip[i])] : []), show(q[i] + (i === 3 ? 2 : 1))];
      return { span: [i, i + 1] as [number, number], value, bank: stepBank(value, ...extras) };
    });
    // Last, the line read as one cubic, against the usual slips in the signs.
    const whole = polyTex(q);
    reductions.push({
      span: [0, 4],
      value: whole,
      bank: stepBank(whole, polyTex([q[0], -q[1], q[2], -q[3]]), polyTex([q[0], q[1], q[2], -q[3]]), polyTex([q[0], -q[1], -q[2], q[3]])),
    });
    return {
      kind: 'steps',
      prompt: [
        say(
          `$p(x) = ${polyTex(p)}$ has roots ${THREE_ROOTS}, so $\\Sigma\\alpha = ${s1}$, $\\Sigma\\alpha\\beta = ${s2}$ and $\\alpha\\beta\\gamma = ${s3}$. The line below is the cubic with roots $${newRootsLabel(params)}$, written from those sums. Work out each coefficient: tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      start,
      reductions,
    };
  },
  solution: (params) => {
    const { roots, mode, m } = params;
    const [s1, s2, s3] = rootSums(roots);
    const [n1, n2, n3] = rootSums(newRoots(params));
    const lines =
      mode === 'scale'
        ? [
            `&${factor(String(m))} \\times ${factor(String(s1))} = ${n1}`,
            `&${factor(String(m))}^{2} \\times ${factor(String(s2))} = ${n2}`,
            `&${factor(String(m))}^{3} \\times ${factor(String(s3))} = ${n3}`,
          ]
        : [
            `&${s1} ${signedNum(3 * m)} = ${n1}`,
            `&${s2} ${m > 0 ? '+' : '-'} 2 \\times ${factor(String(s1))} + 3 = ${n2}`,
            `&${s3} ${m > 0 ? '+' : '-'} ${factor(String(s2))} + ${factor(String(s1))} ${signedNum(m)} = ${n3}`,
          ];
    return [
      mode === 'scale'
        ? { text: `Each root is multiplied by $${m}$, so the sum is multiplied by $${m}$, each product of a pair by $${factor(String(m))}^{2}$, and the product of all three by $${factor(String(m))}^{3}$.` }
        : { text: `Each root has $${m}$ added. Multiplying out the brackets, the new sums come from the old ones:` },
      { tex: chain(...lines) },
      { text: 'Then minus, plus, minus:' },
      { tex: polyTex(fromRoots(newRoots(params))) },
    ];
  },
};

/** From three roots to the three sums, then each sum to its coefficient. */
const polyCubicCoeffsTree: Generator<RootsLeadParams> = {
  id: 'poly-cubic-coeffs-tree',
  sample: (rng, difficulty) => sampleCubicRoots(rng, difficulty > 1 ? 5 : 4, difficulty > 1, 100),
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const sums = rootSums(roots);
    const values = [...sums, p[1], p[2], p[3]];
    return {
      kind: 'tree',
      prompt: [
        say(
          `The cubic below has roots ${rootList(roots)}. Top row: $\\Sigma\\alpha$, $\\Sigma\\alpha\\beta$ and $\\alpha\\beta\\gamma$. Underneath each, the coefficient it gives: $b = ${coefMark(-lead)}\\Sigma\\alpha$, $c = ${coefMark(lead)}\\Sigma\\alpha\\beta$ and $d = ${coefMark(-lead)}\\alpha\\beta\\gamma$.`,
        ),
      ],
      expression: `${coefMark(lead)}x^{3} + bx^{2} + cx + d`,
      nodes: [
        { id: 's1', from: [] },
        { id: 's2', from: [] },
        { id: 's3', from: [] },
        { id: 'b', from: ['s1'] },
        { id: 'c', from: ['s2'] },
        { id: 'd', from: ['s3'] },
      ],
      bank: numberBank(values, [...values.map((v) => -v)], String, 2),
      answer: values.map(String),
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [s1, s2, s3] = rootSums(roots);
    return [
      { tex: chain(`\\Sigma\\alpha &= ${s1}`, `\\Sigma\\alpha\\beta &= ${s2}`, `\\alpha\\beta\\gamma &= ${s3}`) },
      { text: `The signs alternate: $b = ${coefMark(-lead)}(${s1}) = ${p[1]}$, $c = ${coefMark(lead)}(${s2}) = ${p[2]}$ and $d = ${coefMark(-lead)}(${s3}) = ${p[3]}$.` },
      { tex: polyTex(p) },
    ];
  },
};

/** Which cubic has these three sums? */
const polySumsToCubic: Generator<RootsLeadParams> = {
  id: 'poly-sums-to-cubic',
  sample: (rng, difficulty) =>
    sampleCubicRoots(rng, difficulty > 1 ? 5 : 4, difficulty > 1, 100, (_, [s1, s2]) => s1 !== 0 && s2 !== 0),
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const [s1, s2, s3] = rootSums(roots);
    const a = lead;
    const variants = [
      [a, a * s1, a * s2, a * s3],
      [p[0], p[1], p[2], -p[3]],
      ...(a === 1 ? [[p[0], p[1], -p[2], p[3]]] : [[a, -s1, s2, -s3]]),
      [p[0], -p[1], -p[2], p[3]],
    ];
    return choiceSlide(
      [
        say(
          `A cubic with leading coefficient $${a}$ has roots with $\\Sigma\\alpha = ${s1}$, $\\Sigma\\alpha\\beta = ${s2}$ and $\\alpha\\beta\\gamma = ${s3}$. Which cubic is it?`,
        ),
      ],
      options({ tex: polyTex(p) }, ...variants.map((v) => ({ tex: polyTex(v) }))).slice(0, 4),
    );
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [s1, s2, s3] = rootSums(roots);
    return [
      { text: 'A monic cubic is $x^{3} - (\\Sigma\\alpha)x^{2} + (\\Sigma\\alpha\\beta)x - \\alpha\\beta\\gamma$:' },
      { tex: chain(`&x^{3} - (${s1})x^{2} + (${s2})x - (${s3})`, `=\\;&${polyTex(fromRoots(roots))}`) },
      ...(lead === 1 ? [] : [{ text: `Times $${lead}$:` }, { tex: polyTex(p) }]),
    ];
  },
};

/* ---------- lesson 4: a missing root ---------- */

/** The cubic as TeX with one coefficient replaced by a letter: 2x^3 + kx^2 - 22x + 24. */
function withLetters(p: Poly, letters: (string | undefined)[]): string {
  const terms = [termTex(p[0], 3)];
  for (let k = 1; k <= 3; k += 1) {
    const letter = letters[k - 1];
    const power = 3 - k;
    if (letter) terms.push(`+ ${letter}${power === 0 ? '' : power === 1 ? 'x' : `x^{${power}}`}`);
    else if (p[k] !== 0) terms.push(signedTerm(p[k], power));
  }
  return terms.join(' ');
}

interface ThirdRootParams extends RootsLeadParams {
  /** Difficulty 2: the x^2 coefficient is unknown, so the sum of the roots is no use. */
  unknown: boolean;
}

/** Two roots given; the third from Σα, or from αβγ when b is unknown. */
const polyThirdRoot: Generator<ThirdRootParams> = {
  id: 'poly-third-root',
  sample: (rng, difficulty) => ({
    ...sampleCubicRoots(rng, difficulty > 1 ? 5 : 4, difficulty > 1, 120, (p) => p[2] !== 0),
    unknown: difficulty > 1,
  }),
  render: ({ roots, lead, unknown }): Slide => {
    const p = fromRoots(roots, lead);
    return {
      kind: 'expression',
      prompt: [
        say(`Two of the roots of $f(x) = 0$ are $${roots[0]}$ and $${roots[1]}$. Find the third root, $\\gamma$.`),
        show(`f(x) = ${unknown ? withLetters(p, ['k']) : polyTex(p)}`),
      ],
      lead: '\\gamma =',
      keypad: [],
      answer: String(roots[2]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ roots, lead, unknown }) => {
    const p = fromRoots(roots, lead);
    const [r1, r2, r3] = roots;
    const [s1, , s3] = rootSums(roots);
    return unknown
      ? [
          { text: '$k$ is unknown, so the sum of the roots cannot help. The product can:' },
          { tex: `\\alpha\\beta\\gamma = ${overLead(p[3], p[0], true)} = ${s3}` },
          { tex: `${r1} \\times ${factor(String(r2))} \\times \\gamma = ${s3}` },
          { text: `So $\\gamma = ${r3}$.` },
        ]
      : [
          { tex: `\\alpha + \\beta + \\gamma = ${overLead(p[1], p[0], true)} = ${s1}` },
          { tex: `${r1} ${signedNum(r2)} + \\gamma = ${s1}` },
          { text: `So $\\gamma = ${r3}$.` },
        ];
  },
};

interface WhichIdentityParams extends RootsLeadParams {
  /** The one coefficient given: 0 for b, 1 for c, 2 for d. */
  known: number;
}

const IDENTITY_LABELS = ['$\\Sigma\\alpha = -\\frac{b}{a}$', '$\\Sigma\\alpha\\beta = \\frac{c}{a}$', '$\\alpha\\beta\\gamma = -\\frac{d}{a}$'];
const COEFFICIENT_NAMES = ['$x^{2}$', '$x$', 'constant'];

/** Two coefficients unknown, so only one identity finds the third root: which, then what. */
const polyWhichIdentityFlow: Generator<WhichIdentityParams> = {
  id: 'poly-which-identity-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleCubicRoots(rng, difficulty > 1 ? 5 : 4, difficulty > 1, 120);
      const known = rng.int(0, 2);
      const [r1, r2] = params.roots;
      const p = fromRoots(params.roots, params.lead);
      if (p[known + 1] === 0 || (known === 1 && r1 + r2 === 0)) continue;
      return { ...params, known };
    }
  },
  render: ({ roots, lead, known }): Slide => {
    const p = fromRoots(roots, lead);
    const [r1, r2, gamma] = roots;
    // Two letters in order: the first unknown is p, the second q.
    const unknowns = [0, 1, 2].filter((k) => k !== known);
    const named = [0, 1, 2].map((k) => (k === known ? undefined : unknowns[0] === k ? 'p' : 'q'));
    const subject = `f(x) = ${withLetters(p, named)}`;
    // The known identity worked with its sign the wrong way round.
    const slips: number[] = [];
    if (known === 0) slips.push(p[1] / p[0] - r1 - r2);
    if (known === 1) slips.push((-p[2] / p[0] - r1 * r2) / (r1 + r2));
    if (known === 2) slips.push(p[3] / (p[0] * r1 * r2));
    const values = [gamma, -gamma, ...slips, gamma + 1].filter(
      (v, i, all) => Number.isInteger(v) && all.indexOf(v) === i,
    ).slice(0, 3);
    return {
      kind: 'flow',
      prompt: [
        say(`Two of the roots of $f(x) = 0$ are $${r1}$ and $${r2}$, and two coefficients are unknown. Each answer chooses what gets asked next.`),
      ],
      subject,
      steps: [
        {
          id: 'which',
          ask: 'Which identity gives the third root, $\\gamma$?',
          branches: IDENTITY_LABELS.map((label, k) =>
            k === known
              ? { label, to: 'value' }
              : { label, outcome: `That needs the ${COEFFICIENT_NAMES[k]} coefficient, which is unknown here.` },
          ),
        },
        {
          id: 'value',
          ask: 'So what is $\\gamma$?',
          branches: turned(
            values.map((v) =>
              v === gamma
                ? { label: `$${v}$`, outcome: `$\\gamma = ${v}$, and all three roots are known.` }
                : { label: `$${v}$`, outcome: `Put $\\gamma = ${v}$ back into the identity: the two sides do not agree.` },
            ),
            `${subject}|value`,
          ),
        },
      ],
      answer: [IDENTITY_LABELS[known], `$${gamma}$`],
    };
  },
  solution: ({ roots, lead, known }) => {
    const p = fromRoots(roots, lead);
    const [r1, r2, gamma] = roots;
    const [s1, s2, s3] = rootSums(roots);
    const f = (n: number) => factor(String(n));
    const value = [s1, s2, s3][known];
    const working = [
      `${r1} ${signedNum(r2)} + \\gamma &= ${s1}`,
      `${r1} \\times ${f(r2)} + \\gamma(${r1} ${signedNum(r2)}) &= ${s2}`,
      `${r1} \\times ${f(r2)} \\times \\gamma &= ${s3}`,
    ][known];
    return [
      { text: `Only the ${COEFFICIENT_NAMES[known]} coefficient is known, so use ${IDENTITY_LABELS[known]}.` },
      { tex: `${SIGMA_LABELS[known]} = ${overLead(p[known + 1], p[0], known !== 1)} = ${value}` },
      { tex: working.replace('&', '') },
      { text: `So $\\gamma = ${gamma}$.` },
    ];
  },
};

/** Roots in arithmetic progression, α - d, α, α + d: 3α from the sum, then d from the product. */
interface ApParams {
  m: number;
  t: number;
  lead: number;
}

const apRoots = ({ m, t }: ApParams): number[] => [m - t, m, m + t];

const polyApRootsTree: Generator<ApParams> = {
  id: 'poly-ap-roots-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const m = nonZero(rng, 4);
      const t = rng.int(1, 3);
      const lead = difficulty > 1 ? rng.pick([2, -2, 3, -3]) : rng.pick([1, 1, -1, 2]);
      const params = { m, t, lead };
      const roots = apRoots(params);
      if (roots.some((r) => r === 0 || Math.abs(r) > 5)) continue;
      if (!fits(fromRoots(roots, lead), 120)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { m, t, lead } = params;
    const p = fromRoots(apRoots(params), lead);
    const product = m * (m * m - t * t);
    const values = [3 * m, product, m, m * m - t * t, t * t, t];
    return {
      kind: 'tree',
      prompt: [
        say(
          'The roots of this cubic are $\\alpha - d$, $\\alpha$ and $\\alpha + d$, with $d > 0$. Top row: their sum, which is $3\\alpha$, then their product. Next $\\alpha$, then $\\alpha^{2} - d^{2}$, which is the product divided by $\\alpha$. Last $d^{2}$, and $d$.',
        ),
      ],
      expression: polyTex(p),
      nodes: [
        { id: 'sum', from: [] },
        { id: 'prod', from: [] },
        { id: 'mid', from: ['sum'] },
        { id: 'pair', from: ['prod', 'mid'] },
        { id: 'dd', from: ['mid', 'pair'] },
        { id: 'd', from: ['dd'] },
      ],
      bank: numberBank(values, [-3 * m, -product, -m, m * m + t * t, 2 * t], String, 2),
      answer: values.map(String),
    };
  },
  solution: (params) => {
    const { m, t, lead } = params;
    const p = fromRoots(apRoots(params), lead);
    const product = m * (m * m - t * t);
    return [
      { text: 'The $d$s cancel in the sum:' },
      { tex: chain('&(\\alpha - d) + \\alpha + (\\alpha + d)', `=\\;&3\\alpha = ${overLead(p[1], p[0], true)} = ${3 * m}`) },
      { text: `So $\\alpha = ${m}$. The product is $\\alpha(\\alpha^{2} - d^{2}) = ${overLead(p[3], p[0], true)} = ${product}$:` },
      { tex: chain(`${factor(String(m))}(${factor(String(m))}^{2} - d^{2}) &= ${product}`, `${m * m} - d^{2} &= ${m * m - t * t}`, `d^{2} &= ${t * t}`) },
      { text: `So $d = ${t}$ and the roots are $${m - t}$, $${m}$ and $${m + t}$.` },
    ];
  },
};

/** An unknown x^2 coefficient: the third root from the product, then k from the sum. */
const polyMissingCoeffSteps: Generator<RootsLeadParams> = {
  id: 'poly-missing-coeff-steps',
  sample: (rng, difficulty) => sampleCubicRoots(rng, difficulty > 1 ? 5 : 4, difficulty > 1, 120, (p) => p[2] !== 0),
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const [r1, r2, gamma] = roots;
    const [s1] = rootSums(roots);
    const f = (n: number) => factor(String(n));
    const denominator = `${lead === 1 ? '' : `${f(lead)} \\times `}${f(r1)} \\times ${f(r2)}`;
    const start = [`k = ${coefMark(-lead)}(`, String(r1), '+', f(r2), '+', `\\frac{${-p[3]}}{${denominator}}`, ')'];
    const unscaled = -p[3] / (r1 * r2);
    return {
      kind: 'steps',
      prompt: [
        say(
          `Two of the roots of $f(x) = ${withLetters(p, ['k'])} = 0$ are $${r1}$ and $${r2}$. The line below finds $k$: the third root $\\gamma$ from $\\alpha\\beta\\gamma = ${overLead(p[3], p[0], true)}$, then $k$ from $\\alpha + \\beta + \\gamma = ${lead === 1 ? '-k' : lead === -1 ? 'k' : `-\\frac{k}{${lead}}`}$. Tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      start,
      reductions: [
        {
          span: [5, 6],
          value: f(gamma),
          bank: stepBank(f(gamma), f(-gamma), f(gamma + 1), ...(Number.isInteger(unscaled) && unscaled !== gamma ? [f(unscaled)] : [])),
        },
        {
          span: [1, 6],
          operator: 2,
          value: String(s1),
          bank: stepBank(String(s1), String(-s1), String(r1 + r2 - gamma), String(s1 + 2)),
        },
        {
          span: [0, 3],
          value: `k = ${p[1]}`,
          bank: stepBank(`k = ${p[1]}`, `k = ${-p[1]}`, `k = ${p[1] + lead}`, `k = ${lead === 1 ? p[1] - 1 : -s1}`),
        },
      ],
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [r1, r2, gamma] = roots;
    const [s1] = rootSums(roots);
    return [
      { tex: `\\alpha\\beta\\gamma = ${overLead(p[3], p[0], true)} = ${rootSums(roots)[2]}` },
      { tex: `${r1} \\times ${factor(String(r2))} \\times \\gamma = ${rootSums(roots)[2]}` },
      { text: `So $\\gamma = ${gamma}$, and the sum of the roots is $${r1} ${signedNum(r2)} ${signedNum(gamma)} = ${s1}$.` },
      { tex: `${lead === 1 ? '-k' : lead === -1 ? 'k' : `-\\frac{k}{${lead}}`} = ${s1}` },
      { text: `So $k = ${p[1]}$.` },
    ];
  },
};

/* ---------- lesson 5: symmetric functions ---------- */

interface SymParams extends RootsLeadParams {
  cubic: boolean;
}

/** A quadratic at difficulty 1, a cubic at difficulty 2. */
function sampleSym(rng: Rng, difficulty: number, ok: (sums: number[]) => boolean = () => true): SymParams {
  if (difficulty > 1) {
    return { ...sampleCubicRoots(rng, 4, true, 120, (_, sums) => ok(sums)), cubic: true };
  }
  return { ...sampleQuadratic(rng, 1, (_, sums) => ok(sums)), cubic: false };
}

function symRootsText(cubic: boolean): string {
  return cubic ? THREE_ROOTS : '$\\alpha$ and $\\beta$';
}

const squaresLabel = (cubic: boolean) =>
  cubic ? '\\alpha^{2} + \\beta^{2} + \\gamma^{2}' : '\\alpha^{2} + \\beta^{2}';
const reciprocalLabel = (cubic: boolean) =>
  cubic ? '\\frac{1}{\\alpha} + \\frac{1}{\\beta} + \\frac{1}{\\gamma}' : '\\frac{1}{\\alpha} + \\frac{1}{\\beta}';

/** The sum of the squares of the roots, (Σα)² - 2Σαβ. */
const polySumSquares: Generator<SymParams> = {
  id: 'poly-sum-squares',
  sample: (rng, difficulty) => sampleSym(rng, difficulty),
  choices: ({ roots }) => {
    const [s, e] = rootSums(roots);
    return intOptions(s * s - 2 * e, [s * s + 2 * e, s * s, s * s - e, 2 * e - s * s], 0);
  },
  render: ({ roots, lead, cubic }): Slide => {
    const p = fromRoots(roots, lead);
    const [s, e] = rootSums(roots);
    return {
      kind: 'expression',
      prompt: [say(`${symRootsText(cubic)} are the roots of $${polyTex(p)} = 0$. Find $${squaresLabel(cubic)}$ without solving.`)],
      lead: `${squaresLabel(cubic)} =`,
      keypad: [],
      answer: String(s * s - 2 * e),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ roots, lead, cubic }) => {
    const p = fromRoots(roots, lead);
    const [s, e] = rootSums(roots);
    const sum = cubic ? '\\Sigma\\alpha' : '(\\alpha + \\beta)';
    const pairs = cubic ? '\\Sigma\\alpha\\beta' : '\\alpha\\beta';
    return [
      { text: `Squaring the sum gives every square once and every pair product twice, so` },
      { tex: `${cubic ? '\\Sigma\\alpha^{2}' : squaresLabel(false)} = ${cubic ? '(\\Sigma\\alpha)' : sum}^{2} - 2${pairs}` },
      { text: `From the coefficients, $${cubic ? '\\Sigma\\alpha' : '\\alpha + \\beta'} = ${overLead(p[1], p[0], true)} = ${s}$ and $${pairs} = ${overLead(p[2], p[0], false)} = ${e}$.` },
      { tex: chain(`&(${s})^{2} - 2(${e})`, `=\\;&${s * s - 2 * e}`) },
    ];
  },
};

/** The sum of the reciprocals of the roots, Σαβ / αβγ (or (α + β) / αβ). */
const polyReciprocalSum: Generator<SymParams> = {
  id: 'poly-reciprocal-sum',
  sample: (rng, difficulty) => sampleSym(rng, difficulty),
  choices: ({ roots, cubic }) => {
    const sums = rootSums(roots);
    const n = cubic ? sums[1] : sums[0];
    const d = cubic ? sums[2] : sums[1];
    const slips: [number, number][] = [[-n, d], [cubic ? sums[0] : n + d, d], [1, d]];
    if (n !== 0) slips.unshift([d, n]);
    return options(
      { tex: fracTex(n, d), answer: fracAnswer(n, d) },
      ...slips.filter(([a, b]) => a * d !== b * n).map(([a, b]) => ({ tex: fracTex(a, b), answer: fracAnswer(a, b) })),
    ).slice(0, 4);
  },
  render: ({ roots, lead, cubic }): Slide => {
    const p = fromRoots(roots, lead);
    const sums = rootSums(roots);
    const n = cubic ? sums[1] : sums[0];
    const d = cubic ? sums[2] : sums[1];
    return {
      kind: 'expression',
      prompt: [
        say(`${symRootsText(cubic)} are the roots of $${polyTex(p)} = 0$. Find $${reciprocalLabel(cubic)}$ without solving, as a fraction if it is not whole.`),
      ],
      lead: `${reciprocalLabel(cubic)} =`,
      keypad: [{ insert: '/' }],
      answer: fracAnswer(n, d),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ roots, lead, cubic }) => {
    const p = fromRoots(roots, lead);
    const sums = rootSums(roots);
    return cubic
      ? [
          { text: 'Over a common denominator, $\\alpha\\beta\\gamma$:' },
          { tex: chain('\\Sigma\\frac{1}{\\alpha} &= \\frac{\\beta\\gamma + \\gamma\\alpha + \\alpha\\beta}{\\alpha\\beta\\gamma}', '&= \\frac{\\Sigma\\alpha\\beta}{\\alpha\\beta\\gamma}') },
          { text: `$\\Sigma\\alpha\\beta = ${overLead(p[2], p[0], false)} = ${sums[1]}$ and $\\alpha\\beta\\gamma = ${overLead(p[3], p[0], true)} = ${sums[2]}$.` },
          { tex: `\\frac{${sums[1]}}{${sums[2]}} = ${fracTex(sums[1], sums[2])}` },
        ]
      : [
          { text: 'Over a common denominator, $\\alpha\\beta$:' },
          { tex: `${reciprocalLabel(false)} = \\frac{\\alpha + \\beta}{\\alpha\\beta}` },
          { text: `$\\alpha + \\beta = ${overLead(p[1], p[0], true)} = ${sums[0]}$ and $\\alpha\\beta = ${overLead(p[2], p[0], false)} = ${sums[1]}$.` },
          { tex: `\\frac{${sums[0]}}{${sums[1]}} = ${fracTex(sums[0], sums[1])}` },
        ];
  },
};

/** The identity for the sum of squares, its pieces placed as numbers. */
const polySquareIdentityTiles: Generator<SymParams> = {
  id: 'poly-square-identity-tiles',
  sample: (rng, difficulty) => sampleSym(rng, difficulty),
  render: ({ roots, lead, cubic }): Slide => {
    const p = fromRoots(roots, lead);
    const [s, e] = rootSums(roots);
    const values = [s, e, s * s - 2 * e];
    return {
      kind: 'tiles',
      prompt: [
        say(
          `${symRootsText(cubic)} are the roots of $${polyTex(p)} = 0$. Fill in ${cubic ? '$\\Sigma\\alpha$, then $\\Sigma\\alpha\\beta$' : '$\\alpha + \\beta$, then $\\alpha\\beta$'}, then the answer.`,
        ),
      ],
      template: cubic ? '\\Sigma\\alpha^2 = ({0})^2 - 2({1}) = {2}' : '\\alpha^2 + \\beta^2 = ({0})^2 - 2({1}) = {2}',
      bank: numberBank(values, [-s, -e, s * s + 2 * e, s * s, p[1], p[2]]),
      answer: values.map(String),
    };
  },
  solution: ({ roots, lead, cubic }) => {
    const p = fromRoots(roots, lead);
    const [s, e] = rootSums(roots);
    return [
      { text: `From the coefficients, the sum is $${overLead(p[1], p[0], true)} = ${s}$ and the ${cubic ? 'sum of pair products' : 'product'} is $${overLead(p[2], p[0], false)} = ${e}$.` },
      { tex: chain(`${cubic ? '\\Sigma\\alpha^{2}' : squaresLabel(false)} &= (${s})^{2} - 2(${e})`, `&= ${s * s - 2 * e}`) },
    ];
  },
};

/** From a cubic's coefficients: the three sums, then Σα² and Σ1/α from them. */
const polySymmetricTree: Generator<RootsLeadParams> = {
  id: 'poly-symmetric-tree',
  sample: (rng, difficulty) => sampleCubicRoots(rng, difficulty > 1 ? 5 : 4, difficulty > 1, 100),
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const [s1, s2, s3] = rootSums(roots);
    const answer = [s1, s2, s3, s1 * s1].map(String).concat([fracTex(s2, s3), String(s1 * s1 - 2 * s2)]);
    const slips = [
      String(-s1),
      String(-s2),
      String(-s3),
      String(s1 * s1 + 2 * s2),
      fracTex(-s2, s3),
      ...(s2 === 0 ? [fracTex(s1, s3)] : [fracTex(s3, s2)]),
      String(s1 * s1 - s2),
    ];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${THREE_ROOTS} are the roots of this cubic. Top row: $\\Sigma\\alpha$, $\\Sigma\\alpha\\beta$ and $\\alpha\\beta\\gamma$. Next $(\\Sigma\\alpha)^{2}$ and $\\Sigma\\frac{1}{\\alpha} = \\frac{\\Sigma\\alpha\\beta}{\\alpha\\beta\\gamma}$. Last $\\Sigma\\alpha^{2} = (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta$.`,
        ),
      ],
      expression: `${polyTex(p)} = 0`,
      nodes: [
        { id: 's1', from: [] },
        { id: 's2', from: [] },
        { id: 's3', from: [] },
        { id: 'sq', from: ['s1'] },
        { id: 'rec', from: ['s2', 's3'] },
        { id: 'ss', from: ['sq', 's2'] },
      ],
      bank: fillBank(answer, slips),
      answer,
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [s1, s2, s3] = rootSums(roots);
    return [
      { tex: chain(...[0, 1, 2].map((k) => cubicIdentityStep(p, k).replace(' = ', ' &= '))) },
      { tex: `\\Sigma\\frac{1}{\\alpha} = \\frac{${s2}}{${s3}} = ${fracTex(s2, s3)}` },
      { tex: `\\Sigma\\alpha^{2} = (${s1})^{2} - 2(${s2}) = ${s1 * s1 - 2 * s2}` },
    ];
  },
};

/** Σ1/α as a division of two coefficient ratios, worked one piece at a time. */
const polyRecipDivideSteps: Generator<SymParams> = {
  id: 'poly-recip-divide-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1) {
        const params = sampleSym(rng, 2, ([, s2]) => s2 !== 0);
        return params;
      }
      const roots = sampleRoots(rng, 2, 5);
      const lead = rng.pick([2, -2, 3, -3]);
      const [s] = rootSums(roots);
      if (s === 0 || !fits(fromRoots(roots, lead), 60)) continue;
      return { roots, lead, cubic: false };
    }
  },
  render: ({ roots, lead, cubic }): Slide => {
    const p = fromRoots(roots, lead);
    const sums = rootSums(roots);
    const [n, d] = cubic ? [sums[1], sums[2]] : [sums[0], sums[1]];
    const [top, bottom] = cubic
      ? [`\\frac{${p[2]}}{${p[0]}}`, `(-\\frac{${p[3]}}{${p[0]}})`]
      : [`-\\frac{${p[1]}}{${p[0]}}`, `\\frac{${p[2]}}{${p[0]}}`];
    const [rawTop, rawBottom] = cubic ? [p[2], p[3]] : [p[1], p[2]];
    return {
      kind: 'steps',
      prompt: [
        say(
          `${symRootsText(cubic)} are the roots of $${polyTex(p)} = 0$. The line below is $${reciprocalLabel(cubic)} = \\frac{${cubic ? '\\Sigma\\alpha\\beta' : '\\alpha + \\beta'}}{${cubic ? '\\alpha\\beta\\gamma' : '\\alpha\\beta'}}$ from the coefficients. Tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      start: [top, '\\div', bottom],
      reductions: [
        { span: [0, 1], value: String(n), bank: stepBank(String(n), String(-n), String(rawTop), String(n + 1)) },
        {
          span: [2, 3],
          value: productNum(d),
          bank: stepBank(productNum(d), productNum(-d), productNum(rawBottom), productNum(d + 1)),
        },
        {
          span: [0, 3],
          operator: 1,
          value: fracTex(n, d),
          bank: stepBank(fracTex(n, d), fracTex(d, n), fracTex(-n, d), String(n * d)),
        },
      ],
    };
  },
  solution: ({ roots, lead, cubic }) => {
    const p = fromRoots(roots, lead);
    const sums = rootSums(roots);
    const [n, d] = cubic ? [sums[1], sums[2]] : [sums[0], sums[1]];
    return [
      { tex: `${reciprocalLabel(cubic)} = \\frac{${cubic ? '\\Sigma\\alpha\\beta' : '\\alpha + \\beta'}}{${cubic ? '\\alpha\\beta\\gamma' : '\\alpha\\beta'}}` },
      cubic
        ? { text: `$\\Sigma\\alpha\\beta = ${overLead(p[2], p[0], false)} = ${n}$ and $\\alpha\\beta\\gamma = ${overLead(p[3], p[0], true)} = ${d}$.` }
        : { text: `$\\alpha + \\beta = ${overLead(p[1], p[0], true)} = ${n}$ and $\\alpha\\beta = ${overLead(p[2], p[0], false)} = ${d}$.` },
      { tex: `${n} \\div ${productNum(d)} = ${fracTex(n, d)}` },
    ];
  },
};

/* ================================================================
 * Level 5: quartics and repeated factors
 *
 * Dividing by a quadratic factor, two factors found at once, a factor that
 * divides more than once, a quartic that is a quadratic in x^2, and a quartic
 * solved from scratch. Every quartic is still built outward — a divisor times
 * a quotient plus a remainder, or small whole roots times a quadratic — so
 * every quotient, remainder and root is whole by construction.
 * ================================================================ */

/**
 * A polynomial for a display, broken after its third term when it has five.
 * A display scrolls sideways rather than wrapping, and a quartic with all five
 * terms runs past a phone screen: the constant was hidden off the edge.
 */
function longTex(lhs: string, terms: string[], rhs = ''): string {
  const whole = `${lhs ? `${lhs} = ` : ''}${terms.join(' ')}${rhs}`;
  if (texWidth(whole) <= FITS || terms.length < 3) return whole;
  const cut = terms.length >= 5 ? 3 : 2;
  return chain(`${lhs ? `${lhs} ` : ''}&${lhs ? '= ' : ''}${terms.slice(0, cut).join(' ')}`, `&\\quad ${terms.slice(cut).join(' ')}${rhs}`);
}

/**
 * A product of brackets for a display, split over two lines when it is too
 * wide: p(x) = (x - 2)(x + 2) on the first, times (x - 4)(x + 4) on the next.
 */
function productDisplay(lhs: string, product: string): string {
  const whole = `${lhs} = ${product}`;
  if (texWidth(whole) <= FITS) return whole;
  const parts = bracketParts(product);
  if (!parts) return whole;
  const half = Math.ceil(parts.length / 2);
  return chain(`${lhs} &= ${parts.slice(0, half).join('')}`, `&\\quad \\times ${parts.slice(half).join('')}`);
}

/**
 * Top-level brackets, each with any power after it; a leading number or minus
 * stays with the first. Undefined when there are fewer than two, or anything
 * trails the last.
 */
function bracketParts(product: string): string[] | undefined {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < product.length; i += 1) {
    current += product[i];
    if (product[i] === '(') depth += 1;
    if (product[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        const power = /^\^\{\d+\}/.exec(product.slice(i + 1));
        if (power) {
          current += power[0];
          i += power[0].length;
        }
        parts.push(current);
        current = '';
      }
    }
  }
  return current || parts.length < 2 ? undefined : parts;
}

/**
 * Roughly how wide a line of TeX renders, in characters: an operator counts
 * nearly two for the space around it and an exponent just over half. A
 * display on a 393 px screen holds about FITS before it scrolls sideways.
 */
function texWidth(tex: string): number {
  let width = 0;
  const bare = tex
    .replace(/\^\{([^}]*)\}/g, (_, power: string) => {
      width += 0.6 * power.length;
      return '';
    })
    .replace(/\\[a-z]+/g, '')
    .replace(/[{}&\s]/g, '');
  for (const ch of bare) width += /[+\-=]/.test(ch) ? 1.8 : 1;
  return width;
}

const FITS = 21;

/** p(x) = ..., broken as longTex does. */
const pDisplay = (p: Poly, lhs = 'p(x)'): string => longTex(lhs, termTiles(p));

/** ... = 0, broken as longTex does. */
const equationDisplay = (p: Poly): string => longTex('', termTiles(p), ' = 0');

/** A polynomial for a tiles template, which splits on {0}: x^2 rather than x^{2}. */
const templateTex = (p: Poly): string => polyTex(p).replace(/\^\{(\d)\}/g, '^$1');

/** A remainder rx + s as tiles that follow another term, zeros left out. */
function remainderTiles([r, s]: Poly): string[] {
  return [...(r === 0 ? [] : [signedTerm(r, 1)]), ...(s === 0 ? [] : [signedNum(s)])];
}

/** The two leading terms left after a step of long division, the second shown even when 0. */
function leadingPair(a: number, b: number, k: number): string {
  return `${termTex(a, k)} ${placeTerm(b, k - 1)}`;
}

/** A multiple of a bracket in a line of working: (x^2 + 1), 3x(x^2 + 1), (-2)(x^2 + 1). */
function timesBracket(c: number, k: number, bracket: string): string {
  const m = termTex(c, k);
  return `${m === '1' ? '' : factor(m)}(${bracket})`;
}

/** The right polynomial, then slips that read differently from it and from each other, `count` in all. */
function distinctPolys(right: Poly, slips: Poly[], count: number): Poly[] {
  const out = [right];
  for (const slip of slips) {
    if (out.length === count) break;
    if (out.some((seen) => polyTex(seen) === polyTex(slip))) continue;
    out.push(slip);
  }
  return out;
}

/** A letter with its coefficient, as a term of an equation: 8k, - q, + 3p. */
function letterTerm(c: number, name: string, first: boolean): string {
  if (first) return `${coefMark(c)}${name}`;
  return c < 0 ? `- ${coefMark(-c)}${name}` : `+ ${coefMark(c)}${name}`;
}

/* ---------- lesson 1: dividing by a quadratic ---------- */

interface QuadDivideParams {
  /** The divisor x^2 + bx + c, as [1, b, c]. */
  d: Poly;
  q: Poly;
  /** The remainder rx + s, as [r, s]. */
  rem: Poly;
}

const quadDividend = ({ d, q, rem }: QuadDivideParams): Poly => addPoly(mulPoly(d, q), rem);

/**
 * A divisor, a quotient of degree `top` led by `lead`, and a remainder that is
 * there never, sometimes or always. Every coefficient of the dividend is kept
 * non-zero so that no place goes missing from a line of working.
 */
function sampleQuadDivide(
  rng: Rng,
  top: number,
  remainder: 'never' | 'sometimes' | 'always',
  lead = 1,
  limit = 40,
): QuadDivideParams {
  for (;;) {
    const d = [1, nonZero(rng, 4), nonZero(rng, 6)];
    const q = [lead, ...Array.from({ length: top }, () => nonZero(rng, 4))];
    const none = remainder === 'never' || (remainder === 'sometimes' && rng.chance(0.3));
    const rem = none ? [0, 0] : [rng.int(-5, 5), nonZero(rng, 9)];
    const p = quadDividend({ d, q, rem });
    if (p.length !== top + 3 || p.some((c) => c === 0) || !fits(p, limit)) continue;
    return { d, q, rem };
  }
}

/**
 * Long division by a quadratic as a line that shrinks. Each step takes away a
 * multiple of the divisor, which clears the first term and changes the two
 * after it; the first step takes three pieces of the line and each later one
 * takes the two-term piece it left plus the next term down. What is left when
 * no x^2 can be cleared is the remainder.
 */
const polyLongQuadSteps: Generator<QuadDivideParams> = {
  id: 'poly-long-quad-steps',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleQuadDivide(rng, 2, 'always') : sampleQuadDivide(rng, 1, 'sometimes')),
  render: (params): Slide => {
    const { d } = params;
    const p = quadDividend(params);
    const n = degreeOf(p);
    const { quotient, stages } = longDivision(p, d);
    const divisor = polyTex(d);
    const reductions = stages.map((stage, i) => {
      const before = i === 0 ? p : stages[i - 1];
      const m = quotient[i];
      const last = i === stages.length - 1;
      const piece = (a: number, b: number): string | undefined =>
        last ? polyTex([a, b]) : a === 0 ? undefined : leadingPair(a, b, n - i - 1);
      const value = piece(stage[0], stage[1])!;
      const slips = [
        piece(before[1] + m * d[1], before[2] + m * d[2]),
        piece(before[1] - m * d[1], before[2]),
        piece(before[1] - m * d[1], before[2] + m * d[2]),
        piece(before[1] + m * d[1], before[2] - m * d[2]),
      ].filter((slip): slip is string => slip !== undefined);
      return { span: [0, i === 0 ? 3 : 2] as [number, number], value, bank: stepBank(value, ...slips) };
    });
    return {
      kind: 'steps',
      prompt: [
        say(
          `Divide by $(${divisor})$. Each step takes away enough of $(${divisor})$ to clear the first term, which changes the two terms after it. When what is left has no $x^{2}$ term, that is the remainder. Tap the part you would do **next**, then choose what it leaves.`,
        ),
      ],
      start: p.map((c, i) => (i === 0 ? termTex(c, n) : placeTerm(c, n - i))),
      reductions,
    };
  },
  solution: (params) => {
    const { d, rem } = params;
    const p = quadDividend(params);
    const n = degreeOf(p);
    const { quotient, stages } = longDivision(p, d);
    const divisor = polyTex(d);
    return [
      { text: `Clear the first term each time by taking away the right multiple of $(${divisor})$:` },
      // One step to a line, as prose: a step written out in full is wider than a phone.
      ...stages.map((stage, i) => {
        const before = i === 0 ? p : stages[i - 1];
        const k = n - i;
        const three = `${termTex(before[0], k)} ${placeTerm(before[1], k - 1)} ${placeTerm(before[2], k - 2)}`;
        const left = i === stages.length - 1 ? polyTex(stage) : leadingPair(stage[0], stage[1], k - 1);
        return { text: `$${three} - ${timesBracket(quotient[i], k - 2, divisor)} = ${left}$` };
      }),
      { text: `What was taken away is the quotient, $${polyTex(quotient)}$, and the remainder is $${polyTex(rem)}$.` },
    ];
  },
};

/**
 * The same division by comparing coefficients, worked from the top down: the
 * x^4 terms give the quotient's first coefficient, and each power after that
 * gives the next, until the last two are the remainder.
 */
const polyQuadQuotientTree: Generator<QuadDivideParams> = {
  id: 'poly-quad-quotient-tree',
  sample: (rng, difficulty) =>
    difficulty > 1 ? sampleQuadDivide(rng, 2, 'always', rng.pick([2, 3, -2]), 60) : sampleQuadDivide(rng, 2, 'sometimes'),
  render: (params): Slide => {
    const { d, q, rem } = params;
    const p = quadDividend(params);
    const [, b, c] = d;
    const answer = [...q, ...rem];
    const slips = [
      p[1] + b * q[0],
      -q[1],
      p[2] - b * q[1] + c * q[0],
      p[2] - c * q[0],
      -q[2],
      p[3],
      p[4],
      -rem[0],
      -rem[1],
      p[4] + c * q[2],
    ];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Divide $p(x)$ by $(${polyTex(d)})$ by comparing coefficients in $p(x) = (${polyTex(d)})(ax^{2} + bx + c) + rx + s$. Work down from the top: $a$ from the $x^{4}$ terms, then $b$ from the $x^{3}$ terms and $c$ from the $x^{2}$ terms. The bottom row is the remainder, $r$ and then $s$.`,
        ),
      ],
      expression: pDisplay(p),
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: ['a'] },
        { id: 'c', from: ['a', 'b'] },
        { id: 'r', from: ['b', 'c'] },
        { id: 's', from: ['c'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { d, q, rem } = params;
    const p = quadDividend(params);
    const [, b, c] = d;
    const [qa, qb, qc] = q;
    const [r, s] = rem;
    const times = (x: number, y: number) => `${productNum(x)} \\times ${productNum(y)}`;
    return [
      { text: `Multiply out $(${polyTex(d)})(ax^{2} + bx + c)$ and match each power with $p(x)$, from the top:` },
      { text: `$x^{4}$: $a = ${qa}$.` },
      { text: `$x^{3}$: $b + ${times(b, qa)} = ${p[1]}$, so $b = ${qb}$.` },
      { text: `$x^{2}$: $c + ${times(b, qb)} + ${times(c, qa)} = ${p[2]}$, so $c = ${qc}$.` },
      { text: `$x$: $r + ${times(b, qc)} + ${times(c, qb)} = ${p[3]}$, so $r = ${r}$.` },
      { text: `Constant: $s + ${times(c, qc)} = ${p[4]}$, so $s = ${s}$.` },
      { text: `The quotient is $${polyTex(q)}$ and the remainder is $${polyTex(rem)}$.` },
    ];
  },
};

/** The quotient, and the remainder when there is one, placed into p(x) = divisor × quotient + remainder. */
const polyQuadQuotientTiles: Generator<QuadDivideParams> = {
  id: 'poly-quad-quotient-tiles',
  sample: (rng, difficulty) =>
    difficulty > 1 ? sampleQuadDivide(rng, 2, 'always', rng.int(1, 2), 60) : sampleQuadDivide(rng, 1, 'sometimes'),
  render: (params): Slide => {
    const { d, q, rem } = params;
    const p = quadDividend(params);
    const quotient = termTiles(q);
    const remainder = remainderTiles(rem);
    const answer = [...quotient, ...remainder];
    const inner = quotient.map((_, i) => `{${i}}`).join(' ');
    const tail = remainder.map((_, i) => `{${quotient.length + i}}`).join(' ');
    // The same division with the divisor's middle sign the wrong way round.
    const wrong = divideByPoly(p, [1, -d[1], d[2]]);
    return {
      kind: 'tiles',
      prompt: [
        say(`Divide $p(x)$ by $(${polyTex(d)})$. Fill in the quotient${remainder.length > 0 ? ' and the remainder' : ''}.`),
        show(pDisplay(p)),
      ],
      template: `(${templateTex(d)})(${inner})${tail ? ` ${tail}` : ''}`,
      bank: fillBank(answer, [
        ...termTiles(wrong.quotient).slice(1),
        ...q.slice(1).map((c, i) => signedTerm(-c, q.length - 2 - i)),
        ...(fits(wrong.remainder, 30) ? remainderTiles(wrong.remainder) : []),
        ...remainderTiles(rem.map((c) => -c)),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { d, q, rem } = params;
    const p = quadDividend(params);
    const exact = rem.every((c) => c === 0);
    const last = q[q.length - 1];
    return [
      {
        text: `Divide by $(${polyTex(d)})$, clearing the first term at each step. The quotient is $${polyTex(q)}$${exact ? ' and nothing is left over' : ` and the remainder is $${polyTex(rem)}$`}.`,
      },
      { text: `$p(x) = (${polyTex(d)})(${polyTex(q)})${exact ? '' : ` ${signedPolyTex(rem)}`}$` },
      {
        text: `Check the ends: $x^{2} \\times ${termTex(q[0], q.length - 1)} = ${termTex(p[0], p.length - 1)}$, and $${productNum(d[2])} \\times ${productNum(last)}${rem[1] === 0 ? '' : ` ${signedNum(rem[1])}`} = ${p[p.length - 1]}$.`,
      },
    ];
  },
};

interface QuadRemainderParams extends QuadDivideParams {
  /** 0 asks for r, 1 for s. */
  ask: number;
}

/** r or s in the remainder rx + s on dividing by a quadratic. */
const polyQuadRemainder: Generator<QuadRemainderParams> = {
  id: 'poly-quad-remainder',
  sample: (rng, difficulty) => {
    for (;;) {
      const base =
        difficulty > 1 ? sampleQuadDivide(rng, 2, 'always', rng.int(1, 2), 60) : sampleQuadDivide(rng, 1, 'always');
      if (base.rem[0] === 0) continue;
      return { ...base, ask: rng.int(0, 1) };
    }
  },
  choices: (params) => {
    const { d, rem, ask } = params;
    const p = quadDividend(params);
    const wrong = divideByPoly(p, [1, -d[1], d[2]]).remainder;
    // The sign slip on the divisor can run to hundreds, which nobody would pick.
    const slip = Math.abs(wrong[ask]) <= 30 ? [wrong[ask]] : [];
    return intOptions(rem[ask], [-rem[ask], ...slip, rem[1 - ask], p[p.length - 2 + ask]]);
  },
  render: (params): Slide => {
    const { d, rem, ask } = params;
    const p = quadDividend(params);
    const letter = ask === 0 ? 'r' : 's';
    return {
      kind: 'expression',
      prompt: [
        say(`When $p(x)$ is divided by $(${polyTex(d)})$, the remainder is $rx + s$. Find $${letter}$.`),
        show(pDisplay(p)),
      ],
      lead: `${letter} =`,
      keypad: [],
      answer: String(rem[ask]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { d, q, rem } = params;
    return [
      { text: `Divide by $(${polyTex(d)})$ until what is left has no $x^{2}$ term. The quotient is $${polyTex(q)}$, and what is left is the remainder:` },
      { text: `$p(x) = (${polyTex(d)})(${polyTex(q)}) ${signedPolyTex(rem)}$` },
      { text: `So $r = ${rem[0]}$ and $s = ${rem[1]}$.` },
    ];
  },
};

/* ---------- lesson 2: two factors at once ---------- */

interface PairParams {
  /** Two known roots, so (x - a)(x - b) is a factor. */
  a: number;
  b: number;
  /** The other factor, [lead, e, f]. */
  g: Poly;
}

const pairFactor = ({ a, b }: PairParams): Poly => fromRoots([a, b]);
const pairPoly = (params: PairParams): Poly => mulPoly(pairFactor(params), params.g);

/**
 * Two roots, and a second quadratic factor led by `lead` whose other two
 * coefficients are never 0. With a lead of 1 it splits over the whole numbers
 * half the time, and never splits by accident the other half.
 */
function samplePair(rng: Rng, hard: boolean, lead: number, limit: number): PairParams {
  for (;;) {
    const [a, b] = sampleRoots(rng, 2, hard ? 4 : 3);
    const splits = rng.chance(0.5);
    const g = splits
      ? fromRoots(sampleRoots(rng, 2, hard ? 5 : 4, true), lead)
      : [lead, nonZero(rng, hard ? 7 : 5), nonZero(rng, hard ? 12 : 7)];
    if (g[1] === 0 || g[2] === 0) continue;
    if (!splits && lead === 1 && quadraticRoots(g[1], g[2]) !== undefined) continue;
    if (!fits(pairPoly({ a, b, g }), limit)) continue;
    return { a, b, g };
  }
}

/** Why a quadratic offered as the factor is not one: it is not zero at one of the roots. */
function missOutcome(f: Poly, roots: number[]): string {
  const at = roots.find((r) => valueAt(f, r) !== 0) ?? roots[0];
  return `It is $${valueAt(f, at)}$ at $x = ${at}$, not $0$, and the factor has to be zero at both roots.`;
}

/**
 * Two roots at once: their brackets multiply to a quadratic factor, dividing
 * by it leaves another quadratic, and that may or may not split.
 */
const polyPairFlow: Generator<PairParams> = {
  id: 'poly-pair-flow',
  sample: (rng, difficulty) => samplePair(rng, difficulty > 1, 1, difficulty > 1 ? 90 : 50),
  render: (params): Slide => {
    const { a, b, g } = params;
    const p = pairPoly(params);
    const k = pairFactor(params);
    const key = polyTex(p);
    const split = quadraticRoots(g[1], g[2]);

    const factors = distinctPolys(k, [fromRoots([-a, -b]), [1, -(a + b), -a * b], [1, a + b, -a * b]], 3);
    const quotients = distinctPolys(g, [divideByPoly(p, fromRoots([-a, -b])).quotient, [1, -g[1], g[2]], [1, g[1], -g[2]]], 3);

    // Candidate full factorisations, as root lists.
    const pairs: [number, number][] = split
      ? [split, [-split[0], -split[1]], [-split[0], split[1]], [split[0], -split[1]]]
      : [
          ...divisors(g[2]).flatMap((dv) => [
            [-dv, -g[2] / dv] as [number, number],
            [dv, g[2] / dv] as [number, number],
          ]),
          [1, 1] as [number, number],
          [-1, -1] as [number, number],
        ];
    const forms: number[][] = [];
    const seen = new Set<string>();
    for (const [s, t] of pairs) {
      const roots = [a, b, s, t].sort((x, y) => x - y);
      const id = roots.join(',');
      if (seen.has(id) || forms.length === 3) continue;
      seen.add(id);
      forms.push(roots);
    }
    const right = split ? groupedTex([a, b, ...split].sort((x, y) => x - y)) : '';

    return {
      kind: 'flow',
      prompt: [say('Factorise $p(x)$ as far as it goes. Each answer chooses what gets asked next.')],
      subject: `p(x) = ${polyTex(p)}`,
      steps: [
        {
          id: 'factor',
          ask: `$p(${a}) = 0$ and $p(${b}) = 0$. Which quadratic must be a factor of $p(x)$?`,
          branches: turned(
            factors.map((f, i) =>
              i === 0 ? { label: `$${polyTex(f)}$`, to: 'quotient' } : { label: `$${polyTex(f)}$`, outcome: missOutcome(f, [a, b]) },
            ),
            key,
          ),
        },
        {
          id: 'quotient',
          ask: `Dividing $p(x)$ by $${polyTex(k)}$ leaves which quadratic?`,
          branches: turned(
            quotients.map((quad, i) =>
              i === 0
                ? { label: `$${polyTex(quad)}$`, to: 'split' }
                : {
                    label: `$${polyTex(quad)}$`,
                    outcome: `Multiplying back, $(${polyTex(k)})(${polyTex(quad)})$ is $${polyTex(mulPoly(k, quad))}$, not $p(x)$.`,
                  },
            ),
            `${key}|quotient`,
          ),
        },
        {
          id: 'split',
          ask: `Does $${polyTex(g)}$ factorise into brackets with whole numbers?`,
          branches: [
            { label: 'Yes', to: 'form' },
            { label: 'No', outcome: `Then $p(x) = (${polyTex(k)})(${polyTex(g)})$ is as far as it goes.` },
          ],
        },
        {
          id: 'form',
          ask: 'Which is $p(x)$ fully factorised?',
          branches: turned(
            forms.map((roots) => ({
              label: `$${groupedTex(roots)}$`,
              outcome: `That multiplies out to $${polyTex(fromRoots(roots))}$.`,
            })),
            `${key}|form`,
          ),
        },
      ],
      answer: split
        ? [`$${polyTex(k)}$`, `$${polyTex(g)}$`, 'Yes', `$${right}$`]
        : [`$${polyTex(k)}$`, `$${polyTex(g)}$`, 'No'],
    };
  },
  solution: (params) => {
    const { a, b, g } = params;
    const k = pairFactor(params);
    const split = quadraticRoots(g[1], g[2]);
    return [
      { text: `$(${linTex(a)})$ and $(${linTex(b)})$ are both factors, so their product is too: $(${linTex(a)})(${linTex(b)}) = ${polyTex(k)}$.` },
      { text: `Dividing $p(x)$ by $${polyTex(k)}$ leaves $${polyTex(g)}$.` },
      split
        ? {
            text: `That splits too, $${polyTex(g)} = ${groupedTex(split)}$, so $p(x) = ${groupedTex([a, b, ...split].sort((x, y) => x - y))}$.`,
          }
        : {
            text: `Two whole numbers would have to multiply to $${g[2]}$ and add to $${g[1]}$, and none do, so $p(x) = (${polyTex(k)})(${polyTex(g)})$ is as far as it goes.`,
          },
    ];
  },
};

/**
 * Two roots known: the quadratic factor they give, then the other quadratic
 * factor by comparing the x^3 terms and the constants.
 */
const polyTwoRootsTree: Generator<PairParams> = {
  id: 'poly-two-roots-tree',
  sample: (rng, difficulty) =>
    difficulty > 1 ? samplePair(rng, true, rng.pick([2, 3, -1, -2]), 90) : samplePair(rng, false, 1, 60),
  render: (params): Slide => {
    const { a, b, g } = params;
    const p = pairPoly(params);
    const [, m, n] = pairFactor(params);
    const [lead, e, f] = g;
    const answer = [m, n, e, f];
    return {
      kind: 'tree',
      prompt: [
        say(
          `$x = ${a}$ and $x = ${b}$ are roots of $p(x)$, so $p(x) = (x^{2} + mx + n)(${termTex(lead, 2)} + ex + f)$. Top row: $m$ and $n$, from the two roots. Underneath: $e$ from the $x^{3}$ terms and $f$ from the constant terms.`,
        ),
      ],
      expression: pDisplay(p),
      nodes: [
        { id: 'm', from: [] },
        { id: 'n', from: [] },
        { id: 'e', from: ['m'] },
        { id: 'f', from: ['n'] },
      ],
      bank: numberBank(answer, [a + b, -n, p[1], p[1] + m * lead, -e, -f, p[4], p[4] + n]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { a, b, g } = params;
    const p = pairPoly(params);
    const k = pairFactor(params);
    const [, m, n] = k;
    const [lead, e, f] = g;
    return [
      { text: `$(${linTex(a)})(${linTex(b)}) = ${polyTex(k)}$, so $m = ${m}$ and $n = ${n}$.` },
      { text: `$x^{3}$ terms: $e + ${productNum(m)} \\times ${productNum(lead)} = ${p[1]}$, so $e = ${e}$.` },
      { text: `Constant terms: $${productNum(n)} \\times f = ${p[4]}$, so $f = ${f}$.` },
      { tex: productDisplay('p(x)', `(${polyTex(k)})(${polyTex(g)})`) },
    ];
  },
};

interface OtherFactorParams extends PairParams {
  /** Difficulty 2: the known factor is built from the two roots as well. */
  build: boolean;
}

/** The other quadratic factor as tiles; at difficulty 2 the known one too, from its roots. */
const polyOtherFactorTiles: Generator<OtherFactorParams> = {
  id: 'poly-other-factor-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const params = hard ? samplePair(rng, true, rng.int(1, 2), 90) : samplePair(rng, false, 1, 60);
      if (hard && params.a + params.b === 0) continue;
      return { ...params, build: hard };
    }
  },
  render: (params): Slide => {
    const { a, b, g, build } = params;
    const p = pairPoly(params);
    const k = pairFactor(params);
    const other = termTiles(g);
    const wrong = divideByPoly(p, fromRoots([-a, -b])).quotient;
    const slips = [...termTiles(wrong).slice(1), signedTerm(-g[1], 1), signedTerm(-g[2], 0), signedTerm(g[2], 1)];
    if (!build) {
      return {
        kind: 'tiles',
        prompt: [say(`$(${polyTex(k)})$ is a factor of $p(x)$. Fill in the other factor.`), show(pDisplay(p))],
        template: `(${templateTex(k)})({0} {1} {2})`,
        bank: fillBank(other, slips),
        answer: other,
      };
    }
    const answer = [signedTerm(k[1], 1), signedNum(k[2]), ...other];
    return {
      kind: 'tiles',
      prompt: [
        say(`$p(${a}) = 0$ and $p(${b}) = 0$. Write $p(x)$ as a product of two quadratics.`),
        show(pDisplay(p)),
      ],
      template: '(x^2 {0} {1})({2} {3} {4})',
      bank: fillBank(answer, [...slips, signedTerm(-k[1], 1), signedNum(-k[2])]),
      answer,
    };
  },
  solution: (params) => {
    const { a, b, g, build } = params;
    const p = pairPoly(params);
    const k = pairFactor(params);
    return [
      ...(build ? [{ text: `$p(${a}) = 0$ and $p(${b}) = 0$, so $(${linTex(a)})(${linTex(b)}) = ${polyTex(k)}$ is a factor.` }] : []),
      {
        text: `The other factor's first term times $x^{2}$ makes $${termTex(p[0], 4)}$, and its last term times $${productNum(k[2])}$ makes $${p[4]}$. Dividing $p(x)$ by $${polyTex(k)}$ fills in the middle:`,
      },
      { tex: productDisplay('p(x)', `(${polyTex(k)})(${polyTex(g)})`) },
    ];
  },
};

interface PairUnknownParams extends PairParams {
  /** Which coefficients are letters, as indices into the quartic: one (k) or two (p, q). */
  at: number[];
  /** Which letter is asked for. */
  ask: number;
}

const letterNames = (at: number[]): string[] => (at.length === 1 ? ['k'] : ['p', 'q']);

/** A polynomial's terms as TeX with some coefficients replaced by letters: x^4, + kx^3, - 7x^2, ... */
function letteredTerms(p: Poly, letters: (string | undefined)[]): string[] {
  const n = degreeOf(p);
  const terms: string[] = [];
  p.forEach((c, i) => {
    const k = n - i;
    const letter = letters[i];
    if (letter) terms.push(`${terms.length === 0 ? '' : '+ '}${letter}${k === 0 ? '' : k === 1 ? 'x' : `x^{${k}}`}`);
    else if (c !== 0) terms.push(signedTerm(c, k, terms.length === 0));
  });
  return terms;
}

/** The lettered coefficients that make p zero at each root, found from the roots alone. */
function solveLetters(p: Poly, at: number[], roots: number[]): number[] {
  const n = degreeOf(p);
  const known = p.map((c, i) => (at.includes(i) ? 0 : c));
  const row = (x: number) => [...at.map((i) => x ** (n - i)), -valueAt(known, x)];
  if (at.length === 1) {
    const [m, rhs] = row(roots[0]);
    return [rhs / m];
  }
  const [a1, b1, c1] = row(roots[0]);
  const [a2, b2, c2] = row(roots[1]);
  const det = a1 * b2 - a2 * b1;
  return [(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det];
}

/**
 * A coefficient fixed by the two roots. One letter needs one root; two
 * letters need both, as a pair of simultaneous equations.
 */
const polyPairUnknown: Generator<PairUnknownParams> = {
  id: 'poly-pair-unknown',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1) {
        const base = samplePair(rng, true, 1, 90);
        // |a| = |b| makes the two equations the same equation.
        if (Math.abs(base.a) === Math.abs(base.b)) continue;
        const p = pairPoly(base);
        if (p[1] === 0 || p[3] === 0) continue;
        return { ...base, at: [1, 3], ask: rng.int(0, 1) };
      }
      const base = samplePair(rng, false, 1, 60);
      const at = [rng.int(1, 3)];
      if (pairPoly(base)[at[0]] === 0) continue;
      return { ...base, at, ask: 0 };
    }
  },
  choices: (params) => {
    const { a, b, at, ask } = params;
    const p = pairPoly(params);
    const value = p[at[ask]];
    const flipped = solveLetters(p, at, [-a, -b])[ask];
    return intOptions(value, [-value, flipped, ...(at.length > 1 ? [p[at[1 - ask]]] : []), p[at[ask] + 1]]);
  },
  render: (params): Slide => {
    const { a, b, at, ask } = params;
    const p = pairPoly(params);
    const names = letterNames(at);
    const letters = p.map((_, i) => (at.includes(i) ? names[at.indexOf(i)] : undefined));
    return {
      kind: 'expression',
      prompt: [
        say(`$(${linTex(a)})$ and $(${linTex(b)})$ are both factors of $f(x)$. Find $${names[ask]}$.`),
        show(longTex('f(x)', letteredTerms(p, letters))),
      ],
      lead: `${names[ask]} =`,
      keypad: [],
      answer: String(p[at[ask]]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, b, at } = params;
    const p = pairPoly(params);
    const n = degreeOf(p);
    const names = letterNames(at);
    const known = p.map((c, i) => (at.includes(i) ? 0 : c));
    const equation = (x: number) =>
      `${at.map((i, j) => letterTerm(x ** (n - i), names[j], j === 0)).join(' ')} ${signedNum(valueAt(known, x))} = 0`;
    if (at.length === 1) {
      return [
        { text: `$(${linTex(a)})$ is a factor, so $f(${a}) = 0$. With the known terms added up:` },
        { tex: equation(a) },
        { text: `So $k = ${p[at[0]]}$. $f(${b}) = 0$ as well, which is a check.` },
      ];
    }
    return [
      { text: `Both are factors, so $f(${a}) = 0$ and $f(${b}) = 0$. With the known terms added up:` },
      { tex: chain(equation(a), equation(b)) },
      { text: `Solving them together gives $p = ${p[at[0]]}$ and $q = ${p[at[1]]}$.` },
    ];
  },
};

/* ---------- lesson 3: repeated factors ---------- */

interface TwiceParams {
  a: number;
  lead: number;
  /** What is left of p(x) once (x - a) is taken out, monic. */
  q: Poly;
}

const twicePoly = ({ a, lead, q }: TwiceParams): Poly => mulPoly([lead, -lead * a], q);

/** A cubic with (x - a) as a factor, repeated half the time and single the other half. */
function sampleTwice(rng: Rng, difficulty: number): TwiceParams {
  const hard = difficulty > 1;
  for (;;) {
    const a = nonZero(rng, 3);
    const repeated = rng.chance(0.5);
    let q: Poly;
    if (hard) q = repeated ? fromRoots([a, nonZero(rng, 5)]) : [1, nonZero(rng, 6), nonZero(rng, 9)];
    else q = repeated ? fromRoots([a, nonZero(rng, 4)]) : fromRoots(sampleRoots(rng, 2, 4, true));
    if (!repeated && valueAt(q, a) === 0) continue;
    const lead = hard ? rng.pick([1, -1, 2]) : 1;
    if (!fits(twicePoly({ a, lead, q }), 60)) continue;
    return { a, lead, q };
  }
}

/**
 * Synthetic division by (x - a), then the quotient divided by (x - a) again.
 * Two zero remainders make (x - a)^2 a factor.
 */
const polyTwiceTree: Generator<TwiceParams> = {
  id: 'poly-twice-tree',
  sample: sampleTwice,
  render: (params): Slide => {
    const { a } = params;
    const p = twicePoly(params);
    const first = divideBy(p, a);
    const [c2, c1, c0] = first.quotient;
    const e1 = c2 * a + c1;
    const r2 = e1 * a + c0;
    const answer = [c2, c1, c0, e1, first.remainder, r2];
    const wrong = divideBy(p, -a);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Is $(${linTex(a)})^{2}$ a factor of $p(x)$? Divide by $(${linTex(a)})$ with synthetic division, then divide the quotient by $(${linTex(a)})$ again. Down the left: the first division, ending in its remainder. On the right: the second division's middle number, then its remainder.`,
        ),
        show(`\\begin{array}{r|rrrr} ${a} & ${p.join(' & ')} \\end{array}`),
      ],
      expression: pDisplay(p),
      nodes: [
        { id: 'c2', from: [] },
        { id: 'c1', from: ['c2'] },
        { id: 'c0', from: ['c1'] },
        { id: 'e1', from: ['c2', 'c1'] },
        { id: 'r1', from: ['c0'] },
        { id: 'r2', from: ['c0', 'e1'] },
      ],
      bank: numberBank(
        answer,
        [...wrong.quotient.slice(1), wrong.remainder, -e1, -r2, p[1], p[2], e1 + c0].filter((v) => Math.abs(v) <= 30),
      ),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { a } = params;
    const p = twicePoly(params);
    const first = divideBy(p, a);
    const [c2, c1, c0] = first.quotient;
    const e1 = c2 * a + c1;
    const r2 = e1 * a + c0;
    const step = (x: number, y: number, z: number) => `${factor(String(x))} \\times ${factor(String(a))} + ${factor(String(y))} &= ${z}`;
    return [
      { text: `First division: bring down $${c2}$, then multiply by $${a}$ and add the next coefficient each time.` },
      { tex: chain(step(c2, p[1], c1), step(c1, p[2], c0), step(c0, p[3], first.remainder)) },
      { text: `The remainder is $0$, so the quotient is $${polyTex(first.quotient)}$. Divide that by $(${linTex(a)})$ again:` },
      { tex: chain(step(c2, c1, e1), step(e1, c0, r2)) },
      {
        text:
          r2 === 0
            ? `Both remainders are $0$: $(${linTex(a)})$ divides $p(x)$, then divides the quotient too, so $(${linTex(a)})^{2}$ is a factor.`
            : `The second remainder is $${r2}$, not $0$: $(${linTex(a)})$ is a factor only once, so $(${linTex(a)})^{2}$ is not.`,
      },
    ];
  },
};

interface RepeatFlowParams {
  /** The value tested. */
  a: number;
  /** p(x) is the monic polynomial with these roots. */
  roots: number[];
}

/** Factor, repeated factor, or neither: test p(a), and when it is 0, test the quotient at a. */
const polyRepeatFlow: Generator<RepeatFlowParams> = {
  id: 'poly-repeat-flow',
  sample: (rng, difficulty) => {
    const count = difficulty > 1 ? 4 : 3;
    for (;;) {
      const a = nonZero(rng, 3);
      const times = rng.int(0, 2);
      const others = sampleRoots(rng, count - times, 4, difficulty > 1);
      if (others.includes(a)) continue;
      const roots = [...Array<number>(times).fill(a), ...others];
      if (!fits(fromRoots(roots), 80)) continue;
      return { a, roots };
    }
  },
  render: ({ a, roots }): Slide => {
    const p = fromRoots(roots);
    const v = valueAt(p, a);
    const q = divideBy(p, a).quotient;
    const w = valueAt(q, a);
    const key = `${polyTex(p)}|${a}`;
    const lin = `(${linTex(a)})`;
    return {
      kind: 'flow',
      prompt: [say(`Is $${lin}$ a factor of $p(x)$, and if it is, is it repeated? Each answer chooses what gets asked next.`)],
      subject: `p(x) = ${polyTex(p)}`,
      steps: [
        {
          id: 'value',
          ask: `What is $p(${a})$?`,
          branches: turned(
            [v, ...valueSlips(p, a, 2, v !== 0)].map((n, i) =>
              i === 0
                ? { label: `$${n}$`, to: 'verdict' }
                : { label: `$${n}$`, outcome: `Put $x = ${a}$ into every term again: $p(${a})$ is not $${n}$.` },
            ),
            key,
          ),
        },
        {
          id: 'verdict',
          ask: `So is $${lin}$ a factor of $p(x)$?`,
          branches: [
            v === 0 ? { label: 'Yes', to: 'again' } : { label: 'Yes', outcome: `A factor needs $p(${a}) = 0$.` },
            {
              label: 'No',
              outcome:
                v === 0
                  ? `$p(${a}) = 0$ is exactly what makes $${lin}$ a factor.`
                  : `Right: it is not a factor at all, so it cannot be a repeated one.`,
            },
          ],
        },
        {
          id: 'again',
          ask: `Dividing $p(x)$ by $${lin}$ leaves $q(x) = ${polyTex(q)}$. What is $q(${a})$?`,
          branches: turned(
            [w, ...valueSlips(q, a, 2, w !== 0)].map((n, i) =>
              i === 0
                ? { label: `$${n}$`, to: 'twice' }
                : { label: `$${n}$`, outcome: `Put $x = ${a}$ into every term of $q(x)$ again: it is not $${n}$.` },
            ),
            `${key}|again`,
          ),
        },
        {
          id: 'twice',
          ask: `So how many times does $${lin}$ divide $p(x)$?`,
          branches: [
            {
              label: 'Once only',
              outcome: w === 0 ? `$q(${a}) = 0$ means it divides the quotient as well.` : `Right: it divides $p(x)$ but not $q(x)$.`,
            },
            {
              label: 'At least twice',
              outcome: w === 0 ? `Right: $${lin}^{2}$ is a factor.` : `It would have to divide $q(x)$ too, which needs $q(${a}) = 0$.`,
            },
          ],
        },
      ],
      answer: v !== 0 ? [`$${v}$`, 'No'] : ['$0$', 'Yes', `$${w}$`, w === 0 ? 'At least twice' : 'Once only'],
    };
  },
  solution: ({ a, roots }) => {
    const p = fromRoots(roots);
    const v = valueAt(p, a);
    const lin = `(${linTex(a)})`;
    if (v !== 0) {
      return [
        { tex: substitutedTex(p, a, v) },
        { text: `$p(${a})$ is not $0$, so $${lin}$ is not a factor at all.` },
      ];
    }
    const q = divideBy(p, a).quotient;
    const w = valueAt(q, a);
    return [
      { text: `$p(${a}) = 0$, so $${lin}$ is a factor. Dividing leaves $q(x) = ${polyTex(q)}$.` },
      { tex: substitutedTex(q, a, w, 'q') },
      {
        text:
          w === 0
            ? `$q(${a}) = 0$ too, so $${lin}$ divides the quotient again: $${lin}^{2}$ is a factor of $p(x)$.`
            : `$q(${a})$ is not $0$, so $${lin}$ divides $p(x)$ once only.`,
      },
    ];
  },
};

interface MultiplicityParams {
  a: number;
  /** p(x) is lead times the polynomial with these roots. */
  roots: number[];
  lead: number;
}

/** How many times (x - a) divides p(x): 1 or 2 in a cubic, up to 3 in a quartic. */
const polyMultiplicity: Generator<MultiplicityParams> = {
  id: 'poly-multiplicity',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const count = hard ? 4 : 3;
    for (;;) {
      const a = nonZero(rng, 3);
      const times = rng.int(1, hard ? 3 : 2);
      const others = sampleRoots(rng, count - times, 4, hard);
      if (others.includes(a)) continue;
      const roots = [...Array<number>(times).fill(a), ...others];
      const lead = hard ? rng.pick([1, -1, 2]) : 1;
      if (!fits(fromRoots(roots, lead), 90)) continue;
      return { a, roots, lead };
    }
  },
  choices: ({ a, roots }) => intOptions(roots.filter((r) => r === a).length, [1, 2, 3, 4], 1),
  render: ({ a, roots, lead }): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `$p(${a}) = 0$, so $(${linTex(a)})$ is a factor of $p(x)$. $(${linTex(a)})^{n}$ is the highest power of it that divides $p(x)$. Find $n$.`,
      ),
      show(pDisplay(fromRoots(roots, lead))),
    ],
    lead: 'n =',
    keypad: [],
    answer: String(roots.filter((r) => r === a).length),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, roots, lead }) => {
    const lin = `(${linTex(a)})`;
    const lines: SolutionStep[] = [{ text: `Keep dividing by $${lin}$ until the remainder is not $0$:` }];
    let current = fromRoots(roots, lead);
    let times = 0;
    for (;;) {
      const { quotient, remainder } = divideBy(current, a);
      if (remainder !== 0) {
        lines.push({ text: `Dividing $${polyTex(current)}$ by $${lin}$ leaves remainder $${remainder}$, so it stops there.` });
        break;
      }
      times += 1;
      lines.push({ text: `Division ${times}: remainder $0$, quotient $${polyTex(quotient)}$.` });
      current = quotient;
    }
    lines.push({ text: `$${lin}$ divides $p(x)$ ${times === 1 ? 'once' : times === 2 ? 'twice' : `${times} times`}, so $n = ${times}$.` });
    return lines;
  },
};

interface RepeatStepsParams {
  a: number;
  /** The rest of p(x): p(x) = (x - a)^2 g(x), with g(a) not 0. */
  g: Poly;
}

/**
 * From one division to the repeated factor: the quotient left by dividing by
 * (x - a) has a as a root again, so it splits off another (x - a), and the
 * two gather into a square.
 */
const polyRepeatFactorSteps: Generator<RepeatStepsParams> = {
  id: 'poly-repeat-factor-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const a = nonZero(rng, 4);
      const g = difficulty > 1 ? [1, nonZero(rng, 5), nonZero(rng, 7)] : [1, -nonZero(rng, 5)];
      if (valueAt(g, a) === 0) continue;
      if (!fits(mulPoly(fromRoots([a, a]), g), 90)) continue;
      return { a, g };
    }
  },
  render: ({ a, g }): Slide => {
    const p = mulPoly(fromRoots([a, a]), g);
    const q1 = mulPoly([1, -a], g);
    const lin = `(${linTex(a)})`;
    const rest = `(${polyTex(g)})`;
    const once = `${lin}${rest}`;
    const twice = `${lin}^{2}${rest}`;
    const flipLast = [...g.slice(0, -1), -g[g.length - 1]];
    const flipAll = [g[0], ...g.slice(1).map((c) => -c)];
    const other = `(${polyTex(divideBy(q1, -a).quotient)})`;
    return {
      kind: 'steps',
      prompt: [
        say(
          `$p(${a}) = 0$, so dividing by $${lin}$ gives the line below. Factorise what is left, then gather the factors. Tap the part you would do **next**, then choose what it becomes.`,
        ),
        show(pDisplay(p)),
      ],
      start: [lin, `(${polyTex(q1)})`],
      reductions: [
        {
          span: [1, 2],
          value: once,
          bank: stepBank(once, `(${linTex(-a)})${other}`, `${lin}(${polyTex(flipLast)})`, `${lin}(${polyTex(flipAll)})`),
        },
        {
          span: [0, 2],
          value: twice,
          bank: stepBank(twice, once, `${lin}^{3}`, `${lin}^{2}(${polyTex(flipLast)})`, `(${linTex(-a)})^{2}${rest}`),
        },
      ],
    };
  },
  solution: ({ a, g }) => {
    const q1 = mulPoly([1, -a], g);
    const lin = `(${linTex(a)})`;
    return [
      { text: `The quotient $q(x) = ${polyTex(q1)}$ is zero at $x = ${a}$ as well:` },
      { tex: substitutedTex(q1, a, 0, 'q') },
      { text: `So divide it by $${lin}$ again: $${polyTex(q1)} = ${lin}(${polyTex(g)})$.` },
      { tex: productDisplay('p(x)', `${lin}^{2}(${polyTex(g)})`) },
      { text: `$${polyTex(g)}$ is not zero at $x = ${a}$, so $${lin}$ is repeated exactly twice.` },
    ];
  },
};

/* ---------- lesson 4: a quartic as a quadratic in x^2 ---------- */

interface InUParams {
  /** The two values of u = x^2, smaller first: p(x) = (x^2 - u1)(x^2 - u2). */
  u: number[];
}

const inUPoly = ({ u }: InUParams): Poly => [1, 0, -(u[0] + u[1]), 0, u[0] * u[1]];

/** A polynomial in u rather than x: u^2 - 5u + 4. */
const uTex = (p: Poly): string => polyTex(p).replace(/x/g, 'u');

const SQUARES = [1, 4, 9, 16, 25, 36];
const isSquare = (u: number): boolean => u > 0 && Number.isInteger(Math.sqrt(u));

/** x^2 - u as a factor: (x^{2} - 4), (x^{2} + 3). */
const uFactorTex = (u: number): string => `(x^{2} ${signedNum(-u)})`;

/** One factor x^2 - u taken as far as whole numbers go, as TeX pieces and polynomials. */
function uFactors(u: number): { tex: string; poly: Poly }[] {
  if (!isSquare(u)) return [{ tex: uFactorTex(u), poly: [1, 0, -u] }];
  const m = Math.sqrt(u);
  return [
    { tex: `(x - ${m})`, poly: [1, -m] },
    { tex: `(x + ${m})`, poly: [1, m] },
  ];
}

/** Two different non-zero values of u drawn from `pool`, smaller first, at least one a square when `square` says so. */
function sampleU(rng: Rng, pool: number[], square: boolean): number[] {
  for (;;) {
    const u = rng.sample(pool, 2).sort((x, y) => x - y);
    if (square && !u.some(isSquare)) continue;
    return u;
  }
}

/** What u = x^2 gives, one line per value of u. */
function uLine(u: number): string {
  if (isSquare(u)) return `$x^{2} = ${u}$ gives $x = \\pm ${Math.sqrt(u)}$.`;
  if (u > 0) return `$x^{2} = ${u}$ gives $x = \\pm\\sqrt{${u}}$, which are not whole.`;
  return `$x^{2} = ${u}$ has no real solution: a square is never negative.`;
}

interface BiquadParams extends InUParams {
  /** Difficulty 2: factorise all the way, as far as whole numbers allow. */
  full: boolean;
}

const NEGATIVES = [-1, -2, -3, -4, -5, -6, -7, -8, -9];
const NON_SQUARES = [2, 3, 5, 6, 7, 8];

/**
 * The quartic as two factors in x^2 at difficulty 1; at difficulty 2 as far
 * as it goes, where x^2 - 9 splits and x^2 + 4 or x^2 - 2 stays whole.
 */
const polyBiquadTiles: Generator<BiquadParams> = {
  id: 'poly-biquad-tiles',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const shape = rng.int(0, 2);
      const square = rng.pick(SQUARES.slice(0, 5));
      if (shape === 0) return { u: sampleU(rng, SQUARES.slice(0, 5), false), full: true };
      const other = rng.pick(shape === 1 ? NEGATIVES : NON_SQUARES);
      return { u: [square, other].sort((x, y) => x - y), full: true };
    }
    return { u: sampleU(rng, [...NEGATIVES.slice(0, 6), ...Array.from({ length: 9 }, (_, i) => i + 1)], false), full: false };
  },
  render: (params): Slide => {
    const { u, full } = params;
    const p = inUPoly(params);
    if (!full) {
      const answer = u.map((v) => signedNum(-v));
      return {
        kind: 'tiles',
        prompt: [
          say('Put $u = x^{2}$ and factorise as a quadratic in $u$, then put $x^{2}$ back. Fill in the two factors.'),
          show(pDisplay(p)),
        ],
        template: '(x^2 {0})(x^2 {1})',
        bank: fillBank(answer, [...u.map((v) => signedNum(v)), signedNum(-(u[0] + u[1])), signedNum(u[0] * u[1])]),
        answer,
        unordered: true,
      };
    }
    const answer = u.flatMap((v) => uFactors(v).map((f) => f.tex));
    const distractors = u.flatMap((v) =>
      isSquare(v) ? [uFactorTex(v), `(x - ${v})`, `(x^{2} ${signedNum(v)})`] : [uFactorTex(-v), `(x - ${Math.abs(v)})`, `(x + ${Math.abs(v)})`],
    );
    return {
      kind: 'tiles',
      prompt: [say('Factorise $p(x)$ fully, as far as whole numbers allow.'), show(pDisplay(p))],
      template: `p(x) = ${answer.map((_, i) => `{${i}}`).join(' ')}`,
      bank: fillBank(answer, distractors),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const { u, full } = params;
    const quad = [1, -(u[0] + u[1]), u[0] * u[1]];
    const lines: SolutionStep[] = [
      { text: `Put $u = x^{2}$: $${uTex(quad)} = (u ${signedNum(-u[0])})(u ${signedNum(-u[1])})$.` },
      { text: `Put $x^{2}$ back: $p(x) = ${uFactorTex(u[0])}${uFactorTex(u[1])}$.` },
    ];
    if (!full) return lines;
    for (const v of u) {
      lines.push({
        text: isSquare(v)
          ? `$x^{2} - ${v}$ is a difference of two squares: $(x - ${Math.sqrt(v)})(x + ${Math.sqrt(v)})$.`
          : v < 0
            ? `$x^{2} + ${-v}$ is never zero, so it has no factor $(x - a)$ and stays as it is.`
            : `$x^{2} - ${v}$ is zero at $x = \\pm\\sqrt{${v}}$, which are not whole, so it stays as it is.`,
      });
    }
    lines.push({ tex: productDisplay('p(x)', u.flatMap((v) => uFactors(v).map((f) => f.tex)).join('')) });
    return lines;
  },
};

/**
 * From u to x: the two values of u = x^2, then the real x each gives. A
 * negative u gives none, so the tree has fewer nodes.
 */
const polyInUTree: Generator<InUParams> = {
  id: 'poly-in-u-tree',
  sample: (rng, difficulty) => {
    const squares = SQUARES.slice(0, difficulty > 1 ? 5 : 4);
    if (rng.chance(difficulty > 1 ? 0.6 : 0.3)) return { u: sampleU(rng, squares, false) };
    return { u: [rng.pick(NEGATIVES), rng.pick(squares)] };
  },
  render: (params): Slide => {
    const { u } = params;
    const p = inUPoly(params);
    const answer = [...u];
    const nodes: { id: string; from: string[] }[] = [
      { id: 'u1', from: [] },
      { id: 'u2', from: [] },
    ];
    u.forEach((v, i) => {
      if (!isSquare(v)) return;
      const m = Math.sqrt(v);
      nodes.push({ id: `x${i}a`, from: [`u${i + 1}`] }, { id: `x${i}b`, from: [`u${i + 1}`] });
      answer.push(-m, m);
    });
    return {
      kind: 'tree',
      prompt: [
        say(
          'Solve the equation by putting $u = x^{2}$. Top row: the two values of $u$, smaller first. Underneath each, the real values of $x$ it gives, negative first. A negative $u$ gives none.',
        ),
      ],
      expression: equationDisplay(p),
      nodes,
      bank: numberBank(answer, [-u[0], -u[1], u[0] + u[1], -(u[0] + u[1]), ...u.filter(isSquare).map((v) => Math.sqrt(v) + 1)]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { u } = params;
    const quad = [1, -(u[0] + u[1]), u[0] * u[1]];
    return [
      { text: `With $u = x^{2}$ the equation is $${uTex(quad)} = 0$, which factorises as $(u ${signedNum(-u[0])})(u ${signedNum(-u[1])}) = 0$.` },
      { text: `So $u = ${u[0]}$ or $u = ${u[1]}$.` },
      ...u.map((v) => ({ text: uLine(v) })),
    ];
  },
};

interface CountUParams {
  /** p(x) = x^4 + bx^2 + c. */
  b: number;
  c: number;
}

/** The values of u = x^2 that solve u^2 + bu + c = 0, or undefined when there are none. */
function uRoots({ b, c }: CountUParams): number[] | undefined {
  const disc = b * b - 4 * c;
  if (disc < 0) return undefined;
  const root = Math.sqrt(disc);
  return [...new Set([(-b - root) / 2, (-b + root) / 2])];
}

function realCount(params: CountUParams): number {
  return (uRoots(params) ?? []).reduce((n, u) => n + (u > 0 ? 2 : u === 0 ? 1 : 0), 0);
}

/**
 * How many different real solutions a quartic in x^2 has: two for each
 * positive u, one for u = 0 and none for a negative u or no real u at all.
 */
const polyBiquadCount: Generator<CountUParams> = {
  id: 'poly-biquad-count',
  sample: (rng, difficulty) => {
    const pool = [...NEGATIVES, ...Array.from({ length: difficulty > 1 ? 16 : 9 }, (_, i) => i + 1)];
    if (difficulty > 1) {
      const kind = rng.int(0, 3);
      if (kind === 3) {
        for (;;) {
          const b = rng.int(-6, 6);
          const c = rng.int(1, 20);
          if (b * b < 4 * c) return { b, c };
        }
      }
      const u =
        kind === 0 ? [0, rng.pick(pool)] : kind === 1 ? Array<number>(2).fill(rng.pick(pool)) : rng.sample(pool, 2);
      return { b: -(u[0] + u[1]), c: u[0] * u[1] };
    }
    const u = rng.sample(pool, 2);
    return { b: -(u[0] + u[1]), c: u[0] * u[1] };
  },
  render: (params): Slide => {
    const { b, c } = params;
    return choiceSlide(
      [say('How many different real solutions does this equation have?'), show(`${polyTex([1, 0, b, 0, c])} = 0`)],
      intOptions(realCount(params), [4, 2, 0, 3, 1], 0),
    );
  },
  solution: (params) => {
    const { b, c } = params;
    const roots = uRoots(params);
    const count = realCount(params);
    const lines: SolutionStep[] = [{ text: `Put $u = x^{2}$: $${uTex([1, b, c])} = 0$.` }];
    if (!roots) {
      lines.push({ text: `$b^{2} - 4c = ${b * b - 4 * c}$ is negative, so there is no real $u$, and so no real $x$.` });
    } else {
      lines.push({ text: roots.length === 1 ? `That gives $u = ${roots[0]}$ only.` : `That gives $u = ${roots[0]}$ or $u = ${roots[1]}$.` });
      for (const u of roots) lines.push({ text: u === 0 ? '$x^{2} = 0$ gives $x = 0$ only.' : uLine(u) });
    }
    lines.push({ text: `That is $${count}$ different real solution${count === 1 ? '' : 's'}.` });
    return lines;
  },
};

/**
 * Factorising a quartic in x^2 fully: in u first, then x^2 back, then only
 * the factors that are differences of two squares go further.
 */
const polyBiquadFlow: Generator<InUParams> = {
  id: 'poly-biquad-flow',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { u: sampleU(rng, [...SQUARES.slice(0, 5), ...NEGATIVES, ...NON_SQUARES], rng.chance(0.8)) }
      : { u: sampleU(rng, [...SQUARES.slice(0, 4), ...NEGATIVES], true) },
  render: (params): Slide => {
    const { u } = params;
    const [u0, u1] = u;
    const p = inUPoly(params);
    const key = polyTex(p);
    const uForm = (a: number, b: number) => `$(u ${signedNum(-a)})(u ${signedNum(-b)})$`;
    const uForms = [
      { a: u0, b: u1 },
      { a: -u0, b: -u1 },
      { a: u0, b: -u1 },
      { a: -u0, b: u1 },
    ];
    const seenForms = new Set<string>();
    const uBranches = uForms
      .filter(({ a, b }) => {
        const label = uForm(a, b);
        if (seenForms.has(label) || seenForms.size === 3) return false;
        seenForms.add(label);
        return true;
      })
      .map(({ a, b }, i) =>
        i === 0
          ? { label: uForm(a, b), to: 'back' }
          : { label: uForm(a, b), outcome: `That multiplies out to $${uTex(fromRoots([a, b]))}$.` },
      );

    const splits = u.map(isSquare);
    const whichLabels = ['Both', `Only $${uFactorTex(u0)}$`, `Only $${uFactorTex(u1)}$`, 'Neither'];
    const right = splits[0] && splits[1] ? 0 : splits[0] ? 1 : splits[1] ? 2 : 3;
    const pieces = u.flatMap(uFactors);
    const full = pieces.map((f) => f.tex).join('');
    const rule =
      'Only a difference of two squares, $x^{2} - m^{2}$, splits into $(x - m)(x + m)$. Adding a number, or taking away one that is not a square, leaves nothing to split.';

    const forms: { tex: string; poly: Poly }[] = [
      { tex: full, poly: p },
      { tex: `${uFactorTex(u0)}${uFactorTex(u1)}`, poly: p },
      {
        tex: u.map((v) => (isSquare(v) ? `(x - ${Math.sqrt(v)})^{2}` : uFactorTex(v))).join(''),
        poly: u.reduce<Poly>((acc, v) => mulPoly(acc, isSquare(v) ? fromRoots([Math.sqrt(v), Math.sqrt(v)]) : [1, 0, -v]), [1]),
      },
      {
        tex: u.map((v) => `(x - ${Math.abs(v)})(x + ${Math.abs(v)})`).join(''),
        poly: u.reduce<Poly>((acc, v) => mulPoly(acc, [1, 0, -v * v]), [1]),
      },
    ];
    const seenFull = new Set<string>();
    const fullBranches = forms
      .filter((form) => {
        if (seenFull.has(form.tex)) return false;
        seenFull.add(form.tex);
        return true;
      })
      .map((form, i) => ({
        label: `$${form.tex}$`,
        outcome:
          i === 0
            ? 'Every factor left is either linear or has no whole-number roots.'
            : form.tex === forms[1].tex
              ? 'Not yet: a difference of two squares is still there to split.'
              : `That multiplies out to $${polyTex(form.poly)}$.`,
      }));

    return {
      kind: 'flow',
      prompt: [say('Factorise $p(x)$ fully. Each answer chooses what gets asked next.')],
      subject: `p(x) = ${polyTex(p)}`,
      steps: [
        {
          id: 'u',
          ask: `Put $u = x^{2}$. How does $${uTex([1, -(u0 + u1), u0 * u1])}$ factorise?`,
          branches: turned(uBranches, key),
        },
        {
          id: 'back',
          ask: `So $p(x) = ${uFactorTex(u0)}${uFactorTex(u1)}$. Which of these factorise further with whole numbers?`,
          branches: whichLabels.map((label, i) =>
            i !== right
              ? { label, outcome: rule }
              : right === 3
                ? { label, outcome: `Right: $p(x) = ${uFactorTex(u0)}${uFactorTex(u1)}$ is as far as it goes.` }
                : { label, to: 'full' },
          ),
        },
        ...(right === 3
          ? []
          : [
              {
                id: 'full',
                ask: 'Which is $p(x)$ fully factorised?',
                branches: turned(fullBranches, `${key}|full`),
              },
            ]),
      ],
      answer: right === 3 ? [uForm(u0, u1), whichLabels[3]] : [uForm(u0, u1), whichLabels[right], `$${full}$`],
    };
  },
  solution: (params) => {
    const { u } = params;
    const [u0, u1] = u;
    const lines: SolutionStep[] = [
      { text: `With $u = x^{2}$: $${uTex([1, -(u0 + u1), u0 * u1])} = (u ${signedNum(-u0)})(u ${signedNum(-u1)})$.` },
      { text: `Put $x^{2}$ back: $p(x) = ${uFactorTex(u0)}${uFactorTex(u1)}$.` },
    ];
    for (const v of u) {
      lines.push({
        text: isSquare(v)
          ? `$x^{2} - ${v}$ is a difference of two squares, $(x - ${Math.sqrt(v)})(x + ${Math.sqrt(v)})$.`
          : `$x^{2} ${signedNum(-v)}$ has no whole-number roots, so it stays.`,
      });
    }
    lines.push({ tex: productDisplay('p(x)', u.flatMap(uFactors).map((f) => f.tex).join('')) });
    return lines;
  },
};

/* ---------- lesson 5: solving a quartic ---------- */

interface QuarticParams {
  /** roots[0] is the one found first by trial, roots[1] the second. */
  roots: number[];
  lead: number;
}

const quarticPoly = ({ roots, lead }: QuarticParams): Poly => fromRoots(roots, lead);

/** Four small whole roots, distinct at difficulty 1, and a lead of 1 there. */
function sampleQuartic(rng: Rng, difficulty: number, limit = 80): QuarticParams {
  const hard = difficulty > 1;
  for (;;) {
    const roots = sampleRoots(rng, 4, hard ? 4 : 3, hard);
    const lead = hard ? rng.pick([1, 1, -1, 2]) : 1;
    if (!fits(fromRoots(roots, lead), limit)) continue;
    return { roots, lead };
  }
}

/** The distinct roots, smallest first, as "x = -2, 1, 3". */
const rootSetLabel = (roots: number[]): string =>
  `$x = ${[...new Set(roots)].sort((x, y) => x - y).join(',\\ ')}$`;

/** Working for a quartic solved from scratch: one root, divide, another, divide, the quadratic. */
function quarticSolution({ roots, lead }: QuarticParams, hint: boolean): SolutionStep[] {
  const p = fromRoots(roots, lead);
  const [r0, r1] = roots;
  const cubic = divideBy(p, r0).quotient;
  const quad = divideBy(cubic, r1).quotient;
  return [
    hint
      ? { text: `$x = ${r0}$ is a solution, so divide by $(${linTex(r0)})$:` }
      : { text: `Try divisors of $${Math.abs(p[4])}$: $p(${r0}) = 0$, so divide by $(${linTex(r0)})$:` },
    { text: `$p(x) = (${linTex(r0)})(${polyTex(cubic)})$` },
    { text: `The cubic is zero at $x = ${r1}$, so divide it by $(${linTex(r1)})$. That leaves $${polyTex(quad)}$, which factorises:` },
    { tex: productDisplay('p(x)', `${leadTex(lead)}${groupedTex([...roots].sort((x, y) => x - y))}`) },
  ];
}

interface QuarticFlowParams extends QuarticParams {
  /** Values offered for the first root and for the second. */
  tries: number[];
  tries2: number[];
}

/** The whole method as a path: a root by trial, divide, another root, divide, solve the quadratic. */
const polyQuarticFlow: Generator<QuarticFlowParams> = {
  id: 'poly-quartic-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = sampleQuartic(rng, difficulty);
      const [r0, r1] = base.roots;
      const p = quarticPoly(base);
      const cubic = divideBy(p, r0).quotient;
      const wrong = trialOrder(p[4]).filter((s) => valueAt(p, s) !== 0);
      const wrong2 = trialOrder(cubic[3]).filter((s) => valueAt(cubic, s) !== 0);
      if (wrong.length < 2 || wrong2.length < 2) continue;
      return {
        ...base,
        tries: [r0, ...rng.sample(wrong, 2)].sort((x, y) => x - y),
        tries2: [r1, ...rng.sample(wrong2, 2)].sort((x, y) => x - y),
      };
    }
  },
  render: (params): Slide => {
    const { roots, tries, tries2 } = params;
    const [r0, r1] = roots;
    const p = quarticPoly(params);
    const key = polyTex(p);
    const cubic = divideBy(p, r0).quotient;
    const quad = divideBy(cubic, r1).quotient;
    const cubics = distinctPolys(
      cubic,
      [divideBy(p, -r0).quotient, cubic.map((c, i) => (i === 1 ? -c : c)), cubic.map((c, i) => (i === 3 ? -c : c))],
      3,
    );
    const [, , r2, r3] = roots;
    const sets: number[][] = [];
    const seen = new Set<string>();
    for (const set of [roots, [r0, r1, -r2, -r3], roots.map((x) => -x), [r0, r1, r2, -r3], [-r0, r1, r2, r3]]) {
      const label = rootSetLabel(set);
      if (seen.has(label) || sets.length === 3) continue;
      seen.add(label);
      sets.push(set);
    }
    return {
      kind: 'flow',
      prompt: [say('Solve $p(x) = 0$. Each answer chooses what gets asked next.')],
      subject: `p(x) = ${polyTex(p)}`,
      steps: [
        {
          id: 'first',
          ask: 'Which of these makes $p(x)$ zero?',
          branches: tries.map((s) =>
            s === r0
              ? { label: `$x = ${s}$`, to: 'cubic' }
              : { label: `$x = ${s}$`, outcome: `$p(${s}) = ${valueAt(p, s)}$, which is not $0$.` },
          ),
        },
        {
          id: 'cubic',
          ask: `Dividing by $(${linTex(r0)})$ leaves which cubic?`,
          branches: turned(
            cubics.map((c, i) =>
              i === 0
                ? { label: `$${polyTex(c)}$`, to: 'second' }
                : {
                    label: `$${polyTex(c)}$`,
                    outcome: `Multiplying back, $(${linTex(r0)})(${polyTex(c)})$ is $${polyTex(mulPoly([1, -r0], c))}$.`,
                  },
            ),
            key,
          ),
        },
        {
          id: 'second',
          ask: `Which of these makes $${polyTex(cubic)}$ zero?`,
          branches: tries2.map((s) =>
            s === r1
              ? { label: `$x = ${s}$`, to: 'solve' }
              : { label: `$x = ${s}$`, outcome: `The cubic is $${valueAt(cubic, s)}$ there, not $0$.` },
          ),
        },
        {
          id: 'solve',
          ask: `Dividing the cubic by $(${linTex(r1)})$ leaves $${polyTex(quad)}$. So what are all the solutions?`,
          branches: turned(
            sets.map((set) => ({
              label: rootSetLabel(set),
              outcome: `Those are the solutions of $${bracketsTex([...new Set(set)].sort((x, y) => x - y))} = 0$.`,
            })),
            `${key}|solve`,
          ),
        },
      ],
      answer: [`$x = ${r0}$`, `$${polyTex(cubic)}$`, `$x = ${r1}$`, rootSetLabel(roots)],
    };
  },
  solution: (params) => [
    ...quarticSolution(params, false),
    { text: `So $x = ${[...new Set(params.roots)].sort((x, y) => x - y).join(',\\ ')}$.` },
  ],
};

/** A quartic divided by a factor found by trial, as a line that shrinks to a remainder of 0. */
const polyQuarticDivideSteps: Generator<QuarticParams> = {
  id: 'poly-quartic-divide-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = sampleQuartic(rng, difficulty);
      if (divideBy(quarticPoly(base), base.roots[0]).quotient.some((c) => c === 0)) continue;
      return base;
    }
  },
  render: (params): Slide => {
    const a = params.roots[0];
    const p = quarticPoly(params);
    const { quotient } = divideBy(p, a);
    const reductions = [1, 2, 3, 4].map((i) => {
      const k = 4 - i;
      const prev = quotient[i - 1];
      const show = (c: number) => (k === 0 ? String(c) : termTex(c, k));
      const value = i < 4 ? show(quotient[i]) : '0';
      return {
        span: [0, 2] as [number, number],
        value,
        bank: stepBank(value, show(p[i] - a * prev), show(p[i]), show(p[i] + prev), show(a * prev)),
      };
    });
    return {
      kind: 'steps',
      prompt: [
        say(
          `$p(${a}) = 0$, so $(${linTex(a)})$ is a factor. Divide by it: each step takes away enough of $(${linTex(a)})$ to clear the first term, which leaves a new first term. Tap the part you would do **next**, then choose what it leaves.`,
        ),
      ],
      start: p.map((c, i) => (i === 0 ? termTex(c, 4) : placeTerm(c, 4 - i))),
      reductions,
    };
  },
  solution: (params) => {
    const a = params.roots[0];
    const p = quarticPoly(params);
    const { quotient } = divideBy(p, a);
    const lin = linTex(a);
    return [
      { text: `Clear the first term each time by taking away the right multiple of $(${lin})$.` },
      ...[1, 2, 3, 4].map((i) => {
        const k = 4 - i;
        const left = i < 4 ? termTex(quotient[i], k) : '0';
        return { text: `$${termTex(quotient[i - 1], k + 1)} ${placeTerm(p[i], k)} - ${timesBracket(quotient[i - 1], k, lin)} = ${left}$` };
      }),
      { text: `The quotient is $${polyTex(quotient)}$ and the remainder is $0$, as the factor theorem said.` },
    ];
  },
};

interface QuarticTilesParams extends QuarticParams {
  /** Difficulty 1: one factor is given. */
  hint: boolean;
}

/** The full factorisation of a quartic into four linear brackets. */
const polyQuarticTiles: Generator<QuarticTilesParams> = {
  id: 'poly-quartic-tiles',
  sample: (rng, difficulty) => ({ ...sampleQuartic(rng, difficulty), hint: difficulty === 1 }),
  render: (params): Slide => {
    const { roots, lead, hint } = params;
    const p = quarticPoly(params);
    const decoy = nonRootDivisor(p);
    return {
      kind: 'tiles',
      prompt: [
        say(hint ? `$(${linTex(roots[0])})$ is a factor of $p(x)$. Factorise $p(x)$ fully.` : 'Factorise $p(x)$ fully.'),
        show(pDisplay(p)),
      ],
      template: `${leadTex(lead)}(x {0})(x {1})(x {2})(x {3})`,
      bank: numberBank(
        roots.map((r) => -r),
        [...roots, ...(decoy === undefined ? [] : [-decoy])],
        signedNum,
        2,
      ),
      answer: roots.map((r) => signedNum(-r)),
      unordered: true,
    };
  },
  solution: (params) => quarticSolution(params, params.hint),
};

interface QuarticRootParams extends QuarticParams {
  largest: boolean;
  hint: boolean;
}

/** The largest or smallest solution of a quartic. */
const polyQuarticRoot: Generator<QuarticRootParams> = {
  id: 'poly-quartic-root',
  sample: (rng, difficulty) => ({ ...sampleQuartic(rng, difficulty), largest: rng.chance(0.5), hint: difficulty === 1 }),
  choices: ({ roots, lead, largest }) => {
    const sorted = [...roots].sort((x, y) => x - y);
    const target = largest ? sorted[3] : sorted[0];
    const decoy = nonRootDivisor(fromRoots(roots, lead));
    return intOptions(target, [-target, largest ? sorted[0] : sorted[3], largest ? sorted[2] : sorted[1], ...(decoy === undefined ? [] : [decoy])]);
  },
  render: ({ roots, lead, largest, hint }): Slide => {
    const p = fromRoots(roots, lead);
    const target = largest ? Math.max(...roots) : Math.min(...roots);
    const which = largest ? 'largest' : 'smallest';
    return {
      kind: 'expression',
      prompt: [
        say(`${hint ? `$x = ${roots[0]}$ is one solution. ` : ''}Solve the equation and give its ${which} solution.`),
        show(equationDisplay(p)),
      ],
      lead: `\\text{${which} } x =`,
      keypad: [],
      answer: String(target),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const sorted = [...new Set(params.roots)].sort((x, y) => x - y);
    return [
      ...quarticSolution(params, params.hint),
      {
        text: `The solutions are $${sorted.join(',\\ ')}$, so the ${params.largest ? 'largest' : 'smallest'} is $${params.largest ? sorted[sorted.length - 1] : sorted[0]}$.`,
      },
    ];
  },
};

/* ================================================================
 * Level 6: polynomial inequalities
 *
 * A cubic or a quartic against zero, solved from its sign diagram: the
 * critical values come from the factors, each factor's sign on each stretch
 * between them from a test value, and the product's sign is what the
 * inequality asks about. Then repeated factors, which touch rather than cross
 * and so leave a hole or a lone point in a set; an inequality that has to be
 * brought to one side and factorised first; and a set read back off a sketch
 * or a shaded line, or counted in whole numbers.
 *
 * Every polynomial is built outward from small whole roots in -4 to 4, so every
 * critical value is whole and sits on a tick of a ten-step number line drawn
 * after it. A set is shaded on a `numberLine`, placed as tiles, or chosen; it
 * is never typed, since the checker compares values. Nothing here is calculus,
 * so no slide declares `source`, `integrand` or `limits`.
 * ================================================================ */

type Op = '<' | '<=' | '>' | '>=';

const INEQ_OPS: Op[] = ['<', '<=', '>', '>='];
const OP_TEX: Record<Op, string> = { '<': '<', '<=': '\\le', '>': '>', '>=': '\\ge' };
/** The other direction, same strictness: what multiplying by -1 does. */
const FLIP_OP: Record<Op, Op> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
/** Same direction, the other strictness. */
const TOGGLE_OP: Record<Op, Op> = { '<': '<=', '<=': '<', '>': '>=', '>=': '>' };

const isStrict = (op: Op): boolean => op === '<' || op === '>';
const wantsPositive = (op: Op): boolean => op === '>' || op === '>=';

/** Whether a value of p satisfies p op 0. */
function satisfies(value: number, op: Op): boolean {
  if (op === '<') return value < 0;
  if (op === '<=') return value <= 0;
  if (op === '>') return value > 0;
  return value >= 0;
}

/** The stretches' ends: minus infinity, the critical values, infinity. */
const stretchEnds = (roots: number[]): number[] => [-Infinity, ...roots, Infinity];

/** A value strictly inside stretch i, for testing its sign. */
function insideStretch(roots: number[], i: number): number {
  if (i === 0) return roots[0] - 1;
  if (i === roots.length) return roots[roots.length - 1] + 1;
  return (roots[i - 1] + roots[i]) / 2;
}

/** The sign of p on each stretch, left to right: one more sign than roots. */
function stretchSigns(p: Poly, roots: number[]): number[] {
  return stretchEnds(roots)
    .slice(1)
    .map((_, i) => Math.sign(valueAt(p, insideStretch(roots, i))));
}

/**
 * The solution set of p op 0, canonical: the stretches whose sign the
 * inequality asks for, and every critical value too when it allows p = 0.
 * A critical value on neither side of which the sign is right is a lone point.
 */
function solutionPieces(p: Poly, roots: number[], op: Op): Piece[] {
  const ends = stretchEnds(roots);
  const closed = !isStrict(op);
  const pieces: Piece[] = [];
  stretchSigns(p, roots).forEach((sign, i) => {
    if (!satisfies(sign, op) || sign === 0) return;
    pieces.push({
      lo: ends[i],
      hi: ends[i + 1],
      loClosed: closed && Number.isFinite(ends[i]),
      hiClosed: closed && Number.isFinite(ends[i + 1]),
    });
  });
  if (closed) for (const r of roots) pieces.push({ lo: r, hi: r, loClosed: true, hiClosed: true });
  return canonicalPieces(pieces);
}

const setAnswer = (pieces: Piece[]): string => formatSet(canonicalPieces(pieces));

/** One piece as an inequality: x < 2, 1 \le x \le 3, x = 2. */
function pieceTex(piece: Piece): string {
  const lower = piece.loClosed ? '\\le' : '<';
  const upper = piece.hiClosed ? '\\le' : '<';
  if (piece.lo === piece.hi) return `x = ${piece.lo}`;
  if (piece.lo === -Infinity) return `x ${upper} ${piece.hi}`;
  if (piece.hi === Infinity) return `x ${piece.loClosed ? '\\ge' : '>'} ${piece.lo}`;
  return `${piece.lo} ${lower} x ${upper} ${piece.hi}`;
}

/**
 * A whole set as inequalities joined by "or". Each piece is a group, or the
 * minus of a piece starting -3 after the "or" is spaced as a subtraction.
 */
const setTex = (pieces: Piece[]): string =>
  canonicalPieces(pieces)
    .map((piece) => `{${pieceTex(piece)}}`)
    .join(' \\text{ or } ');

/** The same for a display, one piece to a line when one line would run off a phone. */
function setDisplay(pieces: Piece[]): string {
  const whole = setTex(pieces);
  const canonical = canonicalPieces(pieces);
  const parts = canonical.map(pieceTex);
  // `texWidth` drops \le and friends, which are most of a set's width, so a
  // set is measured by its pieces: a stretch between two ends is about ten
  // characters, a ray or a point about six, and each "or" three.
  const width = canonical.reduce((sum, p) => sum + (Number.isFinite(p.lo) && Number.isFinite(p.hi) && p.lo < p.hi ? 10 : 6), 3 * (parts.length - 1));
  if (width <= 20 || parts.length < 2) return whole;
  return chain(`&${parts[0]}`, ...parts.slice(1).map((part) => `\\text{or }\\; &{${part}}`));
}

/** The open stretch i, as the learner reads it: x < -2, -2 < x < 1, x > 3. */
function stretchTex(roots: number[], i: number): string {
  const ends = stretchEnds(roots);
  return pieceTex({ lo: ends[i], hi: ends[i + 1], loClosed: false, hiClosed: false });
}

/** A sign as a table cell or a tile. */
const signToken = (sign: number): string => (sign > 0 ? '+' : '-');
/** A sign in a row of them, braced so KaTeX never reads it as an operator. */
const signCell = (sign: number): string => (sign > 0 ? '{+}' : '{-}');
const signWord = (sign: number): string => (sign > 0 ? 'positive' : 'negative');
const POSITIVE = 'Positive';
const NEGATIVE = 'Negative';
const signLabel = (sign: number): string => (sign > 0 ? POSITIVE : NEGATIVE);

/** A factor's value at x, its power included. */
const factorAt = (f: Factor, x: number): number => (factorLead(f) * (x - f.root)) ** f.power;

/** The inequality as the learner reads it, factorised against zero. */
const ineqTex = (form: Form, op: Op): string => `${formTex(form)} ${OP_TEX[op]} 0`;

/** The same for a display, split after half its brackets when it would run off a phone. */
function ineqDisplay(form: Form, op: Op): string {
  const whole = ineqTex(form, op);
  const parts = texWidth(whole) <= FITS ? undefined : bracketParts(formTex(form));
  if (!parts) return whole;
  const half = Math.ceil(parts.length / 2);
  return chain(`&${parts.slice(0, half).join('')}`, `&\\quad \\times ${parts.slice(half).join('')} ${OP_TEX[op]} 0`);
}

/**
 * A form for a flow's subject box, which wraps like prose: each bracket is a
 * group, so a line can break between brackets but never inside one.
 */
const breakableTex = (form: Form): string =>
  `${leadTex(form.lead)}${form.factors.map((f) => `{${factorTex(f)}}`).join('\\allowbreak ')}`;

/** A number line window ten steps wide, a tick to spare beyond the outer critical values. */
function lineWindow(rng: Rng, roots: number[]): { min: number; max: number } {
  return windowFor(rng, Math.min(...roots), Math.max(...roots), 10, 1);
}

/**
 * Distinct whole roots in -4 to 4 with these powers, as plain factors. Roots
 * a single unit apart are allowed: the sign diagram does not care how close
 * they are, and a stretch with no whole number inside is a thing to notice.
 */
function ineqForm(rng: Rng, powers: number[], lead = 1): Form {
  return rootsForm(sampleRoots(rng, powers.length, 4), powers, lead);
}

/** Difficulty 2's cubic: a lead, and some factors written r - x or kx - kr. */
function hardCubic(rng: Rng): Form {
  const form = ineqForm(rng, [1, 1, 1], rng.pick([1, -1, 2, -2]));
  return { ...form, factors: dressed(rng, form.factors) };
}

/** A power pattern with one squared factor, in a random place. */
function withSquare(rng: Rng, count: number): number[] {
  const at = rng.int(0, count - 1);
  return Array.from({ length: count }, (_, i) => (i === at ? 2 : 1));
}

/** The one squared root of a form. */
const squaredRoot = (form: Form): number => form.factors.find((f) => f.power === 2)!.root;

/** The usual working: critical values, the signs, which stretches and ends. */
function ineqSolution(form: Form, op: Op): SolutionStep[] {
  const p = formPoly(form);
  const roots = formRoots(form);
  const signs = stretchSigns(p, roots);
  const repeated = form.factors.some((f) => f.power % 2 === 0);
  return [
    { text: `The critical values are where a factor is zero: $x = ${roots.join(',\\ ')}$.` },
    {
      text: `On the far right $p(x)$ has the sign of its leading coefficient, $${formLead(form)}$. Moving left it changes sign at each single factor${
        repeated ? ' and keeps it at a squared one' : ''
      }, so left to right the signs are $${signs.map(signCell).join('\\;')}$.`,
    },
    {
      text: `$${OP_TEX[op]} 0$ asks for the ${wantsPositive(op) ? 'positive' : 'negative'} stretches, with the critical values ${
        isStrict(op) ? 'left out, since there $p(x) = 0$' : 'included, since $p(x) = 0$ is allowed'
      }.`,
    },
    { tex: setDisplay(solutionPieces(p, roots, op)) },
  ];
}

interface IneqParams {
  form: Form;
  op: Op;
}

interface IneqLineParams extends IneqParams {
  min: number;
  max: number;
}

/* ================================================================
 * Level 6, lesson 1: the sign diagram
 * ================================================================ */

/**
 * The critical values of a factorised inequality, smallest first. Difficulty
 * 2 writes factors as r - x or kx - kr, puts a number in front, or squares
 * one factor of a quartic, none of which adds a critical value.
 */
const polyCriticalTiles: Generator<IneqParams> = {
  id: 'poly-critical-tiles',
  sample: (rng, difficulty) => {
    const op = rng.pick(INEQ_OPS);
    if (difficulty > 1) {
      if (rng.chance(0.5)) return { form: hardCubic(rng), op };
      return { form: ineqForm(rng, withSquare(rng, 3), rng.pick([1, -1, 2])), op };
    }
    return { form: ineqForm(rng, [1, 1, 1]), op };
  },
  render: ({ form, op }): Slide => {
    const roots = formRoots(form);
    const slips = [
      ...form.factors.map((f) => -f.root),
      ...form.factors.filter((f) => f.form === 'scaled').flatMap((f) => [-f.k! * f.root, f.k! * f.root]),
      ...(Math.abs(form.lead) > 1 ? [form.lead] : []),
    ];
    return {
      kind: 'tiles',
      prompt: [
        say(`Solving $${ineqTex(form, op)}$ starts from the critical values, where a factor is zero. Place them, smallest first.`),
      ],
      template: 'x = {0},\\ {1},\\ {2}',
      bank: numberBank(roots, slips),
      answer: roots.map(String),
    };
  },
  solution: ({ form }) => [
    { text: 'A product is zero only when one of its factors is, so set each bracket to zero:' },
    {
      tex: chain(
        ...form.factors.map((f) => `${factorTex(f, false).slice(1, -1)} = 0 &\\implies x = ${f.root}`),
      ),
    },
    {
      text: `${Math.abs(form.lead) > 1 || form.lead < 0 ? `The $${form.lead}$ in front is never zero, so it adds no critical value. ` : ''}${
        form.factors.some((f) => f.power > 1) ? 'A squared bracket is zero at one value, so it gives one critical value, not two. ' : ''
      }Smallest first: $${formRoots(form).join(',\\ ')}$.`,
    },
  ],
};

interface SignTableParams {
  form: Form;
  /** The factor whose column is left blank. */
  blank: number;
}

/** A whole number inside each stretch: one past each end, one past each critical value between. */
const tableTestValues = (roots: number[]): number[] => [roots[0] - 1, ...roots.map((r) => r + 1)];

/**
 * A sign diagram as a table, one row per stretch, tested at a whole number
 * inside it: one factor's column and the product's are blank. The critical
 * values are two apart at least, so every stretch has a whole number in it,
 * and the row names only that number, which keeps the table phone-wide.
 * Difficulty 2 writes the blank factor as r - x, whose sign runs the other
 * way.
 */
const polySignTable: Generator<SignTableParams> = {
  id: 'poly-sign-table',
  sample: (rng, difficulty) => {
    for (;;) {
      const form = ineqForm(rng, [1, 1, 1]);
      const roots = formRoots(form);
      if (roots.some((r, i) => i > 0 && r - roots[i - 1] < 2)) continue;
      const blank = rng.int(0, 2);
      if (difficulty > 1) {
        if (form.factors[blank].root <= 0) continue;
        form.factors[blank] = { ...form.factors[blank], form: 'reversed' };
      }
      return { form, blank };
    }
  },
  render: ({ form, blank }): Slide => {
    const roots = formRoots(form);
    const answer: string[] = [];
    const rows = tableTestValues(roots).map((t) => {
      const signs = form.factors.map((f) => Math.sign(factorAt(f, t)));
      answer.push(signToken(signs[blank]), signToken(signs.reduce((a, b) => a * b, form.lead)));
      return [String(t), ...signs.map((s, j) => (j === blank ? null : signToken(s))), null];
    });
    return {
      kind: 'table',
      prompt: [
        say(
          `Complete the sign diagram of $p(x) = ${formTex(form)}$, whose critical values are $${roots.join(',\\ ')}$. Each row tests one value of $x$ from a stretch between them: fill in the sign of the factor that is missing, then the sign of $p(x)$, their product.`,
        ),
      ],
      columns: ['x', ...form.factors.map((f) => factorTex(f).slice(1, -1)), 'p(x)'],
      rows,
      bank: [...answer, '+', '-'].sort(),
      answer,
    };
  },
  solution: ({ form, blank }) => {
    const roots = formRoots(form);
    const f = form.factors[blank];
    return [
      { text: 'Put each test value into every factor: only the signs matter, and each one holds for its whole stretch.' },
      ...tableTestValues(roots).map((t, i) => {
        const signs = form.factors.map((g) => Math.sign(factorAt(g, t)));
        const negatives = signs.filter((s) => s < 0).length;
        return {
          text: `$x = ${t}$, on $${stretchTex(roots, i)}$: $${factorTex(f, false).slice(1, -1)}$ is ${signWord(signs[blank])}, and ${negatives} negative ${
            negatives === 1 ? 'factor makes' : 'factors make'
          } $p(x)$ ${signWord(signs.reduce((a, b) => a * b, 1))}.`,
        };
      }),
    ];
  },
};

interface StretchParams {
  form: Form;
  /** Which stretch, counting from the left from 0. */
  stretch: number;
}

/** Where a stretch is, in words: "for x < -2", "between x = -2 and x = 1". */
function whereStretch(roots: number[], i: number): string {
  if (i === 0) return `for $x < ${roots[0]}$`;
  if (i === roots.length) return `for $x > ${roots[roots.length - 1]}$`;
  return `between $x = ${roots[i - 1]}$ and $x = ${roots[i]}$`;
}

/**
 * The sign of p on one stretch, a factor at a time, then the product. Each
 * step remembers whether an odd number of factors so far were negative, so
 * the last fork is only right one way. Difficulty 2 squares one factor of a
 * quartic, which is positive either side of its root, and writes another as
 * r - x.
 */
const polyStretchSignFlow: Generator<StretchParams> = {
  id: 'poly-stretch-sign-flow',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const form = ineqForm(rng, withSquare(rng, 3));
      const factors = form.factors.map((f) => (f.power === 1 && f.root > 0 && rng.chance(0.5) ? { ...f, form: 'reversed' as const } : f));
      return { form: { ...form, factors }, stretch: rng.int(0, 3) };
    }
    return { form: ineqForm(rng, [1, 1, 1]), stretch: rng.int(0, 3) };
  },
  render: ({ form, stretch }): Slide => {
    const roots = formRoots(form);
    const t = insideStretch(roots, stretch);
    const signs = form.factors.map((f) => Math.sign(factorAt(f, t)));
    const n = form.factors.length;
    const steps: Extract<Slide, { kind: 'flow' }>['steps'] = [];
    for (let j = 0; j < n; j += 1) {
      for (const odd of j === 0 ? [0] : [0, 1]) {
        const next = (flip: number) => (j + 1 < n ? `f${j + 1}-${(odd + flip) % 2}` : `p-${(odd + flip) % 2}`);
        steps.push({
          id: `f${j}-${odd}`,
          ask: `${j === 0 ? 'On this stretch, is' : 'And'} $${factorTex(form.factors[j])}$ positive or negative?`,
          branches: [
            { label: POSITIVE, to: next(0) },
            { label: NEGATIVE, to: next(1) },
          ],
        });
      }
    }
    for (const odd of [0, 1]) {
      steps.push({
        id: `p-${odd}`,
        ask: `So ${whereStretch(roots, stretch)}, $p(x)$ is`,
        branches: [
          { label: POSITIVE, outcome: 'Positive: $p(x) > 0$ all along this stretch.' },
          { label: NEGATIVE, outcome: 'Negative: $p(x) < 0$ all along this stretch.' },
        ],
      });
    }
    return {
      kind: 'flow',
      prompt: [say(`Find the sign of $p(x)$ ${whereStretch(roots, stretch)}, one factor at a time. Each answer chooses what gets asked next.`)],
      subject: `p(x) = ${breakableTex(form)}`,
      steps,
      answer: [...signs.map(signLabel), signLabel(signs.reduce((a, b) => a * b, form.lead))],
    };
  },
  solution: ({ form, stretch }) => {
    const roots = formRoots(form);
    const t = stretch === 0 ? roots[0] - 1 : stretch === roots.length ? roots[roots.length - 1] + 1 : roots[stretch - 1] + 0.5;
    const signs = form.factors.map((f) => Math.sign(factorAt(f, t)));
    const negatives = signs.filter((s) => s < 0).length;
    return [
      { text: `No factor changes sign inside a stretch, so any value there will do: take $x = ${t}$.` },
      {
        text: form.factors
          .map((f, j) => `$${factorTex(f)}$ is ${signWord(signs[j])}`)
          .join(', ')
          .concat('.'),
      },
      ...(form.factors.some((f) => f.power === 2) ? [{ text: 'A squared factor is positive everywhere except at its own root.' }] : []),
      { text: `${negatives} negative ${negatives === 1 ? 'factor' : 'factors'}: ${negatives % 2 === 0 ? 'an even number, so the product is positive' : 'an odd number, so the product is negative'}.` },
    ];
  },
};

/** Four sign rows for a pick-one, the right one first. */
function signRows(right: number[], lead: number): number[][] {
  const flipAt = (at: number) => right.map((s, i) => (i === at ? -s : s));
  const alternating = right.map((_, i) => (Math.sign(lead) * ((right.length - 1 - i) % 2 === 0 ? 1 : -1)));
  return [right, right.map((s) => -s), alternating, alternating.map((s) => -s), flipAt(right.length - 1), flipAt(0), flipAt(1)];
}

/**
 * Which row of signs is the sign diagram. The right one comes from the
 * leading coefficient on the far right and a change at each single factor.
 * Difficulty 2 is a quartic with a squared factor, which does not change
 * sign, and factors written r - x, which put a -1 into the lead.
 */
const polySignPattern: Generator<{ form: Form }> = {
  id: 'poly-sign-pattern',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const form = ineqForm(rng, withSquare(rng, 3), rng.pick([1, -1, 2, -2]));
      return { form: { ...form, factors: dressed(rng, form.factors) } };
    }
    return { form: ineqForm(rng, [1, 1, 1], rng.pick([1, -1])) };
  },
  render: ({ form }): Slide => {
    const roots = formRoots(form);
    const [right, ...wrong] = signRows(stretchSigns(formPoly(form), roots), form.lead);
    const row = (signs: number[]) => signs.map(signCell).join('\\quad ');
    return choiceSlide(
      [
        say('Which row gives the signs of $p(x)$ on the stretches between its critical values, reading from left to right?'),
        show(productDisplay('p(x)', formTex(form))),
      ],
      options({ tex: row(right) }, ...wrong.map((signs) => ({ tex: row(signs) }))).slice(0, 4),
    );
  },
  solution: ({ form }) => {
    const roots = formRoots(form);
    const lead = formLead(form);
    return [
      {
        text: `Multiplied out, $p(x)$ starts $${termTex(lead, formDegree(form))}$, so for large $x$ it is ${signWord(lead)}: that is the rightmost sign.`,
      },
      {
        text: `The critical values are $${roots.join(',\\ ')}$. Moving left past each one the sign changes${
          form.factors.some((f) => f.power === 2) ? `, except at $x = ${squaredRoot(form)}$, where the squared factor keeps it` : ''
        }.`,
      },
      { tex: stretchSigns(formPoly(form), roots).map(signCell).join('\\quad ') },
    ];
  },
};

/* ================================================================
 * Level 6, lesson 2: solving a cubic inequality
 * ================================================================ */

/** A cubic inequality at either difficulty: plain and monic, or with a lead and dressed factors. */
function sampleCubicIneq(rng: Rng, difficulty: number): IneqParams {
  return { form: difficulty > 1 ? hardCubic(rng) : ineqForm(rng, [1, 1, 1]), op: rng.pick(INEQ_OPS) };
}

/** Shade the solution set of a factorised cubic against zero. */
const polyCubicLine: Generator<IneqLineParams> = {
  id: 'poly-cubic-line',
  sample: (rng, difficulty) => {
    const params = sampleCubicIneq(rng, difficulty);
    return { ...params, ...lineWindow(rng, formRoots(params.form)) };
  },
  render: ({ form, op, min, max }): Slide => ({
    kind: 'numberLine',
    prompt: [say('Solve the inequality, then shade its solution set on the number line.'), show(ineqDisplay(form, op))],
    min,
    max,
    step: 1,
    answer: setAnswer(solutionPieces(formPoly(form), formRoots(form), op)),
  }),
  solution: ({ form, op }) => ineqSolution(form, op),
};

/**
 * The set written as two inequalities from tiles. The bank holds the other
 * two stretches and the right two with their ends the other way, so strict
 * against non-strict is decided, not read off.
 */
const polyCubicSetTiles: Generator<IneqParams> = {
  id: 'poly-cubic-set-tiles',
  sample: sampleCubicIneq,
  render: ({ form, op }): Slide => {
    const p = formPoly(form);
    const roots = formRoots(form);
    const answer = solutionPieces(p, roots, op).map(pieceTex);
    const others = solutionPieces(p, roots, FLIP_OP[op]).map(pieceTex);
    const toggled = solutionPieces(p, roots, TOGGLE_OP[op]).map(pieceTex);
    return {
      kind: 'tiles',
      prompt: [say(`Complete the solution of $${ineqTex(form, op)}$.`)],
      template: '{0} \\quad\\text{or}\\quad {1}',
      bank: fillBank(answer, [...others, ...toggled]),
      answer,
      unordered: true,
    };
  },
  solution: ({ form, op }) => ineqSolution(form, op),
};

/** A list of critical values as a branch label. */
const valuesLabel = (values: number[]): string => `$x = ${[...values].sort((a, b) => a - b).join(',\\ ')}$`;

/**
 * The whole method as forks: the critical values, the sign on the far right,
 * which stretches, and whether the ends are in. Each wrong branch says what
 * went wrong.
 */
const polyIneqFlow: Generator<IneqParams> = {
  id: 'poly-ineq-flow',
  sample: sampleCubicIneq,
  render: ({ form, op }): Slide => {
    const p = formPoly(form);
    const roots = formRoots(form);
    const lead = formLead(form);
    const key = `${ineqTex(form, op)}`;
    const right = valuesLabel(roots);
    const negated = valuesLabel(roots.map((r) => -r));
    const oneFlipped = valuesLabel([-roots[1], roots[0], roots[2]]);
    const wrongValues = [negated, ...(new Set([-roots[1], roots[0], roots[2]]).size === 3 ? [oneFlipped] : [])].filter(
      (label, i, all) => label !== right && all.indexOf(label) === i,
    );
    const open = (pieces: Piece[]) => pieces.map((piece) => ({ ...piece, loClosed: false, hiClosed: false }));
    const stretches = (want: Op) =>
      open(solutionPieces(p, roots, isStrict(want) ? want : TOGGLE_OP[want]))
        .map((piece) => `$${pieceTex(piece)}$`)
        .join(' and ');
    const chosen = stretches(op);
    const otherStretches = stretches(FLIP_OP[op]);
    const IN = 'Included: filled dots';
    const OUT = 'Left out: hollow dots';
    return {
      kind: 'flow',
      prompt: [say('Solve the inequality one decision at a time. Each answer chooses what gets asked next.')],
      subject: `${breakableTex(form)} ${OP_TEX[op]} 0`,
      steps: [
        {
          id: 'critical',
          ask: 'Where are the critical values?',
          branches: turned(
            [
              { label: right, to: 'far-right' },
              ...wrongValues.map((label) => ({
                label,
                outcome: 'A bracket $(x - a)$ is zero at $x = a$: the number in the bracket with its sign turned round.',
              })),
            ],
            key,
          ),
        },
        {
          id: 'far-right',
          ask: 'For large $x$, beyond every critical value, is the cubic positive or negative?',
          branches: [
            { label: POSITIVE, ...(lead > 0 ? { to: 'stretches' } : { outcome: `Multiplied out, the cubic starts $${termTex(lead, 3)}$, which is negative for large $x$.` }) },
            { label: NEGATIVE, ...(lead < 0 ? { to: 'stretches' } : { outcome: `Multiplied out, the cubic starts $${termTex(lead, 3)}$, which is positive for large $x$.` }) },
          ],
        },
        {
          id: 'stretches',
          ask: `The sign changes at each critical value. Which stretches make it ${wantsPositive(op) ? 'positive' : 'negative'}?`,
          branches: turned(
            [
              { label: chosen, to: 'ends' },
              { label: otherStretches, outcome: `Those are where it is ${wantsPositive(op) ? 'negative' : 'positive'}.` },
            ],
            `${key}|stretches`,
          ),
        },
        {
          id: 'ends',
          ask: `And the critical values themselves, where the cubic is $0$?`,
          branches: [
            { label: IN, outcome: `$${OP_TEX[op]}$ ${isStrict(op) ? 'does not allow' : 'allows'} $0$.` },
            { label: OUT, outcome: `$${OP_TEX[op]}$ ${isStrict(op) ? 'does not allow' : 'allows'} $0$.` },
          ],
        },
      ],
      answer: [right, signLabel(lead), chosen, isStrict(op) ? OUT : IN],
    };
  },
  solution: ({ form, op }) => ineqSolution(form, op),
};

/** The integers from -30 to 30 that satisfy p op 0. */
function wholeSolutions(p: Poly, op: Op): number[] {
  return Array.from({ length: 61 }, (_, i) => i - 30).filter((x) => satisfies(valueAt(p, x), op));
}

/** Whether the set runs off to the right, so has no largest member. */
const unboundedAbove = (p: Poly, op: Op): boolean => satisfies(valueAt(p, 1000), op);

/**
 * The largest whole number in the set, or the smallest when the set runs off
 * to the right. Where the end is a critical value, strictness decides whether
 * it is the answer or the number next to it.
 */
const polyIneqInteger: Generator<IneqParams> = {
  id: 'poly-ineq-integer',
  sample: sampleCubicIneq,
  choices: ({ form, op }) => {
    const p = formPoly(form);
    const whole = wholeSolutions(p, op);
    const largest = !unboundedAbove(p, op);
    const answer = largest ? Math.max(...whole) : Math.min(...whole);
    const roots = formRoots(form);
    const edge = largest ? Math.max(...roots.filter((r) => r >= answer)) : Math.min(...roots.filter((r) => r <= answer));
    return intOptions(answer, [edge, edge + 1, edge - 1, largest ? answer - 1 : answer + 1, ...roots]);
  },
  render: ({ form, op }): Slide => {
    const p = formPoly(form);
    const whole = wholeSolutions(p, op);
    const largest = !unboundedAbove(p, op);
    return {
      kind: 'expression',
      prompt: [say(`What is the ${largest ? 'largest' : 'smallest'} whole number that satisfies this inequality?`), show(ineqDisplay(form, op))],
      lead: 'x =',
      keypad: [],
      answer: String(largest ? Math.max(...whole) : Math.min(...whole)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ form, op }) => {
    const p = formPoly(form);
    const whole = wholeSolutions(p, op);
    const largest = !unboundedAbove(p, op);
    const answer = largest ? Math.max(...whole) : Math.min(...whole);
    return [
      ...ineqSolution(form, op),
      {
        text: `The set runs off to the ${largest ? 'left' : 'right'}, so it has no ${largest ? 'smallest' : 'largest'} member; its ${
          largest ? 'largest' : 'smallest'
        } whole number is $${answer}$.`,
      },
    ];
  },
};

/* ================================================================
 * Level 6, lesson 3: repeated factors
 * ================================================================ */

/**
 * A form with exactly one squared factor. Difficulty 1 is a cubic, (x - a)^2
 * times one single factor; difficulty 2 a quartic with two single factors, or
 * the cubic with a negative lead or its single factor written b - x.
 */
function sampleTouchForm(rng: Rng, difficulty: number): Form {
  if (difficulty > 1) {
    if (rng.chance(0.5)) return ineqForm(rng, withSquare(rng, 3), rng.pick([1, -1]));
    const form = ineqForm(rng, withSquare(rng, 2), rng.pick([1, -1, 2, -2]));
    return { ...form, factors: form.factors.map((f) => (f.power === 1 && f.root > 0 && rng.chance(0.5) ? { ...f, form: 'reversed' as const } : f)) };
  }
  return ineqForm(rng, withSquare(rng, 2));
}

/** Shade a set whose polynomial touches the axis at a squared factor. */
const polyTouchLine: Generator<IneqLineParams> = {
  id: 'poly-touch-line',
  sample: (rng, difficulty) => {
    const form = sampleTouchForm(rng, difficulty);
    return { form, op: rng.pick(INEQ_OPS), ...lineWindow(rng, formRoots(form)) };
  },
  render: ({ form, op, min, max }): Slide => ({
    kind: 'numberLine',
    prompt: [say('Solve the inequality, then shade its solution set on the number line.'), show(ineqDisplay(form, op))],
    min,
    max,
    step: 1,
    answer: setAnswer(solutionPieces(formPoly(form), formRoots(form), op)),
  }),
  solution: ({ form, op }) => {
    const a = squaredRoot(form);
    const p = formPoly(form);
    const side = Math.sign(valueAt(p, a + 0.5));
    const sidesIn = satisfies(side, op);
    return [
      ...ineqSolution(form, op).slice(0, 3),
      {
        text: `At $x = ${a}$ the squared factor touches: $p(x)$ is ${signWord(side)} on both sides, so ${
          sidesIn
            ? isStrict(op)
              ? `the shading runs up to $${a}$ from both sides with a hollow dot there, a hole`
              : `the shading runs straight through $${a}$`
            : isStrict(op)
              ? `nothing near $${a}$ is in the set`
              : `$${a}$ itself is in the set as a lone filled dot`
        }.`,
      },
      { tex: setDisplay(solutionPieces(p, formRoots(form), op)) },
    ];
  },
};

const HOLE = 'Shaded both sides, with a hollow dot at the root';
const THROUGH = 'Shaded straight through the root';
const LONE = 'A lone filled dot at the root';
const NOTHING = 'No dot and no shading near the root';

/** What the set looks like around a touching root. */
function touchPicture(sidesIn: boolean, atIn: boolean): string {
  if (sidesIn) return atIn ? THROUGH : HOLE;
  return atIn ? LONE : NOTHING;
}

/**
 * Around a squared factor's root: the sign just left, just right (the same),
 * and so what the set does there. The four pictures are all offered, so the
 * hole and the lone point are told apart by reasoning, not by the options.
 */
const polyHoleFlow: Generator<IneqParams> = {
  id: 'poly-hole-flow',
  sample: (rng, difficulty) => ({ form: sampleTouchForm(rng, difficulty), op: rng.pick(INEQ_OPS) }),
  render: ({ form, op }): Slide => {
    const a = squaredRoot(form);
    const side = Math.sign(valueAt(formPoly(form), a + 0.5));
    const picture = touchPicture(satisfies(side, op), !isStrict(op));
    const bothSides = (id: string): Extract<Slide, { kind: 'flow' }>['steps'][number] => ({
      id,
      ask: `And just to the right of $x = ${a}$?`,
      branches: [
        { label: POSITIVE, to: 'set' },
        { label: NEGATIVE, to: 'set' },
      ],
    });
    return {
      kind: 'flow',
      prompt: [say(`$${factorTex(form.factors.find((f) => f.power === 2)!)}$ is a squared factor. Decide what the solution set does at $x = ${a}$.`)],
      subject: `${breakableTex(form)} ${OP_TEX[op]} 0`,
      steps: [
        {
          id: 'left',
          ask: `Just to the left of $x = ${a}$, is the polynomial positive or negative?`,
          branches: [
            { label: POSITIVE, to: 'right-p' },
            { label: NEGATIVE, to: 'right-n' },
          ],
        },
        bothSides('right-p'),
        bothSides('right-n'),
        {
          id: 'set',
          ask: `So around $x = ${a}$ the solution set is`,
          branches: turned(
            [HOLE, THROUGH, LONE, NOTHING].map((label) => ({
              label,
              outcome:
                label === picture
                  ? 'That is how it is drawn.'
                  : `Near $x = ${a}$ the polynomial is ${signWord(side)}, and $${OP_TEX[op]} 0$ ${isStrict(op) ? 'leaves out' : 'allows'} $0$.`,
            })),
            `${ineqTex(form, op)}|set`,
          ),
        },
      ],
      answer: [signLabel(side), signLabel(side), picture],
    };
  },
  solution: ({ form, op }) => {
    const a = squaredRoot(form);
    const side = Math.sign(valueAt(formPoly(form), a + 0.5));
    return [
      { text: `The squared factor is positive on both sides of $x = ${a}$, so the polynomial has the same sign either side: ${signWord(side)}.` },
      {
        text: `$${OP_TEX[op]} 0$ asks for ${wantsPositive(op) ? 'positive' : 'negative'} values, so the stretches either side are ${
          satisfies(side, op) ? 'shaded' : 'not shaded'
        }. At $x = ${a}$ itself the value is $0$, which $${OP_TEX[op]}$ ${isStrict(op) ? 'leaves out' : 'allows'}.`,
      },
      { text: `${touchPicture(satisfies(side, op), !isStrict(op))}.` },
    ];
  },
};

/**
 * How many times the sign changes from left to right: once at each root of
 * odd power. Difficulty 1 is a cubic, three single roots or one squared;
 * difficulty 2 a quartic, which may have two squares, a cube, or none.
 */
const polySignChanges: Generator<{ form: Form }> = {
  id: 'poly-sign-changes',
  sample: (rng, difficulty) => {
    const patterns = difficulty > 1 ? [[2, 1, 1], [1, 2, 1], [2, 2], [3, 1], [1, 3], [1, 1, 1, 1]] : [[1, 1, 1], [2, 1], [1, 2]];
    const powers = rng.pick(patterns);
    const form = ineqForm(rng, powers, difficulty > 1 ? rng.pick([1, -1]) : 1);
    return { form: { ...form, factors: form.factors.map((f) => (difficulty > 1 && f.power === 1 && f.root > 0 && rng.chance(0.3) ? { ...f, form: 'reversed' as const } : f)) } };
  },
  choices: ({ form }) => {
    const changes = form.factors.filter((f) => f.power % 2 === 1).length;
    return intOptions(changes, [form.factors.length, formDegree(form), changes + 1, changes - 1], 0);
  },
  render: ({ form }): Slide => ({
    kind: 'expression',
    prompt: [say('As $x$ runs from left to right, how many times does this polynomial change sign?'), show(productDisplay('p(x)', formTex(form)))],
    lead: '\\text{sign changes} =',
    keypad: [],
    answer: String(form.factors.filter((f) => f.power % 2 === 1).length),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ form }) => {
    const odd = form.factors.filter((f) => f.power % 2 === 1);
    const even = form.factors.filter((f) => f.power % 2 === 0);
    return [
      { text: 'A factor to an odd power changes sign at its root, so the curve crosses there. A factor to an even power does not, so the curve touches.' },
      ...(odd.length > 0 ? [{ text: `Odd: $${odd.map((f) => factorTex(f)).join(',\\ ')}$.` }] : []),
      ...(even.length > 0 ? [{ text: `Even: $${even.map((f) => factorTex(f)).join(',\\ ')}$, which never change the sign.` }] : []),
      { text: `So the sign changes $${odd.length}$ ${odd.length === 1 ? 'time' : 'times'}.` },
    ];
  },
};

const AND = '\\text{and}';
const OR = '\\text{or}';

/**
 * A cubic with a squared factor, written as a ray and the touching point: the
 * ray "and x \ne a" when the point is a hole, "or x = a" when it is a lone
 * dot. Only those two cases are drawn, so the point always matters.
 */
const polyTouchTiles: Generator<IneqParams> = {
  id: 'poly-touch-tiles',
  sample: (rng, difficulty) => {
    const form =
      difficulty > 1
        ? (() => {
            const f = ineqForm(rng, withSquare(rng, 2), rng.pick([1, -1, 2, -2]));
            return { ...f, factors: f.factors.map((g) => (g.power === 1 && g.root > 0 && rng.chance(0.5) ? { ...g, form: 'reversed' as const } : g)) };
          })()
        : ineqForm(rng, withSquare(rng, 2));
    const side = Math.sign(valueAt(formPoly(form), squaredRoot(form) + 0.5));
    // A hole needs the sides in and the point out; a lone dot the reverse.
    const ops = INEQ_OPS.filter((op) => satisfies(side, op) === isStrict(op));
    return { form, op: rng.pick(ops) };
  },
  render: ({ form, op }): Slide => {
    const a = squaredRoot(form);
    const b = form.factors.find((f) => f.power === 1)!.root;
    const hole = isStrict(op);
    // Apart from the touching point, the set is the ray from the single root
    // on whichever side has the right sign.
    const ray = (right: boolean, closed: boolean): Piece =>
      right ? { lo: b, hi: Infinity, loClosed: closed, hiClosed: false } : { lo: -Infinity, hi: b, loClosed: false, hiClosed: closed };
    const right = satisfies(valueAt(formPoly(form), b + 0.5), op);
    const answer = [pieceTex(ray(right, !hole)), hole ? AND : OR, hole ? `x \\ne ${a}` : `x = ${a}`];
    const toggledRay = ray(right, hole);
    const oppositeRay = ray(!right, !hole);
    return {
      kind: 'tiles',
      prompt: [say(`Complete the solution of $${ineqTex(form, op)}$: the stretch first, then the point $x = ${a}$.`)],
      template: '{0} \\quad {1} \\quad {2}',
      bank: fillBank(answer, [pieceTex(toggledRay), pieceTex(oppositeRay), hole ? OR : AND, hole ? `x = ${a}` : `x \\ne ${a}`]),
      answer,
    };
  },
  solution: ({ form, op }) => {
    const a = squaredRoot(form);
    const hole = isStrict(op);
    return [
      ...ineqSolution(form, op).slice(0, 3),
      {
        text: hole
          ? `The stretch runs through $x = ${a}$, but there $p(x) = 0$, which $${OP_TEX[op]}$ leaves out: a hole, written "and $x \\ne ${a}$".`
          : `Either side of $x = ${a}$ has the wrong sign, but at $x = ${a}$ itself $p(x) = 0$, which $${OP_TEX[op]}$ allows: a lone point, written "or $x = ${a}$".`,
      },
    ];
  },
};

/* ================================================================
 * Level 6, lesson 4: rearranging first
 * ================================================================ */

interface RearrangeParams {
  /** The one-sided cubic's roots, smallest first. */
  roots: number[];
  /** Its leading coefficient, 1 or -1. */
  lead: number;
  /** What sits on the right before rearranging; the left is the cubic plus this. */
  q: Poly;
  op: Op;
}

/** The cubic once everything is on the left. */
const oneSided = ({ roots, lead }: RearrangeParams): Poly => fromRoots(roots, lead);
/** The left side as first written. */
const leftSide = (params: RearrangeParams): Poly => addPoly(oneSided(params), params.q);

/**
 * p(x) > q(x) with p - q a cubic of whole roots. Difficulty 1's cubic leads
 * with x^3; difficulty 2's often leads with -x^3, which is what comes of an
 * x^3 on the right, and then the brackets carry a minus.
 */
function sampleRearrange(rng: Rng, difficulty: number): RearrangeParams {
  for (;;) {
    const roots = sampleRoots(rng, 3, 4).sort((a, b) => a - b);
    const lead = difficulty > 1 && rng.chance(0.6) ? -1 : 1;
    const q: Poly =
      lead < 0 && rng.chance(0.5)
        ? [2, 0, nonZero(rng, 5), rng.int(-6, 6)]
        : rng.chance(0.5)
          ? [nonZero(rng, 3), rng.int(-5, 5), rng.int(-8, 8)]
          : [nonZero(rng, 6), nonZero(rng, 8)];
    const params = { roots, lead, q, op: rng.pick(INEQ_OPS) };
    const left = leftSide(params);
    if (left.some((c) => Math.abs(c) > 30) || q.filter((c) => c !== 0).length < 2) continue;
    return params;
  }
}

/** The inequality as first written, broken over two lines if it will not fit a phone. */
function rearrangedTex(params: RearrangeParams): string {
  const left = polyTex(leftSide(params));
  const right = polyTex(params.q);
  const whole = `${left} ${OP_TEX[params.op]} ${right}`;
  return texWidth(whole) <= FITS ? whole : chain(`&${left}`, `&\\quad ${OP_TEX[params.op]} ${right}`);
}

/** Its solution: subtract, factorise, and turn round if the cubic leads with a minus. */
function rearrangeSolution(params: RearrangeParams): SolutionStep[] {
  const { roots, lead, op } = params;
  const p = oneSided(params);
  const monic = rootsForm(roots, [1, 1, 1]);
  const finalOp = lead < 0 ? FLIP_OP[op] : op;
  return [
    { text: `Take $${polyTex(params.q)}$ from both sides, which never turns an inequality round:` },
    { tex: `${polyTex(p)} ${OP_TEX[op]} 0` },
    {
      text: `Trying small divisors of $${p[3]}$, $x = ${roots[1]}$ makes it zero, so $(${linTex(roots[1])})$ is a factor; dividing leaves a quadratic that factorises:`,
    },
    { tex: `${formTex(rootsForm(roots, [1, 1, 1], lead))} ${OP_TEX[op]} 0` },
    ...(lead < 0
      ? [{ text: 'Multiply by $-1$ to clear the minus, turning the inequality round:' }, { tex: `${formTex(monic)} ${OP_TEX[finalOp]} 0` }]
      : []),
    { tex: setDisplay(solutionPieces(p, roots, op)) },
  ];
}

/**
 * The rearrangement as a line of working: to one side, factorised, and at
 * difficulty 2 multiplied by -1 with the sign turned.
 */
const polyOneSideSteps: Generator<RearrangeParams> = {
  id: 'poly-one-side-steps',
  sample: sampleRearrange,
  render: (params): Slide => {
    const { roots, lead, q, op } = params;
    const p = oneSided(params);
    const left = leftSide(params);
    const value = `${polyTex(p)} ${OP_TEX[op]} 0`;
    // Moving the constant across without turning its sign.
    const qc = q[q.length - 1];
    const constantSlip = qc !== 0 ? addPoly(p, [2 * qc]) : addPoly(p, [2 * q[q.length - 2], 0]);
    const factorised = (rs: number[], l: number, o: Op) => `${formTex(rootsForm(rs, [1, 1, 1], l))} ${OP_TEX[o]} 0`;
    const flipped = roots.map((r, i) => (i === 0 ? -r : r));
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [
      {
        span: [0, 3],
        operator: 1,
        value,
        bank: stepBank(value, `${polyTex(addPoly(left, q))} ${OP_TEX[op]} 0`, `${polyTex(p)} ${OP_TEX[FLIP_OP[op]]} 0`, `${polyTex(constantSlip)} ${OP_TEX[op]} 0`),
      },
      {
        span: [0, 1],
        value: factorised(roots, lead, op),
        bank: stepBank(
          factorised(roots, lead, op),
          factorised(roots.map((r) => -r), lead, op),
          ...(new Set(flipped).size === 3 ? [factorised(flipped, lead, op)] : []),
          factorised(roots, -lead, op),
        ),
      },
    ];
    if (lead < 0) {
      const last = factorised(roots, 1, FLIP_OP[op]);
      reductions.push({
        span: [0, 1],
        value: last,
        bank: stepBank(last, factorised(roots, 1, op), factorised(roots, 1, TOGGLE_OP[FLIP_OP[op]]), factorised(roots.map((r) => -r), 1, FLIP_OP[op])),
      });
    }
    return {
      kind: 'steps',
      prompt: [
        say(
          `Bring everything to one side, then factorise${
            lead < 0 ? ', then multiply by $-1$ so the cubic leads with $x^{3}$' : ''
          }. Tap the part you would do **next**, then choose what it becomes.`,
        ),
      ],
      start: [polyTex(left), OP_TEX[op], polyTex(q)],
      reductions,
    };
  },
  solution: rearrangeSolution,
};

/** The first few candidates for a whole root that are not roots, for the trial step. */
function nonRoots(p: Poly, count: number): number[] {
  return [1, -1, 2, -2, 3, -3, 4, -4, 5, -5].filter((k) => valueAt(p, k) !== 0).slice(0, count);
}

/**
 * The method as forks: to one side, a root by the factor theorem, the
 * quotient, and the set. A wrong branch ends with what went wrong.
 */
const polyRearrangeFlow: Generator<RearrangeParams> = {
  id: 'poly-rearrange-flow',
  sample: sampleRearrange,
  render: (params): Slide => {
    const { roots, q, op } = params;
    const p = oneSided(params);
    const left = leftSide(params);
    const key = `${polyTex(left)}|${op}|${polyTex(q)}`;
    // The root a person finds first: the smallest in size.
    const r = [...roots].sort((a, b) => Math.abs(a) - Math.abs(b) || b - a)[0];
    const quotient = divideBy(p, r).quotient;
    const slipQuotients = [
      [quotient[0], -quotient[1], quotient[2]],
      [quotient[0], quotient[1], -quotient[2]],
      [quotient[0], -quotient[1], -quotient[2]],
    ]
      .map((c) => `$${polyTex(c)}$`)
      .filter((label, i, all) => label !== `$${polyTex(quotient)}$` && all.indexOf(label) === i)
      .slice(0, 2);
    const set = `$${setTex(solutionPieces(p, roots, op))}$`;
    const wrongSets = [
      `$${setTex(solutionPieces(p, roots, FLIP_OP[op]))}$`,
      `$${setTex(solutionPieces(p, roots, TOGGLE_OP[op]))}$`,
    ];
    return {
      kind: 'flow',
      prompt: [say('Solve the inequality one decision at a time. Each answer chooses what gets asked next.')],
      subject: `${polyTex(left)} ${OP_TEX[op]} ${polyTex(q)}`,
      steps: [
        {
          id: 'side',
          ask: 'First bring everything to one side. Which inequality do you get?',
          branches: turned(
            [
              { label: `$${polyTex(p)} ${OP_TEX[op]} 0$`, to: 'root' },
              { label: `$${polyTex(addPoly(left, q))} ${OP_TEX[op]} 0$`, outcome: 'That adds the right side on; it has to be taken away.' },
              { label: `$${polyTex(p)} ${OP_TEX[FLIP_OP[op]]} 0$`, outcome: 'Taking the same thing from both sides never turns an inequality round.' },
            ],
            key,
          ),
        },
        {
          id: 'root',
          ask: 'Call that cubic $f(x)$. Which of these makes $f(x) = 0$, and so gives a factor?',
          branches: turned(
            [
              { label: `$x = ${r}$`, to: 'divide' },
              ...nonRoots(p, 2).map((k) => ({ label: `$x = ${k}$`, outcome: `$f(${k}) = ${valueAt(p, k)}$, not $0$, so $(${linTex(k)})$ is not a factor.` })),
            ],
            `${key}|root`,
          ),
        },
        {
          id: 'divide',
          ask: `Dividing $f(x)$ by $(${linTex(r)})$ leaves which quadratic?`,
          branches: turned(
            [
              { label: `$${polyTex(quotient)}$`, to: 'set' },
              ...slipQuotients.map((label) => ({ label, outcome: `Multiply it back by $(${linTex(r)})$: it does not give $f(x)$.` })),
            ],
            `${key}|divide`,
          ),
        },
        {
          id: 'set',
          ask: 'The quadratic factorises, giving the other critical values. So the solution set is',
          branches: turned(
            [
              { label: set, outcome: 'That is the set.' },
              ...wrongSets.filter((label) => label !== set).map((label) => ({ label, outcome: `Check the signs on each stretch and whether $${OP_TEX[op]}$ allows $0$.` })),
            ],
            `${key}|set`,
          ),
        },
      ],
      answer: [`$${polyTex(p)} ${OP_TEX[op]} 0$`, `$x = ${r}$`, `$${polyTex(quotient)}$`, set],
    };
  },
  solution: rearrangeSolution,
};

interface RearrangeLineParams extends RearrangeParams {
  /** Name a root to start from. */
  hint: boolean;
  min: number;
  max: number;
}

/**
 * The same kind of inequality shaded on a number line. Difficulty 1 names a
 * root to start the factorising from; difficulty 2 leaves the trial to the
 * learner.
 */
const polyRearrangeLine: Generator<RearrangeLineParams> = {
  id: 'poly-rearrange-line',
  sample: (rng, difficulty) => {
    const params = sampleRearrange(rng, difficulty);
    return { ...params, hint: difficulty < 2, ...lineWindow(rng, params.roots) };
  },
  render: (params): Slide => {
    const { roots, op, min, max, hint } = params;
    return {
      kind: 'numberLine',
      prompt: [
        say(`Solve the inequality, then shade its solution set.${hint ? ` Once everything is on one side, $x = ${roots[1]}$ is a root.` : ''}`),
        show(rearrangedTex(params)),
      ],
      min,
      max,
      step: 1,
      answer: setAnswer(solutionPieces(oneSided(params), roots, op)),
    };
  },
  solution: rearrangeSolution,
};

/**
 * Which inequality has the same solutions once every factor is written
 * x - r: each minus taken out, from the lead or from an r - x, turns the sign
 * round, and an even number of them leaves it.
 */
const polyFlipChoice: Generator<IneqParams> = {
  id: 'poly-flip-choice',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty < 2) return { form: ineqForm(rng, [1, 1, 1], rng.pick([-1, -2])), op: rng.pick(INEQ_OPS) };
      const form = ineqForm(rng, [1, 1, 1], rng.pick([1, -1, 2]));
      const factors = form.factors.map((f) => (f.root > 0 && rng.chance(0.6) ? { ...f, form: 'reversed' as const } : f));
      if (!factors.some((f) => f.form === 'reversed')) continue;
      return { form: { ...form, factors }, op: rng.pick(INEQ_OPS) };
    }
  },
  render: ({ form, op }): Slide => {
    const plain = rootsForm(
      form.factors.map((f) => f.root),
      [1, 1, 1],
    );
    const negated = rootsForm(
      form.factors.map((f) => -f.root),
      [1, 1, 1],
    );
    const right = formLead(form) < 0 ? FLIP_OP[op] : op;
    return choiceSlide(
      [say('Which inequality has exactly the same solutions as this one?'), show(ineqDisplay(form, op))],
      options(
        { tex: ineqTex(plain, right) },
        { tex: ineqTex(plain, FLIP_OP[right]) },
        { tex: ineqTex(plain, TOGGLE_OP[right]) },
        { tex: ineqTex(negated, right) },
      ),
    );
  },
  solution: ({ form, op }) => {
    const minuses = (form.lead < 0 ? 1 : 0) + form.factors.filter((f) => f.form === 'reversed').length;
    const plain = rootsForm(
      form.factors.map((f) => f.root),
      [1, 1, 1],
    );
    return [
      ...(form.factors.some((f) => f.form === 'reversed') ? [{ text: 'Write each $r - x$ as $-(x - r)$, which takes out a $-1$.' }] : []),
      {
        text: `That makes $${minuses}$ ${minuses === 1 ? 'minus sign' : 'minus signs'} in front${
          Math.abs(form.lead) > 1 ? `, and a positive $${Math.abs(form.lead)}$ that can be divided out without changing anything` : ''
        }. ${minuses % 2 === 1 ? 'An odd number: multiplying by $-1$ clears it and turns the inequality round.' : 'An even number, which multiply to $+1$: nothing turns round.'}`,
      },
      { tex: ineqTex(plain, formLead(form) < 0 ? FLIP_OP[op] : op) },
    ];
  },
};

/* ================================================================
 * Level 6, lesson 5: reading and counting
 * ================================================================ */

/**
 * The set read off a sketch: the curve, where it meets the axis, and the
 * inequality, with four sets offered: the right one, the other sign, and each
 * with its ends the other way. Difficulty 2 is a quartic, sometimes touching.
 */
const polyReadGraph: Generator<IneqParams> = {
  id: 'poly-read-graph',
  sample: (rng, difficulty) => {
    for (;;) {
      const powers = difficulty > 1 ? rng.pick([[1, 1, 1, 1], withSquare(rng, 3)]) : [1, 1, 1];
      const roots = sampleRoots(rng, powers.length, 4).sort((a, b) => a - b);
      const form = rootsForm(roots, powers, rng.pick([1, -1]));
      if (!spaced(roots, powers) || !readable(formPoly(form), roots)) continue;
      return { form, op: rng.pick(INEQ_OPS) };
    }
  },
  render: ({ form, op }): Slide => {
    const p = formPoly(form);
    const roots = formRoots(form);
    const set = (o: Op) => setTex(solutionPieces(p, roots, o));
    return choiceSlide(
      [
        say(`The curve $y = p(x)$ meets the $x$-axis at $x = ${roots.join(',\\ ')}$, ringed. Which set solves $p(x) ${OP_TEX[op]} 0$?`),
        diagram(graphSvg(p, roots, 'A polynomial curve on squared paper with the points where it meets the x-axis ringed')),
      ],
      options({ tex: set(op) }, { tex: set(FLIP_OP[op]) }, { tex: set(TOGGLE_OP[op]) }, { tex: set(TOGGLE_OP[FLIP_OP[op]]) }),
    );
  },
  solution: ({ form, op }) => {
    const p = formPoly(form);
    const roots = formRoots(form);
    return [
      { text: `$p(x) ${OP_TEX[op]} 0$ asks where the curve is ${wantsPositive(op) ? 'above' : 'below'} the $x$-axis${isStrict(op) ? '' : ', or on it'}.` },
      {
        text: `Reading the sketch left to right, the curve is ${stretchSigns(p, roots)
          .map((s) => (s > 0 ? 'above' : 'below'))
          .join(', then ')}.`,
      },
      { tex: setDisplay(solutionPieces(p, roots, op)) },
    ];
  },
};

/**
 * How many whole numbers are in a bounded set: a quartic whose lead and sign
 * make the set a stretch or two between roots. Strictness moves the count by
 * the critical values. Difficulty 2 adds a negative lead or a squared factor.
 */
const polyIntegerCount: Generator<IneqParams> = {
  id: 'poly-integer-count',
  sample: (rng, difficulty) => {
    const form = difficulty > 1 ? ineqForm(rng, rng.pick([[1, 1, 1, 1], withSquare(rng, 3)]), rng.pick([1, -1])) : ineqForm(rng, [1, 1, 1, 1]);
    const ops: Op[] = formLead(form) > 0 ? ['<', '<='] : ['>', '>='];
    return { form, op: rng.pick(ops) };
  },
  choices: ({ form, op }) => {
    const p = formPoly(form);
    const count = wholeSolutions(p, op).length;
    return intOptions(count, [wholeSolutions(p, TOGGLE_OP[op]).length, count + 1, count - 1, formRoots(form).length], 0);
  },
  render: ({ form, op }): Slide => ({
    kind: 'expression',
    prompt: [say('How many whole numbers satisfy this inequality?'), show(ineqDisplay(form, op))],
    lead: '\\text{whole numbers} =',
    keypad: [],
    answer: String(wholeSolutions(formPoly(form), op).length),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ form, op }) => {
    const whole = wholeSolutions(formPoly(form), op);
    return [
      ...ineqSolution(form, op),
      { text: `The whole numbers in it are $${whole.join(',\\ ')}$: $${whole.length}$ of them.` },
    ];
  },
};

interface ReadLineParams {
  roots: number[];
  lead: number;
  op: Op;
  min: number;
  max: number;
}

/**
 * From a shaded line back to the inequality: the brackets from the dots and
 * the sign from which stretches are shaded and whether the dots are filled.
 * Difficulty 2 puts a minus in front, which turns the sign.
 */
const polyReadLineTiles: Generator<ReadLineParams> = {
  id: 'poly-read-line-tiles',
  sample: (rng, difficulty) => {
    const roots = sampleRoots(rng, 3, 4).sort((a, b) => a - b);
    return { roots, lead: difficulty > 1 && rng.chance(0.5) ? -1 : 1, op: rng.pick(INEQ_OPS), ...lineWindow(rng, roots) };
  },
  render: ({ roots, lead, op, min, max }): Slide => {
    const pieces = solutionPieces(fromRoots(roots, lead), roots, op);
    const answer = [...roots.map((r) => signedNum(-r)), OP_TEX[op]];
    return {
      kind: 'tiles',
      prompt: [
        say(`The shading is the solution set of a cubic inequality, the cubic against $0$. Complete it, with the brackets in order of their roots, smallest first.`),
        diagram(numberLineSvg(min, max, pieces, 'A solution set shaded on a number line')),
      ],
      template: `${lead < 0 ? '-' : ''}(x {0})(x {1})(x {2}) \\; {3} \\; 0`,
      bank: fillBank(answer, [...roots.map((r) => signedNum(r)), ...INEQ_OPS.map((o) => OP_TEX[o])]),
      answer,
    };
  },
  solution: ({ roots, lead, op }) => {
    const pieces = solutionPieces(fromRoots(roots, lead), roots, op);
    const form = rootsForm(roots, [1, 1, 1], lead);
    return [
      { text: `The dots are at $${roots.join(',\\ ')}$, so the brackets are $${formTex(rootsForm(roots, [1, 1, 1]))}$.` },
      {
        text: `${lead < 0 ? 'With the minus in front the' : 'The'} cubic is ${signWord(lead)} on the far right, so left to right it is $${stretchSigns(fromRoots(roots, lead), roots)
          .map(signCell)
          .join('\\;')}$. The shading is on the ${wantsPositive(op) ? 'positive' : 'negative'} stretches.`,
      },
      { text: `The dots are ${isStrict(op) ? 'hollow, so the ends are left out' : 'filled, so the ends are included'}: $${setTex(pieces)}$.` },
      { tex: ineqTex(form, op) },
    ];
  },
};

/**
 * Shade a quartic's set: two, three or four critical values, so up to five
 * stretches. Difficulty 2 adds a negative lead, a squared factor or an r - x.
 */
const polyQuarticLine: Generator<IneqLineParams> = {
  id: 'poly-quartic-line',
  sample: (rng, difficulty) => {
    let form: Form;
    if (difficulty > 1) {
      const base = ineqForm(rng, rng.pick([[1, 1, 1, 1], withSquare(rng, 3)]), rng.pick([1, -1]));
      form = { ...base, factors: base.factors.map((f) => (f.power === 1 && f.root > 0 && rng.chance(0.3) ? { ...f, form: 'reversed' as const } : f)) };
    } else {
      form = ineqForm(rng, [1, 1, 1, 1]);
    }
    return { form, op: rng.pick(INEQ_OPS), ...lineWindow(rng, formRoots(form)) };
  },
  render: ({ form, op, min, max }): Slide => ({
    kind: 'numberLine',
    prompt: [say('Solve the inequality, then shade its solution set on the number line.'), show(ineqDisplay(form, op))],
    min,
    max,
    step: 1,
    answer: setAnswer(solutionPieces(formPoly(form), formRoots(form), op)),
  }),
  solution: ({ form, op }) => ineqSolution(form, op),
};

/* ================================================================
 * Level 7: modelling with polynomials
 * ================================================================ */

/**
 * An open box folded from a rectangular sheet L cm by W cm, both even and
 * W < L: a square of side x is cut from each corner and the sides folded up,
 * so V = x(L - 2x)(W - 2x), and there is a box only for 0 < x < W/2. Half of
 * each side is whole, so every volume at a whole cut is a multiple of 4 and
 * V = T divides through by 4 into a monic cubic with whole coefficients.
 *
 * Nothing in this level is calculus. Differentiation's `df-l8` finds the
 * largest box by differentiating; here it is read off a table or a slider.
 * So no slide declares `source`, `integrand` or `limits`, and the oracle in
 * `generators.test.ts` has nothing to run; `polynomials.test.ts` rebuilds
 * V(x) from the sheet each prompt states and holds every slide to that.
 */
interface Sheet {
  L: number;
  W: number;
}

const boxPoly = ({ L, W }: Sheet): Poly => mulPoly([1, 0], mulPoly([-2, L], [-2, W]));
const boxAt = ({ L, W }: Sheet, x: number): number => x * (L - 2 * x) * (W - 2 * x);
const boxTex = ({ L, W }: Sheet): string => `x(${L} - 2x)(${W} - 2x)`;
/** The largest whole cut that still leaves a base. */
const lastCut = ({ W }: Sheet): number => W / 2 - 1;

function sheetStory({ L, W }: Sheet): string {
  return `A sheet of card $${L}$ cm by $${W}$ cm has a square of side $x$ cm cut from each corner, and the sides are folded up to make an open box.`;
}

/**
 * A rectangular sheet. Difficulty 1 stays small, so the table and the cubic
 * are short; difficulty 2 runs to 30 cm with more cuts to choose between.
 */
function sampleSheet(rng: Rng, difficulty: number): Sheet {
  if (difficulty > 1) {
    const W = 2 * rng.int(6, 13);
    return { L: W + 2 * rng.int(1, Math.min(6, (30 - W) / 2)), W };
  }
  const W = 2 * rng.int(4, 9);
  return { L: W + 2 * rng.int(1, 5), W };
}

/** A whole cut strictly inside the box's range. */
const sampleCut = (rng: Rng, sheet: Sheet, most = lastCut(sheet)): number => rng.int(1, Math.min(most, lastCut(sheet)));

interface BoxSidesParams extends Sheet {
  /** Difficulty 2 leaves the height to place as well. */
  height: boolean;
}

/** The volume formula from the story: the height and the two sides of the base. */
const polyBoxSidesTiles: Generator<BoxSidesParams> = {
  id: 'poly-box-sides-tiles',
  sample: (rng, difficulty) => ({ ...sampleSheet(rng, difficulty), height: difficulty > 1 }),
  render: ({ L, W, height }): Slide => {
    const sides = [`${L} - 2x`, `${W} - 2x`];
    const answer = height ? ['x', ...sides] : sides;
    return {
      kind: 'tiles',
      prompt: [
        say(sheetStory({ L, W })),
        say(
          height
            ? 'Its volume is height times length times width. Build the formula: the height, then the length of the base, then its width.'
            : 'Its volume is height times length times width. Fill in the length and the width of the base.',
        ),
      ],
      template: height ? 'V = {0}({1})({2})' : 'V = x({0})({1})',
      bank: fillBank(answer, [`${L} - x`, `${W} - x`, `${L} - 4x`, ...(height ? ['2x'] : [`${W} - 4x`])]),
      answer,
      unordered: !height,
    };
  },
  solution: ({ L, W }) => [
    { text: `A square of side $x$ comes off both ends of every edge, so each side of the base loses $2x$: it is $${L} - 2x$ by $${W} - 2x$.` },
    { text: 'The flaps fold up to make the sides, so the box is $x$ tall.' },
    { tex: `V = ${boxTex({ L, W })}` },
  ],
};

/** The volume multiplied out: the base first, then the height. */
const polyBoxExpandSteps: Generator<Sheet> = {
  id: 'poly-box-expand-steps',
  sample: sampleSheet,
  render: (sheet): Slide => {
    const { L, W } = sheet;
    const S = 2 * (L + W);
    const P = L * W;
    const bracket = (p: Poly) => `(${polyTex(p)})`;
    const base: Poly = [4, -S, P];
    return {
      kind: 'steps',
      prompt: [
        say(sheetStory(sheet)),
        say(`Its volume is $V = ${boxTex(sheet)}$. Multiply it out: the base's two brackets first, then the height. Tap the part you would do **next**, then choose what it comes to.`),
      ],
      start: ['x', `(${L} - 2x)`, `(${W} - 2x)`],
      reductions: [
        {
          span: [1, 3],
          value: bracket(base),
          bank: stepBank(bracket(base), bracket([4, S, P]), bracket([2, -S, P]), bracket([4, -S / 2, P])),
        },
        {
          span: [0, 2],
          value: polyTex(boxPoly(sheet)),
          bank: stepBank(polyTex(boxPoly(sheet)), polyTex([4, -S, 0, P]), polyTex([4, S, P, 0]), polyTex([4, -S, -P, 0])),
        },
      ],
    };
  },
  solution: (sheet) => {
    const { L, W } = sheet;
    return [
      { text: 'Each term of one bracket times each of the other. The two $x$ terms collect, and $-2x$ times $-2x$ is $+4x^{2}$:' },
      { tex: chain(`&(${L} - 2x)(${W} - 2x)`, `=\\;&${L * W} - ${2 * W}x - ${2 * L}x + 4x^{2}`, `=\\;&${polyTex([4, -2 * (L + W), L * W])}`) },
      { text: 'Then every term times the height $x$, each power going up by one:' },
      { tex: `V = ${polyTex(boxPoly(sheet))}` },
    ];
  },
};

interface BoxDomainParams extends Sheet {
  /** Difficulty 2 goes on to count the whole cuts. */
  whole: boolean;
}

/** Where the model makes sense, one length at a time. */
const polyBoxDomainFlow: Generator<BoxDomainParams> = {
  id: 'poly-box-domain-flow',
  sample: (rng, difficulty) => ({ ...sampleSheet(rng, difficulty), whole: difficulty > 1 }),
  render: (params): Slide => {
    const { L, W, whole } = params;
    const key = `${L}|${W}|${whole}`;
    const half = W / 2;
    const range = `$0 < x < ${half}$`;
    const steps: Extract<Slide, { kind: 'flow' }>['steps'] = [
      {
        id: 'low',
        ask: 'The cut $x$ is a length. What does that tell you?',
        branches: turned(
          [
            { label: '$x > 0$', to: 'short' },
            { label: '$x \\ge 0$', outcome: 'At $x = 0$ nothing is cut, nothing folds up, and there is no box.' },
            { label: '$x < 0$', outcome: 'A length is never negative.' },
          ],
          key,
        ),
      },
      {
        id: 'short',
        ask: `The base is $${L} - 2x$ by $${W} - 2x$, and both must stay positive. Which runs out first as $x$ grows?`,
        branches: turned(
          [
            { label: `$${W} - 2x$`, to: 'range' },
            { label: `$${L} - 2x$`, outcome: `When $${W} - 2x$ reaches $0$, $${L} - 2x$ is still $${L - W}$.` },
          ],
          `${key}|short`,
        ),
      },
      {
        id: 'range',
        ask: 'So which values of $x$ make a box?',
        branches: turned(
          [
            whole ? { label: range, to: 'count' } : { label: range, outcome: 'That is where the model describes a box.' },
            { label: `$0 < x < ${L / 2}$`, outcome: `Past $x = ${half}$ the width $${W} - 2x$ is negative.` },
            L / 2 === W
              ? { label: `$0 < x \\le ${half}$`, outcome: `At $x = ${half}$ the base has no width, so there is no box.` }
              : { label: `$0 < x < ${W}$`, outcome: `$${W} - 2x > 0$ gives $2x < ${W}$, so $x < ${half}$.` },
          ],
          `${key}|range`,
        ),
      },
    ];
    if (whole) {
      steps.push({
        id: 'count',
        ask: 'The cut is a whole number of centimetres. How many different boxes can be made?',
        branches: turned(
          [
            { label: `$${half - 1}$`, outcome: `Right: $x = 1$ up to $x = ${half - 1}$.` },
            { label: `$${half}$`, outcome: `$x = ${half}$ leaves a base with no width, so it is not in the range.` },
            { label: `$${half + 1}$`, outcome: 'Neither end of the range makes a box, so neither counts.' },
          ],
          `${key}|count`,
        ),
      });
    }
    return {
      kind: 'flow',
      prompt: [say(sheetStory(params)), say('Work out which cuts give a box, one decision at a time.')],
      subject: `V = ${boxTex(params)}`,
      steps,
      answer: ['$x > 0$', `$${W} - 2x$`, range, ...(whole ? [`$${half - 1}$`] : [])],
    };
  },
  solution: ({ L, W, whole }) => [
    { text: 'Every length in the box must be positive: the height $x$, and both sides of the base.' },
    { text: `So $x > 0$; $${L} - 2x > 0$ gives $x < ${L / 2}$; and $${W} - 2x > 0$ gives $x < ${W / 2}$.` },
    { text: `The narrower side runs out first, so $0 < x < ${W / 2}$.${whole ? ` The whole numbers in that range are $1$ to $${W / 2 - 1}$: $${W / 2 - 1}$ boxes.` : ''}` },
  ],
};

interface BoxCoefficientParams extends Sheet {
  /** The power whose coefficient is asked: 2 or 1. */
  power: number;
}

/** One coefficient of the expanded volume, typed. */
const polyBoxCoefficient: Generator<BoxCoefficientParams> = {
  id: 'poly-box-coefficient',
  sample: (rng, difficulty) => ({ ...sampleSheet(rng, difficulty), power: difficulty > 1 ? 2 : rng.pick([1, 2]) }),
  choices: ({ L, W, power }) =>
    power === 2
      ? intOptions(-2 * (L + W), [-(L + W), 2 * (L + W), -4 * (L + W), -(2 * L + W)])
      : intOptions(L * W, [2 * L * W, 4 * L * W, (L - 2) * (W - 2), L * W / 2]),
  render: (params): Slide => {
    const letter = params.power === 2 ? 'b' : 'c';
    return {
      kind: 'expression',
      prompt: [
        say(sheetStory(params)),
        show(`V = ${boxTex(params)}`),
        say(`Multiplied out, $V = 4x^{3} + bx^{2} + cx$. Find $${letter}$.`),
      ],
      lead: `${letter} =`,
      keypad: [],
      answer: String(coefficientOf(boxPoly(params), params.power)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { L, W, power } = params;
    return [
      { text: 'Multiply the base out first:' },
      { tex: chain(`&(${L} - 2x)(${W} - 2x)`, `=\\;&${polyTex([4, -2 * (L + W), L * W])}`) },
      { text: 'Times $x$, every power goes up by one:' },
      { tex: `V = ${polyTex(boxPoly(params))}` },
      {
        text:
          power === 2
            ? `So $b = ${-2 * (L + W)}$: the $x^{2}$ term comes from $x$ times $-${2 * W}x - ${2 * L}x$, and both are negative.`
            : `So $c = ${L * W}$: the $x$ term comes from $x$ times $${L} \\times ${W}$.`,
      },
    ];
  },
};

/* ---------- lesson 2: values and the table ---------- */

interface BoxCutParams extends Sheet {
  x: number;
}

function sampleBoxCut(rng: Rng, difficulty: number): BoxCutParams {
  const sheet = sampleSheet(rng, difficulty);
  return { ...sheet, x: sampleCut(rng, sheet, difficulty > 1 ? lastCut(sheet) : 3) };
}

/** The volume at one whole cut, typed. */
const polyBoxVolume: Generator<BoxCutParams> = {
  id: 'poly-box-volume',
  sample: sampleBoxCut,
  choices: (params) => {
    const { L, W, x } = params;
    return intOptions(boxAt(params, x), [x * L * W, (L - 2 * x) * (W - 2 * x), x * (L - x) * (W - x), x * (L - 2 * x) * W], 1);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(sheetStory(params)),
      show(`V = ${boxTex(params)}`),
      say(`How many cubic centimetres does the box hold when $x = ${params.x}$?`),
    ],
    lead: 'V =',
    keypad: [],
    answer: String(boxAt(params, params.x)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { L, W, x } = params;
    return [
      { text: `Put $x = ${x}$ into each bracket: the height, then the length and width of the base.` },
      { tex: chain(`V &= ${x}(${L} - ${2 * x})(${W} - ${2 * x})`, `&= ${x} \\times ${L - 2 * x} \\times ${W - 2 * x}`, `&= ${boxAt(params, x)}`) },
    ];
  },
};

/** The same volume as a tree: the two sides, the base, then the box. */
const polyBoxValueTree: Generator<BoxCutParams> = {
  id: 'poly-box-value-tree',
  sample: sampleBoxCut,
  render: (params): Slide => {
    const { L, W, x } = params;
    const a = L - 2 * x;
    const b = W - 2 * x;
    const answer = [a, b, a * b, x * a * b];
    return {
      kind: 'tree',
      prompt: [
        say(sheetStory(params)),
        say(
          `Work out its volume when $x = ${x}$. Along the top, the length and the width of the base; under them, the area of the base; last, the volume, which is that area times the height.`,
        ),
      ],
      expression: `${x}(${L} - 2 \\times ${x})(${W} - 2 \\times ${x})`,
      nodes: [
        { id: 'len', from: [] },
        { id: 'wid', from: [] },
        { id: 'base', from: ['len', 'wid'] },
        { id: 'vol', from: ['base'] },
      ],
      bank: numberBank(answer, [L - x, W - x, (L - x) * (W - x), a + b, x * a, 2 * x * a * b]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { L, W, x } = params;
    const a = L - 2 * x;
    const b = W - 2 * x;
    return [
      { text: `Each side of the base loses $2 \\times ${x} = ${2 * x}$:` },
      { tex: chain(`${L} - ${2 * x} &= ${a}`, `${W} - ${2 * x} &= ${b}`) },
      { tex: chain(`\\text{base} &= ${a} \\times ${b} = ${a * b}`, `V &= ${a * b} \\times ${x} = ${x * a * b}`) },
    ];
  },
};

interface BoxTableParams extends Sheet {
  /** Blank cells as [row, column], columns 1 and 2 the sides and 3 the volume. */
  blanks: [number, number][];
}

/** How many rows a table shows: one per whole cut, five at most. */
const tableRows = (sheet: Sheet): number => Math.min(lastCut(sheet), 5);

/**
 * A table of volumes, a row per whole cut. Difficulty 1 leaves two volumes
 * to fill; difficulty 2 a length, a width and two volumes, in different rows.
 */
const polyBoxTable: Generator<BoxTableParams> = {
  id: 'poly-box-table',
  sample: (rng, difficulty) => {
    const sheet = sampleSheet(rng, difficulty);
    const rows = rng.sample(
      Array.from({ length: tableRows(sheet) }, (_, i) => i),
      difficulty > 1 ? 4 : 2,
    );
    const blanks: [number, number][] =
      difficulty > 1
        ? [
            [rows[0], 1],
            [rows[1], 2],
            [rows[2], 3],
            [rows[3], 3],
          ]
        : rows.map((row) => [row, 3]);
    return { ...sheet, blanks };
  },
  render: (params): Slide => {
    const { L, W, blanks } = params;
    const answer: number[] = [];
    const slips: number[] = [];
    const rows = Array.from({ length: tableRows(params) }, (_, i) => {
      const x = i + 1;
      const cells = [x, L - 2 * x, W - 2 * x, boxAt(params, x)];
      return cells.map((value, col) => {
        if (col === 0 || !blanks.some(([r, c]) => r === i && c === col)) return String(value);
        answer.push(value);
        slips.push(col === 3 ? (L - 2 * x) * (W - 2 * x) : col === 1 ? L - x : W - x);
        return null;
      });
    });
    return {
      kind: 'table',
      prompt: [
        say(sheetStory(params)),
        say(`Its volume is $V = ${boxTex(params)}$. Fill in the gaps in the table, one row for each whole-number cut.`),
      ],
      // Braced, so KaTeX keeps each header on one line rather than breaking at the minus.
      columns: ['x', `{${L} - 2x}`, `{${W} - 2x}`, 'V'],
      rows,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { L, W } = params;
    return [
      { text: 'For each row, take $2x$ off each side, then multiply the height by both sides.' },
      {
        tex: chain(
          ...Array.from({ length: tableRows(params) }, (_, i) => {
            const x = i + 1;
            return `V(${x}) &= ${x} \\times ${L - 2 * x} \\times ${W - 2 * x} = ${boxAt(params, x)}`;
          }),
        ),
      },
    ];
  },
};

/** The whole cut with the largest volume. */
function bestCut(sheet: Sheet): number {
  let best = 1;
  for (let x = 2; x <= lastCut(sheet); x += 1) if (boxAt(sheet, x) > boxAt(sheet, best)) best = x;
  return best;
}

/** Where the volume actually peaks, which the slider's whole answer must sit close to. */
const peakOf = ({ L, W }: Sheet): number => (L + W - Math.sqrt(L * L - L * W + W * W)) / 6;

/**
 * Slide to the cut that makes the biggest box. Only sheets whose true peak
 * sits within a quarter of a whole number, so the top of the hill is plain to
 * see and the whole answer is not a coin toss between two cuts. That filter
 * throws out half of all sheets, so this one runs the length on to 40 cm to
 * keep 25 questions; the width stays at most 30.
 */
const polyBoxBestSlider: Generator<Sheet> = {
  id: 'poly-box-best-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const W = 2 * (difficulty > 1 ? rng.int(8, 15) : rng.int(4, 8));
      const sheet = { L: W + 2 * rng.int(1, (40 - W) / 2), W };
      if (Math.abs(peakOf(sheet) - bestCut(sheet)) > 0.25) continue;
      return sheet;
    }
  },
  render: (sheet): Slide => {
    const end = sheet.W / 2;
    const top = boxAt(sheet, peakOf(sheet));
    return {
      kind: 'slider',
      prompt: [
        say(sheetStory(sheet)),
        show(`V = ${boxTex(sheet)}`),
        say('The graph shows $V$ for every cut from $0$ to where the base runs out. Slide to the whole-number cut that makes the biggest box.'),
      ],
      min: 0,
      max: end,
      step: 1,
      answer: bestCut(sheet),
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: end,
          yMin: -top * 0.08,
          yMax: top * 1.2,
          curves: [{ f: (x) => boxAt(sheet, x) }],
          verticals: [{ x: 0, dashed: false }],
          // A dot at each whole cut: the candidates the slider stops at.
          marks: Array.from({ length: lastCut(sheet) }, (_, i) => ({ x: i + 1, y: boxAt(sheet, i + 1) })),
          label: `Volume against the cut, a hill rising from zero at x = 0 and falling back to zero at x = ${end}, with a dot at each whole-number cut`,
        }),
        ...markerWindow(0, end),
      },
    };
  },
  solution: (sheet) => {
    const best = bestCut(sheet);
    const around = [best - 1, best, best + 1];
    return [
      { text: 'Compare the volumes either side of the top of the hill:' },
      { tex: chain(...around.map((x) => `V(${x}) &= ${boxAt(sheet, x)}`)) },
      { text: `$x = ${best}$ gives the most. Differentiation finds the exact top of the hill; for a whole-number cut, the table is enough.` },
    ];
  },
};

/* ---------- lesson 3: a given volume ---------- */

/**
 * Every box problem where V = T has three whole solutions: two cuts `k < m`
 * inside the box's range and one `n` past the end of the sheet, which is
 * thrown out. Built by search once, from half-sides up to 20 and 15, so every
 * quotient factorises with whole numbers by construction.
 */
interface Target extends Sheet {
  k: number;
  m: number;
  n: number;
  T: number;
}

const TARGETS: Target[] = (() => {
  const out: Target[] = [];
  for (let w = 3; w <= 15; w += 1) {
    for (let l = w + 1; l <= 20; l += 1) {
      for (let k = 1; k < w; k += 1) {
        const sum = l + w - k;
        const disc = sum * sum - 4 * (l - k) * (w - k);
        const root = Math.round(Math.sqrt(disc));
        if (root * root !== disc || (sum + root) % 2 !== 0) continue;
        const m = (sum - root) / 2;
        if (m <= k) continue;
        out.push({ L: 2 * l, W: 2 * w, k, m, n: (sum + root) / 2, T: 4 * k * (l - k) * (w - k) });
      }
    }
  }
  return out;
})();

/** The cubic V = T divided through by 4: x^3 - (l + w)x^2 + lwx - T/4. */
const quarterCubic = ({ L, W }: Sheet, T: number): Poly => [1, -(L + W) / 2, (L * W) / 4, -T / 4];

interface BoxCubicParams extends BoxCutParams {
  /** Difficulty 2 starts from the brackets rather than the expansion. */
  factored: boolean;
}

/** V = T as a cubic equal to zero, divided by 4. */
const polyBoxCubicSteps: Generator<BoxCubicParams> = {
  id: 'poly-box-cubic-steps',
  sample: (rng, difficulty) => ({ ...sampleBoxCut(rng, difficulty), factored: difficulty > 1 }),
  render: (params): Slide => {
    const { L, W, x, factored } = params;
    const T = boxAt(params, x);
    const cubic = boxPoly(params);
    const S = 2 * (L + W);
    const P = L * W;
    const moved = `${polyTex(addPoly(cubic, [-T]))} = 0`;
    const quarter = `${polyTex(quarterCubic(params, T))} = 0`;
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [
      {
        span: [0, 3],
        operator: 1,
        value: moved,
        bank: stepBank(moved, `${polyTex(addPoly(cubic, [T]))} = 0`, `${polyTex(cubic)} = 0`, `${polyTex(addPoly(cubic, [-T]))} = ${T}`),
      },
      {
        span: [0, 1],
        value: quarter,
        bank: stepBank(
          quarter,
          `${polyTex([1, -S / 4, P / 4, -T])} = 0`,
          `${polyTex([1, -S / 2, P / 4, -T / 4])} = 0`,
          `${polyTex([1, -S / 4, P, -T / 4])} = 0`,
        ),
      },
    ];
    if (factored) {
      reductions.unshift({
        span: [0, 1],
        value: polyTex(cubic),
        bank: stepBank(polyTex(cubic), polyTex([4, -S, 0, P]), polyTex([4, S, P, 0]), polyTex([4, -S / 2, P, 0])),
      });
    }
    return {
      kind: 'steps',
      prompt: [
        say(sheetStory(params)),
        say(
          `The box must hold $${T}$ cm³. Turn that into a cubic equal to $0$${factored ? ', multiplying out first' : ''}, then divide through by $4$. Tap the part you would do **next**, then choose what it becomes.`,
        ),
      ],
      start: [factored ? boxTex(params) : polyTex(cubic), '=', String(T)],
      reductions,
    };
  },
  solution: (params) => {
    const T = boxAt(params, params.x);
    const cubic = boxPoly(params);
    return [
      { text: 'Multiplied out, the volume is' },
      { tex: `V = ${polyTex(cubic)}` },
      { text: `Take $${T}$ from both sides so the cubic equals $0$:` },
      { tex: equationDisplay(addPoly(cubic, [-T])) },
      { text: 'Every coefficient is a multiple of $4$, so divide through, which leaves smaller numbers to try roots with:' },
      { tex: equationDisplay(quarterCubic(params, T)) },
    ];
  },
};

/** One whole solution of V = T, divided out by synthetic division. */
const polyBoxDivideTree: Generator<BoxCutParams> = {
  id: 'poly-box-divide-tree',
  sample: sampleBoxCut,
  render: (params): Slide => {
    const { x } = params;
    const T = boxAt(params, x);
    const f = quarterCubic(params, T);
    const { quotient } = divideBy(f, x);
    const wrong = divideBy(f, -x);
    return {
      kind: 'tree',
      prompt: [
        say(sheetStory(params)),
        say(
          `For a box holding $${T}$ cm³, $V = ${T}$ divides by $4$ into $f(x) = 0$, and $x = ${x}$ is one solution. Divide $f(x)$ by $(${linTex(x)})$: bring the first coefficient down, then at each step multiply by $${x}$ and add the next. Fill in from the top, ending with the remainder.`,
        ),
        show(`\\begin{array}{r|rrrr} ${x} & ${f.join(' & ')} \\end{array}`),
      ],
      expression: `\\frac{${polyTex(f)}}{${linTex(x)}}`,
      nodes: [
        { id: 'c2', from: [] },
        { id: 'c1', from: ['c2'] },
        { id: 'c0', from: ['c1'] },
        { id: 'rem', from: ['c0'] },
      ],
      bank: numberBank([...quotient, 0], [...wrong.quotient, wrong.remainder, f[1], f[2], -quotient[1], -quotient[2]].filter((v) => Math.abs(v) < 1000)),
      answer: [...quotient, 0].map(String),
    };
  },
  solution: (params) => {
    const { x } = params;
    const f = quarterCubic(params, boxAt(params, x));
    const { quotient } = divideBy(f, x);
    const step = (c: number, next: number, out: number) => `${factor(String(c))} \\times ${x} + ${factor(String(next))} &= ${out}`;
    return [
      { text: `Bring down $1$, then multiply by $${x}$ and add the next coefficient each time.` },
      { tex: chain(step(quotient[0], f[1], quotient[1]), step(quotient[1], f[2], quotient[2]), step(quotient[2], f[3], 0)) },
      { text: `The remainder is $0$, as it must be for a root, and $f(x) = (${linTex(x)})(${polyTex(quotient)})$.` },
    ];
  },
};

interface BoxRootParams {
  target: Target;
  /** The solution handed over at difficulty 1; null to find one by trial. */
  given: number | null;
}

function sampleBoxRoot(rng: Rng, difficulty: number): BoxRootParams {
  const target = rng.pick(TARGETS);
  return { target, given: difficulty > 1 ? null : rng.pick([target.k, target.m]) };
}

/** The target and what dividing leaves: the known root, the quotient and the other two. */
function boxRootParts({ target, given }: BoxRootParams) {
  const { k, m, n, T } = target;
  const f = quarterCubic(target, T);
  const first = given ?? k;
  const [p, q] = [k, m, n].filter((r) => r !== first);
  return { f, first, others: [p, q], quotient: divideBy(f, first).quotient, T };
}

function boxRootSolution(params: BoxRootParams): SolutionStep[] {
  const { target } = params;
  const { f, first, others, quotient, T } = boxRootParts(params);
  return [
    { text: `$V = ${T}$, with everything on one side and divided by $4$, is` },
    { tex: equationDisplay(f) },
    {
      text:
        params.given === null
          ? `Trying $x = 1, 2, 3, \\dots$ in turn, $x = ${first}$ is the first to make it $0$, so $(${linTex(first)})$ is a factor. Dividing by it leaves a quadratic:`
          : `$x = ${first}$ is a solution, so $(${linTex(first)})$ is a factor. Dividing by it leaves a quadratic:`,
    },
    { tex: chain(`&(${linTex(first)})(${polyTex(quotient)})`, `=\\;&(${linTex(first)})(${linTex(others[0])})(${linTex(others[1])})`) },
    {
      text: `So $x = ${target.k}$, $${target.m}$ or $${target.n}$. A box needs $0 < x < ${target.W / 2}$, so $x = ${target.n}$ is thrown out: cutting $${target.n}$ cm squares from a $${target.W}$ cm side is impossible. Both $x = ${target.k}$ and $x = ${target.m}$ make a box holding $${T}$ cm³.`,
    },
  ];
}

/** V = T solved as forks: a root, the quotient, the other roots, and which make a box. */
const polyBoxRootFlow: Generator<BoxRootParams> = {
  id: 'poly-box-root-flow',
  sample: sampleBoxRoot,
  render: (params): Slide => {
    const { target, given } = params;
    const { k, m, n, W } = target;
    const { f, first, others, quotient, T } = boxRootParts(params);
    const key = `${target.L}|${W}|${k}|${given}`;
    const pair = (a: number, b: number) => `$x = ${a}$ or $x = ${b}$`;
    const right = pair(others[0], others[1]);
    const box = pair(k, m);
    const steps: Extract<Slide, { kind: 'flow' }>['steps'] = [];
    if (given === null) {
      const misses = [first + 1, first + 2, first - 1, first + 3].filter((j) => j > 0 && valueAt(f, j) !== 0).slice(0, 2);
      steps.push({
        id: 'root',
        ask: 'Try small whole numbers in $f(x)$. Which makes $f(x) = 0$, and so gives a factor?',
        branches: turned(
          [
            { label: `$x = ${first}$`, to: 'divide' },
            ...misses.map((j) => ({ label: `$x = ${j}$`, outcome: `$f(${j}) = ${valueAt(f, j)}$, not $0$.` })),
          ],
          `${key}|root`,
        ),
      });
    }
    const slipQuotients = [
      [1, -quotient[1], quotient[2]],
      [1, quotient[1], -quotient[2]],
    ].map((c) => `$${polyTex(c)}$`);
    steps.push(
      {
        id: 'divide',
        ask: `Dividing $f(x)$ by $(${linTex(first)})$ leaves which quadratic?`,
        branches: turned(
          [
            { label: `$${polyTex(quotient)}$`, to: 'solve' },
            ...slipQuotients.map((label) => ({ label, outcome: `Multiply it back by $(${linTex(first)})$: it does not give $f(x)$.` })),
          ],
          `${key}|divide`,
        ),
      },
      {
        id: 'solve',
        ask: 'That quadratic factorises. What are its solutions?',
        branches: turned(
          [
            { label: right, to: 'fit' },
            { label: pair(-others[1], -others[0]), outcome: 'Those make each bracket zero with the sign the wrong way round.' },
            {
              label: pair(others[0] + 1, others[1] - 1),
              outcome: `Their product is $${(others[0] + 1) * (others[1] - 1)}$, but the quadratic's constant term is $${quotient[2]}$.`,
            },
          ],
          `${key}|solve`,
        ),
      },
      {
        id: 'fit',
        ask: `A box needs $0 < x < ${W / 2}$. Which solutions of $f(x) = 0$ give a box?`,
        branches: turned(
          [
            { label: box, outcome: `Both make a box holding $${T}$ cm³.` },
            { label: `$x = ${k}$, $${m}$ or $${n}$`, outcome: `At $x = ${n}$ the width $${W} - 2x$ is $${W - 2 * n}$: that is not a box.` },
            { label: `$x = ${n}$ only`, outcome: `$x = ${n}$ is past the end of the range; the other two are inside it.` },
          ],
          `${key}|fit`,
        ),
      },
    );
    return {
      kind: 'flow',
      prompt: [
        say(sheetStory(target)),
        say(
          `The box must hold $${T}$ cm³. Everything on one side and divided by $4$, that is $f(x) = 0$ below.${
            given === null ? '' : ` One solution is $x = ${given}$.`
          } Solve it one decision at a time.`,
        ),
      ],
      subject: `${polyTex(f)} = 0`,
      steps,
      answer: [...(given === null ? [`$x = ${first}$`] : []), `$${polyTex(quotient)}$`, right, box],
    };
  },
  solution: boxRootSolution,
};

interface BoxOtherParams extends BoxRootParams {
  /** With no root given, which of the two cuts is asked for. */
  larger: boolean;
}

/** The other cut that makes the same volume, typed. */
const polyBoxOtherRoot: Generator<BoxOtherParams> = {
  id: 'poly-box-other-root',
  sample: (rng, difficulty) => ({ ...sampleBoxRoot(rng, difficulty), larger: rng.chance(0.5) }),
  choices: (params) => {
    const { k, m, n, L, W } = params.target;
    const answer = otherCut(params);
    return intOptions(answer, [n, answer === k ? m : k, W / 2, L / 2 - answer, k + m], 1);
  },
  render: (params): Slide => {
    const { target, given, larger } = params;
    return {
      kind: 'expression',
      prompt: [
        say(sheetStory(target)),
        say(
          given === null
            ? `Two different cuts make a box holding $${target.T}$ cm³. Find the ${larger ? 'larger' : 'smaller'} one.`
            : `Cutting $x = ${given}$ makes a box holding $${target.T}$ cm³. One other cut makes a box of the same volume. Find it.`,
        ),
      ],
      lead: 'x =',
      keypad: [],
      answer: String(otherCut(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => [...boxRootSolution(params), { text: `So the answer is $x = ${otherCut(params)}$.` }],
};

function otherCut({ target, given, larger }: BoxOtherParams): number {
  if (given !== null) return given === target.k ? target.m : target.k;
  return larger ? target.m : target.k;
}

/* ---------- lesson 4: fitting a curve ---------- */

interface FitParams {
  /** Smallest first. With `touch`, the first is where the curve touches. */
  roots: number[];
  lead: number;
  touch: boolean;
}

const fitForm = ({ roots, lead, touch }: FitParams): Form => rootsForm(roots, touch ? [2, 1] : [1, 1, 1], lead);

/**
 * A cubic's equation from where it meets the axes, as tiles: the number in
 * front, then each bracket's number. The lead is never 1, and never the size
 * of a root, so no two tiles the answer needs can look alike.
 */
const polyFitTiles: Generator<FitParams> = {
  id: 'poly-fit-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const lead = rng.pick([2, -2, 3, -3]);
      const touch = difficulty > 1;
      const roots = sampleRoots(rng, touch ? 2 : 3, 4);
      if (roots.some((r) => Math.abs(r) === Math.abs(lead))) continue;
      if (!touch) roots.sort((a, b) => a - b);
      return { roots, lead, touch };
    }
  },
  render: (params): Slide => {
    const { roots, lead, touch } = params;
    const d = valueAt(formPoly(fitForm(params)), 0);
    const answer = [String(lead), ...roots.map((r) => signedNum(-r))];
    return {
      kind: 'tiles',
      prompt: [
        say(
          touch
            ? `A cubic touches the $x$-axis at $x = ${roots[0]}$, crosses it at $x = ${roots[1]}$, and meets the $y$-axis at $y = ${d}$. Complete its equation.`
            : `A cubic crosses the $x$-axis at $x = ${roots.join(',\\ ')}$ and meets the $y$-axis at $y = ${d}$. Complete its equation, with the brackets in the order the roots are listed.`,
        ),
      ],
      template: touch ? 'y = {0}(x {1})^2(x {2})' : 'y = {0}(x {1})(x {2})(x {3})',
      bank: fillBank(answer, [String(-lead), String(d), ...roots.map((r) => signedNum(r))]),
      answer,
    };
  },
  solution: (params) => {
    const { roots, lead, touch } = params;
    const monic = valueAt(formPoly(fitForm({ ...params, lead: 1 })), 0);
    const d = lead * monic;
    return [
      {
        text: `A root at $x = r$ is a bracket $(x - r)$${touch ? `, and touching at $x = ${roots[0]}$ makes its bracket squared` : ''}. A number $a$ in front changes neither.`,
      },
      { tex: `y = a${formTex(fitForm({ ...params, lead: 1 }))}` },
      { text: `At $x = 0$ the brackets alone give $${monic}$, and the curve is at $${d}$, so $a = ${d} \\div ${factor(String(monic))} = ${lead}$.` },
    ];
  },
};

interface FitCoefficientParams {
  p: Poly;
  /** Which coefficient is unknown, counting from x^3 as 0. */
  slot: number;
  x0: number;
}

/** The cubic with one coefficient written as k. */
function letterCubicTex(p: Poly, slot: number): string {
  const out: string[] = [];
  p.forEach((c, i) => {
    const k = 3 - i;
    if (i === slot) out.push(`${out.length > 0 ? '+ ' : ''}k${k === 1 ? 'x' : `x^{${k}}`}`);
    else if (c !== 0) out.push(signedTerm(c, k, out.length === 0));
  });
  return out.join(' ');
}

/** A coefficient fitted from one point the curve passes through. */
const polyFitCoefficient: Generator<FitCoefficientParams> = {
  id: 'poly-fit-coefficient',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const p = [hard ? rng.pick([1, 2, -1]) : 1, rng.int(-6, 6), rng.int(-9, 9), rng.int(-12, 12)];
      const slot = hard ? rng.int(0, 2) : rng.int(1, 2);
      const x0 = hard ? rng.pick([-2, -1, 2, 3]) : rng.pick([1, 2]);
      if (p[slot] === 0 || Math.abs(valueAt(p, x0)) > 60) continue;
      return { p, slot, x0 };
    }
  },
  choices: ({ p, slot, x0 }) => {
    const power = x0 ** (3 - slot);
    const rest = valueAt(p, x0) - p[slot] * power;
    return intOptions(p[slot], [-p[slot], valueAt(p, x0) - rest, rest, p[slot] * x0]);
  },
  render: ({ p, slot, x0 }): Slide => ({
    kind: 'expression',
    prompt: [say('A curve is modelled by'), show(`y = ${letterCubicTex(p, slot)}`), say(`It passes through $(${x0}, ${valueAt(p, x0)})$. Find $k$.`)],
    lead: 'k =',
    keypad: [],
    answer: String(p[slot]),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ p, slot, x0 }) => {
    const y0 = valueAt(p, x0);
    const k = 3 - slot;
    const power = x0 ** k;
    const rest = y0 - p[slot] * power;
    return [
      { text: `The point is on the curve, so put $x = ${x0}$ and $y = ${y0}$ into the equation. Every term but the $k$ one is a number:` },
      { tex: chain(`${y0} &= ${power === 1 ? '' : power === -1 ? '-' : power}k ${signedNum(rest)}`, `${factor(String(power))}k &= ${y0 - rest}`, `k &= ${p[slot]}`) },
    ];
  },
};

interface FitFlowParams {
  /** Three distinct roots, smallest first. */
  roots: number[];
  lead: number;
  /** The x of the extra point; 0 is the y-intercept. */
  at: number;
}

const fitFlowMonic = ({ roots, at }: FitFlowParams): number => roots.reduce((acc, r) => acc * (at - r), 1);

/** Fitting a cubic through its roots and one more point, as forks. */
const polyFitFlow: Generator<FitFlowParams> = {
  id: 'poly-fit-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 3, 4).sort((a, b) => a - b);
      const lead = rng.pick([2, -2, 3, -3, -1]);
      const at = difficulty > 1 ? rng.pick([-2, -1, 1, 2, 3]) : 0;
      const params = { roots, lead, at };
      const m = fitFlowMonic(params);
      if (m === 0 || Math.abs(m * lead) > 99) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { roots, lead, at } = params;
    const m = fitFlowMonic(params);
    const y = lead * m;
    const key = `${roots.join(',')}|${lead}|${at}`;
    const form = (rs: number[], a = 'a') => `$y = ${a}${formTex(rootsForm(rs, [1, 1, 1]))}$`;
    const flipped = roots.reduce((acc, r) => acc * (at + r), 1);
    const constant = valueAt(fromRoots(roots, lead), 0);
    const steps: Extract<Slide, { kind: 'flow' }>['steps'] = [
      {
        id: 'form',
        ask: 'Which equation has exactly those roots, whatever the number in front?',
        branches: turned(
          [
            { label: form(roots), to: 'sub' },
            { label: form(roots.map((r) => -r)), outcome: 'Those brackets are zero at the negatives of the roots.' },
            { label: `$y = ${formTex(rootsForm(roots, [1, 1, 1]))} + a$`, outcome: 'Adding a number lifts the whole curve, so the roots move.' },
          ],
          key,
        ),
      },
      {
        id: 'sub',
        ask: `Put in $x = ${at}$ and $y = ${y}$. Which equation does that give?`,
        branches: turned(
          [
            { label: `$${y} = ${m}a$`, to: 'a' },
            ...[-m, flipped]
              .filter((v, i, all) => v !== m && all.indexOf(v) === i)
              .map((v) => ({ label: `$${y} = ${v}a$`, outcome: `Work each bracket out at $x = ${at}$: $${roots.map((r) => `(${at} ${signedNum(-r)})`).join('')} = ${m}$.` })),
          ],
          `${key}|sub`,
        ),
      },
      {
        id: 'a',
        ask: 'So what is $a$?',
        branches: turned(
          [
            at === 0 ? { label: `$a = ${lead}$`, outcome: `So $y = ${formTex(rootsForm(roots, [1, 1, 1], lead))}$.` } : { label: `$a = ${lead}$`, to: 'constant' },
            ...[-lead, y - m]
              .filter((v, i, all) => v !== lead && all.indexOf(v) === i)
              .map((v) => ({ label: `$a = ${v}$`, outcome: `$${m}a = ${y}$ is solved by dividing both sides by $${m}$.` })),
          ],
          `${key}|a`,
        ),
      },
    ];
    if (at !== 0) {
      steps.push({
        id: 'constant',
        ask: 'Multiplied out, what is the constant term of the cubic?',
        branches: turned(
          [
            { label: `$${constant}$`, outcome: 'Right: it is where the curve meets the $y$-axis.' },
            ...[-constant, constant / lead, y]
              .filter((v, i, all) => v !== constant && all.indexOf(v) === i)
              .slice(0, 2)
              .map((v) => ({ label: `$${v}$`, outcome: `Put $x = 0$ in: $${lead}${roots.map((r) => `(0 ${signedNum(-r)})`).join('')} = ${constant}$.` })),
          ],
          `${key}|constant`,
        ),
      });
    }
    return {
      kind: 'flow',
      prompt: [
        say(
          `A cubic crosses the $x$-axis at $x = ${roots.join(',\\ ')}$ and ${at === 0 ? `meets the $y$-axis at $y = ${y}$` : `passes through $(${at}, ${y})$`}. Find its equation one decision at a time.`,
        ),
      ],
      subject: `\\text{roots } ${roots.join(',\\ ')},\\ \\text{point } (${at},\\ ${y})`,
      steps,
      answer: [form(roots), `$${y} = ${m}a$`, `$a = ${lead}$`, ...(at !== 0 ? [`$${constant}$`] : [])],
    };
  },
  solution: (params) => {
    const { roots, lead, at } = params;
    const m = fitFlowMonic(params);
    return [
      { text: 'Each root gives a bracket, and a number in front keeps every root:' },
      { tex: `y = a${formTex(rootsForm(roots, [1, 1, 1]))}` },
      { text: `At $x = ${at}$ the brackets multiply to $${m}$, so $${lead * m} = ${m}a$ and $a = ${lead}$.` },
      { tex: `y = ${formTex(rootsForm(roots, [1, 1, 1], lead))}` },
      ...(at !== 0 ? [{ text: `Its constant term is the value at $x = 0$: $${valueAt(fromRoots(roots, lead), 0)}$.` }] : []),
    ];
  },
};

/* ---------- lesson 5: reading a model ---------- */

type Reading = 'start' | 'value' | 'edge' | 'negative';

interface MeaningParams extends BoxCutParams {
  ask: Reading;
}

/** What one fact about V says about the box, in words. */
const polyModelMeaning: Generator<MeaningParams> = {
  id: 'poly-model-meaning',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = { ...sampleBoxCut(rng, difficulty), ask: rng.pick<Reading>(difficulty > 1 ? ['edge', 'negative'] : ['start', 'value']) };
      if (params.ask === 'negative' && params.L - params.W < 4) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { L, W, x, ask } = params;
    const half = W / 2;
    const v = boxAt(params, x);
    const question: Record<Reading, string> = {
      start: '$V(0) = 0$. What does that say about the box?',
      value: `$V(${x}) = ${v}$. What does that say about the box?`,
      edge: `$V(${half}) = 0$. What does that say about the box?`,
      negative: `$V(x)$ is negative for $${half} < x < ${L / 2}$. What does that say?`,
    };
    const right: Record<Reading, string> = {
      start: 'With no square cut, nothing folds up and there is no box to hold anything.',
      value: `Cutting ${x} cm squares makes a box that holds ${v} cm³.`,
      edge: `Cutting ${half} cm squares uses up the whole ${W} cm width, so the base has no width.`,
      negative: `Those cuts are wider than the ${W} cm side allows, so the model no longer describes a box.`,
    };
    const wrong: Record<Reading, string[]> = {
      start: ['The box holds the most when nothing is cut.', 'The box is empty until it is filled.', `The sheet is ${L} cm long.`],
      value: [
        `Cutting ${v} cm squares makes a box that holds ${x} cm³.`,
        `The box is ${x} cm long and ${v} cm tall.`,
        `A box holding ${x} cm³ needs ${v} cm² of card.`,
      ],
      edge: [`The box is biggest when x = ${half}.`, `The box is ${half} cm tall and holds ${half} cm³.`, `The sheet is ${half} cm wide.`],
      negative: [
        'Those cuts make a box that holds less than nothing.',
        'Those cuts make the tallest boxes.',
        'The volume shrinks as the cut grows, but the box is still there.',
      ],
    };
    return turnedWordChoice([say(sheetStory(params)), show(`V = ${boxTex(params)}`), say(question[ask])], right[ask], wrong[ask]);
  },
  solution: (params) => {
    const { L, W, x, ask } = params;
    const half = W / 2;
    const lines: Record<Reading, SolutionStep[]> = {
      start: [{ text: 'The cut $x$ is the height. At $x = 0$ the box has no sides, so $V = 0$ is the model saying there is no box, not an empty one.' }],
      value: [{ text: `$V$ is the volume in cm³ and $x$ the cut in cm, so $V(${x}) = ${boxAt(params, x)}$ reads: a ${x} cm cut makes a box of ${boxAt(params, x)} cm³.` }],
      edge: [
        { tex: `${W} - 2 \\times ${half} = 0` },
        { text: `At $x = ${half}$ the width bracket is zero: the cuts from each side meet, and there is no base. That is the end of the model's range, $0 < x < ${half}$.` },
      ],
      negative: [
        { text: `For $${half} < x < ${L / 2}$, $${W} - 2x$ is negative while $${L} - 2x$ is still positive, so the product is negative.` },
        { text: `A negative side is not a length, so the model has stopped describing a box. It only makes sense for $0 < x < ${half}$.` },
      ],
    };
    return lines[ask];
  },
};

interface SenseParams extends Sheet {
  /** A whole cut past the end of the range. */
  x: number;
}

/**
 * A cut past the end of the range put into the model anyway. Difficulty 1
 * sits between W/2 and L/2, where V is negative; difficulty 2 past L/2, where
 * two negative sides make V positive, and the number alone looks fine.
 */
const polyModelSenseFlow: Generator<SenseParams> = {
  id: 'poly-model-sense-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const sheet = sampleSheet(rng, difficulty);
      if (difficulty > 1) return { ...sheet, x: sheet.L / 2 + rng.int(1, 3) };
      if (sheet.L - sheet.W < 4) continue;
      return { ...sheet, x: rng.int(sheet.W / 2 + 1, sheet.L / 2 - 1) };
    }
  },
  render: (params): Slide => {
    const { L, W, x } = params;
    const v = boxAt(params, x);
    const key = `${L}|${W}|${x}`;
    const positive = v > 0;
    const whyRight = positive ? `$${L} - 2x$ and $${W} - 2x$ are both negative` : `$${W} - 2x$ is negative`;
    return {
      kind: 'flow',
      prompt: [say(sheetStory(params)), say(`Someone puts $x = ${x}$ into the model. Follow it through.`)],
      subject: `V = ${boxTex(params)}`,
      steps: [
        {
          id: 'value',
          ask: `What is $V$ at $x = ${x}$?`,
          branches: turned(
            [
              { label: `$${v}$`, to: 'box' },
              ...[-v, (L - 2 * x) * (W - 2 * x), x * (L - x) * (W - x)]
                .filter((n, i, all) => n !== v && all.indexOf(n) === i)
                .slice(0, 2)
                .map((n) => ({ label: `$${n}$`, outcome: `$${x}(${L - 2 * x})(${W - 2 * x}) = ${v}$.` })),
            ],
            key,
          ),
        },
        {
          id: 'box',
          ask: `Does a cut of $x = ${x}$ make a box?`,
          branches: [
            { label: 'Yes', outcome: positive ? `The number is positive, but look at the sides: $${W} - 2x = ${W - 2 * x}$.` : 'A volume can never be negative.' },
            { label: 'No', to: 'why' },
          ],
        },
        {
          id: 'why',
          ask: 'Why not?',
          branches: turned(
            [
              { label: whyRight, outcome: `Right: a side of the base cannot be negative, so the model only makes sense for $0 < x < ${W / 2}$.` },
              positive
                ? { label: `$${W} - 2x$ is negative, but $${L} - 2x$ is fine`, outcome: `$${L} - 2 \\times ${x} = ${L - 2 * x}$, which is negative too.` }
                : { label: `$${L} - 2x$ is negative`, outcome: `$${L} - 2 \\times ${x} = ${L - 2 * x}$, which is still positive.` },
              { label: 'The height $x$ is negative', outcome: `The height is $${x}$, which is positive.` },
            ],
            `${key}|why`,
          ),
        },
      ],
      answer: [`$${v}$`, 'No', whyRight],
    };
  },
  solution: (params) => {
    const { L, W, x } = params;
    const v = boxAt(params, x);
    return [
      { tex: chain(`V &= ${x}(${L} - ${2 * x})(${W} - ${2 * x})`, `&= ${x} \\times (${L - 2 * x}) \\times (${W - 2 * x})`, `&= ${v}`) },
      {
        text:
          v > 0
            ? `Two negative sides multiply to a positive number, so $V$ looks like a volume. But no box has negative sides: past $x = ${W / 2}$ the model means nothing, whatever sign it gives.`
            : `A negative volume is the model telling you the cut is too wide: past $x = ${W / 2}$ the width $${W} - 2x$ is negative.`,
      },
    ];
  },
};

interface WhichCubicParams {
  roots: number[];
  lead: number;
  /** The first x in the table; five consecutive values are shown. */
  from: number;
}

/**
 * Which of four cubics fits a table of values. Any two different cubics agree
 * at three points at most, so five points single out one.
 */
const polyModelWhich: Generator<WhichCubicParams> = {
  id: 'poly-model-which',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const roots = rng.sample(hard ? [-3, -2, -1, 1, 2, 3, 4] : [-3, -2, -1, 1, 2, 3], 3).sort((a, b) => a - b);
      const lead = hard ? rng.pick([2, -2, -1]) : rng.pick([1, -1, 2]);
      const from = hard ? 0 : -2;
      const values = [0, 1, 2, 3, 4].map((i) => valueAt(fromRoots(roots, lead), from + i));
      if (values.some((v) => Math.abs(v) > 99)) continue;
      return { roots, lead, from };
    }
  },
  render: ({ roots, lead, from }): Slide => {
    const xs = [0, 1, 2, 3, 4].map((i) => from + i);
    const p = fromRoots(roots, lead);
    const cubic = (rs: number[], a: number) => `y = ${formTex(rootsForm(rs, [1, 1, 1], a))}`;
    const shifted = roots.map((r, i) => (i === 1 ? r + 1 : r));
    const candidates = [
      cubic(roots.map((r) => -r).sort((a, b) => a - b), lead),
      cubic(roots, -lead),
      ...(new Set(shifted).size === 3 && !shifted.includes(0) ? [cubic(shifted, lead)] : []),
      cubic(roots, 2 * lead),
    ];
    return choiceSlide(
      [
        say('A cubic model was fitted to these measurements. Which equation is it?'),
        show(`\\begin{array}{c|ccccc} x & ${xs.join(' & ')} \\\\ \\hline y & ${xs.map((x) => valueAt(p, x)).join(' & ')} \\end{array}`),
      ],
      options({ tex: cubic(roots, lead), answer: cubic(roots, lead) }, ...candidates.map((tex) => ({ tex, answer: tex }))).slice(0, 4),
    );
  },
  solution: ({ roots, lead, from }) => {
    const zeros = roots.filter((r) => r >= from && r <= from + 4);
    return [
      {
        text: zeros.length
          ? `Where $y = 0$ in the table, at $x = ${zeros.join(',\\ ')}$, the cubic has a root, so a bracket.`
          : 'Check each equation against the table, one point at a time.',
      },
      { text: `Then the number in front from one more point. Only $y = ${formTex(rootsForm(roots, [1, 1, 1], lead))}$ gives every value in the table.` },
      { text: `At $x = ${from}$, for instance, it gives $${valueAt(fromRoots(roots, lead), from)}$.` },
    ];
  },
};

interface ModelCountParams extends Sheet {
  /** The volume asked for is V at this cut. */
  j: number;
}

/** How many whole cuts give at least a stated volume: V worked out at each. */
const polyModelCount: Generator<ModelCountParams> = {
  id: 'poly-model-count',
  sample: (rng, difficulty) => {
    for (;;) {
      const sheet = sampleSheet(rng, difficulty);
      const j = rng.int(1, lastCut(sheet));
      if (j === bestCut(sheet)) continue;
      return { ...sheet, j };
    }
  },
  render: (params): Slide => {
    const T = boxAt(params, params.j);
    return {
      kind: 'expression',
      prompt: [
        say(sheetStory(params)),
        show(`V = ${boxTex(params)}`),
        say(`The cut is a whole number of centimetres. How many different cuts make a box that holds at least $${T}$ cm³?`),
      ],
      lead: '\\text{cuts} =',
      keypad: [],
      answer: String(countAtLeast(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const T = boxAt(params, params.j);
    const cuts = Array.from({ length: lastCut(params) }, (_, i) => i + 1);
    return [
      { text: `A box needs $0 < x < ${params.W / 2}$, so the whole cuts are $1$ to $${lastCut(params)}$. Work out $V$ for each:` },
      { tex: chain(...cuts.map((x) => `V(${x}) &= ${boxAt(params, x)}`)) },
      { text: `$${countAtLeast(params)}$ of them are at least $${T}$.` },
    ];
  },
};

function countAtLeast(params: ModelCountParams): number {
  const T = boxAt(params, params.j);
  return Array.from({ length: lastCut(params) }, (_, i) => i + 1).filter((x) => boxAt(params, x) >= T).length;
}

export const polynomialGenerators = [
  polyDegree,
  polyNameFlow,
  polyCoefficient,
  polyStandardTiles,
  polyAddTiles,
  polySubtractSteps,
  polyCollectCoefficient,
  polySumDegreeFlow,
  polyExpandTiles,
  polyStrandsTree,
  polyProductCoefficient,
  polyTripleSteps,
  polyValueReduce,
  polyValueSlider,
  polySpecialValue,
  polyFindK,
  polyRemainderK,
  polyDivideSteps,
  polySyntheticTree,
  polyQuotientTiles,
  polyRebuild,
  polyRemainder,
  polySubstituteFlow,
  polyFactorFlow,
  polyIsFactor,
  polyFactorTree,
  polyCandidates,
  polyTrialFlow,
  polyFactoriseTiles,
  polyCompareTree,
  polyFullFlow,
  polySolveTiles,
  polyRootSlider,
  polyCountRoots,
  polySolveFlow,
  polyGraphRootsTiles,
  polyGraphForm,
  polyGraphRootSlider,
  polyRootFlow,
  polyEndsFlow,
  polyEndsTiles,
  polyLeadCoefficient,
  polyEndsGraph,
  polyTouchCross,
  polySketchFormTiles,
  polyRepeatTree,
  polyTouchGraph,
  polyIntercept,
  polyInterceptSlider,
  polyTestPointSteps,
  polySignFlow,
  polyFindLead,
  polySketchExpandSteps,
  polyDescribeGraph,
  polyRootsSumProduct,
  polySumProductTiles,
  polyQuadCoeffsTree,
  polyRootSigns,
  polyCubicSumsTree,
  polyCubicVieta,
  polyVietaFlow,
  polyCubicIdentityTiles,
  polyRootsToCubicTiles,
  polyNewRootsSteps,
  polyCubicCoeffsTree,
  polySumsToCubic,
  polyThirdRoot,
  polyWhichIdentityFlow,
  polyApRootsTree,
  polyMissingCoeffSteps,
  polySumSquares,
  polyReciprocalSum,
  polySquareIdentityTiles,
  polySymmetricTree,
  polyRecipDivideSteps,
  polyLongQuadSteps,
  polyQuadQuotientTree,
  polyQuadQuotientTiles,
  polyQuadRemainder,
  polyPairFlow,
  polyTwoRootsTree,
  polyOtherFactorTiles,
  polyPairUnknown,
  polyTwiceTree,
  polyRepeatFlow,
  polyMultiplicity,
  polyRepeatFactorSteps,
  polyBiquadTiles,
  polyInUTree,
  polyBiquadCount,
  polyBiquadFlow,
  polyQuarticFlow,
  polyQuarticDivideSteps,
  polyQuarticTiles,
  polyQuarticRoot,
  polyCriticalTiles,
  polySignTable,
  polyStretchSignFlow,
  polySignPattern,
  polyCubicLine,
  polyCubicSetTiles,
  polyIneqFlow,
  polyIneqInteger,
  polyTouchLine,
  polyHoleFlow,
  polySignChanges,
  polyTouchTiles,
  polyOneSideSteps,
  polyRearrangeFlow,
  polyRearrangeLine,
  polyFlipChoice,
  polyReadGraph,
  polyIntegerCount,
  polyReadLineTiles,
  polyQuarticLine,
  polyBoxSidesTiles,
  polyBoxExpandSteps,
  polyBoxDomainFlow,
  polyBoxCoefficient,
  polyBoxVolume,
  polyBoxValueTree,
  polyBoxTable,
  polyBoxBestSlider,
  polyBoxCubicSteps,
  polyBoxDivideTree,
  polyBoxRootFlow,
  polyBoxOtherRoot,
  polyFitTiles,
  polyFitCoefficient,
  polyFitFlow,
  polyModelMeaning,
  polyModelSenseFlow,
  polyModelWhich,
  polyModelCount,
];
