/**
 * Complex Numbers, Levels 3 and 4: the plane, modulus, argument and powers.
 */
import type { Generator, KeypadKey } from '../types';
import { complexTex, complexAnswer, bracketedTex } from './format';
import { complexPlaneSvg } from './plane';

const I_KEY: KeypadKey[] = [{ insert: 'i', tex: true }];
/** Arguments come out as fractions of pi, so those keys are needed. */
const ANGLE_KEYS: KeypadKey[] = [
  { insert: '/' },
  { insert: 'pi', label: 'π' },
];
const SQRT_KEYS: KeypadKey[] = [
  { insert: 'sqrt(', label: '√(' },
  { insert: ')' },
];

/* ---------- Read a point off the plane ---------- */

interface IdentifyParams { re: number; im: number; range: number }

export const identifyPoint: Generator<IdentifyParams> = {
  id: 'identify-point',
  sample: (rng, difficulty) => {
    const range = 4;
    // Avoid the origin, and at low difficulty keep off the axes so both
    // components are genuinely being read.
    let re = 0, im = 0;
    while (re === 0 && im === 0) {
      re = rng.int(-range, range);
      im = rng.int(-range, range);
      if (difficulty < 2 && (re === 0 || im === 0)) { re = 0; im = 0; }
    }
    return { re, im, range };
  },
  render: ({ re, im, range }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Which complex number is marked here?' },
      { kind: 'diagram', svg: complexPlaneSvg(range, [{ re, im, highlight: true }]) },
    ],
    lead: 'z =',
    keypad: I_KEY,
    answer: complexAnswer(re, im),
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ re, im }) => [
    {
      text: 'Read the horizontal position as the real part and the vertical as the imaginary part.',
      tex: `\\text{real} = ${re}, \\quad \\text{imaginary} = ${im}`,
    },
    { text: 'So the point is:', tex: complexTex(re, im) },
  ],
};

/* ---------- Place a point on the plane ---------- */

interface PlotParams { re: number; im: number; range: number }

export const plotPoint: Generator<PlotParams> = {
  id: 'plot-point',
  sample: (rng, difficulty) => {
    const range = 4;
    let re = 0, im = 0;
    while (re === 0 && im === 0) {
      re = rng.int(-range, range);
      im = rng.int(-range, range);
      if (difficulty < 2 && (re === 0 || im === 0)) { re = 0; im = 0; }
    }
    return { re, im, range };
  },
  render: ({ re, im, range }) => ({
    kind: 'plot',
    prompt: [{ kind: 'prose', text: `Plot $${complexTex(re, im)}$ on the complex plane.` }],
    range,
    answer: { re, im },
  }),
  solution: ({ re, im }) => [
    {
      text: `Move ${Math.abs(re)} ${re < 0 ? 'left' : 'right'} along the real axis, then ${Math.abs(im)} ${im < 0 ? 'down' : 'up'} the imaginary axis.`,
      tex: `${complexTex(re, im)} \\rightarrow (${re},\\ ${im})`,
    },
  ],
};

/* ---------- Modulus ---------- */

/** Pythagorean pairs, so the modulus is a whole number. */
const TRIPLES: [number, number][] = [
  [3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5],
  [8, 15], [15, 8], [7, 24], [9, 12], [20, 21],
];

interface ModulusParams { a: number; b: number }

export const modulus: Generator<ModulusParams> = {
  id: 'modulus',
  sample: (rng, difficulty) => {
    const [x, y] = rng.pick(TRIPLES);
    // Signs vary so the learner cannot assume both parts are positive.
    return difficulty >= 2
      ? { a: x * rng.sign(), b: y * rng.sign() }
      : { a: x, b: y };
  },
  render: ({ a, b }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `What is $|${complexTex(a, b)}|$?` },
      {
        kind: 'diagram',
        svg: complexPlaneSvg(
          Math.max(5, Math.ceil(Math.max(Math.abs(a), Math.abs(b)) / 5) * 5),
          [{ re: a, im: b, highlight: true }],
        ),
      },
    ],
    lead: `|${complexTex(a, b)}| =`,
    keypad: SQRT_KEYS,
    answer: `${Math.round(Math.hypot(a, b))}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b }) => [
    {
      text: 'The modulus is the distance from the origin, so it is Pythagoras on the two parts.',
      tex: `|${complexTex(a, b)}| = \\sqrt{${a}^2 + ${b}^2}`,
    },
    {
      text: 'Signs disappear when squared, which is why the modulus is never negative.',
      tex: `= \\sqrt{${a * a} + ${b * b}} = \\sqrt{${a * a + b * b}} = ${Math.round(Math.hypot(a, b))}`,
    },
  ],
};

/* ---------- Argument ---------- */

/** Points whose argument is a clean multiple of pi/4, plus the axes. */
const ANGLES: { re: number; im: number; tex: string; value: string }[] = [
  { re: 1, im: 0, tex: '0', value: '0' },
  { re: 1, im: 1, tex: '\\tfrac{\\pi}{4}', value: 'pi/4' },
  { re: 0, im: 1, tex: '\\tfrac{\\pi}{2}', value: 'pi/2' },
  { re: -1, im: 1, tex: '\\tfrac{3\\pi}{4}', value: '3*pi/4' },
  { re: -1, im: 0, tex: '\\pi', value: 'pi' },
  { re: -1, im: -1, tex: '-\\tfrac{3\\pi}{4}', value: '-3*pi/4' },
  { re: 0, im: -1, tex: '-\\tfrac{\\pi}{2}', value: '-pi/2' },
  { re: 1, im: -1, tex: '-\\tfrac{\\pi}{4}', value: '-pi/4' },
];

interface ArgParams { index: number; scale: number }

export const argument: Generator<ArgParams> = {
  id: 'argument',
  sample: (rng, difficulty) => ({
    index: rng.int(0, ANGLES.length - 1),
    // Scaling changes the number without changing the angle, which is the point.
    scale: difficulty >= 2 ? rng.int(1, 4) : 1,
  }),
  render: ({ index, scale }) => {
    const angle = ANGLES[index];
    const re = angle.re * scale;
    const im = angle.im * scale;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `What is $\\arg(${complexTex(re, im)})$, in radians between $-\\pi$ and $\\pi$?`,
        },
        { kind: 'diagram', svg: complexPlaneSvg(5, [{ re, im, highlight: true }]) },
      ],
      lead: `\\arg(${complexTex(re, im)}) =`,
      keypad: ANGLE_KEYS,
      answer: angle.value,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ index, scale }) => {
    const angle = ANGLES[index];
    return [
      {
        text: 'The argument is the angle from the positive real axis, measured anticlockwise.',
        tex: `\\arg(${complexTex(angle.re * scale, angle.im * scale)}) = ${angle.tex}`,
      },
      {
        text: 'Scaling a number stretches it away from the origin but does not rotate it, so the argument is unchanged.',
      },
    ];
  },
};

/* ---------- Powers, via De Moivre ---------- */

interface PowerParams { re: number; im: number; n: number }

export const complexPower: Generator<PowerParams> = {
  id: 'complex-power',
  sample: (rng, difficulty) => {
    // Bases whose powers stay small enough to type comfortably.
    const base = rng.pick([
      { re: 1, im: 1 }, { re: 1, im: -1 }, { re: -1, im: 1 },
      { re: 2, im: 0 }, { re: 0, im: 2 }, { re: 1, im: 0 },
    ]);
    return { ...base, n: rng.int(2, difficulty >= 2 ? 6 : 4) };
  },
  render: ({ re, im, n }) => {
    // Repeated multiplication, which is exact for these integer bases.
    let ar = 1, ai = 0;
    for (let k = 0; k < n; k++) {
      [ar, ai] = [ar * re - ai * im, ar * im + ai * re];
    }
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `What is $${bracketedTex(re, im)}^{${n}}$?` }],
      lead: `${bracketedTex(re, im)}^{${n}} =`,
      keypad: I_KEY,
      answer: complexAnswer(ar, ai),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: ({ re, im, n }) => {
    const steps: { text?: string; tex?: string }[] = [
      {
        text: 'Multiply out step by step, replacing $i^2$ with $-1$ each time.',
      },
    ];
    let ar = 1, ai = 0;
    for (let k = 1; k <= n; k++) {
      [ar, ai] = [ar * re - ai * im, ar * im + ai * re];
      // Only the first few steps are worth showing; the pattern is clear by then.
      if (k <= 3 || k === n) {
        steps.push({ tex: `${bracketedTex(re, im)}^{${k}} = ${complexTex(ar, ai)}` });
      }
    }
    return steps;
  },
};

export const planeGenerators = [
  identifyPoint,
  plotPoint,
  modulus,
  argument,
  complexPower,
];
