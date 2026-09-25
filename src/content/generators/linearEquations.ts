/**
 * Linear equations and simultaneous linear equations.
 *
 * Roadmap batch C1, the first two levels of a new concept. Level 1 solves one
 * equation in one unknown: undoing in reverse order, unknowns on both sides,
 * brackets, fractions, and equations built from words. Level 2 solves two
 * equations in two unknowns: what a solution pair is, elimination with and
 * without scaling, substitution, and pairs of equations from words. Level 3
 * rearranges formulae: any letter made the subject, through brackets and
 * fractions, a subject on both sides, and squares and roots.
 *
 * Batch C1-l4 adds level 4, linear inequalities, at the end of the file: one
 * inequality solved and drawn on a number line, the sign turning round on a
 * negative, double inequalities, the integers inside a solution set, and a
 * region of the plane bounded by one straight line.
 *
 * **Every equation is built outward from a whole solution.** A generator
 * draws the answer first and works the question out from it, so every
 * intermediate value a learner meets on the way — the right-hand side after a
 * subtraction, the number left once a letter is eliminated — is whole too. A
 * lesson about undoing operations should not turn into a lesson about
 * fractions halfway through a question.
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
import { bankFor, bin, num, type Expr } from '../expr';
import { ALGEBRA_KEYS, sumTex, termTex } from './calculus';
import { bankOf, numberTile, offer, signedTile } from './quadratics';
import { windowFor } from './numberLine';
import { coeffTex, gcd } from './format';

/* ---------- Formatting ---------- */

/** ax + b as the learner reads it: `3x + 4`, `-x - 2`, `5x`, `7`. */
function linTex(a: number, b: number): string {
  const tex = sumTex([termTex(a, 1), termTex(b, 0)]);
  return tex === '' ? '0' : tex;
}

/** A y term with its coefficient: `3y`, `-y`, `y`. */
function yTerm(b: number): string {
  if (b === 1) return 'y';
  if (b === -1) return '-y';
  return `${b}y`;
}

/** ax + by as the learner reads it. */
function pairTex(a: number, b: number): string {
  return `${termTex(a, 1)} ${signedTile(b, 'y')}`;
}

/** A number bracketed when negative, for a substitution written out. */
function br(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** a(x + b), written the way it appears on the page. */
function bracketTex(a: number, b: number): string {
  return coeffTex(a, `(x ${signedTile(b)})`);
}

/** Two equations stacked and numbered, so the prose can say "(1)" and "(2)". */
function systemTex(first: string, second: string): string {
  return `\\begin{aligned} ${first.replace(' = ', ' &= ')} & \\quad (1) \\\\ ${second.replace(' = ', ' &= ')} & \\quad (2) \\end{aligned}`;
}

/** A point, as the learner reads it. */
function pointTex(x: number, y: number): string {
  return `(${x}, ${y})`;
}

/**
 * The last line of a solve: `3x = 12 \implies x = 4`. With a coefficient of 1
 * the implication would only repeat the line, `x = 4 \implies x = 4`, so the
 * line stops at the value.
 */
function solvedTex(lhs: string, rhs: number, letter: string, value: number): string {
  return lhs === letter ? `${letter} = ${value}` : `${lhs} = ${rhs} \\implies ${letter} = ${value}`;
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

/** Four labelled options that are not expressions, the first one correct. */
function labelChoices(correct: string, ...wrong: string[]): ChoiceOption[] {
  return options({ tex: correct }, ...wrong.map((tex) => ({ tex })));
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

/** A bank for every operator node of a reduce tree, keyed by its path. */
function banksFor(expr: Expr, path = 'r', out: Record<string, string[]> = {}): Record<string, string[]> {
  if (expr.kind !== 'binary') return out;
  out[path] = bankFor(expr);
  banksFor(expr.left, `${path}.l`, out);
  banksFor(expr.right, `${path}.r`, out);
  return out;
}

/** a times k, plus or minus a positive number: `3 x 5 + 4`, `3 x 5 - 4`. */
function productPlus(a: number, k: number, b: number): Expr {
  const product = bin('*', num(a), num(k));
  return b < 0 ? bin('-', product, num(-b)) : bin('+', product, num(b));
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

/* ======================================================================
 * Level 1: Solving Linear Equations
 * ==================================================================== */

/* ---------- Lesson 1: one and two steps ---------- */

interface OneStepParams {
  form: 'add' | 'sub' | 'mul' | 'div';
  a: number;
  x: number;
}

function oneStepTex({ form, a, x }: OneStepParams): string {
  if (form === 'add') return `x + ${a} = ${x + a}`;
  if (form === 'sub') return `x - ${a} = ${x - a}`;
  if (form === 'mul') return `${termTex(a, 1)} = ${a * x}`;
  return `\\frac{x}{${a}} = ${x / a}`;
}

/**
 * One operation between $x$ and the answer, undone once.
 *
 * The first idea of the level in its smallest form: whatever is done to $x$,
 * do the opposite to both sides. The division form is built from its quotient
 * so the right-hand side is always whole.
 */
const oneStep: Generator<OneStepParams> = {
  id: 'lin-one-step',
  choices: (params) => {
    const { form, a, x } = params;
    if (form === 'add') return numberChoices(x, x + 2 * a, -x, x + a);
    if (form === 'sub') return numberChoices(x, x - 2 * a, -x, x - a);
    if (form === 'mul') return numberChoices(x, a * a * x, a * x - a, -x);
    return numberChoices(x, x / a / a, x / a + a, -x);
  },
  sample: (rng, difficulty) => {
    const form = rng.pick(['add', 'sub', 'mul', 'div'] as const);
    const hard = difficulty > 1;
    if (form === 'mul') {
      return { form, a: rng.pick(hard ? [-9, -7, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9] : range(2, 9)), x: hard ? rng.pick(nonZeroRange(-12, 12)) : rng.int(1, 12) };
    }
    if (form === 'div') {
      const a = rng.int(2, hard ? 9 : 6);
      return { form, a, x: a * (hard ? rng.pick(nonZeroRange(-9, 9)) : rng.int(1, 9)) };
    }
    return { form, a: rng.int(1, hard ? 25 : 15), x: hard ? rng.int(-15, 20) : rng.int(1, 20) };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$. Do the opposite of what is being done to $x$, to both sides.' },
      { kind: 'display', tex: oneStepTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.x}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { form, a, x } = params;
    const undo =
      form === 'add'
        ? `$${a}$ is added to $x$, so take $${a}$ from both sides.`
        : form === 'sub'
          ? `$${a}$ is taken from $x$, so add $${a}$ to both sides.`
          : form === 'mul'
            ? `$x$ is multiplied by $${a}$, so divide both sides by $${a}$.`
            : `$x$ is divided by $${a}$, so multiply both sides by $${a}$.`;
    return [
      { tex: oneStepTex(params) },
      { text: undo },
      { tex: `x = ${x}` },
      { text: `Check it: put $x = ${x}$ back into the left-hand side and it gives the right-hand side.` },
    ];
  },
};

interface TwoStepParams {
  form: 'mul' | 'div';
  a: number;
  b: number;
  x: number;
}

/** The left-hand side of a two-step equation, before anything is undone. */
function twoStepFront({ form, a }: TwoStepParams): string {
  return form === 'mul' ? termTex(a, 1) : `\\frac{x}{${a}}`;
}

function twoStepRight({ form, a, b, x }: TwoStepParams): number {
  return (form === 'mul' ? a * x : x / a) + b;
}

function twoStepTex(params: TwoStepParams): string {
  return `${twoStepFront(params)} ${signedTile(params.b)} = ${twoStepRight(params)}`;
}

function sampleTwoStep(rng: Rng, difficulty: number): TwoStepParams {
  const hard = difficulty > 1;
  const form = rng.pick(['mul', 'mul', 'div'] as const);
  const a = rng.int(2, hard ? 12 : 9);
  const b = rng.pick(nonZeroRange(hard ? -20 : -12, hard ? 20 : 12));
  const k = hard ? rng.pick(nonZeroRange(-10, 12)) : rng.int(1, 10);
  return { form, a, b, x: form === 'mul' ? k : a * k };
}

function twoStepSolution(params: TwoStepParams): SolutionStep[] {
  const { form, a, b, x } = params;
  const c = twoStepRight(params);
  const middle = c - b;
  return [
    {
      text: `Read the left-hand side as a recipe: $x$ was ${form === 'mul' ? `multiplied by $${a}$` : `divided by $${a}$`}, then $${Math.abs(b)}$ was ${b > 0 ? 'added' : 'taken away'}. Undo them in the reverse order.`,
    },
    { text: `First ${b > 0 ? `take $${b}$ from` : `add $${-b}$ to`} both sides.` },
    { tex: `${twoStepFront(params)} = ${middle}` },
    { text: `Then ${form === 'mul' ? `divide both sides by $${a}$` : `multiply both sides by $${a}$`}.` },
    { tex: `x = ${x}` },
  ];
}

/**
 * Two operations to undo: a multiplication or division, then a number added.
 *
 * The order is the lesson. $3x + 4 = 19$ was built by multiplying and then
 * adding, so it comes apart by taking away and then dividing — and dividing
 * first is the slip the choice form offers.
 */
const twoStep: Generator<TwoStepParams> = {
  id: 'lin-two-step',
  choices: (params) => {
    const { form, a, b, x } = params;
    const c = twoStepRight(params);
    return form === 'mul'
      ? numberChoices(x, (c + b) / a, (c - b) - a, c / a - b, -x)
      : numberChoices(x, (c + b) * a, c * a - b, x / a, -x);
  },
  sample: sampleTwoStep,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$, undoing the operations in reverse order.' },
      { kind: 'display', tex: twoStepTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.x}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: twoStepSolution,
};

/**
 * The same equation solved as a line of working, one undo per line.
 *
 * Each tap collapses the line into the next one, so the learner builds
 * $3x + 4 = 19$, then $3x = 15$, then $x = 5$ — the working a teacher wants
 * written down, with the two tempting wrong lines in each bank.
 */
const twoStepSteps: Generator<TwoStepParams> = {
  id: 'lin-two-step-steps',
  sample: sampleTwoStep,
  render: (params): Slide => {
    const { form, a, b, x } = params;
    const c = twoStepRight(params);
    const front = twoStepFront(params);
    const middle = c - b;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Solve one undo at a time. ${HOW_TO_STEP}`,
        },
      ],
      start: [front, `{} ${signedTile(b)}`, '=', `${c}`],
      reductions: [
        {
          span: [0, 4],
          operator: 1,
          value: `${front} = ${middle}`,
          bank: stepBank(`${front} = ${middle}`, `${front} = ${c + b}`, `${front} = ${-middle}`, `x = ${middle}`),
        },
        {
          span: [0, 1],
          value: `x = ${x}`,
          bank:
            form === 'mul'
              ? stepBank(`x = ${x}`, `x = ${middle - a}`, `x = ${middle * a}`, `x = ${-x}`)
              : stepBank(`x = ${x}`, `x = ${middle + a}`, `x = ${middle - a}`, `x = ${-x}`),
        },
      ],
    };
  },
  solution: twoStepSolution,
};

type UndoForm = 'mul-add' | 'div-add' | 'add' | 'mul' | 'bracket' | 'over';

interface UndoParams {
  form: UndoForm;
  a: number;
  b: number;
  x: number;
}

function undoTex({ form, a, b, x }: UndoParams): string {
  if (form === 'mul-add') return `${termTex(a, 1)} ${signedTile(b)} = ${a * x + b}`;
  if (form === 'div-add') return `\\frac{x}{${a}} ${signedTile(b)} = ${x / a + b}`;
  if (form === 'add') return `x ${signedTile(b)} = ${x + b}`;
  if (form === 'mul') return `${termTex(a, 1)} = ${a * x}`;
  if (form === 'bracket') return `${bracketTex(a, b)} = ${a * (x + b)}`;
  return `\\frac{x ${signedTile(b)}}{${a}} = ${(x + b) / a}`;
}

const UNDO_ADDING = 'Adding or subtracting a number';
const UNDO_TIMES = 'Multiplying or dividing';
const UNDO_YES = 'Yes';
const UNDO_NO = 'No';

/**
 * Which operation comes off first?
 *
 * The left-hand side is a recipe for $x$, and the operation done **last** is
 * the first to undo. Asked as a walk because it is a reading question — which
 * operation is outermost — and a bracket or a fraction bar can make the last
 * operation a multiplication even when a number is added inside it.
 * Difficulty 2 adds those two forms.
 */
const undoFlow: Generator<UndoParams> = {
  id: 'lin-undo-flow',
  sample: (rng, difficulty) => {
    const form = rng.pick(
      difficulty > 1
        ? (['mul-add', 'div-add', 'bracket', 'over', 'bracket', 'over'] as const)
        : (['mul-add', 'div-add', 'add', 'mul', 'mul-add', 'div-add'] as const),
    );
    const a = rng.int(2, 9);
    const b = rng.pick(nonZeroRange(-12, 12));
    const k = rng.pick(nonZeroRange(-6, 12));
    if (form === 'div-add') return { form, a, b, x: a * k };
    // (x + b)/a has to come out whole, so x + b is the multiple of a.
    if (form === 'over') return { form, a, b, x: a * k - b };
    return { form, a, b, x: k };
  },
  render: (params): Slide => {
    const { form } = params;
    const lastIsAdding = form === 'mul-add' || form === 'div-add' || form === 'add';
    const twoSteps = form !== 'add' && form !== 'mul';
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Before solving: in what order do the operations come off? Read the left-hand side as a recipe that starts with $x$.',
        },
      ],
      subject: undoTex(params),
      steps: [
        {
          id: 'last',
          ask: 'What was done to $x$ **last**?',
          branches: [
            { label: UNDO_ADDING, to: 'after-adding' },
            { label: UNDO_TIMES, to: 'after-times' },
          ],
        },
        {
          id: 'after-adding',
          ask: 'Undo that first. Once it is gone, is $x$ still multiplied or divided by something?',
          branches: [
            { label: UNDO_YES, outcome: 'Two steps: undo the adding or subtracting, then the multiplying or dividing.' },
            { label: UNDO_NO, outcome: 'One step: undo the adding or subtracting and $x$ is alone.' },
          ],
        },
        {
          id: 'after-times',
          ask: 'Undo that first. Once it is gone, is a number still added to or taken from $x$?',
          branches: [
            { label: UNDO_YES, outcome: 'Two steps: undo the multiplying or dividing, then the adding or subtracting.' },
            { label: UNDO_NO, outcome: 'One step: undo the multiplying or dividing and $x$ is alone.' },
          ],
        },
      ],
      answer: [lastIsAdding ? UNDO_ADDING : UNDO_TIMES, twoSteps ? UNDO_YES : UNDO_NO],
    };
  },
  solution: (params) => {
    const { form, a, b, x } = params;
    const add = b > 0 ? `add $${b}$` : `take away $${-b}$`;
    const unAdd = b > 0 ? `take $${b}$ from both sides` : `add $${-b}$ to both sides`;
    const recipe: Record<UndoForm, [string, string]> = {
      'mul-add': [`multiply by $${a}$, then ${add}`, `${unAdd}, then divide by $${a}$`],
      'div-add': [`divide by $${a}$, then ${add}`, `${unAdd}, then multiply by $${a}$`],
      add: [add, unAdd],
      mul: [`multiply by $${a}$`, `divide both sides by $${a}$`],
      bracket: [`${add}, then multiply by $${a}$`, `divide both sides by $${a}$, then ${unAdd}`],
      over: [`${add}, then divide the whole top by $${a}$`, `multiply both sides by $${a}$, then ${unAdd}`],
    };
    const [built, undone] = recipe[form];
    return [
      { tex: undoTex(params) },
      { text: `Starting from $x$, the left-hand side says: ${built}.` },
      { text: `Undo in the reverse order: ${undone}.` },
      { tex: `x = ${x}` },
    ];
  },
};

interface GraphParams {
  a: number;
  b: number;
  x: number;
}

/**
 * Solving an equation as reading a graph.
 *
 * $3x + 4 = 19$ asks where the line $y = 3x + 4$ reaches the height $19$.
 * The window is fixed from $-6$ to $6$ so where the crossing sits is the
 * answer and not a property of the frame, and the answer is never zero,
 * where an untouched slider rests.
 */
const graphSlider: Generator<GraphParams> = {
  id: 'lin-graph-slider',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { a: rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]), b: rng.int(-6, 6), x: rng.pick(nonZeroRange(-5, 5)) }
      : { a: rng.int(1, 4), b: rng.int(-6, 6), x: rng.int(1, 5) },
  render: ({ a, b, x }): Slide => {
    const c = a * x + b;
    const ends = [a * -6 + b, a * 6 + b, c, 0];
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The line $y = ${linTex(a, b)}$ reaches the dashed height $y = ${c}$ at one point. Slide to the $x$ there: that $x$ solves $${linTex(a, b)} = ${c}$.`,
        },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: x,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -6,
          xMax: 6,
          yMin: Math.min(...ends) - 2,
          yMax: Math.max(...ends) + 2,
          curves: [{ f: (t: number) => a * t + b }],
          horizontals: [c],
          verticals: [{ x: 0, dashed: false }],
          label: 'A straight line crossing a dashed horizontal line',
        }),
        ...markerWindow(-6, 6),
      },
    };
  },
  solution: ({ a, b, x }) => [
    { text: 'The crossing is where the line is exactly as high as the dashed line, so solve the equation.' },
    { tex: `${linTex(a, b)} = ${a * x + b}` },
    { tex: `${termTex(a, 1)} = ${a * x}` },
    { tex: `x = ${x}` },
    { text: `Check on the graph: at $x = ${x}$ the line is at $${a} \\times ${br(x)} ${signedTile(b)} = ${a * x + b}$.` },
  ],
};

interface CheckParams {
  form: 'plus' | 'bracket';
  a: number;
  b: number;
  k: number;
  /** Whether the equation shown is really solved by k. */
  ok: boolean;
  miss: number;
}

function checkValue({ form, a, b, k }: CheckParams): number {
  return form === 'plus' ? a * k + b : a * (k + b);
}

function checkLeftTex({ form, a, b }: CheckParams): string {
  return form === 'plus' ? linTex(a, b) : bracketTex(a, b);
}

/**
 * Checking a solution by putting it back in.
 *
 * The habit that catches every slip in this level, asked as a reduction: the
 * left-hand side with the proposed $x$ in place. Half the time the equation
 * shown really is solved by it and half the time it is off by a little, so the
 * last line of the working is a verdict and not only a number. Difficulty 2
 * brings brackets and negative values.
 */
const checkSolution: Generator<CheckParams> = {
  id: 'lin-check',
  choices: (params) => {
    const { form, a, b, k } = params;
    const v = checkValue(params);
    return form === 'plus'
      ? numberChoices(v, a * k - b, a + k + b, -v)
      : numberChoices(v, a * k + b, a * (k - b), -v);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      form: hard ? rng.pick(['plus', 'bracket', 'bracket'] as const) : 'plus',
      a: rng.int(2, 9),
      b: rng.pick(nonZeroRange(-9, 12)),
      k: hard ? rng.pick(nonZeroRange(-6, 9)) : rng.int(1, 9),
      ok: rng.chance(0.5),
      miss: rng.pick([-3, -2, -1, 1, 2, 3]),
    };
  },
  render: (params): Slide => {
    const { form, a, b, k, ok, miss } = params;
    const v = checkValue(params);
    const expr = form === 'plus' ? productPlus(a, k, b) : bin('*', num(a), b < 0 ? bin('-', num(k), num(-b)) : bin('+', num(k), num(b)));
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `Is $x = ${k}$ a solution of $${checkLeftTex(params)} = ${ok ? v : v + miss}$? Put it into the left-hand side and see what comes out. ${HOW_TO_REDUCE}`,
        },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: (params) => {
    const { form, a, b, k, ok, miss } = params;
    const v = checkValue(params);
    const shown = ok ? v : v + miss;
    return [
      { text: `Replace $x$ by $${k}$ on the left.` },
      {
        tex: form === 'plus' ? `${a} \\times ${br(k)} ${signedTile(b)}` : `${a} \\times (${k} ${signedTile(b)})`,
      },
      { tex: form === 'plus' ? `= ${a * k} ${signedTile(b)} = ${v}` : `= ${a} \\times ${br(k + b)} = ${v}` },
      {
        text: ok
          ? `That is $${shown}$, the right-hand side, so $x = ${k}$ **is** a solution.`
          : `The right-hand side is $${shown}$, not $${v}$, so $x = ${k}$ is **not** a solution.`,
      },
    ];
  },
};

/* ---------- Lesson 2: unknowns on both sides ---------- */

interface BothParams {
  a: number;
  b: number;
  c: number;
  x: number;
}

function bothRight({ a, b, c, x }: BothParams): number {
  return (a - c) * x + b;
}

function bothTex(params: BothParams): string {
  return `${linTex(params.a, params.b)} = ${linTex(params.c, bothRight(params))}`;
}

/**
 * $ax + b = cx + d$, drawn from $x$ with $a$ and $c$ different.
 *
 * `steps` keeps $a > c$ with a gap of at least two, so collecting on the left
 * leaves a real division to do; difficulty 2 lets either side hold more $x$
 * and brings negatives in.
 */
function sampleBoth(rng: Rng, difficulty: number, forSteps = false): BothParams {
  const hard = difficulty > 1 && !forSteps;
  return drawUntil(
      () => ({
      a: hard ? rng.pick(nonZeroRange(-5, 9)) : rng.int(2, 9),
      b: rng.pick(nonZeroRange(hard ? -15 : -10, hard ? 15 : 12)),
      c: hard ? rng.pick(nonZeroRange(-5, 9)) : rng.int(1, 7),
      x: difficulty > 1 ? rng.pick(nonZeroRange(-8, 10)) : rng.int(1, 10),
    }),
    (p) => {
      const d = bothRight(p);
      if (p.a === p.c || d === p.b || d === 0) return false;
      if (forSteps || !hard) return p.a - p.c >= (forSteps ? 2 : 1);
      return true;
    },
    { a: 5, b: 3, c: 2, x: 4 },
  );
}

/** Where the x terms collect: the side with the larger coefficient. */
function bothSolution(params: BothParams): SolutionStep[] {
  const { a, b, c, x } = params;
  const d = bothRight(params);
  if (a > c) {
    return [
      { tex: bothTex(params) },
      { text: `The left has more $x$. Take $${termTex(c, 1)}$ from both sides so the $x$ terms collect there.` },
      { tex: `${linTex(a - c, b)} = ${d}` },
      { text: `Then ${b > 0 ? `take $${b}$ from` : `add $${-b}$ to`} both sides, and divide by $${a - c}$.` },
      { tex: solvedTex(termTex(a - c, 1), d - b, 'x', x) },
    ];
  }
  return [
    { tex: bothTex(params) },
    { text: `The right has more $x$. Take $${termTex(a, 1)}$ from both sides so the $x$ terms collect there.` },
    { tex: `${b} = ${linTex(c - a, d)}` },
    { text: `Then ${d > 0 ? `take $${d}$ from` : `add $${-d}$ to`} both sides, and divide by $${c - a}$.` },
    { tex: `${b - d} = ${termTex(c - a, 1)} \\implies x = ${x}` },
  ];
}

/**
 * Unknowns on both sides, solved to a number.
 *
 * Collect the $x$ terms on one side and the numbers on the other; the slips
 * the choice form offers are the sign lost as a term crosses and the $x$
 * terms added instead of subtracted.
 */
const bothSides: Generator<BothParams> = {
  id: 'lin-both-sides',
  choices: (params) => {
    const { a, b, c, x } = params;
    const d = bothRight(params);
    return numberChoices(x, -x, (d + b) / (a - c), (d - b) / (a + c), x + 1);
  },
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$. Collect the $x$ terms on one side and the numbers on the other.' },
      { kind: 'display', tex: bothTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.x}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: bothSolution,
};

/**
 * The same, as three lines of working: collect, clear the number, divide.
 */
const bothSidesSteps: Generator<BothParams> = {
  id: 'lin-both-sides-steps',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty, true),
  render: (params): Slide => {
    const { a, b, c, x } = params;
    const d = bothRight(params);
    const k = a - c;
    const collected = `${linTex(k, b)} = ${d}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Solve one line at a time: collect the $x$ terms on the left, then clear the number, then divide. ${HOW_TO_STEP}`,
        },
      ],
      start: [termTex(a, 1), `{} ${signedTile(b)}`, '=', termTex(c, 1), `{} ${signedTile(d)}`],
      reductions: [
        {
          span: [0, 5],
          operator: 3,
          value: collected,
          bank: stepBank(collected, `${linTex(a + c, b)} = ${d}`, `${linTex(k, b)} = ${-d}`, `${linTex(k, -b)} = ${d}`),
        },
        {
          span: [0, 1],
          value: `${termTex(k, 1)} = ${d - b}`,
          bank: stepBank(`${termTex(k, 1)} = ${d - b}`, `${termTex(k, 1)} = ${d + b}`, `${termTex(k, 1)} = ${b - d}`),
        },
        {
          span: [0, 1],
          value: `x = ${x}`,
          bank: stepBank(`x = ${x}`, `x = ${d - b - k}`, `x = ${(d - b) * k}`, `x = ${-x}`),
        },
      ],
    };
  },
  solution: bothSolution,
};

/**
 * Collecting the terms, placed as tiles.
 *
 * The form is the answer here — the number of $x$ left on one side and the
 * number on the other — so it is asked as tiles, with the added-instead and
 * sign-lost versions in the bank. At difficulty 2 the right-hand side may hold
 * more $x$, and the terms collect there instead.
 */
const collectTiles: Generator<BothParams> = {
  id: 'lin-collect-tiles',
  choices: (params) => {
    const { a, b, c } = params;
    const d = bothRight(params);
    const added = termTex(a + c !== 0 ? a + c : Math.abs(a - c) + 1, 1);
    if (a > c) {
      const k = termTex(a - c, 1);
      return labelChoices(`${k} = ${d - b}`, `${added} = ${d - b}`, `${k} = ${d + b}`, `${k} = ${b - d}`);
    }
    const k = termTex(c - a, 1);
    return labelChoices(`${b - d} = ${k}`, `${b - d} = ${added}`, `${b + d} = ${k}`, `${d - b} = ${k}`);
  },
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { a, b, c } = params;
    const d = bothRight(params);
    const left = a > c;
    const k = left ? a - c : c - a;
    const answer = left ? [termTex(k, 1), `${d - b}`] : [`${b - d}`, termTex(k, 1)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Collect the $x$ terms on the side that has **more** $x$, and the numbers on the other side.',
        },
        { kind: 'display', tex: bothTex(params) },
      ],
      template: '{0} = {1}',
      bank: bankOf(answer, [termTex(a + c !== 0 ? a + c : k + 1, 1), termTex(-k, 1), `${d + b}`, `${d - b}`, `${b - d}`]),
      answer,
    };
  },
  solution: bothSolution,
};

type CollectCase = 'left' | 'right' | 'one';

interface CollectFlowParams extends BothParams {
  kind: CollectCase;
}

const COLLECT_BOTH = 'Yes';
const COLLECT_ONE = 'No, only one side';
const COLLECT_LEFT = 'The left';
const COLLECT_RIGHT = 'The right';

/**
 * Where do the $x$ terms go?
 *
 * The side with the larger coefficient, so the $x$ that is left over is
 * positive. With negatives that is not always the side with the bigger
 * number in front of it: $-2x$ is less $x$ than $3x$. One case in three has
 * $x$ on one side only, where the answer is the previous lesson.
 */
const collectFlow: Generator<CollectFlowParams> = {
  id: 'lin-collect-flow',
  sample: (rng, difficulty) => {
    const kind = rng.pick(['left', 'right', 'one'] as const);
    const hard = difficulty > 1;
    if (kind === 'one') {
      return { kind, a: rng.int(2, 9), b: rng.pick(nonZeroRange(-12, 12)), c: 0, x: rng.pick(nonZeroRange(-5, 10)) };
    }
    const params = drawUntil(
      () => ({
        a: rng.pick(hard ? nonZeroRange(-6, 9) : range(1, 9)),
        b: rng.pick(nonZeroRange(-12, 12)),
        c: rng.pick(hard ? nonZeroRange(-6, 9) : range(1, 9)),
        x: rng.pick(nonZeroRange(-5, 10)),
      }),
      (p) => (kind === 'left' ? p.a > p.c : p.c > p.a) && bothRight(p) !== 0 && bothRight(p) !== p.b,
      kind === 'left' ? { a: 5, b: 2, c: 2, x: 3 } : { a: 2, b: 9, c: 5, x: 3 },
    );
    return { ...params, kind };
  },
  render: (params): Slide => ({
    kind: 'flow',
    prompt: [{ kind: 'prose', text: 'Before any algebra: where should the $x$ terms end up?' }],
    subject: params.kind === 'one' ? `${linTex(params.a, params.b)} = ${params.a * params.x + params.b}` : bothTex(params),
    steps: [
      {
        id: 'both',
        ask: 'Is there an $x$ term on **both** sides?',
        branches: [
          { label: COLLECT_BOTH, to: 'more' },
          { label: COLLECT_ONE, outcome: 'Nothing to collect: undo the operations on $x$ in reverse order.' },
        ],
      },
      {
        id: 'more',
        ask: 'Which side has **more** $x$, counting signs?',
        branches: [
          { label: COLLECT_LEFT, outcome: 'Take the other side\'s $x$ term from both sides, so the $x$ terms collect on the left with a positive coefficient.' },
          { label: COLLECT_RIGHT, outcome: 'Take the left\'s $x$ term from both sides, so the $x$ terms collect on the right with a positive coefficient.' },
        ],
      },
    ],
    answer:
      params.kind === 'one' ? [COLLECT_ONE] : [COLLECT_BOTH, params.kind === 'left' ? COLLECT_LEFT : COLLECT_RIGHT],
  }),
  solution: (params) => {
    if (params.kind === 'one') {
      const { a, b, x } = params;
      return [
        { text: 'There is $x$ on the left only, so there is nothing to collect.' },
        { tex: `${linTex(a, b)} = ${a * x + b}` },
        { text: `Undo in reverse order: ${b > 0 ? `take $${b}$ away` : `add $${-b}$`}, then divide by $${a}$, giving $x = ${x}$.` },
      ];
    }
    return bothSolution(params);
  },
};

interface MeetParams {
  a: number;
  b: number;
  c: number;
  x: number;
}

/** Two straight lines on one picture, both in the text colour. */
function twoLines(
  lines: [(t: number) => number, (t: number) => number],
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  label: string,
): string {
  return plotSvg({
    ...window,
    curves: [{ f: lines[0] }, { f: lines[1] }],
    verticals: [{ x: 0, dashed: false }],
    label,
  });
}

/**
 * Unknowns on both sides, as two lines crossing.
 *
 * Each side of $ax + b = cx + d$ is a straight line, and the equation holds
 * where they cross. The picture is fixed from $-6$ to $6$ and the answer is
 * never zero.
 */
const meetSlider: Generator<MeetParams> = {
  id: 'lin-meet-slider',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({
        a: rng.pick(difficulty > 1 ? nonZeroRange(-3, 3) : range(1, 4)),
        b: rng.int(-6, 6),
        c: rng.pick(difficulty > 1 ? range(-3, 3) : range(-2, 2)),
        x: rng.pick(nonZeroRange(-5, 5)),
      }),
      (p) => p.a !== p.c && (p.a - p.c) * p.x + p.b !== p.b,
      { a: 3, b: -2, c: 1, x: 2 },
    ),
  render: (params): Slide => {
    const { a, b, c, x } = params;
    const d = (a - c) * x + b;
    const f = (t: number) => a * t + b;
    const g = (t: number) => c * t + d;
    const ys = [f(-6), f(6), g(-6), g(6)];
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `Each side of this equation is a straight line. Slide to the $x$ where they cross — that $x$ solves the equation.`,
        },
        { kind: 'display', tex: `${linTex(a, b)} = ${linTex(c, d)}` },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: x,
      readout: 'x = {v}',
      figure: {
        svg: twoLines(
          [f, g],
          { xMin: -6, xMax: 6, yMin: Math.max(Math.min(...ys), -30) - 1, yMax: Math.min(Math.max(...ys), 30) + 1 },
          'Two straight lines crossing once',
        ),
        ...markerWindow(-6, 6),
      },
    };
  },
  solution: (params) => {
    const { a, b, c, x } = params;
    const d = (a - c) * x + b;
    return [
      { text: 'Where the lines cross, both sides have the same value. Solve the equation to find it.' },
      { tex: `${linTex(a, b)} = ${linTex(c, d)}` },
      { tex: `${termTex(a - c, 1)} = ${d - b}` },
      { tex: `x = ${x}` },
      { text: `Both sides are $${a * x + b}$ there, which is the height of the crossing.` },
    ];
  },
};

/* ---------- Lesson 3: brackets ---------- */

type BracketForm = 'simple' | 'both' | 'two';

interface BracketParams {
  form: BracketForm;
  a: number;
  b: number;
  /** x coefficient on the right for 'both'; the second bracket's multiplier for 'two'. */
  c: number;
  /** The second bracket's number for 'two'. */
  e: number;
  x: number;
}

function bracketRight({ form, a, b, c, e, x }: BracketParams): number {
  if (form === 'simple') return a * (x + b);
  if (form === 'both') return a * (x + b) - c * x;
  return a * (x + b) + c * (x + e);
}

function bracketEqTex(params: BracketParams): string {
  const { form, a, b, c, e } = params;
  const r = bracketRight(params);
  if (form === 'simple') return `${bracketTex(a, b)} = ${r}`;
  if (form === 'both') return `${bracketTex(a, b)} = ${linTex(c, r)}`;
  return `${bracketTex(a, b)} ${c < 0 ? '-' : '+'} ${coeffTex(Math.abs(c), `(x ${signedTile(e)})`)} = ${r}`;
}

function sampleBracket(rng: Rng, difficulty: number, forms: readonly BracketForm[]): BracketParams {
  const hard = difficulty > 1;
  return drawUntil(
      () => ({
      form: rng.pick(forms),
      a: rng.pick(hard ? [-5, -4, -3, -2, 2, 3, 4, 5, 6] : range(2, 7)),
      b: rng.pick(nonZeroRange(-9, 9)),
      c: rng.pick(hard ? nonZeroRange(-4, 5) : range(1, 5)),
      e: rng.pick(nonZeroRange(-6, 6)),
      x: hard ? rng.pick(nonZeroRange(-8, 10)) : rng.int(1, 10),
    }),
    (p) => {
      if (p.form === 'both') return p.a !== p.c && bracketRight(p) !== 0;
      if (p.form === 'two') return p.a + p.c !== 0 && Math.abs(p.c) !== 1;
      return true;
    },
    { form: 'simple', a: 3, b: 2, c: 1, e: 1, x: 4 },
  );
}

function bracketSolution(params: BracketParams): SolutionStep[] {
  const { form, a, b, c, e, x } = params;
  const r = bracketRight(params);
  if (form === 'simple') {
    return [
      { tex: bracketEqTex(params) },
      { text: `$${a}$ divides $${r}$ exactly, so divide both sides by it first and the bracket opens by itself.` },
      { tex: `x ${signedTile(b)} = ${r / a}` },
      { tex: `x = ${x}` },
    ];
  }
  if (form === 'both') {
    return [
      { tex: bracketEqTex(params) },
      { text: 'There is $x$ outside the bracket, so expand: multiply **both** terms inside by the number outside.' },
      { tex: `${linTex(a, a * b)} = ${linTex(c, r)}` },
      { text: 'Then collect the $x$ terms on one side and the numbers on the other.' },
      { tex: solvedTex(termTex(a - c, 1), r - a * b, 'x', x) },
    ];
  }
  return [
    { tex: bracketEqTex(params) },
    { text: 'Expand both brackets, watching the sign in front of the second.' },
    { tex: `${linTex(a, a * b)} ${signedTile(c, 'x')} ${signedTile(c * e)} = ${r}` },
    { tex: `${linTex(a + c, a * b + c * e)} = ${r}` },
    { tex: solvedTex(termTex(a + c, 1), r - a * b - c * e, 'x', x) },
  ];
}

/**
 * Equations with brackets, solved to a number.
 *
 * A bracket alone on one side, a bracket against $x$ terms on the other, and
 * at difficulty 2 two brackets together with a negative multiplier possible —
 * where the sign in front of the second bracket is the whole difficulty.
 */
const brackets: Generator<BracketParams> = {
  id: 'lin-brackets',
  choices: (params) => {
    const { a, b, x } = params;
    const r = bracketRight(params);
    return numberChoices(x, (r - b) / a, x + 2 * b, -x, x - 1);
  },
  sample: (rng, difficulty) =>
    sampleBracket(rng, difficulty, difficulty > 1 ? ['simple', 'both', 'two'] : ['simple', 'both']),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$.' },
      { kind: 'display', tex: bracketEqTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.x}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: bracketSolution,
};

/**
 * $a(x + b) = c$ by dividing first, as a tree.
 *
 * Two strands meet: the right-hand side divided by the number outside, and
 * the number inside the bracket, which then comes off. The slots are the
 * numbers that route passes through, so a learner who expands first can still
 * see why dividing was shorter.
 */
const bracketsTree: Generator<BracketParams> = {
  id: 'lin-brackets-tree',
  sample: (rng, difficulty) => sampleBracket(rng, difficulty, ['simple']),
  render: (params): Slide => {
    const { a, b, x } = params;
    const r = bracketRight(params);
    const answer = [`${r}`, `${a}`, `${r / a}`, `${b}`, `${x}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Solve $${bracketEqTex(params)}$ by dividing first. Fill the tree: the right-hand side and the number outside the bracket, what dividing gives, the number inside the bracket, and then $x$.`,
        },
      ],
      expression: `x = ${r} \\div ${br(a)} - ${br(b)}`,
      nodes: [
        { id: 'right', from: [] },
        { id: 'outside', from: [] },
        { id: 'quotient', from: ['right', 'outside'] },
        { id: 'inside', from: [] },
        { id: 'x', from: ['quotient', 'inside'] },
      ],
      bank: treeBank(answer, [r * a, r - a, -b, r / a + b, a * b], x),
      answer,
    };
  },
  solution: bracketSolution,
};

/**
 * Expanding the bracket, placed as tiles.
 *
 * The one slip worth provoking is multiplying only the first term inside, so
 * the bank holds the unmultiplied number beside the right one, and both signs
 * of each.
 */
const expandTiles: Generator<BracketParams> = {
  id: 'lin-expand-tiles',
  choices: (params) => {
    const { a, b } = params;
    const right = bracketEqTex(params).split(' = ')[1];
    const x = termTex(a, 1);
    return labelChoices(
      `${x} ${signedTile(a * b)} = ${right}`,
      `${x} ${signedTile(b)} = ${right}`,
      `${x} ${signedTile(-a * b)} = ${right}`,
      `x ${signedTile(a * b)} = ${right}`,
    );
  },
  sample: (rng, difficulty) => sampleBracket(rng, difficulty, ['simple', 'both']),
  render: (params): Slide => {
    const { a, b } = params;
    const right = bracketEqTex(params).split(' = ')[1];
    const answer = [termTex(a, 1), signedTile(a * b)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Expand the bracket. Multiply **both** terms inside by the number outside.' },
        { kind: 'display', tex: bracketEqTex(params) },
      ],
      template: `{0} {1} = ${right}`,
      bank: bankOf(answer, [termTex(-a, 1), 'x', signedTile(b), signedTile(-a * b), signedTile(a + b)]),
      answer,
    };
  },
  solution: (params) => {
    const { a, b } = params;
    const right = bracketEqTex(params).split(' = ')[1];
    return [
      { text: `The $${a}$ outside multiplies everything inside: $${a} \\times x$ and $${a} \\times ${br(b)}$.` },
      { tex: `${linTex(a, a * b)} = ${right}` },
      {
        text: `Writing $${linTex(a, b)}$ multiplies only the $x$ — the number inside is inside the bracket too.`,
      },
    ];
  },
};

type BracketRoute = 'expand' | 'extra' | 'divide';

interface BracketRouteParams {
  route: BracketRoute;
  a: number;
  b: number;
  c: number;
  x: number;
}

const ROUTE_X_YES = 'Yes, there is $x$ outside';
const ROUTE_X_NO = 'No';
const ROUTE_EXTRA_YES = 'Yes, a number sits outside';
const ROUTE_EXTRA_NO = 'No, the bracket is alone';

function routeTex({ route, a, b, c, x }: BracketRouteParams): string {
  if (route === 'expand') return `${bracketTex(a, b)} = ${linTex(c, a * (x + b) - c * x)}`;
  if (route === 'extra') return `${bracketTex(a, b)} ${signedTile(c)} = ${a * (x + b) + c}`;
  return `${bracketTex(a, b)} = ${a * (x + b)}`;
}

/**
 * Expand first, or divide first?
 *
 * Dividing is shorter whenever the bracket stands alone — the number outside
 * then divides the other side exactly, because the equation was built that
 * way. An $x$ outside the bracket forces the expansion; a number added
 * outside it has to come off before dividing can start.
 */
const bracketFlow: Generator<BracketRouteParams> = {
  id: 'lin-bracket-flow',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({
        route: rng.pick(['expand', 'extra', 'divide'] as const),
        a: rng.pick(difficulty > 1 ? [-4, -3, -2, 2, 3, 4, 5, 6] : range(2, 6)),
        b: rng.pick(nonZeroRange(-8, 8)),
        c: rng.pick(nonZeroRange(-9, 9)),
        x: rng.pick(difficulty > 1 ? nonZeroRange(-6, 9) : range(1, 9)),
      }),
      (p) => p.route !== 'expand' || (p.c !== p.a && p.c > 0 && bracketValue(p) !== p.c * p.x),
      { route: 'divide', a: 3, b: 2, c: 1, x: 4 },
    ),
  render: (params): Slide => ({
    kind: 'flow',
    prompt: [{ kind: 'prose', text: 'Before any algebra: expand the bracket, or divide by the number outside it first?' }],
    subject: routeTex(params),
    steps: [
      {
        id: 'x-outside',
        ask: 'Is there an $x$ term outside the bracket, on either side?',
        branches: [
          { label: ROUTE_X_YES, outcome: 'Expand the bracket, then collect the $x$ terms on one side.' },
          { label: ROUTE_X_NO, to: 'extra' },
        ],
      },
      {
        id: 'extra',
        ask: 'Is a number added to or taken from the bracket, outside it?',
        branches: [
          { label: ROUTE_EXTRA_YES, outcome: 'Undo that first. Then the bracket is alone, and dividing opens it.' },
          { label: ROUTE_EXTRA_NO, outcome: 'Divide both sides by the number outside the bracket first.' },
        ],
      },
    ],
    answer:
      params.route === 'expand'
        ? [ROUTE_X_YES]
        : [ROUTE_X_NO, params.route === 'extra' ? ROUTE_EXTRA_YES : ROUTE_EXTRA_NO],
  }),
  solution: (params) => {
    const { route, a, b, c, x } = params;
    if (route === 'expand') {
      const r = a * (x + b) - c * x;
      return [
        { text: 'The $x$ outside the bracket has to be collected with the $x$ inside it, and that means expanding first.' },
        { tex: `${linTex(a, a * b)} = ${linTex(c, r)}` },
        { tex: solvedTex(termTex(a - c, 1), r - a * b, 'x', x) },
      ];
    }
    if (route === 'extra') {
      return [
        { text: `The $${c}$ is outside the bracket, so it comes off first.` },
        { tex: `${bracketTex(a, b)} = ${a * (x + b)}` },
        { text: `Now divide by $${a}$: $x ${signedTile(b)} = ${x + b}$, so $x = ${x}$.` },
      ];
    }
    return [
      { text: `The bracket is alone, and $${a}$ divides $${a * (x + b)}$ exactly.` },
      { tex: `x ${signedTile(b)} = ${x + b}` },
      { text: `So $x = ${x}$. Expanding works too; it just takes a step longer.` },
    ];
  },
};

/** The bracket's value at x, for the 'expand' route's guard. */
function bracketValue({ a, b, x }: BracketRouteParams): number {
  return a * (x + b);
}

/* ---------- Lesson 4: fractions ---------- */

type FractionForm = 'over' | 'numer' | 'extra';

interface FractionParams {
  form: FractionForm;
  /** The denominator. */
  a: number;
  /** The number added to x on top. */
  b: number;
  /** The coefficient of x on top, for 'numer'. */
  p: number;
  /** The number added outside the fraction, for 'extra'. */
  e: number;
  x: number;
}

function fractionTop({ form, b, p }: FractionParams): string {
  return form === 'numer' ? linTex(p, b) : `x ${signedTile(b)}`;
}

function fractionValue({ form, a, b, p, x }: FractionParams): number {
  return ((form === 'numer' ? p * x : x) + b) / a;
}

function fractionTex(params: FractionParams): string {
  const top = `\\frac{${fractionTop(params)}}{${params.a}}`;
  const v = fractionValue(params);
  return params.form === 'extra' ? `${top} ${signedTile(params.e)} = ${v + params.e}` : `${top} = ${v}`;
}

function sampleFraction(rng: Rng, difficulty: number, forms: readonly FractionForm[]): FractionParams {
  const form = rng.pick(forms);
  const a = rng.int(2, difficulty > 1 ? 9 : 6);
  const p = form === 'numer' ? rng.int(2, 5) : 1;
  const b = rng.pick(nonZeroRange(-9, 9));
  // The top has to be a multiple of a: draw its value, then find x from it,
  // retrying until x is whole.
  return drawUntil(
      () => {
      const v = rng.pick(difficulty > 1 ? nonZeroRange(-6, 9) : range(1, 9));
      return { form, a, b, p, e: rng.pick(nonZeroRange(-9, 9)), x: (a * v - b) / p };
    },
    (params) => Number.isInteger(params.x),
    { form, a, b: a - p, p, e: 2, x: 1 },
  );
}

function fractionSolution(params: FractionParams): SolutionStep[] {
  const { form, a, b, p, e, x } = params;
  const v = fractionValue(params);
  const steps: SolutionStep[] = [{ tex: fractionTex(params) }];
  if (form === 'extra') {
    steps.push({ text: `The $${e}$ is outside the fraction, so it comes off first.` }, { tex: `\\frac{${fractionTop(params)}}{${a}} = ${v}` });
  }
  steps.push(
    { text: `Multiply both sides by $${a}$ to clear the fraction. The **whole** top is divided by $${a}$, so the whole top is what is left.` },
    { tex: `${fractionTop(params)} = ${a * v}` },
  );
  steps.push(
    p === 1
      ? { text: `Then ${b > 0 ? `take $${b}$ away` : `add $${-b}$`}: $x = ${x}$.` }
      : { text: `Then ${b > 0 ? `take $${b}$ away` : `add $${-b}$`} and divide by $${p}$: $x = ${x}$.` },
  );
  return steps;
}

/**
 * Equations with a fraction, solved to a number.
 *
 * The move is to multiply both sides by the denominator — the fraction bar is
 * a division of the whole top, so undoing it keeps the top together. At
 * difficulty 2 a number sits outside the fraction as well and has to come off
 * first.
 */
const fraction: Generator<FractionParams> = {
  id: 'lin-fraction',
  choices: (params) => {
    const { a, b, p, x } = params;
    const v = fractionValue(params);
    return numberChoices(x, (v - b) / p, a * v + b, (a * v) / p - b, -x);
  },
  sample: (rng, difficulty) =>
    sampleFraction(rng, difficulty, difficulty > 1 ? ['over', 'numer', 'extra'] : ['over', 'numer']),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$. Clear the fraction by multiplying both sides by its denominator.' },
      { kind: 'display', tex: fractionTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.x}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: fractionSolution,
};

/**
 * The same, as lines of working: clear the fraction, then finish.
 */
const fractionSteps: Generator<FractionParams> = {
  id: 'lin-fraction-steps',
  sample: (rng, difficulty) => sampleFraction(rng, difficulty, ['over']),
  render: (params): Slide => {
    const { a, b, x } = params;
    const v = fractionValue(params);
    const top = fractionTop(params);
    return {
      kind: 'steps',
      prompt: [{ kind: 'prose', text: `Clear the fraction, then finish. ${HOW_TO_STEP}` }],
      start: [`\\frac{${top}}{${a}}`, '=', `${v}`],
      reductions: [
        {
          span: [0, 3],
          value: `${top} = ${a * v}`,
          bank: stepBank(`${top} = ${a * v}`, `${top} = ${v + a}`, `x = ${a * v}`, `${top} = ${v - a}`),
        },
        {
          span: [0, 1],
          value: `x = ${x}`,
          bank: stepBank(`x = ${x}`, `x = ${a * v + b}`, `x = ${-x}`, `x = ${x + 1}`),
        },
      ],
    };
  },
  solution: fractionSolution,
};

interface CrossParams {
  /** The left denominator. */
  a: number;
  /** The right denominator. */
  b: number;
  /** The value both fractions take. */
  m: number;
  x: number;
}

/** The numbers added to x on top of each fraction. */
function crossTops({ a, b, m, x }: CrossParams): { p: number; q: number } {
  return { p: a * m - x, q: b * m - x };
}

function crossTex(params: CrossParams): string {
  const { p, q } = crossTops(params);
  return `\\frac{x ${signedTile(p)}}{${params.a}} = \\frac{x ${signedTile(q)}}{${params.b}}`;
}

function sampleCross(rng: Rng, difficulty: number): CrossParams {
  return drawUntil(
      () => {
      const a = rng.int(2, difficulty > 1 ? 9 : 6);
      const b = rng.int(2, difficulty > 1 ? 9 : 6);
      return { a, b, m: rng.pick(nonZeroRange(-4, 5)), x: rng.pick(nonZeroRange(-8, 10)) };
    },
    (p) => {
      const { p: top1, q: top2 } = crossTops(p);
      return p.a !== p.b && top1 !== 0 && top2 !== 0 && p.a * p.b !== p.a + p.b;
    },
    { a: 2, b: 3, m: 2, x: 1 },
  );
}

/**
 * A fraction on each side, cleared in one move.
 *
 * Multiplying both sides by both denominators leaves each top multiplied by
 * the **other** denominator — the "cross" in cross-multiplying — and putting
 * each fraction's own denominator back in front of its top is the slip the
 * bank is built around. Both fractions are built to equal the same whole
 * number, so $x$ is whole too.
 */
const crossTiles: Generator<CrossParams> = {
  id: 'lin-cross-tiles',
  choices: (params) => {
    const { a, b } = params;
    const { p, q } = crossTops(params);
    const left = `(x ${signedTile(p)})`;
    const right = `(x ${signedTile(q)})`;
    return labelChoices(
      `${b}${left} = ${a}${right}`,
      `${a}${left} = ${b}${right}`,
      `${a * b}${left} = ${right}`,
      `x ${signedTile(p)} = x ${signedTile(q)}`,
    );
  },
  sample: sampleCross,
  render: (params): Slide => {
    const { a, b } = params;
    const { p, q } = crossTops(params);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Multiply both sides by $${a * b}$ to clear both fractions. What is each bracket multiplied by?`,
        },
        { kind: 'display', tex: crossTex(params) },
      ],
      template: `{0}(x ${signedTile(p)}) = {1}(x ${signedTile(q)})`,
      bank: bankOf([`${b}`, `${a}`], [`${a * b}`, `${a + b}`, '1']),
      answer: [`${b}`, `${a}`],
    };
  },
  solution: (params) => {
    const { a, b, m, x } = params;
    const { p, q } = crossTops(params);
    const k = b - a;
    return [
      { text: `Multiplying the left fraction by $${a * b}$ cancels its $${a}$ and leaves $${b}$; the right cancels its $${b}$ and leaves $${a}$.` },
      { tex: `${b}(x ${signedTile(p)}) = ${a}(x ${signedTile(q)})` },
      { tex: `${linTex(b, b * p)} = ${linTex(a, a * q)}` },
      { tex: solvedTex(termTex(k, 1), a * q - b * p, 'x', x) },
      { text: `Both fractions then equal $${m}$, which is a quick check.` },
    ];
  },
};

interface MultiplierParams {
  a: number;
  b: number;
  /** x as a multiple of the lowest common multiple. */
  k: number;
  minus: boolean;
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/** x/a + x/b = c or x/a - x/b = c, with a < b for the minus form so c > 0. */
function multiplierTex({ a, b, k, minus }: MultiplierParams): string {
  const x = lcm(a, b) * k;
  const c = minus ? x / a - x / b : x / a + x / b;
  return `\\frac{x}{${a}} ${minus ? '-' : '+'} \\frac{x}{${b}} = ${c}`;
}

/**
 * The smallest number that clears every fraction.
 *
 * The lowest common multiple of the denominators. Their product always works
 * too, but it makes every number bigger than it needs to be; their sum does
 * not work at all. Asked natively as a choice because the options are numbers
 * with reasons behind them, not values of an expression.
 */
const multiplier: Generator<MultiplierParams> = {
  id: 'lin-multiplier',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const a = rng.int(2, difficulty > 1 ? 8 : 6);
        const b = rng.int(3, difficulty > 1 ? 10 : 9);
        return { a: Math.min(a, b), b: Math.max(a, b), k: rng.int(1, 4), minus: difficulty > 1 && rng.chance(0.5) };
      },
      (p) => p.a !== p.b && lcm(p.a, p.b) !== p.b,
      { a: 4, b: 6, k: 1, minus: false },
    ),
  render: (params): Slide => {
    const { a, b } = params;
    const l = lcm(a, b);
    const candidates = [...new Set([l, a * b, a + b, b, l * 2])];
    // The product is also a valid multiplier when it is not the lcm, but the
    // question asks for the smallest, which is only ever the lcm.
    const shown = candidates.slice(0, 4).sort((x, y) => x - y);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: 'Multiply every term by one number to clear both fractions. What is the **smallest** number that works?',
        },
        { kind: 'display', tex: multiplierTex(params) },
      ],
      options: shown.map((value) => ({ id: `m${value}`, label: `${value}`, tex: true })),
      correctId: `m${l}`,
    };
  },
  solution: (params) => {
    const { a, b, k, minus } = params;
    const l = lcm(a, b);
    const x = l * k;
    return [
      { text: `The number has to be a multiple of both $${a}$ and $${b}$. The smallest such is their lowest common multiple, $${l}$.` },
      { tex: `${l} \\times \\frac{x}{${a}} = ${l / a}x` },
      { tex: `${l} \\times \\frac{x}{${b}} = ${l / b}x` },
      { tex: `${l / a}x ${minus ? '-' : '+'} ${l / b}x = ${(minus ? x / a - x / b : x / a + x / b) * l}` },
      { text: `So $x = ${x}$. Multiplying by $${a * b}$ also clears them${a * b === l ? ', and here it is the same number' : ', but every number is bigger than it needs to be'}.` },
    ];
  },
};

/**
 * Two fractions of $x$, cleared by their lowest common multiple, as a tree.
 *
 * The two strands are what each fraction becomes once multiplied through;
 * they combine into one coefficient, which meets the right-hand side (also
 * multiplied through) to give $x$. Difficulty 2 subtracts the fractions.
 */
const twoFractionsTree: Generator<MultiplierParams> = {
  id: 'lin-two-fractions-tree',
  sample: (rng, difficulty) => ({ ...multiplier.sample(rng, 1), minus: difficulty > 1 }),
  render: (params): Slide => {
    const { a, b, k, minus } = params;
    const l = lcm(a, b);
    const x = l * k;
    const c = minus ? x / a - x / b : x / a + x / b;
    const p = l / a;
    const q = l / b;
    const coefficient = minus ? p - q : p + q;
    const answer = [`${p}`, `${q}`, `${c * l}`, `${coefficient}`, `${x}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Multiply every term by $${l}$. Fill the tree: what each fraction becomes (its number of $x$), the right-hand side times $${l}$, the $x$ terms ${minus ? 'subtracted' : 'combined'}, and then $x$.`,
        },
      ],
      expression: multiplierTex(params),
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'right', from: [] },
        { id: 'coefficient', from: ['first', 'second'] },
        { id: 'x', from: ['coefficient', 'right'] },
      ],
      bank: treeBank(answer, [a, b, c * a * b, minus ? p + q : p - q, c], x),
      answer,
    };
  },
  solution: (params) => multiplier.solution(params),
};

/* ---------- Lesson 5: equations from words ---------- */

interface WordsParams {
  form: 'times-then-add' | 'add-then-times';
  story: number;
  a: number;
  b: number;
  x: number;
}

const TIMES_STORIES: readonly ((a: number, b: number, c: number) => string)[] = [
  (a, b, c) => `I think of a number $x$, multiply it by $${a}$ and then ${b > 0 ? `add $${b}$` : `take away $${-b}$`}. The answer is $${c}$.`,
  (a, b, c) => `A taxi charges £$${b}$ to start and £$${a}$ for every mile. A journey of $x$ miles cost £$${c}$.`,
  (a, b, c) => `A gym charges a £$${b}$ joining fee and £$${a}$ a month. After $x$ months the total paid is £$${c}$.`,
  (a, b, c) => `A plumber charges a £$${b}$ call-out fee and £$${a}$ an hour. A job of $x$ hours cost £$${c}$.`,
  (a, b, c) => `A market stall sells $x$ cakes at £$${a}$ each, then pays £$${-b}$ for the pitch. It is left with £$${c}$.`,
  (a, b, c) => `A plant is $${b}$ cm tall and grows $${a}$ cm a week. After $x$ weeks it is $${c}$ cm tall.`,
];

const BRACKET_STORIES: readonly ((a: number, b: number, c: number) => string)[] = [
  (a, b, c) => `I think of a number $x$, ${b > 0 ? `add $${b}$` : `take away $${-b}$`} and then multiply by $${a}$. The answer is $${c}$.`,
  (a, b, c) => `$${a}$ friends each buy a ticket costing £$x$ and a £$${b}$ programme. Together they pay £$${c}$.`,
  (a, b, c) => `$${a}$ identical boxes each hold $x$ pens plus $${b}$ pencils. Altogether there are $${c}$ pens and pencils.`,
];

/** Which stories need b of a particular sign, so the words stay sensible. */
function storySign(form: WordsParams['form'], story: number): 'plus' | 'minus' | 'any' {
  if (form === 'times-then-add') return story === 0 ? 'any' : story === 4 ? 'minus' : 'plus';
  return story === 0 ? 'any' : 'plus';
}

function wordsRight({ form, a, b, x }: WordsParams): number {
  return form === 'times-then-add' ? a * x + b : a * (x + b);
}

function wordsText(params: WordsParams): string {
  const list = params.form === 'times-then-add' ? TIMES_STORIES : BRACKET_STORIES;
  return list[params.story](params.a, params.b, wordsRight(params));
}

function wordsEquation(params: WordsParams): string {
  const { form, a, b } = params;
  return form === 'times-then-add'
    ? `${termTex(a, 1)} ${signedTile(b)} = ${wordsRight(params)}`
    : `${bracketTex(a, b)} = ${wordsRight(params)}`;
}

function sampleWords(rng: Rng, difficulty: number): WordsParams {
  const form = difficulty > 1 ? rng.pick(['times-then-add', 'add-then-times'] as const) : rng.pick(['times-then-add', 'times-then-add', 'add-then-times'] as const);
  const story = rng.int(0, (form === 'times-then-add' ? TIMES_STORIES : BRACKET_STORIES).length - 1);
  const sign = storySign(form, story);
  const size = rng.int(2, form === 'times-then-add' ? 15 : 9);
  const b = sign === 'plus' ? size : sign === 'minus' ? -size : rng.pick([size, -size]);
  return { form, story, a: rng.int(2, form === 'times-then-add' ? 9 : 6), b, x: rng.int(2, difficulty > 1 ? 20 : 12) };
}

function wordsSolution(params: WordsParams): SolutionStep[] {
  const { form, b, x } = params;
  return [
    {
      text:
        form === 'times-then-add'
          ? `The multiplying happens to $x$ alone, and the $${Math.abs(b)}$ is ${b > 0 ? 'added' : 'taken away'} afterwards — no bracket.`
          : `The $${Math.abs(b)}$ is ${b > 0 ? 'added to' : 'taken from'} $x$ **before** the multiplying, so $x ${signedTile(b)}$ goes in a bracket.`,
    },
    { tex: wordsEquation(params) },
    { text: `Solving it gives $x = ${x}$.` },
  ];
}

/**
 * Turning words into an equation, placed as tiles.
 *
 * Whether a number is added before or after the multiplying decides whether
 * there is a bracket, and the two templates look different on purpose: the
 * learner has to read which one the words describe, then place the numbers.
 * The bank holds each number's other sign and the numbers swapped over.
 */
const words: Generator<WordsParams> = {
  id: 'lin-words',
  choices: (params) => {
    const { a, b } = params;
    const c = wordsRight(params);
    const times = `${termTex(a, 1)} ${signedTile(b)} = ${c}`;
    const bracket = `${bracketTex(a, b)} = ${c}`;
    return labelChoices(
      params.form === 'times-then-add' ? times : bracket,
      params.form === 'times-then-add' ? bracket : times,
      `${termTex(b > 0 ? b : a + 1, 1)} ${signedTile(a)} = ${c}`,
      `${termTex(a, 1)} ${signedTile(-b)} = ${c}`,
    );
  },
  sample: sampleWords,
  render: (params): Slide => {
    const { form, a, b } = params;
    const c = wordsRight(params);
    const answer = [numberTile(a), signedTile(b), numberTile(c)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: wordsText(params) },
        { kind: 'prose', text: 'Write the equation these words describe.' },
      ],
      template: form === 'times-then-add' ? '{0}x {1} = {2}' : '{0}(x {1}) = {2}',
      bank: bankOf(answer, [signedTile(-b), `${Math.abs(b)}`, signedTile(a), numberTile(c + b), numberTile(c - b)]),
      answer,
    };
  },
  solution: wordsSolution,
};

type WordsSolveStory = 'perimeter' | 'consecutive' | 'ages' | 'share';

interface WordsSolveParams {
  story: WordsSolveStory;
  x: number;
  d: number;
  /** A multiplier for the harder version of a story. */
  m: number;
}

function wordsSolveTotal({ story, x, d, m }: WordsSolveParams): number {
  if (story === 'perimeter') return 2 * (x + (m * x + d));
  if (story === 'consecutive') return m * x + (m * (m - 1)) / 2;
  if (story === 'ages') return x + (m * x + d);
  return x + (m * x + d);
}

/**
 * A worded problem solved to a number, with no equation handed over.
 *
 * Four situations, each needing the learner to name the unknown, write the
 * other quantity in terms of it, and add up: a rectangle's perimeter, whole
 * numbers in a row, two ages, money shared unequally. Difficulty 2 makes the
 * second quantity a multiple of the first as well as more than it.
 */
const wordsSolve: Generator<WordsSolveParams> = {
  id: 'lin-words-solve',
  choices: (params) => {
    const { x, d } = params;
    const t = wordsSolveTotal(params);
    return numberChoices(x, x + d, t / 2, x - 1, (t - d) / 4);
  },
  sample: (rng, difficulty) => {
    const story = rng.pick(['perimeter', 'consecutive', 'ages', 'share'] as const);
    const hard = difficulty > 1;
    if (story === 'consecutive') return { story, x: rng.int(1, hard ? 60 : 40), d: 1, m: hard ? rng.pick([3, 4, 5]) : 3 };
    return { story, x: rng.int(2, 25), d: rng.int(1, 12), m: hard ? rng.pick([1, 2, 3]) : 1 };
  },
  render: (params): Slide => {
    const { story, d, m } = params;
    const t = wordsSolveTotal(params);
    const times = m === 1 ? '' : `${m} times as much as the other, and then `;
    const text: Record<WordsSolveStory, string> = {
      perimeter: `A rectangle is ${m === 1 ? '' : `${m} times as long as it is wide, and then `}$${d}$ cm longer${m === 1 ? ' than it is wide' : ''}. Its perimeter is $${t}$ cm. How wide is it?`,
      consecutive: `${m === 3 ? 'Three' : m === 4 ? 'Four' : 'Five'} whole numbers in a row add up to $${t}$. What is the smallest of them?`,
      ages: `Ria is ${m === 1 ? '' : `${m} times as old as Sam, and then `}$${d}$ years older${m === 1 ? ' than Sam' : ''}. Their ages add up to $${t}$. How old is Sam?`,
      share: `£$${t}$ is shared between two people so that one gets ${times}£$${d}$ more. How much does the other get, in pounds?`,
    };
    const lead: Record<WordsSolveStory, string> = {
      perimeter: '\\text{width} =',
      consecutive: '\\text{smallest} =',
      ages: '\\text{Sam} =',
      share: '\\text{smaller share} =',
    };
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: text[story] }],
      lead: lead[story],
      keypad: [],
      answer: `${params.x}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { story, x, d, m } = params;
    const t = wordsSolveTotal(params);
    const other = linTex(m, d);
    if (story === 'consecutive') {
      const terms = m === 3 ? 'x + (x + 1) + (x + 2)' : `x + \\cdots + (x + ${m - 1})`;
      return [
        { text: 'Call the smallest $x$. The others are one more each time.' },
        { tex: `${terms} = ${t}` },
        { tex: `${linTex(m, (m * (m - 1)) / 2)} = ${t} \\implies x = ${x}` },
      ];
    }
    if (story === 'perimeter') {
      return [
        { text: `Call the width $x$. The length is $${other}$, and the perimeter goes round both twice.` },
        { tex: `2(x + ${other}) = ${t}` },
        { tex: `${linTex(2 * (m + 1), 2 * d)} = ${t} \\implies x = ${x}` },
      ];
    }
    return [
      { text: `Call the smaller amount $x$. The other is $${other}$, and together they make $${t}$.` },
      { tex: `x + ${other} = ${t}` },
      { tex: `${linTex(m + 1, d)} = ${t} \\implies x = ${x}` },
    ];
  },
};

interface PlansParams {
  story: number;
  /** The cheaper start. */
  a: number;
  /** The dearer rate. */
  p: number;
  /** The cheaper rate. */
  q: number;
  /** When they agree. */
  n: number;
}

const PLAN_STORIES: readonly { text: (a: number, p: number, b: number, q: number) => string; unit: string }[] = [
  {
    text: (a, p, b, q) => `Phone plan A costs £$${a}$ up front and £$${p}$ a month. Plan B costs £$${b}$ up front and £$${q}$ a month.`,
    unit: 'months',
  },
  {
    text: (a, p, b, q) => `Taxi firm A charges £$${a}$ plus £$${p}$ a mile. Firm B charges £$${b}$ plus £$${q}$ a mile.`,
    unit: 'miles',
  },
  {
    text: (a, p, b, q) => `Asha has £$${b}$ and saves £$${q}$ a week. Ben has £$${a}$ and saves £$${p}$ a week.`,
    unit: 'weeks',
  },
  {
    text: (a, p, b, q) => `Hire shop A charges £$${a}$ plus £$${p}$ a day for a bike. Shop B charges £$${b}$ plus £$${q}$ a day.`,
    unit: 'days',
  },
];

/**
 * Two ways of paying, and when they cost the same.
 *
 * Each option is a start plus a rate, so setting them equal gives unknowns on
 * both sides — the previous lesson's equation met in the wild. Built from the
 * number of months it takes, so the answer is whole.
 */
const plans: Generator<PlansParams> = {
  id: 'lin-plans',
  choices: (params) => {
    const { a, p, q, n } = params;
    const b = a + (p - q) * n;
    return numberChoices(n, (b - a) / (p + q), b - a, n + 1, (b + a) / (p - q));
  },
  sample: (rng, difficulty) => {
    const q = rng.int(1, difficulty > 1 ? 12 : 8);
    return {
      story: rng.int(0, PLAN_STORIES.length - 1),
      a: rng.int(1, difficulty > 1 ? 40 : 20),
      p: q + rng.int(1, difficulty > 1 ? 6 : 4),
      q,
      n: rng.int(2, 12),
    };
  },
  render: (params): Slide => {
    const { story, a, p, q, n } = params;
    const b = a + (p - q) * n;
    const { text, unit } = PLAN_STORIES[story];
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: text(a, p, b, q) },
        {
          kind: 'prose',
          text:
            story === 2
              ? `After how many ${unit} will they have the same amount?`
              : `After how many ${unit} do the two cost the same?`,
        },
      ],
      lead: `\\text{${unit}} =`,
      keypad: [],
      answer: `${n}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, p, q, n } = params;
    const b = a + (p - q) * n;
    return [
      { text: 'Write each total with $n$ for the unknown, and set the two equal.' },
      { tex: `${linTex(p, a).replace('x', 'n')} = ${linTex(q, b).replace('x', 'n')}` },
      { text: `Collect the $n$ terms on the side with more: take $${q}n$ from both sides, and $${a}$ too.` },
      { tex: `${p - q}n = ${b - a} \\implies n = ${n}` },
    ];
  },
};

interface CostParams {
  story: number;
  a: number;
  p: number;
  n: number;
}

const COST_STORIES: readonly { text: (a: number, p: number, c: number) => string; unit: string }[] = [
  { text: (a, p, c) => `A taxi charges £$${a}$ to start and £$${p}$ a mile. A fare came to £$${c}$. How many miles was it?`, unit: 'miles' },
  { text: (a, p, c) => `A bike hire costs £$${a}$ plus £$${p}$ an hour. A hire cost £$${c}$. How many hours was it?`, unit: 'hours' },
  { text: (a, p, c) => `A printing shop charges £$${a}$ to set up and £$${p}$ for each box of cards. An order cost £$${c}$. How many boxes?`, unit: 'boxes' },
  { text: (a, p, c) => `A tank holds $${a}$ litres and fills at $${p}$ litres a minute. When does it hold $${c}$ litres?`, unit: 'minutes' },
];

/**
 * A worded equation, read off its graph.
 *
 * The cost is a start plus a rate, drawn as a line from zero; the total is a
 * dashed height, and the answer is where the line reaches it. The window runs
 * from $0$ to $12$ whatever the numbers, so the picture does not give the
 * answer away by where it ends.
 */
const costSlider: Generator<CostParams> = {
  id: 'lin-cost-slider',
  sample: (rng, difficulty) => ({
    story: rng.int(0, COST_STORIES.length - 1),
    a: rng.int(1, difficulty > 1 ? 15 : 8),
    p: rng.int(2, difficulty > 1 ? 9 : 5),
    n: rng.int(1, 12),
  }),
  render: ({ story, a, p, n }): Slide => {
    const c = a + p * n;
    const { text, unit } = COST_STORIES[story];
    return {
      kind: 'slider',
      prompt: [{ kind: 'prose', text: `${text(a, p, c)} The line is the total; the dashed line is $${c}$.` }],
      min: 0,
      max: 12,
      step: 1,
      answer: n,
      readout: `\\text{${unit}} = {v}`,
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 12,
          yMin: 0,
          yMax: a + p * 12 + 2,
          curves: [{ f: (t: number) => a + p * t }],
          horizontals: [c],
          label: 'A straight line rising from the start charge, and a dashed line at the total',
        }),
        ...markerWindow(0, 12),
      },
    };
  },
  solution: ({ a, p, n }) => [
    { text: 'The total is the start plus the rate times the number, so write that equal to what was paid.' },
    { tex: `${a} + ${p}n = ${a + p * n}` },
    { tex: `${p}n = ${p * n} \\implies n = ${n}` },
  ],
};

/* ======================================================================
 * Level 2: Simultaneous Linear Equations
 * ==================================================================== */

/**
 * Two equations in $x$ and $y$, built from their solution.
 *
 * $(x, y)$ is drawn first and each right-hand side worked out from it, so the
 * pair always meets at whole numbers and everything elimination produces on
 * the way is whole too.
 */
interface Sys {
  a1: number;
  b1: number;
  a2: number;
  b2: number;
  x: number;
  y: number;
}

const c1Of = (s: Sys): number => s.a1 * s.x + s.b1 * s.y;
const c2Of = (s: Sys): number => s.a2 * s.x + s.b2 * s.y;

function eqTex(a: number, b: number, c: number): string {
  return `${pairTex(a, b)} = ${c}`;
}

function sysTex(s: Sys): string {
  return systemTex(eqTex(s.a1, s.b1, c1Of(s)), eqTex(s.a2, s.b2, c2Of(s)));
}

/** A term in whichever letter: `3x`, `-y`. */
function letterTerm(k: number, letter: 'x' | 'y'): string {
  return letter === 'x' ? termTex(k, 1) : yTerm(k);
}

/** The solution values, never zero and never equal, so a swapped pair is wrong. */
function drawSolution(rng: Rng, hard: boolean): { x: number; y: number } {
  const x = rng.pick(nonZeroRange(hard ? -6 : 1, 9));
  let y = rng.pick(nonZeroRange(hard ? -6 : -3, 9));
  if (y === x) y = x === 1 ? 2 : x - 1;
  return { x, y };
}

type Match = 'x-same' | 'x-opp' | 'y-same' | 'y-opp';

/**
 * A pair where one letter already has coefficients of the same size.
 *
 * The other letter's coefficients are different sizes, so there is only one
 * letter elimination can remove as the equations stand; and when the match is
 * of opposite signs the other letter's coefficients add to something positive,
 * so adding the equations leaves a positive coefficient.
 */
function sampleMatch(rng: Rng, match: Match, hard: boolean): Sys {
  return drawUntil(
      () => {
      const { x, y } = drawSolution(rng, hard);
      const m = rng.int(1, 5);
      const u = rng.pick(hard ? nonZeroRange(-6, 7) : range(1, 7));
      const v = rng.pick(nonZeroRange(-6, 7));
      const opp = match.endsWith('opp');
      const other = opp ? -m : m;
      return match.startsWith('x') ? { a1: m, b1: u, a2: other, b2: v, x, y } : { a1: u, b1: m, a2: v, b2: other, x, y };
    },
    (s) => {
      const [u, v] = match.startsWith('x') ? [s.b1, s.b2] : [s.a1, s.a2];
      if (Math.abs(u) === Math.abs(v)) return false;
      return match.endsWith('opp') ? u + v > 0 : true;
    },
    match.startsWith('x')
      ? { a1: 2, b1: 3, a2: match === 'x-same' ? 2 : -2, b2: 1, x: 3, y: 2 }
      : { a1: 3, b1: 2, a2: 1, b2: match === 'y-same' ? 2 : -2, x: 3, y: 2 },
  );
}

/** What eliminating a matched letter leaves, with a positive coefficient. */
function eliminate(s: Sys, match: Match): { letter: 'x' | 'y'; k: number; v: number; op: string } {
  const c1 = c1Of(s);
  const c2 = c2Of(s);
  const [u, v] = match.startsWith('x') ? [s.b1, s.b2] : [s.a1, s.a2];
  const letter = match.startsWith('x') ? 'y' : 'x';
  if (match.endsWith('opp')) return { letter, k: u + v, v: c1 + c2, op: '(1) + (2)' };
  return u > v ? { letter, k: u - v, v: c1 - c2, op: '(1) - (2)' } : { letter, k: v - u, v: c2 - c1, op: '(2) - (1)' };
}

function matchSolution(s: Sys, match: Match): SolutionStep[] {
  const { letter, k, v, op } = eliminate(s, match);
  const gone = letter === 'x' ? 'y' : 'x';
  const found = letter === 'x' ? s.x : s.y;
  const other = letter === 'x' ? s.y : s.x;
  return [
    {
      text: `The $${gone}$ coefficients are the same size with ${match.endsWith('opp') ? 'opposite signs, so **add**' : 'the same sign, so **subtract**'}: ${op}.`,
    },
    { tex: solvedTex(letterTerm(k, letter), v, letter, found) },
    { text: `Put $${letter} = ${found}$ back into either equation to find $${gone} = ${other}$.` },
  ];
}

/* ---------- Lesson 1: what a solution is ---------- */

interface CheckPairParams extends Sys {
  /** Which equation's left-hand side is worked out. */
  which: 1 | 2;
  /** Whether the pair offered is the real solution or a point on (1) only. */
  real: boolean;
}

function offeredPair(p: CheckPairParams): { px: number; py: number } {
  return p.real ? { px: p.x, py: p.y } : { px: p.x + p.b1, py: p.y - p.a1 };
}

function sampleSys(rng: Rng, hard: boolean, pool: readonly number[]): Sys {
  return drawUntil(
      () => ({
      a1: rng.pick(pool.filter((v) => v > 0)),
      b1: rng.pick(pool),
      a2: rng.pick(pool.filter((v) => v > 0)),
      b2: rng.pick(pool),
      ...drawSolution(rng, hard),
    }),
    (s) => s.a1 * s.b2 !== s.a2 * s.b1 && !(s.a1 === s.a2 && s.b1 === s.b2),
    { a1: 2, b1: 3, a2: 3, b2: -1, x: 2, y: 1 },
  );
}

/**
 * Is this pair a solution? Work out one equation's left-hand side.
 *
 * A solution has to satisfy **both** equations, and checking one is a
 * reduction: each coefficient times its value, then combined. Half the time
 * the pair is only on the first line, so the second equation's check is where
 * it fails — the reason one check is never enough.
 */
const simCheck: Generator<CheckPairParams> = {
  id: 'lin-sim-check',
  choices: (params) => {
    const a = params.which === 1 ? params.a1 : params.a2;
    const b = params.which === 1 ? params.b1 : params.b2;
    const { px, py } = offeredPair(params);
    const value = a * px + b * py;
    return numberChoices(value, a * px - b * py, a * py + b * px, a + b + px + py);
  },
  sample: (rng, difficulty) => ({
    ...sampleSys(rng, difficulty > 1, difficulty > 1 ? [-5, -4, -3, -2, 2, 3, 4, 5] : [-3, -2, 2, 3, 4, 5]),
    which: rng.pick([1, 2] as const),
    real: rng.chance(0.5),
  }),
  render: (params): Slide => {
    const a = params.which === 1 ? params.a1 : params.a2;
    const b = params.which === 1 ? params.b1 : params.b2;
    const { px, py } = offeredPair(params);
    const product = bin('*', num(a), num(px));
    const expr = b < 0 ? bin('-', product, bin('*', num(-b), num(py))) : bin('+', product, bin('*', num(b), num(py)));
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `Is $x = ${px}, y = ${py}$ a solution? Work out the left-hand side of equation (${params.which}) with those values. ${HOW_TO_REDUCE}`,
        },
        { kind: 'display', tex: sysTex(params) },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: (params) => {
    const a = params.which === 1 ? params.a1 : params.a2;
    const b = params.which === 1 ? params.b1 : params.b2;
    const c = params.which === 1 ? c1Of(params) : c2Of(params);
    const { px, py } = offeredPair(params);
    const value = a * px + b * py;
    const onFirst = params.which === 1 || params.real;
    return [
      { tex: `${a} \\times ${br(px)} ${b < 0 ? '-' : '+'} ${Math.abs(b)} \\times ${br(py)}` },
      { tex: `= ${a * px} ${signedTile(b * py)} = ${value}` },
      {
        text:
          value === c
            ? `That matches the $${c}$ on the right, so equation (${params.which}) is satisfied.${params.which === 1 ? ' The pair still has to satisfy (2) before it is a solution.' : ''}`
            : `The right-hand side is $${c}$, so equation (${params.which}) fails and the pair is **not** a solution.`,
      },
      ...(onFirst && !params.real && params.which === 1
        ? [{ text: 'In fact it fails (2): it lies on the first line only.' }]
        : []),
    ];
  },
};

interface WhichPairParams extends Sys {
  slot: number;
}

/**
 * Which of these pairs solves both equations?
 *
 * The three wrong pairs are each wrong in a way worth seeing: one lies on the
 * first line only, one on the second only, and one is the answer written the
 * wrong way round. Checking every option in both equations is a perfectly
 * good way through, and is itself the skill.
 */
const whichPair: Generator<WhichPairParams> = {
  id: 'lin-sim-which-pair',
  sample: (rng, difficulty) => ({
    ...sampleSys(rng, difficulty > 1, difficulty > 1 ? [-4, -3, -2, -1, 1, 2, 3, 4] : [-2, -1, 1, 2, 3]),
    slot: rng.int(0, 3),
  }),
  render: (params): Slide => {
    const { a1, b1, a2, b2, x, y, slot } = params;
    const right = { id: 'solution', label: pointTex(x, y), tex: true };
    const wrong = [
      { id: 'first', label: pointTex(x + b1, y - a1), tex: true },
      { id: 'second', label: pointTex(x + b2, y - a2), tex: true },
      { id: 'swapped', label: pointTex(y, x), tex: true },
    ].filter((option, i, all) => option.label !== right.label && all.findIndex((o) => o.label === option.label) === i);
    const at = Math.min(slot, wrong.length);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Only one of these pairs $(x, y)$ satisfies **both** equations. Which one?' },
        { kind: 'display', tex: sysTex(params) },
      ],
      options: [...wrong.slice(0, at), right, ...wrong.slice(at)],
      correctId: 'solution',
    };
  },
  solution: (params) => {
    const { a1, b1, a2, b2, x, y } = params;
    return [
      { text: 'A solution has to make both equations true at once. Test each pair in both.' },
      { text: 'Equation (1):' },
      { tex: `${a1} \\times ${br(x)} ${b1 < 0 ? '-' : '+'} ${Math.abs(b1)} \\times ${br(y)} = ${c1Of(params)}` },
      { text: 'Equation (2):' },
      { tex: `${a2} \\times ${br(x)} ${b2 < 0 ? '-' : '+'} ${Math.abs(b2)} \\times ${br(y)} = ${c2Of(params)}` },
      {
        text: `So $${pointTex(x, y)}$ works in both. $${pointTex(x + b1, y - a1)}$ satisfies (1) only, and $${pointTex(y, x)}$ has the values the wrong way round.`,
      },
    ];
  },
};

type Satisfies = 'both' | 'first' | 'second' | 'neither';

interface SatisfiesParams extends Sys {
  kind: Satisfies;
}

function satisfiesPair(p: SatisfiesParams): { px: number; py: number } {
  if (p.kind === 'both') return { px: p.x, py: p.y };
  if (p.kind === 'first') return { px: p.x + p.b1, py: p.y - p.a1 };
  if (p.kind === 'second') return { px: p.x + p.b2, py: p.y - p.a2 };
  return { px: p.x + 1, py: p.y + 1 };
}

const SAT_YES = 'Yes, it balances';
const SAT_NO = 'No';

/**
 * Checking a pair as a walk through both equations.
 *
 * The order is the lesson: the first equation, then — only if it balances —
 * the second, because failing either one settles it. The four cases turn up
 * equally, so "it worked in the first one" is not a reliable guess.
 */
const satisfiesFlow: Generator<SatisfiesParams> = {
  id: 'lin-sim-satisfies-flow',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({
        ...sampleSys(rng, difficulty > 1, difficulty > 1 ? [-4, -3, -2, -1, 1, 2, 3, 4] : [-2, -1, 1, 2, 3]),
        kind: rng.pick(['both', 'first', 'second', 'neither'] as const),
      }),
      (p) => {
        if (p.kind !== 'neither') return true;
        const { px, py } = satisfiesPair(p);
        return p.a1 * px + p.b1 * py !== c1Of(p) && p.a2 * px + p.b2 * py !== c2Of(p);
      },
      { a1: 2, b1: 1, a2: 1, b2: -1, x: 3, y: 2, kind: 'both' },
    ),
  render: (params): Slide => {
    const { px, py } = satisfiesPair(params);
    const onFirst = params.kind === 'both' || params.kind === 'first';
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Is $x = ${px}, y = ${py}$ a solution of this pair? Check it one equation at a time.` }],
      subject: sysTex(params),
      steps: [
        {
          id: 'first',
          ask: 'Put the values into equation (1). Does it balance?',
          branches: [
            { label: SAT_YES, to: 'second' },
            { label: SAT_NO, outcome: 'Not a solution. It fails (1), so there is no need to check (2).' },
          ],
        },
        {
          id: 'second',
          ask: 'Now equation (2). Does it balance?',
          branches: [
            { label: SAT_YES, outcome: 'A solution: it satisfies both equations, so it is where the two lines cross.' },
            { label: SAT_NO, outcome: 'Not a solution. It lies on the first line only.' },
          ],
        },
      ],
      answer: onFirst ? [SAT_YES, params.kind === 'both' ? SAT_YES : SAT_NO] : [SAT_NO],
    };
  },
  solution: (params) => {
    const { px, py } = satisfiesPair(params);
    const { a1, b1, a2, b2 } = params;
    const left1 = a1 * px + b1 * py;
    const left2 = a2 * px + b2 * py;
    return [
      { text: 'Equation (1):' },
      { tex: `${a1} \\times ${br(px)} ${b1 < 0 ? '-' : '+'} ${Math.abs(b1)} \\times ${br(py)} = ${left1}` },
      {
        text:
          left1 === c1Of(params)
            ? `That is $${c1Of(params)}$, so (1) balances. Now (2):`
            : `But (1) needs $${c1Of(params)}$, so the pair is not a solution — one failure is enough.`,
      },
      ...(left1 === c1Of(params)
        ? [
            { text: 'Equation (2):' },
      { tex: `${a2} \\times ${br(px)} ${b2 < 0 ? '-' : '+'} ${Math.abs(b2)} \\times ${br(py)} = ${left2}` },
            {
              text:
                left2 === c2Of(params)
                  ? `That is $${c2Of(params)}$ as well, so the pair solves both.`
                  : `But (2) needs $${c2Of(params)}$, so the pair is on the first line only.`,
            },
          ]
        : []),
    ];
  },
};

interface BackSubParams extends Sys {
  /** The letter already found. */
  given: 'x' | 'y';
  which: 1 | 2;
}

/**
 * One value is known; the other comes from putting it back in.
 *
 * The last step of every method in this level, asked on its own. The known
 * value goes into either equation — the solution satisfies both — and what
 * is left is a one-letter equation from level 1.
 */
const backSub: Generator<BackSubParams> = {
  id: 'lin-sim-back-sub',
  choices: (params) => {
    const { given, which } = params;
    const a = which === 1 ? params.a1 : params.a2;
    const b = which === 1 ? params.b1 : params.b2;
    const c = which === 1 ? c1Of(params) : c2Of(params);
    const target = given === 'x' ? params.y : params.x;
    const [known, knownCoef, targetCoef] = given === 'x' ? [params.x, a, b] : [params.y, b, a];
    return numberChoices(target, (c + knownCoef * known) / targetCoef, c - knownCoef * known, -target);
  },
  sample: (rng, difficulty) => ({
    ...sampleSys(rng, difficulty > 1, difficulty > 1 ? [-5, -4, -3, -2, 2, 3, 4, 5] : [1, 2, 3, 4]),
    given: rng.pick(['x', 'y'] as const),
    which: rng.pick([1, 2] as const),
  }),
  render: (params): Slide => {
    const { given, which } = params;
    const value = given === 'x' ? params.x : params.y;
    const other = given === 'x' ? 'y' : 'x';
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Solving this pair has already given $${given} = ${value}$. Put it into equation (${which}) to find $${other}$.`,
        },
        { kind: 'display', tex: sysTex(params) },
      ],
      lead: `${other} =`,
      keypad: [],
      answer: `${given === 'x' ? params.y : params.x}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { given, which } = params;
    const a = which === 1 ? params.a1 : params.a2;
    const b = which === 1 ? params.b1 : params.b2;
    const c = which === 1 ? c1Of(params) : c2Of(params);
    if (given === 'x') {
      return [
        { tex: `${a} \\times ${br(params.x)} ${signedTile(b, 'y')} = ${c}` },
        { tex: `${a * params.x} ${signedTile(b, 'y')} = ${c}` },
        { tex: solvedTex(yTerm(b), c - a * params.x, 'y', params.y) },
      ];
    }
    return [
      { tex: `${termTex(a, 1)} ${b < 0 ? '-' : '+'} ${Math.abs(b)} \\times ${br(params.y)} = ${c}` },
      { tex: `${termTex(a, 1)} ${signedTile(b * params.y)} = ${c}` },
      { tex: solvedTex(termTex(a, 1), c - b * params.y, 'x', params.x) },
    ];
  },
};

/**
 * The solution as a crossing, read off the picture as a height.
 *
 * Each equation is a straight line, and the pair of values that satisfies
 * both is the one point on both lines. The window is fixed at $\pm 8$, and
 * the crossing's height is never zero.
 */
const simYSlider: Generator<Sys> = {
  id: 'lin-sim-y-slider',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({
        a1: rng.pick(difficulty > 1 ? [-3, -2, -1, 1, 2, 3] : [1, 2, 3]),
        b1: rng.pick(difficulty > 1 ? [-2, -1, 1, 2] : [1]),
        a2: rng.pick([-3, -2, -1, 1, 2, 3]),
        b2: rng.pick(difficulty > 1 ? [-2, -1, 1, 2] : [1, -1]),
        x: rng.pick(nonZeroRange(-4, 4)),
        y: rng.pick(nonZeroRange(-6, 6)),
      }),
      (s) => s.a1 * s.b2 !== s.a2 * s.b1 && s.x !== s.y,
      { a1: 1, b1: 1, a2: 2, b2: -1, x: 2, y: 3 },
    ),
  render: (s): Slide => {
    const f = (t: number) => (c1Of(s) - s.a1 * t) / s.b1;
    const g = (t: number) => (c2Of(s) - s.a2 * t) / s.b2;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'Each equation is a straight line, and the solution is where they cross. Slide the level line to the $y$ of the crossing.',
        },
        { kind: 'display', tex: sysTex(s) },
      ],
      min: -8,
      max: 8,
      step: 1,
      answer: s.y,
      readout: 'y = {v}',
      figure: {
        svg: twoLines([f, g], { xMin: -6, xMax: 6, yMin: -8, yMax: 8 }, 'Two straight lines crossing once'),
        ...markerWindow(-8, 8, 'y'),
        axis: 'y',
      },
    };
  },
  solution: (s) => [
    { text: 'The crossing is the pair that satisfies both equations, so solving them finds it.' },
    { tex: `x = ${s.x}, \\quad y = ${s.y}` },
    {
      text: `Check in both: $${s.a1} \\times ${br(s.x)} ${signedTile(s.b1 * s.y)} = ${c1Of(s)}$ and $${s.a2} \\times ${br(s.x)} ${signedTile(s.b2 * s.y)} = ${c2Of(s)}$.`,
    },
  ],
};

/* ---------- Lesson 2: elimination ---------- */

type ElimCase = Match | 'scale';

interface ElimFlowParams extends Sys {
  kind: ElimCase;
}

const ELIM_YES = 'Yes';
const ELIM_NO = 'No';
const ELIM_SAME = 'Same sign';
const ELIM_OPP = 'Opposite signs';

/**
 * Add or subtract? Or neither yet?
 *
 * Elimination needs one letter whose coefficients are the same size; the
 * signs then say which operation cancels it. Difficulty 2 adds pairs with no
 * match at all, where the next move is to scale — the following lesson.
 */
const elimFlow: Generator<ElimFlowParams> = {
  id: 'lin-elim-flow',
  sample: (rng, difficulty) => {
    const kind = rng.pick(
      difficulty > 1
        ? (['x-same', 'x-opp', 'y-same', 'y-opp', 'scale', 'scale'] as const)
        : (['x-same', 'x-opp', 'y-same', 'y-opp'] as const),
    );
    if (kind === 'scale') {
      return {
        ...drawUntil(
      () => sampleSys(rng, true, [-5, -4, -3, -2, 2, 3, 4, 5]),
          (s) => Math.abs(s.a1) !== Math.abs(s.a2) && Math.abs(s.b1) !== Math.abs(s.b2),
          { a1: 2, b1: 3, a2: 3, b2: -4, x: 2, y: 1 },
        ),
        kind,
      };
    }
    return { ...sampleMatch(rng, kind, difficulty > 1), kind };
  },
  render: (params): Slide => {
    const { kind } = params;
    const path =
      kind === 'scale'
        ? [ELIM_NO, ELIM_NO]
        : kind.startsWith('x')
          ? [ELIM_YES, kind.endsWith('same') ? ELIM_SAME : ELIM_OPP]
          : [ELIM_NO, ELIM_YES, kind.endsWith('same') ? ELIM_SAME : ELIM_OPP];
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Which move eliminates a letter from this pair?' }],
      subject: sysTex(params),
      steps: [
        {
          id: 'x',
          ask: 'Are the $x$ coefficients the same size?',
          branches: [
            { label: ELIM_YES, to: 'x-sign' },
            { label: ELIM_NO, to: 'y' },
          ],
        },
        {
          id: 'x-sign',
          ask: 'Do they have the same sign, or opposite signs?',
          branches: [
            { label: ELIM_SAME, outcome: 'Subtract one equation from the other: the $x$ terms cancel.' },
            { label: ELIM_OPP, outcome: 'Add the equations: the $x$ terms cancel.' },
          ],
        },
        {
          id: 'y',
          ask: 'Are the $y$ coefficients the same size?',
          branches: [
            { label: ELIM_YES, to: 'y-sign' },
            { label: ELIM_NO, outcome: 'Neither letter matches yet: multiply one or both equations first so that one does.' },
          ],
        },
        {
          id: 'y-sign',
          ask: 'Do they have the same sign, or opposite signs?',
          branches: [
            { label: ELIM_SAME, outcome: 'Subtract one equation from the other: the $y$ terms cancel.' },
            { label: ELIM_OPP, outcome: 'Add the equations: the $y$ terms cancel.' },
          ],
        },
      ],
      answer: path,
    };
  },
  solution: (params) => {
    if (params.kind === 'scale') {
      return [
        { tex: sysTex(params) },
        {
          text: `The $x$ coefficients are $${params.a1}$ and $${params.a2}$, and the $y$ coefficients $${params.b1}$ and $${params.b2}$: no pair is the same size, so adding or subtracting cancels nothing yet. Scale first.`,
        },
      ];
    }
    return matchSolution(params, params.kind);
  },
};

interface MatchParams extends Sys {
  match: Match;
}

function sampleAnyMatch(rng: Rng, difficulty: number): MatchParams {
  const match = rng.pick(['x-same', 'x-opp', 'y-same', 'y-opp'] as const);
  return { ...sampleMatch(rng, match, difficulty > 1), match };
}

/**
 * What adding or subtracting leaves, placed as tiles.
 *
 * One letter goes and one equation in the other is left. The bank holds what
 * the wrong operation leaves — the sum where the difference was wanted, and
 * the other way round — since that is the mistake the signs are there to
 * prevent.
 */
const elimCombine: Generator<MatchParams> = {
  id: 'lin-elim-combine',
  choices: (params) => {
    const { letter, k, v } = eliminate(params, params.match);
    const c1 = c1Of(params);
    const c2 = c2Of(params);
    const [u, w] = params.match.startsWith('x') ? [params.b1, params.b2] : [params.a1, params.a2];
    const wrongK = params.match.endsWith('opp') ? Math.abs(u - w) : u + w;
    const wrongV = params.match.endsWith('opp') ? Math.abs(c1 - c2) : c1 + c2;
    return labelChoices(
      `${letterTerm(k, letter)} = ${v}`,
      `${letterTerm(wrongK === 0 ? k + 1 : wrongK, letter)} = ${wrongV}`,
      `${letterTerm(k, letter)} = ${-v === v ? v + 1 : -v}`,
      `${letterTerm(k, letter)} = ${wrongV === v ? v + 2 : wrongV}`,
    );
  },
  sample: sampleAnyMatch,
  render: (params): Slide => {
    const { letter, k, v } = eliminate(params, params.match);
    const gone = letter === 'x' ? 'y' : 'x';
    const c1 = c1Of(params);
    const c2 = c2Of(params);
    const [u, w] = params.match.startsWith('x') ? [params.b1, params.b2] : [params.a1, params.a2];
    const answer = [letterTerm(k, letter), `${v}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Eliminate $${gone}$ by adding or subtracting the equations. Write what is left, keeping the $${letter}$ coefficient positive.`,
        },
        { kind: 'display', tex: sysTex(params) },
      ],
      template: '{0} = {1}',
      bank: bankOf(answer, [
        letterTerm(u + w === 0 ? k + 1 : u + w, letter),
        letterTerm(u - w === 0 ? k + 1 : Math.abs(u - w), letter),
        `${c1 + c2}`,
        `${c1 - c2}`,
        `${c2 - c1}`,
      ]),
      answer,
    };
  },
  solution: (params) => matchSolution(params, params.match),
};

interface SolveParams extends Sys {
  ask: 'x' | 'y';
}

/**
 * A matched pair solved to one value.
 *
 * Eliminate, solve what is left, and — when the question asks for the letter
 * that was eliminated — put the value back in. The slips on offer are the
 * other letter's value and a sign lost in the subtraction.
 */
const elimSolve: Generator<SolveParams & { match: Match }> = {
  id: 'lin-elim-solve',
  choices: (params) => {
    const target = params.ask === 'x' ? params.x : params.y;
    const other = params.ask === 'x' ? params.y : params.x;
    return numberChoices(target, other, -target, target + 1);
  },
  sample: (rng, difficulty) => ({ ...sampleAnyMatch(rng, difficulty), ask: rng.pick(['x', 'y'] as const) }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Solve the pair by elimination, and give $${params.ask}$.` },
      { kind: 'display', tex: sysTex(params) },
    ],
    lead: `${params.ask} =`,
    keypad: [],
    answer: `${params.ask === 'x' ? params.x : params.y}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => matchSolution(params, params.match),
};

/* ---------- Lesson 3: elimination with scaling ---------- */

interface ScaleParams extends Sys {
  /** The letter to match. */
  letter: 'x' | 'y';
  /** The equation that gets multiplied. */
  scaled: 1 | 2;
  /** What it is multiplied by. */
  k: number;
  slot: number;
}

/**
 * A pair where one equation, multiplied up, matches a letter in the other.
 *
 * The scaled equation's coefficient of the chosen letter is $m$ and the
 * other's is $\pm km$. The other letter's coefficients differ in size, before
 * and after scaling, so there is exactly one sensible move.
 */
function sampleScale(rng: Rng, difficulty: number): ScaleParams {
  const hard = difficulty > 1;
  return drawUntil(
      () => {
      const letter = rng.pick(['x', 'y'] as const);
      const scaled = rng.pick([1, 2] as const);
      const k = rng.int(2, hard ? 5 : 4);
      const m = rng.int(1, hard ? 3 : 2);
      const big = (hard ? rng.pick([1, -1]) : 1) * k * m;
      const u = rng.pick(hard ? nonZeroRange(-6, 6) : range(1, 6));
      const w = rng.pick(nonZeroRange(-6, 6));
      const small = m;
      const [ownLetter, otherLetter] = scaled === 1 ? [small, big] : [big, small];
      const [ownOther, otherOther] = scaled === 1 ? [u, w] : [w, u];
      const coefficients =
        letter === 'x'
          ? { a1: ownLetter, a2: otherLetter, b1: ownOther, b2: otherOther }
          : { b1: ownLetter, b2: otherLetter, a1: ownOther, a2: otherOther };
      return { ...coefficients, ...drawSolution(rng, hard), letter, scaled, k, slot: rng.int(0, 3) };
    },
    (p) => {
      const [su, sw] = p.letter === 'x' ? [p.b1, p.b2] : [p.a1, p.a2];
      const scaledOther = p.scaled === 1 ? su * p.k : sw * p.k;
      const otherOther = p.scaled === 1 ? sw : su;
      return (
        p.a1 * p.b2 !== p.a2 * p.b1 &&
        Math.abs(su) !== Math.abs(sw) &&
        Math.abs(scaledOther) !== Math.abs(otherOther) &&
        p.a1 > 0
      );
    },
    { a1: 1, b1: 2, a2: 3, b2: -1, x: 2, y: 3, letter: 'x', scaled: 1, k: 3, slot: 0 },
  );
}

/** The scaled equation, with its coefficients and right-hand side. */
function scaledEquation(p: ScaleParams): { a: number; b: number; c: number } {
  return p.scaled === 1
    ? { a: p.a1 * p.k, b: p.b1 * p.k, c: c1Of(p) * p.k }
    : { a: p.a2 * p.k, b: p.b2 * p.k, c: c2Of(p) * p.k };
}

function scaleSolution(p: ScaleParams): SolutionStep[] {
  const { a, b, c } = scaledEquation(p);
  const other = p.scaled === 1 ? 2 : 1;
  return [
    {
      text: `The $${p.letter}$ coefficient in (${other}) is $${p.k}$ times the one in (${p.scaled}), so multiply **every** term of (${p.scaled}) by $${p.k}$.`,
    },
    { tex: `${eqTex(a, b, c)} \\quad (${p.scaled}')` },
    { text: `Now the $${p.letter}$ coefficients are the same size, and adding or subtracting cancels them.` },
    { tex: `x = ${p.x}, \\quad y = ${p.y}` },
  ];
}

/**
 * Which equation to scale, and by what?
 *
 * The one whose coefficient of the chosen letter divides the other's. The
 * wrong options are the other equation by the same number, the right equation
 * by the wrong number, and both — each of which leaves the coefficients
 * still different. The right answer's position is drawn with the question,
 * because four labels this alike hash to only a couple of rotations.
 */
const scaleChoice: Generator<ScaleParams> = {
  id: 'lin-scale-choice',
  sample: sampleScale,
  render: (params): Slide => {
    const { letter, scaled, k, slot } = params;
    const other = scaled === 1 ? 2 : 1;
    const right = { id: 'right', label: `\\text{multiply (${scaled}) by } ${k}`, tex: true };
    const wrong = [
      { id: 'other', label: `\\text{multiply (${other}) by } ${k}`, tex: true },
      { id: 'factor', label: `\\text{multiply (${scaled}) by } ${k + 1}`, tex: true },
      { id: 'both', label: `\\text{multiply both by } ${k}`, tex: true },
    ];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `To eliminate $${letter}$, the $${letter}$ coefficients have to be the same size. What should you do first?` },
        { kind: 'display', tex: sysTex(params) },
      ],
      options: [...wrong.slice(0, slot), right, ...wrong.slice(slot)],
      correctId: 'right',
    };
  },
  solution: scaleSolution,
};

/**
 * Writing out the scaled equation, placed as tiles.
 *
 * The slip is multiplying only the term that needed matching, so the bank
 * holds the unscaled $y$ term and the unscaled right-hand side beside the
 * scaled ones.
 */
const scaleEquation: Generator<ScaleParams> = {
  id: 'lin-scale-equation',
  choices: (params) => {
    const { a, b, c } = scaledEquation(params);
    const own = params.scaled === 1 ? { a: params.a1, b: params.b1, c: c1Of(params) } : { a: params.a2, b: params.b2, c: c2Of(params) };
    return labelChoices(eqTex(a, b, c), eqTex(a, own.b, own.c), eqTex(a, b, own.c), eqTex(a, own.b, c));
  },
  sample: sampleScale,
  render: (params): Slide => {
    const { scaled, k } = params;
    const { a, b, c } = scaledEquation(params);
    const own = scaled === 1 ? { a: params.a1, b: params.b1, c: c1Of(params) } : { a: params.a2, b: params.b2, c: c2Of(params) };
    const answer = [termTex(a, 1), signedTile(b, 'y'), `${c}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Multiply equation (${scaled}) by $${k}$. Write the new equation.` },
        { kind: 'display', tex: sysTex(params) },
      ],
      template: '{0} {1} = {2}',
      bank: bankOf(answer, [termTex(own.a, 1), signedTile(own.b, 'y'), `${own.c}`, `${own.c + k}`, signedTile(-b, 'y')]),
      answer,
    };
  },
  solution: scaleSolution,
};

/**
 * A scaled pair solved to one value.
 */
const scaleSolve: Generator<ScaleParams & { ask: 'x' | 'y' }> = {
  id: 'lin-scale-solve',
  choices: (params) => {
    const target = params.ask === 'x' ? params.x : params.y;
    const other = params.ask === 'x' ? params.y : params.x;
    return numberChoices(target, other, -target, target * params.k);
  },
  sample: (rng, difficulty) => ({ ...sampleScale(rng, difficulty), ask: rng.pick(['x', 'y'] as const) }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Solve the pair, scaling one equation first, and give $${params.ask}$.` },
      { kind: 'display', tex: sysTex(params) },
    ],
    lead: `${params.ask} =`,
    keypad: [],
    answer: `${params.ask === 'x' ? params.x : params.y}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: scaleSolution,
};

/** Pairs of coprime coefficients for scaling both equations. */
const COPRIME: readonly [number, number][] = [
  [2, 3],
  [3, 2],
  [2, 5],
  [5, 2],
  [3, 4],
  [4, 3],
  [3, 5],
  [5, 3],
  [4, 5],
  [5, 4],
];

/**
 * Scaling **both** equations, worked as two strands of a tree.
 *
 * The $x$ coefficients share no factor, so each equation is multiplied by the
 * other's: equation (1) by $a_2$ and (2) by $a_1$. Each strand gives a new $y$
 * coefficient and a new right-hand side; subtracting pairs them off, and
 * dividing gives $y$. At difficulty 1 every $y$ coefficient is positive and
 * the subtraction leaves a positive one.
 */
const scaleTree: Generator<Sys> = {
  id: 'lin-scale-tree',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const [a1, a2] = rng.pick(COPRIME);
        return {
          a1,
          a2,
          b1: rng.pick(difficulty > 1 ? nonZeroRange(-5, 5) : range(1, 5)),
          b2: rng.pick(difficulty > 1 ? nonZeroRange(-5, 5) : range(1, 5)),
          ...drawSolution(rng, difficulty > 1),
        };
      },
      (s) => {
        const k = s.a2 * s.b1 - s.a1 * s.b2;
        return difficulty > 1 ? k !== 0 : k > 0;
      },
      { a1: 2, b1: 3, a2: 3, b2: 1, x: 2, y: 1 },
    ),
  render: (s): Slide => {
    const p = s.a2 * s.b1;
    const q = s.a2 * c1Of(s);
    const r = s.a1 * s.b2;
    const t = s.a1 * c2Of(s);
    const answer = [`${p}`, `${r}`, `${q}`, `${t}`, `${p - r}`, `${q - t}`, `${s.y}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Eliminate $x$: multiply (1) by $${s.a2}$ and (2) by $${s.a1}$, then subtract. Fill the tree: the two new $y$ coefficients, the two new right-hand sides, what subtracting leaves of each, and then $y$.`,
        },
        { kind: 'display', tex: sysTex(s) },
      ],
      expression: `${s.a2} \\times (1) - ${s.a1} \\times (2)`,
      nodes: [
        { id: 'y1', from: [] },
        { id: 'y2', from: [] },
        { id: 'c1', from: [] },
        { id: 'c2', from: [] },
        { id: 'y', from: ['y1', 'y2'] },
        { id: 'c', from: ['c1', 'c2'] },
        { id: 'answer', from: ['y', 'c'] },
      ],
      bank: treeBank(answer, [p + r, q + t, s.b1 * s.a1, s.x], s.y),
      answer,
    };
  },
  solution: (s) => {
    const p = s.a2 * s.b1;
    const r = s.a1 * s.b2;
    return [
      { text: `$${s.a1}$ and $${s.a2}$ share no factor, so multiply each equation by the other's $x$ coefficient. Both $x$ terms become $${s.a1 * s.a2}x$.` },
      { tex: `${eqTex(s.a1 * s.a2, p, s.a2 * c1Of(s))} \\quad ${s.a2} \\times (1)` },
      { tex: `${eqTex(s.a1 * s.a2, r, s.a1 * c2Of(s))} \\quad ${s.a1} \\times (2)` },
      { text: 'Subtract, and the $x$ terms cancel.' },
      { tex: solvedTex(yTerm(p - r), s.a2 * c1Of(s) - s.a1 * c2Of(s), 'y', s.y) },
      { text: `Putting $y = ${s.y}$ back into (1) gives $x = ${s.x}$.` },
    ];
  },
};

/* ---------- Lesson 4: substitution ---------- */

interface SubjectParams {
  form: 'plus' | 'minus-first' | 'minus-y';
  a: number;
  c: number;
}

/** y = m x + k from each form. */
function subjectLine({ form, a, c }: SubjectParams): { m: number; k: number } {
  if (form === 'plus') return { m: -a, k: c };
  if (form === 'minus-first') return { m: a, k: c };
  return { m: a, k: -c };
}

function subjectTex({ form, a, c }: SubjectParams): string {
  if (form === 'plus') return `${termTex(a, 1)} + y = ${c}`;
  if (form === 'minus-first') return `y ${signedTile(-a, 'x')} = ${c}`;
  return `${termTex(a, 1)} - y = ${c}`;
}

/**
 * Making $y$ the subject: the first move of substitution.
 *
 * Typed rather than tiled because every correct form is equally correct —
 * $7 - 3x$ and $-3x + 7$ are the same line — and the checker compares
 * values. Difficulty 2 has a $-y$ to deal with, where the whole right-hand
 * side changes sign.
 */
const subRearrange: Generator<SubjectParams> = {
  id: 'lin-sub-rearrange',
  choices: (params) => {
    const { m, k } = subjectLine(params);
    const form = (mm: number, kk: number) => ({ tex: `y = ${linTex(mm, kk)}`, answer: `(${mm})*x + (${kk})` });
    return options(form(m, k), form(-m, k), form(m, -k), form(-m, -k));
  },
  sample: (rng, difficulty) => ({
    form: rng.pick(difficulty > 1 ? (['plus', 'minus-first', 'minus-y'] as const) : (['plus', 'minus-first'] as const)),
    a: rng.pick(difficulty > 1 ? nonZeroRange(-9, 9) : range(2, 9)),
    c: rng.pick(nonZeroRange(-15, 15)),
  }),
  render: (params): Slide => {
    const { m, k } = subjectLine(params);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Make $y$ the subject, ready to substitute into another equation.' },
        { kind: 'display', tex: subjectTex(params) },
      ],
      lead: 'y =',
      keypad: ALGEBRA_KEYS,
      answer: `(${m})*x + (${k})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { m, k } = subjectLine(params);
    const { form, a } = params;
    if (form === 'minus-y') {
      return [
        { tex: subjectTex(params) },
        { text: `Take $${termTex(a, 1)}$ from both sides, leaving $-y$ on the left.` },
        { tex: `-y = ${linTex(-a, params.c)}` },
        { text: 'Multiply every term by $-1$: every sign changes.' },
        { tex: `y = ${linTex(m, k)}` },
      ];
    }
    return [
      { tex: subjectTex(params) },
      { text: `Move the $x$ term to the other side, changing its sign as it crosses.` },
      { tex: `y = ${linTex(m, k)}` },
    ];
  },
};

interface SubParams {
  /** y = m x + k is equation (1). */
  m: number;
  k: number;
  /** a x + b y = c is equation (2). */
  a: number;
  b: number;
  x: number;
}

function subY({ m, k, x }: SubParams): number {
  return m * x + k;
}

function subC(p: SubParams): number {
  return p.a * p.x + p.b * subY(p);
}

function subSysTex(p: SubParams): string {
  return systemTex(`y = ${linTex(p.m, p.k)}`, eqTex(p.a, p.b, subC(p)));
}

/** After substituting and collecting: the coefficient of x and the number. */
function subCollected(p: SubParams): { A: number; B: number } {
  return { A: p.a + p.b * p.m, B: p.b * p.k };
}

function sampleSub(rng: Rng, difficulty: number, minA = 1): SubParams {
  const hard = difficulty > 1;
  return drawUntil(
      () => ({
      m: rng.pick(hard ? nonZeroRange(-4, 4) : range(1, 4)),
      k: rng.pick(nonZeroRange(-6, 6)),
      a: rng.int(1, 6),
      b: rng.pick(hard ? [-4, -3, -2, 2, 3, 4] : [2, 3, 4]),
      x: rng.pick(nonZeroRange(hard ? -5 : 1, 8)),
    }),
    (p) => {
      const { A } = subCollected(p);
      return A >= minA && subY(p) !== 0 && subY(p) !== p.x && p.a !== p.m;
    },
    { m: 2, k: -1, a: 3, b: 2, x: 2 },
  );
}

function subSolution(p: SubParams): SolutionStep[] {
  const { A, B } = subCollected(p);
  const c = subC(p);
  return [
    { text: 'Equation (1) says what $y$ is, so put that expression into (2) in place of $y$.' },
    { tex: `${termTex(p.a, 1)} ${p.b < 0 ? '-' : '+'} ${Math.abs(p.b)}(${linTex(p.m, p.k)}) = ${c}` },
    { tex: `${linTex(A, B)} = ${c}` },
    { tex: solvedTex(termTex(A, 1), c - B, 'x', p.x) },
    { text: `Then (1) gives $y = ${p.m} \\times ${br(p.x)} ${signedTile(p.k)} = ${subY(p)}$.` },
  ];
}

/**
 * Substituting and collecting, placed as tiles.
 *
 * The number outside the bracket multiplies both terms of the expression for
 * $y$; forgetting it on the number is the slip the bank is built around, and
 * forgetting it on the $x$ term is the other.
 */
const subCollect: Generator<SubParams> = {
  id: 'lin-sub-collect',
  choices: (params) => {
    const { A, B } = subCollected(params);
    const c = subC(params);
    const eq = (x: number, n: number) => `${linTex(x, n)} = ${c}`;
    return labelChoices(eq(A, B), eq(A, params.k), eq(params.a + params.m === A ? A + 1 : params.a + params.m, B), eq(A, -B));
  },
  sample: (rng, difficulty) => sampleSub(rng, difficulty),
  render: (params): Slide => {
    const { A, B } = subCollected(params);
    const c = subC(params);
    const answer = [termTex(A, 1), signedTile(B)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Substitute (1) into (2) and collect the $x$ terms. What equation in $x$ is left?' },
        { kind: 'display', tex: subSysTex(params) },
      ],
      template: `{0} {1} = ${c}`,
      bank: bankOf(answer, [
        termTex(params.a + params.m === A || params.a + params.m === 0 ? A + 1 : params.a + params.m, 1),
        signedTile(params.k),
        signedTile(-B),
        termTex(params.a - params.b * params.m === 0 ? A + 2 : params.a - params.b * params.m, 1),
      ]),
      answer,
    };
  },
  solution: subSolution,
};

interface SubAskParams extends SubParams {
  ask: 'x' | 'y';
}

/**
 * Substitution solved to one value.
 */
const substitution: Generator<SubAskParams> = {
  id: 'lin-sub',
  choices: (params) => {
    const target = params.ask === 'x' ? params.x : subY(params);
    const other = params.ask === 'x' ? subY(params) : params.x;
    return numberChoices(target, other, -target, target + 2);
  },
  sample: (rng, difficulty) => ({ ...sampleSub(rng, difficulty), ask: rng.pick(['x', 'y'] as const) }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Solve the pair by substitution, and give $${params.ask}$.` },
      { kind: 'display', tex: subSysTex(params) },
    ],
    lead: `${params.ask} =`,
    keypad: [],
    answer: `${params.ask === 'x' ? params.x : subY(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: subSolution,
};

/**
 * Substitution as lines of working: expand, collect, clear, divide.
 *
 * The substituted equation is the starting line, so what is practised is the
 * level 1 algebra that follows — which is where substitution actually goes
 * wrong, at the bracket.
 */
const substitutionSteps: Generator<SubAskParams> = {
  id: 'lin-sub-steps',
  sample: (rng, difficulty) => ({ ...sampleSub(rng, difficulty, 2), ask: 'x' }),
  render: (params): Slide => {
    const { a, b, m, k, x } = params;
    const { A, B } = subCollected(params);
    const c = subC(params);
    const lead = termTex(a, 1);
    const expanded = (xs: number, ns: number) => `${lead} ${signedTile(xs, 'x')} ${signedTile(ns)} = ${c}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `(1) has been put into (2) in place of $y$, where (1) is $y = ${linTex(m, k)}$. Finish solving for $x$. ${HOW_TO_STEP}`,
        },
      ],
      start: [lead, `{} ${b < 0 ? '-' : '+'} ${Math.abs(b)}(${linTex(m, k)})`, '=', `${c}`],
      reductions: [
        {
          span: [0, 4],
          operator: 1,
          value: expanded(b * m, b * k),
          bank: stepBank(expanded(b * m, b * k), expanded(b * m, k), expanded(m, b * k), expanded(b * m, -b * k)),
        },
        {
          span: [0, 1],
          value: `${linTex(A, B)} = ${c}`,
          bank: stepBank(`${linTex(A, B)} = ${c}`, `${linTex(a - b * m === 0 ? A + 1 : a - b * m, B)} = ${c}`, `${linTex(A, -B)} = ${c}`),
        },
        {
          span: [0, 1],
          value: `${termTex(A, 1)} = ${c - B}`,
          bank: stepBank(`${termTex(A, 1)} = ${c - B}`, `${termTex(A, 1)} = ${c + B}`, `${termTex(A, 1)} = ${B - c}`),
        },
        {
          span: [0, 1],
          value: `x = ${x}`,
          bank: stepBank(`x = ${x}`, `x = ${c - B - A}`, `x = ${-x}`, `x = ${(c - B) * A}`),
        },
      ],
    };
  },
  solution: subSolution,
};

type Method = 'sub' | 'elim' | 'scale';

interface MethodParams extends Sys {
  method: Method;
}

const METHOD_YES = 'Yes';
const METHOD_NO = 'No';

/**
 * Substitution, elimination, or scale first?
 *
 * A letter already on its own — a coefficient of $1$ — makes substitution
 * quickest; a matched coefficient makes elimination quickest; otherwise
 * scale, then eliminate. The three cases are drawn equally, and no
 * coefficient of $1$ appears outside the substitution case, so the first
 * question always has a clear answer.
 */
const methodFlow: Generator<MethodParams> = {
  id: 'lin-method-flow',
  sample: (rng, difficulty) => {
    const method = rng.pick(['sub', 'elim', 'scale'] as const);
    const hard = difficulty > 1;
    const big = hard ? [-5, -4, -3, -2, 2, 3, 4, 5] : [-4, -3, -2, 2, 3, 4, 5];
    if (method === 'elim') {
      const match = rng.pick(['x-same', 'x-opp', 'y-same', 'y-opp'] as const);
      return {
        ...drawUntil(
      () => sampleMatch(rng, match, hard),
          (s) => [s.a1, s.a2, s.b1, s.b2].every((v) => Math.abs(v) >= 2),
          { a1: 3, b1: 2, a2: 3, b2: -4, x: 2, y: 1 },
        ),
        method,
      };
    }
    if (method === 'scale') {
      return {
        ...drawUntil(
      () => sampleSys(rng, hard, big),
          (s) => Math.abs(s.a1) !== Math.abs(s.a2) && Math.abs(s.b1) !== Math.abs(s.b2),
          { a1: 2, b1: 3, a2: 3, b2: -4, x: 2, y: 1 },
        ),
        method,
      };
    }
    const s = sampleSys(rng, hard, big);
    // One coefficient of 1, in a place drawn with the question.
    const spot = rng.int(0, 3);
    return {
      ...s,
      a1: spot === 0 ? 1 : s.a1,
      b1: spot === 1 ? rng.pick([1, -1]) : s.b1,
      a2: spot === 2 ? 1 : s.a2,
      b2: spot === 3 ? rng.pick([1, -1]) : s.b2,
      method,
    };
  },
  render: (params): Slide => ({
    kind: 'flow',
    prompt: [{ kind: 'prose', text: 'Which method gets to the solution most directly?' }],
    subject: sysTex(params),
    steps: [
      {
        id: 'alone',
        ask: 'Does any letter have a coefficient of $1$ or $-1$?',
        branches: [
          { label: METHOD_YES, outcome: 'Substitution: make that letter the subject, then put it into the other equation.' },
          { label: METHOD_NO, to: 'match' },
        ],
      },
      {
        id: 'match',
        ask: 'Does either letter have coefficients of the same size in both equations?',
        branches: [
          { label: METHOD_YES, outcome: 'Elimination: add or subtract the equations as they stand.' },
          { label: METHOD_NO, outcome: 'Scale one or both equations until a letter matches, then eliminate.' },
        ],
      },
    ],
    answer: params.method === 'sub' ? [METHOD_YES] : [METHOD_NO, params.method === 'elim' ? METHOD_YES : METHOD_NO],
  }),
  solution: (params) => {
    const { method } = params;
    return [
      { tex: sysTex(params) },
      {
        text:
          method === 'sub'
            ? 'One letter has a coefficient of $\\pm 1$, so it can be made the subject without fractions and substituted.'
            : method === 'elim'
              ? 'No coefficient is $\\pm 1$, but one letter already has coefficients of the same size, so adding or subtracting removes it straight away.'
              : 'No coefficient is $\\pm 1$ and no letter matches, so multiply until one does, then eliminate.',
      },
      { text: `Either way the solution is $x = ${params.x}$, $y = ${params.y}$ — the method changes the route, not the answer.` },
    ];
  },
};

/* ---------- Lesson 5: pairs from words ---------- */

interface Items {
  first: string;
  second: string;
  plural: [string, string];
  unit: 'pounds' | 'pence';
}

const ITEMS: readonly Items[] = [
  { first: 'an adult ticket', second: 'a child ticket', plural: ['adult', 'child'], unit: 'pounds' },
  { first: 'a coffee', second: 'a cake', plural: ['coffees', 'cakes'], unit: 'pounds' },
  { first: 'an apple', second: 'a pear', plural: ['apples', 'pears'], unit: 'pence' },
  { first: 'a notebook', second: 'a pen', plural: ['notebooks', 'pens'], unit: 'pounds' },
  { first: 'a first-class stamp', second: 'a second-class stamp', plural: ['first-class', 'second-class'], unit: 'pence' },
  { first: 'a pizza', second: 'a drink', plural: ['pizzas', 'drinks'], unit: 'pounds' },
];

interface WordsPairParams {
  item: number;
  p1: number;
  q1: number;
  p2: number;
  q2: number;
  x: number;
  y: number;
  /** Whether the second sentence names the second item first. */
  flipped: boolean;
}

function money(value: number, unit: Items['unit']): string {
  return unit === 'pounds' ? `£$${value}$` : `$${value}$p`;
}

function purchase(items: Items, p: number, q: number, total: number, flipped: boolean): string {
  const [a, b] = items.plural;
  const ticket = items.plural[0] === 'adult' || items.plural[0] === 'first-class';
  const noun = items.plural[0] === 'adult' ? ' tickets' : ' stamps';
  const count = (n: number, word: string) => {
    const full = `${word}${ticket ? noun : ''}`;
    return `$${n}$ ${n === 1 ? full.replace(/s$/, '') : full}`;
  };
  const one = count(p, a);
  const two = count(q, b);
  return `${flipped ? `${two} and ${one}` : `${one} and ${two}`} cost ${money(total, items.unit)}.`;
}

function sampleWordsPair(rng: Rng, difficulty: number): WordsPairParams {
  const hard = difficulty > 1;
  return drawUntil(
      () => {
      const item = rng.int(0, ITEMS.length - 1);
      const pence = ITEMS[item].unit === 'pence';
      return {
        item,
        p1: rng.int(1, 5),
        q1: rng.int(1, 5),
        p2: rng.int(2, 6),
        q2: rng.int(2, 6),
        x: pence ? 5 * rng.int(4, hard ? 30 : 16) : rng.int(2, hard ? 20 : 12),
        y: pence ? 5 * rng.int(2, hard ? 24 : 12) : rng.int(1, hard ? 15 : 9),
        flipped: rng.chance(0.4),
      };
    },
    (p) => p.p1 * p.q2 !== p.p2 * p.q1 && p.x !== p.y && !(p.p1 === p.p2 && p.q1 === p.q2),
    { item: 0, p1: 2, q1: 3, p2: 3, q2: 2, x: 8, y: 5, flipped: false },
  );
}

function wordsPairIntro(p: WordsPairParams): string {
  const items = ITEMS[p.item];
  return `Let $x$ be the price of ${items.first} and $y$ the price of ${items.second}, in ${items.unit}.`;
}

function wordsPairSolution(p: WordsPairParams): SolutionStep[] {
  const t1 = p.p1 * p.x + p.q1 * p.y;
  const t2 = p.p2 * p.x + p.q2 * p.y;
  return [
    { text: 'Each sentence is one equation: the number of each item times its price, added up.' },
    { tex: systemTex(eqTex(p.p1, p.q1, t1), eqTex(p.p2, p.q2, t2)) },
    { text: `Solving the pair gives $x = ${p.x}$ and $y = ${p.y}$.` },
    { text: `Check in the words: $${p.p1} \\times ${p.x} + ${p.q1} \\times ${p.y} = ${t1}$.` },
  ];
}

/**
 * The second equation of a worded pair, placed as tiles.
 *
 * The first equation is written out as a model; the second has to be read
 * from its sentence, which sometimes names the items the other way round —
 * so the template's order, $x$ then $y$, has to be matched to the words
 * rather than copied from them.
 */
const wordsSetup: Generator<WordsPairParams> = {
  id: 'lin-sim-words-setup',
  choices: (p) => {
    const t2 = p.p2 * p.x + p.q2 * p.y;
    return labelChoices(eqTex(p.p2, p.q2, t2), eqTex(p.q2, p.p2, t2), eqTex(p.p2, p.q2, p.p1 * p.x + p.q1 * p.y), eqTex(p.p2 + 1, p.q2, t2));
  },
  sample: sampleWordsPair,
  render: (p): Slide => {
    const items = ITEMS[p.item];
    const t1 = p.p1 * p.x + p.q1 * p.y;
    const t2 = p.p2 * p.x + p.q2 * p.y;
    const answer = [`${p.p2}`, `${p.q2}`, `${t2}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: wordsPairIntro(p) },
        { kind: 'prose', text: `${purchase(items, p.p1, p.q1, t1, false)} That gives $${eqTex(p.p1, p.q1, t1)}$.` },
        { kind: 'prose', text: `${purchase(items, p.p2, p.q2, t2, p.flipped)} Write this second equation.` },
      ],
      template: '{0}x + {1}y = {2}',
      bank: bankOf(answer, [`${p.p1}`, `${p.q1}`, `${t1}`, `${p.p2 + p.q2}`]),
      answer,
    };
  },
  solution: wordsPairSolution,
};

/**
 * A worded pair solved to one price.
 */
const wordsPairSolve: Generator<WordsPairParams & { ask: 'x' | 'y' }> = {
  id: 'lin-sim-words-solve',
  choices: (p) => {
    const target = p.ask === 'x' ? p.x : p.y;
    const other = p.ask === 'x' ? p.y : p.x;
    return numberChoices(target, other, target + (ITEMS[p.item].unit === 'pence' ? 5 : 1), Math.abs(p.x - p.y));
  },
  sample: (rng, difficulty) => ({ ...sampleWordsPair(rng, difficulty), ask: rng.pick(['x', 'y'] as const) }),
  render: (p): Slide => {
    const items = ITEMS[p.item];
    const t1 = p.p1 * p.x + p.q1 * p.y;
    const t2 = p.p2 * p.x + p.q2 * p.y;
    const name = p.ask === 'x' ? items.first : items.second;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `${purchase(items, p.p1, p.q1, t1, false)} ${purchase(items, p.p2, p.q2, t2, p.flipped)}` },
        { kind: 'prose', text: `How much is ${name}, in ${items.unit}?` },
      ],
      lead: `\\text{${name.replace(/^an? /, '')}} =`,
      keypad: [],
      answer: `${p.ask === 'x' ? p.x : p.y}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: wordsPairSolution,
};

type SumDiffStory = 'numbers' | 'ages' | 'parcels';

interface SumDiffParams {
  story: SumDiffStory;
  big: number;
  small: number;
  ask: 'larger' | 'smaller';
}

/**
 * Two numbers from their sum and difference.
 *
 * $x + y = S$ and $x - y = D$ is the one pair where elimination fits on a
 * single line: adding gives $2x = S + D$, subtracting gives $2y = S - D$. So
 * the question is a reduction — the bracket first, then the halving — and the
 * two numbers always have the same parity so the halving comes out whole.
 */
const sumDiff: Generator<SumDiffParams> = {
  id: 'lin-sum-diff',
  choices: ({ big, small, ask }) => {
    const s = big + small;
    const d = big - small;
    return ask === 'larger' ? numberChoices(big, small, s + d, s / 2) : numberChoices(small, big, s - d, s / 2);
  },
  sample: (rng, difficulty) => {
    const small = rng.int(difficulty > 1 ? 5 : 1, difficulty > 1 ? 60 : 30);
    return {
      story: rng.pick(['numbers', 'ages', 'parcels'] as const),
      big: small + rng.int(1, difficulty > 1 ? 30 : 15),
      small,
      ask: rng.pick(['larger', 'smaller'] as const),
    };
  },
  render: ({ story, big, small, ask }): Slide => {
    const s = big + small;
    const d = big - small;
    const text: Record<SumDiffStory, string> = {
      numbers: `Two numbers add up to $${s}$ and differ by $${d}$.`,
      ages: `A mother and her son's ages add up to $${s}$, and she is $${d}$ years older.`,
      parcels: `Two parcels weigh $${s}$ kg together, and one is $${d}$ kg heavier than the other.`,
    };
    const expr = bin('/', bin(ask === 'larger' ? '+' : '-', num(s), num(d)), num(2));
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `${text[story]} ${ask === 'larger' ? 'Adding' : 'Subtracting'} the equations $x + y = ${s}$ and $x - y = ${d}$ gives the ${ask} one as the expression below. ${HOW_TO_REDUCE}`,
        },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: ({ big, small, ask }) => {
    const s = big + small;
    const d = big - small;
    return ask === 'larger'
      ? [
          { tex: `(x + y) + (x - y) = ${s} + ${d}` },
          { tex: `2x = ${s + d} \\implies x = ${big}` },
          { text: `The larger is $${big}$, and the other is $${s} - ${big} = ${small}$.` },
        ]
      : [
          { tex: `(x + y) - (x - y) = ${s} - ${d}` },
          { tex: `2y = ${s - d} \\implies y = ${small}` },
          { text: `The smaller is $${small}$, and the other is $${s} - ${small} = ${big}$.` },
        ];
  },
};

/* ======================================================================
 * Level 3: Rearranging Formulae
 * ==================================================================== */

/**
 * A formula, one of its letters to make the subject, and everything the
 * level's generators ask about getting there.
 *
 * Each question shape reads a different part of it — the typed slide the
 * result, the choice slide the slips, the working slides the lines, the flow
 * the recipe — so a formula is written out once and its answer, its working
 * and its wrong turns cannot fall out of step with one another.
 */
export interface Formula {
  /** The formula as the learner reads it. */
  tex: string;
  /** The letter being made the subject. */
  subject: string;
  /** Every letter in the formula, in reading order: the keypad offers each. */
  letters: string[];
  /** Whether π appears, so the keypad offers it too. */
  pi?: boolean;
  /** What the subject equals once it is alone: TeX, then mathjs. */
  resultTex: string;
  answer: string;
  /** The same result written another way, equally correct. */
  altTex?: string;
  /**
   * The formula's two sides in mathjs. Never displayed: a test puts `answer`
   * back in place of the subject and checks the two sides still agree, which
   * is an independent check on the rearrangement rather than the generator
   * agreeing with itself.
   */
  left: string;
  right: string;
  /** Tempting wrong results, each with its mathjs so a test can prove it wrong. */
  slips: { tex: string; answer: string }[];
  /** The working after the formula, one whole equation per operation undone. */
  lines: string[];
  /** What each line did, in words. */
  moves: string[];
  /** Tempting wrong versions of each line, for a steps bank. */
  lineSlips: string[][];
}

const fr = (top: string, bottom: string): string => `\\frac{${top}}{${bottom}}`;

/**
 * A key for one letter of a formula.
 *
 * It inserts the letter bracketed, `(a)`, which the answer box shows as the
 * bare letter (see `applyKey` in `src/ui/mathInput.ts`). mathjs reads `at` as
 * one symbol named "at" and `b(l + w)` as a call to a function named b, so a
 * learner typing $u + at$ or $b(l + w)$ the way it is printed would otherwise
 * be marked wrong for a right answer.
 */
function letterKey(letter: string): KeypadKey {
  return { insert: `(${letter})`, label: letter };
}

/** π, bracketed for the same reason as a letter. */
const PI_KEY: KeypadKey = { insert: '(pi)', label: 'π' };

function formulaKeys(f: Formula, extra: KeypadKey[] = []): KeypadKey[] {
  return [
    ...f.letters.map(letterKey),
    ...(f.pi ? [PI_KEY] : []),
    { insert: '(' },
    { insert: ')' },
    { insert: '/' },
    { insert: '*', label: '×' },
    ...extra,
  ];
}

/** The formula, each move and line in turn, then the subject on its own. */
function formulaSolution(f: Formula): SolutionStep[] {
  const steps: SolutionStep[] = [{ tex: f.tex }];
  f.moves.forEach((text, idx) => steps.push({ text }, { tex: f.lines[idx] }));
  const last = f.lines[f.lines.length - 1];
  if (!last.startsWith(`${f.subject} = `)) steps.push({ tex: `${f.subject} = ${f.resultTex}` });
  return steps;
}

/** The typed rearrangement slide every `*-subject` generator renders. */
function subjectSlide(f: Formula, domain: 'real' | 'positive', text?: string): Slide {
  return {
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: text ?? `Make $${f.subject}$ the subject of the formula.` },
      { kind: 'display', tex: f.tex },
    ],
    lead: `${f.subject} =`,
    keypad: formulaKeys(f, domain === 'positive' ? [{ insert: '^' }, { insert: 'sqrt(' }] : []),
    answer: f.answer,
    domain,
    mode: 'exact',
  };
}

/** Four rearrangements, the correct one flagged, each carrying its mathjs. */
function subjectChoices(f: Formula, shown = f.resultTex): ChoiceOption[] {
  return options(
    { tex: `${f.subject} = ${shown}`, answer: f.answer },
    ...f.slips.map((slip) => ({ tex: `${f.subject} = ${slip.tex}`, answer: slip.answer })),
  );
}

/** A steps slide walking the formula through its lines, one operation per tap. */
function rearrangeSteps(f: Formula, parts: string[], operator: number): Slide {
  return {
    kind: 'steps',
    prompt: [
      {
        kind: 'prose',
        text: `Make $${f.subject}$ the subject, one operation at a time. ${HOW_TO_STEP}`,
      },
    ],
    start: parts,
    reductions: f.lines.map((line, idx) => ({
      span: idx === 0 ? ([0, parts.length] as [number, number]) : ([0, 1] as [number, number]),
      ...(idx === 0 ? { operator } : {}),
      value: line,
      bank: stepBank(line, ...f.lineSlips[idx]),
    })),
  };
}

/* ---------- Lesson 1: changing the subject ---------- */

/**
 * Letters for the formulae of the first two lessons: `[A, B, C, S]`, read as
 * $A = B + CS$, so the first set is $v = u + at$. The subject is always the
 * last. `e` and `i` are never used: mathjs reads them as constants.
 */
const LINEAR_SETS: readonly (readonly [string, string, string, string])[] = [
  ['v', 'u', 'a', 't'],
  ['y', 'c', 'm', 'x'],
  ['C', 'F', 'r', 'n'],
  ['s', 'p', 'q', 'r'],
  ['T', 'k', 'w', 'h'],
  ['W', 'b', 'g', 'd'],
  ['L', 'd', 'b', 'w'],
];

type LinearForm = 'add' | 'sub' | 'div' | 'mul-letter' | 'minus' | 'div-letter' | 'mul-only' | 'add-only';

interface LinearParams {
  form: LinearForm;
  set: number;
  k: number;
}

/** What was done to the subject, for the flow that asks which comes off first. */
interface Recipe {
  lastIsAdding: boolean;
  twoSteps: boolean;
  built: string;
  undone: string;
}

/**
 * The first lesson's formulae: the subject multiplied or divided, then a
 * term added or taken away — two-step equations with letters where the
 * numbers were. `mul-letter`, `minus` and `div-letter` are the harder
 * versions: a letter as the multiplier, or the subject's term subtracted.
 */
function linearFormula({ form, set, k }: LinearParams): Formula & { recipe: Recipe; undo?: [string, string, string[]] } {
  const [A, B, C, S] = LINEAR_SETS[set];
  const kS = `${k}${S}`;
  const K = `${k}`;
  if (form === 'add') {
    return {
      tex: `${A} = ${B} + ${kS}`,
      subject: S,
      letters: [A, B, S],
      resultTex: fr(`${A} - ${B}`, K),
      answer: `(${A} - ${B})/${k}`,
      altTex: `${fr(A, K)} - ${fr(B, K)}`,
      left: A,
      right: `${B} + ${k}*${S}`,
      slips: [
        { tex: fr(`${A} + ${B}`, K), answer: `(${A} + ${B})/${k}` },
        { tex: `${fr(A, K)} - ${B}`, answer: `${A}/${k} - ${B}` },
        { tex: `${k}(${A} - ${B})`, answer: `${k}*(${A} - ${B})` },
      ],
      lines: [`${A} - ${B} = ${kS}`, `${fr(`${A} - ${B}`, K)} = ${S}`],
      moves: [`Take $${B}$ from both sides.`, `Divide both sides by $${k}$.`],
      lineSlips: [
        [`${A} + ${B} = ${kS}`, `${B} - ${A} = ${kS}`, `${A} = ${kS} - ${B}`],
        [`${A} - ${fr(B, K)} = ${S}`, `${k}(${A} - ${B}) = ${S}`, `${fr(`${A} + ${B}`, K)} = ${S}`],
      ],
      recipe: { lastIsAdding: true, twoSteps: true, built: `multiply by $${k}$, then add $${B}$`, undone: `take $${B}$ from both sides, then divide by $${k}$` },
      undo: [`${A} - ${B}`, kS, [`${A} + ${B}`, `${B} - ${A}`, S, `${k}${A}`]],
    };
  }
  if (form === 'sub') {
    return {
      tex: `${A} = ${kS} - ${B}`,
      subject: S,
      letters: [A, S, B],
      resultTex: fr(`${A} + ${B}`, K),
      answer: `(${A} + ${B})/${k}`,
      altTex: `${fr(A, K)} + ${fr(B, K)}`,
      left: A,
      right: `${k}*${S} - ${B}`,
      slips: [
        { tex: fr(`${A} - ${B}`, K), answer: `(${A} - ${B})/${k}` },
        { tex: `${fr(A, K)} + ${B}`, answer: `${A}/${k} + ${B}` },
        { tex: `${k}(${A} + ${B})`, answer: `${k}*(${A} + ${B})` },
      ],
      lines: [`${A} + ${B} = ${kS}`, `${fr(`${A} + ${B}`, K)} = ${S}`],
      moves: [`Add $${B}$ to both sides.`, `Divide both sides by $${k}$.`],
      lineSlips: [
        [`${A} - ${B} = ${kS}`, `${B} - ${A} = ${kS}`, `${A} = ${kS} + ${B}`],
        [`${A} + ${fr(B, K)} = ${S}`, `${k}(${A} + ${B}) = ${S}`, `${fr(`${A} - ${B}`, K)} = ${S}`],
      ],
      recipe: { lastIsAdding: true, twoSteps: true, built: `multiply by $${k}$, then take away $${B}$`, undone: `add $${B}$ to both sides, then divide by $${k}$` },
      undo: [`${A} + ${B}`, kS, [`${A} - ${B}`, `${B} - ${A}`, S, `${k}${A}`]],
    };
  }
  if (form === 'div') {
    return {
      tex: `${A} = ${fr(S, K)} + ${B}`,
      subject: S,
      letters: [A, S, B],
      resultTex: `${k}(${A} - ${B})`,
      answer: `${k}*(${A} - ${B})`,
      altTex: `${k}${A} - ${k}${B}`,
      left: A,
      right: `${S}/${k} + ${B}`,
      slips: [
        { tex: `${k}${A} - ${B}`, answer: `${k}*${A} - ${B}` },
        { tex: fr(`${A} - ${B}`, K), answer: `(${A} - ${B})/${k}` },
        { tex: `${k}(${A} + ${B})`, answer: `${k}*(${A} + ${B})` },
      ],
      lines: [`${A} - ${B} = ${fr(S, K)}`, `${k}(${A} - ${B}) = ${S}`],
      moves: [`Take $${B}$ from both sides.`, `Multiply both sides by $${k}$.`],
      lineSlips: [
        [`${A} + ${B} = ${fr(S, K)}`, `${B} - ${A} = ${fr(S, K)}`, `${A} = ${fr(`${S} - ${B}`, K)}`],
        [`${k}${A} - ${B} = ${S}`, `${fr(`${A} - ${B}`, K)} = ${S}`, `${k}(${A} + ${B}) = ${S}`],
      ],
      recipe: { lastIsAdding: true, twoSteps: true, built: `divide by $${k}$, then add $${B}$`, undone: `take $${B}$ from both sides, then multiply by $${k}$` },
      undo: [`${A} - ${B}`, fr(S, K), [`${A} + ${B}`, `${B} - ${A}`, kS, fr(A, K)]],
    };
  }
  if (form === 'mul-letter') {
    return {
      tex: `${A} = ${B} + ${C}${S}`,
      subject: S,
      letters: [A, B, C, S],
      resultTex: fr(`${A} - ${B}`, C),
      answer: `(${A} - ${B})/${C}`,
      altTex: `${fr(A, C)} - ${fr(B, C)}`,
      left: A,
      right: `${B} + ${C}*${S}`,
      slips: [
        { tex: fr(`${A} + ${B}`, C), answer: `(${A} + ${B})/${C}` },
        { tex: `${fr(A, C)} - ${B}`, answer: `${A}/${C} - ${B}` },
        { tex: `${C}(${A} - ${B})`, answer: `${C}*(${A} - ${B})` },
      ],
      lines: [`${A} - ${B} = ${C}${S}`, `${fr(`${A} - ${B}`, C)} = ${S}`],
      moves: [`Take $${B}$ from both sides.`, `Divide both sides by $${C}$.`],
      lineSlips: [
        [`${A} + ${B} = ${C}${S}`, `${B} - ${A} = ${C}${S}`, `${A} = ${C}${S} - ${B}`],
        [`${A} - ${fr(B, C)} = ${S}`, `${C}(${A} - ${B}) = ${S}`, `${fr(`${A} + ${B}`, C)} = ${S}`],
      ],
      recipe: { lastIsAdding: true, twoSteps: true, built: `multiply by $${C}$, then add $${B}$`, undone: `take $${B}$ from both sides, then divide by $${C}$` },
      undo: [`${A} - ${B}`, `${C}${S}`, [`${A} + ${B}`, `${B} - ${A}`, S, `${C} + ${S}`]],
    };
  }
  if (form === 'minus') {
    return {
      tex: `${A} = ${B} - ${kS}`,
      subject: S,
      letters: [A, B, S],
      resultTex: fr(`${B} - ${A}`, K),
      answer: `(${B} - ${A})/${k}`,
      altTex: `${fr(B, K)} - ${fr(A, K)}`,
      left: A,
      right: `${B} - ${k}*${S}`,
      slips: [
        { tex: fr(`${A} - ${B}`, K), answer: `(${A} - ${B})/${k}` },
        { tex: fr(`${A} + ${B}`, K), answer: `(${A} + ${B})/${k}` },
        { tex: `${fr(B, K)} - ${A}`, answer: `${B}/${k} - ${A}` },
      ],
      lines: [`${A} - ${B} = -${kS}`, `${fr(`${B} - ${A}`, K)} = ${S}`],
      moves: [
        `Take $${B}$ from both sides.`,
        `Divide both sides by $-${k}$. Dividing by a negative changes both signs on the left, so $${A} - ${B}$ becomes $${B} - ${A}$.`,
      ],
      lineSlips: [
        [`${A} + ${B} = -${kS}`, `${A} - ${B} = ${kS}`, `${B} - ${A} = -${kS}`],
        [`${fr(`${A} - ${B}`, K)} = ${S}`, `${fr(`${A} + ${B}`, K)} = ${S}`, `-${k}(${A} - ${B}) = ${S}`],
      ],
      recipe: { lastIsAdding: true, twoSteps: true, built: `multiply by $${k}$, then take the result away from $${B}$`, undone: `take $${B}$ from both sides, then divide by $-${k}$` },
      // Not B - A: B - A = kS is the same line with both sides negated, and
      // tiles grade the form, so offering it would mark a right answer wrong.
      undo: [`${A} - ${B}`, `-${kS}`, [`${A} + ${B}`, kS, `-${S}`]],
    };
  }
  if (form === 'div-letter') {
    return {
      tex: `${A} = ${fr(S, C)} - ${B}`,
      subject: S,
      letters: [A, S, C, B],
      resultTex: `${C}(${A} + ${B})`,
      answer: `${C}*(${A} + ${B})`,
      altTex: `${C}${A} + ${C}${B}`,
      left: A,
      right: `${S}/${C} - ${B}`,
      slips: [
        { tex: `${C}${A} + ${B}`, answer: `${C}*${A} + ${B}` },
        { tex: fr(`${A} + ${B}`, C), answer: `(${A} + ${B})/${C}` },
        { tex: `${C}(${A} - ${B})`, answer: `${C}*(${A} - ${B})` },
      ],
      lines: [`${A} + ${B} = ${fr(S, C)}`, `${C}(${A} + ${B}) = ${S}`],
      moves: [`Add $${B}$ to both sides.`, `Multiply both sides by $${C}$.`],
      lineSlips: [
        [`${A} - ${B} = ${fr(S, C)}`, `${B} - ${A} = ${fr(S, C)}`, `${A} = ${fr(`${S} - ${B}`, C)}`],
        [`${C}${A} + ${B} = ${S}`, `${fr(`${A} + ${B}`, C)} = ${S}`, `${C}(${A} - ${B}) = ${S}`],
      ],
      recipe: { lastIsAdding: true, twoSteps: true, built: `divide by $${C}$, then take away $${B}$`, undone: `add $${B}$ to both sides, then multiply by $${C}$` },
      undo: [`${A} + ${B}`, fr(S, C), [`${A} - ${B}`, `${B} - ${A}`, `${C}${S}`, fr(A, C)]],
    };
  }
  if (form === 'mul-only') {
    return {
      tex: `${A} = ${kS}`,
      subject: S,
      letters: [A, S],
      resultTex: fr(A, K),
      answer: `${A}/${k}`,
      left: A,
      right: `${k}*${S}`,
      slips: [
        { tex: `${k}${A}`, answer: `${k}*${A}` },
        { tex: `${A} - ${k}`, answer: `${A} - ${k}` },
        { tex: fr(K, A), answer: `${k}/${A}` },
      ],
      lines: [`${fr(A, K)} = ${S}`],
      moves: [`Divide both sides by $${k}$.`],
      lineSlips: [[`${k}${A} = ${S}`, `${A} - ${k} = ${S}`, `${fr(K, A)} = ${S}`]],
      recipe: { lastIsAdding: false, twoSteps: false, built: `multiply by $${k}$`, undone: `divide both sides by $${k}$` },
    };
  }
  return {
    tex: `${A} = ${S} + ${B}`,
    subject: S,
    letters: [A, S, B],
    resultTex: `${A} - ${B}`,
    answer: `${A} - ${B}`,
    left: A,
    right: `${S} + ${B}`,
    slips: [
      { tex: `${A} + ${B}`, answer: `${A} + ${B}` },
      { tex: `${B} - ${A}`, answer: `${B} - ${A}` },
      { tex: fr(A, B), answer: `${A}/${B}` },
    ],
    lines: [`${A} - ${B} = ${S}`],
    moves: [`Take $${B}$ from both sides.`],
    lineSlips: [[`${A} + ${B} = ${S}`, `${B} - ${A} = ${S}`, `${fr(A, B)} = ${S}`]],
    recipe: { lastIsAdding: true, twoSteps: false, built: `add $${B}$`, undone: `take $${B}$ from both sides` },
  };
}

function sampleLinear(rng: Rng, forms: readonly LinearForm[]): LinearParams {
  return { form: rng.pick(forms), set: rng.int(0, LINEAR_SETS.length - 1), k: rng.int(2, 9) };
}

const EASY_LINEAR: readonly LinearForm[] = ['add', 'sub', 'div'];
const HARD_LINEAR: readonly LinearForm[] = ['mul-letter', 'minus', 'div-letter'];

/**
 * Making a letter the subject of a formula: a two-step equation with letters.
 *
 * Nothing new is being done — the subject is undone in the reverse order, as
 * the first level did for $x$ — but the answer is now an expression, so it is
 * typed with a key for every letter in the formula. Leaving a letter out, or
 * typing the subject into its own answer, grades wrong, which is right.
 * Difficulty 2 has a letter as the multiplier ($v = u + at$) or the subject's
 * term taken away, where the sign turns round.
 */
const makeSubject: Generator<LinearParams> = {
  id: 'lin-subject',
  choices: (params) => subjectChoices(linearFormula(params)),
  sample: (rng, difficulty) => sampleLinear(rng, difficulty > 1 ? HARD_LINEAR : EASY_LINEAR),
  render: (params): Slide => subjectSlide(linearFormula(params), 'real'),
  solution: (params) => formulaSolution(linearFormula(params)),
};

/**
 * Which operation comes off the subject first?
 *
 * The same reading question the first level asked of $x$, now of a letter in
 * a formula: read the side with the subject as a recipe, and the operation
 * done last comes off first. Difficulty 1 is the first lesson's formulae;
 * difficulty 2 is the second lesson's, where a bracket or a fraction bar
 * makes the last operation a multiplication or a division even though a term
 * is added inside it.
 */
const subjectFlow: Generator<LinearParams | BracketFormulaParams> = {
  id: 'lin-subject-flow',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? sampleBracketFormula(rng, ['bracket', 'bracket-minus', 'over', 'over-bracket', 'trapezium'])
      : sampleLinear(rng, ['add', 'sub', 'div', 'mul-letter', 'mul-only', 'add-only']),
  render: (params): Slide => {
    const f = recipeFormula(params);
    const { lastIsAdding, twoSteps } = f.recipe;
    const S = f.subject;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Before rearranging: in what order do the operations come off $${S}$? Read the side with $${S}$ as a recipe that starts with $${S}$.`,
        },
      ],
      subject: f.tex,
      steps: [
        {
          id: 'last',
          ask: `What was done to $${S}$ **last**?`,
          branches: [
            { label: 'Adding or subtracting a term', to: 'after-adding' },
            { label: UNDO_TIMES, to: 'after-times' },
          ],
        },
        {
          id: 'after-adding',
          ask: `Undo that first. Once it is gone, is $${S}$ still multiplied or divided by something?`,
          branches: [
            { label: UNDO_YES, outcome: 'Undo the adding or subtracting, then the multiplying or dividing.' },
            { label: UNDO_NO, outcome: `Undo the adding or subtracting and $${S}$ is alone.` },
          ],
        },
        {
          id: 'after-times',
          ask: `Undo that first. Once it is gone, is a term still added to or taken from $${S}$?`,
          branches: [
            { label: UNDO_YES, outcome: 'Undo the multiplying or dividing, then the adding or subtracting.' },
            { label: UNDO_NO, outcome: `Undo the multiplying or dividing and $${S}$ is alone.` },
          ],
        },
      ],
      answer: [lastIsAdding ? 'Adding or subtracting a term' : UNDO_TIMES, twoSteps ? UNDO_YES : UNDO_NO],
    };
  },
  solution: (params) => {
    const f = recipeFormula(params);
    return [
      { tex: f.tex },
      { text: `Starting from $${f.subject}$, the formula says: ${f.recipe.built}.` },
      { text: `Undo in the reverse order: ${f.recipe.undone}.` },
      { tex: `${f.subject} = ${f.resultTex}` },
    ];
  },
};

/**
 * The first undo, placed as tiles.
 *
 * One line of working: what is left once the term added to the subject's
 * side comes off. The bank holds the sign slips and the multiplier stripped
 * too early, which are the two mistakes the lesson is about.
 */
const firstUndoTiles: Generator<LinearParams> = {
  id: 'lin-first-undo-tiles',
  sample: (rng, difficulty) => sampleLinear(rng, difficulty > 1 ? HARD_LINEAR : EASY_LINEAR),
  render: (params): Slide => {
    const f = linearFormula(params);
    const [left, right, extras] = f.undo ?? ['', '', []];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `To make $${f.subject}$ the subject, the term added to or taken from its side comes off first. What line does that leave?`,
        },
        { kind: 'display', tex: f.tex },
      ],
      template: '{0} = {1}',
      bank: bankOf([left, right], extras),
      answer: [left, right],
    };
  },
  solution: (params) => formulaSolution(linearFormula(params)),
};

/**
 * Making the subject as lines of working, one operation per line.
 *
 * Each tap collapses the line into the next, so the learner writes down the
 * working a teacher asks for: $v - u = at$, then $\frac{v - u}{a} = t$. The
 * start is split so the term that comes off first is the one tapped.
 * Difficulty 2 is the second lesson's formulae, with a bracket or a fraction.
 */
const rearrangeStepsGen: Generator<LinearParams | BracketFormulaParams> = {
  id: 'lin-rearrange-steps',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? sampleBracketFormula(rng, ['bracket', 'bracket-minus', 'over', 'over-bracket', 'trapezium'])
      : sampleLinear(rng, ['add', 'sub', 'div', 'mul-letter', 'minus', 'div-letter']),
  render: (params): Slide => {
    const f = recipeFormula(params);
    // Split at the first " = ": the left side, the sign, then the right side
    // as one fragment, so the whole line is one reduction.
    const [left, right] = f.tex.split(' = ');
    return rearrangeSteps(f, [left, '=', right], 2);
  },
  solution: (params) => formulaSolution(recipeFormula(params)),
};

/* ---------- Lesson 2: brackets and fractions ---------- */

/** `[A, B, C, S]` for the second lesson: $P = 2(l + w)$ is the first set. */
const BRACKET_SETS: readonly (readonly [string, string, string, string])[] = [
  ['P', 'l', 'b', 'w'],
  ['A', 'a', 'b', 'h'],
  ['V', 'p', 'q', 't'],
  ['M', 'r', 's', 'n'],
  ['T', 'u', 'v', 'd'],
  ['Q', 'g', 'h', 'k'],
];

/** `[A, S]` for the fraction with a bracket on top: $C = \frac{5(F - 32)}{9}$ first. */
const SCALE_SETS: readonly (readonly [string, string])[] = [
  ['C', 'F'],
  ['y', 'x'],
  ['T', 't'],
  ['Q', 'p'],
  ['R', 's'],
  ['H', 'g'],
];

/** Multiplier and divisor pairs with nothing in common, so neither cancels. */
const SCALE_PAIRS: readonly (readonly [number, number])[] = [
  [5, 9], [2, 3], [3, 2], [3, 4], [4, 3], [2, 5], [5, 2], [3, 5], [5, 3], [4, 7], [7, 4], [2, 7], [7, 2], [5, 6], [6, 5],
];

type BracketFormulaForm = 'bracket' | 'bracket-minus' | 'over' | 'over-bracket' | 'trapezium';

interface BracketFormulaParams {
  form: BracketFormulaForm;
  set: number;
  k: number;
  /** For `over-bracket`: an index into SCALE_PAIRS, and the number inside the bracket. */
  pair: number;
  n: number;
}

function sampleBracketFormula(rng: Rng, forms: readonly BracketFormulaForm[]): BracketFormulaParams {
  const form = rng.pick(forms);
  return {
    form,
    set: rng.int(0, (form === 'over-bracket' ? SCALE_SETS : BRACKET_SETS).length - 1),
    k: rng.int(2, 9),
    pair: rng.int(0, SCALE_PAIRS.length - 1),
    n: rng.int(2, 40),
  };
}

/**
 * The second lesson's formulae: the subject inside a bracket, or on top of a
 * fraction. The bracket is kept whole — divide by the number outside it
 * rather than expand — and the fraction is cleared by multiplying.
 */
function bracketFormula(params: BracketFormulaParams): Formula & { recipe: Recipe; clear?: [string, string, string[]] } {
  const { form, set, k } = params;
  const K = `${k}`;
  if (form === 'over-bracket') {
    const [A, S] = SCALE_SETS[set];
    const [p, m] = SCALE_PAIRS[params.pair];
    const { n } = params;
    const P = `${p}`;
    const mA = `${m}${A}`;
    return {
      tex: `${A} = ${fr(`${p}(${S} - ${n})`, `${m}`)}`,
      subject: S,
      letters: [A, S],
      resultTex: `${fr(mA, P)} + ${n}`,
      answer: `${m}*${A}/${p} + ${n}`,
      altTex: fr(`${mA} + ${p * n}`, P),
      left: A,
      right: `${p}*(${S} - ${n})/${m}`,
      slips: [
        { tex: `${fr(`${p}${A}`, `${m}`)} + ${n}`, answer: `${p}*${A}/${m} + ${n}` },
        { tex: `${fr(mA, P)} - ${n}`, answer: `${m}*${A}/${p} - ${n}` },
        { tex: fr(`${mA} + ${n}`, P), answer: `(${m}*${A} + ${n})/${p}` },
      ],
      lines: [`${mA} = ${p}(${S} - ${n})`, `${fr(mA, P)} = ${S} - ${n}`, `${fr(mA, P)} + ${n} = ${S}`],
      moves: [`Multiply both sides by $${m}$ to clear the fraction.`, `Divide both sides by $${p}$, keeping the bracket whole.`, `Add $${n}$ to both sides.`],
      lineSlips: [
        [`${fr(A, `${m}`)} = ${p}(${S} - ${n})`, `${mA} = ${S} - ${n}`, `${mA} = ${p}(${S} + ${n})`],
        [`${fr(mA, P)} = ${S} + ${n}`, `${mA} - ${p} = ${S} - ${n}`, `${fr(`${p}${A}`, `${m}`)} = ${S} - ${n}`],
        [`${fr(mA, P)} - ${n} = ${S}`, `${fr(`${mA} + ${n}`, P)} = ${S}`, `${n} - ${fr(mA, P)} = ${S}`],
      ],
      recipe: {
        lastIsAdding: false,
        twoSteps: true,
        built: `take away $${n}$, multiply by $${p}$, then divide by $${m}$`,
        undone: `multiply by $${m}$ and divide by $${p}$, then add $${n}$`,
      },
      clear: [mA, `${p}(${S} - ${n})`, [A, `${m}(${S} - ${n})`, `${p}${A}`, `${m * p}(${S} - ${n})`, `${S} - ${n}`]],
    };
  }
  const [A, B, C, S] = BRACKET_SETS[set];
  if (form === 'bracket') {
    return {
      tex: `${A} = ${k}(${B} + ${S})`,
      subject: S,
      letters: [A, B, S],
      resultTex: `${fr(A, K)} - ${B}`,
      answer: `${A}/${k} - ${B}`,
      altTex: fr(`${A} - ${k}${B}`, K),
      left: A,
      right: `${k}*(${B} + ${S})`,
      slips: [
        { tex: fr(`${A} - ${B}`, K), answer: `(${A} - ${B})/${k}` },
        { tex: `${fr(A, K)} + ${B}`, answer: `${A}/${k} + ${B}` },
        { tex: `${k}${A} - ${B}`, answer: `${k}*${A} - ${B}` },
      ],
      lines: [`${fr(A, K)} = ${B} + ${S}`, `${fr(A, K)} - ${B} = ${S}`],
      moves: [`Divide both sides by $${k}$. The bracket stays whole.`, `Take $${B}$ from both sides.`],
      lineSlips: [
        [`${A} - ${k} = ${B} + ${S}`, `${k}${A} = ${B} + ${S}`, `${fr(A, K)} = ${k}${B} + ${S}`],
        [`${fr(A, K)} + ${B} = ${S}`, `${fr(`${A} - ${B}`, K)} = ${S}`, `${B} - ${fr(A, K)} = ${S}`],
      ],
      recipe: { lastIsAdding: false, twoSteps: true, built: `add $${B}$, then multiply the whole bracket by $${k}$`, undone: `divide both sides by $${k}$, then take away $${B}$` },
    };
  }
  if (form === 'bracket-minus') {
    return {
      tex: `${A} = ${k}(${S} - ${B})`,
      subject: S,
      letters: [A, S, B],
      resultTex: `${fr(A, K)} + ${B}`,
      answer: `${A}/${k} + ${B}`,
      altTex: fr(`${A} + ${k}${B}`, K),
      left: A,
      right: `${k}*(${S} - ${B})`,
      slips: [
        { tex: fr(`${A} + ${B}`, K), answer: `(${A} + ${B})/${k}` },
        { tex: `${fr(A, K)} - ${B}`, answer: `${A}/${k} - ${B}` },
        { tex: `${k}${A} + ${B}`, answer: `${k}*${A} + ${B}` },
      ],
      lines: [`${fr(A, K)} = ${S} - ${B}`, `${fr(A, K)} + ${B} = ${S}`],
      moves: [`Divide both sides by $${k}$. The bracket stays whole.`, `Add $${B}$ to both sides.`],
      lineSlips: [
        [`${A} - ${k} = ${S} - ${B}`, `${k}${A} = ${S} - ${B}`, `${fr(A, K)} = ${S} + ${B}`],
        [`${fr(A, K)} - ${B} = ${S}`, `${fr(`${A} + ${B}`, K)} = ${S}`, `${B} - ${fr(A, K)} = ${S}`],
      ],
      recipe: { lastIsAdding: false, twoSteps: true, built: `take away $${B}$, then multiply the whole bracket by $${k}$`, undone: `divide both sides by $${k}$, then add $${B}$` },
    };
  }
  if (form === 'over') {
    const kA = `${k}${A}`;
    return {
      tex: `${A} = ${fr(`${B} + ${S}`, K)}`,
      subject: S,
      letters: [A, B, S],
      resultTex: `${kA} - ${B}`,
      answer: `${k}*${A} - ${B}`,
      altTex: `-(${B} - ${kA})`,
      left: A,
      right: `(${B} + ${S})/${k}`,
      slips: [
        { tex: `${fr(A, K)} - ${B}`, answer: `${A}/${k} - ${B}` },
        { tex: `${k}(${A} - ${B})`, answer: `${k}*(${A} - ${B})` },
        { tex: `${kA} + ${B}`, answer: `${k}*${A} + ${B}` },
      ],
      lines: [`${kA} = ${B} + ${S}`, `${kA} - ${B} = ${S}`],
      moves: [`Multiply both sides by $${k}$ to clear the fraction.`, `Take $${B}$ from both sides.`],
      lineSlips: [
        [`${fr(A, K)} = ${B} + ${S}`, `${kA} = ${k}${B} + ${S}`, `${A} - ${k} = ${B} + ${S}`],
        [`${kA} + ${B} = ${S}`, `${k}(${A} - ${B}) = ${S}`, `${B} - ${kA} = ${S}`],
      ],
      recipe: { lastIsAdding: false, twoSteps: true, built: `add $${B}$, then divide the whole top by $${k}$`, undone: `multiply both sides by $${k}$, then take away $${B}$` },
      clear: [kA, `${B} + ${S}`, [A, fr(A, K), `${k}${B} + ${S}`, `${B} + ${k}${S}`]],
    };
  }
  // The trapezium: A = (a + b)h / 2, with the divisor drawn.
  const kA = `${k}${A}`;
  return {
    tex: `${A} = ${fr(`(${B} + ${C})${S}`, K)}`,
    subject: S,
    letters: [A, B, C, S],
    resultTex: fr(kA, `${B} + ${C}`),
    answer: `${k}*${A}/(${B} + ${C})`,
    altTex: `${kA} \\div (${B} + ${C})`,
    left: A,
    right: `(${B} + ${C})*${S}/${k}`,
    slips: [
      { tex: fr(A, `${k}(${B} + ${C})`), answer: `${A}/(${k}*(${B} + ${C}))` },
      { tex: `${kA} - ${B} - ${C}`, answer: `${k}*${A} - ${B} - ${C}` },
      { tex: `${fr(kA, B)} + ${C}`, answer: `${k}*${A}/${B} + ${C}` },
    ],
    lines: [`${kA} = (${B} + ${C})${S}`, `${fr(kA, `${B} + ${C}`)} = ${S}`],
    moves: [`Multiply both sides by $${k}$ to clear the fraction.`, `Divide both sides by the whole bracket, $${B} + ${C}$.`],
    lineSlips: [
      [`${fr(A, K)} = (${B} + ${C})${S}`, `${kA} = ${B} + ${C}${S}`, `${A} - ${k} = (${B} + ${C})${S}`],
      [`${kA} - ${B} - ${C} = ${S}`, `${fr(kA, B)} + ${C} = ${S}`, `${fr(A, `${k}(${B} + ${C})`)} = ${S}`],
    ],
    recipe: { lastIsAdding: false, twoSteps: false, built: `multiply by $(${B} + ${C})$, then divide by $${k}$`, undone: `multiply both sides by $${k}$, then divide by $(${B} + ${C})$` },
    clear: [kA, `(${B} + ${C})${S}`, [A, fr(A, K), `${B} + ${C}${S}`, `${k}(${B} + ${C})${S}`]],
  };
}

/** Either lesson's formula, for the generators the two lessons share by difficulty. */
function recipeFormula(params: LinearParams | BracketFormulaParams): Formula & { recipe: Recipe } {
  return 'pair' in params ? bracketFormula(params) : linearFormula(params);
}

/**
 * Making the subject when it sits in a bracket or on top of a fraction.
 *
 * Difficulty 1 has one bracket or one fraction; difficulty 2 has both at once
 * ($C = \frac{5(F - 32)}{9}$) or a bracket that multiplies the subject
 * ($A = \frac{(a + b)h}{2}$), where the whole bracket is the divisor.
 */
const bracketSubject: Generator<BracketFormulaParams> = {
  id: 'lin-bracket-subject',
  choices: (params) => subjectChoices(bracketFormula(params)),
  sample: (rng, difficulty) =>
    sampleBracketFormula(rng, difficulty > 1 ? ['over-bracket', 'trapezium'] : ['bracket', 'bracket-minus', 'over']),
  render: (params): Slide => subjectSlide(bracketFormula(params), 'real'),
  solution: (params) => formulaSolution(bracketFormula(params)),
};

/**
 * Clearing the fraction, placed as tiles.
 *
 * The first move whenever the subject is on top of a fraction: multiply both
 * sides by the denominator. The slips in the bank are dividing instead, and
 * multiplying only part of the other side.
 */
const clearFractionTiles: Generator<BracketFormulaParams> = {
  id: 'lin-clear-fraction-tiles',
  sample: (rng, difficulty) => sampleBracketFormula(rng, difficulty > 1 ? ['over-bracket', 'trapezium'] : ['over']),
  render: (params): Slide => {
    const f = bracketFormula(params);
    const [left, right, extras] = f.clear ?? ['', '', []];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Clear the fraction: multiply both sides by its denominator. What line do you get?`,
        },
        { kind: 'display', tex: f.tex },
      ],
      template: '{0} = {1}',
      bank: bankOf([left, right], extras),
      answer: [left, right],
    };
  },
  solution: (params) => formulaSolution(bracketFormula(params)),
};

/* ---------- Lesson 3: the subject on both sides ---------- */

/** A fraction whose top may be negative, with the sign written in front. */
function signedFrac(top: number, bottom: string): string {
  return top < 0 ? `-${fr(`${-top}`, bottom)}` : fr(`${top}`, bottom);
}

/** `[a, c, S]` for $ax + m = cx + n$: two letters as coefficients, then the subject. */
const COLLECT_SETS: readonly (readonly [string, string, string])[] = [
  ['a', 'b', 'x'],
  ['p', 'q', 't'],
  ['m', 'k', 'n'],
  ['r', 's', 'y'],
  ['h', 'k', 'w'],
  ['u', 'v', 'z'],
];

/** `[A, B, S]` for $A = BS + kS$. */
const TWICE_SETS: readonly (readonly [string, string, string])[] = [
  ['T', 'r', 'n'],
  ['P', 'a', 'x'],
  ['y', 'm', 't'],
  ['L', 'g', 'w'],
  ['R', 'h', 'z'],
  ['W', 'p', 'q'],
];

/** `[Y, S]` for $y = \frac{x + 1}{x - 2}$ and its relatives. */
const RATIO_SETS: readonly (readonly [string, string])[] = [
  ['y', 'x'],
  ['k', 't'],
  ['m', 'n'],
  ['w', 'z'],
  ['R', 'r'],
  ['v', 'u'],
];

type TwiceForm = 'collect' | 'twice' | 'fraction' | 'fraction2';

/** The moves that make a repeated subject the subject, in the order they come. */
type TwiceMove = 'multiply' | 'expand' | 'collect' | 'factor' | 'divide';

const TWICE_MOVES: readonly TwiceMove[] = ['multiply', 'expand', 'collect', 'factor', 'divide'];

const TWICE_MOVE_LABEL: Record<TwiceMove, string> = {
  multiply: 'Multiply both sides by the denominator',
  expand: 'Expand the bracket',
  collect: 'Collect the terms containing the subject on one side',
  factor: 'Take the subject out as a factor',
  divide: 'Divide both sides by the bracket',
};

interface TwiceParams {
  form: TwiceForm;
  set: number;
  /** collect: the two numbers, m then n. fraction: p and q. fraction2: a and b. twice: k in `m`. */
  m: number;
  n: number;
}

function sampleTwice(rng: Rng, forms: readonly TwiceForm[]): TwiceParams {
  const form = rng.pick(forms);
  if (form === 'collect') {
    const m = rng.int(1, 20);
    return { form, set: rng.int(0, COLLECT_SETS.length - 1), m, n: rng.pick(range(1, 20).filter((v) => v !== m)) };
  }
  if (form === 'twice') return { form, set: rng.int(0, TWICE_SETS.length - 1), m: rng.int(2, 9), n: 0 };
  if (form === 'fraction') return { form, set: rng.int(0, RATIO_SETS.length - 1), m: rng.int(1, 9), n: rng.int(1, 9) };
  const a = rng.int(2, 9);
  return { form, set: rng.int(0, RATIO_SETS.length - 1), m: a, n: rng.pick(range(1, 9).filter((v) => v !== a)) };
}

/**
 * The third lesson's formulae, where the subject appears twice. None of them
 * can be undone in reverse order, because there is no single order: the
 * terms have to be collected, the subject taken out as a factor, and the
 * bracket that leaves divided through.
 *
 * `stages` pairs each line with the move it calls for, and `factor` is the
 * factorised line as a tiles template, the blanks, and slips for the bank.
 */
function twiceFormula(params: TwiceParams): Formula & {
  stages: [string, TwiceMove][];
  factor: { template: string; answer: string[]; extras: string[] };
} {
  const { form, set, m, n } = params;
  if (form === 'collect') {
    const [a, c, S] = COLLECT_SETS[set];
    const d = n - m;
    const bottom = `${a} - ${c}`;
    const result = signedFrac(d, bottom);
    const lines = [`${a}${S} - ${c}${S} = ${d}`, `${S}(${bottom}) = ${d}`, `${S} = ${result}`];
    return {
      tex: `${a}${S} + ${m} = ${c}${S} + ${n}`,
      subject: S,
      letters: [a, S, c],
      resultTex: result,
      answer: `(${d})/(${bottom})`,
      altTex: signedFrac(-d, `${c} - ${a}`),
      left: `${a}*${S} + ${m}`,
      right: `${c}*${S} + ${n}`,
      slips: [
        { tex: signedFrac(d, `${a} + ${c}`), answer: `(${d})/(${a} + ${c})` },
        { tex: fr(`${m + n}`, bottom), answer: `(${m + n})/(${bottom})` },
        { tex: signedFrac(d, `${c} - ${a}`), answer: `(${d})/(${c} - ${a})` },
      ],
      lines,
      moves: [
        `Take $${c}${S}$ and $${m}$ from both sides, so the $${S}$ terms are together on the left.`,
        `Both terms contain $${S}$: take it out as a factor.`,
        'Divide both sides by the bracket.',
      ],
      lineSlips: [
        [`${a}${S} + ${c}${S} = ${d}`, `${a}${S} - ${c}${S} = ${m + n}`, `${a}${S} - ${c}${S} = ${-d}`],
        [`${S}(${a} + ${c}) = ${d}`, `${S}(${c} - ${a}) = ${d}`, `${S}(${bottom}) = ${-d}`],
        [`${S} = ${signedFrac(d, `${a} + ${c}`)}`, `${S} = ${signedFrac(-d, bottom)}`, `${S} = ${d}(${bottom})`],
      ],
      stages: [
        [`${a}${S} + ${m} = ${c}${S} + ${n}`, 'collect'],
        [lines[0], 'factor'],
        [lines[1], 'divide'],
      ],
      // Not -d beside c - a: S(c - a) = -d is the same line negated, and
      // tiles grade the form.
      factor: { template: `${S}({0}) = {1}`, answer: [bottom, `${d}`], extras: [`${a} + ${c}`, `${c} - ${a}`, `${m + n}`, `${n}`] },
    };
  }
  if (form === 'twice') {
    const [A, B, S] = TWICE_SETS[set];
    const k = m;
    const bottom = `${B} + ${k}`;
    const lines = [`${A} = ${S}(${bottom})`, `${S} = ${fr(A, bottom)}`];
    return {
      tex: `${A} = ${B}${S} + ${k}${S}`,
      subject: S,
      letters: [A, B, S],
      resultTex: fr(A, bottom),
      answer: `${A}/(${bottom})`,
      altTex: fr(A, `${k} + ${B}`),
      left: A,
      right: `${B}*${S} + ${k}*${S}`,
      slips: [
        { tex: fr(A, `${k}${B}`), answer: `${A}/(${k}*${B})` },
        { tex: fr(`${A} - ${k}`, B), answer: `(${A} - ${k})/${B}` },
        { tex: `${fr(A, B)} - ${k}`, answer: `${A}/${B} - ${k}` },
      ],
      lines,
      moves: [`Both terms on the right contain $${S}$: take it out as a factor.`, 'Divide both sides by the bracket.'],
      lineSlips: [
        [`${A} = ${S}(${k}${B})`, `${A} = ${S}(${B} - ${k})`, `${A} = ${S}${B} + ${k}`],
        [`${S} = ${fr(A, `${k}${B}`)}`, `${S} = ${fr(`${A} - ${k}`, B)}`, `${S} = ${A}(${bottom})`],
      ],
      stages: [
        [`${A} = ${B}${S} + ${k}${S}`, 'factor'],
        [lines[0], 'divide'],
      ],
      factor: { template: `{0} = ${S}({1})`, answer: [A, bottom], extras: [B, `${k}${B}`, `${B} - ${k}`, `${k}${A}`] },
    };
  }
  const [Y, S] = RATIO_SETS[set];
  if (form === 'fraction') {
    const p = m;
    const q = n;
    const qY = q === 1 ? Y : `${q}${Y}`;
    const top = `${qY} + ${p}`;
    const bottom = `${Y} - 1`;
    const lines = [
      `${Y}(${S} - ${q}) = ${S} + ${p}`,
      `${S}${Y} - ${qY} = ${S} + ${p}`,
      `${S}${Y} - ${S} = ${top}`,
      `${S}(${bottom}) = ${top}`,
      `${S} = ${fr(top, bottom)}`,
    ];
    return {
      tex: `${Y} = ${fr(`${S} + ${p}`, `${S} - ${q}`)}`,
      subject: S,
      letters: [Y, S],
      resultTex: fr(top, bottom),
      answer: `(${q}*${Y} + ${p})/(${Y} - 1)`,
      altTex: fr(`${p} + ${qY}`, bottom),
      left: Y,
      right: `(${S} + ${p})/(${S} - ${q})`,
      slips: [
        { tex: fr(`${qY} - ${p}`, bottom), answer: `(${q}*${Y} - ${p})/(${Y} - 1)` },
        { tex: fr(top, `${Y} + 1`), answer: `(${q}*${Y} + ${p})/(${Y} + 1)` },
        { tex: fr(`${p} - ${qY}`, bottom), answer: `(${p} - ${q}*${Y})/(${Y} - 1)` },
      ],
      lines,
      moves: [
        `Multiply both sides by $${S} - ${q}$ to clear the fraction.`,
        'Expand the bracket.',
        `Collect the $${S}$ terms on the left: take $${S}$ from both sides and add $${qY}$ to both.`,
        `Take $${S}$ out as a factor.`,
        'Divide both sides by the bracket.',
      ],
      lineSlips: [
        [`${Y}${S} - ${q} = ${S} + ${p}`, `${Y}(${S} + ${q}) = ${S} + ${p}`, `${Y} = (${S} + ${p})(${S} - ${q})`],
        [`${S}${Y} - ${q} = ${S} + ${p}`, `${S}${Y} + ${qY} = ${S} + ${p}`, `${S}${Y} - ${S} = ${S} + ${p}`],
        [`${S}${Y} + ${S} = ${top}`, `${S}${Y} - ${S} = ${qY} - ${p}`, `${S}${Y} - ${S} = ${p} - ${qY}`],
        [`${S}(${Y} + 1) = ${top}`, `${S}(${bottom}) = ${qY} - ${p}`, `${S}${Y} = ${top}`],
        [`${S} = ${fr(top, `${Y} + 1`)}`, `${S} = ${fr(`${qY} - ${p}`, bottom)}`, `${S} = ${top} - ${bottom}`],
      ],
      stages: [
        [`${Y} = ${fr(`${S} + ${p}`, `${S} - ${q}`)}`, 'multiply'],
        [lines[0], 'expand'],
        [lines[1], 'collect'],
        [lines[2], 'factor'],
        [lines[3], 'divide'],
      ],
      // Not 1 - Y: S(1 - y) = -(qy + p) is the same line negated.
      factor: { template: `${S}({0}) = {1}`, answer: [bottom, top], extras: [`${Y} + 1`, `${qY} - ${p}`, `${Y} - ${q}`, `${p}${Y} + ${q}`] },
    };
  }
  const a = m;
  const b = n;
  const bY = b === 1 ? Y : `${b}${Y}`;
  const aS = `${a}${S}`;
  const bottom = `${a} - ${Y}`;
  const lines = [
    `${Y}(${S} + ${b}) = ${aS}`,
    `${S}${Y} + ${bY} = ${aS}`,
    `${bY} = ${aS} - ${S}${Y}`,
    `${bY} = ${S}(${bottom})`,
    `${S} = ${fr(bY, bottom)}`,
  ];
  return {
    tex: `${Y} = ${fr(aS, `${S} + ${b}`)}`,
    subject: S,
    letters: [Y, S],
    resultTex: fr(bY, bottom),
    answer: `${b}*${Y}/(${bottom})`,
    altTex: `-${fr(bY, `${Y} - ${a}`)}`,
    left: Y,
    right: `${a}*${S}/(${S} + ${b})`,
    slips: [
      { tex: fr(bY, `${Y} - ${a}`), answer: `${b}*${Y}/(${Y} - ${a})` },
      { tex: fr(`${a}${Y}`, `${b} - ${Y}`), answer: `${a}*${Y}/(${b} - ${Y})` },
      { tex: fr(bY, `${a} + ${Y}`), answer: `${b}*${Y}/(${a} + ${Y})` },
    ],
    lines,
    moves: [
      `Multiply both sides by $${S} + ${b}$ to clear the fraction.`,
      'Expand the bracket.',
      `Collect the $${S}$ terms on the right: take $${S}${Y}$ from both sides.`,
      `Take $${S}$ out as a factor.`,
      'Divide both sides by the bracket.',
    ],
    lineSlips: [
      [`${Y}${S} + ${b} = ${aS}`, `${Y} = ${aS}(${S} + ${b})`, `${Y}(${S} - ${b}) = ${aS}`],
      [`${S}${Y} + ${b} = ${aS}`, `${S}${Y} - ${bY} = ${aS}`, `${S}${Y} + ${bY} = ${a}`],
      [`${bY} = ${aS} + ${S}${Y}`, `-${bY} = ${aS} - ${S}${Y}`, `${bY} = ${a} - ${S}${Y}`],
      [`${bY} = ${S}(${a} + ${Y})`, `${bY} = ${S}(${Y} - ${a})`, `${bY} = ${S}${a} - ${Y}`],
      [`${S} = ${fr(bY, `${a} + ${Y}`)}`, `${S} = ${fr(bY, `${Y} - ${a}`)}`, `${S} = ${bY}(${bottom})`],
    ],
    stages: [
      [`${Y} = ${fr(aS, `${S} + ${b}`)}`, 'multiply'],
      [lines[0], 'expand'],
      [lines[1], 'collect'],
      [lines[2], 'factor'],
      [lines[3], 'divide'],
    ],
    // Not -bY: -by = S(y - a) is the same line negated.
    factor: { template: `{0} = ${S}({1})`, answer: [bY, bottom], extras: [`${Y} - ${a}`, `${a} + ${Y}`, `${a}${Y}`, `${b} + ${Y}`] },
  };
}

/**
 * The subject on both sides, or twice on one side, made the subject.
 *
 * Difficulty 1 collects $ax + 3 = cx + 10$ or factorises $T = rn + 3n$;
 * difficulty 2 clears a fraction first, $y = \frac{x + 1}{x - 2}$, where the
 * subject turns up on both sides only once the denominator is multiplied out.
 */
const twiceSubject: Generator<TwiceParams> = {
  id: 'lin-twice-subject',
  choices: (params) => subjectChoices(twiceFormula(params)),
  sample: (rng, difficulty) => sampleTwice(rng, difficulty > 1 ? ['fraction', 'fraction2'] : ['collect', 'twice']),
  render: (params): Slide => subjectSlide(twiceFormula(params), 'real'),
  solution: (params) => formulaSolution(twiceFormula(params)),
};

/**
 * Taking the subject out as a factor, placed as tiles.
 *
 * The factorised line is a *form* — $x(a - c) = 7$ has the same value as
 * $ax - cx = 7$ — so it is asked through tiles, where the form is what gets
 * graded, not typed, where the checker would accept either. The bank never
 * holds both halves of the line with its signs turned round, which would be
 * a second right answer the tiles could not accept.
 */
const factorOutTiles: Generator<TwiceParams> = {
  id: 'lin-factor-out-tiles',
  sample: (rng, difficulty) => sampleTwice(rng, difficulty > 1 ? ['fraction', 'fraction2'] : ['collect', 'twice']),
  render: (params): Slide => {
    const f = twiceFormula(params);
    const { template, answer, extras } = f.factor;
    const before = f.stages[f.stages.findIndex(([, move]) => move === 'factor')][0];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Making $${f.subject}$ the subject of $${f.tex}$ has reached the line below. Take $${f.subject}$ out as a factor.`,
        },
        { kind: 'display', tex: before },
      ],
      template,
      bank: bankOf(answer, extras),
      answer,
    };
  },
  solution: (params) => formulaSolution(twiceFormula(params)),
};

interface TwiceNextParams extends TwiceParams {
  stage: number;
  /** Which wrong move is left off, so four options remain. */
  drop: number;
}

/**
 * What comes next? One line of the working, and the move it calls for.
 *
 * The order is the lesson: clear the fraction, expand, collect, factorise,
 * divide. A native choice because the options are moves, not values; they
 * are listed in that order every time, one wrong move left off, so where the
 * right one sits says nothing.
 */
const twiceNext: Generator<TwiceNextParams> = {
  id: 'lin-twice-next',
  sample: (rng, difficulty) => {
    const base = sampleTwice(rng, difficulty > 1 ? ['fraction', 'fraction2'] : ['collect', 'twice']);
    return { ...base, stage: rng.int(0, twiceFormula(base).stages.length - 1), drop: rng.int(0, 3) };
  },
  render: (params): Slide => {
    const f = twiceFormula(params);
    const [line, move] = f.stages[params.stage];
    const wrong = TWICE_MOVES.filter((m) => m !== move);
    const left = wrong[params.drop];
    const shown = TWICE_MOVES.filter((m) => m !== left);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Making $${f.subject}$ the subject of $${f.tex}$ has reached this line. What is the next step?` },
        { kind: 'display', tex: line },
      ],
      options: shown.map((m) => ({ id: m, label: TWICE_MOVE_LABEL[m] })),
      correctId: move,
    };
  },
  solution: (params) => {
    const f = twiceFormula(params);
    const [line, move] = f.stages[params.stage];
    return [
      { tex: line },
      { text: `Next: ${TWICE_MOVE_LABEL[move].toLowerCase()}. ${f.moves[params.stage]}` },
      { tex: f.lines[params.stage] },
      { text: 'The whole route:' },
      ...formulaSolution(f),
    ];
  },
};

interface TwiceValueParams {
  form: 'collect' | 'fraction';
  set: number;
  /** collect: a, b, c, d of ax + b = cx + d. fraction: p, q, y of y = (x + p)/(x - q). */
  a: number;
  b: number;
  c: number;
  d: number;
}

/** `[a, b, c, d, S]` for $ax + b = cx + d$ with every coefficient a letter. */
const VALUE_SETS: readonly (readonly [string, string, string, string, string])[] = [
  ['a', 'b', 'c', 'd', 'x'],
  ['p', 'q', 'r', 's', 't'],
  ['k', 'm', 'n', 'w', 'z'],
];

/**
 * Using the rearranged formula: the numbers go in, the tree works them out.
 *
 * Difficulty 1 is $x = \frac{d - b}{a - c}$, from $ax + b = cx + d$ with every
 * coefficient a letter; difficulty 2 is $x = \frac{qy + p}{y - 1}$, from the
 * fraction. Every value is drawn so the answer and each step to it are whole.
 */
const twiceValueTree: Generator<TwiceValueParams> = {
  id: 'lin-twice-value-tree',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      // x = (q y + p) / (y - 1) is whole when y - 1 divides q + p.
      return drawUntil(
        () => {
          const p = rng.int(1, 9);
          const q = rng.int(1, 9);
          const divisors = range(2, p + q).filter((g) => (p + q) % g === 0);
          const g = divisors.length > 0 ? rng.pick(divisors) : 1;
          return { form: 'fraction' as const, set: rng.int(0, RATIO_SETS.length - 1), a: p, b: q, c: g + 1, d: 0 };
        },
        (v) => v.c > 2,
        { form: 'fraction', set: 0, a: 3, b: 3, c: 4, d: 0 },
      );
    }
    const gap = rng.int(2, 6);
    const c = rng.int(1, 6);
    const x = rng.int(2, 9);
    const b = rng.int(1, 15);
    return { form: 'collect', set: rng.int(0, VALUE_SETS.length - 1), a: c + gap, b, c, d: b + gap * x };
  },
  render: (params): Slide => {
    if (params.form === 'fraction') {
      const { a: p, b: q, c: y } = params;
      const [Y, S] = RATIO_SETS[params.set];
      const top = q * y + p;
      const x = top / (y - 1);
      const answer = [`${q * y}`, `${top}`, `${y - 1}`, `${x}`];
      return {
        kind: 'tree',
        prompt: [
          {
            kind: 'prose',
            text: `Making $${S}$ the subject of $${Y} = ${fr(`${S} + ${p}`, `${S} - ${q}`)}$ gives $${S} = ${fr(`${q === 1 ? '' : q}${Y} + ${p}`, `${Y} - 1`)}$. Find $${S}$ when $${Y} = ${y}$: fill the tree from the top of the fraction down.`,
          },
        ],
        expression: `${S} = ${fr(`${q} \\times ${y} + ${p}`, `${y} - 1`)}`,
        nodes: [
          { id: 'times', from: [] },
          { id: 'top', from: ['times'] },
          { id: 'bottom', from: [] },
          { id: 'x', from: ['top', 'bottom'] },
        ],
        bank: treeBank(answer, [q + y, q * y - p, y + 1, top / (y + 1)], x),
        answer,
      };
    }
    const { a, b, c, d } = params;
    const [A, B, C, D, S] = VALUE_SETS[params.set];
    const x = (d - b) / (a - c);
    const answer = [`${d - b}`, `${a - c}`, `${x}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Making $${S}$ the subject of $${A}${S} + ${B} = ${C}${S} + ${D}$ gives $${S} = ${fr(`${D} - ${B}`, `${A} - ${C}`)}$. Find $${S}$ when $${A} = ${a}$, $${B} = ${b}$, $${C} = ${c}$ and $${D} = ${d}$: fill the top, the bottom, then $${S}$.`,
        },
      ],
      expression: `${S} = ${fr(`${d} - ${b}`, `${a} - ${c}`)}`,
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'x', from: ['top', 'bottom'] },
      ],
      bank: treeBank(answer, [d + b, a + c, (d + b) / (a - c), d - b - a + c], x),
      answer,
    };
  },
  solution: (params) => {
    if (params.form === 'fraction') {
      const { a: p, b: q, c: y } = params;
      const [Y, S] = RATIO_SETS[params.set];
      const top = q * y + p;
      return [
        { text: `Put $${Y} = ${y}$ into the rearranged formula.` },
        { tex: `${S} = ${fr(`${q} \\times ${y} + ${p}`, `${y} - 1`)} = ${fr(`${top}`, `${y - 1}`)} = ${top / (y - 1)}` },
        { text: `Check in the original: $${fr(`${top / (y - 1)} + ${p}`, `${top / (y - 1)} - ${q}`)} = ${fr(`${top / (y - 1) + p}`, `${top / (y - 1) - q}`)} = ${y}$.` },
      ];
    }
    const { a, b, c, d } = params;
    const [, , , , S] = VALUE_SETS[params.set];
    const x = (d - b) / (a - c);
    return [
      { text: 'Put the numbers into the rearranged formula: the top first, then the bottom.' },
      { tex: `${S} = ${fr(`${d} - ${b}`, `${a} - ${c}`)} = ${fr(`${d - b}`, `${a - c}`)} = ${x}` },
      { text: `Check in the original: $${a} \\times ${x} + ${b} = ${a * x + b}$ and $${c} \\times ${x} + ${d} = ${c * x + d}$.` },
    ];
  },
};

/* ---------- Lesson 4: squares and roots ---------- */

/** `[A, S, what S is]`: the subject is a quantity that cannot be negative. */
const ROOT_SETS: readonly (readonly [string, string, string])[] = [
  ['A', 'r', 'the radius of a circle'],
  ['K', 'v', 'a speed'],
  ['P', 's', 'the side of a square'],
  ['H', 't', 'a time'],
  ['W', 'd', 'a distance'],
  ['V', 'h', 'a height'],
];

/** `[B, C, D, S]` for $v^2 = u^2 + 2as$. */
const SUVAT_SETS: readonly (readonly [string, string, string, string])[] = [
  ['v', 'u', 'a', 's'],
  ['p', 'q', 'r', 't'],
  ['w', 'z', 'g', 'h'],
  ['m', 'n', 'k', 'd'],
];

/** `[T, l, g]` for $T = 2\pi\sqrt{\frac{l}{g}}$. */
const PENDULUM_SETS: readonly (readonly [string, string, string])[] = [
  ['T', 'l', 'g'],
  ['P', 'h', 'w'],
  ['R', 's', 'm'],
  ['t', 'd', 'q'],
];

/** `[K, m, S]` for $K = \frac{mv^2}{2}$. */
const KINETIC_SETS: readonly (readonly [string, string, string])[] = [
  ['K', 'm', 'v'],
  ['W', 'p', 'u'],
  ['Q', 'c', 'w'],
  ['H', 'n', 'z'],
];

type RootForm =
  | 'square'
  | 'root'
  | 'coef-root'
  | 'root-plus'
  | 'root-inside'
  | 'bracket-square'
  | 'suvat'
  | 'suvat-root'
  | 'pendulum'
  | 'kinetic';

interface RootParams {
  form: RootForm;
  set: number;
  /** The number in the formula. For `square`, 0 stands for π. */
  k: number;
  n: number;
}

function sampleRoot(rng: Rng, forms: readonly RootForm[]): RootParams {
  const form = rng.pick(forms);
  const sets =
    form === 'suvat' || form === 'suvat-root'
      ? SUVAT_SETS
      : form === 'pendulum'
        ? PENDULUM_SETS
        : form === 'kinetic'
          ? KINETIC_SETS
          : ROOT_SETS;
  return {
    form,
    set: rng.int(0, sets.length - 1),
    k: form === 'square' ? rng.pick([0, 2, 3, 4, 5, 6, 7, 8, 9]) : form === 'pendulum' ? rng.int(2, 6) : rng.int(2, 9),
    n: rng.int(2, 20),
  };
}

/** Is the subject under a root or squared, and is that the whole of its side? */
function rootShape(form: RootForm): { root: boolean; alone: boolean } {
  if (form === 'root' || form === 'root-inside') return { root: true, alone: true };
  if (form === 'bracket-square') return { root: false, alone: true };
  if (form === 'square' || form === 'kinetic' || form === 'suvat-root' || form === 'suvat') return { root: false, alone: false };
  return { root: true, alone: false };
}

/**
 * The fourth lesson's formulae, where a square or a root sits between the
 * subject and the rest. The rule is the same as ever — undo in reverse order
 * — with two things added: squaring and rooting undo each other, and they
 * apply to a whole side, never term by term. Every letter is a positive
 * quantity, so only the positive root is taken.
 */
function rootFormula({ form, set, k, n }: RootParams): Formula {
  if (form === 'suvat' || form === 'suvat-root') {
    const [B, C, D, S] = SUVAT_SETS[set];
    const kDS = `${k}${D}${S}`;
    if (form === 'suvat') {
      const top = `${B}^2 - ${C}^2`;
      return {
        tex: `${B}^2 = ${C}^2 + ${kDS}`,
        subject: S,
        letters: [B, C, D, S],
        resultTex: fr(top, `${k}${D}`),
        answer: `(${B}^2 - ${C}^2)/(${k}*${D})`,
        left: `${B}^2`,
        right: `${C}^2 + ${k}*${D}*${S}`,
        slips: [
          { tex: fr(`${B} - ${C}`, `${k}${D}`), answer: `(${B} - ${C})/(${k}*${D})` },
          { tex: fr(`${B}^2 + ${C}^2`, `${k}${D}`), answer: `(${B}^2 + ${C}^2)/(${k}*${D})` },
          { tex: `${top} - ${k}${D}`, answer: `${B}^2 - ${C}^2 - ${k}*${D}` },
        ],
        lines: [`${top} = ${kDS}`, `${fr(top, `${k}${D}`)} = ${S}`],
        moves: [`Take $${C}^2$ from both sides. The squares stay: $${S}$ is not squared, so nothing is square-rooted.`, `Divide both sides by $${k}${D}$.`],
        lineSlips: [
          [`${B}^2 + ${C}^2 = ${kDS}`, `${B} - ${C} = ${kDS}`, `${C}^2 - ${B}^2 = ${kDS}`],
          [`${fr(top, `${k}`)} - ${D} = ${S}`, `${k}${D}(${top}) = ${S}`, `${fr(`${B}^2`, `${k}${D}`)} - ${C}^2 = ${S}`],
        ],
      };
    }
    const inside = `${B}^2 - ${kDS}`;
    return {
      tex: `${B}^2 = ${C}^2 + ${kDS}`,
      subject: C,
      letters: [B, C, D, S],
      resultTex: `\\sqrt{${inside}}`,
      answer: `sqrt(${B}^2 - ${k}*${D}*${S})`,
      left: `${B}^2`,
      right: `${C}^2 + ${k}*${D}*${S}`,
      slips: [
        { tex: `${B} - \\sqrt{${kDS}}`, answer: `${B} - sqrt(${k}*${D}*${S})` },
        { tex: `\\sqrt{${B}^2 + ${kDS}}`, answer: `sqrt(${B}^2 + ${k}*${D}*${S})` },
        { tex: inside, answer: `${B}^2 - ${k}*${D}*${S}` },
      ],
      lines: [`${inside} = ${C}^2`, `\\sqrt{${inside}} = ${C}`],
      moves: [`Take $${kDS}$ from both sides, so the square is alone.`, 'Take the square root of both sides: of the whole side, not term by term.'],
      lineSlips: [
        [`${B}^2 + ${kDS} = ${C}^2`, `${B} - ${kDS} = ${C}^2`, `${kDS} - ${B}^2 = ${C}^2`],
        [`${B} - \\sqrt{${kDS}} = ${C}`, `(${inside})^2 = ${C}`, `${fr(inside, '2')} = ${C}`],
      ],
    };
  }
  if (form === 'pendulum') {
    const [T, L, G] = PENDULUM_SETS[set];
    const kpi = `${k}\\pi`;
    const k2pi2 = `${k * k}\\pi^2`;
    const root = `\\sqrt{${fr(L, G)}}`;
    return {
      tex: `${T} = ${kpi}${root}`,
      subject: L,
      letters: [T, L, G],
      pi: true,
      resultTex: fr(`${G}${T}^2`, k2pi2),
      answer: `${G}*${T}^2/(${k * k}*pi^2)`,
      left: T,
      right: `${k}*pi*sqrt(${L}/${G})`,
      slips: [
        { tex: fr(`${G}${T}`, kpi), answer: `${G}*${T}/(${k}*pi)` },
        { tex: fr(`${T}^2`, `${k2pi2}${G}`), answer: `${T}^2/(${k * k}*pi^2*${G})` },
        { tex: fr(`${G}${T}^2`, kpi), answer: `${G}*${T}^2/(${k}*pi)` },
      ],
      lines: [`${fr(T, kpi)} = ${root}`, `${fr(`${T}^2`, k2pi2)} = ${fr(L, G)}`, `${fr(`${G}${T}^2`, k2pi2)} = ${L}`],
      moves: [
        `Divide both sides by $${kpi}$, so the root is alone.`,
        `Square both sides. The $${kpi}$ is part of the left side, so it is squared too.`,
        `Multiply both sides by $${G}$.`,
      ],
      lineSlips: [
        [`${T} - ${kpi} = ${root}`, `${kpi} ${T} = ${root}`, `${fr(T, k2pi2)} = ${root}`],
        [`${fr(`${T}^2`, kpi)} = ${fr(L, G)}`, `${fr(T, k2pi2)} = ${fr(L, G)}`, `${fr(`${T}^2`, k2pi2)} = ${root}`],
        [`${fr(`${T}^2`, `${k2pi2}${G}`)} = ${L}`, `${fr(`${G}${T}`, k2pi2)} = ${L}`, `${fr(`${T}^2`, k2pi2)} + ${G} = ${L}`],
      ],
    };
  }
  if (form === 'kinetic') {
    const [K, M, S] = KINETIC_SETS[set];
    const kK = `${k}${K}`;
    return {
      tex: `${K} = ${fr(`${M}${S}^2`, `${k}`)}`,
      subject: S,
      letters: [K, M, S],
      resultTex: `\\sqrt{${fr(kK, M)}}`,
      answer: `sqrt(${k}*${K}/${M})`,
      left: K,
      right: `${M}*${S}^2/${k}`,
      slips: [
        { tex: `\\sqrt{${fr(K, `${k}${M}`)}}`, answer: `sqrt(${K}/(${k}*${M}))` },
        { tex: fr(kK, M), answer: `${k}*${K}/${M}` },
        { tex: fr(`\\sqrt{${kK}}`, M), answer: `sqrt(${k}*${K})/${M}` },
      ],
      lines: [`${kK} = ${M}${S}^2`, `${fr(kK, M)} = ${S}^2`, `\\sqrt{${fr(kK, M)}} = ${S}`],
      moves: [`Multiply both sides by $${k}$.`, `Divide both sides by $${M}$, so the square is alone.`, 'Take the square root of both sides.'],
      lineSlips: [
        [`${fr(K, `${k}`)} = ${M}${S}^2`, `${K} - ${k} = ${M}${S}^2`, `${kK} = ${M}^2${S}^2`],
        [`${kK}${M} = ${S}^2`, `${kK} - ${M} = ${S}^2`, `${fr(kK, `${M}^2`)} = ${S}^2`],
        [`${fr(`\\sqrt{${kK}}`, M)} = ${S}`, `${fr(kK, M)} = ${S}`, `\\left(${fr(kK, M)}\\right)^2 = ${S}`],
      ],
    };
  }
  const [A, S] = ROOT_SETS[set];
  if (form === 'square') {
    const K = k === 0 ? '\\pi' : `${k}`;
    const kAns = k === 0 ? 'pi' : `${k}`;
    const over = fr(A, K);
    return {
      tex: `${A} = ${K}${k === 0 ? ' ' : ''}${S}^2`,
      subject: S,
      letters: [A, S],
      pi: k === 0,
      resultTex: `\\sqrt{${over}}`,
      answer: `sqrt(${A}/${kAns})`,
      left: A,
      right: `${kAns}*${S}^2`,
      slips: [
        { tex: fr(`\\sqrt{${A}}`, K), answer: `sqrt(${A})/${kAns}` },
        { tex: fr(A, `2${K}`), answer: `${A}/(2*${kAns})` },
        { tex: `\\left(${over}\\right)^2`, answer: `(${A}/${kAns})^2` },
      ],
      lines: [`${over} = ${S}^2`, `\\sqrt{${over}} = ${S}`],
      moves: [`Divide both sides by $${K}$, so the square is alone.`, `Take the square root of both sides. $${S}$ is ${ROOT_SETS[set][2]}, so only the positive root.`],
      lineSlips: [
        [`${A} - ${K} = ${S}^2`, `${K}${k === 0 ? ' ' : ''}${A} = ${S}^2`, `${fr(A, `2${K}`)} = ${S}^2`],
        [`${fr(`\\sqrt{${A}}`, K)} = ${S}`, `\\left(${over}\\right)^2 = ${S}`, `${fr(A, `2${K}`)} = ${S}`],
      ],
    };
  }
  if (form === 'root') {
    const K = `${k}`;
    return {
      tex: `${A} = \\sqrt{${k}${S}}`,
      subject: S,
      letters: [A, S],
      resultTex: fr(`${A}^2`, K),
      answer: `${A}^2/${k}`,
      left: A,
      right: `sqrt(${k}*${S})`,
      slips: [
        { tex: `${k}${A}^2`, answer: `${k}*${A}^2` },
        { tex: fr(`\\sqrt{${A}}`, K), answer: `sqrt(${A})/${k}` },
        { tex: fr(`${A}^2`, `${k * k}`), answer: `${A}^2/${k * k}` },
      ],
      lines: [`${A}^2 = ${k}${S}`, `${fr(`${A}^2`, K)} = ${S}`],
      moves: ['The root is the whole of its side, so square both sides.', `Divide both sides by $${k}$.`],
      lineSlips: [
        [`\\sqrt{${A}} = ${k}${S}`, `${A}^2 = ${k * k}${S}`, `2${A} = ${k}${S}`],
        [`${k}${A}^2 = ${S}`, `${fr(A, K)} = ${S}`, `${A}^2 - ${k} = ${S}`],
      ],
    };
  }
  if (form === 'coef-root') {
    const K = `${k}`;
    return {
      tex: `${A} = ${k}\\sqrt{${S}}`,
      subject: S,
      letters: [A, S],
      resultTex: fr(`${A}^2`, `${k * k}`),
      answer: `${A}^2/${k * k}`,
      altTex: `\\left(${fr(A, K)}\\right)^2`,
      left: A,
      right: `${k}*sqrt(${S})`,
      slips: [
        { tex: fr(`${A}^2`, K), answer: `${A}^2/${k}` },
        { tex: `\\sqrt{${fr(A, K)}}`, answer: `sqrt(${A}/${k})` },
        { tex: fr(`2${A}`, K), answer: `2*${A}/${k}` },
      ],
      lines: [`${fr(A, K)} = \\sqrt{${S}}`, `${fr(`${A}^2`, `${k * k}`)} = ${S}`],
      moves: [`Divide both sides by $${k}$, so the root is alone.`, `Square both sides: the whole of each side, so the $${k}$ is squared too.`],
      lineSlips: [
        [`${A} - ${k} = \\sqrt{${S}}`, `${k}${A} = \\sqrt{${S}}`, `${fr(A, `${k * k}`)} = \\sqrt{${S}}`],
        [`${fr(`${A}^2`, K)} = ${S}`, `\\sqrt{${fr(A, K)}} = ${S}`, `${fr(`2${A}`, K)} = ${S}`],
      ],
    };
  }
  if (form === 'root-plus') {
    return {
      tex: `${A} = \\sqrt{${S}} + ${n}`,
      subject: S,
      letters: [A, S],
      resultTex: `(${A} - ${n})^2`,
      answer: `(${A} - ${n})^2`,
      left: A,
      right: `sqrt(${S}) + ${n}`,
      slips: [
        { tex: `${A}^2 - ${n * n}`, answer: `${A}^2 - ${n * n}` },
        { tex: `${A}^2 - ${n}`, answer: `${A}^2 - ${n}` },
        { tex: `(${A} + ${n})^2`, answer: `(${A} + ${n})^2` },
      ],
      lines: [`${A} - ${n} = \\sqrt{${S}}`, `(${A} - ${n})^2 = ${S}`],
      moves: [`Take $${n}$ from both sides, so the root is alone.`, 'Square both sides: the whole of the left, bracket and all.'],
      lineSlips: [
        [`${A} + ${n} = \\sqrt{${S}}`, `${A}^2 - ${n} = \\sqrt{${S}}`, `${A} = \\sqrt{${S} + ${n}}`],
        [`${A}^2 - ${n * n} = ${S}`, `${A}^2 - ${n} = ${S}`, `(${A} + ${n})^2 = ${S}`],
      ],
    };
  }
  if (form === 'root-inside') {
    return {
      tex: `${A} = \\sqrt{${S} + ${n}}`,
      subject: S,
      letters: [A, S],
      resultTex: `${A}^2 - ${n}`,
      answer: `${A}^2 - ${n}`,
      left: A,
      right: `sqrt(${S} + ${n})`,
      slips: [
        { tex: `(${A} - ${n})^2`, answer: `(${A} - ${n})^2` },
        { tex: `${A}^2 + ${n}`, answer: `${A}^2 + ${n}` },
        { tex: `\\sqrt{${A}} - ${n}`, answer: `sqrt(${A}) - ${n}` },
      ],
      lines: [`${A}^2 = ${S} + ${n}`, `${A}^2 - ${n} = ${S}`],
      moves: ['The root is the whole of its side, so square both sides.', `Take $${n}$ from both sides.`],
      lineSlips: [
        [`${A}^2 = ${S} + ${n * n}`, `\\sqrt{${A}} = ${S} + ${n}`, `${A}^2 = ${S}^2 + ${n}`],
        [`${A}^2 + ${n} = ${S}`, `(${A} - ${n})^2 = ${S}`, `${n} - ${A}^2 = ${S}`],
      ],
    };
  }
  // bracket-square: A = (S + n)^2
  return {
    tex: `${A} = (${S} + ${n})^2`,
    subject: S,
    letters: [A, S],
    resultTex: `\\sqrt{${A}} - ${n}`,
    answer: `sqrt(${A}) - ${n}`,
    left: A,
    right: `(${S} + ${n})^2`,
    slips: [
      { tex: `\\sqrt{${A} - ${n}}`, answer: `sqrt(${A} - ${n})` },
      { tex: `\\sqrt{${A}} + ${n}`, answer: `sqrt(${A}) + ${n}` },
      { tex: `${A}^2 - ${n}`, answer: `${A}^2 - ${n}` },
    ],
    lines: [`\\sqrt{${A}} = ${S} + ${n}`, `\\sqrt{${A}} - ${n} = ${S}`],
    moves: ['The square is the whole of its side, so take the square root of both sides.', `Take $${n}$ from both sides.`],
    lineSlips: [
      [`${A}^2 = ${S} + ${n}`, `\\sqrt{${A}} = ${S} + ${n * n}`, `\\sqrt{${A}} = ${S}^2 + ${n}`],
      [`\\sqrt{${A}} + ${n} = ${S}`, `\\sqrt{${A} - ${n}} = ${S}`, `${n} - \\sqrt{${A}} = ${S}`],
    ],
  };
}

const EASY_ROOTS: readonly RootForm[] = ['square', 'root', 'coef-root'];

/**
 * Making the subject when it is squared or under a root. Typed, with `^` and
 * a root key, and graded over positive values only: every letter here is a
 * length, a speed or a time, and $\sqrt{A^2}$ is $A$ only when $A$ is not
 * negative. Difficulty 2 has the named formulae — $v^2 = u^2 + 2as$,
 * $T = 2\pi\sqrt{\frac{l}{g}}$ — and a root with a number beside it.
 */
const rootSubject: Generator<RootParams> = {
  id: 'lin-root-subject',
  choices: (params) => subjectChoices(rootFormula(params)),
  sample: (rng, difficulty) =>
    sampleRoot(
      rng,
      difficulty > 1 ? ['suvat', 'suvat-root', 'pendulum', 'root-plus', 'root-inside', 'kinetic', 'bracket-square'] : EASY_ROOTS,
    ),
  render: (params): Slide => subjectSlide(rootFormula(params), 'positive'),
  solution: (params) => formulaSolution(rootFormula(params)),
};

/**
 * The same as lines of working, one operation per line: the order in which
 * the root or the square comes off is what the lines make visible.
 */
const rootSteps: Generator<RootParams> = {
  id: 'lin-root-steps',
  sample: (rng, difficulty) =>
    sampleRoot(rng, difficulty > 1 ? ['suvat-root', 'pendulum', 'root-plus', 'kinetic', 'bracket-square'] : [...EASY_ROOTS, 'root-inside']),
  render: (params): Slide => {
    const f = rootFormula(params);
    const [left, right] = f.tex.split(' = ');
    return rearrangeSteps(f, [left, '=', right], 2);
  },
  solution: (params) => formulaSolution(rootFormula(params)),
};

const ROOT_UNDER = 'Under a root';
const ROOT_SQUARED = 'Squared';
const ROOT_ALONE = 'Yes, that is all of its side';
const ROOT_NOT_ALONE = 'No, something else is there too';

/**
 * When does the root or the square come off?
 *
 * Squaring undoes a root and rooting undoes a square, but only when the root
 * or the square is the whole of its side: $\sqrt{s} + 4$ squared is not
 * $s + 16$. So the question is whether anything else has to come off first.
 */
const rootFlow: Generator<RootParams> = {
  id: 'lin-root-flow',
  sample: (rng, difficulty) =>
    sampleRoot(
      rng,
      difficulty > 1
        ? ['pendulum', 'kinetic', 'suvat-root', 'root-plus', 'bracket-square', 'root-inside']
        : ['square', 'root', 'coef-root', 'root-inside', 'bracket-square', 'root-plus'],
    ),
  render: (params): Slide => {
    const f = rootFormula(params);
    const { root, alone } = rootShape(params.form);
    const S = f.subject;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Before rearranging for $${S}$: when does the square or the root come off?` }],
      subject: f.tex,
      steps: [
        {
          id: 'which',
          ask: `Is $${S}$ under a root, or squared?`,
          branches: [
            { label: ROOT_UNDER, to: 'root' },
            { label: ROOT_SQUARED, to: 'square' },
          ],
        },
        {
          id: 'root',
          ask: 'Is the root the whole of its side of the formula?',
          branches: [
            { label: ROOT_ALONE, outcome: 'Square both sides first.' },
            { label: ROOT_NOT_ALONE, outcome: 'Undo the rest first, so the root is alone. Then square both sides.' },
          ],
        },
        {
          id: 'square',
          ask: 'Is the squared part the whole of its side of the formula?',
          branches: [
            { label: ROOT_ALONE, outcome: 'Take the square root of both sides first.' },
            { label: ROOT_NOT_ALONE, outcome: 'Undo the rest first, so the square is alone. Then take the square root.' },
          ],
        },
      ],
      answer: [root ? ROOT_UNDER : ROOT_SQUARED, alone ? ROOT_ALONE : ROOT_NOT_ALONE],
    };
  },
  solution: (params) => {
    const f = rootFormula(params);
    const { root, alone } = rootShape(params.form);
    const thing = root ? 'root' : 'square';
    return [
      {
        text: alone
          ? `The ${thing} is the whole of its side, so it comes off first.`
          : `Something else shares the side with the ${thing}, so that comes off first.`,
      },
      ...formulaSolution(f),
    ];
  },
};

interface RootSignParams {
  form: 'square' | 'shift';
  set: number;
  k: number;
  n: number;
  /** Whether the subject is a quantity that cannot be negative. */
  positive: boolean;
}

/**
 * Which sign? A square has two square roots, and which to keep depends on
 * what the letter stands for: a radius is never negative, so only the
 * positive root; a letter that can be any number keeps both, written $\pm$.
 * The options are listed in the same order whatever the answer, so their
 * places say nothing.
 */
const rootSign: Generator<RootSignParams> = {
  id: 'lin-root-sign',
  sample: (rng, difficulty) => ({
    form: difficulty > 1 ? rng.pick(['shift', 'shift', 'square'] as const) : 'square',
    set: rng.int(0, ROOT_SETS.length - 1),
    k: rng.pick([0, 2, 3, 4, 5, 6, 7, 8, 9]),
    n: rng.int(2, 20),
    positive: rng.chance(0.5),
  }),
  render: (params): Slide => {
    const { form, set, k, n, positive } = params;
    const [A, S, noun] = ROOT_SETS[set];
    const K = k === 0 ? '\\pi' : `${k}`;
    const tex = form === 'square' ? `${A} = ${K}${k === 0 ? ' ' : ''}${S}^2` : `${A} = ${S}^2 + ${n}`;
    const root = form === 'square' ? `\\sqrt{${fr(A, K)}}` : `\\sqrt{${A} - ${n}}`;
    const slip = form === 'square' ? fr(`\\sqrt{${A}}`, K) : `\\sqrt{${A}} - ${n}`;
    const slipBoth = form === 'square' ? `\\pm ${slip}` : `\\pm(${slip})`;
    const labels = [`${S} = ${root}`, `${S} = \\pm ${root}`, `${S} = ${slip}`, `${S} = ${slipBoth}`];
    const correct = positive ? labels[0] : labels[1];
    const sorted = [...labels].sort();
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: positive
            ? `Make $${S}$ the subject. Here $${S}$ is ${noun}, so it cannot be negative.`
            : `Make $${S}$ the subject. Here $${S}$ can be any number, positive or negative.`,
        },
        { kind: 'display', tex },
      ],
      options: sorted.map((label, idx) => ({ id: `o${idx}`, label, tex: true })),
      correctId: `o${sorted.indexOf(correct)}`,
    };
  },
  solution: (params) => {
    const { form, set, k, n, positive } = params;
    const [A, S] = ROOT_SETS[set];
    const K = k === 0 ? '\\pi' : `${k}`;
    const alone = form === 'square' ? fr(A, K) : `${A} - ${n}`;
    const root = `\\sqrt{${alone}}`;
    return [
      { text: form === 'square' ? `Divide both sides by $${K}$ so the square is alone.` : `Take $${n}$ from both sides so the square is alone.` },
      { tex: `${alone} = ${S}^2` },
      {
        text: 'Undo the square with a square root of the whole side. Both a number and its negative square to the same thing, so there are two roots.',
      },
      {
        text: positive
          ? `$${S}$ cannot be negative here, so only the positive one: $${S} = ${root}$.`
          : `$${S}$ can be negative, so both: $${S} = \\pm ${root}$.`,
      },
    ];
  },
};

/* ---------- Lesson 5: using the new subject ---------- */

type UseStory = 'speed' | 'perimeter' | 'cost' | 'temperature' | 'trapezium' | 'candle';

interface UseParams {
  story: UseStory;
  /** Three drawn values, read per story; the answer is built from them. */
  p: number;
  q: number;
  r: number;
}

/**
 * Each story: the formula, the rearranged form, the letters' values, and the
 * rearranged form as a tree with those values in place. `answer` is the value
 * the tree comes to, and `slips` the values the usual wrong rearrangements
 * would give.
 */
function formulaInUse({ story, p, q, r }: UseParams): {
  formula: string;
  subject: string;
  rearranged: string;
  given: string;
  expr: Expr;
  answer: number;
  slips: number[];
} {
  if (story === 'speed') {
    const [a, t, u] = [p, q, r];
    const v = u + a * t;
    return {
      formula: 'v = u + at',
      subject: 't',
      rearranged: fr('v - u', 'a'),
      given: `$v = ${v}$, $u = ${u}$ and $a = ${a}$`,
      expr: bin('/', bin('-', num(v), num(u)), num(a)),
      answer: t,
      slips: [(v + u) / a, v / a - u, v - u - a],
    };
  }
  if (story === 'perimeter') {
    const [l, w] = [p, q];
    const P = 2 * (l + w);
    return {
      formula: 'P = 2(l + w)',
      subject: 'w',
      rearranged: `${fr('P', '2')} - l`,
      given: `$P = ${P}$ and $l = ${l}$`,
      expr: bin('-', bin('/', num(P), num(2)), num(l)),
      answer: w,
      slips: [P / 2 + l, (P - l) / 2, P - 2 * l],
    };
  }
  if (story === 'cost') {
    const [rate, n, F] = [p, q, r];
    const C = F + rate * n;
    return {
      formula: 'C = F + rn',
      subject: 'n',
      rearranged: fr('C - F', 'r'),
      given: `$C = ${C}$, $F = ${F}$ and $r = ${rate}$`,
      expr: bin('/', bin('-', num(C), num(F)), num(rate)),
      answer: n,
      slips: [(C + F) / rate, C / rate - F, C - F - rate],
    };
  }
  if (story === 'temperature') {
    const C = 5 * p;
    const F = (9 * C) / 5 + 32;
    return {
      formula: `C = ${fr('5(F - 32)', '9')}`,
      subject: 'F',
      rearranged: `${fr('9C', '5')} + 32`,
      given: `$C = ${C}$`,
      expr: bin('+', bin('/', bin('*', num(9), num(C)), num(5)), num(32)),
      answer: F,
      slips: [(9 * C) / 5 - 32, (5 * C) / 9 + 32, (9 * (C + 32)) / 5],
    };
  }
  if (story === 'trapezium') {
    const [a, b, h] = [p, q, r];
    const A = (h * (a + b)) / 2;
    return {
      formula: `A = ${fr('(a + b)h', '2')}`,
      subject: 'h',
      rearranged: fr('2A', 'a + b'),
      given: `$A = ${A}$, $a = ${a}$ and $b = ${b}$`,
      expr: bin('/', bin('*', num(2), num(A)), bin('+', num(a), num(b))),
      answer: h,
      slips: [A / (a + b), 2 * A - a - b, (2 * A) / a + b],
    };
  }
  const [b, k, t] = [p, q, r];
  const h = b - k * t;
  return {
    formula: 'h = b - kt',
    subject: 't',
    rearranged: fr('b - h', 'k'),
    given: `$b = ${b}$, $h = ${h}$ and $k = ${k}$`,
    expr: bin('/', bin('-', num(b), num(h)), num(k)),
    answer: t,
    slips: [(b + h) / k, (h - b) / k, b - h - k],
  };
}

/**
 * Rearrange, then substitute: the rearranged formula with the numbers in,
 * worked one piece at a time. The numbers are drawn so every piece is whole —
 * the temperature is a multiple of 5, the trapezium's area comes out even.
 */
const useFormula: Generator<UseParams> = {
  id: 'lin-use-formula',
  choices: (params) => {
    const s = formulaInUse(params);
    return numberChoices(s.answer, ...s.slips);
  },
  sample: (rng, difficulty) => {
    const story = rng.pick(difficulty > 1 ? (['temperature', 'trapezium', 'candle'] as const) : (['speed', 'perimeter', 'cost'] as const));
    if (story === 'speed') return { story, p: rng.int(2, 9), q: rng.int(2, 12), r: rng.int(1, 20) };
    if (story === 'perimeter') {
      const l = rng.int(3, 20);
      return { story, p: l, q: rng.int(1, l - 1), r: 0 };
    }
    if (story === 'cost') return { story, p: rng.int(2, 9), q: rng.int(2, 15), r: rng.int(2, 25) };
    if (story === 'temperature') return { story, p: rng.int(1, 20), q: 0, r: 0 };
    if (story === 'trapezium') {
      return drawUntil(
        () => ({ story, p: rng.int(2, 12), q: rng.int(2, 12), r: rng.int(2, 12) }),
        (v) => (v.r * (v.p + v.q)) % 2 === 0 && v.p !== v.q,
        { story, p: 3, q: 5, r: 4 },
      );
    }
    return drawUntil(
      () => ({ story, p: rng.int(20, 45), q: rng.int(2, 5), r: rng.int(2, 8) }),
      (v) => v.p - v.q * v.r >= 2,
      { story, p: 30, q: 3, r: 4 },
    );
  },
  render: (params): Slide => {
    const s = formulaInUse(params);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `Making $${s.subject}$ the subject of $${s.formula}$ gives $${s.subject} = ${s.rearranged}$. Find $${s.subject}$ when ${s.given}. ${HOW_TO_REDUCE}`,
        },
      ],
      expr: s.expr,
      banks: banksFor(s.expr),
    };
  },
  solution: (params) => {
    const s = formulaInUse(params);
    return [
      { text: `Rearrange first, so $${s.subject}$ is on its own.` },
      { tex: `${s.subject} = ${s.rearranged}` },
      { text: `Then put in ${s.given}, and work the top and the bottom out before dividing.` },
      { tex: `${s.subject} = ${s.answer}` },
    ];
  },
};

type SliderStory = 'speed' | 'cost' | 'candle' | 'tank';

interface UseSliderParams {
  story: SliderStory;
  /** The starting value, the rate, and the answer. */
  b: number;
  k: number;
  x: number;
}

const SLIDER_STORIES: Record<
  SliderStory,
  { formula: string; letters: [string, string, string, string]; text: (b: number, k: number, y: number) => string; down: boolean }
> = {
  speed: {
    formula: 'v = u + at',
    letters: ['v', 'u', 'a', 't'],
    text: (b, k, y) => `A car's speed is $v = u + at$, with $u = ${b}$ and $a = ${k}$. The line is $v$ against the time $t$. Slide to the $t$ when $v = ${y}$.`,
    down: false,
  },
  cost: {
    formula: 'C = F + rn',
    letters: ['C', 'F', 'r', 'n'],
    text: (b, k, y) => `A hire charge is $C = F + rn$ pounds for $n$ days, with $F = ${b}$ and $r = ${k}$. The line is $C$ against $n$. Slide to the $n$ when $C = ${y}$.`,
    down: false,
  },
  candle: {
    formula: 'h = b - kt',
    letters: ['h', 'b', 'k', 't'],
    text: (b, k, y) => `A candle's height is $h = b - kt$ cm after $t$ hours, with $b = ${b}$ and $k = ${k}$. The line is $h$ against $t$. Slide to the $t$ when $h = ${y}$.`,
    down: true,
  },
  tank: {
    formula: 'V = c - rt',
    letters: ['V', 'c', 'r', 't'],
    text: (b, k, y) => `A tank drains so that it holds $V = c - rt$ litres after $t$ minutes, with $c = ${b}$ and $r = ${k}$. The line is $V$ against $t$. Slide to the $t$ when $V = ${y}$.`,
    down: true,
  },
};

/**
 * Rearranging as reading a graph backwards.
 *
 * A formula gives its subject from the other letters; asked the other way
 * round — when does the speed reach 19? — it is the rearranged formula that
 * answers, and on the graph that is reading across from the height and down.
 * Difficulty 2 has formulae that count down.
 */
const useSlider: Generator<UseSliderParams> = {
  id: 'lin-use-slider',
  sample: (rng, difficulty) => {
    const story = rng.pick(difficulty > 1 ? (['candle', 'tank'] as const) : (['speed', 'cost'] as const));
    const k = rng.int(1, 5);
    const x = rng.int(1, 11);
    // A falling line starts high enough to stay above zero across the window.
    const b = difficulty > 1 ? rng.int(12 * k + 1, 12 * k + 15) : rng.int(0, 12);
    return { story, b, k, x };
  },
  render: (params): Slide => {
    const { story, b, k, x } = params;
    const s = SLIDER_STORIES[story];
    const f = (t: number) => (s.down ? b - k * t : b + k * t);
    const y = f(x);
    const ends = [f(0), f(12)];
    return {
      kind: 'slider',
      prompt: [{ kind: 'prose', text: s.text(b, k, y) }],
      min: 0,
      max: 12,
      step: 1,
      answer: x,
      readout: `${s.letters[3]} = {v}`,
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 12,
          yMin: Math.min(...ends, 0) - 2,
          yMax: Math.max(...ends) + 2,
          curves: [{ f }],
          horizontals: [y],
          verticals: [{ x: 0, dashed: false }],
          label: 'A straight line crossing a dashed horizontal line',
        }),
        ...markerWindow(0, 12),
      },
    };
  },
  solution: (params) => {
    const { story, b, k, x } = params;
    const s = SLIDER_STORIES[story];
    const [Y, B, K, T] = s.letters;
    const y = s.down ? b - k * x : b + k * x;
    const rearranged = s.down ? fr(`${B} - ${Y}`, K) : fr(`${Y} - ${B}`, K);
    const worked = s.down ? fr(`${b} - ${y}`, `${k}`) : fr(`${y} - ${b}`, `${k}`);
    return [
      { text: `Make $${T}$ the subject of $${s.formula}$.` },
      { tex: `${T} = ${rearranged}` },
      { text: 'Put the numbers in.' },
      { tex: `${T} = ${worked} = ${x}` },
      { text: `On the graph, that is where the line reaches the dashed height $${y}$.` },
    ];
  },
};

type WhichSource = 'linear' | 'bracket' | 'twice' | 'root';

interface WhichParams {
  source: WhichSource;
  linear: LinearParams;
  bracket: BracketFormulaParams;
  twice: TwiceParams;
  root: RootParams;
  /** Whether the right option is written the less usual way. */
  alt: boolean;
}

function whichFormula(params: WhichParams): Formula {
  if (params.source === 'linear') return linearFormula(params.linear);
  if (params.source === 'bracket') return bracketFormula(params.bracket);
  if (params.source === 'twice') return twiceFormula(params.twice);
  return rootFormula(params.root);
}

/**
 * Pick the correct rearrangement from four.
 *
 * Half the time the right one is written the less usual way —
 * $\frac{v}{a} - \frac{u}{a}$ rather than $\frac{v - u}{a}$ — so the question
 * cannot be answered by matching a remembered shape: each option has to be
 * checked. The options are sorted, so where the right one sits says nothing.
 * Difficulty 1 draws from the first two lessons; difficulty 2 from the third
 * and fourth.
 */
const whichRearrangement: Generator<WhichParams> = {
  id: 'lin-which-rearrangement',
  sample: (rng, difficulty) => {
    const source = rng.pick(difficulty > 1 ? (['twice', 'root', 'root'] as const) : (['linear', 'linear', 'bracket'] as const));
    return {
      source,
      linear: sampleLinear(rng, [...EASY_LINEAR, ...HARD_LINEAR]),
      bracket: sampleBracketFormula(rng, ['bracket', 'bracket-minus', 'over', 'over-bracket', 'trapezium']),
      twice: sampleTwice(rng, ['collect', 'twice', 'fraction', 'fraction2']),
      root: sampleRoot(rng, ['square', 'root', 'coef-root', 'suvat', 'pendulum', 'kinetic', 'root-plus']),
      alt: rng.chance(0.5),
    };
  },
  render: (params): Slide => {
    const f = whichFormula(params);
    const shown = params.alt && f.altTex ? f.altTex : f.resultTex;
    const offered = subjectChoices(f, shown);
    const sorted = [...offered].sort((a, b) => (a.tex < b.tex ? -1 : a.tex > b.tex ? 1 : 0));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which of these is a correct rearrangement for $${f.subject}$? The right one may not be written the way you would write it.`,
        },
        { kind: 'display', tex: f.tex },
      ],
      options: sorted.map((option, idx) => ({ id: `o${idx}`, label: option.tex, tex: true })),
      correctId: `o${sorted.findIndex((option) => option.correct)}`,
    };
  },
  solution: (params) => {
    const f = whichFormula(params);
    const steps = formulaSolution(f);
    if (params.alt && f.altTex) {
      steps.push({ text: `Written another way, that is $${f.subject} = ${f.altTex}$: the same value for every choice of the letters.` });
    }
    return steps;
  },
};

type WordsStory = 'taxi' | 'hire' | 'tank' | 'savings' | 'candle' | 'rectangle' | 'triangle' | 'mean';

interface FormulaWordsParams {
  story: WordsStory;
  b: number;
  k: number;
}

/**
 * Each story as a formula: the words, the two letters (the given one, then
 * the subject), the formula as the words build it, and the rearrangement.
 */
function wordsFormula({ story, b, k }: FormulaWordsParams): Formula & { words: string } {
  const linear = (Y: string, S: string, words: string, down = false): Formula & { words: string } => {
    const tex = down ? `${Y} = ${b} - ${k}${S}` : `${Y} = ${b} + ${k}${S}`;
    const top = down ? `${b} - ${Y}` : `${Y} - ${b}`;
    return {
      words,
      tex,
      subject: S,
      letters: [Y, S],
      resultTex: fr(top, `${k}`),
      answer: `(${top})/${k}`,
      left: Y,
      right: down ? `${b} - ${k}*${S}` : `${b} + ${k}*${S}`,
      slips: [],
      lines: [down ? `${k}${S} = ${top}` : `${top} = ${k}${S}`, down ? `${S} = ${fr(top, `${k}`)}` : `${fr(top, `${k}`)} = ${S}`],
      moves: [down ? `Add $${k}${S}$ to both sides and take $${Y}$ from both.` : `Take $${b}$ from both sides.`, `Divide both sides by $${k}$.`],
      lineSlips: [],
    };
  };
  if (story === 'taxi') {
    return linear('C', 'm', `A taxi charges £${b} to start, plus £${k} for every mile. A journey of $m$ miles costs $C$ pounds. Write a formula for $m$ in terms of $C$.`);
  }
  if (story === 'hire') {
    return linear('C', 'h', `Hiring a bike costs £${b}, plus £${k} for every hour. Hiring it for $h$ hours costs $C$ pounds. Write a formula for $h$ in terms of $C$.`);
  }
  if (story === 'tank') {
    return linear('V', 't', `A tank holds ${b} litres of water and is filled at ${k} litres a minute. After $t$ minutes it holds $V$ litres. Write a formula for $t$ in terms of $V$.`);
  }
  if (story === 'savings') {
    return linear('T', 'w', `Sam has saved £${b} and puts in £${k} more every week. After $w$ weeks Sam has $T$ pounds. Write a formula for $w$ in terms of $T$.`);
  }
  if (story === 'candle') {
    return linear('h', 't', `A candle is ${b} cm tall and burns down ${k} cm every hour. After $t$ hours it is $h$ cm tall. Write a formula for $t$ in terms of $h$.`, true);
  }
  if (story === 'rectangle') {
    const top = `P - ${2 * k}`;
    return {
      words: `A rectangle is ${k} cm longer than it is wide. Its width is $w$ cm and its perimeter is $P$ cm. Write a formula for $w$ in terms of $P$.`,
      tex: `\\begin{aligned} P &= 2(w + w + ${k}) \\\\ &= 4w + ${2 * k} \\end{aligned}`,
      subject: 'w',
      letters: ['P', 'w'],
      resultTex: fr(top, '4'),
      answer: `(${top})/4`,
      left: 'P',
      right: `4*w + ${2 * k}`,
      slips: [],
      lines: [`${top} = 4w`, `${fr(top, '4')} = w`],
      moves: [`Take $${2 * k}$ from both sides.`, 'Divide both sides by $4$.'],
      lineSlips: [],
    };
  }
  if (story === 'triangle') {
    const top = `P + ${k}`;
    return {
      words: `An isosceles triangle has two equal sides of $a$ cm, and its base is ${k} cm shorter than each of them. Its perimeter is $P$ cm. Write a formula for $a$ in terms of $P$.`,
      tex: `\\begin{aligned} P &= a + a + (a - ${k}) \\\\ &= 3a - ${k} \\end{aligned}`,
      subject: 'a',
      letters: ['P', 'a'],
      resultTex: fr(top, '3'),
      answer: `(${top})/3`,
      left: 'P',
      right: `3*a - ${k}`,
      slips: [],
      lines: [`${top} = 3a`, `${fr(top, '3')} = a`],
      moves: [`Add $${k}$ to both sides.`, 'Divide both sides by $3$.'],
      lineSlips: [],
    };
  }
  return {
    words: `The mean of $x$ and ${b} is $M$. Write a formula for $x$ in terms of $M$.`,
    tex: `M = ${fr(`x + ${b}`, '2')}`,
    subject: 'x',
    letters: ['M', 'x'],
    resultTex: `2M - ${b}`,
    answer: `2*M - ${b}`,
    left: 'M',
    right: `(x + ${b})/2`,
    slips: [],
    lines: [`2M = x + ${b}`, `2M - ${b} = x`],
    moves: ['Multiply both sides by $2$.', `Take $${b}$ from both sides.`],
    lineSlips: [],
  };
}

/**
 * A formula from words, then rearranged: the words say how the given
 * quantity is built from the subject, and the learner writes the subject in
 * terms of it. Two steps in one question, typed, so either order of the
 * working and any equal way of writing the answer is accepted. Difficulty 2
 * has a quantity that goes down, or a shape where the subject is counted
 * more than once.
 */
const formulaWords: Generator<FormulaWordsParams> = {
  id: 'lin-formula-words',
  sample: (rng, difficulty) => ({
    story: rng.pick(difficulty > 1 ? (['candle', 'rectangle', 'triangle', 'mean'] as const) : (['taxi', 'hire', 'tank', 'savings'] as const)),
    b: difficulty > 1 ? rng.int(12, 40) : rng.int(2, 20),
    k: rng.int(2, 9),
  }),
  render: (params): Slide => {
    const f = wordsFormula(params);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: f.words }],
      lead: `${f.subject} =`,
      keypad: formulaKeys(f),
      answer: f.answer,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const f = wordsFormula(params);
    return [{ text: 'Write the words as a formula first.' }, ...formulaSolution(f)];
  },
};

/** The typed rearrangements and the formula each rearranges, for the independent check in the tests. */
export const rearrangements: Record<string, (params: never) => Formula> = {
  'lin-subject': linearFormula,
  'lin-bracket-subject': bracketFormula,
  'lin-twice-subject': twiceFormula,
  'lin-root-subject': rootFormula,
  'lin-formula-words': wordsFormula,
};

/* ======================================================================
 * Level 4: Linear Inequalities
 *
 * Built outward from the answer like everything above: the boundary is drawn
 * first and the inequality worked out from it, so every end is whole and
 * lands on a tick of the number line. The checker compares values and cannot
 * grade `x > 3`, so a solution set goes through `numberLine`, `tiles`,
 * `choice` or `flow`; `expression` is kept for a number.
 * ==================================================================== */

type Ineq = '<' | '<=' | '>' | '>=';

const INEQ_TEX: Record<Ineq, string> = { '<': '<', '<=': '\\le', '>': '>', '>=': '\\ge' };
const TURNED: Record<Ineq, Ineq> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
const ALL_INEQ: readonly Ineq[] = ['<', '<=', '>', '>='];
const isStrict = (op: Ineq) => op === '<' || op === '>';
const pointsUp = (op: Ineq) => op === '>' || op === '>=';

/** Whether `left op right` holds. */
function holds(left: number, op: Ineq, right: number): boolean {
  if (op === '<') return left < right;
  if (op === '<=') return left <= right;
  if (op === '>') return left > right;
  return left >= right;
}

/** The ray `x op k`, written canonically for a number line's answer. */
function rayOf(k: number, op: Ineq): string {
  if (pointsUp(op)) return `${isStrict(op) ? '(' : '['}${k},inf)`;
  return `(-inf,${k}${isStrict(op) ? ')' : ']'}`;
}

/** What the drawing of `x op k` looks like, in words. */
function rayWords(k: number, op: Ineq): string {
  const dot = isStrict(op)
    ? `$x ${INEQ_TEX[op]} ${k}$ leaves $${k}$ out, so the dot at $${k}$ is hollow`
    : `$x ${INEQ_TEX[op]} ${k}$ includes $${k}$, so the dot at $${k}$ is filled`;
  return `${dot}, and the shading runs ${pointsUp(op) ? 'right' : 'left'} from it, off the end of the line.`;
}

/** m times a number, as a substitution is written out: `3 \times (-2)`, `-4`. */
function timesTex(m: number, t: number): string {
  if (m === 1) return br(t);
  if (m === -1) return `-${br(t)}`;
  return `${m} \\times ${br(t)}`;
}

/* ---------- One inequality in one unknown ---------- */

/**
 * `ax + b op cx + d`, with `c = 0` for a number on the right.
 *
 * `d` is not stored: the boundary `k` is drawn first and `d` worked out from
 * it, so solving always lands on a whole number. `lead` writes the number
 * first, `5 - 2x`, which is how a negative coefficient usually arrives.
 */
interface OneSided {
  a: number;
  b: number;
  c: number;
  op: Ineq;
  k: number;
  lead: boolean;
}

/** The x coefficient once the x terms are collected on the left. */
const oneNet = (p: OneSided) => p.a - p.c;
/** The number on the right-hand side. */
const oneRight = (p: OneSided) => oneNet(p) * p.k + p.b;
/** The sign once x is alone: turned round when the net coefficient is negative. */
const oneSolved = (p: OneSided): Ineq => (oneNet(p) < 0 ? TURNED[p.op] : p.op);

function oneLeftTex({ a, b, lead }: OneSided): string {
  return lead ? `${b} ${signedTile(a, 'x')}` : linTex(a, b);
}

function oneTex(p: OneSided): string {
  const d = oneRight(p);
  return `${oneLeftTex(p)} ${INEQ_TEX[p.op]} ${p.c === 0 ? d : linTex(p.c, d)}`;
}

/**
 * One inequality, drawn so its solution goes the way asked.
 *
 * `'up'` keeps the collected coefficient positive, so the sign never turns;
 * `'down'` makes it negative, which is the next lesson. `both` puts $x$ on
 * both sides; with `'down'` the side with more $x$ is the right, so collecting
 * on the left is what forces a division by a negative.
 */
function sampleOne(rng: Rng, way: 'up' | 'down', both: boolean): OneSided {
  const op = rng.pick(ALL_INEQ);
  const k = rng.int(-6, 6);
  if (!both) {
    const size = rng.int(2, 7);
    const b = rng.pick(nonZeroRange(-9, 9));
    return way === 'up'
      ? { a: size, b, c: 0, op, k, lead: false }
      : { a: -size, b, c: 0, op, k, lead: rng.chance(0.6) };
  }
  return drawUntil(
    () => {
      const small = rng.int(1, 5);
      const net = rng.int(2, 5);
      const b = rng.pick(nonZeroRange(-12, 12));
      return way === 'up'
        ? { a: small + net, b, c: small, op, k, lead: false }
        : { a: small, b, c: small + net, op, k, lead: false };
    },
    (p) => oneRight(p) !== 0 && oneRight(p) !== p.b,
    way === 'up' ? { a: 5, b: 3, c: 2, op, k: 2, lead: false } : { a: 2, b: 5, c: 5, op, k: 4, lead: false },
  );
}

/** Solving, one move per line. */
function oneWorking(p: OneSided): SolutionStep[] {
  const { b, c, op, k } = p;
  const n = oneNet(p);
  const d = oneRight(p);
  const steps: SolutionStep[] = [{ tex: oneTex(p) }];
  if (c !== 0) {
    steps.push({
      text: `Take $${termTex(c, 1)}$ from both sides, so the $x$ terms are together on the left.`,
      tex: `${linTex(n, b)} ${INEQ_TEX[op]} ${d}`,
    });
  }
  steps.push({
    text: b > 0 ? `Take $${b}$ from both sides.` : `Add $${-b}$ to both sides.`,
    tex: `${termTex(n, 1)} ${INEQ_TEX[op]} ${d - b}`,
  });
  steps.push({
    text:
      n < 0
        ? `Divide both sides by $${n}$. Dividing by a negative number turns the sign round.`
        : `Divide both sides by $${n}$. It is positive, so the sign stays as it is.`,
    tex: `x ${INEQ_TEX[oneSolved(p)]} ${k}`,
  });
  return steps;
}

interface OneLineParams extends OneSided {
  min: number;
  max: number;
}

function oneLineSlide(p: OneLineParams): Slide {
  return {
    kind: 'numberLine',
    prompt: [
      { kind: 'prose', text: 'Solve the inequality, then shade its solution set.' },
      { kind: 'display', tex: oneTex(p) },
    ],
    min: p.min,
    max: p.max,
    step: 1,
    answer: rayOf(p.k, oneSolved(p)),
  };
}

function oneLineSolution(p: OneSided): SolutionStep[] {
  return [...oneWorking(p), { text: rayWords(p.k, oneSolved(p)) }];
}

/**
 * Solve, then shade: the ray on a number line.
 *
 * The coefficient stays positive, so the sign never turns; difficulty 2 puts
 * $x$ on both sides.
 */
const ineqLine: Generator<OneLineParams> = {
  id: 'lin-ineq-line',
  sample: (rng, difficulty) => {
    const p = sampleOne(rng, 'up', difficulty > 1);
    return { ...p, ...windowFor(rng, p.k, p.k, 10, 2) };
  },
  render: oneLineSlide,
  solution: oneLineSolution,
};

/**
 * The same with a negative coefficient, so the sign turns round on the way.
 * Difficulty 2 has more $x$ on the right, collected on the left.
 */
const flipLine: Generator<OneLineParams> = {
  id: 'lin-flip-line',
  sample: (rng, difficulty) => {
    const p = sampleOne(rng, 'down', difficulty > 1);
    return { ...p, ...windowFor(rng, p.k, p.k, 10, 2) };
  },
  render: oneLineSlide,
  solution: oneLineSolution,
};

/**
 * One inequality as a line of working, one move per tap.
 *
 * The tempting wrong lines are in each bank: the number moved the wrong way,
 * and the sign turned round when it should not have been (or kept when it
 * should).
 */
function oneStepsSlide(p: OneSided, text: string): Slide {
  const { a, b, c, op, k, lead } = p;
  const T = INEQ_TEX;
  const n = oneNet(p);
  const d = oneRight(p);
  const s = oneSolved(p);
  const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [];
  let start: string[];
  const isolated = `${termTex(n, 1)} ${T[op]} ${d - b}`;
  const isolatedBank = stepBank(
    isolated,
    `${termTex(n, 1)} ${T[op]} ${d + b}`,
    `${termTex(n, 1)} ${T[TURNED[op]]} ${d - b}`,
    `x ${T[op]} ${d - b}`,
  );
  if (c === 0) {
    start = lead
      ? [`${b}`, `{} ${signedTile(a, 'x')}`, T[op], `${d}`]
      : [termTex(a, 1), `{} ${signedTile(b)}`, T[op], `${d}`];
    reductions.push({ span: [0, 4], operator: lead ? 0 : 1, value: isolated, bank: isolatedBank });
  } else {
    start = [termTex(a, 1), `{} ${signedTile(b)}`, T[op], termTex(c, 1), `{} ${signedTile(d)}`];
    const collected = `${linTex(n, b)} ${T[op]} ${d}`;
    reductions.push({
      span: [0, 5],
      operator: 3,
      value: collected,
      bank: stepBank(
        collected,
        `${linTex(a + c, b)} ${T[op]} ${d}`,
        `${linTex(-n, b)} ${T[op]} ${d}`,
        `${linTex(n, b)} ${T[TURNED[op]]} ${d}`,
      ),
    });
    reductions.push({ span: [0, 1], value: isolated, bank: isolatedBank });
  }
  const solved = `x ${T[s]} ${k}`;
  reductions.push({
    span: [0, 1],
    value: solved,
    bank: stepBank(solved, `x ${T[n < 0 ? op : TURNED[op]]} ${k}`, `x ${T[s]} ${-k}`, `x ${T[s]} ${d - b}`),
  });
  return { kind: 'steps', prompt: [{ kind: 'prose', text: `${text} ${HOW_TO_STEP}` }], start, reductions };
}

/** Solving an inequality exactly as an equation, while the sign never turns. */
const ineqSteps: Generator<OneSided> = {
  id: 'lin-ineq-steps',
  sample: (rng, difficulty) => sampleOne(rng, 'up', difficulty > 1),
  render: (p) => oneStepsSlide(p, 'Solve the inequality one move at a time.'),
  solution: oneWorking,
};

/** The same with a negative coefficient: the last move turns the sign round. */
const flipSteps: Generator<OneSided> = {
  id: 'lin-flip-steps',
  sample: (rng, difficulty) => sampleOne(rng, 'down', difficulty > 1),
  render: (p) => oneStepsSlide(p, 'Solve one move at a time, and watch the sign on the last move.'),
  solution: oneWorking,
};

const PICTURES: readonly { id: string; label: string; strict: boolean; up: boolean }[] = [
  { id: 'filled-left', label: 'Filled dot, shaded to the left', strict: false, up: false },
  { id: 'hollow-left', label: 'Hollow dot, shaded to the left', strict: true, up: false },
  { id: 'filled-right', label: 'Filled dot, shaded to the right', strict: false, up: true },
  { id: 'hollow-right', label: 'Hollow dot, shaded to the right', strict: true, up: true },
];

/**
 * How the solution is drawn: filled or hollow, left or right.
 *
 * All four pictures are always offered, in a fixed order, so the options say
 * nothing about the answer. Difficulty 2 puts $x$ on both sides.
 */
const ineqPicture: Generator<OneSided> = {
  id: 'lin-ineq-picture',
  sample: (rng, difficulty) => sampleOne(rng, 'up', difficulty > 1),
  render: (p): Slide => {
    const s = oneSolved(p);
    const correct = PICTURES.find((pic) => pic.strict === isStrict(s) && pic.up === pointsUp(s))!;
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Solve the inequality. How is its solution drawn on a number line?' },
        { kind: 'display', tex: oneTex(p) },
      ],
      options: PICTURES.map((pic) => ({ id: pic.id, label: pic.label })),
      correctId: correct.id,
    };
  },
  solution: oneLineSolution,
};

interface TestParams extends OneSided {
  t: number;
}

const TEST_SMALLER = 'Smaller';
const TEST_EQUAL = 'Equal';
const TEST_BIGGER = 'Bigger';
const TEST_YES = 'Yes';
const TEST_NO = 'No';

/**
 * Is this number in the solution set? Put it in and see.
 *
 * The check that needs no solving, and so the one that catches a sign that
 * should have turned. The number tried is the boundary one time in three,
 * where only the strictness decides. Difficulty 2 has $x$ on both sides, with
 * the collected coefficient either sign.
 */
const ineqTestFlow: Generator<TestParams> = {
  id: 'lin-ineq-test-flow',
  sample: (rng, difficulty) => {
    const p =
      difficulty > 1
        ? sampleOne(rng, rng.chance(0.5) ? 'up' : 'down', true)
        : sampleOne(rng, 'up', false);
    return { ...p, t: p.k + rng.pick([-2, -1, 0, 0, 1, 2]) };
  },
  render: (p): Slide => {
    const { a, b, c, op, t } = p;
    const left = a * t + b;
    const right = c * t + oneRight(p);
    const compared = left < right ? TEST_SMALLER : left === right ? TEST_EQUAL : TEST_BIGGER;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Is $x = ${t}$ in the solution set? Find out by putting it in, without solving.`,
        },
      ],
      subject: oneTex(p),
      steps: [
        {
          id: 'compare',
          ask: `Put $x = ${t}$ into both sides. Compared with the right-hand side, the left-hand side is…`,
          branches: [
            { label: TEST_SMALLER, to: 'verdict' },
            { label: TEST_EQUAL, to: 'verdict' },
            { label: TEST_BIGGER, to: 'verdict' },
          ],
        },
        {
          id: 'verdict',
          ask: 'Does the inequality allow that?',
          branches: [
            { label: TEST_YES, outcome: `So $${t}$ is in the solution set.` },
            { label: TEST_NO, outcome: `So $${t}$ is not in the solution set.` },
          ],
        },
      ],
      answer: [compared, holds(left, op, right) ? TEST_YES : TEST_NO],
    };
  },
  solution: (p) => {
    const { a, b, c, op, k, lead, t } = p;
    const d = oneRight(p);
    const left = a * t + b;
    const right = c * t + d;
    const leftWork = lead ? `${b} ${a < 0 ? '-' : '+'} ${timesTex(Math.abs(a), t)}` : `${timesTex(a, t)} ${signedTile(b)}`;
    const rightWork = c === 0 ? `${d}` : `${timesTex(c, t)} ${signedTile(d)}`;
    const ok = holds(left, op, right);
    const s = oneSolved(p);
    return [
      { text: `Left-hand side at $x = ${t}$:`, tex: `${leftWork} = ${left}` },
      ...(c === 0 ? [] : [{ text: `Right-hand side at $x = ${t}$:`, tex: `${rightWork} = ${right}` }]),
      {
        text: `Is $${left} ${INEQ_TEX[op]} ${right}$? ${ok ? 'Yes' : 'No'}, so $${t}$ is ${ok ? '' : 'not '}in the solution set.`,
      },
      { text: `Solving agrees: the solution is $x ${INEQ_TEX[s]} ${k}$.` },
    ];
  },
};

type FlipMove = 'shift' | 'scale-up' | 'scale-down';

interface FlipParams {
  move: FlipMove;
  /** The subject is `ax + b op r`, or `x/a op k` when `over`. */
  a: number;
  b: number;
  op: Ineq;
  k: number;
  over: boolean;
}

const FLIP_ADD = 'Adds or subtracts';
const FLIP_TIMES = 'Multiplies or divides';
const FLIP_YES = 'Yes';
const FLIP_NO = 'No';

function flipSubject({ a, b, op, k, over }: FlipParams): string {
  if (over) return `${a < 0 ? '-' : ''}\\frac{x}{${Math.abs(a)}} ${INEQ_TEX[op]} ${k}`;
  return `${linTex(a, b)} ${INEQ_TEX[op]} ${a * k + b}`;
}

/** The move named in the prompt, and the line it leads to. */
function flipMove(p: FlipParams): { says: string; after: string } {
  const { move, a, b, op, k, over } = p;
  if (move === 'shift') {
    return {
      says: b > 0 ? `take $${b}$ from both sides` : `add $${-b}$ to both sides`,
      after: `${termTex(a, 1)} ${INEQ_TEX[op]} ${a * k}`,
    };
  }
  const s = a < 0 ? TURNED[op] : op;
  if (over) return { says: `multiply both sides by $${a}$`, after: `x ${INEQ_TEX[s]} ${a * k}` };
  return { says: `divide both sides by $${a}$`, after: `x ${INEQ_TEX[s]} ${k}` };
}

/**
 * Does this move turn the sign round?
 *
 * Only multiplying or dividing by a negative does. The traps are the moves
 * that look as if they should: taking a number away when the $x$ term is
 * negative, and dividing by a positive when the other side is negative.
 * Difficulty 2 leans on those and adds the fraction form, cleared by
 * multiplying by a negative.
 */
const flipFlow: Generator<FlipParams> = {
  id: 'lin-flip-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const move = rng.pick(['shift', 'scale-up', 'scale-down', 'scale-down'] as const);
    const op = rng.pick(ALL_INEQ);
    const size = rng.int(2, 9);
    if (move === 'shift') {
      // A negative x term, and at difficulty 2 a negative number to move too.
      return { move, a: -rng.int(2, 7), b: hard ? -rng.int(1, 12) : rng.int(1, 12), op, k: rng.pick(nonZeroRange(-6, 6)), over: false };
    }
    if (move === 'scale-up') {
      // Dividing by a positive, onto a negative right-hand side at difficulty 2.
      const k = hard ? -rng.int(1, 8) : rng.int(1, 8);
      return { move, a: size, b: 0, op, k, over: hard && rng.chance(0.5) };
    }
    return { move, a: -size, b: 0, op, k: rng.pick(nonZeroRange(-8, 8)), over: hard && rng.chance(0.5) };
  },
  render: (p): Slide => {
    const { says } = flipMove(p);
    const answer =
      p.move === 'shift' ? [FLIP_ADD] : [FLIP_TIMES, p.move === 'scale-down' ? FLIP_YES : FLIP_NO];
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `The next move is to ${says}. Does the inequality sign turn round?` }],
      subject: flipSubject(p),
      steps: [
        {
          id: 'what',
          ask: 'What does the move do to both sides?',
          branches: [
            { label: FLIP_ADD, outcome: 'Adding or subtracting never turns the sign round, whatever the numbers are.' },
            { label: FLIP_TIMES, to: 'negative' },
          ],
        },
        {
          id: 'negative',
          ask: 'By a negative number?',
          branches: [
            { label: FLIP_YES, outcome: 'Turn the sign round.' },
            { label: FLIP_NO, outcome: 'The sign stays as it is, even if other numbers are negative.' },
          ],
        },
      ],
      answer,
    };
  },
  solution: (p) => {
    const { says, after } = flipMove(p);
    const why =
      p.move === 'shift'
        ? 'Adding or subtracting moves both sides the same distance along the number line, so their order stays the same.'
        : p.move === 'scale-up'
          ? `Multiplying or dividing by a positive number keeps the order, even though a number here is negative.`
          : `Multiplying or dividing by a negative number reverses the order: $2 < 5$ but $-2 > -5$. So the sign turns round.`;
    const first = says.charAt(0).toUpperCase() + says.slice(1);
    return [{ tex: flipSubject(p) }, { text: why }, { text: `${first}:`, tex: after }];
  },
};

/**
 * The solution placed as tiles: a sign and a number.
 *
 * The bank holds all four signs, so the direction and the strictness are both
 * the learner's to choose. Difficulty 2 has more $x$ on the right.
 */
const flipTiles: Generator<OneSided> = {
  id: 'lin-flip-tiles',
  sample: (rng, difficulty) => sampleOne(rng, 'down', difficulty > 1),
  render: (p): Slide => {
    const s = oneSolved(p);
    const answer = [INEQ_TEX[s], `${p.k}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Solve the inequality. Place its solution.' },
        { kind: 'display', tex: oneTex(p) },
      ],
      template: 'x {0} {1}',
      bank: bankOf(answer, [...ALL_INEQ.map((op) => INEQ_TEX[op]), `${-p.k}`, `${oneRight(p) - p.b}`, `${p.k + 1}`]),
      answer,
    };
  },
  solution: oneLineSolution,
};

/* ---------- Double inequalities ---------- */

/** The set `lo loOp x hiOp hi`, with `ax + b` in the middle once written out. */
interface DoubleParams {
  a: number;
  b: number;
  lo: number;
  hi: number;
  loOp: '<' | '<=';
  hiOp: '<' | '<=';
}

/**
 * The written form's two ends and signs. With a negative coefficient the
 * middle falls as $x$ rises, so the left of the written form belongs to the
 * top of the interval.
 */
function doubleParts({ a, b, lo, hi, loOp, hiOp }: DoubleParams) {
  return a > 0
    ? { left: a * lo + b, right: a * hi + b, op1: loOp, op2: hiOp }
    : { left: a * hi + b, right: a * lo + b, op1: hiOp, op2: loOp };
}

function middleTex(a: number, b: number): string {
  return a < 0 ? `${b} ${signedTile(a, 'x')}` : linTex(a, b);
}

function doubleTex(p: DoubleParams): string {
  const { left, right, op1, op2 } = doubleParts(p);
  return `${left} ${INEQ_TEX[op1]} ${middleTex(p.a, p.b)} ${INEQ_TEX[op2]} ${right}`;
}

function intervalTex({ lo, hi, loOp, hiOp }: DoubleParams): string {
  return `${lo} ${INEQ_TEX[loOp]} x ${INEQ_TEX[hiOp]} ${hi}`;
}

function intervalSet({ lo, hi, loOp, hiOp }: DoubleParams): string {
  return `${loOp === '<=' ? '[' : '('}${lo},${hi}${hiOp === '<=' ? ']' : ')'}`;
}

/** Difficulty 1 keeps the coefficient positive; difficulty 2 makes it negative. */
function sampleDouble(rng: Rng, difficulty: number, spread: [number, number] = [2, 7]): DoubleParams {
  const size = rng.int(2, 5);
  const lo = rng.int(-6, 3);
  return {
    a: difficulty > 1 ? -size : size,
    b: rng.pick(nonZeroRange(-9, 9)),
    lo,
    hi: lo + rng.int(spread[0], spread[1]),
    loOp: rng.pick(['<', '<='] as const),
    hiOp: rng.pick(['<', '<='] as const),
  };
}

function doubleWorking(p: DoubleParams): SolutionStep[] {
  const { a, b } = p;
  const { left, right, op1, op2 } = doubleParts(p);
  const steps: SolutionStep[] = [
    { tex: doubleTex(p) },
    {
      text: `Do the same to all three parts. ${b > 0 ? `Take $${b}$ from each.` : `Add $${-b}$ to each.`}`,
      tex: `${left - b} ${INEQ_TEX[op1]} ${termTex(a, 1)} ${INEQ_TEX[op2]} ${right - b}`,
    },
  ];
  if (a > 0) {
    steps.push({ text: `Divide all three by $${a}$.`, tex: intervalTex(p) });
  } else {
    steps.push({
      text: `Divide all three by $${a}$. It is negative, so both signs turn round.`,
      tex: `${(left - b) / a} ${INEQ_TEX[TURNED[op1]]} x ${INEQ_TEX[TURNED[op2]]} ${(right - b) / a}`,
    });
    steps.push({ text: 'Read it from the smaller end, the usual way round.', tex: intervalTex(p) });
  }
  return steps;
}

function endsWords({ lo, hi, loOp, hiOp }: DoubleParams): string {
  const end = (value: number, op: '<' | '<=') => (op === '<=' ? `a filled dot at $${value}$` : `a hollow dot at $${value}$`);
  return `On the line: ${end(lo, loOp)}, ${end(hi, hiOp)}, and the stretch between them shaded.`;
}

interface DoubleLineParams extends DoubleParams {
  min: number;
  max: number;
}

/** A double inequality solved and drawn: a bounded interval. */
const doubleLine: Generator<DoubleLineParams> = {
  id: 'lin-double-line',
  sample: (rng, difficulty) => {
    const p = sampleDouble(rng, difficulty);
    return { ...p, ...windowFor(rng, p.lo, p.hi, 10, 1) };
  },
  render: (p): Slide => ({
    kind: 'numberLine',
    prompt: [
      { kind: 'prose', text: 'Solve the double inequality, then shade its solution set.' },
      { kind: 'display', tex: doubleTex(p) },
    ],
    min: p.min,
    max: p.max,
    step: 1,
    answer: intervalSet(p),
  }),
  solution: (p) => [...doubleWorking(p), { text: endsWords(p) }],
};

/**
 * A double inequality as working, one move on all three parts at a time.
 *
 * The banks hold the move made on one side only, and at difficulty 2 the
 * division by a negative with the signs left as they were.
 */
const doubleSteps: Generator<DoubleParams> = {
  id: 'lin-double-steps',
  sample: (rng, difficulty) => sampleDouble(rng, difficulty),
  render: (p): Slide => {
    const { a, b, lo, hi, loOp, hiOp } = p;
    const { left, right, op1, op2 } = doubleParts(p);
    const T = INEQ_TEX;
    const start =
      a > 0
        ? [`${left}`, T[op1], termTex(a, 1), `{} ${signedTile(b)}`, T[op2], `${right}`]
        : [`${left}`, T[op1], `${b}`, `{} ${signedTile(a, 'x')}`, T[op2], `${right}`];
    const shifted = `${left - b} ${T[op1]} ${termTex(a, 1)} ${T[op2]} ${right - b}`;
    const solved = intervalTex(p);
    return {
      kind: 'steps',
      prompt: [{ kind: 'prose', text: `Solve by doing the same to all three parts. ${HOW_TO_STEP}` }],
      start,
      reductions: [
        {
          span: [0, 6],
          operator: a > 0 ? 3 : 2,
          value: shifted,
          bank: stepBank(
            shifted,
            `${left + b} ${T[op1]} ${termTex(a, 1)} ${T[op2]} ${right + b}`,
            `${left} ${T[op1]} ${termTex(a, 1)} ${T[op2]} ${right - b}`,
            `${left - b} ${T[op1]} ${termTex(a, 1)} ${T[op2]} ${right}`,
          ),
        },
        {
          span: [0, 1],
          value: solved,
          bank: stepBank(
            solved,
            `${left - b} ${T[loOp]} x ${T[hiOp]} ${right - b}`,
            a > 0 ? `${lo} ${T[loOp]} x ${T[hiOp]} ${right - b}` : `${hi} ${T[op1]} x ${T[op2]} ${lo}`,
            `${-hi} ${T[loOp]} x ${T[hiOp]} ${-lo}`,
            `${lo} ${T[op1]} x ${T[op2]} ${hi}`,
          ),
        },
      ],
    };
  },
  solution: doubleWorking,
};

/** The solved interval placed as tiles: two numbers and two signs. */
const doubleTiles: Generator<DoubleParams> = {
  id: 'lin-double-tiles',
  sample: (rng, difficulty) => sampleDouble(rng, difficulty),
  render: (p): Slide => {
    const { left, right } = doubleParts(p);
    const answer = [`${p.lo}`, INEQ_TEX[p.loOp], INEQ_TEX[p.hiOp], `${p.hi}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Solve the double inequality. Place the solution, smaller end first.' },
        { kind: 'display', tex: doubleTex(p) },
      ],
      template: '{0} {1} x {2} {3}',
      bank: bankOf(answer, ['<', '\\le', `${left - p.b}`, `${right - p.b}`, `${-p.lo}`, `${-p.hi}`]),
      answer,
    };
  },
  solution: doubleWorking,
};

const ENDS: readonly { id: string; label: string; lo: boolean; hi: boolean }[] = [
  { id: 'both', label: 'Both ends', lo: true, hi: true },
  { id: 'lo', label: 'Only the smaller end', lo: true, hi: false },
  { id: 'hi', label: 'Only the larger end', lo: false, hi: true },
  { id: 'none', label: 'Neither end', lo: false, hi: false },
];

/**
 * Which ends of the interval are included?
 *
 * At difficulty 2 the coefficient is negative, so the sign written on the left
 * ends up on the right once solved, and reading the ends off the question as
 * written gets it the wrong way round.
 */
const doubleEnds: Generator<DoubleParams> = {
  id: 'lin-double-ends',
  sample: (rng, difficulty) =>
    drawUntil(
      () => sampleDouble(rng, difficulty),
      // Three times in four the ends differ, which is where the reading matters.
      (p) => p.loOp !== p.hiOp || rng.chance(0.25),
      { a: 2, b: 1, lo: -1, hi: 3, loOp: '<', hiOp: '<=' },
    ),
  render: (p): Slide => {
    const correct = ENDS.find((end) => end.lo === (p.loOp === '<=') && end.hi === (p.hiOp === '<='))!;
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Solve it. Which ends of the solution are included?' },
        { kind: 'display', tex: doubleTex(p) },
      ],
      options: ENDS.map((end) => ({ id: end.id, label: end.label })),
      correctId: correct.id,
    };
  },
  solution: (p) => [...doubleWorking(p), { text: endsWords(p) }],
};

/* ---------- Integer solutions ---------- */

/** The integers inside a double inequality's solution. */
function integersIn({ lo, hi, loOp, hiOp }: DoubleParams): number[] {
  const first = loOp === '<=' ? lo : lo + 1;
  const last = hiOp === '<=' ? hi : hi - 1;
  return range(first, last);
}

interface IntegerParams extends DoubleParams {
  /** Whether the question is written with a coefficient to solve first. */
  solve: boolean;
}

function integerQuestion(p: IntegerParams): string {
  return p.solve ? doubleTex(p) : intervalTex(p);
}

function integerWorking(p: IntegerParams): SolutionStep[] {
  const found = integersIn(p);
  const steps = p.solve ? doubleWorking(p) : [{ tex: intervalTex(p) }];
  const ends = [
    p.loOp === '<=' ? `$${p.lo}$ is included` : `$${p.lo}$ is left out`,
    p.hiOp === '<=' ? `$${p.hi}$ is included` : `$${p.hi}$ is left out`,
  ];
  return [
    ...steps,
    { text: `${ends[0]} and ${ends[1]}.` },
    { text: `So the integers are $${found.join(', ')}$: that is $${found.length}$ of them.` },
  ];
}

/**
 * List the integers in the solution set, in any order.
 *
 * Three to six of them. The bank holds the integers just outside, which are
 * the ends themselves whenever an end is hollow. Difficulty 2 has a
 * coefficient to divide out first, either sign.
 */
const intList: Generator<IntegerParams> = {
  id: 'lin-int-list',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const p = sampleDouble(rng, rng.chance(0.5) ? 1 : 2, [2, 6]);
        return { ...p, solve: difficulty > 1 };
      },
      (p) => integersIn(p).length >= 3 && integersIn(p).length <= 6,
      { a: 2, b: 1, lo: -2, hi: 3, loOp: '<=', hiOp: '<', solve: difficulty > 1 },
    ),
  render: (p): Slide => {
    const found = integersIn(p);
    const answer = found.map(String);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'List every integer that satisfies this, in any order.' },
        { kind: 'display', tex: integerQuestion(p) },
      ],
      template: found.map((_, i) => `{${i}}`).join(', '),
      bank: bankOf(answer, [`${found[0] - 1}`, `${found[found.length - 1] + 1}`, `${found[0] - 2}`]),
      answer,
      unordered: true,
    };
  },
  solution: integerWorking,
};

/**
 * How many integers satisfy it?
 *
 * Too many to list comfortably, so the count is worked from the ends.
 * Difficulty 2 has a coefficient to divide out first.
 */
const intCount: Generator<IntegerParams> = {
  id: 'lin-int-count',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { ...sampleDouble(rng, rng.chance(0.5) ? 1 : 2, [4, 10]), solve: true };
    const lo = rng.int(-12, 4);
    return {
      a: 1,
      b: 0,
      lo,
      hi: lo + rng.int(6, 15),
      loOp: rng.pick(['<', '<='] as const),
      hiOp: rng.pick(['<', '<='] as const),
      solve: false,
    };
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'How many integers satisfy this? Call the count $n$.' },
      { kind: 'display', tex: integerQuestion(p) },
    ],
    lead: 'n =',
    keypad: [],
    answer: `${integersIn(p).length}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => {
    const found = integersIn(p);
    const first = found[0];
    const last = found[found.length - 1];
    const steps = p.solve ? doubleWorking(p) : [{ tex: intervalTex(p) }];
    return [
      ...steps,
      { text: `The smallest integer in it is $${first}$ and the largest is $${last}$.` },
      { text: 'Counting from one to the other, both included, is the difference plus one.', tex: `${last} - ${br(first)} + 1 = ${found.length}` },
    ];
  },
};

/** The largest integer below a boundary, or the smallest above it. */
function extremeOf(p: OneSided): { value: number; largest: boolean } {
  const s = oneSolved(p);
  const largest = !pointsUp(s);
  const value = isStrict(s) ? (largest ? p.k - 1 : p.k + 1) : p.k;
  return { value, largest };
}

function extremeWords(p: OneSided): string {
  const s = oneSolved(p);
  const { value, largest } = extremeOf(p);
  const side = largest ? 'below' : 'above';
  return isStrict(s)
    ? `$x ${INEQ_TEX[s]} ${p.k}$ leaves $${p.k}$ out, so the ${largest ? 'largest' : 'smallest'} integer is the next one ${side} it, $${value}$.`
    : `$x ${INEQ_TEX[s]} ${p.k}$ includes $${p.k}$, so the ${largest ? 'largest' : 'smallest'} integer is $${value}$ itself.`;
}

/**
 * The largest (or smallest) integer that satisfies one inequality.
 *
 * Which of the two is asked follows the direction of the solution, and a
 * strict sign moves the answer one integer in. Difficulty 2 has a negative
 * coefficient, so the direction turns round on the way.
 */
const intExtreme: Generator<OneSided> = {
  id: 'lin-int-extreme',
  sample: (rng, difficulty) =>
    difficulty > 1 ? sampleOne(rng, 'down', rng.chance(0.5)) : sampleOne(rng, 'up', false),
  render: (p): Slide => {
    const { value, largest } = extremeOf(p);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `What is the **${largest ? 'largest' : 'smallest'}** integer that satisfies this?` },
        { kind: 'display', tex: oneTex(p) },
      ],
      lead: 'x =',
      keypad: [],
      answer: `${value}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => [...oneWorking(p), { text: extremeWords(p) }],
};

/**
 * A number line as a picture, for a slider to move over: squared across so
 * each whole number has a tick, with the solution set drawn when `set` is
 * given. The set is a band along the line and a dot at its end.
 */
function lineFigure(min: number, max: number, set?: { k: number; op: Ineq }): string {
  const inSet = (x: number) => (set === undefined ? NaN : holds(x, set.op, set.k) ? 0 : NaN);
  return plotSvg({
    xMin: min,
    xMax: max,
    yMin: -0.9,
    yMax: 0.9,
    height: 60,
    grid: true,
    curves: set === undefined ? [] : [{ f: inSet, band: true, breaks: true }],
    marks: set === undefined ? [] : [{ x: set.k, y: 0, hollow: isStrict(set.op) }],
    label: set === undefined ? 'A number line' : 'A number line with a solution set drawn on it',
  });
}

/**
 * Slide to the largest (or smallest) integer in the solution.
 *
 * At difficulty 1 the solution is drawn on the line and the question is how
 * to read a dot: hollow means the next integer in. At difficulty 2 the line is
 * bare and the coefficient negative.
 */
const intSlider: Generator<OneLineParams> = {
  id: 'lin-int-slider',
  sample: (rng, difficulty) => {
    const p = difficulty > 1 ? sampleOne(rng, 'down', false) : sampleOne(rng, 'up', false);
    return { ...p, ...windowFor(rng, p.k, p.k, 10, 2) };
  },
  render: (p): Slide => {
    const { value, largest } = extremeOf(p);
    const drawn = p.a > 0;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: drawn
            ? `The solution set of $${oneTex(p)}$ is drawn on the line. Slide to the **${largest ? 'largest' : 'smallest'}** integer in it.`
            : `Slide to the **${largest ? 'largest' : 'smallest'}** integer that satisfies $${oneTex(p)}$.`,
        },
      ],
      min: p.min,
      max: p.max,
      step: 1,
      answer: value,
      readout: 'x = {v}',
      figure: {
        svg: lineFigure(p.min, p.max, drawn ? { k: p.k, op: oneSolved(p) } : undefined),
        ...markerWindow(p.min, p.max),
      },
    };
  },
  solution: (p) => [...oneWorking(p), { text: extremeWords(p) }],
};

/* ---------- Two variables: a region of the plane ---------- */

/**
 * A half-plane bounded by one straight line: `y op mx + c` in the slope form,
 * `ax + by op c` in the general one. `(px, py)` is a point, used as the dot in
 * a picture or the point to test.
 */
interface RegionParams {
  form: 'slope' | 'general';
  m: number;
  a: number;
  b: number;
  c: number;
  op: Ineq;
  px: number;
  py: number;
}

/** How far the point sits into the region: positive when inside, by the sign. */
function residual({ form, m, a, b, c }: RegionParams, x: number, y: number): number {
  return form === 'slope' ? y - (m * x + c) : a * x + b * y - c;
}

function regionSideTex({ form, m, a, b, c }: RegionParams): string {
  return form === 'slope' ? linTex(m, c) : `${termTex(a, 1)} ${signedTile(b, 'y')}`;
}

function regionTex(p: RegionParams, op: Ineq = p.op): string {
  return p.form === 'slope'
    ? `y ${INEQ_TEX[op]} ${regionSideTex(p)}`
    : `${regionSideTex(p)} ${INEQ_TEX[op]} ${p.c}`;
}

function boundaryOf({ form, m, a, b, c }: RegionParams): (x: number) => number {
  return form === 'slope' ? (x: number) => m * x + c : (x: number) => (c - a * x) / b;
}

/** Slope form at difficulty 1, general form at difficulty 2. */
function sampleRegionLine(rng: Rng, difficulty: number): Omit<RegionParams, 'px' | 'py'> {
  const op = rng.pick(ALL_INEQ);
  if (difficulty > 1) {
    return { form: 'general', m: 0, a: rng.int(1, 4), b: rng.pick(nonZeroRange(-4, 4)), c: rng.pick(nonZeroRange(-8, 8)), op };
  }
  return { form: 'slope', m: rng.int(-3, 3), a: 0, b: 0, c: rng.pick(nonZeroRange(-4, 4)), op };
}

/** Where the point is, worked out and compared. */
function testWorking(p: RegionParams): SolutionStep[] {
  const { form, m, a, b, c, op, px, py } = p;
  const inside = holds(residual(p, px, py), op, 0);
  if (form === 'slope') {
    const value = m * px + c;
    return [
      { text: `At $x = ${px}$ the right-hand side is`, tex: `${m === 0 ? `${c}` : `${timesTex(m, px)} ${signedTile(c)}`} = ${value}` },
      {
        text: `The point has $y = ${py}$. Is $${py} ${INEQ_TEX[op]} ${value}$? ${inside ? 'Yes' : 'No'}, so $(${px}, ${py})$ is ${inside ? '' : 'not '}in the region.`,
      },
    ];
  }
  const value = a * px + b * py;
  return [
    { text: `At $(${px}, ${py})$:`, tex: `${timesTex(a, px)} ${b < 0 ? '-' : '+'} ${timesTex(Math.abs(b), py)} = ${value}` },
    {
      text: `Is $${value} ${INEQ_TEX[op]} ${c}$? ${inside ? 'Yes' : 'No'}, so $(${px}, ${py})$ is ${inside ? '' : 'not '}in the region.`,
    },
  ];
}

const REGION_WINDOW = { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
const REGION_HEIGHT = 220;

/**
 * Which inequality is this region?
 *
 * The picture has the boundary, solid or dashed, and a dot inside the region;
 * the four options are the one boundary with each sign. Dashed decides the
 * strictness and the dot decides the side. At difficulty 2 the options are in
 * the form `ax + by`, where a negative `b` turns "above means greater" round
 * and only testing the dot is safe.
 */
const regionChoice: Generator<RegionParams> = {
  id: 'lin-region-choice',
  sample: (rng, difficulty) => {
    const line = sampleRegionLine(rng, difficulty);
    const norm = line.form === 'slope' ? Math.hypot(line.m, 1) : Math.hypot(line.a, line.b);
    // Every whole point well inside the region, so the dot is never on the
    // line or close enough to it to be read as either side.
    const inside = range(-5, 5)
      .flatMap((px) => range(-5, 5).map((py) => ({ ...line, px, py })))
      .filter((p) => {
        const r = residual(p, p.px, p.py);
        return holds(r, p.op, 0) && Math.abs(r) / norm >= 0.8;
      });
    return rng.pick(inside);
  },
  render: (p): Slide => ({
    kind: 'choice',
    prompt: [
      {
        kind: 'prose',
        text: 'The region is on the side of the line with the dot in it. A dashed line is left out; a solid one is included. Which inequality is it?',
      },
      {
        kind: 'diagram',
        svg: plotSvg({
          ...REGION_WINDOW,
          height: REGION_HEIGHT,
          grid: true,
          curves: [{ f: boundaryOf(p), dashed: isStrict(p.op) }],
          marks: [{ x: p.px, y: p.py }],
          label: `A ${isStrict(p.op) ? 'dashed' : 'solid'} straight line with a dot at (${p.px}, ${p.py})`,
        }),
      },
    ],
    options: ALL_INEQ.map((op) => ({ id: op, label: regionTex(p, op), tex: true })),
    correctId: p.op,
  }),
  solution: (p) => [
    {
      text: `The line is ${isStrict(p.op) ? 'dashed, so the boundary is left out: the sign is strict' : 'solid, so the boundary is included: the sign has "or equal to"'}.`,
    },
    { text: `Test the dot $(${p.px}, ${p.py})$, which is in the region.` },
    ...testWorking(p).slice(0, 1),
    { text: `That makes the region $${regionTex(p)}$.` },
  ],
};

const REGION_SOLID = 'Solid';
const REGION_DASHED = 'Dashed';
const REGION_YES = 'Yes';
const REGION_NO = 'No';

/**
 * Drawing the region, as two decisions: solid or dashed, then which side.
 *
 * The origin is the test point, and the constant is never zero, so the
 * boundary never runs through it. Difficulty 2 is the general form.
 */
const regionFlow: Generator<RegionParams> = {
  id: 'lin-region-flow',
  sample: (rng, difficulty) => ({ ...sampleRegionLine(rng, difficulty), px: 0, py: 0 }),
  render: (p): Slide => ({
    kind: 'flow',
    prompt: [{ kind: 'prose', text: 'How is this region drawn?' }],
    subject: regionTex(p),
    steps: [
      {
        id: 'line',
        ask: 'Is the boundary line solid or dashed?',
        branches: [
          { label: REGION_SOLID, to: 'side' },
          { label: REGION_DASHED, to: 'side' },
        ],
      },
      {
        id: 'side',
        ask: 'Put in the origin, $(0, 0)$. Does it satisfy the inequality?',
        branches: [
          { label: REGION_YES, outcome: 'Shade the side of the line with the origin in it.' },
          { label: REGION_NO, outcome: 'Shade the side of the line away from the origin.' },
        ],
      },
    ],
    answer: [isStrict(p.op) ? REGION_DASHED : REGION_SOLID, holds(residual(p, 0, 0), p.op, 0) ? REGION_YES : REGION_NO],
  }),
  solution: (p) => {
    const inside = holds(residual(p, 0, 0), p.op, 0);
    return [
      {
        text: isStrict(p.op)
          ? `The sign is strict, so points on the line are left out: draw it dashed.`
          : `The sign includes "or equal to", so points on the line count: draw it solid.`,
      },
      {
        text: `At the origin every $x$ and $y$ term is $0$, so $${regionTex(p)}$ becomes $0 ${INEQ_TEX[p.op]} ${p.c}$, which is ${inside ? 'true' : 'false'}.`,
      },
      { text: inside ? 'So shade the side with the origin in it.' : 'So shade the side away from the origin.' },
    ];
  },
};

interface InterceptParams extends RegionParams {
  axis: 'x' | 'y';
  at: number;
}

/**
 * Where the boundary crosses an axis: the first thing to find when drawing it.
 *
 * Difficulty 1 is the slope form, crossing the $x$-axis where $y = 0$.
 * Difficulty 2 is the general form, `ax + by`, built from its two intercepts
 * so both are whole, and asks for either.
 */
const regionSlider: Generator<InterceptParams> = {
  id: 'lin-region-slider',
  sample: (rng, difficulty) => {
    const op = rng.pick(ALL_INEQ);
    if (difficulty < 2) {
      const m = rng.pick([-3, -2, -1, 1, 2, 3]);
      const x0 = rng.pick(nonZeroRange(-5, 5));
      return { form: 'slope', m, a: 0, b: 0, c: -m * x0, op, px: 0, py: 0, axis: 'x', at: x0 };
    }
    const x0 = rng.pick(nonZeroRange(-5, 5));
    const y0 = rng.pick(nonZeroRange(-5, 5));
    const g = gcd(Math.abs(x0), Math.abs(y0));
    // x/x0 + y/y0 = 1, cleared of fractions, with a positive x coefficient.
    const flip = y0 < 0 ? -1 : 1;
    const axis = rng.pick(['x', 'y'] as const);
    return {
      form: 'general',
      m: 0,
      a: (flip * y0) / g,
      b: (flip * x0) / g,
      c: (flip * x0 * y0) / g,
      op,
      px: 0,
      py: 0,
      axis,
      at: axis === 'x' ? x0 : y0,
    };
  },
  render: (p): Slide => ({
    kind: 'slider',
    prompt: [
      {
        kind: 'prose',
        text: `To draw the boundary of $${regionTex(p)}$, find where it crosses the $${p.axis}$-axis. Slide to that point.`,
      },
    ],
    min: -6,
    max: 6,
    step: 1,
    answer: p.at,
    readout: `${p.axis} = {v}`,
    figure: {
      svg: plotSvg({
        ...REGION_WINDOW,
        height: REGION_HEIGHT,
        grid: true,
        curves: [],
        label: 'Empty squared axes',
      }),
      ...(p.axis === 'x' ? markerWindow(-6, 6) : markerWindow(-6, 6, 'y', REGION_HEIGHT)),
      ...(p.axis === 'y' ? { axis: 'y' as const } : {}),
    },
  }),
  solution: (p) => {
    if (p.form === 'slope') {
      return [
        { text: 'The boundary is the line with $=$ in place of the sign. On the $x$-axis, $y = 0$.' },
        { tex: `0 = ${linTex(p.m, p.c)}` },
        { tex: `${termTex(p.m, 1)} = ${-p.c}` },
        { tex: `x = ${p.at}` },
      ];
    }
    const other = p.axis === 'x' ? 'y' : 'x';
    const coefficient = p.axis === 'x' ? p.a : p.b;
    return [
      { text: `The boundary is $${regionSideTex(p)} = ${p.c}$. On the $${p.axis}$-axis, $${other} = 0$.` },
      { tex: `${coefficient === 1 ? '' : coefficient === -1 ? '-' : coefficient}${p.axis} = ${p.c}` },
      { tex: `${p.axis} = ${p.at}` },
    ];
  },
};

/**
 * Testing a point: the number to compare, worked out.
 *
 * Difficulty 1 is the slope form, where the right-hand side is worked out at
 * the point's $x$; difficulty 2 the general form, where the whole left-hand
 * side is.
 */
const regionTest: Generator<RegionParams> = {
  id: 'lin-region-test',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ ...sampleRegionLine(rng, difficulty), px: rng.pick(nonZeroRange(-5, 5)), py: rng.int(-6, 6) }),
      (p) => p.form === 'general' || p.m !== 0,
      { form: 'slope', m: 2, a: 0, b: 0, c: 1, op: '<', px: 3, py: 4 },
    ),
  render: (p): Slide => {
    const slope = p.form === 'slope';
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: slope
            ? `Is $(${p.px}, ${p.py})$ in the region $${regionTex(p)}$? Start by working out $${regionSideTex(p)}$ at $x = ${p.px}$.`
            : `Is $(${p.px}, ${p.py})$ in the region $${regionTex(p)}$? Start by working out $${regionSideTex(p)}$ at that point.`,
        },
      ],
      lead: `${regionSideTex(p)} =`,
      keypad: [],
      answer: `${slope ? p.m * p.px + p.c : p.a * p.px + p.b * p.py}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: testWorking,
};

/* ======================================================================
 * Level 5: Simultaneous Equations in Three Unknowns
 *
 * Batch C1-l5. Three equations in $x$, $y$ and $z$, solved by elimination:
 * what a solution triple is, removing one letter twice to leave a pair,
 * finishing the pair and putting the values back, choosing which letter to
 * remove, and three unknowns from words. Solving two in two is level 2 and
 * is pointed at, not re-taught; the matrix route stays in Matrices `vm-l9`.
 *
 * Built outward like the rest of the file: the triple is drawn first ($-6$
 * to $6$), then the coefficients ($-4$ to $4$), then each right-hand side, so
 * every combination and every value met on the way is whole. The rows are
 * always independent — a non-zero determinant — and every number a learner
 * reads stays under $100$.
 * ==================================================================== */

type Row = number[];

/** Three equations in x, y and z, as rows of coefficients, with their solution. */
interface Tri {
  rows: Row[];
  sol: Row;
}

const TRI_LETTERS = ['x', 'y', 'z'] as const;

const dot3 = (row: Row, v: Row): number => row[0] * v[0] + row[1] * v[1] + row[2] * v[2];
const rhsOf = (t: Tri, i: number): number => dot3(t.rows[i], t.sol);

function det3([r, s, u]: Row[]): number {
  return (
    r[0] * (s[1] * u[2] - s[2] * u[1]) -
    r[1] * (s[0] * u[2] - s[2] * u[0]) +
    r[2] * (s[0] * u[1] - s[1] * u[0])
  );
}

/** A term that opens a line, in any letter: `3z`, `-y`, `x`. */
function leadTerm(k: number, letter: string): string {
  if (k === 1) return letter;
  if (k === -1) return `-${letter}`;
  return `${k}${letter}`;
}

/** The left-hand side of a row, zero terms left out: `2x - y + 3z`, `x + 4z`. */
function rowTex(row: Row): string {
  const terms = TRI_LETTERS.flatMap((letter, n) => (row[n] === 0 ? [] : [{ k: row[n], letter }]));
  return terms.map(({ k, letter }, i) => (i === 0 ? leadTerm(k, letter) : signedTile(k, letter))).join(' ');
}

function rowEqTex(row: Row, d: number): string {
  return `${rowTex(row)} = ${d}`;
}

/** Equations stacked and numbered from `first`, so the prose can say "(4)". */
function numberedTex(lines: string[], first = 1): string {
  const body = lines.map((line, i) => `${line.replace(' = ', ' &= ')} & \\quad (${first + i})`).join(' \\\\ ');
  return `\\begin{aligned} ${body} \\end{aligned}`;
}

function triTex(t: Tri): string {
  return numberedTex(t.rows.map((row, i) => rowEqTex(row, rhsOf(t, i))));
}

function tripleTex(v: Row): string {
  return `(${v[0]}, ${v[1]}, ${v[2]})`;
}

/**
 * A row with values put in, as the working writes it: `2(3) - (-2) + 3(1)`,
 * short enough to sit on one line of a phone. The letter at `keep`, if any,
 * stays a letter.
 */
function rowAtTex(row: Row, v: Row, keep = -1): string {
  return TRI_LETTERS.flatMap((letter, n) => (row[n] === 0 ? [] : [{ n, letter }]))
    .map(({ n, letter }, i) => {
      const k = row[n];
      const sign = i === 0 ? (k < 0 ? '-' : '') : k < 0 ? '- ' : '+ ';
      if (n === keep) return `${sign}${Math.abs(k) === 1 ? '' : Math.abs(k)}${letter}`;
      return `${sign}${Math.abs(k) === 1 ? '' : Math.abs(k)}(${v[n]})`;
    })
    .join(' ');
}

/** "$x = 2$ and $y = -1$": the values already found, every letter but `skip`. */
function knownText(v: Row, skip: number): string {
  return TRI_LETTERS.flatMap((letter, n) => (n === skip ? [] : [`$${letter} = ${v[n]}$`])).join(' and ');
}

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** A choice slide whose options are sorted by label, so the options alone fix the order. */
function sortedChoice(prompt: Block[], offered: ChoiceOption[]): Slide {
  const sorted = [...offered].sort((a, b) => (a.tex < b.tex ? -1 : a.tex > b.tex ? 1 : 0));
  return {
    kind: 'choice',
    prompt,
    options: sorted.map((option, idx) => ({ id: `o${idx}`, label: option.tex, tex: true })),
    correctId: `o${sorted.findIndex((option) => option.correct)}`,
  };
}

/** Three different values: whole, never zero, and positive at difficulty 1. */
function drawTriple(rng: Rng, hard: boolean): Row {
  const pool = hard ? nonZeroRange(-6, 6) : range(1, 6);
  return drawUntil(
    () => [rng.pick(pool), rng.pick(pool), rng.pick(pool)],
    ([x, y, z]) => x !== y && y !== z && x !== z,
    hard ? [2, -3, 1] : [2, 3, 1],
  );
}

const TRI_EASY = [-2, -1, 1, 2, 3, 4];
const TRI_HARD = nonZeroRange(-4, 4);
const triPool = (hard: boolean): number[] => (hard ? TRI_HARD : TRI_EASY);

/** The letters whose coefficients are the same size, and not zero, in every row. */
function matchedLetters(t: Tri): number[] {
  return [0, 1, 2].filter(
    (n) => t.rows[0][n] !== 0 && t.rows.every((row) => Math.abs(row[n]) === Math.abs(t.rows[0][n])),
  );
}

const zeroCount = (t: Tri): number => t.rows.flat().filter((v) => v === 0).length;

const smallTriple = (v: Row): boolean => v.every((n) => Math.abs(n) <= 12);

/** z matched in all three (1, 1, -1); nothing else is. Solution (1, 2, 3). */
const TRI_FALLBACK: Tri = {
  rows: [
    [1, 1, 1],
    [2, -1, 1],
    [1, 2, -1],
  ],
  sol: [1, 2, 3],
};

/** Every coefficient from the pool, the rows independent. */
function sampleTri(rng: Rng, hard: boolean, accept: (t: Tri) => boolean = () => true): Tri {
  const pool = triPool(hard);
  return drawUntil(
    () => ({ rows: [0, 1, 2].map(() => [rng.pick(pool), rng.pick(pool), rng.pick(pool)]), sol: drawTriple(rng, hard) }),
    (t) => det3(t.rows) !== 0 && accept(t),
    TRI_FALLBACK,
  );
}

/** Two equations added or subtracted, with where they came from. */
interface Combo {
  row: Row;
  d: number;
  /** Equation numbers, in the order the combination is written. */
  first: number;
  second: number;
  op: '+' | '-';
  /** Row indices behind `first` and `second`. */
  from: [number, number];
}

/**
 * Rows `i` and `j` added or subtracted to remove letter `k`, whose
 * coefficients are the same size in both. A subtraction is turned round when
 * that makes the first coefficient left positive; an addition cannot be, and
 * the samplers refuse one that leaves it negative.
 */
function combine(t: Tri, i: number, j: number, k: number, labels: [number, number] = [i + 1, j + 1]): Combo | undefined {
  const p = t.rows[i][k];
  const q = t.rows[j][k];
  if (p === 0 || Math.abs(p) !== Math.abs(q)) return undefined;
  const op = p === q ? '-' : '+';
  const s = op === '-' ? -1 : 1;
  const row = t.rows[i].map((v, n) => v + s * t.rows[j][n]);
  const d = rhsOf(t, i) + s * rhsOf(t, j);
  const lead = row.find((v) => v !== 0) ?? 0;
  if (op === '-' && lead < 0) {
    return { row: row.map((v) => 0 - v), d: 0 - d, first: labels[1], second: labels[0], op, from: [j, i] };
  }
  return { row, d, first: labels[0], second: labels[1], op, from: [i, j] };
}

const comboTex = (c: Combo): string => `(${c.first}) ${c.op} (${c.second})`;

/** What the other operation makes of the same two rows: the add-for-subtract slip. */
function wrongWay(t: Tri, c: Combo): { row: Row; d: number } {
  const s = c.op === '-' ? 1 : -1;
  const [i, j] = c.from;
  return { row: t.rows[i].map((v, n) => v + s * t.rows[j][n]), d: rhsOf(t, i) + s * rhsOf(t, j) };
}

/** Both letters left, its first coefficient positive, its right-hand side under 100. */
function tidyCombo(c: Combo | undefined, k: number): boolean {
  if (!c) return false;
  const rest = c.row.filter((_, n) => n !== k);
  return rest.every((v) => v !== 0) && rest[0] > 0 && Math.abs(c.d) < 100;
}

/** The two letters left once letter `k` is gone, in alphabetical order. */
const others = (k: number): [number, number] => (k === 0 ? [1, 2] : k === 1 ? [0, 2] : [0, 1]);

function cross(u: Row, v: Row): Row {
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

/**
 * A triple on equations `i` and `j` but not the third: the solution moved
 * one whole step along the line where those two planes meet. It is the
 * wrong answer worth offering, because checking two equations passes it.
 */
function alongLine(t: Tri, i: number, j: number): Row {
  const dir = cross(t.rows[i], t.rows[j]);
  const g = dir.reduce((acc, v) => gcd(acc, v), 0);
  const sign = (dir.find((v) => v !== 0) ?? 1) > 0 ? 1 : -1;
  return t.sol.map((v, n) => v + (sign * dir[n]) / g);
}

/* ---------- Lesson 1: what a solution is ---------- */

/**
 * Which of these triples satisfies all three equations?
 *
 * Two wrong triples each satisfy two of the equations — one fails (3), one
 * fails (1) — so checking only some of the equations lets them through. The
 * third is the answer with $x$ and $y$ swapped.
 */
const triWhich: Generator<Tri> = {
  id: 'lin-tri-which',
  sample: (rng, difficulty) =>
    sampleTri(rng, difficulty > 1, (t) => smallTriple(alongLine(t, 0, 1)) && smallTriple(alongLine(t, 1, 2))),
  render: (t): Slide =>
    sortedChoice(
      [
        { kind: 'prose', text: 'Only one of these triples $(x, y, z)$ satisfies **all three** equations. Which one?' },
        { kind: 'display', tex: triTex(t) },
      ],
      options(
        { tex: tripleTex(t.sol) },
        { tex: tripleTex(alongLine(t, 0, 1)) },
        { tex: tripleTex(alongLine(t, 1, 2)) },
        { tex: tripleTex([t.sol[1], t.sol[0], t.sol[2]]) },
      ),
    ),
  solution: (t) => [
    { text: 'A solution makes all three equations true at once. Put the triple into (1), (2) and (3) in turn.' },
    ...t.rows.map((row, i) => ({ tex: `${rowAtTex(row, t.sol)} = ${rhsOf(t, i)}` })),
    {
      text: `So $${tripleTex(t.sol)}$ works in all three. $${tripleTex(alongLine(t, 0, 1))}$ satisfies (1) and (2) but not (3), and $${tripleTex(alongLine(t, 1, 2))}$ fails (1).`,
    },
  ],
};

interface TriCheckParams extends Tri {
  /** The first equation the offered triple fails, or 0 when it is the solution. */
  fails: 0 | 1 | 2 | 3;
}

function checkedTriple(p: TriCheckParams): Row {
  if (p.fails === 1) return alongLine(p, 1, 2);
  if (p.fails === 2) return alongLine(p, 0, 2);
  if (p.fails === 3) return alongLine(p, 0, 1);
  return p.sol;
}

/**
 * Checking a triple as a walk through the three equations.
 *
 * Each equation in turn, stopping at the first that fails. The four cases
 * turn up equally, and a triple failing only (3) is the one that makes the
 * point: two out of three is not a solution.
 */
const triCheckFlow: Generator<TriCheckParams> = {
  id: 'lin-tri-check-flow',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ ...sampleTri(rng, difficulty > 1), fails: rng.pick([0, 1, 2, 3] as const) }),
      (p) => smallTriple(checkedTriple(p)),
      { ...TRI_FALLBACK, fails: 3 },
    ),
  render: (p): Slide => {
    const v = checkedTriple(p);
    const answer = p.fails === 0 ? [SAT_YES, SAT_YES, SAT_YES] : [...Array(p.fails - 1).fill(SAT_YES), SAT_NO];
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Is $(x, y, z) = ${tripleTex(v)}$ a solution? Check it one equation at a time.` }],
      subject: triTex(p),
      steps: [
        {
          id: 'one',
          ask: 'Put the values into equation (1). Does it balance?',
          branches: [
            { label: SAT_YES, to: 'two' },
            { label: SAT_NO, outcome: 'Not a solution. It fails (1), so there is no need to go on.' },
          ],
        },
        {
          id: 'two',
          ask: 'Now equation (2). Does it balance?',
          branches: [
            { label: SAT_YES, to: 'three' },
            { label: SAT_NO, outcome: 'Not a solution. It fails (2).' },
          ],
        },
        {
          id: 'three',
          ask: 'And equation (3)?',
          branches: [
            { label: SAT_YES, outcome: 'A solution: it satisfies all three equations.' },
            { label: SAT_NO, outcome: 'Not a solution. It satisfies (1) and (2) only.' },
          ],
        },
      ],
      answer,
    };
  },
  solution: (p) => {
    const v = checkedTriple(p);
    const upTo = p.fails === 0 ? 3 : p.fails;
    return [
      ...p.rows.slice(0, upTo).flatMap((row, i) => {
        const left = dot3(row, v);
        return [
          { text: `(${i + 1}) needs $${rhsOf(p, i)}$:` },
          { tex: `${rowAtTex(row, v)} = ${left}` },
        ];
      }),
      {
        text:
          p.fails === 0
            ? 'All three balance, so it is the solution.'
            : `Equation (${p.fails}) fails, so it is not a solution — one failure is enough.`,
      },
    ];
  },
};

interface LhsParams extends Tri {
  which: 0 | 1 | 2;
  /** The real solution, or a triple on the other two equations only. */
  real: boolean;
}

function lhsTriple(p: LhsParams): Row {
  if (p.real) return p.sol;
  const [i, j] = others(p.which);
  return alongLine(p, i, j);
}

/**
 * One equation's left-hand side at a triple, term by term.
 *
 * Three products, then their total, compared with the right-hand side. Half
 * the time the triple satisfies the other two equations and fails this one,
 * so the check is doing real work.
 */
const triLhsTree: Generator<LhsParams> = {
  id: 'lin-tri-lhs-tree',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ ...sampleTri(rng, difficulty > 1), which: rng.pick([0, 1, 2] as const), real: rng.chance(0.5) }),
      (p) => smallTriple(lhsTriple(p)),
      { ...TRI_FALLBACK, which: 0, real: true },
    ),
  render: (p): Slide => {
    const row = p.rows[p.which];
    const v = lhsTriple(p);
    const terms = row.map((k, n) => k * v[n]);
    const total = terms[0] + terms[1] + terms[2];
    const answer = [...terms, total].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Is $(x, y, z) = ${tripleTex(v)}$ a solution? Work out the left-hand side of equation (${p.which + 1}) there: the value of each term, sign included, then their total.`,
        },
        { kind: 'display', tex: triTex(p) },
      ],
      expression: rowTex(row),
      nodes: [
        { id: 'x', from: [] },
        { id: 'y', from: [] },
        { id: 'z', from: [] },
        { id: 'total', from: ['x', 'y', 'z'] },
      ],
      bank: treeBank(answer, [-terms[0], -terms[1], -terms[2], total - 2 * terms[2], rhsOf(p, p.which)], total),
      answer,
    };
  },
  solution: (p) => {
    const v = lhsTriple(p);
    const row = p.rows[p.which];
    const total = dot3(row, v);
    const d = rhsOf(p, p.which);
    return [
      { tex: `${rowAtTex(row, v)} = ${total}` },
      {
        text:
          total === d
            ? `That is the $${d}$ on the right, so (${p.which + 1}) balances. The triple still has to pass the other two before it is a solution.`
            : `The right-hand side is $${d}$, so (${p.which + 1}) fails and the triple is **not** a solution, even though it satisfies the other two.`,
      },
    ];
  },
};

interface ThirdParams extends Tri {
  which: 0 | 1 | 2;
  /** The letter still to find. */
  ask: 0 | 1 | 2;
}

/** What is left for the unknown term once the known values are taken over. */
function thirdRest(p: ThirdParams): number {
  const row = p.rows[p.which];
  return rhsOf(p, p.which) - row.reduce((sum, k, n) => (n === p.ask ? sum : sum + k * p.sol[n]), 0);
}

/**
 * Two values known, the third from one equation.
 *
 * The last step of every solve in this level, asked on its own: the two
 * known values go in, what is left is a one-letter equation from level 1.
 */
const triThird: Generator<ThirdParams> = {
  id: 'lin-tri-third',
  choices: (p) => {
    const c = p.rows[p.which][p.ask];
    const rest = thirdRest(p);
    const target = p.sol[p.ask];
    const known = rhsOf(p, p.which) - rest;
    return numberChoices(target, -target, rest, (rhsOf(p, p.which) + known) / c);
  },
  sample: (rng, difficulty) => ({
    ...sampleTri(rng, difficulty > 1),
    which: rng.pick([0, 1, 2] as const),
    ask: difficulty > 1 ? rng.pick([0, 1, 2] as const) : 2,
  }),
  render: (p): Slide => {
    const letter = TRI_LETTERS[p.ask];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `In the solution of this system, ${knownText(p.sol, p.ask)}. Put them into equation (${p.which + 1}) to find $${letter}$.`,
        },
        { kind: 'display', tex: triTex(p) },
      ],
      lead: `${letter} =`,
      keypad: [],
      answer: `${p.sol[p.ask]}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const row = p.rows[p.which];
    const letter = TRI_LETTERS[p.ask];
    const rest = thirdRest(p);
    return [
      { tex: `${rowAtTex(row, p.sol, p.ask)} = ${rhsOf(p, p.which)}` },
      { text: 'Work out the known terms and take them over to the right.' },
      { tex: `${leadTerm(row[p.ask], letter)} = ${rest}` },
      { tex: `${letter} = ${p.sol[p.ask]}` },
    ];
  },
};

/* ---------- Lesson 2: dropping one letter ---------- */

interface DropParams extends Tri {
  /** The letter being removed, the same size in all three rows. */
  k: number;
}

const DROP_FALLBACK: DropParams = { ...TRI_FALLBACK, k: 2 };

/**
 * A system with one letter the same size in every row, and no other.
 *
 * Its signs are drawn row by row, so pairing (1) with (2) and with (3) calls
 * for adding and subtracting in every mix. Both combinations keep both other
 * letters, lead with a positive coefficient, and stay under 100. Difficulty
 * 1 always removes $z$; difficulty 2 any letter, with negative values.
 */
function sampleDrop(rng: Rng, difficulty: number): DropParams {
  const hard = difficulty > 1;
  const pool = triPool(hard);
  return drawUntil(
    () => {
      const k = hard ? rng.int(0, 2) : 2;
      const m = rng.int(1, hard ? 3 : 2);
      return {
        rows: [0, 1, 2].map(() => [0, 1, 2].map((n) => (n === k ? rng.pick([1, -1]) * m : rng.pick(pool)))),
        sol: drawTriple(rng, hard),
        k,
      };
    },
    (p) =>
      det3(p.rows) !== 0 &&
      matchedLetters(p).length === 1 &&
      tidyCombo(combine(p, 0, 1, p.k), p.k) &&
      tidyCombo(combine(p, 0, 2, p.k), p.k),
    DROP_FALLBACK,
  );
}

/** (4) from (1) with (2), and (5) from (1) with (3). */
function reducedPair(p: DropParams): [Combo, Combo] {
  return [combine(p, 0, 1, p.k)!, combine(p, 0, 2, p.k)!];
}

function reducedTex(p: DropParams): string {
  const [four, five] = reducedPair(p);
  return numberedTex([rowEqTex(four.row, four.d), rowEqTex(five.row, five.d)], 4);
}

function dropWorking(p: DropParams): SolutionStep[] {
  const letter = TRI_LETTERS[p.k];
  const [a, b] = others(p.k);
  const [four, five] = reducedPair(p);
  return [
    { text: `The $${letter}$ coefficients are the same size in all three equations, so remove $${letter}$ twice.` },
    { tex: `${comboTex(four)}: \\; ${rowEqTex(four.row, four.d)} \\quad (4)` },
    { tex: `${comboTex(five)}: \\; ${rowEqTex(five.row, five.d)} \\quad (5)` },
    {
      text: `(4) and (5) are a pair in $${TRI_LETTERS[a]}$ and $${TRI_LETTERS[b]}$ alone, solved as in level 2: $${TRI_LETTERS[a]} = ${p.sol[a]}$ and $${TRI_LETTERS[b]} = ${p.sol[b]}$. Then (1) gives $${letter} = ${p.sol[p.k]}$.`,
    },
  ];
}

const TRI_ADD = 'Add them';
const TRI_SUBTRACT = 'Subtract them';

/**
 * Add or subtract, twice.
 *
 * (1) is paired with (2) and then with (3), and the signs of the letter being
 * removed decide each one separately. Both forks go on, so the path is the
 * answer; the outcomes state the rule, never which choice was right.
 */
const triDropFlow: Generator<DropParams> = {
  id: 'lin-tri-drop-flow',
  sample: sampleDrop,
  render: (p): Slide => {
    const letter = TRI_LETTERS[p.k];
    const [four, five] = reducedPair(p);
    const label = (c: Combo) => (c.op === '+' ? TRI_ADD : TRI_SUBTRACT);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Remove $${letter}$ from this system by pairing (1) with each of the others.` }],
      subject: triTex(p),
      steps: [
        {
          id: 'first',
          ask: `Pair (1) with (2). To remove $${letter}$, do you add them or subtract them?`,
          branches: [
            { label: TRI_ADD, to: 'second' },
            { label: TRI_SUBTRACT, to: 'second' },
          ],
        },
        {
          id: 'second',
          ask: 'Now pair (1) with (3). Add or subtract?',
          branches: [
            { label: TRI_ADD, outcome: `Adding cancels $${letter}$ when its two coefficients have opposite signs.` },
            { label: TRI_SUBTRACT, outcome: `Subtracting cancels $${letter}$ when its two coefficients have the same sign.` },
          ],
        },
      ],
      answer: [label(four), label(five)],
    };
  },
  solution: (p) => {
    const letter = TRI_LETTERS[p.k];
    const [four, five] = reducedPair(p);
    const why = (c: Combo, other: number) =>
      `In (1) and (${other}) the $${letter}$ coefficients are $${p.rows[0][p.k]}$ and $${p.rows[other - 1][p.k]}$: ${c.op === '-' ? 'the same sign, so **subtract**' : 'opposite signs, so **add**'}.`;
    return [
      { text: why(four, 2) },
      { tex: `${comboTex(four)}: \\; ${rowEqTex(four.row, four.d)}` },
      { text: why(five, 3) },
      { tex: `${comboTex(five)}: \\; ${rowEqTex(five.row, five.d)}` },
    ];
  },
};

interface DropPairParams extends DropParams {
  /** Which equation (1) is paired with: 1 for (2), 2 for (3). */
  with: 1 | 2;
}

function sampleDropPair(rng: Rng, difficulty: number): DropPairParams {
  return { ...sampleDrop(rng, difficulty), with: rng.pick([1, 2] as const) };
}

const dropCombo = (p: DropPairParams): Combo => combine(p, 0, p.with, p.k)!;

function dropPairSolution(p: DropPairParams): SolutionStep[] {
  const letter = TRI_LETTERS[p.k];
  const c = dropCombo(p);
  return [
    {
      text: `The $${letter}$ coefficients in (1) and (${p.with + 1}) are $${p.rows[0][p.k]}$ and $${p.rows[p.with][p.k]}$: ${c.op === '-' ? 'the same sign, so subtract' : 'opposite signs, so add'}, every term and the right-hand sides too.`,
    },
    { tex: `${comboTex(c)}: \\; ${rowEqTex(c.row, c.d)}` },
    { text: `No $${letter}$ is left: one equation in the other two letters.` },
  ];
}

/**
 * The equation left once a letter is removed, placed as tiles.
 *
 * The bank holds what the wrong operation leaves, a right-hand side with its
 * sign lost, and the second term with its sign lost — the three slips worth
 * catching when one whole equation is taken from another.
 */
const triCombine: Generator<DropPairParams> = {
  id: 'lin-tri-combine',
  choices: (p) => {
    const c = dropCombo(p);
    const wrong = wrongWay(p, c);
    const [, b] = others(p.k);
    const flipped = c.row.map((v, n) => (n === b ? 0 - v : v));
    return labelChoices(
      rowEqTex(c.row, c.d),
      rowEqTex(wrong.row, wrong.d),
      rowEqTex(c.row, 0 - c.d),
      rowEqTex(flipped, c.d),
    );
  },
  sample: sampleDropPair,
  render: (p): Slide => {
    const c = dropCombo(p);
    const wrong = wrongWay(p, c);
    const [a, b] = others(p.k);
    const [la, lb] = [TRI_LETTERS[a], TRI_LETTERS[b]];
    const answer = [leadTerm(c.row[a], la), signedTile(c.row[b], lb), `${c.d}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Remove $${TRI_LETTERS[p.k]}$ from (1) and (${p.with + 1}) by adding or subtracting them. Write the equation that is left, with its $${la}$ coefficient positive.`,
        },
        { kind: 'display', tex: triTex(p) },
      ],
      template: '{0} {1} = {2}',
      bank: bankOf(answer, [
        ...(wrong.row[a] === 0 ? [] : [leadTerm(wrong.row[a], la)]),
        ...(wrong.row[b] === 0 ? [] : [signedTile(wrong.row[b], lb)]),
        `${wrong.d}`,
        `${0 - c.d}`,
        signedTile(0 - c.row[b], lb),
      ]),
      answer,
    };
  },
  solution: dropPairSolution,
};

/** One letter's term as a tile: leading, or signed after the first; a bare 0 when it cancels. */
function termTile(k: number, letter: string, first: boolean): string {
  if (k === 0) return first ? '0' : '+ 0';
  return first ? leadTerm(k, letter) : signedTile(k, letter);
}

/**
 * Removing a letter as a line of working, one letter at a time.
 *
 * The combination is written out term by term — $(a_1 + a_2)x$, and so on —
 * so each tap settles one letter, the removed one coming to $0$, and the last
 * tap settles the right-hand side and tidies the line. Each bank holds what
 * the other operation makes of that term and the term with its sign lost.
 * Every piece stays short, so the line fits a phone however it wraps.
 */
const triDropSteps: Generator<DropPairParams> = {
  id: 'lin-tri-drop-steps',
  sample: sampleDropPair,
  render: (p): Slide => {
    const c = dropCombo(p);
    const wrong = wrongWay(p, c);
    const [i, j] = c.from;
    const pieces = TRI_LETTERS.map(
      (letter, n) => `${n === 0 ? '' : '+ '}(${p.rows[i][n]} ${c.op} ${br(p.rows[j][n])})${letter}`,
    );
    const left = rowTex(c.row);
    const terms: Extract<Slide, { kind: 'steps' }>['reductions'] = TRI_LETTERS.map((letter, n) => {
      const value = termTile(c.row[n], letter, n === 0);
      return {
        span: [n, n + 1],
        value,
        bank: stepBank(value, termTile(wrong.row[n], letter, n === 0), termTile(0 - c.row[n] || 1, letter, n === 0)),
      };
    });
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Remove $${TRI_LETTERS[p.k]}$ from (1) and (${p.with + 1}) with ${comboTex(c)}: settle the $x$, $y$ and $z$ terms in turn, then the right-hand side. ${HOW_TO_STEP}`,
        },
        { kind: 'display', tex: triTex(p) },
      ],
      start: [...pieces, '=', `${rhsOf(p, i)} ${c.op} ${br(rhsOf(p, j))}`],
      reductions: [
        ...terms,
        {
          span: [0, 5],
          operator: 4,
          value: `${left} = ${c.d}`,
          bank: stepBank(`${left} = ${c.d}`, `${left} = ${wrong.d}`, `${left} = ${0 - c.d}`, `${left} = ${rhsOf(p, i)}`),
        },
      ],
    };
  },
  solution: dropPairSolution,
};

/**
 * The new equation still holds at the solution.
 *
 * Whatever satisfies (1) and (2) satisfies their sum and their difference, so
 * removing a letter this way never loses the solution. Asked as a reduction:
 * the equation left, worked out at the known triple.
 */
const triDropCheck: Generator<DropPairParams> = {
  id: 'lin-tri-drop-check',
  choices: (p) => {
    const c = dropCombo(p);
    const [a, b] = others(p.k);
    const [u, w] = [c.row[a], c.row[b]];
    const [va, vb] = [p.sol[a], p.sol[b]];
    return numberChoices(c.d, u * va - w * vb, u * vb + w * va, -c.d);
  },
  sample: sampleDropPair,
  render: (p): Slide => {
    const c = dropCombo(p);
    const [a, b] = others(p.k);
    const [u, w] = [c.row[a], c.row[b]];
    const product = bin('*', num(u), num(p.sol[a]));
    const expr = w < 0 ? bin('-', product, bin('*', num(-w), num(p.sol[b]))) : bin('+', product, bin('*', num(w), num(p.sol[b])));
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `This system's solution is $${tripleTex(p.sol)}$. Removing $${TRI_LETTERS[p.k]}$ with ${comboTex(c)} gave $${rowEqTex(c.row, c.d)}$. Work out its left-hand side at the solution. ${HOW_TO_REDUCE}`,
        },
        { kind: 'display', tex: triTex(p) },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: (p) => {
    const c = dropCombo(p);
    const [a, b] = others(p.k);
    return [
      { tex: `${c.row[a]} \\times ${br(p.sol[a])} ${c.row[b] < 0 ? '-' : '+'} ${Math.abs(c.row[b])} \\times ${br(p.sol[b])} = ${c.d}` },
      {
        text: `That is the right-hand side, $${c.d}$. Adding or subtracting two true equations gives a true equation, so the new one keeps the solution.`,
      },
    ];
  },
};

/* ---------- Lesson 3: finishing off ---------- */

interface FinishParams extends DropParams {
  /** The letter whose coefficients match in (4) and (5), removed next. */
  m: number;
}

/** z matched (1, 1, -1); (4) = (2) - (1) is x - y = -1, (5) = (1) + (3) is 2x + y = 4. */
const FINISH_FALLBACK: FinishParams = {
  rows: [
    [1, 2, 1],
    [2, 1, 1],
    [1, -1, -1],
  ],
  sol: [1, 2, 3],
  k: 2,
  m: 1,
};

function pairTri(p: DropParams): Tri {
  const [four, five] = reducedPair(p);
  return { rows: [four.row, five.row], sol: p.sol };
}

const finishCombo = (p: FinishParams): Combo => combine(pairTri(p), 0, 1, p.m, [4, 5])!;

/**
 * A system that removes one letter cleanly, and then another.
 *
 * On top of `sampleDrop`: in the pair (4), (5) exactly one letter has
 * coefficients the same size, so finishing off is one more add or subtract
 * with no scaling, and it leaves the last letter with a positive coefficient.
 */
function sampleFinish(rng: Rng, difficulty: number): FinishParams {
  return drawUntil(
    () => {
      const p = sampleDrop(rng, difficulty);
      const pair = pairTri(p);
      const matched = others(p.k).filter((n) => Math.abs(pair.rows[0][n]) === Math.abs(pair.rows[1][n]));
      return { ...p, m: matched.length === 1 ? matched[0] : -1 };
    },
    (p) => {
      if (p.m < 0) return false;
      const c = finishCombo(p);
      return c !== undefined && c.row[3 - p.k - p.m] > 0 && Math.abs(c.d) < 100;
    },
    FINISH_FALLBACK,
  );
}

/**
 * The finish, as a tree: the pair combined, the letter it leaves, then the
 * other two put back in turn — the second from (4), the last from (1).
 */
const triFinishTree: Generator<FinishParams> = {
  id: 'lin-tri-finish-tree',
  sample: sampleFinish,
  render: (p): Slide => {
    const c = finishCombo(p);
    const n = 3 - p.k - p.m;
    const wrong = wrongWay(pairTri(p), c);
    const answer = [c.row[n], c.d, p.sol[n], p.sol[p.m], p.sol[p.k]].map(String);
    const [L, M, N] = [TRI_LETTERS[p.k], TRI_LETTERS[p.m], TRI_LETTERS[n]];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `(4) and (5) came from removing $${L}$. Now ${comboTex(c)} removes $${M}$ and leaves $\\square\\, ${N} = \\square$. Fill the tree: that coefficient and right-hand side, then $${N}$, then $${M}$ from (4), then $${L}$ from (1).`,
        },
        { kind: 'display', tex: triTex(p) },
        { kind: 'display', tex: reducedTex(p) },
      ],
      expression: comboTex(c),
      nodes: [
        { id: 'coefficient', from: [] },
        { id: 'right', from: [] },
        { id: 'last', from: ['coefficient', 'right'] },
        { id: 'middle', from: ['last'] },
        { id: 'first', from: ['last', 'middle'] },
      ],
      bank: treeBank(answer, [wrong.row[n], wrong.d, -p.sol[n], -p.sol[p.m]], p.sol[n]),
      answer,
    };
  },
  solution: (p) => {
    const c = finishCombo(p);
    const n = 3 - p.k - p.m;
    const [four] = reducedPair(p);
    const [L, M, N] = [TRI_LETTERS[p.k], TRI_LETTERS[p.m], TRI_LETTERS[n]];
    return [
      { text: `The $${M}$ coefficients in (4) and (5) are the same size, so ${c.op === '-' ? 'subtract' : 'add'}.` },
      { tex: solvedTex(leadTerm(c.row[n], N), c.d, N, p.sol[n]) },
      { text: `Put $${N} = ${p.sol[n]}$ into (4):` },
      { tex: `${rowAtTex(four.row, p.sol, p.m)} = ${four.d}` },
      { tex: `${M} = ${p.sol[p.m]}` },
      { text: 'Then both into (1):' },
      { tex: `${rowAtTex(p.rows[0], p.sol, p.k)} = ${rhsOf(p, 0)}` },
      { tex: `${L} = ${p.sol[p.k]}` },
    ];
  },
};

interface BackParams extends Tri {
  which: 0 | 1 | 2;
  /** The letter still to find; its term goes last on the line. */
  ask: 0 | 1 | 2;
}

/**
 * Putting two values back, as a line of working.
 *
 * The two known terms are worked out together, the total taken across, and
 * the coefficient divided out — three taps, with the sign slips in each bank.
 * The unknown's term is written last, so the line reads known, known, unknown.
 */
const triBackSteps: Generator<BackParams> = {
  id: 'lin-tri-back-steps',
  sample: (rng, difficulty) => ({
    ...sampleTri(rng, difficulty > 1),
    which: rng.pick([0, 1, 2] as const),
    ask: difficulty > 1 ? rng.pick([0, 1, 2] as const) : 2,
  }),
  render: (p): Slide => {
    const row = p.rows[p.which];
    const d = rhsOf(p, p.which);
    const [a, b] = others(p.ask);
    const letter = TRI_LETTERS[p.ask];
    const c = row[p.ask];
    const known = row[a] * p.sol[a] + row[b] * p.sol[b];
    const rest = d - known;
    const term = leadTerm(c, letter);
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [
      {
        span: [0, 2],
        value: `${known}`,
        bank: stepBank(`${known}`, `${row[a] * p.sol[a] - row[b] * p.sol[b]}`, `${0 - known}`, `${row[a] + row[b] + p.sol[a] + p.sol[b]}`),
      },
      {
        span: [0, 4],
        value: `${term} = ${rest}`,
        bank: stepBank(`${term} = ${rest}`, `${term} = ${d + known}`, `${term} = ${known - d}`),
      },
    ];
    if (c !== 1) {
      reductions.push({
        span: [0, 1],
        value: `${letter} = ${p.sol[p.ask]}`,
        bank: stepBank(`${letter} = ${p.sol[p.ask]}`, `${letter} = ${0 - p.sol[p.ask]}`, `${letter} = ${rest - c}`, `${letter} = ${rest * c}`),
      });
    }
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Solving has given ${knownText(p.sol, p.ask)}. Put them into (${p.which + 1}) and finish it for $${letter}$. ${HOW_TO_STEP}`,
        },
        { kind: 'display', tex: triTex(p) },
      ],
      start: [leadTerm(row[a], TRI_LETTERS[a]), signedTile(row[b], TRI_LETTERS[b]), signedTile(c, letter), '=', `${d}`],
      reductions,
    };
  },
  solution: (p) => {
    const row = p.rows[p.which];
    const letter = TRI_LETTERS[p.ask];
    const rest = thirdRest(p);
    return [
      { tex: `${rowAtTex(row, p.sol, p.ask)} = ${rhsOf(p, p.which)}` },
      { tex: `${leadTerm(row[p.ask], letter)} = ${rest}` },
      { tex: `${letter} = ${p.sol[p.ask]}` },
      { text: 'Then check the three values in an equation not used yet.' },
    ];
  },
};

interface VerifyParams extends Tri {
  which: 0 | 1 | 2;
}

/**
 * The check, as a reduction: the found triple in one equation.
 *
 * A slip anywhere in the solve shows up here, provided the check uses an
 * original equation — never one built on the way, which would pass a
 * mistake made building it.
 */
const triVerify: Generator<VerifyParams> = {
  id: 'lin-tri-verify',
  choices: (p) => {
    const row = p.rows[p.which];
    const [x, y, z] = p.sol;
    const value = dot3(row, p.sol);
    return numberChoices(value, row[0] * x - row[1] * y + row[2] * z, row[0] * x + row[1] * y - row[2] * z, row[0] + row[1] + row[2] + x + y + z);
  },
  sample: (rng, difficulty) => ({ ...sampleTri(rng, difficulty > 1), which: rng.pick([0, 1, 2] as const) }),
  render: (p): Slide => {
    const row = p.rows[p.which];
    const term = (n: number) => bin('*', num(Math.abs(row[n])), num(p.sol[n]));
    const first = bin('*', num(row[0]), num(p.sol[0]));
    const two = bin(row[1] < 0 ? '-' : '+', first, term(1));
    const expr = bin(row[2] < 0 ? '-' : '+', two, term(2));
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `Solving gave $(x, y, z) = ${tripleTex(p.sol)}$. Check it in equation (${p.which + 1}): work out the left-hand side. ${HOW_TO_REDUCE}`,
        },
        { kind: 'display', tex: triTex(p) },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: (p) => [
    { tex: `${rowAtTex(p.rows[p.which], p.sol)} = ${rhsOf(p, p.which)}` },
    { text: `That is the right-hand side of (${p.which + 1}), so the triple checks out.` },
  ],
};

interface SolveTriParams extends DropParams {
  ask: 0 | 1 | 2;
}

/**
 * The whole solve, to one value.
 *
 * One letter matches in all three rows, so the route is the one the lesson
 * teaches: remove it twice, solve the pair, put back. The slips on offer are
 * the other two values and a lost sign.
 */
const triSolve: Generator<SolveTriParams> = {
  id: 'lin-tri-solve',
  choices: (p) => {
    const target = p.sol[p.ask];
    const [a, b] = others(p.ask);
    return numberChoices(target, p.sol[a], p.sol[b], -target);
  },
  sample: (rng, difficulty) => ({ ...sampleDrop(rng, difficulty), ask: rng.pick([0, 1, 2] as const) }),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Solve the system by elimination, and give $${TRI_LETTERS[p.ask]}$.` },
      { kind: 'display', tex: triTex(p) },
    ],
    lead: `${TRI_LETTERS[p.ask]} =`,
    keypad: [],
    answer: `${p.sol[p.ask]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: dropWorking,
};

/* ---------- Lesson 4: choosing the letter ---------- */

type LetterCase = 'missing' | 'matched' | 'none';

interface LetterParams extends Tri {
  kind: LetterCase;
  /** The letter to remove first, or -1 when every letter needs scaling. */
  k: number;
}

/** z missing from (3); x and y match nowhere. Solution (1, 2, 3). */
const MISSING_FALLBACK: LetterParams = {
  rows: [
    [1, 2, 1],
    [2, 1, -1],
    [1, -1, 0],
  ],
  sol: [1, 2, 3],
  kind: 'missing',
  k: 2,
};

/**
 * One letter missing from exactly one equation, and no letter the same size
 * everywhere. The two equations that do have it can lose it by one add or
 * subtract, so the missing letter really is the quickest.
 */
function sampleMissing(rng: Rng, hard: boolean): LetterParams {
  const pool = triPool(hard);
  return drawUntil(
    () => {
      const k = rng.int(0, 2);
      const gap = rng.int(0, 2);
      const m = rng.int(1, hard ? 3 : 2);
      return {
        rows: [0, 1, 2].map((i) =>
          [0, 1, 2].map((n) => (n !== k ? rng.pick(pool) : i === gap ? 0 : rng.pick([1, -1]) * m)),
        ),
        sol: drawTriple(rng, hard),
        kind: 'missing' as const,
        k,
      };
    },
    (t) => {
      if (det3(t.rows) === 0 || zeroCount(t) !== 1 || matchedLetters(t).length > 0) return false;
      const [i, j] = [0, 1, 2].filter((row) => t.rows[row][t.k] !== 0);
      return tidyCombo(combine(t, i, j, t.k), t.k);
    },
    MISSING_FALLBACK,
  );
}

function sampleLetter(rng: Rng, difficulty: number, kinds: readonly LetterCase[]): LetterParams {
  const hard = difficulty > 1;
  const kind = rng.pick(kinds);
  if (kind === 'missing') return sampleMissing(rng, hard);
  if (kind === 'matched') return { ...sampleDrop(rng, difficulty), kind };
  return {
    ...sampleTri(rng, hard, (t) => matchedLetters(t).length === 0),
    kind,
    k: -1,
  };
}

function letterSolution(p: LetterParams): SolutionStep[] {
  if (p.kind === 'none') {
    return [
      {
        text: `No letter is missing, and no letter's coefficients are the same size in all three: $x$ has $${p.rows.map((row) => row[0]).join(', ')}$, $y$ has $${p.rows.map((row) => row[1]).join(', ')}$, $z$ has $${p.rows.map((row) => row[2]).join(', ')}$.`,
      },
      { text: 'So scale first: multiply an equation until one letter matches in a pair, as in level 2.' },
    ];
  }
  const letter = TRI_LETTERS[p.k];
  if (p.kind === 'missing') {
    const gap = p.rows.findIndex((row) => row[p.k] === 0);
    return [
      { text: `$${letter}$ is missing from (${gap + 1}), so that equation already has no $${letter}$ in it.` },
      { text: `Remove $${letter}$ from the other two with one add or subtract, and (${gap + 1}) is the other half of the pair.` },
    ];
  }
  return [
    {
      text: `The $${letter}$ coefficients are $${p.rows.map((row) => row[p.k]).join(', ')}$: the same size in all three, so adding or subtracting removes $${letter}$ with no scaling.`,
    },
  ];
}

const TRI_YES = 'Yes';
const TRI_NO = 'No';

/**
 * Which letter goes first? A walk down the checks, quickest first.
 *
 * A letter already missing from one equation needs one combination instead
 * of two; a letter the same size everywhere needs no scaling; otherwise scale.
 */
const triLetterFlow: Generator<LetterParams> = {
  id: 'lin-tri-letter-flow',
  sample: (rng, difficulty) => sampleLetter(rng, difficulty, ['missing', 'matched', 'none']),
  render: (p): Slide => ({
    kind: 'flow',
    prompt: [{ kind: 'prose', text: 'Which letter should this system lose first? Walk through the checks.' }],
    subject: triTex(p),
    steps: [
      {
        id: 'missing',
        ask: 'Is a letter missing from one of the equations?',
        branches: [
          {
            label: TRI_YES,
            outcome: 'Remove that letter from the other two. The equation without it is already half of the pair.',
          },
          { label: TRI_NO, to: 'match' },
        ],
      },
      {
        id: 'match',
        ask: 'Is there a letter whose coefficients are the same size in all three?',
        branches: [
          { label: TRI_YES, outcome: 'Remove that letter: pair (1) with each of the others, adding or subtracting.' },
          { label: TRI_NO, outcome: 'Scale first: multiply an equation so that one letter matches in a pair.' },
        ],
      },
    ],
    answer: p.kind === 'missing' ? [TRI_YES] : p.kind === 'matched' ? [TRI_NO, TRI_YES] : [TRI_NO, TRI_NO],
  }),
  solution: letterSolution,
};

/**
 * The same judgement as a pick of one letter.
 *
 * Only systems with a clear winner: one letter missing from one equation, or
 * one letter the same size in all three, and nothing else that is either.
 */
const triLetterChoice: Generator<LetterParams> = {
  id: 'lin-tri-letter-choice',
  sample: (rng, difficulty) => sampleLetter(rng, difficulty, ['missing', 'matched']),
  render: (p): Slide => ({
    kind: 'choice',
    prompt: [
      { kind: 'prose', text: 'Which letter is quickest to remove from this system?' },
      { kind: 'display', tex: triTex(p) },
    ],
    options: TRI_LETTERS.map((letter) => ({ id: letter, label: letter, tex: true })),
    correctId: TRI_LETTERS[p.k],
  }),
  solution: letterSolution,
};

interface ScaleTriParams extends Tri {
  /** The letter to match. */
  k: number;
  /** Row `i` is multiplied by `m` to match row `j`. */
  i: number;
  j: number;
  m: number;
}

/** (2) has 3x where (1) has x; nothing matches without scaling. Solution (1, 2, 3). */
const SCALE_TRI_FALLBACK: ScaleTriParams = {
  rows: [
    [1, 2, -1],
    [3, 1, 2],
    [2, -1, 1],
  ],
  sol: [1, 2, 3],
  k: 0,
  i: 0,
  j: 1,
  m: 3,
};

/**
 * One scaling away: row `j`'s coefficient of the letter is `m` times row
 * `i`'s. No letter matches in all three and no other letter matches between
 * `i` and `j`, so scaling is the move. The scaled right-hand side stays under
 * 100. Difficulty 2 lets the multiplier be negative.
 */
function sampleScaleTri(rng: Rng, difficulty: number): ScaleTriParams {
  const hard = difficulty > 1;
  const pool = triPool(hard);
  return drawUntil(
    () => {
      const k = rng.int(0, 2);
      const i = rng.int(0, 2);
      const j = (i + rng.int(1, 2)) % 3;
      const m = rng.pick(hard ? [2, 3, 4, -2, -3, -4] : [2, 3, 4]);
      const p = rng.pick(hard && Math.abs(m) === 2 ? [1, -1, 2, -2] : [1, -1]);
      const rows = [0, 1, 2].map(() => [rng.pick(pool), rng.pick(pool), rng.pick(pool)]);
      rows[i][k] = p;
      rows[j][k] = m * p;
      return { rows, sol: drawTriple(rng, hard), k, i, j, m };
    },
    (t) =>
      det3(t.rows) !== 0 &&
      matchedLetters(t).length === 0 &&
      others(t.k).every((n) => Math.abs(t.rows[t.i][n]) !== Math.abs(t.rows[t.j][n])) &&
      Math.abs(t.m * rhsOf(t, t.i)) < 100,
    SCALE_TRI_FALLBACK,
  );
}

const scaledRow = (p: ScaleTriParams): Row => p.rows[p.i].map((v) => p.m * v);

function scaleTriSolution(p: ScaleTriParams): SolutionStep[] {
  const letter = TRI_LETTERS[p.k];
  const q = p.rows[p.j][p.k];
  return [
    {
      text: `The $${letter}$ coefficient in (${p.j + 1}) is $${q}$, which is $${p.m}$ times the $${p.rows[p.i][p.k]}$ in (${p.i + 1}). Multiply **every** term of (${p.i + 1}) by $${p.m}$, the right-hand side too.`,
    },
    { tex: `${rowEqTex(scaledRow(p), p.m * rhsOf(p, p.i))} \\quad (${p.i + 1}')` },
    { text: `Now (${p.i + 1}') and (${p.j + 1}) have the same $${letter}$ term, and subtracting removes it.` },
  ];
}

/**
 * The scaled equation, placed as tiles.
 *
 * The slip is scaling only the term that needed matching, so the bank holds
 * every unscaled term and the unscaled right-hand side beside the scaled
 * ones, and one term with its sign lost.
 */
const triScaleTiles: Generator<ScaleTriParams> = {
  id: 'lin-tri-scale-tiles',
  choices: (p) => {
    const row = p.rows[p.i];
    const d = rhsOf(p, p.i);
    const scaled = scaledRow(p);
    const onlyOne = row.map((v, n) => (n === p.k ? p.m * v : v));
    return labelChoices(rowEqTex(scaled, p.m * d), rowEqTex(onlyOne, d), rowEqTex(scaled, d), rowEqTex(onlyOne, p.m * d));
  },
  sample: sampleScaleTri,
  render: (p): Slide => {
    const row = p.rows[p.i];
    const d = rhsOf(p, p.i);
    const s = scaledRow(p);
    const answer = [leadTerm(s[0], 'x'), signedTile(s[1], 'y'), signedTile(s[2], 'z'), `${p.m * d}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `To remove $${TRI_LETTERS[p.k]}$ from (${p.i + 1}) and (${p.j + 1}), multiply (${p.i + 1}) by $${p.m}$. Write the new equation.`,
        },
        { kind: 'display', tex: triTex(p) },
      ],
      template: '{0} {1} {2} = {3}',
      bank: bankOf(answer, [
        leadTerm(row[0], 'x'),
        signedTile(row[1], 'y'),
        signedTile(row[2], 'z'),
        `${d}`,
        signedTile(0 - s[1], 'y'),
      ]),
      answer,
    };
  },
  solution: scaleTriSolution,
};

/**
 * The multiplier itself: what (i) is multiplied by so its term is exactly
 * the one in (j). Negative at difficulty 2, when the signs differ.
 */
const triMultiplier: Generator<ScaleTriParams> = {
  id: 'lin-tri-multiplier',
  choices: (p) => {
    const q = p.rows[p.j][p.k];
    const r = p.rows[p.i][p.k];
    return numberChoices(p.m, -p.m, q - r, q * r);
  },
  sample: sampleScaleTri,
  render: (p): Slide => {
    const letter = TRI_LETTERS[p.k];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Multiply equation (${p.i + 1}) by $k$ so that its $${letter}$ term becomes exactly the $${letter}$ term of (${p.j + 1}). What is $k$?`,
        },
        { kind: 'display', tex: triTex(p) },
      ],
      lead: 'k =',
      keypad: [],
      answer: `${p.m}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const letter = TRI_LETTERS[p.k];
    const q = p.rows[p.j][p.k];
    const r = p.rows[p.i][p.k];
    return [
      { text: `(${p.j + 1}) has $${leadTerm(q, letter)}$ and (${p.i + 1}) has $${leadTerm(r, letter)}$.` },
      { tex: `k = ${q} \\div ${br(r)} = ${p.m}` },
      ...scaleTriSolution(p).slice(1),
    ];
  },
};

/* ---------- Lesson 5: three unknowns from words ---------- */

/** Three things whose pairs are each given a total. */
interface SumStory {
  names: [string, string, string];
  /** One fact: the pair's total, as a sentence. */
  pair: (a: string, b: string, n: number) => string;
  /** What a letter stands for. */
  letter: (name: string) => string;
  ask: (name: string) => string;
}

const SUM_STORIES: readonly SumStory[] = [
  {
    names: ['a pen', 'a ruler', 'a rubber'],
    pair: (a, b, n) => `${capital(a)} and ${b} cost $${n}$p.`,
    letter: (a) => `the price of ${a} in pence`,
    ask: (a) => `How much is ${a}, in pence?`,
  },
  {
    names: ['an apple', 'a pear', 'a lemon'],
    pair: (a, b, n) => `${capital(a)} and ${b} cost $${n}$p together.`,
    letter: (a) => `the price of ${a} in pence`,
    ask: (a) => `How much is ${a}, in pence?`,
  },
  {
    names: ['Amy', 'Ben', 'Cara'],
    pair: (a, b, n) => `${a} and ${b} are $${n}$ years old altogether.`,
    letter: (a) => `${a}'s age`,
    ask: (a) => `How old is ${a}?`,
  },
  {
    names: ['Dev', 'Eli', 'Fay'],
    pair: (a, b, n) => `The ages of ${a} and ${b} add up to $${n}$.`,
    letter: (a) => `${a}'s age`,
    ask: (a) => `How old is ${a}?`,
  },
  {
    names: ['the red box', 'the blue box', 'the green box'],
    pair: (a, b, n) => `${capital(a)} and ${b} weigh $${n}$ kg together.`,
    letter: (a) => `the mass of ${a} in kg`,
    ask: (a) => `How heavy is ${a}, in kg?`,
  },
];

/** The three pairs, as row-index pairs; a permutation of them orders the facts. */
const SUM_PAIRS: readonly [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 2],
];

const PERMUTATIONS: readonly [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/** A share: a total, one difference and one multiple. */
interface ShareStory {
  names: [string, string, string];
  things: string;
}

const SHARE_STORIES: readonly ShareStory[] = [
  { names: ['Ana', 'Ben', 'Cal'], things: 'sweets' },
  { names: ['Dan', 'Eve', 'Fin'], things: 'stickers' },
  { names: ['Gus', 'Hana', 'Ivy'], things: 'marbles' },
  { names: ['Jo', 'Kit', 'Lee'], things: 'cards' },
  { names: ['Mo', 'Nia', 'Oli'], things: 'shells' },
];

const TIMES_WORD: Record<number, string> = { 2: 'twice', 3: 'three times', 4: 'four times' };
const PART_WORD: Record<number, string> = { 2: 'half', 3: 'a third of', 4: 'a quarter of' };

interface SumParams {
  kind: 'sum';
  story: number;
  /** The three values, for the story's three things in order. */
  v: Row;
  /** The order the three pair facts are told in, as indices into SUM_PAIRS. */
  order: [number, number, number];
}

interface ShareParams {
  kind: 'share';
  story: number;
  /** The middle share; the first is `y + d` and the third `k y`. */
  y: number;
  d: number;
  k: number;
  /** Difficulty 2 says both facts the other way round. */
  turned: boolean;
}

type WordsTriParams = SumParams | ShareParams;

function sampleSum(rng: Rng, difficulty: number): SumParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => ({
      kind: 'sum' as const,
      story: rng.int(0, SUM_STORIES.length - 1),
      v: [0, 1, 2].map(() => rng.int(hard ? 5 : 2, hard ? 30 : 15)),
      order: rng.pick(PERMUTATIONS),
    }),
    (p) => new Set(p.v).size === 3 && p.v[0] + p.v[1] + p.v[2] < 50,
    { kind: 'sum', story: 0, v: [12, 7, 9], order: [0, 1, 2] },
  );
}

function sampleShare(rng: Rng, difficulty: number): ShareParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => ({
      kind: 'share' as const,
      story: rng.int(0, SHARE_STORIES.length - 1),
      y: rng.int(hard ? 3 : 2, hard ? 12 : 8),
      d: rng.int(2, hard ? 12 : 9),
      k: rng.int(2, hard ? 4 : 3),
      turned: hard && rng.chance(0.5),
    }),
    (p) => (2 + p.k) * p.y + p.d < 100 && p.y + p.d !== p.k * p.y,
    { kind: 'share', story: 0, y: 5, d: 3, k: 2, turned: false },
  );
}

/** The system a sum story makes, fact by fact in the order told. */
function sumRows(p: SumParams): Row[] {
  return p.order.map((f) => [0, 1, 2].map((n) => (SUM_PAIRS[f].includes(n) ? 1 : 0)));
}

function sumTri(p: SumParams): Tri {
  return { rows: sumRows(p), sol: p.v };
}

function sumText(p: SumParams): string {
  const s = SUM_STORIES[p.story];
  return p.order
    .map((f) => {
      const [a, b] = SUM_PAIRS[f];
      return s.pair(s.names[a], s.names[b], p.v[a] + p.v[b]);
    })
    .join(' ');
}

function sumLetters(p: SumParams): string {
  const s = SUM_STORIES[p.story];
  return `Let $x$ be ${s.letter(s.names[0])}, $y$ ${s.letter(s.names[1])} and $z$ ${s.letter(s.names[2])}.`;
}

function shareValues(p: ShareParams): Row {
  return [p.y + p.d, p.y, p.k * p.y];
}

function shareText(p: ShareParams): string {
  const { names, things } = SHARE_STORIES[p.story];
  const [a, b, c] = names;
  const total = p.y + p.d + p.y + p.k * p.y;
  const diff = p.turned ? `${b} gets $${p.d}$ fewer than ${a}` : `${a} gets $${p.d}$ more than ${b}`;
  const ratio = p.turned ? `${b} gets ${PART_WORD[p.k]} what ${c} gets` : `${c} gets ${TIMES_WORD[p.k]} as many as ${b}`;
  return `${a}, ${b} and ${c} share $${total}$ ${things}. ${diff}, and ${ratio}.`;
}

function shareLetters(p: ShareParams): string {
  const { names, things } = SHARE_STORIES[p.story];
  return `Let $x$, $y$ and $z$ be the numbers of ${things} ${names[0]}, ${names[1]} and ${names[2]} get.`;
}

function wordsValues(p: WordsTriParams): Row {
  return p.kind === 'sum' ? p.v : shareValues(p);
}

function sumSolution(p: SumParams, ask: number): SolutionStep[] {
  const t = sumTri(p);
  const total = (p.v[0] + p.v[1] + p.v[2]) * 2;
  const without = t.rows.findIndex((row) => row[ask] === 0);
  return [
    { tex: triTex(t) },
    { text: 'Every letter appears in exactly two equations, so add all three.' },
    { tex: `2x + 2y + 2z = ${total}` },
    { tex: `x + y + z = ${total / 2}` },
    { text: `Take away (${without + 1}), the one without $${TRI_LETTERS[ask]}$:` },
    { tex: `${TRI_LETTERS[ask]} = ${total / 2} - ${rhsOf(t, without)} = ${p.v[ask]}` },
  ];
}

function shareSolution(p: ShareParams): SolutionStep[] {
  const total = p.y + p.d + p.y + p.k * p.y;
  const [x, y, z] = shareValues(p);
  return [
    { tex: numberedTex([`x + y + z = ${total}`, `x = y + ${p.d}`, `z = ${p.k}y`]) },
    { text: 'Put (2) and (3) into (1), so everything is in $y$.' },
    { tex: `(y + ${p.d}) + y + ${p.k}y = ${total}` },
    { tex: `${2 + p.k}y = ${total - p.d} \\implies y = ${y}` },
    { text: `Then $x = ${y} + ${p.d} = ${x}$ and $z = ${p.k} \\times ${y} = ${z}$.` },
  ];
}

interface FactParams extends ShareParams {
  fact: 'difference' | 'multiple';
}

/**
 * One fact of a share, as an equation: which way round?
 *
 * The wrong options are the classic reversals — the difference added to the
 * wrong person, the multiple on the wrong letter — and difficulty 2 words
 * each fact the other way round ("fewer than", "a third of"), which is where
 * the reversal is most tempting.
 */
const triWordsFact: Generator<FactParams> = {
  id: 'lin-tri-words-fact',
  sample: (rng, difficulty) => ({ ...sampleShare(rng, difficulty), fact: rng.pick(['difference', 'multiple'] as const) }),
  render: (p): Slide => {
    const { names } = SHARE_STORIES[p.story];
    const about = p.fact === 'difference' ? `${names[0]} and ${names[1]}` : `${names[1]} and ${names[2]}`;
    const offered =
      p.fact === 'difference'
        ? options(
            { tex: `x = y + ${p.d}` },
            { tex: `y = x + ${p.d}` },
            { tex: `x + y = ${p.d}` },
            { tex: `x = ${p.d}y` },
          )
        : options(
            { tex: `z = ${p.k}y` },
            { tex: `y = ${p.k}z` },
            { tex: `z = y + ${p.k}` },
            { tex: `y = z + ${p.k}` },
          );
    return sortedChoice(
      [{ kind: 'prose', text: `${shareText(p)} ${shareLetters(p)} Which equation is the fact about ${about}?` }],
      offered,
    );
  },
  solution: (p) => {
    const { names } = SHARE_STORIES[p.story];
    return p.fact === 'difference'
      ? [
          { text: `${names[0]} has $${p.d}$ more than ${names[1]}, so to get $x$, start from $y$ and add $${p.d}$.` },
          { tex: `x = y + ${p.d}` },
          { text: `Try it with numbers: if ${names[1]} had $10$, ${names[0]} would have $${10 + p.d}$.` },
        ]
      : [
          { text: `${names[2]} has ${TIMES_WORD[p.k]} as many as ${names[1]}, so $z$ is $${p.k}$ lots of $y$.` },
          { tex: `z = ${p.k}y` },
          { text: `Try it with numbers: if ${names[1]} had $10$, ${names[2]} would have $${10 * p.k}$. Writing $y = ${p.k}z$ would give ${names[1]} the larger share.` },
        ];
  },
};

/** Three priced things bought in a batch. */
interface Basket {
  items: [string, string, string];
  unit: 'pounds' | 'pence';
  /** Price ranges, one per item. */
  prices: [[number, number], [number, number], [number, number]];
  buyer: string;
}

const BASKETS: readonly Basket[] = [
  { items: ['adult ticket', 'child ticket', 'senior ticket'], unit: 'pounds', prices: [[9, 15], [4, 8], [5, 10]], buyer: 'A family' },
  { items: ['coffee', 'tea', 'muffin'], unit: 'pounds', prices: [[3, 5], [2, 4], [2, 6]], buyer: 'An office' },
  { items: ['stamp', 'envelope', 'postcard'], unit: 'pence', prices: [[6, 14], [2, 6], [3, 9]], buyer: 'Sam' },
  { items: ['notebook', 'pen', 'folder'], unit: 'pounds', prices: [[3, 8], [1, 3], [2, 5]], buyer: 'A school' },
];

interface BasketParams {
  basket: number;
  /** How many of each item, and each item's price. */
  count: Row;
  price: Row;
  /** The order the items are listed in the story. */
  order: [number, number, number];
}

function basketTotal(p: BasketParams): number {
  return dot3(p.count, p.price);
}

function basketText(p: BasketParams): string {
  const b = BASKETS[p.basket];
  const list = p.order.map((n) => `$${p.count[n]}$ ${b.items[n]}${p.count[n] === 1 ? '' : 's'}`);
  return `${b.buyer} buys ${list[0]}, ${list[1]} and ${list[2]} for ${money(basketTotal(p), b.unit)}.`;
}

/**
 * One purchase as an equation, placed as tiles.
 *
 * The story lists the items in its own order, and the letters follow the
 * items, not the sentence — so the bank holds the coefficients in the
 * sentence's order, and the number of items where the cost should be.
 */
const triWordsTiles: Generator<BasketParams> = {
  id: 'lin-tri-words-tiles',
  choices: (p) => {
    const inWords = p.order.map((n) => p.count[n]);
    const swapped = [p.count[1], p.count[0], p.count[2]];
    const total = basketTotal(p);
    return labelChoices(
      rowEqTex(p.count, total),
      rowEqTex(inWords, total),
      rowEqTex(swapped, total),
      rowEqTex(p.count, p.count[0] + p.count[1] + p.count[2]),
    );
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const basket = rng.int(0, BASKETS.length - 1);
        return {
          basket,
          count: [0, 1, 2].map(() => rng.int(1, hard ? 6 : 4)),
          price: BASKETS[basket].prices.map(([lo, hi]) => rng.int(lo, hi)),
          order: hard ? rng.pick(PERMUTATIONS.slice(1)) : rng.pick(PERMUTATIONS),
        };
      },
      (p) => new Set(p.count).size === 3 && basketTotal(p) < 100,
      { basket: 0, count: [2, 3, 1], price: [10, 5, 7], order: [1, 0, 2] },
    );
  },
  render: (p): Slide => {
    const b = BASKETS[p.basket];
    const total = basketTotal(p);
    const inWords = p.order.map((n) => p.count[n]);
    const answer = [leadTerm(p.count[0], 'x'), signedTile(p.count[1], 'y'), signedTile(p.count[2], 'z'), `${total}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${basketText(p)} Let $x$ be the price of one ${b.items[0]}, $y$ of one ${b.items[1]} and $z$ of one ${b.items[2]}, in ${b.unit}. Write the purchase as an equation.`,
        },
      ],
      template: '{0} {1} {2} = {3}',
      bank: bankOf(answer, [
        leadTerm(inWords[0], 'x'),
        signedTile(inWords[1], 'y'),
        signedTile(inWords[2], 'z'),
        leadTerm(p.count[1], 'x'),
        signedTile(p.count[0], 'y'),
        `${p.count[0] + p.count[1] + p.count[2]}`,
      ]),
      answer,
    };
  },
  solution: (p) => {
    const b = BASKETS[p.basket];
    return [
      {
        text: `$${p.count[0]}$ ${b.items[0]}${p.count[0] === 1 ? '' : 's'} cost $${leadTerm(p.count[0], 'x')}$, and so on: each count goes with its own item's letter, whatever order the sentence uses.`,
      },
      { tex: rowEqTex(p.count, basketTotal(p)) },
    ];
  },
};

type StorySolveParams = WordsTriParams & { ask: 0 | 1 | 2 };

/**
 * A story solved to one value: three pair totals, or a share with a
 * difference and a multiple. Either way the question asks for one of the
 * three, and the slips on offer are the other two.
 */
const triWordsSolve: Generator<StorySolveParams> = {
  id: 'lin-tri-words-solve',
  choices: (p) => {
    const v = wordsValues(p);
    const [a, b] = others(p.ask);
    return numberChoices(v[p.ask], v[a], v[b], v[0] + v[1] + v[2]);
  },
  sample: (rng, difficulty) => ({
    ...(rng.chance(0.5) ? sampleSum(rng, difficulty) : sampleShare(rng, difficulty)),
    ask: rng.pick([0, 1, 2] as const),
  }),
  render: (p): Slide => {
    const letter = TRI_LETTERS[p.ask];
    const question =
      p.kind === 'sum'
        ? SUM_STORIES[p.story].ask(SUM_STORIES[p.story].names[p.ask])
        : `How many ${SHARE_STORIES[p.story].things} does ${SHARE_STORIES[p.story].names[p.ask]} get?`;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${p.kind === 'sum' ? `${sumText(p)} ${sumLetters(p)}` : `${shareText(p)} ${shareLetters(p)}`} ${question}`,
        },
      ],
      lead: `${letter} =`,
      keypad: [],
      answer: `${wordsValues(p)[p.ask]}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => (p.kind === 'sum' ? sumSolution(p, p.ask) : shareSolution(p)),
};

interface SumAllParams extends SumParams {
  /** The equation taken away at the end; the letter found is the one it lacks. */
  drop: 0 | 1 | 2;
}

/**
 * Three pair totals, finished the quick way: add all three, halve, take one
 * away. Each tap's bank holds the slip for that line — the doubling missed,
 * the halving missed, the wrong equation taken away.
 */
const triSumAllSteps: Generator<SumAllParams> = {
  id: 'lin-tri-sum-all-steps',
  sample: (rng, difficulty) => ({ ...sampleSum(rng, difficulty), drop: rng.pick([0, 1, 2] as const) }),
  render: (p): Slide => {
    const t = sumTri(p);
    const total = (p.v[0] + p.v[1] + p.v[2]) * 2;
    const half = total / 2;
    const ask = t.rows[p.drop].findIndex((v) => v === 0);
    const letter = TRI_LETTERS[ask];
    const [a, b] = others(ask);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${sumText(p)} ${sumLetters(p)} Add all three equations, halve, then take away (${p.drop + 1}) to find $${letter}$. ${HOW_TO_STEP}`,
        },
        { kind: 'display', tex: triTex(t) },
      ],
      start: ['(1) + (2) + (3)'],
      reductions: [
        {
          span: [0, 1],
          value: `2x + 2y + 2z = ${total}`,
          bank: stepBank(`2x + 2y + 2z = ${total}`, `x + y + z = ${total}`, `2x + 2y + 2z = ${half}`),
        },
        {
          span: [0, 1],
          value: `x + y + z = ${half}`,
          bank: stepBank(`x + y + z = ${half}`, `x + y + z = ${total}`, `x + y + z = ${total * 2}`),
        },
        {
          span: [0, 1],
          value: `${letter} = ${p.v[ask]}`,
          bank: stepBank(`${letter} = ${p.v[ask]}`, `${letter} = ${p.v[a]}`, `${letter} = ${p.v[b]}`, `${letter} = ${0 - p.v[ask]}`),
        },
      ],
    };
  },
  solution: (p) => {
    const ask = sumTri(p).rows[p.drop].findIndex((v) => v === 0);
    return sumSolution(p, ask);
  },
};

/* ======================================================================
 * Level 6: Inequalities in Two Variables & Regions
 *
 * Batch C1-l6. Several inequalities at once, and the region satisfying all
 * of them: two half-planes overlapping, a pictured region read back as its
 * inequalities, the corners where two boundaries meet, the whole-number
 * points inside, and regions from words. One half-plane is level 4 and
 * where two lines meet is level 2; both are pointed at, not re-taught.
 *
 * Built outward from the corners. Three whole corners are drawn in $-5$ to
 * $5$ first, and each boundary is the line through two of them, on the side
 * of the third, so every corner, gradient and intercept a learner meets is
 * whole. No boundary is vertical, since `plotSvg` draws $y$ against $x$, and
 * the dot marking a region is a whole point well inside it.
 * ==================================================================== */

type Pt = readonly [number, number];

/**
 * A triangle of whole corners and the three boundaries through them.
 *
 * Side `i` joins corner `i` to the next, and its inequality is the side of
 * that line the third corner is on, so the three together describe the
 * triangle. Two inequalities are sides 0 and 2, the two through corner 0,
 * and describe the wedge between them.
 */
interface Corners {
  form: 'slope' | 'general';
  corners: [Pt, Pt, Pt];
  /** Per side, whether its boundary is left out. */
  strict: [boolean, boolean, boolean];
  /** A whole point well inside the triangle, drawn as the dot. */
  dot: Pt;
}

const SIDES = [0, 1, 2] as const;
const WEDGE = [0, 2] as const;

const NOT_STRICT: Record<Ineq, Ineq> = { '<': '<=', '<=': '<', '>': '>=', '>=': '>' };

/** Side `i` as a half-plane: the line through two corners, on the third corner's side. */
function sideOf(p: Corners, i: number): RegionParams {
  const [x1, y1] = p.corners[i];
  const [x2, y2] = p.corners[(i + 1) % 3];
  const [tx, ty] = p.corners[(i + 2) % 3];
  const line: RegionParams = { form: p.form, m: 0, a: 0, b: 0, c: 0, op: '<', px: p.dot[0], py: p.dot[1] };
  if (p.form === 'slope') {
    line.m = (y2 - y1) / (x2 - x1) + 0;
    line.c = y1 - line.m * x1 + 0;
  } else {
    const g = gcd(Math.abs(y2 - y1), Math.abs(x2 - x1));
    const s = y2 > y1 ? 1 : -1;
    line.a = (s * (y2 - y1)) / g;
    line.b = (s * (x1 - x2)) / g + 0;
    line.c = line.a * x1 + line.b * y1 + 0;
  }
  const above = residual(line, tx, ty) > 0;
  line.op = above ? (p.strict[i] ? '>' : '>=') : p.strict[i] ? '<' : '<=';
  return line;
}

/** A boundary as a line, with `=` in place of the sign. */
function edgeTex(s: RegionParams): string {
  return s.form === 'slope' ? `y = ${regionSideTex(s)}` : `${regionSideTex(s)} = ${s.c}`;
}

/** Lines stacked one under another. */
function stackTex(lines: string[]): string {
  return `\\begin{gathered} ${lines.join(' \\\\ ')} \\end{gathered}`;
}

const passes = (s: RegionParams, x: number, y: number): boolean => holds(residual(s, x, y), s.op, 0);

const onLine = (s: RegionParams, x: number, y: number): boolean => residual(s, x, y) === 0;

function distanceTo(s: RegionParams, x: number, y: number): number {
  const norm = s.form === 'slope' ? Math.hypot(s.m, 1) : Math.hypot(s.a, s.b);
  return Math.abs(residual(s, x, y)) / norm;
}

const inAll = (sides: RegionParams[], x: number, y: number): boolean => sides.every((s) => passes(s, x, y));

/** Every whole point of the window, row by row. */
const LATTICE: readonly Pt[] = range(-6, 6).flatMap((x) => range(-6, 6).map((y) => [x, y] as const));

const twiceArea = ([a, b, c]: readonly Pt[]): number =>
  Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));

const inBox = ([x, y]: Pt): boolean => Math.abs(x) <= 5 && Math.abs(y) <= 5;

/** A turn of the corners, so no side is always the one through the first corner drawn. */
function turned(rng: Rng, corners: [Pt, Pt, Pt]): [Pt, Pt, Pt] {
  const k = rng.int(0, 2);
  return [corners[k], corners[(k + 1) % 3], corners[(k + 2) % 3]];
}

/**
 * Corners whose three sides all have whole gradients, at most `steep` either
 * way: two gradients from the first corner, then the third side kept only
 * when its gradient comes out whole too.
 */
function slopeCorners(rng: Rng, steep: number): [Pt, Pt, Pt] | undefined {
  const a: Pt = [rng.int(-5, 5), rng.int(-5, 5)];
  const [m1, m2] = rng.sample(range(-steep, steep), 2);
  const t = rng.pick(nonZeroRange(-5, 5));
  const s = rng.pick(nonZeroRange(-5, 5));
  if (t === s) return undefined;
  const b: Pt = [a[0] + t, a[1] + m1 * t];
  const c: Pt = [a[0] + s, a[1] + m2 * s];
  const m3 = (c[1] - b[1]) / (c[0] - b[0]);
  if (!Number.isInteger(m3) || Math.abs(m3) > steep || ![b, c].every(inBox)) return undefined;
  return turned(rng, [a, b, c]);
}

/** Any three corners with no side vertical or level, and small coefficients. */
function generalCorners(rng: Rng): [Pt, Pt, Pt] | undefined {
  const corners: [Pt, Pt, Pt] = [
    [rng.int(-5, 5), rng.int(-5, 5)],
    [rng.int(-5, 5), rng.int(-5, 5)],
    [rng.int(-5, 5), rng.int(-5, 5)],
  ];
  for (const i of SIDES) {
    const [x1, y1] = corners[i];
    const [x2, y2] = corners[(i + 1) % 3];
    if (x1 === x2 || y1 === y2) return undefined;
    const g = gcd(Math.abs(y2 - y1), Math.abs(x2 - x1));
    if (Math.abs(y2 - y1) / g > 5 || Math.abs(x2 - x1) / g > 5) return undefined;
  }
  return corners;
}

/** The whole point nearest the middle that sits well inside, if there is one. */
function dotFor(p: Omit<Corners, 'dot'>): Pt | undefined {
  const sides = SIDES.map((i) => sideOf({ ...p, dot: [0, 0] }, i));
  const cx = (p.corners[0][0] + p.corners[1][0] + p.corners[2][0]) / 3;
  const cy = (p.corners[0][1] + p.corners[1][1] + p.corners[2][1]) / 3;
  let best: Pt | undefined;
  let bestGap = Infinity;
  for (const [x, y] of LATTICE) {
    if (!inBox([x, y])) continue;
    if (!sides.every((s) => passes(s, x, y) && distanceTo(s, x, y) >= 0.6)) continue;
    const gap = (x - cx) ** 2 + (y - cy) ** 2;
    if (gap < bestGap) {
      best = [x, y];
      bestGap = gap;
    }
  }
  return best;
}

const SLOPE_FALLBACK: Corners = { form: 'slope', corners: [[-3, -2], [3, -2], [0, 4]], strict: [true, false, false], dot: [0, 0] };
const GENERAL_FALLBACK: Corners = { form: 'general', corners: [[-4, -1], [2, -3], [1, 4]], strict: [false, true, false], dot: [0, 0] };

/** Slope form at difficulty 1, `ax + by` at difficulty 2. */
const formFor = (difficulty: number): Corners['form'] => (difficulty > 1 ? 'general' : 'slope');

/** A triangle drawn outward from its corners, kept only if `accept` holds. */
function drawCorners(
  rng: Rng,
  form: Corners['form'],
  accept: (p: Corners) => boolean = () => true,
  steep = 3,
): Corners {
  for (let tries = 0; tries < 400; tries += 1) {
    const corners = form === 'slope' ? slopeCorners(rng, steep) : generalCorners(rng);
    if (!corners || twiceArea(corners) < 8) continue;
    const strict: [boolean, boolean, boolean] = [rng.chance(0.5), rng.chance(0.5), rng.chance(0.5)];
    const dot = dotFor({ form, corners, strict });
    if (!dot) continue;
    const p: Corners = { form, corners, strict, dot };
    if (accept(p)) return p;
  }
  return form === 'slope' ? SLOPE_FALLBACK : GENERAL_FALLBACK;
}

const sidesOf = (p: Corners, which: readonly number[] = SIDES): RegionParams[] => which.map((i) => sideOf(p, i));

/** The inequalities of the given sides, stacked. */
const systemOf = (p: Corners, which: readonly number[] = SIDES): string => stackTex(sidesOf(p, which).map((s) => regionTex(s)));

function dashWords(sides: RegionParams[]): string {
  const dashed = sides.filter((s) => isStrict(s.op)).length;
  if (dashed === 0) return 'every line solid';
  if (dashed === sides.length) return 'every line dashed';
  return `${dashed} dashed and ${sides.length - dashed} solid`;
}

/** The region's boundaries, dashed where they are left out, with the dot if wanted. */
function regionSvg(p: Corners, which: readonly number[] = SIDES, dot = true): string {
  const sides = sidesOf(p, which);
  return plotSvg({
    ...REGION_WINDOW,
    height: REGION_HEIGHT,
    grid: true,
    curves: sides.map((s) => ({ f: boundaryOf(s), dashed: isStrict(s.op) })),
    marks: dot ? [{ x: p.dot[0], y: p.dot[1] }] : [],
    label: `${sides.length} straight lines, ${dashWords(sides)}${dot ? `, with a dot at (${p.dot[0]}, ${p.dot[1]})` : ''}`,
  });
}

const regionFigure = (p: Corners, which: readonly number[] = SIDES, dot = true): Block => ({
  kind: 'diagram',
  svg: regionSvg(p, which, dot),
});

/** One inequality tried at a point, as a line of working. */
function tryAt(s: RegionParams, x: number, y: number): SolutionStep {
  const ok = passes(s, x, y);
  if (s.form === 'slope') {
    const value = s.m * x + s.c;
    return {
      text: `$${regionTex(s)}$: at $x = ${x}$ the right-hand side is $${value}$, and $${y} ${INEQ_TEX[s.op]} ${value}$ is ${ok ? 'true' : 'false'}.`,
    };
  }
  const value = s.a * x + s.b * y;
  return {
    text: `$${regionTex(s)}$: at $(${x}, ${y})$ the left-hand side is $${value}$, and $${value} ${INEQ_TEX[s.op]} ${s.c}$ is ${ok ? 'true' : 'false'}.`,
  };
}

/* ---------- Lesson 1: two at once ---------- */

type OverlapCase = 'both' | 'first' | 'second' | 'neither';

/** The whole points off both lines, by which of the two inequalities they pass. */
function byCase(p: Corners): Record<OverlapCase, Pt[]> {
  const [first, second] = sidesOf(p, WEDGE);
  const out: Record<OverlapCase, Pt[]> = { both: [], first: [], second: [], neither: [] };
  for (const [x, y] of LATTICE) {
    if (!inBox([x, y]) || onLine(first, x, y) || onLine(second, x, y)) continue;
    const one = passes(first, x, y);
    const two = passes(second, x, y);
    out[one && two ? 'both' : one ? 'first' : two ? 'second' : 'neither'].push([x, y]);
  }
  return out;
}

interface OverlapParams extends Corners {
  point: Pt;
}

const OVERLAP_CASES: readonly OverlapCase[] = ['both', 'both', 'first', 'second', 'neither'];

function sampleOverlap(rng: Rng, difficulty: number, cases: readonly OverlapCase[] = OVERLAP_CASES): OverlapParams {
  const p = drawCorners(rng, formFor(difficulty));
  const found = byCase(p);
  const want = rng.pick(cases);
  const pool = found[want].length > 0 ? found[want] : found.both;
  return { ...p, point: rng.pick(pool) };
}

function overlapWorking(p: OverlapParams): SolutionStep[] {
  const [first, second] = sidesOf(p, WEDGE);
  const [x, y] = p.point;
  const one = passes(first, x, y);
  const two = passes(second, x, y);
  return [
    tryAt(first, x, y),
    tryAt(second, x, y),
    {
      text:
        one && two
          ? `It passes both, so $${pointTex(x, y)}$ is in the region.`
          : `It fails ${one || two ? 'one' : 'both'}, so $${pointTex(x, y)}$ is not in the region: a point has to pass every inequality.`,
    },
  ];
}

const OVERLAP_YES = 'Yes';
const OVERLAP_NO = 'No';

/**
 * Is the point in both? Two tests, and the second is only worth doing if the
 * first passes. Difficulty 2 is the form `ax + by`.
 */
const overlapFlow: Generator<OverlapParams> = {
  id: 'lin-overlap-flow',
  sample: (rng, difficulty) => sampleOverlap(rng, difficulty),
  render: (p): Slide => {
    const [first, second] = sidesOf(p, WEDGE);
    const [x, y] = p.point;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Is $${pointTex(x, y)}$ in the region where both inequalities hold?` }],
      subject: systemOf(p, WEDGE),
      steps: [
        {
          id: 'first',
          ask: `Put $${pointTex(x, y)}$ into the first inequality. Is it true?`,
          branches: [
            { label: OVERLAP_YES, to: 'second' },
            { label: OVERLAP_NO, outcome: 'Then the point is not in the region: it has to pass both.' },
          ],
        },
        {
          id: 'second',
          ask: 'Now the second. Is that true as well?',
          branches: [
            { label: OVERLAP_YES, outcome: 'It passes both, so the point is in the region.' },
            { label: OVERLAP_NO, outcome: 'It fails one, so the point is not in the region.' },
          ],
        },
      ],
      answer: passes(first, x, y) ? [OVERLAP_YES, passes(second, x, y) ? OVERLAP_YES : OVERLAP_NO] : [OVERLAP_NO],
    };
  },
  solution: overlapWorking,
};

interface OverlapWhichParams extends Corners {
  /** The point in both first, then three that are not. */
  points: [Pt, Pt, Pt, Pt];
}

/** A point on a dashed boundary that passes the other: left out, and easy to take for in. */
function onDashed(p: Corners): Pt[] {
  const [first, second] = sidesOf(p, WEDGE);
  return LATTICE.filter(
    ([x, y]) =>
      inBox([x, y]) &&
      ((isStrict(first.op) && onLine(first, x, y) && passes(second, x, y) && !onLine(second, x, y)) ||
        (isStrict(second.op) && onLine(second, x, y) && passes(first, x, y) && !onLine(first, x, y))),
  );
}

/**
 * Which of four points is in both regions? One passes both; the others pass
 * only the first, only the second, or neither. At difficulty 2 one of the
 * wrong ones sits on a dashed boundary where it can.
 */
const overlapWhich: Generator<OverlapWhichParams> = {
  id: 'lin-overlap-which',
  sample: (rng, difficulty) => {
    const p = drawCorners(rng, formFor(difficulty), (q) => {
      const found = byCase(q);
      return found.both.length > 0 && found.first.length > 0 && found.second.length > 0 && found.neither.length > 0;
    });
    const found = byCase(p);
    const edge = difficulty > 1 ? onDashed(p) : [];
    const wrong = [
      edge.length > 0 ? rng.pick(edge) : rng.pick(found.first.length > 0 ? found.first : found.neither),
      rng.pick(found.second.length > 0 ? found.second : found.neither),
      rng.pick(found.neither.length > 0 ? found.neither : found.first),
    ];
    const right = rng.pick(found.both);
    const seen = new Set([pointTex(...right)]);
    const points: Pt[] = [right];
    for (const q of [...wrong, ...found.neither, ...found.first, ...found.second]) {
      if (points.length === 4) break;
      if (seen.has(pointTex(...q))) continue;
      seen.add(pointTex(...q));
      points.push(q);
    }
    return { ...p, points: points as [Pt, Pt, Pt, Pt] };
  },
  render: (p): Slide =>
    sortedChoice(
      [
        { kind: 'prose', text: 'Which point is in the region where **both** inequalities hold?' },
        { kind: 'display', tex: systemOf(p, WEDGE) },
      ],
      labelChoices(pointTex(...p.points[0]), ...p.points.slice(1).map((q) => pointTex(...q))),
    ),
  solution: (p) => {
    const [first, second] = sidesOf(p, WEDGE);
    const [x, y] = p.points[0];
    return [
      tryAt(first, x, y),
      tryAt(second, x, y),
      { text: `$${pointTex(x, y)}$ passes both. Each of the others fails at least one, and failing one is enough to be left out.` },
    ];
  },
};

/**
 * Both inequalities worked out at a point, side by side. In the slope form it
 * is each right-hand side at the point's $x$: the $x$ term, then the whole
 * side. In the form `ax + by` it is each left-hand side: two terms, then the
 * total.
 */
const overlapTree: Generator<OverlapParams> = {
  id: 'lin-overlap-tree',
  sample: (rng, difficulty) =>
    drawUntil(
      () => sampleOverlap(rng, difficulty),
      (p) => sidesOf(p, WEDGE).every((s) => (s.form === 'slope' ? s.m !== 0 && s.c !== 0 : true)),
      { ...SLOPE_FALLBACK, point: [1, 1] },
    ),
  render: (p): Slide => {
    const [first, second] = sidesOf(p, WEDGE);
    const [x, y] = p.point;
    const slope = p.form === 'slope';
    const nodes = slope
      ? [
          { id: 'mx1', from: [] },
          { id: 'mx2', from: [] },
          { id: 'side1', from: ['mx1'] },
          { id: 'side2', from: ['mx2'] },
        ]
      : [
          { id: 'ax1', from: [] },
          { id: 'by1', from: [] },
          { id: 'ax2', from: [] },
          { id: 'by2', from: [] },
          { id: 'side1', from: ['ax1', 'by1'] },
          { id: 'side2', from: ['ax2', 'by2'] },
        ];
    const values = slope
      ? [first.m * x, second.m * x, first.m * x + first.c, second.m * x + second.c]
      : [first.a * x, first.b * y, second.a * x, second.b * y, first.a * x + first.b * y, second.a * x + second.b * y];
    const answer = values.map((v) => `${v + 0}`);
    const last = values[values.length - 1];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: slope
            ? `Is $${pointTex(x, y)}$ in the region? Work out the right-hand side of each inequality at $x = ${x}$: the $x$ term, then the whole side.`
            : `Is $${pointTex(x, y)}$ in the region? Work out the left-hand side of each inequality there: each term, sign included, then the total.`,
        },
        { kind: 'display', tex: systemOf(p, WEDGE) },
      ],
      expression: `${regionSideTex(first)} \\quad \\text{and} \\quad ${regionSideTex(second)}`,
      nodes,
      bank: treeBank(answer, [...values.map((v) => -v), slope ? first.c : first.c, slope ? second.c : second.c], last),
      answer,
    };
  },
  solution: overlapWorking,
};

/**
 * The side that decides. The point passes the first inequality, so the
 * second settles it: its value at the point, typed.
 */
const overlapSide: Generator<OverlapParams> = {
  id: 'lin-overlap-side',
  sample: (rng, difficulty) =>
    drawUntil(
      () => sampleOverlap(rng, difficulty, ['both', 'first']),
      (p) => passes(sideOf(p, 0), ...p.point) && (p.form === 'general' || sideOf(p, 2).m !== 0),
      { ...SLOPE_FALLBACK, point: [0, 0] },
    ),
  render: (p): Slide => {
    const second = sideOf(p, 2);
    const [x, y] = p.point;
    const slope = p.form === 'slope';
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: slope
            ? `$${pointTex(x, y)}$ passes the first inequality, so the second decides. Work out its right-hand side at $x = ${x}$.`
            : `$${pointTex(x, y)}$ passes the first inequality, so the second decides. Work out its left-hand side at the point.`,
        },
        { kind: 'display', tex: systemOf(p, WEDGE) },
      ],
      lead: `${regionSideTex(second)} =`,
      keypad: [],
      answer: `${slope ? second.m * x + second.c : second.a * x + second.b * y}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const second = sideOf(p, 2);
    const [x, y] = p.point;
    return [
      tryAt(second, x, y),
      {
        text: passes(second, x, y)
          ? `So it passes both, and $${pointTex(x, y)}$ is in the region.`
          : `So it fails the second, and $${pointTex(x, y)}$ is not in the region.`,
      },
    ];
  },
};

/* ---------- Lesson 2: reading a region ---------- */

const SIGN_TILES = ['<', '\\le', '>', '\\ge'];

/**
 * A pictured region, its three boundaries given: choose each sign. Dashed or
 * solid decides strictness and the dot decides the side. Difficulty 2 is the
 * form `ax + by`, where "above" is no longer always "greater".
 */
const readSigns: Generator<Corners> = {
  id: 'lin-read-signs',
  sample: (rng, difficulty) => drawCorners(rng, formFor(difficulty)),
  render: (p): Slide => {
    const sides = sidesOf(p);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'The region is inside all three lines, with the dot in it. A dashed line is left out and a solid one included. Choose each sign.',
        },
        regionFigure(p),
      ],
      template: sides
        .map((s, n) => (s.form === 'slope' ? `y {${n}} ${regionSideTex(s)}` : `${regionSideTex(s)} {${n}} ${s.c}`))
        .join(', \\quad '),
      bank: bankOf(
        sides.map((s) => INEQ_TEX[s.op]),
        SIGN_TILES,
      ),
      answer: sides.map((s) => INEQ_TEX[s.op]),
    };
  },
  solution: (p) => [
    ...sidesOf(p).map((s) => ({
      text: `$${edgeTex(s)}$ is ${isStrict(s.op) ? 'dashed, so strict' : 'solid, so "or equal to"'}. ${
        s.form === 'slope'
          ? `The dot is ${residual(s, ...p.dot) > 0 ? 'above' : 'below'} it, so $y$ is ${residual(s, ...p.dot) > 0 ? 'greater' : 'less'}: $${regionTex(s)}$.`
          : `At the dot $${regionSideTex(s)} = ${s.a * p.dot[0] + s.b * p.dot[1]}$, ${residual(s, ...p.dot) > 0 ? 'more' : 'less'} than $${s.c}$: $${regionTex(s)}$.`
      }`,
    })),
  ],
};

interface ReadSystemParams extends Corners {
  /** The three wrong systems, as the signs of the two sides. */
  wrong: [Ineq, Ineq][];
}

/**
 * Which pair of inequalities is the pictured wedge? The wrong options turn a
 * sign round, lose or add "or equal to", or turn both.
 */
const readSystem: Generator<ReadSystemParams> = {
  id: 'lin-read-system',
  sample: (rng, difficulty) => {
    const p = drawCorners(rng, formFor(difficulty));
    const [a, b] = sidesOf(p, WEDGE).map((s) => s.op);
    const candidates: [Ineq, Ineq][] = [
      [TURNED[a], b],
      [a, TURNED[b]],
      [NOT_STRICT[a], b],
      [a, NOT_STRICT[b]],
      [TURNED[a], TURNED[b]],
    ];
    return { ...p, wrong: rng.sample(candidates, 3) };
  },
  render: (p): Slide => {
    const [first, second] = sidesOf(p, WEDGE);
    const pair = ([a, b]: [Ineq, Ineq]) => stackTex([regionTex(first, a), regionTex(second, b)]);
    return sortedChoice(
      [
        { kind: 'prose', text: 'The region is between the two lines, on the side with the dot. Which pair of inequalities is it?' },
        regionFigure(p, WEDGE),
      ],
      labelChoices(pair([first.op, second.op]), ...p.wrong.map(pair)),
    );
  },
  solution: (p) =>
    sidesOf(p, WEDGE).map((s) => ({
      text: `$${edgeTex(s)}$ is ${isStrict(s.op) ? 'dashed' : 'solid'}, and the dot $${pointTex(...p.dot)}$ makes $${regionTex(s)}$ true.`,
    })),
};

interface ReadFlowParams extends Corners {
  side: 0 | 1 | 2;
}

const READ_SOLID = 'Solid';
const READ_DASHED = 'Dashed';
const READ_ABOVE = 'Above';
const READ_BELOW = 'Below';
const READ_MORE = 'More';
const READ_LESS = 'Less';

/**
 * One boundary of a pictured region, read into its inequality in two
 * decisions: solid or dashed, then which side. At difficulty 1 the side is
 * above or below; at difficulty 2, in the form `ax + by`, it is whether the
 * dot makes the left-hand side more or less than the right.
 */
const readFlow: Generator<ReadFlowParams> = {
  id: 'lin-read-flow',
  sample: (rng, difficulty) => ({ ...drawCorners(rng, formFor(difficulty)), side: rng.pick([0, 1, 2] as const) }),
  render: (p): Slide => {
    const s = sideOf(p, p.side);
    const up = residual(s, ...p.dot) > 0;
    const slope = p.form === 'slope';
    return {
      kind: 'flow',
      prompt: [
        { kind: 'prose', text: 'The region is inside the three lines, with the dot in it. Which inequality does this boundary give?' },
        regionFigure(p),
      ],
      subject: edgeTex(s),
      steps: [
        {
          id: 'line',
          ask: 'On the picture, is this boundary solid or dashed?',
          branches: [
            { label: READ_SOLID, to: 'side' },
            { label: READ_DASHED, to: 'side' },
          ],
        },
        slope
          ? {
              id: 'side',
              ask: 'Is the dot above this line or below it?',
              branches: [
                { label: READ_ABOVE, outcome: 'Above the line, $y$ is more than the line: the sign is $>$ or $\\ge$.' },
                { label: READ_BELOW, outcome: 'Below the line, $y$ is less than the line: the sign is $<$ or $\\le$.' },
              ],
            }
          : {
              id: 'side',
              ask: `The dot is at $${pointTex(...p.dot)}$. Is $${regionSideTex(s)}$ there more or less than $${s.c}$?`,
              branches: [
                { label: READ_MORE, outcome: 'The sign is $>$ or $\\ge$.' },
                { label: READ_LESS, outcome: 'The sign is $<$ or $\\le$.' },
              ],
            },
      ],
      answer: [isStrict(s.op) ? READ_DASHED : READ_SOLID, slope ? (up ? READ_ABOVE : READ_BELOW) : up ? READ_MORE : READ_LESS],
    };
  },
  solution: (p) => {
    const s = sideOf(p, p.side);
    return [
      { text: `The line is ${isStrict(s.op) ? 'dashed, so the sign is strict' : 'solid, so the sign has "or equal to"'}.` },
      tryAt(s, ...p.dot),
      { text: `So the boundary gives $${regionTex(s)}$.` },
    ];
  },
};


interface ReadLineParams extends Corners {
  side: 0 | 1 | 2;
  ask: 'c' | 'm';
}

/**
 * Reading a boundary off the grid. Difficulty 1 gives the gradient and asks
 * where the line crosses the $y$-axis; difficulty 2 gives the crossing and
 * asks the gradient, rise over run between the two corners on it.
 */
const readLine: Generator<ReadLineParams> = {
  id: 'lin-read-line',
  sample: (rng, difficulty) => {
    const ask = difficulty > 1 ? 'm' : 'c';
    // On the grid, and the only boundary crossing there, so the prompt names one line.
    const usable = (q: Corners, i: number): boolean => {
      const s = sideOf(q, i);
      return Math.abs(s.c) <= 5 && sidesOf(q).filter((t) => t.c === s.c).length === 1 && (ask === 'c' || s.m !== 0);
    };
    const p = drawCorners(rng, 'slope', (q) => SIDES.some((i) => usable(q, i)));
    const open = SIDES.filter((i) => usable(p, i));
    return { ...p, side: open.length > 0 ? rng.pick(open) : 0, ask };
  },
  render: (p): Slide => {
    const s = sideOf(p, p.side);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text:
            p.ask === 'c'
              ? `The boundary with gradient $${s.m}$ is $y = ${s.m === 0 ? 'c' : `${termTex(s.m, 1)} + c`}$. Read $c$ off the grid: where does it cross the $y$-axis?`
              : `The boundary crossing the $y$-axis at $${s.c}$ is $y = mx${s.c === 0 ? '' : ` ${signedTile(s.c)}`}$. Read its gradient $m$ off the grid, as rise over run.`,
        },
        regionFigure(p),
      ],
      lead: `${p.ask} =`,
      keypad: [],
      answer: `${p.ask === 'm' ? s.m : s.c}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const s = sideOf(p, p.side);
    const ends = [p.corners[p.side], p.corners[(p.side + 1) % 3]].sort((u, v) => u[0] - v[0]);
    const rise = ends[1][1] - ends[0][1];
    const run = ends[1][0] - ends[0][0];
    return [
      p.ask === 'c'
        ? { text: `It crosses the $y$-axis at $(0, ${s.c})$, so $c = ${s.c}$.` }
        : {
            text: `From the corner $${pointTex(...ends[0])}$ to $${pointTex(...ends[1])}$ it goes $${run}$ across and ${rise < 0 ? `$${-rise}$ down` : `$${rise}$ up`}. So $m = ${rise} \\div ${run} = ${s.m}$.`,
          },
      { text: `The boundary is $${edgeTex(s)}$, and the region is $${regionTex(s)}$.` },
    ];
  },
};

/* ---------- Lesson 3: corners ---------- */

interface CornerParams extends Corners {
  /** The corner asked about: where side `corner` meets side `corner + 2`. */
  corner: 0 | 1 | 2;
}

/** The two boundaries through a corner. */
const meeting = (p: CornerParams): [RegionParams, RegionParams] => [sideOf(p, p.corner), sideOf(p, (p.corner + 2) % 3)];

const cornerOf = (p: CornerParams): Pt => p.corners[p.corner];

/** A corner satisfying `ok`, drawn with its triangle. */
function sampleCorner(
  rng: Rng,
  form: Corners['form'],
  ok: (p: CornerParams) => boolean = () => true,
  steep = 3,
): CornerParams {
  const valid = (q: Corners) => SIDES.filter((corner) => ok({ ...q, corner }));
  const p = drawCorners(rng, form, (q) => valid(q).length > 0, steep);
  const open = valid(p);
  return { ...p, corner: open.length > 0 ? rng.pick(open) : 0 };
}

interface CornerStepsParams extends CornerParams {
  /** Write the second boundary on the left. */
  swap: boolean;
}

/** The two boundaries in the order the line of working uses them. */
function stepsPair(p: CornerStepsParams): [RegionParams, RegionParams] {
  const [one, two] = meeting(p);
  return p.swap ? [two, one] : [one, two];
}

/**
 * Where two boundaries meet, as a line of working: the two $y$ values set
 * equal, the $x$ terms collected, the number taken across, the coefficient
 * divided out. Difficulty 1 collects on the side with more $x$, as in level
 * 1; difficulty 2 has steeper lines and sometimes a negative to divide by.
 */
const cornerSteps: Generator<CornerStepsParams> = {
  id: 'lin-corner-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const p = sampleCorner(
      rng,
      'slope',
      (q) => {
        const [one, two] = meeting(q);
        return Math.abs(one.m - two.m) >= 2 && one.c !== 0 && two.c !== 0;
      },
      hard ? 4 : 3,
    );
    const [one, two] = meeting(p);
    return { ...p, swap: hard ? rng.chance(0.5) : one.m < two.m };
  },
  render: (p): Slide => {
    const [left, right] = stepsPair(p);
    const d = left.m - right.m;
    const x = cornerOf(p)[0];
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [];
    // The first move spans the whole opening line; every later one, the single token left.
    const next = (): [number, number] => (reductions.length === 0 ? [0, 3] : [0, 1]);
    // A level line has no x term to collect, so it starts by taking the number across.
    if (right.m !== 0) {
      reductions.push({
        span: next(),
        value: `${linTex(d, left.c)} = ${right.c}`,
        bank: stepBank(
          `${linTex(d, left.c)} = ${right.c}`,
          `${linTex(left.m + right.m, left.c)} = ${right.c}`,
          `${linTex(-d, left.c)} = ${right.c}`,
          `${linTex(d, -left.c)} = ${right.c}`,
        ),
      });
    }
    reductions.push({
      span: next(),
      value: `${termTex(d, 1)} = ${right.c - left.c}`,
      bank: stepBank(
        `${termTex(d, 1)} = ${right.c - left.c}`,
        `${termTex(d, 1)} = ${right.c + left.c}`,
        `${termTex(d, 1)} = ${left.c - right.c}`,
        `${termTex(d, 1)} = ${right.c}`,
      ),
    });
    reductions.push({
      span: next(),
      value: `x = ${x}`,
      bank: stepBank(`x = ${x}`, `x = ${0 - x}`, `x = ${right.c - left.c - d}`, `x = ${(right.c - left.c) * d}`, `x = ${x + 1}`),
    });
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Find the $x$-coordinate of the corner where $${edgeTex(left)}$ meets $${edgeTex(right)}$. There the two $y$ values are equal. ${HOW_TO_STEP}`,
        },
      ],
      start: [linTex(left.m, left.c), '=', linTex(right.m, right.c)],
      reductions,
    };
  },
  solution: (p) => {
    const [left, right] = stepsPair(p);
    const d = left.m - right.m;
    const [x, y] = cornerOf(p);
    return [
      { tex: `${linTex(left.m, left.c)} = ${linTex(right.m, right.c)}` },
      {
        text: `${right.m === 0 ? '' : `Take $${termTex(right.m, 1)}$ from both sides, then`} ${right.m === 0 ? 'Take' : 'take'} $${left.c}$ from both sides.`.trim(),
        tex: `${termTex(d, 1)} = ${right.c - left.c}`,
      },
      { tex: `x = ${x}` },
      { text: `Either line then gives $y = ${y}$, so the corner is $${pointTex(x, y)}$.` },
    ];
  },
};

interface CornerValueParams extends CornerParams {
  ask: 'x' | 'y';
}

/**
 * One coordinate of a corner, typed. Difficulty 1 is two lines in the slope
 * form and asks $y$, once $x$ is found; difficulty 2 is the form `ax + by`,
 * solved as a pair by elimination, and asks either.
 */
const cornerValue: Generator<CornerValueParams> = {
  id: 'lin-corner-value',
  sample: (rng, difficulty) => {
    const p = sampleCorner(rng, formFor(difficulty));
    return { ...p, ask: difficulty > 1 ? rng.pick(['x', 'y'] as const) : 'y' };
  },
  render: (p): Slide => {
    const [one, two] = meeting(p);
    const [x, y] = cornerOf(p);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `Two boundaries of a region meet at one of its corners. What is the corner's $${p.ask}$-coordinate?` },
        { kind: 'display', tex: stackTex([edgeTex(one), edgeTex(two)]) },
      ],
      lead: `${p.ask} =`,
      keypad: [],
      answer: `${p.ask === 'x' ? x : y}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const [one, two] = meeting(p);
    const [x, y] = cornerOf(p);
    if (p.form === 'slope') {
      return [
        { text: 'Where they meet, the two $y$ values are equal.', tex: `${linTex(one.m, one.c)} = ${linTex(two.m, two.c)}` },
        { tex: `${termTex(one.m - two.m, 1)} = ${two.c - one.c}` },
        { tex: `x = ${x}` },
        { text: `Put it back into either line: $y = ${timesTex(one.m, x)} ${signedTile(one.c)} = ${y}$.` },
      ];
    }
    return [
      { text: 'Solve the two together, as in Simultaneous Linear Equations: scale one so a letter matches, then add or subtract.' },
      { tex: `x = ${x}, \\quad y = ${y}` },
      {
        text: `Check both: $${timesTex(one.a, x)} ${one.b < 0 ? '-' : '+'} ${timesTex(Math.abs(one.b), y)} = ${one.c}$ and $${timesTex(two.a, x)} ${two.b < 0 ? '-' : '+'} ${timesTex(Math.abs(two.b), y)} = ${two.c}$.`,
      },
    ];
  },
};

/**
 * The corner on the picture: slide to its $x$-coordinate. The corner is
 * named by the two boundaries through it, so finding the right two lines is
 * the question. Difficulty 2 names them in the form `ax + by`.
 */
const cornerSlider: Generator<CornerParams> = {
  id: 'lin-corner-slider',
  sample: (rng, difficulty) => sampleCorner(rng, formFor(difficulty)),
  render: (p): Slide => {
    const [one, two] = meeting(p);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `This region has three corners. Slide to the $x$-coordinate of the one where $${edgeTex(one)}$ meets $${edgeTex(two)}$.`,
        },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: cornerOf(p)[0],
      readout: 'x = {v}',
      figure: { svg: regionSvg(p), ...markerWindow(-6, 6) },
    };
  },
  solution: (p) => {
    const [one, two] = meeting(p);
    const [x, y] = cornerOf(p);
    return [
      { text: `The two lines cross at $${pointTex(x, y)}$, so $x = ${x}$.` },
      { text: `Check it is on both: ${[one, two].map((s) => `$${edgeTex(s)}$`).join(' and ')} each hold at $${pointTex(x, y)}$.` },
    ];
  },
};

interface CornerCheckParams extends CornerParams {
  /** The real corner, or another point on the first line only. */
  real: boolean;
}

/** The point a corner check is made at. */
function checkPoint(p: CornerCheckParams): Pt {
  const [x, y] = cornerOf(p);
  if (p.real) return [x, y];
  const [one] = meeting(p);
  const [dx, dy] = one.form === 'slope' ? [1, one.m] : [one.b, -one.a];
  const along: Pt = inBox([x + dx, y + dy]) ? [x + dx, y + dy] : [x - dx, y - dy];
  return along;
}

/**
 * A corner checked on both boundaries. Difficulty 1 has $x$ found and works
 * out $y$ from each line, which must agree. Difficulty 2, in the form
 * `ax + by`, works out each left-hand side at a point offered as the corner;
 * half the time the point is only on the first line, so the check matters.
 */
const cornerCheckTree: Generator<CornerCheckParams> = {
  id: 'lin-corner-check-tree',
  sample: (rng, difficulty) => {
    const p = sampleCorner(rng, formFor(difficulty), (q) => meeting(q).every((s) => s.form === 'general' || s.m !== 0));
    return { ...p, real: difficulty > 1 ? rng.chance(0.5) : true };
  },
  render: (p): Slide => {
    const [one, two] = meeting(p);
    const [x, y] = checkPoint(p);
    const slope = p.form === 'slope';
    const values = slope
      ? [one.m * x, two.m * x, one.m * x + one.c, two.m * x + two.c]
      : [one.a * x, one.b * y, two.a * x, two.b * y, one.a * x + one.b * y, two.a * x + two.b * y];
    const answer = values.map((v) => `${v + 0}`);
    return {
      kind: 'tree',
      prompt: slope
        ? [
            {
              kind: 'prose',
              text: `Solving gave $x = ${x}$ at the corner where $${edgeTex(one)}$ meets $${edgeTex(two)}$. Find $y$ from each line: the $x$ term, then the whole side. Both should give the same $y$.`,
            },
          ]
        : [
            {
              kind: 'prose',
              text: `Is $${pointTex(x, y)}$ the corner where these two boundaries meet? Work out each left-hand side there: each term, sign included, then the total.`,
            },
            { kind: 'display', tex: stackTex([edgeTex(one), edgeTex(two)]) },
          ],
      expression: `${regionSideTex(one)} \\quad \\text{and} \\quad ${regionSideTex(two)}`,
      nodes: slope
        ? [
            { id: 'mx1', from: [] },
            { id: 'mx2', from: [] },
            { id: 'side1', from: ['mx1'] },
            { id: 'side2', from: ['mx2'] },
          ]
        : [
            { id: 'ax1', from: [] },
            { id: 'by1', from: [] },
            { id: 'ax2', from: [] },
            { id: 'by2', from: [] },
            { id: 'side1', from: ['ax1', 'by1'] },
            { id: 'side2', from: ['ax2', 'by2'] },
          ],
      bank: treeBank(answer, [...values.map((v) => -v), one.c, two.c], values[values.length - 1]),
      answer,
    };
  },
  solution: (p) => {
    const [one, two] = meeting(p);
    const [x, y] = checkPoint(p);
    if (p.form === 'slope') {
      return [
        { tex: `${timesTex(one.m, x)} ${signedTile(one.c)} = ${one.m * x + one.c}` },
        { tex: `${timesTex(two.m, x)} ${signedTile(two.c)} = ${two.m * x + two.c}` },
        { text: `Both give $y = ${y}$, so the corner is $${pointTex(x, y)}$.` },
      ];
    }
    const first = one.a * x + one.b * y;
    const second = two.a * x + two.b * y;
    return [
      { text: `$${regionSideTex(one)} = ${first}$, ${first === one.c ? 'which is what the line needs' : `but the line needs $${one.c}$`}.` },
      { text: `$${regionSideTex(two)} = ${second}$, ${second === two.c ? 'which is what the line needs' : `but the line needs $${two.c}$`}.` },
      {
        text: p.real
          ? `It is on both lines, so it is the corner.`
          : `It is on the first line but not the second, so it is not the corner.`,
      },
    ];
  },
};

/* ---------- Lesson 4: whole-number points ---------- */

/** Every whole point in the region, boundaries counted by their signs. */
const latticeIn = (p: Corners): Pt[] => LATTICE.filter(([x, y]) => inAll(sidesOf(p), x, y));

/** A small triangle, so the points can be counted by hand. */
const countable = (low: number, high: number) => (p: Corners): boolean => {
  const n = latticeIn(p).length;
  return twiceArea(p.corners) <= 30 && n >= low && n <= high;
};

/** Column by column, the whole $y$ values in the region. */
function columns(p: Corners): { x: number; ys: number[] }[] {
  const points = latticeIn(p);
  return [...new Set(points.map(([x]) => x))]
    .sort((u, v) => u - v)
    .map((x) => ({ x, ys: points.filter((q) => q[0] === x).map((q) => q[1]).sort((u, v) => u - v) }));
}

const ON_OFF = 'A point on a solid line counts; one on a dashed line does not.';

/**
 * How many whole points are in the region? Counted column by column, and
 * every corner is a whole point on two boundaries, so the signs decide
 * whether the corners count. Difficulty 2 is the form `ax + by`.
 */
const latticeCount: Generator<Corners> = {
  id: 'lin-lattice-count',
  sample: (rng, difficulty) => drawCorners(rng, formFor(difficulty), countable(3, 14)),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `How many points with whole-number coordinates are in this region? Call it $n$. ${ON_OFF}` },
      regionFigure(p, SIDES, false),
      { kind: 'display', tex: systemOf(p) },
    ],
    lead: 'n =',
    keypad: [],
    answer: `${latticeIn(p).length}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => [
    { text: 'Go column by column, keeping each point that passes all three inequalities.' },
    ...columns(p).map(({ x, ys }) => ({ text: `$x = ${x}$: $y = ${ys.join(', ')}$, so $${ys.length}$.` })),
    { text: `That is $${latticeIn(p).length}$ points in all.` },
  ],
};

interface LatticeWhichParams extends Corners {
  /** The point inside first, then three that are not. */
  points: [Pt, Pt, Pt, Pt];
}

/** Points left out but close: on a dashed side, or one step outside. */
function nearMisses(p: Corners): { edge: Pt[]; near: Pt[] } {
  const sides = sidesOf(p);
  const edge: Pt[] = [];
  const near: Pt[] = [];
  for (const [x, y] of LATTICE) {
    if (!inBox([x, y]) || inAll(sides, x, y)) continue;
    const failed = sides.filter((s) => !passes(s, x, y));
    if (failed.every((s) => isStrict(s.op) && onLine(s, x, y))) edge.push([x, y]);
    else if (failed.every((s) => distanceTo(s, x, y) <= 1.5)) near.push([x, y]);
  }
  return { edge, near };
}

/**
 * Which point is in the region? The wrong ones are close: on a dashed side
 * where there is one, otherwise just outside a boundary.
 */
const latticeWhich: Generator<LatticeWhichParams> = {
  id: 'lin-lattice-which',
  sample: (rng, difficulty) => {
    const p = drawCorners(rng, formFor(difficulty), (q) => {
      const { edge, near } = nearMisses(q);
      return countable(2, 14)(q) && edge.length + near.length >= 3;
    });
    const { edge, near } = nearMisses(p);
    const inside = latticeIn(p);
    const right = inside.length > 0 ? rng.pick(inside) : p.dot;
    const wrong = [...(edge.length > 0 ? [rng.pick(edge)] : []), ...rng.shuffle(near), ...edge];
    const seen = new Set([pointTex(...right)]);
    const points: Pt[] = [right];
    for (const q of wrong) {
      if (points.length === 4) break;
      if (seen.has(pointTex(...q))) continue;
      seen.add(pointTex(...q));
      points.push(q);
    }
    for (const q of LATTICE) {
      if (points.length === 4) break;
      if (seen.has(pointTex(...q)) || inAll(sidesOf(p), ...q)) continue;
      seen.add(pointTex(...q));
      points.push(q);
    }
    return { ...p, points: points as [Pt, Pt, Pt, Pt] };
  },
  render: (p): Slide =>
    sortedChoice(
      [
        { kind: 'prose', text: `Which point is in the region? ${ON_OFF}` },
        regionFigure(p, SIDES, false),
        { kind: 'display', tex: systemOf(p) },
      ],
      labelChoices(pointTex(...p.points[0]), ...p.points.slice(1).map((q) => pointTex(...q))),
    ),
  solution: (p) => {
    const sides = sidesOf(p);
    const [x, y] = p.points[0];
    return [
      ...sides.map((s) => tryAt(s, x, y)),
      { text: `$${pointTex(x, y)}$ passes all three. Each of the others fails one, even if only by lying on a dashed line.` },
    ];
  },
};

interface LatticeColumnParams extends Corners {
  column: number;
}

/**
 * One column of the count: the whole $y$ values at one $x$, smallest first.
 * The bank has the values just past each end, which a dashed boundary or a
 * misread line would let in.
 */
const latticeColumn: Generator<LatticeColumnParams> = {
  id: 'lin-lattice-column',
  sample: (rng, difficulty) => {
    const fits = (q: Corners) => columns(q).filter(({ ys }) => ys.length >= 2 && ys.length <= 5);
    const p = drawCorners(rng, formFor(difficulty), (q) => countable(3, 16)(q) && fits(q).length > 0);
    const open = fits(p);
    return { ...p, column: open.length > 0 ? rng.pick(open).x : columns(p)[0]?.x ?? 0 };
  },
  render: (p): Slide => {
    const ys = columns(p).find(({ x }) => x === p.column)?.ys ?? [];
    const answer = ys.map(numberTile);
    const lo = ys[0];
    const hi = ys[ys.length - 1];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Which whole numbers $y$ put $(${p.column}, y)$ in the region? Smallest first. ${ON_OFF}` },
        regionFigure(p, SIDES, false),
        { kind: 'display', tex: systemOf(p) },
      ],
      template: `y = ${ys.map((_, n) => `{${n}}`).join(', \\; ')}`,
      bank: bankOf(answer, [lo - 1, lo - 2, hi + 1, hi + 2].map(numberTile)),
      answer,
    };
  },
  solution: (p) => {
    const ys = columns(p).find(({ x }) => x === p.column)?.ys ?? [];
    const sides = sidesOf(p);
    const below = ys[0] - 1;
    const above = ys[ys.length - 1] + 1;
    const fail = (y: number) => sides.find((s) => !passes(s, p.column, y));
    const out = [below, above].flatMap((y) => {
      const s = fail(y);
      return s ? [tryAt(s, p.column, y)] : [];
    });
    return [
      { text: `At $x = ${p.column}$ the whole numbers passing all three are $y = ${ys.join(', ')}$.` },
      ...out,
      { text: `So $(${p.column}, ${below})$ and $(${p.column}, ${above})$ are left out.` },
    ];
  },
};

type LatticeCase = 'inside' | 'outside' | 'dashed' | 'solid' | 'solid-out';

/** Whole points by how the count treats them, corners left out since they sit on two lines. */
function latticeCases(p: Corners): Record<LatticeCase, Pt[]> {
  const sides = sidesOf(p);
  const out: Record<LatticeCase, Pt[]> = { inside: [], outside: [], dashed: [], solid: [], 'solid-out': [] };
  for (const [x, y] of LATTICE) {
    if (!inBox([x, y])) continue;
    const on = sides.filter((s) => onLine(s, x, y));
    if (on.length > 1) continue;
    if (on.length === 0) {
      if (inAll(sides, x, y)) out.inside.push([x, y]);
      else if (sides.every((s) => passes(s, x, y) || distanceTo(s, x, y) <= 2)) out.outside.push([x, y]);
      continue;
    }
    const rest = inAll(sides.filter((s) => s !== on[0]), x, y);
    if (isStrict(on[0].op)) {
      if (rest) out.dashed.push([x, y]);
    } else out[rest ? 'solid' : 'solid-out'].push([x, y]);
  }
  return out;
}

interface LatticeFlowParams extends Corners {
  point: Pt;
}

const LAT_YES = 'Yes';
const LAT_NO = 'No';
const LAT_SOLID = 'Solid';
const LAT_DASHED = 'Dashed';

/**
 * Does this point count? On a line, the line's style decides and then the
 * other two inequalities; off every line, all three do. Difficulty 1 has the
 * picture; difficulty 2 is the form `ax + by` with the inequalities alone.
 */
const latticeFlow: Generator<LatticeFlowParams> = {
  id: 'lin-lattice-flow',
  sample: (rng, difficulty) => {
    const p = drawCorners(rng, formFor(difficulty), countable(2, 16));
    const found = latticeCases(p);
    const open = (['inside', 'outside', 'dashed', 'solid', 'solid-out'] as const).filter((c) => found[c].length > 0);
    const want = rng.pick(open);
    return { ...p, point: rng.pick(found[want]) };
  },
  render: (p): Slide => {
    const sides = sidesOf(p);
    const [x, y] = p.point;
    const on = sides.find((s) => onLine(s, x, y));
    const answer = on
      ? isStrict(on.op)
        ? [LAT_YES, LAT_DASHED]
        : [LAT_YES, LAT_SOLID, inAll(sides, x, y) ? LAT_YES : LAT_NO]
      : [LAT_NO, inAll(sides, x, y) ? LAT_YES : LAT_NO];
    return {
      kind: 'flow',
      prompt: [
        { kind: 'prose', text: `Does $${pointTex(x, y)}$ count as a point of this region?` },
        ...(p.form === 'slope' ? [regionFigure(p, SIDES, false)] : []),
      ],
      subject: systemOf(p),
      steps: [
        {
          id: 'on',
          ask: `Is $${pointTex(x, y)}$ on one of the boundary lines?`,
          branches: [
            { label: LAT_YES, to: 'style' },
            { label: LAT_NO, to: 'all' },
          ],
        },
        {
          id: 'style',
          ask: 'Is that line solid or dashed?',
          branches: [
            { label: LAT_SOLID, to: 'rest' },
            { label: LAT_DASHED, outcome: 'A dashed line is left out, so the point does not count.' },
          ],
        },
        {
          id: 'rest',
          ask: 'Does it pass the other two inequalities?',
          branches: [
            { label: LAT_YES, outcome: 'It counts.' },
            { label: LAT_NO, outcome: 'It is on the line but outside the region, so it does not count.' },
          ],
        },
        {
          id: 'all',
          ask: 'Does it pass all three inequalities?',
          branches: [
            { label: LAT_YES, outcome: 'It counts.' },
            { label: LAT_NO, outcome: 'It does not count.' },
          ],
        },
      ],
      answer,
    };
  },
  solution: (p) => {
    const sides = sidesOf(p);
    const [x, y] = p.point;
    const on = sides.find((s) => onLine(s, x, y));
    return [
      ...sides.map((s) => tryAt(s, x, y)),
      {
        text: on
          ? `It is on $${edgeTex(on)}$, which is ${isStrict(on.op) ? 'dashed' : 'solid'}. ${inAll(sides, x, y) ? 'It passes all three, so it counts.' : 'It fails one, so it does not count.'}`
          : inAll(sides, x, y)
            ? 'It is on no line and passes all three, so it counts.'
            : 'It is on no line and fails one, so it does not count.',
      },
    ];
  },
};

/* ---------- Lesson 5: regions from words ---------- */

interface RegionStory {
  /** What $x$ and $y$ count, plural. */
  x: string;
  y: string;
  /** How much of the total each one takes, the $x$ item first. */
  each: (a: number, b: number) => string;
  total: string;
  amount: (c: number) => string;
}

const REGION_STORIES: readonly RegionStory[] = [
  {
    x: 'small boxes',
    y: 'large boxes',
    each: (a, b) => `Small boxes weigh $${a}$ kg each and large boxes $${b}$ kg each.`,
    total: 'total mass',
    amount: (c) => `$${c}$ kg`,
  },
  {
    x: 'adult tickets',
    y: 'child tickets',
    each: (a, b) => `Adult tickets cost £$${a}$ each and child tickets £$${b}$ each.`,
    total: 'total cost',
    amount: (c) => `£$${c}$`,
  },
  {
    x: 'loaves',
    y: 'cakes',
    each: (a, b) => `Loaves need $${a}$ minutes each in the oven and cakes $${b}$ minutes each.`,
    total: 'total oven time',
    amount: (c) => `$${c}$ minutes`,
  },
  {
    x: 'small tables',
    y: 'large tables',
    each: (a, b) => `Small tables seat $${a}$ people each and large tables $${b}$ people each.`,
    total: 'number of seats',
    amount: (c) => `$${c}$`,
  },
  {
    x: 'sheep',
    y: 'goats',
    each: (a, b) => `Sheep need $${a}$ square metres each and goats $${b}$ square metres each.`,
    total: 'area they need',
    amount: (c) => `$${c}$ square metres`,
  },
  {
    x: 'long shifts',
    y: 'short shifts',
    each: (a, b) => `Long shifts last $${a}$ hours each and short shifts $${b}$ hours each.`,
    total: 'total time worked',
    amount: (c) => `$${c}$ hours`,
  },
];

/** The words for each sign. "No more than" and "at most" say the same thing. */
const STORY_WORDS: Record<string, Ineq> = {
  'at most': '<=',
  'no more than': '<=',
  'at least': '>=',
  'no less than': '>=',
  'less than': '<',
  'more than': '>',
};

const EASY_WORDS = ['at most', 'at least'];

interface StoryTilesParams {
  story: number;
  a: number;
  b: number;
  c: number;
  word: string;
  /** $x$ counts the item the sentence names second. */
  swap: boolean;
}

function storyLetters(story: RegionStory, swap: boolean): string {
  return `Let $x$ be the number of ${swap ? story.y : story.x} and $y$ the number of ${swap ? story.x : story.y}.`;
}

/** The coefficients of $x$ and $y$, whichever item each letter counts. */
const storyCoefficients = (p: StoryTilesParams): [number, number] => (p.swap ? [p.b, p.a] : [p.a, p.b]);

/**
 * One sentence into one inequality. Difficulty 1 is "at most" or "at
 * least" with the letters in the sentence's order; difficulty 2 adds the
 * strict words and the phrasings that mean the same, and half the time
 * lets $x$ count the item named second.
 */
const storyTiles: Generator<StoryTilesParams> = {
  id: 'lin-story-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [a, b] = rng.sample(range(2, hard ? 9 : 6), 2);
    return {
      story: rng.int(0, REGION_STORIES.length - 1),
      a,
      b,
      c: rng.int(12, hard ? 90 : 60),
      word: rng.pick(hard ? Object.keys(STORY_WORDS) : EASY_WORDS),
      swap: hard && rng.chance(0.5),
    };
  },
  render: (p): Slide => {
    const story = REGION_STORIES[p.story];
    const [cx, cy] = storyCoefficients(p);
    const op = STORY_WORDS[p.word];
    const answer = [leadTerm(cx, 'x'), signedTile(cy, 'y'), INEQ_TEX[op], `${p.c}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${story.each(p.a, p.b)} ${storyLetters(story, p.swap)} The ${story.total} must be ${p.word} ${story.amount(p.c)}. Write this as an inequality.`,
        },
      ],
      template: '{0} {1} {2} {3}',
      bank: bankOf(answer, [
        leadTerm(cy, 'x'),
        signedTile(cx, 'y'),
        INEQ_TEX[TURNED[op]],
        INEQ_TEX[NOT_STRICT[op]],
        `${p.c + cx + cy}`,
      ]),
      answer,
    };
  },
  solution: (p) => {
    const story = REGION_STORIES[p.story];
    const [cx, cy] = storyCoefficients(p);
    const op = STORY_WORDS[p.word];
    return [
      {
        text: `$x$ ${p.swap ? story.y : story.x} make $${leadTerm(cx, 'x')}$ and $y$ ${p.swap ? story.x : story.y} make $${leadTerm(cy, 'y')}$, so the ${story.total} is $${leadTerm(cx, 'x')} ${signedTile(cy, 'y')}$.`,
      },
      {
        text: `"${p.word.charAt(0).toUpperCase()}${p.word.slice(1)}" is $${INEQ_TEX[op]}$${isStrict(op) ? ': the total itself is not allowed' : ': the total itself is allowed'}.`,
      },
      { tex: `${leadTerm(cx, 'x')} ${signedTile(cy, 'y')} ${INEQ_TEX[op]} ${p.c}` },
    ];
  },
};

/**
 * A region from a story, built from its corners. The total's line crosses
 * the axes at $X$ and $Y$, so it is $Yx + Xy = XY$ over their common factor;
 * the minimum is $x \ge k$ or $y \ge k$, kept only where it meets that line
 * at a whole point. Every corner is whole. The line is then scaled up so each
 * item counts at least $2$ and at most $12$, which moves no corner.
 */
interface StoryShape {
  X: number;
  Y: number;
  on: 'x' | 'y';
  k: number;
  /** Both coefficients and the total multiplied by this: the same line, in the story's numbers. */
  f: number;
}

const STORY_SHAPES: readonly StoryShape[] = range(3, 10).flatMap((X) =>
  range(3, 10).flatMap((Y) =>
    X === Y
      ? []
      : (['x', 'y'] as const).flatMap((on) =>
          range(2, (on === 'x' ? X : Y) - 1)
            .filter((k) => (on === 'y' ? (X * (Y - k)) % Y === 0 : (Y * (X - k)) % X === 0))
            .map((k) => ({ X, Y, on, k, f: 1 })),
        ),
  ),
);

function storyLine({ X, Y, f }: StoryShape): { a: number; b: number; c: number } {
  const g = gcd(X, Y);
  return { a: (f * Y) / g, b: (f * X) / g, c: (f * X * Y) / g };
}

/** The region's corners: two on an axis, and where the total meets the minimum. */
function storyCorners(s: StoryShape): Pt[] {
  if (s.on === 'y') return [[0, s.k], [0, s.Y], [(s.X * (s.Y - s.k)) / s.Y, s.k]];
  return [[s.k, 0], [s.X, 0], [s.k, (s.Y * (s.X - s.k)) / s.X]];
}

interface StoryRegionParams extends StoryShape {
  story: number;
  capWord: string;
  minWord: string;
}

function sampleStoryRegion(rng: Rng, words: 'easy' | 'hard', on?: 'x' | 'y'): StoryRegionParams {
  const shapes = on ? STORY_SHAPES.filter((s) => s.on === on) : STORY_SHAPES;
  const shape = rng.pick(shapes);
  const { a, b } = storyLine(shape);
  const scales = range(1, 6).filter((f) => Math.min(a, b) * f >= 2 && Math.max(a, b) * f <= 12);
  return {
    ...shape,
    f: scales.length > 0 ? rng.pick(scales) : 1,
    story: rng.int(0, REGION_STORIES.length - 1),
    capWord: words === 'hard' ? rng.pick(['at most', 'no more than', 'less than']) : 'at most',
    minWord: words === 'hard' ? rng.pick(['at least', 'no less than', 'more than']) : 'at least',
  };
}

function storyRegionText(p: StoryRegionParams): string {
  const story = REGION_STORIES[p.story];
  const { a, b, c } = storyLine(p);
  return `${story.each(a, b)} ${storyLetters(story, false)} The ${story.total} must be ${p.capWord} ${story.amount(c)}, and there must be ${p.minWord} $${p.k}$ ${p.on === 'x' ? story.x : story.y}.`;
}

const totalTex = (p: StoryShape): string => {
  const { a, b } = storyLine(p);
  return `${leadTerm(a, 'x')} ${signedTile(b, 'y')}`;
};

interface StorySystemParams extends StoryRegionParams {
  /** The three wrong pairs: total sign, minimum sign, coefficients swapped, minimum on the other letter. */
  wrong: ('cap' | 'min' | 'swap' | 'letter')[];
}

/**
 * Which pair of inequalities is the story? The wrong pairs turn one sign
 * round, swap the two coefficients, or put the minimum on the other letter.
 * Difficulty 2 adds the strict words and "no more than", "no less than".
 */
const storySystem: Generator<StorySystemParams> = {
  id: 'lin-story-system',
  sample: (rng, difficulty) => ({
    ...sampleStoryRegion(rng, difficulty > 1 ? 'hard' : 'easy'),
    wrong: rng.sample(['cap', 'min', 'swap', 'letter'] as const, 3),
  }),
  render: (p): Slide => {
    const { a, b, c } = storyLine(p);
    const cap = STORY_WORDS[p.capWord];
    const min = STORY_WORDS[p.minWord];
    const other = p.on === 'x' ? 'y' : 'x';
    const pair = (change?: StorySystemParams['wrong'][number]) =>
      stackTex([
        `${change === 'swap' ? `${leadTerm(b, 'x')} ${signedTile(a, 'y')}` : totalTex(p)} ${INEQ_TEX[change === 'cap' ? TURNED[cap] : cap]} ${c}`,
        `${change === 'letter' ? other : p.on} ${INEQ_TEX[change === 'min' ? TURNED[min] : min]} ${p.k}`,
      ]);
    return sortedChoice(
      [
        {
          kind: 'prose',
          text: `${storyRegionText(p)} Along with $x \\ge 0$ and $y \\ge 0$, which pair of inequalities describes this?`,
        },
      ],
      labelChoices(pair(), ...p.wrong.map(pair)),
    );
  },
  solution: (p) => {
    const story = REGION_STORIES[p.story];
    const { c } = storyLine(p);
    const cap = STORY_WORDS[p.capWord];
    const min = STORY_WORDS[p.minWord];
    return [
      { text: `The ${story.total} is $${totalTex(p)}$, and "${p.capWord}" is $${INEQ_TEX[cap]}$.`, tex: `${totalTex(p)} ${INEQ_TEX[cap]} ${c}` },
      {
        text: `$${p.on}$ counts the ${p.on === 'x' ? story.x : story.y}, and "${p.minWord}" is $${INEQ_TEX[min]}$.`,
        tex: `${p.on} ${INEQ_TEX[min]} ${p.k}`,
      },
    ];
  },
};

const STORY_WINDOW = { xMin: -1, xMax: 11, yMin: -1, yMax: 11 };

/** The story's region: the total's line, the minimum, and the axes. */
function storySvg(p: StoryShape): string {
  const { a, b, c } = storyLine(p);
  const corners = storyCorners(p);
  const cx = (corners[0][0] + corners[1][0] + corners[2][0]) / 3;
  const cy = (corners[0][1] + corners[1][1] + corners[2][1]) / 3;
  const dot: Pt = [Math.round(cx), Math.round(cy)];
  const inside =
    a * dot[0] + b * dot[1] < c && (p.on === 'x' ? dot[0] > p.k : dot[1] > p.k) && dot[0] > 0 && dot[1] > 0;
  return plotSvg({
    ...STORY_WINDOW,
    height: REGION_HEIGHT,
    grid: true,
    curves: [{ f: (x: number) => (c - a * x) / b }, ...(p.on === 'y' ? [{ f: () => p.k }] : [])],
    verticals: p.on === 'x' ? [{ x: p.k, dashed: false }] : [],
    marks: inside ? [{ x: dot[0], y: dot[1] }] : [],
    label: `A region in the first quadrant under a sloping line, with a ${p.on === 'x' ? 'vertical' : 'level'} line at ${p.k}`,
  });
}


interface StoryMostParams extends StoryRegionParams {
  /** The corners are listed in the prompt. */
  listed: boolean;
}

/**
 * The most items altogether, $x + y$, at a corner of the story's region.
 * Difficulty 1 lists the corners; difficulty 2 leaves them to be found, one
 * of them where the total's line meets the minimum.
 */
const storyMost: Generator<StoryMostParams> = {
  id: 'lin-story-most',
  sample: (rng, difficulty) => ({ ...sampleStoryRegion(rng, 'easy'), listed: difficulty < 2 }),
  render: (p): Slide => {
    const story = REGION_STORIES[p.story];
    const corners = storyCorners(p);
    const { c } = storyLine(p);
    const ask = `The most ${story.x} and ${story.y} altogether, $x + y$, is at a corner of the region. What is it?`;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: storyRegionText(p) },
        { kind: 'diagram', svg: storySvg(p) },
        {
          kind: 'display',
          tex: stackTex([`${totalTex(p)} \\le ${c}`, `${p.on} \\ge ${p.k}, \\quad ${p.on === 'x' ? 'y' : 'x'} \\ge 0`]),
        },
        {
          kind: 'prose',
          text: p.listed ? `The corners are ${corners.map((q) => `$${pointTex(...q)}$`).join(', ')}. ${ask}` : ask,
        },
      ],
      lead: 'x + y =',
      keypad: [],
      answer: `${Math.max(...corners.map(([x, y]) => x + y))}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const corners = storyCorners(p);
    const best = Math.max(...corners.map(([x, y]) => x + y));
    const [mx, my] = corners[2];
    return [
      ...(p.listed
        ? []
        : [
            {
              text: `Two corners are on the axis and one is where $${totalTex(p)} = ${storyLine(p).c}$ meets $${p.on} = ${p.k}$: put $${p.on} = ${p.k}$ in to get $${pointTex(mx, my)}$.`,
            },
          ]),
      ...corners.map(([x, y]) => ({ text: `At $${pointTex(x, y)}$, $x + y = ${x + y}$.` })),
      { text: `The largest is $${best}$.` },
    ];
  },
};

/**
 * The corner where the story's total meets its minimum, as a line of
 * working: the known letter put in, the product worked out, the number taken
 * across, the coefficient divided out. Difficulty 1 puts in $y$; difficulty
 * 2 puts in either.
 */
const storyMeetSteps: Generator<StoryRegionParams> = {
  id: 'lin-story-meet-steps',
  sample: (rng, difficulty) => sampleStoryRegion(rng, 'easy', difficulty > 1 ? rng.pick(['x', 'y'] as const) : 'y'),
  render: (p): Slide => {
    const { a, b, c } = storyLine(p);
    const [mx, my] = storyCorners(p)[2];
    const known = p.on === 'y' ? b : a;
    const product = known * p.k;
    const unknown = p.on === 'y' ? 'x' : 'y';
    const coefficient = p.on === 'y' ? a : b;
    const value = p.on === 'y' ? mx : my;
    const term = leadTerm(coefficient, unknown);
    const rest = c - product;
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] =
      p.on === 'y'
        ? [{ span: [1, 2], value: `+ ${product}`, bank: stepBank(`+ ${product}`, `+ ${known + p.k}`, `+ ${product + known}`, `+ ${product + p.k}`) }]
        : [{ span: [0, 1], value: `${product}`, bank: stepBank(`${product}`, `${known + p.k}`, `${product + known}`, `${product + p.k}`) }];
    reductions.push({
      span: [0, 4],
      value: `${term} = ${rest}`,
      bank: stepBank(`${term} = ${rest}`, `${term} = ${c + product}`, `${term} = ${c}`, `${term} = ${product - c}`),
    });
    if (coefficient !== 1) {
      reductions.push({
        span: [0, 1],
        value: `${unknown} = ${value}`,
        bank: stepBank(`${unknown} = ${value}`, `${unknown} = ${rest - coefficient}`, `${unknown} = ${rest * coefficient}`, `${unknown} = ${value + 1}`),
      });
    }
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${storyRegionText(p)} One corner of the region is where $${totalTex(p)} = ${c}$ meets $${p.on} = ${p.k}$. Put $${p.on} = ${p.k}$ in and find $${unknown}$. ${HOW_TO_STEP}`,
        },
      ],
      start:
        p.on === 'y'
          ? [leadTerm(a, 'x'), `+ ${b} \\times ${p.k}`, '=', `${c}`]
          : [`${a} \\times ${p.k}`, signedTile(b, 'y'), '=', `${c}`],
      reductions,
    };
  },
  solution: (p) => {
    const { a, b, c } = storyLine(p);
    const [mx, my] = storyCorners(p)[2];
    const unknown = p.on === 'y' ? 'x' : 'y';
    const coefficient = p.on === 'y' ? a : b;
    const product = (p.on === 'y' ? b : a) * p.k;
    return [
      { tex: p.on === 'y' ? `${leadTerm(a, 'x')} + ${b} \\times ${p.k} = ${c}` : `${a} \\times ${p.k} ${signedTile(b, 'y')} = ${c}` },
      { tex: `${leadTerm(coefficient, unknown)} = ${c} - ${product} = ${c - product}` },
      { tex: `${unknown} = ${p.on === 'y' ? mx : my}` },
      { text: `So the corner is $${pointTex(mx, my)}$.` },
    ];
  },
};

/* ======================================================================
 * Level 7: Modelling with Linear Equations
 *
 * Batch C1-l7. Stories turned into straight-line equations, and the answers
 * read back into the story: naming the unknown and writing every quantity
 * from it, break-even, rates of travel and of filling, two things blended to
 * a target, and reading a model back — which equation fits, an answer that
 * makes no sense, the effect of changing one number, a formula rearranged
 * for the story's unknown. Level 1's two plans set equal, level 2's pairs
 * from words and level 3's rearranging are pointed at, not re-asked, and
 * curved models belong to Quadratics and Exponential Models.
 *
 * Every model is built outward from its answer. The count, time or amount
 * is drawn first and multiplied up to the totals, so every price, distance
 * and total a learner reads is whole, and so is every step on the way. The
 * one exception is on purpose: the sense-check flow shows a model whose
 * answer is half a cake or a negative time, and asks what is wrong.
 *
 * No slide here declares `source`, `integrand` or `limits`: nothing is
 * calculus, so the oracle in `generators.test.ts` skips every one of them.
 * `linearModelling.test.ts` is the independent check instead: it reads each
 * prompt back as the learner sees it, solves the story again, and holds
 * every tile, node, branch, option and typed answer against that.
 * ==================================================================== */

/** A sum of money in prose: `£$12$`. */
const pounds = (value: number): string => `£$${value}$`;

const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many);

/**
 * Three amounts for a flow's last fork: the answer and two near misses, all
 * whole, positive and different, smallest first so the order says nothing.
 */
function amountsNear(correct: number, ...near: number[]): number[] {
  const out = [correct];
  for (const value of near) {
    if (out.length < 3 && Number.isInteger(value) && value > 0 && !out.includes(value)) out.push(value);
  }
  for (let gap = 1; out.length < 3; gap += 1) {
    for (const value of [correct + gap, correct - gap]) {
      if (out.length < 3 && value > 0 && !out.includes(value)) out.push(value);
    }
  }
  return out.sort((a, b) => a - b);
}

/* ---------- Lesson 1: naming the unknown ---------- */

const NAME_PEOPLE: readonly (readonly [string, string, string])[] = [
  ['Amy', 'Ben', 'Cara'],
  ['Dev', 'Ella', 'Finn'],
  ['Gita', 'Hal', 'Isla'],
  ['Jon', 'Kemi', 'Leo'],
  ['Mia', 'Noor', 'Omar'],
  ['Priya', 'Quinn', 'Rosa'],
];

const NAME_THINGS = ['stickers', 'marbles', 'stamps', 'cards', 'shells', 'badges'] as const;

/** The six orders three names can be introduced in. */
const LISTINGS: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

interface NameParams {
  people: number;
  thing: number;
  /** The order the three names are introduced in, so the one to call $x$ is not always named first. */
  listing: number;
  /** The first person's count: the one everything else is written from. */
  x: number;
  /** The second has `m` times as many as the first, and `d` more. */
  m: number;
  d: number;
  /** The third is described from the second rather than the first. */
  chain: boolean;
  /** The third has `n` times as many as whoever it is described from, and `e` more. */
  n: number;
  e: number;
  /** The third person's sentence comes first. */
  flipped: boolean;
  /** Who a question asks about: 1 the second person, 2 the third. */
  target: 1 | 2;
}

/** Each person's count as a multiple of $x$ plus a number: [coefficient, constant]. */
function nameTerms(p: NameParams): [number, number][] {
  const third: [number, number] = p.chain ? [p.n * p.m, p.n * p.d + p.e] : [p.n, p.e];
  return [[1, 0], [p.m, p.d], third];
}

const nameCounts = (p: NameParams): number[] => nameTerms(p).map(([k, c]) => k * p.x + c);

/** The total collected: $Kx + C = T$. */
function nameCollected(p: NameParams): { K: number; C: number; T: number } {
  const terms = nameTerms(p);
  const K = terms.reduce((sum, [k]) => sum + k, 0);
  const C = terms.reduce((sum, [, c]) => sum + c, 0);
  return { K, C, T: K * p.x + C };
}

/** "Ben has $3$ more than twice as many as Amy." */
function relationText(who: string, of: string, m: number, d: number): string {
  const more = `$${Math.abs(d)}$ ${d > 0 ? 'more' : 'fewer'} than`;
  if (m === 1) return `${who} has ${more} ${of}.`;
  const times = `${TIMES_WORD[m]} as many as ${of}`;
  return d === 0 ? `${who} has ${times}.` : `${who} has ${more} ${times}.`;
}

function nameStory(p: NameParams): string {
  const names = NAME_PEOPLE[p.people];
  const listed = LISTINGS[p.listing].map((i) => names[i]);
  const second = relationText(names[1], names[0], p.m, p.d);
  const third = relationText(names[2], p.chain ? names[1] : names[0], p.n, p.e);
  const sentences = p.flipped ? [third, second] : [second, third];
  return `${listed[0]}, ${listed[1]} and ${listed[2]} collect ${NAME_THINGS[p.thing]}. ${sentences.join(' ')}`;
}

/** The third person's count as it is first written, before tidying: `2(2x + 3) - 1`. */
function nameThirdRaw(p: NameParams): string {
  if (!p.chain) return linTex(p.n, p.e);
  const inner = linTex(p.m, p.d);
  const outer = p.n === 1 ? inner : `${p.n}(${inner})`;
  return p.e === 0 ? outer : `${outer} ${signedTile(p.e)}`;
}

/**
 * Three people's counts, each whole, positive and different, and a total
 * whose collected equation has a number on the left. Difficulty 2 lets the
 * third be described from the second, allows three times as many, and may
 * put the third's sentence first.
 */
function sampleName(rng: Rng, difficulty: number): NameParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const m = rng.pick(hard ? [1, 2, 3] : [1, 2]);
      const n = rng.pick(hard ? [1, 2, 3] : [1, 2]);
      const chain = hard && rng.chance(0.5);
      return {
        people: rng.int(0, NAME_PEOPLE.length - 1),
        thing: rng.int(0, NAME_THINGS.length - 1),
        listing: rng.int(0, LISTINGS.length - 1),
        x: rng.int(hard ? 4 : 3, hard ? 25 : 15),
        m,
        d: rng.pick(m === 1 ? nonZeroRange(-9, 9) : range(-9, 9)),
        chain,
        n,
        e: rng.pick(n === 1 ? nonZeroRange(-9, 9) : range(-9, 9)),
        flipped: hard && rng.chance(0.5),
        target: chain ? 2 : rng.pick([1, 2] as const),
      };
    },
    (p) => {
      const counts = nameCounts(p);
      return counts.every((count) => count >= 1) && new Set(counts).size === 3 && nameCollected(p).C !== 0;
    },
    { people: 0, thing: 0, listing: 2, x: 5, m: 2, d: 3, chain: false, n: 1, e: 4, flipped: false, target: 1 },
  );
}

/** The working shared by every lesson 1 question: name, write, collect, solve, answer. */
function nameWorking(p: NameParams): SolutionStep[] {
  const names = NAME_PEOPLE[p.people];
  const terms = nameTerms(p);
  const { K, C, T } = nameCollected(p);
  const counts = nameCounts(p);
  const third = linTex(...terms[2]);
  const raw = nameThirdRaw(p);
  return [
    {
      text: `Call ${names[0]}'s number $x$. Then ${names[1]} has $${linTex(...terms[1])}$ and ${names[2]} has $${raw === third ? third : `${raw} = ${third}`}$.`,
    },
    { tex: `\\begin{aligned} &x + (${linTex(...terms[1])}) \\\\ &\\quad + (${third}) = ${T} \\end{aligned}` },
    { tex: stackTex([`${linTex(K, C)} = ${T}`, `${leadTerm(K, 'x')} = ${T - C}`, `x = ${p.x}`]) },
    {
      text: `So ${names[0]} has $${counts[0]}$, ${names[1]} has $${counts[1]}$ and ${names[2]} has $${counts[2]}$: they add up to $${T}$.`,
    },
  ];
}

/**
 * Which quantity to call $x$: the one every other count is written from.
 * The names are introduced in a drawn order, so it is not always the first
 * one met; difficulty 2 chains the third count off the second and may state
 * it first, so the one to name has to be traced back.
 */
const nameLetter: Generator<NameParams> = {
  id: 'lin-name-letter',
  sample: sampleName,
  render: (p): Slide => {
    const names = NAME_PEOPLE[p.people];
    const count = (who: string) => `\\text{the number ${who} has}`;
    return sortedChoice(
      [
        {
          kind: 'prose',
          text: `${nameStory(p)} Which number is best called $x$, so that every other count can be written from it?`,
        },
      ],
      labelChoices(count(names[0]), count(names[1]), count(names[2]), `\\text{the total number of ${NAME_THINGS[p.thing]}}`),
    );
  },
  solution: (p) => {
    const names = NAME_PEOPLE[p.people];
    const terms = nameTerms(p);
    return [
      {
        text: p.chain
          ? `${names[2]} is described from ${names[1]}, and ${names[1]} from ${names[0]}, so everything starts from ${names[0]}.`
          : `${names[1]} and ${names[2]} are both described from ${names[0]}, so everything starts from ${names[0]}.`,
      },
      {
        text: `Call ${names[0]}'s number $x$: then ${names[1]} has $${linTex(...terms[1])}$ and ${names[2]} has $${linTex(...terms[2])}$, with no fractions anywhere.`,
      },
    ];
  },
};

/**
 * One person's count in terms of $x$, placed as tiles. Difficulty 2 chains
 * the third off the second, so the bracket has to be multiplied out: the
 * bank holds the constant left unmultiplied, and one more or one fewer $x$.
 */
const nameExpress: Generator<NameParams> = {
  id: 'lin-name-express',
  sample: sampleName,
  render: (p): Slide => {
    const names = NAME_PEOPLE[p.people];
    const [k, c] = nameTerms(p)[p.target];
    const answer = c === 0 ? [leadTerm(k, 'x')] : [leadTerm(k, 'x'), signedTile(c)];
    const slip = p.chain ? p.d + p.e : p.target === 1 ? p.e : p.d;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${nameStory(p)} Let $x$ be the number of ${NAME_THINGS[p.thing]} ${names[0]} has. Write the number ${names[p.target]} has in terms of $x$.`,
        },
      ],
      template: c === 0 ? '{0}' : '{0} {1}',
      bank: bankOf(answer, [
        leadTerm(k + 1, 'x'),
        ...(k > 1 ? [leadTerm(k - 1, 'x')] : []),
        signedTile(c === 0 ? p.m + 1 : -c),
        ...(slip === 0 ? [] : [signedTile(slip)]),
      ]),
      answer,
    };
  },
  solution: (p) => {
    const names = NAME_PEOPLE[p.people];
    const [k, c] = nameTerms(p)[p.target];
    const raw = p.target === 1 ? linTex(p.m, p.d) : nameThirdRaw(p);
    const tidy = linTex(k, c);
    return [
      {
        text:
          p.target === 2 && p.chain
            ? `${names[1]} has $${linTex(p.m, p.d)}$, and ${names[2]} is written from ${names[1]}'s number.`
            : `${names[p.target]} is written straight from ${names[0]}'s number, $x$.`,
      },
      { tex: raw === tidy ? tidy : `${raw} = ${tidy}` },
    ];
  },
};

/**
 * The whole story as one equation, like terms collected, placed as tiles.
 * The slips on offer are forgetting $x$ itself among the three, the number's
 * sign, and the total with the number already moved across.
 */
const nameTotal: Generator<NameParams> = {
  id: 'lin-name-total',
  sample: sampleName,
  render: (p): Slide => {
    const names = NAME_PEOPLE[p.people];
    const { K, C, T } = nameCollected(p);
    const answer = [leadTerm(K, 'x'), signedTile(C), `${T}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${nameStory(p)} Together they have $${T}$ ${NAME_THINGS[p.thing]}. Let $x$ be the number ${names[0]} has. Write the equation for the total, with like terms collected.`,
        },
      ],
      template: '{0} {1} = {2}',
      bank: bankOf(answer, [leadTerm(K - 1, 'x'), leadTerm(K + 1, 'x'), signedTile(-C), numberTile(T - C), numberTile(T + C)]),
      answer,
    };
  },
  solution: (p) => nameWorking(p).slice(0, 3),
};

/**
 * The story solved, and the question answered: the count asked for is never
 * $x$ itself, so stopping at $x$ is the slip the options offer.
 */
const nameSolve: Generator<NameParams> = {
  id: 'lin-name-solve',
  choices: (p) => {
    const counts = nameCounts(p);
    const { T } = nameCollected(p);
    return numberChoices(counts[p.target], p.x, counts[3 - p.target], Math.round(T / 3));
  },
  sample: sampleName,
  render: (p): Slide => {
    const names = NAME_PEOPLE[p.people];
    const { T } = nameCollected(p);
    const who = names[p.target];
    const thing = NAME_THINGS[p.thing];
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${nameStory(p)} Together they have $${T}$ ${thing}. How many does ${who} have?` }],
      lead: `\\text{${who}'s ${thing}} =`,
      keypad: [],
      answer: `${nameCounts(p)[p.target]}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => [
    ...nameWorking(p),
    { text: `The question asks for ${NAME_PEOPLE[p.people][p.target]}'s, so the answer is $${nameCounts(p)[p.target]}$, not $x$.` },
  ],
};

/**
 * From the collected equation to every count, as a tree: the number moved
 * across, $x$, then each person's count from the one it is written from.
 */
const nameTree: Generator<NameParams> = {
  id: 'lin-name-tree',
  sample: sampleName,
  render: (p): Slide => {
    const names = NAME_PEOPLE[p.people];
    const { K, C, T } = nameCollected(p);
    const counts = nameCounts(p);
    const answer = [`${T - C}`, `${p.x}`, `${counts[1]}`, `${counts[2]}`];
    const move = C > 0 ? `take $${C}$ off the total` : `put $${-C}$ back on the total`;
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${nameStory(p)} Together they have $${T}$ ${NAME_THINGS[p.thing]}. With $x$ for ${names[0]}'s, the equation collects to $${linTex(K, C)} = ${T}$. Fill the tree: ${move}, divide by $${K}$ for $x$, then find ${names[1]}'s and ${names[2]}'s.`,
        },
      ],
      expression: `x = (${T} ${C > 0 ? '-' : '+'} ${Math.abs(C)}) \\div ${K}`,
      nodes: [
        { id: 'rest', from: [] },
        { id: 'x', from: ['rest'] },
        { id: 'second', from: ['x'] },
        { id: 'third', from: [p.chain ? 'second' : 'x'] },
      ],
      bank: treeBank(answer, [T + C, (T + C) / K, p.x + 1, counts[1] + p.d], p.x),
      answer,
    };
  },
  solution: nameWorking,
};

/* ---------- Lesson 2: break-even ---------- */

interface EvenStory {
  who: string;
  /** What the fixed cost pays for, after "pays £F". */
  setup: string;
  item: string;
  items: string;
}

const EVEN_STORIES: readonly EvenStory[] = [
  { who: 'A school stall', setup: 'to hire its table', item: 'cake', items: 'cakes' },
  { who: 'A printer', setup: 'for a new press', item: 'poster', items: 'posters' },
  { who: 'A florist', setup: 'to rent a market pitch', item: 'bunch of flowers', items: 'bunches' },
  { who: 'A juice bar', setup: 'for a blender', item: 'smoothie', items: 'smoothies' },
  { who: 'A craft seller', setup: 'for a stand at a fair', item: 'candle', items: 'candles' },
];

interface EvenParams {
  story: number;
  /** The break-even count. */
  n: number;
  /** Cost to make one. */
  c: number;
  /** What each one sold makes over its cost, so the price is `c + g`. */
  g: number;
  /** The price and cost come before the fixed cost. */
  order: boolean;
}

const evenFixed = (p: EvenParams): number => p.n * p.g;
const evenPrice = (p: EvenParams): number => p.c + p.g;

/** The story's three numbers in words. Each has its own phrase, so the order can change. */
function evenSentence(story: number, fixed: number, cost: number, price: number, order: boolean): string {
  const s = EVEN_STORIES[story];
  const pays = `${s.who} pays ${pounds(fixed)} ${s.setup}.`;
  const each = order
    ? `Each ${s.item} sells for ${pounds(price)} and costs ${pounds(cost)} to make.`
    : `Each ${s.item} costs ${pounds(cost)} to make and sells for ${pounds(price)}.`;
  return order ? `${each} ${pays}` : `${pays} ${each}`;
}

const evenText = (p: EvenParams): string => evenSentence(p.story, evenFixed(p), p.c, evenPrice(p), p.order);

/**
 * A break-even story, built from the count: the fixed cost is the count
 * times what each sale makes over its cost. Difficulty 2 has larger numbers
 * and may give the price first.
 */
function sampleEven(rng: Rng, difficulty: number, most?: number): EvenParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => ({
      story: rng.int(0, EVEN_STORIES.length - 1),
      n: rng.int(hard ? 8 : 4, most ?? (hard ? 40 : 20)),
      c: rng.int(2, hard ? 15 : 6),
      g: rng.int(hard ? 2 : 1, hard ? 12 : 6),
      order: hard && rng.chance(0.5),
    }),
    (p) => evenFixed(p) !== evenPrice(p) && evenFixed(p) !== p.c && p.g !== p.c,
    { story: 0, n: 6, c: 2, g: 3, order: false },
  );
}

function evenWorking(p: EvenParams): SolutionStep[] {
  const F = evenFixed(p);
  const price = evenPrice(p);
  return [
    { text: `With $n$ sold, the income is $${price}n$ and the costs are $${F} + ${p.c}n$. At break-even they are equal.` },
    { tex: `${price}n = ${F} + ${p.c}n` },
    { tex: stackTex([`${p.g}n = ${F}`, `n = ${p.n}`]) },
  ];
}

/** How many to sell to break even, typed. */
const evenCount: Generator<EvenParams> = {
  id: 'lin-even-count',
  choices: (p) => {
    const F = evenFixed(p);
    return numberChoices(p.n, F / evenPrice(p), F / p.c, p.n + 1);
  },
  sample: (rng, difficulty) => sampleEven(rng, difficulty),
  render: (p): Slide => {
    const { items } = EVEN_STORIES[p.story];
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${evenText(p)} How many ${items} must it sell to break even?` }],
      lead: `\\text{${items}} =`,
      keypad: [],
      answer: `${p.n}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => [
    ...evenWorking(p),
    { text: `Each ${EVEN_STORIES[p.story].item} sold covers its own cost and ${pounds(p.g)} more, and $${p.n}$ lots of ${pounds(p.g)} is the ${pounds(evenFixed(p))}.` },
  ],
};

/**
 * The break-even equation placed as tiles: income on the left, costs on the
 * right. The bank holds what each sale makes over its cost, which is the
 * number the equation collects to rather than one in it.
 */
const evenTiles: Generator<EvenParams> = {
  id: 'lin-even-tiles',
  sample: (rng, difficulty) => sampleEven(rng, difficulty),
  render: (p): Slide => {
    const F = evenFixed(p);
    const answer = [`${evenPrice(p)}`, `${F}`, `${p.c}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${evenText(p)} Let $n$ be the number sold. Write the equation that says the income equals the costs.`,
        },
      ],
      template: '{0}n = {1} + {2}n',
      bank: bankOf(answer, [`${p.g}`, `${p.n}`, `${F + p.c}`]),
      answer,
    };
  },
  solution: evenWorking,
};

/**
 * Break-even as two lines crossing: the income rising from nothing, the
 * costs starting at the fixed cost and rising more slowly.
 */
const evenSlider: Generator<EvenParams> = {
  id: 'lin-even-slider',
  sample: (rng, difficulty) => sampleEven(rng, difficulty, difficulty > 1 ? 18 : 10),
  render: (p): Slide => {
    const width = p.n > 10 ? 20 : 12;
    const F = evenFixed(p);
    const price = evenPrice(p);
    const { items } = EVEN_STORIES[p.story];
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${evenText(p)} The solid line is the income and the dashed line the costs. Slide to the number of ${items} where they cross.`,
        },
      ],
      min: 0,
      max: width,
      step: 1,
      answer: p.n,
      readout: `\\text{${items}} = {v}`,
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: width,
          yMin: 0,
          yMax: Math.max(price, F + p.c) * width + 2,
          curves: [{ f: (t: number) => price * t }, { f: (t: number) => F + p.c * t, dashed: true }],
          label: 'An income line rising from zero and a dashed cost line starting higher, crossing once',
        }),
        ...markerWindow(0, width),
      },
    };
  },
  solution: (p) => [
    { text: 'The lines cross where the income equals the costs: the break-even point.' },
    ...evenWorking(p),
  ],
};

interface EvenTableParams extends EvenParams {
  /** The step between the numbers sold in the rows. */
  gap: number;
  /** Which row is the break-even count. */
  at: number;
  /** The first row is filled in. */
  given: boolean;
}

const evenRows = (p: EvenTableParams): number[] => [0, 1, 2].map((i) => p.n + (i - p.at) * p.gap);

/**
 * Costs and income for three numbers sold, one of them the break-even
 * count, filled from a bank. Difficulty 1 gives the first row; difficulty 2
 * leaves every cell blank and spaces the rows further apart.
 */
const evenTable: Generator<EvenTableParams> = {
  id: 'lin-even-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => ({
        ...sampleEven(rng, difficulty),
        gap: rng.int(hard ? 2 : 1, hard ? 6 : 3),
        at: rng.int(hard ? 0 : 1, 2),
        given: !hard,
      }),
      (p) => evenRows(p)[0] >= 0,
      { story: 0, n: 6, c: 2, g: 3, order: false, gap: 2, at: 1, given: true },
    );
  },
  render: (p): Slide => {
    const F = evenFixed(p);
    const price = evenPrice(p);
    const given = p.given ? 0 : -1;
    const rows = evenRows(p).map((k, i) =>
      i === given ? [`${k}`, `${F + p.c * k}`, `${price * k}`] : [`${k}`, null, null],
    );
    const answer = evenRows(p).flatMap((k, i) => (i === given ? [] : [`${F + p.c * k}`, `${price * k}`]));
    const middle = evenRows(p)[1];
    return {
      kind: 'table',
      prompt: [
        {
          kind: 'prose',
          text: `${evenText(p)} Fill in the costs and the income, in pounds, for each number sold. The row where they are equal is the break-even point.`,
        },
      ],
      columns: ['n', '\\text{costs}', '\\text{income}'],
      rows,
      bank: treeBank(answer, [p.c * middle, F + price * middle, p.g * middle], F + p.c * p.n),
      answer,
    };
  },
  solution: (p) => {
    const F = evenFixed(p);
    const price = evenPrice(p);
    return [
      { text: `The costs are $${F} + ${p.c}n$ and the income is $${price}n$.` },
      ...evenRows(p).map((k) => ({
        text: `Selling $${k}$: the costs are $${F} + ${p.c} \\times ${k} = ${F + p.c * k}$ and the income $${price} \\times ${k} = ${price * k}$.`,
      })),
      { text: `They are equal at $n = ${p.n}$, the break-even point.` },
    ];
  },
};

interface EvenFlowParams extends EvenParams {
  /** How many were sold. */
  k: number;
  /** The income and costs are shown as expressions. */
  shown: boolean;
}

const EVEN_MORE = 'Yes, more';
const EVEN_LESS = 'No, less';
const EVEN_SAME = 'Exactly the same';

const evenProfit = (p: EvenFlowParams): number => p.g * (p.k - p.n);

/** The three amounts on offer, the profit or loss among them. */
function evenAmounts(p: EvenFlowParams): number[] {
  const F = evenFixed(p);
  const size = Math.abs(evenProfit(p));
  return amountsNear(Math.max(size, 1), Math.abs(evenPrice(p) * p.k - F), p.g * p.k, size + p.c);
}

/**
 * Profit or loss at a given number sold, either side of break-even. The
 * amounts offered include the income less only the fixed cost, and what
 * the sales make over their costs before the fixed cost comes off.
 * Difficulty 1 shows the income and costs as expressions and sometimes
 * lands on break-even itself; difficulty 2 shows only the number sold.
 */
const evenFlow: Generator<EvenFlowParams> = {
  id: 'lin-even-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const base = sampleEven(rng, difficulty);
    const offset = rng.pick(nonZeroRange(hard ? -15 : -5, hard ? 15 : 5));
    const k = !hard && rng.chance(0.15) ? base.n : Math.max(1, base.n + offset);
    return { ...base, k, shown: !hard };
  },
  render: (p): Slide => {
    const { items } = EVEN_STORIES[p.story];
    const F = evenFixed(p);
    const price = evenPrice(p);
    const profit = evenProfit(p);
    const label = (v: number) => `£$${v}$`;
    const amounts = evenAmounts(p);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `${evenText(p)} It sells $${p.k}$ ${items}.` }],
      subject: p.shown
        ? stackTex([`\\text{income} = ${price}n`, `\\text{costs} = ${F} + ${p.c}n`])
        : `n = ${p.k}`,
      steps: [
        {
          id: 'compare',
          ask: `Is the income from $${p.k}$ ${items} more than the costs?`,
          branches: [
            { label: EVEN_MORE, to: 'profit' },
            { label: EVEN_LESS, to: 'loss' },
            { label: EVEN_SAME, outcome: 'It breaks even: no profit and no loss.' },
          ],
        },
        {
          id: 'profit',
          ask: 'How much profit does it make?',
          branches: amounts.map((v) => ({ label: label(v), outcome: `A profit of £$${v}$.` })),
        },
        {
          id: 'loss',
          ask: 'How much does it lose?',
          branches: amounts.map((v) => ({ label: label(v), outcome: `A loss of £$${v}$.` })),
        },
      ],
      answer: profit === 0 ? [EVEN_SAME] : [profit > 0 ? EVEN_MORE : EVEN_LESS, label(Math.abs(profit))],
    };
  },
  solution: (p) => {
    const F = evenFixed(p);
    const price = evenPrice(p);
    const profit = evenProfit(p);
    return [
      { tex: `\\text{income} = ${price} \\times ${p.k} = ${price * p.k}` },
      { tex: `\\text{costs} = ${F} + ${p.c} \\times ${p.k} = ${F + p.c * p.k}` },
      {
        text:
          profit > 0
            ? `The income is more by ${pounds(profit)}: a profit. It sold more than the $${p.n}$ needed to break even.`
            : profit < 0
              ? `The costs are more by ${pounds(-profit)}: a loss. It sold fewer than the $${p.n}$ needed to break even.`
              : `They are equal: $${p.n}$ is exactly the break-even number.`,
      },
    ];
  },
};

/* ---------- Lesson 3: rates ---------- */

interface Travel {
  how: string;
  /** Speeds in km/h, from `lo` to `hi` in steps of `step`. */
  lo: number;
  hi: number;
  step: number;
}

const TRAVEL: readonly Travel[] = [
  { how: 'walking', lo: 2, hi: 7, step: 1 },
  { how: 'cycling', lo: 8, hi: 20, step: 1 },
  { how: 'driving', lo: 30, hi: 80, step: 5 },
];

const TRAVELLERS: readonly (readonly [string, string])[] = [
  ['Asha', 'Ben'],
  ['Cal', 'Dina'],
  ['Eve', 'Farid'],
  ['Gus', 'Hana'],
  ['Ivo', 'Jess'],
];

const speedIn = (rng: Rng, mode: number): number => {
  const { lo, hi, step } = TRAVEL[mode];
  return lo + step * rng.int(0, (hi - lo) / step);
};

interface ApproachParams {
  pair: number;
  mode: number;
  /** The first traveller's speed, then the second's. */
  u: number;
  v: number;
  /** Hours from when the second sets off until they meet. */
  t: number;
  /** Hours the first sets off before the second; 0 for together. */
  h: number;
}

const meetGap = (p: ApproachParams): number => p.u * p.h + (p.u + p.v) * p.t;

function meetText(p: ApproachParams): string {
  const [a, b] = TRAVELLERS[p.pair];
  const { how } = TRAVEL[p.mode];
  return p.h === 0
    ? `${a} and ${b} are $${meetGap(p)}$ km apart. They set off at the same time, ${how} towards each other: ${a} at $${p.u}$ km/h and ${b} at $${p.v}$ km/h.`
    : `${a} and ${b} are $${meetGap(p)}$ km apart, ${how} towards each other. ${a} sets off first at $${p.u}$ km/h, and ${b} follows $${p.h}$ ${plural(p.h, 'hour', 'hours')} later at $${p.v}$ km/h.`;
}

/**
 * Two travellers heading towards each other, built from the time they
 * meet. Difficulty 2 adds driving speeds, and may give the first a head
 * start in time, which covers some of the gap before the gap closes at
 * both speeds together.
 */
function sampleMeet(rng: Rng, difficulty: number, delay: boolean, least = 1): ApproachParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const mode = rng.int(0, hard ? 2 : 1);
      return {
        pair: rng.int(0, TRAVELLERS.length - 1),
        mode,
        u: speedIn(rng, mode),
        v: speedIn(rng, mode),
        t: rng.int(least, hard ? 6 : 5),
        h: delay && hard && rng.chance(0.5) ? rng.int(1, 2) : 0,
      };
    },
    (p) => p.u !== p.v,
    { pair: 0, mode: 0, u: 3, v: 5, t: 2, h: 0 },
  );
}

function meetWorking(p: ApproachParams): SolutionStep[] {
  const D = meetGap(p);
  const closing = p.u + p.v;
  const [a] = TRAVELLERS[p.pair];
  if (p.h === 0) {
    return [
      { text: `Heading towards each other, the gap closes at $${p.u} + ${p.v} = ${closing}$ km/h. With $t$ for the hours:` },
      { tex: stackTex([`${p.u}t + ${p.v}t = ${D}`, `${closing}t = ${D}`]) },
      { tex: `t = ${D} \\div ${closing} = ${p.t}` },
    ];
  }
  return [
    { text: `In the first $${p.h}$ ${plural(p.h, 'hour', 'hours')} ${a} covers $${p.u * p.h}$ km alone. After that the gap closes at $${closing}$ km/h.` },
    { tex: stackTex([`${p.u * p.h} + ${closing}t = ${D}`, `${closing}t = ${D - p.u * p.h}`]) },
    { tex: `t = ${p.t}` },
  ];
}

/** When two travellers meet, typed in hours. */
const rateMeet: Generator<ApproachParams> = {
  id: 'lin-rate-meet',
  choices: (p) => {
    const D = meetGap(p);
    return numberChoices(p.t, D / p.u, D / p.v, D / (p.u + p.v), p.t + p.h + 1);
  },
  sample: (rng, difficulty) => sampleMeet(rng, difficulty, true),
  render: (p): Slide => {
    const [, b] = TRAVELLERS[p.pair];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${meetText(p)} ${p.h === 0 ? 'After how many hours do they meet?' : `How many hours after ${b} sets off do they meet?`}`,
        },
      ],
      lead: '\\text{hours} =',
      keypad: [],
      answer: `${p.t}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: meetWorking,
};

/**
 * Where two travellers meet, as a tree: how fast the gap closes, the time
 * that takes, and how far each has gone. The two distances add back up to
 * the gap, which is the check.
 */
const rateWhereTree: Generator<ApproachParams> = {
  id: 'lin-rate-where-tree',
  sample: (rng, difficulty) => sampleMeet(rng, difficulty, false),
  render: (p): Slide => {
    const [a, b] = TRAVELLERS[p.pair];
    const D = meetGap(p);
    const answer = [`${p.u + p.v}`, `${p.t}`, `${p.u * p.t}`, `${p.v * p.t}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${meetText(p)} Fill the tree: how fast the gap closes, the hours until they meet, then how far ${a} and ${b} have each gone.`,
        },
      ],
      expression: `t = ${D} \\div (${p.u} + ${p.v})`,
      nodes: [
        { id: 'closing', from: [] },
        { id: 'time', from: ['closing'] },
        { id: 'first', from: ['time'] },
        { id: 'second', from: ['time'] },
      ],
      bank: treeBank(answer, [Math.abs(p.v - p.u), D / Math.abs(p.v - p.u), p.u * p.t + p.u, D - p.u], p.t),
      answer,
    };
  },
  solution: (p) => {
    const [a, b] = TRAVELLERS[p.pair];
    return [
      ...meetWorking(p),
      { text: `${a} has gone $${p.u} \\times ${p.t} = ${p.u * p.t}$ km and ${b} $${p.v} \\times ${p.t} = ${p.v * p.t}$ km, which add up to the $${meetGap(p)}$ km gap.` },
    ];
  },
};

interface CatchParams {
  pair: number;
  mode: number;
  /** The one in front, then the one catching up. */
  u: number;
  v: number;
  /** Hours from the start of the picture until the catch. */
  t: number;
  /** Hours the one in front sets off before the other, from the same place; 0 for a head start in distance. */
  late: number;
}

/** The head start in km when both set off together. */
const catchAhead = (p: CatchParams): number => (p.late === 0 ? (p.v - p.u) * p.t : 0);

function catchText(p: CatchParams): string {
  const [a, b] = TRAVELLERS[p.pair];
  const { how } = TRAVEL[p.mode];
  return p.late === 0
    ? `${a} and ${b} set off at the same time along the same road, ${how}. ${a} starts $${catchAhead(p)}$ km ahead at $${p.u}$ km/h, and ${b} follows at $${p.v}$ km/h.`
    : `${a} sets off along a road, ${how} at $${p.u}$ km/h. ${b} leaves the same place $${p.late}$ ${plural(p.late, 'hour', 'hours')} later at $${p.v}$ km/h.`;
}

function catchAsk(p: CatchParams): string {
  const [a, b] = TRAVELLERS[p.pair];
  return p.late === 0 ? `After how many hours does ${b} catch up?` : `How many hours after ${a} set off does ${b} catch up?`;
}

/**
 * One traveller catching another, built from the time of the catch.
 * Difficulty 1 gives a head start in distance; difficulty 2 mostly gives
 * one in time, where the one behind sets off later from the same place, so
 * the faster speed has to be one that makes the catch fall on a whole hour.
 */
function sampleCatch(rng: Rng, difficulty: number, allowLate: boolean): CatchParams {
  const hard = difficulty > 1;
  const late = allowLate && hard && rng.chance(0.7) ? rng.int(1, 3) : 0;
  return drawUntil(
    () => {
      const mode = rng.int(0, hard ? 2 : 1);
      const u = speedIn(rng, mode);
      const t = rng.int(late + 1, hard ? 10 : 8);
      const step = TRAVEL[mode].step;
      return {
        pair: rng.int(0, TRAVELLERS.length - 1),
        mode,
        u,
        v: late === 0 ? u + step * rng.int(1, 5) : (u * t) / (t - late),
        t,
        late,
      };
    },
    (p) => Number.isInteger(p.v) && p.v > p.u && p.v <= 2 * TRAVEL[p.mode].hi,
    late === 0 ? { pair: 0, mode: 0, u: 3, v: 5, t: 3, late: 0 } : { pair: 0, mode: 0, u: 4, v: 8, t: 2, late: 1 },
  );
}

function catchWorking(p: CatchParams): SolutionStep[] {
  const [a, b] = TRAVELLERS[p.pair];
  if (p.late === 0) {
    const s = catchAhead(p);
    return [
      { text: `After $t$ hours ${a} is $${s} + ${p.u}t$ km from ${b}'s start and ${b} is $${p.v}t$ km. They are level when these are equal.` },
      { tex: stackTex([`${p.v}t = ${s} + ${p.u}t`, `${leadTerm(p.v - p.u, 't')} = ${s}`]) },
      { tex: `t = ${p.t}` },
    ];
  }
  return [
    { text: `After $t$ hours from ${a}'s start, ${a} has gone $${p.u}t$ km and ${b}, who has had $t - ${p.late}$ hours, has gone $${p.v}(t - ${p.late})$ km.` },
    { tex: stackTex([`${p.v}(t - ${p.late}) = ${p.u}t`, `${p.v}t - ${p.v * p.late} = ${p.u}t`]) },
    { tex: stackTex([`${leadTerm(p.v - p.u, 't')} = ${p.v * p.late}`, `t = ${p.t}`]) },
  ];
}

/**
 * Catching up, read off a distance-time graph: two straight lines, the one
 * catching up steeper, crossing at the catch.
 */
const rateCatch: Generator<CatchParams> = {
  id: 'lin-rate-catch',
  sample: (rng, difficulty) => sampleCatch(rng, difficulty, true),
  render: (p): Slide => {
    const [a, b] = TRAVELLERS[p.pair];
    const width = p.t > 8 ? 12 : 10;
    const ahead = catchAhead(p);
    const front = (s: number) => ahead + p.u * s;
    const behind = (s: number) => p.v * Math.max(0, s - p.late);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${catchText(p)} ${catchAsk(p)} The solid line is ${a} and the dashed line ${b}: distance against time in hours.`,
        },
      ],
      min: 0,
      max: width,
      step: 1,
      answer: p.t,
      readout: '\\text{hours} = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: width,
          yMin: 0,
          yMax: Math.max(front(width), behind(width)) + 2,
          curves: [{ f: front }, { f: behind, dashed: true }],
          label: 'Two straight distance-time lines, the dashed one steeper, crossing once',
        }),
        ...markerWindow(0, width),
      },
    };
  },
  solution: catchWorking,
};

interface TankParams {
  /** Litres in the tank at the start. */
  v0: number;
  /** Litres a minute in, and out. */
  fill: number;
  drain: number;
  /** Minutes until the target. */
  t: number;
}

const tankNet = (p: TankParams): number => p.fill - p.drain;
const tankEnd = (p: TankParams): number => p.v0 + tankNet(p) * p.t;

const tankText = (p: TankParams): string =>
  `A tank has $${p.v0}$ litres in it. Water flows in at $${p.fill}$ litres a minute and drains out at $${p.drain}$ litres a minute.`;

/**
 * A tank filling as it drains, built from the minutes. Difficulty 1 always
 * fills; difficulty 2 may drain faster than it fills, so the level falls.
 * The net rate is never $0$ or $\pm 1$, so there is always a division left.
 */
function sampleTank(rng: Rng, difficulty: number): TankParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const falling = hard && rng.chance(0.5);
      const a = rng.int(hard ? 3 : 4, hard ? 20 : 12);
      const b = rng.int(1, a - 2);
      return {
        v0: 10 * rng.int(falling ? 10 : 1, falling ? 40 : 10),
        fill: falling ? b : a,
        drain: falling ? a : b,
        t: rng.int(2, hard ? 15 : 12),
      };
    },
    (p) => Math.abs(tankNet(p)) >= 2 && tankEnd(p) >= 5,
    { v0: 20, fill: 7, drain: 3, t: 5 },
  );
}

function tankWorking(p: TankParams): SolutionStep[] {
  const net = tankNet(p);
  const V = tankEnd(p);
  return [
    {
      text: `Each minute the level ${net > 0 ? 'rises' : 'falls'} by $${Math.abs(net)}$ litres, so after $t$ minutes it holds $${p.v0} ${signedTile(net, 't')}$.`,
    },
    { tex: `${p.v0} + (${p.fill} - ${p.drain})t = ${V}` },
    { tex: stackTex([`${leadTerm(net, 't')} = ${V - p.v0}`, `t = ${p.t}`]) },
  ];
}

/** The tank's equation solved a step at a time: the net rate, the number moved across, the division. */
const rateTank: Generator<TankParams> = {
  id: 'lin-rate-tank',
  sample: sampleTank,
  render: (p): Slide => {
    const net = tankNet(p);
    const V = tankEnd(p);
    const term = leadTerm(net, 't');
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${tankText(p)} After how many minutes does it hold $${V}$ litres? ${HOW_TO_STEP}`,
        },
      ],
      start: [`${p.v0}`, `+ (${p.fill} - ${p.drain})t`, '=', `${V}`],
      reductions: [
        {
          span: [1, 2],
          value: signedTile(net, 't'),
          bank: stepBank(signedTile(net, 't'), signedTile(p.fill + p.drain, 't'), signedTile(-net, 't'), signedTile(p.fill, 't')),
        },
        {
          span: [0, 4],
          value: `${term} = ${V - p.v0}`,
          bank: stepBank(`${term} = ${V - p.v0}`, `${term} = ${V + p.v0}`, `${term} = ${p.v0 - V}`, `${term} = ${V}`),
        },
        {
          span: [0, 1],
          value: `t = ${p.t}`,
          bank: stepBank(`t = ${p.t}`, `t = ${p.t + 1}`, `t = ${-p.t}`, `t = ${V - p.v0 - net}`),
        },
      ],
    };
  },
  solution: tankWorking,
};

type RateTilesParams =
  | ({ kind: 'meet' } & ApproachParams)
  | ({ kind: 'catch' } & CatchParams)
  | ({ kind: 'tank' } & TankParams);

/**
 * The equation for a rates story, placed as tiles: meeting (the two
 * distances add to the gap), catching up (level when the distances match),
 * or a tank (start plus the net rate times the minutes). The bank holds the
 * combined speed or rate, which the equation collects to rather than holds.
 */
const rateTiles: Generator<RateTilesParams> = {
  id: 'lin-rate-tiles',
  sample: (rng, difficulty) => {
    const kind = rng.pick(['meet', 'catch', 'tank'] as const);
    if (kind === 'meet') return { kind, ...sampleMeet(rng, difficulty, false) };
    if (kind === 'catch') return { kind, ...sampleCatch(rng, difficulty, false) };
    return { kind, ...sampleTank(rng, difficulty) };
  },
  render: (p): Slide => {
    if (p.kind === 'meet') {
      const answer = [`${p.u}`, `${p.v}`, `${meetGap(p)}`];
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text: `${meetText(p)} Let $t$ be the hours until they meet. Write the equation that says their two distances make up the gap.`,
          },
        ],
        template: '{0}t + {1}t = {2}',
        bank: bankOf(answer, [`${p.u + p.v}`, `${Math.abs(p.v - p.u)}`, `${p.t}`]),
        answer,
      };
    }
    if (p.kind === 'catch') {
      const [, b] = TRAVELLERS[p.pair];
      const answer = [`${p.v}`, `${catchAhead(p)}`, `${p.u}`];
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text: `${catchText(p)} Let $t$ be the hours until ${b} catches up. Write the equation that says they are then the same distance from ${b}'s start.`,
          },
        ],
        template: '{0}t = {1} + {2}t',
        bank: bankOf(answer, [`${p.v - p.u}`, `${p.u + p.v}`, `${p.t}`]),
        answer,
      };
    }
    const answer = [`${p.v0}`, `${p.fill}`, `${p.drain}`, `${tankEnd(p)}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${tankText(p)} Let $t$ be the minutes until it holds $${tankEnd(p)}$ litres. Write the equation.`,
        },
      ],
      template: '{0} + ({1} - {2})t = {3}',
      bank: bankOf(answer, [`${Math.abs(tankNet(p))}`, `${p.fill + p.drain}`, `${p.t}`]),
      answer,
    };
  },
  solution: (p) => {
    if (p.kind === 'meet') return meetWorking(p);
    if (p.kind === 'catch') return catchWorking(p);
    return tankWorking(p);
  },
};

/* ---------- Lesson 4: mixtures ---------- */

interface MixPrice {
  a: string;
  b: string;
  blend: string;
  /** Each ingredient named in a lead, short. */
  short: readonly [string, string];
}

const MIX_PRICE: readonly MixPrice[] = [
  { a: 'Kenyan beans', b: 'Brazilian beans', blend: 'coffee', short: ['Kenyan', 'Brazilian'] },
  { a: 'Assam tea', b: 'Ceylon tea', blend: 'tea', short: ['Assam', 'Ceylon'] },
  { a: 'cashews', b: 'peanuts', blend: 'mixed nuts', short: ['cashews', 'peanuts'] },
  { a: 'chocolates', b: 'toffees', blend: 'pick-and-mix', short: ['chocolates', 'toffees'] },
  { a: 'sunflower seed', b: 'millet', blend: 'bird seed', short: ['sunflower', 'millet'] },
];

const MIX_STRENGTH: readonly { who: string; stuff: string }[] = [
  { who: 'A lab', stuff: 'acid' },
  { who: 'A chemist', stuff: 'salt' },
  { who: 'A drinks maker', stuff: 'juice' },
  { who: 'A gardener', stuff: 'plant feed' },
];

interface MixParams {
  kind: 'price' | 'strength';
  story: number;
  /** The dearer or stronger one, then the other: pounds per kg, or per cent. */
  a: number;
  b: number;
  /** How much of each goes in. */
  x: number;
  y: number;
}

const mixTotal = (p: MixParams): number => p.x + p.y;
const mixTarget = (p: MixParams): number => (p.a * p.x + p.b * p.y) / mixTotal(p);
const mixUnit = (p: MixParams): string => (p.kind === 'price' ? 'kg' : 'litres');

function mixText(p: MixParams): string {
  const M = mixTotal(p);
  const m = mixTarget(p);
  if (p.kind === 'price') {
    const s = MIX_PRICE[p.story];
    return `A shop blends ${s.a} at ${pounds(p.a)} per kg with ${s.b} at ${pounds(p.b)} per kg, to make $${M}$ kg of ${s.blend} at ${pounds(m)} per kg.`;
  }
  const s = MIX_STRENGTH[p.story];
  return `${s.who} mixes a solution that is $${p.a}\\%$ ${s.stuff} with one that is $${p.b}\\%$ ${s.stuff}, to make $${M}$ litres that is $${m}\\%$ ${s.stuff}.`;
}

/** The first ingredient, then the second, as the prose names them. */
function mixNames(p: MixParams): [string, string] {
  if (p.kind === 'price') return [MIX_PRICE[p.story].a, MIX_PRICE[p.story].b];
  return [`the $${p.a}\\%$ solution`, `the $${p.b}\\%$ one`];
}

function mixLetters(p: MixParams): string {
  const [first, second] = mixNames(p);
  return `Let $x$ ${mixUnit(p)} be ${first} and $y$ ${mixUnit(p)} be ${second}.`;
}

/** A lead or readout naming how much of one ingredient: `\text{kg of cashews}`. */
function mixLead(p: MixParams, which: 0 | 1): string {
  if (p.kind === 'price') return `\\text{kg of ${MIX_PRICE[p.story].short[which]}}`;
  return `\\text{litres at } ${which === 0 ? p.a : p.b}\\%`;
}

/**
 * A blend built from its amounts. The target has to be whole, so once the
 * amount of the first is drawn, the gap between the two prices or strengths
 * is a multiple of whatever makes the weighted average come out whole.
 * Difficulty 1 blends by price; difficulty 2 may blend by strength, with
 * per cents in fives, and has larger amounts.
 */
function sampleMix(rng: Rng, difficulty: number, most?: number): MixParams {
  const hard = difficulty > 1;
  const kind = hard && rng.chance(0.5) ? 'strength' : 'price';
  return drawUntil(
    () => {
      const M = rng.int(hard ? 10 : 6, most ?? (hard ? 40 : 20));
      const x = rng.int(1, M - 1);
      const unit = M / gcd(M, x);
      if (kind === 'price') {
        const b = rng.int(2, hard ? 20 : 10);
        return { kind, story: rng.int(0, MIX_PRICE.length - 1), a: b + unit * rng.int(1, 4), b, x, y: M - x };
      }
      const b = 5 * rng.int(1, 8);
      return { kind, story: rng.int(0, MIX_STRENGTH.length - 1), a: b + lcm(unit, 5) * rng.int(1, 3), b, x, y: M - x };
    },
    (p) => p.a - p.b >= 2 && p.a - p.b <= (p.kind === 'price' ? (hard ? 20 : 12) : 60) && p.a <= 90,
    { kind: 'price', story: 0, a: 9, b: 4, x: 6, y: 4 },
  );
}

function mixWorking(p: MixParams): SolutionStep[] {
  const M = mixTotal(p);
  const total = mixTarget(p) * M;
  const G = p.a - p.b;
  return [
    { text: `${mixLetters(p)} The amounts give $x + y = ${M}$, so $y = ${M} - x$.` },
    {
      text:
        p.kind === 'price'
          ? `The cost of the whole blend is $${mixTarget(p)} \\times ${M} = ${total}$ pounds:`
          : `Counting per cent times litres, the mixture holds $${mixTarget(p)} \\times ${M} = ${total}$:`,
      tex: `${p.a}x + ${p.b}(${M} - x) = ${total}`,
    },
    { tex: stackTex([`${leadTerm(G, 'x')} + ${p.b * M} = ${total}`, `${leadTerm(G, 'x')} = ${total - p.b * M}`]) },
    { tex: `x = ${p.x}, \\quad y = ${p.y}` },
  ];
}

type MixWrong = 'forgot' | 'swap' | 'total' | 'minus';

interface MixPairParams extends MixParams {
  /** The three wrong pairs: the target not multiplied up, prices swapped, totals swapped, a minus for a plus. */
  wrong: MixWrong[];
}

/**
 * Which pair of equations is the blend? The amounts give one and the cost
 * (or the strength) gives the other. The two amounts always differ, or the
 * pair with the prices swapped would be true as well.
 */
const mixPair: Generator<MixPairParams> = {
  id: 'lin-mix-pair',
  sample: (rng, difficulty) => ({
    ...drawUntil(() => sampleMix(rng, difficulty), (p) => p.x !== p.y, { kind: 'price', story: 0, a: 9, b: 4, x: 6, y: 4 }),
    wrong: rng.sample(['forgot', 'swap', 'total', 'minus'] as const, 3),
  }),
  render: (p): Slide => {
    const M = mixTotal(p);
    const m = mixTarget(p);
    const pair = (change?: MixWrong) =>
      stackTex([
        change === 'total' ? `x + y = ${m * M}` : change === 'minus' ? `x - y = ${M}` : `x + y = ${M}`,
        `${change === 'swap' ? `${p.b}x + ${p.a}y` : `${p.a}x + ${p.b}y`} = ${change === 'forgot' ? m : change === 'total' ? M : m * M}`,
      ]);
    return sortedChoice(
      [
        {
          kind: 'prose',
          text: `${mixText(p)} ${mixLetters(p)} Which pair of equations describes the ${p.kind === 'price' ? 'blend' : 'mixture'}?`,
        },
      ],
      labelChoices(pair(), ...p.wrong.map(pair)),
    );
  },
  solution: (p) => {
    const M = mixTotal(p);
    const m = mixTarget(p);
    return [
      { text: `The amounts add up to the whole: $x + y = ${M}$.` },
      {
        text:
          p.kind === 'price'
            ? `Each kg of the first costs ${pounds(p.a)} and each kg of the second ${pounds(p.b)}, and the whole $${M}$ kg costs $${m} \\times ${M}$:`
            : `Each litre of the first carries $${p.a}$ per cent and each litre of the second $${p.b}$, and the whole $${M}$ litres carries $${m} \\times ${M}$:`,
        tex: `${p.a}x + ${p.b}y = ${m * M}`,
      },
    ];
  },
};

/**
 * The cost (or strength) equation placed as tiles. The target itself is in
 * the bank beside the target times the amount, since leaving it unmultiplied
 * is the usual slip.
 */
const mixTiles: Generator<MixParams> = {
  id: 'lin-mix-tiles',
  sample: (rng, difficulty) => sampleMix(rng, difficulty),
  render: (p): Slide => {
    const M = mixTotal(p);
    const m = mixTarget(p);
    const answer = [`${p.a}`, `${p.b}`, `${m * M}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${mixText(p)} ${mixLetters(p)} Along with $x + y = ${M}$, write the equation for the ${p.kind === 'price' ? 'cost' : MIX_STRENGTH[p.story].stuff}.`,
        },
      ],
      template: '{0}x + {1}y = {2}',
      bank: bankOf(answer, [`${m}`, `${M}`, `${p.a + p.b}`]),
      answer,
    };
  },
  solution: (p) => mixWorking(p).slice(0, 2),
};

interface MixSolveParams extends MixParams {
  /** Which amount is asked for: 0 the first, 1 the second. */
  ask: 0 | 1;
}

/** How much of one ingredient, typed. Difficulty 2 may ask for the second. */
const mixSolve: Generator<MixSolveParams> = {
  id: 'lin-mix-solve',
  choices: (p) => {
    const value = p.ask === 0 ? p.x : p.y;
    return numberChoices(value, p.ask === 0 ? p.y : p.x, Math.round(mixTotal(p) / 2), value + 1);
  },
  sample: (rng, difficulty) => ({ ...sampleMix(rng, difficulty), ask: difficulty > 1 ? rng.pick([0, 1] as const) : 0 }),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `${mixText(p)} How many ${mixUnit(p)} of ${mixNames(p)[p.ask]} go in?` }],
    lead: `${mixLead(p, p.ask)} =`,
    keypad: [],
    answer: `${p.ask === 0 ? p.x : p.y}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => [
    ...mixWorking(p),
    { text: `The question asks for ${mixNames(p)[p.ask]}: $${p.ask === 0 ? p.x : p.y}$ ${mixUnit(p)}.` },
  ],
};

/**
 * The blend solved by substitution, a step at a time: the bracket
 * multiplied out, like terms collected, the number moved across, the
 * division. The first step's slip is multiplying only the first term.
 */
const mixSubstituteSteps: Generator<MixParams> = {
  id: 'lin-mix-substitute-steps',
  sample: (rng, difficulty) => sampleMix(rng, difficulty),
  render: (p): Slide => {
    const M = mixTotal(p);
    const total = mixTarget(p) * M;
    const G = p.a - p.b;
    const bM = p.b * M;
    const term = leadTerm(G, 'x');
    const [first, second] = mixNames(p);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${mixText(p)} With $x$ ${mixUnit(p)} of ${first}, there are $${M} - x$ of ${second}, which gives the equation below. Solve it. ${HOW_TO_STEP}`,
        },
      ],
      start: [`${p.a}x`, `+ ${p.b}(${M} - x)`, '=', `${total}`],
      reductions: [
        {
          span: [1, 2],
          value: `+ ${bM} - ${p.b}x`,
          bank: stepBank(`+ ${bM} - ${p.b}x`, `+ ${bM} - x`, `+ ${M} - ${p.b}x`, `+ ${bM} + ${p.b}x`),
        },
        {
          span: [0, 2],
          value: `${term} + ${bM}`,
          bank: stepBank(`${term} + ${bM}`, `${leadTerm(p.a + p.b, 'x')} + ${bM}`, `${term} - ${bM}`, `${leadTerm(p.a * p.b, 'x')} + ${bM}`),
        },
        {
          span: [0, 3],
          value: `${term} = ${total - bM}`,
          bank: stepBank(`${term} = ${total - bM}`, `${term} = ${total + bM}`, `${term} = ${total}`, `${term} = ${bM - total}`),
        },
        {
          span: [0, 1],
          value: `x = ${p.x}`,
          bank: stepBank(`x = ${p.x}`, `x = ${p.y}`, `x = ${p.x + 1}`, `x = ${total - bM - G}`),
        },
      ],
    };
  },
  solution: (p) => mixWorking(p).slice(1),
};

/**
 * The blend read off a graph: the price (or strength) of the whole as the
 * amount of the first goes from none to all of it, a straight line from one
 * price to the other, and the dashed target.
 */
const mixSlider: Generator<MixParams> = {
  id: 'lin-mix-slider',
  sample: (rng, difficulty) => sampleMix(rng, difficulty, difficulty > 1 ? 24 : 16),
  render: (p): Slide => {
    const M = mixTotal(p);
    const G = p.a - p.b;
    const [first] = mixNames(p);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${mixText(p)} The line shows the ${p.kind === 'price' ? 'price per kg' : 'strength'} of the $${M}$ ${mixUnit(p)} for each amount of ${first} in it, and the dashed line is the target. Slide to the amount of ${first}.`,
        },
      ],
      min: 0,
      max: M,
      step: 1,
      answer: p.x,
      readout: `${mixLead(p, 0)} = {v}`,
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: M,
          yMin: Math.max(0, p.b - G / 4),
          yMax: p.a + G / 4,
          curves: [{ f: (s: number) => p.b + (G * s) / M }],
          horizontals: [mixTarget(p)],
          label: 'A straight line rising from one price to the other, and a dashed line at the target',
        }),
        ...markerWindow(0, M),
      },
    };
  },
  solution: (p) => [{ text: 'The line meets the target where the blend has the right amount of each.' }, ...mixWorking(p)],
};

const MIX_YES = 'Yes';
const MIX_NO = 'No';

type MixLean = 'even' | 'first' | 'second';

const mixLean = (p: MixParams): MixLean => (p.x === p.y ? 'even' : p.x > p.y ? 'first' : 'second');

/**
 * Which is there more of, without solving: the target sits nearer the price
 * (or strength) there is more of, and exactly halfway for equal amounts.
 * The three cases are drawn equally.
 */
const mixFlow: Generator<MixParams> = {
  id: 'lin-mix-flow',
  sample: (rng, difficulty) => {
    const lean = rng.pick(['even', 'first', 'second'] as const);
    return drawUntil(
      () => sampleMix(rng, difficulty),
      (p) => mixLean(p) === lean,
      lean === 'even'
        ? { kind: 'price', story: 0, a: 9, b: 5, x: 4, y: 4 }
        : lean === 'first'
          ? { kind: 'price', story: 0, a: 9, b: 4, x: 6, y: 4 }
          : { kind: 'price', story: 0, a: 9, b: 4, x: 4, y: 6 },
    );
  },
  render: (p): Slide => {
    const m = mixTarget(p);
    const [first, second] = mixNames(p);
    const pc = p.kind === 'price' ? '' : '\\%';
    const lean = mixLean(p);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `${mixText(p)} Without solving, which is there more of?` }],
      subject: `${p.b}${pc} < ${m}${pc} < ${p.a}${pc}`,
      steps: [
        {
          id: 'half',
          ask: `Is $${m}${pc}$ exactly halfway between $${p.b}${pc}$ and $${p.a}${pc}$?`,
          branches: [
            { label: MIX_YES, outcome: 'Equal amounts of each.' },
            { label: MIX_NO, to: 'near' },
          ],
        },
        {
          id: 'near',
          ask: `Is $${m}${pc}$ nearer to $${p.a}${pc}$, the ${p.kind === 'price' ? 'dearer' : 'stronger'} one?`,
          branches: [
            { label: MIX_YES, outcome: `More of ${first}.` },
            { label: MIX_NO, outcome: `More of ${second}.` },
          ],
        },
      ],
      answer: lean === 'even' ? [MIX_YES] : [MIX_NO, lean === 'first' ? MIX_YES : MIX_NO],
    };
  },
  solution: (p) => {
    const m = mixTarget(p);
    const [first, second] = mixNames(p);
    return [
      { text: `The target is $${m - p.b}$ above the lower and $${p.a - m}$ below the higher.` },
      {
        text:
          mixLean(p) === 'even'
            ? 'That is exactly halfway, so there are equal amounts of each.'
            : `It sits nearer ${mixLean(p) === 'first' ? first : second}, so there is more of that one.`,
      },
      { text: `Solving confirms it: $${p.x}$ ${mixUnit(p)} of ${first} and $${p.y}$ of ${second}.` },
    ];
  },
};

/* ---------- Lesson 5: reading the model back ---------- */

interface ChargeStory {
  who: string;
  fee: string;
  per: string;
  letter: string;
  units: string;
}

const CHARGE_STORIES: readonly ChargeStory[] = [
  { who: 'A plumber', fee: 'to call out', per: 'an hour', letter: 'h', units: 'hours' },
  { who: 'An electrician', fee: 'to call out', per: 'an hour', letter: 'h', units: 'hours' },
  { who: 'A dog walker', fee: 'to sign up', per: 'a walk', letter: 'w', units: 'walks' },
  { who: 'A gym', fee: 'to join', per: 'a class', letter: 'k', units: 'classes' },
  { who: 'A van hire firm', fee: 'up front', per: 'a day', letter: 'd', units: 'days' },
];

interface ChargeParams {
  story: number;
  fee: number;
  rate: number;
  /** How many hours, walks, classes or days. */
  n: number;
}

const chargeText = (p: ChargeParams): string => {
  const s = CHARGE_STORIES[p.story];
  return `${s.who} charges ${pounds(p.fee)} ${s.fee} plus ${pounds(p.rate)} ${s.per}.`;
};

function sampleCharge(rng: Rng, difficulty: number): ChargeParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => ({
      story: rng.int(0, CHARGE_STORIES.length - 1),
      fee: rng.int(5, hard ? 90 : 40),
      rate: rng.int(2, hard ? 45 : 25),
      n: rng.int(2, hard ? 12 : 8),
    }),
    (p) => p.fee !== p.rate,
    { story: 0, fee: 30, rate: 20, n: 3 },
  );
}

type BackWhichParams =
  | { kind: 'charge'; charge: ChargeParams; wrong: number[] }
  | { kind: 'meet'; meet: ApproachParams; wrong: number[] }
  | { kind: 'even'; even: EvenParams; wrong: number[] }
  | { kind: 'mix'; mix: MixParams; wrong: number[] };

/** The story, the letter it uses, the equation that fits, and four that do not. */
function whichModel(p: BackWhichParams): { text: string; right: string; wrong: string[] } {
  if (p.kind === 'charge') {
    const c = p.charge;
    const s = CHARGE_STORIES[c.story];
    const L = s.letter;
    const T = c.fee + c.rate * c.n;
    return {
      text: `${chargeText(c)} One bill came to ${pounds(T)} for $${L}$ ${s.units}.`,
      right: `${c.fee} + ${c.rate}${L} = ${T}`,
      wrong: [
        `(${c.fee} + ${c.rate})${L} = ${T}`,
        `${c.fee}${L} + ${c.rate} = ${T}`,
        `${c.rate}${L} - ${c.fee} = ${T}`,
        `${c.rate}(${L} + ${c.fee}) = ${T}`,
      ],
    };
  }
  if (p.kind === 'meet') {
    const m = p.meet;
    const D = meetGap(m);
    return {
      text: `${meetText(m)} Let $t$ be the hours until they meet.`,
      right: `(${m.u} + ${m.v})t = ${D}`,
      wrong: [
        `(${Math.max(m.u, m.v)} - ${Math.min(m.u, m.v)})t = ${D}`,
        `${m.u}t = ${m.v}t + ${D}`,
        `${m.u} + ${m.v} = ${D}t`,
        `${D} - ${m.u}t = ${m.v}`,
      ],
    };
  }
  if (p.kind === 'even') {
    const e = p.even;
    const F = evenFixed(e);
    const price = evenPrice(e);
    return {
      text: `${evenText(e)} Let $n$ be the number sold at break-even.`,
      right: `${price}n = ${F} + ${e.c}n`,
      wrong: [`${e.c}n = ${F} + ${price}n`, `${price}n + ${F} = ${e.c}n`, `${price}n = ${F} - ${e.c}n`, `${price}n - ${e.c}n = ${F}n`],
    };
  }
  const x = p.mix;
  const M = mixTotal(x);
  const total = mixTarget(x) * M;
  return {
    text: `${mixText(x)} Let $x$ ${mixUnit(x)} be ${mixNames(x)[0]}.`,
    right: `${x.a}x + ${x.b}(${M} - x) = ${total}`,
    wrong: [
      `${x.a}x + ${x.b}x = ${total}`,
      `${x.a}x + ${x.b}(${M} - x) = ${mixTarget(x)}`,
      `${x.b}x + ${x.a}(${M} - x) = ${total}`,
      `${x.a}x + ${x.b}(x - ${M}) = ${total}`,
    ],
  };
}

/**
 * Which equation fits the story? Every wrong one is a real slip — the
 * bracket in the wrong place, the rates subtracted, the sides swapped — and
 * none of them is true at the story's answer, which the story is built to
 * make sure of. Difficulty 2 adds mixtures and has larger numbers.
 */
const backWhich: Generator<BackWhichParams> = {
  id: 'lin-back-which',
  sample: (rng, difficulty) => {
    const kind = rng.pick(difficulty > 1 ? (['charge', 'meet', 'even', 'mix'] as const) : (['charge', 'meet', 'even'] as const));
    const wrong = rng.sample([0, 1, 2, 3], 3);
    if (kind === 'charge') return { kind, charge: sampleCharge(rng, difficulty), wrong };
    if (kind === 'meet') return { kind, meet: sampleMeet(rng, difficulty, false, 2), wrong };
    if (kind === 'even') return { kind, even: sampleEven(rng, difficulty), wrong };
    return {
      kind,
      mix: drawUntil(() => sampleMix(rng, difficulty), (m) => m.x !== m.y, { kind: 'price', story: 0, a: 9, b: 4, x: 6, y: 4 }),
      wrong,
    };
  },
  render: (p): Slide => {
    const model = whichModel(p);
    return sortedChoice(
      [{ kind: 'prose', text: `${model.text} Which equation fits the story?` }],
      labelChoices(model.right, ...p.wrong.map((i) => model.wrong[i])),
    );
  },
  solution: (p) => {
    const model = whichModel(p);
    const reason: Record<BackWhichParams['kind'], string> = {
      charge: 'The fee is paid once and the rate once for each, so the total is the fee plus the rate times the number.',
      meet: 'Heading towards each other, the two distances add up to the gap, so the speeds add.',
      even: 'At break-even the income equals the fixed cost plus the cost of making each one.',
      mix: 'The first ingredient is $x$ and the rest of the amount is the second, and their costs add up to the whole.',
    };
    return [{ text: reason[p.kind] }, { tex: model.right }];
  },
};

type SenseParams =
  | { kind: 'even'; story: number; c: number; g: number; n: number; half: boolean }
  | { kind: 'catch'; catch: CatchParams; slower: boolean }
  | { kind: 'mix'; mix: MixParams };

const SENSE_YES = 'Yes';
const SENSE_NO = 'No';
const SENSE_WHOLE = 'A count has to be a whole number';
const SENSE_NEGATIVE = 'A time cannot be negative';
const SENSE_OVER = 'It is more than the whole amount';

/** The story, the model and what solving it gave. */
function senseModel(p: SenseParams): { text: string; letter: string; value: string; reason?: string } {
  if (p.kind === 'even') {
    const F = p.g * p.n + (p.half ? p.g / 2 : 0);
    const price = p.c + p.g;
    return {
      text: `${evenSentence(p.story, F, p.c, price, false)} Solving $${price}n = ${F} + ${p.c}n$ for the break-even number gives`,
      letter: 'n',
      value: p.half ? `${p.n}.5` : `${p.n}`,
      reason: p.half ? SENSE_WHOLE : undefined,
    };
  }
  if (p.kind === 'catch') {
    const c = p.catch;
    const s = catchAhead(c);
    const [a, b] = TRAVELLERS[c.pair];
    const { how } = TRAVEL[c.mode];
    const [front, back] = p.slower ? [c.v, c.u] : [c.u, c.v];
    return {
      text: `${a} and ${b} set off at the same time along the same road, ${how}. ${a} starts $${s}$ km ahead at $${front}$ km/h, and ${b} follows at $${back}$ km/h. Solving $${back}t = ${s} + ${front}t$ for when ${b} catches up gives`,
      letter: 't',
      value: `${p.slower ? -c.t : c.t}`,
      reason: p.slower ? SENSE_NEGATIVE : undefined,
    };
  }
  const x = p.mix;
  const M = mixTotal(x);
  const total = mixTarget(x) * M;
  return {
    text: `${mixText(x)} Solving $${x.a}x + ${x.b}(${M} - x) = ${total}$ for the ${mixUnit(x)} of ${mixNames(x)[0]} gives`,
    letter: 'x',
    value: `${x.x}`,
    reason: x.y < 0 ? SENSE_OVER : undefined,
  };
}

/**
 * Does the answer make sense? A break-even count of a half, a catch-up time
 * that is negative because the one behind is slower, or an amount of one
 * ingredient more than the whole blend because the target is dearer than
 * both. About a third of the answers are fine. Difficulty 2 adds mixtures.
 */
const backSenseFlow: Generator<SenseParams> = {
  id: 'lin-back-sense-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick(hard ? (['even', 'catch', 'mix'] as const) : (['even', 'catch'] as const));
    const fine = rng.chance(0.35);
    if (kind === 'even') {
      const base = sampleEven(rng, difficulty);
      const g = fine ? base.g : 2 * rng.int(1, hard ? 6 : 3);
      return { kind, story: base.story, c: base.c, g, n: base.n, half: !fine };
    }
    if (kind === 'catch') return { kind, catch: sampleCatch(rng, difficulty, false), slower: !fine };
    if (fine) return { kind, mix: sampleMix(rng, difficulty) };
    // The target dearer than both: the amount of the first comes out more than the whole.
    const M = rng.int(6, 20);
    const x = rng.int(M + 1, 2 * M);
    const unit = M / gcd(M, x);
    const b = rng.int(2, 12);
    const a = b + unit * rng.int(1, Math.max(1, Math.floor(12 / unit)));
    return { kind, mix: { kind: 'price', story: rng.int(0, MIX_PRICE.length - 1), a, b, x, y: M - x } };
  },
  render: (p): Slide => {
    const model = senseModel(p);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `${model.text} $${model.letter} = ${model.value}$.` }],
      subject: `${model.letter} = ${model.value}`,
      steps: [
        {
          id: 'sense',
          ask: 'Does this answer make sense in the story?',
          branches: [
            { label: SENSE_YES, outcome: 'It stands as the answer.' },
            { label: SENSE_NO, to: 'why' },
          ],
        },
        {
          id: 'why',
          ask: 'What is wrong with it?',
          branches: [
            { label: SENSE_WHOLE, outcome: 'It cannot be a fraction of one.' },
            { label: SENSE_NEGATIVE, outcome: 'It cannot have happened before the start.' },
            { label: SENSE_OVER, outcome: 'One part cannot be more than the whole.' },
          ],
        },
      ],
      answer: model.reason ? [SENSE_NO, model.reason] : [SENSE_YES],
    };
  },
  solution: (p) => {
    const model = senseModel(p);
    const said: Record<string, string> = {
      [SENSE_WHOLE]: `Half an item cannot be sold. The model says $${model.value}$, so it takes $${Math.ceil(Number(model.value))}$ sales to cover the costs.`,
      [SENSE_NEGATIVE]: 'The one behind is slower, so the gap only grows: the negative time says they were level before they set off, and there is no catch-up.',
      [SENSE_OVER]: 'The target is dearer than both ingredients, so no blend can reach it: the amount of the first comes out more than the whole and the second negative.',
    };
    return [
      { tex: `${model.letter} = ${model.value}` },
      { text: model.reason ? said[model.reason] : 'It is whole, positive and no more than the whole amount, so it makes sense.' },
    ];
  },
};

type ChangeKind = 'price' | 'cost' | 'fixed' | 'cheaper';

interface ChangeParams {
  story: number;
  /** Fixed cost, cost to make one, and what each sale makes over its cost. */
  F: number;
  c: number;
  g: number;
  change: ChangeKind;
  /** How much the price or cost moves, or how many more sales the new fixed cost takes. */
  j: number;
  /** The old break-even count is stated. */
  told: boolean;
}

/** The margin after the change, and the new fixed cost. */
function changed(p: ChangeParams): { F: number; g: number } {
  if (p.change === 'fixed') return { F: p.F + p.g * p.j, g: p.g };
  return { F: p.F, g: p.change === 'cheaper' ? p.g - p.j : p.g + p.j };
}

function changeSentence(p: ChangeParams): string {
  const { item, setup } = EVEN_STORIES[p.story];
  const price = p.c + p.g;
  if (p.change === 'price') return `Next time each ${item} sells for ${pounds(price + p.j)} instead.`;
  if (p.change === 'cheaper') return `Next time each ${item} sells for ${pounds(price - p.j)} instead.`;
  if (p.change === 'cost') return `Next time each ${item} costs ${pounds(p.c - p.j)} to make instead.`;
  return `Next time it pays ${pounds(changed(p).F)} ${setup} instead.`;
}

/**
 * The effect of changing one number on the break-even count. A dearer
 * price or a cheaper cost widens what each sale makes, so fewer are needed;
 * a bigger fixed cost needs more. Built so both counts are whole: the fixed
 * cost is a multiple of both margins. Difficulty 1 states the old count;
 * difficulty 2 does not, and may lower the price.
 */
const backChange: Generator<ChangeParams> = {
  id: 'lin-back-change',
  choices: (p) => {
    const n = p.F / p.g;
    const after = changed(p);
    const n2 = after.F / after.g;
    return numberChoices(n2, n, n + (n - n2), n2 + 1);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const g = rng.int(2, hard ? 12 : 8);
        const change = rng.pick(hard ? (['price', 'cost', 'fixed', 'cheaper'] as const) : (['price', 'cost', 'fixed'] as const));
        const j = rng.int(1, hard ? 6 : 4);
        const g2 = change === 'fixed' ? g : change === 'cheaper' ? g - j : g + j;
        const L = g2 >= 1 ? lcm(g, g2) : g;
        return {
          story: rng.int(0, EVEN_STORIES.length - 1),
          F: L * rng.int(1, 12),
          c: rng.int(2, hard ? 15 : 8),
          g,
          change,
          j,
          told: !hard,
        };
      },
      (p) => {
        const after = changed(p);
        const n = p.F / p.g;
        return after.g >= 1 && n >= 3 && n <= (hard ? 60 : 30) && after.F % after.g === 0 && p.c - (p.change === 'cost' ? p.j : 0) >= 1;
      },
      { story: 0, F: 60, c: 3, g: 4, change: 'price', j: 1, told: true },
    );
  },
  render: (p): Slide => {
    const { items } = EVEN_STORIES[p.story];
    const after = changed(p);
    const n = p.F / p.g;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${evenSentence(p.story, p.F, p.c, p.c + p.g, false)}${p.told ? ` It breaks even at $${n}$ ${items}.` : ''} ${changeSentence(p)} How many must it sell now to break even?`,
        },
      ],
      lead: `\\text{${items}} =`,
      keypad: [],
      answer: `${after.F / after.g}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => {
    const after = changed(p);
    return [
      { text: `Before, each sale makes ${pounds(p.g)} over its cost, and $${p.F} \\div ${p.g} = ${p.F / p.g}$ sales cover the ${pounds(p.F)}.` },
      {
        text:
          p.change === 'fixed'
            ? `Now there is ${pounds(after.F)} to cover at ${pounds(p.g)} a sale.`
            : `Now each sale makes ${pounds(after.g)} over its cost, and there is still ${pounds(p.F)} to cover.`,
      },
      { tex: `n = ${after.F} \\div ${after.g} = ${after.F / after.g}` },
    ];
  },
};

type RearrangeKind = 'charge' | 'distance' | 'tank' | 'profit';

interface RearrangeParams {
  kind: RearrangeKind;
  /** A charge story, a traveller or a break-even story, by kind. */
  story: number;
  /** The number added to or taken from the letter term, then its coefficient. */
  a: number;
  b: number;
}

/** The formula as given, the letter to make the subject, and the tiles. */
function rearrangeModel(p: RearrangeParams): { text: string; formula: string; subject: string; answer: string[]; wrong: string[] } {
  if (p.kind === 'charge') {
    const s = CHARGE_STORIES[p.story];
    return {
      text: `${chargeText({ story: p.story, fee: p.a, rate: p.b, n: 1 })} So the bill $C$, in pounds, for $${s.letter}$ ${s.units} is`,
      formula: `C = ${p.a} + ${p.b}${s.letter}`,
      subject: s.letter,
      answer: ['C', `- ${p.a}`, `${p.b}`],
      wrong: [`+ ${p.a}`, `${p.a}`, `- ${p.b}`, s.letter],
    };
  }
  if (p.kind === 'distance') {
    const [a] = TRAVELLERS[p.story];
    return {
      text: `${a} starts $${p.a}$ km along a path and walks at $${p.b}$ km/h. So after $t$ hours ${a} is $d$ km along, where`,
      formula: `d = ${p.a} + ${p.b}t`,
      subject: 't',
      answer: ['d', `- ${p.a}`, `${p.b}`],
      wrong: [`+ ${p.a}`, `${p.a}`, `- ${p.b}`, 't'],
    };
  }
  if (p.kind === 'tank') {
    return {
      text: `A tank has $${p.a}$ litres in it and drains at $${p.b}$ litres a minute. So after $t$ minutes it holds $V$ litres, where`,
      formula: `V = ${p.a} - ${p.b}t`,
      subject: 't',
      answer: [`${p.a}`, '- V', `${p.b}`],
      wrong: ['+ V', 'V', `- ${p.b}`],
    };
  }
  const s = EVEN_STORIES[p.story];
  return {
    text: `${s.who} makes ${pounds(p.b)} on each ${s.item} over its cost, and pays ${pounds(p.a)} ${s.setup}. So selling $n$ ${s.items} makes a profit of $P$ pounds, where`,
    formula: `P = ${p.b}n - ${p.a}`,
    subject: 'n',
    answer: ['P', `+ ${p.a}`, `${p.b}`],
    wrong: [`- ${p.a}`, `${p.a}`, `- ${p.b}`],
  };
}

/**
 * A story's formula rearranged for its unknown, placed as tiles in
 * $(\ldots) \div \ldots$. The bank never holds the pieces of a second
 * correct arrangement, such as $(V - 120) \div (-7)$ for $(120 - V) \div 7$,
 * so the one arrangement it grades is the only one possible. Difficulty 1 is
 * take away then divide; difficulty 2 adds a draining tank and a profit,
 * where the sign of the moved number is the trap.
 */
const backRearrange: Generator<RearrangeParams> = {
  id: 'lin-back-rearrange',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick(hard ? (['charge', 'distance', 'tank', 'profit'] as const) : (['charge', 'distance'] as const));
    return drawUntil(
      () => {
        if (kind === 'charge') return { kind, story: rng.int(0, CHARGE_STORIES.length - 1), a: rng.int(5, hard ? 90 : 40), b: rng.int(2, hard ? 45 : 25) };
        if (kind === 'distance') return { kind, story: rng.int(0, TRAVELLERS.length - 1), a: rng.int(1, hard ? 30 : 12), b: rng.int(2, 7) };
        if (kind === 'tank') return { kind, story: 0, a: 10 * rng.int(5, 40), b: rng.int(2, 15) };
        return { kind, story: rng.int(0, EVEN_STORIES.length - 1), a: rng.int(20, 300), b: rng.int(2, 12) };
      },
      (p) => p.a !== p.b,
      { kind, story: 0, a: 30, b: 4 },
    );
  },
  render: (p): Slide => {
    const model = rearrangeModel(p);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: model.text },
        { kind: 'display', tex: model.formula },
        { kind: 'prose', text: `Rearrange it to make $${model.subject}$ the subject.` },
      ],
      template: `${model.subject} = ({0} {1}) \\div {2}`,
      bank: bankOf(model.answer, model.wrong),
      answer: model.answer,
    };
  },
  solution: (p) => {
    const model = rearrangeModel(p);
    const [first, moved, by] = model.answer;
    const letterTerm = `${by}${model.subject}`;
    const undo = moved.startsWith('-') ? `Take $${moved.slice(2)}$ from both sides` : `Add $${moved.slice(2)}$ to both sides`;
    return [
      { tex: model.formula },
      p.kind === 'tank'
        ? { text: `Swap $V$ and the $${by}t$ across, so the letter term is positive.`, tex: `${letterTerm} = ${first} ${moved}` }
        : { text: `${undo}, leaving the letter term alone.`, tex: `${letterTerm} = ${first} ${moved}` },
      { text: `Divide by $${by}$.`, tex: `${model.subject} = (${first} ${moved}) \\div ${by}` },
    ];
  },
};

export const linearEquationsGenerators = [
  oneStep,
  twoStep,
  twoStepSteps,
  undoFlow,
  graphSlider,
  checkSolution,
  bothSides,
  bothSidesSteps,
  collectTiles,
  collectFlow,
  meetSlider,
  brackets,
  bracketsTree,
  expandTiles,
  bracketFlow,
  fraction,
  fractionSteps,
  crossTiles,
  multiplier,
  twoFractionsTree,
  words,
  wordsSolve,
  plans,
  costSlider,
  simCheck,
  whichPair,
  satisfiesFlow,
  backSub,
  simYSlider,
  elimFlow,
  elimCombine,
  elimSolve,
  scaleChoice,
  scaleEquation,
  scaleSolve,
  scaleTree,
  subRearrange,
  subCollect,
  substitution,
  substitutionSteps,
  methodFlow,
  wordsSetup,
  wordsPairSolve,
  sumDiff,
  makeSubject,
  subjectFlow,
  firstUndoTiles,
  rearrangeStepsGen,
  bracketSubject,
  clearFractionTiles,
  twiceSubject,
  factorOutTiles,
  twiceNext,
  twiceValueTree,
  rootSubject,
  rootSteps,
  rootFlow,
  rootSign,
  useFormula,
  useSlider,
  whichRearrangement,
  formulaWords,
  ineqLine,
  ineqSteps,
  ineqPicture,
  ineqTestFlow,
  flipFlow,
  flipSteps,
  flipLine,
  flipTiles,
  doubleLine,
  doubleSteps,
  doubleTiles,
  doubleEnds,
  intList,
  intCount,
  intExtreme,
  intSlider,
  regionChoice,
  regionFlow,
  regionSlider,
  regionTest,
  triWhich,
  triCheckFlow,
  triLhsTree,
  triThird,
  triDropFlow,
  triCombine,
  triDropSteps,
  triDropCheck,
  triFinishTree,
  triBackSteps,
  triVerify,
  triSolve,
  triLetterFlow,
  triLetterChoice,
  triScaleTiles,
  triMultiplier,
  triWordsFact,
  triWordsTiles,
  triWordsSolve,
  triSumAllSteps,
  overlapFlow,
  overlapWhich,
  overlapTree,
  overlapSide,
  readSigns,
  readSystem,
  readFlow,
  readLine,
  cornerSteps,
  cornerValue,
  cornerSlider,
  cornerCheckTree,
  latticeCount,
  latticeWhich,
  latticeColumn,
  latticeFlow,
  storyTiles,
  storySystem,
  storyMost,
  storyMeetSteps,
  nameLetter,
  nameExpress,
  nameTotal,
  nameSolve,
  nameTree,
  evenCount,
  evenTiles,
  evenSlider,
  evenTable,
  evenFlow,
  rateMeet,
  rateWhereTree,
  rateCatch,
  rateTank,
  rateTiles,
  mixPair,
  mixTiles,
  mixSolve,
  mixSubstituteSteps,
  mixSlider,
  mixFlow,
  backWhich,
  backSenseFlow,
  backChange,
  backRearrange,
] as unknown as Generator<unknown>[];
