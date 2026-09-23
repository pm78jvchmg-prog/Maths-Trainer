/**
 * Linear equations and simultaneous linear equations.
 *
 * Roadmap batch C1, the first two levels of a new concept. Level 1 solves one
 * equation in one unknown: undoing in reverse order, unknowns on both sides,
 * brackets, fractions, and equations built from words. Level 2 solves two
 * equations in two unknowns: what a solution pair is, elimination with and
 * without scaling, substitution, and pairs of equations from words.
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
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { markerWindow, plotSvg } from '../figures';
import { options } from '../choiceVariant';
import { bankFor, bin, num, type Expr } from '../expr';
import { ALGEBRA_KEYS, sumTex, termTex } from './calculus';
import { bankOf, offer, signedTile } from './quadratics';

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

/** A coefficient in front of a bracket: nothing for 1, a bare minus for -1. */
function coefTex(a: number): string {
  return a === 1 ? '' : a === -1 ? '-' : `${a}`;
}

/** a(x + b), written the way it appears on the page. */
function bracketTex(a: number, b: number): string {
  return `${coefTex(a)}(x ${signedTile(b)})`;
}

/** Two equations stacked and numbered, so the prose can say "(1)" and "(2)". */
function systemTex(first: string, second: string): string {
  return `\\begin{aligned} ${first.replace(' = ', ' &= ')} & \\quad (1) \\\\ ${second.replace(' = ', ' &= ')} & \\quad (2) \\end{aligned}`;
}

/** A point, as the learner reads it. */
function pointTex(x: number, y: number): string {
  return `(${x}, ${y})`;
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
          text: `Solve one undo at a time. ${HOW_TO_REDUCE}`,
        },
      ],
      start: [front, signedTile(b), '=', `${c}`],
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
        tex:
          form === 'plus'
            ? `${a} \\times ${br(k)} ${signedTile(b)} = ${a * k} ${signedTile(b)} = ${v}`
            : `${a} \\times (${k} ${signedTile(b)}) = ${a} \\times ${br(k + b)} = ${v}`,
      },
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
      { tex: `${termTex(a - c, 1)} = ${d - b} \\implies x = ${x}` },
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
          text: `Solve one line at a time: collect the $x$ terms on the left, then clear the number, then divide. ${HOW_TO_REDUCE}`,
        },
      ],
      start: [termTex(a, 1), signedTile(b), '=', termTex(c, 1), signedTile(d)],
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
  return `${bracketTex(a, b)} ${c < 0 ? '-' : '+'} ${coefTex(Math.abs(c))}(x ${signedTile(e)}) = ${r}`;
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
      { tex: `${termTex(a - c, 1)} = ${r - a * b} \\implies x = ${x}` },
    ];
  }
  return [
    { tex: bracketEqTex(params) },
    { text: 'Expand both brackets, watching the sign in front of the second.' },
    { tex: `${linTex(a, a * b)} ${signedTile(c, 'x')} ${signedTile(c * e)} = ${r}` },
    { tex: `${linTex(a + c, a * b + c * e)} = ${r}` },
    { tex: `${termTex(a + c, 1)} = ${r - a * b - c * e} \\implies x = ${x}` },
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
        { tex: `${termTex(a - c, 1)} = ${r - a * b} \\implies x = ${x}` },
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
      prompt: [{ kind: 'prose', text: `Clear the fraction, then finish. ${HOW_TO_REDUCE}` }],
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
      { tex: `${termTex(k, 1)} = ${a * q - b * p} \\implies x = ${x}` },
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

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
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
        const a = rng.int(2, difficulty > 1 ? 10 : 6);
        const b = rng.int(3, difficulty > 1 ? 12 : 9);
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
      { tex: `${l} \\times \\frac{x}{${a}} = ${l / a}x, \\quad ${l} \\times \\frac{x}{${b}} = ${l / b}x` },
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
    const answer = [`${a}`, signedTile(b), `${c}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: wordsText(params) },
        { kind: 'prose', text: 'Write the equation these words describe.' },
      ],
      template: form === 'times-then-add' ? '{0}x {1} = {2}' : '{0}(x {1}) = {2}',
      bank: bankOf(answer, [signedTile(-b), `${Math.abs(b)}`, signedTile(a), `${c + b}`, `${c - b}`]),
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
      const terms = Array.from({ length: m }, (_, i) => (i === 0 ? 'x' : `(x + ${i})`)).join(' + ');
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
    { tex: `${letterTerm(k, letter)} = ${v} \\implies ${letter} = ${found}` },
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
      { tex: `${a} \\times ${br(px)} ${b < 0 ? '-' : '+'} ${Math.abs(b)} \\times ${br(py)} = ${a * px} ${signedTile(b * py)} = ${value}` },
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
      { tex: `(1): ${a1} \\times ${br(x)} ${b1 < 0 ? '-' : '+'} ${Math.abs(b1)} \\times ${br(y)} = ${c1Of(params)}` },
      { tex: `(2): ${a2} \\times ${br(x)} ${b2 < 0 ? '-' : '+'} ${Math.abs(b2)} \\times ${br(y)} = ${c2Of(params)}` },
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
      { tex: `(1): ${a1} \\times ${br(px)} ${b1 < 0 ? '-' : '+'} ${Math.abs(b1)} \\times ${br(py)} = ${left1}` },
      {
        text:
          left1 === c1Of(params)
            ? `That is $${c1Of(params)}$, so (1) balances. Now (2):`
            : `But (1) needs $${c1Of(params)}$, so the pair is not a solution — one failure is enough.`,
      },
      ...(left1 === c1Of(params)
        ? [
            { tex: `(2): ${a2} \\times ${br(px)} ${b2 < 0 ? '-' : '+'} ${Math.abs(b2)} \\times ${br(py)} = ${left2}` },
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
        { tex: `${yTerm(b)} = ${c - a * params.x} \\implies y = ${params.y}` },
      ];
    }
    return [
      { tex: `${termTex(a, 1)} ${b < 0 ? '-' : '+'} ${Math.abs(b)} \\times ${br(params.y)} = ${c}` },
      { tex: `${termTex(a, 1)} ${signedTile(b * params.y)} = ${c}` },
      { tex: `${termTex(a, 1)} = ${c - b * params.y} \\implies x = ${params.x}` },
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
    const answer = [`${p}`, `${q}`, `${r}`, `${t}`, `${p - r}`, `${q - t}`, `${s.y}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Eliminate $x$: multiply (1) by $${s.a2}$ and (2) by $${s.a1}$, then subtract. Fill the tree: each strand's new $y$ coefficient and right-hand side, what subtracting leaves of each, and then $y$.`,
        },
        { kind: 'display', tex: sysTex(s) },
      ],
      expression: `${s.a2} \\times (1) - ${s.a1} \\times (2)`,
      nodes: [
        { id: 'y1', from: [] },
        { id: 'c1', from: [] },
        { id: 'y2', from: [] },
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
      { tex: `${yTerm(p - r)} = ${s.a2 * c1Of(s) - s.a1 * c2Of(s)} \\implies y = ${s.y}` },
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
    { tex: `${termTex(A, 1)} = ${c - B} \\implies x = ${p.x}` },
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
          text: `(1) has been put into (2) in place of $y$, where (1) is $y = ${linTex(m, k)}$. Finish solving for $x$. ${HOW_TO_REDUCE}`,
        },
      ],
      start: [lead, `${b < 0 ? '-' : '+'} ${Math.abs(b)}(${linTex(m, k)})`, '=', `${c}`],
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
] as unknown as Generator<unknown>[];
