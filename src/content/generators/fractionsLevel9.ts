/**
 * Algebraic Fractions, level 9: rearranging formulae with fractions.
 *
 * Lesson 1 has the subject in the bottom of a fraction: multiply up first,
 * then undo what is left. Lesson 2 is the key method for a subject that
 * appears twice, in the top and in the bottom: multiply up, collect the terms
 * with the subject in them on one side, take it out as a factor, divide.
 * Lesson 3 runs that method on f(x) = (ax + b)/(cx + d) to find its inverse,
 * the value of the inverse at a number, the one value it is not defined at,
 * and which functions are their own inverse. Lesson 4 is sums of
 * reciprocals: the lens formula, resistors in parallel and their relatives.
 * Lesson 5 rearranges and then substitutes, and finds the slip in someone
 * else's rearrangement.
 *
 * A rearranged formula is a form, and the checker compares values, so a typed
 * rearrangement would accept the formula copied back (PITFALLS 3.4). Forms go
 * through `choice`, `tiles`, `steps`, `tree` and `flow`; only whole numbers are
 * typed, and every one of them is built outward from the answer.
 *
 * One convention runs through the pure rearrangements: the terms with the
 * subject in them are collected on the **left**. That fixes the signs of the
 * top and the bottom, which is what lets a tiles or tree slide grade the form
 * exactly. The other convention gives the same fraction with both signs
 * changed, so no bank here ever holds both the negated top and the negated
 * bottom: `safeSlips` drops any distractor that would pair with another tile
 * into a fraction equal to the answer.
 */
import type { Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { say } from './format';
import { br, chain as alignedLines, choiceSlide, frac, nonZero, pbr, show, signed, stepBank, tileBank, turned } from './algebraicFractions';

/**
 * Lines of working aligned on their `&`, a minus that opens a cell kept as a
 * sign. KaTeX starts each aligned cell with an empty group, so `&-4y` is set
 * as a subtraction, "− 4y" with a gap; `&{-}4y` reads as the negative it is.
 */
const chain = (...lines: string[]): string => alignedLines(...lines.map((line) => line.replace(/&(\s*)-/g, '&$1{-}')));

/* ---------- writing lines ---------- */

/** c lots of a letter or letters: y, -y, 3xy. */
function term(c: number, v: string): string {
  if (c === 1) return v;
  if (c === -1) return `-${v}`;
  return `${c}${v}`;
}

/** The same after another term, its sign shown: + 3y, - xy. */
function plusTerm(c: number, v: string): string {
  return c < 0 ? `- ${term(-c, v)}` : `+ ${term(c, v)}`;
}

/** pv + q as it is written by hand: 2y + 3, 3 - 2y, -y - 4, 5. */
function linear(p: number, q: number, v: string): string {
  if (p === 0) return String(q);
  if (q === 0) return term(p, v);
  if (p < 0 && q > 0) return `${q} - ${term(-p, v)}`;
  return `${term(p, v)} ${signed(q)}`;
}

/** pv + q for mathjs. Never displayed. */
const linearMath = (p: number, q: number, v: string): string => `((${p})*${v} + (${q}))`;

/** A linear expression pv + q as its two numbers. */
type Lin = [number, number];

const linTex = ([p, q]: Lin, v: string): string => linear(p, q, v);
const ratioTex = (top: Lin, bottom: Lin, v: string): string => frac(linTex(top, v), linTex(bottom, v));
const ratioMath = (top: Lin, bottom: Lin, v: string): string => `(${linearMath(top[0], top[1], v)}/${linearMath(bottom[0], bottom[1], v)})`;

/** Whether (pv + q)/(rv + s) and (p'v + q')/(r'v + s') are the same function: cross-multiplied, the same polynomial. */
function sameRatio([p, q]: Lin, [r, s]: Lin, [p2, q2]: Lin, [r2, s2]: Lin): boolean {
  return p * r2 === p2 * r && p * s2 + q * r2 === p2 * s + q2 * r && q * s2 === q2 * s;
}

/** No two of these fractions are the same function. */
function allDifferent(list: [Lin, Lin][]): boolean {
  return list.every((one, i) => list.every((other, j) => j <= i || !sameRatio(one[0], one[1], other[0], other[1])));
}

/**
 * The distractors that are safe to put beside the top and bottom of a
 * fraction: none of them repeats an answer tile, and no two tiles in the bank
 * make a fraction equal to the answer other than the answer itself. Without
 * this, the negated top beside the negated bottom is a right answer marked
 * wrong.
 */
function safeSlips(top: Lin, bottom: Lin, slips: Lin[], v: string): string[] {
  const key = (l: Lin) => linTex(l, v);
  const bad = (t: Lin, u: Lin) => sameRatio(t, u, top, bottom) && !(key(t) === key(top) && key(u) === key(bottom));
  const kept: Lin[] = [];
  for (const slip of slips) {
    if (slip[0] === 0 && slip[1] === 0) continue;
    const pool = [top, bottom, ...kept];
    if (pool.some((other) => key(other) === key(slip))) continue;
    if ([...pool, slip].some((other) => bad(slip, other) || bad(other, slip))) continue;
    kept.push(slip);
  }
  return kept.map(key);
}

/** `options` over a list: the first is the right one. */
function optionList(list: { tex: string; answer?: string }[]): ReturnType<typeof options> {
  const [first, ...rest] = list;
  return options(first, ...rest);
}

/** Lines of working, labelled (1), (2), ... down the left. */
function numberedLines(lines: string[]): string {
  return `\\begin{aligned} ${lines.map((line, i) => `\\text{(${i + 1})}\\quad & ${line}`).join(' \\\\ ')} \\end{aligned}`;
}

/* ================================================================
 * The subject twice: y = (ax + b)/(cx + d)
 * ================================================================ */

interface Mobius {
  a: number;
  b: number;
  c: number;
  d: number;
}

const mobiusTex = ({ a, b, c, d }: Mobius, v: string): string => frac(linear(a, b, v), linear(c, d, v));

/** Top and bottom of x once the x terms are collected on the left: (b - dy)/(cy - a). */
const topLin = ({ b, d }: Mobius): Lin => [-d, b];
const bottomLin = ({ a, c }: Mobius): Lin => [c, -a];

/**
 * (ax + b)/(cx + d) with whole numbers. Difficulty 1 has no number in front of
 * either x. The self-inverse ones, d = -a, are kept for the lesson about them,
 * and no whole number divides all four coefficients, so the answer never
 * simplifies by cancelling a number.
 */
function sampleMobius(rng: Rng, hard: boolean, valid: (m: Mobius) => boolean = () => true): Mobius {
  for (;;) {
    const a = hard ? nonZero(rng, 5) : 1;
    const c = hard ? rng.int(1, 4) : 1;
    if (hard && a === 1 && c === 1) continue;
    const b = nonZero(rng, 9);
    const d = nonZero(rng, 9);
    if (a * d - b * c === 0 || d === -a) continue;
    if ([a, b, c, d].reduce((g, n) => gcdAbs(g, n), 0) > 1) continue;
    const m = { a, b, c, d };
    if (valid(m)) return m;
  }
}

function gcdAbs(x: number, y: number): number {
  let p = Math.abs(x);
  let q = Math.abs(y);
  while (q) [p, q] = [q, p % q];
  return p;
}

/** The key method's lines, x the subject and y the other letter. */
function keyLines(m: Mobius) {
  const { a, b, c, d } = m;
  const top = linTex(topLin(m), 'y');
  const bottom = linTex(bottomLin(m), 'y');
  return {
    top,
    bottom,
    multiplied: `y(${linear(c, d, 'x')}) = ${linear(a, b, 'x')}`,
    expanded: `${term(c, 'xy')} ${plusTerm(d, 'y')} = ${linear(a, b, 'x')}`,
    collected: `${term(c, 'xy')} ${plusTerm(-a, 'x')} = ${top}`,
    factorised: `x(${bottom}) = ${top}`,
    divided: `x = ${frac(top, bottom)}`,
  };
}

function keySolution(m: Mobius): SolutionStep[] {
  const lines = keyLines(m);
  return [
    { text: `Multiply both sides by the bottom, $${linear(m.c, m.d, 'x')}$, and multiply out:` },
    { tex: chain(`&${lines.multiplied}`, `&${lines.expanded}`) },
    { text: 'Collect the terms with $x$ in them on the left and everything else on the right. A term changes sign as it crosses:' },
    { tex: lines.collected },
    { text: 'Every term on the left has an $x$, so take it out as a factor, then divide by the bracket:' },
    { tex: chain(`&${lines.factorised}`, `&${lines.divided}`) },
  ];
}

/**
 * The whole method one line at a time: multiply up and out, collect, factorise,
 * divide. Difficulty 2 has numbers in front of the x terms.
 */
const twiceSteps: Generator<Mobius> = {
  id: 'af9-twice-steps',
  sample: (rng, difficulty) => sampleMobius(rng, difficulty > 1),
  render: (m): Slide => {
    const { a, b, c, d } = m;
    const lines = keyLines(m);
    const right = linear(a, b, 'x');
    return {
      kind: 'steps',
      prompt: [
        say('Make $x$ the subject, collecting the $x$ terms on the left. Tap the part you would do **next**, then choose what it becomes.'),
      ],
      start: ['y', '=', mobiusTex(m, 'x')],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: lines.expanded,
          bank: stepBank(
            lines.expanded,
            `${term(c, 'xy')} ${signed(d)} = ${right}`,
            `${term(c, 'xy')} ${plusTerm(-d, 'y')} = ${right}`,
            `${term(a, 'xy')} ${plusTerm(b, 'y')} = ${linear(c, d, 'x')}`,
          ),
        },
        {
          span: [0, 1],
          value: lines.collected,
          bank: stepBank(
            lines.collected,
            `${term(c, 'xy')} ${plusTerm(a, 'x')} = ${lines.top}`,
            `${term(c, 'xy')} ${plusTerm(-a, 'x')} = ${linear(d, b, 'y')}`,
          ),
        },
        {
          span: [0, 1],
          value: lines.factorised,
          bank: stepBank(lines.factorised, `x(${linear(c, a, 'y')}) = ${lines.top}`, `y(${linear(c, -a, 'x')}) = ${lines.top}`),
        },
        {
          span: [0, 1],
          value: lines.divided,
          bank: stepBank(lines.divided, `x = ${frac(lines.bottom, lines.top)}`, `x = ${frac(lines.top, term(c, 'y'))} ${signed(a)}`),
        },
      ],
    };
  },
  solution: keySolution,
};

const twiceOptions = (m: Mobius): [Lin, Lin][] => {
  const top = topLin(m);
  const bottom = bottomLin(m);
  return [
    [top, bottom],
    [bottom, top],
    [[m.d, m.b], bottom],
    [top, [m.c, m.a]],
  ];
};

/**
 * Place the top and the bottom of x. Difficulty 2 has numbers in front of the
 * x terms. Its pick-one form offers the fraction upside down and the two sign
 * slips.
 */
const twicePlace: Generator<Mobius> = {
  id: 'af9-twice-place',
  sample: (rng, difficulty) => sampleMobius(rng, difficulty > 1, (m) => allDifferent(twiceOptions(m))),
  choices: (m) =>
    optionList(
      twiceOptions(m).map(([top, bottom]) => ({ tex: `x = ${ratioTex(top, bottom, 'y')}`, answer: ratioMath(top, bottom, 'y') })),
    ),
  render: (m): Slide => {
    const { a, b, c, d } = m;
    const top = topLin(m);
    const bottom = bottomLin(m);
    const answer = [linTex(top, 'y'), linTex(bottom, 'y')];
    const slips: Lin[] = [
      [d, b],
      [-d, -b],
      [c, a],
      a !== c && a !== -c ? [a, -c] : [c, 0],
    ];
    return {
      kind: 'tiles',
      prompt: [
        say('Make $x$ the subject, as one fraction, collecting the $x$ terms on the left.'),
        show(`y = ${mobiusTex(m, 'x')}`),
      ],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: tileBank(answer, safeSlips(top, bottom, slips, 'y')),
      answer,
    };
  },
  solution: keySolution,
};

/**
 * The two halves of the answer, then the answer: the bracket x is multiplied by
 * once it is taken out, and everything on the other side.
 */
const factorTree: Generator<Mobius> = {
  id: 'af9-factor-tree',
  sample: (rng, difficulty) => sampleMobius(rng, difficulty > 1),
  render: (m): Slide => {
    const { a, b, c, d } = m;
    const lines = keyLines(m);
    const answer = [lines.bottom, lines.top, lines.divided];
    const slips = safeSlips(topLin(m), bottomLin(m), [[c, a], [d, b]], 'y');
    return {
      kind: 'tree',
      prompt: [
        say(
          'Make $x$ the subject, collecting the $x$ terms on the left. Top row: the bracket $x$ is multiplied by once it is taken out as a factor, then everything on the other side. Below: $x$.',
        ),
      ],
      expression: `y = ${mobiusTex(m, 'x')}`,
      nodes: [
        { id: 'bracket', from: [] },
        { id: 'other', from: [] },
        { id: 'x', from: ['bracket', 'other'] },
      ],
      bank: tileBank(answer, [...slips, `x = ${frac(lines.bottom, lines.top)}`, `x = ${frac(linear(d, b, 'y'), lines.bottom)}`]),
      answer,
    };
  },
  solution: keySolution,
};

const equalOptions = ({ a, b, c, d }: Mobius): [Lin, Lin][] => [
  [
    [d, -b],
    [-c, a],
  ],
  [
    [d, -b],
    [c, -a],
  ],
  [
    [-c, a],
    [d, -b],
  ],
  [
    [d, b],
    [-c, a],
  ],
];

/**
 * Collecting on the right gives the same fraction with both signs changed.
 * Which of four is that one? The others change one sign, turn it over, or
 * slip a sign inside.
 */
const twiceEqual: Generator<Mobius> = {
  id: 'af9-twice-equal',
  sample: (rng, difficulty) => sampleMobius(rng, difficulty > 1, (m) => allDifferent(equalOptions(m))),
  render: (m): Slide => {
    const lines = keyLines(m);
    return choiceSlide(
      [
        say('Collecting the $x$ terms on the left gives this. Which is the same answer, with the $x$ terms collected on the right instead?'),
        show(lines.divided),
      ],
      optionList(equalOptions(m).map(([top, bottom]) => ({ tex: `x = ${ratioTex(top, bottom, 'y')}`, answer: ratioMath(top, bottom, 'y') }))),
    );
  },
  solution: (m) => {
    const { a, b, c, d } = m;
    return [
      { text: `Multiplied up, $${keyLines(m).expanded}$. Collected on the right, every term crosses the other way, so every sign changes:` },
      {
        tex: chain(
          `&${linear(d, -b, 'y')} = ${term(a, 'x')} ${plusTerm(-c, 'xy')}`,
          `&${linear(d, -b, 'y')} = x(${linear(-c, a, 'y')})`,
          `&x = ${ratioTex([d, -b], [-c, a], 'y')}`,
        ),
      },
      { text: 'Both the top and the bottom have changed sign, which is multiplying the fraction by $\\frac{-1}{-1} = 1$, so it is the same answer.' },
    ];
  },
};

/* ================================================================
 * Lesson 1: the subject on the bottom
 * ================================================================ */

type Shape = 'over' | 'overSum' | 'overDiff' | 'diffOver';
type Letter = 'A' | 'B' | 'C';

interface Formula {
  shape: Shape;
  Q: string;
  A: string;
  B: string;
  C: string;
}

/** Q = A/B, from physics. Either letter on the right can be asked for. */
const SIMPLE: [string, string, string][] = [
  ['s', 'd', 't'],
  ['P', 'F', 'A'],
  ['\\rho', 'm', 'V'],
  ['I', 'V', 'R'],
  ['P', 'W', 't'],
  ['n', 'c', 'v'],
  ['C', 'Q', 'V'],
  ['a', 'F', 'm'],
  ['k', 'F', 'x'],
  ['I', 'Q', 't'],
  ['g', 'W', 'm'],
  ['c', 'n', 'V'],
  ['M', 'm', 'n'],
  ['V', 'W', 'Q'],
  ['R', 'V', 'I'],
  ['t', 'Q', 'I'],
  ['m', 'F', 'a'],
  ['y', 'a', 'x'],
  ['k', 'p', 'q'],
];

/** A sum or difference in the bottom, or a difference on top. */
const COMPOUND: Formula[] = [
  { shape: 'overSum', Q: 'I', A: 'V', B: 'R', C: 'r' },
  { shape: 'overSum', Q: 't', A: 'd', B: 'u', C: 'v' },
  { shape: 'overSum', Q: 'y', A: 'a', B: 'x', C: 'b' },
  { shape: 'overSum', Q: 'a', A: 'F', B: 'm', C: 'M' },
  { shape: 'overDiff', Q: 't', A: 'd', B: 'v', C: 'w' },
  { shape: 'overDiff', Q: 'y', A: 'a', B: 'b', C: 'x' },
  { shape: 'diffOver', Q: 'a', A: 'v', B: 'u', C: 't' },
  { shape: 'diffOver', Q: 'm', A: 'y', B: 'c', C: 'x' },
  { shape: 'diffOver', Q: 'y', A: 'x', B: 'a', C: 'b' },
  { shape: 'overSum', Q: 'p', A: 'q', B: 'r', C: 's' },
  { shape: 'overDiff', Q: 'k', A: 'm', B: 'n', C: 'p' },
  { shape: 'overDiff', Q: 'x', A: 'k', B: 'a', C: 'b' },
  { shape: 'diffOver', Q: 'k', A: 'p', B: 'q', C: 'r' },
];

function formulaTex({ shape, Q, A, B, C }: Formula): string {
  if (shape === 'over') return `${Q} = ${frac(A, B)}`;
  if (shape === 'overSum') return `${Q} = ${frac(A, `${B} + ${C}`)}`;
  if (shape === 'overDiff') return `${Q} = ${frac(A, `${B} - ${C}`)}`;
  return `${Q} = ${frac(`${A} - ${B}`, C)}`;
}

/** The rearrangement for one letter: the right side, three slips, and the lines of working. */
function rearrange(f: Formula, subject: Letter): { right: string; wrong: string[]; working: string[] } {
  const { shape, Q } = f;
  const A = f.A;
  // For a sum in the bottom, B and C play the same part.
  const [B, C] = shape === 'overSum' && subject === 'C' ? [f.C, f.B] : [f.B, f.C];
  const AQ = frac(A, Q);
  if (shape === 'over') {
    const multiplied = `${Q} ${B} = ${A}`;
    if (subject === 'A') return { right: `${Q} ${B}`, wrong: [frac(Q, B), frac(B, Q), `${Q} + ${B}`], working: [multiplied, `${A} = ${Q} ${B}`] };
    return { right: AQ, wrong: [frac(Q, A), `${A} ${Q}`, `${A} - ${Q}`], working: [multiplied, `${B} = ${AQ}`] };
  }
  if (shape === 'overSum') {
    const multiplied = `${Q}(${f.B} + ${f.C}) = ${A}`;
    if (subject === 'A') {
      return {
        right: `${Q}(${B} + ${C})`,
        wrong: [`${Q} ${B} + ${C}`, frac(`${B} + ${C}`, Q), frac(Q, `${B} + ${C}`)],
        working: [multiplied, `${A} = ${Q}(${B} + ${C})`],
      };
    }
    return {
      right: `${AQ} - ${C}`,
      wrong: [frac(A, `${Q} - ${C}`), `${A} ${Q} - ${C}`, `${AQ} + ${C}`],
      working: [multiplied, `${f.B} + ${f.C} = ${AQ}`, `${B} = ${AQ} - ${C}`],
    };
  }
  if (shape === 'overDiff') {
    const multiplied = `${Q}(${B} - ${C}) = ${A}`;
    if (subject === 'A') {
      return {
        right: `${Q}(${B} - ${C})`,
        wrong: [`${Q} ${B} - ${C}`, frac(`${B} - ${C}`, Q), frac(Q, `${B} - ${C}`)],
        working: [multiplied, `${A} = ${Q}(${B} - ${C})`],
      };
    }
    if (subject === 'B') {
      return {
        right: `${AQ} + ${C}`,
        wrong: [`${AQ} - ${C}`, `${A} ${Q} + ${C}`, frac(A, `${Q} + ${C}`)],
        working: [multiplied, `${B} - ${C} = ${AQ}`, `${B} = ${AQ} + ${C}`],
      };
    }
    return {
      right: `${B} - ${AQ}`,
      wrong: [`${AQ} - ${B}`, `${B} + ${AQ}`, `${B} - ${A} ${Q}`],
      working: [multiplied, `${B} - ${C} = ${AQ}`, `${B} = ${AQ} + ${C}`, `${C} = ${B} - ${AQ}`],
    };
  }
  const multiplied = `${Q} ${C} = ${A} - ${B}`;
  if (subject === 'A') {
    return {
      right: `${Q} ${C} + ${B}`,
      wrong: [`${Q} ${C} - ${B}`, `${frac(Q, C)} + ${B}`, `${Q}(${C} + ${B})`],
      working: [multiplied, `${A} = ${Q} ${C} + ${B}`],
    };
  }
  if (subject === 'B') {
    return {
      right: `${A} - ${Q} ${C}`,
      wrong: [`${Q} ${C} - ${A}`, `${A} + ${Q} ${C}`, `${A} - ${frac(Q, C)}`],
      working: [multiplied, `${B} + ${Q} ${C} = ${A}`, `${B} = ${A} - ${Q} ${C}`],
    };
  }
  return {
    right: frac(`${A} - ${B}`, Q),
    wrong: [`${Q}(${A} - ${B})`, frac(Q, `${A} - ${B}`), `${A} - ${B} - ${Q}`],
    working: [multiplied, `${C} = ${frac(`${A} - ${B}`, Q)}`],
  };
}

interface LettersParams {
  f: Formula;
  subject: Letter;
}

/**
 * Make one letter of a physics formula the subject, from four. Difficulty 1
 * is Q = A/B, either letter; difficulty 2 has a sum or a difference in it.
 */
const bottomLetters: Generator<LettersParams> = {
  id: 'af9-bottom-letters',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const f = rng.pick(COMPOUND);
      return { f, subject: rng.pick<Letter>(['A', 'B', 'C']) };
    }
    const [Q, A, B] = rng.pick(SIMPLE);
    return { f: { shape: 'over', Q, A, B, C: '' }, subject: rng.pick<Letter>(['A', 'B']) };
  },
  render: ({ f, subject }): Slide => {
    const letter = f[subject];
    const { right, wrong } = rearrange(f, subject);
    return choiceSlide(
      [say(`Make $${letter}$ the subject.`), show(formulaTex(f))],
      options({ tex: `${letter} = ${right}` }, ...wrong.map((tex) => ({ tex: `${letter} = ${tex}` }))),
    );
  },
  solution: ({ f, subject }) => {
    const { working } = rearrange(f, subject);
    const bottom = f.shape === 'over' ? f.B : f.shape === 'diffOver' ? f.C : `(${f.B} ${f.shape === 'overSum' ? '+' : '-'} ${f.C})`;
    return [
      { text: `Multiply both sides by $${bottom}$, so nothing is left under a line. Then undo what is left, one step at a time:` },
      { tex: chain(...working.map((line) => `&${line}`)) },
    ];
  },
};

interface BottomParams {
  k: number;
  b: number;
  /** A number added to the fraction; 0 for none. */
  c: number;
}

/** y - c, or y when nothing is added. */
const yLess = (c: number): string => linear(1, -c, 'y');

/** y = k/(x + b) + c, as the learner reads it. */
function bottomTex({ k, b, c }: BottomParams): string {
  return `y = ${frac(String(k), br(b))}${c === 0 ? '' : ` ${signed(c)}`}`;
}

/** x = k/(y - c) - b. */
const bottomAnswer = ({ k, b, c }: BottomParams): string => `x = ${frac(String(k), yLess(c))} ${signed(-b)}`;

function bottomSolution(params: BottomParams): SolutionStep[] {
  const { k, b, c } = params;
  const steps: SolutionStep[] = [];
  const lines = [`&${bottomTex(params)}`];
  if (c !== 0) {
    steps.push({ text: `The $${signed(c)}$ is outside the fraction, so it comes off first. Then multiply both sides by $${pbr(b)}$:` });
    lines.push(`&${yLess(c)} = ${frac(String(k), br(b))}`, `&(${yLess(c)})${pbr(b)} = ${k}`);
  } else {
    steps.push({ text: `Multiply both sides by $${pbr(b)}$, so $x$ is no longer under a line:` });
    lines.push(`&y${pbr(b)} = ${k}`);
  }
  steps.push({ tex: chain(...lines) });
  steps.push({ text: `Divide by $${c === 0 ? 'y' : `(${yLess(c)})`}$, then take the $${b}$ over:` });
  steps.push({ tex: chain(`&${br(b)} = ${frac(String(k), yLess(c))}`, `&${bottomAnswer(params)}`) });
  return steps;
}

/**
 * y = k/(x + b), rearranged one line at a time. Difficulty 2 adds a number to
 * the fraction, which has to come off before anything else.
 */
const bottomSteps: Generator<BottomParams> = {
  id: 'af9-bottom-steps',
  sample: (rng, difficulty) => {
    const k = rng.int(2, 12);
    const b = nonZero(rng, 9);
    return { k, b, c: difficulty > 1 ? nonZero(rng, 9) : 0 };
  },
  render: (params): Slide => {
    const { k, b, c } = params;
    const fr = frac(String(k), br(b));
    const answer = bottomAnswer(params);
    const finish = {
      span: [0, 1] as [number, number],
      value: answer,
      bank: stepBank(answer, `x = ${frac(String(k), yLess(c))} ${signed(b)}`, `x = ${frac(String(k), linear(1, -c - b, 'y'))}`),
    };
    const prompt = [say('Make $x$ the subject. Tap the part you would do **next**, then choose what it becomes.')];
    if (c === 0) {
      const multiplied = `y${pbr(b)} = ${k}`;
      const divided = `${br(b)} = ${frac(String(k), 'y')}`;
      return {
        kind: 'steps',
        prompt,
        start: ['y', '=', fr],
        reductions: [
          { span: [0, 3], operator: 1, value: multiplied, bank: stepBank(multiplied, `y = ${k}${pbr(b)}`, `xy ${signed(b)} = ${k}`) },
          { span: [0, 1], value: divided, bank: stepBank(divided, `${br(b)} = ${k}y`, `${br(b)} = ${frac('y', String(k))}`) },
          finish,
        ],
      };
    }
    const cleared = `${yLess(c)} = ${fr}`;
    const multiplied = `(${yLess(c)})${pbr(b)} = ${k}`;
    const divided = `${br(b)} = ${frac(String(k), yLess(c))}`;
    return {
      kind: 'steps',
      prompt,
      start: ['y', '=', fr, signed(c)],
      reductions: [
        {
          span: [0, 4],
          operator: 3,
          value: cleared,
          bank: stepBank(cleared, `${linear(1, c, 'y')} = ${fr}`, `y = ${frac(String(k), linear(1, b + c, 'x'))}`),
        },
        {
          span: [0, 1],
          value: multiplied,
          bank: stepBank(multiplied, `y${pbr(b)} ${signed(-c)} = ${k}`, `(${linear(1, c, 'y')})${pbr(b)} = ${k}`),
        },
        {
          span: [0, 1],
          value: divided,
          bank: stepBank(divided, `${br(b)} = ${frac(String(k), 'y')} ${signed(-c)}`, `${br(b)} = ${k}(${yLess(c)})`),
        },
        finish,
      ],
    };
  },
  solution: bottomSolution,
};

interface PlaceParams {
  k: number;
  b: number;
  /** The number in front of x in the bottom; 1 at difficulty 1. */
  m: number;
}

/**
 * Place x. Difficulty 1 is y = k/(x + b), written k/y - b; difficulty 2 has a
 * number in front of x, and the answer is one fraction: (k - by)/(my).
 */
const bottomPlace: Generator<PlaceParams> = {
  id: 'af9-bottom-place',
  sample: (rng, difficulty) => {
    for (;;) {
      const k = rng.int(2, 12);
      const b = nonZero(rng, 9);
      const m = difficulty > 1 ? rng.int(2, 5) : 1;
      if (m > 1 && gcdAbs(gcdAbs(k, b), m) > 1) continue;
      return { k, b, m };
    }
  },
  render: ({ k, b, m }): Slide => {
    const question = show(`y = ${frac(String(k), linear(m, b, 'x'))}`);
    if (m === 1) {
      const answer = [frac(String(k), 'y'), signed(-b)];
      return {
        kind: 'tiles',
        prompt: [say('Make $x$ the subject.'), question],
        template: 'x = {0} {1}',
        bank: tileBank(answer, [frac('y', String(k)), `${k}y`, signed(b)]),
        answer,
      };
    }
    const answer = [linear(-b, k, 'y'), term(m, 'y')];
    return {
      kind: 'tiles',
      prompt: [say('Make $x$ the subject, written as one fraction. Place its top and bottom.'), question],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: tileBank(answer, [linear(b, k, 'y'), String(m), term(k, 'y')]),
      answer,
    };
  },
  solution: ({ k, b, m }) => {
    if (m === 1) {
      return [
        { text: `Multiply both sides by $${pbr(b)}$, divide by $y$, then take the $${b}$ over:` },
        { tex: chain(`&y${pbr(b)} = ${k}`, `&${br(b)} = ${frac(String(k), 'y')}`, `&x = ${frac(String(k), 'y')} ${signed(-b)}`) },
      ];
    }
    return [
      { text: `Multiply both sides by $(${linear(m, b, 'x')})$ and multiply out:` },
      { tex: chain(`&y(${linear(m, b, 'x')}) = ${k}`, `&${term(m, 'xy')} ${plusTerm(b, 'y')} = ${k}`) },
      { text: `Take the $${term(b, 'y')}$ over, then divide by $${term(m, 'y')}$:` },
      { tex: chain(`&${term(m, 'xy')} = ${linear(-b, k, 'y')}`, `&x = ${frac(linear(-b, k, 'y'), term(m, 'y'))}`) },
    ];
  },
};

/**
 * Plan it: what comes off first, what next, and which x it gives. A number
 * added to the fraction has to come off before the bottom is multiplied up.
 */
const bottomPlan: Generator<BottomParams> = {
  id: 'af9-bottom-plan',
  sample: (rng, difficulty) => {
    for (;;) {
      const k = rng.int(2, 12);
      const b = nonZero(rng, 9);
      const c = difficulty > 1 || rng.chance(0.6) ? nonZero(rng, 9) : 0;
      if (c === b) continue;
      return { k, b, c };
    }
  },
  render: (params): Slide => {
    const { k, b, c } = params;
    const key = bottomTex(params);
    const takeAway = (n: number) => (n > 0 ? `Take $${n}$ from both sides` : `Add $${-n}$ to both sides`);
    const multiply = `Multiply both sides by $${pbr(b)}$`;
    const divideK = `Divide both sides by $${k}$`;
    const offB = {
      label: takeAway(b),
      outcome: `The $${b}$ is inside the bottom of the fraction. It cannot come off until the fraction has been undone.`,
    };
    const offK = { label: divideK, outcome: `The $${k}$ is on top of a fraction, so dividing leaves $x$ just as stuck underneath.` };
    const answer = bottomAnswer(params);
    const finishes = [
      ...new Set([
        answer,
        `x = ${frac(String(k), yLess(c))} ${signed(b)}`,
        `x = ${frac(String(k), linear(1, -c - b, 'y'))}`,
        ...(c !== 0 && c !== -b ? [`x = ${frac(String(k), 'y')} ${signed(-c - b)}`] : []),
      ]),
    ];
    const finish = {
      id: 'finish',
      ask: `That gives $${c === 0 ? 'y' : `(${yLess(c)})`}${pbr(b)} = ${k}$. Which is $x$?`,
      branches: turned(finishes, key).map((tex) => ({ label: `$${tex}$`, outcome: `So $${tex}$.` })),
    };
    if (c === 0) {
      return {
        kind: 'flow',
        prompt: [say('Make $x$ the subject. Each answer decides what is asked next.')],
        subject: key,
        steps: [{ id: 'first', ask: 'What comes first?', branches: turned([{ label: multiply, to: 'finish' }, offB, offK], key) }, finish],
        answer: [multiply, `$${answer}$`],
      };
    }
    return {
      kind: 'flow',
      prompt: [say('Make $x$ the subject. Each answer decides what is asked next.')],
      subject: key,
      steps: [
        {
          id: 'first',
          ask: 'What comes off first?',
          branches: turned(
            [
              { label: takeAway(c), to: 'clear' },
              { label: multiply, outcome: `That multiplies the $${signed(c)}$ as well, and $x$ ends up in two places.` },
              offB,
              offK,
            ],
            key,
          ),
        },
        {
          id: 'clear',
          ask: `That leaves $${yLess(c)} = ${frac(String(k), br(b))}$. What next?`,
          branches: turned([{ label: multiply, to: 'finish' }, offB, offK], `${key}|clear`),
        },
        finish,
      ],
      answer: [takeAway(c), multiply, `$${answer}$`],
    };
  },
  solution: bottomSolution,
};

/* ================================================================
 * Lesson 3: inverse functions of fractions
 * ================================================================ */

const inverseTex = (m: Mobius, v: string): string => ratioTex(topLin(m), bottomLin(m), v);

const inverseOptions = (m: Mobius): [Lin, Lin][] => [
  [topLin(m), bottomLin(m)],
  [
    [m.c, m.d],
    [m.a, m.b],
  ],
  [[m.d, m.b], bottomLin(m)],
  [topLin(m), [m.c, m.a]],
];

function inverseSolution(m: Mobius): SolutionStep[] {
  const lines = keyLines(m);
  return [
    { text: `Write $y = f(x)$ and make $x$ the subject: multiply up, collect the $x$ terms on the left, factorise, divide.` },
    { tex: chain(`&${lines.expanded}`, `&${lines.collected}`, `&${lines.factorised}`, `&${lines.divided}`) },
    { text: 'That is the inverse, written in $y$. Write it in $x$:' },
    { tex: `f^{-1}(x) = ${inverseTex(m, 'x')}` },
  ];
}

/**
 * Place the top and bottom of f^{-1}(x). Its pick-one form offers the
 * reciprocal 1/f(x), the classic confusion, and two sign slips.
 */
const inversePlace: Generator<Mobius> = {
  id: 'af9-inverse-place',
  sample: (rng, difficulty) => sampleMobius(rng, difficulty > 1, (m) => allDifferent(inverseOptions(m))),
  choices: (m) =>
    optionList(
      inverseOptions(m).map(([top, bottom]) => ({ tex: `f^{-1}(x) = ${ratioTex(top, bottom, 'x')}`, answer: ratioMath(top, bottom, 'x') })),
    ),
  render: (m): Slide => {
    const { a, b, c, d } = m;
    const top = topLin(m);
    const bottom = bottomLin(m);
    const answer = [linTex(top, 'x'), linTex(bottom, 'x')];
    const slips: Lin[] = [
      [d, b],
      [c, a],
      [c, d],
      [a, b],
      [-d, -b],
    ];
    return {
      kind: 'tiles',
      prompt: [
        say('Find $f^{-1}(x)$ as one fraction, collecting the $x$ terms on the left as you rearrange.'),
        show(`f(x) = ${mobiusTex(m, 'x')}`),
      ],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: tileBank(answer, safeSlips(top, bottom, slips, 'x')),
      answer,
    };
  },
  solution: inverseSolution,
};

/** The inverse one line at a time, ending with the answer written in x. */
const inverseSteps: Generator<Mobius> = {
  id: 'af9-inverse-steps',
  sample: (rng, difficulty) => sampleMobius(rng, difficulty > 1),
  render: (m): Slide => {
    const { a, b, c, d } = m;
    const lines = keyLines(m);
    const right = linear(a, b, 'x');
    const named = `f^{-1}(x) = ${inverseTex(m, 'x')}`;
    return {
      kind: 'steps',
      prompt: [
        say(
          'Find $f^{-1}(x)$. Start from $y = f(x)$ and collect the $x$ terms on the left. Tap the part you would do **next**, then choose what it becomes.',
        ),
        show(`f(x) = ${mobiusTex(m, 'x')}`),
      ],
      start: ['y', '=', mobiusTex(m, 'x')],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: lines.expanded,
          bank: stepBank(lines.expanded, `${term(c, 'xy')} ${signed(d)} = ${right}`, `${term(a, 'xy')} ${plusTerm(b, 'y')} = ${linear(c, d, 'x')}`),
        },
        {
          span: [0, 1],
          value: lines.factorised,
          bank: stepBank(lines.factorised, `x(${linear(c, a, 'y')}) = ${lines.top}`, `x(${lines.bottom}) = ${linear(d, b, 'y')}`),
        },
        {
          span: [0, 1],
          value: lines.divided,
          bank: stepBank(lines.divided, `x = ${frac(lines.bottom, lines.top)}`, `x = ${frac(lines.top, term(c, 'y'))} ${signed(a)}`),
        },
        {
          span: [0, 1],
          value: named,
          bank: stepBank(named, `f^{-1}(x) = ${mobiusTex({ a: c, b: d, c: a, d: b }, 'x')}`, `f^{-1}(x) = ${ratioTex(bottomLin(m), topLin(m), 'x')}`),
        },
      ],
    };
  },
  solution: inverseSolution,
};

interface InverseValueParams {
  m: Mobius;
  /** The number the inverse is found at. */
  k: number;
  /** The answer: f(t) = k. */
  t: number;
}

/**
 * f^{-1}(k), typed. Built from the answer: t first, then b chosen so that
 * f(t) = k is whole. Difficulty 2 has numbers in front of the x terms.
 */
const inverseValue: Generator<InverseValueParams> = {
  id: 'af9-inverse-value',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const a = hard ? nonZero(rng, 4) : 1;
      const c = hard ? rng.int(1, 3) : 1;
      if (hard && a === 1 && c === 1) continue;
      const d = nonZero(rng, 7);
      const t = nonZero(rng, 6);
      const k = rng.int(-9, 9);
      if (c * t + d === 0) continue;
      const b = k * (c * t + d) - a * t;
      if (b === 0 || Math.abs(b) > 15 || a * d - b * c === 0 || d === -a) continue;
      return { m: { a, b, c, d }, k, t };
    }
  },
  render: ({ m, k, t }): Slide => ({
    kind: 'expression',
    prompt: [say(`Find $f^{-1}(${k})$.`), show(`f(x) = ${mobiusTex(m, 'x')}`)],
    lead: `f^{-1}(${k}) =`,
    keypad: [],
    answer: String(t),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ m, k, t }) => {
    const { a, b, c, d } = m;
    return [
      { text: 'Rearrange $y = f(x)$ for $x$ and write the answer in $x$:' },
      { tex: `f^{-1}(x) = ${inverseTex(m, 'x')}` },
      { text: `Put $x = ${k}$ in: the top is $${b - d * k}$ and the bottom is $${c * k - a}$.` },
      { tex: `f^{-1}(${k}) = ${frac(String(b - d * k), String(c * k - a))} = ${t}` },
      { text: `Check: $f(${t}) = ${frac(String(a * t + b), String(c * t + d))} = ${k}$. The inverse undoes $f$.` },
    ];
  },
};

/**
 * The one value f^{-1}(x) is not defined at: where its bottom cx - a is zero,
 * x = a/c, which is also the one value f never takes. Built with a a multiple
 * of c so the answer is whole.
 */
const inverseExcluded: Generator<Mobius> = {
  id: 'af9-inverse-excluded',
  sample: (rng, difficulty) => {
    for (;;) {
      const c = difficulty > 1 ? rng.int(2, 4) : 1;
      const a = c * nonZero(rng, 6);
      const b = nonZero(rng, 9);
      const d = nonZero(rng, 9);
      if (a * d - b * c === 0 || d === -a) continue;
      return { a, b, c, d };
    }
  },
  render: (m): Slide => ({
    kind: 'expression',
    prompt: [say('There is one value of $x$ at which $f^{-1}(x)$ is not defined. Find it.'), show(`f(x) = ${mobiusTex(m, 'x')}`)],
    lead: 'x =',
    keypad: [],
    answer: String(m.a / m.c),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (m) => {
    const { a, c } = m;
    return [
      { text: 'Rearranging $y = f(x)$ for $x$ gives the inverse:' },
      { tex: `f^{-1}(x) = ${inverseTex(m, 'x')}` },
      { text: `Its bottom is zero when $${term(c, 'x')} = ${a}$, so it is not defined at $x = ${a / c}$.` },
      { text: `That is also the one value $f$ never reaches: as $x$ grows, $f(x)$ gets closer and closer to $${c === 1 ? a : `${frac(String(a), String(c))} = ${a / c}`}$.` },
    ];
  },
};

interface SelfInverseParams {
  a: number;
  b: number;
  c: number;
}

const selfInverseOptions = ({ a, b, c }: SelfInverseParams): Mobius[] => [
  { a, b, c, d: -a },
  { a, b, c, d: a },
  { a: b, b: a, c, d: -a },
  { a: -a, b, c, d: -a },
];

const asRatio = ({ a, b, c, d }: Mobius): [Lin, Lin] => [
  [a, b],
  [c, d],
];

/**
 * Which is its own inverse? The one whose number on the bottom is minus the
 * number in front of x on top. The others change one number of it.
 */
const selfInverse: Generator<SelfInverseParams> = {
  id: 'af9-self-inverse',
  sample: (rng, difficulty) => {
    for (;;) {
      const a = difficulty > 1 ? nonZero(rng, 6) : rng.int(1, 6);
      const b = nonZero(rng, 9);
      const c = rng.int(1, 4);
      if (b === a || b === -a) continue;
      const all = selfInverseOptions({ a, b, c });
      if (all.some(({ a: p, b: q, c: r, d: s }) => p * s - q * r === 0)) continue;
      if (!allDifferent(all.map(asRatio))) continue;
      return { a, b, c };
    }
  },
  render: (params): Slide =>
    choiceSlide(
      [say('Which of these functions is its own inverse?')],
      optionList(
        selfInverseOptions(params).map((m) => {
          const [top, bottom] = asRatio(m);
          return { tex: ratioTex(top, bottom, 'x'), answer: ratioMath(top, bottom, 'x') };
        }),
      ),
    ),
  solution: (params) => {
    const m = selfInverseOptions(params)[0];
    return [
      { text: 'For $f(x) = \\frac{ax + b}{cx + d}$ the method gives $f^{-1}(x) = \\frac{b - dx}{cx - a}$.' },
      { text: `In $${mobiusTex(m, 'x')}$ the number on the bottom is $${m.d}$, minus the $${m.a}$ in front of $x$ on top. So the inverse is` },
      { tex: `f^{-1}(x) = ${ratioTex([m.a, m.b], [m.c, -m.a], 'x')}` },
      { text: 'which is $f(x)$ again. In each of the others that number is different, so the inverse comes out as a different function.' },
    ];
  },
};

/* ================================================================
 * Lesson 4: sums of reciprocals
 * ================================================================ */

interface RecipSet {
  name: string | null;
  A: string;
  B: string;
  C: string;
  /** 1/A = 1/B - 1/C rather than 1/A = 1/B + 1/C. */
  minus: boolean;
}

const RECIP_PLUS: RecipSet[] = [
  { name: 'The lens formula', A: 'f', B: 'u', C: 'v', minus: false },
  { name: 'Resistors in parallel', A: 'R', B: 'R_1', C: 'R_2', minus: false },
  { name: 'Capacitors in series', A: 'C', B: 'C_1', C: 'C_2', minus: false },
  { name: 'Springs in series', A: 'k', B: 'k_1', C: 'k_2', minus: false },
  { name: 'Inductors in parallel', A: 'L', B: 'L_1', C: 'L_2', minus: false },
  { name: 'The reduced mass of two bodies', A: '\\mu', B: 'm_1', C: 'm_2', minus: false },
  { name: null, A: 'c', B: 'a', C: 'b', minus: false },
  { name: null, A: 'r', B: 'p', C: 'q', minus: false },
  { name: null, A: 'z', B: 'x', C: 'y', minus: false },
  { name: null, A: 'h', B: 'm', C: 'n', minus: false },
  { name: null, A: 'w', B: 's', C: 't', minus: false },
];

const RECIP_MINUS: RecipSet[] = [
  { name: 'The lens formula, in the form some books use', A: 'f', B: 'v', C: 'u', minus: true },
  { name: null, A: 'c', B: 'a', C: 'b', minus: true },
  { name: null, A: 'r', B: 'p', C: 'q', minus: true },
  { name: null, A: 'z', B: 'x', C: 'y', minus: true },
];

const recipFormula = ({ A, B, C, minus }: RecipSet): string =>
  `${frac('1', A)} = ${frac('1', B)} ${minus ? '-' : '+'} ${frac('1', C)}`;

interface RecipParams {
  set: RecipSet;
  subject: Letter;
}

/**
 * The plan for one subject S: 1/S = 1/X +- 1/Y, so S = XY over X + Y, or
 * over Y - X for a minus. The top keeps the formula's own order of letters.
 */
function recipPlan({ set, subject }: RecipParams) {
  const { A, B, C, minus } = set;
  const [X, Y, plus]: [string, string, boolean] =
    subject === 'A' ? [B, C, !minus] : subject === 'B' ? [A, C, minus] : minus ? [B, A, false] : [A, B, false];
  const order = [A, B, C];
  const top = [X, Y].sort((p, q) => order.indexOf(p) - order.indexOf(q)).join(' ');
  const bottom = plus ? `${X} + ${Y}` : `${Y} - ${X}`;
  const wrongBottoms = plus ? [`${X} - ${Y}`, `${Y} - ${X}`] : [`${X} - ${Y}`, `${X} + ${Y}`];
  const S = set[subject];
  const moved = `${frac('1', S)} = ${frac('1', X)} ${plus ? '+' : '-'} ${frac('1', Y)}`;
  const movedSlips = [
    `${frac('1', S)} = ${frac('1', X)} + ${frac('1', Y)}`,
    `${frac('1', S)} = ${frac('1', X)} - ${frac('1', Y)}`,
    `${frac('1', S)} = ${frac('1', Y)} - ${frac('1', X)}`,
  ].filter((line) => line !== moved);
  return { S, X, Y, plus, top, bottom, wrongBottoms, moved, movedSlips, both: `${X} ${plus ? '+' : '-'} ${Y}` };
}

function sampleRecip(rng: Rng, difficulty: number): RecipParams {
  const pool = difficulty > 1 ? [...RECIP_PLUS, ...RECIP_MINUS] : RECIP_PLUS;
  return { set: rng.pick(pool), subject: rng.pick<Letter>(['A', 'B', 'C']) };
}

function recipSolution(params: RecipParams): SolutionStep[] {
  const plan = recipPlan(params);
  const { S, X, Y, top, bottom } = plan;
  const steps: SolutionStep[] = [];
  if (params.subject !== 'A') {
    steps.push({ text: `$${S}$ is one of a pair, so move the other fraction across first. It changes sign as it crosses:` });
    steps.push({ tex: plan.moved });
  }
  steps.push({ text: `Write the right side as one fraction over $${X} ${Y}$, each top times the other bottom:` });
  steps.push({ tex: `${frac('1', S)} = ${frac(bottom, top)}` });
  steps.push({ text: 'Each side is now a single fraction, so turn both sides upside down:' });
  steps.push({ tex: `${S} = ${frac(top, bottom)}` });
  return steps;
}

const recipLead = (set: RecipSet): string => (set.name ? `${set.name}. ` : '');

/**
 * Place the top and bottom of the subject. Its pick-one form offers the
 * bottom's signs the wrong way round, the fraction not turned over, and the
 * classic slip: the bottom alone, R = R_1 + R_2.
 */
const recipPlace: Generator<RecipParams> = {
  id: 'af9-recip-place',
  sample: (rng, difficulty) => sampleRecip(rng, difficulty),
  choices: (params) => {
    const { S, top, bottom, wrongBottoms } = recipPlan(params);
    return options(
      { tex: `${S} = ${frac(top, bottom)}` },
      { tex: `${S} = ${frac(top, wrongBottoms[0])}` },
      { tex: `${S} = ${bottom}` },
      { tex: `${S} = ${frac(bottom, top)}` },
    );
  },
  render: (params): Slide => {
    const { S, top, bottom, wrongBottoms } = recipPlan(params);
    const answer = [top, bottom];
    return {
      kind: 'tiles',
      prompt: [
        say(`${recipLead(params.set)}Make $${S}$ the subject, written as one fraction.`),
        show(recipFormula(params.set)),
      ],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: tileBank(answer, wrongBottoms),
      answer,
    };
  },
  solution: recipSolution,
};

/**
 * The same, one line at a time: move the other fraction across when the
 * subject is one of the pair, combine, turn both sides over.
 */
const recipSteps: Generator<RecipParams> = {
  id: 'af9-recip-steps',
  sample: (rng, difficulty) => sampleRecip(rng, difficulty),
  render: (params): Slide => {
    const { set, subject } = params;
    const plan = recipPlan(params);
    const { S, top, bottom, wrongBottoms, both } = plan;
    const flipped = `${S} = ${frac(top, bottom)}`;
    const flipBank = stepBank(flipped, `${S} = ${frac(bottom, top)}`, `${S} = ${bottom}`);
    const prompt = [say(`${recipLead(set)}Make $${S}$ the subject. Tap the part you would do **next**, then choose what it becomes.`)];
    const start = [frac('1', set.A), '=', frac('1', set.B), set.minus ? '-' : '+', frac('1', set.C)];
    if (subject === 'A') {
      const combined = frac(bottom, top);
      return {
        kind: 'steps',
        prompt,
        start,
        reductions: [
          { span: [2, 5], operator: 3, value: combined, bank: stepBank(combined, frac('1', both), frac(wrongBottoms[0], top)) },
          { span: [0, 3], operator: 1, value: flipped, bank: flipBank },
        ],
      };
    }
    const combined = `${frac('1', S)} = ${frac(bottom, top)}`;
    return {
      kind: 'steps',
      prompt,
      start,
      reductions: [
        { span: [0, 5], operator: 1, value: plan.moved, bank: stepBank(plan.moved, ...plan.movedSlips) },
        {
          span: [0, 1],
          value: combined,
          bank: stepBank(combined, `${frac('1', S)} = ${frac('1', both)}`, `${frac('1', S)} = ${frac(wrongBottoms[0], top)}`),
        },
        { span: [0, 1], value: flipped, bank: flipBank },
      ],
    };
  },
  solution: recipSolution,
};

/** A combined value X and a pair X + e, X + X^2/e: every one of these is whole by construction. */
function reciprocalPair(rng: Rng, max = 60): { X: number; p: number; q: number } {
  for (;;) {
    const X = rng.int(2, 12);
    const splits = Array.from({ length: X * X }, (_, i) => i + 1).filter(
      (e) => (X * X) % e === 0 && X + e <= max && X + (X * X) / e <= max,
    );
    if (splits.length === 0) continue;
    const e = rng.pick(splits);
    return { X, p: X + e, q: X + (X * X) / e };
  }
}

/** Whole-number distractors for a tree or typed slip list, never an answer, a whole number each. */
function wholeBank(answer: number[], slips: number[], avoid: number[] = []): string[] {
  const taken = new Set([...answer, ...avoid]);
  const extras: number[] = [];
  const add = (value: number) => {
    if (!Number.isInteger(value) || taken.has(value) || extras.includes(value)) return;
    extras.push(value);
  };
  slips.forEach(add);
  for (let gap = 1; extras.length < 3; gap += 1) answer.forEach((value) => (add(value + gap), add(value - gap)));
  return [...answer.map(String), ...extras.slice(0, Math.max(3, slips.length)).map(String)].sort();
}

interface ParallelParams {
  lens: boolean;
  X: number;
  p: number;
  q: number;
}

/**
 * Put numbers into the rearranged formula: the sum and the product of the
 * pair, then the combined value. Difficulty 2 is the lens formula, finding v
 * from f and u: v = uf/(u - f).
 */
const parallelTree: Generator<ParallelParams> = {
  id: 'af9-parallel-tree',
  sample: (rng, difficulty) => {
    const { X, p, q } = reciprocalPair(rng);
    if (difficulty > 1) return { lens: true, X, p, q };
    return rng.chance(0.5) ? { lens: false, X, p, q } : { lens: false, X, p: q, q: p };
  },
  render: ({ lens, X, p, q }): Slide => {
    if (lens) {
      const answer = [p - X, p * X, q];
      return {
        kind: 'tree',
        prompt: [
          say(`The lens formula, with $f = ${X}$ and $u = ${p}$. Top row: $u - f$, then $f u$. Below: $v$.`),
        ],
        expression: `v = ${frac('f u', 'u - f')}`,
        nodes: [
          { id: 'less', from: [] },
          { id: 'product', from: [] },
          { id: 'v', from: ['less', 'product'] },
        ],
        bank: wholeBank(answer, [p + X, p * X / (p + X), q + X, p - q]),
        answer: answer.map(String),
      };
    }
    const answer = [p + q, p * q, X];
    return {
      kind: 'tree',
      prompt: [say(`Resistors in parallel, with $R_1 = ${p}$ and $R_2 = ${q}$. Top row: $R_1 + R_2$, then $R_1 R_2$. Below: $R$.`)],
      expression: `R = ${frac('R_1 R_2', 'R_1 + R_2')}`,
      nodes: [
        { id: 'sum', from: [] },
        { id: 'product', from: [] },
        { id: 'R', from: ['sum', 'product'] },
      ],
      bank: wholeBank(answer, [Math.abs(p - q), (p * q) / 2, p + q - X]),
      answer: answer.map(String),
    };
  },
  solution: ({ lens, X, p, q }) => {
    if (lens) {
      return [
        { text: 'Rearranged for $v$, the lens formula is $v = \\frac{fu}{u - f}$.' },
        { tex: chain(`&u - f = ${p} - ${X} = ${p - X}`, `&f u = ${X} \\times ${p} = ${p * X}`) },
        { tex: `v = ${frac(String(p * X), String(p - X))} = ${q}` },
      ];
    }
    return [
      { text: 'Rearranged for $R$, the formula is $R = \\frac{R_1 R_2}{R_1 + R_2}$.' },
      { tex: chain(`&R_1 + R_2 = ${p} + ${q} = ${p + q}`, `&R_1 R_2 = ${p} \\times ${q} = ${p * q}`) },
      { tex: `R = ${frac(String(p * q), String(p + q))} = ${X}` },
    ];
  },
};

const RECIP_CONTEXTS: RecipSet[] = RECIP_PLUS.slice(0, 4);

interface RecipValueParams {
  set: RecipSet;
  X: number;
  /** The one of the pair that is given. */
  known: number;
  /** The one to find. */
  value: number;
  /** Which of the pair is asked for. */
  ask: 'B' | 'C';
}

/**
 * One of the pair from the combined value and the other: R_2 = RR_1/(R_1 - R).
 * Difficulty 1 is resistors, capacitors or springs; difficulty 2 the lens
 * formula.
 */
const recipValue: Generator<RecipValueParams> = {
  id: 'af9-recip-value',
  sample: (rng, difficulty) => {
    const set = difficulty > 1 ? RECIP_CONTEXTS[0] : rng.pick(RECIP_CONTEXTS.slice(1));
    const { X, p, q } = reciprocalPair(rng);
    const ask = rng.pick<'B' | 'C'>(['B', 'C']);
    return rng.chance(0.5) ? { set, X, known: p, value: q, ask } : { set, X, known: q, value: p, ask };
  },
  render: ({ set, X, known, ask }): Slide => {
    const unknown = set[ask];
    const given = set[ask === 'B' ? 'C' : 'B'];
    return {
      kind: 'expression',
      prompt: [say(`${recipLead(set)}$${set.A} = ${X}$ and $${given} = ${known}$. Find $${unknown}$.`), show(recipFormula(set))],
      lead: `${unknown} =`,
      keypad: [],
      answer: String(knownToValue(X, known)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ set, X, known, value, ask }) => {
    const unknown = set[ask];
    const given = set[ask === 'B' ? 'C' : 'B'];
    return [
      { text: `Rearrange first. Move $${frac('1', given)}$ across, combine, and turn both sides over:` },
      { tex: chain(`&${frac('1', unknown)} = ${frac('1', set.A)} - ${frac('1', given)}`, `&${unknown} = ${frac(`${set.A} ${given}`, `${given} - ${set.A}`)}`) },
      { text: 'Then substitute:' },
      { tex: `${unknown} = ${frac(`${X} \\times ${known}`, `${known} - ${X}`)} = ${frac(String(X * known), String(known - X))} = ${value}` },
    ];
  },
};

/** The other of a pair: X k/(k - X). */
const knownToValue = (X: number, known: number): number => (X * known) / (known - X);

/* ================================================================
 * Lesson 5: rearrange, then substitute; spot the slip
 * ================================================================ */

type SubKind = 'emf-r' | 'emf-R' | 'accel-t' | 'accel-u' | 'lens-u' | 'lens-f' | 'suvat-t' | 'suvat-v';

interface SubParams {
  kind: SubKind;
  /** Every letter of the formula, the answer included. */
  v: Record<string, number>;
}

interface SubPlan {
  formula: string;
  given: string[];
  unknown: string;
  rearranged: string;
  substituted: string;
}

function subPlan({ kind, v }: SubParams): SubPlan {
  switch (kind) {
    case 'emf-r':
      return {
        formula: `I = ${frac('V', 'R + r')}`,
        given: ['V', 'I', 'R'],
        unknown: 'r',
        rearranged: `r = ${frac('V', 'I')} - R`,
        substituted: `r = ${frac(String(v.V), String(v.I))} - ${v.R}`,
      };
    case 'emf-R':
      return {
        formula: `I = ${frac('V', 'R + r')}`,
        given: ['V', 'I', 'r'],
        unknown: 'R',
        rearranged: `R = ${frac('V', 'I')} - r`,
        substituted: `R = ${frac(String(v.V), String(v.I))} - ${v.r}`,
      };
    case 'accel-t':
      return {
        formula: `a = ${frac('v - u', 't')}`,
        given: ['a', 'v', 'u'],
        unknown: 't',
        rearranged: `t = ${frac('v - u', 'a')}`,
        substituted: `t = ${frac(`${v.v} - ${v.u}`, String(v.a))}`,
      };
    case 'accel-u':
      return {
        formula: `a = ${frac('v - u', 't')}`,
        given: ['a', 'v', 't'],
        unknown: 'u',
        rearranged: 'u = v - at',
        substituted: `u = ${v.v} - ${v.a} \\times ${v.t}`,
      };
    case 'lens-u':
      return {
        formula: `${frac('1', 'f')} = ${frac('1', 'u')} + ${frac('1', 'v')}`,
        given: ['f', 'v'],
        unknown: 'u',
        rearranged: `u = ${frac('f v', 'v - f')}`,
        substituted: `u = ${frac(`${v.f} \\times ${v.v}`, `${v.v} - ${v.f}`)}`,
      };
    case 'lens-f':
      return {
        formula: `${frac('1', 'f')} = ${frac('1', 'u')} + ${frac('1', 'v')}`,
        given: ['u', 'v'],
        unknown: 'f',
        rearranged: `f = ${frac('u v', 'u + v')}`,
        substituted: `f = ${frac(`${v.u} \\times ${v.v}`, `${v.u} + ${v.v}`)}`,
      };
    case 'suvat-t':
      return {
        formula: `s = ${frac('(u + v)t', '2')}`,
        given: ['s', 'u', 'v'],
        unknown: 't',
        rearranged: `t = ${frac('2s', 'u + v')}`,
        substituted: `t = ${frac(`2 \\times ${v.s}`, `${v.u} + ${v.v}`)}`,
      };
    case 'suvat-v':
      return {
        formula: `s = ${frac('(u + v)t', '2')}`,
        given: ['s', 'u', 't'],
        unknown: 'v',
        rearranged: `v = ${frac('2s', 't')} - u`,
        substituted: `v = ${frac(`2 \\times ${v.s}`, String(v.t))} - ${v.u}`,
      };
  }
}

/** "a, b and c" from a list. */
function listed(parts: string[]): string {
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * Rearrange a physics formula, then put the numbers in: typed, whole. Difficulty
 * 1 is I = V/(R + r) and a = (v - u)/t; difficulty 2 the lens formula and
 * s = (u + v)t/2.
 */
const subValue: Generator<SubParams> = {
  id: 'af9-sub-value',
  sample: (rng, difficulty): SubParams => {
    if (difficulty > 1) {
      const kind = rng.pick<SubKind>(['lens-u', 'lens-f', 'suvat-t', 'suvat-v']);
      if (kind === 'lens-u' || kind === 'lens-f') {
        const { X, p, q } = reciprocalPair(rng);
        const [u, v] = rng.chance(0.5) ? [p, q] : [q, p];
        return { kind, v: { f: X, u, v } };
      }
      for (;;) {
        const u = rng.int(0, 12);
        const v = u + rng.int(1, 15);
        const t = rng.int(2, 10);
        if (((u + v) * t) % 2 !== 0) continue;
        return { kind, v: { s: ((u + v) * t) / 2, u, v, t } };
      }
    }
    const kind = rng.pick<SubKind>(['emf-r', 'emf-R', 'accel-t', 'accel-u']);
    if (kind === 'emf-r' || kind === 'emf-R') {
      const I = rng.int(2, 6);
      const R = rng.int(2, 12);
      const r = rng.int(1, 8);
      return { kind, v: { I, R, r, V: I * (R + r) } };
    }
    const a = rng.int(2, 9);
    const t = rng.int(2, 9);
    const u = rng.int(0, 15);
    return { kind, v: { a, t, u, v: u + a * t } };
  },
  render: (params): Slide => {
    const plan = subPlan(params);
    const givens = listed(plan.given.map((letter) => `$${letter} = ${params.v[letter]}$`));
    return {
      kind: 'expression',
      prompt: [say(`Find $${plan.unknown}$ when ${givens}.`), show(plan.formula)],
      lead: `${plan.unknown} =`,
      keypad: [],
      answer: String(params.v[plan.unknown]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const plan = subPlan(params);
    return [
      { text: `Rearrange for $${plan.unknown}$ first:` },
      { tex: plan.rearranged },
      { text: 'Then substitute:' },
      { tex: `${plan.substituted} = ${params.v[plan.unknown]}` },
    ];
  },
};

interface SubTreeParams {
  m: Mobius;
  /** The value y takes. */
  Y: number;
  /** The x it gives: the answer. */
  x: number;
}

/**
 * Rearrange y = (ax + b)/(cx + d) for x, then put a number in for y: the top,
 * the bottom, then x. Built from x: b is chosen so that y is whole there.
 */
const subTree: Generator<SubTreeParams> = {
  id: 'af9-sub-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const a = hard ? nonZero(rng, 4) : 1;
      const c = hard ? rng.int(1, 3) : 1;
      if (hard && a === 1 && c === 1) continue;
      const d = nonZero(rng, 8);
      const x = nonZero(rng, 6);
      const Y = nonZero(rng, 6);
      if (c * x + d === 0) continue;
      const b = Y * (c * x + d) - a * x;
      if (b === 0 || Math.abs(b) > 15 || a * d - b * c === 0 || d === -a) continue;
      if (Math.abs(c * Y - a) < 2) continue;
      return { m: { a, b, c, d }, Y, x };
    }
  },
  render: ({ m, Y, x }): Slide => {
    const { a, b, c, d } = m;
    const top = b - d * Y;
    const bottom = c * Y - a;
    const answer = [top, bottom, x];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Make $x$ the subject, collecting the $x$ terms on the left, then put $y = ${Y}$ in. Top row: the top of the fraction for $x$, then its bottom, as numbers. Below: $x$.`,
        ),
      ],
      expression: `y = ${mobiusTex(m, 'x')}`,
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'x', from: ['top', 'bottom'] },
      ],
      bank: wholeBank(answer, [b + d * Y, c * Y + a, -x, a * Y + b], [-top, -bottom]),
      answer: answer.map(String),
    };
  },
  solution: ({ m, Y, x }) => {
    const { a, b, c, d } = m;
    const lines = keyLines(m);
    return [
      { text: 'Rearrange first, collecting the $x$ terms on the left:' },
      { tex: chain(`&${lines.factorised}`, `&${lines.divided}`) },
      { text: `Then put $y = ${Y}$ in: the top is $${b - d * Y}$ and the bottom is $${c * Y - a}$.` },
      { tex: `x = ${frac(String(b - d * Y), String(c * Y - a))} = ${x}` },
    ];
  },
};

interface SlipParams {
  m: Mobius;
  /** The first wrong line, 1 to 4, or 0 when every line is right. */
  slip: number;
  /** Which of two slips line 2 makes. */
  variant: number;
}

/**
 * An attempt at the key method in four lines, one of them wrong and every
 * line after it carried on correctly from the wrong one:
 * (1) multiply up and out, (2) collect x on the left, (3) factorise, (4) divide.
 */
function slipLines({ m, slip, variant }: SlipParams): string[] {
  const { a, b, c, d } = m;
  // Line 1: cxy + Qy + R0 = ax + b. The slip forgets to multiply d by y.
  const Q = slip === 1 ? 0 : d;
  const R0 = slip === 1 ? d : 0;
  const line1 = `${term(c, 'xy')} ${Q !== 0 ? plusTerm(Q, 'y') : signed(R0)} = ${linear(a, b, 'x')}`;
  // Line 2: cxy - Sx = (b - R0) - Q'y. The slips forget to change a sign.
  const S = slip === 2 && variant === 0 ? -a : a;
  const Qr = slip === 2 && variant === 1 ? -Q : Q;
  const rhs = linear(-Qr, b - R0, 'y');
  const line2 = `${term(c, 'xy')} ${plusTerm(-S, 'x')} = ${rhs}`;
  // Line 3: take x out. The slip gets the bracket's sign wrong.
  const bracket = linear(c, slip === 3 ? S : -S, 'y');
  const line3 = `x(${bracket}) = ${rhs}`;
  // Line 4: divide. The slip turns the fraction over.
  const line4 = slip === 4 ? `x = ${frac(bracket, rhs)}` : `x = ${frac(rhs, bracket)}`;
  return [line1, line2, line3, line4];
}

/** Two wrong ways to write line k, from right lines above it. */
function slipsAt(m: Mobius, k: number): string[] {
  if (k === 1) {
    return [slipLines({ m, slip: 1, variant: 0 })[0], `${term(m.c, 'xy')} ${plusTerm(-m.d, 'y')} = ${linear(m.a, m.b, 'x')}`];
  }
  if (k === 2) return [slipLines({ m, slip: 2, variant: 0 })[1], slipLines({ m, slip: 2, variant: 1 })[1]];
  const lines = keyLines(m);
  if (k === 3) return [slipLines({ m, slip: 3, variant: 0 })[2], `x(${lines.bottom}) = ${linear(m.d, m.b, 'y')}`];
  return [slipLines({ m, slip: 4, variant: 0 })[3], `x = ${frac(lines.top, term(m.c, 'y'))} ${signed(m.a)}`];
}

function sampleSlip(rng: Rng, hard: boolean, allowNone: boolean): SlipParams {
  for (;;) {
    const m = sampleMobius(rng, hard);
    const slip = allowNone && rng.chance(0.2) ? 0 : rng.int(1, 4);
    if (slip === 1 && m.b === m.d) continue;
    return { m, slip, variant: rng.int(0, 1) };
  }
}

function slipSolution(params: SlipParams): SolutionStep[] {
  const { m, slip } = params;
  const right = slipLines({ m, slip: 0, variant: 0 });
  const why = [
    '',
    `Line (1) multiplies both sides by $${linear(m.c, m.d, 'x')}$, and every term of that bracket has to be multiplied by $y$, the $${m.d}$ included.`,
    'Line (2) moves terms across the equals sign, and each one has to change sign as it crosses.',
    'Line (3) takes $x$ out of both terms on the left, and what is left in the bracket has to multiply back to them, signs and all.',
    'Line (4) divides both sides by the bracket, so the bracket goes on the bottom.',
  ];
  const steps: SolutionStep[] = [{ text: 'The right working, line by line:' }, { tex: numberedLines(right) }];
  if (slip === 0) steps.push({ text: 'Every line of the attempt matches, so every line is right.' });
  else steps.push({ text: `The attempt first differs at line (${slip}). ${why[slip]}` });
  return steps;
}

/** Which line is the first wrong one? Four lines, one slip, the rest carried on from it. */
const slipLine: Generator<SlipParams> = {
  id: 'af9-slip-line',
  sample: (rng, difficulty) => sampleSlip(rng, difficulty > 1, false),
  render: (params): Slide => ({
    kind: 'choice',
    prompt: [
      say('This is an attempt to make $x$ the subject, collecting the $x$ terms on the left. Which is the first line with a mistake in it?'),
      show(`y = ${mobiusTex(params.m, 'x')}`),
      show(numberedLines(slipLines(params))),
    ],
    options: [1, 2, 3, 4].map((line, idx) => ({ id: `opt${idx}`, label: `\\text{Line (${line})}`, tex: true })),
    correctId: `opt${params.slip - 1}`,
  }),
  solution: slipSolution,
};

/**
 * Check an attempt line by line, and put the first wrong line right. Now and
 * then every line is right.
 */
const slipFlow: Generator<SlipParams> = {
  id: 'af9-slip-flow',
  sample: (rng, difficulty) => sampleSlip(rng, difficulty > 1, true),
  render: (params): Slide => {
    const { m, slip } = params;
    const shown = slipLines(params);
    const right = slipLines({ m, slip: 0, variant: 0 });
    const key = shown.join('|');
    const checks = [1, 2, 3, 4].map((k) => ({
      id: `check${k}`,
      ask: k === 1 ? 'Does line (1) follow from the equation above it?' : `Does line (${k}) follow from line (${k - 1})?`,
      branches: [
        k < 4 ? { label: 'Yes', to: `check${k + 1}` } : { label: 'Yes', outcome: 'Then every line is right, and so is the answer.' },
        { label: 'No', to: `fix${k}` },
      ],
    }));
    const fixes = [1, 2, 3, 4].map((k) => ({
      id: `fix${k}`,
      ask: `What should line (${k}) be?`,
      branches: turned([...new Set([right[k - 1], ...slipsAt(m, k)])], `${key}|${k}`).map((line) => ({
        label: `$${line}$`,
        outcome: `So line (${k}) should read $${line}$, and every line after it has to be redone.`,
      })),
    }));
    const answer = slip === 0 ? ['Yes', 'Yes', 'Yes', 'Yes'] : [...Array<string>(slip - 1).fill('Yes'), 'No', `$${right[slip - 1]}$`];
    return {
      kind: 'flow',
      prompt: [
        say('This is an attempt to make $x$ the subject, collecting the $x$ terms on the left. Check it one line at a time.'),
        show(numberedLines(shown)),
      ],
      subject: `y = ${mobiusTex(m, 'x')}`,
      steps: [...checks, ...fixes],
      answer,
    };
  },
  solution: slipSolution,
};

export const fractionsLevel9Generators = [
  bottomLetters,
  bottomSteps,
  bottomPlace,
  bottomPlan,
  twiceSteps,
  twicePlace,
  factorTree,
  twiceEqual,
  inversePlace,
  inverseSteps,
  inverseValue,
  inverseExcluded,
  selfInverse,
  recipPlace,
  recipSteps,
  parallelTree,
  recipValue,
  subValue,
  subTree,
  slipLine,
  slipFlow,
];
