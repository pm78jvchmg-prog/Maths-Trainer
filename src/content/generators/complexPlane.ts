/**
 * Complex Numbers, Levels 3 and 4: the plane, modulus, argument and powers.
 */
import type { ChoiceOption, Generator, KeypadKey, Slide } from '../types';
import type { Rng } from '../../engine/rng';
import { bin, num, pow, root } from '../expr';
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

/** Wraps a TeX fragment that starts with a minus sign, so it survives being multiplied or squared. */
const paren = (tex: string): string => (tex.startsWith('-') ? `\\left(${tex}\\right)` : tex);

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

interface ModulusStepsParams { a: number; b: number; c: number }

/** Every row of `TRIPLES`, so the answer is the same whole number it would be there. */
const MODULUS_STEPS_TRIPLES: ModulusStepsParams[] = TRIPLES.map(([a, b, c]) => ({ a, b, c }));

/**
 * The modulus, reduced one piece at a time.
 *
 * The same shape as `vec-magnitude-steps` in the vectors course: a root is a
 * bracket, so everything underneath — both squares and their sum — has to be
 * settled before the root itself can be taken. The usual slip is rooting the
 * two squares separately and adding, $\sqrt{a^2} + \sqrt{b^2} = a + b$, which
 * the tree makes impossible to reach by accident, because the root node is
 * only offered once its argument has collapsed to a single number.
 *
 * `TRIPLES` rows are always positive, and that is relied on here: `toTex`
 * renders a numeric power's base bare, with no bracket, so a negative base
 * would come out as the literal TeX `-3^{2}`, which reads as $-9$.
 */
const modulusSteps: Generator<ModulusStepsParams> = {
  id: 'modulus-steps',
  // The same slips as with no working shown: rooting separately, forgetting
  // the root, and doubling the sum instead of squaring each part.
  choices: ({ a, b, c }) => {
    const wrong = [a + b, a * a + b * b, 2 * (a + b)];
    const seen = new Set([c]);
    const picked: number[] = [];
    for (const value of wrong) {
      if (picked.length === 3) break;
      if (!Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
      seen.add(value);
      picked.push(value);
    }
    for (let step = 1; picked.length < 3; step += 1) {
      for (const candidate of [c + step, c - step]) {
        if (picked.length === 3) break;
        if (candidate <= 0 || seen.has(candidate)) continue;
        seen.add(candidate);
        picked.push(candidate);
      }
    }
    return options(
      { tex: `${c}` },
      ...picked.sort((x, y) => x - y).map((value) => ({ tex: `${value}` })),
    );
  },
  sample: (rng) => rng.pick(MODULUS_STEPS_TRIPLES),
  render: ({ a, b, c }): Slide => {
    const expr = root(bin('+', pow(num(a), num(2)), pow(num(b), num(2))));
    const aSq = a * a;
    const bSq = b * b;
    const sum = aSq + bSq;

    /** Four whole-number options: the right one, then the nearest slips. */
    const offer = (correct: number, ...near: number[]) => {
      const seen = new Set<number>([correct]);
      const out = [correct];
      for (const value of near) {
        if (out.length >= 4) break;
        if (!Number.isInteger(value) || value < 0 || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
      }
      for (let step = 1; out.length < 4; step += 1) {
        for (const candidate of [correct + step, correct - step]) {
          if (out.length >= 4) break;
          if (candidate < 0 || seen.has(candidate)) continue;
          seen.add(candidate);
          out.push(candidate);
        }
      }
      return out.sort((x, y) => x - y).map(String);
    };

    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'Find the modulus, one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
        { kind: 'display', tex: `\\left| ${complexTex(a, b)} \\right|` },
      ],
      expr,
      banks: {
        // a^2: doubling instead of squaring is the slip.
        'r.a.l': offer(aSq, 2 * a, a, aSq + 2),
        // b^2, the same slip on the other component.
        'r.a.r': offer(bSq, 2 * b, b, bSq + 2),
        // The sum under the root: squaring the sum instead of summing the
        // squares, and the difference of the two squares.
        'r.a': offer(sum, (a + b) * (a + b), a + b, Math.abs(aSq - bSq)),
        // The root itself: rooting the two squares separately, or forgetting
        // the root altogether.
        r: offer(c, a + b, sum, 2 * (a + b)),
      },
    };
  },
  solution: ({ a, b, c }) => {
    const aSq = a * a;
    const bSq = b * b;
    const sum = aSq + bSq;
    return [
      {
        text: 'A root is a bracket: everything underneath it has to be settled before the root itself can be taken.',
      },
      {
        tex: `\\left| ${complexTex(a, b)} \\right| = \\sqrt{${a}^{2} + ${b}^{2}} = \\sqrt{${aSq} + ${bSq}}`,
      },
      { tex: `= \\sqrt{${sum}} = ${c}` },
      {
        text: `Rooting the two squares separately and adding would give $${a} + ${b} = ${a + b}$ — close enough to look plausible, and wrong, because $\\sqrt{x} + \\sqrt{y}$ is not $\\sqrt{x + y}$.`,
      },
    ];
  },
};

/* ---------- Argument ---------- */

/**
 * Points whose argument is a clean multiple of pi/4, plus the axes.
 *
 * `cosTex`/`sinTex` are the cosine and sine of the angle, as the learner
 * reads them — used by `polar-form` to build a modulus-argument display and
 * its worked solution. `argument` ignores both fields.
 */
const ANGLES: { re: number; im: number; tex: string; value: string; cosTex: string; sinTex: string }[] = [
  { re: 1, im: 0, tex: '0', value: '0', cosTex: '1', sinTex: '0' },
  { re: 1, im: 1, tex: '\\tfrac{\\pi}{4}', value: 'pi/4', cosTex: '\\tfrac{1}{\\sqrt{2}}', sinTex: '\\tfrac{1}{\\sqrt{2}}' },
  { re: 0, im: 1, tex: '\\tfrac{\\pi}{2}', value: 'pi/2', cosTex: '0', sinTex: '1' },
  { re: -1, im: 1, tex: '\\tfrac{3\\pi}{4}', value: '3*pi/4', cosTex: '-\\tfrac{1}{\\sqrt{2}}', sinTex: '\\tfrac{1}{\\sqrt{2}}' },
  { re: -1, im: 0, tex: '\\pi', value: 'pi', cosTex: '-1', sinTex: '0' },
  { re: -1, im: -1, tex: '-\\tfrac{3\\pi}{4}', value: '-3*pi/4', cosTex: '-\\tfrac{1}{\\sqrt{2}}', sinTex: '-\\tfrac{1}{\\sqrt{2}}' },
  { re: 0, im: -1, tex: '-\\tfrac{\\pi}{2}', value: '-pi/2', cosTex: '0', sinTex: '-1' },
  { re: 1, im: -1, tex: '-\\tfrac{\\pi}{4}', value: '-pi/4', cosTex: '\\tfrac{1}{\\sqrt{2}}', sinTex: '-\\tfrac{1}{\\sqrt{2}}' },
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

/* ---------- Modulus-argument form ---------- */

interface PolarParams { index: number; scale: number; direction: 'toCartesian' | 'toPolar' }

/** The derived quantities every render/choices/solution branch needs. */
function polarParts(params: PolarParams) {
  const { index, scale } = params;
  const angle = ANGLES[index];
  const re = angle.re * scale;
  const im = angle.im * scale;
  const diagonal = angle.re !== 0 && angle.im !== 0;
  const rTex = diagonal ? `${scale === 1 ? '' : scale}\\sqrt{2}` : `${scale}`;
  const rAnswer = diagonal ? `${scale}*sqrt(2)` : `${scale}`;
  // The other kind's modulus rule, applied where it does not belong.
  const rWrongTex = diagonal ? `${2 * scale}` : `${scale === 1 ? '' : scale}\\sqrt{2}`;
  const rWrongAnswer = diagonal ? `${2 * scale}` : `${scale}*sqrt(2)`;
  return { angle, re, im, diagonal, rTex, rAnswer, rWrongTex, rWrongAnswer };
}

/** "r(\cos\theta + i\sin\theta)", as the learner reads it. */
function polarTex(r: string, a: { tex: string }): string {
  return `${r}\\left(\\cos ${paren(a.tex)} + i\\sin ${paren(a.tex)}\\right)`;
}

/** The same value in a form mathjs parses without ambiguity. */
function polarAnswer(r: string, a: { value: string }): string {
  return `${r}*(cos(${a.value}) + i*sin(${a.value}))`;
}

/** The four options shared by the native choice render and the derived `+choice` form. */
function polarOptions(params: PolarParams): ChoiceOption[] {
  const { index, direction } = params;
  const { angle, re, im, rTex, rAnswer, rWrongTex, rWrongAnswer } = polarParts(params);
  if (direction === 'toCartesian') {
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    return options(opt(re, im), opt(im, re), opt(re, -im), opt(-re, im));
  }
  // Two different directions at the right modulus, and the right direction at
  // the wrong modulus: every distractor is a genuinely different point.
  const at = (i: number) => ANGLES[((i % ANGLES.length) + ANGLES.length) % ANGLES.length];
  return options(
    { tex: polarTex(rTex, angle), answer: polarAnswer(rAnswer, angle) },
    { tex: polarTex(rTex, at(index + 2)), answer: polarAnswer(rAnswer, at(index + 2)) },
    { tex: polarTex(rTex, at(index + 4)), answer: polarAnswer(rAnswer, at(index + 4)) },
    { tex: polarTex(rWrongTex, angle), answer: polarAnswer(rWrongAnswer, angle) },
  );
}

export const polarForm: Generator<PolarParams> = {
  id: 'polar-form',
  choices: (params) => polarOptions(params),
  sample: (rng, difficulty) => ({
    // Row 0 (theta = 0) is excluded: a degenerate "r(\cos 0 + i\sin 0)" question.
    index: rng.int(1, 7),
    scale: rng.int(1, difficulty >= 2 ? 8 : 5),
    direction: difficulty >= 2 && rng.chance(0.5) ? 'toPolar' : 'toCartesian',
  }),
  render: (params): Slide => {
    const { angle, re, im, rTex } = polarParts(params);
    if (params.direction === 'toCartesian') {
      return {
        kind: 'expression',
        prompt: [
          { kind: 'prose', text: 'Write this number in the form $a + bi$.' },
          { kind: 'display', tex: `z = ${polarTex(rTex, angle)}` },
        ],
        lead: 'z =',
        keypad: I_KEY,
        answer: complexAnswer(re, im),
        domain: 'complex',
        mode: 'exact',
      };
    }
    // Sorted rather than shuffled, so the same question renders one way and
    // the deck de-duplicator can recognise a repeat.
    const ordered = [...polarOptions(params)].sort((a, b) => a.tex.localeCompare(b.tex));
    const correctIdx = ordered.findIndex((option) => option.correct);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Write $z$ in modulus-argument form $r(\\cos\\theta + i\\sin\\theta)$, with $-\\pi < \\theta \\leq \\pi$.' },
        { kind: 'display', tex: `z = ${complexTex(re, im)}` },
        { kind: 'diagram', svg: complexPlaneSvg(rangeFor(re, im), [{ re, im, highlight: true }]) },
      ],
      options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex: true })),
      correctId: `opt${correctIdx}`,
    };
  },
  solution: (params) => {
    const { angle, re, im, rTex } = polarParts(params);
    if (params.direction === 'toCartesian') {
      return [
        {
          text: 'Read off the cosine and sine of the angle.',
          tex: `\\cos ${paren(angle.tex)} = ${angle.cosTex}, \\quad \\sin ${paren(angle.tex)} = ${angle.sinTex}`,
        },
        {
          text: 'Multiply each by the modulus. On a diagonal the $\\sqrt{2}$ cancels.',
          tex: `${rTex} \\times ${paren(angle.cosTex)} = ${re}, \\quad ${rTex} \\times ${paren(angle.sinTex)} = ${im}`,
        },
        { tex: `z = ${complexTex(re, im)}` },
      ];
    }
    return [
      { text: 'The modulus is the distance from the origin.', tex: `|z| = \\sqrt{${re * re + im * im}} = ${rTex}` },
      {
        text: 'The argument comes from the sketch: which quadrant, then which of the standard angles.',
        tex: `\\arg z = ${angle.tex}`,
      },
      { tex: `z = ${polarTex(rTex, angle)}` },
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
  modulusSteps,
  argument,
  complexPower,
  polarForm,
];
