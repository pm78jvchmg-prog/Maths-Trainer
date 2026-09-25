/**
 * Functions: notation, domain and range, composition and inverses.
 *
 * Roadmap batch C2, the first level of the Functions & Transformations course.
 * The second level moves graphs about with the `transform` widget; its
 * generators that ask for a curve live in `transformGraph.ts` beside the
 * widget's own demonstrations, and the ones asked through other widgets are
 * at the bottom of this file. Levels 3 and 4 follow, then level 5, the
 * transformations of $y = a\sin(bx + c) + d$, and level 6, functions in
 * modelling, is last; each of those two sections opens with its own rules.
 *
 * **Forms are asked through tiles, flows, steps and choices; values are
 * typed.** The checker compares values, so a typed `fg(x)` accepts `f(g(x))`
 * copied back out unsimplified, and "write the inverse" accepts anything equal
 * to it. Where the answer is a number — `f(4)`, `fg(2)`, `f^{-1}(5)` — typing
 * it is the honest question. A domain or a range is a set, never an
 * expression, so it is placed, dragged or chosen and never typed.
 *
 * Rules inherited from the rest of the library: a tiles template is split on
 * `{n}` and each piece rendered alone, so no braces round a digit and no
 * `\left`/`\right` spanning a blank; every value inside a `reduce` tree is
 * whole, banks included; and a `tree` bank keeps at least two distractors
 * once the answers are taken out.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { markerWindow, plotSvg } from '../figures';
import { options } from '../choiceVariant';
import { bankFor, bin, num, pow, type Expr } from '../expr';
import { sumTex, termTex } from './calculus';
import { bankOf, numberTile, offer, signedTile } from './quadratics';
import { negatedTex } from './format';

/* ---------- Formatting ---------- */

/** ax + b as the learner reads it: `3x + 4`, `-x - 2`, `5x`, `7`. */
function linTex(a: number, b: number, v = 'x'): string {
  const tex = sumTex([termTex(a, 1), termTex(b, 0)]);
  return (tex === '' ? '0' : tex).replace('x', v);
}

/** Two rules stacked, so neither runs off a phone screen. */
function pairTex(f: string, g: string): string {
  return `\\begin{aligned} f(x) &= ${f} \\\\ g(x) &= ${g} \\end{aligned}`;
}

/** A number bracketed when negative, for a substitution written out. */
function br(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** A term in a named letter: `3a^{2}`, `-a`, `4`. */
function letterTerm(coefficient: number, power: number, v: string): string {
  return termTex(coefficient, power).replace('x', v);
}

/** A polynomial in one letter, highest power first, from its coefficients. */
function polyTex(coefficients: [number, number][], v = 'x'): string {
  const tex = sumTex(coefficients.map(([c, p]) => letterTerm(c, p, v)));
  return tex === '' ? '0' : tex;
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const nonZeroRange = (from: number, to: number): number[] =>
  range(from, to).filter((value) => value !== 0);

/** Four whole-number options, the correct one flagged. */
function numberChoices(correct: number, ...near: number[]): ChoiceOption[] {
  return options(
    { tex: `${correct}`, answer: `${correct}` },
    ...offer(correct, ...near)
      .filter((value) => Number(value) !== correct)
      .map((value) => ({ tex: value, answer: value })),
  );
}

/** A steps bank: the value, then distinct distractors, sorted so order says nothing. */
function stepBank(value: string, ...wrong: string[]): string[] {
  return [...new Set([value, ...wrong])].sort();
}

/**
 * A tree's bank: its answers, then distractors that survive.
 *
 * Distractors built from the question's own numbers collide with the answers
 * far more often than they look like they will, so what is left is topped up
 * from either side of the anchor until three remain.
 */
function treeBank(answer: string[], preferred: number[], anchor: number): string[] {
  const used = new Set(answer);
  const extras: string[] = [];
  const add = (value: number) => {
    const token = `${value}`;
    if (!Number.isInteger(value) || used.has(token) || extras.includes(token)) return;
    extras.push(token);
  };
  preferred.forEach(add);
  for (let gap = 1; extras.length < 3; gap += 1) {
    add(anchor + gap);
    add(anchor - gap);
  }
  return [...answer, ...extras].sort();
}

/** A bank for every node of a reduce tree that is not a bare number, keyed by its path. */
function banksFor(expr: Expr, path = 'r', out: Record<string, string[]> = {}): Record<string, string[]> {
  if (expr.kind === 'binary') {
    out[path] = bankFor(expr);
    banksFor(expr.left, `${path}.l`, out);
    banksFor(expr.right, `${path}.r`, out);
  } else if (expr.kind === 'power') {
    out[path] = bankFor(expr);
    banksFor(expr.base, `${path}.b`, out);
    banksFor(expr.exponent, `${path}.e`, out);
  }
  return out;
}

/** `left + n` or `left - n`, whichever reads naturally for the sign of n. */
function plus(left: Expr, n: number): Expr {
  return n < 0 ? bin('-', left, num(-n)) : bin('+', left, num(n));
}

/** Draw until `accept` holds, falling back to a fixed draw that passes. */
function drawUntil<P>(draw: () => P, accept: (params: P) => boolean, fallback: P): P {
  for (let tries = 0; tries < 200; tries += 1) {
    const params = draw();
    if (accept(params)) return params;
  }
  return fallback;
}

const HOW_TO_REDUCE = 'Tap the part you would do **next**, then choose what it comes to.';
const HOW_TO_STEP = 'Tap the line, then choose what it becomes after the **next** step.';

/** Keys for an answer in the letter a. */
const LETTER_KEYS: KeypadKey[] = [
  { insert: 'a', tex: true },
  { insert: '^' },
  { insert: '(' },
  { insert: ')' },
  { insert: '*', label: '×' },
];

/* ======================================================================
 * Level 1: Functions
 * ==================================================================== */

/* ---------- Lesson 1: notation and evaluation ---------- */

type RuleForm = 'lin' | 'quad' | 'bracket';

interface EvaluateParams {
  form: RuleForm;
  a: number;
  b: number;
  k: number;
}

/** The rule, as the learner reads it after `f(x) =`. */
function ruleTex({ form, a, b }: EvaluateParams): string {
  if (form === 'lin') return linTex(a, b);
  if (form === 'quad') return polyTex([[a, 2], [b, 0]]);
  return `${a === 1 ? '' : a === -1 ? '-' : a}(x ${signedTile(b)})^2`;
}

function ruleAt({ form, a, b }: EvaluateParams, x: number): number {
  if (form === 'lin') return a * x + b;
  if (form === 'quad') return a * x * x + b;
  return a * (x + b) * (x + b);
}

/** The rule with k written in place of x, as a tree to reduce. */
function ruleExpr({ form, a, b, k }: EvaluateParams): Expr {
  if (form === 'lin') return plus(bin('*', num(a), num(k)), b);
  if (form === 'quad') return plus(bin('*', num(a), pow(num(k), num(2))), b);
  return bin('*', num(a), pow(plus(num(k), b), num(2)));
}

/** The substitution written out, for the worked solution. */
function substitutedTex({ form, a, b, k }: EvaluateParams): string {
  if (form === 'lin') return `${a} \\times ${br(k)} ${signedTile(b)}`;
  if (form === 'quad') return `${a} \\times ${br(k)}^2 ${signedTile(b)}`;
  return `${a} \\times (${k} ${signedTile(b)})^2`;
}

/**
 * Evaluating a function: put the number in wherever $x$ was.
 *
 * Asked as a reduction because what goes wrong is order — $2 \times 3^2$ is
 * $18$, not $36$ — and a negative input squared, which difficulty 2 brings.
 */
const evaluate: Generator<EvaluateParams> = {
  id: 'fun-evaluate',
  choices: (params) => {
    const { form, a, b, k } = params;
    const v = ruleAt(params, k);
    if (form === 'lin') return numberChoices(v, a + k + b, a * k - b, a * (k + b));
    if (form === 'quad') return numberChoices(v, a * 2 * k + b, (a * k) ** 2 + b, -a * k * k + b);
    return numberChoices(v, a * (k * k + b * b), (a * (k + b)) ** 2, a * 2 * (k + b));
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(hard ? (['quad', 'bracket', 'bracket'] as const) : (['lin', 'quad'] as const));
    const a = form === 'lin' ? rng.int(2, 9) : hard ? rng.pick([-3, -2, 2, 3, 4]) : rng.int(2, 5);
    const b = form === 'bracket' ? rng.pick(nonZeroRange(-5, 5)) : rng.pick(nonZeroRange(-12, 12));
    const k = hard ? rng.pick(nonZeroRange(-5, 5)) : rng.int(1, form === 'lin' ? 9 : 5);
    return { form, a, b, k };
  },
  render: (params): Slide => {
    const expr = ruleExpr(params);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `$f(x) = ${ruleTex(params)}$. Find $f(${params.k})$: it is the rule with $${params.k}$ written in place of $x$. ${HOW_TO_REDUCE}`,
        },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: (params) => {
    const { form, k } = params;
    return [
      { text: `Write $${k}$ in place of every $x$ in $f(x) = ${ruleTex(params)}$.` },
      { tex: `f(${k}) = ${substitutedTex(params)}` },
      {
        text:
          form === 'lin'
            ? 'Multiply before adding.'
            : form === 'quad'
              ? `Square first${k < 0 ? ` — a negative number squared is positive, so $(${k})^2 = ${k * k}$` : ''}, then multiply, then add.`
              : 'The bracket first, then square it, then multiply.',
      },
      { tex: `f(${k}) = ${ruleAt(params, k)}` },
    ];
  },
};

type InnerForm = 'a' | 'ka' | 'a+p' | 'a2' | 'neg' | 'ka+p';

interface SubstituteParams {
  outer: 'lin' | 'quad';
  a: number;
  b: number;
  inner: InnerForm;
  p: number;
}

/** What goes in the bracket: `a`, `3a`, `a + 2`, `a^{2}`, `-a`. */
function innerTex({ inner, p }: SubstituteParams): string {
  if (inner === 'a') return 'a';
  if (inner === 'ka') return `${p}a`;
  if (inner === 'a+p') return `a ${signedTile(p)}`;
  if (inner === 'a2') return 'a^2';
  if (inner === 'neg') return '-a';
  return `2a ${signedTile(p)}`;
}

function innerAnswer({ inner, p }: SubstituteParams): string {
  if (inner === 'a') return 'a';
  if (inner === 'ka') return `(${p})*a`;
  if (inner === 'a+p') return `a + (${p})`;
  if (inner === 'a2') return 'a^2';
  if (inner === 'neg') return '-a';
  return `2*a + (${p})`;
}

/** The inside as a polynomial in a, as [coefficient, power] pairs. */
function innerPoly({ inner, p }: SubstituteParams): [number, number][] {
  if (inner === 'a') return [[1, 1]];
  if (inner === 'ka') return [[p, 1]];
  if (inner === 'a+p') return [[1, 1], [p, 0]];
  if (inner === 'a2') return [[1, 2]];
  if (inner === 'neg') return [[-1, 1]];
  return [[2, 1], [p, 0]];
}

/** f of the inside, simplified, as a polynomial in a. */
function substitutedPoly(params: SubstituteParams): [number, number][] {
  const { outer, a, b } = params;
  const inside = innerPoly(params);
  const terms = new Map<number, number>();
  const add = (c: number, power: number) => terms.set(power, (terms.get(power) ?? 0) + c);
  if (outer === 'lin') {
    for (const [c, power] of inside) add(a * c, power);
    add(b, 0);
  } else {
    for (const [c1, p1] of inside) for (const [c2, p2] of inside) add(c1 * c2, p1 + p2);
    add(b, 0);
  }
  return [...terms.entries()]
    .filter(([, c]) => c !== 0)
    .sort((x, y) => y[0] - x[0])
    .map(([power, c]) => [c, power]);
}

function outerTex({ outer, a, b }: SubstituteParams): string {
  return outer === 'lin' ? linTex(a, b) : polyTex([[1, 2], [b, 0]]);
}

/**
 * A letter in, an expression out: $f(a)$, $f(2a)$, $f(a + 3)$.
 *
 * The first time the input is not a number, so the idea has to be the one
 * the lesson teaches — the input replaces every $x$ — rather than arithmetic.
 * Typed, because the answer is a value in $a$ and any correct writing of it is
 * correct; the prompt names $a$ as the letter to answer in.
 */
const substitute: Generator<SubstituteParams> = {
  id: 'fun-substitute',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const outer = hard ? rng.pick(['lin', 'quad'] as const) : 'lin';
    const inner = rng.pick(
      hard ? (['a2', 'neg', 'ka+p', 'a+p'] as const) : (['a', 'ka', 'a+p', 'ka'] as const),
    );
    return {
      outer,
      a: rng.pick(hard ? [-5, -4, -3, -2, 2, 3, 4, 5, 6] : range(2, 9)),
      b: rng.pick(nonZeroRange(-9, 9)),
      inner,
      p: inner === 'ka' ? rng.int(2, 5) : rng.pick(nonZeroRange(-6, 6)),
    };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `$f(x) = ${outerTex(params)}$. Find $f(${innerTex(params)})$, giving your answer in terms of $a$.`,
      },
    ],
    lead: `f(${innerTex(params)}) =`,
    keypad: LETTER_KEYS,
    answer:
      params.outer === 'lin'
        ? `(${params.a})*(${innerAnswer(params)}) + (${params.b})`
        : `(${innerAnswer(params)})^2 + (${params.b})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { outer, a, b } = params;
    const inside = innerTex(params);
    const written =
      outer === 'lin'
        ? `${a}(${inside}) ${signedTile(b)}`
        : `(${inside})^2 ${signedTile(b)}`;
    return [
      { text: `Everywhere $f(x)$ has an $x$, write $(${inside})$ instead — brackets and all.` },
      { tex: `f(${inside}) = ${written}` },
      { text: outer === 'lin' ? 'Multiply out the bracket.' : 'Square the bracket: multiply it by itself.' },
      { tex: `f(${inside}) = ${polyTex(substitutedPoly(params), 'a')}` },
    ];
  },
};

interface SolveParams {
  form: 'lin' | 'bracket' | 'over';
  a: number;
  b: number;
  x: number;
}

function solveRuleTex({ form, a, b }: SolveParams): string {
  if (form === 'lin') return linTex(a, b);
  if (form === 'bracket') return `${a}(x ${signedTile(b)})`;
  return `\\frac{x}{${a}} ${signedTile(b)}`;
}

function solveAt({ form, a, b }: SolveParams, x: number): number {
  if (form === 'lin') return a * x + b;
  if (form === 'bracket') return a * (x + b);
  return x / a + b;
}

/**
 * $f(x) = 10$: which input gives this output?
 *
 * The direction reversed. Evaluating goes input to output; this goes output
 * to input, which is solving an equation — and the slip is to evaluate
 * instead, giving $f(10)$. That slip is the first distractor.
 */
const solve: Generator<SolveParams> = {
  id: 'fun-solve',
  choices: (params) => {
    const { a, b, x } = params;
    const c = solveAt(params, x);
    const plain = Number.isInteger(solveAt(params, c)) ? solveAt(params, c) : c * a;
    return numberChoices(x, plain, c - b, (c + b) / a, -x);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(hard ? (['bracket', 'over', 'lin'] as const) : (['lin', 'lin', 'bracket'] as const));
    const a = rng.pick(hard ? [-4, -3, -2, 2, 3, 4, 5, 6] : range(2, 7));
    const b = rng.pick(nonZeroRange(hard ? -9 : -6, 9));
    const k = hard ? rng.pick(nonZeroRange(-8, 8)) : rng.int(1, 9);
    if (form === 'over') return { form, a: Math.abs(a), b, x: Math.abs(a) * k };
    return { form, a, b, x: k };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `$f(x) = ${solveRuleTex(params)}$. Find the value of $x$ for which $f(x) = ${solveAt(params, params.x)}$.`,
      },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.x}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { form, a, b, x } = params;
    const c = solveAt(params, x);
    const middle =
      form === 'lin'
        ? { tex: `${termTex(a, 1)} = ${c - b}` }
        : form === 'bracket'
          ? { tex: `x ${signedTile(b)} = ${c / a}` }
          : { tex: `\\frac{x}{${a}} = ${c - b}` };
    return [
      { text: `$f(x) = ${c}$ is an equation: the rule equals $${c}$. It asks for an input, not an output.` },
      { tex: `${solveRuleTex(params)} = ${c}` },
      middle,
      { tex: `x = ${x}` },
      { text: `Check: $f(${x}) = ${c}$.` },
    ];
  },
};

interface MachineParams {
  form: 'sq' | 'bracket' | 'over';
  a: number;
  b: number;
  k: number;
}

function machineRuleTex({ form, a, b }: MachineParams): string {
  if (form === 'sq') return polyTex([[a, 2], [b, 0]]);
  if (form === 'bracket') return `${a}(x ${signedTile(b)})`;
  return `\\frac{x^2 ${signedTile(b)}}{${a}}`;
}

/** The three values the tree passes through, in node order. */
function machineValues({ form, a, b, k }: MachineParams): number[] {
  if (form === 'sq') return [k * k, a * k * k, a * k * k + b];
  if (form === 'bracket') return [k + b, a * (k + b), a * (k + b)];
  return [k * k, k * k + b, (k * k + b) / a];
}

/**
 * A function as a machine: the input passes through each operation in turn.
 *
 * Filled as a tree so every intermediate value is written down — the square,
 * then the multiple, then the answer — which is what evaluating by hand
 * actually is. The bracket form multiplies last; the fraction form divides
 * last, and at difficulty 2 the input is negative.
 */
const machineTree: Generator<MachineParams> = {
  id: 'fun-machine-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(hard ? (['sq', 'over', 'over'] as const) : (['sq', 'bracket'] as const));
    const k = hard ? rng.pick(nonZeroRange(-6, 6)) : rng.int(1, 6);
    if (form === 'over') {
      const a = rng.int(2, 5);
      // The top must divide exactly: choose the quotient, then the constant.
      const q = rng.int(1, 12);
      const b = a * q - k * k;
      return { form, a, b: b === 0 ? b + a : b, k };
    }
    if (form === 'bracket') return { form, a: rng.int(2, 9), b: rng.pick(nonZeroRange(-6, 9)), k };
    return { form, a: rng.pick(hard ? [-3, -2, 2, 3, 4, 5] : range(2, 5)), b: rng.pick(nonZeroRange(-12, 12)), k };
  },
  render: (params): Slide => {
    const { form, k } = params;
    const values = machineValues(params);
    const answer = form === 'bracket' ? [`${values[0]}`, `${values[1]}`] : values.map(String);
    const nodes =
      form === 'sq'
        ? [
            { id: 'square', from: [] },
            { id: 'times', from: ['square'] },
            { id: 'result', from: ['times'] },
          ]
        : form === 'bracket'
          ? [
              { id: 'inside', from: [] },
              { id: 'result', from: ['inside'] },
            ]
          : [
              { id: 'square', from: [] },
              { id: 'top', from: ['square'] },
              { id: 'result', from: ['top'] },
            ];
    const order =
      form === 'sq'
        ? 'square it, multiply, then add'
        : form === 'bracket'
          ? 'the bracket, then multiply'
          : 'square it, then the top, then divide';
    const last = values[values.length - 1];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `$f(x) = ${machineRuleTex(params)}$. Put $${k}$ through the rule one operation at a time — ${order} — and fill each value in.`,
        },
      ],
      expression: `f(${k})`,
      nodes,
      bank: treeBank(answer, [2 * k, k * k + 1, -last, values[0] * 2, last + 1], last),
      answer,
    };
  },
  solution: (params) => {
    const { form, a, b, k } = params;
    const [first, second, third] = machineValues(params);
    if (form === 'sq') {
      return [
        { text: `Square first: $${br(k)}^2 = ${first}$.` },
        { text: `Multiply by $${a}$: $${second}$.` },
        { text: `${b > 0 ? 'Add' : 'Take away'} $${Math.abs(b)}$: $f(${k}) = ${third}$.` },
      ];
    }
    if (form === 'bracket') {
      return [
        { text: `The bracket first: $${k} ${signedTile(b)} = ${first}$.` },
        { text: `Multiply by $${a}$: $f(${k}) = ${second}$.` },
      ];
    }
    return [
      { text: `Square first: $${br(k)}^2 = ${first}$.` },
      { text: `The top: $${first} ${signedTile(b)} = ${second}$.` },
      { text: `Divide by $${a}$: $f(${k}) = ${third}$.` },
    ];
  },
};

/* ---------- Lesson 2: domain and range ---------- */

type DomainRule = 'root' | 'rootBack' | 'recip' | 'recipSquare' | 'poly';

interface DomainFlowParams {
  rule: DomainRule;
  a: number;
  v: number;
}

function domainRuleTex({ rule, a }: { rule: DomainRule; a: number }): string {
  if (rule === 'root') return `\\sqrt{x ${signedTile(-a)}}`;
  if (rule === 'rootBack') return `\\sqrt{${a} - x}`;
  if (rule === 'recip') return `\\frac{1}{x ${signedTile(-a)}}`;
  if (rule === 'recipSquare') return `\\frac{1}{x^2 - ${a * a}}`;
  return `x^2 ${signedTile(-a)}`;
}

/** Whether v is in the domain of the rule. */
function allowed({ rule, a, v }: DomainFlowParams): boolean {
  if (rule === 'root') return v - a >= 0;
  if (rule === 'rootBack') return a - v >= 0;
  if (rule === 'recip') return v !== a;
  if (rule === 'recipSquare') return v * v !== a * a;
  return true;
}

const RISK_ROOT = 'A square root of a negative number';
const RISK_ZERO = 'Dividing by zero';
const RISK_NONE = 'Nothing: every number works';
const FLOW_YES = 'Yes';
const FLOW_NO = 'No';

/**
 * Is this value in the domain?
 *
 * Two things stop a rule giving an answer at this level: the square root of
 * a negative, and a division by zero. The walk names which risk the rule
 * carries before testing the value, so the learner reads the rule rather than
 * trying the number and hoping. Difficulty 2 brings $\sqrt{a - x}$, which
 * runs the other way, and $x^2 - a^2$ on the bottom, which is zero twice.
 */
const domainFlow: Generator<DomainFlowParams> = {
  id: 'fun-domain-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const rule = rng.pick(
      hard ? (['rootBack', 'recipSquare', 'root', 'recip'] as const) : (['root', 'recip', 'poly', 'root', 'recip'] as const),
    );
    const a = rule === 'recipSquare' ? rng.int(1, 6) : rng.pick(nonZeroRange(-6, 6));
    // Half the draws sit on or next to the edge of the domain, where the
    // question is worth asking; the rest land anywhere nearby.
    const edge = rule === 'recipSquare' ? rng.pick([a, -a]) : a;
    const v = rng.chance(0.5) ? edge + rng.pick([-1, 0, 0, 1]) : a + rng.pick(nonZeroRange(-5, 5));
    return { rule, a, v };
  },
  render: (params): Slide => {
    const { rule, v } = params;
    const risk = rule === 'poly' ? RISK_NONE : rule === 'recip' || rule === 'recipSquare' ? RISK_ZERO : RISK_ROOT;
    const inDomain = allowed(params);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Is $x = ${v}$ in the domain of $f$? Decide what could go wrong first.` }],
      subject: `f(x) = ${domainRuleTex(params)}`,
      steps: [
        {
          id: 'risk',
          ask: 'What could stop this rule giving an answer?',
          branches: [
            { label: RISK_ROOT, to: 'root' },
            { label: RISK_ZERO, to: 'zero' },
            { label: RISK_NONE, outcome: `Every real number is in the domain, so $x = ${v}$ is too.` },
          ],
        },
        {
          id: 'root',
          ask: `At $x = ${v}$, is the number under the root negative?`,
          branches: [
            { label: FLOW_YES, outcome: `There is no real square root, so $x = ${v}$ is **not** in the domain.` },
            { label: FLOW_NO, outcome: `The root exists, so $x = ${v}$ **is** in the domain.` },
          ],
        },
        {
          id: 'zero',
          ask: `At $x = ${v}$, is the bottom of the fraction zero?`,
          branches: [
            { label: FLOW_YES, outcome: `Nothing can be divided by zero, so $x = ${v}$ is **not** in the domain.` },
            { label: FLOW_NO, outcome: `The division works, so $x = ${v}$ **is** in the domain.` },
          ],
        },
      ],
      // Both follow-up questions ask whether something has gone wrong, so "no" means it is allowed.
      answer: rule === 'poly' ? [RISK_NONE] : [risk, inDomain ? FLOW_NO : FLOW_YES],
    };
  },
  solution: (params) => {
    const { rule, a, v } = params;
    const ok = allowed(params);
    if (rule === 'poly') {
      return [
        { text: 'Squaring and subtracting work for every number, so nothing can go wrong.' },
        { text: `The domain is all real numbers, and $x = ${v}$ is in it.` },
      ];
    }
    if (rule === 'root' || rule === 'rootBack') {
      const inside = rule === 'root' ? v - a : a - v;
      return [
        { text: 'A square root of a negative number is not a real number, so the inside must be $0$ or more.' },
        { tex: rule === 'root' ? `${v} ${signedTile(-a)} = ${inside}` : `${a} - ${br(v)} = ${inside}` },
        { text: ok ? `That is not negative, so $x = ${v}$ is in the domain.` : `That is negative, so $x = ${v}$ is not in the domain.` },
      ];
    }
    const bottom = rule === 'recip' ? v - a : v * v - a * a;
    return [
      { text: 'Division by zero has no answer, so the bottom of the fraction must not be $0$.' },
      { tex: rule === 'recip' ? `${v} ${signedTile(-a)} = ${bottom}` : `${br(v)}^2 - ${a * a} = ${bottom}` },
      { text: ok ? `That is not zero, so $x = ${v}$ is in the domain.` : `That is zero, so $x = ${v}$ is not in the domain.` },
    ];
  },
};

type DomainForm = 'root' | 'rootBack' | 'recip' | 'rootScaled' | 'recipScaled' | 'rootRecip';

interface DomainParams {
  form: DomainForm;
  a: number;
  m: number;
}

function domainFormTex({ form, a, m }: DomainParams): string {
  if (form === 'root') return `\\sqrt{x ${signedTile(-a)}}`;
  if (form === 'rootBack') return `\\sqrt{${a} - x}`;
  if (form === 'recip') return `\\frac{${m}}{x ${signedTile(-a)}}`;
  if (form === 'rootScaled') return `\\sqrt{${m}x ${signedTile(-m * a)}}`;
  if (form === 'recipScaled') return `\\frac{1}{${m}x ${signedTile(-m * a)}}`;
  return `\\frac{1}{\\sqrt{x ${signedTile(-a)}}}`;
}

const GEQ = '\\geq';
const LEQ = '\\leq';
const NEQ = '\\neq';
const GT = '>';

function domainSign({ form }: DomainParams): string {
  if (form === 'root' || form === 'rootScaled') return GEQ;
  if (form === 'rootBack') return LEQ;
  if (form === 'rootRecip') return GT;
  return NEQ;
}

/**
 * The domain of a rule, written as an inequality.
 *
 * Two decisions, which is why it is tiles: the boundary number and which sign
 * goes with it — $\geq$ for a root, where zero is allowed; $\neq$ for a
 * fraction; $>$ for a root on the bottom of a fraction, where zero is not.
 * Difficulty 2 brings that along with a scaled inside, $\sqrt{2x - 6}$,
 * whose boundary is not the number shown.
 */
const domain: Generator<DomainParams> = {
  id: 'fun-domain',
  choices: (params) => {
    const { a } = params;
    const sign = domainSign(params);
    const others = [GEQ, GT, NEQ, LEQ].filter((s) => s !== sign);
    return options(
      { tex: `x ${sign} ${a}` },
      { tex: `x ${others[0]} ${a}` },
      { tex: `x ${sign} ${-a}` },
      { tex: `x ${others[1]} ${a}` },
    );
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(
      hard ? (['rootScaled', 'recipScaled', 'rootRecip', 'rootBack'] as const) : (['root', 'rootBack', 'recip'] as const),
    );
    return { form, a: rng.pick(nonZeroRange(-9, 9)), m: rng.int(2, hard ? 5 : 9) };
  },
  render: (params): Slide => {
    const { a, m } = params;
    const sign = domainSign(params);
    const answer = [sign, `${a}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `What is the largest possible domain of $f(x) = ${domainFormTex(params)}$?`,
        },
      ],
      template: 'x {0} {1}',
      bank: bankOf(answer, [GEQ, GT, NEQ, LEQ, `${-a}`, `${m * a}`, `${a + 1}`]),
      answer,
    };
  },
  solution: (params) => {
    const { form, a, m } = params;
    const sign = domainSign(params);
    const lines: SolutionStep[] = [];
    if (form === 'root' || form === 'rootBack' || form === 'rootScaled') {
      lines.push({ text: 'The inside of a square root must be $0$ or more.' });
      lines.push({
        tex:
          form === 'root'
            ? `x ${signedTile(-a)} \\geq 0`
            : form === 'rootBack'
              ? `${a} - x \\geq 0`
              : `${m}x ${signedTile(-m * a)} \\geq 0`,
      });
    } else if (form === 'rootRecip') {
      lines.push({ text: 'The inside of the root must be $0$ or more, and the bottom of the fraction must not be $0$ — so the inside must be strictly positive.' });
      lines.push({ tex: `x ${signedTile(-a)} > 0` });
    } else {
      lines.push({ text: 'The bottom of a fraction must not be $0$.' });
      lines.push({ tex: form === 'recip' ? `x ${signedTile(-a)} \\neq 0` : `${m}x ${signedTile(-m * a)} \\neq 0` });
    }
    if (form === 'rootBack') lines.push({ text: `So $x$ can be at most $${a}$.` });
    lines.push({ tex: `x ${sign} ${a}` });
    return lines;
  },
};

interface RangeSliderParams {
  shape: 'min' | 'max';
  expanded: boolean;
  h: number;
  k: number;
}

function rangeRuleTex({ shape, expanded, h, k }: RangeSliderParams): string {
  if (!expanded) {
    const square = h === 0 ? 'x^2' : `(x ${signedTile(-h)})^2`;
    return shape === 'min' ? `${square} ${signedTile(k)}` : `${k} - ${square}`;
  }
  const sign = shape === 'min' ? 1 : -1;
  return polyTex([[sign, 2], [-2 * h * sign, 1], [sign * h * h + k, 0]]);
}

/**
 * The range of a quadratic, read as the height of its vertex.
 *
 * A range is a set of outputs, so it is dragged rather than typed: the line
 * slides to the lowest (or highest) value the curve reaches. Difficulty 2
 * gives the rule expanded, so the vertex has to be found or read, not copied.
 */
const rangeSlider: Generator<RangeSliderParams> = {
  id: 'fun-range-slider',
  sample: (rng, difficulty) => ({
    shape: rng.pick(['min', 'max'] as const),
    expanded: difficulty > 1,
    h: rng.int(-3, 3),
    k: rng.pick(nonZeroRange(-5, 5)),
  }),
  render: (params): Slide => {
    const { shape, h, k } = params;
    const window = markerWindow(-6, 6, 'y');
    const f = (x: number) => (shape === 'min' ? 1 : -1) * (x - h) ** 2 + k;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The curve is $y = f(x)$ with $f(x) = ${rangeRuleTex(params)}$, for every real $x$. Its range is $f(x) ${shape === 'min' ? '\\geq' : '\\leq'} m$. Slide the line to $m$.`,
        },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: k,
      readout: 'm = {v}',
      figure: {
        svg: plotSvg({
          xMin: h - 5,
          xMax: h + 5,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [{ f }],
          verticals: h - 5 < 0 && h + 5 > 0 ? [{ x: 0, dashed: false }] : [],
          label: `A parabola opening ${shape === 'min' ? 'upwards' : 'downwards'}`,
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { shape, expanded, h, k } = params;
    const steps: SolutionStep[] = [];
    if (expanded) {
      steps.push({ text: 'Complete the square to find the vertex.' });
      steps.push({
        tex: `f(x) = ${rangeRuleTex({ ...params, expanded: false })}`,
      });
    }
    steps.push({
      text:
        shape === 'min'
          ? `A square is never negative, so $f(x)$ is smallest when the square is $0$, at $x = ${h}$. The least value is $${k}$.`
          : `A square is never negative and it is being taken away, so $f(x)$ is largest when the square is $0$, at $x = ${h}$. The greatest value is $${k}$.`,
    });
    steps.push({ tex: `f(x) ${shape === 'min' ? '\\geq' : '\\leq'} ${k}` });
    return steps;
  },
};

interface RangeParams {
  form: 'up' | 'down' | 'square';
  a: number;
  b: number;
  p: number;
  q: number;
}

function rangeParts({ form, a, b, p, q }: RangeParams): { lo: number; hi: number } {
  if (form === 'square') return { lo: b, hi: Math.max(p * p, q * q) + b };
  const ends = [a * p + b, a * q + b];
  return { lo: Math.min(...ends), hi: Math.max(...ends) };
}

function rangeFormTex({ form, a, b }: RangeParams): string {
  return form === 'square' ? polyTex([[1, 2], [b, 0]]) : linTex(a, b);
}

/**
 * The range of a function on a restricted domain.
 *
 * For a straight line the ends of the domain give the ends of the range, in
 * order — until the line falls, which difficulty 2 brings, and then the left
 * end gives the top. Difficulty 2 also puts $x^2$ over a domain crossing zero,
 * where the least value is at neither end.
 */
const rangeTiles: Generator<RangeParams> = {
  id: 'fun-range',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(hard ? (['down', 'square', 'up'] as const) : (['up'] as const));
    if (form === 'square') {
      const p = -rng.int(1, 3);
      return { form, a: 1, b: rng.pick(nonZeroRange(-6, 6)), p, q: rng.int(1, 4) };
    }
    const p = rng.int(-3, 2);
    return {
      form,
      a: form === 'down' ? -rng.int(1, 5) : rng.int(2, 6),
      b: rng.pick(nonZeroRange(-9, 9)),
      p,
      q: p + rng.int(2, 5),
    };
  },
  render: (params): Slide => {
    const { form, a, b, p, q } = params;
    const { lo, hi } = rangeParts(params);
    const answer = [`${lo}`, `${hi}`];
    const distractors =
      form === 'square'
        ? [`${p * p + b}`, `${q * q}`, `${lo - 1}`, `${p}`, `${q}`]
        : [`${p}`, `${q}`, `${a * p}`, `${a * q}`, `${hi + b}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$f(x) = ${rangeFormTex(params)}$ with domain $${p} \\leq x \\leq ${q}$. Complete its range.`,
        },
      ],
      template: '{0} \\leq f(x) \\leq {1}',
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  solution: (params) => {
    const { form, a, b, p, q } = params;
    const { lo, hi } = rangeParts(params);
    if (form === 'square') {
      return [
        { text: `The domain crosses $0$, and $x^2$ is smallest there: $f(0) = ${b}$.` },
        { text: `The largest value is at the end further from $0$: $f(${Math.abs(p) > q ? p : q}) = ${hi}$.` },
        { tex: `${lo} \\leq f(x) \\leq ${hi}` },
      ];
    }
    return [
      { text: 'A straight line has its extreme values at the ends of the domain.' },
      { tex: `f(${p}) = ${a * p + b}, \\quad f(${q}) = ${a * q + b}` },
      ...(a < 0 ? [{ text: 'The line falls, so the left end of the domain gives the top of the range.' }] : []),
      { tex: `${lo} \\leq f(x) \\leq ${hi}` },
    ];
  },
};

/* ---------- Lesson 3: composite functions ---------- */

type Rule = { kind: 'lin'; a: number; b: number } | { kind: 'sq'; c: number };

function ruleOfTex(rule: Rule): string {
  return rule.kind === 'lin' ? linTex(rule.a, rule.b) : polyTex([[1, 2], [rule.c, 0]]);
}

function apply(rule: Rule, x: number): number {
  return rule.kind === 'lin' ? rule.a * x + rule.b : x * x + rule.c;
}

interface CompositeParams {
  f: Rule;
  g: Rule;
  /** fg when true, gf when false. */
  fg: boolean;
  k: number;
}

function drawRule(rng: Rng, square: boolean, hard: boolean): Rule {
  if (square) return { kind: 'sq', c: rng.pick(nonZeroRange(-5, 5)) };
  return {
    kind: 'lin',
    a: rng.pick(hard ? [-3, -2, 2, 3, 4, 5] : range(2, 5)),
    b: rng.pick(nonZeroRange(-6, 6)),
  };
}

function compositeName(fg: boolean): string {
  return fg ? 'fg' : 'gf';
}

/**
 * A composite's value: $fg(2)$ is $f$ of whatever $g$ gives at $2$.
 *
 * The function nearest the input acts first — $fg(x)$ means $f(g(x))$ — and
 * getting that backwards is the slip. At difficulty 2 either order is asked.
 */
const compositeValue: Generator<CompositeParams> = {
  id: 'fun-composite-value',
  choices: (params) => {
    const { f, g, fg, k } = params;
    const [outer, inner] = fg ? [f, g] : [g, f];
    const v = apply(outer, apply(inner, k));
    return numberChoices(v, apply(inner, apply(outer, k)), apply(f, k) * apply(g, k), apply(f, k) + apply(g, k));
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const squareSide = rng.pick(['f', 'g', 'none'] as const);
    return {
      f: drawRule(rng, squareSide === 'f', hard),
      g: drawRule(rng, squareSide === 'g', hard),
      fg: hard ? rng.chance(0.5) : true,
      k: hard ? rng.pick(nonZeroRange(-4, 4)) : rng.int(1, 4),
    };
  },
  render: (params): Slide => {
    const { f, g, fg, k } = params;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'display', tex: pairTex(ruleOfTex(f), ruleOfTex(g)) },
        { kind: 'prose', text: `Find $${compositeName(fg)}(${k})$.` },
      ],
      lead: `${compositeName(fg)}(${k}) =`,
      keypad: [],
      answer: `${apply(fg ? f : g, apply(fg ? g : f, k))}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { f, g, fg, k } = params;
    const [outerName, innerName] = fg ? ['f', 'g'] : ['g', 'f'];
    const [outer, inner] = fg ? [f, g] : [g, f];
    const first = apply(inner, k);
    return [
      { text: `$${outerName}${innerName}(${k})$ means $${outerName}(${innerName}(${k}))$: the function next to the number acts first.` },
      { tex: `${innerName}(${k}) = ${first}` },
      { tex: `${outerName}(${first}) = ${apply(outer, first)}` },
    ];
  },
};

interface CompositeFormParams {
  a: number;
  b: number;
  c: number;
  d: number;
  fg: boolean;
}

/**
 * The composite of two linear functions, written as one rule.
 *
 * Tiles, because the checker would accept $3(2x + 1) - 4$ typed back and the
 * skill is simplifying it. The $x$ coefficient is the same either way round;
 * the number is not, and the other order's number is in the bank.
 */
const compositeForm: Generator<CompositeFormParams> = {
  id: 'fun-composite-form',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const coef = () => rng.pick(hard ? [-4, -3, -2, 2, 3, 4, 5] : range(2, 6));
    return drawUntil(
      () => ({
        a: coef(),
        b: rng.pick(nonZeroRange(-7, 7)),
        c: coef(),
        d: rng.pick(nonZeroRange(-7, 7)),
        fg: hard ? rng.chance(0.5) : true,
      }),
      (p) => p.a * p.d + p.b !== p.c * p.b + p.d && p.a * p.d + p.b !== 0 && p.c * p.b + p.d !== 0,
      { a: 3, b: 1, c: 2, d: 5, fg: true },
    );
  },
  render: (params): Slide => {
    const { a, b, c, d, fg } = params;
    const constant = fg ? a * d + b : c * b + d;
    const other = fg ? c * b + d : a * d + b;
    const answer = [termTex(a * c, 1), signedTile(constant)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'display', tex: pairTex(linTex(a, b), linTex(c, d)) },
        { kind: 'prose', text: `Write $${compositeName(fg)}(x)$ as a single rule.` },
      ],
      template: `${compositeName(fg)}(x) = {0} {1}`,
      bank: bankOf(answer, [
        termTex(a + c, 1),
        signedTile(other),
        signedTile(b + d),
        signedTile(fg ? a * d : c * b),
        termTex(-a * c, 1),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, b, c, d, fg } = params;
    const [outerName, innerName] = fg ? ['f', 'g'] : ['g', 'f'];
    const [oa, ob, ia, ib] = fg ? [a, b, c, d] : [c, d, a, b];
    return [
      { text: `$${outerName}${innerName}(x) = ${outerName}(${innerName}(x))$: put the whole of $${innerName}(x)$ in place of $x$ in $${outerName}$.` },
      {
        tex: `\\begin{aligned} ${outerName}${innerName}(x) &= ${oa}(${linTex(ia, ib)}) ${signedTile(ob)} \\\\ &= ${linTex(oa * ia, oa * ib + ob)} \\end{aligned}`,
      },
    ];
  },
};

interface OrderParams {
  outer: 'sq' | 'recip' | 'root';
  c: number;
  p: number;
  d: number;
  fg: boolean;
}

/** f is the non-linear one, g is px + d. */
function orderF({ outer, c }: OrderParams): string {
  if (outer === 'sq') return polyTex([[1, 2], [c, 0]]);
  if (outer === 'recip') return '\\frac{1}{x}';
  return '\\sqrt{x}';
}

function orderG({ p, d }: OrderParams): string {
  return linTex(p, d);
}

/**
 * Which is $fg(x)$, and which is $gf(x)$?
 *
 * Built round one non-linear function so the two orders look nothing alike:
 * $(x + 3)^2$ against $x^2 + 3$. The product and the sum of the two rules are
 * in the list too, because $fg$ read as $f$ times $g$ is the other slip.
 */
const compositeOrder: Generator<OrderParams> = {
  id: 'fun-composite-order',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      outer: rng.pick(hard ? (['sq', 'recip', 'root'] as const) : (['sq'] as const)),
      c: rng.int(0, 4),
      p: rng.pick(hard ? [1, 2, 3, -1] : [1, 1, 2, 3]),
      d: rng.pick(nonZeroRange(-7, 7)),
      fg: hard ? rng.chance(0.5) : rng.chance(0.7),
    };
  },
  render: (params): Slide => {
    const { outer, c, p, d, fg } = params;
    const g = orderG(params);
    const inG =
      outer === 'sq'
        ? `(${g})^2 ${c === 0 ? '' : signedTile(c)}`.trim()
        : outer === 'recip'
          ? `\\frac{1}{${g}}`
          : `\\sqrt{${g}}`;
    const lead = p === 1 ? '' : p === -1 ? '-' : `${p}`;
    const fThenG =
      outer === 'sq'
        ? polyTex([[p, 2], [p * c + d, 0]])
        : outer === 'recip'
          ? `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{x} ${signedTile(d)}`
          : `${lead}\\sqrt{x} ${signedTile(d)}`;
    const product = `(${orderF(params)})(${g})`;
    const sum =
      outer === 'sq'
        ? polyTex([[1, 2], [p, 1], [c + d, 0]])
        : `${orderF(params)} ${g.startsWith('-') ? `- ${g.slice(1)}` : `+ ${g}`}`;
    const labels = fg ? [inG, fThenG, product, sum] : [fThenG, inG, product, sum];
    const turn = (Math.abs(d) + p + c) % 4;
    const ordered = [...labels.slice(turn), ...labels.slice(0, turn)];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'display', tex: pairTex(orderF(params), g) },
        { kind: 'prose', text: `Which of these is $${compositeName(fg)}(x)$?` },
      ],
      options: ordered.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
      correctId: `opt${ordered.indexOf(labels[0])}`,
    };
  },
  solution: (params) => {
    const { fg } = params;
    const [outerName, innerName] = fg ? ['f', 'g'] : ['g', 'f'];
    return [
      { text: `$${outerName}${innerName}(x)$ means $${outerName}(${innerName}(x))$: $${innerName}$ acts first, and its output goes into $${outerName}$.` },
      {
        text: fg
          ? `So write $g(x) = ${orderG(params)}$ in place of $x$ in $f(x) = ${orderF(params)}$.`
          : `So write $f(x) = ${orderF(params)}$ in place of $x$ in $g(x) = ${orderG(params)}$.`,
      },
      { text: 'It is not $f(x)$ times $g(x)$ — two letters side by side mean one function inside the other.' },
    ];
  },
};

/**
 * $fg(k)$ and $gf(k)$ side by side, as a tree.
 *
 * Two routes from one input: $g$ first and then $f$, or $f$ first and then
 * $g$. Filling both is the quickest way to see that the order changes the
 * answer.
 */
const chainTree: Generator<CompositeParams> = {
  id: 'fun-chain-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => ({
        f: drawRule(rng, false, hard),
        g: drawRule(rng, hard && rng.chance(0.5), hard),
        fg: true,
        k: hard ? rng.pick(nonZeroRange(-4, 4)) : rng.int(1, 4),
      }),
      (p) => {
        const values = [apply(p.g, p.k), apply(p.f, p.k)];
        const fg = apply(p.f, values[0]);
        const gf = apply(p.g, values[1]);
        return new Set([...values, fg, gf]).size === 4;
      },
      { f: { kind: 'lin', a: 2, b: 1 }, g: { kind: 'lin', a: 3, b: -2 }, fg: true, k: 2 },
    );
  },
  render: (params): Slide => {
    const { f, g, k } = params;
    const gk = apply(g, k);
    const fk = apply(f, k);
    const answer = [`${gk}`, `${fk}`, `${apply(f, gk)}`, `${apply(g, fk)}`];
    return {
      kind: 'tree',
      prompt: [
        { kind: 'display', tex: pairTex(ruleOfTex(f), ruleOfTex(g)) },
        {
          kind: 'prose',
          text: `Find $fg(${k})$ and $gf(${k})$. Fill in $g(${k})$ and $f(${k})$ first, then put each through the other function.`,
        },
      ],
      expression: `fg(${k}) \\quad \\text{and} \\quad gf(${k})`,
      nodes: [
        { id: 'g', from: [] },
        { id: 'f', from: [] },
        { id: 'fg', from: ['g'] },
        { id: 'gf', from: ['f'] },
      ],
      bank: treeBank(answer, [fk * gk, fk + gk, apply(f, fk), apply(g, gk)], apply(f, gk)),
      answer,
    };
  },
  solution: (params) => {
    const { f, g, k } = params;
    const gk = apply(g, k);
    const fk = apply(f, k);
    return [
      { text: `For $fg(${k})$, $g$ acts first: $g(${k}) = ${gk}$, then $f(${gk}) = ${apply(f, gk)}$.` },
      { text: `For $gf(${k})$, $f$ acts first: $f(${k}) = ${fk}$, then $g(${fk}) = ${apply(g, fk)}$.` },
      { text: 'Different answers: the order of a composite matters.' },
    ];
  },
};

/* ---------- Lesson 4: inverse functions ---------- */

interface InverseParams {
  form: 'lin' | 'bracket';
  a: number;
  b: number;
}

function inverseRuleTex({ form, a, b }: InverseParams): string {
  return form === 'lin' ? linTex(a, b) : `${a}(x ${signedTile(b)})`;
}

/**
 * Finding an inverse by swapping and rearranging, one line at a time.
 *
 * Write $y = f(x)$, swap $x$ and $y$, then make $y$ the subject again. Each
 * tap collapses the line into the next; the bank holds the line the learner
 * gets by undoing in the wrong order or with the wrong sign.
 */
const inverseSteps: Generator<InverseParams> = {
  id: 'fun-inverse-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      form: hard ? rng.pick(['lin', 'bracket'] as const) : 'lin',
      a: rng.pick(hard ? [-5, -4, -3, -2, 2, 3, 4, 5, 6, 7] : range(2, 9)),
      b: rng.pick(nonZeroRange(-9, 9)),
    };
  },
  render: (params): Slide => {
    const { form, a, b } = params;
    if (form === 'lin') {
      const swapped = `x = ${linTex(a, b, 'y')}`;
      const moved = `x ${signedTile(-b)} = ${a}y`;
      const done = `y = \\frac{x ${signedTile(-b)}}{${a}}`;
      return {
        kind: 'steps',
        prompt: [
          {
            kind: 'prose',
            text: `Find the inverse of $f(x) = ${inverseRuleTex(params)}$. Swap $x$ and $y$, then make $y$ the subject. ${HOW_TO_STEP}`,
          },
        ],
        start: ['y', '=', termTex(a, 1), `{} ${signedTile(b)}`],
        reductions: [
          {
            span: [0, 4],
            operator: 1,
            value: swapped,
            bank: stepBank(swapped, `y = ${linTex(a, -b)}`, `x = ${linTex(a, -b, 'y')}`, `x = \\frac{y}{${a}} ${signedTile(b)}`),
          },
          {
            span: [0, 1],
            value: moved,
            bank: stepBank(moved, `x ${signedTile(b)} = ${a}y`, `${a}x ${signedTile(-b)} = y`, `x = ${a}y`),
          },
          {
            span: [0, 1],
            value: done,
            bank: stepBank(done, `y = \\frac{x}{${a}} ${signedTile(-b)}`, `y = ${a}(x ${signedTile(-b)})`, `y = \\frac{x ${signedTile(b)}}{${a}}`),
          },
        ],
      };
    }
    const swapped = `x = ${a}(y ${signedTile(b)})`;
    const divided = `\\frac{x}{${a}} = y ${signedTile(b)}`;
    const done = `y = \\frac{x}{${a}} ${signedTile(-b)}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Find the inverse of $f(x) = ${inverseRuleTex(params)}$. Swap $x$ and $y$, then make $y$ the subject. ${HOW_TO_STEP}`,
        },
      ],
      start: ['y', '=', `${a}(x ${signedTile(b)})`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: swapped,
          bank: stepBank(swapped, `y = ${a}(x ${signedTile(-b)})`, `x = \\frac{y}{${a}} ${signedTile(b)}`, `x = ${a}y ${signedTile(b)}`),
        },
        {
          span: [0, 1],
          value: divided,
          bank: stepBank(divided, `${a}x = y ${signedTile(b)}`, `x ${signedTile(-b)} = ${a}y`, `\\frac{x}{${a}} = y`),
        },
        {
          span: [0, 1],
          value: done,
          bank: stepBank(done, `y = \\frac{x}{${a}} ${signedTile(b)}`, `y = \\frac{x ${signedTile(-b)}}{${a}}`, `y = ${a}x ${signedTile(-b)}`),
        },
      ],
    };
  },
  solution: (params) => {
    const { form, a, b } = params;
    if (form === 'lin') {
      return [
        { text: 'Write $y = f(x)$, then swap $x$ and $y$.' },
        { tex: `x = ${linTex(a, b, 'y')}` },
        { text: `${b > 0 ? `Take $${b}$ from` : `Add $${-b}$ to`} both sides, then divide by $${a}$.` },
        { tex: `x ${signedTile(-b)} = ${a}y` },
        { tex: `f^{-1}(x) = \\frac{x ${signedTile(-b)}}{${a}}` },
      ];
    }
    return [
      { text: 'Write $y = f(x)$, then swap $x$ and $y$.' },
      { tex: `x = ${a}(y ${signedTile(b)})` },
      { text: `Divide by $${a}$ first — the whole bracket is multiplied — then ${b > 0 ? `take $${b}$ away` : `add $${-b}$`}.` },
      { tex: `f^{-1}(x) = \\frac{x}{${a}} ${signedTile(-b)}` },
    ];
  },
};

interface InverseFormParams {
  form: 'bracket' | 'over' | 'self';
  a: number;
  b: number;
}

/**
 * The inverse's rule, placed as tiles.
 *
 * Built from forms whose inverse sets as two tiles without a fraction bar
 * spanning a blank: $a(x + b)$ inverts to $\frac{x}{a} - b$, and
 * $\frac{x}{a} + b$ to $a(x - b)$. Difficulty 2 adds $b - x$, which is its
 * own inverse — a surprise worth meeting once.
 */
const inverseForm: Generator<InverseFormParams> = {
  id: 'fun-inverse-form',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(hard ? (['bracket', 'over', 'self'] as const) : (['bracket', 'over'] as const));
    return {
      form,
      // A negative divisor would read $\frac{x}{-3}$, so only the bracket form takes one.
      a: rng.pick(hard && form === 'bracket' ? [-5, -4, -3, -2, 2, 3, 4, 5, 6] : range(2, 9)),
      b: form === 'self' ? rng.int(1, 12) : rng.pick(nonZeroRange(-9, 9)),
    };
  },
  render: (params): Slide => {
    const { form, a, b } = params;
    const prompt = (rule: string) => [
      { kind: 'prose' as const, text: `$f(x) = ${rule}$. Complete its inverse.` },
    ];
    if (form === 'bracket') {
      const sign = a < 0 ? '-' : '';
      const answer = [`${sign}\\frac{x}{${Math.abs(a)}}`, signedTile(-b)];
      return {
        kind: 'tiles',
        prompt: prompt(`${a}(x ${signedTile(b)})`),
        template: 'f^{-1}(x) = {0} {1}',
        bank: bankOf(answer, [`${a}x`, `${sign}\\frac{${Math.abs(a)}}{x}`, signedTile(b), signedTile(-a * b)]),
        answer,
      };
    }
    if (form === 'over') {
      const answer = [numberTile(a), signedTile(-b)];
      return {
        kind: 'tiles',
        prompt: prompt(`\\frac{x}{${a}} ${signedTile(b)}`),
        template: 'f^{-1}(x) = {0}(x {1})',
        bank: bankOf(answer, [`\\frac{1}{${a}}`, numberTile(-a), signedTile(b), signedTile(-a * b)]),
        answer,
      };
    }
    const answer = [`${b}`, '- x'];
    return {
      kind: 'tiles',
      prompt: prompt(`${b} - x`),
      template: 'f^{-1}(x) = {0} {1}',
      bank: bankOf(answer, [`${-b}`, '+ x', `\\frac{1}{${b}}`]),
      answer,
    };
  },
  solution: (params) => {
    const { form, a, b } = params;
    if (form === 'bracket') {
      return [
        { tex: `x = ${a}(y ${signedTile(b)})` },
        { text: `Divide by $${a}$, then ${b > 0 ? `take $${b}$ away` : `add $${-b}$`}.` },
        { tex: `f^{-1}(x) = \\frac{x}{${a}} ${signedTile(-b)}` },
      ];
    }
    if (form === 'over') {
      return [
        { tex: `x = \\frac{y}{${a}} ${signedTile(b)}` },
        { text: `${b > 0 ? `Take $${b}$ away` : `Add $${-b}$`}, then multiply by $${a}$.` },
        { tex: `f^{-1}(x) = ${a}(x ${signedTile(-b)})` },
      ];
    }
    return [
      { tex: `x = ${b} - y` },
      { text: `Add $y$ to both sides and take $x$ away: $y = ${b} - x$.` },
      { tex: `f^{-1}(x) = ${b} - x` },
      { text: 'The inverse is the function itself: doing it twice gets back to where you started.' },
    ];
  },
};

interface InverseValueParams {
  form: 'lin' | 'bracket' | 'over';
  a: number;
  b: number;
  x: number;
}

function inverseValueRuleTex({ form, a, b }: InverseValueParams): string {
  if (form === 'lin') return linTex(a, b);
  if (form === 'bracket') return `${a}(x ${signedTile(b)})`;
  return `\\frac{x}{${a}} ${signedTile(b)}`;
}

function inverseValueAt({ form, a, b }: InverseValueParams, x: number): number {
  if (form === 'lin') return a * x + b;
  if (form === 'bracket') return a * (x + b);
  return x / a + b;
}

/**
 * $f^{-1}(c)$ as a number: the input that $f$ turns into $c$.
 *
 * No need to find the whole inverse — undo $f$ on the one number. The slip is
 * to work out $f(c)$ instead, and that is the first distractor.
 */
const inverseValue: Generator<InverseValueParams> = {
  id: 'fun-inverse-value',
  choices: (params) => {
    const { a, b, x } = params;
    const c = inverseValueAt(params, x);
    const forward = inverseValueAt(params, c);
    return numberChoices(x, Number.isInteger(forward) ? forward : a * c, c - b, (c + b) / a, -x);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(hard ? (['bracket', 'over', 'lin'] as const) : (['lin'] as const));
    const a = rng.pick(hard ? [-4, -3, -2, 2, 3, 4, 5] : range(2, 7));
    const b = rng.pick(nonZeroRange(-9, 9));
    const k = hard ? rng.pick(nonZeroRange(-7, 7)) : rng.int(1, 9);
    if (form === 'over') return { form, a: Math.abs(a), b, x: Math.abs(a) * k };
    return { form, a, b, x: k };
  },
  render: (params): Slide => {
    const c = inverseValueAt(params, params.x);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `$f(x) = ${inverseValueRuleTex(params)}$. Find $f^{-1}(${c})$.` }],
      lead: `f^{-1}(${c}) =`,
      keypad: [],
      answer: `${params.x}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { x } = params;
    const c = inverseValueAt(params, x);
    return [
      { text: `$f^{-1}(${c})$ is the input that $f$ sends to $${c}$, so solve $f(x) = ${c}$.` },
      { tex: `${inverseValueRuleTex(params)} = ${c}` },
      { tex: `x = ${x}` },
      { tex: `f^{-1}(${c}) = ${x}` },
    ];
  },
};

interface UndoTreeParams {
  form: 'lin' | 'sq' | 'shifted';
  a: number;
  b: number;
  x: number;
}

function undoRuleTex({ form, a, b }: UndoTreeParams): string {
  if (form === 'lin') return linTex(a, b);
  if (form === 'sq') return `${polyTex([[a, 2], [b, 0]])}, \\; x \\geq 0`;
  return `(x ${signedTile(a)})^2 ${signedTile(b)}, \\; x \\geq ${-a}`;
}

function undoForward({ form, a, b }: UndoTreeParams, x: number): number {
  if (form === 'lin') return a * x + b;
  if (form === 'sq') return a * x * x + b;
  return (x + a) ** 2 + b;
}

/** The values the undoing passes through, in node order. */
function undoValues(params: UndoTreeParams): number[] {
  const { form, a, b, x } = params;
  const c = undoForward(params, x);
  if (form === 'lin') return [c - b, x];
  if (form === 'sq') return [c - b, (c - b) / a, x];
  return [c - b, x + a, x];
}

/**
 * Undoing $f$ on one number, as a tree.
 *
 * The inverse runs $f$'s operations backwards, each one replaced by its
 * opposite: take away what was added, divide what was multiplied, and a
 * square root for a square — which is why the square forms carry a domain
 * that keeps $x$ on one side of the vertex.
 */
const undoTree: Generator<UndoTreeParams> = {
  id: 'fun-undo-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(hard ? (['sq', 'shifted', 'shifted'] as const) : (['lin', 'sq'] as const));
    if (form === 'lin') return { form, a: rng.int(2, 9), b: rng.pick(nonZeroRange(-9, 9)), x: rng.int(1, 9) };
    // Every value the tree passes through is different, so no slot's number
    // can be read off another's.
    const distinct = (p: UndoTreeParams) => new Set(undoValues(p)).size === undoValues(p).length;
    if (form === 'sq') {
      return drawUntil(
        () => ({ form, a: rng.int(2, hard ? 5 : 3), b: rng.pick(nonZeroRange(-9, 9)), x: rng.int(2, hard ? 6 : 4) }),
        distinct,
        { form, a: 2, b: 3, x: 3 },
      );
    }
    return drawUntil(
      () => {
        const a = rng.pick(nonZeroRange(-4, 4));
        return { form, a, b: rng.pick(nonZeroRange(-9, 9)), x: -a + rng.int(2, 6) };
      },
      distinct,
      { form, a: 2, b: 3, x: 1 },
    );
  },
  render: (params): Slide => {
    const { form, x } = params;
    const c = undoForward(params, x);
    const answer = undoValues(params).map(String);
    const nodes =
      form === 'lin'
        ? [
            { id: 'less', from: [] },
            { id: 'x', from: ['less'] },
          ]
        : [
            { id: 'less', from: [] },
            { id: 'undone', from: ['less'] },
            { id: 'x', from: ['undone'] },
          ];
    const order =
      form === 'lin'
        ? 'undo the adding, then the multiplying'
        : form === 'sq'
          ? 'undo the adding, then the multiplying, then the square'
          : 'undo the adding, then the square, then the bracket';
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `$f(x) = ${undoRuleTex(params)}$. Find $f^{-1}(${c})$ by undoing $f$ in reverse order: ${order}.`,
        },
      ],
      expression: `f^{-1}(${c})`,
      nodes,
      bank: treeBank(answer, [c + params.b, -x, x + 1, c - params.a], x),
      answer,
    };
  },
  solution: (params) => {
    const { form, a, b, x } = params;
    const c = undoForward(params, x);
    const [first, second] = undoValues(params);
    if (form === 'lin') {
      return [
        { text: `$f$ multiplies by $${a}$ and then ${b > 0 ? `adds $${b}$` : `takes away $${-b}$`}. Undo the last first.` },
        { tex: `${c} ${signedTile(-b)} = ${first}` },
        { tex: `${first} \\div ${a} = ${x}` },
      ];
    }
    if (form === 'sq') {
      return [
        { text: `$f$ squares, multiplies by $${a}$, then ${b > 0 ? `adds $${b}$` : `takes away $${-b}$`}. Undo them last first.` },
        { tex: `${c} ${signedTile(-b)} = ${first}, \\quad ${first} \\div ${a} = ${second}` },
        { text: `The square root of $${second}$ is $${x}$ — the positive root, because the domain is $x \\geq 0$.` },
      ];
    }
    return [
      { text: `$f$ ${a > 0 ? `adds $${a}$` : `takes away $${-a}$`}, squares, then ${b > 0 ? `adds $${b}$` : `takes away $${-b}$`}. Undo them last first.` },
      { tex: `${c} ${signedTile(-b)} = ${first}, \\quad \\sqrt{${first}} = ${second}` },
      { text: `The positive root, because the domain keeps $x ${signedTile(a)}$ at $0$ or more. Then ${a > 0 ? `take $${a}$ away` : `add $${-a}$`}: $${x}$.` },
    ];
  },
};

/* ---------- Lesson 5: one-to-one, many-to-one, and the inverse's graph ---------- */

type MapKind = 'one-one' | 'many-one' | 'one-many';

interface MappingFlowParams {
  rule: 'line' | 'square' | 'squareHalf' | 'abs' | 'cube' | 'recip' | 'sideways';
  a: number;
  b: number;
}

function mappingKind({ rule }: MappingFlowParams): MapKind {
  if (rule === 'square' || rule === 'abs') return 'many-one';
  if (rule === 'sideways') return 'one-many';
  return 'one-one';
}

function mappingTex({ rule, a, b }: MappingFlowParams): string {
  if (rule === 'line') return `y = ${linTex(a, b)}`;
  if (rule === 'square') return `y = ${polyTex([[1, 2], [b, 0]])}, \\; x \\in \\mathbb{R}`;
  if (rule === 'squareHalf') return `y = (x ${signedTile(-a)})^2, \\; x \\geq ${a}`;
  if (rule === 'abs') return `y = |x ${signedTile(-a)}|, \\; x \\in \\mathbb{R}`;
  if (rule === 'cube') return `y = ${polyTex([[1, 3], [b, 0]])}`;
  if (rule === 'recip') return `y = \\frac{1}{x ${signedTile(-a)}}, \\; x \\neq ${a}`;
  return `y^2 = x ${signedTile(b)}`;
}

const MAP_TWO_YES = 'Yes, two outputs';
const MAP_TWO_NO = 'No, one output';
const MAP_SAME_YES = 'Yes';
const MAP_SAME_NO = 'No';

/**
 * Function or not, and does it have an inverse?
 *
 * Two questions in order. Can one input give two outputs? Then it is not a
 * function at all. Can two inputs give the same output? Then it is
 * many-to-one, and its inverse would have to send one number back to two —
 * so it has none, until the domain is cut down, which is what the $x \geq a$
 * forms show.
 */
const mappingFlow: Generator<MappingFlowParams> = {
  id: 'fun-mapping-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const rule = rng.pick(
      hard
        ? (['squareHalf', 'abs', 'recip', 'sideways', 'cube', 'square'] as const)
        : (['line', 'square', 'abs', 'cube', 'sideways'] as const),
    );
    return {
      rule,
      a: rule === 'line' ? rng.pick([-4, -3, -2, 2, 3, 4, 5]) : rng.pick(nonZeroRange(-5, 5)),
      b: rng.pick(nonZeroRange(-9, 9)),
    };
  },
  render: (params): Slide => {
    const kind = mappingKind(params);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'What kind of mapping is this? Test it one question at a time.' }],
      subject: mappingTex(params),
      steps: [
        {
          id: 'two',
          ask: 'Can one value of $x$ give **two** values of $y$?',
          branches: [
            { label: MAP_TWO_YES, outcome: 'One-to-many: this is **not** a function.' },
            { label: MAP_TWO_NO, to: 'same' },
          ],
        },
        {
          id: 'same',
          ask: 'Can two **different** values of $x$ give the same $y$?',
          branches: [
            { label: MAP_SAME_YES, outcome: 'Many-to-one: a function, but it has no inverse.' },
            { label: MAP_SAME_NO, outcome: 'One-to-one: a function with an inverse.' },
          ],
        },
      ],
      answer: kind === 'one-many' ? [MAP_TWO_YES] : [MAP_TWO_NO, kind === 'many-one' ? MAP_SAME_YES : MAP_SAME_NO],
    };
  },
  solution: (params) => {
    const { rule, a, b } = params;
    if (rule === 'sideways') {
      return [
        { text: `Take $x = ${3 - b}$: then $y^2 = 3$, so $y = \\sqrt{3}$ or $y = -\\sqrt{3}$.` },
        { text: 'One input, two outputs: one-to-many, so it is not a function.' },
      ];
    }
    if (rule === 'square') {
      return [
        { text: 'Each $x$ gives one $y$, so it is a function.' },
        { text: `But $x = 2$ and $x = -2$ both give $y = ${4 + b}$: many-to-one, so it has no inverse.` },
      ];
    }
    if (rule === 'abs') {
      return [
        { text: 'Each $x$ gives one $y$, so it is a function.' },
        { text: `But $x = ${a + 1}$ and $x = ${a - 1}$ both give $y = 1$: many-to-one, so it has no inverse.` },
      ];
    }
    const why: Record<string, string> = {
      line: 'A straight line that is not horizontal never takes the same height twice.',
      squareHalf: `Cutting the domain at the vertex keeps only one side of the parabola, which never takes the same height twice.`,
      cube: 'A cubic of this shape is always rising, so it never takes the same height twice.',
      recip: `Each output of $\\frac{1}{x ${signedTile(-a)}}$ comes from exactly one input.`,
    };
    return [
      { text: 'Each $x$ gives one $y$, so it is a function.' },
      { text: why[rule] ?? '' },
      { text: 'One-to-one, so it has an inverse.' },
    ];
  },
};

type PairKind = 'one-one' | 'many-one' | 'one-many' | 'many-many';

interface MappingParams {
  kind: PairKind;
  inputs: number[];
  outputs: number[];
}

const PAIR_LABELS: Record<PairKind, string> = {
  'one-one': 'One-to-one',
  'many-one': 'Many-to-one',
  'one-many': 'One-to-many',
  'many-many': 'Many-to-many',
};

/** The arrows of a small mapping, as pairs [input, output]. */
function mappingPairs({ kind, inputs, outputs }: MappingParams): [number, number][] {
  const [p, q, r] = inputs;
  const [s, t, u, w] = outputs;
  if (kind === 'one-one') return [[p, s], [q, t], [r, u]];
  if (kind === 'many-one') return [[p, s], [q, s], [r, t]];
  if (kind === 'one-many') return [[p, s], [p, t], [q, u]];
  return [[p, s], [p, t], [q, t], [r, w]];
}

/**
 * Classify a mapping from its arrows.
 *
 * Three or four arrows written out, $2 \mapsto 5$ and so on. The four kinds
 * are the whole vocabulary: an input with two arrows leaving it makes the
 * mapping one-to-many, an output with two arrows arriving makes it
 * many-to-one, and both at once is many-to-many.
 */
const mapping: Generator<MappingParams> = {
  id: 'fun-mapping',
  sample: (rng, difficulty) => {
    const kind = rng.pick(
      difficulty > 1
        ? (['many-many', 'one-many', 'many-one', 'one-one'] as const)
        : (['one-one', 'many-one', 'one-many', 'many-one', 'one-one'] as const),
    );
    return {
      kind,
      inputs: rng.sample(range(-3, 6), 3).sort((x, y) => x - y),
      outputs: rng.sample(range(-2, 12), 4),
    };
  },
  render: (params): Slide => {
    const pairs = mappingPairs(params);
    const order: PairKind[] = ['one-one', 'many-one', 'one-many', 'many-many'];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'A mapping sends each input along its arrows:' },
        { kind: 'display', tex: pairs.map(([x, y]) => `${x} \\mapsto ${y}`).join(', \\quad ') },
        { kind: 'prose', text: 'What kind of mapping is it?' },
      ],
      options: order.map((kind, idx) => ({ id: `opt${idx}`, label: PAIR_LABELS[kind] })),
      correctId: `opt${order.indexOf(params.kind)}`,
    };
  },
  solution: (params) => {
    const { kind, inputs, outputs } = params;
    const lines: Record<PairKind, string> = {
      'one-one': 'Every input has one arrow and no output is reached twice.',
      'many-one': `The inputs $${inputs[0]}$ and $${inputs[1]}$ both go to $${outputs[0]}$: two inputs, one output.`,
      'one-many': `The input $${inputs[0]}$ goes to both $${outputs[0]}$ and $${outputs[1]}$: one input, two outputs.`,
      'many-many': `The input $${inputs[0]}$ has two arrows, and $${outputs[1]}$ is reached from two inputs — both at once.`,
    };
    return [
      { text: lines[kind] },
      { text: `So it is ${PAIR_LABELS[kind].toLowerCase()}.${kind === 'one-one' || kind === 'many-one' ? ' It is a function.' : ' It is not a function.'}` },
    ];
  },
};

interface InversePointParams {
  given: 'point' | 'rule';
  p: number;
  q: number;
  a: number;
  b: number;
}

/**
 * A point on the inverse's graph.
 *
 * The inverse undoes $f$, so wherever $f$ sends $p$ to $q$ the inverse sends
 * $q$ back to $p$: the point $(p, q)$ becomes $(q, p)$, the reflection in
 * $y = x$. Difficulty 2 names the inverse's input and gives the rule, so the
 * learner has to undo $f$ on it first.
 */
const inversePoint: Generator<InversePointParams> = {
  id: 'fun-inverse-point',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const a = rng.pick([-4, -3, -2, 2, 3, 4, 5]);
      const b = rng.pick(nonZeroRange(-7, 7));
      const p = rng.pick(nonZeroRange(-4, 5));
      return { given: 'rule', p, q: a * p + b, a, b };
    }
    return drawUntil(
      () => ({ given: 'point' as const, p: rng.pick(nonZeroRange(-6, 6)), q: rng.pick(nonZeroRange(-9, 9)), a: 0, b: 0 }),
      (params) => Math.abs(params.p) !== Math.abs(params.q),
      { given: 'point', p: 2, q: 5, a: 0, b: 0 },
    );
  },
  render: (params): Slide => {
    const { given, p, q, a, b } = params;
    const answer = [`${q}`, `${p}`];
    if (given === 'point') {
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text: `The point $(${p}, ${q})$ lies on $y = f(x)$. Which point must lie on $y = f^{-1}(x)$?`,
          },
        ],
        template: '({0}, {1})',
        bank: bankOf(answer, [`${-p}`, `${-q}`, `${p + q}`]),
        answer,
      };
    }
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$f(x) = ${linTex(a, b)}$. The graph of $y = f^{-1}(x)$ passes through a point with $x$-coordinate $${q}$. Complete it.`,
        },
      ],
      template: '({0}, {1})',
      bank: bankOf(answer, [`${a * q + b}`, `${-p}`, `${p + 1}`]),
      answer,
    };
  },
  solution: (params) => {
    const { given, p, q, a, b } = params;
    if (given === 'point') {
      return [
        { text: `$f(${p}) = ${q}$, so $f^{-1}$ sends $${q}$ back to $${p}$: $f^{-1}(${q}) = ${p}$.` },
        { text: 'Swapping the coordinates is reflecting in the line $y = x$.' },
        { tex: `(${q}, ${p})` },
      ];
    }
    return [
      { text: `$f^{-1}(${q})$ is the input $f$ sends to $${q}$, so solve $${linTex(a, b)} = ${q}$.` },
      { tex: `x = ${p}` },
      { tex: `(${q}, ${p})` },
    ];
  },
};

interface MeetParams {
  a: number;
  m: number;
}

/**
 * Where a line meets its own inverse.
 *
 * The inverse's graph is the reflection of $f$'s in $y = x$, so the two meet
 * on that line, where $f(x) = x$. The figure draws all three; the slider
 * finds the crossing. Steep and falling lines at difficulty 2 put the
 * crossing further from where the eye expects it.
 */
const inverseMeet: Generator<MeetParams> = {
  id: 'fun-inverse-meet',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { a: rng.pick([-4, -3, -2, 3, 4, 5]), m: rng.pick(nonZeroRange(-5, 5)) }
      : { a: rng.pick([2, 3, 4, -2, -3]), m: rng.pick(nonZeroRange(-4, 4)) },
  render: ({ a, m }): Slide => {
    const b = m * (1 - a);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `$f(x) = ${linTex(a, b)}$. The solid lines are $y = f(x)$ and $y = f^{-1}(x)$; the dashed line is $y = x$. Slide to the $x$ where the graph of $f$ meets the graph of its inverse.`,
        },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: m,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -6,
          xMax: 6,
          yMin: -6,
          yMax: 6,
          curves: [
            // Not in the accent colour: that is the slider's marker.
            { f: (x: number) => a * x + b },
            { f: (x: number) => (x - b) / a },
            { f: (x: number) => x, dashed: true },
          ],
          verticals: [{ x: 0, dashed: false }],
          label: 'Two straight lines, reflections of each other in the dashed line y = x',
        }),
        ...markerWindow(-6, 6),
      },
    };
  },
  solution: ({ a, m }) => {
    const b = m * (1 - a);
    return [
      { text: 'The graphs of $f$ and $f^{-1}$ are reflections in $y = x$, so they meet on $y = x$: where $f(x) = x$.' },
      { tex: `${linTex(a, b)} = x` },
      { tex: `x = ${m}` },
    ];
  },
};

/* ======================================================================
 * Level 2: Transformations — the questions not asked through the graph
 * ==================================================================== */

/**
 * The curves a transformation question may name, so that one question about
 * $y = f(x + 3)$ is not the only one there is. Only named, never drawn: the
 * question is about what the change to the equation does, and it does the
 * same thing to every curve.
 */
const NAMED_CURVES = ['x^2', 'x^3', '\\sqrt{x}', '|x|', '\\sin x', '2^x', '\\frac{1}{x}'];

/** A factor as the learner reads it in TeX: `3`, `\tfrac{1}{2}`. */
function factorTex(factor: number): string {
  if (Number.isInteger(factor)) return `${factor}`;
  return `\\tfrac{1}{${Math.round(1 / factor)}}`;
}

/** A factor as plain text, for option labels that wrap: `3`, `½`. */
function factorWord(factor: number): string {
  if (Number.isInteger(factor)) return `${factor}`;
  const unicode: Record<number, string> = { 2: '½', 3: '⅓', 4: '¼' };
  return unicode[Math.round(1 / factor)];
}

/** `x - 3`, `x + 2`, `x`: the inside of a bracket shifted by h. */
function shiftedX(h: number): string {
  return h === 0 ? 'x' : h > 0 ? `x - ${h}` : `x + ${-h}`;
}

/** ` + 2`, ` - 5`, or nothing. */
function tail(k: number): string {
  return k === 0 ? '' : k > 0 ? ` + ${k}` : ` - ${-k}`;
}

/** y = f(x - h) + k. */
function shiftEq(h: number, k: number): string {
  return `y = f(${shiftedX(h)})${tail(k)}`;
}

function units(n: number): string {
  return n === 1 ? '1 unit' : `${n} units`;
}

/** "3 units left and 2 units up". */
function shiftWords(h: number, k: number): string {
  const across = h === 0 ? '' : `${units(Math.abs(h))} ${h > 0 ? 'right' : 'left'}`;
  const up = k === 0 ? '' : `${units(Math.abs(k))} ${k > 0 ? 'up' : 'down'}`;
  return [across, up].filter(Boolean).join(' and ');
}

/**
 * Options in a stable order drawn from the labels themselves.
 *
 * Not from the rng, so one question renders one way (PITFALLS 3.10); turned by
 * a hash of the labels so the answer is not always first.
 */
function fixedChoice(
  labels: { label: string; tex?: boolean }[],
): { options: { id: string; label: string; tex?: boolean }[]; correctId: string } {
  let hash = 0;
  for (const { label } of labels) for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const turn = hash % labels.length;
  const ordered = [...labels.slice(turn), ...labels.slice(0, turn)];
  return {
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, ...option })),
    correctId: `opt${(labels.length - turn) % labels.length}`,
  };
}

function curvePrompt(curve: number): string {
  return `The curve $y = f(x)$, where $f(x) = ${NAMED_CURVES[curve]}$,`;
}

/* ---------- Lesson 1: translations ---------- */

interface ShiftParams {
  /** `eq`: equation given, words asked; `words`: the reverse. */
  dir: 'eq' | 'words';
  curve: number;
  h: number;
  k: number;
}

function sampleShift(rng: Rng, difficulty: number): { h: number; k: number } {
  const step = () => rng.pick(nonZeroRange(-6, 6));
  if (difficulty > 1) return { h: step(), k: step() };
  return rng.chance(0.5) ? { h: step(), k: 0 } : { h: 0, k: step() };
}

/** The four translations a learner might mean: the right one and its sign and axis slips. */
function shiftCandidates(h: number, k: number): [number, number][] {
  if (h !== 0 && k !== 0) return [[h, k], [-h, k], [h, -k], [-h, -k]];
  if (h !== 0) return [[h, 0], [-h, 0], [0, -h], [0, h]];
  return [[0, k], [0, -k], [k, 0], [-k, 0]];
}

/**
 * Which way does it move?
 *
 * A number outside the $f$ moves the curve up by that much. A number inside
 * moves it **across, the opposite way to its sign**: $f(x + 3)$ is three to
 * the left. That is the trap, and each question offers it. Asked both ways
 * round — from the equation to the words and back — and at difficulty 2 with
 * both at once.
 */
const shiftWordsGenerator: Generator<ShiftParams> = {
  id: 'fun-shift-words',
  sample: (rng, difficulty) => ({
    dir: rng.pick(['eq', 'words'] as const),
    curve: rng.int(0, NAMED_CURVES.length - 1),
    ...sampleShift(rng, difficulty),
  }),
  render: (params): Slide => {
    const { dir, curve, h, k } = params;
    const candidates = shiftCandidates(h, k);
    if (dir === 'eq') {
      return {
        kind: 'choice',
        prompt: [
          { kind: 'prose', text: `${curvePrompt(curve)} is translated onto` },
          { kind: 'display', tex: shiftEq(h, k) },
          { kind: 'prose', text: 'Which way does it move?' },
        ],
        ...fixedChoice(candidates.map(([x, y]) => ({ label: `Translate ${shiftWords(x, y)}` }))),
      };
    }
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `${curvePrompt(curve)} is translated ${shiftWords(h, k)}. What is the new curve?` }],
      ...fixedChoice(candidates.map(([x, y]) => ({ label: shiftEq(x, y), tex: true }))),
    };
  },
  solution: ({ h, k }) => {
    const steps: SolutionStep[] = [];
    if (h !== 0) {
      steps.push({
        text: `Inside the bracket, $${shiftedX(h)}$ moves the curve ${units(Math.abs(h))} ${h > 0 ? 'right' : 'left'} — the opposite way to the sign, because $x$ has to be ${Math.abs(h)} ${h > 0 ? 'bigger' : 'smaller'} to give the same output as before.`,
      });
    }
    if (k !== 0) {
      steps.push({ text: `Outside the $f$, $${tail(k).trim()}$ moves every output ${units(Math.abs(k))} ${k > 0 ? 'up' : 'down'}.` });
    }
    steps.push({ tex: shiftEq(h, k) });
    return steps;
  },
};

interface PointParams {
  p: number;
  q: number;
  /** Geometric factors and flips, then the translation: y = ±sy·f(±x/sx − …) + k. */
  sx: number;
  sy: number;
  fx: boolean;
  fy: boolean;
  h: number;
  k: number;
}

/** The image of (p, q): x-coordinates scaled and flipped then shifted, likewise y. */
function imageOf({ p, q, sx, sy, fx, fy, h, k }: PointParams): [number, number] {
  return [(fx ? -1 : 1) * p * sx + h, (fy ? -1 : 1) * q * sy + k];
}

/** The transformed equation, written the way the lessons write it. */
function pointEq({ sx, sy, fx, fy, h, k }: PointParams): string {
  const innerCoef = sx === 1 ? '' : factorTex(1 / sx);
  const inside = fx ? (h === 0 ? `-${innerCoef}x` : `-(${shiftedX(h)})`) : sx !== 1 ? `${innerCoef}x` : shiftedX(h);
  const outer = `${fy ? '-' : ''}${sy === 1 ? '' : factorTex(sy)}f(${inside})`;
  return `y = ${outer}${tail(k)}`;
}

function pointGenerator(
  id: string,
  sample: (rng: Rng, difficulty: number) => PointParams,
  explain: (params: PointParams) => SolutionStep[],
): Generator<PointParams> {
  return {
    id,
    sample,
    render: (params): Slide => {
      const { p, q, sx, sy } = params;
      const [x, y] = imageOf(params);
      const answer = [`${x}`, `${y}`];
      const slips = [
        imageOf({ ...params, h: -params.h, k: -params.k }),
        imageOf({ ...params, sx: 1 / sx, sy: 1 / sy }),
        [p, q],
        [q, p],
        // Near misses, so a bank whose slips all land on the answer still has one.
        [x + 1, y - 1],
      ].flat();
      return {
        kind: 'tiles',
        prompt: [
          { kind: 'prose', text: `The point $(${p}, ${q})$ lies on $y = f(x)$. Where does it go on this curve?` },
          { kind: 'display', tex: pointEq(params) },
        ],
        template: '({0}, {1})',
        bank: bankOf(
          answer,
          slips.filter((value) => Number.isInteger(value)).map(String),
        ),
        answer,
      };
    },
    solution: (params) => {
      const [x, y] = imageOf(params);
      return [...explain(params), { tex: `(${params.p}, ${params.q}) \\to (${x}, ${y})` }];
    },
  };
}

const NO_CHANGE = { sx: 1, sy: 1, fx: false, fy: false, h: 0, k: 0 };

function coordinate(rng: Rng): number {
  return rng.pick(nonZeroRange(-6, 6));
}

/** One line per change, in the learner's numbers. */
function pointSteps({ sx, sy, fx, fy, h, k }: PointParams): SolutionStep[] {
  const steps: SolutionStep[] = [];
  if (sx !== 1) steps.push({ text: `Multiplying $x$ by $${factorTex(1 / sx)}$ inside stretches across by $${factorTex(sx)}$: multiply the $x$-coordinate by $${factorTex(sx)}$.` });
  if (fx) steps.push({ text: 'A minus on the $x$ inside reflects in the $y$-axis: the $x$-coordinate changes sign.' });
  if (sy !== 1) steps.push({ text: `Multiplying by $${factorTex(sy)}$ outside stretches upwards: multiply the $y$-coordinate by $${factorTex(sy)}$.` });
  if (fy) steps.push({ text: 'A minus in front of the $f$ reflects in the $x$-axis: the $y$-coordinate changes sign.' });
  if (h !== 0) steps.push({ text: `$${shiftedX(h)}$ inside moves ${h > 0 ? 'right' : 'left'} ${Math.abs(h)}: ${h > 0 ? 'add' : 'take'} $${Math.abs(h)}$ ${h > 0 ? 'to' : 'from'} the $x$-coordinate.` });
  if (k !== 0) steps.push({ text: `$${tail(k).trim()}$ outside moves ${k > 0 ? 'up' : 'down'} ${Math.abs(k)}: ${k > 0 ? 'add' : 'take'} $${Math.abs(k)}$ ${k > 0 ? 'to' : 'from'} the $y$-coordinate.` });
  if (steps.length > 1 && (sy !== 1 || fy) && k !== 0) {
    steps.push({ text: 'The stretch or reflection comes before the move up or down, as the equation is read from the $f$ outwards.' });
  }
  return steps;
}

/**
 * Where a point goes under a translation.
 *
 * The same sign trap as the words, asked of one point: $(2, 5)$ on
 * $y = f(x)$ is at $(-1, 5)$ on $y = f(x + 3)$. The bank holds the point
 * moved the wrong way.
 */
const shiftPoint = pointGenerator(
  'fun-shift-point',
  (rng, difficulty) => ({ ...NO_CHANGE, p: coordinate(rng), q: coordinate(rng), ...sampleShift(rng, difficulty) }),
  pointSteps,
);

/* ---------- Lesson 2: stretches ---------- */

const STRETCH_FACTORS = [2, 3, 4, 1 / 2, 1 / 3, 1 / 4];

interface StretchParams {
  dir: 'eq' | 'words';
  curve: number;
  /** Geometric factors; 1 means no stretch that way. */
  sx: number;
  sy: number;
}

function stretchEq({ sx, sy }: { sx: number; sy: number }): string {
  const outer = sy === 1 ? '' : factorTex(sy);
  const inner = sx === 1 ? '' : factorTex(1 / sx);
  return `y = ${outer}f(${inner}x)`;
}

function stretchWords({ sx, sy }: { sx: number; sy: number }): string {
  const parts: string[] = [];
  if (sy !== 1) parts.push(`parallel to the y-axis, scale factor ${factorWord(sy)}`);
  if (sx !== 1) parts.push(`parallel to the x-axis, scale factor ${factorWord(sx)}`);
  return `Stretch ${parts.join(', and ')}`;
}

/**
 * Stretches, both ways round.
 *
 * Outside the $f$, a factor stretches **up** by that factor. Inside, it
 * stretches **across** by the reciprocal: $f(3x)$ is a third as wide. So the
 * options are the right stretch, the reciprocal, and the same two on the
 * other axis. Difficulty 2 stretches both ways at once.
 */
const stretchWordsGenerator: Generator<StretchParams> = {
  id: 'fun-stretch-words',
  sample: (rng, difficulty) => {
    const dir = rng.pick(['eq', 'words'] as const);
    const curve = rng.int(0, NAMED_CURVES.length - 1);
    if (difficulty > 1) return { dir, curve, sx: rng.pick(STRETCH_FACTORS), sy: rng.pick([2, 3, 4, 1 / 2, 1 / 3]) };
    const factor = rng.pick(STRETCH_FACTORS);
    return rng.chance(0.5) ? { dir, curve, sx: factor, sy: 1 } : { dir, curve, sx: 1, sy: factor };
  },
  render: (params): Slide => {
    const { dir, curve, sx, sy } = params;
    const both = sx !== 1 && sy !== 1;
    const candidates = both
      ? [{ sx, sy }, { sx: 1 / sx, sy }, { sx, sy: 1 / sy }, { sx: 1 / sx, sy: 1 / sy }]
      : sx !== 1
        ? [{ sx, sy: 1 }, { sx: 1 / sx, sy: 1 }, { sx: 1, sy: 1 / sx }, { sx: 1, sy: sx }]
        : [{ sx: 1, sy }, { sx: 1, sy: 1 / sy }, { sx: sy, sy: 1 }, { sx: 1 / sy, sy: 1 }];
    if (dir === 'eq') {
      return {
        kind: 'choice',
        prompt: [
          { kind: 'prose', text: `${curvePrompt(curve)} is stretched onto` },
          { kind: 'display', tex: stretchEq(params) },
          { kind: 'prose', text: 'Which stretch is it?' },
        ],
        ...fixedChoice(candidates.map((c) => ({ label: stretchWords(c) }))),
      };
    }
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${curvePrompt(curve)} is given a stretch ${stretchWords(params).slice('Stretch '.length).replace(/y-axis/g, '$y$-axis').replace(/x-axis/g, '$x$-axis')}. What is the new curve?`,
        },
      ],
      ...fixedChoice(candidates.map((c) => ({ label: stretchEq(c), tex: true }))),
    };
  },
  solution: ({ sx, sy }) => {
    const steps: SolutionStep[] = [];
    if (sy !== 1) steps.push({ text: `Multiplying the output by $${factorTex(sy)}$ makes every height $${factorTex(sy)}$ times as big: a stretch parallel to the $y$-axis, scale factor $${factorTex(sy)}$.` });
    if (sx !== 1) {
      steps.push({
        text: `Multiplying $x$ by $${factorTex(1 / sx)}$ inside means $x$ reaches each value ${sx < 1 ? 'sooner' : 'later'}: a stretch parallel to the $x$-axis, scale factor $${factorTex(sx)}$ — the reciprocal of the number inside.`,
      });
    }
    steps.push({ tex: stretchEq({ sx, sy }) });
    return steps;
  },
};

/**
 * Where a point goes under a stretch.
 *
 * Up by the factor outside; across by the reciprocal of the factor inside.
 * The $x$-coordinate is drawn as a multiple of what it is divided by, so the
 * answer stays whole. Difficulty 2 stretches both ways.
 */
const stretchPoint = pointGenerator(
  'fun-stretch-point',
  (rng, difficulty) => {
    const inside = rng.pick([2, 3, 1 / 2, 1 / 3]);
    const outside = rng.pick([2, 3, 4, -2]);
    const both = difficulty > 1;
    const across = both || rng.chance(0.5);
    const sx = across ? 1 / inside : 1;
    // A factor below one inside multiplies the x-coordinate; above one divides it.
    const p = across && inside > 1 ? inside * rng.pick(nonZeroRange(-3, 3)) : coordinate(rng);
    const sy = both || !across ? Math.abs(outside) : 1;
    return { ...NO_CHANGE, p, q: coordinate(rng), sx, sy };
  },
  pointSteps,
);

/* ---------- Lesson 3: reflections ---------- */

interface ReflectParams {
  kind: 'x' | 'y' | 'both';
  a: number;
  b: number;
  c: number;
}

/** f(x) = ax^2 + bx + c; b is never zero, so no reflection draws the same curve. */
function reflectRule({ a, b, c }: ReflectParams, sx: number, sy: number): string {
  return polyTex([[sy * a, 2], [sy * sx * b, 1], [sy * c, 0]]);
}

const REFLECT_X = 'Reflection in the x-axis';
const REFLECT_Y = 'Reflection in the y-axis';
const ROTATE = 'Rotation of 180° about the origin';
const REFLECT_DIAGONAL = 'Reflection in the line y = x';

/**
 * Which reflection turns this rule into that one?
 *
 * Asked through the algebra rather than the widget, because the widget grades
 * curves and for a symmetrical curve the two flips can draw the same thing.
 * Here $f$ is a quadratic with an $x$ term, so all three are different: a
 * minus in front changes every sign ($-f(x)$, the $x$-axis); a minus on $x$
 * changes only the odd power ($f(-x)$, the $y$-axis); both at once is a half
 * turn, which difficulty 2 adds.
 */
const reflectWords: Generator<ReflectParams> = {
  id: 'fun-reflect-words',
  sample: (rng, difficulty) => ({
    kind: rng.pick(difficulty > 1 ? (['x', 'y', 'both'] as const) : (['x', 'y'] as const)),
    a: rng.pick([-2, -1, 1, 2, 3]),
    b: rng.pick(nonZeroRange(-6, 6)),
    c: rng.pick(range(-5, 5)),
  }),
  render: (params): Slide => {
    const { kind } = params;
    const sx = kind === 'x' ? 1 : -1;
    const sy = kind === 'y' ? 1 : -1;
    const correct = kind === 'x' ? REFLECT_X : kind === 'y' ? REFLECT_Y : ROTATE;
    const labels = [correct, ...[REFLECT_X, REFLECT_Y, ROTATE, REFLECT_DIAGONAL].filter((l) => l !== correct)];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `$f(x) = ${reflectRule(params, 1, 1)}$. Which single transformation maps $y = f(x)$ onto this curve?` },
        { kind: 'display', tex: `y = ${reflectRule(params, sx, sy)}` },
      ],
      ...fixedChoice(labels.slice(0, 4).map((label) => ({ label }))),
    };
  },
  solution: (params) => {
    const { kind } = params;
    const lines: Record<ReflectParams['kind'], SolutionStep[]> = {
      x: [
        { text: 'Every term has changed sign, so the new rule is $-f(x)$: every height is flipped.' },
        { tex: `-f(x) = ${reflectRule(params, 1, -1)}` },
        { text: 'That is a reflection in the $x$-axis.' },
      ],
      y: [
        { text: 'Only the $x$ term has changed sign, so the new rule is $f(-x)$: $x$ replaced by $-x$.' },
        { tex: `f(-x) = ${reflectRule(params, -1, 1)}` },
        { text: 'That is a reflection in the $y$-axis.' },
      ],
      both: [
        { text: 'The $x^2$ term and the number have changed sign but the $x$ term has not, so the new rule is $-f(-x)$.' },
        { tex: `-f(-x) = ${reflectRule(params, -1, -1)}` },
        { text: 'A reflection in each axis, which together are a rotation of $180^{\\circ}$ about the origin.' },
      ],
    };
    return lines[kind];
  },
};

/**
 * Where a point goes under a reflection.
 *
 * A minus outside flips the $y$-coordinate, a minus inside flips the
 * $x$-coordinate. Difficulty 2 moves the reflected point up or down as well.
 */
const reflectPoint = pointGenerator(
  'fun-reflect-point',
  (rng, difficulty) => {
    const flipX = rng.chance(0.5);
    return {
      ...NO_CHANGE,
      p: coordinate(rng),
      q: coordinate(rng),
      fx: flipX,
      fy: !flipX || (difficulty > 1 && rng.chance(0.3)),
      k: difficulty > 1 ? rng.pick(nonZeroRange(-5, 5)) : 0,
    };
  },
  pointSteps,
);

/* ---------- Lesson 4: combinations ---------- */

type OrderForm = 'stretchUp' | 'upStretch' | 'flipUp' | 'upFlip';

interface CombineOrderParams {
  form: OrderForm;
  a: number;
  c: number;
}

function combineOrderEq({ form, a, c }: CombineOrderParams): string {
  if (form === 'stretchUp') return `y = ${factorTex(a)}f(x)${tail(c)}`;
  if (form === 'upStretch') return `y = ${factorTex(a)}(f(x)${tail(c)})`;
  if (form === 'flipUp') return `y = -f(x)${tail(c)}`;
  return `y = -(f(x)${tail(c)})`;
}

function moveWord(c: number): string {
  return `move ${c > 0 ? 'up' : 'down'} ${Math.abs(c)}`;
}

function stretchWord(a: number): string {
  return `stretch upwards by ${factorWord(a)}`;
}

function sentence(first: string, second: string): string {
  return `${first[0].toUpperCase()}${first.slice(1)}, then ${second}`;
}

/**
 * Two changes to the outputs: which comes first?
 *
 * Read from the $f$ outwards. In $2f(x) + 3$ the output is doubled and then
 * $3$ is added, so it is the stretch and then the move; in $2(f(x) + 3)$ it
 * is the other way round, and the move is doubled too. The options are both
 * orders, and both again with the numbers swapped. Difficulty 2 swaps the
 * stretch for a reflection and allows moves down.
 */
const combineOrder: Generator<CombineOrderParams> = {
  id: 'fun-combine-order',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(hard ? (['flipUp', 'upFlip', 'upStretch', 'stretchUp'] as const) : (['stretchUp', 'upStretch'] as const));
    return drawUntil(
      () => ({ form, a: rng.pick([2, 3, 4, 1 / 2, 1 / 3]), c: hard ? rng.pick(nonZeroRange(-6, 6)) : rng.int(1, 6) }),
      (p) => p.a !== p.c,
      { form, a: 2, c: 3 },
    );
  },
  render: (params): Slide => {
    const { form, a, c } = params;
    const flip = form === 'flipUp' || form === 'upFlip';
    const change = flip ? 'reflect in the x-axis' : stretchWord(a);
    const moveFirst = form === 'upStretch' || form === 'upFlip';
    const right = moveFirst ? sentence(moveWord(c), change) : sentence(change, moveWord(c));
    const wrong = moveFirst ? sentence(change, moveWord(c)) : sentence(moveWord(c), change);
    const others = flip
      ? [
          sentence(change, moveWord(-c)),
          sentence(moveWord(-c), change),
        ]
      : Number.isInteger(c) && c > 0 && Number.isInteger(a)
        ? [sentence(stretchWord(c), moveWord(a)), sentence(moveWord(a), stretchWord(c))]
        : [sentence(change, moveWord(-c)), sentence(moveWord(-c), change)];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'This curve is made from $y = f(x)$ by two changes, one after the other. In which order?' },
        { kind: 'display', tex: combineOrderEq(params) },
      ],
      ...fixedChoice([right, wrong, ...others].map((label) => ({ label }))),
    };
  },
  solution: (params) => {
    const { form, a, c } = params;
    const flip = form === 'flipUp' || form === 'upFlip';
    const moveFirst = form === 'upStretch' || form === 'upFlip';
    const act = flip ? 'made negative' : `multiplied by $${factorTex(a)}$`;
    return [
      { text: 'Follow one output from the $f$ outwards.' },
      {
        text: moveFirst
          ? `Inside the bracket, $${Math.abs(c)}$ is ${c > 0 ? 'added' : 'taken away'} first, and then the whole bracket is ${act}.`
          : `The output is ${act} first, and then $${Math.abs(c)}$ is ${c > 0 ? 'added' : 'taken away'}.`,
      },
      { text: moveFirst ? 'So the move comes first and the stretch or reflection second — which is why the move gets stretched too.' : 'So the stretch or reflection comes first and the move second.' },
    ];
  },
};

/**
 * Where a point goes under a combination.
 *
 * Every change in turn: across (stretch, then shift) and up (stretch or
 * reflection, then shift). Difficulty 2 brings a stretch across as well.
 */
const combinePoint = pointGenerator(
  'fun-combine-point',
  (rng, difficulty) => {
    const hard = difficulty > 1;
    const inside = hard ? rng.pick([2, 1 / 2]) : 1;
    const p = inside === 2 ? 2 * rng.pick(nonZeroRange(-3, 3)) : coordinate(rng);
    return {
      p,
      q: coordinate(rng),
      sx: 1 / inside,
      sy: rng.pick([2, 3, 1]),
      fx: false,
      fy: rng.chance(0.3),
      h: hard ? rng.pick(range(-3, 3)) : rng.pick(nonZeroRange(-4, 4)),
      k: rng.pick(nonZeroRange(-5, 5)),
    };
  },
  pointSteps,
);

/* ---------- Lesson 5: describing a transformation ---------- */

interface DescribeParams {
  a: number;
  h: number;
  k: number;
  /** Whether the move up or down comes before the stretch. */
  moveFirst: boolean;
}

/** The constant on the end: the move, stretched too when it came first. */
function describeConstant({ a, k, moveFirst }: DescribeParams): number {
  return moveFirst ? a * k : k;
}

function describeWordsOf({ a, h, k, moveFirst }: DescribeParams): string {
  const across = `translated ${units(Math.abs(h))} ${h > 0 ? 'right' : 'left'}`;
  const stretch = `stretched parallel to the $y$-axis with scale factor $${a}$`;
  const up = `translated ${units(Math.abs(k))} ${k > 0 ? 'up' : 'down'}`;
  return moveFirst ? `${across}, ${up}, and then ${stretch}` : `${across}, ${stretch}, and then ${up}`;
}

function describeEq(a: number, h: number, constant: number): string {
  return `y = ${a === 1 ? '' : a === -1 ? '-' : a}f(${shiftedX(h)})${tail(constant)}`;
}

/**
 * Words into an equation.
 *
 * A description of three changes, set as the equation they make: the stretch
 * in front, the move across inside with its sign turned round, and the move
 * up on the end. At difficulty 2 the move up comes **before** the stretch, so
 * it is stretched too — $2(f(x) + 3)$ is $2f(x) + 6$ — and the bank holds
 * the unstretched number.
 */
const describeForm: Generator<DescribeParams> = {
  id: 'fun-describe-form',
  choices: (params) => {
    const { a, h } = params;
    const constant = describeConstant(params);
    return options(
      { tex: describeEq(a, h, constant) },
      { tex: describeEq(a, -h, constant) },
      { tex: describeEq(a, h, params.moveFirst ? params.k : a * params.k) },
      { tex: describeEq(a, h, -constant) },
    );
  },
  sample: (rng, difficulty) => ({
    a: rng.int(2, 5),
    h: rng.pick(nonZeroRange(-5, 5)),
    k: rng.pick(nonZeroRange(-5, 5)),
    moveFirst: difficulty > 1 && rng.chance(0.6),
  }),
  render: (params): Slide => {
    const { a, h, k } = params;
    const constant = describeConstant(params);
    const answer = [`${a}`, signedTile(-h), signedTile(constant)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `The curve $y = f(x)$ is ${describeWordsOf(params)}. Write the equation of the new curve.` },
      ],
      template: 'y = {0}f(x {1}) {2}',
      bank: bankOf(answer, [
        `\\tfrac{1}{${a}}`,
        signedTile(h),
        signedTile(params.moveFirst ? k : a * k),
        signedTile(-constant),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, h, k, moveFirst } = params;
    const constant = describeConstant(params);
    return [
      { text: `The move ${h > 0 ? 'right' : 'left'} ${Math.abs(h)} goes inside, with the sign turned round: $f(${shiftedX(h)})$.` },
      { text: `The stretch multiplies the whole output by $${a}$.` },
      moveFirst
        ? { text: `The move ${k > 0 ? 'up' : 'down'} came first, so it is inside the stretch and gets multiplied as well: $${a}(f(${shiftedX(h)})${tail(k)})$.` }
        : { text: `The move ${k > 0 ? 'up' : 'down'} comes last, so it goes on the end as it is.` },
      { tex: describeEq(a, h, constant) },
    ];
  },
};

interface DescribeWordsParams {
  a: number;
  h: number;
  k: number;
}

/**
 * An equation into words.
 *
 * $y = 3f(x + 2) - 1$ is a stretch upwards by $3$, then a move $2$ left and
 * $1$ down. The distractors are the move across the wrong way, the stretch
 * taken after the move up (which would stretch the move as well), and the
 * stretch by the reciprocal. At difficulty 2 the stretch may be a squash.
 */
const describeWords: Generator<DescribeWordsParams> = {
  id: 'fun-describe-words',
  sample: (rng, difficulty) => ({
    a: rng.pick(difficulty > 1 ? [2, 3, 4, 1 / 2, 1 / 3] : [2, 3, 4, 5]),
    h: rng.pick(nonZeroRange(-5, 5)),
    k: rng.pick(nonZeroRange(-5, 5)),
  }),
  render: (params): Slide => {
    const { a, h, k } = params;
    const stretch = stretchWord(a);
    const move = (x: number) => `move ${shiftWords(x, k).replace(/ units?/g, '')}`;
    const labels = [
      sentence(stretch, move(h)),
      sentence(stretch, move(-h)),
      sentence(move(h), stretch),
      sentence(stretchWord(1 / a), move(h)),
    ];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Which describes how this curve is made from $y = f(x)$?' },
        { kind: 'display', tex: `y = ${factorTex(a)}f(${shiftedX(h)})${tail(k)}` },
      ],
      ...fixedChoice(labels.map((label) => ({ label }))),
    };
  },
  solution: ({ a, h, k }) => [
    { text: `Inside: $${shiftedX(h)}$ moves the curve ${Math.abs(h)} ${h > 0 ? 'right' : 'left'}.` },
    { text: `Outside, read from the $f$ outwards: the output is multiplied by $${factorTex(a)}$, then $${Math.abs(k)}$ is ${k > 0 ? 'added' : 'taken away'}.` },
    { text: `So stretch upwards by $${factorTex(a)}$, then move ${Math.abs(h)} ${h > 0 ? 'right' : 'left'} and ${Math.abs(k)} ${k > 0 ? 'up' : 'down'}. Moving across can happen at any point; the move up must come after the stretch.` },
  ],
};

/* ======================================================================
 * Level 3: Graphs of Functions
 * ==================================================================== */

/**
 * Sketching is drawing a curve from its features — where it crosses the axes,
 * the lines it never reaches, what it does at the ends — and reading those
 * features back off a sketch. Every number a learner types, drags or places
 * here is whole: a reciprocal curve is built from its asymptotes and a point
 * chosen so the division comes out, and a parabola from the places a line
 * meets it.
 *
 * Figures set their own $y$ window, since the arms of $\frac{1}{x}$ run off
 * any window fitted to them, and lift the pen at an asymptote.
 */

const Y_AXIS = { x: 0, dashed: false };

/** A y window holding the x-axis and every height given, with a margin. */
function heightsWindow(heights: number[], margin = 1): { yMin: number; yMax: number } {
  return { yMin: Math.min(0, ...heights) - margin, yMax: Math.max(0, ...heights) + margin };
}

/** The y-axis, when the window reaches it. */
function yAxisIn(xMin: number, xMax: number): { x: number; dashed: boolean }[] {
  return xMin < 0 && xMax > 0 ? [Y_AXIS] : [];
}

/** a/(x - h) + k as the learner reads it, the sign of a in front. */
function recipTex(a: number, h: number, k: number): string {
  return `${a < 0 ? '-' : ''}\\frac{${Math.abs(a)}}{${shiftedX(h)}}${tail(k)}`;
}

/** (x - p)(x - q), with a bare x for a root at 0. */
function factorPairTex(p: number, q: number): string {
  const bracket = (r: number) => (r === 0 ? 'x' : `(${shiftedX(r)})`);
  return `${bracket(p)}${bracket(q)}`;
}

/** Options in a stable order whose first entry is the right one, padded with nearby whole numbers. */
function distinctFirst(correct: string, candidates: string[], pad: number, count = 4): string[] {
  const out = [correct];
  for (const candidate of candidates) {
    if (out.length < count && !out.includes(candidate)) out.push(candidate);
  }
  for (let gap = 1; out.length < count; gap += 1) {
    for (const value of [pad + gap, pad - gap]) {
      if (out.length < count && !out.includes(`${value}`)) out.push(`${value}`);
    }
  }
  return out;
}

/* ---------- Lesson 1: intercepts ---------- */

type YInterceptForm = 'factor' | 'vertex' | 'recip' | 'cubic' | 'over';

interface YInterceptParams {
  form: YInterceptForm;
  /** The multiplier: in front of a square, on top of a reciprocal, on the x of a quotient. */
  a: number;
  /** A root, a vertex's x, or where the bottom of a fraction is zero. */
  p: number;
  /** A second root, a vertex's height, the number added, or the constant on top. */
  q: number;
  /** The cubic's third root. */
  r: number;
}

function yRuleTex({ form, a, p, q, r }: YInterceptParams): string {
  if (form === 'factor') return factorPairTex(p, q);
  if (form === 'vertex') return `${a === -1 ? '-' : a}(${shiftedX(p)})^2${tail(q)}`;
  if (form === 'recip') return recipTex(a, p, q);
  if (form === 'cubic') return `(${shiftedX(p)})(${shiftedX(q)})(${shiftedX(r)})`;
  return `\\frac{${linTex(a, q)}}{${shiftedX(p)}}`;
}

function yInterceptOf({ form, a, p, q, r }: YInterceptParams): number {
  if (form === 'factor') return p * q;
  if (form === 'vertex') return a * p * p + q;
  if (form === 'recip') return q - a / p;
  if (form === 'cubic') return -p * q * r;
  return -q / p;
}

/** The rule with 0 written in for x, then tidied, for the worked solution: two lines, so neither runs off a phone. */
function yZeroTex({ form, a, p, q, r }: YInterceptParams): [string, string] {
  if (form === 'factor') return [`(0 ${signedTile(-p)})(0 ${signedTile(-q)})`, `${br(-p)} \\times ${br(-q)}`];
  if (form === 'vertex') return [`${a}(0 ${signedTile(-p)})^2 ${signedTile(q)}`, `${a} \\times ${p * p} ${signedTile(q)}`];
  if (form === 'recip') return [`${a < 0 ? '-' : ''}\\frac{${Math.abs(a)}}{0 ${signedTile(-p)}} ${signedTile(q)}`, `${-a / p} ${signedTile(q)}`];
  if (form === 'cubic') return [`(0 ${signedTile(-p)})(0 ${signedTile(-q)})(0 ${signedTile(-r)})`, `${br(-p)} \\times ${br(-q)} \\times ${br(-r)}`];
  return [`\\frac{${a} \\times 0 ${signedTile(q)}}{0 ${signedTile(-p)}}`, `\\frac{${q}}{${-p}}`];
}

/**
 * Where a curve crosses the $y$-axis: at $x = 0$, so at $f(0)$.
 *
 * Put 0 in for every $x$ and the brackets give up their constants. The slip
 * with $(x - 3)(x + 2)$ is to multiply $3$ by $2$ and keep the signs as
 * written; difficulty 2 brings a reciprocal, a quotient and a cubic, where the
 * sign of the answer has to be followed through three negatives.
 */
const yIntercept: Generator<YInterceptParams> = {
  id: 'fun-y-intercept',
  choices: (params) => {
    const { form, a, p, q, r } = params;
    const v = yInterceptOf(params);
    if (form === 'factor') return numberChoices(v, -v, p + q, -(p + q));
    if (form === 'vertex') return numberChoices(v, (a * p) ** 2 + q, a * p + q, q);
    if (form === 'recip') return numberChoices(v, q + a / p, q, a / p);
    if (form === 'cubic') return numberChoices(v, -v, p + q + r, p * q);
    return numberChoices(v, -v, q, a);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(hard ? (['recip', 'cubic', 'over', 'vertex'] as const) : (['factor', 'vertex'] as const));
    if (form === 'factor') {
      const p = rng.pick(nonZeroRange(-6, 6));
      const q = rng.pick(nonZeroRange(-6, 6).filter((value) => value !== p));
      return { form, a: 1, p, q, r: 0 };
    }
    if (form === 'vertex') {
      const a = rng.pick(hard ? [-3, -2, -1, 2, 3, 4] : [2, 3, 4]);
      return { form, a, p: rng.pick(nonZeroRange(-4, 4)), q: rng.pick(nonZeroRange(-9, 9)), r: 0 };
    }
    if (form === 'recip') {
      const p = rng.pick(nonZeroRange(-4, 4));
      return { form, a: p * rng.pick(nonZeroRange(-4, 4)), p, q: rng.pick(nonZeroRange(-6, 6)), r: 0 };
    }
    if (form === 'cubic') {
      const [p, q, r] = rng.sample(nonZeroRange(-4, 4), 3);
      return { form, a: 1, p, q, r };
    }
    const p = rng.pick(nonZeroRange(-4, 4));
    return { form, a: rng.pick(nonZeroRange(-5, 5)), p, q: p * rng.pick(nonZeroRange(-5, 5)), r: 0 };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Where does $y = ${yRuleTex(params)}$ cross the $y$-axis? Give the $y$-coordinate.`,
      },
    ],
    lead: 'y =',
    keypad: [],
    answer: `${yInterceptOf(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const v = yInterceptOf(params);
    const [written, tidied] = yZeroTex(params);
    return [
      { text: 'The $y$-axis is the line $x = 0$, so the curve crosses it at $f(0)$: write $0$ for every $x$.' },
      { tex: `f(0) = ${written}` },
      { tex: `${tidied} = ${v}` },
      { text: `It crosses the $y$-axis at $(0, ${v})$.` },
    ];
  },
};

interface RootSliderParams {
  form: 'factor' | 'expanded' | 'recip';
  /** The roots of a quadratic, p < q; for a reciprocal, p is its one root. */
  p: number;
  q: number;
  side: 'left' | 'right';
  /** The reciprocal a/(x - h) + k. */
  a: number;
  h: number;
  k: number;
}

function rootAnswer({ form, p, q, side }: RootSliderParams): number {
  if (form === 'recip') return p;
  return side === 'left' ? p : q;
}

function rootRuleTex({ form, p, q, a, h, k }: RootSliderParams): string {
  if (form === 'factor') return factorPairTex(p, q);
  if (form === 'expanded') return polyTex([[1, 2], [-(p + q), 1], [p * q, 0]]);
  return recipTex(a, h, k);
}

/**
 * An $x$-intercept, found from the rule and dragged to on the curve.
 *
 * The figure has no numbers on its axis, so the picture confirms rather than
 * answers: the learner works out where $y = 0$ and watches the line land on
 * the crossing. Difficulty 2 expands the quadratic, so it has to be factorised
 * first, or gives a reciprocal, whose one crossing comes from solving
 * $\frac{a}{x - h} = -k$.
 */
const rootSlider: Generator<RootSliderParams> = {
  id: 'fun-root-slider',
  sample: (rng, difficulty) => {
    const form = rng.pick(difficulty > 1 ? (['expanded', 'recip', 'expanded'] as const) : (['factor'] as const));
    const side = rng.pick(['left', 'right'] as const);
    if (form === 'recip') {
      return drawUntil(
        () => {
          const k = rng.pick(nonZeroRange(-3, 3));
          const p = rng.pick(nonZeroRange(-5, 5));
          const h = rng.pick(nonZeroRange(-5, 5));
          return { form, p, q: 0, side, a: k * (h - p), h, k };
        },
        (params) => params.h !== params.p && Math.abs(params.a) <= 12,
        { form, p: 3, q: 0, side, a: 2, h: 1, k: 1 },
      );
    }
    const [first, second] = rng.sample(nonZeroRange(-5, 5), 2);
    const p = Math.min(first, second);
    const q = Math.max(first, second);
    if (q - p > 7) return { form, p: Math.max(p, q - 7), q, side, a: 1, h: 0, k: 0 };
    return { form, p, q, side, a: 1, h: 0, k: 0 };
  },
  render: (params): Slide => {
    const { form, p, q, side, a, h, k } = params;
    const recip = form === 'recip';
    const f = recip ? (x: number) => a / (x - h) + k : (x: number) => (x - p) * (x - q);
    const window = recip ? { yMin: k - 6, yMax: k + 6 } : heightsWindow([-(((q - p) / 2) ** 2), 4]);
    const rule = rootRuleTex(params);
    const text = recip
      ? `$y = ${rule}$ crosses the $x$-axis once. Slide the line to where it crosses.`
      : `$y = ${rule}$ crosses the $x$-axis twice. ${form === 'expanded' ? 'Factorise it, then slide' : 'Slide'} the line to the crossing on the ${side}.`;
    return {
      kind: 'slider',
      prompt: [{ kind: 'prose', text }],
      min: -6,
      max: 6,
      step: 1,
      answer: rootAnswer(params),
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -6,
          xMax: 6,
          ...window,
          curves: [{ f, breaks: recip }],
          verticals: [Y_AXIS],
          label: recip ? 'A reciprocal curve crossing the x-axis once' : 'A parabola crossing the x-axis twice',
        }),
        ...markerWindow(-6, 6),
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { form, p, q, side, a, h, k } = params;
    if (form === 'recip') {
      return [
        { text: 'On the $x$-axis $y = 0$, so solve the rule equal to $0$.' },
        { tex: `${recipTex(a, h, k)} = 0` },
        { tex: `\\frac{${a}}{${shiftedX(h)}} = ${-k}` },
        { tex: `${shiftedX(h)} = ${a / -k}` },
        { tex: `x = ${p}` },
      ];
    }
    const steps: SolutionStep[] = [];
    if (form === 'expanded') {
      steps.push({ text: 'Factorise: two numbers that multiply to the constant and add to the $x$ coefficient.' });
      steps.push({ tex: `${rootRuleTex(params)} = ${factorPairTex(p, q)}` });
    }
    steps.push({ text: 'On the $x$-axis $y = 0$, and a product is $0$ when one of its brackets is.' });
    steps.push({ tex: `x = ${p} \\text{ or } x = ${q}` });
    steps.push({ text: `The crossing on the ${side} is $x = ${side === 'left' ? p : q}$.` });
    return steps;
  },
};

interface InterceptsParams {
  form: 'line' | 'recip';
  /** A line's gradient, or the reciprocal's numerator. */
  a: number;
  /** A line's root, or the reciprocal's vertical asymptote. */
  h: number;
  /** The reciprocal's horizontal asymptote. */
  k: number;
}

function interceptsOf({ form, a, h, k }: InterceptsParams): { y0: number; x0: number } {
  if (form === 'line') return { y0: -a * h, x0: h };
  return { y0: k - a / h, x0: h - a / k };
}

function interceptsRuleTex(params: InterceptsParams): string {
  const { form, a, h, k } = params;
  return form === 'line' ? linTex(a, -a * h) : recipTex(a, h, k);
}

/**
 * Both intercepts, as coordinates.
 *
 * The two halves ask opposite things — put $x = 0$ in, or solve $y = 0$ —
 * and the tiles make the learner keep them apart: the $y$-intercept's number
 * goes in the second place of its pair and the $x$-intercept's in the first.
 * Difficulty 2 asks it of a reciprocal curve, built so both come out whole.
 */
const intercepts: Generator<InterceptsParams> = {
  id: 'fun-intercepts',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      return { form: 'line', a: rng.pick(nonZeroRange(-5, 5)), h: rng.pick(nonZeroRange(-6, 6)), k: 0 };
    }
    return drawUntil(
      () => ({
        form: 'recip' as const,
        a: rng.pick(nonZeroRange(-12, 12)),
        h: rng.pick(nonZeroRange(-4, 4)),
        k: rng.pick(nonZeroRange(-4, 4)),
      }),
      (params) => {
        const { y0, x0 } = interceptsOf(params);
        return params.a % params.h === 0 && params.a % params.k === 0 && y0 !== 0 && x0 !== 0;
      },
      { form: 'recip', a: 6, h: 3, k: 3 },
    );
  },
  render: (params): Slide => {
    const { form, a, h, k } = params;
    const { y0, x0 } = interceptsOf(params);
    const answer = [`${y0}`, `${x0}`];
    const distractors =
      form === 'line'
        ? [`${-y0}`, `${-x0}`, `${a}`, `${x0 + 1}`]
        : [`${-y0}`, `${-x0}`, `${k}`, `${h}`, `${-a / h}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Complete the points where $y = ${interceptsRuleTex(params)}$ meets the $y$-axis and the $x$-axis.`,
        },
      ],
      template: '(0, {0}) \\text{ and } ({1}, 0)',
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  solution: (params) => {
    const { form, a, h, k } = params;
    const { y0, x0 } = interceptsOf(params);
    const rule = interceptsRuleTex(params);
    if (form === 'line') {
      return [
        { text: `On the $y$-axis $x = 0$, so $y = ${a} \\times 0 ${signedTile(-a * h)} = ${y0}$.` },
        { text: 'On the $x$-axis $y = 0$, so solve:' },
        { tex: `${rule} = 0 \\implies x = ${x0}` },
        { tex: `(0, ${y0}) \\text{ and } (${x0}, 0)` },
      ];
    }
    return [
      { text: `On the $y$-axis $x = 0$: $y = \\frac{${a}}{${-h}} ${signedTile(k)} = ${y0}$.` },
      { text: `On the $x$-axis $y = 0$: $\\frac{${a}}{${shiftedX(h)}} = ${-k}$, so $${shiftedX(h)} = ${-a / k}$.` },
      { tex: `(0, ${y0}) \\text{ and } (${x0}, 0)` },
    ];
  },
};

interface GraphRuleParams {
  /** 1 for a parabola opening upwards, -1 for one opening downwards. */
  s: number;
  p: number;
  q: number;
}

function signedPairTex(s: number, p: number, q: number): string {
  return `y = ${s < 0 ? '-' : ''}${factorPairTex(p, q)}`;
}

/**
 * The rule read off a sketch.
 *
 * The roots are counted on squared paper and each becomes a bracket with its
 * sign turned round — a root at $x = 3$ is $(x - 3)$. The options are the
 * right roots, the signs kept as seen, and one of each; difficulty 2 lets the
 * curve open downwards and offers the rule without the minus in front.
 */
const graphRule: Generator<GraphRuleParams> = {
  id: 'fun-graph-rule',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const [first, second] = rng.sample(nonZeroRange(-5, 5), 2);
        return {
          s: difficulty > 1 ? rng.pick([1, -1]) : 1,
          p: Math.min(first, second),
          q: Math.max(first, second),
        };
      },
      ({ p, q }) => p !== -q && q - p <= 5,
      { s: 1, p: -1, q: 3 },
    ),
  render: (params): Slide => {
    const { s, p, q } = params;
    const f = (x: number) => s * (x - p) * (x - q);
    const labels = [
      signedPairTex(s, p, q),
      signedPairTex(s, -p, -q),
      signedPairTex(s, p, -q),
      s > 0 ? signedPairTex(s, -p, q) : signedPairTex(-s, p, q),
    ];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: -6,
            xMax: 6,
            yMin: -7,
            yMax: 7,
            grid: true,
            height: 180,
            curves: [{ f }],
            marks: [
              { x: p, y: 0 },
              { x: q, y: 0 },
            ],
            label: `A parabola opening ${s > 0 ? 'upwards' : 'downwards'} and crossing the x-axis twice`,
          }),
        },
        { kind: 'prose', text: 'Each square is one unit. Which rule draws this curve?' },
      ],
      ...fixedChoice(labels.map((label) => ({ label, tex: true }))),
    };
  },
  solution: ({ s, p, q }) => {
    const steps: SolutionStep[] = [
      { text: `The curve crosses the $x$-axis at $x = ${p}$ and $x = ${q}$.` },
      { text: `A root at $x = r$ comes from a bracket $(x - r)$, so these are $(${shiftedX(p)})$ and $(${shiftedX(q)})$ — each sign turned round.` },
    ];
    if (s < 0) steps.push({ text: 'The curve opens downwards, so the rule has a minus in front.' });
    steps.push({ tex: signedPairTex(s, p, q) });
    return steps;
  },
};

/* ---------- Lesson 2: graphs of a/(x - h) + k ---------- */

interface AsymptoteParams {
  /** `plain` a/(x - h) + k; `scaled` a/(mx - mh) + k; `flipped` a/(h - x) + k. */
  form: 'plain' | 'scaled' | 'flipped';
  a: number;
  h: number;
  k: number;
  m: number;
}

/** The fraction on its own, without the + k. */
function asymptoteFractionTex({ form, a, h, m }: AsymptoteParams): string {
  const sign = a < 0 ? '-' : '';
  if (form === 'scaled') return `${sign}\\frac{${Math.abs(a)}}{${linTex(m, -m * h)}}`;
  if (form === 'flipped') return `${sign}\\frac{${Math.abs(a)}}{${h} - x}`;
  return `${sign}\\frac{${Math.abs(a)}}{${shiftedX(h)}}`;
}

function asymptoteRuleTex(params: AsymptoteParams): string {
  return `${asymptoteFractionTex(params)}${tail(params.k)}`;
}

/** The bottom of the fraction, as the learner reads it. */
function asymptoteBottomTex({ form, h, m }: AsymptoteParams): string {
  if (form === 'scaled') return linTex(m, -m * h);
  if (form === 'flipped') return `${h} - x`;
  return shiftedX(h);
}

function asymptoteCurve({ form, a, h, k, m }: AsymptoteParams): (x: number) => number {
  if (form === 'scaled') return (x) => a / (m * (x - h)) + k;
  if (form === 'flipped') return (x) => a / (h - x) + k;
  return (x) => a / (x - h) + k;
}

function sampleAsymptote(rng: Rng, difficulty: number): AsymptoteParams {
  const hard = difficulty > 1;
  return {
    form: hard ? rng.pick(['scaled', 'flipped', 'scaled'] as const) : 'plain',
    a: rng.pick(nonZeroRange(-6, 6)),
    h: rng.pick(nonZeroRange(-5, 5)),
    k: rng.pick(nonZeroRange(-4, 4)),
    m: rng.int(2, 4),
  };
}

function asymptoteSteps(params: AsymptoteParams): SolutionStep[] {
  const { h, k } = params;
  return [
    { text: 'The curve cannot exist where the bottom of the fraction is zero, so there is a vertical asymptote there.' },
    { tex: `${asymptoteBottomTex(params)} = 0 \\implies x = ${h}` },
    { text: `As $x$ grows, the fraction gets closer and closer to $0$, so $y$ heads for $${k}$ without reaching it.` },
    { tex: `x = ${h}, \\quad y = ${k}` },
  ];
}

/**
 * The vertical asymptote, dragged to on the curve.
 *
 * It is where the bottom of the fraction is zero. Difficulty 2 hides it: in
 * $\frac{a}{2x - 6}$ the number on show is $6$ and the asymptote is at $3$,
 * and in $\frac{a}{3 - x}$ it is at $3$ although the sign reads the other way.
 */
const asymptoteSlider: Generator<AsymptoteParams> = {
  id: 'fun-asymptote-slider',
  sample: sampleAsymptote,
  render: (params): Slide => {
    const { k } = params;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `$y = ${asymptoteRuleTex(params)}$ has a vertical asymptote, a line $x = h$ the curve never reaches. Slide the line to it.`,
        },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: params.h,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -6,
          xMax: 6,
          yMin: k - 6,
          yMax: k + 6,
          curves: [{ f: asymptoteCurve(params), breaks: true }],
          verticals: [Y_AXIS],
          label: 'A reciprocal curve in two pieces',
        }),
        ...markerWindow(-6, 6),
        axis: 'x',
      },
    };
  },
  solution: (params) => asymptoteSteps(params).slice(0, 2),
};

/**
 * Both asymptotes, as equations.
 *
 * $x = h$ from the bottom of the fraction and $y = k$ from the number added
 * on. The bank holds each with its sign turned round, the numerator, and at
 * difficulty 2 the number showing in $2x - 6$ in place of the $3$ it hides.
 */
const asymptoteTiles: Generator<AsymptoteParams> = {
  id: 'fun-asymptote-tiles',
  sample: sampleAsymptote,
  render: (params): Slide => {
    const { form, a, h, k, m } = params;
    const answer = [`${h}`, `${k}`];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Complete the asymptotes of $y = ${asymptoteRuleTex(params)}$.` }],
      template: 'x = {0}, \\quad y = {1}',
      bank: bankOf(answer, [`${-h}`, `${-k}`, `${a}`, form === 'scaled' ? `${m * h}` : `${h + k}`]),
      answer,
    };
  },
  solution: asymptoteSteps,
};

/**
 * From the rule to each asymptote, one question at a time.
 *
 * First where the bottom is zero, then what the fraction does as $x$ grows —
 * which is the reason for the horizontal one, and the step a learner who only
 * remembers "$y = k$" has never thought about.
 */
const asymptoteFlow: Generator<AsymptoteParams> = {
  id: 'fun-asymptote-flow',
  sample: sampleAsymptote,
  render: (params): Slide => {
    const { form, a, h, k, m } = params;
    const alternative = form === 'scaled' ? m * h : a;
    const wrong = alternative === h || alternative === -h ? h + Math.sign(h) : alternative;
    const zeros = [h, -h, wrong].sort((x, y) => x - y);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Find both asymptotes of this curve.' }],
      subject: `y = ${asymptoteRuleTex(params)}`,
      steps: [
        {
          id: 'bottom',
          ask: `Which value of $x$ makes the bottom, $${asymptoteBottomTex(params)}$, zero?`,
          branches: zeros.map((value) => ({ label: `$x = ${value}$`, to: 'far' })),
        },
        {
          id: 'far',
          ask: `As $x$ gets very large, what does $${asymptoteFractionTex(params)}$ head for?`,
          branches: [
            // Says nothing of the first answer, which may have been wrong.
            { label: '$0$', outcome: `So $y$ heads for $${k}$, and the horizontal asymptote is $y = ${k}$.` },
            { label: `$${a}$`, outcome: `So $y$ heads for $${a + k}$.` },
            { label: 'It grows without limit', outcome: 'So $y$ has no horizontal asymptote.' },
          ],
        },
      ],
      answer: [`$x = ${h}$`, '$0$'],
    };
  },
  solution: asymptoteSteps,
};

interface FindKParams {
  form: 'point' | 'yAxis' | 'xAxis';
  a: number;
  h: number;
  k: number;
  /** How far across from the vertical asymptote the given point is. */
  d: number;
}

/** The point the question gives. */
function findKPoint({ form, a, h, k, d }: FindKParams): [number, number] {
  if (form === 'yAxis') return [0, k - a / h];
  if (form === 'xAxis') return [h + d, 0];
  return [h + d, k + a / d];
}

/**
 * The number added on, from one point on the curve.
 *
 * Put the point in and $k$ is all that is left to find. Difficulty 2 gives
 * the point as where the curve crosses an axis, so the learner has to know
 * which coordinate is $0$.
 */
const findK: Generator<FindKParams> = {
  id: 'fun-asymptote-k',
  sample: (rng, difficulty) => {
    const h = rng.pick(nonZeroRange(-4, 4));
    const k = rng.pick(nonZeroRange(-6, 6));
    if (difficulty <= 1) {
      const d = rng.pick(nonZeroRange(-3, 3));
      return { form: 'point', a: d * rng.pick(nonZeroRange(-4, 4)), h, k, d };
    }
    const form = rng.pick(['yAxis', 'xAxis'] as const);
    if (form === 'yAxis') return { form, a: h * rng.pick(nonZeroRange(-4, 4)), h, k, d: -h };
    const d = rng.pick(nonZeroRange(-4, 4));
    return { form, a: -k * d, h, k, d };
  },
  render: (params): Slide => {
    const { form, a, h } = params;
    const [p, q] = findKPoint(params);
    // At the origin the curve crosses both axes, so naming one would mislead.
    const where =
      p === 0 && q === 0
        ? 'passes through the origin, $(0, 0)$'
        : form === 'point'
          ? `passes through $(${p}, ${q})$`
          : form === 'yAxis'
            ? `crosses the $y$-axis at $(0, ${q})$`
            : `crosses the $x$-axis at $(${p}, 0)$`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `The curve $y = ${recipTex(a, h, 0)} + k$ ${where}. Find $k$.` }],
      lead: 'k =',
      keypad: [],
      answer: `${params.k}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, h, k } = params;
    const [p, q] = findKPoint(params);
    const fraction = a / (p - h);
    return [
      { text: `Put $x = ${p}$ and $y = ${q}$ into the rule.` },
      { tex: `${q} = \\frac{${a}}{${br(p)} ${signedTile(-h)}} + k` },
      { tex: `${q} = ${fraction} + k` },
      { tex: `k = ${q} ${signedTile(-fraction)} = ${k}` },
    ];
  },
};

/* ---------- Lesson 3: the ends ---------- */

type EndForm = 'ratio' | 'recip' | 'square' | 'cubic' | 'exp';

interface EndParams {
  form: EndForm;
  end: 'left' | 'right';
  a: number;
  b: number;
  /** A shift or a constant; for `exp`, 1 for 2^x and -1 for 2^{-x}. */
  h: number;
}

type Limit = number | 'inf' | '-inf';

function endRuleTex({ form, a, b, h }: EndParams): string {
  if (form === 'ratio') return `\\frac{${linTex(a, b)}}{${shiftedX(h)}}`;
  if (form === 'recip') return recipTex(a, h, b);
  if (form === 'square') return polyTex([[a, 2], [b, 1], [h, 0]]);
  if (form === 'cubic') return polyTex([[a, 3], [b, 1], [h, 0]]);
  return `${a === 1 ? '' : `${a} \\times `}2^{${h > 0 ? 'x' : '-x'}} ${signedTile(b)}`;
}

function limitAt({ form, a, b, h }: EndParams, end: 'left' | 'right'): Limit {
  const up = (positive: boolean): Limit => (positive ? 'inf' : '-inf');
  if (form === 'ratio') return a;
  if (form === 'recip') return b;
  if (form === 'square') return up(a > 0);
  if (form === 'cubic') return up(end === 'right' ? a > 0 : a < 0);
  const grows = (h > 0) === (end === 'right');
  return grows ? 'inf' : b;
}

function limitTex(limit: Limit): string {
  return limit === 'inf' ? '\\infty' : limit === '-inf' ? '-\\infty' : `${limit}`;
}

function sampleEnd(rng: Rng, forms: readonly EndForm[]): EndParams {
  const form = rng.pick(forms);
  const end = rng.pick(['left', 'right'] as const);
  if (form === 'ratio') {
    return drawUntil(
      () => ({ form, end, a: rng.pick(nonZeroRange(-6, 6)), b: rng.pick(nonZeroRange(-9, 9)), h: rng.pick(nonZeroRange(-5, 5)) }),
      ({ a, b, h }) => b !== a && b !== -a * h,
      { form, end, a: 2, b: 3, h: 1 },
    );
  }
  if (form === 'recip') {
    return drawUntil(
      () => ({ form, end, a: rng.pick(nonZeroRange(-6, 6)), b: rng.pick(nonZeroRange(-6, 6)), h: rng.pick(nonZeroRange(-5, 5)) }),
      ({ a, b }) => a !== b,
      { form, end, a: 2, b: 3, h: 1 },
    );
  }
  if (form === 'exp') return { form, end, a: rng.int(1, 4), b: rng.pick(nonZeroRange(-6, 6)), h: rng.pick([1, -1]) };
  return { form, end, a: rng.pick(nonZeroRange(-4, 4)), b: rng.pick(nonZeroRange(-6, 6)), h: rng.pick(nonZeroRange(-9, 9)) };
}

/** One line of working per form, for the end asked about. */
function endSteps(params: EndParams, end: 'left' | 'right'): SolutionStep[] {
  const { form, a, b, h } = params;
  const big = end === 'right' ? 'large and positive' : 'large and negative';
  const limit = limitTex(limitAt(params, end));
  if (form === 'ratio') {
    return [
      { text: `When $x$ is ${big}, the numbers added on hardly matter: $\\frac{${linTex(a, b)}}{${shiftedX(h)}}$ is nearly $\\frac{${termTex(a, 1)}}{x} = ${a}$.` },
      { tex: `y \\to ${limit}` },
    ];
  }
  if (form === 'recip') {
    return [
      { text: `When $x$ is ${big}, the bottom of the fraction is huge, so the fraction heads for $0$ and $y$ for $${b}$.` },
      { tex: `y \\to ${limit}` },
    ];
  }
  if (form === 'exp') {
    const power = h > 0 ? '2^x' : '2^{-x}';
    const shrinks = limitAt(params, end) !== 'inf';
    return [
      {
        text: shrinks
          ? `When $x$ is ${big}, $${power}$ is a tiny positive number, so $y$ heads for $${b}$.`
          : `When $x$ is ${big}, $${power}$ doubles again and again without limit.`,
      },
      { tex: `y \\to ${limit}` },
    ];
  }
  const power = form === 'square' ? 2 : 3;
  return [
    { text: `When $x$ is ${big}, the $x^{${power}}$ term outgrows everything else, so $y$ follows $${termTex(a, power)}$.` },
    { text: `${form === 'square' ? 'A square is positive either side' : `A cube keeps the sign of $x$`}, and it is multiplied by $${a}$.` },
    { tex: `y \\to ${limit}` },
  ];
}

/**
 * What the curve does at one end, from four.
 *
 * Every family met so far, one question each: a quotient of lines heads for
 * the ratio of its $x$ terms, a reciprocal for the number added, a square
 * and a cube run away — the cube in opposite directions at the two ends —
 * and an exponential does one at one end and the other at the other.
 */
const endChoice: Generator<EndParams> = {
  id: 'fun-end-choice',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? sampleEnd(rng, ['cubic', 'exp', 'ratio', 'recip'])
      : { ...sampleEnd(rng, ['ratio', 'recip', 'square']), end: 'right' },
  render: (params): Slide => {
    const { a, b, end } = params;
    const limit = limitAt(params, end);
    const labels = distinctFirst(limitTex(limit), ['\\infty', '-\\infty', '0', `${a}`, `${b}`], typeof limit === 'number' ? limit : 0);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `As $x \\to ${end === 'right' ? '\\infty' : '-\\infty'}$, what happens to $y = ${endRuleTex(params)}$?`,
        },
      ],
      ...fixedChoice(labels.map((value) => ({ label: `y \\to ${value}`, tex: true }))),
    };
  },
  solution: (params) => endSteps(params, params.end),
};

/**
 * Both ends at once, as tiles.
 *
 * The left end first, then the right. A quotient and a reciprocal head for the
 * same number both ways, which is what makes the line a horizontal
 * asymptote; at difficulty 2 a cube and an exponential do different things
 * at the two ends.
 */
const limitTiles: Generator<EndParams> = {
  id: 'fun-limit-tiles',
  sample: (rng, difficulty) => sampleEnd(rng, difficulty > 1 ? ['cubic', 'exp', 'cubic', 'ratio'] : ['square', 'recip', 'ratio']),
  render: (params): Slide => {
    const { a, b } = params;
    const answer = [limitTex(limitAt(params, 'left')), limitTex(limitAt(params, 'right'))];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Where does $y = ${endRuleTex(params)}$ head at each end: first on the left, then on the right?` }],
      template: 'x \\to -\\infty: \\; y \\to {0}, \\quad x \\to \\infty: \\; y \\to {1}',
      bank: bankOf(answer, ['\\infty', '-\\infty', '0', `${a}`, `${b}`]),
      answer,
    };
  },
  solution: (params) => [...endSteps(params, 'left'), ...endSteps(params, 'right')],
};

interface LeadParams {
  form: 'same' | 'top' | 'bottom';
  /** The highest power, 1 or 2, on the side it sits. */
  deg: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

function leadTop({ form, deg, a, b }: LeadParams): string {
  if (form === 'bottom') return deg === 2 ? linTex(a, b) : `${a}`;
  return polyTex([[a, form === 'top' ? 2 : deg], [b, 0]]);
}

function leadBottom({ form, deg, c, d }: LeadParams): string {
  return polyTex([[c, form === 'top' ? 1 : deg], [d, 0]]);
}

const HIGHER_TOP = 'Higher on the top';
const HIGHER_SAME = 'The same on both';
const HIGHER_BOTTOM = 'Higher on the bottom';

/**
 * The end of a quotient, from its leading terms.
 *
 * Only the highest powers matter once $x$ is large. The top's higher: $y$
 * runs away. The bottom's higher: $y$ dies to $0$. The same: $y$ heads for
 * the ratio of their coefficients — and the slip there is to take the
 * top's coefficient alone, or the constants' ratio, which are the other
 * branches.
 */
const leadingFlow: Generator<LeadParams> = {
  id: 'fun-leading-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick(['same', 'same', 'top', 'bottom'] as const);
    const c = rng.pick(hard ? nonZeroRange(-4, 4) : [1, 2, 3, 4]);
    const q = rng.pick(hard ? nonZeroRange(-5, 5) : range(1, 5));
    return {
      form,
      deg: hard ? 2 : 1,
      // Whole even where the leading powers differ, since the ratio branch is
      // still on offer to a learner who says they are the same.
      a: c * q,
      b: rng.pick(nonZeroRange(-9, 9)),
      c,
      d: rng.pick(nonZeroRange(-9, 9)),
    };
  },
  render: (params): Slide => {
    const { form, a, b, c, d } = params;
    const q = a / c;
    const ratios = distinctFirst(`${q}`, [`${a}`, Number.isInteger(b / d) ? `${b / d}` : `${-q}`, `${-q}`], q, 3)
      .map(Number)
      .sort((x, y) => x - y);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'What does $y$ head for as $x$ grows?' }],
      subject: `y = \\frac{${leadTop(params)}}{${leadBottom(params)}}`,
      steps: [
        {
          id: 'compare',
          ask: 'Where is the highest power of $x$?',
          branches: [
            { label: HIGHER_TOP, outcome: 'The top outgrows the bottom, so $y$ runs away without limit.' },
            { label: HIGHER_SAME, to: 'ratio' },
            { label: HIGHER_BOTTOM, outcome: 'The bottom outgrows the top, so $y$ heads for $0$.' },
          ],
        },
        {
          id: 'ratio',
          ask: 'Only the leading terms matter. What does $y$ head for?',
          branches: ratios.map((value) => ({ label: `$${value}$`, outcome: `So $y$ heads for $${value}$.` })),
        },
      ],
      answer: form === 'same' ? [HIGHER_SAME, `$${q}$`] : [form === 'top' ? HIGHER_TOP : HIGHER_BOTTOM],
    };
  },
  solution: (params) => {
    const { form, deg, a, c } = params;
    const top = leadTop(params);
    const bottom = leadBottom(params);
    if (form === 'same') {
      const power = deg === 2 ? 'x^2' : 'x';
      return [
        { text: `Both have $${power}$ as their highest power. When $x$ is large the rest hardly matters:` },
        { tex: `\\frac{${top}}{${bottom}} \\approx \\frac{${termTex(a, deg === 2 ? 2 : 1)}}{${termTex(c, deg === 2 ? 2 : 1)}} = ${a / c}` },
        { text: `So $y$ heads for $${a / c}$.` },
      ];
    }
    return form === 'top'
      ? [
          { text: `The top has $x^2$ and the bottom only $x$, so the top grows faster.` },
          { text: `$\\frac{${top}}{${bottom}}$ runs away without limit.` },
        ]
      : [
          { text: 'The bottom has the higher power, so it grows faster than the top.' },
          { text: `$\\frac{${top}}{${bottom}}$ heads for $0$.` },
        ];
  },
};

interface DivideParams {
  deg: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

/** `3 + \frac{5}{x}` or `3 - \frac{5}{x^2}`: a term after dividing by x^deg. */
function dividedTex(lead: number, rest: number, deg: number): string {
  const power = deg === 2 ? 'x^2' : 'x';
  return `${lead} ${rest < 0 ? '-' : '+'} \\frac{${Math.abs(rest)}}{${power}}`;
}

/**
 * Dividing top and bottom by $x$, then letting $x$ grow.
 *
 * The working behind "it heads for the ratio": every term over $x$ dies, and
 * what is left is two numbers. The bank at each stage holds the line a
 * learner gets by dividing only some of the terms, or by letting the wrong
 * ones die.
 */
const divideSteps: Generator<DivideParams> = {
  id: 'fun-divide-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const c = rng.pick(hard ? nonZeroRange(-4, 4) : [1, 2, 3, 4]);
    return drawUntil(
      () => ({
        deg: hard ? rng.pick([1, 2]) : 1,
        a: c * rng.pick(hard ? nonZeroRange(-5, 5) : range(1, 5)),
        b: rng.pick(nonZeroRange(-9, 9)),
        c,
        d: rng.pick(nonZeroRange(-9, 9)),
      }),
      ({ a, b, c: bottom, d }) => b / d !== a / bottom,
      { deg: 1, a: 6, b: 1, c: 2, d: -3 },
    );
  },
  render: (params): Slide => {
    const { deg, a, b, c, d } = params;
    const q = a / c;
    const power = deg === 2 ? 'x^2' : 'x';
    const start = `\\frac{${polyTex([[a, deg], [b, 0]])}}{${polyTex([[c, deg], [d, 0]])}}`;
    const divided = `\\frac{${dividedTex(a, b, deg)}}{${dividedTex(c, d, deg)}}`;
    const constants = `\\frac{${a} ${signedTile(b)}}{${c} ${signedTile(d)}}`;
    const limit = `\\frac{${a} + 0}{${c} + 0}`;
    const wrongLimit = `\\frac{0 ${signedTile(b)}}{0 ${signedTile(d)}}`;
    const ends = [`${a}`, `${-q}`, `${q + 1}`, ...(Number.isInteger(b / d) ? [`${b / d}`] : [])];
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `What does $y = ${start}$ head for as $x$ grows? Divide every term by $${power}$, then let $x$ grow. ${HOW_TO_STEP}`,
        },
      ],
      start: [start],
      reductions: [
        {
          span: [0, 1],
          value: divided,
          bank: stepBank(divided, constants, `\\frac{${dividedTex(a, b, deg)}}{${polyTex([[c, deg], [d, 0]])}}`),
        },
        { span: [0, 1], value: limit, bank: stepBank(limit, wrongLimit, constants) },
        { span: [0, 1], value: `${q}`, bank: stepBank(`${q}`, ...ends.filter((value) => value !== `${q}`)) },
      ],
    };
  },
  solution: (params) => {
    const { deg, a, b, c, d } = params;
    const power = deg === 2 ? 'x^2' : 'x';
    return [
      { text: `Divide every term on the top and the bottom by $${power}$; the fraction's value does not change.` },
      { tex: `\\frac{${dividedTex(a, b, deg)}}{${dividedTex(c, d, deg)}}` },
      { text: `As $x$ grows, $\\frac{${Math.abs(b)}}{${power}}$ and $\\frac{${Math.abs(d)}}{${power}}$ shrink to $0$.` },
      { tex: `\\frac{${a} + 0}{${c} + 0} = ${a / c}` },
    ];
  },
};

/* ---------- Lesson 4: f(x) = k as a horizontal line ---------- */

type MeetCurve = 'up' | 'down' | 'cubic' | 'recip';

interface MeetCountParams {
  curve: MeetCurve;
  h: number;
  c: number;
  k: number;
  /** The reciprocal's numerator, or the cubic's direction. */
  s: number;
}

function meetCountOf({ curve, c, k }: MeetCountParams): number {
  if (curve === 'up') return k > c ? 2 : k === c ? 1 : 0;
  if (curve === 'down') return k < c ? 2 : k === c ? 1 : 0;
  if (curve === 'cubic') return Math.abs(k - c) < 2 ? 3 : Math.abs(k - c) === 2 ? 2 : 1;
  return k === c ? 0 : 1;
}

function meetCurve({ curve, h, c, s }: MeetCountParams): (x: number) => number {
  if (curve === 'up') return (x) => (x - h) ** 2 + c;
  if (curve === 'down') return (x) => c - (x - h) ** 2;
  if (curve === 'cubic') return (x) => s * ((x - h) ** 3 - 3 * (x - h)) + c;
  return (x) => s / (x - h) + c;
}

function parabolaTex(up: boolean, h: number, c: number): string {
  const square = h === 0 ? 'x^2' : `(${shiftedX(h)})^2`;
  return up ? `${square}${tail(c)}` : `${c} - ${square}`;
}

const COUNT_WORDS = ['No solutions', 'One solution', 'Two solutions', 'Three solutions'];

/**
 * How many solutions $f(x) = k$ has, counted off a picture.
 *
 * Each solution is a place the line $y = k$ meets the curve. A line through
 * the vertex touches once; a line along a reciprocal's asymptote never meets
 * it at all, which is difficulty 2's trap, alongside a cubic that can be met
 * once, twice or three times.
 */
const meetCount: Generator<MeetCountParams> = {
  id: 'fun-meet-count',
  sample: (rng, difficulty) => {
    const curve = rng.pick(difficulty > 1 ? (['cubic', 'recip', 'cubic', 'down'] as const) : (['up', 'down'] as const));
    const offsets = curve === 'cubic' ? [-3, -2, -1, 0, 1, 2, 3] : curve === 'recip' ? [0, 0, -2, -1, 1, 2] : [-2, -1, 0, 0, 1, 2, 3];
    return drawUntil(
      () => {
        const c = rng.pick(nonZeroRange(curve === 'cubic' ? -3 : -5, curve === 'cubic' ? 3 : 5));
        const flip = curve === 'down' ? -1 : 1;
        return {
          curve,
          h: rng.int(-3, 3),
          c,
          k: c + flip * rng.pick(offsets),
          s: curve === 'recip' ? rng.pick(nonZeroRange(-3, 3)) : rng.pick([1, -1]),
        };
      },
      ({ k }) => k !== 0,
      { curve, h: 1, c: 2, k: 3, s: 1 },
    );
  },
  render: (params): Slide => {
    const { curve, h, c, k } = params;
    const width = curve === 'cubic' ? 3 : curve === 'recip' ? 5 : 4;
    const xMin = h - width;
    const xMax = h + width;
    const window =
      curve === 'recip'
        ? { yMin: c - 5, yMax: c + 5 }
        : curve === 'cubic'
          ? heightsWindow([c - 2, c + 2, k], 3)
          : curve === 'up'
            ? { yMin: Math.min(0, c, k) - 1, yMax: Math.max(0, c, k) + 5 }
            : { yMin: Math.min(0, c, k) - 5, yMax: Math.max(0, c, k) + 1 };
    const named = curve === 'up' || curve === 'down';
    const count = meetCountOf(params);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin,
            xMax,
            ...window,
            curves: [{ f: meetCurve(params), breaks: curve === 'recip' }],
            horizontals: [k],
            verticals: yAxisIn(xMin, xMax),
            label: `A curve and the dashed line y = ${k}`,
          }),
        },
        {
          kind: 'prose',
          text: named
            ? `$f(x) = ${parabolaTex(curve === 'up', h, c)}$, drawn with the dashed line $y = ${k}$. How many solutions has $f(x) = ${k}$?`
            : `The curve is $y = f(x)$ and the dashed line is $y = ${k}$. How many solutions has $f(x) = ${k}$?`,
        },
      ],
      ...fixedChoice([COUNT_WORDS[count], ...COUNT_WORDS.filter((_, idx) => idx !== count)].map((label) => ({ label }))),
    };
  },
  solution: (params) => {
    const { curve, c, k } = params;
    const count = meetCountOf(params);
    const steps: SolutionStep[] = [
      { text: `Each solution of $f(x) = ${k}$ is an $x$ where the curve is at height $${k}$: a place the line meets it.` },
    ];
    if (curve === 'up' || curve === 'down') {
      steps.push({
        text: `The vertex is at height $${c}$${k === c ? ', and the line goes through it: it touches once' : `, and the line is ${(k > c) === (curve === 'up') ? 'on the side the arms go, so it cuts both arms' : 'on the side the arms never reach'}`}.`,
      });
    } else if (curve === 'recip') {
      steps.push({
        text: k === c ? `The line is the asymptote $y = ${c}$, which the curve never reaches.` : `The line is not the asymptote, so exactly one branch crosses it.`,
      });
    } else {
      steps.push({ text: `The turning points are at heights $${c - 2}$ and $${c + 2}$; the line is ${Math.abs(k - c) < 2 ? 'between them' : Math.abs(k - c) === 2 ? 'level with one of them' : 'outside them'}.` });
    }
    steps.push({ text: `${COUNT_WORDS[count]}.` });
    return steps;
  },
};

interface MeetFlowParams {
  up: boolean;
  /** Difficulty 2: ask which way it opens first. */
  open: boolean;
  h: number;
  c: number;
  k: number;
}

const OPENS_UP = 'Upwards';
const OPENS_DOWN = 'Downwards';
const LINE_ABOVE = 'Above it';
const LINE_LEVEL = 'Level with it';
const LINE_BELOW = 'Below it';

/**
 * How many solutions, from the vertex rather than a picture.
 *
 * $(x - h)^2 + c$ is lowest at height $c$, so $= k$ has two solutions above
 * that, one at it and none below — and the other way round when the square
 * is taken away. The vertex's height is asked first, with the $h$ from the
 * bracket among the branches.
 */
const meetFlow: Generator<MeetFlowParams> = {
  id: 'fun-meet-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const c = rng.pick(nonZeroRange(-6, 6));
        return {
          up: hard ? rng.chance(0.5) : true,
          open: hard,
          h: rng.pick(nonZeroRange(-5, 5)),
          c,
          k: c + rng.pick([-4, -2, -1, 0, 1, 3, 5]),
        };
      },
      ({ h, c }) => h !== c && h !== -c,
      { up: true, open: hard, h: 2, c: -3, k: 1 },
    );
  },
  render: (params): Slide => {
    const { up, open, h, c, k } = params;
    const heights = [c, -c, h].sort((x, y) => x - y);
    const vertex = (side: 'Up' | 'Down') => ({
      id: `vertex${side}`,
      ask: `Its ${side === 'Up' ? 'lowest' : 'highest'} point is the vertex. How high is it?`,
      branches: heights.map((value) => ({ label: `$${value}$`, to: `compare${side}` })),
    });
    const compare = (side: 'Up' | 'Down') => {
      const two = 'The line cuts both arms: two solutions.';
      const none = 'The line misses the curve: no solutions.';
      return {
        id: `compare${side}`,
        ask: `Is the line $y = ${k}$ above the vertex, level with it, or below it?`,
        branches: [
          { label: LINE_ABOVE, outcome: side === 'Up' ? two : none },
          { label: LINE_LEVEL, outcome: 'The line touches the vertex: one solution.' },
          { label: LINE_BELOW, outcome: side === 'Up' ? none : two },
        ],
      };
    };
    const position = k > c ? LINE_ABOVE : k === c ? LINE_LEVEL : LINE_BELOW;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'How many solutions has this equation?' }],
      subject: `${parabolaTex(up, h, c)} = ${k}`,
      steps: open
        ? [
            {
              id: 'open',
              ask: 'Which way does the parabola open?',
              branches: [
                { label: OPENS_UP, to: 'vertexUp' },
                { label: OPENS_DOWN, to: 'vertexDown' },
              ],
            },
            vertex('Up'),
            vertex('Down'),
            compare('Up'),
            compare('Down'),
          ]
        : [vertex('Up'), compare('Up')],
      answer: [...(open ? [up ? OPENS_UP : OPENS_DOWN] : []), `$${c}$`, position],
    };
  },
  solution: ({ up, h, c, k }) => {
    const count = up ? (k > c ? 2 : k === c ? 1 : 0) : k < c ? 2 : k === c ? 1 : 0;
    return [
      {
        text: up
          ? `A square is never negative, so $${parabolaTex(true, h, c)}$ is lowest when the bracket is $0$: the vertex is at height $${c}$, and the curve opens upwards.`
          : `The square is taken away, so $${parabolaTex(false, h, c)}$ is highest when the bracket is $0$: the vertex is at height $${c}$, and the curve opens downwards.`,
      },
      { text: `The line $y = ${k}$ is ${k > c ? 'above' : k === c ? 'level with' : 'below'} it.` },
      { text: `${COUNT_WORDS[count]}.` },
    ];
  },
};

interface MeetSolveParams {
  form: 'square' | 'expanded';
  h: number;
  c: number;
  d: number;
  larger: boolean;
}

function meetSolveRuleTex({ form, h, c }: MeetSolveParams): string {
  return form === 'square' ? parabolaTex(true, h, c) : polyTex([[1, 2], [-2 * h, 1], [h * h + c, 0]]);
}

function meetSolveAnswer({ h, d, larger }: MeetSolveParams): number {
  return larger ? h + d : h - d;
}

/**
 * One solution of $(x - h)^2 + c = k$, typed.
 *
 * Take $c$ over, square-root both sides — both roots — and add $h$ back.
 * The question names which solution it wants so the answer is one number.
 * Difficulty 2 gives the rule expanded, so the square has to be completed
 * first, and sometimes asks for the smaller one.
 */
const meetSolve: Generator<MeetSolveParams> = {
  id: 'fun-meet-solve',
  choices: (params) => {
    const { h, c, d } = params;
    const x = meetSolveAnswer(params);
    return numberChoices(x, 2 * h - x, -x, h + d * d, h + c + d, d);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      form: hard ? rng.pick(['expanded', 'expanded', 'square'] as const) : 'square',
      h: rng.pick(nonZeroRange(-5, 5)),
      c: rng.pick(nonZeroRange(-6, 6)),
      d: rng.int(1, hard ? 5 : 4),
      larger: hard ? rng.chance(0.5) : true,
    };
  },
  render: (params): Slide => {
    const { c, d, larger } = params;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Solve $${meetSolveRuleTex(params)} = ${c + d * d}$. Give the ${larger ? 'larger' : 'smaller'} solution.`,
        },
      ],
      lead: 'x =',
      keypad: [],
      answer: `${meetSolveAnswer(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { form, h, c, d, larger } = params;
    const steps: SolutionStep[] = [];
    if (form === 'expanded') {
      steps.push({ text: 'Complete the square first.' });
      steps.push({ tex: `${meetSolveRuleTex(params)} = ${parabolaTex(true, h, c)}` });
    }
    steps.push({ text: `${c > 0 ? `Take $${c}$ from` : `Add $${-c}$ to`} both sides, then square-root: both signs.` });
    steps.push({ tex: `(${shiftedX(h)})^2 = ${d * d}` });
    steps.push({ tex: `${shiftedX(h)} = \\pm ${d}` });
    steps.push({ tex: `x = ${h + d} \\text{ or } x = ${h - d}` });
    steps.push({ text: `The ${larger ? 'larger' : 'smaller'} is $${meetSolveAnswer(params)}$.` });
    return steps;
  },
};

interface MeetTilesParams {
  m: number;
  r: number;
  s: number;
  k: number;
}

/** m(x - r)(x - s) + k, multiplied out. */
function meetTilesRule({ m, r, s, k }: MeetTilesParams): string {
  return polyTex([[m, 2], [-m * (r + s), 1], [m * r * s + k, 0]]);
}

/**
 * Where the line meets the curve: both $x$ values, placed in either order.
 *
 * $f(x) = k$ with $k$ not zero, so the first move is to take $k$ over and
 * only then factorise — factorising $f$ itself finds where the curve meets
 * the $x$-axis, a different line. The figure marks both meeting points.
 */
const meetTiles: Generator<MeetTilesParams> = {
  id: 'fun-meet-tiles',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const [first, second] = rng.sample(nonZeroRange(-5, 5), 2);
        return {
          m: difficulty > 1 ? rng.pick([-1, 2, -2, 1]) : 1,
          r: Math.min(first, second),
          s: Math.max(first, second),
          k: rng.pick(nonZeroRange(-6, 6)),
        };
      },
      ({ r, s }) => s - r <= 6 && r !== -s,
      { m: 1, r: -1, s: 3, k: 2 },
    ),
  render: (params): Slide => {
    const { m, r, s, k } = params;
    const f = (x: number) => m * (x - r) * (x - s) + k;
    const vertexY = f((r + s) / 2);
    const window = m > 0 ? heightsWindow([vertexY, k + 4]) : heightsWindow([vertexY, k - 4]);
    const answer = [`${r}`, `${s}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: r - 2,
            xMax: s + 2,
            ...window,
            curves: [{ f }],
            horizontals: [k],
            verticals: yAxisIn(r - 2, s + 2),
            marks: [
              { x: r, y: k },
              { x: s, y: k },
            ],
            label: `A parabola and the dashed line y = ${k}, meeting twice`,
          }),
        },
        { kind: 'prose', text: `$f(x) = ${meetTilesRule(params)}$. Solve $f(x) = ${k}$.` },
      ],
      template: 'x = {0} \\text{ or } x = {1}',
      bank: bankOf(answer, [`${-r}`, `${-s}`, `${r + s}`, `${r * s}`]),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const { m, r, s, k } = params;
    const steps: SolutionStep[] = [
      { text: `Take $${k}$ from both sides, so one side is $0$.` },
      { tex: `${polyTex([[m, 2], [-m * (r + s), 1], [m * r * s, 0]])} = 0` },
    ];
    if (m !== 1) {
      steps.push({ text: `Divide by $${m}$.` });
      steps.push({ tex: `${polyTex([[1, 2], [-(r + s), 1], [r * s, 0]])} = 0` });
    }
    steps.push({ tex: `${factorPairTex(r, s)} = 0` });
    steps.push({ tex: `x = ${r} \\text{ or } x = ${s}` });
    return steps;
  },
};

/* ---------- Lesson 5: sketch from rule, rule from sketch ---------- */

interface SketchRuleParams {
  a: number;
  h: number;
  k: number;
  /** How far across the marked point is from the vertical asymptote; 0 for none. */
  d: number;
  /** Whether the prompt states the asymptotes rather than leaving them to be read off. */
  told?: boolean;
}

/** The sketch: dashed asymptotes on squared paper, and the marked point if there is one. */
function sketchSvg({ a, h, k, d }: SketchRuleParams): string {
  return plotSvg({
    xMin: -6,
    xMax: 6,
    yMin: -6,
    yMax: 6,
    grid: true,
    height: 200,
    curves: [{ f: (x) => a / (x - h) + k, breaks: true }],
    verticals: [{ x: h }],
    horizontals: [k],
    marks: d === 0 ? [] : [{ x: h + d, y: k + a / d }],
    label: 'A reciprocal curve with its two asymptotes dashed',
  });
}

/** A reciprocal whose marked point lands on the grid, inside the picture. */
function sampleSketch(rng: Rng, numerators: number[]): SketchRuleParams {
  return drawUntil(
    () => {
      const a = rng.pick(numerators);
      const d = rng.pick(nonZeroRange(-4, 4));
      return { a, h: rng.pick(nonZeroRange(-3, 3)), k: rng.pick(nonZeroRange(-3, 3)), d };
    },
    ({ a, h, k, d }) =>
      a % d === 0 && Math.abs(h + d) <= 5 && Math.abs(k + a / d) <= 5 && h + d !== 0 && k + a / d !== 0,
    { a: 2, h: 1, k: 1, d: 2 },
  );
}

/**
 * The equation of a sketched reciprocal curve, from its asymptotes.
 *
 * The dashed lines give $h$ and $k$ straight away, the vertical one with its
 * sign turned round inside the bracket. Difficulty 2 needs the numerator too,
 * from the marked point: how far across it is from the vertical asymptote
 * times how far up from the horizontal one. The numerator is kept positive
 * so every tile beside it is spelled one way.
 */
const sketchRule: Generator<SketchRuleParams> = {
  id: 'fun-sketch-rule',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? sampleSketch(rng, [2, 3, 4, 6])
      : { a: 1, h: rng.pick(nonZeroRange(-4, 4)), k: rng.pick(nonZeroRange(-4, 4)), d: 0 },
  render: (params): Slide => {
    const { a, h, k, d } = params;
    const hard = d !== 0;
    const answer = hard ? [`${a}`, signedTile(-h), signedTile(k)] : [signedTile(-h), signedTile(k)];
    const signs = [signedTile(h), signedTile(-k), signedTile(k + (k > 0 ? 1 : -1))];
    const tops = hard ? [`${a + 1}`, `${Math.abs(d)}`, `${Math.abs(a / d)}`, `${Math.abs(d) + Math.abs(a / d)}`] : [];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'diagram', svg: sketchSvg(params) },
        {
          kind: 'prose',
          text: hard
            ? `Each square is one unit, and the dashed lines are the asymptotes. The curve passes through $(${h + d}, ${k + a / d})$. Write its equation.`
            : 'Each square is one unit, and the dashed lines are the asymptotes. Write the equation of the curve.',
        },
      ],
      template: hard ? 'y = {0}/(x {1}) {2}' : 'y = 1/(x {0}) {1}',
      bank: bankOf(answer, [...signs, ...tops]),
      answer,
    };
  },
  solution: (params) => {
    const { a, h, k, d } = params;
    const steps: SolutionStep[] = [
      { text: `The vertical asymptote is $x = ${h}$, so the bottom is $${shiftedX(h)}$: zero there.` },
      { text: `The horizontal asymptote is $y = ${k}$, so $${k}$ is added on.` },
    ];
    if (d !== 0) {
      steps.push({ text: `The point is $${d}$ across from $x = ${h}$ and $${a / d}$ up from $y = ${k}$, so the numerator is $${d} \\times ${br(a / d)} = ${a}$.` });
    }
    steps.push({ tex: `y = ${recipTex(a, h, k)}` });
    return steps;
  },
};

/**
 * From a sketch's features to $a$, $h$ and $k$.
 *
 * The asymptotes are $h$ and $k$; the marked point's distance across from
 * one and up from the other multiply to $a$, since $y - k = \frac{a}{x - h}$.
 * Difficulty 1 states the asymptotes; difficulty 2 leaves them to be read
 * off the squares, and lets $a$ be negative.
 */
const featuresTree: Generator<SketchRuleParams> = {
  id: 'fun-features-tree',
  sample: (rng, difficulty) => ({
    ...sampleSketch(rng, difficulty > 1 ? [-6, -4, -3, -2, 2, 3, 4, 6] : [2, 3, 4, 6]),
    told: difficulty <= 1,
  }),
  render: (params): Slide => {
    const { a, h, k, d, told } = params;
    const p = h + d;
    const q = k + a / d;
    const answer = [h, k, d, a / d, a].map(String);
    return {
      kind: 'tree',
      prompt: [
        { kind: 'diagram', svg: sketchSvg(params) },
        {
          kind: 'prose',
          text: `The curve is $y = \\frac{a}{x - h} + k$ through $(${p}, ${q})$; each square is one unit${told ? `, and its asymptotes are $x = ${h}$ and $y = ${k}$` : ''}. Fill in $h$ and $k$, then $${p} - h$ and $${q} - k$, then $a$, their product.`,
        },
      ],
      expression: `a = (${p} - h)(${q} - k)`,
      nodes: [
        { id: 'h', from: [] },
        { id: 'k', from: [] },
        { id: 'across', from: ['h'] },
        { id: 'up', from: ['k'] },
        { id: 'a', from: ['across', 'up'] },
      ],
      bank: treeBank(answer, [-h, -k, p, q, a + d], a),
      answer,
    };
  },
  solution: (params) => {
    const { a, h, k, d } = params;
    const p = h + d;
    const q = k + a / d;
    return [
      { text: `The asymptotes are $x = ${h}$ and $y = ${k}$, so $h = ${h}$ and $k = ${k}$.` },
      { text: 'Take $k$ over: $y - k = \\frac{a}{x - h}$, so $a = (x - h)(y - k)$ at any point on the curve.' },
      { tex: `a = (${p} ${signedTile(-h)})(${q} ${signedTile(-k)})` },
      { tex: `a = ${br(d)} \\times ${br(a / d)} = ${a}` },
      { tex: `y = ${recipTex(a, h, k)}` },
    ];
  },
};

/* ======================================================================
 * Level 4: Even, Odd and Periodic Functions (batch C2-l4)
 * ==================================================================== */

/*
 * What a rule does to $-x$, what it does after a whole period, and a rule
 * that changes from one stretch of $x$ to the next.
 *
 * Whether a rule is even or odd is a fact about its *form*, and the checker
 * compares values, so $f(-x)$ and $-f(x)$ are placed as tiles, stepped or
 * chosen; only numbers — $f(-a)$, a missing $k$, a period — are typed. Every
 * number typed or placed is whole: inputs from $-4$ to $4$ and coefficients
 * from $-3$ to $3$. A period in degrees comes from $\sin bx$ with $b$ a
 * divisor of $360$.
 *
 * Polynomials are held as `[coefficient, power]` pairs, highest power first,
 * so writing $-x$ in is a sign change on each odd power and nothing else —
 * which is most of what the level teaches.
 */

/** A polynomial as `[coefficient, power]` pairs, highest power first. */
type Poly = [number, number][];

type Parity = 'even' | 'odd' | 'neither';

/** f(-x): every odd power changes sign. */
function atNegX(poly: Poly): Poly {
  return poly.map(([c, p]): [number, number] => [p % 2 === 0 ? c : -c, p]);
}

/** -f(x): every term changes sign. */
function negated(poly: Poly): Poly {
  return poly.map(([c, p]): [number, number] => [-c, p]);
}

/** The slip of changing the even powers rather than the odd ones. */
function flippedEvens(poly: Poly): Poly {
  return poly.map(([c, p]): [number, number] => [p % 2 === 0 ? -c : c, p]);
}

/** The slip of changing only the first term's sign. */
function flippedFirst(poly: Poly): Poly {
  return poly.map(([c, p], idx): [number, number] => [idx === 0 ? -c : c, p]);
}

function parityOf(poly: Poly): Parity {
  if (poly.every(([, p]) => p % 2 === 0)) return 'even';
  if (poly.every(([, p]) => p % 2 === 1)) return 'odd';
  return 'neither';
}

function polyAt(poly: Poly, x: number): number {
  return poly.reduce((sum, [c, p]) => sum + c * x ** p, 0);
}

/** Two polynomials multiplied out, like powers collected. */
function multiplied(first: Poly, second: Poly): Poly {
  const byPower = new Map<number, number>();
  for (const [c1, p1] of first) {
    for (const [c2, p2] of second) byPower.set(p1 + p2, (byPower.get(p1 + p2) ?? 0) + c1 * c2);
  }
  return [...byPower.entries()]
    .filter(([, c]) => c !== 0)
    .sort((x, y) => y[0] - x[0])
    .map(([p, c]): [number, number] => [c, p]);
}

/** A term as a tile: the first spelled `-2x^{3}`, the rest `- 2x^{3}`, the way `signedTile` spells them. */
function termToken(c: number, p: number, first: boolean): string {
  return first ? termTex(c, p) : `${c < 0 ? '-' : '+'} ${termTex(Math.abs(c), p)}`;
}

function polyTokens(poly: Poly): string[] {
  return poly.map(([c, p], idx) => termToken(c, p, idx === 0));
}

/** A number written in for x, term by term and bracketed: `2(-3)^3 - 5(-3)`, short enough for a phone. */
function plugTex(poly: Poly, x: number): string {
  return sumTex(
    poly.map(([c, p]) => {
      if (p === 0) return `${c}`;
      const base = p === 1 ? `(${x})` : `(${x})^${p}`;
      return c === 1 ? base : c === -1 ? `-${base}` : `${c}${base}`;
    }),
  );
}

/** The rule with -x written in, before tidying: `2(-x)^3 - 5(-x) + 1`. */
function negXTex(poly: Poly): string {
  const terms = poly.map(([c, p]) => {
    if (p === 0) return `${c}`;
    const base = p === 1 ? '(-x)' : `(-x)^${p}`;
    return c === 1 ? base : c === -1 ? `-${base}` : `${c}${base}`;
  });
  if (terms.length <= 3) return sumTex(terms);
  // Four terms run off a phone on one line, so the second pair goes beneath, keeping its sign.
  const rest = terms.slice(2).map((term) => (term.startsWith('-') ? `- ${term.slice(1)}` : `+ ${term}`));
  return `\\begin{gathered} ${sumTex(terms.slice(0, 2))} \\\\ ${rest.join(' ')} \\end{gathered}`;
}

const COEFFICIENTS = nonZeroRange(-3, 3);

/** Distinct powers from `pool`, highest first, each with a coefficient from -3 to 3. */
function drawPoly(rng: Rng, pool: number[], terms: number): Poly {
  return rng
    .sample(pool, terms)
    .sort((x, y) => y - x)
    .map((p): [number, number] => [rng.pick(COEFFICIENTS), p]);
}

/** A polynomial of the parity asked for, never a bare constant. */
function drawParity(rng: Rng, parity: Parity, terms: number, maxPower: number): Poly {
  const all = range(0, maxPower);
  const pool = parity === 'neither' ? all : all.filter((p) => p % 2 === (parity === 'even' ? 0 : 1));
  const fallback: Record<Parity, Poly> = {
    even: [[1, 4], [2, 2], [1, 0]].slice(0, terms) as Poly,
    odd: [[1, 5], [2, 3], [1, 1]].slice(3 - terms) as Poly,
    neither: [[1, 3], [2, 2], [1, 0]].slice(0, Math.max(terms, 2)) as Poly,
  };
  return drawUntil(
    () => drawPoly(rng, pool, terms),
    (poly) => parityOf(poly) === parity && poly[0][1] > 0,
    fallback[parity],
  );
}

/** The working behind a verdict: write -x in, tidy, compare. */
function paritySteps(poly: Poly): SolutionStep[] {
  const parity = parityOf(poly);
  return [
    { text: 'Write $(-x)$ in place of every $x$. An even power of $-x$ is positive and an odd power negative, so the even powers stay as they were and the odd powers change sign.' },
    { tex: negXTex(poly) },
    { tex: `f(-x) = ${polyTex(atNegX(poly))}` },
    {
      text:
        parity === 'even'
          ? 'Every term came back unchanged: $f(-x) = f(x)$, so $f$ is even.'
          : parity === 'odd'
            ? 'Every term changed sign: $f(-x) = -f(x)$, so $f$ is odd.'
            : `Some terms changed sign and some did not, so $f(-x)$ is neither $f(x)$ nor $-f(x)$: $f$ is neither even nor odd.`,
    },
  ];
}

/* ---------- Lesson 1: even functions ---------- */

interface EvenValueParams {
  /** `given` states f(a); `graph` a point on the curve; `half` the rule for x ≥ 0 only. */
  form: 'given' | 'graph' | 'half';
  /** The input whose value is known; the question asks at -a. */
  a: number;
  v: number;
  /** For `half`, the rule on x ≥ 0. */
  rule: Poly;
}

function evenValueOf({ form, a, v, rule }: EvenValueParams): number {
  return form === 'half' ? polyAt(rule, a) : v;
}

/**
 * $f(-a)$ from what is known at $a$.
 *
 * Difficulty 1 gives $f(a)$, or a point on a curve symmetrical in the
 * $y$-axis, and the answer is that value again. Difficulty 2 gives the rule
 * only for $x \geq 0$ and asks at a negative input, which the rule does not
 * cover: the slip is to put $-a$ in anyway.
 */
const evenValue: Generator<EvenValueParams> = {
  id: 'fun-even-value',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      return {
        form: rng.pick(['given', 'graph'] as const),
        a: rng.pick(nonZeroRange(-4, 4)),
        v: rng.pick(nonZeroRange(-9, 9)),
        rule: [],
      };
    }
    const m = rng.pick(COEFFICIENTS);
    const q = rng.pick(COEFFICIENTS);
    const rules: Poly[] = [
      [[m, 1], [q, 0]],
      [[1, 2], [m, 1]],
      [[1, 2], [m, 1], [q, 0]],
      [[-1, 2], [m, 1], [q, 0]],
    ];
    return { form: 'half', a: rng.int(1, 4), v: 0, rule: rng.pick(rules) };
  },
  render: (params): Slide => {
    const { form, a, v, rule } = params;
    const text =
      form === 'given'
        ? `$f$ is an even function, and $f(${a}) = ${v}$. Find $f(${-a})$.`
        : form === 'graph'
          ? `The graph of $y = f(x)$ is symmetrical in the $y$-axis and passes through $(${a}, ${v})$. Find $f(${-a})$.`
          : `$f$ is an even function. For $x \\geq 0$ its rule is $f(x) = ${polyTex(rule)}$. Find $f(${-a})$.`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text }],
      lead: `f(${-a}) =`,
      keypad: [],
      answer: `${evenValueOf(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { form, a, v, rule } = params;
    if (form !== 'half') {
      const steps: SolutionStep[] = [
        { text: 'An even function takes the same value at $x$ and at $-x$: $f(-x) = f(x)$ for every $x$.' },
      ];
      if (form === 'graph') {
        steps.push({ text: `The mirror image of $(${a}, ${v})$ in the $y$-axis is $(${-a}, ${v})$, so that point is on the curve too.` });
      }
      steps.push({ tex: `f(${-a}) = f(${a}) = ${v}` });
      return steps;
    }
    const value = polyAt(rule, a);
    return [
      { text: `The rule only covers $x \\geq 0$, and $${-a}$ is not in it. But $f$ is even, so $f(${-a}) = f(${a})$, and $${a}$ is.` },
      { tex: `f(${a}) = ${plugTex(rule, a)}` },
      { tex: `f(${a}) = ${value}` },
      { tex: `f(${-a}) = ${value}` },
      { text: `Putting $${-a}$ straight into the rule gives $${polyAt(rule, -a)}$: the rule is not what $f$ does to the left of the $y$-axis.` },
    ];
  },
};

interface Candidate {
  tex: string;
  /** Why it is even, or why not, in the learner's numbers. */
  why: string;
}

/** A coefficient in front of a letter or a bar: `3`, or nothing for 1. */
function coefficientTex(a: number): string {
  return a === 1 ? '' : a === -1 ? '-' : `${a}`;
}

function polyCandidate(poly: Poly): Candidate {
  const even = parityOf(poly) === 'even';
  return {
    tex: polyTex(poly),
    why: even
      ? 'every power of $x$ in it is even, so writing $-x$ in changes nothing'
      : `writing $-x$ in gives $${polyTex(atNegX(poly))}$`,
  };
}

/** The even rules and the others a question may offer, built from its numbers. */
function evenCandidates(hard: boolean, a: number, b: number): { even: Candidate[]; other: Candidate[] } {
  if (!hard) {
    return {
      even: [[[a, 4], [b, 2]], [[a, 2], [b, 0]], [[a, 4], [b, 0]], [[1, 6], [b, 2]]].map((poly) =>
        polyCandidate(poly as Poly),
      ),
      other: [[[a, 3], [b, 1]], [[a, 2], [b, 1]], [[a, 4], [b, 3]], [[a, 3], [b, 0]], [[a, 4], [b, 1]], [[b, 3], [a, 2]]].map(
        (poly) => polyCandidate(poly as Poly),
      ),
    };
  }
  const size = Math.abs(b);
  return {
    even: [
      { tex: `|x|${tail(b)}`, why: '$|-x| = |x|$, so writing $-x$ in changes nothing' },
      { tex: `x^2 + ${coefficientTex(a)}|x|`, why: '$(-x)^2 = x^2$ and $|-x| = |x|$, so writing $-x$ in changes nothing' },
      { tex: `\\frac{${a}}{x^2 + ${size}}`, why: '$(-x)^2 = x^2$, so writing $-x$ in changes nothing' },
      { tex: `(x^2${tail(b)})^2`, why: '$(-x)^2 = x^2$, so writing $-x$ in changes nothing' },
    ],
    other: [
      { tex: `(${shiftedX(-b)})^2`, why: `its line of symmetry is $x = ${-b}$, not the $y$-axis` },
      { tex: `|${shiftedX(-b)}|`, why: `its line of symmetry is $x = ${-b}$, not the $y$-axis` },
      { tex: `${coefficientTex(a)}x|x|`, why: `$${coefficientTex(a)}(-x)|-x| = -${coefficientTex(a)}x|x|$, so it is odd` },
      { tex: `\\frac{${a}}{x}`, why: `$\\frac{${a}}{-x} = -\\frac{${a}}{x}$, so it is odd` },
      { tex: polyTex([[1, 2], [b, 1]]), why: `writing $-x$ in gives $${polyTex([[1, 2], [-b, 1]])}$` },
      { tex: `\\frac{${a}}{${shiftedX(-b)}}`, why: `its break is at $x = ${-b}$, which the $y$-axis does not mirror` },
    ],
  };
}

interface EvenPickParams {
  hard: boolean;
  a: number;
  b: number;
  right: number;
  wrong: number[];
}

/**
 * Which rule is even, from four.
 *
 * Difficulty 1 offers polynomials, the even one the one with only even
 * powers, the others built from the same numbers with one power changed.
 * Difficulty 2 brings $|x|$ and fractions, and the two traps that look
 * symmetrical and are — about the wrong line: $(x - 2)^2$ and $|x - 2|$.
 */
const evenPick: Generator<EvenPickParams> = {
  id: 'fun-even-pick',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const { even, other } = evenCandidates(hard, 1, 1);
    return {
      hard,
      a: rng.int(1, 3),
      b: rng.pick(COEFFICIENTS),
      right: rng.int(0, even.length - 1),
      wrong: rng.sample(range(0, other.length - 1), 3),
    };
  },
  render: ({ hard, a, b, right, wrong }): Slide => {
    const { even, other } = evenCandidates(hard, a, b);
    const labels = [even[right], ...wrong.map((idx) => other[idx])].map(({ tex }) => ({ label: tex, tex: true }));
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: 'Which of these functions of $x$ is even?' }],
      ...fixedChoice(labels),
    };
  },
  solution: ({ hard, a, b, right, wrong }) => {
    const { even, other } = evenCandidates(hard, a, b);
    const yes = even[right];
    const no = other[wrong[0]];
    return [
      { text: 'Even means $f(-x) = f(x)$: writing $-x$ in place of $x$ gives back exactly what you started with.' },
      { text: `$${yes.tex}$ is even: ${yes.why}.` },
      { text: `Each of the others changes. For $${no.tex}$, ${no.why}.` },
    ];
  },
};

interface PolyParams {
  poly: Poly;
}

/**
 * Is it even? Write $-x$ in, one term at a time.
 *
 * Each fork asks what one term becomes, so the learner meets the rule —
 * even powers stay, odd powers change sign — term by term before it is ever
 * stated, and the last fork asks whether all of that adds up to $f(x)$.
 * Difficulty 2 has three terms and may have a constant, which is $x^0$ and
 * so stays.
 */
const evenFlow: Generator<PolyParams> = {
  id: 'fun-even-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const terms = hard ? 3 : 2;
    const parity: Parity = rng.chance(0.4) ? 'even' : rng.pick(['odd', 'neither', 'neither'] as const);
    return { poly: drawParity(rng, parity, terms, hard ? 5 : 4) };
  },
  render: ({ poly }): Slide => {
    const label = (c: number, p: number) => `$${termTex(c, p)}$`;
    const steps = poly.map(([c, p], idx) => ({
      id: `t${idx}`,
      ask: `In $f(-x)$, what does $${termTex(c, p)}$ become?`,
      branches: [label(c, p), label(-c, p)]
        .sort()
        .map((text) => ({ label: text, to: idx + 1 < poly.length ? `t${idx + 1}` : 'same' })),
    }));
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Is $f$ even? Write $-x$ in place of $x$, one term at a time.' }],
      subject: `f(x) = ${polyTex(poly)}`,
      steps: [
        ...steps,
        {
          id: 'same',
          ask: 'So is $f(-x)$ the same as $f(x)$?',
          branches: [
            { label: FLOW_YES, outcome: 'So $f$ is even.' },
            { label: FLOW_NO, outcome: 'So $f$ is not even.' },
          ],
        },
      ],
      answer: [...atNegX(poly).map(([c, p]) => label(c, p)), parityOf(poly) === 'even' ? FLOW_YES : FLOW_NO],
    };
  },
  solution: ({ poly }) => {
    const even = parityOf(poly) === 'even';
    return [
      { text: 'Write $(-x)$ in place of every $x$. An even power of $-x$ is positive and an odd power negative.' },
      { tex: negXTex(poly) },
      { tex: `f(-x) = ${polyTex(atNegX(poly))}` },
      { text: even ? 'That is $f(x)$ again, so $f$ is even.' : `That is not $f(x) = ${polyTex(poly)}$, so $f$ is not even.` },
    ];
  },
};

/**
 * $f(-x)$, term by term, as tiles.
 *
 * Each blank is one term of $f(-x)$, and the bank holds every term with
 * both signs, so each blank is the question "does this one change?". Always
 * at least one odd power, or nothing would. Difficulty 2 has four terms.
 */
const negXTiles: Generator<PolyParams> = {
  id: 'fun-negx-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      poly: drawUntil(
        () => drawPoly(rng, range(0, hard ? 5 : 4), hard ? 4 : 3),
        (poly) => poly[0][1] > 0 && poly.some(([, p]) => p % 2 === 1),
        [[2, 3], [-1, 2], [4, 1]],
      ),
    };
  },
  render: ({ poly }): Slide => {
    const answer = polyTokens(atNegX(poly));
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `$f(x) = ${polyTex(poly)}$. Write $f(-x)$, one term in each gap.` }],
      template: `f(-x) = ${answer.map((_, idx) => `{${idx}}`).join(' ')}`,
      bank: bankOf(answer, polyTokens(negated(atNegX(poly)))),
      answer,
    };
  },
  solution: ({ poly }) => [
    { text: 'Write $(-x)$ in place of every $x$. An even power of $-x$ is positive and an odd power negative, so only the odd powers change sign.' },
    { tex: negXTex(poly) },
    { text: 'Tidied, one term to each gap:' },
    { tex: polyTex(atNegX(poly)) },
  ],
};

/* ---------- Lesson 2: odd functions ---------- */

interface OddSumParams {
  p: number;
  q: number;
  /** A constant added on at difficulty 2, which stops the rule being odd. */
  c: number;
  a: number;
}

/**
 * From $f(a)$ to $f(-a)$, and what the two add to.
 *
 * Difficulty 1 is an odd rule, $px^3 + qx$: $f(-a)$ is $-f(a)$ straight
 * away and the sum is $0$, which is what odd means. Difficulty 2 adds a
 * constant, so $f(-a)$ has to be built from the terms — the odd ones change
 * sign and the constant does not — and the sum is twice the constant.
 */
const oddSumTree: Generator<OddSumParams> = {
  id: 'fun-odd-sum-tree',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { p: rng.pick(COEFFICIENTS), q: rng.pick(COEFFICIENTS), c: rng.pick(COEFFICIENTS), a: rng.pick(nonZeroRange(-3, 3)) }
      : { p: rng.int(1, 3), q: rng.pick(COEFFICIENTS), c: 0, a: rng.int(1, 3) },
  render: ({ p, q, c, a }): Slide => {
    const cube = p * a ** 3;
    const lin = q * a;
    const fa = cube + lin + c;
    const fna = -cube - lin + c;
    const answer = [cube, lin, fa, fna, fa + fna].map(String);
    const rule = polyTex([[p, 3], [q, 1], [c, 0]]);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text:
            c === 0
              ? `$f(x) = ${rule}$ is odd. Fill in its two terms at $x = ${a}$ and add them for $f(${a})$. Being odd gives $f(${-a})$ straight from that; then add the two.`
              : `$f(x) = ${rule}$. Fill in its $x^3$ and $x$ terms at $x = ${a}$, then $f(${a})$ and $f(${-a})$, then their sum.`,
        },
      ],
      expression: `f(${a}) + f(${-a})`,
      nodes: [
        { id: 'cube', from: [] },
        { id: 'lin', from: [] },
        { id: 'fa', from: ['cube', 'lin'] },
        { id: 'fna', from: c === 0 ? ['fa'] : ['cube', 'lin'] },
        { id: 'sum', from: ['fa', 'fna'] },
      ],
      bank: treeBank(answer, [-cube, -lin, cube - lin, 2 * fa, -fna], fa),
      answer,
    };
  },
  solution: ({ p, q, c, a }) => {
    const cube = p * a ** 3;
    const lin = q * a;
    const fa = cube + lin + c;
    const steps: SolutionStep[] = [
      { tex: `f(${a}) = ${plugTex([[p, 3], [q, 1], [c, 0]], a)}` },
      { tex: `f(${a}) = ${fa}` },
    ];
    if (c === 0) {
      steps.push({ text: 'Odd means $f(-x) = -f(x)$, so the value at $-a$ is the value at $a$ with its sign changed.' });
      steps.push({ tex: `f(${-a}) = -f(${a}) = ${-fa}` });
      steps.push({ tex: `f(${a}) + f(${-a}) = 0` });
      steps.push({ text: 'That is always so for an odd function: its values at $a$ and $-a$ cancel.' });
      return steps;
    }
    steps.push({ text: `At $x = ${-a}$ the $x^3$ and $x$ terms change sign, but the constant $${c}$ does not.` });
    steps.push({ tex: `f(${-a}) = ${-cube} ${signedTile(-lin)} ${signedTile(c)} = ${-cube - lin + c}` });
    steps.push({ tex: `f(${a}) + f(${-a}) = ${2 * c}` });
    steps.push({ text: `The odd terms cancel and the constant is left twice, so $f$ is not odd.` });
    return steps;
  },
};

const IS_F = 'It is $f(x)$';
const IS_MINUS_F = 'It is $-f(x)$';
const IS_NEITHER = 'Neither';

/**
 * Even, odd or neither, in two forks: first $f(-x)$, then what it is.
 *
 * The options at the first fork are $f(-x)$ and the slips — the rule
 * unchanged, every sign changed, only the first changed — so a learner who
 * has not written $-x$ in properly takes a visibly different path. The rules
 * are drawn evenly from the three answers.
 */
const parityFlow: Generator<PolyParams> = {
  id: 'fun-parity-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { poly: drawParity(rng, rng.pick(['even', 'odd', 'neither'] as const), hard ? 3 : 2, hard ? 5 : 4) };
  },
  render: ({ poly }): Slide => {
    const right = `$${polyTex(atNegX(poly))}$`;
    const labels = [
      ...new Set([right, ...[poly, negated(poly), flippedFirst(poly), flippedEvens(poly)].map((each) => `$${polyTex(each)}$`)]),
    ]
      .slice(0, 3)
      .sort();
    const parity = parityOf(poly);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Is $f$ even, odd or neither?' }],
      subject: `f(x) = ${polyTex(poly)}`,
      steps: [
        {
          id: 'sub',
          ask: 'Write $-x$ in place of $x$. What is $f(-x)$?',
          branches: labels.map((label) => ({ label, to: 'compare' })),
        },
        {
          id: 'compare',
          ask: 'Compare that with $f(x)$. What is it?',
          branches: [
            { label: IS_F, outcome: 'So $f$ is even.' },
            { label: IS_MINUS_F, outcome: 'So $f$ is odd.' },
            { label: IS_NEITHER, outcome: 'So $f$ is neither even nor odd.' },
          ],
        },
      ],
      answer: [right, parity === 'even' ? IS_F : parity === 'odd' ? IS_MINUS_F : IS_NEITHER],
    };
  },
  solution: ({ poly }) => paritySteps(poly),
};

/**
 * $-f(x)$ and $f(-x)$ side by side.
 *
 * $-f(x)$ changes every sign, $f(-x)$ only the odd powers', and a rule is
 * odd exactly when the two lines come out the same. Difficulty 1 is always
 * odd, so they always match; difficulty 2 is odd half the time, and
 * otherwise has an even power or a constant that makes them differ.
 */
const oddTiles: Generator<PolyParams> = {
  id: 'fun-odd-tiles',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { poly: drawParity(rng, rng.pick(['odd', 'neither'] as const), 3, 5) }
      : { poly: drawParity(rng, 'odd', 2, 5) },
  render: ({ poly }): Slide => {
    const minus = polyTokens(negated(poly));
    const flipped = polyTokens(atNegX(poly));
    const n = poly.length;
    const blanks = (from: number) => range(from, from + n - 1).map((idx) => `{${idx}}`).join(' ');
    const answer = [...minus, ...flipped];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `$f(x) = ${polyTex(poly)}$. Write $-f(x)$, then $f(-x)$.` }],
      template: `-f(x) = ${blanks(0)}, \\quad f(-x) = ${blanks(n)}`,
      bank: bankOf(answer, [...polyTokens(poly), ...polyTokens(negated(atNegX(poly)))]),
      answer,
    };
  },
  solution: ({ poly }) => {
    const odd = parityOf(poly) === 'odd';
    return [
      { text: '$-f(x)$: every term changes sign.' },
      { tex: `-f(x) = ${polyTex(negated(poly))}` },
      { text: '$f(-x)$: write $-x$ in, and only the odd powers change sign.' },
      { tex: `f(-x) = ${polyTex(atNegX(poly))}` },
      {
        text: odd
          ? 'The two are the same, so $f(-x) = -f(x)$ and $f$ is odd.'
          : 'The two differ, so $f$ is not odd: a term with an even power, or a constant, keeps its sign in $f(-x)$.',
      },
    ];
  },
};

/* ---------- Lesson 3: testing a rule ---------- */

const SAME_F = 'f(x)';
const MINUS_F = '-f(x)';
const NEITHER_F = '\\text{neither } f(x) \\text{ nor } -f(x)';

/**
 * $f(-x)$ tidied, then named.
 *
 * The line starts with $-x$ written in. The first step tidies it, the bank
 * holding the slips — nothing changed, everything changed, only the first
 * term, the even powers instead of the odd; the second says what it equals.
 * Difficulty 2 has three terms and powers up to $5$.
 */
const negXSteps: Generator<PolyParams> = {
  id: 'fun-negx-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { poly: drawParity(rng, rng.pick(['even', 'odd', 'neither'] as const), hard ? 3 : 2, hard ? 5 : 4) };
  },
  render: ({ poly }): Slide => {
    const tidy = polyTex(atNegX(poly));
    const parity = parityOf(poly);
    const verdict = parity === 'even' ? SAME_F : parity === 'odd' ? MINUS_F : NEITHER_F;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Is $f(x) = ${polyTex(poly)}$ even, odd or neither? The line is $f(-x)$ with $-x$ written in: tidy it, then say what it equals. ${HOW_TO_STEP}`,
        },
      ],
      start: [negXTex(poly)],
      reductions: [
        {
          span: [0, 1],
          value: tidy,
          bank: stepBank(tidy, ...[poly, negated(poly), flippedFirst(poly), flippedEvens(poly)].map((each) => polyTex(each))),
        },
        { span: [0, 1], value: verdict, bank: stepBank(verdict, SAME_F, MINUS_F, NEITHER_F) },
      ],
    };
  },
  solution: ({ poly }) => paritySteps(poly),
};

interface ParityChoiceParams {
  /** One polynomial at difficulty 1; two factors multiplied at difficulty 2. */
  factors: Poly[];
}

/** A factor as it sits in a product: `x`, `x^{2}`, or bracketed. */
function factorPolyTex(poly: Poly): string {
  return poly.length === 1 ? polyTex(poly) : `(${polyTex(poly)})`;
}

function productTex(factors: Poly[]): string {
  const ordered = [...factors].sort((x, y) => x.length - y.length);
  return ordered.map(factorPolyTex).join('');
}

const PARITY_OPTIONS = [
  { id: 'even', label: 'Even' },
  { id: 'odd', label: 'Odd' },
  { id: 'neither', label: 'Neither' },
];

/**
 * Even, odd or neither, named.
 *
 * Difficulty 1 is a polynomial, drawn evenly from the three answers.
 * Difficulty 2 is a product of two factors: odd times odd is even, like two
 * minus signs, odd times even is odd, and a factor that is neither makes the
 * product neither — which the worked solution confirms by multiplying out.
 */
const parityChoice: Generator<ParityChoiceParams> = {
  id: 'fun-parity-choice',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      return { factors: [drawParity(rng, rng.pick(['even', 'odd', 'neither'] as const), 2, 4)] };
    }
    const b = () => rng.pick(COEFFICIENTS);
    const pools: Record<Parity, () => Poly> = {
      even: () => rng.pick<Poly>([[[1, 2]], [[1, 2], [b(), 0]], [[1, 4], [b(), 2]]]),
      odd: () => rng.pick<Poly>([[[1, 1]], [[1, 3]], [[1, 3], [b(), 1]]]),
      neither: () => rng.pick<Poly>([[[1, 1], [b(), 0]], [[1, 2], [b(), 1]]]),
    };
    return drawUntil(
      () => {
        const first = rng.pick(['even', 'odd', 'neither'] as const);
        const second = first === 'neither' ? rng.pick(['even', 'odd'] as const) : rng.pick(['even', 'odd', 'neither'] as const);
        return { factors: [pools[first](), pools[second]()] };
      },
      // Two bare powers multiply to a bare power, which is the difficulty 1 question.
      ({ factors }) => factors.some((factor) => factor.length > 1),
      { factors: [[[1, 1]], [[1, 2], [3, 0]]] },
    );
  },
  render: ({ factors }): Slide => {
    const product = factors.reduce(multiplied);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Is $f(x) = ${factors.length === 1 ? polyTex(factors[0]) : productTex(factors)}$ even, odd or neither?` }],
      options: PARITY_OPTIONS,
      correctId: parityOf(product),
    };
  },
  solution: ({ factors }) => {
    if (factors.length === 1) return paritySteps(factors[0]);
    const product = factors.reduce(multiplied);
    const kinds = factors.map(parityOf);
    const word: Record<Parity, string> = { even: 'even', odd: 'odd', neither: 'neither even nor odd' };
    const steps: SolutionStep[] = factors.map((factor, idx) => ({
      text: `$${polyTex(factor)}$ is ${word[kinds[idx]]}.`,
    }));
    if (!kinds.includes('neither')) {
      steps.push({
        text:
          kinds[0] === kinds[1]
            ? `${kinds[0] === 'odd' ? 'Odd times odd is even: the two sign changes cancel, as two minus signs do' : 'Even times even is even: nothing changes sign'}.`
            : 'Odd times even is odd: one factor changes sign and the other does not.',
      });
    }
    steps.push({ text: 'Multiplied out, to check:' });
    steps.push({ tex: `f(x) = ${polyTex(product)}` });
    const parity = parityOf(product);
    steps.push({ text: parity === 'neither' ? 'It has both odd and even powers, so $f$ is neither even nor odd.' : `Only ${parity} powers, so $f$ is ${parity}.` });
    return steps;
  },
};

interface ParityKParams {
  form: 'even' | 'odd';
  /** The power whose coefficient holds k. */
  spot: number;
  /** k's coefficient; the term is (mk + q) with q = -m p. */
  m: number;
  p: number;
  rest: Poly;
}

/** `(k - 3)x^{3}`, `(2k + 6)x`, `kx^{3}`, or a constant `k - 3`. */
function kTermTex({ spot, m, p }: ParityKParams): string {
  const inner = linTex(m, -m * p, 'k');
  if (spot === 0) return inner;
  const bracketed = p === 0 ? inner : `(${inner})`;
  return `${bracketed}${termTex(1, spot)}`;
}

function kRuleTex(params: ParityKParams): string {
  const terms = [...params.rest.map(([c, p]): [string, number] => [termTex(c, p), p]), [kTermTex(params), params.spot] as [string, number]];
  return sumTex(terms.sort((x, y) => y[1] - x[1]).map(([tex]) => tex));
}

/**
 * The $k$ that makes a rule even, or odd.
 *
 * An even rule can have no odd powers, so the coefficient holding $k$ must
 * be $0$ — and the same for an odd rule's even powers, a constant included,
 * since a constant is $x^0$. Difficulty 2 puts $k$ with a multiplier, so the
 * equation takes two steps.
 */
const parityK: Generator<ParityKParams> = {
  id: 'fun-parity-k',
  sample: (rng, difficulty) => {
    const form = rng.pick(['even', 'odd'] as const);
    const m = difficulty > 1 ? rng.pick([2, 3]) : 1;
    const p = rng.int(-4, 4);
    if (form === 'even') {
      return { form, spot: rng.pick([3, 1]), m, p, rest: [[1, 4], [rng.pick(COEFFICIENTS), 2], [rng.pick(COEFFICIENTS), 0]] };
    }
    return { form, spot: rng.pick([2, 0]), m, p, rest: [[rng.pick([1, 2]), 3], [rng.pick(COEFFICIENTS), 1]] };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `$f(x) = ${kRuleTex(params)}$ is ${params.form}. Find $k$.` }],
    lead: 'k =',
    keypad: [],
    answer: `${params.p}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { form, spot, m, p } = params;
    const inner = linTex(m, -m * p, 'k');
    const which = spot === 0 ? 'the constant' : `the $${termTex(1, spot)}$ term`;
    const steps: SolutionStep[] = [
      {
        text:
          form === 'even'
            ? `An even function has only even powers of $x$: an odd power would change sign when $-x$ is written in. So ${which} must vanish.`
            : `An odd function has only odd powers of $x$, and a constant counts as $x^0$, an even power. So ${which} must vanish.`,
      },
      { tex: `${inner} = 0` },
    ];
    if (m !== 1) steps.push({ tex: `${m}k = ${m * p}` });
    steps.push({ tex: `k = ${p}` });
    return steps;
  },
};

interface SplitParams {
  poly: Poly;
  t: number;
}

function splitParts({ poly, t }: SplitParams): { even: number; odd: number } {
  return {
    even: polyAt(poly.filter(([, p]) => p % 2 === 0), t),
    odd: polyAt(poly.filter(([, p]) => p % 2 === 1), t),
  };
}

/**
 * $f(t)$ and $f(-t)$ from one piece of arithmetic.
 *
 * Split the rule into its even-power terms, worth $E$ at $t$, and its
 * odd-power terms, worth $O$. At $-t$ the even ones are unchanged and the
 * odd ones change sign, so $f(t) = E + O$ and $f(-t) = E - O$. Difficulty 2
 * lets the coefficients be negative and moves $t$ further out.
 */
const splitTree: Generator<SplitParams> = {
  id: 'fun-split-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const coefficient = () => (hard ? rng.pick(COEFFICIENTS) : rng.int(1, 3));
    return {
      poly: [[coefficient(), 3], [coefficient(), 2], [coefficient(), 1], [coefficient(), 0]],
      t: hard ? rng.pick([2, 3]) : rng.pick([1, 2]),
    };
  },
  render: (params): Slide => {
    const { poly, t } = params;
    const { even, odd } = splitParts(params);
    const answer = [even, odd, even + odd, even - odd].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `$f(x) = ${polyTex(poly)}$. Fill in $E$, what its even-power terms come to at $x = ${t}$, and $O$, what its odd-power terms come to there. Then $f(${t})$ and $f(${-t})$.`,
        },
      ],
      expression: `\\begin{gathered} f(${t}) = E + O \\\\ f(${-t}) = E - O \\end{gathered}`,
      nodes: [
        { id: 'even', from: [] },
        { id: 'odd', from: [] },
        { id: 'plus', from: ['even', 'odd'] },
        { id: 'minus', from: ['even', 'odd'] },
      ],
      bank: treeBank(answer, [odd - even, -even - odd, -even, -odd], even + odd),
      answer,
    };
  },
  solution: (params) => {
    const { poly, t } = params;
    const { even, odd } = splitParts(params);
    const evens = poly.filter(([, p]) => p % 2 === 0);
    const odds = poly.filter(([, p]) => p % 2 === 1);
    return [
      { tex: `E = ${plugTex(evens, t)} = ${even}` },
      { tex: `O = ${plugTex(odds, t)} = ${odd}` },
      { text: `At $x = ${-t}$ the even-power terms are unchanged and the odd-power terms change sign.` },
      { tex: `f(${t}) = ${even} ${signedTile(odd)} = ${even + odd}` },
      { tex: `f(${-t}) = ${even} ${signedTile(-odd)} = ${even - odd}` },
    ];
  },
};

/* ---------- Lesson 4: periodic functions ---------- */

interface WaveParams {
  fn: 'sin' | 'cos';
  a: number;
  b: number;
  d: number;
}

/** `2\sin 3x + 1`, `-\cos 4x`. */
function waveTex({ fn, a, b, d }: WaveParams, inside = `${b}x`): string {
  return `${coefficientTex(a)}\\${fn} ${inside}${tail(d)}`;
}

/** Periods that land on the slider's five-degree steps and stay off its middle. */
const SLIDER_B = [3, 4, 6, 8, 9, 12];

/**
 * The end of one period, dragged to on the wave.
 *
 * The rule is given and the picture drawn from $x = 0$ to $360^{\circ}$, so
 * the learner works out $\frac{360}{b}$ and watches the line land where the
 * wave starts over. Difficulty 2 turns the wave over and lifts it, neither of
 * which changes the period.
 */
const periodSlider: Generator<WaveParams> = {
  id: 'fun-period-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      fn: rng.pick(['sin', 'cos'] as const),
      a: hard ? rng.pick(nonZeroRange(-3, 3)) : rng.int(1, 3),
      b: rng.pick(SLIDER_B),
      d: hard ? rng.pick(nonZeroRange(-2, 2)) : 0,
    };
  },
  render: (params): Slide => {
    const { fn, a, b, d } = params;
    const wave = (x: number) => a * Math[fn]((b * x * Math.PI) / 180) + d;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `$y = ${waveTex(params)}$, with $x$ in degrees, drawn from $x = 0$. Slide the line to where its first period ends.`,
        },
      ],
      min: 0,
      max: 360,
      step: 5,
      answer: 360 / b,
      readout: 'x = {v}^{\\circ}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 360,
          yMin: Math.min(0, d - Math.abs(a)) - 1,
          yMax: Math.max(0, d + Math.abs(a)) + 1,
          curves: [{ f: wave }],
          label: `A ${fn === 'sin' ? 'sine' : 'cosine'} wave from 0 to 360 degrees`,
        }),
        ...markerWindow(0, 360),
        axis: 'x',
      },
    };
  },
  solution: ({ fn, a, b, d }) => {
    const steps: SolutionStep[] = [
      { text: `$\\${fn} x$ repeats every $360^{\\circ}$. With $${b}x$ inside, $x$ only has to reach $\\frac{360}{${b}}$ for $${b}x$ to reach $360$.` },
      { tex: `\\frac{360}{${b}} = ${360 / b}` },
    ];
    if (a !== 1 || d !== 0) {
      steps.push({ text: 'The number in front and the number added on change the height of the wave, not how often it repeats.' });
    }
    steps.push({ text: `So the first period ends at $x = ${360 / b}^{\\circ}$.` });
    return steps;
  },
};

interface PeriodValueParams extends WaveParams {
  /** `plain` sin bx; `dressed` a sin bx + d; `slow` sin(x/b); `reverse` find b from the period. */
  form: 'plain' | 'dressed' | 'slow' | 'reverse';
}

const DIVISORS_OF_360 = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20];

function periodOf({ form, b }: PeriodValueParams): number {
  return form === 'slow' ? 360 * b : 360 / b;
}

/**
 * A period from the rule, in degrees.
 *
 * $\sin bx$ runs $b$ times as fast as $\sin x$, so its period is
 * $\frac{360}{b}$. Difficulty 2 dresses the wave with a number in front and
 * one added on, which do not change it; slows it down with $\frac{x}{b}$
 * inside, which multiplies it; or runs backwards, from the period to $b$.
 */
const periodValue: Generator<PeriodValueParams> = {
  id: 'fun-period-value',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos'] as const);
    if (difficulty <= 1) return { form: 'plain', fn, a: rng.int(1, 3), b: rng.pick(DIVISORS_OF_360), d: 0 };
    const form = rng.pick(['dressed', 'slow', 'reverse'] as const);
    if (form === 'slow') return { form, fn, a: rng.int(1, 3), b: rng.pick([2, 3, 4]), d: 0 };
    if (form === 'reverse') return { form, fn, a: 1, b: rng.pick(DIVISORS_OF_360), d: 0 };
    return {
      form,
      fn,
      a: rng.pick([-3, -2, -1, 2, 3]),
      b: rng.pick(DIVISORS_OF_360),
      d: rng.pick(COEFFICIENTS),
    };
  },
  render: (params): Slide => {
    const { form, fn, b } = params;
    if (form === 'reverse') {
      return {
        kind: 'expression',
        prompt: [{ kind: 'prose', text: `$y = \\${fn} bx$, with $x$ in degrees, has period $${360 / b}^{\\circ}$. Find $b$.` }],
        lead: 'b =',
        keypad: [],
        answer: `${b}`,
        domain: 'real',
        mode: 'exact',
      };
    }
    const rule = form === 'slow' ? waveTex(params, `\\frac{x}{${b}}`) : waveTex(params);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `Find the period of $y = ${rule}$, with $x$ in degrees.` }],
      lead: '\\text{period} =',
      keypad: [],
      answer: `${periodOf(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { form, fn, b } = params;
    if (form === 'reverse') {
      return [
        { text: `$\\${fn} bx$ has period $\\frac{360}{b}$, so:` },
        { tex: `\\frac{360}{b} = ${360 / b}` },
        { tex: `b = \\frac{360}{${360 / b}} = ${b}` },
      ];
    }
    if (form === 'slow') {
      return [
        { text: `$\\${fn} x$ repeats every $360^{\\circ}$. With $\\frac{x}{${b}}$ inside, $x$ has to go $${b}$ times as far before the inside reaches $360$.` },
        { tex: `360 \\times ${b} = ${360 * b}` },
      ];
    }
    const steps: SolutionStep[] = [
      { text: `$\\${fn} x$ repeats every $360^{\\circ}$. With $${b}x$ inside the wave runs $${b}$ times as fast, so it repeats $${b}$ times as often.` },
      { tex: `\\frac{360}{${b}} = ${360 / b}` },
    ];
    if (form === 'dressed') {
      steps.push({ text: 'The number in front stretches the wave up and the number added on lifts it; neither changes how often it repeats.' });
    }
    return steps;
  },
};

type PatternShape = 'tri' | 'arch' | 'double' | 'ramp';

interface PatternParams {
  shape: PatternShape;
  /** The period, in squares. */
  p: number;
  /** Where one repeat starts, 0 to p - 1. */
  s: number;
  /** The tall peak. */
  h: number;
  /** The short peak of `double`, or where `ramp` turns. */
  k: number;
}

/** The pattern at x: each repeat starts on the axis. */
function patternAt({ shape, p, s, h, k }: PatternParams, x: number): number {
  const along = (((x - s) % p) + p) % p;
  const u = along / p;
  const tent = (w: number) => (w < 0.5 ? 2 * w : 2 - 2 * w);
  if (shape === 'tri') return h * tent(u);
  if (shape === 'arch') return 4 * h * u * (1 - u);
  if (shape === 'double') return u < 0.5 ? h * tent(2 * u) : k * tent(2 * u - 1);
  return along < k ? (h * along) / k : (h * (p - along)) / (p - k);
}

/**
 * The period of a repeating graph, read off squared paper.
 *
 * Difficulty 1 is a zigzag or a row of arches, one peak a repeat. Difficulty
 * 2 has two different peaks in each repeat, where the gap between
 * neighbouring peaks is only half the period, or a lopsided zigzag, where
 * the distance up one side is not the period either.
 */
const periodChoice: Generator<PatternParams> = {
  id: 'fun-period-choice',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      const p = rng.int(2, 6);
      return { shape: rng.pick(['tri', 'arch'] as const), p, s: rng.int(0, p - 1), h: rng.int(1, 3), k: 0 };
    }
    if (rng.chance(0.5)) {
      const p = rng.pick([4, 6]);
      const [h, k] = rng.pick([[3, 1], [3, 2], [2, 1], [4, 2], [4, 1]]);
      return { shape: 'double', p, s: rng.int(0, p - 1), h, k };
    }
    const p = rng.int(3, 6);
    return drawUntil(
      () => ({ shape: 'ramp' as const, p, s: rng.int(0, p - 1), h: rng.int(2, 3), k: rng.int(1, p - 1) }),
      ({ k }) => 2 * k !== p,
      { shape: 'ramp', p: 5, s: 1, h: 3, k: 1 },
    );
  },
  render: (params): Slide => {
    const { shape, p, h, k } = params;
    const near =
      shape === 'double' ? [p / 2, 2 * p, p + 1] : shape === 'ramp' ? [k, p - k, 2 * p] : [p / 2, 2 * p, p + 1, p - 1];
    const labels = distinctFirst(
      `${p}`,
      near.filter((value) => Number.isInteger(value) && value > 0).map(String),
      p,
    );
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: -6,
            xMax: 6,
            yMin: -1,
            yMax: Math.max(h, k) + 1,
            grid: true,
            height: 150,
            curves: [{ f: (x) => patternAt(params, x) }],
            label: 'A graph repeating the same pattern again and again',
          }),
        },
        { kind: 'prose', text: 'Each square is one unit. What is the period of this function?' },
      ],
      ...fixedChoice(labels.map((label) => ({ label, tex: true }))),
    };
  },
  solution: ({ shape, p, s }) => {
    const start = s - p;
    const steps: SolutionStep[] = [
      { text: 'The period is how far along the pattern goes before it starts again exactly as before.' },
      { text: `One repeat starts on the axis at $x = ${start}$ and the next at $x = ${start + p}$.` },
      { tex: `\\text{period} = ${p}` },
    ];
    if (shape === 'double') {
      steps.push({ text: `The peaks are only $${p / 2}$ apart, but a tall one and a short one are different points of the pattern: the tall peaks are $${p}$ apart.` });
    }
    if (shape === 'ramp') {
      steps.push({ text: 'Going up one side and down the other are two parts of one repeat; the period is the whole of it.' });
    }
    return steps;
  },
};

interface RepeatParams {
  p: number;
  r: number;
  v: number;
  t: number;
}

/**
 * $f(t)$ from $f(r)$ and the period, when the two are a whole number of
 * periods apart — and not otherwise.
 *
 * Difficulty 1 always lands a whole number of periods further on.
 * Difficulty 2 goes either way along, and a third of the time lands between
 * repeats, where $f(r)$ says nothing about $f(t)$.
 */
const repeatFlow: Generator<RepeatParams> = {
  id: 'fun-repeat-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const p = hard ? rng.int(3, 8) : rng.int(2, 6);
    const r = rng.int(-4, 4);
    const v = rng.pick(nonZeroRange(-9, 9));
    if (!hard) return { p, r, v, t: r + p * rng.int(1, 3) };
    const n = rng.pick(nonZeroRange(-3, 3));
    const off = rng.chance(1 / 3) ? rng.int(1, p - 1) : 0;
    return { p, r, v, t: r + n * p + (n > 0 ? off : -off) };
  },
  render: ({ p, r, v, t }): Slide => {
    const gap = Math.abs(t - r);
    const whole = gap % p === 0;
    const gaps = distinctFirst(`${gap}`, [`${Math.abs(t + r)}`, `${Math.abs(t)}`, `${gap + p}`], gap, 3)
      .map(Number)
      .sort((x, y) => x - y);
    const values = distinctFirst(`${v}`, [v + gap, (gap / p) * v, -v].filter(Number.isInteger).map(String), v, 3)
      .map(Number)
      .sort((x, y) => x - y);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `$f$ is periodic. Find $f(${t})$, if it can be found.` }],
      subject: `\\begin{gathered} f(x + ${p}) = f(x) \\\\ f(${r}) = ${v} \\end{gathered}`,
      steps: [
        {
          id: 'gap',
          ask: `How far is $x = ${t}$ from $x = ${r}$?`,
          branches: gaps.map((value) => ({ label: `$${value}$`, to: 'whole' })),
        },
        {
          id: 'whole',
          ask: `The period is $${p}$. Is that distance a whole number of periods?`,
          branches: [
            { label: FLOW_YES, to: 'value' },
            { label: FLOW_NO, outcome: `Then $f(${t})$ cannot be found from $f(${r})$ alone.` },
          ],
        },
        {
          id: 'value',
          ask: `So what is $f(${t})$?`,
          branches: values.map((value) => ({ label: `$${value}$`, outcome: `So $f(${t}) = ${value}$.` })),
        },
      ],
      answer: whole ? [`$${gap}$`, FLOW_YES, `$${v}$`] : [`$${gap}$`, FLOW_NO],
    };
  },
  solution: ({ p, r, v, t }) => {
    const gap = Math.abs(t - r);
    const steps: SolutionStep[] = [
      { text: `$f(x + ${p}) = f(x)$ says the values repeat every $${p}$: moving $${p}$ along, either way, lands on the same value.` },
      { tex: `|${t} - ${br(r)}| = ${gap}` },
    ];
    if (gap % p === 0) {
      steps.push({ text: `$${gap} = ${gap / p} \\times ${p}$, a whole number of periods, so $f(${t}) = f(${r})$.` });
      steps.push({ tex: `f(${t}) = ${v}` });
    } else {
      steps.push({ text: `$${gap}$ is not a multiple of $${p}$, so $x = ${t}$ is part-way through a repeat: $f(${t})$ is a value this question has not been told.` });
    }
    return steps;
  },
};

/* ---------- Lesson 5: piecewise-defined functions ---------- */

interface Piece {
  sq: boolean;
  m: number;
  q: number;
}

/** A piece as the learner reads it: `x^2 - 1`, `2x + 3`, `4`. */
function pieceTex({ sq, m, q }: Piece): string {
  if (sq) return `x^2${tail(q)}`;
  return m === 0 ? `${q}` : linTex(m, q);
}

function pieceAt({ sq, m, q }: Piece, x: number): number {
  return sq ? x * x + q : m * x + q;
}

/** A piece with the number written in: `(-2)^2 + 1`, `3 \times 4 - 2`. */
function pieceSubTex({ sq, m, q }: Piece, x: number): string {
  if (sq) return `${br(x)}^2 ${q === 0 ? '' : signedTile(q)}`;
  if (m === 0) return `${q}`;
  return `${m === 1 ? br(x) : m === -1 ? negatedTex(x) : `${m} \\times ${br(x)}`} ${q === 0 ? '' : signedTile(q)}`;
}

type PieceKind = 'lin' | 'const' | 'sq';

function drawPiece(rng: Rng, kinds: PieceKind[]): Piece {
  const kind = rng.pick(kinds);
  if (kind === 'lin') return { sq: false, m: rng.pick(COEFFICIENTS), q: rng.int(-3, 3) };
  return { sq: kind === 'sq', m: 0, q: rng.int(-3, 3) };
}

/** Two pieces meeting at c; `leftOwns` puts c itself in the left piece. */
function twoPieceTex(left: Piece, right: Piece, c: number, leftOwns = false): string {
  return `f(x) = \\begin{cases} ${pieceTex(left)} & x ${leftOwns ? LEQ : '<'} ${c} \\\\ ${pieceTex(right)} & x ${leftOwns ? GT : GEQ} ${c} \\end{cases}`;
}

function threePieceTex(pieces: Piece[], [c1, c2]: number[]): string {
  const [a, b, c] = pieces.map(pieceTex);
  return `f(x) = \\begin{cases} ${a} & x < ${c1} \\\\ ${b} & ${c1} ${LEQ} x < ${c2} \\\\ ${c} & x ${GEQ} ${c2} \\end{cases}`;
}

/** Which piece x belongs to: each cut belongs to the piece on its right. */
function pieceIndex(cuts: number[], x: number): number {
  return cuts.filter((cut) => cut <= x).length;
}

/** Where piece `idx` applies, for the worked solution. */
function regionTex(cuts: number[], idx: number): string {
  if (idx === 0) return `x < ${cuts[0]}`;
  if (idx === cuts.length) return `x ${GEQ} ${cuts[cuts.length - 1]}`;
  return `${cuts[idx - 1]} ${LEQ} x < ${cuts[idx]}`;
}

function piecesTex(pieces: Piece[], cuts: number[]): string {
  return pieces.length === 2 ? twoPieceTex(pieces[0], pieces[1], cuts[0]) : threePieceTex(pieces, cuts);
}

/** Pieces that read differently from one another. */
function drawPieces(rng: Rng, count: number, kinds: PieceKind[]): Piece[] {
  return drawUntil(
    () => Array.from({ length: count }, () => drawPiece(rng, kinds)),
    (pieces) => new Set(pieces.map(pieceTex)).size === count,
    [
      { sq: true, m: 0, q: 1 },
      { sq: false, m: 2, q: -1 },
      { sq: false, m: -1, q: 3 },
    ].slice(0, count),
  );
}

/** Two cuts at least two apart, between -2 and 3. */
function drawCuts(rng: Rng): number[] {
  const c1 = rng.int(-2, 0);
  return [c1, rng.int(c1 + 2, 3)];
}

interface PieceValueParams {
  pieces: Piece[];
  cuts: number[];
  a: number;
}

function pieceSolution({ pieces, cuts, a }: PieceValueParams): SolutionStep[] {
  const idx = pieceIndex(cuts, a);
  const steps: SolutionStep[] = [
    { text: `$x = ${a}$ is in the stretch $${regionTex(cuts, idx)}$, so use the rule $${pieceTex(pieces[idx])}$.` },
  ];
  if (cuts.includes(a)) {
    steps.push({ text: `$${a}$ is where two pieces meet. The $${LEQ}$ or $${GEQ}$ says which one owns it: the piece whose stretch includes $x = ${a}$ itself.` });
  }
  steps.push({ tex: `f(${a}) = ${pieceSubTex(pieces[idx], a)} = ${pieceAt(pieces[idx], a)}` });
  return steps;
}

/**
 * $f(a)$ from the piece that covers $a$.
 *
 * Difficulty 1 has two pieces and an input clearly inside one of them.
 * Difficulty 2 has three, and half the time the input is exactly where two
 * meet, so the $<$ and $\leq$ decide.
 */
const pieceValue: Generator<PieceValueParams> = {
  id: 'fun-piece-value',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      const c = rng.int(-2, 2);
      return {
        pieces: drawPieces(rng, 2, ['lin', 'const', 'sq']),
        cuts: [c],
        a: rng.pick(range(-4, 4).filter((x) => x !== c)),
      };
    }
    const cuts = drawCuts(rng);
    return {
      pieces: drawPieces(rng, 3, ['lin', 'const', 'sq']),
      cuts,
      a: rng.chance(0.5) ? rng.pick(cuts) : rng.int(-4, 4),
    };
  },
  render: (params): Slide => {
    const { pieces, cuts, a } = params;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'This function has a different rule on each stretch of $x$:' },
        { kind: 'display', tex: piecesTex(pieces, cuts) },
        { kind: 'prose', text: `Find $f(${a})$.` },
      ],
      lead: `f(${a}) =`,
      keypad: [],
      answer: `${pieceAt(pieces[pieceIndex(cuts, a)], a)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: pieceSolution,
};

interface JoinParams {
  left: Piece;
  right: Piece;
  c: number;
}

/**
 * Either side of a join: the value each piece gives there, and the jump.
 *
 * A third of the draws are built to join up, so a jump of $0$ is an answer
 * the learner meets and not a sign of a slip. Difficulty 2 brings squares
 * and constants, and joins to the left of the $y$-axis.
 */
const joinTree: Generator<JoinParams> = {
  id: 'fun-join-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kinds: PieceKind[] = hard ? ['lin', 'const', 'sq'] : ['lin'];
    return drawUntil(
      () => {
        const c = hard ? rng.pick(nonZeroRange(-3, 3)) : rng.int(-2, 2);
        const [left, drawn] = drawPieces(rng, 2, kinds);
        if (!rng.chance(1 / 3)) return { left, right: drawn, c };
        const right = { ...drawn, q: pieceAt(left, c) - pieceAt({ ...drawn, q: 0 }, c) };
        return { left, right, c };
      },
      ({ left, right }) => Math.abs(right.q) <= 9 && pieceTex(left) !== pieceTex(right),
      { left: { sq: false, m: 1, q: 1 }, right: { sq: false, m: 2, q: 0 }, c: 1 },
    );
  },
  render: ({ left, right, c }): Slide => {
    const l = pieceAt(left, c);
    const r = pieceAt(right, c);
    const answer = [l, r, r - l].map(String);
    return {
      kind: 'tree',
      prompt: [
        { kind: 'display', tex: twoPieceTex(left, right, c) },
        {
          kind: 'prose',
          text: `Fill in what each piece gives at $x = ${c}$, then the jump there: the second piece's value take away the first's.`,
        },
      ],
      expression: '\\text{jump} = \\text{second} - \\text{first}',
      nodes: [
        { id: 'left', from: [] },
        { id: 'right', from: [] },
        { id: 'jump', from: ['left', 'right'] },
      ],
      bank: treeBank(answer, [l - r, l + r, pieceAt(left, -c), pieceAt(right, -c)], r - l),
      answer,
    };
  },
  solution: ({ left, right, c }) => {
    const l = pieceAt(left, c);
    const r = pieceAt(right, c);
    return [
      { text: `Put $x = ${c}$ into both rules, even though only the right one owns $x = ${c}$: the left one says where its piece stops.` },
      { text: `The left piece: $${pieceSubTex(left, c)} = ${l}$.` },
      { text: `The right piece: $${pieceSubTex(right, c)} = ${r}$.` },
      { text: `The jump: $${r} - ${br(l)} = ${r - l}$.` },
      {
        text:
          r === l
            ? `The two pieces meet at $(${c}, ${l})$, so the graph joins up with no break.`
            : `The graph breaks at $x = ${c}$: the left piece stops at height $${l}$, drawn hollow, and the right one starts at height $${r}$.`,
      },
    ];
  },
};

interface PieceChoiceParams {
  left: Piece;
  right: Piece;
  c: number;
  leftOwns: boolean;
}

function pieceChoiceLabels({ left, right, c, leftOwns }: PieceChoiceParams, hard: boolean): string[] {
  const flip = (piece: Piece): Piece => ({ ...piece, m: -piece.m });
  const moved = (piece: Piece): Piece => ({ ...piece, q: piece.q + (piece.q < 3 ? 1 : -1) });
  const correct = twoPieceTex(left, right, c, leftOwns);
  const others = hard
    ? [twoPieceTex(left, right, c, !leftOwns), twoPieceTex(left, flip(right), c, leftOwns), twoPieceTex(right, left, c, leftOwns)]
    : [twoPieceTex(right, left, c, leftOwns), twoPieceTex(left, flip(right), c, leftOwns), twoPieceTex(moved(left), right, c, leftOwns)];
  return [correct, ...others];
}

/**
 * The rule that draws a sketch, from four.
 *
 * Two straight pieces on squared paper, a filled dot on the piece that owns
 * the join and a hollow one on the piece that stops short. Difficulty 1 is a
 * flat piece then a slope; the others swap the pieces, turn the slope, or
 * move the flat piece. Difficulty 2 has two slopes, either piece may own the
 * join, and one option gives it to the wrong one — which only the dots show.
 */
const pieceChoice: Generator<PieceChoiceParams> = {
  id: 'fun-piece-choice',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      (): PieceChoiceParams => ({
        left: hard ? { sq: false, m: rng.pick([-2, -1, 1, 2]), q: rng.int(-3, 3) } : { sq: false, m: 0, q: rng.int(-3, 3) },
        right: { sq: false, m: rng.pick(hard ? [-2, -1, 1, 2] : [-1, 1]), q: rng.int(-3, 3) },
        c: rng.int(-2, 2),
        leftOwns: hard ? rng.chance(0.5) : false,
      }),
      (params) => {
        const { left, right, c } = params;
        const l = pieceAt(left, c);
        const r = pieceAt(right, c);
        return l !== r && Math.abs(l) <= 4 && Math.abs(r) <= 4 && new Set(pieceChoiceLabels(params, hard)).size === 4;
      },
      { left: { sq: false, m: 0, q: 2 }, right: { sq: false, m: 1, q: -2 }, c: 1, leftOwns: false },
    );
  },
  render: (params): Slide => {
    const { left, right, c, leftOwns } = params;
    const hard = left.m !== 0;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: -5,
            xMax: 5,
            yMin: -5,
            yMax: 5,
            grid: true,
            height: 200,
            curves: [
              { f: (x) => ((leftOwns ? x <= c : x < c) ? pieceAt(left, x) : Number.NaN), breaks: true },
              { f: (x) => ((leftOwns ? x > c : x >= c) ? pieceAt(right, x) : Number.NaN), breaks: true },
            ],
            marks: [
              { x: c, y: pieceAt(left, c), hollow: !leftOwns },
              { x: c, y: pieceAt(right, c), hollow: leftOwns },
            ],
            label: 'A graph in two straight pieces, with a filled dot and a hollow dot where they meet',
          }),
        },
        { kind: 'prose', text: 'Each square is one unit. A filled dot is on the graph and a hollow one is not. Which rule draws it?' },
      ],
      ...fixedChoice(pieceChoiceLabels(params, hard).map((label) => ({ label, tex: true }))),
    };
  },
  solution: ({ left, right, c, leftOwns }) => [
    { text: `Left of $x = ${c}$ the graph is the line $y = ${pieceTex(left)}$; to the right it is $y = ${pieceTex(right)}$.` },
    {
      text: `The filled dot at $x = ${c}$ is on the ${leftOwns ? 'left' : 'right'} piece, so that piece owns $x = ${c}$ and gets the $${leftOwns ? LEQ : GEQ}$.`,
    },
    { tex: twoPieceTex(left, right, c, leftOwns) },
  ],
};

/**
 * Which piece applies, and what it gives.
 *
 * The first gap takes the piece's rule, from a bank holding all three; the
 * second its value, beside what the other two pieces would give. Difficulty
 * 2 asks exactly at a join.
 */
const pieceTiles: Generator<PieceValueParams> = {
  id: 'fun-piece-tiles',
  sample: (rng, difficulty) => {
    const cuts = drawCuts(rng);
    return {
      pieces: drawPieces(rng, 3, ['lin', 'sq']),
      cuts,
      a: difficulty > 1 ? rng.pick(cuts) : rng.pick(range(-4, 4).filter((x) => !cuts.includes(x))),
    };
  },
  render: ({ pieces, cuts, a }): Slide => {
    const idx = pieceIndex(cuts, a);
    const value = pieceAt(pieces[idx], a);
    const answer = [pieceTex(pieces[idx]), numberTile(value)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'A function is defined in three pieces:' },
        { kind: 'display', tex: threePieceTex(pieces, cuts) },
        { kind: 'prose', text: `Which rule does $x = ${a}$ use, and what is $f(${a})$?` },
      ],
      template: `f(${a}) \\text{ uses } {0} \\text{, so } f(${a}) = {1}`,
      bank: bankOf(answer, [...pieces.map(pieceTex), ...pieces.map((piece) => numberTile(pieceAt(piece, a)))]),
      answer,
    };
  },
  solution: pieceSolution,
};

/* ======================================================================
 * Level 5: Transformations of Trigonometric Graphs
 * ==================================================================== */

/*
 * $y = a\sin(bx + c) + d$ read as what it does to $y = \sin x$: $a$ is a
 * stretch parallel to the $y$-axis, and a reflection too when it is negative;
 * $d$ a translation up; $b$ a stretch parallel to the $x$-axis with factor
 * $\frac{1}{b}$; and $c$ a translation across by $-\frac{c}{b}$, not $-c$.
 * $x$ is in degrees, as level 4 has it, and every number a learner types,
 * drags or places is whole: a shift is drawn as a multiple of $b$ so the
 * division comes out, and a peak at $\frac{90}{b}$ only where that is whole.
 *
 * A rule, or a chain of moves, is never typed: the checker compares values
 * and would take the question copied back. Rules go through tiles, steps,
 * flows and choices, and a typed answer is one number. Degrees live in prose
 * and slider readouts, never in a tiles template. Nothing here is calculus,
 * so no slide declares `source` and the differentiation oracle has nothing to
 * check; `functions.test.ts` samples each wave every five degrees instead and
 * works every quoted feature out again from the samples.
 *
 * The widget's own sine (`transformGraph.ts`) runs in radians, so the
 * `transform` questions of this level are the unit-free moves only: stretches
 * and moves up or down.
 */

type TrigFn = 'sin' | 'cos';

/** y = a fn(bx + c) + d, with x and c in degrees. */
interface Wave {
  fn: TrigFn;
  a: number;
  b: number;
  c: number;
  d: number;
}

function waveAt({ fn, a, b, c, d }: Wave, x: number): number {
  return a * Math[fn](((b * x + c) * Math.PI) / 180) + d;
}

/** `\sin x`, `3\sin 2x - 1`, `-\cos(3x + 60) + 2`. */
function trigTex({ fn, a, b, c, d }: Wave): string {
  const bx = b === 1 ? 'x' : `${b}x`;
  const inside = c === 0 ? ` ${bx}` : `(${bx}${tail(c)})`;
  return `${coefficientTex(a)}\\${fn}${inside}${tail(d)}`;
}

/** `\sin(2(x - 30))`: b taken out of the bracket, the curve moved h to the right. */
function factoredTex(fn: TrigFn, b: number, h: number): string {
  return `\\${fn}(${b}(${shiftedX(h)}))`;
}

/**
 * One expression rewritten, stacked a line at a time: a solution line of
 * `\sin(2x - 60) = \sin(2(x - 30))` runs off a phone screen.
 */
function stackTex(first: string, ...rest: string[]): string {
  return `\\begin{aligned} &${first} ${rest.map((line) => `\\\\ &= ${line}`).join(' ')} \\end{aligned}`;
}

/** A curve through its moves, one to a line, each marked with an arrow. */
function chainTex(first: string, ...rest: string[]): string {
  return `\\begin{aligned} &${first} ${rest.map((line) => `\\\\ \\to \\quad &${line}`).join(' ')} \\end{aligned}`;
}

/** A translation, written as a column vector. */
function vecTex(p: number, q: number): string {
  return `\\begin{pmatrix} ${p} \\\\ ${q} \\end{pmatrix}`;
}

/** A factor as plain text for an option label: `3`, `1/4`. */
function factorLabel(factor: number): string {
  return Number.isInteger(factor) ? `${factor}` : `1/${Math.round(1 / factor)}`;
}

function yStretchWords(a: number): string {
  return `stretched parallel to the $y$-axis with scale factor $${factorTex(a)}$`;
}

function xStretchWords(factor: number): string {
  return `stretched parallel to the $x$-axis with scale factor $${factorTex(factor)}$`;
}

/** A move across in plain text: "30° to the right". */
function acrossLabel(h: number): string {
  return `${Math.abs(h)}° to the ${h > 0 ? 'right' : 'left'}`;
}

/** A move up or down in plain text: "2 up". */
function upLabel(k: number): string {
  return `${Math.abs(k)} ${k > 0 ? 'up' : 'down'}`;
}

/** Flow branches in an order drawn from the labels, as `fixedChoice` orders options. */
function turned(labels: string[]): string[] {
  return fixedChoice(labels.map((label) => ({ label }))).options.map((option) => option.label);
}

/** A window that holds the wave and the x-axis, with a margin. */
function waveWindow({ a, d }: Wave): { yMin: number; yMax: number } {
  return { yMin: Math.min(0, d - Math.abs(a)) - 1, yMax: Math.max(0, d + Math.abs(a)) + 1 };
}

/** Waves from 0 to 360 degrees, the first solid and any after it dashed. */
function waveSvg(
  waves: Wave[],
  window: { yMin: number; yMax: number },
  label: string,
  extra: { marks?: { x: number; y: number }[]; horizontals?: number[] } = {},
): string {
  return plotSvg({
    xMin: 0,
    xMax: 360,
    ...window,
    curves: waves.map((wave, idx) => ({ f: (x: number) => waveAt(wave, x), dashed: idx > 0 })),
    ...extra,
    label,
  });
}

const plainWave = (fn: TrigFn, b = 1): Wave => ({ fn, a: 1, b, c: 0, d: 0 });

/**
 * Where a wave first peaks and first bottoms out, each strictly after x = 0.
 * $\sin bx$ peaks at $\frac{90}{b}$ and $\cos bx$ at $0$, so the first peak of
 * a cosine is a whole period along; a negative $a$ swaps the two.
 */
function extremaX({ fn, a, b, c }: Wave): { maxX: number; minX: number } {
  const period = 360 / b;
  const along = (angle: number) => {
    let x = (angle - c) / b;
    while (x <= 0) x += period;
    while (x > period) x -= period;
    return x;
  };
  const peak = along(fn === 'sin' ? 90 : 0);
  const trough = along(fn === 'sin' ? 270 : 180);
  return a > 0 ? { maxX: peak, minX: trough } : { maxX: trough, minX: peak };
}

/* ---------- Lesson 1: amplitude and midline ---------- */

interface ExtremesParams {
  wave: Wave;
  /** The maximum or minimum from the rule, or `a` or `d` back from them. */
  asks: 'max' | 'min' | 'a' | 'd';
}

function extremesAnswer({ wave, asks }: ExtremesParams): number {
  if (asks === 'a') return wave.a;
  if (asks === 'd') return wave.d;
  return asks === 'max' ? wave.d + Math.abs(wave.a) : wave.d - Math.abs(wave.a);
}

/**
 * The greatest or least value of $a\sin bx + d$.
 *
 * $\sin$ runs from $-1$ to $1$; the stretch makes that $-|a|$ to $|a|$, and
 * the translation lifts both by $d$. The $b$ is there to be ignored: a stretch
 * across changes nothing about the heights. Difficulty 2 turns the wave over
 * with a negative $a$, which leaves the greatest value at $d + |a|$ rather
 * than $d + a$, or runs backwards from a stated maximum and minimum to $a$ or
 * $d$.
 */
const waveExtremes: Generator<ExtremesParams> = {
  id: 'fun-wave-extremes',
  choices: (params) => {
    const { wave, asks } = params;
    const { a, d } = wave;
    const max = d + Math.abs(a);
    const min = d - Math.abs(a);
    if (asks === 'a') return numberChoices(a, max - min, max + min, d);
    if (asks === 'd') return numberChoices(d, max - min, max + min, a);
    if (asks === 'max') return numberChoices(max, d + a, d - a, Math.abs(a), d * Math.abs(a));
    return numberChoices(min, d + a, d - a, -Math.abs(a), d + Math.abs(a));
  },
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos'] as const);
    if (difficulty <= 1) {
      return {
        wave: { fn, a: rng.int(2, 5), b: rng.pick([1, 2, 3]), c: 0, d: rng.pick(nonZeroRange(-5, 5)) },
        asks: rng.pick(['max', 'min'] as const),
      };
    }
    const asks = rng.pick(['max', 'min', 'a', 'd'] as const);
    if (asks === 'a' || asks === 'd') {
      return { wave: { fn, a: rng.int(2, 6), b: 1, c: 0, d: rng.pick(nonZeroRange(-5, 5)) }, asks };
    }
    return {
      wave: { fn, a: rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]), b: rng.pick([1, 2, 3, 4]), c: 0, d: rng.pick(nonZeroRange(-5, 5)) },
      asks,
    };
  },
  render: (params): Slide => {
    const { wave, asks } = params;
    const answer = `${extremesAnswer(params)}`;
    if (asks === 'a' || asks === 'd') {
      const max = wave.d + wave.a;
      const min = wave.d - wave.a;
      return {
        kind: 'expression',
        prompt: [
          {
            kind: 'prose',
            text: `$y = a\\${wave.fn} x + d$, with $a > 0$, has a greatest value of $${max}$ and a least value of $${min}$. Find $${asks}$.`,
          },
        ],
        lead: `${asks} =`,
        keypad: [],
        answer,
        domain: 'real',
        mode: 'exact',
      };
    }
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `Find the ${asks === 'max' ? 'greatest' : 'least'} value of $y = ${trigTex(wave)}$.` },
      ],
      lead: asks === 'max' ? '\\text{greatest} =' : '\\text{least} =',
      keypad: [],
      answer,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { wave, asks } = params;
    const { fn, a, b, d } = wave;
    const size = Math.abs(a);
    if (asks === 'a' || asks === 'd') {
      const max = d + a;
      const min = d - a;
      return [
        { text: `The midline $d$ is halfway between the greatest and least values, and $a$ is how far the wave swings either side of it.` },
        asks === 'a'
          ? { tex: `a = \\frac{${max} - ${br(min)}}{2} = ${a}` }
          : { tex: `d = \\frac{${max} + ${br(min)}}{2} = ${d}` },
      ];
    }
    const steps: SolutionStep[] = [
      { text: `$\\${fn}$ runs from $-1$ to $1$. The stretch by $${size}$ makes that $${-size}$ to $${size}$${a < 0 ? ': the minus sign turns the wave over, but it still reaches both' : ''}.` },
    ];
    if (b !== 1) steps.push({ text: `The $${b}$ inside stretches the wave across, which changes no heights.` });
    steps.push({ text: `Adding $${d}$ translates every point by $${d}$.` });
    steps.push(
      asks === 'max'
        ? { tex: `\\text{greatest} = ${d} + ${size} = ${d + size}` }
        : { tex: `\\text{least} = ${d} - ${size} = ${d - size}` },
    );
    return steps;
  },
};

interface AmpSliderParams {
  fn: TrigFn;
  /** The stretch parallel to the y-axis. */
  a: number;
  /** Reflected in the x-axis after the stretch. */
  flip: boolean;
  d: number;
  asks: 'max' | 'min' | 'midline';
}

function ampSliderAnswer({ a, d, asks }: AmpSliderParams): number {
  return asks === 'max' ? d + a : asks === 'min' ? d - a : d;
}

/**
 * Where a feature lands after the moves, dragged to on the picture.
 *
 * Only $y = \sin x$ is drawn, dashed; the moves are described, and the learner
 * works out the new height and slides a line to it. Difficulty 2 puts a
 * reflection between the two, which changes neither the greatest nor the
 * least value, and asks for the midline too.
 */
const ampSlider: Generator<AmpSliderParams> = {
  id: 'fun-amp-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      fn: rng.pick(['sin', 'cos'] as const),
      a: rng.int(2, 4),
      flip: hard && rng.chance(0.6),
      d: rng.pick(nonZeroRange(-3, 3)),
      asks: rng.pick(hard ? (['max', 'min', 'midline'] as const) : (['max', 'min'] as const)),
    };
  },
  render: (params): Slide => {
    const { fn, a, flip, d, asks } = params;
    const moves = [yStretchWords(a), ...(flip ? ['then reflected in the $x$-axis'] : []), `then ${translateWords(0, d)}`];
    const feature = asks === 'max' ? 'greatest value' : asks === 'min' ? 'least value' : 'midline';
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The dashed curve is $y = \\${fn} x$, with $x$ in degrees. It is ${moves.join(', ')}. Slide the line to the height of the new curve's ${feature}.`,
        },
      ],
      min: -7,
      max: 7,
      step: 1,
      answer: ampSliderAnswer(params),
      readout: 'y = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 360,
          yMin: -7,
          yMax: 7,
          curves: [{ f: (x) => waveAt(plainWave(fn), x), dashed: true }],
          label: `The curve y = ${fn} x, dashed, from 0 to 360 degrees`,
        }),
        ...markerWindow(-7, 7, 'y'),
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { fn, a, flip, d, asks } = params;
    const rule = trigTex({ fn, a: flip ? -a : a, b: 1, c: 0, d });
    const steps: SolutionStep[] = [
      { text: `The stretch multiplies every height by $${a}$, so the curve runs from $${-a}$ to $${a}$.` },
    ];
    if (flip) steps.push({ text: 'The reflection turns it over: it still runs from the same lowest point to the same highest.' });
    steps.push({ text: `The translation adds $${d}$ to every height, so the new curve is $y = ${rule}$.` });
    if (asks === 'midline') steps.push({ tex: `\\text{midline: } y = ${d}` });
    else if (asks === 'max') steps.push({ tex: `\\text{greatest} = ${d} + ${a} = ${d + a}` });
    else steps.push({ tex: `\\text{least} = ${d} - ${a} = ${d - a}` });
    return steps;
  },
};

function translateWords(p: number, q: number): string {
  return `translated by $${vecTex(p, q)}$`;
}

interface AmpTilesParams {
  fn: TrigFn;
  /** The stretch parallel to the y-axis. */
  a: number;
  /** Reflected in the x-axis after the stretch. */
  flip: boolean;
  d: number;
}

/** The number in front as a tile, spelt as `numberTile` spells a negative. */
function frontTile(a: number, flip: boolean): string {
  return flip ? `- ${factorTex(a)}` : factorTex(a);
}

/**
 * The moves into a rule.
 *
 * A stretch parallel to the $y$-axis multiplies the whole of $\sin x$, so its
 * factor goes in front; the translation by $\binom{0}{d}$ goes on the end.
 * The bank holds the swap of the two, the wrong sign on each, and the factor
 * turned upside down. Difficulty 2 reflects the curve as well, and may squash
 * it by a half or a third.
 */
const ampTiles: Generator<AmpTilesParams> = {
  id: 'fun-amp-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      fn: rng.pick(['sin', 'cos'] as const),
      a: hard ? rng.pick([2, 3, 4, 5, 1 / 2, 1 / 3]) : rng.int(2, 5),
      flip: hard && rng.chance(0.6),
      d: rng.pick(nonZeroRange(-6, 6)),
    };
  },
  render: (params): Slide => {
    const { fn, a, flip, d } = params;
    const moves = [yStretchWords(a), ...(flip ? ['then reflected in the $x$-axis'] : []), `then ${translateWords(0, d)}`];
    const answer = [frontTile(a, flip), signedTile(d)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `$y = \\${fn} x$ is ${moves.join(', ')}. Write the equation of the new curve.` },
      ],
      template: `y = {0}\\${fn} x {1}`,
      bank: bankOf(answer, [
        frontTile(a, !flip),
        factorTex(1 / a),
        numberTile(d),
        signedTile(-d),
        ...(Number.isInteger(a) ? [signedTile(a)] : []),
      ]),
      answer,
    };
  },
  solution: ({ fn, a, flip, d }) => {
    const front = flip ? `-${factorTex(a)}` : factorTex(a);
    const steps: SolutionStep[] = [
      { text: `A stretch parallel to the $y$-axis multiplies every height by $${factorTex(a)}$, so the factor goes in front.` },
      { tex: `y = ${factorTex(a)}\\${fn} x` },
    ];
    if (flip) {
      steps.push({ text: 'Reflecting in the $x$-axis changes the sign of every height.' });
      steps.push({ tex: `y = -${factorTex(a)}\\${fn} x` });
    }
    steps.push({ text: `The translation by $${vecTex(0, d)}$ adds $${d}$ to every height, on the end.` });
    steps.push({ tex: `y = ${front}\\${fn} x${tail(d)}` });
    return steps;
  },
};

interface AmpFlowParams {
  fn: TrigFn;
  a: number;
  d: number;
  asks: 'max' | 'min';
}

/**
 * A rule taken apart into its moves, then a value from them.
 *
 * First what the number in front does — a stretch parallel to the $y$-axis,
 * not the $x$-axis, and a reflection too when it is negative — then what the
 * number on the end does, as a vector, then the greatest or least value the
 * two give. Difficulty 2 makes the number in front negative more often than
 * not.
 */
const ampFlow: Generator<AmpFlowParams> = {
  id: 'fun-amp-flow',
  sample: (rng, difficulty) => {
    const size = rng.int(2, 5);
    return {
      fn: rng.pick(['sin', 'cos'] as const),
      a: difficulty > 1 && rng.chance(0.6) ? -size : size,
      d: rng.pick(nonZeroRange(-5, 5)),
      asks: rng.pick(['max', 'min'] as const),
    };
  },
  render: ({ fn, a, d, asks }): Slide => {
    const size = Math.abs(a);
    const yLabel = `Stretch parallel to the $y$-axis, scale factor $${size}$`;
    const flipLabel = `${yLabel}, and reflect in the $x$-axis`;
    const front = turned([
      yLabel,
      flipLabel,
      `Stretch parallel to the $x$-axis, scale factor $${size}$`,
      `Stretch parallel to the $x$-axis, scale factor $\\tfrac{1}{${size}}$`,
    ]);
    const vector = (p: number, q: number) => `Translate by $${vecTex(p, q)}$`;
    const add = turned([vector(0, d), vector(0, -d), vector(d, 0), vector(-d, 0)]);
    const target = asks === 'max' ? d + size : d - size;
    const word = asks === 'max' ? 'greatest' : 'least';
    const values = offer(target, d + a, d - a, asks === 'max' ? size : -size, asks === 'max' ? d - size : d + size);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `How is this curve made from $y = \\${fn} x$, and what is its ${word} value?` }],
      subject: `y = ${trigTex({ fn, a, b: 1, c: 0, d })}`,
      steps: [
        {
          id: 'front',
          ask: `What does the $${a}$ in front do?`,
          branches: front.map((label) => ({ label, to: 'end' })),
        },
        {
          id: 'end',
          ask: `And the $${tail(d).trim()}$ on the end?`,
          branches: add.map((label) => ({ label, to: 'value' })),
        },
        {
          id: 'value',
          ask: `So what is the ${word} value of $y$?`,
          branches: values.map((value) => ({ label: `$${value}$`, outcome: `So the ${word} value is $${value}$.` })),
        },
      ],
      answer: [a < 0 ? flipLabel : yLabel, vector(0, d), `$${target}$`],
    };
  },
  solution: ({ fn, a, d, asks }) => {
    const size = Math.abs(a);
    return [
      { text: `A number in front of $\\${fn} x$ multiplies every height, so it is a stretch parallel to the $y$-axis with scale factor $${size}$.${a < 0 ? ' Its minus sign also turns every height over: a reflection in the $x$-axis.' : ''}` },
      { text: `A number on the end adds to every height: a translation by $${vecTex(0, d)}$.` },
      { text: `The stretch takes the heights to between $${-size}$ and $${size}$; the translation adds $${d}$.` },
      asks === 'max' ? { tex: `\\text{greatest} = ${d} + ${size} = ${d + size}` } : { tex: `\\text{least} = ${d} - ${size} = ${d - size}` },
    ];
  },
};

/* ---------- Lesson 2: period as a stretch ---------- */

interface XStretchParams {
  fn: TrigFn;
  /** The scale factor parallel to the x-axis: 1/b squashes, a whole number spreads. */
  factor: number;
  /** The number in front, carried along untouched. */
  a: number;
  /** `words`: the stretch given and the rule asked; `rule`: the reverse. */
  dir: 'words' | 'rule';
}

/** What $x$ becomes inside after a stretch across by `factor`: `3x`, `\tfrac{x}{2}`. */
function stretchedInside(factor: number): string {
  return Number.isInteger(factor) ? `\\tfrac{x}{${factor}}` : `${Math.round(1 / factor)}x`;
}

/** `\tfrac{2}{3}`, `6`: a whole number or a fraction in lowest terms. */
function ratioTex(top: number, bottom: number): string {
  let [p, q] = [top, bottom];
  while (q !== 0) [p, q] = [q, p % q];
  const [n, m] = [top / p, bottom / p];
  return m === 1 ? `${n}` : `\\tfrac{${n}}{${m}}`;
}

/** A number in front times a factor, as it would sit in front of the sine: nothing when it comes to 1. */
function scaledFront(a: number, factor: number): string {
  const [top, bottom] = Number.isInteger(factor) ? [a * factor, 1] : [a, Math.round(1 / factor)];
  const front = ratioTex(top, bottom);
  return front === '1' ? '' : front;
}

/**
 * A stretch parallel to the $x$-axis, and the $b$ it makes.
 *
 * Stretching by $\frac{1}{3}$ squeezes three waves into the room of one, which
 * is $\sin 3x$: the factor and the number inside are reciprocals, and the
 * options are both, and both again read as a stretch parallel to the
 * $y$-axis. Asked both ways round. Difficulty 2 stretches outwards as well as
 * in, which puts a fraction inside, and carries a number in front along.
 */
const xStretchChoice: Generator<XStretchParams> = {
  id: 'fun-xstretch-choice',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const factor = hard && rng.chance(0.4) ? rng.pick([2, 3, 4]) : 1 / rng.pick(hard ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 8, 9, 10]);
    return {
      fn: rng.pick(['sin', 'cos'] as const),
      factor,
      a: hard ? rng.pick([1, 2, 3]) : 1,
      dir: rng.pick(['words', 'rule'] as const),
    };
  },
  render: ({ fn, factor, a, dir }): Slide => {
    const start = `y = ${coefficientTex(a)}\\${fn} x`;
    const rule = (f: number) => `y = ${coefficientTex(a)}\\${fn} ${stretchedInside(f)}`;
    if (dir === 'words') {
      return {
        kind: 'choice',
        prompt: [{ kind: 'prose', text: `$${start}$ is ${xStretchWords(factor)}. What is the equation of the new curve?` }],
        ...fixedChoice(
          [
            rule(factor),
            rule(1 / factor),
            `y = ${scaledFront(a, factor)}\\${fn} x`,
            `y = ${scaledFront(a, 1 / factor)}\\${fn} x`,
          ].map((label) => ({ label, tex: true })),
        ),
      };
    }
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which transformation maps $${start}$ onto $${rule(factor)}$?` }],
      ...fixedChoice(
        [
          `Stretch parallel to the x-axis, scale factor ${factorLabel(factor)}`,
          `Stretch parallel to the x-axis, scale factor ${factorLabel(1 / factor)}`,
          `Stretch parallel to the y-axis, scale factor ${factorLabel(1 / factor)}`,
          `Stretch parallel to the y-axis, scale factor ${factorLabel(factor)}`,
        ].map((label) => ({ label })),
      ),
    };
  },
  solution: ({ fn, factor, a }) => {
    const inner = stretchedInside(factor);
    return [
      { text: `A stretch parallel to the $x$-axis with scale factor $${factorTex(factor)}$ moves every point to $${factorTex(factor)}$ times its distance from the $y$-axis.` },
      { text: `So the new curve does at $x$ what the old one did at $${Number.isInteger(factor) ? `\\tfrac{x}{${factor}}` : `${Math.round(1 / factor)}x`}$: write that in place of $x$.` },
      { tex: `y = ${coefficientTex(a)}\\${fn} ${inner}` },
      { text: `The factor and the number multiplying $x$ are reciprocals. A number in front would be a stretch parallel to the $y$-axis instead.` },
    ];
  },
};

interface PeriodTreeParams {
  fn: TrigFn;
  b: number;
  /** The scale factor parallel to the x-axis. */
  k: number;
}

/**
 * A stretch across, followed through the period.
 *
 * The period of $\sin bx$ is $\frac{360}{b}$; a stretch parallel to the
 * $x$-axis with factor $k$ multiplies every distance across by $k$, the
 * period with it; and the new $b$ is $360$ over the new period. Difficulty 1
 * stretches outwards by $2$ or $3$; difficulty 2 mostly squashes, by a half
 * or a third, which shortens the period and raises $b$.
 */
const periodTree: Generator<PeriodTreeParams> = {
  id: 'fun-period-tree',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos'] as const);
    if (difficulty <= 1) {
      const k = rng.pick([2, 3]);
      return { fn, k, b: rng.pick(DIVISORS_OF_360.filter((b) => b % k === 0)) };
    }
    if (rng.chance(0.2)) return { fn, k: 4, b: rng.pick([4, 8, 12, 20]) };
    const m = rng.pick([2, 3]);
    return { fn, k: 1 / m, b: rng.pick(DIVISORS_OF_360.filter((b) => 360 % (b * m) === 0)) };
  },
  render: ({ fn, b, k }): Slide => {
    const before = 360 / b;
    const after = Math.round(before * k);
    const newB = Math.round(360 / after);
    const answer = [before, after, newB].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `$y = \\${fn} ${b}x$, with $x$ in degrees, is ${xStretchWords(k)}. Fill in its period, then the period after the stretch, then the new $b$.`,
        },
      ],
      expression: `y = \\${fn} ${b}x \\;\\to\\; y = \\${fn} bx`,
      nodes: [
        { id: 'before', from: [] },
        { id: 'after', from: ['before'] },
        { id: 'b', from: ['after'] },
      ],
      // The stretch taken the wrong way, and b multiplied by the factor instead of divided.
      bank: treeBank(answer, [Number.isInteger(k) ? before / k : before * Math.round(1 / k), Number.isInteger(k) ? b * k : b / Math.round(1 / k), after / 2], newB),
      answer,
    };
  },
  solution: ({ fn, b, k }) => {
    const before = 360 / b;
    const after = Math.round(before * k);
    return [
      { text: `The period of $\\${fn} ${b}x$ is:` },
      { tex: `\\frac{360}{${b}} = ${before}` },
      { text: `A stretch parallel to the $x$-axis with scale factor $${factorTex(k)}$ multiplies every distance across by $${factorTex(k)}$, the length of a wave included.` },
      { tex: `${before} \\times ${factorTex(k)} = ${after}` },
      { tex: `b = \\frac{360}{${after}} = ${Math.round(360 / after)}` },
      { text: `So the new curve is $y = ${trigTex(plainWave(fn, Math.round(360 / after)))}$: stretching across by $${factorTex(k)}$ divides $b$ by $${factorTex(k)}$.` },
    ];
  },
};

interface BGraphParams {
  wave: Wave;
  /** `peaks`: two neighbouring maxima ringed; `half`: a maximum and the minimum after it. */
  gap: 'peaks' | 'half';
}

/** The two ringed x-coordinates, both inside 0 to 360. */
function bGraphPoints({ wave, gap }: BGraphParams): [number, number] {
  const { maxX, minX } = extremaX(wave);
  const period = 360 / wave.b;
  if (gap === 'peaks') return [maxX, maxX + period];
  return [maxX, minX > maxX ? minX : minX + period];
}

/**
 * $b$ from a period read off the graph.
 *
 * The rule is given with $b$ missing and the curve drawn, two points ringed
 * and their $x$-coordinates stated. Difficulty 1 rings two neighbouring
 * peaks, a whole period apart. Difficulty 2 rings a peak and the trough after
 * it, which is only half a period: taking that gap as the period doubles $b$.
 */
const bFromGraph: Generator<BGraphParams> = {
  id: 'fun-b-from-graph',
  choices: (params) => {
    const [x1, x2] = bGraphPoints(params);
    const { b } = params.wave;
    return numberChoices(b, 360 / (x2 - x1), 2 * b, b / 2, x2 - x1);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const fn = rng.pick(['sin', 'cos'] as const);
    // A sine peaks at 90/b and a cosine's trough sits at 180/b: whole only for these.
    const bs = fn === 'sin' ? [2, 3, 5, 6, 9, 10] : hard ? [2, 3, 4, 5, 6, 9, 10] : [2, 3, 4, 5, 6, 8, 9, 10];
    return {
      wave: { fn, a: rng.int(1, 3), b: rng.pick(bs), c: 0, d: rng.int(-2, 2) },
      gap: hard ? 'half' : 'peaks',
    };
  },
  render: (params): Slide => {
    const { wave, gap } = params;
    const [x1, x2] = bGraphPoints(params);
    const top = wave.d + wave.a;
    const y2 = gap === 'peaks' ? top : wave.d - wave.a;
    const rule = `y = ${coefficientTex(wave.a)}\\${wave.fn} bx${tail(wave.d)}`;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'diagram',
          svg: waveSvg([wave], waveWindow(wave), `A wave from 0 to 360 degrees with two points ringed`, {
            marks: [
              { x: x1, y: top },
              { x: x2, y: y2 },
            ],
          }),
        },
        {
          kind: 'prose',
          text: `This is $${rule}$, with $x$ in degrees. The ringed points are ${gap === 'peaks' ? 'two neighbouring maxima' : 'a maximum and the minimum straight after it'}, at $x = ${x1}$ and $x = ${x2}$. Find $b$.`,
        },
      ],
      lead: 'b =',
      keypad: [],
      answer: `${wave.b}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const [x1, x2] = bGraphPoints(params);
    const period = 360 / params.wave.b;
    const steps: SolutionStep[] =
      params.gap === 'peaks'
        ? [
            { text: 'From one maximum to the next is one whole period.' },
            { tex: `\\text{period} = ${x2} - ${x1} = ${period}` },
          ]
        : [
            { text: 'From a maximum to the next minimum is only half a wave, so the period is twice the gap.' },
            { tex: `${x2} - ${x1} = ${x2 - x1}` },
            { tex: `\\text{period} = 2 \\times ${x2 - x1} = ${period}` },
          ];
    steps.push({ text: 'The period of a wave with $bx$ inside is $\\frac{360}{b}$, so:' });
    steps.push({ tex: `b = \\frac{360}{${period}} = ${params.wave.b}` });
    return steps;
  },
};

/* ---------- Lesson 3: phase shift and the sign trap ---------- */

interface PhaseParams {
  fn: TrigFn;
  b: number;
  /** How far the curve moves across, to the right when positive. */
  h: number;
}

/** A shift in degrees: `±step` to `±most`, never 0. */
function drawShift(rng: Rng, step: number, most: number): number {
  return rng.sign() * step * rng.int(1, most / step);
}

/**
 * Whether "which way and how far" has one answer: the move is under half a
 * period, and every other move offered beside it draws a different curve. A
 * wave repeats, so a move of $h$ and a move of $bh$ are the same curve when
 * they differ by whole periods — $\cos(3(x + 30))$ and $\cos(3(x + 270))$ —
 * and an option or tile that is secretly right as well is a question with two
 * answers.
 */
function clearShifts(b: number, h: number, others: number[]): boolean {
  const period = 360 / b;
  if (2 * Math.abs(h) >= period) return false;
  const all = [h, ...others];
  return all.every((p, i) => all.every((q, j) => i === j || (((p - q) % period) + period) % period !== 0));
}

/** `\sin(2x - 60)`: the moved curve, bracket unfactored. */
function movedTex({ fn, b, h }: PhaseParams): string {
  return trigTex({ fn, a: 1, b, c: -b * h, d: 0 });
}

/** `\sin 2x`, `\cos x`: the curve before it moves. */
function unmovedTex({ fn, b }: PhaseParams): string {
  return trigTex(plainWave(fn, b));
}

/**
 * Which translation moves the curve onto $\sin(bx + c)$?
 *
 * Difficulty 1 has $b = 1$: $\sin(x - 30)$ is $30$ to the **right**, against
 * the sign, and the options hold the other way and the two moves up and down.
 * Difficulty 2 has $b$ from $2$ to $4$, where $\sin(2x - 60)$ moves only
 * $30$, and the trap of moving $60$ is offered both ways.
 */
const phaseChoice: Generator<PhaseParams> = {
  id: 'fun-phase-choice',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos'] as const);
    if (difficulty <= 1) return { fn, b: 1, h: drawShift(rng, 10, 90) };
    return drawUntil(
      () => ({ fn, b: rng.int(2, 4), h: drawShift(rng, 5, 45) }),
      ({ b, h }) => clearShifts(b, h, [b * h, -h, -b * h]),
      { fn, b: 2, h: 20 },
    );
  },
  render: (params): Slide => {
    const { b, h } = params;
    const labels =
      b === 1
        ? [acrossLabel(h), acrossLabel(-h), upLabel(Math.abs(h)), upLabel(-Math.abs(h))]
        : [acrossLabel(h), acrossLabel(b * h), acrossLabel(-h), acrossLabel(-b * h)];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `With $x$ in degrees, which translation maps $y = ${unmovedTex(params)}$ onto $y = ${movedTex(params)}$?`,
        },
      ],
      ...fixedChoice(labels.map((label) => ({ label: `Translate ${label}` }))),
    };
  },
  solution: (params) => {
    const { fn, b, h } = params;
    const steps: SolutionStep[] = [];
    if (b !== 1) {
      steps.push({ text: `Take $${b}$ out of the bracket, so the change to $x$ itself shows.` });
      steps.push({ tex: stackTex(movedTex(params), factoredTex(fn, b, h)) });
    }
    steps.push({
      text: `$${shiftedX(h)}$ in place of $x$ means the new curve reaches each value ${Math.abs(h)}° ${h > 0 ? 'later' : 'earlier'} than the old one: it has moved ${acrossLabel(h)}, against the sign.`,
    });
    steps.push({ tex: `\\text{translation by } ${vecTex(h, 0)}` });
    if (b !== 1) steps.push({ text: `Not $${Math.abs(b * h)}°$: the number in the bracket is shared out over the $${b}$.` });
    return steps;
  },
};

/**
 * $\sin(bx + c)$ rewritten as $\sin(b(x + \frac{c}{b}))$, then read as a
 * vector.
 *
 * The first step's bank holds the slips of taking $b$ out — $c$ left as it
 * was, multiplied instead of divided, the sign turned — and the second step's
 * the move with its sign and its size each got wrong. Difficulty 2 has larger
 * $b$, so the gap between $c$ and $\frac{c}{b}$ is wider.
 */
const phaseSteps: Generator<PhaseParams> = {
  id: 'fun-phase-steps',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos'] as const);
    const hard = difficulty > 1;
    return drawUntil(
      () => (hard ? { fn, b: rng.int(4, 6), h: drawShift(rng, 5, 30) } : { fn, b: rng.int(2, 3), h: drawShift(rng, 5, 45) }),
      ({ b, h }) => clearShifts(b, h, [b * h, -h, b * b * h, -b * h]),
      { fn, b: hard ? 4 : 2, h: 10 },
    );
  },
  render: (params): Slide => {
    const { fn, b, h } = params;
    const factored = factoredTex(fn, b, h);
    const vector = vecTex(h, 0);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `How far, and which way, has $y = ${unmovedTex(params)}$ moved? The line is the new rule, with $x$ in degrees: take $${b}$ out of the bracket, then choose the translation. ${HOW_TO_STEP}`,
        },
      ],
      start: [movedTex(params)],
      reductions: [
        {
          span: [0, 1],
          value: factored,
          bank: stepBank(factored, factoredTex(fn, b, b * h), factoredTex(fn, b, -h), factoredTex(fn, b, b * b * h)),
        },
        {
          span: [0, 1],
          value: vector,
          bank: stepBank(vector, vecTex(-h, 0), vecTex(b * h, 0), vecTex(-b * h, 0)),
        },
      ],
    };
  },
  solution: (params) => {
    const { fn, b, h } = params;
    return [
      { text: `Divide the number in the bracket by $${b}$ as you take $${b}$ out:` },
      { tex: stackTex(movedTex(params), factoredTex(fn, b, h)) },
      { text: `Now $x$ itself has been replaced by $${shiftedX(h)}$, which moves the curve ${acrossLabel(h)}.` },
      { tex: `\\text{translation by } ${vecTex(h, 0)}` },
    ];
  },
};

interface PhaseSliderParams extends PhaseParams {
  asks: 'max' | 'min';
}

/** Where the unmoved curve first peaks or bottoms out, after x = 0. */
function phaseBase({ fn, b, asks }: PhaseSliderParams): number {
  const { maxX, minX } = extremaX(plainWave(fn, b));
  return asks === 'max' ? maxX : minX;
}

/** Where the moved curve first peaks or bottoms out, after x = 0. */
function phaseTarget(params: PhaseSliderParams): number {
  const { maxX, minX } = extremaX({ fn: params.fn, a: 1, b: params.b, c: -params.b * params.h, d: 0 });
  return params.asks === 'max' ? maxX : minX;
}

/**
 * The first peak or trough of the moved curve, slid to on the picture.
 *
 * The unmoved curve is drawn dashed with its first peak or trough ringed and
 * its position stated; the learner moves it by the translation the rule
 * makes. Difficulty 1 is $\sin(x \pm c)$, and the trough of $\cos(x \pm c)$;
 * difficulty 2 has $b$ of $2$ or $3$ with the bracket unfactored, so the move
 * is $\frac{c}{b}$, and a move left past $0$ comes back round a period
 * later.
 */
const phaseSlider: Generator<PhaseSliderParams> = {
  id: 'fun-phase-slider',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      return rng.chance(0.7)
        ? { fn: 'sin', b: 1, h: drawShift(rng, 10, 80), asks: rng.pick(['max', 'min'] as const) }
        : { fn: 'cos', b: 1, h: drawShift(rng, 10, 80), asks: 'min' };
    }
    return drawUntil(
      () => ({
        fn: rng.pick(['sin', 'cos'] as const),
        b: rng.pick([2, 3]),
        h: drawShift(rng, 5, 40),
        asks: rng.pick(['max', 'min'] as const),
      }),
      (params) => Number.isInteger(phaseTarget(params)) && phaseTarget(params) % 5 === 0 && phaseTarget(params) < 360,
      { fn: 'sin', b: 2, h: 20, asks: 'max' },
    );
  },
  render: (params): Slide => {
    const { fn, b, asks } = params;
    const base = phaseBase(params);
    const word = asks === 'max' ? 'maximum' : 'minimum';
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The dashed curve is $y = ${unmovedTex(params)}$, with $x$ in degrees; its first ${word} after $x = 0$ is ringed, at $x = ${base}$. Slide the line to the first ${word} of $y = ${movedTex(params)}$.`,
        },
      ],
      min: 0,
      max: 360,
      step: 5,
      answer: phaseTarget(params),
      readout: 'x = {v}^{\\circ}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 360,
          yMin: -1.6,
          yMax: 1.6,
          curves: [{ f: (x) => waveAt(plainWave(fn, b), x), dashed: true }],
          marks: [{ x: base, y: asks === 'max' ? 1 : -1 }],
          label: `The curve y = ${fn} ${b === 1 ? '' : b}x, dashed, with its first ${word} ringed`,
        }),
        ...markerWindow(0, 360),
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { fn, b, h, asks } = params;
    const base = phaseBase(params);
    const target = phaseTarget(params);
    const word = asks === 'max' ? 'maximum' : 'minimum';
    const steps: SolutionStep[] = [];
    if (b !== 1) steps.push({ tex: stackTex(movedTex(params), factoredTex(fn, b, h)) });
    steps.push({ text: `So the curve has moved ${acrossLabel(h)}, and every point on it with it.` });
    steps.push({ tex: `${base} ${signedTile(h)} = ${base + h}` });
    const period = 360 / b;
    if (target > base + h) {
      steps.push({ text: `That is not after $x = 0$. The ${word}s come round every $${period}°$, so the first one after $0$ is a period on.` });
      steps.push({ tex: `${base + h} + ${period} = ${target}` });
    } else if (target < base + h) {
      steps.push({ text: `The ${word}s come round every $${period}°$, so there is one a period earlier too, and that is the first after $x = 0$.` });
      steps.push({ tex: `${base + h} - ${period} = ${target}` });
    }
    return steps;
  },
};

interface PhaseFlowParams extends PhaseParams {
  /** `factor`: $b$ taken out first; `cos`: a cosine rewritten as a sine first. */
  form: 'factor' | 'cos';
}

const FLOW_LEFT = 'Left';
const FLOW_RIGHT = 'Right';

/**
 * The move across, in three forks: rewrite, which way, how far.
 *
 * `factor` takes $b$ out of $\sin(bx + c)$. `cos` rewrites $\cos(x - h)$ as a
 * sine through $\cos\theta = \sin(\theta + 90)$ and asks how far it sits from
 * $y = \sin x$, which is where a cosine curve comes from: $y = \sin x$ moved
 * $90°$ left. Difficulty 1 is `factor` with small $b$; difficulty 2 is a
 * larger $b$, or the cosine.
 */
const phaseFlow: Generator<PhaseFlowParams> = {
  id: 'fun-phase-flow',
  sample: (rng, difficulty) => {
    if (difficulty > 1 && rng.chance(0.5)) return { form: 'cos', fn: 'cos', b: 1, h: drawShift(rng, 10, 80) };
    const fn = rng.pick(['sin', 'cos'] as const);
    const hard = difficulty > 1;
    return drawUntil(
      () => ({ form: 'factor' as const, fn, b: hard ? rng.int(4, 6) : rng.int(2, 4), h: drawShift(rng, 5, 45) }),
      ({ b, h }) => clearShifts(b, h, [b * h, -h, b * b * h]),
      { form: 'factor', fn, b: hard ? 4 : 2, h: 10 },
    );
  },
  render: (params): Slide => {
    const { form, fn, b, h } = params;
    if (form === 'cos') {
      // cos(x - h) = sin(x - h + 90): y = sin x moved by h - 90.
      const move = h - 90;
      const sine = (shift: number) => `$\\sin(${shiftedX(shift)})$`;
      const right = sine(move);
      const values = offer(Math.abs(move), Math.abs(h), Math.abs(h) + 90, 90);
      return {
        kind: 'flow',
        prompt: [{ kind: 'prose', text: 'Which translation takes $y = \\sin x$ onto this curve, with $x$ in degrees?' }],
        subject: `y = ${trigTex({ fn: 'cos', a: 1, b: 1, c: -h, d: 0 })}`,
        steps: [
          {
            id: 'rewrite',
            ask: 'Write it as a sine, using $\\cos\\theta = \\sin(\\theta + 90)$.',
            // The 90 taken away instead of added, and left out altogether.
            branches: turned([right, sine(h + 90), sine(h)]).map((label) => ({ label, to: 'way' })),
          },
          {
            id: 'way',
            ask: 'Compared with $y = \\sin x$, which way has the curve moved?',
            branches: [FLOW_LEFT, FLOW_RIGHT].map((label) => ({ label, to: 'far' })),
          },
          {
            id: 'far',
            ask: 'How far?',
            branches: values.map((value) => ({ label: `$${value}°$`, outcome: `So it is $y = \\sin x$ moved $${value}°$.` })),
          },
        ],
        answer: [right, move > 0 ? FLOW_RIGHT : FLOW_LEFT, `$${Math.abs(move)}°$`],
      };
    }
    const right = `$${factoredTex(fn, b, h)}$`;
    const values = offer(Math.abs(h), Math.abs(b * h), Math.abs(b * b * h), Math.abs(h) + b);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Which translation takes $y = ${unmovedTex(params)}$ onto this curve, with $x$ in degrees?` }],
      subject: `y = ${movedTex(params)}`,
      steps: [
        {
          id: 'factor',
          ask: `Take $${b}$ out of the bracket. Which is it?`,
          branches: turned([right, `$${factoredTex(fn, b, b * h)}$`, `$${factoredTex(fn, b, -h)}$`]).map((label) => ({ label, to: 'way' })),
        },
        {
          id: 'way',
          ask: 'Which way has the curve moved?',
          branches: [FLOW_LEFT, FLOW_RIGHT].map((label) => ({ label, to: 'far' })),
        },
        {
          id: 'far',
          ask: 'How far?',
          branches: values.map((value) => ({ label: `$${value}°$`, outcome: `So it has moved $${value}°$.` })),
        },
      ],
      answer: [right, h > 0 ? FLOW_RIGHT : FLOW_LEFT, `$${Math.abs(h)}°$`],
    };
  },
  solution: (params) => {
    const { form, fn, b, h } = params;
    if (form === 'cos') {
      const move = h - 90;
      return [
        { text: `A cosine is a sine moved $90°$ left: $\\cos\\theta = \\sin(\\theta + 90)$. Put $\\theta = ${shiftedX(h)}$:` },
        { tex: stackTex(`\\cos(${shiftedX(h)})`, `\\sin(${shiftedX(h)} + 90)`, `\\sin(${shiftedX(move)})`) },
        { text: `$${shiftedX(move)}$ in place of $x$ moves $y = \\sin x$ ${acrossLabel(move)}.` },
        { tex: `\\text{translation by } ${vecTex(move, 0)}` },
      ];
    }
    return [
      { tex: stackTex(movedTex(params), factoredTex(fn, b, h)) },
      { text: `$x$ has been replaced by $${shiftedX(h)}$, so the curve moves ${acrossLabel(h)} — against the sign, and by the number left once $${b}$ is out, not the one in the rule.` },
      { tex: `\\text{translation by } ${vecTex(h, 0)}` },
    ];
  },
};

/* ---------- Lesson 4: the equation from the graph ---------- */

interface WaveReadParams {
  wave: Wave;
}

/** The ringed maximum and minimum of a wave, left to right. */
function ringedExtremes(wave: Wave): { x: number; y: number }[] {
  const { maxX, minX } = extremaX(wave);
  const top = { x: maxX, y: wave.d + Math.abs(wave.a) };
  const bottom = { x: minX, y: wave.d - Math.abs(wave.a) };
  return maxX < minX ? [top, bottom] : [bottom, top];
}

function pointTex({ x, y }: { x: number; y: number }): string {
  return `(${x}, ${y})`;
}

/**
 * $a$ and $d$ — and at difficulty 2 $b$ too — read off a drawn wave.
 *
 * The ringed maximum and minimum have their coordinates stated. $d$ is
 * halfway between them and $a$ half the distance, so the bank holds the
 * whole distance, the two swapped and the signs turned. At difficulty 2 $b$
 * comes from the period, twice the gap from a maximum to the next minimum,
 * and $a$ may be negative: a sine that sets off downwards.
 */
const waveRead: Generator<WaveReadParams> = {
  id: 'fun-wave-read',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos'] as const);
    if (difficulty <= 1) return { wave: { fn, a: rng.int(2, 5), b: 1, c: 0, d: rng.pick(nonZeroRange(-4, 4)) } };
    const size = rng.int(2, 5);
    return {
      wave: {
        fn,
        a: rng.chance(0.4) ? -size : size,
        b: rng.pick(fn === 'sin' ? [2, 3, 5, 6] : [2, 3, 4, 5, 6]),
        c: 0,
        d: rng.pick(nonZeroRange(-4, 4)),
      },
    };
  },
  render: ({ wave }): Slide => {
    const { fn, a, b, d } = wave;
    const [first, second] = ringedExtremes(wave);
    const hasB = b !== 1;
    const skeleton = `y = a\\${fn} ${hasB ? 'b' : ''}x + d`;
    const answer = hasB ? [numberTile(a), `${b}`, signedTile(d)] : [numberTile(a), signedTile(d)];
    const size = Math.abs(a);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'diagram', svg: waveSvg([wave], waveWindow(wave), 'A wave from 0 to 360 degrees with its highest and lowest points ringed', { marks: [first, second] }) },
        {
          kind: 'prose',
          text: `This is $${skeleton}$, with $x$ in degrees. The ringed points are $${pointTex(first)}$ and $${pointTex(second)}$. Write its equation.`,
        },
      ],
      template: hasB ? `y = {0}\\${fn} {1}x {2}` : `y = {0}\\${fn} x {1}`,
      bank: bankOf(answer, [
        numberTile(-a),
        numberTile(2 * size),
        numberTile(d),
        signedTile(-d),
        signedTile(size),
        ...(hasB ? [`${2 * b}`, ...(b % 2 === 0 ? [`${b / 2}`] : [`${b + 1}`])] : []),
      ]),
      answer,
    };
  },
  solution: ({ wave }) => {
    const { fn, a, b, d } = wave;
    const max = d + Math.abs(a);
    const min = d - Math.abs(a);
    const [first, second] = ringedExtremes(wave);
    const steps: SolutionStep[] = [
      { tex: `d = \\frac{${max} + ${br(min)}}{2} = ${d}` },
      { tex: `|a| = \\frac{${max} - ${br(min)}}{2} = ${Math.abs(a)}` },
    ];
    if (a < 0) {
      steps.push({ text: `A $\\${fn}$ would ${fn === 'sin' ? 'rise from its midline' : 'start at its highest point'}; this one ${fn === 'sin' ? 'falls' : 'starts at its lowest'}, so it has been reflected and $a = ${a}$.` });
    }
    if (b !== 1) {
      steps.push({ text: 'From a maximum to the next minimum is half a period.' });
      steps.push({ tex: `${second.x} - ${first.x} = ${second.x - first.x}` });
      steps.push({ tex: `\\text{period} = 2 \\times ${second.x - first.x} = ${360 / b}` });
      steps.push({ tex: `b = \\frac{360}{${360 / b}} = ${b}` });
    }
    steps.push({ tex: `y = ${trigTex(wave)}` });
    return steps;
  },
};

interface WavePartsParams {
  wave: Wave;
  /** Read off a graph, the period from a maximum and the next minimum; otherwise stated. */
  graph: boolean;
}

/**
 * $a$, $b$ and $d$ from the greatest and least values and the period.
 *
 * The top row is the difference and the sum of the two values and $b$; the
 * row beneath halves the first two into $a$ and $d$. Difficulty 1 states the
 * three numbers. Difficulty 2 draws the wave with a maximum and the next
 * minimum ringed, so the period is twice the gap between them.
 */
const waveParts: Generator<WavePartsParams> = {
  id: 'fun-wave-parts-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      wave: {
        fn: hard ? rng.pick(['sin', 'cos'] as const) : 'sin',
        a: rng.int(2, 5),
        b: rng.pick(hard ? [2, 3, 5, 6] : [1, 2, 3, 4, 5, 6, 8, 9, 10]),
        c: 0,
        d: rng.pick(nonZeroRange(-4, 4)),
      },
      graph: hard,
    };
  },
  render: ({ wave, graph }): Slide => {
    const { fn, a, b, d } = wave;
    const max = d + a;
    const min = d - a;
    const answer = [max - min, max + min, b, a, d].map(String);
    const skeleton = `y = a\\${fn} bx + d`;
    const order = 'Fill in the top row — the greatest value take away the least, the two added, and $b$ — then $a$ and $d$ beneath.';
    const [first, second] = ringedExtremes(wave);
    const prompt: Block[] = graph
      ? [
          { kind: 'diagram', svg: waveSvg([wave], waveWindow(wave), 'A wave from 0 to 360 degrees with a maximum and the next minimum ringed', { marks: [first, second] }) },
          { kind: 'prose', text: `This is $${skeleton}$, with $x$ in degrees and $a > 0$. The ringed points are $${pointTex(first)}$ and $${pointTex(second)}$. ${order}` },
        ]
      : [
          {
            kind: 'prose',
            text: `$${skeleton}$, with $x$ in degrees and $a > 0$, has a greatest value of $${max}$, a least value of $${min}$ and a period of $${360 / b}°$. ${order}`,
          },
        ];
    return {
      kind: 'tree',
      prompt,
      expression: skeleton,
      nodes: [
        { id: 'diff', from: [] },
        { id: 'sum', from: [] },
        { id: 'b', from: [] },
        { id: 'a', from: ['diff'] },
        { id: 'd', from: ['sum'] },
      ],
      bank: treeBank(answer, [2 * b, max, min, -d, (max - min) / 4], a),
      answer,
    };
  },
  solution: ({ wave, graph }) => {
    const { a, b, d } = wave;
    const max = d + a;
    const min = d - a;
    const steps: SolutionStep[] = [
      { tex: `${max} - ${br(min)} = ${max - min}` },
      { tex: `a = \\frac{${max - min}}{2} = ${a}` },
      { tex: `${max} + ${br(min)} = ${max + min}` },
      { tex: `d = \\frac{${max + min}}{2} = ${d}` },
    ];
    if (graph) {
      const [first, second] = ringedExtremes(wave);
      steps.push({ text: 'A maximum to the next minimum is half a period.' });
      steps.push({ tex: `${second.x} - ${first.x} = ${second.x - first.x}` });
      steps.push({ tex: `\\text{period} = 2 \\times ${second.x - first.x} = ${360 / b}` });
    }
    steps.push({ tex: `b = \\frac{360}{${360 / b}} = ${b}` });
    steps.push({ tex: `y = ${trigTex(wave)}` });
    return steps;
  },
};

interface ShiftGraphParams {
  fn: TrigFn;
  a: number;
  b: number;
  d: number;
  /** Where the wave starts: the rise through the midline for a sine, the first peak for a cosine. */
  s: number;
}

function shiftWave({ fn, a, b, d, s }: ShiftGraphParams): Wave {
  return { fn, a, b, c: -b * s, d };
}

/** The ringed start of the wave. */
function startPoint(params: ShiftGraphParams): { x: number; y: number } {
  return { x: params.s, y: params.fn === 'sin' ? params.d : params.d + params.a };
}

/**
 * $c$ from where the wave starts.
 *
 * A sine starts by rising through its midline and a cosine at its peak; the
 * ringed start is at $x = s$, so the curve has moved $s$ to the right and $c$
 * is $s$. Difficulty 2 puts $b$ in front of $x$: $\sin(bx - c)$ is
 * $\sin(b(x - \frac{c}{b}))$, so the move $s$ is $\frac{c}{b}$ and $c = bs$,
 * and $s$ is the tempting wrong answer.
 */
const graphShift: Generator<ShiftGraphParams> = {
  id: 'fun-graph-shift',
  choices: ({ b, s }) => numberChoices(b * s, s, 360 - b * s, 90 + s, 2 * b * s),
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos'] as const);
    const d = rng.int(-2, 2);
    const a = rng.int(1, 3);
    if (difficulty <= 1) return { fn, a, b: 1, d, s: 5 * rng.int(2, 17) };
    return { fn, a, b: rng.int(2, 4), d, s: 5 * rng.int(1, 8) };
  },
  render: (params): Slide => {
    const { fn, a, b, d, s } = params;
    const wave = shiftWave(params);
    const rule = `y = ${coefficientTex(a)}\\${fn}(${b === 1 ? '' : b}x - c)${tail(d)}`;
    const where =
      fn === 'sin'
        ? `The curve rises through its midline, dashed, at the ringed point, where $x = ${s}$.`
        : `The ringed point, at $x = ${s}$, is its first maximum.`;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'diagram',
          svg: waveSvg([wave], waveWindow(wave), 'A wave from 0 to 360 degrees with its start ringed', {
            marks: [startPoint(params)],
            horizontals: fn === 'sin' && d !== 0 ? [d] : [],
          }),
        },
        { kind: 'prose', text: `This is $${rule}$, with $x$ in degrees and $c$ between $0$ and $180$. ${where} Find $c$.` },
      ],
      lead: 'c =',
      keypad: [],
      answer: `${b * s}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ fn, b, s }) => {
    const steps: SolutionStep[] = [
      {
        text:
          fn === 'sin'
            ? `$y = \\sin x$ rises through its midline at $x = 0$. This one does it at $x = ${s}$, so it has moved $${s}°$ to the right.`
            : `$y = \\cos x$ has its first maximum at $x = 0$. This one has it at $x = ${s}$, so it has moved $${s}°$ to the right.`,
      },
      { text: `A move $${s}$ to the right writes $${shiftedX(s)}$ in place of $x$.` },
    ];
    if (b === 1) {
      steps.push({ tex: `c = ${s}` });
      return steps;
    }
    steps.push({ tex: stackTex(`\\${fn}(${b}(${shiftedX(s)}))`, `\\${fn}(${b}x - ${b * s})`) });
    steps.push({ tex: `c = ${b} \\times ${s} = ${b * s}` });
    steps.push({ text: `Not $${s}$: the $${b}$ multiplies the whole bracket, the shift included.` });
    return steps;
  },
};

/**
 * Which rule draws this wave?
 *
 * The midline is dashed, the rise through it is ringed with its position
 * stated, and the greatest and least values are given. The options are the
 * rule, the shift with its sign turned, the stretch and the midline swapped,
 * and a cosine with the same numbers. Difficulty 2 has $b$ in front of $x$,
 * where the trap is $\sin(bx - s)$: the move written in without multiplying
 * by $b$.
 */
const waveChoice: Generator<ShiftGraphParams> = {
  id: 'fun-wave-choice',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => ({
        fn: 'sin' as const,
        a: rng.int(2, 4),
        b: hard ? rng.int(2, 3) : 1,
        d: rng.pick(nonZeroRange(-3, 3)),
        s: hard ? 5 * rng.int(1, 8) : 10 * rng.int(1, 8),
      }),
      ({ a, d }) => a !== d,
      { fn: 'sin', a: 2, b: 1, d: 1, s: 30 },
    );
  },
  render: (params): Slide => {
    const { a, b, d, s } = params;
    const wave = shiftWave(params);
    const rule = (fn: TrigFn, front: number, c: number, end: number) => `y = ${trigTex({ fn, a: front, b, c, d: end })}`;
    const labels =
      b === 1
        ? [rule('sin', a, -s, d), rule('sin', a, s, d), rule('sin', d, -s, a), rule('cos', a, -s, d)]
        : [rule('sin', a, -b * s, d), rule('sin', a, -s, d), rule('sin', a, b * s, d), rule('cos', a, -b * s, d)];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'diagram',
          svg: waveSvg([wave], waveWindow(wave), 'A wave from 0 to 360 degrees with its midline dashed and one point ringed', {
            marks: [startPoint(params)],
            horizontals: [d],
          }),
        },
        {
          kind: 'prose',
          text: `With $x$ in degrees, this wave runs from $${d - a}$ up to $${d + a}$, and rises through its dashed midline at the ringed point, $x = ${s}$. Which is its equation?`,
        },
      ],
      ...fixedChoice(labels.map((label) => ({ label, tex: true }))),
    };
  },
  solution: (params) => {
    const { a, b, d, s } = params;
    const steps: SolutionStep[] = [
      { tex: `d = \\frac{${d + a} + ${br(d - a)}}{2} = ${d}` },
      { tex: `a = \\frac{${d + a} - ${br(d - a)}}{2} = ${a}` },
      { text: `It rises through its midline like a sine, but at $x = ${s}$ rather than $0$: moved $${s}°$ to the right, so $x$ becomes $${shiftedX(s)}$.` },
    ];
    if (b !== 1) steps.push({ tex: stackTex(`\\sin(${b}(${shiftedX(s)}))`, `\\sin(${b}x - ${b * s})`) });
    steps.push({ tex: `y = ${trigTex(shiftWave(params))}` });
    return steps;
  },
};

/* ---------- Lesson 5: putting it together ---------- */

interface MovesParams {
  /**
   * `stretchUp`: stretch parallel to the y-axis, then move up; `upStretch` the
   * other way round. `stretchAcross`: stretch parallel to the x-axis, then
   * move across; `acrossStretch` the other way round.
   */
  form: 'stretchUp' | 'upStretch' | 'stretchAcross' | 'acrossStretch';
  fn: TrigFn;
  /** The stretch up, or the b of a stretch across by 1/b. */
  m: number;
  /** The move: up when vertical, to the right in degrees when across. */
  k: number;
}

function movesWave({ form, fn, m, k }: MovesParams): Wave {
  if (form === 'stretchUp') return { fn, a: m, b: 1, c: 0, d: k };
  if (form === 'upStretch') return { fn, a: m, b: 1, c: 0, d: m * k };
  if (form === 'stretchAcross') return { fn, a: 1, b: m, c: -m * k, d: 0 };
  return { fn, a: 1, b: m, c: -k, d: 0 };
}

/** The two moves in the order they are made, as prose. */
function movesWords({ form, m, k }: MovesParams): [string, string] {
  if (form === 'stretchUp') return [yStretchWords(m), translateWords(0, k)];
  if (form === 'upStretch') return [translateWords(0, k), yStretchWords(m)];
  if (form === 'stretchAcross') return [xStretchWords(1 / m), translateWords(k, 0)];
  return [translateWords(k, 0), xStretchWords(1 / m)];
}

function sampleMoves(rng: Rng, difficulty: number): MovesParams {
  const fn = rng.pick(['sin', 'cos'] as const);
  if (difficulty <= 1) {
    return { form: rng.pick(['stretchUp', 'upStretch'] as const), fn, m: rng.int(2, 4), k: rng.pick(nonZeroRange(-4, 4)) };
  }
  return { form: rng.pick(['stretchAcross', 'acrossStretch'] as const), fn, m: rng.int(2, 4), k: drawShift(rng, 10, 60) };
}

/**
 * Two moves in a stated order, into a rule.
 *
 * The order is the question. A stretch after a move up stretches the move
 * too: up $2$ then stretch by $3$ is $3\sin x + 6$. Across, the reverse
 * holds: a move after a stretch is not stretched, so stretch by $\frac{1}{2}$
 * then move $30°$ right is $\sin(2(x - 30)) = \sin(2x - 60)$, while move then
 * stretch is $\sin(2x - 30)$. Difficulty 1 is the moves up; difficulty 2 the
 * moves across. The bank holds the number the other order would give.
 */
const movesTiles: Generator<MovesParams> = {
  id: 'fun-moves-tiles',
  sample: sampleMoves,
  render: (params): Slide => {
    const { form, fn, m, k } = params;
    const [first, second] = movesWords(params);
    const wave = movesWave(params);
    const across = form === 'stretchAcross' || form === 'acrossStretch';
    const answer = across ? [`${m}`, signedTile(wave.c)] : [`${m}`, signedTile(wave.d)];
    const other = across ? (form === 'stretchAcross' ? -k : -m * k) : form === 'stretchUp' ? m * k : k;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$y = \\${fn} x$${across ? ', with $x$ in degrees,' : ''} is ${first}, and then ${second}. Write the equation of the new curve.`,
        },
      ],
      template: across ? `y = \\${fn}({0}x {1})` : `y = {0}\\${fn} x {1}`,
      bank: bankOf(answer, [
        signedTile(other),
        signedTile(across ? -wave.c : -wave.d),
        across ? `\\tfrac{1}{${m}}` : `${Math.abs(k)}`,
        ...(across ? [] : [`${m + 1}`]),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { form, fn, m, k } = params;
    const final = `y = ${trigTex(movesWave(params))}`;
    if (form === 'stretchUp') {
      return [
        { tex: `y = ${m}\\${fn} x` },
        { text: `Then the move adds $${k}$ to every height:` },
        { tex: final },
      ];
    }
    if (form === 'upStretch') {
      return [
        { tex: `y = \\${fn} x${tail(k)}` },
        { text: `The stretch then multiplies every height by $${m}$ — the $${k}$ it has just been moved by included:` },
        { tex: stackTex(`y = ${m}(\\${fn} x${tail(k)})`, trigTex(movesWave(params))) },
      ];
    }
    if (form === 'stretchAcross') {
      return [
        { tex: `y = \\${fn} ${m}x` },
        { text: `Moving ${acrossLabel(k)} writes $${shiftedX(k)}$ in place of $x$ — every $x$, including the one the $${m}$ multiplies:` },
        { tex: stackTex(`y = ${factoredTex(fn, m, k)}`, trigTex(movesWave(params))) },
      ];
    }
    return [
      { tex: `y = \\${fn}(${shiftedX(k)})` },
      { text: `The stretch then writes $${m}x$ in place of $x$, and only the $x$ is multiplied:` },
      { tex: final },
    ];
  },
};

/**
 * A rule into two moves in order.
 *
 * Difficulty 1 is $a\sin x + d$: stretch, then move, since a move made first
 * would be stretched too. Difficulty 2 is $\sin(bx + c)$: here the move
 * comes **first**, by $c$, and then the stretch by $\frac{1}{b}$ — stretch
 * first and the move would have to be $\frac{c}{b}$, which is not offered.
 * The distractors are the other order, the other direction, and the other
 * factor or axis.
 */
const movesChoice: Generator<MovesParams> = {
  id: 'fun-moves-choice',
  sample: (rng, difficulty) => {
    const params = sampleMoves(rng, difficulty);
    return { ...params, form: difficulty > 1 ? 'acrossStretch' : 'stretchUp', m: difficulty > 1 ? params.m : rng.int(2, 5) };
  },
  render: (params): Slide => {
    const { form, m, k } = params;
    const sentence = (one: string, two: string) => `${one}, then ${two}`;
    const labels =
      form === 'stretchUp'
        ? [
            sentence(`Stretch parallel to the y-axis by ${m}`, `translate ${upLabel(k)}`),
            sentence(`Translate ${upLabel(k)}`, `stretch parallel to the y-axis by ${m}`),
            sentence(`Stretch parallel to the y-axis by ${m}`, `translate ${upLabel(-k)}`),
            sentence(`Stretch parallel to the x-axis by ${m}`, `translate ${upLabel(k)}`),
          ]
        : [
            sentence(`Translate ${acrossLabel(k)}`, `stretch parallel to the x-axis by 1/${m}`),
            sentence(`Stretch parallel to the x-axis by 1/${m}`, `translate ${acrossLabel(k)}`),
            sentence(`Translate ${acrossLabel(-k)}`, `stretch parallel to the x-axis by 1/${m}`),
            sentence(`Translate ${acrossLabel(k)}`, `stretch parallel to the x-axis by ${m}`),
          ];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which two moves, in this order, take $y = \\${params.fn} x$ onto $y = ${trigTex(movesWave(params))}$${form === 'stretchUp' ? '' : ', with $x$ in degrees'}?`,
        },
      ],
      ...fixedChoice(labels.map((label) => ({ label }))),
    };
  },
  solution: (params) => {
    const { form, fn, m, k } = params;
    if (form === 'stretchUp') {
      return [
        { text: `The $${m}$ multiplies $\\${fn} x$ and the $${k}$ is added after, so stretch first:` },
        { tex: chainTex(`\\${fn} x`, `${m}\\${fn} x`, trigTex(movesWave(params))) },
        { text: `Moving first would have the stretch multiply the move as well, giving $${trigTex({ fn, a: m, b: 1, c: 0, d: m * k })}$.` },
      ];
    }
    return [
      { text: `Move ${acrossLabel(k)} first: that writes $${shiftedX(k)}$ in place of $x$. The stretch by $\\tfrac{1}{${m}}$ then writes $${m}x$ in place of $x$, and leaves the $${Math.abs(k)}$ alone:` },
      { tex: chainTex(`\\${fn} x`, `\\${fn}(${shiftedX(k)})`, trigTex(movesWave(params))) },
      { text: `Stretching first would multiply the move too: $${factoredTex(fn, m, k)} = ${trigTex({ fn, a: 1, b: m, c: -m * k, d: 0 })}$, a different curve.` },
    ];
  },
};

/* ======================================================================
 * Level 6: Functions in Modelling
 * ==================================================================== */

/*
 * A function as a model of something real: which family a situation calls
 * for, the rule built from the story and what each number in it stands for,
 * the inputs that make sense and the outputs that follow, and a model's
 * inverse and composite read back into the story. Level 1 taught domain,
 * composite and inverse as algebra (`fn-l1-domain`, `fn-l1-composite`,
 * `fn-l1-inverse`); this level puts them in context rather than teaching
 * them again. Exponential Models fits curves to data (`em-l2-choose`,
 * `em-l2-fit`), so exponentials here are recognised and tabulated, never
 * fitted.
 *
 * Every context is built outward from its answer: every output, every
 * inverse's answer and every composite's answer is whole, a reciprocal rule
 * only ever takes an input that divides its constant, and the only tenths
 * are the multipliers of a price or a conversion (`1.2`, `1.6`). A typed
 * answer is one number with no keys; a rule, a family, a domain or an order
 * of composition goes through tiles, a table, a slider, a flow, a tree, a
 * number line or a choice. Units live in prose, never in a token.
 *
 * Word problems draw their setting from the catalogues below, six or more to
 * a family, and each story states its numbers in a fixed order with a word
 * no other setting uses, so `functions.test.ts` can read the numbers back,
 * build the model itself and hold every quoted value, domain end and answer
 * to it. Nothing here is calculus, so no slide declares `source`,
 * `integrand` or `limits`, and the oracle in `generators.test.ts` has
 * nothing to check.
 */

type Family = 'linear' | 'quadratic' | 'reciprocal' | 'exponential';

const FAMILY_NAME: Record<Family, string> = {
  linear: 'Linear',
  quadratic: 'Quadratic',
  reciprocal: 'Reciprocal',
  exponential: 'Exponential',
};

const FAMILIES: Family[] = ['linear', 'quadratic', 'reciprocal', 'exponential'];

/** The four families as options, the right one first as `fixedChoice` expects. */
function familyOptions(family: Family) {
  return fixedChoice([family, ...FAMILIES.filter((f) => f !== family)].map((f) => ({ label: FAMILY_NAME[f] })));
}

/**
 * A model as the stories use it. `up` is a standing charge plus a rate,
 * `down` a starting amount less a rate, `area` a rectangle whose width and
 * length add to `k`, and `recip` a fixed amount shared or covered.
 */
type Model =
  | { kind: 'up'; a: number; b: number }
  | { kind: 'down'; a: number; b: number }
  | { kind: 'area'; k: number }
  | { kind: 'recip'; K: number };

type ModelKind = Model['kind'];

function modelAt(model: Model, x: number): number {
  if (model.kind === 'up') return model.a + model.b * x;
  if (model.kind === 'down') return model.a - model.b * x;
  if (model.kind === 'area') return x * (model.k - x);
  return model.K / x;
}

/** The rule's right-hand side in the setting's letter: `15 + 4n`, `x(10 - x)`, `\frac{120}{v}`. */
function modelTex(model: Model, v: string): string {
  if (model.kind === 'up') return `${model.a} + ${model.b}${v}`;
  if (model.kind === 'down') return `${model.a} - ${model.b}${v}`;
  if (model.kind === 'area') return `${v}(${model.k} - ${v})`;
  return `\\frac{${model.K}}{${v}}`;
}

/** The numbers a story states, in the order it states them. */
function storyNumbers(model: Model): number[] {
  if (model.kind === 'up' || model.kind === 'down') return [model.a, model.b];
  if (model.kind === 'area') return [2 * model.k];
  return [model.K];
}

/** Where a down model runs out. */
function emptyAt(model: Model): number {
  return model.kind === 'down' ? model.a / model.b : Infinity;
}

const lower = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

interface Setting {
  /** A word this setting's story always holds and no other setting's does. */
  key: string;
  kind: ModelKind;
  /** The letters of the rule: `C(n)`. */
  out: string;
  inp: string;
  /** The input counts whole things. */
  count: boolean;
  /** The story, stating `storyNumbers` in order. */
  story: (nums: number[]) => string;
  /** The input at a value, as a phrase that ends a sentence: "for a ride of $7$ miles". */
  at: (x: number) => string;
  /** What the inverse at y answers: "how many miles £$55$ pays for". */
  inv: (y: number) => string;
  /** "the fare against the length of the ride", for a question about the family. */
  pair: string;
  /**
   * What the output, the input, the first number and the second part stand
   * for, as plain-text option labels. The first number is the fixed charge
   * or starting amount, the width and length together, or the whole amount
   * shared; the second is the rate, the length, or a plausible wrong reading.
   */
  parts: [string, string, string, string];
}

const SETTINGS: Setting[] = [
  /* ----- A standing charge plus a rate ----- */
  {
    key: 'taxi',
    kind: 'up',
    out: 'C',
    inp: 'm',
    count: false,
    story: ([a, b]) => `A taxi charges £$${a}$ to start, plus £$${b}$ for every mile.`,
    at: (x) => `for a ride of $${x}$ miles`,
    inv: (y) => `how many miles £$${y}$ pays for`,
    pair: 'the fare against the length of the ride',
    parts: ['The total fare, in pounds', 'The number of miles', 'The fixed charge, in pounds', 'The charge for each mile, in pounds'],
  },
  {
    key: 'bike',
    kind: 'up',
    out: 'C',
    inp: 'h',
    count: false,
    story: ([a, b]) => `Hiring a bike costs £$${a}$, plus £$${b}$ for every hour.`,
    at: (x) => `for $${x}$ hours of hire`,
    inv: (y) => `how many hours of hire £$${y}$ pays for`,
    pair: 'the cost against the time the bike is out',
    parts: ['The total cost, in pounds', 'The number of hours', 'The fixed charge, in pounds', 'The charge for each hour, in pounds'],
  },
  {
    key: 'plumber',
    kind: 'up',
    out: 'C',
    inp: 'h',
    count: false,
    story: ([a, b]) => `A plumber charges a £$${a}$ call-out fee, plus £$${b}$ for every hour of work.`,
    at: (x) => `for a job of $${x}$ hours`,
    inv: (y) => `how many hours of work £$${y}$ pays for`,
    pair: 'the bill against the hours worked',
    parts: ['The total bill, in pounds', 'The number of hours', 'The fixed call-out fee, in pounds', 'The charge for each hour, in pounds'],
  },
  {
    key: 'gym',
    kind: 'up',
    out: 'C',
    inp: 'n',
    count: true,
    story: ([a, b]) => `A gym charges a £$${a}$ joining fee, plus £$${b}$ for every month.`,
    at: (x) => `for $${x}$ months`,
    inv: (y) => `how many months £$${y}$ pays for`,
    pair: 'the total paid against the number of months',
    parts: ['The total paid, in pounds', 'The number of months', 'The fixed joining fee, in pounds', 'The charge for each month, in pounds'],
  },
  {
    key: 'T-shirt',
    kind: 'up',
    out: 'C',
    inp: 'n',
    count: true,
    story: ([a, b]) => `A print shop charges £$${a}$ to set up, plus £$${b}$ for every T-shirt printed.`,
    at: (x) => `for $${x}$ T-shirts`,
    inv: (y) => `how many T-shirts £$${y}$ pays for`,
    pair: 'the cost against the number of T-shirts',
    parts: ['The total cost, in pounds', 'The number of T-shirts', 'The fixed set-up charge, in pounds', 'The charge for each T-shirt, in pounds'],
  },
  {
    key: 'theatre',
    kind: 'up',
    out: 'C',
    inp: 'n',
    count: true,
    story: ([a, b]) => `A theatre adds a £$${a}$ booking fee to an order, plus £$${b}$ for every ticket.`,
    at: (x) => `for $${x}$ tickets`,
    inv: (y) => `how many tickets £$${y}$ pays for`,
    pair: 'the cost of an order against the number of tickets',
    parts: ['The total cost, in pounds', 'The number of tickets', 'The fixed booking fee, in pounds', 'The price of each ticket, in pounds'],
  },
  {
    key: 'hall',
    kind: 'up',
    out: 'C',
    inp: 'g',
    count: true,
    story: ([a, b]) => `Hiring a hall for a party costs £$${a}$, plus £$${b}$ for every guest.`,
    at: (x) => `for $${x}$ guests`,
    inv: (y) => `how many guests £$${y}$ pays for`,
    pair: 'the cost of the party against the number of guests',
    parts: ['The total cost, in pounds', 'The number of guests', 'The fixed charge for the hall, in pounds', 'The charge for each guest, in pounds'],
  },
  {
    key: 'gigabyte',
    kind: 'up',
    out: 'C',
    inp: 'd',
    count: false,
    story: ([a, b]) => `A phone plan costs £$${a}$ a month, plus £$${b}$ for every gigabyte of data used.`,
    at: (x) => `for a month using $${x}$ gigabytes`,
    inv: (y) => `how many gigabytes a £$${y}$ bill pays for`,
    pair: 'the monthly bill against the data used',
    parts: ['The total bill, in pounds', 'The number of gigabytes', 'The fixed monthly charge, in pounds', 'The charge for each gigabyte, in pounds'],
  },
  /* ----- A starting amount less a rate ----- */
  {
    key: 'tank',
    kind: 'down',
    out: 'V',
    inp: 't',
    count: false,
    story: ([a, b]) => `A tank holds $${a}$ litres of water and drains at $${b}$ litres every minute.`,
    at: (x) => `after $${x}$ minutes`,
    inv: (y) => `how many minutes it takes to fall to $${y}$ litres`,
    pair: 'the water left against the time',
    parts: ['The water left, in litres', 'The number of minutes', 'The water at the start, in litres', 'The water lost each minute, in litres'],
  },
  {
    key: 'candle',
    kind: 'down',
    out: 'H',
    inp: 't',
    count: false,
    story: ([a, b]) => `A candle is $${a}$ cm tall and burns down $${b}$ cm every hour.`,
    at: (x) => `after $${x}$ hours`,
    inv: (y) => `how many hours it takes to burn down to $${y}$ cm`,
    pair: 'the height of the candle against the time',
    parts: ['The height left, in cm', 'The number of hours', 'The height at the start, in cm', 'The height lost each hour, in cm'],
  },
  {
    key: 'battery',
    kind: 'down',
    out: 'B',
    inp: 't',
    count: false,
    story: ([a, b]) => `A phone battery is at $${a}$% and runs down by $${b}$% every hour.`,
    at: (x) => `after $${x}$ hours`,
    inv: (y) => `how many hours it takes to run down to $${y}$%`,
    pair: 'the charge left against the time',
    parts: ['The charge left, in %', 'The number of hours', 'The charge at the start, in %', 'The charge lost each hour, in %'],
  },
  {
    key: 'saved',
    kind: 'down',
    out: 'S',
    inp: 'w',
    count: true,
    story: ([a, b]) => `Sam has £$${a}$ saved and spends £$${b}$ of it every week.`,
    at: (x) => `after $${x}$ weeks`,
    inv: (y) => `how many weeks it takes to get down to £$${y}$`,
    pair: 'the savings left against the number of weeks',
    parts: ['The money left, in pounds', 'The number of weeks', 'The money at the start, in pounds', 'The money spent each week, in pounds'],
  },
  {
    key: 'snowman',
    kind: 'down',
    out: 'H',
    inp: 't',
    count: false,
    story: ([a, b]) => `A snowman is $${a}$ cm tall and melts $${b}$ cm every hour.`,
    at: (x) => `after $${x}$ hours`,
    inv: (y) => `how many hours it takes to melt down to $${y}$ cm`,
    pair: 'the height of the snowman against the time',
    parts: ['The height left, in cm', 'The number of hours', 'The height at the start, in cm', 'The height lost each hour, in cm'],
  },
  {
    key: 'balloon',
    kind: 'down',
    out: 'H',
    inp: 't',
    count: false,
    story: ([a, b]) => `A balloon is $${a}$ m up and comes down $${b}$ m every minute.`,
    at: (x) => `after $${x}$ minutes`,
    inv: (y) => `how many minutes it takes to come down to $${y}$ m`,
    pair: 'the height of the balloon against the time',
    parts: ['The height left, in m', 'The number of minutes', 'The height at the start, in m', 'The height lost each minute, in m'],
  },
  /* ----- A rectangle from a fixed length round its edge ----- */
  {
    key: 'fencing',
    kind: 'area',
    out: 'A',
    inp: 'x',
    count: false,
    story: ([p]) => `$${p}$ m of fencing makes a rectangular pen $x$ m wide.`,
    at: (x) => `for a pen $${x}$ m wide`,
    inv: (y) => `the width that gives an area of $${y}$ m²`,
    pair: 'the area of the pen against its width',
    parts: ['The area, in m²', 'The width, in m', 'The width and the length added together, in m', 'The length, in m'],
  },
  {
    key: 'edging',
    kind: 'area',
    out: 'A',
    inp: 'x',
    count: false,
    story: ([p]) => `A rectangular flower bed has $${p}$ m of edging all the way round, and is $x$ m wide.`,
    at: (x) => `for a bed $${x}$ m wide`,
    inv: (y) => `the width that gives an area of $${y}$ m²`,
    pair: 'the area of the bed against its width',
    parts: ['The area, in m²', 'The width, in m', 'The width and the length added together, in m', 'The length, in m'],
  },
  {
    key: 'rope',
    kind: 'area',
    out: 'A',
    inp: 'x',
    count: false,
    story: ([p]) => `A loop of rope $${p}$ m long is pegged out as a rectangle $x$ m wide.`,
    at: (x) => `for a rectangle $${x}$ m wide`,
    inv: (y) => `the width that gives an area of $${y}$ m²`,
    pair: 'the area inside the rope against the width',
    parts: ['The area, in m²', 'The width, in m', 'The width and the length added together, in m', 'The length, in m'],
  },
  {
    key: 'wire',
    kind: 'area',
    out: 'A',
    inp: 'x',
    count: false,
    story: ([p]) => `A rectangular frame is bent from $${p}$ cm of wire and is $x$ cm wide.`,
    at: (x) => `for a frame $${x}$ cm wide`,
    inv: (y) => `the width that gives an area of $${y}$ cm²`,
    pair: 'the area inside the frame against its width',
    parts: ['The area, in cm²', 'The width, in cm', 'The width and the length added together, in cm', 'The length, in cm'],
  },
  {
    key: 'paddock',
    kind: 'area',
    out: 'A',
    inp: 'x',
    count: false,
    story: ([p]) => `A farmer puts $${p}$ m of fence round a rectangular paddock $x$ m wide.`,
    at: (x) => `for a paddock $${x}$ m wide`,
    inv: (y) => `the width that gives an area of $${y}$ m²`,
    pair: 'the area of the paddock against its width',
    parts: ['The area, in m²', 'The width, in m', 'The width and the length added together, in m', 'The length, in m'],
  },
  {
    key: 'sandpit',
    kind: 'area',
    out: 'A',
    inp: 'x',
    count: false,
    story: ([p]) => `A rectangular sandpit has a wooden border $${p}$ m long all the way round, and is $x$ m wide.`,
    at: (x) => `for a sandpit $${x}$ m wide`,
    inv: (y) => `the width that gives an area of $${y}$ m²`,
    pair: 'the area of the sandpit against its width',
    parts: ['The area, in m²', 'The width, in m', 'The width and the length added together, in m', 'The length, in m'],
  },
  /* ----- A fixed amount shared out or covered ----- */
  {
    key: 'journey',
    kind: 'recip',
    out: 'T',
    inp: 'v',
    count: false,
    story: ([K]) => `A journey is $${K}$ km long, driven at a steady $v$ km/h.`,
    at: (x) => `at $${x}$ km/h`,
    inv: (y) => `the speed that makes the journey take $${y}$ hours`,
    pair: 'the time taken against the speed',
    parts: ['The time taken, in hours', 'The speed, in km/h', 'The whole distance, in km', 'The distance left to go, in km'],
  },
  {
    key: 'bill',
    kind: 'recip',
    out: 'P',
    inp: 'n',
    count: true,
    story: ([K]) => `A restaurant bill of £$${K}$ is split equally between $n$ friends.`,
    at: (x) => `when $${x}$ friends share it`,
    inv: (y) => `how many friends are sharing if each pays £$${y}$`,
    pair: 'what each friend pays against the number of friends',
    parts: ['The amount each friend pays, in pounds', 'The number of friends', 'The whole bill, in pounds', 'The tip, in pounds'],
  },
  {
    key: 'pool',
    kind: 'recip',
    out: 'T',
    inp: 'r',
    count: false,
    story: ([K]) => `A pool holding $${K}$ litres is filled at a steady $r$ litres a minute.`,
    at: (x) => `at $${x}$ litres a minute`,
    inv: (y) => `the rate that fills the pool in $${y}$ minutes`,
    pair: 'the time to fill the pool against the rate',
    parts: ['The time to fill it, in minutes', 'The rate, in litres a minute', 'The whole volume of the pool, in litres', 'The water already in, in litres'],
  },
  {
    key: 'card',
    kind: 'recip',
    out: 'L',
    inp: 'w',
    count: false,
    story: ([K]) => `A rectangle of card has an area of $${K}$ cm² and is $w$ cm wide.`,
    at: (x) => `when it is $${x}$ cm wide`,
    inv: (y) => `the width that makes it $${y}$ cm long`,
    pair: 'the length of the card against its width',
    parts: ['The length, in cm', 'The width, in cm', 'The whole area of the card, in cm²', 'The distance round the edge, in cm'],
  },
  {
    key: 'sweets',
    kind: 'recip',
    out: 'B',
    inp: 's',
    count: true,
    story: ([K]) => `$${K}$ sweets are packed into bags of $s$ sweets each.`,
    at: (x) => `with $${x}$ sweets in a bag`,
    inv: (y) => `how many sweets go in each bag to fill $${y}$ bags`,
    pair: 'the number of bags against the sweets in each bag',
    parts: ['The number of bags', 'The sweets in each bag', 'The whole number of sweets', 'The sweets left over'],
  },
  {
    key: 'job',
    kind: 'recip',
    out: 'T',
    inp: 'p',
    count: true,
    story: ([K]) => `A job needs $${K}$ hours of work, shared equally between $p$ people.`,
    at: (x) => `when $${x}$ people share it`,
    inv: (y) => `how many people finish it in $${y}$ hours each`,
    pair: 'the hours each person works against the number of people',
    parts: ['The hours each person works', 'The number of people', 'The whole job, in hours', 'The hours of break, each'],
  },
];

const settingsOf = (...kinds: ModelKind[]): number[] =>
  SETTINGS.flatMap((setting, idx) => (kinds.includes(setting.kind) ? [idx] : []));

/** Constants a reciprocal model divides: plenty of whole divisors each. */
const RECIP_CONSTANTS = [24, 36, 48, 60, 72, 90, 120, 144, 180, 240, 360];

const divisorsOf = (K: number, from = 2, to = K / 2): number[] =>
  range(from, Math.floor(to)).filter((d) => K % d === 0);

/**
 * A model for a setting of this kind. `hard` widens the numbers; a `down`
 * model always runs out at a whole time, since it is built from that time.
 */
function sampleModel(rng: Rng, kind: ModelKind, hard: boolean, most = 20): Model {
  if (kind === 'up') return { kind, a: rng.int(2, hard ? 12 : 8) * 5, b: rng.int(2, 9) };
  if (kind === 'down') {
    const b = rng.int(2, hard ? 9 : 6);
    return { kind, a: b * rng.int(5, most), b };
  }
  if (kind === 'area') return { kind, k: rng.int(hard ? 8 : 6, hard ? 20 : 14) };
  return { kind, K: rng.pick(hard ? RECIP_CONSTANTS.slice(3) : RECIP_CONSTANTS.slice(0, 8)) };
}

/** The rule as a line: `C(n) = 15 + 4n`. */
function ruleLine(setting: Setting, model: Model): string {
  return `${setting.out}(${setting.inp}) = ${modelTex(model, setting.inp)}`;
}

/** A setting and its model, the parameters most of this level's generators share. */
interface Context {
  s: number;
  model: Model;
}

function drawContext(rng: Rng, kinds: ModelKind[], hard: boolean, most?: number): Context {
  const s = rng.pick(settingsOf(...kinds));
  return { s, model: sampleModel(rng, SETTINGS[s].kind, hard, most) };
}

/* ---------- Growth, recognised and tabulated, never fitted ---------- */

interface GrowthSetting {
  key: string;
  /** What the amount is multiplied by each step. */
  r: number;
  /** Starting amounts that keep five steps whole: a multiple of this. */
  unit: number;
  story: (start: number) => string;
  pair: string;
  /** What the table's letters stand for. */
  letters: string;
}

const GROWTH: GrowthSetting[] = [
  {
    key: 'bacteria',
    r: 2,
    unit: 1,
    story: (p) => `A dish starts with $${p}$ bacteria, and the number doubles every hour.`,
    pair: 'the number of bacteria against the time',
    letters: '$N$ is the number of bacteria and $t$ the time in hours',
  },
  {
    key: 'views',
    r: 3,
    unit: 1,
    story: (p) => `A video has $${p}$ views, and its views triple every day.`,
    pair: 'the number of views against the time',
    letters: '$N$ is the number of views and $t$ the time in days',
  },
  {
    key: 'fish',
    r: 1.5,
    unit: 16,
    story: (p) => `A pond holds $${p}$ fish, and the number grows by half again every year.`,
    pair: 'the number of fish against the time',
    letters: '$N$ is the number of fish and $t$ the time in years',
  },
  {
    key: 'car',
    r: 0.75,
    unit: 2560,
    story: (p) => `A car is worth £$${p}$, and it loses a quarter of its value every year.`,
    pair: 'the value of the car against its age',
    letters: '$N$ is the value in pounds and $t$ the age in years',
  },
  {
    key: 'medicine',
    r: 0.5,
    unit: 16,
    story: (p) => `A patient has $${p}$ mg of a medicine in the blood, and the amount halves every hour.`,
    pair: 'the medicine left against the time',
    letters: '$N$ is the medicine left in mg and $t$ the time in hours',
  },
  {
    key: 'interest',
    r: 1.1,
    unit: 100,
    story: (p) => `£$${p}$ is left in a savings account that adds $10$% interest every year.`,
    pair: 'the money in the account against the time',
    letters: '$N$ is the money in pounds and $t$ the time in years',
  },
];

/** A growth story's starting amount: five steps on, every value is still whole. */
function growthStart(rng: Rng, g: GrowthSetting): number {
  if (g.r === 2) return rng.int(3, 30);
  if (g.r === 3) return rng.int(2, 12);
  return g.unit * rng.int(1, g.r === 1.1 ? 30 : 8);
}

/* ---------- Lesson 1: which family fits ---------- */

interface ModelFamilyParams {
  /** A setting index, or a growth setting's as `GROWTH` index plus 100. */
  s: number;
  nums: number[];
}

function familyStory({ s, nums }: ModelFamilyParams): { story: string; pair: string; family: Family } {
  if (s >= 100) {
    const g = GROWTH[s - 100];
    return { story: g.story(nums[0]), pair: g.pair, family: 'exponential' };
  }
  const setting = SETTINGS[s];
  const family: Family = setting.kind === 'area' ? 'quadratic' : setting.kind === 'recip' ? 'reciprocal' : 'linear';
  return { story: setting.story(nums), pair: setting.pair, family };
}

const FAMILY_WHY: Record<Family, string> = {
  linear: 'The same amount is added or taken away for every step of the input, so the graph is a straight line: a **linear** model.',
  quadratic:
    'The width and the length share a fixed total, so the area is the width times what is left of that total: $x(k - x)$, a **quadratic**.',
  reciprocal:
    'A fixed amount is divided by the input, so doubling the input halves the output: $\\frac{k}{x}$, a **reciprocal** model.',
  exponential: 'The amount is **multiplied** by the same number every step, rather than added to: an **exponential** model.',
};

/**
 * Which family fits a situation, from the story alone.
 *
 * Difficulty 1 gives the plainest cues — a charge per mile, a pen from a
 * fence, a bill shared, a doubling. Difficulty 2 turns them round: an amount
 * that falls at a steady rate is still linear, a pool filled faster is
 * reciprocal, and a car losing a quarter of its value is exponential even
 * though it falls.
 */
const modelFamily: Generator<ModelFamilyParams> = {
  id: 'fun-model-family',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const family = rng.pick(FAMILIES);
    if (family === 'exponential') {
      const g = rng.pick(hard ? [2, 3, 4, 5] : [0, 1, 2]);
      return { s: 100 + g, nums: [growthStart(rng, GROWTH[g])] };
    }
    const pool =
      family === 'linear'
        ? settingsOf(hard ? 'down' : 'up')
        : family === 'quadratic'
          ? settingsOf('area')
          : settingsOf('recip').filter((i) => ['journey', 'bill', 'sweets'].includes(SETTINGS[i].key) !== hard);
    const s = rng.pick(pool);
    return { s, nums: storyNumbers(sampleModel(rng, SETTINGS[s].kind, hard)) };
  },
  render: (params): Slide => {
    const { story, pair, family } = familyStory(params);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `${story} Which kind of function models ${pair}?` }],
      ...familyOptions(family),
    };
  },
  solution: (params) => {
    const { story, family } = familyStory(params);
    return [{ text: story }, { text: FAMILY_WHY[family] }];
  },
};

type Pattern = 'add' | 'times' | 'second' | 'product';

const PATTERN_FAMILY: Record<Pattern, Family> = {
  add: 'linear',
  times: 'exponential',
  second: 'quadratic',
  product: 'reciprocal',
};

const PATTERN_LABEL: Record<Pattern, string> = {
  add: 'It goes up or down by the same amount',
  times: 'It is multiplied by the same number',
  second: 'The change itself changes by the same amount',
  product: '$x \\times y$ stays the same',
};

interface FamilyFlowParams {
  pattern: Pattern;
  /** add: start and step; times: start and ratio; second: p and c or k; product: K. */
  p: number;
  q: number;
  /** The first x in the table. */
  from: number;
}

/** A table's five rows. */
function flowRows({ pattern, p, q, from }: FamilyFlowParams): [number, number][] {
  return range(from, from + 4).map((x) => {
    const n = x - from;
    if (pattern === 'add') return [x, p + q * n];
    if (pattern === 'times') return [x, p * q ** n];
    if (pattern === 'second') return [x, p > 0 ? p * x * x + q : x * (q - x)];
    return [x, p / x];
  });
}

/** The number the pattern turns on: the step, the ratio, the second difference, the product. */
function flowValue(params: FamilyFlowParams): number {
  const { pattern, p, q } = params;
  if (pattern === 'add') return q;
  if (pattern === 'times') return q;
  if (pattern === 'second') return p > 0 ? 2 * p : -2;
  return p;
}

/** A ratio as TeX: `2`, `\tfrac{1}{2}`, `\tfrac{3}{2}`. */
function ratioTexOf(r: number): string {
  if (Number.isInteger(r)) return `${r}`;
  for (let den = 2; den <= 6; den += 1) {
    const top = r * den;
    if (Math.abs(top - Math.round(top)) < 1e-9) return `\\tfrac{${Math.round(top)}}{${den}}`;
  }
  return `${r}`;
}

function tableTex(rows: [number, number][], xs = 'x', ys = 'y'): string {
  const cols = 'c'.repeat(rows.length);
  return `\\begin{array}{c|${cols}} ${xs} & ${rows.map(([x]) => x).join(' & ')} \\\\ \\hline ${ys} & ${rows.map(([, y]) => y).join(' & ')} \\end{array}`;
}

/**
 * A table read for its pattern, then its number, then the family.
 *
 * Each step of $x$ is $1$, so a constant difference is linear, a constant
 * ratio exponential, a constant second difference quadratic, and a constant
 * $x \times y$ reciprocal. Difficulty 2 falls rather than rises: a line with
 * a negative step, a ratio of a half or three halves, an arch, and a larger
 * constant starting at $x = 2$.
 */
const familyFlow: Generator<FamilyFlowParams> = {
  id: 'fun-family-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const pattern = rng.pick(['add', 'times', 'second', 'product'] as const);
    const from = hard ? 2 : 1;
    if (pattern === 'add') {
      return hard
        ? { pattern, p: rng.int(40, 90), q: -rng.int(2, 9), from }
        : { pattern, p: rng.int(1, 20), q: rng.int(2, 9), from };
    }
    if (pattern === 'times') {
      if (!hard) {
        const q = rng.pick([2, 3]);
        return { pattern, p: q === 2 ? rng.int(1, 12) : rng.int(1, 5), q, from };
      }
      return { pattern, p: 16 * rng.int(1, 6), q: rng.pick([0.5, 1.5]), from };
    }
    if (pattern === 'second') {
      return hard ? { pattern, p: -1, q: rng.int(9, 16), from } : { pattern, p: rng.int(1, 3), q: rng.int(0, 9), from };
    }
    return { pattern, p: 60 * rng.int(hard ? 2 : 1, hard ? 8 : 5), q: 0, from };
  },
  render: (params): Slide => {
    const { pattern, q } = params;
    const value = flowValue(params);
    const family = PATTERN_FAMILY[pattern];
    const numbers = (step: string, ask: string, candidates: string[]) => ({
      id: step,
      ask,
      branches: turned(candidates).map((label) => ({ label, to: 'family' })),
    });
    const whole = (v: number, ...near: number[]) => offer(v, ...near).map((n) => `$${n}$`);
    const ratios = [...new Set([q, 1 / q, 2 * q, q + 1].map(ratioTexOf))].map((tex) => `$${tex}$`);
    const valueLabel = pattern === 'times' ? `$${ratioTexOf(q)}$` : `$${value}$`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Go along the table one column at a time. Say what $y$ does, by how much, and so which kind of function fits.',
        },
      ],
      subject: tableTex(flowRows(params)),
      steps: [
        {
          id: 'pattern',
          ask: 'What does $y$ do from one column to the next?',
          branches: turned(Object.values(PATTERN_LABEL)).map((label) => ({
            label,
            to: (Object.keys(PATTERN_LABEL) as Pattern[]).find((key) => PATTERN_LABEL[key] === label),
          })),
        },
        numbers('add', 'By how much, each time?', whole(pattern === 'add' ? value : 3, -value, 2 * value)),
        numbers('times', 'By what number?', pattern === 'times' ? ratios : ['$2$', '$3$', '$\\tfrac{1}{2}$', '$4$']),
        numbers('second', 'By how much does the change change?', whole(pattern === 'second' ? value : 2, -value, 2 * value)),
        numbers('product', 'What is $x \\times y$ each time?', whole(pattern === 'product' ? value : 60, value / 2, 2 * value)),
        {
          id: 'family',
          ask: 'So which kind of function fits the table?',
          branches: turned(FAMILIES.map((f) => FAMILY_NAME[f])).map((label) => ({
            label,
            outcome: `So ${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label.toLowerCase()} function fits.`,
          })),
        },
      ],
      answer: [PATTERN_LABEL[pattern], valueLabel, FAMILY_NAME[family]],
    };
  },
  solution: (params) => {
    const { pattern, q } = params;
    const rows = flowRows(params);
    const ys = rows.map(([, y]) => y);
    const diffs = ys.slice(1).map((y, i) => y - ys[i]);
    if (pattern === 'add') {
      return [
        { text: `The differences are $${diffs.join(', ')}$: the same every time.` },
        { text: FAMILY_WHY.linear },
      ];
    }
    if (pattern === 'times') {
      return [
        { text: `Each $y$ is the one before times $${ratioTexOf(q)}$: $${ys[0]} \\times ${ratioTexOf(q)} = ${ys[1]}$, and so on.` },
        { text: FAMILY_WHY.exponential },
      ];
    }
    if (pattern === 'second') {
      const second = diffs.slice(1).map((d, i) => d - diffs[i]);
      return [
        { text: `The differences are $${diffs.join(', ')}$, which are not the same.` },
        { text: `But they change by $${second[0]}$ every time: the second differences are all $${second[0]}$.` },
        { text: 'A constant second difference is the mark of a **quadratic**.' },
      ];
    }
    return [
      { text: `Multiply each pair: ${rows.map(([x, y]) => `$${x} \\times ${y} = ${x * y}$`).join(', ')}.` },
      { text: `$x \\times y$ is always $${params.p}$, so $y = \\frac{${params.p}}{x}$: a **reciprocal** function.` },
    ];
  },
};

interface FamilyNextParams {
  /** A setting index, or a growth setting's as `GROWTH` index plus 100. */
  s: number;
  nums: number[];
  /** The inputs down the table. */
  xs: number[];
}

/** The model behind a table, as a function of its input. */
function nextModel({ s, nums }: FamilyNextParams): (x: number) => number {
  if (s >= 100) return (x) => nums[0] * GROWTH[s - 100].r ** x;
  const kind = SETTINGS[s].kind;
  if (kind === 'up' || kind === 'down') return (x) => modelAt({ kind, a: nums[0], b: nums[1] }, x);
  if (kind === 'area') return (x) => modelAt({ kind, k: nums[0] / 2 }, x);
  return (x) => modelAt({ kind, K: nums[0] }, x);
}

function nextLetters({ s }: FamilyNextParams): [string, string] {
  if (s >= 100) return ['t', 'N'];
  return [SETTINGS[s].inp, SETTINGS[s].out];
}

/**
 * A table filled in from the story: the model applied, not named.
 *
 * The first row is given; the learner carries the story on through four
 * more. The bank holds what each row would be under the slips a table
 * invites — adding where the story multiplies, forgetting the fixed charge,
 * using the whole fence as width plus length.
 */
const familyNext: Generator<FamilyNextParams> = {
  id: 'fun-family-next',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick(hard ? (['down', 'area', 'recip', 'growth'] as const) : (['up', 'growth'] as const));
    if (kind === 'growth') {
      const g = rng.pick(hard ? [2, 3, 4] : [0, 1]);
      const start = g === 3 ? 2560 * rng.int(1, 4) : g >= 2 ? 16 * rng.int(1, 6) : growthStart(rng, GROWTH[g]);
      return { s: 100 + g, nums: [start], xs: range(0, 4) };
    }
    if (kind === 'recip') {
      const s = rng.pick(settingsOf('recip').filter((i) => SETTINGS[i].key !== 'sweets'));
      const K = rng.pick([60, 120, 180, 240, 360]);
      const ds = divisorsOf(K, 2, 20);
      const at = rng.int(0, ds.length - 5);
      return { s, nums: [K], xs: ds.slice(at, at + 5) };
    }
    const s = rng.pick(settingsOf(kind));
    if (kind === 'area') return { s, nums: [2 * rng.int(11, 16)], xs: range(1, 5) };
    const model = sampleModel(rng, kind, hard, 20);
    const step = rng.pick([1, 1, 2]);
    return { s, nums: storyNumbers(model), xs: range(0, 4).map((i) => i * step) };
  },
  render: (params): Slide => {
    const { s, nums, xs } = params;
    const f = nextModel(params);
    const [xl, yl] = nextLetters(params);
    const story = s >= 100 ? GROWTH[s - 100].story(nums[0]) : SETTINGS[s].story(nums);
    const where =
      s >= 100
        ? GROWTH[s - 100].letters
        : `$${yl}$ is ${lower(SETTINGS[s].parts[0])} and $${xl}$ is ${lower(SETTINGS[s].parts[1])}`;
    const answer = xs.slice(1).map((x) => `${f(x)}`);
    const slips = xs.slice(1).flatMap((x, i) => {
      if (s >= 100) return [nums[0] + nums[0] * (GROWTH[s - 100].r - 1) * x];
      const kind = SETTINGS[s].kind;
      if (kind === 'up') return [nums[1] * x, nums[0] + nums[1] * (x + 1)];
      if (kind === 'down') return [nums[1] * x, nums[0] - nums[1] * (x + 1)];
      if (kind === 'area') return [x * (nums[0] - x)];
      return [nums[0] / xs[i]];
    });
    const last = f(xs[xs.length - 1]);
    return {
      kind: 'table',
      prompt: [{ kind: 'prose', text: `${story} In the table, ${where}. Fill in the missing values.` }],
      columns: [xl, yl],
      rows: xs.map((x, i) => [`${x}`, i === 0 ? `${f(x)}` : null]),
      bank: treeBank(answer, slips.filter((v) => v > 0), last),
      answer,
    };
  },
  solution: (params) => {
    const { s, nums, xs } = params;
    const f = nextModel(params);
    const [xl, yl] = nextLetters(params);
    if (s >= 100) {
      const r = GROWTH[s - 100].r;
      return [
        { text: `Each step multiplies the amount by $${ratioTexOf(r)}$, so $N = ${nums[0]} \\times ${ratioTexOf(r)}^{t}$.` },
        { text: `Going down the table: ${xs.map((x) => `$${f(x)}$`).join(', ')}.` },
      ];
    }
    const setting = SETTINGS[s];
    const model = setting.kind === 'area' ? { kind: 'area' as const, k: nums[0] / 2 } : null;
    return [
      ...(model ? [{ text: `Width and length add to half the $${nums[0]}$, which is $${model.k}$, so the length is $${model.k} - x$.` }] : []),
      {
        tex: `${yl} = ${
          setting.kind === 'up'
            ? `${nums[0]} + ${nums[1]}${xl}`
            : setting.kind === 'down'
              ? `${nums[0]} - ${nums[1]}${xl}`
              : setting.kind === 'area'
                ? `${xl}(${nums[0] / 2} - ${xl})`
                : `\\frac{${nums[0]}}{${xl}}`
        }`,
      },
      ...xs.slice(1).map((x) => ({ tex: `${yl}(${x}) = ${f(x)}` })),
    ];
  },
};

type SketchKind = 'line' | 'arch' | 'grow' | 'recip';

interface FamilySketchParams {
  shape: SketchKind;
  p: number;
  q: number;
}

const SKETCH_FAMILY: Record<SketchKind, Family> = {
  line: 'linear',
  arch: 'quadratic',
  grow: 'exponential',
  recip: 'reciprocal',
};

function sketchCurve({ shape, p, q }: FamilySketchParams): (x: number) => number {
  if (shape === 'line') return (x) => p + q * x;
  if (shape === 'arch') return (x) => (p * x * (q - x)) / 10;
  if (shape === 'grow') return (x) => p * (q / 10) ** x;
  return (x) => (x <= 0 ? NaN : p / x);
}

function sketchTop({ shape, p, q }: FamilySketchParams): number {
  if (shape === 'line') return Math.max(p, p + 10 * q) + 2;
  if (shape === 'arch') return (p * q * q) / 40 + 2;
  if (shape === 'grow') return Math.max(p, p * (q / 10) ** 10) + 2;
  return p / 1.5;
}

/**
 * Which family, from the shape of its graph.
 *
 * The one worth teaching is a falling curve: a reciprocal runs up the
 * $y$-axis without ever meeting it, while an exponential that falls crosses
 * it at its starting value. Difficulty 1 offers only rising lines and
 * growth; difficulty 2 lets both fall.
 */
const familySketch: Generator<FamilySketchParams> = {
  id: 'fun-family-sketch',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const shape = rng.pick(['line', 'arch', 'grow', 'recip'] as const);
    if (shape === 'line') {
      if (!hard) return { shape, p: rng.int(1, 8), q: rng.int(1, 3) };
      const q = rng.int(1, 3);
      return { shape, p: 10 * q + rng.int(2, 12), q: -q };
    }
    if (shape === 'arch') return { shape, p: rng.int(2, 6), q: rng.int(6, 10) };
    if (shape === 'grow') return hard ? { shape, p: rng.int(8, 20), q: rng.int(6, 8) } : { shape, p: rng.int(1, 4), q: rng.int(12, 14) };
    return { shape, p: rng.int(hard ? 12 : 6, hard ? 30 : 20), q: 0 };
  },
  render: (params): Slide => ({
    kind: 'choice',
    prompt: [
      { kind: 'prose', text: 'The sketch shows a model of some quantity $y$ against $x$, for $x \\geq 0$. Which kind of function is it?' },
      {
        kind: 'diagram',
        svg: plotSvg({
          xMin: 0,
          xMax: 10,
          yMin: -1,
          yMax: sketchTop(params),
          curves: [{ f: sketchCurve(params), accent: true, breaks: params.shape === 'recip' }],
          verticals: [{ x: 0, dashed: false }],
          label: 'A sketch of y against x',
        }),
      },
    ],
    ...familyOptions(SKETCH_FAMILY[params.shape]),
  }),
  solution: ({ shape }) => {
    if (shape === 'line') return [{ text: 'It is straight: equal steps across give equal steps up or down. That is a **linear** model.' }];
    if (shape === 'arch') return [{ text: 'It rises, turns and comes back down symmetrically: a parabola, so a **quadratic** model.' }];
    if (shape === 'grow') {
      return [
        { text: 'It is curved, never turns, and crosses the $y$-axis at a starting value.' },
        { text: 'Each step across multiplies the height by the same number: an **exponential** model.' },
      ];
    }
    return [
      { text: 'It falls ever more slowly, and it climbs up the $y$-axis without ever meeting it — there is no value at $x = 0$.' },
      { text: 'That is $y = \\frac{k}{x}$: a **reciprocal** model. A falling exponential would cross the $y$-axis at its start.' },
    ];
  },
};

/* ---------- Lesson 2: the rule from the context ---------- */

/**
 * The rule built from the story.
 *
 * A standing charge and a rate go in as $a + bn$ — the bank holds the cost of
 * one unit, which is what a learner who adds them first writes. A fence of
 * $P$ gives width and length adding to $\frac{P}{2}$, not $P$. A shared
 * amount is divided by the input, not the other way up.
 */
const modelRule: Generator<Context> = {
  id: 'fun-model-rule',
  sample: (rng, difficulty) => drawContext(rng, difficulty > 1 ? ['down', 'area', 'recip'] : ['up', 'area'], difficulty > 1),
  render: ({ s, model }): Slide => {
    const setting = SETTINGS[s];
    const { out, inp } = setting;
    const lead = `${out}(${inp}) = `;
    const text = `${setting.story(storyNumbers(model))} Write the rule for $${out}$, ${lower(setting.parts[0])}, in terms of $${inp}$.`;
    const prompt: Block[] = [{ kind: 'prose', text }];
    if (model.kind === 'up' || model.kind === 'down') {
      const answer = [`${model.a}`, `${model.b}`];
      const other = model.kind === 'up' ? model.a + model.b : model.a - model.b;
      return {
        kind: 'tiles',
        prompt,
        template: `${lead}{0} ${model.kind === 'up' ? '+' : '-'} {1}${inp}`,
        bank: bankOf(answer, [`${other}`, model.kind === 'up' ? `${2 * model.b}` : `${emptyAt(model)}`]),
        answer,
      };
    }
    if (model.kind === 'area') {
      const answer = [`${model.k}`];
      return {
        kind: 'tiles',
        prompt,
        template: `${lead}${inp}({0} - ${inp})`,
        bank: bankOf(answer, [`${2 * model.k}`, `${4 * model.k}`, `${model.k - 2}`]),
        answer,
      };
    }
    const answer = [`\\frac{${model.K}}{${inp}}`];
    return {
      kind: 'tiles',
      prompt,
      template: `${lead}{0}`,
      bank: bankOf(answer, [`\\frac{${inp}}{${model.K}}`, `${model.K}${inp}`, `${model.K} - ${inp}`]),
      answer,
    };
  },
  solution: ({ s, model }) => {
    const setting = SETTINGS[s];
    const { inp } = setting;
    const why =
      model.kind === 'up'
        ? `The £$${model.a}$ is paid once, whatever $${inp}$ is; the £$${model.b}$ is paid $${inp}$ times.`
        : model.kind === 'down'
          ? `It starts at $${model.a}$ and loses $${model.b}$ for each of the $${inp}$ steps.`
          : model.kind === 'area'
            ? `The edge is width + length + width + length $= ${2 * model.k}$, so width and length add to $${model.k}$ and the length is $${model.k} - ${inp}$. Area is width times length.`
            : `The whole $${model.K}$ is divided by $${inp}$: double $${inp}$ and the answer halves.`;
    return [{ text: why }, { tex: ruleLine(setting, model) }];
  },
};

interface ModelValueParams extends Context {
  x: number;
  /** The rule is shown; otherwise it is built from the story. */
  shown: boolean;
}

/** An input that keeps the answer whole and sensible for its model. */
function sampleInput(rng: Rng, model: Model): number {
  if (model.kind === 'up') return rng.int(2, 12);
  if (model.kind === 'down') return rng.int(1, emptyAt(model) - 1);
  if (model.kind === 'area') return rng.int(1, model.k - 1);
  return rng.pick(divisorsOf(model.K));
}

/**
 * A model evaluated at an input the story names.
 *
 * Difficulty 1 shows the rule; difficulty 2 leaves the learner to build it
 * from the story first, and brings the falling and shared models in.
 */
const modelValue: Generator<ModelValueParams> = {
  id: 'fun-model-value',
  choices: ({ model, x }) => {
    const v = modelAt(model, x);
    if (model.kind === 'up') return numberChoices(v, model.a + model.b, model.b * x, (model.a + model.b) * x);
    if (model.kind === 'down') return numberChoices(v, model.b * x, model.a - model.b, model.a + model.b * x);
    if (model.kind === 'area') return numberChoices(v, x * model.k, x * (2 * model.k - x), model.k - x);
    return numberChoices(v, model.K * x, model.K - x, v * 2);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const context = drawContext(rng, hard ? ['down', 'area', 'recip'] : ['up', 'area', 'recip'], hard);
    return { ...context, x: sampleInput(rng, context.model), shown: !hard };
  },
  render: ({ s, model, x, shown }): Slide => {
    const setting = SETTINGS[s];
    const story = setting.story(storyNumbers(model));
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: shown ? `${story} The model is` : `${story} Build the rule for $${setting.out}$, then use it.` },
        ...(shown ? [{ kind: 'display' as const, tex: ruleLine(setting, model) }] : []),
        { kind: 'prose', text: `Find ${lower(setting.parts[0])}, ${setting.at(x)}.` },
      ],
      lead: `${setting.out}(${x}) =`,
      keypad: [],
      answer: `${modelAt(model, x)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ s, model, x }) => {
    const setting = SETTINGS[s];
    const put =
      model.kind === 'up'
        ? `${model.a} + ${model.b} \\times ${x}`
        : model.kind === 'down'
          ? `${model.a} - ${model.b} \\times ${x}`
          : model.kind === 'area'
            ? `${x}(${model.k} - ${x}) = ${x} \\times ${model.k - x}`
            : `\\frac{${model.K}}{${x}}`;
    return [
      { tex: ruleLine(setting, model) },
      { text: `Write $${x}$ in place of $${setting.inp}$.` },
      { tex: `${setting.out}(${x}) = ${put} = ${modelAt(model, x)}` },
    ];
  },
};

interface MeaningParams extends Context {
  /** Which part is asked: the first number, or the second part. */
  asks: 'first' | 'second';
}

/** What the asked part looks like in the rule. */
function meaningPart({ s, model, asks }: MeaningParams): string {
  const { inp } = SETTINGS[s];
  if (model.kind === 'up' || model.kind === 'down') return `${asks === 'first' ? model.a : model.b}`;
  if (model.kind === 'area') return asks === 'first' ? `${model.k}` : `${model.k} - ${inp}`;
  return `${model.K}`;
}

/**
 * What each number in a rule stands for.
 *
 * The four options are the four parts of the story — the output, the
 * input, the fixed amount, the rate — so a learner who reads the rule as
 * a set of numbers rather than as the story has somewhere wrong to land.
 * For a rectangle the asked part may be the bracket, $k - x$, which is the
 * length; for a shared amount it is always the amount.
 */
const modelMeaning: Generator<MeaningParams> = {
  id: 'fun-model-meaning',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const context = drawContext(rng, hard ? ['down', 'area', 'recip'] : ['up', 'area'], hard);
    if (context.model.kind === 'up' || context.model.kind === 'down') {
      if (context.model.a === context.model.b) context.model = { ...context.model, a: context.model.a + 5 };
    }
    const asks = context.model.kind === 'recip' || (context.model.kind === 'area' && !hard) ? 'first' : rng.pick(['first', 'second'] as const);
    return { ...context, asks };
  },
  render: (params): Slide => {
    const { s, model, asks } = params;
    const setting = SETTINGS[s];
    const [outWords, inWords, first, second] = setting.parts;
    const part = meaningPart(params);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `${setting.story(storyNumbers(model))} The model is` },
        { kind: 'display', tex: ruleLine(setting, model) },
        { kind: 'prose', text: `What does ${part.includes(' ') ? '' : 'the '}$${part}$ stand for?` },
      ],
      ...fixedChoice([asks === 'first' ? first : second, asks === 'first' ? second : first, outWords, inWords].map((label) => ({ label }))),
    };
  },
  solution: (params) => {
    const { s, model, asks } = params;
    const setting = SETTINGS[s];
    const part = meaningPart(params);
    const meaning = lower(setting.parts[asks === 'first' ? 2 : 3]);
    const why =
      model.kind === 'up'
        ? asks === 'first'
          ? `It is added once, whatever $${setting.inp}$ is.`
          : `It is multiplied by $${setting.inp}$, so it is paid once for every one.`
        : model.kind === 'down'
          ? asks === 'first'
            ? `It is the value when $${setting.inp} = 0$.`
            : `It is taken away once for every one of the $${setting.inp}$ steps.`
          : model.kind === 'area'
            ? asks === 'first'
              ? `Width + length + width + length is the whole edge, so width + length is half of it.`
              : `The width is $${setting.inp}$, and width + length is $${model.k}$, so the length is what is left.`
            : `It is divided by $${setting.inp}$: it is the whole amount being shared or covered.`;
    return [{ text: why }, { text: `So $${part}$ is ${meaning}.` }];
  },
};

interface RuleMachineParams extends Context {
  x: number;
}

function machineSteps({ model, x }: RuleMachineParams): number[] {
  if (model.kind === 'up') return [model.b * x, model.a + model.b * x];
  if (model.kind === 'down') return [model.b * x, model.a - model.b * x];
  if (model.kind === 'area') return [model.k - x, x * (model.k - x)];
  return [model.K / x];
}

/**
 * The rule run a step at a time, in the order the story's arithmetic goes:
 * the rate times the input before the fixed amount, the bracket before the
 * width times it.
 */
const ruleMachine: Generator<RuleMachineParams> = {
  id: 'fun-rule-machine',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const context = drawContext(rng, hard ? ['down', 'area'] : ['up', 'area'], hard);
    return { ...context, x: sampleInput(rng, context.model) };
  },
  render: (params): Slide => {
    const { s, model, x } = params;
    const setting = SETTINGS[s];
    const values = machineSteps(params);
    const answer = values.map(String);
    const order = model.kind === 'area' ? 'the bracket first, then multiply' : 'multiply first, then the fixed amount';
    const slips =
      model.kind === 'area'
        ? [model.k + x, x * model.k, 2 * model.k - x]
        : model.kind === 'up'
          ? [(model.a + model.b) * x, model.a + x, model.b + x]
          : model.kind === 'down'
            ? [(model.a - model.b) * x, model.a - x, model.a + model.b * x]
            : [];
    return {
      kind: 'tree',
      prompt: [
        { kind: 'prose', text: `${setting.story(storyNumbers(model))} The model is` },
        { kind: 'display', tex: ruleLine(setting, model) },
        { kind: 'prose', text: `Put $${x}$ through the rule — ${order} — to find ${lower(setting.parts[0])}, ${setting.at(x)}.` },
      ],
      expression: `${setting.out}(${x})`,
      nodes: [
        { id: 'inner', from: [] },
        { id: 'result', from: ['inner'] },
      ],
      bank: treeBank(answer, slips.filter((v) => v > 0), values[1]),
      answer,
    };
  },
  solution: (params) => {
    const { s, model, x } = params;
    const setting = SETTINGS[s];
    const [inner, result] = machineSteps(params);
    if (model.kind === 'area') {
      return [
        { text: `The bracket first: $${model.k} - ${x} = ${inner}$, the length.` },
        { text: `Then width times length: $${x} \\times ${inner} = ${result}$.` },
        { tex: `${setting.out}(${x}) = ${result}` },
      ];
    }
    return [
      { text: `Multiply first: $${'b' in model ? model.b : 0} \\times ${x} = ${inner}$.` },
      { text: `Then ${model.kind === 'up' ? 'add it to' : 'take it from'} $${'a' in model ? model.a : 0}$: $${result}$.` },
      { tex: `${setting.out}(${x}) = ${result}` },
    ];
  },
};

/* ---------- Lesson 3: the domain that makes sense ---------- */

/** The inputs that make sense for a setting and its model. */
interface Sensible {
  whole: boolean;
  lo: number;
  loIn: boolean;
  hi: number;
  hiIn: boolean;
}

function sensible(setting: Setting, model: Model): Sensible {
  if (model.kind === 'up') return { whole: setting.count, lo: 0, loIn: true, hi: Infinity, hiIn: false };
  if (model.kind === 'down') return { whole: setting.count, lo: 0, loIn: true, hi: emptyAt(model), hiIn: true };
  if (model.kind === 'area') return { whole: false, lo: 0, loIn: false, hi: model.k, hiIn: false };
  return setting.count
    ? { whole: true, lo: 1, loIn: true, hi: Infinity, hiIn: false }
    : { whole: false, lo: 0, loIn: false, hi: Infinity, hiIn: false };
}

/** A domain as the learner reads it: `n = 0, 1, 2, \ldots`, `0 < x < 10`, `v > 0`. */
function sensibleTex(v: string, d: Sensible): string {
  if (d.whole) {
    const run = d.lo === 0 ? '0, 1, 2' : '1, 2, 3';
    return Number.isFinite(d.hi) ? `${v} = ${run}, \\ldots, ${d.hi}` : `${v} = ${run}, \\ldots`;
  }
  const left = `${d.lo} ${d.loIn ? '\\leq' : '<'} ${v}`;
  if (!Number.isFinite(d.hi)) return `${v} ${d.loIn ? '\\geq' : '>'} ${d.lo}`;
  return `${left} ${d.hiIn ? '\\leq' : '<'} ${d.hi}`;
}

/** Why the domain is what it is, a sentence for each end. */
function sensibleWhy(setting: Setting, model: Model): string[] {
  const d = sensible(setting, model);
  const v = setting.inp;
  const out: string[] = [];
  out.push(d.whole ? `$${v}$ counts whole things, so it is a whole number.` : `$${v}$ is a measurement, so it can be any number in its stretch.`);
  if (model.kind === 'recip') {
    out.push(d.whole ? `There must be at least one to share between: $${v}$ starts at $1$.` : `$${v} = 0$ would mean dividing by zero — and never finishing — so it is left out.`);
  } else if (model.kind === 'area') {
    out.push(`A width of $0$, or of $${model.k}$, leaves a rectangle with no area at all, so both ends are left out: the length $${model.k} - ${v}$ must be more than $0$ too.`);
  } else {
    out.push(`It starts at $0$.`);
  }
  if (model.kind === 'down') {
    out.push(`It runs out when $${model.a} - ${model.b}${v} = 0$, at $${v} = ${emptyAt(model)}$; beyond that the model would give a negative amount.`);
  }
  return out;
}

/** Four domains a learner might give, the sensible one first. */
function domainCandidates(setting: Setting, model: Model): Sensible[] {
  const d = sensible(setting, model);
  const open = { ...d, loIn: false, hiIn: false };
  const closed = { ...d, loIn: true, hiIn: Number.isFinite(d.hi) };
  const ray = { ...d, hi: Infinity, hiIn: false };
  const flip = { ...d, whole: !d.whole };
  if (model.kind === 'area') {
    return [d, closed, { ...d, hi: 2 * model.k }, ray];
  }
  if (model.kind === 'down') return [d, ray, { ...d, hi: model.a }, flip];
  if (model.kind === 'recip') {
    return d.whole
      ? [d, { ...d, lo: 0 }, flip, { ...flip, lo: 0 }]
      : [d, { ...d, loIn: true }, { ...d, whole: true, lo: 1, loIn: true }, { ...d, whole: true, lo: 0, loIn: true }];
  }
  return d.whole ? [d, flip, { ...flip, loIn: false }, { ...d, lo: 1 }] : [d, open, flip, { ...flip, lo: 1 }];
}

/**
 * The domain that makes sense, from four written ways.
 *
 * Counting things makes the input whole; a measurement may be any value in
 * its stretch. A fence's width stops short of both $0$ and half the fence,
 * a draining tank runs out at a whole time, and a speed or a rate must be
 * more than $0$. Difficulty 1 is the counts and measures that start at $0$
 * and never stop; difficulty 2 has an end to find.
 */
const modelDomain: Generator<Context> = {
  id: 'fun-model-domain',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kinds: ModelKind[] = hard ? ['down', 'area', 'recip'] : ['up', 'recip'];
    const pool = settingsOf(...kinds).filter((i) => SETTINGS[i].key !== 'sweets' && (hard || SETTINGS[i].kind === 'up' || SETTINGS[i].count));
    const s = rng.pick(pool);
    return { s, model: sampleModel(rng, SETTINGS[s].kind, hard) };
  },
  render: ({ s, model }): Slide => {
    const setting = SETTINGS[s];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `${setting.story(storyNumbers(model))} The model is` },
        { kind: 'display', tex: ruleLine(setting, model) },
        { kind: 'prose', text: `Which values of $${setting.inp}$ make sense in this model?` },
      ],
      ...fixedChoice(domainCandidates(setting, model).map((d) => ({ label: sensibleTex(setting.inp, d), tex: true }))),
    };
  },
  solution: ({ s, model }) => {
    const setting = SETTINGS[s];
    return [...sensibleWhy(setting, model).map((text) => ({ text })), { tex: sensibleTex(setting.inp, sensible(setting, model)) }];
  },
};

const FLOW_WHOLE = 'Whole numbers only: it counts things';
const FLOW_ANY = 'Any number: it measures something';
const FLOW_AT0 = 'At $0$, included';
const FLOW_ABOVE0 = 'Just above $0$, not included';
const FLOW_AT1 = 'At $1$, included';
const FLOW_NEVER = 'It never stops';
const FLOW_ENDIN = 'At a largest value, included';
const FLOW_ENDOUT = 'Just short of a value, not included';

/**
 * The domain worked out one question at a time: whole or not, where it
 * starts, where it stops, and the stopping value.
 *
 * The last fork only appears on a route that has an end, so a learner who
 * says a tank never runs dry never meets the number.
 */
const senseFlow: Generator<Context> = {
  id: 'fun-sense-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const s = rng.pick(settingsOf(...(hard ? (['down', 'area', 'recip'] as ModelKind[]) : (['up', 'down', 'recip'] as ModelKind[]))).filter((i) => SETTINGS[i].key !== 'sweets'));
    return { s, model: sampleModel(rng, SETTINGS[s].kind, hard, 12) };
  },
  render: ({ s, model }): Slide => {
    const setting = SETTINGS[s];
    const d = sensible(setting, model);
    const v = setting.inp;
    const end = Number.isFinite(d.hi) ? d.hi : undefined;
    const ends =
      model.kind === 'area'
        ? offer(model.k, 2 * model.k, model.k / 2, model.k - 1)
        : model.kind === 'down'
          ? offer(emptyAt(model), model.a, model.b, emptyAt(model) + 1)
          : offer(10, 100, 1, 50);
    const endBranches = (outcome: string) => turned(ends.map((n) => `$${n}$`)).map((label) => ({ label, outcome: `${outcome} ${label}.` }));
    const answer = [d.whole ? FLOW_WHOLE : FLOW_ANY, d.lo === 1 ? FLOW_AT1 : d.loIn ? FLOW_AT0 : FLOW_ABOVE0];
    if (end === undefined) answer.push(FLOW_NEVER);
    else answer.push(d.hiIn ? FLOW_ENDIN : FLOW_ENDOUT, `$${end}$`);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `${setting.story(storyNumbers(model))} Work out which values of $${v}$ make sense.` }],
      subject: ruleLine(setting, model),
      steps: [
        { id: 'kind', ask: `What kind of number can $${v}$ be?`, branches: turned([FLOW_WHOLE, FLOW_ANY]).map((label) => ({ label, to: 'start' })) },
        { id: 'start', ask: 'Where does it start?', branches: turned([FLOW_AT0, FLOW_ABOVE0, FLOW_AT1]).map((label) => ({ label, to: 'stop' })) },
        {
          id: 'stop',
          ask: 'Where does it stop?',
          branches: turned([FLOW_NEVER, FLOW_ENDIN, FLOW_ENDOUT]).map((label) =>
            label === FLOW_NEVER
              ? { label, outcome: 'So there is no largest value.' }
              : { label, to: label === FLOW_ENDIN ? 'largest' : 'short' },
          ),
        },
        { id: 'largest', ask: 'What is the largest value?', branches: endBranches('So it stops at') },
        { id: 'short', ask: 'What value does it stop just short of?', branches: endBranches('So it stops just short of') },
      ],
      answer,
    };
  },
  solution: ({ s, model }) => {
    const setting = SETTINGS[s];
    return [...sensibleWhy(setting, model).map((text) => ({ text })), { tex: sensibleTex(setting.inp, sensible(setting, model)) }];
  },
};

/** The domain in the number line's canonical writing: `(0,8)`, `[0,inf)`. */
function sensibleSet(d: Sensible): string {
  const hi = Number.isFinite(d.hi) ? `${d.hi}` : 'inf';
  return `${d.loIn ? '[' : '('}${d.lo},${hi}${d.hiIn ? ']' : ')'}`;
}

/**
 * The domain drawn: filled or hollow ends, and whether it runs off the line.
 *
 * Measurements only, so the set is a stretch rather than a row of dots. The
 * line runs from $-1$ to $11$, so every end is at most $10$.
 */
const domainLine: Generator<Context> = {
  id: 'fun-domain-line',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const pool = settingsOf(...(hard ? (['area', 'recip', 'down'] as ModelKind[]) : (['up', 'down'] as ModelKind[]))).filter((i) => !SETTINGS[i].count);
    const s = rng.pick(pool);
    const kind = SETTINGS[s].kind;
    if (kind === 'area') return { s, model: { kind, k: rng.int(4, 10) } };
    if (kind === 'down') {
      const b = rng.int(2, 9);
      return { s, model: { kind, a: b * rng.int(3, 10), b } };
    }
    return { s, model: sampleModel(rng, kind, hard) };
  },
  render: ({ s, model }): Slide => {
    const setting = SETTINGS[s];
    return {
      kind: 'numberLine',
      prompt: [
        { kind: 'prose', text: `${setting.story(storyNumbers(model))} The model is` },
        { kind: 'display', tex: ruleLine(setting, model) },
        { kind: 'prose', text: `Shade the values of $${setting.inp}$ that make sense.` },
      ],
      min: -1,
      max: 11,
      step: 1,
      answer: sensibleSet(sensible(setting, model)),
    };
  },
  solution: ({ s, model }) => {
    const setting = SETTINGS[s];
    const d = sensible(setting, model);
    return [
      ...sensibleWhy(setting, model).map((text) => ({ text })),
      { tex: sensibleTex(setting.inp, d) },
      {
        text: `On the line: a ${d.loIn ? 'filled' : 'hollow'} dot at $${d.lo}$, ${
          Number.isFinite(d.hi) ? `a ${d.hiIn ? 'filled' : 'hollow'} dot at $${d.hi}$, and the stretch between shaded` : 'and everything to the right of it shaded'
        }.`,
      },
    ];
  },
};

interface ModelRangeParams extends Context {
  /** The ends of the domain the question sets. */
  lo: number;
  hi: number;
  asks: 'max' | 'min';
}

/** The domain as the question writes it: `0 < x < 10`, `0 \leq n \leq 20`, `40 \leq v \leq 60`. */
function rangeDomainTex({ s, model, lo, hi }: ModelRangeParams): string {
  const v = SETTINGS[s].inp;
  return model.kind === 'area' ? `${lo} < ${v} < ${hi}` : `${lo} \\leq ${v} \\leq ${hi}`;
}

function rangeAnswer({ model, lo, hi, asks }: ModelRangeParams): number {
  if (model.kind === 'area') return (model.k / 2) ** 2;
  const ends = [modelAt(model, lo), modelAt(model, hi)];
  return asks === 'max' ? Math.max(...ends) : Math.min(...ends);
}

/** A slider step that lands on the answer, with no more than about forty stops. */
function sliderScale(answer: number, top: number): { step: number; max: number } {
  for (const step of [1, 2, 5, 10, 20]) {
    if (answer % step !== 0) continue;
    const max = step * Math.ceil(top / step);
    if (max / step <= 40) return { step, max };
  }
  return { step: 1, max: Math.ceil(top) };
}

/**
 * The range that follows from the domain: slide a line to the greatest or
 * least output.
 *
 * A rising line's greatest value is at the top of its domain; a reciprocal's
 * greatest is at the *bottom*, since a slower speed takes longer; and a
 * rectangle's greatest area is at neither end but at the square in the
 * middle, which is why the area's ends are left open.
 */
const modelRange: Generator<ModelRangeParams> = {
  id: 'fun-model-range',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick(hard ? (['area', 'recip', 'recip'] as const) : (['up', 'area'] as const));
    const s = rng.pick(settingsOf(kind).filter((i) => kind !== 'recip' || !SETTINGS[i].count));
    if (kind === 'area') {
      const k = 2 * rng.int(3, 10);
      return { s, model: { kind, k }, lo: 0, hi: k, asks: 'max' };
    }
    if (kind === 'up') {
      const model = { kind, a: rng.int(1, 6) * 5, b: rng.int(2, 9) };
      return { s, model, lo: 0, hi: rng.int(2, 6) * 5, asks: 'max' };
    }
    const K = rng.pick([60, 120, 180, 240, 360]);
    const ds = divisorsOf(K, 3, 60);
    const i = rng.int(0, ds.length - 2);
    const j = rng.int(i + 1, ds.length - 1);
    return { s, model: { kind, K }, lo: ds[i], hi: ds[j], asks: rng.pick(['max', 'min'] as const) };
  },
  render: (params): Slide => {
    const { s, model, lo, hi, asks } = params;
    const setting = SETTINGS[s];
    const answer = rangeAnswer(params);
    const top = model.kind === 'area' ? answer * 1.3 : Math.max(modelAt(model, lo), modelAt(model, hi)) * 1.25;
    const { step, max } = sliderScale(answer, top);
    const feature = asks === 'max' ? 'greatest' : 'least';
    return {
      kind: 'slider',
      prompt: [
        { kind: 'prose', text: `${setting.story(storyNumbers(model))} The model is` },
        { kind: 'display', tex: `${ruleLine(setting, model)}, \\quad ${rangeDomainTex(params)}` },
        { kind: 'prose', text: `Slide the line to the ${feature} value ${lower(setting.parts[0]).replace(/, in .*$/, '')} can take.` },
      ],
      min: 0,
      max,
      step,
      answer,
      readout: `${setting.out} = {v}`,
      figure: {
        svg: plotSvg({
          xMin: lo,
          xMax: hi,
          yMin: 0,
          yMax: max,
          curves: [{ f: (x) => modelAt(model, x), accent: true }],
          label: `The graph of the model over its domain`,
        }),
        ...markerWindow(0, max, 'y'),
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { s, model, lo, hi, asks } = params;
    const setting = SETTINGS[s];
    const v = setting.inp;
    const answer = rangeAnswer(params);
    if (model.kind === 'area') {
      const half = model.k / 2;
      return [
        { text: `The area is $0$ at both ends of the domain and greatest halfway between, where the pen is a square: $${v} = ${half}$.` },
        { tex: `${setting.out}(${half}) = ${half}(${model.k} - ${half}) = ${answer}` },
      ];
    }
    const ends = [lo, hi].map((x) => `${setting.out}(${x}) = ${modelAt(model, x)}`);
    return [
      {
        text:
          model.kind === 'up'
            ? `The model rises as $${v}$ grows, so the ends of the domain give the least and greatest values.`
            : `The model falls as $${v}$ grows, so the least $${v}$ gives the greatest value and the greatest $${v}$ the least.`,
      },
      { tex: `\\begin{gathered} ${ends.join(' \\\\ ')} \\end{gathered}` },
      { text: `So the ${asks === 'max' ? 'greatest' : 'least'} value is $${answer}$.` },
    ];
  },
};

/* ---------- Lesson 4: the inverse in context ---------- */

interface ModelInverseParams extends Context {
  /** The input the inverse returns. */
  x: number;
}

/**
 * $C^{-1}(55)$ read as what £55 buys: an output given, the input asked.
 *
 * Built from its answer: the input is drawn and the output is the model at
 * it, so the inverse always lands on a whole number. The slip is to work
 * out $C(55)$ instead, which is the first distractor. Difficulty 2 has
 * falling and shared models, where the inverse of a reciprocal is the same
 * division again.
 */
const modelInverse: Generator<ModelInverseParams> = {
  id: 'fun-model-inverse',
  choices: ({ model, x }) => {
    const y = modelAt(model, x);
    const forward = modelAt(model, y);
    if (model.kind === 'up') return numberChoices(x, forward, y - model.a, (y + model.a) / model.b);
    if (model.kind === 'down') return numberChoices(x, forward, (model.a + y) / model.b, model.a - y);
    // A reciprocal undoes itself: K over the output is the input, so working
    // the model forwards again is right here, and the slips are elsewhere.
    return numberChoices(x, model.kind === 'recip' ? model.K - y : y, 2 * x, x + 1);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const context = drawContext(rng, hard ? ['down', 'recip'] : ['up'], hard);
    return { ...context, x: sampleInput(rng, context.model) };
  },
  render: ({ s, model, x }): Slide => {
    const setting = SETTINGS[s];
    const y = modelAt(model, x);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `${setting.story(storyNumbers(model))} The model is` },
        { kind: 'display', tex: ruleLine(setting, model) },
        { kind: 'prose', text: `Find $${setting.out}^{-1}(${y})$: ${setting.inv(y)}.` },
      ],
      lead: `${setting.out}^{-1}(${y}) =`,
      keypad: [],
      answer: `${x}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ s, model, x }) => {
    const setting = SETTINGS[s];
    const y = modelAt(model, x);
    const v = setting.inp;
    const steps: SolutionStep[] = [{ text: `$${setting.out}^{-1}(${y})$ is the $${v}$ that gives $${setting.out} = ${y}$. Solve:` }];
    if (model.kind === 'up') {
      steps.push({ tex: `\\begin{gathered} ${model.a} + ${model.b}${v} = ${y} \\\\ ${model.b}${v} = ${y - model.a} \\\\ ${v} = ${x} \\end{gathered}` });
    } else if (model.kind === 'down') {
      steps.push({ tex: `\\begin{gathered} ${model.a} - ${model.b}${v} = ${y} \\\\ ${model.b}${v} = ${model.a - y} \\\\ ${v} = ${x} \\end{gathered}` });
    } else if (model.kind === 'recip') {
      steps.push({ tex: `\\begin{gathered} \\frac{${model.K}}{${v}} = ${y} \\\\ ${v} = \\frac{${model.K}}{${y}} = ${x} \\end{gathered}` });
    }
    steps.push({ text: `Working out $${setting.out}(${y})$ instead answers a different question.` });
    return steps;
  },
};

interface Conversion {
  key: string;
  from: string;
  to: string;
  /** to = (top / den) * from + add. */
  top: number;
  den: number;
  add: number;
  story: string;
}

const CONVERSIONS: Conversion[] = [
  { key: 'kilometres', from: 'm', to: 'k', top: 8, den: 5, add: 0, story: 'Distances in miles, $m$, are changed into kilometres, $k$, by' },
  { key: 'euros', from: 'p', to: 'e', top: 6, den: 5, add: 0, story: 'A bureau changes pounds, $p$, into euros, $e$, by' },
  { key: 'kilograms', from: 'k', to: 'p', top: 11, den: 5, add: 0, story: 'A mass in kilograms, $k$, is changed into pounds, $p$, by' },
  { key: 'inches', from: 'i', to: 'c', top: 5, den: 2, add: 0, story: 'A length in inches, $i$, is changed into centimetres, $c$, by' },
  { key: 'gallons', from: 'g', to: 'l', top: 9, den: 2, add: 0, story: 'A volume in gallons, $g$, is changed into litres, $l$, by' },
  { key: 'Fahrenheit', from: 'C', to: 'F', top: 9, den: 5, add: 32, story: 'A temperature in degrees Celsius, $C$, is changed into degrees Fahrenheit, $F$, by' },
];

/** A multiplier as it is written: `1.6`, `2.5`. */
function decimalTex(top: number, den: number): string {
  return `${Math.round((top / den) * 10) / 10}`;
}

function conversionTex(c: Conversion): string {
  return `${c.to} = ${decimalTex(c.top, c.den)}${c.from}${c.add ? ` + ${c.add}` : ''}`;
}

interface ConvertParams {
  c: number;
  /** Multiples of the conversion's denominator down the table. */
  ks: number[];
  /** Which rows give the converted value and ask the original. */
  back: boolean[];
}

/**
 * A conversion both ways, in one table.
 *
 * Some rows give the original and ask the converted value; others give the
 * converted value and ask the original, which is the inverse: undo the
 * multiplier by dividing, and undo an added $32$ first. The bank holds each
 * blank worked the wrong way round.
 */
const convertTable: Generator<ConvertParams> = {
  id: 'fun-convert-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const c = rng.pick(hard ? [2, 3, 4, 5] : [0, 1, 2, 3, 4]);
    const ks = [...new Set(Array.from({ length: 12 }, () => rng.int(1, hard ? 20 : 12)))].slice(0, 4).sort((p, q) => p - q);
    while (ks.length < 4) ks.push(ks[ks.length - 1] + 1);
    const back = rng.pick([
      [false, true, false, true],
      [true, false, true, false],
      [false, true, true, false],
      [true, false, false, true],
    ]);
    return { c, ks, back };
  },
  render: ({ c, ks, back }): Slide => {
    const conv = CONVERSIONS[c];
    const rows = ks.map((k) => {
      const x = k * conv.den;
      return [x, (k * conv.top) + conv.add];
    });
    const answer: string[] = [];
    const slips: number[] = [];
    const cells = rows.map(([x, y], i) => {
      if (back[i]) {
        answer.push(`${x}`);
        slips.push(Math.round(((y * conv.top) / conv.den) * 10) / 10, y - conv.add);
        return [null, `${y}`];
      }
      answer.push(`${y}`);
      slips.push(Math.round(((x * conv.den) / conv.top) * 10) / 10, x * conv.top);
      return [`${x}`, null];
    });
    return {
      kind: 'table',
      prompt: [
        { kind: 'prose', text: `${conv.story}` },
        { kind: 'display', tex: conversionTex(conv) },
        { kind: 'prose', text: 'Fill in the table. Where the first column is blank, run the conversion backwards.' },
      ],
      columns: [conv.from, conv.to],
      rows: cells,
      bank: treeBank(answer, slips.filter((v) => Number.isInteger(v) && v > 0), Number(answer[answer.length - 1])),
      answer,
    };
  },
  solution: ({ c }) => {
    const conv = CONVERSIONS[c];
    const m = decimalTex(conv.top, conv.den);
    return [
      { text: `Forwards: multiply by $${m}$${conv.add ? `, then add $${conv.add}$` : ''}.` },
      { tex: conversionTex(conv) },
      { text: `Backwards, undo each step in reverse order: ${conv.add ? `take away $${conv.add}$, then ` : ''}divide by $${m}$.` },
      { tex: `${conv.from} = ${conv.add ? `\\frac{${conv.to} - ${conv.add}}{${m}}` : `\\frac{${conv.to}}{${m}}`}` },
    ];
  },
};

interface InverseTilesParams {
  /** A setting index, or a conversion's as `CONVERSIONS` index plus 100. */
  s: number;
  model: Model;
}

/**
 * The inverse as a rule: the input in terms of the output, the story's
 * steps undone in reverse order.
 *
 * A standing charge plus a rate comes back as (output less the charge)
 * over the rate. A falling amount comes back as (start less the output)
 * over the rate — the other way round, which is the trap. Difficulty 2
 * adds the Fahrenheit conversion, whose $+ 32$ has to come off first.
 */
const inverseTiles: Generator<InverseTilesParams> = {
  id: 'fun-inverse-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    if (hard && rng.chance(0.2)) return { s: 105, model: { kind: 'up', a: 32, b: 1.8 } };
    const context = drawContext(rng, hard ? ['down'] : ['up'], hard);
    if (context.model.kind === 'up' || context.model.kind === 'down') {
      if (context.model.a === context.model.b) context.model = { ...context.model, a: context.model.a * 2 };
    }
    return context;
  },
  render: ({ s, model }): Slide => {
    if (model.kind !== 'up' && model.kind !== 'down') throw new Error('inverse tiles take a line');
    const { a, b } = model;
    if (s >= 100) {
      const conv = CONVERSIONS[s - 100];
      const answer = [signedTile(-a), `${b}`];
      return {
        kind: 'tiles',
        prompt: [
          { kind: 'prose', text: conv.story },
          { kind: 'display', tex: conversionTex(conv) },
          { kind: 'prose', text: `Write the conversion the other way: $${conv.from}$ in terms of $${conv.to}$.` },
        ],
        template: `${conv.from} = (${conv.to} {0}) \\div {1}`,
        bank: bankOf(answer, [signedTile(a), '0.8', '1.2']),
        answer,
      };
    }
    const setting = SETTINGS[s];
    const { out, inp } = setting;
    const prompt: Block[] = [
      { kind: 'prose', text: `${setting.story([a, b])} The model is` },
      { kind: 'display', tex: ruleLine(setting, model) },
      { kind: 'prose', text: `Write the inverse: $${inp}$, ${lower(setting.parts[1])}, in terms of $${out}$.` },
    ];
    if (model.kind === 'up') {
      const answer = [signedTile(-a), `${b}`];
      return {
        kind: 'tiles',
        prompt,
        template: `${inp} = (${out} {0}) \\div {1}`,
        bank: bankOf(answer, [signedTile(a), signedTile(-b), `${a}`]),
        answer,
      };
    }
    const answer = [`${a}`, `${b}`];
    return {
      kind: 'tiles',
      prompt,
      template: `${inp} = ({0} - ${out}) \\div {1}`,
      bank: bankOf(answer, [`${a / b}`, `${a - b}`, `${a + b}`]),
      answer,
    };
  },
  solution: ({ s, model }) => {
    if (model.kind !== 'up' && model.kind !== 'down') return [];
    const { a, b } = model;
    if (s >= 100) {
      const conv = CONVERSIONS[s - 100];
      return [
        { text: `Forwards: multiply by $${b}$, then add $${a}$. Undo them in reverse: take away $${a}$ first, then divide by $${b}$.` },
        { tex: `${conv.from} = (${conv.to} - ${a}) \\div ${b}` },
      ];
    }
    const setting = SETTINGS[s];
    const { out, inp } = setting;
    if (model.kind === 'up') {
      return [
        { text: `Forwards: multiply $${inp}$ by $${b}$, then add $${a}$. Undo in reverse: take away $${a}$, then divide by $${b}$.` },
        { tex: `\\begin{gathered} ${out} = ${a} + ${b}${inp} \\\\ ${out} - ${a} = ${b}${inp} \\\\ ${inp} = (${out} - ${a}) \\div ${b} \\end{gathered}` },
      ];
    }
    return [
      { text: `Add $${b}${inp}$ to both sides and take $${out}$ away, so that the $${inp}$ term is positive.` },
      { tex: `\\begin{gathered} ${out} = ${a} - ${b}${inp} \\\\ ${b}${inp} = ${a} - ${out} \\\\ ${inp} = (${a} - ${out}) \\div ${b} \\end{gathered}` },
    ];
  },
};

interface NoInverseParams {
  s: number;
  /** Width and length add to k; k is even. */
  k: number;
  /** The smaller of the two widths that give the asked area. */
  r: number;
}

const NO_INVERSE = 'No: one area comes from two widths';
const YES_ONE_AREA = 'Yes: each width gives just one area';
const YES_ONE_X = 'Yes: the rule has only one $x$ in it';

/**
 * A model with no inverse over its whole domain, then the domain that
 * gives it one.
 *
 * The area $r(k - r)$ is reached at a width of $r$ and again at $k - r$ —
 * the same rectangle turned round — so knowing the area does not tell you
 * the width. Cutting the domain at the square in the middle, $\frac{k}{2}$,
 * leaves each area reached once.
 */
const noInverseFlow: Generator<NoInverseParams> = {
  id: 'fun-no-inverse-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const k = 2 * rng.int(hard ? 6 : 4, hard ? 10 : 7);
    return { s: rng.pick(settingsOf('area')), k, r: rng.int(1, k / 2 - 1) };
  },
  render: ({ s, k, r }): Slide => {
    const setting = SETTINGS[s];
    const model: Model = { kind: 'area', k };
    const area = r * (k - r);
    const unit = setting.key === 'wire' ? 'cm²' : 'm²';
    const both = `$x = ${r}$ or $x = ${k - r}$`;
    const widths = [both, `$x = ${r}$ only`, `$x = ${k - r}$ only`, `$x = ${k / 2}$ only`];
    const cut = `$0 < x \\leq ${k / 2}$`;
    const domains = [cut, `$0 < x < ${k}$`, `$${r} \\leq x \\leq ${k - r}$`, `$x \\geq ${r}$`];
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `${setting.story([2 * k])} The model is $${ruleLine(setting, model)}$, for $0 < x < ${k}$.` }],
      subject: `A = ${area}`,
      steps: [
        { id: 'widths', ask: `Which widths give an area of $${area}$ ${unit}?`, branches: turned(widths).map((label) => ({ label, to: 'inverse' })) },
        {
          id: 'inverse',
          ask: `So does $A$ have an inverse for $0 < x < ${k}$?`,
          branches: turned([NO_INVERSE, YES_ONE_AREA, YES_ONE_X]).map((label) => ({ label, to: 'restrict' })),
        },
        {
          id: 'restrict',
          ask: 'Which domain would give $A$ an inverse?',
          branches: turned(domains).map((label) => ({ label, outcome: `So the domain is ${label}.` })),
        },
      ],
      answer: [both, NO_INVERSE, cut],
    };
  },
  solution: ({ s, k, r }) => {
    const setting = SETTINGS[s];
    const area = r * (k - r);
    return [
      { tex: `\\begin{gathered} ${r}(${k} - ${r}) = ${area} \\\\ ${k - r}(${k} - ${k - r}) = ${area} \\end{gathered}` },
      { text: `A ${setting.key === 'wire' ? 'frame' : 'rectangle'} $${r}$ wide and $${k - r}$ long is the same shape as one $${k - r}$ wide and $${r}$ long, so both widths give $${area}$.` },
      { text: 'One output from two inputs means there is no inverse: $A^{-1}(' + area + ')$ would not know which width to give.' },
      { text: `The area rises to the square at $x = ${k / 2}$ and falls after it. Keep only one side, $0 < x \\leq ${k / 2}$, and each area comes from one width.` },
    ];
  },
};

/* ---------- Lesson 5: the composite in context ---------- */

interface PriceSetting {
  key: string;
  /** The thing priced: "a coat". */
  item: string;
  /**
   * What the number is: "price" for a thing bought, else the quantity itself,
   * so a wage is never "the price of a weekly wage".
   */
  noun: 'price' | 'wage' | 'total';
  /** In pounds, or a bare count. */
  pounds: boolean;
  /** The fixed change: a voucher takes off, a fee adds on. */
  sign: 1 | -1;
  /** "a £$10$ voucher", "a £$15$ delivery charge". */
  amount: (v: number) => string;
  /** The multiplier and its words: "VAT at $20$% is added". */
  m: number;
  multiply: string;
  /** Prices and amounts are multiples of this, so every stage is whole. */
  unit: number;
}

const PRICES: PriceSetting[] = [
  { key: 'voucher', item: 'a coat', noun: 'price', pounds: true, sign: -1, amount: (v) => `a £$${v}$ voucher comes off`, m: 1.2, multiply: 'VAT at $20$% is added', unit: 5 },
  { key: 'delivery', item: 'a sofa', noun: 'price', pounds: true, sign: 1, amount: (v) => `a £$${v}$ delivery charge is added`, m: 0.8, multiply: 'the sale takes $20$% off', unit: 5 },
  { key: 'service', item: 'a meal', noun: 'price', pounds: true, sign: -1, amount: (v) => `a £$${v}$ money-off voucher is used`, m: 1.1, multiply: 'a $10$% service charge is added', unit: 10 },
  { key: 'booking', item: 'a hotel room', noun: 'price', pounds: true, sign: 1, amount: (v) => `a £$${v}$ booking fee is added`, m: 1.2, multiply: 'tax at $20$% is added', unit: 5 },
  { key: 'trade-in', item: 'a bike', noun: 'price', pounds: true, sign: -1, amount: (v) => `a £$${v}$ trade-in comes off`, m: 0.75, multiply: 'the sale takes $25$% off', unit: 4 },
  { key: 'bonus', item: 'a weekly wage', noun: 'wage', pounds: true, sign: 1, amount: (v) => `a £$${v}$ bonus is added`, m: 1.1, multiply: 'a $10$% pay rise is applied', unit: 10 },
  { key: 'points', item: 'a points total', noun: 'total', pounds: false, sign: 1, amount: (v) => `$${v}$ bonus points are added`, m: 2, multiply: 'the total is doubled', unit: 1 },
];

interface PriceParams {
  c: number;
  p: number;
  v: number;
  /** The fixed change is `f`, and the multiplier `g`; swapped when true. */
  swap: boolean;
  /** The fixed change is made first. */
  amountFirst: boolean;
  hard: boolean;
}

/** The fixed change, the multiplier, and each as TeX rules. */
function priceParts({ c, v, swap }: PriceParams) {
  const setting = PRICES[c];
  const shift = (x: number) => x + setting.sign * v;
  const scale = (x: number) => Math.round(x * setting.m * 100) / 100;
  const shiftTex = `x ${setting.sign > 0 ? '+' : '-'} ${v}`;
  const scaleTex = `${setting.m}x`;
  const [fTex, gTex] = swap ? [scaleTex, shiftTex] : [shiftTex, scaleTex];
  const [fName, gName] = swap ? ['g', 'f'] : ['f', 'g'];
  return { setting, shift, scale, shiftTex, scaleTex, fTex, gTex, shiftName: fName, scaleName: gName };
}

function pricePrompt(params: PriceParams): Block[] {
  const { setting, fTex, gTex } = priceParts(params);
  const start =
    setting.noun === 'price' ? `The price of ${setting.item}` : `${setting.item[0].toUpperCase()}${setting.item.slice(1)}`;
  return [
    {
      kind: 'prose',
      text: `${start} is ${setting.pounds ? '£' : ''}$${params.p}$ before two changes: ${setting.amount(params.v)}, and ${setting.multiply}. As functions of the ${setting.noun} $x$:`,
    },
    { kind: 'display', tex: pairTex(fTex, gTex) },
  ];
}

/** The composite the order fixes: `gf`, with the first change nearest the x. */
function priceName(params: PriceParams, amountFirst = params.amountFirst): string {
  const { shiftName, scaleName } = priceParts(params);
  return amountFirst ? `${scaleName}${shiftName}` : `${shiftName}${scaleName}`;
}

function priceOrderWords(params: PriceParams, amountFirst = params.amountFirst): string {
  const { setting } = priceParts(params);
  const first = amountFirst ? setting.amount(params.v) : setting.multiply;
  const second = amountFirst ? setting.multiply : setting.amount(params.v);
  return `${first} first, then ${second}`;
}

/** The price after both changes, in either order. */
function priceAfter(params: PriceParams, amountFirst = params.amountFirst): [number, number] {
  const { shift, scale } = priceParts(params);
  return amountFirst ? [shift(params.p), scale(shift(params.p))] : [scale(params.p), shift(scale(params.p))];
}

function samplePrice(rng: Rng, difficulty: number): PriceParams {
  const hard = difficulty > 1;
  const c = rng.int(0, PRICES.length - 1);
  const { unit, sign } = PRICES[c];
  const v = unit * rng.int(1, unit === 1 ? 50 : unit === 10 ? 3 : 6);
  const p = unit * rng.int(unit === 1 ? 20 : 6, unit === 1 ? 300 : unit === 10 ? 30 : 40);
  return { c, p: sign < 0 ? Math.max(p, 2 * v) : p, v, swap: hard && rng.chance(0.5), amountFirst: rng.chance(0.5), hard };
}

/**
 * A price through two changes, a stage at a time.
 *
 * Difficulty 1 makes the changes in the order the question names.
 * Difficulty 2 makes them both ways round and asks the difference, which is
 * never zero: a fixed amount and a percentage do not commute, and the gap
 * is the percentage of the fixed amount.
 */
const priceTree: Generator<PriceParams> = {
  id: 'fun-price-tree',
  sample: (rng, difficulty) => samplePrice(rng, difficulty),
  render: (params): Slide => {
    const { hard } = params;
    const [a1, a2] = priceAfter(params, true);
    const [b1, b2] = priceAfter(params, false);
    const prompt = pricePrompt(params);
    if (!hard) {
      const [first, second] = priceAfter(params);
      const answer = [`${first}`, `${second}`];
      prompt.push({ kind: 'prose', text: `The changes are made in this order: ${priceOrderWords(params)}. Fill in the ${PRICES[params.c].noun} after each change.` });
      return {
        kind: 'tree',
        prompt,
        expression: `${priceName(params)}(${params.p})`,
        nodes: [
          { id: 'first', from: [] },
          { id: 'second', from: ['first'] },
        ],
        bank: treeBank(answer, [params.amountFirst ? b2 : a2, params.amountFirst ? b1 : a1], second),
        answer,
      };
    }
    const gap = Math.round(Math.abs(a2 - b2) * 100) / 100;
    const answer = [`${a1}`, `${a2}`, `${b1}`, `${b2}`, `${gap}`];
    prompt.push({
      kind: 'prose',
      text: `Work out both orders — ${priceOrderWords(params, true)}; and ${priceOrderWords(params, false)} — and how far apart the two ${PRICES[params.c].noun}s are.`,
    });
    return {
      kind: 'tree',
      prompt,
      expression: `${priceName(params, true)}(${params.p}) \\text{ and } ${priceName(params, false)}(${params.p})`,
      nodes: [
        { id: 'a1', from: [] },
        { id: 'a2', from: ['a1'] },
        { id: 'b1', from: [] },
        { id: 'b2', from: ['b1'] },
        { id: 'gap', from: ['a2', 'b2'] },
      ],
      bank: treeBank(answer, [params.v, a2 + b2], gap),
      answer,
    };
  },
  solution: (params) => {
    const { shiftName, scaleName } = priceParts(params);
    const line = (amountFirst: boolean) => {
      const [first, second] = priceAfter(params, amountFirst);
      const name = priceName(params, amountFirst);
      const inner = amountFirst ? shiftName : scaleName;
      const outer = amountFirst ? scaleName : shiftName;
      return `\\begin{aligned} ${name}(${params.p}) &= ${outer}(${inner}(${params.p})) \\\\ &= ${outer}(${first}) = ${second} \\end{aligned}`;
    };
    if (!params.hard) {
      return [
        { text: `The change made first is the one nearest the $x$. Here ${priceOrderWords(params)}, so the composite is $${priceName(params)}$.` },
        { tex: line(params.amountFirst) },
      ];
    }
    const [, a2] = priceAfter(params, true);
    const [, b2] = priceAfter(params, false);
    return [
      { tex: line(true) },
      { tex: line(false) },
      { text: `The two orders differ by $${Math.round(Math.abs(a2 - b2) * 100) / 100}$: the percentage change acts on the fixed amount in one order and not in the other.` },
    ];
  },
};

/** A composite's rule written out: `1.2(x - 10)` or `1.2x - 10`. */
function compositeRuleTex(params: PriceParams, amountFirst: boolean, flipped = false): string {
  const { setting } = priceParts(params);
  const sign = (setting.sign > 0) !== flipped ? '+' : '-';
  return amountFirst ? `${setting.m}(x ${sign} ${params.v})` : `${setting.m}x ${sign} ${params.v}`;
}

/**
 * Which composite the story fixes, with its rule.
 *
 * The four options pair each name, $fg$ and $gf$, with each rule, so the
 * learner has to get both the order of the letters and the algebra right.
 * Difficulty 2 swaps which of the two changes is called $f$, so the answer
 * is not always $gf$ for "the fixed amount first".
 */
const orderChoice: Generator<PriceParams> = {
  id: 'fun-order-choice',
  sample: (rng, difficulty) => samplePrice(rng, difficulty),
  render: (params): Slide => {
    const right = priceName(params);
    const wrong = priceName(params, !params.amountFirst);
    const rule = compositeRuleTex(params, params.amountFirst);
    const other = compositeRuleTex(params, !params.amountFirst);
    return {
      kind: 'choice',
      prompt: [...pricePrompt(params), { kind: 'prose', text: `The changes are made in this order: ${priceOrderWords(params)}. Which function gives the final ${PRICES[params.c].noun}?` }],
      ...fixedChoice(
        [`${right}(x) = ${rule}`, `${right}(x) = ${other}`, `${wrong}(x) = ${rule}`, `${wrong}(x) = ${other}`].map((label) => ({ label, tex: true })),
      ),
    };
  },
  solution: (params) => {
    const { shiftName, scaleName, shiftTex, scaleTex } = priceParts(params);
    const first = params.amountFirst ? shiftName : scaleName;
    const name = priceName(params);
    return [
      { text: `The change made first acts on $x$ first, so its letter sits nearest the $x$: $${name}(x) = ${name[0]}(${first}(x))$.` },
      { text: `Write $${params.amountFirst ? shiftTex : scaleTex}$ in place of $x$ in $${params.amountFirst ? scaleTex : shiftTex}$:` },
      { tex: `${name}(x) = ${compositeRuleTex(params, params.amountFirst)}` },
    ];
  },
};

/**
 * The final price as one number, by the composite.
 *
 * Difficulty 1 names the composite, and the learner applies the letter
 * nearest the $x$ first. Difficulty 2 names only the order in words.
 */
const priceValue: Generator<PriceParams> = {
  id: 'fun-price-value',
  choices: (params) => {
    const [, right] = priceAfter(params);
    const [, other] = priceAfter(params, !params.amountFirst);
    return numberChoices(right, other, params.p + priceParts(params).setting.sign * params.v, Math.round(params.p * priceParts(params).setting.m));
  },
  sample: (rng, difficulty) => samplePrice(rng, difficulty),
  render: (params): Slide => {
    const [, right] = priceAfter(params);
    const name = priceName(params);
    const { noun, pounds } = PRICES[params.c];
    const ask = params.hard
      ? `The changes are made in this order: ${priceOrderWords(params)}. What is the final ${noun}${pounds ? ', in pounds' : ''}?`
      : `Find $${name}(${params.p})$, the final ${noun}${pounds ? ' in pounds' : ''}.`;
    return {
      kind: 'expression',
      prompt: [...pricePrompt(params), { kind: 'prose', text: ask }],
      lead: params.hard ? `\\text{${noun}} =` : `${name}(${params.p}) =`,
      keypad: [],
      answer: `${right}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const [first, second] = priceAfter(params);
    const name = priceName(params);
    return [
      { text: `${params.hard ? `${priceOrderWords(params)[0].toUpperCase()}${priceOrderWords(params).slice(1)}, so the composite is $${name}$. ` : ''}In $${name}(${params.p})$ the letter nearest the ${PRICES[params.c].noun} acts first.` },
      { tex: `${name}(${params.p}) = ${name[0]}(${first}) = ${second}` },
    ];
  },
};

/**
 * The composite built from tiles: which letter goes on the outside, which
 * inside, and the rule that results.
 *
 * `{0}{1}(x)` takes the two letters in reading order — outer then inner —
 * so a learner who writes them in the order the changes are made has them
 * backwards.
 */
const compositeTiles: Generator<PriceParams> = {
  id: 'fun-composite-tiles',
  sample: (rng, difficulty) => samplePrice(rng, difficulty),
  render: (params): Slide => {
    const name = priceName(params);
    const answer = [name[0], name[1], compositeRuleTex(params, params.amountFirst)];
    return {
      kind: 'tiles',
      prompt: [...pricePrompt(params), { kind: 'prose', text: `The changes are made in this order: ${priceOrderWords(params)}. Build the function that gives the final ${PRICES[params.c].noun}.` }],
      template: '{0}{1}(x) = {2}',
      // Never the expanded form of the right rule: it is equal, so marking it
      // wrong would be unfair. The other order, and the fixed amount's sign
      // turned, are genuinely different functions.
      bank: bankOf(answer, [compositeRuleTex(params, !params.amountFirst), compositeRuleTex(params, params.amountFirst, true)]),
      answer,
    };
  },
  solution: (params) => {
    const name = priceName(params);
    return [
      { text: `The change made first goes nearest the $x$, so the function is $${name}(x) = ${name[0]}(${name[1]}(x))$.` },
      { tex: `${name}(x) = ${compositeRuleTex(params, params.amountFirst)}` },
    ];
  },
};

export const functionGenerators = [
  evaluate,
  substitute,
  solve,
  machineTree,
  domainFlow,
  domain,
  rangeSlider,
  rangeTiles,
  compositeValue,
  compositeForm,
  compositeOrder,
  chainTree,
  inverseSteps,
  inverseForm,
  inverseValue,
  undoTree,
  mappingFlow,
  mapping,
  inversePoint,
  inverseMeet,
  shiftWordsGenerator,
  shiftPoint,
  stretchWordsGenerator,
  stretchPoint,
  reflectWords,
  reflectPoint,
  combineOrder,
  combinePoint,
  describeForm,
  describeWords,
  yIntercept,
  rootSlider,
  intercepts,
  graphRule,
  asymptoteSlider,
  asymptoteTiles,
  asymptoteFlow,
  findK,
  endChoice,
  limitTiles,
  leadingFlow,
  divideSteps,
  meetCount,
  meetFlow,
  meetSolve,
  meetTiles,
  sketchRule,
  featuresTree,
  evenValue,
  evenPick,
  evenFlow,
  negXTiles,
  oddSumTree,
  parityFlow,
  oddTiles,
  negXSteps,
  parityChoice,
  parityK,
  splitTree,
  periodSlider,
  periodValue,
  periodChoice,
  repeatFlow,
  pieceValue,
  joinTree,
  pieceChoice,
  pieceTiles,
  waveExtremes,
  ampSlider,
  ampTiles,
  ampFlow,
  xStretchChoice,
  periodTree,
  bFromGraph,
  phaseChoice,
  phaseSteps,
  phaseSlider,
  phaseFlow,
  waveRead,
  waveParts,
  graphShift,
  waveChoice,
  movesTiles,
  movesChoice,
  modelFamily,
  familyFlow,
  familyNext,
  familySketch,
  modelRule,
  modelValue,
  modelMeaning,
  ruleMachine,
  modelDomain,
  senseFlow,
  domainLine,
  modelRange,
  modelInverse,
  convertTable,
  inverseTiles,
  noInverseFlow,
  priceTree,
  orderChoice,
  priceValue,
  compositeTiles,
];
