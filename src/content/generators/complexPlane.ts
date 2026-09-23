/**
 * Complex Numbers, Levels 3 and 4: the plane, modulus, argument and powers.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
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
    const bank = rng.shuffle([
      complexTex(p, q),
      complexTex(-p, -q),
      complexTex(p, -q),
      complexTex(-p, q),
      complexTex(Math.abs(q), p),
    ]);
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
];
