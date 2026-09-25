/**
 * Numerical Methods, level 7: numerical differentiation (roadmap C15).
 *
 * The forward difference (the chord from a to a + h), the central difference
 * (the chord from a - h to a + h), why the central one is better (its error
 * shrinks with h squared rather than h), both used on a table of readings,
 * and the second difference for f''(a) with the nature of a stationary point.
 *
 * Every function is a polynomial with whole coefficients, evaluated at whole
 * numbers plus a step of 0.1, 0.2, 0.5 or 1, so every height, difference and
 * estimate is an exact decimal that `fmt` writes without float dust. A
 * difference estimate is not the derivative, so nothing here declares a
 * `source` for the oracle, which would grade the estimate against f'(a).
 */
import type { Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { say } from './format';
import {
  aligned,
  around,
  choiceSlide,
  clean,
  derivative,
  fillBank,
  fmt,
  numberBank,
  paren,
  polyTex,
  show,
  stepBank,
  turned,
  valueAt,
  type Poly,
} from './numericalKit';

/* ================================================================
 * One function, one point, one step
 * ================================================================ */

interface DiffParams {
  p: Poly;
  a: number;
  h: number;
}

/**
 * A quadratic, cubic or quartic with whole coefficients, a whole-number
 * point, and a step. The three heights either side of `a` stay modest, and
 * with `positive` they are all above nought (for a line where a negative
 * height would read as a double minus).
 */
function sampleDiff(rng: Rng, degree: 2 | 3 | 4, hs: number[], positive = false): DiffParams {
  for (;;) {
    const lower = [rng.int(-6, 6), rng.int(-9, 9)];
    const p =
      degree === 2
        ? [rng.pick([1, 2, 3, -1, -2]), ...lower]
        : degree === 3
          ? [rng.pick([1, 1, 2, -1]), rng.int(-3, 3), ...lower]
          : [rng.pick([1, -1]), rng.int(-2, 2), rng.int(-3, 3), ...lower];
    const a = rng.int(-2, 4);
    const h = rng.pick(hs);
    const ys = [a - h, a, a + h].map((x) => valueAt(p, x));
    if (ys.some((y) => Math.abs(y) > 80)) continue;
    if (positive && ys.some((y) => y <= 0)) continue;
    return { p, a, h };
  }
}

function estimates({ p, a, h }: DiffParams) {
  const up = clean(valueAt(p, a + h));
  const at = clean(valueAt(p, a));
  const down = clean(valueAt(p, a - h));
  return {
    up,
    at,
    down,
    forward: clean((up - at) / h),
    backward: clean((at - down) / h),
    central: clean((up - down) / (2 * h)),
    second: clean((up - 2 * at + down) / (h * h)),
    exact: clean(valueAt(derivative(p), a)),
    exact2: clean(valueAt(derivative(derivative(p)), a)),
  };
}

const fOf = (p: Poly): string => `f(x) = ${polyTex(p)}`;

/** The three heights a line of working needs, stacked. */
function heights({ a, h }: DiffParams, e: ReturnType<typeof estimates>, which: ('up' | 'at' | 'down')[]): string {
  const x = { up: a + h, at: a, down: a - h };
  return aligned(...which.map((k) => `f(${fmt(x[k])}) &= ${fmt(e[k])}`));
}

function forwardLine(params: DiffParams): string {
  const e = estimates(params);
  return `\\frac{${fmt(e.up)} - ${paren(e.at)}}{${fmt(params.h)}} = ${fmt(e.forward)}`;
}

function centralLine(params: DiffParams): string {
  const e = estimates(params);
  return `\\frac{${fmt(e.up)} - ${paren(e.down)}}{${fmt(2 * params.h)}} = ${fmt(e.central)}`;
}

function secondLine(params: DiffParams): string {
  const e = estimates(params);
  return aligned(
    `&\\frac{${fmt(e.up)} - 2 \\times ${paren(e.at)} + ${paren(e.down)}}{${fmt(params.h)}^{2}}`,
    `&= \\frac{${fmt(clean(e.up - 2 * e.at + e.down))}}{${fmt(clean(params.h * params.h))}} = ${fmt(e.second)}`,
  );
}

function forwardSolution(params: DiffParams): SolutionStep[] {
  const { a, h } = params;
  return [
    { text: `The chord from $x = ${fmt(a)}$ to $x = ${fmt(a + h)}$:` },
    { tex: heights(params, estimates(params), ['up', 'at']) },
    { tex: forwardLine(params) },
  ];
}

function centralSolution(params: DiffParams): SolutionStep[] {
  const { a, h } = params;
  return [
    { text: `The chord from $x = ${fmt(a - h)}$ to $x = ${fmt(a + h)}$, a width of $2h = ${fmt(2 * h)}$:` },
    { tex: heights(params, estimates(params), ['up', 'down']) },
    { tex: centralLine(params) },
  ];
}

function secondSolution(params: DiffParams): SolutionStep[] {
  return [
    { text: 'The heights either side and in the middle:' },
    { tex: heights(params, estimates(params), ['up', 'at', 'down']) },
    { tex: secondLine(params) },
  ];
}

/* ================================================================
 * Lesson 1: the forward difference
 * ================================================================ */

const fdForward: Generator<DiffParams> = {
  id: 'numer-fd-forward',
  sample: (rng, difficulty) => sampleDiff(rng, difficulty > 1 ? 3 : 2, difficulty > 1 ? [0.1, 0.2] : [0.1, 0.5, 1]),
  choices: (params) => {
    const e = estimates(params);
    const rise = clean(e.up - e.at);
    return options(
      { tex: fmt(e.forward), answer: fmt(e.forward) },
      { tex: fmt(rise), answer: fmt(rise) },
      { tex: fmt(clean(rise / (2 * params.h))), answer: fmt(clean(rise / (2 * params.h))) },
      { tex: fmt(e.backward), answer: fmt(e.backward) },
      { tex: fmt(-e.forward), answer: fmt(-e.forward) },
    ).slice(0, 4);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`Estimate $f'(${fmt(params.a)})$ by a forward difference with $h = ${fmt(params.h)}$.`), show(fOf(params.p))],
    lead: `f'(${fmt(params.a)}) \\approx`,
    keypad: [],
    answer: fmt(estimates(params).forward),
    domain: 'real',
    mode: 'exact',
  }),
  solution: forwardSolution,
};

const fdChordTree: Generator<DiffParams> = {
  id: 'numer-fd-chord-tree',
  sample: (rng, difficulty) => sampleDiff(rng, difficulty > 1 ? 3 : 2, difficulty > 1 ? [0.1, 0.2] : [0.1, 0.5]),
  render: (params): Slide => {
    const { p, a, h } = params;
    const e = estimates(params);
    const rise = clean(e.up - e.at);
    const answer = [e.up, e.at, rise, e.forward].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${fOf(p)}$. Top row: $f(${fmt(a + h)})$ and $f(${fmt(a)})$. Then their difference, then that divided by $h = ${fmt(h)}$.`,
        ),
      ],
      expression: `f'(${fmt(a)}) \\approx \\frac{f(${fmt(a + h)}) - f(${fmt(a)})}{${fmt(h)}}`,
      nodes: [
        { id: 'up', from: [] },
        { id: 'at', from: [] },
        { id: 'rise', from: ['up', 'at'] },
        { id: 'est', from: ['rise'] },
      ],
      bank: numberBank(
        answer,
        [e.down, clean(e.up + e.at), -rise, clean(rise * h), e.backward].map(fmt),
        around([e.forward, rise], h),
      ),
      answer,
    };
  },
  solution: forwardSolution,
};

interface FormulaParams {
  a: number;
  h: number;
}

function sampleFormula(rng: Rng, difficulty: number): FormulaParams {
  return difficulty > 1
    ? { a: rng.int(-4, 8) + rng.pick([0, 0.5]), h: rng.pick([0.01, 0.02, 0.05, 0.1, 0.2]) }
    : { a: rng.int(-3, 7), h: rng.pick([0.1, 0.2, 0.5]) };
}

const fdFormulaTiles: Generator<FormulaParams> = {
  id: 'numer-fd-formula-tiles',
  sample: sampleFormula,
  render: ({ a, h }): Slide => {
    const answer = [fmt(a + h), fmt(a), fmt(h)];
    return {
      kind: 'tiles',
      prompt: [say(`Complete the forward difference for $f'(${fmt(a)})$ with $h = ${fmt(h)}$.`)],
      template: `f'(${fmt(a)}) \\approx [f({0}) - f({1})] \\div {2}`,
      bank: fillBank(answer, [fmt(a - h), fmt(2 * h), fmt(a + 2 * h), fmt(clean(h / 2))]),
      answer,
    };
  },
  solution: ({ a, h }) => [
    { text: `The forward difference is the chord from $x = ${fmt(a)}$ forward to $x = ${fmt(a)} + ${fmt(h)} = ${fmt(a + h)}$.` },
    { tex: `f'(${fmt(a)}) \\approx \\frac{f(${fmt(a + h)}) - f(${fmt(a)})}{${fmt(h)}}` },
  ],
};

/**
 * Over or under, from the way the curve bends: a curve bending up gets
 * steeper, so the chord to the right is steeper than the tangent at its left
 * end. Difficulty 2 is a cubic, drawn only where f'' keeps one sign.
 */
const fdOverFlow: Generator<DiffParams> = {
  id: 'numer-fd-over-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleDiff(rng, difficulty > 1 ? 3 : 2, [0.1, 0.2, 0.5]);
      const f2 = derivative(derivative(params.p));
      const left = valueAt(f2, params.a);
      const right = valueAt(f2, params.a + params.h);
      if (left === 0 || right === 0 || Math.sign(left) !== Math.sign(right)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { p, a, h } = params;
    const up = valueAt(derivative(derivative(p)), a) > 0;
    const verdict = (bend: string) =>
      turned(
        [
          { label: 'Larger', outcome: 'So the forward difference overestimates.' },
          { label: 'Smaller', outcome: 'So the forward difference underestimates.' },
        ],
        `${bend}${polyTex(p)}${a}${h}`,
      );
    return {
      kind: 'flow',
      prompt: [say(`Does the forward difference with $h = ${fmt(h)}$ overestimate or underestimate $f'(${fmt(a)})$?`)],
      subject: fOf(p),
      steps: [
        {
          id: 'bend',
          ask: `Find $f''(x)$. Is it positive or negative on $[${fmt(a)}, ${fmt(a + h)}]$?`,
          branches: [
            { label: 'Positive', to: 'up' },
            { label: 'Negative', to: 'down' },
          ],
        },
        { id: 'up', ask: "The curve bends up. Is the chord's gradient larger or smaller than the tangent's at its left end?", branches: verdict('up') },
        { id: 'down', ask: "The curve bends down. Is the chord's gradient larger or smaller than the tangent's at its left end?", branches: verdict('down') },
      ],
      answer: up ? ['Positive', 'Larger'] : ['Negative', 'Smaller'],
    };
  },
  solution: (params) => {
    const { p, a, h } = params;
    const f2 = derivative(derivative(p));
    const e = estimates(params);
    const up = valueAt(f2, a) > 0;
    return [
      { tex: `f''(x) = ${polyTex(f2)}` },
      {
        text: up
          ? `This is positive on $[${fmt(a)}, ${fmt(a + h)}]$: the curve bends up, getting steeper, so the chord is steeper than the tangent at its left end.`
          : `This is negative on $[${fmt(a)}, ${fmt(a + h)}]$: the curve bends down, getting less steep, so the chord is less steep than the tangent at its left end.`,
      },
      { tex: aligned(`\\text{forward} &= ${fmt(e.forward)}`, `f'(${fmt(a)}) &= ${fmt(e.exact)}`) },
      { text: up ? 'The estimate is too big: an overestimate.' : 'The estimate is too small: an underestimate.' },
    ];
  },
};

/* ================================================================
 * Lesson 2: the central difference
 * ================================================================ */

const cdValue: Generator<DiffParams> = {
  id: 'numer-cd-value',
  sample: (rng, difficulty) => sampleDiff(rng, difficulty > 1 ? 3 : 2, difficulty > 1 ? [0.1, 0.2] : [0.1, 0.5, 1]),
  choices: (params) => {
    const e = estimates(params);
    const rise = clean(e.up - e.down);
    return options(
      { tex: fmt(e.central), answer: fmt(e.central) },
      { tex: fmt(clean(rise / params.h)), answer: fmt(clean(rise / params.h)) },
      { tex: fmt(e.forward), answer: fmt(e.forward) },
      { tex: fmt(rise), answer: fmt(rise) },
      { tex: fmt(e.backward), answer: fmt(e.backward) },
    ).slice(0, 4);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`Estimate $f'(${fmt(params.a)})$ by a central difference with $h = ${fmt(params.h)}$.`), show(fOf(params.p))],
    lead: `f'(${fmt(params.a)}) \\approx`,
    keypad: [],
    answer: fmt(estimates(params).central),
    domain: 'real',
    mode: 'exact',
  }),
  solution: centralSolution,
};

const cdChordTree: Generator<DiffParams> = {
  id: 'numer-cd-chord-tree',
  sample: (rng, difficulty) => sampleDiff(rng, difficulty > 1 ? 3 : 2, difficulty > 1 ? [0.1, 0.2] : [0.1, 0.5]),
  render: (params): Slide => {
    const { p, a, h } = params;
    const e = estimates(params);
    const rise = clean(e.up - e.down);
    const answer = [e.up, e.down, rise, e.central].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${fOf(p)}$. Top row: $f(${fmt(a + h)})$ and $f(${fmt(a - h)})$. Then their difference, then that divided by $2h = ${fmt(2 * h)}$.`,
        ),
      ],
      expression: `f'(${fmt(a)}) \\approx \\frac{f(${fmt(a + h)}) - f(${fmt(a - h)})}{${fmt(2 * h)}}`,
      nodes: [
        { id: 'up', from: [] },
        { id: 'down', from: [] },
        { id: 'rise', from: ['up', 'down'] },
        { id: 'est', from: ['rise'] },
      ],
      bank: numberBank(
        answer,
        [e.at, clean(e.up + e.down), -rise, clean(rise / h), e.forward].map(fmt),
        around([e.central, rise], h),
      ),
      answer,
    };
  },
  solution: centralSolution,
};

const cdFormulaTiles: Generator<FormulaParams> = {
  id: 'numer-cd-formula-tiles',
  sample: sampleFormula,
  render: ({ a, h }): Slide => {
    const answer = [fmt(a + h), fmt(a - h), fmt(2 * h)];
    return {
      kind: 'tiles',
      prompt: [say(`Complete the central difference for $f'(${fmt(a)})$ with $h = ${fmt(h)}$.`)],
      template: `f'(${fmt(a)}) \\approx [f({0}) - f({1})] \\div {2}`,
      bank: fillBank(answer, [fmt(a), fmt(h), fmt(a + 2 * h), fmt(a - 2 * h)]),
      answer,
    };
  },
  solution: ({ a, h }) => [
    {
      text: `The central difference is the chord from $x = ${fmt(a)} - ${fmt(h)} = ${fmt(a - h)}$ to $x = ${fmt(a)} + ${fmt(h)} = ${fmt(a + h)}$, which is $2h = ${fmt(2 * h)}$ wide.`,
    },
    { tex: `f'(${fmt(a)}) \\approx \\frac{f(${fmt(a + h)}) - f(${fmt(a - h)})}{${fmt(2 * h)}}` },
  ],
};

/** The central difference worked along a line: each height, the bracket, the division. */
const cdSteps: Generator<DiffParams> = {
  id: 'numer-cd-steps',
  sample: (rng, difficulty) => sampleDiff(rng, difficulty > 1 ? 3 : 2, difficulty > 1 ? [0.1, 0.2] : [0.1, 0.5], true),
  render: (params): Slide => {
    const { p, a, h } = params;
    const e = estimates(params);
    const rise = clean(e.up - e.down);
    return {
      kind: 'steps',
      prompt: [
        say(`Estimate $f'(${fmt(a)})$ for $${fOf(p)}$ by a central difference. Tap the part to work out next, then choose its value.`),
      ],
      start: ['[', `f(${fmt(a + h)})`, '-', `f(${fmt(a - h)})`, ']', '\\div', fmt(2 * h)],
      reductions: [
        { span: [1, 2], value: fmt(e.up), bank: stepBank(fmt(e.up), fmt(e.down), fmt(e.at)) },
        { span: [3, 4], value: fmt(e.down), bank: stepBank(fmt(e.down), fmt(e.up), fmt(e.at)) },
        {
          span: [0, 5],
          operator: 2,
          value: fmt(rise),
          bank: stepBank(fmt(rise), fmt(clean(e.up + e.down)), fmt(-rise), fmt(clean(e.up - e.at))),
        },
        {
          span: [0, 3],
          operator: 1,
          value: fmt(e.central),
          bank: stepBank(fmt(e.central), fmt(clean(rise / h)), fmt(clean(rise * 2 * h)), fmt(e.forward)),
        },
      ],
    };
  },
  solution: centralSolution,
};

/* ================================================================
 * Lesson 3: why the central difference is better
 * ================================================================ */

const fdError: Generator<DiffParams> = {
  id: 'numer-fd-error',
  sample: (rng, difficulty) => sampleDiff(rng, difficulty > 1 ? 3 : 2, [0.1, 0.2, 0.5]),
  choices: (params) => {
    const e = estimates(params);
    const error = clean(e.forward - e.exact);
    return options(
      { tex: fmt(error), answer: fmt(error) },
      { tex: fmt(-error), answer: fmt(-error) },
      { tex: fmt(e.exact), answer: fmt(e.exact) },
      { tex: fmt(clean(e.central - e.exact)), answer: fmt(clean(e.central - e.exact)) },
      { tex: fmt(clean(error * 2)), answer: fmt(clean(error * 2)) },
    ).slice(0, 4);
  },
  render: (params): Slide => {
    const e = estimates(params);
    return {
      kind: 'expression',
      prompt: [
        say(
          `The forward difference with $h = ${fmt(params.h)}$ gives $f'(${fmt(params.a)}) \\approx ${fmt(e.forward)}$. Find its error, the estimate minus the exact value.`,
        ),
        show(fOf(params.p)),
      ],
      lead: '\\text{error} =',
      keypad: [],
      answer: fmt(clean(e.forward - e.exact)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { p, a } = params;
    const e = estimates(params);
    return [
      { text: 'Differentiate for the exact gradient:' },
      { tex: aligned(`f'(x) &= ${polyTex(derivative(p))}`, `f'(${fmt(a)}) &= ${fmt(e.exact)}`) },
      { tex: `${fmt(e.forward)} - ${paren(e.exact)} = ${fmt(clean(e.forward - e.exact))}` },
    ];
  },
};

/** The central difference on a cubic misses by exactly (x^3 coefficient) times h^2. */
const cdError: Generator<DiffParams> = {
  id: 'numer-cd-error',
  sample: (rng, difficulty) => sampleDiff(rng, 3, difficulty > 1 ? [0.1, 0.2, 0.5] : [0.1, 0.5]),
  choices: (params) => {
    const e = estimates(params);
    const error = clean(e.central - e.exact);
    return options(
      { tex: fmt(error), answer: fmt(error) },
      { tex: fmt(-error), answer: fmt(-error) },
      { tex: fmt(clean(e.forward - e.exact)), answer: fmt(clean(e.forward - e.exact)) },
      { tex: fmt(e.exact), answer: fmt(e.exact) },
    );
  },
  render: (params): Slide => {
    const e = estimates(params);
    return {
      kind: 'expression',
      prompt: [
        say(
          `The central difference with $h = ${fmt(params.h)}$ gives $f'(${fmt(params.a)}) \\approx ${fmt(e.central)}$. Find its error, the estimate minus the exact value.`,
        ),
        show(fOf(params.p)),
      ],
      lead: '\\text{error} =',
      keypad: [],
      answer: fmt(clean(e.central - e.exact)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { p, a } = params;
    const e = estimates(params);
    return [
      { text: 'Differentiate for the exact gradient:' },
      { tex: aligned(`f'(x) &= ${polyTex(derivative(p))}`, `f'(${fmt(a)}) &= ${fmt(e.exact)}`) },
      { tex: `${fmt(e.central)} - ${paren(e.exact)} = ${fmt(clean(e.central - e.exact))}` },
    ];
  },
};

interface HalveParams extends DiffParams {
  central: boolean;
}

/**
 * Halving h: the forward difference on a quadratic misses by exactly
 * (x^2 coefficient) times h, so its error halves; the central difference on a
 * cubic misses by (x^3 coefficient) times h^2, so its error quarters.
 */
const halveChoice: Generator<HalveParams> = {
  id: 'numer-diff-halve-choice',
  sample: (rng, difficulty) => {
    const central = difficulty > 1 && rng.chance(0.5);
    return central
      ? { ...sampleDiff(rng, 3, [0.2, 0.4, 1]), central }
      : { ...sampleDiff(rng, 2, [0.1, 0.2, 0.4, 1]), central };
  },
  render: (params): Slide => {
    const { p, a, h, central } = params;
    const e = estimates(params);
    const error = clean((central ? e.central : e.forward) - e.exact);
    const right = clean(central ? error / 4 : error / 2);
    const opts = options(
      { tex: fmt(right) },
      { tex: fmt(clean(central ? error / 2 : error / 4)) },
      { tex: fmt(error) },
      { tex: fmt(clean(2 * error)) },
    );
    return choiceSlide(
      [
        say(
          `For $${fOf(p)}$ at $x = ${fmt(a)}$, the ${central ? 'central' : 'forward'} difference with $h = ${fmt(h)}$ has an error of $${fmt(error)}$. What is its error with $h = ${fmt(h / 2)}$?`,
        ),
      ],
      opts,
    );
  },
  solution: (params) => {
    const { p, h, central } = params;
    const e = estimates(params);
    const error = clean((central ? e.central : e.forward) - e.exact);
    const k = p[0];
    return central
      ? [
          { text: `On a cubic the central difference is out by exactly the $x^{3}$ coefficient times $h^{2}$: here $${k} \\times ${fmt(h)}^{2} = ${fmt(error)}$.` },
          { text: `Halving $h$ divides $h^{2}$ by $4$, so the error becomes $${fmt(error)} \\div 4 = ${fmt(clean(error / 4))}$.` },
        ]
      : [
          { text: `On a quadratic the forward difference is out by exactly the $x^{2}$ coefficient times $h$: here $${k} \\times ${fmt(h)} = ${fmt(error)}$.` },
          { text: `Halving $h$ halves the error: $${fmt(error)} \\div 2 = ${fmt(clean(error / 2))}$.` },
        ];
  },
};

/** Both estimates beside the exact gradient, and the error of each. */
const errorsTree: Generator<DiffParams> = {
  id: 'numer-diff-errors-tree',
  sample: (rng, difficulty) => sampleDiff(rng, difficulty > 1 ? 3 : 2, [0.1, 0.2, 0.5]),
  render: (params): Slide => {
    const { p, a, h } = params;
    const e = estimates(params);
    const eF = clean(e.forward - e.exact);
    const eC = clean(e.central - e.exact);
    const answer = [e.forward, e.exact, e.central, eF, eC].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${fOf(p)}$, $h = ${fmt(h)}$. Top row, left to right: the forward difference, $f'(${fmt(a)})$, the central difference. Below: each estimate's error, estimate minus exact.`,
        ),
      ],
      expression: `f'(${fmt(a)})`,
      nodes: [
        { id: 'fwd', from: [] },
        { id: 'exact', from: [] },
        { id: 'cen', from: [] },
        { id: 'eF', from: ['fwd', 'exact'] },
        { id: 'eC', from: ['exact', 'cen'] },
      ],
      bank: numberBank(answer, [-eF, -eC, e.backward, clean(e.up - e.at)].map(fmt), around([e.exact], h)),
      answer,
    };
  },
  solution: (params) => {
    const { p, a } = params;
    const e = estimates(params);
    return [
      ...forwardSolution(params).slice(1),
      { tex: centralLine(params) },
      { tex: aligned(`f'(x) &= ${polyTex(derivative(p))}`, `f'(${fmt(a)}) &= ${fmt(e.exact)}`) },
      {
        tex: aligned(
          `\\text{forward error} &= ${fmt(clean(e.forward - e.exact))}`,
          `\\text{central error} &= ${fmt(clean(e.central - e.exact))}`,
        ),
      },
    ];
  },
};

/* ================================================================
 * Lesson 4: gradients from a table of readings
 * ================================================================ */

interface DataStory {
  setup: (h: string) => string;
  x: string;
  y: string;
  /** What the rate is, and in what units. */
  rate: string;
  unit: string;
  hs: number[];
  start: [number, number];
  /** Change per reading, as a range; negative for a falling quantity. */
  step: [number, number];
}

const DATA_STORIES: DataStory[] = [
  {
    setup: (h) => `A car's distance $s$ m from a junction is recorded every $${h}$ s.`,
    x: 't',
    y: 's',
    rate: 'its speed',
    unit: 'm/s',
    hs: [0.5, 1, 2],
    start: [0, 20],
    step: [3, 15],
  },
  {
    setup: (h) => `The volume $V$ litres of water in a tank is read every $${h}$ minutes.`,
    x: 't',
    y: 'V',
    rate: 'the rate it fills',
    unit: 'litres per minute',
    hs: [1, 2, 5],
    start: [10, 60],
    step: [4, 20],
  },
  {
    setup: (h) => `A cup of tea's temperature $T$, in degrees Celsius, is read every $${h}$ minutes.`,
    x: 't',
    y: 'T',
    rate: 'the rate its temperature changes',
    unit: 'degrees per minute',
    hs: [1, 2, 5],
    start: [70, 90],
    step: [-9, -2],
  },
  {
    setup: (h) => `A balloon's height $H$ m is recorded every $${h}$ s.`,
    x: 't',
    y: 'H',
    rate: 'its rate of climb',
    unit: 'm/s',
    hs: [0.5, 2, 5],
    start: [0, 40],
    step: [2, 12],
  },
];

interface DataParams {
  story: number;
  h: number;
  ys: number[];
  /** The reading asked about. */
  i: number;
}

function sampleData(rng: Rng, count: number, pickI: (count: number) => number): DataParams {
  const story = rng.int(0, DATA_STORIES.length - 1);
  const s = DATA_STORIES[story];
  const ys = [rng.int(...s.start)];
  for (let k = 1; k < count; k += 1) ys.push(ys[k - 1] + rng.int(...s.step));
  return { story, h: rng.pick(s.hs), ys, i: pickI(count) };
}

const dataXs = ({ h, ys }: DataParams): number[] => ys.map((_, k) => clean(k * h));

function dataTable(params: DataParams): string {
  const s = DATA_STORIES[params.story];
  const xs = dataXs(params);
  const part = (from: number, to: number) =>
    `\\begin{array}{c|${'c'.repeat(to - from)}} ${s.x} & ${xs.slice(from, to).map(fmt).join(' & ')} \\\\ \\hline ${s.y} & ${params.ys.slice(from, to).map(fmt).join(' & ')} \\end{array}`;
  if (params.ys.length <= 5) return part(0, params.ys.length);
  const half = Math.ceil(params.ys.length / 2);
  return `\\begin{gathered} ${part(0, half)} \\\\[6pt] ${part(half, params.ys.length)} \\end{gathered}`;
}

const rateLead = (s: DataStory): string => `\\frac{d${s.y}}{d${s.x}} \\approx`;

function centralAt({ ys, h }: DataParams, i: number): number {
  return clean((ys[i + 1] - ys[i - 1]) / (2 * h));
}

function centralDataSolution(params: DataParams, i: number): SolutionStep[] {
  const s = DATA_STORIES[params.story];
  const xs = dataXs(params);
  const { ys, h } = params;
  return [
    { text: `The readings either side of $${s.x} = ${fmt(xs[i])}$ are at $${s.x} = ${fmt(xs[i - 1])}$ and $${s.x} = ${fmt(xs[i + 1])}$, $2h = ${fmt(2 * h)}$ apart.` },
    { tex: `\\frac{${fmt(ys[i + 1])} - ${paren(ys[i - 1])}}{${fmt(2 * h)}} = ${fmt(centralAt(params, i))}` },
    { text: `So ${s.rate} is about $${fmt(centralAt(params, i))}$ ${s.unit}.` },
  ];
}

const dataCentral: Generator<DataParams> = {
  id: 'numer-data-central',
  sample: (rng, difficulty) => sampleData(rng, difficulty > 1 ? 6 : 5, (count) => rng.int(1, count - 2)),
  choices: (params) => {
    const { ys, h, i } = params;
    const right = centralAt(params, i);
    return options(
      { tex: fmt(right), answer: fmt(right) },
      { tex: fmt(clean((ys[i + 1] - ys[i]) / h)), answer: fmt(clean((ys[i + 1] - ys[i]) / h)) },
      { tex: fmt(clean((ys[i] - ys[i - 1]) / h)), answer: fmt(clean((ys[i] - ys[i - 1]) / h)) },
      { tex: fmt(clean((ys[i + 1] - ys[i - 1]) / h)), answer: fmt(clean((ys[i + 1] - ys[i - 1]) / h)) },
      { tex: fmt(ys[i + 1] - ys[i - 1]), answer: fmt(ys[i + 1] - ys[i - 1]) },
    ).slice(0, 4);
  },
  render: (params): Slide => {
    const s = DATA_STORIES[params.story];
    return {
      kind: 'expression',
      prompt: [
        say(s.setup(fmt(params.h))),
        show(dataTable(params)),
        say(`Estimate ${s.rate} at $${s.x} = ${fmt(dataXs(params)[params.i])}$, in ${s.unit}, by a central difference.`),
      ],
      lead: rateLead(s),
      keypad: [],
      answer: fmt(centralAt(params, params.i)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => centralDataSolution(params, params.i),
};

/** The rate at an end reading, where only one side has a reading. */
function endRate({ ys, h, i }: DataParams): number {
  return i === 0 ? clean((ys[1] - ys[0]) / h) : clean((ys[i] - ys[i - 1]) / h);
}

function endSolution(params: DataParams): SolutionStep[] {
  const s = DATA_STORIES[params.story];
  const xs = dataXs(params);
  const { ys, h, i } = params;
  const first = i === 0;
  return [
    {
      text: first
        ? `$${s.x} = ${fmt(xs[0])}$ is the first reading, so there is nothing before it: use the forward difference to the next reading.`
        : `$${s.x} = ${fmt(xs[i])}$ is the last reading, so there is nothing after it: use the backward difference from the one before.`,
    },
    {
      tex: first
        ? `\\frac{${fmt(ys[1])} - ${paren(ys[0])}}{${fmt(h)}} = ${fmt(endRate(params))}`
        : `\\frac{${fmt(ys[i])} - ${paren(ys[i - 1])}}{${fmt(h)}} = ${fmt(endRate(params))}`,
    },
  ];
}

const dataEndRate: Generator<DataParams> = {
  id: 'numer-data-end-rate',
  sample: (rng, difficulty) => sampleData(rng, 5, (count) => (difficulty > 1 && rng.chance(0.5) ? 0 : count - 1)),
  choices: (params) => {
    const { ys, h, i } = params;
    const right = endRate(params);
    const j = i === 0 ? 1 : i - 1;
    const near = clean((ys[j + 1] - ys[j - 1]) / (2 * h));
    const rise = i === 0 ? ys[1] - ys[0] : ys[i] - ys[i - 1];
    return options(
      { tex: fmt(right), answer: fmt(right) },
      { tex: fmt(near), answer: fmt(near) },
      { tex: fmt(rise), answer: fmt(rise) },
      { tex: fmt(clean(rise / (2 * h))), answer: fmt(clean(rise / (2 * h))) },
      { tex: fmt(-right), answer: fmt(-right) },
    ).slice(0, 4);
  },
  render: (params): Slide => {
    const s = DATA_STORIES[params.story];
    const which = params.i === 0 ? 'first' : 'last';
    return {
      kind: 'expression',
      prompt: [
        say(s.setup(fmt(params.h))),
        show(dataTable(params)),
        say(`Estimate ${s.rate} at $${s.x} = ${fmt(dataXs(params)[params.i])}$, the ${which} reading, in ${s.unit}.`),
      ],
      lead: rateLead(s),
      keypad: [],
      answer: fmt(endRate(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: endSolution,
};

/** Which difference a reading allows: central inside, forward at the start, backward at the end. */
const dataWhichFlow: Generator<DataParams> = {
  id: 'numer-data-which-flow',
  sample: (rng, difficulty) =>
    sampleData(rng, difficulty > 1 ? 6 : 5, (count) => rng.pick([0, count - 1, rng.int(1, count - 2)])),
  render: (params): Slide => {
    const s = DATA_STORIES[params.story];
    const count = params.ys.length;
    const { i } = params;
    const x = fmt(dataXs(params)[i]);
    return {
      kind: 'flow',
      prompt: [say(`Which difference estimates ${s.rate} at $${s.x} = ${x}$?`)],
      subject: dataTable(params),
      steps: [
        {
          id: 'both',
          ask: `Is there a reading on both sides of $${s.x} = ${x}$?`,
          branches: [
            { label: 'Yes', outcome: 'Use the central difference, from the readings either side.' },
            { label: 'No', to: 'after' },
          ],
        },
        {
          id: 'after',
          ask: 'Is there a reading after it?',
          branches: turned(
            [
              { label: 'Yes', outcome: 'Use the forward difference, from this reading to the next.' },
              { label: 'No', outcome: 'Use the backward difference, from the reading before to this one.' },
            ],
            `${s.y}${x}${params.ys.join(',')}`,
          ),
        },
      ],
      answer: i > 0 && i < count - 1 ? ['Yes'] : i === 0 ? ['No', 'Yes'] : ['No', 'No'],
    };
  },
  solution: (params) => {
    const count = params.ys.length;
    return params.i > 0 && params.i < count - 1 ? centralDataSolution(params, params.i) : endSolution(params);
  },
};

/** The rate at every inside reading, as a column beside the readings. */
const dataRatesTable: Generator<DataParams> = {
  id: 'numer-data-rates-table',
  sample: (rng, difficulty) => sampleData(rng, difficulty > 1 ? 6 : 5, () => 1),
  render: (params): Slide => {
    const s = DATA_STORIES[params.story];
    const xs = dataXs(params);
    const count = params.ys.length;
    const inside = Array.from({ length: count - 2 }, (_, k) => k + 1);
    const answer = inside.map((k) => fmt(centralAt(params, k)));
    const slips = inside.flatMap((k) => [
      clean((params.ys[k + 1] - params.ys[k]) / params.h),
      clean((params.ys[k + 1] - params.ys[k - 1]) / params.h),
    ]);
    return {
      kind: 'table',
      prompt: [say(s.setup(fmt(params.h))), say(`Fill in ${s.rate} at each inside reading by a central difference.`)],
      columns: [s.x, s.y, `\\frac{d${s.y}}{d${s.x}}`],
      rows: xs.map((x, k) => [fmt(x), fmt(params.ys[k]), k === 0 || k === count - 1 ? '' : null]),
      bank: numberBank(answer, slips.map(fmt), around(inside.map((k) => centralAt(params, k)), 1), 3),
      answer,
    };
  },
  solution: (params) => {
    const count = params.ys.length;
    const { ys, h } = params;
    const xs = dataXs(params);
    const s = DATA_STORIES[params.story];
    return [
      { text: `Each inside reading uses the readings either side, $2h = ${fmt(2 * h)}$ apart:` },
      {
        tex: aligned(
          ...Array.from(
            { length: count - 2 },
            (_, j) => `${s.x} = ${fmt(xs[j + 1])}: &\\ \\frac{${fmt(ys[j + 2])} - ${paren(ys[j])}}{${fmt(2 * h)}} = ${fmt(centralAt(params, j + 1))}`,
          ),
        ),
      },
    ];
  },
};

/* ================================================================
 * Lesson 5: the second difference
 * ================================================================ */

/** Difficulty 1 is a cubic, where the second difference is exact; 2 adds x^4, where it is not. */
const secondValue: Generator<DiffParams> = {
  id: 'numer-second-value',
  sample: (rng, difficulty) => sampleDiff(rng, difficulty > 1 ? 4 : 3, difficulty > 1 ? [0.1, 0.2] : [0.1, 0.5, 1]),
  choices: (params) => {
    const e = estimates(params);
    const top = clean(e.up - 2 * e.at + e.down);
    return options(
      { tex: fmt(e.second), answer: fmt(e.second) },
      { tex: fmt(clean(top / params.h)), answer: fmt(clean(top / params.h)) },
      { tex: fmt(top), answer: fmt(top) },
      { tex: fmt(e.central), answer: fmt(e.central) },
      { tex: fmt(-e.second), answer: fmt(-e.second) },
    ).slice(0, 4);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`Estimate $f''(${fmt(params.a)})$ by the second difference with $h = ${fmt(params.h)}$.`), show(fOf(params.p))],
    lead: `f''(${fmt(params.a)}) \\approx`,
    keypad: [],
    answer: fmt(estimates(params).second),
    domain: 'real',
    mode: 'exact',
  }),
  solution: secondSolution,
};

const secondChordTree: Generator<DiffParams> = {
  id: 'numer-second-chord-tree',
  sample: (rng, difficulty) => sampleDiff(rng, 3, difficulty > 1 ? [0.1, 0.2] : [0.5, 1]),
  render: (params): Slide => {
    const { p, a, h } = params;
    const e = estimates(params);
    const top = clean(e.up - 2 * e.at + e.down);
    const answer = [e.up, e.at, e.down, top, e.second].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${fOf(p)}$. Top row: $f(${fmt(a + h)})$, $f(${fmt(a)})$, $f(${fmt(a - h)})$. Then the top of the fraction, then the estimate.`,
        ),
      ],
      expression: `f''(${fmt(a)}) \\approx \\frac{f(${fmt(a + h)}) - 2f(${fmt(a)}) + f(${fmt(a - h)})}{${fmt(h)}^{2}}`,
      nodes: [
        { id: 'up', from: [] },
        { id: 'at', from: [] },
        { id: 'down', from: [] },
        { id: 'top', from: ['up', 'at', 'down'] },
        { id: 'est', from: ['top'] },
      ],
      bank: numberBank(
        answer,
        [clean(e.up - e.at + e.down), clean(top / h), clean(e.up + 2 * e.at + e.down), -top].map(fmt),
        around([e.second], 1),
      ),
      answer,
    };
  },
  solution: secondSolution,
};

const secondFormulaTiles: Generator<FormulaParams> = {
  id: 'numer-second-formula-tiles',
  sample: (rng, difficulty) => {
    const { a, h } = sampleFormula(rng, difficulty);
    return { a, h: difficulty > 1 ? rng.pick([0.1, 0.2, 0.3, 0.5]) : h };
  },
  render: ({ a, h }): Slide => {
    const answer = [fmt(a + h), fmt(a), fmt(a - h), fmt(clean(h * h))];
    return {
      kind: 'tiles',
      prompt: [say(`Complete the second difference for $f''(${fmt(a)})$ with $h = ${fmt(h)}$.`)],
      template: `f''(${fmt(a)}) \\approx [f({0}) - 2f({1}) + f({2})] \\div {3}`,
      bank: fillBank(answer, [fmt(h), fmt(2 * h), fmt(a + 2 * h), fmt(a - 2 * h)]),
      answer,
    };
  },
  solution: ({ a, h }) => [
    { text: `The heights at $x = ${fmt(a)} + ${fmt(h)}$, at $x = ${fmt(a)}$ itself, and at $x = ${fmt(a)} - ${fmt(h)}$, over $h^{2} = ${fmt(clean(h * h))}$:` },
    { tex: `f''(${fmt(a)}) \\approx \\frac{f(${fmt(a + h)}) - 2f(${fmt(a)}) + f(${fmt(a - h)})}{${fmt(clean(h * h))}}` },
  ],
};

interface NatureParams extends DiffParams {
  /** Show the three heights at difficulty 1. */
  given: boolean;
}

/**
 * f = D(x^3 - 3s^2 x) + q has stationary points at x = s and x = -s; the
 * sign of the second difference at one of them says which kind it is.
 */
const natureFlow: Generator<NatureParams> = {
  id: 'numer-second-nature-flow',
  sample: (rng, difficulty) => {
    const s = rng.pick([1, 2]);
    const d = difficulty > 1 ? rng.pick([1, 2, -1]) : 1;
    const q = rng.int(-9, 9);
    return { p: [d, 0, -3 * s * s * d, q], a: s * rng.sign(), h: rng.pick([0.1, 0.2]), given: difficulty === 1 };
  },
  render: (params): Slide => {
    const { p, a, h, given } = params;
    const e = estimates(params);
    const kind = (sign: string) =>
      turned(
        [
          { label: 'Minimum', outcome: `A minimum at $x = ${fmt(a)}$.` },
          { label: 'Maximum', outcome: `A maximum at $x = ${fmt(a)}$.` },
        ],
        `${sign}${polyTex(p)}${a}${h}`,
      );
    return {
      kind: 'flow',
      prompt: [
        say(`$f$ has a stationary point at $x = ${fmt(a)}$. Use the second difference with $h = ${fmt(h)}$ to find its nature.`),
        ...(given ? [show(heights(params, e, ['up', 'at', 'down']))] : []),
      ],
      subject: fOf(p),
      steps: [
        {
          id: 'sign',
          ask: 'Work out the second difference. Is it positive or negative?',
          branches: [
            { label: 'Positive', to: 'pos' },
            { label: 'Negative', to: 'neg' },
          ],
        },
        { id: 'pos', ask: 'So what kind of stationary point is it?', branches: kind('pos') },
        { id: 'neg', ask: 'So what kind of stationary point is it?', branches: kind('neg') },
      ],
      answer: e.second > 0 ? ['Positive', 'Minimum'] : ['Negative', 'Maximum'],
    };
  },
  solution: (params) => {
    const e = estimates(params);
    return [
      ...secondSolution(params),
      {
        text:
          e.second > 0
            ? '$f\'\'$ is positive there: the curve bends up, so the stationary point is a minimum.'
            : '$f\'\'$ is negative there: the curve bends down, so the stationary point is a maximum.',
      },
    ];
  },
};

export const numericalDifferentiationGenerators = [
  fdForward,
  fdChordTree,
  fdFormulaTiles,
  fdOverFlow,
  cdValue,
  cdChordTree,
  cdFormulaTiles,
  cdSteps,
  fdError,
  cdError,
  halveChoice,
  errorsTree,
  dataCentral,
  dataEndRate,
  dataWhichFlow,
  dataRatesTable,
  secondValue,
  secondChordTree,
  secondFormulaTiles,
  natureFlow,
];
