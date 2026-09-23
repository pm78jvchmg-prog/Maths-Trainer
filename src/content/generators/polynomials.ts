/**
 * Polynomials and the Factor Theorem.
 *
 * Level 1 is arithmetic on polynomials: naming them, adding and subtracting,
 * multiplying a linear by a quadratic, evaluating p(a), and dividing by a
 * linear factor. Level 2 is the two theorems that division leads to — the
 * remainder is p(a), and (x - a) is a factor exactly when p(a) = 0 — and what
 * they are for: finding a factor by trial, factorising a cubic fully and
 * solving it.
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
import { sumTex, termTex } from './calculus';

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
function substitutedTex(p: Poly, a: number, total?: number): string {
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
    lines.push(i === 0 ? `p(${a}) &= ${row}` : `&\\quad ${row.startsWith('-') ? `- ${row.slice(1)}` : `+ ${row}`}`);
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
];
