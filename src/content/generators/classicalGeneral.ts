/**
 * Classical Mechanics, level 10: General Considerations (`clm-l10`).
 *
 * Dimensions and dimensional analysis (OpenStax University Physics 1.4):
 * the powers of mass, length and time in a quantity, formulas found from
 * dimensions alone, and how a formula scales; natural units, where a
 * problem's own constants are set to one (Tong); and the Lagrangian
 * L = T - V with its Euler-Lagrange equation (Tong, ch. 2).
 *
 * Dimensions are held as powers of [M, L, T]. Natural units on a spring are
 * built from squares and come out exact; a pendulum's length unit and an
 * energy to convert are values a textbook prints, and what they give is asked
 * to 3 significant figures. Lagrangian systems use g = 9.8.
 */
import type { Generator, SolutionStep } from '../types';
import { dots, G_NOTE, exact, fixed, fmt, forks, kg, metres, ms, numChoices, roundTo, roundedWell, salted, say, secs, track, typed, until, valueBank, type Precision } from './classicalKit';

const n3 = (v: number): number => Number(v.toFixed(6));
const Nm = (v: number): string => `$${fmt(v)}\\text{ N m}^{-1}$`;

/** A value used as a factor: a negative one bracketed, so no double sign such as `-8 \times -0.5` is written. */
const par = (v: number): string => (v < 0 ? `(${fmt(v)})` : fmt(v));

/** A coefficient on a symbol, with 1 and -1 left unwritten: `\dot{x}`, not `1\dot{x}`. */
const coef = (c: number, sym: string): string => (c === 1 ? sym : c === -1 ? `-${sym}` : `${fmt(c)}${sym}`);

/** A product of factors with any factor of exactly 1 left out. */
const product = (...factors: string[]): string => factors.filter((f) => f !== '1').join(' \\times ') || '1';

/** Half a coefficient times a symbol, as a Lagrangian writes it: `\tfrac{1}{2}(2)\dot{x}^{2}`, or `\tfrac{1}{2}\dot{x}^{2}` when it is 1. */
const half = (c: number, sym: string): string => (c === 1 ? `\\tfrac{1}{2}${sym}` : `\\tfrac{1}{2}(${fmt(c)})${sym}`);

/**
 * A signed sum: each term's coefficient sets its sign, and `body` writes the
 * term from the coefficient's size. Zero terms are dropped, so no `0a` or `+ -` is written.
 */
const signed = (terms: { c: number; body: (size: number) => string }[]): string => {
  const out = terms
    .filter((t) => t.c !== 0)
    .map((t, i) => {
      const b = t.body(Math.abs(t.c));
      return i === 0 ? (t.c < 0 ? `-${b}` : b) : `${t.c < 0 ? ' - ' : ' + '}${b}`;
    });
  return out.length ? out.join('') : '0';
};
/**
 * One base's equation, `\mathsf{T}\colon \ {-2c} = 1`. The left side is braced
 * so a leading minus sits against its term as a sign, not spaced as a subtraction.
 */
const baseLine = (base: number, lhs: string, rhs: string): string => `\\mathsf{${BASES[base]}}\\colon \\ {${lhs}} = ${rhs}`;
/** A term that is a size times a symbol. */
const onSym = (sym: string) => (size: number) => coef(size, sym);
/** A term that is a size times a value. */
const onValue = (v: number) => (size: number) => (size === 1 ? par(v) : `${fmt(size)} \\times ${par(v)}`);

const tidyBank = (answer: number[], wrong: number[], spare = 3): string[] =>
  valueBank(
    answer,
    wrong.filter((v) => Number.isFinite(v) && exact(v, 3)),
    spare,
  );

/* ================================================================
 * Dimensions
 * ================================================================ */

type Dims = [number, number, number];

interface Quantity {
  sym: string;
  name: string;
  /** How it is built from simpler quantities, in words. */
  def: string;
  /** The same as TeX, for a table's first column. */
  defTex: string;
  d: Dims;
}

export const QUANTITIES: Quantity[] = [
  { sym: 'm', name: 'a mass', def: 'a mass', defTex: 'm', d: [1, 0, 0] },
  { sym: '\\ell', name: 'a length', def: 'a length', defTex: '\\ell', d: [0, 1, 0] },
  { sym: 't', name: 'a time', def: 'a time', defTex: 't', d: [0, 0, 1] },
  { sym: 'v', name: 'a speed', def: 'distance over time', defTex: 'v = \\ell / t', d: [0, 1, -1] },
  { sym: 'a', name: 'an acceleration', def: 'speed over time', defTex: 'a = v / t', d: [0, 1, -2] },
  { sym: 'F', name: 'a force', def: 'mass times acceleration', defTex: 'F = ma', d: [1, 1, -2] },
  { sym: 'E', name: 'an energy', def: 'force times distance', defTex: 'E = F\\ell', d: [1, 2, -2] },
  { sym: 'P', name: 'a power', def: 'energy over time', defTex: 'P = E / t', d: [1, 2, -3] },
  { sym: 'p', name: 'a momentum', def: 'mass times speed', defTex: 'p = mv', d: [1, 1, -1] },
  { sym: '\\rho', name: 'a density', def: 'mass over volume', defTex: '\\rho = m / \\ell^{3}', d: [1, -3, 0] },
  { sym: 'f', name: 'a frequency', def: 'one over time', defTex: 'f = 1 / t', d: [0, 0, -1] },
  { sym: 'k', name: 'a spring stiffness', def: 'force over stretch', defTex: 'k = F / \\ell', d: [1, 0, -2] },
];

const BASES = ['M', 'L', 'T'];
const UNITS = ['kg', 'm', 's'];

const pow = (base: string, e: number): string => (e === 1 ? base : `${base}^{${fmt(e)}}`);

/** Dimensions as TeX, such as M L^{2} T^{-2}; a pure number is 1. */
export const dimTex = (d: Dims): string => {
  const parts = d.map((e, i) => (e === 0 ? '' : pow(`\\mathsf{${BASES[i]}}`, e))).filter(Boolean);
  return parts.length ? parts.join('\\,') : '1';
};

const addDims = (...terms: { d: Dims; p: number }[]): Dims => [0, 1, 2].map((i) => n3(terms.reduce((s, t) => s + t.p * t.d[i], 0))) as Dims;

/** A product of powers written with the negative powers underneath. */
const comboTex = (terms: { sym: string; p: number }[]): string => {
  const up = terms.filter((t) => t.p > 0).map((t) => pow(t.sym, t.p));
  const down = terms.filter((t) => t.p < 0).map((t) => pow(t.sym, -t.p));
  const top = up.length ? up.join(' ') : '1';
  return down.length ? `\\frac{${top}}{${down.join(' ')}}` : top;
};

interface ComboParams {
  i: number;
  p: number;
  j: number;
  q: number;
  base: number;
}

const comboDims = ({ i, p, j, q }: ComboParams): Dims => addDims({ d: QUANTITIES[i].d, p }, { d: QUANTITIES[j].d, p: q });

const sampleCombo = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }, hard: boolean): ComboParams =>
  until(
    () => ({ i: rng.int(3, QUANTITIES.length - 1), p: rng.pick(hard ? [1, 2, -1, -2, 3] : [1, 2]), j: rng.int(0, QUANTITIES.length - 1), q: rng.pick(hard ? [1, -1, 2, -2] : [1, -1]), base: rng.int(0, 2) }),
    (c) => c.i !== c.j && QUANTITIES[c.i].d[c.base] !== 0,
  );

const whereText = (c: ComboParams): string => `$${QUANTITIES[c.i].sym}$ is ${QUANTITIES[c.i].name}, ${QUANTITIES[c.i].def}, and $${QUANTITIES[c.j].sym}$ is ${QUANTITIES[c.j].name}${QUANTITIES[c.j].def === QUANTITIES[c.j].name ? '' : `, ${QUANTITIES[c.j].def}`}`;
const comboOf = (c: ComboParams): string => comboTex([{ sym: QUANTITIES[c.i].sym, p: c.p }, { sym: QUANTITIES[c.j].sym, p: c.q }]);

const comboSolution = (c: ComboParams): SolutionStep[] => [
  { tex: `[${QUANTITIES[c.i].sym}] = ${dimTex(QUANTITIES[c.i].d)} \\qquad [${QUANTITIES[c.j].sym}] = ${dimTex(QUANTITIES[c.j].d)}` },
  { tex: `\\left[${comboOf(c)}\\right] = ${dimTex(comboDims(c))}` },
];

/** Expression: the power of M, L or T in a product or quotient of two named quantities. */
const dimPower: Generator<ComboParams> = {
  id: 'clm-dim-power',
  sample: (rng, difficulty) => sampleCombo(rng, difficulty > 1),
  render: (c) => typed([say(`Here ${whereText(c)}. What is the power of $\\mathsf{${BASES[c.base]}}$ in the dimensions of $${comboOf(c)}$?`)], `\\text{power of } \\mathsf{${BASES[c.base]}} =`, comboDims(c)[c.base]),
  solution: comboSolution,
  choices: (c) => {
    const [a, b] = [QUANTITIES[c.i].d[c.base], QUANTITIES[c.j].d[c.base]];
    return numChoices(comboDims(c)[c.base], [a * c.p - b * c.q, a + b, -comboDims(c)[c.base], a * c.p], salted(c.i, c.p, c.j, c.q, c.base));
  },
};

interface TableParams {
  picks: number[];
  /** Which cells of each row are blank, as base indices. */
  blanks: number[][];
}

/** Table: the powers of M, L and T in quantities built from their definitions; hard blanks two per row. */
const dimTable: Generator<TableParams> = {
  id: 'clm-dim-table',
  sample: (rng, difficulty) => {
    const picks = rng.sample([3, 4, 5, 6, 7, 8, 9, 10, 11], 3);
    return { picks, blanks: picks.map(() => rng.sample([0, 1, 2], difficulty > 1 ? 2 : 1).sort()) };
  },
  render: ({ picks, blanks }) => {
    const answer = picks.flatMap((q, r) => blanks[r].map((b) => QUANTITIES[q].d[b]));
    return {
      kind: 'table',
      prompt: [say('Fill in the power of mass, length and time in each quantity, working from its definition.')],
      columns: ['\\text{quantity}', '\\mathsf{M}', '\\mathsf{L}', '\\mathsf{T}'],
      rows: picks.map((q, r) => [QUANTITIES[q].defTex, ...[0, 1, 2].map((b) => (blanks[r].includes(b) ? null : fmt(QUANTITIES[q].d[b])))]),
      bank: valueBank(answer, [-3, -2, -1, 0, 1, 2, 3].filter((v) => !answer.includes(v)).slice(0, 3)),
      answer: answer.map(fmt),
    };
  },
  solution: ({ picks }) => picks.map((q): SolutionStep => ({ tex: `[${QUANTITIES[q].sym}] = ${dimTex(QUANTITIES[q].d)}` })),
};

/** Three integer branches for a flow: the right one and slips, distinct and sorted. */
const intForks = (right: number, wrong: number[]): string[] => {
  const out = [right];
  for (const v of [...wrong, right + 1, right - 1, right + 2]) if (out.length < 3 && !out.includes(v)) out.push(v);
  return out.sort((x, y) => x - y).map((v) => `$${fmt(v)}$`);
};

/** Flow: the dimensions of a combination, one base at a time: M, then L, then T. */
const dimFlow: Generator<ComboParams> = {
  id: 'clm-dim-flow',
  sample: (rng, difficulty) => sampleCombo(rng, difficulty > 1),
  render: (c) => {
    const d = comboDims(c);
    const A = QUANTITIES[c.i].d;
    const B = QUANTITIES[c.j].d;
    return {
      kind: 'flow',
      prompt: [say(`Here ${whereText(c)}. Find the dimensions of $${comboOf(c)}$.`)],
      subject: `\\left[${comboOf(c)}\\right] = \\mathsf{M}^{?}\\,\\mathsf{L}^{?}\\,\\mathsf{T}^{?}`,
      steps: [0, 1, 2].map((b) => ({
        id: BASES[b],
        ask: `The power of $\\mathsf{${BASES[b]}}$:`,
        branches: intForks(d[b], [A[b] * c.p - B[b] * c.q, A[b] + B[b]]).map((label) => (b < 2 ? { label, to: BASES[b + 1] } : { label, outcome: 'Multiplying adds the powers of each base, and dividing takes them away.' })),
      })),
      answer: d.map((v) => `$${fmt(v)}$`),
    };
  },
  solution: comboSolution,
};

/** Slider: the power of kg, m or s in the SI unit of a combination. */
const dimSiSlider: Generator<ComboParams> = {
  id: 'clm-dim-si-slider',
  sample: (rng, difficulty) => until(() => sampleCombo(rng, difficulty > 1), (c) => Math.abs(comboDims(c)[c.base]) <= 6),
  render: (c) => {
    const figure = track(-6, 6, [{ at: 0, name: '0' }], 'A scale of powers from minus six to six');
    return {
      kind: 'slider',
      prompt: [say(`Here ${whereText(c)}. Written in kilograms, metres and seconds, what power of $\\text{${UNITS[c.base]}}$ is in the unit of $${comboOf(c)}$? Slide to it.`)],
      min: -6,
      max: 6,
      step: 1,
      answer: comboDims(c)[c.base],
      readout: `\\text{${UNITS[c.base]}}^{{v}}`,
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: (c) => [...comboSolution(c), { text: `The unit's power of ${UNITS[c.base]} is the power of $\\mathsf{${BASES[c.base]}}$: $${fmt(comboDims(c)[c.base])}$.` }],
};

/* ================================================================
 * Formulas from dimensions
 * ================================================================ */

interface Law {
  /** What it gives, the quantities it depends on with their powers, and the real formula for checking. */
  what: string;
  sym: string;
  on: { sym: string; name: string; p: number }[];
}

const LAWS: Law[] = [
  { what: 'the period of a pendulum', sym: 'T', on: [{ sym: '\\ell', name: 'length', p: 0.5 }, { sym: 'g', name: 'gravity', p: -0.5 }] },
  { what: 'the period of a mass on a spring', sym: 'T', on: [{ sym: 'm', name: 'mass', p: 0.5 }, { sym: 'k', name: 'stiffness', p: -0.5 }] },
  { what: 'the speed of a wave on a string', sym: 'v', on: [{ sym: 'T', name: 'tension', p: 0.5 }, { sym: '\\mu', name: 'mass per metre', p: -0.5 }] },
  { what: 'the time to fall from rest', sym: 't', on: [{ sym: 'h', name: 'height', p: 0.5 }, { sym: 'g', name: 'gravity', p: -0.5 }] },
  { what: 'the range of a projectile', sym: 'R', on: [{ sym: 'u', name: 'launch speed', p: 2 }, { sym: 'g', name: 'gravity', p: -1 }] },
  { what: 'the drag on a fast car', sym: 'F', on: [{ sym: '\\rho', name: 'air density', p: 1 }, { sym: 'v', name: 'speed', p: 2 }, { sym: '\\ell', name: 'size', p: 2 }] },
  { what: 'the kinetic energy of a body', sym: 'E', on: [{ sym: 'm', name: 'mass', p: 1 }, { sym: 'v', name: 'speed', p: 2 }] },
  { what: 'the speed after a fall', sym: 'v', on: [{ sym: 'g', name: 'gravity', p: 0.5 }, { sym: 'h', name: 'height', p: 0.5 }] },
  { what: 'the pull needed to swing a mass in a circle', sym: 'F', on: [{ sym: 'm', name: 'mass', p: 1 }, { sym: 'v', name: 'speed', p: 2 }, { sym: 'r', name: 'radius', p: -1 }] },
];

const lawTex = (law: Law): string => `${law.sym} \\propto ${comboTex(law.on)}`;

interface ScaleParams {
  law: number;
  which: number;
  f: number;
}

const scaled = ({ law, which, f }: ScaleParams): number => n3(f ** LAWS[law].on[which].p);

/** Expression: how a formula found from dimensions scales when one quantity is multiplied. */
const dimScale: Generator<ScaleParams> = {
  id: 'clm-dim-scale',
  sample: (rng, difficulty) =>
    until(
      () => {
        const law = rng.int(0, LAWS.length - 1);
        return { law, which: rng.int(0, LAWS[law].on.length - 1), f: rng.pick(difficulty > 1 ? [4, 9, 16, 25, 0.25, 2.25, 1.44, 0.64, 3, 5] : [4, 9, 16, 25, 2, 3, 10]) };
      },
      (p) => exact(scaled(p), 3) && scaled(p) !== 1,
    ),
  render: (p) => {
    const law = LAWS[p.law];
    const q = law.on[p.which];
    return typed([say(`From dimensions, ${law.what} goes as $${lawTex(law)}$. If the ${q.name} $${q.sym}$ is made $${fmt(p.f)}$ times as large, by what factor does $${law.sym}$ change?`)], '\\text{factor} =', scaled(p));
  },
  solution: (p) => {
    const q = LAWS[p.law].on[p.which];
    return [{ tex: `${fmt(p.f)}^{${fmt(q.p)}} = ${fmt(scaled(p))}` }];
  },
  choices: (p) => {
    const e = LAWS[p.law].on[p.which].p;
    return numChoices(scaled(p), [n3(p.f * e), n3(p.f ** -e), p.f, n3(p.f ** (2 * e))], salted(p.law, p.which, p.f * 100));
  },
};

interface RayleighParams {
  target: number;
  /** The three quantities combined, and the powers that give the target. */
  from: number[];
  powers: number[];
}

/** Solves x A = t for three unknowns by Cramer's rule, or null when the quantities are not independent. */
function solve3(cols: Dims[], t: Dims): number[] | null {
  const det = (a: Dims, b: Dims, c: Dims) => a[0] * (b[1] * c[2] - b[2] * c[1]) - b[0] * (a[1] * c[2] - a[2] * c[1]) + c[0] * (a[1] * b[2] - a[2] * b[1]);
  const D = det(cols[0], cols[1], cols[2]);
  if (Math.abs(D) < 1e-9) return null;
  return [det(t, cols[1], cols[2]) / D, det(cols[0], t, cols[2]) / D, det(cols[0], cols[1], t) / D].map(n3);
}

const sampleRayleigh = (rng: { int: (a: number, b: number) => number; sample: <T>(xs: readonly T[], n: number) => T[] }, hard: boolean): RayleighParams =>
  until(
    () => {
      const idx = QUANTITIES.map((_, i) => i);
      const [target, ...from] = rng.sample(idx, 4);
      return { target, from, powers: solve3(from.map((i) => QUANTITIES[i].d), QUANTITIES[target].d) ?? [99, 99, 99] };
    },
    (p) => p.powers.every((x) => Math.abs(x) <= 3 && (Number.isInteger(x) || (hard && Number.isInteger(2 * x)))) && p.powers.filter((x) => x === 0).length <= 1,
  );

const rayleighSolution = (p: RayleighParams): SolutionStep[] => {
  const Q = p.from.map((i) => QUANTITIES[i]);
  return [
    { tex: Q.map((q) => `[${q.sym}] = ${dimTex(q.d)}`).join(' \\qquad ') },
    ...[0, 1, 2].map((b): SolutionStep => ({ tex: baseLine(b, signed(Q.map((q, k) => ({ c: q.d[b], body: onSym('abc'[k]) }))), fmt(QUANTITIES[p.target].d[b])) })),
    { tex: `a = ${fmt(p.powers[0])} \\qquad b = ${fmt(p.powers[1])} \\qquad c = ${fmt(p.powers[2])}` },
  ];
};

const rayleighPrompt = (p: RayleighParams): string => {
  const Q = p.from.map((i) => QUANTITIES[i]);
  return `Find the powers $a$, $b$ and $c$ for which $${Q[0].sym}^{a}${Q[1].sym}^{b}${Q[2].sym}^{c}$ has the dimensions of ${QUANTITIES[p.target].name}, $${dimTex(QUANTITIES[p.target].d)}$. Here ${Q.map((q) => `$${q.sym}$ is ${q.name}, $${dimTex(q.d)}$`).join('; ')}.`;
};

/** Tree: the three powers that combine three quantities into the dimensions of a fourth. */
const rayleighTree: Generator<RayleighParams> = {
  id: 'clm-rayleigh-tree',
  sample: (rng, difficulty) => sampleRayleigh(rng, difficulty > 1),
  render: (p) => ({
    kind: 'tree',
    prompt: [say(rayleighPrompt(p))],
    expression: 'a \\qquad b \\qquad c',
    nodes: [
      { id: 'a', from: [] },
      { id: 'b', from: [] },
      { id: 'c', from: [] },
    ],
    bank: tidyBank(p.powers, p.powers.flatMap((x) => [-x, x + 1, x - 1])),
    answer: p.powers.map(fmt),
  }),
  solution: rayleighSolution,
};

/** Slider: one of the three powers, from -3 to 3 in halves. */
const rayleighSlider: Generator<RayleighParams & { which: number }> = {
  id: 'clm-rayleigh-slider',
  sample: (rng, difficulty) => {
    const p = sampleRayleigh(rng, difficulty > 1);
    return { ...p, which: rng.int(0, 2) };
  },
  render: (p) => {
    const figure = track(-3, 3, [{ at: 0, name: '0' }], 'A scale of powers from minus three to three');
    return {
      kind: 'slider',
      prompt: [say(rayleighPrompt(p)), say(`Slide to $${'abc'[p.which]}$.`)],
      min: -3,
      max: 3,
      step: 0.5,
      answer: p.powers[p.which],
      readout: `${'abc'[p.which]} = {v}`,
      figure: { svg: figure.svg, xMin: figure.xMin, xMax: figure.xMax, axis: 'x' },
    };
  },
  solution: rayleighSolution,
};

const WORKS = 'Those powers work';
const FAILS = 'No powers work';

interface PairParams {
  target: number;
  /** Two quantities: A is found from a base where B is absent, B from one where A is absent, and the third base checks. */
  A: number;
  B: number;
  baseA: number;
  baseB: number;
}

/** The powers of A and B each fixed by a base the other lacks. */
const pairPowers = (p: PairParams): number[] => [n3(QUANTITIES[p.target].d[p.baseA] / QUANTITIES[p.A].d[p.baseA]), n3(QUANTITIES[p.target].d[p.baseB] / QUANTITIES[p.B].d[p.baseB])];
const pairWorks = (p: PairParams): boolean => {
  const [a, b] = pairPowers(p);
  return [0, 1, 2].every((k) => Math.abs(a * QUANTITIES[p.A].d[k] + b * QUANTITIES[p.B].d[k] - QUANTITIES[p.target].d[k]) < 1e-9);
};

/** Flow: combine two quantities into the dimensions of a third: one power from each base the other lacks, then check the last base. */
const rayleighFlow: Generator<PairParams> = {
  id: 'clm-rayleigh-flow',
  sample: (rng) =>
    until(
      () => {
        const [target, A, B] = rng.sample(QUANTITIES.map((_, i) => i), 3);
        const baseA = rng.int(0, 2);
        const baseB = rng.int(0, 2);
        return { target, A, B, baseA, baseB };
      },
      (p) => {
        if (p.baseA === p.baseB) return false;
        const [dA, dB] = [QUANTITIES[p.A].d, QUANTITIES[p.B].d];
        if (dA[p.baseA] === 0 || dB[p.baseA] !== 0 || dB[p.baseB] === 0 || dA[p.baseB] !== 0) return false;
        return pairPowers(p).every((x) => Number.isInteger(2 * x) && Math.abs(x) <= 3 && x !== 0);
      },
    ),
  render: (p) => {
    const [a, b] = pairPowers(p);
    const [QA, QB, QT] = [QUANTITIES[p.A], QUANTITIES[p.B], QUANTITIES[p.target]];
    return {
      kind: 'flow',
      prompt: [say(`Can $${QA.sym}^{a}${QB.sym}^{b}$ have the dimensions of ${QT.name}, $${dimTex(QT.d)}$? Here $${QA.sym}$ is ${QA.name}, $${dimTex(QA.d)}$, and $${QB.sym}$ is ${QB.name}, $${dimTex(QB.d)}$.`)],
      subject: `[${QA.sym}^{a}${QB.sym}^{b}] = ${dimTex(QT.d)}`,
      steps: [
        { id: 'a', ask: `Matching the power of $\\mathsf{${BASES[p.baseA]}}$, $a =$`, branches: intForks(a, [-a, n3(a * 2)]).map((label) => ({ label, to: 'b' })) },
        { id: 'b', ask: `Matching the power of $\\mathsf{${BASES[p.baseB]}}$, $b =$`, branches: intForks(b, [-b, n3(b * 2)]).map((label) => ({ label, to: 'check' })) },
        { id: 'check', ask: `Now check the power of $\\mathsf{${BASES[3 - p.baseA - p.baseB]}}$:`, branches: [WORKS, FAILS].map((label) => ({ label, outcome: 'Every base must match; if the last one does not, no powers of these two quantities can give it.' })) },
      ],
      answer: [`$${fmt(a)}$`, `$${fmt(b)}$`, pairWorks(p) ? WORKS : FAILS],
    };
  },
  solution: (p) => {
    const [a, b] = pairPowers(p);
    const k = 3 - p.baseA - p.baseB;
    const [QA, QB, QT] = [QUANTITIES[p.A], QUANTITIES[p.B], QUANTITIES[p.target]];
    // A power matched with coefficient 1 is already solved, so it is not written twice.
    const match = (base: number, c: number, sym: string, v: number, want: number): string => `${baseLine(base, coef(c, sym), fmt(want))}${c === 1 ? '' : ` \\qquad ${sym} = ${fmt(v)}`}`;
    // The last base with the powers put in: symbols, then values, unless the values would only repeat the result.
    const values = signed([{ c: QA.d[k], body: onValue(a) }, { c: QB.d[k], body: onValue(b) }]);
    const result = fmt(n3(a * QA.d[k] + b * QB.d[k]));
    return [
      { tex: match(p.baseA, QA.d[p.baseA], 'a', a, QT.d[p.baseA]) },
      { tex: match(p.baseB, QB.d[p.baseB], 'b', b, QT.d[p.baseB]) },
      { tex: baseLine(k, signed([{ c: QA.d[k], body: onSym('a') }, { c: QB.d[k], body: onSym('b') }]), values === result ? result : `${values} = ${result}`) },
      { text: pairWorks(p) ? `That matches $${fmt(QT.d[k])}$, so the powers work.` : `That is not $${fmt(QT.d[k])}$, so no powers work.` },
    ];
  },
};

/* ================================================================
 * Natural units
 * ================================================================ */

interface SpringUnitParams {
  m: number;
  /** The unit of time in seconds is 1 / w, and a time t is to be converted. */
  w: number;
  t: number;
  find: 'tau' | 'count';
}

/** Expression: the natural time unit sqrt(m / k) of a mass on a spring (easy), or a time counted in it (hard). */
const naturalTime: Generator<SpringUnitParams> = {
  id: 'clm-natural-time',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: rng.pick([0.1, 0.2, 0.25, 0.5, 1, 2, 4, 5, 8]), w: rng.pick([2, 4, 5, 8, 10, 20, 25, 40, 50]), t: rng.int(1, 30), find: difficulty > 1 ? ('count' as const) : ('tau' as const) }),
      (p) => exact(p.m * p.w * p.w, 2) && exact(p.t * p.w, 3),
    ),
  render: (p) => {
    const k = n3(p.m * p.w * p.w);
    const lead = `In units where a ${kg(p.m)} mass and its spring of stiffness ${Nm(k)} both count as $1$, time is measured in $\\tau = \\sqrt{m/k}$.`;
    return p.find === 'tau' ? typed([say(`${lead} How long is $\\tau$, in seconds?`)], '\\tau =', n3(1 / p.w)) : typed([say(`${lead} How many of these units is ${secs(p.t)}?`)], '\\frac{t}{\\tau} =', n3(p.t * p.w));
  },
  solution: (p) => {
    const k = n3(p.m * p.w * p.w);
    const tau = n3(1 / p.w);
    // A stiffness of 1 leaves nothing to divide by, so the root is of the mass alone.
    const root = k === 1 ? `\\sqrt{${fmt(p.m)}}` : `\\sqrt{\\frac{${fmt(p.m)}}{${fmt(k)}}}`;
    return p.find === 'tau' ? [{ tex: k === 1 ? `\\tau = ${root} = ${fmt(tau)}` : `\\tau = ${root} = \\sqrt{${fmt(n3(tau * tau))}} = ${fmt(tau)}` }] : [{ tex: `\\tau = ${root} = ${fmt(tau)}` }, { tex: `\\frac{${p.t}}{${fmt(tau)}} = ${fmt(n3(p.t * p.w))}` }];
  },
  choices: (p) => (p.find === 'tau' ? numChoices(n3(1 / p.w), [p.w, n3(1 / (p.w * p.w)), n3(p.m / (p.m * p.w * p.w))], salted(p.m * 10, p.w, 1)) : numChoices(n3(p.t * p.w), [n3(p.t / p.w), n3(p.t * p.w * p.w), p.t + p.w], salted(p.m * 10, p.w, p.t))),
};

interface UnitsParams {
  /** Units of mass, length and time, in kg, m and s. */
  M0: number;
  L0: number;
  T0: number;
  picks: number[];
  values: number[];
  hard: boolean;
}

const unitOf = ({ M0, L0, T0 }: { M0: number; L0: number; T0: number }, d: Dims): number => n3(M0 ** d[0] * L0 ** d[1] * T0 ** d[2]);

/** Table: quantities in SI and in natural units made from a chosen mass, length and time; hard blanks the SI side of some rows. */
const naturalTable: Generator<UnitsParams> = {
  id: 'clm-natural-table',
  sample: (rng, difficulty) =>
    until(
      () => {
        const picks = rng.sample([3, 4, 5, 6, 8], 3);
        return { M0: rng.pick([1, 2, 4, 5, 10]), L0: rng.pick([0.5, 1, 2, 4, 5, 10]), T0: rng.pick([0.5, 1, 2, 4, 5, 10]), picks, values: picks.map(() => rng.int(1, 12)), hard: difficulty > 1 };
      },
      (p) => p.picks.every((q, r) => exact(unitOf(p, QUANTITIES[q].d), 3) && exact(p.values[r] * unitOf(p, QUANTITIES[q].d), 3)) && !(p.M0 === 1 && p.L0 === 1 && p.T0 === 1),
    ),
  render: (p) => {
    const si = (r: number) => n3(p.values[r] * unitOf(p, QUANTITIES[p.picks[r]].d));
    const swap = (r: number) => p.hard && r === 1;
    const answer = p.picks.map((_, r) => (swap(r) ? si(r) : p.values[r]));
    return {
      kind: 'table',
      prompt: [say(`Natural units are chosen here so that ${kg(p.M0)}, ${metres(p.L0)} and ${secs(p.T0)} each count as $1$. Fill in each quantity in the units it is missing.`)],
      columns: ['\\text{quantity}', '\\text{SI}', '\\text{natural}'],
      rows: p.picks.map((q, r) => [QUANTITIES[q].defTex, swap(r) ? null : fmt(si(r)), swap(r) ? fmt(p.values[r]) : null]),
      bank: tidyBank(answer, p.picks.flatMap((q, r) => [n3(si(r) * unitOf(p, QUANTITIES[q].d)), si(r), p.values[r] + 1])),
      answer: answer.map(fmt),
    };
  },
  solution: (p) =>
    p.picks.map((q, r): SolutionStep => ({ tex: `[${QUANTITIES[q].sym}] = ${dimTex(QUANTITIES[q].d)} \\qquad \\text{unit} = ${fmt(unitOf(p, QUANTITIES[q].d))}${p.values[r] === 1 ? '' : ` \\qquad ${fmt(n3(p.values[r] * unitOf(p, QUANTITIES[q].d)))} = ${fmt(p.values[r])} \\times ${fmt(unitOf(p, QUANTITIES[q].d))}`}` })),
};

interface GravityUnitParams {
  /** The length unit, in metres: whole when easy, one decimal place when hard. */
  L0: number;
  /** A speed to convert, in whole metres per second. */
  v: number;
}

/** Natural-unit conversions are asked to 3 significant figures. */
const S3: Precision = { sf: 3 };


/** The pendulum units: tau = sqrt(L0 / g), u = L0 / tau = sqrt(g L0), and the speed counted in u. */
const gravityUnits = ({ L0, v }: GravityUnitParams) => {
  const tau = Math.sqrt(L0 / 9.8);
  const u = Math.sqrt(9.8 * L0);
  return { tau, u, count: v / u };
};

/**
 * Every rounded value clear of a rounding edge, and the same whether the
 * learner carries the rounded time unit or the exact one into u, and the
 * rounded or exact u into the count.
 */
const gravityRoundsWell = (p: GravityUnitParams): boolean => {
  const { tau, u, count } = gravityUnits(p);
  const tauR = roundTo(tau, S3);
  const uR = roundTo(u, S3);
  const countR = roundTo(count, S3);
  return (
    roundedWell(tau, S3) &&
    roundedWell(u, S3) &&
    roundedWell(count, S3) &&
    roundTo(p.L0 / tauR, S3) === uR &&
    roundTo(p.v / uR, S3) === countR &&
    roundTo((p.v * tauR) / p.L0, S3) === countR
  );
};

/** Rounded tokens for a bank or a fork: the answer's, then distinct positive extras, sorted by value. */
const roundedTokens = (answer: string[], extras: number[], spare: number, precision: Precision): string[] => {
  const out = [...answer];
  for (const v of extras) {
    if (out.length - answer.length >= spare) break;
    if (!Number.isFinite(v) || v <= 0) continue;
    const token = fixed(v, precision);
    if (!out.some((t) => Number(t) === Number(token))) out.push(token);
  }
  return out.sort((x, y) => Number(x) - Number(y));
};

/** Tree: units where a length and g are 1: the time unit, the speed unit, then a speed in natural units, each to 3 significant figures. */
const naturalTree: Generator<GravityUnitParams> = {
  id: 'clm-natural-tree',
  sample: (rng, difficulty) =>
    until(
      () => ({ L0: difficulty > 1 ? rng.int(2, 99) / 10 : rng.int(1, 20), v: rng.int(2, difficulty > 1 ? 40 : 20) }),
      // A length of 9.8 m makes both units 1 or 9.8, which is no question at all.
      // Nor a speed equal to the length: v/u would then equal tau, one token twice.
      (p) => p.L0 !== 9.8 && p.v !== p.L0 && gravityRoundsWell(p),
    ),
  render: (p) => {
    const { tau, u, count } = gravityUnits(p);
    const answer = [fixed(tau, S3), fixed(u, S3), fixed(count, S3)];
    return {
      kind: 'tree',
      prompt: [
        say(`A pendulum problem uses units where the length ${metres(p.L0)} and $g$ both count as $1$. ${G_NOTE}`),
        say(`Find the unit of time, the unit of speed, and a speed of ${ms(p.v)} in these units, each to 3 significant figures.`),
      ],
      expression: '\\tau = \\sqrt{\\frac{\\ell}{g}} \\qquad u = \\frac{\\ell}{\\tau}',
      nodes: [
        { id: '\\tau', from: [] },
        { id: 'u', from: ['\\tau'] },
        { id: '\\frac{v}{u}', from: ['u'] },
      ],
      bank: roundedTokens(answer, [1 / tau, p.L0 / 9.8, 9.8 * tau, p.v * u, p.L0 * tau, p.v / p.L0, 2 * tau, u / 2, p.v * tau], 3, S3),
      answer,
      calculator: true,
    };
  },
  solution: (p) => {
    const { tau, u, count } = gravityUnits(p);
    return [
      { tex: `\\tau = \\sqrt{\\frac{${fmt(p.L0)}}{9.8}} = ${dots(tau)}` },
      { text: 'To 3 significant figures:' },
      { tex: `\\tau = ${fixed(tau, S3)}` },
      { text: 'Carry the unrounded value on, and round only what is written in the tree.' },
      { tex: `u = \\frac{${fmt(p.L0)}}{${dots(tau)}} = ${dots(u)}` },
      { text: 'To 3 significant figures:' },
      { tex: `u = ${fixed(u, S3)}` },
      { tex: `\\frac{${p.v}}{${dots(u)}} = ${dots(count)}` },
      { text: 'To 3 significant figures:' },
      { tex: `\\frac{v}{u} = ${fixed(count, S3)}` },
    ];
  },
};

interface SpringEnergyParams {
  m: number;
  w: number;
  L0: number;
  /** The energy to convert, in joules: whole when easy, one decimal place when hard. */
  E: number;
}

const springK = (p: SpringEnergyParams): number => n3(p.m * p.w * p.w);
const springE0 = (p: SpringEnergyParams): number => n3(springK(p) * p.L0 * p.L0);

/** Flow: units where a mass and a spring are 1: the unit of time, the unit of energy on a chosen length, then an energy in them to 3 significant figures. */
const naturalFlow: Generator<SpringEnergyParams> = {
  id: 'clm-natural-flow',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: rng.pick([0.5, 1, 2, 4, 5]), w: rng.pick([2, 4, 5, 10]), L0: rng.pick([0.1, 0.2, 0.5, 1]), E: difficulty > 1 ? rng.int(10, 999) / 10 : rng.int(1, 60) }),
      (p) => {
        const count = p.E / springE0(p);
        return exact(springK(p), 1) && exact(springE0(p), 3) && count >= 1.5 && count < 1000 && roundedWell(count, S3);
      },
    ),
  render: (p) => {
    const k = springK(p);
    const tau = n3(1 / p.w);
    const E0 = springE0(p);
    const count = p.E / E0;
    return {
      kind: 'flow',
      calculator: true,
      prompt: [
        say(`A ${kg(p.m)} mass sits on a spring of ${Nm(k)}. Units are chosen so the mass, the spring and a length of ${metres(p.L0)} each count as $1$. How much is an energy of $${fmt(p.E)}\\text{ J}$ in them? Give your answer to 3 significant figures.`),
      ],
      subject: '\\tau = \\sqrt{\\frac{m}{k}} \\qquad E_{0} = \\frac{m\\ell^{2}}{\\tau^{2}} = k\\ell^{2}',
      steps: [
        { id: 'tau', ask: 'The unit of time, in seconds:', branches: forks(tau, [p.w, n3(1 / (p.w * p.w))], 0.1).map((label) => ({ label, to: 'E' })) },
        { id: 'E', ask: 'The unit of energy, in joules:', branches: forks(E0, [n3(k * p.L0), n3(0.5 * k * p.L0 * p.L0)], 0.01).map((label) => ({ label, to: 'n' })) },
        {
          id: 'n',
          ask: 'So the energy in natural units, to 3 significant figures:',
          branches: roundedTokens([fixed(count, S3)], [p.E * E0, (2 * p.E) / E0, p.E / (k * p.L0), 10 * count, count / 10], 2, S3).map((label) => ({
            label: `$${label}$`,
            outcome: 'A quantity in natural units is its SI value over the unit built for it.',
          })),
        },
      ],
      answer: [`$${fmt(tau)}$`, `$${fmt(E0)}$`, `$${fixed(count, S3)}$`],
    };
  },
  solution: (p) => {
    const k = springK(p);
    const E0 = springE0(p);
    const count = p.E / E0;
    return [
      { tex: `\\tau = \\sqrt{\\frac{${fmt(p.m)}}{${fmt(k)}}} = ${fmt(n3(1 / p.w))}` },
      { tex: `E_{0} = ${fmt(k)} \\times ${fmt(p.L0)}^{2} = ${fmt(E0)}` },
      { tex: `\\frac{${fmt(p.E)}}{${fmt(E0)}} = ${dots(count)}` },
      { text: 'To 3 significant figures:' },
      { tex: `\\frac{E}{E_{0}} = ${fixed(count, S3)}` },
    ];
  },
};

/* ================================================================
 * The Lagrangian
 * ================================================================ */

type System = 'spring' | 'gravity';

interface LagParams {
  system: System;
  m: number;
  /** Stiffness for a spring; for a thrown ball, the height x is measured up from the ground. */
  k: number;
  x: number;
  v: number;
}

const kinetic = (p: LagParams): number => n3(0.5 * p.m * p.v * p.v);
const potential = (p: LagParams): number => n3(p.system === 'spring' ? 0.5 * p.k * p.x * p.x : p.m * 9.8 * p.x);
const lagrangian = (p: LagParams): number => n3(kinetic(p) - potential(p));

const sampleLag = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }, hard: boolean): LagParams =>
  until(
    () => {
      const system = hard ? rng.pick(['spring', 'gravity'] as const) : ('spring' as const);
      return { system, m: rng.pick([0.5, 1, 2, 4, 5, 10]), k: 10 * rng.int(1, 40), x: system === 'spring' ? n3(0.1 * rng.int(1, 10)) : rng.int(1, 20), v: rng.int(1, 12) };
    },
    (p) => exact(lagrangian(p), 3) && exact(potential(p), 3) && lagrangian(p) !== 0,
  );

const lagSetting = (p: LagParams): string =>
  p.system === 'spring'
    ? `A ${kg(p.m)} mass on a spring of ${Nm(p.k)} is ${metres(p.x)} from its rest point, moving at ${ms(p.v)}.`
    : `A ${kg(p.m)} ball is ${metres(p.x)} above the ground, moving at ${ms(p.v)}. ${G_NOTE}`;

const lagSolution = (p: LagParams): SolutionStep[] => [
  { tex: `T = ${product('\\tfrac{1}{2}', fmt(p.m), `${p.v}^{2}`)} = ${fmt(kinetic(p))}` },
  { tex: p.system === 'spring' ? `V = ${product('\\tfrac{1}{2}', fmt(p.k), `${fmt(p.x)}^{2}`)} = ${fmt(potential(p))}` : `V = ${product(fmt(p.m), '9.8', fmt(p.x))} = ${fmt(potential(p))}` },
  { tex: `L = ${fmt(kinetic(p))} - ${fmt(potential(p))} = ${fmt(lagrangian(p))}` },
];

/** Expression: the Lagrangian T - V of a mass on a spring (easy) or a thrown ball as well (hard). */
const lagValue: Generator<LagParams> = {
  id: 'clm-lag-value',
  sample: (rng, difficulty) => sampleLag(rng, difficulty > 1),
  render: (p) => typed([say(`${lagSetting(p)} What is its Lagrangian $L = T - V$ at that moment, in joules?`)], 'L =', lagrangian(p)),
  solution: lagSolution,
  choices: (p) => numChoices(lagrangian(p), [n3(kinetic(p) + potential(p)), n3(potential(p) - kinetic(p)), n3(p.m * p.v * p.v - potential(p))], salted(p.m, p.k, p.x * 10, p.v)),
};

/** Tree: the kinetic energy, the potential energy, then L = T - V. */
const lagTree: Generator<LagParams> = {
  id: 'clm-lag-tree',
  sample: (rng, difficulty) => sampleLag(rng, difficulty > 1),
  render: (p) => ({
    kind: 'tree',
    prompt: [say(lagSetting(p)), say('Find its kinetic energy, its potential energy and its Lagrangian, in joules.')],
    expression: 'L = T - V',
    nodes: [
      { id: 'T', from: [] },
      { id: 'V', from: [] },
      { id: 'L', from: ['T', 'V'] },
    ],
    bank: tidyBank([kinetic(p), potential(p), lagrangian(p)], [n3(kinetic(p) + potential(p)), n3(p.m * p.v * p.v), n3(2 * potential(p))]),
    answer: [kinetic(p), potential(p), lagrangian(p)].map(fmt),
  }),
  solution: lagSolution,
};

/** Table: a mass on a spring at several moments: T, V and L = T - V. */
const lagTable: Generator<{ m: number; k: number; rows: { x: number; v: number }[]; hard: boolean }> = {
  id: 'clm-lag-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: rng.pick([0.5, 1, 2, 4]), k: 10 * rng.int(1, 30), rows: [0, 1, 2].map(() => ({ x: n3(0.1 * rng.int(0, 10)), v: rng.int(0, 8) })), hard: difficulty > 1 }),
      (p) => new Set(p.rows.map((r) => r.x * 100 + r.v)).size === 3 && p.rows.every((r) => exact(0.5 * p.k * r.x * r.x, 3)),
    ),
  render: ({ m, k, rows, hard }) => {
    const T = (r: { v: number }) => n3(0.5 * m * r.v * r.v);
    const V = (r: { x: number }) => n3(0.5 * k * r.x * r.x);
    const answer = rows.flatMap((r) => (hard ? [T(r), V(r), n3(T(r) - V(r))] : [n3(T(r) - V(r))]));
    return {
      kind: 'table',
      prompt: [say(`A ${kg(m)} mass is on a spring of ${Nm(k)}. At each displacement $x$ in metres and speed $v$ in $\\text{m s}^{-1}$, fill in $T$, $V$ and $L = T - V$ in joules.`)],
      columns: ['x', 'v', 'T', 'V', 'L'],
      rows: rows.map((r) => [fmt(r.x), fmt(r.v), hard ? null : fmt(T(r)), hard ? null : fmt(V(r)), null]),
      bank: tidyBank(answer, rows.flatMap((r) => [n3(T(r) + V(r)), n3(V(r) - T(r)), n3(m * r.v * r.v)])),
      answer: answer.map(fmt),
    };
  },
  solution: ({ m, k, rows }) => rows.map((r): SolutionStep => ({ tex: `T = ${fmt(n3(0.5 * m * r.v * r.v))} \\qquad V = ${fmt(n3(0.5 * k * r.x * r.x))} \\qquad L = ${fmt(n3(0.5 * m * r.v * r.v - 0.5 * k * r.x * r.x))}` })),
};

/** Flow: the kinetic term, the potential term, then the value of L. */
const lagFlow: Generator<LagParams> = {
  id: 'clm-lag-flow',
  sample: (rng) => sampleLag(rng, true),
  render: (p) => {
    const Ts = ['$\\tfrac{1}{2}m\\dot{x}^{2}$', '$m\\dot{x}^{2}$', '$\\tfrac{1}{2}m\\dot{x}$'];
    const Vs = p.system === 'spring' ? ['$\\tfrac{1}{2}kx^{2}$', '$kx$', '$-\\tfrac{1}{2}kx^{2}$'] : ['$mgx$', '$-mgx$', '$\\tfrac{1}{2}mgx^{2}$'];
    const L = lagrangian(p);
    // L can be negative, so its branches are built by hand.
    const Ls = [L, n3(kinetic(p) + potential(p)), n3(-L)].filter((v, i, all) => all.indexOf(v) === i);
    if (Ls.length < 3) Ls.push(n3(L + 1));
    return {
      kind: 'flow',
      prompt: [say(lagSetting(p)), say(p.system === 'spring' ? 'Build its Lagrangian, with $x$ its displacement and $\\dot{x}$ its speed.' : 'Build its Lagrangian, with $x$ its height and $\\dot{x}$ its speed.')],
      subject: 'L = T - V',
      steps: [
        { id: 'T', ask: 'The kinetic energy $T$:', branches: [...Ts].sort().map((label) => ({ label, to: 'V' })) },
        { id: 'V', ask: 'The potential energy $V$:', branches: [...Vs].sort().map((label) => ({ label, to: 'L' })) },
        { id: 'L', ask: 'So $L$ now, in joules:', branches: Ls.sort((a, b) => a - b).map((v) => ({ label: `$${fmt(v)}$`, outcome: 'The Lagrangian is the kinetic energy take away the potential energy, not their sum.' })) },
      ],
      answer: [Ts[0], Vs[0], `$${fmt(L)}$`],
    };
  },
  solution: lagSolution,
};

/* ================================================================
 * Euler-Lagrange
 * ================================================================ */

interface ElParams {
  m: number;
  /** Spring stiffness, and a steady push F0 along x (V = kx^2/2 - F0 x). */
  k: number;
  F0: number;
  x: number;
  v: number;
}

const dLdx = (p: ElParams): number => n3(-p.k * p.x + p.F0);
const dLdv = (p: ElParams): number => n3(p.m * p.v);
const accel = (p: ElParams): number => n3(dLdx(p) / p.m);

const lagTex = (p: ElParams): string => `L = ${half(p.m, '\\dot{x}^{2}')} - ${half(p.k, 'x^{2}')}${p.F0 ? ` + ${fmt(p.F0)}x` : ''}`;

const sampleEl = (rng: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }, hard: boolean): ElParams =>
  until(
    () => ({ m: rng.pick([0.5, 1, 2, 4, 5]), k: rng.int(1, 30) * 2, F0: hard ? rng.int(1, 20) : 0, x: n3(rng.pick([-1, 1]) * 0.1 * rng.int(1, 20)), v: rng.int(0, 10) }),
    (p) => exact(accel(p), 3) && dLdx(p) !== 0,
  );

/** Expression: the acceleration from the Euler-Lagrange equation m x'' = dL/dx at a stated x. */
const elAccel: Generator<ElParams> = {
  id: 'clm-el-accel',
  sample: (rng, difficulty) => sampleEl(rng, difficulty > 1),
  render: (p) => typed([say(`A body has Lagrangian $${lagTex(p)}$. What is its acceleration $\\ddot{x}$ when $x = ${fmt(p.x)}$, in $\\text{m s}^{-2}$?`)], '\\ddot{x} =', accel(p)),
  solution: (p) => [
    { tex: `\\frac{\\partial L}{\\partial \\dot{x}} = ${coef(p.m, '\\dot{x}')} \\qquad \\frac{\\partial L}{\\partial x} = -${fmt(p.k)}x${p.F0 ? ` + ${fmt(p.F0)}` : ''}` },
    { tex: `${coef(p.m, '\\ddot{x}')} = ${fmt(dLdx(p))}` },
    // With a mass of 1 the line above is already the answer.
    ...(p.m === 1 ? [] : [{ tex: `\\ddot{x} = ${fmt(accel(p))}` }]),
  ],
  choices: (p) => numChoices(accel(p), [n3(-accel(p)), n3(dLdx(p)), n3((-0.5 * p.k * p.x * p.x + p.F0 * p.x) / p.m), n3((p.k * p.x + p.F0) / p.m)], salted(p.m, p.k, p.F0, p.x * 10)),
};

/** Tree: the momentum dL/dx', the force dL/dx, then the acceleration. */
const elTree: Generator<ElParams> = {
  id: 'clm-el-tree',
  sample: (rng, difficulty) => until(() => sampleEl(rng, difficulty > 1), (p) => p.v > 0),
  render: (p) => ({
    kind: 'tree',
    prompt: [say(`A body has Lagrangian $${lagTex(p)}$. At $x = ${fmt(p.x)}$ it moves at $\\dot{x} = ${p.v}$.`), say('Find both partial derivatives there, then $\\ddot{x}$.')],
    expression: '\\frac{d}{dt}\\frac{\\partial L}{\\partial \\dot{x}} = \\frac{\\partial L}{\\partial x}',
    nodes: [
      { id: '\\frac{\\partial L}{\\partial \\dot{x}}', from: [] },
      { id: '\\frac{\\partial L}{\\partial x}', from: [] },
      { id: '\\ddot{x}', from: ['\\frac{\\partial L}{\\partial x}'] },
    ],
    bank: tidyBank([dLdv(p), dLdx(p), accel(p)], [n3(-dLdx(p)), n3(0.5 * p.m * p.v * p.v), n3(-accel(p)), n3(dLdx(p) * p.m)]),
    answer: [dLdv(p), dLdx(p), accel(p)].map(fmt),
  }),
  solution: (p) => [
    { tex: p.m === 1 ? `\\frac{\\partial L}{\\partial \\dot{x}} = \\dot{x} = ${fmt(dLdv(p))}` : `\\frac{\\partial L}{\\partial \\dot{x}} = ${fmt(p.m)} \\times ${p.v} = ${fmt(dLdv(p))}` },
    { tex: `\\frac{\\partial L}{\\partial x} = ${product(`-${fmt(p.k)}`, par(p.x))}${p.F0 ? ` + ${fmt(p.F0)}` : ''} = ${fmt(dLdx(p))}` },
    { tex: p.m === 1 ? `\\ddot{x} = \\frac{\\partial L}{\\partial x} = ${fmt(accel(p))}` : `\\ddot{x} = \\frac{${fmt(dLdx(p))}}{${fmt(p.m)}} = ${fmt(accel(p))}` },
  ],
};

/** Table: for one Lagrangian, dL/dx and the acceleration at several displacements. */
const elTable: Generator<{ m: number; k: number; F0: number; xs: number[] }> = {
  id: 'clm-el-table',
  sample: (rng, difficulty) =>
    until(
      () => ({ m: rng.pick([0.5, 1, 2, 4, 5]), k: rng.int(1, 30) * 2, F0: difficulty > 1 ? rng.int(1, 20) : 0, xs: rng.sample([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3], 3).sort((a, b) => a - b) }),
      (p) => p.xs.every((x) => exact((-p.k * x + p.F0) / p.m, 3)),
    ),
  render: (p) => {
    const f = (x: number) => n3(-p.k * x + p.F0);
    const answer = p.xs.flatMap((x) => [f(x), n3(f(x) / p.m)]);
    return {
      kind: 'table',
      prompt: [say(`A body has Lagrangian $${lagTex({ ...p, x: 0, v: 0 })}$. Fill in $\\frac{\\partial L}{\\partial x}$ and $\\ddot{x}$ at each $x$.`)],
      columns: ['x', '\\frac{\\partial L}{\\partial x}', '\\ddot{x}'],
      rows: p.xs.map((x) => [fmt(x), null, null]),
      bank: tidyBank(answer, p.xs.flatMap((x) => [n3(-f(x)), n3(f(x) * p.m)])),
      answer: answer.map(fmt),
    };
  },
  solution: (p) => p.xs.map((x): SolutionStep => ({ tex: `x = ${fmt(x)}\\colon \\quad \\frac{\\partial L}{\\partial x} = ${fmt(n3(-p.k * x + p.F0))} \\qquad \\ddot{x} = ${fmt(n3((-p.k * x + p.F0) / p.m))}` })),
};

/** Flow: from a spring's Lagrangian to its equation of motion, then its angular frequency. */
const elFlow: Generator<{ m: number; w: number }> = {
  id: 'clm-el-flow',
  sample: (rng, difficulty) => until(() => ({ m: rng.pick([0.5, 1, 2, 3, 4, 5]), w: rng.int(2, difficulty > 1 ? 12 : 8) }), (p) => exact(p.m * p.w * p.w, 2)),
  render: (p) => {
    const k = n3(p.m * p.w * p.w);
    const L = `L = ${half(p.m, '\\dot{x}^{2}')} - ${half(k, 'x^{2}')}`;
    const dx = [`$-${fmt(k)}x$`, `$${fmt(k)}x$`, `$-${fmt(n3(k / 2))}x^{2}$`];
    const eq = [`$${coef(p.m, '\\ddot{x}')} = -${fmt(k)}x$`, `$${coef(p.m, '\\ddot{x}')} = ${fmt(k)}x$`, `$${coef(p.m, '\\dot{x}')} = -${fmt(k)}x$`];
    return {
      kind: 'flow',
      prompt: [say(`A body has Lagrangian $${L}$.`)],
      subject: '\\frac{d}{dt}\\frac{\\partial L}{\\partial \\dot{x}} = \\frac{\\partial L}{\\partial x}',
      steps: [
        { id: 'dx', ask: '$\\frac{\\partial L}{\\partial x}$ is:', branches: [...dx].sort().map((label) => ({ label, to: 'eq' })) },
        { id: 'eq', ask: 'So the equation of motion is:', branches: [...eq].sort().map((label) => ({ label, to: 'w' })) },
        { id: 'w', ask: 'It is simple harmonic, with $\\omega$ in $\\text{rad s}^{-1}$:', branches: forks(p.w, [p.w * p.w, n3(k / p.m / 2)], 1).map((label) => ({ label, outcome: 'Any Lagrangian of this shape gives simple harmonic motion with $\\omega = \\sqrt{k/m}$.' })) },
      ],
      answer: [dx[0], eq[0], `$${p.w}$`],
    };
  },
  solution: (p) => {
    const k = n3(p.m * p.w * p.w);
    return [
      { tex: `\\frac{\\partial L}{\\partial \\dot{x}} = ${coef(p.m, '\\dot{x}')} \\qquad \\frac{\\partial L}{\\partial x} = -${fmt(k)}x` },
      { tex: `${coef(p.m, '\\ddot{x}')} = -${fmt(k)}x` },
      { tex: p.m === 1 ? `\\omega = \\sqrt{${fmt(k)}} = ${p.w}` : `\\omega = \\sqrt{\\frac{${fmt(k)}}{${fmt(p.m)}}} = ${p.w}` },
    ];
  },
};

export const classicalGeneralGenerators = [
  dimPower,
  dimTable,
  dimFlow,
  dimSiSlider,
  dimScale,
  rayleighTree,
  rayleighSlider,
  rayleighFlow,
  naturalTime,
  naturalTable,
  naturalTree,
  naturalFlow,
  lagValue,
  lagTree,
  lagTable,
  lagFlow,
  elAccel,
  elTree,
  elTable,
  elFlow,
];

export const classicalGeneralInternals = { QUANTITIES, LAWS, solve3, pairPowers, pairWorks, unitOf, lagrangian, accel, dLdx, dLdv };
