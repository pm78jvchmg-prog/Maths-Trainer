/**
 * Classical Mechanics, level 5: Momentum (`clm-l5`).
 *
 * Impulse as the area under a force-time graph, after OpenStax University
 * Physics 9.2; bounces and the coefficient of restitution, after 9.4;
 * collisions in two dimensions, after 9.5; rocket propulsion, after 9.7; and
 * the momentum of a stream of particles and of light, after the molecular
 * model of a gas in University Physics Volume 2, 2.1 to 2.2, and photon
 * momentum in Volume 3, 6.3. Forces and Newton's Laws already has momentum,
 * impulse and collisions in a straight line, so those are used, not taught
 * again.
 *
 * Tidy cases throughout: a drop of 2.5j^2 metres hits at 7j m/s; momenta in
 * two dimensions come from Pythagorean triples; light pressure is worked in
 * micronewtons, where 300 W of absorbed light pushes with 1 uN. Every value
 * the learner reads is one a textbook prints, whole or one decimal place: a
 * coefficient of restitution from two such heights, and a temperature from a
 * whole-kPa pressure, do not come out exactly, so they are asked to a stated
 * precision (see `classicalKit`).
 */
import type { ChoiceOption, Generator, KeypadKey, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import { steered } from './parametricImplicit';
import { WORKING_KEYS } from './workingKeys';
import {
  G_NOTE,
  askPrecision,
  exact,
  fixed,
  fmt,
  forks,
  kg,
  metres,
  ms,
  newtons,
  numChoices,
  precisionWords,
  roundTo,
  roundedWell,
  salted,
  say,
  track,
  typed,
  typedRounded,
  until,
  valueBank,
  type Precision,
} from './classicalKit';

const tidyBank = (answer: number[], wrong: number[], spare = 3): string[] =>
  valueBank(
    answer,
    wrong.filter((v) => v > 0 && exact(v, 3)),
    spare,
  );

const n3 = (v: number): number => Number(v.toFixed(6));
const msec = (v: number): string => `$${fmt(v)}\\text{ ms}$`;
const ns = (v: number): string => `$${fmt(v)}\\text{ N s}$`;

/* ================================================================
 * Force-time graphs
 * ================================================================ */

interface PulseParams {
  /** Peak force, newtons. */
  F: number;
  /** Rise, flat top and fall, in milliseconds. */
  rise: number;
  flat: number;
  fall: number;
  thing: string;
  m: number;
}

const HITS = [
  { thing: 'football', m: 0.4 },
  { thing: 'tennis ball', m: 0.05 },
  { thing: 'hockey puck', m: 0.16 },
  { thing: 'golf ball', m: 0.04 },
  { thing: 'cricket ball', m: 0.16 },
  { thing: 'basketball', m: 0.6 },
];

const T_MAX = 20;

const impulseOf = ({ F, rise, flat, fall }: PulseParams): number => n3((F * (rise / 2 + flat + fall / 2)) / 1000);

/** A force-time graph of the pulse, time in milliseconds. */
function pulseSvg({ F, rise, flat, fall }: PulseParams, fTop: number): string {
  const W = 280;
  const H = 180;
  const L = 44;
  const R = 12;
  const T = 14;
  const B = 150;
  const x = (t: number) => (L + (t / T_MAX) * (W - L - R)).toFixed(1);
  const y = (f: number) => (B - (f / fTop) * (B - T)).toFixed(1);
  const step = fTop / 4;
  const grid = [0, 1, 2, 3, 4]
    .map((i) => `<line x1="${L}" y1="${y(i * step)}" x2="${W - R}" y2="${y(i * step)}" stroke="currentColor" opacity="0.12"/><text x="${L - 5}" y="${(Number(y(i * step)) + 3.5).toFixed(1)}" font-size="10" text-anchor="end" fill="currentColor" opacity="0.7">${fmt(i * step)}</text>`)
    .join('');
  const tGrid = Array.from({ length: T_MAX / 2 + 1 }, (_, i) => 2 * i)
    .map((t) => `<line x1="${x(t)}" y1="${T}" x2="${x(t)}" y2="${B}" stroke="currentColor" opacity="0.12"/>` + (t % 4 === 0 ? `<text x="${x(t)}" y="${B + 14}" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">${t}</text>` : ''))
    .join('');
  const start = 2;
  const pts = [
    [start, 0],
    [start + rise, F],
    [start + rise + flat, F],
    [start + rise + flat + fall, 0],
  ];
  const poly = pts.map(([t, f]) => `${x(t)},${y(f)}`).join(' ');
  return (
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A graph of force in newtons against time in milliseconds: a pulse rising to ${F} newtons">` +
    grid +
    tGrid +
    `<polygon points="${poly}" fill="currentColor" class="plot-accent" opacity="0.25"/>` +
    `<polyline points="${poly}" fill="none" stroke="currentColor" class="plot-accent" stroke-width="2.5"/>` +
    `<line x1="${L}" y1="${B}" x2="${W - R}" y2="${B}" stroke="currentColor" stroke-width="1.5"/>` +
    `<line x1="${L}" y1="${T}" x2="${L}" y2="${B}" stroke="currentColor" stroke-width="1.5"/>` +
    `<text x="${W - R}" y="${H - 2}" font-size="10" text-anchor="end" fill="currentColor" opacity="0.7">t (ms)</text>` +
    `<text x="${L + 4}" y="${T - 3}" font-size="10" fill="currentColor" opacity="0.7">F (N)</text>` +
    `</svg>`
  );
}

const topFor = (F: number): number => [400, 800, 1200, 1600, 2000, 2400].find((t) => t >= F) ?? 2400;

const samplePulse = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }, hard: boolean): PulseParams =>
  until(
    () => {
      const hit = rng.pick(HITS);
      return { F: 100 * rng.int(1, hard ? 24 : 12), rise: rng.int(1, 6), flat: hard ? rng.int(1, 6) : 0, fall: rng.int(1, 6), thing: hit.thing, m: hit.m };
    },
    (p) => p.rise + p.flat + p.fall + 2 <= T_MAX && exact(impulseOf(p), 3) && exact(impulseOf(p) / p.m, 3),
  );

const areaLines = (p: PulseParams): SolutionStep[] =>
  p.flat === 0
    ? [{ text: 'The pulse is a triangle:' }, { tex: `J = \\tfrac{1}{2} \\times ${p.F} \\times ${fmt((p.rise + p.fall) / 1000)} = ${fmt(impulseOf(p))}` }]
    : [
        { text: 'Split it into a rectangle and two triangles, times in seconds:' },
        { tex: `J = ${p.F} \\times \\left(\\tfrac{1}{2} \\times ${fmt(p.rise / 1000)} + ${fmt(p.flat / 1000)} + \\tfrac{1}{2} \\times ${fmt(p.fall / 1000)}\\right)` },
        { tex: `J = ${fmt(impulseOf(p))}` },
      ];

/** Expression: the impulse, read as the area under a force-time graph: a triangle (easy) or a trapezium (hard). */
const impulseArea: Generator<PulseParams> = {
  id: 'clm-impulse-area',
  sample: (rng, difficulty) => samplePulse(rng, difficulty > 1),
  render: (p) =>
    typed(
      [{ kind: 'diagram', svg: pulseSvg(p, topFor(p.F)) }, say(`The graph shows the force on a ${p.thing} as it is struck. What impulse does it get, in $\\text{N s}$?`)],
      'J =',
      impulseOf(p),
    ),
  solution: (p) => areaLines(p),
  choices: (p) => {
    const J = impulseOf(p);
    return numChoices(J, [n3(J * 1000), n3(J * 2), n3((p.F * (p.rise + p.flat + p.fall)) / 1000)], salted(p.F, p.rise, p.flat, p.fall));
  },
};

/** Tree: from the graph, the impulse, the change of speed J/m, then the speed after, from rest. */
const impulseTree: Generator<PulseParams> = {
  id: 'clm-impulse-tree',
  sample: (rng, difficulty) => samplePulse(rng, difficulty > 1),
  render: (p) => {
    const J = impulseOf(p);
    const dv = n3(J / p.m);
    return {
      kind: 'tree',
      prompt: [{ kind: 'diagram', svg: pulseSvg(p, topFor(p.F)) }, say(`A ${kg(p.m)} ${p.thing} at rest is struck with the force shown. Find the impulse in $\\text{N s}$, then the speed it leaves at in $\\text{m s}^{-1}$.`)],
      expression: 'J = m\\Delta v',
      nodes: [
        { id: 'J', from: [] },
        { id: 'v', from: ['J'] },
      ],
      bank: tidyBank([J, dv], [n3(J * p.m), n3(J * 1000), n3(dv / 2), n3(2 * dv)]),
      answer: [J, dv].map(fmt),
    };
  },
  solution: (p) => [...areaLines(p), { tex: `v = \\frac{${fmt(impulseOf(p))}}{${fmt(p.m)}} = ${fmt(impulseOf(p) / p.m)}` }],
};

interface AvgParams {
  thing: string;
  m: number;
  u: number;
  /** Speed back after the bounce; 0 when it stops. */
  v: number;
  /** Contact time in milliseconds. */
  t: number;
}

/** Expression: the average force of an impact, the change of momentum over the time: stopped (easy) or bounced back (hard). */
const avgForce: Generator<AvgParams> = {
  id: 'clm-avg-force',
  sample: (rng, difficulty) =>
    until(
      () => {
        const hit = rng.pick(HITS);
        const u = rng.int(5, 40);
        return { thing: hit.thing, m: hit.m, u, v: difficulty > 1 ? rng.int(2, u) : 0, t: rng.pick([2, 4, 5, 8, 10, 20, 25, 40, 50]) };
      },
      (p) => exact((p.m * (p.u + p.v) * 1000) / p.t, 2),
    ),
  render: (p) =>
    typed(
      [
        say(
          p.v === 0
            ? `A ${kg(p.m)} ${p.thing} at ${ms(p.u)} is caught and stopped in ${msec(p.t)}. What average force stops it, in newtons?`
            : `A ${kg(p.m)} ${p.thing} hits a wall at ${ms(p.u)} and bounces straight back at ${ms(p.v)}. It is in contact for ${msec(p.t)}. What average force does the wall exert, in newtons?`,
        ),
      ],
      'F =',
      n3((p.m * (p.u + p.v) * 1000) / p.t),
    ),
  solution: (p) => [
    ...(p.v === 0 ? [] : [{ text: 'Coming back is the other way, so the change of velocity is the two speeds added:' }]),
    { tex: `\\Delta p = ${fmt(p.m)} \\times ${p.v === 0 ? p.u : `(${p.u} + ${p.v})`} = ${fmt(p.m * (p.u + p.v))}` },
    { tex: `F = \\frac{${fmt(p.m * (p.u + p.v))}}{${fmt(p.t / 1000)}} = ${fmt((p.m * (p.u + p.v) * 1000) / p.t)}` },
  ],
  choices: (p) => {
    const F = n3((p.m * (p.u + p.v) * 1000) / p.t);
    return numChoices(F, [n3((p.m * Math.abs(p.u - p.v) * 1000) / p.t), n3(p.m * (p.u + p.v) * p.t), n3(F / 1000)], salted(p.m, p.u, p.v, p.t));
  },
};

interface PeakParams {
  /** Peak force in steps of 50 N. */
  steps: number;
  /** Duration of the triangular pulse, ms. */
  T: number;
  what: string;
}

const PEAK_MAX = 2000;

/** Slider: the peak force of a triangular pulse that gives an impulse, F = 2J/T. */
const peakSlider: Generator<PeakParams> = {
  id: 'clm-peak-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({ steps: rng.int(2, PEAK_MAX / 50), T: rng.pick(difficulty > 1 ? [3, 4, 5, 6, 8, 12, 15] : [2, 4, 5, 10, 20]), what: rng.pick(['kick', 'bat', 'club', 'racket', 'punch']) }),
      // The impulse is printed, so it is one a textbook would print: one decimal place.
      (p) => exact((50 * p.steps * p.T) / 2000, 1),
    ),
  render: (p) => {
    const F = 50 * p.steps;
    const J = n3((F * p.T) / 2000);
    const figure = track(0, PEAK_MAX, [], 'A scale of forces in newtons');
    return {
      kind: 'slider',
      prompt: [say(`A ${p.what} gives an impulse of ${ns(J)} in ${msec(p.T)}. The force rises steadily to its peak and falls straight back, a triangle on a force-time graph. Slide to the peak force, in newtons.`)],
      min: 0,
      max: PEAK_MAX,
      step: 50,
      answer: F,
      readout: 'F = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => {
    const F = 50 * p.steps;
    const J = n3((F * p.T) / 2000);
    return [{ tex: `${fmt(J)} = \\tfrac{1}{2} \\times F \\times ${fmt(p.T / 1000)}` }, { tex: `F = \\frac{2 \\times ${fmt(J)}}{${fmt(p.T / 1000)}} = ${F}` }];
  },
};

/* ================================================================
 * Restitution
 * ================================================================ */

const ES = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const BALLS = ['tennis ball', 'basketball', 'golf ball', 'rubber ball', 'squash ball', 'football'];

interface BounceParams {
  ball: string;
  e: number;
  /** Drop height 2.5j^2, so it lands at 7j. */
  j: number;
}

const dropH = ({ j }: BounceParams): number => n3(2.5 * j * j);

/** Expression: how high a dropped ball bounces, e^2 h. */
const bounceHeight: Generator<BounceParams> = {
  id: 'clm-bounce-height',
  sample: (rng, difficulty) => ({ ball: rng.pick(BALLS), e: rng.pick(ES), j: rng.int(1, difficulty > 1 ? 8 : 4) }),
  render: (p) => typed([say(`A ${p.ball} is dropped from ${metres(dropH(p))} onto a floor. The coefficient of restitution is $e = ${fmt(p.e)}$. How high does it bounce, in metres?`)], 'h =', n3(p.e * p.e * dropH(p))),
  solution: (p) => [
    { tex: `v^{2} = 2 \\times 9.8 \\times ${fmt(dropH(p))} = ${49 * p.j * p.j}` },
    { tex: `v = ${7 * p.j}` },
    { tex: `v_{\\text{up}} = ${fmt(p.e)} \\times ${7 * p.j} = ${fmt(7 * p.j * p.e)}` },
    { tex: `h = \\frac{${fmt(7 * p.j * p.e)}^{2}}{19.6} = ${fmt(p.e * p.e * dropH(p))}` },
  ],
  choices: (p) => numChoices(n3(p.e * p.e * dropH(p)), [n3(p.e * dropH(p)), n3((1 - p.e) * dropH(p)), n3(p.e * p.e * p.e * dropH(p))], salted(p.e, p.j)),
};

interface RestParams {
  ball: string;
  /** Easy: the coefficient, from a list. Hard: sqrt(h2/h1), unrounded. */
  e: number;
  /** Easy: the speed in, whole. */
  u: number;
  /** Hard: dropped from h1 whole metres, bouncing to h2 to one decimal place. */
  h1: number;
  h2: number;
  fromHeights: boolean;
}

/** An unrounded value on a working line: 0.8062..., or the value itself when it ends. */
const dots = (value: number, places = 4): string => (exact(value, places) ? fmt(value) : `${value.toFixed(places)}\\ldots`);

/** e from heights is asked to 2 decimal places. */
const E_DP: Precision = { dp: 2 };

/** Expression: the coefficient of restitution from the speeds (easy) or the heights, rounded (hard). */
const restitution: Generator<RestParams> = {
  id: 'clm-restitution',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? until(
          () => {
            const h1 = rng.int(2, 20);
            const h2 = rng.int(Math.ceil(h1), Math.floor(h1 * 8.5)) / 10;
            return { ball: rng.pick(BALLS), e: Math.sqrt(h2 / h1), u: 0, h1, h2, fromHeights: true };
          },
          (p) => roundedWell(p.e, E_DP),
        )
      : until(
          () => ({ ball: rng.pick(BALLS), e: rng.pick([...ES, 0.25, 0.75, 0.3]), u: rng.int(2, 30), h1: 0, h2: 0, fromHeights: false }),
          // The speed out is printed, so it has one decimal place at most.
          (p) => exact(p.e * p.u, 1),
        ),
  render: (p) =>
    p.fromHeights
      ? typedRounded(
          [say(`A ${p.ball} dropped from ${metres(p.h1)} bounces back up to ${metres(p.h2)}. What is the coefficient of restitution? ${askPrecision(E_DP)}`)],
          'e =',
          p.e,
          E_DP,
        )
      : typed([say(`A ${p.ball} hits the floor at ${ms(p.u)} and leaves it at ${ms(n3(p.e * p.u))}. What is the coefficient of restitution?`)], 'e =', p.e),
  solution: (p) =>
    p.fromHeights
      ? [
          { text: 'Speeds go as the square root of heights, so' },
          { tex: `e = \\sqrt{\\frac{${fmt(p.h2)}}{${fmt(p.h1)}}} = ${dots(p.e)}` },
          { text: 'To 2 decimal places:' },
          { tex: `e = ${fixed(p.e, E_DP)}` },
        ]
      : [{ tex: `e = \\frac{v}{u} = \\frac{${fmt(p.e * p.u)}}{${p.u}} = ${fmt(p.e)}` }],
  choices: (p) => {
    if (!p.fromHeights) return numChoices(p.e, [n3(p.e * p.e), n3(1 - p.e), n3(1 / p.e)], salted(p.e, p.u));
    const r = (v: number) => roundTo(v, E_DP);
    return numChoices(r(p.e), [r(p.h2 / p.h1), r(1 - p.e), r(1 / p.e)], salted(p.h1, p.h2 * 10));
  },
};

/** Tree: a drop: the speed it lands at, the speed it leaves at, and the height of the bounce. */
const bounceTree: Generator<BounceParams> = {
  id: 'clm-bounce-tree',
  sample: (rng, difficulty) => ({ ball: rng.pick(BALLS), e: rng.pick(difficulty > 1 ? [...ES, 0.25, 0.75, 0.3] : ES), j: rng.int(1, 6) }),
  render: (p) => {
    const u = 7 * p.j;
    const v = n3(p.e * u);
    const h = n3(p.e * p.e * dropH(p));
    return {
      kind: 'tree',
      prompt: [say(`A ${p.ball} is dropped from ${metres(dropH(p))}; $e = ${fmt(p.e)}$. ${G_NOTE}`), say('Find the speed it lands at, the speed it bounces up at, and the height it reaches.')],
      expression: 'v = eu',
      nodes: [
        { id: 'u', from: [] },
        { id: 'v', from: ['u'] },
        { id: 'h', from: ['v'] },
      ],
      bank: tidyBank([u, v, h], [n3(p.e * dropH(p)), n3((1 - p.e) * u), 49 * p.j * p.j]),
      answer: [u, v, h].map(fmt),
    };
  },
  solution: (p) => [
    { tex: `u^{2} = 19.6 \\times ${fmt(dropH(p))} = ${49 * p.j * p.j}` },
    { tex: `u = ${7 * p.j}` },
    { tex: `v = ${fmt(p.e)} \\times ${7 * p.j} = ${fmt(7 * p.j * p.e)}` },
    { tex: `h = \\frac{${fmt(7 * p.j * p.e)}^{2}}{19.6} = ${fmt(p.e * p.e * dropH(p))}` },
  ],
};

interface HeadOnParams {
  mA: number;
  mB: number;
  uA: number;
  e: number;
}

const afterA = ({ mA, mB, uA, e }: HeadOnParams): number => n3((mA * uA - mB * e * uA) / (mA + mB));
const afterB = (p: HeadOnParams): number => n3(afterA(p) + p.e * p.uA);

/** Flow: a trolley runs into one at rest: the momentum, the speed of separation, then each velocity after. */
const collisionFlow: Generator<HeadOnParams> = {
  id: 'clm-collision-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({ mA: rng.int(1, 6), mB: rng.int(1, 6), uA: rng.int(2, 12), e: rng.pick(difficulty > 1 ? [0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8] : [0, 0.5, 1]) }),
      (p) => exact(afterA(p), 2) && exact(afterB(p), 2) && afterA(p) >= 0,
    ),
  render: (p) => {
    const P = p.mA * p.uA;
    const sep = n3(p.e * p.uA);
    const vA = afterA(p);
    const vB = afterB(p);
    return {
      kind: 'flow',
      prompt: [say(`A ${kg(p.mA)} trolley at ${ms(p.uA)} runs into a ${kg(p.mB)} trolley at rest, with $e = ${fmt(p.e)}$. How fast does each move afterwards?`)],
      subject: 'm_{A}v_{A} + m_{B}v_{B} = m_{A}u_{A} \\qquad v_{B} - v_{A} = eu_{A}',
      steps: [
        { id: 'sep', ask: 'The speed they separate at, $v_{B} - v_{A}$, in $\\text{m s}^{-1}$:', branches: forks(sep, [n3((1 - p.e) * p.uA), p.uA, n3(p.e * p.e * p.uA)], 0.5).map((label) => ({ label, to: 'vA' })) },
        { id: 'vA', ask: 'So from the momentum, the first trolley’s speed:', branches: forks(vA, [n3(P / (p.mA + p.mB)), n3(vA + 1), vB], 0.5).map((label) => ({ label, to: 'vB' })) },
        { id: 'vB', ask: 'And the second trolley’s speed:', branches: forks(vB, [n3(P / p.mB), sep, n3(vB + 1)], 0.5).map((label) => ({ label, outcome: 'Momentum fixes one equation and the bounce the other.' })) },
      ],
      answer: [`$${fmt(sep)}$`, `$${fmt(vA)}$`, `$${fmt(vB)}$`],
    };
  },
  solution: (p) => [
    { tex: `v_{B} - v_{A} = ${fmt(p.e)} \\times ${p.uA} = ${fmt(p.e * p.uA)}` },
    { tex: `${p.mA}v_{A} + ${p.mB}(v_{A} + ${fmt(p.e * p.uA)}) = ${p.mA * p.uA}` },
    { tex: `${p.mA + p.mB}v_{A} = ${fmt(p.mA * p.uA - p.mB * p.e * p.uA)}` },
    { tex: `v_{A} = ${fmt(afterA(p))}` },
    { tex: `v_{B} = ${fmt(afterA(p))} + ${fmt(p.e * p.uA)} = ${fmt(afterB(p))}` },
  ],
};

/* ================================================================
 * Collisions in two dimensions
 * ================================================================ */

interface MoverRow {
  m: number;
  vx: number;
  vy: number;
}

/** Table: momentum components m v_x and m v_y of three bodies; hard adds a velocity blank. */
const momentumTable: Generator<{ rows: MoverRow[]; hard: boolean }> = {
  id: 'clm-momentum-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ rows: [0, 1, 2].map(() => ({ m: rng.pick([0.5, 1, 2, 3, 4, 5, 1.5]), vx: rng.int(-8, 8), vy: rng.int(-8, 8) })), hard: difficulty > 1 }),
      ({ rows }) => rows.every((r) => r.vx !== 0 && r.vy !== 0) && new Set(rows.map((r) => `${r.m}`)).size > 1,
    ),
  render: ({ rows, hard }) => {
    const answer = rows.flatMap((r, i) => (hard && i === 2 ? [r.vx, n3(r.m * r.vy)] : [n3(r.m * r.vx), n3(r.m * r.vy)]));
    const as = (v: number) => (v < 0 ? `-${fmt(-v)}` : fmt(v));
    return {
      kind: 'table',
      prompt: [say('Each row is a body of mass $m$ in kilograms moving with velocity parts $v_{x}$ and $v_{y}$ in $\\text{m s}^{-1}$. Fill in the gaps, with the momentum parts $p_{x}$ and $p_{y}$ in $\\text{N s}$.')],
      columns: ['m', 'v_{x}', 'v_{y}', 'p_{x}', 'p_{y}'],
      rows: rows.map((r, i) => (hard && i === 2 ? [fmt(r.m), null, as(r.vy), as(n3(r.m * r.vx)), null] : [fmt(r.m), as(r.vx), as(r.vy), null, null])),
      bank: [...answer.map(as), ...[...new Set(rows.flatMap((r) => [as(n3(-r.m * r.vx)), as(n3(-r.m * r.vy)), as(n3(r.vx + r.m))]))].filter((t) => !answer.map(as).includes(t)).slice(0, 3)].sort(
        (a, b) => Number(a) - Number(b),
      ),
      answer: answer.map(as),
    };
  },
  solution: ({ rows, hard }) =>
    rows.flatMap((r, i): SolutionStep[] =>
      hard && i === 2
        ? [{ tex: `v_{x} = \\frac{${fmt(r.m * r.vx)}}{${fmt(r.m)}} = ${fmt(r.vx)}` }, { tex: `p_{y} = ${fmt(r.m)} \\times ${fmt(r.vy)} = ${fmt(r.m * r.vy)}` }]
        : [{ tex: `p_{x} = ${fmt(r.m)} \\times ${fmt(r.vx)} = ${fmt(r.m * r.vx)}` }, { tex: `p_{y} = ${fmt(r.m)} \\times ${fmt(r.vy)} = ${fmt(r.m * r.vy)}` }],
    ),
};

const TRIPLES = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
  [6, 8, 10],
  [8, 6, 10],
];

interface MergeParams {
  /** Momenta east and north are k times a triple's legs. */
  tri: number[];
  k: number;
  mA: number;
  mB: number;
  what: string;
}

const PAIRS = ['two trolleys on an air table', 'two lumps of clay', 'two bowling balls', 'two model railway wagons', 'two blocks sliding on ice'];

/** Tree: A east and B north stick together: total momentum east and north, then the speed of the pair. */
const mergeTree: Generator<MergeParams> = {
  id: 'clm-merge-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ tri: rng.pick(difficulty > 1 ? TRIPLES : TRIPLES.slice(0, 2)), k: rng.int(1, 10), mA: rng.int(1, 12), mB: rng.int(1, 12), what: rng.pick(PAIRS) }),
      (p) => (p.k * p.tri[0]) / p.mA <= 30 && (p.k * p.tri[1]) / p.mB <= 30 && exact((p.k * p.tri[0]) / p.mA, 1) && exact((p.k * p.tri[1]) / p.mB, 1) && exact((p.k * p.tri[2]) / (p.mA + p.mB), 2),
    ),
  render: (p) => {
    const px = p.k * p.tri[0];
    const py = p.k * p.tri[1];
    const v = n3((p.k * p.tri[2]) / (p.mA + p.mB));
    return {
      kind: 'tree',
      prompt: [
        say(`In a collision of ${p.what}, a ${kg(p.mA)} one moving east at ${ms(n3(px / p.mA))} meets a ${kg(p.mB)} one moving north at ${ms(n3(py / p.mB))}, and they move off together.`),
        say('Find the total momentum east and north, in $\\text{N s}$, then the speed they move off at.'),
      ],
      expression: 'v = \\frac{\\sqrt{p_{x}^{2} + p_{y}^{2}}}{m_{A} + m_{B}}',
      nodes: [
        { id: 'p_{x}', from: [] },
        { id: 'p_{y}', from: [] },
        { id: 'v', from: ['p_{x}', 'p_{y}'] },
      ],
      bank: tidyBank([px, py, v], [px + py, n3((px + py) / (p.mA + p.mB)), p.k * p.tri[2]]),
      answer: [px, py, v].map(fmt),
    };
  },
  solution: (p) => {
    const px = p.k * p.tri[0];
    const py = p.k * p.tri[1];
    return [
      { tex: `p_{x} = ${p.mA} \\times ${fmt(px / p.mA)} = ${px}` },
      { tex: `p_{y} = ${p.mB} \\times ${fmt(py / p.mB)} = ${py}` },
      { tex: `p = \\sqrt{${px}^{2} + ${py}^{2}} = ${p.k * p.tri[2]}` },
      { tex: `v = \\frac{${p.k * p.tri[2]}}{${p.mA + p.mB}} = ${fmt((p.k * p.tri[2]) / (p.mA + p.mB))}` },
    ];
  },
};

interface GlanceParams {
  /** Equal masses; A comes in at u along x and leaves with (ax, ay). */
  m: number;
  u: number;
  ax: number;
  ay: number;
}

/** Tree: a moving ball glances off an equal one at rest: B's velocity east and north, then its speed. */
const glanceTree: Generator<GlanceParams> = {
  id: 'clm-glance-tree',
  sample: (rng, difficulty) =>
    until(
      () => {
        const [a, b] = rng.pick(TRIPLES);
        const k = rng.int(1, 3);
        const bx = a * k;
        const by = b * k;
        const ax = rng.int(1, difficulty > 1 ? 30 : 20);
        return { m: rng.pick([0.17, 0.16, 0.2, 0.5, 1]), u: ax + bx, ax, ay: -by };
      },
      // No kinetic energy may appear from nowhere: u^2 = |a + b|^2 = |a|^2 + |b|^2 + 2a.b, so a.b >= 0.
      (p) => p.u <= 40 && p.ax * (p.u - p.ax) - p.ay * p.ay >= 0,
    ),
  render: (p) => {
    const bx = p.u - p.ax;
    const by = -p.ay;
    const speed = Math.hypot(bx, by);
    return {
      kind: 'tree',
      prompt: [
        say(`A ${kg(p.m)} snooker ball moving east at ${ms(p.u)} strikes an equal ball at rest. Afterwards the first ball moves with velocity ${ms(p.ax)} east and ${ms(-p.ay)} south.`),
        say('Find the second ball’s velocity east and north, then its speed, all in $\\text{m s}^{-1}$.'),
      ],
      expression: 'm\\mathbf{u} = m\\mathbf{v}_{A} + m\\mathbf{v}_{B}',
      nodes: [
        { id: 'v_{x}', from: [] },
        { id: 'v_{y}', from: [] },
        { id: 'v', from: ['v_{x}', 'v_{y}'] },
      ],
      bank: tidyBank([bx, by, speed], [p.u + p.ax, bx + by, p.u]),
      answer: [bx, by, speed].map(fmt),
    };
  },
  solution: (p) => {
    const bx = p.u - p.ax;
    const by = -p.ay;
    return [
      { text: 'The masses are equal, so they cancel: velocities add up like momenta.' },
      { tex: `v_{x} = ${p.u} - ${p.ax} = ${bx}` },
      { tex: `v_{y} = 0 - (-${by}) = ${by}` },
      { tex: `v = \\sqrt{${bx}^{2} + ${by}^{2}} = ${fmt(Math.hypot(bx, by))}` },
    ];
  },
};

/** Expression: the direction two bodies move off together, as the tangent of the angle north of east. */
const mergeAngle: Generator<MergeParams> = {
  id: 'clm-merge-angle',
  sample: (rng, difficulty) =>
    until(
      () => ({ tri: rng.pick(TRIPLES), k: rng.int(1, 10), mA: rng.int(1, 12), mB: rng.int(1, 12), what: rng.pick(PAIRS) }),
      (p) => (p.k * p.tri[0]) / p.mA <= 30 && (p.k * p.tri[1]) / p.mB <= 30 && exact((p.k * p.tri[0]) / p.mA, 1) && exact((p.k * p.tri[1]) / p.mB, 1) && exact(p.tri[1] / p.tri[0], 4) && (difficulty > 1 || p.tri[2] % 5 === 0),
    ),
  render: (p) => {
    const px = p.k * p.tri[0];
    const py = p.k * p.tri[1];
    return typed(
      [say(`In a collision of ${p.what}, a ${kg(p.mA)} one moving east at ${ms(n3(px / p.mA))} meets a ${kg(p.mB)} one moving north at ${ms(n3(py / p.mB))}, and they move off together at an angle $\\theta$ north of east. What is $\\tan\\theta$?`)],
      '\\tan\\theta =',
      n3(py / px),
    );
  },
  solution: (p) => {
    const px = p.k * p.tri[0];
    const py = p.k * p.tri[1];
    return [{ tex: `p_{x} = ${px} \\qquad p_{y} = ${py}` }, { tex: `\\tan\\theta = \\frac{${py}}{${px}} = ${fmt(py / px)}` }];
  },
  choices: (p) => {
    const px = p.k * p.tri[0];
    const py = p.k * p.tri[1];
    return numChoices(n3(py / px), [n3(px / py), n3(py / p.mB / (px / p.mA)), n3(py / (px + py))], salted(p.k, p.mA, p.mB, ...p.tri));
  },
};

/* ================================================================
 * Rockets
 * ================================================================ */

const LN_KEYS: KeypadKey[] = [{ insert: 'ln(', label: 'ln' }, ...WORKING_KEYS];

interface RocketParams {
  /** Exhaust speed, m/s. */
  u: number;
  /** Mass ratio m0/m1, whole. */
  R: number;
  /** Mass after the burn, kg. */
  m1: number;
  /** Hard: given the masses, not the ratio. */
  masses: boolean;
}

/** Expression: the rocket equation, Delta v = u ln(m0/m1), answered as an exact multiple of a logarithm. */
const rocketDv: Generator<RocketParams> = {
  id: 'clm-rocket-dv',
  sample: (rng, difficulty) => ({ u: 500 * rng.int(2, 9), R: rng.int(2, 6), m1: 100 * rng.int(2, 40), masses: difficulty > 1 }),
  render: (p) => ({
    kind: 'expression',
    prompt: [
      say(
        p.masses
          ? `A rocket with exhaust speed ${ms(p.u)} burns fuel until its mass falls from ${kg(p.R * p.m1)} to ${kg(p.m1)}. Far from any planet, how much speed does it gain, in $\\text{m s}^{-1}$? Leave a logarithm in.`
          : `A rocket with exhaust speed ${ms(p.u)} burns fuel until its mass is $\\frac{1}{${p.R}}$ of what it started with. Far from any planet, how much speed does it gain, in $\\text{m s}^{-1}$? Leave a logarithm in.`,
      ),
    ],
    lead: '\\Delta v =',
    keypad: LN_KEYS,
    answer: `${p.u}*ln(${p.R})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => [
    ...(p.masses ? [{ tex: `\\frac{m_{0}}{m_{1}} = \\frac{${p.R * p.m1}}{${p.m1}} = ${p.R}` }] : []),
    { tex: `\\Delta v = ${p.u}\\ln ${p.R}` },
  ],
  choices: (p) => {
    const as = (tex: string, answer: string): Omit<ChoiceOption, 'correct'> => ({ tex, answer });
    const right = as(`${p.u}\\ln ${p.R}`, `${p.u}*log(${p.R})`);
    const wrong = [
      as(`${p.u * p.R}`, `${p.u * p.R}`),
      as(`\\frac{${p.u}}{${p.R}}`, `${p.u}/${p.R}`),
      as(`${p.u}\\ln ${p.R + 1}`, `${p.u}*log(${p.R + 1})`),
      as(`${p.R}\\ln ${p.u}`, `${p.R}*log(${p.u})`),
    ];
    return steered(options(right, ...wrong.slice(0, 3)), salted(p.u, p.R, p.m1), wrong.slice(3));
  },
};

interface ThrustParams {
  u: number;
  /** Fuel burnt per second, kg. */
  rate: number;
  /** Mass at lift-off, kg. */
  m: number;
  hard: boolean;
}

const thrustOf = ({ u, rate }: ThrustParams): number => u * rate;
const liftAccel = (p: ThrustParams): number => n3((thrustOf(p) - 9.8 * p.m) / p.m);

const sampleThrust = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }, hard: boolean): ThrustParams =>
  until(
    () => ({ u: 500 * rng.int(2, 8), rate: rng.int(1, 40), m: 50 * rng.int(1, 60), hard }),
    (p) => liftAccel(p) > 0.5 && exact(liftAccel(p), 3) && liftAccel(p) < 60,
  );

/** Expression: thrust u times the rate fuel is burnt (easy), or the acceleration at lift-off (hard). */
const rocketThrust: Generator<ThrustParams> = {
  id: 'clm-rocket-thrust',
  sample: (rng, difficulty) => sampleThrust(rng, difficulty > 1),
  render: (p) =>
    p.hard
      ? typed([say(`A ${kg(p.m)} rocket on the launch pad burns ${kg(p.rate)} of fuel a second, with exhaust speed ${ms(p.u)}. ${G_NOTE} What is its upward acceleration as it lifts off, in $\\text{m s}^{-2}$?`)], 'a =', liftAccel(p))
      : typed([say(`A rocket engine burns ${kg(p.rate)} of fuel a second and throws it out at ${ms(p.u)}. What thrust does it give, in newtons?`)], 'T =', thrustOf(p)),
  solution: (p) => [
    { text: 'Each second it gives $' + p.rate + '\\text{ kg}$ of exhaust a momentum of $' + p.rate + ' \\times ' + p.u + '$:' },
    { tex: `T = ${p.u} \\times ${p.rate} = ${thrustOf(p)}` },
    ...(p.hard ? [{ tex: `a = \\frac{${thrustOf(p)} - ${p.m} \\times 9.8}{${p.m}} = ${fmt(liftAccel(p))}` }] : []),
  ],
  choices: (p) =>
    p.hard
      ? numChoices(liftAccel(p), [n3(thrustOf(p) / p.m), n3((thrustOf(p) + 9.8 * p.m) / p.m), n3(liftAccel(p) * 2)], salted(p.u, p.rate, p.m))
      : numChoices(thrustOf(p), [n3(p.u / p.rate), p.u + p.rate, n3(thrustOf(p) / 9.8)], salted(p.u, p.rate)),
};

/** Flow: lift-off: the thrust, the force left after the weight, then the acceleration. */
const rocketFlow: Generator<ThrustParams> = {
  id: 'clm-rocket-flow',
  sample: (rng, difficulty) => sampleThrust(rng, difficulty > 1),
  render: (p) => {
    const T = thrustOf(p);
    const net = n3(T - 9.8 * p.m);
    const a = liftAccel(p);
    return {
      kind: 'flow',
      prompt: [say(`A ${kg(p.m)} rocket burns ${kg(p.rate)} of fuel a second, with exhaust speed ${ms(p.u)}. ${G_NOTE} What is its acceleration at lift-off?`)],
      subject: 'T = u\\frac{\\Delta m}{\\Delta t}',
      steps: [
        { id: 'T', ask: 'The thrust, in newtons:', branches: forks(T, [n3(p.u / p.rate), T * 2, p.u + p.rate], 100).map((label) => ({ label, to: 'net' })) },
        { id: 'net', ask: 'The force left over upwards, in newtons:', branches: forks(net, [n3(T + 9.8 * p.m), n3(T - p.m), T], 10).map((label) => ({ label, to: 'a' })) },
        { id: 'a', ask: 'So the acceleration, in $\\text{m s}^{-2}$:', branches: forks(a, [n3(T / p.m), n3(a + 9.8), n3(a / 2)], 0.5).map((label) => ({ label, outcome: 'As fuel burns the mass falls, so with the same thrust it accelerates harder and harder.' })) },
      ],
      answer: [`$${fmt(T)}$`, `$${fmt(net)}$`, `$${fmt(a)}$`],
    };
  },
  solution: (p) => [
    { tex: `T = ${p.u} \\times ${p.rate} = ${thrustOf(p)}` },
    { tex: `T - mg = ${thrustOf(p)} - ${fmt(9.8 * p.m)} = ${fmt(thrustOf(p) - 9.8 * p.m)}` },
    { tex: `a = \\frac{${fmt(thrustOf(p) - 9.8 * p.m)}}{${p.m}} = ${fmt(liftAccel(p))}` },
  ],
};

interface EngineRow {
  u: number;
  rate: number;
  blank: 'u' | 'rate' | 'T';
}

/** Table: exhaust speed, fuel burnt per second and thrust; easy blanks the thrust, hard any. */
const rocketTable: Generator<{ rows: EngineRow[] }> = {
  id: 'clm-rocket-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ rows: [0, 1, 2].map((): EngineRow => ({ u: 100 * rng.int(10, 45), rate: rng.int(2, 60), blank: difficulty > 1 ? rng.pick(['u', 'rate', 'T'] as const) : 'T' })) }),
      ({ rows }) => new Set(rows.map((r) => r.u * r.rate)).size === 3 && (difficulty < 2 || new Set(rows.map((r) => r.blank)).size > 1),
    ),
  render: ({ rows }) => {
    const value = (r: EngineRow) => (r.blank === 'u' ? r.u : r.blank === 'rate' ? r.rate : r.u * r.rate);
    const answer = rows.map(value);
    return {
      kind: 'table',
      prompt: [say('Each row is a rocket engine: exhaust speed $u$ in $\\text{m s}^{-1}$, fuel burnt per second $r$ in $\\text{kg s}^{-1}$, and thrust $T$ in newtons. Fill in the gaps.')],
      columns: ['u', 'r', 'T'],
      rows: rows.map((r) => [r.blank === 'u' ? null : fmt(r.u), r.blank === 'rate' ? null : fmt(r.rate), r.blank === 'T' ? null : fmt(r.u * r.rate)]),
      bank: tidyBank(answer, rows.flatMap((r) => [r.u + r.rate, n3(r.u / r.rate), 2 * value(r)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 'T' ? { tex: `T = ${r.u} \\times ${r.rate} = ${r.u * r.rate}` } : r.blank === 'u' ? { tex: `u = \\frac{${r.u * r.rate}}{${r.rate}} = ${r.u}` } : { tex: `r = \\frac{${r.u * r.rate}}{${r.u}} = ${r.rate}` },
    ),
};

/* ================================================================
 * Streams of particles and light
 * ================================================================ */

interface HailParams {
  what: string;
  where: string;
  /** Hits per second, mass each (kg), speed. */
  n: number;
  m: number;
  v: number;
  bounce: boolean;
}

const STREAMS = [
  { what: 'hailstones', where: 'on a flat roof', ms: [0.002, 0.004, 0.005] },
  { what: 'tennis balls from a machine', where: 'at a wall', ms: [0.05, 0.06] },
  { what: 'raindrops', where: 'on a car roof', ms: [0.0001, 0.0002] },
  { what: 'grains of sand', where: 'on a scale pan', ms: [0.001, 0.002] },
];

/** Expression: the steady force of a stream of hits, n m v a second, doubled when they bounce straight back. */
const streamForce: Generator<HailParams> = {
  id: 'clm-stream-force',
  sample: (rng, difficulty) =>
    until(
      () => {
        const s = rng.pick(STREAMS);
        return { what: s.what, where: s.where, n: rng.pick([10, 20, 40, 50, 100, 200, 250, 500, 1000]), m: rng.pick(s.ms), v: rng.int(4, 40), bounce: difficulty > 1 };
      },
      (p) => {
        const F = p.n * p.m * p.v * (p.bounce ? 2 : 1);
        return exact(F, 3) && F >= 0.1;
      },
    ),
  render: (p) =>
    typed(
      [
        say(
          `Every second ${p.n} ${p.what}, each of mass ${kg(p.m)}, land at ${ms(p.v)} ${p.where}. ${
            p.bounce ? 'Each bounces straight back at the same speed.' : 'Each stops dead.'
          } What steady force do they exert, in newtons?`,
        ),
      ],
      'F =',
      n3(p.n * p.m * p.v * (p.bounce ? 2 : 1)),
    ),
  solution: (p) => [
    { tex: `\\Delta p = ${p.bounce ? '2 \\times ' : ''}${fmt(p.m)} \\times ${p.v} = ${fmt(p.m * p.v * (p.bounce ? 2 : 1))}` },
    { text: 'Force is the momentum delivered each second:' },
    { tex: `F = ${p.n} \\times ${fmt(p.m * p.v * (p.bounce ? 2 : 1))} = ${fmt(p.n * p.m * p.v * (p.bounce ? 2 : 1))}` },
  ],
  choices: (p) => {
    const F = n3(p.n * p.m * p.v * (p.bounce ? 2 : 1));
    return numChoices(F, [p.bounce ? n3(F / 2) : n3(F * 2), n3(p.m * p.v), n3((p.n * p.m * p.v * p.v) / 2)], salted(p.n, p.m, p.v));
  },
};

interface GasParams {
  /** Moles, kelvin, volume in litres. Hard: T is left 0 and the pressure is given in whole kPa. */
  n: number;
  T: number;
  L: number;
  kPa: number;
  find: 'p' | 'T';
}

const R_GAS = 8.3;

/** A temperature worked out from a pressure is asked to 3 significant figures. */
const T_SF: Precision = { sf: 3 };

/** Kelvin from a pressure in kPa, unrounded. */
const gasT = ({ n, L, kPa }: Pick<GasParams, 'n' | 'L' | 'kPa'>): number => (kPa * L) / (n * R_GAS);

/** Tree: the ideal gas law pV = nRT: nRT, the volume in m^3, then the pressure (easy) or from a pressure, the temperature (hard). */
const gasTree: Generator<GasParams> = {
  id: 'clm-gas-tree',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? until(
          () => {
            const n = rng.pick([0.5, 1, 2, 3, 4, 5]);
            const L = rng.pick([1, 2, 4, 5, 8, 10, 20, 25, 40, 50]);
            // A pressure a textbook would print, whole kPa, near what the gas has somewhere from 250 K to 500 K.
            const kPa = Math.round((n * R_GAS * rng.int(250, 500)) / L);
            return { n, T: 0, L, kPa, find: 'T' as const };
          },
          (p) => p.kPa >= 20 && gasT(p) >= 250 && gasT(p) <= 500 && roundedWell(gasT(p), T_SF),
        )
      : until(
          () => ({ n: rng.pick([0.5, 1, 2, 3, 4, 5]), T: 10 * rng.int(25, 50), L: rng.pick([1, 2, 4, 5, 8, 10, 20, 25, 40, 50]), kPa: 0, find: 'p' as const }),
          (p) => exact((p.n * R_GAS * p.T) / (p.L / 1000) / 1000, 3),
        ),
  render: (p) => {
    const V = n3(p.L / 1000);
    if (p.find === 'T') {
      const pV = p.kPa * p.L;
      const T = gasT(p);
      return {
        kind: 'tree',
        prompt: [
          say(`${fmt(p.n)} moles of gas fill ${fmt(p.L)} litre${p.L === 1 ? '' : 's'} at a pressure of $${fmt(p.kPa)}\\text{ kPa}$. Take $R = ${R_GAS}\\text{ J mol}^{-1}\\text{ K}^{-1}$.`),
          say(`Find the volume in $\\text{m}^{3}$, $pV$ in joules, then the temperature in kelvin ${precisionWords(T_SF)}.`),
        ],
        expression: 'pV = nRT',
        nodes: [
          { id: 'V', from: [] },
          { id: 'pV', from: ['V'] },
          { id: 'T', from: ['pV'] },
        ],
        bank: tidyBank([V, pV, roundTo(T, T_SF)], [p.L, roundTo(T - 273, T_SF), roundTo(pV / R_GAS, T_SF), roundTo(T / 2, T_SF)]),
        answer: [fmt(V), fmt(pV), fixed(T, T_SF)],
      };
    }
    const nRT = n3(p.n * R_GAS * p.T);
    const kPa = n3(nRT / V / 1000);
    return {
      kind: 'tree',
      prompt: [say(`${fmt(p.n)} moles of gas at ${p.T} K fill ${fmt(p.L)} litre${p.L === 1 ? '' : 's'}. Take $R = ${R_GAS}\\text{ J mol}^{-1}\\text{ K}^{-1}$.`), say('Find $nRT$ in joules, the volume in $\\text{m}^{3}$, then the pressure in kPa.')],
      expression: 'pV = nRT',
      nodes: [
        { id: 'nRT', from: [] },
        { id: 'V', from: [] },
        { id: 'p', from: ['nRT', 'V'] },
      ],
      bank: tidyBank([nRT, V, kPa], [n3(nRT / p.L), p.L, n3(kPa * 1000)]),
      answer: [nRT, V, kPa].map(fmt),
    };
  },
  solution: (p) => {
    const V = p.L / 1000;
    if (p.find === 'T') {
      const pV = p.kPa * p.L;
      return [
        { tex: `V = ${p.L} \\div 1000 = ${fmt(V)}` },
        { tex: `pV = ${fmt(p.kPa * 1000)} \\times ${fmt(V)} = ${fmt(pV)}` },
        { tex: `T = \\frac{${fmt(pV)}}{${fmt(p.n)} \\times ${R_GAS}} = ${dots(gasT(p), 2)}` },
        { text: 'To 3 significant figures:' },
        { tex: `T = ${fixed(gasT(p), T_SF)}` },
      ];
    }
    const nRT = p.n * R_GAS * p.T;
    return [{ tex: `nRT = ${fmt(p.n)} \\times ${R_GAS} \\times ${p.T} = ${fmt(nRT)}` }, { tex: `V = ${p.L} \\div 1000 = ${fmt(V)}` }, { tex: `p = \\frac{${fmt(nRT)}}{${fmt(V)}} = ${fmt(nRT / V)}\\text{ Pa}` }, { tex: `p = ${fmt(nRT / V / 1000)}\\text{ kPa}` }];
  },
};

interface LightParams {
  /** Power in watts, a multiple of 300 so the force is whole micronewtons. */
  P: number;
  mirror: boolean;
  what: string;
}

/** Expression: the push of light, P/c absorbed or 2P/c reflected, in micronewtons with c = 3 x 10^8. */
const lightForce: Generator<LightParams> = {
  id: 'clm-light-force',
  sample: (rng, difficulty) => ({ P: 150 * rng.int(1, 40), mirror: difficulty > 1, what: rng.pick(['laser beam', 'searchlight', 'beam of sunlight', 'light beam']) }),
  render: (p) =>
    typed(
      [say(`A ${p.what} of power ${`$${p.P}\\text{ W}$`} shines straight onto ${p.mirror ? 'a mirror, which reflects it straight back' : 'a black plate, which absorbs it'}. Light of energy $E$ carries momentum $\\frac{E}{c}$, with $c = 3 \\times 10^{8}\\text{ m s}^{-1}$. What force does it exert, in micronewtons?`)],
      'F =',
      n3(((p.mirror ? 2 : 1) * p.P) / 300),
    ),
  solution: (p) => [
    { text: 'Each second it delivers momentum $\\frac{P}{c}$' + (p.mirror ? ', and reflecting sends it back, so twice that:' : ':') },
    { tex: `F = \\frac{${p.mirror ? '2 \\times ' : ''}${p.P}}{3 \\times 10^{8}} = ${fmt(((p.mirror ? 2 : 1) * p.P) / 300)} \\times 10^{-6}` },
  ],
  choices: (p) => {
    const F = n3(((p.mirror ? 2 : 1) * p.P) / 300);
    return numChoices(F, [p.mirror ? n3(F / 2) : n3(F * 2), n3(p.P / 3), n3(F * 1000)], salted(p.P, p.mirror ? 1 : 0));
  },
};

interface SailParams {
  /** Sunlight in W/m^2, sail area in m^2, craft mass in kg. */
  I: number;
  A: number;
  m: number;
}

/** Flow: a solar sail: the power on it, the force of the reflected light in micronewtons, then the acceleration in mm/s^2. */
const sailFlow: Generator<SailParams> = {
  id: 'clm-sail-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({ I: rng.pick([1200, 1350, 1500, 900, 600]), A: rng.pick(difficulty > 1 ? [100, 200, 250, 400, 500, 1000, 1500, 2000] : [100, 200, 500, 1000]), m: rng.pick([1, 2, 4, 5, 10, 20, 25, 50]) }),
      (p) => exact((2 * p.I * p.A) / 300, 3) && exact((2 * p.I * p.A) / 300 / p.m / 1000, 3),
    ),
  render: (p) => {
    const P = p.I * p.A;
    const F = n3((2 * P) / 300);
    const a = n3(F / p.m / 1000);
    return {
      kind: 'flow',
      prompt: [say(`A solar sail of area $${p.A}\\text{ m}^{2}$ faces sunlight of $${p.I}\\text{ W m}^{-2}$ and reflects it all straight back. The craft's mass is ${kg(p.m)}; $c = 3 \\times 10^{8}\\text{ m s}^{-1}$. What is its acceleration?`)],
      subject: 'F = \\frac{2P}{c}',
      steps: [
        { id: 'P', ask: 'The power of the light on the sail, in watts:', branches: forks(P, [p.I + p.A, n3(P / 2), P * 2], 100).map((label) => ({ label, to: 'F' })) },
        { id: 'F', ask: 'The force, in micronewtons:', branches: forks(F, [n3(F / 2), n3(F * 10), n3(F * 2)], 10).map((label) => ({ label, to: 'a' })) },
        { id: 'a', ask: 'So the acceleration, in $\\text{mm s}^{-2}$:', branches: forks(a, [n3(a / 2), n3(a * 10), n3(a * 2)], 0.1).map((label) => ({ label, outcome: 'Tiny, but it never stops: after a year it has added kilometres a second.' })) },
      ],
      answer: [`$${fmt(P)}$`, `$${fmt(F)}$`, `$${fmt(a)}$`],
    };
  },
  solution: (p) => {
    const P = p.I * p.A;
    const F = (2 * P) / 300;
    return [
      { tex: `P = ${p.I} \\times ${p.A} = ${P}` },
      { tex: `F = \\frac{2 \\times ${P}}{3 \\times 10^{8}} = ${fmt(F)} \\times 10^{-6}` },
      { tex: `a = \\frac{${fmt(F)} \\times 10^{-6}}{${p.m}} = ${fmt(F / p.m / 1000)} \\times 10^{-3}` },
    ];
  },
};

export const classicalMomentumGenerators = [
  impulseArea,
  impulseTree,
  avgForce,
  peakSlider,
  bounceHeight,
  restitution,
  bounceTree,
  collisionFlow,
  momentumTable,
  mergeTree,
  glanceTree,
  mergeAngle,
  rocketDv,
  rocketThrust,
  rocketFlow,
  rocketTable,
  streamForce,
  gasTree,
  lightForce,
  sailFlow,
];

export const classicalMomentumInternals = { impulseOf, afterA, afterB, pulseSvg, newtons };
