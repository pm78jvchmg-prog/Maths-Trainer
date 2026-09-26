/**
 * Classical Mechanics, level 7: Statics (`clm-l7`).
 *
 * Centres of mass of point masses on a line and in a plane (OpenStax
 * University Physics 9.6); stacking blocks over an edge, the harmonic
 * overhang (Paterson and Zwick, "Overhang"); a pushed box that slides or
 * tips, a load hung from the middle of a rope, and the forearm and foot as
 * levers (12.2).
 *
 * Tidy cases: ropes sag along a 3-4-5 or 7-24-25 triangle, so every sine is
 * a short decimal; weights are stated in newtons, and body lengths are in
 * centimetres, so moments come out in newton centimetres.
 */
import type { Generator, SolutionStep } from '../types';
import { dots, exact, fmt, forks, metres, numChoices, picture, salted, say, track, typed, until, valueBank } from './classicalKit';

const n3 = (v: number): number => Number(v.toFixed(6));
const cm = (v: number): string => `$${fmt(v)}\\text{ cm}$`;
const N = (v: number): string => `$${fmt(v)}\\text{ N}$`;

const tidyBank = (answer: number[], wrong: number[], spare = 3): string[] =>
  valueBank(
    answer,
    wrong.filter((v) => v > 0 && exact(v, 3)),
    spare,
  );

/* ================================================================
 * Centre of mass
 * ================================================================ */

interface RodParams {
  /** Rod length in metres. */
  L: number;
  ms: number[];
  xs: number[];
}

const comOf = ({ ms, xs }: { ms: number[]; xs: number[] }): number => n3(ms.reduce((s, m, i) => s + m * xs[i], 0) / ms.reduce((s, m) => s + m, 0));

const sampleRod = (rng: { int: (a: number, b: number) => number }, three: boolean, places: number): RodParams =>
  until(
    () => {
      const L = rng.int(2, 10);
      const ms = [rng.int(1, 12), rng.int(1, 12), rng.int(1, 12)].slice(0, three ? 3 : 2);
      const xs = three ? [0, rng.int(1, L - 1), L] : [0, L];
      return { L, ms, xs };
    },
    (p) => exact(comOf(p), places) && comOf(p) > 0 && comOf(p) < p.L && new Set(p.ms).size === p.ms.length,
  );

const rodFigure = (p: RodParams) =>
  track(
    0,
    p.L,
    p.xs.map((x, i) => ({ at: x, name: `${p.ms[i]} kg` })),
    `A light rod ${p.L} metres long, marked in metres from end A, with masses on it`,
  );

const rodWords = (p: RodParams): string =>
  p.ms.length === 2
    ? `A light rod ${metres(p.L)} long has $${p.ms[0]}\\text{ kg}$ at end A and $${p.ms[1]}\\text{ kg}$ at the other end.`
    : `A light rod ${metres(p.L)} long carries $${p.ms[0]}\\text{ kg}$ at end A, $${p.ms[1]}\\text{ kg}$ at ${metres(p.xs[1])} from A, and $${p.ms[2]}\\text{ kg}$ at the far end.`;

const rodLines = (p: RodParams): SolutionStep[] => {
  const top = p.ms.map((m, i) => `${m} \\times ${fmt(p.xs[i])}`).join(' + ');
  const sum = p.ms.reduce((s, m, i) => s + m * p.xs[i], 0);
  const M = p.ms.reduce((s, m) => s + m, 0);
  return [{ tex: `\\bar{x} = \\frac{${top}}{${p.ms.join(' + ')}}` }, { tex: `\\bar{x} = \\frac{${fmt(sum)}}{${M}} = ${fmt(comOf(p))}` }];
};

/** Expression: the centre of mass of masses on a light rod, from end A. */
const comRod: Generator<RodParams> = {
  id: 'clm-com-rod',
  sample: (rng, difficulty) => sampleRod(rng, difficulty > 1, 2),
  render: (p) => typed([picture(rodFigure(p).svg), say(`${rodWords(p)} How far from A is the centre of mass, in metres?`)], '\\bar{x} =', comOf(p)),
  solution: rodLines,
  choices: (p) => {
    const sum = p.ms.reduce((s, m, i) => s + m * p.xs[i], 0);
    const mean = p.xs.reduce((s, x) => s + x, 0) / p.xs.length;
    return numChoices(comOf(p), [n3(p.L - comOf(p)), n3(mean), n3(sum)], salted(p.L, ...p.ms, ...p.xs));
  },
};

/** Slider: the balance point of a loaded rod, which is its centre of mass. */
const comSlider: Generator<RodParams> = {
  id: 'clm-com-slider',
  sample: (rng, difficulty) => sampleRod(rng, difficulty > 1, 1),
  render: (p) => {
    const figure = rodFigure(p);
    return {
      kind: 'slider',
      prompt: [say(`${rodWords(p)} Slide to the point where it balances on one finger, in metres from A.`)],
      min: 0,
      max: p.L,
      step: 0.1,
      answer: comOf(p),
      readout: 'x = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [{ text: 'It balances under its centre of mass, where the moments either side cancel.' }, ...rodLines(p)],
};

interface ComTableParams {
  ms: number[];
  xs: number[];
}

/** Table: m, x and mx for three masses, then the totals and the centre of mass in a last row. */
const comTable: Generator<ComTableParams> = {
  id: 'clm-com-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ ms: [0, 1, 2].map(() => rng.int(1, 9)), xs: [0, 1, 2].map(() => (difficulty > 1 ? rng.int(1, 30) / 2 : rng.int(1, 12))) }),
      (p) => exact(comOf(p), 2) && new Set(p.xs).size === 3,
    ),
  render: (p) => {
    const products = p.ms.map((m, i) => n3(m * p.xs[i]));
    const total = n3(products.reduce((s, v) => s + v, 0));
    const M = p.ms.reduce((s, m) => s + m, 0);
    const answer = [...products, comOf(p), total];
    return {
      kind: 'table',
      prompt: [say(`Three masses sit on a line at positions $x$ in metres. Fill in each $mx$, then in the last row the centre of mass $\\bar{x}$ and the total of $mx$. The total mass is $${M}\\text{ kg}$.`)],
      columns: ['m', 'x', 'mx'],
      rows: [...p.ms.map((m, i) => [fmt(m), fmt(p.xs[i]), null]), [`M = ${M}`, null, null]],
      bank: tidyBank(answer, [n3(total / 3), n3(p.xs.reduce((s, x) => s + x, 0) / 3), n3(M * comOf(p) + 1)]),
      answer: answer.map(fmt),
    };
  },
  solution: (p) => {
    const products = p.ms.map((m, i) => m * p.xs[i]);
    const total = products.reduce((s, v) => s + v, 0);
    const M = p.ms.reduce((s, m) => s + m, 0);
    return [
      ...p.ms.map((m, i): SolutionStep => ({ tex: `${m} \\times ${fmt(p.xs[i])} = ${fmt(products[i])}` })),
      { tex: `\\Sigma mx = ${fmt(total)}` },
      { tex: `\\bar{x} = \\frac{${fmt(total)}}{${M}} = ${fmt(comOf(p))}` },
    ];
  },
};

interface PlaneParams {
  ms: number[];
  pts: [number, number][];
}

/** Tree: three masses at points in a plane: the total mass, then each coordinate of the centre of mass. */
const com2dTree: Generator<PlaneParams> = {
  id: 'clm-com-2d-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({
        ms: [0, 1, 2].map(() => rng.int(1, difficulty > 1 ? 9 : 5)),
        pts: [0, 1, 2].map((): [number, number] => [rng.int(0, 8), rng.int(0, 8)]),
      }),
      (p) => {
        const xb = comOf({ ms: p.ms, xs: p.pts.map((q) => q[0]) });
        const yb = comOf({ ms: p.ms, xs: p.pts.map((q) => q[1]) });
        const M = p.ms.reduce((s, m) => s + m, 0);
        return exact(xb, 2) && exact(yb, 2) && xb > 0 && yb > 0 && new Set([M, xb, yb]).size === 3 && new Set(p.pts.map((q) => q.join())).size === 3;
      },
    ),
  render: (p) => {
    const M = p.ms.reduce((s, m) => s + m, 0);
    const xb = comOf({ ms: p.ms, xs: p.pts.map((q) => q[0]) });
    const yb = comOf({ ms: p.ms, xs: p.pts.map((q) => q[1]) });
    const where = p.ms.map((m, i) => `$${m}\\text{ kg}$ at $(${p.pts[i][0]}, ${p.pts[i][1]})$`).join(', ');
    return {
      kind: 'tree',
      prompt: [say(`Masses of ${where}, in metres.`), say('Find the total mass, then each coordinate of the centre of mass.')],
      expression: '\\bar{x} = \\frac{\\Sigma mx}{M} \\qquad \\bar{y} = \\frac{\\Sigma my}{M}',
      nodes: [
        { id: 'M', from: [] },
        { id: '\\bar{x}', from: ['M'] },
        { id: '\\bar{y}', from: ['M'] },
      ],
      bank: tidyBank([M, xb, yb], [n3(p.pts.reduce((s, q) => s + q[0], 0) / 3), n3(p.pts.reduce((s, q) => s + q[1], 0) / 3), M + 1]),
      answer: [M, xb, yb].map(fmt),
    };
  },
  solution: (p) => {
    const M = p.ms.reduce((s, m) => s + m, 0);
    const sx = p.ms.reduce((s, m, i) => s + m * p.pts[i][0], 0);
    const sy = p.ms.reduce((s, m, i) => s + m * p.pts[i][1], 0);
    return [
      { tex: `M = ${p.ms.join(' + ')} = ${M}` },
      { tex: `\\bar{x} = \\frac{${p.ms.map((m, i) => `${m} \\times ${p.pts[i][0]}`).join(' + ')}}{${M}} = \\frac{${sx}}{${M}} = ${fmt(sx / M)}` },
      { tex: `\\bar{y} = \\frac{${p.ms.map((m, i) => `${m} \\times ${p.pts[i][1]}`).join(' + ')}}{${M}} = \\frac{${sy}}{${M}} = ${fmt(sy / M)}` },
    ];
  },
};

/* ================================================================
 * Stacking blocks
 * ================================================================ */

/** The harmonic number 1 + 1/2 + ... + 1/n. */
const harmonic = (n: number): number => Array.from({ length: n }, (_, i) => 1 / (i + 1)).reduce((s, v) => s + v, 0);

interface StackRow {
  n: number;
  blank: 'step' | 'total';
}

interface StackTableParams {
  L: number;
  rows: StackRow[];
}

/** Table: identical blocks stacked for the greatest overhang: each block's own step L/(2n) and the running total. */
const stackTable: Generator<StackTableParams> = {
  id: 'clm-stack-table',
  sample: (rng, difficulty) => {
    const start = difficulty > 1 ? rng.int(2, 3) : 1;
    return {
      L: 3 * rng.int(4, 20),
      rows: [0, 1, 2, 3].map((k): StackRow => ({ n: start + k, blank: difficulty > 1 ? (rng.chance(0.5) ? 'step' : 'total') : k === 0 ? 'total' : rng.chance(0.5) ? 'step' : 'total' })),
    };
  },
  render: ({ L, rows }) => {
    const step = (n: number) => n3(L / (2 * n));
    const total = (n: number) => n3((L / 2) * harmonic(n));
    // A total given in the row above makes a step blank a subtraction, so each row blanks one cell only.
    const answer = rows.map((r) => (r.blank === 'step' ? step(r.n) : total(r.n)));
    return {
      kind: 'table',
      prompt: [say(`Blocks ${cm(L)} long are stacked so each overhangs the one below by as much as it can. With $n$ blocks, the bottom one overhangs the table by $\\frac{L}{2n}$. Fill in each step and the total overhang, in centimetres.`)],
      columns: ['n', '\\frac{L}{2n}', '\\text{total}'],
      rows: rows.map((r) => [fmt(r.n), r.blank === 'step' ? null : fmt(step(r.n)), r.blank === 'total' ? null : fmt(total(r.n))]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3(L / r.n), n3(total(r.n) + step(r.n))])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ L, rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 'step'
        ? { tex: `\\frac{${L}}{2 \\times ${r.n}} = ${fmt(L / (2 * r.n))}` }
        : { tex: `${r.n === 1 ? '' : `${fmt((L / 2) * harmonic(r.n - 1))} + `}\\frac{${L}}{2 \\times ${r.n}} = ${fmt((L / 2) * harmonic(r.n))}` },
    ),
};

interface OverhangParams {
  L: number;
  n: number;
}

const overhang = ({ L, n }: OverhangParams): number => n3((L / 2) * harmonic(n));

/** Slider: the farthest the top block of n identical blocks can reach beyond the table's edge. */
const stackSlider: Generator<OverhangParams> = {
  id: 'clm-stack-slider',
  sample: (rng, difficulty) => until(() => ({ L: rng.int(8, 60), n: difficulty > 1 ? rng.int(2, 4) : 2 }), (p) => Number.isInteger(overhang(p) * 2) && overhang(p) <= 80),
  render: (p) => {
    const figure = track(0, 80, [{ at: 0, name: 'edge' }], 'A scale in centimetres beyond the edge of the table');
    return {
      kind: 'slider',
      prompt: [say(`${p.n} identical blocks, each ${cm(p.L)} long, are stacked at a table’s edge to reach as far out as they can. Slide to how far beyond the edge the top block’s far end reaches, in centimetres.`)],
      min: 0,
      max: 80,
      step: 0.5,
      answer: overhang(p),
      readout: 'd = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [
    { tex: `d = \\frac{L}{2}\\left(${Array.from({ length: p.n }, (_, i) => (i === 0 ? '1' : `\\tfrac{1}{${i + 1}}`)).join(' + ')}\\right)` },
    { tex: `d = ${fmt(p.L / 2)} \\times ${fmt(n3(harmonic(p.n)))} = ${fmt(overhang(p))}` },
  ],
};

interface TwoBlockParams {
  /** Top block length and mass, then the lower block's. */
  L1: number;
  m1: number;
  L2: number;
  m2: number;
}

const lowerOver = ({ m1, L2, m2 }: TwoBlockParams): number => n3((m2 * L2) / (2 * (m1 + m2)));

/** Tree: two unlike blocks stacked for the greatest reach: the top over the lower, the lower over the table, and the reach. */
const stackTree: Generator<TwoBlockParams> = {
  id: 'clm-stack-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ L1: 2 * rng.int(5, 30), m1: rng.int(1, difficulty > 1 ? 6 : 3), L2: 2 * rng.int(5, 30), m2: rng.int(1, 6) }),
      (p) => exact(lowerOver(p), 2) && p.m1 !== p.m2,
    ),
  render: (p) => {
    const a = p.L1 / 2;
    const d = lowerOver(p);
    return {
      kind: 'tree',
      prompt: [
        say(`A ${kg2(p.m1)} block ${cm(p.L1)} long sits on a ${kg2(p.m2)} block ${cm(p.L2)} long at a table’s edge, stacked to reach as far out as possible.`),
        say('Find how far the top block overhangs the lower one, how far the lower one overhangs the table, and the total reach, in centimetres.'),
      ],
      expression: 'd = \\frac{m_{2}L_{2}}{2(m_{1} + m_{2})}',
      nodes: [
        { id: 'a', from: [] },
        { id: 'd', from: [] },
        { id: 'a + d', from: ['a', 'd'] },
      ],
      bank: tidyBank([a, d, n3(a + d)], [n3(p.L2 / 2), n3((p.m1 * p.L2) / (2 * (p.m1 + p.m2))), n3(p.L2 / 4)]),
      answer: [a, d, n3(a + d)].map(fmt),
    };
  },
  solution: (p) => [
    { text: 'The top block’s centre sits over the lower block’s edge:' },
    { tex: `a = \\frac{${p.L1}}{2} = ${fmt(p.L1 / 2)}` },
    { text: 'The pair’s centre of mass sits over the table’s edge. The lower block’s centre is $\\frac{L_{2}}{2} - d$ inside it and the top one’s is $d$ beyond:' },
    { tex: `${p.m2}\\left(${fmt(p.L2 / 2)} - d\\right) = ${p.m1}d` },
    { tex: `d = \\frac{${p.m2} \\times ${p.L2}}{2 \\times ${p.m1 + p.m2}} = ${fmt(lowerOver(p))}` },
    { tex: `a + d = ${fmt(n3(p.L1 / 2 + lowerOver(p)))}` },
  ],
};

const kg2 = (v: number): string => `$${fmt(v)}\\text{ kg}$`;

interface StackFlowParams {
  L: number;
  /** The top block's overhang over the lower one, and the lower one's over the table, in cm. */
  s: number;
  d: number;
}

const STANDS = 'It stands';
const TOP_FALLS = 'The top block falls off';
const TOPPLES = 'The whole stack topples';

/** Where a centre sits against an edge, as words: inside or beyond by so much. */
const side = (v: number): string => (v > 0 ? `$${fmt(v)}$ cm inside` : `$${fmt(-v)}$ cm beyond`);

/** Three signed positions as words, the right one and two slips, sorted from farthest inside to farthest beyond. */
const sided = (right: number, wrong: number[]): string[] => {
  const out = [right];
  for (const v of [...wrong, right + 1, right - 1, right + 2, right - 2]) if (out.length < 3 && v !== 0 && exact(v, 2) && !out.some((o) => Math.abs(o - v) < 1e-9)) out.push(v);
  return out.sort((x, y) => y - x).map(side);
};

/** Flow: two identical blocks stacked at an edge: is the top block's centre over the lower one, is the pair's over the table, so does it stand? */
const stackFlow: Generator<StackFlowParams> = {
  id: 'clm-stack-flow',
  sample: (rng) => {
    const want = rng.pick([STANDS, STANDS, TOP_FALLS, TOPPLES]);
    return until(
      () => ({ L: 2 * rng.int(6, 20), s: rng.int(1, 30), d: rng.int(1, 30) }),
      (p) => {
        const c1 = p.L / 2 - p.s;
        const c2 = p.L / 2 - p.d - p.s / 2;
        const verdict = c1 < 0 ? TOP_FALLS : c2 < 0 ? TOPPLES : STANDS;
        return c1 !== 0 && c2 !== 0 && verdict === want && p.s < p.L && p.d < p.L;
      },
    );
  },
  render: (p) => {
    const c1 = p.L / 2 - p.s;
    const c2 = n3(p.L / 2 - p.d - p.s / 2);
    const verdict = c1 < 0 ? TOP_FALLS : c2 < 0 ? TOPPLES : STANDS;
    const why = 'Each centre of mass must sit over what holds it up: the top block’s over the lower block, the pair’s over the table.';
    return {
      kind: 'flow',
      prompt: [say(`Two identical blocks, each ${cm(p.L)} long, are stacked at a table’s edge. The lower one overhangs the table by ${cm(p.d)}, and the top one overhangs the lower one by ${cm(p.s)}.`)],
      subject: '\\bar{x}_{\\text{pair}} = \\frac{x_{1} + x_{2}}{2}',
      steps: [
        { id: 'top', ask: 'The top block’s centre, against the lower block’s edge:', branches: sided(c1, [p.L - p.s, -c1, p.L / 2 - p.s / 2]).map((label) => ({ label, to: 'pair' })) },
        { id: 'pair', ask: 'The pair’s centre of mass, against the table’s edge:', branches: sided(c2, [n3(p.L / 2 - p.d - p.s), n3(p.L / 2 - p.d), -c2]).map((label) => ({ label, to: 'verdict' })) },
        { id: 'verdict', ask: 'So:', branches: [STANDS, TOP_FALLS, TOPPLES].map((label) => ({ label, outcome: why })) },
      ],
      answer: [side(c1), side(c2), verdict],
    };
  },
  solution: (p) => [
    { text: 'Measure every centre from the table’s edge, beyond it positive. The lower block’s centre and the top block’s centre:' },
    { tex: `x_{2} = ${p.d} - ${fmt(p.L / 2)} = ${fmt(p.d - p.L / 2)}` },
    { tex: `x_{1} = ${p.d} + ${p.s} - ${fmt(p.L / 2)} = ${fmt(p.d + p.s - p.L / 2)}` },
    { text: `Against the lower block’s edge, at $${p.d}$, the top centre is ${side(p.L / 2 - p.s)}.` },
    { tex: `\\bar{x} = \\frac{${fmt(p.d - p.L / 2)} + ${fmt(p.d + p.s - p.L / 2)}}{2} = ${fmt(n3(p.d + p.s / 2 - p.L / 2))}` },
  ],
};

/* ================================================================
 * Sliding or toppling
 * ================================================================ */

interface PushParams {
  /** Weight in N, base width and push height in cm, friction coefficient. */
  W: number;
  b: number;
  h: number;
  mu: number;
}

const tipPush = ({ W, b, h }: PushParams): number => n3((W * b) / (2 * h));
const slidePush = ({ W, mu }: PushParams): number => n3(mu * W);
const MUS = [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8];

const samplePush = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }): PushParams =>
  until(
    () => ({ W: 10 * rng.int(5, 60), b: 10 * rng.int(2, 8), h: 10 * rng.int(3, 15), mu: rng.pick(MUS) }),
    (p) => exact(tipPush(p), 2) && exact(slidePush(p), 2) && Math.abs(tipPush(p) - slidePush(p)) > 0.1 * p.W && p.h > p.b / 2,
  );

/** Expression: the push at a height h that just tips a box over its front edge, P h = W b / 2. */
const tipPushGen: Generator<PushParams> = {
  id: 'clm-tip-push',
  sample: (rng) => samplePush(rng),
  render: (p) => typed([say(`A crate weighing ${N(p.W)} has a base ${cm(p.b)} wide. It is pushed sideways at ${cm(p.h)} above the floor, and cannot slide. What push just starts to tip it over its front edge, in newtons?`)], 'P =', tipPush(p)),
  solution: (p) => [
    { text: 'About the front edge, the push turns it over and the weight, acting half the base away, holds it down:' },
    { tex: `P \\times ${p.h} = ${p.W} \\times ${fmt(p.b / 2)}` },
    { tex: `P = \\frac{${fmt((p.W * p.b) / 2)}}{${p.h}} = ${fmt(tipPush(p))}` },
  ],
  choices: (p) => numChoices(tipPush(p), [n3((p.W * p.b) / p.h), n3((p.W * p.h) / (2 * p.b)), n3(p.W / 2)], salted(p.W, p.b, p.h)),
};

/** Tree: the weight's moment about the front edge, the push that tips, and the push that slides. */
const tipTree: Generator<PushParams> = {
  id: 'clm-tip-tree',
  sample: (rng) => samplePush(rng),
  render: (p) => {
    const M = n3((p.W * p.b) / 2);
    return {
      kind: 'tree',
      prompt: [
        say(`A crate weighing ${N(p.W)} has a base ${cm(p.b)} wide and a friction coefficient of $${fmt(p.mu)}$ with the floor. It is pushed sideways at ${cm(p.h)} above the floor.`),
        say('Find the weight’s moment about the front edge in $\\text{N cm}$, the push that would tip it, and the push that would slide it, in newtons.'),
      ],
      expression: 'P_{\\text{tip}} = \\frac{Wb/2}{h} \\qquad P_{\\text{slide}} = \\mu W',
      nodes: [
        { id: 'M', from: [] },
        { id: 'P_{\\text{tip}}', from: ['M'] },
        { id: 'P_{\\text{slide}}', from: [] },
      ],
      bank: tidyBank([M, tipPush(p), slidePush(p)], [n3(p.W * p.b), n3(M / p.b), n3(p.mu * M)]),
      answer: [M, tipPush(p), slidePush(p)].map(fmt),
    };
  },
  solution: (p) => [
    { tex: `M = ${p.W} \\times ${fmt(p.b / 2)} = ${fmt((p.W * p.b) / 2)}` },
    { tex: `P_{\\text{tip}} = \\frac{${fmt((p.W * p.b) / 2)}}{${p.h}} = ${fmt(tipPush(p))}` },
    { tex: `P_{\\text{slide}} = ${fmt(p.mu)} \\times ${p.W} = ${fmt(slidePush(p))}` },
  ],
};

const SLIDES_FIRST = 'It slides first';
const TIPS_FIRST = 'It tips first';

/** Flow: a pushed crate: the push to slide, the push to tip, and which happens first as the push grows. */
const slideTipFlow: Generator<PushParams> = {
  id: 'clm-slide-tip-flow',
  sample: (rng) => {
    const want = rng.chance(0.5);
    return until(() => samplePush(rng), (p) => tipPush(p) < slidePush(p) === want);
  },
  render: (p) => {
    const S = slidePush(p);
    const T = tipPush(p);
    return {
      kind: 'flow',
      prompt: [say(`A crate weighing ${N(p.W)}, with a base ${cm(p.b)} wide, is pushed sideways at ${cm(p.h)} above the floor with a steadily growing push. The friction coefficient is $${fmt(p.mu)}$.`)],
      subject: 'P_{\\text{slide}} = \\mu W \\qquad P_{\\text{tip}} = \\frac{Wb}{2h}',
      steps: [
        { id: 'slide', ask: 'The push that starts it sliding, in newtons:', branches: forks(S, [n3(p.W / p.mu), n3(S / 2), T], 10).map((label) => ({ label, to: 'tip' })) },
        { id: 'tip', ask: 'The push that starts it tipping, in newtons:', branches: forks(T, [n3((p.W * p.b) / p.h), n3((p.W * p.h) / (2 * p.b)), S], 10).map((label) => ({ label, to: 'first' })) },
        { id: 'first', ask: 'As the push grows:', branches: [SLIDES_FIRST, TIPS_FIRST].map((label) => ({ label, outcome: 'Whichever needs the smaller push happens first.' })) },
      ],
      answer: [`$${fmt(S)}$`, `$${fmt(T)}$`, T < S ? TIPS_FIRST : SLIDES_FIRST],
    };
  },
  solution: (p) => [
    { tex: `P_{\\text{slide}} = ${fmt(p.mu)} \\times ${p.W} = ${fmt(slidePush(p))}` },
    { tex: `P_{\\text{tip}} = \\frac{${p.W} \\times ${p.b}}{2 \\times ${p.h}} = ${fmt(tipPush(p))}` },
  ],
};

interface TipHeightParams {
  /** Base width in cm and friction coefficient. */
  b: number;
  mu: number;
  what: string;
}

const tipHeight = ({ b, mu }: TipHeightParams): number => n3(b / (2 * mu));

/** Slider: the lowest push height at which a box tips before it slides, h = b / (2 mu). */
const tipSlider: Generator<TipHeightParams> = {
  id: 'clm-tip-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({ b: 10 * rng.int(2, 10), mu: rng.pick(difficulty > 1 ? MUS : [0.25, 0.4, 0.5]), what: rng.pick(['crate', 'filing cabinet', 'wardrobe', 'fridge', 'bookcase']) }),
      (p) => Number.isInteger(tipHeight(p)) && tipHeight(p) <= 200 && tipHeight(p) >= 20,
    ),
  render: (p) => {
    const figure = track(0, 200, [{ at: 0, name: 'floor' }], 'A scale of heights above the floor in centimetres');
    return {
      kind: 'slider',
      prompt: [say(`A tall ${p.what} with a base ${cm(p.b)} wide stands on a floor with friction coefficient $${fmt(p.mu)}$. Slide to the lowest height of a sideways push that tips it rather than sliding it, in centimetres.`)],
      min: 0,
      max: 200,
      step: 1,
      answer: tipHeight(p),
      readout: 'h = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [
    { text: 'It tips first once the push to tip is no more than the push to slide, and the weight cancels:' },
    { tex: `\\frac{Wb}{2h} = \\mu W` },
    { tex: `h = \\frac{b}{2\\mu} = \\frac{${p.b}}{2 \\times ${fmt(p.mu)}} = ${fmt(tipHeight(p))}` },
  ],
};

/* ================================================================
 * Rope statics
 * ================================================================ */

/** Sag, half-span, half rope length: triangles whose sine is a short decimal. */
const ROPES = [
  [3, 4, 5],
  [4, 3, 5],
  [7, 24, 25],
  [24, 7, 25],
];

interface RopeParams {
  tri: number[];
  /** Scale in centimetres per unit of the triangle. */
  k: number;
  W: number;
}

const sag = ({ tri, k }: RopeParams): number => tri[0] * k;
const halfSpan = ({ tri, k }: RopeParams): number => tri[1] * k;
const sine = ({ tri }: RopeParams): number => n3(tri[0] / tri[2]);
const tension = (p: RopeParams): number => n3((p.W * p.tri[2]) / (2 * p.tri[0]));

const sampleRope = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }, hard: boolean): RopeParams =>
  until(() => ({ tri: rng.pick(hard ? ROPES : ROPES.slice(0, 2)), k: rng.int(2, 20), W: 10 * rng.int(2, 60) }), (p) => exact(tension(p), 2) && halfSpan(p) <= 300);

const ropeWords = (p: RopeParams): string => `A load weighing ${N(p.W)} hangs from the middle of a rope stretched between two hooks ${cm(2 * halfSpan(p))} apart, pulling the middle down ${cm(sag(p))}.`;

/** Expression: the tension in a rope with a load at its middle, 2 T sin(theta) = W. */
const ropeTension: Generator<RopeParams> = {
  id: 'clm-rope-tension',
  sample: (rng, difficulty) => sampleRope(rng, difficulty > 1),
  render: (p) => typed([say(`${ropeWords(p)} What is the tension in the rope, in newtons?`)], 'T =', tension(p)),
  solution: (p) => [
    { tex: `l = \\sqrt{${halfSpan(p)}^{2} + ${sag(p)}^{2}} = ${p.tri[2] * p.k}` },
    { tex: `\\sin\\theta = \\frac{${sag(p)}}{${p.tri[2] * p.k}} = ${fmt(sine(p))}` },
    { text: 'The two halves each pull up with $T\\sin\\theta$, holding the load:' },
    { tex: `2T \\times ${fmt(sine(p))} = ${p.W}` },
    { tex: `T = ${fmt(tension(p))}` },
  ],
  choices: (p) => numChoices(tension(p), [p.W / 2, n3((p.W * p.tri[2]) / p.tri[0]), n3((p.W * p.tri[1]) / (2 * p.tri[0]))], salted(p.W, p.k, ...p.tri)),
};

/** Tree: the length of each half of the rope, the sine of its angle below the horizontal, and the tension. */
const ropeTree: Generator<RopeParams> = {
  id: 'clm-rope-tree',
  sample: (rng, difficulty) => sampleRope(rng, difficulty > 1),
  render: (p) => {
    const l = p.tri[2] * p.k;
    return {
      kind: 'tree',
      prompt: [say(ropeWords(p)), say('Find the length of each half of the rope in centimetres, the sine of its angle below the horizontal, and the tension in newtons.')],
      expression: '2T\\sin\\theta = W',
      nodes: [
        { id: 'l', from: [] },
        { id: '\\sin\\theta', from: ['l'] },
        { id: 'T', from: ['\\sin\\theta'] },
      ],
      bank: tidyBank([l, sine(p), tension(p)], [n3(p.tri[1] / p.tri[2]), halfSpan(p) + sag(p), n3(p.W / (2 * p.tri[1] / p.tri[2]))]),
      answer: [l, sine(p), tension(p)].map(fmt),
    };
  },
  solution: (p) => [
    { tex: `l = \\sqrt{${halfSpan(p)}^{2} + ${sag(p)}^{2}} = ${p.tri[2] * p.k}` },
    { tex: `\\sin\\theta = \\frac{${sag(p)}}{${p.tri[2] * p.k}} = ${fmt(sine(p))}` },
    { tex: `T = \\frac{${p.W}}{2 \\times ${fmt(sine(p))}} = ${fmt(tension(p))}` },
  ],
};

interface RopeSliderParams {
  /** Half the distance between the hooks, whole centimetres. */
  a: number;
  /** Load and tension, whole newtons. */
  W: number;
  T: number;
}

/** The sag, in centimetres, at which a load W pulls each half of the rope with tension T. */
const sliderSag = ({ a, W, T }: RopeSliderParams, sin = W / (2 * T)): number => (a * sin) / Math.sqrt(1 - sin * sin);


/** Slider: how far a load must pull a rope's middle down for the tension to be a stated value, to the nearest centimetre. */
const ropeSlider: Generator<RopeSliderParams> = {
  id: 'clm-rope-slider',
  sample: (rng, difficulty) =>
    until(
      () =>
        difficulty > 1
          ? { a: 5 * rng.int(4, 30), W: 10 * rng.int(2, 60), T: 10 * rng.int(2, 100) }
          : { a: 5 * rng.int(4, 16), W: 10 * rng.int(2, 30), T: 10 * rng.int(2, 60) },
      (p) => {
        const sin = p.W / (2 * p.T);
        const s = sliderSag(p);
        // Well clear of a half centimetre, and the same if the sine is carried to 3 decimal places.
        return (
          sin >= 0.15 &&
          sin <= 0.9 &&
          s >= 3 &&
          s <= 100 &&
          Math.abs(s - Math.round(s)) <= 0.35 &&
          Math.round(sliderSag(p, Number(sin.toFixed(3)))) === Math.round(s)
        );
      },
    ),
  render: (p) => {
    const figure = track(0, 100, [{ at: 0, name: 'level' }], 'A scale in centimetres below the level of the hooks');
    return {
      kind: 'slider',
      calculator: true,
      prompt: [
        say(
          `A rope is stretched between two hooks ${cm(2 * p.a)} apart. A load weighing ${N(p.W)} hangs from its middle, and the rope is let out until the tension is ${N(p.T)}. Slide to how far the middle hangs below the hooks, to the nearest centimetre.`,
        ),
      ],
      min: 0,
      max: 100,
      step: 1,
      answer: Math.round(sliderSag(p)),
      readout: 's = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => {
    const sin = p.W / (2 * p.T);
    const cos = Math.sqrt(1 - sin * sin);
    return [
      { tex: `\\sin\\theta = \\frac{W}{2T} = \\frac{${p.W}}{2 \\times ${p.T}} = ${dots(sin)}` },
      { tex: `\\cos\\theta = \\sqrt{1 - \\sin^{2}\\theta} = ${dots(cos)}` },
      { text: 'The sag is the half-span times $\\tan\\theta$:' },
      { tex: `s = ${p.a} \\times \\frac{${dots(sin)}}{${dots(cos)}} = ${dots(sliderSag(p), 2)}` },
      { text: `To the nearest centimetre, $s = ${Math.round(sliderSag(p))}$.` },
    ];
  },
};

interface RopeFlowParams extends RopeParams {
  /** The rope's breaking strength, N. */
  strength: number;
}

const HOLDS = 'It holds';
const SNAPS = 'It snaps';

/** Flow: will the rope hold? The sine of its angle, the tension, and a check against its strength. */
const ropeFlow: Generator<RopeFlowParams> = {
  id: 'clm-rope-flow',
  sample: (rng, difficulty) => {
    const p = sampleRope(rng, difficulty > 1);
    const T = tension(p);
    const strength = 50 * Math.round((T * rng.pick([0.6, 0.75, 1.3, 1.6, 2])) / 50) || 50;
    return { ...p, strength: Math.abs(strength - T) < 1e-9 ? strength + 50 : strength };
  },
  render: (p) => {
    const T = tension(p);
    return {
      kind: 'flow',
      prompt: [say(`${ropeWords(p)} The rope breaks at ${N(p.strength)}.`)],
      subject: '2T\\sin\\theta = W',
      steps: [
        { id: 'sin', ask: '$\\sin\\theta$, the angle below the horizontal:', branches: [sine(p), n3(p.tri[1] / p.tri[2]), n3(p.tri[0] / p.tri[2] / 2)].filter((v, i, all) => all.indexOf(v) === i).sort((a, b) => a - b).map((v) => ({ label: `$${fmt(v)}$`, to: 'T' })) },
        { id: 'T', ask: 'The tension, in newtons:', branches: forks(T, [p.W / 2, n3(2 * T), n3((p.W * p.tri[2]) / (2 * p.tri[1]))], 10).map((label) => ({ label, to: 'verdict' })) },
        { id: 'verdict', ask: `Against its strength of ${N(p.strength)}:`, branches: [HOLDS, SNAPS].map((label) => ({ label, outcome: 'A shallow sag makes $\\sin\\theta$ small, so the tension can be far more than the load.' })) },
      ],
      answer: [`$${fmt(sine(p))}$`, `$${fmt(T)}$`, T <= p.strength ? HOLDS : SNAPS],
    };
  },
  solution: (p) => [
    { tex: `\\sin\\theta = \\frac{${sag(p)}}{${p.tri[2] * p.k}} = ${fmt(sine(p))}` },
    { tex: `T = \\frac{${p.W}}{2 \\times ${fmt(sine(p))}} = ${fmt(tension(p))}` },
  ],
};

/* ================================================================
 * Body statics
 * ================================================================ */

interface ArmParams {
  /** Load in N at L cm from the elbow; forearm weight w at c cm; biceps at d cm. */
  W: number;
  L: number;
  w: number;
  c: number;
  d: number;
}

const biceps = ({ W, L, w, c, d }: ArmParams): number => n3((W * L + w * c) / d);

const sampleArm = (rng: { int: (a: number, b: number) => number }, hard: boolean): ArmParams =>
  until(
    () => ({ W: 5 * rng.int(4, 30), L: rng.int(28, 36), w: hard ? rng.int(10, 20) : 0, c: rng.int(14, 18), d: rng.int(3, 6) }),
    (p) => exact(biceps(p), 2),
  );

const armWords = (p: ArmParams): string =>
  `A forearm is held level with a load of ${N(p.W)} in the hand, ${cm(p.L)} from the elbow. The biceps pulls straight up ${cm(p.d)} from the elbow${p.w ? `, and the forearm’s own weight of ${N(p.w)} acts ${cm(p.c)} from the elbow` : '; ignore the forearm’s own weight'}.`;

/** Expression: the biceps force holding a load, from moments about the elbow. */
const bicepsGen: Generator<ArmParams> = {
  id: 'clm-biceps',
  sample: (rng, difficulty) => sampleArm(rng, difficulty > 1),
  render: (p) => typed([say(`${armWords(p)} What force does the biceps give, in newtons?`)], 'F =', biceps(p)),
  solution: (p) => [
    { text: 'Take moments about the elbow, so the joint’s own force drops out:' },
    { tex: p.w ? `F \\times ${p.d} = ${p.W} \\times ${p.L} + ${p.w} \\times ${p.c}` : `F \\times ${p.d} = ${p.W} \\times ${p.L}` },
    { tex: `F = \\frac{${p.W * p.L + p.w * p.c}}{${p.d}} = ${fmt(biceps(p))}` },
  ],
  choices: (p) => numChoices(biceps(p), [n3((p.W * p.d) / p.L), n3(p.W + p.w), n3(biceps(p) - p.W - p.w)], salted(p.W, p.L, p.w, p.d)),
};

/** Tree: the load's moment about the elbow, the biceps force, and the push down at the elbow joint. */
const elbowTree: Generator<ArmParams> = {
  id: 'clm-elbow-tree',
  sample: (rng, difficulty) => sampleArm(rng, difficulty > 1),
  render: (p) => {
    const M = p.W * p.L + p.w * p.c;
    const F = biceps(p);
    const R = n3(F - p.W - p.w);
    return {
      kind: 'tree',
      prompt: [say(armWords(p)), say('Find the moment of the weights about the elbow in $\\text{N cm}$, the biceps force, and the force the upper arm pushes down on the forearm at the elbow, in newtons.')],
      expression: 'F = \\frac{M}{d} \\qquad R = F - W_{\\text{total}}',
      nodes: [
        { id: 'M', from: [] },
        { id: 'F', from: ['M'] },
        { id: 'R', from: ['F'] },
      ],
      bank: tidyBank([M, F, R], [n3(F + p.W + p.w), p.W * p.L, n3(M / p.L)]),
      answer: [M, F, R].map(fmt),
    };
  },
  solution: (p) => {
    const M = p.W * p.L + p.w * p.c;
    return [
      { tex: p.w ? `M = ${p.W} \\times ${p.L} + ${p.w} \\times ${p.c} = ${M}` : `M = ${p.W} \\times ${p.L} = ${M}` },
      { tex: `F = \\frac{${M}}{${p.d}} = ${fmt(biceps(p))}` },
      { text: 'Up and down balance: the biceps pulls up more than the weights, so the joint pushes down the difference.' },
      { tex: `R = ${fmt(biceps(p))} - ${p.W + p.w} = ${fmt(biceps(p) - p.W - p.w)}` },
    ];
  },
};

interface ToeParams {
  /** Body weight in N; ball of the foot a cm in front of the ankle; Achilles tendon b cm behind it. */
  W: number;
  a: number;
  b: number;
  one: boolean;
}

const achilles = ({ W, a, b, one }: ToeParams): number => n3(((one ? W : W / 2) * a) / b);

/** Expression: the Achilles tendon's pull when standing on tiptoe, from moments about the ankle. */
const tiptoe: Generator<ToeParams> = {
  id: 'clm-tiptoe',
  sample: (rng, difficulty) => until(() => ({ W: 10 * rng.int(40, 90), a: rng.int(10, 16), b: rng.int(4, 6), one: difficulty > 1 ? rng.chance(0.5) : true }), (p) => exact(achilles(p), 2)),
  render: (p) =>
    typed(
      [say(`A person weighing ${N(p.W)} stands on tiptoe on ${p.one ? 'one foot' : 'both feet, their weight shared equally'}. The floor pushes up on the ball of each foot ${cm(p.a)} in front of the ankle, and the Achilles tendon pulls up ${cm(p.b)} behind it. What is the pull in each Achilles tendon, in newtons?`)],
      'T =',
      achilles(p),
    ),
  solution: (p) => [
    ...(p.one ? [] : [{ text: `Each foot carries half: $${fmt(p.W / 2)}\\text{ N}$.` }]),
    { text: 'Take moments about the ankle:' },
    { tex: `T \\times ${p.b} = ${fmt(p.one ? p.W : p.W / 2)} \\times ${p.a}` },
    { tex: `T = ${fmt(achilles(p))}` },
  ],
  choices: (p) => numChoices(achilles(p), [n3(((p.one ? p.W : p.W / 2) * p.b) / p.a), p.one ? p.W : p.W / 2, n3(achilles(p) * (p.one ? 0.5 : 2))], salted(p.W, p.a, p.b, p.one ? 1 : 2)),
};

interface LeverRow {
  W: number;
  L: number;
  d: number;
  blank: 'W' | 'L' | 'd' | 'F';
}

/** Table: body levers, load W at L from the joint and a muscle at d: F = W L / d, any one missing. */
const leverTable: Generator<{ rows: LeverRow[] }> = {
  id: 'clm-lever-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ rows: [0, 1, 2].map((): LeverRow => ({ W: 10 * rng.int(1, 20), L: rng.int(10, 40), d: rng.int(2, 8), blank: difficulty > 1 ? rng.pick(['W', 'L', 'd', 'F'] as const) : 'F' })) }),
      ({ rows }) => rows.every((r) => exact((r.W * r.L) / r.d, 2)) && new Set(rows.map((r) => (r.W * r.L) / r.d)).size === 3,
    ),
  render: ({ rows }) => {
    const F = (r: LeverRow) => n3((r.W * r.L) / r.d);
    const value = (r: LeverRow) => (r.blank === 'F' ? F(r) : r[r.blank]);
    const answer = rows.map(value);
    return {
      kind: 'table',
      prompt: [say('Each row is a lever in the body: a load $W$ in newtons at $L$ centimetres from the joint, held by a muscle pulling at $d$ centimetres from it with force $F$. Fill in the gaps.')],
      columns: ['W', 'L', 'd', 'F'],
      rows: rows.map((r) => [r.blank === 'W' ? null : fmt(r.W), r.blank === 'L' ? null : fmt(r.L), r.blank === 'd' ? null : fmt(r.d), r.blank === 'F' ? null : fmt(F(r))]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3((r.W * r.d) / r.L), r.W * r.L])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep => {
      const F = (r.W * r.L) / r.d;
      if (r.blank === 'F') return { tex: `F = \\frac{${r.W} \\times ${r.L}}{${r.d}} = ${fmt(F)}` };
      if (r.blank === 'W') return { tex: `W = \\frac{${fmt(F)} \\times ${r.d}}{${r.L}} = ${r.W}` };
      if (r.blank === 'L') return { tex: `L = \\frac{${fmt(F)} \\times ${r.d}}{${r.W}} = ${r.L}` };
      return { tex: `d = \\frac{${r.W} \\times ${r.L}}{${fmt(F)}} = ${r.d}` };
    }),
};

export const classicalStaticsGenerators = [
  comRod,
  comSlider,
  comTable,
  com2dTree,
  stackTable,
  stackSlider,
  stackTree,
  stackFlow,
  tipPushGen,
  tipTree,
  slideTipFlow,
  tipSlider,
  ropeTension,
  ropeTree,
  ropeSlider,
  ropeFlow,
  bicepsGen,
  elbowTree,
  tiptoe,
  leverTable,
];

export const classicalStaticsInternals = { comOf, harmonic, lowerOver, tipPush, slidePush, tension, biceps, achilles };
