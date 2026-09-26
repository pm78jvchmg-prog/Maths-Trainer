/**
 * Classical Mechanics, level 2: Motion in Two Dimensions (`clm-l2`).
 *
 * Projectiles launched horizontally and at an angle, after OpenStax
 * University Physics 4.3; angular speed and angular acceleration, after 10.1
 * and 10.2; and centripetal acceleration, after 4.4. Kinematics has no
 * projectiles, so this is new ground, but its suvat equations are used, not
 * taught again.
 *
 * A sideways launch starts from a height a textbook would print, a whole
 * number of metres, and asks its time to 2 decimal places and distances and
 * speeds to 1, redrawn when a value sits near a rounding edge. An angled
 * launch has whole parts, or a whole speed at an angle from a Pythagorean
 * triple so both parts are whole; its times are asked to 2 decimal places and
 * its height and range to 1, the same whichever way the learner carries them.
 * Radii, speeds and accelerations are whole or one decimal place (radii under
 * a metre may have two), and a quotient that does not end is asked to a
 * stated precision. Angular work is done in revolutions per second, with
 * radians per second asked as a whole multiple of pi.
 */
import type { ChoiceOption, Generator, KeypadKey, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { steered, turned } from './parametricImplicit';
import { WORKING_KEYS } from './workingKeys';
import {
  G_NOTE,
  askPrecision,
  exact,
  fixed,
  fmt,
  forks,
  metres,
  ms,
  ms2,
  numChoices,
  roundTo,
  roundedWell,
  salted,
  say,
  secs,
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

/* ================================================================
 * Launched horizontally
 * ================================================================ */

const LEDGES = ['a cliff top', 'a flat roof', 'a bridge', 'a table top', 'a wall', 'a balcony'];
const THROWN = ['ball', 'stone', 'marble', 'parcel', 'dart'];

/** Times are asked to 2 decimal places, speeds and distances to 1. */
const T_DP: Precision = { dp: 2 };
const D_DP: Precision = { dp: 1 };

/** Seconds to fall h metres from rest. */
const fallTime = (h: number): number => Math.sqrt(h / 4.9);

/** An unrounded value on a working line: 3.4993..., or the value itself when it ends. */
const dots = (value: number, places = 4): string => (exact(value, places) ? fmt(value) : `${value.toFixed(places)}\\ldots`);

/**
 * A fall whose time, landing speed and distance out each round cleanly, and
 * round the same whether the learner carried the exact time or the rounded
 * one into the next line.
 */
const fallRoundsWell = (h: number, u: number): boolean => {
  const t = fallTime(h);
  const carried = roundTo(t, T_DP);
  return (
    roundedWell(t, T_DP) &&
    roundedWell(u * t, D_DP) &&
    roundedWell(9.8 * t, D_DP) &&
    roundTo(u * carried, D_DP) === roundTo(u * t, D_DP) &&
    roundTo(9.8 * carried, D_DP) === roundTo(9.8 * t, D_DP)
  );
};

/** The working for the fall time, ending on its rounded value. */
const timeLines = (h: number): SolutionStep[] => [
  { tex: `${fmt(h)} = 4.9t^{2}` },
  { tex: `t = \\sqrt{${fmt(h)} \\div 4.9} = ${dots(fallTime(h))}` },
  { text: 'To 2 decimal places:' },
  { tex: `t = ${fixed(fallTime(h), T_DP)}` },
];

/** A bank of rounded tokens: the answer's, then distinct extras, sorted by value. */
const fixedBank = (answer: string[], extras: string[], spare = 3): string[] => {
  const out = [...answer];
  for (const token of extras) {
    if (out.length - answer.length >= spare) break;
    if (Number(token) > 0 && !out.some((o) => Number(o) === Number(token))) out.push(token);
  }
  return out.sort((x, y) => Number(x) - Number(y));
};

interface FallParams {
  where: string;
  thing: string;
  /** Height in metres: whole, or one decimal place when hard. */
  h: number;
  u: number;
  find: 't' | 'R';
}

/** Expression: time to fall from a height when launched sideways (easy), or how far out it lands (hard). */
const fallTimeGen: Generator<FallParams> = {
  id: 'clm-fall-time',
  sample: (rng, difficulty) =>
    until(
      () => ({
        where: rng.pick(LEDGES),
        thing: rng.pick(THROWN),
        h: difficulty > 1 ? rng.int(20, 800) / 10 : rng.int(2, 80),
        u: rng.int(2, 25),
        find: difficulty > 1 ? ('R' as const) : ('t' as const),
      }),
      ({ h, u }) => fallRoundsWell(h, u),
    ),
  render: ({ where, thing, h, u, find }) => {
    const t = fallTime(h);
    const setup = `A ${thing} is thrown horizontally at ${ms(u)} from ${where} ${metres(h)} above level ground. ${G_NOTE}`;
    return find === 't'
      ? typedRounded([say(`${setup} How long does it take to land, in seconds? ${askPrecision(T_DP)}`)], 't =', t, T_DP)
      : typedRounded(
          [say(`${setup} How far from the foot of ${where.replace(/^a /, 'the ')} does it land, in metres? ${askPrecision(D_DP)}`)],
          'R =',
          u * t,
          D_DP,
        );
  },
  solution: ({ h, u, find }) => {
    const t = fallTime(h);
    return [
      { text: 'Downwards it starts at rest, whatever the sideways speed:' },
      ...(find === 't'
        ? timeLines(h)
        : [
            { tex: `${fmt(h)} = 4.9t^{2}` },
            { tex: `t = \\sqrt{${fmt(h)} \\div 4.9} = ${dots(t)}` },
            { text: 'Sideways it keeps its speed the whole time:' },
            { tex: `R = ${u} \\times ${dots(t)} = ${dots(u * t, 3)}` },
            { text: 'To 1 decimal place:' },
            { tex: `R = ${fixed(u * t, D_DP)}` },
          ]),
    ];
  },
  choices: ({ h, u, find }) => {
    const t = fallTime(h);
    const r = (v: number, p: Precision) => roundTo(v, p);
    return find === 't'
      ? numChoices(r(t, T_DP), [r(h / 4.9, T_DP), r(2 * t, T_DP), r(h / 9.8, T_DP)], salted(h * 10, u))
      : numChoices(r(u * t, D_DP), [r((u * h) / 4.9, D_DP), r(2 * u * t, D_DP), r(u * Math.sqrt(h / 9.8), D_DP)], salted(u, h * 10));
  },
};

/** Tree: a sideways launch: the time to land, the vertical speed on landing, and the range. */
const horizTree: Generator<FallParams> = {
  id: 'clm-horiz-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({
        where: rng.pick(LEDGES),
        thing: rng.pick(THROWN),
        h: difficulty > 1 ? rng.int(10, 120) : rng.int(2, 60),
        u: difficulty > 1 ? rng.int(8, 30) : rng.int(2, 15),
        find: 'R' as const,
      }),
      ({ h, u }) => fallRoundsWell(h, u),
    ),
  render: ({ where, thing, h, u }) => {
    const t = fallTime(h);
    const answer = [fixed(t, T_DP), fixed(9.8 * t, D_DP), fixed(u * t, D_DP)];
    return {
      kind: 'tree',
      prompt: [
        say(`A ${thing} is thrown horizontally at ${ms(u)} from ${where} ${metres(h)} up. ${G_NOTE}`),
        say('Find the time in the air to 2 decimal places, then the downward speed as it lands and how far out it lands, each to 1 decimal place.'),
      ],
      expression: 'h = \\tfrac{1}{2}gt^{2}',
      nodes: [
        { id: 't', from: [] },
        { id: 'vy', from: ['t'] },
        { id: 'R', from: ['t'] },
      ],
      bank: fixedBank(answer, [
        fixed(h / 4.9, T_DP),
        fixed(4.9 * t, D_DP),
        fixed((u * h) / 4.9, D_DP),
        fixed(2 * t, T_DP),
        fixed(9.8 * t + 1, D_DP),
        fixed(u * t - 1, D_DP),
      ]),
      answer,
    };
  },
  solution: ({ h, u }) => {
    const t = fallTime(h);
    return [
      ...timeLines(h),
      { tex: `v_{y} = 9.8 \\times ${fixed(t, T_DP)} = ${fixed(9.8 * t, D_DP)}` },
      { tex: `R = ${u} \\times ${fixed(t, T_DP)} = ${fixed(u * t, D_DP)}` },
      { text: 'Each to 1 decimal place, the same whether you carry the rounded time or the exact one.' },
    ];
  },
};

interface LandParams {
  thing: string;
  /** Height in whole metres. */
  h: number;
  /** Easy: the launch speed, whole. Hard: the landing distance, whole. */
  given: number;
  /** Hard: the landing point is given and the speed is asked. */
  findSpeed: boolean;
}

const LAND_SPAN = 60;
const LAND_STEP = 0.5;

/** The slider notch a value sits nearest, and whether it sits well clear of the midpoint between two. */
const notch = (value: number): number => Math.round(value / LAND_STEP) * LAND_STEP;
const notchedWell = (value: number): boolean => Math.abs(value / LAND_STEP - Math.round(value / LAND_STEP)) <= 0.35;

/** Slider: where a sideways launch lands along the ground (easy), or the speed that lands it at a mark (hard). */
const horizSlider: Generator<LandParams> = {
  id: 'clm-horiz-slider',
  sample: (rng, difficulty) =>
    until(
      () => {
        const findSpeed = difficulty > 1;
        return { thing: rng.pick(THROWN), h: rng.int(2, 70), given: findSpeed ? rng.int(4, LAND_SPAN) : rng.int(2, 30), findSpeed };
      },
      ({ h, given, findSpeed }) => {
        const t = fallTime(h);
        const target = findSpeed ? given / t : given * t;
        return target >= 4 && target <= (findSpeed ? 40 : LAND_SPAN) && notchedWell(target);
      },
    ),
  render: ({ thing, h, given, findSpeed }) => {
    const t = fallTime(h);
    if (findSpeed) {
      const figure = track(0, 40, [], 'A scale of launch speeds in metres per second');
      return {
        kind: 'slider',
        prompt: [say(`A ${thing} thrown horizontally from ${metres(h)} up must land ${metres(given)} out from the foot. ${G_NOTE} Slide to the launch speed needed, to the nearest $0.5\\text{ m s}^{-1}$.`)],
        min: 0,
        max: 40,
        step: LAND_STEP,
        answer: notch(given / t),
        readout: 'u = {v}',
        figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
      };
    }
    const figure = track(0, LAND_SPAN, [{ at: 0, name: 'foot' }], 'Level ground marked in metres out from the foot of the drop');
    return {
      kind: 'slider',
      prompt: [say(`A ${thing} is thrown horizontally at ${ms(given)} from ${metres(h)} up. ${G_NOTE} Slide to where it lands, to the nearest $0.5\\text{ m}$ from the foot.`)],
      min: 0,
      max: LAND_SPAN,
      step: LAND_STEP,
      answer: notch(given * t),
      readout: 'R = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: ({ h, given, findSpeed }) => {
    const t = fallTime(h);
    return [
      { tex: `t = \\sqrt{${fmt(h)} \\div 4.9} = ${dots(t)}` },
      findSpeed
        ? { tex: `u = ${fmt(given)} \\div ${dots(t)} = ${dots(given / t, 2)}` }
        : { tex: `R = ${fmt(given)} \\times ${dots(t)} = ${dots(given * t, 2)}` },
      { text: `The nearest half is $${fmt(notch(findSpeed ? given / t : given * t))}$.` },
    ];
  },
};

interface ClearParams {
  /** Height in whole metres. */
  h: number;
  u: number;
  /** The gap to clear, in whole metres, at least a metre from the range. */
  D: number;
  hard: boolean;
}

/** Flow: does a rider leaving a ramp sideways clear a gap? Time down, distance out, then the verdict. */
const horizFlow: Generator<ClearParams> = {
  id: 'clm-horiz-flow',
  sample: (rng, difficulty) =>
    until(
      () => {
        const h = rng.int(2, 45);
        const u = rng.int(4, 20);
        const R = u * fallTime(h);
        const D = rng.chance(0.5) ? Math.ceil(R) + rng.int(1, 5) : Math.floor(R) - rng.int(1, 5);
        return { h, u, D, hard: difficulty > 1 };
      },
      ({ h, u, D }) => D >= 2 && fallRoundsWell(h, u),
    ),
  render: ({ h, u, D, hard }) => {
    const t = fallTime(h);
    const R = roundTo(u * t, D_DP);
    const clears = R > D;
    const YES = `Yes, by $${fixed(R - D, D_DP)}\\text{ m}$`;
    const NO = 'No, it lands short';
    const fake = `Yes, by $${fixed(Math.abs(R - D) + 1, D_DP)}\\text{ m}$`;
    const tBranches = [fixed(t, T_DP), fixed(h / 4.9, T_DP), fixed(2 * t, T_DP), fixed(h / 9.8, T_DP), fixed(t + 0.5, T_DP)];
    const RBranches = [fixed(R, D_DP), fixed((u * h) / 4.9, D_DP), fixed(2 * R, D_DP), fixed(R / 2, D_DP), fixed(R + 2, D_DP)];
    const three = (tokens: string[]) =>
      [...new Set(tokens.filter((v) => Number(v) > 0))].slice(0, 3).sort((x, y) => Number(x) - Number(y)).map((v) => `$${v}$`);
    return {
      kind: 'flow',
      prompt: [
        say(
          hard
            ? `A stunt rider leaves a level ramp at ${ms(u)} and drops ${metres(h)} to a landing platform. The platform starts ${metres(D)} out. ${G_NOTE} Does the rider reach it?`
            : `A ball rolls off a ${metres(h)} high table at ${ms(u)}. A bucket stands with its near edge ${metres(D)} from the table's foot. ${G_NOTE} Does the ball get past the near edge?`,
        ),
      ],
      subject: 'h = \\tfrac{1}{2}gt^{2} \\qquad R = ut',
      steps: [
        { id: 't', ask: 'Time to fall, in seconds, to 2 decimal places:', branches: three(tBranches).map((label) => ({ label, to: 'R' })) },
        { id: 'R', ask: 'Distance out when it lands, in metres, to 1 decimal place:', branches: three(RBranches).map((label) => ({ label, to: 'verdict' })) },
        {
          id: 'verdict',
          ask: `Compare with the $${D}\\text{ m}$:`,
          branches: [
            { label: clears ? YES : fake, outcome: 'Sideways speed never changes; only the fall time limits the distance.' },
            { label: NO, outcome: 'Sideways speed never changes; only the fall time limits the distance.' },
          ],
        },
      ],
      answer: [`$${fixed(t, T_DP)}$`, `$${fixed(R, D_DP)}$`, clears ? YES : NO],
    };
  },
  solution: ({ h, u, D }) => {
    const t = fallTime(h);
    const R = roundTo(u * t, D_DP);
    return [
      ...timeLines(h),
      { tex: `R = ${u} \\times ${fixed(t, T_DP)} = ${fixed(R, D_DP)}` },
      { text: R > D ? `More than ${D} m, so it gets there.` : `Less than ${D} m, so it falls short.` },
    ];
  },
};

/* ================================================================
 * Launched at an angle
 * ================================================================ */

interface Triangle {
  o: number;
  a: number;
  h: number;
}

const EASY_TRI: Triangle[] = [
  { o: 3, a: 4, h: 5 },
  { o: 4, a: 3, h: 5 },
];
const ALL_TRI: Triangle[] = [
  ...EASY_TRI,
  { o: 5, a: 12, h: 13 },
  { o: 12, a: 5, h: 13 },
  { o: 8, a: 15, h: 17 },
  { o: 15, a: 8, h: 17 },
  { o: 7, a: 24, h: 25 },
];

interface LaunchRow {
  tri: Triangle;
  k: number;
}

/** Table: a launch speed and angle (as its tangent) split into horizontal and vertical parts. */
const launchTable: Generator<{ rows: LaunchRow[] }> = {
  id: 'clm-launch-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ rows: [0, 1, 2].map(() => ({ tri: rng.pick(difficulty > 1 ? ALL_TRI : EASY_TRI), k: rng.int(1, difficulty > 1 ? 4 : 6) })) }),
      ({ rows }) => new Set(rows.map((r) => r.tri.h * r.k)).size === 3,
    ),
  render: ({ rows }) => {
    const answer = rows.flatMap(({ tri, k }) => [tri.a * k, tri.o * k]);
    return {
      kind: 'table',
      prompt: [say('Each row is a launch at speed $u$, in $\\text{m s}^{-1}$, at an angle $\\alpha$ above the horizontal. Fill in the horizontal and vertical parts of the velocity.')],
      columns: ['u', '\\tan\\alpha', 'u_{x}', 'u_{y}'],
      rows: rows.map(({ tri, k }) => [fmt(tri.h * k), `\\tfrac{${tri.o}}{${tri.a}}`, null, null]),
      bank: tidyBank(answer, rows.flatMap(({ tri, k }) => [tri.h * k - tri.o * k, (tri.o + tri.a) * k])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.flatMap(({ tri, k }): SolutionStep[] => [
      { text: `A triangle ${tri.o}, ${tri.a}, ${tri.h}: $\\cos\\alpha = \\tfrac{${tri.a}}{${tri.h}}$ and $\\sin\\alpha = \\tfrac{${tri.o}}{${tri.h}}$.` },
      { tex: `u_{x} = ${tri.h * k} \\times \\tfrac{${tri.a}}{${tri.h}} = ${tri.a * k}` },
      { tex: `u_{y} = ${tri.h * k} \\times \\tfrac{${tri.o}}{${tri.h}} = ${tri.o * k}` },
    ]),
};

/**
 * A launch given as a whole speed at an angle whose tangent is a triangle's,
 * so both parts of the velocity are whole: speed tri.h * c, parts tri.a * c
 * across and tri.o * c up.
 */
interface Launch {
  tri: Triangle;
  c: number;
}

const LAUNCH_TRI: Triangle[] = [
  { o: 3, a: 4, h: 5 },
  { o: 4, a: 3, h: 5 },
  { o: 5, a: 12, h: 13 },
  { o: 12, a: 5, h: 13 },
  { o: 7, a: 24, h: 25 },
];

interface FlightParams {
  thing: string;
  /** Horizontal and vertical parts of the launch velocity, whole m/s. */
  ux: number;
  uy: number;
  /** Hard: given as a speed and an angle instead. */
  launch: Launch | null;
}

const KICKED = ['ball', 'stone', 'shot', 'rocket', 'water jet', 'golf ball'];

/** Time to the top, time in the air and greatest height over level ground. */
const topTime = (uy: number): number => uy / 9.8;
const flightTime = (uy: number): number => (2 * uy) / 9.8;
const flightHeight = (uy: number): number => (uy * uy) / 19.6;

/**
 * A flight whose times round cleanly to 2 decimal places and whose height and
 * range round cleanly to 1, the same whether the learner doubles the rounded
 * time to the top and carries the rounded time in the air into the range, or
 * works with the exact values throughout.
 */
const flightRoundsWell = ({ ux, uy }: { ux: number; uy: number }): boolean => {
  const top = topTime(uy);
  const T = flightTime(uy);
  const carried = roundTo(T, T_DP);
  return (
    roundedWell(top, T_DP) &&
    roundedWell(T, T_DP) &&
    roundTo(2 * roundTo(top, T_DP), T_DP) === carried &&
    roundedWell(flightHeight(uy), D_DP) &&
    roundedWell(ux * T, D_DP) &&
    roundTo(ux * carried, D_DP) === roundTo(ux * T, D_DP)
  );
};

const sampleFlight = (rng: Rng, hard: boolean): FlightParams =>
  until(
    (): FlightParams => {
      if (hard) {
        const tri = rng.pick(LAUNCH_TRI);
        const c = rng.int(1, Math.floor(75 / tri.h));
        return { thing: rng.pick(KICKED), ux: tri.a * c, uy: tri.o * c, launch: { tri, c } };
      }
      return { thing: rng.pick(KICKED), ux: rng.int(3, 30), uy: rng.int(5, 30), launch: null };
    },
    (p) => p.uy >= 3 && flightRoundsWell(p),
  );

const launchPhrase = ({ ux, uy, launch }: FlightParams): string =>
  launch
    ? `at ${ms(launch.tri.h * launch.c)} at an angle $\\alpha$ above the horizontal, where $\\tan\\alpha = \\tfrac{${launch.tri.o}}{${launch.tri.a}}$`
    : `with a horizontal velocity of ${ms(ux)} and a vertical velocity of ${ms(uy)} upwards`;

const componentLines = ({ ux, uy, launch }: FlightParams): SolutionStep[] =>
  launch
    ? [
        { text: `A ${launch.tri.o}, ${launch.tri.a}, ${launch.tri.h} triangle gives $\\cos\\alpha = \\tfrac{${launch.tri.a}}{${launch.tri.h}}$ and $\\sin\\alpha = \\tfrac{${launch.tri.o}}{${launch.tri.h}}$.` },
        { tex: `u_{x} = ${launch.tri.h * launch.c} \\times \\tfrac{${launch.tri.a}}{${launch.tri.h}} = ${ux}` },
        { tex: `u_{y} = ${launch.tri.h * launch.c} \\times \\tfrac{${launch.tri.o}}{${launch.tri.h}} = ${uy}` },
      ]
    : [];

/**
 * Three labels for a fork of a flow, each rounded to the precision the step
 * asks: the right one and slips, distinct in value after rounding, topped up
 * with near misses and sorted, so the order says nothing.
 */
const roundedForks = (right: number, wrong: number[], precision: Precision, unit: number): string[] => {
  const out = [fixed(right, precision)];
  const add = (v: number) => {
    if (out.length >= 3 || !Number.isFinite(v) || v <= 0) return;
    const token = fixed(v, precision);
    if (Number(token) > 0 && !out.some((o) => Number(o) === Number(token))) out.push(token);
  };
  wrong.forEach(add);
  for (let k = 1; out.length < 3 && k < 1000; k += 1) {
    add(right + k * unit);
    add(right - k * unit);
  }
  return out.sort((x, y) => Number(x) - Number(y)).map((v) => `$${v}$`);
};

/** Tree: over level ground, the time of flight 2u_y/g, the greatest height u_y^2/2g and the range u_x T. */
const flightTree: Generator<FlightParams> = {
  id: 'clm-flight-tree',
  sample: (rng, difficulty) => sampleFlight(rng, difficulty > 1),
  render: (p) => {
    const T = flightTime(p.uy);
    const H = flightHeight(p.uy);
    const R = p.ux * roundTo(T, T_DP);
    const rounded = [fixed(T, T_DP), fixed(H, D_DP), fixed(R, D_DP)];
    const answer = p.launch ? [fmt(p.ux), fmt(p.uy), ...rounded] : rounded;
    return {
      kind: 'tree',
      prompt: [
        say(`A ${p.thing} is launched from level ground ${launchPhrase(p)}. ${G_NOTE}`),
        say(
          p.launch
            ? 'Top row: the horizontal and vertical parts of the velocity. Then the time in the air to 2 decimal places, and the greatest height and the range, each to 1 decimal place.'
            : 'Find the time in the air to 2 decimal places, then the greatest height and the range, each to 1 decimal place.',
        ),
      ],
      expression: 'T = \\frac{2u_{y}}{g} \\qquad H = \\frac{u_{y}^{2}}{2g}',
      nodes: p.launch
        ? [
            { id: 'ux', from: [] },
            { id: 'uy', from: [] },
            { id: 'T', from: ['uy'] },
            { id: 'H', from: ['uy'] },
            { id: 'R', from: ['ux', 'T'] },
          ]
        : [
            { id: 'T', from: [] },
            { id: 'H', from: [] },
            { id: 'R', from: ['T'] },
          ],
      bank: fixedBank(answer, [
        fixed(T / 2, T_DP),
        fixed(2 * H, D_DP),
        fixed(R / 2, D_DP),
        fixed((p.uy * p.uy) / 9.8, D_DP),
        fixed(T + 1, T_DP),
        fixed(H + 1, D_DP),
      ]),
      answer,
    };
  },
  solution: (p) => {
    const T = flightTime(p.uy);
    const H = flightHeight(p.uy);
    return [
      ...componentLines(p),
      { tex: `T = \\frac{2 \\times ${p.uy}}{9.8} = ${dots(T)}` },
      { text: 'To 2 decimal places:' },
      { tex: `T = ${fixed(T, T_DP)}` },
      { tex: `H = \\frac{${p.uy}^{2}}{2 \\times 9.8} = ${dots(H, 3)}` },
      { text: 'To 1 decimal place:' },
      { tex: `H = ${fixed(H, D_DP)}` },
      { tex: `R = ${p.ux} \\times ${fixed(T, T_DP)} = ${fixed(p.ux * T, D_DP)}` },
      { text: 'To 1 decimal place, the same whether you carry the rounded time or the exact one.' },
    ];
  },
};

interface HeightParams {
  /** Vertical launch speed. Easy: whole, given. Hard: from the speed and angle. */
  uy: number;
  /** Hard: a whole speed at an angle whose sine is a triangle's. */
  launch: { u: number; tri: Triangle } | null;
}

const HEIGHT_TRI: Triangle[] = [
  { o: 4, a: 3, h: 5 },
  { o: 7, a: 24, h: 25 },
  { o: 3, a: 4, h: 5 },
];

/** Expression: the greatest height u_y^2/(2g), from the vertical speed (easy) or a speed and angle (hard), to 1 decimal place. */
const maxHeight: Generator<HeightParams> = {
  id: 'clm-max-height',
  sample: (rng, difficulty) =>
    until(
      (): HeightParams => {
        if (difficulty > 1) {
          const u = rng.int(10, 60);
          const tri = rng.pick(HEIGHT_TRI);
          return { uy: n3((u * tri.o) / tri.h), launch: { u, tri } };
        }
        return { uy: rng.int(3, 40), launch: null };
      },
      (p) => roundedWell(flightHeight(p.uy), D_DP),
    ),
  render: (p) => {
    const H = flightHeight(p.uy);
    if (p.launch) {
      return typedRounded(
        [
          say(
            `An arrow is shot at ${ms(p.launch.u)} at an angle $\\alpha$ above the horizontal, where $\\sin\\alpha = ${fmt(p.launch.tri.o / p.launch.tri.h)}$. ${G_NOTE} How high does it rise above its starting point, in metres? ${askPrecision(D_DP)}`,
          ),
        ],
        'H =',
        H,
        D_DP,
      );
    }
    return typedRounded(
      [say(`A ball leaves the ground with a vertical velocity of ${ms(p.uy)} upwards. ${G_NOTE} How high does it rise, in metres? ${askPrecision(D_DP)}`)],
      'H =',
      H,
      D_DP,
    );
  },
  solution: (p) => {
    const H = flightHeight(p.uy);
    return [
      ...(p.launch ? [{ tex: `u_{y} = ${p.launch.u} \\times ${fmt(p.launch.tri.o / p.launch.tri.h)} = ${fmt(p.uy)}` }] : []),
      { text: 'At the top the vertical velocity is zero, so $0 = u_{y}^{2} - 2gH$:' },
      { tex: `H = \\frac{${fmt(p.uy)}^{2}}{2 \\times 9.8} = ${dots(H, 3)}` },
      { text: 'To 1 decimal place:' },
      { tex: `H = ${fixed(H, D_DP)}` },
    ];
  },
  choices: (p) => {
    const H = flightHeight(p.uy);
    const r = (v: number) => roundTo(v, D_DP);
    return numChoices(r(H), [r(2 * H), r((p.uy * p.uy) / 9.8), r(p.uy / 9.8), r(H / 2)], salted(p.uy, p.launch ? p.launch.u : 0));
  },
};

/** Flow: time to the top u_y/g, time of flight (twice it), then the range. Times to 2 decimal places, the range to 1. */
const rangeFlow: Generator<FlightParams> = {
  id: 'clm-range-flow',
  sample: (rng, difficulty) => sampleFlight(rng, difficulty > 1),
  render: (p) => {
    const top = topTime(p.uy);
    const T = flightTime(p.uy);
    const R = p.ux * T;
    return {
      kind: 'flow',
      prompt: [say(`A ${p.thing} is launched from level ground ${launchPhrase(p)}. ${G_NOTE} How far away does it land?`)],
      subject: 'R = u_{x}T',
      steps: [
        {
          id: 'top',
          ask: 'Time to reach the top, when the vertical velocity is zero, in seconds to 2 decimal places:',
          branches: roundedForks(top, [T, 2 * T, p.uy / 4.9 + 1], T_DP, 0.25).map((label) => ({ label, to: 'T' })),
        },
        {
          id: 'T',
          ask: 'So the whole time in the air, in seconds to 2 decimal places:',
          branches: roundedForks(T, [top, 1.5 * T, T + 1], T_DP, 0.25).map((label) => ({ label, to: 'R' })),
        },
        {
          id: 'R',
          ask: 'And the range, in metres to 1 decimal place:',
          branches: roundedForks(R, [R / 2, 2 * R, (p.uy * p.ux) / 4.9 + 5], D_DP, 1.5).map((label) => ({ label, outcome: 'The flight is symmetric: as long coming down as going up.' })),
        },
      ],
      answer: [`$${fixed(top, T_DP)}$`, `$${fixed(T, T_DP)}$`, `$${fixed(R, D_DP)}$`],
    };
  },
  solution: (p) => {
    const top = topTime(p.uy);
    const T = flightTime(p.uy);
    return [
      ...componentLines(p),
      { tex: `t_{\\text{top}} = \\frac{${p.uy}}{9.8} = ${dots(top)}` },
      { text: 'To 2 decimal places:' },
      { tex: `t_{\\text{top}} = ${fixed(top, T_DP)}` },
      { tex: `T = 2 \\times ${fixed(top, T_DP)} = ${fixed(T, T_DP)}` },
      { tex: `R = ${p.ux} \\times ${fixed(T, T_DP)} = ${fixed(p.ux * T, D_DP)}` },
      { text: 'To 1 decimal place, the same whether you carry the rounded times or the exact ones.' },
    ];
  },
};


/* ================================================================
 * Angular speed
 * ================================================================ */

const PI_KEYS: KeypadKey[] = [{ insert: 'pi', label: 'π' }, ...WORKING_KEYS];

const piTex = (k: number): string => (k === 1 ? '\\pi' : `${fmt(k)}\\pi`);

function piChoices(k: number, wrong: number[], salt: number): ChoiceOption[] {
  const seen = new Set([k]);
  const picked: number[] = [];
  for (const w of [...wrong, k + 1, k - 1, k + 2, 2 * k + 1]) {
    if (picked.length === 3 || w <= 0 || !exact(w, 2) || seen.has(w)) continue;
    seen.add(w);
    picked.push(w);
  }
  const as = (v: number) => ({ tex: piTex(v), answer: `${fmt(v)}*pi` });
  const spare = [k + 3, k + 4, k * 3].filter((v) => !seen.has(v)).map(as);
  return steered(options(as(k), ...picked.map(as)), salt, spare);
}

const SPINNERS = ['A washing machine drum', 'A bicycle wheel', 'A record', 'A ceiling fan', 'A drill bit', 'A potter\'s wheel', 'A car engine'];

interface RpmParams {
  who: string;
  /** Half turns per second: the angular speed is k pi rad/s and the rpm is 30k. */
  k: number;
  to: 'rad' | 'rpm';
}

/** Expression: rev/min to rad/s (a whole multiple of pi), or back (hard, either way). */
const rpmConvert: Generator<RpmParams> = {
  id: 'clm-rpm-convert',
  sample: (rng, difficulty) => ({
    who: rng.pick(SPINNERS),
    k: rng.int(1, 60),
    to: difficulty > 1 ? rng.pick<RpmParams['to']>(['rad', 'rpm']) : 'rad',
  }),
  render: ({ who, k, to }) =>
    to === 'rad'
      ? {
          kind: 'expression',
          prompt: [say(`${who} turns at $${30 * k}$ revolutions per minute. Find its angular speed in $\\text{rad s}^{-1}$, as a multiple of $\\pi$.`)],
          lead: '\\omega =',
          keypad: PI_KEYS,
          answer: `${k}*pi`,
          domain: 'real',
          mode: 'exact',
        }
      : typed([say(`${who} turns at $${piTex(k)}\\text{ rad s}^{-1}$. How many revolutions is that per minute?`)], 'f =', 30 * k),
  solution: ({ k, to }) => [
    { text: 'One revolution is $2\\pi$ radians, and a minute is $60\\text{ s}$.' },
    to === 'rad'
      ? { tex: `\\omega = \\frac{${30 * k} \\times 2\\pi}{60} = ${piTex(k)}` }
      : { tex: `f = \\frac{${piTex(k)} \\times 60}{2\\pi} = ${30 * k}` },
  ],
  choices: ({ k, to }) => (to === 'rad' ? piChoices(k, [2 * k, k / 2, 60 * k], salted(k, 1)) : numChoices(30 * k, [60 * k, 15 * k, 2 * k], salted(k, 2))),
};

interface RimParams {
  who: string;
  /** Radius in centimetres: a multiple of 5 under a metre, of 10 from a metre up. */
  cm: number;
  /** Easy: the angular speed, whole, given. Hard: v / r, asked to 1 decimal place. */
  omega: number;
  /** Easy: r omega. Hard: the rim speed, whole or one decimal place, given. */
  v: number;
  find: 'v' | 'omega';
}

/** Radii a textbook prints: 0.05 m to 0.95 m in fives, then 1 m to 1.5 m in tenths. */
const RIM_CM = [...Array.from({ length: 19 }, (_, i) => 5 * (i + 1)), 100, 110, 120, 130, 140, 150];

/** Expression: the speed of a point on a rim, v = r omega; hard, omega from the speed, to 1 decimal place. */
const rimSpeed: Generator<RimParams> = {
  id: 'clm-rim-speed',
  sample: (rng, difficulty) => {
    const who = rng.pick(SPINNERS);
    if (difficulty > 1)
      return until(
        () => {
          const cm = rng.pick(RIM_CM);
          const v = rng.int(10, 250) / 10;
          return { who, cm, v, omega: v / (cm / 100), find: 'omega' as const };
        },
        (p) => p.omega >= 2 && p.omega <= 200 && roundedWell(p.omega, D_DP),
      );
    const cm = rng.pick(RIM_CM);
    const omega = rng.int(2, 40);
    return { who, cm, omega, v: n3((cm / 100) * omega), find: 'v' };
  },
  render: ({ who, cm, omega, v, find }) => {
    const r = cm / 100;
    return find === 'v'
      ? typed([say(`${who} of radius ${metres(r)} turns at $${omega}\\text{ rad s}^{-1}$. How fast does a point on its rim move, in $\\text{m s}^{-1}$?`)], 'v =', v)
      : typedRounded(
          [say(`A point on the rim of ${who.toLowerCase()} of radius ${metres(r)} moves at ${ms(v)}. Find the angular speed, in $\\text{rad s}^{-1}$. ${askPrecision(D_DP)}`)],
          '\\omega =',
          omega,
          D_DP,
        );
  },
  solution: ({ cm, omega, v, find }) => {
    const r = cm / 100;
    return [
      { text: 'Each radian turned carries the rim a distance $r$ along, so $v = r\\omega$.' },
      ...(find === 'v'
        ? [{ tex: `v = ${fmt(r)} \\times ${omega} = ${fmt(v)}` }]
        : [{ tex: `\\omega = \\frac{${fmt(v)}}{${fmt(r)}} = ${dots(omega, 3)}` }, { text: 'To 1 decimal place:' }, { tex: `\\omega = ${fixed(omega, D_DP)}` }]),
    ];
  },
  choices: ({ cm, omega, v, find }) => {
    const r = cm / 100;
    const r1 = (x: number) => roundTo(x, D_DP);
    return find === 'v'
      ? numChoices(v, [cm * omega, v * 2, omega / r], salted(cm, omega))
      : numChoices(r1(omega), [r1(v * r), r1(2 * omega), r1(omega / 2)], salted(v * 10, cm));
  },
};


interface SpinRow {
  /** Revolutions per second, in halves. */
  halves: number;
  given: 'rpm' | 'rps';
}

/** Table: the same spin rate as rev/min, rev/s and rad/s (a multiple of pi). */
const spinTable: Generator<{ rows: SpinRow[] }> = {
  id: 'clm-spin-table',
  sample: (rng, difficulty) =>
    until(
      () => ({
        rows: [0, 1, 2].map(() => ({
          halves: rng.int(1, 40),
          given: difficulty > 1 ? rng.pick<SpinRow['given']>(['rpm', 'rps']) : ('rpm' as const),
        })),
      }),
      ({ rows }) => new Set(rows.map((r) => r.halves)).size === 3,
    ),
  render: ({ rows }) => {
    const answer: string[] = [];
    const cells = rows.map(({ halves, given }, i) => {
      const rpm = 30 * halves;
      const rps = halves / 2;
      const rad = piTex(halves);
      const out: (string | null)[] = [['A', 'B', 'C'][i]];
      if (given === 'rpm') {
        out.push(fmt(rpm), null, null);
        answer.push(fmt(rps), rad);
      } else {
        out.push(null, fmt(rps), null);
        answer.push(fmt(rpm), rad);
      }
      return out;
    });
    const extras = rows.flatMap(({ halves }) => [piTex(halves / 2), fmt(halves), piTex(halves * 2), fmt(60 * halves)]);
    const bank: string[] = [...answer];
    let spare = 0;
    for (const token of extras) {
      if (spare >= 3 || bank.includes(token)) continue;
      bank.push(token);
      spare += 1;
    }
    const value = (s: string) => Number(s.replace('\\pi', '')) || 1;
    return {
      kind: 'table',
      prompt: [say('Each row is one rate of spin written three ways. Fill in the gaps.')],
      columns: ['', '\\text{rev min}^{-1}', '\\text{rev s}^{-1}', '\\text{rad s}^{-1}'],
      rows: cells,
      bank: bank.sort((x, y) => Number(x.includes('\\pi')) - Number(y.includes('\\pi')) || value(x) - value(y)),
      answer,
    };
  },
  solution: ({ rows }) =>
    rows.flatMap(({ halves, given }, i): SolutionStep[] => {
      const name = ['A', 'B', 'C'][i];
      return [
        given === 'rpm'
          ? { tex: `${name}: ${30 * halves} \\div 60 = ${fmt(halves / 2)}` }
          : { tex: `${name}: ${fmt(halves / 2)} \\times 60 = ${30 * halves}` },
        { tex: `${fmt(halves / 2)} \\times 2\\pi = ${piTex(halves)}` },
      ];
    }),
};

interface GearParams {
  /** Radii in centimetres. */
  r1: number;
  r2: number;
  w1: number;
  hard: boolean;
}

/** Tree: two wheels joined by a belt share a rim speed: v = r1 w1, then w2 = v / r2 (hard adds a point halfway out). */
const gearTree: Generator<GearParams> = {
  id: 'clm-gear-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ r1: rng.int(1, 12) * 5, r2: rng.int(1, 12) * 5, w1: rng.int(2, 30), hard: difficulty > 1 }),
      (p) => p.r1 !== p.r2 && Number.isInteger((p.r1 * p.w1) / p.r2),
    ),
  render: (p) => {
    const v = n3((p.r1 * p.w1) / 100);
    const w2 = (p.r1 * p.w1) / p.r2;
    const answer = p.hard ? [v, w2, n3(v / 2)] : [v, w2];
    return {
      kind: 'tree',
      prompt: [
        say(
          `A belt joins a wheel of radius ${metres(p.r1 / 100)}, turning at $${p.w1}\\text{ rad s}^{-1}$, to a wheel of radius ${metres(p.r2 / 100)}. The belt does not slip. Find the belt's speed and the second wheel's angular speed${p.hard ? ', then the speed of a point on the second wheel halfway out from its centre' : ''}.`,
        ),
      ],
      expression: 'v = r_{1}\\omega_{1} = r_{2}\\omega_{2}',
      nodes: p.hard
        ? [
            { id: 'v', from: [] },
            { id: 'w2', from: ['v'] },
            { id: 'half', from: ['w2'] },
          ]
        : [
            { id: 'v', from: [] },
            { id: 'w2', from: ['v'] },
          ],
      bank: tidyBank(answer, [(p.r2 * p.w1) / p.r1, p.w1, v * 2, p.r1 * p.w1]),
      answer: answer.map(fmt),
    };
  },
  solution: (p) => {
    const v = (p.r1 * p.w1) / 100;
    const w2 = (p.r1 * p.w1) / p.r2;
    return [
      { text: 'The belt moves at the rim speed of both wheels.' },
      { tex: `v = ${fmt(p.r1 / 100)} \\times ${p.w1} = ${fmt(v)}` },
      { tex: `\\omega_{2} = \\frac{${fmt(v)}}{${fmt(p.r2 / 100)}} = ${fmt(w2)}` },
      ...(p.hard ? [{ tex: `${fmt(p.r2 / 200)} \\times ${fmt(w2)} = ${fmt(v / 2)}` }] : []),
    ];
  },
};

/* ================================================================
 * Angular acceleration, in revolutions
 * ================================================================ */

interface SpinUpParams {
  who: string;
  /** Starting rate, whole rev/s. */
  w0: number;
  /** Final rate: easy w0 + alpha t (one decimal place), hard whole and given. */
  w: number;
  /** Angular acceleration: easy one decimal place and given, hard (w - w0) / t, asked to 2 decimal places. */
  alpha: number;
  t: number;
  find: 'w' | 'alpha';
}

/** Angular accelerations are asked to 2 decimal places. */
const A_DP: Precision = { dp: 2 };

/** Expression: omega = omega0 + alpha t, in rev/s; hard, alpha from the change, to 2 decimal places. */
const spinUp: Generator<SpinUpParams> = {
  id: 'clm-spin-up',
  sample: (rng, difficulty) => {
    const who = rng.pick(SPINNERS);
    if (difficulty > 1)
      return until(
        () => {
          const w0 = rng.int(0, 10);
          const w = rng.int(w0 + 1, 40);
          const t = rng.int(2, 12);
          return { who, w0, w, t, alpha: (w - w0) / t, find: 'alpha' as const };
        },
        (p) => roundedWell(p.alpha, A_DP),
      );
    return until(
      () => {
        const w0 = rng.int(0, 10);
        const alpha = rng.int(1, 30) / 10;
        const t = rng.int(2, 12);
        return { who, w0, alpha, t, w: n3(w0 + alpha * t), find: 'w' as const };
      },
      (p) => p.w <= 40,
    );
  },
  render: (p) =>
    p.find === 'w'
      ? typed(
          [say(`${p.who} turning at $${p.w0}\\text{ rev s}^{-1}$ speeds up steadily at $${fmt(p.alpha)}\\text{ rev s}^{-2}$ for ${secs(p.t)}. How fast is it turning then, in $\\text{rev s}^{-1}$?`)],
          '\\omega =',
          p.w,
        )
      : typedRounded(
          [say(`${p.who} speeds up steadily from $${p.w0}$ to $${p.w}\\text{ rev s}^{-1}$ in ${secs(p.t)}. Find its angular acceleration, in $\\text{rev s}^{-2}$. ${askPrecision(A_DP)}`)],
          '\\alpha =',
          p.alpha,
          A_DP,
        ),
  solution: (p) =>
    p.find === 'w'
      ? [{ text: 'Like $v = u + at$:' }, { tex: `\\omega = ${p.w0} + ${fmt(p.alpha)} \\times ${p.t} = ${fmt(p.w)}` }]
      : [
          { text: 'Like $a = \\frac{v - u}{t}$:' },
          { tex: `\\alpha = \\frac{${p.w} - ${p.w0}}{${p.t}} = ${dots(p.alpha)}` },
          { text: 'To 2 decimal places:' },
          { tex: `\\alpha = ${fixed(p.alpha, A_DP)}` },
        ],
  choices: (p) => {
    const r2 = (x: number) => roundTo(x, A_DP);
    return p.find === 'w'
      ? numChoices(p.w, [p.alpha * p.t, p.w0 + p.alpha, p.w + p.w0], salted(p.w0, p.alpha * 10, p.t))
      : numChoices(r2(p.alpha), [r2(p.w / p.t), r2((p.w + p.w0) / p.t), p.w - p.w0], salted(p.t, p.w, p.w0));
  },
};


interface TurnsParams {
  w0: number;
  w: number;
  t: number;
}

/** Tree: speeding up from w0 to w rev/s in t seconds: the acceleration, the average rate, the turns made. */
const spinTurnsTree: Generator<TurnsParams> = {
  id: 'clm-spin-turns-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ w0: rng.int(0, difficulty > 1 ? 20 : 8), w: rng.int(2, difficulty > 1 ? 40 : 16), t: rng.int(2, 12) }),
      (p) => p.w !== p.w0 && exact((p.w - p.w0) / p.t, 2) && exact(((p.w0 + p.w) * p.t) / 2, 1),
    ),
  render: (p) => {
    const alpha = (p.w - p.w0) / p.t;
    const avg = (p.w0 + p.w) / 2;
    const turns = avg * p.t;
    return {
      kind: 'tree',
      prompt: [
        say(`A fan's blades go steadily from $${p.w0}$ to $${p.w}\\text{ rev s}^{-1}$ in ${secs(p.t)}. Find the angular acceleration, the average rate of turning, and how many turns the blades make.`),
      ],
      expression: '\\theta = \\tfrac{1}{2}(\\omega_{0} + \\omega)t',
      nodes: [
        { id: 'alpha', from: [] },
        { id: 'avg', from: [] },
        { id: 'turns', from: ['avg'] },
      ],
      bank: tidyBank([alpha, avg, turns], [p.w * p.t, (p.w - p.w0) * p.t, avg * 2, p.w + p.w0]),
      answer: [alpha, avg, turns].map(fmt),
    };
  },
  solution: (p) => {
    const avg = (p.w0 + p.w) / 2;
    return [
      { tex: `\\alpha = \\frac{${p.w} - ${p.w0}}{${p.t}} = ${fmt((p.w - p.w0) / p.t)}` },
      { tex: `\\frac{${p.w0} + ${p.w}}{2} = ${fmt(avg)}` },
      { tex: `\\theta = ${fmt(avg)} \\times ${p.t} = ${fmt(avg * p.t)}` },
    ];
  },
};

interface StopTurnsParams {
  w0: number;
  /** Deceleration in rev/s^2, to one decimal place. */
  alpha: number;
}

const stopTurns = ({ w0, alpha }: StopTurnsParams): number => (w0 * w0) / (2 * alpha);
const TURN_SPAN = 100;

/** Slider: turns made while slowing to rest, omega0^2 / (2 alpha), like a braking distance, to the nearest half turn. */
const spinStopSlider: Generator<StopTurnsParams> = {
  id: 'clm-spin-stop-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({ w0: rng.int(2, difficulty > 1 ? 20 : 12), alpha: rng.int(1, 30) / 10 }),
      (p) => stopTurns(p) <= TURN_SPAN && stopTurns(p) >= 2 && notchedWell(stopTurns(p)),
    ),
  render: (p) => {
    const figure = track(0, TURN_SPAN, [], 'A scale of turns from 0 to 100');
    return {
      kind: 'slider',
      prompt: [say(`A potter's wheel turning at $${p.w0}\\text{ rev s}^{-1}$ slows steadily at $${fmt(p.alpha)}\\text{ rev s}^{-2}$ until it stops. Slide to how many turns it makes meanwhile, to the nearest half turn.`)],
      min: 0,
      max: TURN_SPAN,
      step: 0.5,
      answer: notch(stopTurns(p)),
      readout: '\\theta = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [
    { text: 'Like $v^{2} = u^{2} + 2as$, ending at rest:' },
    { tex: `0 = ${p.w0}^{2} - 2 \\times ${fmt(p.alpha)}\\theta` },
    { tex: `\\theta = \\frac{${p.w0 * p.w0}}{${fmt(2 * p.alpha)}} = ${dots(stopTurns(p), 2)}` },
    { text: `The nearest half is $${fmt(notch(stopTurns(p)))}$.` },
  ],
};

type SpinFind = 'w' | 'turns' | 'wFromTurns';

interface SpinFlowParams {
  w0: number;
  quarters: number;
  t: number;
  find: SpinFind;
}

const EQ_W = '$\\omega = \\omega_{0} + \\alpha t$';
const EQ_THETA = '$\\theta = \\omega_{0}t + \\tfrac{1}{2}\\alpha t^{2}$';
const EQ_SQ = '$\\omega^{2} = \\omega_{0}^{2} + 2\\alpha\\theta$';

/** Flow: pick the rotational equation from what is given and asked, then its value. */
const spinFlow: Generator<SpinFlowParams> = {
  id: 'clm-spin-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({
        w0: rng.int(0, 12),
        quarters: rng.pick([2, 4, 6, 8, 12]),
        t: rng.int(2, 10),
        find: rng.pick<SpinFind>(difficulty > 1 ? ['turns', 'wFromTurns'] : ['w', 'turns']),
      }),
      (p) => {
        const a = p.quarters / 4;
        const w = p.w0 + a * p.t;
        const th = p.w0 * p.t + (a * p.t * p.t) / 2;
        return exact(th, 2) && w <= 40 && (p.find !== 'wFromTurns' || Number.isInteger(w));
      },
    ),
  render: (p) => {
    const a = p.quarters / 4;
    const w = p.w0 + a * p.t;
    const th = p.w0 * p.t + (a * p.t * p.t) / 2;
    const [question, right, value, wrongs] =
      p.find === 'w'
        ? [`It starts at $${p.w0}\\text{ rev s}^{-1}$ and speeds up at $${fmt(a)}\\text{ rev s}^{-2}$ for ${secs(p.t)}. How fast is it turning then, in $\\text{rev s}^{-1}$?`, EQ_W, w, [a * p.t, w + p.w0]]
        : p.find === 'turns'
          ? [`It starts at $${p.w0}\\text{ rev s}^{-1}$ and speeds up at $${fmt(a)}\\text{ rev s}^{-2}$ for ${secs(p.t)}. How many turns does it make?`, EQ_THETA, th, [w * p.t, p.w0 * p.t, th * 2]]
          : [`It starts at $${p.w0}\\text{ rev s}^{-1}$ and speeds up at $${fmt(a)}\\text{ rev s}^{-2}$ over $${fmt(th)}$ turns. How fast is it turning then, in $\\text{rev s}^{-1}$?`, EQ_SQ, w, [w * w, p.w0 + a, w + 1]];
    return {
      kind: 'flow',
      prompt: [say(`A turntable spins about its centre. ${question}`)],
      subject: '\\omega,\\ \\omega_{0},\\ \\alpha,\\ \\theta,\\ t',
      steps: [
        {
          id: 'which',
          ask: 'Which equation links what is given to what is asked?',
          branches: [EQ_W, EQ_THETA, EQ_SQ].map((label) => ({ label, to: 'value' })),
        },
        {
          id: 'value',
          ask: 'So the answer is:',
          branches: forks(value, wrongs as number[], 0.5).map((label) => ({ label, outcome: 'Each rotational equation is a suvat equation with the letters changed.' })),
        },
      ],
      answer: [right, `$${fmt(value)}$`],
    };
  },
  solution: (p) => {
    const a = p.quarters / 4;
    const w = p.w0 + a * p.t;
    const th = p.w0 * p.t + (a * p.t * p.t) / 2;
    if (p.find === 'w') return [{ text: 'No angle is given or asked, so use $\\omega = \\omega_{0} + \\alpha t$.' }, { tex: `\\omega = ${p.w0} + ${fmt(a)} \\times ${p.t} = ${fmt(w)}` }];
    if (p.find === 'turns')
      return [
        { text: 'No final rate is given or asked, so use $\\theta = \\omega_{0}t + \\tfrac{1}{2}\\alpha t^{2}$.' },
        { tex: `\\theta = ${p.w0} \\times ${p.t} + \\tfrac{1}{2} \\times ${fmt(a)} \\times ${p.t}^{2}` },
        { tex: `\\theta = ${fmt(th)}` },
      ];
    return [
      { text: 'No time is given or asked, so use $\\omega^{2} = \\omega_{0}^{2} + 2\\alpha\\theta$.' },
      { tex: `\\omega^{2} = ${p.w0}^{2} + 2 \\times ${fmt(a)} \\times ${fmt(th)} = ${fmt(w * w)}` },
      { tex: `\\omega = ${fmt(w)}` },
    ];
  },
};

/* ================================================================
 * Centripetal acceleration
 * ================================================================ */

interface CentripetalParams {
  who: string;
  /** Easy: whole and given. Hard: the square root of a r, asked to 1 decimal place. */
  v: number;
  /** Radius, whole metres. */
  r: number;
  /** Easy: v^2 / r, asked to 1 decimal place. Hard: one decimal place and given. */
  a: number;
  find: 'a' | 'v';
}

const CIRCLERS = ['A car on a roundabout', 'A runner on a bend', 'A cyclist on a curved track', 'A train on a curve', 'A child on a roundabout'];

/** Expression: a = v^2 / r; hard, the speed from the acceleration and radius. Each to 1 decimal place. */
const centripetal: Generator<CentripetalParams> = {
  id: 'clm-centripetal',
  sample: (rng, difficulty) => {
    const who = rng.pick(CIRCLERS);
    if (difficulty > 1)
      return until(
        () => {
          const r = rng.int(5, 100);
          const a = rng.int(5, 200) / 10;
          return { who, r, a, v: Math.sqrt(a * r), find: 'v' as const };
        },
        (p) => p.v >= 2 && p.v <= 40 && roundedWell(p.v, D_DP),
      );
    return until(
      () => {
        const v = rng.int(2, 30);
        const r = rng.int(2, 100);
        return { who, v, r, a: (v * v) / r, find: 'a' as const };
      },
      (p) => p.a >= 0.5 && p.a <= 150 && roundedWell(p.a, D_DP),
    );
  },
  render: ({ who, v, r, a, find }) =>
    find === 'a'
      ? typedRounded(
          [say(`${who} moves at a steady ${ms(v)} round a circle of radius ${metres(r)}. Find its acceleration towards the centre, in $\\text{m s}^{-2}$. ${askPrecision(D_DP)}`)],
          'a =',
          a,
          D_DP,
        )
      : typedRounded(
          [say(`${who} goes round a circle of radius ${metres(r)} with an acceleration of ${ms2(a)} towards the centre. How fast is it going, in $\\text{m s}^{-1}$? ${askPrecision(D_DP)}`)],
          'v =',
          v,
          D_DP,
        ),
  solution: ({ v, r, a, find }) =>
    find === 'a'
      ? [{ tex: `a = \\frac{v^{2}}{r} = \\frac{${v}^{2}}{${r}} = ${dots(a, 3)}` }, { text: 'To 1 decimal place:' }, { tex: `a = ${fixed(a, D_DP)}` }]
      : [
          { tex: `v^{2} = ar = ${fmt(a)} \\times ${r} = ${fmt(n3(a * r))}` },
          { tex: `v = \\sqrt{${fmt(n3(a * r))}} = ${dots(v, 3)}` },
          { text: 'To 1 decimal place:' },
          { tex: `v = ${fixed(v, D_DP)}` },
        ],
  choices: ({ v, r, a, find }) => {
    const r1 = (x: number) => roundTo(x, D_DP);
    return find === 'a'
      ? numChoices(r1(a), [r1(v / r), r1((v * v) / (2 * r)), v * r], salted(v, r))
      : numChoices(r1(v), [r1(a * r), r1(Math.sqrt(2 * a * r)), r1(Math.sqrt(a * r) / 2)], salted(r, a * 10));
  },
};

interface CircleRow {
  v: number;
  r: number;
  blank: 'v' | 'r' | 'a' | 'w';
}

/** Table: speed, radius, angular speed and acceleration for three circles, one missing from each. */
const circleTable: Generator<{ rows: CircleRow[] }> = {
  id: 'clm-circle-table',
  sample: (rng, difficulty) =>
    until(
      () => {
        const blanks: CircleRow['blank'][] = difficulty > 1 ? turned(['v', 'r', 'w'], rng.int(0, 2)) : turned(['a', 'a', 'w'], rng.int(0, 2));
        return { rows: blanks.map((blank) => ({ v: rng.int(2, 20), r: rng.pick([1, 2, 4, 5, 8, 10, 20]), blank })) };
      },
      ({ rows }) => rows.every((row) => exact((row.v * row.v) / row.r, 2) && exact(row.v / row.r, 2)) && new Set(rows.map((r) => r.v * 100 + r.r)).size === 3,
    ),
  render: ({ rows }) => {
    const answer: number[] = [];
    const cell = (value: number, blank: boolean) => {
      if (!blank) return fmt(value);
      answer.push(value);
      return null;
    };
    return {
      kind: 'table',
      prompt: [say('Each row is steady motion round a circle: speed $v$ in $\\text{m s}^{-1}$, radius $r$ in metres, angular speed $\\omega$ in $\\text{rad s}^{-1}$ and acceleration $a$ in $\\text{m s}^{-2}$. Fill in the gaps.')],
      columns: ['v', 'r', '\\omega', 'a'],
      rows: rows.map(({ v, r, blank }) => [cell(v, blank === 'v'), cell(r, blank === 'r'), cell(n3(v / r), blank === 'w'), cell(n3((v * v) / r), blank === 'a')]),
      bank: tidyBank(answer, rows.flatMap(({ v, r }) => [v * r, (v * v) / (2 * r)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map(({ v, r, blank }): SolutionStep => {
      const w = v / r;
      const a = (v * v) / r;
      if (blank === 'a') return { tex: `a = \\frac{${v}^{2}}{${r}} = ${fmt(a)}` };
      if (blank === 'w') return { tex: `\\omega = \\frac{${v}}{${r}} = ${fmt(w)}` };
      if (blank === 'v') return { tex: `v = r\\omega = ${r} \\times ${fmt(w)} = ${v}` };
      return { tex: `r = \\frac{v}{\\omega} = \\frac{${v}}{${fmt(w)}} = ${r}` };
    }),
};

interface GForceParams {
  /** Speed, whole m/s. */
  v: number;
  /** Radius of the loop, whole metres. */
  r: number;
}

/** The acceleration and its multiple of g, each to 1 decimal place. */
const gForceOf = ({ v, r }: GForceParams): { a: number; k: number } => ({ a: (v * v) / r, k: (v * v) / r / 9.8 });

/** Flow: a ride's acceleration v^2/r, then how many g that is, each to 1 decimal place. */
const gForceFlow: Generator<GForceParams> = {
  id: 'clm-g-force-flow',
  sample: (rng, difficulty) =>
    until(
      () => (difficulty > 1 ? { v: rng.int(10, 30), r: rng.int(5, 60) } : { v: rng.int(5, 20), r: rng.int(5, 40) }),
      (p) => {
        const { a, k } = gForceOf(p);
        return (
          a >= 4.9 &&
          a <= 60 &&
          roundedWell(a, D_DP) &&
          roundedWell(k, D_DP) &&
          roundTo(roundTo(a, D_DP) / 9.8, D_DP) === roundTo(k, D_DP)
        );
      },
    ),
  render: (p) => {
    const { a, k } = gForceOf(p);
    return {
      kind: 'flow',
      prompt: [say(`A fairground car swings round a loop of radius ${metres(p.r)} at ${ms(p.v)}. ${G_NOTE} How many $g$ does a rider feel from the turning alone?`)],
      subject: 'a = \\frac{v^{2}}{r}',
      steps: [
        {
          id: 'a',
          ask: 'The acceleration towards the centre, in $\\text{m s}^{-2}$ to 1 decimal place:',
          branches: roundedForks(a, [p.v / p.r, 2 * a, a / 2], D_DP, 1.5).map((label) => ({ label, to: 'g' })),
        },
        {
          id: 'g',
          ask: 'As a number of $g$, divide by $9.8$, to 1 decimal place:',
          branches: roundedForks(k, [k + 1, 2 * k, a / 10], D_DP, 0.5).map((label) => ({ label, outcome: 'One g is the pull of gravity at the surface of the Earth.' })),
        },
      ],
      answer: [`$${fixed(a, D_DP)}$`, `$${fixed(k, D_DP)}$`],
    };
  },
  solution: (p) => {
    const { a, k } = gForceOf(p);
    return [
      { tex: `a = \\frac{${p.v}^{2}}{${p.r}} = ${dots(a, 3)}` },
      { text: 'To 1 decimal place:' },
      { tex: `a = ${fixed(a, D_DP)}` },
      { tex: `\\frac{${fixed(a, D_DP)}}{9.8} = ${dots(roundTo(a, D_DP) / 9.8, 3)}` },
      { text: `To 1 decimal place, $${fixed(k, D_DP)}g$, the same whether you carry the rounded acceleration or the exact one.` },
    ];
  },
};

interface RadiusParams {
  v: number;
  a: number;
}

const RADIUS_SPAN = 100;

/** Slider: the radius of turn that gives a set acceleration at a given speed, r = v^2 / a. */
const radiusSlider: Generator<RadiusParams> = {
  id: 'clm-radius-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({ v: rng.int(3, difficulty > 1 ? 30 : 20), a: rng.pick([2, 2.5, 4, 5, 8, 10]) }),
      (p) => Number.isInteger((2 * p.v * p.v) / p.a) && (p.v * p.v) / p.a <= RADIUS_SPAN && (p.v * p.v) / p.a >= 3,
    ),
  render: ({ v, a }) => {
    const figure = track(0, RADIUS_SPAN, [{ at: 0, name: 'centre' }], 'A scale of radii in metres out from the centre');
    return {
      kind: 'slider',
      prompt: [say(`A car rounds a bend at ${ms(v)}. The acceleration towards the centre of the bend must be ${ms2(a)}. Slide to the radius of the bend, in metres.`)],
      min: 0,
      max: RADIUS_SPAN,
      step: 0.5,
      answer: (v * v) / a,
      readout: 'r = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: ({ v, a }) => [{ tex: `r = \\frac{v^{2}}{a} = \\frac{${v * v}}{${fmt(a)}} = ${fmt((v * v) / a)}` }],
};

export const classicalTwoDGenerators = [
  fallTimeGen,
  horizTree,
  horizSlider,
  horizFlow,
  launchTable,
  flightTree,
  maxHeight,
  rangeFlow,
  rpmConvert,
  rimSpeed,
  spinTable,
  gearTree,
  spinUp,
  spinTurnsTree,
  spinStopSlider,
  spinFlow,
  centripetal,
  circleTable,
  gForceFlow,
  radiusSlider,
] as Generator<never>[];

export const classicalTwoDInternals = { fallTime, flightTime, flightHeight, stopTurns };
