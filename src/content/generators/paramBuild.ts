/**
 * Parametrising a curve: Cartesian to parametric (Parametric & Implicit,
 * level 10, "Parametrising a Curve").
 *
 * The reverse of what Parametric Curves taught. There a curve came as $x$ and
 * $y$ in $t$ and the learner removed $t$; here it comes as one equation in $x$
 * and $y$ and the learner writes a pair of equations that trace it: a graph as
 * $x = t$ (or $x = t + a$, $x = kt$), a line from its two end points, a
 * circle and an ellipse with $\cos t$ and $\sin t$, and the parabola
 * $y^2 = 4ax$ as $x = at^2$, $y = 2at$. The last lesson checks a proposed
 * parametrisation by substituting it back.
 *
 * Every question is built from whole numbers, so every point, coefficient and
 * tile is whole. `paramBuild.test.ts` reads each rendered slide back, turns its
 * TeX into mathjs, and substitutes the learner's answer into the Cartesian
 * equation the slide shows, rather than trusting the numbers the generator
 * worked with.
 *
 * As everywhere, `*Tex` is what the learner reads and `answer` is what mathjs
 * grades; the two are never the same string.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import {
  OPERATOR_KEYS,
  bareTile,
  bracketed,
  coef,
  mix,
  numberBank,
  numberChoices,
  pair,
  paramSvg,
  polyAnswer,
  polyTex,
  signed,
  spaced,
  steered,
  tokenBank,
  treeBank,
  turned,
} from './parametricImplicit';

/* ---------- Shared helpers ---------- */

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** An answer in t. */
const T_KEYS: KeypadKey[] = [spaced('t'), ...OPERATOR_KEYS];

/** `c + dt` as the learner reads it: `3 - 2t`, `-1 + t`, `4t`. */
export function lin(c: number, d: number, v = 't'): string {
  const size = Math.abs(d);
  const body = `${size === 1 ? '' : size}${v}`;
  if (c === 0) return d < 0 ? `-${body}` : body;
  return `${c} ${d < 0 ? '-' : '+'} ${body}`;
}

/** A square about a centre: `(x - 2)^{2}`, or `x^{2}` about 0. */
const sq = (v: string, centre: number): string => (centre === 0 ? `${v}^{2}` : `(${v} ${signed(-centre)})^{2}`);

/** `centre + r\cos t`, or `r\cos t` about 0. */
const trigTerm = (centre: number, r: number, fn: 'cos' | 'sin'): string =>
  centre === 0 ? `${r}\\${fn} t` : `${centre} + ${r}\\${fn} t`;

/** The four quarter turns a point question asks about. */
const ANGLE_TEX = ['0', '\\frac{\\pi}{2}', '\\pi', '\\frac{3\\pi}{2}'];
const COS_AT = [1, 0, -1, 0];
const SIN_AT = [0, 1, 0, -1];

/** A value of t that may be a half, as the learner reads it. */
const tTex = (t: number): string =>
  Number.isInteger(t) ? `${t}` : `${t < 0 ? '-' : ''}\\tfrac{${Math.abs(2 * t)}}{2}`;

/** A choice option list for a native choice slide, answer placed by the question's own numbers. */
function placed(correct: string, wrong: string[], turn: number): { options: { id: string; label: string; tex: boolean }[]; correctId: string } {
  const labels = turned([correct, ...wrong], turn);
  return {
    options: labels.map((label, i) => ({ id: `opt${i}`, label, tex: true })),
    correctId: `opt${labels.indexOf(correct)}`,
  };
}

/** Labels in order with repeats dropped. */
const unique = <T>(items: T[]): T[] => items.filter((item, i) => items.indexOf(item) === i);

/* ---------- A graph y = f(x) as a parametric curve ---------- */

export interface GraphParams {
  /** y = f(x), a quadratic, highest power first. */
  f: [number, number, number];
  /** x = k t + a. */
  k: number;
  a: number;
}

/** f(k t + a), expanded: coefficients highest power first. */
export function composed({ f: [p, q, r], k, a }: GraphParams): [number, number, number] {
  return [p * k * k, 2 * p * k * a + q * k, p * a * a + q * a + r];
}

/** y = f(x) with every x replaced by a bracket, for the first line of working. */
function substitutedTex({ f: [p, q, r], k, a }: GraphParams): string {
  const body = `(${lin(a, k)})`;
  let out = `${coef(p)}${body}^{2}`;
  if (q !== 0) out += ` ${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}${body}`;
  if (r !== 0) out += ` ${signed(r)}`;
  return out;
}

function graphPrompt(params: GraphParams, ask: string): Block[] {
  return [
    prose('A curve has Cartesian equation'),
    display(`y = ${polyTex(params.f, 'x')}`),
    prose('It is parametrised with'),
    display(`x = ${lin(params.a, params.k)}`),
    prose(ask),
  ];
}

function graphSolution(params: GraphParams): SolutionStep[] {
  const { k, a } = params;
  const bracket = lin(a, k);
  const square = [k * k, 2 * k * a, a * a];
  return [
    { text: `Replace every $x$ in the Cartesian equation with $${bracket}$.`, tex: `y = ${substitutedTex(params)}` },
    { text: 'Expand the square first.', tex: `(${bracket})^{2} = ${polyTex(square)}` },
    { text: 'Then collect the terms.', tex: `y = ${polyTex(composed(params))}` },
  ];
}

function sampleGraph(rng: Rng, difficulty: number): GraphParams {
  for (;;) {
    const hard = difficulty >= 2;
    const scaled = hard && rng.chance(0.4);
    const params: GraphParams = {
      f: [hard ? rng.pick([-1, 1, 2, 3]) : 1, rng.int(-5, 5), rng.int(-6, 6)],
      k: scaled ? rng.pick([2, 3]) : 1,
      a: scaled ? 0 : rng.int(1, 4) * rng.sign(),
    };
    const [, b, c] = composed(params);
    if (b === 0 || c === 0) continue;
    return params;
  }
}

/**
 * A graph written in t: substitute the given x = kt + a into y = f(x).
 *
 * The distractors are y with x merely renamed t, the substitution with the
 * shift's sign turned over, and, for a stretch x = kt, the k left unsquared.
 */
const pparGraph: Generator<GraphParams> = {
  id: 'ppar-graph',
  sample: sampleGraph,
  choices: (params) => {
    const { f, k, a } = params;
    const option = (coeffs: number[]) => ({ tex: `y = ${polyTex(coeffs)}`, answer: polyAnswer(coeffs) });
    const right = composed(params);
    const [p, q, r] = f;
    const wrong =
      k === 1
        ? [f, composed({ f, k, a: -a }), [p, q, right[2]], [p, right[1], r]]
        : [f, [p * k, q * k, r], [p * k * k, q, r], [p * k, q, r]];
    const all = options(option(right), ...wrong.map(option));
    return steered(all.slice(0, 4), mix(p, q, r, k, a), all.slice(4));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: graphPrompt(params, 'Write $y$ in terms of $t$.'),
    lead: 'y =',
    keypad: T_KEYS,
    answer: polyAnswer(composed(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: graphSolution,
};

/**
 * The same substitution, expanded into tiles: y = pt^2 + bt + c.
 *
 * The bank holds the middle coefficient of f itself (the x renamed t), the
 * cross term not doubled, and the answer's signs turned over.
 */
const pparGraphTiles: Generator<GraphParams> = {
  id: 'ppar-graph-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const params: GraphParams = {
        f: [difficulty >= 2 ? rng.pick([2, 3]) : 1, rng.int(-5, 5), rng.int(-6, 6)],
        k: 1,
        a: rng.int(1, 4) * rng.sign(),
      };
      const [, b, c] = composed(params);
      if (Math.abs(b) < 2 || c === 0) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const [p, q, r] = params.f;
    const { a } = params;
    const [, b, c] = composed(params);
    const lead = p === 1 ? [] : [`${p}`];
    const answer = [...lead, signed(b), signed(c)];
    const extras = [q, p * a + q, -b, -c, r, p * a * a + r].filter((v) => v !== 0).map(signed);
    return {
      kind: 'tiles',
      prompt: graphPrompt(params, 'Complete $y$ in terms of $t$.'),
      template: p === 1 ? 'y = t^2 {0}t {1}' : 'y = {0}t^2 {1}t {2}',
      bank: tokenBank(answer, p === 1 ? extras : [`${p * p}`, ...extras], p === 1 ? 3 : 4),
      answer,
    };
  },
  solution: graphSolution,
};

/* ---------- Which t gives a point of the graph ---------- */

export interface GraphTParams extends GraphParams {
  t0: number;
}

const graphPoint = ({ f: [p, q, r], k, a, t0 }: GraphTParams): [number, number] => {
  const x = k * t0 + a;
  return [x, p * x * x + q * x + r];
};

/**
 * The value of t at a point of a parametrised graph: only the x equation
 * fixes it. On a slider, since the question is where along the parameter the
 * point sits.
 */
const pparGraphT: Generator<GraphTParams> = {
  id: 'ppar-graph-t',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const params: GraphTParams = {
        f: [1, rng.int(-5, 5), rng.int(-6, 6)],
        k: hard ? rng.pick([1, 2, 3]) : 1,
        a: rng.int(1, 5) * rng.sign(),
        t0: rng.int(1, 5) * rng.sign(),
      };
      const [x, y] = graphPoint(params);
      // The point's x must differ from t, or the question answers itself.
      if (x === params.t0 || Math.abs(y) > 40) continue;
      return params;
    }
  },
  choices: (params) => {
    const { t0, a, k } = params;
    const [x] = graphPoint(params);
    return numberChoices(t0, [x, x + a, x - a, -t0], mix(t0, a, k, x));
  },
  render: (params): Slide => {
    const [x, y] = graphPoint(params);
    return {
      kind: 'slider',
      prompt: graphPrompt(params, `Which value of $t$ gives the point $${pair(x, y)}$?`),
      min: -6,
      max: 6,
      step: 1,
      answer: params.t0,
      readout: 't = {v}',
    };
  },
  solution: (params) => {
    const { k, a, t0 } = params;
    const [x, y] = graphPoint(params);
    return [
      { text: `Only the $x$ equation holds $t$ alone, so set it equal to the point's $x$.`, tex: `${lin(a, k)} = ${x}` },
      { tex: `t = ${t0}` },
      { text: `Check: at $x = ${x}$ the Cartesian equation gives $y = ${y}$, as it should.` },
    ];
  },
};

/* ---------- A line through two points ---------- */

export interface LineParams {
  x1: number;
  y1: number;
  dx: number;
  dy: number;
}

const lineEquations = ({ x1, y1, dx, dy }: LineParams): string => `x = ${lin(x1, dx)} \\qquad y = ${lin(y1, dy)}`;

const lineEnds = ({ x1, y1, dx, dy }: LineParams): [string, string] => [pair(x1, y1), pair(x1 + dx, y1 + dy)];

function sampleLine(rng: Rng, difficulty: number, minStep: number): LineParams {
  const size = difficulty >= 2 ? 8 : 5;
  for (;;) {
    const x1 = rng.int(-size, size);
    const y1 = rng.int(-size, size);
    const x2 = rng.int(-size, size);
    const y2 = rng.int(-size, size);
    if (Math.abs(x2 - x1) < minStep || Math.abs(y2 - y1) < minStep) continue;
    return { x1, y1, dx: x2 - x1, dy: y2 - y1 };
  }
}

/**
 * The line through A and B: x = x1 + (x2 - x1)t, y = y1 + (y2 - y1)t, as
 * tiles. The bank holds B's coordinates as the start, and the steps taken
 * from B to A.
 */
const pparLineTiles: Generator<LineParams> = {
  id: 'ppar-line-tiles',
  sample: (rng, difficulty) => sampleLine(rng, difficulty, 2),
  choices: (params) => {
    const { x1, y1, dx, dy } = params;
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const option = (xc: number, xd: number, yc: number, yd: number) => ({
      tex: `x = ${lin(xc, xd)}, \\quad y = ${lin(yc, yd)}`,
    });
    const all = options(
      option(x1, dx, y1, dy),
      option(x2, dx, y2, dy),
      option(x1, -dx, y1, -dy),
      option(x1, x2, y1, y2),
      option(x1, dy, y1, dx),
      option(x2, x1, y2, y1),
    );
    return steered(all.slice(0, 4), mix(x1, y1, dx, dy), all.slice(4));
  },
  render: (params): Slide => {
    const { x1, y1, dx, dy } = params;
    const [A, B] = lineEnds(params);
    const answer = [bareTile(x1), signed(dx), bareTile(y1), signed(dy)];
    return {
      kind: 'tiles',
      prompt: [
        prose(`A line passes through $A${A}$ and $B${B}$.`),
        prose('Which parametric equations trace it, with $t = 0$ at $A$ and $t = 1$ at $B$?'),
      ],
      template: 'x = {0} {1}t, \\quad y = {2} {3}t',
      bank: tokenBank(answer, [signed(-dx), signed(-dy), bareTile(x1 + dx), bareTile(y1 + dy), signed(x1 + dx), signed(y1 + dy)], 3),
      answer,
    };
  },
  solution: (params) => {
    const { x1, y1, dx, dy } = params;
    return [
      { text: `At $t = 0$ the line is at $A$, so the numbers on their own are $A$'s coordinates, $${x1}$ and $${y1}$.` },
      { text: 'The numbers in front of $t$ are the steps from $A$ to $B$.', tex: `x_2 - x_1 = ${x1 + dx} - ${bracketed(x1)} = ${dx}` },
      { tex: `y_2 - y_1 = ${y1 + dy} - ${bracketed(y1)} = ${dy}` },
      { text: 'So the line is', tex: `x = ${lin(x1, dx)}` },
      { tex: `y = ${lin(y1, dy)}` },
    ];
  },
};

/** A start plus its step, worked: `3 - 4 = -1`, or just the step from 0. */
const stepped = (start: number, step: number): string => (start === 0 ? `${step}` : `${start} ${signed(step)} = ${start + step}`);

/** Reading A and B back off a line's equations: t = 0, then t = 1. */
const pparLineEnds: Generator<LineParams> = {
  id: 'ppar-line-ends',
  sample: (rng, difficulty) => sampleLine(rng, difficulty, 1),
  render: (params): Slide => {
    const { x1, y1, dx, dy } = params;
    const answer = [x1, y1, x1 + dx, y1 + dy];
    return {
      kind: 'tiles',
      prompt: [
        prose('A line is traced by'),
        display(lineEquations(params)),
        prose('It runs from $A$ at $t = 0$ to $B$ at $t = 1$. Where are $A$ and $B$?'),
      ],
      template: 'A = ({0}, {1}), \\quad B = ({2}, {3})',
      bank: numberBank(answer, [dx, dy, x1 - dx, y1 - dy]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { x1, y1, dx, dy } = params;
    const [A, B] = lineEnds(params);
    return [
      { text: `Put $t = 0$ into both equations: the $t$ terms vanish.`, tex: `A = ${A}` },
      { text: `Put $t = 1$: each coordinate gains its step, $${dx}$ and $${dy}$.`, tex: `x = ${stepped(x1, dx)}` },
      { tex: `y = ${stepped(y1, dy)}` },
      { text: `So $B = ${B}$.` },
    ];
  },
};

/* ---------- A point along a line ---------- */

export interface LinePointParams extends LineParams {
  /** A whole number, or a half. */
  k: number;
}

const linePointAt = ({ x1, y1, dx, dy }: LineParams, t: number): [number, number] => [x1 + t * dx, y1 + t * dy];

function sampleLinePoint(rng: Rng, difficulty: number, values: number[]): LinePointParams {
  for (;;) {
    const k = rng.pick(values);
    const line = sampleLine(rng, difficulty, 1);
    if (!Number.isInteger(k) && (line.dx % 2 !== 0 || line.dy % 2 !== 0)) continue;
    const [x, y] = linePointAt(line, k);
    if (Math.abs(x) > 30 || Math.abs(y) > 30) continue;
    return { ...line, k };
  }
}

/**
 * The point at a given t, as a tree: the two steps from A to B, then the
 * point. The bank holds the steps with their signs turned, and the point
 * reached by stepping back from A instead of forward.
 */
const pparLinePoint: Generator<LinePointParams> = {
  id: 'ppar-line-point',
  sample: (rng, difficulty) =>
    sampleLinePoint(rng, difficulty, difficulty >= 2 ? [-2, -1, 0.5, 2, 3] : [-1, 2, 3]),
  render: (params): Slide => {
    const { x1, y1, dx, dy, k } = params;
    const [A, B] = lineEnds(params);
    const [x, y] = linePointAt(params, k);
    const [xb, yb] = linePointAt(params, -k);
    return {
      kind: 'tree',
      prompt: [
        prose(`A line runs from $A${A}$ at $t = 0$ to $B${B}$ at $t = 1$, traced by`),
        display('x = x_1 + (x_2 - x_1)t \\qquad y = y_1 + (y_2 - y_1)t'),
        prose(
          `Find the point where $t = ${tTex(k)}$. The top row is $x_2 - x_1$ and $y_2 - y_1$; the row below is $x$ and $y$ there.`,
        ),
      ],
      expression: `t = ${tTex(k)}`,
      nodes: [
        { id: 'dx', from: [] },
        { id: 'dy', from: [] },
        { id: 'x', from: ['dx'] },
        { id: 'y', from: ['dy'] },
      ],
      bank: treeBank([dx, dy, x, y], [-dx, -dy, xb, yb, x1 + dx + k * dx, y1 + dy + k * dy]),
      answer: [dx, dy, x, y].map(String),
    };
  },
  solution: (params) => {
    const { x1, y1, dx, dy, k } = params;
    const [x, y] = linePointAt(params, k);
    return [
      { text: 'The steps from $A$ to $B$:', tex: `x_2 - x_1 = ${dx} \\qquad y_2 - y_1 = ${dy}` },
      { text: `Put $t = ${tTex(k)}$ into each equation.`, tex: `x = ${atT(x1, dx, k)} = ${x}` },
      { tex: `y = ${atT(y1, dy, k)} = ${y}` },
      { text: `So the point is $${pair(x, y)}$.` },
    ];
  },
};

/** `c + dt` with a value put in for t, signs kept as the line has them: `3 - 4(-2)`. */
const atT = (c: number, d: number, t: number): string => lin(c, d).replace('t', `(${tTex(t)})`);

/** Where a point sits on a line, from its value of t. */
const PLACES = ['Before $A$', 'Between $A$ and $B$', 'Beyond $B$'] as const;
const placeOf = (t: number): (typeof PLACES)[number] => (t < 0 ? PLACES[0] : t < 1 ? PLACES[1] : PLACES[2]);
const PLACE_OUTCOME: Record<(typeof PLACES)[number], string> = {
  'Before $A$': 'Then $t$ would be negative.',
  'Between $A$ and $B$': 'Then $t$ would be between $0$ and $1$.',
  'Beyond $B$': 'Then $t$ would be greater than $1$.',
};

/**
 * Where a point of a line sits: find its t from the x equation, then read
 * where that t puts it. Wrong turns end in what they lead to, as facts.
 */
const pparLineWhereFlow: Generator<LinePointParams> = {
  id: 'ppar-line-where-flow',
  sample: (rng, difficulty) =>
    sampleLinePoint(rng, difficulty, difficulty >= 2 ? [-3, -2, -1, 0.5, 2, 3, 4] : [-2, -1, 0.5, 2, 3]),
  render: (params): Slide => {
    const { x1, dx, k } = params;
    const [x, y] = linePointAt(params, k);
    const salt = mix(params.x1, params.y1, dx, params.dy, 2 * k);
    const wrongT = unique([-k, x - x1, x]).filter((v) => v !== k && Number.isFinite(v));
    return {
      kind: 'flow',
      prompt: [
        prose('A line is traced by'),
        display(lineEquations(params)),
        prose(`from $A$ at $t = 0$ to $B$ at $t = 1$. Where on it is $P${pair(x, y)}$?`),
      ],
      subject: `P = ${pair(x, y)}`,
      steps: [
        {
          id: 't',
          ask: `Which value of $t$ gives $x = ${x}$?`,
          branches: turned(
            [
              { label: `$t = ${tTex(k)}$`, to: 'place' },
              ...wrongT.map((v) => ({ label: `$t = ${tTex(v)}$`, outcome: `Then $x = ${x1 + v * dx}$ there.` })),
            ],
            salt % (wrongT.length + 1),
          ),
        },
        {
          id: 'place',
          ask: `So where is $P$?`,
          branches: PLACES.map((place) => ({ label: place, outcome: PLACE_OUTCOME[place] })),
        },
      ],
      answer: [`$t = ${tTex(k)}$`, placeOf(k)],
    };
  },
  solution: (params) => {
    const { x1, y1, dx, dy, k } = params;
    const [x, y] = linePointAt(params, k);
    const where =
      k < 0
        ? 'negative, so $P$ is before $A$, on the far side from $B$'
        : k < 1
          ? 'between $0$ and $1$, so $P$ is between $A$ and $B$'
          : 'greater than $1$, so $P$ is beyond $B$';
    return [
      { text: 'Solve the $x$ equation for $t$.', tex: `${lin(x1, dx)} = ${x}` },
      { tex: `t = ${tTex(k)}` },
      { text: `Check it in the $y$ equation.`, tex: `y = ${atT(y1, dy, k)} = ${y}` },
      { text: `$t$ is ${where}.` },
    ];
  },
};

/* ---------- Circles ---------- */

export interface CircleParams {
  a: number;
  b: number;
  r: number;
}

export const circleEquation = ({ a, b, r }: CircleParams): string => `${sq('x', a)} + ${sq('y', b)} = ${r * r}`;

function sampleCircle(rng: Rng, difficulty: number): CircleParams {
  const hard = difficulty >= 2;
  return {
    a: rng.int(1, hard ? 6 : 4) * rng.sign(),
    b: rng.int(1, hard ? 6 : 4) * rng.sign(),
    r: rng.int(2, hard ? 9 : 5),
  };
}

function circleSolution({ a, b, r }: CircleParams): SolutionStep[] {
  return [
    { text: 'Compare it with the general circle:', tex: '(x - a)^{2} + (y - b)^{2} = r^{2}' },
    {
      text: `The signs in the brackets turn over, so the centre is $${pair(a, b)}$. The radius is the square root of the right-hand side.`,
      tex: `r = \\sqrt{${r * r}} = ${r}`,
    },
    { text: 'So the circle is traced by', tex: `x = ${trigTerm(a, r, 'cos')}` },
    { tex: `y = ${trigTerm(b, r, 'sin')}` },
  ];
}

/**
 * A circle's parametrisation from its equation, as tiles. The bank holds the
 * centre's signs turned over, the radius squared, and twice the radius.
 */
const pparCircleTiles: Generator<CircleParams> = {
  id: 'ppar-circle-tiles',
  sample: sampleCircle,
  render: (params): Slide => {
    const { a, b, r } = params;
    const answer = [bareTile(a), `${r}`, bareTile(b), `${r}`];
    return {
      kind: 'tiles',
      prompt: [prose('A circle has equation'), display(circleEquation(params)), prose('Complete a parametrisation of it.')],
      template: 'x = {0} + {1}\\cos t, \\quad y = {2} + {3}\\sin t',
      bank: tokenBank(answer, [bareTile(-a), bareTile(-b), `${r * r}`, `${2 * r}`, `${r + 1}`, bareTile(b + 1)], 3),
      answer,
    };
  },
  solution: circleSolution,
};

/**
 * The same, as three decisions: the centre, the radius, then the
 * parametrisation they give.
 */
const pparCircleFlow: Generator<CircleParams> = {
  id: 'ppar-circle-flow',
  sample: sampleCircle,
  render: (params): Slide => {
    const { a, b, r } = params;
    const salt = mix(a, b, r);
    const traced = (xc: number, yc: number, rr: number) => `$x = ${trigTerm(xc, rr, 'cos')}, \\quad y = ${trigTerm(yc, rr, 'sin')}$`;
    const right = traced(a, b, r);
    return {
      kind: 'flow',
      prompt: [prose('Parametrise this circle.')],
      subject: circleEquation(params),
      steps: [
        {
          id: 'centre',
          ask: 'Where is its centre?',
          branches: turned(
            [
              { label: `$${pair(a, b)}$`, to: 'radius' },
              { label: `$${pair(-a, -b)}$`, outcome: `Then the equation would start $${sq('x', -a)}$.` },
              { label: `$${pair(b, a)}$`, outcome: `Then the equation would start $${sq('x', b)}$.` },
            ].filter((branch, i, all) => all.findIndex((other) => other.label === branch.label) === i),
            salt % 3,
          ),
        },
        {
          id: 'radius',
          ask: 'What is its radius?',
          branches: turned(
            [
              { label: `$${r}$`, to: 'traced' },
              { label: `$${r * r}$`, outcome: `Then the right-hand side would be $${r ** 4}$.` },
              { label: `$${2 * r}$`, outcome: `Then the right-hand side would be $${4 * r * r}$.` },
            ].filter((branch, i, all) => all.findIndex((other) => other.label === branch.label) === i),
            (salt >>> 4) % 3,
          ),
        },
        {
          id: 'traced',
          ask: 'So which equations trace it?',
          branches: turned(
            [
              { label: right, outcome: `That circles $${pair(a, b)}$ at a distance of $${r}$.` },
              { label: traced(a, b, r * r), outcome: `Then the distance from the centre would be $${r * r}$.` },
              { label: traced(-a, -b, r), outcome: `Then the centre would be $${pair(-a, -b)}$.` },
            ],
            (salt >>> 8) % 3,
          ),
        },
      ],
      answer: [`$${pair(a, b)}$`, `$${r}$`, right],
    };
  },
  solution: circleSolution,
};

/* ---------- Where t = 0, π/2, ... puts the point ---------- */

export interface ConicPointParams {
  a: number;
  b: number;
  /** The multipliers of cos t and sin t: equal for a circle. */
  p: number;
  q: number;
  /** t is this many quarter turns. */
  quarter: number;
}

export const conicPoint = ({ a, b, p, q, quarter }: ConicPointParams): [number, number] => [
  a + p * COS_AT[quarter],
  b + q * SIN_AT[quarter],
];

/** Across (x) at t = 0 and π, up (y) at π/2 and 3π/2: the coordinate that moves. */
const askedAxis = (quarter: number): 'x' | 'y' => (quarter % 2 === 0 ? 'x' : 'y');

export const ellipseEquation = ({ a, b, p, q }: { a: number; b: number; p: number; q: number }): string =>
  `\\frac{${sq('x', a)}}{${p * p}} + \\frac{${sq('y', b)}}{${q * q}} = 1`;

function conicPointSlide(params: ConicPointParams, circle: boolean): Slide {
  const { a, b, p, q, quarter } = params;
  const axis = askedAxis(quarter);
  const [x, y] = conicPoint(params);
  const span = 10;
  const moved = a !== 0 || b !== 0;
  const traced = circle
    ? 'x = a + r\\cos t \\qquad y = b + r\\sin t'
    : moved
      ? 'x = a + p\\cos t \\qquad y = b + q\\sin t'
      : 'x = p\\cos t \\qquad y = q\\sin t';
  return {
    kind: 'slider',
    prompt: [
      prose(circle ? 'The circle' : 'The ellipse'),
      display(circle ? circleEquation({ a, b, r: p }) : ellipseEquation(params)),
      prose('is traced by'),
      display(traced),
      prose(`What is the $${axis}$-coordinate of the point where $t = ${ANGLE_TEX[quarter]}$?`),
    ],
    min: -span,
    max: span,
    step: 1,
    answer: axis === 'x' ? x : y,
    readout: `${axis} = {v}`,
    figure: {
      svg: paramSvg((t) => [a + p * Math.cos(t), b + q * Math.sin(t)], {
        span,
        tMin: 0,
        tMax: 2 * Math.PI,
        marks: [[a, b]],
        label: `The ${circle ? 'circle' : 'ellipse'} drawn on axes, with its centre marked`,
      }),
      xMin: -span,
      xMax: span,
      axis,
    },
  };
}

function conicPointSolution(params: ConicPointParams, circle: boolean): SolutionStep[] {
  const { a, b, p, q, quarter } = params;
  const axis = askedAxis(quarter);
  const [x, y] = conicPoint(params);
  const angle = ANGLE_TEX[quarter];
  const centre = axis === 'x' ? a : b;
  const size = axis === 'x' ? p : q;
  const fn = axis === 'x' ? 'cos' : 'sin';
  const ratio = axis === 'x' ? COS_AT[quarter] : SIN_AT[quarter];
  const r = circle ? 'the radius' : `the ${axis === 'x' ? 'multiplier of $\\cos t$' : 'multiplier of $\\sin t$'}`;
  return [
    {
      text: `Read the centre and ${circle ? 'radius' : 'multipliers'}: centre $${pair(a, b)}$, ${circle ? `radius $${p}$` : `$${p}$ across and $${q}$ up`}.`,
    },
    { text: `At $t = ${angle}$, $\\${fn} t = ${ratio}$.`, tex: `${axis} = ${centre === 0 ? '' : `${centre} + `}${size}\\${fn} ${angle}` },
    { tex: centre === 0 ? `${axis} = ${ratio * size}` : `${axis} = ${centre} ${ratio > 0 ? '+' : '-'} ${size} = ${axis === 'x' ? x : y}` },
    { text: `So the point is $${pair(x, y)}$: ${r} away from the centre, ${quarter === 0 ? 'to the right' : quarter === 1 ? 'straight up' : quarter === 2 ? 'to the left' : 'straight down'}.` },
  ];
}

function conicPointChoices(params: ConicPointParams): ChoiceOption[] {
  const { a, b, p, q, quarter } = params;
  const axis = askedAxis(quarter);
  const [x, y] = conicPoint(params);
  const [xo, yo] = conicPoint({ ...params, quarter: (quarter + 2) % 4 });
  const value = axis === 'x' ? x : y;
  const slips = axis === 'x' ? [xo, a, p, y, a + q] : [yo, b, q, x, b + p];
  return numberChoices(value, slips, mix(a, b, p, q, quarter));
}

const sampleQuarter = (rng: Rng, difficulty: number): number => (difficulty >= 2 ? rng.int(0, 3) : rng.int(0, 1));

/** Which coordinate a circle's point has at a quarter turn, slid on the figure. */
const pparCircleSlider: Generator<ConicPointParams> = {
  id: 'ppar-circle-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const { a, b, r } = sampleCircle(rng, difficulty);
      const params: ConicPointParams = { a, b, p: r, q: r, quarter: sampleQuarter(rng, difficulty) };
      const [x, y] = conicPoint(params);
      // Inside the picture, and never 0, where an untouched slider rests.
      if (Math.abs(a) + r > 9 || Math.abs(b) + r > 9) continue;
      if ((askedAxis(params.quarter) === 'x' ? x : y) === 0) continue;
      return params;
    }
  },
  choices: conicPointChoices,
  render: (params) => conicPointSlide(params, true),
  solution: (params) => conicPointSolution(params, true),
};

/* ---------- Ellipses ---------- */

export interface EllipseParams {
  a: number;
  b: number;
  p: number;
  q: number;
  /** How the equation is written. */
  form: 'fraction' | 'whole';
}

function sampleAxes(rng: Rng, top: number): [number, number] {
  const p = rng.int(2, top);
  let q = rng.int(2, top);
  while (q === p) q = rng.int(2, top);
  return [p, q];
}

export const wholeEllipse = (p: number, q: number): string => `${q * q}x^{2} + ${p * p}y^{2} = ${p * p * q * q}`;

const ellipseShown = ({ a, b, p, q, form }: EllipseParams): string =>
  form === 'whole' ? wholeEllipse(p, q) : ellipseEquation({ a, b, p, q });

/**
 * An ellipse's parametrisation as tiles. Difficulty 1 gives it as
 * x^2/p^2 + y^2/q^2 = 1; difficulty 2 gives it with whole numbers, to be
 * divided through first, or with its centre moved. The bank holds p^2 and
 * q^2 (the denominators copied across), and a moved centre's signs turned.
 */
const pparEllipseTiles: Generator<EllipseParams> = {
  id: 'ppar-ellipse-tiles',
  sample: (rng, difficulty) => {
    if (difficulty < 2) {
      const [p, q] = sampleAxes(rng, 8);
      return { a: 0, b: 0, p, q, form: 'fraction' };
    }
    if (rng.chance(0.5)) {
      const [p, q] = sampleAxes(rng, 7);
      return { a: 0, b: 0, p, q, form: 'whole' };
    }
    const [p, q] = sampleAxes(rng, 6);
    return { a: rng.int(1, 5) * rng.sign(), b: rng.int(1, 5) * rng.sign(), p, q, form: 'fraction' };
  },
  render: (params): Slide => {
    const { a, b, p, q } = params;
    const moved = a !== 0 || b !== 0;
    const answer = moved ? [bareTile(a), `${p}`, bareTile(b), `${q}`] : [`${p}`, `${q}`];
    const extras = [`${p * p}`, `${q * q}`, ...(moved ? [bareTile(-a), bareTile(-b)] : [`${2 * p}`, `${2 * q}`])];
    return {
      kind: 'tiles',
      prompt: [prose('An ellipse has equation'), display(ellipseShown(params)), prose('Complete a parametrisation of it.')],
      template: moved
        ? 'x = {0} + {1}\\cos t, \\quad y = {2} + {3}\\sin t'
        : 'x = {0}\\cos t, \\quad y = {1}\\sin t',
      bank: tokenBank(answer, extras, 3),
      answer,
    };
  },
  solution: ({ a, b, p, q, form }) => {
    const steps: SolutionStep[] = [];
    if (form === 'whole') {
      steps.push(
        { text: `Divide both sides by $${p * p * q * q}$ so the right-hand side is $1$.`, tex: ellipseEquation({ a, b, p, q }) },
      );
    }
    steps.push(
      { text: `The denominators are $${p * p} = ${p}^{2}$ and $${q * q} = ${q}^{2}$.` },
      { text: `So $x$ takes $${p}\\cos t$ and $y$ takes $${q}\\sin t$${a !== 0 || b !== 0 ? `, each added to the centre $${pair(a, b)}$` : ''}.`, tex: `x = ${trigTerm(a, p, 'cos')}` },
      { tex: `y = ${trigTerm(b, q, 'sin')}` },
    );
    return steps;
  },
};

export interface EllipseFlowParams {
  p: number;
  q: number;
}

/**
 * A whole-number ellipse q^2x^2 + p^2y^2 = p^2q^2, parametrised in three
 * decisions: what to divide by, the equation that gives, and the
 * parametrisation.
 */
const pparEllipseFlow: Generator<EllipseFlowParams> = {
  id: 'ppar-ellipse-flow',
  sample: (rng, difficulty) => {
    const [p, q] = sampleAxes(rng, difficulty >= 2 ? 9 : 7);
    return { p, q };
  },
  render: ({ p, q }): Slide => {
    const P = p * p;
    const Q = q * q;
    const salt = mix(p, q);
    const traced = (xs: number, ys: number) => `$x = ${xs}\\cos t, \\quad y = ${ys}\\sin t$`;
    const right = traced(p, q);
    return {
      kind: 'flow',
      prompt: [prose('Parametrise this ellipse.')],
      subject: wholeEllipse(p, q),
      steps: [
        {
          id: 'divide',
          ask: 'What do you divide both sides by first?',
          branches: turned(
            [
              { label: `$${P * Q}$`, to: 'form' },
              { label: `$${Q}$`, outcome: `Then the right-hand side would be $${P}$, not $1$.` },
              { label: `$${P}$`, outcome: `Then the right-hand side would be $${Q}$, not $1$.` },
            ],
            salt % 3,
          ),
        },
        {
          id: 'form',
          ask: 'Which equation does that give?',
          branches: turned(
            [
              { label: `$${ellipseEquation({ a: 0, b: 0, p, q })}$`, to: 'traced' },
              {
                label: `$${ellipseEquation({ a: 0, b: 0, p: q, q: p })}$`,
                outcome: `Then multiplying back by $${P * Q}$ would give $${P}x^{2}$, not $${Q}x^{2}$.`,
              },
            ],
            (salt >>> 4) % 2,
          ),
        },
        {
          id: 'traced',
          ask: 'So which equations trace it?',
          branches: turned(
            [
              { label: right, outcome: `That reaches $${p}$ across and $${q}$ up.` },
              { label: traced(P, Q), outcome: `Then it would reach $${P}$ across, and $\\frac{x^{2}}{${P}}$ would be $${P}\\cos^{2} t$.` },
              { label: traced(q, p), outcome: `Then it would reach $${q}$ across and $${p}$ up.` },
            ],
            (salt >>> 8) % 3,
          ),
        },
      ],
      answer: [`$${P * Q}$`, `$${ellipseEquation({ a: 0, b: 0, p, q })}$`, right],
    };
  },
  solution: ({ p, q }) => [
    { text: `Divide both sides by $${p * p * q * q}$.`, tex: ellipseEquation({ a: 0, b: 0, p, q }) },
    { text: `The denominators are $${p}^{2}$ and $${q}^{2}$.`, tex: `x = ${p}\\cos t` },
    { tex: `y = ${q}\\sin t` },
  ],
};

/** Which coordinate an ellipse's point has at a quarter turn, slid on the figure. */
const pparEllipseSlider: Generator<ConicPointParams> = {
  id: 'ppar-ellipse-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const [p, q] = sampleAxes(rng, hard ? 7 : 8);
      const params: ConicPointParams = {
        a: hard ? rng.int(-4, 4) : 0,
        b: hard ? rng.int(-4, 4) : 0,
        p,
        q,
        quarter: sampleQuarter(rng, difficulty),
      };
      const [x, y] = conicPoint(params);
      if (Math.abs(params.a) + p > 9 || Math.abs(params.b) + q > 9) continue;
      if (hard && params.a === 0 && params.b === 0) continue;
      if ((askedAxis(params.quarter) === 'x' ? x : y) === 0) continue;
      return params;
    }
  },
  choices: conicPointChoices,
  render: (params) => conicPointSlide(params, false),
  solution: (params) => conicPointSolution(params, false),
};

/* ---------- The parabola y^2 = 4ax ---------- */

export interface ParabolaParams {
  a: number;
  /** x^2 = 4ay rather than y^2 = 4ax. */
  turned: boolean;
}

export const parabolaEquation = ({ a, turned: sideways }: ParabolaParams): string =>
  sideways ? `x^{2} = ${4 * a}y` : `y^{2} = ${4 * a}x`;

/**
 * y^2 = 4ax as x = at^2, y = 2at (or x^2 = 4ay as x = 2at, y = at^2), as
 * tiles. The bank holds 4a, and a and 2a with their signs turned.
 */
const pparParabolaTiles: Generator<ParabolaParams> = {
  id: 'ppar-parabola-tiles',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty >= 2 ? 15 : 9) * rng.sign(),
    turned: rng.chance(0.5),
  }),
  render: (params): Slide => {
    const { a } = params;
    const answer = params.turned ? [2 * a, a] : [a, 2 * a];
    return {
      kind: 'tiles',
      prompt: [prose('A parabola has equation'), display(parabolaEquation(params)), prose('Complete a parametrisation of it.')],
      template: params.turned ? 'x = {0}t, \\quad y = {1}t^2' : 'x = {0}t^2, \\quad y = {1}t',
      bank: numberBank(answer, [4 * a, -a, -2 * a, a * a]),
      answer: answer.map(String),
    };
  },
  solution: ({ a, turned: sideways }) => [
    { text: `Match it to $${sideways ? 'x^{2} = 4ay' : 'y^{2} = 4ax'}$: here $4a = ${4 * a}$.`, tex: `a = ${a}` },
    {
      text: `So $${sideways ? 'x = 2at, \\ y = at^{2}' : 'x = at^{2}, \\ y = 2at'}$ gives`,
      tex: sideways ? `x = ${2 * a}t \\qquad y = ${a}t^{2}` : `x = ${a}t^{2} \\qquad y = ${2 * a}t`,
    },
    {
      text: 'Check by substituting:',
      tex: sideways ? `x^{2} = ${4 * a * a}t^{2} = ${4 * a}y` : `y^{2} = ${4 * a * a}t^{2} = ${4 * a}x`,
    },
  ],
};

export interface ParabolaKParams {
  m: number;
  n: number;
}

/**
 * x = mt^2, y = nt traces y^2 = kx: find k by substituting. y^2 = n^2t^2 and
 * kx = kmt^2, so k = n^2 / m; the draws make it whole.
 */
const pparParabolaK: Generator<ParabolaKParams> = {
  id: 'ppar-parabola-k',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const a = rng.int(1, 8) * (hard ? rng.sign() : 1);
    const s = rng.int(1, hard ? 3 : 2);
    return { m: a * s * s, n: 2 * a * s * rng.sign() };
  },
  render: ({ m, n }): Slide => ({
    kind: 'expression',
    prompt: [
      prose('The curve'),
      display(`x = ${coef(m)}t^{2} \\qquad y = ${coef(n)}t`),
      prose('has Cartesian equation $y^{2} = kx$. Find $k$.'),
    ],
    lead: 'k =',
    keypad: [],
    answer: `${(n * n) / m}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ m, n }) => [
    { text: 'Square $y$.', tex: `y^{2} = ${n * n}t^{2}` },
    { text: `Write $kx$ with $x = ${coef(m)}t^{2}$.`, tex: `kx = ${coef(m)}kt^{2}` },
    { text: 'The two must agree for every $t$.', tex: `${coef(m)}k = ${n * n}` },
    ...(m === 1 ? [] : [{ tex: `k = ${(n * n) / m}` }]),
  ],
};

/* ---------- Checking a proposed parametrisation ---------- */

export interface VerifyParams {
  /** The curve y^2 = 4ax. */
  a: number;
  /** The proposal x = mt^2, y = nt. */
  m: number;
  n: number;
}

/**
 * Whether x = mt^2, y = nt traces y^2 = 4ax, walked as substitution: y^2,
 * then 4ax, then the verdict. It does exactly when n^2 = 4am.
 */
const pparVerifyFlow: Generator<VerifyParams> = {
  id: 'ppar-verify-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const a = rng.int(1, hard ? 6 : 5) * (hard ? rng.sign() : 1);
    const valid: [number, number][] = hard ? [[a, 2 * a], [4 * a, 4 * a], [9 * a, 6 * a]] : [[a, 2 * a], [4 * a, 4 * a]];
    const invalid: [number, number][] = [[2 * a, a], [a, a], [2 * a, 2 * a], [a, 4 * a], [4 * a, 2 * a]];
    const [m, n] = rng.pick(rng.chance(0.5) ? valid : invalid);
    return { a, m, n: hard ? n * rng.sign() : n };
  },
  render: ({ a, m, n }): Slide => {
    const k = 4 * a;
    const salt = mix(a, m, n);
    const n2 = n * n;
    const rhs = k * m;
    const works = n2 === rhs;
    const first = `$${coef(n2)}t^{2}$`;
    const second = `$${coef(rhs)}t^{2}$`;
    const firstWrong = [
      { label: `$${coef(2 * n)}t^{2}$`, outcome: `That doubles $${coef(n)}t$ rather than squaring it.` },
      { label: `$${coef(n2)}t$`, outcome: 'That squares the number but leaves $t$ unsquared.' },
    ].filter((branch) => branch.label !== first);
    const secondWrong = [
      { label: `$${coef(k)}t^{2}$`, outcome: `That leaves out the $${m}$ in $x$.` },
      { label: `$${coef(k + m)}t^{2}$`, outcome: `That adds $${k}$ and $${m}$ rather than multiplying.` },
      { label: `$${coef(rhs)}t^{4}$`, outcome: `That squares $t^{2}$ again.` },
    ].filter((branch, i, all) => branch.label !== second && all.findIndex((other) => other.label === branch.label) === i);
    return {
      kind: 'flow',
      prompt: [
        prose('Does'),
        display(`x = ${coef(m)}t^{2} \\qquad y = ${coef(n)}t`),
        prose(`trace the parabola $y^{2} = ${k}x$? Substitute to find out.`),
      ],
      subject: `y^{2} = ${k}x`,
      steps: [
        {
          id: 'y2',
          ask: `What is $y^{2}$?`,
          branches: turned([{ label: first, to: 'rhs' }, ...firstWrong], salt % (firstWrong.length + 1)),
        },
        {
          id: 'rhs',
          ask: `What is $${k}x$?`,
          branches: turned([{ label: second, to: 'verdict' }, ...secondWrong.slice(0, 2)], (salt >>> 4) % 3),
        },
        {
          id: 'verdict',
          ask: `So does it trace $y^{2} = ${k}x$?`,
          branches: [
            { label: 'Yes', outcome: 'Then every value of $t$ would give a point on the parabola.' },
            { label: 'No', outcome: 'Then some values of $t$ would give points off the parabola.' },
          ],
        },
      ],
      answer: [first, second, works ? 'Yes' : 'No'],
    };
  },
  solution: ({ a, m, n }) => {
    const k = 4 * a;
    const works = n * n === k * m;
    return [
      { text: `Substitute $y = ${coef(n)}t$.`, tex: `y^{2} = ${coef(n * n)}t^{2}` },
      { text: `Substitute $x = ${coef(m)}t^{2}$.`, tex: `${k}x = ${coef(k * m)}t^{2}` },
      {
        text: works
          ? 'The two sides agree for every $t$, so it traces the parabola.'
          : `$${coef(n * n)}t^{2}$ and $${coef(k * m)}t^{2}$ differ for every $t \\neq 0$, so it does not.`,
      },
    ];
  },
};

export type WhichParams =
  | { kind: 'parabola'; a: number; drop: number }
  | { kind: 'circle'; r: number; drop: number }
  | { kind: 'ellipse'; p: number; q: number; drop: number }
  | { kind: 'moved'; a: number; b: number; r: number; drop: number };

const traced = (x: string, y: string): string => `x = ${x}, \\quad y = ${y}`;

/** The curve, the parametrisation that traces it, and four that do not. */
function whichOptions(params: WhichParams): { curve: string; right: string; wrong: string[]; working: string[] } {
  if (params.kind === 'parabola') {
    const { a } = params;
    return {
      curve: `y^{2} = ${4 * a}x`,
      right: traced(`${a}t^{2}`, `${2 * a}t`),
      wrong: [
        traced(`${2 * a}t^{2}`, `${a}t`),
        traced(`${a}t^{2}`, `${a}t`),
        traced(`${4 * a}t^{2}`, `${2 * a}t`),
        traced(`${a}t`, `${2 * a}t^{2}`),
      ],
      working: [`y^{2} = ${4 * a * a}t^{2}`, `${4 * a}x = ${4 * a * a}t^{2}`],
    };
  }
  if (params.kind === 'circle') {
    const { r } = params;
    return {
      curve: `x^{2} + y^{2} = ${r * r}`,
      right: traced(`${r}\\cos t`, `${r}\\sin t`),
      wrong: [
        traced(`${r * r}\\cos t`, `${r * r}\\sin t`),
        traced(`${r}\\cos t`, `${r}\\cos t`),
        traced(`${r}\\cos t`, `${2 * r}\\sin t`),
        traced(`${r}\\cos t`, `${r * r}\\sin t`),
      ],
      working: [`x^{2} + y^{2} = ${r * r}\\cos^{2} t + ${r * r}\\sin^{2} t`, `x^{2} + y^{2} = ${r * r}`],
    };
  }
  if (params.kind === 'ellipse') {
    const { p, q } = params;
    return {
      curve: ellipseEquation({ a: 0, b: 0, p, q }),
      right: traced(`${p}\\cos t`, `${q}\\sin t`),
      wrong: [
        traced(`${q}\\cos t`, `${p}\\sin t`),
        traced(`${p * p}\\cos t`, `${q * q}\\sin t`),
        traced(`${p}\\cos t`, `${q}\\cos t`),
        traced(`${p}\\sin t`, `${p}\\cos t`),
      ],
      working: [`\\frac{x^{2}}{${p * p}} + \\frac{y^{2}}{${q * q}} = \\cos^{2} t + \\sin^{2} t`, '\\cos^{2} t + \\sin^{2} t = 1'],
    };
  }
  const { a, b, r } = params;
  return {
    curve: circleEquation({ a, b, r }),
    right: traced(trigTerm(a, r, 'cos'), trigTerm(b, r, 'sin')),
    wrong: [
      traced(trigTerm(-a, r, 'cos'), trigTerm(-b, r, 'sin')),
      traced(trigTerm(a, r * r, 'cos'), trigTerm(b, r * r, 'sin')),
      traced(trigTerm(a, r, 'cos'), trigTerm(b, r, 'cos')),
      traced(trigTerm(b, r, 'cos'), trigTerm(a, r, 'sin')),
    ],
    working: [`${sq('x', a)} = ${r * r}\\cos^{2} t`, `${sq('y', b)} = ${r * r}\\sin^{2} t`],
  };
}

const whichSalt = (params: WhichParams): number =>
  params.kind === 'parabola'
    ? mix(1, params.a, params.drop)
    : params.kind === 'circle'
      ? mix(2, params.r, params.drop)
      : params.kind === 'ellipse'
        ? mix(3, params.p, params.q, params.drop)
        : mix(4, params.a, params.b, params.r, params.drop);

/**
 * Which of four parametrisations traces a curve. Exactly one does: every
 * distractor fails on substitution, and none is a secretly valid
 * parametrisation such as sin and cos swapped on a circle, which traces the
 * same circle from a different start.
 */
const pparWhich: Generator<WhichParams> = {
  id: 'ppar-which',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const drop = rng.int(0, 3);
    const roll = rng.int(0, hard ? 3 : 2);
    if (roll === 0) return { kind: 'parabola', a: rng.int(2, hard ? 9 : 6) * rng.sign(), drop };
    if (roll === 1) return { kind: 'circle', r: rng.int(2, hard ? 9 : 7), drop };
    if (roll === 2) {
      const [p, q] = sampleAxes(rng, hard ? 8 : 6);
      return { kind: 'ellipse', p, q, drop };
    }
    return { kind: 'moved', a: rng.int(1, 5) * rng.sign(), b: rng.int(1, 5) * rng.sign(), r: rng.int(2, 6), drop };
  },
  render: (params): Slide => {
    const { curve, right, wrong } = whichOptions(params);
    const kept = unique(wrong.filter((_, i) => i !== params.drop)).filter((label) => label !== right);
    return {
      kind: 'choice',
      prompt: [prose('Which parametrisation traces this curve?'), display(curve)],
      ...placed(right, kept, whichSalt(params) % (kept.length + 1)),
    };
  },
  solution: (params) => {
    const { right, working } = whichOptions(params);
    return [
      { text: 'Substitute each pair into the equation. The one that works for every $t$ is', tex: right.replace(', \\quad ', ' \\qquad ') },
      { text: 'Substituting it:', tex: working[0] },
      { tex: working[1] },
      { text: 'Each of the others leaves the two sides different for some $t$.' },
    ];
  },
};

export const paramBuildGenerators = [
  pparGraph,
  pparGraphTiles,
  pparGraphT,
  pparLineTiles,
  pparLineEnds,
  pparLinePoint,
  pparLineWhereFlow,
  pparCircleTiles,
  pparCircleFlow,
  pparCircleSlider,
  pparEllipseTiles,
  pparEllipseFlow,
  pparEllipseSlider,
  pparParabolaTiles,
  pparParabolaK,
  pparVerifyFlow,
  pparWhich,
] as Generator<never>[];
