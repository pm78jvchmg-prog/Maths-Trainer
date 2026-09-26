/**
 * Classical Mechanics, level 6: Frames of Reference (`clm-l6`).
 *
 * Relative velocity on a train, a river and in a wind, after OpenStax
 * University Physics 4.5; the centre-of-mass frame, after 9.6; rotating
 * frames and the forces felt in them, after 6.3; and special relativity's
 * time dilation, length contraction and velocity addition, after Volume 3,
 * 5.3 to 5.6.
 *
 * Tidy cases: river and wind speeds come from Pythagorean triples, so every
 * resultant is whole; relativity uses a Lorentz factor gamma stated or from
 * v = 0.6c (gamma = 1.25) and v = 0.8c (gamma = 5/3, with times in threes).
 * A rotating frame's radius or spin is given as a textbook would print it,
 * and the square root it leads to is asked to a stated precision.
 */
import type { Generator, SolutionStep } from '../types';
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

/** A bank that may hold negative values: the answer's tokens, then up to three distinct slips. */
const signedBank = (answer: number[], wrong: number[]): string[] => {
  const tokens = answer.map(fmt);
  const extra = [...new Set(wrong.filter((v) => Number.isFinite(v) && exact(v, 3)).map(fmt))].filter((t) => !tokens.includes(t)).slice(0, 3);
  for (let k = 1; extra.length < 3; k += 1) {
    const t = fmt(answer[0] + k);
    if (!tokens.includes(t) && !extra.includes(t)) extra.push(t);
  }
  return [...tokens, ...extra].sort((a, b) => Number(a) - Number(b));
};

const n3 = (v: number): number => Number(v.toFixed(6));

/** Spins and radii of a space station to 3 significant figures. */
const SF3: Precision = { sf: 3 };

/** An unrounded value on a working line: 0.1565..., or the value itself when it ends. */
const dots = (value: number, places = 4): string => (exact(value, places) ? fmt(value) : `${value.toFixed(places)}\\ldots`);

/** The working line that ends a rounded answer: "To 3 significant figures:" then the value. */
const roundLines = (name: string, value: number, precision: Precision): SolutionStep[] => [
  { text: `T${precisionWords(precision).slice(1)}:` },
  { tex: `${name} = ${fixed(value, precision)}` },
];
const signedMs = (v: number): string => `$${fmt(v)}\\text{ m s}^{-1}$`;

const TRIPLES = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
  [6, 8, 10],
  [8, 6, 10],
  [7, 24, 25],
  [24, 7, 25],
];

/* ================================================================
 * Relative velocity
 * ================================================================ */

interface WalkRow {
  train: number;
  /** Walking speed relative to the train, positive forwards. */
  walk: number;
  blank: 'train' | 'walk' | 'ground';
}

/** Table: a train's speed, a walker's speed relative to the train (either way), and the walker's speed over the ground. */
const trainTable: Generator<{ rows: WalkRow[] }> = {
  id: 'clm-train-table',
  sample: (rng, difficulty) =>
    until(
      () => ({
        rows: [0, 1, 2].map((): WalkRow => ({
          train: rng.int(10, 60),
          walk: (difficulty > 1 ? rng.pick([1, -1]) : rng.pick([1, 1, -1])) * rng.int(1, 3) * (rng.chance(0.5) ? 1 : 1.5),
          blank: difficulty > 1 ? rng.pick(['train', 'walk', 'ground'] as const) : 'ground',
        })),
      }),
      ({ rows }) => new Set(rows.map((r) => r.train + r.walk)).size === 3 && rows.some((r) => r.walk < 0),
    ),
  render: ({ rows }) => {
    const value = (r: WalkRow) => (r.blank === 'train' ? r.train : r.blank === 'walk' ? r.walk : n3(r.train + r.walk));
    const answer = rows.map(value);
    return {
      kind: 'table',
      prompt: [say('Each row is a passenger walking along a moving train. Speeds are in $\\text{m s}^{-1}$, forwards positive: the train over the ground, the walk relative to the train (negative is towards the back), and the walker over the ground. Fill in the gaps.')],
      columns: ['v_{\\text{train}}', 'v_{\\text{walk}}', 'v_{\\text{ground}}'],
      rows: rows.map((r) => [r.blank === 'train' ? null : fmt(r.train), r.blank === 'walk' ? null : fmt(r.walk), r.blank === 'ground' ? null : fmt(r.train + r.walk)]),
      bank: signedBank(answer, rows.flatMap((r) => [n3(r.train - r.walk), -value(r), n3(r.train * r.walk)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 'ground'
        ? { tex: `v_{\\text{ground}} = ${fmt(r.train)} + (${fmt(r.walk)}) = ${fmt(r.train + r.walk)}` }
        : r.blank === 'walk'
          ? { tex: `v_{\\text{walk}} = ${fmt(r.train + r.walk)} - ${fmt(r.train)} = ${fmt(r.walk)}` }
          : { tex: `v_{\\text{train}} = ${fmt(r.train + r.walk)} - (${fmt(r.walk)}) = ${fmt(r.train)}` },
    ),
};

interface RiverParams {
  /** Boat speed through the water and the current, k times a triple's legs. */
  tri: number[];
  k: number;
  /** Width in metres. */
  w: number;
}

const boatSpeed = ({ tri, k }: RiverParams): number => n3(k * tri[1] * 0.5);
const current = ({ tri, k }: RiverParams): number => n3(k * tri[0] * 0.5);

/** Tree: a boat pointed straight across a river: the time to cross, the drift downstream, and its speed over the ground. */
const riverTree: Generator<RiverParams> = {
  id: 'clm-river-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ tri: rng.pick(difficulty > 1 ? TRIPLES : TRIPLES.slice(0, 2)), k: rng.int(1, 4), w: 10 * rng.int(3, 40) }),
      (p) => exact(p.w / boatSpeed(p), 2) && exact((current(p) * p.w) / boatSpeed(p), 2) && boatSpeed(p) <= 12,
    ),
  render: (p) => {
    const b = boatSpeed(p);
    const c = current(p);
    const t = n3(p.w / b);
    const d = n3(c * t);
    const v = n3(p.k * p.tri[2] * 0.5);
    return {
      kind: 'tree',
      prompt: [
        say(`A boat that moves at ${ms(b)} through the water is pointed straight across a river ${metres(p.w)} wide. The current flows at ${ms(c)}.`),
        say('Find the time to cross in seconds, how far downstream it lands in metres, and its speed over the ground.'),
      ],
      expression: 't = \\frac{w}{v_{\\text{boat}}} \\qquad d = v_{\\text{current}}t',
      nodes: [
        { id: 't', from: [] },
        { id: 'd', from: ['t'] },
        { id: 'v', from: [] },
      ],
      bank: tidyBank([t, d, v], [n3(p.w / v), n3(b + c), n3(p.w / c)]),
      answer: [t, d, v].map(fmt),
    };
  },
  solution: (p) => {
    const b = boatSpeed(p);
    const c = current(p);
    return [
      { text: 'Across and downstream are independent: the current does not slow the crossing.' },
      { tex: `t = \\frac{${p.w}}{${fmt(b)}} = ${fmt(p.w / b)}` },
      { tex: `d = ${fmt(c)} \\times ${fmt(p.w / b)} = ${fmt((c * p.w) / b)}` },
      { tex: `v = \\sqrt{${fmt(b)}^{2} + ${fmt(c)}^{2}} = ${fmt(p.k * p.tri[2] * 0.5)}` },
    ];
  },
};

/** Slider: where a boat pointed straight across lands on the far bank, measured downstream. */
const driftSlider: Generator<RiverParams> = {
  id: 'clm-drift-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({ tri: rng.pick(TRIPLES), k: rng.int(1, 4), w: 10 * rng.int(2, difficulty > 1 ? 30 : 15) }),
      (p) => {
        const d = (current(p) * p.w) / boatSpeed(p);
        return Number.isInteger(d * 2) && d <= 100 && d >= 2 && boatSpeed(p) <= 12;
      },
    ),
  render: (p) => {
    const d = n3((current(p) * p.w) / boatSpeed(p));
    const figure = track(0, 100, [{ at: 0, name: 'opposite' }], 'The far bank marked in metres downstream of the point opposite the start');
    return {
      kind: 'slider',
      prompt: [say(`A swimmer who moves at ${ms(boatSpeed(p))} through the water heads straight across a river ${metres(p.w)} wide, flowing at ${ms(current(p))}. Slide to where the swimmer reaches the far bank, in metres downstream.`)],
      min: 0,
      max: 100,
      step: 0.5,
      answer: d,
      readout: 'd = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [
    { tex: `t = \\frac{${p.w}}{${fmt(boatSpeed(p))}} = ${fmt(p.w / boatSpeed(p))}` },
    { tex: `d = ${fmt(current(p))} \\times ${fmt(p.w / boatSpeed(p))} = ${fmt((current(p) * p.w) / boatSpeed(p))}` },
  ],
};

interface WindParams {
  tri: number[];
  k: number;
  /** Easy: heading north with a wind east, the ground speed. Hard: the ground speed flying due north. */
  hard: boolean;
}

/** Expression: a plane in a crosswind: ground speed heading north (easy) or, pointed into the wind to fly due north (hard). */
const planeWind: Generator<WindParams> = {
  id: 'clm-plane-wind',
  sample: (rng, difficulty) => ({ tri: rng.pick(TRIPLES), k: 10 * rng.int(1, 6), hard: difficulty > 1 }),
  render: ({ tri, k, hard }) =>
    hard
      ? typed([say(`A plane flies at ${ms(k * tri[2])} through the air. A wind blows at ${ms(k * tri[0])} from west to east. The pilot points the plane partly into the wind so that it travels due north. What is its speed over the ground, in $\\text{m s}^{-1}$?`)], 'v =', k * tri[1])
      : typed([say(`A plane points due north and flies at ${ms(k * tri[1])} through the air. A wind blows at ${ms(k * tri[0])} from west to east. What is its speed over the ground, in $\\text{m s}^{-1}$?`)], 'v =', k * tri[2]),
  solution: ({ tri, k, hard }) =>
    hard
      ? [{ text: 'Its air velocity is the hypotenuse: part cancels the wind, the rest carries it north.' }, { tex: `v^{2} + ${k * tri[0]}^{2} = ${k * tri[2]}^{2}` }, { tex: `v = \\sqrt{${(k * tri[2]) ** 2} - ${(k * tri[0]) ** 2}} = ${k * tri[1]}` }]
      : [{ tex: `v = \\sqrt{${k * tri[1]}^{2} + ${k * tri[0]}^{2}} = ${k * tri[2]}` }],
  choices: ({ tri, k, hard }) =>
    hard ? numChoices(k * tri[1], [k * tri[2], k * (tri[2] - tri[0]), k * (tri[2] + tri[0])], salted(k, ...tri)) : numChoices(k * tri[2], [k * (tri[0] + tri[1]), k * Math.abs(tri[1] - tri[0]), k * tri[1]], salted(k, ...tri, 1)),
};

/* ================================================================
 * The centre-of-mass frame
 * ================================================================ */

interface PairParams {
  m1: number;
  m2: number;
  /** Velocities along a line, positive to the right; v2 may be negative. */
  v1: number;
  v2: number;
}

const vcm = ({ m1, m2, v1, v2 }: PairParams): number => n3((m1 * v1 + m2 * v2) / (m1 + m2));

const samplePair = (rng: { int: (a: number, b: number) => number }, hard: boolean): PairParams =>
  until(
    () => ({ m1: rng.int(1, 8), m2: rng.int(1, 8), v1: rng.int(1, 12), v2: hard ? rng.int(-8, 4) : 0 }),
    (p) => exact(vcm(p), 2) && p.v1 !== p.v2 && vcm(p) !== 0,
  );

/** Expression: the velocity of the centre of mass of two bodies on a line. */
const comVelocity: Generator<PairParams> = {
  id: 'clm-com-velocity',
  sample: (rng, difficulty) => samplePair(rng, difficulty > 1),
  render: (p) =>
    typed(
      [
        say(
          p.v2 === 0
            ? `A ${kg(p.m1)} cart moves at ${ms(p.v1)} towards a ${kg(p.m2)} cart at rest. How fast does their centre of mass move, in $\\text{m s}^{-1}$?`
            : `A ${kg(p.m1)} cart moves at ${ms(p.v1)} to the right; a ${kg(p.m2)} cart moves at ${signedMs(p.v2)}, positive to the right. What is the velocity of their centre of mass, in $\\text{m s}^{-1}$?`,
        ),
      ],
      'V =',
      vcm(p),
    ),
  solution: (p) => [{ tex: `V = \\frac{${p.m1} \\times ${p.v1} + ${p.m2} \\times ${p.v2 < 0 ? `(${p.v2})` : p.v2}}{${p.m1} + ${p.m2}} = ${fmt(vcm(p))}` }],
  choices: (p) => numChoices(vcm(p), [n3((p.v1 + p.v2) / 2), n3(p.m1 * p.v1 + p.m2 * p.v2), n3((p.m1 * p.v1 - p.m2 * p.v2) / (p.m1 + p.m2))], salted(p.m1, p.m2, p.v1, p.v2)),
};

/** Tree: into the centre-of-mass frame: its velocity, then each body's velocity as seen from it. */
const comFrameTree: Generator<PairParams> = {
  id: 'clm-com-frame-tree',
  sample: (rng, difficulty) => samplePair(rng, difficulty > 1),
  render: (p) => {
    const V = vcm(p);
    const u1 = n3(p.v1 - V);
    const u2 = n3(p.v2 - V);
    return {
      kind: 'tree',
      prompt: [
        say(`A ${kg(p.m1)} cart at ${signedMs(p.v1)} and a ${kg(p.m2)} cart at ${signedMs(p.v2)} move along a track, positive to the right.`),
        say('Find the centre of mass velocity $V$, then each cart’s velocity in the frame moving with it.'),
      ],
      expression: "u' = u - V",
      nodes: [
        { id: 'V', from: [] },
        { id: "u_{1}'", from: ['V'] },
        { id: "u_{2}'", from: ['V'] },
      ],
      bank: signedBank([V, u1, u2], [n3(p.v1 + V), n3(V - p.v2), n3((p.v1 + p.v2) / 2)]),
      answer: [V, u1, u2].map(fmt),
    };
  },
  solution: (p) => {
    const V = vcm(p);
    return [
      { tex: `V = \\frac{${p.m1} \\times ${p.v1} + ${p.m2} \\times ${p.v2 < 0 ? `(${p.v2})` : p.v2}}{${p.m1 + p.m2}} = ${fmt(V)}` },
      { tex: `u_{1}' = ${p.v1} - ${fmt(V)} = ${fmt(p.v1 - V)}` },
      { tex: `u_{2}' = ${p.v2 < 0 ? `(${p.v2})` : p.v2} - ${fmt(V)} = ${fmt(p.v2 - V)}` },
      { text: `Check: $${p.m1} \\times ${fmt(p.v1 - V)} + ${p.m2} \\times ${fmt(p.v2 - V)} = 0$. In this frame the total momentum is zero.` },
    ];
  },
};

/** Flow: an elastic collision solved in the centre-of-mass frame: V, the first body's velocity in that frame, then its velocity after. */
const elasticFlow: Generator<PairParams> = {
  id: 'clm-elastic-flow',
  sample: (rng, difficulty) => samplePair(rng, difficulty > 1),
  render: (p) => {
    const V = vcm(p);
    const u1 = n3(p.v1 - V);
    const after = n3(V - u1);
    const sign = (v: number) => `$${fmt(v)}$`;
    const options = (right: number, wrong: number[]): string[] => {
      const out = [fmt(right)];
      for (const w of [...wrong, right + 1, right - 1, right + 2]) if (out.length < 3 && exact(w, 3) && !out.includes(fmt(w))) out.push(fmt(w));
      return out.sort((a, b) => Number(a) - Number(b)).map((v) => `$${v}$`);
    };
    return {
      kind: 'flow',
      prompt: [say(`A ${kg(p.m1)} cart at ${signedMs(p.v1)} hits a ${kg(p.m2)} cart at ${signedMs(p.v2)}, positive to the right, and they bounce apart with no energy lost. What is the first cart’s velocity afterwards?`)],
      subject: "\\text{elastic: } u' \\to -u'",
      steps: [
        { id: 'V', ask: 'The centre of mass velocity:', branches: options(V, [n3((p.v1 + p.v2) / 2), n3(p.v1 - V)]).map((label) => ({ label, to: 'u' })) },
        { id: 'u', ask: 'The first cart’s velocity in that frame:', branches: options(u1, [n3(p.v1 + V), -u1]).map((label) => ({ label, to: 'after' })) },
        { id: 'after', ask: 'Reversed in that frame and brought back to the ground, its velocity after:', branches: options(after, [n3(V + u1), -p.v1]).map((label) => ({ label, outcome: 'In the centre-of-mass frame an elastic bounce just turns each velocity round.' })) },
      ],
      answer: [sign(V), sign(u1), sign(after)],
    };
  },
  solution: (p) => {
    const V = vcm(p);
    const u1 = p.v1 - V;
    return [
      { tex: `V = ${fmt(V)}` },
      { tex: `u_{1}' = ${p.v1} - ${fmt(V)} = ${fmt(u1)}` },
      { text: 'Elastic, so in this frame it comes back with the same speed:' },
      { tex: `v_{1}' = ${fmt(-u1)}` },
      { tex: `v_{1} = ${fmt(-u1)} + ${fmt(V)} = ${fmt(V - u1)}` },
    ];
  },
};

/** Table: kinetic energy split into the motion of the centre of mass and the motion about it. */
const comEnergyTable: Generator<{ pairs: PairParams[] }> = {
  id: 'clm-com-energy-table',
  sample: (rng, difficulty) => ({ pairs: [0, 1].map(() => samplePair(rng, difficulty > 1)) }),
  render: ({ pairs }) => {
    const total = (p: PairParams) => n3(0.5 * p.m1 * p.v1 ** 2 + 0.5 * p.m2 * p.v2 ** 2);
    const bulk = (p: PairParams) => n3(0.5 * (p.m1 + p.m2) * vcm(p) ** 2);
    const answer = pairs.flatMap((p) => [total(p), bulk(p), n3(total(p) - bulk(p))]);
    return {
      kind: 'table',
      prompt: [say(`Each row is a pair of carts: their masses $m$ in kilograms and velocities $v$ in $\\text{m s}^{-1}$. Fill in the total kinetic energy, the part $\\tfrac{1}{2}MV^{2}$ carried by the centre of mass, and the rest, all in joules.`)],
      columns: ['m', 'v', 'K', '\\tfrac{1}{2}MV^{2}', "K'"],
      rows: pairs.map((p) => [`${p.m1}, ${p.m2}`, `${p.v1}, ${p.v2}`, null, null, null]),
      bank: tidyBank(answer, pairs.flatMap((p) => [n3(total(p) + bulk(p)), n3(0.5 * (p.m1 + p.m2) * vcm(p))])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ pairs }) =>
    pairs.flatMap((p): SolutionStep[] => {
      const K = 0.5 * p.m1 * p.v1 ** 2 + 0.5 * p.m2 * p.v2 ** 2;
      const B = 0.5 * (p.m1 + p.m2) * vcm(p) ** 2;
      return [
        { tex: `K = \\tfrac{1}{2} \\times ${p.m1} \\times ${p.v1}^{2} + \\tfrac{1}{2} \\times ${p.m2} \\times ${p.v2 < 0 ? `(${p.v2})` : p.v2}^{2} = ${fmt(K)}` },
        { tex: `V = ${fmt(vcm(p))} \\qquad \\tfrac{1}{2}MV^{2} = ${fmt(B)}` },
        { tex: `K' = ${fmt(K)} - ${fmt(B)} = ${fmt(K - B)}` },
      ];
    }),
};

/* ================================================================
 * Rotating frames
 * ================================================================ */

interface SpinParams {
  m: number;
  /** Angular speed in rad/s and radius in metres. */
  w: number;
  r: number;
  what: string;
}

/** Who sits on the turning thing: a coin for a mass of grams, a person otherwise. */
const RIDERS = ['child on a roundabout', 'rider on a carousel', 'passenger on a spinning ride'];
const COIN = 'coin on a turntable';

/** Expression: the outward force felt in a rotating frame, m omega^2 r. */
const centrifugal: Generator<SpinParams> = {
  id: 'clm-centrifugal',
  sample: (rng, difficulty) =>
    until(
      () => {
        const m = rng.pick(difficulty > 1 ? [0.01, 0.02, 0.05, 25, 30, 40, 60] : [20, 25, 30, 40, 50]);
        return { m, w: rng.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]), r: rng.pick(m < 1 ? [0.1, 0.15, 0.2] : [0.5, 1, 1.5, 2, 2.5, 3, 4]), what: m < 1 ? COIN : rng.pick(RIDERS) };
      },
      (p) => exact(p.m * p.w * p.w * p.r, 3) && p.m * p.w * p.w * p.r >= 0.01,
    ),
  render: (p) =>
    typed(
      [say(`A ${kg(p.m)} ${p.what} sits ${metres(p.r)} from the centre, turning at $${fmt(p.w)}\\text{ rad s}^{-1}$. In the turning frame, what outward force seems to act on it, in newtons?`)],
      'F =',
      n3(p.m * p.w * p.w * p.r),
    ),
  solution: (p) => [
    { text: 'In the turning frame nothing seems to move, so an outward force must seem to balance the real inward one:' },
    { tex: `F = m\\omega^{2}r = ${fmt(p.m)} \\times ${fmt(p.w)}^{2} \\times ${fmt(p.r)} = ${fmt(p.m * p.w * p.w * p.r)}` },
  ],
  choices: (p) => {
    const F = n3(p.m * p.w * p.w * p.r);
    return numChoices(F, [n3(p.m * p.w * p.r), n3(p.m * p.w * p.w), n3(F * 9.8)], salted(p.m, p.w, p.r));
  },
};

const OMEGAS = [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

interface StationParams {
  /** Hard: the spin in rad/s, given. Easy: 0, since it is asked. */
  w: number;
  /** Easy: the radius in metres, given. Hard: 0, since it is asked. */
  r: number;
  /** The share of ordinary gravity felt on the rim. */
  f: number;
  find: 'w' | 'r';
}

const FEEL: Record<string, string> = { 1: 'ordinary gravity', 0.5: 'half of ordinary gravity', 0.25: 'a quarter of ordinary gravity', 0.2: 'a fifth of ordinary gravity', 0.1: 'a tenth of ordinary gravity' };
const feel = (f: number): string => FEEL[String(f)];

/** omega^2 r = fg, for the spin from a radius and the radius from a spin. */
const stationW = ({ r, f }: StationParams): number => Math.sqrt((f * 9.8) / r);
const stationR = ({ w, f }: StationParams): number => (f * 9.8) / (w * w);
const gFelt = (f: number): string => (f === 1 ? 'g' : `${fmt(f)}g`);

/** Expression: a spinning space station's artificial gravity, omega^2 r = fg: the spin for a radius (easy) or the radius for a spin (hard), each to 3 significant figures. */
const spaceStation: Generator<StationParams> = {
  id: 'clm-space-station',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? until(
          () => ({ w: rng.pick(OMEGAS), r: 0, f: rng.pick([1, 0.5, 0.25, 0.2, 0.1]), find: 'r' as const }),
          (p) => stationR(p) >= 5 && roundedWell(stationR(p), SF3),
        )
      : until(
          () => ({ w: 0, r: 10 * rng.int(2, 100), f: rng.pick([1, 0.5, 0.25, 0.2, 0.1]), find: 'w' as const }),
          (p) => roundedWell(stationW(p), SF3),
        ),
  render: (p) =>
    p.find === 'w'
      ? typedRounded(
          [say(`A ring-shaped space station of radius ${metres(p.r)} spins so that people standing on its rim feel ${feel(p.f)}. ${G_NOTE} What angular speed does it need, in $\\text{rad s}^{-1}$? ${askPrecision(SF3)}`)],
          '\\omega =',
          stationW(p),
          SF3,
        )
      : typedRounded(
          [say(`A ring-shaped space station spins at $${fmt(p.w)}\\text{ rad s}^{-1}$. ${G_NOTE} At what radius do people on the rim feel ${feel(p.f)}, in metres? ${askPrecision(SF3)}`)],
          'r =',
          stationR(p),
          SF3,
        ),
  solution: (p) =>
    p.find === 'w'
      ? [
          { text: `The floor must push people inwards with $m \\times ${gFelt(p.f)}$:` },
          { tex: `\\omega^{2}r = ${gFelt(p.f)}` },
          { tex: `\\omega^{2} = \\frac{${fmt(n3(p.f * 9.8))}}{${fmt(p.r)}} = ${dots((p.f * 9.8) / p.r, 5)}` },
          { tex: `\\omega = ${dots(stationW(p))}` },
          ...roundLines('\\omega', stationW(p), SF3),
        ]
      : [
          { tex: `\\omega^{2}r = ${gFelt(p.f)}` },
          { tex: `r = \\frac{${fmt(n3(p.f * 9.8))}}{${fmt(p.w)}^{2}} = ${dots(stationR(p), 3)}` },
          ...roundLines('r', stationR(p), SF3),
        ],
  choices: (p) => {
    const r = (x: number) => roundTo(x, SF3);
    return p.find === 'w'
      ? numChoices(r(stationW(p)), [r((p.f * 9.8) / p.r), r(Math.sqrt(9.8 / p.r)), r(Math.sqrt((p.f * 9.8) / p.r / 2))].filter((x) => x > 0), salted(p.r, p.f * 10))
      : numChoices(r(stationR(p)), [r((p.f * 9.8) / p.w), r(p.f * 9.8 * p.w * p.w), r(stationR(p) / 2)], salted(p.w * 100, p.f * 10 + 1));
  },
};

interface RotorParams {
  m: number;
  r: number;
  w: number;
  mu: number;
}

const STAYS = 'They stay up';
const SLIDES = 'They slide down';

/** Flow: the rotor ride: the wall's push m omega^2 r, the most friction mu times it, then whether it holds the rider up. */
const rotorFlow: Generator<RotorParams> = {
  id: 'clm-rotor-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: rng.pick([40, 50, 60, 70, 80]), r: rng.pick([2, 2.5, 3, 4, 5]), w: rng.pick([1, 1.5, 2, 2.5, 3, 3.5]), mu: rng.pick(difficulty > 1 ? [0.3, 0.4, 0.5, 0.6] : [0.4, 0.5]) }),
      (p) => {
        const N = p.m * p.w * p.w * p.r;
        return exact(N, 2) && exact(p.mu * N, 2) && Math.abs(p.mu * N - 9.8 * p.m) > 20;
      },
    ),
  render: (p) => {
    const N = n3(p.m * p.w * p.w * p.r);
    const F = n3(p.mu * N);
    const W = n3(9.8 * p.m);
    const why = 'Only friction holds them up, and it can be at most $\\mu$ times the push of the wall.';
    return {
      kind: 'flow',
      prompt: [say(`In a rotor ride a ${kg(p.m)} rider stands against the wall of a drum of radius ${metres(p.r)} spinning at $${fmt(p.w)}\\text{ rad s}^{-1}$. The floor drops away; the friction coefficient is $\\mu = ${fmt(p.mu)}$. ${G_NOTE}`)],
      subject: 'N = m\\omega^{2}r \\qquad F \\le \\mu N',
      steps: [
        { id: 'N', ask: 'The push of the wall, in newtons:', branches: forks(N, [n3(p.m * p.w * p.r), n3(N * 2), W], 10).map((label) => ({ label, to: 'F' })) },
        { id: 'F', ask: 'The most friction it can give, in newtons:', branches: forks(F, [N, n3(p.mu * W), n3(F * 2)], 10).map((label) => ({ label, to: 'verdict' })) },
        { id: 'verdict', ask: `Against their weight of ${`$${fmt(W)}\\text{ N}$`}:`, branches: [STAYS, SLIDES].map((label) => ({ label, outcome: why })) },
      ],
      answer: [`$${fmt(N)}$`, `$${fmt(F)}$`, F >= W ? STAYS : SLIDES],
    };
  },
  solution: (p) => [
    { tex: `N = ${p.m} \\times ${fmt(p.w)}^{2} \\times ${fmt(p.r)} = ${fmt(p.m * p.w * p.w * p.r)}` },
    { tex: `F_{\\max} = ${fmt(p.mu)} \\times ${fmt(p.m * p.w * p.w * p.r)} = ${fmt(p.mu * p.m * p.w * p.w * p.r)}` },
    { tex: `mg = ${p.m} \\times 9.8 = ${fmt(9.8 * p.m)}` },
  ],
};

interface RotorSpinParams {
  /** The drum's radius in metres, whole or a half. */
  r: number;
  mu: number;
  /** The rider's mass, which cancels. */
  m: number;
}

const ROTOR_STEP = 0.1;

/** The least spin that holds a rider up: omega^2 = g / (mu r). */
const rotorW = ({ r, mu }: RotorSpinParams): number => Math.sqrt(9.8 / (mu * r));

/** Slider: the least spin that holds a rider on a rotor wall, omega^2 = g / (mu r), to the nearest 0.1 rad/s. */
const rotorSlider: Generator<RotorSpinParams> = {
  id: 'clm-rotor-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({
        r: rng.pick([2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8]),
        mu: rng.pick(difficulty > 1 ? [0.15, 0.2, 0.25, 0.3, 0.35, 0.45, 0.6, 0.8] : [0.2, 0.25, 0.3, 0.4, 0.5]),
        m: 10 * rng.int(4, 9),
      }),
      (p) => rotorW(p) >= 1 && rotorW(p) <= 4.8 && Math.abs(rotorW(p) / ROTOR_STEP - Math.round(rotorW(p) / ROTOR_STEP)) <= 0.35,
    ),
  render: (p) => {
    const figure = track(0, 5, [], 'A scale of angular speeds in radians per second');
    return {
      kind: 'slider',
      prompt: [
        say(
          `A ${kg(p.m)} rider stands in a rotor ride of radius ${metres(p.r)}, with friction coefficient $\\mu = ${fmt(p.mu)}$ between rider and wall. ${G_NOTE} Slide to the least angular speed that keeps riders up when the floor drops, to the nearest $0.1\\text{ rad s}^{-1}$.`,
        ),
      ],
      min: 0,
      max: 5,
      step: ROTOR_STEP,
      answer: n3(Math.round(rotorW(p) / ROTOR_STEP) * ROTOR_STEP),
      readout: '\\omega = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [
    { text: 'Friction must at least hold the weight: $\\mu m\\omega^{2}r = mg$, and the mass cancels.' },
    { tex: `\\omega^{2} = \\frac{9.8}{${fmt(p.mu)} \\times ${fmt(p.r)}} = ${dots(9.8 / (p.mu * p.r))}` },
    { tex: `\\omega = ${dots(rotorW(p))}` },
    { text: `The nearest tenth is $${fmt(n3(Math.round(rotorW(p) / ROTOR_STEP) * ROTOR_STEP))}\\text{ rad s}^{-1}$.` },
  ],
};

/* ================================================================
 * Special relativity
 * ================================================================ */

/** Speeds with a tidy Lorentz factor: gamma as a fraction num/den. */
const SPEEDS = [
  { v: 0.6, num: 5, den: 4 },
  { v: 0.8, num: 5, den: 3 },
];
const GAMMAS = [1.25, 1.5, 2, 2.5, 4, 5, 8, 10];

interface DilationParams {
  /** Either a speed from SPEEDS, or a stated gamma. */
  speed: { v: number; num: number; den: number } | null;
  gamma: number;
  /** Proper time, in microseconds. */
  tau: number;
  find: 't' | 'tau';
}

const gammaOf = (p: DilationParams): number => (p.speed ? p.speed.num / p.speed.den : p.gamma);
const lab = (p: DilationParams): number => n3(gammaOf(p) * p.tau);
const moving = (p: DilationParams): string => (p.speed ? `at $${fmt(p.speed.v)}c$, where $\\gamma = \\frac{1}{\\sqrt{1 - ${fmt(p.speed.v)}^{2}}} = ${p.speed.den === 4 ? '1.25' : '\\tfrac{5}{3}'}$` : `so fast that $\\gamma = ${fmt(p.gamma)}$`);

const sampleDilation = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T; chance: (p: number) => boolean }, find: 't' | 'tau'): DilationParams =>
  until(
    () => {
      const speed = rng.chance(0.5) ? rng.pick(SPEEDS) : null;
      return { speed, gamma: speed ? 0 : rng.pick(GAMMAS), tau: rng.int(1, 30) * (speed ? speed.den : 1), find };
    },
    // Asked backwards, the Earth time is what the learner reads, so it is whole.
    (p) => exact(lab(p), 3) && lab(p) <= 300 && (find === 't' || (Number.isInteger(lab(p)) && lab(p) >= 2)),
  );

/** Expression: a moving clock runs slow: the time measured in the lab, gamma tau (easy), or the moving clock's own time (hard). */
const dilation: Generator<DilationParams> = {
  id: 'clm-dilation',
  sample: (rng, difficulty) => sampleDilation(rng, difficulty > 1 ? 'tau' : 't'),
  render: (p) =>
    p.find === 't'
      ? typed([say(`A clock on a spaceship ticks through $${fmt(p.tau)}\\text{ }\\mu\\text{s}$. The ship moves ${moving(p)}. How long does that take as measured on Earth, in microseconds?`)], 't =', lab(p))
      : typed([say(`On Earth, a ship's journey past two beacons takes $${fmt(lab(p))}\\text{ }\\mu\\text{s}$. The ship moves ${moving(p)}. How much time passes on the ship's own clock, in microseconds?`)], '\\tau =', p.tau),
  solution: (p) =>
    p.find === 't'
      ? [{ tex: `t = \\gamma\\tau = ${fmt(gammaOf(p))} \\times ${fmt(p.tau)} = ${fmt(lab(p))}` }]
      : [{ tex: `\\tau = \\frac{t}{\\gamma} = \\frac{${fmt(lab(p))}}{${p.speed && p.speed.den === 3 ? '5/3' : fmt(gammaOf(p))}} = ${fmt(p.tau)}` }],
  choices: (p) => (p.find === 't' ? numChoices(lab(p), [n3(p.tau / gammaOf(p)), n3(p.tau * gammaOf(p) * gammaOf(p)), p.tau], salted(p.tau, gammaOf(p))) : numChoices(p.tau, [lab(p), n3(lab(p) * gammaOf(p)), n3(p.tau + 1)], salted(p.tau, gammaOf(p), 1))),
};

interface GammaRow {
  gamma: number;
  tau: number;
  blank: 'gamma' | 'tau' | 't';
}

/** Table: gamma, the moving clock's time and the lab time; easy blanks the lab time, hard any. */
const gammaTable: Generator<{ rows: GammaRow[] }> = {
  id: 'clm-gamma-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ rows: [0, 1, 2].map((): GammaRow => ({ gamma: rng.pick(GAMMAS), tau: rng.int(1, 20), blank: difficulty > 1 ? rng.pick(['gamma', 'tau', 't'] as const) : 't' })) }),
      ({ rows }) => new Set(rows.map((r) => r.gamma * r.tau)).size === 3 && new Set(rows.map((r) => r.gamma)).size > 1,
    ),
  render: ({ rows }) => {
    const value = (r: GammaRow) => (r.blank === 'gamma' ? r.gamma : r.blank === 'tau' ? r.tau : n3(r.gamma * r.tau));
    const answer = rows.map(value);
    return {
      kind: 'table',
      prompt: [say('Each row is a moving clock: its Lorentz factor $\\gamma$, the time $\\tau$ it ticks through, and the time $t$ that takes on Earth, both in microseconds. Fill in the gaps.')],
      columns: ['\\gamma', '\\tau', 't'],
      rows: rows.map((r) => [r.blank === 'gamma' ? null : fmt(r.gamma), r.blank === 'tau' ? null : fmt(r.tau), r.blank === 't' ? null : fmt(r.gamma * r.tau)]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3(r.tau / r.gamma), n3(r.gamma + r.tau), n3(r.gamma * r.gamma * r.tau)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 't' ? { tex: `t = ${fmt(r.gamma)} \\times ${r.tau} = ${fmt(r.gamma * r.tau)}` } : r.blank === 'tau' ? { tex: `\\tau = \\frac{${fmt(r.gamma * r.tau)}}{${fmt(r.gamma)}} = ${r.tau}` } : { tex: `\\gamma = \\frac{${fmt(r.gamma * r.tau)}}{${r.tau}} = ${fmt(r.gamma)}` },
    ),
};

interface MuonParams {
  speed: { v: number; num: number; den: number };
  /** Lifetime in its own frame, microseconds. */
  tau: number;
}

/** Flow: a fast particle's lifetime stretched by gamma, then how far it gets in the lab. */
const muonFlow: Generator<MuonParams> = {
  id: 'clm-muon-flow',
  sample: (rng, difficulty) => {
    const speed = difficulty > 1 ? rng.pick(SPEEDS) : SPEEDS[0];
    return { speed, tau: speed.den * rng.int(1, 30) };
  },
  render: (p) => {
    const g = p.speed.num / p.speed.den;
    const t = n3(g * p.tau);
    const perMicro = n3(p.speed.v * 300);
    const d = n3(perMicro * t);
    return {
      kind: 'flow',
      prompt: [say(`An unstable particle lasts $${p.tau}\\text{ }\\mu\\text{s}$ in its own frame. It flies through a lab at $${fmt(p.speed.v)}c$, with $c = 3 \\times 10^{8}\\text{ m s}^{-1}$, which is $300\\text{ m}$ per microsecond. How far does it get before it decays?`)],
      subject: 't = \\gamma\\tau \\qquad d = vt',
      steps: [
        { id: 'g', ask: '$\\gamma$ at this speed:', branches: [p.speed.den === 4 ? '$1.25$' : '$\\tfrac{5}{3}$', p.speed.den === 4 ? '$\\tfrac{5}{3}$' : '$1.25$', '$1.6$'].sort().map((label) => ({ label, to: 't' })) },
        { id: 't', ask: 'Its lifetime in the lab, in microseconds:', branches: forks(t, [p.tau, n3(p.tau / g), n3(t * g)], 1).map((label) => ({ label, to: 'd' })) },
        { id: 'd', ask: 'So the distance, in metres:', branches: forks(d, [n3(perMicro * p.tau), n3(300 * t), n3(d / g)], 10).map((label) => ({ label, outcome: 'Without time dilation it would get only $v\\tau$, and cosmic-ray muons would never reach the ground.' })) },
      ],
      answer: [p.speed.den === 4 ? '$1.25$' : '$\\tfrac{5}{3}$', `$${fmt(t)}$`, `$${fmt(d)}$`],
    };
  },
  solution: (p) => {
    const g = p.speed.num / p.speed.den;
    return [
      { tex: `\\gamma = \\frac{1}{\\sqrt{1 - ${fmt(p.speed.v)}^{2}}} = \\frac{1}{${fmt(Math.sqrt(1 - p.speed.v ** 2))}} = ${p.speed.den === 4 ? '1.25' : '\\tfrac{5}{3}'}` },
      { tex: `t = ${p.speed.den === 4 ? '1.25' : '\\tfrac{5}{3}'} \\times ${p.tau} = ${fmt(g * p.tau)}` },
      { tex: `d = ${fmt(p.speed.v * 300)} \\times ${fmt(g * p.tau)} = ${fmt(p.speed.v * 300 * g * p.tau)}` },
    ];
  },
};

interface TwinParams {
  speed: { v: number; num: number; den: number };
  /** Distance to the star, light years. */
  L: number;
}

/** Tree: the twin trip: Earth's years for the round trip, the traveller's years, and the difference in age. */
const twinTree: Generator<TwinParams> = {
  id: 'clm-twin-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ speed: difficulty > 1 ? rng.pick(SPEEDS) : SPEEDS[0], L: rng.int(1, 90) }),
      (p) => exact((2 * p.L) / p.speed.v, 3) && exact(((2 * p.L) / p.speed.v) * (p.speed.den / p.speed.num), 3),
    ),
  render: (p) => {
    const earth = n3((2 * p.L) / p.speed.v);
    const ship = n3((earth * p.speed.den) / p.speed.num);
    return {
      kind: 'tree',
      prompt: [say(`A twin flies to a star ${p.L} light years away and straight back at $${fmt(p.speed.v)}c$. Ignore the turning round.`), say('Find the years that pass on Earth, the years the traveller ages, and the difference in their ages.')],
      expression: '\\tau = \\frac{t}{\\gamma}',
      nodes: [
        { id: 't', from: [] },
        { id: '\\tau', from: ['t'] },
        { id: '\\Delta', from: ['t', '\\tau'] },
      ],
      bank: tidyBank([earth, ship, n3(earth - ship)], [n3(p.L / p.speed.v), n3((earth * p.speed.num) / p.speed.den), 2 * p.L]),
      answer: [earth, ship, n3(earth - ship)].map(fmt),
    };
  },
  solution: (p) => {
    const earth = (2 * p.L) / p.speed.v;
    const ship = (earth * p.speed.den) / p.speed.num;
    return [
      { tex: `t = \\frac{2 \\times ${p.L}}{${fmt(p.speed.v)}} = ${fmt(earth)}` },
      { tex: `\\tau = \\frac{${fmt(earth)}}{${p.speed.den === 4 ? '1.25' : '5/3'}} = ${fmt(ship)}` },
      { tex: `\\Delta = ${fmt(earth)} - ${fmt(ship)} = ${fmt(earth - ship)}` },
    ];
  },
};

interface ContractParams {
  speed: { v: number; num: number; den: number } | null;
  gamma: number;
  /** Rest length, metres. */
  L0: number;
  what: string;
}

const contracted = (p: ContractParams): number => n3(p.L0 / (p.speed ? p.speed.num / p.speed.den : p.gamma));

/** Expression: length contraction, L = L0 / gamma. */
const contraction: Generator<ContractParams> = {
  id: 'clm-contraction',
  sample: (rng, difficulty) =>
    until(
      () => {
        const speed = difficulty > 1 ? rng.pick(SPEEDS) : rng.chance(0.5) ? SPEEDS[0] : null;
        return { speed, gamma: speed ? 0 : rng.pick(GAMMAS), L0: 5 * rng.int(2, 80), what: rng.pick(['spaceship', 'rocket', 'space station module', 'probe']) };
      },
      (p) => exact(contracted(p), 3),
    ),
  render: (p) =>
    typed(
      [say(`A ${p.what} is ${metres(p.L0)} long when at rest. It flies past Earth ${p.speed ? `at $${fmt(p.speed.v)}c$` : `so fast that $\\gamma = ${fmt(p.gamma)}$`}. How long is it as measured from Earth, in metres?`)],
      'L =',
      contracted(p),
    ),
  solution: (p) => [
    ...(p.speed ? [{ tex: `\\gamma = \\frac{1}{\\sqrt{1 - ${fmt(p.speed.v)}^{2}}} = ${p.speed.den === 4 ? '1.25' : '\\tfrac{5}{3}'}` }] : []),
    { tex: `L = \\frac{L_{0}}{\\gamma} = ${fmt(contracted(p))}` },
  ],
  choices: (p) => {
    const g = p.speed ? p.speed.num / p.speed.den : p.gamma;
    return numChoices(contracted(p), [n3(p.L0 * g), p.L0, n3(p.L0 / g / g)], salted(p.L0, g));
  },
};

interface AddParams {
  /** Speeds as fractions of c. */
  a: number;
  b: number;
  /** Which scene the speeds are dressed in. */
  scene: number;
}

const added = ({ a, b }: AddParams): number => n3((a + b) / (1 + a * b));

/** Speeds in twentieths of c, 0.05 to 0.95. */
const TWENTIETHS = Array.from({ length: 19 }, (_, i) => n3((i + 1) / 20));

const ADD_SCENES: [string, string, string][] = [
  ['A ship passes Earth at', 'and fires a probe forwards at', 'Earth'],
  ['A rocket leaves a space station at', 'and launches a drone forwards at', 'the station'],
  ['A particle crosses a lab at', 'and emits a fragment forwards at', 'the lab'],
  ['A cruiser passes a planet at', 'and fires a missile forwards at', 'the planet'],
  ['A courier ship passes a beacon at', 'and throws a capsule forwards at', 'the beacon'],
  ['A comet passes the Sun at', 'and sheds a chunk forwards at', 'the Sun'],
];

/** Expression: relativistic velocity addition, (u + v)/(1 + uv/c^2), in fractions of c; only pairs whose sum comes out exact. */
const velocityAdd: Generator<AddParams> = {
  id: 'clm-velocity-add',
  sample: (rng) => until(() => ({ a: rng.pick(TWENTIETHS), b: rng.pick(TWENTIETHS), scene: rng.int(0, ADD_SCENES.length - 1) }), (p) => exact(added(p), 3)),
  render: (p) => {
    const [first, second, where] = ADD_SCENES[p.scene];
    return typed(
      [say(`${first} $${fmt(p.a)}c$ ${second} $${fmt(p.b)}c$ relative to itself. How fast does that move relative to ${where}, as a fraction of $c$?`)],
      'u =',
      added(p),
    );
  },
  solution: (p) => [
    { tex: `u = \\frac{${fmt(p.a)} + ${fmt(p.b)}}{1 + ${fmt(p.a)} \\times ${fmt(p.b)}}` },
    { tex: `u = \\frac{${fmt(p.a + p.b)}}{${fmt(1 + p.a * p.b)}} = ${fmt(added(p))}` },
  ],
  choices: (p) => numChoices(added(p), [n3(p.a + p.b), n3((p.a + p.b) / 2), n3(Math.abs(p.a - p.b))], salted(p.a * 100, p.b * 100 + p.scene)),
};

const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
/** A fraction num/den in lowest terms, as TeX. */
const fracTex = (num: number, den: number): string => {
  const k = gcd(num, den);
  return den / k === 1 ? `${num / k}` : `\\tfrac{${num / k}}{${den / k}}`;
};

interface AddFlowParams {
  /** Speeds in twentieths of c. */
  i: number;
  j: number;
}

/** Flow: adding two speeds: the everyday sum, then the relativistic one as a fraction, then whether it beats light. */
const addFlow: Generator<AddFlowParams> = {
  id: 'clm-add-flow',
  sample: (rng) => until(() => ({ i: rng.int(6, 19), j: rng.int(6, 19) }), (p) => p.i + p.j > 20),
  render: (p) => {
    const naive = n3((p.i + p.j) / 20);
    // (i/20 + j/20) / (1 + ij/400) = 20(i + j) / (400 + ij)
    const right = { v: (20 * (p.i + p.j)) / (400 + p.i * p.j), tex: fracTex(20 * (p.i + p.j), 400 + p.i * p.j) };
    const slips = [
      { v: (20 * (p.i + p.j)) / (400 + 2 * p.i * p.j), tex: fracTex(20 * (p.i + p.j), 400 + 2 * p.i * p.j) },
      { v: (20 * Math.abs(p.i - p.j)) / (400 - p.i * p.j), tex: fracTex(20 * Math.abs(p.i - p.j), 400 - p.i * p.j) },
      { v: (p.i + p.j) / 40, tex: fracTex(p.i + p.j, 40) },
      { v: (400 + p.i * p.j) / (20 * (p.i + p.j) + 400), tex: fracTex(400 + p.i * p.j, 20 * (p.i + p.j) + 400) },
    ].filter((o, k, all) => Math.abs(o.v - right.v) > 1e-9 && o.v > 0 && all.findIndex((q) => Math.abs(q.v - o.v) < 1e-9) === k);
    const uOptions = [right, ...slips.slice(0, 3)].sort((x, y) => x.v - y.v).map((o) => `$${o.tex}$`);
    const NO = 'No: it is still below $c$';
    const YES = 'Yes: it is faster than $c$';
    return {
      kind: 'flow',
      prompt: [say(`Two ships fly away from Earth in opposite directions, at $${fmt(p.i / 20)}c$ and $${fmt(p.j / 20)}c$. How fast does one see the other move?`)],
      subject: 'u = \\frac{u_{1} + u_{2}}{1 + u_{1}u_{2}}',
      steps: [
        { id: 'naive', ask: 'The everyday answer, adding the speeds, in units of $c$:', branches: forks(naive, [n3(Math.abs(p.i - p.j) / 20), n3(naive / 2)], 0.05).map((label) => ({ label, to: 'u' })) },
        { id: 'u', ask: 'The relativistic answer, in units of $c$:', branches: uOptions.map((label) => ({ label, to: 'fast' })) },
        { id: 'fast', ask: 'Does either see the other beat light?', branches: [YES, NO].map((label) => ({ label, outcome: 'However fast two speeds below $c$ are, they always combine to less than $c$.' })) },
      ],
      answer: [`$${fmt(naive)}$`, `$${right.tex}$`, NO],
    };
  },
  solution: (p) => [
    { tex: `${fmt(p.i / 20)} + ${fmt(p.j / 20)} = ${fmt(n3((p.i + p.j) / 20))}` },
    { tex: `u = \\frac{${fmt(n3((p.i + p.j) / 20))}}{1 + ${fmt(p.i / 20)} \\times ${fmt(p.j / 20)}}` },
    { tex: `u = \\frac{${fmt(n3((p.i + p.j) / 20))}}{${fmt(n3(1 + (p.i * p.j) / 400))}} = ${fracTex(20 * (p.i + p.j), 400 + p.i * p.j)}` },
  ],
};

interface PassParams {
  speed: { v: number; num: number; den: number };
  /** Rest length in metres. */
  L0: number;
}

/** Tree: a fast ship passing a station: gamma, its length from the station, and the time it takes to pass, in microseconds. */
const passTree: Generator<PassParams> = {
  id: 'clm-pass-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ speed: difficulty > 1 ? rng.pick(SPEEDS) : SPEEDS[0], L0: 45 * rng.int(1, 60) }),
      (p) => exact((p.L0 * p.speed.den) / p.speed.num, 3) && exact((p.L0 * p.speed.den) / p.speed.num / (p.speed.v * 300), 3),
    ),
  render: (p) => {
    const g = p.speed.num / p.speed.den;
    const L = n3(p.L0 / g);
    const t = n3(L / (p.speed.v * 300));
    const gTok = p.speed.den === 4 ? '1.25' : '\\tfrac{5}{3}';
    return {
      kind: 'tree',
      prompt: [say(`A ship ${metres(p.L0)} long at rest passes a space station at $${fmt(p.speed.v)}c$; light covers $300\\text{ m}$ per microsecond.`), say('Find $\\gamma$, the ship’s length measured from the station in metres, and how long it takes to pass one point there, in microseconds.')],
      expression: 'L = \\frac{L_{0}}{\\gamma}',
      nodes: [
        { id: '\\gamma', from: [] },
        { id: 'L', from: ['\\gamma'] },
        { id: 't', from: ['L'] },
      ],
      bank: [...new Set([gTok, fmt(L), fmt(t), p.speed.den === 4 ? '\\tfrac{5}{3}' : '1.25', fmt(p.L0), fmt(n3(p.L0 / (p.speed.v * 300)))])].sort(),
      answer: [gTok, fmt(L), fmt(t)],
    };
  },
  solution: (p) => {
    const g = p.speed.num / p.speed.den;
    return [
      { tex: `\\gamma = \\frac{1}{\\sqrt{1 - ${fmt(p.speed.v)}^{2}}} = ${p.speed.den === 4 ? '1.25' : '\\tfrac{5}{3}'}` },
      { tex: `L = \\frac{${p.L0}}{\\gamma} = ${fmt(p.L0 / g)}` },
      { tex: `t = \\frac{${fmt(p.L0 / g)}}{${fmt(p.speed.v * 300)}} = ${fmt(p.L0 / g / (p.speed.v * 300))}` },
    ];
  },
};

export const classicalFramesGenerators = [
  trainTable,
  riverTree,
  driftSlider,
  planeWind,
  comVelocity,
  comFrameTree,
  elasticFlow,
  comEnergyTable,
  centrifugal,
  spaceStation,
  rotorFlow,
  rotorSlider,
  dilation,
  gammaTable,
  muonFlow,
  twinTree,
  contraction,
  velocityAdd,
  addFlow,
  passTree,
];

export const classicalFramesInternals = { vcm, added };
