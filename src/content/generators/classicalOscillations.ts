/**
 * Classical Mechanics, level 9: Oscillations (`clm-l9`).
 *
 * Two masses on a spring and their reduced mass (MIT 8.03, the vibrating
 * diatomic molecule); damping by a fixed fraction each cycle and resonance
 * with a driver (OpenStax University Physics 15.5 to 15.6); two masses
 * coupled by a middle spring and their two normal modes (Tong, ch. 3); the
 * speed of a wave on a stretched string (16.3); and standing waves on a
 * string fixed at both ends (16.6).
 *
 * Tidy cases: angular frequencies are whole, drawn only where the stiffness
 * that gives them is one a textbook prints (whole, or one decimal place);
 * wave speeds are whole and tensions are mu v^2, again to one decimal place.
 */
import type { Generator, SolutionStep } from '../types';
import { exact, fmt, forks, kg, metres, ms, numChoices, salted, say, track, typed, until, valueBank } from './classicalKit';

const n3 = (v: number): number => Number(v.toFixed(6));
const Nm = (v: number): string => `$${fmt(v)}\\text{ N m}^{-1}$`;
const N = (v: number): string => `$${fmt(v)}\\text{ N}$`;
const Hz = (v: number): string => `$${fmt(v)}\\text{ Hz}$`;
const rads = (v: number): string => `$${fmt(v)}\\text{ rad s}^{-1}$`;

/* Worked lines drop the factors of one a mass, length or count of 1 would print. */
/** `m \times rest`, or just `rest` when m is 1. */
const times = (m: number, rest: string): string => (m === 1 ? rest : `${fmt(m)} \\times ${rest}`);
/** `top` over m, or just `top` when m is 1. */
const over = (top: string, m: number): string => (m === 1 ? top : `\\frac{${top}}{${fmt(m)}}`);
/** `1 / m`, written `1` when m is 1. */
const recip = (m: number): string => (m === 1 ? '1' : `\\frac{1}{${fmt(m)}}`);
/** `base^n`, with no exponent of 1. */
const pow = (base: string, n: number): string => (n === 1 ? base : `${base}^{${n}}`);
/** `2L` with the length put in. */
const twoL = (L: number): string => (L === 1 ? '2' : `2 \\times ${fmt(L)}`);
/** A chain of equals, a step that changes nothing dropped. */
const chain = (...parts: string[]): string => parts.filter((part, i) => i === 0 || part !== parts[i - 1]).join(' = ');

const tidyBank = (answer: number[], wrong: number[], spare = 3): string[] =>
  valueBank(
    answer,
    wrong.filter((v) => v > 0 && exact(v, 3)),
    spare,
  );

/* ================================================================
 * Vibrations in molecules: the reduced mass
 * ================================================================ */

const reduced = (a: number, b: number): number => n3((a * b) / (a + b));

const PAIRS = ['two gliders on an air track', 'two trolleys on a smooth track', 'two pucks on ice', 'two balls in a model molecule', 'two carts on a level rail', 'two blocks on a smooth table'];

interface ReducedParams {
  m1: number;
  m2: number;
  find: 'mu' | 'm2';
  what: string;
}

/** Expression: the reduced mass of two masses (easy), or the second mass from the first and the reduced mass (hard). */
const reducedMass: Generator<ReducedParams> = {
  id: 'clm-reduced-mass',
  sample: (rng, difficulty) =>
    until(
      () => ({ m1: rng.int(1, 20), m2: rng.int(1, 20), find: difficulty > 1 ? ('m2' as const) : ('mu' as const), what: rng.pick(PAIRS) }),
      // The reduced mass is given on the hard side, so it must be one a textbook prints, to 1 decimal place.
      (p) => exact(reduced(p.m1, p.m2), p.find === 'm2' ? 1 : 2) && p.m1 !== p.m2,
    ),
  render: (p) =>
    p.find === 'mu'
      ? typed([say(`A spring joins ${p.what}, of ${kg(p.m1)} and ${kg(p.m2)}. What is their reduced mass, in kilograms?`)], '\\mu =', reduced(p.m1, p.m2))
      : typed([say(`A spring joins ${p.what}. One is ${kg(p.m1)} and their reduced mass is ${kg(reduced(p.m1, p.m2))}. What is the other mass, in kilograms?`)], 'm_{2} =', p.m2),
  solution: (p) =>
    p.find === 'mu'
      ? [{ tex: `\\mu = \\frac{m_{1}m_{2}}{m_{1} + m_{2}} = \\frac{${p.m1} \\times ${p.m2}}{${p.m1} + ${p.m2}} = ${fmt(reduced(p.m1, p.m2))}` }]
      : [
          { tex: `\\frac{1}{m_{2}} = \\frac{1}{\\mu} - \\frac{1}{m_{1}} = \\frac{1}{${fmt(reduced(p.m1, p.m2))}} - ${recip(p.m1)}` },
          { tex: `m_{2} = ${p.m2}` },
        ],
  choices: (p) =>
    p.find === 'mu'
      ? numChoices(reduced(p.m1, p.m2), [p.m1 + p.m2, n3((p.m1 + p.m2) / 2), p.m1 * p.m2], salted(p.m1, p.m2))
      : numChoices(p.m2, [n3(p.m1 - reduced(p.m1, p.m2)), n3(p.m1 + reduced(p.m1, p.m2)), n3(p.m1 * reduced(p.m1, p.m2))], salted(p.m1, p.m2, 7)),
};

interface ReducedRow {
  m1: number;
  m2: number;
  blank: 'mu' | 'm2';
}

/** Table: pairs of masses and their reduced masses; easy blanks the reduced mass, hard may blank a mass. */
const reducedTable: Generator<{ rows: ReducedRow[] }> = {
  id: 'clm-reduced-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ rows: [0, 1, 2].map((): ReducedRow => ({ m1: rng.int(1, 30), m2: rng.int(1, 30), blank: difficulty > 1 && rng.chance(0.5) ? 'm2' : 'mu' })) }),
      ({ rows }) => rows.every((r) => exact(reduced(r.m1, r.m2), 2) && r.m1 !== r.m2) && new Set(rows.map((r) => r.m1 * 100 + r.m2)).size === 3,
    ),
  render: ({ rows }) => {
    const answer = rows.map((r) => (r.blank === 'mu' ? reduced(r.m1, r.m2) : r.m2));
    return {
      kind: 'table',
      prompt: [say('Each row is two masses joined by a spring, in kilograms, and their reduced mass. Fill in the gaps.')],
      columns: ['m_{1}', 'm_{2}', '\\mu'],
      rows: rows.map((r) => [fmt(r.m1), r.blank === 'm2' ? null : fmt(r.m2), r.blank === 'mu' ? null : fmt(reduced(r.m1, r.m2))]),
      bank: tidyBank(answer, rows.flatMap((r) => [r.m1 + r.m2, n3((r.m1 + r.m2) / 2), Math.abs(r.m1 - r.m2)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 'mu'
        ? { tex: `\\mu = \\frac{${r.m1} \\times ${r.m2}}{${r.m1} + ${r.m2}} = ${fmt(reduced(r.m1, r.m2))}` }
        : { tex: `\\frac{1}{m_{2}} = \\frac{1}{${fmt(reduced(r.m1, r.m2))}} - ${recip(r.m1)} \\qquad m_{2} = ${r.m2}` },
    ),
};

interface MoleculeParams {
  m1: number;
  m2: number;
  w: number;
  /** The amplitude of the spring's stretch, metres. */
  A: number;
  what: string;
}

const moleculeK = (p: MoleculeParams): number => n3(reduced(p.m1, p.m2) * p.w * p.w);

/** Tree: two masses on a spring: the reduced mass, omega = sqrt(k / mu), and the greatest speed of one relative to the other. */
const moleculeTree: Generator<MoleculeParams> = {
  id: 'clm-molecule-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ m1: rng.int(1, difficulty > 1 ? 20 : 10), m2: rng.int(1, difficulty > 1 ? 20 : 10), w: rng.int(2, 12), A: rng.pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.25]), what: rng.pick(PAIRS) }),
      (p) => p.m1 !== p.m2 && exact(reduced(p.m1, p.m2), 2) && Number.isInteger(moleculeK(p)),
    ),
  render: (p) => {
    const mu = reduced(p.m1, p.m2);
    const v = n3(p.A * p.w);
    return {
      kind: 'tree',
      prompt: [
        say(`A spring of stiffness ${Nm(moleculeK(p))} joins ${p.what}, of ${kg(p.m1)} and ${kg(p.m2)}. Its stretch swings with amplitude ${metres(p.A)}.`),
        say('Find the reduced mass, $\\omega$, and the greatest speed of one mass relative to the other.'),
      ],
      expression: '\\omega = \\sqrt{\\frac{k}{\\mu}} \\qquad v_{\\max} = A\\omega',
      nodes: [
        { id: '\\mu', from: [] },
        { id: '\\omega', from: ['\\mu'] },
        { id: 'v_{\\max}', from: ['\\omega'] },
      ],
      bank: tidyBank([mu, p.w, v], [p.m1 + p.m2, p.w * p.w, n3(p.A * p.w * p.w), n3(Math.sqrt(moleculeK(p) / (p.m1 + p.m2)))]),
      answer: [mu, p.w, v].map(fmt),
    };
  },
  solution: (p) => [
    { tex: `\\mu = \\frac{${p.m1} \\times ${p.m2}}{${p.m1} + ${p.m2}} = ${fmt(reduced(p.m1, p.m2))}` },
    { tex: `\\omega = \\sqrt{\\frac{${fmt(moleculeK(p))}}{${fmt(reduced(p.m1, p.m2))}}} = \\sqrt{${p.w * p.w}} = ${p.w}` },
    { tex: `v_{\\max} = ${fmt(p.A)} \\times ${p.w} = ${fmt(n3(p.A * p.w))}` },
  ],
};

const HEAVY_STILL = 'The heavy mass barely moves';
const BOTH_MOVE = 'Both masses move';

/** Flow: the reduced mass, omega, then whether the heavy mass is nine or more times the light one, so barely moves. */
const moleculeFlow: Generator<{ light: number; heavy: number; w: number }> = {
  id: 'clm-molecule-flow',
  sample: (rng, difficulty) =>
    until(
      () => {
        const light = rng.int(1, difficulty > 1 ? 8 : 4);
        return { light, heavy: light * rng.pick([2, 3, 4, 9, 19, 24, 49, 99]) + (difficulty > 1 ? rng.int(0, 3) : 0), w: rng.int(2, 10) };
      },
      (p) => p.heavy > p.light && exact(reduced(p.light, p.heavy), 2) && Number.isInteger(n3(reduced(p.light, p.heavy) * p.w * p.w)),
    ),
  render: (p) => {
    const mu = reduced(p.light, p.heavy);
    const k = n3(mu * p.w * p.w);
    return {
      kind: 'flow',
      prompt: [say(`A spring of stiffness ${Nm(k)} joins masses of ${kg(p.light)} and ${kg(p.heavy)}. How do they vibrate?`)],
      subject: '\\mu = \\frac{m_{1}m_{2}}{m_{1} + m_{2}} \\qquad \\omega = \\sqrt{\\frac{k}{\\mu}}',
      steps: [
        { id: 'mu', ask: 'The reduced mass, in kilograms:', branches: forks(mu, [p.light + p.heavy, n3((p.light + p.heavy) / 2), p.light], 0.1).map((label) => ({ label, to: 'w' })) },
        { id: 'w', ask: 'The angular frequency, in $\\text{rad s}^{-1}$:', branches: forks(p.w, [p.w * p.w, n3(Math.sqrt(k / (p.light + p.heavy)))], 1).map((label) => ({ label, to: 'verdict' })) },
        { id: 'verdict', ask: 'Compared with the lighter mass alone, $\\mu$ says:', branches: [BOTH_MOVE, HEAVY_STILL].map((label) => ({ label, outcome: 'When one mass is nine or more times the other, the reduced mass is within a tenth of the light one, and the heavy one hardly moves.' })) },
      ],
      answer: [`$${fmt(mu)}$`, `$${p.w}$`, p.heavy >= 9 * p.light ? HEAVY_STILL : BOTH_MOVE],
    };
  },
  solution: (p) => {
    const mu = reduced(p.light, p.heavy);
    return [
      { tex: `\\mu = \\frac{${p.light} \\times ${p.heavy}}{${p.light} + ${p.heavy}} = ${fmt(mu)}` },
      { tex: `\\omega = \\sqrt{\\frac{${fmt(n3(mu * p.w * p.w))}}{${fmt(mu)}}} = ${p.w}` },
      { text: p.heavy >= 9 * p.light ? `The heavy mass is at least nine times the light one, so the light one does nearly all the moving.` : `The heavy mass is under nine times the light one, so both move.` },
    ];
  },
};

/* ================================================================
 * Damping and resonance
 * ================================================================ */

interface DecayParams {
  /** Starting amplitude in centimetres, the fraction kept each cycle, and the cycles. */
  A0: number;
  r: number;
  n: number;
}

const afterCycles = ({ A0, r, n }: DecayParams): number => n3(A0 * r ** n);

/** Expression: a damped swing keeps a fixed fraction of its amplitude each cycle; the amplitude after n cycles. */
const dampDecay: Generator<DecayParams> = {
  id: 'clm-damp-decay',
  sample: (rng, difficulty) =>
    until(
      () => ({ A0: rng.int(4, 80), r: rng.pick(difficulty > 1 ? [0.5, 0.6, 0.7, 0.75, 0.8, 0.9] : [0.5, 0.8, 0.9]), n: rng.int(1, difficulty > 1 ? 4 : 2) }),
      (p) => exact(afterCycles(p), 3),
    ),
  render: (p) =>
    typed(
      [say(`A damped swing keeps $${fmt(p.r)}$ of its amplitude each cycle. It starts with an amplitude of $${p.A0}\\text{ cm}$. What is its amplitude after $${p.n}$ ${p.n === 1 ? 'cycle' : 'cycles'}, in centimetres?`)],
      'A =',
      afterCycles(p),
    ),
  solution: (p) => [{ tex: `A = ${p.A0} \\times ${pow(fmt(p.r), p.n)} = ${fmt(afterCycles(p))}` }],
  choices: (p) => numChoices(afterCycles(p), [n3(p.A0 * p.r * p.n), n3(p.A0 * (1 - p.r) ** p.n), n3(p.A0 * p.r ** (p.n + 1)), n3(p.A0 - p.n * p.r)], salted(p.A0, p.r * 100, p.n)),
};

/** Table: a damped spring's amplitude and energy, cycle by cycle, E = kA^2 / 2; hard blanks the energies too. */
const dampTable: Generator<{ k: number; A0: number; r: number; hard: boolean }> = {
  id: 'clm-damp-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ k: 10 * rng.int(1, 40), A0: rng.pick([0.1, 0.2, 0.4, 0.5, 0.8, 1]), r: rng.pick([0.5, 0.8, 0.9]), hard: difficulty > 1 }),
      (p) => [0, 1, 2, 3].every((n) => exact(p.A0 * p.r ** n, 4) && exact(0.5 * p.k * (p.A0 * p.r ** n) ** 2, 3)),
    ),
  render: ({ k, A0, r, hard }) => {
    const A = (n: number) => n3(A0 * r ** n);
    const E = (n: number) => n3(0.5 * k * A(n) ** 2);
    const answer = [1, 2, 3].flatMap((n) => (hard ? [A(n), E(n)] : [A(n)]));
    return {
      kind: 'table',
      prompt: [say(`A mass on a spring of stiffness ${Nm(k)} keeps $${fmt(r)}$ of its amplitude each cycle. Fill in its amplitude in metres and its energy in joules after each cycle.`)],
      columns: ['\\text{cycles}', 'A', 'E'],
      rows: [0, 1, 2, 3].map((n) => [String(n), n === 0 ? fmt(A(0)) : null, n === 0 || !hard ? fmt(E(n)) : null]),
      bank: tidyBank(answer, [1, 2, 3].flatMap((n) => [n3(A0 * (1 - r) ** n), n3(k * A(n) ** 2), n3(A0 - n * r * 0.1)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ k, A0, r }) =>
    [1, 2, 3].map((n): SolutionStep => ({ tex: `A_{${n}} = ${times(A0, pow(fmt(r), n))} = ${fmt(n3(A0 * r ** n))} \\qquad E_{${n}} = \\tfrac{1}{2} \\times ${k} \\times ${fmt(n3(A0 * r ** n))}^{2} = ${fmt(n3(0.5 * k * (A0 * r ** n) ** 2))}` })),
};

interface ResonanceParams {
  /** The mass that resonates, on the slider's 0.05 grid, and the driver's omega. */
  m: number;
  w: number;
  what: string;
}

const DRIVERS = ['a motor', 'a shaking table', 'a loudspeaker cone', 'a vibrating clamp', 'an off-balance wheel', 'a hand shaking it'];

/** Slider: the mass that makes a spring resonate with a driver of stated angular frequency, m = k / omega^2. */
const resonanceSlider: Generator<ResonanceParams> = {
  id: 'clm-resonance-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: n3(0.05 * rng.int(2, 200)), w: rng.int(2, difficulty > 1 ? 20 : 10), what: rng.pick(DRIVERS) }),
      (p) => Number.isInteger(n3(p.m * p.w * p.w)),
    ),
  render: (p) => {
    const figure = track(0, 10, [{ at: 0, name: 'none' }], 'A scale of masses in kilograms');
    return {
      kind: 'slider',
      prompt: [say(`A spring of stiffness ${Nm(n3(p.m * p.w * p.w))} is shaken by ${p.what} at $\\omega = ${p.w}\\text{ rad s}^{-1}$. Slide to the mass that makes it swing hardest, in kilograms.`)],
      min: 0,
      max: 10,
      step: 0.05,
      answer: p.m,
      readout: 'm = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [{ tex: `\\sqrt{\\frac{k}{m}} = ${p.w}` }, { tex: `m = \\frac{${fmt(n3(p.m * p.w * p.w))}}{${p.w}^{2}} = ${fmt(p.m)}` }],
};

const BELOW = 'Below resonance';
const AT = 'At resonance';
const ABOVE = 'Above resonance';

/** Flow: a driven spring: its natural omega, the mass that would resonate with the driver, and where the driver sits. */
const resonanceFlow: Generator<{ m: number; w0: number; wd: number }> = {
  id: 'clm-resonance-flow',
  sample: (rng, difficulty) =>
    until(
      () => {
        const w0 = rng.int(2, difficulty > 1 ? 15 : 10);
        return { m: rng.pick([0.2, 0.25, 0.5, 1, 2, 4, 5]), w0, wd: rng.chance(0.34) ? w0 : rng.int(2, difficulty > 1 ? 15 : 10) };
      },
      (p) => exact(p.m * p.w0 * p.w0, 1) && exact((p.m * p.w0 * p.w0) / (p.wd * p.wd), 3),
    ),
  render: (p) => {
    const k = n3(p.m * p.w0 * p.w0);
    const mRes = n3(k / (p.wd * p.wd));
    return {
      kind: 'flow',
      prompt: [say(`A ${kg(p.m)} mass on a spring of stiffness ${Nm(k)} is shaken at $\\omega = ${p.wd}\\text{ rad s}^{-1}$.`)],
      subject: '\\omega_{0} = \\sqrt{\\frac{k}{m}}',
      steps: [
        { id: 'w0', ask: 'Its natural angular frequency, in $\\text{rad s}^{-1}$:', branches: forks(p.w0, [p.w0 * p.w0, n3(k / p.m / 2)], 1).map((label) => ({ label, to: 'm' })) },
        { id: 'm', ask: 'The mass that would resonate with this driver, in kilograms:', branches: forks(mRes, [n3(k / p.wd), n3(p.wd * p.wd / k)], 0.1).map((label) => ({ label, to: 'verdict' })) },
        { id: 'verdict', ask: 'The driver is:', branches: [BELOW, AT, ABOVE].map((label) => ({ label, outcome: 'A lightly damped spring swings hardest when driven at its own natural frequency.' })) },
      ],
      answer: [`$${p.w0}$`, `$${fmt(mRes)}$`, p.wd < p.w0 ? BELOW : p.wd > p.w0 ? ABOVE : AT],
    };
  },
  solution: (p) => {
    const k = n3(p.m * p.w0 * p.w0);
    return [
      { tex: `\\omega_{0} = \\sqrt{${over(fmt(k), p.m)}} = ${p.w0}` },
      { tex: `m = \\frac{${fmt(k)}}{${p.wd}^{2}} = ${fmt(n3(k / (p.wd * p.wd)))}` },
    ];
  },
};

/* ================================================================
 * Coupled oscillators
 * ================================================================ */

interface CoupleParams {
  /** Each mass, and the two modes' angular frequencies. */
  m: number;
  w1: number;
  w2: number;
}

const wallK = ({ m, w1 }: CoupleParams): number => n3(m * w1 * w1);
const middleK = ({ m, w1, w2 }: CoupleParams): number => n3((m * (w2 * w2 - w1 * w1)) / 2);

const sampleCouple = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }, hard: boolean): CoupleParams =>
  until(
    () => {
      const w1 = rng.int(2, hard ? 12 : 8);
      return { m: rng.pick([0.1, 0.2, 0.5, 1, 2, 4]), w1, w2: w1 + rng.int(1, hard ? 8 : 4) };
    },
    (p) => exact(wallK(p), 1) && exact(middleK(p), 1),
  );

/** Expression: the out-of-step mode's omega from the springs (easy), or the middle spring for a wanted one (hard). */
const coupleModes: Generator<CoupleParams & { find: 'w2' | 'kc' }> = {
  id: 'clm-couple-modes',
  sample: (rng, difficulty) => ({ ...sampleCouple(rng, difficulty > 1), find: difficulty > 1 ? 'kc' : 'w2' }),
  render: (p) =>
    p.find === 'w2'
      ? typed([say(`Two ${kg(p.m)} masses sit between two walls, each tied to its wall by a spring of ${Nm(wallK(p))} and to each other by a middle spring of ${Nm(middleK(p))}. What is $\\omega$ of the mode where they move in opposite directions, in $\\text{rad s}^{-1}$?`)], '\\omega_{2} =', p.w2)
      : typed([say(`Two ${kg(p.m)} masses sit between two walls, each tied to its wall by a spring of ${Nm(wallK(p))}. What stiffness of middle spring makes their opposite mode swing at ${rads(p.w2)}, in $\\text{N m}^{-1}$?`)], '\\kappa =', middleK(p)),
  solution: (p) =>
    p.find === 'w2'
      ? [
          { tex: `\\omega_{2} = \\sqrt{\\frac{k + 2\\kappa}{m}} = \\sqrt{${over(`${fmt(wallK(p))} + ${fmt(n3(2 * middleK(p)))}`, p.m)}}` },
          { tex: `\\omega_{2} = \\sqrt{${p.w2 * p.w2}} = ${p.w2}` },
        ]
      : [{ tex: `k + 2\\kappa = m\\omega_{2}^{2} = ${times(p.m, `${p.w2}^{2}`)} = ${fmt(n3(p.m * p.w2 * p.w2))}` }, { tex: `\\kappa = \\frac{${fmt(n3(p.m * p.w2 * p.w2))} - ${fmt(wallK(p))}}{2} = ${fmt(middleK(p))}` }],
  choices: (p) =>
    p.find === 'w2'
      ? numChoices(p.w2, [p.w1, n3(Math.sqrt((wallK(p) + middleK(p)) / p.m)), p.w2 * p.w2], salted(p.m * 10, p.w1, p.w2))
      : numChoices(middleK(p), [n3(2 * middleK(p)), n3(p.m * p.w2 * p.w2), n3(p.m * p.w2 * p.w2 - wallK(p))], salted(p.m * 10, p.w1, p.w2, 3)),
};

/** Tree: both modes of a coupled pair and the beat between them, omega_2 - omega_1. */
const coupleTree: Generator<CoupleParams> = {
  id: 'clm-couple-tree',
  sample: (rng, difficulty) => sampleCouple(rng, difficulty > 1),
  render: (p) => ({
    kind: 'tree',
    prompt: [
      say(`Two ${kg(p.m)} masses are each tied to a wall by a spring of ${Nm(wallK(p))} and to each other by a middle spring of ${Nm(middleK(p))}.`),
      say('Find both modes’ $\\omega$ and the beat between them.'),
    ],
    expression: '\\omega_{1} = \\sqrt{\\frac{k}{m}} \\qquad \\omega_{2} = \\sqrt{\\frac{k + 2\\kappa}{m}}',
    nodes: [
      { id: '\\omega_{1}', from: [] },
      { id: '\\omega_{2}', from: [] },
      { id: '\\Delta\\omega', from: ['\\omega_{1}', '\\omega_{2}'] },
    ],
    bank: tidyBank([p.w1, p.w2, p.w2 - p.w1], [p.w1 + p.w2, n3(Math.sqrt((wallK(p) + middleK(p)) / p.m)), p.w1 * p.w1]),
    answer: [p.w1, p.w2, p.w2 - p.w1].map(fmt),
  }),
  solution: (p) => [
    { tex: `\\omega_{1} = \\sqrt{${over(fmt(wallK(p)), p.m)}} = ${p.w1}` },
    { tex: `\\omega_{2} = \\sqrt{${over(fmt(n3(wallK(p) + 2 * middleK(p))), p.m)}} = ${p.w2}` },
    { tex: `\\Delta\\omega = ${p.w2} - ${p.w1} = ${p.w2 - p.w1}` },
  ],
};

interface CoupleRow {
  w1: number;
  w2: number;
  blank: 'w1' | 'w2' | 'kc';
}

/** Table: coupled pairs of one mass: wall spring, middle spring and the two modes; hard may blank the middle spring. */
const coupleTable: Generator<{ m: number; rows: CoupleRow[] }> = {
  id: 'clm-couple-table',
  sample: (rng, difficulty) =>
    until(
      () => {
        const m = rng.pick([0.2, 0.5, 1, 2, 4]);
        return {
          m,
          rows: [0, 1, 2].map((): CoupleRow => {
            const w1 = rng.int(2, 10);
            return { w1, w2: w1 + rng.int(1, 6), blank: rng.pick(difficulty > 1 ? (['w1', 'w2', 'kc'] as const) : (['w1', 'w2'] as const)) };
          }),
        };
      },
      ({ m, rows }) => rows.every((r) => exact(wallK({ m, ...r }), 2) && exact(middleK({ m, ...r }), 2)) && new Set(rows.map((r) => r.w1 * 100 + r.w2)).size === 3,
    ),
  render: ({ m, rows }) => {
    const answer = rows.map((r) => (r.blank === 'w1' ? r.w1 : r.blank === 'w2' ? r.w2 : middleK({ m, ...r })));
    return {
      kind: 'table',
      prompt: [say(`Each row is two ${kg(m)} masses tied to walls by springs of stiffness $k$ and to each other by one of $\\kappa$, both in $\\text{N m}^{-1}$. Fill in the gaps.`)],
      columns: ['k', '\\kappa', '\\omega_{1}', '\\omega_{2}'],
      rows: rows.map((r) => [fmt(wallK({ m, ...r })), r.blank === 'kc' ? null : fmt(middleK({ m, ...r })), r.blank === 'w1' ? null : fmt(r.w1), r.blank === 'w2' ? null : fmt(r.w2)]),
      bank: tidyBank(answer, rows.flatMap((r) => [r.w1 * r.w1, r.w2 + 1, n3(2 * middleK({ m, ...r }))])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ m, rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 'w1'
        ? { tex: `\\omega_{1} = \\sqrt{${over(fmt(wallK({ m, ...r })), m)}} = ${r.w1}` }
        : r.blank === 'w2'
          ? { tex: `\\omega_{2} = \\sqrt{${over(`${fmt(wallK({ m, ...r }))} + 2 \\times ${fmt(middleK({ m, ...r }))}`, m)}} = ${r.w2}` }
          : { tex: `\\kappa = \\frac{${times(m, `${r.w2}^{2}`)} - ${fmt(wallK({ m, ...r }))}}{2} = ${fmt(middleK({ m, ...r }))}` },
    ),
};

const IN_STEP = 'The in-step mode';
const OPPOSITE = 'The opposite mode';
const STAYS = 'It keeps its length';
const WORKS = 'It stretches and squashes';

/** Flow: two coupled masses started the same way or opposite ways: which mode, what the middle spring does, and its omega. */
const coupleFlow: Generator<CoupleParams & { same: boolean }> = {
  id: 'clm-couple-flow',
  sample: (rng, difficulty) => ({ ...sampleCouple(rng, difficulty > 1), same: rng.chance(0.5) }),
  render: (p) => {
    const w = p.same ? p.w1 : p.w2;
    return {
      kind: 'flow',
      prompt: [
        say(`Two ${kg(p.m)} masses are each tied to a wall by a spring of ${Nm(wallK(p))} and to each other by a middle spring of ${Nm(middleK(p))}.`),
        say(p.same ? 'Both are pulled the same distance to the right and let go.' : 'They are pulled the same distance apart, one each way, and let go.'),
      ],
      subject: '\\omega_{1} = \\sqrt{\\frac{k}{m}} \\qquad \\omega_{2} = \\sqrt{\\frac{k + 2\\kappa}{m}}',
      steps: [
        { id: 'mode', ask: 'They swing in:', branches: [IN_STEP, OPPOSITE].map((label) => ({ label, to: 'middle' })) },
        { id: 'middle', ask: 'The middle spring:', branches: [STAYS, WORKS].map((label) => ({ label, to: 'w' })) },
        { id: 'w', ask: 'So $\\omega$, in $\\text{rad s}^{-1}$:', branches: forks(w, [p.same ? p.w2 : p.w1, n3(Math.sqrt((wallK(p) + middleK(p)) / p.m))], 1).map((label) => ({ label, outcome: 'Started in one mode, the pair stays in it and swings at that mode’s frequency.' })) },
      ],
      answer: [p.same ? IN_STEP : OPPOSITE, p.same ? STAYS : WORKS, `$${w}$`],
    };
  },
  solution: (p) =>
    p.same
      ? [{ text: 'Moving together, the middle spring never changes length, so only the wall springs act:' }, { tex: `\\omega_{1} = \\sqrt{${over(fmt(wallK(p)), p.m)}} = ${p.w1}` }]
      : [{ text: 'Moving apart, the middle spring stretches twice as far as each wall spring:' }, { tex: `\\omega_{2} = \\sqrt{${over(fmt(n3(wallK(p) + 2 * middleK(p))), p.m)}} = ${p.w2}` }],
};

/* ================================================================
 * Waves on a string
 * ================================================================ */

/** Linear densities in kg per metre. */
const MUS = [0.001, 0.002, 0.004, 0.005, 0.008, 0.01, 0.02, 0.025, 0.05];
const STRINGS = ['string', 'wire', 'rope', 'cord', 'cable', 'line'];

interface WaveSpeedParams {
  mu: number;
  v: number;
  find: 'v' | 'T';
  what: string;
}

/** Expression: the speed of a wave on a string sqrt(T / mu) (easy), or the tension for a wanted speed (hard). */
const waveSpeed: Generator<WaveSpeedParams> = {
  id: 'clm-wave-speed',
  sample: (rng, difficulty) =>
    until(
      () => ({ mu: rng.pick(MUS), v: 10 * rng.int(1, 40), find: difficulty > 1 ? ('T' as const) : ('v' as const), what: rng.pick(STRINGS) }),
      (p) => exact(p.mu * p.v * p.v, 2),
    ),
  render: (p) => {
    const T = n3(p.mu * p.v * p.v);
    return p.find === 'v'
      ? typed([say(`A ${p.what} of $${fmt(p.mu)}\\text{ kg m}^{-1}$ is pulled tight with a tension of ${N(T)}. How fast does a wave run along it, in $\\text{m s}^{-1}$?`)], 'v =', p.v)
      : typed([say(`A ${p.what} of $${fmt(p.mu)}\\text{ kg m}^{-1}$ is to carry waves at ${ms(p.v)}. What tension does it need, in newtons?`)], 'T =', T);
  },
  solution: (p) => {
    const T = n3(p.mu * p.v * p.v);
    return p.find === 'v' ? [{ tex: `v = \\sqrt{\\frac{T}{\\mu}} = \\sqrt{\\frac{${fmt(T)}}{${fmt(p.mu)}}}` }, { tex: `v = \\sqrt{${p.v * p.v}} = ${p.v}` }] :[{ tex: `T = \\mu v^{2} = ${fmt(p.mu)} \\times ${p.v}^{2} = ${fmt(T)}` }];
  },
  choices: (p) => {
    const T = n3(p.mu * p.v * p.v);
    return p.find === 'v' ? numChoices(p.v, [n3(T / p.mu), n3(p.v / 10), n3(p.v * 2)], salted(p.mu * 1000, p.v)) : numChoices(T, [n3(p.mu * p.v), n3(p.v * p.v), n3(2 * T)], salted(p.mu * 1000, p.v, 5));
  },
};

interface WaveRow {
  f: number;
  lambda: number;
  blank: 'f' | 'lambda' | 'v';
}

/** Table: frequency, wavelength and speed, v = f lambda; easy blanks the speed or wavelength, hard any. */
const waveTable: Generator<{ rows: WaveRow[] }> = {
  id: 'clm-wave-table',
  sample: (rng, difficulty) =>
    until(
      () => ({
        rows: [0, 1, 2].map((): WaveRow => ({ f: rng.pick([2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 200, 250]), lambda: rng.pick([0.1, 0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.2, 1.5, 2, 2.5, 4]), blank: rng.pick(difficulty > 1 ? (['f', 'lambda', 'v'] as const) : (['lambda', 'v'] as const)) })),
      }),
      ({ rows }) => new Set(rows.map((r) => r.f * 1000 + r.lambda)).size === 3 && rows.every((r) => exact(r.f * r.lambda, 3)),
    ),
  render: ({ rows }) => {
    const v = (r: WaveRow) => n3(r.f * r.lambda);
    const answer = rows.map((r) => (r.blank === 'f' ? r.f : r.blank === 'lambda' ? r.lambda : v(r)));
    return {
      kind: 'table',
      prompt: [say('Each row is a wave on a string: frequency in hertz, wavelength in metres, speed in $\\text{m s}^{-1}$. Fill in the gaps.')],
      columns: ['f', '\\lambda', 'v'],
      rows: rows.map((r) => [r.blank === 'f' ? null : fmt(r.f), r.blank === 'lambda' ? null : fmt(r.lambda), r.blank === 'v' ? null : fmt(v(r))]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3(r.f / r.lambda), n3(r.lambda / r.f), n3(2 * r.f * r.lambda)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ rows }) =>
    rows.map((r): SolutionStep =>
      r.blank === 'v'
        ? { tex: `v = ${fmt(r.f)} \\times ${fmt(r.lambda)} = ${fmt(n3(r.f * r.lambda))}` }
        : r.blank === 'lambda'
          ? { tex: `\\lambda = \\frac{${fmt(n3(r.f * r.lambda))}}{${fmt(r.f)}} = ${fmt(r.lambda)}` }
          : { tex: r.lambda === 1 ? `f = \\frac{v}{\\lambda} = ${fmt(r.f)}` : `f = \\frac{${fmt(n3(r.f * r.lambda))}}{${fmt(r.lambda)}} = ${fmt(r.f)}` },
    ),
};

interface WaveTreeParams {
  mu: number;
  v: number;
  /** Length of the piece weighed, in metres, and the frequency it is shaken at. */
  L: number;
  f: number;
  what: string;
}

/** Tree: a string weighed and pulled tight: its mass per metre, the wave speed, then the wavelength at a frequency. */
const waveTree: Generator<WaveTreeParams> = {
  id: 'clm-wave-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ mu: rng.pick(MUS), v: 10 * rng.int(1, difficulty > 1 ? 40 : 20), L: rng.pick([0.5, 1, 2, 2.5, 4, 5, 10]), f: rng.pick([5, 10, 20, 25, 40, 50, 100, 200]), what: rng.pick(STRINGS) }),
      (p) => exact(p.mu * p.v * p.v, 1) && exact(p.mu * p.L, 2) && exact(p.v / p.f, 3),
    ),
  render: (p) => {
    const M = n3(p.mu * p.L);
    const T = n3(p.mu * p.v * p.v);
    const lambda = n3(p.v / p.f);
    return {
      kind: 'tree',
      prompt: [
        say(`A ${metres(p.L)} length of ${p.what} weighs ${kg(M)}. Pulled tight at ${N(T)}, it is shaken at ${Hz(p.f)}.`),
        say('Find its mass per metre, the wave speed and the wavelength.'),
      ],
      expression: 'v = \\sqrt{\\frac{T}{\\mu}} \\qquad \\lambda = \\frac{v}{f}',
      nodes: [
        { id: '\\mu', from: [] },
        { id: 'v', from: ['\\mu'] },
        { id: '\\lambda', from: ['v'] },
      ],
      bank: tidyBank([p.mu, p.v, lambda], [n3(p.L / M), n3(T / p.mu), n3(p.v * p.f), n3(p.f / p.v)]),
      answer: [p.mu, p.v, lambda].map(fmt),
    };
  },
  solution: (p) => [
    { tex: p.L === 1 ? `\\mu = \\frac{m}{L} = ${fmt(p.mu)}` : `\\mu = \\frac{${fmt(n3(p.mu * p.L))}}{${fmt(p.L)}} = ${fmt(p.mu)}` },
    { tex: `v = \\sqrt{\\frac{${fmt(n3(p.mu * p.v * p.v))}}{${fmt(p.mu)}}} = ${p.v}` },
    { tex: `\\lambda = \\frac{${p.v}}{${p.f}} = ${fmt(n3(p.v / p.f))}` },
  ],
};

const LONGER = 'Longer';
const SHORTER = 'Shorter';
const TENSIONS = [4, 9, 16, 0.25, 1.44, 0.64, 2.25, 0.36, 1.21, 0.81];

/** Flow: a string's tension is multiplied: the factor on the wave speed, the new speed, and the wavelength at the same frequency. */
const waveFlow: Generator<{ f: number; v: number }> = {
  id: 'clm-wave-flow',
  sample: (rng) => until(() => ({ f: rng.pick(TENSIONS), v: 10 * rng.int(1, 30) }), (p) => exact(Math.sqrt(p.f) * p.v, 3)),
  render: (p) => {
    const r = n3(Math.sqrt(p.f));
    const v2 = n3(r * p.v);
    return {
      kind: 'flow',
      prompt: [say(`Waves run along a string at ${ms(p.v)}. Its tension is made $${fmt(p.f)}$ times as large, and it is shaken at the same frequency.`)],
      subject: 'v = \\sqrt{\\frac{T}{\\mu}} \\qquad \\lambda = \\frac{v}{f}',
      steps: [
        { id: 'r', ask: 'The speed is multiplied by:', branches: forks(r, [p.f, n3(p.f * p.f), n3(1 / r)], 0.1).map((label) => ({ label, to: 'v' })) },
        { id: 'v', ask: 'The new speed, in $\\text{m s}^{-1}$:', branches: forks(v2, [n3(p.f * p.v), n3(p.v / r)], 1).map((label) => ({ label, to: 'lambda' })) },
        { id: 'lambda', ask: 'The wavelength is now:', branches: [LONGER, SHORTER].map((label) => ({ label, outcome: 'At a fixed frequency the wavelength goes with the speed.' })) },
      ],
      answer: [`$${fmt(r)}$`, `$${fmt(v2)}$`, p.f > 1 ? LONGER : SHORTER],
    };
  },
  solution: (p) => [
    { tex: `v \\propto \\sqrt{T} \\qquad \\sqrt{${fmt(p.f)}} = ${fmt(n3(Math.sqrt(p.f)))}` },
    { tex: `v' = ${fmt(n3(Math.sqrt(p.f)))} \\times ${p.v} = ${fmt(n3(Math.sqrt(p.f) * p.v))}` },
  ],
};

/* ================================================================
 * Standing waves
 * ================================================================ */

interface StandingParams {
  /** Length in metres, wave speed, and the harmonic. */
  L: number;
  v: number;
  n: number;
  what: string;
}

const harmonic = ({ L, v, n }: StandingParams): number => n3((n * v) / (2 * L));

/** Expression: the frequency of the nth harmonic of a string fixed at both ends, f_n = n v / 2L. */
const standingFreq: Generator<StandingParams> = {
  id: 'clm-standing-freq',
  sample: (rng, difficulty) =>
    until(
      () => ({ L: rng.pick([0.25, 0.4, 0.5, 0.6, 0.64, 0.8, 1, 1.2, 1.5, 2, 2.5]), v: 10 * rng.int(4, 50), n: difficulty > 1 ? rng.int(2, 5) : 1, what: rng.pick(STRINGS) }),
      (p) => exact(harmonic(p), 2),
    ),
  render: (p) =>
    typed(
      [say(`A ${p.what} ${metres(p.L)} long is fixed at both ends, and waves run along it at ${ms(p.v)}. What is the frequency of its ${p.n === 1 ? 'lowest note, the first harmonic' : `harmonic number $${p.n}$`}, in hertz?`)],
      `f_{${p.n}} =`,
      harmonic(p),
    ),
  solution: (p) => [{ tex: `f_{${p.n}} = \\frac{nv}{2L} = \\frac{${times(p.n, String(p.v))}}{${twoL(p.L)}} = ${fmt(harmonic(p))}` }],
  choices: (p) => numChoices(harmonic(p), [n3((p.n * p.v) / p.L), n3(p.v / (2 * p.L)), n3((p.n * p.v * 2) / p.L), n3(p.n * p.v * 2 * p.L)], salted(p.L * 100, p.v, p.n)),
};

/** Slider: the wavelength of the nth harmonic on a string of length L, lambda = 2L / n. */
const standingSlider: Generator<{ L: number; n: number }> = {
  id: 'clm-standing-slider',
  sample: (rng, difficulty) =>
    until(
      () => ({ L: n3(0.1 * rng.int(3, 25)), n: rng.int(1, difficulty > 1 ? 6 : 3) }),
      (p) => Number.isInteger(n3(((2 * p.L) / p.n) * 20)) && (2 * p.L) / p.n <= 5,
    ),
  render: (p) => {
    const figure = track(0, 5, [{ at: 0, name: '0' }], 'A scale of wavelengths in metres');
    return {
      kind: 'slider',
      prompt: [say(`A string ${metres(p.L)} long, fixed at both ends, vibrates in ${p.n === 1 ? 'its first harmonic, one loop' : `harmonic number $${p.n}$, with $${p.n}$ loops`}. Slide to the wavelength, in metres.`)],
      min: 0,
      max: 5,
      step: 0.05,
      answer: n3((2 * p.L) / p.n),
      readout: '\\lambda = {v}',
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (p) => [{ text: 'Each loop is half a wavelength:' }, { tex: chain('\\lambda = \\frac{2L}{n}', over(twoL(p.L), p.n), fmt(n3((2 * p.L) / p.n))) }],
};

interface StandingTreeParams extends StandingParams {
  mu: number;
}

/** Tree: a string's tension and mass per metre give the wave speed, then the first harmonic, then the nth. */
const standingTree: Generator<StandingTreeParams> = {
  id: 'clm-standing-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ mu: rng.pick(MUS), L: rng.pick([0.25, 0.4, 0.5, 0.8, 1, 1.5, 2, 2.5]), v: 10 * rng.int(4, 40), n: rng.int(2, difficulty > 1 ? 6 : 3), what: rng.pick(STRINGS) }),
      (p) => exact(p.mu * p.v * p.v, 2) && exact(harmonic({ ...p, n: 1 }), 2),
    ),
  render: (p) => {
    const f1 = harmonic({ ...p, n: 1 });
    const fn = harmonic(p);
    return {
      kind: 'tree',
      prompt: [
        say(`A ${p.what} ${metres(p.L)} long, of $${fmt(p.mu)}\\text{ kg m}^{-1}$, is fixed at both ends with a tension of ${N(n3(p.mu * p.v * p.v))}.`),
        say(`Find the wave speed, the first harmonic, and harmonic number $${p.n}$.`),
      ],
      expression: 'v = \\sqrt{\\frac{T}{\\mu}} \\qquad f_{n} = \\frac{nv}{2L}',
      nodes: [
        { id: 'v', from: [] },
        { id: 'f_{1}', from: ['v'] },
        { id: `f_{${p.n}}`, from: ['f_{1}'] },
      ],
      bank: tidyBank([p.v, f1, fn], [n3(p.v / p.L), n3(f1 * (p.n + 1)), n3(p.v * p.v)]),
      answer: [p.v, f1, fn].map(fmt),
    };
  },
  solution: (p) => [
    { tex: `v = \\sqrt{\\frac{${fmt(n3(p.mu * p.v * p.v))}}{${fmt(p.mu)}}} = ${p.v}` },
    { tex: `f_{1} = \\frac{${p.v}}{${twoL(p.L)}} = ${fmt(harmonic({ ...p, n: 1 }))}` },
    { tex: `f_{${p.n}} = ${p.n} \\times ${fmt(harmonic({ ...p, n: 1 }))} = ${fmt(harmonic(p))}` },
  ],
};

/** Table: the harmonics of one string, wavelength 2L / n and frequency n f_1; hard blanks both. */
const standingTable: Generator<{ L: number; v: number; ns: number[]; hard: boolean }> = {
  id: 'clm-standing-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ L: rng.pick([0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 1, 1.2, 1.5, 2]), v: 10 * rng.int(4, 50), ns: rng.sample([1, 2, 3, 4, 5, 6], 3).sort((a, b) => a - b), hard: difficulty > 1 }),
      (p) => p.ns.every((n) => exact((2 * p.L) / n, 3) && exact((n * p.v) / (2 * p.L), 2)),
    ),
  render: ({ L, v, ns, hard }) => {
    const lam = (n: number) => n3((2 * L) / n);
    const f = (n: number) => n3((n * v) / (2 * L));
    const answer = ns.flatMap((n) => (hard ? [lam(n), f(n)] : [f(n)]));
    return {
      kind: 'table',
      prompt: [say(`A string ${metres(L)} long is fixed at both ends, and waves run along it at ${ms(v)}. Fill in each harmonic’s wavelength in metres and frequency in hertz.`)],
      columns: ['n', '\\lambda', 'f'],
      rows: ns.map((n) => [String(n), hard ? null : fmt(lam(n)), null]),
      bank: tidyBank(answer, ns.flatMap((n) => [n3(L / n), n3((n * v) / L), n3(v / n)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ L, v, ns }) =>
    ns.map((n): SolutionStep => {
      const lam = n3((2 * L) / n);
      // Where L or the wavelength is 1 the substituted step collapses, so the symbolic one stands in for it.
      const lamTex = L === 1 && n === 1 ? `\\lambda_{1} = 2L = 2` : chain(`\\lambda_{${n}}`, over(twoL(L), n), fmt(lam));
      const fTex = lam === 1 ? `f_{${n}} = \\frac{v}{\\lambda_{${n}}} = ${v}` : chain(`f_{${n}}`, over(String(v), lam), fmt(n3((n * v) / (2 * L))));
      return { tex: `${lamTex} \\qquad ${fTex}` };
    }),
};

export const classicalOscillationsGenerators = [
  reducedMass,
  reducedTable,
  moleculeTree,
  moleculeFlow,
  dampDecay,
  dampTable,
  resonanceSlider,
  resonanceFlow,
  coupleModes,
  coupleTree,
  coupleTable,
  coupleFlow,
  waveSpeed,
  waveTable,
  waveTree,
  waveFlow,
  standingFreq,
  standingSlider,
  standingTree,
  standingTable,
];

export const classicalOscillationsInternals = { reduced, wallK, middleK, harmonic };
