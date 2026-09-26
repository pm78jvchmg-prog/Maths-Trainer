/**
 * Algebraic Fractions, level 10: fractions within fractions.
 *
 * Lesson 1 works with numbers only: a top and a bottom that each hold a small
 * fraction, tidied into single fractions and divided, or cleared at a stroke
 * by multiplying the top and the bottom by the number every small bottom
 * divides into. Lesson 2 does the same with x in the small bottoms, lesson 3
 * divides one algebraic fraction by another, lesson 4 simplifies a fraction
 * stacked inside a fraction from the inside out, and lesson 5 solves
 * equations with one, rejecting any solution that makes a bottom zero.
 *
 * Every question is built outward from its answer, so every value is whole or
 * a fraction of whole numbers by construction. As in the rest of the course
 * the learner never types a fraction or a polynomial (PITFALLS 3.4): forms go
 * through tiles, tree, steps, choice and flow, and only whole numbers are
 * typed.
 */
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { termTex } from './calculus';
import { fracTex, gcd, say } from './format';
import { type Poly, polyTex } from './polynomials';
import {
  br,
  chain,
  choiceSlide,
  distinct,
  frac,
  fracTerm,
  intOptions,
  nonZero,
  numberBank,
  pbr,
  quad,
  show,
  signed,
  signedFracTerm,
  signedTerm,
  stepBank,
  termTiles,
  tileBank,
  timesTex,
  turned,
} from './algebraicFractions';

/* ---------- fractions of whole numbers ---------- */

/** A fraction of whole numbers in lowest terms, its sign on the top. */
type Rat = [number, number];

function rat(n: number, d = 1): Rat {
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return [(sign * n) / g, (sign * d) / g];
}

const plus = (a: Rat, b: Rat): Rat => rat(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const times = (a: Rat, b: Rat): Rat => rat(a[0] * b[0], a[1] * b[1]);
const over = (a: Rat, b: Rat): Rat => rat(a[0] * b[1], a[1] * b[0]);
const upsideDown = ([n, d]: Rat): Rat => rat(d, n);
const ratTex = ([n, d]: Rat): string => fracTex(n, d);
const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;
const sumOf = (side: Rat[]): Rat => side.reduce(plus, rat(0));

/** "$2$", "$2$ and $3$", "$2$, $3$ and $4$". */
function listOf(values: number[]): string {
  const shown = values.map((v) => `$${v}$`);
  return shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

/** Distinct strings, first come first kept. */
const uniq = (items: string[]): string[] => [...new Set(items)];

/* ================================================================
 * Lesson 1: numbers first
 * ================================================================ */

interface NumParams {
  /** The terms of the top and of the bottom: whole numbers and proper fractions. */
  top: Rat[];
  bottom: Rat[];
}

function termAt(t: Rat, first: boolean): string {
  if (t[1] === 1) return first ? String(t[0]) : signed(t[0]);
  return first ? fracTerm(t[0], String(t[1])) : signedFracTerm(t[0], String(t[1]));
}

const sideTex = (side: Rat[]): string => side.map((t, i) => termAt(t, i === 0)).join(' ');
const compoundTex = ({ top, bottom }: NumParams): string => `\\dfrac{${sideTex(top)}}{${sideTex(bottom)}}`;

/** The small bottoms, each once, smallest first. */
const densOf = ({ top, bottom }: NumParams): number[] =>
  [...new Set([...top, ...bottom].map((t) => t[1]).filter((d) => d > 1))].sort((x, y) => x - y);

/** The smallest number every small bottom divides into. */
const clearBy = (params: NumParams): number => densOf(params).reduce(lcm, 1);

/** Each term of a side times L: whole by the choice of L. */
const scaled = (side: Rat[], L: number): number[] => side.map(([n, d]) => (n * L) / d);
const total = (values: number[]): number => values.reduce((s, v) => s + v, 0);
const scaledTex = (values: number[]): string => values.map((v, i) => (i === 0 ? String(v) : signed(v))).join(' ');

/** The slip of multiplying only the fractions by L and leaving a whole number as it was. */
const forgetWhole = (side: Rat[], L: number): number => total(side.map(([n, d]) => (d === 1 ? n : (n * L) / d)));

/** The slip of adding the tops and adding the bottoms. */
const naive = (side: Rat[]): Rat => rat(total(side.map((t) => t[0])), total(side.map((t) => t[1])));

/** The side with its second term's sign turned. */
const flipSecond = (side: Rat[]): Rat[] => [side[0], ...side.slice(1).map(([n, d]): Rat => [-n, d])];

function properFrac(rng: Rng, dens: number[]): Rat {
  const d = rng.pick(dens);
  for (;;) {
    const n = rng.int(1, d - 1);
    if (gcd(n, d) === 1) return [n, d];
  }
}

/**
 * Difficulty 1: a whole number and a fraction on the top and on the bottom.
 * Difficulty 2: two fractions on the top, and on the bottom either a whole
 * number and a fraction or two fractions. Every small bottom divides 12 or
 * 10, so clearing never needs a number past 12.
 */
function sampleNum(rng: Rng, difficulty: number): NumParams {
  for (;;) {
    const hard = difficulty > 1;
    const dens = hard ? [2, 3, 4, 6] : [2, 3, 4, 5, 6];
    const either = (f: Rat): Rat => (rng.chance(0.5) ? f : [-f[0], f[1]]);
    const top: Rat[] = hard
      ? [properFrac(rng, dens), either(properFrac(rng, dens))]
      : [rat(rng.int(1, 3)), either(properFrac(rng, dens))];
    const bottom: Rat[] =
      hard && rng.chance(0.5)
        ? [properFrac(rng, dens), either(properFrac(rng, dens))]
        : [rat(rng.int(1, 3)), either(properFrac(rng, dens))];
    const params = { top, bottom };
    if ([top, bottom].some((side) => side[0][1] === side[1][1])) continue;
    const T = sumOf(top);
    const B = sumOf(bottom);
    if (T[0] <= 0 || B[0] <= 0 || (B[0] === 1 && B[1] === 1)) continue;
    if (clearBy(params) > 12) continue;
    const answer = [ratTex(T), ratTex(B), ratTex(over(T, B))];
    if (new Set(answer).size < 3) continue;
    return params;
  }
}

/** The side over its own common bottom, before the tops are added. */
function commonTex(side: Rat[]): string {
  const D = side.map((t) => t[1]).reduce(lcm, 1);
  return side
    .map(([n, d], i) => (i === 0 ? fracTerm((n * D) / d, String(D)) : signedFracTerm((n * D) / d, String(D))))
    .join(' ');
}

function tidySolution({ top, bottom }: NumParams): SolutionStep[] {
  const T = sumOf(top);
  const B = sumOf(bottom);
  return [
    { text: 'Write the top as one fraction, over the bottom its small fractions share:' },
    { tex: chain(`&${sideTex(top)}`, `=\\;&${commonTex(top)}`, `=\\;&${ratTex(T)}`) },
    { text: 'Do the same with the bottom:' },
    { tex: chain(`&${sideTex(bottom)}`, `=\\;&${commonTex(bottom)}`, `=\\;&${ratTex(B)}`) },
    { text: 'Dividing by a fraction is multiplying by it upside down:' },
    { tex: chain(`&${ratTex(T)} \\div ${ratTex(B)}`, `=\\;&${ratTex(T)} \\times ${ratTex(upsideDown(B))}`, `=\\;&${ratTex(over(T, B))}`) },
  ];
}

/** The top, the bottom, and their quotient, each in lowest terms. */
const numTidyTree: Generator<NumParams> = {
  id: 'af10-num-tidy-tree',
  sample: sampleNum,
  render: (params): Slide => {
    const { top, bottom } = params;
    const T = sumOf(top);
    const B = sumOf(bottom);
    const answer = [ratTex(T), ratTex(B), ratTex(over(T, B))];
    const slips = [naive(top), naive(bottom), times(T, B), over(B, T), sumOf(flipSecond(top)), sumOf(flipSecond(bottom))];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Top row: the top as one fraction, then the bottom as one fraction. Below: the top divided by the bottom. Give each in its lowest terms.',
        ),
      ],
      expression: compoundTex(params),
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'value', from: ['top', 'bottom'] },
      ],
      bank: tileBank(answer, slips.filter((s) => s[1] !== 0).map(ratTex)),
      answer,
    };
  },
  solution: tidySolution,
};

/** Multiply the top and the bottom by the number that clears every small fraction. */
const numClearTiles: Generator<NumParams> = {
  id: 'af10-num-clear-tiles',
  sample: sampleNum,
  render: (params): Slide => {
    const { top, bottom } = params;
    const L = clearBy(params);
    const answer = [total(scaled(top, L)), total(scaled(bottom, L))];
    return {
      kind: 'tiles',
      prompt: [
        say(`Multiply the top and the bottom by $${L}$, which every small bottom divides into. Place the new top and the new bottom.`),
        show(compoundTex(params)),
      ],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: numberBank(answer, [
        forgetWhole(top, L),
        forgetWhole(bottom, L),
        total(scaled(flipSecond(top), L)),
        total(scaled(flipSecond(bottom), L)),
      ]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { top, bottom } = params;
    const L = clearBy(params);
    const newTop = total(scaled(top, L));
    const newBottom = total(scaled(bottom, L));
    const value = ratTex(rat(newTop, newBottom));
    const written = frac(String(newTop), String(newBottom));
    return [
      { text: `Every small bottom divides into $${L}$, so multiply every term on the top and on the bottom by $${L}$, whole numbers included:` },
      { tex: chain(`\\text{top: }&${scaledTex(scaled(top, L))} = ${newTop}`, `\\text{bottom: }&${scaledTex(scaled(bottom, L))} = ${newBottom}`) },
      { text: value === written ? `So the fraction is $${written}$.` : `So the fraction is $${written}$, which is $${value}$.` },
    ];
  },
};

/** The number that clears every small fraction, typed. */
const numLcd: Generator<NumParams> = {
  id: 'af10-num-lcd',
  sample: sampleNum,
  choices: (params) => {
    const dens = densOf(params);
    const L = clearBy(params);
    return intOptions(L, [dens.reduce((p, d) => p * d, 1), total(dens), Math.max(...dens), 2 * L]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say('Multiplying the top and the bottom by one whole number clears every small fraction here. What is the smallest such number, $k$?'),
      show(compoundTex(params)),
    ],
    lead: 'k =',
    keypad: [],
    answer: String(clearBy(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const dens = densOf(params);
    const L = clearBy(params);
    const { top, bottom } = params;
    return [
      { text: dens.length === 1 ? `The only small bottom is $${dens[0]}$.` : `The small bottoms are ${listOf(dens)}.` },
      { text: `The smallest number ${dens.length === 1 ? 'it divides' : 'they all divide'} into is $${L}$, so $k = ${L}$.` },
      { tex: chain(`\\text{top: }&${scaledTex(scaled(top, L))}`, `\\text{bottom: }&${scaledTex(scaled(bottom, L))}`) },
      { text: 'Every term is now whole, so the small fractions have gone.' },
    ];
  },
};

/** Four fraction options: the answer and the first three slips worth something else. */
function ratOptions(correct: Rat, slips: Rat[]): ChoiceOption[] {
  const fallbacks = [plus(correct, rat(1)), plus(correct, rat(1, 2)), times(correct, rat(2)), plus(correct, rat(-1, 2))];
  const usable = [...slips, ...fallbacks].filter((s) => s[1] !== 0 && s[0] !== 0);
  return options({ tex: ratTex(correct) }, ...usable.map((s) => ({ tex: ratTex(s) }))).slice(0, 4);
}

/** The value, picked from four. */
const numValue: Generator<NumParams> = {
  id: 'af10-num-value',
  sample: sampleNum,
  render: (params): Slide => {
    const { top, bottom } = params;
    const T = sumOf(top);
    const B = sumOf(bottom);
    const L = clearBy(params);
    const slips = [over(B, T), times(T, B), rat(forgetWhole(top, L), forgetWhole(bottom, L)), over(naive(top), naive(bottom))];
    return choiceSlide([say('What is its value, in lowest terms?'), show(compoundTex(params))], ratOptions(over(T, B), slips));
  },
  solution: tidySolution,
};

/* ================================================================
 * Lesson 2: clearing with the common bottom
 * ================================================================ */

interface CommonParams {
  /** The top is a + b/(x + k) and the bottom c + d/(x + k); k is 0 at difficulty 1. */
  a: number;
  b: number;
  c: number;
  d: number;
  k: number;
}

const commonTop = ({ a, b, k }: CommonParams): Poly => [a, a * k + b];
const commonBottom = ({ c, d, k }: CommonParams): Poly => [c, c * k + d];
const partTex = (whole: number, top: number, k: number): string => `${whole} ${signedFracTerm(top, br(k))}`;
const commonTexOf = (p: CommonParams): string => `\\dfrac{${partTex(p.a, p.b, p.k)}}{${partTex(p.c, p.d, p.k)}}`;
const commonResult = (p: CommonParams): string => frac(polyTex(commonTop(p)), polyTex(commonBottom(p)));

function sampleCommon(rng: Rng, difficulty: number): CommonParams {
  for (;;) {
    const hard = difficulty > 1;
    const params = {
      a: rng.int(1, hard ? 4 : 3),
      b: hard ? nonZero(rng, 6) : rng.int(1, 5),
      c: rng.int(1, hard ? 4 : 3),
      d: nonZero(rng, hard ? 6 : 5),
      k: hard ? nonZero(rng, 3) : 0,
    };
    const { a, b, c, d } = params;
    const [, t] = commonTop(params);
    const [, u] = commonBottom(params);
    if (t === 0 || u === 0 || a * d === b * c) continue;
    // Nothing left to cancel, and no top that is the bottom read backwards.
    if (gcd(gcd(a, t), gcd(c, u)) > 1) continue;
    if (Math.abs(a) === Math.abs(u) && Math.abs(t) === Math.abs(c)) continue;
    return params;
  }
}

/** Multiplying through by the small bottom, one line per side. */
function commonSolution(params: CommonParams): SolutionStep[] {
  const { a, b, c, d, k } = params;
  // Each side's expansion and its result on lines of their own: on one line,
  // beside the "bottom:" label, 3(x - 3) - 4 = 3x - 13 ran to the edge of a
  // 393 px screen.
  const lines = (label: string, whole: number, small: number, poly: Poly): string[] =>
    k === 0
      ? [`\\text{${label}: }&${polyTex(poly)}`]
      : [`\\text{${label}: }&${timesTex(whole, br(k))} ${signed(small)}`, `&= ${polyTex(poly)}`];
  return [
    {
      text: `The only small bottom is $${br(k)}$, so multiply every term on the top and on the bottom by ${k === 0 ? '$x$' : `$${pbr(k)}$`}, whole numbers included:`,
    },
    { tex: chain(...lines('top', a, b, commonTop(params)), ...lines('bottom', c, d, commonBottom(params))) },
    { tex: commonResult(params) },
  ];
}

function byWhat(k: number): string {
  return k === 0 ? 'Multiply the top and the bottom by $x$.' : `Multiply the top and the bottom by $${pbr(k)}$, then expand and collect.`;
}

/** The new top and bottom as tiles. */
const commonTiles: Generator<CommonParams> = {
  id: 'af10-common-tiles',
  sample: sampleCommon,
  render: (params): Slide => {
    const { a, b, d, k } = params;
    const top = commonTop(params);
    const bottom = commonBottom(params);
    const answer = [...termTiles(top), ...termTiles(bottom)];
    return {
      kind: 'tiles',
      prompt: [say(`${byWhat(k)} Place what the top and the bottom become.`), show(commonTexOf(params))],
      template: '\\text{top: } {0} {1} \\quad \\text{bottom: } {2} {3}',
      bank: tileBank(answer, [
        termTex(b, 1),
        signed(a),
        signed(-top[1]),
        signed(-bottom[1]),
        k !== 0 ? signed(b) : signed(a + b),
        k !== 0 ? signed(d) : termTex(d, 1),
      ]),
      answer,
    };
  },
  solution: commonSolution,
};

/** The simplified form, picked from four. */
const commonWhich: Generator<CommonParams> = {
  id: 'af10-common-which',
  sample: sampleCommon,
  render: (params): Slide => {
    const { a, b, c, d, k } = params;
    const top = commonTop(params);
    const bottom = commonBottom(params);
    const swapped = frac(polyTex([top[1], a]), polyTex([bottom[1], c]));
    const flipped = frac(polyTex(bottom), polyTex(top));
    const third = k !== 0 ? frac(polyTex([a, b]), polyTex([c, d])) : frac(polyTex(top), polyTex([c, -bottom[1]]));
    return choiceSlide(
      [say('Which is this, written as one fraction?'), show(commonTexOf(params))],
      options({ tex: commonResult(params) }, { tex: swapped }, { tex: flipped }, { tex: third }),
    );
  },
  solution: commonSolution,
};

/** The method as a walk: what to multiply by, then what the top and the bottom become. */
const commonFlow: Generator<CommonParams> = {
  id: 'af10-common-flow',
  sample: sampleCommon,
  render: (params): Slide => {
    const { a, c, k } = params;
    const top = commonTop(params);
    const bottom = commonBottom(params);
    const B = br(k);
    const by = [`Top and bottom by $${B}$`, `The top only, by $${B}$`, `Top and bottom by $${k === 0 ? 'x^{2}' : 'x'}$`];
    const tops = uniq([polyTex(top), polyTex([top[1], a]), polyTex([a, -top[1]])]);
    const bottoms = uniq([polyTex(bottom), polyTex([bottom[1], c]), polyTex([c, -bottom[1]])]);
    const key = commonTexOf(params);
    return {
      kind: 'flow',
      prompt: [say('Write this as one fraction. Each answer decides what is asked next.')],
      subject: key,
      steps: [
        {
          id: 'by',
          ask: 'How do you clear the small fractions?',
          branches: turned(by, key).map((label) => ({ label, to: 'top' })),
        },
        {
          id: 'top',
          ask: 'What does the top become?',
          branches: turned(tops, key).map((tex) => ({ label: `$${tex}$`, to: 'bottom' })),
        },
        {
          id: 'bottom',
          ask: 'And the bottom?',
          branches: turned(bottoms, key).map((tex) => ({ label: `$${tex}$`, outcome: `So it is $${frac(polyTex(top), tex)}$.` })),
        },
      ],
      answer: [by[0], `$${polyTex(top)}$`, `$${polyTex(bottom)}$`],
    };
  },
  solution: commonSolution,
};

interface CommonValueParams extends CommonParams {
  v: number;
}

const valueAtV = (poly: Poly, v: number): number => poly[0] * v + poly[1];

/** Simplify, then find the value at a given x: whole by the choice of x. */
const commonValue: Generator<CommonValueParams> = {
  id: 'af10-common-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleCommon(rng, difficulty);
      const good: number[] = [];
      for (let v = -6; v <= 6; v += 1) {
        if (v === 0 || v + params.k === 0) continue;
        const top = valueAtV(commonTop(params), v);
        const bottom = valueAtV(commonBottom(params), v);
        if (top === 0 || bottom === 0 || top % bottom !== 0) continue;
        good.push(v);
      }
      if (good.length === 0) continue;
      return { ...params, v: rng.pick(good) };
    }
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`Write it as one fraction, then find its value when $x = ${params.v}$.`), show(commonTexOf(params))],
    lead: '\\text{value} =',
    keypad: [],
    answer: String(valueAtV(commonTop(params), params.v) / valueAtV(commonBottom(params), params.v)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { v } = params;
    const top = valueAtV(commonTop(params), v);
    const bottom = valueAtV(commonBottom(params), v);
    return [
      ...commonSolution(params),
      { text: `At $x = ${v}$ the top is $${top}$ and the bottom is $${bottom}$:` },
      { tex: `${frac(String(top), String(bottom))} = ${top / bottom}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: a fraction over a fraction
 * ================================================================ */

/**
 * `linear`: m/(x + p) over n/(x + q). `below`: m/((x + p)(x + q)) over
 * n/(x + p). `above`: m/(x + p) over n/((x + p)(x + q)). The quadratic is
 * shown multiplied out, so it has to be factorised before (x + p) cancels.
 */
type OverKind = 'linear' | 'below' | 'above';

interface OverParams {
  kind: OverKind;
  m: number;
  n: number;
  p: number;
  q: number;
}

function sampleOver(rng: Rng, difficulty: number, quadOnly: boolean): OverParams {
  for (;;) {
    const hard = difficulty > 1;
    const kind: OverKind = quadOnly || hard ? rng.pick<OverKind>(['below', 'above']) : 'linear';
    const [p, q] = distinct(rng, 2, hard ? 7 : 5);
    if (kind !== 'linear' && p + q === 0) continue;
    const [m, n] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
    if (gcd(m, n) !== 1 || (kind === 'above' && n === 1)) continue;
    return { kind, m, n, p, q };
  }
}

const quadTex = (p: number, q: number): string => polyTex(quad(p, q));

/** The small fraction on top and the one below, as [top, bottom] each. */
function overParts({ kind, m, n, p, q }: OverParams): { A: string; B: string; C: string; D: string } {
  return {
    A: String(m),
    B: kind === 'below' ? quadTex(p, q) : br(p),
    C: String(n),
    D: kind === 'linear' ? br(q) : kind === 'below' ? br(p) : quadTex(p, q),
  };
}

const overTex = (params: OverParams): string => {
  const { A, B, C, D } = overParts(params);
  return `\\dfrac{${frac(A, B)}}{${frac(C, D)}}`;
};

/** The simplified top and bottom. */
function overResult({ kind, m, n, p, q }: OverParams): [string, string] {
  if (kind === 'linear') return [timesTex(m, br(q)), timesTex(n, br(p))];
  if (kind === 'below') return [String(m), timesTex(n, br(q))];
  return [timesTex(m, br(q)), String(n)];
}

const overAnswer = (params: OverParams): string => frac(...overResult(params));

/** Straight across without turning over, the answer upside down, and the wrong fraction turned. */
function overSlips(params: OverParams): string[] {
  const { kind, m, n, p, q } = params;
  const [top, bottom] = overResult(params);
  const straight = kind === 'linear' ? frac(String(m * n), `${pbr(p)}${pbr(q)}`) : frac(String(m * n), `${pbr(p)}^{2}${pbr(q)}`);
  const wrong =
    kind === 'linear'
      ? frac(timesTex(m, br(p)), timesTex(n, br(q)))
      : kind === 'below'
        ? frac(String(m), timesTex(n, br(p)))
        : frac(timesTex(m, br(p)), String(n));
  return [straight, frac(bottom, top), wrong];
}

function overSolution(params: OverParams): SolutionStep[] {
  const { kind, p, q } = params;
  const { A, B, C, D } = overParts(params);
  const steps: SolutionStep[] = [
    { text: 'A fraction over a fraction is the top one divided by the bottom one. Turn the bottom fraction over and multiply:' },
    { tex: chain(`&${frac(A, B)} \\div ${frac(C, D)}`, `=\\;&${frac(A, B)} \\times ${frac(D, C)}`) },
  ];
  if (kind !== 'linear') {
    steps.push({ text: `Factorise: $${quadTex(p, q)} = ${pbr(p)}${pbr(q)}$. Then $${pbr(p)}$ is on the top and on the bottom, so it cancels:` });
  } else {
    steps.push({ text: 'Multiply the tops and the bottoms. Nothing cancels, so leave the brackets as they are:' });
  }
  steps.push({ tex: overAnswer(params) });
  return steps;
}

/** Stacked, to a product, to the answer. */
const overSteps: Generator<OverParams> = {
  id: 'af10-over-steps',
  sample: (rng, difficulty) => sampleOver(rng, difficulty, false),
  render: (params): Slide => {
    const { A, B, C, D } = overParts(params);
    const product = `${frac(A, B)} \\times ${frac(D, C)}`;
    const value = overAnswer(params);
    return {
      kind: 'steps',
      prompt: [say('Simplify fully, leaving brackets unexpanded. Tap the part you would do **next**, then choose what it becomes.')],
      start: [overTex(params)],
      reductions: [
        {
          span: [0, 1],
          value: product,
          bank: stepBank(product, `${frac(A, B)} \\times ${frac(C, D)}`, `${frac(B, A)} \\times ${frac(C, D)}`),
        },
        { span: [0, 1], value, bank: stepBank(value, ...overSlips(params)) },
      ],
    };
  },
  solution: overSolution,
};

/** The simplified top and bottom as tiles. */
const overTiles: Generator<OverParams> = {
  id: 'af10-over-tiles',
  sample: (rng, difficulty) => sampleOver(rng, difficulty, false),
  render: (params): Slide => {
    const { kind, m, n, p, q } = params;
    const answer = overResult(params);
    const distractors =
      kind === 'linear'
        ? [timesTex(m, br(p)), timesTex(n, br(q)), String(m * n), `${pbr(p)}${pbr(q)}`]
        : kind === 'below'
          ? [String(n), timesTex(n, br(p)), timesTex(m, br(q)), String(m * n)]
          : [String(m), timesTex(m, br(p)), timesTex(n, br(q)), String(m * n)];
    return {
      kind: 'tiles',
      prompt: [say('Simplify fully, leaving brackets unexpanded. Place the top and the bottom.'), show(overTex(params))],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: tileBank(answer, distractors),
      answer,
    };
  },
  solution: overSolution,
};

/** The simplified form, picked from four. */
const overWhich: Generator<OverParams> = {
  id: 'af10-over-which',
  sample: (rng, difficulty) => sampleOver(rng, difficulty, false),
  render: (params): Slide =>
    choiceSlide(
      [say('Which is this, simplified?'), show(overTex(params))],
      options({ tex: overAnswer(params) }, ...overSlips(params).map((tex) => ({ tex }))),
    ),
  solution: overSolution,
};

/** Factorise the quadratic, find the bracket that cancels, and say what is left. */
const overCancelFlow: Generator<OverParams> = {
  id: 'af10-over-cancel-flow',
  sample: (rng, difficulty) => sampleOver(rng, difficulty, true),
  render: (params): Slide => {
    const { p, q } = params;
    const key = overTex(params);
    const right = `${pbr(p)}${pbr(q)}`;
    const factorings = [right, `${pbr(-p)}${pbr(-q)}`, `${pbr(p)}${pbr(-q)}`, `${pbr(-p)}${pbr(q)}`];
    const answer = overAnswer(params);
    const [straight, inverted, wrong] = overSlips(params);
    return {
      kind: 'flow',
      prompt: [say('Simplify this fully. Each answer decides what is asked next.')],
      subject: key,
      steps: [
        {
          id: 'factorise',
          ask: `Factorise $${quadTex(p, q)}$. Which is it?`,
          branches: turned(factorings, key).map((tex) => ({ label: `$${tex}$`, to: 'cancel' })),
        },
        {
          id: 'cancel',
          ask: 'Turn the bottom fraction over and multiply. Which bracket is then on the top and on the bottom?',
          branches: turned(
            [
              { label: `$${pbr(p)}$`, to: 'left' },
              { label: `$${pbr(q)}$`, to: 'left' },
              { label: 'Neither', outcome: 'Then nothing cancels, and the product is as simple as it gets.' },
            ],
            key,
          ),
        },
        {
          id: 'left',
          ask: 'Cancel it. What is left?',
          branches: turned([answer, inverted, wrong, straight], key).map((tex) => ({ label: `$${tex}$`, outcome: `So it simplifies to $${tex}$.` })),
        },
      ],
      answer: [`$${right}$`, `$${pbr(p)}$`, `$${answer}$`],
    };
  },
  solution: overSolution,
};

/* ================================================================
 * Lesson 4: stacked fractions
 * ================================================================ */

/** a ± |b| / (c + d/x), the sign of b in front of the stacked fraction. */
interface StackParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

const innerTex = ({ c, d }: StackParams): string => `${c} ${signedFracTerm(d, 'x')}`;
const stackTex = (p: StackParams): string => `${p.a} ${p.b < 0 ? '-' : '+'} \\dfrac{${Math.abs(p.b)}}{${innerTex(p)}}`;
const innerBottom = ({ c, d }: StackParams): Poly => [c, d];
const innerFrac = (p: StackParams): string => frac(polyTex(innerBottom(p)), 'x');
/** |b| divided by the inner fraction: |b|x over cx + d. */
const divided = (p: StackParams): string => frac(termTex(Math.abs(p.b), 1), polyTex(innerBottom(p)));
const stackTop = ({ a, b, c, d }: StackParams): Poly => [a * c + b, a * d];
const stackResult = (p: StackParams): string => frac(polyTex(stackTop(p)), polyTex(innerBottom(p)));

/** Difficulty 1 is all plus signs; difficulty 2 takes the stacked part away or has a minus inside. */
function sampleStack(rng: Rng, difficulty: number): StackParams {
  for (;;) {
    const hard = difficulty > 1;
    const params = {
      a: rng.int(1, hard ? 4 : 3),
      b: hard ? nonZero(rng, 5) : rng.int(1, 4),
      c: rng.int(1, hard ? 4 : 3),
      d: hard ? nonZero(rng, 5) : rng.int(1, 4),
    };
    if (hard && params.b > 0 && params.d > 0) continue;
    if (gcd(params.c, params.d) !== 1 || stackTop(params)[0] === 0) continue;
    return params;
  }
}

function stackSolution(params: StackParams): SolutionStep[] {
  const { a, b } = params;
  const bottom = polyTex(innerBottom(params));
  return [
    { text: 'Start with the innermost part and write it as one fraction:' },
    { tex: `${innerTex(params)} = ${innerFrac(params)}` },
    { text: `Dividing $${Math.abs(b)}$ by a fraction multiplies it by that fraction upside down:` },
    { tex: `\\dfrac{${Math.abs(b)}}{${innerFrac(params)}} = ${divided(params)}` },
    { text: `Write $${a}$ over $${bottom}$ and ${b < 0 ? 'subtract' : 'add'} the tops:` },
    {
      tex: chain(
        `&${a} ${b < 0 ? '-' : '+'} ${divided(params)}`,
        `=\\;&${frac(`${timesTex(a, bottom)} ${signedTerm(b, 1)}`, bottom)}`,
        `=\\;&${stackResult(params)}`,
      ),
    },
  ];
}

/** Inside out as a tree: the inner fraction, the division, the whole. */
const stackTree: Generator<StackParams> = {
  id: 'af10-stack-tree',
  sample: sampleStack,
  render: (params): Slide => {
    const { a, b, c, d } = params;
    const bottom = polyTex(innerBottom(params));
    const B = Math.abs(b);
    const answer = [innerFrac(params), divided(params), stackResult(params)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Work from the inside out. Top: $${innerTex(params)}$ as one fraction. Next: $${B}$ divided by it. Last: the whole expression as one fraction.`,
        ),
      ],
      expression: stackTex(params),
      nodes: [
        { id: 'inner', from: [] },
        { id: 'divide', from: ['inner'] },
        { id: 'whole', from: ['divide'] },
      ],
      bank: tileBank(answer, [
        c + d !== 0 ? frac(String(c + d), 'x') : frac(polyTex([d, c]), 'x'),
        frac('x', bottom),
        frac(polyTex([B * c, B * d]), 'x'),
        frac(String(B), bottom),
        frac(polyTex([b, a]), bottom),
        ...(a * c - b !== 0 ? [frac(polyTex([a * c - b, a * d]), bottom)] : []),
      ]),
      answer,
    };
  },
  solution: stackSolution,
};

/** The single fraction's top and bottom as tiles. */
const stackTiles: Generator<StackParams> = {
  id: 'af10-stack-tiles',
  sample: sampleStack,
  render: (params): Slide => {
    const { a, b, c, d } = params;
    const answer = [...termTiles(stackTop(params)), ...termTiles(innerBottom(params))];
    return {
      kind: 'tiles',
      prompt: [say('Simplify from the inside out. Place the top and the bottom of the single fraction.'), show(stackTex(params))],
      template: '\\text{top: } {0} {1} \\quad \\text{bottom: } {2} {3}',
      bank: tileBank(answer, [
        termTex(b, 1),
        signed(a),
        termTex(a * c, 1),
        signed(-a * d),
        ...(a * c - b !== 0 ? [termTex(a * c - b, 1)] : []),
        signed(d * b),
      ]),
      answer,
    };
  },
  solution: stackSolution,
};

/** The route: where to start, the inner fraction, then the division. */
const stackFlow: Generator<StackParams> = {
  id: 'af10-stack-flow',
  sample: sampleStack,
  render: (params): Slide => {
    const { a, b, c, d } = params;
    const B = Math.abs(b);
    const bottom = polyTex(innerBottom(params));
    const key = stackTex(params);
    const start = [`The innermost part, $${innerTex(params)}$`, `The number in front, $${a}$`, `The top of the stacked fraction, $${B}$`];
    const inners = uniq([innerFrac(params), c + d !== 0 ? frac(String(c + d), 'x') : frac(polyTex([d, c]), 'x'), frac('x', bottom)]);
    const divisions = uniq([divided(params), frac(polyTex([B * c, B * d]), 'x'), frac(String(B), bottom)]);
    return {
      kind: 'flow',
      prompt: [say('Simplify this from the inside out. Each answer decides what is asked next.')],
      subject: key,
      steps: [
        {
          id: 'start',
          ask: 'Which part do you tidy first?',
          branches: turned(start, key).map((label) => ({ label, to: 'inner' })),
        },
        {
          id: 'inner',
          ask: `Write $${innerTex(params)}$ as one fraction.`,
          branches: turned(inners, key).map((tex) => ({ label: `$${tex}$`, to: 'divide' })),
        },
        {
          id: 'divide',
          ask: `Now divide $${B}$ by that fraction. What do you get?`,
          branches: turned(divisions, key).map((tex) => ({
            label: `$${tex}$`,
            outcome: `So the expression is $${a} ${b < 0 ? '-' : '+'} ${tex}$, ready to write as one fraction.`,
          })),
        },
      ],
      answer: [start[0], `$${innerFrac(params)}$`, `$${divided(params)}$`],
    };
  },
  solution: stackSolution,
};

interface StackValueParams extends StackParams {
  v: number;
}

const stackValueOf = ({ a, b, c, d, v }: StackValueParams): number => a + (b * v) / (c * v + d);

/** The value at a given x, whole by the choice of x. */
const stackValue: Generator<StackValueParams> = {
  id: 'af10-stack-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleStack(rng, difficulty);
      const { b, c, d } = params;
      const good: number[] = [];
      for (let v = difficulty > 1 ? -6 : 1; v <= 6; v += 1) {
        const inner = c * v + d;
        if (v === 0 || inner === 0 || (b * v) % inner !== 0) continue;
        good.push(v);
      }
      if (good.length === 0) continue;
      return { ...params, v: rng.pick(good) };
    }
  },
  choices: (params) => {
    const { a, b, c, d, v } = params;
    const inner = c * v + d;
    return intOptions(stackValueOf(params), [a - (b * v) / inner, (b * v) / inner, a + (b * inner) / v, a + b]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`Find its value when $x = ${params.v}$.`), show(stackTex(params))],
    lead: '\\text{value} =',
    keypad: [],
    answer: String(stackValueOf(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { v } = params;
    const top = stackTop(params)[0] * v + stackTop(params)[1];
    const bottom = params.c * v + params.d;
    return [
      ...stackSolution(params),
      { text: `At $x = ${v}$ the top is $${top}$ and the bottom is $${bottom}$:` },
      { tex: `${frac(String(top), String(bottom))} = ${stackValueOf(params)}` },
    ];
  },
};

/* ================================================================
 * Lesson 5: equations with a fraction inside a fraction
 * ================================================================ */

/** (a + b/x)/(c + d/x) = N, with the whole solution r. */
interface EqParams {
  a: number;
  b: number;
  c: number;
  d: number;
  N: number;
  r: number;
}

const eqLeft = ({ a, b, c, d }: EqParams): string => `\\dfrac{${a} ${signedFracTerm(b, 'x')}}{${c} ${signedFracTerm(d, 'x')}}`;

function sampleEq(rng: Rng, difficulty: number): EqParams {
  for (;;) {
    const hard = difficulty > 1;
    const a = rng.int(1, hard ? 4 : 3);
    const c = rng.int(1, 3);
    const b = hard ? nonZero(rng, 6) : rng.int(1, 6);
    const d = nonZero(rng, 6);
    const r = nonZero(rng, hard ? 8 : 6);
    const top = a * r + b;
    const bottom = c * r + d;
    if (bottom === 0 || top % bottom !== 0) continue;
    const N = top / bottom;
    if (N === 0 || Math.abs(N) > 12 || a * d === b * c) continue;
    if (gcd(gcd(a, b), gcd(c, d)) > 1) continue;
    return { a, b, c, d, N, r };
  }
}

function eqSolution(params: EqParams): SolutionStep[] {
  const { a, b, c, d, N, r } = params;
  const P = polyTex([a, b]);
  const Q = polyTex([c, d]);
  return [
    { text: 'Multiply the top and the bottom of the left side by $x$:' },
    { tex: `${frac(P, Q)} = ${N}` },
    { text: 'Multiply both sides by the bottom, expand, and collect:' },
    {
      // uniq: with one x left over after collecting, the collected line is
      // already x = r, and it would otherwise be written twice.
      tex: chain(
        ...uniq([
          `${P} &= ${timesTex(N, Q)}`,
          `${P} &= ${polyTex([N * c, N * d])}`,
          `${termTex(a - N * c, 1)} &= ${N * d - b}`,
          `x &= ${r}`,
        ]),
      ),
    },
    { text: `Check: at $x = ${r}$ neither $x$ nor $${Q}$ is zero, so it stands.` },
  ];
}

/** Make it one fraction, clear it, solve: three steps. */
const eqSteps: Generator<EqParams> = {
  id: 'af10-eq-steps',
  sample: sampleEq,
  render: (params): Slide => {
    const { a, b, c, d, N, r } = params;
    const P = polyTex([a, b]);
    const Q = polyTex([c, d]);
    const one = frac(P, Q);
    const cleared = `${P} = ${timesTex(N, Q)}`;
    const solved = `x = ${r}`;
    return {
      kind: 'steps',
      prompt: [
        say('Solve. Make the left side one fraction, clear it, then solve. Tap the part you would do **next**, then choose what it becomes.'),
      ],
      start: [eqLeft(params), '=', String(N)],
      reductions: [
        { span: [0, 1], value: one, bank: stepBank(one, frac(polyTex([b, a]), polyTex([d, c])), frac(Q, P), frac(polyTex([a, -b]), Q)) },
        { span: [0, 3], operator: 1, value: cleared, bank: stepBank(cleared, `${Q} = ${timesTex(N, P)}`, `${P} = ${polyTex([N * c, d])}`, `${P} = ${timesTex(N, polyTex([c, -d]))}`) },
        { span: [0, 1], value: solved, bank: stepBank(solved, `x = ${-r}`, `x = ${r + 1}`, `x = ${r - 1}`) },
      ],
    };
  },
  solution: eqSolution,
};

/** The same, typed. */
const eqSolve: Generator<EqParams> = {
  id: 'af10-eq-solve',
  sample: sampleEq,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say('Solve.'), show(`${eqLeft(params)} = ${params.N}`)],
    lead: 'x =',
    keypad: [],
    answer: String(params.r),
    domain: 'real',
    mode: 'exact',
  }),
  solution: eqSolution,
};

/**
 * (x + A/x)/(1 + B/x) = C. Multiplying the top and the bottom by x and then
 * clearing gives x^2 - Cx + (A - CB) = 0, built from its roots. A root of 0
 * makes the small bottoms zero; a root of -B makes the main bottom zero.
 * Difficulty 1 only ever rejects 0.
 */
interface RejectParams {
  A: number;
  B: number;
  C: number;
  roots: [number, number];
}

const rejectTex = ({ A, B, C }: RejectParams): string => `\\dfrac{x ${signedFracTerm(A, 'x')}}{1 ${signedFracTerm(B, 'x')}} = ${C}`;
const constantOf = ({ roots }: RejectParams): number => roots[0] * roots[1];
const makesBottomZero = ({ B }: RejectParams, x: number): boolean => x === 0 || x === -B;

function sampleReject(rng: Rng, difficulty: number): RejectParams {
  for (;;) {
    const hard = difficulty > 1;
    const B = nonZero(rng, hard ? 5 : 4);
    const bad = hard ? rng.pick([0, -B]) : 0;
    const r = nonZero(rng, 6);
    if (r === -B) continue;
    const other = rng.chance(0.7) ? bad : nonZero(rng, 6);
    if (other === r || (other !== bad && other === -B)) continue;
    const C = r + other;
    const A = r * other + C * B;
    if (A === 0 || C === 0 || Math.abs(A) > 40) continue;
    return { A, B, C, roots: [r, other].sort((x, y) => x - y) as [number, number] };
  }
}

/** The quadratic's factorised form, x first when 0 is a root. */
function factorTex([lo, hi]: [number, number]): string {
  if (lo === 0) return `x${pbr(-hi)}`;
  if (hi === 0) return `x${pbr(-lo)}`;
  return `${pbr(-lo)}${pbr(-hi)}`;
}

function clearing(params: RejectParams): SolutionStep[] {
  const { A, B, C } = params;
  return [
    { text: 'Multiply the top and the bottom of the left side by $x$, then multiply both sides by the new bottom:' },
    {
      tex: chain(
        `${frac(`x^{2} ${signed(A)}`, br(B))} &= ${C}`,
        `x^{2} ${signed(A)} &= ${timesTex(C, br(B))}`,
        `${polyTex([1, -C, constantOf(params)])} &= 0`,
        `${factorTex(params.roots)} &= 0`,
      ),
    },
  ];
}

/** Check each root against every bottom, then say what the solution is. */
const eqRejectFlow: Generator<RejectParams> = {
  id: 'af10-eq-reject-flow',
  sample: sampleReject,
  render: (params): Slide => {
    const [lo, hi] = params.roots;
    const finals = [`$x = ${lo}$ only`, `$x = ${hi}$ only`, `$x = ${lo}$ or $x = ${hi}$`, 'No solution'];
    const zeroLo = makesBottomZero(params, lo);
    const zeroHi = makesBottomZero(params, hi);
    const right = zeroLo && zeroHi ? finals[3] : zeroLo ? finals[1] : zeroHi ? finals[0] : finals[2];
    const outcome = (label: string) => (label === 'No solution' ? 'So neither value is a solution.' : `So the solution is ${label.replace(' only', '')}.`);
    return {
      kind: 'flow',
      prompt: [
        say(
          `Clearing the fractions gives a quadratic whose solutions are $x = ${lo}$ and $x = ${hi}$. Check each against every bottom in the original, the small ones and the main one.`,
        ),
      ],
      subject: rejectTex(params),
      steps: [
        {
          id: 'first',
          ask: `Does $x = ${lo}$ make any bottom zero?`,
          branches: [
            { label: 'Yes', to: 'second' },
            { label: 'No', to: 'second' },
          ],
        },
        {
          id: 'second',
          ask: `Does $x = ${hi}$ make any bottom zero?`,
          branches: [
            { label: 'Yes', to: 'answer' },
            { label: 'No', to: 'answer' },
          ],
        },
        {
          id: 'answer',
          ask: 'So what is the solution?',
          branches: finals.map((label) => ({ label, outcome: outcome(label) })),
        },
      ],
      answer: [zeroLo ? 'Yes' : 'No', zeroHi ? 'Yes' : 'No', right],
    };
  },
  solution: (params) => {
    const { B, roots } = params;
    const steps = clearing(params);
    steps.push({
      text: `The small bottoms are zero at $x = 0$, and the main bottom, $1 ${signedFracTerm(B, 'x')}$, is zero at $x = ${-B}$.`,
    });
    const bad = roots.filter((x) => makesBottomZero(params, x));
    const good = roots.filter((x) => !makesBottomZero(params, x));
    if (bad.length === 0) {
      steps.push({ text: `Neither $x = ${roots[0]}$ nor $x = ${roots[1]}$ is one of those, so both solutions stand.` });
    } else {
      steps.push({ text: `$x = ${bad[0]}$ makes a bottom of the original zero, so the equation is undefined there. Reject it.` });
      if (good.length > 0) steps.push({ tex: `x = ${good[0]}` });
    }
    return steps;
  },
};

/** The quadratic that clearing gives, as tiles. */
const eqQuadTiles: Generator<RejectParams> = {
  id: 'af10-eq-quad-tiles',
  sample: sampleReject,
  render: (params): Slide => {
    const { A, B, C } = params;
    const K = constantOf(params);
    const answer = termTiles([1, -C, K]).slice(1);
    const slips = [-K, A, A + C * B, C * B].filter((n) => n !== 0 && n !== K);
    return {
      kind: 'tiles',
      prompt: [
        say('Multiply the top and the bottom of the left side by $x$, then clear the fraction. Collect every term on the left and place the quadratic.'),
        show(rejectTex(params)),
      ],
      template: K === 0 ? 'x^2 {0} = 0' : 'x^2 {0} {1} = 0',
      bank: tileBank(answer, [signedTerm(C, 1), ...slips.map(signed)]),
      answer,
    };
  },
  solution: (params) => clearing(params),
};

export const fractionsLevel10Generators = [
  numTidyTree,
  numClearTiles,
  numLcd,
  numValue,
  commonTiles,
  commonWhich,
  commonFlow,
  commonValue,
  overSteps,
  overTiles,
  overWhich,
  overCancelFlow,
  stackTree,
  stackTiles,
  stackFlow,
  stackValue,
  eqSteps,
  eqSolve,
  eqRejectFlow,
  eqQuadTiles,
];
