/**
 * Complex Numbers, Levels 3 and 4: the plane, modulus, argument and powers.
 */
import type { Generator, KeypadKey } from '../types';
import type { Rng } from '../../engine/rng';
import { I_KEY, complexTex, complexAnswer, bracketedTex, powersOf } from './format';
import { complexPlaneSvg, rangeFor } from './plane';
import { options } from '../choiceVariant';

/** The grid every plane question is drawn on. */
const RANGE = 4;

/**
 * A lattice point that is never the origin, and — below difficulty 2 — never on
 * an axis either, so both components are genuinely being read off the diagram.
 */
function samplePlanePoint(rng: Rng, difficulty: number): { re: number; im: number } {
  const draw = () =>
    difficulty < 2 ? rng.int(1, RANGE) * rng.sign() : rng.int(-RANGE, RANGE);
  let re = draw();
  let im = draw();
  while (re === 0 && im === 0) {
    re = draw();
    im = draw();
  }
  return { re, im };
}
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

interface PointParams { re: number; im: number }

export const identifyPoint: Generator<PointParams> = {
  id: 'identify-point',
  sample: samplePlanePoint,
  render: ({ re, im }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Which complex number is marked here?' },
      { kind: 'diagram', svg: complexPlaneSvg(RANGE, [{ re, im, highlight: true }]) },
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

export const plotPoint: Generator<PointParams> = {
  id: 'plot-point',
  sample: samplePlanePoint,
  render: ({ re, im }) => ({
    kind: 'plot',
    prompt: [{ kind: 'prose', text: `Plot $${complexTex(re, im)}$ on the complex plane.` }],
    range: RANGE,
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

/**
 * Pythagorean triples as [leg, leg, hypotenuse], so the modulus is a whole
 * number the table states outright. Deriving it with Math.hypot would mean
 * rounding a float back to the integer we already know, and would let a
 * mistyped row produce a plausible wrong answer instead of failing a test.
 */
export const TRIPLES: [number, number, number][] = [
  [3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13],
  [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [9, 12, 15], [12, 9, 15],
  [20, 21, 29], [21, 20, 29], [10, 24, 26], [24, 10, 26], [12, 16, 20],
  [16, 12, 20], [15, 20, 25], [20, 15, 25], [9, 40, 41], [40, 9, 41],
  [16, 30, 34], [30, 16, 34], [18, 24, 30], [24, 18, 30], [12, 35, 37],
  [35, 12, 37], [11, 60, 61], [28, 45, 53],
];

interface ModulusParams { a: number; b: number; hypotenuse: number }

export const modulus: Generator<ModulusParams> = {
  id: 'modulus',
  // The sum of the parts, and the square that was never rooted: the two ways
  // a modulus is misread.
  choices: ({ a, b, hypotenuse }) =>
    options(
      { tex: `${hypotenuse}`, answer: `${hypotenuse}` },
      { tex: `${Math.abs(a) + Math.abs(b)}`, answer: `${Math.abs(a) + Math.abs(b)}` },
      { tex: `${a * a + b * b}`, answer: `${a * a + b * b}` },
      { tex: `${hypotenuse + 1}`, answer: `${hypotenuse + 1}` },
    ),
  sample: (rng, difficulty) => {
    const [x, y, hypotenuse] = rng.pick(TRIPLES);
    // Signs vary so the learner cannot assume both parts are positive.
    return difficulty >= 2
      ? { a: x * rng.sign(), b: y * rng.sign(), hypotenuse }
      : { a: x, b: y, hypotenuse };
  },
  render: ({ a, b, hypotenuse }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `What is $|${complexTex(a, b)}|$?` },
      {
        kind: 'diagram',
        svg: complexPlaneSvg(rangeFor(a, b), [{ re: a, im: b, highlight: true }]),
      },
    ],
    lead: `|${complexTex(a, b)}| =`,
    keypad: SQRT_KEYS,
    answer: `${hypotenuse}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, hypotenuse }) => [
    {
      text: 'The modulus is the distance from the origin, so it is Pythagoras on the two parts.',
      tex: `|${complexTex(a, b)}| = \\sqrt{${a}^2 + ${b}^2}`,
    },
    {
      text: 'Signs disappear when squared, which is why the modulus is never negative.',
      tex: `= \\sqrt{${a * a} + ${b * b}} = \\sqrt{${a * a + b * b}} = ${hypotenuse}`,
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
  // Every distractor is another angle from the same table, so all four options
  // read as plausible arguments rather than as arithmetic slips.
  choices: ({ index }) => {
    const opt = (i: number) => {
      const angle = ANGLES[((i % ANGLES.length) + ANGLES.length) % ANGLES.length];
      return { tex: angle.tex, answer: angle.value };
    };
    return options(opt(index), opt(index + 2), opt(index + 4), opt(index + 6));
  },
  sample: (rng, difficulty) => ({
    index: rng.int(0, ANGLES.length - 1),
    // Scaling changes the number without changing the angle, which is the point.
    scale: difficulty >= 2 ? rng.int(1, 8) : rng.int(1, 5),
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
        { kind: 'diagram', svg: complexPlaneSvg(rangeFor(re, im), [{ re, im, highlight: true }]) },
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
  choices: ({ re, im, n }) => {
    const [ar, ai] = powersOf(re, im, n)[n - 1];
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    return options(
      opt(ar, ai),
      opt(Math.pow(re, n), Math.pow(im, n)),
      opt(ar, -ai),
      opt(-ar, ai),
    );
  },
  sample: (rng, difficulty) => {
    // Bases whose powers stay small enough to type comfortably.
    const base = rng.pick([
      { re: 1, im: 1 }, { re: 1, im: -1 }, { re: -1, im: 1 }, { re: -1, im: -1 },
      { re: 2, im: 0 }, { re: 0, im: 2 }, { re: 1, im: 0 }, { re: 0, im: 1 },
      { re: -2, im: 0 }, { re: 0, im: -2 }, { re: -1, im: 0 }, { re: 3, im: 0 },
    ]);
    return { ...base, n: rng.int(2, difficulty >= 2 ? 7 : 5) };
  },
  render: ({ re, im, n }) => {
    // Repeated multiplication, exact for these integer bases.
    const [ar, ai] = powersOf(re, im, n)[n - 1];
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
  solution: ({ re, im, n }) => [
    { text: 'Multiply out step by step, replacing $i^2$ with $-1$ each time.' },
    // Only the first few steps are worth showing; the pattern is clear by then.
    ...powersOf(re, im, n)
      .map(([ar, ai], idx) => ({ ar, ai, power: idx + 1 }))
      .filter(({ power }) => power <= 3 || power === n)
      .map(({ ar, ai, power }) => ({
        tex: `${bracketedTex(re, im)}^{${power}} = ${complexTex(ar, ai)}`,
      })),
  ],
};

export const planeGenerators = [
  identifyPoint,
  plotPoint,
  modulus,
  argument,
  complexPower,
];
