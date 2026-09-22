/**
 * Complex Numbers, Levels 3 and 4: the plane, modulus, argument and powers.
 */
import type { ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { bin, num, pow, root } from '../expr';
import {
  I_KEY, complexTex, complexAnswer, bracketedTex, powersOf, nonZero,
  surdParts, surdTex, surdAnswer,
} from './format';
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

/* ---------- Plot the conjugate ---------- */

interface ConjugatePlotParams { re: number; im: number }

export const conjugatePlot: Generator<ConjugatePlotParams> = {
  id: 'conjugate-plot',
  // The imaginary part is never zero, or the conjugate is the point itself.
  sample: (rng, difficulty) => ({
    re: difficulty >= 2 ? nonZero(rng, RANGE) : rng.int(1, RANGE),
    im: nonZero(rng, RANGE),
  }),
  render: ({ re, im }) => ({
    kind: 'plot',
    prompt: [{ kind: 'prose', text: `Plot $\\overline{z}$, the conjugate of $z = ${complexTex(re, im)}$.` }],
    range: RANGE,
    answer: { re, im: -im },
  }),
  solution: ({ re, im }) => [
    {
      text: 'The conjugate keeps the real part and flips the imaginary part: reflect $z$ in the real axis.',
      tex: `\\overline{${complexTex(re, im)}} = ${complexTex(re, -im)} \\rightarrow (${re},\\ ${-im})`,
    },
  ],
};

/* ---------- Modulus ---------- */

/**
 * Pythagorean triples as [leg, leg, hypotenuse], so the modulus is a whole
 * number the table states outright.
 *
 * This table now serves `modulus-steps` alone. That slide is a `reduce` over
 * `src/content/expr.ts`, whose `valueOf` rounds every root to a whole number on
 * purpose and whose banks the suite asserts are whole — a bank of surds would
 * turn an order-of-operations question into an arithmetic-with-surds question.
 * A clean triple still earns its place there for exactly that reason: the point
 * of the slide is square, square, add, *then* root, and a whole-number root is
 * what lets the last tap land on a bank of integers.
 *
 * `modulus` no longer reads it. It answers with a surd, computed in integer
 * arithmetic from the two parts, so there is nothing to round back to an
 * integer already known and nothing a table could state more safely.
 */
export const TRIPLES: [number, number, number][] = [
  [3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13],
  [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [9, 12, 15], [12, 9, 15],
  [20, 21, 29], [21, 20, 29], [10, 24, 26], [24, 10, 26], [12, 16, 20],
  [16, 12, 20], [15, 20, 25], [20, 15, 25], [9, 40, 41], [40, 9, 41],
  [16, 30, 34], [30, 16, 34], [18, 24, 30], [24, 18, 30], [12, 35, 37],
  [35, 12, 37], [11, 60, 61], [28, 45, 53],
];

/**
 * Two non-zero parts, never both ±1: (1, 1) is the one pair where the sum of
 * the parts, the never-rooted square and the answer all come to the same
 * number, so its distractors would collide with the answer.
 */
function samplePythagoreanParts(rng: Rng, difficulty: number): { a: number; b: number } {
  const top = difficulty >= 2 ? 8 : 6;
  let a = rng.int(1, top);
  let b = rng.int(1, top);
  while (a === 1 && b === 1) {
    a = rng.int(1, top);
    b = rng.int(1, top);
  }
  if (difficulty >= 2) {
    a *= rng.sign();
    b *= rng.sign();
  }
  return { a, b };
}

/**
 * The three ways a modulus is misread, as options: the parts added instead
 * of squared, the square never rooted, and the parts added and then rooted.
 * Shared by `modulus` and `modulus-distance`, since a distance is a modulus.
 */
function modulusChoices(a: number, b: number): ChoiceOption[] {
  const n = a * a + b * b;
  const sum = Math.abs(a) + Math.abs(b);
  return options(
    { tex: surdTex(n), answer: surdAnswer(n) },
    { tex: `${sum}`, answer: `${sum}` },
    { tex: `${n}`, answer: `${n}` },
    { tex: `\\sqrt{${sum}}`, answer: `sqrt(${sum})` },
  );
}

interface ModulusParams { a: number; b: number }

export const modulus: Generator<ModulusParams> = {
  id: 'modulus',
  choices: ({ a, b }) => modulusChoices(a, b),
  sample: samplePythagoreanParts,
  render: ({ a, b }) => {
    const n = a * a + b * b;
    const simplified = surdAnswer(n);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `What is $|${complexTex(a, b)}|$? Give the exact value — a surd where it is not a whole number.`,
        },
        {
          kind: 'diagram',
          svg: complexPlaneSvg(rangeFor(a, b), [{ re: a, im: b, highlight: true }]),
        },
      ],
      lead: `|${complexTex(a, b)}| =`,
      keypad: SQRT_KEYS,
      answer: `sqrt(${n})`,
      alsoAccepts: simplified === `sqrt(${n})` ? undefined : [simplified],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b }) => {
    const n = a * a + b * b;
    const tail = surdTex(n) === `\\sqrt{${n}}` ? '' : ` = ${surdTex(n)}`;
    return [
      {
        text: 'The modulus is the distance from the origin, so it is Pythagoras on the two parts.',
        tex: `|${complexTex(a, b)}| = \\sqrt{${paren(`${a}`)}^2 + ${paren(`${b}`)}^2}`,
      },
      {
        text: 'Signs disappear when squared, which is why the modulus is never negative.',
        tex: `= \\sqrt{${a * a} + ${b * b}} = \\sqrt{${n}}${tail}`,
      },
      {
        text: surdParts(n).m === 1
          ? 'That happens to be a whole number. Most are not, and a surd is the exact answer — do not turn it into a decimal.'
          : 'A surd is the exact answer and the one to give. It is not a whole number, and nothing is gained by making it one.',
      },
    ];
  },
};

/* ---------- Which of these has this modulus? ---------- */

interface WhichParams { a: number; b: number; v: number }

/**
 * One of eight ways to write a pair of magnitudes as a point: swapped, and
 * each component's sign flipped. The *same* variant is applied to all four
 * options, so no option stands out by its sign pattern — the learner has to
 * square and add rather than read the shape.
 */
function variant(x: number, y: number, v: number): [number, number] {
  const [first, second] = (v & 4) !== 0 ? [y, x] : [x, y];
  return [(v & 1) !== 0 ? -first : first, (v & 2) !== 0 ? -second : second];
}

export const modulusWhich: Generator<WhichParams> = {
  id: 'modulus-which',
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty >= 2 ? 8 : 5),
    b: rng.int(1, difficulty >= 2 ? 8 : 5),
    v: rng.int(0, 7),
  }),
  render: ({ a, b, v }): Slide => {
    const n = a * a + b * b;
    // Each distractor grows one or both magnitudes, so its modulus strictly
    // exceeds the target's and there is never a second right answer.
    const candidates: [number, number][] = [
      variant(a, b, v),
      variant(a + 1, b, v),
      variant(a, b + 1, v),
      variant(a + 1, b + 1, v),
    ];
    const correct = candidates[0];
    // Sorted rather than shuffled, so the same question renders one way and
    // the deck de-duplicator can recognise a repeat.
    const ordered = [...candidates].sort((p, q) =>
      complexTex(p[0], p[1]).localeCompare(complexTex(q[0], q[1])),
    );
    const correctIdx = ordered.findIndex((p) => p[0] === correct[0] && p[1] === correct[1]);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Exactly one of these has modulus $${surdTex(n)}$. Which?` },
      ],
      options: ordered.map((p, idx) => ({
        id: `opt${idx}`,
        label: complexTex(p[0], p[1]),
        tex: true,
      })),
      correctId: `opt${correctIdx}`,
    };
  },
  solution: ({ a, b, v }) => {
    const n = a * a + b * b;
    const candidates: [number, number][] = [
      variant(a, b, v),
      variant(a + 1, b, v),
      variant(a, b + 1, v),
      variant(a + 1, b + 1, v),
    ];
    return [
      ...candidates.map(([x, y]) => ({
        tex: `|${complexTex(x, y)}|^2 = ${paren(`${x}`)}^2 + ${paren(`${y}`)}^2 = ${x * x + y * y}`,
      })),
      {
        text: `Square and add each candidate's parts; only one comes to ${n}. The root keeps the order, so comparing the squares is enough.`,
      },
    ];
  },
};

/* ---------- Which is furthest from the origin? ---------- */

interface CompareParams { points: { re: number; im: number }[] }

export const modulusCompare: Generator<CompareParams> = {
  id: 'modulus-compare',
  // Four points with four *different* moduli, so the largest is unique. The
  // shuffle happens here rather than in `render`, the `complex-part` pattern:
  // one question must render one way or the de-duplicator cannot spot a repeat.
  sample: (rng, difficulty) => {
    const top = difficulty >= 2 ? 7 : 5;
    const grid: { re: number; im: number }[] = [];
    for (let x = 1; x <= top; x += 1) {
      for (let y = 1; y <= top; y += 1) grid.push({ re: x, im: y });
    }
    const seen = new Set<number>();
    const kept: { re: number; im: number }[] = [];
    for (const point of rng.shuffle(grid)) {
      const value = point.re * point.re + point.im * point.im;
      if (seen.has(value)) continue;
      seen.add(value);
      kept.push(point);
      if (kept.length === 4) break;
    }
    return {
      points: difficulty >= 2
        ? kept.map((point) => ({ re: point.re * rng.sign(), im: point.im * rng.sign() }))
        : kept,
    };
  },
  render: ({ points }): Slide => {
    const squares = points.map((p) => p.re * p.re + p.im * p.im);
    const correctIdx = squares.indexOf(Math.max(...squares));
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: 'Which of these is furthest from the origin?' }],
      options: points.map((p, idx) => ({
        id: `opt${idx}`,
        label: complexTex(p.re, p.im),
        tex: true,
      })),
      correctId: `opt${correctIdx}`,
    };
  },
  solution: ({ points }) => [
    ...points.map((p) => ({
      tex: `|${complexTex(p.re, p.im)}|^2 = ${paren(`${p.re}`)}^2 + ${paren(`${p.im}`)}^2 = ${p.re * p.re + p.im * p.im}`,
    })),
    {
      text: 'The largest sum of squares is the largest modulus — no roots needed to compare, because the root keeps the order.',
    },
  ],
};

/* ---------- The distance between two points ---------- */

interface DistanceParams { a: number; b: number; c: number; d: number }

export const modulusDistance: Generator<DistanceParams> = {
  id: 'modulus-distance',
  choices: ({ a, b, c, d }) => modulusChoices(a - c, b - d),
  // Both differences non-zero, so the distance is genuinely two-dimensional,
  // and never the (1, 1) difference whose distractors collide (`modulusChoices`).
  sample: (rng, difficulty) => {
    const draw = () => (difficulty >= 2 ? rng.int(-4, 4) : rng.int(0, 5));
    let a = draw();
    let b = draw();
    let c = draw();
    let d = draw();
    while (a - c === 0 || b - d === 0 || (Math.abs(a - c) === 1 && Math.abs(b - d) === 1)) {
      a = draw();
      b = draw();
      c = draw();
      d = draw();
    }
    return { a, b, c, d };
  },
  render: ({ a, b, c, d }) => {
    const dx = a - c;
    const dy = b - d;
    const n = dx * dx + dy * dy;
    const simplified = surdAnswer(n);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$z = ${complexTex(a, b)}$ and $w = ${complexTex(c, d)}$ are marked. How far apart are they? That distance is $|z - w|$.`,
        },
        {
          kind: 'diagram',
          svg: complexPlaneSvg(rangeFor(a, b, c, d), [
            { re: a, im: b, highlight: true },
            { re: c, im: d, highlight: true },
          ]),
        },
      ],
      lead: '|z - w| =',
      keypad: SQRT_KEYS,
      answer: `sqrt(${n})`,
      alsoAccepts: simplified === `sqrt(${n})` ? undefined : [simplified],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, c, d }) => {
    const dx = a - c;
    const dy = b - d;
    const n = dx * dx + dy * dy;
    const tail = surdTex(n) === `\\sqrt{${n}}` ? '' : ` = ${surdTex(n)}`;
    return [
      {
        text: 'Subtract first: $z - w$ is the arrow from $w$ to $z$.',
        tex: `z - w = ${complexTex(dx, dy)}`,
      },
      {
        text: 'Then its modulus, which is Pythagoras on the difference.',
        tex: `|z - w| = \\sqrt{${paren(`${dx}`)}^2 + ${paren(`${dy}`)}^2} = \\sqrt{${n}}${tail}`,
      },
      {
        text: 'Subtracting the other way round gives $w - z$, the same distance: the modulus does not care which end you start from.',
      },
    ];
  },
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

/* ---------- Square roots ---------- */

interface SqrtParams { p: number; q: number }

/**
 * The square root of `z = (p + qi)^2 = (p^2 - q^2) + 2pq*i` with positive real
 * part, found the way the lesson teaches it: match real and imaginary parts,
 * then use `a^2 + b^2 = |z|` as a third equation.
 */
export const complexSqrt: Generator<SqrtParams> = {
  id: 'complex-sqrt',
  // Sign of the imaginary part, the magnitudes swapped (the two equations
  // added and subtracted the wrong way round), and the other root.
  choices: ({ p, q }) => {
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    return options(opt(p, q), opt(p, -q), opt(Math.abs(q), Math.sign(q) * p), opt(-p, -q));
  },
  sample: (rng, difficulty) => ({
    p: rng.int(1, difficulty >= 2 ? 7 : 5),
    q: nonZero(rng, difficulty >= 2 ? 6 : 3),
  }),
  render: ({ p, q }) => {
    const x = p * p - q * q;
    const y = 2 * p * q;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Find the square root of $z$ that has a positive real part.' },
        { kind: 'display', tex: `z = ${complexTex(x, y)}` },
      ],
      lead: '\\sqrt{z} =',
      keypad: I_KEY,
      // A square-root question, not a derivative: no `source` here for the
      // oracle test to differentiate against.
      answer: complexAnswer(p, q),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: ({ p, q }) => {
    const x = p * p - q * q;
    const y = 2 * p * q;
    // Exactly |z|, since x^2 + y^2 = (p^2 + q^2)^2 — which is why every
    // number in the working below is whole.
    const mod = p * p + q * q;
    return [
      {
        text: 'Let $\\sqrt{z} = a + bi$ with $a$ and $b$ real, square it, and match real parts and imaginary parts.',
        tex: `(a + bi)^2 = a^2 - b^2 + 2ab\\,i \\quad\\Rightarrow\\quad a^2 - b^2 = ${x}, \\quad 2ab = ${y}`,
      },
      {
        text: 'Squaring a number squares its modulus, so $a^2 + b^2 = |z|$ — a third equation for free.',
        tex: `a^2 + b^2 = \\sqrt{${paren(`${x}`)}^2 + ${paren(`${y}`)}^2} = \\sqrt{${x * x + y * y}} = ${mod}`,
      },
      {
        text: 'Add and subtract the first and third equations.',
        tex: `a^2 = \\tfrac{${mod} + ${paren(`${x}`)}}{2} = ${p * p}, \\qquad b^2 = \\tfrac{${mod} - ${paren(`${x}`)}}{2} = ${q * q}`,
      },
      {
        text: `$2ab = ${y}$ is ${y > 0 ? 'positive, so $a$ and $b$ have the same sign' : 'negative, so $a$ and $b$ have opposite signs'}. Taking $a > 0$:`,
        tex: `\\sqrt{z} = ${complexTex(p, q)}, \\quad\\text{and the other root is}\\quad ${complexTex(-p, -q)}`,
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

/* ---------- De Moivre: powers in modulus-argument form ---------- */

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** m·π/d in lowest terms, as the learner reads it. Canonical: equal values give equal strings. */
function angleTex(m: number, d: number): string {
  if (m === 0) return '0';
  const g = gcd(m, d);
  const num = Math.abs(m) / g;
  const den = d / g;
  const top = num === 1 ? '\\pi' : `${num}\\pi`;
  return `${m < 0 ? '-' : ''}${den === 1 ? top : `\\tfrac{${top}}{${den}}`}`;
}

/** The same angle for mathjs; `-2*pi/3`, `3*pi/1` and `0` all parse. */
function angleAnswer(m: number, d: number): string {
  if (m === 0) return '0';
  const g = gcd(m, d);
  return `${m / g}*pi/${d / g}`;
}

/** m·π/d brought into (−π, π] by removing whole turns; returns the new numerator over the same d. */
function principal(m: number, d: number): number {
  const turn = 2 * d;
  let r = ((m % turn) + turn) % turn;
  if (r > d) r -= turn;
  return r;
}

const POLAR_ANGLES: { k: number; d: number }[] = [
  { k: 1, d: 6 }, { k: 1, d: 4 }, { k: 1, d: 3 }, { k: 1, d: 2 }, { k: 2, d: 3 }, { k: 3, d: 4 }, { k: 5, d: 6 }, { k: 1, d: 1 },
  { k: -1, d: 6 }, { k: -1, d: 4 }, { k: -1, d: 3 }, { k: -1, d: 2 }, { k: -2, d: 3 }, { k: -3, d: 4 }, { k: -5, d: 6 },
];

interface PolarPowerParams { r: number; index: number; n: number; ask: 'modulus' | 'argument' }

export const polarPower: Generator<PolarPowerParams> = {
  id: 'polar-power',
  choices: ({ r, index, n, ask }) => {
    const { k, d } = POLAR_ANGLES[index];
    const m = principal(n * k, d);
    if (ask === 'modulus') {
      // Multiplied instead of powered, one power short, one power over.
      const num = (v: number) => ({ tex: `${v}`, answer: `${v}` });
      return options(num(r ** n), num(n * r), num(r ** (n - 1)), num(r ** (n + 1)));
    }
    // The angle left unreduced, the argument not multiplied at all, the sign
    // flipped, and off by one multiple in each direction. The last is needed
    // because "off by one multiple" alone can collapse: at theta = pi/2,
    // n = 2, the unreduced/sign-flipped/n-1 candidates all coincide with
    // either the correct answer or each other, leaving only two options.
    // n+1 can never coincide with the correct answer: principal((n+1)k, d)
    // === principal(nk, d) would require k to be a multiple of 2d, which no
    // POLAR_ANGLES row's |k| <= d allows.
    const ang = (mm: number) => ({ tex: angleTex(mm, d), answer: angleAnswer(mm, d) });
    return options(
      ang(m),
      ang(n * k),
      ang(principal(k, d)),
      ang(principal(-m, d)),
      ang(principal((n - 1) * k, d)),
      ang(principal((n + 1) * k, d)),
    );
  },
  sample: (rng, difficulty) => {
    const ask = rng.pick(['modulus', 'argument'] as const);
    // Modulus 1 makes |z^n| = 1 trivial, so it is excluded on that branch only.
    const r = ask === 'modulus' ? rng.int(2, 3) : rng.int(1, 3);
    const index = rng.int(0, POLAR_ANGLES.length - 1);
    const n = rng.int(2, difficulty >= 2 ? 6 : 4);
    return { r, index, n, ask };
  },
  render: ({ r, index, n, ask }) => {
    const { k, d } = POLAR_ANGLES[index];
    const m = principal(n * k, d);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `A complex number $z$ has modulus $${r}$ and argument $${angleTex(k, d)}$.` },
        {
          kind: 'prose',
          text: ask === 'modulus'
            ? `What is $|z^{${n}}|$?`
            : `What is the principal argument of $z^{${n}}$, between $-\\pi$ and $\\pi$?`,
        },
      ],
      lead: ask === 'modulus' ? `|z^{${n}}| =` : `\\arg\\left(z^{${n}}\\right) =`,
      keypad: ANGLE_KEYS,
      // A power question, not a derivative: no `source` here for the oracle
      // test to differentiate against.
      answer: ask === 'modulus' ? `${r ** n}` : angleAnswer(m, d),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ r, index, n }) => {
    const { k, d } = POLAR_ANGLES[index];
    const m = principal(n * k, d);
    const unreduced = angleTex(n * k, d);
    const reduced = angleTex(m, d);
    const steps: SolutionStep[] = [
      {
        text: "De Moivre's theorem: raising to the power $n$ raises the modulus to the power $n$ and multiplies the argument by $n$.",
        tex: `|z^{${n}}| = |z|^{${n}} = ${r}^{${n}} = ${r ** n}`,
      },
      {
        tex: `\\arg\\left(z^{${n}}\\right) = ${n} \\times ${paren(angleTex(k, d))} = ${unreduced}`,
      },
    ];
    if (unreduced !== reduced) {
      const j = (n * k - m) / (2 * d);
      steps.push({
        text: 'That is outside $(-\\pi, \\pi]$, so remove whole turns of $2\\pi$ until it lands inside — the direction is unchanged, only the label.',
        tex: `${unreduced} ${j > 0 ? '-' : '+'} ${Math.abs(j) === 1 ? '' : `${Math.abs(j)} \\times `}2\\pi = ${reduced}`,
      });
    } else {
      steps.push({
        text: 'That is already between $-\\pi$ and $\\pi$, so it is the principal argument as it stands.',
      });
    }
    steps.push({ text: `So $|z^{${n}}| = ${r ** n}$ and $\\arg(z^{${n}}) = ${reduced}$.` });
    return steps;
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

/* ---------- The modulus of a power ---------- */

interface PowerModulusParams { a: number; b: number; k: number }

/**
 * De Moivre applied to the modulus alone, so the argument never has to be
 * found. `|z|` is a surd, and raising a surd to a power is `surdTex` of the
 * powered radicand: the largest reachable value is 32^5, well inside integer
 * range, so nothing here is a rounded float.
 */
export const powerModulus: Generator<PowerModulusParams> = {
  id: 'power-modulus',
  choices: ({ a, b, k }) => {
    const n0 = a * a + b * b;
    // Multiplied instead of powered (k times root n0 is root of k^2 n0), one
    // power short, and never rooted at all.
    return options(
      { tex: surdTex(n0 ** k), answer: surdAnswer(n0 ** k) },
      { tex: surdTex(k * k * n0), answer: surdAnswer(k * k * n0) },
      { tex: surdTex(n0 ** (k - 1)), answer: surdAnswer(n0 ** (k - 1)) },
      { tex: `${n0 ** k}`, answer: `${n0 ** k}` },
    );
  },
  sample: (rng, difficulty) => ({
    a: rng.int(1, 4) * (difficulty >= 2 ? rng.sign() : 1),
    b: rng.int(1, 4) * (difficulty >= 2 ? rng.sign() : 1),
    k: rng.int(2, difficulty >= 2 ? 5 : 3),
  }),
  render: ({ a, b, k }) => {
    const n0 = a * a + b * b;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `$z = ${complexTex(a, b)}$. What is $|z^{${k}}|$?` },
      ],
      lead: `|z^{${k}}| =`,
      keypad: SQRT_KEYS,
      answer: surdAnswer(n0 ** k),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, k }) => {
    const n0 = a * a + b * b;
    return [
      { tex: `|z| = \\sqrt{${a * a} + ${b * b}} = ${surdTex(n0)}` },
      {
        text: 'De Moivre for the modulus alone: a power raises the modulus to that power, and the argument is not needed for this question.',
        tex: `|z^{${k}}| = |z|^{${k}} = \\left(${surdTex(n0)}\\right)^{${k}} = ${surdTex(n0 ** k)}`,
      },
      {
        text: `Multiplying the modulus by the power, instead of raising it, is the slip — that would be $${surdTex(k * k * n0)}$.`,
      },
    ];
  },
};

/* ---------- Which z has z^n = w? ---------- */

/** Every a + bi with a, b in -2..2 except 0: small enough that any power is checkable by hand. */
const REVERSE_BASES: { re: number; im: number }[] = [];
for (let re = -2; re <= 2; re += 1) {
  for (let im = -2; im <= 2; im += 1) {
    if (re !== 0 || im !== 0) REVERSE_BASES.push({ re, im });
  }
}

interface ReverseParams {
  re: number;
  im: number;
  n: number;
  distractors: { re: number; im: number }[];
}

export const powerReverse: Generator<ReverseParams> = {
  id: 'power-reverse',
  sample: (rng, difficulty) => {
    const n = difficulty >= 2 ? rng.int(2, 4) : 2;
    const base = rng.pick(REVERSE_BASES);
    const target = powersOf(base.re, base.im, n)[n - 1];
    // Filtered by *value*, not by identity: at even n the base -z has the same
    // n-th power, and at n = 4 so do +-iz. Offering one of those would make a
    // second right answer, which no existing guard can see.
    const eligible = REVERSE_BASES.filter((c) => { const p = powersOf(c.re, c.im, n)[n - 1]; return p[0] !== target[0] || p[1] !== target[1]; });
    return { ...base, n, distractors: rng.sample(eligible, 3) };
  },
  render: ({ re, im, n, distractors }): Slide => {
    const [tr, ti] = powersOf(re, im, n)[n - 1];
    const candidates = [{ re, im }, ...distractors];
    // Sorted rather than shuffled, so the same question renders one way and
    // the deck de-duplicator can recognise a repeat.
    const ordered = [...candidates].sort((p, q) =>
      complexTex(p.re, p.im).localeCompare(complexTex(q.re, q.im)),
    );
    const correctIdx = ordered.findIndex((p) => p.re === re && p.im === im);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Exactly one of these satisfies $z^{${n}} = w$. Which?` },
        { kind: 'display', tex: `w = ${complexTex(tr, ti)}` },
      ],
      options: ordered.map((p, idx) => ({
        id: `opt${idx}`,
        label: complexTex(p.re, p.im),
        tex: true,
      })),
      correctId: `opt${correctIdx}`,
    };
  },
  solution: ({ re, im, n, distractors }) => {
    const [tr, ti] = powersOf(re, im, n)[n - 1];
    return [
      { text: 'Raising each candidate is the check; only one lands on $w$.' },
      ...powersOf(re, im, n)
        .map((value, idx) => ({ value, power: idx + 1 }))
        .filter(({ power }) => power <= 3 || power === n)
        .map(({ value, power }) => ({
          tex: `${bracketedTex(re, im)}^{${power}} = ${complexTex(value[0], value[1])}`,
        })),
      ...distractors.map((c) => {
        const p = powersOf(c.re, c.im, n)[n - 1];
        return { tex: `${bracketedTex(c.re, c.im)}^{${n}} = ${complexTex(p[0], p[1])}` };
      }),
      {
        text: n === 2
          ? `So $w = ${complexTex(tr, ti)}$ comes from $${complexTex(re, im)}$. The other square root of $w$ is $${complexTex(-re, -im)}$, which is not offered.`
          : `So $w = ${complexTex(tr, ti)}$ comes from $${complexTex(re, im)}$ and from none of the others.`,
      },
    ];
  },
};

export const planeGenerators = [
  identifyPoint,
  plotPoint,
  conjugatePlot,
  modulus,
  modulusSteps,
  modulusWhich,
  modulusCompare,
  modulusDistance,
  argument,
  complexPower,
  powerModulus,
  powerReverse,
  polarForm,
  polarPower,
  complexSqrt,
];
