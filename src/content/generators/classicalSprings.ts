/**
 * Classical Mechanics, level 8: Springs (`clm-l8`).
 *
 * Springs in series and in parallel (OpenStax University Physics 7.1 and the
 * problems of 15.1); a mass on a spring as a potential well, with turning
 * points and speeds from energy (8.4, 15.2); simple harmonic motion's angular
 * frequency, greatest speed and greatest acceleration (15.1 to 15.2); the
 * simple pendulum (15.4); and a pendulum swung through a large angle, worked
 * by energy (8.3).
 *
 * Tidy cases: angular frequencies are whole or short decimals, set by
 * choosing k = m omega^2, and pendulum lengths are 9.8 / omega^2; a large
 * swing drops 2.5 j^2 metres so it arrives at 7j m/s.
 */
import type { Generator, SolutionStep } from '../types';
import { G_NOTE, exact, fmt, forks, kg, metres, ms, numChoices, salted, say, track, typed, until, valueBank } from './classicalKit';

const n3 = (v: number): number => Number(v.toFixed(6));
const Nm = (v: number): string => `$${fmt(v)}\\text{ N m}^{-1}$`;
const N = (v: number): string => `$${fmt(v)}\\text{ N}$`;

const tidyBank = (answer: number[], wrong: number[], spare = 3): string[] =>
  valueBank(
    answer,
    wrong.filter((v) => v > 0 && exact(v, 3)),
    spare,
  );

/* ================================================================
 * Springs together
 * ================================================================ */

const series = (a: number, b: number): number => n3((a * b) / (a + b));

interface SeriesParams {
  k1: number;
  k2: number;
  /** A third spring in series with the parallel pair, or 0 for two in series. */
  k3: number;
}

const combined = ({ k1, k2, k3 }: SeriesParams): number => (k3 ? series(k1 + k2, k3) : series(k1, k2));

/** Expression: the stiffness of two springs in series (easy), or a parallel pair in series with a third (hard). */
const springSeries: Generator<SeriesParams> = {
  id: 'clm-spring-series',
  sample: (rng, difficulty) =>
    until(
      () => ({ k1: 10 * rng.int(1, 30), k2: 10 * rng.int(1, 30), k3: difficulty > 1 ? 10 * rng.int(1, 40) : 0 }),
      (p) => exact(combined(p), 2) && p.k1 !== p.k2,
    ),
  render: (p) =>
    typed(
      [
        say(
          p.k3
            ? `Springs of stiffness ${Nm(p.k1)} and ${Nm(p.k2)} hang side by side from a bar, sharing a load; below them hangs a spring of ${Nm(p.k3)}. What is the stiffness of the whole arrangement, in $\\text{N m}^{-1}$?`
            : `A spring of stiffness ${Nm(p.k1)} is joined end to end with one of ${Nm(p.k2)}. What is the stiffness of the pair, in $\\text{N m}^{-1}$?`,
        ),
      ],
      'k =',
      combined(p),
    ),
  solution: (p) =>
    p.k3
      ? [
          { tex: `k_{\\text{side by side}} = ${p.k1} + ${p.k2} = ${p.k1 + p.k2}` },
          { tex: `k = \\frac{${p.k1 + p.k2} \\times ${p.k3}}{${p.k1 + p.k2} + ${p.k3}} = ${fmt(combined(p))}` },
        ]
      : [{ tex: `\\frac{1}{k} = \\frac{1}{${p.k1}} + \\frac{1}{${p.k2}}` }, { tex: `k = \\frac{${p.k1} \\times ${p.k2}}{${p.k1} + ${p.k2}} = ${fmt(combined(p))}` }],
  choices: (p) => numChoices(combined(p), p.k3 ? [p.k1 + p.k2 + p.k3, series(series(p.k1, p.k2), p.k3), n3(p.k1 + p.k2)] : [p.k1 + p.k2, n3((p.k1 + p.k2) / 2), n3(2 * series(p.k1, p.k2))], salted(p.k1, p.k2, p.k3)),
};

interface ComboRow {
  k1: number;
  k2: number;
  blank: 'parallel' | 'series' | 'k2';
}

/** Table: two springs' stiffnesses, side by side and end to end; easy blanks a combination, hard may blank the second spring. */
const springTable: Generator<{ rows: ComboRow[] }> = {
  id: 'clm-spring-combo-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ rows: [0, 1, 2].map((): ComboRow => ({ k1: 5 * rng.int(1, 30), k2: 5 * rng.int(1, 30), blank: rng.pick(difficulty > 1 ? (['parallel', 'series', 'k2'] as const) : (['parallel', 'series'] as const)) })) }),
      ({ rows }) => rows.every((r) => exact(series(r.k1, r.k2), 2) && r.k1 !== r.k2) && new Set(rows.map((r) => r.k1 * 1000 + r.k2)).size === 3,
    ),
  render: ({ rows }) => {
    // A row blanking k2 shows the series stiffness, so the parallel one is shown only where k2 is.
    const value = (r: ComboRow) => (r.blank === 'parallel' ? r.k1 + r.k2 : r.blank === 'series' ? series(r.k1, r.k2) : r.k2);
    const answer = rows.map(value);
    return {
      kind: 'table',
      prompt: [say('Each row is a pair of springs, stiffness in $\\text{N m}^{-1}$: side by side they add; end to end their reciprocals add. Fill in the gaps.')],
      columns: ['k_{1}', 'k_{2}', '\\text{side by side}', '\\text{end to end}'],
      rows: rows.map((r) => [fmt(r.k1), r.blank === 'k2' ? null : fmt(r.k2), r.blank === 'parallel' ? null : r.blank === 'k2' ? '' : fmt(r.k1 + r.k2), r.blank === 'series' ? null : fmt(series(r.k1, r.k2))]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3((r.k1 + r.k2) / 2), n3(r.k1 * r.k2), Math.abs(r.k1 - r.k2)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 'parallel'
        ? { tex: `${r.k1} + ${r.k2} = ${r.k1 + r.k2}` }
        : r.blank === 'series'
          ? { tex: `\\frac{${r.k1} \\times ${r.k2}}{${r.k1} + ${r.k2}} = ${fmt(series(r.k1, r.k2))}` }
          : { tex: `\\frac{1}{k_{2}} = \\frac{1}{${fmt(series(r.k1, r.k2))}} - \\frac{1}{${r.k1}} \\qquad k_{2} = ${r.k2}` },
    ),
};

interface StretchParams {
  /** Stiffnesses in N/cm and the load in N. */
  k1: number;
  k2: number;
  W: number;
}

/** Tree: a load on two springs end to end: each stretches under the whole load, and the total stretch. */
const springStretchTree: Generator<StretchParams> = {
  id: 'clm-spring-stretch-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ k1: rng.int(2, difficulty > 1 ? 25 : 10), k2: rng.int(2, difficulty > 1 ? 25 : 10), W: 5 * rng.int(2, 40) }),
      (p) => exact(p.W / p.k1, 2) && exact(p.W / p.k2, 2) && p.k1 !== p.k2,
    ),
  render: (p) => {
    const x1 = n3(p.W / p.k1);
    const x2 = n3(p.W / p.k2);
    return {
      kind: 'tree',
      prompt: [say(`A load of ${N(p.W)} hangs from two light springs joined end to end, of stiffness $${p.k1}\\text{ N cm}^{-1}$ and $${p.k2}\\text{ N cm}^{-1}$.`), say('Find how far each spring stretches and the total stretch, in centimetres.')],
      expression: 'x = \\frac{W}{k}',
      nodes: [
        { id: 'x_{1}', from: [] },
        { id: 'x_{2}', from: [] },
        { id: 'x', from: ['x_{1}', 'x_{2}'] },
      ],
      bank: tidyBank([x1, x2, n3(x1 + x2)], [n3(p.W / (p.k1 + p.k2)), n3(p.W / 2 / p.k1), n3(p.W / 2 / p.k2)]),
      answer: [x1, x2, n3(x1 + x2)].map(fmt),
    };
  },
  solution: (p) => [
    { text: 'End to end, each spring carries the whole load:' },
    { tex: `x_{1} = \\frac{${p.W}}{${p.k1}} = ${fmt(p.W / p.k1)} \\qquad x_{2} = \\frac{${p.W}}{${p.k2}} = ${fmt(p.W / p.k2)}` },
    { tex: `x = ${fmt(p.W / p.k1)} + ${fmt(p.W / p.k2)} = ${fmt(n3(p.W / p.k1 + p.W / p.k2))}` },
  ],
};

/** Flow: a load shared by two springs side by side: the stiffness together, the stretch, and the pull of the first. */
const springShareFlow: Generator<StretchParams> = {
  id: 'clm-spring-share-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({ k1: rng.int(2, difficulty > 1 ? 30 : 12), k2: rng.int(2, difficulty > 1 ? 30 : 12), W: 5 * rng.int(2, 60) }),
      (p) => exact(p.W / (p.k1 + p.k2), 2) && p.k1 !== p.k2,
    ),
  render: (p) => {
    const k = p.k1 + p.k2;
    const x = n3(p.W / k);
    const F1 = n3(p.k1 * x);
    return {
      kind: 'flow',
      prompt: [say(`A load of ${N(p.W)} hangs from a bar held level by two springs side by side, of stiffness $${p.k1}\\text{ N cm}^{-1}$ and $${p.k2}\\text{ N cm}^{-1}$. How hard does the first spring pull?`)],
      subject: 'k = k_{1} + k_{2} \\qquad F_{1} = k_{1}x',
      steps: [
        { id: 'k', ask: 'The stiffness together, in $\\text{N cm}^{-1}$:', branches: forks(k, [series(p.k1, p.k2), Math.abs(p.k1 - p.k2)], 1).map((label) => ({ label, to: 'x' })) },
        { id: 'x', ask: 'The stretch, in centimetres:', branches: forks(x, [n3(p.W / p.k1), n3(x * 2), n3(p.W / series(p.k1, p.k2))], 0.1).map((label) => ({ label, to: 'F' })) },
        { id: 'F', ask: 'The first spring’s pull, in newtons:', branches: forks(F1, [n3(p.W / 2), n3(p.k2 * x), n3(p.W - F1 + 1)], 1).map((label) => ({ label, outcome: 'Side by side, both stretch the same and the stiffer spring takes more of the load.' })) },
      ],
      answer: [`$${fmt(k)}$`, `$${fmt(x)}$`, `$${fmt(F1)}$`],
    };
  },
  solution: (p) => {
    const k = p.k1 + p.k2;
    return [
      { tex: `k = ${p.k1} + ${p.k2} = ${k}` },
      { tex: `x = \\frac{${p.W}}{${k}} = ${fmt(p.W / k)}` },
      { tex: `F_{1} = ${p.k1} \\times ${fmt(p.W / k)} = ${fmt(n3((p.k1 * p.W) / k))}` },
    ];
  },
};

/* ================================================================
 * Energy in a spring's well
 * ================================================================ */

interface WellParams {
  k: number;
  /** Amplitude in metres. */
  A: number;
}

const wellEnergy = ({ k, A }: WellParams): number => n3(0.5 * k * A * A);

/** Slider: the turning point of a mass on a spring from its energy, where all of it is stored in the spring. */
const springTurning: Generator<WellParams> = {
  id: 'clm-spring-turning',
  sample: (rng, difficulty) => until(() => ({ k: 10 * rng.int(1, difficulty > 1 ? 80 : 30), A: 0.05 * rng.int(2, 40) }), (p) => exact(wellEnergy(p), 3) && exact(p.A, 2)),
  render: (p) => {
    const A = n3(p.A);
    const figure = track(0, 2, [{ at: 0, name: 'rest' }], 'A scale of stretch from the rest position in metres');
    return {
      kind: 'slider',
      prompt: [say(`A mass on a spring of stiffness ${Nm(p.k)} slides on a smooth floor with $${fmt(wellEnergy(p))}\\text{ J}$ of energy. Slide to its turning point, in metres from the rest position.`)],
      min: 0,
      max: 2,
      step: 0.05,
      answer: A,
      readout: 'x = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [
    { text: 'At the turning point it stops, so all the energy is in the spring:' },
    { tex: `\\tfrac{1}{2} \\times ${p.k} \\times x^{2} = ${fmt(wellEnergy(p))}` },
    { tex: `x^{2} = ${fmt(n3(p.A * p.A))} \\qquad x = ${fmt(n3(p.A))}` },
  ],
};

/** Legs and hypotenuse, so that A^2 - x^2 is a square. */
const TRIPLES = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
];

interface SpeedParams {
  m: number;
  w: number;
  tri: number[];
  /** Metres per unit of the triangle. */
  s: number;
}

const speedAt = ({ w, tri, s }: SpeedParams): number => n3(w * tri[1] * s);

/** Expression: the speed of a mass on a spring at a displacement x, from energy: v = omega sqrt(A^2 - x^2). */
const springSpeed: Generator<SpeedParams> = {
  id: 'clm-spring-speed',
  sample: (rng, difficulty) =>
    until(() => ({ m: rng.pick([0.5, 1, 2, 4, 5]), w: rng.int(2, 10), tri: rng.pick(difficulty > 1 ? TRIPLES : TRIPLES.slice(0, 2)), s: rng.pick([0.01, 0.02, 0.05, 0.1]) }), (p) => exact(p.m * p.w * p.w, 2) && exact(speedAt(p), 3)),
  render: (p) => {
    const k = n3(p.m * p.w * p.w);
    return typed(
      [say(`A ${kg(p.m)} mass on a spring of stiffness ${Nm(k)} oscillates on a smooth floor with amplitude ${metres(n3(p.tri[2] * p.s))}. How fast is it moving when it is ${metres(n3(p.tri[0] * p.s))} from the middle, in $\\text{m s}^{-1}$?`)],
      'v =',
      speedAt(p),
    );
  },
  solution: (p) => {
    const k = n3(p.m * p.w * p.w);
    const A = n3(p.tri[2] * p.s);
    const x = n3(p.tri[0] * p.s);
    return [
      { tex: `\\tfrac{1}{2}mv^{2} = \\tfrac{1}{2}k\\left(A^{2} - x^{2}\\right)` },
      { tex: `v^{2} = \\frac{${fmt(k)}}{${fmt(p.m)}}\\left(${fmt(A)}^{2} - ${fmt(x)}^{2}\\right) = ${fmt(n3(p.w * p.w))} \\times ${fmt(n3(A * A - x * x))}` },
      { tex: `v = ${fmt(speedAt(p))}` },
    ];
  },
  choices: (p) => {
    const A = n3(p.tri[2] * p.s);
    const x = n3(p.tri[0] * p.s);
    return numChoices(speedAt(p), [n3(p.w * A), n3(p.w * (A - x)), n3(p.w * p.w * p.tri[1] * p.s)], salted(p.m, p.w, p.s * 100, ...p.tri));
  },
};

interface WellRow {
  x: number;
  blank: 'U' | 'K';
}

/** Table: across a spring's swing, the energy stored U = kx^2/2 and the kinetic energy E - U at each point. */
const springEnergyTable: Generator<{ k: number; A: number; rows: WellRow[] }> = {
  id: 'clm-spring-energy-table',
  sample: (rng, difficulty) => {
    const k = 10 * rng.int(1, difficulty > 1 ? 50 : 20);
    const A = 0.1 * rng.int(4, 10);
    const xs = [0, 1, 2]
      .map(() => n3(0.1 * rng.int(0, Math.round(A * 10))))
      .filter((x, i, all) => all.indexOf(x) === i);
    while (xs.length < 3) xs.push(n3(A - 0.1 * xs.length));
    return { k, A: n3(A), rows: xs.sort((a, b) => a - b).map((x): WellRow => ({ x, blank: difficulty > 1 ? (rng.chance(0.5) ? 'U' : 'K') : 'U' })) };
  },
  render: ({ k, A, rows }) => {
    const E = n3(0.5 * k * A * A);
    const U = (x: number) => n3(0.5 * k * x * x);
    const answer = rows.flatMap((r) => (r.blank === 'U' ? [U(r.x), n3(E - U(r.x))] : [n3(E - U(r.x))]));
    return {
      kind: 'table',
      prompt: [say(`A mass on a spring of stiffness ${Nm(k)} swings with amplitude ${metres(A)}, so its energy is $${fmt(E)}\\text{ J}$. Fill in the energy stored in the spring and the kinetic energy at each displacement, in joules.`)],
      columns: ['x', 'U', 'K'],
      rows: rows.map((r) => [fmt(r.x), r.blank === 'U' ? null : fmt(U(r.x)), null]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3(k * r.x * r.x), n3(0.5 * k * r.x)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ k, A, rows }) => {
    const E = 0.5 * k * A * A;
    return rows.flatMap((r): SolutionStep[] => [{ tex: `U = \\tfrac{1}{2} \\times ${k} \\times ${fmt(r.x)}^{2} = ${fmt(n3(0.5 * k * r.x * r.x))} \\qquad K = ${fmt(n3(E))} - ${fmt(n3(0.5 * k * r.x * r.x))} = ${fmt(n3(E - 0.5 * k * r.x * r.x))}` }]);
  },
};

/** Flow: from the amplitude to the speed at a point: the total energy, the energy still in the spring, then the speed. */
const springWellFlow: Generator<SpeedParams> = {
  id: 'clm-spring-well-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: rng.pick([0.5, 1, 2, 4]), w: rng.int(2, 10), tri: rng.pick(difficulty > 1 ? TRIPLES : TRIPLES.slice(0, 2)), s: rng.pick([0.02, 0.05, 0.1, 0.2]) }),
      (p) => {
        const k = p.m * p.w * p.w;
        const A = p.tri[2] * p.s;
        const x = p.tri[0] * p.s;
        return exact(k, 2) && exact(0.5 * k * A * A, 3) && exact(0.5 * k * x * x, 3) && exact(speedAt(p), 3);
      },
    ),
  render: (p) => {
    const k = n3(p.m * p.w * p.w);
    const A = n3(p.tri[2] * p.s);
    const x = n3(p.tri[0] * p.s);
    const E = n3(0.5 * k * A * A);
    const U = n3(0.5 * k * x * x);
    const v = speedAt(p);
    return {
      kind: 'flow',
      prompt: [say(`A ${kg(p.m)} mass on a spring of stiffness ${Nm(k)} swings with amplitude ${metres(A)}. How fast is it going ${metres(x)} from the middle?`)],
      subject: 'E = \\tfrac{1}{2}kA^{2} \\qquad \\tfrac{1}{2}mv^{2} = E - \\tfrac{1}{2}kx^{2}',
      steps: [
        { id: 'E', ask: 'The total energy, in joules:', branches: forks(E, [n3(k * A * A), n3(0.5 * k * A)], 0.01).map((label) => ({ label, to: 'U' })) },
        { id: 'U', ask: 'The energy in the spring at that point, in joules:', branches: forks(U, [n3(E - U), n3(k * x * x)], 0.01).map((label) => ({ label, to: 'v' })) },
        { id: 'v', ask: 'So its speed, in $\\text{m s}^{-1}$:', branches: forks(v, [n3(p.w * A), n3(p.w * (A - x))], 0.1).map((label) => ({ label, outcome: 'The energy not in the spring is kinetic.' })) },
      ],
      answer: [`$${fmt(E)}$`, `$${fmt(U)}$`, `$${fmt(v)}$`],
    };
  },
  solution: (p) => {
    const k = p.m * p.w * p.w;
    const A = p.tri[2] * p.s;
    const x = p.tri[0] * p.s;
    const E = 0.5 * k * A * A;
    const U = 0.5 * k * x * x;
    return [
      { tex: `E = \\tfrac{1}{2} \\times ${fmt(k)} \\times ${fmt(n3(A))}^{2} = ${fmt(n3(E))}` },
      { tex: `U = \\tfrac{1}{2} \\times ${fmt(k)} \\times ${fmt(n3(x))}^{2} = ${fmt(n3(U))}` },
      { tex: `\\tfrac{1}{2} \\times ${fmt(p.m)} \\times v^{2} = ${fmt(n3(E - U))}` },
      { tex: `v = ${fmt(speedAt(p))}` },
    ];
  },
};

/* ================================================================
 * Simple harmonic motion
 * ================================================================ */

interface OmegaParams {
  m: number;
  w: number;
  find: 'w' | 'k';
}

/** Expression: the angular frequency sqrt(k/m) of a mass on a spring (easy), or the stiffness for a wanted one (hard). */
const shmOmega: Generator<OmegaParams> = {
  id: 'clm-shm-omega',
  sample: (rng, difficulty) => until(() => ({ m: rng.pick([0.1, 0.2, 0.25, 0.5, 1, 2, 4, 5]), w: rng.int(2, 20), find: difficulty > 1 ? ('k' as const) : ('w' as const) }), (p) => exact(p.m * p.w * p.w, 2)),
  render: (p) => {
    const k = n3(p.m * p.w * p.w);
    return p.find === 'w'
      ? typed([say(`A ${kg(p.m)} mass bounces on a spring of stiffness ${Nm(k)}. What is its angular frequency $\\omega$, in $\\text{rad s}^{-1}$?`)], '\\omega =', p.w)
      : typed([say(`A ${kg(p.m)} mass is to bounce on a spring with angular frequency $${p.w}\\text{ rad s}^{-1}$. What stiffness does the spring need, in $\\text{N m}^{-1}$?`)], 'k =', k);
  },
  solution: (p) => {
    const k = n3(p.m * p.w * p.w);
    return p.find === 'w' ? [{ tex: `\\omega = \\sqrt{\\frac{k}{m}} = \\sqrt{\\frac{${fmt(k)}}{${fmt(p.m)}}} = \\sqrt{${p.w * p.w}} = ${p.w}` }] : [{ tex: `k = m\\omega^{2} = ${fmt(p.m)} \\times ${p.w}^{2} = ${fmt(k)}` }];
  },
  choices: (p) => {
    const k = n3(p.m * p.w * p.w);
    return p.find === 'w' ? numChoices(p.w, [p.w * p.w, n3(k / p.m / 2), n3(Math.sqrt(p.m * k))], salted(p.m, p.w)) : numChoices(k, [n3(p.m * p.w), n3(p.w * p.w), n3(p.m * p.w * p.w * 2)], salted(p.m, p.w, 1));
  },
};

interface ShmParams {
  m: number;
  w: number;
  /** Amplitude in metres. */
  A: number;
}

const sampleShm = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }, hard: boolean): ShmParams =>
  until(() => ({ m: rng.pick([0.2, 0.5, 1, 2, 4]), w: rng.int(2, hard ? 15 : 8), A: rng.pick([0.02, 0.05, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5]) }), (p) => exact(p.m * p.w * p.w, 2) && exact(p.A * p.w * p.w, 3));

/** Tree: a mass on a spring: omega, then the greatest speed A omega and the greatest acceleration A omega^2. */
const shmTree: Generator<ShmParams> = {
  id: 'clm-shm-tree',
  sample: (rng, difficulty) => sampleShm(rng, difficulty > 1),
  render: (p) => {
    const k = n3(p.m * p.w * p.w);
    const v = n3(p.A * p.w);
    const a = n3(p.A * p.w * p.w);
    return {
      kind: 'tree',
      prompt: [say(`A ${kg(p.m)} mass on a spring of stiffness ${Nm(k)} oscillates with amplitude ${metres(p.A)}.`), say('Find $\\omega$, its greatest speed, and its greatest acceleration.')],
      expression: 'v_{\\max} = A\\omega \\qquad a_{\\max} = A\\omega^{2}',
      nodes: [
        { id: '\\omega', from: [] },
        { id: 'v_{\\max}', from: ['\\omega'] },
        { id: 'a_{\\max}', from: ['\\omega'] },
      ],
      bank: tidyBank([p.w, v, a], [p.w * p.w, n3(p.A * p.w * p.w * p.w), n3(k * p.A)]),
      answer: [p.w, v, a].map(fmt),
    };
  },
  solution: (p) => [
    { tex: `\\omega = \\sqrt{\\frac{${fmt(n3(p.m * p.w * p.w))}}{${fmt(p.m)}}} = ${p.w}` },
    { tex: `v_{\\max} = ${fmt(p.A)} \\times ${p.w} = ${fmt(n3(p.A * p.w))}` },
    { tex: `a_{\\max} = ${fmt(p.A)} \\times ${p.w}^{2} = ${fmt(n3(p.A * p.w * p.w))}` },
  ],
};

interface ShmRow {
  A: number;
  w: number;
  blank: 'v' | 'a' | 'A' | 'w';
}

/** Table: amplitude, omega, greatest speed and greatest acceleration; any gap from the rest. */
const shmTable: Generator<{ rows: ShmRow[] }> = {
  id: 'clm-shm-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ rows: [0, 1, 2].map((): ShmRow => ({ A: rng.pick([0.02, 0.05, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 2, 3]), w: rng.int(2, 12), blank: rng.pick(difficulty > 1 ? (['v', 'a', 'A', 'w'] as const) : (['v', 'a'] as const)) })) }),
      ({ rows }) => rows.every((r) => exact(r.A * r.w * r.w, 3)) && new Set(rows.map((r) => r.A * r.w)).size === 3,
    ),
  render: ({ rows }) => {
    const v = (r: ShmRow) => n3(r.A * r.w);
    const a = (r: ShmRow) => n3(r.A * r.w * r.w);
    // Blanking A or omega leaves both greatest values shown; blanking one of them shows A and omega.
    const answer = rows.map((r) => (r.blank === 'v' ? v(r) : r.blank === 'a' ? a(r) : r.blank === 'A' ? r.A : r.w));
    return {
      kind: 'table',
      prompt: [say('Each row is a body in simple harmonic motion: amplitude $A$ in metres, $\\omega$ in $\\text{rad s}^{-1}$, greatest speed and greatest acceleration. Fill in the gaps.')],
      columns: ['A', '\\omega', 'v_{\\max}', 'a_{\\max}'],
      rows: rows.map((r) => [r.blank === 'A' ? null : fmt(r.A), r.blank === 'w' ? null : fmt(r.w), r.blank === 'v' ? null : fmt(v(r)), r.blank === 'a' ? null : fmt(a(r))]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3(r.A * r.w * r.w * r.w), r.w * r.w, n3(r.A / r.w)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 'v'
        ? { tex: `v_{\\max} = ${fmt(r.A)} \\times ${r.w} = ${fmt(n3(r.A * r.w))}` }
        : r.blank === 'a'
          ? { tex: `a_{\\max} = ${fmt(r.A)} \\times ${r.w}^{2} = ${fmt(n3(r.A * r.w * r.w))}` }
          : r.blank === 'w'
            ? { tex: `\\omega = \\frac{a_{\\max}}{v_{\\max}} = \\frac{${fmt(n3(r.A * r.w * r.w))}}{${fmt(n3(r.A * r.w))}} = ${r.w}` }
            : { tex: `A = \\frac{v_{\\max}^{2}}{a_{\\max}} = \\frac{${fmt(n3(r.A * r.w))}^{2}}{${fmt(n3(r.A * r.w * r.w))}} = ${fmt(r.A)}` },
    ),
};

interface WhereParams {
  w: number;
  A: number;
  /** The stated acceleration's displacement, metres. */
  x: number;
}

/** Slider: where in its swing a body in SHM has a stated acceleration, x = a / omega^2. */
const shmSlider: Generator<WhereParams> = {
  id: 'clm-shm-slider',
  sample: (rng, difficulty) =>
    until(
      () => {
        const A = rng.pick([0.4, 0.5, 0.6, 0.8, 1]);
        return { w: rng.int(2, difficulty > 1 ? 12 : 6), A, x: n3(0.05 * rng.int(1, Math.round(A * 20) - 1)) };
      },
      (p) => exact(p.x * p.w * p.w, 3),
    ),
  render: (p) => {
    const figure = track(0, 1, [{ at: 0, name: 'middle' }], 'A scale of displacement from the middle of the swing in metres');
    return {
      kind: 'slider',
      prompt: [say(`A body in simple harmonic motion has $\\omega = ${p.w}\\text{ rad s}^{-1}$ and amplitude ${metres(p.A)}. Slide to how far from the middle it is when its acceleration is $${fmt(n3(p.x * p.w * p.w))}\\text{ m s}^{-2}$.`)],
      min: 0,
      max: 1,
      step: 0.05,
      answer: p.x,
      readout: 'x = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [{ tex: `a = \\omega^{2}x` }, { tex: `x = \\frac{${fmt(n3(p.x * p.w * p.w))}}{${p.w}^{2}} = ${fmt(p.x)}` }],
};

/* ================================================================
 * Pendulums
 * ================================================================ */

/** Angular frequencies whose pendulum length 9.8 / omega^2 is a short decimal. */
const PEND_OMEGAS = [0.5, 0.7, 1, 1.4, 2, 2.5, 2.8, 3.5, 4, 5, 7, 10, 14];
const pendLength = (w: number): number => n3(9.8 / (w * w));

interface PendParams {
  w: number;
  find: 'w' | 'L';
  what: string;
}

const PEND_THINGS = ['simple pendulum', 'pendulum in a clock', 'weight on a string', 'hanging lamp', 'plumb line set swinging', 'conker on a string', 'swinging sign'];

/** Expression: a pendulum's angular frequency sqrt(g/L) from its length (easy), or the length for a wanted one (hard). */
const pendOmega: Generator<PendParams> = {
  id: 'clm-pend-omega',
  sample: (rng, difficulty) => ({ w: rng.pick(PEND_OMEGAS), find: difficulty > 1 ? 'L' : 'w', what: rng.pick(PEND_THINGS) }),
  render: (p) =>
    p.find === 'w'
      ? typed([say(`A ${p.what} is ${metres(pendLength(p.w))} long. ${G_NOTE} What is its angular frequency for small swings, in $\\text{rad s}^{-1}$?`)], '\\omega =', p.w)
      : typed([say(`A ${p.what} is to swing with angular frequency $${fmt(p.w)}\\text{ rad s}^{-1}$. ${G_NOTE} How long must it be, in metres?`)], 'L =', pendLength(p.w)),
  solution: (p) =>
    p.find === 'w'
      ? [{ tex: `\\omega = \\sqrt{\\frac{g}{L}} = \\sqrt{\\frac{9.8}{${fmt(pendLength(p.w))}}} = \\sqrt{${fmt(n3(p.w * p.w))}} = ${fmt(p.w)}` }]
      : [{ tex: `L = \\frac{g}{\\omega^{2}} = \\frac{9.8}{${fmt(p.w)}^{2}} = ${fmt(pendLength(p.w))}` }],
  choices: (p) => (p.find === 'w' ? numChoices(p.w, [n3(p.w * p.w), n3(9.8 * pendLength(p.w)), n3(p.w / 2)], salted(p.w * 10, p.what.length)) : numChoices(pendLength(p.w), [n3(9.8 / p.w), n3(9.8 * p.w * p.w), n3(p.w * p.w / 9.8)], salted(p.w * 10, p.what.length + 100))),
};

interface PendSliderParams {
  w: number;
  what: string;
}

/** Slider: the length of pendulum that swings with a stated angular frequency. */
const pendSlider: Generator<PendSliderParams> = {
  id: 'clm-pend-slider',
  sample: (rng) => until(() => ({ w: rng.pick(PEND_OMEGAS), what: rng.pick(['a clock', 'a garden swing', 'a metronome', 'a hanging lamp', 'a toy', 'a playground swing', 'a demonstration']) }), (p) => pendLength(p.w) <= 10 && pendLength(p.w) >= 0.1 && Number.isInteger(n3(pendLength(p.w) * 20))),
  render: (p) => {
    const figure = track(0, 10, [{ at: 0, name: 'pivot' }], 'A scale of pendulum lengths in metres');
    return {
      kind: 'slider',
      prompt: [say(`A pendulum for ${p.what} must swing with angular frequency $${fmt(p.w)}\\text{ rad s}^{-1}$. ${G_NOTE} Slide to its length, in metres.`)],
      min: 0,
      max: 10,
      step: 0.05,
      answer: pendLength(p.w),
      readout: 'L = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [{ tex: `L = \\frac{9.8}{${fmt(p.w)}^{2}} = ${fmt(pendLength(p.w))}` }],
};

interface PendRow {
  w: number;
  blank: 'w' | 'L';
}

/** Table: pendulum lengths and their angular frequencies, g = 9.8, either missing. */
const pendTable: Generator<{ rows: PendRow[] }> = {
  id: 'clm-pend-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ rows: [0, 1, 2].map((): PendRow => ({ w: rng.pick(PEND_OMEGAS), blank: difficulty > 1 ? (rng.chance(0.5) ? 'w' : 'L') : 'w' })) }),
      ({ rows }) => new Set(rows.map((r) => r.w)).size === 3,
    ),
  render: ({ rows }) => {
    const answer = rows.map((r) => (r.blank === 'w' ? r.w : pendLength(r.w)));
    return {
      kind: 'table',
      prompt: [say(`Each row is a simple pendulum: its length $L$ in metres and its angular frequency $\\omega$ in $\\text{rad s}^{-1}$. ${G_NOTE} Fill in the gaps.`)],
      columns: ['L', '\\omega'],
      rows: rows.map((r) => [r.blank === 'L' ? null : fmt(pendLength(r.w)), r.blank === 'w' ? null : fmt(r.w)]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3(r.w * r.w), n3(9.8 / r.w)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) => rows.map((r): SolutionStep => (r.blank === 'w' ? { tex: `\\omega = \\sqrt{\\frac{9.8}{${fmt(pendLength(r.w))}}} = ${fmt(r.w)}` } : { tex: `L = \\frac{9.8}{${fmt(r.w)}^{2}} = ${fmt(pendLength(r.w))}` })),
};

interface RatioParams {
  /** The factor the length is multiplied by, and the old period in seconds. */
  f: number;
  T: number;
}

const SLOW = 'It runs slow';
const FAST = 'It runs fast';
const FACTORS = [4, 9, 16, 0.25, 1.21, 0.81, 1.44, 0.64, 2.25, 0.36];

/** Flow: a pendulum clock's length changes: the factor on the period, the new period, and whether the clock gains or loses. */
const pendRatioFlow: Generator<RatioParams> = {
  id: 'clm-pend-ratio-flow',
  sample: (rng) => until(() => ({ f: rng.pick(FACTORS), T: rng.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]) }), (p) => exact(Math.sqrt(p.f) * p.T, 3)),
  render: (p) => {
    const r = n3(Math.sqrt(p.f));
    const T2 = n3(r * p.T);
    return {
      kind: 'flow',
      prompt: [say(`A pendulum clock ticks once per swing, with a period of $${fmt(p.T)}\\text{ s}$. Its pendulum is made $${fmt(p.f)}$ times as long.`)],
      subject: 'T = 2\\pi\\sqrt{\\frac{L}{g}}',
      steps: [
        { id: 'r', ask: 'The period is multiplied by:', branches: forks(r, [p.f, n3(p.f * p.f), n3(1 / r)], 0.1).map((label) => ({ label, to: 'T' })) },
        { id: 'T', ask: 'The new period, in seconds:', branches: forks(T2, [n3(p.f * p.T), n3(p.T / r)], 0.1).map((label) => ({ label, to: 'clock' })) },
        { id: 'clock', ask: 'Against true time, the clock:', branches: [FAST, SLOW].map((label) => ({ label, outcome: 'A longer period means fewer ticks each hour, so the clock falls behind.' })) },
      ],
      answer: [`$${fmt(r)}$`, `$${fmt(T2)}$`, p.f > 1 ? SLOW : FAST],
    };
  },
  solution: (p) => [
    { tex: `T \\propto \\sqrt{L} \\qquad \\sqrt{${fmt(p.f)}} = ${fmt(n3(Math.sqrt(p.f)))}` },
    { tex: `T' = ${fmt(n3(Math.sqrt(p.f)))} \\times ${fmt(p.T)} = ${fmt(n3(Math.sqrt(p.f) * p.T))}` },
  ],
};

/* ================================================================
 * The large swing
 * ================================================================ */

/** Release angles by their cosine: the drop is L(1 - cos theta). */
const RELEASES = [
  { tex: '60^\\circ', c: 0.5 },
  { tex: '90^\\circ', c: 0 },
  { tex: '\\theta \\text{ where } \\cos\\theta = 0.8', c: 0.8 },
  { tex: '\\theta \\text{ where } \\cos\\theta = 0.6', c: 0.6 },
  { tex: '\\theta \\text{ where } \\cos\\theta = 0.2', c: 0.2 },
  { tex: '\\theta \\text{ where } \\cos\\theta = 0.9', c: 0.9 },
];

interface SwingParams {
  release: { tex: string; c: number };
  L: number;
  m: number;
  what: string;
}

const SWINGERS = ['pendulum', 'rope swing', 'conker on a string', 'wrecking ball on a cable', 'playground swing', 'trapeze'];

const drop = ({ release, L }: SwingParams): number => n3(L * (1 - release.c));
const swingSpeed = (p: SwingParams): number => n3(Math.sqrt(2 * 9.8 * drop(p)));
const bottomTension = (p: SwingParams): number => n3(p.m * 9.8 + (p.m * 2 * 9.8 * drop(p)) / p.L);

const sampleSwing = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }, hard: boolean): SwingParams =>
  until(
    () => ({ release: rng.pick(hard ? RELEASES : RELEASES.slice(0, 2)), L: n3(0.1 * rng.int(2, 100)), m: rng.pick([0.5, 1, 2, 5, 10, 20]), what: rng.pick(SWINGERS) }),
    (p) => exact(swingSpeed(p), 2) && exact(bottomTension(p), 2),
  );

/** Expression: the speed at the bottom of a large swing, from the height it drops. */
const swingSpeedGen: Generator<SwingParams> = {
  id: 'clm-swing-speed',
  sample: (rng, difficulty) => sampleSwing(rng, difficulty > 1),
  render: (p) => typed([say(`A ${p.what} ${metres(p.L)} long is let go from rest at $${p.release.tex}$ to the vertical. ${G_NOTE} How fast is it going at the bottom, in $\\text{m s}^{-1}$?`)], 'v =', swingSpeed(p)),
  solution: (p) => [
    { tex: `h = L(1 - \\cos\\theta) = ${fmt(p.L)} \\times ${fmt(n3(1 - p.release.c))} = ${fmt(drop(p))}` },
    { tex: `v = \\sqrt{2 \\times 9.8 \\times ${fmt(drop(p))}} = ${fmt(swingSpeed(p))}` },
  ],
  choices: (p) => numChoices(swingSpeed(p), [n3(Math.sqrt(2 * 9.8 * p.L)), n3(2 * 9.8 * drop(p)), n3(Math.sqrt(9.8 * drop(p)))], salted(p.L * 10, p.release.c * 10)),
};

/** Tree: a large swing: the drop, the speed at the bottom, and the string's tension there. */
const swingTree: Generator<SwingParams> = {
  id: 'clm-swing-tree',
  sample: (rng, difficulty) => sampleSwing(rng, difficulty > 1),
  render: (p) => ({
    kind: 'tree',
    prompt: [say(`A ${kg(p.m)} bob on a string ${metres(p.L)} long is let go from rest at $${p.release.tex}$ to the vertical. ${G_NOTE}`), say('Find the height it drops, its speed at the bottom, and the tension in the string there.')],
    expression: 'T = mg + \\frac{mv^{2}}{L}',
    nodes: [
      { id: 'h', from: [] },
      { id: 'v', from: ['h'] },
      { id: 'T', from: ['v'] },
    ],
    bank: tidyBank([drop(p), swingSpeed(p), bottomTension(p)], [n3(p.m * 9.8), n3(p.L * p.release.c), n3((p.m * 2 * 9.8 * drop(p)) / p.L)]),
    answer: [drop(p), swingSpeed(p), bottomTension(p)].map(fmt),
  }),
  solution: (p) => [
    { tex: `h = ${fmt(p.L)}(1 - ${fmt(p.release.c)}) = ${fmt(drop(p))}` },
    { tex: `v = \\sqrt{19.6 \\times ${fmt(drop(p))}} = ${fmt(swingSpeed(p))}` },
    { tex: `T = ${fmt(p.m)} \\times 9.8 + \\frac{${fmt(p.m)} \\times ${fmt(n3(swingSpeed(p) ** 2))}}{${fmt(p.L)}} = ${fmt(bottomTension(p))}` },
  ],
};

interface DropParams {
  /** Speed at the bottom is 1.4 j m/s, so the drop is 0.1 j^2 m. */
  j: number;
  what: string;
}

/** Slider: how far below the release point the bottom of a swing must be for a stated speed there. */
const swingSlider: Generator<DropParams> = {
  id: 'clm-swing-slider',
  sample: (rng) => ({ j: rng.int(1, 10), what: rng.pick(['a child on a swing', 'a wrecking ball', 'a pendulum bob', 'a trapeze artist', 'a rope swing over a river']) }),
  render: (p) => {
    const figure = track(0, 10, [{ at: 0, name: 'release' }], 'A scale of heights below the release point in metres');
    return {
      kind: 'slider',
      prompt: [say(`Let go from rest, ${p.what} reaches ${ms(n3(1.4 * p.j))} at the bottom of the swing. ${G_NOTE} Slide to how far below the release point the bottom is, in metres.`)],
      min: 0,
      max: 10,
      step: 0.1,
      answer: n3(0.1 * p.j * p.j),
      readout: 'h = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [{ tex: `h = \\frac{v^{2}}{2g} = \\frac{${fmt(n3(1.4 * p.j))}^{2}}{19.6} = ${fmt(n3(0.1 * p.j * p.j))}` }],
};

interface SwingFlowParams extends SwingParams {
  strength: number;
}

const HOLDS = 'It holds';
const SNAPS = 'It snaps';

/** Flow: will the string survive the bottom of a large swing? The speed, the tension, then the check. */
const swingFlow: Generator<SwingFlowParams> = {
  id: 'clm-swing-flow',
  sample: (rng, difficulty) => {
    const p = sampleSwing(rng, difficulty > 1);
    const T = bottomTension(p);
    const strength = Math.max(10, 10 * Math.round((T * rng.pick([0.7, 0.85, 1.2, 1.5])) / 10));
    return { ...p, strength: Math.abs(strength - T) < 1e-9 ? strength + 10 : strength };
  },
  render: (p) => {
    const v = swingSpeed(p);
    const T = bottomTension(p);
    return {
      kind: 'flow',
      prompt: [say(`A ${kg(p.m)} bob on a string ${metres(p.L)} long is let go from rest at $${p.release.tex}$ to the vertical. The string breaks at ${N(p.strength)}. ${G_NOTE}`)],
      subject: 'T = mg + \\frac{mv^{2}}{L}',
      steps: [
        { id: 'v', ask: 'Its speed at the bottom, in $\\text{m s}^{-1}$:', branches: forks(v, [n3(Math.sqrt(19.6 * p.L)), n3(19.6 * drop(p))], 0.1).map((label) => ({ label, to: 'T' })) },
        { id: 'T', ask: 'The tension there, in newtons:', branches: forks(T, [n3(p.m * 9.8), n3((p.m * v * v) / p.L)], 1).map((label) => ({ label, to: 'verdict' })) },
        { id: 'verdict', ask: `Against its strength of ${N(p.strength)}:`, branches: [HOLDS, SNAPS].map((label) => ({ label, outcome: 'The string is pulled hardest at the bottom, where it holds the weight and turns the bob.' })) },
      ],
      answer: [`$${fmt(v)}$`, `$${fmt(T)}$`, T <= p.strength ? HOLDS : SNAPS],
    };
  },
  solution: (p) => [
    { tex: `v = \\sqrt{19.6 \\times ${fmt(drop(p))}} = ${fmt(swingSpeed(p))}` },
    { tex: `T = ${fmt(n3(p.m * 9.8))} + \\frac{${fmt(p.m)} \\times ${fmt(n3(swingSpeed(p) ** 2))}}{${fmt(p.L)}} = ${fmt(bottomTension(p))}` },
  ],
};

export const classicalSpringsGenerators = [
  springSeries,
  springTable,
  springStretchTree,
  springShareFlow,
  springTurning,
  springSpeed,
  springEnergyTable,
  springWellFlow,
  shmOmega,
  shmTree,
  shmTable,
  shmSlider,
  pendOmega,
  pendSlider,
  pendTable,
  pendRatioFlow,
  swingSpeedGen,
  swingTree,
  swingSlider,
  swingFlow,
];

export const classicalSpringsInternals = { series, pendLength, drop, swingSpeed, bottomTension };
