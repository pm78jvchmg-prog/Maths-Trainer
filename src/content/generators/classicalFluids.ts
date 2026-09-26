/**
 * Classical Mechanics, level 3: Forces in Fluids and on Curves (`clm-l3`).
 *
 * Pressure and pressure in a fluid, after OpenStax University Physics 14.2
 * and 14.3 (Pascal's principle and the hydraulic press); buoyancy, after
 * 14.4; drag and terminal speed, after 6.4; and the flat and banked bend,
 * after 6.3. Forces and Newton's Laws already has weight, reaction and
 * friction, so those are used, not taught again.
 *
 * Given values are the kind a textbook prints: whole numbers or one decimal
 * place, with small ratios such as mu = 0.35 or tan(theta) = 0.75. Fresh
 * water gives 9.8 kPa for every metre of depth and 9.8 N of buoyancy for
 * every litre, so those answers end by themselves. Where natural values give
 * an answer that does not end, as a square root for a terminal speed or a
 * bend nearly always does, the question states its precision and the answer
 * is rounded to it, redrawn when it sits near a rounding edge.
 */
import type { Generator, SolutionStep } from '../types';
import { canonicalForces, type Direction, type ForceScene } from '../forces';
import {
  dots,
  G_NOTE,
  exact,
  fmt,
  askPrecision,
  fixed,
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

/** Speeds to 1 decimal place, and pressures, radii and tangents to 3 significant figures. */
const DP1: Precision = { dp: 1 };
const SF3: Precision = { sf: 3 };


/** The working line that ends a rounded answer: "To 1 decimal place:" then the value. */
const roundLines = (name: string, value: number, precision: Precision): SolutionStep[] => [
  { text: `T${precisionWords(precision).slice(1)}:` },
  { tex: `${name} = ${fixed(value, precision)}` },
];

/** A value rounded to the nearest notch of a slider. */
const notch = (value: number, step: number): number => n3(Math.round(value / step) * step);
/** Whether a value sits well clear of the midpoint between two notches, so rounding it is not a coin toss. */
const notchedWell = (value: number, step: number): boolean => Math.abs(value / step - Math.round(value / step)) <= 0.35;

/** Three rounded values for a fork of a flow: the right one and slips, distinct and positive, sorted so the order says nothing. */
function fixedForks(right: number, wrong: number[], precision: Precision, unit: number): string[] {
  const out = [fixed(right, precision)];
  const add = (v: number) => {
    if (out.length >= 3 || !Number.isFinite(v) || v <= 0) return;
    const token = fixed(v, precision);
    if (!out.includes(token) && Number(token) > 0) out.push(token);
  };
  wrong.forEach(add);
  for (let k = 1; out.length < 3 && k < 1000; k += 1) {
    add(right + k * unit);
    add(right - k * unit);
  }
  return out.sort((x, y) => Number(x) - Number(y)).map((v) => `$${v}$`);
}

/** A bank of tokens: the answer's, then distinct positive extras, sorted by value. */
function tokenBank(answer: string[], extras: string[], spare = 3): string[] {
  const out = [...answer];
  for (const token of extras) {
    if (out.length - answer.length >= spare) break;
    if (!out.includes(token) && Number(token) > 0 && Number.isFinite(Number(token))) out.push(token);
  }
  return out.sort((x, y) => Number(x) - Number(y));
}

const kpa = (v: number): string => `$${fmt(v)}\\text{ kPa}$`;
const sqm = (v: number): string => `$${fmt(v)}\\text{ m}^{2}$`;
const sqcm = (v: number): string => `$${fmt(v)}\\text{ cm}^{2}$`;
const litres = (v: number): string => `$${fmt(v)}\\text{ litres}$`;
const density = (v: number): string => `$${fmt(v)}\\text{ kg m}^{-3}$`;

/** Atmospheric pressure at the surface, in kPa, stated wherever it is used. */
const P0 = 101;
const P0_NOTE = `Take atmospheric pressure as $${P0}\\text{ kPa}$.`;

/* ================================================================
 * Pressure
 * ================================================================ */

const AREAS = [0.2, 0.25, 0.4, 0.5, 0.8, 1.6, 2, 2.5, 4];
const CM_AREAS = [2, 4, 5, 8, 10, 16, 20, 25, 40, 50, 80, 100, 125, 200, 250];
const RESTING = ['crate', 'fridge', 'piano', 'statue', 'water tank', 'bookcase'];

interface PressureParams {
  thing: string;
  /** Easy: the force in newtons on an area in square metres, pressure in Pa. */
  F: number;
  A: number;
  /** Hard: a mass in kilograms on an area in square centimetres, pressure in kPa. */
  cm: boolean;
}

const pressureOf = ({ F, A, cm }: PressureParams): number => (cm ? n3((9.8 * F * 10) / A) : n3(F / A));

/** Expression: pressure F/A, from newtons on square metres (easy) or a mass on square centimetres, in kPa (hard). */
const pressure: Generator<PressureParams> = {
  id: 'clm-pressure',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? until(
          () => ({ thing: rng.pick(['table leg', 'chair leg', 'tent peg', 'stiletto heel', 'bed post']), F: rng.int(2, 60), A: rng.pick(CM_AREAS), cm: true }),
          (p) => exact(pressureOf(p), 2),
        )
      : { thing: rng.pick(RESTING), F: 10 * rng.int(5, 200), A: rng.pick(AREAS), cm: false },
  render: (p) =>
    p.cm
      ? typed(
          [say(`A load of ${kg(p.F)} rests on one ${p.thing} whose end has an area of ${sqcm(p.A)}. ${G_NOTE} What pressure does it put on the floor, in kPa?`)],
          'p =',
          pressureOf(p),
        )
      : typed([say(`A ${p.thing} pushes down with ${newtons(p.F)} on a base of area ${sqm(p.A)}. What pressure does it put on the floor, in pascals?`)], 'p =', pressureOf(p)),
  solution: (p) =>
    p.cm
      ? [
          { tex: `F = ${p.F} \\times 9.8 = ${fmt(9.8 * p.F)}` },
          { tex: `A = ${p.A} \\div 10\\,000 = ${fmt(p.A / 10000)}` },
          { tex: `p = \\frac{${fmt(9.8 * p.F)}}{${fmt(p.A / 10000)}} = ${fmt(pressureOf(p) * 1000)}` },
          { text: 'That is in pascals; divide by 1000 for kPa.' },
          { tex: `p = ${fmt(pressureOf(p))}` },
        ]
      : [{ tex: `p = \\frac{F}{A} = \\frac{${p.F}}{${fmt(p.A)}} = ${fmt(pressureOf(p))}` }],
  choices: (p) => {
    const right = pressureOf(p);
    return p.cm
      ? numChoices(right, [right / 100, right * 100, right / 9.8, right * 10], salted(p.F, p.A))
      : numChoices(right, [p.F * p.A, right / 10, 2 * right], salted(p.F, p.A, 1));
  },
};

interface PressureRow {
  F: number;
  A: number;
  blank: 'F' | 'A' | 'p';
}

/** Table: rows of force, area and pressure, one blank each. Easy blanks only the pressure. */
const pressureTable: Generator<{ rows: PressureRow[] }> = {
  id: 'clm-pressure-table',
  sample: (rng, difficulty) =>
    until(
      () => ({
        rows: [0, 1, 2].map((): PressureRow => ({
          F: 10 * rng.int(2, 120),
          A: rng.pick(AREAS),
          blank: difficulty > 1 ? rng.pick(['F', 'A', 'p'] as const) : 'p',
        })),
      }),
      ({ rows }) => new Set(rows.map((r) => fmt(r.F / r.A))).size === 3 && (difficulty < 2 || new Set(rows.map((r) => r.blank)).size > 1),
    ),
  render: ({ rows }) => {
    const value = (r: PressureRow) => (r.blank === 'F' ? r.F : r.blank === 'A' ? r.A : n3(r.F / r.A));
    const answer = rows.map(value);
    return {
      kind: 'table',
      prompt: [say('Each row is a force in newtons spread over an area in square metres. Fill in the gaps using $p = \\frac{F}{A}$, with $p$ in pascals.')],
      columns: ['F', 'A', 'p'],
      rows: rows.map((r) => [r.blank === 'F' ? null : fmt(r.F), r.blank === 'A' ? null : fmt(r.A), r.blank === 'p' ? null : fmt(r.F / r.A)]),
      bank: tidyBank(answer, rows.flatMap((r) => [r.F * r.A, r.A / r.F < 0.001 ? 0 : n3(r.A / r.F), 2 * value(r)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 'F'
        ? { tex: `F = pA = ${fmt(r.F / r.A)} \\times ${fmt(r.A)} = ${fmt(r.F)}` }
        : r.blank === 'A'
          ? { tex: `A = \\frac{F}{p} = \\frac{${fmt(r.F)}}{${fmt(r.F / r.A)}} = ${fmt(r.A)}` }
          : { tex: `p = \\frac{${fmt(r.F)}}{${fmt(r.A)}} = ${fmt(r.F / r.A)}` },
    ),
};

interface HeelParams {
  /** A person of this mass on one heel of this many square centimetres. */
  m: number;
  heel: number;
  /** An animal of this mass on four feet, each of this area: square metres for an elephant, square centimetres for a hoof. */
  name: string;
  M: number;
  foot: number;
  footCm: boolean;
}

const ANIMALS: { name: string; masses: number[]; feet: number[]; footCm: boolean }[] = [
  { name: 'An elephant', masses: [2500, 3000, 3500, 4000, 4500, 5000, 6000], feet: [0.1, 0.12, 0.15, 0.16, 0.18, 0.2, 0.25], footCm: false },
  { name: 'A horse', masses: [400, 450, 500, 550, 600, 700], feet: [100, 120, 150, 180, 200, 250], footCm: true },
  { name: 'A cow', masses: [500, 600, 700, 750, 800], feet: [100, 120, 150, 180, 200], footCm: true },
];

/** Pressures in kPa, asked to 3 significant figures. */
const heelKpa = ({ m, heel }: HeelParams): number => (9.8 * m * 10) / heel;
const footM2 = ({ foot, footCm }: HeelParams): number => (footCm ? foot / 10000 : foot);
const footKpa = (p: HeelParams): number => (9.8 * p.M) / (4 * footM2(p)) / 1000;

/** Flow: a person on one heel against a heavy animal on four feet: each pressure, then which is greater. */
const heelFlow: Generator<HeelParams> = {
  id: 'clm-heel-flow',
  sample: (rng, difficulty) =>
    until(
      () => {
        const animal = rng.pick(difficulty > 1 ? ANIMALS : [ANIMALS[0]]);
        return {
          m: 5 * rng.int(9, 20),
          heel: rng.pick(difficulty > 1 ? [1, 2, 4, 5] : [1, 2]),
          name: animal.name,
          M: rng.pick(animal.masses),
          foot: rng.pick(animal.feet),
          footCm: animal.footCm,
        };
      },
      (p) => roundedWell(heelKpa(p), SF3) && roundedWell(footKpa(p), SF3) && Math.abs(heelKpa(p) - footKpa(p)) > 5,
    ),
  render: (p) => {
    const person = heelKpa(p);
    const animal = footKpa(p);
    const who = p.name.replace(/^An? /, 'the ');
    const PERSON = 'The person on the heel';
    const ANIMAL = `The ${who.replace(/^the /, '')}`;
    const why = 'Pressure is force per area: a small area can win even against a much bigger weight.';
    const step = (v: number) => 10 ** (Math.floor(Math.log10(v)) - 1);
    return {
      kind: 'flow',
      calculator: true,
      prompt: [
        say(
          `${String(p.m).startsWith('8') ? 'An' : 'A'} ${p.m} kg person stands on one heel of area ${sqcm(p.heel)}. ${p.name} of mass ${kg(p.M)} stands on four feet, each of area ${p.footCm ? sqcm(p.foot) : sqm(p.foot)}. ${G_NOTE}`,
        ),
        say(`Which presses harder on the floor? Give each pressure in kPa ${precisionWords(SF3)}.`),
      ],
      subject: 'p = \\frac{F}{A}',
      steps: [
        {
          id: 'heel',
          ask: 'Pressure under the heel, in kPa:',
          branches: fixedForks(person, [person / 100, person / 10, person / 9.8], SF3, step(person)).map((label) => ({ label, to: 'feet' })),
        },
        {
          id: 'feet',
          ask: `Pressure under each foot of ${who}, in kPa:`,
          branches: fixedForks(animal, [animal * 4, animal / 9.8, animal * 10], SF3, step(animal)).map((label) => ({ label, to: 'more' })),
        },
        {
          id: 'more',
          ask: 'So the greater pressure is from:',
          branches: [
            { label: PERSON, outcome: why },
            { label: ANIMAL, outcome: why },
          ],
        },
      ],
      answer: [`$${fixed(person, SF3)}$`, `$${fixed(animal, SF3)}$`, person > animal ? PERSON : ANIMAL],
    };
  },
  solution: (p) => [
    { tex: `p_{\\text{heel}} = \\frac{${p.m} \\times 9.8}{${fmt(p.heel / 10000)}} = ${fmt(heelKpa(p) * 1000)}\\text{ Pa}` },
    { tex: `p_{\\text{heel}} = ${dots(heelKpa(p), 2)}\\text{ kPa}` },
    ...(p.footCm ? [{ text: `Each hoof is $${p.foot} \\div 10\\,000 = ${fmt(footM2(p))}\\text{ m}^{2}$.` }] : []),
    { text: 'The animal stands on four feet, so each carries a quarter of its weight:' },
    { tex: `p_{\\text{foot}} = \\frac{${p.M} \\times 9.8}{4 \\times ${fmt(footM2(p))}} = ${dots(footKpa(p) * 1000, 1)}\\text{ Pa}` },
    { tex: `p_{\\text{foot}} = ${dots(footKpa(p), 3)}\\text{ kPa}` },
    { text: `To 3 significant figures, $${fixed(heelKpa(p), SF3)}\\text{ kPa}$ under the heel and $${fixed(footKpa(p), SF3)}\\text{ kPa}$ under each foot.` },
  ],
};

interface SnowParams {
  /** Easy: the area needed exactly, in steps of 0.02 square metres. Hard: unused. */
  steps: number;
  /** Easy: the weight in newtons; hard: a mass in kilograms. */
  load: number;
  hard: boolean;
  /** The most the ground takes, in kPa. */
  limit: number;
}

const SNOW_MAX = 1;
const SNOW_STEP = 0.02;
const SNOW_LIMITS = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 10, 12];

/** The area, in square metres, that puts the load exactly at the limit. */
const snowArea = ({ load, hard, limit }: SnowParams): number => ((hard ? 9.8 * load : load) / (1000 * limit));

/** Slider: the least area that keeps the pressure under what the ground takes, A = F/p; the walker's is to the nearest notch. */
const areaSlider: Generator<SnowParams> = {
  id: 'clm-area-slider',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? until(
          () => ({ steps: 0, load: rng.int(40, 110), hard: true, limit: rng.pick(SNOW_LIMITS) }),
          (p) => snowArea(p) >= 0.1 && snowArea(p) <= SNOW_MAX - 0.05 && notchedWell(snowArea(p), SNOW_STEP),
        )
      : until(
          () => {
            const steps = rng.int(3, 50);
            const limit = rng.pick([1, 2, 2.5, 4, 5, 8, 10, 12.5, 20]);
            return { steps, load: n3(1000 * limit * SNOW_STEP * steps), hard: false, limit };
          },
          (p) => p.load <= 5000 && Number.isInteger(p.load),
        ),
  render: (p) => {
    const figure = track(0, SNOW_MAX, [], 'A scale of areas in square metres');
    return {
      kind: 'slider',
      calculator: true,
      prompt: [
        say(
          p.hard
            ? `Soft snow gives way above ${kpa(p.limit)}. A walker of mass ${kg(p.load)} wants snowshoes that keep them on top. ${G_NOTE} Slide to the least total area of snowshoe, to the nearest $0.02\\text{ m}^{2}$.`
            : `Soft ground gives way above ${kpa(p.limit)}. A shed pushes down with ${newtons(p.load)}. Slide to the least area of base that stops it sinking, in $\\text{m}^{2}$.`,
        ),
      ],
      min: 0,
      max: SNOW_MAX,
      step: SNOW_STEP,
      answer: notch(snowArea(p), SNOW_STEP),
      readout: 'A = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [
    ...(p.hard ? [{ tex: `F = ${p.load} \\times 9.8 = ${fmt(9.8 * p.load)}` }] : []),
    { text: `Put the limit in pascals, $${fmt(p.limit * 1000)}\\text{ Pa}$, and rearrange $p = \\frac{F}{A}$:` },
    { tex: `A = \\frac{${fmt(p.hard ? 9.8 * p.load : p.load)}}{${fmt(p.limit * 1000)}} = ${p.hard ? dots(snowArea(p)) : fmt(snowArea(p))}` },
    ...(p.hard ? [{ text: `The nearest $0.02$ is $${fmt(notch(snowArea(p), SNOW_STEP))}\\text{ m}^{2}$.` }] : []),
  ],
};

/* ================================================================
 * Pressure in a fluid
 * ================================================================ */

const LIQUIDS = [
  { name: 'sea water', rho: 1025 },
  { name: 'oil', rho: 800 },
  { name: 'glycerine', rho: 1260 },
];

interface DepthParams {
  /** Depth in half metres. */
  halves: number;
  /** Fresh water unless named. */
  liquid: { name: string; rho: number } | null;
  absolute: boolean;
}

/** Gauge pressure at the depth, in kPa: rho g h / 1000. */
const gaugeKpa = ({ halves, liquid }: DepthParams): number => n3(((liquid ? liquid.rho : 1000) * 9.8 * (halves / 2)) / 1000);

/** Expression: pressure at a depth: gauge in fresh water (easy), absolute in another liquid (hard). */
const depthPressure: Generator<DepthParams> = {
  id: 'clm-depth-pressure',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { halves: 2 * rng.int(1, 25), liquid: rng.pick(LIQUIDS), absolute: true }
      : { halves: rng.int(1, 60), liquid: null, absolute: false },
  render: (p) => {
    const h = p.halves / 2;
    if (p.absolute && p.liquid) {
      return typed(
        [say(`A tank holds ${p.liquid.name} of density ${density(p.liquid.rho)}. ${G_NOTE} ${P0_NOTE} What is the total pressure ${metres(h)} below the open surface, in kPa?`)],
        'p =',
        n3(P0 + gaugeKpa(p)),
      );
    }
    return typed([say(`A diver is ${metres(h)} below the surface of a fresh-water lake, density ${density(1000)}. ${G_NOTE} How much more is the pressure there than at the surface, in kPa?`)], 'p =', gaugeKpa(p));
  },
  solution: (p) => {
    const h = p.halves / 2;
    const rho = p.liquid ? p.liquid.rho : 1000;
    return [
      { tex: `\\rho g h = ${rho} \\times 9.8 \\times ${fmt(h)} = ${fmt(gaugeKpa(p) * 1000)}\\text{ Pa}` },
      { tex: `\\rho g h = ${fmt(gaugeKpa(p))}\\text{ kPa}` },
      ...(p.absolute ? [{ text: 'Add the air pressing on the surface:' }, { tex: `p = ${P0} + ${fmt(gaugeKpa(p))} = ${fmt(P0 + gaugeKpa(p))}` }] : []),
    ];
  },
  choices: (p) => {
    const gauge = gaugeKpa(p);
    const right = p.absolute ? n3(P0 + gauge) : gauge;
    const rho = p.liquid ? p.liquid.rho : 1000;
    return numChoices(right, p.absolute ? [gauge, n3(P0 + (1000 * 9.8 * p.halves) / 2000), n3(P0 + gauge / 9.8)] : [n3(gauge / 9.8), n3(gauge * 2), n3((rho * p.halves) / 2000)], salted(p.halves, rho));
  },
};

interface WindowParams {
  /** Depth in half metres. */
  halves: number;
  /** The window's area in square metres. */
  A: number;
  sea: boolean;
}

const windowGauge = ({ halves, sea }: WindowParams): number => n3(((sea ? 1025 : 1000) * 9.8 * (halves / 2)) / 1000);

/** Tree: a window in a tank or a submarine: the pressure of the water, the total pressure, and the push on the window (air inside at atmospheric). */
const depthTree: Generator<WindowParams> = {
  id: 'clm-depth-tree',
  sample: (rng, difficulty) =>
    until(
      () => (difficulty > 1 ? { halves: 2 * rng.int(4, 40), A: rng.pick([0.1, 0.2, 0.25, 0.4, 0.5]), sea: true } : { halves: rng.int(2, 24), A: rng.pick([0.5, 1, 2, 1.5, 2.5, 3]), sea: false }),
      (p) => exact(windowGauge(p) * p.A, 3),
    ),
  render: (p) => {
    const gauge = windowGauge(p);
    const total = n3(P0 + gauge);
    const push = n3(gauge * p.A);
    return {
      kind: 'tree',
      prompt: [
        say(
          p.sea
            ? `A submarine window of area ${sqm(p.A)} is ${metres(p.halves / 2)} under the sea, density ${density(1025)}. Inside, the air is at atmospheric pressure. ${G_NOTE} ${P0_NOTE}`
            : `An aquarium window of area ${sqm(p.A)} has its centre ${metres(p.halves / 2)} below the surface of fresh water. ${G_NOTE} ${P0_NOTE}`,
        ),
        say('Find the pressure of the water alone, the total pressure, both in kPa, and the push on the window from outside beyond the air inside, in kN.'),
      ],
      expression: 'p = p_{0} + \\rho g h',
      nodes: [
        { id: '\\rho g h', from: [] },
        { id: 'p', from: ['\\rho g h'] },
        { id: 'F', from: ['\\rho g h'] },
      ],
      bank: tidyBank([gauge, total, push], [n3(total * p.A), n3(gauge / p.A), n3(P0 - gauge)]),
      answer: [gauge, total, push].map(fmt),
    };
  },
  solution: (p) => {
    const gauge = windowGauge(p);
    return [
      { tex: `\\rho g h = ${p.sea ? 1025 : 1000} \\times 9.8 \\times ${fmt(p.halves / 2)} = ${fmt(gauge * 1000)}\\text{ Pa}` },
      { tex: `\\rho g h = ${fmt(gauge)}\\text{ kPa}` },
      { tex: `p = ${P0} + ${fmt(gauge)} = ${fmt(P0 + gauge)}` },
      { text: 'The air pressure acts on both faces and cancels, so only the water pressure pushes the window in:' },
      { tex: `F = ${fmt(gauge)} \\times ${fmt(p.A)} = ${fmt(gauge * p.A)}` },
    ];
  },
};

interface DiveParams {
  halves: number;
  /** Hard: the total pressure is given, not the water's alone. */
  total: boolean;
}

const DIVE_MAX = 40;

/** Slider: the depth in fresh water where the pressure reaches a reading. */
const depthSlider: Generator<DiveParams> = {
  id: 'clm-depth-slider',
  sample: (rng, difficulty) => ({ halves: rng.int(2, 2 * DIVE_MAX), total: difficulty > 1 }),
  render: ({ halves, total }) => {
    const gauge = n3(9.8 * (halves / 2));
    const figure = track(0, DIVE_MAX, [{ at: 0, name: 'surface' }], 'Depths below the surface in metres');
    return {
      kind: 'slider',
      prompt: [
        say(
          total
            ? `A diver's watch reads the total pressure around it: ${kpa(n3(P0 + gauge))}. The lake is fresh water, density ${density(1000)}. ${G_NOTE} ${P0_NOTE} Slide to the diver's depth, in metres.`
            : `A pressure sensor in a fresh-water reservoir, density ${density(1000)}, reads ${kpa(gauge)} more than at the surface. ${G_NOTE} Slide to its depth, in metres.`,
        ),
      ],
      min: 0,
      max: DIVE_MAX,
      step: 0.5,
      answer: halves / 2,
      readout: 'h = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: ({ halves, total }) => {
    const gauge = n3(9.8 * (halves / 2));
    return [
      ...(total ? [{ tex: `\\rho g h = ${fmt(P0 + gauge)} - ${P0} = ${fmt(gauge)}` }] : []),
      { text: 'Each metre of fresh water adds $1000 \\times 9.8 = 9800\\text{ Pa}$, which is $9.8\\text{ kPa}$:' },
      { tex: `h = ${fmt(gauge)} \\div 9.8 = ${fmt(halves / 2)}` },
    ];
  },
};

interface PressRow {
  /** Piston areas in square centimetres, the big one a whole multiple of the small. */
  small: number;
  ratio: number;
  /** Force on the small piston, in newtons. */
  F: number;
  blank: 'in' | 'out';
}

/** Table: a hydraulic press passes the same pressure on, so F2 = F1 A2 / A1. Easy blanks only the output. */
const hydraulicTable: Generator<{ rows: PressRow[] }> = {
  id: 'clm-hydraulic-table',
  sample: (rng, difficulty) =>
    until(
      () => ({
        rows: [0, 1, 2].map((): PressRow => ({
          small: rng.pick([2, 4, 5, 10, 20]),
          ratio: rng.int(2, difficulty > 1 ? 40 : 12),
          F: 5 * rng.int(2, 30),
          blank: difficulty > 1 ? rng.pick(['in', 'out'] as const) : 'out',
        })),
      }),
      ({ rows }) => new Set(rows.map((r) => r.F * r.ratio)).size === 3 && (difficulty < 2 || new Set(rows.map((r) => r.blank)).size > 1),
    ),
  render: ({ rows }) => {
    const answer = rows.map((r) => (r.blank === 'in' ? r.F : r.F * r.ratio));
    return {
      kind: 'table',
      prompt: [say('Each row is a hydraulic press: a small piston of area $A_{1}$ pushes on oil that pushes a big piston of area $A_{2}$, both in $\\text{cm}^{2}$. Fill in the forces, in newtons.')],
      columns: ['A_{1}', 'A_{2}', 'F_{1}', 'F_{2}'],
      rows: rows.map((r) => [fmt(r.small), fmt(r.small * r.ratio), r.blank === 'in' ? null : fmt(r.F), r.blank === 'out' ? null : fmt(r.F * r.ratio)]),
      bank: tidyBank(answer, rows.flatMap((r) => (r.blank === 'in' ? [r.F * r.ratio * r.ratio, r.F + 10] : [r.F + r.ratio, r.F * r.ratio * 2]))),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 'in'
        ? { tex: `F_{1} = ${fmt(r.F * r.ratio)} \\times \\frac{${r.small}}{${r.small * r.ratio}} = ${fmt(r.F)}` }
        : { tex: `F_{2} = ${fmt(r.F)} \\times \\frac{${r.small * r.ratio}}{${r.small}} = ${fmt(r.F * r.ratio)}` },
    ),
};

/* ================================================================
 * Buoyancy
 * ================================================================ */

const SUNK = ['stone', 'anchor', 'brick', 'metal block', 'diver’s weight belt', 'bronze statue'];

interface BuoyParams {
  thing: string;
  /** Easy: volume in half litres, in fresh water. */
  halves: number;
  /** Hard: volume in cubic centimetres, in another liquid. */
  cc: number;
  liquid: { name: string; rho: number } | null;
}

const buoyancyOf = ({ halves, cc, liquid }: BuoyParams): number => (liquid ? n3((liquid.rho * cc * 9.8) / 1e6) : n3(9.8 * (halves / 2)));

/** Expression: the buoyant force, the weight of the liquid pushed aside. */
const buoyantForce: Generator<BuoyParams> = {
  id: 'clm-buoyant-force',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? until(
          () => ({ thing: rng.pick(SUNK), halves: 0, cc: 100 * rng.int(1, 40), liquid: rng.pick(LIQUIDS) }),
          (p) => exact(buoyancyOf(p), 4),
        )
      : { thing: rng.pick(SUNK), halves: rng.int(1, 60), cc: 0, liquid: null },
  render: (p) =>
    p.liquid
      ? typed(
          [say(`A ${p.thing} of volume $${p.cc}\\text{ cm}^{3}$ hangs completely under ${p.liquid.name} of density ${density(p.liquid.rho)}. ${G_NOTE} What is the buoyant force on it, in newtons?`)],
          'B =',
          buoyancyOf(p),
        )
      : typed([say(`A ${p.thing} of volume ${litres(p.halves / 2)} lies completely under fresh water, density ${density(1000)}. ${G_NOTE} What is the buoyant force on it, in newtons?`)], 'B =', buoyancyOf(p)),
  solution: (p) =>
    p.liquid
      ? [
          { tex: `V = ${p.cc} \\div 1\\,000\\,000 = ${fmt(p.cc / 1e6)}` },
          { tex: `m = ${p.liquid.rho} \\times ${fmt(p.cc / 1e6)} = ${fmt((p.liquid.rho * p.cc) / 1e6)}` },
          { tex: `B = ${fmt((p.liquid.rho * p.cc) / 1e6)} \\times 9.8 = ${fmt(buoyancyOf(p))}` },
        ]
      : [
          { text: 'A litre of fresh water has a mass of $1\\text{ kg}$, so the water pushed aside is' },
          { tex: `m = ${fmt(p.halves / 2)}` },
          { tex: `B = ${fmt(p.halves / 2)} \\times 9.8 = ${fmt(buoyancyOf(p))}` },
        ],
  choices: (p) => {
    const right = buoyancyOf(p);
    return numChoices(right, [n3(right / 9.8), n3(right * 1000), n3(right * 2), n3(right / 10)], salted(p.halves, p.cc, p.liquid ? p.liquid.rho : 0));
  },
};

interface FloatParams {
  /** Block density and the liquid's, chosen so the ratio terminates. */
  rho: number;
  fluid: { name: string; rho: number };
  /** Height of the block, in centimetres. */
  H: number;
}

const WATER = { name: 'fresh water', rho: 1000 };
const OIL = { name: 'oil', rho: 800 };
const SEA = { name: 'sea water', rho: 1025 };

const sunkDepth = ({ rho, fluid, H }: FloatParams): number => n3((H * rho) / fluid.rho);

/** Expression: how deep a floating block sits: the fraction rho/rho_fluid of its height. */
const floatDepth: Generator<FloatParams> = {
  id: 'clm-float-depth',
  sample: (rng, difficulty) =>
    until(
      () => {
        if (difficulty < 2) return { rho: 50 * rng.int(4, 19), fluid: WATER, H: rng.int(4, 40) };
        const fluid = rng.pick([OIL, SEA]);
        const rho = fluid === OIL ? 40 * rng.int(4, 19) : 205 * rng.int(1, 4);
        return { rho, fluid, H: rng.int(4, 40) };
      },
      (p) => exact(sunkDepth(p), 2),
    ),
  render: (p) =>
    typed(
      [say(`A block of density ${density(p.rho)} and height $${p.H}\\text{ cm}$ floats upright in ${p.fluid.name} of density ${density(p.fluid.rho)}. How deep is its bottom face below the surface, in centimetres?`)],
      'd =',
      sunkDepth(p),
    ),
  solution: (p) => [
    { text: 'Floating, its weight equals the weight of the liquid it pushes aside, so the fraction under is the ratio of the densities:' },
    { tex: `\\frac{${p.rho}}{${p.fluid.rho}} = ${fmt(p.rho / p.fluid.rho)}` },
    { tex: `d = ${fmt(p.rho / p.fluid.rho)} \\times ${p.H} = ${fmt(sunkDepth(p))}` },
  ],
  choices: (p) => {
    const d = sunkDepth(p);
    return numChoices(d, [n3(p.H - d), n3((p.H * p.fluid.rho) / p.rho), n3(p.rho / p.fluid.rho)], salted(p.rho, p.H, p.fluid.rho));
  },
};

interface WeighParams {
  thing: string;
  /** Mass in kilograms and volume in litres; it sinks, so m > V. */
  m: number;
  V: number;
  /** Hard: the readings are given and the density is asked. */
  hard: boolean;
}

/** Tree: a spring balance holds a sunk object: its weight, the buoyant force, the reading (easy); or from the readings, the volume and density (hard). */
const weighTree: Generator<WeighParams> = {
  id: 'clm-weigh-tree',
  sample: (rng, difficulty) =>
    until(
      () => {
        const m = difficulty > 1 ? rng.int(2, 30) : rng.int(2, 20);
        return { thing: rng.pick(SUNK), m, V: difficulty > 1 ? rng.int(1, m - 1) : rng.int(1, m - 1) / 2, hard: difficulty > 1 };
      },
      (p) => p.m / p.V >= 1.5 && p.m / p.V <= 12 && exact((1000 * p.m) / p.V, 1),
    ),
  render: (p) => {
    const W = n3(9.8 * p.m);
    const B = n3(9.8 * p.V);
    const reading = n3(W - B);
    if (p.hard) {
      const rho = n3((1000 * p.m) / p.V);
      return {
        kind: 'tree',
        prompt: [
          say(`A ${p.thing} hung from a spring balance reads ${newtons(W)} in air and ${newtons(reading)} completely under fresh water, density ${density(1000)}. ${G_NOTE}`),
          say('Find the buoyant force in newtons, the volume in cubic metres, and the density in $\\text{kg m}^{-3}$.'),
        ],
        expression: 'B = \\rho_{\\text{water}} V g',
        nodes: [
          { id: 'B', from: [] },
          { id: 'V', from: ['B'] },
          { id: '\\rho', from: ['V'] },
        ],
        bank: tidyBank([B, p.V / 1000, rho], [n3(W + reading), p.V, n3((1000 * reading) / (9.8 * p.V)), n3(p.V / 100)]),
        answer: [B, p.V / 1000, rho].map(fmt),
      };
    }
    return {
      kind: 'tree',
      prompt: [
        say(`A ${p.thing} of mass ${kg(p.m)} and volume ${litres(p.V)} hangs from a spring balance, completely under fresh water. ${G_NOTE}`),
        say('Find its weight, the buoyant force and what the balance reads, all in newtons.'),
      ],
      expression: '\\text{reading} = W - B',
      nodes: [
        { id: 'W', from: [] },
        { id: 'B', from: [] },
        { id: 'T', from: ['W', 'B'] },
      ],
      bank: tidyBank([W, B, reading], [n3(W + B), p.m - p.V, n3(9.8 * (p.m + p.V))]),
      answer: [W, B, reading].map(fmt),
    };
  },
  solution: (p) => {
    const W = n3(9.8 * p.m);
    const B = n3(9.8 * p.V);
    return p.hard
      ? [
          { text: 'The balance reads less by exactly the buoyant force:' },
          { tex: `B = ${fmt(W)} - ${fmt(W - B)} = ${fmt(B)}` },
          { tex: `V = \\frac{${fmt(B)}}{1000 \\times 9.8} = ${fmt(p.V / 1000)}` },
          { tex: `m = ${fmt(W)} \\div 9.8 = ${p.m}` },
          { tex: `\\rho = \\frac{${p.m}}{${fmt(p.V / 1000)}} = ${fmt((1000 * p.m) / p.V)}` },
        ]
      : [
          { tex: `W = ${p.m} \\times 9.8 = ${fmt(W)}` },
          { tex: `B = ${fmt(p.V)} \\times 9.8 = ${fmt(B)}` },
          { tex: `T = ${fmt(W)} - ${fmt(B)} = ${fmt(W - B)}` },
        ];
  },
};

interface SinkParams {
  thing: string;
  /** Mass in kilograms (halves) and volume in litres. */
  m: number;
  V: number;
  fluid: { name: string; rho: number };
}

const THINGS = ['sealed box', 'plastic toy', 'log', 'buoy', 'bottle', 'sealed tin', 'coconut', 'crate'];

/** Flow: density m/V; float or sink in the liquid; and if it floats, the fraction under. */
const sinkFlow: Generator<SinkParams> = {
  id: 'clm-sink-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({ thing: rng.pick(THINGS), m: rng.int(1, 60) / 2, V: rng.int(2, 40), fluid: difficulty > 1 ? rng.pick([OIL, WATER]) : WATER }),
      (p) => {
        const rho = (1000 * p.m) / p.V;
        return exact(rho, 1) && rho !== p.fluid.rho && exact(rho / p.fluid.rho, 3) && rho > 100 && rho < 3000;
      },
    ),
  render: (p) => {
    const rho = n3((1000 * p.m) / p.V);
    const floats = rho < p.fluid.rho;
    const frac = n3(rho / p.fluid.rho);
    return {
      kind: 'flow',
      prompt: [say(`A ${p.thing} has a mass of ${kg(p.m)} and a volume of ${litres(p.V)}. It is put in ${p.fluid.name}, density ${density(p.fluid.rho)}. Does it float, and if so how much of it is under?`)],
      subject: '\\rho = \\frac{m}{V}',
      steps: [
        {
          id: 'rho',
          ask: 'Its density, in $\\text{kg m}^{-3}$:',
          branches: forks(rho, [n3(p.m / p.V), n3(rho * 2), n3((1000 * p.V) / p.m)], 50).map((label) => ({ label, to: 'fate' })),
        },
        {
          id: 'fate',
          ask: `Compared with the ${p.fluid.name}:`,
          branches: [
            { label: 'It floats', to: 'frac' },
            { label: 'It sinks', outcome: 'Denser than the liquid, its weight beats the most buoyancy it can get, which is when fully under.' },
          ],
        },
        {
          id: 'frac',
          ask: 'The fraction of its volume under the surface:',
          branches: forks(frac, [n3(1 - frac), n3(p.fluid.rho / rho), n3(frac / 2)], 0.1).map((label) => ({ label, outcome: 'It sinks until the liquid pushed aside weighs as much as it does.' })),
        },
      ],
      answer: floats ? [`$${fmt(rho)}$`, 'It floats', `$${fmt(frac)}$`] : [`$${fmt(rho)}$`, 'It sinks'],
    };
  },
  solution: (p) => {
    const rho = (1000 * p.m) / p.V;
    return [
      { tex: `V = ${p.V} \\div 1000 = ${fmt(p.V / 1000)}` },
      { tex: `\\rho = \\frac{${fmt(p.m)}}{${fmt(p.V / 1000)}} = ${fmt(rho)}` },
      rho < p.fluid.rho
        ? { tex: `\\frac{${fmt(rho)}}{${p.fluid.rho}} = ${fmt(rho / p.fluid.rho)}` }
        : { text: `More than ${p.fluid.rho}, so it sinks.` },
    ];
  },
};

/* ================================================================
 * Drag and terminal speed
 * ================================================================ */

const K_LIST = [0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.2];
/** What falls, with the masses in kilograms that fit it: never a 5 kg skydiver. */
const FALLERS: Record<string, [number, number]> = {
  skydiver: [55, 110],
  parachutist: [55, 110],
  'test dummy': [50, 100],
  'drop capsule': [20, 200],
  sandbag: [5, 40],
};

interface DragParams {
  /** Easy: F = kv^2 with k given. Hard: C, A and air density 1.2. */
  k: number;
  C: number;
  A: number;
  v: number;
  hard: boolean;
}

const dragOf = ({ k, C, A, v, hard }: DragParams): number => n3(hard ? 0.5 * C * 1.2 * A * v * v : k * v * v);

/** Expression: drag at a speed: F = kv^2 (easy) or F = 1/2 C rho A v^2 (hard). */
const dragForce: Generator<DragParams> = {
  id: 'clm-drag-force',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { k: 0, C: rng.pick([0.3, 0.4, 0.5, 0.8, 1, 1.2]), A: rng.pick([0.5, 0.6, 0.7, 1, 1.5, 2]), v: rng.int(5, 40), hard: true }
      : { k: rng.pick(K_LIST), C: 0, A: 0, v: rng.int(2, 40), hard: false },
  render: (p) =>
    p.hard
      ? typed(
          [say(`A cyclist with drag coefficient $C = ${fmt(p.C)}$ and front area ${sqm(p.A)} rides at ${ms(p.v)} through air of density ${density(1.2)}. What is the drag force, in newtons?`)],
          'F =',
          dragOf(p),
        )
      : typed([say(`The drag on a falling ball is $F = kv^{2}$ with $k = ${fmt(p.k)}$ in SI units. What is the drag at ${ms(p.v)}, in newtons?`)], 'F =', dragOf(p)),
  solution: (p) =>
    p.hard
      ? [{ tex: `F = \\tfrac{1}{2} \\times ${fmt(p.C)} \\times 1.2 \\times ${fmt(p.A)} \\times ${p.v}^{2}` }, { tex: `F = ${fmt(dragOf(p))}` }]
      : [{ tex: `F = ${fmt(p.k)} \\times ${p.v}^{2} = ${fmt(p.k)} \\times ${p.v * p.v} = ${fmt(dragOf(p))}` }],
  choices: (p) => {
    const F = dragOf(p);
    return numChoices(F, p.hard ? [n3(2 * F), n3(F / p.v), n3(F / 1.2)] : [n3(p.k * p.v), n3(2 * F), n3(p.k * 2 * p.v)], salted(p.k, p.C, p.A, p.v));
  },
};

interface TerminalParams {
  thing: string;
  k: number;
  /** Easy: the weight in whole newtons. Hard: the mass in whole kilograms. */
  load: number;
  hard: boolean;
}

const weightFor = ({ load, hard }: TerminalParams): number => (hard ? n3(9.8 * load) : load);
/** Terminal speed, where kv^2 = W. */
const terminalSpeed = (p: TerminalParams): number => Math.sqrt(weightFor(p) / p.k);

const sampleTerminal = (
  rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T },
  hard: boolean,
  ok: (v: number) => boolean,
): TerminalParams =>
  until(
    () => {
      const thing = rng.pick(Object.keys(FALLERS));
      const [lo, hi] = FALLERS[thing];
      // Hard gives the mass; easy the weight, to the nearest ten newtons, of a mass that fits.
      const load = hard ? rng.int(lo, hi) : 10 * rng.int(Math.ceil((9.8 * lo) / 10), Math.floor((9.8 * hi) / 10));
      return { thing, k: rng.pick(K_LIST), load, hard };
    },
    (p) => {
      const v = terminalSpeed(p);
      return v >= 5 && v <= 78 && ok(v);
    },
  );

const terminalWorking = (p: TerminalParams): SolutionStep[] => [
  ...(p.hard ? [{ tex: `W = ${p.load} \\times 9.8 = ${fmt(weightFor(p))}` }] : []),
  { text: 'At terminal speed the drag has grown to match the weight:' },
  { tex: `${fmt(p.k)}v^{2} = ${fmt(weightFor(p))}` },
  { tex: `v^{2} = ${fmt(weightFor(p))} \\div ${fmt(p.k)} = ${dots(weightFor(p) / p.k, 2)}` },
  { tex: `v = ${dots(terminalSpeed(p))}` },
];

const fallerSays = (p: TerminalParams): string =>
  p.hard
    ? `A ${p.thing} of mass ${kg(p.load)} falls with drag $F = kv^{2}$, where $k = ${fmt(p.k)}$ in SI units. ${G_NOTE}`
    : `A ${p.thing} weighs ${newtons(p.load)} and falls with drag $F = kv^{2}$, where $k = ${fmt(p.k)}$ in SI units.`;

/** Expression: terminal speed, where drag kv^2 equals the weight, to 1 decimal place. */
const terminal: Generator<TerminalParams> = {
  id: 'clm-terminal',
  sample: (rng, difficulty) => sampleTerminal(rng, difficulty > 1, (v) => roundedWell(v, DP1)),
  render: (p) =>
    typedRounded([say(`${fallerSays(p)} What is its terminal speed, in $\\text{m s}^{-1}$? ${askPrecision(DP1)}`)], 'v =', terminalSpeed(p), DP1),
  solution: (p) => [...terminalWorking(p), ...roundLines('v', terminalSpeed(p), DP1)],
  choices: (p) => {
    const v = terminalSpeed(p);
    const r = (x: number) => roundTo(x, DP1);
    return numChoices(r(v), [r(weightFor(p) / p.k), r(v / 2), r(2 * v), r(Math.sqrt(p.hard ? p.load / p.k : weightFor(p) * p.k))], salted(p.k * 100, p.load), DP1);
  },
};

/** Slider: the terminal speed on a speed scale, from a weight (easy) or a mass (hard), to the nearest whole m/s. */
const terminalSlider: Generator<TerminalParams> = {
  id: 'clm-terminal-slider',
  sample: (rng, difficulty) => sampleTerminal(rng, difficulty > 1, (v) => notchedWell(v, 1)),
  render: (p) => {
    const figure = track(0, 80, [], 'A scale of speeds in metres per second');
    return {
      kind: 'slider',
      calculator: true,
      prompt: [say(`${fallerSays(p)} Slide to its terminal speed, to the nearest $1\\text{ m s}^{-1}$.`)],
      min: 0,
      max: 80,
      step: 1,
      answer: notch(terminalSpeed(p), 1),
      readout: 'v = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [...terminalWorking(p), { text: `The nearest whole speed is $${fmt(notch(terminalSpeed(p), 1))}\\text{ m s}^{-1}$.` }],
};

interface DragRow {
  /** This row's speed as a multiple of the first row's. */
  times: number;
  blank: 'v' | 'F';
}

interface DragTableParams {
  v0: number;
  F0: number;
  rows: DragRow[];
}

/** Table: drag grows as v^2: from one given row, fill the drag at other speeds (easy) or speeds for other drags (hard). */
const dragTable: Generator<DragTableParams> = {
  id: 'clm-drag-table',
  sample: (rng, difficulty) =>
    until(
      () => {
        const pool = difficulty > 1 ? [0.5, 2, 3, 4, 1.5, 2.5] : [2, 3, 4, 5, 0.5];
        const times = [rng.pick(pool), rng.pick(pool), rng.pick(pool)];
        return {
          v0: rng.pick([2, 4, 5, 6, 8, 10]),
          F0: rng.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 20]),
          rows: times.map((t): DragRow => ({ times: t, blank: difficulty > 1 ? rng.pick(['v', 'F'] as const) : 'F' })),
        };
      },
      ({ rows }) => new Set(rows.map((r) => r.times)).size === 3 && (rows.some((r) => r.blank === 'v') || rows.every((r) => r.blank === 'F')),
    ),
  render: ({ v0, F0, rows }) => {
    const v = (r: DragRow) => n3(v0 * r.times);
    const F = (r: DragRow) => n3(F0 * r.times * r.times);
    const answer = rows.map((r) => (r.blank === 'v' ? v(r) : F(r)));
    return {
      kind: 'table',
      prompt: [say('The drag on a car is $F = kv^{2}$. The first row is measured; fill in the rest, with $v$ in $\\text{m s}^{-1}$ and $F$ in newtons.')],
      columns: ['v', 'F'],
      rows: [[fmt(v0), fmt(F0)], ...rows.map((r) => [r.blank === 'v' ? null : fmt(v(r)), r.blank === 'F' ? null : fmt(F(r))])],
      bank: tidyBank(answer, rows.flatMap((r) => (r.blank === 'F' ? [n3(F0 * r.times), n3(F0 * r.times * 2)] : [n3(v0 * r.times * r.times), n3(v0 * r.times + 1)]))),
      answer: answer.map(fmt),
    };
  },
  solution: ({ v0, F0, rows }) => [
    { text: `From the first row, $k = ${F0} \\div ${v0}^{2} = ${fmt(F0 / (v0 * v0))}$. Or scale: speed times $n$ makes drag times $n^{2}$.` },
    ...rows.map((r): SolutionStep =>
      r.blank === 'F'
        ? { tex: `F = ${fmt(F0)} \\times ${fmt(r.times)}^{2} = ${fmt(F0 * r.times * r.times)}` }
        : { tex: `v = ${v0} \\times \\sqrt{\\frac{${fmt(F0 * r.times * r.times)}}{${F0}}} = ${v0} \\times ${fmt(r.times)} = ${fmt(v0 * r.times)}` },
    ),
  ],
};

interface FallParams {
  m: number;
  k: number;
  v: number;
}

/** Flow: part way down: drag kv^2, the force left over, then the acceleration. */
const fallAccelFlow: Generator<FallParams> = {
  id: 'clm-fall-accel-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: rng.pick(difficulty > 1 ? [50, 60, 64, 70, 75, 80, 90, 100] : [50, 80, 100, 125]), k: rng.pick([0.2, 0.25, 0.4, 0.5]), v: rng.int(5, 60) }),
      ({ m, k, v }) => {
        const net = 9.8 * m - k * v * v;
        return net > 0.1 * 9.8 * m && exact(net / m, 3) && exact(k * v * v, 3);
      },
    ),
  render: ({ m, k, v }) => {
    const drag = n3(k * v * v);
    const W = n3(9.8 * m);
    const net = n3(W - drag);
    const a = n3(net / m);
    return {
      kind: 'flow',
      prompt: [say(`A ${kg(m)} skydiver falls at ${ms(v)}, with drag $F = kv^{2}$ and $k = ${fmt(k)}$ in SI units. ${G_NOTE} What is the acceleration now?`)],
      subject: 'ma = mg - kv^{2}',
      steps: [
        { id: 'drag', ask: 'The drag now, in newtons:', branches: forks(drag, [n3(k * v), n3(2 * drag), n3(drag / 2)], 1).map((label) => ({ label, to: 'net' })) },
        { id: 'net', ask: 'The force left over downwards, in newtons:', branches: forks(net, [n3(W + drag), n3(m - drag), W], 1).map((label) => ({ label, to: 'a' })) },
        { id: 'a', ask: 'So the acceleration, in $\\text{m s}^{-2}$:', branches: forks(a, [n3(9.8 - a), 9.8, n3(a * 2)], 0.1).map((label) => ({ label, outcome: 'Less than g, and falling as the speed rises, until it reaches zero at terminal speed.' })) },
      ],
      answer: [`$${fmt(drag)}$`, `$${fmt(net)}$`, `$${fmt(a)}$`],
    };
  },
  solution: ({ m, k, v }) => [
    { tex: `F = ${fmt(k)} \\times ${v}^{2} = ${fmt(k * v * v)}` },
    { tex: `W = ${m} \\times 9.8 = ${fmt(9.8 * m)}` },
    { tex: `W - F = ${fmt(9.8 * m)} - ${fmt(k * v * v)} = ${fmt(9.8 * m - k * v * v)}` },
    { tex: `a = \\frac{${fmt(9.8 * m - k * v * v)}}{${m}} = ${fmt((9.8 * m - k * v * v) / m)}` },
  ],
};

/* ================================================================
 * Round a bend
 * ================================================================ */

interface BendPickParams {
  scene: ForceScene;
  story: string;
  arrows: { id: Direction; label: string; acts: boolean; why: string }[];
}

const VEHICLES = ['car', 'van', 'bus', 'motorbike', 'lorry'];

/** Forces: which forces act on a vehicle on a flat bend (easy) or a banked one (hard), seen from behind. */
const bendPick: Generator<BendPickParams> = {
  id: 'clm-bend-pick',
  sample: (rng, difficulty) => {
    const vehicle = rng.pick(VEHICLES);
    const v = rng.int(8, 30);
    const r = 10 * rng.int(3, 20);
    if (difficulty < 2) {
      const turn = rng.pick(['left', 'right'] as const);
      const out = turn === 'left' ? 'right' : 'left';
      return {
        scene: { surface: 'level' },
        story: `A ${vehicle} goes round a flat bend of radius ${metres(r)} at a steady ${ms(v)}, turning to the ${turn}. The picture is from behind.`,
        arrows: [
          { id: 'down', label: 'W', acts: true, why: 'Its weight acts straight down.' },
          { id: 'up', label: 'R', acts: true, why: 'The road pushes up on it: the reaction.' },
          { id: turn, label: 'F', acts: true, why: `Friction on the tyres acts to the ${turn}, towards the centre of the bend: that is what turns it.` },
          { id: out, label: 'C', acts: false, why: `Nothing pushes it to the ${out}. The pull outwards you feel is your body carrying on straight while the ${vehicle} turns.` },
        ],
      };
    }
    const angle = rng.pick([25, 30, 35, 40]);
    const rises = rng.pick(['left', 'right'] as const);
    const pace = rng.pick(['design', 'slow', 'fast'] as const);
    const paceWords =
      pace === 'design'
        ? 'at exactly the speed the banking is designed for'
        : pace === 'slow'
          ? 'more slowly than the speed the banking is designed for'
          : 'faster than the speed the banking is designed for';
    return {
      scene: { surface: 'slope', angle, rises },
      story: `A ${vehicle} goes round a bend of radius ${metres(r)} banked at $${angle}^\\circ$, ${paceWords}. The picture is from behind, the centre of the bend on the low side.`,
      arrows: [
        { id: 'down', label: 'W', acts: true, why: 'Its weight acts straight down.' },
        { id: 'outOfSlope', label: 'R', acts: true, why: 'The road pushes at right angles to its surface, tilted towards the centre: part of it does the turning.' },
        {
          id: 'upSlope',
          label: 'F',
          acts: pace === 'slow',
          why: pace === 'slow' ? 'Too slow, it would slide down the banking, so friction acts up the slope.' : 'Friction acts up the slope only when it goes too slowly for the banking.',
        },
        {
          id: 'downSlope',
          label: 'F',
          acts: pace === 'fast',
          why: pace === 'fast' ? 'Too fast, it would slide up and out, so friction acts down the slope.' : 'Friction acts down the slope only when it goes too fast for the banking.',
        },
      ],
    };
  },
  render: ({ scene, story, arrows }) => ({
    kind: 'forces',
    mode: 'pick',
    prompt: [
      say(story),
      say(
        arrows.some((a) => a.label === 'C')
          ? 'On the diagram, $W$ is the weight, $R$ the normal reaction, $F$ friction and $C$ an outward push. Tap every force that acts on it.'
          : 'On the diagram, $W$ is the weight, $R$ the normal reaction and $F$ friction. Tap every force that acts on it.',
      ),
    ],
    scene,
    arrows: arrows.map(({ id, label }) => ({ id, label })),
    answer: canonicalForces(arrows.filter((a) => a.acts).map((a) => a.id).join('|')),
  }),
  solution: ({ arrows }) => arrows.map((a) => ({ text: a.why })),
};

const MU = [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

interface FlatBendParams {
  /** The bend's radius in metres: given when the speed is asked, 0 otherwise. */
  r: number;
  /** The speed in whole metres per second: given when the radius is asked, 0 otherwise. */
  v: number;
  mu: number;
  find: 'v' | 'r';
}

/** v^2 = mu g r: the fastest speed round a flat bend, and the least radius for a speed. */
const flatSpeed = ({ r, mu }: FlatBendParams): number => Math.sqrt(mu * 9.8 * r);
const flatRadius = ({ v, mu }: FlatBendParams): number => (v * v) / (mu * 9.8);

/** Expression: the fastest speed round a flat bend, v = sqrt(mu g r), to 1 decimal place (easy), or the least radius for a speed, to 3 significant figures (hard). */
const flatBend: Generator<FlatBendParams> = {
  id: 'clm-flat-bend',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? until(
          () => ({ r: 0, v: rng.int(8, 35), mu: rng.pick(MU), find: 'r' as const }),
          (p) => flatRadius(p) >= 8 && flatRadius(p) <= 800 && roundedWell(flatRadius(p), SF3),
        )
      : until(
          () => ({ r: 5 * rng.int(2, 80), v: 0, mu: rng.pick(MU), find: 'v' as const }),
          (p) => roundedWell(flatSpeed(p), DP1),
        ),
  render: (p) =>
    p.find === 'v'
      ? typedRounded(
          [say(`A flat bend has radius ${metres(p.r)} and the tyres grip with friction coefficient $\\mu = ${fmt(p.mu)}$. ${G_NOTE} What is the fastest speed it can be taken at, in $\\text{m s}^{-1}$? ${askPrecision(DP1)}`)],
          'v =',
          flatSpeed(p),
          DP1,
        )
      : typedRounded(
          [say(`A car must take a flat bend at ${ms(p.v)} with friction coefficient $\\mu = ${fmt(p.mu)}$. ${G_NOTE} What is the least radius the bend can have, in metres? ${askPrecision(SF3)}`)],
          'r =',
          flatRadius(p),
          SF3,
        ),
  solution: (p) => [
    { text: 'Friction is all that turns it, and it can give at most $\\mu mg$:' },
    { tex: `\\mu m g = \\frac{mv^{2}}{r}` },
    { tex: 'v^{2} = \\mu g r' },
    ...(p.find === 'v'
      ? [
          { tex: `v^{2} = ${fmt(p.mu)} \\times 9.8 \\times ${fmt(p.r)} = ${fmt(n3(p.mu * 9.8 * p.r))}` },
          { tex: `v = \\sqrt{${fmt(n3(p.mu * 9.8 * p.r))}} = ${dots(flatSpeed(p))}` },
          ...roundLines('v', flatSpeed(p), DP1),
        ]
      : [{ tex: `r = \\frac{${p.v}^{2}}{${fmt(p.mu)} \\times 9.8} = ${dots(flatRadius(p), 3)}` }, ...roundLines('r', flatRadius(p), SF3)]),
  ],
  choices: (p) => {
    if (p.find === 'v') {
      const r = (x: number) => roundTo(x, DP1);
      return numChoices(r(flatSpeed(p)), [r(p.mu * 9.8 * p.r), r(Math.sqrt(9.8 * p.r)), r(Math.sqrt(p.mu * p.r))], salted(p.r, p.mu * 100), DP1);
    }
    const r = (x: number) => roundTo(x, SF3);
    return numChoices(r(flatRadius(p)), [r(p.v / (p.mu * 9.8)), r((p.v * p.v * p.mu) / 9.8), r((p.v * p.v) / 9.8)], salted(p.v, p.mu * 100, 2), SF3);
  },
};

const TANS = [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.8, 1];

interface BankParams {
  /** The radius in metres, a multiple of 10, so rg and v^2 = rg tan(theta) both end. */
  r: number;
  /** Easy: the banking, given. Hard: 0, since it is asked. */
  tan: number;
  /** Hard: the speed in whole metres per second, given. Easy: 0, since it is asked. */
  v: number;
  /** Easy: the speed from the radius and banking. Hard: the banking from the speed and radius. */
  find: 'v' | 'tan';
}

/** The design speed, v^2 = rg tan(theta), and the banking for a speed. */
const designSpeed = ({ r, tan }: { r: number; tan: number }): number => Math.sqrt(9.8 * r * tan);
const bankTan = ({ r, v }: BankParams): number => (v * v) / (9.8 * r);

/** Tree: a banked bend's design speed, v^2 = r g tan(theta), to 1 decimal place (easy), or the banking's tangent for a speed, to 3 significant figures (hard). */
const bankTree: Generator<BankParams> = {
  id: 'clm-bank-tree',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? until(
          () => ({ r: 10 * rng.int(2, 50), tan: 0, v: rng.int(8, 35), find: 'tan' as const }),
          (p) => bankTan(p) >= 0.1 && bankTan(p) <= 1.2 && roundedWell(bankTan(p), SF3),
        )
      : until(
          // Not tan = 1: v^2 would equal rg, and the tree would hold one token twice.
          () => ({ r: 10 * rng.int(2, 50), tan: rng.pick(TANS.filter((t) => t !== 1)), v: 0, find: 'v' as const }),
          (p) => roundedWell(designSpeed(p), DP1) && designSpeed(p) >= 5,
        ),
  render: (p) => {
    const rg = n3(9.8 * p.r);
    if (p.find === 'tan') {
      const v2 = p.v * p.v;
      const answer = [fmt(v2), fmt(rg), fixed(bankTan(p), SF3)];
      return {
        kind: 'tree',
        prompt: [
          say(`A track bend of radius ${metres(p.r)} is to be taken at ${ms(p.v)} with no sideways friction. ${G_NOTE}`),
          say('Find $v^{2}$, then $rg$, then the banking angle’s tangent to 3 significant figures.'),
        ],
        expression: '\\tan\\theta = \\frac{v^{2}}{rg}',
        nodes: [
          { id: 'v^{2}', from: [] },
          { id: 'rg', from: [] },
          { id: '\\tan\\theta', from: ['v^{2}', 'rg'] },
        ],
        bank: tokenBank(answer, [fmt(2 * p.v), fixed(rg / v2, SF3), fixed(p.v / rg, SF3), fmt(p.r * p.v), fixed(bankTan(p) * 2, SF3)]),
        answer,
        calculator: true,
      };
    }
    const v2 = n3(rg * p.tan);
    const answer = [fmt(rg), fmt(v2), fixed(designSpeed(p), DP1)];
    return {
      kind: 'tree',
      prompt: [
        say(`A bend of radius ${metres(p.r)} is banked with $\\tan\\theta = ${fmt(p.tan)}$. ${G_NOTE}`),
        say('Find $rg$, then $v^{2}$, then the speed that needs no sideways friction, in $\\text{m s}^{-1}$ to 1 decimal place.'),
      ],
      expression: 'v^{2} = rg\\tan\\theta',
      nodes: [
        { id: 'rg', from: [] },
        { id: 'v^{2}', from: ['rg'] },
        { id: 'v', from: ['v^{2}'] },
      ],
      // Each slip written as its node is: rg and v^2 as they end, a speed to 1 decimal place.
      bank: tokenBank(answer, [fmt(n3(p.r * p.tan)), fmt(n3(2 * v2)), fixed(Math.sqrt(rg), DP1), fixed(Math.sqrt(p.r * p.tan), DP1), fixed(designSpeed(p) + 1, DP1)]),
      answer,
      calculator: true,
    };
  },
  solution: (p) => {
    const rg = n3(9.8 * p.r);
    return p.find === 'tan'
      ? [
          { tex: `v^{2} = ${p.v}^{2} = ${p.v * p.v}` },
          { tex: `rg = ${fmt(p.r)} \\times 9.8 = ${fmt(rg)}` },
          { tex: `\\tan\\theta = \\frac{${p.v * p.v}}{${fmt(rg)}} = ${dots(bankTan(p))}` },
          ...roundLines('\\tan\\theta', bankTan(p), SF3),
        ]
      : [
          { tex: `rg = ${fmt(p.r)} \\times 9.8 = ${fmt(rg)}` },
          { tex: `v^{2} = ${fmt(rg)} \\times ${fmt(p.tan)} = ${fmt(n3(rg * p.tan))}` },
          { tex: `v = \\sqrt{${fmt(n3(rg * p.tan))}} = ${dots(designSpeed(p))}` },
          ...roundLines('v', designSpeed(p), DP1),
        ];
  },
};

interface BankFlowParams {
  /** The radius in metres, a multiple of 10. */
  r: number;
  tan: number;
  /** The speed actually driven, in whole metres per second, well clear of the design speed. */
  u: number;
}

const UP = 'Up the slope';
const DOWN = 'Down the slope';
const NONE = 'No friction is needed';

/** Flow: the design speed of a banked bend, to 1 decimal place, then which way friction acts at the speed driven. */
const bankFlow: Generator<BankFlowParams> = {
  id: 'clm-bank-flow',
  sample: (rng, difficulty) =>
    until(
      () => {
        const r = 10 * rng.int(2, 50);
        const tan = rng.pick(difficulty > 1 ? TANS : [0.25, 0.5, 1]);
        const v = Math.round(designSpeed({ r, tan }));
        return { r, tan, u: v + (rng.chance(0.5) ? -1 : 1) * rng.int(2, 8) };
      },
      (p) => roundedWell(designSpeed(p), DP1) && designSpeed(p) >= 5 && p.u >= 3 && Math.abs(p.u - designSpeed(p)) >= 1.5,
    ),
  render: (p) => {
    const v = designSpeed(p);
    const answer = p.u < v ? UP : DOWN;
    const why = 'Slower than the design speed it would slip down the banking; faster, it would slide up and out. Friction opposes the slip.';
    return {
      kind: 'flow',
      calculator: true,
      prompt: [say(`A bend of radius ${metres(p.r)} is banked with $\\tan\\theta = ${fmt(p.tan)}$. A car takes it at ${ms(p.u)}. ${G_NOTE} Which way does friction on its tyres act?`)],
      subject: 'v^{2} = rg\\tan\\theta',
      steps: [
        {
          id: 'v',
          ask: 'The design speed, needing no friction, in $\\text{m s}^{-1}$ to 1 decimal place:',
          branches: fixedForks(v, [Math.sqrt(9.8 * p.r), Math.sqrt(p.r * p.tan), v + 3], DP1, 1).map((label) => ({ label, to: 'F' })),
        },
        {
          id: 'F',
          ask: `At ${ms(p.u)}, friction acts:`,
          branches: [UP, DOWN, NONE].map((label) => ({ label, outcome: why })),
        },
      ],
      answer: [`$${fixed(v, DP1)}$`, answer],
    };
  },
  solution: (p) => {
    const v = designSpeed(p);
    return [
      { tex: `v^{2} = ${fmt(p.r)} \\times 9.8 \\times ${fmt(p.tan)} = ${fmt(n3(9.8 * p.r * p.tan))}` },
      { tex: `v = ${dots(v)}` },
      ...roundLines('v', v, DP1),
      { text: p.u < v ? `${p.u} is slower, so friction acts up the slope.` : `${p.u} is faster, so friction acts down the slope.` },
    ];
  },
};

const BEND_STEP = 0.5;

/** Slider: the fastest speed round a flat bend, on a speed scale, to the nearest half metre per second. */
const bendSlider: Generator<FlatBendParams> = {
  id: 'clm-bend-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({ r: 5 * rng.int(2, 80), v: 0, mu: rng.pick(difficulty > 1 ? [0.1, 0.15, 0.2, 0.25, 0.4, 0.5, 0.8, 1] : MU), find: 'v' as const }),
      (p) => flatSpeed(p) >= 3 && flatSpeed(p) <= 39 && notchedWell(flatSpeed(p), BEND_STEP),
    ),
  render: (p) => {
    const figure = track(0, 40, [], 'A scale of speeds in metres per second');
    const road = p.mu <= 0.2 ? 'an icy road' : p.mu >= 0.8 ? 'a dry road' : 'a wet road';
    return {
      kind: 'slider',
      calculator: true,
      prompt: [say(`A flat bend of radius ${metres(p.r)} on ${road}, friction coefficient $\\mu = ${fmt(p.mu)}$. ${G_NOTE} Slide to the fastest speed it can be taken at, to the nearest $0.5\\text{ m s}^{-1}$.`)],
      min: 0,
      max: 40,
      step: BEND_STEP,
      answer: notch(flatSpeed(p), BEND_STEP),
      readout: 'v = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [
    { tex: `v^{2} = ${fmt(p.mu)} \\times 9.8 \\times ${fmt(p.r)} = ${fmt(n3(p.mu * 9.8 * p.r))}` },
    { tex: `v = ${dots(flatSpeed(p))}` },
    { text: `The nearest half is $${fmt(notch(flatSpeed(p), BEND_STEP))}\\text{ m s}^{-1}$.` },
  ],
};

export const classicalFluidsGenerators = [
  pressure,
  pressureTable,
  heelFlow,
  areaSlider,
  depthPressure,
  depthTree,
  depthSlider,
  hydraulicTable,
  buoyantForce,
  floatDepth,
  weighTree,
  sinkFlow,
  dragForce,
  terminal,
  terminalSlider,
  dragTable,
  fallAccelFlow,
  bendPick,
  flatBend,
  bankTree,
  bankFlow,
  bendSlider,
];

export const classicalFluidsInternals = { pressureOf, gaugeKpa, buoyancyOf, sunkDepth, flatSpeed, flatRadius, designSpeed, bankTan, weightFor, terminalSpeed };
