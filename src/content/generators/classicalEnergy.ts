/**
 * Classical Mechanics, level 4: Energy (`clm-l4`).
 *
 * Springs and elastic energy, after OpenStax University Physics 7.1 and 8.1;
 * energy carried between springs, heights and speeds, after 8.3; loops and
 * vertical circles, after 8.3 with 6.3; potential energy diagrams, after 8.4;
 * and power, efficiency and batteries, after 7.4 and College Physics 7.6.
 * Forces and Newton's Laws already has work, kinetic and gravitational
 * energy and P = Fv, so those are used, not taught again.
 *
 * With g = 9.8 the tidy cases are chosen, never rounded: a speed 7j squared
 * is 49j^2 = 19.6 x 2.5j^2, so a drop of 2.5j^2 metres gives a whole speed,
 * and the least speed at the top of a loop of radius 5j^2 is 7j.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { steered } from './parametricImplicit';
import {
  G_NOTE,
  exact,
  fmt,
  forks,
  kg,
  metres,
  ms,
  newtons,
  numChoices,
  salted,
  say,
  typed,
  until,
  valueBank,
} from './classicalKit';

const tidyBank = (answer: number[], wrong: number[], spare = 3): string[] =>
  valueBank(
    answer,
    wrong.filter((v) => v > 0 && exact(v, 3)),
    spare,
  );

const n3 = (v: number): number => Number(v.toFixed(6));

const joules = (v: number): string => `$${fmt(v)}\\text{ J}$`;
const npm = (v: number): string => `$${fmt(v)}\\text{ N m}^{-1}$`;
const cm = (v: number): string => `$${fmt(v)}\\text{ cm}$`;
const watts = (v: number): string => `$${fmt(v)}\\text{ W}$`;

/* ================================================================
 * Elastic energy
 * ================================================================ */

const SPRINGS = ['spring', 'bungee cord', 'car suspension spring', 'trampoline spring', 'catapult band'];

interface HookeParams {
  what: string;
  /** Stiffness in N/m. */
  k: number;
  /** Stretch in centimetres. */
  x: number;
  find: 'F' | 'x';
}

/** Expression: Hooke's law F = kx, the force for a stretch in centimetres (easy) or the stretch for a force (hard). */
const hooke: Generator<HookeParams> = {
  id: 'clm-hooke',
  sample: (rng, difficulty) =>
    until(
      () => ({ what: rng.pick(SPRINGS), k: 10 * rng.int(2, 120), x: rng.int(1, 40), find: difficulty > 1 ? ('x' as const) : ('F' as const) }),
      (p) => exact((p.k * p.x) / 100, 2),
    ),
  render: (p) => {
    const F = n3((p.k * p.x) / 100);
    return p.find === 'F'
      ? typed([say(`A ${p.what} of stiffness ${npm(p.k)} is stretched by ${cm(p.x)}. What force is it pulling back with, in newtons?`)], 'F =', F)
      : typed([say(`A ${p.what} of stiffness ${npm(p.k)} is pulled with ${newtons(F)}. How far does it stretch, in centimetres?`)], 'x =', p.x);
  },
  solution: (p) => {
    const F = n3((p.k * p.x) / 100);
    return p.find === 'F'
      ? [{ tex: `x = ${p.x} \\div 100 = ${fmt(p.x / 100)}` }, { tex: `F = ${p.k} \\times ${fmt(p.x / 100)} = ${fmt(F)}` }]
      : [{ tex: `x = \\frac{${fmt(F)}}{${p.k}} = ${fmt(p.x / 100)}\\text{ m}` }, { tex: `x = ${p.x}\\text{ cm}` }];
  },
  choices: (p) => {
    const F = n3((p.k * p.x) / 100);
    return p.find === 'F' ? numChoices(F, [p.k * p.x, n3(F / 2), n3(p.k / p.x)], salted(p.k, p.x)) : numChoices(p.x, [n3(p.x / 100), p.x * 10, n3(p.x * 2)], salted(p.k, p.x, 1));
  },
};

interface StoreParams {
  what: string;
  k: number;
  /** Stretch in centimetres. */
  x: number;
  /** Hard: given the force at that stretch, not the stiffness. */
  fromForce: boolean;
}

const stored = ({ k, x }: StoreParams): number => n3(0.5 * k * (x / 100) ** 2);

/** Expression: energy stored in a stretched spring, 1/2 kx^2 (easy) or 1/2 Fx from the force at that stretch (hard). */
const springEnergy: Generator<StoreParams> = {
  id: 'clm-spring-energy',
  sample: (rng, difficulty) =>
    until(
      () => ({ what: rng.pick(SPRINGS), k: 10 * rng.int(2, 200), x: rng.int(2, 50), fromForce: difficulty > 1 }),
      (p) => exact(stored(p), 3) && exact((p.k * p.x) / 100, 2) && stored(p) >= 0.1,
    ),
  render: (p) =>
    p.fromForce
      ? typed(
          [say(`A ${p.what} needs ${newtons(n3((p.k * p.x) / 100))} to hold it stretched by ${cm(p.x)}. How much energy does it store, in joules?`)],
          'E =',
          stored(p),
        )
      : typed([say(`A ${p.what} of stiffness ${npm(p.k)} is stretched by ${cm(p.x)}. How much energy does it store, in joules?`)], 'E =', stored(p)),
  solution: (p) =>
    p.fromForce
      ? [{ text: 'The force grows steadily from nothing, so the work done is the average force times the stretch:' }, { tex: `E = \\tfrac{1}{2} \\times ${fmt((p.k * p.x) / 100)} \\times ${fmt(p.x / 100)} = ${fmt(stored(p))}` }]
      : [{ tex: `x = ${fmt(p.x / 100)}` }, { tex: `E = \\tfrac{1}{2} \\times ${p.k} \\times ${fmt(p.x / 100)}^{2} = ${fmt(stored(p))}` }],
  choices: (p) => {
    const E = stored(p);
    return numChoices(E, [n3(2 * E), n3(0.5 * p.k * (p.x / 100)), n3(0.5 * p.k * p.x * p.x)], salted(p.k, p.x));
  },
};

interface StretchParams {
  what: string;
  k: number;
  /** The stretch, in steps of 0.02 m. */
  steps: number;
}

const STRETCH_MAX = 1;

/** Slider: the stretch that stores a given energy, x = sqrt(2E/k). */
const springSlider: Generator<StretchParams> = {
  id: 'clm-spring-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({ what: rng.pick(SPRINGS), k: difficulty > 1 ? 5 * rng.int(4, 200) : 50 * rng.int(1, 20), steps: rng.int(3, 50) }),
      // The energy is printed, so it must be one a textbook would: whole or one decimal place.
      (p) => exact(0.5 * p.k * (0.02 * p.steps) ** 2, 1),
    ),
  render: (p) => {
    const x = n3(0.02 * p.steps);
    const E = n3(0.5 * p.k * x * x);
    const W = 280;
    const PAD = 14;
    const X = (v: number) => (PAD + (v / STRETCH_MAX) * (W - 2 * PAD)).toFixed(1);
    const coils = Array.from({ length: 11 }, (_, i) => `${X((i / 10) * 0.12)},${i % 2 ? 22 : 38}`).join(' ');
    const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1]
      .map((v) => `<line x1="${X(v)}" y1="52" x2="${X(v)}" y2="58" stroke="currentColor" opacity="0.5"/><text x="${X(v)}" y="72" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">${fmt(v)}</text>`)
      .join('');
    const svg =
      `<svg viewBox="0 0 ${W} 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A spring fixed at the left, with a scale of stretch in metres">` +
      `<line x1="${PAD}" y1="12" x2="${PAD}" y2="48" stroke="currentColor" stroke-width="3"/>` +
      `<polyline points="${coils}" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>` +
      `<line x1="${PAD}" y1="52" x2="${W - PAD}" y2="52" stroke="currentColor" stroke-width="1.5"/>` +
      ticks +
      `</svg>`;
    const over = (PAD * STRETCH_MAX) / (W - 2 * PAD);
    return {
      kind: 'slider',
      prompt: [say(`A ${p.what} of stiffness ${npm(p.k)} must store ${joules(E)}. Slide to the stretch it needs, in metres.`)],
      min: 0,
      max: STRETCH_MAX,
      step: 0.02,
      answer: x,
      readout: 'x = {v}',
      figure: { svg, xMin: -over, xMax: STRETCH_MAX + over, axis: 'x' },
    };
  },
  solution: (p) => {
    const x = n3(0.02 * p.steps);
    const E = n3(0.5 * p.k * x * x);
    return [{ tex: `x^{2} = \\frac{2 \\times ${fmt(E)}}{${p.k}} = ${fmt(x * x)}` }, { tex: `x = ${fmt(x)}` }];
  },
};

interface SpringRow {
  k: number;
  /** Stretch in metres, tenths or twentieths. */
  x: number;
  blank: 'k' | 'F';
}

/** Table: stiffness, stretch, force and stored energy; the energy is always blank, and the force (easy) or the stiffness (hard). */
const springTable: Generator<{ rows: SpringRow[] }> = {
  id: 'clm-spring-table',
  sample: (rng, difficulty) =>
    until(
      () => ({
        rows: [0, 1, 2].map((): SpringRow => ({ k: 20 * rng.int(1, 30), x: rng.pick([0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5]), blank: difficulty > 1 ? 'k' : 'F' })),
      }),
      ({ rows }) => new Set(rows.map((r) => fmt(r.k * r.x))).size === 3 && rows.every((r) => exact(0.5 * r.k * r.x * r.x, 3)),
    ),
  render: ({ rows }) => {
    const F = (r: SpringRow) => n3(r.k * r.x);
    const E = (r: SpringRow) => n3(0.5 * r.k * r.x * r.x);
    const answer = rows.flatMap((r) => [r.blank === 'k' ? r.k : F(r), E(r)]);
    return {
      kind: 'table',
      prompt: [say('Each row is a spring of stiffness $k$ in $\\text{N m}^{-1}$ stretched by $x$ metres. Fill in the gaps: the force $F$ in newtons and the energy stored $E$ in joules.')],
      columns: ['k', 'x', 'F', 'E'],
      rows: rows.map((r) => [r.blank === 'k' ? null : fmt(r.k), fmt(r.x), r.blank === 'F' ? null : fmt(F(r)), null]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3(r.k * r.x * r.x), n3(0.5 * r.k * r.x), n3(F(r) / r.x / r.x)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.flatMap((r): SolutionStep[] => [
      r.blank === 'k' ? { tex: `k = \\frac{${fmt(r.k * r.x)}}{${fmt(r.x)}} = ${r.k}` } : { tex: `F = ${r.k} \\times ${fmt(r.x)} = ${fmt(r.k * r.x)}` },
      { tex: `E = \\tfrac{1}{2} \\times ${fmt(r.k * r.x)} \\times ${fmt(r.x)} = ${fmt(0.5 * r.k * r.x * r.x)}` },
    ]),
};

/* ================================================================
 * Springs and heights
 * ================================================================ */

const COMPRESS = [0.05, 0.1, 0.14, 0.2, 0.25, 0.28, 0.35, 0.4, 0.5, 0.7];

interface LaunchParams {
  /** Mass in kilograms. */
  m: number;
  /** Launch speed 7j. */
  j: number;
  /** Compression in metres. */
  x: number;
}

const launchEnergy = ({ m, j }: LaunchParams): number => n3(24.5 * m * j * j);
const launchK = (p: LaunchParams): number => n3((2 * launchEnergy(p)) / (p.x * p.x));

const sampleLaunch = (rng: Rng, hard: boolean): LaunchParams =>
  until(
    () => ({ m: hard ? rng.pick([0.02, 0.05, 0.1, 0.2, 0.25, 0.4, 0.5]) : rng.pick([0.1, 0.2, 0.5, 1, 2]), j: rng.int(1, hard ? 4 : 3), x: rng.pick(COMPRESS) }),
    // The stiffness is printed, so it must be a round one (a multiple of 50), never a 627.2 worked back from the speed.
    (p) => Number.isInteger(n3(launchK(p) / 50)) && launchK(p) >= 50 && launchK(p) <= 20000,
  );

/** Tree: a spring pops a ball straight up: the energy stored, the launch speed and the height reached. */
const launchTree: Generator<LaunchParams> = {
  id: 'clm-launch-tree',
  sample: (rng, difficulty) => sampleLaunch(rng, difficulty > 1),
  render: (p) => {
    const E = launchEnergy(p);
    const v = 7 * p.j;
    const h = n3(2.5 * p.j * p.j);
    return {
      kind: 'tree',
      prompt: [
        say(`A toy's spring of stiffness ${npm(launchK(p))} is squashed by ${metres(p.x)} and fires a ${kg(p.m)} ball straight up. ${G_NOTE}`),
        say('Find the energy stored, the speed the ball leaves at, and how high it rises above that point.'),
      ],
      expression: '\\tfrac{1}{2}kx^{2} = \\tfrac{1}{2}mv^{2} = mgh',
      nodes: [
        { id: 'E', from: [] },
        { id: 'v', from: ['E'] },
        { id: 'h', from: ['E'] },
      ],
      bank: tidyBank([E, v, h], [n3(2 * E), n3(49 * p.j * p.j), n3(5 * p.j * p.j), n3(E / p.m)]),
      answer: [E, v, h].map(fmt),
    };
  },
  solution: (p) => {
    const E = launchEnergy(p);
    return [
      { tex: `E = \\tfrac{1}{2} \\times ${fmt(launchK(p))} \\times ${fmt(p.x)}^{2} = ${fmt(E)}` },
      { tex: `v^{2} = \\frac{2 \\times ${fmt(E)}}{${fmt(p.m)}} = ${49 * p.j * p.j}` },
      { tex: `v = ${7 * p.j}` },
      { tex: `h = \\frac{${fmt(E)}}{${fmt(p.m)} \\times 9.8} = ${fmt(2.5 * p.j * p.j)}` },
    ];
  },
};

interface RampParams {
  /** Speeds are 7a at the top and 7c at the bottom; the drop is 2.5(c^2 - a^2). */
  a: number;
  c: number;
  thing: string;
}

const RIDERS = ['skateboarder', 'sledge', 'roller coaster car', 'crate', 'toy car', 'skier'];
const drop = ({ a, c }: RampParams): number => n3(2.5 * (c * c - a * a));

/** Expression: the speed at the bottom of a smooth slope, from rest (easy) or already moving (hard). */
const rampSpeed: Generator<RampParams> = {
  id: 'clm-ramp-speed',
  sample: (rng, difficulty) =>
    until(
      () => ({ a: difficulty > 1 ? rng.int(1, 5) : 0, c: rng.int(1, 9), thing: rng.pick(RIDERS) }),
      (p) => p.c > p.a && drop(p) <= 150,
    ),
  render: (p) =>
    typed(
      [
        say(
          p.a === 0
            ? `A ${p.thing} starts from rest and runs down a smooth slope, dropping ${metres(drop(p))}. ${G_NOTE} How fast is it going at the bottom, in $\\text{m s}^{-1}$?`
            : `A ${p.thing} is moving at ${ms(7 * p.a)} at the top of a smooth slope and drops ${metres(drop(p))}. ${G_NOTE} How fast is it going at the bottom, in $\\text{m s}^{-1}$?`,
        ),
      ],
      'v =',
      7 * p.c,
    ),
  solution: (p) => [
    { text: 'The mass cancels from $\\tfrac{1}{2}mv^{2} = \\tfrac{1}{2}mu^{2} + mgh$:' },
    { tex: `v^{2} = ${p.a === 0 ? '' : `${7 * p.a}^{2} + `}2 \\times 9.8 \\times ${fmt(drop(p))}` },
    { tex: `v^{2} = ${49 * p.c * p.c}` },
    { tex: `v = ${7 * p.c}` },
  ],
  choices: (p) => numChoices(7 * p.c, [49 * p.c * p.c, n3(7 * p.a + Math.sqrt(19.6 * drop(p))), n3(9.8 * drop(p))], salted(p.a, p.c)),
};

interface BumperParams {
  m: number;
  /** Speed at the bottom 7j, from a drop of 2.5j^2. */
  j: number;
  /** Compression of the buffer spring, metres. */
  x: number;
}

const bumperE = ({ m, j }: BumperParams): number => n3(24.5 * m * j * j);
const bumperK = (p: BumperParams): number => n3((2 * bumperE(p)) / (p.x * p.x));

/** Flow: a trolley runs down a smooth ramp into a buffer spring: the energy, the speed at the foot, then the squash. */
const bumperFlow: Generator<BumperParams> = {
  id: 'clm-bumper-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: difficulty > 1 ? rng.pick([2, 4, 5, 8, 10, 20, 25, 40, 50]) : rng.pick([1, 2, 4, 5, 10]), j: rng.int(1, 3), x: rng.pick(COMPRESS) }),
      (p) => exact(bumperK(p), 0) && bumperK(p) <= 100000,
    ),
  render: (p) => {
    const E = bumperE(p);
    const h = n3(2.5 * p.j * p.j);
    return {
      kind: 'flow',
      prompt: [say(`A ${kg(p.m)} trolley is let go from rest ${metres(h)} up a smooth ramp. At the foot it runs into a buffer spring of stiffness ${npm(bumperK(p))}. ${G_NOTE} How far does the spring squash?`)],
      subject: 'mgh = \\tfrac{1}{2}mv^{2} = \\tfrac{1}{2}kx^{2}',
      steps: [
        { id: 'E', ask: 'The energy it loses coming down, in joules:', branches: forks(E, [n3(p.m * h), n3(2 * E), n3(E / 2)], 1).map((label) => ({ label, to: 'v' })) },
        { id: 'v', ask: 'Its speed at the foot, in $\\text{m s}^{-1}$:', branches: forks(7 * p.j, [49 * p.j * p.j, 14 * p.j, n3(9.8 * p.j)], 1).map((label) => ({ label, to: 'x' })) },
        { id: 'x', ask: 'The squash of the spring when it stops, in metres:', branches: forks(p.x, [n3(p.x * p.x), n3(2 * p.x), n3(p.x / 2)], 0.01).map((label) => ({ label, outcome: 'All the energy from the drop ends up stored in the spring.' })) },
      ],
      answer: [`$${fmt(E)}$`, `$${7 * p.j}$`, `$${fmt(p.x)}$`],
    };
  },
  solution: (p) => {
    const E = bumperE(p);
    return [
      { tex: `E = ${p.m} \\times 9.8 \\times ${fmt(2.5 * p.j * p.j)} = ${fmt(E)}` },
      { tex: `v^{2} = \\frac{2 \\times ${fmt(E)}}{${p.m}} = ${49 * p.j * p.j}` },
      { tex: `v = ${7 * p.j}` },
      { tex: `x^{2} = \\frac{2 \\times ${fmt(E)}}{${fmt(bumperK(p))}} = ${fmt(p.x * p.x)}` },
      { tex: `x = ${fmt(p.x)}` },
    ];
  },
};

interface TrackPoint {
  /** Speed there is 7a. */
  a: number;
  blank: 'h' | 'v';
}

interface TrackParams {
  /** The car starts from rest at a height 2.5c^2. */
  c: number;
  points: TrackPoint[];
}

/** Table: a car let go on a smooth track: heights and speeds along it; easy blanks the speeds, hard some heights. */
const trackTable: Generator<TrackParams> = {
  id: 'clm-track-table',
  sample: (rng, difficulty) =>
    until(
      () => {
        const c = rng.int(3, 8);
        return { c, points: [0, 1, 2].map((): TrackPoint => ({ a: rng.int(1, c), blank: difficulty > 1 ? rng.pick(['h', 'v'] as const) : 'v' })) };
      },
      ({ points }) => new Set(points.map((pt) => pt.a)).size === 3 && (difficulty < 2 || points.some((pt) => pt.blank === 'h')),
    ),
  render: ({ c, points }) => {
    const H = n3(2.5 * c * c);
    const h = (pt: TrackPoint) => n3(H - 2.5 * pt.a * pt.a);
    const answer = points.map((pt) => (pt.blank === 'h' ? h(pt) : 7 * pt.a));
    return {
      kind: 'table',
      prompt: [say(`A roller coaster car is let go from rest ${metres(H)} up a smooth track. Fill in its height $h$ in metres and speed $v$ in $\\text{m s}^{-1}$ at three points. ${G_NOTE}`)],
      columns: ['h', 'v'],
      rows: points.map((pt) => [pt.blank === 'h' ? null : fmt(h(pt)), pt.blank === 'v' ? null : fmt(7 * pt.a)]),
      bank: tidyBank(answer, points.flatMap((pt) => (pt.blank === 'v' ? [49 * pt.a * pt.a, n3(9.8 * pt.a)] : [n3(2.5 * pt.a * pt.a), n3(H - 5 * pt.a * pt.a)]))),
      answer: answer.map(fmt),
    };
  },
  solution: ({ c, points }) => [
    { text: 'Each metre it drops turns $9.8\\text{ J}$ per kilogram into kinetic energy, so the mass cancels:' },
    { tex: 'v^{2} = 2g(H - h)' },
    ...points.map((pt): SolutionStep =>
      pt.blank === 'v'
        ? { tex: `v^{2} = 19.6 \\times ${fmt(2.5 * pt.a * pt.a)} = ${49 * pt.a * pt.a}, \\quad v = ${7 * pt.a}` }
        : { tex: `H - h = \\frac{${7 * pt.a}^{2}}{19.6} = ${fmt(2.5 * pt.a * pt.a)}, \\quad h = ${fmt(2.5 * c * c - 2.5 * pt.a * pt.a)}` },
    ),
  ],
};

/* ================================================================
 * Loops and vertical circles
 * ================================================================ */

interface LoopTopParams {
  /** Radius 5j^2 so the least speed at the top is 7j. */
  j: number;
  find: 'v' | 'h';
  ride: string;
}

const RIDES = ['a roller coaster loop', 'a toy car track loop', 'a marble run loop', 'a stunt track loop'];

/** Expression: the least speed at the top of a loop, v^2 = gr (easy), or the least start height on a smooth track, 2.5r (hard). */
const loopTop: Generator<LoopTopParams> = {
  id: 'clm-loop-top',
  sample: (rng, difficulty) => ({ j: rng.int(1, 8), find: difficulty > 1 ? 'h' : 'v', ride: rng.pick(RIDES) }),
  render: (p) => {
    const r = 5 * p.j * p.j;
    return p.find === 'v'
      ? typed([say(`At the top of ${p.ride} of radius ${metres(r)}, what is the least speed that keeps the car on the track, in $\\text{m s}^{-1}$? ${G_NOTE}`)], 'v =', 7 * p.j)
      : typed(
          [say(`A car is let go from rest on a smooth track that runs down into ${p.ride} of radius ${metres(r)}. ${G_NOTE} From what least height above the bottom of the loop must it start to get round, in metres?`)],
          'h =',
          n3(2.5 * r),
        );
  },
  solution: (p) => {
    const r = 5 * p.j * p.j;
    return p.find === 'v'
      ? [{ text: 'At the least speed the track just stops pushing, so the weight alone turns it:' }, { tex: `mg = \\frac{mv^{2}}{r}` }, { tex: `v^{2} = 9.8 \\times ${r} = ${49 * p.j * p.j}` }, { tex: `v = ${7 * p.j}` }]
      : [
          { text: 'At the top it needs $v^{2} = gr$, and it is $2r$ up. Energy from the start:' },
          { tex: 'mgh = mg(2r) + \\tfrac{1}{2}mgr' },
          { tex: `h = 2.5r = 2.5 \\times ${r} = ${fmt(2.5 * r)}` },
        ];
  },
  choices: (p) => {
    const r = 5 * p.j * p.j;
    return p.find === 'v' ? numChoices(7 * p.j, [49 * p.j * p.j, 14 * p.j, n3(9.8 * r)], salted(p.j)) : numChoices(n3(2.5 * r), [2 * r, 3 * r, r], salted(p.j, 2));
  },
};

interface LoopParams {
  m: number;
  r: number;
  /** Start height above the bottom of the loop, above 2.5r. */
  h: number;
}

const topSpeedSq = ({ r, h }: LoopParams): number => n3(19.6 * (h - 2 * r));
const topPush = (p: LoopParams): number => n3(p.m * (topSpeedSq(p) / p.r - 9.8));

/** Tree: let go on a smooth loop track: the speed squared at the bottom and the top, and the push of the track at the top. */
const loopTree: Generator<LoopParams> = {
  id: 'clm-loop-tree',
  sample: (rng, difficulty) =>
    until(
      () => {
        const r = rng.pick(difficulty > 1 ? [2, 2.5, 4, 5, 8, 10] : [2, 4, 5, 10]);
        // A start height in half metres above the least 2.5r, so never 7.25 m.
        return { m: rng.pick(difficulty > 1 ? [0.2, 0.5, 2, 50, 200, 500] : [1, 2, 5, 10]), r, h: n3(0.5 * (Math.floor(5 * r) + rng.int(1, 16))) };
      },
      (p) => exact(topPush(p), 2) && topPush(p) > 0,
    ),
  render: (p) => {
    const bottom = n3(19.6 * p.h);
    const top = topSpeedSq(p);
    const push = topPush(p);
    return {
      kind: 'tree',
      prompt: [
        say(`A ${kg(p.m)} car is let go from rest ${metres(p.h)} above the bottom of a smooth loop of radius ${metres(p.r)}. ${G_NOTE}`),
        say('Find $v^{2}$ at the bottom and at the top of the loop, then the push of the track on the car at the top, in newtons.'),
      ],
      expression: 'R + mg = \\frac{mv^{2}}{r}',
      nodes: [
        { id: 'v_{\\text{bottom}}^{2}', from: [] },
        { id: 'v_{\\text{top}}^{2}', from: ['v_{\\text{bottom}}^{2}'] },
        { id: 'R', from: ['v_{\\text{top}}^{2}'] },
      ],
      bank: tidyBank([bottom, top, push], [n3(19.6 * (p.h - p.r)), n3(p.m * (top / p.r + 9.8)), n3((p.m * top) / p.r)]),
      answer: [bottom, top, push].map(fmt),
    };
  },
  solution: (p) => [
    { tex: `v_{\\text{bottom}}^{2} = 2 \\times 9.8 \\times ${fmt(p.h)} = ${fmt(19.6 * p.h)}` },
    { text: `The top is $${fmt(2 * p.r)}\\text{ m}$ up, so` },
    { tex: `v_{\\text{top}}^{2} = ${fmt(19.6 * p.h)} - 2 \\times 9.8 \\times ${fmt(2 * p.r)} = ${fmt(topSpeedSq(p))}` },
    { text: 'At the top both the push and the weight point down, towards the centre:' },
    { tex: `R = ${fmt(p.m)} \\times \\frac{${fmt(topSpeedSq(p))}}{${fmt(p.r)}} - ${fmt(p.m)} \\times 9.8 = ${fmt(topPush(p))}` },
  ],
};

interface LoopMakeParams {
  r: number;
  /** Start height in half metres, never exactly 2.5r. */
  halves: number;
}

const MAKES = 'Yes, it gets round';
const FALLS = 'No, it leaves the track';

/** Flow: does a car let go at a height get round a loop? v^2 at the top against the gr it needs. */
const loopFlow: Generator<LoopMakeParams> = {
  id: 'clm-loop-flow',
  sample: (rng, difficulty) =>
    until(
      () => {
        const r = rng.pick(difficulty > 1 ? [2, 2.5, 3, 4, 5, 6, 8] : [2, 4, 5, 10]);
        return { r, halves: rng.int(4 * r + 1, 6 * r + 4) };
      },
      (p) => p.halves / 2 !== 2.5 * p.r && p.halves / 2 > 2 * p.r,
    ),
  render: (p) => {
    const h = p.halves / 2;
    const top = n3(19.6 * (h - 2 * p.r));
    const need = n3(9.8 * p.r);
    const why = 'At the top the weight alone would turn it at $v^{2} = gr$; any slower and it falls away from the track.';
    return {
      kind: 'flow',
      prompt: [say(`A toy car is let go from rest ${metres(h)} above the bottom of a smooth loop of radius ${metres(p.r)}. ${G_NOTE} Does it get round?`)],
      subject: 'v_{\\text{top}}^{2} \\ge gr',
      steps: [
        { id: 'top', ask: '$v^{2}$ at the top of the loop:', branches: forks(top, [n3(19.6 * h), n3(19.6 * (h - p.r)), n3(9.8 * (h - 2 * p.r))], 1).map((label) => ({ label, to: 'need' })) },
        { id: 'need', ask: '$v^{2}$ it needs at the top:', branches: forks(need, [n3(19.6 * p.r), n3(4.9 * p.r), n3(9.8 * p.r * p.r)], 1).map((label) => ({ label, to: 'verdict' })) },
        { id: 'verdict', ask: 'So:', branches: [MAKES, FALLS].map((label) => ({ label, outcome: why })) },
      ],
      answer: [`$${fmt(top)}$`, `$${fmt(need)}$`, top > need ? MAKES : FALLS],
    };
  },
  solution: (p) => {
    const h = p.halves / 2;
    return [
      { tex: `v_{\\text{top}}^{2} = 2 \\times 9.8 \\times (${fmt(h)} - ${fmt(2 * p.r)}) = ${fmt(19.6 * (h - 2 * p.r))}` },
      { tex: `gr = 9.8 \\times ${fmt(p.r)} = ${fmt(9.8 * p.r)}` },
      { text: 19.6 * (h - 2 * p.r) > 9.8 * p.r ? 'More than it needs, so it gets round.' : 'Less than it needs, so it leaves the track before the top.' },
    ];
  },
};

interface SwingParams {
  m: number;
  r: number;
  /** Speed squared at the point asked about. */
  v2: number;
  at: 'top' | 'bottom';
}

const tension = ({ m, r, v2, at }: SwingParams): number => n3(m * (v2 / r + (at === 'bottom' ? 9.8 : -9.8)));

/** Expression: tension in a string whirling a ball in a vertical circle, at the bottom (easy) or the top (hard). */
const whirlTension: Generator<SwingParams> = {
  id: 'clm-whirl-tension',
  sample: (rng, difficulty) =>
    until(
      () => {
        const r = rng.pick([0.4, 0.5, 0.8, 1, 1.2, 1.5, 2]);
        const v = rng.int(3, 12);
        return { m: rng.pick([0.1, 0.2, 0.25, 0.5, 1, 2]), r, v2: v * v, at: difficulty > 1 ? ('top' as const) : ('bottom' as const) };
      },
      (p) => exact(tension(p), 3) && tension(p) > 0,
    ),
  render: (p) =>
    typed(
      [say(`A ${kg(p.m)} ball on a string of length ${metres(p.r)} is whirled in a vertical circle. At the ${p.at} it moves at ${ms(Math.sqrt(p.v2))}. ${G_NOTE} What is the tension in the string there, in newtons?`)],
      'T =',
      tension(p),
    ),
  solution: (p) =>
    p.at === 'bottom'
      ? [{ text: 'At the bottom the string pulls up, the weight down; the difference turns it:' }, { tex: 'T - mg = \\frac{mv^{2}}{r}' }, { tex: `T = ${fmt(p.m)} \\times \\frac{${p.v2}}{${fmt(p.r)}} + ${fmt(p.m)} \\times 9.8 = ${fmt(tension(p))}` }]
      : [{ text: 'At the top both the string and the weight pull down, towards the centre:' }, { tex: 'T + mg = \\frac{mv^{2}}{r}' }, { tex: `T = ${fmt(p.m)} \\times \\frac{${p.v2}}{${fmt(p.r)}} - ${fmt(p.m)} \\times 9.8 = ${fmt(tension(p))}` }],
  choices: (p) => {
    const T = tension(p);
    const other = tension({ ...p, at: p.at === 'top' ? 'bottom' : 'top' });
    return numChoices(T, [other, n3((p.m * p.v2) / p.r), n3(p.m * 9.8)], salted(p.m, p.r, p.v2));
  },
};

/* ================================================================
 * Potential energy diagrams
 * ================================================================ */

/** Potential energy in joules at x = 0, 1, ..., 8 metres, joined by straight lines. */
interface Landscape {
  U: number[];
  /** The total energy, drawn as a dashed line. */
  E: number;
}

const X_MAX = 8;
const U_MAX = 12;
const PW = 280;
const PH = 190;
const LEFT = 30;
const RIGHT = 14;
const TOP = 14;
const BASE = 160;

const px = (x: number): number => LEFT + (x / X_MAX) * (PW - LEFT - RIGHT);
const py = (u: number): number => BASE - (u / U_MAX) * (BASE - TOP);

function landscapeSvg({ U, E }: Landscape, label: string): string {
  const grid = [0, 2, 4, 6, 8, 10, 12]
    .map(
      (u) =>
        `<line x1="${LEFT}" y1="${py(u).toFixed(1)}" x2="${PW - RIGHT}" y2="${py(u).toFixed(1)}" stroke="currentColor" opacity="0.12"/>` +
        `<text x="${LEFT - 5}" y="${(py(u) + 3.5).toFixed(1)}" font-size="10" text-anchor="end" fill="currentColor" opacity="0.7">${u}</text>`,
    )
    .join('');
  const xs = Array.from({ length: X_MAX + 1 }, (_, x) => x)
    .map(
      (x) =>
        `<line x1="${px(x).toFixed(1)}" y1="${TOP}" x2="${px(x).toFixed(1)}" y2="${BASE}" stroke="currentColor" opacity="0.12"/>` +
        `<text x="${px(x).toFixed(1)}" y="${BASE + 14}" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">${x}</text>`,
    )
    .join('');
  const curve = U.map((u, x) => `${px(x).toFixed(1)},${py(u).toFixed(1)}`).join(' ');
  return (
    `<svg viewBox="0 0 ${PW} ${PH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">` +
    grid +
    xs +
    `<line x1="${LEFT}" y1="${BASE}" x2="${PW - RIGHT}" y2="${BASE}" stroke="currentColor" stroke-width="1.5"/>` +
    `<line x1="${LEFT}" y1="${TOP}" x2="${LEFT}" y2="${BASE}" stroke="currentColor" stroke-width="1.5"/>` +
    `<polyline points="${curve}" fill="none" stroke="currentColor" stroke-width="2.5" class="plot-accent"/>` +
    `<line x1="${LEFT}" y1="${py(E).toFixed(1)}" x2="${PW - RIGHT}" y2="${py(E).toFixed(1)}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>` +
    `<text x="${PW - RIGHT - 2}" y="${(py(E) - 4).toFixed(1)}" font-size="11" font-weight="600" text-anchor="end" fill="currentColor">E</text>` +
    `<text x="${PW - RIGHT}" y="${PH - 2}" font-size="10" text-anchor="end" fill="currentColor" opacity="0.7">x (m)</text>` +
    `<text x="${LEFT + 4}" y="${TOP - 3}" font-size="10" fill="currentColor" opacity="0.7">U (J)</text>` +
    `</svg>`
  );
}

const over = { lo: (LEFT * X_MAX) / (PW - LEFT - RIGHT), hi: (RIGHT * X_MAX) / (PW - LEFT - RIGHT) };

/** U at any x, along the straight pieces. */
const uAt = (U: number[], x: number): number => {
  const i = Math.min(Math.floor(x), X_MAX - 1);
  return U[i] + (U[i + 1] - U[i]) * (x - i);
};

/**
 * A landscape with a valley the particle is trapped in: walls at both ends
 * rise above E, and each wall crosses E on a half metre.
 */
function sampleLandscape(rng: Rng): Landscape {
  return until(
    () => {
      const E = rng.int(3, 10);
      const i = rng.int(0, 2);
      const j = rng.int(5, 7);
      const U = Array.from({ length: X_MAX + 1 }, (_, x) => (x <= i || x > j ? rng.int(E + 1, U_MAX) : rng.int(0, E - 1)));
      return { U, E };
    },
    (land) => {
      const turns = crossings(land);
      return turns.length === 2 && turns.every((t) => Number.isInteger(t * 2)) && land.U.every((u, x) => x === 0 || Math.abs(u - land.U[x - 1]) <= 8);
    },
  );
}

/** Every x where the curve crosses E, left to right. */
function crossings({ U, E }: Landscape): number[] {
  const out: number[] = [];
  for (let i = 0; i < X_MAX; i += 1) {
    const a = U[i] - E;
    const b = U[i + 1] - E;
    if (a === 0 && i > 0) out.push(i);
    if (a * b < 0) out.push(n3(i + a / (a - b)));
  }
  return out;
}

interface TurnParams extends Landscape {
  side: 'left' | 'right';
}

/** Slider: where the particle turns back, on a potential energy diagram. */
const peTurning: Generator<TurnParams> = {
  id: 'clm-pe-turning',
  sample: (rng) => ({ ...sampleLandscape(rng), side: rng.pick(['left', 'right'] as const) }),
  render: (p) => {
    const [lo, hi] = crossings(p);
    return {
      kind: 'slider',
      prompt: [
        say(`The graph shows a particle's potential energy $U$ against its position $x$. Its total energy $E = ${p.E}\\text{ J}$ is the dashed line, and it is moving to the ${p.side} in the valley between.`),
        say('Slide to where it stops and turns back.'),
      ],
      min: 0,
      max: X_MAX,
      step: 0.5,
      answer: p.side === 'right' ? hi : lo,
      readout: 'x = {v}',
      figure: { svg: landscapeSvg(p, 'A potential energy curve with the total energy as a dashed line'), xMin: -over.lo, xMax: X_MAX + over.hi, axis: 'x' },
    };
  },
  solution: (p) => {
    const [lo, hi] = crossings(p);
    const t = p.side === 'right' ? hi : lo;
    return [
      { text: 'Kinetic energy is $E - U$, which can never be negative. It turns back where the curve meets the dashed line, $U = E$:' },
      { tex: `U(${fmt(t)}) = ${p.E}` },
      { tex: `x = ${fmt(t)}` },
    ];
  },
};

interface SpeedParams extends Landscape {
  /** A whole-metre point inside the valley. */
  at: number;
  m: number;
  /** Hard: the speed is asked, with m chosen so it is whole. */
  hard: boolean;
}

/** Expression: the kinetic energy E - U at a point (easy), or the speed there (hard). */
const peSpeed: Generator<SpeedParams> = {
  id: 'clm-pe-speed',
  sample: (rng, difficulty) =>
    until(
      () => {
        const land = sampleLandscape(rng);
        const [lo, hi] = crossings(land);
        const inside = Array.from({ length: X_MAX + 1 }, (_, x) => x).filter((x) => x > lo && x < hi);
        const at = inside.length ? rng.pick(inside) : -1;
        const KE = at < 0 ? 0 : land.E - land.U[at];
        const v = rng.int(1, 6);
        return { ...land, at, m: difficulty > 1 ? n3((2 * KE) / (v * v)) : 1, hard: difficulty > 1 };
      },
      // The mass is printed: whole or one decimal place, never a 0.56 kg worked back from the speed.
      (p) => p.at >= 0 && p.E - p.U[p.at] > 0 && (!p.hard || (exact(p.m, 1) && p.m >= 0.1)),
    ),
  render: (p) => {
    const KE = p.E - p.U[p.at];
    const figure = [{ kind: 'diagram' as const, svg: landscapeSvg(p, 'A potential energy curve with the total energy as a dashed line') }];
    return p.hard
      ? typed([...figure, say(`A ${kg(p.m)} particle has total energy $E = ${p.E}\\text{ J}$. How fast is it moving at $x = ${p.at}\\text{ m}$, in $\\text{m s}^{-1}$?`)], 'v =', n3(Math.sqrt((2 * KE) / p.m)))
      : typed([...figure, say(`A particle has total energy $E = ${p.E}\\text{ J}$, the dashed line. What is its kinetic energy at $x = ${p.at}\\text{ m}$, in joules?`)], 'K =', KE);
  },
  solution: (p) => {
    const KE = p.E - p.U[p.at];
    return [
      { text: `Read the curve at $x = ${p.at}$: $U = ${p.U[p.at]}$.` },
      { tex: `K = E - U = ${p.E} - ${p.U[p.at]} = ${KE}` },
      ...(p.hard ? [{ tex: `v^{2} = \\frac{2 \\times ${KE}}{${fmt(p.m)}} = ${fmt((2 * KE) / p.m)}` }, { tex: `v = ${fmt(Math.sqrt((2 * KE) / p.m))}` }] : []),
    ];
  },
  choices: (p) => {
    const KE = p.E - p.U[p.at];
    const right = p.hard ? n3(Math.sqrt((2 * KE) / p.m)) : KE;
    return numChoices(right, p.hard ? [n3((2 * KE) / p.m), n3(Math.sqrt(KE / p.m)), n3(Math.sqrt((2 * p.E) / p.m))] : [p.U[p.at], p.E, p.E + p.U[p.at]], salted(p.E, p.at, p.m, ...p.U));
  },
};

interface SlopeParams extends Landscape {
  /** The piece from x = seg to seg + 1, never flat. */
  seg: number;
}

/** Expression: the force on the particle, F = -dU/dx, from the slope of one straight piece. */
const peForce: Generator<SlopeParams> = {
  id: 'clm-pe-force',
  sample: (rng) =>
    until(
      () => ({ ...sampleLandscape(rng), seg: rng.int(0, X_MAX - 1) }),
      (p) => p.U[p.seg + 1] !== p.U[p.seg],
    ),
  render: (p) =>
    typed(
      [
        { kind: 'diagram', svg: landscapeSvg(p, 'A potential energy curve made of straight pieces') },
        say(`The graph shows a particle's potential energy. What is the force on it at $x = ${fmt(p.seg + 0.5)}\\text{ m}$, in newtons, taking the positive direction as increasing $x$?`),
      ],
      'F =',
      p.U[p.seg] - p.U[p.seg + 1],
    ),
  solution: (p) => [
    { text: `From $x = ${p.seg}$ to $x = ${p.seg + 1}$, $U$ goes from $${p.U[p.seg]}$ to $${p.U[p.seg + 1]}$, a slope of $${p.U[p.seg + 1] - p.U[p.seg]}\\text{ J m}^{-1}$.` },
    { text: 'The force pushes downhill on the graph, so it is minus the slope:' },
    { tex: `F = -\\frac{dU}{dx} = ${p.U[p.seg] - p.U[p.seg + 1]}` },
  ],
};

interface FastParams extends Landscape {
  /** Four whole-metre points in the valley, the lowest U among them unique. */
  points: number[];
}

/** Choice: where in the valley the particle moves fastest: where U is lowest. */
const peFastest: Generator<FastParams> = {
  id: 'clm-pe-fastest',
  sample: (rng) =>
    until(
      () => {
        const land = sampleLandscape(rng);
        const [lo, hi] = crossings(land);
        const inside = Array.from({ length: X_MAX + 1 }, (_, x) => x).filter((x) => x > lo && x < hi);
        return { ...land, points: inside };
      },
      (p) => {
        if (p.points.length < 3) return false;
        const us = p.points.map((x) => p.U[x]);
        return us.filter((u) => u === Math.min(...us)).length === 1;
      },
    ),
  render: (p) => {
    const fastest = p.points.reduce((a, b) => (p.U[b] < p.U[a] ? b : a));
    return typed(
      [
        { kind: 'diagram', svg: landscapeSvg(p, 'A potential energy curve with the total energy as a dashed line') },
        say('A particle with the total energy shown as the dashed line moves back and forth in the valley. At which whole number of metres is it moving fastest?'),
      ],
      'x =',
      fastest,
    );
  },
  choices: (p) => {
    const fastest = p.points.reduce((a, b) => (p.U[b] < p.U[a] ? b : a));
    const others = p.points.filter((x) => x !== fastest).sort((a, b) => p.U[a] - p.U[b]);
    const as = (x: number): Omit<ChoiceOption, 'correct'> => ({ tex: `x = ${x}`, answer: String(x) });
    return steered(options(as(fastest), ...others.slice(0, 3).map(as)), salted(...p.U, p.E), others.slice(3).map(as));
  },
  solution: (p) => {
    const fastest = p.points.reduce((a, b) => (p.U[b] < p.U[a] ? b : a));
    return [
      { text: 'Kinetic energy is $E - U$, largest where $U$ is lowest.' },
      { text: `Of the points, $U$ is lowest at $x = ${fastest}$, where it is $${p.U[fastest]}\\text{ J}$, leaving $${p.E - p.U[fastest]}\\text{ J}$ of kinetic energy.` },
    ];
  },
};

/* ================================================================
 * Power, efficiency and batteries
 * ================================================================ */

interface LiftParams {
  m: number;
  h: number;
  t: number;
  what: string;
}

const LIFTERS = ['crane', 'lift motor', 'winch', 'hoist', 'conveyor'];

/** Expression: the power to lift a load, mgh/t. */
const liftPower: Generator<LiftParams> = {
  id: 'clm-lift-power',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: 10 * rng.int(1, difficulty > 1 ? 200 : 50), h: rng.int(2, 40), t: rng.int(2, 60), what: rng.pick(LIFTERS) }),
      (p) => exact((9.8 * p.m * p.h) / p.t, 2),
    ),
  render: (p) => typed([say(`A ${p.what} raises ${kg(p.m)} by ${metres(p.h)} at a steady speed in ${p.t} seconds. ${G_NOTE} What useful power does it deliver, in watts?`)], 'P =', n3((9.8 * p.m * p.h) / p.t)),
  solution: (p) => [
    { tex: `E = ${p.m} \\times 9.8 \\times ${p.h} = ${fmt(9.8 * p.m * p.h)}` },
    { tex: `P = \\frac{${fmt(9.8 * p.m * p.h)}}{${p.t}} = ${fmt((9.8 * p.m * p.h) / p.t)}` },
  ],
  choices: (p) => {
    const P = n3((9.8 * p.m * p.h) / p.t);
    return numChoices(P, [n3(9.8 * p.m * p.h), n3((p.m * p.h) / p.t), n3((9.8 * p.m * p.t) / p.h)], salted(p.m, p.h, p.t));
  },
};

interface EffRow {
  /** Energy in, joules. */
  input: number;
  /** Efficiency as a percentage. */
  pct: number;
  blank: 'input' | 'out' | 'pct';
}

const MACHINES = 'Each row is a machine: the energy put in, the useful energy out, both in joules, and the efficiency as a percentage.';

/** Table: energy in, useful energy out and efficiency; easy blanks the output, hard any one. */
const efficiencyTable: Generator<{ rows: EffRow[] }> = {
  id: 'clm-efficiency-table',
  sample: (rng, difficulty) =>
    until(
      () => ({
        rows: [0, 1, 2].map((): EffRow => ({
          input: 100 * rng.int(1, 60),
          pct: 5 * rng.int(4, 19),
          blank: difficulty > 1 ? rng.pick(['input', 'out', 'pct'] as const) : 'out',
        })),
      }),
      ({ rows }) => new Set(rows.map((r) => r.input)).size === 3 && (difficulty < 2 || new Set(rows.map((r) => r.blank)).size > 1),
    ),
  render: ({ rows }) => {
    const out = (r: EffRow) => n3((r.input * r.pct) / 100);
    const value = (r: EffRow) => (r.blank === 'input' ? r.input : r.blank === 'out' ? out(r) : r.pct);
    const answer = rows.map(value);
    return {
      kind: 'table',
      prompt: [say(MACHINES), say('Fill in the gaps.')],
      columns: ['E_{\\text{in}}', 'E_{\\text{out}}', '\\%'],
      rows: rows.map((r) => [r.blank === 'input' ? null : fmt(r.input), r.blank === 'out' ? null : fmt(out(r)), r.blank === 'pct' ? null : fmt(r.pct)]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3(r.input - out(r)), 100 - r.pct, n3(r.input * (1 + r.pct / 100))])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep => {
      const out = (r.input * r.pct) / 100;
      return r.blank === 'input'
        ? { tex: `E_{\\text{in}} = ${fmt(out)} \\div ${fmt(r.pct / 100)} = ${fmt(r.input)}` }
        : r.blank === 'out'
          ? { tex: `E_{\\text{out}} = ${fmt(r.pct / 100)} \\times ${fmt(r.input)} = ${fmt(out)}` }
          : { tex: `\\frac{${fmt(out)}}{${fmt(r.input)}} \\times 100 = ${fmt(r.pct)}` };
    }),
};

interface DroneParams {
  /** Battery capacity in watt hours. */
  wh: number;
  /** Power drawn hovering, in watts. */
  P: number;
}

/** Flow: a drone battery: its energy in joules, the hover time in seconds, then in minutes. */
const droneFlow: Generator<DroneParams> = {
  id: 'clm-drone-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({ wh: rng.pick(difficulty > 1 ? [15, 20, 25, 30, 40, 45, 50, 60, 75, 80, 90, 100] : [10, 20, 30, 40, 50, 60]), P: 10 * rng.int(5, 40) }),
      (p) => Number.isInteger((p.wh * 60) / p.P * 2) && (p.wh * 3600) / p.P >= 120,
    ),
  render: (p) => {
    const E = p.wh * 3600;
    const t = n3(E / p.P);
    const mins = n3(t / 60);
    return {
      kind: 'flow',
      prompt: [say(`A drone's battery holds $${p.wh}\\text{ Wh}$, a watt hour being one watt for an hour. Hovering, the drone draws ${watts(p.P)}. How long can it hover?`)],
      subject: 't = \\frac{E}{P}',
      steps: [
        { id: 'E', ask: 'The energy in the battery, in joules:', branches: forks(E, [p.wh * 60, p.wh * 1000, p.wh * 360], 100).map((label) => ({ label, to: 't' })) },
        { id: 't', ask: 'The hover time, in seconds:', branches: forks(t, [n3(t / 60), n3(t * 2), n3((p.wh * 60) / p.P)], 10).map((label) => ({ label, to: 'm' })) },
        { id: 'm', ask: 'So the hover time, in minutes:', branches: forks(mins, [n3(t / 100), n3(mins * 2), n3(t / 3600)], 0.5).map((label) => ({ label, outcome: 'A real drone lands with some charge to spare, so its rated time is shorter.' })) },
      ],
      answer: [`$${fmt(E)}$`, `$${fmt(t)}$`, `$${fmt(mins)}$`],
    };
  },
  solution: (p) => [
    { tex: `E = ${p.wh} \\times 3600 = ${p.wh * 3600}` },
    { tex: `t = \\frac{${p.wh * 3600}}{${p.P}} = ${fmt((p.wh * 3600) / p.P)}` },
    { tex: `${fmt((p.wh * 3600) / p.P)} \\div 60 = ${fmt((p.wh * 60) / p.P)}` },
  ],
};

interface MotorParams {
  m: number;
  h: number;
  /** Efficiency as a percentage. */
  pct: number;
  /** Electrical power in, watts. */
  P: number;
}

/** Tree: a motor of some efficiency lifts a load: the useful energy, the energy it draws, and how long it takes. */
const motorTree: Generator<MotorParams> = {
  id: 'clm-motor-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: 5 * rng.int(1, difficulty > 1 ? 80 : 20), h: rng.int(2, 30), pct: rng.pick(difficulty > 1 ? [35, 40, 49, 70, 80, 98] : [49, 70, 98]), P: 10 * rng.int(5, 200) }),
      (p) => {
        const input = (9.8 * p.m * p.h * 100) / p.pct;
        return exact(input, 2) && exact(input / p.P, 2) && input / p.P >= 1;
      },
    ),
  render: (p) => {
    const useful = n3(9.8 * p.m * p.h);
    const input = n3((useful * 100) / p.pct);
    const t = n3(input / p.P);
    return {
      kind: 'tree',
      prompt: [
        say(`An electric motor, ${p.pct}% efficient, draws ${watts(p.P)} and lifts ${kg(p.m)} through ${metres(p.h)}. ${G_NOTE}`),
        say('Find the useful energy and the energy it draws, both in joules, then the time the lift takes in seconds.'),
      ],
      expression: '\\text{efficiency} = \\frac{E_{\\text{out}}}{E_{\\text{in}}}',
      nodes: [
        { id: 'E_{\\text{out}}', from: [] },
        { id: 'E_{\\text{in}}', from: ['E_{\\text{out}}'] },
        { id: 't', from: ['E_{\\text{in}}'] },
      ],
      bank: tidyBank([useful, input, t], [n3((useful * p.pct) / 100), n3(useful / p.P), n3(input - useful)]),
      answer: [useful, input, t].map(fmt),
    };
  },
  solution: (p) => {
    const useful = 9.8 * p.m * p.h;
    const input = (useful * 100) / p.pct;
    return [
      { tex: `E_{\\text{out}} = ${p.m} \\times 9.8 \\times ${p.h} = ${fmt(useful)}` },
      { tex: `E_{\\text{in}} = ${fmt(useful)} \\div ${fmt(p.pct / 100)} = ${fmt(input)}` },
      { tex: `t = \\frac{${fmt(input)}}{${p.P}} = ${fmt(input / p.P)}` },
    ];
  },
};

export const classicalEnergyGenerators = [
  hooke,
  springEnergy,
  springSlider,
  springTable,
  launchTree,
  rampSpeed,
  bumperFlow,
  trackTable,
  loopTop,
  loopTree,
  loopFlow,
  whirlTension,
  peTurning,
  peSpeed,
  peForce,
  peFastest,
  liftPower,
  efficiencyTable,
  droneFlow,
  motorTree,
];

export const classicalEnergyInternals = { crossings, uAt, launchK, bumperK, topPush, tension, landscapeSvg };
