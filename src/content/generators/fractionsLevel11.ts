/**
 * Algebraic Fractions, level 11: partial fractions with higher powers.
 *
 * Level 2 split over a squared bracket; this level goes further. A cubed
 * bracket takes a part over each of its three powers. A squared bracket beside
 * two single ones makes four parts, three of them reached by cover-up. A power
 * of x is a repeated bracket like any other. An improper fraction with a
 * repeated factor is divided first. And the last lesson reads a bottom that
 * mixes all of these, with a quadratic that will not split, and chooses the
 * form before finding one numerator.
 *
 * Every fraction is built outward from its split: the factors and the
 * numerators are drawn first and multiplied up (`topOf`), so every numerator
 * the learner finds is whole by construction. Forms go through tiles, choice,
 * steps, tree and flow; only numbers are typed.
 */
import type { Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import {
  br,
  chain as alignedLines,
  choiceSlide,
  distinct,
  firstFour,
  frac,
  fracTerm,
  intOptions,
  nonZero,
  numberBank,
  paren,
  pbr,
  show,
  signed,
  signedFracTerm,
  stepBank,
  tileBank,
  turned,
} from './algebraicFractions';
import { coeffTex, say } from './format';
import { type Poly, addPoly, mulPoly, scalePoly, valueAt, polyTex } from './polynomials';

/**
 * Lines of working aligned on their `&`, a minus that opens a cell kept as a
 * sign. KaTeX starts each aligned cell with an empty group, so `&-4x` is set
 * as a subtraction, "− 4x" with a gap; `&{-}4x` reads as the negative it is.
 */
const chain = (...lines: string[]): string => alignedLines(...lines.map((line) => line.replace(/&(\s*)-/g, '&$1{-}')));

/* ================================================================
 * A bottom as a list of factors, and a split over it
 * ================================================================ */

/** (x + c)^n, where c = 0 is a power of x; or x^2 + px + q, which will not split. */
export type Factor = { kind: 'lin'; c: number; n: number } | { kind: 'quad'; p: number; q: number };

/** A numerator: a number over a linear power, or [A, B] for Ax + B over a quadratic. */
export type Num = number | [number, number];

interface Part {
  /** Which factor. */
  f: number;
  /** Which power of it. Always 1 for a quadratic. */
  j: number;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function powPoly(p: Poly, n: number): Poly {
  let out: Poly = [1];
  for (let i = 0; i < n; i += 1) out = mulPoly(out, p);
  return out;
}

const factorPoly = (f: Factor): Poly => (f.kind === 'lin' ? [1, f.c] : [1, f.p, f.q]);
const powerOf = (f: Factor): number => (f.kind === 'lin' ? f.n : 1);

function productPoly(factors: Factor[]): Poly {
  return factors.reduce<Poly>((acc, f) => mulPoly(acc, powPoly(factorPoly(f), powerOf(f))), [1]);
}

function partsOf(factors: Factor[]): Part[] {
  return factors.flatMap((f, i) =>
    f.kind === 'lin' ? Array.from({ length: f.n }, (_, k) => ({ f: i, j: k + 1 })) : [{ f: i, j: 1 }],
  );
}

/** The bottom of one part: x + 2, (x + 2)^2, x^3, x^2 + 4. */
function denTex(f: Factor, j: number): string {
  if (f.kind === 'quad') return polyTex([1, f.p, f.q]);
  if (f.c === 0) return j === 1 ? 'x' : `x^{${j}}`;
  return j === 1 ? br(f.c) : `${pbr(f.c)}^{${j}}`;
}

/** One factor as it is written in a product. */
function factorTex(f: Factor): string {
  if (f.kind === 'quad') return `(${polyTex([1, f.p, f.q])})`;
  if (f.c === 0) return f.n === 1 ? 'x' : `x^{${f.n}}`;
  return f.n === 1 ? pbr(f.c) : `${pbr(f.c)}^{${f.n}}`;
}

export const bottomTex = (factors: Factor[]): string => factors.map(factorTex).join('');

/** The bottom with this part's own power of its factor taken out. */
function cofactor(factors: Factor[], part: Part): Poly {
  return factors.reduce<Poly>((acc, f, i) => {
    const n = i === part.f ? powerOf(f) - part.j : powerOf(f);
    return mulPoly(acc, powPoly(factorPoly(f), n));
  }, [1]);
}

/** The top of the fraction the split adds up to, plus `whole` times the bottom. */
export function topOf(factors: Factor[], nums: Num[], whole: Poly = [0]): Poly {
  let top: Poly = scalePoly(productPoly(factors), 0);
  top = addPoly(top, mulPoly(whole, productPoly(factors)));
  partsOf(factors).forEach((part, i) => {
    const num = nums[i];
    top = addPoly(top, mulPoly(typeof num === 'number' ? [num] : num, cofactor(factors, part)));
  });
  return top;
}

/** The letter (or Ax + B) each part carries, in order. */
function letterTops(factors: Factor[]): string[] {
  let k = 0;
  return partsOf(factors).map((part) => {
    if (factors[part.f].kind === 'quad') {
      const top = `${LETTERS[k]}x + ${LETTERS[k + 1]}`;
      k += 2;
      return top;
    }
    k += 1;
    return LETTERS[k - 1];
  });
}

/** The form with letters: A/(x + 1) + B/(x + 1)^2 + (Cx + D)/(x^2 + 4). */
export function lettersTex(factors: Factor[]): string {
  const tops = letterTops(factors);
  return partsOf(factors)
    .map((part, i) => frac(tops[i], denTex(factors[part.f], part.j)))
    .join(' + ');
}

/** Letters over bottoms given directly, for the wrong forms offered beside the right one. */
function lettersOver(dens: { den: string; quad?: boolean }[]): string {
  let k = 0;
  return dens
    .map(({ den, quad }) => {
      if (quad) {
        k += 2;
        return frac(`${LETTERS[k - 2]}x + ${LETTERS[k - 1]}`, den);
      }
      k += 1;
      return frac(LETTERS[k - 1], den);
    })
    .join(' + ');
}

/** One part with its numbers in, signed unless it comes first. A negative Ax + B takes its minus outside. */
function partTex(num: Num, den: string, first: boolean): string {
  if (typeof num === 'number') return first ? fracTerm(num, den) : signedFracTerm(num, den);
  const [A, B] = num;
  const negative = A < 0;
  const body = frac(polyTex(negative ? [-A, -B] : [A, B]), den);
  if (first) return negative ? `-${body}` : body;
  return negative ? `- ${body}` : `+ ${body}`;
}

/** The split with its numbers in. */
export function splitOf(factors: Factor[], nums: Num[], leadingWhole = false): string {
  return partsOf(factors)
    .map((part, i) => partTex(nums[i], denTex(factors[part.f], part.j), i === 0 && !leadingWhole))
    .join(' ');
}

const fractionTex = (factors: Factor[], nums: Num[], whole: Poly = [0]): string =>
  frac(polyTex(topOf(factors, nums, whole)), bottomTex(factors));

/** The coefficient of x^k. */
const coef = (p: Poly, k: number): number => p[p.length - 1 - k] ?? 0;

/** A number times a letter, as the learner reads it: 3B, -B. */
const times = (k: number, letter: string): string => coeffTex(k, letter);

/** An expression in u rather than x. */
const uTex = (p: Poly): string => polyTex(p).replace(/x/g, 'u');

function signedU(p: Poly): string {
  const tex = uTex(p);
  return tex.startsWith('-') ? `- ${tex.slice(1)}` : `+ ${tex}`;
}

/** A number in front of a bracket, first on its line: 2(...), (...), -(...). */
const lead = (k: number): string => (k === 1 ? '' : k === -1 ? '-' : String(k));

/** The same after another term: + 2(...), - (...). */
function signedLead(k: number): string {
  if (k === 1) return '+ ';
  if (k === -1) return '- ';
  return k > 0 ? `+ ${k}` : `- ${-k}`;
}

/* ================================================================
 * Lesson 1: a cubed factor
 * ================================================================ */

interface Cubed {
  a: number;
  A: number;
  B: number;
  C: number;
}

const cubedFactors = ({ a }: Cubed): Factor[] => [{ kind: 'lin', c: a, n: 3 }];
const cubedNums = ({ A, B, C }: Cubed): number[] => [A, B, C];
const cubedTop = (p: Cubed): Poly => topOf(cubedFactors(p), cubedNums(p));
const cubedFractionTex = (p: Cubed): string => fractionTex(cubedFactors(p), cubedNums(p));
const cubedLetters = (p: Cubed): string => lettersTex(cubedFactors(p));
const cubedSplit = (p: Cubed): string => splitOf(cubedFactors(p), cubedNums(p));

function sampleCubed(rng: Rng, difficulty: number): Cubed {
  const hard = difficulty > 1;
  for (;;) {
    const p = { a: nonZero(rng, hard ? 5 : 3), A: nonZero(rng, hard ? 4 : 3), B: nonZero(rng, hard ? 7 : 5), C: nonZero(rng, hard ? 9 : 6) };
    const top = cubedTop(p);
    if (top.length === 3 && top[1] !== 0 && top[2] !== 0) return p;
  }
}

function cubedSolution(p: Cubed): SolutionStep[] {
  const { a, A, B, C } = p;
  const top = cubedTop(p);
  return [
    { text: `Multiply both sides by $${pbr(a)}^{3}$. The tops agree for every $x$:` },
    { tex: chain(`&${polyTex(top)}`, `=\\;&A${pbr(a)}^{2} + B${pbr(a)} + C`) },
    { text: `Put $x = ${-a}$: both brackets are zero, so $C$ is the top there, $C = ${C}$.` },
    { text: `The $x^{2}$ terms: only $A${pbr(a)}^{2}$ has one, so $A = ${A}$.` },
    { text: `The $x$ terms: $A${pbr(a)}^{2}$ puts in $${times(2 * a, 'A')} = ${2 * a * A}$, and $B$ makes up the rest:` },
    { tex: chain(`${2 * a * A} + B &= ${top[1]}`, `B &= ${B}`) },
    { tex: cubedSplit(p) },
  ];
}

interface CubedForm extends Cubed {
  /** A single bracket (x + b) beside the cube at difficulty 2, with D over it. */
  b: number | null;
  D: number | null;
}

function cubedFormFactors(p: CubedForm): Factor[] {
  return p.b === null ? cubedFactors(p) : [...cubedFactors(p), { kind: 'lin', c: p.b, n: 1 }];
}

const cubedFormNums = (p: CubedForm): number[] => (p.D === null ? cubedNums(p) : [...cubedNums(p), p.D]);

/** Which form the split takes: a part over each power, up to the cube. */
const af11CubedForm: Generator<CubedForm> = {
  id: 'af11-cubed-form',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const [a, b] = distinct(rng, 2, 4);
      return { a, b, A: nonZero(rng, 3), B: nonZero(rng, 3), C: nonZero(rng, 3), D: nonZero(rng, 3) };
    }
    return { ...sampleCubed(rng, 1), b: null, D: null };
  },
  render: (p): Slide => {
    const one = { den: br(p.a) };
    const two = { den: `${pbr(p.a)}^{2}` };
    const three = { den: `${pbr(p.a)}^{3}` };
    const other = p.b === null ? [] : [{ den: br(p.b) }];
    return choiceSlide(
      [say('Which form does the split of this fraction take?'), show(fractionTex(cubedFormFactors(p), cubedFormNums(p)))],
      firstFour(
        lettersTex(cubedFormFactors(p)),
        lettersOver([three, ...other]),
        lettersOver([one, three, ...other]),
        lettersOver([one, two, ...other]),
      ),
    );
  },
  solution: (p) => [
    { text: `A bracket cubed needs a part over each power of it: over $${br(p.a)}$, $${pbr(p.a)}^{2}$ and $${pbr(p.a)}^{3}$.` },
    ...(p.b === null ? [] : [{ text: `The single bracket $${pbr(p.b)}$ gets one part of its own.` }]),
    { tex: lettersTex(cubedFormFactors(p)) },
    { text: `Over $${pbr(p.a)}^{3}$ the cube's parts add to one top of degree $2$, with three coefficients to match, so it takes three letters. Leave out any power and some tops cannot be made.` },
  ],
};

/** C by putting x = -a, A from the x^2 terms, then B from the x terms. */
const af11CubedTree: Generator<Cubed> = {
  id: 'af11-cubed-tree',
  sample: sampleCubed,
  render: (p): Slide => {
    const { a, A, B, C } = p;
    const top = cubedTop(p);
    const answer = [C, A, 2 * a * A, B];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Split into $${cubedLetters(p)}$. First: $C$, the top at $x = ${-a}$. Then $A$, from the $x^{2}$ terms. Then the $x$ terms that $A${pbr(a)}^{2}$ puts in, $${times(2 * a, 'A')}$. Last: $B$, the rest of the $x$ terms.`,
        ),
      ],
      expression: cubedFractionTex(p),
      nodes: [
        { id: 'C', from: [] },
        { id: 'A', from: [] },
        { id: 'twoaA', from: ['A'] },
        { id: 'B', from: ['twoaA'] },
      ],
      bank: numberBank(answer, [-C, valueAt(top, a), top[1], -B, -2 * a * A, a * A]),
      answer: answer.map(String),
    };
  },
  solution: cubedSolution,
};

interface CubedAsk extends Cubed {
  ask: 'B' | 'C';
}

/** One numerator, typed: C by putting x = -a, or B after it. */
const af11CubedValue: Generator<CubedAsk> = {
  id: 'af11-cubed-value',
  sample: (rng, difficulty) => ({ ...sampleCubed(rng, difficulty), ask: difficulty > 1 ? 'B' : 'C' }),
  choices: (p) => {
    const top = cubedTop(p);
    return p.ask === 'C'
      ? intOptions(p.C, [-p.C, valueAt(top, p.a), top[2], p.C + p.A])
      : intOptions(p.B, [top[1], top[1] + 2 * p.a * p.A, -p.B, top[1] - p.a * p.A]);
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [show(cubedFractionTex(p)), say(`This splits as $${cubedLetters(p)}$. Find $${p.ask}$.`)],
    lead: `${p.ask} =`,
    keypad: [],
    answer: String(p.ask === 'C' ? p.C : p.B),
    domain: 'real',
    mode: 'exact',
  }),
  solution: cubedSolution,
};

/** Every numerator placed. */
const af11CubedTiles: Generator<Cubed> = {
  id: 'af11-cubed-tiles',
  sample: sampleCubed,
  render: (p): Slide => {
    const { A, B, C } = p;
    const top = cubedTop(p);
    const answer = [A, B, C];
    return {
      kind: 'tiles',
      prompt: [say(`Split into $${cubedLetters(p)}$. Place the numerators.`), show(cubedFractionTex(p))],
      template: 'A = {0}, \\quad B = {1}, \\quad C = {2}',
      bank: numberBank(answer, [-A, -B, -C, top[1], top[2]]),
      answer: answer.map(String),
    };
  },
  solution: cubedSolution,
};

/**
 * The top rewritten in u = x + a, one piece at a time, then divided by u^3.
 * The first piece is where (u - a)^2 loses its middle term.
 */
const af11CubedShiftSteps: Generator<Cubed> = {
  id: 'af11-cubed-shift-steps',
  sample: sampleCubed,
  render: (p): Slide => {
    const { a, A, B, C } = p;
    const [tp, tq, tr] = cubedTop(p);
    const inside = `u ${signed(-a)}`;
    const first = uTex([tp, -2 * a * tp, a * a * tp]);
    const second = signedU([tq, -a * tq]);
    const collected = uTex([A, B, C]);
    const split = cubedSplit(p);
    const factors = cubedFactors(p);
    return {
      kind: 'steps',
      prompt: [
        show(cubedFractionTex(p)),
        say(
          `Put $u = ${br(a)}$, so $x = ${inside}$, and the top becomes the line below. Expand each piece, collect, then divide by $u^{3}$ to split. Tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: [`${lead(tp)}(${inside})^{2}`, `${signedLead(tq)}(${inside})`, signed(tr)],
      reductions: [
        {
          span: [0, 1],
          value: first,
          bank: stepBank(first, uTex([tp, 0, a * a * tp]), uTex([tp, 2 * a * tp, a * a * tp]), uTex([tp, -a * tp, a * a * tp])),
        },
        { span: [1, 2], value: second, bank: stepBank(second, signedU([tq, a * tq]), signedU([tq, -a]), signedU([-tq, -a * tq])) },
        { span: [0, 3], value: collected, bank: stepBank(collected, uTex([A, -B, C]), uTex([A, B, -C]), uTex([A, B + 2 * a * A, C])) },
        {
          span: [0, 1],
          value: split,
          bank: stepBank(
            split,
            splitOf(factors, [C, B, A]),
            splitOf(factors, [A, -B, C]),
            splitOf([{ kind: 'lin', c: -a, n: 3 }], [A, B, C]),
          ),
        },
      ],
    };
  },
  solution: (p) => {
    const { a, A, B, C } = p;
    const [tp, tq, tr] = cubedTop(p);
    const inside = `u ${signed(-a)}`;
    return [
      { text: `With $u = ${br(a)}$, $x = ${inside}$. Put that into the top:` },
      {
        tex: chain(
          `&${lead(tp)}(${inside})^{2} ${signedLead(tq)}(${inside}) ${signed(tr)}`,
          `=\\;&${uTex([tp, -2 * a * tp, a * a * tp])}`,
          `&\\quad ${signedU([tq, -a * tq])} ${signed(tr)}`,
          `=\\;&${uTex([A, B, C])}`,
        ),
      },
      { text: `Divide each term by $u^{3}$: $${splitOf([{ kind: 'lin', c: 0, n: 3 }], [A, B, C]).replace(/x/g, 'u')}$. Put $u = ${br(a)}$ back:` },
      { tex: cubedSplit(p) },
    ];
  },
};

/* ================================================================
 * Lesson 2: a squared factor with two others
 * ================================================================ */

interface Four {
  /** The bottom is (x + a)^2 (x + b)(x + c). */
  a: number;
  b: number;
  c: number;
  A: number;
  B: number;
  C: number;
  D: number;
}

const fourFactors = ({ a, b, c }: Four): Factor[] => [
  { kind: 'lin', c: a, n: 2 },
  { kind: 'lin', c: b, n: 1 },
  { kind: 'lin', c: c, n: 1 },
];
const fourNums = ({ A, B, C, D }: Four): number[] => [A, B, C, D];
const fourTop = (p: Four): Poly => topOf(fourFactors(p), fourNums(p));
const fourFractionTex = (p: Four): string => fractionTex(fourFactors(p), fourNums(p));
const fourLetters = (p: Four): string => lettersTex(fourFactors(p));

function sampleFour(rng: Rng, difficulty: number): Four {
  const hard = difficulty > 1;
  for (;;) {
    const [a, b, c] = distinct(rng, 3, hard ? 4 : 3);
    const [A, B, C, D] = Array.from({ length: 4 }, () => nonZero(rng, hard ? 5 : 3));
    if (A + C + D !== 0) return { a, b, c, A, B, C, D };
  }
}

/** What cover-up reads at each root: the top there, and the rest of the bottom there. */
function fourValues(p: Four) {
  const { a, b, c } = p;
  const top = fourTop(p);
  return {
    top,
    x3: coef(top, 3),
    atB: valueAt(top, -a),
    restB: (b - a) * (c - a),
    atC: valueAt(top, -b),
    restC: (a - b) * (a - b) * (c - b),
    atD: valueAt(top, -c),
    restD: (a - c) * (a - c) * (b - c),
  };
}

function fourSolution(p: Four): SolutionStep[] {
  const { a, b, c, A, B, C, D } = p;
  const { top, x3, atB, restB, atC, restC, atD, restD } = fourValues(p);
  return [
    { text: 'Multiply both sides by the bottom. The tops agree for every $x$:' },
    {
      tex: chain(
        `&${polyTex(top)}`,
        `=\\;&A${pbr(a)}${pbr(b)}${pbr(c)}`,
        `&\\quad + B${pbr(b)}${pbr(c)}`,
        `&\\quad + C${pbr(a)}^{2}${pbr(c)}`,
        `&\\quad + D${pbr(a)}^{2}${pbr(b)}`,
      ),
    },
    { text: `Put $x = ${-a}$: only $B$ survives, $${atB} = ${times(restB, 'B')}$, so $B = ${B}$.` },
    { text: `Put $x = ${-b}$: only $C$ survives, $${atC} = ${times(restC, 'C')}$, so $C = ${C}$.` },
    { text: `Put $x = ${-c}$: only $D$ survives, $${atD} = ${times(restD, 'D')}$, so $D = ${D}$.` },
    { text: `No value of $x$ isolates $A$. Compare the $x^{3}$ terms: $A + C + D = ${x3}$, so $A = ${A}$.` },
    { tex: splitOf(fourFactors(p), fourNums(p)) },
  ];
}

/** Which form: two parts for the square, one for each single bracket. */
const af11FourForm: Generator<Four> = {
  id: 'af11-four-form',
  sample: sampleFour,
  render: (p): Slide => {
    const one = { den: br(p.a) };
    const two = { den: `${pbr(p.a)}^{2}` };
    const second = { den: br(p.b) };
    const third = { den: br(p.c) };
    return choiceSlide(
      [say('Which form does the split of this fraction take?'), show(fourFractionTex(p))],
      firstFour(fourLetters(p), lettersOver([two, second, third]), lettersOver([one, second, third]), lettersOver([one, two, second])),
    );
  },
  solution: (p) => [
    { text: `The squared bracket needs a part over $${br(p.a)}$ and a part over $${pbr(p.a)}^{2}$. Each single bracket gets one part.` },
    { tex: fourLetters(p) },
    { text: 'Four letters, to match the four coefficients of a top of degree $3$. The bottom has degree $4$, and the count always matches it.' },
  ],
};

/** C and D by cover-up, each from the top and the rest of the bottom there, then A. */
const af11FourCoverTree: Generator<Four> = {
  id: 'af11-four-cover-tree',
  sample: sampleFour,
  render: (p): Slide => {
    const { a, b, c, A, C, D } = p;
    const { x3, atC, restC, atD, restD } = fourValues(p);
    const answer = [atC, restC, atD, restD, C, D, A];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Split into $${fourLetters(p)}$. Top row: the top at $x = ${-b}$, and $${pbr(a)}^{2}${pbr(c)}$ there; the top at $x = ${-c}$, and $${pbr(a)}^{2}${pbr(b)}$ there. Below: $C$ and $D$. Last: $A$, from the $x^{3}$ terms, $A + C + D = ${x3}$.`,
        ),
      ],
      expression: fourFractionTex(p),
      nodes: [
        { id: 'top-b', from: [] },
        { id: 'rest-b', from: [] },
        { id: 'top-c', from: [] },
        { id: 'rest-c', from: [] },
        { id: 'C', from: ['top-b', 'rest-b'] },
        { id: 'D', from: ['top-c', 'rest-c'] },
        { id: 'A', from: ['C', 'D'] },
      ],
      bank: numberBank(answer, [-C, -D, -A, x3 - C, -restC, -restD]),
      answer: answer.map(String),
    };
  },
  solution: fourSolution,
};

interface FourAsk extends Four {
  ask: 'A' | 'B' | 'C' | 'D';
}

function fourAsked(p: FourAsk): number {
  return { A: p.A, B: p.B, C: p.C, D: p.D }[p.ask];
}

/** One numerator, typed: B, C or D by cover-up, or A from the x^3 terms after them. */
const af11FourValue: Generator<FourAsk> = {
  id: 'af11-four-value',
  sample: (rng, difficulty) => ({
    ...sampleFour(rng, difficulty),
    ask: difficulty > 1 ? 'A' : rng.pick<'B' | 'C' | 'D'>(['B', 'C', 'D']),
  }),
  choices: (p) => {
    const k = fourAsked(p);
    const v = fourValues(p);
    if (p.ask === 'A') return intOptions(k, [v.x3, v.x3 - p.C, v.x3 - p.D, -k, v.x3 + p.C + p.D]);
    const at = { B: v.atB, C: v.atC, D: v.atD }[p.ask];
    return intOptions(k, [-k, at, -at, k + 1, k - 1]);
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [show(fourFractionTex(p)), say(`This splits as $${fourLetters(p)}$. Find $${p.ask}$.`)],
    lead: `${p.ask} =`,
    keypad: [],
    answer: String(fourAsked(p)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: fourSolution,
};

/** Cover-up for C as a line of working, where the squared bracket is the step that goes wrong. */
const af11FourSquareSteps: Generator<Four> = {
  id: 'af11-four-square-steps',
  sample: sampleFour,
  render: (p): Slide => {
    const { a, b, c, C } = p;
    const { atC, restC } = fourValues(p);
    const sq = (a - b) * (a - b);
    const k = c - b;
    return {
      kind: 'steps',
      prompt: [
        show(fourFractionTex(p)),
        say(
          `This splits as $${fourLetters(p)}$. For $C$, cover $${pbr(b)}$ and put $x = ${-b}$ into the rest: the top there is $${atC}$. Tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: [String(atC), '\\div', '[', `(${paren(-b)} ${signed(a)})^{2}`, `(${paren(-b)} ${signed(c)})`, ']'],
      reductions: [
        { span: [3, 4], value: String(sq), bank: stepBank(String(sq), String(-sq), String(2 * (a - b)), String((a + b) * (a + b))) },
        {
          span: [4, 5],
          value: `\\times ${paren(k)}`,
          bank: stepBank(`\\times ${paren(k)}`, `\\times ${paren(-k)}`, `\\times ${paren(c + b)}`, `\\times ${paren(-b - c)}`),
        },
        {
          span: [2, 6],
          operator: 4,
          value: paren(restC),
          bank: stepBank(paren(restC), paren(-restC), paren(sq + k), paren(restC + 1)),
        },
        { span: [0, 3], operator: 1, value: String(C), bank: stepBank(String(C), String(-C), String(atC - restC), String(C + 1)) },
      ],
    };
  },
  solution: (p) => {
    const { a, b, c, C } = p;
    const { atC, restC } = fourValues(p);
    return [
      { text: `Cover $${pbr(b)}$ and put $x = ${-b}$ into the rest. The top there is $${atC}$.` },
      {
        tex: chain(
          `C &= ${atC}`,
          `&\\; \\div [(${paren(-b)} ${signed(a)})^{2}(${paren(-b)} ${signed(c)})]`,
          `&= ${atC} \\div [${(a - b) * (a - b)} \\times ${paren(c - b)}]`,
          `&= ${atC} \\div ${paren(restC)}`,
          `&= ${C}`,
        ),
      },
      { text: `The square of $${a - b}$ is $${(a - b) * (a - b)}$, positive whatever the sign inside.` },
    ];
  },
};

/** All four numerators placed. */
const af11FourTiles: Generator<Four> = {
  id: 'af11-four-tiles',
  sample: sampleFour,
  render: (p): Slide => {
    const { A, B, C, D } = p;
    const { x3 } = fourValues(p);
    const answer = [A, B, C, D];
    return {
      kind: 'tiles',
      prompt: [say(`Split into $${fourLetters(p)}$. Place the numerators.`), show(fourFractionTex(p))],
      template: 'A = {0}, \\quad B = {1}, \\quad C = {2}, \\quad D = {3}',
      bank: numberBank(answer, [-A, -B, -C, -D, x3]),
      answer: answer.map(String),
    };
  },
  solution: fourSolution,
};

/* ================================================================
 * Lesson 3: powers of x
 * ================================================================ */

interface XPow {
  /** The bottom is x^n (x + b). */
  n: 2 | 3;
  b: number;
  /** Over x, x^2 (, x^3), then over (x + b). */
  nums: number[];
}

const xpowFactors = ({ n, b }: XPow): Factor[] => [
  { kind: 'lin', c: 0, n },
  { kind: 'lin', c: b, n: 1 },
];
const xpowTop = (p: XPow): Poly => topOf(xpowFactors(p), p.nums);
const xpowFractionTex = (p: XPow): string => fractionTex(xpowFactors(p), p.nums);
const xpowLetters = (p: XPow): string => lettersTex(xpowFactors(p));

function sampleXPow(rng: Rng, difficulty: number): XPow {
  const n = difficulty > 1 ? 3 : 2;
  for (;;) {
    const b = nonZero(rng, n === 3 ? 3 : 5);
    const nums = Array.from({ length: n + 1 }, () => nonZero(rng, n === 3 ? 4 : 5));
    const top = xpowTop({ n, b, nums });
    if (top.length === n + 1 && top.every((t) => t !== 0)) return { n, b, nums };
  }
}

/** The letter over x^n, found at x = 0, and the one over (x + b). */
const topLetter = (p: XPow): string => LETTERS[p.n - 1];
const bracketLetter = (p: XPow): string => LETTERS[p.n];

function xpowSolution(p: XPow): SolutionStep[] {
  const { n, b, nums } = p;
  const top = xpowTop(p);
  const r = coef(top, 0);
  const atB = valueAt(top, -b);
  const powB = (-b) ** n;
  if (n === 2) {
    const [A, B, C] = nums;
    return [
      { text: 'Multiply both sides by the bottom:' },
      { tex: chain(`&${polyTex(top)}`, `=\\;&Ax${pbr(b)} + B${pbr(b)} + Cx^{2}`) },
      { text: `Put $x = 0$: only $B${pbr(b)}$ survives, $${r} = ${times(b, 'B')}$, so $B = ${B}$.` },
      { text: `Put $x = ${-b}$: only $Cx^{2}$ survives, $${atB} = ${times(powB, 'C')}$, so $C = ${C}$.` },
      { text: `The $x^{2}$ terms: $A + C = ${coef(top, 2)}$, so $A = ${A}$.` },
      { tex: splitOf(xpowFactors(p), nums) },
    ];
  }
  const [A, B, C, D] = nums;
  return [
    { text: 'Multiply both sides by the bottom:' },
    { tex: chain(`&${polyTex(top)}`, `=\\;&Ax^{2}${pbr(b)} + Bx${pbr(b)}`, `&\\quad + C${pbr(b)} + Dx^{3}`) },
    { text: 'Work up from the numbers, one power at a time:' },
    {
      tex: chain(
        `\\text{numbers:} &\\;\\; ${times(b, 'C')} = ${r}`,
        `x \\text{ terms:} &\\;\\; ${times(b, 'B')} + C = ${coef(top, 1)}`,
        `x^{2} \\text{ terms:} &\\;\\; ${times(b, 'A')} + B = ${coef(top, 2)}`,
        `x^{3} \\text{ terms:} &\\;\\; A + D = ${coef(top, 3)}`,
      ),
    },
    { text: `So $C = ${C}$, $B = ${B}$, $A = ${A}$ and $D = ${D}$. Putting $x = ${-b}$ checks $D$: $${atB} = ${times(powB, 'D')}$.` },
    { tex: splitOf(xpowFactors(p), nums) },
  ];
}

/** Which form: a part over each power of x, and one over the bracket. */
const af11XpowForm: Generator<XPow> = {
  id: 'af11-xpow-form',
  sample: sampleXPow,
  render: (p): Slide => {
    const other = { den: br(p.b) };
    const x = (j: number) => ({ den: j === 1 ? 'x' : `x^{${j}}` });
    const opts =
      p.n === 2
        ? firstFour(xpowLetters(p), lettersOver([x(2), other]), lettersOver([x(1), other]), lettersOver([x(1), other, { den: `${pbr(p.b)}^{2}` }]))
        : firstFour(xpowLetters(p), lettersOver([x(3), other]), lettersOver([x(1), x(3), other]), lettersOver([x(1), x(2), other]));
    return choiceSlide([say('Which form does the split of this fraction take?'), show(xpowFractionTex(p))], opts);
  },
  solution: (p) => [
    { text: `$x^{${p.n}}$ is the bracket $x$ repeated ${p.n === 2 ? 'twice' : 'three times'}, so it needs a part over each power of $x$ up to $x^{${p.n}}$.` },
    { text: `The bracket $${pbr(p.b)}$ gets one part of its own.` },
    { tex: xpowLetters(p) },
  ],
};

/**
 * The numerators as a tree. Over x^2 (x + b): B from x = 0, C from x = -b, A
 * from the x^2 terms. Over x^3 (x + b): up from the numbers, a power at a time.
 */
const af11XpowTree: Generator<XPow> = {
  id: 'af11-xpow-tree',
  sample: sampleXPow,
  render: (p): Slide => {
    const { n, b, nums } = p;
    const top = xpowTop(p);
    const r = coef(top, 0);
    if (n === 2) {
      const [A, B, C] = nums;
      const atB = valueAt(top, -b);
      const answer = [B, atB, C, A];
      return {
        kind: 'tree',
        prompt: [
          say(
            `Split into $${xpowLetters(p)}$. First: $B$, from $x = 0$. Then the top at $x = ${-b}$, and $C$ from it. Last: $A$, from the $x^{2}$ terms, $A + C = ${coef(top, 2)}$.`,
          ),
        ],
        expression: xpowFractionTex(p),
        nodes: [
          { id: 'B', from: [] },
          { id: 'top-b', from: [] },
          { id: 'C', from: ['top-b'] },
          { id: 'A', from: ['C'] },
        ],
        bank: numberBank(answer, [r, -B, -C, coef(top, 2) + C]),
        answer: answer.map(String),
      };
    }
    const [A, B, C, D] = nums;
    const answer = [C, B, A, D];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Split into $${xpowLetters(p)}$. Work up from the numbers: $C$ from $x = 0$, then $B$ from the $x$ terms, then $A$ from the $x^{2}$ terms, and last $D$ from the $x^{3}$ terms.`,
        ),
      ],
      expression: xpowFractionTex(p),
      nodes: [
        { id: 'C', from: [] },
        { id: 'B', from: ['C'] },
        { id: 'A', from: ['B'] },
        { id: 'D', from: ['A'] },
      ],
      bank: numberBank(answer, [r, -C, -B, coef(top, 3), -D]),
      answer: answer.map(String),
    };
  },
  solution: xpowSolution,
};

interface XPowAsk extends XPow {
  /** Which part: the one over x^n, or the one over (x + b). */
  ask: 'power' | 'bracket';
}

const xpowAskLetter = (p: XPowAsk): string => (p.ask === 'power' ? topLetter(p) : bracketLetter(p));
const xpowAsked = (p: XPowAsk): number => p.nums[p.ask === 'power' ? p.n - 1 : p.n];

/** One numerator, typed: the one over the top power of x, or the one over the bracket. */
const af11XpowValue: Generator<XPowAsk> = {
  id: 'af11-xpow-value',
  sample: (rng, difficulty) => ({ ...sampleXPow(rng, difficulty), ask: rng.pick<'power' | 'bracket'>(['power', 'bracket']) }),
  choices: (p) => {
    const k = xpowAsked(p);
    const top = xpowTop(p);
    return p.ask === 'power'
      ? intOptions(k, [coef(top, 0), -k, coef(top, 1), k + p.b])
      : intOptions(k, [valueAt(top, -p.b), -k, coef(top, p.n), valueAt(top, p.b)]);
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [show(xpowFractionTex(p)), say(`This splits as $${xpowLetters(p)}$. Find $${xpowAskLetter(p)}$.`)],
    lead: `${xpowAskLetter(p)} =`,
    keypad: [],
    answer: String(xpowAsked(p)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: xpowSolution,
};

/** Every numerator placed. */
const af11XpowTiles: Generator<XPow> = {
  id: 'af11-xpow-tiles',
  sample: sampleXPow,
  render: (p): Slide => {
    const top = xpowTop(p);
    const letters = LETTERS.slice(0, p.n + 1);
    return {
      kind: 'tiles',
      prompt: [say(`Split into $${xpowLetters(p)}$. Place the numerators.`), show(xpowFractionTex(p))],
      template: letters.map((l, i) => `${l} = {${i}}`).join(', \\quad '),
      bank: numberBank(p.nums, [...p.nums.map((v) => -v), coef(top, 0)]),
      answer: p.nums.map(String),
    };
  },
  solution: xpowSolution,
};

/** Which letter x = 0 leaves, what it is, then which x reaches the bracket's part. */
const af11XpowFlow: Generator<XPow> = {
  id: 'af11-xpow-flow',
  sample: sampleXPow,
  render: (p): Slide => {
    const { n, b } = p;
    const top = xpowTop(p);
    const r = coef(top, 0);
    const letter = topLetter(p);
    const v = p.nums[n - 1];
    const letters = LETTERS.slice(0, n + 1);
    const values = [...new Set([v, r, -v, v + b, r * b])].slice(0, 4).map((k) => `$${k}$`);
    const xs = [`$x = ${-b}$`, `$x = ${b}$`, '$x = 0$'];
    return {
      kind: 'flow',
      prompt: [say(`This splits as $${xpowLetters(p)}$. Multiply up, then decide what each value of $x$ tells you.`)],
      subject: xpowFractionTex(p),
      steps: [
        {
          id: 'zero',
          ask: 'Put $x = 0$ into the multiplied-up tops. Which letter is left?',
          branches: letters.map((l) =>
            l === letter
              ? { label: `$${l}$`, to: 'value' }
              : { label: `$${l}$`, outcome: `No: at $x = 0$ the part with $${l}$ on top still carries a factor of $x$, so it vanishes.` },
          ),
        },
        {
          id: 'value',
          ask: 'What is it?',
          branches: turned(values, values.join()).map((label) => ({ label, to: 'bracket' })),
        },
        {
          id: 'bracket',
          ask: `Which value of $x$ isolates the part over $${pbr(b)}$?`,
          branches: turned(xs, xs.join()).map((label) => ({
            label,
            outcome: label === `$x = ${-b}$` ? `Yes: it makes $${br(b)}$ zero, which clears every part but the one over $${pbr(b)}$.` : `That does not make $${br(b)}$ zero.`,
          })),
        },
      ],
      answer: [`$${letter}$`, `$${v}$`, `$x = ${-b}$`],
    };
  },
  solution: xpowSolution,
};

/* ================================================================
 * Lesson 4: repeated factors with a whole part
 * ================================================================ */

interface Whole {
  /** The whole number in front. */
  k: number;
  a: number;
  A: number;
  B: number;
  /** A third bracket (x + b) with C over it, or none. */
  b: number | null;
  C: number | null;
  /** For the flow: a fraction with no whole part at all. */
  proper: boolean;
}

function wholeFactors({ a, b }: Whole): Factor[] {
  const sq: Factor = { kind: 'lin', c: a, n: 2 };
  return b === null ? [sq] : [sq, { kind: 'lin', c: b, n: 1 }];
}

const wholeNums = ({ A, B, C }: Whole): number[] => (C === null ? [A, B] : [A, B, C]);
const wholeTop = (p: Whole): Poly => topOf(wholeFactors(p), wholeNums(p), p.proper ? [0] : [p.k]);
const wholeRest = (p: Whole): Poly => topOf(wholeFactors(p), wholeNums(p));
const wholeFractionTex = (p: Whole): string => frac(polyTex(wholeTop(p)), bottomTex(wholeFactors(p)));
const wholeLetters = (p: Whole): string => lettersTex(wholeFactors(p));
const wholeSplit = (p: Whole): string => `${p.k} ${splitOf(wholeFactors(p), wholeNums(p), true)}`;

/** Over (x + a)^2 alone, wider at difficulty 2. */
function sampleWholeTwo(rng: Rng, difficulty: number): Whole {
  const hard = difficulty > 1;
  return {
    k: rng.pick(hard ? [2, 3, 4, -1, -2, -3, -4] : [1, 2, 3, -1, -2]),
    a: nonZero(rng, hard ? 6 : 4),
    A: nonZero(rng, hard ? 6 : 4),
    B: nonZero(rng, hard ? 9 : 6),
    b: null,
    C: null,
    proper: false,
  };
}

/** Over (x + a)^2 at difficulty 1, and (x + a)^2 (x + b) at difficulty 2. */
function sampleWhole(rng: Rng, difficulty: number, proper = false): Whole {
  if (difficulty > 1) {
    const [a, b] = distinct(rng, 2, 3);
    return { k: rng.pick([1, 2, 3, -1, -2]), a, b, A: nonZero(rng, 4), B: nonZero(rng, 4), C: nonZero(rng, 4), proper };
  }
  return { ...sampleWholeTwo(rng, 1), proper };
}

function wholeSolution(p: Whole): SolutionStep[] {
  const { k, a, b, A, B, C } = p;
  const bottom = productPoly(wholeFactors(p));
  const top = wholeTop(p);
  const rest = wholeRest(p);
  const steps: SolutionStep[] = [
    { text: `The bottom multiplies out to $${polyTex(bottom)}$, the same degree as the top, so divide first. The leading terms give the whole number, $${k}$.` },
    { tex: chain(`&${polyTex(top)}`, `=\\;&${lead(k)}(${polyTex(bottom)})`, `&\\quad + (${polyTex(rest)})`) },
  ];
  if (b === null || C === null) {
    steps.push(
      { text: `Split what is left: $${polyTex(rest)} = A${pbr(a)} + B$. The $x$ terms give $A = ${A}$, and $x = ${-a}$ gives $B = ${B}$.` },
      { tex: wholeSplit(p) },
    );
    return steps;
  }
  steps.push(
    { text: `Split what is left over $${bottomTex(wholeFactors(p))}$. Cover-up gives $B = ${B}$ at $x = ${-a}$ and $C = ${C}$ at $x = ${-b}$.` },
    { text: `The $x^{2}$ terms of what is left give $A + C = ${coef(rest, 2)}$, so $A = ${A}$.` },
    { tex: wholeSplit(p) },
  );
  return steps;
}

/** Proper or improper, and if improper, the whole number and what is left. */
const af11WholeFlow: Generator<Whole> = {
  id: 'af11-whole-flow',
  sample: (rng, difficulty) => sampleWhole(rng, difficulty, rng.chance(difficulty > 1 ? 0.25 : 0.35)),
  render: (p): Slide => {
    const { k } = p;
    const top = wholeTop({ ...p, proper: false });
    const bottom = bottomTex(wholeFactors(p));
    const rest = wholeRest(p);
    const restTex = frac(polyTex(rest), bottom);
    const wholes = [...new Set([k, -k, k + 1, top[1]])].map((v) => `$${v}$`);
    const flipLast = [...rest.slice(0, -1), -rest[rest.length - 1]];
    const rests = [
      ...new Set([restTex, frac(polyTex(scalePoly(rest, -1)), bottom), frac(polyTex(flipLast), bottom), frac(polyTex(top.slice(1)), bottom)]),
    ];
    return {
      kind: 'flow',
      prompt: [say('Before splitting, decide whether there is a whole part to divide out. Each answer decides what is asked next.')],
      subject: wholeFractionTex(p),
      steps: [
        {
          id: 'degree',
          ask: 'Is the degree of the top at least the degree of the bottom?',
          branches: [
            { label: 'Yes', to: 'whole' },
            { label: 'No', outcome: 'Then it is proper: it splits straight away, with no whole part.' },
          ],
        },
        {
          id: 'whole',
          ask: 'Divide the top by the bottom. What is the whole number in front?',
          branches: turned(wholes, wholes.join()).map((label) => ({ label, to: 'rest' })),
        },
        {
          id: 'rest',
          ask: 'And what proper fraction is left over to split?',
          branches: turned(rests, restTex).map((tex) => ({
            label: `$${tex}$`,
            outcome: `So it splits as a whole number plus the parts of $${tex}$.`,
          })),
        },
      ],
      answer: p.proper ? ['No'] : ['Yes', `$${k}$`, `$${restTex}$`],
    };
  },
  solution: (p) =>
    p.proper
      ? [
          { text: `The top, $${polyTex(wholeTop(p))}$, has a lower degree than the bottom, $${polyTex(productPoly(wholeFactors(p)))}$.` },
          { text: 'So the fraction is proper and splits straight away:' },
          { tex: splitOf(wholeFactors(p), wholeNums(p)) },
        ]
      : wholeSolution(p),
};

/** Divide, then split, as a line rewritten twice. */
const af11WholeSteps: Generator<Whole> = {
  id: 'af11-whole-steps',
  sample: sampleWholeTwo,
  render: (p): Slide => {
    const { k, a, A, B } = p;
    const bottom = bottomTex(wholeFactors(p));
    const rest = wholeRest(p);
    const divided = `${k} + ${frac(polyTex(rest), bottom)}`;
    const split = wholeSplit(p);
    const sq = `${pbr(a)}^{2}`;
    return {
      kind: 'steps',
      prompt: [say('Divide out the whole number first, then split what is left. Tap the line to take the next step, then choose what it becomes.')],
      start: [wholeFractionTex(p)],
      reductions: [
        {
          span: [0, 1],
          value: divided,
          bank: stepBank(divided, `${-k} + ${frac(polyTex(rest), bottom)}`, `${k} + ${frac(polyTex(scalePoly(rest, -1)), bottom)}`, frac(polyTex(rest), bottom)),
        },
        {
          span: [0, 1],
          value: split,
          bank: stepBank(
            split,
            `${k} ${signedFracTerm(B, br(a))} ${signedFracTerm(A, sq)}`,
            `${k} ${signedFracTerm(-A, br(a))} ${signedFracTerm(-B, sq)}`,
            splitOf(wholeFactors(p), wholeNums(p)),
          ),
        },
      ],
    };
  },
  solution: wholeSolution,
};

/** The whole number and every part placed as tiles. */
const af11WholeTiles: Generator<Whole> = {
  id: 'af11-whole-tiles',
  sample: (rng, difficulty) => sampleWhole(rng, difficulty),
  render: (p): Slide => {
    const { k, a, b, A, B, C } = p;
    const sq = `${pbr(a)}^{2}`;
    const answer = [String(k), signedFracTerm(A, br(a)), signedFracTerm(B, sq)];
    if (b !== null && C !== null) answer.push(signedFracTerm(C, br(b)));
    return {
      kind: 'tiles',
      prompt: [
        say(`Divide first, then split. Place the whole number, then the part over $${br(a)}$, the part over $${sq}$${b === null ? '' : `, then the part over $${br(b)}$`}.`),
        show(wholeFractionTex(p)),
      ],
      template: answer.map((_, i) => `{${i}}`).join(' '),
      bank: tileBank(answer, [String(-k), signedFracTerm(B, br(a)), signedFracTerm(A, sq), signedFracTerm(-A, br(a))]),
      answer,
    };
  },
  solution: wholeSolution,
};

interface WholeAsk extends Whole {
  ask: 'B' | 'C';
}

/** One numerator by cover-up on the original top, typed. */
const af11WholeValue: Generator<WholeAsk> = {
  id: 'af11-whole-value',
  sample: (rng, difficulty) => {
    const p = sampleWhole(rng, difficulty);
    return { ...p, ask: p.C === null ? 'B' : rng.pick<'B' | 'C'>(['B', 'C']) };
  },
  choices: (p) => {
    const top = wholeTop(p);
    if (p.ask === 'C' && p.C !== null && p.b !== null) {
      return intOptions(p.C, [-p.C, valueAt(top, -p.b), p.C + p.k, valueAt(top, p.b)]);
    }
    const rest = wholeRest(p);
    return intOptions(p.B, [-p.B, p.B + p.k, coef(rest, 0), valueAt(top, p.a)]);
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [show(wholeFractionTex(p)), say(`This is a whole number plus $${wholeLetters(p)}$. Find $${p.ask}$.`)],
    lead: `${p.ask} =`,
    keypad: [],
    answer: String(p.ask === 'C' && p.C !== null ? p.C : p.B),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => {
    const top = wholeTop(p);
    if (p.ask === 'C' && p.C !== null && p.b !== null) {
      const rest = (p.a - p.b) * (p.a - p.b);
      return [
        { text: `Cover-up works on the original top: at $x = ${-p.b}$ the whole number times the bottom is zero too.` },
        { text: `The top there is $${valueAt(top, -p.b)}$, and $${pbr(p.a)}^{2}$ there is $${rest}$, so $C = ${p.C}$.` },
        ...wholeSolution(p).slice(-1),
      ];
    }
    const other = p.b === null ? 1 : p.b - p.a;
    return [
      { text: `Cover-up works on the original top: at $x = ${-p.a}$ the whole number times the bottom is zero too.` },
      {
        text:
          p.b === null
            ? `Only $B$ is left there, so $B$ is the top at $x = ${-p.a}$: $B = ${p.B}$.`
            : `The top there is $${valueAt(top, -p.a)}$, and $${pbr(p.b)}$ there is $${other}$, so $B = ${p.B}$.`,
      },
      ...wholeSolution(p).slice(-1),
    ];
  },
};

/** The whole number, what is left of the x term (which is A) and of the number, then B. */
const af11WholeRestTree: Generator<Whole> = {
  id: 'af11-whole-rest-tree',
  sample: sampleWholeTwo,
  render: (p): Slide => {
    const { k, a, A, B } = p;
    const num = a * A + B;
    const answer = [k, A, num, B];
    const top = wholeTop(p);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Divide first, then split what is left as $${wholeLetters(p)}$. Top: the whole number. Below it: what is left of the $x$ term, which is $A$, and what is left of the number. Last: $B$, what is left at $x = ${-a}$.`,
        ),
      ],
      expression: wholeFractionTex(p),
      nodes: [
        { id: 'k', from: [] },
        { id: 'A', from: ['k'] },
        { id: 'num', from: ['k'] },
        { id: 'B', from: ['A', 'num'] },
      ],
      bank: numberBank(answer, [top[1], top[2], -B, num + a * A, -k]),
      answer: answer.map(String),
    };
  },
  solution: wholeSolution,
};

/* ================================================================
 * Lesson 5: choosing the form
 * ================================================================ */

type Kind = 'lin' | 'sq' | 'cube' | 'x' | 'x2' | 'x3' | 'quad';

const DEGREE: Record<Kind, number> = { lin: 1, sq: 2, cube: 3, x: 1, x2: 2, x3: 3, quad: 2 };

/** Bottoms of degree 3 at difficulty 1, and 4 or 5 at difficulty 2. */
const EASY: Kind[][] = [['sq', 'lin'], ['x2', 'lin'], ['lin', 'quad'], ['x', 'quad'], ['x', 'sq'], ['cube']];
const HARD: Kind[][] = [
  ['sq', 'quad'],
  ['x2', 'quad'],
  ['cube', 'lin'],
  ['x', 'lin', 'quad'],
  ['x3', 'lin'],
  ['x2', 'lin', 'lin'],
  ['sq', 'lin', 'quad'],
  ['x2', 'sq', 'lin'],
];

interface Choose {
  factors: Factor[];
  nums: Num[];
  /** For the numerator asked: which part. */
  ask: number;
}

/** A quadratic that will not split: x^2 + q, and at difficulty 2 a middle term too. */
function irreducible(rng: Rng, hard: boolean): Factor {
  if (!hard || rng.chance(0.3)) return { kind: 'quad', p: 0, q: rng.int(1, 9) };
  const p = nonZero(rng, 4);
  return { kind: 'quad', p, q: rng.int(Math.floor((p * p) / 4) + 1, Math.floor((p * p) / 4) + 6) };
}

function factorsFor(rng: Rng, kinds: Kind[], hard: boolean): Factor[] {
  const brackets = kinds.filter((k) => k === 'lin' || k === 'sq' || k === 'cube');
  const cs = distinct(rng, brackets.length, 4);
  const xs = kinds.filter((k) => k === 'x' || k === 'x2' || k === 'x3');
  const out: Factor[] = xs.map((k) => ({ kind: 'lin', c: 0, n: DEGREE[k] }));
  brackets.forEach((k, i) => out.push({ kind: 'lin', c: cs[i], n: DEGREE[k] }));
  if (kinds.includes('quad')) out.push(irreducible(rng, hard));
  return out;
}

function numsFor(rng: Rng, factors: Factor[]): Num[] {
  return partsOf(factors).map((part) => (factors[part.f].kind === 'quad' ? [nonZero(rng, 3), nonZero(rng, 4)] : nonZero(rng, 4)));
}

/** The parts cover-up reaches: the top power of each linear factor. */
function coverable(factors: Factor[]): number[] {
  return partsOf(factors)
    .map((part, i) => ({ part, i }))
    .filter(({ part }) => {
      const f = factors[part.f];
      return f.kind === 'lin' && part.j === f.n;
    })
    .map(({ i }) => i);
}

function sampleChoose(rng: Rng, difficulty: number, maxDegree = 5): Choose {
  const hard = difficulty > 1;
  const pool = (hard ? HARD : EASY).filter((kinds) => kinds.reduce((s, k) => s + DEGREE[k], 0) <= maxDegree);
  for (;;) {
    const factors = factorsFor(rng, rng.pick(pool), hard);
    const nums = numsFor(rng, factors);
    const top = topOf(factors, nums);
    if (top.length !== productPoly(factors).length - 1) continue;
    return { factors, nums, ask: rng.pick(coverable(factors)) };
  }
}

const degreeOf = (factors: Factor[]): number => productPoly(factors).length - 1;

/** The letters each part carries, one for a number and two for Ax + B. */
const unknownsOf = (factors: Factor[]): number =>
  partsOf(factors).reduce((s, part) => s + (factors[part.f].kind === 'quad' ? 2 : 1), 0);

/** Wrong forms: the quadratic with a number on top, a repeated factor missing a power, a bracket left out. */
function wrongForms(factors: Factor[]): string[] {
  const specs = (skip: (f: Factor, j: number) => boolean, quadConst = false) =>
    factors.flatMap((f) => {
      if (f.kind === 'quad') return [{ den: denTex(f, 1), quad: !quadConst }];
      return Array.from({ length: f.n }, (_, k) => k + 1)
        .filter((j) => !skip(f, j))
        .map((j) => ({ den: denTex(f, j) }));
    });
  const hasQuad = factors.some((f) => f.kind === 'quad');
  const repeated = factors.some((f) => f.kind === 'lin' && f.n > 1);
  const single = factors.findIndex((f) => f.kind === 'lin' && f.n === 1);
  const forms: string[] = [];
  if (hasQuad) forms.push(lettersOver(specs(() => false, true)));
  if (repeated) {
    forms.push(lettersOver(specs((f, j) => f.kind === 'lin' && j < f.n)));
    forms.push(lettersOver(specs((f, j) => f.kind === 'lin' && f.n > 1 && j === f.n)));
  }
  if (hasQuad && single >= 0) {
    // The Ax + B moved onto a single bracket, and the quadratic left with a number.
    forms.push(
      lettersOver(
        factors.flatMap((f, i) =>
          f.kind === 'quad' ? [{ den: denTex(f, 1) }] : Array.from({ length: f.n }, (_, k) => ({ den: denTex(f, k + 1), quad: i === single })),
        ),
      ),
    );
  }
  // A bracket left out altogether.
  factors.forEach((_, drop) => forms.push(lettersOver(specs(() => false).filter((spec) => !factorOwns(factors, drop, spec.den)))));
  if (repeated) forms.push(lettersOver(specs((f, j) => f.kind === 'lin' && f.n > 1 && j === 1)));
  return forms.filter((form) => form !== '');
}

/** Whether a part's bottom belongs to this factor. */
function factorOwns(factors: Factor[], i: number, den: string): boolean {
  const f = factors[i];
  if (f.kind === 'quad') return den === denTex(f, 1);
  return Array.from({ length: f.n }, (_, k) => denTex(f, k + 1)).includes(den);
}

/** Which form a bottom's split takes. Only the bottom is shown: the top plays no part in the choice. */
const af11ChooseForm: Generator<Choose> = {
  id: 'af11-choose-form',
  sample: (rng, difficulty) => sampleChoose(rng, difficulty),
  render: (p): Slide =>
    choiceSlide(
      [say('A proper fraction has this bottom. Which form does its split take?'), show(bottomTex(p.factors))],
      firstFour(lettersTex(p.factors), ...wrongForms(p.factors)),
    ),
  solution: (p) => chooseFormSolution(p.factors),
};

function chooseFormSolution(factors: Factor[]): SolutionStep[] {
  const steps: SolutionStep[] = factors.map((f) => {
    if (f.kind === 'quad') {
      const d = f.p * f.p - 4 * f.q;
      return { text: `$${polyTex([1, f.p, f.q])}$ has discriminant $${d}$, which is negative, so it stays whole and its part takes $Ax + B$ on top.` };
    }
    if (f.n === 1) return { text: `$${factorTex(f)}$ is a single bracket: one part, with a number on top.` };
    return { text: `$${factorTex(f)}$ is repeated: one part over each power, up to the ${f.n === 2 ? 'square' : 'cube'}.` };
  });
  steps.push(
    { tex: lettersTex(factors) },
    { text: `That is $${unknownsOf(factors)}$ unknowns, the same as the degree of the bottom.` },
  );
  return steps;
}

/** How many unknowns the split needs, typed. */
const af11ChooseCount: Generator<Choose> = {
  id: 'af11-choose-count',
  sample: (rng, difficulty) => sampleChoose(rng, difficulty),
  choices: (p) => {
    const n = unknownsOf(p.factors);
    return intOptions(n, [p.factors.length, n - p.factors.filter((f) => f.kind === 'quad').length, partsOf(p.factors).length, n + 1]);
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      say('A proper fraction has this bottom. How many unknown numbers does its split need? Count each letter, and two for a top $Ax + B$.'),
      show(bottomTex(p.factors)),
    ],
    lead: '\\text{unknowns} =',
    keypad: [],
    answer: String(unknownsOf(p.factors)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => chooseFormSolution(p.factors),
};

/** The form built from its parts, in the order the bottom lists its factors. */
const af11ChooseTiles: Generator<Choose> = {
  id: 'af11-choose-tiles',
  sample: (rng, difficulty) => sampleChoose(rng, difficulty),
  render: (p): Slide => {
    const { factors } = p;
    const tops = letterTops(factors);
    const parts = partsOf(factors);
    const answer = parts.map((part, i) => {
      const term = frac(tops[i], denTex(factors[part.f], part.j));
      return i === 0 ? term : `+ ${term}`;
    });
    const distractors: string[] = [];
    parts.forEach((part, i) => {
      const f = factors[part.f];
      const sign = i === 0 ? '' : '+ ';
      const letter = tops[i][0];
      if (f.kind === 'quad') distractors.push(`${sign}${frac(letter, denTex(f, 1))}`);
      else {
        distractors.push(`${sign}${frac(`${letter}x + ${LETTERS[LETTERS.indexOf(letter) + 1]}`, denTex(f, part.j))}`);
        distractors.push(`${sign}${frac(letter, denTex(f, part.j + 1))}`);
      }
    });
    return {
      kind: 'tiles',
      prompt: [
        say('A proper fraction has this bottom. Build its split: place the parts in the order the bottom lists its factors, lower powers first.'),
        show(bottomTex(factors)),
      ],
      template: answer.map((_, i) => `{${i}}`).join(' '),
      bank: tileBank(answer, distractors.slice(0, 5)),
      answer,
    };
  },
  solution: (p) => chooseFormSolution(p.factors),
};

interface ChooseFlow {
  /** The factors other than the quadratic. */
  others: Factor[];
  /** The quadratic x^2 + px + q, shown multiplied out. */
  p: number;
  q: number;
  /** Its roots when it splits, as (x - r)(x - s); null when it will not. */
  roots: [number, number] | null;
}

function chooseFlowFactors({ others, p, q }: ChooseFlow): Factor[] {
  return [...others, { kind: 'quad', p, q }];
}

/** Does the quadratic split? What top, or which brackets? Then how many unknowns. */
const af11ChooseFlow: Generator<ChooseFlow> = {
  id: 'af11-choose-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kinds = rng.pick<Kind[]>(hard ? [['sq', 'lin'], ['x2', 'lin'], ['cube'], ['x', 'sq']] : [['sq'], ['x2'], ['lin'], ['x']]);
    const others = factorsFor(rng, kinds, hard);
    const taken = others.map((f) => (f.kind === 'lin' ? -f.c : NaN));
    if (rng.chance(0.5)) {
      const [r, s] = distinct(rng, 2, 5, taken);
      return { others, p: -(r + s), q: r * s, roots: [Math.min(r, s), Math.max(r, s)] };
    }
    const quad = irreducible(rng, hard) as { kind: 'quad'; p: number; q: number };
    return { others, p: quad.p, q: quad.q, roots: null };
  },
  render: (params): Slide => {
    const { others, p, q, roots } = params;
    const quadTex = polyTex([1, p, q]);
    const degree = degreeOf(others) + 2;
    const counts = [...new Set([degree, degree - 1, others.length + 1, degree + 1])].map((n) => `$${n}$`);
    const bracketsTex = roots === null ? '' : `${pbr(-roots[0])}${pbr(-roots[1])}`;
    const brackets =
      roots === null
        ? []
        : [
            bracketsTex,
            ...[
              [roots[0], roots[1]],
              [-roots[0], roots[1]],
              [roots[0], -roots[1]],
            ]
              // A slip that multiplies out to the same quadratic would be a second right answer.
              .filter(([m, n]) => m !== roots[0] || n !== roots[1])
              .filter(([m, n]) => !(m + n === p && m * n === q))
              .map(([m, n]) => `${pbr(m)}${pbr(n)}`),
          ].map((t) => `$${t}$`);
    const tops = ['$Ax + B$', '$A$', '$Ax^{2} + Bx + C$'];
    return {
      kind: 'flow',
      prompt: [say('A proper fraction has this bottom. Decide what form its split takes. Each answer decides what is asked next.')],
      subject: bottomTex(chooseFlowFactors(params)),
      steps: [
        {
          id: 'split',
          ask: `Does $${quadTex}$ factorise?`,
          branches: [
            { label: 'Yes', to: 'brackets' },
            { label: 'No', to: 'top' },
          ],
        },
        {
          id: 'top',
          ask: 'So it stays whole. What top does its part take?',
          branches: turned(tops, quadTex).map((label) => ({ label, to: 'count' })),
        },
        {
          id: 'brackets',
          ask: 'Which brackets?',
          branches:
            brackets.length > 0
              ? turned(brackets, quadTex).map((label) => ({ label, to: 'count' }))
              : [
                  { label: '$(x - 1)(x + 1)$', outcome: 'Those multiply out to $x^{2} - 1$, a different quadratic.' },
                  { label: 'None with whole numbers', outcome: 'Then it does not factorise here: its discriminant is negative.' },
                ],
        },
        {
          id: 'count',
          ask: 'How many unknowns does the whole split need?',
          branches: turned(counts, quadTex).map((label) => ({ label, outcome: `So the split carries ${label.replace(/\$/g, '')} unknowns.` })),
        },
      ],
      answer: roots === null ? ['No', '$Ax + B$', `$${degree}$`] : ['Yes', `$${bracketsTex}$`, `$${degree}$`],
    };
  },
  solution: (params) => {
    const { others, p, q, roots } = params;
    const quadTex = polyTex([1, p, q]);
    const d = p * p - 4 * q;
    const degree = degreeOf(others) + 2;
    const first: SolutionStep =
      roots === null
        ? { text: `$${quadTex}$ has discriminant $${d}$, which is negative, so it stays whole and its part takes $Ax + B$.` }
        : { text: `$${quadTex}$ has discriminant $${d}$, a square, so it splits: $${quadTex} = ${pbr(-roots[0])}${pbr(-roots[1])}$.` };
    const factors: Factor[] =
      roots === null
        ? chooseFlowFactors(params)
        : [...others, { kind: 'lin', c: -roots[0], n: 1 }, { kind: 'lin', c: -roots[1], n: 1 }];
    return [first, { tex: lettersTex(factors) }, { text: `That is $${degree}$ unknowns, the degree of the bottom.` }];
  },
};

const chooseLetter = (p: Choose): string => letterTops(p.factors)[p.ask];

function chooseValueSolution(p: Choose): SolutionStep[] {
  const { factors, nums, ask } = p;
  const part = partsOf(factors)[ask];
  const f = factors[part.f] as { kind: 'lin'; c: number; n: number };
  const x = -f.c;
  const top = topOf(factors, nums);
  const rest = valueAt(cofactor(factors, part), x);
  const letter = chooseLetter(p);
  return [
    { text: `Multiply both sides by the bottom and put $x = ${x}$. Every part but the one over $${denTex(f, f.n)}$ still has $${factorTex({ ...f, n: 1 })}$ in it, so it vanishes.` },
    { text: `The top there is $${valueAt(top, x)}$, and the rest of the bottom there is $${rest}$:` },
    { tex: chain(`${letter} &= ${valueAt(top, x)} \\div ${paren(rest)}`, `&= ${nums[ask] as number}`) },
  ];
}

/** One numerator the chosen form makes reachable by cover-up, typed. */
const af11ChooseValue: Generator<Choose> = {
  id: 'af11-choose-value',
  sample: (rng, difficulty) => sampleChoose(rng, difficulty, 4),
  choices: (p) => {
    const part = partsOf(p.factors)[p.ask];
    const f = p.factors[part.f] as { kind: 'lin'; c: number; n: number };
    const v = p.nums[p.ask] as number;
    const top = topOf(p.factors, p.nums);
    return intOptions(v, [-v, valueAt(top, -f.c), valueAt(top, f.c), v + 1]);
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [show(fractionTex(p.factors, p.nums)), say(`This splits as $${lettersTex(p.factors)}$. Find $${chooseLetter(p)}$.`)],
    lead: `${chooseLetter(p)} =`,
    keypad: [],
    answer: String(p.nums[p.ask]),
    domain: 'real',
    mode: 'exact',
  }),
  solution: chooseValueSolution,
};

export const fractionsLevel11Generators = [
  af11CubedForm,
  af11CubedTree,
  af11CubedValue,
  af11CubedTiles,
  af11CubedShiftSteps,
  af11FourForm,
  af11FourCoverTree,
  af11FourValue,
  af11FourSquareSteps,
  af11FourTiles,
  af11XpowForm,
  af11XpowTree,
  af11XpowValue,
  af11XpowTiles,
  af11XpowFlow,
  af11WholeFlow,
  af11WholeSteps,
  af11WholeTiles,
  af11WholeValue,
  af11WholeRestTree,
  af11ChooseForm,
  af11ChooseCount,
  af11ChooseTiles,
  af11ChooseFlow,
  af11ChooseValue,
];
