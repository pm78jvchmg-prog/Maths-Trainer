/**
 * Complex Numbers, Levels 3 and 4: the plane, modulus, argument and powers.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { hashSeed, type Rng } from '../../engine/rng';
import { bin, num, pow, root } from '../expr';
import {
  I_KEY, coeffTex, complexTex, complexAnswer, bracketedTex, distinct, gcd, powersOf, nonZero,
  surdParts, surdTex, surdAnswer,
} from './format';
import { PLANE_VIEWBOX, complexPlaneSvg, planeGridSvg, pointPosition, rangeFor } from './plane';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { TRIG_KEYS as CALCULUS_TRIG_KEYS } from './calculus';

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
/**
 * The keypad for a typed modulus.
 *
 * `^` is here because the owner met `|24 + 10i|` and wanted to answer
 * `sqrt(24^2 + 10^2)` — the working, not its value. The checker already accepts
 * that (it probes numerically, so any writing that evaluates to 26 is correct);
 * only the keypad could not produce it. Typing `√( 2 4 ^ 2 → + 1 0 ^ 2`
 * serialises to `sqrt(24^(2)+10^(2))`, which grades correct.
 *
 * `)` is gone. `sqrt(` is a template that closes itself (`applyKey`,
 * `src/ui/slides.tsx`), and no key on this pad opens a bracket, so the only
 * thing `)` could ever add was a stray one — `sqrt(13))`, which grades
 * `invalid`. It mattered little while every modulus answered a whole number
 * and the root was decorative; it matters now that most answers are surds.
 */
const SQRT_KEYS: KeypadKey[] = [
  { insert: 'sqrt(', label: '√(' },
  { insert: '^' },
];

/** Wraps a TeX fragment that starts with a minus sign, so it survives being multiplied or squared. */
const paren = (tex: string): string => (tex.startsWith('-') ? `\\left(${tex}\\right)` : tex);

/* ---------- Read a point off the plane ---------- */

interface PointParams { re: number; im: number }

export const identifyPoint: Generator<PointParams> = {
  id: 'identify-point',
  // The parts swapped, and each sign lost. When a part is zero (difficulty 2
  // only) or the two are equal, a distractor's label collapses onto the
  // answer's and `options()` drops it, leaving three — which is fine.
  choices: ({ re, im }) => {
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    return options(opt(re, im), opt(im, re), opt(-re, im), opt(re, -im));
  },
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

/* ---------- Plot a sum ---------- */

interface PlotSumParams { a: number; b: number; c: number; d: number }

/**
 * Addition as two moves on the plane, which the third teach slide of the plane
 * lesson has always drawn and never asked. Both components are redrawn until
 * the sum stays on the grid the widget draws.
 */
export const plotSum: Generator<PlotSumParams> = {
  id: 'plot-sum',
  sample: (rng, difficulty) => {
    if (difficulty >= 2) {
      let a = nonZero(rng, 3);
      let b = nonZero(rng, 3);
      let c = nonZero(rng, 3);
      let d = nonZero(rng, 3);
      while (Math.abs(a + c) > RANGE || Math.abs(b + d) > RANGE || (a + c === 0 && b + d === 0)) {
        a = nonZero(rng, 3);
        b = nonZero(rng, 3);
        c = nonZero(rng, 3);
        d = nonZero(rng, 3);
      }
      return { a, b, c, d };
    }
    let a = rng.int(1, 3);
    let b = rng.int(1, 3);
    let c = rng.int(1, 3);
    let d = rng.int(1, 3);
    while (a + c > RANGE || b + d > RANGE) {
      a = rng.int(1, 3);
      b = rng.int(1, 3);
      c = rng.int(1, 3);
      d = rng.int(1, 3);
    }
    return { a, b, c, d };
  },
  render: ({ a, b, c, d }) => ({
    kind: 'plot',
    prompt: [
      {
        kind: 'prose',
        text: `Plot $z + w$, where $z = ${complexTex(a, b)}$ and $w = ${complexTex(c, d)}$.`,
      },
    ],
    range: RANGE,
    answer: { re: a + c, im: b + d },
  }),
  solution: ({ a, b, c, d }) => [
    {
      text: 'Add the real parts and the imaginary parts.',
      tex: `(${complexTex(a, b)}) + (${complexTex(c, d)}) = ${complexTex(a + c, b + d)}`,
    },
    {
      text: `On the plane: go to $z$, then move by $w$ — ${Math.abs(c)} ${c < 0 ? 'left' : 'right'} and ${Math.abs(d)} ${d < 0 ? 'down' : 'up'} — and the two routes to the same point are addition being commutative, drawn.`,
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
    // Through surdTex, not as a raw \sqrt{}: the sum is often a perfect square,
    // and an option reading `\sqrt{4}` is both a throwaway and a form tell,
    // since the answer would then be the only surd in lowest terms. It cannot
    // collide with the other three: sqrt(sum) = sqrt(n) only at (1, 1), which
    // the sampler excludes, and sqrt(sum) equals sum or n only below 2.
    { tex: surdTex(sum), answer: surdAnswer(sum) },
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
          // A noun phrase, not an instruction to type: `promptFrom` lifts this
          // prose whole into the derived `+choice` slide, where there is nothing
          // to write and "give the exact value" would be telling the learner to
          // do something the widget does not offer.
          text: `What is $|${complexTex(a, b)}|$? The exact value — a surd where it is not a whole number.`,
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

interface WhichParams { a: number; b: number; v: number; o: number }

/**
 * Perturbations of the two magnitudes, mixed in direction.
 *
 * All-positive offsets would make the correct option the component-wise
 * smallest of the four on every draw, so the question would be winnable by
 * "pick the option with the smallest numbers" without squaring anything — and
 * because the options are sorted by their TeX, which differs in the leading
 * digit, that monotonicity also pinned the answer to the first two rows. With
 * both directions in play neither holds. Any offset is safe: a candidate is
 * kept only when its sum of squares is one not already used, so exactly one
 * option ever has the target modulus.
 */
const WHICH_OFFSETS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [0, 2],
];

/** Three magnitude pairs near (a, b), none of them with the same modulus. */
function whichDistractors(a: number, b: number, o: number): [number, number][] {
  const kept: [number, number][] = [];
  const seen = new Set([a * a + b * b]);
  for (let step = 0; step < WHICH_OFFSETS.length && kept.length < 3; step += 1) {
    const [dx, dy] = WHICH_OFFSETS[(o + step) % WHICH_OFFSETS.length];
    const x = a + dx;
    const y = b + dy;
    if (x < 1 || y < 1) continue;
    const square = x * x + y * y;
    if (seen.has(square)) continue;
    seen.add(square);
    kept.push([x, y]);
  }
  return kept;
}

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
  // Magnitudes start at 2 so that a -1 offset is always usable, which is what
  // keeps the distractors on both sides of the answer.
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty >= 2 ? 8 : 5),
    b: rng.int(2, difficulty >= 2 ? 8 : 5),
    v: rng.int(0, 7),
    o: rng.int(0, WHICH_OFFSETS.length - 1),
  }),
  render: ({ a, b, v, o }): Slide => {
    const n = a * a + b * b;
    // Every distractor's sum of squares differs from the target's, so there is
    // never a second right answer — but it may be larger or smaller.
    const candidates: [number, number][] = [
      variant(a, b, v),
      ...whichDistractors(a, b, o).map(([x, y]) => variant(x, y, v)),
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
  solution: ({ a, b, v, o }) => {
    const n = a * a + b * b;
    const candidates: [number, number][] = [
      variant(a, b, v),
      ...whichDistractors(a, b, o).map(([x, y]) => variant(x, y, v)),
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
  /**
   * The figures are capped deliberately. With parts up to 4 and k up to 5 the
   * worst draw asks for |z^5| where |z|^2 = 32 — the answer is 4096*sqrt(2) and
   * the never-rooted distractor reads 33554432, which is the owner's original
   * complaint about (35^2 + 12^2)^(1/2) made worse rather than answered.
   * Difficulty 2 is harder through the signs and one more power, not through
   * bigger arithmetic; the worst answer is now 324 or 54*sqrt(2).
   */
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty >= 2 ? 3 : 4) * (difficulty >= 2 ? rng.sign() : 1),
    b: rng.int(1, difficulty >= 2 ? 3 : 4) * (difficulty >= 2 ? rng.sign() : 1),
    k: rng.int(2, difficulty >= 2 ? 4 : 3),
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

/* ---------- Which quadrant? ---------- */

interface QuadrantParams { re: number; im: number }

/**
 * Where a number sits, decided from the signs alone.
 *
 * This is the step the argument questions skip over. `\arctan(b/a)` gives the
 * same number for a point and for its opposite, so which quadrant the point is
 * in is what decides whether the answer needs $\pi$ adding to it — and a
 * learner who has only met the formula loses half the plane.
 *
 * Walking the fork twice, once per component, is the habit worth building;
 * a `choice` slide offering four quadrants would be a one-in-four guess with
 * no reason attached.
 */
export const quadrant: Generator<QuadrantParams> = {
  id: 'quadrant',
  sample: (rng, difficulty) => {
    const span = difficulty >= 2 ? 9 : 6;
    return { re: nonZero(rng, span), im: nonZero(rng, span) };
  },
  render: ({ re, im }) => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Work down the questions to place this number. Each answer chooses what gets asked next.',
      },
    ],
    subject: `z = ${complexTex(re, im)}`,
    steps: [
      {
        id: 'real',
        ask: 'Is the real part positive?',
        branches: [
          { label: 'Yes', to: 'right' },
          { label: 'No', to: 'left' },
        ],
      },
      {
        id: 'right',
        ask: 'Is the imaginary part positive?',
        branches: [
          { label: 'Yes', outcome: 'Top right. The argument is between $0$ and $\\tfrac{\\pi}{2}$.' },
          { label: 'No', outcome: 'Bottom right. The argument is between $-\\tfrac{\\pi}{2}$ and $0$.' },
        ],
      },
      {
        id: 'left',
        ask: 'Is the imaginary part positive?',
        branches: [
          { label: 'Yes', outcome: 'Top left. The argument is between $\\tfrac{\\pi}{2}$ and $\\pi$.' },
          { label: 'No', outcome: 'Bottom left. The argument is between $-\\pi$ and $-\\tfrac{\\pi}{2}$.' },
        ],
      },
    ],
    answer: [re > 0 ? 'Yes' : 'No', im > 0 ? 'Yes' : 'No'],
  }),
  solution: ({ re, im }) => [
    {
      text: `The real part is $${re}$ and the imaginary part is $${im}$, so the point is ${re > 0 ? 'right' : 'left'} of the imaginary axis and ${im > 0 ? 'above' : 'below'} the real one.`,
      tex: `${complexTex(re, im)} \\rightarrow (${re},\\ ${im})`,
    },
    {
      text: `That puts it ${re > 0 ? (im > 0 ? 'top right' : 'bottom right') : im > 0 ? 'top left' : 'bottom left'}.`,
    },
    {
      text: `$\\arctan\\left(\\tfrac{${im}}{${re}}\\right)$ always answers between $-\\tfrac{\\pi}{2}$ and $\\tfrac{\\pi}{2}$, so it can only ever name a point on the right-hand half. The quadrant is what tells you whether $\\pi$ has to be added.`,
    },
  ],
};

/* ---------- The modulus of a product ---------- */

interface ModulusProductParams { a: number; b: number; c: number; d: number }

/**
 * $|zw| = |z||w|$, without finding $zw$ first.
 *
 * Multiplying the two out and then taking the modulus gets the same answer
 * after four times the work, and the point of the rule is that the work is not
 * needed. Sampling keeps the parts small so the arithmetic never becomes the
 * difficulty: the largest radicand reachable is $32 \times 32$.
 */
export const modulusProduct: Generator<ModulusProductParams> = {
  id: 'modulus-product',
  choices: ({ a, b, c, d }) => {
    const n1 = a * a + b * b;
    const n2 = c * c + d * d;
    // The two moduli added rather than multiplied, the root forgotten
    // altogether, and the answer doubled.
    return options(
      { tex: surdTex(n1 * n2), answer: surdAnswer(n1 * n2) },
      { tex: surdTex(n1 + n2), answer: surdAnswer(n1 + n2) },
      { tex: `${n1 * n2}`, answer: `${n1 * n2}` },
      { tex: surdTex(4 * n1 * n2), answer: surdAnswer(4 * n1 * n2) },
    );
  },
  sample: (rng, difficulty) => {
    const span = difficulty >= 2 ? 4 : 3;
    const draw = () => rng.int(1, span) * (difficulty >= 2 ? rng.sign() : 1);
    return { a: draw(), b: draw(), c: draw(), d: draw() };
  },
  render: ({ a, b, c, d }) => {
    const n1 = a * a + b * b;
    const n2 = c * c + d * d;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$z = ${complexTex(a, b)}$ and $w = ${complexTex(c, d)}$. What is $|zw|$?`,
        },
      ],
      lead: '|zw| =',
      keypad: SQRT_KEYS,
      answer: surdAnswer(n1 * n2),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, c, d }) => {
    const n1 = a * a + b * b;
    const n2 = c * c + d * d;
    return [
      {
        text: 'Take each modulus on its own first.',
        tex: `|z| = ${surdTex(n1)}, \\qquad |w| = ${surdTex(n2)}`,
      },
      {
        text: 'The modulus of a product is the product of the moduli — stretching by one factor and then the other stretches by the two together.',
        tex: `|zw| = |z| \\times |w| = ${surdTex(n1)} \\times ${surdTex(n2)} = ${surdTex(n1 * n2)}`,
      },
      {
        text: `Expanding $zw$ first and then taking its modulus lands on the same $${surdTex(n1 * n2)}$ after four times the work. Adding the moduli instead would give $${surdTex(n1 + n2)}$, which is the slip worth naming.`,
      },
    ];
  },
};

/* ---------- Both square roots ---------- */

interface SqrtPairParams { p: number; q: number; bank: string[] }

/**
 * A complex number has two square roots, and they differ by a sign.
 *
 * `complex-sqrt` asks for the one with a positive real part, which is a
 * question about a convention as much as about the method. Asking for the pair
 * puts the fact itself in view: $(-w)^2 = w^2$ here for the same reason it
 * does over the reals, so finding one root has already found the other.
 */
export const sqrtPair: Generator<SqrtPairParams> = {
  id: 'sqrt-pair',
  sample: (rng, difficulty) => {
    const p = rng.int(1, difficulty >= 2 ? 7 : 6);
    const q = nonZero(rng, difficulty >= 2 ? 6 : 4);
    const bank = rng.shuffle(distinct([
      complexTex(p, q),
      complexTex(-p, -q),
      complexTex(p, -q),
      complexTex(-p, q),
      complexTex(Math.abs(q), p),
    ]));
    return { p, q, bank };
  },
  render: ({ p, q, bank }) => {
    const x = p * p - q * q;
    const y = 2 * p * q;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Give both square roots of $z$.' },
        { kind: 'display', tex: `z = ${complexTex(x, y)}` },
      ],
      template: `\\sqrt{z} = {0} \\text{ or } {1}`,
      bank,
      answer: [complexTex(p, q), complexTex(-p, -q)],
      unordered: true,
    };
  },
  solution: ({ p, q }) => {
    const x = p * p - q * q;
    const y = 2 * p * q;
    return [
      {
        text: 'Match real and imaginary parts against $(a + bi)^2 = (a^2 - b^2) + 2ab\\,i$.',
        tex: `a^2 - b^2 = ${x}, \\qquad 2ab = ${y}`,
      },
      { text: 'One pair that fits is:', tex: `a = ${p}, \\quad b = ${q}` },
      {
        text: 'And the other root is its negative, because squaring destroys the sign.',
        tex: `(${complexTex(-p, -q)})^2 = (${complexTex(p, q)})^2 = ${complexTex(x, y)}`,
      },
      {
        text: `The conjugate $${complexTex(p, -q)}$ is *not* a square root here — it squares to $${complexTex(x, -y)}$ instead.`,
      },
    ];
  },
};

/* ---------- The argument, found by dragging ---------- */

/** The argument of `ANGLES[i]`, counted in eighths of a full turn. */
const QUARTER_TURNS = [0, 1, 2, 3, 4, -3, -2, -1];

interface TurnsParams { index: number; scale: number }

/**
 * The argument as a position rather than a value.
 *
 * `argument` asks the learner to name the angle, which a table of eight rows
 * can be memorised for. This asks where it *is*, in eighths of a turn from the
 * positive real axis, with the point drawn beside the track — the thing the
 * table is a shorthand for and the thing that decides whether a remembered
 * answer is the right one.
 *
 * The range stops at $-\tfrac{3\pi}{4}$ rather than $-\pi$, because $-\pi$ and
 * $\pi$ are the same direction and only $\pi$ is the principal argument. A
 * slider offering both would have two handles for one answer and mark one of
 * them wrong.
 */
export const argumentTurns: Generator<TurnsParams> = {
  id: 'argument-turns',
  sample: (rng, difficulty) => ({
    index: rng.int(0, ANGLES.length - 1),
    scale: difficulty >= 2 ? rng.int(1, 8) : rng.int(1, 5),
  }),
  render: ({ index, scale }) => {
    const angle = ANGLES[index];
    const re = angle.re * scale;
    const im = angle.im * scale;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'Slide to the argument of the marked number, counted in eighths of a turn.',
        },
        { kind: 'diagram', svg: complexPlaneSvg(rangeFor(re, im), [{ re, im, highlight: true }]) },
      ],
      min: -3,
      max: 4,
      step: 1,
      answer: QUARTER_TURNS[index],
      readout: '\\arg z = {v} \\times \\tfrac{\\pi}{4}',
    };
  },
  solution: ({ index, scale }) => {
    const angle = ANGLES[index];
    const turns = QUARTER_TURNS[index];
    return [
      {
        text: 'Find the direction first, then count eighths of a turn anticlockwise from the positive real axis.',
        tex: `z = ${complexTex(angle.re * scale, angle.im * scale)}`,
      },
      {
        text: `That is ${turns === 0 ? 'no turn at all' : `${Math.abs(turns)} eighth${Math.abs(turns) === 1 ? '' : 's'} of a turn ${turns > 0 ? 'anticlockwise' : 'clockwise'}`}.`,
        tex: `\\arg z = ${turns} \\times \\tfrac{\\pi}{4} = ${angle.tex}`,
      },
      {
        text: `Scaling by $${scale}$ moved the point further out without rotating it, so the argument did not change.`,
      },
    ];
  },
};

/* ---------- Multiplying in modulus-argument form ---------- */

/** Angle numerators available over each denominator, taken from `POLAR_ANGLES`. */
const ANGLE_GROUPS: { d: number; ks: number[] }[] = [
  { d: 6, ks: [1, 5, -1, -5] },
  { d: 4, ks: [1, 3, -1, -3] },
  { d: 3, ks: [1, 2, -1, -2] },
];

interface PolarMultiplyParams { d: number; k1: number; k2: number; r1: number; r2: number; bank: string[] }

/**
 * Moduli multiply, arguments add — the rule De Moivre's theorem is the
 * repeated case of.
 *
 * Both halves are asked at once and placed separately, because the two are
 * independent and mixing them up is the characteristic error: multiplying the
 * arguments, or adding the moduli, each look reasonable on their own and
 * neither survives being written beside the other.
 */
export const polarMultiply: Generator<PolarMultiplyParams> = {
  id: 'polar-multiply',
  sample: (rng, difficulty) => {
    const group = rng.pick(ANGLE_GROUPS);
    const k1 = rng.pick(group.ks);
    const k2 = rng.pick(group.ks);
    const top = difficulty >= 2 ? 6 : 4;
    const r1 = rng.int(2, top);
    const r2 = rng.int(2, top);
    const d = group.d;
    const sum = principal(k1 + k2, d);
    const candidates = [
      `${r1 * r2}`,
      angleTex(sum, d),
      `${r1 + r2}`,
      angleTex(principal(k1 * k2, d), d),
      angleTex(k1 + k2, d),
      angleTex(principal(k1 - k2, d), d),
    ];
    return { d, k1, k2, r1, r2, bank: rng.shuffle([...new Set(candidates)]) };
  },
  render: ({ d, k1, k2, r1, r2, bank }) => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: `$z$ has modulus $${r1}$ and argument $${angleTex(k1, d)}$. $w$ has modulus $${r2}$ and argument $${angleTex(k2, d)}$.`,
      },
      { kind: 'prose', text: 'Give the modulus and the principal argument of $zw$.' },
    ],
    template: `|zw| = {0} \\text{, and } \\arg(zw) = {1}`,
    bank,
    answer: [`${r1 * r2}`, angleTex(principal(k1 + k2, d), d)],
  }),
  solution: ({ d, k1, k2, r1, r2 }) => {
    const raw = angleTex(k1 + k2, d);
    const reduced = angleTex(principal(k1 + k2, d), d);
    const steps: SolutionStep[] = [
      {
        text: 'Multiplying stretches by one modulus and then the other, so the moduli multiply.',
        tex: `|zw| = ${r1} \\times ${r2} = ${r1 * r2}`,
      },
      {
        text: 'And it turns by one argument and then the other, so the arguments add.',
        tex: `\\arg(zw) = ${paren(angleTex(k1, d))} + ${paren(angleTex(k2, d))} = ${raw}`,
      },
    ];
    if (raw !== reduced) {
      steps.push({
        text: 'That is outside $(-\\pi, \\pi]$, so take a whole turn off. The direction is unchanged; only the label is.',
        tex: `${raw} ${k1 + k2 > 0 ? '-' : '+'} 2\\pi = ${reduced}`,
      });
    }
    steps.push({
      text: `Multiplying the arguments instead would give $${angleTex(principal(k1 * k2, d), d)}$, and adding the moduli $${r1 + r2}$ — both plausible, both wrong.`,
    });
    return steps;
  },
};

/* ---------- The argument of a power, reduced in two stages ---------- */

interface PowerArgumentParams { d: number; k: number; n: number; bank: string[] }

/**
 * $\arg(z^n) = n\arg(z)$, and then the part everyone drops: bringing it back
 * into $(-\pi, \pi]$.
 *
 * `polar-power` asks for the finished answer, so a learner who multiplies
 * correctly and forgets to reduce simply gets it wrong with no sign of where.
 * Here both stages are placed, which says which of the two went missing — and
 * sampling insists a reduction is genuinely needed, or the second blank would
 * be the first one copied out.
 */
export const powerArgument: Generator<PowerArgumentParams> = {
  id: 'power-argument',
  sample: (rng, difficulty) => {
    const groups = [...ANGLE_GROUPS, { d: 2, ks: [1, -1] }];
    for (let tries = 0; tries < 60; tries += 1) {
      const group = groups[rng.int(0, groups.length - 1)];
      const k = rng.pick(group.ks);
      const n = rng.int(2, difficulty >= 2 ? 7 : 5);
      const d = group.d;
      const raw = angleTex(n * k, d);
      const reduced = angleTex(principal(n * k, d), d);
      if (raw === reduced) continue;
      const candidates = [
        raw,
        reduced,
        angleTex(principal(-n * k, d), d),
        angleTex(k, d),
        angleTex(n * k + 2 * d, d),
      ];
      const bank = [...new Set(candidates)];
      if (bank.length < 3) continue;
      return { d, k, n, bank: rng.shuffle(bank) };
    }
    // Reached only if 60 draws all collide, which no group above allows.
    return { d: 4, k: 3, n: 2, bank: ['\\tfrac{3\\pi}{2}', '-\\tfrac{\\pi}{2}', '\\tfrac{\\pi}{2}', '\\tfrac{3\\pi}{4}'] };
  },
  render: ({ d, k, n, bank }) => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: `$z$ has argument $${angleTex(k, d)}$. Fill in both stages of $\\arg(z^${n})$.`,
      },
    ],
    // `z^{n}` is deliberately written without braces: the tiles template reads
    // `{n}` as a blank marker, so a braced single-digit power would vanish.
    template: `${n} \\arg(z) = {0} \\text{, then } \\arg(z^${n}) = {1}`,
    bank,
    answer: [angleTex(n * k, d), angleTex(principal(n * k, d), d)],
  }),
  solution: ({ d, k, n }) => {
    const m = principal(n * k, d);
    const turns = (n * k - m) / (2 * d);
    return [
      {
        text: "De Moivre's theorem multiplies the argument by the power.",
        tex: `\\arg(z^${n}) = ${n} \\times ${paren(angleTex(k, d))} = ${angleTex(n * k, d)}`,
      },
      {
        text: 'That is past the ends of $(-\\pi, \\pi]$, so remove whole turns until it lands inside.',
        tex: `${angleTex(n * k, d)} ${turns > 0 ? '-' : '+'} ${Math.abs(turns) === 1 ? '' : `${Math.abs(turns)} \\times `}2\\pi = ${angleTex(m, d)}`,
      },
      {
        text: `Both name the same direction; only $${angleTex(m, d)}$ is the principal argument, and it is the one a marker expects.`,
      },
    ];
  },
};

/* ====================================================================== */
/* Level 5: roots of unity, and the roots of any z^n = w                  */
/* ====================================================================== */

/** "cube", "fifth", "twelfth": how the roots of z^n = 1 are named aloud. */
const ORDINALS: Record<number, string> = {
  2: 'square', 3: 'cube', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth',
  9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth', 13: 'thirteenth', 14: 'fourteenth',
  15: 'fifteenth', 16: 'sixteenth', 17: 'seventeenth', 18: 'eighteenth', 19: 'nineteenth',
  20: 'twentieth',
};

const ordinal = (n: number): string => ORDINALS[n] ?? `${n}th`;

/** Exponents written in `a mod n` style never go negative. */
const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** `\omega^{k}`, with the zeroth power written as the 1 it is. */
const omegaTex = (k: number): string => (k === 0 ? '1' : k === 1 ? '\\omega' : `\\omega^{${k}}`);

/** The kth nth root of unity as mathjs reads it. Only the choice tests read this. */
const omegaAnswer = (k: number, n: number): string => `exp(2*pi*i*${k}/${n})`;

/** The kth nth root of unity as a point, for telling apart two options that print differently. */
const omegaPoint = (k: number, n: number): [number, number] => [
  Math.cos((2 * Math.PI * k) / n),
  Math.sin((2 * Math.PI * k) / n),
];

/**
 * The first `count` candidates that are genuinely different numbers.
 *
 * `options()` only de-duplicates on the printed label, and two labels built
 * from roots of unity can differ while naming one point: with n = 6, the
 * printed `\omega^{3}` and `-1` are the same number. A native choice slide has
 * no checker behind it to catch that, so it is caught here, by value.
 */
function distinctByValue(
  candidates: { tex: string; value: [number, number]; correct?: boolean }[],
  count: number,
): ChoiceOption[] {
  const kept: { tex: string; value: [number, number]; correct?: boolean }[] = [];
  for (const candidate of candidates) {
    if (kept.length === count) break;
    const clash = kept.some(
      (other) =>
        other.tex === candidate.tex ||
        (Math.abs(other.value[0] - candidate.value[0]) < 1e-9 &&
          Math.abs(other.value[1] - candidate.value[1]) < 1e-9),
    );
    if (!clash) kept.push(candidate);
  }
  return kept.map(({ tex, correct }) => (correct ? { tex, correct } : { tex }));
}

/**
 * A native choice slide, with the right option at a slot fixed by the
 * question's own numbers.
 *
 * Not the label hash `choiceVariant` rotates by: when every option is a power
 * of the same symbol, the hash leans on a few characters and the answer sits
 * in the same two slots far more often than a quarter of the time.
 */
function choiceSlide(prompt: Block[], opts: ChoiceOption[], salt: number): Slide {
  const correct = opts.find((option) => option.correct)!;
  const rest = opts.filter((option) => !option.correct);
  const slot = mod(salt, opts.length);
  const ordered = [...rest.slice(0, slot), correct, ...rest.slice(slot)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex: true })),
    correctId: `opt${slot}`,
  };
}

/** A slot number spread evenly from a question's parameters. */
const mix = (...xs: number[]): number =>
  xs.reduce((h, x) => Math.imul(h ^ (x + 0x9e37), 0x5bd1e995) >>> 0, 17) >>> 7;

/**
 * Options for a derived `+choice` form, ordered so the answer lands at a slot
 * fixed by the question's own numbers.
 *
 * `choiceVariant` turns the options by a hash of their labels, and when the
 * labels are small whole numbers or powers of one symbol that hash is far from
 * even: `unity-count+choice` put its answer first nine times in ten. The turn
 * depends on the order the labels arrive in, so this tries the orders of the
 * options until one comes out where the question says it should, and keeps
 * the list as it was when none does. `turnOf` mirrors `rotation` in
 * `choiceVariant.ts`; if that ever changes, the answer is still always on
 * offer, only its slot drifts again.
 */
function steered(opts: ChoiceOption[], salt: number): ChoiceOption[] {
  const turnOf = (list: ChoiceOption[]) => {
    let hash = 0;
    for (const option of list) {
      for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % list.length;
  };
  const target = mod(salt, opts.length);
  const orders = (list: ChoiceOption[]): ChoiceOption[][] =>
    list.length <= 1
      ? [list]
      : list.flatMap((head, idx) => orders([...list.slice(0, idx), ...list.slice(idx + 1)]).map((rest) => [head, ...rest]));
  for (const order of orders(opts)) {
    const at = order.findIndex((option) => option.correct);
    if (mod(at - turnOf(order), order.length) === target) return order;
  }
  return opts;
}

/**
 * The nth roots of unity on the unit circle, one of them highlighted.
 *
 * Its own drawing rather than `complexPlaneSvg`, because none of these points
 * sits on the lattice that plane is built round: what matters here is the
 * circle and the even spacing, and a grid behind it would only be noise. The
 * root at 1 and the one labelled ω are named on the figure, so "which power
 * is this" is a question about counting steps round from a known start.
 */
export function unityCircleSvg(n: number, highlight: number, labelled = 1): string {
  const size = 260;
  const c = size / 2;
  const radius = 88;
  const at = (k: number, out = 0) => {
    const t = (2 * Math.PI * k) / n;
    return {
      x: +(c + (radius + out) * Math.cos(t)).toFixed(2),
      y: +(c - (radius + out) * Math.sin(t)).toFixed(2),
    };
  };
  const parts: string[] = [
    `<line x1="10" y1="${c}" x2="${size - 10}" y2="${c}" stroke="var(--border)" stroke-width="1"/>`,
    `<line x1="${c}" y1="10" x2="${c}" y2="${size - 10}" stroke="var(--border)" stroke-width="1"/>`,
    `<circle cx="${c}" cy="${c}" r="${radius}" fill="none" stroke="var(--text-dim)" stroke-width="1"/>`,
  ];
  const corners = Array.from({ length: n }, (_, k) => at(k));
  parts.push(
    `<polygon points="${corners.map(({ x, y }) => `${x},${y}`).join(' ')}" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3"/>`,
  );
  for (let k = 0; k < n; k += 1) {
    const { x, y } = corners[k];
    const lit = k === highlight;
    parts.push(
      `<circle cx="${x}" cy="${y}" r="${lit ? 7 : 4.5}" fill="${lit ? 'var(--accent)' : 'var(--text-dim)'}"/>`,
    );
  }
  const label = (k: number, text: string) => {
    const { x, y } = at(k, 17);
    return `<text x="${x}" y="${y}" fill="var(--text)" font-size="15" font-style="italic" text-anchor="middle" dominant-baseline="central">${text}</text>`;
  };
  parts.push(label(0, '1'));
  if (labelled !== 0) parts.push(label(labelled, 'ω'));
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px" role="img" aria-label="Roots of unity on the unit circle">${parts.join('')}</svg>`;
}

/* ---------- The argument of a power of omega ---------- */

interface UnityArgParams { n: number; k: number }

/**
 * $\arg(\omega^k)$: k steps of $\tfrac{2\pi}{n}$ round from 1, then back inside
 * $(-\pi, \pi]$ when that went past a half turn.
 *
 * Difficulty 1 keeps k to the upper half of the circle, so the answer is the
 * multiplication alone; difficulty 2 mostly draws from the lower half, where
 * the principal argument is negative and the reduction is the question.
 */
export const unityArgument: Generator<UnityArgParams> = {
  id: 'unity-argument',
  choices: ({ n, k }) => {
    const ang = (m: number, d: number) => ({ tex: angleTex(m, d), answer: angleAnswer(m, d) });
    return steered(options(
      ang(principal(2 * k, n), n),
      // Left unreduced, the 2 forgotten, the sign flipped, one root too far.
      ang(2 * k, n),
      ang(principal(k, n), n),
      ang(principal(-2 * k, n), n),
      ang(principal(2 * k + 2, n), n),
    ).slice(0, 4), mix(n, k));
  },
  sample: (rng, difficulty) => {
    const n = rng.int(3, 12);
    if (difficulty < 2) return { n, k: rng.int(1, Math.floor(n / 2)) };
    const k = rng.chance(0.75) ? rng.int(Math.floor(n / 2) + 1, n - 1) : rng.int(1, n - 1);
    return { n, k };
  },
  render: ({ n, k }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `$\\omega$ is the ${ordinal(n)} root of unity with argument $${angleTex(2, n)}$, the first one anticlockwise from $1$. What is the principal argument of $${omegaTex(k)}$?`,
      },
    ],
    lead: `\\arg\\left(${omegaTex(k)}\\right) =`,
    keypad: ANGLE_KEYS,
    answer: angleAnswer(principal(2 * k, n), n),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, k }) => {
    const raw = angleTex(2 * k, n);
    const reduced = angleTex(principal(2 * k, n), n);
    const steps: SolutionStep[] = [
      {
        text: `Each power of $\\omega$ turns a further $${angleTex(2, n)}$, so $${omegaTex(k)}$ is ${k} step${k === 1 ? '' : 's'} round from $1$.`,
        tex: `\\arg\\left(${omegaTex(k)}\\right) = ${k} \\times ${angleTex(2, n)} = ${raw}`,
      },
    ];
    if (raw !== reduced) {
      steps.push({
        text: 'That is past a half turn, so take one whole turn off to land in $(-\\pi, \\pi]$. The point is the same; only the label changes.',
        tex: `${raw} - 2\\pi = ${reduced}`,
      });
    } else {
      steps.push({ text: 'That is already between $-\\pi$ and $\\pi$, so it is the principal argument.' });
    }
    return steps;
  },
};

/* ---------- Which of these is a root of unity? ---------- */

interface UnityWhichParams { n: number; k: number }

/** `\cos\theta + i\sin\theta` for θ = mπ/d, as the learner reads it. */
const cisTex = (m: number, d: number): string => {
  const t = paren(angleTex(m, d));
  return `\\cos ${t} + i\\sin ${t}`;
};

/**
 * Pick the root of $z^n = 1$ out of four numbers on the unit circle.
 *
 * Every option has modulus 1, so only the argument can decide it, and the
 * distractors are the near-misses the definition produces: an odd multiple of
 * $\tfrac{\pi}{n}$ (a root of $z^n = -1$, not of $z^n = 1$), and a multiple
 * of $2\pi$ over the wrong denominator. A candidate that happens to be a root
 * after all is dropped, which is what `isRoot` is for.
 */
export const unityWhich: Generator<UnityWhichParams> = {
  id: 'unity-which',
  sample: (rng, difficulty) => {
    const n = difficulty < 2 ? rng.int(3, 8) : rng.int(5, 12);
    return { n, k: rng.int(1, n - 1) };
  },
  render: ({ n, k }) => {
    // mπ/d is a root of z^n = 1 exactly when n·m/d is an even whole number.
    const isRoot = (m: number, d: number) => (n * m) % (2 * d) === 0;
    const point = (m: number, d: number): [number, number] => [
      Math.cos((m * Math.PI) / d),
      Math.sin((m * Math.PI) / d),
    ];
    const right = principal(2 * k, n);
    const candidates = [
      { m: right, d: n, correct: true },
      { m: principal(2 * k + 1, n), d: n },
      { m: principal(2 * k, n + 1), d: n + 1 },
      { m: principal(2 * k - 1, n), d: n },
      { m: principal(2 * k, n - 1), d: n - 1 },
      { m: principal(k, n), d: n },
    ].filter((c) => c.correct || !isRoot(c.m, c.d));
    const opts = distinctByValue(
      candidates.map((c) => ({ tex: cisTex(c.m, c.d), value: point(c.m, c.d), correct: c.correct })),
      4,
    );
    return choiceSlide(
      [{ kind: 'prose', text: `Which of these is a root of $z^{${n}} = 1$?` }],
      opts,
      mix(n, k),
    );
  },
  solution: ({ n, k }) => [
    {
      text: `$z = \\cos\\theta + i\\sin\\theta$ solves $z^{${n}} = 1$ exactly when $${n}\\theta$ is a whole number of turns, so $\\theta$ must be a multiple of $\\tfrac{2\\pi}{${n}}$.`,
      tex: `\\theta = ${k} \\times \\tfrac{2\\pi}{${n}} = ${angleTex(2 * k, n)}`,
    },
    ...(angleTex(2 * k, n) !== angleTex(principal(2 * k, n), n)
      ? [{ text: 'Written as a principal argument, that angle is:', tex: angleTex(principal(2 * k, n), n) }]
      : []),
    {
      text: `An odd multiple of $\\tfrac{\\pi}{${n}}$ is the usual trap: ${n} times it is an odd number of half turns, which lands on $-1$, not $1$.`,
    },
  ],
};

/* ---------- A root of unity in the form a + bi ---------- */

/** One exact trig value, both as read and as parsed. */
interface Exact { tex: string; ans: string; zero: boolean; unit: boolean; neg: boolean }

const EXACT_TABLE: { v: number; tex: string; ans: string }[] = [
  { v: 0, tex: '0', ans: '0' },
  { v: 0.5, tex: '\\tfrac{1}{2}', ans: '1/2' },
  { v: Math.SQRT1_2, tex: '\\tfrac{\\sqrt{2}}{2}', ans: 'sqrt(2)/2' },
  { v: Math.sqrt(3) / 2, tex: '\\tfrac{\\sqrt{3}}{2}', ans: 'sqrt(3)/2' },
  { v: 1, tex: '1', ans: '1' },
];

/** cos or sin of a multiple of π/4 or π/6, looked up rather than computed as a decimal. */
function exact(x: number): Exact {
  const row = EXACT_TABLE.find(({ v }) => Math.abs(Math.abs(x) - v) < 1e-9);
  if (!row) throw new Error(`no exact value for ${x}`);
  const neg = x < 0 && row.v !== 0;
  return { tex: row.tex, ans: neg ? `-(${row.ans})` : row.ans, zero: row.v === 0, unit: row.v === 1, neg };
}

/** "a + bi" with exact parts, collapsing signs the way `complexTex` does. */
function exactComplexTex(re: Exact, im: Exact): string {
  const imag = im.unit ? 'i' : `${im.tex}i`;
  if (im.zero) return `${re.neg ? '-' : ''}${re.tex}`;
  if (re.zero) return `${im.neg ? '-' : ''}${imag}`;
  return `${re.neg ? '-' : ''}${re.tex} ${im.neg ? '-' : '+'} ${imag}`;
}

const exactComplexAnswer = (re: Exact, im: Exact): string => `(${re.ans}) + (${im.ans})*i`;

interface UnityCartesianParams { n: number; m: number; phrasing: 'power' | 'angle' }

/** Fractions and roots, for typing the exact values; `i` for the imaginary part. */
const EXACT_KEYS: KeypadKey[] = [{ insert: '/' }, { insert: 'sqrt(', label: '√(' }, ...I_KEY];

/**
 * A root of unity written out as $a + bi$.
 *
 * Only the orders whose roots sit at multiples of $\tfrac{\pi}{4}$ or
 * $\tfrac{\pi}{6}$ are drawn, so both parts are exact values the learner
 * knows, and none on an axis, where the question would be a single digit.
 */
export const unityCartesian: Generator<UnityCartesianParams> = {
  id: 'unity-cartesian',
  choices: (params) => {
    const { c, s } = unityCartesianParts(params);
    const opt = (re: Exact, im: Exact) => ({ tex: exactComplexTex(re, im), answer: exactComplexAnswer(re, im) });
    const flip = (x: Exact): Exact => ({ ...x, neg: !x.neg, ans: x.neg ? x.ans.slice(2, -1) : `-(${x.ans})` });
    // The conjugate, cosine and sine swapped, and the real part's sign lost.
    return steered(options(opt(c, s), opt(c, flip(s)), opt(s, c), opt(flip(c), s)), mix(params.n, params.m, params.phrasing.length));
  },
  sample: (rng, difficulty) => {
    const n = rng.pick([3, 6, 8, 12]);
    let k = rng.int(1, n - 1);
    while ((4 * k) % n === 0) k = rng.int(1, n - 1);
    if (difficulty < 2) return { n, m: k, phrasing: rng.pick(['power', 'angle'] as const) };
    // A power past n, or a negative one: reducing it is part of the question.
    const m = rng.chance(0.7) ? k + n * rng.int(1, 3) : k - n;
    return { n, m, phrasing: 'power' };
  },
  render: (params) => {
    const { n, m, phrasing } = params;
    const { c, s } = unityCartesianParts(params);
    const subject = phrasing === 'power'
      ? `$\\omega = \\cos ${angleTex(2, n)} + i\\sin ${angleTex(2, n)}$ is one of the ${ordinal(n)} roots of unity. Write $${omegaTex(m)}$ in the form $a + bi$.`
      : `$z$ is the ${ordinal(n)} root of unity with principal argument $${angleTex(principal(2 * m, n), n)}$. Write it in the form $a + bi$.`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: subject }],
      lead: phrasing === 'power' ? `${omegaTex(m)} =` : 'z =',
      keypad: EXACT_KEYS,
      answer: exactComplexAnswer(c, s),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { n, m, phrasing } = params;
    const { c, s } = unityCartesianParts(params);
    const theta = angleTex(principal(2 * m, n), n);
    const steps: SolutionStep[] = [];
    if (phrasing === 'power') {
      if (m !== mod(m, n)) {
        steps.push({
          text: `$\\omega^{${n}} = 1$, so whole turns can be dropped from the power first.`,
          tex: `${omegaTex(m)} = ${omegaTex(mod(m, n))}`,
        });
      }
      steps.push({
        text: 'Its argument, as a principal angle:',
        tex: `\\theta = ${mod(m, n)} \\times ${angleTex(2, n)} \\;\\to\\; ${theta}`,
      });
    }
    steps.push(
      {
        text: 'A root of unity has modulus 1, so its real part is the cosine of its argument',
        tex: `\\cos ${paren(theta)} = ${c.neg ? '-' : ''}${c.tex}`,
      },
      { text: 'and its imaginary part is the sine.', tex: `\\sin ${paren(theta)} = ${s.neg ? '-' : ''}${s.tex}` },
      { tex: `${phrasing === 'power' ? omegaTex(m) : 'z'} = ${exactComplexTex(c, s)}` },
    );
    return steps;
  },
};

function unityCartesianParts({ n, m }: UnityCartesianParams): { c: Exact; s: Exact } {
  const t = (Math.PI * principal(2 * m, n)) / n;
  return { c: exact(Math.cos(t)), s: exact(Math.sin(t)) };
}

/* ---------- Which power of omega is marked? ---------- */

interface UnitySliderParams { n: number; g: number; j: number }

/**
 * Read a root of unity off the circle, as a power of ω.
 *
 * At difficulty 1 the labelled ω is the first root anticlockwise, so the
 * answer is a count of steps. At difficulty 2 it is some other root that still
 * reaches all of them, and the learner steps round by ω's own angle, wrapping
 * past 1 as often as it takes — the idea the Argand diagram lesson builds on.
 *
 * The answer is never the slider's resting value, since the handle would
 * otherwise start the question sitting on it.
 */
export const unitySlider: Generator<UnitySliderParams> = {
  id: 'unity-slider',
  sample: (rng, difficulty) => {
    const n = rng.int(5, 12);
    const rest = Math.round((n - 1) / 2);
    const coprime = Array.from({ length: n - 2 }, (_, idx) => idx + 2).filter((g) => gcd(g, n) === 1);
    const g = difficulty < 2 ? 1 : rng.pick(coprime);
    let j = rng.int(2, n - 1);
    while (j === rest) j = rng.int(2, n - 1);
    return { n, g, j };
  },
  render: ({ n, g, j }) => ({
    kind: 'slider',
    prompt: [
      {
        kind: 'prose',
        text: `The ${ordinal(n)} roots of unity, with $\\omega$ labelled. Which power of $\\omega$ is the highlighted root?`,
      },
      { kind: 'diagram', svg: unityCircleSvg(n, mod(g * j, n), g) },
    ],
    min: 0,
    max: n - 1,
    step: 1,
    answer: j,
    readout: '\\omega^{{v}}',
  }),
  solution: ({ n, g, j }) => {
    const p = mod(g * j, n);
    if (g === 1) {
      return [
        {
          text: `$\\omega$ is one step anticlockwise from $1$, and each further power of $\\omega$ is one more step. The highlighted root is ${j} steps round.`,
          tex: `\\text{highlighted} = \\omega^{${j}}`,
        },
      ];
    }
    return [
      {
        text: `Here $\\omega$ is ${g} steps round from $1$, so each power of $\\omega$ moves on ${g} more, wrapping past $1$ after ${n}.`,
        tex: `\\omega^{${j}} \\text{ is } ${g} \\times ${j} = ${g * j} \\text{ steps round}`,
      },
      {
        text: `Taking off whole turns of ${n} steps leaves ${p}, which is the highlighted root.`,
        tex: `${g * j} - ${g * j - p} = ${p}`,
      },
    ];
  },
};

/* ---------- The conjugate of a root of unity ---------- */

interface UnityConjugateParams { n: number; k: number }

/**
 * The conjugate as a reflection in the real axis, named as a power of ω.
 *
 * The polygon of roots is symmetric about the real axis, so reflecting
 * $\omega^k$ lands on another root, $\omega^{n-k}$. Every option is written
 * with an exponent between 0 and n − 1, so $\omega^{-k}$ — right, but not in
 * that form — is never on offer to be marked wrong.
 */
export const unityConjugate: Generator<UnityConjugateParams> = {
  id: 'unity-conjugate',
  sample: (rng, difficulty) => {
    const n = difficulty < 2 ? rng.int(4, 9) : rng.int(7, 12);
    let k = rng.int(1, n - 1);
    while (2 * k === n) k = rng.int(1, n - 1);
    return { n, k };
  },
  render: ({ n, k }) => {
    const right = n - k;
    const exps = [right, k, mod(right + 1, n), mod(right - 1, n), mod(k + Math.floor(n / 2), n), mod(n - 2 * k, n)];
    const opts = distinctByValue(
      exps
        .filter((e, idx) => idx === 0 || e !== 0)
        .map((e, idx) => ({ tex: omegaTex(e), value: omegaPoint(e, n), correct: idx === 0 })),
      4,
    );
    return choiceSlide(
      [
        {
          kind: 'prose',
          text: `The ${ordinal(n)} roots of unity, with $${omegaTex(k)}$ highlighted. Which root is its conjugate $\\overline{${omegaTex(k)}}$?`,
        },
        { kind: 'diagram', svg: unityCircleSvg(n, k) },
      ],
      opts,
      mix(n, k),
    );
  },
  solution: ({ n, k }) => [
    {
      text: 'Conjugating reflects a point in the real axis. The roots are symmetric about that axis, so the reflection is another root.',
    },
    {
      text: `$${omegaTex(k)}$ is ${k} step${k === 1 ? '' : 's'} anticlockwise from $1$; its reflection is ${k} step${k === 1 ? '' : 's'} clockwise, which is ${n - k} anticlockwise.`,
      tex: `\\overline{${omegaTex(k)}} = \\omega^{-${k}} = \\omega^{${n} - ${k}} = ${omegaTex(n - k)}`,
    },
  ],
};

/* ---------- Counting roots by region ---------- */

type Region = 'real' | 'upper' | 'first' | 'left' | 'imaginary';

interface UnityCountParams { n: number; region: Region }

const REGION_TEXT: Record<Region, string> = {
  real: 'lie on the real axis',
  upper: 'lie strictly above the real axis',
  first: 'lie strictly inside the first quadrant',
  left: 'have a negative real part',
  imaginary: 'lie on the imaginary axis',
};

/**
 * How many roots of $z^n = 1$ fall in a region, counted with integers: root k
 * sits $\tfrac{k}{n}$ of a turn round, so comparing $4k$ against $n$ and $3n$
 * decides every quadrant boundary with no floating point at all.
 */
function countIn(n: number, region: Region): number {
  let count = 0;
  for (let k = 0; k < n; k += 1) {
    const q = 4 * k; // quarter turns, times n
    const inside =
      region === 'real' ? q === 0 || q === 2 * n
      : region === 'upper' ? q > 0 && q < 2 * n
      : region === 'first' ? q > 0 && q < n
      : region === 'left' ? q > n && q < 3 * n
      : q === n || q === 3 * n;
    if (inside) count += 1;
  }
  return count;
}

/**
 * The shape of the whole set, without drawing it.
 *
 * Counting how many roots sit on an axis or in a quadrant is answered by the
 * picture of a regular polygon with a corner at 1 — whether n is odd or even,
 * whether it is a multiple of 4 — and not by listing arguments one by one,
 * which is why there is no figure: the figure would be the answer.
 */
export const unityCount: Generator<UnityCountParams> = {
  id: 'unity-count',
  choices: ({ n, region }) => {
    const c = countIn(n, region);
    const num = (v: number) => ({ tex: `${v}`, answer: `${v}` });
    const salt = mix(n, ['real', 'upper', 'first', 'left', 'imaginary'].indexOf(region));
    return steered(options(num(c), num(c + 1), num(Math.abs(c - 1)), num(c + 2), num(n - c)).slice(0, 4), salt);
  },
  sample: (rng, difficulty) => ({
    n: difficulty < 2 ? rng.int(3, 12) : rng.int(7, 20),
    region: rng.pick(['real', 'upper', 'first', 'left', 'imaginary'] as const),
  }),
  render: ({ n, region }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `$N$ of the ${n} roots of $z^{${n}} = 1$ ${REGION_TEXT[region]}. What is $N$?` },
    ],
    lead: 'N =',
    keypad: [],
    answer: `${countIn(n, region)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, region }) => {
    const c = countIn(n, region);
    const where = {
      real: `Only $1$ and, when $n$ is even, $-1$ can be real. ${n} is ${n % 2 === 0 ? 'even, so both are roots' : 'odd, so only $1$ is'}.`,
      upper: `Take away the real roots (${countIn(n, 'real')}) and the rest pair up as conjugates, half above the axis and half below.`,
      first: `Root $k$ is $\\tfrac{k}{${n}}$ of a turn round. The first quadrant is strictly between $0$ and a quarter turn, so $0 < \\tfrac{k}{${n}} < \\tfrac{1}{4}$.`,
      left: `A negative real part means strictly between a quarter and three quarters of a turn: $\\tfrac{1}{4} < \\tfrac{k}{${n}} < \\tfrac{3}{4}$.`,
      imaginary: `$\\pm i$ are roots only when a quarter turn is a whole number of steps, which needs ${n} to be a multiple of 4. ${n % 4 === 0 ? 'It is' : 'It is not'}.`,
    }[region];
    return [
      { text: `The roots are the corners of a regular ${n}-sided polygon on the unit circle, with one corner at $1$.` },
      { text: where, tex: `N = ${c}` },
    ];
  },
};

/* ---------- Reducing a power of omega ---------- */

type PowerForm = 'big' | 'product' | 'power' | 'negative' | 'quotient';

interface UnityPowerParams { n: number; form: PowerForm; a: number; b: number }

/** The exponent before reduction, and how it is written. */
function unityPowerParts({ n, form, a, b }: UnityPowerParams): { raw: number; tex: string; working: string } {
  switch (form) {
    case 'big':
      return { raw: a, tex: omegaTex(a), working: `${a}` };
    case 'product':
      return { raw: a + b, tex: `${omegaTex(a)} \\times ${omegaTex(b)}`, working: `${a} + ${b} = ${a + b}` };
    case 'power':
      return { raw: a * b, tex: `\\left(${omegaTex(a)}\\right)^{${b}}`, working: `${a} \\times ${b} = ${a * b}` };
    case 'negative':
      return { raw: -a, tex: `\\omega^{-${a}}`, working: `-${a}` };
    case 'quotient':
      return { raw: a - b, tex: `\\dfrac{${omegaTex(a)}}{${omegaTex(b)}}`, working: `${a} - ${b} = ${a - b}` };
  }
  return { raw: 0, tex: '1', working: `${n}` };
}

/**
 * Any product, power or quotient of powers of ω, brought back to
 * $\omega^j$ with $0 \le j < n$.
 *
 * On the diagram this is stepping round the polygon and noticing that n steps
 * is a full turn; algebraically it is $\omega^n = 1$. Both are the fact that
 * makes the sums in the next lesson collapse.
 */
export const unityPower: Generator<UnityPowerParams> = {
  id: 'unity-power',
  choices: (params) => {
    const { n, form, a, b } = params;
    const j = mod(unityPowerParts(params).raw, n);
    // The exponents combined the wrong way for this form, or reduced by one too few or many.
    const slip =
      form === 'product' ? a * b
      : form === 'power' ? a + b
      : form === 'negative' ? a
      : form === 'quotient' ? b - a
      : Math.floor(a / n);
    const candidates = [j, mod(slip, n), mod(j + 1, n), mod(j - 1, n), mod(j + 2, n)];
    const seen = new Set<number>();
    const out: ChoiceOption[] = [];
    for (const [idx, e] of candidates.entries()) {
      if (seen.has(e) || out.length === 4) continue;
      seen.add(e);
      out.push({ tex: `\\omega^{${e}}`, answer: omegaAnswer(e, n), ...(idx === 0 ? { correct: true } : {}) });
    }
    return steered(out, mix(n, a, b, form.length));
  },
  sample: (rng, difficulty) => {
    const n = difficulty < 2 ? rng.int(3, 8) : rng.int(5, 12);
    const forms: PowerForm[] = difficulty < 2 ? ['big', 'product'] : ['big', 'product', 'power', 'negative', 'quotient'];
    const form = rng.pick(forms);
    switch (form) {
      case 'big':
        return { n, form, a: rng.int(n + 1, 4 * n), b: 0 };
      case 'product': {
        const a = rng.int(2, n - 1);
        return { n, form, a, b: rng.int(Math.max(2, n - a), n - 1) };
      }
      case 'power':
        return { n, form, a: rng.int(2, n - 1), b: rng.int(2, 5) };
      case 'negative':
        return { n, form, a: rng.int(1, n - 1), b: 0 };
      case 'quotient': {
        const a = rng.int(1, n - 2);
        return { n, form, a, b: rng.int(a + 1, n - 1) };
      }
    }
    return { n, form: 'big', a: n + 1, b: 0 };
  },
  render: (params) => {
    const { n } = params;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$\\omega$ is the ${ordinal(n)} root of unity with argument $${angleTex(2, n)}$, so $\\omega^{${n}} = 1$. Write this as $\\omega^{j}$ with $0 \\le j < ${n}$.`,
        },
        { kind: 'display', tex: unityPowerParts(params).tex },
      ],
      lead: 'j =',
      keypad: [],
      answer: `${mod(unityPowerParts(params).raw, n)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { n } = params;
    const { raw, tex, working } = unityPowerParts(params);
    const j = mod(raw, n);
    return [
      ...(params.form === 'big'
        ? []
        : [{ text: 'Combine the powers by the usual index laws first.', tex: `${tex} = \\omega^{${raw}} \\quad (${working})` }]),
      {
        text: `$\\omega^{${n}} = 1$, so adding or taking away ${n} from the power changes nothing. Do it until the power lies between $0$ and ${n - 1}.`,
        tex: `\\omega^{${raw}} = \\omega^{${raw} ${raw > j ? '-' : '+'} ${Math.abs(raw - j)}} = \\omega^{${j}}`,
      },
    ];
  },
};

/* ---------- The sum of all but some of the roots ---------- */

interface SumExceptParams { n: number; left: number[] }

/**
 * $1 + \omega + \dots + \omega^{n-1} = 0$, read backwards: whatever is left
 * out, the rest adds up to minus it.
 */
export const unitySumExcept: Generator<SumExceptParams> = {
  id: 'unity-sum-except',
  sample: (rng, difficulty) => {
    const n = difficulty < 2 ? rng.int(3, 10) : rng.int(5, 12);
    const all = Array.from({ length: n }, (_, k) => k);
    const left = difficulty < 2 ? [rng.int(0, n - 1)] : rng.sample(all, 2).sort((x, y) => x - y);
    return { n, left };
  },
  render: ({ n, left }) => {
    const sumTex = (ks: number[], sign: 1 | -1) =>
      ks.map((k, idx) => `${sign < 0 ? '-' : idx === 0 ? '' : '+'}${idx === 0 || sign < 0 ? '' : ' '}${omegaTex(k)}`).join(' ');
    const sumValue = (ks: number[], sign: number): [number, number] => {
      const [x, y] = ks.map((k) => omegaPoint(k, n)).reduce(([p, q], [u, v]) => [p + u, q + v], [0, 0]);
      return [sign * x, sign * y];
    };
    const candidates = [
      { tex: sumTex(left, -1), value: sumValue(left, -1), correct: true },
      { tex: '0', value: [0, 0] as [number, number] },
      { tex: sumTex(left, 1), value: sumValue(left, 1) },
      { tex: '-1', value: [-1, 0] as [number, number] },
      { tex: '1', value: [1, 0] as [number, number] },
      { tex: sumTex(left.map((k) => mod(-k, n)), -1), value: sumValue(left.map((k) => mod(-k, n)), -1) },
    ];
    const listed = n <= 4
      ? Array.from({ length: n }, (_, k) => omegaTex(k)).join(', ')
      : `1, \\omega, \\omega^{2}, \\ldots, \\omega^{${n - 1}}`;
    const skipped = left.map((k) => `$${omegaTex(k)}$`).join(' and ');
    return choiceSlide(
      [
        { kind: 'prose', text: `The ${ordinal(n)} roots of unity are $${listed}$.` },
        { kind: 'prose', text: `What do they add up to if ${skipped} ${left.length === 1 ? 'is' : 'are'} left out?` },
      ],
      distinctByValue(candidates, 4),
      mix(n, ...left),
    );
  },
  solution: ({ n, left }) => {
    const shown = left.map(omegaTex);
    return [
      {
        text: `All ${n} roots together add up to $0$: the polygon they make is balanced about the origin.`,
        tex: `1 + \\omega + \\cdots + \\omega^{${n - 1}} = 0`,
      },
      {
        text: `So the ones that are left make up whatever cancels ${left.length === 1 ? 'the missing root' : 'the two missing roots'}.`,
        tex: `\\text{rest} = ${shown.map((s) => `-${s}`).join(' ')}`,
      },
    ];
  },
};

/* ---------- Sums of powers of the roots ---------- */

interface SumPowerParams { n: number; p: number; phrasing: 'omega' | 'roots' }

/**
 * $1 + \omega^p + \omega^{2p} + \dots + \omega^{(n-1)p}$: 0, unless p is a
 * multiple of n, when every term is 1 and the sum is n.
 *
 * Multiples of n are drawn often on purpose. Were they rare, "0" would be a
 * reflex rather than a conclusion, and the one case where the rule does not
 * apply is the case that shows whether the reason was understood.
 */
export const unitySumPower: Generator<SumPowerParams> = {
  id: 'unity-sum-power',
  choices: ({ n, p }) => {
    const s = p % n === 0 ? n : 0;
    const num = (v: number) => ({ tex: `${v}`, answer: `${v}` });
    return steered(options(num(s), num(s === 0 ? n : 0), num(1), num(-1)), mix(n, p));
  },
  sample: (rng, difficulty) => {
    const n = difficulty < 2 ? rng.int(3, 6) : rng.int(4, 10);
    const top = difficulty < 2 ? 2 * n : 3 * n;
    const p = rng.chance(0.4) ? n * rng.int(1, Math.floor(top / n)) : (() => {
      let q = rng.int(2, top);
      while (q % n === 0) q = rng.int(2, top);
      return q;
    })();
    return { n, p, phrasing: rng.pick(['omega', 'roots'] as const) };
  },
  render: ({ n, p, phrasing }) => {
    const term = (j: number) => (j === 0 ? '1' : omegaTex(j * p));
    const terms = n <= 4
      ? Array.from({ length: n }, (_, j) => term(j)).join(' + ')
      : `${term(0)} + ${term(1)} + ${term(2)} + \\cdots + ${term(n - 1)}`;
    const prompt: Block[] = phrasing === 'omega'
      ? [{ kind: 'prose', text: `$\\omega$ is the ${ordinal(n)} root of unity with argument $${angleTex(2, n)}$. Evaluate this sum.` }]
      : [
          {
            kind: 'prose',
            text: `Raise each of the ${n} roots of $z^{${n}} = 1$ to the power ${p}. What do the results add up to?`,
          },
        ];
    return {
      kind: 'expression',
      prompt,
      lead: phrasing === 'omega' ? `${terms} =` : `\\sum z^{${p}} =`,
      keypad: [],
      answer: `${p % n === 0 ? n : 0}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ n, p }) => {
    if (p % n === 0) {
      return [
        { text: `The roots are $\\omega^{k}$ for $k = 0, \\ldots, ${n - 1}$, so raised to the power ${p} they become $\\omega^{${p}k}$.` },
        {
          text: `${p} is a multiple of ${n}, so every one of those is $\\left(\\omega^{${n}}\\right)^{${p / n}k} = 1$.`,
          tex: `\\underbrace{1 + 1 + \\cdots + 1}_{${n}} = ${n}`,
        },
      ];
    }
    return [
      { text: `The roots are $\\omega^{k}$ for $k = 0, \\ldots, ${n - 1}$, so raised to the power ${p} they become $\\omega^{${p}k}$.` },
      {
        text: `$\\omega^{${p}} \\neq 1$, since ${p} is not a multiple of ${n}, so the sum is a geometric series with ratio $\\omega^{${p}}$. Its top line vanishes:`,
        tex: `\\left(\\omega^{${p}}\\right)^{${n}} = \\left(\\omega^{${n}}\\right)^{${p}} = 1`,
      },
      { tex: `\\text{sum} = \\frac{1 - 1}{\\omega^{${p}} - 1} = 0` },
    ];
  },
};

/* ---------- The missing fourth root, from the sum ---------- */

interface MissingParams { a: number; b: number; missing: number; hint: boolean }

/** The four fourth roots of (a + bi)^4, in order round the origin. */
const quarterTurns = (a: number, b: number): [number, number][] => [[a, b], [-b, a], [-a, -b], [b, -a]];

/**
 * Three of the roots of $z^4 = w$ are given; the fourth is minus their sum.
 *
 * Fourth roots are the one family of roots besides square roots that can all
 * sit on the lattice together — a quarter turn of a lattice point is a lattice
 * point — which is what lets the answer be placed rather than typed.
 */
export const rootsMissingPlot: Generator<MissingParams> = {
  id: 'roots-missing-plot',
  sample: (rng, difficulty) => {
    if (difficulty < 2) {
      return { a: rng.int(1, 3) * rng.sign(), b: rng.int(1, 3) * rng.sign(), missing: rng.int(0, 3), hint: true };
    }
    let a = rng.int(-RANGE, RANGE);
    let b = rng.int(-RANGE, RANGE);
    while ((a === 0 && b === 0) || Math.abs(a) + Math.abs(b) < 2) {
      a = rng.int(-RANGE, RANGE);
      b = rng.int(-RANGE, RANGE);
    }
    return { a, b, missing: rng.int(0, 3), hint: false };
  },
  render: ({ a, b, missing, hint }) => {
    const roots = quarterTurns(a, b);
    const [wr, wi] = powersOf(a, b, 4)[3];
    const given = roots.filter((_, idx) => idx !== missing).map(([x, y]) => `$${complexTex(x, y)}$`);
    const [ar, ai] = roots[missing];
    return {
      kind: 'plot',
      prompt: [
        {
          kind: 'prose',
          text: `Three of the four roots of $z^{4} = ${complexTex(wr, wi)}$ are ${given[0]}, ${given[1]} and ${given[2]}.${hint ? ' All four add up to $0$.' : ''} Plot the fourth.`,
        },
      ],
      range: RANGE,
      answer: { re: ar, im: ai },
    };
  },
  solution: ({ a, b, missing }) => {
    const roots = quarterTurns(a, b);
    const others = roots.filter((_, idx) => idx !== missing);
    const sx = others.reduce((s, [x]) => s + x, 0);
    const sy = others.reduce((s, [, y]) => s + y, 0);
    return [
      { text: 'The roots of $z^{4} = w$ add up to $0$, just like the roots of unity: they are one root times each of $1, i, -1, -i$.' },
      {
        text: 'Add the three you have, real parts first.',
        tex: `${others.map(([x]) => paren(`${x}`)).join(' + ')} = ${sx}`,
      },
      {
        text: 'Then the imaginary parts.',
        tex: `${others.map(([, y]) => paren(`${y}`)).join(' + ')} = ${sy}`,
      },
      { text: 'The fourth cancels that sum.', tex: `z = -\\left(${complexTex(sx, sy)}\\right) = ${complexTex(-sx, -sy)}` },
    ];
  },
};

/* ---------- Roots of z^n = w ---------- */

/** Arguments for w: the standard angles, plus 0. `index` into this. */
const W_ANGLES: { k: number; d: number }[] = [{ k: 0, d: 1 }, ...POLAR_ANGLES];

/**
 * w as the learner reads it: plainly when it lies on an axis, since
 * $8(\cos 0 + i\sin 0)$ for 8 would be a strange way to write it, and
 * otherwise by its modulus and argument. The full modulus-argument form of,
 * say, $32(\cos(-\tfrac{2\pi}{3}) + i\sin(-\tfrac{2\pi}{3}))$ runs off the
 * side of a phone, and those two numbers are all any of these questions read.
 */
function wDisplay(R: number, index: number): string {
  const { k, d } = W_ANGLES[index];
  if (k === 0) return `w = ${R}`;
  if (k === 1 && d === 1) return `w = -${R}`;
  if (d === 2) return k > 0 ? `w = ${R}i` : `w = -${R}i`;
  return `|w| = ${R}, \\quad \\arg w = ${angleTex(k, d)}`;
}

interface RootModulusParams { n: number; r: number; index: number }

/**
 * The modulus of every root of $z^n = w$ is $|w|^{1/n}$, the one number all
 * n roots share. Drawn so it is always whole.
 */
export const rootModulus: Generator<RootModulusParams> = {
  id: 'root-modulus',
  choices: ({ n, r, index }) => {
    const R = r ** n;
    const whole = (v: number) => ({ tex: `${v}`, answer: `${v}` });
    const divided = R % n === 0 ? whole(R / n) : { tex: `\\tfrac{${R}}{${n}}`, answer: `${R}/${n}` };
    const sq = Math.sqrt(R);
    const rooted = Number.isInteger(sq) ? whole(sq) : { tex: `\\sqrt{${R}}`, answer: `sqrt(${R})` };
    return steered(options(whole(r), divided, whole(R), rooted, whole(r * n), whole(r + 1)).slice(0, 4), mix(n, r, index));
  },
  sample: (rng, difficulty) =>
    difficulty < 2
      ? { n: rng.int(2, 3), r: rng.int(2, 4), index: rng.int(0, W_ANGLES.length - 1) }
      : { n: rng.int(3, 6), r: rng.int(2, 3), index: rng.int(0, W_ANGLES.length - 1) },
  render: ({ n, r, index }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Every root of $z^{${n}} = w$ has the same modulus. What is it, for this $w$?` },
      { kind: 'display', tex: wDisplay(r ** n, index) },
    ],
    lead: '|z| =',
    keypad: SQRT_KEYS,
    answer: `${r}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, r }) => [
    { text: `Take the modulus of both sides: $|z^{${n}}| = |z|^{${n}}$, and that must equal $|w| = ${r ** n}$.` },
    { tex: `|z| = \\sqrt[${n}]{${r ** n}} = ${r}` },
    { text: 'The argument of $w$ plays no part here; it only decides where round the circle the roots sit.' },
  ],
};

interface RootArgParams { n: number; r: number; index: number; k: number }

/** θ_k = (φ + 2kπ)/n for φ = W_ANGLES[index], as a numerator over n·d. */
function rootAngle(n: number, index: number, k: number): { m: number; d: number } {
  const { k: p, d } = W_ANGLES[index];
  return { m: p + 2 * k * d, d: n * d };
}

/**
 * One root's argument from $\theta_k = \tfrac{\arg w + 2k\pi}{n}$, brought
 * inside $(-\pi, \pi]$.
 */
export const rootArgument: Generator<RootArgParams> = {
  id: 'root-argument',
  choices: ({ n, index, k }) => {
    const { m, d } = rootAngle(n, index, k);
    const { k: p, d: dw } = W_ANGLES[index];
    const ang = (mm: number, dd: number) => ({ tex: angleTex(mm, dd), answer: angleAnswer(mm, dd) });
    return steered(options(
      ang(principal(m, d), d),
      // 2kπ not divided by n; arg w not divided by n; k ignored; left unreduced.
      ang(principal(p + 2 * k * d, d), d),
      ang(principal(n * p + 2 * k * dw, d), d),
      ang(principal(p, d), d),
      ang(m, d),
      ang(principal(m + 2 * dw, d), d),
      ang(principal(m - 2 * dw, d), d),
      ang(principal(-m, d), d),
    ).slice(0, 4), mix(n, k, index));
  },
  sample: (rng, difficulty) => {
    const index = rng.int(1, W_ANGLES.length - 1);
    if (difficulty < 2) return { n: rng.int(2, 3), r: rng.int(2, 3), index, k: rng.int(0, 1) };
    const n = rng.int(2, 4);
    return { n, r: rng.int(2, 3), index, k: rng.int(1, n - 1) };
  },
  render: ({ n, r, index, k }) => {
    const { m, d } = rootAngle(n, index, k);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `The roots of $z^{${n}} = w$ have arguments $\\theta_k = \\tfrac{\\arg w + 2k\\pi}{${n}}$. Find $\\theta_{${k}}$ as a principal argument, for this $w$:`,
        },
        { kind: 'display', tex: wDisplay(r ** n, index) },
      ],
      lead: `\\theta_{${k}} =`,
      keypad: ANGLE_KEYS,
      answer: angleAnswer(principal(m, d), d),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ n, index, k }) => {
    const { k: p, d: dw } = W_ANGLES[index];
    const { m, d } = rootAngle(n, index, k);
    const raw = angleTex(m, d);
    const reduced = angleTex(principal(m, d), d);
    const steps: SolutionStep[] = [
      { text: 'Read the argument of $w$.', tex: `\\arg w = ${angleTex(p, dw)}` },
      {
        text: k === 0 ? `With $k = 0$ there is nothing to add: divide it by ${n}.` : `Add $${k} \\times 2\\pi$ and divide the whole thing by ${n}.`,
        tex: `\\theta_{${k}} = \\frac{${angleTex(p, dw)}${k === 0 ? '' : ` + ${angleTex(2 * k, 1)}`}}{${n}} = ${raw}`,
      },
    ];
    steps.push(
      raw === reduced
        ? { text: 'That is already between $-\\pi$ and $\\pi$.' }
        : { text: 'That is past $\\pi$, so take off a whole turn.', tex: `${raw} - 2\\pi = ${reduced}` },
    );
    return steps;
  },
};

interface RootArgsParams { n: number; r: number; index: number; bank: string[] }

/**
 * All n arguments at once, placed from a bank in any order.
 *
 * Asking for the whole set by typing would mean n answers in one box, which
 * the checker cannot grade; tiles grade a set naturally. The distractors are
 * the set's characteristic mistakes: arg w left undivided, a step of
 * $\tfrac{\pi}{n}$ instead of $\tfrac{2\pi}{n}$, and an argument past $\pi$
 * left unreduced.
 */
export const rootArgsTiles: Generator<RootArgsParams> = {
  id: 'root-args-tiles',
  sample: (rng, difficulty) => {
    const n = difficulty < 2 ? rng.int(2, 3) : rng.int(3, 4);
    const index = rng.int(1, W_ANGLES.length - 1);
    const { k: p, d: dw } = W_ANGLES[index];
    const D = n * dw;
    const correct = Array.from({ length: n }, (_, k) => angleTex(principal(p + 2 * k * dw, D), D));
    const raw = Array.from({ length: n }, (_, k) => angleTex(p + 2 * k * dw, D));
    const decoys = [
      angleTex(p, dw),
      angleTex(principal(p + dw, D), D),
      ...raw.filter((t) => !correct.includes(t)),
      angleTex(principal(-p, D), D),
      angleTex(principal(p + 3 * dw, D), D),
    ].filter((t, idx, all) => !correct.includes(t) && all.indexOf(t) === idx);
    return { n, r: rng.int(2, 3), index, bank: rng.shuffle([...correct, ...decoys.slice(0, 3)]) };
  },
  render: ({ n, r, index, bank }) => {
    const { k: p, d: dw } = W_ANGLES[index];
    const D = n * dw;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Place the principal arguments of ${n === 2 ? 'both' : `all ${n}`} roots of $z^{${n}} = w$, in any order.` },
        { kind: 'display', tex: wDisplay(r ** n, index) },
      ],
      template: `\\arg z = ${Array.from({ length: n }, (_, k) => `{${k}}`).join(',\\ ')}`,
      bank,
      answer: Array.from({ length: n }, (_, k) => angleTex(principal(p + 2 * k * dw, D), D)),
      unordered: true,
    };
  },
  solution: ({ n, index }) => {
    const { k: p, d: dw } = W_ANGLES[index];
    const D = n * dw;
    const list = Array.from({ length: n }, (_, k) => angleTex(principal(p + 2 * k * dw, D), D));
    return [
      {
        text: `Start from $\\tfrac{\\arg w}{${n}}$, then step round by $\\tfrac{2\\pi}{${n}}$ each time.`,
        tex: `\\frac{${angleTex(p, dw)}}{${n}} = ${angleTex(p, D)}, \\quad \\text{step } ${angleTex(2, n)}`,
      },
      {
        text: `Take ${n} steps' worth and bring anything past $\\pi$ back by a whole turn.`,
        tex: list.join(',\\ '),
      },
    ];
  },
};

/* ---------- The next root round, on the lattice ---------- */

type RotateMode = 'next' | 'previous' | 'opposite' | 'quadrant';

interface RotateParams { a: number; b: number; mode: RotateMode; quadrant: number }

const QUADRANT_NAMES = ['first', 'second', 'third', 'fourth'];

/** Which quadrant a point with both parts non-zero lies in, counted from 0. */
const quadrantOf = (x: number, y: number): number => (x > 0 ? (y > 0 ? 0 : 3) : y > 0 ? 1 : 2);

/**
 * The roots of $z^n = w$ are one root times each nth root of unity, so the
 * next root round is this one turned by $\tfrac{2\pi}{n}$. For n = 4 that is
 * a multiplication by $i$, which keeps a lattice point on the lattice.
 */
export const rootRotatePlot: Generator<RotateParams> = {
  id: 'root-rotate-plot',
  sample: (rng, difficulty) => {
    const top = difficulty < 2 ? 3 : RANGE;
    const a = rng.int(1, top) * rng.sign();
    const b = rng.int(1, top) * rng.sign();
    if (difficulty < 2) return { a, b, mode: rng.pick(['next', 'previous', 'opposite'] as const), quadrant: 0 };
    const own = quadrantOf(a, b);
    let quadrant = rng.int(0, 3);
    while (quadrant === own) quadrant = rng.int(0, 3);
    return { a, b, mode: rng.chance(0.6) ? 'quadrant' : rng.pick(['next', 'previous'] as const), quadrant };
  },
  render: ({ a, b, mode, quadrant }) => {
    const [wr, wi] = powersOf(a, b, 4)[3];
    const roots = quarterTurns(a, b);
    const target =
      mode === 'next' ? roots[1]
      : mode === 'previous' ? roots[3]
      : mode === 'opposite' ? roots[2]
      : roots.find(([x, y]) => quadrantOf(x, y) === quadrant)!;
    const ask = {
      next: 'Plot the next root anticlockwise from it.',
      previous: 'Plot the next root clockwise from it.',
      opposite: 'Plot the root opposite it, through the origin.',
      quadrant: `Plot the root in the ${QUADRANT_NAMES[quadrant]} quadrant.`,
    }[mode];
    return {
      kind: 'plot',
      prompt: [{ kind: 'prose', text: `$${complexTex(a, b)}$ is one root of $z^{4} = ${complexTex(wr, wi)}$. ${ask}` }],
      range: RANGE,
      answer: { re: target[0], im: target[1] },
    };
  },
  solution: ({ a, b, mode, quadrant }) => {
    const roots = quarterTurns(a, b);
    const steps: SolutionStep[] = [
      {
        // In prose rather than a display: four complex numbers on one line
        // run off the side of a phone, and prose wraps.
        text: `The four roots are this one times $1, i, -1$ and $-i$, a square about the origin: ${roots.map(([x, y]) => `$${complexTex(x, y)}$`).join(', ')}.`,
      },
    ];
    const which =
      mode === 'next' ? { at: 1, how: 'Multiplying by $i$ turns a quarter turn anticlockwise.' }
      : mode === 'previous' ? { at: 3, how: 'Multiplying by $-i$ turns a quarter turn clockwise.' }
      : mode === 'opposite' ? { at: 2, how: 'Multiplying by $-1$ turns half a turn, through the origin.' }
      : { at: roots.findIndex(([x, y]) => quadrantOf(x, y) === quadrant), how: `Pick the one whose signs put it in the ${QUADRANT_NAMES[quadrant]} quadrant.` };
    const [x, y] = roots[which.at];
    steps.push({ text: which.how, tex: `z = ${complexTex(x, y)}` });
    return steps;
  },
};

/* ====================================================================== */
/* Level 6: loci in the complex plane                                     */
/* ====================================================================== */

/**
 * How `z - a` is written inside a modulus or an argument.
 *
 * `bracket` keeps the fixed point whole, `z - (3 - 2i)`, so it can be read
 * straight off. `expanded` multiplies the minus through, `z - 3 + 2i`, which is
 * how a locus usually arrives and where the sign of the fixed point is lost. A
 * point with a zero part reads the same either way.
 */
type Shift = 'bracket' | 'expanded';

function shiftTex(p: number, q: number, style: Shift): string {
  if (style === 'bracket' && p !== 0 && q !== 0) return `z - (${complexTex(p, q)})`;
  let out = 'z';
  if (p !== 0) out += p > 0 ? ` - ${p}` : ` + ${-p}`;
  if (q !== 0) out += q > 0 ? ` - ${coeffTex(q)}` : ` + ${coeffTex(-q)}`;
  return out;
}

/** `|z - a|`, in either style. */
const distTex = (p: number, q: number, style: Shift): string => `|${shiftTex(p, q, style)}|`;

/** `\arg(z - a)`, with the bracket dropped when the half-line starts at the origin. */
const argTex = (p: number, q: number, style: Shift): string =>
  p === 0 && q === 0 ? '\\arg z' : `\\arg(${shiftTex(p, q, style)})`;

/** The two inequalities a region's boundary can be drawn with, each way round. */
type Rel = '<' | '\\le' | '>' | '\\ge';
const RELS: Rel[] = ['<', '\\le', '>', '\\ge'];
const FLIPPED: Record<Rel, Rel> = { '<': '>', '\\le': '\\ge', '>': '<', '\\ge': '\\le' };
const TOGGLED: Record<Rel, Rel> = { '<': '\\le', '\\le': '<', '>': '\\ge', '\\ge': '>' };
const strict = (rel: Rel): boolean => rel === '<' || rel === '>';
const below = (rel: Rel): boolean => rel === '<' || rel === '\\le';

/** Whether a squared distance `d` against a squared bound `e` satisfies the inequality. */
function holds(d: number, rel: Rel, e: number): boolean {
  return rel === '<' ? d < e : rel === '\\le' ? d <= e : rel === '>' ? d > e : d >= e;
}

const squared = (x: number, y: number): number => x * x + y * y;

/** `y - 3`, `x + 2`, or the bare letter when there is nothing to take off. */
const less = (v: string, c: number): string => (c === 0 ? v : `${v} ${c > 0 ? '-' : '+'} ${Math.abs(c)}`);

/** `(x - p)^2`, or `x^2` when there is nothing to take off. */
const squareTex = (v: string, p: number): string =>
  p === 0 ? `${v}^2` : `(${v} ${p > 0 ? '-' : '+'} ${Math.abs(p)})^2`;

/**
 * The Cartesian equation of the circle centre p + qi, radius r: completed
 * (`square`), or multiplied out with the constant moved across (`expanded`),
 * which is the form that has to be completed to be read.
 */
function cartesianTex(p: number, q: number, r: number, form: 'square' | 'expanded'): string {
  if (form === 'square') return `${squareTex('x', p)} + ${squareTex('y', q)} = ${r * r}`;
  const term = (coef: number, v: string) => (coef === 0 ? '' : ` ${coef > 0 ? '+' : '-'} ${Math.abs(coef)}${v}`);
  return `x^2 + y^2${term(-2 * p, 'x')}${term(-2 * q, 'y')} = ${r * r - p * p - q * q}`;
}

/** `mx + c` as written by hand, and as mathjs reads it. */
function lineTex(m: number, c: number): string {
  const head = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '-x' : `${m}x`;
  if (head === '') return `${c}`;
  return c === 0 ? head : c > 0 ? `${head} + ${c}` : `${head} - ${-c}`;
}
const lineAnswer = (m: number, c: number): string => `(${m})*x + (${c})`;

/** The keypad for a line typed as `y = ...`. */
const X_KEY: KeypadKey[] = [{ insert: 'x', tex: true }];

/** Where `ANGLES` holds the direction of a whole number of eighths of a turn. */
const eighth = (turns: number): number => mod(turns, 8);

/** The grid's side in SVG units: the plane's viewBox less its margin on both sides. */
const [VIEW_MIN, , VIEW_EXTENT] = PLANE_VIEWBOX.split(' ').map(Number);
const GRID_SIZE = VIEW_EXTENT + 2 * VIEW_MIN;

/**
 * The span a wide locus figure covers, in the plane's own units and margin
 * included: what a slider figure's `xMin` and `xMax` have to be for the
 * marker to land on the gridline it names.
 */
function planeSpan(range: number): { xMin: number; xMax: number } {
  const edge = (range * VIEW_EXTENT) / GRID_SIZE;
  return { xMin: -edge, xMax: edge };
}

interface LocusFigure {
  range: number;
  /** Circles; dashed where the boundary is not part of the locus. */
  circles?: { re: number; im: number; r: number; dashed?: boolean }[];
  /** A disc shaded, or everything outside it. */
  discs?: { re: number; im: number; r: number; outside?: boolean }[];
  /** Whole lines through a point, in a direction. */
  lines?: { re: number; im: number; dx: number; dy: number; dashed?: boolean }[];
  /** Half-lines from a point. Mark the start open with a point, since it is not on the locus. */
  rays?: { re: number; im: number; dx: number; dy: number; dashed?: boolean }[];
  /** The side of a line holding `toward`, shaded. */
  halves?: { re: number; im: number; dx: number; dy: number; toward: [number, number] }[];
  /** A wedge from an apex, turning anticlockwise from `from` to `to` eighths of a turn. */
  wedges?: { re: number; im: number; from: number; to: number }[];
  /** Dashed construction lines. */
  segments?: [[number, number], [number, number]][];
  points?: { re: number; im: number; label?: string; highlight?: boolean; open?: boolean }[];
  /**
   * Fill the width rather than stopping at the plane's usual size, for a
   * slider figure: its marker is laid across the whole element, so the
   * drawing has to be the whole element too.
   */
  wide?: boolean;
}

/**
 * A locus drawn over the complex plane: circles, lines, half-lines and
 * shaded regions, with the fixed points marked.
 *
 * Built on the plane's own grid (`planeGridSvg`) and frame, so a point drawn
 * here sits exactly where `complexPlaneSvg` and the plot widget would put it.
 * Everything but the points is clipped to the grid, which lets lines and
 * regions be drawn simply as running far past the edge.
 */
export function locusSvg(figure: LocusFigure): string {
  const { range } = figure;
  const unit = GRID_SIZE / (2 * range);
  const far = 4 * range;
  const at = (re: number, im: number) => pointPosition({ re, im }, range);
  const xy = (re: number, im: number): string => {
    const { x, y } = at(re, im);
    return `${+x.toFixed(2)},${+y.toFixed(2)}`;
  };
  const unitDir = (dx: number, dy: number): [number, number] => {
    const len = Math.hypot(dx, dy);
    return [dx / len, dy / len];
  };
  // A slider draws its marker in the accent colour, so a locus beside it is
  // drawn plain, or the two read as one thing.
  const LOCUS = `stroke="${figure.wide ? 'var(--text-soft)' : 'var(--accent)'}" stroke-width="2.2" fill="none"`;
  const SHADE = 'fill="var(--accent)" fill-opacity="0.2" stroke="none"';
  const DASH = ' stroke-dasharray="6 4"';

  const shaded: string[] = [];
  for (const d of figure.discs ?? []) {
    const { x, y } = at(d.re, d.im);
    const rr = d.r * unit;
    shaded.push(
      d.outside
        ? `<path d="M0,0H${GRID_SIZE}V${GRID_SIZE}H0Z M${x - rr},${y} a${rr},${rr} 0 1,0 ${2 * rr},0 a${rr},${rr} 0 1,0 ${-2 * rr},0Z" fill-rule="evenodd" ${SHADE}/>`
        : `<circle cx="${x}" cy="${y}" r="${rr}" ${SHADE}/>`,
    );
  }
  for (const h of figure.halves ?? []) {
    const [ux, uy] = unitDir(h.dx, h.dy);
    const side = (h.toward[0] - h.re) * -uy + (h.toward[1] - h.im) * ux > 0 ? 1 : -1;
    const [nx, ny] = [-uy * side, ux * side];
    const corners = [
      [h.re - far * ux, h.im - far * uy],
      [h.re + far * ux, h.im + far * uy],
      [h.re + far * ux + far * nx, h.im + far * uy + far * ny],
      [h.re - far * ux + far * nx, h.im - far * uy + far * ny],
    ];
    shaded.push(`<polygon points="${corners.map(([a, b]) => xy(a, b)).join(' ')}" ${SHADE}/>`);
  }
  for (const w of figure.wedges ?? []) {
    const corners = [xy(w.re, w.im)];
    for (let k = w.from; k <= w.to; k += 1) {
      const t = (k * Math.PI) / 4;
      corners.push(xy(w.re + far * Math.cos(t), w.im + far * Math.sin(t)));
    }
    shaded.push(`<polygon points="${corners.join(' ')}" ${SHADE}/>`);
  }

  const drawn: string[] = [];
  for (const [[x1, y1], [x2, y2]] of figure.segments ?? []) {
    const a = at(x1, y1);
    const b = at(x2, y2);
    drawn.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="var(--text-dim)" stroke-width="1.4"${DASH}/>`);
  }
  for (const c of figure.circles ?? []) {
    const { x, y } = at(c.re, c.im);
    drawn.push(`<circle cx="${x}" cy="${y}" r="${c.r * unit}" ${LOCUS}${c.dashed ? DASH : ''}/>`);
  }
  for (const l of figure.lines ?? []) {
    const [ux, uy] = unitDir(l.dx, l.dy);
    const [a, b] = [xy(l.re - far * ux, l.im - far * uy), xy(l.re + far * ux, l.im + far * uy)];
    drawn.push(`<polyline points="${a} ${b}" ${LOCUS}${l.dashed ? DASH : ''}/>`);
  }
  for (const r of figure.rays ?? []) {
    const [ux, uy] = unitDir(r.dx, r.dy);
    drawn.push(`<polyline points="${xy(r.re, r.im)} ${xy(r.re + far * ux, r.im + far * uy)}" ${LOCUS}${r.dashed ? DASH : ''}/>`);
  }

  const marks: string[] = [];
  for (const p of figure.points ?? []) {
    const { x, y } = at(p.re, p.im);
    marks.push(
      p.open
        ? `<circle cx="${x}" cy="${y}" r="5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2.2"/>`
        : `<circle cx="${x}" cy="${y}" r="${p.highlight ? 5.5 : 4.5}" fill="${p.highlight ? 'var(--accent)' : 'var(--text)'}"/>`,
    );
    if (p.label) {
      marks.push(
        `<text x="${x + 9}" y="${y - 9}" fill="var(--text)" font-size="15" font-style="italic" text-anchor="middle" dominant-baseline="central">${p.label}</text>`,
      );
    }
  }

  const clip = `locus-clip-${range}`;
  const grid = planeGridSvg(range).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const width = figure.wide ? '' : ` style="max-width:${VIEW_EXTENT}px"`;
  return (
    `<svg viewBox="${PLANE_VIEWBOX}" width="100%"${width} role="img" aria-label="A locus on the complex plane">` +
    `<defs><clipPath id="${clip}"><rect x="0" y="0" width="${GRID_SIZE}" height="${GRID_SIZE}"/></clipPath></defs>` +
    `${grid}<g clip-path="url(#${clip})">${shaded.join('')}${drawn.join('')}</g>${marks.join('')}</svg>`
  );
}

/** A lattice point in [-top, top] squared that is not the origin. */
function offOrigin(rng: Rng, top: number): [number, number] {
  let p = rng.int(-top, top);
  let q = rng.int(-top, top);
  while (p === 0 && q === 0) {
    p = rng.int(-top, top);
    q = rng.int(-top, top);
  }
  return [p, q];
}

/* ---------- Circles: the centre, tapped ---------- */

interface CircleCentreParams { p: number; q: number; r: number; style: Shift; reversed: boolean }

/**
 * $|z - a| = r$ read as a centre. Difficulty 1 writes the centre in a bracket
 * with both parts non-zero; difficulty 2 multiplies the minus through, and
 * sometimes writes the difference the other way round, $|a - z|$, which is
 * the same distance.
 */
export const locusCircleCentre: Generator<CircleCentreParams> = {
  id: 'locus-circle-centre',
  sample: (rng, difficulty) => {
    if (difficulty < 2) {
      return { p: nonZero(rng, 3), q: nonZero(rng, 3), r: rng.int(1, 5), style: 'bracket', reversed: false };
    }
    const [p, q] = offOrigin(rng, RANGE);
    return { p, q, r: rng.int(1, 5), style: 'expanded', reversed: rng.chance(0.3) };
  },
  render: ({ p, q, r, style, reversed }) => ({
    kind: 'plot',
    prompt: [
      {
        kind: 'prose',
        text: `The locus $${reversed ? `|${complexTex(p, q)} - z|` : distTex(p, q, style)} = ${r}$ is a circle. Tap its centre.`,
      },
    ],
    range: RANGE,
    answer: { re: p, im: q },
  }),
  solution: ({ p, q, r, style, reversed }) => {
    const steps: SolutionStep[] = [];
    if (reversed) {
      steps.push({
        text: `The distance from $a$ to $z$ is the distance from $z$ to $a$, so turn the difference round: $|${complexTex(p, q)} - z|$ is`,
        tex: `|${shiftTex(p, q, 'bracket')}|`,
      });
    } else if (style === 'expanded' && p !== 0 && q !== 0) {
      steps.push({
        text: 'Gather the constant into one bracket, with the minus sign outside it.',
        tex: `${shiftTex(p, q, 'expanded')} = ${shiftTex(p, q, 'bracket')}`,
      });
    }
    steps.push({
      text: `$|z - a|$ is the distance from $z$ to $a$, so the locus is every point exactly ${r} from $${complexTex(p, q)}$: a circle about it.`,
      tex: `a = ${complexTex(p, q)} \\rightarrow (${p},\\ ${q})`,
    });
    return steps;
  },
};

/* ---------- Circles: the radius, slid out from the centre ---------- */

interface CircleRadiusParams { p: number; q: number; r: number; k: number }

/** `|kz - ka|`, the modulus a scaled circle arrives in. */
function scaledShiftTex(k: number, p: number, q: number): string {
  let out = `${k}z`;
  if (p !== 0) out += p > 0 ? ` - ${k * p}` : ` + ${-k * p}`;
  if (q !== 0) out += q > 0 ? ` - ${k * q}i` : ` + ${-k * q}i`;
  return `|${out}|`;
}

/**
 * The radius as a length, measured by sliding a marker out from the centre.
 *
 * At difficulty 1 the circle is drawn and the question is what $r$ means. At
 * difficulty 2 only the centre is marked, and the equation arrives as
 * $|kz - ka| = kr$, so the $k$ has to come out before the radius can be read.
 */
export const locusCircleRadius: Generator<CircleRadiusParams> = {
  id: 'locus-circle-radius',
  sample: (rng, difficulty) => {
    const r = difficulty < 2 ? rng.int(2, 4) : rng.int(1, 4);
    const top = 5 - r;
    let p = rng.int(-top, top);
    let q = rng.int(-top, top);
    while (p === 0 && q === 0) {
      p = rng.int(-top, top);
      q = rng.int(-top, top);
    }
    return { p, q, r, k: difficulty < 2 ? 1 : rng.int(2, 3) };
  },
  render: ({ p, q, r, k }) => ({
    kind: 'slider',
    // Short, like every slider prompt in this level: the figure is full
    // width, and a long prompt pushes the slider under the Check button.
    prompt: k === 1
      ? [{ kind: 'prose', text: 'This circle is $|z - a| = r$. Slide out from the marked centre to the circle to find $r$.' }]
      : [
          { kind: 'prose', text: 'Slide out from the marked centre to the radius of' },
          { kind: 'display', tex: `${scaledShiftTex(k, p, q)} = ${k * r}` },
        ],
    figure: {
      svg: locusSvg({
        range: 5,
        circles: k === 1 ? [{ re: p, im: q, r }] : [],
        points: [{ re: p, im: q }],
        wide: true,
      }),
      ...planeSpan(5),
      origin: p,
    },
    min: 0,
    max: 5,
    step: 1,
    answer: r,
    readout: 'r = {v}',
  }),
  solution: ({ p, q, r, k }) =>
    k === 1
      ? [
          {
            text: `Every point on the circle is the same distance from the centre, and that distance is $r$. Count across from $${complexTex(p, q)}$ to the edge.`,
            tex: `r = ${r}`,
          },
        ]
      : [
          {
            text: `Take the ${k} out of the modulus, since $|${k}w| = ${k}|w|$ for any $w$. So $${scaledShiftTex(k, p, q)}$ is`,
            tex: `${k}|${shiftTex(p, q, 'bracket')}|`,
          },
          {
            text: `So $${k}|${shiftTex(p, q, 'bracket')}| = ${k * r}$, and dividing by ${k} leaves the radius.`,
            tex: `|${shiftTex(p, q, 'bracket')}| = ${r}`,
          },
        ],
};

/* ---------- Circles: the equation, assembled from a picture ---------- */

interface CircleTilesParams { p: number; q: number; r: number }

/**
 * Write the circle drawn. The bank holds the centre with its signs lost, with
 * its parts swapped, and the radius squared and doubled.
 */
export const locusCircleTiles: Generator<CircleTilesParams> = {
  id: 'locus-circle-tiles',
  sample: (rng, difficulty) => {
    const r = difficulty < 2 ? rng.int(1, 3) : rng.int(2, 4);
    const top = 5 - r;
    return { p: nonZero(rng, top), q: nonZero(rng, top), r };
  },
  render: ({ p, q, r }) => {
    const bank = [...new Set([
      complexTex(p, q), complexTex(-p, -q), complexTex(q, p), `${r}`, `${r * r}`, `${2 * r}`,
    ])].sort();
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Complete the equation of this circle.' },
        {
          kind: 'diagram',
          svg: locusSvg({ range: 5, circles: [{ re: p, im: q, r }], points: [{ re: p, im: q }] }),
        },
      ],
      template: '|z - ({0})| = {1}',
      bank,
      answer: [complexTex(p, q), `${r}`],
    };
  },
  solution: ({ p, q, r }) => [
    {
      text: `The centre is at $(${p}, ${q})$, which is $${complexTex(p, q)}$, and the circle runs ${r} from it in every direction.`,
    },
    {
      text: 'The centre goes into the bracket with its own signs: the minus in front of the bracket is what turns it into a distance from that point.',
      tex: `|z - (${complexTex(p, q)})| = ${r}`,
    },
  ],
};

/* ---------- Circles: the radius through a given point ---------- */

interface CircleThroughParams { p: number; q: number; dx: number; dy: number }

/**
 * The radius as the distance from the centre to a point on the circle, which
 * is a modulus. Difficulty 1 keeps it whole (a 3-4-5 step, or straight along a
 * grid line); difficulty 2 answers with a surd as often as not.
 */
export const locusCircleThrough: Generator<CircleThroughParams> = {
  id: 'locus-circle-through',
  choices: ({ p, q, dx, dy }) => steered(modulusChoices(dx, dy), mix(p, q, dx, dy)),
  sample: (rng, difficulty) => {
    const [p, q] = offOrigin(rng, 3);
    if (difficulty < 2) {
      const k = rng.int(2, 5);
      const [dx, dy] = rng.pick([[3, 4], [4, 3], [k, 0], [0, k]] as [number, number][]);
      return { p, q, dx: dx * rng.sign() || 0, dy: dy * rng.sign() || 0 };
    }
    let dx = rng.int(-5, 5);
    let dy = rng.int(-5, 5);
    while (dx === 0 || dy === 0 || (Math.abs(dx) === 1 && Math.abs(dy) === 1)) {
      dx = rng.int(-5, 5);
      dy = rng.int(-5, 5);
    }
    return { p, q, dx, dy };
  },
  render: ({ p, q, dx, dy }) => {
    const n = squared(dx, dy);
    const simplified = surdAnswer(n);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `A circle centred at $${complexTex(p, q)}$ passes through $${complexTex(p + dx, q + dy)}$. Its equation is $|z - (${complexTex(p, q)})| = r$. What is $r$, exactly?`,
        },
      ],
      lead: 'r =',
      keypad: SQRT_KEYS,
      answer: `sqrt(${n})`,
      alsoAccepts: simplified === `sqrt(${n})` ? undefined : [simplified],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ p, q, dx, dy }) => {
    const n = squared(dx, dy);
    const tail = surdTex(n) === `\\sqrt{${n}}` ? '' : ` = ${surdTex(n)}`;
    return [
      {
        text: `The radius is the distance from the centre to any point on the circle, and a distance between two numbers is the modulus of their difference: $(${complexTex(p + dx, q + dy)}) - (${complexTex(p, q)}) = ${complexTex(dx, dy)}$.`,
        tex: `r = |${complexTex(dx, dy)}|`,
      },
      {
        text: 'Pythagoras on the two parts of the difference:',
        tex: `r = \\sqrt{${paren(`${dx}`)}^2 + ${paren(`${dy}`)}^2}`,
      },
      { tex: `= \\sqrt{${n}}${tail}` },
    ];
  },
};

/* ---------- Perpendicular bisectors: the midpoint ---------- */

interface PairParams { a1: number; a2: number; b1: number; b2: number; style: Shift }

/** Two distinct lattice points whose midpoint is a lattice point too. */
function samplePair(rng: Rng, top: number): [number, number, number, number] {
  for (;;) {
    const a1 = rng.int(-top, top);
    const a2 = rng.int(-top, top);
    const b1 = rng.int(-top, top);
    const b2 = rng.int(-top, top);
    if ((a1 === b1 && a2 === b2) || (a1 + b1) % 2 !== 0 || (a2 + b2) % 2 !== 0) continue;
    return [a1, a2, b1, b2];
  }
}

/**
 * $|z - a| = |z - b|$ has two fixed points in it, and the line is the set of
 * points the same distance from both. The one place that is easy to name
 * exactly is the midpoint of the segment between them.
 */
export const locusBisectorMidpoint: Generator<PairParams> = {
  id: 'locus-bisector-midpoint',
  sample: (rng, difficulty) => {
    const [a1, a2, b1, b2] = samplePair(rng, difficulty < 2 ? 3 : RANGE);
    return { a1, a2, b1, b2, style: difficulty < 2 ? 'bracket' : 'expanded' };
  },
  render: ({ a1, a2, b1, b2, style }) => ({
    kind: 'plot',
    prompt: [
      {
        kind: 'prose',
        text: `The locus $${distTex(a1, a2, style)} = ${distTex(b1, b2, style)}$ is a straight line. Tap the point on it midway between the two fixed points.`,
      },
    ],
    range: RANGE,
    answer: { re: (a1 + b1) / 2, im: (a2 + b2) / 2 },
  }),
  solution: ({ a1, a2, b1, b2 }) => [
    {
      text: `The two fixed points are $${complexTex(a1, a2)}$ and $${complexTex(b1, b2)}$. Every point on the line is equally far from both, which makes it the perpendicular bisector of the segment between them.`,
    },
    {
      text: 'The bisector crosses the segment at its midpoint: average the real parts and the imaginary parts.',
      tex: `\\text{real: } \\tfrac{${a1} + ${paren(`${b1}`)}}{2} = ${(a1 + b1) / 2}`,
    },
    { tex: `\\text{imaginary: } \\tfrac{${a2} + ${paren(`${b2}`)}}{2} = ${(a2 + b2) / 2}` },
    { text: 'So the midpoint is', tex: complexTex((a1 + b1) / 2, (a2 + b2) / 2) },
  ],
};

/* ---------- Perpendicular bisectors: the Cartesian equation ---------- */

interface BisectorLineParams { a1: number; a2: number; dx: number; dy: number }

/** The gradient and intercept of the bisector, whole by construction. */
function bisectorOf({ a1, a2, dx, dy }: BisectorLineParams): { m: number; c: number; mx: number; my: number } {
  const mx = a1 + dx / 2;
  const my = a2 + dy / 2;
  const m = -dx / dy;
  return { m, c: my - m * mx, mx, my };
}

/**
 * The bisector as $y = mx + c$, for pairs where that comes out whole: the
 * segment from a to b rises by an even amount, and runs across by a whole
 * multiple of its rise, so the perpendicular gradient is a whole number and
 * the midpoint a lattice point. A vertical bisector has no $y = $ form and is
 * never drawn.
 */
export const locusBisectorLine: Generator<BisectorLineParams> = {
  id: 'locus-bisector-line',
  choices: (params) => {
    const { a1, a2 } = params;
    const { m, c, mx, my } = bisectorOf(params);
    const opt = (g: number, k: number) => ({ tex: `y = ${lineTex(g, k)}`, answer: lineAnswer(g, k) });
    // Through a or b instead of the midpoint, the gradient's sign lost, the
    // intercept's sign lost.
    const [b1, b2] = [a1 + params.dx, a2 + params.dy];
    return steered(
      options(opt(m, c), opt(m, a2 - m * a1), opt(-m, my + m * mx), opt(m, -c), opt(m, b2 - m * b1)).slice(0, 4),
      mix(a1, a2, params.dx, params.dy),
    );
  },
  sample: (rng, difficulty) => {
    const m = difficulty < 2 ? rng.int(-1, 1) : rng.int(-2, 2);
    const dy = (difficulty >= 2 && Math.abs(m) < 2 ? rng.pick([2, 4]) : 2) * rng.sign();
    const dx = -m * dy || 0;
    for (;;) {
      const a1 = rng.int(-3, 3);
      const a2 = rng.int(-3, 3);
      if (Math.abs(a1 + dx) <= 5 && Math.abs(a2 + dy) <= 5) return { a1, a2, dx, dy };
    }
  },
  render: (params) => {
    const { a1, a2, dx, dy } = params;
    const { m, c } = bisectorOf(params);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'display', tex: `${distTex(a1, a2, 'bracket')} = ${distTex(a1 + dx, a2 + dy, 'bracket')}` },
        { kind: 'prose', text: 'This locus is a straight line. With $z = x + iy$, what is its equation?' },
      ],
      lead: 'y =',
      keypad: X_KEY,
      answer: lineAnswer(m, c),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a1, a2, dx, dy } = params;
    const { m, c, mx, my } = bisectorOf(params);
    return [
      {
        text: `The line is the perpendicular bisector of the segment from $${complexTex(a1, a2)}$ to $${complexTex(a1 + dx, a2 + dy)}$, so it passes through the midpoint $(${mx}, ${my})$.`,
      },
      {
        text: dx === 0
          ? 'The segment is vertical, so the bisector is horizontal.'
          : `The segment has gradient $\\tfrac{${dy}}{${dx}}$. A perpendicular gradient multiplies with it to $-1$.`,
        tex: `m = ${m}`,
      },
      {
        text: m === 0
          ? `Through $(${mx}, ${my})$ and level, it is:`
          : `Through $(${mx}, ${my})$ with gradient ${m}: $${less('y', my)} = ${m === 1 ? '' : m === -1 ? '-' : m}(${less('x', mx)})$, which rearranges to`,
        tex: `y = ${lineTex(m, c)}`,
      },
    ];
  },
};

/* ---------- Perpendicular bisectors: which side is a point on? ---------- */

interface SideParams { a1: number; a2: number; b1: number; b2: number; w1: number; w2: number; style: Shift }

/**
 * The bisector splits the plane into the points nearer a and the points
 * nearer b, and deciding which is a comparison of two squared distances. The
 * three outcomes are drawn about equally often, so "on the line" is not a
 * rarity to be ruled out.
 */
export const locusBisectorSide: Generator<SideParams> = {
  id: 'locus-bisector-side',
  sample: (rng, difficulty) => {
    const top = difficulty < 2 ? 3 : RANGE;
    const want = rng.pick(['on', 'a', 'b'] as const);
    for (;;) {
      const [a1, a2, b1, b2, w1, w2] = Array.from({ length: 6 }, () => rng.int(-top, top));
      if (a1 === b1 && a2 === b2) continue;
      if ((w1 === a1 && w2 === a2) || (w1 === b1 && w2 === b2)) continue;
      const da = squared(w1 - a1, w2 - a2);
      const db = squared(w1 - b1, w2 - b2);
      const side = da === db ? 'on' : da < db ? 'a' : 'b';
      if (side === want) return { a1, a2, b1, b2, w1, w2, style: difficulty < 2 ? 'bracket' : 'expanded' };
    }
  },
  render: ({ a1, a2, b1, b2, w1, w2, style }) => {
    const da = squared(w1 - a1, w2 - a2);
    const db = squared(w1 - b1, w2 - b2);
    return choiceSlide(
      [
        { kind: 'prose', text: 'This line splits the plane in two:' },
        { kind: 'display', tex: `${distTex(a1, a2, style)} = ${distTex(b1, b2, style)}` },
        { kind: 'prose', text: `Where is $w = ${complexTex(w1, w2)}$?` },
      ],
      [
        { tex: `\\text{nearer } ${complexTex(a1, a2)}`, correct: da < db },
        { tex: `\\text{nearer } ${complexTex(b1, b2)}`, correct: db < da },
        { tex: '\\text{on the line}', correct: da === db },
      ],
      mix(a1, a2, b1, b2, w1, w2),
    );
  },
  solution: ({ a1, a2, b1, b2, w1, w2 }) => {
    const da = squared(w1 - a1, w2 - a2);
    const db = squared(w1 - b1, w2 - b2);
    return [
      {
        text: `Compare the squared distances from $w$ to each fixed point; squaring keeps the order and avoids the roots. To $${complexTex(a1, a2)}$:`,
        tex: `|${complexTex(w1 - a1, w2 - a2)}|^2 = ${da}`,
      },
      { text: `To $${complexTex(b1, b2)}$:`, tex: `|${complexTex(w1 - b1, w2 - b2)}|^2 = ${db}` },
      {
        text: da === db
          ? 'They are equal, so $w$ is on the line.'
          : `$w$ is nearer $${da < db ? complexTex(a1, a2) : complexTex(b1, b2)}$.`,
      },
    ];
  },
};

/* ---------- Perpendicular bisectors: where one crosses the real axis ---------- */

interface CrossingParams { a1: number; a2: number; b1: number; b2: number }

/**
 * The one real number the same distance from a and b. On the real axis
 * $z = x$, and the equation is linear once the $x^2$ terms cancel; only pairs
 * where the crossing is whole and on the grid are drawn.
 */
export const locusBisectorCrossing: Generator<CrossingParams> = {
  id: 'locus-bisector-crossing',
  sample: (rng, difficulty) => {
    const top = difficulty < 2 ? 3 : RANGE;
    for (;;) {
      const [a1, a2, b1, b2] = Array.from({ length: 4 }, () => rng.int(-top, top));
      if (a1 === b1 || (a2 === 0 && b2 === 0)) continue;
      const num = squared(b1, b2) - squared(a1, a2);
      const den = 2 * (b1 - a1);
      if (num % den !== 0 || Math.abs(num / den) > RANGE) continue;
      return { a1, a2, b1, b2 };
    }
  },
  render: ({ a1, a2, b1, b2 }) => ({
    kind: 'slider',
    prompt: [
      { kind: 'prose', text: 'Slide to where this line crosses the real axis:' },
      { kind: 'display', tex: `${distTex(a1, a2, 'expanded')} = ${distTex(b1, b2, 'expanded')}` },
    ],
    figure: {
      svg: locusSvg({
        range: RANGE,
        segments: [[[a1, a2], [b1, b2]]],
        points: [{ re: a1, im: a2 }, { re: b1, im: b2 }],
        wide: true,
      }),
      ...planeSpan(RANGE),
    },
    min: -RANGE,
    max: RANGE,
    step: 1,
    answer: (squared(b1, b2) - squared(a1, a2)) / (2 * (b1 - a1)) + 0,
    readout: 'x = {v}',
  }),
  solution: ({ a1, a2, b1, b2 }) => {
    const num = squared(b1, b2) - squared(a1, a2);
    const den = 2 * (b1 - a1);
    return [
      {
        text: 'On the real axis $z = x$. It is on the line when it is as far from one point as the other:',
        tex: `${squareTex('x', a1)} + ${a2 * a2} = ${squareTex('x', b1)} + ${b2 * b2}`,
      },
      {
        text: 'The $x^2$ on each side cancel, which leaves a linear equation.',
        tex: `${den}x = ${num} \\;\\Rightarrow\\; x = ${num / den + 0}`,
      },
    ];
  },
};

/* ---------- Half-lines: a point along one ---------- */

type AlongAsk = 'distance' | 'real' | 'imag';

interface HalfPointParams { p: number; q: number; index: number; k: number; ask: AlongAsk; style: Shift }

/**
 * $\arg(z - a) = \theta$ starts at a and heads off at angle $\theta$. A point
 * along it is named in a way that has one answer: a distance for a half-line
 * along a grid line, a real or imaginary part for a diagonal one, whose
 * distances are multiples of $\sqrt{2}$.
 */
export const locusHalflinePoint: Generator<HalfPointParams> = {
  id: 'locus-halfline-point',
  sample: (rng, difficulty) => {
    const index = rng.int(0, ANGLES.length - 1);
    const { re, im } = ANGLES[index];
    const ask: AlongAsk = re !== 0 && im !== 0 ? rng.pick(['real', 'imag'] as const) : 'distance';
    for (;;) {
      const p = rng.int(-3, 3);
      const q = rng.int(-3, 3);
      const k = rng.int(1, 4);
      if (Math.abs(p + k * re) > RANGE || Math.abs(q + k * im) > RANGE) continue;
      return { p, q, index, k, ask, style: difficulty < 2 ? 'bracket' : 'expanded' };
    }
  },
  render: ({ p, q, index, k, ask, style }) => {
    const { re, im, tex } = ANGLES[index];
    const which = {
      distance: `that is ${k} from where it starts`,
      real: `with real part $${p + k * re}$`,
      imag: `with imaginary part $${q + k * im}$`,
    }[ask];
    return {
      kind: 'plot',
      prompt: [{ kind: 'prose', text: `Tap the point on the half-line $${argTex(p, q, style)} = ${tex}$ ${which}.` }],
      range: RANGE,
      answer: { re: p + k * re, im: q + k * im },
    };
  },
  solution: ({ p, q, index, k }) => {
    const { re, im, tex } = ANGLES[index];
    return [
      {
        text: `The half-line starts at $${complexTex(p, q)}$ and heads off at angle $${tex}$, which is the direction of $${complexTex(re, im)}$.`,
      },
      {
        text: `Take ${k} of those steps from the start: $${complexTex(p, q)} + ${k}(${complexTex(re, im)})$.`,
        tex: `z = ${complexTex(p + k * re, q + k * im)}`,
      },
    ];
  },
};

/* ---------- Half-lines: the equation, assembled from a picture ---------- */

interface HalfTilesParams { p: number; q: number; index: number }

/**
 * Write the half-line drawn. The bank holds the start with its signs lost, a
 * point further along (which is on the half-line but is not where it starts),
 * the opposite angle, the angle reflected in the real axis, and a quarter turn
 * on.
 */
export const locusHalflineTiles: Generator<HalfTilesParams> = {
  id: 'locus-halfline-tiles',
  sample: (rng, difficulty) => {
    const [p, q] = offOrigin(rng, difficulty < 2 ? 2 : 3);
    return { p, q, index: rng.int(0, ANGLES.length - 1) };
  },
  render: ({ p, q, index }) => {
    const { re, im, tex } = ANGLES[index];
    const bank = [...new Set([
      complexTex(p, q), complexTex(-p, -q), complexTex(p + re, q + im),
      tex, ANGLES[eighth(index + 4)].tex, ANGLES[eighth(-index)].tex, ANGLES[eighth(index + 2)].tex,
    ])].sort();
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Complete the equation of this half-line. The open circle is where it starts.' },
        {
          kind: 'diagram',
          svg: locusSvg({ range: RANGE, rays: [{ re: p, im: q, dx: re, dy: im }], points: [{ re: p, im: q, open: true }] }),
        },
      ],
      template: '\\arg(z - ({0})) = {1}',
      bank,
      answer: [complexTex(p, q), tex],
    };
  },
  solution: ({ p, q, index }) => {
    const { re, im, tex } = ANGLES[index];
    return [
      {
        text: `It starts at $(${p}, ${q})$, which is $${complexTex(p, q)}$. That goes in the bracket with its own signs.`,
      },
      {
        text: `It heads in the direction of $${complexTex(re, im)}$, measured anticlockwise from the positive real direction.`,
        tex: `\\arg(z - (${complexTex(p, q)})) = ${tex}`,
      },
    ];
  },
};

/* ---------- Half-lines: which point is on one? ---------- */

interface HalfThroughParams { p: number; q: number; index: number; k: number; style: Shift }

/** Whether w lies on the half-line from a in the direction (re, im), start excluded. */
function onRay(w: [number, number], a: [number, number], re: number, im: number): boolean {
  const vx = w[0] - a[0];
  const vy = w[1] - a[1];
  return vx * im - vy * re === 0 && vx * re + vy * im > 0;
}

/**
 * The half in half-line. The distractors are the same distance back the other
 * way (on the whole line, but at the opposite angle), the same step taken from
 * the origin instead of the start, and the step taken at $-\theta$ or a
 * quarter turn on.
 */
export const locusHalflineThrough: Generator<HalfThroughParams> = {
  id: 'locus-halfline-through',
  sample: (rng, difficulty) => {
    const [p, q] = offOrigin(rng, 3);
    return { p, q, index: rng.int(0, ANGLES.length - 1), k: rng.int(1, 3), style: difficulty < 2 ? 'bracket' : 'expanded' };
  },
  render: ({ p, q, index, k, style }) => {
    const { re, im, tex } = ANGLES[index];
    const start: [number, number] = [p, q];
    const candidates: [number, number][] = [
      [p + k * re, q + k * im],
      [p - k * re, q - k * im],
      [k * re, k * im],
      [p + k * re, q - k * im],
      [p - k * im, q + k * re],
      [-p + k * re, -q + k * im],
      [p + k * im, q - k * re],
    ];
    const seen = new Set<string>();
    const opts: ChoiceOption[] = [];
    for (const [idx, point] of candidates.entries()) {
      const label = complexTex(point[0], point[1]);
      if (seen.has(label) || (idx > 0 && onRay(point, start, re, im))) continue;
      seen.add(label);
      opts.push(idx === 0 ? { tex: label, correct: true } : { tex: label });
      if (opts.length === 4) break;
    }
    return choiceSlide(
      [
        { kind: 'prose', text: 'Which of these points lies on this half-line?' },
        { kind: 'display', tex: `${argTex(p, q, style)} = ${tex}` },
      ],
      opts,
      mix(p, q, index, k),
    );
  },
  solution: ({ p, q, index, k }) => {
    const { re, im, tex } = ANGLES[index];
    return [
      {
        text: `The half-line starts at $${complexTex(p, q)}$ and runs only one way, in the direction of $${complexTex(re, im)}$ at angle $${tex}$. ${k} step${k === 1 ? '' : 's'} along it: $${complexTex(p, q)} + ${k}(${complexTex(re, im)})$.`,
        tex: `z = ${complexTex(p + k * re, q + k * im)}`,
      },
      {
        text: `$${complexTex(p - k * re, q - k * im)}$ is on the same straight line but behind the start, where the angle is the opposite one. A half-line from the origin would be $\\arg z = ${tex}$, a different locus.`,
      },
    ];
  },
};

/* ---------- Half-lines: the angle, slid round in eighths ---------- */

interface HalfTurnsParams { p: number; q: number; index: number; k: number }

/**
 * The angle of a half-line as a position rather than a value, in eighths of a
 * turn like `argument-turns`. Difficulty 1 draws it; difficulty 2 names a
 * point it passes through, so the direction comes from subtracting the start.
 */
export const locusHalflineTurns: Generator<HalfTurnsParams> = {
  id: 'locus-halfline-turns',
  sample: (rng, difficulty) => {
    const [p, q] = offOrigin(rng, 3);
    return { p, q, index: rng.int(0, ANGLES.length - 1), k: difficulty < 2 ? 0 : rng.int(1, 3) };
  },
  render: ({ p, q, index, k }) => {
    const { re, im } = ANGLES[index];
    const prompt: Block[] = k === 0
      ? [
          { kind: 'prose', text: 'This half-line is $\\arg(z - a) = \\theta$, starting at the open circle. Slide to $\\theta$, in eighths of a turn.' },
          {
            kind: 'diagram',
            svg: locusSvg({ range: RANGE, rays: [{ re: p, im: q, dx: re, dy: im }], points: [{ re: p, im: q, open: true }] }),
          },
        ]
      : [
          {
            kind: 'prose',
            text: `The half-line $${argTex(p, q, 'bracket')} = \\theta$ passes through $${complexTex(p + k * re, q + k * im)}$. Slide to $\\theta$, in eighths of a turn.`,
          },
        ];
    return {
      kind: 'slider',
      prompt,
      min: -3,
      max: 4,
      step: 1,
      answer: QUARTER_TURNS[index],
      readout: '\\theta = {v} \\times \\tfrac{\\pi}{4}',
    };
  },
  solution: ({ p, q, index, k }) => {
    const { re, im, tex } = ANGLES[index];
    const turns = QUARTER_TURNS[index];
    const steps: SolutionStep[] = [];
    if (k > 0) {
      steps.push({
        text: `The direction is the step from the start to the point it passes through, $(${complexTex(p + k * re, q + k * im)}) - (${complexTex(p, q)})$:`,
        tex: complexTex(k * re, k * im),
      });
    }
    steps.push({
      text: `That points ${turns === 0 ? 'along the positive real direction, no turn at all' : `${Math.abs(turns)} eighth${Math.abs(turns) === 1 ? '' : 's'} of a turn ${turns > 0 ? 'anticlockwise' : 'clockwise'} from the positive real direction`}.`,
      tex: `\\theta = ${turns} \\times \\tfrac{\\pi}{4} = ${tex}`,
    });
    return steps;
  },
};

/* ---------- Regions: is a point inside? ---------- */

interface RegionFlowParams {
  shape: 'disc' | 'half';
  a1: number; a2: number; b1: number; b2: number; r: number;
  rel: Rel; w1: number; w2: number; style: Shift;
}

/** The inequality a region question is about. */
function regionTex({ shape, a1, a2, b1, b2, r, rel, style }: Omit<RegionFlowParams, 'w1' | 'w2'>): string {
  return shape === 'disc'
    ? `${distTex(a1, a2, style)} ${rel} ${r}`
    : `${distTex(a1, a2, style)} ${rel} ${distTex(b1, b2, style)}`;
}

/**
 * Two forks: how far $w$ is, then whether the inequality takes that in. The
 * first is arithmetic; the second is the part people get wrong — which way the
 * inequality points, and whether the boundary counts. Difficulty 2 adds the
 * half-planes cut off by a perpendicular bisector.
 */
export const locusRegionFlow: Generator<RegionFlowParams> = {
  id: 'locus-region-flow',
  sample: (rng, difficulty) => {
    const rel = rng.pick(RELS);
    const want = rng.pick([-1, 0, 1]);
    const shape = difficulty >= 2 && rng.chance(0.5) ? 'half' : 'disc';
    const style: Shift = difficulty < 2 ? 'bracket' : 'expanded';
    for (;;) {
      if (shape === 'disc') {
        const a1 = rng.int(-2, 2);
        const a2 = rng.int(-2, 2);
        const r = rng.int(2, 5);
        const w1 = rng.int(-5, 5);
        const w2 = rng.int(-5, 5);
        if (w1 === a1 && w2 === a2) continue;
        if (Math.sign(squared(w1 - a1, w2 - a2) - r * r) !== want) continue;
        return { shape, a1, a2, b1: 0, b2: 0, r, rel, w1, w2, style };
      }
      const [a1, a2, b1, b2, w1, w2] = Array.from({ length: 6 }, () => rng.int(-3, 3));
      if (a1 === b1 && a2 === b2) continue;
      if (Math.sign(squared(w1 - a1, w2 - a2) - squared(w1 - b1, w2 - b2)) !== want) continue;
      return { shape, a1, a2, b1, b2, r: 0, rel, w1, w2, style };
    }
  },
  render: (params) => {
    const { shape, a1, a2, b1, b2, r, rel, w1, w2 } = params;
    const d = squared(w1 - a1, w2 - a2);
    const e = shape === 'disc' ? r * r : squared(w1 - b1, w2 - b2);
    const labels = shape === 'disc'
      ? [`Less than $${r}$`, `Exactly $${r}$`, `More than $${r}$`]
      : [`Nearer $${complexTex(a1, a2)}$`, 'Equally near both', `Nearer $${complexTex(b1, b2)}$`];
    const ids = ['closer', 'level', 'further'];
    const at = Math.sign(d - e) + 1;
    return {
      kind: 'flow',
      prompt: [
        { kind: 'prose', text: 'Is $w$ in this region? Work down the questions.' },
        { kind: 'display', tex: regionTex(params) },
      ],
      subject: `w = ${complexTex(w1, w2)}`,
      steps: [
        {
          id: 'how',
          ask: shape === 'disc'
            ? `How far is $w$ from $${complexTex(a1, a2)}$?`
            : `Is $w$ nearer $${complexTex(a1, a2)}$ or $${complexTex(b1, b2)}$?`,
          branches: labels.map((label, idx) => ({ label, to: ids[idx] })),
        },
        ...ids.map((id) => ({
          id,
          ask: 'So is $w$ in the region?',
          branches: [
            { label: 'Yes', outcome: 'In the region.' },
            { label: 'No', outcome: 'Not in the region.' },
          ],
        })),
      ],
      answer: [labels[at], holds(d, rel, e) ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const { shape, a1, a2, b1, b2, r, rel, w1, w2 } = params;
    const d = squared(w1 - a1, w2 - a2);
    const e = shape === 'disc' ? r * r : squared(w1 - b1, w2 - b2);
    const inside = holds(d, rel, e);
    const measured: SolutionStep[] = shape === 'disc'
      ? [
          {
            text: `Compare squared distances, which avoids roots: from $w$ to the centre, against $${r}^2 = ${e}$.`,
            tex: `|${complexTex(w1 - a1, w2 - a2)}|^2 = ${d}`,
          },
        ]
      : [
          {
            text: `Compare the squared distances from $w$ to the two fixed points. To $${complexTex(a1, a2)}$:`,
            tex: `|${complexTex(w1 - a1, w2 - a2)}|^2 = ${d}`,
          },
          { text: `To $${complexTex(b1, b2)}$:`, tex: `|${complexTex(w1 - b1, w2 - b2)}|^2 = ${e}` },
        ];
    return [
      ...measured,
      {
        text: `${d === e ? 'They are equal, so $w$ is on the boundary' : d < e ? 'The first is smaller' : 'The first is bigger'}, and the region wants $${regionTex(params)}$: ${strict(rel) && d === e ? 'a strict inequality leaves the boundary out' : `so $w$ is ${inside ? '' : 'not '}in it`}.`,
      },
    ];
  },
};

/* ---------- Regions: the inequality for a shaded picture ---------- */

interface RegionMatchParams { shape: 'disc' | 'half'; a1: number; a2: number; b1: number; b2: number; r: number; rel: Rel; style: Shift }

/**
 * Name the region drawn. The options differ from the answer by exactly one
 * thing each: the inequality turned round, the boundary put in or left out
 * (solid or dashed), or the sign of the centre lost.
 */
export const locusRegionMatch: Generator<RegionMatchParams> = {
  id: 'locus-region-match',
  sample: (rng, difficulty) => {
    const rel = rng.pick(RELS);
    if (difficulty >= 2 && rng.chance(0.5)) {
      // Neither point at the origin and not opposite each other, or losing
      // the sign of a leaves it where it was or lands it on b.
      for (;;) {
        const [a1, a2, b1, b2] = samplePair(rng, 3);
        if ((a1 === 0 && a2 === 0) || (b1 === 0 && b2 === 0) || (a1 === -b1 && a2 === -b2)) continue;
        return { shape: 'half', a1, a2, b1, b2, r: 0, rel, style: 'expanded' };
      }
    }
    const [a1, a2] = offOrigin(rng, 2);
    return { shape: 'disc', a1, a2, b1: 0, b2: 0, r: rng.int(1, 3), rel, style: difficulty < 2 ? 'bracket' : 'expanded' };
  },
  render: (params) => {
    const { shape, a1, a2, b1, b2, r, rel } = params;
    const tex = (change: Partial<RegionMatchParams>) => regionTex({ ...params, ...change });
    const figure = shape === 'disc'
      ? locusSvg({
          range: 5,
          discs: [{ re: a1, im: a2, r, outside: !below(rel) }],
          circles: [{ re: a1, im: a2, r, dashed: strict(rel) }],
          points: [{ re: a1, im: a2 }],
        })
      : locusSvg({
          range: 5,
          halves: [{
            re: (a1 + b1) / 2, im: (a2 + b2) / 2, dx: a2 - b2, dy: b1 - a1,
            toward: below(rel) ? [a1, a2] : [b1, b2],
          }],
          lines: [{ re: (a1 + b1) / 2, im: (a2 + b2) / 2, dx: a2 - b2, dy: b1 - a1, dashed: strict(rel) }],
          points: [{ re: a1, im: a2 }, { re: b1, im: b2 }],
        });
    const signSlip = tex({ a1: -a1, a2: -a2 });
    return choiceSlide(
      [
        { kind: 'prose', text: 'Which inequality describes the shaded region?' },
        { kind: 'diagram', svg: figure },
      ],
      [
        { tex: tex({}), correct: true },
        { tex: tex({ rel: FLIPPED[rel] }) },
        { tex: tex({ rel: TOGGLED[rel] }) },
        { tex: signSlip },
      ],
      mix(a1, a2, b1, b2, r, RELS.indexOf(rel)),
    );
  },
  solution: (params) => {
    const { shape, a1, a2, b1, b2, r, rel } = params;
    return [
      {
        text: shape === 'disc'
          ? `The boundary is the circle of radius ${r} about $${complexTex(a1, a2)}$, and the shading is ${below(rel) ? 'inside it: closer than' : 'outside it: further than'} ${r}.`
          : `The boundary is the perpendicular bisector of $${complexTex(a1, a2)}$ and $${complexTex(b1, b2)}$, and the shading is on the side nearer $${below(rel) ? complexTex(a1, a2) : complexTex(b1, b2)}$.`,
      },
      {
        // A half-plane's inequality is two moduli wide, too wide for a display
        // in the solution panel, so it rides in the prose, which wraps.
        text: `The boundary is ${strict(rel) ? 'dashed, so it is left out and the inequality is strict' : 'solid, so it is included'}${shape === 'half' ? `: $${regionTex(params)}$.` : '.'}`,
        tex: shape === 'disc' ? regionTex(params) : undefined,
      },
    ];
  },
};

/* ---------- Regions: between two arguments ---------- */

interface WedgeParams { p: number; q: number; lo: number; hi: number; picks: [number, number][] }

/** Where `ANGLES` keeps the direction a whole number of eighths round. */
const turnTex = (turns: number): string => ANGLES[eighth(turns)].tex;

/**
 * $\theta_1 < \arg(z - a) < \theta_2$ is a wedge with its point at a. Four
 * numbers, one inside; the three outside are chosen from just past either
 * edge where the lattice allows, so a guess from the quadrant alone does not
 * do. Points on an edge are never offered, which keeps strictness out of it.
 */
export const locusRegionWedge: Generator<WedgeParams> = {
  id: 'locus-region-wedge',
  sample: (rng, difficulty) => {
    const lo = rng.int(-3, 3);
    const hi = lo + rng.int(1, Math.min(3, 4 - lo));
    const [p, q] = difficulty < 2 ? [0, 0] : [rng.int(-2, 2), rng.int(-2, 2)];
    const turnsOf = ([x, y]: [number, number]) => Math.atan2(y, x) / (Math.PI / 4);
    const gap = (t: number, edge: number) => {
      const d = Math.abs(t - edge) % 8;
      return Math.min(d, 8 - d);
    };
    const offsets: [number, number][] = [];
    for (let x = -3; x <= 3; x += 1) for (let y = -3; y <= 3; y += 1) if (x !== 0 || y !== 0) offsets.push([x, y]);
    const clear = offsets.filter((v) => gap(turnsOf(v), lo) > 1e-9 && gap(turnsOf(v), hi) > 1e-9);
    const inside = clear.filter((v) => turnsOf(v) > lo && turnsOf(v) < hi);
    const outside = clear.filter((v) => !(turnsOf(v) > lo && turnsOf(v) < hi));
    const near = outside.filter((v) => Math.min(gap(turnsOf(v), lo), gap(turnsOf(v), hi)) < 1.5);
    const wrong = rng.sample(near.length >= 3 ? near : outside, 3);
    return { p, q, lo, hi, picks: [rng.pick(inside), ...wrong] };
  },
  render: ({ p, q, lo, hi, picks }) =>
    choiceSlide(
      [
        { kind: 'prose', text: 'Which of these numbers lies in this region?' },
        { kind: 'display', tex: `${turnTex(lo)} < ${argTex(p, q, 'bracket')} < ${turnTex(hi)}` },
      ],
      picks.map(([x, y], idx) => (idx === 0
        ? { tex: complexTex(p + x, q + y), correct: true }
        : { tex: complexTex(p + x, q + y) })),
      mix(p, q, lo, hi, ...picks.flat()),
    ),
  solution: ({ p, q, lo, hi, picks }) => {
    const [x, y] = picks[0];
    const steps: SolutionStep[] = [
      {
        text: `The region is a wedge with its point at $${complexTex(p, q)}$, between the directions $${turnTex(lo)}$ and $${turnTex(hi)}$, edges left out.`,
      },
    ];
    if (p !== 0 || q !== 0) {
      steps.push({
        text: `Measure each number from the point of the wedge by subtracting it first: $(${complexTex(p + x, q + y)}) - (${complexTex(p, q)})$ is`,
        tex: complexTex(x, y),
      });
    }
    steps.push({
      text: `$${complexTex(x, y)}$ points strictly between those two directions. Each of the others points outside them, or along an edge.`,
    });
    return steps;
  },
};

/* ---------- Regions: the furthest a disc reaches ---------- */

interface ExtremeParams { p: number; q: number; r: number; part: 're' | 'im'; end: 'max' | 'min'; style: Shift }

const PART_TEX = { re: '\\mathrm{Re}(z)', im: '\\mathrm{Im}(z)' };

/**
 * The greatest or least real or imaginary part in a closed disc: the centre's
 * part, plus or minus the radius. The distractors are the other end, the other
 * part, and the centre alone.
 */
export const locusRegionExtreme: Generator<ExtremeParams> = {
  id: 'locus-region-extreme',
  choices: ({ p, q, r, part, end }) => {
    const [mine, other] = part === 're' ? [p, q] : [q, p];
    const sign = end === 'max' ? 1 : -1;
    const n = (v: number) => ({ tex: `${v}`, answer: `${v}` });
    return steered(
      options(n(mine + sign * r), n(mine - sign * r), n(other + sign * r), n(mine), n(sign * r)).slice(0, 4),
      mix(p, q, r, part === 're' ? 1 : 2, end === 'max' ? 1 : 2),
    );
  },
  sample: (rng, difficulty) => {
    const [p, q] = offOrigin(rng, RANGE);
    return {
      p, q, r: rng.int(1, 5),
      part: rng.pick(['re', 'im'] as const),
      end: rng.pick(['max', 'min'] as const),
      style: difficulty < 2 ? 'bracket' : 'expanded',
    };
  },
  render: ({ p, q, r, part, end, style }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'display', tex: `${distTex(p, q, style)} \\le ${r}` },
      {
        kind: 'prose',
        text: `$z$ lies in this region. What is the ${end === 'max' ? 'greatest' : 'least'} possible value of $${PART_TEX[part]}$?`,
      },
    ],
    lead: `\\text{${end === 'max' ? 'greatest' : 'least'} } ${PART_TEX[part]} =`,
    keypad: [],
    answer: `${(part === 're' ? p : q) + (end === 'max' ? r : -r)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ p, q, r, part, end }) => {
    const mine = part === 're' ? p : q;
    const sign = end === 'max' ? '+' : '-';
    const way = part === 're' ? (end === 'max' ? 'right' : 'left') : end === 'max' ? 'up' : 'down';
    return [
      {
        text: `The region is the disc of radius ${r} about $${complexTex(p, q)}$, boundary included. It reaches ${r} ${way} from the centre and no further.`,
      },
      {
        text: `So ${part === 're' ? 'the real part' : 'the imaginary part'} runs out at the centre's own, ${sign === '+' ? 'plus' : 'minus'} the radius.`,
        tex: `${mine} ${sign} ${r} = ${mine + (end === 'max' ? r : -r)}`,
      },
    ];
  },
};

/* ---------- Cartesian form: a circle, written out ---------- */

interface CartesianTilesParams { p: number; q: number; r: number; style: Shift }

/** `- 3` for a centre coordinate of 3, `+ 2` for -2: what follows `x` in `(x - p)`. */
const offsetTok = (v: number): string => (v > 0 ? `- ${v}` : `+ ${-v}`);

/**
 * $|z - a| = r$ in Cartesian form, by putting $z = x + iy$ and squaring the
 * modulus. The bank holds each offset with its sign flipped, and $r$ itself
 * beside $r^2$.
 */
export const locusCartesianTiles: Generator<CartesianTilesParams> = {
  id: 'locus-cartesian-tiles',
  sample: (rng, difficulty) => ({
    p: nonZero(rng, 5),
    q: nonZero(rng, 5),
    r: rng.int(2, 6),
    style: difficulty < 2 ? 'bracket' : 'expanded',
  }),
  render: ({ p, q, r, style }) => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'With $z = x + iy$, write this locus in Cartesian form.' },
      { kind: 'display', tex: `${distTex(p, q, style)} = ${r}` },
    ],
    template: '(x {0})^2 + (y {1})^2 = {2}',
    bank: [
      offsetTok(p),
      offsetTok(q),
      `${r * r}`,
      ...distinct([offsetTok(-p), offsetTok(-q), `${r}`]).filter((t) => t !== offsetTok(p) && t !== offsetTok(q)),
    ].sort(),
    answer: [offsetTok(p), offsetTok(q), `${r * r}`],
  }),
  solution: ({ p, q, r }) => [
    {
      text: `Put $z = x + iy$ and collect the real and imaginary parts of $z - (${complexTex(p, q)})$:`,
      tex: `(x ${offsetTok(p)}) + (y ${offsetTok(q)})i`,
    },
    {
      text: `The modulus is Pythagoras on those two parts. Square both sides so there is no root: the right-hand side becomes ${r}^2.`,
      tex: `(x ${offsetTok(p)})^2 + (y ${offsetTok(q)})^2 = ${r * r}`,
    },
  ],
};

/* ---------- Cartesian form: the centre of a circle, read back ---------- */

interface CartesianCircleParams { p: number; q: number; r: number; form: 'square' | 'expanded' }

/** Completing the square on one variable, as a line of a solution. */
function completeTex(v: string, p: number): string {
  return p === 0 ? `${v}^2` : `${v}^2 ${p > 0 ? '-' : '+'} ${2 * Math.abs(p)}${v} = ${squareTex(v, p)} - ${p * p}`;
}

function cartesianSolution({ p, q, r, form }: CartesianCircleParams): SolutionStep[] {
  const steps: SolutionStep[] = [];
  if (form === 'expanded') {
    steps.push(
      { text: 'Complete the square in $x$ and in $y$ separately.', tex: completeTex('x', p) },
      { tex: completeTex('y', q) },
      {
        text: `Add the ${p * p + q * q} those take off to the right-hand side: $${r * r - p * p - q * q} + ${p * p + q * q} = ${r * r}$.`,
        tex: `${squareTex('x', p)} + ${squareTex('y', q)} = ${r * r}`,
      },
    );
  }
  steps.push({
    text: 'That is the distance from $(x, y)$ to the centre $a$, squared. Read $a$ off with the signs turned round, and the radius as the root of the right-hand side.',
    tex: `a = ${complexTex(p, q)}, \\quad r = \\sqrt{${r * r}} = ${r}`,
  });
  return steps;
}

/**
 * Back from Cartesian to a centre. Difficulty 1 gives the completed square;
 * difficulty 2 multiplies it out, so the square has to be completed first.
 */
export const locusCartesianCentre: Generator<CartesianCircleParams> = {
  id: 'locus-cartesian-centre',
  sample: (rng, difficulty) => {
    const [p, q] = offOrigin(rng, RANGE);
    return { p, q, r: rng.int(1, 5), form: difficulty < 2 ? 'square' : 'expanded' };
  },
  render: ({ p, q, r, form }) => ({
    kind: 'plot',
    prompt: [
      { kind: 'display', tex: cartesianTex(p, q, r, form) },
      { kind: 'prose', text: 'This is a circle. Tap its centre.' },
    ],
    range: RANGE,
    answer: { re: p, im: q },
  }),
  solution: cartesianSolution,
};

/* ---------- Cartesian form: the radius of a circle, read back ---------- */

/**
 * The radius from a Cartesian equation, slid out from the marked centre. The
 * completed form traps the learner who reads $r^2$ as $r$; the expanded one
 * needs the square completed, where the constant moves.
 */
export const locusCartesianRadius: Generator<CartesianCircleParams> = {
  id: 'locus-cartesian-radius',
  sample: (rng, difficulty) => {
    const r = rng.int(2, 4);
    const top = 5 - r;
    let p = rng.int(-top, top);
    let q = rng.int(-top, top);
    while (p === 0 && q === 0) {
      p = rng.int(-top, top);
      q = rng.int(-top, top);
    }
    return { p, q, r, form: difficulty < 2 ? 'square' : 'expanded' };
  },
  render: ({ p, q, r, form }) => ({
    kind: 'slider',
    prompt: [
      // Kept to a line: with the figure full width, any more pushes the
      // slider under the Check button on a phone.
      { kind: 'prose', text: 'Slide out from the marked centre to the radius of' },
      { kind: 'display', tex: cartesianTex(p, q, r, form) },
    ],
    figure: {
      svg: locusSvg({ range: 5, points: [{ re: p, im: q }], wide: true }),
      ...planeSpan(5),
      origin: p,
    },
    min: 0,
    max: 5,
    step: 1,
    answer: r,
    readout: 'r = {v}',
  }),
  solution: cartesianSolution,
};

/* ---------- The greatest and least |z| on a circle ---------- */

interface ModulusRangeParams { a1: number; a2: number; c: number; r: number; end: 'max' | 'min'; style: Shift }

/**
 * Centres whose modulus is whole: the Pythagorean rows with small legs, and
 * points on an axis. The table states $|a|$ outright, so nothing is rounded
 * back to an integer already known.
 */
const RANGE_CENTRES: [number, number, number][] = [
  ...TRIPLES.filter(([, , c]) => c <= 13),
  ...[2, 3, 4, 5, 6].flatMap((k): [number, number, number][] => [[k, 0, k], [0, k, k]]),
];

/**
 * The nearest and furthest points of a circle from the origin lie on the line
 * through the origin and the centre, so they are $|a| \mp r$ away. Difficulty
 * 2 lets the origin fall inside the circle, where the least is $r - |a|$ and
 * the tempting $|a| - r$ is negative.
 */
export const locusModulusRange: Generator<ModulusRangeParams> = {
  id: 'locus-modulus-range',
  choices: ({ a1, a2, c, r, end }) => {
    const n = (v: number) => ({ tex: `${v}`, answer: `${v}` });
    const answer = end === 'max' ? c + r : Math.abs(c - r);
    return steered(
      options(n(answer), n(end === 'max' ? Math.abs(c - r) : c + r), n(c - r), n(c), n(r)).slice(0, 4),
      mix(a1, a2, r, end === 'max' ? 1 : 2),
    );
  },
  sample: (rng, difficulty) => {
    const [x, y, c] = rng.pick(RANGE_CENTRES);
    let r = difficulty < 2 ? rng.int(1, c - 1) : rng.int(1, c + 4);
    while (r === c) r = rng.int(1, c + 4);
    return {
      a1: x * rng.sign() || 0,
      a2: y * rng.sign() || 0,
      c,
      r,
      end: rng.pick(['max', 'min'] as const),
      style: difficulty < 2 ? 'bracket' : 'expanded',
    };
  },
  render: ({ a1, a2, r, end, style, c }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'display', tex: `${distTex(a1, a2, style)} = ${r}` },
      {
        kind: 'prose',
        text: `$z$ lies on this circle. What is the ${end === 'max' ? 'greatest' : 'least'} value of $|z|$?`,
      },
    ],
    lead: `\\text{${end === 'max' ? 'greatest' : 'least'} } |z| =`,
    keypad: [],
    answer: `${end === 'max' ? c + r : Math.abs(c - r)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a1, a2, c, r, end }) => {
    const inside = r > c;
    return [
      {
        text: `The centre $${complexTex(a1, a2)}$ is this far from the origin:`,
        tex: `\\sqrt{${paren(`${a1}`)}^2 + ${paren(`${a2}`)}^2} = ${c}`,
      },
      {
        text: `The nearest and furthest points of the circle lie on the line through the origin and the centre. ${inside ? `The radius ${r} is more than ${c}, so the origin is inside the circle.` : 'The origin is outside the circle.'}`,
      },
      end === 'max'
        ? { text: 'The furthest point is beyond the centre by the radius:', tex: `${c} + ${r} = ${c + r}` }
        : inside
          ? { text: 'The nearest point is the radius, less the distance to the centre, on the far side:', tex: `${r} - ${c} = ${r - c}` }
          : { text: 'The nearest point is short of the centre by the radius:', tex: `${c} - ${r} = ${c - r}` },
    ];
  },
};

/* ====================================================================== */
/* Level 7: the exponential form, z = re^{iθ}                              */
/* ====================================================================== */

/** An angle of mπ/d radians, which `angleTex`, `angleAnswer` and `principal` all read. */
interface Angle { m: number; d: number }

/** Every angle whose sine and cosine are known exactly, once each way round the circle. */
const EXP_ANGLES: Angle[] = POLAR_ANGLES.map(({ k, d }) => ({ m: k, d }));

/**
 * A modulus a√s. Whole numbers, and whole multiples of √2, are all this level
 * needs: the second is what puts a point on a diagonal onto the lattice.
 */
interface Mod { a: number; s: 1 | 2 }

const UNIT: Mod = { a: 1, s: 1 };

const modTex = ({ a, s }: Mod): string => (s === 1 ? `${a}` : `${a === 1 ? '' : a}\\sqrt{2}`);

const modAnswer = ({ a, s }: Mod): string => (s === 1 ? `${a}` : `${a}*sqrt(2)`);

const modValue = ({ a, s }: Mod): number => a * Math.sqrt(s);

/**
 * The exponent of e as the learner reads it: `i\tfrac{\pi}{3}`, `-i\pi`, and
 * `3\pi i` rather than `i3\pi` for a whole multiple.
 */
function expoTex({ m, d }: Angle): string {
  if (m === 0) return '0';
  // `\tfrac` would force a full-size fraction into the superscript.
  const size = angleTex(Math.abs(m), d).replace('\\tfrac', '\\frac');
  const sign = m < 0 ? '-' : '';
  return /^\d/.test(size) ? `${sign}${size} i` : `${sign}i${size}`;
}

/** re^{iθ} as the learner reads it. A modulus of 1 is left unwritten, and e^0 is not written at all. */
function expTex(mod: Mod, angle: Angle): string {
  if (angle.m === 0) return modTex(mod);
  const r = mod.a === 1 && mod.s === 1 ? '' : modTex(mod);
  return `${r}e^{${expoTex(angle)}}`;
}

/** An angle brought into (−π, π] by whole turns. */
const reduced = ({ m, d }: Angle): Angle => ({ m: principal(m, d), d });

const radians = ({ m, d }: Angle): number => (m * Math.PI) / d;

/** Where re^{iθ} is, as numbers: for telling apart two options that print differently. */
const pointOf = (mod: Mod, angle: Angle): [number, number] => [
  modValue(mod) * Math.cos(radians(angle)),
  modValue(mod) * Math.sin(radians(angle)),
];

/**
 * One exact part of re^{iθ}, sign × (p/q)√t.
 *
 * Built by multiplying the modulus into the cosine or sine rather than read
 * back from a decimal, so `3√2 × (−√2/2)` comes out as the −3 it is.
 */
interface Part { sign: number; p: number; q: number; t: number }

/** cos or sin of a table angle, looked up by size. */
function unitPart(x: number): Part {
  const size = Math.abs(x);
  const sign = x < 0 ? -1 : 1;
  if (size < 1e-9) return { sign: 1, p: 0, q: 1, t: 1 };
  if (Math.abs(size - 0.5) < 1e-9) return { sign, p: 1, q: 2, t: 1 };
  if (Math.abs(size - Math.SQRT1_2) < 1e-9) return { sign, p: 1, q: 2, t: 2 };
  if (Math.abs(size - Math.sqrt(3) / 2) < 1e-9) return { sign, p: 1, q: 2, t: 3 };
  if (Math.abs(size - 1) < 1e-9) return { sign, p: 1, q: 1, t: 1 };
  throw new Error(`no exact value for ${x}`);
}

/** a√s times (p/q)√t, with a square taken out of the root and the fraction cancelled. */
function scalePart({ a, s }: Mod, part: Part): Part {
  if (part.p === 0) return part;
  let p = a * part.p;
  let t = s * part.t;
  if (t === 4) {
    p *= 2;
    t = 1;
  }
  const g = gcd(p, part.q);
  return { sign: part.sign, p: p / g, q: part.q / g, t };
}

/** A part's size as read: 3, \tfrac{1}{2}, 2\sqrt{3}, \tfrac{\sqrt{2}}{2}. */
function partSize({ p, q, t }: Part): string {
  const top = t === 1 ? `${p}` : `${p === 1 ? '' : p}\\sqrt{${t}}`;
  return q === 1 ? top : `\\tfrac{${top}}{${q}}`;
}

/** A part as a signed number, the way a tile shows it. */
const partTex = (part: Part): string => (part.p === 0 ? '0' : `${part.sign < 0 ? '-' : ''}${partSize(part)}`);

const partAnswer = (part: Part): string =>
  part.p === 0 ? '0' : `${part.sign < 0 ? '-' : ''}(${part.p})*sqrt(${part.t})/(${part.q})`;

const flipPart = (part: Part): Part => ({ ...part, sign: part.p === 0 ? 1 : -part.sign });

/** The exact Cartesian parts of re^{iθ}. */
function cartesianParts(mod: Mod, angle: Angle): { re: Part; im: Part } {
  const t = radians(angle);
  return { re: scalePart(mod, unitPart(Math.cos(t))), im: scalePart(mod, unitPart(Math.sin(t))) };
}

/** x + yi with exact parts, signs collapsed the way `complexTex` collapses them. */
function partsTex(re: Part, im: Part): string {
  const size = partSize(im);
  const imag = size === '1' ? 'i' : `${size}i`;
  if (im.p === 0) return partTex(re);
  if (re.p === 0) return `${im.sign < 0 ? '-' : ''}${imag}`;
  return `${partTex(re)} ${im.sign < 0 ? '-' : '+'} ${imag}`;
}

const partsAnswer = (re: Part, im: Part): string => `(${partAnswer(re)}) + (${partAnswer(im)})*i`;

/** A native option in exponential form, carrying its point so `distinctByValue` can catch equal values. */
const expOption = (mod: Mod, angle: Angle, correct = false) => ({
  tex: expTex(mod, angle),
  value: pointOf(mod, angle),
  ...(correct && { correct: true }),
});

/**
 * A tiles bank: the answer's tokens as a multiset, then whichever distractors
 * are genuinely different from them, at least two of them.
 */
function tileBank(rng: Rng, answer: string[], distractors: string[]): string[] {
  const extras: string[] = [];
  for (const token of [...distractors, '0', '1', '-1']) {
    if (answer.includes(token) || extras.includes(token)) continue;
    if (extras.length >= 2 && ['0', '1', '-1'].includes(token)) break;
    extras.push(token);
  }
  return rng.shuffle([...answer, ...extras.slice(0, 4)]);
}

const quadrantName = (q: number): string => `${QUADRANT_NAMES[q][0].toUpperCase()}${QUADRANT_NAMES[q].slice(1)}`;

/* ---------- Euler's formula: re^{iθ} written as a + bi ---------- */

interface EulerParams { a: number; s: 1 | 2; m: number; d: number }

/**
 * A modulus and a table angle. Difficulty 1 is a modulus of 1 or 2 at a
 * principal angle. Difficulty 2 scales further, lets a diagonal carry √2 so
 * its parts come out whole, and half the time writes the angle a whole turn
 * out of range.
 */
function sampleEuler(rng: Rng, difficulty: number): EulerParams {
  const { m, d } = rng.pick(EXP_ANGLES);
  if (difficulty < 2) return { a: rng.int(1, 2), s: 1, m, d };
  const s: 1 | 2 = d === 4 && rng.chance(0.5) ? 2 : 1;
  const turns = rng.chance(0.5) ? rng.pick([-1, 1]) : 0;
  return { a: rng.int(1, 4), s, m: m + 2 * d * turns, d };
}

function eulerParts({ a, s, m, d }: EulerParams) {
  const mod: Mod = { a, s };
  const angle: Angle = { m, d };
  const main = reduced(angle);
  return { mod, angle, main, ...cartesianParts(mod, angle) };
}

/** Drop whole turns, read the cosine and sine, then scale by the modulus. */
function eulerWorking(params: EulerParams): SolutionStep[] {
  const { mod, angle, main, re, im } = eulerParts(params);
  const unit = cartesianParts(UNIT, main);
  const t = paren(angleTex(main.m, main.d));
  const steps: SolutionStep[] = [];
  if (main.m !== angle.m) {
    steps.push({
      text: 'A whole turn of $2\\pi$ comes back to the same point, so drop it first.',
      tex: `e^{${expoTex(angle)}} = e^{${expoTex(main)}}`,
    });
  }
  steps.push(
    {
      text: "Euler's formula says $e^{i\\theta} = \\cos\\theta + i\\sin\\theta$. The cosine is the real part",
      tex: `\\cos ${t} = ${partTex(unit.re)}`,
    },
    { text: 'and the sine is the imaginary part.', tex: `\\sin ${t} = ${partTex(unit.im)}` },
  );
  if (mod.a !== 1 || mod.s !== 1) {
    steps.push({ text: `Multiply both by the modulus, $${modTex(mod)}$.` });
  }
  steps.push({ tex: `z = ${partsTex(re, im)}` });
  return steps;
}

export const expformEulerCartesian: Generator<EulerParams> = {
  id: 'expform-euler-cartesian',
  choices: (params) => {
    const { main, re, im } = eulerParts(params);
    const unit = cartesianParts(UNIT, main);
    const opt = (x: Part, y: Part) => ({ tex: partsTex(x, y), answer: partsAnswer(x, y) });
    // The conjugate, cosine and sine swapped, the real part's sign lost, and
    // the modulus left off.
    return steered(
      options(opt(re, im), opt(re, flipPart(im)), opt(im, re), opt(flipPart(re), im), opt(unit.re, unit.im)).slice(0, 4),
      mix(params.a, params.s, params.m, params.d),
    );
  },
  sample: sampleEuler,
  render: (params) => {
    const { mod, angle, re, im } = eulerParts(params);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Write $z$ in the form $a + bi$.' },
        { kind: 'display', tex: `z = ${expTex(mod, angle)}` },
      ],
      lead: 'z =',
      keypad: EXACT_KEYS,
      answer: partsAnswer(re, im),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: (params) => eulerWorking(params),
};

/* ---------- Euler's formula: a real and an imaginary part, placed ---------- */

interface EulerTilesParams extends EulerParams { bank: string[] }

/**
 * The two parts of re^{iθ} as tiles. The bank holds each part with its sign
 * flipped and the cosine and sine of the bare angle, so a lost minus, a
 * swapped pair or a forgotten modulus each has a tile to land on.
 */
export const expformEulerParts: Generator<EulerTilesParams> = {
  id: 'expform-euler-parts',
  sample: (rng, difficulty) => {
    const params = sampleEuler(rng, difficulty);
    const { main, re, im } = eulerParts(params);
    const unit = cartesianParts(UNIT, main);
    const answer = [partTex(re), partTex(im)];
    const bank = tileBank(rng, answer, [flipPart(re), flipPart(im), unit.re, unit.im, flipPart(unit.im)].map(partTex));
    return { ...params, bank };
  },
  render: (params) => {
    const { mod, angle, re, im } = eulerParts(params);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write $z$ as $x + yi$: fill in $x$ and $y$.' },
        { kind: 'display', tex: `z = ${expTex(mod, angle)}` },
      ],
      template: 'x = {0}, \\quad y = {1}',
      bank: params.bank,
      answer: [partTex(re), partTex(im)],
    };
  },
  solution: (params) => [
    ...eulerWorking(params),
    { text: '$y$ is the number multiplying $i$, without the $i$.' },
  ],
};

/* ---------- Euler's formula: re^{iθ}, plotted ---------- */

interface EulerPlotParams { index: number; scale: number; turns: number }

/** A lattice point in one of the eight table directions, as a modulus and an angle. */
function latticeExp(index: number, scale: number): { mod: Mod; angle: Angle; re: number; im: number; diagonal: boolean } {
  const dir = ANGLES[index];
  const diagonal = dir.re !== 0 && dir.im !== 0;
  return {
    mod: { a: scale, s: diagonal ? 2 : 1 },
    angle: { m: QUARTER_TURNS[index], d: 4 },
    re: dir.re * scale,
    im: dir.im * scale,
    diagonal,
  };
}

/**
 * Plot re^{iθ}. Only the eight directions a lattice point can have, so the
 * modulus on a diagonal is a multiple of √2 and the point it names is whole.
 * Difficulty 2 writes some angles a whole turn round, including 2π itself.
 */
export const expformEulerPlot: Generator<EulerPlotParams> = {
  id: 'expform-euler-plot',
  sample: (rng, difficulty) => {
    if (difficulty < 2) return { index: rng.int(1, 7), scale: rng.int(1, RANGE), turns: 0 };
    const index = rng.int(0, 7);
    const turns = index === 0 ? rng.pick([-1, 1]) : rng.pick([-1, 0, 0, 1]);
    return { index, scale: rng.int(1, RANGE), turns };
  },
  render: ({ index, scale, turns }) => {
    const { mod, angle, re, im } = latticeExp(index, scale);
    return {
      kind: 'plot',
      prompt: [{ kind: 'prose', text: `Plot $z = ${expTex(mod, { m: angle.m + 8 * turns, d: 4 })}$.` }],
      range: RANGE,
      answer: { re, im },
    };
  },
  solution: ({ index, scale, turns }) => {
    const { mod, angle, re, im, diagonal } = latticeExp(index, scale);
    const steps: SolutionStep[] = [];
    if (turns !== 0) {
      steps.push({
        text: 'A whole turn of $2\\pi$ changes nothing, so drop it.',
        tex: `e^{${expoTex({ m: angle.m + 8 * turns, d: 4 })}} = e^{${expoTex(angle)}}`,
      });
    }
    steps.push({
      text: `The modulus $${modTex(mod)}$ says how far out the point is, and the angle $${angleTex(angle.m, 4)}$ says which way.`,
    });
    steps.push({
      text: diagonal
        ? `That direction is a diagonal, and a length of $${modTex(mod)}$ along it is ${scale} across and ${scale} up or down, since $${scale}^2 + ${scale}^2 = ${2 * scale * scale}$.`
        : 'That direction is along an axis, so the whole modulus lies on it.',
      tex: `z = ${complexTex(re, im)}`,
    });
    return steps;
  },
};

/* ---------- Euler's formula: where e^{iθ} lands ---------- */

interface EulerFlowParams { m: number; d: number }

/**
 * Two forks: which kind of place e^{iθ} is, then which one. The angles are
 * written up to one turn either way at difficulty 1 and two at difficulty 2,
 * so the whole-turns idea is exercised before any arithmetic with it.
 */
export const expformEulerFlow: Generator<EulerFlowParams> = {
  id: 'expform-euler-flow',
  sample: (rng, difficulty) => {
    const d = rng.pick([2, 3, 4, 6]);
    const reach = (difficulty < 2 ? 2 : 4) * d;
    for (;;) {
      const m = rng.int(-reach, reach);
      if (m === 0) continue;
      // Off the axes for every denominator but 2, which is the axes.
      if (d !== 2 && (2 * m) % d === 0) continue;
      return { m, d };
    }
  },
  render: ({ m, d }) => {
    const [x, y] = pointOf(UNIT, { m, d });
    const onReal = Math.abs(y) < 1e-9;
    const onImag = Math.abs(x) < 1e-9;
    const where = onReal ? 'On the real axis' : onImag ? 'On the imaginary axis' : 'In a quadrant';
    const which = onReal ? (x > 0 ? '$1$' : '$-1$') : onImag ? (y > 0 ? '$i$' : '$-i$') : quadrantName(quadrantOf(x, y));
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Where is this number on the unit circle? Work down the questions.' }],
      subject: `e^{${expoTex({ m, d })}}`,
      steps: [
        {
          id: 'where',
          ask: 'Where is it?',
          branches: [
            { label: 'On the real axis', to: 'real' },
            { label: 'On the imaginary axis', to: 'imag' },
            { label: 'In a quadrant', to: 'quad' },
          ],
        },
        {
          id: 'real',
          ask: 'Which point is it?',
          branches: [{ label: '$1$', outcome: 'It is $1$.' }, { label: '$-1$', outcome: 'It is $-1$.' }],
        },
        {
          id: 'imag',
          ask: 'Which point is it?',
          branches: [{ label: '$i$', outcome: 'It is $i$.' }, { label: '$-i$', outcome: 'It is $-i$.' }],
        },
        {
          id: 'quad',
          ask: 'Which quadrant?',
          branches: [0, 1, 2, 3].map((q) => ({ label: quadrantName(q), outcome: `The ${QUADRANT_NAMES[q]} quadrant.` })),
        },
      ],
      answer: [where, which],
    };
  },
  solution: ({ m, d }) => {
    const main = reduced({ m, d });
    const unit = cartesianParts(UNIT, main);
    const [x, y] = pointOf(UNIT, main);
    const steps: SolutionStep[] = [];
    if (main.m !== m) {
      steps.push({
        text: 'Take off whole turns of $2\\pi$ until the angle is between $-\\pi$ and $\\pi$.',
        tex: `${angleTex(m, d)} \\to ${angleTex(main.m, d)}`,
      });
    }
    steps.push({
      text: "Euler's formula gives the point as $\\cos\\theta + i\\sin\\theta$.",
      tex: `e^{${expoTex(main)}} = ${partsTex(unit.re, unit.im)}`,
    });
    if (Math.abs(x) > 1e-9 && Math.abs(y) > 1e-9) {
      steps.push({
        text: `Real part ${x > 0 ? 'positive' : 'negative'}, imaginary part ${y > 0 ? 'positive' : 'negative'}: the ${QUADRANT_NAMES[quadrantOf(x, y)]} quadrant.`,
      });
    }
    return steps;
  },
};

/* ---------- z = re^{iθ}: the modulus or the argument, read off ---------- */

interface ReadParams { a: number; s: 1 | 2; m: number; d: number; ask: 'modulus' | 'argument'; neg: boolean }

/** The number as written, and the modulus and principal argument it really has. */
function readParts({ a, s, m, d, neg }: ReadParams) {
  const mod: Mod = { a, s };
  const written: Angle = { m, d };
  const main = reduced({ m: m + (neg ? d : 0), d });
  return { mod, written, main, tex: `${neg ? '-' : ''}${expTex(mod, written)}` };
}

/**
 * $|z|$ or $\arg z$ from $z = re^{i\theta}$. Difficulty 1 writes the principal
 * argument, so it is a matter of reading. Difficulty 2 writes it a turn out of
 * range, or puts a minus sign in front, which is a half turn: $-2e^{i\pi/3}$
 * has modulus 2, not −2, and argument $-\tfrac{2\pi}{3}$.
 */
export const expformRead: Generator<ReadParams> = {
  id: 'expform-read',
  choices: (params) => {
    const { mod, written, main } = readParts(params);
    const num = (tex: string, answer: string) => ({ tex, answer });
    if (params.ask === 'modulus') {
      return steered(options(
        num(modTex(mod), modAnswer(mod)),
        num(`-${modTex(mod)}`, `-${modAnswer(mod)}`),
        num(`${mod.a * mod.a * mod.s}`, `${mod.a * mod.a * mod.s}`),
        num(mod.s === 2 ? `${mod.a}` : `${mod.a}\\sqrt{2}`, mod.s === 2 ? `${mod.a}` : `${mod.a}*sqrt(2)`),
      ), mix(params.a, params.s, params.m, params.d, 1));
    }
    const ang = ({ m, d }: Angle) => num(angleTex(m, d), angleAnswer(m, d));
    // Left unreduced, the sign lost, and the half turn a minus sign stands for
    // either missed or added.
    return steered(options(
      ang(main),
      ang({ m: params.m, d: params.d }),
      ang(reduced({ m: -main.m, d: main.d })),
      ang(reduced({ m: params.neg ? params.m : params.m + params.d, d: params.d })),
      ang(reduced({ m: main.m + written.d, d: written.d })),
      ang({ m: main.m, d: 2 * main.d }),
    ).slice(0, 4), mix(params.a, params.s, params.m, params.d, 2));
  },
  sample: (rng, difficulty) => {
    const { m, d } = rng.pick(EXP_ANGLES);
    const a = rng.int(1, difficulty < 2 ? 5 : 6);
    const s: 1 | 2 = rng.chance(0.3) ? 2 : 1;
    const ask = rng.pick(['modulus', 'argument'] as const);
    if (difficulty < 2) return { a, s, m, d, ask, neg: false };
    if (rng.chance(0.5)) return { a, s, m, d, ask, neg: true };
    return { a, s, m: m + 2 * d * rng.pick([-1, 1]), d, ask: 'argument', neg: false };
  },
  render: (params) => {
    const { mod, main, tex } = readParts(params);
    const modulus = params.ask === 'modulus';
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: modulus
            ? 'What is the modulus of $z$?'
            : 'What is the principal argument of $z$, between $-\\pi$ and $\\pi$?',
        },
        { kind: 'display', tex: `z = ${tex}` },
      ],
      lead: modulus ? '|z| =' : '\\arg z =',
      keypad: modulus ? SQRT_KEYS : ANGLE_KEYS,
      answer: modulus ? modAnswer(mod) : angleAnswer(main.m, main.d),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { mod, written, main } = readParts(params);
    const steps: SolutionStep[] = [
      {
        text: 'In $re^{i\\theta}$ the number in front is the modulus and the angle in the exponent is an argument.',
      },
    ];
    if (params.neg) {
      steps.push({
        text: 'A modulus is never negative. The minus sign is $e^{i\\pi}$, a half turn, so it joins the angle.',
        tex: `-${expTex(mod, written)} = ${expTex(mod, { m: written.m + written.d, d: written.d })}`,
      });
    }
    const raw: Angle = { m: written.m + (params.neg ? written.d : 0), d: written.d };
    if (raw.m !== main.m) {
      steps.push({
        text: 'That angle is outside $(-\\pi, \\pi]$, so take off a whole turn.',
        tex: `${angleTex(raw.m, raw.d)} \\to ${angleTex(main.m, main.d)}`,
      });
    }
    steps.push({ tex: `|z| = ${modTex(mod)}, \\quad \\arg z = ${angleTex(main.m, main.d)}` });
    return steps;
  },
};

/* ---------- Exponential form and modulus-argument form, swapped ---------- */

interface SwapParams { a: number; m: number; d: number; dir: 'toExp' | 'toPolar'; minus: boolean }

/**
 * The same number in the other notation. $e^{i\theta}$ is shorthand for
 * $\cos\theta + i\sin\theta$, so the modulus carries across and so does the
 * angle. The distractors change one of the two. At difficulty 2 the bracket
 * may read $\cos\theta - i\sin\theta$, which is $e^{-i\theta}$, not $e^{i\theta}$.
 */
export const expformSwap: Generator<SwapParams> = {
  id: 'expform-swap',
  sample: (rng, difficulty) => {
    const { m, d } = rng.pick(EXP_ANGLES.filter((angle) => angle.d !== 1));
    const dir = rng.pick(['toExp', 'toPolar'] as const);
    return { a: rng.int(2, difficulty < 2 ? 5 : 9), m, d, dir, minus: difficulty >= 2 && dir === 'toExp' && rng.chance(0.5) };
  },
  render: ({ a, m, d, dir, minus }) => {
    const mod: Mod = { a, s: 1 };
    const angle: Angle = { m, d };
    const t = paren(angleTex(m, d));
    const polar = (r: number, x: Angle) => `${r}\\left(\\cos ${paren(angleTex(x.m, x.d))} + i\\sin ${paren(angleTex(x.m, x.d))}\\right)`;
    const salt = mix(a, m, d, dir.length, minus ? 1 : 0);
    if (dir === 'toExp') {
      const shown = minus ? `${a}\\left(\\cos ${t} - i\\sin ${t}\\right)` : polar(a, angle);
      const right: Angle = minus ? { m: -m, d } : angle;
      const opts = distinctByValue([
        expOption(mod, right, true),
        expOption(mod, { m: -right.m, d }),
        expOption({ a: a * a, s: 1 }, right),
        expOption(mod, reduced({ m: d - right.m, d })),
        expOption(mod, reduced({ m: right.m + d, d })),
      ], 4);
      return choiceSlide(
        [
          { kind: 'prose', text: 'Which is this number in exponential form?' },
          { kind: 'display', tex: `z = ${shown}` },
        ],
        opts,
        salt,
      );
    }
    const polarOption = (r: number, x: Angle, correct = false) => ({
      tex: polar(r, x),
      value: pointOf({ a: r, s: 1 }, x),
      ...(correct && { correct: true }),
    });
    const opts = distinctByValue([
      polarOption(a, angle, true),
      polarOption(a, { m: -m, d }),
      polarOption(a, reduced({ m: d - m, d })),
      polarOption(a * a, angle),
      polarOption(a, reduced({ m: m + d, d })),
    ], 4);
    return choiceSlide(
      [
        { kind: 'prose', text: 'Which is this number in modulus-argument form?' },
        { kind: 'display', tex: `z = ${expTex(mod, angle)}` },
      ],
      opts,
      salt,
    );
  },
  solution: ({ a, m, d, dir, minus }) => {
    const t = paren(angleTex(m, d));
    const steps: SolutionStep[] = [
      {
        text: "Euler's formula is the whole translation: $e^{i\\theta} = \\cos\\theta + i\\sin\\theta$, so the modulus stays in front and the angle carries across.",
      },
    ];
    if (minus) {
      steps.push({
        text: 'Here the sine is subtracted. Since $\\cos(-\\theta) = \\cos\\theta$ and $\\sin(-\\theta) = -\\sin\\theta$, that is the angle $-\\theta$.',
        tex: `\\cos ${t} - i\\sin ${t} = e^{${expoTex({ m: -m, d })}}`,
      });
    }
    const angle: Angle = minus ? { m: -m, d } : { m, d };
    steps.push({
      tex: dir === 'toExp'
        ? `z = ${expTex({ a, s: 1 }, angle)}`
        : `z = ${a}\\left(\\cos ${paren(angleTex(m, d))} + i\\sin ${paren(angleTex(m, d))}\\right)`,
    });
    return steps;
  },
};

/* ---------- From a + bi to re^{iθ} ---------- */

interface ConvertParams { a: number; s: 1 | 2; m: number; d: number; bank: string[] }

/**
 * $a + bi$ back to $re^{i\theta}$, placing r and θ. The modulus is chosen so
 * both parts are whole or a whole multiple of √3: a multiple of 2 on the
 * π/6 family, √2 times a whole number on the diagonals, and anything on an
 * axis.
 */
export const expformConvert: Generator<ConvertParams> = {
  id: 'expform-convert',
  sample: (rng, difficulty) => {
    const { m, d } = rng.pick(EXP_ANGLES);
    const top = difficulty < 2 ? 2 : 4;
    const mod: Mod = d === 4 ? { a: rng.int(1, top), s: 2 } : d === 3 || d === 6 ? { a: 2 * rng.int(1, top), s: 1 } : { a: rng.int(1, 3 + top), s: 1 };
    const answer = [modTex(mod), angleTex(m, d)];
    const bank = tileBank(rng, answer, [
      `${mod.a * mod.a * mod.s}`,
      angleTex(-m, d),
      angleTex(principal(d - m, d), d),
      angleTex(principal(m + d, d), d),
      angleTex(principal(d - 2 * m, 2 * d), 2 * d),
      mod.s === 2 ? `${2 * mod.a}` : `${mod.a / 2}`,
    ].filter((token) => !token.includes('.')));
    return { a: mod.a, s: mod.s, m, d, bank };
  },
  render: ({ a, s, m, d, bank }) => {
    const { re, im } = cartesianParts({ a, s }, { m, d });
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write $z$ as $re^{i\\theta}$, with $-\\pi < \\theta \\le \\pi$.' },
        { kind: 'display', tex: `z = ${partsTex(re, im)}` },
      ],
      template: 'r = {0}, \\quad \\theta = {1}',
      bank,
      answer: [modTex({ a, s }), angleTex(m, d)],
    };
  },
  solution: ({ a, s, m, d }) => {
    const mod: Mod = { a, s };
    const { re, im } = cartesianParts(mod, { m, d });
    const [x, y] = pointOf(mod, { m, d });
    const onAxis = Math.abs(x) < 1e-9 || Math.abs(y) < 1e-9;
    return [
      {
        text: 'The modulus is the distance from the origin, by Pythagoras on the two parts.',
        tex: `r = \\sqrt{${Math.round(x * x)} + ${Math.round(y * y)}} = ${modTex(mod)}`,
      },
      {
        text: onAxis
          ? 'The point is on an axis, so its angle is one of the four quarter turns.'
          : `The point is in the ${QUADRANT_NAMES[quadrantOf(x, y)]} quadrant. Match the parts $${partTex(re)}$ and $${partTex(im)}$ to a cosine and sine of that size, with those signs.`,
        tex: `\\theta = ${angleTex(m, d)}`,
      },
      { tex: `z = ${expTex(mod, { m, d })}` },
    ];
  },
};

/* ---------- The principal argument, slid into range ---------- */

interface PrincipalParams { a: number; m: number; d: 4 | 6 }

/**
 * An exponent a turn or more out of range, brought back by sliding to the
 * principal argument in steps of π/4 or π/6. Difficulty 2 goes further out.
 */
export const expformPrincipal: Generator<PrincipalParams> = {
  id: 'expform-principal',
  sample: (rng, difficulty) => {
    const d = rng.pick([4, 6] as const);
    const reach = (difficulty < 2 ? 3 : 5) * d;
    for (;;) {
      const m = rng.int(-reach, reach);
      if (principal(m, d) === m) continue;
      return { a: rng.int(1, 5), m, d };
    }
  },
  render: ({ a, m, d }) => ({
    kind: 'slider',
    prompt: [
      { kind: 'prose', text: `Slide to the principal argument of $z$, in steps of $\\tfrac{\\pi}{${d}}$.` },
      { kind: 'display', tex: `z = ${expTex({ a, s: 1 }, { m, d })}` },
    ],
    min: 1 - d,
    max: d,
    step: 1,
    answer: principal(m, d),
    readout: `\\theta = {v} \\times \\tfrac{\\pi}{${d}}`,
  }),
  solution: ({ m, d }) => {
    const main = principal(m, d);
    const turns = (m - main) / (2 * d);
    return [
      {
        text: `Each whole turn is $2\\pi = \\tfrac{${2 * d}\\pi}{${d}}$, and taking one off does not move the point.`,
        tex: `${angleTex(m, d)} ${turns > 0 ? '-' : '+'} ${Math.abs(turns) === 1 ? '' : `${Math.abs(turns)} \\times `}2\\pi = ${angleTex(main, d)}`,
      },
      { text: `That is $${main}$ step${Math.abs(main) === 1 ? '' : 's'} of $\\tfrac{\\pi}{${d}}$, inside $(-\\pi, \\pi]$.` },
    ];
  },
};

/* ---------- Multiplying and dividing: moduli and arguments ---------- */

/** The angle groups `polar-multiply` draws from, plus the quarter turns. */
const EXP_GROUPS: { d: number; ks: number[] }[] = [...ANGLE_GROUPS, { d: 2, ks: [1, -1] }];

interface ProductParams { r1: number; r2: number; k1: number; k2: number; d: number; op: 'times' | 'divide' }

/**
 * $zw$ or $\tfrac{z}{w}$ with both in exponential form: the index laws, with
 * the moduli as the coefficients. Every distractor gets one half right, which
 * is how the mistake is usually made: adding moduli, or combining the angles
 * the wrong way.
 */
export const expformProduct: Generator<ProductParams> = {
  id: 'expform-product',
  sample: (rng, difficulty) => {
    const op = rng.pick(['times', 'divide'] as const);
    const top = difficulty < 2 ? 4 : 6;
    for (;;) {
      const group = rng.pick(EXP_GROUPS);
      const k1 = rng.pick(group.ks);
      const k2 = rng.pick(group.ks);
      const m = op === 'times' ? k1 + k2 : k1 - k2;
      if (principal(m, group.d) === 0) continue;
      const r2 = rng.int(2, top);
      const r1 = op === 'times' ? rng.int(2, top) : r2 * rng.int(2, difficulty < 2 ? 3 : 4);
      return { r1, r2, k1, k2, d: group.d, op };
    }
  },
  render: ({ r1, r2, k1, k2, d, op }) => {
    const times = op === 'times';
    const r = times ? r1 * r2 : r1 / r2;
    const wrong = times ? r1 + r2 : r1 - r2;
    const right: Angle = reduced({ m: times ? k1 + k2 : k1 - k2, d });
    const other: Angle = reduced({ m: times ? k1 - k2 : k1 + k2, d });
    const opts = distinctByValue([
      expOption({ a: r, s: 1 }, right, true),
      expOption({ a: wrong, s: 1 }, right),
      expOption({ a: r, s: 1 }, other),
      expOption({ a: wrong, s: 1 }, other),
      expOption({ a: r, s: 1 }, reduced({ m: -right.m, d })),
    ], 4);
    return choiceSlide(
      [
        {
          kind: 'prose',
          text: `$z = ${expTex({ a: r1, s: 1 }, { m: k1, d })}$ and $w = ${expTex({ a: r2, s: 1 }, { m: k2, d })}$.`,
        },
        {
          kind: 'prose',
          text: `Which is $${times ? 'zw' : '\\frac{z}{w}'}$, with its argument in $(-\\pi, \\pi]$?`,
        },
      ],
      opts,
      mix(r1, r2, k1, k2, d, times ? 1 : 2),
    );
  },
  solution: ({ r1, r2, k1, k2, d, op }) => {
    const times = op === 'times';
    const raw: Angle = { m: times ? k1 + k2 : k1 - k2, d };
    const main = reduced(raw);
    const steps: SolutionStep[] = [
      {
        text: times
          ? 'Multiply the numbers in front and add the powers of $e$, exactly as with $x^a \\times x^b = x^{a + b}$.'
          : 'Divide the numbers in front and subtract the powers of $e$, exactly as with $x^a \\div x^b = x^{a - b}$.',
        tex: `${times ? `${r1} \\times ${r2}` : `${r1} \\div ${r2}`} = ${times ? r1 * r2 : r1 / r2}`,
      },
      {
        tex: `${angleTex(k1, d)} ${times ? '+' : '-'} ${paren(angleTex(k2, d))} = ${angleTex(raw.m, d)}`,
      },
    ];
    if (main.m !== raw.m) {
      steps.push({
        text: 'That is outside $(-\\pi, \\pi]$, so take off a whole turn.',
        tex: `${angleTex(raw.m, d)} \\to ${angleTex(main.m, d)}`,
      });
    }
    steps.push({ tex: `${times ? 'zw' : '\\frac{z}{w}'} = ${expTex({ a: times ? r1 * r2 : r1 / r2, s: 1 }, main)}` });
    return steps;
  },
};

/* ---------- Dividing, with the working as a tree ---------- */

interface QuotientTreeParams { r2: number; q: number; k1: number; k2: number; d: number; bank: string[] }

/** Pairs of angles whose difference leaves (−π, π] and needs bringing back. */
const QUOTIENT_PAIRS: { k1: number; k2: number; d: number }[] = EXP_GROUPS.flatMap(({ d, ks }) =>
  ks.flatMap((k1) => ks.map((k2) => ({ k1, k2, d }))),
).filter(({ k1, k2, d }) => principal(k1 - k2, d) !== k1 - k2 && principal(k1 - k2, d) !== 0);

/**
 * $\tfrac{z}{w}$ as two strands, the modulus and the angle, meeting in the
 * answer. Every pair is one whose difference needs a turn added or taken off,
 * so the third node is never a copy of the second.
 */
export const expformQuotientTree: Generator<QuotientTreeParams> = {
  id: 'expform-quotient-tree',
  sample: (rng, difficulty) => {
    const { k1, k2, d } = rng.pick(QUOTIENT_PAIRS);
    const r2 = rng.int(2, difficulty < 2 ? 3 : 5);
    const q = rng.int(2, difficulty < 2 ? 3 : 4);
    const main = principal(k1 - k2, d);
    const answer = quotientAnswer({ r2, q, k1, k2, d });
    const pool = [
      `${q * r2 * r2}`,
      `${q * r2 - r2}`,
      angleTex(k1 + k2, d),
      angleTex(k2 - k1, d),
      angleTex(principal(k2 - k1, d), d),
      expTex({ a: q, s: 1 }, { m: -main, d }),
      expTex({ a: q * r2 * r2, s: 1 }, { m: main, d }),
    ];
    const extras: string[] = [];
    for (const token of pool) {
      if (!answer.includes(token) && !extras.includes(token)) extras.push(token);
    }
    return { r2, q, k1, k2, d, bank: rng.shuffle([...answer, ...extras.slice(0, 3)]) };
  },
  render: (params) => {
    const { r2, q, k1, k2, d, bank } = params;
    return {
      kind: 'tree',
      prompt: [
        { kind: 'prose', text: 'Top row: the moduli divided, then the angles subtracted. Next, that angle brought into $(-\\pi, \\pi]$. Last, the answer.' },
      ],
      expression: `\\dfrac{${expTex({ a: q * r2, s: 1 }, { m: k1, d })}}{${expTex({ a: r2, s: 1 }, { m: k2, d })}}`,
      nodes: [
        { id: 'mod', from: [] },
        { id: 'raw', from: [] },
        { id: 'arg', from: ['raw'] },
        { id: 'result', from: ['mod', 'arg'] },
      ],
      bank,
      answer: quotientAnswer(params),
    };
  },
  solution: ({ r2, q, k1, k2, d }) => {
    const main = principal(k1 - k2, d);
    return [
      { text: 'The moduli divide.', tex: `${q * r2} \\div ${r2} = ${q}` },
      {
        text: 'The angles subtract, top minus bottom.',
        tex: `${angleTex(k1, d)} - ${paren(angleTex(k2, d))} = ${angleTex(k1 - k2, d)}`,
      },
      {
        text: `That is ${k1 - k2 > 0 ? 'past $\\pi$' : 'at or below $-\\pi$'}, so ${k1 - k2 > 0 ? 'take off' : 'add'} a whole turn of $2\\pi$.`,
        tex: `${angleTex(k1 - k2, d)} \\to ${angleTex(main, d)}`,
      },
      { tex: `\\frac{z}{w} = ${expTex({ a: q, s: 1 }, { m: main, d })}` },
    ];
  },
};

function quotientAnswer({ q, k1, k2, d }: Omit<QuotientTreeParams, 'bank'>): string[] {
  const main = principal(k1 - k2, d);
  return [`${q}`, angleTex(k1 - k2, d), angleTex(main, d), expTex({ a: q, s: 1 }, { m: main, d })];
}

/* ---------- The reciprocal, the conjugate and the negative ---------- */

type Relative = 'recip' | 'conj' | 'neg' | 'recipconj';

interface RelativeParams { r: number; m: number; d: number; op: Relative; bank: string[] }

const RELATIVE_TEX: Record<Relative, string> = {
  recip: '\\frac{1}{z}',
  conj: '\\overline{z}',
  neg: '-z',
  recipconj: '\\frac{1}{\\overline{z}}',
};

/** The modulus and principal argument of each relative of re^{iθ}, as tiles read them. */
function relativeOf({ r, m, d, op }: Omit<RelativeParams, 'bank'>): [string, string] {
  const inverse = op === 'recip' || op === 'recipconj';
  const angle = op === 'recip' || op === 'conj' ? -m : op === 'neg' ? m + d : m;
  return [inverse ? `\\tfrac{1}{${r}}` : `${r}`, angleTex(principal(angle, d), d)];
}

/**
 * $\tfrac{1}{z} = \tfrac{1}{r}e^{-i\theta}$ and $\overline{z} = re^{-i\theta}$:
 * both turn the angle round, and only one touches the modulus. Difficulty 2
 * adds $-z$, a half turn, and $\tfrac{1}{\overline{z}}$, where the two turns
 * cancel.
 */
export const expformReciprocal: Generator<RelativeParams> = {
  id: 'expform-reciprocal',
  sample: (rng, difficulty) => {
    const { m, d } = rng.pick(EXP_ANGLES.filter((angle) => angle.d !== 1));
    const r = rng.int(2, difficulty < 2 ? 4 : 6);
    const op = rng.pick(difficulty < 2 ? (['recip', 'conj'] as const) : (['recip', 'conj', 'neg', 'recipconj'] as const));
    const answer = relativeOf({ r, m, d, op });
    const bank = tileBank(rng, answer, [
      answer[0] === `${r}` ? `\\tfrac{1}{${r}}` : `${r}`,
      `-${r}`,
      angleTex(m, d),
      angleTex(-m, d),
      angleTex(principal(m + d, d), d),
      angleTex(principal(d - m, d), d),
    ]);
    return { r, m, d, op, bank };
  },
  render: (params) => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: `$z = ${expTex({ a: params.r, s: 1 }, { m: params.m, d: params.d })}$ and $w = ${RELATIVE_TEX[params.op]}$. Place the modulus and principal argument of $w$.`,
      },
    ],
    template: '|w| = {0}, \\quad \\arg w = {1}',
    bank: params.bank,
    answer: relativeOf(params),
  }),
  solution: (params) => {
    const { r, m, d, op } = params;
    const z = expTex({ a: r, s: 1 }, { m, d });
    const [size, angle] = relativeOf(params);
    const working: Record<Relative, SolutionStep> = {
      recip: {
        text: 'One over a power of $e$ is the negative power, and one over the modulus stays in front.',
        tex: `\\frac{1}{${z}} = \\tfrac{1}{${r}}e^{${expoTex({ m: -m, d })}}`,
      },
      conj: {
        text: 'The conjugate reflects in the real axis: the same distance out, the angle turned the other way.',
        tex: `\\overline{${z}} = ${expTex({ a: r, s: 1 }, { m: -m, d })}`,
      },
      neg: {
        text: 'A minus sign is $e^{i\\pi}$, a half turn, so it adds $\\pi$ to the angle.',
        tex: `-z = ${expTex({ a: r, s: 1 }, { m: m + d, d })}`,
      },
      recipconj: {
        text: 'The conjugate turns the angle round and the reciprocal turns it back, so only the modulus changes.',
        tex: `\\frac{1}{\\overline{z}} = \\tfrac{1}{${r}}e^{${expoTex({ m, d })}}`,
      },
    };
    const steps: SolutionStep[] = [working[op]];
    const raw = op === 'recip' || op === 'conj' ? -m : op === 'neg' ? m + d : m;
    if (principal(raw, d) !== raw) {
      steps.push({ text: 'Bring the angle into $(-\\pi, \\pi]$.', tex: `${angleTex(raw, d)} \\to ${angle}` });
    }
    steps.push({ tex: `|w| = ${size}, \\quad \\arg w = ${angle}` });
    return steps;
  },
};

/* ---------- Multiplying by e^{iθ} is a turn ---------- */

interface TurnByParams { a: number; b: number; k: number; scale: number }

/** A lattice point turned by k quarter turns. */
function quarterTurn(a: number, b: number, k: number): [number, number] {
  let [x, y] = [a, b];
  for (let j = 0; j < mod(k, 4); j += 1) [x, y] = [-y, x];
  return [x, y];
}

/**
 * $z \times e^{i\theta}$, plotted: multiplying by a number of modulus 1 turns
 * $z$ about the origin by $\theta$ and leaves its length alone. Quarter turns
 * keep the answer on the lattice. Difficulty 2 writes some multipliers a
 * whole turn round and lets the modulus be 2, a turn and a stretch at once.
 */
export const expformTurn: Generator<TurnByParams> = {
  id: 'expform-turn',
  sample: (rng, difficulty) => {
    const k = difficulty < 2 ? rng.pick([1, 2, -1]) : rng.pick([1, 2, -1, 3, -2, -3]);
    const scale = difficulty >= 2 && rng.chance(0.4) ? 2 : 1;
    const top = scale === 2 ? 2 : 3;
    return { a: nonZero(rng, top), b: nonZero(rng, top), k, scale };
  },
  render: ({ a, b, k, scale }) => {
    const [x, y] = quarterTurn(a, b, k);
    return {
      kind: 'plot',
      prompt: [
        {
          kind: 'prose',
          text: `Plot $z \\times ${expTex({ a: scale, s: 1 }, { m: k, d: 2 })}$, where $z = ${complexTex(a, b)}$.`,
        },
      ],
      range: RANGE,
      answer: { re: x * scale, im: y * scale },
    };
  },
  solution: ({ a, b, k, scale }) => {
    const [x, y] = quarterTurn(a, b, k);
    const turn = mod(k, 4);
    const unit = ['1', 'i', '-1', '-i'][turn];
    const steps: SolutionStep[] = [
      {
        text: `$e^{${expoTex({ m: k, d: 2 })}}$ has modulus 1, so multiplying by it turns $z$ about the origin by $${angleTex(k, 2)}$ without stretching it. By Euler's formula it is $${unit}$.`,
      },
      {
        text: `A quarter turn anticlockwise takes $a + bi$ to $-b + ai$${turn === 1 ? '' : `, and this is ${turn === 2 ? 'two' : 'three'} of them`}.`,
        tex: `${complexTex(a, b)} \\to ${complexTex(x, y)}`,
      },
    ];
    if (scale !== 1) {
      steps.push({ text: `The $${scale}$ in front then doubles the distance from the origin.`, tex: `${complexTex(x * scale, y * scale)}` });
    }
    return steps;
  },
};

/* ---------- Powers: (re^{iθ})^n written as a + bi ---------- */

interface PowerExpParams { r: number; m: number; d: number; n: number }

/** z^n for z = re^{iθ}: its modulus, its angle before and after reducing, and its exact parts. */
function powerParts({ r, m, d, n }: PowerExpParams) {
  const mod: Mod = { a: r ** n, s: 1 };
  const raw: Angle = { m: n * m, d };
  const main = reduced(raw);
  return { mod, raw, main, ...cartesianParts(mod, main) };
}

/**
 * Draws a power whose answer has whole parts: r = 2 always does, and r = 3
 * only when the power lands on an axis, since 27 × ½ is not a number anyone
 * should be asked to type.
 */
function samplePower(rng: Rng, top: number, needsTurn: boolean): PowerExpParams {
  for (;;) {
    const { m, d } = rng.pick(EXP_ANGLES);
    const r = rng.pick([2, 3]);
    const n = rng.int(2, top);
    const params = { r, m, d, n };
    const { raw, main, re, im } = powerParts(params);
    if (re.q !== 1 || im.q !== 1) continue;
    if (needsTurn && (raw.m === main.m || main.m === 0)) continue;
    return params;
  }
}

function powerWorking(params: PowerExpParams): SolutionStep[] {
  const { r, m, d, n } = params;
  const { mod, raw, main, re, im } = powerParts(params);
  const steps: SolutionStep[] = [
    {
      text: 'A power applies to both factors: the modulus is raised to it, and the exponent of $e$ is multiplied by it.',
      tex: `z^{${n}} = ${r}^{${n}}e^{${n} \\times ${paren(expoTex({ m, d }))}} = ${expTex(mod, raw)}`,
    },
  ];
  if (raw.m !== main.m) {
    steps.push({ text: 'Take off whole turns to bring the angle into $(-\\pi, \\pi]$.', tex: `${angleTex(raw.m, d)} \\to ${angleTex(main.m, d)}` });
  }
  steps.push({
    text: `Then Euler's formula: $${mod.a}$ times the cosine and the sine of $${angleTex(main.m, d)}$.`,
    tex: `z^{${n}} = ${partsTex(re, im)}`,
  });
  return steps;
}

export const expformPower: Generator<PowerExpParams> = {
  id: 'expform-power',
  sample: (rng, difficulty) => samplePower(rng, difficulty < 2 ? 3 : 4, false),
  render: (params) => {
    const { re, im } = powerParts(params);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `Write $z^{${params.n}}$ in the form $a + bi$.` },
        { kind: 'display', tex: `z = ${expTex({ a: params.r, s: 1 }, { m: params.m, d: params.d })}` },
      ],
      lead: `z^{${params.n}} =`,
      keypad: EXACT_KEYS,
      answer: partsAnswer(re, im),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: powerWorking,
};

/* ---------- Powers, one step at a time ---------- */

/** Up to four distinct values for one stage of a `steps` line, the right one among them, in a fixed scatter. */
function stageBank(value: string, ...candidates: string[]): string[] {
  const bank = [value];
  for (const candidate of candidates) {
    if (bank.length < 4 && !bank.includes(candidate)) bank.push(candidate);
  }
  return [...bank].sort((x, y) => hashSeed(x) - hashSeed(y));
}

/**
 * The same power worked in four stages on one line: the modulus, the angle
 * multiplied, the angle reduced, and Euler's formula to finish. Only powers
 * whose angle genuinely leaves (−π, π] are drawn, so the third stage is
 * never a copy of the second.
 */
export const expformPowerSteps: Generator<PowerExpParams> = {
  id: 'expform-power-steps',
  sample: (rng, difficulty) => samplePower(rng, difficulty < 2 ? 4 : 5, true),
  render: (params) => {
    const { r, m, d, n } = params;
    const { mod, raw, main, re, im } = powerParts(params);
    const e = (angle: Angle) => `e^{${expoTex(angle)}}`;
    const final = partsTex(re, im);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `$z = ${expTex({ a: r, s: 1 }, { m, d })}$. Work out $z^{${n}}$ a step at a time: tap the part to do next, then choose what it becomes.`,
        },
      ],
      start: [`${r}^{${n}}`, `e^{${n} \\times ${paren(expoTex({ m, d }))}}`],
      reductions: [
        {
          span: [0, 1],
          value: `${mod.a}`,
          bank: stageBank(`${mod.a}`, `${r * n}`, `${r ** (n - 1)}`, `${r ** (n + 1)}`),
        },
        {
          span: [1, 2],
          value: e(raw),
          bank: stageBank(e(raw), e({ m, d }), e({ m: (n + 1) * m, d }), e({ m, d: n * d })),
        },
        {
          span: [1, 2],
          value: e(main),
          bank: stageBank(
            e(main),
            e(reduced({ m: -main.m, d })),
            e(reduced({ m: main.m + d, d })),
            e({ m: raw.m - Math.sign(raw.m) * d, d }),
            e({ m: main.m, d: 2 * d }),
            e(reduced({ m: 2 * main.m + d, d: 2 * d })),
          ),
        },
        {
          span: [0, 2],
          value: final,
          bank: stageBank(final, partsTex(re, flipPart(im)), partsTex(im, re), partsTex(flipPart(re), im)),
        },
      ],
    };
  },
  solution: powerWorking,
};

/* ---------- Powers, plotted ---------- */

interface PowerPlotParams { index: number; scale: number; n: number; turns: number }

/**
 * $z^n$ plotted for a lattice $z$ written in exponential form. On a diagonal
 * the modulus is √2 and the powers go 2, 2√2, 4: the point spirals out a
 * diagonal and an axis at a time. Difficulty 2 writes some angles a turn round.
 */
export const expformPowerPlot: Generator<PowerPlotParams> = {
  id: 'expform-power-plot',
  sample: (rng, difficulty) => {
    const options: { index: number; scale: number; n: number }[] = [];
    for (let index = 1; index < 8; index += 1) {
      const diagonal = index % 2 === 1;
      for (let n = 2; n <= (diagonal ? 5 : 4); n += 1) options.push({ index, scale: 1, n });
      if (!diagonal) options.push({ index, scale: 2, n: 2 });
    }
    const pick = rng.pick(options);
    return { ...pick, turns: difficulty < 2 ? 0 : rng.pick([-1, 0, 1]) };
  },
  render: ({ index, scale, n, turns }) => {
    const { mod, angle, re, im } = latticeExp(index, scale);
    const [x, y] = powersOf(re, im, n)[n - 1];
    return {
      kind: 'plot',
      prompt: [{ kind: 'prose', text: `Plot $z^{${n}}$, where $z = ${expTex(mod, { m: angle.m + 8 * turns, d: 4 })}$.` }],
      range: RANGE,
      answer: { re: x, im: y },
    };
  },
  solution: ({ index, scale, n, turns }) => {
    const { mod, angle, re, im } = latticeExp(index, scale);
    const [x, y] = powersOf(re, im, n)[n - 1];
    const written: Angle = { m: angle.m + 8 * turns, d: 4 };
    const size = Math.sqrt(x * x + y * y);
    const sizeTex = Number.isInteger(size) ? `${size}` : modTex({ a: Math.round(size / Math.SQRT2), s: 2 });
    const raw: Angle = { m: n * written.m, d: 4 };
    const main = reduced(raw);
    const unit = mod.a === 1 && mod.s === 1;
    const steps: SolutionStep[] = [
      unit
        ? { text: `The modulus is 1, so every power stays on the unit circle. Multiply the angle by ${n}.` }
        : {
            text: `Raise the modulus to the power ${n} and multiply the angle by ${n}.`,
            tex: `|z^{${n}}| = (${modTex(mod)})^{${n}} = ${sizeTex}`,
          },
      { tex: `${n} \\times ${paren(angleTex(written.m, 4))} = ${angleTex(raw.m, 4)}` },
    ];
    if (main.m !== raw.m) {
      steps.push({ text: 'Whole turns change nothing, so take them off.', tex: `${angleTex(raw.m, 4)} \\to ${angleTex(main.m, 4)}` });
    }
    steps.push({ text: `So $z^{${n}}$ is $${sizeTex}$ out in the direction $${angleTex(main.m, 4)}$.`, tex: `z^{${n}} = ${complexTex(x, y)}` });
    return steps;
  },
};

/* ---------- The least power that is real ---------- */

type Target = 'real' | 'positive' | 'imaginary';

interface LeastParams { k: number; d: number; want: Target }

/** The least n ≥ 1 for which n·kπ/d lands where it is wanted; 0 when none does by 24. */
function leastPower(k: number, d: number, want: Target): number {
  for (let n = 1; n <= 24; n += 1) {
    const top = n * k;
    if (want === 'real' && top % d === 0) return n;
    if (want === 'positive' && top % (2 * d) === 0) return n;
    if (want === 'imaginary' && mod(2 * top, 2 * d) === d) return n;
  }
  return 0;
}

const TARGET_TEXT: Record<Target, string> = {
  real: 'real',
  positive: 'real and positive',
  imaginary: 'purely imaginary',
};

/**
 * The least positive n for which $z^n$ is real. The argument of $z^n$ is
 * $n\theta$, so the question is the least multiple of θ that is a whole
 * number of half turns. Difficulty 2 asks for a positive real number (whole
 * turns) or a purely imaginary one (an odd number of quarter turns).
 */
export const expformLeastPower: Generator<LeastParams> = {
  id: 'expform-least-power',
  sample: (rng, difficulty) => {
    for (;;) {
      const d = rng.int(2, 12);
      const k = rng.int(1 - d, d);
      if (k === 0 || k === d) continue;
      const want: Target = difficulty < 2 ? 'real' : rng.pick(['real', 'positive', 'imaginary'] as const);
      const n = leastPower(k, d, want);
      if (n < 2 || n > 12) continue;
      return { k, d, want };
    }
  },
  render: ({ k, d, want }) => ({
    kind: 'slider',
    prompt: [
      { kind: 'prose', text: `Slide to the least positive whole $n$ for which $z^n$ is ${TARGET_TEXT[want]}.` },
      { kind: 'display', tex: `z = 2e^{${expoTex({ m: k, d })}}` },
    ],
    min: 1,
    max: 12,
    step: 1,
    answer: leastPower(k, d, want),
    readout: 'n = {v}',
  }),
  solution: ({ k, d, want }) => {
    const n = leastPower(k, d, want);
    const need: Record<Target, string> = {
      real: 'a whole number of half turns, $\\pi$',
      positive: 'a whole number of full turns, $2\\pi$',
      imaginary: 'an odd number of quarter turns, $\\tfrac{\\pi}{2}$',
    };
    return [
      {
        text: `The argument of $z^n$ is $n$ times the argument of $z$. The modulus does not matter: only the direction decides whether $z^n$ is ${TARGET_TEXT[want]}.`,
      },
      { text: `That direction has to be ${need[want]}. Try $n = 1, 2, 3, \\ldots$ until it is.` },
      { tex: `${n} \\times ${paren(angleTex(k, d))} = ${angleTex(n * k, d)}` },
    ];
  },
};

/* ---------- Negative powers ---------- */

interface NegativePowerParams { r: number; m: number; d: number; n: number; bank: string[] }

function negativePowerOf({ r, m, d, n }: Omit<NegativePowerParams, 'bank'>): [string, string] {
  return [`\\tfrac{1}{${r ** n}}`, angleTex(principal(-n * m, d), d)];
}

/**
 * $z^{-n} = r^{-n}e^{-in\theta}$: the power law still holds with a negative
 * power, so the modulus becomes a fraction and the angle turns the other way.
 */
export const expformNegativePower: Generator<NegativePowerParams> = {
  id: 'expform-negative-power',
  sample: (rng, difficulty) => {
    const { m, d } = rng.pick(EXP_ANGLES);
    const n = difficulty < 2 ? rng.int(1, 2) : rng.int(2, 3);
    const r = n === 3 ? 2 : rng.int(2, 3);
    const answer = negativePowerOf({ r, m, d, n });
    const bank = tileBank(rng, answer, [
      `${r ** n}`,
      `\\tfrac{1}{${r * n}}`,
      angleTex(principal(n * m, d), d),
      angleTex(principal(-m, d), d),
      angleTex(principal(-n * m + d, d), d),
    ]);
    return { r, m, d, n, bank };
  },
  render: (params) => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: `$z = ${expTex({ a: params.r, s: 1 }, { m: params.m, d: params.d })}$ and $w = z^{-${params.n}}$. Place the modulus and principal argument of $w$.`,
      },
    ],
    template: '|w| = {0}, \\quad \\arg w = {1}',
    bank: params.bank,
    answer: negativePowerOf(params),
  }),
  solution: (params) => {
    const { r, m, d, n } = params;
    const [size, angle] = negativePowerOf(params);
    const steps: SolutionStep[] = [
      {
        text: `The power law works for $-${n}$ too: raise the modulus to it and multiply the angle by it.`,
        tex: `z^{-${n}} = ${r}^{-${n}}e^{${expoTex({ m: -n * m, d })}}`,
      },
      { text: `A negative power of the modulus is one over the positive power: $${r}^{-${n}} = ${size}$.` },
    ];
    if (principal(-n * m, d) !== -n * m) {
      steps.push({ text: 'Bring the angle into $(-\\pi, \\pi]$.', tex: `${angleTex(-n * m, d)} \\to ${angle}` });
    }
    steps.push({ tex: `|w| = ${size}, \\quad \\arg w = ${angle}` });
    return steps;
  },
};

/* ---------- Which form for the job? ---------- */

type Job = 'sum' | 'difference' | 'product' | 'quotient' | 'power';

interface MethodParams { job: Job; zTex: string; wTex: string; zExp: boolean; wExp: boolean; n: number }

const JOB_TEX: Record<Job, (n: number) => string> = {
  sum: () => 'z + w',
  difference: () => 'z - w',
  product: () => 'zw',
  quotient: () => '\\dfrac{z}{w}',
  power: (n) => `z^{${n}}`,
};

const CARTESIAN_LABEL = 'Cartesian, $a + bi$';
const EXPONENTIAL_LABEL = 'Exponential, $re^{i\\theta}$';

/** A number for a method question, in whichever form was drawn. */
function methodNumber(rng: Rng, exponential: boolean): string {
  if (exponential) {
    const { m, d } = rng.pick(EXP_ANGLES);
    return expTex({ a: rng.int(2, 5), s: 1 }, { m, d });
  }
  return complexTex(nonZero(rng, 5), nonZero(rng, 5));
}

/**
 * Which form suits the job, then whether anything needs converting first.
 * Adding works part by part, so it wants a + bi; multiplying, dividing and
 * powers multiply moduli and add angles, so they want re^{iθ}. Powers are
 * drawn at 5 or more, where multiplying out a + bi is plainly the long way.
 */
export const expformMethodFlow: Generator<MethodParams> = {
  id: 'expform-method-flow',
  sample: (rng, difficulty) => {
    const job = rng.pick(['sum', 'difference', 'product', 'quotient', 'power'] as const);
    const zExp = rng.chance(0.5);
    const wExp = job === 'power' ? zExp : difficulty < 2 ? zExp : rng.chance(0.5);
    return {
      job,
      zTex: methodNumber(rng, zExp),
      wTex: job === 'power' ? '' : methodNumber(rng, wExp),
      zExp,
      wExp,
      n: rng.int(5, 12),
    };
  },
  render: ({ job, zTex, wTex, zExp, wExp, n }) => {
    const additive = job === 'sum' || job === 'difference';
    const ready = additive ? !zExp && !wExp : zExp && wExp;
    const readiness = [
      { label: 'Yes', outcome: 'Work it out as it stands.' },
      { label: 'No', outcome: 'Convert first, then work it out.' },
    ];
    return {
      kind: 'flow',
      prompt: [
        { kind: 'prose', text: 'Which form makes this easiest? Work down the questions.' },
        { kind: 'display', tex: job === 'power' ? `z = ${zTex}` : `z = ${zTex}, \\quad w = ${wTex}` },
      ],
      subject: JOB_TEX[job](n),
      steps: [
        {
          id: 'form',
          ask: 'Which form suits this job?',
          branches: [
            { label: CARTESIAN_LABEL, to: 'cartesian' },
            { label: EXPONENTIAL_LABEL, to: 'exponential' },
          ],
        },
        { id: 'cartesian', ask: 'Is everything already in that form?', branches: readiness },
        { id: 'exponential', ask: 'Is everything already in that form?', branches: readiness },
      ],
      answer: [additive ? CARTESIAN_LABEL : EXPONENTIAL_LABEL, ready ? 'Yes' : 'No'],
    };
  },
  solution: ({ job, zTex, wTex, zExp, wExp, n }) => {
    const additive = job === 'sum' || job === 'difference';
    const wrong = additive ? [zExp && `$z = ${zTex}$`, wExp && `$w = ${wTex}$`] : [!zExp && `$z = ${zTex}$`, job !== 'power' && !wExp && `$w = ${wTex}$`];
    const convert = wrong.filter(Boolean);
    return [
      {
        text: additive
          ? 'Adding and subtracting go part by part, real with real and imaginary with imaginary, so $a + bi$ is the form for it.'
          : `${job === 'power' ? `A power like $z^{${n}}$ raises the modulus and multiplies the angle` : 'Multiplying and dividing combine the moduli and the angles'}, so $re^{i\\theta}$ is the form for it.`,
      },
      {
        text: convert.length === 0
          ? 'Everything is already in that form, so there is nothing to convert.'
          : `${convert.join(' and ')} ${convert.length === 1 ? 'needs' : 'need'} converting first.`,
      },
    ];
  },
};

/* ---------- A point, matched to its exponential form ---------- */

interface MatchPointParams { index: number; scale: number }

/**
 * A lattice point on the plane and four exponential forms. The distractors are
 * the conjugate, the reflection in the imaginary axis, the opposite point,
 * and the right direction at a modulus read wrongly off a diagonal.
 */
export const expformMatchPoint: Generator<MatchPointParams> = {
  id: 'expform-match-point',
  sample: (rng) => ({ index: rng.int(1, 7), scale: rng.int(1, RANGE) }),
  render: ({ index, scale }) => {
    const { mod, angle, re, im, diagonal } = latticeExp(index, scale);
    const wrongMod: Mod = diagonal ? { a: 2 * scale, s: 1 } : { a: scale, s: 2 };
    const opts = distinctByValue([
      expOption(mod, angle, true),
      expOption(mod, { m: -angle.m, d: 4 }),
      expOption(mod, reduced({ m: 4 - angle.m, d: 4 })),
      expOption(wrongMod, angle),
      expOption(mod, reduced({ m: angle.m + 4, d: 4 })),
    ], 4);
    return choiceSlide(
      [
        { kind: 'prose', text: 'Which is the marked number in exponential form?' },
        { kind: 'diagram', svg: complexPlaneSvg(RANGE, [{ re, im, highlight: true }]) },
      ],
      opts,
      mix(index, scale, 7),
    );
  },
  solution: ({ index, scale }) => {
    const { mod, angle, re, im, diagonal } = latticeExp(index, scale);
    return [
      {
        text: 'The modulus is the distance from the origin.',
        tex: `r = \\sqrt{${re * re} + ${im * im}} = ${modTex(mod)}`,
      },
      {
        text: diagonal
          ? `The point is on a diagonal in the ${QUADRANT_NAMES[quadrantOf(re, im)]} quadrant.`
          : 'The point is on an axis, so the angle is a quarter turn or a half turn.',
        tex: `\\theta = ${angleTex(angle.m, 4)}`,
      },
      { tex: `${complexTex(re, im)} = ${expTex(mod, angle)}` },
    ];
  },
};

/* ---------- Adding: back to a + bi ---------- */

interface SumParams { i1: number; s1: number; i2: number; s2: number; op: 1 | -1 }

function sumParts({ i1, s1, i2, s2, op }: SumParams) {
  const z = latticeExp(i1, s1);
  const w = latticeExp(i2, s2);
  return { z, w, x: z.re + op * w.re, y: z.im + op * w.im };
}

/**
 * $z + w$ with both in exponential form. There is no rule for adding moduli
 * and angles, so each is turned into $a + bi$ first. The points are on the
 * lattice, so the answer is whole.
 */
export const expformSum: Generator<SumParams> = {
  id: 'expform-sum',
  choices: (params) => {
    const { z, w, x, y } = sumParts(params);
    const opt = (p: number, q: number) => ({ tex: complexTex(p, q), answer: complexAnswer(p, q) });
    return steered(
      options(opt(x, y), opt(z.re - params.op * w.re, z.im - params.op * w.im), opt(x, -y), opt(y, x), opt(-x, y)).slice(0, 4),
      mix(params.i1, params.s1, params.i2, params.s2, params.op),
    );
  },
  sample: (rng, difficulty) => {
    for (;;) {
      const i1 = rng.int(0, 7);
      const i2 = rng.int(0, 7);
      if (i1 === i2) continue;
      const params: SumParams = {
        i1,
        s1: rng.int(1, difficulty < 2 ? 3 : 4),
        i2,
        s2: rng.int(1, difficulty < 2 ? 3 : 4),
        op: difficulty < 2 || rng.chance(0.5) ? 1 : -1,
      };
      const { x, y } = sumParts(params);
      if (x === 0 && y === 0) continue;
      return params;
    }
  },
  render: (params) => {
    const { z, w, x, y } = sumParts(params);
    const sign = params.op === 1 ? '+' : '-';
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `$z = ${expTex(z.mod, z.angle)}$ and $w = ${expTex(w.mod, w.angle)}$. Write $z ${sign} w$ in the form $a + bi$.` },
      ],
      lead: `z ${sign} w =`,
      keypad: I_KEY,
      answer: complexAnswer(x, y),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { z, w, x, y } = sumParts(params);
    const sign = params.op === 1 ? '+' : '-';
    return [
      { text: 'Adding has no shortcut in exponential form, so write each number as $a + bi$ first.' },
      { tex: `z = ${expTex(z.mod, z.angle)} = ${complexTex(z.re, z.im)}` },
      { tex: `w = ${expTex(w.mod, w.angle)} = ${complexTex(w.re, w.im)}` },
      { text: `Then ${params.op === 1 ? 'add' : 'subtract'} the real parts and the imaginary parts.`, tex: `z ${sign} w = ${complexTex(x, y)}` },
    ];
  },
};

/* ---------- A power of a + bi, by way of re^{iθ} ---------- */

interface CartesianPowerParams { m: number; d: number; n: number }

/** Bases of modulus √2 (the diagonals) or 2 (the π/6 family): r^n stays whole or √2 times whole. */
const POWER_BASES: Angle[] = EXP_ANGLES.filter(({ d }) => d === 4 || d === 3 || d === 6);

function cartesianPowerParts({ m, d, n }: CartesianPowerParams) {
  const base: Mod = d === 4 ? { a: 1, s: 2 } : { a: 2, s: 1 };
  const power: Mod = d === 4 ? { a: 2 ** Math.floor(n / 2), s: n % 2 === 1 ? 2 : 1 } : { a: 2 ** n, s: 1 };
  const b = cartesianParts(base, { m, d });
  const raw: Angle = { m: n * m, d };
  const main = reduced(raw);
  return { base, power, baseTex: partsTex(b.re, b.im), raw, main, ...cartesianParts(power, main) };
}

/**
 * $(a + bi)^n$ for a large n, which is the whole case for exponential form:
 * convert, raise, convert back, where multiplying out would take n − 1
 * multiplications.
 */
export const expformCartesianPower: Generator<CartesianPowerParams> = {
  id: 'expform-cartesian-power',
  sample: (rng, difficulty) => {
    const { m, d } = rng.pick(POWER_BASES);
    const n = d === 4 ? rng.int(difficulty < 2 ? 3 : 5, difficulty < 2 ? 6 : 10) : rng.int(difficulty < 2 ? 2 : 3, difficulty < 2 ? 4 : 6);
    return { m, d, n };
  },
  render: (params) => {
    const { baseTex, re, im } = cartesianPowerParts(params);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `Use exponential form to write $(${baseTex})^{${params.n}}$ in the form $a + bi$.` }],
      lead: `(${baseTex})^{${params.n}} =`,
      keypad: EXACT_KEYS,
      answer: partsAnswer(re, im),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { m, d, n } = params;
    const { base, power, baseTex, raw, main, re, im } = cartesianPowerParts(params);
    const steps: SolutionStep[] = [
      { text: 'Convert first: the modulus by Pythagoras, the angle from the signs and sizes of the parts.', tex: `${baseTex} = ${expTex(base, { m, d })}` },
      { text: `Raise to the power ${n}: the modulus to the power, the angle times ${n}.`, tex: `(${modTex(base)})^{${n}} = ${modTex(power)}` },
      { tex: `${n} \\times ${paren(angleTex(m, d))} = ${angleTex(raw.m, d)}` },
    ];
    if (main.m !== raw.m) {
      steps.push({ text: 'Take off whole turns.', tex: `${angleTex(raw.m, d)} \\to ${angleTex(main.m, d)}` });
    }
    steps.push({ text: "Convert back with Euler's formula.", tex: `${expTex(power, main)} = ${partsTex(re, im)}` });
    return steps;
  },
};

/* ====================================================================== */
/* Level 8: complex numbers and trigonometric identities                  */
/* ====================================================================== */

/** The substitution every question in this level starts from, as the learner reads it. */
const Z_DEF = 'z = \\cos\\theta + i\\sin\\theta';

/** An exact fraction in lowest terms, its denominator positive. */
interface Rat { n: number; d: number }

function rat(n: number, d = 1): Rat {
  if (n === 0) return { n: 0, d: 1 };
  const g = gcd(n, d);
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g, d: Math.abs(d) / g };
}

const ratAdd = (x: Rat, y: Rat): Rat => rat(x.n * y.d + y.n * x.d, x.d * y.d);
const ratMul = (x: Rat, y: Rat): Rat => rat(x.n * y.n, x.d * y.d);

/** A fraction as the learner reads it: 3, -\tfrac{1}{2}. */
function ratTex({ n, d }: Rat): string {
  if (d === 1) return `${n}`;
  return `${n < 0 ? '-' : ''}\\tfrac{${Math.abs(n)}}{${d}}`;
}

const ratAnswer = ({ n, d }: Rat): string => (d === 1 ? `${n}` : `(${n})/(${d})`);

/**
 * A fraction times a symbol: the symbol alone for 1, the fraction in front of
 * a trig term, and pi or a surd written over the line, as in \tfrac{3\pi}{8}.
 */
function scaledTex(r: Rat, unit: string, over = false): string {
  const sign = r.n < 0 ? '-' : '';
  const size = Math.abs(r.n);
  if (r.d === 1) return `${sign}${size === 1 ? '' : size}${unit}`;
  if (over) return `${sign}\\tfrac{${size === 1 ? '' : size}${unit}}{${r.d}}`;
  return `${sign}\\tfrac{${size}}{${r.d}}${unit}`;
}

/** Terms joined into a sum, a leading minus turning the join into a subtraction. Zero terms drop out. */
function sumTex(terms: string[]): string {
  const kept = terms.filter((term) => term !== '0');
  if (kept.length === 0) return '0';
  return kept.map((term, i) => (i === 0 ? term : term.startsWith('-') ? `- ${term.slice(1)}` : `+ ${term}`)).join(' ');
}

/**
 * Roughly how many characters wide a line of TeX renders. A superscript
 * counts half, a fraction is as wide as its wider half, `\cos` is its three
 * letters (held as digits, so a command before it cannot swallow them) and an
 * operator carries the space either side of it.
 */
function texChars(tex: string): number {
  const flat = tex
    .replace(/\\[td]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_match, top: string, bottom: string) => (top.length > bottom.length ? top : bottom))
    .replace(/\^\{([^{}]*)\}/g, (_match, sup: string) => '0'.repeat(Math.floor(sup.length / 2)))
    .replace(/\^\S/g, '')
    .replace(/_\{[^{}]*\}|_\S/g, '')
    .replace(/\\(?:cos|sin|tan)/g, '000')
    .replace(/\\left|\\right|\\[,;: ]|\\quad|&/g, '')
    .replace(/\\[a-zA-Z]+/g, 'x')
    .replace(/[{}]/g, '');
  return flat.replace(/\s+/g, '').length + (flat.match(/[+=-]/g)?.length ?? 0);
}

/**
 * How wide a display line may run before it scrolls sideways at phone width.
 * Measured in the browser against `texChars`, not derived.
 */
const LINE_FIT = 20;

const aligned = (...lines: string[]): string => `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;

/** lhs = the sum of the terms, carried onto further lines when one would not fit a phone screen. */
function stackedSum(lhs: string, terms: string[]): string {
  const kept = terms.filter((term) => term !== '0');
  const whole = `${lhs} = ${sumTex(kept)}`;
  if (texChars(whole) <= LINE_FIT) return whole;
  const short = texChars(lhs) <= 9;
  const room = short ? LINE_FIT - texChars(lhs) - 3 : LINE_FIT - 2;
  const lines: string[][] = [[]];
  for (const term of kept) {
    const line = lines[lines.length - 1];
    if (line.length > 0 && texChars(sumTex([...line, term])) > room) lines.push([term]);
    else line.push(term);
  }
  const rows = lines.map((line, i) => {
    const sum = sumTex(line);
    if (i === 0) return `&= ${sum}`;
    return `&\\quad ${sum.startsWith('-') ? `- ${sum.slice(1)}` : `+ ${sum}`}`;
  });
  return short ? aligned(`${lhs} ${rows[0]}`, ...rows.slice(1)) : aligned(`& ${lhs}`, ...rows);
}

/**
 * lhs = a = b, one equals sign to a line when the whole would not fit, and
 * the left side on a line of its own when even its first step would not.
 */
function chainTex(lhs: string, ...rights: string[]): string {
  const whole = [lhs, ...rights].join(' = ');
  if (texChars(whole) <= LINE_FIT) return whole;
  if (texChars(`${lhs} = ${rights[0]}`) > LINE_FIT) return aligned(`& ${lhs}`, ...rights.map((right) => `&= ${right}`));
  return aligned(`${lhs} &= ${rights[0]}`, ...rights.slice(1).map((right) => `&= ${right}`));
}

type TrigFn = 'cos' | 'sin';

/** `\cos 3\theta`, a multiple of 1 left unwritten. `v` is the variable as TeX. */
function multTex(fn: TrigFn, k: number, v = '\\theta'): string {
  if (k === 1) return `\\${fn}${v.startsWith('\\') ? v : ` ${v}`}`;
  return `\\${fn} ${k}${v}`;
}

/** `\cos^4\theta`, `\cos^2\theta\sin\theta`: a power of each, as written by hand. */
function powTex(a: number, b: number, v = '\\theta'): string {
  const one = (fn: TrigFn, p: number) =>
    p === 0 ? '' : `\\${fn}${p === 1 ? '' : `^${p}`}${v.startsWith('\\') ? v : ` ${v}`}`;
  return `${one('cos', a)}${one('sin', b)}`;
}

/** A whole number in front of something, 1 left unwritten. */
const timesTex = (k: number): string => (k === 1 ? '' : `${k}`);

function choose(n: number, k: number): number {
  let out = 1;
  for (let i = 1; i <= k; i += 1) out = (out * (n - k + i)) / i;
  return out;
}

/* ---------- Laurent polynomials in z ---------- */

/** A polynomial in z and 1/z: each power of z to its coefficient. */
type ZPoly = Map<number, number>;

const Z_ONE: ZPoly = new Map([[0, 1]]);
/** z + z^{-1}, which is 2cos θ. */
const Z_PLUS: ZPoly = new Map([[1, 1], [-1, 1]]);
/** z - z^{-1}, which is 2i sin θ. */
const Z_MINUS: ZPoly = new Map([[1, 1], [-1, -1]]);

function zMul(x: ZPoly, y: ZPoly): ZPoly {
  const out: ZPoly = new Map();
  for (const [i, a] of x) for (const [j, b] of y) out.set(i + j, (out.get(i + j) ?? 0) + a * b);
  for (const [e, c] of out) if (c === 0) out.delete(e);
  return out;
}

function zPow(base: ZPoly, n: number): ZPoly {
  let out = Z_ONE;
  for (let i = 0; i < n; i += 1) out = zMul(out, base);
  return out;
}

/** z^{3}, z, z^{-1}: a power of z as written. */
const zPowTex = (e: number): string => (e === 0 ? '1' : e === 1 ? 'z' : `z^{${e}}`);

/** The terms of a polynomial in z, highest power first. */
function zTerms(poly: ZPoly): string[] {
  return [...poly.entries()]
    .sort((x, y) => y[0] - x[0])
    .map(([e, c]) => (e === 0 ? `${c}` : scaledTex(rat(c), zPowTex(e))));
}

/**
 * The same polynomial with each power beside its reciprocal, and what each
 * pair comes to: `z^k + z^{-k}` is 2cos kθ and `z^k - z^{-k}` is 2i sin kθ.
 * Only for polynomials that pair up, which is every one this level builds.
 */
function zPairs(poly: ZPoly): { paired: string[]; values: string[] } {
  const paired: string[] = [];
  const values: string[] = [];
  const tops = [...poly.keys()].filter((e) => e > 0).sort((x, y) => y - x);
  for (const k of tops) {
    const c = poly.get(k)!;
    const back = poly.get(-k) ?? 0;
    const cos = back === c;
    const pair = `(${zPowTex(k)} ${cos ? '+' : '-'} ${zPowTex(-k)})`;
    paired.push(`${c < 0 ? '-' : ''}${Math.abs(c) === 1 ? '' : Math.abs(c)}${pair}`);
    values.push(scaledTex(rat(2 * c), cos ? multTex('cos', k) : `i${multTex('sin', k)}`));
  }
  const c0 = poly.get(0);
  if (c0) {
    paired.push(`${c0}`);
    values.push(`${c0}`);
  }
  return { paired, values };
}

/* ---------- Powers of cos and sin in multiple angles ---------- */

/** One term of a multiple-angle form: coef × cos kθ or sin kθ, where k = 0 is the constant. */
interface AngleTerm { k: number; coef: Rat }

interface AngleForm {
  /** Cosines when the power of sine is even, sines when it is odd. */
  fn: TrigFn;
  /** In the order they are written; see `displayOrder`. */
  terms: AngleTerm[];
  /** The smallest multiple of the power that has whole-number coefficients. */
  scale: number;
  /** (z + z^{-1})^a (z - z^{-1})^b, multiplied out. */
  poly: ZPoly;
}

/**
 * cos^a θ sin^b θ as a sum of multiple angles.
 *
 * (2cos θ)^a (2i sin θ)^b = (z + z^{-1})^a (z - z^{-1})^b, and the right side
 * pairs into cosines when b is even and sines when it is odd. Dividing by
 * 2^(a+b) i^b gives the power itself. Computed rather than tabulated, so a
 * mistyped row cannot produce a plausible wrong identity.
 */
function powerForm(a: number, b: number): AngleForm {
  const poly = zMul(zPow(Z_PLUS, a), zPow(Z_MINUS, b));
  const n = a + b;
  const fn: TrigFn = b % 2 === 0 ? 'cos' : 'sin';
  // 1 / i^b, with the one leftover i of an odd b cancelling the i of 2i sin kθ.
  const sign = Math.floor(b / 2) % 2 === 0 ? 1 : -1;
  const terms: AngleTerm[] = [];
  for (let k = n; k >= 1; k -= 1) {
    const c = poly.get(k) ?? 0;
    if (c !== 0) terms.push({ k, coef: rat(sign * 2 * c, 2 ** n) });
  }
  const c0 = poly.get(0) ?? 0;
  if (fn === 'cos' && c0 !== 0) terms.push({ k: 0, coef: rat(sign * c0, 2 ** n) });
  const ordered = terms[0].coef.n < 0 ? [...terms].reverse() : terms;
  const scale = terms.reduce((lcm, { coef }) => (lcm * coef.d) / gcd(lcm, coef.d), 1);
  return { fn, terms: ordered, scale, poly };
}

/** One term of a multiple-angle form scaled by `by`, as TeX. */
function angleTermTex(fn: TrigFn, { k, coef }: AngleTerm, by: Rat = rat(1), v = '\\theta'): string {
  const value = ratMul(coef, by);
  return k === 0 ? ratTex(value) : scaledTex(value, multTex(fn, k, v));
}

/** The factor (2cos θ)^a (2i sin θ)^b puts in front: 2^(a+b) i^b, as TeX. */
function powerLeadTex(a: number, b: number): string {
  const size = 2 ** (a + b);
  return [`${size}`, `${size}i`, `-${size}`, `-${size}i`][b % 4];
}

/** (z + z^{-1})^a (z - z^{-1})^b as written. */
function zBracketsTex(a: number, b: number): string {
  const power = (p: number) => (p === 1 ? '' : `^${p}`);
  return `${a ? `(z + z^{-1})${power(a)}` : ''}${b ? `(z - z^{-1})${power(b)}` : ''}`;
}

/** The whole derivation of cos^a sin^b in multiple angles, ending on its whole-number form. */
function anglePowerWorking(a: number, b: number): SolutionStep[] {
  const pf = powerForm(a, b);
  const { paired, values } = zPairs(pf.poly);
  const lead = powerLeadTex(a, b);
  const uses = [a ? '$z + z^{-1} = 2\\cos\\theta$' : '', b ? '$z - z^{-1} = 2i\\sin\\theta$' : ''].filter(Boolean).join(' and ');
  return [
    { text: `With $${Z_DEF}$, ${uses}. So`, tex: chainTex(`${lead}${powTex(a, b)}`, zBracketsTex(a, b)) },
    { text: 'Multiply out:', tex: stackedSum(zBracketsTex(a, b), zTerms(pf.poly)) },
    { text: 'Pair each power with its reciprocal:', tex: stackedSum(`${lead}${powTex(a, b)}`, paired) },
    {
      text: pf.fn === 'cos' ? 'Each pair is twice a cosine:' : 'Each pair is $2i$ times a sine:',
      tex: stackedSum(`${lead}${powTex(a, b)}`, values),
    },
    {
      text: `Divide by $${lead}$ and multiply by $${pf.scale}$, for whole numbers:`,
      tex: stackedSum(`${pf.scale}${powTex(a, b)}`, pf.terms.map((term) => angleTermTex(pf.fn, term, rat(pf.scale)))),
    },
  ];
}

/** Every pair (a, b) with a + b in [lo, hi], optionally with both powers present. */
function powerPairs(lo: number, hi: number, mixed: boolean | 'any'): [number, number][] {
  const out: [number, number][] = [];
  for (let n = lo; n <= hi; n += 1) {
    for (let a = n; a >= 0; a -= 1) {
      const b = n - a;
      const both = a > 0 && b > 0;
      if (mixed === 'any' || both === mixed) out.push([a, b]);
    }
  }
  return out;
}

/* ---------- ExactValue values: q·π + r + s√t ---------- */

/** Every integral and trig sum in this level comes to q·π + r + s√t. */
interface ExactValue { pi: Rat; r: Rat; s: Rat; t: number }

const EXACT_ZERO: ExactValue = { pi: rat(0), r: rat(0), s: rat(0), t: 1 };

function exactOfPart(part: Part): ExactValue {
  const size = rat(part.sign * part.p, part.q);
  return part.t === 1 ? { ...EXACT_ZERO, r: size } : { ...EXACT_ZERO, s: size, t: part.t };
}

function exactAdd(x: ExactValue, y: ExactValue): ExactValue {
  if (x.s.n !== 0 && y.s.n !== 0 && x.t !== y.t) throw new Error(`cannot add √${x.t} to √${y.t}`);
  const s = ratAdd(x.s, y.s);
  return { pi: ratAdd(x.pi, y.pi), r: ratAdd(x.r, y.r), s, t: s.n === 0 ? 1 : x.s.n !== 0 ? x.t : y.t };
}

const exactScale = (x: ExactValue, k: Rat): ExactValue => {
  const s = ratMul(x.s, k);
  return { pi: ratMul(x.pi, k), r: ratMul(x.r, k), s, t: s.n === 0 ? 1 : x.t };
};

function exactTex(x: ExactValue): string {
  return sumTex([
    x.pi.n === 0 ? '0' : scaledTex(x.pi, '\\pi', true),
    ratTex(x.r),
    x.s.n === 0 ? '0' : scaledTex(x.s, `\\sqrt{${x.t}}`, true),
  ]);
}

const exactAnswer = (x: ExactValue): string =>
  `(${ratAnswer(x.pi)})*pi + (${ratAnswer(x.r)}) + (${ratAnswer(x.s)})*sqrt(${x.t})`;

const ZERO_PART: Part = { sign: 1, p: 0, q: 1, t: 1 };

/** cos or sin of mπ/d, exactly. */
const trigPart = (fn: TrigFn, m: number, d: number): Part =>
  unitPart(fn === 'cos' ? Math.cos((m * Math.PI) / d) : Math.sin((m * Math.PI) / d));

/** kπ/e with the k written in: `\tfrac{2k\pi}{5}`, `k\pi`. For the terms of a sum. */
function kAngleTex(q: number, e: number): string {
  const g = gcd(q, e);
  const top = `${q / g === 1 ? '' : q / g}k\\pi`;
  return e / g === 1 ? top : `\\tfrac{${top}}{${e / g}}`;
}

/** A tile bank: the answer's tokens, then up to `extra` distractors that are not among them, sorted. */
function sortedBank(answer: string[], distractors: string[], extra = 3, key: (token: string) => number | string = (t) => t): string[] {
  const picked: string[] = [];
  for (const token of distractors) {
    if (picked.length >= extra) break;
    if (answer.includes(token) || picked.includes(token)) continue;
    picked.push(token);
  }
  return [...answer, ...picked].sort((x, y) => {
    const kx = key(x);
    const ky = key(y);
    return kx < ky ? -1 : kx > ky ? 1 : x < y ? -1 : x > y ? 1 : 0;
  });
}

/** `3\theta`, or `\theta` alone: a multiple of θ as a tile. */
const thetaTile = (k: number): string => (k === 1 ? '\\theta' : `${k}\\theta`);

/** The number in front of a tile such as `4\theta`, for sorting a bank numerically. */
const leadingNumber = (token: string): number => {
  const match = /^-?\d+/.exec(token);
  return match ? Number(match[0]) : token.startsWith('\\theta') ? 1 : 1000;
};

/* ---------- z^n ± z^{-n} as one trig term ---------- */

type ZnKind = 'sum' | 'diff' | 'back';
interface ZnFormParams { n: number; k: number; kind: ZnKind; frac: boolean; bank: string[] }

/** k(z^n + z^{-n}) and its relatives, with the reciprocal sometimes written as a fraction. */
function znTex({ n, k, kind, frac }: Omit<ZnFormParams, 'bank'>): string {
  const up = zPowTex(n);
  const down = frac ? `\\frac{1}{${up}}` : zPowTex(-n);
  const inner = kind === 'sum' ? `${up} + ${down}` : kind === 'diff' ? `${up} - ${down}` : `${down} - ${up}`;
  return k === 1 ? inner : `${k}(${inner})`;
}

/** A coefficient as it sits in front of a trig function: 2, 2i, -2i, and i or -i for a size of 1. */
function coefTex(size: number, imag: boolean, negative = false): string {
  const body = imag ? `${size === 1 ? '' : size}i` : `${size}`;
  return `${negative ? '-' : ''}${body}`;
}

/** The single term it comes to, as its three tiles: coefficient, function, multiple. */
function znParts({ n, k, kind }: { n: number; k: number; kind: ZnKind }): [string, TrigFn, string] {
  if (kind === 'sum') return [coefTex(2 * k, false), 'cos', `${n}`];
  return [coefTex(2 * k, true, kind === 'back'), 'sin', `${n}`];
}

const ZN_KINDS: ZnKind[] = ['sum', 'diff', 'back'];

/**
 * z^n + z^{-n} = 2cos nθ and z^n - z^{-n} = 2i sin nθ, placed as three tiles:
 * the coefficient, the function and the multiple. The bank holds the other
 * function, the coefficient with and without its i, and the doubled
 * multiple, so each of the usual slips has a tile to land on. Difficulty 2
 * multiplies by more, reaches higher powers, and writes the difference the
 * other way round, which turns the sign over.
 */
export const trigidZnForm: Generator<ZnFormParams> = {
  id: 'trigid-zn-form',
  choices: (params) => {
    const { n, k, kind } = params;
    const term = (coef: string, fn: TrigFn, m: number) => ({ tex: `${coef}${multTex(fn, m)}` });
    const back = kind === 'back';
    const opts =
      kind === 'sum'
        ? options(
            term(coefTex(2 * k, false), 'cos', n),
            term(coefTex(2 * k, true), 'sin', n),
            term(coefTex(k, false).replace(/^1$/, ''), 'cos', n),
            term(coefTex(2 * k, false), 'sin', n),
            term(coefTex(2 * k, false), 'cos', 2 * n),
          )
        : options(
            term(coefTex(2 * k, true, back), 'sin', n),
            term(coefTex(2 * k, false, back), 'sin', n),
            term(coefTex(2 * k, true, !back), 'sin', n),
            term(coefTex(2 * k, false, back), 'cos', n),
            term(coefTex(k, true, back), 'sin', n),
          );
    return steered(opts.slice(0, 4), mix(n, k, ZN_KINDS.indexOf(kind), params.frac ? 1 : 0));
  },
  sample: (rng, difficulty) => {
    const n = difficulty < 2 ? rng.int(2, 6) : rng.int(2, 9);
    const k = difficulty < 2 ? rng.int(1, 2) : rng.int(1, 4);
    const kind = rng.pick(difficulty < 2 ? ZN_KINDS.slice(0, 2) : ZN_KINDS);
    const frac = rng.chance(0.4);
    const [coef, fn, mult] = znParts({ n, k, kind });
    const answer = [coef, `\\${fn}`, mult];
    const distractors = [
      `\\${fn === 'cos' ? 'sin' : 'cos'}`,
      fn === 'cos' ? coefTex(2 * k, true) : coefTex(2 * k, false, kind === 'back'),
      `${2 * n}`,
      fn === 'cos' ? `${k}` : coefTex(k, true, kind === 'back'),
      `${n + 1}`,
    ];
    return { n, k, kind, frac, bank: sortedBank(answer, distractors, 4) };
  },
  render: (params) => {
    const [coef, fn, mult] = znParts(params);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `With $${Z_DEF}$, write this as one trig term.` },
        { kind: 'display', tex: znTex(params) },
      ],
      template: '{0}\\,{1}\\,{2}\\theta',
      bank: params.bank,
      answer: [coef, `\\${fn}`, mult],
    };
  },
  solution: (params) => {
    const { n, k, kind, frac } = params;
    const [coef, fn] = znParts(params);
    const up = zPowTex(n);
    const down = zPowTex(-n);
    const steps: SolutionStep[] = [];
    if (frac) steps.push({ text: `$\\frac{1}{${up}}$ is $${down}$.` });
    steps.push(
      { text: "By De Moivre's theorem the two powers are conjugates:", tex: `${up} = \\cos ${n}\\theta + i\\sin ${n}\\theta` },
      { tex: `${down} = \\cos ${n}\\theta - i\\sin ${n}\\theta` },
    );
    if (kind === 'sum') steps.push({ text: 'Adding them, the sines cancel.', tex: `${up} + ${down} = 2\\cos ${n}\\theta` });
    else if (kind === 'diff') steps.push({ text: 'Subtracting, the cosines cancel.', tex: `${up} - ${down} = 2i\\sin ${n}\\theta` });
    else {
      steps.push({
        text: 'Subtracting the other way round, the cosines still cancel but the sign turns over.',
        tex: `${down} - ${up} = -2i\\sin ${n}\\theta`,
      });
    }
    if (k > 1) steps.push({ text: `Multiply by $${k}$.`, tex: `${znTex({ n, k, kind, frac: false })} = ${coef}${multTex(fn, n)}` });
    return steps;
  },
};

/* ---------- z^n ± z^{-n} at a given angle ---------- */

interface ZnValueParams { n: number; q: number; e: number; kind: 'sum' | 'diff' }

/** The value 2cos nθ or 2i sin nθ, as the exact part it multiplies, where nθ = qπ/e. */
function znValue({ q, e, kind }: ZnValueParams): { unit: Part; value: Part } {
  const unit = trigPart(kind === 'sum' ? 'cos' : 'sin', q, e);
  return { unit, value: scalePart({ a: 2, s: 1 }, unit) };
}

/**
 * The exact value of z^n + z^{-n} or z^n - z^{-n} at an angle chosen so that
 * nθ lands on a table angle: θ = π/9 with n = 3, say. Adding the powers out
 * by hand is hopeless; 2cos nθ is one line.
 */
export const trigidZnValue: Generator<ZnValueParams> = {
  id: 'trigid-zn-value',
  sample: (rng, difficulty) => {
    const n = difficulty < 2 ? rng.int(2, 4) : rng.int(3, 8);
    const e = rng.pick([1, 2, 3, 4, 6]);
    return { n, q: rng.int(1, 2 * e - 1), e, kind: rng.pick(['sum', 'diff'] as const) };
  },
  render: (params) => {
    const { n, q, e, kind } = params;
    const { value } = znValue(params);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `$${Z_DEF}$ with $\\theta = ${angleTex(q, e * n)}$. Find the exact value.` }],
      lead: `${zPowTex(n)} ${kind === 'sum' ? '+' : '-'} ${zPowTex(-n)} =`,
      keypad: EXACT_KEYS,
      answer: kind === 'sum' ? partAnswer(value) : `(${partAnswer(value)})*i`,
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { n, q, e, kind } = params;
    const { unit, value } = znValue(params);
    const fn = kind === 'sum' ? '\\cos' : '\\sin';
    const phi = angleTex(q, e);
    return [
      {
        text: kind === 'sum' ? 'The sines cancel, leaving twice the cosine:' : 'The cosines cancel, leaving $2i$ times the sine:',
        tex: `${zPowTex(n)} ${kind === 'sum' ? '+' : '-'} ${zPowTex(-n)} = ${kind === 'sum' ? '2' : '2i'}${fn} ${n}\\theta`,
      },
      { text: `Here $${n}\\theta = ${phi}$, and $${fn} ${phi} = ${partTex(unit)}$.` },
      {
        tex: kind === 'sum'
          ? `2 \\times ${paren(partTex(unit))} = ${partTex(value)}`
          : `2i \\times ${paren(partTex(unit))} = ${partsTex(ZERO_PART, value)}`,
      },
    ];
  },
};

/* ---------- A sum of two such pairs, plotted ---------- */

interface ZnPlotParams { a: number; b: number; q: number; d: number; back: boolean }

/** A whole number, or NaN when it is not one. */
function snapWhole(x: number): number {
  const r = Math.round(x);
  return Math.abs(x - r) < 1e-9 ? r + 0 : NaN;
}

/** w = (z^a + z^{-a}) + (z^b - z^{-b}) = 2cos aθ + 2i sin bθ, as a point. */
function znPoint({ a, b, q, d, back }: ZnPlotParams): [number, number] {
  const t = (q * Math.PI) / d;
  const re = snapWhole(2 * Math.cos(a * t));
  const im = snapWhole((back ? -2 : 2) * Math.sin(b * t));
  return [re === 0 ? 0 : re, im === 0 ? 0 : im];
}

function znPlotTex({ a, b, back }: ZnPlotParams): string {
  const second = back ? `${zPowTex(-b)} - ${zPowTex(b)}` : `${zPowTex(b)} - ${zPowTex(-b)}`;
  return `w = (${zPowTex(a)} + ${zPowTex(-a)}) + (${second})`;
}

/**
 * Plot (z^a + z^{-a}) + (z^b - z^{-b}). The first bracket is real and the
 * second imaginary, so the point is (2cos aθ, 2 sin bθ); only angles putting
 * both on the lattice are drawn. Difficulty 2 reaches higher powers and
 * sometimes writes the second bracket the other way round.
 */
export const trigidZnPlot: Generator<ZnPlotParams> = {
  id: 'trigid-zn-plot',
  sample: (rng, difficulty) => {
    const top = difficulty < 2 ? 3 : 6;
    for (;;) {
      const d = rng.pick([2, 3, 4, 6]);
      const params = {
        a: rng.int(1, top),
        b: rng.int(1, top),
        q: rng.int(1, 2 * d - 1),
        d,
        back: difficulty >= 2 && rng.chance(0.4),
      };
      if (params.a === params.b) continue;
      const [re, im] = znPoint(params);
      if (Number.isNaN(re) || Number.isNaN(im) || (re === 0 && im === 0)) continue;
      return params;
    }
  },
  render: (params) => {
    const [re, im] = znPoint(params);
    return {
      kind: 'plot',
      prompt: [
        { kind: 'prose', text: `$${Z_DEF}$ with $\\theta = ${angleTex(params.q, params.d)}$. Plot $w$ on the plane.` },
        { kind: 'display', tex: znPlotTex(params) },
      ],
      range: RANGE,
      answer: { re, im },
    };
  },
  solution: (params) => {
    const { a, b, q, d, back } = params;
    const [re, im] = znPoint(params);
    const sign = back ? '-' : '';
    return [
      { text: `The first bracket is real, $2${multTex('cos', a)}$:`, tex: `2\\cos ${angleTex(a * q, d)} = ${re}` },
      {
        text: `The second is imaginary, $${sign}2i${multTex('sin', b)}$:`,
        tex: `${sign}2i\\sin ${angleTex(b * q, d)} = ${im === 0 ? '0' : coeffTex(im)}`,
      },
      { text: 'So the point is', tex: `w = ${complexTex(re, im)}` },
    ];
  },
};

/* ---------- Products into sums ---------- */

type ProductKind = 'cc' | 'ss' | 'sc' | 'cs';
interface ProductSumParams { a: number; b: number; kind: ProductKind; bank: string[] }

/** The two functions in the product 2 f(aθ) g(bθ). */
const PRODUCT_FNS: Record<ProductKind, [TrigFn, TrigFn]> = {
  cc: ['cos', 'cos'],
  ss: ['sin', 'sin'],
  sc: ['sin', 'cos'],
  cs: ['cos', 'sin'],
};

/**
 * What 2 f(aθ) g(bθ) comes to: a function, the two multiples in the order
 * written, the sign between them, and whether that order is free.
 */
function productResult({ a, b, kind }: { a: number; b: number; kind: ProductKind }) {
  if (kind === 'cc') return { fn: 'cos' as TrigFn, first: a + b, second: a - b, op: '+', free: true };
  if (kind === 'ss') return { fn: 'cos' as TrigFn, first: a - b, second: a + b, op: '-', free: false };
  if (kind === 'sc') return { fn: 'sin' as TrigFn, first: a + b, second: a - b, op: '+', free: true };
  return { fn: 'sin' as TrigFn, first: a + b, second: a - b, op: '-', free: false };
}

const productTex = ({ a, b, kind }: { a: number; b: number; kind: ProductKind }): string =>
  `2${multTex(PRODUCT_FNS[kind][0], a)}${multTex(PRODUCT_FNS[kind][1], b)}`;

const PRODUCT_KINDS: ProductKind[] = ['cc', 'ss', 'sc', 'cs'];

/**
 * 2cos aθ cos bθ = cos(a+b)θ + cos(a-b)θ and its three relatives, found by
 * writing each factor with z and multiplying out. The template carries the
 * function and the sign; the tiles are the two multiples, with the factors'
 * own multiples and a doubled one as distractors. Where the order matters
 * (a difference) it is graded. Difficulty 2 adds 2cos aθ sin bθ, whose
 * minus sign is easily lost, and larger multiples.
 */
export const trigidProductSum: Generator<ProductSumParams> = {
  id: 'trigid-product-sum',
  choices: (params) => {
    const { a, b, kind } = params;
    const { fn, first, second, op } = productResult(params);
    const other: TrigFn = fn === 'cos' ? 'sin' : 'cos';
    const pair = (f: TrigFn, x: number, sign: string, y: number) => ({ tex: `${multTex(f, x)} ${sign} ${multTex(f, y)}` });
    const flip = op === '+' ? '-' : '+';
    return steered(
      options(
        pair(fn, first, op, second),
        pair(fn, first, flip, second),
        pair(fn, second, op, first),
        pair(other, first, op, second),
        pair(fn, a, op, b),
      ).slice(0, 4),
      mix(a, b, PRODUCT_KINDS.indexOf(kind)),
    );
  },
  sample: (rng, difficulty) => {
    const kind = rng.pick(difficulty < 2 ? PRODUCT_KINDS.slice(0, 3) : PRODUCT_KINDS);
    const a = rng.int(2, difficulty < 2 ? 5 : 8);
    const b = rng.int(1, a - 1);
    const { first, second } = productResult({ a, b, kind });
    const answer = [thetaTile(first), thetaTile(second)];
    const bank = sortedBank(answer, [a, b, 2 * a, a * b, 2 * (a + b), a + b + 1].map(thetaTile), 3, leadingNumber);
    return { a, b, kind, bank };
  },
  render: (params) => {
    const { fn, first, second, op, free } = productResult(params);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write this product as a sum or difference of two terms.' },
        { kind: 'display', tex: productTex(params) },
      ],
      template: `\\${fn} {0} ${op} \\${fn} {1}`,
      bank: params.bank,
      answer: [thetaTile(first), thetaTile(second)],
      ...(free && { unordered: true }),
    };
  },
  solution: (params) => {
    const { a, b, kind } = params;
    const [fa, fb] = PRODUCT_FNS[kind];
    const { fn, first, second, op } = productResult(params);
    const pairPoly = (f: TrigFn, k: number): ZPoly => new Map([[k, 1], [-k, f === 'cos' ? 1 : -1]]);
    const pairTex = (f: TrigFn, k: number) => `(${zPowTex(k)} ${f === 'cos' ? '+' : '-'} ${zPowTex(-k)})`;
    const twice = (f: TrigFn, k: number) => (f === 'cos' ? `2${multTex('cos', k)}` : `2i${multTex('sin', k)}`);
    const { paired, values } = zPairs(zMul(pairPoly(fa, a), pairPoly(fb, b)));
    const imag = (fa === 'sin' ? 1 : 0) + (fb === 'sin' ? 1 : 0);
    const whole = ['4', '4i', '-4'][imag];
    const divisor = ['2', '2i', '-2'][imag];
    return [
      {
        text: `Write each factor with $z$: $${pairTex(fa, a)} = ${twice(fa, a)}$ and $${pairTex(fb, b)} = ${twice(fb, b)}$. Multiply them:`,
        tex: `${pairTex(fa, a)}${pairTex(fb, b)}`,
      },
      { text: 'Multiply out and pair each power with its reciprocal:', tex: `= ${sumTex(paired)}` },
      { text: `Each pair is twice a cosine or $2i$ times a sine, and the left side is $${whole}${multTex(fa, a)}${multTex(fb, b)}$:`, tex: `= ${sumTex(values)}` },
      {
        text: `Divide by $${divisor}$:`,
        tex: stackedSum(productTex(params), [multTex(fn, first), `${op === '-' ? '-' : ''}${multTex(fn, second)}`]),
      },
    ];
  },
};

/* ---------- A term of (cos θ + i sin θ)^n ---------- */

interface BinomialTermParams { n: number; k: number; conj: boolean }

/** c^{3}s^{2}: a monomial in c and s, powers of 1 and 0 left unwritten. */
function csTex(p: number, q: number): string {
  const one = (letter: string, e: number) => (e === 0 ? '' : e === 1 ? letter : `${letter}^{${e}}`);
  return `${one('c', p)}${one('s', q)}`;
}

/** C(n, k) (±i)^k, the coefficient of c^{n-k} s^k, as real and imaginary parts. */
function binomialCoef({ n, k, conj }: BinomialTermParams): [number, number] {
  const size = choose(n, k) * (conj && k % 2 === 1 ? -1 : 1);
  const turn: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const [x, y] = turn[k % 4];
  return [size * x + 0, size * y + 0];
}

/**
 * One coefficient of (c + is)^n: C(n, k) times a power of i. Whether it is
 * real or imaginary is what decides which of cos nθ and sin nθ it belongs to,
 * and the power of i is where the minus signs in those identities come from.
 * Difficulty 1 is up to the sixth power, and half the time the conjugate
 * (c - is)^n; difficulty 2 goes to the eighth.
 */
export const trigidBinomialTerm: Generator<BinomialTermParams> = {
  id: 'trigid-binomial-term',
  choices: (params) => {
    const { n, k } = params;
    const [re, im] = binomialCoef(params);
    const opt = (x: number, y: number) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) });
    return steered(
      options(opt(re, im), opt(choose(n, k), 0), opt(-re, -im), opt(-im, re), opt(choose(n, k - 1), 0)).slice(0, 4),
      mix(n, k, params.conj ? 1 : 0),
    );
  },
  sample: (rng, difficulty) => {
    const n = difficulty < 2 ? rng.int(3, 6) : rng.int(5, 8);
    return { n, k: rng.int(1, n), conj: rng.chance(0.5) };
  },
  render: (params) => {
    const { n, k, conj } = params;
    const [re, im] = binomialCoef(params);
    const mono = csTex(n - k, k);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `Write $c = \\cos\\theta$ and $s = \\sin\\theta$. Expanding this, the term in $${mono}$ is $a${mono}$. Find $a$.` },
        { kind: 'display', tex: `(c ${conj ? '-' : '+'} is)^${n}` },
      ],
      lead: 'a =',
      keypad: I_KEY,
      answer: complexAnswer(re, im),
      domain: 'complex',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { n, k, conj } = params;
    const [re, im] = binomialCoef(params);
    // (±i)^k is the coefficient of s^k in (c ± is)^k.
    const power = complexTex(...binomialCoef({ n: k, k, conj }));
    return [
      { text: `The binomial theorem gives the term $\\binom{${n}}{${k}}${csTex(n - k, 0)}(${conj ? '-' : ''}is)^{${k}}$.` },
      {
        text: `$(${conj ? '-' : ''}i)^{${k}} = ${power}$, so`,
        tex: `a = \\binom{${n}}{${k}} \\times ${paren(power)} = ${complexTex(re, im)}`,
      },
      {
        text: im === 0
          ? `A real coefficient: this term is part of $\\cos ${n}\\theta$.`
          : `An imaginary coefficient: this term is part of the $i\\sin ${n}\\theta$ half.`,
      },
    ];
  },
};

/* ---------- Multiple angles in powers: the identity's coefficients ---------- */

type MultipleKind = 'cc' | 'cs' | 'ss' | 'sc';
interface MultipleFormParams { kind: MultipleKind; n: number; shown: number; bank: string[] }

/** Chebyshev polynomials, coefficients indexed by power: T_n(cos θ) = cos nθ. */
function chebyshev(n: number, second: boolean): number[] {
  let before = [1];
  let now = second ? [0, 2] : [0, 1];
  if (n === 0) return before;
  for (let m = 1; m < n; m += 1) {
    const next = [0, ...now.map((c) => 2 * c)];
    before.forEach((c, i) => {
      next[i] -= c;
    });
    before = now;
    now = next;
  }
  return now;
}

/**
 * The identity as a polynomial in c (or s), terms in the order they are
 * written: highest power first, unless that opens on a minus.
 *
 * cc: cos nθ in cos θ, T_n(c). cs: cos nθ in sin θ for even n, ±T_n(s).
 * ss: sin nθ in sin θ for odd n, ±T_n(s). sc: sin nθ as sin θ times a
 * polynomial in cos θ, U_{n-1}(c).
 */
function multipleTerms(kind: MultipleKind, n: number): { power: number; coef: number }[] {
  const poly =
    kind === 'sc'
      ? chebyshev(n - 1, true)
      : chebyshev(n, false).map((c) => (kind === 'cc' ? c : c * (Math.floor(n / 2) % 2 === 0 ? 1 : -1)));
  const terms = poly
    .map((coef, power) => ({ power, coef }))
    .filter(({ coef }) => coef !== 0)
    .reverse();
  return terms[0].coef < 0 ? terms.reverse() : terms;
}

const MULTIPLE_TARGET: Record<MultipleKind, (n: number) => string> = {
  cc: (n) => `\\cos ${n}\\theta`,
  cs: (n) => `\\cos ${n}\\theta`,
  ss: (n) => `\\sin ${n}\\theta`,
  sc: (n) => `\\sin ${n}\\theta`,
};

const MULTIPLE_ASK: Record<MultipleKind, string> = {
  cc: 'in powers of $\\cos\\theta$',
  cs: 'in powers of $\\sin\\theta$',
  ss: 'in powers of $\\sin\\theta$',
  sc: 'as $\\sin\\theta$ times powers of $\\cos\\theta$',
};

/** The letter the identity is written in, and the power of it as a template piece. */
const multipleVar = (kind: MultipleKind): TrigFn => (kind === 'cc' || kind === 'sc' ? 'cos' : 'sin');

/**
 * The identity's template and its answer. Every coefficient is a blank except
 * the one at `shown` (if any), which is written in as a foothold; the signs
 * are always written, so what is asked is the sizes.
 */
function multipleSlots({ kind, n, shown }: Omit<MultipleFormParams, 'bank'>): { template: string; answer: string[] } {
  const fn = multipleVar(kind);
  const answer: string[] = [];
  const pieces = multipleTerms(kind, n).map(({ power, coef }, i) => {
    const sign = i === 0 ? (coef < 0 ? '-' : '') : coef < 0 ? ' - ' : ' + ';
    let size = `${Math.abs(coef)}`;
    if (i !== shown) {
      size = `{${answer.length}}`;
      answer.push(`${Math.abs(coef)}`);
    }
    const letter = power === 0 ? '' : `\\${fn}${power === 1 ? '' : `^${power}`}\\theta`;
    return `${sign}${size}${letter}`;
  });
  const body = pieces.join('');
  const rhs = kind === 'sc' ? `\\sin\\theta\\,(${body})` : body;
  return { template: `${MULTIPLE_TARGET[kind](n)} = ${rhs}`, answer };
}

/** Every (kind, n, shown) a difficulty draws from. */
function multipleCases(difficulty: number): Omit<MultipleFormParams, 'bank'>[] {
  const pairs: [MultipleKind, number][] =
    difficulty < 2
      ? [['cc', 2], ['cc', 3], ['cc', 4], ['cc', 5], ['cs', 2], ['cs', 4], ['cs', 6]]
      : [['ss', 3], ['ss', 5], ['sc', 2], ['sc', 3], ['sc', 4], ['sc', 5], ['sc', 6], ['cc', 6]];
  return pairs.flatMap(([kind, n]) => {
    const count = multipleTerms(kind, n).length;
    const shown = count < 2 ? [-1] : [-1, ...Array.from({ length: count }, (_, i) => i)];
    return shown.map((s) => ({ kind, n, shown: s }));
  });
}

/** The real or imaginary part of (c + is)^n, as the terms of a polynomial in c and s. */
function binomialPart(n: number, real: boolean): string[] {
  const terms: string[] = [];
  for (let k = real ? 0 : 1; k <= n; k += 2) {
    const size = choose(n, k) * (Math.floor(k / 2) % 2 === 0 ? 1 : -1);
    terms.push(scaledTex(rat(size), csTex(n - k, k)));
  }
  return terms;
}

/** An identity's right side in c or s, for the worked solution. */
function multipleRhs(kind: MultipleKind, n: number): string {
  const terms = multipleRhsTerms(kind, n);
  return kind === 'sc' ? `s(${sumTex(terms)})` : sumTex(terms);
}

/** The terms of that right side, for a sum that may need more than one line. */
function multipleRhsTerms(kind: MultipleKind, n: number): string[] {
  const letter = multipleVar(kind) === 'cos' ? 'c' : 's';
  return multipleTerms(kind, n).map(({ power, coef }) =>
    power === 0 ? `${coef}` : scaledTex(rat(coef), power === 1 ? letter : `${letter}^{${power}}`),
  );
}

/** De Moivre, the binomial theorem, then one Pythagorean swap. */
function multipleWorking(kind: MultipleKind, n: number): SolutionStep[] {
  const real = kind === 'cc' || kind === 'cs';
  const target = MULTIPLE_TARGET[kind](n);
  const swap: Record<MultipleKind, string> = {
    cc: 'Only even powers of $s$ appear. Replace each $s^2$ with $1 - c^2$ and collect:',
    cs: 'Only even powers of $c$ appear. Replace each $c^2$ with $1 - s^2$ and collect:',
    ss: 'Only even powers of $c$ appear. Replace each $c^2$ with $1 - s^2$ and collect:',
    sc: 'Take out a factor $s$. What is left has only even powers of $s$, so replace each $s^2$ with $1 - c^2$:',
  };
  return [
    {
      text: `Write $c = \\cos\\theta$, $s = \\sin\\theta$. By De Moivre, $${target}$ is the ${real ? 'real' : 'imaginary'} part of $(c + is)^{${n}}$:`,
      tex: stackedSum(target, binomialPart(n, real)),
    },
    { text: swap[kind], tex: kind === 'sc' ? chainTex(target, multipleRhs(kind, n)) : stackedSum(target, multipleRhsTerms(kind, n)) },
  ];
}

/**
 * cos nθ or sin nθ as a polynomial, coefficients as tiles. The bank adds the
 * binomial coefficients from before the swap (the answer to a different
 * step) and powers of 2 either side of the leading one. Difficulty 1 is
 * cos nθ, in powers of cos θ or sin θ; difficulty 2 is sin nθ, both ways,
 * and cos 6θ.
 */
export const trigidMultipleForm: Generator<MultipleFormParams> = {
  id: 'trigid-multiple-form',
  sample: (rng, difficulty) => {
    const params = rng.pick(multipleCases(difficulty));
    const { answer } = multipleSlots(params);
    const lead = Math.abs(multipleTerms(params.kind, params.n)[0].coef);
    const distractors = [choose(params.n, 2), 2 ** (params.n - 1), 2 ** params.n, params.n, lead + 1, 2 * params.n, 1, 2].map(String);
    return { ...params, bank: sortedBank(answer, distractors, 3, Number) };
  },
  render: (params) => {
    const { template, answer } = multipleSlots(params);
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Write $${MULTIPLE_TARGET[params.kind](params.n)}$ ${MULTIPLE_ASK[params.kind]}.` }],
      template,
      bank: params.bank,
      answer,
    };
  },
  solution: ({ kind, n }) => multipleWorking(kind, n),
};

/* ---------- A multiple angle's value from cos θ or sin θ ---------- */

type ValueKind = 'cos2' | 'cos3' | 'sin3' | 'cos4' | 'cos2s';
interface MultipleValueParams { kind: ValueKind; p: number; q: number; shown: boolean }

/** Each identity: what is given, what is asked, and the polynomial as [power, coefficient]. */
const VALUE_IDENTITY: Record<ValueKind, { given: TrigFn; target: string; terms: [number, number][] }> = {
  cos2: { given: 'cos', target: '\\cos 2\\theta', terms: [[2, 2], [0, -1]] },
  cos3: { given: 'cos', target: '\\cos 3\\theta', terms: [[3, 4], [1, -3]] },
  sin3: { given: 'sin', target: '\\sin 3\\theta', terms: [[1, 3], [3, -4]] },
  cos4: { given: 'cos', target: '\\cos 4\\theta', terms: [[4, 8], [2, -8], [0, 1]] },
  cos2s: { given: 'sin', target: '\\cos 2\\theta', terms: [[0, 1], [2, -2]] },
};

function valueIdentityTex(kind: ValueKind, display = false): string {
  const { given, target, terms } = VALUE_IDENTITY[kind];
  const texs = terms.map(([power, coef]) => (power === 0 ? `${coef}` : scaledTex(rat(coef), powTex(given === 'cos' ? power : 0, given === 'sin' ? power : 0))));
  return display ? stackedSum(target, texs) : `${target} = ${sumTex(texs)}`;
}

/** Each term's value at x = p/q, in the identity's order. */
function valueTerms({ kind, p, q }: MultipleValueParams): Rat[] {
  return VALUE_IDENTITY[kind].terms.map(([power, coef]) => rat(coef * p ** power, q ** power));
}

/**
 * cos 3θ from cos θ = 1/3, and the like: the identity as a tool rather than
 * a result. Difficulty 1 prints the identity and asks for the arithmetic;
 * difficulty 2 leaves the learner to supply it, including cos 4θ and cos 2θ
 * from a sine.
 */
export const trigidMultipleValue: Generator<MultipleValueParams> = {
  id: 'trigid-multiple-value',
  sample: (rng, difficulty) => {
    const kind = rng.pick<ValueKind>(difficulty < 2 ? ['cos2', 'cos3', 'sin3'] : ['cos3', 'cos4', 'cos2s']);
    for (;;) {
      const q = rng.int(2, 5);
      const p = rng.int(1, q - 1);
      if (gcd(p, q) !== 1) continue;
      return { kind, p: p * rng.sign(), q, shown: difficulty < 2 };
    }
  },
  render: (params) => {
    const { kind, p, q, shown } = params;
    const { given, target } = VALUE_IDENTITY[kind];
    const value = valueTerms(params).reduce(ratAdd, rat(0));
    const lead = `$\\${given}\\theta = ${ratTex(rat(p, q))}$.`;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: shown ? `${lead} Use $${valueIdentityTex(kind)}$ to find the exact value.` : `${lead} Find the exact value.`,
        },
      ],
      lead: `${target} =`,
      keypad: [{ insert: '/' }],
      answer: ratAnswer(value),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { kind, shown } = params;
    const { target } = VALUE_IDENTITY[kind];
    const terms = valueTerms(params);
    const value = terms.reduce(ratAdd, rat(0));
    return [
      { text: shown ? 'Put the value into the identity:' : 'Use the identity for it in powers:', tex: valueIdentityTex(kind, true) },
      { text: 'Term by term:', tex: chainTex(target, sumTex(terms.map(ratTex)), ratTex(value)) },
    ];
  },
};

/* ---------- Which part, and which swap ---------- */

type EquateKind = 'cc' | 'cs' | 'ss' | 'sc' | 'tan';
interface EquateParams { kind: EquateKind; n: number }

const PART_REAL = 'The real part';
const PART_IMAG = 'The imaginary part';
const PART_BOTH = 'Both parts';
const EVEN_POWERS = 'Even powers';
const ODD_POWERS = 'Odd powers';
const SWAP_SIN = 'Replace $\\sin^2\\theta$ with $1 - \\cos^2\\theta$';
const SWAP_COS = 'Replace $\\cos^2\\theta$ with $1 - \\sin^2\\theta$';
const TAKE_OUT = 'Take out $\\sin\\theta$, then replace $\\sin^2\\theta$';

const EQUATE_SUBJECT: Record<EquateKind, string> = { cc: 'cos', cs: 'cos', ss: 'sin', sc: 'sin', tan: 'tan' };
const EQUATE_ASK: Record<EquateKind, string> = { ...MULTIPLE_ASK, tan: 'in powers of $\\tan\\theta$' };

/** Whether n suits the kind: cos nθ in sin θ needs n even, sin nθ in sin θ needs n odd. */
const equateFits = (kind: EquateKind, n: number): boolean =>
  kind === 'cs' ? n % 2 === 0 : kind === 'ss' ? n % 2 === 1 && n > 1 : true;

const divideLabel = (n: number): string => `Divide top and bottom by $\\cos^{${n}}\\theta$`;

function equateAnswer({ kind, n }: EquateParams): string[] {
  if (kind === 'cc') return [PART_REAL, EVEN_POWERS, SWAP_SIN];
  if (kind === 'cs') return [PART_REAL, EVEN_POWERS, SWAP_COS];
  if (kind === 'ss') return [PART_IMAG, ODD_POWERS, SWAP_COS];
  if (kind === 'sc') return [PART_IMAG, ODD_POWERS, TAKE_OUT];
  return [PART_BOTH, divideLabel(n)];
}

/**
 * The plan for writing a multiple angle in powers, as three forks: which part
 * of (cos θ + i sin θ)^n, which powers of sin θ that part holds, and how to
 * finish. The steps are the same for every n, so the n varies only the
 * question; what changes the route is what is being asked for. Difficulty 2
 * leans towards the sine and tangent routes.
 */
export const trigidEquateFlow: Generator<EquateParams> = {
  id: 'trigid-equate-flow',
  sample: (rng, difficulty) => {
    const weighted: EquateKind[] =
      difficulty < 2 ? ['cc', 'cc', 'cc', 'cs', 'cs', 'ss', 'sc', 'tan'] : ['cc', 'cs', 'ss', 'ss', 'sc', 'sc', 'tan', 'tan'];
    const [lo, hi] = difficulty < 2 ? [2, 8] : [3, 10];
    for (;;) {
      const kind = rng.pick(weighted);
      const n = rng.int(lo, hi);
      if (equateFits(kind, n)) return { kind, n };
    }
  },
  render: (params) => {
    const { kind, n } = params;
    const subject = `\\${EQUATE_SUBJECT[kind]} ${n}\\theta`;
    const finishes = [SWAP_SIN, SWAP_COS];
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Plan how to write $${subject}$ ${EQUATE_ASK[kind]}, starting from $(\\cos\\theta + i\\sin\\theta)^{${n}}$.` }],
      subject,
      steps: [
        {
          id: 'part',
          ask: `Which part of $(\\cos\\theta + i\\sin\\theta)^{${n}}$ do you need?`,
          branches: [
            { label: PART_REAL, to: 'real' },
            { label: PART_IMAG, to: 'imag' },
            { label: PART_BOTH, to: 'both' },
          ],
        },
        {
          id: 'real',
          ask: 'Which powers of $\\sin\\theta$ does it hold?',
          branches: [
            { label: EVEN_POWERS, to: 'finishReal' },
            { label: ODD_POWERS, outcome: 'An odd power of $\\sin\\theta$ comes with an odd power of $i$, which is imaginary.' },
          ],
        },
        {
          id: 'imag',
          ask: 'Which powers of $\\sin\\theta$ does it hold?',
          branches: [
            { label: EVEN_POWERS, outcome: 'An even power of $i$ is real, so it cannot be in the imaginary part.' },
            { label: ODD_POWERS, to: 'finishImag' },
          ],
        },
        {
          id: 'finishReal',
          ask: 'How do you finish?',
          branches: finishes.map((label) => ({ label, outcome: 'Collect the powers that are left.' })),
        },
        {
          id: 'finishImag',
          ask: 'How do you finish?',
          branches: [SWAP_COS, TAKE_OUT].map((label) => ({ label, outcome: 'Collect the powers that are left.' })),
        },
        {
          id: 'both',
          ask: 'How do you finish?',
          branches: [
            { label: divideLabel(n), outcome: 'Every $\\tfrac{\\sin\\theta}{\\cos\\theta}$ becomes $\\tan\\theta$.' },
            { label: SWAP_SIN, outcome: 'That leaves a fraction in $\\cos\\theta$.' },
          ],
        },
      ],
      answer: equateAnswer(params),
    };
  },
  solution: ({ kind, n }) => {
    const target = `\\${EQUATE_SUBJECT[kind]} ${n}\\theta`;
    if (kind === 'tan') {
      return [
        { text: `$${target}$ is $\\sin ${n}\\theta$ over $\\cos ${n}\\theta$: the imaginary part of $(c + is)^{${n}}$ over the real part, with $c = \\cos\\theta$ and $s = \\sin\\theta$.` },
        { text: `Every term top and bottom has total power $${n}$, so dividing both by $c^{${n}}$ turns each $\\tfrac{s}{c}$ into $\\tan\\theta$.` },
      ];
    }
    const real = kind === 'cc' || kind === 'cs';
    const steps: SolutionStep[] = [
      { text: `By De Moivre, $${target}$ is the ${real ? 'real' : 'imaginary'} part of $(c + is)^{${n}}$, with $c = \\cos\\theta$ and $s = \\sin\\theta$.` },
    ];
    if (n <= 5) steps.push({ tex: stackedSum(target, binomialPart(n, real)) });
    steps.push({
      text: real
        ? 'A real term has an even power of $i$, so an even power of $s$.'
        : 'An imaginary term has an odd power of $i$, so an odd power of $s$.',
    });
    const finish: Record<Exclude<EquateKind, 'tan'>, string> = {
      cc: 'Even powers of $s$ are powers of $s^2 = 1 - c^2$, which leaves only $c$.',
      cs: `With $${n}$ even, the powers of $c$ are even too, and $c^2 = 1 - s^2$ leaves only $s$.`,
      ss: `With $${n}$ odd, the powers of $c$ are even, and $c^2 = 1 - s^2$ leaves only $s$.`,
      sc: 'Taking out one $s$ leaves even powers of $s$, and $s^2 = 1 - c^2$ turns those into $c$.',
    };
    steps.push({ text: finish[kind] });
    return steps;
  },
};

/* ---------- Powers in multiple angles: the identity as tiles ---------- */

type PowerPattern = 'coeffs' | 'mults' | 'scale';
interface PowerFormParams { a: number; b: number; pattern: PowerPattern; bank: string[] }

/**
 * The template and answer for one blanking of `scale · cos^a sin^b = …`.
 *
 * coeffs: every coefficient that is not a plain 1 is a blank.
 * mults: every multiple of θ is a blank, the coefficients written in.
 * scale: the number on the left is a blank, and so is the largest
 * coefficient on the right, which is the one that goes wrong when the
 * halving is forgotten.
 */
function powerSlots({ a, b, pattern }: Omit<PowerFormParams, 'bank'>): { template: string; answer: string[] } | undefined {
  const pf = powerForm(a, b);
  const values = pf.terms.map(({ k, coef }) => ({ k, v: (coef.n * pf.scale) / coef.d }));
  const biggest = values.reduce((best, term, i) => (Math.abs(term.v) > Math.abs(values[best].v) ? i : best), 0);
  const answer: string[] = [];
  const blank = (token: string) => {
    answer.push(token);
    return `{${answer.length - 1}}`;
  };
  const lhs = pattern === 'scale' ? blank(`${pf.scale}`) : `${pf.scale}`;
  const pieces = values.map(({ k, v }, i) => {
    const sign = i === 0 ? (v < 0 ? '-' : '') : v < 0 ? ' - ' : ' + ';
    const size = Math.abs(v);
    const plain = k > 0 && size === 1 ? '' : `${size}`;
    const blankSize = pattern === 'coeffs' ? plain !== '' : pattern === 'scale' && i === biggest && size > 1;
    const coef = blankSize ? blank(`${size}`) : plain;
    const trig = k === 0 ? '' : pattern === 'mults' ? `\\${pf.fn} ${blank(thetaTile(k))}` : multTex(pf.fn, k);
    return `${sign}${coef}${trig}`;
  });
  if (answer.length === 0) return undefined;
  return { template: `${lhs}${powTex(a, b)} = ${pieces.join('')}`, answer };
}

/** Every (a, b, pattern) a difficulty draws from: pure powers at 1, mixed products at 2. */
function powerFormCases(difficulty: number): Omit<PowerFormParams, 'bank'>[] {
  const pairs = difficulty < 2 ? powerPairs(2, 6, false) : powerPairs(2, 6, true);
  return pairs.flatMap(([a, b]) =>
    (['coeffs', 'mults', 'scale'] as PowerPattern[])
      .map((pattern) => ({ a, b, pattern }))
      .filter((params) => powerSlots(params) !== undefined),
  );
}

/**
 * cos^n θ, sin^n θ and their products in multiple angles, as tiles. Three
 * blankings: the coefficients, the multiples, or the number the power is
 * scaled by. The bank holds the unhalved coefficients from the expansion
 * of (z ± z^{-1})^n, which is where the usual slip lands. Difficulty 1 is a
 * single power; difficulty 2 a product of both.
 */
export const trigidPowerForm: Generator<PowerFormParams> = {
  id: 'trigid-power-form',
  sample: (rng, difficulty) => {
    const params = rng.pick(powerFormCases(difficulty));
    const { answer } = powerSlots(params)!;
    const pf = powerForm(params.a, params.b);
    const n = params.a + params.b;
    const raw = [...pf.poly.values()].map((c) => Math.abs(c));
    const distractors =
      params.pattern === 'mults'
        ? [n + 1, n - 1, 2 * n, n + 2, 1].filter((k) => k >= 1).map(thetaTile)
        : [...raw, pf.scale / 2, pf.scale * 2, 2 ** n, n, 2 * n].filter((x) => Number.isInteger(x) && x > 0).map(String);
    return { ...params, bank: sortedBank(answer, distractors, 3, params.pattern === 'mults' ? leadingNumber : Number) };
  },
  render: (params) => {
    const { template, answer } = powerSlots(params)!;
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Write $${powTex(params.a, params.b)}$ in multiple angles of $\\theta$.` }],
      template,
      bank: params.bank,
      answer,
    };
  },
  solution: ({ a, b }) => anglePowerWorking(a, b),
};

/* ---------- One coefficient of a power in multiple angles ---------- */

interface PowerCoeffParams { a: number; b: number; pick: number }

const COEFF_LETTERS = ['a', 'b', 'c', 'd'];

/** The form with a letter for every coefficient, stacked to fit a phone. */
function lettersTex(a: number, b: number): string {
  const pf = powerForm(a, b);
  return stackedSum(
    powTex(a, b),
    pf.terms.map(({ k }, i) => (k === 0 ? COEFF_LETTERS[i] : `${COEFF_LETTERS[i]}${multTex(pf.fn, k)}`)),
  );
}

/**
 * A single coefficient of cos^a θ sin^b θ in multiple angles, typed. A value
 * rather than a form, so the checker grades it fairly, and the distractors of
 * its choice form are the halving and doubling slips. Difficulty 1 is a
 * single power; difficulty 2 a product of both.
 */
export const trigidPowerCoefficient: Generator<PowerCoeffParams> = {
  id: 'trigid-power-coefficient',
  choices: ({ a, b, pick }) => {
    const pf = powerForm(a, b);
    const coef = pf.terms[pick].coef;
    const opt = (r: Rat) => ({ tex: ratTex(r), answer: ratAnswer(r) });
    return steered(
      options(opt(coef), opt(ratMul(coef, rat(2))), opt(ratMul(coef, rat(1, 2))), opt(ratMul(coef, rat(pf.scale))), opt(ratMul(coef, rat(-1)))).slice(0, 4),
      mix(a, b, pick),
    );
  },
  sample: (rng, difficulty) => {
    const [a, b] = rng.pick(difficulty < 2 ? powerPairs(2, 6, false) : powerPairs(2, 6, true));
    return { a, b, pick: rng.int(0, powerForm(a, b).terms.length - 1) };
  },
  render: ({ a, b, pick }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Written in multiple angles of $\\theta$,` },
      { kind: 'display', tex: lettersTex(a, b) },
      { kind: 'prose', text: `Find $${COEFF_LETTERS[pick]}$.` },
    ],
    lead: `${COEFF_LETTERS[pick]} =`,
    keypad: [{ insert: '/' }],
    answer: ratAnswer(powerForm(a, b).terms[pick].coef),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, pick }) => {
    const pf = powerForm(a, b);
    const { coef } = pf.terms[pick];
    const whole = (coef.n * pf.scale) / coef.d;
    const divided = `${whole < 0 ? '-' : ''}\\tfrac{${Math.abs(whole)}}{${pf.scale}}`;
    const reduces = divided !== ratTex(coef);
    return [
      ...anglePowerWorking(a, b),
      {
        text: `Divide by $${pf.scale}$ for $${powTex(a, b)}$ itself:`,
        tex: reduces ? chainTex(COEFF_LETTERS[pick], divided, ratTex(coef)) : `${COEFF_LETTERS[pick]} = ${divided}`,
      },
    ];
  },
};

/* ---------- Cosines or sines, a constant, the top multiple ---------- */

interface PowerFlowParams { a: number; b: number }

/**
 * What cos^a θ sin^b θ looks like in multiple angles, decided before any
 * multiplying out: an even power of sine gives cosines and an odd one sines;
 * a constant survives only when a z^0 term does; and the top multiple is
 * a + b. Difficulty 2 reaches higher total powers.
 */
export const trigidPowerFlow: Generator<PowerFlowParams> = {
  id: 'trigid-power-flow',
  sample: (rng, difficulty) => {
    const [a, b] = rng.pick(difficulty < 2 ? powerPairs(2, 6, 'any') : powerPairs(4, 8, 'any'));
    return { a, b };
  },
  render: ({ a, b }) => {
    const n = a + b;
    const pf = powerForm(a, b);
    const tops = [...new Set([n - 1, n, 2 * n].filter((k) => k >= 1))].sort((x, y) => x - y);
    const top = (id: string) => ({
      id,
      ask: 'What is the largest multiple of $\\theta$ in it?',
      branches: tops.map((k) => ({ label: `$${thetaTile(k)}$`, outcome: `The highest power of $z$ is $z^{${k}}$.` })),
    });
    const constant = pf.poly.has(0);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Picture it written with $z + z^{-1}$ and $z - z^{-1}$, then multiplied out. Work down the questions.' }],
      subject: powTex(a, b),
      steps: [
        {
          id: 'kind',
          ask: 'In multiple angles, is it a sum of cosines or of sines?',
          branches: [
            { label: 'Cosines', to: 'constant' },
            { label: 'Sines', to: 'topSin' },
          ],
        },
        {
          id: 'constant',
          ask: 'Does it have a constant term?',
          branches: [
            { label: 'Yes', to: 'topCos' },
            { label: 'No', to: 'topCos' },
          ],
        },
        top('topCos'),
        top('topSin'),
      ],
      answer: pf.fn === 'cos' ? ['Cosines', constant ? 'Yes' : 'No', `$${thetaTile(n)}$`] : ['Sines', `$${thetaTile(n)}$`],
    };
  },
  solution: ({ a, b }) => {
    const n = a + b;
    const pf = powerForm(a, b);
    const steps: SolutionStep[] = [
      { text: `$${powTex(a, b)}$ is $${zBracketsTex(a, b)}$ divided by $${powerLeadTex(a, b)}$.` },
      {
        text: pf.fn === 'cos'
          ? b === 0
            ? 'There is no $\\sin\\theta$, so no $i$ appears and the powers of $z$ pair into cosines.'
            : 'The power of $\\sin\\theta$ is even, so the $i$s multiply to a real number and the powers of $z$ pair into cosines.'
          : 'The power of $\\sin\\theta$ is odd, so one $i$ is left over and the powers of $z$ pair into sines.',
      },
    ];
    if (pf.fn === 'cos') {
      steps.push({
        text: pf.poly.has(0)
          ? `Every power of $z$ is even, since the total power $${n}$ is, so a $z^0$ term survives: a constant.`
          : `Every power of $z$ is odd, since the total power $${n}$ is, so nothing is left as a constant.`,
      });
    }
    steps.push({ text: `The highest power of $z$ is $z^{${n}}$, so the largest multiple is $${thetaTile(n)}$.` });
    return steps;
  },
};

/* ---------- The average height is the constant term ---------- */

interface PowerMeanParams { a: number; b: number; m: number }

/**
 * The bases a slider draws from, each with how many multiples it allows.
 * The multiplier keeps the average whole: 2cos²θ, 8cos⁴θ, 16cos⁶θ.
 */
const MEAN_BASES: Record<'easy' | 'hard', [number, number, number][]> = {
  easy: [[2, 0, 7], [0, 2, 7], [4, 0, 2], [0, 4, 2], [3, 0, 3], [0, 3, 3], [1, 1, 3], [2, 2, 3]],
  hard: [[4, 0, 2], [0, 4, 2], [2, 2, 4], [6, 0, 2], [0, 6, 2], [4, 2, 4], [2, 4, 4], [3, 1, 2], [1, 3, 2], [2, 1, 2], [5, 0, 1]],
};

/** The multiplier k, the constant term of k·cos^a sin^b (its average), and the curve. */
function meanParts({ a, b, m }: PowerMeanParams) {
  const pf = powerForm(a, b);
  const constant = pf.terms.find((term) => term.k === 0)?.coef ?? rat(0);
  const k = (constant.n === 0 ? pf.scale : constant.d) * m;
  const f = (t: number) => k * Math.cos(t) ** a * Math.sin(t) ** b;
  let lo = 0;
  let hi = 0;
  for (let i = 0; i <= 400; i += 1) {
    const y = f((2 * Math.PI * i) / 400);
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  return { pf, k, mean: (constant.n * k) / constant.d, f, min: Math.floor(lo + 1e-9), max: Math.ceil(hi - 1e-9) };
}

/**
 * Slide a line to the average height of y = k cos^a θ sin^b θ over a whole
 * turn. Every cosine and sine term averages to nothing, so the average is the
 * constant term of the multiple-angle form, and zero when there is none. The
 * graph shows the shape; the identity gives the number. Difficulty 2 is
 * higher powers and products of both.
 */
export const trigidPowerMean: Generator<PowerMeanParams> = {
  id: 'trigid-power-mean',
  sample: (rng, difficulty) => {
    const [a, b, most] = rng.pick(MEAN_BASES[difficulty < 2 ? 'easy' : 'hard']);
    return { a, b, m: rng.int(1, most) };
  },
  render: (params) => {
    const { k, mean, f, min, max } = meanParts(params);
    const svg = plotSvg({
      xMin: 0,
      xMax: 2 * Math.PI,
      curves: [{ f }],
      yMin: min,
      yMax: max,
      label: 'One whole turn of the curve',
    });
    return {
      kind: 'slider',
      prompt: [{ kind: 'prose', text: `Slide to the average height of $y = ${timesTex(k)}${powTex(params.a, params.b)}$ over a whole turn.` }],
      min,
      max,
      step: 1,
      answer: mean,
      readout: '\\bar{y} = {v}',
      figure: { svg, ...markerWindow(min, max, 'y'), axis: 'y' },
    };
  },
  solution: (params) => {
    const { a, b } = params;
    const { pf, k, mean } = meanParts(params);
    const lhs = `${timesTex(k)}${powTex(a, b)}`;
    return [
      { text: 'In multiple angles:', tex: stackedSum(lhs, pf.terms.map((term) => angleTermTex(pf.fn, term, rat(k)))) },
      {
        text: mean === 0
          ? 'Every term is a cosine or sine of a multiple of $\\theta$, and each of those averages to zero over a whole turn. There is no constant term, so the average is 0.'
          : 'Each cosine term averages to zero over a whole turn, so the average is the constant term.',
      },
      { tex: `\\bar{y} = ${mean}` },
    ];
  },
};

/* ---------- A cubic that is cos 3θ in disguise ---------- */

type CubicKind = 'cos3' | 'sin3' | 'cos3moved' | 'cos4';
interface CubicSubParams { kind: CubicKind; k: number; c: number }

const CUBIC_TARGET: Record<CubicKind, string> = {
  cos3: '\\cos 3\\theta',
  cos3moved: '\\cos 3\\theta',
  sin3: '\\sin 3\\theta',
  cos4: '\\cos 4\\theta',
};

/** + c or - c at the end of a side, nothing for 0. */
const tailTex = (c: number): string => (c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`);

function cubicTex({ kind, k, c }: CubicSubParams): string {
  if (kind === 'cos3') return `${4 * k}x^3 - ${timesTex(3 * k)}x = ${c}`;
  if (kind === 'sin3') return `${timesTex(3 * k)}x - ${4 * k}x^3 = ${c}`;
  if (kind === 'cos3moved') return `${4 * k}x^3 = ${timesTex(3 * k)}x${tailTex(c)}`;
  return `${8 * k}x^4 - ${8 * k}x^2 + ${k} = ${c}`;
}

/** The identity the left side is k times, in θ. */
const CUBIC_IDENTITY: Record<CubicKind, string> = {
  cos3: '4\\cos^3\\theta - 3\\cos\\theta = \\cos 3\\theta',
  cos3moved: '4\\cos^3\\theta - 3\\cos\\theta = \\cos 3\\theta',
  sin3: '3\\sin\\theta - 4\\sin^3\\theta = \\sin 3\\theta',
  cos4: stackedSum('\\cos 4\\theta', ['8\\cos^4\\theta', '-8\\cos^2\\theta', '1']),
};

/**
 * Substitute x = cos θ (or sin θ) into a polynomial equation whose left side
 * is a multiple of an identity, and say what the multiple angle equals. A
 * value, so typed. Difficulty 2 moves a term across first, and adds the
 * quartic that is cos 4θ.
 */
export const trigidCubicSubstitute: Generator<CubicSubParams> = {
  id: 'trigid-cubic-substitute',
  sample: (rng, difficulty) => {
    const kind = rng.pick<CubicKind>(difficulty < 2 ? ['cos3', 'sin3'] : ['cos3moved', 'sin3', 'cos4']);
    const k = rng.int(1, difficulty < 2 ? 4 : 5);
    return { kind, k, c: rng.int(-k, k) };
  },
  render: (params) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Substitute $x = ${params.kind === 'sin3' ? '\\sin' : '\\cos'}\\theta$ into this equation.` },
      { kind: 'display', tex: cubicTex(params) },
    ],
    lead: `${CUBIC_TARGET[params.kind]} =`,
    keypad: [{ insert: '/' }],
    answer: ratAnswer(rat(params.c, params.k)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { kind, k, c } = params;
    const steps: SolutionStep[] = [];
    if (kind === 'cos3moved') {
      steps.push({ text: 'Bring the $x$ term across first:', tex: `${4 * k}x^3 - ${timesTex(3 * k)}x = ${c}` });
    }
    steps.push(
      { text: `With $x = ${kind === 'sin3' ? '\\sin' : '\\cos'}\\theta$ the left side is ${k === 1 ? 'exactly' : `$${k}$ times`} a known identity:`, tex: CUBIC_IDENTITY[kind] },
      { text: k === 1 ? 'So' : `So $${k}${CUBIC_TARGET[kind]} = ${c}$, and`, tex: `${CUBIC_TARGET[kind]} = ${ratTex(rat(c, k))}` },
    );
    return steps;
  },
};

/* ---------- The three roots of the cubic ---------- */

interface CubicRootsParams { fn: TrigFn; row: number; k: number; bank: string[] }

/** Table values v, with arccos v and arcsin v as fractions of π. */
const ROOT_ROWS: { cos: [number, number]; sin: [number, number] }[] = [
  { cos: [1, 3], sin: [1, 6] }, // 1/2
  { cos: [2, 3], sin: [-1, 6] }, // -1/2
  { cos: [1, 4], sin: [1, 4] }, // √2/2
  { cos: [3, 4], sin: [-1, 4] }, // -√2/2
  { cos: [1, 6], sin: [1, 3] }, // √3/2
  { cos: [5, 6], sin: [-1, 3] }, // -√3/2
  { cos: [1, 2], sin: [0, 1] }, // 0
];

/**
 * The right side v, the three values 3θ takes in range, and the three θ.
 *
 * cos 3θ = v with 0 ≤ θ ≤ π: 3θ = α, 2π - α, 2π + α. sin 3θ = v with
 * -π/2 ≤ θ ≤ π/2: 3θ = β, π - β, -π - β. Each is held as a numerator over
 * 3d, so dividing by 3 is exact.
 */
function cubicRoots({ fn, row }: { fn: TrigFn; row: number }) {
  const [m, d] = ROOT_ROWS[row][fn];
  const v = trigPart(fn, m, d);
  const tripled = (fn === 'cos' ? [m, 2 * d - m, 2 * d + m] : [m, d - m, -d - m]).sort((x, y) => x - y);
  return { v, m, d, tripled, roots: tripled.map((t) => angleTex(t, 3 * d)) };
}

/**
 * The three roots of 4x³ - 3x = v (or 3x - 4x³ = v) as cosines (or sines)
 * of angles, one tile each, in any order. The bank holds the angle before
 * dividing by 3 and the angles a third of a turn off, which is where
 * forgetting the other solutions of cos 3θ = v lands. Difficulty 2 is mostly
 * the sine form, whose range runs below zero.
 */
export const trigidCubicRoots: Generator<CubicRootsParams> = {
  id: 'trigid-cubic-roots',
  sample: (rng, difficulty) => {
    const fn: TrigFn = difficulty < 2 ? 'cos' : rng.chance(0.7) ? 'sin' : 'cos';
    const row = rng.int(0, ROOT_ROWS.length - 1);
    const { m, d, tripled, roots } = cubicRoots({ fn, row });
    // Each candidate as a numerator over 3d, so the bank can be sorted by size.
    const over = [3 * m, m + d, d - m, 2 * m, m + 4 * d, -m];
    const sizes = new Map<string, number>([...tripled, ...over].map((t) => [angleTex(t, 3 * d), t]));
    const candidates = over.map((t) => angleTex(t, 3 * d));
    return { fn, row, k: rng.int(1, 4), bank: sortedBank(roots, candidates, 3, (tex) => sizes.get(tex) ?? 0) };
  },
  render: (params) => {
    const { fn, k } = params;
    const { v, roots } = cubicRoots(params);
    const rhs = partTex(scalePart({ a: k, s: 1 }, v));
    const range = fn === 'cos' ? '0 \\le \\theta \\le \\pi' : '-\\tfrac{\\pi}{2} \\le \\theta \\le \\tfrac{\\pi}{2}';
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Solve by putting $x = \\${fn}\\theta$ with $${range}$.` },
        { kind: 'display', tex: fn === 'cos' ? `${4 * k}x^3 - ${timesTex(3 * k)}x = ${rhs}` : `${timesTex(3 * k)}x - ${4 * k}x^3 = ${rhs}` },
      ],
      template: `x = \\${fn} {0} \\text{ or } \\${fn} {1} \\text{ or } \\${fn} {2}`,
      bank: params.bank,
      answer: roots,
      unordered: true,
    };
  },
  solution: (params) => {
    const { fn, k } = params;
    const { v, d, tripled, roots } = cubicRoots(params);
    const identity = fn === 'cos' ? '4\\cos^3\\theta - 3\\cos\\theta = \\cos 3\\theta' : '3\\sin\\theta - 4\\sin^3\\theta = \\sin 3\\theta';
    const span = fn === 'cos' ? 'from $0$ to $3\\pi$' : 'from $-\\tfrac{3\\pi}{2}$ to $\\tfrac{3\\pi}{2}$';
    return [
      { text: `With $x = \\${fn}\\theta$, the left side is ${k === 1 ? '' : `$${k}$ times `}$${identity.split(' = ')[0]}$, which is $\\${fn} 3\\theta$. So`, tex: `\\${fn} 3\\theta = ${partTex(v)}` },
      { text: `$3\\theta$ runs ${span}, and in that range it can be`, tex: `3\\theta = ${tripled.map((t) => angleTex(t, d)).join(',\\ ')}` },
      { text: 'Divide each by 3. Each gives a different value, so these are the three roots:', tex: `\\theta = ${roots.join(',\\ ')}` },
    ];
  },
};

/* ---------- A definite integral of a power, term by term ---------- */

interface IntegralTreeParams { a: number; b: number; u: number; bank: string[] }

/** The upper limit π/u as the learner reads it in a limit. */
const upperTex = (u: number): string => (u === 1 ? '\\pi' : `\\frac{\\pi}{${u}}`);

/** ∫ from 0 to π/u of each whole-number term, their sum, and that sum over the scale. */
function integralParts({ a, b, u }: { a: number; b: number; u: number }) {
  const pf = powerForm(a, b);
  const leaves = pf.terms.map(({ k, coef }) => {
    const v = rat(coef.n * pf.scale, coef.d);
    if (k === 0) return { ...EXACT_ZERO, pi: rat(v.n, u) };
    if (pf.fn === 'cos') return exactScale(exactOfPart(trigPart('sin', k, u)), rat(v.n, k));
    const cosAt = exactOfPart(trigPart('cos', k, u));
    return exactScale(exactAdd({ ...EXACT_ZERO, r: rat(1) }, exactScale(cosAt, rat(-1))), rat(v.n, k));
  });
  const sum = leaves.reduce(exactAdd, EXACT_ZERO);
  return { pf, leaves, sum, result: exactScale(sum, rat(1, pf.scale)) };
}

const INTEGRAL_BASES: Record<'easy' | 'hard', [number, number][]> = {
  easy: [[2, 0], [0, 2], [3, 0], [0, 3], [4, 0], [0, 4], [2, 2]],
  hard: [[4, 0], [0, 4], [5, 0], [0, 5], [2, 2], [2, 1], [1, 2], [3, 1], [1, 3]],
};

/**
 * ∫₀^{π/u} cos^a θ sin^b θ dθ as a tree: each term of the whole-number
 * multiple-angle form integrated, then added, then divided by the scale.
 * The bank holds the answer's sign flipped and doubled and halved, which is
 * where a lost minus or a forgotten divide lands. Difficulty 2 has more
 * terms and limits of π/3 and π/6, whose values carry √3.
 */
export const trigidIntegralTree: Generator<IntegralTreeParams> = {
  id: 'trigid-integral-tree',
  sample: (rng, difficulty) => {
    const [a, b] = rng.pick(INTEGRAL_BASES[difficulty < 2 ? 'easy' : 'hard']);
    const u = rng.pick(difficulty < 2 ? [1, 2, 3, 4] : [2, 3, 4, 6]);
    const { leaves, sum, result } = integralParts({ a, b, u });
    const answer = [...leaves, sum, result].map(exactTex);
    const candidates = [
      exactScale(result, rat(-1)),
      exactScale(result, rat(2)),
      exactScale(result, rat(1, 2)),
      exactScale(sum, rat(-1)),
      ...leaves.map((leaf) => exactScale(leaf, rat(-1))),
      { ...EXACT_ZERO, pi: rat(1, u) },
      { ...EXACT_ZERO, r: rat(1) },
      { ...EXACT_ZERO, pi: rat(1, 2 * u) },
    ].map(exactTex);
    const extras: string[] = [];
    for (const tex of candidates) {
      if (extras.length < 3 && !answer.includes(tex) && !extras.includes(tex)) extras.push(tex);
    }
    return { a, b, u, bank: [...answer, ...extras].sort() };
  },
  render: (params) => {
    const { a, b, u } = params;
    const { pf, leaves, sum, result } = integralParts(params);
    return {
      kind: 'tree',
      prompt: [
        { kind: 'prose', text: `Top row: each term on the right integrated from $0$ to $${upperTex(u).replace('\\frac', '\\tfrac')}$. Then their sum, then divide by $${pf.scale}$.` },
        { kind: 'display', tex: stackedSum(`${pf.scale}${powTex(a, b)}`, pf.terms.map((term) => angleTermTex(pf.fn, term, rat(pf.scale)))) },
      ],
      expression: `\\int_0^{${upperTex(u)}} ${powTex(a, b)}\\,d\\theta`,
      nodes: [
        ...leaves.map((_leaf, i) => ({ id: `t${i}`, from: [] })),
        { id: 'sum', from: leaves.map((_leaf, i) => `t${i}`) },
        { id: 'result', from: ['sum'] },
      ],
      bank: params.bank,
      answer: [...leaves, sum, result].map(exactTex),
    };
  },
  solution: (params) => {
    const { a, b, u } = params;
    const { pf, leaves, sum, result } = integralParts(params);
    const upper = upperTex(u);
    const rule = pf.fn === 'cos'
      ? '$\\cos k\\theta$ integrates to $\\tfrac{1}{k}\\sin k\\theta$, and a constant $c$ to $c\\theta$.'
      : '$\\sin k\\theta$ integrates to $-\\tfrac{1}{k}\\cos k\\theta$, so from $0$ it gives $\\tfrac{1}{k}(1 - \\cos k\\theta)$.';
    return [
      { text: 'In multiple angles:', tex: stackedSum(`${pf.scale}${powTex(a, b)}`, pf.terms.map((term) => angleTermTex(pf.fn, term, rat(pf.scale)))) },
      { text: `Integrate each term from $0$ to $${upper.replace('\\frac', '\\tfrac')}$. ${rule}` },
      ...pf.terms.map((term, i) => {
        const integrand = angleTermTex(pf.fn, term, rat(pf.scale));
        return { tex: `\\int_0^{${upper}} ${integrand.startsWith('-') ? `(${integrand})` : integrand}\\,d\\theta = ${exactTex(leaves[i])}` };
      }),
      { text: 'Add them:', tex: exactTex(sum) },
      { text: `Divide by $${pf.scale}$:`, tex: `\\int_0^{${upper}} ${powTex(a, b)}\\,d\\theta = ${exactTex(result)}` },
    ];
  },
};

/* ---------- An indefinite integral of a power ---------- */

interface AntiderivParams { a: number; b: number; k: number }

const ANTIDERIVATIVE_KEYS: KeypadKey[] = [...CALCULUS_TRIG_KEYS, { insert: 'C' }];

/** The antiderivative's terms: for mathjs, and as TeX in x. */
function antiderivParts({ a, b, k }: AntiderivParams) {
  const pf = powerForm(a, b);
  const answers: string[] = [];
  const texs: string[] = [];
  for (const { k: mult, coef } of pf.terms) {
    const c = ratMul(coef, rat(k));
    if (mult === 0) {
      answers.push(`(${ratAnswer(c)})*x`);
      texs.push(scaledTex(c, 'x'));
    } else if (pf.fn === 'cos') {
      const r = ratMul(c, rat(1, mult));
      answers.push(`(${ratAnswer(r)})*sin(${mult === 1 ? 'x' : `${mult}*x`})`);
      texs.push(scaledTex(r, multTex('sin', mult, 'x')));
    } else {
      const r = ratMul(c, rat(-1, mult));
      answers.push(`(${ratAnswer(r)})*cos(${mult === 1 ? 'x' : `${mult}*x`})`);
      texs.push(scaledTex(r, multTex('cos', mult, 'x')));
    }
  }
  return { pf, answer: answers.join(' + '), texs };
}

const ANTIDERIV_BASES: Record<'easy' | 'hard', [number, number][]> = {
  easy: [[2, 0], [0, 2], [3, 0], [0, 3], [4, 0], [0, 4], [1, 1]],
  hard: [[2, 2], [5, 0], [0, 5], [3, 1], [1, 3], [2, 1], [1, 2], [4, 2]],
};

/**
 * ∫ k cos^a x sin^b x dx, typed: write it in multiple angles, then integrate
 * term by term. The oracle differentiates the answer back to the integrand,
 * so any correct antiderivative is accepted, including ones found another
 * way. Difficulty 2 is products of both and fifth powers.
 */
export const trigidPowerAntiderivative: Generator<AntiderivParams> = {
  id: 'trigid-power-antiderivative',
  sample: (rng, difficulty) => {
    const [a, b] = rng.pick(ANTIDERIV_BASES[difficulty < 2 ? 'easy' : 'hard']);
    const scale = powerForm(a, b).scale;
    return { a, b, k: rng.pick([...new Set([1, 2, 3, scale, 2 * scale])]) };
  },
  render: (params) => {
    const { a, b, k } = params;
    const factor = (p: number, fn: string) => (p === 0 ? [] : [`${fn}(x)^${p}`]);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Write it in multiple angles of $x$ first, then integrate.' }],
      lead: `\\int ${timesTex(k)}${powTex(a, b, 'x')}\\,dx =`,
      keypad: ANTIDERIVATIVE_KEYS,
      answer: antiderivParts(params).answer,
      integrand: [`${k}`, ...factor(a, 'cos'), ...factor(b, 'sin')].join('*'),
      domain: 'real',
      mode: 'upToConstant',
    };
  },
  solution: (params) => {
    const { a, b, k } = params;
    const { pf, texs } = antiderivParts(params);
    return [
      {
        text: 'Multiple angles first:',
        tex: stackedSum(`${timesTex(k)}${powTex(a, b, 'x')}`, pf.terms.map((term) => angleTermTex(pf.fn, term, rat(k), 'x'))),
      },
      {
        text: pf.fn === 'cos'
          ? 'Integrate term by term: $\\cos mx$ gives $\\tfrac{1}{m}\\sin mx$, and a constant $c$ gives $cx$.'
          : 'Integrate term by term: $\\sin mx$ gives $-\\tfrac{1}{m}\\cos mx$.',
      },
      { tex: stackedSum(`\\int ${timesTex(k)}${powTex(a, b, 'x')}\\,dx`, [...texs, 'C']) },
    ];
  },
};

/* ---------- A trig series as a geometric series ---------- */

interface GeometricParams { p: number; s: number; count: number; bank: string[] }

/** e^{k iθ} as written: 1 for k = 0, e^{i\theta} for k = 1. */
const eTex = (k: number): string => (k === 0 ? '1' : k === 1 ? 'e^{i\\theta}' : k === -1 ? 'e^{-i\\theta}' : `e^{${k}i\\theta}`);

function geometricTex({ p, s, count }: Omit<GeometricParams, 'bank'>): string {
  return `${eTex(p)} + ${eTex(p + s)} + \\dots + ${eTex(p + s * (count - 1))}`;
}

/**
 * A run of powers of e^{iθ} is a geometric series: its first term, its
 * ratio, and how many terms, as tiles. Counting the terms is where it goes
 * wrong: the powers run from p to p + s(N - 1), not to N. Difficulty 2
 * starts later, steps further and runs longer.
 */
export const trigidSeriesGeometric: Generator<GeometricParams> = {
  id: 'trigid-series-geometric',
  sample: (rng, difficulty) => {
    const p = difficulty < 2 ? rng.int(0, 1) : rng.int(0, 3);
    const s = difficulty < 2 ? rng.int(1, 2) : rng.int(1, 3);
    const count = difficulty < 2 ? rng.int(4, 10) : rng.int(5, 12);
    const last = p + s * (count - 1);
    const answer = [eTex(p), eTex(s), `${count}`];
    const distractors = [eTex(p + s), `${count - 1}`, `${last}`, `${count + 1}`, eTex(s + 1), eTex(0)];
    return { p, s, count, bank: sortedBank(answer, distractors, 4) };
  },
  render: (params) => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'This is a geometric series. Fill in its first term $a$, its ratio $r$ and its number of terms $N$.' },
      { kind: 'display', tex: geometricTex(params) },
    ],
    template: 'a = {0},\\quad r = {1},\\quad N = {2}',
    bank: params.bank,
    answer: [eTex(params.p), eTex(params.s), `${params.count}`],
  }),
  solution: ({ p, s, count }) => {
    const last = p + s * (count - 1);
    return [
      { text: `The first term is $${eTex(p)}$.` },
      { text: `The powers go up by $${s}i\\theta$ each time, so each term is the one before times $${eTex(s)}$.` },
      {
        text: `The powers of $e^{i\\theta}$ run from $${p}$ to $${last}$ in steps of $${s}$:`,
        tex: `N = ${s === 1 ? `${last} - ${p} + 1` : `\\tfrac{${last} - ${p}}{${s}} + 1`} = ${count}`,
      },
      { text: 'So the sum is $\\dfrac{a(r^N - 1)}{r - 1}$.' },
    ];
  },
};

/* ---------- The half-angle trick ---------- */

type HalfKind = 'minus' | 'plus' | 'oneMinus';
interface HalfAngleParams { m: number; kind: HalfKind; bank: string[] }

/** e^{mθi/2}, the factor taken out, with its sign. */
function halfExpTex(m: number, sign = 1): string {
  const minus = sign < 0 ? '-' : '';
  if (m % 2 === 0) return eTex(sign * (m / 2));
  return `e^{${minus}\\frac{${m === 1 ? '' : m}i\\theta}{2}}`;
}

/** cos or sin of mθ/2. */
const halfTrigTex = (fn: TrigFn, m: number): string =>
  m % 2 === 0 ? multTex(fn, m / 2) : `\\${fn}\\tfrac{${m === 1 ? '' : m}\\theta}{2}`;

function halfLhs({ m, kind }: { m: number; kind: HalfKind }): string {
  if (kind === 'minus') return `${eTex(m)} - 1`;
  if (kind === 'plus') return `${eTex(m)} + 1`;
  return `1 - ${eTex(m)}`;
}

/** The answer's three tiles: the factor, the number and the trig term. */
function halfParts({ m, kind }: { m: number; kind: HalfKind }): string[] {
  const coef = kind === 'minus' ? '2i' : kind === 'plus' ? '2' : '-2i';
  return [halfExpTex(m), coef, halfTrigTex(kind === 'plus' ? 'cos' : 'sin', m)];
}

/**
 * e^{imθ} ± 1 with half the angle taken out: e^{imθ/2} times 2i sin(mθ/2)
 * or 2cos(mθ/2). It is the step that turns a geometric sum of exponentials
 * into something real. The bank holds the factor not halved, the trig term
 * at the full angle, and the other coefficient. Difficulty 2 adds 1 - e^{imθ}
 * and larger multiples.
 */
export const trigidSeriesHalfAngle: Generator<HalfAngleParams> = {
  id: 'trigid-series-half-angle',
  sample: (rng, difficulty) => {
    const kinds: HalfKind[] = difficulty < 2 ? ['minus', 'plus'] : ['minus', 'plus', 'oneMinus'];
    const m = rng.int(1, difficulty < 2 ? 13 : 15);
    const kind = rng.pick(kinds);
    const answer = halfParts({ m, kind });
    const fn: TrigFn = kind === 'plus' ? 'cos' : 'sin';
    const distractors = [eTex(m), multTex(fn, m), kind === 'plus' ? '2i' : '2', halfTrigTex(fn === 'cos' ? 'sin' : 'cos', m), kind === 'oneMinus' ? '2i' : '-2i'];
    return { m, kind, bank: sortedBank(answer, distractors, 4) };
  },
  render: (params) => ({
    kind: 'tiles',
    prompt: [{ kind: 'prose', text: 'Take out half the angle. Fill in the factor, the number and the trig term.' }],
    template: `${halfLhs(params)} = {0}\\,({1}{2})`,
    bank: params.bank,
    answer: halfParts(params),
  }),
  solution: ({ m, kind }) => {
    const [factor, coef, trig] = halfParts({ m, kind });
    const up = halfExpTex(m);
    const down = halfExpTex(m, -1);
    const inner = kind === 'plus' ? `${up} + ${down}` : kind === 'minus' ? `${up} - ${down}` : `${down} - ${up}`;
    const why =
      kind === 'plus'
        ? 'The bracket is a power plus its reciprocal, which is twice a cosine, just as $z + z^{-1} = 2\\cos\\theta$.'
        : kind === 'minus'
          ? 'The bracket is a power minus its reciprocal, which is $2i$ times a sine, just as $z - z^{-1} = 2i\\sin\\theta$.'
          : 'The bracket is the reciprocal minus the power, which is $-2i$ times a sine.';
    return [
      { text: `Take out $${factor}$, half of $${eTex(m)}$:`, tex: `${halfLhs({ m, kind })} = ${factor}(${inner})` },
      { text: why, tex: `${halfLhs({ m, kind })} = ${factor}\\,(${coef}${trig})` },
    ];
  },
};

/* ---------- The value of a trig series ---------- */

interface SeriesValueParams { fn: TrigFn; q: number; e: number; n: number }

/** θ = qπ/e: angles whose half, and every multiple of whose half, is a table angle. */
const SERIES_ANGLES: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 1]];

/** Σ_{k=1}^{n} cos kθ (or sin kθ), added up term by term, exactly. */
function seriesSum({ fn, q, e, n }: SeriesValueParams): ExactValue {
  let total = EXACT_ZERO;
  for (let k = 1; k <= n; k += 1) total = exactAdd(total, exactOfPart(trigPart(fn, k * q, e)));
  return total;
}

/**
 * Σ cos kθ or Σ sin kθ from k = 1 to n at an angle whose half is a table
 * angle, so the closed form sin(nθ/2) cos((n+1)θ/2) / sin(θ/2) evaluates
 * exactly. A value, so typed. The answer is added up term by term and the
 * worked solution goes through the closed form, which is what makes a test
 * that the two agree worth having. Difficulty 2 runs longer.
 */
export const trigidSeriesValue: Generator<SeriesValueParams> = {
  id: 'trigid-series-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const [q, e] = rng.pick(difficulty < 2 ? SERIES_ANGLES : SERIES_ANGLES.slice(0, 3));
      const fn = rng.pick<TrigFn>(['cos', 'sin']);
      if (fn === 'sin' && e === 1) continue;
      return { fn, q, e, n: difficulty < 2 ? rng.int(3, 8) : rng.int(7, 15) };
    }
  },
  render: (params) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Find the exact value of this sum.' }],
    lead: `\\sum_{k=1}^{${params.n}} \\${params.fn} ${kAngleTex(params.q, params.e)} =`,
    keypad: [{ insert: '/' }, { insert: 'sqrt(', label: '√(' }],
    answer: exactAnswer(seriesSum(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { fn, q, e, n } = params;
    const half = (k: number) => angleTex(k * q, 2 * e);
    const top = trigPart('sin', n * q, 2 * e);
    const middle = trigPart(fn, (n + 1) * q, 2 * e);
    const bottom = trigPart('sin', q, 2 * e);
    return [
      {
        text: `The sum is the ${fn === 'cos' ? 'real' : 'imaginary'} part of a geometric series of powers of $e^{i\\theta}$, with $\\theta = ${angleTex(q, e)}$. Taking out half angles top and bottom gives`,
        tex: `\\dfrac{\\sin\\frac{n\\theta}{2}\\${fn}\\frac{(n + 1)\\theta}{2}}{\\sin\\frac{\\theta}{2}}`,
      },
      {
        text: `With $n = ${n}$, the angles are $${half(n)}$, $${half(n + 1)}$ and $${half(1)}$:`,
        tex: `\\dfrac{${paren(partTex(top))} \\times ${paren(partTex(middle))}}{${partTex(bottom)}}`,
      },
      { tex: `= ${exactTex(seriesSum(params))}` },
    ];
  },
};

/* ---------- Powers of a root of unity add to nothing ---------- */

interface RootsSumParams { fn: TrigFn; n: number; p: number; from: 0 | 1 }

/** The angle per step, 2pπ/n, in lowest terms. */
function rootStep({ n, p }: { n: number; p: number }): [number, number] {
  const g = gcd(2 * p, n);
  return [(2 * p) / g, n / g];
}

function rootsSum({ fn, n, p, from }: RootsSumParams): number {
  if (fn === 'sin') return 0;
  return p % n === 0 ? n - from : -from;
}

/**
 * Σ cos(2pkπ/n) over k = 0 (or 1) to n - 1: the real part of the powers of
 * ω = e^{2pπi/n}, which add to (ω^n - 1)/(ω - 1) = 0 unless ω = 1. Four
 * options, the usual answers to a different question among them. Difficulty
 * 2 steps round the circle more than once per term, sometimes a whole
 * number of times.
 */
export const trigidSeriesRoots: Generator<RootsSumParams> = {
  id: 'trigid-series-roots',
  sample: (rng, difficulty) => {
    const n = difficulty < 2 ? rng.int(3, 12) : rng.int(5, 12);
    const fn: TrigFn = rng.chance(difficulty < 2 ? 0.25 : 0.2) ? 'sin' : 'cos';
    const from: 0 | 1 = rng.chance(0.5) ? 1 : 0;
    if (difficulty < 2) return { fn, n, p: 1, from };
    const p = rng.chance(0.3) ? n * rng.int(1, 2) : rng.int(2, 2 * n - 1);
    return { fn, n, p, from };
  },
  render: (params) => {
    const { fn, n, from } = params;
    const [q, e] = rootStep(params);
    const value = rootsSum(params);
    const candidates = [value, 0, -1, 1, n, n - 1];
    const kept = [...new Set(candidates)].slice(0, 4);
    return choiceSlide(
      [
        { kind: 'prose', text: 'Find the value of this sum.' },
        { kind: 'display', tex: `\\sum_{k=${from}}^{${n - 1}} \\${fn} ${kAngleTex(q, e)}` },
      ],
      kept.map((x) => ({ tex: `${x}`, ...(x === value && { correct: true }) })),
      mix(n, params.p, from, fn === 'cos' ? 1 : 0),
    );
  },
  solution: (params) => {
    const { fn, n, p, from } = params;
    const [q, e] = rootStep(params);
    const part = fn === 'cos' ? 'real' : 'imaginary';
    if (p % n === 0) {
      return [
        { text: `Each angle $${kAngleTex(q, e)}$ is a whole number of turns, so every ${fn === 'cos' ? 'cosine is 1' : 'sine is 0'}.` },
        { tex: `\\text{sum} = ${rootsSum(params)}` },
      ];
    }
    const steps: SolutionStep[] = [
      { text: `Each term is the ${part} part of $\\omega^k$ with $\\omega = e^{${expoTex({ m: q, d: e })}}$, and $\\omega^{${n}} = 1$ while $\\omega \\ne 1$.` },
      { text: `So the powers from $k = 0$ to $${n - 1}$ add to`, tex: `\\frac{\\omega^{${n}} - 1}{\\omega - 1} = 0` },
    ];
    if (from === 1) {
      steps.push({
        text: fn === 'cos' ? 'This sum leaves out the $k = 0$ term, $\\cos 0 = 1$, so it is $0 - 1$.' : 'This sum leaves out the $k = 0$ term, $\\sin 0 = 0$, which changes nothing.',
        tex: `\\text{sum} = ${rootsSum(params)}`,
      });
    } else {
      steps.push({ text: `Its ${part} part is the sum.`, tex: `\\text{sum} = ${rootsSum(params)}` });
    }
    return steps;
  },
};

export const planeGenerators = [
  identifyPoint,
  plotPoint,
  plotSum,
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
  quadrant,
  modulusProduct,
  sqrtPair,
  argumentTurns,
  polarMultiply,
  powerArgument,
  unityArgument,
  unityWhich,
  unityCartesian,
  unitySlider,
  unityConjugate,
  unityCount,
  unityPower,
  unitySumExcept,
  unitySumPower,
  rootsMissingPlot,
  rootModulus,
  rootArgument,
  rootArgsTiles,
  rootRotatePlot,
  locusCircleCentre,
  locusCircleRadius,
  locusCircleTiles,
  locusCircleThrough,
  locusBisectorMidpoint,
  locusBisectorLine,
  locusBisectorSide,
  locusBisectorCrossing,
  locusHalflinePoint,
  locusHalflineTiles,
  locusHalflineThrough,
  locusHalflineTurns,
  locusRegionFlow,
  locusRegionMatch,
  locusRegionWedge,
  locusRegionExtreme,
  locusCartesianTiles,
  locusCartesianCentre,
  locusCartesianRadius,
  locusModulusRange,
  expformEulerCartesian,
  expformEulerParts,
  expformEulerPlot,
  expformEulerFlow,
  expformRead,
  expformSwap,
  expformConvert,
  expformPrincipal,
  expformProduct,
  expformQuotientTree,
  expformReciprocal,
  expformTurn,
  expformPower,
  expformPowerSteps,
  expformPowerPlot,
  expformLeastPower,
  expformNegativePower,
  expformMethodFlow,
  expformMatchPoint,
  expformSum,
  expformCartesianPower,
  trigidZnForm,
  trigidZnValue,
  trigidZnPlot,
  trigidProductSum,
  trigidBinomialTerm,
  trigidMultipleForm,
  trigidMultipleValue,
  trigidEquateFlow,
  trigidPowerForm,
  trigidPowerCoefficient,
  trigidPowerFlow,
  trigidPowerMean,
  trigidCubicSubstitute,
  trigidCubicRoots,
  trigidIntegralTree,
  trigidPowerAntiderivative,
  trigidSeriesGeometric,
  trigidSeriesHalfAngle,
  trigidSeriesValue,
  trigidSeriesRoots,
];
