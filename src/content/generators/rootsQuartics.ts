/**
 * Polynomials level 8: roots of quartics.
 *
 * Level 4 read the three sums of a cubic's roots off its coefficients. A
 * quartic has four: for ax^4 + bx^3 + cx^2 + dx + e with roots α, β, γ and δ,
 *
 *   Σα = -b/a,  Σαβ = c/a,  Σαβγ = -d/a,  αβγδ = e/a,
 *
 * the signs alternating from minus and the product of all four coming out
 * positive. The level reads them, builds a quartic from its roots (by the
 * sums, or pair by pair as two quadratic factors), finds two missing roots
 * from two known ones, works with roots in opposite pairs ±p, ±q, which leave
 * no x^3 and no x term, and finds Σα² and Σ1/α without solving.
 *
 * As in level 4, every quartic is built outward from whole roots with
 * `fromRoots`, and every sum is computed from those roots rather than read
 * back off the coefficients, so every value is whole by construction. Only
 * the reciprocal sums are fractions. `rootsQuartics.test.ts` recomputes each
 * answer from the roots themselves.
 */
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { fracTex, say } from './format';
import {
  chain,
  coefMark,
  factor,
  fillBank,
  fits,
  fracAnswer,
  fromRoots,
  intOptions,
  numberBank,
  overLead,
  polyAnswer,
  polyTex,
  rootSums,
  sampleLead,
  sampleRoots,
  signedNum,
  signedTerm,
  turned,
  type Poly,
} from './polynomials';

/* ---------- shared ---------- */

const GREEK = ['\\alpha', '\\beta', '\\gamma', '\\delta'];
const FOUR_ROOTS = '$\\alpha$, $\\beta$, $\\gamma$ and $\\delta$';

/** The four sums: of the roots, their products in pairs, in threes, and all four. */
export const FOUR_LABELS = ['\\Sigma\\alpha', '\\Sigma\\alpha\\beta', '\\Sigma\\alpha\\beta\\gamma', '\\alpha\\beta\\gamma\\delta'];

/** Minus, plus, minus, plus: whether the sum is minus its coefficient over a. */
const MINUS = [true, false, true, false];

/** The four identities, one to a line. */
export const FOUR_IDENTITIES = chain(
  '\\Sigma\\alpha &= -\\frac{b}{a}',
  '\\Sigma\\alpha\\beta &= \\frac{c}{a}',
  '\\Sigma\\alpha\\beta\\gamma &= -\\frac{d}{a}',
  '\\alpha\\beta\\gamma\\delta &= \\frac{e}{a}',
);

interface QuarticParams {
  roots: number[];
  lead: number;
}

/**
 * Four distinct whole roots and a lead, every coefficient non-zero and within
 * `limit`, so each term is on the page and the quartic reads comfortably.
 */
function sampleQuartic(
  rng: Rng,
  difficulty: number,
  ok: (p: Poly, sums: number[], roots: number[]) => boolean = () => true,
): QuarticParams {
  const hard = difficulty > 1;
  for (;;) {
    const roots = sampleRoots(rng, 4, hard ? 5 : 4);
    const lead = sampleLead(rng, hard);
    const p = fromRoots(roots, lead);
    if (p.some((c) => c === 0) || !fits(p, hard ? 150 : 90)) continue;
    if (!ok(p, rootSums(roots), roots)) continue;
    return { roots, lead };
  }
}

/** A sum read off a quartic's coefficients, as one line of working. */
function identityStep(p: Poly, k: number): string {
  const value = ((MINUS[k] ? -1 : 1) * p[k + 1]) / p[0];
  return `${FOUR_LABELS[k]} = ${overLead(p[k + 1], p[0], MINUS[k])} = ${value}`;
}

/** Which letter stands for which coefficient, as a sentence. */
function lettersLine(p: Poly): SolutionStep {
  return { text: `Here $a = ${p[0]}$, $b = ${p[1]}$, $c = ${p[2]}$, $d = ${p[3]}$ and $e = ${p[4]}$.` };
}

/** α = 1, β = -2, ... as a display line. */
function rootsLine(roots: number[]): string {
  return `(${GREEK.join(', ')}) = (${roots.join(', ')})`;
}

/** Roots as a list the learner reads, in the order given: "$1$, $-2$, $3$ and $4$". */
function listed(values: string[]): string {
  return `${values.slice(0, -1).map((v) => `$${v}$`).join(', ')} and $${values[values.length - 1]}$`;
}

/** A pair of numbers the learner reads, smaller first: "$-2$ and $5$". */
function pairText(a: number, b: number): string {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return `$${lo}$ and $${hi}$`;
}

/* ================================================================
 * Lesson 1: four roots
 * ================================================================ */

interface AskParams extends QuarticParams {
  ask: number;
}

/** One of the four sums read off a quartic's coefficients. */
const q4Vieta: Generator<AskParams> = {
  id: 'poly-q4-vieta',
  sample: (rng, difficulty) => ({ ...sampleQuartic(rng, difficulty), ask: rng.int(0, 3) }),
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
      prompt: [say(`${FOUR_ROOTS} are the roots of $${polyTex(p)} = 0$. Find $${FOUR_LABELS[ask]}$.`)],
      lead: `${FOUR_LABELS[ask]} =`,
      keypad: [],
      answer: String(rootSums(roots)[ask]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ roots, lead, ask }) => {
    const p = fromRoots(roots, lead);
    return [
      { text: 'For $ax^{4} + bx^{3} + cx^{2} + dx + e = 0$:' },
      { tex: FOUR_IDENTITIES },
      lettersLine(p),
      { tex: identityStep(p, ask) },
    ];
  },
};

interface RootsParams {
  roots: number[];
}

/**
 * The four sums from four given roots, by pairing them: α + β and γ + δ, αβ
 * and γδ first, then the sums built from those.
 */
const q4SumsTree: Generator<RootsParams> = {
  id: 'poly-q4-sums-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 4, difficulty > 1 ? 5 : 3);
      if (roots[0] + roots[1] === 0 || roots[2] + roots[3] === 0) continue;
      return { roots };
    }
  },
  render: ({ roots }): Slide => {
    const [a, b, c, d] = roots;
    const [e1, e2, e3, e4] = rootSums(roots);
    const values = [a + b, c + d, a * b, c * d, e1, e2, e3, e4];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Top row: $\\alpha + \\beta$, $\\gamma + \\delta$, $\\alpha\\beta$, $\\gamma\\delta$. Underneath, the four sums built from them: $\\Sigma\\alpha$, $\\Sigma\\alpha\\beta$, $\\Sigma\\alpha\\beta\\gamma$, $\\alpha\\beta\\gamma\\delta$.',
        ),
      ],
      expression: rootsLine(roots),
      nodes: [
        { id: 's12', from: [] },
        { id: 's34', from: [] },
        { id: 'p12', from: [] },
        { id: 'p34', from: [] },
        { id: 'e1', from: ['s12', 's34'] },
        { id: 'e2', from: ['s12', 's34', 'p12', 'p34'] },
        { id: 'e3', from: ['s12', 's34', 'p12', 'p34'] },
        { id: 'e4', from: ['p12', 'p34'] },
      ],
      bank: numberBank(values, [-e1, -e2, -e3, -e4, a * b + c * d, (a + b) * (c + d)], String, 2),
      answer: values.map(String),
    };
  },
  solution: ({ roots }) => {
    const [a, b, c, d] = roots;
    const [e1, e2, e3, e4] = rootSums(roots);
    const s12 = a + b;
    const s34 = c + d;
    const p12 = a * b;
    const p34 = c * d;
    const f = (n: number) => factor(String(n));
    return [
      { text: `Pair the roots: $\\alpha + \\beta = ${s12}$, $\\gamma + \\delta = ${s34}$, $\\alpha\\beta = ${p12}$ and $\\gamma\\delta = ${p34}$.` },
      { tex: `\\Sigma\\alpha = ${s12} ${signedNum(s34)} = ${e1}` },
      { text: 'Each pair product is inside one pair or takes one root from each:' },
      {
        tex: chain(
          '\\Sigma\\alpha\\beta &= \\alpha\\beta + \\gamma\\delta',
          '&\\quad + (\\alpha + \\beta)(\\gamma + \\delta)',
          `&= ${p12} ${signedNum(p34)}`,
          `&\\quad + ${f(s12)} \\times ${f(s34)}`,
          `&= ${e2}`,
        ),
      },
      {
        tex: chain(
          '\\Sigma\\alpha\\beta\\gamma &= \\alpha\\beta(\\gamma + \\delta)',
          '&\\quad + \\gamma\\delta(\\alpha + \\beta)',
          `&= ${f(p12)} \\times ${f(s34)}`,
          `&\\quad + ${f(p34)} \\times ${f(s12)}`,
          `&= ${e3}`,
        ),
      },
      { tex: `\\alpha\\beta\\gamma\\delta = ${f(p12)} \\times ${f(p34)} = ${e4}` },
    ];
  },
};

/** All four sums in turn, each a fork where the slip is the sign or forgetting to divide. */
const q4SumsFlow: Generator<QuarticParams> = {
  id: 'poly-q4-sums-flow',
  sample: (rng, difficulty) => sampleQuartic(rng, difficulty),
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const sums = rootSums(roots);
    const ids = ['sum', 'pairs', 'triples', 'product'];
    const key = polyTex(p);
    return {
      kind: 'flow',
      prompt: [say('Read the four sums of the roots off the coefficients. Each answer chooses what is asked next.')],
      subject: `${key} = 0`,
      steps: sums.map((right, k) => {
        const raw = p[k + 1];
        const values = [right, -right, ...(raw !== right && raw !== -right ? [raw] : [])];
        const branches = values.map((value) => {
          if (value === right) {
            return k < 3
              ? { label: `$${value}$`, to: ids[k + 1] }
              : { label: `$${value}$`, outcome: 'Minus, plus, minus, plus: all four sums from the coefficients alone.' };
          }
          return value === raw
            ? { label: `$${value}$`, outcome: `That is the coefficient itself. Divide it by the leading coefficient, $${p[0]}$.` }
            : { label: `$${value}$`, outcome: 'That has the wrong sign: the identities go $-\\frac{b}{a}$, $+\\frac{c}{a}$, $-\\frac{d}{a}$, $+\\frac{e}{a}$.' };
        });
        return { id: ids[k], ask: `What is $${FOUR_LABELS[k]}$?`, branches: turned(branches, `${key}|${k}`) };
      }),
      answer: sums.map((value) => `$${value}$`),
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    return [
      { tex: FOUR_IDENTITIES },
      lettersLine(p),
      { tex: chain(...[0, 1, 2, 3].map((k) => identityStep(p, k).replace(' = ', ' &= '))) },
    ];
  },
};

/* ================================================================
 * Lesson 2: a quartic from its roots
 * ================================================================ */

/** The quartic's four lower terms as tiles, in order. */
function lowerTiles(p: Poly): string[] {
  return [signedTerm(p[1], 3), signedTerm(p[2], 2), signedTerm(p[3], 1), signedNum(p[4])];
}

/** The quartic with given roots and lead, from its four sums. */
const q4BuildTiles: Generator<QuarticParams> = {
  id: 'poly-q4-build-tiles',
  sample: (rng, difficulty) => sampleQuartic(rng, difficulty),
  choices: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const variants = [fromRoots(roots.map((r) => -r), lead), [p[0], p[1], p[2], p[3], -p[4]], [p[0], p[1], -p[2], p[3], p[4]]];
    return options(
      { tex: polyTex(p), answer: polyAnswer(p) },
      ...variants.map((q) => ({ tex: polyTex(q), answer: polyAnswer(q) })),
    );
  },
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const answer = lowerTiles(p);
    return {
      kind: 'tiles',
      prompt: [
        say(
          `Find the quartic with leading coefficient $${lead}$ and roots ${listed([...roots].sort((x, y) => x - y).map(String))}.`,
        ),
      ],
      template: `${coefMark(lead)}x^4 {0} {1} {2} {3}`,
      bank: fillBank(answer, lowerTiles(p.map((c) => -c))),
      answer,
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [e1, e2, e3, e4] = rootSums(roots);
    return [
      { tex: chain(`\\Sigma\\alpha &= ${e1}`, `\\Sigma\\alpha\\beta &= ${e2}`, `\\Sigma\\alpha\\beta\\gamma &= ${e3}`, `\\alpha\\beta\\gamma\\delta &= ${e4}`) },
      { text: 'A monic quartic is built from the four sums, the signs alternating:' },
      { tex: chain('&x^{4} - (\\Sigma\\alpha)x^{3} + (\\Sigma\\alpha\\beta)x^{2}', '&- (\\Sigma\\alpha\\beta\\gamma)x + \\alpha\\beta\\gamma\\delta') },
      { tex: polyTex(fromRoots(roots)) },
      ...(lead === 1 ? [] : [{ text: `Then every term times $${lead}$:` }, { tex: polyTex(p) }]),
    ];
  },
};

/** The two quadratic factors of a quartic, one per pair of roots. */
const q4PairsTiles: Generator<RootsParams> = {
  id: 'poly-q4-pairs-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = sampleRoots(rng, 4, difficulty > 1 ? 6 : 4);
      if (roots[0] + roots[1] === 0 || roots[2] + roots[3] === 0) continue;
      return { roots };
    }
  },
  render: ({ roots }): Slide => {
    const [a, b, c, d] = roots;
    const answer = [signedTerm(-(a + b), 1), signedNum(a * b), signedTerm(-(c + d), 1), signedNum(c * d)];
    return {
      kind: 'tiles',
      prompt: [
        say(`A quartic has roots $\\alpha = ${a}$, $\\beta = ${b}$, $\\gamma = ${c}$ and $\\delta = ${d}$. Fill in its factors: $\\alpha$ and $\\beta$ in the first, $\\gamma$ and $\\delta$ in the second.`),
      ],
      template: '(x^2 {0} {1})(x^2 {2} {3})',
      bank: fillBank(answer, [signedTerm(a + b, 1), signedNum(-a * b), signedTerm(c + d, 1), signedNum(-c * d), signedNum(a + b), signedNum(c + d)]),
      answer,
    };
  },
  solution: ({ roots }) => {
    const [a, b, c, d] = roots;
    const quad = (s: number, p: number) => `x^{2} ${signedTerm(-s, 1)} ${signedNum(p)}`;
    return [
      { text: 'Two roots with sum $s$ and product $p$ are the roots of $x^{2} - sx + p$.' },
      { tex: chain(`\\alpha + \\beta &= ${a + b}`, `\\alpha\\beta &= ${a * b}`) },
      { tex: chain(`\\gamma + \\delta &= ${c + d}`, `\\gamma\\delta &= ${c * d}`) },
      { tex: `(${quad(a + b, a * b)})(${quad(c + d, c * d)})` },
    ];
  },
};

/* ================================================================
 * Lesson 3: two missing roots
 * ================================================================ */

/** A quartic with two of its roots given: roots[0] and roots[1]. */
function sampleKnownTwo(rng: Rng, difficulty: number): QuarticParams {
  return sampleQuartic(rng, difficulty, (_, __, roots) => roots[2] + roots[3] !== 0);
}

/** Σα, the known pair's sum, αβγδ and the known pair's product, then γ + δ and γδ. */
const q4OtherPairTree: Generator<QuarticParams> = {
  id: 'poly-q4-other-pair-tree',
  sample: sampleKnownTwo,
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const [a, b, c, d] = roots;
    const [e1, , , e4] = rootSums(roots);
    const values = [e1, a + b, e4, a * b, c + d, c * d];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Two of the roots are $\\alpha = ${a}$ and $\\beta = ${b}$. Top row: $\\Sigma\\alpha$, $\\alpha + \\beta$, $\\alpha\\beta\\gamma\\delta$, $\\alpha\\beta$. Underneath: $\\gamma + \\delta$, then $\\gamma\\delta$.`,
        ),
      ],
      expression: `${polyTex(p)} = 0`,
      nodes: [
        { id: 'e1', from: [] },
        { id: 's12', from: [] },
        { id: 'e4', from: [] },
        { id: 'p12', from: [] },
        { id: 's34', from: ['e1', 's12'] },
        { id: 'p34', from: ['e4', 'p12'] },
      ],
      bank: numberBank(values, [-e1, e1 + a + b, -(c + d), -(c * d), e4 - a * b], String, 2),
      answer: values.map(String),
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [a, b, c, d] = roots;
    const [e1, , , e4] = rootSums(roots);
    return [
      { tex: chain(`\\Sigma\\alpha &= ${overLead(p[1], p[0], true)} = ${e1}`, `\\alpha\\beta\\gamma\\delta &= ${overLead(p[4], p[0], false)} = ${e4}`) },
      { text: `The known pair: $\\alpha + \\beta = ${a + b}$ and $\\alpha\\beta = ${a * b}$.` },
      { tex: chain(`\\gamma + \\delta &= ${e1} - ${factor(String(a + b))} = ${c + d}`, `\\gamma\\delta &= \\frac{${e4}}{${a * b}} = ${c * d}`) },
    ];
  },
};

/** γ + δ, then γδ, then the two roots themselves from the quadratic they make. */
const q4OtherRootsFlow: Generator<QuarticParams> = {
  id: 'poly-q4-other-roots-flow',
  sample: sampleKnownTwo,
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const [a, b, c, d] = roots;
    const [e1, , , e4] = rootSums(roots);
    const s = c + d;
    const q = c * d;
    const key = `${polyTex(p)}|${a}|${b}`;
    const uniq = (items: { label: string; to?: string; outcome?: string }[]) =>
      items.filter((item, i) => items.findIndex((other) => other.label === item.label) === i);
    const sumBranches = uniq([
      { label: `$${s}$`, to: 'product' },
      { label: `$${e1}$`, outcome: `That is $\\Sigma\\alpha$ for all four roots. Take off $\\alpha + \\beta = ${a + b}$.` },
      { label: `$${-s}$`, outcome: 'The sign is off. Find $\\Sigma\\alpha$ first, then take away the known pair.' },
    ]);
    const productBranches = uniq([
      { label: `$${q}$`, to: 'roots' },
      { label: `$${e4}$`, outcome: `That is the product of all four roots. Divide by $\\alpha\\beta = ${a * b}$.` },
      { label: `$${-q}$`, outcome: 'The product of four roots is $+\\frac{e}{a}$, so check the sign.' },
    ]);
    const rootBranches = uniq([
      { label: pairText(c, d), outcome: `They solve $x^{2} ${signedTerm(-s, 1)} ${signedNum(q)} = 0$.` },
      { label: pairText(-c, -d), outcome: `Those multiply to $${q}$ but add to $${-s}$. The quadratic is $x^{2} - (\\gamma + \\delta)x + \\gamma\\delta$.` },
    ]);
    return {
      kind: 'flow',
      prompt: [say(`Two roots of this quartic are $\\alpha = ${a}$ and $\\beta = ${b}$. Find the other two, $\\gamma$ and $\\delta$.`)],
      subject: `${polyTex(p)} = 0`,
      steps: [
        { id: 'sum', ask: 'What is $\\gamma + \\delta$?', branches: turned(sumBranches, `${key}|s`) },
        { id: 'product', ask: 'What is $\\gamma\\delta$?', branches: turned(productBranches, `${key}|p`) },
        { id: 'roots', ask: 'So $\\gamma$ and $\\delta$ are', branches: turned(rootBranches, `${key}|r`) },
      ],
      answer: [`$${s}$`, `$${q}$`, pairText(c, d)],
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [a, b, c, d] = roots;
    const [e1, , , e4] = rootSums(roots);
    return [
      { tex: chain(`\\Sigma\\alpha &= ${overLead(p[1], p[0], true)} = ${e1}`, `\\alpha\\beta\\gamma\\delta &= ${overLead(p[4], p[0], false)} = ${e4}`) },
      { tex: chain(`\\gamma + \\delta &= ${e1} - ${factor(String(a + b))} = ${c + d}`, `\\gamma\\delta &= \\frac{${e4}}{${a * b}} = ${c * d}`) },
      { text: 'So $\\gamma$ and $\\delta$ are the roots of' },
      { tex: `x^{2} ${signedTerm(-(c + d), 1)} ${signedNum(c * d)} = 0` },
      { text: `which are ${pairText(c, d)}.` },
    ];
  },
};

/* ================================================================
 * Lesson 4: roots in opposite pairs, ±p and ±q
 * ================================================================ */

/**
 * Roots ±√u and ±√v, u < v: a quartic with no x^3 and no x term. u and v
 * need not be squares, which is what makes the pool wide enough and shows
 * the method does not care whether the roots are whole.
 */
interface PmParams {
  u: number;
  v: number;
  lead: number;
}

function samplePm(rng: Rng, difficulty: number): PmParams {
  const hard = difficulty > 1;
  for (;;) {
    const u = rng.int(1, 9);
    const v = rng.int(1, 10);
    if (u >= v) continue;
    const lead = hard ? rng.pick([2, 3, -1, -2]) : 1;
    if (Math.abs(lead * u * v) > 120) continue;
    return { u, v, lead };
  }
}

/** ±√u as the learner reads it: ±2 when u is 4, ±√3 otherwise. */
function pmTex(u: number): string {
  const r = Math.round(Math.sqrt(u));
  return r * r === u ? `\\pm ${r}` : `\\pm\\sqrt{${u}}`;
}

/** The quartic a(x^2 - u)(x^2 - v) as coefficients. */
const pmPoly = ({ u, v, lead }: PmParams): Poly => [lead, 0, -lead * (u + v), 0, lead * u * v];

/** a x^4 + b x^2 + c as TeX, the missing terms left out. */
function pmTex4(p: Poly): string {
  return `${signedTerm(p[0], 4, true)} ${signedTerm(p[2], 2)} ${signedNum(p[4])}`;
}

/** The quartic with roots ±√u and ±√v, as two tiles. */
const q4PmTiles: Generator<PmParams> = {
  id: 'poly-q4-pm-tiles',
  sample: samplePm,
  choices: (params) => {
    const { u, v, lead } = params;
    const p = pmPoly(params);
    const variants: Poly[] = [
      [lead, 0, lead * (u + v), 0, lead * u * v],
      [lead, 0, -lead * (u + v), 0, -lead * u * v],
      [lead, 0, -lead * (u * v), 0, lead * (u + v)],
    ];
    return options(
      { tex: `${pmTex4(p)}`, answer: polyAnswer(p) },
      ...variants.filter((q) => q[2] !== p[2] || q[4] !== p[4]).map((q) => ({ tex: pmTex4(q), answer: polyAnswer(q) })),
    );
  },
  render: (params): Slide => {
    const { u, v, lead } = params;
    const p = pmPoly(params);
    const answer = [signedTerm(p[2], 2), signedNum(p[4])];
    return {
      kind: 'tiles',
      prompt: [say(`Find the quartic with leading coefficient $${lead}$ and roots $${pmTex(u)}$ and $${pmTex(v)}$.`)],
      template: `${coefMark(lead)}x^4 {0} {1}`,
      bank: fillBank(answer, [signedTerm(-p[2], 2), signedNum(-p[4]), signedTerm(-lead * u * v, 2), signedNum(lead * (u + v)), signedNum(-lead * (u + v))]),
      answer,
    };
  },
  solution: (params) => {
    const { u, v, lead } = params;
    const p = pmPoly(params);
    return [
      { text: `The roots $${pmTex(u)}$ come from $x^{2} - ${u}$, and $${pmTex(v)}$ from $x^{2} - ${v}$:` },
      { tex: chain(`&(x^{2} - ${u})(x^{2} - ${v})`, `=\\;&x^{4} - ${u + v}x^{2} + ${u * v}`) },
      ...(lead === 1 ? [] : [{ text: `Then every term times $${lead}$:` }, { tex: pmTex4(p) }]),
      { text: 'No $x^{3}$ and no $x$ term: the roots cancel in pairs, so $\\Sigma\\alpha = 0$ and $\\Sigma\\alpha\\beta\\gamma = 0$.' },
    ];
  },
};

/** p², q², then the x² coefficient and the constant. */
const q4PmSquaresTree: Generator<PmParams> = {
  id: 'poly-q4-pm-squares-tree',
  sample: samplePm,
  render: (params): Slide => {
    const { u, v, lead } = params;
    const p = pmPoly(params);
    const values = [u, v, p[2], p[4]];
    return {
      kind: 'tree',
      prompt: [
        say(`The roots are $${pmTex(u)}$ and $${pmTex(v)}$. Top row: the two squares, smaller first. Underneath: $b$, then $c$.`),
      ],
      expression: `${coefMark(lead)}x^{4} + bx^{2} + c`,
      nodes: [
        { id: 'u', from: [] },
        { id: 'v', from: [] },
        { id: 'b', from: ['u', 'v'] },
        { id: 'c', from: ['u', 'v'] },
      ],
      bank: numberBank(values, [-p[2], -p[4], u + v, u * v, v - u], String, 2),
      answer: values.map(String),
    };
  },
  solution: (params) => {
    const { u, v, lead } = params;
    const p = pmPoly(params);
    return [
      { text: `Squaring the roots gives $${u}$ and $${v}$.` },
      { tex: chain(`b &= ${coefMark(-lead)}(${u} + ${v}) = ${p[2]}`, `c &= ${coefMark(lead)}${lead === 1 || lead === -1 ? '' : ' \\times '}${u} \\times ${v} = ${p[4]}`) },
      { tex: `${pmTex4(p)}` },
    ];
  },
};

interface PmUnknownParams extends PmParams {
  /** Which square is given: the other is found. */
  given: 0 | 1;
}

/** x^4 - Sx^2 + k has roots ±√u and ±q: find k. */
const q4PmUnknown: Generator<PmUnknownParams> = {
  id: 'poly-q4-pm-unknown',
  sample: (rng, difficulty) => ({ ...samplePm(rng, difficulty), given: rng.int(0, 1) as 0 | 1 }),
  choices: (params) => {
    const { u, v, lead } = params;
    const k = lead * u * v;
    const known = params.given === 0 ? u : v;
    const other = params.given === 0 ? v : u;
    return intOptions(k, [lead * known * (u + v), -k, lead * (u + v), lead * other, lead * known * known]);
  },
  render: (params): Slide => {
    const { u, v, lead } = params;
    const p = pmPoly(params);
    const known = params.given === 0 ? u : v;
    return {
      kind: 'expression',
      prompt: [say(`$${signedTerm(lead, 4, true)} ${signedTerm(p[2], 2)} + k = 0$ has roots $${pmTex(known)}$ and $\\pm q$. Find $k$.`)],
      lead: 'k =',
      keypad: [],
      answer: String(p[4]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { u, v, lead } = params;
    const p = pmPoly(params);
    const known = params.given === 0 ? u : v;
    const other = params.given === 0 ? v : u;
    const divided = lead === 1 ? [] : [{ text: `Divide through by $${lead}$ first: the $x^{2}$ coefficient is $${-(u + v)}$.` }];
    return [
      { text: `The roots come from $(x^{2} - ${known})(x^{2} - q^{2})$, so the $x^{2}$ coefficient is minus the sum of the squares.` },
      ...divided,
      { tex: chain(`${known} + q^{2} &= ${u + v}`, `q^{2} &= ${other}`) },
      { tex: `k = ${lead === 1 ? '' : `${factor(String(lead))} \\times `}${known} \\times ${other} = ${p[4]}` },
    ];
  },
};

/* ================================================================
 * Lesson 5: symmetric functions of four roots
 * ================================================================ */

/** Σα², or Σ1/α at difficulty 2. */
interface SymParams extends QuarticParams {
  ask: 0 | 1;
}

function symValue({ roots, ask }: SymParams): [number, number] {
  const [e1, e2, e3, e4] = rootSums(roots);
  return ask === 0 ? [e1 * e1 - 2 * e2, 1] : [e3, e4];
}

const SYM_LABELS = ['\\Sigma\\alpha^{2}', '\\Sigma\\frac{1}{\\alpha}'];

const q4Symmetric: Generator<SymParams> = {
  id: 'poly-q4-symmetric',
  sample: (rng, difficulty) => ({ ...sampleQuartic(rng, difficulty), ask: difficulty > 1 ? (rng.int(0, 1) as 0 | 1) : 0 }),
  choices: (params) => {
    const [e1, e2, e3, e4] = rootSums(params.roots);
    if (params.ask === 0) {
      const value = e1 * e1 - 2 * e2;
      return intOptions(value, [e1 * e1 + 2 * e2, e1 * e1 - e2, e1 - 2 * e2, -value]);
    }
    return fractionOptions(e3, e4, [
      [e4, e3],
      [-e3, e4],
      [e2, e4],
      [e1, e4],
    ]);
  },
  render: (params): Slide => {
    const p = fromRoots(params.roots, params.lead);
    const [n, d] = symValue(params);
    return {
      kind: 'expression',
      prompt: [say(`${FOUR_ROOTS} are the roots of $${polyTex(p)} = 0$. Find $${SYM_LABELS[params.ask]}$.`)],
      lead: `${SYM_LABELS[params.ask]} =`,
      keypad: [],
      answer: d === 1 ? String(n) : fracAnswer(n, d),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const p = fromRoots(params.roots, params.lead);
    const [e1, e2, e3, e4] = rootSums(params.roots);
    if (params.ask === 0) {
      return [
        { tex: chain(identityStep(p, 0).replace(' = ', ' &= '), identityStep(p, 1).replace(' = ', ' &= ')) },
        { text: 'Squaring the sum gives each square once and each of the six pair products twice:' },
        { tex: chain(`\\Sigma\\alpha^{2} &= (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta`, `&= ${factor(String(e1))}^{2} - 2 \\times ${factor(String(e2))}`, `&= ${e1 * e1 - 2 * e2}`) },
      ];
    }
    return [
      { tex: chain(identityStep(p, 2).replace(' = ', ' &= '), identityStep(p, 3).replace(' = ', ' &= ')) },
      { text: 'Over the common denominator $\\alpha\\beta\\gamma\\delta$, each $\\frac{1}{\\alpha}$ becomes the product of the other three:' },
      { tex: chain(`\\Sigma\\frac{1}{\\alpha} &= \\frac{\\Sigma\\alpha\\beta\\gamma}{\\alpha\\beta\\gamma\\delta}`, `&= \\frac{${e3}}{${e4}} = ${fracTex(e3, e4)}`) },
    ];
  },
};

/**
 * Four fraction options, the right one first, keeping only distractors whose
 * value differs from every option already kept.
 */
function fractionOptions(n: number, d: number, slips: [number, number][]): ChoiceOption[] {
  const kept: [number, number][] = [[n, d]];
  const value = ([a, b]: [number, number]) => a / b;
  for (const slip of [...slips, [n + d, d] as [number, number], [n - d, d] as [number, number], [2 * n, d] as [number, number]]) {
    if (kept.length === 4) break;
    if (slip[1] === 0) continue;
    if (kept.some((k) => Math.abs(value(k) - value(slip)) < 1e-9)) continue;
    kept.push(slip);
  }
  const [right, ...rest] = kept;
  return options(
    { tex: fracTex(right[0], right[1]), answer: fracAnswer(right[0], right[1]) },
    ...rest.map(([a, b]) => ({ tex: fracTex(a, b), answer: fracAnswer(a, b) })),
  );
}

/** Σα and Σαβ from the coefficients, then (Σα)², 2Σαβ, and Σα². */
const q4SquaresTree: Generator<QuarticParams> = {
  id: 'poly-q4-squares-tree',
  sample: (rng, difficulty) => sampleQuartic(rng, difficulty),
  render: ({ roots, lead }): Slide => {
    const p = fromRoots(roots, lead);
    const [e1, e2] = rootSums(roots);
    const values = [e1, e2, e1 * e1, 2 * e2, e1 * e1 - 2 * e2];
    return {
      kind: 'tree',
      prompt: [
        say('Top row: $\\Sigma\\alpha$ and $\\Sigma\\alpha\\beta$. Next: $(\\Sigma\\alpha)^{2}$ and $2\\Sigma\\alpha\\beta$. Last: $\\Sigma\\alpha^{2}$.'),
      ],
      expression: `${polyTex(p)} = 0`,
      nodes: [
        { id: 'e1', from: [] },
        { id: 'e2', from: [] },
        { id: 'sq', from: ['e1'] },
        { id: 'tw', from: ['e2'] },
        { id: 'ss', from: ['sq', 'tw'] },
      ],
      bank: numberBank(values, [-e1, -e2, e1 * e1 + 2 * e2, 2 * e1, e1 * e1 - e2], String, 2),
      answer: values.map(String),
    };
  },
  solution: ({ roots, lead }) => {
    const p = fromRoots(roots, lead);
    const [e1, e2] = rootSums(roots);
    return [
      { tex: chain(identityStep(p, 0).replace(' = ', ' &= '), identityStep(p, 1).replace(' = ', ' &= ')) },
      { tex: chain(`\\Sigma\\alpha^{2} &= (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta`, `&= ${e1 * e1} - ${factor(String(2 * e2))}`, `&= ${e1 * e1 - 2 * e2}`) },
    ];
  },
};

/** Which identity, then what it comes to, for Σα², Σ1/α or Σ1/(αβ). */
interface IdentityFlowParams extends QuarticParams {
  target: 0 | 1 | 2;
}

const TARGETS = ['\\Sigma\\alpha^{2}', '\\Sigma\\frac{1}{\\alpha}', '\\Sigma\\frac{1}{\\alpha\\beta}'];
const FORMULAS = [
  '(\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta',
  '\\frac{\\Sigma\\alpha\\beta\\gamma}{\\alpha\\beta\\gamma\\delta}',
  '\\frac{\\Sigma\\alpha\\beta}{\\alpha\\beta\\gamma\\delta}',
  '\\frac{\\Sigma\\alpha}{\\alpha\\beta\\gamma\\delta}',
];

function identityValue(roots: number[], target: number): [number, number] {
  const [e1, e2, e3, e4] = rootSums(roots);
  if (target === 0) return [e1 * e1 - 2 * e2, 1];
  return target === 1 ? [e3, e4] : [e2, e4];
}

const q4IdentityFlow: Generator<IdentityFlowParams> = {
  id: 'poly-q4-identity-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = sampleQuartic(rng, difficulty);
      const target = rng.int(0, difficulty > 1 ? 2 : 1) as 0 | 1 | 2;
      // A value of 0 would read the same with its sign flipped.
      if (identityValue(base.roots, target)[0] === 0) continue;
      return { ...base, target };
    }
  },
  render: ({ roots, lead, target }): Slide => {
    const p = fromRoots(roots, lead);
    const [e1, e2] = rootSums(roots);
    const [n, d] = identityValue(roots, target);
    const right = fracTex(n, d);
    const key = `${polyTex(p)}|${target}`;
    const formulaBranches = [0, 1, 2, 3]
      .filter((k) => k !== 3 || target > 0)
      .map((k) =>
        k === target
          ? { label: `$${FORMULAS[k]}$`, to: 'value' }
          : { label: `$${FORMULAS[k]}$`, outcome: k === 3 ? 'That puts the sum of the roots on top. Each $\\frac{1}{\\alpha}$ needs the other three roots on top.' : `That is the identity for $${TARGETS[k]}$.` },
      );
    // Twice the pairs added rather than taken away, or the fraction upside down.
    const slip = target === 0 ? fracTex(e1 * e1 + 2 * e2, 1) : fracTex(d, n);
    const values = [...new Set([right, slip, fracTex(-n, d)])];
    const valueBranches = values.map((label) =>
      label === right
        ? { label: `$${label}$`, outcome: 'Found from the coefficients, without the roots.' }
        : { label: `$${label}$`, outcome: target === 0 ? 'Twice the pair products is taken away, not added.' : 'Check which sum goes on top, and its sign.' },
    );
    return {
      kind: 'flow',
      prompt: [say(`${FOUR_ROOTS} are the roots of this quartic. Find $${TARGETS[target]}$.`)],
      subject: `${polyTex(p)} = 0`,
      steps: [
        { id: 'which', ask: `Which is $${TARGETS[target]}$?`, branches: turned(formulaBranches, `${key}|f`) },
        { id: 'value', ask: 'What does it come to?', branches: turned(valueBranches, `${key}|v`) },
      ],
      answer: [`$${FORMULAS[target]}$`, `$${right}$`],
    };
  },
  solution: ({ roots, lead, target }) => {
    const p = fromRoots(roots, lead);
    const [n, d] = identityValue(roots, target);
    const used = target === 0 ? [0, 1] : target === 1 ? [2, 3] : [1, 3];
    return [
      { tex: chain(...used.map((k) => identityStep(p, k).replace(' = ', ' &= '))) },
      { tex: `${TARGETS[target]} = ${FORMULAS[target]}` },
      { tex: `${TARGETS[target]} = ${fracTex(n, d)}` },
    ];
  },
};

export const rootsQuarticsGenerators = [
  q4Vieta,
  q4SumsTree,
  q4SumsFlow,
  q4BuildTiles,
  q4PairsTiles,
  q4OtherPairTree,
  q4OtherRootsFlow,
  q4PmTiles,
  q4PmSquaresTree,
  q4PmUnknown,
  q4Symmetric,
  q4SquaresTree,
  q4IdentityFlow,
];
