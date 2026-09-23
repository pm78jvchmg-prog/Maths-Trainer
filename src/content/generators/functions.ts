/**
 * Functions: notation, domain and range, composition and inverses.
 *
 * Roadmap batch C2, the first level of the Functions & Transformations course.
 * The second level moves graphs about with the `transform` widget; its
 * generators that ask for a curve live in `transformGraph.ts` beside the
 * widget's own demonstrations, and the ones asked through other widgets are
 * at the bottom of this file.
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
import type { ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { markerWindow, plotSvg } from '../figures';
import { options } from '../choiceVariant';
import { bankFor, bin, num, pow, type Expr } from '../expr';
import { sumTex, termTex } from './calculus';
import { bankOf, numberTile, offer, signedTile } from './quadratics';

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
      recip: 'Each output of $\\frac{1}{x - a}$ comes from exactly one input.',
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
    const where =
      form === 'point'
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
      { text: `When $x$ is ${big}, the numbers added on hardly matter: $\\frac{${linTex(a, b)}}{${shiftedX(h)}}$ is nearly $\\frac{${a}x}{x} = ${a}$.` },
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
        { tex: `\\frac{${top}}{${bottom}} \\approx \\frac{${a}${power}}{${c}${power}} = ${a / c}` },
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
];
